// PERF.md's engine budgets as tests (V1-PLAN.md §9 R4b): a board of 2,000
// marks, generated from its seed, must replay in half a second, take one
// more stroke in 4 ms (16 ms at the 95th percentile), and hold no more than
// 150 MB; the 5,000-mark board must replay at all. Every run records its
// numbers (`dist/bench/budgets-<size>-source.json`, and a line each in
// `dist/bench/budgets-history.jsonl`) and prints them, pass or fail.
//
//     node --test metamedium-core/bench/budgets.test.mjs
//
// And the same budgets with two library packs in use (V1-PLAN §9 B3):
// basics@1 and flowchart@1 used at the head of the 2,000-mark board's log, so
// every group is matched against their definitions too.
//
// Each size runs in a process of its own (`budgets.mjs`): a clean heap, the
// collector exposed, and a process that can be killed when a replay does not
// finish — a replay is synchronous, so nothing inside the process could stop
// it. The numbers are this machine's (PERF.md, "How it was measured"): like
// everything in bench/, this is not in `npm test` or CI, where a runner's
// speed is not the machine the budgets were set on.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OUT_DIR, ms } from './lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));

/** PERF.md, "Proposed budgets for R4b" — the engine's rows, on the 2,000-mark board. */
export const BUDGETS = {
  replayMs: 500,
  strokeMedianMs: 4,
  strokeP95Ms: 16,
  heldMB: 150,
};

/** Run `budgets.mjs` for one size; resolve with its numbers, or say why there are none. */
function measure(size, { limitMs, extra = [], flags = [] }) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--expose-gc', ...extra, join(here, 'budgets.mjs'), `--size=${size}`, ...flags], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '', stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; process.stderr.write(d); });
    const started = Date.now();
    const timer = setTimeout(() => child.kill('SIGKILL'), limitMs);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const wallMs = Date.now() - started;
      const last = stdout.trim().split('\n').pop();
      let numbers = null;
      try { numbers = last ? JSON.parse(last) : null; } catch { numbers = null; }
      resolve({ numbers, code, signal, wallMs, stderr });
    });
  });
}

function record(size, run, packs = []) {
  mkdirSync(OUT_DIR, { recursive: true });
  const n = run.numbers;
  const line = {
    at: new Date().toISOString(),
    size,
    ...(packs.length ? { packs, byPack: n ? n.state.byPack : null } : {}),
    finished: !!n,
    wallMs: run.wallMs,
    ...(n
      ? {
          replayColdMs: +n.replay.coldMs.toFixed(1),
          replayWarmMs: +n.replay.warm.median.toFixed(1),
          strokeMedianMs: +n.stroke.median.toFixed(2),
          strokeP95Ms: +n.stroke.p95.toFixed(2),
          heldMB: n.memory.heldMB,
          maxRssMB: n.memory.maxRssMB,
          edges: n.memory.edges,
          loadavg: n.loadavg,
        }
      : { killed: run.signal, exit: run.code }),
  };
  appendFileSync(join(OUT_DIR, 'budgets-history.jsonl'), JSON.stringify(line) + '\n');
  return line;
}

const TWO_K_LIMIT_MS = 15 * 60 * 1000;
const FIVE_K_LIMIT_MS = 5 * 60 * 1000;

test('2,000 marks: replay ≤ 0.5 s, one more stroke ≤ 4 ms median and ≤ 16 ms p95, ≤ 150 MB held', { timeout: TWO_K_LIMIT_MS + 60_000 }, async (t) => {
  const run = await measure(2000, { limitMs: TWO_K_LIMIT_MS });
  const line = record(2000, run);
  t.diagnostic(JSON.stringify(line));
  assert.ok(run.numbers, `the 2,000-mark board did not finish in ${ms(run.wallMs)} (${run.signal ?? 'exit ' + run.code})`);
  const n = run.numbers;
  const said = `replay ${ms(n.replay.warm.median)} (cold ${ms(n.replay.coldMs)}) · one more stroke ${ms(n.stroke.median)} / p95 ${ms(n.stroke.p95)} · held ${n.memory.heldMB} MB · ${n.memory.edges.toLocaleString('en-GB')} edges`;
  t.diagnostic(said);
  const over = [];
  if (!(n.replay.warm.median <= BUDGETS.replayMs)) over.push(`replay ${ms(n.replay.warm.median)} > ${BUDGETS.replayMs} ms`);
  if (!(n.stroke.median <= BUDGETS.strokeMedianMs)) over.push(`stroke median ${ms(n.stroke.median)} > ${BUDGETS.strokeMedianMs} ms`);
  if (!(n.stroke.p95 <= BUDGETS.strokeP95Ms)) over.push(`stroke p95 ${ms(n.stroke.p95)} > ${BUDGETS.strokeP95Ms} ms`);
  if (!(n.memory.heldMB <= BUDGETS.heldMB)) over.push(`held ${n.memory.heldMB} MB > ${BUDGETS.heldMB} MB`);
  assert.deepEqual(over, [], `over budget on the 2,000-mark board: ${said}`);
});

test('5,000 marks: the board replays at all, and its numbers are recorded', { timeout: FIVE_K_LIMIT_MS + 60_000 }, async (t) => {
  const run = await measure(5000, { limitMs: FIVE_K_LIMIT_MS, extra: ['--max-old-space-size=8192'] });
  const line = record(5000, run);
  t.diagnostic(JSON.stringify(line));
  assert.ok(run.numbers, `the 5,000-mark board did not replay in ${ms(run.wallMs)} (${run.signal ? 'killed at the limit' : 'exit ' + run.code})`);
  const n = run.numbers;
  t.diagnostic(`replay ${ms(n.replay.warm.median)} (cold ${ms(n.replay.coldMs)}) · one more stroke ${ms(n.stroke.median)} / p95 ${ms(n.stroke.p95)} · held ${n.memory.heldMB} MB`);
});

const PACKS = ['basics@1', 'flowchart@1'];

test('2,000 marks with two library packs in use (basics@1, flowchart@1): the same budgets', { timeout: TWO_K_LIMIT_MS + 60_000 }, async (t) => {
  const run = await measure(2000, { limitMs: TWO_K_LIMIT_MS, flags: [`--packs=${PACKS.join(',')}`] });
  const line = record(2000, run, PACKS);
  t.diagnostic(JSON.stringify(line));
  assert.ok(run.numbers, `the 2,000-mark board with packs did not finish in ${ms(run.wallMs)} (${run.signal ?? 'exit ' + run.code})`);
  const n = run.numbers;
  assert.deepEqual(n.state.packs, PACKS, 'the board uses the two packs');
  const said = `with ${PACKS.join(' and ')}: replay ${ms(n.replay.warm.median)} (cold ${ms(n.replay.coldMs)}) · one more stroke ${ms(n.stroke.median)} / p95 ${ms(n.stroke.p95)} · held ${n.memory.heldMB} MB · ${n.state.byPack} groups matched by a pack`;
  t.diagnostic(said);
  const over = [];
  if (!(n.replay.warm.median <= BUDGETS.replayMs)) over.push(`replay ${ms(n.replay.warm.median)} > ${BUDGETS.replayMs} ms`);
  if (!(n.stroke.median <= BUDGETS.strokeMedianMs)) over.push(`stroke median ${ms(n.stroke.median)} > ${BUDGETS.strokeMedianMs} ms`);
  if (!(n.stroke.p95 <= BUDGETS.strokeP95Ms)) over.push(`stroke p95 ${ms(n.stroke.p95)} > ${BUDGETS.strokeP95Ms} ms`);
  if (!(n.memory.heldMB <= BUDGETS.heldMB)) over.push(`held ${n.memory.heldMB} MB > ${BUDGETS.heldMB} MB`);
  assert.deepEqual(over, [], `over budget on the 2,000-mark board with packs: ${said}`);
});

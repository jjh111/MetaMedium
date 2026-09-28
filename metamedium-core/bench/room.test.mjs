// PERF.md's live-room budgets as tests (V1-PLAN.md §9 R4d), on the generated
// 2,000-mark board: one incoming line in a room of three costs ≤ 16 ms with no
// full replay; a line that lands before events already applied replays from
// the nearest checkpoint, not from zero; a line with no events does no work;
// and a newcomer's hello delivers at most one copy of each log — in rooms of
// three and six, with a hand that left and one that vanished — the newcomer
// ending with exactly the logs the room holds. Every run records its numbers
// (`dist/bench/room-2000-<path>.json`, and a line in
// `dist/bench/room-history.jsonl`) and prints them, pass or fail.
//
//     node --test metamedium-core/bench/room.test.mjs
//
// The measuring runs in a process of its own (`room.mjs`): a clean heap, the
// collector exposed. Like everything in bench/, this is this machine's and not
// in `npm test` or CI.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OUT_DIR, ms } from './lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));

/** PERF.md, the room's rows. */
export const BUDGETS = {
  /** Main-thread work for one incoming line, at the 95th percentile. */
  lineP95Ms: 16,
  /** Copies of one log a newcomer's hello brings it. */
  copiesPerLog: 1,
};

function measure(size, limitMs) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--expose-gc', join(here, 'room.mjs'), `--size=${size}`], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { process.stderr.write(d); });
    const started = Date.now();
    const timer = setTimeout(() => child.kill('SIGKILL'), limitMs);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const last = stdout.trim().split('\n').pop();
      let numbers = null;
      try { numbers = last ? JSON.parse(last) : null; } catch { numbers = null; }
      resolve({ numbers, code, signal, wallMs: Date.now() - started });
    });
  });
}

const LIMIT_MS = 10 * 60 * 1000;
let run = null;
const once = async () => {
  if (run) return run;
  run = await measure(2000, LIMIT_MS);
  mkdirSync(OUT_DIR, { recursive: true });
  const n = run.numbers;
  appendFileSync(join(OUT_DIR, 'room-history.jsonl'), JSON.stringify({
    at: new Date().toISOString(),
    finished: !!n,
    wallMs: run.wallMs,
    ...(n ? {
      path: n.path,
      lineMedianMs: +n.line.lines.perLine.median.toFixed(2),
      lineP95Ms: +n.line.lines.perLine.p95.toFixed(2),
      replayedFromZero: n.line.lines.replayedFromZero,
      outOfOrder: n.line.outOfOrder.map((l) => ({ back: l.back, ms: +l.ms.toFixed(2), fromZero: l.replayedFromZero })),
      quiet: n.line.quiet.map((q) => ({ label: q.label, ms: +q.ms.toFixed(2), touched: q.touched })),
      hello: n.hello.map((h) => ({ hands: h.hands, left: h.left, vanished: h.vanished, maxCopies: h.maxCopies, newcomerMB: h.newcomerMB, holdsTheRoom: h.holdsTheRoom })),
      loadavg: n.loadavg,
    } : { killed: run.signal, exit: run.code }),
  }) + '\n');
  return run;
};

test('one incoming line on the 2,000-mark board, in a room of three: ≤ 16 ms at p95, with no full replay', { timeout: LIMIT_MS + 60_000 }, async (t) => {
  const r = await once();
  assert.ok(r.numbers, `the room did not finish in ${ms(r.wallMs)} (${r.signal ?? 'exit ' + r.code})`);
  const l = r.numbers.line.lines;
  t.diagnostic(`path ${r.numbers.path}: median ${ms(l.perLine.median)}, p95 ${ms(l.perLine.p95)}; ${l.replayedFromZero ? 'replayed from zero' : 'no full replay'}; the save it schedules ${ms(l.save.median)}`);
  const over = [];
  if (!(l.perLine.p95 <= BUDGETS.lineP95Ms)) over.push(`p95 ${ms(l.perLine.p95)} > ${BUDGETS.lineP95Ms} ms`);
  if (l.replayedFromZero) over.push('every line replays the board from zero');
  assert.deepEqual(over, [], `over budget: ${over.join('; ')}`);
});

test('a line that lands before events already applied replays from the nearest checkpoint, not from zero', { timeout: LIMIT_MS + 60_000 }, async (t) => {
  const r = await once();
  assert.ok(r.numbers, 'the room did not finish');
  for (const l of r.numbers.line.outOfOrder) t.diagnostic(`${l.back} events back: ${ms(l.ms)} — ${l.replayedFromZero ? 'from zero' : 'from ' + JSON.stringify(l.asked)}`);
  assert.deepEqual(r.numbers.line.outOfOrder.filter((l) => l.replayedFromZero).map((l) => l.back), [], 'lines that replayed the board from zero');
});

test('a line with no events does no work: a hello, the relay\'s word, a whole log already held', { timeout: LIMIT_MS + 60_000 }, async (t) => {
  const r = await once();
  assert.ok(r.numbers, 'the room did not finish');
  for (const q of r.numbers.line.quiet) t.diagnostic(`${q.label}: ${ms(q.ms)} — ${q.touched ? 'touched the board' : 'no work'}`);
  assert.deepEqual(r.numbers.line.quiet.filter((q) => q.touched).map((q) => q.label), [], 'lines with no events that touched the board');
});

test('a newcomer\'s hello delivers at most one copy of each log, and the newcomer holds exactly the room\'s logs', { timeout: LIMIT_MS + 60_000 }, async (t) => {
  const r = await once();
  assert.ok(r.numbers, 'the room did not finish');
  const over = [];
  for (const h of r.numbers.hello) {
    const where = `room of ${h.hands}${h.left ? `, ${h.left} left` : ''}${h.vanished ? `, ${h.vanished} vanished` : ''}`;
    t.diagnostic(`${where}: at most ${h.maxCopies} copies of a log, ${h.newcomerMB} MB to the newcomer (the board is ${h.boardMB} MB), ${h.answerLines} whole logs sent; ${h.holdsTheRoom ? 'holds the room' : 'does NOT hold the room'}`);
    if (h.maxCopies > BUDGETS.copiesPerLog) over.push(`${where}: ${h.maxCopies} copies of a log`);
    if (!h.holdsTheRoom) over.push(`${where}: the newcomer does not hold the room's logs`);
  }
  assert.deepEqual(over, [], 'over budget');
});

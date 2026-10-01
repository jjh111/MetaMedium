// Pictures traced into ink, on a board that holds an artifact, measured against
// the budgets in `budgets.test.mjs` (V1-PLAN I2, PLAN-IPAD-NOTES §1 item 4) —
// the measuring half, run in a process of its own for each board.
//
//     node --expose-gc metamedium-core/bench/imports.mjs --pictures=1 --strokes=2000 --svgs=1
//     node --expose-gc metamedium-core/bench/imports.mjs --pictures=5 --strokes=1000 --svgs=5
//
// A board of `--svgs` SVG figures and `--pictures` traced pictures (`bench/board.mjs`,
// `importedBoard`), each brought in as one `import` event as the surface brings it.
// Measured: what each import cost to apply, the cold replay of the log
// (`load`, the first in the process), the warm replays that follow on fresh
// sessions, one more stroke drawn in the middle of the last picture's ink (a
// hand drawing on a photograph), and the memory held. The board is generated
// first and is in no number. The numbers go to `dist/bench/imports-<pictures>x<strokes>-<core>.json`
// and, as the last line of stdout, to whoever ran this.

import os from 'node:os';
import { loadCore, summarize, ms, mb, gc, heapUsed, machine, writeResult, args } from './lib.mjs';
import { importedBoard } from './board.mjs';

const a = args();
const pictures = Number(a.pictures ?? 1);
const strokesEach = Number(a.strokes ?? 2000);
const svgs = Number(a.svgs ?? 1);
const which = a.core || 'source';
const repeat = Number(a.repeat ?? 2);
const say = (s) => process.stderr.write(s + '\n');
const now = () => performance.now();

if (typeof globalThis.gc !== 'function') {
  say('imports.mjs: run with --expose-gc, or memory held is not measured after a full collection');
  process.exit(2);
}

const { core, path } = await loadCore(which);
const out = {
  at: new Date().toISOString(),
  machine: machine(),
  loadavg: os.loadavg().map((x) => +x.toFixed(2)),
  core: which,
  corePath: path.replace(/^.*\/(MetaMedium[^/]*)\//, ''),
  pictures, strokesEach, svgs,
};
const resultName = `imports-${pictures}x${strokesEach}-${which}.json`;
say(`imports: ${svgs} SVG${svgs === 1 ? '' : 's'} and ${pictures} picture${pictures === 1 ? '' : 's'} of ${strokesEach} traced strokes · core ${which} · load ${out.loadavg.join(' ')}`);

// --- the imports, as applied ---
const applied = [];
const made = importedBoard(core, { pictures, strokesEach, svgs, onImport: (kind, t, n) => applied.push({ kind, ms: t, strokes: n }) });
const pics = applied.filter((x) => x.kind === 'picture');
out.board = { marks: made.marks, events: made.events.length };
out.apply = {
  perPicture: pics.map((x) => Math.round(x.ms)),
  totalMs: pics.reduce((s, x) => s + x.ms, 0),
  perStrokeMs: pics.reduce((s, x) => s + x.ms, 0) / Math.max(1, made.marks),
  worstPerStrokeMs: Math.max(0, ...pics.map((x) => x.ms / Math.max(1, x.strokes))),
};
say(`  ${made.marks} traced strokes in ${made.events.length} events — applied in ${ms(out.apply.totalMs)} (${ms(out.apply.perStrokeMs)} a stroke, the worst picture ${ms(out.apply.worstPerStrokeMs)} a stroke)`);
writeResult(resultName, out);

// --- the cold replay, with nothing else alive but the log ---
const events = made.events;
let session = made.session;
const base = (() => { session = null; return heapUsed(); })();
let s = core.createSession();
const t0 = now();
s.load(events);
const coldMs = now() - t0;
const heldBytes = heapUsed() - base;
const st = s.getState();
out.replay = { coldMs };
out.memory = { heldMB: +(heldBytes / 1048576).toFixed(1), nodes: st.nodes.size };
out.state = { content: st.contentIds.length, artifacts: st.artifacts.length, clusterCandidates: st.clusterCandidates.length };
say(`  cold replay ${ms(coldMs)} · held ${mb(heldBytes)} · ${st.nodes.size} nodes`);
writeResult(resultName, out);

// --- warm replays ---
const warm = [];
const runs = coldMs > 8000 ? 0 : repeat;
for (let i = 0; i < runs; i++) {
  s = null;
  gc();
  s = core.createSession();
  const t = now();
  s.load(events);
  warm.push(now() - t);
}
if (!warm.length) warm.push(coldMs);
out.replay = { coldMs, warm: summarize(warm), warmMs: warm, warmSkipped: runs === 0 };
say(`  replay, warm median ${ms(out.replay.warm.median)} (n ${warm.length}${runs === 0 ? ', the cold replay standing for it' : ''})`);
writeResult(resultName, out);

// --- one more stroke, drawn on the last picture's ink ---
{
  const g = core.boundsOf(s.getState().nodes.get(s.getState().contentIds[s.getState().contentIds.length - 1]));
  const cx = (g.minX + g.maxX) / 2, cy = (g.minY + g.maxY) / 2;
  const times = [];
  let at = (events[events.length - 1].at || 0) + 60000;
  for (let i = 0; i < 20; i++) {
    const x = cx - 60 + (i % 5) * 25, y = cy - 40 + Math.floor(i / 5) * 25;
    const pts = Array.from({ length: 30 }, (_, k) => ({ x: x + k * 2, y: y + Math.sin(k / 4) * 6 }));
    const t = now();
    s.addStroke(pts, (at += 4000), undefined, 1);
    times.push(now() - t);
  }
  out.stroke = { ...summarize(times), samples: times };
  say(`  one more stroke on a picture's ink: median ${ms(out.stroke.median)}, p95 ${ms(out.stroke.p95)} (n ${times.length})`);
}
out.memory.maxRssMB = Math.round(process.resourceUsage().maxRSS / 1024);
const file = writeResult(resultName, out);
say(`  → ${file}`);
process.stdout.write(JSON.stringify(out) + '\n');

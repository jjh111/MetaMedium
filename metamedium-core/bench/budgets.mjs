// One board measured against PERF.md's engine budgets (V1-PLAN.md §9 R4b) —
// the measuring half of `budgets.test.mjs`, which runs this in a process of
// its own for each size (a clean heap, and one that can be killed when a
// replay does not finish) and holds the numbers to the budgets.
//
//     node --expose-gc metamedium-core/bench/budgets.mjs --size=2000
//     node --expose-gc metamedium-core/bench/budgets.mjs --size=5000 --strokes=20
//
// What is measured is what PERF.md measured, the same way (`engine.mjs
// board`): the board is generated from its seed first and is in no number;
// the cold `load` is the first in the process; warm loads follow on fresh
// sessions after a full collection; memory held is the heap after a full
// collection with the session alive, less the heap before it was made (the
// log already held); one more stroke is one `addStroke` as a host calls it,
// drawn by `extendBoard` beside the board. The numbers go to
// `dist/bench/budgets-<size>-<core>.json` and, as the last line of stdout, to
// whoever ran this.

import os from 'node:os';
import v8 from 'node:v8';
import { loadCore, summarize, ms, mb, gc, heapUsed, machine, writeResult, args } from './lib.mjs';
import { generateBoard, extendBoard } from './board.mjs';

const a = args();
const size = Number(a.size || 2000);
const seed = Number(a.seed || 1);
const which = a.core || 'source';
const repeat = Number(a.repeat ?? 3);
const nStrokes = Number(a.strokes || (size >= 5000 ? 20 : 40));
const say = (s) => process.stderr.write(s + '\n');
const now = () => performance.now();

if (typeof globalThis.gc !== 'function') {
  say('budgets.mjs: run with --expose-gc, or memory held is not measured after a full collection');
  process.exit(2);
}

const { core, path } = await loadCore(which);
const out = {
  at: new Date().toISOString(),
  machine: machine(),
  loadavg: os.loadavg().map((x) => +x.toFixed(2)),
  heapLimitMB: Math.round(v8.getHeapStatistics().heap_size_limit / 1048576),
  core: which,
  corePath: path.replace(/^.*\/(MetaMedium[^/]*)\//, ''),
  size,
  seed,
};
const resultName = `budgets-${size}-${which}.json`;
say(`budgets ${size} · core ${which} · heap limit ${out.heapLimitMB} MB · load ${out.loadavg.join(' ')}`);

const tg = now();
const { events, stats } = generateBoard(core, { marks: size, seed });
out.board = { marks: stats.marks, events: stats.events, jsonMB: +(stats.bytes / 1048576).toFixed(2), generatedMs: Math.round(now() - tg) };
say(`  ${stats.marks} marks, ${stats.events} events, ${out.board.jsonMB} MB of JSON (generated in ${out.board.generatedMs} ms, not measured)`);

// --- the cold load, with nothing else alive ---
const base = heapUsed();
let s = core.createSession();
const t0 = now();
s.load(events);
const coldMs = now() - t0;
const heldBytes = heapUsed() - base;
let st = s.getState();
let edges = 0;
for (const n of st.nodes.values()) edges += n.edges.length;
out.replay = { coldMs };
out.memory = {
  heldMB: +(heldBytes / 1048576).toFixed(1),
  maxRssMB: Math.round(process.resourceUsage().maxRSS / 1024),
  nodes: st.nodes.size,
  edges,
};
out.state = { content: st.contentIds.length, artifacts: st.artifacts.length, clusterCandidates: st.clusterCandidates.length };
say(`  cold load ${ms(coldMs)} · held ${mb(heldBytes)} · ${st.nodes.size} nodes, ${edges.toLocaleString('en-GB')} edges`);
writeResult(resultName, out);

// --- warm loads, each on a fresh session after a full collection. A cold
//     load ten times past its budget says what a warm one would: the rest are
//     skipped rather than spend minutes saying it again. ---
const warm = [];
const runs = coldMs > 5000 ? 0 : repeat;
for (let i = 0; i < runs; i++) {
  s = null;
  st = null;
  gc();
  s = core.createSession();
  const t = now();
  s.load(events);
  warm.push(now() - t);
}
if (!warm.length) warm.push(coldMs);
out.replay = { coldMs, warm: summarize(warm), warmMs: warm, warmSkipped: runs === 0 };
say(`  replay, warm median ${ms(out.replay.warm.median)} (n ${warm.length}${runs === 0 ? ', the cold load standing for it' : ''})`);
writeResult(resultName, out);

// --- one more stroke at the end ---
const all = [];
const t1 = now();
extendBoard(core, s, { marks: nStrokes, onStroke: (_, dt) => all.push(dt) });
out.stroke = { ...summarize(all), samples: all, wallMs: now() - t1 };
say(`  one more stroke: median ${ms(out.stroke.median)}, p95 ${ms(out.stroke.p95)} (n ${all.length})`);
out.memory.maxRssMB = Math.round(process.resourceUsage().maxRSS / 1024);
const file = writeResult(resultName, out);
say(`  → ${file}`);
process.stdout.write(JSON.stringify(out) + '\n');

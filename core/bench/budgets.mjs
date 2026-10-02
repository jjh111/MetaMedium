// One board measured against PERF.md's engine budgets (V1-PLAN.md §9 R4b) —
// the measuring half of `budgets.test.mjs`, which runs this in a process of
// its own for each size (a clean heap, and one that can be killed when a
// replay does not finish) and holds the numbers to the budgets.
//
//     node --expose-gc core/bench/budgets.mjs --size=2000
//     node --expose-gc core/bench/budgets.mjs --size=5000 --strokes=20
//     node --expose-gc core/bench/budgets.mjs --size=2000 --packs=basics@1,flowchart@1
//
// `--packs` puts a `use` event for each named library pack at the head of the
// board's log (V1-PLAN §9 B3), so every group on it is matched against the
// packs' definitions too, the whole replay and every stroke after it: what
// matching costs with packs in use.
// What is measured is what PERF.md measured, the same way (`engine.mjs
// board`): the board is generated from its seed first and is in no number;
// the cold `load` is the first in the process; warm loads follow on fresh
// sessions after a full collection; memory held is the heap after a full
// collection with the session alive, less the heap before it was made (the
// log already held); one more stroke is one `addStroke` as a host calls it,
// drawn by `extendBoard` beside the board; and a move that carries ten
// bound arrows (V1-PLAN E2) is one `move` of a box with ten lines tied to its
// sites, beside the same box with none. The numbers go to
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
const packs = typeof a.packs === 'string' && a.packs ? a.packs.split(',').map((x) => x.trim()).filter(Boolean) : [];
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
  packs,
};
const resultName = `budgets-${size}-${which}${packs.length ? '-packs' : ''}.json`;
say(`budgets ${size} · core ${which} · heap limit ${out.heapLimitMB} MB · load ${out.loadavg.join(' ')}`);

const tg = now();
const generated = generateBoard(core, { marks: size, seed });
const { stats } = generated;
// The packs, used before the first mark: a board that says it uses them from the start.
const first = generated.events.reduce((m, e) => Math.min(m, typeof e.at === 'number' ? e.at : m), Infinity);
const events = packs.map((pack, i) => ({ type: 'use', pack, at: first - packs.length + i })).concat(generated.events);
out.board = { marks: stats.marks, events: events.length, jsonMB: +(stats.bytes / 1048576).toFixed(2), generatedMs: Math.round(now() - tg) };
say(`  ${stats.marks} marks, ${events.length} events, ${out.board.jsonMB} MB of JSON (generated in ${out.board.generatedMs} ms, not measured)${packs.length ? ' · packs in use: ' + packs.join(', ') : ''}`);

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
out.state = {
  content: st.contentIds.length, artifacts: st.artifacts.length, clusterCandidates: st.clusterCandidates.length,
  packs: st.packs, packNotices: st.packNotices.length,
  byPack: st.clusterCandidates.filter((c) => c.matches.some((m) => m.pack)).length,
};
if (packs.length && st.packs.length !== packs.length) {
  say(`budgets.mjs: the board uses ${st.packs.join(', ') || 'no pack'}, not ${packs.join(', ')} — ${st.packNotices.map((n) => n.detail).join('; ')}`);
  process.exit(2);
}
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

// --- a move that carries ten bound arrows (V1-PLAN E2) ---
//     A box beside the board and ten lines around it, each with its end tied to
//     one of the box's own sites; the box moved back and forth, one `move` as a
//     host calls it, and every line follows it — derived in the apply path. The
//     same box with nothing tied to it, moved the same way, is the control.
{
  const st1 = s.getState();
  let maxX = -Infinity, minY = Infinity;
  for (const id of st1.contentIds) {
    const b = core.boundsOf(st1.nodes.get(id));
    if (b && Number.isFinite(b.maxX)) { maxX = Math.max(maxX, b.maxX); minY = Math.min(minY, b.minY); }
  }
  const evs = s.getEvents();
  let at = (evs.length ? evs[evs.length - 1].at || 0 : 0) + 60000;
  const seg = (p, q, n) => Array.from({ length: n }, (_, i) => ({ x: p.x + ((q.x - p.x) * i) / (n - 1), y: p.y + ((q.y - p.y) * i) / (n - 1) }));
  const rect = (x, y, w, h) => {
    const c = [{ x: x + w / 2, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }, { x: x + w / 2, y }];
    return c.slice(1).flatMap((q, i) => seg(c[i], q, 26).slice(i ? 1 : 0));
  };
  const x0 = (Number.isFinite(maxX) ? maxX : 0) + 1600, y0 = Number.isFinite(minY) ? minY : 0;
  const box = s.addStroke(rect(x0, y0 + 400, 200, 120), (at += 1000), undefined, 1);
  const control = s.addStroke(rect(x0 + 1600, y0 + 400, 200, 120), (at += 1000), undefined, 1);
  const centre = { x: x0 + 100, y: y0 + 460 };
  const sites = core.magnetSites(s.getState().nodes.get(box), s.getState().nodes).filter((x) => !x.notation);
  const lines = [];
  for (let i = 0; i < 10; i++) {
    const site = sites[i % sites.length];
    const turn = (i * 2 * Math.PI) / 10;
    const out = site.kind === 'centre' || i >= sites.length ? { x: Math.cos(turn), y: Math.sin(turn) } : (() => { const d = Math.hypot(site.point.x - centre.x, site.point.y - centre.y) || 1; return { x: (site.point.x - centre.x) / d, y: (site.point.y - centre.y) / d }; })();
    const from = { x: site.point.x + out.x * 320, y: site.point.y + out.y * 320 };
    const id = s.addStroke(seg(from, site.point, 40), (at += 1000), undefined, 1);
    s.bind({ strokeId: id, nodeId: box, site: { kind: site.kind, index: site.index }, end: 'end', at: (at += 10) });
    lines.push({ id, site: { kind: site.kind, index: site.index } });
  }
  const moves = 20;
  const carried = [], alone = [];
  for (let i = 0; i < moves; i++) {
    const dx = i % 2 ? -60 : 60, dy = i % 2 ? -35 : 35;
    let t = now();
    s.move({ ids: [box], dx, dy, at: (at += 100) });
    carried.push(now() - t);
    t = now();
    s.move({ ids: [control], dx, dy, at: (at += 100) });
    alone.push(now() - t);
  }
  // Every line's end on its site where the box stands: the moves were the act, not a fiction.
  const stF = s.getState();
  let off = 0;
  for (const l of lines) {
    const e = core.connectorEnds(stF.nodes.get(l.id), stF.nodes);
    const site = core.boundSiteOf(stF.nodes.get(box), stF.nodes, l.site);
    if (!e || !site || Math.hypot(e.end.x - site.point.x, e.end.y - site.point.y) > 1e-6) off++;
  }
  out.follow = { arrows: lines.length, move: summarize(carried), control: summarize(alone), samples: carried, controlSamples: alone, off };
  say(`  a move carrying ${lines.length} bound arrows: median ${ms(out.follow.move.median)}, p95 ${ms(out.follow.move.p95)} — the same box with none: median ${ms(out.follow.control.median)}, p95 ${ms(out.follow.control.p95)} (n ${moves}${off ? `; ${off} ends not on their sites` : ''})`);
}
out.memory.maxRssMB = Math.round(process.resourceUsage().maxRSS / 1024);
const file = writeResult(resultName, out);
say(`  → ${file}`);
process.stdout.write(JSON.stringify(out) + '\n');

// The tables in PERF.md, printed from the result files — so a number in the
// document is the number a run wrote, never one copied by hand.
//
//     node metamedium-core/bench/report.mjs
//
// Reads `metamedium-core/dist/bench/engine-*.json` (engine.mjs) and
// `e2e/results/perf/perf-*.json` (e2e/perf.mjs); prints markdown.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { OUT_DIR, REPO, ms } from './lib.mjs';

const read = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null);
const eng = (name) => read(join(OUT_DIR, name));
const perfDir = join(REPO, 'e2e', 'results', 'perf');
const f1 = (x) => (x === undefined || x === null || !Number.isFinite(x) ? '—' : ms(x));
const pm = (s) => (s && s.n ? `${f1(s.median)} / ${f1(s.p95)}` : '—');
const SIZES = [500, 2000, 5000];

const lines = [];
const out = (s = '') => lines.push(s);

// --- engine: replay and memory ---
out('### Engine (Node) — replay, memory, relations, the whole-board read, one more stroke');
out('');
out('| | 500 | 2,000 | 5,000 |');
out('|---|---|---|---|');
const boards = SIZES.map((n) => eng(`engine-board-${n}-source.json`));
const builds = SIZES.map((n) => eng(`engine-build-${n}-source.json`));
const profiled = SIZES.map((n) => eng(`engine-board-${n}-source.profiled.json`));
const bundles = SIZES.map((n) => eng(`engine-board-${n}-bundle.json`));
const ablated = SIZES.map((n) => eng(`engine-board-${n}-source-checkpoints.json`));
const row = (label, f) => out(`| ${label} | ${SIZES.map((_, i) => f(i)).join(' | ')} |`);
row('log: events · JSON', (i) => { const b = (boards[i] || builds[i] || {}).board; return b ? `${b.events} · ${b.jsonMB} MB` : '—'; });
row('content plane after replay (marks, words, artifacts)', (i) => { const s = boards[i] && boards[i].state; return s ? `${s.content} (${s.artifacts} artifacts)` : '—'; });
row('**replay (`load`), cold**', (i) => f1(boards[i] && boards[i].replay && boards[i].replay.coldMs));
row('replay, warm (median of n)', (i) => { const w = boards[i] && boards[i].replay && boards[i].replay.warm; return w && w.n ? `${f1(w.median)} (n ${w.n})` : '—'; });
row('replay, committed bundle (cold · warm)', (i) => { const b = bundles[i]; if (!b) return '—'; const w = b.replay.warm; return `${f1(b.replay.coldMs)}${w && w.n ? ' · ' + f1(w.median) : ''}`; });
row('drawn event by event (`build`)', (i) => f1(builds[i] && builds[i].totalMs));
row('**memory held after replay**', (i) => { const m = (boards[i] || builds[i] || {}).memory; return m ? `${m.heldMB} MB` : '—'; });
row('…of which checkpoints (held with them off)', (i) => { const x = ablated[i]; return x ? `${x.memory.heldMB} MB held, replay ${f1(x.replay.coldMs)}` : '—'; });
row('edges stored in the graph', (i) => { const m = (boards[i] || builds[i] || {}).memory; return m ? m.edges.toLocaleString('en-GB') : '—'; });
row('max RSS of the process', (i) => { const m = (boards[i] || builds[i] || {}).memory; return m ? `${m.maxRssMB} MB` : '—'; });
row('`relate` over the content plane (pairs → relations)', (i) => { const r = (boards[i] || {}).relations; const b = builds[i] && builds[i].relations; if (r) return `${f1(r.relate.median)} (${Math.round(r.pairs).toLocaleString('en-GB')} → ${r.relations.toLocaleString('en-GB')})`; return b ? `${f1(b.ms)} (${b.marks} marks → ${b.relations.toLocaleString('en-GB')})` : '—'; });
row('`session.read` of the whole board (the surface\'s readRungs)', (i) => { const r = (boards[i] || {}).read; const b = builds[i] && builds[i].read; if (r) return `${f1(r.median)} (${r.ids} marks)`; return b ? `${f1(b.ms)} (${b.ids} marks)` : '—'; });
row('**one more stroke: median / p95**', (i) => { const s = (boards[i] && boards[i].stroke) || (builds[i] && builds[i].stroke); return s ? `${pm(s)} (n ${s.n})` : '—'; });
row('…the shape rung alone for those strokes', (i) => { const s = boards[i] && boards[i].stroke && boards[i].stroke.readingsAlone; return pm(s); });
row('`getState()` (handed to subscribers on every event)', (i) => pm(boards[i] && boards[i].getState));
out('');
out('Commands: `node --expose-gc metamedium-core/bench/engine.mjs board --size=N --repeat=K` (500: K=5; 2,000: K=2); 5,000: `node --expose-gc --max-old-space-size=65536 metamedium-core/bench/engine.mjs build --size=5000 --strokes=20`; bundle: add `--core=bundle`; checkpoints off: add `--ablate=checkpoints --only=replay`.');
out('');

// --- the stroke's cost as the board grows ---
const curveFrom = builds.find((b) => b && b.curve && b.curve.length > 3) || null;
if (curveFrom) {
  out(`### One stroke's cost as the board grows (the ${curveFrom.board.marks}-mark board drawn event by event)`);
  out('');
  out('| strokes drawn | content marks | median | p95 | max | elapsed |');
  out('|---|---|---|---|---|---|');
  for (const c of curveFrom.curve) out(`| ${c.strokes} | ${c.content} | ${f1(c.median)} | ${f1(c.p95)} | ${f1(c.max)} | ${c.elapsedS} s |`);
  out('');
  out(`Command: \`node --expose-gc --max-old-space-size=65536 metamedium-core/bench/engine.mjs build --size=${curveFrom.board.marks} --every=250\`. Each row is the 250 strokes ending at that count; a stroke is one \`addStroke\`, with every event before it applied.`);
  out('');
}

// --- rooms ---
const room = eng('engine-room-2000-source.json');
const room500 = eng('engine-room-500-source.json');
if (room || room500) {
  out('### A live room — one incoming line at one hand, in a room of three');
  out('');
  out('| step (what `mergeLive` runs, 17-folder.js) | 500-mark board | 2,000-mark board |');
  out('|---|---|---|');
  const r2 = room ? room.line : null, r5 = room500 ? room500.line : null;
  const lr = (label, k) => out(`| ${label} | ${r5 ? pm(r5[k]) : '—'} | ${r2 ? pm(r2[k]) : '—'} |`);
  lr('`receive` the line (LiveStore)', 'receive');
  lr('`readLogs()`', 'readLogs');
  lr('`myLogNow()` — every loaded event stringified', 'myLogNow');
  lr('`mergeLogs`', 'mergeLogs');
  lr('`notices()` — a second `mergeLogs`', 'notices');
  lr('**merge work without `notices()`**', 'withoutNotices');
  lr('**merge work with `notices()`**', 'withNotices');
  out(`| **then \`session.load(merged)\` — a full replay, every line** | ${r5 ? f1(r5.replayMs) : '—'} | ${r2 ? f1(r2.replayMs) : '—'} |`);
  out('');
  out('Command: `node --expose-gc metamedium-core/bench/engine.mjs room --size=N` (median / p95 over 12 lines).');
  out('');
}
const hello = eng('engine-hello-2000-source.json');
if (hello) {
  out('### A newcomer\'s hello — the 2,000-mark board held by the hands already there');
  out('');
  out('| | room of 3 | room of 6 |');
  out('|---|---|---|');
  const h3 = hello.rooms['3'], h6 = hello.rooms['6'];
  const hr = (label, f) => out(`| ${label} | ${h3 ? f(h3) : '—'} | ${h6 ? f(h6) : '—'} |`);
  hr('lines sent in answer', (h) => h.answerLines);
  hr('bytes sent in answer', (h) => `${h.answerMB} MB`);
  hr('bytes delivered (every line reaches every other hand)', (h) => `${h.deliveredMB} MB`);
  hr('lines each hand already there hears', (h) => Math.max(...h.peerLinesReceived));
  hr('times each is notified (in the surface: a full re-merge and replay each)', (h) => `${Math.max(...h.peerNotified)} (${Math.max(...h.peerNotifiedWithEvents)} carry events)`);
  hr('times the newcomer is notified', (h) => h.newcomerNotified);
  out('');
  out('Command: `node --expose-gc metamedium-core/bench/engine.mjs hello --size=2000` (LocalHub; the board split between the hands already there; the newcomer publishes its empty log and says hello, as `openLive` does).');
  out('');
}

// --- surface ---
for (const f of existsSync(perfDir) ? readdirSync(perfDir).filter((x) => /^perf-.*\.json$/.test(x)) : []) {
  const p = read(join(perfDir, f));
  out(`### Surface — ${p.browser} ${p.browserVersion} (${p.viewport})`);
  out('');
  const ks = Object.keys(p.sizes);
  out(`| | ${ks.map((k) => Number(k).toLocaleString('en-GB')).join(' | ')} |`);
  out(`|---|${ks.map(() => '---').join('|')}|`);
  const sr = (label, fn) => {
    const cells = ks.map((k) => { try { return fn(p.sizes[k]) ?? '—'; } catch { return '—'; } });
    if (cells.every((c) => c === '—')) return; // a row nothing was measured for says nothing
    out(`| ${label} | ${cells.join(' | ')} |`);
  };
  const why = (w) => /QuotaExceeded/.test(w || '') ? 'browser storage refused the log (QuotaExceededError)' : w;
  const openCell = (o) => !o ? '—' : o.opened ? `${f1(o.drawnMs)} (longest task ${f1(o.longestTaskMs)})` : `did not open: ${why(o.why)}${o.wallMs ? ` after ${f1(o.wallMs)}` : ''}`;
  sr('**open, restored from browser storage** (navigation → board drawn)', (s) => openCell(s.open.restore));
  sr('**open as a folder** (`?folder=`)', (s) => openCell(s.open.folder));
  sr('renderer heap after open (used of limit)', (s) => { const o = (s.open.restore && s.open.restore.opened) ? s.open.restore : s.open.folder; return o && o.heap ? `${o.heap.usedMB} of ${o.heap.limitMB} MB` : null; });
  sr('one paint alone: fit-all / zoom 1', (s) => `${f1(s.interact.renderFit.median)} / ${f1(s.interact.renderWork.median)}`);
  sr('**pan at fit-all**: handler · frame (median / p95)', (s) => `${pm(s.interact.panFit.handler)} · ${pm(s.interact.panFit.interval)}`);
  sr('**pan at zoom 1**: handler · frame', (s) => `${pm(s.interact.panWork.handler)} · ${pm(s.interact.panWork.interval)}`);
  sr('**drawing**: pointer-move handler · frame', (s) => `${pm(s.interact.draw.move)} · ${pm(s.interact.draw.frameWhileDrawing)}`);
  sr('**release → reading drawn** (median / p95, n 5)', (s) => pm(s.interact.draw.releaseToFrame));
  sr('the release handler alone', (s) => pm(s.interact.draw.release));
  sr('what the strokes read as', (s) => s.interact.draw.readings.join(', '));
  sr('autosave: stringify · into browser storage', (s) => `${f1(s.interact.save.stringify)} · ${s.interact.save.store === null ? 'refused (' + s.interact.save.error.split(':')[0] + ')' : f1(s.interact.save.store)}`);
  out('');
  if (p.storageQuota && p.storageQuota.chars) {
    const perMark = ks.map((k) => p.sizes[k].jsonMB * 1048576 / Number(k)).reduce((x, y) => x + y, 0) / ks.length;
    out(`Browser storage takes at most **${(p.storageQuota.chars / 1048576).toFixed(2)} M characters** under one key (found by halving); these boards' logs run ${(perMark / 1024).toFixed(1)} K characters a mark, so autosave into browser storage stops saving at about **${Math.round(p.storageQuota.chars / perMark).toLocaleString('en-GB')} marks** — and says nothing (17-folder.js:328 swallows the error).`);
    out('');
  }
  out(`Command: \`node e2e/perf.mjs --browser=${p.browser} --sizes=${ks.join(',')}\``);
  out('');
}

console.log(lines.join('\n'));

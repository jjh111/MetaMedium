// Ink from outlines, measured on the synthetic corpus (V1-SPEC IN1; the unit's bench).
//
//     node core/bench/ingest.mjs [--core=source|bundle] [--seeds=4] [--count=24] [--json]
//
// For each outline style found in John's sources — OneNote's ribbons, Inkspace's Béziers, a whiteboard's even-odd
// polylines with clones, Illustrator's brushes — and for plain stroked paths, the fixtures (`src/ingest/fixtures/`)
// draw the engine's own shapes, sweep a pen along them and write the outline the way the source does. Each file is
// read by `ingest`, and per style this says:
//
//   faithful   outlines whose recovered line covers 90% of the outline and stays on it 90% (recall and precision)
//   within 80  the same at 80%
//   reads as   strokes whose shape-rung reading is the source's
//   colour     strokes that kept the colour they were drawn in
//   method     ribbon / skeleton / stroke (a line the source drew itself)
//   ms/outline the time to read a file, over the outlines in it
//
// and, beside them, the hard material: figures whose strokes cross or merge into one silhouette, which are the
// skeleton's. The corpus is generated and seeded, so the numbers are the same on every machine but the times.
// Nothing here reads anyone's ink; `ingest-private.mjs` is the bench that reads John's, on his machine.
//
// The numbers go to `dist/bench/ingest-<core>.json` and the table to stdout.

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadCore, ms, machine, writeResult, args, CORE_DIR, OUT_DIR } from './lib.mjs';

const a = args();
const which = a.core || 'source';
const seeds = Array.from({ length: Number(a.seeds ?? 4) }, (_, i) => i + 1);
const count = Number(a.count ?? 24);

const { core } = await loadCore(which);

// The fixtures are built the way core is, from source, into the bench's own folder.
const { build } = await import('esbuild');
mkdirSync(OUT_DIR, { recursive: true });
const fixturesOut = join(OUT_DIR, 'ingest-fixtures.mjs');
await build({
  entryPoints: [join(CORE_DIR, 'src', 'ingest', 'fixtures', 'corpus.ts')],
  bundle: true, format: 'esm', platform: 'node', outfile: fixturesOut, logLevel: 'silent', absWorkingDir: CORE_DIR,
});
const fx = await import(pathToFileURL(fixturesOut).href + `?t=${Date.now()}`);

const enc = new TextEncoder();
const lengthOf = (pts) => pts.reduce((s, p, i) => (i ? s + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0), 0);
const pct = (n, d) => (d ? ((100 * n) / d).toFixed(1) + '%' : '—');

function readFile(svg, name) {
  const bytes = enc.encode(svg);
  const t0 = performance.now();
  const r = core.ingestSvg(bytes, name, core.sha256Hex(bytes));
  return { r, ms: performance.now() - t0 };
}

function groups(strokes) {
  const by = new Map();
  for (const s of strokes) by.set(s.outline, [...(by.get(s.outline) ?? []), s]);
  return [...by.keys()].sort((x, y) => x - y).map((k) => by.get(k));
}

const rows = [];
for (const style of fx.STYLES) {
  const t = { style, files: 0, outlines: 0, faithful: 0, near: 0, strokes: 0, reads: 0, colour: 0, ribbon: 0, skeleton: 0, stroke: 0, ms: 0, penOutlines: 0 };
  for (const seed of seeds) {
    const s = fx.sample(style, seed, count);
    const { r, ms: took } = readFile(s.svg, s.name);
    if (!r.ok) throw new Error(`${s.name} was refused: ${r.reason}`);
    t.files++; t.ms += took;
    groups(r.doc.pages[0].strokes).forEach((g, i) => {
      t.outlines++;
      const truth = s.truth[i];
      const fid = g.filter((x) => x.fidelity);
      if (fid.length) {
        t.penOutlines++;
        if (fid.every((x) => x.fidelity.faithful)) t.faithful++;
        if (fid.every((x) => Math.min(x.fidelity.recall, x.fidelity.precision) >= 0.8)) t.near++;
      } else { t.faithful++; t.near++; }
      for (const x of g) {
        t.strokes++;
        t[x.recovery]++;
        if (x.color === truth.color) t.colour++;
      }
      const longest = [...g].sort((p, q) => lengthOf(q.points) - lengthOf(p.points))[0];
      if (core.analyzeStroke(longest.points).results[0]?.type === truth.reads) t.reads++;
    });
  }
  rows.push(t);
}

// The hard material.
const hard = { style: 'merged', files: 0, outlines: 0, faithful: 0, near: 0, strokes: 0, reads: 0, colour: 0, ribbon: 0, skeleton: 0, stroke: 0, ms: 0, penOutlines: 0, figures: 0 };
for (const seed of seeds) for (const m of fx.hardFigures(seed)) {
  const { r, ms: took } = readFile(fx.mergedSvg(m, '#0057b8'), `${m.name}.svg`);
  if (!r.ok) throw new Error(`${m.name} was refused: ${r.reason}`);
  hard.files++; hard.figures++; hard.ms += took;
  groups(r.doc.pages[0].strokes).forEach((g) => {
    hard.outlines++;
    hard.penOutlines++;
    if (g.every((x) => x.fidelity?.faithful)) hard.faithful++;
    if (g.every((x) => x.fidelity && Math.min(x.fidelity.recall, x.fidelity.precision) >= 0.8)) hard.near++;
    for (const x of g) { hard.strokes++; hard[x.recovery]++; if (x.color === '#0057b8') hard.colour++; }
  });
}
rows.push(hard);

const out = { at: new Date().toISOString(), machine: machine(), core: which, seeds: seeds.length, perFile: count, rows };
const file = writeResult(`ingest-${which}.json`, out);

const head = ['style', 'files', 'outlines', 'faithful', 'within 80', 'reads as', 'colour', 'ribbon', 'skeleton', 'stroke', 'ms/outline'];
const table = rows.map((t) => [
  t.style, String(t.files), String(t.outlines), pct(t.faithful, t.outlines), pct(t.near, t.outlines),
  t.style === 'merged' ? '—' : pct(t.reads, t.outlines), pct(t.colour, t.strokes), String(t.ribbon), String(t.skeleton), String(t.stroke), ms(t.ms / Math.max(1, t.outlines)),
]);
const widths = head.map((h, i) => Math.max(h.length, ...table.map((r) => r[i].length)));
const line = (r) => r.map((c, i) => (i === 0 ? c.padEnd(widths[i]) : c.padStart(widths[i]))).join('  ');
process.stdout.write(`ingest bench — core ${which} · ${seeds.length} seeds × ${count} strokes a file · ${out.machine.node} · ${out.machine.cpu}\n\n`);
process.stdout.write(line(head) + '\n' + line(head.map((h) => '─'.repeat(h.length))) + '\n');
for (const r of table) process.stdout.write(line(r) + '\n');
const all = rows.filter((t) => t.style !== 'merged');
const sum = (k) => all.reduce((s, t) => s + t[k], 0);
process.stdout.write(`\nsynthetic corpus, every style: ${pct(sum('faithful'), sum('outlines'))} faithful, ${pct(sum('near'), sum('outlines'))} within 80%, ${pct(sum('reads'), sum('outlines'))} read as their source, ${pct(sum('colour'), sum('strokes'))} kept their colour\n`);
process.stdout.write(`merged silhouettes (the skeleton’s): ${pct(hard.faithful, hard.outlines)} faithful, ${pct(hard.near, hard.outlines)} within 80%, ${hard.strokes} strokes from ${hard.figures} figures\n`);
process.stdout.write(`\nwritten to ${file}\n`);
if (a.json) process.stdout.write(JSON.stringify(out) + '\n');

// Ink from outlines, measured on John's own files — numbers only (V1-SPEC IN1, §12).
//
//     MM_INK_DIR=/path/to/a/folder node core/bench/ingest-private.mjs [--core=bundle|source] [--ext=svg,md] [--max-files=100000]
//
// John's notebooks, drawings and recordings are his. They never enter the repository, and the benches that read
// them run on his machine and PRINT NUMBERS, NEVER CONTENT. So this prints counts and shares and times, and nothing
// else: no file name, no folder name, no title, no word of a note, no tool string that is not on a short list, and
// no refusal's text (a reason can quote an element of the file it refused) — refusals are counted in coarse
// buckets. A read that fails is counted, and its error, which would carry a path, is dropped. Files are read one at
// a time and handed to `ingest` under a name of this script’s own; the folder is walked but not listed.
//
// What it says: how many files, of what kind, how many outlines were read back to lines, what share are faithful
// (the recovered line covers 90% of the outline and stays on it 90%) and what share are within 80%, which method
// stood, how the files spread by how faithful they are, and what it cost. It is the number V1-SPEC §1.4's table
// has for the prototype: OneNote 73% faithful, 88% within 80%; Inkspace 75–96% and 95–98%.
//
// Do not point it at a folder that is not John's to read, and do not paste its output anywhere it names a file.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { loadCore, ms, machine, writeResult, args } from './lib.mjs';

const a = args();
const dir = process.env.MM_INK_DIR;
if (!dir) {
  process.stderr.write('ingest-private: set MM_INK_DIR to the folder to read. It prints numbers only, never a name or a word of content.\n');
  process.exit(2);
}
const which = a.core || 'bundle';
const wanted = new Set(String(a.ext || 'svg,md,markdown,png,jpg,jpeg,webp').toLowerCase().split(',').map((e) => '.' + e.trim()));
const maxFiles = Number(a['max-files'] ?? 100000);
const { core } = await loadCore(which);

const say = (s) => process.stdout.write(s + '\n');
const pct = (n, d) => (d ? ((100 * n) / d).toFixed(1) + '%' : '—');
const num = (n) => Number(n).toLocaleString('en');

/** Every readable file under the folder with a wanted extension, found without being named anywhere. */
function* walk(root) {
  const stack = [root];
  while (stack.length) {
    const here = stack.pop();
    let entries;
    try { entries = readdirSync(here, { withFileTypes: true }); } catch { continue; }
    entries.sort((x, y) => (x.name < y.name ? -1 : 1));
    for (const e of entries) {
      if (e.name.startsWith('.') || e.name === 'node_modules' || e.isSymbolicLink()) continue;
      const p = join(here, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile() && wanted.has(extname(e.name).toLowerCase())) yield p;
    }
  }
}

/** A refusal, in a bucket. The reason's own words are never kept: they can quote the file. */
function bucket(reason) {
  const r = String(reason);
  if (/cut off|stops inside|never (closed|finished)|second root|has no element/i.test(r)) return 'cut off or not well formed';
  if (/not a readable SVG|closes a|not quoted|no value|attribute|does not start a tag/i.test(r)) return 'not readable XML';
  if (/not an SVG|first element|root is/i.test(r)) return 'not an SVG';
  if (/limit|too big|large|over the/i.test(r)) return 'too big';
  if (/viewBox|width|height|size/i.test(r)) return 'no usable size';
  if (/not text|not a file|empty/i.test(r)) return 'not text or empty';
  if (/GIF|PDF|InkML|zip|compressed/i.test(r)) return 'a format not read';
  return 'other';
}
const TOOLS = ['Illustrator', 'Inkscape', 'Sketch', 'Figma', 'Wacom', 'Inkspace', 'OneNote', 'Affinity', 'CorelDRAW', 'Canva'];
const toolBucket = (t) => (t ? TOOLS.find((k) => new RegExp(k, 'i').test(t)) || 'another tool' : 'none said');

const t = {
  seen: 0, unreadable: 0, ms: 0, bytes: 0,
  kinds: { svg: 0, note: 0, picture: 0, refused: 0 },
  refusals: new Map(), tools: new Map(), reading: { ink: 0, figure: 0 }, truncated: 0,
  outlines: 0, penOutlines: 0, faithful: 0, near: 0, strokes: 0, points: 0, ribbon: 0, skeleton: 0, stroke: 0,
  texts: 0, pictures: 0, links: 0, tags: 0,
  perFile: [],
  unfaithfulStrokes: 0, widths: [],
};
const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1);

const started = performance.now();
for (const file of walk(dir)) {
  if (t.seen >= maxFiles) break;
  t.seen++;
  let bytes;
  try {
    if (statSync(file).size > 128 * 1024 * 1024) { t.kinds.refused++; bump(t.refusals, 'too big'); continue; }
    bytes = new Uint8Array(readFileSync(file));
  } catch { t.unreadable++; continue; }
  t.bytes += bytes.length;
  const ext = extname(file).toLowerCase();
  const t0 = performance.now();
  let r;
  try { r = core.ingest(bytes, 'file' + ext); } catch { t.unreadable++; continue; }
  t.ms += performance.now() - t0;
  if (!r.ok) { t.kinds.refused++; bump(t.refusals, bucket(r.reason)); continue; }
  const { doc } = r;
  bump(t.tools, toolBucket(doc.source.tool));
  if (doc.truncated) t.truncated++;
  const format = doc.source.format;
  if (format === 'markdown') t.kinds.note++;
  else if (format === 'svg') t.kinds.svg++;
  else t.kinds.picture++;
  if (doc.reading.as === 'ink' || doc.reading.as === 'figure') t.reading[doc.reading.as]++;
  const outlines = new Map();
  for (const page of doc.pages) {
    t.texts += page.texts.length; t.pictures += page.pictures.length; t.links += page.links.length; t.tags += page.tags.length;
    for (const s of page.strokes) {
      t.strokes++; t.points += s.points.length; t[s.recovery]++;
      const key = s.outline;
      outlines.set(key, [...(outlines.get(key) ?? []), s]);
    }
  }
  let fFaithful = 0, fPen = 0;
  for (const g of outlines.values()) {
    t.outlines++;
    const fid = g.filter((s) => s.fidelity);
    if (!fid.length) continue;
    t.penOutlines++; fPen++;
    if (fid.every((s) => s.fidelity.faithful)) { t.faithful++; fFaithful++; }
    if (fid.every((s) => Math.min(s.fidelity.recall, s.fidelity.precision) >= 0.8)) t.near++;
  }
  if (fPen) t.perFile.push(fFaithful / fPen);
}
const wall = performance.now() - started;

say(`ingest-private — core ${which} · ${machine().node} · numbers only`);
say('');
say(`files seen ${num(t.seen)} (${num(t.kinds.svg)} SVG, ${num(t.kinds.note)} notes, ${num(t.kinds.picture)} pictures) · refused ${num(t.kinds.refused)} · unreadable ${num(t.unreadable)} · ${(t.bytes / 1048576).toFixed(1)} MB`);
if (t.refusals.size) say(`refused because: ${[...t.refusals].sort((x, y) => y[1] - x[1]).map(([k, n]) => `${k} ×${n}`).join(', ')}`);
if (t.tools.size) say(`made by: ${[...t.tools].sort((x, y) => y[1] - x[1]).map(([k, n]) => `${k} ×${n}`).join(', ')}`);
say(`read as: ${num(t.reading.ink)} ink, ${num(t.reading.figure)} figure${t.truncated ? ` · ${num(t.truncated)} cut short by a cap` : ''}`);
say('');
say(`outlines ${num(t.outlines)} · pen outlines read back to lines ${num(t.penOutlines)}`);
say(`  faithful ${pct(t.faithful, t.penOutlines)} · within 80% ${pct(t.near, t.penOutlines)}`);
say(`  strokes ${num(t.strokes)} (${num(t.ribbon)} by ribbon, ${num(t.skeleton)} by skeleton, ${num(t.stroke)} drawn as lines) · ${num(t.points)} points`);
if (t.perFile.length) {
  const b = [0, 0, 0, 0];
  for (const f of t.perFile) b[f >= 0.95 ? 0 : f >= 0.9 ? 1 : f >= 0.8 ? 2 : 3]++;
  say(`  files by their share of faithful outlines: ≥95% ${num(b[0])} · 90–95% ${num(b[1])} · 80–90% ${num(b[2])} · under 80% ${num(b[3])}`);
}
say(`  also: ${num(t.texts)} text runs, ${num(t.pictures)} pictures, ${num(t.links)} links, ${num(t.tags)} tags`);
say('');
say(`time ${ms(t.ms)} reading (${ms(wall)} wall)${t.penOutlines ? ` · ${ms(t.ms / Math.max(1, t.outlines))} an outline` : ''}`);

const file = writeResult('ingest-private.json', {
  at: new Date().toISOString(), machine: machine(), core: which,
  files: t.seen, kinds: t.kinds, refused: Object.fromEntries(t.refusals), tools: Object.fromEntries(t.tools), reading: t.reading, truncated: t.truncated,
  outlines: t.outlines, penOutlines: t.penOutlines, faithful: t.faithful, near: t.near, strokes: t.strokes, points: t.points,
  methods: { ribbon: t.ribbon, skeleton: t.skeleton, stroke: t.stroke }, ms: t.ms,
});
say('');
say(`numbers written to ${file.replace(/^.*\/(core\/dist\/bench\/)/, '$1')}`);

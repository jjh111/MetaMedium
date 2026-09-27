// labels.mjs — is it the model, or the words we ask it in?
//
// With the plan's five kinds asked by name, the model reads "measurement name"
// as a measurement (it tags 38" and 36 inch) and files Bust under garments. So:
// the same fixtures asked in other words, each model-facing label mapped back
// to one of the five kinds before scoring. The phrasings were fixed BEFORE this
// was first run, and none names a word that appears in a fixture; with 143
// spans and no held-out set, read the best of them as an upper bound, not a
// result.
//
//   node bench/labels.mjs [--ep webgpu|cpu]   → results/labels-<ep>.json

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadNodeRunner } from '../node-runner.mjs';
import { finalize } from '../processor.mjs';
import { scoreItems } from '../score.mjs';
import { THRESHOLDS } from './harness.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const ep = argv.includes('--ep') ? argv[argv.indexOf('--ep') + 1] : 'webgpu';
const read = (f) => JSON.parse(readFileSync(join(ROOT, 'fixtures', f), 'utf8'));
const fixtures = ['apron.sample.json', 'tunic.sample.json', 'briefs.json', 'castle-sketch.brief.json'].map(read);
const { types } = read('labels.json');
const KINDS = types.map((t) => t.name);
const items = fixtures.flatMap((f) => f.items);

/** Each set: model-facing labels, each with the kind it is scored as. */
const SETS = {
  'plan, bare': types.map((t) => ({ name: t.name, kind: t.name })),
  'plan, described': types.map((t) => ({ name: t.name, description: t.description, kind: t.name })),
  'plain, bare': [
    { name: 'body measurement', kind: 'measurement name' },
    { name: 'number', kind: 'quantity' },
    { name: 'unit of measurement', kind: 'unit' },
    { name: 'garment', kind: 'garment or part name' },
    { name: 'part', kind: 'garment or part name' },
    { name: 'math operator', kind: 'operation' },
  ],
  'plain, described': [
    { name: 'body measurement', description: 'the name of a place on the body a tape measure goes, such as hip or inseam', kind: 'measurement name' },
    { name: 'number', description: 'a number, count or range, as written', kind: 'quantity' },
    { name: 'unit of measurement', description: 'cm, mm, feet, degrees, or a symbol for a unit', kind: 'unit' },
    { name: 'garment', description: 'a piece of clothing, such as a skirt or a coat', kind: 'garment or part name' },
    { name: 'part', description: 'a named part of the thing being made, such as a roof, a door or a node', kind: 'garment or part name' },
    { name: 'math operator', description: 'a symbol or word for an arithmetic operation, such as plus, minus, times or divided by', kind: 'operation' },
  ],
};

const { runner } = await loadNodeRunner({ ep });
const out = { runner: runner.name, measured: new Date().toISOString(), sets: {} };
for (const [name, set] of Object.entries(SETS)) {
  const kindOf = new Map(set.map((l) => [l.name, l.kind]));
  const labels = set.map(({ name, description }) => (description ? { name, description } : { name }));
  const cands = new Map();
  for (const item of items) {
    const r = await runner.extract(item.text, labels, { threshold: 0.5, floor: 0.1 });
    // Scored as kinds: two labels that mean one kind are one kind, overlap resolved within it.
    cands.set(item.id, r.candidates.map((s) => ({ ...s, label: kindOf.get(s.label) })));
  }
  const at = (t) => new Map([...cands].map(([id, c]) => [id, finalize(c, t)]));
  const sweep = THRESHOLDS.map((t) => {
    const s = scoreItems(items, at(t), { mode: 'strict', types: KINDS });
    const o = scoreItems(items, at(t), { mode: 'overlap', types: KINDS });
    return {
      threshold: t,
      strict: { precision: s.overall.precision, recall: s.overall.recall, f1: s.overall.f1 },
      overlap: { precision: o.overall.precision, recall: o.overall.recall, f1: o.overall.f1 },
      byKindStrict: Object.fromEntries(Object.entries(s.byType).map(([k, v]) => [k, { precision: v.precision, recall: v.recall, tp: v.tp, fp: v.fp, fn: v.fn }])),
    };
  });
  out.sets[name] = { labels: set, sweep };
  const pct = (x) => (x === null ? ' —' : `${Math.round(100 * x)}`.padStart(3));
  console.log(`\n${name}`);
  for (const s of sweep) {
    const kinds = Object.entries(s.byKindStrict).map(([k, v]) => `${k.split(' ')[0]} ${v.tp}/${v.tp + v.fn}`).join('  ');
    console.log(`  t ${s.threshold}  strict P${pct(s.strict.precision)} R${pct(s.strict.recall)} F1${pct(s.strict.f1)}  overlap P${pct(s.overlap.precision)} R${pct(s.overlap.recall)} F1${pct(s.overlap.f1)}   ${kinds}`);
  }
}
mkdirSync(join(ROOT, 'results'), { recursive: true });
writeFileSync(join(ROOT, 'results', `labels-${ep}.json`), JSON.stringify(out, null, 2) + '\n');

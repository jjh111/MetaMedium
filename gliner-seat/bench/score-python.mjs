// score-python.mjs — score what bench/py-bench.py found, with the same scorer.
//
//   node bench/score-python.mjs results/py-gliner2.5-small-v1-cpu.json

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scoreItems } from '../score.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2];
const run = JSON.parse(readFileSync(file, 'utf8'));
const read = (f) => JSON.parse(readFileSync(join(ROOT, 'fixtures', f), 'utf8'));
const items = ['apron.sample.json', 'tunic.sample.json', 'briefs.json', 'castle-sketch.brief.json'].flatMap((f) => read(f).items);
const KINDS = read('labels.json').types.map((t) => t.name);
const pct = (x) => (x === null ? ' —' : `${Math.round(100 * x)}`.padStart(3));

console.log(`${run.runner} — ${(run.parameters / 1e6).toFixed(0)}M parameters, loaded in ${run.load.fromPretrainedS.toFixed(1)} s, first call ${run.load.firstCallMs.toFixed(0)} ms, peak RSS ${run.maxRssMB} MB`);
for (const [name, l] of Object.entries(run.latency)) console.log(`  ${name}: per call median ${l.median.toFixed(0)} ms, p95 ${l.p95.toFixed(0)} ms`);
run.scores = {};
for (const [name, byThreshold] of Object.entries(run.spans)) {
  console.log(`\n${name}`);
  run.scores[name] = [];
  for (const [t, byItem] of Object.entries(byThreshold)) {
    // Two labels that mean one kind may both claim the same words: keep the stronger.
    const preds = new Map(
      Object.entries(byItem).map(([id, spans]) => {
        const best = new Map();
        for (const s of spans) {
          const key = `${s.label}\u0000${s.start}\u0000${s.end}`;
          if (!best.has(key) || best.get(key).score < s.score) best.set(key, s);
        }
        return [id, [...best.values()]];
      })
    );
    const s = scoreItems(items, preds, { mode: 'strict', types: KINDS });
    const o = scoreItems(items, preds, { mode: 'overlap', types: KINDS });
    run.scores[name].push({ threshold: Number(t), strict: s.overall, overlap: o.overall, byKindStrict: s.byType });
    const kinds = Object.entries(s.byType).map(([k, v]) => `${k.split(' ')[0]} ${v.tp}/${v.tp + v.fn}`).join('  ');
    console.log(`  t ${t}  strict P${pct(s.overall.precision)} R${pct(s.overall.recall)} F1${pct(s.overall.f1)}  overlap P${pct(o.overall.precision)} R${pct(o.overall.recall)} F1${pct(o.overall.f1)}   ${kinds}`);
  }
}
writeFileSync(file, JSON.stringify(run, null, 1) + '\n');

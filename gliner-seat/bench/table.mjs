// table.mjs — the README's tables, generated from results/, so no number is retyped.
//
//   node bench/table.mjs

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RESULTS = join(dirname(fileURLToPath(import.meta.url)), '..', 'results');
const load = (f) => (existsSync(join(RESULTS, f)) ? JSON.parse(readFileSync(join(RESULTS, f), 'utf8')) : null);
const ms = (x) => (x === null || x === undefined ? '—' : x < 10 ? x.toFixed(1) : Math.round(x).toString());
const s = (x) => (x / 1000).toFixed(1);
const pct = (x) => (x === null || x === undefined ? '—' : `${Math.round(100 * x)}%`);

function tsv(f) {
  if (!existsSync(join(RESULTS, f))) return null;
  const rows = readFileSync(join(RESULTS, f), 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t').map(Number));
  const ok = rows.filter((r) => r.every((v) => Number.isFinite(v)));
  const base = ok[0];
  const last = ok.at(-1);
  return {
    rendererMB: last[1],
    rendererPeakMB: Math.max(...ok.map((r) => r[2])),
    gpuDeltaMB: Math.max(...ok.map((r) => r[3])) - base[3],
  };
}

// One line of the page (80 calls: 16 lines × 5): median and p95 of the same calls.
const call = (v) => `${ms(v.latency.byGroup['a line of the page'].median)} (${ms(v.latency.byGroup['a line of the page'].p95)})`;
const castle = (h) => `${ms(h.variants.names.latency.byGroup["the castle's brief"].median)} / ${ms(h.variants.described.latency.byGroup["the castle's brief"].median)}`;

console.log('| Where | Load to first answer | Memory | A line of the page, bare labels: median (p95) | The same, labels described | The castle\'s brief, bare / described |');
console.log('|---|---|---|---|---|---|');
for (const [f, where] of [
  ['node-fp16-webgpu.json', 'Node · onnxruntime-node · WebGPU (Metal)'],
  ['node-fp16-cpu.json', 'Node · onnxruntime-node · CPU, default threads'],
  ['node-fp16-cpu-t4.json', 'Node · onnxruntime-node · CPU, 4 threads'],
]) {
  const r = load(f);
  if (!r) continue;
  const c = r.loads.diskCold.toFirstAnswerMs.median;
  const w = r.loads.cacheWarm.toFirstAnswerMs.median;
  const h = r.harness;
  console.log(`| ${where} | ${s(c)} s disk-cold, ${s(w)} s cache-warm | ${r.memory.afterLoad.rssMB} MB RSS loaded, ${r.memory.afterAll.maxRssMB} MB peak | ${call(h.variants.names)} ms | ${call(h.variants.described)} ms | ${castle(h)} ms |`);
}
const cold = load('web-webgpu-shadercold-load.json');
const pcold = load('web-webgpu-cold-load.json');
const warm = [load('web-webgpu-warm1-load.json'), load('web-webgpu-warm2-load.json'), load('web-webgpu-full.json')].filter(Boolean);
const warmMs = warm.map((r) => r.load.toFirstAnswerMs);
for (const [f, mem, where, loadText] of [
  ['web-webgpu-full.json', 'web-webgpu-memory.tsv', 'Browser pane (Chrome 152) · onnxruntime-web · WebGPU', cold && pcold ? `${s(cold.load.toFirstAnswerMs)} s first visit, ${s(pcold.load.toFirstAnswerMs)} s cold page, ${s(Math.min(...warmMs))}–${s(Math.max(...warmMs))} s from OPFS` : '—'],
  ['web-wasm-full.json', 'web-wasm-memory.tsv', 'Browser pane (Chrome 152) · onnxruntime-web · wasm, 4 threads', null],
  ['web-webgpu-chromium.json', null, 'Chromium for Testing, page in front · WebGPU', null],
  ['web-wasm-chromium.json', null, 'Chromium for Testing, page in front · wasm, 4 threads', null],
  ['web-webgpu-webkit.json', null, 'WebKit 26.6 (Playwright) · WebGPU', null],
]) {
  const r = load(f);
  if (!r) continue;
  const m = mem ? tsv(mem) : null;
  const memText = m ? `tab ${m.rendererMB} MB held (peak ${m.rendererPeakMB} MB), GPU process +${m.gpuDeltaMB} MB` : '—';
  const lt = loadText ?? `${s(r.load.toFirstAnswerMs)} s (${r.load.kind.split(' (')[0]})`;
  console.log(`| ${where} | ${lt} | ${memText} | ${call(r.harness.variants.names)} ms | ${call(r.harness.variants.described)} ms | ${castle(r.harness)} ms |`);
}
for (const [f, where] of [
  ['py-gliner2.5-small-v1-cpu.json', 'Python · gliner2 + torch · CPU — GLiNER2.5-small'],
  ['py-gliner2.5-small-v1-mps.json', 'Python · gliner2 + torch · MPS — GLiNER2.5-small'],
]) {
  const r = load(f);
  if (!r) continue;
  const b = r.latency['plan, bare'];
  const d = r.latency['plan, described'];
  console.log(`| ${where} | ${r.load.fromPretrainedS.toFixed(1)} s load + ${ms(r.load.firstCallMs)} ms first call | ${r.maxRssMB} MB peak RSS | ${ms(b.median)} (${ms(b.p95)}) ms, over all calls | ${ms(d.median)} (${ms(d.p95)}) ms, over all calls | — |`);
}

console.log('\n| GLiNER2 multi-v1 (fp16 graph), 143 labelled spans | Strict P / R / F1 | Overlap P / R / F1 |');
console.log('|---|---|---|');
const L = load('labels-webgpu.json');
for (const [set, t] of [['plan, bare', 0.5], ['plan, described', 0.5], ['plan, described', 0.3], ['plain, bare', 0.5], ['plain, described', 0.4]]) {
  const row = L.sets[set].sweep.find((x) => x.threshold === t);
  console.log(`| ${set}, threshold ${t} | ${pct(row.strict.precision)} / ${pct(row.strict.recall)} / ${pct(row.strict.f1)} | ${pct(row.overlap.precision)} / ${pct(row.overlap.recall)} / ${pct(row.overlap.f1)} |`);
}
const P = load('py-gliner2.5-small-v1-cpu.json');
if (P?.scores) {
  for (const [set, t] of [['plan, described', 0.3], ['plain, described', 0.3]]) {
    const row = P.scores[set].find((x) => x.threshold === t);
    console.log(`| *GLiNER2.5-small*, ${set}, threshold ${t} | ${pct(row.strict.precision)} / ${pct(row.strict.recall)} / ${pct(row.strict.f1)} | ${pct(row.overlap.precision)} / ${pct(row.overlap.recall)} / ${pct(row.overlap.f1)} |`);
  }
}

console.log('\n| Kind (spans) | Plan labels described, 0.5 | Best of the four phrasings and seven thresholds |');
console.log('|---|---|---|');
const g = load('node-fp16-webgpu.json').harness.variants.described.quality.strict.byType;
const best = {};
for (const [name, set] of Object.entries(L.sets)) {
  for (const x of set.sweep) {
    for (const [k, v] of Object.entries(x.byKindStrict)) {
      const cur = best[k];
      if (!cur || v.tp > cur.tp || (v.tp === cur.tp && (v.precision ?? 0) > (cur.precision ?? 0))) best[k] = { ...v, set: name, t: x.threshold };
    }
  }
}
for (const [k, v] of Object.entries(g)) {
  const b = best[k];
  console.log(`| ${k} (${v.tp + v.fn}) | found ${v.tp}, precision ${pct(v.precision)} | found ${b.tp}, precision ${pct(b.precision)} (${b.set}, ${b.t}) |`);
}

console.log('\n| Fixture | Strict P / R, plan labels described, 0.5 |');
console.log('|---|---|');
for (const [f, x] of Object.entries(load('node-fp16-webgpu.json').harness.variants.described.quality.strict.byFixture)) {
  console.log(`| ${f} | ${pct(x.precision)} / ${pct(x.recall)} (found ${x.tp} of ${x.tp + x.fn}, ${x.fp} wrong) |`);
}

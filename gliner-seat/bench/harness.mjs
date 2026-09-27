// harness.mjs — one protocol for every runtime.
//
// Given a runner (runner.mjs over onnxruntime-node or onnxruntime-web), the
// fixtures and the five kinds, it asks every fixture item `repeats` times with
// the labels as bare names and again with their descriptions, and returns:
//
//   latency   per call as the seat would see it (prompt + graph + decode, every
//             piece of a long text), median and p95, overall and by group;
//   quality   precision and recall at the library's threshold (0.5), strict and
//             by overlap, overall, per kind and per fixture, every error listed;
//   sweep     the same at thresholds 0.3 … 0.9, read off the candidates, so a
//             threshold is chosen on these fixtures rather than borrowed.
//
// Isomorphic and pure apart from the runner it is handed and a clock.

import { finalize } from '../processor.mjs';
import { scoreItems } from '../score.mjs';

const clock = () => (globalThis.performance ?? Date).now();

export function quantile(values, q) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

function stats(values) {
  if (!values.length) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return {
    n: values.length,
    median: quantile(values, 0.5),
    p95: quantile(values, 0.95),
    mean,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

/** Which group an item's latency belongs to. */
export function groupOf(fixtureId) {
  if (fixtureId === 'briefs') return 'a brief in words';
  if (fixtureId === 'castle-sketch.brief') return "the castle's brief";
  return 'a line of the page';
}

export const THRESHOLDS = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

/**
 * @param {{
 *   runner: { name: string, extract: Function },
 *   fixtures: { id: string, items: object[] }[],
 *   types: { name: string, description: string }[],
 *   repeats?: number,
 *   variants?: ('names' | 'described')[],
 *   onProgress?: (line: string) => void,
 *   memory?: () => object,   // a snapshot of memory, if the runtime can take one
 * }} a
 */
export async function runHarness({ runner, fixtures, types, repeats = 5, variants = ['names', 'described'], onProgress = () => {}, memory }) {
  const items = fixtures.flatMap((f) => f.items.map((item) => ({ ...item, fixture: f.id })));
  const labelSets = {
    names: types.map((t) => ({ name: t.name })),
    described: types.map((t) => ({ name: t.name, description: t.description })),
  };

  // The first call pays for whatever the runtime does lazily (kernel
  // selection, shader compilation, buffer allocation). It is reported on its
  // own and kept out of the steady-state numbers.
  const t0 = clock();
  await runner.extract(items[0].text, labelSets.names, { threshold: 0.5 });
  const firstCall = clock() - t0;
  onProgress(`first call ${firstCall.toFixed(0)} ms`);

  const out = { runner: runner.name, firstCallMs: firstCall, repeats, variants: {} };
  if (memory) out.memoryAfterFirstCall = memory();

  for (const variant of variants) {
    const labels = labelSets[variant];
    const calls = []; // { group, total, run, prep, decode, pieces, tokens }
    const candidates = new Map();
    for (const item of items) {
      for (let r = 0; r < repeats; r++) {
        const res = await runner.extract(item.text, labels, { threshold: 0.5, floor: 0.1 });
        calls.push({ item: item.id, group: groupOf(item.fixture), total: res.ms.total, run: res.ms.run, prep: res.ms.prep, decode: res.ms.decode, pieces: res.pieces, tokens: res.tokens });
        if (r === 0) candidates.set(item.id, res.candidates);
      }
      onProgress(`${variant} ${item.id}`);
    }

    const at = (threshold) => new Map([...candidates].map(([id, c]) => [id, finalize(c, threshold)]));
    const typeNames = types.map((t) => t.name);
    const quality = {};
    for (const mode of ['strict', 'overlap']) {
      const overall = scoreItems(items, at(0.5), { mode, types: typeNames });
      const byFixture = Object.fromEntries(
        fixtures.map((f) => [f.id, scoreItems(f.items, at(0.5), { mode, types: typeNames }).overall])
      );
      quality[mode] = { ...overall, byFixture };
    }
    const sweep = THRESHOLDS.map((threshold) => {
      const s = scoreItems(items, at(threshold), { mode: 'strict', types: typeNames }).overall;
      const o = scoreItems(items, at(threshold), { mode: 'overlap', types: typeNames }).overall;
      return { threshold, strict: { precision: s.precision, recall: s.recall, f1: s.f1 }, overlap: { precision: o.precision, recall: o.recall, f1: o.f1 } };
    });

    const groups = [...new Set(calls.map((c) => c.group))];
    out.variants[variant] = {
      latency: {
        all: stats(calls.map((c) => c.total)),
        graphOnly: stats(calls.map((c) => c.run)),
        byGroup: Object.fromEntries(groups.map((g) => [g, stats(calls.filter((c) => c.group === g).map((c) => c.total))])),
        tokens: stats(calls.map((c) => c.tokens)),
      },
      quality,
      sweep,
      spans: Object.fromEntries([...at(0.5)].map(([id, spans]) => [id, spans.map((s) => ({ label: s.label, text: s.text, start: s.start, score: +s.score.toFixed(4) }))])),
    };
  }
  if (memory) out.memoryAfterAll = memory();
  return out;
}

const pct = (x) => (x === null || x === undefined ? '  — ' : `${(100 * x).toFixed(0).padStart(3)}%`);
const ms = (x) => (x === null || x === undefined ? '—' : x < 10 ? x.toFixed(1) : x.toFixed(0));

/** A few lines a person can read. */
export function summarise(result) {
  const lines = [`${result.runner} — first call ${ms(result.firstCallMs)} ms`];
  for (const [variant, v] of Object.entries(result.variants)) {
    const l = v.latency;
    lines.push(`  labels ${variant}: per call median ${ms(l.all.median)} ms, p95 ${ms(l.all.p95)} ms (graph ${ms(l.graphOnly.median)} ms) over ${l.all.n} calls`);
    for (const [g, s] of Object.entries(l.byGroup)) lines.push(`    ${g.padEnd(20)} median ${ms(s.median)} ms, p95 ${ms(s.p95)} ms`);
    for (const mode of ['strict', 'overlap']) {
      const q = v.quality[mode];
      lines.push(`    ${mode.padEnd(8)} P ${pct(q.overall.precision)} R ${pct(q.overall.recall)} F1 ${pct(q.overall.f1)}  (tp ${q.overall.tp}, fp ${q.overall.fp}, missed ${q.overall.fn}, ignored ${q.ignored})`);
      for (const [t, s] of Object.entries(q.byType)) lines.push(`      ${t.padEnd(22)} P ${pct(s.precision)} R ${pct(s.recall)}  (${s.tp}/${s.tp + s.fn})`);
    }
  }
  return lines.join('\n');
}

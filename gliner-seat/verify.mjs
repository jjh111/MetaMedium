// verify.mjs — is the JavaScript port the library?
//
// The export ships conversion/reference.json: calls recorded from the Python
// `gliner2` library on fastino/gliner2-multi-v1, each with the exact token ids,
// word positions and marker positions its processor produced, and the entities
// it returned. Two checks against the six extraction calls:
//
//   1. the prompt — processor.mjs + the JS tokenizer must reproduce every
//      token id, word position, marker position and character offset exactly;
//   2. the answer — the graph, run on our own prompt, must return the same
//      entity texts, with confidences within a tolerance of the library's.
//
// (The eight classification calls in the file exercise the [L] head, which
// this spike does not port; they are counted and skipped, said out loud.)
//
//   node verify.mjs                 fp16 graph on CPU
//   node verify.mjs --dtype fp32    the fp32 graph, when fetched
//   node verify.mjs --prompt-only   check 1 only (no model needed, just the tokenizer)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPrompt } from './processor.mjs';
import { loadTokenizer, loadNodeRunner } from './node-runner.mjs';
import { MODEL_DIR, REPO, REVISION } from './fetch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : dflt;
};
const dtype = flag('--dtype', 'fp16');
const ep = flag('--ep', 'cpu');
const promptOnly = argv.includes('--prompt-only');

const ref = JSON.parse(readFileSync(join(MODEL_DIR, 'conversion/reference.json'), 'utf8'));
const extractCases = ref.cases.filter((c) => c.kind === 'extract');
const skipped = ref.cases.length - extractCases.length;

const labelsOf = (c) => Object.entries(c.labels).map(([name, description]) => ({ name, description }));
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

const tokenizer = loadTokenizer();
const tokenize = (piece) => tokenizer.encode(piece, { add_special_tokens: false }).ids;

let promptFails = 0;
const report = { model: ref.model, export: `${REPO}@${REVISION.slice(0, 7)}`, prompt: [], answer: [] };

console.log(`prompt parity — ${extractCases.length} extraction calls recorded from the Python library`);
for (const c of extractCases) {
  const p = buildPrompt(tokenize, c.text, labelsOf(c));
  const t = c.tensors;
  const checks = {
    input_ids: same(p.ids, t.input_ids),
    word_positions: same(p.wordPositions, t.word_positions),
    schema_positions: same(p.schemaPositions, t.schema_positions[0]),
    text_tokens: same(p.words.map((w) => w.token), t.text_tokens),
    start_map: same(p.words.map((w) => w.start), t.start_map),
    end_map: same(p.words.map((w) => w.end), t.end_map),
    schema_tokens: same(p.schema, t.schema_tokens[0]),
  };
  const ok = Object.values(checks).every(Boolean);
  promptFails += ok ? 0 : 1;
  report.prompt.push({ text: c.text, ok, checks, ids: p.ids.length });
  console.log(`  ${ok ? '✓' : '✗'} ${p.ids.length} ids  ${c.text.slice(0, 60)}`);
  if (!ok) {
    for (const [k, v] of Object.entries(checks)) if (!v) console.log(`      ${k} differs`);
    if (!checks.input_ids) {
      const i = p.ids.findIndex((x, j) => x !== t.input_ids[j]);
      console.log(`      first difference at ${i}: ours ${p.ids.slice(i, i + 6)} vs ${t.input_ids.slice(i, i + 6)}`);
    }
  }
}
console.log(`  ${extractCases.length - promptFails}/${extractCases.length} identical; ${skipped} classification calls skipped (the [L] head is not ported)`);

let answerFails = 0;
let worst = 0;
if (!promptOnly) {
  const { runner } = await loadNodeRunner({ dtype, ep });
  console.log(`\nanswer parity — ${runner.name}`);
  for (const c of extractCases) {
    const labels = labelsOf(c);
    const got = await runner.extract(c.text, labels, { threshold: 0.5 });
    const want = c.result.entities;
    let ok = true;
    let delta = 0;
    for (const l of labels) {
      const mine = got.spans.filter((s) => s.label === l.name).sort((a, b) => b.score - a.score);
      const theirs = want[l.name] ?? [];
      if (!same(mine.map((s) => s.text), theirs.map((e) => e.text))) ok = false;
      mine.forEach((s, i) => {
        if (theirs[i]) delta = Math.max(delta, Math.abs(s.score - theirs[i].confidence));
        if (theirs[i] && (theirs[i].start !== s.start || theirs[i].end !== s.end)) ok = false;
      });
    }
    worst = Math.max(worst, delta);
    answerFails += ok ? 0 : 1;
    const found = Object.fromEntries(labels.map((l) => [l.name, got.spans.filter((s) => s.label === l.name).map((s) => s.text)]).filter(([, v]) => v.length));
    report.answer.push({ text: c.text, ok, maxDelta: delta, found });
    console.log(`  ${ok ? '✓' : '✗'} |Δconf| ${delta.toExponential(1)}  ${JSON.stringify(found)}`);
  }
  console.log(`  ${extractCases.length - answerFails}/${extractCases.length} same entities, worst |Δconf| ${worst.toExponential(2)}`);
  report.runner = runner.name;
  report.worstDelta = worst;
}

report.summary = {
  promptIdentical: `${extractCases.length - promptFails}/${extractCases.length}`,
  answersSame: promptOnly ? null : `${extractCases.length - answerFails}/${extractCases.length}`,
  classificationSkipped: skipped,
};
if (!promptOnly) {
  mkdirSync(join(HERE, 'results'), { recursive: true });
  writeFileSync(join(HERE, 'results', `verify-${dtype}-${ep}.json`), JSON.stringify(report, null, 2) + '\n');
}
process.exit(promptFails || answerFails ? 1 : 0);

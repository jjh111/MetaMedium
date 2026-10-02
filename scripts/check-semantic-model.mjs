#!/usr/bin/env node
// Ask a REAL static-embedding model the questions the gate asks a built one (PLAN-IPAD-NOTES I9).
//
//     node scripts/check-semantic-model.mjs <folder holding tokenizer.json and model.safetensors>
//     node scripts/check-semantic-model.mjs <https://… folder>      # where the machine can reach the host
//
// The semantic seat's reader (`metamedium-core/src/semantic/static.ts`) was proved against a model its own writer
// built, because the container it was written in could not download the real `minishlab/potion-base-8M` (the proxy
// answers 403). This is the one command that closes that gap the day the files can be had: it reads them with the same
// code the page runs (the committed Node bundle), says what it found, and asks whether related words are nearer than
// unrelated ones — exit 0 only if the files read and the answers are the right way round. It prints numbers; it
// asserts no quality beyond "related is nearer than unrelated by a margin", which is all the seat promises.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const core = await import(resolve(here, '..', 'Demos', 'metamedium-core.node.mjs'));

const arg = process.argv[2];
if (!arg) { console.error('usage: node scripts/check-semantic-model.mjs <folder | https://… folder holding tokenizer.json and model.safetensors>'); process.exit(2); }

async function file(name) {
  if (/^https?:\/\//.test(arg)) {
    const url = arg.replace(/\/*$/, '/') + name;
    const res = await fetch(url).catch((e) => { throw new Error(`could not reach ${url} — ${e.message}`); });
    if (!res.ok) throw new Error(`could not load ${url} — HTTP ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  }
  const p = join(arg, name);
  if (!existsSync(p)) throw new Error(`${p} is not there`);
  return new Uint8Array(readFileSync(p));
}

let transport;
try {
  const tok = await file('tokenizer.json');
  const wts = await file('model.safetensors');
  const names = core.safetensorsNames(wts);
  console.log('tensors:', Object.entries(names).map(([k, v]) => `${k} ${v.dtype} [${v.shape.join(', ')}]`).join('; '));
  transport = core.createStaticTransport({ name: 'checked', tokenizer: new TextDecoder().decode(tok), weights: wts });
  console.log(`read: ${transport.dimension} numbers a text; tokenizer ${(tok.length / 1024).toFixed(0)} KB, weights ${(wts.length / 1048576).toFixed(1)} MB`);
} catch (e) {
  console.error('NOT READ —', e && e.message ? e.message : e);
  console.error('The reader refuses what it cannot read in words; say what this model is (its tensors, its tokenizer kind) and teach the reader, or choose another model.');
  process.exit(1);
}

const pairs = [
  { a: 'pricing', b: 'what it costs', near: true },
  { a: 'pricing', b: 'a garden hose', near: false },
  { a: 'weekly meeting', b: 'standup call', near: true },
  { a: 'weekly meeting', b: 'tax invoice', near: false },
  { a: 'a recipe for soup', b: 'cooking dinner', near: true },
  { a: 'a recipe for soup', b: 'the budget review', near: false },
];
const texts = [...new Set(pairs.flatMap((p) => [p.a, p.b]))];
const t0 = performance.now();
const vecs = await transport.embed(texts);
const ms = performance.now() - t0;
const of = (t) => vecs[texts.indexOf(t)];
let ok = true;
for (const p of pairs) console.log(`${p.near ? 'near' : 'far '}  ${core.semanticCosine(of(p.a), of(p.b)).toFixed(2)}  “${p.a}” ~ “${p.b}”`);
for (let i = 0; i < pairs.length; i += 2) {
  const near = core.semanticCosine(of(pairs[i].a), of(pairs[i].b)), far = core.semanticCosine(of(pairs[i + 1].a), of(pairs[i + 1].b));
  const good = near > far + 0.1;
  ok = ok && good;
  console.log(`${good ? 'ok  ' : 'FAIL'}  related ${near.toFixed(2)} vs unrelated ${far.toFixed(2)}  (“${pairs[i].a}”)`);
}
const many = Array.from({ length: 2000 }, (_, i) => `note ${i} about pricing and the weekly meeting`);
const t1 = performance.now();
await transport.embed(many);
console.log(`speed: ${texts.length} texts in ${ms.toFixed(1)} ms; 2000 notes in ${(performance.now() - t1).toFixed(0)} ms`);
process.exit(ok ? 0 : 1);

// The processor with no model: its word splitting, its prompt layout, and its
// decoding of synthetic logits. (Parity with the Python library itself, token
// for token, is `node verify.mjs`, which needs the downloaded tokenizer.)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_WIDTH,
  buildPrompt,
  candidates,
  chunkText,
  decodeEntities,
  entitySchema,
  finalize,
  mergeSpans,
  splitWords,
} from './processor.mjs';

const words = (text) => splitWords(text).map((w) => w.token);

test('words split as the library splits them, offsets into the original text', () => {
  assert.deepEqual(words('3. Top shoulder to under armpit × 2 + 3–6"'), [
    '3', '.', 'top', 'shoulder', 'to', 'under', 'armpit', '×', '2', '+', '3', '–', '6', '"',
  ]);
  assert.deepEqual(words('4. Fist + 2–4"   3.5 + 4 = 7.5"').slice(8, 11), ['3', '.', '5']);
  assert.deepEqual(words('Find a one-way ticket'), ['find', 'a', 'one-way', 'ticket']);
  const text = 'B. Top to waist 20';
  for (const w of splitWords(text)) assert.equal(text.slice(w.start, w.end).toLowerCase(), w.token);
});

test('a Unicode word stays whole, as Python\'s \\w keeps it', () => {
  // A bare JavaScript \w would split both; the positions would then drift.
  assert.deepEqual(words('2. ① ÷ 2'), ['2', '.', '①', '÷', '2']);
  assert.deepEqual(words('Trouver un vol de Paris à Lisbonne'), ['trouver', 'un', 'vol', 'de', 'paris', 'à', 'lisbonne']);
});

test('the entity schema is the library\'s, with and without descriptions', () => {
  assert.deepEqual(entitySchema([{ name: 'quantity' }, { name: 'unit' }]), [
    '(', '[P]', 'entities', '(', '[E]', 'quantity', '[E]', 'unit', ')', ')',
  ]);
  assert.deepEqual(entitySchema([{ name: 'quantity', description: 'a number' }, { name: 'unit' }]), [
    '(', '[P]', 'entities [DESCRIPTION] quantity: a number', '(', '[E]', 'quantity', '[E]', 'unit', ')', ')',
  ]);
});

test('the prompt routes [P], each [E] and each word\'s first sub-token', () => {
  // A fake tokenizer: one id per space-separated piece, ids by first sight.
  const vocab = new Map();
  const tokenize = (piece) => piece.split(' ').filter(Boolean).map((p) => {
    if (!vocab.has(p)) vocab.set(p, vocab.size + 10);
    return vocab.get(p);
  });
  const p = buildPrompt(tokenize, 'Bust 36', [{ name: 'measurement name' }, { name: 'quantity' }]);
  // ( [P] entities ( [E] measurement name [E] quantity ) ) [SEP_TEXT] bust 36
  //  0  1    2     3  4      5      6     7     8     9 10    11      12   13
  assert.deepEqual(p.schemaPositions, [1, 4, 7]);
  assert.deepEqual(p.wordPositions, [12, 13]);
  assert.equal(p.ids.length, 14);
  assert.deepEqual(p.words.map((w) => [w.token, w.start, w.end]), [['bust', 0, 4], ['36', 5, 7]]);
});

test('a word with no sub-tokens keeps its row', () => {
  const tokenize = (piece) => (piece === '"' ? [] : [piece.length]);
  const p = buildPrompt(tokenize, '38 "', [{ name: 'unit' }]);
  assert.equal(p.wordPositions.length, 2);
  assert.ok(p.wordPositions.every((i) => i < p.ids.length));
});

/** Logits for [1, L, T, W], all very negative except the ones given. */
function logits(L, T, set) {
  const out = new Float32Array(L * T * MAX_WIDTH).fill(-20);
  for (const [l, s, w, v] of set) out[(l * T + s) * MAX_WIDTH + w] = v;
  return out;
}
const count = (n) => Float32Array.from({ length: 20 }, (_, i) => (i === n ? 5 : 0));

test('the count head gates everything: argmax 0 means nothing here', () => {
  const text = 'Bust 36';
  const w = splitWords(text);
  const labels = [{ name: 'quantity' }];
  const spanLogits = logits(1, 2, [[0, 1, 0, 4]]);
  assert.deepEqual(decodeEntities({ text, words: w, labels, countLogits: count(0), spanLogits }).spans, []);
  const found = decodeEntities({ text, words: w, labels, countLogits: count(1), spanLogits }).spans;
  assert.deepEqual(found.map((s) => [s.label, s.text]), [['quantity', '36']]);
  assert.ok(Math.abs(found[0].score - 1 / (1 + Math.exp(-4))) < 1e-6);
});

test('overlap is resolved greedily by score within a label, never across labels', () => {
  const text = 'Top to waist 20';
  const w = splitWords(text); // top to waist 20
  const labels = [{ name: 'measurement name' }, { name: 'quantity' }];
  const spanLogits = logits(2, 4, [
    [0, 0, 2, 3], // "Top to waist" 0.95
    [0, 2, 0, 1], // "waist" 0.73 — overlaps the stronger one: dropped
    [0, 0, 3, 0.5], // "Top to waist 20" 0.62 — overlaps: dropped
    [1, 3, 0, 5], // "20" as quantity
    [1, 2, 1, 0.2], // "waist 20" as quantity 0.55 — overlaps "20" (stronger): dropped
  ]);
  const { spans } = decodeEntities({ text, words: w, labels, countLogits: count(1), spanLogits });
  assert.deepEqual(spans.map((s) => [s.label, s.text]).sort(), [['measurement name', 'Top to waist'], ['quantity', '20']]);

  // The same words under two labels both stand: a disagreement is reported, not settled.
  const both = logits(2, 4, [[0, 3, 0, 2], [1, 3, 0, 2]]);
  const two = decodeEntities({ text, words: w, labels, countLogits: count(1), spanLogits: both }).spans;
  assert.deepEqual(two.map((s) => s.label).sort(), ['measurement name', 'quantity']);
});

test('a span never runs past the last word, and the floor keeps weaker candidates for tuning', () => {
  const text = 'Arm length';
  const w = splitWords(text);
  const labels = [{ name: 'measurement name' }];
  const spanLogits = logits(1, 2, [[0, 1, 1, 9], [0, 0, 1, -0.5]]); // (1, width 2) runs off the end
  const raw = candidates({ text, words: w, labels, spanLogits, floor: 0.3 });
  assert.deepEqual(raw.map((s) => s.text), ['Arm length']);
  assert.equal(finalize(raw, 0.5).length, 0);
  assert.equal(finalize(raw, 0.3).length, 1);
});

test('long text is read in pieces at line breaks, offsets into the original', () => {
  const short = 'A. Bust 36';
  assert.deepEqual(chunkText(short), [{ start: 0, end: short.length }]);

  const lines = ['one two three', 'four five', '', 'six seven eight nine'];
  const text = lines.join('\n');
  const pieces = chunkText(text, { maxWords: 5, overlap: 1 });
  assert.deepEqual(pieces.map((p) => text.slice(p.start, p.end)), ['one two three\nfour five', 'six seven eight nine']);

  const long = Array.from({ length: 12 }, (_, i) => `w${i}`).join(' ');
  const windows = chunkText(long, { maxWords: 5, overlap: 2 });
  assert.deepEqual(windows.map((p) => long.slice(p.start, p.end).split(' ')), [
    ['w0', 'w1', 'w2', 'w3', 'w4'],
    ['w3', 'w4', 'w5', 'w6', 'w7'],
    ['w6', 'w7', 'w8', 'w9', 'w10'],
    ['w9', 'w10', 'w11'],
  ]);
  assert.throws(() => chunkText(long, { maxWords: 4, overlap: 4 }));
});

test('spans read twice where pieces overlap are merged, the stronger kept', () => {
  const merged = mergeSpans([
    { label: 'quantity', text: '36', start: 5, end: 7, score: 0.8 },
    { label: 'quantity', text: '36', start: 5, end: 7, score: 0.9 },
    { label: 'unit', text: '36', start: 5, end: 7, score: 0.6 },
  ]);
  assert.equal(merged.length, 2);
  assert.equal(merged.find((s) => s.label === 'quantity').score, 0.9);
});

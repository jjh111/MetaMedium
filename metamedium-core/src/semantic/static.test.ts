// A static-embedding model read from its own files (PLAN-IPAD-NOTES I9, the semantic seat's first candidate:
// Model2Vec's `potion` family — a tokenizer and one table of vectors, words in, the mean out). The reader is
// pure code over bytes, so it is proved here against a model BUILT for the test by the same format's writer:
// related words are near, an unknown word is no direction, and what cannot be read is said, never guessed at.
// What this does NOT prove is the real weights — nothing here could download them (the proxy answers 403);
// `scripts/check-semantic-model.mjs` is the one command that asks the real files the same questions.
import { describe, it, expect } from 'vitest';
import { cosine } from './embed';
import { buildStaticModel, createStaticTransport, parseSafetensors, wordPieceOf, StaticModelError } from './static';

const GROUPS = [['pricing', 'price', 'cost', 'budget', 'fee'], ['meeting', 'standup', 'sync', 'call'], ['garden', 'hose', 'lawn']];
const model = (o: Partial<Parameters<typeof buildStaticModel>[0]> = {}) => buildStaticModel({ groups: GROUPS, dimension: 64, ...o });
const transport = (m = model()) => createStaticTransport({ name: 'potion-test', tokenizer: m.tokenizer, weights: m.weights });

describe('safetensors', () => {
  it('reads the header and the table: name, dtype, shape, data', () => {
    const m = model();
    const t = parseSafetensors(m.weights);
    expect(Object.keys(t)).toContain('embeddings');
    expect(t.embeddings.dtype).toBe('F32');
    expect(t.embeddings.shape).toEqual([m.vocab.length, 64]);
    expect(t.embeddings.data).toHaveLength(m.vocab.length * 64);
  });
  it('reads half precision too, within what half precision keeps', () => {
    const full = parseSafetensors(model().weights).embeddings.data;
    const half = parseSafetensors(model({ dtype: 'F16' }).weights).embeddings.data;
    expect(half).toHaveLength(full.length);
    let worst = 0;
    for (let i = 0; i < full.length; i++) worst = Math.max(worst, Math.abs(full[i] - half[i]));
    expect(worst).toBeLessThan(0.01);
  });
  it('says what is wrong with bytes it cannot read: cut off, no header, a dtype it does not know, a table that overruns', () => {
    const w = model().weights;
    expect(() => parseSafetensors(w.slice(0, w.length - 40))).toThrow(StaticModelError);
    expect(() => parseSafetensors(w.slice(0, w.length - 40))).toThrow(/cut off|ended/);
    expect(() => parseSafetensors(new Uint8Array(4))).toThrow(/header/);
    expect(() => parseSafetensors(new TextEncoder().encode('<!doctype html><title>403</title>'))).toThrow(/header|safetensors/);
    const bad = new TextEncoder().encode(JSON.stringify({ embeddings: { dtype: 'I8', shape: [1, 1], data_offsets: [0, 1] } }));
    const buf = new Uint8Array(8 + bad.length + 1);
    new DataView(buf.buffer).setBigUint64(0, BigInt(bad.length), true);
    buf.set(bad, 8);
    expect(() => parseSafetensors(buf)).toThrow(/I8/);
  });
});

describe('the tokenizer', () => {
  const tok = (vocab: string[]) => wordPieceOf({ model: { type: 'WordPiece', unk_token: '[UNK]', continuing_subword_prefix: '##', vocab: Object.fromEntries(vocab.map((v, i) => [v, i])) }, normalizer: { type: 'BertNormalizer', lowercase: true } });
  it('lowers, strips accents, splits on punctuation and pieces a word by its longest known start', () => {
    const t = tok(['[UNK]', 'price', '##s', 'cafe', ',', 'the']);
    expect(t('Prices')).toEqual([1, 2]);
    expect(t('Café, THE')).toEqual([3, 4, 5]);
    expect(t('zzz')).toEqual([0]);                      // a word no piece makes is the unknown token
    expect(t('')).toEqual([]);
  });
  it('refuses a tokenizer of another kind in words, never reads it as this one', () => {
    expect(() => wordPieceOf({ model: { type: 'Unigram', vocab: [] } })).toThrow(/WordPiece/);
    expect(() => wordPieceOf({})).toThrow(StaticModelError);
    expect(() => wordPieceOf('not json {')).toThrow(/tokenizer/);
  });
});

describe('the transport', () => {
  it('has a name and the table\'s dimension, answers one unit vector a text, deterministically', async () => {
    const t = transport();
    expect(t.name).toBe('potion-test');
    expect(t.dimension).toBe(64);
    const [a, b] = await t.embed(['Pricing for the review', 'pricing for the review']);
    expect(Math.hypot(...a)).toBeCloseTo(1, 4);
    expect([...a]).toEqual([...b]);
  });
  it('puts related words near and unrelated ones far — the mean of what each word is', async () => {
    const [q, cost, standup, hose] = await transport(model({ extra: ['review', 'the', 'plans', 'notes'] })).embed(['pricing review', 'the budget plans', 'standup notes', 'garden hose']);
    expect(cosine(q, cost)).toBeGreaterThan(0.45);
    expect(cosine(q, standup)).toBeLessThan(0.3);
    expect(cosine(q, hose)).toBeLessThan(0.3);
    expect(cosine(q, cost)).toBeGreaterThan(cosine(q, hose) + 0.2);
  });
  it('a word made of known pieces is near its stem', async () => {
    const [stem, plural] = await transport().embed(['price', 'prices']);
    expect(cosine(stem, plural)).toBeGreaterThan(0.8);
  });
  it('a text of no known word is no direction — a zero vector, never NaN', async () => {
    const [v, w] = await transport().embed(['qqqqzzzz', '']);
    expect(v.every((x) => x === 0)).toBe(true);
    expect(w.every((x) => x === 0)).toBe(true);
  });
  it('is the same bytes the same way: the writer is seeded', () => {
    expect([...model().weights]).toEqual([...model().weights]);
    expect([...model({ seed: 2 }).weights]).not.toEqual([...model().weights]);
  });
  it('refuses a table with a vector for a token that does not exist, or no table at all, in words', () => {
    const m = model();
    expect(() => createStaticTransport({ name: 'x', tokenizer: { ...m.tokenizer, model: { ...(m.tokenizer as { model: object }).model, vocab: { '[UNK]': 0 } } }, weights: m.weights })).toThrow(/vocabulary|rows/);
    const bare = new TextEncoder().encode('{}');
    const buf = new Uint8Array(8 + bare.length);
    new DataView(buf.buffer).setBigUint64(0, BigInt(bare.length), true);
    buf.set(bare, 8);
    expect(() => createStaticTransport({ name: 'x', tokenizer: m.tokenizer, weights: buf })).toThrow(/embeddings/);
  });
});

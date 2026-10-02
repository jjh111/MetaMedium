// A static-embedding model, read from its own two files (PLAN-IPAD-NOTES I9; §3's first candidate for the
// semantic seat: Model2Vec's `potion` family, 8–32 MB, no GPU). Such a model is not a network at run time: it is
// a tokenizer and one table of vectors, one row a token. A text is cut into tokens, each token's row is looked
// up, the rows are averaged and the mean scaled to length 1 — a few microseconds a sentence, in plain code.
//
//   parseSafetensors — the weights file: an 8-byte length, a JSON header naming each tensor's dtype, shape and
//     place, then the bytes. F32, F16 and BF16 are read; anything else is said, never guessed at.
//   wordPieceOf     — the tokenizer.json's WordPiece model with the Bert normaliser and pre-tokeniser: lower
//     case, accents off, split on space and punctuation, each word by its longest known start (`##` for the
//     rest), the unknown token for a word no pieces make.
//   createStaticTransport — the two together as an `EmbedTransport`.
//   buildStaticModel — the same format WRITTEN, for tests and for the gate's stub server: a small model of a
//     few word groups whose related words are near. It is the reader's witness; it says nothing about any real
//     model's quality.
//
// PURE CODE OVER BYTES. Nothing here fetches: the surface loads the two files (behind the seat's own control,
// lazily) and hands them in. What is UNVERIFIED is the real files: this container could not reach them (the
// proxy answers 403), so the reading of `potion-base-8M` as laid out here — a single `embeddings` tensor of
// F32, a Bert WordPiece tokenizer, the mean of the rows with unknown tokens left out, then unit length — is
// the author's reading of the format, proved against a built model and by `scripts/check-semantic-model.mjs`
// the day the files can be had. A model this reader cannot read is refused in words; it never reads wrongly
// quietly (a vocabulary `mapping` is refused, a `weights` vector is applied).
import { unit, type EmbedTransport } from './embed';

/** What was wrong with a model's files, in words a person can be told. */
export class StaticModelError extends Error {
  constructor(message: string) { super(message); this.name = 'StaticModelError'; }
}

// ---- safetensors ----

export interface Tensor { dtype: string; shape: number[]; data: Float32Array }
interface TensorInfo { dtype: string; shape: number[]; data_offsets: [number, number] }

/** The most a header may claim: a real one is a few hundred bytes; a page of HTML read as a length is not one. */
const MAX_HEADER = 16 * 1024 * 1024;

const ascii = (b: Uint8Array, n: number) => Array.from(b.subarray(0, n)).map((c) => (c >= 32 && c < 127 ? String.fromCharCode(c) : '·')).join('');

function header(bytes: Uint8Array): { info: Record<string, TensorInfo>; start: number } {
  if (bytes.length < 8) throw new StaticModelError(`the safetensors header is missing — the file is only ${bytes.length} bytes`);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const n = Number(dv.getBigUint64(0, true));
  if (!Number.isFinite(n) || n < 2 || n > MAX_HEADER || 8 + n > bytes.length) {
    throw new StaticModelError(`the safetensors header does not read — the file's first bytes say “${ascii(bytes, 12)}”, which is not a safetensors file (a page from the host, perhaps)`);
  }
  let parsed: unknown;
  try { parsed = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + n))); } catch { throw new StaticModelError('the safetensors header is not JSON — this is not a safetensors file'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new StaticModelError('the safetensors header is not an object of tensors');
  const info: Record<string, TensorInfo> = {};
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (k === '__metadata__') continue;
    const t = v as Partial<TensorInfo> | null;
    if (!t || typeof t.dtype !== 'string' || !Array.isArray(t.shape) || !Array.isArray(t.data_offsets) || t.data_offsets.length !== 2) throw new StaticModelError(`the tensor “${k}” has no dtype, shape and place in the safetensors header`);
    info[k] = { dtype: t.dtype, shape: t.shape.map(Number), data_offsets: [Number(t.data_offsets[0]), Number(t.data_offsets[1])] };
  }
  return { info, start: 8 + n };
}

/** The names the header holds, with their dtypes and shapes — without reading any bytes of the table. */
export function safetensorsNames(bytes: Uint8Array): Record<string, { dtype: string; shape: number[] }> {
  const { info } = header(bytes);
  return Object.fromEntries(Object.entries(info).map(([k, t]) => [k, { dtype: t.dtype, shape: t.shape }]));
}

const BYTES: Record<string, number> = { F32: 4, F16: 2, BF16: 2 };

function half(h: number): number {
  const s = h & 0x8000 ? -1 : 1, e = (h >> 10) & 0x1f, f = h & 0x3ff;
  if (e === 0) return s * f * 2 ** -24;
  if (e === 31) return f ? NaN : s * Infinity;
  return s * (1 + f / 1024) * 2 ** (e - 15);
}

/**
 * The tensors of a safetensors file, decoded to F32. `wanted` names the ones to read (the others are not touched, so a
 * file's integer tables never stop a read of its embeddings); with none named every tensor must be readable.
 */
export function parseSafetensors(bytes: Uint8Array, wanted?: readonly string[]): Record<string, Tensor> {
  const { info, start } = header(bytes);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out: Record<string, Tensor> = {};
  for (const [name, t] of Object.entries(info)) {
    if (wanted && !wanted.includes(name)) continue;
    const width = BYTES[t.dtype];
    if (!width) throw new StaticModelError(`the tensor “${name}” is dtype ${t.dtype}, which this reader does not take (F32, F16 and BF16 are read)`);
    const [from, to] = t.data_offsets;
    const count = t.shape.reduce((a, b) => a * b, 1);
    if (!(from >= 0 && to >= from) || to - from !== count * width) throw new StaticModelError(`the tensor “${name}” says ${count} values of ${t.dtype} at bytes ${from}–${to}, which do not fit`);
    if (start + to > bytes.length) throw new StaticModelError(`the weights end before the table does — the file is cut off (the table of “${name}” ends at byte ${start + to}, the file at ${bytes.length})`);
    const data = new Float32Array(count);
    const at = start + from;
    if (t.dtype === 'F32') for (let i = 0; i < count; i++) data[i] = dv.getFloat32(at + i * 4, true);
    else if (t.dtype === 'F16') for (let i = 0; i < count; i++) data[i] = half(dv.getUint16(at + i * 2, true));
    else for (let i = 0; i < count; i++) data[i] = bf16(dv.getUint16(at + i * 2, true));
    out[name] = { dtype: t.dtype, shape: t.shape, data };
  }
  return out;
}

const bf = new DataView(new ArrayBuffer(4));
function bf16(h: number): number { bf.setUint32(0, h << 16); return bf.getFloat32(0); }

// ---- the tokenizer ----

export type WordPiece = ((text: string) => number[]) & { unkId: number; size: number };

interface TokenizerFile {
  normalizer?: { type?: string; lowercase?: boolean; strip_accents?: boolean | null; normalizers?: TokenizerFile['normalizer'][] } | null;
  model?: { type?: string; vocab?: Record<string, number>; unk_token?: string; continuing_subword_prefix?: string; max_input_chars_per_word?: number };
}

const isPunct = (cp: number, ch: string) => (cp >= 33 && cp <= 47) || (cp >= 58 && cp <= 64) || (cp >= 91 && cp <= 96) || (cp >= 123 && cp <= 126) || /\p{P}/u.test(ch);
const isCjk = (cp: number) => (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf) || (cp >= 0x20000 && cp <= 0x2a6df) || (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0x2f800 && cp <= 0x2fa1f);

/** Which of the Bert normaliser's steps a tokenizer file asks for: lower case, and accents off. */
function normaliserOf(n: TokenizerFile['normalizer']): { lower: boolean; strip: boolean } {
  let lower = false, strip = false;
  const walk = (x: TokenizerFile['normalizer']) => {
    if (!x) return;
    if (x.type === 'BertNormalizer') { lower = lower || x.lowercase !== false; strip = strip || (x.strip_accents ?? x.lowercase !== false) === true; }
    else if (x.type === 'Lowercase') lower = true;
    else if (x.type === 'StripAccents') strip = true;
    else if (Array.isArray(x.normalizers)) x.normalizers.forEach(walk);
  };
  walk(n);
  return { lower, strip };
}

/**
 * The WordPiece tokenizer a tokenizer.json describes — its text or its parsed object. Refuses, in words, a
 * file that is no tokenizer or a model of another kind (a Unigram or BPE tokenizer is not read as this one).
 */
export function wordPieceOf(file: unknown): WordPiece {
  let json: TokenizerFile;
  if (typeof file === 'string') {
    try { json = JSON.parse(file) as TokenizerFile; } catch { throw new StaticModelError('the tokenizer is not JSON — tokenizer.json did not come back as a tokenizer'); }
  } else json = file as TokenizerFile;
  const model = json && typeof json === 'object' ? json.model : undefined;
  if (!model || typeof model !== 'object') throw new StaticModelError('the tokenizer has no model — this is not a tokenizer.json');
  if (model.type !== 'WordPiece') throw new StaticModelError(`the tokenizer is ${model.type || 'of no kind'}, and only WordPiece is read here`);
  if (!model.vocab || typeof model.vocab !== 'object') throw new StaticModelError('the tokenizer names no vocabulary');
  const vocab = new Map<string, number>(Object.entries(model.vocab));
  const unkToken = model.unk_token ?? '[UNK]';
  const prefix = model.continuing_subword_prefix ?? '##';
  const maxWord = model.max_input_chars_per_word ?? 100;
  const unkId = vocab.has(unkToken) ? vocab.get(unkToken)! : -1;
  const { lower, strip } = normaliserOf(json.normalizer);

  const normalise = (text: string): string => {
    let s = text.normalize('NFC');
    // Control characters are space; the Bert normaliser drops what is not text at all.
    s = s.replace(/[\u0000�]/g, '').replace(/[\u0009\u000a\u000d ]/g, ' ');
    if (lower) s = s.toLowerCase();
    if (strip) s = s.normalize('NFD').replace(/\p{M}/gu, '');
    return s;
  };
  /** Words and punctuation, in order: space splits, each punctuation mark and each CJK character stands alone. */
  const words = (s: string): string[] => {
    const out: string[] = [];
    let cur = '';
    const flush = () => { if (cur) { out.push(cur); cur = ''; } };
    for (const ch of s) {
      const cp = ch.codePointAt(0)!;
      if (/\s/u.test(ch)) flush();
      else if (isPunct(cp, ch) || isCjk(cp)) { flush(); out.push(ch); }
      else cur += ch;
    }
    flush();
    return out;
  };
  const piecesOf = (word: string): number[] => {
    const cps = Array.from(word);
    if (cps.length > maxWord) return unkId >= 0 ? [unkId] : [];
    const ids: number[] = [];
    let at = 0;
    while (at < cps.length) {
      let end = cps.length, found = -1;
      while (end > at) {
        const piece = (at > 0 ? prefix : '') + cps.slice(at, end).join('');
        const id = vocab.get(piece);
        if (id !== undefined) { found = id; break; }
        end--;
      }
      if (found < 0) return unkId >= 0 ? [unkId] : [];
      ids.push(found);
      at = end;
    }
    return ids;
  };
  const fn = ((text: string): number[] => {
    const out: number[] = [];
    for (const w of words(normalise(typeof text === 'string' ? text : ''))) out.push(...piecesOf(w));
    return out;
  }) as WordPiece;
  fn.unkId = unkId;
  fn.size = vocab.size;
  return fn;
}

// ---- the transport ----

/** Tokens a text is cut to: the longer is not read (a model's own bound for a sentence). */
export const MAX_TOKENS = 512;

export interface StaticModelFiles {
  /** What the seat is called: the model, in words (`potion-base-8M`). */
  name: string;
  /** tokenizer.json, as text or parsed. */
  tokenizer: unknown;
  /** model.safetensors, whole. */
  weights: Uint8Array;
}

/**
 * The model as an `EmbedTransport`: a text is its tokens' rows, unknown tokens left out, averaged and scaled to
 * length 1; a text of no known token is the zero vector — no direction, never NaN. Refuses in words what it
 * cannot read: no `embeddings` table, a vocabulary that is not the table's, a vocabulary `mapping`.
 */
export function createStaticTransport(files: StaticModelFiles): EmbedTransport {
  const tokenize = wordPieceOf(files.tokenizer);
  const names = safetensorsNames(files.weights);
  if (names.mapping) throw new StaticModelError('this model keeps a vocabulary mapping (a quantised vocabulary), which this reader does not read');
  const tensors = parseSafetensors(files.weights, ['embeddings', 'weights']);
  const table = tensors.embeddings;
  if (!table) throw new StaticModelError(`the weights hold no embeddings table (they hold: ${Object.keys(names).join(', ') || 'nothing'})`);
  if (table.shape.length !== 2) throw new StaticModelError(`the embeddings table is ${table.shape.length}-dimensional, and a table of vectors is two`);
  const [rows, dim] = table.shape;
  if (rows !== tokenize.size) throw new StaticModelError(`the tokenizer's vocabulary names ${tokenize.size} tokens and the table holds ${rows} rows — they are not one model's`);
  const data = table.data;
  const scale = tensors.weights && tensors.weights.data.length === rows ? tensors.weights.data : null;
  return {
    name: files.name,
    dimension: dim,
    async embed(texts, opts) {
      if (opts?.signal?.aborted) throw new Error('cancelled');
      return texts.map((text) => {
        const sum = new Float32Array(dim);
        let n = 0;
        const ids = tokenize(text);
        for (let i = 0; i < ids.length && n < MAX_TOKENS; i++) {
          const id = ids[i];
          if (id === tokenize.unkId || id < 0 || id >= rows) continue;
          const k = scale ? scale[id] : 1;
          const at = id * dim;
          for (let d = 0; d < dim; d++) sum[d] += data[at + d] * k;
          n++;
        }
        if (!n) return sum;
        for (let d = 0; d < dim; d++) sum[d] /= n;
        return unit(sum);
      });
    },
  };
}

// ---- the writer: a model for tests and the gate's stub ----

export interface BuildOptions {
  /** Words that mean one thing: each group's words are near each other. */
  groups: readonly (readonly string[])[];
  /** Words that stand alone and light (function words, neutral words): present in the vocabulary, near nothing. */
  extra?: readonly string[];
  dimension?: number;
  seed?: number;
  dtype?: 'F32' | 'F16';
}

const mulberry32 = (a: number) => () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const fnv = (w: string): number => { let h = 0x811c9dc5; for (let i = 0; i < w.length; i++) { h ^= w.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

function toHalf(x: number): number {
  const f = new Float32Array([x]), u = new Uint32Array(f.buffer)[0];
  const sign = (u >>> 16) & 0x8000;
  const e = ((u >>> 23) & 0xff) - 127 + 15;
  const m = u & 0x7fffff;
  if (e <= 0) return e < -10 ? sign : sign | ((m | 0x800000) >> (1 - e + 13));
  if (e >= 31) return sign | 0x7c00;
  return sign | (e << 10) | (m >> 13);
}

/**
 * A small static-embedding model in the format `createStaticTransport` reads: a WordPiece tokenizer.json and a
 * safetensors table. Each group is a direction and its words stand near it (a word is the direction plus a
 * little of its own); `extra` words and the continuation piece `##s` are light vectors of their own. Seeded, so
 * the same bytes every time.
 */
export function buildStaticModel(o: BuildOptions): { tokenizer: object; weights: Uint8Array; vocab: string[] } {
  const dim = o.dimension ?? 64;
  const dtype = o.dtype ?? 'F32';
  const seed = o.seed ?? 1;
  const vocab: string[] = ['[UNK]'];
  const rows: number[][] = [];
  const row = (rand: () => number, base: number[] | null, own: number): number[] => {
    const own_ = Array.from({ length: dim }, () => gauss(rand));
    const n = Math.hypot(...own_) || 1;
    return own_.map((x, d) => (base ? base[d] : 0) + (own * x) / n);
  };
  rows.push(new Array(dim).fill(0)); // [UNK]
  const seen = new Set<string>(['[UNK]']);
  const add = (w: string, vec: number[]) => { if (!seen.has(w)) { seen.add(w); vocab.push(w); rows.push(vec); } };
  o.groups.forEach((g, gi) => {
    const rand = mulberry32(seed * 7919 + gi * 104729);
    const base = row(rand, null, 1);
    for (const w of g) add(w.toLowerCase(), row(mulberry32((seed * 31 + gi * 977 + fnv(w)) | 0), base, 0.3));
  });
  (o.extra ?? []).forEach((w, i) => add(w.toLowerCase(), row(mulberry32((seed * 131 + fnv(w) + i) | 0), null, 0.2)));
  add('##s', row(mulberry32(seed * 17), null, 0.05));
  const count = rows.length * dim;
  const width = dtype === 'F16' ? 2 : 4;
  const head = JSON.stringify({ embeddings: { dtype, shape: [rows.length, dim], data_offsets: [0, count * width] }, __metadata__: { format: 'pt' } });
  const pad = (8 - (head.length % 8)) % 8;
  const headBytes = new TextEncoder().encode(head + ' '.repeat(pad));
  const bytes = new Uint8Array(8 + headBytes.length + count * width);
  const dv = new DataView(bytes.buffer);
  dv.setBigUint64(0, BigInt(headBytes.length), true);
  bytes.set(headBytes, 8);
  let at = 8 + headBytes.length;
  for (const r of rows) for (const x of r) { if (dtype === 'F16') { dv.setUint16(at, toHalf(x), true); at += 2; } else { dv.setFloat32(at, x, true); at += 4; } }
  const tokenizer = {
    version: '1.0',
    normalizer: { type: 'BertNormalizer', clean_text: true, handle_chinese_chars: true, strip_accents: null, lowercase: true },
    pre_tokenizer: { type: 'BertPreTokenizer' },
    model: { type: 'WordPiece', unk_token: '[UNK]', continuing_subword_prefix: '##', max_input_chars_per_word: 100, vocab: Object.fromEntries(vocab.map((w, i) => [w, i])) },
  };
  return { tokenizer, weights: bytes, vocab };
}

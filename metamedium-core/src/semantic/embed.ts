// The semantic seat's seam (PLAN-IPAD-NOTES I9): texts in, vectors out, behind an injected transport.
//
// A SEAT, NOT A DEPENDENCY — the rule `participants/decide.ts` set for the decision seat, kept here. The
// transport is handed in, so the seat may be a static-embedding table read from files (`static.ts`), a
// quantised transformer on WebGPU, or a hand with a lookup in front of them, and nothing in this folder can
// tell which. Nothing here names a vendor, opens a socket or reads a file; a real transport is the surface's
// to load, lazily, behind the seat's own control. With nobody in the seat Find is as it was.
//
// A vector is a direction, never a claim: cosine says how near two sayings are in whatever space the model
// keeps, and what the canvas does with it is propose (Find lets an entry in; *notes like this* lists), never
// commit. The numbers are the model's; the reasons said beside them are the engine's own arithmetic.
import { tokenize } from '../search/tokens';

export interface EmbedOptions { signal?: AbortSignal }

/**
 * Texts in, one vector each out (the same order). A batch is one call, because a transport that can only do one
 * at a time can still implement it, and one built a text at a time cannot be batched later without changing
 * every caller. `name` says which model it is (a cache is a transport's own); `dimension` is the length of every
 * vector it returns, which the caller checks.
 */
export interface EmbedTransport {
  readonly name: string;
  readonly dimension: number;
  embed(texts: readonly string[], opts?: EmbedOptions): Promise<Float32Array[]>;
}

/** What a transport did wrong, in words a person can be told: the wrong number of vectors, the wrong size. */
export class EmbedError extends Error {
  constructor(message: string) { super(message); this.name = 'EmbedError'; }
}

/** Cosine of two vectors: 1 the same direction, 0 nothing shared, -1 opposite. 0 — never NaN — for a vector with no direction or two of different sizes. */
export function cosine(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (a.length !== b.length || !a.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (!na || !nb) return 0;
  return dot / Math.sqrt(na * nb);
}

/** A vector scaled to length 1; one with no length stays zero. */
export function unit(v: ArrayLike<number>): Float32Array {
  const out = new Float32Array(v.length);
  let n = 0;
  for (let i = 0; i < v.length; i++) n += v[i] * v[i];
  if (!n) return out;
  const k = 1 / Math.sqrt(n);
  for (let i = 0; i < v.length; i++) out[i] = v[i] * k;
  return out;
}

// ---- the cache: by text, a transport's own ----

/** Vectors held by (transport, text): what was embedded once is never embedded again while the page lives. Never in a log. */
export interface EmbedCache {
  get(transport: string, text: string): Float32Array | undefined;
  set(transport: string, text: string, v: Float32Array): void;
  readonly size: number;
}

/** A cache that lets the oldest go past `max` texts (a board is a place to look, not a corpus). */
export function createEmbedCache(max = 20000): EmbedCache {
  const m = new Map<string, Float32Array>();
  const key = (t: string, x: string) => t + '\u0000' + x;
  return {
    get: (t, x) => m.get(key(t, x)),
    set(t, x, v) {
      const k = key(t, x);
      m.delete(k);
      m.set(k, v);
      while (m.size > max) m.delete(m.keys().next().value as string);
    },
    get size() { return m.size; },
  };
}

/** Most texts one call to a transport carries. */
export const EMBED_BATCH = 128;

/**
 * Every text's vector, from the cache or asked of the transport — the texts the cache lacks, each once, in
 * batches. What a transport answers is checked before it is kept: as many vectors as texts, each of its own
 * dimension, or the call fails in words and holds nothing of that batch. A cancel rejects as `cancelled`.
 */
export async function embedAll(
  transport: EmbedTransport,
  texts: readonly string[],
  cache: EmbedCache,
  opts: EmbedOptions & { batch?: number } = {},
): Promise<Map<string, Float32Array>> {
  const out = new Map<string, Float32Array>();
  const need: string[] = [];
  for (const t of texts) {
    if (out.has(t)) continue;
    const held = cache.get(transport.name, t);
    if (held) out.set(t, held);
    else if (!need.includes(t)) need.push(t);
  }
  const size = Math.max(1, opts.batch ?? EMBED_BATCH);
  for (let i = 0; i < need.length; i += size) {
    if (opts.signal?.aborted) throw new Error('cancelled');
    const part = need.slice(i, i + size);
    const got = await transport.embed(part, opts.signal ? { signal: opts.signal } : undefined);
    if (!Array.isArray(got) || got.length !== part.length) {
      throw new EmbedError(`${transport.name} answered ${Array.isArray(got) ? got.length : 'no'} vectors for ${part.length} texts`);
    }
    const vecs = got.map((v) => (v instanceof Float32Array ? v : Float32Array.from(v as ArrayLike<number>)));
    for (const v of vecs) {
      if (v.length !== transport.dimension) throw new EmbedError(`${transport.name} promised a dimension of ${transport.dimension} and answered a vector of ${v.length}`);
    }
    part.forEach((t, j) => { cache.set(transport.name, t, vecs[j]); out.set(t, vecs[j]); });
  }
  return out;
}

// ---- the stand-in: a test's transport, never a model ----

const fnv = (s: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
};

export interface StubEmbedOptions {
  /** Words that mean one thing: each group's words land in one place, so they score high with no letter in common. */
  groups?: readonly (readonly string[])[];
  dimension?: number;
  name?: string;
}

/**
 * A deterministic stand-in: each word is hashed into one of `dimension` places (all the words of a group into
 * the SAME place), a text is the count of its words, and the vector is unit length. Related words — the groups
 * the test names — are near; the rest are not. It measures nothing about any real model: it exists so the seam
 * (the scorer, the cache, *notes like this*, the pane) can be tested and driven where no model can be had.
 */
export function createStubEmbedTransport(opts: StubEmbedOptions = {}): EmbedTransport {
  const dimension = opts.dimension ?? 256;
  const where = new Map<string, string>();
  (opts.groups ?? []).forEach((g, i) => g.forEach((w) => where.set(tokenize(w).map((t) => t.text).join(''), 'g:' + i)));
  const placeOf = (w: string): string => {
    if (where.has(w)) return where.get(w)!;
    // A plural is its singular's.
    if (w.length > 3 && w.endsWith('s') && where.has(w.slice(0, -1))) return where.get(w.slice(0, -1))!;
    return 'w:' + w;
  };
  return {
    name: opts.name ?? 'stub-embed',
    dimension,
    async embed(texts) {
      return texts.map((text) => {
        const v = new Float32Array(dimension);
        for (const t of tokenize(text)) v[fnv(placeOf(t.text)) % dimension] += 1;
        return unit(v);
      });
    },
  };
}

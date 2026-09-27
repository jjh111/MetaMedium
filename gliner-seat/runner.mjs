// runner.mjs — one GLiNER2 graph, a tokenizer and the processor, joined.
//
// Isomorphic: the ONNX Runtime module is passed in, so the same code runs on
// onnxruntime-node (a local process beside the relay) and onnxruntime-web
// (WebGPU or wasm in the page). Nothing here reads a file or opens a socket;
// the loaders do that (node-runner.mjs, bench/web.mjs).

import { buildPrompt, chunkText, decodeEntities, finalize, mergeSpans, DEFAULT_THRESHOLD } from './processor.mjs';

const clock = () => (globalThis.performance ?? Date).now();

/**
 * @param {{
 *   ort: any,                      // onnxruntime-node or onnxruntime-web
 *   session: any,                  // an InferenceSession over the one graph
 *   tokenizer: { encode(text: string, o?: object): { ids: number[] } },
 *   name?: string,                 // what this runner says it is, e.g. "gliner2-multi-v1 fp16 · cpu"
 * }} a
 */
export function createRunner({ ort, session, tokenizer, name = 'gliner2' }) {
  // The schema half of the prompt is the same on every call with the same
  // labels; tokenizing it once is the library's own optimisation too.
  const cache = new Map();
  const tokenize = (piece) => {
    let ids = cache.get(piece);
    if (!ids) {
      ids = tokenizer.encode(piece, { add_special_tokens: false }).ids;
      if (cache.size > 20000) cache.clear();
      cache.set(piece, ids);
    }
    return ids;
  };

  const int64 = (values) => {
    const out = new BigInt64Array(values.length);
    for (let i = 0; i < values.length; i++) out[i] = BigInt(values[i]);
    return out;
  };

  /** Run the graph on one piece of text. Offsets are into that piece. */
  async function runPiece(text, labels, floor, threshold) {
    const t0 = clock();
    const p = buildPrompt(tokenize, text, labels);
    if (!p.words.length) return { count: 0, candidates: [], tokens: 0, ms: { prep: 0, run: 0, decode: 0 } };
    const n = p.ids.length;
    const feeds = {
      input_ids: new ort.Tensor('int64', int64(p.ids), [1, n]),
      attention_mask: new ort.Tensor('int64', new BigInt64Array(n).fill(1n), [1, n]),
      word_positions: new ort.Tensor('int64', int64(p.wordPositions), [1, p.wordPositions.length]),
      schema_positions: new ort.Tensor('int64', int64(p.schemaPositions), [1, p.schemaPositions.length]),
    };
    const t1 = clock();
    const out = await session.run(feeds);
    const t2 = clock();
    const dims = out.span_logits.dims; // [1, L, T, W]
    if (dims[1] !== labels.length || dims[2] !== p.words.length) {
      throw new Error(`span_logits ${dims.join('×')} does not match ${labels.length} labels × ${p.words.length} words`);
    }
    const decoded = decodeEntities({
      text,
      words: p.words,
      labels,
      countLogits: out.count_logits.data,
      spanLogits: out.span_logits.data,
      threshold,
      floor,
    });
    const t3 = clock();
    return {
      count: decoded.count,
      candidates: decoded.candidates,
      tokens: n,
      ms: { prep: t1 - t0, run: t2 - t1, decode: t3 - t2 },
    };
  }

  /**
   * Typed spans out of one text.
   *
   * @param {string} text
   * @param {{ name: string, description?: string }[]} labels
   * @param {{ threshold?: number, floor?: number, maxWords?: number }} [opts]
   *   `floor` keeps weaker candidates too (for choosing a threshold on fixtures);
   *   the spans returned are always those at or above `threshold`.
   */
  async function extract(text, labels, opts = {}) {
    const threshold = opts.threshold ?? DEFAULT_THRESHOLD;
    const floor = Math.min(opts.floor ?? threshold, threshold);
    const started = clock();
    const pieces = chunkText(text, { maxWords: opts.maxWords ?? 200 });
    const raw = [];
    const ms = { prep: 0, run: 0, decode: 0 };
    let tokens = 0;
    const counts = [];
    for (const piece of pieces) {
      const r = await runPiece(text.slice(piece.start, piece.end), labels, floor, threshold);
      for (const s of r.candidates) raw.push({ ...s, start: s.start + piece.start, end: s.end + piece.start });
      ms.prep += r.ms.prep;
      ms.run += r.ms.run;
      ms.decode += r.ms.decode;
      tokens += r.tokens;
      counts.push(r.count);
    }
    const merged = mergeSpans(raw);
    return {
      spans: finalize(merged, threshold),
      candidates: merged,
      pieces: pieces.length,
      counts,
      tokens,
      ms: { ...ms, total: clock() - started },
      via: name,
    };
  }

  return { name, extract, tokenize };
}

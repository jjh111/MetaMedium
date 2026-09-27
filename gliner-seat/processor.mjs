// processor.mjs — GLiNER2's prompt and its span decoder, in JavaScript.
//
// The ONNX export this experiment runs (onnx-community/gliner2-multi-v1-agent-ONNX)
// is ONE graph: an encoder, the span head and the classifier head. It does not
// carry the processor — the part that turns a text and a list of labels into the
// token ids, word positions and marker positions the graph gathers from, and the
// part that turns its span logits back into character spans. This file is that
// processor, ported from the Python `gliner2` 2.0.0 package (Apache-2.0):
//
//   processing/word_splitter.py   WhitespaceTokenSplitter   → splitWords
//   processor.py                  _transform_schema,        → entitySchema
//                                 _format_input_with_mapping → buildPrompt
//   inference/runtime.py          _extract_entities,        → decodeEntities
//                                 _find_spans
//   inference/candidate_decoder   finalize_spans            → finalize
//
// It is checked token for token against the Python library's own recorded calls
// (`node verify.mjs`, against the export's conversion/reference.json).
//
// Pure functions only: no model, no file, no network, no DOM. It runs the same
// in Node and in a browser, and every function here is tested with no model
// present (processor.test.mjs).

/** Spans of 1…8 words — the width the checkpoint was trained with (config max_width). */
export const MAX_WIDTH = 8;

/** The library's default: a span is kept when its sigmoid reaches this. */
export const DEFAULT_THRESHOLD = 0.5;

export const TOKENS = Object.freeze({
  SEP_STRUCT: '[SEP_STRUCT]',
  SEP_TEXT: '[SEP_TEXT]',
  P: '[P]',
  E: '[E]',
  DESCRIPTION: '[DESCRIPTION]',
});

// The library's WhitespaceTokenSplitter, alternative for alternative. Python's
// `\w` is Unicode-aware (letters and numerics of any script), so it is spelled
// out here as [\p{L}\p{N}_]: with a bare `\w`, JavaScript would split "①" and
// "é" where Python keeps them whole, and the word positions would drift.
const WORD =
  /(?:https?:\/\/[^\s]+|www\.[^\s]+)|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|@[a-z0-9_]+|[\p{L}\p{N}_]+(?:[-_][\p{L}\p{N}_]+)*|\S/giu;

/**
 * Split text into the words GLiNER2 reads, with offsets into the ORIGINAL text.
 * The token is lower-cased; the text is never mutated first (case folding can
 * change a string's length and would corrupt every offset after it).
 *
 * Offsets are UTF-16 code units, as JavaScript strings index — which is what a
 * canvas holding the same string wants. Python's are code points; the two agree
 * on any text without characters outside the Basic Multilingual Plane.
 *
 * @param {string} text
 * @returns {{ token: string, start: number, end: number }[]}
 */
export function splitWords(text) {
  const out = [];
  for (const m of text.matchAll(WORD)) {
    out.push({ token: m[0].toLowerCase(), start: m.index, end: m.index + m[0].length });
  }
  return out;
}

/**
 * @typedef {{ name: string, description?: string }} Label
 */

/**
 * The schema half of the prompt for an entity task, exactly as the library
 * builds it: `( [P] entities [DESCRIPTION] a: … ( [E] a [E] b … ) )`.
 * A label with a description adds it to the prompt; one without adds nothing.
 *
 * @param {Label[]} labels
 * @returns {string[]}
 */
export function entitySchema(labels) {
  let prompt = 'entities';
  for (const l of labels) {
    if (l.description) prompt += ` ${TOKENS.DESCRIPTION} ${l.name}: ${l.description}`;
  }
  const tokens = ['(', TOKENS.P, prompt, '('];
  for (const l of labels) tokens.push(TOKENS.E, l.name);
  tokens.push(')', ')');
  return tokens;
}

/**
 * Build the graph's four inputs for one text and one entity task.
 *
 * `tokenize` turns one piece of the prompt into sub-token ids WITHOUT special
 * tokens — the library tokenizes each piece on its own (`tokenizer.tokenize`)
 * and never adds [CLS] or [SEP], so neither does this.
 *
 * @param {(piece: string) => number[]} tokenize
 * @param {string} text
 * @param {Label[]} labels
 * @param {{ maxWords?: number }} [opts]
 */
export function buildPrompt(tokenize, text, labels, opts = {}) {
  let words = splitWords(text);
  if (opts.maxWords !== undefined) words = words.slice(0, opts.maxWords);
  const schema = entitySchema(labels);
  const combined = [...schema, TOKENS.SEP_TEXT, ...words.map((w) => w.token)];

  // The routed marker slots: [P] at 1, then each [E] at 4, 6, … (len − 4).
  // Prompt text may itself tokenize to special ids; only these slots count.
  const markers = new Set([1]);
  for (let i = 4; i < schema.length - 2; i += 2) markers.add(i);
  const textFrom = schema.length + 1; // the first word, after [SEP_TEXT]

  const ids = [];
  const wordPositions = [];
  const schemaPositions = [];
  combined.forEach((piece, i) => {
    const at = ids.length;
    // A word that tokenizes to nothing still keeps its row (the library warns
    // and keeps a placeholder at the current boundary): one position per word.
    if (i >= textFrom) wordPositions.push(at);
    else if (markers.has(i)) schemaPositions.push(at);
    for (const id of tokenize(piece)) ids.push(id);
  });
  // A trailing word with no sub-tokens would point one past the end.
  for (let k = 0; k < wordPositions.length; k++) {
    if (wordPositions[k] >= ids.length) wordPositions[k] = ids.length - 1;
  }
  return { ids, wordPositions, schemaPositions, words, schema };
}

const sigmoid = (x) => 1 / (1 + Math.exp(-x));

function argmax(values) {
  let best = 0;
  for (let i = 1; i < values.length; i++) if (values[i] > values[best]) best = i;
  return best;
}

/**
 * @typedef {{ label: string, text: string, start: number, end: number, score: number }} Span
 */

/**
 * Every span whose score reaches `floor`, per label, before any overlap is
 * resolved — the raw material a threshold is chosen on. Scores are the
 * sigmoid of instance 0's span logits, as the library reads them.
 *
 * @param {{
 *   text: string,
 *   words: { start: number, end: number }[],
 *   labels: Label[],
 *   spanLogits: ArrayLike<number>,   // [1, labels, words, MAX_WIDTH], row-major
 *   width?: number,
 *   floor?: number,
 * }} a
 * @returns {Span[]}
 */
export function candidates({ text, words, labels, spanLogits, width = MAX_WIDTH, floor = DEFAULT_THRESHOLD }) {
  const T = words.length;
  const out = [];
  for (let li = 0; li < labels.length; li++) {
    // Start-major, width-minor: the order torch.where yields them in, which is
    // the order ties keep under a stable sort.
    for (let s = 0; s < T; s++) {
      for (let w = 0; w < width; w++) {
        const e = s + w + 1;
        if (e > T) continue;
        const score = sigmoid(spanLogits[(li * T + s) * width + w]);
        if (score < floor) continue;
        const start = words[s].start;
        const end = words[e - 1].end;
        const surface = text.slice(start, end).trim();
        if (!surface) continue;
        out.push({ label: labels[li].name, text: surface, start, end, score });
      }
    }
  }
  return out;
}

/**
 * The library's default decode: per label, keep spans greedily by score and
 * drop any that overlaps one already kept. Overlap is judged WITHIN a label —
 * the same words may be offered under two labels, which is a disagreement the
 * seat reports rather than settles.
 *
 * @param {Span[]} spans
 * @param {number} [threshold]
 * @returns {Span[]}
 */
export function finalize(spans, threshold = DEFAULT_THRESHOLD) {
  const byLabel = new Map();
  for (const s of spans) {
    if (s.score < threshold) continue;
    if (!byLabel.has(s.label)) byLabel.set(s.label, []);
    byLabel.get(s.label).push(s);
  }
  const out = [];
  for (const list of byLabel.values()) {
    const ranked = [...list].sort((a, b) => b.score - a.score); // stable
    const kept = [];
    for (const c of ranked) {
      if (kept.some((k) => c.start < k.end && k.start < c.end)) continue;
      kept.push(c);
    }
    out.push(...kept);
  }
  return out;
}

/**
 * Decode one call: the count head gates everything (an argmax of 0 means the
 * model says there is nothing of these kinds here), then the spans above the
 * threshold, overlap resolved per label.
 *
 * @param {{
 *   text: string,
 *   words: { start: number, end: number }[],
 *   labels: Label[],
 *   countLogits: ArrayLike<number>,
 *   spanLogits: ArrayLike<number>,
 *   threshold?: number,
 *   floor?: number,
 * }} a
 * @returns {{ count: number, spans: Span[], candidates: Span[] }}
 */
export function decodeEntities({ text, words, labels, countLogits, spanLogits, threshold = DEFAULT_THRESHOLD, floor }) {
  const count = argmax(countLogits);
  if (count <= 0) return { count, spans: [], candidates: [] };
  const raw = candidates({ text, words, labels, spanLogits, floor: floor ?? threshold });
  return { count, spans: finalize(raw, threshold), candidates: raw };
}

/**
 * Split a long text into pieces the encoder can hold, at line breaks first.
 *
 * mDeBERTa was trained on 512 positions and the schema prompt takes a hundred
 * or more of them, so a long text is read in pieces. Lines are packed whole
 * until the next would pass `maxWords`; a single line longer than that is cut
 * into windows that overlap by `overlap` words, and the duplicates the overlap
 * produces are merged by the caller. Offsets index the original text.
 *
 * @param {string} text
 * @param {{ maxWords?: number, overlap?: number }} [opts]
 * @returns {{ start: number, end: number }[]}
 */
export function chunkText(text, { maxWords = 200, overlap = 32 } = {}) {
  if (overlap >= maxWords) throw new Error('overlap must be smaller than maxWords');
  const lines = [];
  let at = 0;
  for (const piece of text.split('\n')) {
    const words = splitWords(piece).length;
    if (words) lines.push({ start: at, end: at + piece.length, words });
    at += piece.length + 1;
  }
  const out = [];
  let open = null;
  for (const line of lines) {
    if (line.words > maxWords) {
      if (open) out.push(open), (open = null);
      const words = splitWords(text.slice(line.start, line.end));
      for (let w = 0; w < words.length; w += maxWords - overlap) {
        const last = Math.min(w + maxWords, words.length) - 1;
        out.push({ start: line.start + words[w].start, end: line.start + words[last].end, words: last - w + 1 });
        if (last === words.length - 1) break;
      }
      continue;
    }
    if (open && open.words + line.words <= maxWords) {
      open.end = line.end;
      open.words += line.words;
    } else {
      if (open) out.push(open);
      open = { ...line };
    }
  }
  if (open) out.push(open);
  return out.map(({ start, end }) => ({ start, end }));
}

/**
 * Merge spans from overlapping pieces: one per (label, start, end), the
 * highest score kept.
 *
 * @param {Span[]} spans
 * @returns {Span[]}
 */
export function mergeSpans(spans) {
  const best = new Map();
  for (const s of spans) {
    const key = `${s.label}\u0000${s.start}\u0000${s.end}`;
    const had = best.get(key);
    if (!had || s.score > had.score) best.set(key, s);
  }
  return [...best.values()];
}

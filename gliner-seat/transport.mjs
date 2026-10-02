// transport.mjs — the extraction seat's seam.
//
// Shaped like the decision seat's (`core/src/participants/decide.ts`):
// typed questions in, typed answers out, the whole batch in one call, and the
// thing that answers injected — a local GLiNER2 graph, a stub, or a hand with a
// highlighter, and the caller cannot tell which. Nothing in this file loads a
// model, opens a socket or names a vendor; the runner is passed in.
//
// The question is a text and the kinds of span wanted in it. The answer is
// spans: a kind, the words exactly as they stand in the text, where they stand,
// and a score. That is all a seat of this kind may say, and the rules that keep
// it honest are checked here, not trusted:
//
//   * it never WRITES — every span must be the text's own characters at the
//     offsets it gives, or it is dropped and counted;
//   * it never COMPUTES — a span carries no value; "36" stays the characters
//     "36", and what it is worth is tier 1's arithmetic (M1), never the seat's.
//     Any field a transport sends beyond kind, words, place and score is not
//     passed on;
//   * it never COMMITS — nothing here touches a session. An answer is a
//     candidate list for `decide` and for the sheet; holding it, attributed and
//     unblessed, is a later unit's (README, "what a seat would need").
//
// A seat asked by a deliberate act only (V1-PLAN §6): a fast call is still a
// call, and this one reads the user's words.

/**
 * @typedef {{ name: string, description?: string }} ExtractLabel
 *
 * @typedef {{
 *   kind: 'extract',
 *   id: string,              // the answer comes back keyed by it
 *   text: string,            // the words to read, exactly as the board holds them
 *   labels: ExtractLabel[],  // the kinds of span wanted — a closed list
 *   about?: string[],        // node ids the text belongs to; the seat never sees them
 *   threshold?: number,      // the caller's own, when the seat's default is not the one
 * }} ExtractQuestion
 *
 * @typedef {{ label: string, text: string, start: number, end: number, score: number }} ExtractSpan
 *
 * @typedef {{ kind: 'extract', questionId: string, spans: ExtractSpan[] }} ExtractAnswer
 *
 * @typedef {{ ok: true, answers: ExtractAnswer[], via?: string } | { ok: false, error: string }} ExtractResult
 *
 * @typedef {(questions: readonly ExtractQuestion[], opts: { signal?: AbortSignal }) => Promise<ExtractResult>} ExtractTransport
 */

/** The seat's own default: the library's, until fixtures from real use say otherwise. */
export const DEFAULT_THRESHOLD = 0.5;

// ---- building questions ------------------------------------------------------

/**
 * An extraction question. Labels may be given as bare names.
 *
 * @param {string} id
 * @param {string} text
 * @param {(string | ExtractLabel)[]} labels
 * @param {{ about?: string[], threshold?: number }} [o]
 * @returns {ExtractQuestion}
 */
export function extractQuestion(id, text, labels, o = {}) {
  const seen = new Set();
  const list = [];
  for (const l of labels) {
    const label = typeof l === 'string' ? { name: l } : { name: l.name, ...(l.description ? { description: l.description } : {}) };
    if (!label.name || seen.has(label.name)) continue;
    seen.add(label.name);
    list.push(label);
  }
  if (!list.length) throw new Error(`question ${id} asks for no kind of span`);
  const q = { kind: 'extract', id, text, labels: list };
  if (o.about) q.about = o.about;
  if (o.threshold !== undefined) q.threshold = o.threshold;
  return q;
}

// ---- checking an answer ----------------------------------------------------

/**
 * Keep the spans that are the text's own words, of a kind that was asked for,
 * with a score that is a probability — and drop the rest, each with its reason.
 * Rebuilds every kept span from its five fields, so nothing else rides along.
 *
 * @param {ExtractQuestion} question
 * @param {{ spans?: unknown[] }} answer
 * @returns {{ spans: ExtractSpan[], dropped: { span: unknown, why: string }[] }}
 */
export function checkAnswer(question, answer) {
  const asked = new Set(question.labels.map((l) => l.name));
  const spans = [];
  const dropped = [];
  const seen = new Set();
  for (const s of answer?.spans ?? []) {
    const why = whyNot(question, asked, s);
    if (why) {
      dropped.push({ span: s, why });
      continue;
    }
    const key = `${s.label}\u0000${s.start}\u0000${s.end}`;
    if (seen.has(key)) {
      dropped.push({ span: s, why: 'the same span, twice' });
      continue;
    }
    seen.add(key);
    spans.push({ label: s.label, text: s.text, start: s.start, end: s.end, score: s.score });
  }
  spans.sort((a, b) => a.start - b.start || b.score - a.score);
  return { spans, dropped };
}

function whyNot(question, asked, s) {
  if (!s || typeof s !== 'object') return 'not a span';
  if (!asked.has(s.label)) return `a kind that was not asked for (${String(s.label)})`;
  if (!Number.isInteger(s.start) || !Number.isInteger(s.end)) return 'no place in the text';
  if (s.start < 0 || s.end > question.text.length || s.start >= s.end) return `a place outside the text (${s.start}…${s.end})`;
  if (typeof s.text !== 'string' || question.text.slice(s.start, s.end) !== s.text) {
    return 'words that are not the text\'s own at that place';
  }
  if (typeof s.score !== 'number' || !Number.isFinite(s.score) || s.score < 0 || s.score > 1) return 'a score that is not a probability';
  return null;
}

/**
 * The seat's reason: the question it was asked and the spans it returned, and
 * nothing else — no sentence is written for a seat that cannot write one.
 *
 * @param {ExtractQuestion} question
 * @param {ExtractSpan[]} spans
 */
export function reasonOf(question, spans) {
  const kinds = question.labels.map((l) => l.name).join(', ');
  const found = spans.length
    ? [...spans].sort((a, b) => b.score - a.score).map((s) => `“${s.text}” ${s.label} ${s.score.toFixed(2)}`).join(' · ')
    : 'nothing of those kinds';
  return `asked for ${kinds} in “${question.text}” — ${found}`;
}

// ---- asking ----------------------------------------------------------------

/**
 * Ask a batch, and check what comes back. Never throws: a seat that throws is a
 * seat that is not there, and the canvas goes on drawing.
 *
 * @param {ExtractTransport} transport
 * @param {readonly ExtractQuestion[]} questions
 * @param {{ signal?: AbortSignal }} [o]
 */
export async function askExtract(transport, questions, o = {}) {
  const started = Date.now();
  let result;
  try {
    result = await transport(questions, { signal: o.signal });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), rows: [], unanswered: questions.map((q) => q.id), ms: Date.now() - started };
  }
  const ms = Date.now() - started;
  if (!result || !result.ok) {
    return { ok: false, error: result?.error ?? 'no result', rows: [], unanswered: questions.map((q) => q.id), ms };
  }
  const byId = new Map(result.answers.map((a) => [a.questionId, a]));
  const rows = [];
  const unanswered = [];
  for (const q of questions) {
    const answer = byId.get(q.id);
    if (!answer || answer.kind !== 'extract') {
      unanswered.push(q.id);
      continue;
    }
    const { spans, dropped } = checkAnswer(q, answer);
    rows.push({ question: q, spans, dropped, reason: reasonOf(q, spans) });
  }
  return { ok: true, rows, unanswered, ms, via: result.via };
}

// ---- the real transport, over any runner ---------------------------------------

/**
 * A transport over a runner — anything with `extract(text, labels, { threshold })`
 * returning `{ spans }` (runner.mjs, in Node or in a page). The runner is
 * injected; this file never loads one.
 *
 * @param {{ name?: string, extract: (text: string, labels: ExtractLabel[], o: object) => Promise<{ spans: ExtractSpan[] }> }} runner
 * @param {{ threshold?: number, via?: string }} [o]
 * @returns {ExtractTransport}
 */
export function createRunnerTransport(runner, o = {}) {
  return async (questions, { signal } = {}) => {
    const answers = [];
    try {
      for (const q of questions) {
        if (signal?.aborted) return { ok: false, error: 'stopped' };
        const threshold = q.threshold ?? o.threshold ?? DEFAULT_THRESHOLD;
        const r = await runner.extract(q.text, q.labels, { threshold });
        answers.push({ kind: 'extract', questionId: q.id, spans: r.spans.map(({ label, text, start, end, score }) => ({ label, text, start, end, score })) });
      }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
    return { ok: true, answers, via: o.via ?? runner.name ?? 'gliner2' };
  };
}

// ---- a fake ----------------------------------------------------------------

/**
 * What the fake says about one question: spans by their words (the nth time
 * those words occur, default the first) and a score.
 *
 * @typedef {{ label: string, text: string, nth?: number, score?: number }} FakeSpan
 */

/**
 * A transport that answers from a written-down book, keyed by question id. No
 * model, no network, no clock.
 *
 * Its numbers are the plumbing's, not any model's: it exists so the seat can
 * be tested — and a caller built — with nothing downloaded. A question the book
 * does not know finds nothing (or, with `unscripted: 'unanswered'`, is not
 * answered at all), because a fake that has not been told does not know.
 *
 * @param {Record<string, FakeSpan[]>} book
 * @param {{ via?: string, unscripted?: 'empty' | 'unanswered' }} [o]
 * @returns {ExtractTransport}
 */
export function createFakeExtractTransport(book, o = {}) {
  const unscripted = o.unscripted ?? 'empty';
  return async (questions) => {
    const answers = [];
    for (const q of questions) {
      const told = book[q.id];
      if (!told && unscripted === 'unanswered') continue;
      const spans = [];
      for (const f of told ?? []) {
        const start = nthIndex(q.text, f.text, f.nth ?? 0);
        // A book entry whose words are not in the text leads to nothing — the
        // fake is held to the same rule as a seat.
        if (start < 0) continue;
        spans.push({ label: f.label, text: f.text, start, end: start + f.text.length, score: f.score ?? 0.9 });
      }
      answers.push({ kind: 'extract', questionId: q.id, spans });
    }
    return { ok: true, answers, via: o.via ?? 'fake' };
  };
}

function nthIndex(text, words, nth) {
  let at = -1;
  for (let k = 0; k <= nth; k++) {
    at = text.indexOf(words, at + 1);
    if (at < 0) return -1;
  }
  return at;
}

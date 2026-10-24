// The decision seat's System One transport (the audit's S2, S7): the typed request a decision model of the
// System One class — Cloudflare's Clef, Clef-flash and Clef-omni on Workers AI — reads, and the typed reply it
// writes, read back as the seat's answers. dyna.ink's own relay asks it (`/decide`, `cloudflare/relay/src/ai.mjs`)
// through a Workers AI binding, so the page holds no key and sends none: this file is the page's half.
//
// It is a `DecideTransport`, not a `DecideWire`: a wire builds CHAT messages and reads reply TEXT (the chat
// transport, `decide-openrouter.ts`), and System One is neither — questions with criteria go in, a map of typed
// answers comes out. So it is the second factory beside `createChatDecideTransport`; the seat (`decide.ts`) is the
// same seat, and every rule it keeps (none of these always offered, a flat answer not held, the floor on the lead)
// is kept there, not here.
//
// THE REQUEST (third-party write-ups of Cloudflare's docs; Cloudflare's own pages were not reachable from where
// this was written — UNVERIFIED in its details, and `scripts/record-systemone.mjs` records the real replies):
//   { model, state, questions: { q1: {type, instructions, criteria}, … }, images? }
//   * a question's NAME is `q1 … qn`: the seat's own question ids (`which:stroke:ada:7` — a node id in it) never
//     leave the page; the map from name back to id is kept here, in code;
//   * a CHOICE's criteria are a map `{ <key>: <words> }`, `none_of_these` always last: a key is the candidate's own
//     id in lower snake case when it makes one (`SYSTEMONE_KEY`), else `option_<n>`, `_2` for a collision — never
//     integer-like, so a JSON object's key order (which puts integer-like keys first) is the order sent; the words
//     are the candidate's text, and the map from key back to the candidate's id stays here;
//   * a SCORE's criteria are the levels as an ARRAY, lowest first (Cloudflare's own example) — a level is never a
//     key, so nothing can reorder a scale;
//   * a NOUL is its statement as the instructions, and no criteria;
//   * the state is words (`DecideState.text`, `decide-state.ts`), never a node id; pictures, for a model that sees
//     (Clef-omni), go in a top-level `images` list of data URLs, at most `SYSTEMONE_MAX_IMAGES`;
//   * nothing sent is longer than dyna.ink's relay takes (`Demos/decide-protocol.mjs`'s `DECIDE_LIMITS`, which
//     `relay.decide.test.mjs` holds equal to these): a question's instructions and an option's words at most
//     `SYSTEMONE_WORDS_MAX` characters, the state `SYSTEMONE_STATE_MAX` — cut at a space, the cut said with an
//     ellipsis — so a long note beside a definition never makes the relay refuse the whole decision. (A score's
//     levels are the engine's own few words, and its key back: sent as they are.)
//
// THE REPLY, read tolerantly and never guessed at: `{ answers: { q1: …, … } }` (the relay's own `{ ok, model, ms,
// answers }` around it). A question is UNANSWERED — left out, its reason a note — whenever its answer is not what
// it says it is:
//   * a distribution is read only from fields that carry one (`probabilities`, `probs`, `distribution`): a map
//     `{ key: p }` or a list of `{ option|of|id|level|label, p|prob|probability }` (and, for a score, a list of
//     numbers in the levels' order). Every spelling present must agree; none present is no answer — a reply that
//     says only a pick and a confidence is unanswered, because a distribution made out of a pick is a guess;
//   * a key nobody offered — a vendor's own `none` or `other` — a negative or non-finite probability, a sum of
//     nothing, or a sum more than `SUM_SLACK` under 1 (a part of a distribution: the pick's probability alone, the
//     top few — stretched over the rest as nothing, a 0.6 would be held as a certainty) leaves the question
//     unanswered; a sum more than `SUM_SLACK` over 1 is normalised, and said;
//   * a score's keys may be its level words or their places (`"0"`, `"1"` …): where a level word is itself
//     integer-like the two cannot be told apart, and the question is unanswered rather than read one way; a
//     `legend` that says the levels otherwise than they were sent leaves it unanswered too;
//   * the pick is read OFF the distribution (`FLAT_MARGIN`); the vendor's own `choice`/`answer` is compared, never
//     used, and a disagreement said; its `confidence` (how concentrated the distribution is, Cloudflare says — not
//     the chance it is right) is kept for the reason when it is a number in [0, 1]. The seat's floor
//     (`DECIDER_TAKE_AT`) is on the lead, never on the vendor's confidence;
//   * a noul's probability of yes may be the answer itself or any of `p_yes`, `yes`, `p_true`, `probability`, `p`,
//     `value`, or `yes` in its distribution: all present must agree, and it must lie in [0, 1].
// Once a real reply is recorded, the tolerance is narrowed to the spelling that comes back.
//
// A failure is said in `provider.ts`'s sentences (`postJson`): the relay's own words after the status
// (`HTTP 429 — rate limited: “today’s decisions on dyna.ink are spent — …”`), a timeout with the host and the wait,
// `cancelled` the one word a caller tests for. No credentials are sent (`credentials: 'omit'`).

import { postJson } from './provider';
import {
  FLAT_MARGIN,
  NO_MATCH,
  SUM_SLACK,
  partialSum,
  type DecideResult,
  type DecideState,
  type DecideTransport,
  type DecisionAnswer,
  type DecisionQuestion,
  type Probability,
} from '../participants/decide';

/** The criteria key that means *none of these* — always offered last in a choice, read back as `NO_MATCH`. */
export const SYSTEMONE_NONE = 'none_of_these';
/** What a criteria key, and a question's name, may be: lower case letters, digits and `_`, a letter first — never integer-like. */
export const SYSTEMONE_KEY = /^[a-z][a-z0-9_]{0,47}$/;
/** The most pictures a request carries (Workers AI's limit, as reported). */
export const SYSTEMONE_MAX_IMAGES = 4;
/** How long the page waits for a decision: longer than the relay's own wait on the model, so the relay's sentence is the one heard. */
export const SYSTEMONE_TIMEOUT_MS = 20_000;
/** The most characters of a question's instructions, or of an option's words, that are sent. */
export const SYSTEMONE_WORDS_MAX = 1000;
/** The most characters of a state that are sent. */
export const SYSTEMONE_STATE_MAX = 16000;
/** How far a distribution's sum may stand off 1 before it is normalised and said — or, under, is no answer (the seat's, `decide.ts`). */
export { SUM_SLACK };
/** How far two spellings of one number may differ and still be one number. */
const SAME = 1e-6;

/** What none of these says to the model. */
const NONE_WORDS = 'none of these — choose this when no other option is right';

/** One question as System One reads it. */
export interface SystemOneQuestion {
  type: 'choice' | 'score' | 'noul';
  instructions: string;
  /** A choice's options (key → words), or a score's levels, lowest first. A noul has none. */
  criteria?: Record<string, string> | string[];
}

/** The body POSTed: what the model is asked, and nothing the page keeps to itself. */
export interface SystemOneBody {
  model?: string;
  state: string;
  questions: Record<string, SystemOneQuestion>;
  images?: string[];
}

/** The body, and the maps that turn its names and keys back into the seat's ids — kept in code, never sent. */
export interface SystemOneRequest {
  body: SystemOneBody;
  /** Wire name (`q1`) → the seat's question id. */
  names: Map<string, string>;
  /** Wire name → (criteria key → option id) for a choice; a score's levels in order; a noul's yes and no. */
  options: Map<string, Map<string, string>>;
}

/** Words cut to `max` characters at a space, the cut said with an ellipsis — what is sent is never longer than the relay takes. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.lastIndexOf(' ', max - 1);
  return text.slice(0, cut > max / 2 ? cut : max - 1).trimEnd() + '…';
}

/** A criteria key for an option: its id's words as lower snake case when they make one, else `option_<n>`; unique in its question. */
function keyFor(id: string, n: number, taken: Set<string>): string {
  const slug = id
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  const base = SYSTEMONE_KEY.test(slug) && slug !== SYSTEMONE_NONE ? slug : `option_${n + 1}`;
  let k = base;
  for (let i = 2; taken.has(k); i++) k = `${base}_${i}`;
  taken.add(k);
  return k;
}

/** The request for a batch of questions: names `q1…qn`, safe keys, *none of these* last in every choice. */
export function buildSystemOne(
  questions: readonly DecisionQuestion[],
  state?: DecideState,
  options: { model?: string; sees?: boolean } = {}
): SystemOneRequest {
  const names = new Map<string, string>();
  const keys = new Map<string, Map<string, string>>();
  const qs: Record<string, SystemOneQuestion> = {};
  questions.forEach((q, i) => {
    const name = `q${i + 1}`;
    names.set(name, q.id);
    const back = new Map<string, string>();
    if (q.kind === 'choice') {
      const criteria: Record<string, string> = {};
      const taken = new Set<string>([SYSTEMONE_NONE]);
      let none = NONE_WORDS;
      q.candidates.forEach((c, n) => {
        if (c.id === NO_MATCH) { if (c.text && c.text !== 'none of these') none = `${c.text} — choose this when no other option is right`; return; }
        const k = keyFor(c.id, n, taken);
        back.set(k, c.id);
        criteria[k] = clip(c.text || c.id, SYSTEMONE_WORDS_MAX);
      });
      back.set(SYSTEMONE_NONE, NO_MATCH);
      criteria[SYSTEMONE_NONE] = clip(none, SYSTEMONE_WORDS_MAX);
      qs[name] = { type: 'choice', instructions: clip(q.ask, SYSTEMONE_WORDS_MAX), criteria };
    } else if (q.kind === 'score') {
      q.levels.forEach((l) => back.set(l, l));
      qs[name] = { type: 'score', instructions: clip(q.ask, SYSTEMONE_WORDS_MAX), criteria: q.levels.slice() };
    } else {
      back.set('yes', 'yes');
      back.set('no', 'no');
      qs[name] = { type: 'noul', instructions: clip(q.statement, SYSTEMONE_WORDS_MAX) };
    }
    keys.set(name, back);
  });
  const body: SystemOneBody = { ...(options.model ? { model: options.model } : {}), state: clip(state?.text ?? '', SYSTEMONE_STATE_MAX), questions: qs };
  const images = options.sees && state?.images?.length ? state.images.slice(0, SYSTEMONE_MAX_IMAGES).map((im) => im.dataUrl) : [];
  if (images.length) body.images = images;
  return { body, names, options: keys };
}

// ---- reading the reply ------------------------------------------------------

type Loose = Record<string, unknown>;
const DIST_FIELDS = ['probabilities', 'probs', 'distribution'] as const;
const YES_FIELDS = ['p_yes', 'yes', 'p_true', 'probability', 'p', 'value'] as const;
const PICK_FIELDS = ['choice', 'answer', 'pick', 'option'] as const;
const isNumber = (x: unknown): x is number => typeof x === 'number';
const integerLike = (k: string) => /^(0|[1-9][0-9]*)$/.test(k);

/** One field's distribution as raw (key → p) pairs: a map, a list of entries, or (`numbersOk`) a list of numbers by place. */
function rawDist(raw: unknown, numbersOk: boolean): { ok: true; pairs: [string, number][] } | { ok: false; why: string } {
  const pairs: [string, number][] = [];
  if (Array.isArray(raw)) {
    if (numbersOk && raw.length && raw.every(isNumber)) return { ok: true, pairs: raw.map((p, i) => [String(i), p]) };
    for (const e of raw) {
      const o = (e && typeof e === 'object' ? e : {}) as Loose;
      const k = [o.option, o.of, o.id, o.level, o.label].find((x) => typeof x === 'string' || isNumber(x));
      const p = [o.p, o.prob, o.probability].find(isNumber);
      if (k === undefined || p === undefined) return { ok: false, why: 'an entry of its distribution names no option or no probability' };
      pairs.push([String(k), p]);
    }
  } else if (raw && typeof raw === 'object') {
    for (const [k, p] of Object.entries(raw as Loose)) {
      if (!isNumber(p)) return { ok: false, why: `“${k}” in its distribution is not a number` };
      pairs.push([k, p]);
    }
  } else return { ok: false, why: 'its distribution is neither a map nor a list' };
  const seen = new Set<string>();
  for (const [k] of pairs) {
    if (seen.has(k)) return { ok: false, why: `“${k}” is given twice in its distribution` };
    seen.add(k);
  }
  return { ok: true, pairs };
}

/**
 * The distribution over exactly the options offered (key → p), from every field that carries one — all agreeing —
 * or why it is not one. `resolve` maps a raw key to an offered key, or null for one nobody offered.
 */
function distributionOf(
  a: Loose,
  resolve: (pairs: [string, number][]) => { ok: true; dist: Map<string, number> } | { ok: false; why: string },
  numbersOk: boolean
): { ok: true; dist: Map<string, number> } | { ok: false; why: string } {
  const present = DIST_FIELDS.filter((f) => f in a);
  if (!present.length) return { ok: false, why: 'no distribution came back' + (PICK_FIELDS.some((f) => f in a) || 'score' in a ? ' — only a pick, which is not a distribution' : '') };
  let first: Map<string, number> | null = null;
  for (const f of present) {
    const r = rawDist(a[f], numbersOk);
    if (!r.ok) return r;
    const d = resolve(r.pairs);
    if (!d.ok) return d;
    if (!first) { first = d.dist; continue; }
    const keys = new Set([...first.keys(), ...d.dist.keys()]);
    if ([...keys].some((k) => Math.abs((first!.get(k) ?? 0) - (d.dist.get(k) ?? 0)) > SAME)) return { ok: false, why: `two spellings of its distribution disagree (${present.join(', ')})` };
  }
  return { ok: true, dist: first! };
}

/** Over the options offered, normalised; or why not (a probability that is not one, a sum of nothing). */
function overOffered(dist: Map<string, number>, offered: Map<string, string>, notes: string[], name: string): Probability[] | string {
  if ([...dist.values()].some((p) => !Number.isFinite(p) || p < 0)) return 'a probability that is not one';
  const sum = [...dist.values()].reduce((n, p) => n + p, 0);
  const partial = partialSum(sum);
  if (partial) return partial;
  if (Math.abs(sum - 1) > SUM_SLACK) notes.push(`${name}: its probabilities summed to ${sum.toFixed(3)} — normalised`);
  return [...offered].map(([k, id]) => ({ of: id, p: (dist.get(k) ?? 0) / sum }));
}

/** A choice's keys, each one offered — or the ones nobody offered, named. */
function choiceKeys(offered: Map<string, string>) {
  return (pairs: [string, number][]) => {
    const foreign = pairs.map(([k]) => k).filter((k) => !offered.has(k));
    if (foreign.length) return { ok: false as const, why: `it names an option nobody offered (${foreign.join(', ')})` };
    return { ok: true as const, dist: new Map(pairs) };
  };
}

/** A score's keys: its level words, or their places — never both, and never where a level word could be a place. */
function scoreKeys(levels: readonly string[]) {
  return (pairs: [string, number][]) => {
    const words = new Set(levels);
    const byWord = pairs.every(([k]) => words.has(k));
    const byPlace = pairs.every(([k]) => integerLike(k) && Number(k) < levels.length);
    if (byWord && byPlace) return { ok: false as const, why: 'its keys could be levels or places in the list of levels (a level is itself a number) — not read either way' };
    if (byWord) return { ok: true as const, dist: new Map(pairs) };
    if (byPlace) return { ok: true as const, dist: new Map(pairs.map(([k, p]) => [levels[Number(k)], p] as [string, number])) };
    const foreign = pairs.map(([k]) => k).filter((k) => !words.has(k) && !(integerLike(k) && Number(k) < levels.length));
    return { ok: false as const, why: foreign.length ? `it names a level nobody offered (${foreign.join(', ')})` : 'its keys mix levels and places in the list' };
  };
}

/** A score's legend, when one came: it must say the levels as they were sent. */
function legendAgrees(legend: unknown, levels: readonly string[]): boolean {
  if (legend === undefined) return true;
  const said = Array.isArray(legend) ? legend.map((x, i) => [String(i), x] as const) : legend && typeof legend === 'object' ? Object.entries(legend as Loose) : null;
  if (!said) return false;
  return said.every(([k, v]) => {
    if (typeof v === 'string' && integerLike(k)) return levels[Number(k)] === v; // place → level
    if (isNumber(v)) return levels[v] === k; // level → place
    return false;
  });
}

/** A noul's probability of yes, from every spelling present — all agreeing — or why not. */
function yesOf(raw: unknown): { ok: true; yes: number } | { ok: false; why: string } {
  const found: number[] = [];
  if (isNumber(raw)) found.push(raw);
  else if (raw && typeof raw === 'object') {
    const a = raw as Loose;
    for (const f of YES_FIELDS) if (isNumber(a[f])) found.push(a[f] as number);
    for (const f of DIST_FIELDS) {
      if (!(f in a)) continue;
      const r = rawDist(a[f], false);
      if (!r.ok) return r;
      const y = r.pairs.find(([k]) => k === 'yes' || k === 'true');
      if (y) found.push(y[1]);
      else return { ok: false, why: 'its distribution has no yes' };
    }
  }
  if (!found.length) return { ok: false, why: 'no probability of yes came back' };
  if (found.some((y) => Math.abs(y - found[0]) > SAME)) return { ok: false, why: 'two spellings of its probability of yes disagree' };
  if (!(found[0] >= 0 && found[0] <= 1)) return { ok: false, why: 'its probability of yes is not between 0 and 1' };
  return { ok: true, yes: found[0] };
}

/**
 * A System One reply, read into the seat's answers: every question the reply answers in a shape that can be read,
 * and a note for every one it does not (it is left out — the seat counts it unanswered — never guessed at).
 */
export function readSystemOne(
  json: unknown,
  req: SystemOneRequest,
  questions: readonly DecisionQuestion[]
): { ok: true; answers: DecisionAnswer[]; notes: string[] } | { ok: false; error: string } {
  const root = (json && typeof json === 'object' ? json : {}) as Loose;
  const answers = root.answers;
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return { ok: false, error: 'the decision model’s reply has no answers to read' };
  const byId = new Map(questions.map((q) => [q.id, q] as const));
  const out: DecisionAnswer[] = [];
  const notes: string[] = [];
  for (const [name, raw] of Object.entries(answers as Loose)) {
    const id = req.names.get(name);
    const q = id ? byId.get(id) : undefined;
    const offered = req.options.get(name);
    if (!q || !offered) { notes.push(`${name}: not a question that was asked — left out`); continue; }
    const a = (raw && typeof raw === 'object' ? raw : {}) as Loose;
    if (typeof a.type === 'string' && a.type !== q.kind) { notes.push(`${name}: answered as a ${a.type}, asked as a ${q.kind} — left out`); continue; }
    if (q.kind === 'noul') {
      const y = yesOf(raw);
      if (!y.ok) { notes.push(`${name}: ${y.why}`); continue; }
      out.push({ kind: 'noul', questionId: q.id, yes: y.yes });
      continue;
    }
    const d = q.kind === 'choice' ? distributionOf(a, choiceKeys(offered), false) : distributionOf(a, scoreKeys(q.levels), true);
    if (!d.ok) { notes.push(`${name}: ${d.why}`); continue; }
    if (q.kind === 'score' && !legendAgrees(a.legend, q.levels)) { notes.push(`${name}: its legend says the levels otherwise than they were sent`); continue; }
    const probs = overOffered(d.dist, offered, notes, name);
    if (typeof probs === 'string') { notes.push(`${name}: ${probs}`); continue; }
    const order = [...probs].sort((x, y) => y.p - x.p);
    const vendor = isNumber(a.confidence) && a.confidence >= 0 && a.confidence <= 1 ? a.confidence : undefined;
    if (q.kind === 'score') {
      const expectation = probs.reduce((n, p) => n + q.levels.indexOf(p.of) * p.p, 0);
      if (isNumber(a.score) && Math.abs(a.score - expectation) > FLAT_MARGIN) notes.push(`${name}: said a score of ${a.score.toFixed(2)}, its distribution makes ${expectation.toFixed(2)} — the distribution is read`);
      out.push({ kind: 'score', questionId: q.id, levels: q.levels, distribution: probs, expectation, confidence: vendor ?? order[0].p });
      continue;
    }
    // The pick is read OFF the distribution; the vendor's own is compared, never used.
    const pick = order.length > 1 && order[0].p - order[1].p < FLAT_MARGIN ? null : order[0]?.of ?? null;
    const said = PICK_FIELDS.map((f) => a[f]).find((x) => typeof x === 'string') as string | undefined;
    if (said !== undefined && (offered.get(said) ?? said) !== order[0]?.of) notes.push(`${name}: said “${said}”, its distribution leads with another — the distribution is read`);
    out.push({ kind: 'choice', questionId: q.id, pick, distribution: probs, confidence: vendor ?? order[0].p });
  }
  return { ok: true, answers: out, notes };
}

// ---- the transport ----------------------------------------------------------

export interface SystemOneOptions {
  /** Where the request is POSTed: dyna.ink's relay (`https://relay.dyna.ink/decide`), or a relay on this machine. */
  endpoint: string;
  /** Which model the relay asks — `clef-flash`, `clef` or `clef-omni`; the relay maps it to its own id. */
  model: string;
  /** Whether the model sees: only then are the state's pictures sent. */
  sees?: boolean;
  /** The fetch to use (a test's); the page's own by default. */
  fetch?: typeof fetch;
  /** Headers beside the body — a room's key for a relay that asks for one. Never a vendor's key: the relay holds none for the page. */
  headers?: Record<string, string>;
  timeoutMs?: number;
}

/**
 * A `DecideTransport` over a System One endpoint. The whole batch is one POST; a failure is the endpoint's own
 * sentence (`postJson`), `cancelled` the one word; what came back unreadable is said; a question it could not read is
 * left unanswered with a note (`DecideResult.notes`). `via` is `model`, the name the page asked by.
 */
export function createSystemOneDecideTransport(o: SystemOneOptions): DecideTransport {
  return async (questions, { signal, state }): Promise<DecideResult> => {
    if (!questions.length) return { ok: true, answers: [], via: o.model };
    const req = buildSystemOne(questions, state, { model: o.model, sees: o.sees });
    const res = await postJson(o.endpoint, req.body, {
      headers: o.headers,
      timeoutMs: o.timeoutMs ?? SYSTEMONE_TIMEOUT_MS,
      signal,
      fetch: o.fetch,
      credentials: 'omit',
    });
    if (!res.ok) return { ok: false, error: res.error };
    const read = readSystemOne(res.json, req, questions);
    if (!read.ok) return { ok: false, error: read.error };
    return { ok: true, answers: read.answers, via: o.model, ...(read.notes.length ? { notes: read.notes } : {}) };
  };
}

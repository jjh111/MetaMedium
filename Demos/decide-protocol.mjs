// The model routes' protocol, with no server in it: what `/decide` and `/extract` accept, refuse and answer, in
// one file the Cloudflare Worker (`cloudflare/relay/src/ai.mjs`) and the Node relay (`Demos/relay.mjs`) both read —
// as `relay-protocol.mjs` is for the rooms. Never a copy: a limit that differs between the two is a bug.
//
// `/decide` asks a decision model of the System One class — Cloudflare's Clef, Clef-flash, Clef-omni — through the
// Worker's Workers AI binding, so the page holds no key and sends none. The page names a model by its short name
// (`clef-flash`); the `@cf/…` id is here, in code, and never in a request. The page's half is core's
// `llm/decide-systemone.ts`; the relay checks only the SHAPE (small, typed, nothing it does not know), passes
// the call on and hands back the model's answers untouched — reading them is core's.
//
// `/extract` is the same for an extraction model (Clairic): `{ model, state, fields }`, its fields text or lists only
// (a typed number, date or estimate is a value the engine's maths computes, never a model's). Built as a route and
// its checks; no surface job asks it yet.
//
// Every refusal is a sentence. Nothing here logs, and the routes never log a state, a question or a criterion.

/** The decision models, by the short name the page asks with. `sees`: takes pictures (a top-level `images` list). */
export const DECIDE_MODELS = {
  'clef-flash': { id: '@cf/cloudflare/clef-flash', name: 'Clef-flash', sees: false },
  clef: { id: '@cf/cloudflare/clef', name: 'Clef', sees: false },
  'clef-omni': { id: '@cf/cloudflare/clef-omni', name: 'Clef-omni', sees: true },
};

/** The extraction models, the same way. */
export const EXTRACT_MODELS = {
  clairic: { id: '@cf/cloudflare/clairic', name: 'Clairic', sees: false },
};

/** What a request may hold. Workers AI takes more (64 questions, 255 options); the page asks far less, and a smaller call is a cheaper one. */
export const DECIDE_LIMITS = {
  questions: 16,
  options: 64,
  levels: 10,
  instructions: 1000,
  criterion: 1000,
  state: 16000,
  images: 4,
  body: 64 * 1024,
  bodyWithImages: 6 * 1024 * 1024,
  fields: 16,
};

/** A question's name, a criterion's key, a field's name: lower case letters, digits and `_`, a letter first. */
export const DECIDE_NAME = /^[a-z][a-z0-9_]{0,47}$/;
/** What an extraction field may be: words, or a list of them. */
export const EXTRACT_FIELD_TYPES = ['text', 'list'];
/** How long the relay waits for the model before it says so (the page waits longer, so this sentence is the one heard). */
export const DECIDE_WAIT_MS = 10_000;
/** The routes' limits, per minute: a page with no key, per address; a hand with a room's key, per room. */
export const DECIDE_PER_MINUTE = { caller: 20, room: 120 };
/** Calls a day across every caller, when the relay's `MM_AI_DAILY` says nothing. */
export const DEFAULT_AI_DAILY = 20000;

const IMAGE_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const isMap = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const textOf = (x) => (typeof x === 'string' ? x : JSON.stringify(x === undefined ? null : x));

/** The sentences the routes say, one home. */
export const DECIDE_WORDS = {
  off: 'decisions are off on this relay — the engine’s ranking stands',
  mode: 'this relay’s MM_DECIDE is none of off, keyed or limited — no decision is asked',
  keyed: 'decisions on this relay need a room’s key — the engine’s ranking stands',
  noOrigin: 'a decision is asked from the app’s own page, or with a room’s key — this request has neither',
  wrongKey: (room) => `that is not the key for room “${room}”`,
  rate: 'too many decisions from here — try again in a minute; the engine’s ranking stands meanwhile',
  spent: 'today’s decisions on dyna.ink are spent — the engine’s ranking stands',
  uncounted: 'this relay cannot count its decisions (it has no LIMITS binding), so it asks none',
  noModel: 'this relay has no decision model — dyna.ink’s relay runs Clef-flash; here, choose a decision model under models',
  noBinding: 'this relay has no Workers AI binding, so it asks no model — choose a decision model of your own under models',
  method: 'POST a decision (GET lists the models)',
  notJson: 'the body is not JSON',
  tooBig: (kb) => `that decision is too big to ask — at most ${kb} KB`,
  timeout: (model) => `${model} did not answer in ${DECIDE_WAIT_MS / 1000} s`,
  failed: (model, message) => `${model} failed — ${String(message || 'no reason given').slice(0, 160)}`,
  empty: (model) => `${model} answered, but with no answers`,
  elsewhere: 'this relay asks no model at this address — /decide and /extract are the ones it has',
};

function stateWords(state) {
  if (state === undefined) return null;
  if (textOf(state).length > DECIDE_LIMITS.state) return `the state is at most ${DECIDE_LIMITS.state.toLocaleString('en')} characters`;
  return null;
}

function imagesWords(images, model, sees) {
  if (images === undefined) return null;
  if (!Array.isArray(images)) return '“images” is a list of pictures';
  if (!images.length) return null;
  if (!sees) return `${model} reads no pictures — ask clef-omni`;
  if (images.length > DECIDE_LIMITS.images) return `at most ${DECIDE_LIMITS.images} pictures a decision`;
  if (images.some((i) => typeof i !== 'string' || !IMAGE_URL.test(i))) return 'a picture is a PNG, JPEG or WebP data URL';
  return null;
}

function extraKeys(o, allowed, what) {
  const extra = Object.keys(o).filter((k) => !allowed.includes(k));
  return extra.length ? `${what} carries what this relay does not ask with (${extra.join(', ')})` : null;
}

/** A `/decide` body's shape, in words: null when it may be asked, else why not. */
export function decideCheck(b) {
  if (!isMap(b)) return 'the body is not a JSON object';
  const extra = extraKeys(b, ['model', 'state', 'questions', 'images'], 'the body');
  if (extra) return extra;
  const m = DECIDE_MODELS[b.model];
  if (typeof b.model !== 'string' || !Object.prototype.hasOwnProperty.call(DECIDE_MODELS, b.model)) return `no decision model “${String(b.model)}” here — ${Object.keys(DECIDE_MODELS).join(', ')}`;
  const qs = b.questions;
  if (!isMap(qs)) return '“questions” is a map of named questions';
  const names = Object.keys(qs);
  if (!names.length || names.length > DECIDE_LIMITS.questions) return `1–${DECIDE_LIMITS.questions} questions a decision`;
  for (const n of names) {
    if (!DECIDE_NAME.test(n)) return `a question’s name is lower case letters, digits and _, a letter first (“${n.slice(0, 40)}”)`;
    const q = qs[n];
    if (!isMap(q)) return `${n}: a question is an object`;
    const qExtra = extraKeys(q, ['type', 'instructions', 'criteria'], n);
    if (qExtra) return qExtra;
    if (!['choice', 'score', 'noul'].includes(q.type)) return `${n}: a question is a choice, a score or a noul`;
    if (typeof q.instructions !== 'string' || !q.instructions.trim() || q.instructions.length > DECIDE_LIMITS.instructions) return `${n}: its instructions are words, at most ${DECIDE_LIMITS.instructions.toLocaleString('en')} characters`;
    if (q.type === 'choice') {
      if (!isMap(q.criteria)) return `${n}: a choice’s options are a map of name to words`;
      const keys = Object.keys(q.criteria);
      if (keys.length < 2 || keys.length > DECIDE_LIMITS.options) return `${n}: a choice has 2–${DECIDE_LIMITS.options} options`;
      if (keys.some((k) => !DECIDE_NAME.test(k))) return `${n}: an option’s name is lower case letters, digits and _, a letter first`;
      if (keys.some((k) => typeof q.criteria[k] !== 'string' || q.criteria[k].length > DECIDE_LIMITS.criterion)) return `${n}: an option’s words are text, at most ${DECIDE_LIMITS.criterion.toLocaleString('en')} characters`;
    } else if (q.type === 'score') {
      if (!Array.isArray(q.criteria)) return `${n}: a score’s levels are a list, lowest first`;
      if (q.criteria.length < 2 || q.criteria.length > DECIDE_LIMITS.levels) return `${n}: a score has 2–${DECIDE_LIMITS.levels} levels`;
      if (q.criteria.some((l) => typeof l !== 'string' || !l.trim() || l.length > DECIDE_LIMITS.criterion)) return `${n}: a level is words, at most ${DECIDE_LIMITS.criterion.toLocaleString('en')} characters`;
    } else if (q.criteria !== undefined) return `${n}: a noul is its statement alone — no options`;
  }
  return stateWords(b.state) || imagesWords(b.images, b.model, m.sees);
}

/** An `/extract` body's shape, in words: null when it may be asked, else why not. Fields are text or lists of text only. */
export function extractCheck(b) {
  if (!isMap(b)) return 'the body is not a JSON object';
  const extra = extraKeys(b, ['model', 'state', 'fields'], 'the body');
  if (extra) return extra;
  if (typeof b.model !== 'string' || !Object.prototype.hasOwnProperty.call(EXTRACT_MODELS, b.model)) return `no extraction model “${String(b.model)}” here — ${Object.keys(EXTRACT_MODELS).join(', ')}`;
  if (b.state === undefined) return 'an extraction reads a state — there is none';
  const fs = b.fields;
  if (!isMap(fs)) return '“fields” is a map of named fields';
  const names = Object.keys(fs);
  if (!names.length || names.length > DECIDE_LIMITS.fields) return `1–${DECIDE_LIMITS.fields} fields an extraction`;
  for (const n of names) {
    if (!DECIDE_NAME.test(n)) return `a field’s name is lower case letters, digits and _, a letter first (“${n.slice(0, 40)}”)`;
    const f = fs[n];
    if (!isMap(f)) return `${n}: a field is an object`;
    const fExtra = extraKeys(f, ['type', 'instructions', 'items'], n);
    if (fExtra) return fExtra;
    if (!EXTRACT_FIELD_TYPES.includes(f.type)) return `${n}: a field is text or a list — a number, a date or an estimate is the engine’s to compute, never a model’s`;
    if (f.instructions !== undefined && (typeof f.instructions !== 'string' || f.instructions.length > DECIDE_LIMITS.instructions)) return `${n}: its instructions are words, at most ${DECIDE_LIMITS.instructions.toLocaleString('en')} characters`;
    if (f.items !== undefined && (f.type !== 'list' || !isMap(f.items) || f.items.type !== 'text' || Object.keys(f.items).length !== 1)) return `${n}: a list’s items are text`;
  }
  return stateWords(b.state);
}

/** What `GET /decide` (and `/extract`) answers: the models and the limits, for the seat's row — no model is called. */
export function decideCatalog(route = 'decide') {
  const models = route === 'extract' ? EXTRACT_MODELS : DECIDE_MODELS;
  return {
    ok: true,
    route,
    models: Object.entries(models).map(([model, m]) => ({ model, name: m.name, sees: m.sees })),
    limits: { ...DECIDE_LIMITS, perMinute: DECIDE_PER_MINUTE },
  };
}

/** How many calls a day the relay allows, from its environment: a positive whole number, else the default. */
export function aiDailyFrom(env = {}) {
  const n = Number(env.MM_AI_DAILY);
  return Number.isFinite(n) && n >= 0 && Math.floor(n) === n && String(env.MM_AI_DAILY).trim() !== '' ? n : DEFAULT_AI_DAILY;
}

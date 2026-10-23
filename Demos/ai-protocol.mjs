// dyna.ink's own writer and reader — the relay's chat route — with no server in it: what `POST /ai/v1/chat/completions`
// and `GET /ai/v1/models` accept, refuse and answer, in one file the Cloudflare Worker (`cloudflare/relay/src/ai.mjs`)
// and the Node relay (`Demos/relay.mjs`, which answers 501 in words) both read — as `decide-protocol.mjs` is for the
// decider and `relay-protocol.mjs` for the rooms. Never a copy: a limit that differs between the two is a bug.
//
// The route speaks OpenAI's chat-completions shape, so core's transport (`llm/provider.ts`: `complete`, `readModels`,
// `listModels`, with a base URL of `<relay>/ai/v1`) speaks to it unchanged. The page names a house model by its SHORT
// name — `writer` (briefs, pages, programs, What is this?, ask:) or `reader` (handwriting, from a picture of the ink) —
// and the relay maps it, in code, to a Workers AI model: the `@cf/…` id in its variables `MM_AI_WRITER` and
// `MM_AI_READER`, `DEFAULT_AI_MODEL` when they say nothing. The page never names an `@cf` id and cannot ask for any
// other model; the list it reads says each short name, whether it sees, its context and the limits — never the id.
//
// UNVERIFIED (Cloudflare's own pages were not reachable from where this was written): what `env.AI.run` takes for a
// picture — sent here as OpenAI's `image_url` part with a data URL, the likeliest — and whether a model answers
// `{ response }` or OpenAI's `{ choices }`: both are read (`chatReply`), and a reply that is neither is said in words.
// The facts in `AI_KNOWN` are third-party write-ups' (one catalog lists Qwen3.8 27B on Workers AI at 8K of context,
// against the 262,144 its makers give it) — the relay holds a reply to `AI_CHAT_LIMITS.maxTokens` whatever they say.
//
// Every refusal is a sentence, in OpenAI's error shape `{ error: { message } }` (core reads it as the provider's own
// words). Nothing here logs, and the route never logs a message or a picture.

/** The model each short name asks when the relay's variables say nothing: a vision-language model, so it writes and reads. */
export const DEFAULT_AI_MODEL = '@cf/qwen/qwen3.8-27b';

/** The house models, by the short name the page asks with: what each is called, its job, the variable that names its model. */
export const AI_CHAT_MODELS = {
  writer: { env: 'MM_AI_WRITER', name: 'dyna.ink’s writer', job: 'writes briefs, pages and programs, and says what a group of marks is', reads: false },
  reader: { env: 'MM_AI_READER', name: 'dyna.ink’s reader', job: 'reads handwriting from a picture of the ink', reads: true },
};

/**
 * What is known of the Workers AI models the relay may be told to use — whether each takes pictures and how much it
 * reads (third-party write-ups, UNVERIFIED). A model named that is not here is taken at its word for its job: a reader
 * sees, a writer reads text only, and its context is not said.
 */
export const AI_KNOWN = {
  '@cf/qwen/qwen3.8-27b': { label: 'Qwen3.8 27B', sees: true, context: 262144 },
  '@cf/meta/llama-4-scout-17b-16e-instruct': { label: 'Llama 4 Scout', sees: true, context: 131072 },
  '@cf/openai/gpt-oss-120b': { label: 'gpt-oss-120b', sees: false, context: 131072 },
  '@cf/zai-org/glm-5.2': { label: 'GLM 5.2', sees: false },
};

/** What a chat request may hold. A smaller call is a cheaper one, and a brief the canvas writes is far under these. */
export const AI_CHAT_LIMITS = {
  messages: 32,
  /** Bytes of the words, whether or not a picture comes with them. */
  text: 64 * 1024,
  images: 4,
  /** Bytes of the whole body with its pictures. */
  bodyWithImages: 6 * 1024 * 1024,
  /** The most tokens a reply may be: `max_tokens` is held to this, or to the model's own limit when lower. */
  maxTokens: 4096,
};

/** How long the relay waits for the model before it says so (the page waits longer, so this sentence is the one heard). */
export const AI_CHAT_WAIT_MS = 60_000;
/** Per minute: a page with no key, per address (an IPv6 address by its /64); a hand with a room's key, per room. A chat call is costly, so far fewer than a decision. */
export const AI_CHAT_PER_MINUTE = { caller: 10, room: 30 };
/** A page with no key, per address, a day: its share of the day's budget, so one machine cannot spend everyone's. */
export const AI_CHAT_PER_DAY = { caller: 200 };
/** Chat calls a day across every caller, when the relay's `MM_AI_CHAT_DAILY` says nothing — a budget of its own, apart from the decisions'. */
export const DEFAULT_AI_CHAT_DAILY = 2000;

const ID = /^@cf\/[a-z0-9._-]+\/[a-z0-9._:-]+$/i;
const IMAGE_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const ROLES = ['system', 'user', 'assistant'];
const isMap = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const kb = (n) => Math.round(n / 1024).toLocaleString('en');

/** The sentences the route says, one home. */
export const AI_WORDS = {
  off: 'dyna.ink’s own writer and reader are off on this relay — bring your own model under models',
  mode: 'this relay’s MM_AI_CHAT is none of off, keyed or limited — no model is asked',
  keyed: 'dyna.ink’s writer and reader on this relay need a room’s key — bring your own model under models',
  noOrigin: 'dyna.ink’s writer and reader are asked from the app’s own page, or with a room’s key — this request has neither',
  rate: 'too many asks of dyna.ink’s writer and reader from here — try again in a minute',
  share: 'this address has asked its share of today’s writing and reading on dyna.ink — try again tomorrow, or bring your own model under models',
  spent: 'today’s writing and reading on dyna.ink are spent — try again tomorrow, or bring your own model under models',
  uncounted: 'this relay cannot count what is asked of it (it has no LIMITS binding), so it asks no model',
  noModel: 'this relay has no writer or reader of its own — dyna.ink’s relay has them; here, bring your own model under models',
  noBinding: 'this relay has no Workers AI binding, so it asks no model — bring your own model under models',
  notSet: (short) => `${AI_CHAT_MODELS[short].name} is not set up on this relay — its ${AI_CHAT_MODELS[short].env} is not a Workers AI model`,
  method: 'POST a chat completion to /ai/v1/chat/completions (GET /ai/v1/models lists the models)',
  notJson: 'the body is not JSON',
  tooBig: (bytes) => `that ask is too big — at most ${kb(bytes)} KB with its pictures`,
  tooWordy: (bytes) => `that ask has too many words — at most ${kb(bytes)} KB of them`,
  timeout: (short) => `${AI_CHAT_MODELS[short].name} did not answer in ${AI_CHAT_WAIT_MS / 1000} s`,
  failed: (short, message) => `${AI_CHAT_MODELS[short].name} failed — ${String(message || 'no reason given').slice(0, 160)}`,
  shape: (short) => `${AI_CHAT_MODELS[short].name} answered, but in a shape this relay does not read — neither a response nor a choice`,
  elsewhere: 'this relay asks no model at this address — /ai/v1/chat/completions, /ai/v1/models, /decide and /extract are the ones it has',
};

/** Who may ask for chat on this relay: `MM_AI_CHAT` when it says, else what `MM_DECIDE` says (one switch turns both off), else `limited`. */
export function chatModeOf(env = {}) {
  const own = String(env.MM_AI_CHAT ?? '').trim();
  if (own) return own;
  const decide = String(env.MM_DECIDE ?? '').trim();
  return decide || 'limited';
}

/** How many chat calls a day the relay allows, from its environment: a whole number, else the default. */
export function aiChatDailyFrom(env = {}) {
  const raw = String(env.MM_AI_CHAT_DAILY ?? '').trim();
  const n = Number(raw);
  return raw !== '' && Number.isFinite(n) && n >= 0 && Math.floor(n) === n ? n : DEFAULT_AI_CHAT_DAILY;
}

/**
 * The house models as this relay runs them, from its variables: each short name's `@cf` id (null when the variable
 * names no Workers AI model), whether it sees, its context when known, and the most a reply may be.
 */
export function chatModelsFrom(env = {}) {
  const out = {};
  for (const [short, m] of Object.entries(AI_CHAT_MODELS)) {
    const said = String(env[m.env] ?? '').trim();
    const id = said ? (ID.test(said) ? said : null) : DEFAULT_AI_MODEL;
    const known = id ? AI_KNOWN[id] : null;
    out[short] = {
      short,
      id,
      name: m.name,
      job: m.job,
      label: known ? known.label : null,
      sees: known ? !!known.sees : m.reads,
      context: known && known.context ? known.context : null,
      maxOutput: Math.min(AI_CHAT_LIMITS.maxTokens, known && known.maxOutput ? known.maxOutput : Infinity),
    };
  }
  return out;
}

/** What `GET /ai/v1/models` answers: OpenAI's list, with what core's `parseModelList` reads — the name, the inputs, the context, the reply's limit — and never an `@cf` id. No model is called. */
export function chatCatalog(env = {}) {
  const models = chatModelsFrom(env);
  const data = [];
  const unavailable = [];
  for (const m of Object.values(models)) {
    if (!m.id) { unavailable.push({ id: m.short, why: AI_WORDS.notSet(m.short) }); continue; }
    data.push({
      id: m.short,
      object: 'model',
      owned_by: 'dyna.ink',
      name: m.name,
      description: m.job + ' — ' + (m.label ? m.label + ', ' : 'a model ') + 'on Cloudflare Workers AI, asked by dyna.ink’s relay; no key is needed',
      ...(m.context ? { context_length: m.context } : {}),
      architecture: { input_modalities: m.sees ? ['text', 'image'] : ['text'], output_modalities: ['text'] },
      top_provider: { ...(m.context ? { context_length: m.context } : {}), max_completion_tokens: m.maxOutput },
    });
  }
  return {
    object: 'list',
    data,
    ...(unavailable.length ? { unavailable } : {}),
    limits: { ...AI_CHAT_LIMITS, perMinute: AI_CHAT_PER_MINUTE, perDay: AI_CHAT_PER_DAY },
  };
}

function extraKeys(o, allowed, what) {
  const extra = Object.keys(o).filter((k) => !allowed.includes(k));
  return extra.length ? `${what} carries what this relay does not ask with (${extra.join(', ')})` : null;
}

/** The pictures a body carries, as data URLs, in order. */
export function chatImages(body) {
  const out = [];
  for (const m of isMap(body) && Array.isArray(body.messages) ? body.messages : []) {
    if (!isMap(m) || !Array.isArray(m.content)) continue;
    for (const p of m.content) if (isMap(p) && p.type === 'image_url' && isMap(p.image_url) && typeof p.image_url.url === 'string') out.push(p.image_url.url);
  }
  return out;
}

/**
 * How big a body is without its pictures, in bytes: the words a model reads are held to `AI_CHAT_LIMITS.text` whether
 * or not a picture comes with them — the larger allowance is the pictures' alone. A picture is a data URL, so its
 * bytes are its characters (and the quotes round it).
 */
export function chatTextBytes(body, size) {
  return size - chatImages(body).reduce((n, u) => n + u.length + 2, 0);
}

/** A chat body's shape, in words: null when it may be asked, else why not. `models` is `chatModelsFrom(env)`. */
export function chatCheck(b, models) {
  if (!isMap(b)) return 'the body is not a JSON object';
  const extra = extraKeys(b, ['model', 'messages', 'stream', 'max_tokens', 'temperature', 'top_p'], 'the body');
  if (extra) return extra;
  if (typeof b.model !== 'string' || !Object.prototype.hasOwnProperty.call(AI_CHAT_MODELS, b.model)) return `no model “${String(b.model).slice(0, 60)}” here — ${Object.keys(AI_CHAT_MODELS).join(' or ')}`;
  const m = models[b.model];
  if (b.stream !== undefined && b.stream !== false) return 'this relay answers a whole reply, never a stream — send stream: false';
  if (b.max_tokens !== undefined && !(Number.isInteger(b.max_tokens) && b.max_tokens >= 1)) return 'max_tokens is a whole number, at least 1';
  if (b.temperature !== undefined && !(typeof b.temperature === 'number' && b.temperature >= 0 && b.temperature <= 2)) return 'temperature is a number from 0 to 2';
  if (b.top_p !== undefined && !(typeof b.top_p === 'number' && b.top_p > 0 && b.top_p <= 1)) return 'top_p is a number above 0, at most 1';
  const ms = b.messages;
  if (!Array.isArray(ms) || !ms.length || ms.length > AI_CHAT_LIMITS.messages) return `1–${AI_CHAT_LIMITS.messages} messages an ask`;
  let images = 0;
  for (let i = 0; i < ms.length; i++) {
    const msg = ms[i];
    const at = `message ${i + 1}`;
    if (!isMap(msg)) return `${at}: a message is an object`;
    const mExtra = extraKeys(msg, ['role', 'content'], at);
    if (mExtra) return mExtra;
    if (!ROLES.includes(msg.role)) return `${at}: a message is from the system, the user or the assistant`;
    if (typeof msg.content === 'string') continue;
    if (!Array.isArray(msg.content) || !msg.content.length) return `${at}: its content is words, or a list of parts`;
    for (const p of msg.content) {
      if (!isMap(p)) return `${at}: a part is an object`;
      if (p.type === 'text') {
        const pExtra = extraKeys(p, ['type', 'text'], at + '’s part');
        if (pExtra) return pExtra;
        if (typeof p.text !== 'string') return `${at}: a text part carries its words`;
      } else if (p.type === 'image_url') {
        const pExtra = extraKeys(p, ['type', 'image_url'], at + '’s picture');
        if (pExtra) return pExtra;
        if (!isMap(p.image_url) || extraKeys(p.image_url, ['url', 'detail'], 'a picture') || typeof p.image_url.url !== 'string') return `${at}: a picture is { image_url: { url } }`;
        if (!IMAGE_URL.test(p.image_url.url)) return 'a picture is a PNG, JPEG or WebP data URL';
        images++;
      } else return `${at}: a part is text or a picture`;
    }
    if (msg.role !== 'user' && msg.content.some((p) => p.type === 'image_url')) return `${at}: only the user sends a picture`;
  }
  if (images && !m.sees) return `${m.name} reads no pictures — ask the reader`;
  if (images > AI_CHAT_LIMITS.images) return `at most ${AI_CHAT_LIMITS.images} pictures an ask`;
  return null;
}

/** What the relay hands `env.AI.run`: the messages as they came (OpenAI's shape), and the reply held to the model's limit. */
export function chatInput(b, model) {
  const want = b.max_tokens === undefined ? model.maxOutput : b.max_tokens;
  return {
    messages: b.messages,
    max_tokens: Math.max(1, Math.min(model.maxOutput, want)),
    ...(b.temperature !== undefined ? { temperature: b.temperature } : {}),
    ...(b.top_p !== undefined ? { top_p: b.top_p } : {}),
  };
}

/** A message's content as text: a string, or the text parts of a list joined in order. */
function contentText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((p) => (isMap(p) && (p.type === 'text' || p.type === 'output_text') && typeof p.text === 'string' ? p.text : '')).join('');
}

/** Reasoning out of the content: `<think>…</think>` blocks, and an unclosed one to the end, taken out and kept apart. */
function splitThink(text) {
  const thought = [];
  let rest = text.replace(/<think>([\s\S]*?)<\/think>/gi, (_, t) => { thought.push(t); return ''; });
  const open = rest.search(/<think>/i);
  if (open !== -1) { thought.push(rest.slice(open + 7)); rest = rest.slice(0, open); }
  return { content: rest.trim(), reasoning: thought.join('\n').trim() };
}

const count = (x) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.round(x) : undefined);

/**
 * What the model answered, as OpenAI's `chat.completion`: from Workers AI's `{ response }` or an OpenAI-shaped
 * `{ choices }`, whichever came — the content alone in `content`, a model's reasoning (`reasoning_content`, `reasoning`,
 * a `<think>` block) kept out of it and handed back only when there is no answer, so the page can say the model only
 * thought — with `usage` when it was given, and `finish_reason` when it was said (or `length` when the reply used its
 * whole budget). `{ ok: false, words }` when neither shape came.
 */
export function chatReply(out, short, maxTokens, now = Date.now()) {
  let raw = null;
  let reasoning = '';
  let finish;
  if (isMap(out) && Array.isArray(out.choices) && isMap(out.choices[0]) && isMap(out.choices[0].message)) {
    const c = out.choices[0];
    raw = contentText(c.message.content);
    reasoning = typeof c.message.reasoning_content === 'string' ? c.message.reasoning_content : typeof c.message.reasoning === 'string' ? c.message.reasoning : '';
    if (typeof c.finish_reason === 'string') finish = c.finish_reason;
  } else if (isMap(out) && typeof out.response === 'string') {
    raw = out.response;
    if (typeof out.reasoning_content === 'string') reasoning = out.reasoning_content;
  } else if (isMap(out) && isMap(out.response)) {
    // A model asked for JSON can answer the object itself: its text is the JSON.
    raw = JSON.stringify(out.response);
  }
  if (raw === null) return { ok: false, words: AI_WORDS.shape(short) };
  const split = splitThink(raw);
  const thought = [reasoning, split.reasoning].filter(Boolean).join('\n').trim();
  const u = isMap(out.usage) ? out.usage : null;
  const usage = u ? { prompt_tokens: count(u.prompt_tokens), completion_tokens: count(u.completion_tokens), total_tokens: count(u.total_tokens) } : null;
  if (usage) for (const k of Object.keys(usage)) if (usage[k] === undefined) delete usage[k];
  if (!finish) finish = usage && usage.completion_tokens !== undefined && maxTokens && usage.completion_tokens >= maxTokens ? 'length' : 'stop';
  const message = { role: 'assistant', content: split.content, ...(!split.content && thought ? { reasoning_content: thought } : {}) };
  return {
    ok: true,
    body: {
      id: 'chatcmpl-dyna-' + now.toString(36),
      object: 'chat.completion',
      created: Math.floor(now / 1000),
      model: short,
      choices: [{ index: 0, message, finish_reason: finish }],
      ...(usage && Object.keys(usage).length ? { usage } : {}),
    },
  };
}

/** A refusal, as OpenAI says one — `{ error: { message, code } }` — which core's transport reads as the provider's own words. */
export const chatError = (status, message) => ({ error: { message, code: status } });

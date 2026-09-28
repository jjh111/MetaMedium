// Transport for the LLM tiers. Zero dependencies — `fetch` only.
//
// Ollama, LM Studio, and OpenRouter all speak the OpenAI-compatible
// /v1/chat/completions shape and differ only by base URL and key, so ONE
// client covers all three (ARCHITECTURE-v7 §3). Anthropic's Messages API has
// its own wire shape and gets its own adapter.
//
// Nothing here knows about the canvas. It takes messages, returns text, and
// never throws into the drawing loop — every failure is a returned value.
//
// V1-PLAN J5 (28 Sep 2026): a hosted model is asked, and says why when it
// cannot be. A reply is read the way each provider sends it — content as a
// string or as parts; a reasoning model's text in `reasoning` or
// `reasoning_content` is never taken for its answer, and when there is no
// answer the failure says exactly why. A failure carries its HTTP status and
// a reason a surface can act on, in a sentence with the provider's own words
// (and never the key). Every call carries a budget for the reply, and a call
// to OpenRouter a low reasoning effort and the app's name. And a provider's
// list of models is read for what it says a model can do — whether it exists,
// whether it takes images, how much it reads — with the id's old guess kept
// only for when the list cannot be read.

export type ProviderKind = 'openai-compatible' | 'anthropic';

export interface ProviderConfig {
  kind: ProviderKind;
  /** e.g. http://localhost:11434/v1 (Ollama), https://openrouter.ai/api/v1 */
  baseUrl: string;
  model: string;
  /** Bring-your-own-key. Omitted for local servers, which need none. */
  apiKey?: string;
  /** Display name for attribution; defaults to `llm:<model>`. */
  label?: string;
  /** Abort the request after this many ms. Never blocks drawing regardless. */
  timeoutMs?: number;
  /**
   * Whether this model can look at an image. The one thing the canvas sends as
   * pixels is handwriting — the ink IS the ground truth there, and reading it
   * is a capability a model either has or lacks. Set by the surface from what
   * the server reports; a model without it is simply never asked to read.
   */
  vision?: boolean;
  /** What the provider calls the model, when it said — OpenRouter's `name`, "Z.AI: GLM 5.3 Flash". For sentences; the id stays the id. */
  title?: string;
  /** How many tokens the model reads at once, prompt and reply together, when the provider said. */
  contextLength?: number;
  /** The most tokens the provider lets the model write in one reply, when it said. */
  maxOutput?: number;
}

/** Ready-made configs for the providers v7 targets. `model` still required. */
export const PRESETS = {
  ollama: { kind: 'openai-compatible', baseUrl: 'http://localhost:11434/v1' },
  lmStudio: { kind: 'openai-compatible', baseUrl: 'http://localhost:1234/v1' },
  openRouter: { kind: 'openai-compatible', baseUrl: 'https://openrouter.ai/api/v1' },
  anthropic: { kind: 'anthropic', baseUrl: 'https://api.anthropic.com/v1' },
} as const satisfies Record<string, Pick<ProviderConfig, 'kind' | 'baseUrl'>>;

/** A piece of a message: text, or an image as a data URL. */
export type ContentPart = { type: 'text'; text: string } | { type: 'image'; dataUrl: string };

export interface ChatMessage {
  role: 'system' | 'user';
  content: string | ContentPart[];
}

/** The text of a message, images left out — for system prompts and logs. */
export function textOf(content: string | ContentPart[]): string {
  return typeof content === 'string'
    ? content
    : content.filter((p): p is { type: 'text'; text: string } => p.type === 'text').map((p) => p.text).join('\n');
}

function dataUrlParts(dataUrl: string): { mediaType: string; data: string } | null {
  const m = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl);
  return m ? { mediaType: m[1], data: m[2] } : null;
}

/** OpenAI-compatible content: a string, or parts with `image_url` entries. */
function openAIContent(content: string | ContentPart[]): unknown {
  if (typeof content === 'string') return content;
  return content.map((p) =>
    p.type === 'text' ? { type: 'text', text: p.text } : { type: 'image_url', image_url: { url: p.dataUrl } }
  );
}

/** Anthropic content blocks: images as base64 sources. */
function anthropicContent(content: string | ContentPart[]): unknown {
  if (typeof content === 'string') return content;
  return content.map((p) => {
    if (p.type === 'text') return { type: 'text', text: p.text };
    const parts = dataUrlParts(p.dataUrl);
    return parts
      ? { type: 'image', source: { type: 'base64', media_type: parts.mediaType, data: parts.data } }
      : { type: 'text', text: '(an image the transport could not encode)' };
  });
}

/**
 * Why a call failed, as a word a surface can act on: the key, the credit, the
 * model's id, a rate limit, a refusal, a request the provider would not take,
 * the provider, the network, the clock, the caller, a model that only
 * thought, one cut off before it wrote, an empty reply, a reply that could not
 * be read.
 */
export type FailureReason =
  | 'key' | 'credit' | 'model' | 'rate' | 'refused' | 'request' | 'server'
  | 'network' | 'timeout' | 'cancelled' | 'thinking' | 'length' | 'empty' | 'unreadable';

type Failure = { ok: false; error: string; status?: number; reason?: FailureReason };

/**
 * Success or failure, never a throw — the caller is inside a drawing app.
 *
 * A failure's `error` is the whole sentence a person reads: the HTTP status
 * and what it means, and the provider's own words (`HTTP 401 — bad key: “User
 * not found.”`), never the key. `status` and `reason` say the same for a
 * surface to act on. `error: 'cancelled'` stays the one word callers test for.
 * A success that stopped at the token limit is kept, and says so (`truncated`).
 */
export type CompletionResult =
  | { ok: true; text: string; model: string; truncated?: boolean }
  | Failure;

export const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * A local model gets far longer, because the two failure modes are not alike.
 * A hosted call that hangs for a minute is a network problem worth giving up
 * on; a local call that takes three is usually a 14GB model being paged into
 * memory on its first request, and abandoning it wastes the load and reports a
 * failure to a user whose machine is working perfectly. Measured: a cold
 * devstral:24b took past 30s to answer at all, and 35s warm.
 */
export const LOCAL_TIMEOUT_MS = 300_000;

/**
 * A reply's budget, sent on every OpenAI-compatible call (J5). Unsent, the
 * budget is whatever the provider (or the one OpenRouter routes to) defaults
 * to, and a model that thinks before it answers can spend all of a small one
 * thinking — the reply comes back with its content empty. 8,192 tokens holds
 * the canvas's largest asks (a page's regions, a program) with the thinking a
 * low effort buys before them; it is a ceiling, never a cost, and it is
 * brought under what the provider says the model can write and read when it
 * said (`maxTokensFor`). Anthropic's adapter keeps its own.
 */
export const DEFAULT_MAX_TOKENS = 8192;
/** The least a reply is left when a small context would squeeze it: a reading needs room to be said. */
export const MIN_REPLY_TOKENS = 1024;

/**
 * What OpenRouter is told of reasoning on every call (J5): a low effort. Every
 * ask the canvas makes is a reading (a transcript, a few labels) or a fill
 * whose structure the engine has already decided, so deep thinking buys
 * little, and a model that thinks at length on one word costs the hand a wait
 * — or, with a small budget, its whole answer. Low, not off: some models
 * cannot turn it off (OpenRouter refuses `enabled: false` for them), and a
 * model that must think still may. OpenRouter maps an effort onto whatever the
 * model takes — a share of `max_tokens` for a budget-style model, a level for
 * an effort-style one — and leaves a model that does not reason untouched.
 * Only OpenRouter reads it; no other endpoint is sent it.
 */
export const OPENROUTER_REASONING = { effort: 'low' } as const;

/**
 * Who is asking, in OpenRouter's two optional headers (J5): the site and the
 * name its activity is listed under. Only OpenRouter is sent them — a custom
 * endpoint's CORS may not allow a header it does not know.
 */
export const OPENROUTER_APP = { url: 'https://jjh111.github.io/MetaMedium/', title: 'MetaMedium' } as const;

/**
 * How long a provider's list of models is waited for (J5). OpenRouter's is
 * big — every model it routes to, with its description — so it is read once
 * a page by whoever caches it, and a surface that joins a model never waits on
 * it longer than it chooses to.
 */
export const MODEL_LIST_TIMEOUT_MS = 15_000;

export function providerLabel(config: ProviderConfig): string {
  return config.label ?? `llm:${config.model}`;
}

/**
 * Where a provider runs: on this machine, or hosted. Locality is a COST —
 * local before hosted when the router ranks who to ask — never a tier.
 */
export type Locality = 'local' | 'hosted';
export function providerLocality(config: ProviderConfig): Locality {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(config.baseUrl) ? 'local' : 'hosted';
}

/**
 * Which tier a provider speaks at: 2, always. Tier 0 is the shape rung, tier
 * 1 the engine's instant library, tier 2 a model — local or hosted alike
 * (redressed 6 Sep 2026; before that a local model was "tier 1", which made
 * a tier a place rather than a kind of knowing).
 *
 * This labels a voice so surfaces can group by tier. It does NOT rank one
 * above another — tiers are simultaneous, and no reading is suppressed by
 * another (ARCHITECTURE-v7 §4.1).
 */
export function providerTier(config: ProviderConfig): 2 {
  void config;
  return 2;
}

/** The host a URL names, with its port: "openrouter.ai", "127.0.0.1:8080". */
function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^[a-z]+:\/\//i, '').split('/')[0];
  }
}

/** Whether an endpoint is OpenRouter's, by its host — what decides the headers and the reasoning setting. */
export function isOpenRouter(baseUrl: string): boolean {
  return /^openrouter\.ai$/i.test(hostOf(baseUrl));
}

const NAMED: [RegExp, string][] = [
  [/^openrouter\.ai$/i, 'OpenRouter'],
  [/^api\.anthropic\.com$/i, 'Anthropic'],
  [/^api\.openai\.com$/i, 'OpenAI'],
  [/^(localhost|127\.0\.0\.1|\[::1\]):11434$/i, 'Ollama'],
  [/^(localhost|127\.0\.0\.1|\[::1\]):1234$/i, 'LM Studio'],
];

/**
 * Where a provider is, in words (J5): the service by its name — "OpenRouter",
 * "Ollama" — or the host it answers at. `on` is the phrase a sentence puts it
 * in: "no model called x on OpenRouter", "… at 127.0.0.1:8080".
 */
export function whereOf(baseUrl: string): { name: string; on: string } {
  const host = hostOf(baseUrl);
  const named = NAMED.find(([re]) => re.test(host));
  return named ? { name: named[1], on: 'on ' + named[1] } : { name: host, on: 'at ' + host };
}

/**
 * A model's name as a sentence says it (J5): what its provider calls it, less
 * the vendor ("Z.AI: GLM 5.3 Flash" → "GLM 5.3 Flash"); else its id, less the
 * vendor's path and with colons as spaces ("z-ai/glm-4.7-flash" →
 * "glm-4.7-flash", "qwen3.5:9b" → "qwen3.5 9b"). The id stays the id
 * everywhere it is an id.
 */
export function modelWords(config: { model: string; title?: string }): string {
  const title = (config.title || '').trim();
  if (title) return title.replace(/^[^:]{1,40}:\s+/, '') || title;
  const id = String(config.model || '').replace(/^~/, '');
  const tail = id.includes('/') ? id.slice(id.lastIndexOf('/') + 1) : id;
  return tail.replace(/:/g, ' ').trim() || id;
}

/** A count with its thousands marked, the same in every locale: 8192 → "8,192". */
function countWords(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** "a", "a and b", "a, b and c". */
function andList(items: string[]): string {
  return items.length <= 1 ? items.join('') : items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
}

/** "a", "a or b", "a, b or c". */
function orList(items: string[]): string {
  return items.length <= 1 ? items.join('') : items.slice(0, -1).join(', ') + ' or ' + items[items.length - 1];
}

/** A wait, in words: "20 ms", "60 s". */
function waitWords(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${Math.round(ms / 100) / 10} s`;
}

/** Text a provider sent, short enough for a sentence. */
function clip(text: string, n = 200): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

/** A key never goes into a sentence, even when a provider echoes it back. */
function redact(text: string, key?: string): string {
  return key && key.length >= 6 ? text.split(key).join('(the key)') : text;
}

/**
 * A signal that trips on timeout, or when the caller gives up first.
 *
 * The caller's signal matters as much as the clock. A local server answers one
 * request at a time, so a reading nobody asked for can sit in front of the thing
 * the human actually typed — and the only honest fix is to be able to take it
 * back.
 */
function withTimeout(ms: number, external?: AbortSignal): { signal: AbortSignal; done: () => void } {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  const relay = () => ctl.abort();
  if (external) {
    if (external.aborted) ctl.abort();
    else external.addEventListener('abort', relay, { once: true });
  }
  return {
    signal: ctl.signal,
    done: () => {
      clearTimeout(t);
      external?.removeEventListener('abort', relay);
    },
  };
}

// ===== A failure, in words ===================================================

/** What each HTTP status means to a person asking a model, and the reason it is filed under. */
const GLOSS: Record<number, [string, FailureReason]> = {
  400: ['the request was refused', 'request'],
  401: ['bad key', 'key'],
  402: ['no credit', 'credit'],
  403: ['not allowed', 'refused'],
  404: ['no such model, or no such endpoint', 'model'],
  408: ['the provider timed out', 'timeout'],
  413: ['the request is too large', 'request'],
  422: ['the request could not be read', 'request'],
  429: ['rate limited', 'rate'],
  500: ['the provider failed', 'server'],
  502: ["the model's provider failed or is down", 'server'],
  503: ['no provider is available right now', 'server'],
  504: ['the provider timed out', 'timeout'],
  524: ['the provider timed out', 'timeout'],
  529: ['the provider is overloaded', 'server'],
};

function gloss(status: number): [string, FailureReason] {
  return GLOSS[status] ?? (status >= 500 ? ['the provider failed', 'server'] : ['refused', 'request']);
}

function firstString(...candidates: unknown[]): string | undefined {
  for (const c of candidates) if (typeof c === 'string' && c.length > 0) return c;
  return undefined;
}

function firstNumber(...candidates: unknown[]): number | undefined {
  for (const c of candidates) if (typeof c === 'number' && Number.isFinite(c) && c > 0) return c;
  return undefined;
}

type Loose = Record<string, unknown> & { [k: string]: any };

/**
 * What the provider behind a router said, when the router passed it on:
 * OpenRouter's `error.metadata` carries the upstream provider's name and its
 * raw reply, which is where the useful words are ("Provider returned error"
 * alone says nothing).
 */
function upstream(meta: unknown): string | undefined {
  if (!meta || typeof meta !== 'object') return undefined;
  const m = meta as Loose;
  let said: string | undefined;
  if (typeof m.raw === 'string') {
    try {
      const r = JSON.parse(m.raw) as Loose;
      said = firstString(r?.error?.message, typeof r?.error === 'string' ? r.error : undefined, r?.message) ?? m.raw;
    } catch {
      said = m.raw;
    }
  } else if (m.raw && typeof m.raw === 'object') {
    said = firstString((m.raw as Loose).error?.message, (m.raw as Loose).message);
  }
  if (!said) return undefined;
  const who = firstString(m.provider_name);
  return (who ? `${who}: ` : '') + `“${clip(said)}”`;
}

/** The provider's own words in an error body: OpenAI's and OpenRouter's `error.message`, a bare `error`, `message`, FastAPI's `detail` — or the text itself. */
function providerWords(text: string): { message?: string; also?: string } {
  let j: Loose | null = null;
  try {
    j = JSON.parse(text) as Loose;
  } catch {
    /* not JSON */
  }
  if (j && typeof j === 'object') {
    const e = j.error;
    const message = firstString(typeof e === 'string' ? e : e?.message, j.message, typeof j.detail === 'string' ? j.detail : j.detail?.message);
    return { message, also: upstream(e?.metadata) };
  }
  const plain = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return { message: plain || undefined };
}

/** An HTTP error, said in full: `HTTP 401 — bad key: “User not found.”`. */
function httpFailure(status: number, text: string, key?: string): Failure {
  const [g, reason] = gloss(status);
  const { message, also } = providerWords(text);
  const error = `HTTP ${status} — ${g}` + (message ? `: “${clip(message)}”` : '') + (also ? ` (${also})` : '');
  return { ok: false, error: redact(error, key), status, reason };
}

/** An error the provider put inside a reply that came back 200 — OpenRouter does, when the provider behind it failed. */
function inReplyFailure(e: unknown, key?: string): Failure {
  const x = (e && typeof e === 'object' ? e : { message: String(e) }) as Loose;
  const code = typeof x.code === 'number' ? x.code : Number(x.code) || undefined;
  const [g, reason] = code ? gloss(code) : ['the provider failed', 'server' as FailureReason];
  const message = firstString(x.message);
  const also = upstream(x.metadata);
  const error = `the reply was an error${code ? `, code ${code}` : ''} — ${g}` + (message ? `: “${clip(message)}”` : '') + (also ? ` (${also})` : '');
  return { ok: false, error: redact(error, key), reason, ...(code ? { status: code } : {}) };
}

/**
 * A request that never came back. The caller gave up, the clock ran out, or
 * the browser could not reach the host — which it says the same way whether
 * the network is down, nothing listens there, or CORS refused the page, so
 * those are said as one.
 */
function thrownFailure(err: unknown, where: string, timeoutMs: number, external: AbortSignal | undefined, signal: AbortSignal): Failure {
  if (external?.aborted) return { ok: false, error: 'cancelled', reason: 'cancelled' };
  if (signal.aborted) return { ok: false, error: `timed out — no answer from ${where} in ${waitWords(timeoutMs)}`, reason: 'timeout' };
  const msg = err instanceof Error ? err.message : String(err);
  return {
    ok: false,
    error: `could not reach ${where} — offline, the server is not running, or it does not let this page ask (CORS); the browser does not say which (${msg})`,
    reason: 'network',
  };
}

async function post(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  timeoutMs: number,
  external: AbortSignal | undefined,
  key: string | undefined
): Promise<{ ok: true; json: unknown } | Failure> {
  const where = hostOf(url);
  const { signal, done } = withTimeout(timeoutMs, external);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal,
    });
    const text = await res.text();
    if (!res.ok) return httpFailure(res.status, text, key);
    try {
      return { ok: true, json: JSON.parse(text) };
    } catch {
      return { ok: false, error: redact(`${where} answered, but not with JSON: “${clip(text, 120)}”`, key), reason: 'unreadable' };
    }
  } catch (err) {
    return thrownFailure(err, where, timeoutMs, external, signal);
  } finally {
    done();
  }
}

/**
 * Drop a model's reasoning so only its answer remains.
 *
 * qwen3 and its relatives think out loud inside `<think>…</think>` before the
 * reply, and some servers stream the reasoning as content rather than in a
 * separate field. A `{` inside that block is exactly what the tolerant JSON
 * readers downstream would latch onto, so it goes before they ever see it.
 * An unclosed block is treated as all reasoning: nothing usable followed.
 */
export function stripThink(text: string): string {
  const stripped = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  const open = stripped.search(/<think>/i);
  return (open === -1 ? stripped : stripped.slice(0, open)).trim();
}

// ===== A reply, read the way the provider sends it ===========================

/** A message's content as text: a string, or the text parts of a list joined in order — a thinking part is not the answer. */
function contentText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((p) => (p && typeof p === 'object' && ((p as Loose).type === 'text' || (p as Loose).type === 'output_text') && typeof (p as Loose).text === 'string' ? (p as Loose).text : ''))
    .join('');
}

/** Whether a message carries reasoning, however the provider spells it. */
function hasReasoning(m: Loose): boolean {
  if (firstString(m.reasoning, m.reasoning_content, m.thinking)) return true;
  if (Array.isArray(m.reasoning_details) && m.reasoning_details.length > 0) return true;
  if (Array.isArray(m.content) && m.content.some((p: unknown) => p && typeof p === 'object' && ((p as Loose).type === 'thinking' || (p as Loose).type === 'reasoning'))) return true;
  return false;
}

/**
 * An OpenAI-compatible reply, read (J5). The answer is taken from `content`
 * only — a string, or the text parts of a list — with any `<think>` block
 * dropped. A reasoning model's text in `reasoning`, `reasoning_content` or a
 * thinking part is never read as its answer; when there is no answer, the
 * failure says exactly why: it spent its whole budget thinking, it thought and
 * stopped, it hit the limit before writing, a filter withheld it, it declined,
 * or it said nothing. An error OpenRouter puts inside a 200 is a failure too.
 */
function readOpenAIReply(body: unknown, config: ProviderConfig): CompletionResult {
  const b = (body && typeof body === 'object' ? body : {}) as Loose;
  const who = modelWords(config);
  if (b.error && !Array.isArray(b.choices)) return inReplyFailure(b.error, config.apiKey);
  const choice = (Array.isArray(b.choices) ? b.choices[0] : undefined) as Loose | undefined;
  if (!choice || typeof choice !== 'object') return { ok: false, error: `${hostOf(config.baseUrl)} answered with no choices — nothing from ${who}`, reason: 'unreadable' };
  if (choice.error) return inReplyFailure(choice.error, config.apiKey);
  const message = (choice.message && typeof choice.message === 'object' ? choice.message : {}) as Loose;
  const finish = firstString(choice.finish_reason, choice.native_finish_reason);
  const content = contentText(message.content);
  // Reasoning is not an answer. Stripped here, before any reader downstream
  // can mistake a brace inside the model's thinking for the start of its reply.
  const answer = stripThink(content);
  if (answer) {
    return { ok: true, text: answer, model: firstString(b.model) ?? config.model, ...(finish === 'length' ? { truncated: true } : {}) };
  }
  if (typeof message.refusal === 'string' && message.refusal.trim()) {
    return { ok: false, error: redact(`${who} declined: “${clip(message.refusal)}”`, config.apiKey), reason: 'refused' };
  }
  if (finish === 'content_filter') return { ok: false, error: `${who}'s answer was withheld by the provider's content filter`, reason: 'refused' };
  const thought = hasReasoning(message) || /<think>/i.test(content);
  const tokens = typeof b.usage?.completion_tokens === 'number' ? b.usage.completion_tokens : undefined;
  if (thought && finish === 'length') {
    return {
      ok: false,
      error: `${who} spent its whole budget thinking — no answer came back (it stopped at the token limit${tokens ? `, ${countWords(tokens)} tokens` : ''})`,
      reason: 'thinking',
    };
  }
  if (thought) return { ok: false, error: `${who} thought but gave no answer — only its reasoning came back`, reason: 'thinking' };
  if (finish === 'length') return { ok: false, error: `${who} hit the token limit before it wrote anything`, reason: 'length' };
  return { ok: false, error: `${who} answered with nothing`, reason: 'empty' };
}

/** About how many tokens a prompt is: ~3.5 characters a token, ~1,000 an image. A budget's estimate, never a count. */
function promptTokens(messages: ChatMessage[]): number {
  let chars = 0;
  let images = 0;
  for (const m of messages) {
    if (typeof m.content === 'string') chars += m.content.length;
    else for (const p of m.content) if (p.type === 'text') chars += p.text.length; else images++;
  }
  return Math.ceil(chars / 3.5) + images * 1000;
}

/**
 * The reply's budget for this call (J5): `DEFAULT_MAX_TOKENS`, under what the
 * provider said the model may write, and under what is left of its context
 * once the prompt is in — never below `MIN_REPLY_TOKENS`, where a context
 * that small is the provider's to refuse, in its own words.
 */
export function maxTokensFor(config: ProviderConfig, messages: ChatMessage[]): number {
  let n = DEFAULT_MAX_TOKENS;
  if (config.maxOutput && config.maxOutput > 0) n = Math.min(n, config.maxOutput);
  if (config.contextLength && config.contextLength > 0) {
    const room = config.contextLength - promptTokens(messages) - 256;
    n = Math.min(n, Math.max(Math.min(MIN_REPLY_TOKENS, config.contextLength), room));
  }
  return Math.max(1, Math.floor(n));
}

/** OpenAI-compatible: Ollama, LM Studio, OpenRouter, and anything else /v1. */
async function completeOpenAICompatible(
  config: ProviderConfig,
  messages: ChatMessage[],
  timeoutMs: number,
  external?: AbortSignal
): Promise<CompletionResult> {
  const headers: Record<string, string> = {};
  if (config.apiKey) headers.authorization = `Bearer ${config.apiKey}`;
  const body: Record<string, unknown> = {
    model: config.model,
    messages: messages.map((m) => ({ role: m.role, content: openAIContent(m.content) })),
    stream: false,
    max_tokens: maxTokensFor(config, messages),
  };
  if (isOpenRouter(config.baseUrl)) {
    headers['HTTP-Referer'] = OPENROUTER_APP.url;
    headers['X-Title'] = OPENROUTER_APP.title;
    body.reasoning = { ...OPENROUTER_REASONING };
  }

  const res = await post(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, headers, body, timeoutMs, external, config.apiKey);
  if (!res.ok) return res;
  return readOpenAIReply(res.json, config);
}

/**
 * Anthropic Messages API.
 *
 * `max_tokens` is a hard cap on thinking AND response text, and thinking is on
 * by default on current models — so this leaves generous headroom rather than
 * the tight budget an answer alone would need.
 */
async function completeAnthropic(
  config: ProviderConfig,
  messages: ChatMessage[],
  timeoutMs: number,
  external?: AbortSignal
): Promise<CompletionResult> {
  if (!config.apiKey) return { ok: false, error: 'anthropic requires an API key', reason: 'key' };

  const system = messages.filter((m) => m.role === 'system').map((m) => textOf(m.content)).join('\n\n');
  const user = messages.filter((m) => m.role === 'user');
  if (user.length === 0) return { ok: false, error: 'no user message', reason: 'request' };

  const res = await post(
    `${config.baseUrl.replace(/\/$/, '')}/messages`,
    {
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      // The canvas is a browser surface; without this the API rejects the
      // request rather than the browser blocking it at CORS.
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    {
      model: config.model,
      max_tokens: 4096,
      ...(system ? { system } : {}),
      messages: user.map((m) => ({ role: 'user', content: anthropicContent(m.content) })),
    },
    timeoutMs,
    external,
    config.apiKey
  );
  if (!res.ok) return res;

  const body = res.json as {
    content?: { type?: string; text?: string }[];
    model?: string;
    stop_reason?: string;
    error?: unknown;
  };
  if (body?.error && !Array.isArray(body.content)) return inReplyFailure(body.error, config.apiKey);

  // Check stop_reason before reading content — a refusal carries no text.
  if (body?.stop_reason === 'refusal') {
    return { ok: false, error: 'model declined the request', reason: 'refused' };
  }

  const text = body?.content?.find((b) => b?.type === 'text')?.text;
  if (typeof text !== 'string' || !text.trim()) {
    const who = modelWords(config);
    const thought = !!body?.content?.some((b) => b?.type === 'thinking' || b?.type === 'redacted_thinking');
    if (thought && body?.stop_reason === 'max_tokens') return { ok: false, error: `${who} spent its whole budget thinking — no answer came back (it stopped at the token limit)`, reason: 'thinking' };
    return { ok: false, error: `${who} answered with no text`, reason: thought ? 'thinking' : 'empty' };
  }
  return { ok: true, text, model: firstString(body.model) ?? config.model, ...(body.stop_reason === 'max_tokens' ? { truncated: true } : {}) };
}

/**
 * Ask a provider for a completion.
 *
 * Resolves with `{ok:false, error}` on any failure — network, timeout, bad
 * payload, refusal. Callers degrade to Tier 0; nothing here can break drawing.
 */
export async function complete(
  config: ProviderConfig,
  messages: ChatMessage[],
  opts: { signal?: AbortSignal } = {}
): Promise<CompletionResult> {
  const timeoutMs =
    config.timeoutMs ?? (providerLocality(config) === 'local' ? LOCAL_TIMEOUT_MS : DEFAULT_TIMEOUT_MS);
  try {
    return config.kind === 'anthropic'
      ? await completeAnthropic(config, messages, timeoutMs, opts.signal)
      : await completeOpenAICompatible(config, messages, timeoutMs, opts.signal);
  } catch (err) {
    return { ok: false, error: redact(err instanceof Error ? err.message : String(err), config.apiKey), reason: 'unreadable' };
  }
}

// ===== What a provider's list says a model can do (J5) =======================

export interface ModelList {
  ok: boolean;
  models: string[];
  error?: string;
}

/** What a provider's list says of one model. A field it did not say is absent, never guessed. */
export interface ModelInfo {
  id: string;
  /** What the provider calls it: OpenRouter's `name`, Anthropic's `display_name`. */
  title?: string;
  /** What it takes, as the list says: ['text', 'image', 'video']. */
  inputs?: string[];
  /** Whether it takes images: from `inputs`, LM Studio's `vlm`, a capabilities list — absent when the list does not say. */
  vision?: boolean;
  contextLength?: number;
  maxOutput?: number;
  /** The request parameters the provider says it takes (OpenRouter's `supported_parameters`). */
  parameters?: string[];
  /** Whether it reasons before it answers, when the list says. */
  reasons?: boolean;
}

/** A provider's list of models, read — or why it could not be. */
export interface ModelCatalog {
  ok: boolean;
  models: ModelInfo[];
  /** Whether the list says what its models take, not only their ids — a plain OpenAI list names ids only. */
  describes: boolean;
  error?: string;
  reason?: FailureReason;
}

/**
 * What joining a model is told of it: whether it sees, and where that came
 * from — the provider's list, what the list said when it last joined, or the
 * id's guess — in a sentence (`said`), and in a clause the surface can put
 * after "reads text only" (`because`).
 */
export interface ModelFacts {
  vision: boolean;
  from: 'provider' | 'remembered' | 'id';
  said: string;
  because: string;
  title?: string;
  inputs?: string[];
  contextLength?: number;
  maxOutput?: number;
  reasons?: boolean;
}

function stringsOf(v: unknown): string[] | undefined {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined;
}

/** What a row of a list says it takes: OpenRouter's `architecture.input_modalities` (or its `modality`, "text+image->text"), or a top-level list. */
function inputsOf(x: Loose): string[] | undefined {
  const listed = stringsOf(x.architecture?.input_modalities) ?? stringsOf(x.input_modalities) ?? stringsOf(x.modalities?.input);
  if (listed && listed.length) return listed;
  const modality = firstString(x.architecture?.modality);
  if (modality && modality.includes('->')) return modality.split('->')[0].split('+').map((s) => s.trim()).filter(Boolean);
  return undefined;
}

/** Whether a row says its model sees, when it says so without an inputs list: LM Studio's type, a capabilities list or map. */
function visionOf(x: Loose): boolean | undefined {
  if (x.type === 'vlm') return true;
  if (x.type === 'llm') return false;
  if (Array.isArray(x.capabilities)) {
    if (x.capabilities.includes('vision')) return true;
    if (x.capabilities.includes('completion')) return false;
    return undefined;
  }
  if (x.capabilities && typeof x.capabilities === 'object' && typeof x.capabilities.vision === 'boolean') return x.capabilities.vision;
  return undefined;
}

/**
 * A provider's list of models, parsed (J5): OpenRouter's rows with their
 * inputs, context, output limit and parameters; LM Studio's own, typed `vlm`
 * or `llm`, with `max_context_length`; a list with capabilities (Ollama's,
 * Mistral's); a plain OpenAI list, which names ids only — so `describes` says
 * whether anything beyond the id was said.
 */
export function parseModelList(body: unknown): { models: ModelInfo[]; describes: boolean } {
  const b = body as Loose;
  const rows: unknown[] = Array.isArray(body) ? body : Array.isArray(b?.data) ? b.data : Array.isArray(b?.models) ? b.models : [];
  const models: ModelInfo[] = [];
  let describes = false;
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    const x = r as Loose;
    const id = firstString(x.id, x.model, x.name);
    if (!id) continue;
    const m: ModelInfo = { id };
    const title = firstString(x.id ? x.name : undefined, x.display_name);
    if (title && title !== id) m.title = title;
    const inputs = inputsOf(x);
    if (inputs) m.inputs = inputs;
    const vision = inputs ? inputs.includes('image') : visionOf(x);
    if (vision !== undefined) {
      m.vision = vision;
      describes = true;
    }
    const context = firstNumber(x.context_length, x.top_provider?.context_length, x.max_context_length, x.context_window, x.max_model_len, x.loaded_context_length);
    if (context) m.contextLength = context;
    const out = firstNumber(x.top_provider?.max_completion_tokens, x.max_completion_tokens, x.max_output_tokens);
    if (out) m.maxOutput = out;
    const parameters = stringsOf(x.supported_parameters);
    if (parameters) {
      m.parameters = parameters;
      m.reasons = parameters.includes('reasoning') || parameters.includes('include_reasoning');
    } else if (Array.isArray(x.capabilities) && x.capabilities.includes('thinking')) {
      m.reasons = true;
    }
    models.push(m);
  }
  return { models, describes };
}

/**
 * A provider's list of models, read (J5). OpenRouter's is public, so its key
 * is not sent — a key goes nowhere it is not needed; any other endpoint's is
 * read with the key, which it may need. Never throws, and never waits past
 * `timeoutMs`; a failure is said as a completion's is.
 */
export async function readModels(
  config: Pick<ProviderConfig, 'baseUrl' | 'apiKey'>,
  opts: { timeoutMs?: number; signal?: AbortSignal } = {}
): Promise<ModelCatalog> {
  const url = `${config.baseUrl.replace(/\/$/, '')}/models`;
  const where = hostOf(url);
  const timeoutMs = opts.timeoutMs ?? MODEL_LIST_TIMEOUT_MS;
  const headers: Record<string, string> = {};
  if (config.apiKey && !isOpenRouter(config.baseUrl)) headers.authorization = `Bearer ${config.apiKey}`;
  const { signal, done } = withTimeout(timeoutMs, opts.signal);
  const failed = (f: Failure): ModelCatalog => ({ ok: false, models: [], describes: false, error: f.error, ...(f.reason ? { reason: f.reason } : {}) });
  try {
    const res = await fetch(url, { headers, signal });
    const text = await res.text();
    if (!res.ok) return failed(httpFailure(res.status, text, config.apiKey));
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return failed({ ok: false, error: `${where} answered, but not with a list of models`, reason: 'unreadable' });
    }
    const { models, describes } = parseModelList(json);
    return { ok: true, models, describes };
  } catch (err) {
    return failed(thrownFailure(err, where, timeoutMs, opts.signal, signal));
  } finally {
    done();
  }
}

/**
 * What an OpenAI-compatible server is currently serving: its ids, sorted.
 *
 * Reports whether it could ask, separately from what came back. Returning a
 * bare `[]` made "this server has no models" and "there is no server" the same
 * answer, and only one of those is worth telling the user about.
 */
export async function listModels(config: Pick<ProviderConfig, 'baseUrl' | 'apiKey'>): Promise<ModelList> {
  const c = await readModels(config, { timeoutMs: 5_000 });
  return c.ok ? { ok: true, models: c.models.map((m) => m.id).sort() } : { ok: false, models: [], error: c.error };
}

/** An id's words, for comparing ids: "~z-ai/glm-5.3-flash" → z, ai, glm, 5, 3, flash. */
function idWords(id: string): string[] {
  return id.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = up;
    }
  }
  return prev[b.length];
}

/**
 * The listed ids nearest one that is not listed (J5), best first: those that
 * hold most of its words (a word one letter off, or the start of another,
 * holds three quarters of one), then those with the fewest words besides,
 * then the fewest edits, then the list's own order. An id that shares under
 * half its words with every listed one has no nearest.
 */
export function nearestModelIds(id: string, ids: string[], n = 3): string[] {
  const want = idWords(id);
  if (!want.length) return [];
  const flat = want.join('');
  return ids
    .map((cand, order) => {
      const have = idWords(cand);
      let held = 0;
      for (const w of want) {
        if (have.includes(w)) held += 1;
        else if (w.length >= 3 && have.some((h) => h.length >= 3 && (h.startsWith(w) || w.startsWith(h) || editDistance(h, w) <= 1))) held += 0.75;
      }
      const extra = have.filter((h) => !want.includes(h)).length;
      return { cand, order, held, extra, edits: editDistance(flat, have.join('')) };
    })
    .filter((s) => s.held >= Math.max(1, want.length / 2))
    .sort((a, b) => b.held - a.held || a.extra - b.extra || a.edits - b.edits || a.order - b.order)
    .slice(0, n)
    .map((s) => s.cand);
}

/**
 * Whether a model sees, guessed from its id — the fallback only (J5), for
 * when the provider's list cannot be read or does not say. It was the only
 * evidence before, and "glm" was not in it: GLM 5.3 Flash, which takes images,
 * was never asked to read.
 */
export function guessVision(model: string): boolean {
  return /claude|gpt-4o|gpt-4\.1|gpt-5|gemini|qwen3\.5|qwen.*vl|vision|pixtral|llava|glm-[\d.]+v\b|[-_.]vl\b|vlm/i.test(model);
}

/**
 * The facts a join is given (J5), from the provider's list (or its failure):
 *
 * - listed, and the list says what it takes → whether it sees, from the list;
 * - not listed, where the list could be read → refused, with the nearest ids;
 * - listed but what it takes not said, or the list could not be read → what
 *   the list said when it last joined (`remembered`), else the id's guess —
 *   and the sentence says which.
 */
export function modelFacts(
  id: string,
  catalog: ModelCatalog,
  where: { name: string; on: string },
  remembered?: { vision?: boolean; title?: string }
): { ok: true; facts: ModelFacts } | { ok: false; error: string; near: string[] } {
  const fallback = (why: string, title?: string): { ok: true; facts: ModelFacts } => {
    if (remembered && typeof remembered.vision === 'boolean') {
      const vision = remembered.vision;
      return {
        ok: true,
        facts: {
          vision, from: 'remembered',
          said: `${why} — ${vision ? 'it sees' : 'it reads text only'}, as its provider said when it last joined`,
          because: `as its provider said when it last joined; ${why}`,
          ...((title ?? remembered.title) ? { title: title ?? remembered.title } : {}),
        },
      };
    }
    const vision = guessVision(id);
    return {
      ok: true,
      facts: {
        vision, from: 'id',
        said: `${why} — ${vision ? 'it sees' : 'it reads text only'}, guessed from its id`,
        because: `guessed from its id; ${why}`,
        ...(title ? { title } : {}),
      },
    };
  };

  if (!catalog.ok) return fallback(`${where.name}'s model list could not be read (${catalog.error ?? 'no answer'})`);

  const m = catalog.models.find((x) => x.id === id);
  if (!m) {
    const near = nearestModelIds(id, catalog.models.map((x) => x.id));
    return {
      ok: false,
      near,
      error: `no model called ${id} ${where.on}` + (near.length
        ? ` — did you mean ${orList(near)}?`
        : ` — it lists ${catalog.models.length} model${catalog.models.length === 1 ? '' : 's'}, none like it`),
    };
  }
  if (m.vision === undefined) return fallback(`${where.name} lists ${id} but does not say what it takes`, m.title);

  const words = modelWords({ model: m.id, title: m.title });
  const sees = m.vision ? 'it sees' : 'it reads text only';
  const context = m.contextLength ? `; ${countWords(m.contextLength)} tokens of context` : '';
  const facts: ModelFacts = {
    vision: m.vision,
    from: 'provider',
    said: m.inputs
      ? `${where.name} says ${words} takes ${andList(m.inputs)} — ${sees}${context}`
      : `${where.name} says ${words} ${m.vision ? 'sees' : 'reads text only'}${context}`,
    because: m.inputs ? `${where.name} says it takes ${andList(m.inputs)}` : `${where.name} says ${m.vision ? 'it sees' : 'it reads text only'}`,
  };
  if (m.title) facts.title = m.title;
  if (m.inputs) facts.inputs = m.inputs;
  if (m.contextLength) facts.contextLength = m.contextLength;
  if (m.maxOutput) facts.maxOutput = m.maxOutput;
  if (m.reasons !== undefined) facts.reasons = m.reasons;
  return { ok: true, facts };
}

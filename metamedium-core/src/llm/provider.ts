// Transport for the LLM tiers. Zero dependencies — `fetch` only.
//
// Ollama, LM Studio, and OpenRouter all speak the OpenAI-compatible
// /v1/chat/completions shape and differ only by base URL and key, so ONE
// client covers all three (ARCHITECTURE-v7 §3). Anthropic's Messages API has
// its own wire shape and gets its own adapter.
//
// Nothing here knows about the canvas. It takes messages, returns text, and
// never throws into the drawing loop — every failure is a returned value.

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
 * model's id, a rate limit, the provider, the network, the clock, the caller,
 * a model that only thought, a reply with nothing in it.
 */
export type FailureReason =
  | 'key' | 'credit' | 'model' | 'rate' | 'refused' | 'request' | 'server'
  | 'network' | 'timeout' | 'cancelled' | 'thinking' | 'length' | 'empty' | 'unreadable';

/** Success or failure, never a throw — the caller is inside a drawing app. */
export type CompletionResult =
  | { ok: true; text: string; model: string; truncated?: boolean }
  | { ok: false; error: string; status?: number; reason?: FailureReason };

/** A reply's budget when the provider has said nothing of the model's limits (J5). */
export const DEFAULT_MAX_TOKENS = 8192;
/** What OpenRouter is told of reasoning on every call (J5). */
export const OPENROUTER_REASONING = { effort: 'low' } as const;
/** Who is asking, in OpenRouter's two optional headers (J5). */
export const OPENROUTER_APP = { url: 'https://jjh111.github.io/MetaMedium/', title: 'MetaMedium' } as const;
/** How long a provider's list of models is waited for (J5). */
export const MODEL_LIST_TIMEOUT_MS = 15_000;

/** A model's name as a sentence says it (J5). Not yet: J5 red. */
export function modelWords(config: { model: string; title?: string }): string {
  return config.model;
}

/** The reply's budget for this call (J5). Not yet: J5 red. */
export function maxTokensFor(config: ProviderConfig, messages: ChatMessage[]): number {
  void config; void messages;
  return 0;
}

/** Where a provider is, in words (J5). Not yet: J5 red. */
export function whereOf(baseUrl: string): { name: string; on: string } {
  return { name: baseUrl, on: 'at ' + baseUrl };
}

/** What a provider's list says of one model (J5). */
export interface ModelInfo {
  id: string;
  title?: string;
  inputs?: string[];
  vision?: boolean;
  contextLength?: number;
  maxOutput?: number;
  parameters?: string[];
  reasons?: boolean;
}

/** A provider's list of models, read — or why it could not be (J5). */
export interface ModelCatalog {
  ok: boolean;
  models: ModelInfo[];
  describes: boolean;
  error?: string;
  reason?: FailureReason;
}

/** What joining a model is told of it (J5). */
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

/** Parse a provider's list of models (J5). Not yet: J5 red. */
export function parseModelList(body: unknown): { models: ModelInfo[]; describes: boolean } {
  void body;
  return { models: [], describes: false };
}

/** Read a provider's list of models (J5). Not yet: J5 red. */
export async function readModels(
  config: Pick<ProviderConfig, 'baseUrl' | 'apiKey'>,
  opts: { timeoutMs?: number; signal?: AbortSignal } = {}
): Promise<ModelCatalog> {
  void config; void opts;
  return { ok: false, models: [], describes: false, error: 'not yet (J5 red)' };
}

/** The ids nearest one that is not listed (J5). Not yet: J5 red. */
export function nearestModelIds(id: string, ids: string[], n = 3): string[] {
  void id; void ids; void n;
  return [];
}

/** Whether a model sees, guessed from its id — the fallback (J5). Not yet: J5 red. */
export function guessVision(model: string): boolean {
  void model;
  return false;
}

/** The facts a join is given (J5). Not yet: J5 red. */
export function modelFacts(
  id: string,
  catalog: ModelCatalog,
  where: { name: string; on: string },
  remembered?: { vision?: boolean; title?: string }
): { ok: true; facts: ModelFacts } | { ok: false; error: string; near: string[] } {
  void id; void catalog; void where; void remembered;
  return { ok: false, error: 'not yet (J5 red)', near: [] };
}

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

async function post(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  timeoutMs: number,
  external?: AbortSignal
): Promise<{ ok: true; json: unknown } | { ok: false; error: string }> {
  const { signal, done } = withTimeout(timeoutMs, external);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { ok: false, error: `HTTP ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}` };
    }
    return { ok: true, json: await res.json() };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Distinguish the two ways a request can be cut short: the caller gave up,
    // or the clock ran out. Only one of them is worth reporting as a failure.
    if (external?.aborted) return { ok: false, error: 'cancelled' };
    return { ok: false, error: signal.aborted ? `timed out after ${timeoutMs}ms` : msg };
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

function firstString(...candidates: unknown[]): string | undefined {
  for (const c of candidates) if (typeof c === 'string' && c.length > 0) return c;
  return undefined;
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

  const res = await post(
    `${config.baseUrl.replace(/\/$/, '')}/chat/completions`,
    headers,
    { model: config.model, messages: messages.map((m) => ({ role: m.role, content: openAIContent(m.content) })), stream: false },
    timeoutMs,
    external
  );
  if (!res.ok) return res;

  const body = res.json as {
    choices?: { message?: { content?: unknown } }[];
    model?: string;
  };
  const raw = firstString(body?.choices?.[0]?.message?.content);
  if (raw === undefined) return { ok: false, error: 'no completion text in response' };
  // Reasoning is not an answer. Stripped here, before any reader downstream
  // can mistake a brace inside the model's thinking for the start of its reply.
  const text = stripThink(raw);
  return { ok: true, text, model: firstString(body.model) ?? config.model };
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
  if (!config.apiKey) return { ok: false, error: 'anthropic requires an API key' };

  const system = messages.filter((m) => m.role === 'system').map((m) => textOf(m.content)).join('\n\n');
  const user = messages.filter((m) => m.role === 'user');
  if (user.length === 0) return { ok: false, error: 'no user message' };

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
    external
  );
  if (!res.ok) return res;

  const body = res.json as {
    content?: { type?: string; text?: string }[];
    model?: string;
    stop_reason?: string;
  };

  // Check stop_reason before reading content — a refusal carries no text.
  if (body?.stop_reason === 'refusal') {
    return { ok: false, error: 'model declined the request' };
  }

  const text = body?.content?.find((b) => b?.type === 'text')?.text;
  if (typeof text !== 'string') return { ok: false, error: 'no text block in response' };
  return { ok: true, text, model: firstString(body.model) ?? config.model };
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
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface ModelList {
  ok: boolean;
  models: string[];
  error?: string;
}

/**
 * What an OpenAI-compatible server is currently serving.
 *
 * Reports whether it could ask, separately from what came back. Returning a
 * bare `[]` made "this server has no models" and "there is no server" the same
 * answer, and only one of those is worth telling the user about.
 */
export async function listModels(config: Pick<ProviderConfig, 'baseUrl' | 'apiKey'>): Promise<ModelList> {
  const headers: Record<string, string> = {};
  if (config.apiKey) headers.authorization = `Bearer ${config.apiKey}`;
  try {
    const { signal, done } = withTimeout(5_000);
    const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/models`, { headers, signal });
    done();
    if (!res.ok) return { ok: false, models: [], error: `HTTP ${res.status}` };
    const body = (await res.json()) as { data?: { id?: unknown }[] };
    const models = (body?.data ?? [])
      .map((m) => m?.id)
      .filter((id): id is string => typeof id === 'string')
      .sort();
    return { ok: true, models };
  } catch (err) {
    return { ok: false, models: [], error: err instanceof Error ? err.message : String(err) };
  }
}

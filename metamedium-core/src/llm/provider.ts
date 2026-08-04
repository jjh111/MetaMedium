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
}

/** Ready-made configs for the providers v7 targets. `model` still required. */
export const PRESETS = {
  ollama: { kind: 'openai-compatible', baseUrl: 'http://localhost:11434/v1' },
  lmStudio: { kind: 'openai-compatible', baseUrl: 'http://localhost:1234/v1' },
  openRouter: { kind: 'openai-compatible', baseUrl: 'https://openrouter.ai/api/v1' },
  anthropic: { kind: 'anthropic', baseUrl: 'https://api.anthropic.com/v1' },
} as const satisfies Record<string, Pick<ProviderConfig, 'kind' | 'baseUrl'>>;

export interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

/** Success or failure, never a throw — the caller is inside a drawing app. */
export type CompletionResult =
  | { ok: true; text: string; model: string }
  | { ok: false; error: string };

export const DEFAULT_TIMEOUT_MS = 30_000;

export function providerLabel(config: ProviderConfig): string {
  return config.label ?? `llm:${config.model}`;
}

/**
 * Which tier a provider speaks at: 1 when the model runs on this machine,
 * 2 when it is hosted.
 *
 * This labels a voice so surfaces can group by tier. It does NOT rank one
 * above another — tiers are simultaneous, and a tier-1 reading is never
 * suppressed by a tier-2 one (ARCHITECTURE-v7 §4.1).
 */
export function providerTier(config: ProviderConfig): 1 | 2 {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(config.baseUrl) ? 1 : 2;
}

function withTimeout(ms: number): { signal: AbortSignal; done: () => void } {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  return { signal: ctl.signal, done: () => clearTimeout(t) };
}

async function post(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  timeoutMs: number
): Promise<{ ok: true; json: unknown } | { ok: false; error: string }> {
  const { signal, done } = withTimeout(timeoutMs);
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
    // An aborted request is a timeout, not a crash — say so plainly.
    return { ok: false, error: signal.aborted ? `timed out after ${timeoutMs}ms` : msg };
  } finally {
    done();
  }
}

function firstString(...candidates: unknown[]): string | undefined {
  for (const c of candidates) if (typeof c === 'string' && c.length > 0) return c;
  return undefined;
}

/** OpenAI-compatible: Ollama, LM Studio, OpenRouter, and anything else /v1. */
async function completeOpenAICompatible(
  config: ProviderConfig,
  messages: ChatMessage[],
  timeoutMs: number
): Promise<CompletionResult> {
  const headers: Record<string, string> = {};
  if (config.apiKey) headers.authorization = `Bearer ${config.apiKey}`;

  const res = await post(
    `${config.baseUrl.replace(/\/$/, '')}/chat/completions`,
    headers,
    { model: config.model, messages, stream: false },
    timeoutMs
  );
  if (!res.ok) return res;

  const body = res.json as {
    choices?: { message?: { content?: unknown } }[];
    model?: string;
  };
  const text = firstString(body?.choices?.[0]?.message?.content);
  if (text === undefined) return { ok: false, error: 'no completion text in response' };
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
  timeoutMs: number
): Promise<CompletionResult> {
  if (!config.apiKey) return { ok: false, error: 'anthropic requires an API key' };

  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
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
      messages: user.map((m) => ({ role: 'user', content: m.content })),
    },
    timeoutMs
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
  messages: ChatMessage[]
): Promise<CompletionResult> {
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  try {
    return config.kind === 'anthropic'
      ? await completeAnthropic(config, messages, timeoutMs)
      : await completeOpenAICompatible(config, messages, timeoutMs);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** List models a local OpenAI-compatible server is serving. `[]` if unreachable. */
export async function listModels(config: Pick<ProviderConfig, 'baseUrl' | 'apiKey'>): Promise<string[]> {
  const headers: Record<string, string> = {};
  if (config.apiKey) headers.authorization = `Bearer ${config.apiKey}`;
  try {
    const { signal, done } = withTimeout(5_000);
    const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/models`, { headers, signal });
    done();
    if (!res.ok) return [];
    const body = (await res.json()) as { data?: { id?: unknown }[] };
    return (body?.data ?? [])
      .map((m) => m?.id)
      .filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

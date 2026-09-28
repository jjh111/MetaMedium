// The transport. Most of its behaviour is pinned through the agent tests that
// drive it with a stubbed server; this file holds what is about the transport
// itself — and, since V1-PLAN J5, how a reply is read the way each provider
// sends it, how a failure is said, what is sent, and what a provider's list of
// models says a model can do. The replies and the list are recorded shapes
// (fixtures/*.json), read here and by the e2e stub server alike.

import { describe, it, expect, afterEach } from 'vitest';
import {
  complete,
  stripThink,
  PRESETS,
  modelWords,
  maxTokensFor,
  DEFAULT_MAX_TOKENS,
  OPENROUTER_APP,
  OPENROUTER_REASONING,
  parseModelList,
  readModels,
  listModels,
  modelFacts,
  nearestModelIds,
  guessVision,
  whereOf,
  type ProviderConfig,
  type ChatMessage,
  type ModelCatalog,
} from './provider';
import MODELS from './fixtures/openrouter-models.json';
import REPLIES from './fixtures/replies.json';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

type Reply = { status: number; body: unknown };
const R = REPLIES as unknown as Record<string, Reply>;

interface Asked { url: string; body: Record<string, unknown> | null; headers: Record<string, string> }

/** Answer every request with `reply` (or what `reply` makes of it), keeping what was asked. */
function serve(reply: Reply | ((url: string) => Reply)): Asked[] {
  const asked: Asked[] = [];
  globalThis.fetch = (async (url: string | URL, init: RequestInit = {}) => {
    const u = String(url);
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries((init.headers ?? {}) as Record<string, string>)) headers[k.toLowerCase()] = v;
    asked.push({ url: u, body: init.body ? JSON.parse(String(init.body)) : null, headers });
    const r = typeof reply === 'function' ? reply(u) : reply;
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
  return asked;
}

/** A reply fixture with its first choice changed — for the shapes that differ from a recorded one by a field. */
function withChoice(name: string, change: (choice: Record<string, any>) => void): Reply {
  const r = JSON.parse(JSON.stringify(R[name])) as { status: number; body: { choices: Record<string, any>[] } };
  change(r.body.choices[0]);
  return r;
}

const KEY = 'test-key-for-the-transport-not-real';
const GLM: ProviderConfig = { ...PRESETS.openRouter, model: 'z-ai/glm-5.3-flash', apiKey: KEY, title: 'Z.AI: GLM 5.3 Flash' };
const GLM47: ProviderConfig = { ...PRESETS.openRouter, model: 'z-ai/glm-4.7-flash', apiKey: KEY };
const CUSTOM: ProviderConfig = { kind: 'openai-compatible', baseUrl: 'http://127.0.0.1:8080/v1', model: 'glm-4.7-flash' };
const USER: ChatMessage[] = [{ role: 'user', content: 'hi' }];

describe('stripThink', () => {
  it('drops a closed reasoning block and keeps the answer', () => {
    expect(stripThink('<think>\nlet me see {\n</think>\n[{"label":"circle"}]')).toBe('[{"label":"circle"}]');
  });
  it('treats an unclosed block as all reasoning — nothing usable followed', () => {
    expect(stripThink('<think>still going { {')).toBe('');
  });
  it('leaves a reply with no reasoning alone', () => {
    expect(stripThink('{"a":1}')).toBe('{"a":1}');
  });
  it('is applied by the OpenAI-compatible client', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: '<think>{ not this }</think>{"regions":{}}' } }] }), {
        status: 200, headers: { 'content-type': 'application/json' },
      })) as unknown as typeof fetch;
    const r = await complete({ ...PRESETS.ollama, model: 'x' }, [{ role: 'user', content: 'hi' }]);
    expect(r.ok && r.text).toBe('{"regions":{}}');
  });
});

describe('a reply, read the way the provider sends it (J5)', () => {
  it('GLM through OpenRouter: the answer is the content, never the reasoning beside it', async () => {
    serve(R['openrouter-glm']);
    const r = await complete(GLM, USER);
    expect(r).toMatchObject({ ok: true, model: 'z-ai/glm-5.3-flash' });
    expect(r.ok && r.text).toBe('[{"text":"hello","confidence":0.93},{"text":"hallo","confidence":0.21}]');
    expect(r.ok && r.truncated).toBeFalsy();
  });

  it('a plain OpenAI reply: its content, and the model it names', async () => {
    serve(R['openai-plain']);
    const r = await complete({ ...CUSTOM, model: 'gpt-4o-mini' }, USER);
    expect(r).toEqual({ ok: true, text: 'ok', model: 'gpt-4o-mini-2024-07-18' });
  });

  it('content as parts: the text parts joined in order, a thinking part left out', async () => {
    serve(R['content-parts']);
    const r = await complete({ ...CUSTOM, model: 'magistral-small-2509' }, USER);
    expect(r.ok && r.text).toBe('[{"label":"molecule","confidence":0.8,"reasoning":"three circles joined by two lines"}]');
  });

  it('reasoning only, the budget spent: said in words, and the reasoning never read as the answer', async () => {
    serve(R['reasoning-only']);
    const r = await complete(GLM, USER);
    expect(r).toMatchObject({ ok: false, reason: 'thinking' });
    expect(!r.ok && r.error).toMatch(/^GLM 5\.3 Flash spent its whole budget thinking — no answer came back/);
    expect(!r.ok && r.error).toMatch(/8,192 tokens/);
    expect(!r.ok && r.error).not.toMatch(/strokes one at a time/);
  });

  it('reasoning only in `reasoning_content` (Z.AI, vLLM, DeepSeek, LM Studio) with content null: the same, named by its id', async () => {
    serve(R['reasoning-content']);
    const r = await complete({ ...CUSTOM }, USER);
    expect(r).toMatchObject({ ok: false, reason: 'thinking' });
    expect(!r.ok && r.error).toMatch(/^glm-4\.7-flash spent its whole budget thinking — no answer came back/);
  });

  it('reasoning, then a stop with no content: it thought and gave no answer', async () => {
    serve(withChoice('reasoning-only', (c) => { c.finish_reason = 'stop'; c.native_finish_reason = 'stop'; }));
    const r = await complete(GLM, USER);
    expect(r).toMatchObject({ ok: false, reason: 'thinking' });
    expect(!r.ok && r.error).toMatch(/^GLM 5\.3 Flash thought but gave no answer/);
  });

  it('an answer all inside <think>, cut at the limit, is no answer — it used to come back as an empty success', async () => {
    serve(withChoice('length-with-content', (c) => { c.message.content = '<think>the first letter { is an h, or'; }));
    const r = await complete(GLM47, USER);
    expect(r).toMatchObject({ ok: false, reason: 'thinking' });
    expect(!r.ok && r.error).toMatch(/^glm-4\.7-flash spent its whole budget thinking/);
  });

  it('an empty answer with no reasoning: said as nothing', async () => {
    serve(withChoice('openai-plain', (c) => { c.message.content = ''; }));
    const r = await complete({ ...CUSTOM, model: 'gpt-4o-mini' }, USER);
    expect(r).toMatchObject({ ok: false, reason: 'empty' });
    expect(!r.ok && r.error).toMatch(/answered with nothing/);
  });

  it('finish_reason length with an answer begun: kept, and said to be cut off', async () => {
    serve(R['length-with-content']);
    const r = await complete(GLM47, USER);
    expect(r).toMatchObject({ ok: true, truncated: true });
    expect(r.ok && r.text).toBe('[{"label":"molecule","confidence":0.8,"reasoning":"three circ');
  });
});

describe('a failure, said in full (J5)', () => {
  it('401: the status, what it means, and the provider\'s own words', async () => {
    serve(R['error-401']);
    const r = await complete(GLM, USER);
    expect(r).toEqual({ ok: false, status: 401, reason: 'key', error: 'HTTP 401 — bad key: “User not found.”' });
  });

  it('402: no credit', async () => {
    serve(R['error-402']);
    const r = await complete(GLM, USER);
    expect(r).toMatchObject({ ok: false, status: 402, reason: 'credit' });
    expect(!r.ok && r.error).toMatch(/^HTTP 402 — no credit: “Insufficient credits\./);
  });

  it('404: no such model', async () => {
    serve(R['error-404']);
    const r = await complete({ ...GLM, model: 'z-ai/glm-flash' }, USER);
    expect(r).toMatchObject({ ok: false, status: 404, reason: 'model' });
    expect(!r.ok && r.error).toMatch(/^HTTP 404 — no such model/);
    expect(!r.ok && r.error).toContain('“No endpoints found for z-ai/glm-flash.”');
  });

  it('429: rate limited', async () => {
    serve(R['error-429']);
    const r = await complete(GLM, USER);
    expect(r).toEqual({ ok: false, status: 429, reason: 'rate', error: 'HTTP 429 — rate limited: “Rate limit exceeded: free-models-per-min.”' });
  });

  it('an error inside a 200: the provider behind OpenRouter failed, and its own words are passed on', async () => {
    serve(R['error-in-200']);
    const r = await complete(GLM, USER);
    expect(r).toMatchObject({ ok: false, status: 502, reason: 'server' });
    expect(!r.ok && r.error).toContain('Provider returned error');
    expect(!r.ok && r.error).toContain('Z.AI');
    expect(!r.ok && r.error).toContain('model overloaded, try again shortly');
  });

  it('a network or CORS failure is said as one, because the browser does not say which', async () => {
    globalThis.fetch = (async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch;
    const r = await complete(GLM, USER);
    expect(r).toMatchObject({ ok: false, reason: 'network' });
    expect(!r.ok && r.error).toMatch(/^could not reach openrouter\.ai/);
    expect(!r.ok && r.error).toMatch(/CORS/);
    expect(!r.ok && r.error).toContain('Failed to fetch');
  });

  it('a key the provider echoes back is never repeated', async () => {
    serve({ status: 401, body: { error: { message: `Incorrect API key provided: ${KEY}. You can find your API key in your settings.`, type: 'invalid_request_error', code: 'invalid_api_key' } } });
    const r = await complete(GLM, USER);
    expect(!r.ok && r.error).not.toContain(KEY);
    expect(!r.ok && r.error).toContain('(the key)');
  });

  it('no answer in time: said with the host and the wait', async () => {
    globalThis.fetch = ((_: unknown, init: RequestInit) => new Promise((_ok, fail) => {
      init.signal?.addEventListener('abort', () => fail(new DOMException('aborted', 'AbortError')));
    })) as unknown as typeof fetch;
    const r = await complete({ ...CUSTOM, timeoutMs: 20 }, USER);
    expect(r).toMatchObject({ ok: false, reason: 'timeout' });
    expect(!r.ok && r.error).toMatch(/^timed out — no answer from 127\.0\.0\.1:8080/);
  });

  it('cancelled by the caller stays the one word callers test for', async () => {
    globalThis.fetch = ((_: unknown, init: RequestInit) => new Promise((_ok, fail) => {
      init.signal?.addEventListener('abort', () => fail(new DOMException('aborted', 'AbortError')));
    })) as unknown as typeof fetch;
    const ctl = new AbortController();
    const p = complete(CUSTOM, USER, { signal: ctl.signal });
    ctl.abort();
    const r = await p;
    expect(r).toMatchObject({ ok: false, error: 'cancelled' });
  });
});

describe('what is sent (J5)', () => {
  it('to OpenRouter: a budget for the reply, a low reasoning effort, and the app\'s name', async () => {
    const asked = serve(R['openrouter-glm']);
    await complete(GLM, USER);
    expect(asked).toHaveLength(1);
    expect(asked[0].url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(asked[0].body).toMatchObject({ model: 'z-ai/glm-5.3-flash', max_tokens: DEFAULT_MAX_TOKENS, reasoning: OPENROUTER_REASONING, stream: false });
    expect(OPENROUTER_REASONING).toEqual({ effort: 'low' });
    expect(asked[0].headers.authorization).toBe(`Bearer ${KEY}`);
    expect(asked[0].headers['http-referer']).toBe(OPENROUTER_APP.url);
    expect(asked[0].headers['x-title']).toBe(OPENROUTER_APP.title);
  });

  it('to any other endpoint: the budget, and nothing only OpenRouter reads', async () => {
    const asked = serve(R['openai-plain']);
    await complete(CUSTOM, USER);
    expect(asked[0].body).toMatchObject({ max_tokens: DEFAULT_MAX_TOKENS });
    expect(asked[0].body).not.toHaveProperty('reasoning');
    expect(asked[0].headers).not.toHaveProperty('http-referer');
    expect(asked[0].headers).not.toHaveProperty('x-title');
    expect(asked[0].headers).not.toHaveProperty('authorization');
  });

  it('the budget stays within what the provider said the model can write and read', () => {
    expect(DEFAULT_MAX_TOKENS).toBe(8192);
    expect(maxTokensFor(CUSTOM, USER)).toBe(DEFAULT_MAX_TOKENS);
    expect(maxTokensFor({ ...CUSTOM, maxOutput: 4096 }, USER)).toBe(4096);
    const long: ChatMessage[] = [{ role: 'user', content: 'x'.repeat(14_000) }];
    const n = maxTokensFor({ ...CUSTOM, contextLength: 6000 }, long);
    expect(n).toBeGreaterThanOrEqual(1024);
    expect(n).toBeLessThan(2000);
  });
});

describe('what a provider\'s list says a model can do (J5)', () => {
  it('OpenRouter\'s shape: whether it takes images, what it reads, how much, and whether it reasons', () => {
    const { models, describes } = parseModelList(MODELS);
    expect(describes).toBe(true);
    expect(models).toHaveLength(8);
    expect(models.find((m) => m.id === 'z-ai/glm-5.3-flash')).toMatchObject({
      title: 'Z.AI: GLM 5.3 Flash', vision: true, inputs: ['text', 'image', 'video'], contextLength: 202752, maxOutput: 131072, reasons: true,
    });
    expect(models.find((m) => m.id === '~z-ai/glm-flash-latest')).toMatchObject({ vision: true });
    expect(models.find((m) => m.id === 'z-ai/glm-4.7-flash')).toMatchObject({ vision: false, inputs: ['text'], reasons: true });
    expect(models.find((m) => m.id === 'openai/gpt-4o-mini')).toMatchObject({ vision: true, reasons: false });
  });

  it('a plain OpenAI list names ids only — what they take is not said', () => {
    const { models, describes } = parseModelList({ object: 'list', data: [{ id: 'gpt-4o-mini', object: 'model', created: 1721172741, owned_by: 'system' }] });
    expect(describes).toBe(false);
    expect(models).toEqual([{ id: 'gpt-4o-mini' }]);
  });

  it('LM Studio\'s own list types a model that sees as vlm, and says its context', () => {
    const { models, describes } = parseModelList({ object: 'list', data: [
      { id: 'qwen2.5-vl-7b-instruct', object: 'model', type: 'vlm', publisher: 'lmstudio-community', arch: 'qwen2_vl', compatibility_type: 'gguf', quantization: 'Q4_K_M', state: 'not-loaded', max_context_length: 128000 },
      { id: 'qwen3-8b', object: 'model', type: 'llm', publisher: 'qwen', arch: 'qwen3', compatibility_type: 'gguf', quantization: 'Q4_K_M', state: 'loaded', max_context_length: 32768 },
    ] });
    expect(describes).toBe(true);
    expect(models[0]).toMatchObject({ id: 'qwen2.5-vl-7b-instruct', vision: true, contextLength: 128000 });
    expect(models[1]).toMatchObject({ id: 'qwen3-8b', vision: false, contextLength: 32768 });
  });

  it('OpenRouter\'s list is read without the key — it is public, and a key goes nowhere it is not needed', async () => {
    const asked = serve({ status: 200, body: MODELS });
    const c = await readModels(GLM);
    expect(c.ok).toBe(true);
    expect(c.models).toHaveLength(8);
    expect(asked[0].url).toBe('https://openrouter.ai/api/v1/models');
    expect(asked[0].headers).not.toHaveProperty('authorization');
  });

  it('a custom endpoint\'s list is read with its key, which it may need', async () => {
    const asked = serve({ status: 200, body: MODELS });
    await readModels({ ...CUSTOM, apiKey: 'k-for-this-endpoint' });
    expect(asked[0].url).toBe('http://127.0.0.1:8080/v1/models');
    expect(asked[0].headers.authorization).toBe('Bearer k-for-this-endpoint');
  });

  it('a list that does not answer in time is said, never waited on', async () => {
    globalThis.fetch = ((_: unknown, init: RequestInit) => new Promise((_ok, fail) => {
      init.signal?.addEventListener('abort', () => fail(new DOMException('aborted', 'AbortError')));
    })) as unknown as typeof fetch;
    const c = await readModels(GLM, { timeoutMs: 20 });
    expect(c).toMatchObject({ ok: false, reason: 'timeout' });
    expect(c.error).toMatch(/timed out/);
  });

  it('listModels keeps its answer: the ids, sorted', async () => {
    serve({ status: 200, body: MODELS });
    const l = await listModels({ baseUrl: CUSTOM.baseUrl });
    expect(l.ok).toBe(true);
    expect(l.models[0]).toBe('anthropic/claude-opus-5');
    expect(l.models).toEqual([...l.models].sort());
  });
});

describe('the facts a join is given (J5)', () => {
  const catalog: ModelCatalog = { ok: true, ...parseModelList(MODELS) };
  const OR = whereOf(PRESETS.openRouter.baseUrl);

  it('where a provider is, in words', () => {
    expect(OR).toEqual({ name: 'OpenRouter', on: 'on OpenRouter' });
    expect(whereOf('http://127.0.0.1:54321/v1')).toEqual({ name: '127.0.0.1:54321', on: 'at 127.0.0.1:54321' });
  });

  it('a model the list holds and says sees', () => {
    const f = modelFacts('z-ai/glm-5.3-flash', catalog, OR);
    expect(f.ok).toBe(true);
    if (!f.ok) return;
    expect(f.facts).toMatchObject({ vision: true, from: 'provider', title: 'Z.AI: GLM 5.3 Flash', contextLength: 202752, maxOutput: 131072 });
    expect(f.facts.said).toBe('OpenRouter says GLM 5.3 Flash takes text, image and video — it sees; 202,752 tokens of context');
  });

  it('a model the list says reads text only, and the reason in a clause the pane can reuse', () => {
    const f = modelFacts('z-ai/glm-4.7-flash', catalog, OR);
    expect(f.ok && f.facts.vision).toBe(false);
    expect(f.ok && f.facts.because).toBe('OpenRouter says it takes text');
  });

  it('an id the list does not hold: refused, with the nearest ids', () => {
    const f = modelFacts('z-ai/glm-flash', catalog, OR);
    expect(f).toEqual({
      ok: false,
      near: ['~z-ai/glm-flash-latest', 'z-ai/glm-5.3-flash', 'z-ai/glm-4.7-flash'],
      error: 'no model called z-ai/glm-flash on OpenRouter — did you mean ~z-ai/glm-flash-latest, z-ai/glm-5.3-flash or z-ai/glm-4.7-flash?',
    });
  });

  it('when the list could not be read, whether it sees is guessed from its id, and said to be', () => {
    const f = modelFacts('z-ai/glm-4.5v', { ok: false, models: [], describes: false, error: 'timed out' }, OR);
    expect(f.ok).toBe(true);
    if (!f.ok) return;
    expect(f.facts).toMatchObject({ vision: true, from: 'id' });
    expect(f.facts.said).toMatch(/OpenRouter's model list could not be read \(timed out\)/);
    expect(f.facts.said).toMatch(/guessed from its id/);
  });

  it('what the provider said when it last joined outranks the id\'s guess', () => {
    const f = modelFacts('z-ai/glm-5.3-flash', { ok: false, models: [], describes: false, error: 'timed out' }, OR, { vision: true, title: 'Z.AI: GLM 5.3 Flash' });
    expect(f.ok && f.facts).toMatchObject({ vision: true, from: 'remembered', title: 'Z.AI: GLM 5.3 Flash' });
  });

  it('a list that names ids only: listed, and whether it sees guessed from its id', () => {
    const plain: ModelCatalog = { ok: true, describes: false, models: [{ id: 'glm-4.7-flash' }] };
    const f = modelFacts('glm-4.7-flash', plain, whereOf(CUSTOM.baseUrl));
    expect(f.ok && f.facts).toMatchObject({ vision: false, from: 'id' });
    expect(f.ok && f.facts.said).toMatch(/^127\.0\.0\.1:8080 lists glm-4\.7-flash but does not say what it takes/);
  });

  it('the nearest ids forgive a typo and offer nothing for an id like none of them', () => {
    const ids = catalog.models.map((m) => m.id);
    expect(nearestModelIds('z-ai/glm-5.3-flsh', ids)[0]).toBe('z-ai/glm-5.3-flash');
    expect(nearestModelIds('banana', ids)).toEqual([]);
  });

  it('the id\'s guess, kept only as the fallback', () => {
    expect(guessVision('z-ai/glm-4.5v')).toBe(true);
    expect(guessVision('claude-opus-5')).toBe(true);
    expect(guessVision('z-ai/glm-4.7-flash')).toBe(false);
    expect(guessVision('qwen3:8b')).toBe(false);
  });

  it('a model\'s name in words: what its provider calls it, less the vendor; else its id, less the vendor\'s path', () => {
    expect(modelWords(GLM)).toBe('GLM 5.3 Flash');
    expect(modelWords({ model: 'qwen3.5:9b' })).toBe('qwen3.5 9b');
    expect(modelWords({ model: 'z-ai/glm-4.7-flash' })).toBe('glm-4.7-flash');
    expect(modelWords({ model: '~z-ai/glm-flash-latest' })).toBe('glm-flash-latest');
  });
});

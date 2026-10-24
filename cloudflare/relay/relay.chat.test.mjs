// dyna.ink's own writer and reader on the relay Worker (src/ai.mjs, Demos/ai-protocol.mjs): OpenAI's chat-completions
// shape at `/ai/v1`, a Workers AI model behind each short name, and no key anywhere a page can see — who may ask, how
// often, what shape, what comes back, and that core's own transport (`complete`, `readModels`, `listModels`, the agent
// that reads and writes for the page — from the committed Node bundle) speaks to it unchanged. The model is a fake
// (`fakeAI`): nothing is reached.
//
//   node --test cloudflare/relay/relay.chat.test.mjs

import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer as netServer } from 'node:net';
import worker from './src/worker.mjs';
import { keyForRoom } from './src/auth.mjs';
import { fakeEnv, fakeAI, chatAnswer, systemOneAnswers } from './test/fake.mjs';
import { startDevRelay } from './dev-server.mjs';
import { startRelay } from '../../Demos/relay.mjs';
import {
  AI_CHAT_LIMITS, AI_CHAT_PER_MINUTE, AI_CHAT_PER_DAY, AI_WORDS, DEFAULT_AI_MODEL, AI_CHAT_MODELS,
  chatCheck, chatModelsFrom, chatReply, chatModeOf, aiChatDailyFrom,
} from '../../Demos/ai-protocol.mjs';
import { DECIDE_WORDS } from '../../Demos/decide-protocol.mjs';

// A line a call is what the route logs (its own test reads them); here they would only say nothing, hundreds of times.
console.log = () => {};

const here = path.dirname(fileURLToPath(import.meta.url));
const MM = await import(pathToFileURL(path.join(here, '../../Demos/dynaink-core.node.mjs')).href);

const SECRET = 'chat-secret';
const APP = 'https://dyna.ink';
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function envWith(vars = {}, book) {
  const env = fakeEnv({ MM_RELAY_SECRET: SECRET, ...vars });
  env.AI = fakeAI(book);
  return env;
}
const chat = (model = 'writer', extra = {}) => ({ model, messages: [{ role: 'system', content: 'You are a participant.' }, { role: 'user', content: 'what is this?' }], stream: false, max_tokens: 1024, ...extra });
const post = (env, body, headers = {}, url = 'http://relay/ai/v1/chat/completions') =>
  worker.fetch(new Request(url, { method: 'POST', headers: { 'content-type': 'application/json', origin: APP, 'cf-connecting-ip': '203.0.113.7', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) }), env);
const said = async (res) => { const b = await res.json(); return b.error && b.error.message; };
const freePort = () => new Promise((resolve) => { const s = netServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });

/**
 * Core's transport, run against the Worker in this process as a page runs it: every fetch goes to `worker.fetch`, with
 * the Origin a browser sends (Node's fetch sends none). `fn` runs with it in place; the page's own fetch is put back after.
 */
async function asPage(env, fn, { origin = APP, ip = '203.0.113.50' } = {}) {
  const was = globalThis.fetch;
  globalThis.fetch = (input, init = {}) => {
    const headers = new Headers(init.headers || {});
    if (origin) headers.set('origin', origin);
    headers.set('cf-connecting-ip', ip);
    return worker.fetch(new Request(typeof input === 'string' ? input : input.url, { ...init, headers }), env);
  };
  try { return await fn(); } finally { globalThis.fetch = was; }
}
const HOUSE = (short, extra = {}) => ({ kind: 'openai-compatible', baseUrl: 'https://relay.dyna.ink/ai/v1', model: short, ...extra });

test('GET /ai/v1/models lists the writer and the reader — their names, that they see, their context, the limits — asks no model, and names no @cf id', async () => {
  const env = envWith();
  const res = await worker.fetch(new Request('http://relay/ai/v1/models', { headers: { origin: APP } }), env);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), APP);
  const body = await res.json();
  assert.equal(body.object, 'list');
  assert.deepEqual(body.data.map((m) => m.id), ['writer', 'reader']);
  assert.deepEqual(body.data.map((m) => m.name), ['dyna.ink’s writer', 'dyna.ink’s reader']);
  for (const m of body.data) {
    assert.deepEqual(m.architecture.input_modalities, ['text', 'image'], 'the default model sees');
    assert.equal(m.context_length, 262144);
    assert.equal(m.top_provider.max_completion_tokens, AI_CHAT_LIMITS.maxTokens);
  }
  assert.equal(body.limits.messages, AI_CHAT_LIMITS.messages);
  assert.equal(body.limits.perMinute.caller, AI_CHAT_PER_MINUTE.caller);
  assert.equal(JSON.stringify(body).includes('@cf/'), false, 'the page never sees an @cf id');
  assert.equal(env.AI.calls.length, 0);
});

test('core reads the list as a provider’s: readModels says the writer and the reader see, their context and their reply’s limit; listModels their names', async () => {
  const env = envWith();
  const catalog = await asPage(env, () => MM.readModels({ baseUrl: 'https://relay.dyna.ink/ai/v1' }));
  assert.equal(catalog.ok, true, catalog.error);
  assert.equal(catalog.describes, true);
  const reader = catalog.models.find((m) => m.id === 'reader');
  assert.equal(reader.vision, true);
  assert.equal(reader.title, 'dyna.ink’s reader');
  assert.equal(reader.contextLength, 262144);
  assert.equal(reader.maxOutput, AI_CHAT_LIMITS.maxTokens);
  const facts = MM.modelFacts('writer', catalog, MM.whereOf('https://relay.dyna.ink/ai/v1'));
  assert.equal(facts.ok, true);
  assert.equal(facts.facts.vision, true);
  assert.equal(MM.modelWords({ model: 'writer', title: facts.facts.title }), 'dyna.ink’s writer');
  const list = await asPage(env, () => MM.listModels({ baseUrl: 'https://relay.dyna.ink/ai/v1' }));
  assert.deepEqual(list, { ok: true, models: ['reader', 'writer'] });
  // An id the relay does not hold is refused by core as any provider’s would be, with the nearest.
  const no = MM.modelFacts('@cf/qwen/qwen3.8-27b', catalog, MM.whereOf('https://relay.dyna.ink/ai/v1'));
  assert.equal(no.ok, false);
  assert.equal(env.AI.calls.length, 0);
});

test('a chat from the app goes to Workers AI by binding — the @cf id in code, the messages as they came, the reply held to 4,096 tokens — and comes back as OpenAI’s chat.completion, which core reads', async () => {
  const env = envWith();
  const res = await post(env, chat('writer', { max_tokens: 8192 }));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), APP);
  const body = await res.json();
  assert.equal(body.object, 'chat.completion');
  assert.equal(body.model, 'writer');
  assert.equal(body.choices[0].message.role, 'assistant');
  assert.equal(body.choices[0].message.content, 'ok');
  assert.equal(body.choices[0].finish_reason, 'stop');
  assert.deepEqual(body.usage, { prompt_tokens: 12, completion_tokens: 3, total_tokens: 15 });
  assert.equal(env.AI.calls.length, 1);
  assert.equal(env.AI.calls[0].model, DEFAULT_AI_MODEL);
  assert.deepEqual(env.AI.calls[0].input, { messages: chat().messages, max_tokens: AI_CHAT_LIMITS.maxTokens });
  // Core's own transport, unchanged: the house is a provider at <relay>/ai/v1.
  const r = await asPage(env, () => MM.complete(HOUSE('writer'), [{ role: 'user', content: 'are you there?' }]));
  assert.equal(r.ok, true, r.error);
  assert.equal(r.text, 'ok');
  assert.equal(env.AI.calls[1].input.max_tokens, AI_CHAT_LIMITS.maxTokens, 'core asks 8,192; the relay holds it to 4,096');
  // Told the model's own limit by the list, core asks no more than that.
  const held = await asPage(env, () => MM.complete(HOUSE('writer', { maxOutput: AI_CHAT_LIMITS.maxTokens }), [{ role: 'user', content: 'hi' }]));
  assert.equal(held.ok, true);
});

test('both reply shapes are read: Workers AI’s { response } and OpenAI’s { choices } — reasoning kept out of the content, a <think> block too — and a reply that is neither is said in words', async () => {
  const shapes = [
    [{ response: 'a molecule', usage: { prompt_tokens: 4, completion_tokens: 2, total_tokens: 6 } }, 'a molecule', undefined],
    [{ choices: [{ index: 0, message: { role: 'assistant', content: 'a molecule', reasoning_content: 'three circles…' }, finish_reason: 'stop' }] }, 'a molecule', undefined],
    [{ choices: [{ message: { content: [{ type: 'text', text: 'a ' }, { type: 'text', text: 'molecule' }] } }] }, 'a molecule', undefined],
    [{ response: '<think>circles and lines, so…</think>a molecule' }, 'a molecule', undefined],
    [{ response: { label: 'molecule' } }, '{"label":"molecule"}', undefined],
  ];
  for (const [reply, content] of shapes) {
    const env = envWith({}, () => reply);
    const res = await post(env, chat());
    assert.equal(res.status, 200, JSON.stringify(reply));
    const body = await res.json();
    assert.equal(body.choices[0].message.content, content, JSON.stringify(reply));
    assert.equal(body.choices[0].message.reasoning_content, undefined, 'an answer goes without its reasoning');
    assert.doesNotMatch(JSON.stringify(body), /circles and lines|three circles/);
  }
  // Only reasoning, the budget spent: the content is empty and the reasoning comes back, so core can say what happened.
  const thinking = envWith({}, () => ({ response: '<think>hmm, three circles, and', usage: { prompt_tokens: 9, completion_tokens: 4096, total_tokens: 4105 } }));
  const t = await post(thinking, chat('writer', { max_tokens: 4096 }));
  const tb = await t.json();
  assert.equal(tb.choices[0].message.content, '');
  assert.equal(tb.choices[0].finish_reason, 'length');
  assert.match(tb.choices[0].message.reasoning_content, /three circles/);
  const r = await asPage(thinking, () => MM.complete(HOUSE('writer', { title: 'dyna.ink’s writer' }), [{ role: 'user', content: 'what is this?' }]));
  assert.equal(r.ok, false);
  assert.match(r.error, /^dyna\.ink’s writer spent its whole budget thinking/);
  // Neither shape: 502, in words.
  const odd = await post(envWith({}, () => ({ result: 'molecule' })), chat());
  assert.equal(odd.status, 502);
  assert.equal(await said(odd), AI_WORDS.shape('writer'));
  const od = await asPage(envWith({}, () => ({ result: 'x' })), () => MM.complete(HOUSE('writer'), [{ role: 'user', content: 'hi' }]));
  assert.match(od.error, /^HTTP 502 — .*“dyna\.ink’s writer answered, but in a shape this relay does not read/);
});

test('the reader reads a picture of the ink: core’s own read sends one picture as an image_url data URL, the relay passes it on to the model that sees, and the words land on the mark', async () => {
  const env = envWith();
  const s = MM.createSession();
  const pts = Array.from({ length: 98 }, (_, i) => { const t = i / 97, a = t * 7 * Math.PI; return { x: 100 + 220 * t, y: 122 - 22 * Math.abs(Math.sin(a)) }; });
  const mark = s.addStroke(pts, 1000, undefined, 1);
  const reader = MM.createAgentParticipant(s, HOUSE('reader', { vision: true, title: 'dyna.ink’s reader' }), 1100, { name: 'dyna.ink reader', lazy: true });
  assert.equal(s.getEvents().filter((e) => e.type === 'join').length, 0, 'seated, and nothing written');
  const res = await asPage(env, () => reader.read({ nodeId: mark, image: PNG, at: 1200 }));
  assert.equal(res.ok, true, res.error);
  assert.equal(res.transcripts[0].text, 'hello');
  assert.equal(MM.transcriptOf(s.getState().nodes.get(mark)), 'hello');
  assert.equal(env.AI.calls.length, 1);
  const msgs = env.AI.calls[0].input.messages;
  const parts = msgs.find((m) => m.role === 'user').content;
  assert.deepEqual(parts.filter((p) => p.type === 'image_url').map((p) => p.image_url.url), [PNG]);
  assert.equal(s.getEvents().filter((e) => e.type === 'join').length, 1, 'it joined the board at its first ask, once');
  // What is this? from the writer, through core's agent.
  const writer = MM.createAgentParticipant(s, HOUSE('writer', { title: 'dyna.ink’s writer' }), 1300, { name: 'dyna.ink writer', lazy: true });
  const what = await asPage(env, () => writer.interpret([mark], 1400));
  assert.equal(what.ok, true, what.error);
  assert.equal(what.readings[0].label, 'a fake reading');
});

test('pictures: up to four, PNG, JPEG or WebP data URLs, from the user — refused to a writer set to a model that reads text only', async () => {
  const env = envWith();
  const withPics = (n, url = PNG, role = 'user') => chat('reader', { messages: [{ role, content: [{ type: 'text', text: 'read it' }, ...Array.from({ length: n }, () => ({ type: 'image_url', image_url: { url } }))] }] });
  assert.equal((await post(env, withPics(4))).status, 200);
  const five = await post(env, withPics(5), { 'cf-connecting-ip': '203.0.113.21' });
  assert.equal(five.status, 400);
  assert.match(await said(five), /at most 4 pictures/);
  const gif = await post(env, withPics(1, 'data:image/gif;base64,R0lGOD=='), { 'cf-connecting-ip': '203.0.113.22' });
  assert.match(await said(gif), /PNG, JPEG or WebP/);
  const remote = await post(env, withPics(1, 'https://example.com/a.png'), { 'cf-connecting-ip': '203.0.113.23' });
  assert.match(await said(remote), /PNG, JPEG or WebP data URL/);
  const fromSystem = await post(env, withPics(1, PNG, 'system'), { 'cf-connecting-ip': '203.0.113.24' });
  assert.match(await said(fromSystem), /only the user sends a picture/);
  const textOnly = envWith({ MM_AI_WRITER: '@cf/openai/gpt-oss-120b' });
  const refused = await post(textOnly, { ...withPics(1), model: 'writer' });
  assert.equal(refused.status, 400);
  assert.match(await said(refused), /dyna\.ink’s writer reads no pictures — ask the reader/);
  assert.equal(textOnly.AI.calls.length, 0);
});

test('MM_AI_WRITER and MM_AI_READER name each model in code; one that names no Workers AI model is left out of the list and refused in words', async () => {
  const env = envWith({ MM_AI_WRITER: '@cf/openai/gpt-oss-120b', MM_AI_READER: '@cf/meta/llama-4-scout-17b-16e-instruct' });
  await post(env, chat('writer'));
  await post(env, chat('reader'));
  assert.deepEqual(env.AI.calls.map((c) => c.model), ['@cf/openai/gpt-oss-120b', '@cf/meta/llama-4-scout-17b-16e-instruct']);
  const list = await (await worker.fetch(new Request('http://relay/ai/v1/models', { headers: { origin: APP } }), env)).json();
  assert.deepEqual(list.data.map((m) => [m.id, m.architecture.input_modalities.includes('image')]), [['writer', false], ['reader', true]]);
  const wrong = envWith({ MM_AI_READER: 'gpt-4o' });
  const l2 = await (await worker.fetch(new Request('http://relay/ai/v1/models', { headers: { origin: APP } }), wrong)).json();
  assert.deepEqual(l2.data.map((m) => m.id), ['writer']);
  assert.equal(l2.unavailable[0].why, AI_WORDS.notSet('reader'));
  const r = await post(wrong, chat('reader'));
  assert.equal(r.status, 503);
  assert.equal(await said(r), AI_WORDS.notSet('reader'));
  // A model the relay knows nothing of is taken at its word for its job: a reader sees, a writer reads text only.
  const unknown = chatModelsFrom({ MM_AI_WRITER: '@cf/someone/new-model', MM_AI_READER: '@cf/someone/new-model' });
  assert.equal(unknown.writer.sees, false);
  assert.equal(unknown.reader.sees, true);
  assert.equal(unknown.reader.context, null);
});

test('a shape the relay does not ask with is refused in words, before any model is asked — never another model, never a stream', async () => {
  const env = envWith();
  const base = chat();
  const cases = [
    [{ ...base, model: 'gpt-4o' }, /no model “gpt-4o” here — writer or reader/],
    [{ ...base, model: DEFAULT_AI_MODEL }, /no model “@cf\/qwen/],
    [{ ...base, stream: true }, /never a stream/],
    [{ ...base, tools: [] }, /does not ask with \(tools\)/],
    [{ ...base, apiKey: 'sk-x' }, /does not ask with \(apiKey\)/],
    [{ ...base, max_tokens: 0 }, /max_tokens is a whole number/],
    [{ ...base, temperature: 3 }, /temperature is a number from 0 to 2/],
    [{ ...base, messages: [] }, /1–32 messages/],
    [{ ...base, messages: Array.from({ length: 33 }, () => ({ role: 'user', content: 'x' })) }, /1–32 messages/],
    [{ ...base, messages: [{ role: 'tool', content: 'x' }] }, /from the system, the user or the assistant/],
    [{ ...base, messages: [{ role: 'user', content: 'x', name: 'john' }] }, /does not ask with \(name\)/],
    [{ ...base, messages: [{ role: 'user', content: [{ type: 'audio', data: 'x' }] }] }, /a part is text or a picture/],
    [{ ...base, messages: [{ role: 'user', content: [{ type: 'text' }] }] }, /a text part carries its words/],
    ['[1,2]', /not a JSON object/],
  ];
  let ip = 1;
  for (const [body, re] of cases) {
    const res = await post(env, body, { 'cf-connecting-ip': '198.51.100.' + ip++ });
    assert.equal(res.status, 400, JSON.stringify(body).slice(0, 100));
    assert.match(await said(res), re);
  }
  const notJson = await post(env, '{ not json', { 'cf-connecting-ip': '198.51.100.200' });
  assert.equal(notJson.status, 400);
  assert.equal(await said(notJson), AI_WORDS.notJson);
  assert.equal(env.AI.calls.length, 0);
  // The checks are the protocol's: the same function refuses the same body.
  assert.match(chatCheck({ ...base, stream: true }, chatModelsFrom({})), /never a stream/);
  assert.equal(chatCheck(base, chatModelsFrom({})), null);
});

test('413: a body declared past 6 MiB, and words past 64 KiB — with no picture, and with one tiny picture beside them; pictures up to 6 MiB still go', async () => {
  const env = envWith();
  const declared = await worker.fetch(new Request('http://relay/ai/v1/chat/completions', { method: 'POST', headers: { origin: APP, 'content-length': String(7 * 1024 * 1024) }, body: '{}' }), env);
  assert.equal(declared.status, 413);
  assert.match(await said(declared), /at most 6,144 KB with its pictures/);
  const wordy = chat('reader', { messages: [{ role: 'user', content: 'x'.repeat(70 * 1024) }] });
  const big = await post(env, wordy);
  assert.equal(big.status, 413);
  assert.equal(await said(big), AI_WORDS.tooWordy(AI_CHAT_LIMITS.text));
  const tiny = await post(env, { ...wordy, messages: [{ role: 'user', content: [{ type: 'text', text: 'x'.repeat(70 * 1024) }, { type: 'image_url', image_url: { url: PNG } }] }] }, { 'cf-connecting-ip': '203.0.113.30' });
  assert.equal(tiny.status, 413);
  const photo = 'data:image/jpeg;base64,' + 'A'.repeat(3 * 1024 * 1024);
  const ok = await post(env, chat('reader', { messages: [{ role: 'user', content: [{ type: 'text', text: 'what does this page say?' }, { type: 'image_url', image_url: { url: photo } }] }] }), { 'cf-connecting-ip': '203.0.113.31' });
  assert.equal(ok.status, 200);
  assert.equal(env.AI.calls.length, 1);
});

test('who may ask: another origin no; no Origin and no key no; a room’s key yes; MM_AI_CHAT — and MM_DECIDE when it is unset — turn it off, and the list says so', async () => {
  const env = envWith();
  assert.equal((await post(env, chat(), { origin: 'https://evil.example' })).status, 403);
  const bare = await worker.fetch(new Request('http://relay/ai/v1/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(chat()) }), env);
  assert.equal(bare.status, 403);
  assert.equal(await said(bare), AI_WORDS.noOrigin);
  const key = await keyForRoom(SECRET, 'claude');
  const keyed = await worker.fetch(new Request('http://relay/ai/v1/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key, 'x-dyna-room': 'claude' }, body: JSON.stringify(chat()) }), env);
  assert.equal(keyed.status, 200);
  const wrong = await post(env, chat(), { authorization: 'Bearer nope', 'x-dyna-room': 'claude' });
  assert.equal(wrong.status, 403);
  assert.match(await said(wrong), /not the key for room “claude”/);
  const keyedOnly = envWith({ MM_AI_CHAT: 'keyed', MM_DECIDE: 'keyed' });
  const anon = await post(keyedOnly, chat());
  assert.equal(anon.status, 401);
  assert.equal(await said(anon), AI_WORDS.keyed);
  // Where only a room's key may ask, the lists say so to a page with none — so it seats nothing it could not ask — and answer one with it.
  for (const path of ['/ai/v1/models', '/decide']) {
    assert.equal((await worker.fetch(new Request('http://relay' + path, { headers: { origin: APP } }), keyedOnly)).status, 401, path);
    const k = await keyForRoom(SECRET, 'claude');
    assert.equal((await worker.fetch(new Request('http://relay' + path, { headers: { origin: APP, authorization: 'Bearer ' + k, 'x-dyna-room': 'claude' } }), keyedOnly)).status, 200, path);
  }
  // Off: the post and the list both say so, so a page that asks the list seats nothing.
  for (const vars of [{ MM_AI_CHAT: 'off' }, { MM_DECIDE: 'off' }]) {
    const off = envWith(vars);
    const res = await post(off, chat());
    assert.equal(res.status, 503, JSON.stringify(vars));
    assert.equal(await said(res), AI_WORDS.off);
    const list = await worker.fetch(new Request('http://relay/ai/v1/models', { headers: { origin: APP } }), off);
    assert.equal(list.status, 503);
    assert.equal(off.AI.calls.length, 0);
  }
  // Chat on, decisions off: each switch is its own once MM_AI_CHAT says.
  const split = envWith({ MM_DECIDE: 'off', MM_AI_CHAT: 'limited' });
  assert.equal((await post(split, chat())).status, 200);
  assert.equal((await worker.fetch(new Request('http://relay/decide', { headers: { origin: APP } }), split)).status, 503, 'the decider’s list says it is off too');
  assert.equal(chatModeOf({}), 'limited');
  assert.equal(chatModeOf({ MM_DECIDE: 'keyed' }), 'keyed');
  assert.equal(chatModeOf({ MM_DECIDE: 'off', MM_AI_CHAT: 'limited' }), 'limited');
  const odd = await post(envWith({ MM_AI_CHAT: 'sometimes' }), chat());
  assert.equal(odd.status, 503);
  assert.equal(await said(odd), AI_WORDS.mode);
  // The preflight lets the page's headers through.
  const pre = await worker.fetch(new Request('http://relay/ai/v1/chat/completions', { method: 'OPTIONS', headers: { origin: APP } }), env);
  assert.equal(pre.status, 204);
  assert.match(pre.headers.get('access-control-allow-headers'), /content-type/);
});

test(`429: past ${AI_CHAT_PER_MINUTE.caller} a minute from one address, past ${AI_CHAT_PER_MINUTE.room} for one room — and past the day’s budget for chat, which is its own, said by core in its own sentence`, async () => {
  const env = envWith();
  for (let i = 0; i < AI_CHAT_PER_MINUTE.caller; i++) assert.equal((await post(env, chat())).status, 200, `call ${i + 1}`);
  const over = await post(env, chat());
  assert.equal(over.status, 429);
  assert.equal(await said(over), AI_WORDS.rate);
  assert.ok(Number(over.headers.get('retry-after')) >= 1);
  assert.equal((await post(env, chat(), { 'cf-connecting-ip': '203.0.113.8' })).status, 200, 'another address is counted apart');
  // A decision from the same address is counted apart from chat.
  const decide = MM.buildSystemOne([MM.choice('w', 'which?', [{ id: 'molecule', text: 'm' }, { id: 'compound', text: 'c' }])], { text: 'three circles' }, { model: 'clef-flash' }).body;
  assert.equal((await post(env, decide, {}, 'http://relay/decide')).status, 200);
  const key = await keyForRoom(SECRET, 'busy');
  for (let i = 0; i < AI_CHAT_PER_MINUTE.room; i++) assert.equal((await post(env, chat(), { authorization: 'Bearer ' + key, 'x-dyna-room': 'busy' })).status, 200);
  assert.equal((await post(env, chat(), { authorization: 'Bearer ' + key, 'x-dyna-room': 'busy' })).status, 429);
  // The day's budget for chat, across everyone — and the decisions' budget stands apart from it.
  const tight = envWith({ MM_AI_CHAT_DAILY: '2' });
  assert.equal((await post(tight, chat())).status, 200);
  assert.equal((await post(tight, chat(), { 'cf-connecting-ip': '203.0.113.9' })).status, 200);
  const spent = await post(tight, chat(), { 'cf-connecting-ip': '203.0.113.10' });
  assert.equal(spent.status, 429);
  assert.equal(await said(spent), AI_WORDS.spent);
  assert.equal((await post(tight, decide, { 'cf-connecting-ip': '203.0.113.11' }, 'http://relay/decide')).status, 200, 'the decisions’ budget is its own');
  const r = await asPage(tight, () => MM.complete(HOUSE('writer'), [{ role: 'user', content: 'hi' }]), { ip: '203.0.113.12' });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'rate');
  assert.match(r.error, /^HTTP 429 — rate limited: “today’s writing and reading on dyna\.ink are spent/);
  assert.equal(aiChatDailyFrom({}), 2000);
  assert.equal(aiChatDailyFrom({ MM_AI_CHAT_DAILY: 'lots' }), 2000);
});

test(`a caller’s share of the day: past ${AI_CHAT_PER_DAY.caller} from one address the answer is 429 — and the budget stands for everyone else`, async () => {
  const env = envWith({ MM_AI_CHAT_DAILY: String(AI_CHAT_PER_DAY.caller * 3) });
  let now = Date.UTC(2026, 9, 23, 0, 0, 30);
  mock.method(Date, 'now', () => now);
  mock.method(console, 'log', () => {});
  try {
    for (let i = 0; i < AI_CHAT_PER_DAY.caller; i++) {
      if (i && i % AI_CHAT_PER_MINUTE.caller === 0) now += 61_000;
      assert.equal((await post(env, chat(), { 'cf-connecting-ip': '2001:db8:9::1' })).status, 200, `call ${i + 1}`);
    }
    now += 61_000;
    const over = await post(env, chat(), { 'cf-connecting-ip': '2001:db8:9::77' });
    assert.equal(over.status, 429);
    assert.equal(await said(over), AI_WORDS.share);
    assert.equal((await post(env, chat(), { 'cf-connecting-ip': '198.51.100.9' })).status, 200, 'another caller is still answered');
    assert.equal(env.AI.calls.length, AI_CHAT_PER_DAY.caller + 1);
  } finally { mock.restoreAll(); }
});

test(`the key of a room the relay opened is no key at all: refused with no Origin and where only a room’s key may ask, and from a page counted by its address — ${AI_CHAT_PER_MINUTE.caller} a minute across every room it opened`, async () => {
  const env = envWith({ MM_RELAY_MINT_PER_HOUR: '50' });
  const ip = '203.0.113.99';
  const rooms = [];
  // More rooms than it takes to ask past an address's minute, each opened by POST /rooms as any page may.
  for (let i = 0; i < 3; i++) {
    const opened = await worker.fetch(new Request('http://relay/rooms', { method: 'POST', headers: { origin: APP, 'cf-connecting-ip': ip } }), env);
    assert.equal(opened.status, 201);
    rooms.push(await opened.json());
  }
  // A script with no Origin and a key it opened for itself is refused, and no model is asked.
  const bare = await worker.fetch(new Request('http://relay/ai/v1/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + rooms[0].key, 'x-dyna-room': rooms[0].room, 'cf-connecting-ip': ip }, body: JSON.stringify(chat()) }), env);
  assert.equal(bare.status, 403);
  assert.equal(await said(bare), AI_WORDS.noOrigin);
  assert.equal(env.AI.calls.length, 0);
  // From a page, every room's key together is one address's minute — never a room's minute each.
  const statuses = {};
  for (const r of rooms) {
    for (let j = 0; j < AI_CHAT_PER_MINUTE.room; j++) {
      const res = await post(env, chat(), { authorization: 'Bearer ' + r.key, 'x-dyna-room': r.room, 'cf-connecting-ip': ip });
      statuses[res.status] = (statuses[res.status] || 0) + 1;
    }
  }
  assert.equal(statuses[200], AI_CHAT_PER_MINUTE.caller, JSON.stringify(statuses));
  assert.equal(env.AI.calls.length, AI_CHAT_PER_MINUTE.caller);
  // Where only a room's key may ask, the key of a room anyone may open is refused — the list too — and a room named by hand is not.
  const keyedOnly = envWith({ MM_AI_CHAT: 'keyed', MM_DECIDE: 'keyed' });
  const minted = await (await worker.fetch(new Request('http://relay/rooms', { method: 'POST', headers: { origin: APP } }), keyedOnly)).json();
  const asMinted = { authorization: 'Bearer ' + minted.key, 'x-dyna-room': minted.room };
  assert.equal((await post(keyedOnly, chat(), asMinted)).status, 401);
  assert.equal((await worker.fetch(new Request('http://relay/ai/v1/models', { headers: { origin: APP, ...asMinted } }), keyedOnly)).status, 401);
  assert.equal((await worker.fetch(new Request('http://relay/ai/v1/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json', ...asMinted }, body: JSON.stringify(chat()) }), keyedOnly)).status, 403);
  const named = await keyForRoom(SECRET, 'claude');
  assert.equal((await post(keyedOnly, chat(), { authorization: 'Bearer ' + named, 'x-dyna-room': 'claude' })).status, 200);
  assert.equal(keyedOnly.AI.calls.length, 1);
});

test('with no LIMITS binding the route fails closed, with no AI binding it says so — the list too — and no model is asked', async () => {
  const env = envWith();
  delete env.LIMITS;
  const closed = await post(env, chat());
  assert.equal(closed.status, 503);
  assert.equal(await said(closed), AI_WORDS.uncounted);
  assert.equal(env.AI.calls.length, 0);
  const none = envWith();
  delete none.AI;
  const res = await post(none, chat());
  assert.equal(res.status, 501);
  assert.equal(await said(res), AI_WORDS.noBinding);
  const list = await worker.fetch(new Request('http://relay/ai/v1/models', { headers: { origin: APP } }), none);
  assert.equal(list.status, 501);
  const catalog = await asPage(none, () => MM.readModels({ baseUrl: 'https://relay.dyna.ink/ai/v1' }));
  assert.equal(catalog.ok, false);
  assert.match(catalog.error, /^HTTP 501 — .*“this relay has no Workers AI binding/);
});

test('a model that throws is a 502 with its first 160 characters; one that does not answer in 60 s is a 504, in words', async () => {
  const env = envWith({}, () => { throw new Error('InferenceUpstreamError: ' + 'x'.repeat(400)); });
  const res = await post(env, chat());
  assert.equal(res.status, 502);
  const words = await said(res);
  assert.match(words, /^dyna\.ink’s writer failed — InferenceUpstreamError: x+$/);
  assert.ok(words.length <= 'dyna.ink’s writer failed — '.length + 160);
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const slow = envWith({}, () => new Promise(() => {}));
    const pending = post(slow, chat('reader'));
    for (let i = 0; i < 200 && !slow.AI.calls.length; i++) await new Promise((r) => setImmediate(r));
    assert.equal(slow.AI.calls.length, 1);
    mock.timers.tick(60_000);
    const r = await pending;
    assert.equal(r.status, 504);
    assert.equal(await said(r), 'dyna.ink’s reader did not answer in 60 s');
  } finally { mock.timers.reset(); }
});

test('what is logged is the route, the model, the status, the time and the size — never a message or a picture', async () => {
  const lines = [];
  const was = console.log;
  console.log = (...a) => lines.push(a.join(' '));
  try {
    await post(envWith(), chat('reader', { messages: [{ role: 'user', content: [{ type: 'text', text: 'SECRET BOARD WORDS' }, { type: 'image_url', image_url: { url: PNG } }] }] }));
  } finally { console.log = was; }
  assert.equal(lines.length, 1);
  const line = JSON.parse(lines[0]);
  assert.deepEqual(Object.keys(line), ['route', 'model', 'status', 'ms', 'bytes']);
  assert.equal(line.route, 'chat');
  assert.equal(line.model, 'reader');
  assert.doesNotMatch(lines[0], /SECRET|iVBOR|data:image/);
});

test('anything else under /ai/ answers 501 in words; the rooms and the decider are where they were', async () => {
  const env = envWith();
  const other = await worker.fetch(new Request('http://relay/ai/v1/embeddings', { method: 'POST', headers: { origin: APP }, body: '{}' }), env);
  assert.equal(other.status, 501);
  assert.equal(await said(other), AI_WORDS.elsewhere);
  assert.equal((await worker.fetch(new Request('http://relay/rooms/claude/events', { headers: { origin: APP } }), env)).status, 401);
  const list = await worker.fetch(new Request('http://relay/decide', { headers: { origin: APP } }), env);
  assert.equal(list.status, 200);
  assert.equal(env.AI.calls.length, 0);
});

test('the Node relay answers the chat route with 501 in words, with CORS — it asks no model — and core says so', async () => {
  const port = await freePort();
  const server = await startRelay(port);
  try {
    for (const [p, method] of [['/ai/v1/chat/completions', 'POST'], ['/ai/v1/models', 'GET']]) {
      const res = await fetch(`http://127.0.0.1:${port}${p}`, { method, headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:9' }, ...(method === 'POST' ? { body: JSON.stringify(chat()) } : {}) });
      assert.equal(res.status, 501, p);
      assert.equal(res.headers.get('access-control-allow-origin'), '*');
      assert.equal((await res.json()).error.message, AI_WORDS.noModel);
    }
    const catalog = await MM.readModels({ baseUrl: `http://127.0.0.1:${port}/ai/v1` });
    assert.equal(catalog.ok, false);
    assert.match(catalog.error, /^HTTP 501 — .*“this relay has no writer or reader of its own/);
    const r = await MM.complete(HOUSE('writer', { baseUrl: `http://127.0.0.1:${port}/ai/v1` }), [{ role: 'user', content: 'hi' }]);
    assert.equal(r.ok, false);
    assert.match(r.error, /^HTTP 501 — /);
  } finally { await new Promise((r) => server.close(r)); }
});

test('the Worker run in Node: with MM_AI_FAKE=1 a fake model answers over a socket — Node sends no Origin, so it is refused until it says one — and core reads it', async () => {
  const bare = await startDevRelay({ MM_RELAY_OPEN: '1' });
  try {
    const res = await fetch(`${bare.url}/ai/v1/models`, { headers: { origin: 'http://127.0.0.1:9' } });
    assert.equal(res.status, 501);
  } finally { await bare.close(); }
  const faked = await startDevRelay({ MM_RELAY_OPEN: '1', MM_AI_FAKE: '1' });
  try {
    const refused = await MM.complete(HOUSE('writer', { baseUrl: `${faked.url}/ai/v1` }), [{ role: 'user', content: 'hi' }]);
    assert.equal(refused.ok, false);
    assert.match(refused.error, /^HTTP 403 — .*from the app’s own page, or with a room’s key/);
    const was = globalThis.fetch;
    globalThis.fetch = (u, i = {}) => was(u, { ...i, headers: { ...(i.headers || {}), origin: 'http://127.0.0.1:9' } });
    try {
      const list = await MM.listModels({ baseUrl: `${faked.url}/ai/v1` });
      assert.deepEqual(list.models, ['reader', 'writer']);
      const r = await MM.complete(HOUSE('writer', { baseUrl: `${faked.url}/ai/v1` }), [{ role: 'user', content: 'hi' }]);
      assert.equal(r.ok, true, r.error);
      assert.equal(r.text, 'ok');
    } finally { globalThis.fetch = was; }
    assert.equal(faked.env.AI.calls.length, 1);
  } finally { await faked.close(); }
});

test('the fakes answer as the relay reads: a chat in either shape, a decision as before', () => {
  assert.deepEqual(chatAnswer({ messages: [{ role: 'user', content: 'hi' }] }).response, 'ok');
  assert.equal(chatAnswer({ messages: [{ role: 'user', content: 'hi' }] }, { spelling: 'choices' }).choices[0].message.content, 'ok');
  const read = chatReply(chatAnswer({ messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: PNG } }] }] }), 'reader', 4096);
  assert.equal(read.ok, true);
  assert.match(read.body.choices[0].message.content, /hello/);
  assert.ok(systemOneAnswers({ questions: { q1: { type: 'noul', instructions: 'is it?' } } }).answers.q1);
  assert.deepEqual(Object.keys(AI_CHAT_MODELS), ['writer', 'reader']);
  assert.equal(DECIDE_WORDS.off.length > 0, true);
});

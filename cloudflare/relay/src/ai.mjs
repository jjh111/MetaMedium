// The model routes — `/decide` (a decision model) and `/extract` (an extraction model) — through the Worker's Workers
// AI binding, so no key reaches a browser and none is sent by one. What a request may be is
// `Demos/decide-protocol.mjs` (the Node relay reads it too, and answers both with 501); what the page sends and how
// it reads the answer is core's `llm/decide-systemone.ts`. This file is who may ask, how often, and the call.
// And dyna.ink's own writer and reader (`/ai/v1/chat/completions`, `GET /ai/v1/models`): OpenAI's chat-completions
// shape, so core's transport speaks to it unchanged; the page names a house model by its short name (`writer`,
// `reader`) and the `@cf` id is the relay's own (`MM_AI_WRITER`, `MM_AI_READER`, `Demos/ai-protocol.mjs`). The same
// doors as a decision's — an app origin, or a room's key — under a switch of its own (`MM_AI_CHAT`, which follows
// `MM_DECIDE` when unset, so one word turns every model off), far fewer calls a minute, and a budget a day of its own
// (`MM_AI_CHAT_DAILY`) with a share of it per address, because a chat call costs far more than a decision. Anything
// else under `/ai/` answers 501, in words.
//
// Who may ask (`MM_DECIDE`: off | keyed | limited, `limited` when unset):
//   * a page of the app (an Origin `http.mjs` allows), limited per address — `DECIDE_PER_MINUTE.caller` a minute and
//     `DECIDE_PER_DAY.caller` a day, its share of the budget — an IPv6 address by its /64 (`callerKey`), because one
//     machine holds a whole /64 and would otherwise be 2^64 callers;
//   * a hand with a room's key (`Authorization: Bearer` and `X-Dyna-Room`, checked as the rooms check one), limited
//     per room — `DECIDE_PER_MINUTE.room` a minute — and by its address's share of the day like any caller (a key is
//     free to mint, so a share by key is no share); `keyed` admits only these;
//   * nothing else: a request with no Origin and no key is refused, because an Origin is easy to leave out and a
//     script anywhere would otherwise ask the account's Workers AI for free;
//   * and every call, whoever asks, counts against one budget a day (`MM_AI_DAILY`, `DEFAULT_AI_DAILY`), past which
//     the answer is 429 and the sentence says the engine's ranking stands.
// The counts are `limits.mjs`'s (one count wherever a request lands; with no LIMITS binding the route fails closed).
//
// The call: `env.AI.run(<@cf id>, { state, questions | fields, images? })`, raced against `DECIDE_WAIT_MS` (504 in
// words), a throw said with its first 160 characters (502), and on 200 `{ ok, model, ms, answers }` with the
// model's answers untouched. Nothing is cached and AI Gateway is not used (its logs would keep a board's words).
// What is logged is the route, the model, the status, the time and the size — never a state, a question or a
// criterion.

import { originAllowed, corsHeaders, text, json, callerOf } from './http.mjs';
import { secretsOf, keyOpens } from './auth.mjs';
import { hit } from './limits.mjs';
import {
  DECIDE_MODELS, EXTRACT_MODELS, DECIDE_LIMITS, DECIDE_WAIT_MS, DECIDE_PER_MINUTE, DECIDE_PER_DAY, DECIDE_WORDS,
  decideCheck, extractCheck, decideCatalog, aiDailyFrom, decideTextBytes,
} from '../../../Demos/decide-protocol.mjs';
import {
  AI_CHAT_LIMITS, AI_CHAT_WAIT_MS, AI_CHAT_PER_MINUTE, AI_CHAT_PER_DAY, AI_WORDS,
  chatModeOf, aiChatDailyFrom, chatModelsFrom, chatCatalog, chatCheck, chatTextBytes, chatInput, chatReply, chatError,
} from '../../../Demos/ai-protocol.mjs';

/** The paths this module answers. */
export const AI_PATH = /^\/(decide|extract|ai(\/[a-z0-9/-]*)?)$/;

const MINUTE = 60_000;
const DAY = 86_400_000;

const no = (status, error, headers = {}) => json(status, { ok: false, error }, headers);

/**
 * Who a caller with no key is counted as: an IPv4 address as it is, an IPv6 address by its /64 — the network one
 * machine is given, so it is one caller and not 2^64 — and an IPv4 address written as IPv6 (`::ffff:…`) as IPv4.
 * Anything that does not read as an address is counted as it came.
 */
export function callerKey(ip) {
  const a = String(ip || 'local').trim().toLowerCase().replace(/%.*$/, '');
  if (!a.includes(':')) return a;
  const mapped = /^(?:0{0,4}:){0,5}(?::|0{0,4}:)?ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(a);
  if (mapped) return mapped[1];
  const halves = a.split('::');
  if (halves.length > 2) return a;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  if (fill < 0 || (halves.length === 1 && head.length !== 8)) return a;
  const groups = [...head, ...Array(fill).fill('0'), ...tail];
  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return a;
  return groups.slice(0, 4).map((g) => parseInt(g, 16).toString(16)).join(':') + '::/64';
}

/** A request's body as text, read up to `cap` bytes: `{ text, size }`, or `{ over: true }` past it. */
async function bodyText(request, cap) {
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > cap) return { over: true };
  if (!request.body) return { text: '', size: 0 };
  const reader = request.body.getReader();
  const parts = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > cap) { await reader.cancel().catch(() => undefined); return { over: true }; }
    parts.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const p of parts) { all.set(p, at); at += p.byteLength; }
  return { text: new TextDecoder().decode(all), size };
}

/** Who is asking: a room's key that opens its room (`{ keyed: true, room }`), nobody in particular, or a refusal. */
async function askerOf(request, env) {
  const m = /^Bearer\s+(\S+)\s*$/i.exec(request.headers.get('authorization') || '');
  const room = request.headers.get('x-dyna-room') || '';
  if (!m && !room) return { keyed: false };
  if (!m || !room || room.length > 128) return { refuse: [401, DECIDE_WORDS.keyed] };
  if (!(await keyOpens(secretsOf(env.MM_RELAY_SECRET), room, m[1]))) return { refuse: [403, DECIDE_WORDS.wrongKey(room)] };
  return { keyed: true, room };
}

/** One line a call, never its words. */
function logCall(route, model, status, ms, bytes) {
  console.log(JSON.stringify({ route, model, status, ms, bytes }));
}

/**
 * Whether a route could answer at all — its switch, the binding — as a refusal `[status, words]`, or null. A GET of the
 * route's list answers it too, so a page that asks the list before it seats a house model (and calls no model doing
 * so) seats none where every ask would be refused.
 */
function closedWhy(mode, env, words) {
  if (mode === 'off') return [503, words.off];
  if (mode !== 'keyed' && mode !== 'limited') return [503, words.mode];
  if (!env.AI) return [501, words.noBinding];
  return null;
}

/** For a GET of a route's list: the route closed, or — where only a room's key may ask — a caller without one, as `[status, words]`; else null. */
async function listClosedWhy(request, env, mode, words) {
  const closed = closedWhy(mode, env, words);
  if (closed) return closed;
  if (mode !== 'keyed') return null;
  const asker = await askerOf(request, env);
  return asker.keyed ? null : [401, words.keyed];
}

async function modelRoute(request, env, cors, route) {
  const models = route === 'extract' ? EXTRACT_MODELS : DECIDE_MODELS;
  const mode = env.MM_DECIDE || 'limited';
  if (request.method === 'GET' || request.method === 'HEAD') {
    const shut = await listClosedWhy(request, env, mode, DECIDE_WORDS);
    return shut ? no(shut[0], shut[1], cors) : json(200, decideCatalog(route), cors);
  }
  const closed = closedWhy(mode, env, DECIDE_WORDS);
  if (request.method !== 'POST') return no(405, DECIDE_WORDS.method, cors);
  if (closed) return no(closed[0], closed[1], cors);

  const asker = await askerOf(request, env);
  if (asker.refuse) return no(asker.refuse[0], asker.refuse[1], cors);
  if (!asker.keyed && !request.headers.get('origin')) return no(403, DECIDE_WORDS.noOrigin, cors);
  if (mode === 'keyed' && !asker.keyed) return no(401, DECIDE_WORDS.keyed, cors);

  // Counted before the body is read: a flood of anything is a flood.
  let count;
  try {
    count = asker.keyed
      ? await hit(env, 'ai', 'room:' + asker.room, { limit: DECIDE_PER_MINUTE.room, windowMs: MINUTE })
      : await hit(env, 'ai', 'ip:' + callerKey(callerOf(request)), { limit: DECIDE_PER_MINUTE.caller, windowMs: MINUTE });
  } catch { return no(503, DECIDE_WORDS.uncounted, cors); }
  if (!count.ok) return no(429, DECIDE_WORDS.rate, { ...cors, 'retry-after': String(count.retryAfter || 60) });

  const read = await bodyText(request, DECIDE_LIMITS.bodyWithImages);
  if (read.over) return no(413, DECIDE_WORDS.tooBig(DECIDE_LIMITS.bodyWithImages / 1024), cors);
  let body;
  try { body = JSON.parse(read.text); } catch { return no(400, DECIDE_WORDS.notJson, cors); }
  const pictures = !!body && Array.isArray(body.images) && body.images.length > 0;
  // The words are held to 64 KiB with or without a picture: the 6 MiB is the pictures' alone.
  if (decideTextBytes(body, read.size) > DECIDE_LIMITS.body) return no(413, DECIDE_WORDS.tooBig(DECIDE_LIMITS.body / 1024), cors);
  const why = route === 'extract' ? extractCheck(body) : decideCheck(body);
  if (why) return no(400, why, cors);

  // Every call that will reach a model counts against the day's budget — one budget for both routes — and against
  // its address's share of it first, a room's key or none: a key is free to have (POST /rooms mints one for any page of
  // the app), so a share by key would let one machine mint rooms and spend the day for everyone.
  let budget;
  try {
    const share = await hit(env, 'ai-share', 'ip:' + callerKey(callerOf(request)), { limit: DECIDE_PER_DAY.caller, windowMs: DAY });
    if (!share.ok) return no(429, DECIDE_WORDS.share, { ...cors, 'retry-after': String(share.retryAfter || 3600) });
    budget = await hit(env, 'ai-budget', 'day', { limit: aiDailyFrom(env), windowMs: DAY });
  } catch { return no(503, DECIDE_WORDS.uncounted, cors); }
  if (!budget.ok) return no(429, DECIDE_WORDS.spent, { ...cors, 'retry-after': String(budget.retryAfter || 3600) });

  const m = models[body.model];
  const input = route === 'extract'
    ? { state: body.state, fields: body.fields }
    : { state: body.state ?? '', questions: body.questions, ...(pictures ? { images: body.images } : {}) };
  const t0 = Date.now();
  let timer;
  let out;
  try {
    out = await Promise.race([
      env.AI.run(m.id, input),
      new Promise((_, fail) => { timer = setTimeout(() => fail(Object.assign(new Error('timeout'), { timeout: true })), DECIDE_WAIT_MS); }),
    ]);
  } catch (e) {
    const ms = Date.now() - t0;
    if (e && e.timeout) { logCall(route, body.model, 504, ms, read.size); return no(504, DECIDE_WORDS.timeout(body.model), cors); }
    logCall(route, body.model, 502, ms, read.size);
    return no(502, DECIDE_WORDS.failed(body.model, e && e.message ? e.message : String(e)), cors);
  } finally { clearTimeout(timer); }
  const ms = Date.now() - t0;
  const answers = out && typeof out === 'object' ? out.answers : undefined;
  if (!answers || typeof answers !== 'object') { logCall(route, body.model, 502, ms, read.size); return no(502, DECIDE_WORDS.empty(body.model), cors); }
  logCall(route, body.model, 200, ms, read.size);
  return json(200, { ok: true, model: body.model, ms, answers }, cors);
}

// ---- dyna.ink's own writer and reader: the chat route ----

/** A refusal in OpenAI's error shape, which core's transport reads as the provider's own words. */
const refuse = (status, message, headers = {}) => json(status, chatError(status, message), headers);

/** `GET /ai/v1/models`: the house models and the limits — no model is called. Closed when every ask would be refused. */
async function chatModelsRoute(request, env, cors) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return refuse(405, AI_WORDS.method, cors);
  const shut = await listClosedWhy(request, env, chatModeOf(env), AI_WORDS);
  if (shut) return refuse(shut[0], shut[1], cors);
  return json(200, chatCatalog(env), cors);
}

/** `POST /ai/v1/chat/completions`: who may ask and how often, the shape, the call, and the reply as OpenAI's. */
async function chatRoute(request, env, cors) {
  if (request.method !== 'POST') return refuse(405, AI_WORDS.method, cors);
  const mode = chatModeOf(env);
  const closed = closedWhy(mode, env, AI_WORDS);
  if (closed) return refuse(closed[0], closed[1], cors);

  const asker = await askerOf(request, env);
  if (asker.refuse) return refuse(asker.refuse[0], asker.refuse[0] === 401 ? AI_WORDS.keyed : asker.refuse[1], cors);
  if (!asker.keyed && !request.headers.get('origin')) return refuse(403, AI_WORDS.noOrigin, cors);
  if (mode === 'keyed' && !asker.keyed) return refuse(401, AI_WORDS.keyed, cors);
  const who = asker.keyed ? 'room:' + asker.room : 'ip:' + callerKey(callerOf(request));

  // Counted before the body is read: a flood of anything is a flood.
  let count;
  try {
    count = await hit(env, 'ai-chat', who, { limit: asker.keyed ? AI_CHAT_PER_MINUTE.room : AI_CHAT_PER_MINUTE.caller, windowMs: MINUTE });
  } catch { return refuse(503, AI_WORDS.uncounted, cors); }
  if (!count.ok) return refuse(429, AI_WORDS.rate, { ...cors, 'retry-after': String(count.retryAfter || 60) });

  const read = await bodyText(request, AI_CHAT_LIMITS.bodyWithImages);
  if (read.over) return refuse(413, AI_WORDS.tooBig(AI_CHAT_LIMITS.bodyWithImages), cors);
  let body;
  try { body = JSON.parse(read.text); } catch { return refuse(400, AI_WORDS.notJson, cors); }
  // The words are held to 64 KiB with or without a picture: the 6 MiB is the pictures' alone.
  if (chatTextBytes(body, read.size) > AI_CHAT_LIMITS.text) return refuse(413, AI_WORDS.tooWordy(AI_CHAT_LIMITS.text), cors);
  const models = chatModelsFrom(env);
  const why = chatCheck(body, models);
  if (why) return refuse(400, why, cors);
  const m = models[body.model];
  if (!m.id) return refuse(503, AI_WORDS.notSet(body.model), cors);

  // Every call that will reach a model counts against the day's budget for chat, and against its address's share of it
  // first — a room's key or none: a key is free to have (POST /rooms mints one for any page of the app), so a share by
  // key would let one machine mint rooms and spend the day for everyone.
  let budget;
  try {
    const share = await hit(env, 'ai-chat-share', 'ip:' + callerKey(callerOf(request)), { limit: AI_CHAT_PER_DAY.caller, windowMs: DAY });
    if (!share.ok) return refuse(429, AI_WORDS.share, { ...cors, 'retry-after': String(share.retryAfter || 3600) });
    budget = await hit(env, 'ai-chat-budget', 'day', { limit: aiChatDailyFrom(env), windowMs: DAY });
  } catch { return refuse(503, AI_WORDS.uncounted, cors); }
  if (!budget.ok) return refuse(429, AI_WORDS.spent, { ...cors, 'retry-after': String(budget.retryAfter || 3600) });

  const input = chatInput(body, m);
  const t0 = Date.now();
  let timer;
  let out;
  try {
    out = await Promise.race([
      env.AI.run(m.id, input),
      new Promise((_, fail) => { timer = setTimeout(() => fail(Object.assign(new Error('timeout'), { timeout: true })), AI_CHAT_WAIT_MS); }),
    ]);
  } catch (e) {
    const ms = Date.now() - t0;
    if (e && e.timeout) { logCall('chat', body.model, 504, ms, read.size); return refuse(504, AI_WORDS.timeout(body.model), cors); }
    logCall('chat', body.model, 502, ms, read.size);
    return refuse(502, AI_WORDS.failed(body.model, e && e.message ? e.message : String(e)), cors);
  } finally { clearTimeout(timer); }
  const ms = Date.now() - t0;
  const reply = chatReply(out, body.model, input.max_tokens);
  if (!reply.ok) { logCall('chat', body.model, 502, ms, read.size); return refuse(502, reply.words, cors); }
  logCall('chat', body.model, 200, ms, read.size);
  return json(200, reply.body, cors);
}

export async function aiRoute(request, env) {
  const origin = request.headers.get('origin');
  if (origin && !originAllowed(origin, env)) return text(403, 'this origin may not use this relay', corsHeaders(origin));
  const cors = origin ? corsHeaders(origin) : {};
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const path = new URL(request.url).pathname;
  if (path === '/decide') return modelRoute(request, env, cors, 'decide');
  if (path === '/extract') return modelRoute(request, env, cors, 'extract');
  if (path === '/ai/v1/chat/completions') return chatRoute(request, env, cors);
  if (path === '/ai/v1/models') return chatModelsRoute(request, env, cors);
  return refuse(501, AI_WORDS.elsewhere, cors);
}

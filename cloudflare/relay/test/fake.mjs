// What the Worker is run against in Node: a storage that behaves as a Durable
// Object's does (get / put / delete with one key or many, list by prefix, in
// key order), a namespace that hands out one Room per name — and can forget
// the Room while keeping its storage, as Cloudflare does when it evicts one —
// and a stand-in for the Worker's environment. No workerd, no network.

import { Room, Limits } from '../src/worker.mjs';

export function fakeStorage(map = new Map()) {
  const writes = { puts: 0, deletes: 0 };
  return {
    map,
    writes,
    async get(k) {
      if (Array.isArray(k)) return new Map(k.filter((x) => map.has(x)).map((x) => [x, structuredClone(map.get(x))]));
      return map.has(k) ? structuredClone(map.get(k)) : undefined;
    },
    async put(k, v) {
      writes.puts++;
      if (typeof k === 'string') { map.set(k, structuredClone(v)); return; }
      for (const [key, val] of Object.entries(k)) map.set(key, structuredClone(val));
    },
    async delete(k) {
      writes.deletes++;
      const ks = Array.isArray(k) ? k : [k];
      if (ks.length > 128) throw new Error('a delete takes at most 128 keys');
      let n = 0;
      for (const key of ks) if (map.delete(key)) n++;
      return Array.isArray(k) ? n : n > 0;
    },
    async list({ prefix = '' } = {}) {
      return new Map([...map.entries()].filter(([k]) => k.startsWith(prefix)).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => [k, structuredClone(v)]));
    },
    async deleteAll() { writes.deletes++; map.clear(); },
    // An alarm is held, never fired by itself: a test fires it by calling the object's alarm().
    alarm: null,
    async getAlarm() { return this.alarm; },
    async setAlarm(at) { this.alarm = Number(at); },
    async deleteAlarm() { this.alarm = null; },
  };
}

/** A namespace of Durable Objects of one class over fake storage, one per name (a scope of LIMITS, say). */
export function fakeObjects(Class, env) {
  const storages = new Map();
  const objects = new Map();
  const storageOf = (name) => storages.get(name) || storages.set(name, fakeStorage()).get(name);
  const objectOf = (name) => objects.get(name) || objects.set(name, new Class({ storage: storageOf(name), blockConcurrencyWhile: (f) => f() }, env)).get(name);
  return {
    storages,
    objects,
    objectOf,
    idFromName: (name) => name,
    get(id) { return { fetch: (req, init) => objectOf(id).fetch(req instanceof Request ? req : new Request(req, init)) }; },
  };
}

/** A namespace of Rooms over fake storage, one per name. */
export function fakeNamespace(env) {
  const storages = new Map();
  const rooms = new Map();
  const storageOf = (name) => storages.get(name) || storages.set(name, fakeStorage()).get(name);
  return {
    storages,
    rooms,
    idFromName: (name) => name,
    get(id) {
      return {
        fetch: (req) => {
          if (!rooms.has(id)) rooms.set(id, new Room({ storage: storageOf(id), blockConcurrencyWhile: (f) => f() }, env));
          return rooms.get(id).fetch(req);
        },
      };
    },
    /** Cloudflare evicts an idle Durable Object; its storage stays. */
    evict(name) { rooms.delete(name); },
  };
}

/** The Worker's environment: the rooms, the limits, and whatever else a test sets (an `AI`, say). */
export function fakeEnv(vars = {}) {
  const env = { ...vars };
  env.ROOMS = fakeNamespace(env);
  env.LIMITS = fakeObjects(Limits, env);
  return env;
}

/**
 * What a System One decision model answers, written as the fakes answer it (never a real model's reply — core's
 * `llm/fixtures/systemone-replies.json` holds the spellings): for each choice, the last option that is not
 * `none_of_these` leads at `p` and the rest share what is left; a score leads at its top level; a noul is `p` sure of
 * yes; an extraction finds nothing (every field absent, `p_null` 1).
 */
export function systemOneAnswers(input, p = 0.995) {
  const answers = {};
  for (const [name, q] of Object.entries((input && input.questions) || {})) {
    if (q.type === 'noul') { answers[name] = { type: 'noul', value: p }; continue; }
    const keys = q.type === 'score' ? q.criteria.slice() : Object.keys(q.criteria || {});
    const named = keys.filter((k) => k !== 'none_of_these');
    const lead = (named.length ? named : keys)[(named.length ? named : keys).length - 1];
    const probabilities = {};
    for (const k of keys) probabilities[k] = k === lead ? p : (1 - p) / Math.max(1, keys.length - 1);
    answers[name] = q.type === 'score'
      ? { type: 'score', score: keys.indexOf(lead), probabilities, confidence: p }
      : { type: 'choice', choice: lead, probabilities, confidence: p };
  }
  for (const [name, f] of Object.entries((input && input.fields) || {})) answers[name] = { type: f.type, value: null, p_null: 1, confidence: 1 };
  return { answers };
}

/**
 * What a chat model answers, written as the fakes answer it (never a real model's reply): Workers AI's own shape,
 * `{ response, usage }` — or, with `spelling: 'choices'`, OpenAI's — saying, by what it was asked: a reading of the
 * words in a picture (`[{"text":"hello",…}]`) when a picture came; a reading of a group (`[{"label":…}]`) when the
 * system prompt asks for interpretations; else `ok`. Enough to work on the page's writer and reader on this machine.
 */
export function chatAnswer(input, { spelling = 'response', text } = {}) {
  const messages = (input && input.messages) || [];
  const system = messages.filter((m) => m.role === 'system').map((m) => (typeof m.content === 'string' ? m.content : '')).join('\n');
  const picture = messages.some((m) => Array.isArray(m.content) && m.content.some((p) => p && p.type === 'image_url'));
  const said = text !== undefined ? text
    : picture ? JSON.stringify([{ text: 'hello', confidence: 0.92 }])
      : /offer INTERPRETATIONS/.test(system) ? JSON.stringify([{ label: 'a fake reading', confidence: 0.7, reasoning: 'the relay’s fake model — never a real one' }])
        : 'ok';
  const usage = { prompt_tokens: 12, completion_tokens: 3, total_tokens: 15 };
  return spelling === 'choices'
    ? { id: 'fake', object: 'chat.completion', choices: [{ index: 0, message: { role: 'assistant', content: said }, finish_reason: 'stop' }], usage }
    : { response: said, usage };
}

/**
 * A stand-in for the Workers AI binding: `run(model, input)` answers from `book` — a function `(model, input)` that
 * returns (or resolves to) the reply and throws to fail, or a map of `@cf/…` id to reply — and keeps every call
 * (`calls`: the model and the input as asked). With no book it answers a chat (`messages`) as `chatAnswer` does and a
 * decision as `systemOneAnswers` does. Nothing is reached: no network, no account.
 */
export function fakeAI(book = (model, input) => (input && Array.isArray(input.messages) ? chatAnswer(input) : systemOneAnswers(input))) {
  const calls = [];
  return {
    calls,
    async run(model, input) {
      calls.push({ model, input: structuredClone(input) });
      const reply = typeof book === 'function' ? await book(model, input) : book[model];
      if (reply === undefined) throw new Error(`AiError: no such model ${model}`);
      return structuredClone(reply);
    },
  };
}

/** Read an SSE response until `done(text)`, then stop reading. */
export async function readUntil(res, done, ms = 3000) {
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let text = '';
  const end = Date.now() + ms;
  let pending = null;   // one read at a time: a read left behind by a timeout would swallow the next chunk
  try {
    while (!done(text)) {
      if (Date.now() > end) throw new Error('timed out reading the stream; got ' + JSON.stringify(text));
      pending = pending || reader.read();
      const r = await Promise.race([pending, new Promise((r) => setTimeout(() => r({ timeout: true }), 50))]);
      if (r.timeout) continue;
      pending = null;
      if (r.done) break;
      text += dec.decode(r.value, { stream: true });
    }
  } finally { await reader.cancel().catch(() => undefined); }
  return text;
}

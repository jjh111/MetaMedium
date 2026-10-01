// What the Worker is run against in Node: a storage that behaves as a Durable
// Object's does (get / put / delete with one key or many, list by prefix, in
// key order), a namespace that hands out one Room per name — and can forget
// the Room while keeping its storage, as Cloudflare does when it evicts one —
// and a stand-in for the Worker's environment. No workerd, no network.

import { Room } from '../src/worker.mjs';

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

/** The Worker's environment: a namespace and whatever else a test sets. */
export function fakeEnv(vars = {}) {
  const env = { ...vars };
  env.ROOMS = fakeNamespace(env);
  return env;
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

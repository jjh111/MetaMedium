// Limits: how many of something a caller may do in a window, counted in a Durable Object so the
// count is one count wherever on Cloudflare's network the request lands (a rate-limit binding is
// per location). One object per scope (`mint`, `ai`, …), named by the scope, holding fixed
// windows: `<windowMs>:<bucket>:<key>` → how many so far. Old windows are let go by an alarm.
//
// `hit(env, scope, key, { limit, windowMs, cost })` is what a route asks: `{ ok: true, remaining }`
// or `{ ok: false, retryAfter }` in seconds. Or several counts at once — `hit(env, scope, [{ key, limit,
// windowMs, cost }, …])` — taken all or none: every one is read, and only when each has room are they all
// written, so a request refused by any one count writes no row at all (`refused` says which). With no LIMITS
// binding it throws: a route that is limited fails closed, never open.
//
// What a hit writes is one storage row a count it takes (and its window's delete, later, by the alarm); a hit
// refused writes none. `prefilter` is the in-memory count a route asks first, so most of a flood never reaches
// this object at all.
//
// And a gauge, which no window empties: `hold(env, scope, key, delta, limit)` adds `delta` to what is
// held under `key` — refused whole when a rise would pass `limit`; a fall is always taken, never below
// nothing — and says what is held: `{ ok, held }`. What every room the relay opened holds at once is
// one (store.mjs, `reserveMinted`), kept under `held:<key>`, which the alarm never lets go of.

/** The most counts one hit may take at once. */
const MAX_KEYS = 8;

/** Where a gauge is kept in a Limits object's storage: never a window's `<windowMs>:<bucket>:<key>`. */
const HELD = 'held:';

export class Limits {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request) {
    let ask;
    try { ask = await request.json(); } catch { return Response.json({ ok: false, error: 'a limit is asked as JSON' }, { status: 400 }); }
    if (ask && ask.op === 'hold') return this.hold(ask);
    const counts = Array.isArray(ask && ask.keys) ? ask.keys : [ask || {}];
    if (!counts.length || counts.length > MAX_KEYS) return Response.json({ ok: false, error: 'one to ' + MAX_KEYS + ' counts' }, { status: 400 });
    const now = Date.now();
    const asked = [];
    for (const c of counts) {
      const { key, limit, windowMs, cost = 1 } = c || {};
      if (typeof key !== 'string' || !(limit >= 0) || !(windowMs > 0) || !(cost >= 0)) return Response.json({ ok: false, error: 'key, limit, windowMs' }, { status: 400 });
      const bucket = Math.floor(now / windowMs);
      asked.push({ name: `${windowMs}:${bucket}:${key}`, limit, cost, ends: (bucket + 1) * windowMs });
    }
    // Every count read first; none written unless every one has room — a refused request writes no row.
    const held = await this.ctx.storage.get(asked.map((a) => a.name));
    const now0 = (a) => Number(held.get(a.name)) || 0;
    for (let i = 0; i < asked.length; i++) {
      const a = asked[i];
      if (now0(a) + a.cost > a.limit) return Response.json({ ok: false, refused: i, count: now0(a), retryAfter: Math.max(1, Math.ceil((a.ends - now) / 1000)) });
    }
    const put = {};
    for (const a of asked) if (a.cost > 0) put[a.name] = now0(a) + a.cost;
    if (Object.keys(put).length) await this.ctx.storage.put(put);
    // Let go of these windows once they have passed (an alarm already set earlier stays).
    const ends = Math.min(...asked.map((a) => a.ends));
    if (Object.keys(put).length && this.ctx.storage.getAlarm && this.ctx.storage.setAlarm) {
      const at = await this.ctx.storage.getAlarm();
      if (at == null || at > ends + 1000) await this.ctx.storage.setAlarm(ends + 1000);
    }
    const first = asked[0];
    return Response.json({ ok: true, count: now0(first) + first.cost, remaining: Math.min(...asked.map((a) => a.limit - now0(a) - a.cost)) });
  }

  /** A gauge: `delta` added to what is held under `key`, unless a rise would pass `limit`. */
  async hold({ key, delta, limit }) {
    if (typeof key !== 'string' || !Number.isFinite(delta) || !(limit >= 0)) return Response.json({ ok: false, error: 'key, delta, limit' }, { status: 400 });
    const name = HELD + key;
    const held = Number(await this.ctx.storage.get(name)) || 0;
    if (delta > 0 && held + delta > limit) return Response.json({ ok: false, held });
    const now = Math.max(0, held + delta);
    if (now !== held) await this.ctx.storage.put(name, now);
    return Response.json({ ok: true, held: now });
  }

  /** Forget every window that has ended; set the alarm again for the next one that will. A gauge is never a window. */
  async alarm() {
    const now = Date.now();
    const gone = [];
    let next = Infinity;
    for (const name of (await this.ctx.storage.list()).keys()) {
      if (name.startsWith(HELD)) continue;
      const [w, b] = name.split(':');
      const ends = (Number(b) + 1) * Number(w);
      if (!(ends > now)) gone.push(name);
      else next = Math.min(next, ends);
    }
    for (let i = 0; i < gone.length; i += 128) await this.ctx.storage.delete(gone.slice(i, i + 128));
    if (next < Infinity) await this.ctx.storage.setAlarm(next + 1000);
  }
}

/**
 * Count one (or `cost`) against `key` in `scope`: `{ ok, remaining }` or `{ ok: false, retryAfter }`. With an array
 * of `{ key, limit, windowMs, cost }` in place of `key`, every count is taken or none is (`refused`: the index of the
 * first that had no room).
 */
export async function hit(env, scope, key, { limit, windowMs, cost = 1 } = {}) {
  if (!env.LIMITS) throw new Error('this relay has no LIMITS binding — its limited routes are closed');
  const stub = env.LIMITS.get(env.LIMITS.idFromName(scope));
  const body = Array.isArray(key)
    ? { keys: key.map((k) => ({ key: k.key, limit: k.limit, windowMs: k.windowMs, cost: k.cost === undefined ? 1 : k.cost })) }
    : { key, limit, windowMs, cost };
  const res = await stub.fetch(new Request('https://limits/hit', { method: 'POST', body: JSON.stringify(body) }));
  return res.json();
}

/**
 * The counts one caller is held to, in every bucket it is counted in (`callerBuckets`, http.mjs: an address, and an
 * IPv6 address's /56 at NET56_TIMES its allowance): `[{ key: prefix + bucket, limit: limit × times, windowMs, cost }]`.
 */
export const perCaller = (prefix, buckets, { limit, windowMs, cost = 1 }) =>
  buckets.map((b) => ({ key: prefix + b.key, limit: limit * b.times, windowMs, cost }));

// ---- A count in memory, before a durable one ----
// A route asks this first: an isolate's own fixed-window count of a key, so a flood from one caller is refused here
// and never reaches the Limits object — where even a refusal is a request, and a hit let through writes a row. It is
// a prefilter, not the limit: each isolate keeps its own (a caller whose requests land on many is let through by each,
// and the durable count is the one that holds). Held per `env` — the same object for every request an isolate serves
// — and bounded: past PREFILTER_KEYS keys it lets go of the ones whose window has passed, then the oldest.
const PREFILTER_KEYS = 4096;
const prefilters = new WeakMap();

/** Whether a request counted under `key` may go on to the durable count: null, or the seconds to wait. */
export function prefilter(env, key, limit, windowMs) {
  let m = prefilters.get(env);
  if (!m) prefilters.set(env, (m = new Map()));
  const now = Date.now();
  const ends = (Math.floor(now / windowMs) + 1) * windowMs;
  const c = m.get(key);
  const n = c && c.ends === ends ? c.n : 0;
  if (n + 1 > limit) return Math.max(1, Math.ceil((ends - now) / 1000));
  m.delete(key);
  m.set(key, { ends, n: n + 1 });
  if (m.size > PREFILTER_KEYS) {
    for (const [k, v] of m) if (v.ends <= now) m.delete(k);
    while (m.size > PREFILTER_KEYS) m.delete(m.keys().next().value);
  }
  return null;
}

/** Add `delta` to the gauge `key` in `scope`, held to `limit` on a rise: `{ ok, held }`. Throws with no LIMITS binding. */
export async function hold(env, scope, key, delta, limit) {
  if (!env.LIMITS) throw new Error('this relay has no LIMITS binding — its limited routes are closed');
  const stub = env.LIMITS.get(env.LIMITS.idFromName(scope));
  const res = await stub.fetch(new Request('https://limits/hold', { method: 'POST', body: JSON.stringify({ op: 'hold', key, delta, limit }) }));
  return res.json();
}

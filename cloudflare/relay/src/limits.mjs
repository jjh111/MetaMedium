// Limits: how many of something a caller may do in a window, counted in a Durable Object so the
// count is one count wherever on Cloudflare's network the request lands (a rate-limit binding is
// per location). One object per scope (`mint`, `decide`, …), named by the scope, holding fixed
// windows: `<windowMs>:<bucket>:<key>` → how many so far. Old windows are let go by an alarm.
//
// `hit(env, scope, key, { limit, windowMs, cost })` is what a route asks: `{ ok: true, remaining }`
// or `{ ok: false, retryAfter }` in seconds. With no LIMITS binding it throws: a route that is
// limited fails closed, never open.
//
// And a gauge, which no window empties: `hold(env, scope, key, delta, limit)` adds `delta` to what is
// held under `key` — refused whole when a rise would pass `limit`; a fall is always taken, never below
// nothing — and says what is held: `{ ok, held }`. What every room the relay opened holds at once is
// one (worker.mjs, `reserve`), kept under `held:<key>`, which the alarm never lets go of.

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
    const { key, limit, windowMs, cost = 1 } = ask || {};
    if (typeof key !== 'string' || !(limit >= 0) || !(windowMs > 0) || !(cost >= 0)) return Response.json({ ok: false, error: 'key, limit, windowMs' }, { status: 400 });
    const now = Date.now();
    const bucket = Math.floor(now / windowMs);
    const name = `${windowMs}:${bucket}:${key}`;
    const held = Number(await this.ctx.storage.get(name)) || 0;
    const ends = (bucket + 1) * windowMs;
    if (held + cost > limit) return Response.json({ ok: false, count: held, retryAfter: Math.max(1, Math.ceil((ends - now) / 1000)) });
    await this.ctx.storage.put(name, held + cost);
    // Let go of this window once it has passed (an alarm already set earlier stays).
    if (this.ctx.storage.getAlarm && this.ctx.storage.setAlarm) {
      const at = await this.ctx.storage.getAlarm();
      if (at == null || at > ends + 1000) await this.ctx.storage.setAlarm(ends + 1000);
    }
    return Response.json({ ok: true, count: held + cost, remaining: limit - held - cost });
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

/** Count one (or `cost`) against `key` in `scope`: `{ ok, remaining }` or `{ ok: false, retryAfter }`. */
export async function hit(env, scope, key, { limit, windowMs, cost = 1 }) {
  if (!env.LIMITS) throw new Error('this relay has no LIMITS binding — its limited routes are closed');
  const stub = env.LIMITS.get(env.LIMITS.idFromName(scope));
  const res = await stub.fetch(new Request('https://limits/hit', { method: 'POST', body: JSON.stringify({ key, limit, windowMs, cost }) }));
  return res.json();
}

/** Add `delta` to the gauge `key` in `scope`, held to `limit` on a rise: `{ ok, held }`. Throws with no LIMITS binding. */
export async function hold(env, scope, key, delta, limit) {
  if (!env.LIMITS) throw new Error('this relay has no LIMITS binding — its limited routes are closed');
  const stub = env.LIMITS.get(env.LIMITS.idFromName(scope));
  const res = await stub.fetch(new Request('https://limits/hold', { method: 'POST', body: JSON.stringify({ op: 'hold', key, delta, limit }) }));
  return res.json();
}

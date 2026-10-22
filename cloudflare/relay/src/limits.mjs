// Limits: how many of something a caller may do in a window, counted in a Durable Object so the
// count is one count wherever on Cloudflare's network the request lands (a rate-limit binding is
// per location). One object per scope (`mint`, `decide`, …), named by the scope, holding fixed
// windows: `<windowMs>:<bucket>:<key>` → how many so far. Old windows are let go by an alarm.
//
// `hit(env, scope, key, { limit, windowMs, cost })` is what a route asks: `{ ok: true, remaining }`
// or `{ ok: false, retryAfter }` in seconds. With no LIMITS binding it throws: a route that is
// limited fails closed, never open.

export class Limits {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request) {
    let ask;
    try { ask = await request.json(); } catch { return Response.json({ ok: false, error: 'a limit is asked as JSON' }, { status: 400 }); }
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

  /** Forget every window that has ended; set the alarm again for the next one that will. */
  async alarm() {
    const now = Date.now();
    const gone = [];
    let next = Infinity;
    for (const name of (await this.ctx.storage.list()).keys()) {
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

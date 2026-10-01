// The room relay on Cloudflare: Demos/relay.mjs's protocol — rooms, a
// Server-Sent Events stream with Last-Event-ID catch-up, POST of lines — as a
// Worker in front of one Durable Object per room, so an https page on an iPad
// can reach it and an agent anywhere can join the same room. `LiveStore`,
// `Demos/live-node.mjs` and the MCP hand speak to it unchanged, but for the
// base URL and a key.
//
// What is shared with the Node relay is one file, `Demos/relay-protocol.mjs`
// (what a client is replayed, the truncation word, the cap) — never a copy.
// What this adds: a key per room, an origin list, lines kept in the Durable
// Object's storage (so a room outlives its object being evicted) and a room
// bounded in characters as well as lines. The relay has no truth of its own and
// holds no key of anyone's: a line is a hand's log, carried.
//
// Environment (wrangler.toml and `wrangler secret put`; README.md):
//   ROOMS               the Durable Object namespace (binding)
//   MM_RELAY_SECRET     secret; room keys are HMACs of the room name under it.
//                       Comma-separated: new first, old while hands move over.
//   MM_RELAY_OPEN       "1": no key asked, on purpose. Without it and without a
//                       secret the relay refuses everything (503).
//   MM_RELAY_ORIGINS    more origins a browser may call from, comma-separated
//   MM_RELAY_MAX_LINES  lines a room keeps (default 5000, as the Node relay)
//   MM_RELAY_MAX_BYTES  characters a room keeps (default 32,000,000)

import { kindOf, replay, truncationNotice, maxLinesFrom } from '../../../Demos/relay-protocol.mjs';
import { secretsOf, keyOpens } from './auth.mjs';

/** The largest line a POST may carry, in characters (the Node relay's cap). */
export const MAX_LINE_CHARS = 4e6;
/** What a room keeps in characters when nothing says otherwise. */
export const DEFAULT_MAX_CHARS = 32e6;
/** A value in a Durable Object's storage may be held to 128 KiB: a line is kept in pieces under it, even of 3-byte characters. */
export const CHUNK_CHARS = 40000;
const MAX_ROOM_NAME = 128;
const BEAT_MS = 25000;

/** Origins a browser may call from: the app, its old address, a page served from this machine. */
const ORIGINS = ['https://dyna.ink', 'https://www.dyna.ink', 'https://app.dyna.ink', 'https://jjh111.github.io'];
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d+$/;
function originAllowed(origin, env) {
  if (ORIGINS.includes(origin) || LOCAL.test(origin)) return true;
  return String(env.MM_RELAY_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean).includes(origin);
}
const corsHeaders = (origin) => ({
  'access-control-allow-origin': origin,
  'access-control-allow-headers': 'content-type, last-event-id, authorization',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-max-age': '86400',
  vary: 'origin',
});
const text = (status, body, extra = {}) => new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', ...extra } });

function keyOf(request, url) {
  const m = /^Bearer\s+(\S+)\s*$/i.exec(request.headers.get('authorization') || '');
  return m ? m[1] : url.searchParams.get('key') || '';
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/' && (request.method === 'GET' || request.method === 'HEAD')) return text(200, 'dyna.ink relay — rooms/<room>/events (GET is a stream, POST is a line)\n');
    const m = /^\/rooms\/([^/]+)\/events$/.exec(url.pathname);
    if (!m) return text(404, 'rooms/<room>/events');
    const origin = request.headers.get('origin');
    if (origin && !originAllowed(origin, env)) return text(403, 'this origin may not use this relay');
    const cors = origin ? corsHeaders(origin) : {};
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    let room;
    try { room = decodeURIComponent(m[1]); } catch { return text(400, 'a room name is text', cors); }
    if (!room || room.length > MAX_ROOM_NAME) return text(400, 'a room name is 1–' + MAX_ROOM_NAME + ' characters', cors);
    if (request.method !== 'GET' && request.method !== 'POST') return text(405, '', cors);

    if (env.MM_RELAY_OPEN !== '1') {
      const secrets = secretsOf(env.MM_RELAY_SECRET);
      if (!secrets.length) return text(503, 'this relay has no key configured — set the MM_RELAY_SECRET secret (or MM_RELAY_OPEN=1 for an open relay run on purpose)', cors);
      const key = keyOf(request, url);
      if (!key) return text(401, 'this relay needs a key — send it as ?key= or Authorization: Bearer', { ...cors, 'www-authenticate': 'Bearer' });
      if (!(await keyOpens(secrets, room, key))) return text(403, 'that is not the key for room “' + room + '”', cors);
    }

    // The Durable Object is told the room by its name, not by anything in the request it need not see.
    const res = await env.ROOMS.get(env.ROOMS.idFromName(room)).fetch(request);
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(cors)) headers.set(k, v);
    return new Response(res.body, { status: res.status, headers });
  },
};

const pad = (n, w) => String(n).padStart(w, '0');
const mKey = (id) => 'm:' + pad(id, 12);
const cKey = (id, k) => 'c:' + pad(id, 12) + ':' + pad(k, 4);
const enc = new TextEncoder();

/**
 * One room: its lines in order, kept in storage (a line as pieces under the
 * value limit, with a small record beside it), mirrored in memory — bounded in
 * lines and in characters — and the open streams each new line is written to.
 */
export class Room {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.name = '';
    this.lines = [];       // [{ id, data, participant, kind, n }]
    this.dropped = 0;
    this.last = 0;
    this.chars = 0;
    this.clients = new Set();
    this.beat = null;
    this.ready = ctx.blockConcurrencyWhile ? ctx.blockConcurrencyWhile(() => this.load()) : this.load();
  }

  async load() {
    const meta = (await this.ctx.storage.get('meta')) || {};
    this.last = Number(meta.last) || 0;
    this.dropped = Number(meta.dropped) || 0;
    const records = await this.ctx.storage.list({ prefix: 'm:' });
    const chunks = await this.ctx.storage.list({ prefix: 'c:' });
    for (const rec of records.values()) {
      let data = '';
      for (let k = 0; k < rec.n; k++) data += chunks.get(cKey(rec.id, k)) || '';
      this.lines.push({ id: rec.id, data, participant: rec.participant, kind: rec.kind, n: rec.n });
      this.chars += data.length;
    }
  }

  async fetch(request) {
    await this.ready;
    const m = /^\/rooms\/([^/]+)\/events$/.exec(new URL(request.url).pathname);
    if (m) { try { this.name = decodeURIComponent(m[1]); } catch { /* the Worker has refused it already */ } }
    return request.method === 'GET' ? this.stream(request) : this.post(request);
  }

  stream(request) {
    const after = Number(request.headers.get('last-event-id') || 0);
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const client = { writer };
    const say = (s) => writer.write(enc.encode(s)).catch(() => this.drop(client));
    say(': hello\n\n');
    // A room that has outlived its buffer says so — a line with no `participant`
    // and no `id:`, as the Node relay sends it, so it never moves Last-Event-ID.
    const notice = truncationNotice({ name: this.name, lines: this.lines, dropped: this.dropped }, after);
    if (notice) say(`data: ${JSON.stringify(notice)}\n\n`);
    for (const l of replay({ lines: this.lines }, after)) say(`id: ${l.id}\ndata: ${l.data}\n\n`);
    this.clients.add(client);
    writer.closed.catch(() => this.drop(client));
    request.signal?.addEventListener('abort', () => this.drop(client));
    if (!this.beat) {
      this.beat = setInterval(() => { for (const c of this.clients) c.writer.write(enc.encode(': beat\n\n')).catch(() => this.drop(c)); }, BEAT_MS);
      this.beat.unref?.();
    }
    return new Response(readable, { status: 200, headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', 'x-accel-buffering': 'no' } });
  }

  drop(client) {
    if (!this.clients.delete(client)) return;
    client.writer.close().catch(() => undefined);
    if (!this.clients.size && this.beat) { clearInterval(this.beat); this.beat = null; }
  }

  async post(request) {
    if (Number(request.headers.get('content-length') || 0) > MAX_LINE_CHARS * 4) return text(413, 'a line is smaller than that');
    const body = await request.text();
    if (body.length > MAX_LINE_CHARS) return text(413, 'a line is smaller than that');
    let line;
    try { line = JSON.parse(body); } catch { return text(400, 'a line is JSON'); }
    const id = ++this.last;
    const participant = line && typeof line.participant === 'string' ? line.participant : '';
    const kind = kindOf(line);
    const n = Math.max(1, Math.ceil(body.length / CHUNK_CHARS));
    this.lines.push({ id, data: body, participant, kind, n });
    this.chars += body.length;
    // Past the cap — in lines or in characters, the newest always kept — the oldest go.
    const maxLines = maxLinesFrom(undefined, this.env);
    const maxChars = Number(this.env.MM_RELAY_MAX_BYTES) > 0 ? Number(this.env.MM_RELAY_MAX_BYTES) : DEFAULT_MAX_CHARS;
    const gone = [];
    while (this.lines.length > 1 && (this.lines.length > maxLines || this.chars > maxChars)) {
      const old = this.lines.shift();
      this.chars -= old.data.length;
      this.dropped++;
      gone.push(old);
    }
    // To every open stream at once and in order; the write below is awaited, so
    // the 204 means the line is kept.
    for (const c of this.clients) c.writer.write(enc.encode(`id: ${id}\ndata: ${body}\n\n`)).catch(() => this.drop(c));
    const put = { meta: { last: this.last, dropped: this.dropped }, [mKey(id)]: { id, participant, kind, n } };
    for (let k = 0; k < n; k++) put[cKey(id, k)] = body.slice(k * CHUNK_CHARS, (k + 1) * CHUNK_CHARS);
    await this.ctx.storage.put(put);
    const keys = gone.flatMap((l) => [mKey(l.id), ...Array.from({ length: l.n }, (_, k) => cKey(l.id, k))]);
    for (let i = 0; i < keys.length; i += 128) await this.ctx.storage.delete(keys.slice(i, i + 128));
    return new Response(null, { status: 204 });
  }
}

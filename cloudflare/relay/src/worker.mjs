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
// And the bytes of the pictures a room's hands put on the board (PLAN-IPAD-NOTES A1):
// `PUT|GET|HEAD /rooms/<room>/assets/<sha256>`, under the room's own key like its lines, the rules
// (verified hash, a picture and no more than 12 MB, a room's pictures capped) the protocol file's.
// They are kept in the Durable Object's own storage, in pieces under its value limit — not in R2,
// which would be a second product to enable (it asks for a payment method even on its free tier), a
// second binding, and a second place a room's data could outlive the room; a picture is a few
// hundred KB and a room's pictures are capped, so a room is a few dozen rows. (Storage limits and
// the rows a free plan may write a day are Cloudflare's to change — README.md says what to check.)
//
// (A Worker's entry module may export only handlers and classes — workerd refuses
// the module otherwise — so its limits are constants here, not exports.)
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
//   MM_RELAY_ASSET_BYTES  bytes of pictures a room keeps (default 64 MiB); past it a put is refused, never a picture dropped

import {
  kindOf, replay, truncationNotice, maxLinesFrom,
  MAX_ASSET_BYTES, assetRoomBytesFrom, assetPathOf, assetCheck, assetFull, assetSizeVerdict, assetHeaders, sniffImage, ASSET_WORDS,
} from '../../../Demos/relay-protocol.mjs';
import { secretsOf, keyOpens } from './auth.mjs';

/** The largest line a POST may carry, in characters (the Node relay's cap). */
const MAX_LINE_CHARS = 4e6;
/** What a room keeps in characters when nothing says otherwise. */
const DEFAULT_MAX_CHARS = 32e6;
/** A value in a Durable Object's storage may be held to 128 KiB: a line is kept in pieces under it, even of 3-byte characters. */
const CHUNK_CHARS = 40000;
/** A picture is kept in pieces of this many bytes, each well under the value limit. */
const ASSET_CHUNK = 96 * 1024;
/** A storage call takes at most this many keys. */
const BATCH = 128;
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
  'access-control-allow-methods': 'GET, HEAD, POST, PUT, OPTIONS',
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
    if (url.pathname === '/' && (request.method === 'GET' || request.method === 'HEAD')) return text(200, 'dyna.ink relay — rooms/<room>/events (GET is a stream, POST is a line), rooms/<room>/assets/<sha256> (a picture\'s bytes)\n');
    const m = /^\/rooms\/([^/]+)\/events$/.exec(url.pathname);
    const asset = m ? null : assetPathOf(url.pathname);
    if (!m && !asset) return text(404, 'rooms/<room>/events, rooms/<room>/assets/<sha256>');
    const origin = request.headers.get('origin');
    if (origin && !originAllowed(origin, env)) return text(403, 'this origin may not use this relay');
    const cors = origin ? corsHeaders(origin) : {};
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    let room;
    if (asset) room = asset.room;
    else { try { room = decodeURIComponent(m[1]); } catch { room = null; } }
    if (room === null) return text(400, 'a room name is text', cors);
    if (!room || room.length > MAX_ROOM_NAME) return text(400, 'a room name is 1–' + MAX_ROOM_NAME + ' characters', cors);
    const methods = asset ? ['GET', 'HEAD', 'PUT'] : ['GET', 'POST'];
    if (!methods.includes(request.method)) return text(405, '', cors);

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
// A picture: a small record under `a:<hash>` and its pieces under `ac:<hash>:<k>` (neither prefix is a line's).
const aKey = (hash) => 'a:' + hash;
const acKey = (hash, k) => 'ac:' + hash + ':' + pad(k, 4);

/**
 * A request's body, read up to a cap: `{ bytes }`, or `{ over: size }` when it is larger. What is over the cap is
 * counted and not kept — and drained, up to four times the cap, because a client still sending when the answer
 * comes can lose the answer (a 413 read back as nothing, seen in workerd): the sentence is worth the reading.
 */
async function bodyUpTo(request, cap) {
  const declared = Number(request.headers.get('content-length') || 0);
  if (!request.body) return declared > cap ? { over: declared } : { bytes: new Uint8Array(0) };
  const reader = request.body.getReader();
  const parts = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size <= cap) parts.push(value);
    else if (size > cap * 4) { await reader.cancel().catch(() => undefined); break; }
  }
  if (size > cap || declared > cap) return { over: Math.max(size, declared) };
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const p of parts) { bytes.set(p, at); at += p.length; }
  return { bytes };
}

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
    this.assets = new Map();    // hash -> { size, mime, n }: what this room holds of pictures
    this.assetBytes = 0;
    this.writing = new Map();   // hash -> the promise of its pieces being written
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
    for (const rec of (await this.ctx.storage.list({ prefix: 'a:' })).values()) { this.assets.set(rec.hash, rec); this.assetBytes += rec.size; }
  }

  async fetch(request) {
    await this.ready;
    const pathname = new URL(request.url).pathname;
    const asset = assetPathOf(pathname);
    if (asset) {
      if (asset.room) this.name = asset.room;
      if (!asset.hash) return text(400, ASSET_WORDS.hash);
      return request.method === 'PUT' ? this.putAsset(request, asset.hash) : this.getAsset(request, asset.hash);
    }
    const m = /^\/rooms\/([^/]+)\/events$/.exec(pathname);
    if (m) { try { this.name = decodeURIComponent(m[1]); } catch { /* the Worker has refused it already */ } }
    return request.method === 'GET' ? this.stream(request) : this.post(request);
  }

  /** A picture put: read up to the cap, judged by the protocol, kept in pieces — the record last, so a record always has its pieces. */
  async putAsset(request, hash) {
    const body = await bodyUpTo(request, MAX_ASSET_BYTES);
    if (body.over !== undefined) { const v = assetSizeVerdict(body.over); return text(v.status, v.words); }
    const cap = assetRoomBytesFrom(undefined, this.env);
    const no = await assetCheck(body.bytes, hash, { held: this.assetBytes, cap, have: this.assets.has(hash) });
    if (no) return text(no.status, no.words);
    if (this.assets.has(hash)) { await this.writing.get(hash); return new Response(null, { status: 204 }); }
    // Nothing awaited between this check and the claim: two puts at once cannot both fit.
    const full = assetFull(this.assetBytes, body.bytes.length, cap);
    if (full) return text(full.status, full.words);
    const { bytes } = body;
    const n = Math.max(1, Math.ceil(bytes.length / ASSET_CHUNK));
    const rec = { hash, size: bytes.length, mime: sniffImage(bytes).mime, n };
    this.assets.set(hash, rec);
    this.assetBytes += bytes.length;
    const write = (async () => {
      const keys = [];
      for (let k = 0; k < n; k++) keys.push([acKey(hash, k), bytes.slice(k * ASSET_CHUNK, (k + 1) * ASSET_CHUNK)]);
      for (let i = 0; i < keys.length; i += BATCH) await this.ctx.storage.put(Object.fromEntries(keys.slice(i, i + BATCH)));
      await this.ctx.storage.put(aKey(hash), rec);
    })();
    this.writing.set(hash, write);
    try { await write; } catch {
      this.assets.delete(hash);
      this.assetBytes -= bytes.length;
      return text(507, 'this room could not keep that picture — nothing was added');
    } finally { this.writing.delete(hash); }
    return new Response(null, { status: 204 });
  }

  /** A picture got (or asked after): its pieces put back together, with the headers of a thing that never changes. */
  async getAsset(request, hash) {
    const rec = this.assets.get(hash);
    if (!rec) return text(404, ASSET_WORDS.missing);
    await this.writing.get(hash);
    const headers = assetHeaders(rec.mime, rec.size, hash);
    if (request.method === 'HEAD') return new Response(null, { status: 200, headers });
    const bytes = new Uint8Array(rec.size);
    const names = Array.from({ length: rec.n }, (_, k) => acKey(hash, k));
    let at = 0;
    for (let i = 0; i < names.length; i += BATCH) {
      const got = await this.ctx.storage.get(names.slice(i, i + BATCH));
      for (const name of names.slice(i, i + BATCH)) { const piece = got.get(name); if (!piece) return text(404, ASSET_WORDS.missing); const view = piece instanceof ArrayBuffer ? new Uint8Array(piece) : piece; bytes.set(view, at); at += view.byteLength; }
    }
    return new Response(bytes, { status: 200, headers });
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

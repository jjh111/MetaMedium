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
//   MM_RELAY_MINT       "0": open no new rooms (POST /rooms answers 503); mint.mjs
//   MM_RELAY_MINT_PER_HOUR, MM_RELAY_MINT_PER_DAY   rooms one address may open an hour (10), the relay a day (500)
//   MM_RELAY_ROOM_IDLE_DAYS  how long a room the relay opened is kept after it was last used (default 30)
//   MM_RELAY_STORE_PER_DAY  characters and bytes one address may keep a day across every room (default 256 MiB); store.mjs
//   MM_RELAY_MINTED_HELD    bytes every room the relay opened may hold at once, in all (default 2 GiB); store.mjs
//
// Rooms anyone opens (mint.mjs, `POST /rooms`): their names are `r-` and 128 random bits, and such a room
// ages out — an alarm at its last use and MM_RELAY_ROOM_IDLE_DAYS empties its storage (lines, pictures,
// claims), its memory and its streams. A room named by hand never does. In every room, a name is claimed by
// the hand that writes under it first (`x-dyna-hand`, a secret of its sitting, kept as a hash), and a line
// under a name claimed by another hand is refused (409); a hand, an address or the room as a whole sending
// more than a room takes is told to wait (429), and so is an address claiming new names faster than a room
// takes them; a room keeps at most MAX_CLAIMS names, letting go first of names no line it holds was written
// under; before a room lets go of history to stay under its caps it lets go of the lines replay would never
// send (`compact`); and a line that only says its hand is here is passed on to the open streams and kept
// nowhere. The rules are relay-protocol.mjs's. What is kept is counted across rooms too (store.mjs): what one address
// keeps a day in every room — lines and pictures, a picture through the room's floodgates as a line goes — and what
// the rooms the relay opened hold at once, in all. A hand that reconnects past every id a room has (a room forgotten,
// its ids begun again) is told so (`forgottenNotice`) and sent the room from its beginning.

import {
  kindOf, setOf, replay, truncationNotice, forgottenNotice, maxLinesFrom, MAX_LINE_CHARS, compact, isMintedRoom, roomIdleDaysFrom, HAND_HEADER, handHashOf, claimCheck, writerOf,
  floodgate, FLOOD, FLOOD_ADDRESS, FLOOD_ROOM, NEW_HANDS, claimsToLetGo, CLAIMS_FULL, REPLAY_BEGINS, REPLAY_ENDS,
  MAX_ASSET_BYTES, assetRoomBytesFrom, assetPathOf, assetCheck, assetFull, assetSizeVerdict, assetHeaders, sniffImage, ASSET_WORDS,
} from '../../../Demos/relay-protocol.mjs';
import { secretsOf, keyOpens } from './auth.mjs';
import { originAllowed, corsHeaders, text, keyOf, callerOf } from './http.mjs';
import { mintRoute } from './mint.mjs';
import { aiRoute, AI_PATH } from './ai.mjs';
import { Limits } from './limits.mjs';
import { chargeStore, reserveMinted, releaseMinted, LINE_COST } from './store.mjs';

// The Durable Object classes this Worker binds (wrangler.toml): a room, and the limits the
// routes beside the rooms count against.
export { Limits };

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
const HOUR = 3600_000;
const DAY = 24 * HOUR;
/** A room's floodgate keeps a bucket per hand and per address; past this many it lets go of the ones full again. */
const FLOOD_HANDS = 256;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/' && (request.method === 'GET' || request.method === 'HEAD')) return text(200, 'dyna.ink relay — rooms/<room>/events (GET is a stream, POST is a line), rooms/<room>/assets/<sha256> (a picture\'s bytes)\n');
    // Beside the rooms, each in a module of its own: opening a room, and the models.
    if (url.pathname === '/rooms') return mintRoute(request, env);
    if (AI_PATH.test(url.pathname)) return aiRoute(request, env);
    const m = /^\/rooms\/([^/]+)\/events$/.exec(url.pathname);
    const asset = m ? null : assetPathOf(url.pathname);
    if (!m && !asset) return text(404, 'rooms/<room>/events, rooms/<room>/assets/<sha256>');
    const origin = request.headers.get('origin');
    // Refused with CORS headers of its own, so a page on that origin can read the status and say why (RELAY-1): it reveals nothing.
    if (origin && !originAllowed(origin, env)) return text(403, 'this origin may not use this relay', corsHeaders(origin));
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
// A name a hand claimed: `h:<name>` → the hash of its secret (relay-protocol.mjs, `claimCheck`). Never the secret.
const hKey = (name) => 'h:' + name;

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
    this.lost = 0;              // the newest line let go of for good (truncationNotice); a line compacted away is not lost
    this.claims = new Map();    // name -> the hash of the secret of the hand that claimed it
    this.floods = new Map();    // hand (its secret's hash, else its name) -> its bucket (relay-protocol.mjs, `floodgate`)
    this.addresses = new Map(); // address -> its bucket of lines, and its bucket of new names (`floodgate`)
    this.roomFlood = null;      // the room's own bucket, across every hand
    this.alarmAt = 0;           // when this room is forgotten, if it is one the relay opened (0: never set)
    this.grants = new Map();    // caller -> what this room drew of its day's allowance and has not used (store.mjs)
    this.reserved = 0;          // what a room the relay opened reserved of what all such rooms may hold (store.mjs)
    this.ready = ctx.blockConcurrencyWhile ? ctx.blockConcurrencyWhile(() => this.load()) : this.load();
  }

  async load() {
    const meta = (await this.ctx.storage.get('meta')) || {};
    this.last = Number(meta.last) || 0;
    this.dropped = Number(meta.dropped) || 0;
    for (const [k, hash] of await this.ctx.storage.list({ prefix: 'h:' })) this.claims.set(k.slice(2), hash);
    if (this.ctx.storage.getAlarm) this.alarmAt = Number(await this.ctx.storage.getAlarm()) || 0;
    this.reserved = Number(await this.ctx.storage.get('reserved')) || 0;
    const records = await this.ctx.storage.list({ prefix: 'm:' });
    const chunks = await this.ctx.storage.list({ prefix: 'c:' });
    for (const rec of records.values()) {
      let data = '';
      for (let k = 0; k < rec.n; k++) data += chunks.get(cKey(rec.id, k)) || '';
      this.lines.push({ id: rec.id, data, participant: rec.participant, kind: rec.kind, n: rec.n, ...(rec.set ? { set: rec.set } : {}), ...(rec.writer ? { writer: rec.writer } : {}) });
      this.chars += data.length;
    }
    for (const rec of (await this.ctx.storage.list({ prefix: 'a:' })).values()) { this.assets.set(rec.hash, rec); this.assetBytes += rec.size; }
    // A room kept before compaction says nothing of what it lost: the line before the first held is it, as it always was.
    this.lost = Number.isFinite(meta.lost) ? meta.lost : this.dropped && this.lines.length ? this.lines[0].id - 1 : 0;
  }

  /**
   * A room the relay opened is forgotten once nobody has used it for MM_RELAY_ROOM_IDLE_DAYS: each use — a line,
   * a stream opened, a picture — moves its alarm to that long from now (to within the hour, or a tenth of the idle
   * time if that is shorter, so a busy room does not write its alarm on every line). A room named by hand sets none.
   */
  async touch() {
    if (!isMintedRoom(this.name) || !this.ctx.storage.setAlarm) return;
    const idle = roomIdleDaysFrom(undefined, this.env) * DAY;
    const due = Date.now() + idle;
    if (this.alarmAt && this.alarmAt >= due - Math.min(HOUR, idle / 10)) return;
    this.alarmAt = due;
    await this.ctx.storage.setAlarm(due);
  }

  /**
   * The room's time is up (`touch`): everything it kept — its lines, its pictures, the names claimed in it — is
   * deleted, its memory let go of, and every open stream closed. Only a room the relay opened sets an alarm.
   */
  async alarm() {
    await this.ready;
    // What it reserved of what every room the relay opened may hold goes back first: if that cannot be done, the
    // alarm throws and is tried again, with the room as it was.
    await releaseMinted(this.env, this.reserved);
    for (const c of [...this.clients]) this.drop(c);
    await this.ctx.storage.deleteAll();
    this.lines = [];
    this.dropped = 0;
    this.last = 0;
    this.lost = 0;
    this.chars = 0;
    this.assets = new Map();
    this.assetBytes = 0;
    this.claims = new Map();
    this.floods = new Map();
    this.addresses = new Map();
    this.roomFlood = null;
    this.alarmAt = 0;
    this.grants = new Map();
    this.reserved = 0;
  }

  async fetch(request) {
    await this.ready;
    const pathname = new URL(request.url).pathname;
    const asset = assetPathOf(pathname);
    if (asset) {
      if (asset.room) this.name = asset.room;
      if (!asset.hash) return text(400, ASSET_WORDS.hash);
      if (request.method === 'PUT') await this.touch();
      return request.method === 'PUT' ? this.putAsset(request, asset.hash) : this.getAsset(request, asset.hash);
    }
    const m = /^\/rooms\/([^/]+)\/events$/.exec(pathname);
    if (m) { try { this.name = decodeURIComponent(m[1]); } catch { /* the Worker has refused it already */ } }
    await this.touch();
    return request.method === 'GET' ? this.stream(request) : this.post(request);
  }

  /**
   * A picture's bytes through the room's floodgates — its address's and the room's — then the counts of what is kept
   * (`keep`): null when it may be kept, else the refusal as a response.
   */
  async admit(request, bytes, after) {
    const caller = callerOf(request);
    const now = Date.now();
    const at = this.addresses.get(caller) || {};
    const gate = floodgate([{ kind: 'address', bucket: at.lines, limits: FLOOD_ADDRESS }, { kind: 'room', bucket: this.roomFlood, limits: FLOOD_ROOM }], now, bytes);
    if (gate.refused) return text(429, gate.refused.words, { 'retry-after': String(gate.refused.retryAfter) });
    this.addresses.set(caller, { ...at, lines: gate.buckets[0] });
    this.roomFlood = gate.buckets[1];
    return this.keep(caller, bytes, after);
  }

  /**
   * What is about to be kept, counted: `cost` against what `caller` may keep today in every room, and — in a room the
   * relay opened — `after`, what the room will hold, against what all such rooms may hold (store.mjs). Null when it
   * may be kept, else the refusal as a response.
   */
  async keep(caller, cost, after) {
    const no = (await chargeStore(this.env, this.grants, caller, cost)) || (isMintedRoom(this.name) ? await reserveMinted(this.env, this, after) : null);
    if (!no) return null;
    return text(no.status, no.words, no.retryAfter ? { 'retry-after': String(no.retryAfter) } : {});
  }

  /** A picture put: read up to the cap, judged by the protocol, kept in pieces — the record last, so a record always has its pieces. */
  async putAsset(request, hash) {
    const body = await bodyUpTo(request, MAX_ASSET_BYTES);
    if (body.over !== undefined) { const v = assetSizeVerdict(body.over); return text(v.status, v.words); }
    const cap = assetRoomBytesFrom(undefined, this.env);
    const no = await assetCheck(body.bytes, hash, { held: this.assetBytes, cap, have: this.assets.has(hash) });
    if (no) return text(no.status, no.words);
    if (this.assets.has(hash)) { await this.writing.get(hash); return new Response(null, { status: 204 }); }
    // A picture goes through the room's floodgates as a line does — its address's and the room's, by its bytes — and
    // counts against what its caller may keep a day in every room (store.mjs), and, in a room the relay opened, against
    // what all such rooms may hold at once.
    const refused = await this.admit(request, body.bytes.length, this.chars + this.assetBytes + body.bytes.length);
    if (refused) return refused;
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
    const asked = Number(request.headers.get('last-event-id') || 0);
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const client = { writer };
    const say = (s) => writer.write(enc.encode(s)).catch(() => this.drop(client));
    say(': hello\n\n');
    // A hand that read further than this room now goes read a room since forgotten (its idle days, `alarm`) whose ids
    // began again at 1: it is told so and sent the room from its beginning, and its store sends its log again whole.
    const forgotten = forgottenNotice({ name: this.name, last: this.last }, asked);
    if (forgotten) say(`data: ${JSON.stringify(forgotten)}\n\n`);
    const after = forgotten ? 0 : asked;
    // A room that has outlived its buffer says so — a line with no `participant`
    // and no `id:`, as the Node relay sends it, so it never moves Last-Event-ID.
    const notice = truncationNotice({ name: this.name, lines: this.lines, dropped: this.dropped, lost: this.lost }, after);
    if (notice) say(`data: ${JSON.stringify(notice)}\n\n`);
    // The replay, between the relay's two words for it: nobody is here by a line written before this stream opened.
    say(`data: ${REPLAY_BEGINS}\n\n`);
    for (const l of replay({ lines: this.lines }, after)) say(`id: ${l.id}\ndata: ${l.data}\n\n`);
    say(`data: ${REPLAY_ENDS}\n\n`);
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
    // Whose name the line is written under, by the secret its hand sent (relay-protocol.mjs): a name claimed by
    // another hand is refused, so nobody can write in another's name — a whole log in it would replace theirs.
    const hash = await handHashOf(request.headers.get(HAND_HEADER) || '');
    let verdict = claimCheck(this.claims, line, hash);
    if (!verdict.ok) return text(verdict.status, verdict.words);
    const kind = kindOf(line);
    // A hand, an address or the room as a whole that sends more than a room takes is told to wait, rather than push
    // the room's history out — the hand's secret is its own to choose, so a hand that takes a new one on every line
    // is still its address, and still the room. A line that claims a new name counts against its address's names too.
    const now = Date.now();
    const who = hash || 'name:' + writerOf(line);
    const caller = callerOf(request);
    const at = this.addresses.get(caller) || {};
    const gates = [
      { kind: 'hand', bucket: this.floods.get(who), limits: FLOOD },
      { kind: 'address', bucket: at.lines, limits: FLOOD_ADDRESS },
      { kind: 'room', bucket: this.roomFlood, limits: FLOOD_ROOM },
    ];
    if (verdict.claim) gates.push({ kind: 'claim', bucket: at.claims, limits: NEW_HANDS });
    const gate = floodgate(gates, now, body.length);
    if (gate.refused) return text(429, gate.refused.words, { 'retry-after': String(gate.refused.retryAfter) });
    this.floods.set(who, gate.buckets[0]);
    this.addresses.set(caller, verdict.claim ? { lines: gate.buckets[1], claims: gate.buckets[3] } : { ...at, lines: gate.buckets[1] });
    this.roomFlood = gate.buckets[2];
    if (this.floods.size > FLOOD_HANDS) for (const [k, b] of this.floods) if (now - b.at > 60_000) this.floods.delete(k);
    if (this.addresses.size > FLOOD_HANDS) for (const [k, b] of this.addresses) if (now - b.lines.at > 600_000) this.addresses.delete(k);
    const maxLines = maxLinesFrom(undefined, this.env);
    const maxChars = Number(this.env.MM_RELAY_MAX_BYTES) > 0 ? Number(this.env.MM_RELAY_MAX_BYTES) : DEFAULT_MAX_CHARS;
    if (kind !== 'here') {
      // A line that will be kept counts against what its caller may keep today in every room, and, in a room the relay
      // opened, against what all such rooms hold (store.mjs) — a beat is kept nowhere and costs nothing.
      const no = await this.keep(caller, body.length + LINE_COST, Math.min(this.chars + body.length, maxChars) + this.assetBytes);
      if (no) return no;
      // Another line may have claimed this name while the counts were asked: asked again, and nothing awaited from here to the claim.
      verdict = claimCheck(this.claims, line, hash);
      if (!verdict.ok) return text(verdict.status, verdict.words);
    }
    // A room keeps so many names: past it, the names no line it holds was written under are let go of first.
    let letGo = [];
    if (verdict.claim) {
      const cap = claimsToLetGo(this.claims, this.lines);
      if (!cap.fits) return text(CLAIMS_FULL.status, CLAIMS_FULL.words, { 'retry-after': String(CLAIMS_FULL.retryAfter) });
      letGo = cap.letGo;
      for (const name of letGo) this.claims.delete(name);
    }
    // Nothing awaited between the check and the claim: two first lines at once cannot both claim a name.
    if (verdict.claim) this.claims.set(verdict.claim, hash);
    // A line that only says its hand is here is passed on to the streams open now and kept nowhere: a room's
    // history is its marks, not its beats, and beats kept would push the marks out of it.
    if (kind === 'here') {
      for (const c of this.clients) c.writer.write(enc.encode(`data: ${body}\n\n`)).catch(() => this.drop(c));
      if (verdict.claim) await this.ctx.storage.put(hKey(verdict.claim), hash);
      await this.forget(letGo.map(hKey));
      return new Response(null, { status: 204 });
    }
    const id = ++this.last;
    const participant = line && typeof line.participant === 'string' ? line.participant : '';
    const n = Math.max(1, Math.ceil(body.length / CHUNK_CHARS));
    const set = setOf(line);
    const writer = writerOf(line);
    const rec = { id, participant, kind, n, ...(set ? { set } : {}), ...(writer && writer !== participant ? { writer } : {}) };
    this.lines.push({ ...rec, data: body });
    this.chars += body.length;
    // Past the cap — in lines or in characters, the newest always kept — what replay would never send goes
    // first (`compact`: a hand's own whole logs that a newer one stands after), then the oldest.
    const gone = [];
    if (this.lines.length > maxLines || this.chars > maxChars) {
      const kept = compact(this.lines);
      if (kept.length < this.lines.length) {
        const stays = new Set(kept.map((l) => l.id));
        for (const l of this.lines) if (!stays.has(l.id)) { gone.push(l); this.chars -= l.data.length; }
        this.lines = kept;
      }
    }
    while (this.lines.length > 1 && (this.lines.length > maxLines || this.chars > maxChars)) {
      const old = this.lines.shift();
      this.chars -= old.data.length;
      this.dropped++;
      this.lost = old.id;
      gone.push(old);
    }
    // To every open stream at once and in order; the write below is awaited, so
    // the 204 means the line is kept.
    for (const c of this.clients) c.writer.write(enc.encode(`id: ${id}\ndata: ${body}\n\n`)).catch(() => this.drop(c));
    const put = { meta: { last: this.last, dropped: this.dropped, lost: this.lost }, [mKey(id)]: rec };
    for (let k = 0; k < n; k++) put[cKey(id, k)] = body.slice(k * CHUNK_CHARS, (k + 1) * CHUNK_CHARS);
    if (verdict.claim) put[hKey(verdict.claim)] = hash;
    await this.ctx.storage.put(put);
    await this.forget(gone.flatMap((l) => [mKey(l.id), ...Array.from({ length: l.n }, (_, k) => cKey(l.id, k))]).concat(letGo.map(hKey)));
    return new Response(null, { status: 204 });
  }

  /** Delete keys from storage, as many calls as it takes: a storage call takes at most BATCH keys. */
  async forget(keys) {
    for (let i = 0; i < keys.length; i += BATCH) await this.ctx.storage.delete(keys.slice(i, i + BATCH));
  }
}

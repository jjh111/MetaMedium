// A relay for live rooms: forwards lines between hands on different machines.
//
//   node Demos/relay.mjs            # listens on :8020
//   PORT=9000 node Demos/relay.mjs
//   MM_RELAY_MAX_LINES=200 node Demos/relay.mjs   # each room remembers 200 lines
//
// Then open session-engine.html?live=<room>&relay=http://<host>:8020 on each
// machine. No dependencies, no truth of its own: a room is the lines its
// hands sent, kept in memory so a late hand can replay them (Last-Event-ID) —
// brought up to the present, never through a past state (see `replay`) — and
// forgotten when the process ends. A room that outlives its buffer says so. Each hand's log lives in that hand's
// browser; the relay only carries. Nothing is authenticated — run it on a
// network you trust, or put it behind something that is.
//
// `startRelay(port, { maxLines, assetRoomBytes, assetDir })` is the same server for a process that hosts
// one — the MCP hand (Demos/mcp.mjs) starts a relay when none answers.
//
// A room also keeps the bytes of the pictures its hands put on the board (PLAN-IPAD-NOTES A1): a log
// line names a picture by the SHA-256 of its bytes and carries none, so `PUT /rooms/<room>/assets/<sha256>`
// keeps them — hash verified, a picture and no more than 12 MB, a room's pictures capped (`assetRoomBytes`,
// MM_RELAY_ASSET_BYTES) — and `GET`/`HEAD` the same address give them back for good. In memory, or as
// files under `assetDir` (MM_RELAY_ASSET_DIR) that a restarted relay finds again. The rules are
// `relay-protocol.mjs`'s, shared with the Worker.
//
// It also opens rooms (`POST /rooms`): a name of `r-` and 128 random bits, `{ room, key: null, idleDays: null }` —
// this relay keeps no keys, and a room lasts as long as the process — so a page on this machine and the gate
// share rooms the way they would on the relay on the internet. And a hand's name is claimed by the hand that
// first writes under it with a secret of its sitting (`x-dyna-hand`): a line under a name another hand claimed is
// refused (409), so nobody writes in another's name. The rules are `relay-protocol.mjs`'s, shared with the Worker.
// A line that only says its hand is here (a beat) is passed on to the streams open now and kept nowhere, and a
// stream's replay is said to begin and end, so nobody is taken to be here by a line written before it opened.
//
// How much a room remembers is settable: `maxLines`, else the environment's
// MM_RELAY_MAX_LINES, else 5000 lines per room. Past it the lines replay would never send go first (`compact`), then the oldest lines go,
// and a hand that connects after is told the room is older than the relay
// remembers — every hand's store says so (store/live.ts, `truncation`), and
// the hands still in the room answer its hello: each with its own log, and
// one of them with a copy of any log whose writer has gone (V1-PLAN R4d).

import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import {
  DEFAULT_MAX_LINES, MAX_LINE_CHARS, kindOf, setOf, writerOf, replay, truncationNotice, maxLinesFrom as maxLinesOf, compact, mintRoomName, HAND_HEADER, handHashOf, claimCheck,
  claimsToLetGo, CLAIMS_FULL, REPLAY_BEGINS, REPLAY_ENDS,
  MAX_ASSET_BYTES, assetRoomBytesFrom, assetPathOf, assetCheck, assetSizeVerdict, assetHeaders, sniffImage, ASSET_WORDS,
} from './relay-protocol.mjs';
import { DECIDE_WORDS } from './decide-protocol.mjs';

// The protocol — what a room keeps, what a client is sent, what it is owed — is
// `relay-protocol.mjs`, shared with the Worker (cloudflare/relay).
export { DEFAULT_MAX_LINES, kindOf, replay, truncationNotice };

/** The cap a relay runs with: the option, else MM_RELAY_MAX_LINES, else the default. */
export const maxLinesFrom = (option, env = process.env) => maxLinesOf(option, env);

const cors = (res) => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type, last-event-id, authorization, ' + HAND_HEADER);
  res.setHeader('access-control-allow-methods', 'GET, HEAD, POST, PUT, OPTIONS');
  res.setHeader('access-control-expose-headers', 'retry-after');
};
const plain = (res, status, words) => { res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' }); res.end(words); };

/**
 * The pictures a relay keeps (PLAN-IPAD-NOTES A1): per room, by the SHA-256 of the bytes. In memory, or — with
 * `dir` — as files under it (`<dir>/<room>/<hash>`), which a restarted relay finds again. A room's total is
 * counted either way, so its cap holds. Verdicts are the protocol's (`assetCheck`); this only keeps and finds.
 */
function assetStore(dir) {
  const rooms = new Map(); // room -> { held: Map<hash, { size, bytes?: Buffer }>, bytes }
  const folder = (room) => path.join(dir, encodeURIComponent(room));
  const of = (room) => {
    let r = rooms.get(room);
    if (r) return r;
    r = { held: new Map(), bytes: 0 };
    rooms.set(room, r);
    if (dir && existsSync(folder(room))) {
      for (const name of readdirSync(folder(room))) {
        if (!/^[0-9a-f]{64}$/.test(name)) continue;
        const size = statSync(path.join(folder(room), name)).size;
        r.held.set(name, { size });
        r.bytes += size;
      }
    }
    return r;
  };
  return {
    bytesIn: (room) => of(room).bytes,
    has: (room, hash) => of(room).held.has(hash),
    get(room, hash) {
      const e = of(room).held.get(hash);
      if (!e) return null;
      const bytes = e.bytes || readFileSync(path.join(folder(room), hash));
      return { bytes, mime: (sniffImage(bytes) || {}).mime || 'application/octet-stream' };
    },
    put(room, hash, bytes) {
      const r = of(room);
      if (r.held.has(hash)) return;
      if (dir) { mkdirSync(folder(room), { recursive: true }); writeFileSync(path.join(folder(room), hash), bytes); r.held.set(hash, { size: bytes.length }); }
      else r.held.set(hash, { size: bytes.length, bytes });
      r.bytes += bytes.length;
    },
  };
}

/**
 * The relay as a server: resolves once it listens, rejects when the port is
 * taken. `maxLines` is how many lines each room keeps (see `maxLinesFrom`).
 */
export function startRelay(port = Number(process.env.PORT || 8020), opts = {}) {
  const maxLines = maxLinesFrom(opts.maxLines);
  const assetCap = assetRoomBytesFrom(opts.assetRoomBytes, process.env);
  const assets = assetStore(opts.assetDir || process.env.MM_RELAY_ASSET_DIR || '');
  const rooms = new Map(); // room -> { name, lines: [{ id, data, participant, kind }], clients: Set<res>, dropped, lost, last, claims }
  const roomOf = (name) => rooms.get(name) || rooms.set(name, { name, lines: [], clients: new Set(), dropped: 0, lost: 0, last: 0, claims: new Map() }).get(name);
  /** A picture: put (verified), got, or asked after. Never a line, never the room's stream. */
  const asset = (req, res, a) => {
    if (a.room === null || !a.room || a.room.length > 128) { plain(res, 400, ASSET_WORDS.room); return; }
    if (req.method === 'GET' || req.method === 'HEAD') {
      if (!a.hash) { plain(res, 400, ASSET_WORDS.hash); return; }
      const got = assets.get(a.room, a.hash);
      if (!got) { plain(res, 404, ASSET_WORDS.missing); return; }
      res.writeHead(200, assetHeaders(got.mime, got.bytes.length, a.hash));
      res.end(req.method === 'HEAD' ? undefined : got.bytes);
      return;
    }
    if (req.method !== 'PUT') { res.writeHead(405); res.end(); return; }
    // The body is counted as it comes and not kept past the cap — what is over it is drained, then refused in words.
    const chunks = [];
    let size = 0;
    req.on('data', (c) => { size += c.length; if (size <= MAX_ASSET_BYTES) chunks.push(c); else if (size > 4 * MAX_ASSET_BYTES) req.destroy(); });
    req.on('end', async () => {
      if (!a.hash) { plain(res, 400, ASSET_WORDS.hash); return; }
      const big = assetSizeVerdict(size);
      if (big) { plain(res, big.status, big.words); return; }
      const bytes = Buffer.concat(chunks);
      const have = assets.has(a.room, a.hash);
      const no = await assetCheck(bytes, a.hash, { held: assets.bytesIn(a.room), cap: assetCap, have });
      if (no) { plain(res, no.status, no.words); return; }
      assets.put(a.room, a.hash, bytes);
      res.writeHead(204); res.end();
    });
  };
  const server = createServer((req, res) => {
    cors(res);
    const url = new URL(req.url, 'http://x');
    const m = /^\/rooms\/([^/]+)\/events$/.exec(url.pathname);
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    // The model routes are the Worker's (cloudflare/relay/src/ai.mjs, Workers AI by binding): this relay asks no model, and says so.
    if (url.pathname === '/decide' || url.pathname === '/extract') { res.writeHead(501, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify({ ok: false, error: DECIDE_WORDS.noModel })); return; }
    const a = assetPathOf(url.pathname);
    if (a) { asset(req, res, a); return; }
    // A room opened for whoever asks: this relay keeps no keys and forgets a room when it stops.
    if (url.pathname === '/rooms') {
      if (req.method === 'GET') { res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify({ idleDays: null, opens: true })); return; }
      if (req.method !== 'POST') { plain(res, 405, 'a room is opened with POST /rooms'); return; }
      res.writeHead(201, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ room: mintRoomName(), key: null, idleDays: null }));
      return;
    }
    if (!m) { res.writeHead(404); res.end('rooms/<room>/events, rooms/<room>/assets/<sha256>'); return; }
    const room = roomOf(decodeURIComponent(m[1]));
    if (req.method === 'GET') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
      res.write(': hello\n\n');
      const after = Number(req.headers['last-event-id'] || 0);
      // A room that has outlived its buffer says so, rather than handing a
      // client a beginning-less history and calling it complete. Carried as a
      // line with no `participant`, so every client that only knows about
      // lines ignores it; the surface reads it and puts it in the status bar.
      // No `id:`, so it does not move the client's Last-Event-ID.
      const notice = truncationNotice(room, after);
      if (notice) res.write(`data: ${JSON.stringify(notice)}\n\n`);
      // The replay, between the relay's two words for it: nobody is here by a line written before this stream opened.
      res.write(`data: ${REPLAY_BEGINS}\n\n`);
      for (const l of replay(room, after)) res.write(`id: ${l.id}\ndata: ${l.data}\n\n`);
      res.write(`data: ${REPLAY_ENDS}\n\n`);
      room.clients.add(res);
      const beat = setInterval(() => res.write(': beat\n\n'), 25000);
      req.on('close', () => { clearInterval(beat); room.clients.delete(res); });
      return;
    }
    if (req.method === 'POST') {
      // Read up to the cap; past it the rest is counted and let go of, then refused in words (413) — a hand
      // told so lets that line go, where a cut connection reads as no answer and is tried again for ever.
      let body = '';
      let size = 0;
      req.setEncoding('utf8');
      req.on('data', (c) => { size += c.length; if (size <= MAX_LINE_CHARS) body += c; else if (size > 4 * MAX_LINE_CHARS) req.destroy(); });
      req.on('end', async () => {
        if (size > MAX_LINE_CHARS) { plain(res, 413, 'a line is smaller than that'); return; }
        let line;
        try { line = JSON.parse(body); } catch { res.writeHead(400); res.end('a line is JSON'); return; }
        // Whose name the line is written under (relay-protocol.mjs): a name another hand claimed is refused.
        const hash = await handHashOf(req.headers[HAND_HEADER] || '');
        const verdict = claimCheck(room.claims, line, hash);
        if (!verdict.ok) { plain(res, verdict.status, verdict.words); return; }
        if (verdict.claim) {
          // A room keeps so many names: past it, the names no line it holds was written under are let go of first.
          const cap = claimsToLetGo(room.claims, room.lines);
          for (const n of cap.letGo) room.claims.delete(n);
          if (!cap.fits) { res.setHeader('retry-after', String(CLAIMS_FULL.retryAfter)); plain(res, CLAIMS_FULL.status, CLAIMS_FULL.words); return; }
          room.claims.set(verdict.claim, hash);
        }
        const kind = kindOf(line);
        // A line that only says its hand is here is passed on to the streams open now, and kept nowhere: a room's
        // history is its marks, not its beats, and beats kept would push the marks out of it.
        if (kind === 'here') {
          for (const c of room.clients) c.write(`data: ${body}\n\n`);
          res.writeHead(204); res.end();
          return;
        }
        const id = ++room.last;
        const participant = line && typeof line.participant === 'string' ? line.participant : '';
        const rec = { id, data: body, participant, kind };
        const set = setOf(line);
        if (set) rec.set = set;
        const writer = writerOf(line);
        if (writer && writer !== participant) rec.writer = writer;
        room.lines.push(rec);
        if (room.lines.length > maxLines) room.lines = compact(room.lines);
        if (room.lines.length > maxLines) {
          const n = room.lines.length - maxLines;
          room.lost = room.lines[n - 1].id;
          room.lines.splice(0, n);
          room.dropped += n;
        }
        for (const c of room.clients) c.write(`id: ${id}\ndata: ${body}\n\n`);
        res.writeHead(204); res.end();
      });
      return;
    }
    res.writeHead(405); res.end();
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, () => resolve(server));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 8020);
  startRelay(port)
    .then(() => console.log(`relay on :${port} — rooms/<room>/events (GET is a stream, POST is a line) · ${maxLinesFrom()} lines per room`))
    .catch((err) => { console.error(`relay: could not listen on :${port} — ${err.message}`); process.exit(1); });
}

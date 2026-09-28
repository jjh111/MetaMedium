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
// `startRelay(port, { maxLines })` is the same server for a process that hosts
// one — the MCP hand (Demos/mcp.mjs) starts a relay when none answers.
//
// How much a room remembers is settable: `maxLines`, else the environment's
// MM_RELAY_MAX_LINES, else 5000 lines per room. Past it the oldest lines go,
// and a hand that connects after is told the room is older than the relay
// remembers — every hand's store says so (store/live.ts, `truncation`), and
// the hands still in the room answer its hello: each with its own log, and
// one of them with a copy of any log whose writer has gone (V1-PLAN R4d).

import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

/** How many lines a room keeps when nothing says otherwise. */
export const DEFAULT_MAX_LINES = 5000;

/** The cap a relay runs with: the option, else MM_RELAY_MAX_LINES, else the default. */
export function maxLinesFrom(option, env = process.env) {
  for (const v of [option, env.MM_RELAY_MAX_LINES]) {
    const n = Number(v);
    if (v !== undefined && v !== '' && Number.isSafeInteger(n) && n > 0) return n;
  }
  return DEFAULT_MAX_LINES;
}

/**
 * What kind of line this is, for the replay: a hello, a writer's own whole
 * log, a whole log handed on by another hand (`via`) in answer to a hello, or
 * an append.
 */
export function kindOf(line) {
  if (line && line.hello) return 'hello';
  if (line && line.full) return line.via ? 'relayed' : 'full';
  return 'append';
}

/**
 * What a connecting client is sent: the room brought up to the PRESENT, never
 * a history that installs a past state along the way.
 *
 * A `full` replaces what the client holds, so replaying an old one hands a
 * fresh tab a snapshot out of its moment — which is how a tab came up holding
 * part of the room (NOTES-DRAWING-WITH-THE-HAND §C). Only a hand's LAST `full`
 * in the replayed stretch is still true; the appends around it are kept in
 * order, so the result is that hand's log as it stands now.
 *
 * A `hello` IS replayed, and deliberately: a hand that said hello into an
 * empty room got no answer, and the replay is how the next hand to arrive
 * hears the question and answers it with its own log. Dropping them as noise
 * left the shard's MCP seat never hearing the brief that was parked for it.
 *
 * Nothing about the protocol changes: the same lines, minus the ones that were
 * only ever true in their own moment.
 */
export function replay(room, after = 0) {
  const pending = room.lines.filter((l) => l.id > after);
  const newest = new Map();
  for (const l of pending) if (l.kind === 'full') newest.set(l.participant, l.id);
  return pending.filter((l) => l.kind !== 'full' || newest.get(l.participant) === l.id);
}
// A log handed on by another hand (`relayed`) is replayed as it came and
// never supersedes the writer's own: it is a copy that may lag the log, and
// the store that receives it judges it by the writer's clock, dropping a copy
// older than what already landed. It stays in the replay because it may be
// the only whole copy left of a hand that has gone, once the relay has
// forgotten that hand's own early lines.

/**
 * What a client is owed when the room has outlived its buffer: a line saying
 * so, rather than a beginning-less history handed over as complete. Null when
 * nothing was lost, or when everything this client missed is still held.
 */
export function truncationNotice(room, after = 0) {
  if (!room.dropped) return null;
  if (after && room.lines.length && after >= room.lines[0].id - 1) return null;
  return { relay: 'truncated', room: room.name, dropped: room.dropped, kept: room.lines.length };
}

const cors = (res) => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type, last-event-id');
  res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
};

/**
 * The relay as a server: resolves once it listens, rejects when the port is
 * taken. `maxLines` is how many lines each room keeps (see `maxLinesFrom`).
 */
export function startRelay(port = Number(process.env.PORT || 8020), opts = {}) {
  const maxLines = maxLinesFrom(opts.maxLines);
  const rooms = new Map(); // room -> { name, lines: [{ id, data, participant, kind }], clients: Set<res>, dropped }
  const roomOf = (name) => rooms.get(name) || rooms.set(name, { name, lines: [], clients: new Set(), dropped: 0 }).get(name);
  const server = createServer((req, res) => {
    cors(res);
    const url = new URL(req.url, 'http://x');
    const m = /^\/rooms\/([^/]+)\/events$/.exec(url.pathname);
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    if (!m) { res.writeHead(404); res.end('rooms/<room>/events'); return; }
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
      for (const l of replay(room, after)) res.write(`id: ${l.id}\ndata: ${l.data}\n\n`);
      room.clients.add(res);
      const beat = setInterval(() => res.write(': beat\n\n'), 25000);
      req.on('close', () => { clearInterval(beat); room.clients.delete(res); });
      return;
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (c) => { body += c; if (body.length > 4e6) req.destroy(); });
      req.on('end', () => {
        let line;
        try { line = JSON.parse(body); } catch { res.writeHead(400); res.end('a line is JSON'); return; }
        const id = (room.lines.length ? room.lines[room.lines.length - 1].id : 0) + 1;
        const participant = line && typeof line.participant === 'string' ? line.participant : '';
        room.lines.push({ id, data: body, participant, kind: kindOf(line) });
        if (room.lines.length > maxLines) {
          const n = room.lines.length - maxLines;
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

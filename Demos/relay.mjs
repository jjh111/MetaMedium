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

import { DEFAULT_MAX_LINES, kindOf, replay, truncationNotice, maxLinesFrom as maxLinesOf } from './relay-protocol.mjs';

// The protocol — what a room keeps, what a client is sent, what it is owed — is
// `relay-protocol.mjs`, shared with the Worker (cloudflare/relay).
export { DEFAULT_MAX_LINES, kindOf, replay, truncationNotice };

/** The cap a relay runs with: the option, else MM_RELAY_MAX_LINES, else the default. */
export const maxLinesFrom = (option, env = process.env) => maxLinesOf(option, env);

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

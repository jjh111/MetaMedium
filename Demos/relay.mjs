// A relay for live rooms: forwards lines between hands on different machines.
//
//   node Demos/relay.mjs            # listens on :8020
//   PORT=9000 node Demos/relay.mjs
//
// Then open session-engine.html?live=<room>&relay=http://<host>:8020 on each
// machine. No dependencies, no truth of its own: a room is the lines its
// hands sent, kept in memory so a late hand can replay them (Last-Event-ID),
// and forgotten when the process ends. Each hand's log lives in that hand's
// browser; the relay only carries. Nothing is authenticated — run it on a
// network you trust, or put it behind something that is.

import { createServer } from 'node:http';

const PORT = Number(process.env.PORT || 8020);
const rooms = new Map(); // room -> { lines: [{ id, data }], clients: Set<res> }
const roomOf = (name) => rooms.get(name) || rooms.set(name, { lines: [], clients: new Set() }).get(name);
const MAX_LINES = 5000;

const cors = (res) => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type, last-event-id');
  res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
};

createServer((req, res) => {
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
    for (const l of room.lines) if (l.id > after) res.write(`id: ${l.id}\ndata: ${l.data}\n\n`);
    room.clients.add(res);
    const beat = setInterval(() => res.write(': beat\n\n'), 25000);
    req.on('close', () => { clearInterval(beat); room.clients.delete(res); });
    return;
  }
  if (req.method === 'POST') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 4e6) req.destroy(); });
    req.on('end', () => {
      try { JSON.parse(body); } catch { res.writeHead(400); res.end('a line is JSON'); return; }
      const id = (room.lines.length ? room.lines[room.lines.length - 1].id : 0) + 1;
      room.lines.push({ id, data: body });
      if (room.lines.length > MAX_LINES) room.lines.splice(0, room.lines.length - MAX_LINES);
      for (const c of room.clients) c.write(`id: ${id}\ndata: ${body}\n\n`);
      res.writeHead(204); res.end();
    });
    return;
  }
  res.writeHead(405); res.end();
}).listen(PORT, () => console.log(`relay on :${PORT} — rooms/<room>/events (GET is a stream, POST is a line)`));

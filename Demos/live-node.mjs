// A live room's transport, in Node: the relay's stream in, POST out — the
// same lines a tab sends over `relayTransport` in Demos/surface/17-folder.js,
// so a process can be a hand in a room. Reconnects and replays from the last
// id it saw, the way a browser's EventSource does.

import http from 'node:http';
import https from 'node:https';
import { startRelay } from './relay.mjs';

export function relayTransport(url, room) {
  const base = url.replace(/\/+$/, '') + '/rooms/' + encodeURIComponent(room) + '/events';
  const mod = base.startsWith('https:') ? https : http;
  let cbs = [];
  let lastId = 0;
  let closed = false;
  let req = null;
  let retry = null;
  const handle = (block) => {
    let id = null, data = '';
    for (const line of block.split('\n')) {
      if (line.startsWith('id:')) id = Number(line.slice(3).trim());
      else if (line.startsWith('data:')) data += line.slice(5).trim();
    }
    if (id) lastId = id;
    if (!data) return;
    let parsed = null;
    try { parsed = JSON.parse(data); } catch { return; }
    for (const cb of cbs) cb(parsed);
  };
  const connect = () => {
    if (closed) return;
    req = mod.get(base, { headers: lastId ? { 'last-event-id': String(lastId) } : {} }, (res) => {
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', (c) => {
        buf += c;
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) { handle(buf.slice(0, i)); buf = buf.slice(i + 2); }
      });
      res.on('end', () => { if (!closed) retry = setTimeout(connect, 1000); });
      res.on('error', () => { if (!closed) retry = setTimeout(connect, 1000); });
    });
    req.on('error', () => { if (!closed) retry = setTimeout(connect, 1000); });
  };
  connect();
  return {
    send: (line) => fetch(base, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(line) }).then(() => undefined).catch(() => undefined),
    onMessage: (cb) => { cbs.push(cb); return () => { cbs = cbs.filter((c) => c !== cb); }; },
    close: () => { closed = true; clearTimeout(retry); if (req) req.destroy(); },
  };
}

/** Is a relay answering at this URL? */
export async function relayAnswers(url) {
  try {
    const res = await fetch(url.replace(/\/+$/, '') + '/rooms/_/events', { method: 'OPTIONS' });
    return res.status === 204;
  } catch { return false; }
}

/**
 * A relay at this URL, started here when none answers and the host is this
 * machine. Returns the server when one was started, null when one was there.
 */
export async function ensureRelay(url) {
  if (await relayAnswers(url)) return null;
  const u = new URL(url);
  if (!['127.0.0.1', 'localhost', '::1', '0.0.0.0'].includes(u.hostname)) throw new Error(`no relay answers at ${url}, and it is not on this machine`);
  const port = Number(u.port || 80);
  try { return await startRelay(port); }
  catch (err) { throw new Error(`no relay answers at ${url}, and :${port} could not be taken — ${err.message}`); }
}

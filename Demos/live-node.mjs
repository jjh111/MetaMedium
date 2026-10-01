// A live room's transport, in Node: the relay's stream in, POST out — the
// same lines a tab sends over `relayTransport` in Demos/surface/17-folder.js,
// so a process can be a hand in a room. Reconnects and replays from the last
// id it saw, the way a browser's EventSource does.
//
// A relay on the internet (cloudflare/relay) asks for a key per room: `{ key }`
// is sent as `Authorization: Bearer`, on the stream and on every POST — never in
// the address, which a log or a proxy may keep (a browser's EventSource cannot
// set a header, so a tab sends `?key=`; the relay takes either). A relay that
// refuses the key is said once, to the store, as `{ relay: 'refused', status }`
// and not asked again: a wrong key does not mend itself.

import http from 'node:http';
import https from 'node:https';
import { startRelay } from './relay.mjs';

/** The Authorization header a key is sent as ({} for none). */
export const keyHeaders = (key) => (key ? { authorization: 'Bearer ' + key } : {});

export function relayTransport(url, room, opts = {}) {
  const base = url.replace(/\/+$/, '') + '/rooms/' + encodeURIComponent(room) + '/events';
  const auth = keyHeaders(opts.key);
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
    req = mod.get(base, { headers: { ...auth, ...(lastId ? { 'last-event-id': String(lastId) } : {}) } }, (res) => {
      // A refusal is final: said to the store, and the hand stops asking.
      if ([401, 403, 503].includes(res.statusCode)) {
        res.resume();
        closed = true;
        for (const cb of cbs) cb({ relay: 'refused', room, status: res.statusCode });
        return;
      }
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
    send: (line) => fetch(base, { method: 'POST', headers: { 'content-type': 'application/json', ...auth }, body: JSON.stringify(line) }).then(() => undefined).catch(() => undefined),
    onMessage: (cb) => { cbs.push(cb); return () => { cbs = cbs.filter((c) => c !== cb); }; },
    close: () => { closed = true; clearTimeout(retry); if (req) req.destroy(); },
  };
}

/**
 * Whether a relay lets this hand into this room, and if not, why in words: the
 * stream opened and shut again, so nothing is read and nothing written. The key
 * is never part of the sentence.
 */
export function checkRelay(url, room, opts = {}) {
  const base = url.replace(/\/+$/, '') + '/rooms/' + encodeURIComponent(room) + '/events';
  const mod = base.startsWith('https:') ? https : http;
  return new Promise((resolve) => {
    const req = mod.get(base, { headers: keyHeaders(opts.key), timeout: 8000 }, (res) => {
      const status = res.statusCode;
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { if (status !== 200 && body.length < 400) body += c; });
      const done = () => {
        const words = status === 200 ? ''
          : status === 401 ? 'this relay needs a key — set MM_RELAY_KEY (or --key); the key for a room is made from the relay\'s secret (cloudflare/relay/room-key.mjs)'
          : status === 403 ? (opts.key ? 'that is not the key for room “' + room + '” on this relay' : body.trim() || 'the relay refused this hand')
          : status === 503 ? 'this relay has no keys set up yet — ' + body.trim()
          : 'the relay answered HTTP ' + status + (body.trim() ? ' — ' + body.trim() : '');
        resolve({ ok: status === 200, status, words });
      };
      if (status === 200) { res.destroy(); done(); } else res.on('end', done);
    });
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 0, words: 'no relay answered at ' + url + ' in time' }); });
    req.on('error', (err) => resolve({ ok: false, status: 0, words: 'no relay answers at ' + url + ' — ' + err.message }));
  });
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

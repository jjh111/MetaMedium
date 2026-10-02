// The Worker in the real runtime: `wrangler dev --local` runs workerd with SQLite-backed Durable
// Objects, no login and no network. The Node-side tests cannot see what only workerd enforces —
// an entry module may export only handlers and classes (it refused the first draft of
// src/worker.mjs, whose limits were exported), a stream is written and cut as workerd does it,
// storage is SQLite — so this runs the protocol, a key, a big line, the cap and a restart that
// keeps the room against it.
//
//   cd cloudflare/relay && npm ci && node --test relay.workerd.test.mjs
//
// Skipped by name when wrangler is not installed there (npm ci), so a machine that cannot
// install it still runs the rest.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { keyForRoom } from './src/auth.mjs';
import { relayTransport, checkRelay } from '../../Demos/live-node.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const wrangler = path.join(here, 'node_modules', '.bin', 'wrangler');
const MM = await import(pathToFileURL(path.join(here, '../../Demos/dynaink-core.node.mjs')).href);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 8000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await wait(50); } return fn(); };
const SECRET = 'workerd-test-secret';

const freePort = () => new Promise((resolve) => { const s = createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });

/** wrangler dev over a state folder; resolves with { url, stop } once it says it is ready. */
async function startWorkerd(state) {
  const port = await freePort();
  const child = spawn(wrangler, ['dev', '--local', '--ip', '127.0.0.1', '--port', String(port), '--persist-to', state, '--var', 'MM_RELAY_SECRET:' + SECRET, '--var', 'MM_RELAY_MAX_LINES:5'],
    { cwd: here, env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: '1' }, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  const stop = async () => { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ } await wait(300); };
  if (!(await until(() => /Ready on/.test(log), 60000))) { await stop(); throw new Error('wrangler dev did not start: ' + log.slice(-800)); }
  return { url: `http://127.0.0.1:${port}`, stop };
}

const skip = existsSync(wrangler) ? false : 'wrangler is not installed in cloudflare/relay (npm ci)';

async function readSse(url, init, done, ms = 6000) {
  const res = await fetch(url, { ...init, headers: { accept: 'text/event-stream', ...(init && init.headers) } });
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let text = '';
  const end = Date.now() + ms;
  let pending = null;   // one read at a time: a read left behind by a timeout would swallow the next chunk
  while (Date.now() < end && !done(text)) {
    pending = pending || reader.read();
    const r = await Promise.race([pending, wait(200).then(() => null)]);
    if (!r) continue;
    pending = null;
    if (r.done) break;
    if (r.value) text += dec.decode(r.value, { stream: true });
  }
  await reader.cancel().catch(() => undefined);
  return { status: res.status, headers: res.headers, text };
}

test('in workerd: keys, the stream, Last-Event-ID, the cap and the truncation word, a big line, hands, and a restart that keeps the room', { skip, timeout: 180000 }, async () => {
  const state = mkdtempSync(path.join(tmpdir(), 'dyna-relay-state-'));
  let server = await startWorkerd(state);
  const room = 'wd-' + Math.random().toString(36).slice(2, 7);
  const key = await keyForRoom(SECRET, room);
  const events = () => `${server.url}/rooms/${room}/events`;
  const post = (line, k = key) => fetch(`${events()}?key=${encodeURIComponent(k)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: typeof line === 'string' ? line : JSON.stringify(line) });
  try {
    // A key: none, wrong, right — as words, and OPTIONS needs none.
    assert.equal((await fetch(`${server.url}/rooms/_/events`, { method: 'OPTIONS' })).status, 204);
    assert.equal((await checkRelay(server.url, room, {})).status, 401);
    const wrong = await checkRelay(server.url, room, { key: await keyForRoom(SECRET, 'another') });
    assert.equal(wrong.status, 403);
    assert.match(wrong.words, new RegExp('not the key for room “' + room));
    assert.equal((await checkRelay(server.url, room, { key })).ok, true);

    // Lines and the stream: ids in order, a superseded full gone, a hello kept, CORS for the app.
    await post({ participant: 'alice', events: [{ type: 'old' }], at: 1, full: true });
    await post({ participant: 'carol', events: [], at: 2, hello: true });
    await post({ participant: 'alice', events: [{ type: 'now' }], at: 3, full: true });
    const first = await readSse(`${events()}?key=${key}`, { headers: { origin: 'https://dyna.ink' } }, (t) => t.includes('"now"'));
    assert.equal(first.status, 200);
    assert.match(first.headers.get('content-type'), /^text\/event-stream/);
    assert.equal(first.headers.get('access-control-allow-origin'), 'https://dyna.ink');
    assert.ok(first.text.includes('"hello"') && first.text.includes('"now"') && !first.text.includes('"old"'), first.text);
    assert.equal((await fetch(`${events()}?key=${key}`, { headers: { origin: 'https://evil.example' } })).status, 403);

    // A line posted while a stream is open reaches it; a reconnect is sent only what it missed.
    const live = readSse(`${events()}?key=${key}`, { headers: { 'last-event-id': '3' } }, (t) => t.includes('"fresh"'));
    await wait(300);
    assert.equal((await post({ participant: 'dan', events: [{ type: 'fresh' }] })).status, 204);
    const got = await live;
    assert.ok(got.text.includes('id: 4\n') && !got.text.includes('"now"'), got.text);

    // The cap: five lines kept, the room says how many went.
    for (let i = 0; i < 4; i++) await post({ participant: 'erin', events: [{ type: 'n' + i }] });
    const capped = await readSse(`${events()}?key=${key}`, {}, (t) => t.includes('"n3"'));
    assert.ok(capped.text.includes('"relay":"truncated"') && /"dropped":3/.test(capped.text) && /"kept":5/.test(capped.text), capped.text);

    // A big line in SQLite-backed storage, whole; one over the cap refused; a line is JSON.
    const big = { participant: 'fay', events: [{ type: 'big', pad: 'é'.repeat(2.5e6) }], at: 9 };
    assert.equal((await post(big)).status, 204);
    assert.equal((await post({ participant: 'gus', pad: 'x'.repeat(4.1e6) })).status, 413);
    assert.equal((await post('not json')).status, 400);
    const bigBack = await readSse(`${events()}?key=${key}`, {}, (t) => t.includes('"at":9}'), 20000);
    assert.ok(bigBack.text.includes('é'.repeat(2.5e6)), 'the big line did not come back whole');

    // Two hands through live-node's transport, and the room as a late hand finds it.
    const hands = [];
    try {
      const mk = (name) => { const s = new MM.LiveStore(relayTransport(server.url, room, { key }), name, room); hands.push(s); return s; };
      const ada = MM.createSession({ ...MM.DEFAULT_SESSION_CONFIG, logName: 'ada~1' });
      const a = mk('ada~1');
      ada.addStroke(MM.strokeFor({ shape: 'rectangle', x: 0, y: 0, w: 100, h: 80 }), 1000, undefined, 1);
      await wait(500);
      await a.publish(ada.getEvents());
      const b = mk('bob~1');
      b.hello();
      assert.ok(await until(async () => ((await b.readLogs())['ada~1'] || []).length === 1), 'bob never held ada\'s log');
    } finally { for (const s of hands) s.close(); }

    // A restart keeps the room: the Durable Object's storage is on disk, ids go on from where they were.
    await server.stop();
    server = await startWorkerd(state);
    const again = await readSse(`${server.url}/rooms/${room}/events?key=${key}`, {}, (t) => t.includes('"ada~1"'));
    assert.ok(again.text.includes('"ada~1"') && again.text.includes('"relay":"truncated"'), again.text.slice(0, 400));
    assert.equal((await fetch(`${server.url}/rooms/${room}/events?key=${key}`, { method: 'POST', body: JSON.stringify({ participant: 'hal', events: [] }) })).status, 204);
    const ids = (await readSse(`${server.url}/rooms/${room}/events?key=${key}`, { headers: { 'last-event-id': '1000' } }, () => false, 500)).text;
    assert.ok(!ids.includes('data:'), 'a client past the end was sent lines');
  } finally {
    await server.stop();
    rmSync(state, { recursive: true, force: true });
  }
});

test('in workerd: a picture is put by its hash under the room\'s key, comes back byte for byte from SQLite-backed storage, survives a restart, and is refused past the cap', { skip, timeout: 180000 }, async () => {
  const { createHash } = await import('node:crypto');
  const { encodePNG } = await import('../../Demos/ink-png.mjs');
  const state = mkdtempSync(path.join(tmpdir(), 'dyna-relay-assets-'));
  let server = await startWorkerd(state);
  const room = 'wda-' + Math.random().toString(36).slice(2, 7);
  const key = await keyForRoom(SECRET, room);
  const auth = { authorization: 'Bearer ' + key };
  // Noise does not compress: the PNG is about as large as its pixels, so it is several pieces in storage.
  const n = 700, px = new Uint8Array(n * n * 4);
  let x = 7; for (let i = 0; i < px.length; i++) { x = (x * 1664525 + 1013904223) >>> 0; px[i] = x >>> 24; }
  const png = new Uint8Array(encodePNG(n, n, px));
  const hash = createHash('sha256').update(png).digest('hex');
  const at = (r, h) => `${server.url}/rooms/${r}/assets/${h}`;
  try {
    assert.ok(png.length > 1.5e6, 'a picture of ' + png.length + ' bytes');
    assert.equal((await fetch(at(room, hash), { method: 'PUT', body: png })).status, 401);
    assert.equal((await fetch(at(room, hash), { method: 'PUT', headers: { authorization: 'Bearer ' + await keyForRoom(SECRET, 'another') }, body: png })).status, 403);
    assert.equal((await fetch(at(room, hash), { method: 'PUT', headers: { ...auth, origin: 'https://dyna.ink' }, body: png })).status, 204);
    const pre = await fetch(at(room, hash), { method: 'OPTIONS', headers: { origin: 'https://dyna.ink', 'access-control-request-method': 'PUT' } });
    assert.match(pre.headers.get('access-control-allow-methods'), /PUT/);
    const back = async () => { const r = await fetch(at(room, hash), { headers: auth }); return { r, bytes: new Uint8Array(await r.arrayBuffer()) }; };
    let got = await back();
    assert.equal(got.r.status, 200);
    assert.equal(got.r.headers.get('content-type'), 'image/png');
    assert.match(got.r.headers.get('cache-control'), /immutable/);
    assert.deepEqual(got.bytes, png);
    const head = await fetch(at(room, hash), { method: 'HEAD', headers: auth });
    assert.equal(head.status, 200);
    assert.equal(head.headers.get('content-length'), String(png.length));
    // Another room's key finds none of it; a picture over 12 MB is said too large.
    const otherKey = await keyForRoom(SECRET, 'wda-other');
    assert.equal((await fetch(at('wda-other', hash), { headers: { authorization: 'Bearer ' + otherKey } })).status, 404);
    const huge = new Uint8Array(12 * 1024 * 1024 + 1); huge.set(png.subarray(0, 64));
    const refused = await fetch(at(room, createHash('sha256').update(huge).digest('hex')), { method: 'PUT', headers: auth, body: huge });
    assert.equal(refused.status, 413);
    assert.match(await refused.text(), /12 MB/);
    // A restart keeps the room's pictures: they are in the Durable Object's storage on disk.
    await server.stop();
    server = await startWorkerd(state);
    got = await back();
    assert.equal(got.r.status, 200);
    assert.deepEqual(got.bytes, png);
  } finally {
    await server.stop();
    rmSync(state, { recursive: true, force: true });
  }
});

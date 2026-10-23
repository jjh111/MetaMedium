// The room relay as a Worker + Durable Object — the protocol of Demos/relay.mjs,
// asked the same questions (Demos/relay.test.mjs), plus what a relay on the
// internet adds: a key, an origin, a room that outlives its Durable Object and
// is bounded in what it keeps.
//
//   node --test cloudflare/relay/*.test.mjs
//
// Nothing here needs workerd: the Worker's `fetch` is called with Request
// objects and the Room (the Durable Object class) runs over a fake storage that
// behaves as Cloudflare's does (test/fake.mjs).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from './src/worker.mjs';
import { keyForRoom } from './src/auth.mjs';
import { fakeEnv, readUntil } from './test/fake.mjs';

const ORIGIN = 'https://relay.test';
const SECRET = 'a-server-secret-for-tests';
const post = (env, room, line, init = {}) => worker.fetch(new Request(`${ORIGIN}/rooms/${room}/events${init.query || ''}`, {
  method: 'POST', headers: { 'content-type': 'application/json', ...(init.headers || {}) }, body: typeof line === 'string' ? line : JSON.stringify(line),
}), env);
const open = (env, room, init = {}) => worker.fetch(new Request(`${ORIGIN}/rooms/${room}/events${init.query || ''}`, { headers: { accept: 'text/event-stream', ...(init.headers || {}) }, signal: init.signal }), env);
const openEnv = (vars = {}) => fakeEnv({ MM_RELAY_OPEN: '1', ...vars });

// ----- The protocol, as Demos/relay.mjs speaks it -----------------------------

test('the stream opens with a hello comment and the lines come in order, each with an id', async () => {
  const env = openEnv();
  assert.equal((await post(env, 'r', { participant: 'alice', events: [{ type: 'a' }], at: 1 })).status, 204);
  assert.equal((await post(env, 'r', { participant: 'bob', events: [{ type: 'b' }], at: 2 })).status, 204);
  const res = await open(env, 'r');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /^text\/event-stream/);
  const text = await readUntil(res, (t) => t.includes('"b"'));
  assert.ok(text.startsWith(': hello\n\n'));
  assert.ok(text.indexOf('id: 1\n') < text.indexOf('id: 2\n'));
});

test('a superseded `full` is never replayed, a `hello` is, and a copy handed on keeps its place', async () => {
  const env = openEnv();
  await post(env, 'r', { participant: 'alice', events: [{ type: 'old' }], at: 1, full: true });
  await post(env, 'r', { participant: 'carol', events: [], at: 2, hello: true });
  await post(env, 'r', { participant: 'alice', events: [{ type: 'now' }], at: 3, full: true });
  await post(env, 'r', { participant: 'alice', events: [{ type: 'copy' }], at: 3, full: true, via: 'bob' });
  const text = await readUntil(await open(env, 'r'), (t) => t.includes('"copy"'));
  assert.ok(!text.includes('"old"'), 'the superseded snapshot was replayed');
  assert.ok(text.includes('"hello"'), 'carol, who arrived first, was left unanswered');
  assert.ok(text.includes('"now"'));
  assert.ok(!text.includes('"relay":"truncated"'));
});

test('a reconnect with Last-Event-ID is sent only what it has not seen', async () => {
  const env = openEnv();
  for (const n of ['one', 'two', 'three']) await post(env, 'r', { participant: 'alice', events: [{ type: n }] });
  const text = await readUntil(await open(env, 'r', { headers: { 'last-event-id': '2' } }), (t) => t.includes('"three"'));
  assert.ok(!text.includes('"one"') && !text.includes('"two"'), text);
  assert.ok(text.includes('id: 3\n'));
});

test('a line posted while a stream is open reaches it, with its id', async () => {
  const env = openEnv();
  const ctl = new AbortController();
  const res = await open(env, 'live', { signal: ctl.signal });
  const got = readUntil(res, (t) => t.includes('"fresh"'));
  await new Promise((r) => setTimeout(r, 30));
  await post(env, 'live', { participant: 'alice', events: [{ type: 'fresh' }] });
  const text = await got;
  assert.ok(text.includes('id: 1\ndata: {"participant":"alice"'), text);
  ctl.abort();
});

test('rooms are separate', async () => {
  const env = openEnv();
  await post(env, 'a', { participant: 'x', events: [{ type: 'in-a' }] });
  await post(env, 'b', { participant: 'y', events: [{ type: 'in-b' }] });
  const text = await readUntil(await open(env, 'b'), (t) => t.includes('"in-b"'));
  assert.ok(!text.includes('in-a'));
});

test('a room that has outlived its buffer says so: the count of what went, and what stayed', async () => {
  const env = openEnv({ MM_RELAY_MAX_LINES: '5' });
  for (let i = 0; i < 8; i++) await post(env, 'r', { participant: 'alice', events: [{ type: 'n' + i }], at: i + 1 });
  const text = await readUntil(await open(env, 'r'), (t) => t.includes('"n7"'));
  assert.ok(text.includes('"relay":"truncated"') && text.includes('"dropped":3') && text.includes('"kept":5'), text);
  assert.ok(!text.includes('"n2"') && text.includes('"n3"'), 'the three oldest lines went, the five newest stayed');
  // The notice carries no id, so it never moves a client's Last-Event-ID.
  const notice = text.split('\n\n').find((b) => b.includes('truncated'));
  assert.ok(!notice.includes('id:'), notice);
});

test('a client whose last id is still held missed nothing and is told nothing', async () => {
  const env = openEnv({ MM_RELAY_MAX_LINES: '5' });
  for (let i = 0; i < 8; i++) await post(env, 'r', { participant: 'alice', events: [{ type: 'n' + i }] });
  const text = await readUntil(await open(env, 'r', { headers: { 'last-event-id': '5' } }), (t) => t.includes('"n7"'));
  assert.ok(!text.includes('truncated'), text);
  const behind = await readUntil(await open(env, 'r', { headers: { 'last-event-id': '1' } }), (t) => t.includes('"n7"'));
  assert.ok(behind.includes('truncated'), behind);
});

test('a line is JSON; anything else is refused, and so is a method that is neither', async () => {
  const env = openEnv();
  const bad = await post(env, 'r', 'not json');
  assert.equal(bad.status, 400);
  assert.equal(await bad.text(), 'a line is JSON');
  const put = await worker.fetch(new Request(`${ORIGIN}/rooms/r/events`, { method: 'PUT', body: '{}' }), env);
  assert.equal(put.status, 405);
  const none = await worker.fetch(new Request(`${ORIGIN}/elsewhere`), env);
  assert.equal(none.status, 404);
});

test('a line over the cap (4,000,000 characters) is refused whole and held nowhere', async () => {
  const env = openEnv();
  const huge = JSON.stringify({ participant: 'alice', events: [{ type: 'x', pad: 'x'.repeat(4.1e6) }] });
  assert.equal((await post(env, 'r', huge)).status, 413);
  const text = await readUntil(await open(env, 'r'), (t) => t.includes(': hello'));
  assert.ok(!text.includes('alice'));
});

test('OPTIONS answers 204 with no key — it is how a hand asks whether a relay is there', async () => {
  const env = fakeEnv({ MM_RELAY_SECRET: SECRET });
  const res = await worker.fetch(new Request(`${ORIGIN}/rooms/_/events`, { method: 'OPTIONS' }), env);
  assert.equal(res.status, 204);
});

// ----- A room that outlives its Durable Object, and is bounded ------------------

test('a room is kept in storage: an evicted Durable Object comes back with its lines, ids and count of what went', async () => {
  const env = openEnv({ MM_RELAY_MAX_LINES: '4' });
  for (let i = 0; i < 6; i++) await post(env, 'r', { participant: 'alice', events: [{ type: 'n' + i }] });
  env.ROOMS.evict('r');
  await post(env, 'r', { participant: 'alice', events: [{ type: 'n6' }] });
  const text = await readUntil(await open(env, 'r'), (t) => t.includes('"n6"'));
  assert.ok(text.includes('id: 7\n'), 'the next id continued from 6: ' + text);
  assert.ok(text.includes('"dropped":3') && text.includes('"kept":4'), text);   // 7 lines posted, 4 kept
  assert.ok(!text.includes('"n2"') && text.includes('"n3"'));
});

test('storage holds no more than the cap: what the room dropped is deleted, not left behind', async () => {
  const env = openEnv({ MM_RELAY_MAX_LINES: '3' });
  for (let i = 0; i < 10; i++) await post(env, 'r', { participant: 'alice', events: [{ type: 'n' + i }] });
  const keys = [...env.ROOMS.storages.get('r').map.keys()];
  const lines = keys.filter((k) => k.startsWith('m:'));
  assert.equal(lines.length, 3, keys.join(' '));
});

test('a big line is stored in pieces a Durable Object accepts and comes back whole', async () => {
  const env = openEnv();
  const big = JSON.stringify({ participant: 'alice', events: [{ type: 'big', pad: 'é'.repeat(3e6) }], at: 1 });
  assert.equal((await post(env, 'r', big)).status, 204);
  const storage = env.ROOMS.storages.get('r');
  for (const [k, v] of storage.map) if (k.startsWith('c:')) assert.ok(new TextEncoder().encode(v).length <= 120 * 1024, k + ' is too big for a value');
  env.ROOMS.evict('r');
  const text = await readUntil(await open(env, 'r'), (t) => t.includes('\n\n', t.indexOf('id: 1')) && t.endsWith('\n\n') && t.includes('"at":1}'), 6000);
  assert.ok(text.includes('é'.repeat(3e6)));
});

test('a room is bounded in bytes as well as lines: past MM_RELAY_MAX_BYTES the oldest go and the room says so', async () => {
  const env = openEnv({ MM_RELAY_MAX_BYTES: '50000' });
  for (let i = 0; i < 6; i++) await post(env, 'r', { participant: 'alice', events: [{ type: 'n' + i, pad: 'x'.repeat(20000) }] });
  const text = await readUntil(await open(env, 'r'), (t) => t.includes('"n5"'));
  assert.ok(text.includes('"relay":"truncated"'), 'told nothing');
  assert.ok(!text.includes('"n0"') && text.includes('"n5"'));
  const kept = Number(/"kept":(\d+)/.exec(text)[1]);
  assert.ok(kept >= 1 && kept <= 2, 'kept ' + kept);
});

// ----- Auth: a key per room ------------------------------------------------------

test('with a secret set, a room needs its key — as ?key=, or as Authorization: Bearer', async () => {
  const env = fakeEnv({ MM_RELAY_SECRET: SECRET });
  const key = await keyForRoom(SECRET, 'claude');
  assert.equal((await post(env, 'claude', { participant: 'a' })).status, 401);
  assert.equal((await post(env, 'claude', { participant: 'a' }, { query: '?key=wrong' })).status, 403);
  assert.equal((await post(env, 'claude', { participant: 'a' }, { query: '?key=' + encodeURIComponent(key) })).status, 204);
  assert.equal((await post(env, 'claude', { participant: 'a' }, { headers: { authorization: 'Bearer ' + key } })).status, 204);
  assert.equal((await open(env, 'claude')).status, 401);
  const res = await open(env, 'claude', { query: '?key=' + key });
  assert.equal(res.status, 200);
  await res.body.cancel();
  const viaHeader = await open(env, 'claude', { headers: { authorization: 'Bearer ' + key } });
  assert.equal(viaHeader.status, 200);
  await viaHeader.body.cancel();
});

test('a room\'s key opens that room and no other', async () => {
  const env = fakeEnv({ MM_RELAY_SECRET: SECRET });
  const key = await keyForRoom(SECRET, 'claude');
  assert.equal((await post(env, 'table', { participant: 'a' }, { query: '?key=' + key })).status, 403);
  assert.equal((await open(env, 'table', { query: '?key=' + key })).status, 403);
});

test('the key for `*` opens every room — John\'s own, never an agent\'s', async () => {
  const env = fakeEnv({ MM_RELAY_SECRET: SECRET });
  const all = await keyForRoom(SECRET, '*');
  assert.notEqual(all, await keyForRoom(SECRET, 'claude'));
  for (const room of ['claude', 'table', 'a b']) assert.equal((await post(env, encodeURIComponent(room), { participant: 'a' }, { query: '?key=' + all })).status, 204);
});

test('keys are a pure function of the secret and the room, and a rotated secret keeps the old one valid while both are listed', async () => {
  assert.equal(await keyForRoom(SECRET, 'claude'), await keyForRoom(SECRET, 'claude'));
  assert.notEqual(await keyForRoom(SECRET, 'claude'), await keyForRoom(SECRET + '2', 'claude'));
  assert.match(await keyForRoom(SECRET, 'claude'), /^[A-Za-z0-9_-]{43}$/);
  const oldKey = await keyForRoom('old-secret', 'claude');
  const both = fakeEnv({ MM_RELAY_SECRET: 'new-secret, old-secret' });
  assert.equal((await post(both, 'claude', { participant: 'a' }, { query: '?key=' + oldKey })).status, 204);
  assert.equal((await post(both, 'claude', { participant: 'a' }, { query: '?key=' + await keyForRoom('new-secret', 'claude') })).status, 204);
  const only = fakeEnv({ MM_RELAY_SECRET: 'new-secret' });
  assert.equal((await post(only, 'claude', { participant: 'a' }, { query: '?key=' + oldKey })).status, 403);
});

test('a relay with no secret and no leave to be open refuses everything, and says why', async () => {
  const env = fakeEnv();
  const res = await post(env, 'r', { participant: 'a' });
  assert.equal(res.status, 503);
  assert.match(await res.text(), /MM_RELAY_SECRET/);
});

test('the key is never echoed: not in an error body, not in a header', async () => {
  const env = fakeEnv({ MM_RELAY_SECRET: SECRET });
  const res = await post(env, 'claude', { participant: 'a' }, { query: '?key=secret-ish-value-123' });
  assert.equal(res.status, 403);
  const all = (await res.text()) + JSON.stringify([...res.headers]);
  assert.ok(!all.includes('secret-ish-value-123'));
});

// ----- CORS ----------------------------------------------------------------------

test('the app\'s origins are let in, and named, never a wildcard; another origin is refused', async () => {
  const env = openEnv();
  for (const origin of ['https://dyna.ink', 'https://jjh111.github.io', 'http://localhost:8010', 'http://127.0.0.1:5174']) {
    const pre = await worker.fetch(new Request(`${ORIGIN}/rooms/r/events`, { method: 'OPTIONS', headers: { origin, 'access-control-request-headers': 'content-type, last-event-id, authorization' } }), env);
    assert.equal(pre.status, 204, origin);
    assert.equal(pre.headers.get('access-control-allow-origin'), origin);
    assert.match(pre.headers.get('access-control-allow-headers'), /authorization/);
    assert.match(pre.headers.get('vary'), /origin/i);
    const get = await open(env, 'r', { headers: { origin } });
    assert.equal(get.headers.get('access-control-allow-origin'), origin);
    await get.body.cancel();
  }
  for (const origin of ['https://evil.example', 'https://dyna.ink.evil.example', 'http://localhost.evil.example', 'null']) {
    const res = await post(openEnv(), 'r', { participant: 'a' }, { headers: { origin } });
    assert.equal(res.status, 403, origin);
    // Refused with CORS headers of its own (RELAY-1), so that page can read why — and nothing else: no line was taken.
    assert.equal(res.headers.get('access-control-allow-origin'), origin);
    assert.match(await res.text(), /this origin may not use this relay/);
  }
});

test('MM_RELAY_ORIGINS adds origins (a preview site, another domain)', async () => {
  const env = openEnv({ MM_RELAY_ORIGINS: 'https://preview.dyna.ink, https://other.example' });
  const res = await post(env, 'r', { participant: 'a' }, { headers: { origin: 'https://preview.dyna.ink' } });
  assert.equal(res.status, 204);
});

test('a hand with no Origin (Node: the MCP hand, the watcher) is not a browser and needs no CORS', async () => {
  const env = openEnv();
  const res = await post(env, 'r', { participant: 'a' });
  assert.equal(res.status, 204);
});

test('a room name that is too long or will not decode is refused', async () => {
  const env = openEnv();
  assert.equal((await post(env, 'x'.repeat(300), { participant: 'a' })).status, 400);
  assert.equal((await post(env, '%E0%A4%A', { participant: 'a' })).status, 400);
});

// ----- Pictures in a room (PLAN-IPAD-NOTES A1) --------------------------------------
// The protocol cases are the ones the Node relay answers (Demos/relay-assets.conformance.mjs, run in
// relay.parity.test.mjs); what is here is what a relay on the internet adds: the room's key, the origin,
// bytes kept in a Durable Object's storage in pieces it accepts, and a room that comes back from eviction.

import { pngOf, sha } from '../../Demos/relay-assets.conformance.mjs';

const assetUrl = (room, hash, query = '') => `${ORIGIN}/rooms/${room}/assets/${hash}${query}`;
const putAsset = (env, room, bytes, init = {}) => worker.fetch(new Request(assetUrl(room, sha(bytes), init.query || ''), { method: 'PUT', headers: init.headers || {}, body: bytes }), env);
const getAsset = (env, room, hash, init = {}) => worker.fetch(new Request(assetUrl(room, hash, init.query || ''), { method: init.method || 'GET', headers: init.headers || {} }), env);

test('a picture needs the room\'s key, to put and to get — as ?key= or as a Bearer — and one room\'s key opens no other room\'s pictures', async () => {
  const env = fakeEnv({ MM_RELAY_SECRET: SECRET });
  const key = await keyForRoom(SECRET, 'claude');
  const png = pngOf(6);
  assert.equal((await putAsset(env, 'claude', png)).status, 401);
  assert.equal((await putAsset(env, 'claude', png, { query: '?key=wrong' })).status, 403);
  assert.equal((await putAsset(env, 'table', png, { query: '?key=' + key })).status, 403);
  assert.equal((await putAsset(env, 'claude', png, { headers: { authorization: 'Bearer ' + key } })).status, 204);
  assert.equal((await getAsset(env, 'claude', sha(png))).status, 401);
  assert.equal((await getAsset(env, 'claude', sha(png), { query: '?key=' + key })).status, 200);
  assert.equal((await getAsset(env, 'claude', sha(png), { headers: { authorization: 'Bearer ' + key } })).status, 200);
  assert.equal((await getAsset(env, 'claude', sha(png), { method: 'HEAD', headers: { authorization: 'Bearer ' + key } })).status, 200);
  const res = await putAsset(env, 'claude', png, { query: '?key=secret-ish-value-123' });
  assert.ok(!((await res.text()) + JSON.stringify([...res.headers])).includes('secret-ish-value-123'), 'the key was echoed');
});

test('a browser from the app\'s origin may put and get a picture, and is told it may; another origin is refused', async () => {
  const env = openEnv();
  const png = pngOf(5);
  const pre = await worker.fetch(new Request(assetUrl('r', sha(png)), { method: 'OPTIONS', headers: { origin: 'https://dyna.ink', 'access-control-request-method': 'PUT', 'access-control-request-headers': 'content-type, authorization' } }), env);
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get('access-control-allow-origin'), 'https://dyna.ink');
  assert.match(pre.headers.get('access-control-allow-methods'), /PUT/);
  assert.match(pre.headers.get('access-control-allow-methods'), /HEAD/);
  const put = await putAsset(env, 'r', png, { headers: { origin: 'https://dyna.ink', 'content-type': 'image/png' } });
  assert.equal(put.status, 204);
  assert.equal(put.headers.get('access-control-allow-origin'), 'https://dyna.ink');
  const got = await getAsset(env, 'r', sha(png), { headers: { origin: 'https://dyna.ink' } });
  assert.equal(got.headers.get('access-control-allow-origin'), 'https://dyna.ink');
  assert.equal((await putAsset(env, 'r', pngOf(9), { headers: { origin: 'https://evil.example' } })).status, 403);
});

test('a picture is kept in storage in pieces a Durable Object accepts, and an evicted object comes back holding it', async () => {
  const env = openEnv();
  // A big one: noise does not compress, so the PNG is about as large as its pixels.
  const n = 600, px = new Uint8Array(n * n * 4);
  let x = 99; for (let i = 0; i < px.length; i++) { x = (x * 1664525 + 1013904223) >>> 0; px[i] = x >>> 24; }
  const { encodePNG } = await import('../../Demos/ink-png.mjs');
  const png = new Uint8Array(encodePNG(n, n, px));
  assert.ok(png.length > 1.4e6);
  assert.equal((await putAsset(env, 'r', png)).status, 204);
  for (const [k, v] of env.ROOMS.storages.get('r').map) if (k.startsWith('ac:')) assert.ok((v.byteLength ?? v.length) <= 120 * 1024, k + ' is too big for a value');
  env.ROOMS.evict('r');
  const got = await getAsset(env, 'r', sha(png));
  assert.equal(got.status, 200);
  assert.deepEqual(new Uint8Array(await got.arrayBuffer()), png);
  // …and what it holds still counts against the room: after eviction a second put of it is no new cost.
  assert.equal((await putAsset(env, 'r', png)).status, 204);
});

test('the room\'s pictures and its lines are separate: lines dropped past the cap never take a picture with them', async () => {
  const env = openEnv({ MM_RELAY_MAX_LINES: '2' });
  const png = pngOf(11);
  await putAsset(env, 'r', png);
  for (let i = 0; i < 6; i++) await post(env, 'r', { participant: 'alice', events: [{ type: 'n' + i }] });
  assert.equal((await getAsset(env, 'r', sha(png))).status, 200);
});

test('the Worker\'s own address for an asset is the room\'s, and a path that is neither is a 404', async () => {
  const env = openEnv();
  assert.equal((await worker.fetch(new Request(`${ORIGIN}/assets/${'ab'.repeat(32)}`), env)).status, 404);
  assert.equal((await worker.fetch(new Request(`${ORIGIN}/rooms/r/assets/${'ab'.repeat(32)}`, { method: 'DELETE' }), env)).status, 405);
});

// ----- Rooms anyone opens (POST /rooms), and how long they are kept -------------------

const mint = (env, init = {}) => worker.fetch(new Request(`${ORIGIN}/rooms`, { method: init.method || 'POST', headers: { origin: 'https://dyna.ink', 'cf-connecting-ip': init.ip || '203.0.113.7', ...(init.headers || {}) } }), env);

test('POST /rooms opens a room: an unguessable `r-` name, its key, how long it is kept — never cached, with CORS for the app', async () => {
  const env = fakeEnv({ MM_RELAY_SECRET: SECRET });
  const res = await mint(env);
  assert.equal(res.status, 201);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://dyna.ink');
  const { room, key, idleDays } = await res.json();
  assert.match(room, /^r-[A-Za-z0-9_-]{22}$/);
  assert.equal(key, await keyForRoom(SECRET, room));
  assert.equal(idleDays, 30);
  const other = await (await mint(env)).json();
  assert.notEqual(other.room, room);
  // Its key opens it…
  assert.equal((await post(env, room, { participant: 'a' }, { headers: { authorization: 'Bearer ' + key } })).status, 204);
  // …and no other room: not another minted one, not a room named by hand.
  assert.equal((await post(env, other.room, { participant: 'a' }, { headers: { authorization: 'Bearer ' + key } })).status, 403);
  assert.equal((await post(env, 'claude', { participant: 'a' }, { headers: { authorization: 'Bearer ' + key } })).status, 403);
  // A preflight is answered; a GET is not how a room is opened.
  const pre = await mint(env, { method: 'OPTIONS' });
  assert.equal(pre.status, 204);
  assert.match(pre.headers.get('access-control-allow-methods'), /POST/);
  // A GET says what the relay does with the rooms it opens — to anyone, for a guest who was not there when it opened.
  const said = await mint(env, { method: 'GET' });
  assert.equal(said.status, 200);
  assert.deepEqual(await said.json(), { idleDays: 30, opens: true });
  assert.equal((await mint(env, { method: 'PUT' })).status, 405);
});

test('opening rooms is counted: ten an hour from one address, then a 429 that says when, in words — another address may still', async () => {
  const env = fakeEnv({ MM_RELAY_SECRET: SECRET });
  for (let i = 0; i < 10; i++) assert.equal((await mint(env)).status, 201, 'room ' + (i + 1));
  const no = await mint(env);
  assert.equal(no.status, 429);
  const retry = Number(no.headers.get('retry-after'));
  assert.ok(retry >= 1 && retry <= 3600, String(retry));
  assert.equal(no.headers.get('access-control-allow-origin'), 'https://dyna.ink');
  assert.match(no.headers.get('access-control-expose-headers'), /retry-after/);
  assert.match(await no.text(), /^this address has opened as many rooms as it may for now — try again in \d+ (seconds|minutes)$/);
  assert.equal((await mint(env, { ip: '198.51.100.2' })).status, 201);
});

test('the relay\'s day is counted too: past MM_RELAY_MINT_PER_DAY in all, every address is told to wait', async () => {
  const env = fakeEnv({ MM_RELAY_SECRET: SECRET, MM_RELAY_MINT_PER_DAY: '3' });
  for (let i = 0; i < 3; i++) assert.equal((await mint(env, { ip: '192.0.2.' + i })).status, 201);
  const no = await mint(env, { ip: '192.0.2.99' });
  assert.equal(no.status, 429);
  assert.match(await no.text(), /this relay has opened as many rooms as it may today/);
  assert.ok(Number(no.headers.get('retry-after')) >= 1);
});

test('MM_RELAY_MINT=0 opens no rooms, a relay with no secret opens none, an open relay opens rooms with no key, and a foreign origin is refused with CORS', async () => {
  const off = await mint(fakeEnv({ MM_RELAY_SECRET: SECRET, MM_RELAY_MINT: '0' }));
  assert.equal(off.status, 503);
  assert.match(await off.text(), /not opening new rooms/);
  const none = await mint(fakeEnv());
  assert.equal(none.status, 503);
  assert.match(await none.text(), /MM_RELAY_SECRET/);
  const open = await mint(fakeEnv({ MM_RELAY_OPEN: '1', MM_RELAY_ROOM_IDLE_DAYS: '7' }));
  assert.equal(open.status, 201);
  const body = await open.json();
  assert.equal(body.key, null);
  assert.equal(body.idleDays, 7);
  const foreign = await worker.fetch(new Request(`${ORIGIN}/rooms`, { method: 'POST', headers: { origin: 'https://evil.example' } }), fakeEnv({ MM_RELAY_SECRET: SECRET }));
  assert.equal(foreign.status, 403);
  assert.equal(foreign.headers.get('access-control-allow-origin'), 'https://evil.example');
  // With no Limits binding the route fails closed, and says so.
  const env = fakeEnv({ MM_RELAY_SECRET: SECRET });
  delete env.LIMITS;
  const closed = await mint(env);
  assert.equal(closed.status, 503);
  assert.match(await closed.text(), /cannot count/);
});

test('a room the relay opened is forgotten once nobody has used it for its idle days: the alarm empties its storage, its memory and its streams', async () => {
  const env = fakeEnv({ MM_RELAY_OPEN: '1' });
  const { room } = await (await mint(env)).json();
  const before = Date.now();
  assert.equal((await post(env, room, { participant: 'ada~1', events: [{ type: 'mark' }] }, { headers: { 'x-dyna-hand': 'ada-secret-0123456789' } })).status, 204);
  const png = pngOf(4);
  assert.equal((await putAsset(env, room, png)).status, 204);
  const storage = env.ROOMS.storages.get(room);
  const day = 24 * 3600_000;
  assert.ok(storage.alarm >= before + 30 * day - 3600_000 && storage.alarm <= Date.now() + 30 * day, 'the alarm is thirty days out: ' + (storage.alarm - before) / day);
  assert.ok([...storage.map.keys()].some((k) => k.startsWith('h:')), 'the name was claimed');
  // A stream open as the time comes is closed.
  const ctl = new AbortController();
  const res = await open(env, room, { signal: ctl.signal });
  const reader = res.body.getReader();
  await env.ROOMS.rooms.get(room).alarm();
  assert.equal(storage.map.size, 0, 'storage holds ' + [...storage.map.keys()].join(' '));
  let done = false;
  for (let i = 0; i < 20 && !done; i++) { const r = await reader.read(); done = r.done; }
  assert.equal(done, true, 'the stream was left open');
  // What it held is gone from memory too: a newcomer hears nothing, the picture is not there, the name is anyone's.
  const text = await readUntil(await open(env, room), (t) => t.includes(': hello'));
  assert.ok(!text.includes('ada~1'), text);
  assert.equal((await getAsset(env, room, sha(png))).status, 404);
  assert.equal((await post(env, room, { participant: 'ada~1' }, { headers: { 'x-dyna-hand': 'another-secret-0123456' } })).status, 204);
  ctl.abort();
});

test('a room named by hand is never forgotten: it sets no alarm, whatever it holds', async () => {
  const env = openEnv();
  await post(env, 'claude', { participant: 'a', events: [{ type: 'x' }] });
  await post(env, 'r-not-a-minted-name', { participant: 'a', events: [{ type: 'x' }] });
  assert.equal(env.ROOMS.storages.get('claude').alarm, null);
  assert.equal(env.ROOMS.storages.get('r-not-a-minted-name').alarm, null);
});

test('each use moves a room\'s alarm out again, but no more than once an hour', async () => {
  const env = openEnv();
  const { room } = await (await mint(env)).json();
  const mark = { participant: 'a', events: [{ type: 'x' }] };
  await post(env, room, mark);
  const storage = env.ROOMS.storages.get(room);
  const first = storage.alarm;
  const puts = storage.writes.puts;
  await post(env, room, mark);
  assert.equal(storage.alarm, first, 'moved within the hour');
  assert.equal(storage.writes.puts, puts + 1, 'one write for the line, none for the alarm');
  env.ROOMS.rooms.get(room).alarmAt = first - 2 * 3600_000;   // as if the last use were two hours ago
  await post(env, room, mark);
  assert.ok(storage.alarm >= first, 'moved out again');
  // A beat — a line that only says its hand is here — is a use too, and is written nowhere.
  env.ROOMS.rooms.get(room).alarmAt = first - 2 * 3600_000;
  const beforeBeat = storage.writes.puts;
  storage.alarm = null;
  await post(env, room, { participant: 'a', events: [], at: 5 });
  assert.equal(storage.writes.puts, beforeBeat, 'nothing written for the beat');
  assert.ok(storage.alarm >= first, 'the beat moved the alarm out');
});

// ----- A hand's name is its own: claims, and the forged line --------------------------

const hand = (secret) => ({ headers: { 'x-dyna-hand': secret } });
const ADA = 'ada-sitting-secret-0001', EVE = 'eve-sitting-secret-0002';

test('a name is claimed by the hand that writes under it first: its own lines are taken, a whole log in its name from anyone else is refused (409, in words)', async () => {
  const env = openEnv();
  assert.equal((await post(env, 'r', { participant: 'ada~1', events: [{ type: 'mine' }], at: 1, sid: 's-ada' }, hand(ADA))).status, 204);
  assert.equal((await post(env, 'r', { participant: 'ada~1', events: [{ type: 'more' }], at: 2, sid: 's-ada' }, hand(ADA))).status, 204);
  // Eve, with the room's key and Ada's sitting id (which every line carries), sends an empty whole log as Ada.
  for (const init of [hand(EVE), {}]) {
    const forged = await post(env, 'r', { participant: 'ada~1', events: [], at: 9e12, full: true, sid: 's-ada' }, init);
    assert.equal(forged.status, 409);
    assert.equal(await forged.text(), 'that name is another hand’s in this room — the line was not taken');
  }
  const text = await readUntil(await open(env, 'r'), (t) => t.includes('"more"'));
  assert.ok(!text.includes('9000000000000'), 'the forged line was kept');
  // Eve's own name is hers, and she may hand on a copy of Ada's log under it.
  assert.equal((await post(env, 'r', { participant: 'eve~1', events: [], at: 3 }, hand(EVE))).status, 204);
  assert.equal((await post(env, 'r', { participant: 'ada~1', events: [{ type: 'mine' }, { type: 'more' }], at: 2, full: true, via: 'eve~1' }, hand(EVE))).status, 204);
  // A bad secret is said; the secret is never said back, nor kept.
  const bad = await post(env, 'r', { participant: 'x~1' }, hand('no good'));
  assert.equal(bad.status, 400);
  const kept = JSON.stringify([...env.ROOMS.storages.get('r').map]);
  assert.ok(!kept.includes(ADA) && !kept.includes(EVE), 'a secret was stored');
});

test('a hand from before claims — no secret — still writes under a name nobody holds, and the claims outlive the Durable Object', async () => {
  const env = openEnv();
  assert.equal((await post(env, 'r', { participant: 'old-mcp' })).status, 204);
  assert.equal((await post(env, 'r', { participant: 'old-mcp' })).status, 204);
  assert.equal((await post(env, 'r', { participant: 'ada~1' }, hand(ADA))).status, 204);
  env.ROOMS.evict('r');
  assert.equal((await post(env, 'r', { participant: 'ada~1' }, hand(EVE))).status, 409);
  assert.equal((await post(env, 'r', { participant: 'ada~1' }, hand(ADA))).status, 204);
});

// ----- The floodgate, and what a room lets go of first ------------------------------------

test('a hand that sends more than a room takes is told to wait (429, retry-after, words); another hand is not held back', async () => {
  const env = openEnv();
  let refused = null;
  for (let i = 0; i < 40 && !refused; i++) {
    const res = await post(env, 'r', { participant: 'eve~1', events: [{ type: 'spam' + i }] }, hand(EVE));
    if (res.status === 429) refused = res;
    else assert.equal(res.status, 204);
  }
  assert.ok(refused, 'forty lines at once were all taken');
  assert.ok(Number(refused.headers.get('retry-after')) >= 1);
  assert.match(await refused.text(), /wait \d+ s and send again/);
  assert.equal((await post(env, 'r', { participant: 'ada~1', events: [{ type: 'fine' }] }, hand(ADA))).status, 204);
});

test('a room over its caps lets go first of what replay would never send — each hand\'s own whole logs a newer one stands after — and only then of history', async () => {
  const env = openEnv({ MM_RELAY_MAX_BYTES: '200000' });
  // Ada's twenty strokes, then every newcomer's hello answered with her whole log — which holds them — again and again.
  const strokes = Array.from({ length: 20 }, (_, i) => ({ type: 's' + i }));
  for (let i = 0; i < 20; i++) await post(env, 'r', { participant: 'ada~1', events: [strokes[i]], at: i + 1 }, hand(ADA));
  for (let k = 0; k < 6; k++) await post(env, 'r', { participant: 'ada~1', events: [...strokes, { type: 'whole', pad: 'x'.repeat(40000), k }], at: 100 + k, full: true }, hand(ADA));
  const text = await readUntil(await open(env, 'r'), (t) => t.includes('"k":5'));
  assert.ok(!text.includes('truncated'), 'history was let go of while older whole logs stood: ' + text.slice(0, 300));
  assert.ok(text.includes('"s0"') && text.includes('"s19"'));
  const lines = [...env.ROOMS.storages.get('r').map.keys()].filter((k) => k.startsWith('m:'));
  // Compaction runs only when the room is over a cap: the newest whole log since the last time stays, with the one
  // after it; the older whole logs went, and the strokes they held with them.
  assert.ok(lines.length >= 1 && lines.length <= 2, 'the newest whole log or two: ' + lines.length);
  assert.ok(!text.includes('"k":0') && !text.includes('"k":3'), 'a superseded whole log was replayed');
  // Past what compaction can free, history goes as before, and the room says so.
  for (let k = 0; k < 6; k++) await post(env, 'r', { participant: 'bob~' + k, events: [{ pad: 'y'.repeat(40000) }] }, hand('bob-secret-00000000' + k));
  const later = await readUntil(await open(env, 'r'), (t) => t.includes('bob~5'));
  assert.ok(later.includes('"relay":"truncated"'), later.slice(0, 200));
});

// ----- What the review found: beats that pushed a room's marks out, and a floodgate a new secret walked past -----

test('a beat — a line that only says its hand is here — reaches the streams open now and is kept nowhere: hours of them leave the board in the room', async () => {
  const env = openEnv({ MM_RELAY_MAX_LINES: '60' });
  const { room } = await (await mint(env)).json();
  assert.equal((await post(env, room, { participant: 'ann~1', events: [{ type: 'the-box' }], at: 1, full: true, sid: 's-ann' }, hand(ADA))).status, 204);
  const ctl = new AbortController();
  const watching = await open(env, room, { signal: ctl.signal });
  // Three pages beating for "hours", every 20 s: 600 beats in a room that keeps 60 lines.
  let t = Date.now;
  let clock = Date.now();
  Date.now = () => clock;
  try {
    for (let i = 0; i < 200; i++) {
      for (const [who, secret] of [['ann~1', ADA], ['fern~1', 'fern-sitting-secret-03'], ['bo~1', 'bo-sitting-secret-0004']]) {
        assert.equal((await post(env, room, { participant: who, events: [], at: 10 + i, sid: 's-' + who }, hand(secret))).status, 204);
      }
      clock += 20_000;
    }
  } finally { Date.now = t; }
  const live = await readUntil(watching, (s) => (s.match(/"bo~1"/g) || []).length >= 3);
  assert.ok(/"bo~1"/.test(live), 'a beat did not reach a stream open as it came');
  ctl.abort();
  const newcomer = await readUntil(await open(env, room), (s) => s.includes('{"relay":"live"}'));
  assert.ok(newcomer.includes('"the-box"'), 'the board was pushed out of the room by beats');
  assert.ok(!newcomer.includes('"relay":"truncated"'), newcomer.slice(0, 300));
  assert.ok(!newcomer.includes('"bo~1"'), 'a beat was replayed');
  const lines = [...env.ROOMS.storages.get(room).map.keys()].filter((k) => k.startsWith('m:'));
  assert.equal(lines.length, 1);
  // The replay is said to begin and end, around the lines, so a store takes nobody to be here by them.
  assert.ok(newcomer.indexOf('{"relay":"replay"}') < newcomer.indexOf('"the-box"') && newcomer.indexOf('"the-box"') < newcomer.indexOf('{"relay":"live"}'));
});

test('a new secret and name on every line is still one address: a burst of big lines from it stops well short of flushing the room, and so does the room as a whole', async () => {
  const env = openEnv();
  for (let i = 0; i < 20; i++) assert.equal((await post(env, 'r', { participant: 'alice~1', events: [{ type: 'a' + i }], at: i + 1, sid: 's-a' }, hand(ADA))).status, 204);
  const pad = 'z'.repeat(3_900_000);
  const statuses = [];
  for (let i = 0; i < 12; i++) {
    const secret = ('rotating-secret-' + i).padEnd(22, 'q');
    const res = await post(env, 'r', { participant: 'flood~' + i, events: [{ pad }], at: 1 }, { headers: { 'x-dyna-hand': secret, 'cf-connecting-ip': '203.0.113.9' } });
    statuses.push(res.status);
    if (res.status === 429) assert.match(await res.text(), /this address is sending more than a room takes/);
  }
  assert.ok(statuses.includes(429) && statuses.filter((s) => s === 204).length <= 6, statuses.join(','));
  const text = await readUntil(await open(env, 'r'), (s) => s.includes('{"relay":"live"}'));
  assert.ok(text.includes('"a0"') && text.includes('"a19"') && !text.includes('"relay":"truncated"'), 'alice\'s history was flushed');
  // From many addresses at once, the room's own bucket holds.
  const env2 = openEnv();
  const many = [];
  for (let i = 0; i < 12; i++) {
    const res = await post(env2, 'r', { participant: 'flood~' + i, events: [{ pad }], at: 1 }, { headers: { 'x-dyna-hand': ('another-secret-' + i).padEnd(22, 'q'), 'cf-connecting-ip': '198.51.100.' + i } });
    many.push(res.status);
    if (res.status === 429) assert.match(await res.text(), /this room is taking more than it can/);
  }
  assert.ok(many.includes(429) && many.filter((s) => s === 204).length <= 6, many.join(','));
});

test('names claimed from one address are counted, and a room keeps at most so many — those with no line left go first', async () => {
  const env = openEnv();
  const statuses = [];
  for (let i = 0; i < 40; i++) {
    const res = await post(env, 'r', { participant: 'n~' + i, events: [{ type: 'x' }], at: 1 }, { headers: { 'x-dyna-hand': ('claim-secret-' + i).padEnd(22, 'q'), 'cf-connecting-ip': '203.0.113.7' } });
    statuses.push(res.status);
  }
  assert.equal(statuses.filter((s) => s === 204).length, 30, statuses.join(','));
  const refused = await post(env, 'r', { participant: 'n~99', events: [{ type: 'x' }], at: 1 }, { headers: { 'x-dyna-hand': 'claim-secret-99'.padEnd(22, 'q'), 'cf-connecting-ip': '203.0.113.7' } });
  assert.equal(refused.status, 429);
  assert.match(await refused.text(), /too many new hands from this address/);
  // A hand already here goes on writing; another address still joins.
  assert.equal((await post(env, 'r', { participant: 'n~0', events: [{ type: 'y' }], at: 2 }, { headers: { 'x-dyna-hand': 'claim-secret-0'.padEnd(22, 'q'), 'cf-connecting-ip': '203.0.113.7' } })).status, 204);
  assert.equal((await post(env, 'r', { participant: 'ok~1', events: [{ type: 'z' }], at: 3 }, { headers: { 'x-dyna-hand': 'ok-secret'.padEnd(22, 'q'), 'cf-connecting-ip': '192.0.2.1' } })).status, 204);
  assert.equal(env.ROOMS.rooms.get('r').claims.size, 31);
});

test('a room at its most names lets go of the ones no line it holds was written under, and writes that down', async () => {
  const env = openEnv({ MM_RELAY_MAX_LINES: '50' });
  const real = Date.now;
  let clock = real();
  Date.now = () => clock;
  try {
    for (let i = 0; i < 1001; i++) {
      clock += 100;   // a new hand every tenth of a second, from addresses of their own — under every floodgate
      const res = await post(env, 'r', { participant: 'n~' + i, events: [{ type: 'x' }], at: 1 }, { headers: { 'x-dyna-hand': ('cap-secret-' + i).padEnd(22, 'q'), 'cf-connecting-ip': '10.0.' + Math.floor(i / 25) + '.' + (i % 25) } });
      assert.equal(res.status, 204, 'line ' + i);
    }
  } finally { Date.now = real; }
  const room = env.ROOMS.rooms.get('r');
  assert.ok(room.claims.size <= 1000 && room.claims.has('n~1000') && room.claims.has('n~999') && !room.claims.has('n~0'), String(room.claims.size));
  const stored = [...env.ROOMS.storages.get('r').map.keys()].filter((k) => k.startsWith('h:'));
  assert.equal(stored.length, room.claims.size);
});

// ----- One machine is one caller: an IPv6 address by its /64 ------------------------------

test('a machine on IPv6 is one caller: rooms opened from one /64, a new interface id on every request, stop at ten an hour', async () => {
  const env = fakeEnv({ MM_RELAY_SECRET: SECRET });
  const statuses = [];
  for (let i = 0; i < 14; i++) statuses.push((await mint(env, { ip: '2001:db8:aa:bb:' + (i + 1).toString(16) + '::7' })).status);
  assert.deepEqual(statuses, [...Array(10).fill(201), ...Array(4).fill(429)]);
  assert.equal((await mint(env, { ip: '2001:db8:aa:bc::1' })).status, 201, 'the next /64 is another caller');
});

test('a machine on IPv6 is one address in a room too: new names from one /64 stop at its share, and its lines share one bucket', async () => {
  const env = openEnv();
  const statuses = [];
  for (let i = 0; i < 40; i++) {
    const res = await post(env, 'r', { participant: 'v6~' + i, events: [{ type: 'x' }], at: 1 }, { headers: { 'x-dyna-hand': ('v6-secret-' + i).padEnd(22, 'q'), 'cf-connecting-ip': '2001:db8:cc:dd::' + (i + 1).toString(16) } });
    statuses.push(res.status);
  }
  assert.equal(statuses.filter((s) => s === 204).length, 30, statuses.join(','));
  assert.equal(env.ROOMS.rooms.get('r').addresses.size, 1, 'one /64, one address');
});

// ----- What a caller keeps is counted across rooms, and what opened rooms hold in all ---------

test('what one address keeps is counted across every room it writes in — lines and pictures — and a beat costs nothing; another address keeps on', async () => {
  const env = openEnv({ MM_RELAY_STORE_PER_DAY: String(3 * 1024 * 1024) });
  const ip = '203.0.113.60';
  const rooms = [];
  for (let i = 0; i < 4; i++) rooms.push((await (await mint(env, { ip })).json()).room);
  const pad = 'p'.repeat(600_000);
  const statuses = [];
  let said = null;
  for (const room of rooms) {
    const res = await post(env, room, { participant: 'a~' + room, events: [{ pad }], at: 1 }, { headers: { 'x-dyna-hand': ('store-' + room).slice(0, 22).padEnd(22, 'q'), 'cf-connecting-ip': ip } });
    statuses.push(res.status);
    if (res.status === 429 && !said) { said = await res.text(); assert.ok(Number(res.headers.get('retry-after')) >= 1); }
  }
  // Four fresh rooms are no fresh allowance: past three MiB a day in all, the next is refused.
  assert.ok(statuses.filter((s) => s === 204).length <= 4 && statuses.filter((s) => s === 204).length >= 1, statuses.join(','));
  const more = [];
  for (let i = 0; i < 6; i++) more.push((await post(env, rooms[i % 4], { participant: 'a~' + rooms[i % 4], events: [{ pad }], at: 2 + i }, { headers: { 'x-dyna-hand': ('store-' + rooms[i % 4]).slice(0, 22).padEnd(22, 'q'), 'cf-connecting-ip': ip } })).status);
  assert.ok(more.includes(429), 'one address filled room after room: ' + statuses.concat(more).join(','));
  said = said || await (await post(env, rooms[0], { participant: 'a~' + rooms[0], events: [{ pad }], at: 99 }, { headers: { 'x-dyna-hand': ('store-' + rooms[0]).slice(0, 22).padEnd(22, 'q'), 'cf-connecting-ip': ip } })).text();
  assert.match(said, /this address has kept as much on this relay as a day allows — nothing was added; try again in \d+ (seconds|minutes|hours)$/);
  // A picture counts too (one bigger than what a room drew of the day and has not used: it draws a megabyte at a time).
  const big = new Uint8Array(1_500_000);
  big.set(pngOf(31));
  const pic = await putAsset(env, rooms[1], big, { headers: { 'cf-connecting-ip': ip } });
  assert.equal(pic.status, 429);
  // A beat is kept nowhere and costs nothing.
  assert.equal((await post(env, rooms[0], { participant: 'a~' + rooms[0], events: [], at: 500 }, { headers: { 'x-dyna-hand': ('store-' + rooms[0]).slice(0, 22).padEnd(22, 'q'), 'cf-connecting-ip': ip } })).status, 204);
  // Another address keeps on, in the same rooms.
  assert.equal((await post(env, rooms[0], { participant: 'b~1', events: [{ pad }], at: 3 }, { headers: { 'x-dyna-hand': 'other-address-secret-1', 'cf-connecting-ip': '198.51.100.61' } })).status, 204);
  assert.equal((await putAsset(env, rooms[1], pngOf(32), { headers: { 'cf-connecting-ip': '198.51.100.61' } })).status, 204);
});

test('pictures go through a room\'s floodgate: a burst of big ones from one address is told to wait, in words', async () => {
  const env = openEnv();
  const big = (n) => { const b = pngOf(n); const out = new Uint8Array(6 * 1024 * 1024); out.set(b); return out; };
  const statuses = [];
  let said = null;
  for (let i = 0; i < 8; i++) {
    const res = await putAsset(env, 'r', big(40 + i), { headers: { 'cf-connecting-ip': '203.0.113.70' } });
    statuses.push(res.status);
    if (res.status === 429 && !said) { said = await res.text(); assert.ok(Number(res.headers.get('retry-after')) >= 1); }
  }
  assert.ok(statuses.includes(429) && statuses.filter((s) => s === 204).length <= 4, statuses.join(','));
  assert.match(said, /this address is sending more than a room takes at once/);
});

test('what the rooms the relay opened hold at once is bounded: past it a room keeps nothing more, no room is opened, and a room forgotten gives its share back', async () => {
  const env = openEnv({ MM_RELAY_MINTED_HELD: String(10 * 1024 * 1024) });
  const a = (await (await mint(env, { ip: '192.0.2.10' })).json()).room;
  const b = (await (await mint(env, { ip: '192.0.2.11' })).json()).room;
  const pad = 'q'.repeat(3_000_000);
  // Each room reserves its share as it fills: two rooms of a few MB each fill ten MB of reservations.
  assert.equal((await post(env, a, { participant: 'a~1', events: [{ pad }], at: 1 }, { headers: { 'x-dyna-hand': 'gauge-secret-a-000001', 'cf-connecting-ip': '192.0.2.10' } })).status, 204);
  assert.equal((await post(env, b, { participant: 'b~1', events: [{ pad }], at: 1 }, { headers: { 'x-dyna-hand': 'gauge-secret-b-000001', 'cf-connecting-ip': '192.0.2.11' } })).status, 204);
  const statuses = [];
  let full = null;
  for (let i = 0; i < 4; i++) {
    const res = await post(env, i % 2 ? b : a, { participant: (i % 2 ? 'b' : 'a') + '~1', events: [{ pad }], at: 2 + i }, { headers: { 'x-dyna-hand': 'gauge-secret-' + (i % 2 ? 'b' : 'a') + '-000001', 'cf-connecting-ip': '192.0.2.' + (10 + (i % 2)) } });
    statuses.push(res.status);
    if (res.status === 507 && !full) full = await res.text();
  }
  assert.ok(statuses.includes(507), statuses.join(','));
  assert.equal(full, 'this relay holds as much as it may for the rooms people open — nothing was added, and what this room holds stays');
  // No new room is opened to fill while they do; a room named by hand keeps on.
  const no = await mint(env, { ip: '192.0.2.12' });
  assert.equal(no.status, 503);
  assert.match(await no.text(), /opens no new room until older ones are let go of/);
  assert.equal((await post(env, 'claude', { participant: 'john~1', events: [{ pad }], at: 1 }, { headers: { 'x-dyna-hand': 'john-sitting-secret-01' } })).status, 204);
  // A room forgotten gives back all it reserved, and rooms open again.
  const held = env.ROOMS.rooms.get(a).reserved;
  assert.ok(held > 0);
  assert.equal(Number(env.ROOMS.storages.get(a).map.get('reserved')), held, 'what it reserved is written down, for the alarm after an eviction');
  await env.ROOMS.rooms.get(a).alarm();
  await env.ROOMS.rooms.get(b).alarm();
  assert.equal(Number(env.LIMITS.storages.get('minted').map.get('held:rooms')), 0);
  assert.equal((await mint(env, { ip: '192.0.2.12' })).status, 201);
  // The gauge is never a window: the Limits alarm lets it be.
  await post(env, (await (await mint(env, { ip: '192.0.2.13' })).json()).room, { participant: 'c~1', events: [{ pad }], at: 1 }, { headers: { 'x-dyna-hand': 'gauge-secret-c-000001', 'cf-connecting-ip': '192.0.2.13' } });
  await env.LIMITS.objectOf('minted').alarm();
  assert.ok(Number(env.LIMITS.storages.get('minted').map.get('held:rooms')) > 0);
});

// ----- A room forgotten, and a hand that read it before ----------------------------------

test('a hand that reconnects to a room since forgotten is told so and sent the room as it is now — its old Last-Event-ID is past every id the room has', async () => {
  const env = openEnv();
  const { room } = await (await mint(env)).json();
  for (let i = 1; i <= 5; i++) await post(env, room, { participant: 'ann~1', events: [{ type: 'old' + i }], at: i }, hand(ADA));
  await env.ROOMS.rooms.get(room).alarm();
  for (let i = 1; i <= 3; i++) await post(env, room, { participant: 'fern~1', events: [{ type: 'new' + i }], at: 10 + i }, hand(EVE));
  const back = await readUntil(await open(env, room, { headers: { 'last-event-id': '5' } }), (t) => t.includes('{"relay":"live"}'));
  assert.ok(back.includes('"relay":"forgotten"'), back.slice(0, 200));
  assert.ok(back.includes('"new1"') && back.includes('"new3"'), 'the room as it is now was not sent');
  assert.ok(back.indexOf('"relay":"forgotten"') < back.indexOf('{"relay":"replay"}'));
  // A hand whose last id the room issued is told nothing of the kind.
  const fine = await readUntil(await open(env, room, { headers: { 'last-event-id': '2' } }), (t) => t.includes('{"relay":"live"}'));
  assert.ok(!fine.includes('forgotten') && fine.includes('"new3"') && !fine.includes('"new2"'));
});

// ----- A beat that lets names go deletes them as storage takes them ---------------------------

test('a beat that claims a name in a full room lets go of more than a storage call takes, in as many calls as it needs', async () => {
  const env = openEnv();
  // A room holding a thousand names with no line left in it, as names claimed sitting after sitting leave one.
  const storage = (await import('./test/fake.mjs')).fakeStorage();
  for (let i = 0; i < 1000; i++) storage.map.set('h:gone~' + i, 'x'.repeat(64));
  const fresh = new (await import('./src/worker.mjs')).Room({ storage, blockConcurrencyWhile: (f) => f() }, env);
  const res = await fresh.fetch(new Request(`${ORIGIN}/rooms/beats/events`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-dyna-hand': 'beat-secret-000000001' }, body: JSON.stringify({ participant: 'new~1', events: [], at: 1 }) }));
  assert.equal(res.status, 204);
  const claims = [...storage.map.keys()].filter((k) => k.startsWith('h:'));
  assert.deepEqual(claims, ['h:new~1']);
  assert.equal(fresh.claims.size, 1);
});

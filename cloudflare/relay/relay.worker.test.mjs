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
    assert.equal(res.headers.get('access-control-allow-origin'), null);
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

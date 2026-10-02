// The relay's catch-up: a connecting client is brought up to the PRESENT.
//
//   node --test Demos/relay.test.mjs
//
// `replay` is a pure function of a room and a last-seen id, so it can be asked
// questions with no server, no socket and no clock — the same seam the field's
// reader has (SEAM-1). The truncation notice is checked over a real socket,
// because it is the one thing that is about the wire.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { replay, truncationNotice, startRelay, kindOf, maxLinesFrom, DEFAULT_MAX_LINES } from './relay.mjs';

const room = (...lines) => ({
  name: 'r',
  dropped: 0,
  clients: new Set(),
  lines: lines.map((l, i) => ({ id: i + 1, data: JSON.stringify(l), participant: l.participant, kind: kindOf(l) })),
});
const kinds = (ls) => ls.map((l) => l.participant + ':' + l.kind + l.id);

test('a superseded `full` is never replayed — a snapshot out of its moment installs a past state', () => {
  const r = room(
    { participant: 'alice', full: true },   // 1 — alice's log as it was
    { participant: 'alice' },               // 2
    { participant: 'alice', full: true },   // 3 — alice's log as it stands
    { participant: 'bob' },                 // 4
  );
  assert.deepEqual(kinds(replay(r)), ['alice:append2', 'alice:full3', 'bob:append4']);
});

test('the last `full` of EACH hand stands, and the appends around it keep their order', () => {
  const r = room(
    { participant: 'alice', full: true },
    { participant: 'bob', full: true },
    { participant: 'bob', full: true },
    { participant: 'alice' },
  );
  assert.deepEqual(kinds(replay(r)), ['alice:full1', 'bob:full3', 'alice:append4']);
});

test('a `hello` IS replayed — it is how a hand that arrived first is answered at last', () => {
  const r = room({ participant: 'carol', hello: true }, { participant: 'alice' });
  assert.deepEqual(kinds(replay(r)), ['carol:hello1', 'alice:append2']);
});

test('a log handed on by another hand is replayed as it came, and never supersedes the writer\'s own', () => {
  const r = room(
    { participant: 'alice', full: true },                // 1 — alice's own, as it stands
    { participant: 'alice', full: true, via: 'bob' },    // 2 — bob's copy of alice, in answer to a hello
    { participant: 'alice' },                            // 3
  );
  assert.deepEqual(kinds(replay(r)), ['alice:full1', 'alice:relayed2', 'alice:append3']);
});

test('how much a room remembers: the option, else MM_RELAY_MAX_LINES, else the default', () => {
  assert.equal(maxLinesFrom(10, {}), 10);
  assert.equal(maxLinesFrom(undefined, { MM_RELAY_MAX_LINES: '25' }), 25);
  assert.equal(maxLinesFrom(10, { MM_RELAY_MAX_LINES: '25' }), 10);
  assert.equal(maxLinesFrom(undefined, {}), DEFAULT_MAX_LINES);
  for (const bad of [0, -3, 2.5, 'lots', '']) assert.equal(maxLinesFrom(bad, {}), DEFAULT_MAX_LINES, String(bad));
});

test('a reconnect replays only what it has not seen', () => {
  const r = room({ participant: 'alice' }, { participant: 'alice', full: true }, { participant: 'alice' });
  assert.deepEqual(kinds(replay(r, 2)), ['alice:append3']);
});

test('a room inside its buffer says nothing', () => {
  assert.equal(truncationNotice(room({ participant: 'alice' })), null);
});

test('a room that has outlived its buffer says so to a client asking for everything', () => {
  const r = room({ participant: 'alice' });
  r.dropped = 12;
  const notice = truncationNotice(r, 0);
  assert.deepEqual(notice, { relay: 'truncated', room: 'r', dropped: 12, kept: 1 });
  // No `participant`, so a store that only knows about logs ignores it.
  assert.equal(typeof notice.participant, 'undefined');
});

test('a client whose last id is still held missed nothing, and is told nothing', () => {
  const r = room({ participant: 'alice' }, { participant: 'bob' });
  r.dropped = 12;
  r.lines[0].id = 13; r.lines[1].id = 14;
  assert.equal(truncationNotice(r, 12), null);   // it has line 12; 13 is next
  assert.ok(truncationNotice(r, 5));             // it is missing 6..12
});

test('over a real socket: the stream opens, the stale snapshot is gone and the present is there', async () => {
  const server = await startRelay(0);
  const url = `http://127.0.0.1:${server.address().port}/rooms/r/events`;
  const post = (line) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(line) });
  try {
    await post({ participant: 'alice', events: [{ type: 'old' }], at: 1, full: true });
    await post({ participant: 'carol', events: [], at: 2, hello: true });
    await post({ participant: 'alice', events: [{ type: 'now' }], at: 3, full: true });
    const res = await fetch(url, { headers: { accept: 'text/event-stream' } });
    const reader = res.body.getReader();
    let text = '';
    while (!text.includes('"now"')) text += new TextDecoder().decode((await reader.read()).value);
    await reader.cancel();
    assert.ok(!text.includes('"old"'), 'the superseded snapshot was replayed');
    assert.ok(text.includes('"hello"'), 'carol, who arrived first, was left unanswered');
    assert.ok(!text.includes('"relay":"truncated"'), 'a room inside its buffer said otherwise');
  } finally { server.close(); }
});

// ===== Ids that hold (DIRECTOR-PLAN-W2 L1) ====================================
// Real hands this time — LiveStores over the relay transport a Node hand uses
// (live-node.mjs), on a relay of their own — because the notice is only worth
// something if the hand that connects is the one that is told.

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { relayTransport } from './live-node.mjs';

const MM = await import(pathToFileURL(path.join(path.dirname(fileURLToPath(import.meta.url)), 'dynaink-core.node.mjs')).href);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 4000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await wait(25); } return fn(); };
const boxAt = (x) => [0, 1, 2, 3, 4].map((i) => ({ x: x + [0, 60, 60, 0, 0][i], y: [0, 0, 40, 40, 0][i] })).flatMap((p, i, a) =>
  i ? Array.from({ length: 8 }, (_, k) => ({ x: a[i - 1].x + ((p.x - a[i - 1].x) * k) / 8, y: a[i - 1].y + ((p.y - a[i - 1].y) * k) / 8 })) : []);

test('a relay capped at 10 lines, 20 posted: a newcomer is told the room is older than the relay remembers — and a hand still here fills it in', async () => {
  const server = await startRelay(0, { maxLines: 10 });
  const url = `http://127.0.0.1:${server.address().port}`;
  const stores = [];
  try {
    const ada = MM.createSession({ ...MM.DEFAULT_SESSION_CONFIG, logName: 'ada~1' });
    const a = new MM.LiveStore(relayTransport(url, 'r'), 'ada~1', 'r');
    stores.push(a);
    for (let i = 0; i < 20; i++) {
      ada.addStroke(boxAt(i * 80), 1000 + i, undefined, 1);
      await a.appendLog('ada~1', ada.getEvents().slice(-1));
    }
    await wait(100);
    const c = new MM.LiveStore(relayTransport(url, 'r'), 'cleo~1', 'r');
    stores.push(c);
    c.hello();
    const told = await until(() => c.notices().some((n) => /older than the relay remembers/.test(n)));
    assert.ok(told, 'the newcomer was never told: ' + JSON.stringify(c.notices()));
    // At least the ten lines past the cap; the newcomer's own hello can race
    // its stream's connection and push one more out before it is counted.
    const gone = Number((/— (\d+) earlier lines are gone/.exec(c.notices().join(' ')) || [])[1]);
    assert.ok(gone >= 10, JSON.stringify(c.notices()));
    // Ada is still here and answers the hello with her whole log, so what the
    // relay forgot is not lost to the room.
    const whole = await until(async () => ((await c.readLogs())['ada~1'] || []).length === 20);
    assert.ok(whole, 'the newcomer holds ' + (((await c.readLogs())['ada~1'] || []).length) + ' of ada\'s 20');
  } finally {
    for (const s of stores) s.close();
    server.close();
  }
});

test('MM_RELAY_MAX_LINES caps a room over a real socket, and the notice counts what went', async () => {
  const before = process.env.MM_RELAY_MAX_LINES;
  process.env.MM_RELAY_MAX_LINES = '5';
  const server = await startRelay(0);
  if (before === undefined) delete process.env.MM_RELAY_MAX_LINES; else process.env.MM_RELAY_MAX_LINES = before;
  const url = `http://127.0.0.1:${server.address().port}/rooms/r/events`;
  try {
    for (let i = 0; i < 8; i++) await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ participant: 'alice', events: [{ type: 'n' + i }], at: i + 1 }) });
    const res = await fetch(url, { headers: { accept: 'text/event-stream' } });
    const reader = res.body.getReader();
    let text = '';
    while (!text.includes('"n7"')) text += new TextDecoder().decode((await reader.read()).value);
    await reader.cancel();
    assert.ok(text.includes('"relay":"truncated"') && text.includes('"dropped":3') && text.includes('"kept":5'), text);
    assert.ok(!text.includes('"n2"') && text.includes('"n3"'), 'the three oldest lines went, the five newest stayed');
  } finally { server.close(); }
});

test('three hands over a real relay, one departed: the one that joins after holds its final log, the undo included', async () => {
  const server = await startRelay(0);
  const url = `http://127.0.0.1:${server.address().port}`;
  const stores = [];
  const mine = (s) => s.getEvents().filter((e) => !e.by);
  try {
    const ada = MM.createSession({ ...MM.DEFAULT_SESSION_CONFIG, logName: 'ada~1' });
    const a = new MM.LiveStore(relayTransport(url, 'three'), 'ada~1', 'three');
    stores.push(a);
    for (let i = 0; i < 3; i++) { ada.addStroke(boxAt(i * 80), 1000 + i, undefined, 1); await a.publish(mine(ada)); }
    const b = new MM.LiveStore(relayTransport(url, 'three'), 'bob~1', 'three');
    stores.push(b);
    b.hello();
    assert.ok(await until(async () => ((await b.readLogs())['ada~1'] || []).length === 3), 'bob never caught up with ada\'s three');
    ada.addStroke(boxAt(400), 2000, undefined, 1); await a.publish(mine(ada));
    ada.addStroke(boxAt(480), 2100, undefined, 1); await a.publish(mine(ada));
    ada.undo(); await a.publish(mine(ada));
    const final = mine(ada);
    assert.equal(final.length, 4);
    assert.ok(await until(async () => JSON.stringify((await b.readLogs())['ada~1']) === JSON.stringify(final)), 'the undo never reached bob');
    a.close();
    const c = new MM.LiveStore(relayTransport(url, 'three'), 'cleo~1', 'three');
    stores.push(c);
    c.hello();
    assert.ok(await until(async () => JSON.stringify((await c.readLogs())['ada~1']) === JSON.stringify(final)),
      'cleo holds ' + JSON.stringify(((await c.readLogs())['ada~1'] || []).map((e) => e.seq)) + ', not ada\'s final ' + JSON.stringify(final.map((e) => e.seq)));
    assert.deepEqual(c.collisions(), []);
  } finally {
    for (const s of stores) s.close();
    server.close();
  }
});

// ===== Pictures in a room (PLAN-IPAD-NOTES A1) =======================================
// The bytes of a picture, kept by the SHA-256 of them, per room. One definition of the cases for both
// servers (relay-assets.conformance.mjs); the Worker's run is cloudflare/relay/relay.parity.test.mjs.

import { assetConformance, pngOf, sha } from './relay-assets.conformance.mjs';
import { sniffImage, MAX_ASSET_BYTES, assetPathOf, assetCheck } from './relay-protocol.mjs';

assetConformance(test, async (vars = {}) => {
  const server = await startRelay(0, { assetRoomBytes: vars.assetRoomBytes });
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => { server.closeAllConnections?.(); return new Promise((r) => server.close(() => r())); } };
});

test('the Node relay answers a browser\'s preflight for a put of a picture', async () => {
  const server = await startRelay(0);
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/rooms/r/assets/${'ab'.repeat(32)}`, { method: 'OPTIONS' });
    assert.equal(res.status, 204);
    assert.match(res.headers.get('access-control-allow-methods'), /PUT/);
    assert.match(res.headers.get('access-control-allow-methods'), /HEAD/);
    assert.match(res.headers.get('access-control-allow-headers'), /content-type/);
  } finally { server.closeAllConnections?.(); server.close(); }
});

test('a Node relay with a directory keeps its pictures there, and a restarted relay still has them', async () => {
  const { mkdtempSync, readdirSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const dir = mkdtempSync(path.join(tmpdir(), 'mm-relay-assets-'));
  const png = pngOf(14, [9, 9, 200, 255]);
  const base = (server) => `http://127.0.0.1:${server.address().port}/rooms/r/assets/${sha(png)}`;
  let server = await startRelay(0, { assetDir: dir });
  try {
    assert.equal((await fetch(base(server), { method: 'PUT', body: png })).status, 204);
    assert.ok(readdirSync(dir, { recursive: true }).length > 0, 'nothing was written to the directory');
  } finally { server.closeAllConnections?.(); server.close(); }
  server = await startRelay(0, { assetDir: dir });
  try {
    const got = await fetch(base(server));
    assert.equal(got.status, 200);
    assert.deepEqual(new Uint8Array(await got.arrayBuffer()), png);
  } finally { server.closeAllConnections?.(); server.close(); }
});

// ----- what a picture's header says: the same reading in both servers and in the MCP hand -----
const be32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const le24 = (n) => [n & 255, (n >> 8) & 255, (n >> 16) & 255];
const le32 = (n) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
const ascii = (s) => [...s].map((c) => c.charCodeAt(0));
const bytesOf = (...parts) => Uint8Array.from(parts.flatMap((p) => [...p]));
const jpegWith = (w, h, sof = 0xc0) => bytesOf([0xff, 0xd8], [0xff, 0xe0, 0, 16], ascii('JFIF'), [0, 1, 1, 0, 0, 1, 0, 1, 0, 0], [0xff, 0xdb, 0, 5, 0, 1, 2, 3], [0xff, sof, 0, 11, 8], [h >> 8, h & 255, w >> 8, w & 255], [1, 1, 0x11, 0]);

test('sniffImage reads a PNG\'s size from its IHDR, and refuses what is not one', () => {
  const p = sniffImage(pngOf(7));
  assert.deepEqual(p, { mime: 'image/png', w: 7, h: 7 });
  assert.equal(sniffImage(new TextEncoder().encode('hello')), null);
  assert.equal(sniffImage(new Uint8Array(0)), null);
  assert.equal(sniffImage(Uint8Array.from([0x89, 0x50, 0x4e, 0x47])), null, 'a signature with no header is no picture');
});

test('sniffImage reads a JPEG\'s size past its other segments, in a baseline and a progressive file alike', () => {
  assert.deepEqual(sniffImage(jpegWith(640, 480)), { mime: 'image/jpeg', w: 640, h: 480 });
  assert.deepEqual(sniffImage(jpegWith(3000, 2000, 0xc2)), { mime: 'image/jpeg', w: 3000, h: 2000 });
  // 0xc4 (a Huffman table) is not a frame: it must be walked past, not read as a size.
  const noFrame = bytesOf([0xff, 0xd8], [0xff, 0xc4, 0, 4, 0, 0], [0xff, 0xd9]);
  assert.deepEqual(sniffImage(noFrame), { mime: 'image/jpeg', w: 0, h: 0 }, 'a JPEG with no frame is a JPEG of no known size');
});

test('sniffImage reads a WebP\'s size in each of its three forms, and a GIF\'s', () => {
  const riff = (chunk) => bytesOf(ascii('RIFF'), le32(chunk.length + 4), ascii('WEBP'), chunk);
  const vp8x = riff(bytesOf(ascii('VP8X'), le32(10), [0, 0, 0, 0], le24(799), le24(599)));
  assert.deepEqual(sniffImage(vp8x), { mime: 'image/webp', w: 800, h: 600 });
  const vp8l = riff(bytesOf(ascii('VP8L'), le32(5), [0x2f], le32(((300 - 1) & 0x3fff) | (((200 - 1) & 0x3fff) << 14))));
  assert.deepEqual(sniffImage(vp8l), { mime: 'image/webp', w: 300, h: 200 });
  const vp8 = riff(bytesOf(ascii('VP8 '), le32(10), [0, 0, 0], [0x9d, 0x01, 0x2a], [320 & 255, 320 >> 8, 240 & 255, 240 >> 8]));
  assert.deepEqual(sniffImage(vp8), { mime: 'image/webp', w: 320, h: 240 });
  const gif = bytesOf(ascii('GIF89a'), [100, 0, 50, 0], [0, 0, 0]);
  assert.deepEqual(sniffImage(gif), { mime: 'image/gif', w: 100, h: 50 });
});

test('the protocol\'s asset address and verdicts: a hash is 64 lower-case hex digits, and each refusal is a status and a sentence', async () => {
  assert.equal(MAX_ASSET_BYTES, 12 * 1024 * 1024);
  assert.deepEqual(assetPathOf('/rooms/r%20x/assets/' + 'ab'.repeat(32)), { room: 'r x', hash: 'ab'.repeat(32) });
  assert.equal(assetPathOf('/rooms/r/events'), null);
  assert.equal(assetPathOf('/rooms/r/assets/nope').hash, null, 'a bad hash is carried so it can be refused in words');
  const png = pngOf(3);
  assert.equal(await assetCheck(png, sha(png), { held: 0, cap: 1e6 }), null);
  assert.equal((await assetCheck(png, sha(pngOf(4)), { held: 0, cap: 1e6 })).status, 422);
  assert.equal((await assetCheck(new Uint8Array(0), 'ab'.repeat(32), { held: 0, cap: 1e6 })).status, 400);
  assert.equal((await assetCheck(Uint8Array.from([1, 2, 3]), sha(Uint8Array.from([1, 2, 3])), { held: 0, cap: 1e6 })).status, 415);
  assert.equal((await assetCheck(png, sha(png), { held: 1e6, cap: 1e6 })).status, 507);
});

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
import { setOf } from './relay-protocol.mjs';

/** A line as a hand writes it: an append carries an event (a line with none only says its hand is here). */
const withEvents = (l) => ('events' in l || l.hello || l.full || l.bye ? l : { ...l, events: [{ type: 'mark' }] });
const room = (...lines) => ({
  name: 'r',
  dropped: 0,
  clients: new Set(),
  lines: lines.map(withEvents).map((l, i) => ({ id: i + 1, data: JSON.stringify(l), participant: l.participant, kind: kindOf(l), ...(setOf(l) ? { set: setOf(l) } : {}) })),
});
const kinds = (ls) => ls.map((l) => l.participant + ':' + l.kind + l.id);

test('a superseded `full` is never replayed — a snapshot out of its moment installs a past state — nor what it stands in place of', () => {
  const r = room(
    { participant: 'alice', full: true },   // 1 — alice's log as it was
    { participant: 'alice' },               // 2 — an append to it, which 3 holds
    { participant: 'alice', full: true },   // 3 — alice's log as it stands
    { participant: 'bob' },                 // 4
  );
  assert.deepEqual(kinds(replay(r)), ['alice:full3', 'bob:append4']);
});

test('a whole sent in pieces stands once it is all there, and in place of what came before it; one never finished stands for nothing', () => {
  const r = room(
    { participant: 'alice', full: true },                          // 1 — alice's whole, in one line
    { participant: 'alice' },                                      // 2
    { participant: 'alice', full: true, more: true, set: 50 },     // 3 — a whole in pieces begins
    { participant: 'bob' },                                        // 4
    { participant: 'alice', set: 50, more: true },                 // 5
    { participant: 'alice', set: 50 },                             // 6 — and is all there
    { participant: 'alice' },                                      // 7
    { participant: 'alice', full: true, more: true, set: 90 },     // 8 — another begins, and alice leaves halfway
    { participant: 'alice', bye: true, events: [] },               // 9
  );
  assert.deepEqual(kinds(replay(r)), ['alice:part3', 'bob:append4', 'alice:piece5', 'alice:last6', 'alice:append7', 'alice:part8', 'alice:bye9']);
  // Before the set at 50 was all there, the whole at 1 still stood — and the pieces were sent, to be held aside.
  const half = { ...r, lines: r.lines.slice(0, 5) };
  assert.deepEqual(kinds(replay(half)), ['alice:full1', 'alice:append2', 'alice:part3', 'bob:append4', 'alice:piece5']);
});

test('a line that only says its hand is here is never kept: it is the one kind a room passes on and forgets', () => {
  assert.equal(kindOf({ participant: 'a', events: [], at: 1, sid: 's' }), 'here');
  assert.equal(kindOf({ participant: 'a', events: [], at: 1, hello: true }), 'hello');
  assert.equal(kindOf({ participant: 'a', events: [], at: 1, bye: true }), 'bye');
  assert.equal(kindOf({ participant: 'a', events: [], at: 1, full: true }), 'full');
  assert.equal(kindOf({ participant: 'a', events: [], at: 1, set: 5 }), 'last');
  assert.equal(kindOf({ participant: 'a', events: [{}], at: 1, set: 5, via: 'b' }), 'append');
  assert.equal(kindOf({ participant: 'a', events: [{}], at: 1, full: true, set: 5, more: true, via: 'b' }), 'relayed');
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

test('a room name that will not decode, or is too long, is refused in words — the relay goes on — as the Worker refuses it', async () => {
  const server = await startRelay(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const bad = await fetch(`${base}/rooms/%E0%A4%A/events`);
    assert.equal(bad.status, 400);
    assert.equal(await bad.text(), 'a room name is text');
    const long = await fetch(`${base}/rooms/${'x'.repeat(129)}/events`, { method: 'POST', body: '{}' });
    assert.equal(long.status, 400);
    assert.match(await long.text(), /1–128 characters/);
    assert.equal((await fetch(`${base}/rooms/r/events`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ participant: 'a', events: [{}] }) })).status, 204, 'the relay is still up');
  } finally { server.close(); }
});

test('a hand that reconnects with a last id past every id the room has — the relay restarted — is told the room was forgotten and sent it from its beginning', async () => {
  const server = await startRelay(0);
  const url = `http://127.0.0.1:${server.address().port}/rooms/r/events`;
  try {
    for (const t of ['new1', 'new2']) await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ participant: 'fern', events: [{ type: t }], at: 1 }) });
    const res = await fetch(url, { headers: { accept: 'text/event-stream', 'last-event-id': '40' } });
    const reader = res.body.getReader();
    let text = '';
    while (!text.includes('{"relay":"live"}')) text += new TextDecoder().decode((await reader.read()).value);
    await reader.cancel();
    assert.ok(text.includes('{"relay":"forgotten","room":"r"}'), text);
    assert.ok(text.includes('"new1"') && text.includes('"new2"'));
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

// ----- What a room may let go of first, the rooms a relay opens, the names a hand claims, the floodgate -----
import {
  compact, isMintedRoom, mintRoomName, roomIdleDaysFrom, DEFAULT_ROOM_IDLE_DAYS, claimCheck, writerOf, handHashOf, mintHandSecret,
  CLAIM_WORDS, MAX_HAND_NAME, spend, FLOOD, floodgate, FLOOD_ADDRESS, FLOOD_ROOM, NEW_HANDS, claimsToLetGo, MAX_CLAIMS, CLAIMS_FULL,
} from './relay-protocol.mjs';

/**
 * A seeded room of random lines: hands, fulls, appends, hellos, goodbyes, copies handed on, and wholes in pieces —
 * finished, never finished, interleaved, a piece arriving after a newer whole — some ids already gone.
 */
function randomRoom(seed, n = 40) {
  let x = seed >>> 0;
  const rand = () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; };
  const hands = ['ada', 'bob', 'cleo', 'dan'];
  const sets = [11, 22, 33];
  const lines = [];
  for (let id = 1; id <= n; id++) {
    const participant = hands[Math.floor(rand() * hands.length)];
    const r = rand();
    const set = sets[Math.floor(rand() * sets.length)];
    const ev = [{ type: 'mark' }];
    const line = r < 0.2 ? { participant, full: true } : r < 0.28 ? { participant, hello: true } : r < 0.36 ? { participant, full: true, via: hands[Math.floor(rand() * hands.length)] }
      : r < 0.44 ? { participant, full: true, more: true, set, events: ev } : r < 0.52 ? { participant, set, more: true, events: ev } : r < 0.6 ? { participant, set, events: ev }
      : r < 0.64 ? { participant, bye: true, events: [] } : { participant, events: ev };
    lines.push({ id, data: JSON.stringify(line), participant, kind: kindOf(line), ...(setOf(line) ? { set: setOf(line) } : {}) });
  }
  // Some of the oldest lines let go of by the cap, as a relay does.
  const gone = Math.floor(rand() * 6);
  return { name: 'r', clients: new Set(), lines: lines.slice(gone), dropped: gone, lost: gone };
}

test('compaction drops only what replay would never send: for every last-seen id, on two hundred random rooms, replay and its notice are unchanged', () => {
  const ids = (ls) => ls.map((l) => l.id).join(',');
  for (let seed = 1; seed <= 200; seed++) {
    const r = randomRoom(seed);
    const kept = { ...r, lines: compact(r.lines) };
    assert.ok(kept.lines.length <= r.lines.length);
    for (let after = 0; after <= 41; after++) {
      assert.equal(ids(replay(kept, after)), ids(replay(r, after)), `seed ${seed}, after ${after}`);
      assert.deepEqual(truncationNotice(kept, after) && { ...truncationNotice(kept, after), kept: 0 }, truncationNotice(r, after) && { ...truncationNotice(r, after), kept: 0 }, `seed ${seed}, after ${after}`);
    }
  }
});

test('compaction keeps each hand\'s newest whole and what follows it, every hello, goodbye and copy, in order', () => {
  const r = room(
    { participant: 'alice', full: true },               // 1 — superseded by 4
    { participant: 'alice' },                           // 2 — an append 4 holds
    { participant: 'bob', full: true },                 // 3 — bob's newest
    { participant: 'alice', full: true },               // 4 — alice's newest
    { participant: 'alice', full: true, via: 'bob' },   // 5 — a copy: kept
    { participant: 'carol', hello: true },              // 6
    { participant: 'carol', bye: true },                // 7
  );
  assert.deepEqual(compact(r.lines).map((l) => l.id), [3, 4, 5, 6, 7]);
  // The pieces of a big whole sent again in answer to each hello go with the whole they were: only the newest stays.
  const big = room(
    { participant: 'ann', full: true, more: true, set: 1 }, { participant: 'ann', set: 1, more: true }, { participant: 'ann', set: 1 },
    { participant: 'fern', hello: true },
    { participant: 'ann', full: true, more: true, set: 2 }, { participant: 'ann', set: 2, more: true }, { participant: 'ann', set: 2 },
    { participant: 'ann', full: true, more: true, set: 3 },
  );
  assert.deepEqual(compact(big.lines).map((l) => l.id), [4, 5, 6, 7, 8]);
});

test('a room\'s notice counts what was lost to its cap, never what was compacted away: a client past the last line lost is told nothing', () => {
  const r = room({ participant: 'a', full: true }, { participant: 'a' }, { participant: 'a', full: true }, { participant: 'b' });
  // Line 1 let go of by the cap (lost through 1), then line 3 superseded — none, here; compaction drops 1 if it were held.
  const capped = { ...r, lines: r.lines.slice(1), dropped: 1, lost: 1 };
  assert.equal(truncationNotice(capped, 1), null);
  assert.ok(truncationNotice(capped, 0));
  // With no `lost` said, the line before the first held stands for it, as it always did.
  assert.equal(truncationNotice({ ...capped, lost: undefined }, 1), null);
});

test('a room a relay opens is named `r-` and 128 random bits, and only such a name ages out', () => {
  const names = new Set();
  for (let i = 0; i < 200; i++) names.add(mintRoomName());
  assert.equal(names.size, 200);
  for (const n of names) { assert.match(n, /^r-[A-Za-z0-9_-]{22}$/); assert.equal(isMintedRoom(n), true); }
  for (const n of ['claude', 'table', '*', 'r-', 'r-short', 'r-' + 'a'.repeat(23), 'R-' + 'a'.repeat(22), 'r-' + 'a'.repeat(21) + '!', null, 42]) assert.equal(isMintedRoom(n), false, String(n));
  assert.equal(roomIdleDaysFrom(undefined, {}), DEFAULT_ROOM_IDLE_DAYS);
  assert.equal(roomIdleDaysFrom(undefined, { MM_RELAY_ROOM_IDLE_DAYS: '7' }), 7);
  assert.equal(roomIdleDaysFrom(2, { MM_RELAY_ROOM_IDLE_DAYS: '7' }), 2);
  assert.equal(roomIdleDaysFrom(undefined, { MM_RELAY_ROOM_IDLE_DAYS: 'soon' }), DEFAULT_ROOM_IDLE_DAYS);
});

test('a line\'s writer is the hand that sends it: a copy handed on is its sender\'s', () => {
  assert.equal(writerOf({ participant: 'ada~1' }), 'ada~1');
  assert.equal(writerOf({ participant: 'ada~1', full: true, via: 'bob~2' }), 'bob~2');
  assert.equal(writerOf({ relay: 'truncated' }), '');
  assert.equal(writerOf(null), '');
});

test('a hand\'s secret is kept as a hash, never as itself, and what is not one is said to be not one', async () => {
  const s = mintHandSecret();
  assert.match(s, /^[A-Za-z0-9_-]{22}$/);
  assert.notEqual(mintHandSecret(), s);
  const h = await handHashOf(s);
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.ok(!h.includes(s));
  assert.equal(await handHashOf(s), h);
  assert.equal(await handHashOf(''), '');
  assert.equal(await handHashOf(undefined), '');
  assert.equal(await handHashOf('short'), null);
  assert.equal(await handHashOf('has spaces in it, sixteen+'), null);
});

test('a name is claimed by the first hand that writes under it with a secret; another secret, or none, is refused under it', async () => {
  const claims = new Map();
  const ada = await handHashOf(mintHandSecret()), eve = await handHashOf(mintHandSecret());
  // Ada's first line claims her name.
  const first = claimCheck(claims, { participant: 'ada~1', events: [] }, ada);
  assert.deepEqual(first, { ok: true, claim: 'ada~1' });
  claims.set(first.claim, ada);
  // Her next line, with the same secret, is taken and claims nothing more.
  assert.deepEqual(claimCheck(claims, { participant: 'ada~1', events: [] }, ada), { ok: true });
  // A whole log in her name from anyone else — with a secret of its own, or none — is refused, in words.
  for (const hash of [eve, '']) {
    const no = claimCheck(claims, { participant: 'ada~1', events: [], full: true }, hash);
    assert.equal(no.ok, false);
    assert.equal(no.status, 409);
    assert.equal(no.words, CLAIM_WORDS.taken);
  }
  // Eve may hand on a copy of Ada's log under her own name (the store judges what a copy may change) — and her line claims Eve.
  assert.deepEqual(claimCheck(claims, { participant: 'ada~1', events: [], full: true, via: 'eve~1' }, eve), { ok: true, claim: 'eve~1' });
  claims.set('eve~1', eve);
  // …but not as Ada handing it on, and not in Eve's name with Ada's secret.
  assert.equal(claimCheck(claims, { participant: 'ada~1', events: [], full: true, via: 'eve~1' }, ada).status, 409);
  // A hand from before claims, sending no secret, is taken under a name nobody holds, and claims nothing.
  assert.deepEqual(claimCheck(claims, { participant: 'old-hand', events: [] }, ''), { ok: true });
  // A bad secret, and a name too long to keep, are said; a line that names no writer (the relay's own word) is no one's.
  assert.equal(claimCheck(claims, { participant: 'x' }, null).status, 400);
  assert.equal(claimCheck(claims, { participant: 'x'.repeat(MAX_HAND_NAME + 1) }, ada).status, 400);
  assert.deepEqual(claimCheck(claims, { relay: 'truncated' }, ada), { ok: true });
  // An object of claims reads the same as a Map.
  assert.equal(claimCheck({ 'ada~1': ada }, { participant: 'ada~1' }, eve).status, 409);
});

test('the floodgate: about thirty lines in ten seconds and sixteen million characters a minute, refilled as time passes, with when to ask again', () => {
  let b;
  let t = 1_000_000;
  for (let i = 0; i < FLOOD.lines; i++) { const r = spend(b, t, 100); assert.equal(r.refused, null, 'line ' + i); b = r.bucket; }
  const no = spend(b, t, 100);
  assert.equal(no.refused.status, 429);
  assert.ok(no.refused.retryAfter >= 1 && no.refused.retryAfter <= 1, 'one line comes back in a third of a second, said as 1 s: ' + no.refused.retryAfter);
  assert.match(no.refused.words, /wait \d+ s/);
  // A second later, three lines more.
  t += 1000;
  for (let i = 0; i < 3; i++) { const r = spend(b, t, 100); assert.equal(r.refused, null); b = r.bucket; }
  assert.ok(spend(b, t, 100).refused);
  // Characters: the largest board a page shares (12M) carried in goes at once; another of the same in the same minute waits.
  let c;
  const big = spend(c, t, 12_000_000);
  assert.equal(big.refused, null);
  c = big.bucket;
  const again = spend(c, t, 12_000_000);
  assert.equal(again.refused.status, 429);
  assert.ok(again.refused.retryAfter >= 25 && again.refused.retryAfter <= 35, String(again.refused.retryAfter));
  assert.equal(spend(again.bucket, t + 60_000, 12_000_000).refused, null);
});

test('a room\'s floodgates: a hand that takes a new secret and name on every line is still its address, and the room as a whole is held too', () => {
  const t = 5_000_000;
  // One address, a new hand every line, lines of 3.9M: the address's bucket stops it well under what a room keeps.
  let address, roomB;
  let taken = 0;
  for (let i = 0; i < 12; i++) {
    const g = floodgate([{ kind: 'hand', bucket: undefined, limits: FLOOD }, { kind: 'address', bucket: address, limits: FLOOD_ADDRESS }, { kind: 'room', bucket: roomB, limits: FLOOD_ROOM }], t, 3_900_000);
    if (g.refused) { assert.equal(g.refused.status, 429); assert.match(g.refused.words, /this address is sending more/); continue; }
    [, address, roomB] = g.buckets;
    taken++;
  }
  assert.ok(taken * 3_900_000 <= FLOOD_ADDRESS.chars && taken * 3_900_000 < 32e6, 'taken ' + taken);
  // Many addresses: the room's own bucket stops them.
  let room2;
  let fromMany = 0;
  for (let i = 0; i < 12; i++) {
    const g = floodgate([{ kind: 'hand', bucket: undefined, limits: FLOOD }, { kind: 'address', bucket: undefined, limits: FLOOD_ADDRESS }, { kind: 'room', bucket: room2, limits: FLOOD_ROOM }], t, 3_900_000);
    if (g.refused) { assert.match(g.refused.words, /this room is taking more/); continue; }
    room2 = g.buckets[2];
    fromMany++;
  }
  assert.ok(fromMany * 3_900_000 <= FLOOD_ROOM.chars, 'taken ' + fromMany);
  // New names from one address: thirty, then one every twenty seconds; nothing is spent by a line refused.
  let names;
  for (let i = 0; i < NEW_HANDS.lines; i++) { const g = floodgate([{ kind: 'claim', bucket: names, limits: NEW_HANDS }], t, 100); assert.ok(!g.refused); names = g.buckets[0]; }
  const no = floodgate([{ kind: 'claim', bucket: names, limits: NEW_HANDS }], t, 100);
  assert.match(no.refused.words, /too many new hands from this address/);
  assert.ok(!floodgate([{ kind: 'claim', bucket: names, limits: NEW_HANDS }], t + 21_000, 100).refused);
  const half = floodgate([{ kind: 'hand', bucket: undefined, limits: FLOOD }, { kind: 'claim', bucket: names, limits: NEW_HANDS }], t, 100);
  assert.ok(half.refused && !half.buckets);
});

test('a room keeps so many names: past it, the names no line it holds was written under go first; if none can, a new one is refused', () => {
  const claims = new Map([['ann~1', 'h1'], ['bob~1', 'h2'], ['gone~1', 'h3']]);
  const lines = [{ participant: 'ann~1' }, { participant: 'cleo~1', writer: 'bob~1' }];
  assert.deepEqual(claimsToLetGo(claims, lines, 10), { letGo: [], fits: true });
  assert.deepEqual(claimsToLetGo(claims, lines, 3), { letGo: ['gone~1'], fits: true });
  assert.deepEqual(claimsToLetGo(claims, lines.concat({ participant: 'gone~1' }), 3), { letGo: [], fits: false });
  assert.equal(MAX_CLAIMS, 1000);
  assert.equal(CLAIMS_FULL.status, 429);
});

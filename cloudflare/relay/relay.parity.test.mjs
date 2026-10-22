// The Worker, over a real socket, spoken to by the hands the repository already
// has: `Demos/live-node.mjs`'s transport (what the MCP hand and the watcher
// use) and core's LiveStore — the cases of Demos/relay.test.mjs that are about
// the wire, asked of the Worker run in Node (`dev-server.mjs`: the Worker and
// its Durable Object over in-memory storage, behind a plain http server).
//
//   node --test cloudflare/relay/*.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { startDevRelay } from './dev-server.mjs';
import { keyForRoom } from './src/auth.mjs';
import { relayTransport, relayAnswers, checkRelay } from '../../Demos/live-node.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const MM = await import(pathToFileURL(path.join(here, '../../Demos/dynaink-core.node.mjs')).href);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 4000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await wait(25); } return fn(); };
const boxAt = (x) => [0, 1, 2, 3, 4].map((i) => ({ x: x + [0, 60, 60, 0, 0][i], y: [0, 0, 40, 40, 0][i] })).flatMap((p, i, a) =>
  i ? Array.from({ length: 8 }, (_, k) => ({ x: a[i - 1].x + ((p.x - a[i - 1].x) * k) / 8, y: a[i - 1].y + ((p.y - a[i - 1].y) * k) / 8 })) : []);

test('over a real socket: the stale snapshot is gone, the present is there, and a room inside its buffer says nothing', async () => {
  const { url, close } = await startDevRelay({ MM_RELAY_OPEN: '1' });
  const base = `${url}/rooms/r/events`;
  const post = (line) => fetch(base, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(line) });
  try {
    await post({ participant: 'alice', events: [{ type: 'old' }], at: 1, full: true });
    await post({ participant: 'carol', events: [], at: 2, hello: true });
    await post({ participant: 'alice', events: [{ type: 'now' }], at: 3, full: true });
    const res = await fetch(base, { headers: { accept: 'text/event-stream' } });
    const reader = res.body.getReader();
    let text = '';
    while (!text.includes('"now"')) text += new TextDecoder().decode((await reader.read()).value);
    await reader.cancel();
    assert.ok(!text.includes('"old"') && text.includes('"hello"') && !text.includes('truncated'));
  } finally { await close(); }
});

test('live-node\'s transport carries a key as a Bearer header, and a hand that has it is in the room', async () => {
  const secret = 'parity-secret';
  const { url, close } = await startDevRelay({ MM_RELAY_SECRET: secret });
  const key = await keyForRoom(secret, 'claude');
  try {
    assert.equal(await relayAnswers(url), true, 'OPTIONS needs no key');
    const heard = [];
    const a = relayTransport(url, 'claude', { key });
    const b = relayTransport(url, 'claude', { key });
    b.onMessage((l) => heard.push(l));
    await wait(100);
    await a.send({ participant: 'ada', events: [{ type: 'x' }], at: 1 });
    assert.ok(await until(() => heard.some((l) => l.participant === 'ada')), 'bob never heard ada');
    a.close(); b.close();
  } finally { await close(); }
});

test('a hand with the wrong key is told so, not left waiting: checkRelay says what the relay said, and the transport says it to the store', async () => {
  const secret = 'parity-secret';
  const { url, close } = await startDevRelay({ MM_RELAY_SECRET: secret });
  try {
    const none = await checkRelay(url, 'claude', {});
    assert.equal(none.ok, false);
    assert.equal(none.status, 401);
    assert.match(none.words, /needs a key/);
    const wrong = await checkRelay(url, 'claude', { key: 'nope' });
    assert.equal(wrong.status, 403);
    assert.match(wrong.words, /not the key for room “claude”/);
    assert.equal((await checkRelay(url, 'claude', { key: await keyForRoom(secret, 'claude') })).ok, true);
    const t = relayTransport(url, 'claude', { key: 'nope' });
    const heard = [];
    t.onMessage((l) => heard.push(l));
    assert.ok(await until(() => heard.some((l) => l.relay === 'refused')), 'the transport said nothing');
    assert.equal(heard.find((l) => l.relay === 'refused').status, 403);
    t.close();
    const store = new MM.LiveStore(relayTransport(url, 'claude', { key: 'nope' }), 'ada~1', 'claude');
    assert.ok(await until(() => store.notices().some((n) => /does not take this key for this room/.test(n))), JSON.stringify(store.notices()));
    store.close();
  } finally { await close(); }
});

test('a relay capped at 10 lines, 20 posted: a newcomer is told the room is older than the relay remembers — and a hand still here fills it in', async () => {
  const { url, close } = await startDevRelay({ MM_RELAY_OPEN: '1', MM_RELAY_MAX_LINES: '10' });
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
    assert.ok(await until(() => c.notices().some((n) => /older than the relay remembers/.test(n))), 'the newcomer was never told: ' + JSON.stringify(c.notices()));
    assert.ok(await until(async () => ((await c.readLogs())['ada~1'] || []).length === 20), 'ada\'s whole log never reached the newcomer');
  } finally { for (const s of stores) s.close(); await close(); }
});

test('three hands, one departed, a key on all of them: the hand that joins after holds the final log, the undo included', async () => {
  const secret = 's3';
  const { url, close } = await startDevRelay({ MM_RELAY_SECRET: secret });
  const key = await keyForRoom(secret, 'three');
  const stores = [];
  const mine = (s) => s.getEvents().filter((e) => !e.by);
  try {
    const ada = MM.createSession({ ...MM.DEFAULT_SESSION_CONFIG, logName: 'ada~1' });
    const a = new MM.LiveStore(relayTransport(url, 'three', { key }), 'ada~1', 'three');
    stores.push(a);
    for (let i = 0; i < 3; i++) { ada.addStroke(boxAt(i * 80), 1000 + i, undefined, 1); await a.publish(mine(ada)); }
    const b = new MM.LiveStore(relayTransport(url, 'three', { key }), 'bob~1', 'three');
    stores.push(b);
    b.hello();
    assert.ok(await until(async () => ((await b.readLogs())['ada~1'] || []).length === 3));
    ada.addStroke(boxAt(400), 2000, undefined, 1); await a.publish(mine(ada));
    ada.undo(); await a.publish(mine(ada));
    const final = mine(ada);
    assert.ok(await until(async () => JSON.stringify((await b.readLogs())['ada~1']) === JSON.stringify(final)), 'the undo never reached bob');
    a.close();
    const c = new MM.LiveStore(relayTransport(url, 'three', { key }), 'cleo~1', 'three');
    stores.push(c);
    c.hello();
    assert.ok(await until(async () => JSON.stringify((await c.readLogs())['ada~1']) === JSON.stringify(final)), 'cleo did not get ada\'s final log');
    assert.deepEqual(c.collisions(), []);
  } finally { for (const s of stores) s.close(); await close(); }
});

// ----- Pictures in a room (PLAN-IPAD-NOTES A1): the same cases as the Node relay's, over a socket -----
import { assetConformance } from '../../Demos/relay-assets.conformance.mjs';

assetConformance(test, async (vars = {}) => {
  const { url, close } = await startDevRelay({ MM_RELAY_OPEN: '1', ...(vars.assetRoomBytes ? { MM_RELAY_ASSET_BYTES: String(vars.assetRoomBytes) } : {}) });
  return { url, close };
});

// ----- Rooms anyone opens, and names a hand claims: the Node relay and the Worker alike -----
import { startRelay } from '../../Demos/relay.mjs';
import { HAND_HEADER, CLAIM_WORDS } from '../../Demos/relay-protocol.mjs';

/** Both relays, each on a free port, no keys asked: { name, url, close }. */
const bothRelays = async () => {
  const node = await startRelay(0, {});
  const dev = await startDevRelay({ MM_RELAY_OPEN: '1' });
  return [
    { name: 'the Node relay', url: `http://127.0.0.1:${node.address().port}`, close: () => new Promise((r) => { node.closeAllConnections?.(); node.close(() => r()); }) },
    { name: 'the Worker', url: dev.url, close: dev.close },
  ];
};

test('both relays open a room for whoever asks — an `r-` name, no key where none is kept — and take a line under a claimed name only from its claimer', async () => {
  for (const relay of await bothRelays()) {
    try {
      const res = await fetch(relay.url + '/rooms', { method: 'POST', headers: { origin: 'http://127.0.0.1:9' } });
      assert.equal(res.status, 201, relay.name);
      assert.equal(res.headers.get('cache-control'), 'no-store', relay.name);
      const { room, key } = await res.json();
      assert.match(room, /^r-[A-Za-z0-9_-]{22}$/, relay.name);
      assert.equal(key, null, relay.name);
      const line = (body, secret) => fetch(`${relay.url}/rooms/${room}/events`, { method: 'POST', headers: { 'content-type': 'application/json', ...(secret ? { [HAND_HEADER]: secret } : {}) }, body: JSON.stringify(body) });
      assert.equal((await line({ participant: 'ada~1', events: [{ type: 'mine' }], at: 1 }, 'ada-secret-000000001')).status, 204, relay.name);
      const forged = await line({ participant: 'ada~1', events: [], at: 9e12, full: true }, 'eve-secret-000000002');
      assert.equal(forged.status, 409, relay.name);
      assert.equal(await forged.text(), CLAIM_WORDS.taken, relay.name);
      assert.equal((await line({ participant: 'ada~1', events: [], at: 9e12, full: true })).status, 409, relay.name + ': no secret');
      assert.equal((await line({ participant: 'ada~1', events: [{ type: 'mine' }], at: 2, full: true, via: 'eve~1' }, 'eve-secret-000000002')).status, 204, relay.name + ': a copy handed on');
      assert.equal((await line({ participant: 'old~1', events: [] })).status, 204, relay.name + ': a hand from before claims');
      // A browser may send the secret: the preflight says so.
      const pre = await fetch(`${relay.url}/rooms/${room}/events`, { method: 'OPTIONS', headers: { origin: 'http://127.0.0.1:9', 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type, ' + HAND_HEADER } });
      assert.match(pre.headers.get('access-control-allow-headers') || '', new RegExp(HAND_HEADER), relay.name);
    } finally { await relay.close(); }
  }
});

test('over both relays, live-node\'s hands claim their names, a forged whole log in a hand\'s name is refused, and its marks stand on every board', async () => {
  for (const relay of await bothRelays()) {
    const stores = [];
    try {
      const { room } = await (await fetch(relay.url + '/rooms', { method: 'POST' })).json();
      const ada = MM.createSession({ ...MM.DEFAULT_SESSION_CONFIG, logName: 'ada~1' });
      const a = new MM.LiveStore(relayTransport(relay.url, room), 'ada~1', room);
      const b = new MM.LiveStore(relayTransport(relay.url, room, { hand: 'bob-secret-0000000001' }), 'bob~1', room);
      stores.push(a, b);
      await wait(100);
      for (let i = 0; i < 3; i++) { ada.addStroke(boxAt(i * 80), 1000 + i, undefined, 1); await a.publish(ada.getEvents()); }
      assert.ok(await until(async () => ((await b.readLogs())['ada~1'] || []).length === 3), relay.name + ': bob never held ada\'s three marks');
      // Eve has the room's address (and every sitting id, which every line carries) and a hand of her own.
      const eve = relayTransport(relay.url, room, { hand: 'eve-secret-0000000002' });
      const forged = await eve.send({ participant: 'ada~1', events: [], at: 9e12, full: true, sid: a.sitting });
      assert.deepEqual(forged, { ok: false, status: 409 }, relay.name);
      const viaForged = await eve.send({ participant: 'ada~1', events: [], at: 9e12, full: true, sid: a.sitting, via: 'eve~1' });
      assert.equal(viaForged.ok, true, relay.name + ': a copy under eve\'s own name goes through the relay…');
      await wait(200);
      assert.equal(((await b.readLogs())['ada~1'] || []).length, 3, relay.name + ': …and bob\'s board refused it: ada\'s marks stand');
      assert.ok(b.notices().some((n) => /a copy of ada’s marks that would have taken some away was refused/.test(n)), JSON.stringify(b.notices()));
      // A newcomer joining after holds all three too.
      const c = new MM.LiveStore(relayTransport(relay.url, room), 'cleo~1', room);
      stores.push(c);
      c.hello();
      assert.ok(await until(async () => ((await c.readLogs())['ada~1'] || []).length === 3), relay.name + ': the newcomer did not hold ada\'s marks');
      eve.close();
    } finally { for (const s of stores) s.close(); await relay.close(); }
  }
});

test('the Worker with a secret: a room opened by POST /rooms is reached with the key it gave, and that key opens no other room', async () => {
  const secret = 'parity-mint-secret';
  const { url, close } = await startDevRelay({ MM_RELAY_SECRET: secret });
  try {
    const { room, key } = await (await fetch(url + '/rooms', { method: 'POST' })).json();
    assert.equal(key, await keyForRoom(secret, room));
    assert.equal((await checkRelay(url, room, { key })).ok, true);
    assert.equal((await checkRelay(url, 'claude', { key })).status, 403);
    const { room: other } = await (await fetch(url + '/rooms', { method: 'POST' })).json();
    assert.equal((await checkRelay(url, other, { key })).status, 403);
  } finally { await close(); }
});

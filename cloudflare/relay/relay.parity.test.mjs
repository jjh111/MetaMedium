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

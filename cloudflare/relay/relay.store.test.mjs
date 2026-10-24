// What the relay keeps, counted in what it costs (src/store.mjs): an item's UTF-8 bytes and the storage rows it is kept
// in, against what one caller — its address, and an IPv6 address's /56 — may keep a day, what the rooms the relay opened
// keep a day, and what they hold at once. Each test is one way a cheap actor tried to make the relay store or write
// more than its share, or to fill a ceiling every room shares with little real data (the probes the storage skeptic
// ran), held to what the accounting now says.
//
//   node --test cloudflare/relay/relay.store.test.mjs

import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import worker from './src/worker.mjs';
import { fakeEnv, fakeAI } from './test/fake.mjs';
import { costOf, heldOf, utf8Length, ROW_COST, STORE_GRANT, MINTED_QUANTUM, storePerDayFrom, mintedPerDayFrom } from './src/store.mjs';
import { callerBuckets, NET56_TIMES } from './src/http.mjs';
import { hit } from './src/limits.mjs';
import { pngOf, sha } from '../../Demos/relay-assets.conformance.mjs';

const ORIGIN = 'https://relay.test';
const APP = 'https://dyna.ink';
const DAY = 86_400_000;
const openEnv = (vars = {}) => fakeEnv({ MM_RELAY_OPEN: '1', ...vars });

const mint = async (env, ip) => {
  const res = await worker.fetch(new Request(`${ORIGIN}/rooms`, { method: 'POST', headers: { origin: APP, 'cf-connecting-ip': ip } }), env);
  return res.status === 201 ? (await res.json()).room : (res.text().then((t) => assert.fail(res.status + ' ' + t)));
};
const post = (env, room, line, { ip = '203.0.113.7', hand } = {}) => worker.fetch(new Request(`${ORIGIN}/rooms/${room}/events`, {
  method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip, ...(hand ? { 'x-dyna-hand': hand } : {}) }, body: typeof line === 'string' ? line : JSON.stringify(line),
}), env);
const put = (env, room, bytes, { ip = '203.0.113.7' } = {}) => worker.fetch(new Request(`${ORIGIN}/rooms/${room}/assets/${sha(bytes)}`, { method: 'PUT', headers: { 'cf-connecting-ip': ip }, body: bytes }), env);
/** What the Limits object's `store` scope counted today under `key` (an address is `ip:<callerKey>`). */
const stored = (env, key) => Number(env.LIMITS.storages.get('store')?.map.get(`${DAY}:${Math.floor(Date.now() / DAY)}:${key}`)) || 0;
const gauge = (env) => Number(env.LIMITS.storages.get('minted')?.map.get('held:rooms')) || 0;

/** A clock the test moves by hand: the floodgates, the days and the windows all read Date.now(). */
function clock(at = Date.UTC(2026, 9, 24, 0, 0, 5)) {
  let now = at;
  mock.method(Date, 'now', () => now);
  return { advance: (ms) => { now += ms; } };
}

/** The rows written in every room's storage, counted as each storage appears (a put of n keys is n rows; a delete of n, n). */
function rowsOf(env) {
  const rows = { put: 0, del: 0 };
  const seen = new WeakSet();
  const wrap = (s) => {
    if (seen.has(s)) return;
    seen.add(s);
    const p = s.put.bind(s), d = s.delete.bind(s);
    s.put = async (k, v) => { rows.put += typeof k === 'string' ? 1 : Object.keys(k).length; return p(k, v); };
    s.delete = async (k) => { rows.del += Array.isArray(k) ? k.length : 1; return d(k); };
  };
  const set = env.ROOMS.storages.set.bind(env.ROOMS.storages);
  env.ROOMS.storages.set = (k, v) => { wrap(v); return set(k, v); };
  for (const s of env.ROOMS.storages.values()) wrap(s);
  return rows;
}

/** A PNG made unique by `i`: a real one, so the protocol takes it. */
const tinyPng = (i) => pngOf(1, [i & 255, (i >> 8) & 255, (i >> 16) & 255, 255]);

// ----- The minted rooms' gauge: reserved in quanta, paid for ------------------------------------------------------

test('N rooms the relay opened, one line each, hold about N quanta of the gauge — never the room cap — and cost their opener at least as much of its day', async () => {
  const env = openEnv({ MM_RELAY_MINT_PER_HOUR: '1000', MM_RELAY_MINT_PER_DAY: '100000', MM_RELAY_STORE_PER_DAY: String(256 * 1024 * 1024) });
  const ip = '203.0.113.20';
  const N = 512;
  for (let i = 0; i < N; i++) {
    const room = await mint(env, ip);
    assert.equal((await post(env, room, { participant: 'x~' + i, events: [{ type: 's' }] }, { ip })).status, 204);
    const r = env.ROOMS.rooms.get(room);
    assert.equal(r.reserved, MINTED_QUANTUM, 'one quantum for a room of one line');
    assert.ok(r.reserved - r.held() < MINTED_QUANTUM);
  }
  assert.equal(gauge(env), N * MINTED_QUANTUM, '512 rooms hold 32 MiB of the gauge');
  assert.ok(stored(env, 'ip:' + ip) >= N * MINTED_QUANTUM, 'and their opener paid at least that much of its day: ' + stored(env, 'ip:' + ip));
  // Someone else still opens a room and keeps what they write.
  const room = await mint(env, '198.51.100.9');
  assert.equal((await post(env, room, { participant: 'ann~1', events: [{ type: 'stroke' }] }, { ip: '198.51.100.9' })).status, 204);
});

test('a room\'s reservation never runs more than a quantum ahead of what it holds: a room that lets lines go gives the rest back', async () => {
  const env = openEnv({ MM_RELAY_MAX_BYTES: '300000', MM_RELAY_STORE_PER_DAY: String(256 * 1024 * 1024) });
  const room = await mint(env, '203.0.113.21');
  const pad = 'a'.repeat(50_000);
  for (let i = 0; i < 5; i++) assert.equal((await post(env, room, { participant: 'ann~1', events: [{ pad }], at: i }, { ip: '203.0.113.21' })).status, 204);
  const r = env.ROOMS.rooms.get(room);
  const before = r.reserved;
  assert.ok(before >= r.held() && before - r.held() < MINTED_QUANTUM, before + ' for ' + r.held());
  // A whole log past the caps: what replay would never send goes, and with it what the room reserved for it.
  assert.equal((await post(env, room, { participant: 'ann~1', events: [{ pad: 'b'.repeat(60_000) }], at: 9, full: true }, { ip: '203.0.113.21' })).status, 204);
  assert.ok(r.held() < before / 3, 'the appends were let go of');
  assert.ok(r.reserved >= r.held() && r.reserved - r.held() <= MINTED_QUANTUM, r.reserved + ' for ' + r.held());
  assert.equal(gauge(env), r.reserved, 'what went back was taken by the gauge');
  assert.equal(env.ROOMS.storages.get(room).map.get('meta').reserved, r.reserved, 'and written down before it was');
});

// ----- What a row costs ------------------------------------------------------------------------------------------

test('a picture is charged its rows, as a line is: tiny pictures and tiny lines keep about as many a day, three rows each', async () => {
  const day = 1024 * 1024;
  const count = async (send) => {
    const env = openEnv({ MM_RELAY_STORE_PER_DAY: String(day) });
    const rows = rowsOf(env);
    let kept = 0;
    for (let i = 0; i < 400; i++) {
      const res = await send(env, i);
      if (res.status === 204) kept++;
      else { assert.equal(res.status, 429); assert.match(await res.text(), /this address has kept as much on this relay as a day allows/); break; }
    }
    return { kept, rows: rows.put + rows.del };
  };
  const pictures = await count((env, i) => put(env, 'r', tinyPng(i)));
  const lines = await count((env, i) => post(env, 'r', { participant: 'p~' + (i % 20), events: [{ i }] }));
  const one = costOf(tinyPng(0).length, 3);
  assert.ok(one >= 3 * ROW_COST);
  assert.ok(pictures.kept <= Math.floor(day / one) && pictures.kept >= Math.floor(day / one) - Math.ceil(day / STORE_GRANT), JSON.stringify(pictures));
  assert.equal(pictures.rows, 3 * pictures.kept, 'a picture writes its piece, its record and the meta row');
  assert.ok(Math.abs(lines.kept - pictures.kept) <= Math.ceil(day / STORE_GRANT), JSON.stringify({ lines, pictures }));
  assert.equal(lines.rows, 3 * lines.kept, 'a line writes its piece, its record and the meta row');
});

test('a room keeps at most 1,000 pictures, whatever their size, and says so', async () => {
  const env = openEnv();
  const storage = (await import('./test/fake.mjs')).fakeStorage();
  for (let i = 0; i < 1000; i++) { const h = String(i).padStart(64, '0'); storage.map.set('a:' + h, { hash: h, size: 24, mime: 'image/png', n: 1 }); }
  const { Room } = await import('./src/worker.mjs');
  const room = new Room({ storage, blockConcurrencyWhile: (f) => f() }, env);
  const bytes = tinyPng(7);
  const res = await room.fetch(new Request(`${ORIGIN}/rooms/r/assets/${sha(bytes)}`, { method: 'PUT', body: bytes }));
  assert.equal(res.status, 507);
  assert.match(await res.text(), /^this room holds as many pictures as it keeps \(1,000\) — nothing was added/);
});

test('a line is counted in UTF-8 bytes, as the storage keeps it: a line of CJK costs three times its characters, and a room is bounded in bytes', async () => {
  const env = openEnv({ MM_RELAY_MAX_BYTES: '500000' });
  const line = JSON.stringify({ participant: 'mei~1', events: [{ t: '漢'.repeat(100_000) }], at: 1 });
  assert.equal(utf8Length(line), Buffer.byteLength(line));
  assert.ok(utf8Length(line) > 2.9 * line.length);
  assert.equal(utf8Length('a\u{1F600}\uD800z'), Buffer.byteLength('a\u{1F600}\uD800z'), 'a pair four, a lone surrogate three');
  assert.equal((await post(env, 'r', line)).status, 204);
  const room = env.ROOMS.rooms.get('r');
  assert.equal(room.bytes, Buffer.byteLength(line));
  assert.ok(stored(env, 'ip:203.0.113.7') >= costOf(Buffer.byteLength(line), 3), 'charged its bytes and its rows');
  // Two such lines are 600 KB, past the room's 500 KB: the first goes, though in characters both would fit.
  assert.equal((await post(env, 'r', JSON.stringify({ participant: 'mei~1', events: [{ t: '字'.repeat(100_000) }], at: 2 }))).status, 204);
  assert.equal(room.lines.length, 1);
  assert.ok(room.bytes <= 500_000);
});

// ----- Grants: drawn small, kept with the room ------------------------------------------------------------------

test('what a room drew of a day and has not used outlives its eviction: the next line draws nothing new', async () => {
  const env = openEnv();
  const room = await mint(env, '203.0.113.30');
  assert.equal((await post(env, room, { participant: 'a~1', events: [{ n: 1 }] }, { ip: '203.0.113.30' })).status, 204);
  const mine = stored(env, 'ip:203.0.113.30'), all = stored(env, 'minted:day');
  assert.ok(mine > 0 && all > 0);
  env.ROOMS.evict(room);
  assert.equal((await post(env, room, { participant: 'a~1', events: [{ n: 2 }] }, { ip: '203.0.113.30' })).status, 204);
  assert.equal(stored(env, 'ip:203.0.113.30'), mine, 'no new grant for the caller');
  assert.equal(stored(env, 'minted:day'), all, 'none from the rooms\' day either');
  assert.ok(env.ROOMS.storages.get(room).map.get('meta').grants.left['ip:203.0.113.30'] > 0, 'kept in the room\'s meta row');
});

test('2,048 tiny lines from 8 addresses, the rooms evicted between lines, spend of the rooms\' day what they cost — never shutting it for anyone else', async (t) => {
  const c = clock();
  t.after(() => mock.restoreAll());
  const env = openEnv();
  const person = await mint(env, '192.0.2.50');
  const hands = [];
  for (let i = 1; i <= 8; i++) hands.push({ ip: '198.18.0.' + i, room: await mint(env, '198.18.0.' + i) });
  let kept = 0, cost = 0;
  for (let k = 0; k < 256; k++) {
    for (const h of hands) {
      const line = JSON.stringify({ participant: 'x~' + h.ip, events: [{ type: 's', k }] });
      if ((await post(env, h.room, line, { ip: h.ip })).status === 204) { kept++; cost += costOf(Buffer.byteLength(line), 3); }
      env.ROOMS.evict(h.room);
    }
    c.advance(150_000);
  }
  assert.equal(kept, 2048);
  // What the day was drawn for is what was kept, and a grant a room at most besides.
  assert.ok(stored(env, 'minted:day') <= cost + 8 * STORE_GRANT, stored(env, 'minted:day') + ' for ' + cost);
  assert.ok(stored(env, 'minted:day') < mintedPerDayFrom(env) / 64);
  assert.equal((await post(env, person, { participant: 'ann~1', events: [{ type: 'stroke' }] }, { ip: '192.0.2.50' })).status, 204);
});

// ----- A /56 is a few callers, not 256 ---------------------------------------------------------------------------

test('callerBuckets: an IPv4 address alone; an IPv6 address by its /64 and by the /56 that holds it, at four times the allowance', () => {
  assert.deepEqual(callerBuckets('203.0.113.7'), [{ key: '203.0.113.7', times: 1 }]);
  assert.deepEqual(callerBuckets('2001:db8:aa:1f::1'), [{ key: '2001:db8:aa:1f::/64', times: 1 }, { key: '2001:db8:aa:0::/56', times: NET56_TIMES }]);
  assert.deepEqual(callerBuckets('2001:db8:aa:ff3:1:2:3:4'), [{ key: '2001:db8:aa:ff3::/64', times: 1 }, { key: '2001:db8:aa:f00::/56', times: NET56_TIMES }]);
  assert.deepEqual(callerBuckets('::ffff:192.0.2.1'), [{ key: '192.0.2.1', times: 1 }]);
  assert.equal(NET56_TIMES, 4);
});

test('256 /64s of one /56 hold to the /56\'s allowance: what one home keeps a day is four addresses\' worth, not 256', async () => {
  const perDay = 256 * 1024;
  const env = openEnv({ MM_RELAY_STORE_PER_DAY: String(perDay) });
  const pad = 'p'.repeat(50_000);
  let kept = 0, first = null;
  for (let a = 0; a < 256; a++) {
    const res = await post(env, 'r', { participant: 'h~' + a, events: [{ pad }] }, { ip: `2001:db8:aa:${a.toString(16)}::1` });
    if (res.status === 204) kept++;
    else if (!first) { first = a; assert.equal(res.status, 429); assert.match(await res.text(), /this address has kept as much on this relay as a day allows/); }
  }
  // Each /64 draws a grant at least, so the /56's day of four allowances is a few dozen lines at most.
  assert.ok(kept <= Math.ceil((NET56_TIMES * perDay) / costOf(50_000, 3)), 'kept ' + kept);
  assert.ok(stored(env, 'ip:2001:db8:aa:0::/56') <= NET56_TIMES * perDay);
  assert.ok(first !== null && first < 32, 'refused from the ' + first + 'th /64 on');
  // Another home keeps on.
  assert.equal((await post(env, 'r', { participant: 'z~1', events: [{ pad }] }, { ip: '2001:db8:bb:1::1' })).status, 204);
});

test('rooms opened from one /56 stop at four addresses\' hour, and one address opens a twentieth of the relay\'s day', async (t) => {
  const c = clock();
  t.after(() => mock.restoreAll());
  const env = fakeEnv({ MM_RELAY_SECRET: 'store-secret' });
  const open = async (ip) => (await worker.fetch(new Request(`${ORIGIN}/rooms`, { method: 'POST', headers: { origin: APP, 'cf-connecting-ip': ip } }), env));
  let ok = 0;
  for (let a = 0; a < 51; a++) for (let i = 0; i < 10; i++) if ((await open(`2001:db8:aa:${a.toString(16)}::${i + 1}`)).status === 201) ok++;
  assert.equal(ok, 40, 'one home, forty rooms an hour');
  assert.equal((await open('198.51.100.9')).status, 201, 'and the relay opens rooms for everyone else');
  // An IPv4 address, hour after hour: its share of the day is 500 / 20.
  let mine = 0, said = '';
  for (let h = 0; h < 6; h++) {
    for (let i = 0; i < 10; i++) { const res = await open('203.0.113.40'); if (res.status === 201) mine++; else said = await res.text(); }
    c.advance(3_600_000);
  }
  assert.equal(mine, 25);
  assert.match(said, /^this address has opened as many rooms as it may today — try again in/);
  // A refused room writes no count: the address's day stands where it was.
  const counts = [...env.LIMITS.storages.get('mint').map.entries()].filter(([k]) => k.endsWith('day:ip:203.0.113.40'));
  assert.deepEqual(counts.map(([, v]) => v), [25]);
});

// ----- A beat, and what nothing counted -----------------------------------------------------------------------

test('a beat that claims a name keeps nothing: no row in the room, nothing in the Limits object', async () => {
  const env = openEnv();
  const room = await mint(env, '203.0.113.50');
  const rows = rowsOf(env);
  const limits = JSON.stringify([...env.LIMITS.storages].map(([k, s]) => [k, [...s.map]]));
  for (let i = 0; i < 30; i++) assert.equal((await post(env, room, { participant: 'n~' + i + 'x'.repeat(150), events: [], at: i }, { ip: '203.0.113.50', hand: ('beat-secret-' + i).padEnd(22, 'q') })).status, 204);
  assert.deepEqual(rows, { put: 0, del: 0 });
  assert.equal(JSON.stringify([...env.LIMITS.storages].map(([k, s]) => [k, [...s.map]])), limits);
  assert.equal(env.ROOMS.storages.get(room)?.map.size || 0, 0);
});

test('junk to /decide and /ai writes no Limits row and asks no model; a request let through writes one a count', async (t) => {
  clock();
  t.after(() => mock.restoreAll());
  const env = fakeEnv({ MM_RELAY_SECRET: 'store-secret' });
  env.AI = fakeAI();
  const ask = (path, body, ip = '203.0.113.60') => worker.fetch(new Request('https://relay.dyna.ink' + path, { method: 'POST', headers: { 'cf-connecting-ip': ip, origin: APP, 'content-type': 'application/json' }, body }), env);
  const statuses = {};
  for (let i = 0; i < 40; i++) for (const path of ['/decide', '/extract', '/ai/v1/chat/completions']) { const r = await ask(path, 'x'); statuses[path + ' ' + r.status] = (statuses[path + ' ' + r.status] || 0) + 1; }
  const rows = [...env.LIMITS.storages.values()].reduce((n, s) => n + s.map.size + s.writes.puts + s.writes.deletes, 0);
  assert.equal(rows, 0, 'nothing was counted where it lasts: ' + JSON.stringify(statuses));
  assert.equal(env.AI.calls.length, 0);
  // Past the minute, in memory: refused in words, and still nothing written.
  assert.ok(statuses['/decide 429'] > 0 && statuses['/ai/v1/chat/completions 429'] > 0, JSON.stringify(statuses));
  // A request a model answers writes its minute, its address's share and the day's budget — once each.
  const MM = await import('../../Demos/dynaink-core.node.mjs');
  const body = JSON.stringify(MM.buildSystemOne([MM.choice('w', 'which?', [{ id: 'molecule', text: 'm' }, { id: 'compound', text: 'c' }])], { text: 'three circles' }, { model: 'clef-flash' }).body);
  const quiet = mock.method(console, 'log', () => {});
  assert.equal((await ask('/decide', body, '198.51.100.61')).status, 200);
  quiet.mock.restore();
  assert.equal(env.LIMITS.storages.get('ai').map.size, 3);
});

test('the Limits object takes several counts all or none: one with no room writes none of them', async () => {
  const env = fakeEnv();
  const counts = (n) => [{ key: 'a', limit: 5, windowMs: DAY, cost: n }, { key: 'b', limit: 2, windowMs: DAY, cost: n }];
  assert.equal((await hit(env, 'x', counts(2))).ok, true);
  const no = await hit(env, 'x', counts(1));
  assert.equal(no.ok, false);
  assert.equal(no.refused, 1);
  assert.ok(no.retryAfter >= 1);
  const held = [...env.LIMITS.storages.get('x').map.entries()].filter(([k]) => !k.startsWith('held:')).map(([k, v]) => [k.split(':').pop(), v]);
  assert.deepEqual(held.sort(), [['a', 2], ['b', 2]], 'a was not counted when b refused');
});

// ----- A room forgotten gives back what it reserved, once ----------------------------------------------------

test('the gauge is given back exactly once — across a deleteAll that fails, an eviction, a give-back the gauge cannot take and an alarm run twice — and the room refuses lines in words while it is let go of', async () => {
  const env = openEnv();
  const a = await mint(env, '192.0.2.1'), b = await mint(env, '192.0.2.2');
  assert.equal((await post(env, a, { participant: 'a~1', events: [{ type: 's' }] }, { ip: '192.0.2.1' })).status, 204);
  assert.equal((await post(env, b, { participant: 'b~1', events: [{ type: 's' }] }, { ip: '192.0.2.2' })).status, 204);
  assert.equal(gauge(env), 2 * MINTED_QUANTUM);
  // a's deleteAll fails once: nothing was given back, and what it owes is written down.
  const st = env.ROOMS.storages.get(a);
  const deleteAll = st.deleteAll.bind(st);
  st.deleteAll = async () => { st.deleteAll = deleteAll; throw new Error('storage operation failed (once)'); };
  await assert.rejects(() => env.ROOMS.rooms.get(a).alarm(), /once/);
  assert.equal(gauge(env), 2 * MINTED_QUANTUM);
  assert.equal(st.map.get('forget'), MINTED_QUANTUM);
  assert.equal(st.map.get('meta').reserved, 0);
  // While it is being let go of, a line is refused in words — on the same object, and on a fresh one after an eviction.
  const busy = await post(env, a, { participant: 'a~1', events: [{ type: 't' }] }, { ip: '192.0.2.1' });
  assert.equal(busy.status, 503);
  assert.match(await busy.text(), /^this room is being let go of just now/);
  env.ROOMS.evict(a);
  assert.equal((await post(env, a, { participant: 'a~1', events: [{ type: 't' }] }, { ip: '192.0.2.1' })).status, 503);
  assert.ok(st.alarm, 'an alarm stands to finish it');
  // The alarm again, on the fresh object: given back once.
  await env.ROOMS.rooms.get(a).alarm();
  assert.equal(gauge(env), MINTED_QUANTUM, 'b\'s quantum is all the gauge holds');
  // And again: nothing more.
  await env.ROOMS.rooms.get(a).alarm();
  assert.equal(gauge(env), MINTED_QUANTUM);
  assert.equal(st.map.size, 0);
  // b's give-back is not taken once: written down again, and given back by the next alarm — once.
  const limits = env.LIMITS;
  const realGet = limits.get.bind(limits);
  let failOnce = true;
  limits.get = (id) => { const stub = realGet(id); return { fetch: async (req) => { const ask = await req.clone().json(); if (failOnce && ask.op === 'hold' && ask.delta < 0) { failOnce = false; throw new Error('the gauge is away'); } return stub.fetch(req); } }; };
  await assert.rejects(() => env.ROOMS.rooms.get(b).alarm(), /away/);
  assert.equal(gauge(env), MINTED_QUANTUM);
  assert.equal(env.ROOMS.storages.get(b).map.get('forget'), MINTED_QUANTUM);
  await env.ROOMS.rooms.get(b).alarm();
  await env.ROOMS.rooms.get(b).alarm();
  assert.equal(gauge(env), 0);
  // A forgotten room is a fresh one: it takes lines again.
  assert.equal((await post(env, a, { participant: 'c~1', events: [{ type: 'u' }] }, { ip: '192.0.2.3' })).status, 204);
});

test('the defaults say what they count: one address may keep a thirty-second of the rooms\' day, a /56 an eighth', () => {
  assert.equal(storePerDayFrom({}), mintedPerDayFrom({}) / 32);
  assert.equal(storePerDayFrom({}) / ROW_COST, 16384, 'rows a day from one address');
  assert.equal(storePerDayFrom({ MM_RELAY_MINTED_PER_DAY: String(256 * 1024 * 1024) }), 8 * 1024 * 1024, 'follows the rooms\' day');
  assert.equal(storePerDayFrom({ MM_RELAY_STORE_PER_DAY: '1000' }), 1000);
  assert.equal(heldOf(24, 2), 24 + 512);
});

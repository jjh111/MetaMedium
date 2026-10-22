// The limits the routes beside the rooms count against (src/limits.mjs), and the routing that
// puts those routes beside the rooms without touching them.
//
//   node --test cloudflare/relay/relay.limits.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from './src/worker.mjs';
import { hit } from './src/limits.mjs';
import { fakeEnv } from './test/fake.mjs';

const MINUTE = 60_000;

test('a limit counts in its window and refuses past it, with when to ask again', async () => {
  const env = fakeEnv();
  for (let i = 0; i < 3; i++) assert.equal((await hit(env, 'mint', 'ip:1', { limit: 3, windowMs: MINUTE })).ok, true);
  const no = await hit(env, 'mint', 'ip:1', { limit: 3, windowMs: MINUTE });
  assert.equal(no.ok, false);
  assert.ok(no.retryAfter >= 1 && no.retryAfter <= 60, `retryAfter ${no.retryAfter}`);
  // Another key, and another scope, count apart.
  assert.equal((await hit(env, 'mint', 'ip:2', { limit: 3, windowMs: MINUTE })).ok, true);
  assert.equal((await hit(env, 'decide', 'ip:1', { limit: 3, windowMs: MINUTE })).ok, true);
});

test('a cost counts as many, and a cost past what is left is refused whole', async () => {
  const env = fakeEnv();
  assert.equal((await hit(env, 'budget', 'day', { limit: 10, windowMs: MINUTE, cost: 7 })).remaining, 3);
  assert.equal((await hit(env, 'budget', 'day', { limit: 10, windowMs: MINUTE, cost: 4 })).ok, false);
  assert.equal((await hit(env, 'budget', 'day', { limit: 10, windowMs: MINUTE, cost: 3 })).remaining, 0);
});

test('the alarm lets go of windows that have ended and keeps the ones that have not', async () => {
  const env = fakeEnv();
  await hit(env, 'mint', 'ip:1', { limit: 5, windowMs: MINUTE });
  const storage = env.LIMITS.storages.get('mint');
  assert.ok(storage.alarm > Date.now(), 'an alarm is set for when the window ends');
  // A window that ended long ago, written as the object writes one.
  storage.map.set(`${MINUTE}:1:ip:old`, 4);
  await env.LIMITS.objectOf('mint').alarm();
  assert.equal(storage.map.has(`${MINUTE}:1:ip:old`), false);
  assert.equal([...storage.map.keys()].length, 1, 'the current window stays');
});

test('with no LIMITS binding, a limited route fails closed', async () => {
  await assert.rejects(() => hit({}, 'mint', 'ip:1', { limit: 1, windowMs: MINUTE }), /no LIMITS binding/);
});

test('the routes beside the rooms answer with CORS, and refuse an origin the rooms refuse', async () => {
  const env = fakeEnv({ MM_RELAY_SECRET: 'routing-secret' });
  for (const path of ['/rooms', '/decide', '/extract', '/ai/chat']) {
    const pre = await worker.fetch(new Request('http://relay' + path, { method: 'OPTIONS', headers: { origin: 'https://dyna.ink' } }), env);
    assert.equal(pre.status, 204, path);
    assert.equal(pre.headers.get('access-control-allow-origin'), 'https://dyna.ink', path);
    const foreign = await worker.fetch(new Request('http://relay' + path, { method: 'POST', headers: { origin: 'https://evil.example' }, body: '{}' }), env);
    assert.equal(foreign.status, 403, path);
    assert.match(await foreign.text(), /origin/);
  }
  // The rooms are where they were.
  const room = await worker.fetch(new Request('http://relay/rooms/claude/events', { headers: { origin: 'https://dyna.ink' } }), env);
  assert.equal(room.status, 401);
  const nothing = await worker.fetch(new Request('http://relay/elsewhere'), env);
  assert.equal(nothing.status, 404);
});

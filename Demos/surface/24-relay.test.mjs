// Where "with Claude" looks for the room's relay, on its own.
//
//   node --test Demos/surface/24-relay.test.mjs
//
// 24-relay.js is the pure half of the Live pane's *with Claude* (PLAN-IPAD-NOTES A2): which relay the pane
// defaults to for the page's own hostname, and which relay the seat accepts besides one on this machine. It
// names nothing outside itself — no DOM, no storage, no session — so it loads here exactly as the browser
// loads it, as source inside a function body. The room's key is not here: it is the page address's `?key=`,
// read where a room is opened, and never a thing this fragment holds or says.
//
// Not part of the built surface — Demos/build-surface.mjs concatenates `/^\d\d-.*\.js$/`, which `.test.mjs`
// does not match.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NAMES = ['CLAUDE_RELAY_LOCAL', 'CLAUDE_RELAY_HOSTED', 'claudeRelayFor', 'ownRelay', 'roomRelayFor', 'onThisMachine', 'relayFromAddress',
  'inviteLink', 'inviteOf', 'roomSearch', 'roomHash', 'withoutKey', 'leaveSearch', 'roomShort', 'CARRY_MAX_CHARS', 'carryVerdict', 'idleWords'];
const file = join(dirname(fileURLToPath(import.meta.url)), '24-relay.js');
const A = (() => {
  if (!existsSync(file)) return {};
  const src = readFileSync(file, 'utf8');
  return new Function(src + '\n  return { ' + NAMES.map((n) => n + ': typeof ' + n + " === 'undefined' ? undefined : " + n).join(', ') + ' };')();
})();

test('on the dyna.ink origin the default is the hosted relay', () => {
  assert.equal(A.CLAUDE_RELAY_HOSTED, 'https://relay.dyna.ink');
  assert.equal(A.claudeRelayFor('dyna.ink'), 'https://relay.dyna.ink');
  assert.equal(A.claudeRelayFor('www.dyna.ink'), 'https://relay.dyna.ink');
  assert.equal(A.claudeRelayFor('app.dyna.ink'), 'https://relay.dyna.ink');
  assert.equal(A.claudeRelayFor('relay.dyna.ink'), 'https://relay.dyna.ink');
});

test('a hostname is judged whole, in any case, with or without the dot a name may end in', () => {
  assert.equal(A.claudeRelayFor('DYNA.INK'), 'https://relay.dyna.ink');
  assert.equal(A.claudeRelayFor('dyna.ink.'), 'https://relay.dyna.ink');
});

test('everywhere else it stays on this machine', () => {
  assert.equal(A.CLAUDE_RELAY_LOCAL, 'http://127.0.0.1:8020');
  for (const host of ['127.0.0.1', 'localhost', '[::1]', 'jjh111.github.io', '192.168.1.20', 'example.com', '']) {
    assert.equal(A.claudeRelayFor(host), 'http://127.0.0.1:8020', host);
  }
});

test('a name that only ends in the same letters, or merely carries it, is not dyna.ink', () => {
  for (const host of ['notdyna.ink', 'evildyna.ink', 'dyna.ink.evil.com', 'dyna.inkling.com', 'xdyna.ink', 'dyna-ink.com']) {
    assert.equal(A.claudeRelayFor(host), 'http://127.0.0.1:8020', host);
  }
});

test('a hostname that is not text is not dyna.ink', () => {
  for (const host of [undefined, null, 42, {}, []]) assert.equal(A.claudeRelayFor(host), 'http://127.0.0.1:8020');
});

test('the seat accepts the product\'s own relay, and only that one beside a relay on this machine', () => {
  assert.equal(A.ownRelay('https://relay.dyna.ink'), true);
  assert.equal(A.ownRelay('https://relay.dyna.ink/'), true);
  assert.equal(A.ownRelay('HTTPS://RELAY.DYNA.INK'), true);
  for (const url of ['http://relay.dyna.ink', 'https://relay.dyna.ink.evil.com', 'https://evil.com/relay.dyna.ink', 'https://dyna.ink', 'https://other.dyna.ink',
    'http://127.0.0.1:8020', 'https://example.com', '', null, undefined, 7]) {
    assert.equal(A.ownRelay(url), false, String(url));
  }
});

test('a relay address with a key in it is never judged own, so the key is never carried into the page\'s own words', () => {
  assert.equal(A.ownRelay('https://relay.dyna.ink/?key=abc'), false);
  assert.equal(A.ownRelay('https://user:pw@relay.dyna.ink'), false);
});

// ----- A room anyone opens and shares (the rooms lane: MU-1, MU-2, MU-11) -----

test('a page shares a board through the hosted relay on dyna.ink, and through the one on this machine everywhere else — the rule *with Claude* follows', () => {
  for (const host of ['dyna.ink', 'www.dyna.ink', 'app.dyna.ink', 'DYNA.INK', 'dyna.ink.']) assert.equal(A.roomRelayFor(host), 'https://relay.dyna.ink', host);
  for (const host of ['127.0.0.1', 'localhost', 'jjh111.github.io', 'notdyna.ink', 'dyna.ink.evil.com', '', undefined]) assert.equal(A.roomRelayFor(host), 'http://127.0.0.1:8020', String(host));
  for (const host of ['dyna.ink', 'jjh111.github.io', 'localhost']) assert.equal(A.claudeRelayFor(host), A.roomRelayFor(host));
});

test('this machine is localhost, 127.x and [::1] — never a name that only starts like one', () => {
  for (const h of ['localhost', 'LOCALHOST', '127.0.0.1', '127.1.2.3', '[::1]', '::1']) assert.equal(A.onThisMachine(h), true, h);
  for (const h of ['localhost.evil.com', '127.0.0.1.evil.com', '10.0.0.1', 'dyna.ink', '', null]) assert.equal(A.onThisMachine(h), false, String(h));
});

test('a relay named in a page\'s address is taken only where it cannot send the page somewhere unasked', () => {
  // A page on this machine takes any relay (development, the gate).
  assert.equal(A.relayFromAddress('127.0.0.1', 'http://127.0.0.1:41234'), 'http://127.0.0.1:41234');
  assert.equal(A.relayFromAddress('localhost', 'https://relay.example.org/'), 'https://relay.example.org');
  // Any page takes a relay on this machine, and the product's own.
  assert.equal(A.relayFromAddress('jjh111.github.io', 'http://127.0.0.1:8020'), 'http://127.0.0.1:8020');
  assert.equal(A.relayFromAddress('dyna.ink', 'https://relay.dyna.ink'), 'https://relay.dyna.ink');
  // A page on dyna.ink does not take a stranger's relay from a link, nor an address with a login, a query or a fragment in it.
  for (const r of ['https://evil.example', 'https://relay.dyna.ink.evil.example', 'https://u:p@relay.dyna.ink', 'https://relay.dyna.ink/?key=x', 'javascript:alert(1)', 'not a url', '', null]) {
    assert.equal(A.relayFromAddress('dyna.ink', r), null, String(r));
  }
});

test('an invite is the app\'s address, the room, a relay only when it is not this address\'s own, and the key after #', () => {
  const key = 'Abc_def-0123456789abcdefghijklmnopqrstuvwxy';
  assert.equal(A.inviteLink({ page: 'https://dyna.ink/app/?board=b-1#x', room: 'r-ABCDEFGHIJKLMNOPQRSTUV', key, relay: 'https://relay.dyna.ink', defaultRelay: 'https://relay.dyna.ink' }),
    'https://dyna.ink/app/?live=r-ABCDEFGHIJKLMNOPQRSTUV#key=' + key);
  assert.equal(A.inviteLink({ page: 'http://127.0.0.1:9000/app/', room: 'r-x', key, relay: 'http://127.0.0.1:41000', defaultRelay: 'http://127.0.0.1:8020' }),
    'http://127.0.0.1:9000/app/?live=r-x&relay=http%3A%2F%2F127.0.0.1%3A41000#key=' + key);
  // A relay that keeps no keys: the link still says it is an invite.
  assert.equal(A.inviteLink({ page: 'http://127.0.0.1:9000/app/', room: 'r-x', key: null, relay: 'http://127.0.0.1:8020', defaultRelay: 'http://127.0.0.1:8020' }), 'http://127.0.0.1:9000/app/?live=r-x#join');
});

test('a page reads its room from its address: the key from the fragment, an old link\'s from the query, and whether it came by an invite', () => {
  const key = 'k'.repeat(43);
  const link = A.inviteLink({ page: 'https://dyna.ink/app/', room: 'r-ABCDEFGHIJKLMNOPQRSTUV', key, relay: 'https://relay.dyna.ink', defaultRelay: 'https://relay.dyna.ink' });
  const u = new URL(link);
  assert.deepEqual(A.inviteOf(u.search, u.hash), { room: 'r-ABCDEFGHIJKLMNOPQRSTUV', relay: '', key, invited: true, keyInQuery: false });
  // The key is in the fragment, so in no part of the address a server is sent.
  assert.ok(!u.search.includes(key) && !(u.origin + u.pathname + u.search).includes(key));
  assert.deepEqual(A.inviteOf('?live=claude&relay=http%3A%2F%2F127.0.0.1%3A8020&key=' + key, ''), { room: 'claude', relay: 'http://127.0.0.1:8020', key, invited: false, keyInQuery: true });
  assert.deepEqual(A.inviteOf('?live=r-x', '#join'), { room: 'r-x', relay: '', key: '', invited: true, keyInQuery: false });
  assert.deepEqual(A.inviteOf('?live=table', ''), { room: 'table', relay: '', key: '', invited: false, keyInQuery: false });
  assert.equal(A.inviteOf('?board=b-1', '#key=' + key), null);
  assert.equal(A.inviteOf('', ''), null);
});

test('a page in a room keeps ?live= and its own parts, never the key in its query, and the key in its fragment — so a reload rejoins', () => {
  assert.equal(A.roomSearch('?nosw=1&board=b-1&key=SECRET&fresh=1', 'r-x', 'http://127.0.0.1:41000', 'http://127.0.0.1:8020'), '?live=r-x&relay=http%3A%2F%2F127.0.0.1%3A41000&nosw=1');
  assert.equal(A.roomSearch('?live=old&relay=x', 'r-x', 'https://relay.dyna.ink', 'https://relay.dyna.ink'), '?live=r-x');
  assert.equal(A.roomHash('abc'), '#key=abc');
  assert.equal(A.roomHash(null), '');
  // Every other address a page makes carries no key.
  assert.equal(A.withoutKey('#key=SECRET'), '');
  assert.equal(A.withoutKey('#join'), '');
  assert.equal(A.withoutKey('#story-one&key=SECRET'), '#story-one');
  assert.equal(A.withoutKey(''), '');
  // Leaving a room: the board opened last comes back, and nothing of the room is in the address.
  assert.equal(A.leaveSearch('?live=r-x&relay=y&key=SECRET&nosw=1'), '?nosw=1');
  assert.equal(A.leaveSearch('?live=r-x'), '');
});

test('a room\'s name as a person reads it: a room a relay opened by four of its letters, any other as named', () => {
  assert.equal(A.roomShort('r-ABCDEFGHIJKLMNOPQRSTUV'), 'room ABCD');
  assert.equal(A.roomShort('table'), 'table');
  assert.equal(A.roomShort('r-short'), 'r-short');
  assert.equal(A.roomShort('a-very-long-room-name'), 'a-very-long-room-name');
});

test('the board on screen is carried into a room up to 12 MB of its log, and past it the person is told before anything is sent', () => {
  assert.equal(A.CARRY_MAX_CHARS, 12_000_000);
  assert.deepEqual(A.carryVerdict(6_878_721), { ok: true, words: '' });
  assert.deepEqual(A.carryVerdict(13_200_000), { ok: false, words: 'this board is 13.2 MB — a shared room carries boards up to 12 MB' });
});

test('how long a room is kept, in words, from what the relay said', () => {
  assert.equal(A.idleWords(30), 'the room is kept 30 days after it was last used, then forgotten');
  assert.equal(A.idleWords(1), 'the room is kept 1 day after it was last used, then forgotten');
  assert.equal(A.idleWords(null), '');
  assert.equal(A.idleWords(0.0001), 'the room is kept a short while after it was last used, then forgotten');
});

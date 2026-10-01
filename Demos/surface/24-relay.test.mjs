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

const NAMES = ['CLAUDE_RELAY_LOCAL', 'CLAUDE_RELAY_HOSTED', 'claudeRelayFor', 'ownRelay'];
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

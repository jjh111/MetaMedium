// The seats' rules — who reads, who writes, whose key is whose — on their own (V1-PLAN I7).
//
//   node --test Demos/surface/03-seats.test.mjs
//
// 03-seats.js is a fragment of the surface's one closure that names nothing outside itself, so it is
// loaded here as the browser loads it (as source, inside a function body) and asked questions directly,
// as 07-hand.test.mjs asks the hand's rules. What the adapter does with the answers — the pane, the
// joins, the asking — is the gate's `models` scenario (e2e/models.mjs, M13 on).
//
// This file is NOT part of the built surface: Demos/build-surface.mjs concatenates `/^\d\d-.*\.js$/`,
// which `.test.mjs` does not match.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '03-seats.js'), 'utf8');
const S = new Function(
  src + '\n  return { SEATS, SEAT_WORDS, resolveReaders, resolveWriters, fallbackWords, keyId, keysToKeep, migrateStored, orderChoices, seatsOfPick, pickOf, SEMANTIC_SOURCE, SEMANTIC_MAX_BYTES, semanticSourceOf, semanticNameOf, semanticWords, semanticFailed };'
)();

const m = (id, o = {}) => ({ id, vision: false, seats: [], size: Infinity, claude: false, local: false, ...o });

test('four seats, each with a job said in words', () => {
  assert.deepEqual(S.SEATS, ['reader', 'writer', 'decider', 'semantic']);
  for (const s of S.SEATS) assert.ok(S.SEAT_WORDS[s].job.length > 20, s);
});

// ---- who reads ----
test('a reader seat chosen reads, and only it — a model that sees but sits elsewhere is not asked', () => {
  const r = S.resolveReaders([m('a', { vision: true, seats: ['reader'] }), m('b', { vision: true }), m('c', { vision: true, seats: ['writer'] })]);
  assert.deepEqual(r.who, ['a']);
  assert.match(r.why, /reader seat/);
});

test('with no reader chosen: Claude reads while seated, else the writer if it sees, else the smallest model that sees', () => {
  const claude = m('seat', { claude: true, vision: true });
  const w = m('w', { vision: true, seats: ['writer'], size: 70 });
  const small = m('s', { vision: true, size: 0.8 });
  const big = m('b', { vision: true, size: 27 });
  assert.deepEqual(S.resolveReaders([w, small, claude]).who, ['seat'], 'the Claude Code seat stands first while seated (J4)');
  assert.deepEqual(S.resolveReaders([w, small]).who, ['w'], 'the writer, when it sees');
  assert.deepEqual(S.resolveReaders([m('t', { seats: ['writer'] }), small, big]).who, ['s'], 'a writer that cannot see: the smallest that does');
  assert.deepEqual(S.resolveReaders([big, small]).who, ['s'], 'no seats at all: today’s rule, the smallest that sees');
  assert.deepEqual(S.resolveReaders([m('t')]).who, []);
  assert.deepEqual(S.resolveReaders([]).who, []);
});

test('an explicit reader outranks Claude’s seat for reading; a reader that cannot see is no reader', () => {
  const claude = m('seat', { claude: true, vision: true });
  assert.deepEqual(S.resolveReaders([claude, m('r', { vision: true, seats: ['reader'] })]).who, ['r']);
  assert.deepEqual(S.resolveReaders([claude, m('r', { vision: false, seats: ['reader'] })]).who, ['seat']);
});

test('a decider is never a reader, whatever it sees', () => {
  assert.deepEqual(S.resolveReaders([m('d', { vision: true, seats: ['decider'] })]).who, []);
});

// ---- who writes ----
test('a writer seat chosen is asked what is this and every brief, and only it — Claude’s seat first while seated', () => {
  const claude = m('seat', { claude: true });
  assert.deepEqual(S.resolveWriters([m('a', { seats: ['writer'] }), m('b'), m('c', { seats: ['reader'] })]).who, ['a']);
  assert.deepEqual(S.resolveWriters([m('a', { seats: ['writer'] }), claude]).who, ['seat', 'a']);
});

test('with no writer chosen every joined model that has no other seat is asked, as ever — a reader or decider is not', () => {
  const claude = m('seat', { claude: true });
  assert.deepEqual(S.resolveWriters([m('a'), m('b'), m('r', { seats: ['reader'] }), m('d', { seats: ['decider'] }), claude]).who, ['seat', 'a', 'b']);
  assert.deepEqual(S.resolveWriters([]).who, []);
});

test('a model may hold two seats; it is asked for both', () => {
  const both = m('a', { vision: true, seats: ['reader', 'writer'] });
  assert.deepEqual(S.resolveWriters([both, m('b')]).who, ['a']);
  assert.deepEqual(S.resolveReaders([both, m('b', { vision: true })]).who, ['a']);
});

test('the fallback is said in words, for each seat', () => {
  assert.match(S.fallbackWords('reader'), /Claude Code/);
  assert.match(S.fallbackWords('reader'), /writer/);
  assert.match(S.fallbackWords('writer'), /every joined model/);
  assert.match(S.fallbackWords('decider'), /engine’s ranking/);
  assert.match(S.fallbackWords('semantic'), /on this device/);
});

// ---- keys: one a provider ----
test('a key is the provider’s: the address, without a trailing slash or its case', () => {
  assert.equal(S.keyId('https://openrouter.ai/api/v1/'), S.keyId('HTTPS://openrouter.ai/api/v1'));
  assert.notEqual(S.keyId('https://openrouter.ai/api/v1'), S.keyId('https://api.anthropic.com/v1'));
});

test('only the keys the hand asked to remember are kept, and none that were not', () => {
  const held = new Map([[S.keyId('https://openrouter.ai/api/v1'), 'k1'], [S.keyId('https://api.anthropic.com/v1'), 'k2']]);
  const remembered = new Set([S.keyId('https://openrouter.ai/api/v1')]);
  assert.deepEqual(S.keysToKeep(held, remembered), { [S.keyId('https://openrouter.ai/api/v1')]: 'k1' });
  assert.deepEqual(S.keysToKeep(held, new Set()), {});
});

// ---- the old pick and key become the writer seat ----
test('an old remembered pick and key become the writer seat (and the reader if it sees), the key the provider’s; never lost', () => {
  const pick = { provider: 'custom', baseUrl: 'http://x/v1', model: 'm', kind: 'openai-compatible', vision: true, title: 'M' };
  const got = S.migrateStored({ pick, key: 'secret', seats: null, keys: null });
  assert.equal(got.migrated, true);
  assert.deepEqual(got.seats.writer, pick);
  assert.deepEqual(got.seats.reader, pick);
  assert.equal(got.keys[S.keyId('http://x/v1')], 'secret');
  const blind = S.migrateStored({ pick: { ...pick, vision: false }, key: null, seats: null, keys: null });
  assert.equal(blind.seats.reader, undefined);
  assert.deepEqual(blind.keys, {});
});

test('a hand whose seats are already kept is not migrated again, and an empty device has nothing to migrate', () => {
  const seats = { writer: { baseUrl: 'a', model: 'w' } };
  const got = S.migrateStored({ pick: { baseUrl: 'b', model: 'old' }, key: 'k', seats, keys: { a: 'ka' } });
  assert.equal(got.migrated, false);
  assert.deepEqual(got.seats, seats);
  assert.deepEqual(got.keys, { a: 'ka' });
  assert.equal(S.migrateStored({ pick: null, key: null, seats: null, keys: null }).migrated, false);
});

// ---- the pane: local before hosted, quickest first ----
test('choices are ordered local before hosted, then by the last call’s time (quickest first, never-called last), then name', () => {
  const rows = [
    { name: 'z hosted slow', local: false, ms: 4000 },
    { name: 'a hosted fast', local: false, ms: 700 },
    { name: 'm local', local: true, ms: null },
    { name: 'b hosted new', local: false, ms: null },
    { name: 'l local fast', local: true, ms: 300 },
  ];
  assert.deepEqual(S.orderChoices(rows).map((r) => r.name), ['l local fast', 'm local', 'a hosted fast', 'z hosted slow', 'b hosted new']);
});

test('what a seat holds is read back from the pick: which seats a model holds', () => {
  const seats = { reader: { baseUrl: 'u', model: 'a' }, writer: { baseUrl: 'u', model: 'a' }, decider: { baseUrl: 'u', model: 'j' } };
  assert.deepEqual(S.seatsOfPick(seats, { baseUrl: 'u', model: 'a' }), ['reader', 'writer']);
  assert.deepEqual(S.seatsOfPick(seats, { baseUrl: 'u', model: 'j' }), ['decider']);
  assert.deepEqual(S.seatsOfPick(seats, { baseUrl: 'u', model: 'zzz' }), []);
});

test('a pick keeps what the provider said and never a key', () => {
  const p = S.pickOf({ kind: 'openai-compatible', baseUrl: 'u', model: 'm', apiKey: 'SECRET', vision: true, title: 'T' }, { provider: 'openRouter' });
  assert.deepEqual(p, { provider: 'openRouter', baseUrl: 'u', model: 'm', kind: 'openai-compatible', vision: true, title: 'T' });
  assert.ok(!JSON.stringify(p).includes('SECRET'));
});

test('what a join was for is not what is kept of the model', () => {
  const p = S.pickOf({ kind: 'openai-compatible', baseUrl: 'u', model: 'm' }, { provider: 'custom', seat: 'writer', endpoint: undefined });
  assert.deepEqual(p, { provider: 'custom', baseUrl: 'u', model: 'm', kind: 'openai-compatible', vision: false });
});

// ---- the semantic seat (I9): on this device, a model's address, no key ----
test('the semantic seat says in words what it does with nobody in it — and no longer that it is coming', () => {
  assert.doesNotMatch(S.fallbackWords('semantic'), /coming/);
  assert.match(S.fallbackWords('semantic'), /words typed/);
  assert.match(S.SEAT_WORDS.semantic.job, /notes like this/);
});

test('a model is a folder’s address: https, or on this machine — never a key, never another scheme', () => {
  const d = S.semanticSourceOf('');
  assert.equal(d.ok, true);
  assert.equal(d.base, S.SEMANTIC_SOURCE);
  assert.ok(S.SEMANTIC_SOURCE.startsWith('https://') && S.SEMANTIC_SOURCE.endsWith('/'));
  assert.equal(S.semanticSourceOf('  https://example.org/m/potion  ').base, 'https://example.org/m/potion/');
  assert.equal(S.semanticSourceOf('http://127.0.0.1:8123/model').base, 'http://127.0.0.1:8123/model/');
  assert.equal(S.semanticSourceOf('http://localhost:9/m/').ok, true);
  for (const bad of ['http://example.org/m', 'ftp://x/y', 'file:///etc/passwd', 'javascript:alert(1)', 'not a url', 'https://user:pw@example.org/m', 'https://example.org/m?token=abc']) {
    const r = S.semanticSourceOf(bad);
    assert.equal(r.ok, false, bad);
    assert.ok(r.why.length > 20, bad);
  }
});

test('a model is named for its folder: the last two parts before resolve/main', () => {
  assert.equal(S.semanticNameOf('https://huggingface.co/minishlab/potion-base-8M/resolve/main/'), 'potion-base-8M');
  assert.equal(S.semanticNameOf('http://127.0.0.1:8123/model/'), 'model');
  assert.equal(S.semanticNameOf('https://example.org/'), 'example.org');
});

test('the seat row says who holds it, where it runs and what it costs — or what is wrong, in words', () => {
  assert.equal(S.semanticWords(null).who, 'nothing chosen');
  const held = S.semanticWords({ name: 'potion-base-8M', dimension: 256, words: 29528, bytes: 30 * 1048576 });
  assert.match(held.who, /potion-base-8M/);
  assert.match(held.who, /on this device/);
  assert.match(held.who, /256/);
  assert.match(held.who, /30 MB/);
  assert.match(held.who, /no key/);
  assert.ok(S.SEMANTIC_MAX_BYTES >= 32 * 1048576 && S.SEMANTIC_MAX_BYTES <= 64 * 1048576);
});

test('a load that fails says why in the person’s words: the host refused, the file is too big, the bytes are not a model', () => {
  assert.match(S.semanticFailed({ status: 403, what: 'model.safetensors' }), /403/);
  assert.match(S.semanticFailed({ status: 403, what: 'model.safetensors' }), /model\.safetensors/);
  assert.match(S.semanticFailed({ status: 404 }), /no such|not found|404/);
  assert.match(S.semanticFailed({ network: true, what: 'tokenizer.json' }), /reach|network|offline/);
  assert.match(S.semanticFailed({ bytes: 200 * 1048576 }), /too big|more than/);
  assert.match(S.semanticFailed({ reason: 'the weights end before the table does' }), /the weights end before/);
  assert.match(S.semanticFailed({}), /could not/);
});

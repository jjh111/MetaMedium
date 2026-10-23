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
import { AI_CHAT_MODELS, AI_CHAT_WAIT_MS } from '../ai-protocol.mjs';

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '03-seats.js'), 'utf8');
const S = new Function(
  src + '\n  return { SEATS, SEAT_WORDS, resolveReaders, resolveWriters, fallbackWords, keyId, keysToKeep, migrateStored, orderChoices, seatsOfPick, pickOf, SEMANTIC_SOURCE, SEMANTIC_MAX_BYTES, semanticSourceOf, semanticNameOf, semanticWords, semanticFailed, HOUSE_DECIDE, HOUSE_MODELS, HOUSE_DECIDER_MODEL, houseDeciderFor, deciderAtBoot, deciderWords, deciderAsks, HOUSE_AI, HOUSE_SEATS, HOUSE_WAIT_MS, HOUSE_PROBE_MS, houseAiFor, houseAtBoot, houseWords, houseSends, houseWaits, houseLead, houseCannotWords, probesOnOpen };'
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
  assert.match(S.semanticWords({ name: 'tiny', dimension: 64, bytes: 5483 }).who, /5 KB/);
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

// ---- the house decider (the audit's S3): dyna.ink's own, no key ----
test('dyna.ink, its subdomains and the old address ask dyna.ink’s relay; a look-alike, another github.io page and a file ask nothing', () => {
  for (const h of ['dyna.ink', 'app.dyna.ink', 'www.dyna.ink', 'DYNA.INK', 'dyna.ink.', 'jjh111.github.io']) assert.equal(S.houseDeciderFor(h), S.HOUSE_DECIDE, h);
  for (const h of ['notdyna.ink', 'dyna.ink.evil.com', 'evil.github.io', 'github.io', '', undefined, null, 'example.com']) assert.equal(S.houseDeciderFor(h), null, String(h));
  assert.equal(S.HOUSE_DECIDE, 'https://relay.dyna.ink/decide');
});

test('a page on this machine may name a relay on this machine — the origin only — and nothing else; a page elsewhere may name none', () => {
  assert.equal(S.houseDeciderFor('127.0.0.1', 'http://127.0.0.1:5555'), 'http://127.0.0.1:5555/decide');
  assert.equal(S.houseDeciderFor('localhost', 'http://localhost:8787/'), 'http://localhost:8787/decide');
  assert.equal(S.houseDeciderFor('127.0.0.1'), null, 'on this machine with nothing named: none — the gate never reaches a model by default');
  for (const asked of ['https://relay.dyna.ink', 'http://127.0.0.1:5555/decide', 'http://127.0.0.1:5555?key=x', 'http://evil.example:80', 'http://user@127.0.0.1:1', 'http://127.0.0.1:0', 'javascript:alert(1)'])
    assert.equal(S.houseDeciderFor('127.0.0.1', asked), null, asked);
  assert.equal(S.houseDeciderFor('dyna.ink', 'http://127.0.0.1:5555'), S.HOUSE_DECIDE, 'dyna.ink never takes another relay from its address');
  assert.equal(S.houseDeciderFor('example.com', 'http://127.0.0.1:5555'), null);
});

test('at boot: dyna.ink’s own when nothing is kept; a joined decider rejoins; a decider let go stays let go; none where there is no house', () => {
  assert.deepEqual(S.deciderAtBoot(undefined, S.HOUSE_DECIDE), { seat: 'house', model: 'clef-flash', chosen: false });
  assert.deepEqual(S.deciderAtBoot({ provider: 'dyna', model: 'clef-omni' }, S.HOUSE_DECIDE), { seat: 'house', model: 'clef-omni', chosen: true });
  assert.deepEqual(S.deciderAtBoot({ provider: 'dyna', model: 'gpt-9' }, S.HOUSE_DECIDE), { seat: 'house', model: 'clef-flash', chosen: true });
  assert.deepEqual(S.deciderAtBoot({ none: true }, S.HOUSE_DECIDE), { seat: null, why: 'none' });
  assert.deepEqual(S.deciderAtBoot({ baseUrl: 'https://openrouter.ai/api/v1', model: 'typesafe/jev-1.13' }, S.HOUSE_DECIDE), { seat: 'pick' });
  assert.deepEqual(S.deciderAtBoot({ baseUrl: 'https://openrouter.ai/api/v1', model: 'typesafe/jev-1.13' }, null), { seat: 'pick' });
  assert.equal(S.deciderAtBoot(undefined, null).seat, null);
});

test('its row says who, that it needs no key, and how sure it must be — in the person’s words', () => {
  assert.equal(S.deciderWords('clef-flash', 0.99), 'dyna.ink · Clef-flash — no key needed · used only when 99% sure');
  assert.equal(S.deciderWords('clef-omni', 0.99), 'dyna.ink · Clef-omni — no key needed · used only when 99% sure');
  assert.match(S.fallbackWords('decider', { house: true }), /dyna\.ink’s own, with no key, is one tap away/);
  assert.doesNotMatch(S.fallbackWords('decider'), /dyna\.ink/);
  assert.equal(S.HOUSE_MODELS['clef-flash'].sees, false);
  assert.equal(S.HOUSE_MODELS['clef-omni'].sees, true);
});

test('the house decider and a decider let go are kept as choices, never as a key, and never break the old pick’s migration', () => {
  const pick = { baseUrl: 'https://openrouter.ai/api/v1', model: 'z-ai/glm-5.3-flash', vision: true };
  // A device that let the house decider go, and still holds an older device's pick: the pick migrates, the choice stays.
  const m = S.migrateStored({ pick, key: 'k', seats: { decider: { none: true } } });
  assert.equal(m.migrated, true);
  assert.deepEqual(m.seats.decider, { none: true });
  assert.deepEqual(m.seats.writer, pick);
  // A device whose decider is the house's has seats already: nothing migrates.
  assert.equal(S.migrateStored({ pick, seats: { decider: { provider: 'dyna', model: 'clef-flash' } } }).migrated, false);
  // Neither choice is a seat any joined model holds.
  assert.deepEqual(S.seatsOfPick({ decider: { provider: 'dyna', model: 'clef-flash' }, writer: pick }, pick), ['writer']);
  assert.deepEqual(S.seatsOfPick({ decider: { none: true } }, pick), []);
});

test('what a decider is asked and sent, in words: seated silently, a tap alone and the marks’ words; chosen, a brief’s Enter and the brief too — and never “nothing is kept”', () => {
  const silent = S.deciderAsks({ house: true, chosen: false, name: 'Clef-flash' });
  assert.match(silent, /^asked only when you tap Which is it\? or Which diagram is this\?/);
  assert.match(silent, /sent the words of the marks you ask about, to dyna\.ink’s relay, which asks Cloudflare’s Clef-flash/);
  assert.doesNotMatch(silent, /brief you typed/);
  assert.match(silent, /choose it to have it say what a brief should make too/);
  const chosen = S.deciderAsks({ house: true, chosen: true, name: 'Clef-flash' });
  assert.match(chosen, /and on a brief’s Enter, when a model will write it, to say what it should make/);
  assert.match(chosen, /the words of the marks you ask about and the brief you typed/);
  const own = S.deciderAsks({ chosen: true, where: 'OpenRouter' });
  assert.match(own, /the brief you typed, to OpenRouter, with your key$/);
  for (const w of [silent, chosen, own]) assert.doesNotMatch(w, /nothing is kept/);
  assert.match(S.SEAT_WORDS.decider.job, /which of two matching definitions, which kind of diagram, what a brief should make/);
});

// ---- dyna.ink's own writer and reader (the audit's UX-04): no key, and always the last resort ----
const hw = (o = {}) => m('house-writer', { house: true, seats: ['writer'], vision: true, ...o });
const hr = (o = {}) => m('house-reader', { house: true, seats: ['reader'], vision: true, ...o });

test('dyna.ink’s own writer writes only when nothing of the person’s would: a model joined for any job, a writer seat chosen, or Claude Code seated, is asked instead', () => {
  assert.deepEqual(S.resolveWriters([hw(), hr()]).who, ['house-writer']);
  assert.match(S.resolveWriters([hw(), hr()]).why, /dyna\.ink’s own writer/);
  assert.deepEqual(S.resolveWriters([hw(), m('any')]).who, ['any'], 'a model of the person’s, for any job, wins');
  assert.deepEqual(S.resolveWriters([hw(), m('w', { seats: ['writer'] })]).who, ['w'], 'a writer the person chose wins');
  assert.deepEqual(S.resolveWriters([hw(), m('seat', { claude: true })]).who, ['seat'], 'Claude Code seated stands first, and the house is not asked beside it');
  assert.deepEqual(S.resolveWriters([hr()]).who, [], 'the house reader is no writer');
  assert.deepEqual(S.resolveWriters([hw(), m('r', { seats: ['reader'] })]).who, ['house-writer'], 'a model the person keeps only for reading writes nothing, so the house still does');
});

test('dyna.ink’s own reader reads only when nothing of the person’s would: their reader, Claude Code seated, their writer that sees, any model of theirs that sees', () => {
  assert.deepEqual(S.resolveReaders([hw(), hr()]).who, ['house-reader']);
  assert.match(S.resolveReaders([hr()]).why, /dyna\.ink’s own reader/);
  assert.deepEqual(S.resolveReaders([hr(), m('r', { vision: true, seats: ['reader'] })]).who, ['r']);
  assert.deepEqual(S.resolveReaders([hr(), m('seat', { claude: true, vision: true })]).who, ['seat']);
  assert.deepEqual(S.resolveReaders([hr(), m('w', { vision: true, seats: ['writer'] })]).who, ['w']);
  assert.deepEqual(S.resolveReaders([hr(), m('a', { vision: true, size: 9 })]).who, ['a']);
  assert.deepEqual(S.resolveReaders([hr(), m('t', { seats: ['writer'] })]).who, ['house-reader'], 'a writer of theirs that cannot see does not stand in the house’s way');
  assert.deepEqual(S.resolveReaders([hw()]).who, [], 'with the reader let go, nothing of dyna.ink’s reads — its writer is sent no picture, whatever it can see');
  assert.equal(S.resolveReaders([hw()]).why, 'no model that sees');
  assert.deepEqual(S.resolveReaders([hw({ vision: false })]).who, []);
});

test('dyna.ink, its subdomains and the old address ask dyna.ink’s relay for the writer and reader; a page on this machine may name a relay on this machine with ?ai=; elsewhere none', () => {
  assert.equal(S.HOUSE_AI, 'https://relay.dyna.ink/ai/v1');
  for (const h of ['dyna.ink', 'app.dyna.ink', 'jjh111.github.io']) assert.equal(S.houseAiFor(h), S.HOUSE_AI, h);
  for (const h of ['notdyna.ink', 'dyna.ink.evil.com', 'evil.github.io', '', null]) assert.equal(S.houseAiFor(h), null, String(h));
  assert.equal(S.houseAiFor('127.0.0.1', 'http://127.0.0.1:5555'), 'http://127.0.0.1:5555/ai/v1');
  assert.equal(S.houseAiFor('localhost', 'http://localhost:8787/'), 'http://localhost:8787/ai/v1');
  assert.equal(S.houseAiFor('127.0.0.1'), null, 'nothing named on this machine: none — the gate never reaches a model by default');
  for (const asked of ['https://relay.dyna.ink', 'http://127.0.0.1:5555/ai/v1', 'http://127.0.0.1:5555?key=x', 'http://evil.example:80']) assert.equal(S.houseAiFor('127.0.0.1', asked), null, asked);
  assert.equal(S.houseAiFor('dyna.ink', 'http://127.0.0.1:5555'), S.HOUSE_AI, 'dyna.ink never takes another relay from its address');
  // The decider's rule is the same rule.
  assert.equal(S.houseDeciderFor('127.0.0.1', 'http://127.0.0.1:5555'), 'http://127.0.0.1:5555/decide');
});

test('once the house answers, its writer and reader are seated where the person chose nothing — never where they let it go, kept a model for the seat, or (the writer) joined one for any job', () => {
  const pick = { baseUrl: 'https://openrouter.ai/api/v1', model: 'z-ai/glm-5.3-flash' };
  assert.deepEqual(S.houseAtBoot(undefined, 'writer', S.HOUSE_AI), { seat: true, why: 'nothing of yours chosen' });
  assert.equal(S.houseAtBoot({}, 'reader', S.HOUSE_AI).seat, true);
  assert.deepEqual(S.houseAtBoot({ writer: { none: true } }, 'writer', S.HOUSE_AI), { seat: false, why: 'none' });
  assert.equal(S.houseAtBoot({ writer: { none: true } }, 'reader', S.HOUSE_AI).seat, true, 'each seat is let go by itself');
  assert.deepEqual(S.houseAtBoot({ writer: pick }, 'writer', S.HOUSE_AI), { seat: false, why: 'pick' });
  assert.equal(S.houseAtBoot({ any: pick }, 'writer', S.HOUSE_AI).seat, false);
  assert.equal(S.houseAtBoot({ any: pick, writer: pick }, 'reader', S.HOUSE_AI).seat, true, 'a model kept for writing leaves the reader seat to the house — the rules ask theirs first if it sees');
  assert.equal(S.houseAtBoot({ decider: { provider: 'dyna', model: 'clef-flash' } }, 'writer', S.HOUSE_AI).seat, true);
  assert.deepEqual(S.houseAtBoot(undefined, 'writer', null), { seat: false, why: 'no house here' });
});

test('their rows and the pane’s lead say what they are and what is sent where, in the person’s words — no key, and never what Cloudflare keeps', () => {
  assert.equal(S.houseWords('writer'), 'dyna.ink’s writer — no key needed');
  assert.equal(S.houseWords('reader'), 'dyna.ink’s reader — no key needed');
  assert.match(S.houseSends('writer'), /the brief you typed and the words of the marks you ask about, to dyna\.ink’s relay, which asks Cloudflare’s models; dyna\.ink keeps none of it$/);
  assert.match(S.houseSends('reader'), /a picture of the ink you ask it to read/);
  const lead = S.houseLead();
  assert.equal(lead.head, 'Using dyna.ink’s own models — no key needed');
  assert.match(lead.line, /goes to dyna\.ink’s relay, which asks Cloudflare’s models; dyna\.ink keeps none of it\.$/);
  assert.equal(lead.more, 'more — bring your own model');
  assert.match(S.fallbackWords('writer', { house: true }), /dyna\.ink’s own writer writes, with no key/);
  assert.match(S.fallbackWords('reader', { house: true }), /dyna\.ink’s own reader reads, with no key/);
  assert.doesNotMatch(S.fallbackWords('writer'), /dyna\.ink/);
  assert.equal(S.houseWaits('writer'), 'dyna.ink’s writer stands by — asked only when nothing of yours would write');
  assert.equal(S.houseWaits('reader'), 'dyna.ink’s reader stands by — asked only when nothing of yours would read');
  // None of the words a person meets here is a word of the code's.
  for (const w of [S.houseWords('writer'), S.houseSends('writer'), S.houseSends('reader'), S.houseWaits('reader'), lead.head, lead.line, lead.more]) assert.doesNotMatch(w, /\b(seat|tier|session|participant|artifact|log|event)\b|@cf|127\.0\.0\.1|:\d{2,5}\b/i, w);
  assert.equal(S.HOUSE_SEATS.writer.model, 'writer');
  assert.equal(S.HOUSE_SEATS.reader.model, 'reader');
  assert.ok(S.HOUSE_WAIT_MS > AI_CHAT_WAIT_MS, 'the page waits longer than the relay does, so the relay’s sentence is the one heard');
  // The page asks the relay by the short names the relay knows, and calls them what the relay's list calls them.
  assert.deepEqual(Object.values(S.HOUSE_SEATS).map((x) => x.model).sort(), Object.keys(AI_CHAT_MODELS).sort());
  for (const k of Object.keys(AI_CHAT_MODELS)) assert.equal(S.HOUSE_SEATS[k].name, AI_CHAT_MODELS[k].name, k);
  assert.ok(S.HOUSE_PROBE_MS > 0);
});

test('a seat let go of dyna.ink’s own stays let go across an old pick’s migration, unless the pick takes that seat', () => {
  const pick = { baseUrl: 'https://openrouter.ai/api/v1', model: 'z-ai/glm-4.7-flash', vision: false };
  const got = S.migrateStored({ pick, key: null, seats: { reader: { none: true }, writer: { none: true } } });
  assert.equal(got.migrated, true);
  assert.deepEqual(got.seats.writer, pick, 'the pick takes the writer seat');
  assert.deepEqual(got.seats.reader, { none: true }, 'a pick that cannot see leaves the reader let go');
  assert.deepEqual(S.seatsOfPick({ reader: { none: true }, writer: pick }, pick), ['writer']);
});

test('the pane looks for models on this machine as it opens only on a page served from this machine; on a public origin it waits to be asked', () => {
  for (const h of ['localhost', '127.0.0.1', '[::1]', '']) assert.equal(S.probesOnOpen(h), true, h);
  for (const h of ['dyna.ink', 'app.dyna.ink', 'jjh111.github.io', 'example.com', '192.168.1.4']) assert.equal(S.probesOnOpen(h), false, h);
});

test('what dyna.ink’s own could not do just now is said in the relay’s own words, never a status code', () => {
  assert.equal(S.houseCannotWords('HTTP 429 — rate limited: “too many asks of dyna.ink’s writer and reader from here — try again in a minute”'),
    'too many asks of dyna.ink’s writer and reader from here — try again in a minute');
  assert.equal(S.houseCannotWords('HTTP 429 — rate limited'), 'too many asks just now — try again in a minute');
  assert.equal(S.houseCannotWords('HTTP 504 — the provider timed out: “dyna.ink’s writer did not answer in 60 s”'), 'dyna.ink’s writer did not answer in 60 s');
  assert.equal(S.houseCannotWords('timed out — no answer from relay.dyna.ink in 75 s'), 'it took too long to answer — try again');
  assert.equal(S.houseCannotWords('HTTP 503 — no provider is available right now'), 'dyna.ink’s relay is not answering just now — try again soon');
  assert.match(S.houseCannotWords('could not reach relay.dyna.ink — offline, …'), /could not be reached/);
  for (const e of ['HTTP 429 — rate limited', 'HTTP 503 — x', 'timed out — y', 'could not reach z']) assert.doesNotMatch(S.houseCannotWords(e), /HTTP|\d{3}/, e);
});

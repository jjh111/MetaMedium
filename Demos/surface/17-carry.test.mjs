// Carry your boards (RENAME-PLAN N1), on its own.
//
//   node --test Demos/surface/17-carry.test.mjs
//
// 17-carry.js is the pure half of carrying every board a browser keeps from the old address
// (https://jjh111.github.io) to the new home (https://dyna.ink): who may send and who may take (two
// fixed allowlists, never an address read from the URL in production), what is carried (the boards as
// I4's bundles, each board's name, the taught mark's five samples, the preferences by an allowlist of
// names — never a key), what a carry brings in (a new entry each, a name already taken gets a suffix,
// a log already held is said and skipped), the one file every board goes out in, and the sentences.
// Like 17-bundle.js it names nothing outside the fragments it is loaded with — no DOM, no storage, no
// session — so it loads here exactly as the browser loads it (with 17-boards.js and 17-bundle.js, whose
// boardName and zip it uses). 22-carry.js is the adapter: the window, the messages, the pane.
//
// Not part of the built surface — Demos/build-surface.mjs concatenates `/^\d\d-.*\.js$/`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { inflateRawSync, deflateRawSync } from 'node:zlib';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NAMES = [
  'CARRY_OLD_ORIGIN', 'CARRY_HOME_ORIGIN', 'NEW_HOME_NOTICE', 'CARRY_PREFS', 'CARRY_NEVER', 'CARRY_TYPES', 'EVERY_MANIFEST',
  'isLocalOrigin', 'carryTarget', 'carryOpenUrl', 'carrySources', 'carryAccepts', 'carryOffered', 'homeNoticeShown', 'carryMessage',
  'keyShaped', 'carryPrefs', 'takePrefs', 'carryMark', 'carryView', 'carryEmpty', 'carryPlan',
  'everyName', 'everyBuild', 'everyRead', 'carryWhere', 'carryWords', 'carrySentWords',
  // from the fragments it is loaded with
  'bundleBuild', 'bundleRead', 'zipWrite', 'zipRead',
];
const here = dirname(fileURLToPath(import.meta.url));
const files = ['17-boards.js', '17-bundle.js', '17-carry.js'].map((f) => join(here, f));
const C = (() => {
  if (!files.every((f) => existsSync(f))) return {};
  const src = files.map((f) => readFileSync(f, 'utf8')).join('\n');
  return new Function(src + '\n  return { ' + NAMES.map((n) => n + ': typeof ' + n + " === 'undefined' ? undefined : " + n).join(', ') + ' };')();
})();

const enc = (s) => new TextEncoder().encode(s);
const dec = (b) => new TextDecoder().decode(b);
const latin1 = (b) => Buffer.from(b).toString('latin1');
const join8 = (parts) => { const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };
const digest = async (bytes) => createHash('sha256').update(bytes).digest('hex');
const inflate = async (raw) => new Uint8Array(inflateRawSync(Buffer.from(raw)));
const hex = (b) => createHash('sha256').update(b).digest('hex');

const OLD = 'https://jjh111.github.io';
const HOME = 'https://dyna.ink';
const A = 'http://127.0.0.1:8010';
const B = 'http://127.0.0.1:8011';

// Things a browser keeps that must never leave it: planted under every name a key has ever had here.
const PLANTED = {
  'mm-model-key': JSON.stringify('sk-or-v1-PLANTEDmodelkey0123456789abcdefghij'),
  'mm-model-keys': JSON.stringify({ 'https://openrouter.ai/api/v1': 'sk-ant-PLANTEDanthropic0123456789abcdef' }),
  'mm-git-token': JSON.stringify('ghp_PLANTEDgithubtoken0123456789abcdefghij'),
  'mm-model-pick': JSON.stringify({ kind: 'openrouter', model: 'PLANTED-pick' }),
  'mm-seats': JSON.stringify({ writer: { where: 'https://openrouter.ai/api/v1', model: 'PLANTED-seat' } }),
  'mm-semantic': JSON.stringify({ source: 'http://127.0.0.1:9/PLANTED-semantic/' }),
  'mm-participant': 'PLANTED-participant',
  'mm-persist-asked': '1700000000000',
  'mm-log': '[]',
  'mm-command-mark': JSON.stringify({ mark: { name: 'PLANTED-mark' }, samples: [] }),
  'mm-view:b-1': JSON.stringify({ zoom: 1, panX: 0, panY: 0 }),
  'mm-room-key': JSON.stringify('PLANTED-room-key'),
};
const PLANTED_WORDS = ['PLANTED'];
const store = (o) => (k) => (Object.prototype.hasOwnProperty.call(o, k) ? o[k] : null);

// ----- who sends, who takes ------------------------------------------------------------------------------

test('the two addresses are fixed, and the notice that dyna.ink is the new home is off until N4 turns it on', () => {
  assert.equal(C.CARRY_OLD_ORIGIN, OLD);
  assert.equal(C.CARRY_HOME_ORIGIN, HOME);
  assert.equal(C.NEW_HOME_NOTICE, false, 'RENAME-PLAN N4 flips this, and nothing before it');
});

test('a local origin is http on 127.0.0.1 or localhost with a port, the origin and nothing more', () => {
  for (const o of ['http://127.0.0.1:8010', 'http://localhost:3000', 'http://127.0.0.1:1']) assert.equal(C.isLocalOrigin(o), true, o);
  for (const o of ['https://127.0.0.1:8010', 'http://127.0.0.1', 'http://127.0.0.1:8010/', 'http://127.0.0.1:8010/app/', 'http://192.168.1.5:8010',
    'http://127.0.0.1.evil.com:80', 'http://localhost.evil.com:80', 'http://user@127.0.0.1:8010', 'http://127.0.0.1:99999', OLD, HOME, '', null, undefined, 42])
    assert.equal(C.isLocalOrigin(o), false, String(o));
});

test('where a page carries to: the old address to dyna.ink, whatever its address says; a local page to the local origin it names; nothing else', () => {
  assert.equal(C.carryTarget(OLD, null), HOME);
  assert.equal(C.carryTarget(OLD, B), HOME, 'production never takes a target from the address');
  assert.equal(C.carryTarget(OLD, 'https://evil.example'), HOME);
  assert.equal(C.carryTarget(HOME, null), null, 'dyna.ink carries to nowhere: it is the home');
  assert.equal(C.carryTarget(HOME, B), null);
  assert.equal(C.carryTarget(A, B), B, 'a page on this machine may name another on this machine — the gate, and development');
  assert.equal(C.carryTarget('http://localhost:3000', 'http://localhost:3001'), 'http://localhost:3001');
  assert.equal(C.carryTarget(A, A), null, 'never to itself');
  assert.equal(C.carryTarget(A, 'https://evil.example'), null);
  assert.equal(C.carryTarget(A, HOME), null, 'a local page names only a local target');
  assert.equal(C.carryTarget(A, B + '/app/'), null);
  assert.equal(C.carryTarget(A, null), null);
  assert.equal(C.carryTarget('http://192.168.1.5:8010', B), null, 'a page on the local network is not this machine');
  assert.equal(C.carryTarget('https://jjh111.github.io.evil.com', null), null);
  assert.equal(C.carryOpenUrl(OLD, HOME), HOME + '/app/?carry');
  assert.equal(C.carryOpenUrl(A, B), B + '/app/?carry=' + encodeURIComponent(A), 'a local target is told which local origin sends');
});

test('whom a page takes boards from: the old address always; a local origin only when the page itself is local and names it', () => {
  assert.deepEqual(C.carrySources(HOME, null), [OLD]);
  assert.deepEqual(C.carrySources(HOME, A), [OLD], 'production never takes a source from the address');
  assert.deepEqual(C.carrySources(HOME, ''), [OLD]);
  assert.deepEqual(C.carrySources(B, A), [OLD, A]);
  assert.deepEqual(C.carrySources(B, 'https://evil.example'), [OLD]);
  assert.deepEqual(C.carrySources(B, B), [OLD], 'never from itself');
  assert.deepEqual(C.carrySources(OLD, A), [], 'the old address takes from no one');
  assert.deepEqual(C.carrySources('http://192.168.1.5:8010', A), [OLD]);
  const allowed = C.carrySources(B, A);
  assert.equal(C.carryAccepts(allowed, A), true);
  assert.equal(C.carryAccepts(allowed, OLD), true);
  for (const o of ['http://127.0.0.1:8012', OLD + '/', 'http://jjh111.github.io', HOME, 'null', '', null, undefined])
    assert.equal(C.carryAccepts(allowed, o), false, String(o));
});

test('the offer stands where a page can carry and the notice is on, or the address asks for it; the notice only on the old address', () => {
  assert.equal(C.carryOffered({ target: HOME, notice: false, asked: false }), false, 'before N4 the old address shows no offer…');
  assert.equal(C.carryOffered({ target: HOME, notice: false, asked: true }), true, '…unless its address asks (?carryTo), to try it early');
  assert.equal(C.carryOffered({ target: HOME, notice: true, asked: false }), true);
  assert.equal(C.carryOffered({ target: null, notice: true, asked: true }), false, 'no target, no offer — dyna.ink itself');
  assert.equal(C.carryOffered({ target: B, notice: false, asked: true }), true);
  assert.equal(C.homeNoticeShown(OLD, true), true);
  assert.equal(C.homeNoticeShown(OLD, false), false);
  assert.equal(C.homeNoticeShown(HOME, true), false);
  assert.equal(C.homeNoticeShown(A, true), false);
  assert.equal(C.homeNoticeShown(OLD, C.NEW_HOME_NOTICE), false, 'as shipped: off');
});

test('a carry message is read, not trusted: an object of a known type and version, and nothing else', () => {
  const buf = new ArrayBuffer(4);
  assert.deepEqual(C.carryMessage({ type: 'mm-carry', v: 1, file: buf }), { type: 'mm-carry', file: buf });
  assert.deepEqual(C.carryMessage({ type: 'mm-carry-ready', v: 1 }), { type: 'mm-carry-ready' });
  assert.deepEqual(C.carryMessage({ type: 'mm-carry-done', v: 1, brought: 2, held: 1, failed: 0, extra: 'x' }), { type: 'mm-carry-done', brought: 2, held: 1, failed: 0 });
  assert.equal(C.carryMessage({ type: 'mm-carry', v: 2, file: buf }), null, 'a newer protocol is not guessed at');
  assert.equal(C.carryMessage({ type: 'mm-carry', v: 1 }), null, 'boards with no file');
  assert.equal(C.carryMessage({ type: 'mm-carry', v: 1, file: 'AAAA' }), null);
  assert.equal(C.carryMessage({ type: 'something-else', v: 1 }), null);
  assert.equal(C.carryMessage('mm-carry'), null);
  assert.equal(C.carryMessage(null), null);
  assert.equal(C.carryMessage({ type: 'mm-carry-done', v: 1, brought: -1, held: 'x' }).brought, 0);
});

// ----- what is carried: never a key ---------------------------------------------------------------------

test('preferences are gathered by an allowlist of names — every remembered key, token, pick and the room key are left out by name', () => {
  for (const k of C.CARRY_PREFS) assert.ok(/^mm-[a-z][a-zA-Z-]*$/.test(k), 'a named key: ' + k);
  for (const k of C.CARRY_PREFS) assert.ok(!C.CARRY_NEVER.includes(k), k + ' is both carried and never carried');
  for (const k of ['mm-model-key', 'mm-model-keys', 'mm-git-token', 'mm-model-pick', 'mm-seats', 'mm-semantic', 'mm-participant', 'mm-persist-asked', 'mm-log', 'mm-command-mark'])
    assert.ok(C.CARRY_NEVER.includes(k), k + ' is named among what is never carried');
  const kept = Object.assign({}, PLANTED, { 'mm-theme': JSON.stringify('dark'), 'mm-hand': JSON.stringify('left'), 'mm-hand-name': JSON.stringify('john'), 'mm-panel': 'closed', 'mm-snap': JSON.stringify('auto') });
  const out = C.carryPrefs(store(kept));
  assert.deepEqual(Object.keys(out).sort(), ['mm-hand', 'mm-hand-name', 'mm-panel', 'mm-snap', 'mm-theme']);
  assert.equal(out['mm-theme'], JSON.stringify('dark'));
  const text = JSON.stringify(out);
  for (const w of PLANTED_WORDS) assert.ok(!text.includes(w), 'nothing planted is gathered');
});

test('a preference whose value looks like a key, is not a string, or is too long is left out', () => {
  const out = C.carryPrefs(store({
    'mm-hand-name': JSON.stringify('sk-or-v1-' + 'a'.repeat(40)),
    'mm-theme': JSON.stringify('dark'),
    'mm-palette-uses': 'x'.repeat(70000),
    'mm-hand': JSON.stringify('ghp_' + 'b'.repeat(36)),
  }));
  assert.deepEqual(Object.keys(out), ['mm-theme']);
  assert.equal(C.keyShaped('sk-ant-' + 'a'.repeat(30)), true);
  assert.equal(C.keyShaped('AKIA' + 'A'.repeat(16)), true);
  assert.equal(C.keyShaped(JSON.stringify('dark')), false);
  assert.equal(C.keyShaped(JSON.stringify({ 'concept:row': 3 })), false);
});

test('on the way in, a preference is set only where it is carried by name and the page holds none — a key sent anyway is refused', () => {
  const incoming = { 'mm-theme': JSON.stringify('dark'), 'mm-hand': JSON.stringify('left'), 'mm-model-key': PLANTED['mm-model-key'], 'mm-git-token': PLANTED['mm-git-token'],
    'mm-hand-name': JSON.stringify('sk-or-v1-' + 'c'.repeat(40)), 'mm-panel': 7 };
  const r = C.takePrefs(incoming, store({ 'mm-hand': JSON.stringify('right') }));
  assert.deepEqual(r.set, { 'mm-theme': JSON.stringify('dark') });
  assert.deepEqual(r.kept, ['mm-hand'], 'what this page already holds stands');
  assert.deepEqual(C.takePrefs(null, store({})), { set: {}, kept: [] });
});

test('the taught mark goes as its five samples (it is learned again where it lands); anything else is no mark', () => {
  const stroke = (k) => Array.from({ length: 30 }, (_, i) => ({ x: k + i, y: i < 15 ? i : 30 - i }));
  const samples = [0, 1, 2, 3, 4].map(stroke);
  const saved = { mark: { name: 'your mark', anything: 'the learned signature' }, samples, at: 1700000000000 };
  assert.deepEqual(C.carryMark(saved), { samples, at: 1700000000000 });
  assert.equal(C.carryMark(null), null);
  assert.equal(C.carryMark({ mark: {}, samples: samples.slice(0, 4) }), null, 'five, not four');
  assert.equal(C.carryMark({ mark: {}, samples: samples.concat([stroke(9)]) }), null);
  assert.equal(C.carryMark({ mark: {}, samples: [stroke(0), stroke(1), stroke(2), stroke(3), [{ x: 1, y: NaN }, { x: 2, y: 2 }]] }), null);
  assert.equal(C.carryMark({ mark: {}, samples: [stroke(0), stroke(1), stroke(2), stroke(3), 'nope'] }), null);
  // Only the points' x and y travel.
  const extra = { mark: {}, samples: samples.map((s) => s.map((p) => Object.assign({ t: 5, secret: 'PLANTED' }, p))) };
  assert.ok(!JSON.stringify(C.carryMark(extra)).includes('PLANTED'));
});

test('a board’s view travels only as three finite numbers, zoom above nothing', () => {
  assert.deepEqual(C.carryView({ zoom: 2, panX: -10, panY: 3.5 }), { zoom: 2, panX: -10, panY: 3.5 });
  assert.equal(C.carryView({ zoom: 0, panX: 0, panY: 0 }), null);
  assert.equal(C.carryView({ zoom: 1, panX: 'x', panY: 0 }), null);
  assert.equal(C.carryView(null), null);
  assert.deepEqual(C.carryView({ zoom: 1, panX: 0, panY: 0, key: 'PLANTED' }), { zoom: 1, panX: 0, panY: 0 });
});

// ----- what a carry brings in --------------------------------------------------------------------------------

test('an empty board is one with nothing in its log but the device’s mark taught again', () => {
  assert.equal(C.carryEmpty([]), true);
  assert.equal(C.carryEmpty([{ type: 'teach', at: 1 }]), true);
  assert.equal(C.carryEmpty([{ type: 'stroke', id: 1 }]), false);
  assert.equal(C.carryEmpty([{ type: 'teach' }, { type: 'import', kind: 'png' }]), false);
  assert.equal(C.carryEmpty(null), true);
});

test('a carry brings each board in as a new entry; a name a board here already has takes a suffix; the empty board the page began with gives its name up', () => {
  const held = [
    { id: 'default', name: 'My board', empty: true, trashed: 0, hash: 'e0' },
    { id: 'b-g', name: 'Garden', empty: false, trashed: 0, hash: 'g9' },
  ];
  const plan = C.carryPlan({ held, incoming: [{ key: 0, name: 'My board', hash: 'h1' }, { key: 1, name: 'Garden', hash: 'h2' }, { key: 2, name: 'Notes', hash: 'h3' }] });
  assert.deepEqual(plan.bring.map((b) => [b.key, b.name, b.hash]), [[0, 'My board', 'h1'], [1, 'Garden 2', 'h2'], [2, 'Notes', 'h3']]);
  assert.deepEqual(plan.held, []);
  assert.deepEqual(plan.empty, ['default'], 'the empty board whose name a carried board takes goes to the trash — it held nothing');
});

test('carrying twice brings nothing in twice: a log already held — or carried here before and drawn on since — is said and skipped', () => {
  const held = [
    { id: 'default', name: 'My board', empty: true, trashed: 1, hash: 'e0' },
    { id: 'b-1', name: 'My board', empty: false, trashed: 0, hash: 'h1+teach', carried: 'h1' },
    { id: 'b-g', name: 'Garden', empty: false, trashed: 0, hash: 'g9' },
    { id: 'b-2', name: 'Garden 2', empty: false, trashed: 0, hash: 'h2', carried: 'h2' },
  ];
  const plan = C.carryPlan({ held, incoming: [{ key: 0, name: 'My board', hash: 'h1' }, { key: 1, name: 'Garden', hash: 'h2' }] });
  assert.deepEqual(plan.bring, []);
  assert.deepEqual(plan.held.map((h) => [h.key, h.name, h.as]), [[0, 'My board', 'My board'], [1, 'Garden', 'Garden 2']]);
  assert.deepEqual(plan.empty, [], 'an empty board already in the trash stays where it is');
  // A board drawn on at the old address since it was carried is a new log: it comes again, under a name of its own.
  const again = C.carryPlan({ held, incoming: [{ key: 0, name: 'My board', hash: 'h1-more' }] });
  assert.deepEqual(again.bring.map((b) => b.name), ['My board 2'], 'a name in the trash is taken too');
});

test('the same log twice in one carry comes once; a name of eighty characters still takes its suffix within the limit', () => {
  const long = 'x'.repeat(80);
  const plan = C.carryPlan({ held: [{ id: 'b', name: long, empty: false, trashed: 0, hash: 'z' }], incoming: [{ key: 0, name: 'A', hash: 'h' }, { key: 1, name: 'B', hash: 'h' }, { key: 2, name: long, hash: 'k' }, { key: 3, name: '   ', hash: 'q' }] });
  assert.deepEqual(plan.bring.map((b) => b.key), [0, 2, 3]);
  assert.deepEqual(plan.held.map((h) => [h.key, h.as]), [[1, 'A']]);
  const named = plan.bring.find((b) => b.key === 2).name;
  assert.ok(named.length <= 80 && / 2$/.test(named), named);
  assert.equal(plan.bring.find((b) => b.key === 3).name, 'Board', 'a board with no name is a Board');
});

// ----- the one file every board goes out in ----------------------------------------------------------------

const boardBytes = (log, pics) => join8(C.bundleBuild({ log, assets: pics || [], time: 0 }).parts);

test('every board out is one zip — a manifest and each board’s .dyna.zip — and it reads back whole: names, views, the mark, the preferences', async () => {
  const pic = enc('a picture, as bytes');
  const ref = 'sha256:' + hex(pic);
  const one = boardBytes('{"type":"format","format":"metamedium-log","version":1}\n{"type":"stroke","id":1}\n', [{ ref, mime: 'image/png', bytes: pic }]);
  const two = boardBytes('{"type":"format","format":"metamedium-log","version":1}\n{"type":"stroke","id":2}\n');
  const stroke = (k) => Array.from({ length: 20 }, (_, i) => ({ x: k + i, y: i }));
  const mark = { samples: [0, 1, 2, 3, 4].map(stroke), at: 5 };
  const z = C.everyBuild({ boards: [{ name: 'My board', view: { zoom: 2, panX: 1, panY: 2 }, bytes: one }, { name: 'My board', view: null, bytes: two }], mark, prefs: { 'mm-theme': '"dark"' }, from: OLD, time: Date.UTC(2026, 9, 2) });
  const bytes = join8(z.parts);
  assert.equal(latin1(bytes.slice(0, 4)), 'PK\x03\x04');
  const names = (await C.zipRead(bytes)).entries.map((e) => e.name);
  assert.equal(names[0], C.EVERY_MANIFEST);
  assert.equal(new Set(names).size, names.length, 'two boards of one name are two files');
  assert.ok(names.slice(1).every((n) => /^boards\/\d\d-.+\.dyna\.zip$/.test(n)), names.join(' '));
  const r = await C.everyRead(bytes, { inflate });
  assert.equal(r.ok, true);
  assert.equal(r.from, OLD);
  assert.deepEqual(r.boards.map((b) => [b.name, b.view, b.bad || null]), [['My board', { zoom: 2, panX: 1, panY: 2 }, null], ['My board', null, null]]);
  assert.deepEqual([...r.boards[0].bytes], [...one]);
  const inner = await C.bundleRead(r.boards[0].bytes, { digest });
  assert.equal(inner.ok, true);
  assert.equal(inner.assets.length, 1, 'the picture comes back inside its board’s bundle, its hash checked');
  assert.deepEqual(r.mark, mark);
  assert.deepEqual(r.prefs, { 'mm-theme': '"dark"' });
  assert.equal(C.everyName(Date.UTC(2026, 9, 2)), 'every-board-2026-10-02.zip');
});

test('every board out is read, not trusted: a key in its preferences is refused, a damaged board is said while the sound ones open', async () => {
  const one = boardBytes('{"type":"stroke","id":1}\n');
  const two = boardBytes('{"type":"stroke","id":2}\n');
  const z = C.everyBuild({ boards: [{ name: 'One', bytes: one }, { name: 'Two', bytes: two }], mark: null, prefs: { 'mm-theme': '"dark"', 'mm-model-key': PLANTED['mm-model-key'] }, from: OLD, time: 0 });
  const bytes = join8(z.parts);
  // A byte of the second board flipped: its checksum no longer matches.
  const at = latin1(bytes).lastIndexOf('{"type":"stroke","id":2}');
  bytes[at + 3] ^= 0x20;
  const r = await C.everyRead(bytes, { inflate });
  assert.equal(r.ok, true);
  assert.deepEqual(r.prefs, { 'mm-theme': '"dark"' }, 'a key in the file is never taken, whoever wrote it');
  assert.equal(r.boards[0].bad, undefined);
  assert.match(r.boards[1].bad, /checksum/);
  assert.equal(r.mark, null);
});

test('a zip that is no every-board file says so; a newer version and a damaged manifest are sentences, never throws', async () => {
  const bundle = boardBytes('{"type":"stroke","id":1}\n');
  const notEvery = await C.everyRead(bundle, { inflate });
  assert.equal(notEvery.ok, false);
  assert.equal(notEvery.notEvery, true, 'a single board bundle is the bundle reader’s');
  const newer = join8(C.zipWrite([{ name: C.EVERY_MANIFEST, data: enc(JSON.stringify({ format: 'dyna-boards', version: 9, boards: [] })) }]).parts);
  const n = await C.everyRead(newer, { inflate });
  assert.equal(n.ok, false);
  assert.match(n.words, /version 9/);
  const broken = join8(C.zipWrite([{ name: C.EVERY_MANIFEST, data: enc('{not json') }]).parts);
  const b = await C.everyRead(broken, { inflate });
  assert.equal(b.ok, false);
  assert.match(b.words, /could not be read|damaged/);
  const missing = join8(C.zipWrite([{ name: C.EVERY_MANIFEST, data: enc(JSON.stringify({ format: 'dyna-boards', version: 1, boards: [{ file: 'boards/01-gone.dyna.zip', name: 'Gone' }, { file: '../escape.zip', name: 'Out' }] })) }]).parts);
  const m = await C.everyRead(missing, { inflate });
  assert.equal(m.ok, true);
  assert.deepEqual(m.boards.map((x) => [x.name, !!x.bad]), [['Gone', true], ['Out', true]]);
  const cut = await C.everyRead(newer.slice(0, 30), { inflate });
  assert.equal(cut.ok, false);
  assert.equal(cut.unread, true, 'bytes that are no zip go back to the single bundle’s reader, which names the file');
  assert.equal(typeof cut.words, 'string');
});

test('a file unzipped and zipped again by hand — compressed, one folder down — still reads', async () => {
  const one = boardBytes('{"type":"stroke","id":1}\n');
  const manifest = enc(JSON.stringify({ format: 'dyna-boards', version: 1, from: OLD, boards: [{ file: 'boards/01-One.dyna.zip', name: 'One' }] }));
  const bytes = deflatedZip([{ name: 'my boards/' + C.EVERY_MANIFEST, data: manifest }, { name: 'my boards/boards/01-One.dyna.zip', data: one }]);
  const r = await C.everyRead(bytes, { inflate });
  assert.equal(r.ok, true, r.words);
  assert.deepEqual(r.boards.map((b) => [b.name, b.bad || null]), [['One', null]]);
  assert.deepEqual([...r.boards[0].bytes], [...one]);
});

/** A zip whose entries are deflated, as the Files app or `zip` writes one — by hand, with node's zlib. */
function deflatedZip(entries) {
  const parts = [], central = [];
  let off = 0;
  for (const e of entries) {
    const comp = deflateRawSync(Buffer.from(e.data));
    const name = Buffer.from(enc(e.name));
    const crc = crc32(e.data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(8, 8);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(e.data.length, 22); lh.writeUInt16LE(name.length, 26);
    parts.push(lh, name, comp);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(8, 10);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(e.data.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(off, 42);
    central.push(ch, name);
    off += 30 + name.length + comp.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return new Uint8Array(Buffer.concat([...parts, cd, end]));
}

function crc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (let n = 0; n < bytes.length; n++) {
    let c = (crc ^ bytes[n]) & 0xFF;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ----- the sentences ------------------------------------------------------------------------------------

test('what a carry did, said where it landed: what came, under which names, what was here already, what could not come', () => {
  assert.equal(C.carryWhere(OLD), 'the old address');
  assert.equal(C.carryWhere(A), '127.0.0.1:8010');
  assert.equal(C.carryWhere('file'), 'the file');
  const w = C.carryWords({ from: OLD, brought: [{ name: 'My board', pictures: 1 }, { name: 'Garden 2', pictures: 0 }], held: [{ name: 'Notes', as: 'Notes' }], failed: [{ name: 'Old', why: 'its checksum does not match' }], damaged: 1, mark: 'taught', prefs: 3, emptied: ['My board'] });
  assert.match(w, /^2 boards came from the old address — “My board” and “Garden 2”, with 1 picture/);
  assert.match(w, /“Notes” was here already/);
  assert.match(w, /“Old” could not be read \(its checksum does not match\)/);
  assert.match(w, /1 picture was damaged/);
  assert.match(w, /your mark came too/);
  assert.match(w, /3 preferences came too/);
  assert.match(w, /the empty “My board” this page began with is in the trash/);
  const again = C.carryWords({ from: OLD, brought: [], held: [{ name: 'My board', as: 'My board' }, { name: 'Garden', as: 'Garden 2' }], failed: [], damaged: 0, mark: 'same', prefs: 0, emptied: [] });
  assert.match(again, /^nothing new from the old address — both boards are here already/);
  assert.ok(!/mark/.test(again));
  const kept = C.carryWords({ from: OLD, brought: [{ name: 'A', pictures: 0 }], held: [], failed: [], damaged: 0, mark: 'kept', prefs: 0, emptied: [] });
  assert.match(kept, /the mark taught here was kept/);
  assert.equal(C.carrySentWords({ target: HOME, brought: 2, held: 0, failed: 0 }), '2 boards carried to dyna.ink');
  assert.equal(C.carrySentWords({ target: B, brought: 1, held: 1, failed: 0 }), '1 board carried to 127.0.0.1:8011 — 1 was there already');
  assert.equal(C.carrySentWords({ target: HOME, brought: 0, held: 2, failed: 0 }), 'nothing new to carry — both boards are on dyna.ink already');
  assert.equal(C.carrySentWords({ target: HOME, brought: 1, held: 0, failed: 1 }), '1 board carried to dyna.ink — 1 could not be read there');
});

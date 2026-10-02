// The boards list, on its own.
//
//   node --test Demos/surface/17-boards.test.mjs
//
// 17-boards.js is the pure half of several named boards (V1-PLAN §9 R1): the
// list, the names, the trash, which board a page opens and whether the one on
// screen may be left. Like 17-board.js (R3's journal, one board's log) it names
// nothing outside itself — no DOM, no storage, no session — so it loads here
// exactly as the browser loads it, as source inside a function body.
//
// Not part of the built surface — Demos/build-surface.mjs concatenates
// `/^\d\d-.*\.js$/`, which `.test.mjs` does not match.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NAMES = [
  'FIRST_BOARD', 'FIRST_BOARD_NAME', 'RECENT_MAX', 'boardName', 'isKept', 'boardShelves', 'listPlan', 'nextBoardName',
  'newBoardEntry', 'copyName', 'copyEntry', 'renamed', 'trashed', 'restored', 'pickBoard', 'nextAfter',
  'emptyTrashPlan', 'agoWords', 'sizeWords', 'countMarks', 'statsOf', 'statsAfter', 'kindWords', 'placeEntry',
  'placesPlan', 'boardRows', 'leaveVerdict', 'switchPlan', 'boardTitle', 'boardSearch',
  'EXAMPLES_BASE', 'exampleUrl', 'exampleRows', 'exampleName', 'starterOf',
  'spaceWords', 'storageWords', 'persistPlan', 'PERSIST_KEY',
  'VERSION_META', 'VERSION_META_BEFORE', 'pageVersionOf', 'versionWords', 'SOURCE_URL', 'sourceLine',
];
const file = join(dirname(fileURLToPath(import.meta.url)), '17-boards.js');
// Loaded as the browser loads it. While the fragment is not written, every
// name is missing and each test fails on its own line, not the file as a whole.
const B = (() => {
  if (!existsSync(file)) return {};
  const src = readFileSync(file, 'utf8');
  return new Function(src + '\n  return { ' + NAMES.map((n) => n + ': typeof ' + n + " === 'undefined' ? undefined : " + n).join(', ') + ' };')();
})();

const MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const NOW = Date.UTC(2026, 8, 27, 15, 0, 0);
const board = (id, name, o) => Object.assign({ id, kind: 'board', name, created: 0, opened: 0, trashed: 0 }, o || {});

/** mulberry32, as the e2e and the journal's tests use. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('a name as typed: trimmed, its spaces collapsed, not too long — and nothing is not a name', () => {
  assert.equal(B.boardName('  Garden   plan \n'), 'Garden plan');
  assert.equal(B.boardName('x'.repeat(200)).length, 80);
  assert.equal(B.boardName('   '), null);
  assert.equal(B.boardName(''), null);
  assert.equal(B.boardName(null), null);
  assert.equal(B.boardName(42), null);
});

test('the first read: the board this browser already kept is the first entry, "My board", under its own key', () => {
  assert.equal(B.FIRST_BOARD, 'default', 'R3 kept its one board under this key; the list must not move it');
  assert.equal(B.FIRST_BOARD_NAME, 'My board');
  const first = B.listPlan([], NOW, { board: 'default', v: 1, created: NOW - 5 * DAY, imported: 0 });
  assert.equal(first.put.length, 1);
  assert.deepEqual(first.put[0], { id: 'default', kind: 'board', name: 'My board', created: NOW - 5 * DAY, opened: 0, trashed: 0 });
  assert.deepEqual(first.entries, first.put);
  // No meta yet (nothing was ever kept): made now.
  assert.equal(B.listPlan([], NOW, null).put[0].created, NOW);
  // A list that has a board is left as it is — even when every board is in the trash.
  const had = [board('b-1', 'Plans', { trashed: NOW })];
  assert.deepEqual(B.listPlan(had, NOW, null), { entries: had, put: [] });
  // Places are not boards: a list holding only a folder still gets its first board.
  const places = [{ id: 'folder:work', kind: 'folder', name: 'work', spec: 'work', opened: NOW }];
  const withFirst = B.listPlan(places, NOW, null);
  assert.equal(withFirst.put.length, 1);
  assert.equal(withFirst.entries.length, 2);
});

test('a new board is named for the list: "Board 2", "Board 3" … — and the only board is "My board"', () => {
  assert.equal(B.nextBoardName([]), 'My board');
  assert.equal(B.nextBoardName([board('default', 'My board')]), 'Board 2');
  assert.equal(B.nextBoardName([board('default', 'My board'), board('b-1', 'Board 2', { trashed: NOW })]), 'Board 3', 'a name in the trash is still taken');
  assert.equal(B.nextBoardName([board('default', 'My board', { trashed: NOW })]), 'My board', 'with nothing on the list, the new one is the first again');
  const e = B.newBoardEntry([board('default', 'My board')], 'b-7', NOW);
  assert.deepEqual(e, { id: 'b-7', kind: 'board', name: 'Board 2', created: NOW, opened: 0, trashed: 0 });
  assert.equal(B.newBoardEntry([], 'b-8', NOW, '  Pattern — skirt ').name, 'Pattern — skirt');
});

test('a copy: its own id, the name said as a copy, and where it came from', () => {
  const list = [board('a', 'Sketch')];
  assert.equal(B.copyName(list, 'Sketch'), 'Sketch copy');
  assert.equal(B.copyName(list.concat([board('b', 'Sketch copy')]), 'Sketch'), 'Sketch copy 2');
  const c = B.copyEntry(list, list[0], 'b-9', NOW);
  assert.deepEqual(c, { id: 'b-9', kind: 'board', name: 'Sketch copy', created: NOW, opened: 0, trashed: 0, from: 'a' });
});

test('renamed: the same entry — the same id, so the same journal — under a new name; two boards may share one', () => {
  const a = board('a', 'Plans', { created: 5, opened: 9 });
  const r = B.renamed(a, ' Garden ');
  assert.deepEqual(r, Object.assign({}, a, { name: 'Garden' }));
  assert.equal(r.id, 'a', 'the name is not the key');
  assert.equal(B.renamed(a, 'Plans'), null, 'nothing to change');
  assert.equal(B.renamed(a, '   '), null, 'nothing is not a name');
  const list = [a, board('b', 'Garden')];
  assert.equal(B.renamed(list[0], 'Garden').name, 'Garden', 'a name another board has is still a name');
});

test('the shelves: boards in the order they were made, the trash newest first, places most recently opened first', () => {
  const entries = [
    board('c', 'Third', { created: 30 }),
    board('a', 'First', { created: 10 }),
    board('x', 'Old', { created: 5, trashed: NOW - DAY }),
    board('b', 'Second', { created: 20 }),
    board('y', 'Older', { created: 4, trashed: NOW - HOUR }),
    { id: 'git:o/r', kind: 'git', name: 'o/r', spec: 'o/r', opened: NOW - 2 * HOUR },
    { id: 'folder:work', kind: 'folder', name: 'work', spec: 'work', opened: NOW - MIN },
  ];
  const s = B.boardShelves(entries);
  assert.deepEqual(s.boards.map((e) => e.id), ['a', 'b', 'c']);
  assert.deepEqual(s.trash.map((e) => e.id), ['y', 'x']);
  assert.deepEqual(s.places.map((e) => e.id), ['folder:work', 'git:o/r']);
  const t = B.trashed(entries[1], NOW);
  assert.equal(t.trashed, NOW);
  assert.equal(t.id, 'a');
  assert.equal(B.restored(t).trashed, 0);
  assert.ok(B.isKept(entries[0]) && !B.isKept(entries[5]));
});

test('which board a page opens: the one the URL names (out of the trash if it was there), else the one opened last, else a new one', () => {
  const list = [board('a', 'A', { created: 1, opened: NOW - HOUR }), board('b', 'B', { created: 2, opened: NOW - MIN }), board('t', 'T', { created: 3, trashed: NOW })];
  assert.deepEqual(B.pickBoard(list, 'a'), { id: 'a', restore: false, missing: null, make: false });
  assert.deepEqual(B.pickBoard(list, 't'), { id: 't', restore: true, missing: null, make: false });
  assert.deepEqual(B.pickBoard(list, 'nope'), { id: 'b', restore: false, missing: 'nope', make: false });
  assert.deepEqual(B.pickBoard(list, null), { id: 'b', restore: false, missing: null, make: false });
  assert.deepEqual(B.pickBoard([board('x', 'X', { created: 2 }), board('w', 'W', { created: 1 })], null).id, 'w', 'never opened: the first made');
  assert.deepEqual(B.pickBoard([board('t', 'T', { trashed: NOW })], null), { id: null, restore: false, missing: null, make: true });
  assert.deepEqual(B.pickBoard([{ id: 'folder:w', kind: 'folder', name: 'w', spec: 'w', opened: NOW }], 'folder:w'), { id: null, restore: false, missing: 'folder:w', make: true }, 'a place is not a board');
});

test('after the board on screen goes to the trash: the one opened most recently among the rest, or a new one', () => {
  const list = [board('a', 'A', { opened: 10 }), board('b', 'B', { opened: 30 }), board('c', 'C', { opened: 20 }), board('t', 'T', { opened: 99, trashed: 1 })];
  assert.equal(B.nextAfter(list, 'b'), 'c');
  assert.equal(B.nextAfter([board('a', 'A')], 'a'), null);
});

test('emptying the trash is said plainly before it happens — which boards, how big, that it cannot be undone — and a board open in another tab stays', () => {
  const list = [board('a', 'Here'), board('x', 'Sketches', { trashed: NOW - MIN }), board('y', 'Old ideas', { trashed: NOW - HOUR }), board('z', 'Busy', { trashed: NOW })];
  const stats = { x: { changed: NOW - DAY, events: 50, marks: 42, chars: 12300 }, y: { changed: 0, events: 0, marks: 0, chars: 0 }, z: { events: 3, marks: 3, chars: 900 } };
  const p = B.emptyTrashPlan(list, stats, ['z']);
  assert.deepEqual(p.gone.map((e) => e.id), ['x', 'y']);
  assert.deepEqual(p.kept.map((e) => e.id), ['z']);
  assert.match(p.words, /2 boards/);
  assert.match(p.words, /“Sketches” \(42 marks\)/);
  assert.match(p.words, /“Old ideas” \(empty\)/);
  assert.match(p.words, /for good/);
  assert.match(p.words, /cannot be undone/);
  assert.match(p.words, /“Busy” is open in another tab/);
  const one = B.emptyTrashPlan([board('x', 'Sketches', { trashed: 1 })], {}, []);
  assert.match(one.words, /1 board\b/);
  const none = B.emptyTrashPlan([board('a', 'A')], {}, []);
  assert.deepEqual(none.gone, []);
  assert.match(none.words, /the trash is empty/);
});

test('when, and how big, in a few words', () => {
  assert.equal(B.agoWords(NOW - 10000, NOW), 'just now');
  assert.equal(B.agoWords(NOW - 4 * MIN, NOW), '4 min ago');
  assert.equal(B.agoWords(NOW - 3 * HOUR, NOW), '3 h ago');
  assert.equal(B.agoWords(NOW - 30 * HOUR, NOW), 'yesterday');
  assert.equal(B.agoWords(NOW - 4 * DAY, NOW), '4 days ago');
  assert.match(B.agoWords(Date.UTC(2026, 7, 2, 12), NOW), /^2 Aug$/);
  assert.match(B.agoWords(Date.UTC(2025, 7, 2, 12), NOW), /^2 Aug 2025$/);
  assert.equal(B.agoWords(0, NOW), '');
  assert.equal(B.sizeWords({ events: 50, marks: 42, chars: 12300 }), '42 marks · 12 KB');
  assert.equal(B.sizeWords({ events: 2, marks: 1, chars: 300 }), '1 mark · under 1 KB');
  assert.equal(B.sizeWords({ events: 2079, marks: 2000, chars: 6.9e6 }), '2000 marks · 6.6 MB');
  assert.equal(B.sizeWords({ events: 0, marks: 0, chars: 0 }), 'empty');
  assert.equal(B.sizeWords(null), 'size not known yet');
});

test('what a board holds, kept up as records land: its events, its marks, its characters in the store', () => {
  const evs = [{ type: 'stroke' }, { type: 'bless' }, { type: 'stroke' }, { type: 'teach' }];
  assert.equal(B.countMarks(evs), 2);
  assert.deepEqual(B.statsOf(evs, 400, NOW), { changed: NOW, events: 4, marks: 2, chars: 400 });
  const whole = { seq: 1, on: 1, base: 0, n: 4, text: 'x'.repeat(400) };
  const s1 = B.statsAfter(null, whole, evs, NOW);
  assert.deepEqual(s1, { changed: NOW, events: 4, marks: 2, chars: 400 });
  const more = evs.concat([{ type: 'stroke' }]);
  const s2 = B.statsAfter(s1, { seq: 2, on: 1, base: 4, n: 1, text: 'y'.repeat(90) }, more, NOW + 5);
  assert.deepEqual(s2, { changed: NOW + 5, events: 5, marks: 3, chars: 490 });
  const s3 = B.statsAfter(s2, { seq: 3, on: 1, base: 4, n: 0, text: '' }, evs, NOW + 9); // an undo
  assert.deepEqual(s3, { changed: NOW + 9, events: 4, marks: 2, chars: 490 }, 'an undo is a change; the store holds the cut record too');
  assert.equal(B.statsAfter(s3, { seq: 4, on: 4, base: 0, n: 4, text: 'z'.repeat(401) }, evs, NOW).chars, 401, 'a whole log compacts the store');
});

test('a place opened on the page — a folder, a repository, a site — is a recent entry of its kind, and nothing else', () => {
  const g = B.placeEntry('git', 'owner/repo@main', 'owner/repo@main', NOW);
  assert.deepEqual(g, { id: 'git:owner/repo@main', kind: 'git', name: 'owner/repo@main', spec: 'owner/repo@main', opened: NOW });
  assert.deepEqual(Object.keys(B.placeEntry('folder', 'work', 'work', NOW)).sort(), ['id', 'kind', 'name', 'opened', 'spec']);
  assert.equal(B.kindWords('board'), 'kept in this browser');
  assert.equal(B.kindWords('folder'), 'folder');
  assert.equal(B.kindWords('git'), 'repository');
  assert.equal(B.kindWords('static'), 'site');
  // Newest first; opened again, it moves up rather than doubling; past the cap the oldest go.
  let list = [];
  for (let i = 0; i < B.RECENT_MAX + 3; i++) {
    const e = B.placeEntry('static', '/site/' + i + '/', 'site ' + i, NOW + i);
    const plan = B.placesPlan(list, e);
    list = list.filter((x) => !plan.drop.includes(x.id) && x.id !== e.id).concat([plan.put]);
  }
  assert.equal(list.length, B.RECENT_MAX);
  assert.ok(!list.some((e) => e.spec === '/site/0/'), 'the oldest dropped');
  const again = B.placesPlan(list, B.placeEntry('static', '/site/5/', 'site 5', NOW + 99));
  assert.deepEqual(again.drop, []);
  assert.equal(again.put.opened, NOW + 99);
  // Boards are never dropped as recents.
  const mixed = [board('a', 'A')].concat(list);
  assert.ok(!B.placesPlan(mixed, B.placeEntry('git', 'x/y', 'x/y', NOW + 200)).drop.includes('a'));
});

test('the rows the pane shows: the board here marked, when each changed and how big, places by kind, the trash with its date', () => {
  const entries = [
    board('default', 'My board', { created: 1, opened: NOW - MIN }),
    board('b-2', 'Board 2', { created: 2, opened: NOW - DAY }),
    board('b-3', 'Old', { created: 3, trashed: NOW - 2 * HOUR }),
    { id: 'git:o/r', kind: 'git', name: 'o/r', spec: 'o/r', opened: NOW - 3 * HOUR },
  ];
  const stats = { default: { changed: NOW - 4 * MIN, events: 50, marks: 42, chars: 12300 }, 'b-3': { changed: NOW - DAY, events: 5, marks: 5, chars: 2048 } };
  const rows = B.boardRows(entries, stats, NOW, 'default');
  assert.deepEqual(rows.boards.map((r) => [r.id, r.name, r.here]), [['default', 'My board', true], ['b-2', 'Board 2', false]]);
  assert.equal(rows.boards[0].when, 'changed 4 min ago');
  assert.equal(rows.boards[0].size, '42 marks · 12 KB');
  assert.equal(rows.boards[1].size, 'size not known yet');
  assert.deepEqual(rows.places.map((r) => [r.id, r.kind, r.when]), [['git:o/r', 'repository', 'opened 3 h ago']]);
  assert.deepEqual(rows.trash.map((r) => [r.id, r.when, r.size]), [['b-3', 'deleted 2 h ago', '5 marks · 2 KB']]);
});

test('leaving the board on screen: only once the store holds all of it — or said, with the way out', () => {
  const base = { state: 'armed', trouble: null, needWhole: false, dirty: false, inFlight: 0, name: 'Plans' };
  assert.equal(B.leaveVerdict(base), null);
  assert.equal(B.leaveVerdict(Object.assign({}, base, { inFlight: 1 })).kind, 'busy');
  assert.equal(B.leaveVerdict(Object.assign({}, base, { dirty: true })).kind, 'busy');
  assert.equal(B.leaveVerdict(Object.assign({}, base, { state: 'waiting' })).kind, 'busy');
  const unsaved = B.leaveVerdict(Object.assign({}, base, { trouble: { kind: 'full', detail: 'QuotaExceededError' }, needWhole: true }));
  assert.equal(unsaved.kind, 'unsaved');
  assert.match(unsaved.words, /“Plans” is not saved/);
  assert.deepEqual(unsaved.ways, ['export', 'leave']);
  const notKept = B.leaveVerdict(Object.assign({}, base, { state: 'readonly', trouble: { kind: 'tab', detail: '' }, dirty: true }));
  assert.equal(notKept.kind, 'not-kept');
  assert.match(notKept.words, /another tab/);
  assert.deepEqual(notKept.ways, ['export', 'leave']);
  assert.equal(B.leaveVerdict(Object.assign({}, base, { state: 'readonly', trouble: { kind: 'tab', detail: '' } })), null, 'nothing drawn here, nothing to keep');
  assert.equal(B.leaveVerdict(Object.assign({}, base, { state: 'off' })), null);
});

test('the switch: already here, a place, a page that is not on a board, a board — out of the trash if it was there', () => {
  const entries = [board('a', 'A'), board('b', 'B'), board('t', 'T', { trashed: NOW }), { id: 'folder:w', kind: 'folder', name: 'w', spec: 'w', opened: NOW }];
  assert.deepEqual(B.switchPlan({ entries, current: 'a', onBoard: true, target: 'a' }), { go: 'here', id: 'a' });
  assert.deepEqual(B.switchPlan({ entries, current: 'a', onBoard: true, target: 'b' }), { go: 'switch', id: 'b', restore: false });
  assert.deepEqual(B.switchPlan({ entries, current: 'a', onBoard: true, target: 't' }), { go: 'switch', id: 't', restore: true });
  assert.deepEqual(B.switchPlan({ entries, current: 'a', onBoard: false, target: 'a' }), { go: 'navigate', id: 'a', restore: false }, 'a folder is on screen: the board opens in a page of its own');
  assert.deepEqual(B.switchPlan({ entries, current: 'a', onBoard: true, target: 'folder:w' }), { go: 'place', id: 'folder:w' });
  assert.deepEqual(B.switchPlan({ entries, current: 'a', onBoard: true, target: 'gone' }), { go: 'missing', id: 'gone' });
});

test('the page says which board it is: the title carries the name, the address the id — and never ?fresh', () => {
  assert.equal(B.boardTitle('Garden plan'), 'Garden plan — dyna.ink');
  assert.equal(B.boardTitle(''), 'dyna.ink');
  assert.equal(B.boardSearch('?nosw=1&theme=dark', 'b-12'), '?nosw=1&theme=dark&board=b-12');
  assert.equal(B.boardSearch('?board=default&nosw=1', 'b-12'), '?board=b-12&nosw=1');
  assert.equal(B.boardSearch('?fresh=1&nosw=1&folder=%2Fsite%2F&git=a%2Fb&live=r&relay=http%3A%2F%2Fx&replay=r.json&embed=1', 'default'), '?nosw=1&board=default',
    'a board opened by name is kept: a fresh start would wipe it at its first change, and a folder, a room or a figure is not a board');
  assert.equal(B.boardSearch('', 'default'), '?board=default');
  // A carry is asked once (RENAME-PLAN N1): the page that took the boards does not wait for them again on a reload.
  assert.equal(B.boardSearch('?carry=http%3A%2F%2F127.0.0.1%3A8010&nosw=1', 'b-3'), '?nosw=1&board=b-3');
  assert.equal(B.boardSearch('?carry', 'b-3'), '?board=b-3');
  assert.equal(B.boardSearch('?live=claude&relay=https%3A%2F%2Frelay.dyna.ink&key=SECRET&nosw=1', 'b-1'), '?nosw=1&board=b-1',
    'a room\'s key belongs to the room: it is never carried into the address of a board');
});

test('the page says its version: the tag scripts/build-app.mjs stamps, and — on a page an older worker kept — the name that tag had before', () => {
  // RENAME-PLAN N3b: the build stamps <meta name="dynaink-version">. A shell a service worker cached before the
  // rename (0.1.0, the last MetaMedium) carries <meta name="metamedium-version"> instead, and still says its version.
  assert.equal(B.VERSION_META, 'dynaink-version');
  assert.equal(B.VERSION_META_BEFORE, 'metamedium-version');
  const page = (tags) => (name) => (Object.prototype.hasOwnProperty.call(tags, name) ? tags[name] : null);
  assert.equal(B.pageVersionOf(page({ 'dynaink-version': '0.2.0' })), '0.2.0');
  assert.equal(B.pageVersionOf(page({ 'metamedium-version': '0.1.0' })), '0.1.0', "an old shell's tag is read");
  assert.equal(B.pageVersionOf(page({ 'dynaink-version': '0.2.0', 'metamedium-version': '0.1.0' })), '0.2.0', 'the new name first');
  assert.equal(B.pageVersionOf(page({ 'dynaink-version': '  0.2.1 \n' })), '0.2.1');
  assert.equal(B.pageVersionOf(page({ 'dynaink-version': ' ', 'metamedium-version': '0.1.0' })), '0.1.0', 'an empty tag is no version');
  assert.equal(B.pageVersionOf(page({})), '');
  assert.equal(B.pageVersionOf(page({ 'metamedium-version': undefined })), '');
  // …and what the help pane leads with: a 0.1.0 shell says 0.1.0, never "carries no version".
  assert.equal(B.versionWords(B.pageVersionOf(page({ 'metamedium-version': '0.1.0' }))), 'dyna.ink 0.1.0');
  assert.equal(B.versionWords('0.2.0'), 'dyna.ink 0.2.0');
  assert.equal(B.versionWords('0.0.0'), 'dyna.ink 0.0.0 — no release has been cut yet');
  assert.equal(B.versionWords(''), 'dyna.ink — this page carries no version');
});

test('the help pane offers the source: "Source code · AGPL-3.0", each a link, built from the one address the fragment holds', () => {
  // AGPL-3.0 §13: a person using a modified copy over a network must be offered its source. The line says where this
  // one's is, and a fork that changes SOURCE_URL offers its own (RENAME-PLAN H1 changes it when the repository moves).
  assert.equal(typeof B.SOURCE_URL, 'string');
  assert.match(B.SOURCE_URL, /^https:\/\/[^/]+\/[^/]+\/[^/]+$/, 'a repository\'s address, no trailing slash');
  const parts = B.sourceLine();
  assert.equal(parts.map((p) => p.text).join(''), 'Source code · AGPL-3.0');
  assert.deepEqual(parts.map((p) => p.href || null), [B.SOURCE_URL, null, B.SOURCE_URL + '/blob/master/LICENSE']);
  for (const p of parts.filter((x) => x.href)) assert.ok(typeof p.title === 'string' && p.title.length > 10, 'a link says where it goes: ' + p.text);
  assert.match(parts[2].title, /GNU Affero General Public License/);
  // Any address: a fork's, a trailing slash or two dropped.
  const fork = B.sourceLine('https://example.org/someone/fork//');
  assert.deepEqual(fork.map((p) => p.href || null), ['https://example.org/someone/fork', null, 'https://example.org/someone/fork/blob/master/LICENSE']);
  assert.equal(fork.map((p) => p.text).join(''), 'Source code · AGPL-3.0');
  assert.deepEqual(B.sourceLine(''), parts, 'no address is this one\'s');
  assert.deepEqual(B.sourceLine(null), parts);
});

test('at random: new, rename, copy, trash, restore and empty — ids stay unique, a rename never moves an id, and a board is only ever gone by emptying the trash', () => {
  const rand = rng(27);
  for (let run = 0; run < 30; run++) {
    let entries = B.listPlan([], NOW, null).entries;
    const made = new Set(entries.map((e) => e.id));
    const emptied = new Set();
    let next = 1;
    for (let step = 0; step < 60; step++) {
      const kept = entries.filter((e) => B.isKept(e));
      const live = kept.filter((e) => !e.trashed), bin = kept.filter((e) => e.trashed);
      const pick = (arr) => arr[Math.floor(rand() * arr.length)];
      const r = rand();
      if (r < 0.2) { const e = B.newBoardEntry(entries, 'b-' + next++, NOW + step); entries = entries.concat([e]); made.add(e.id); }
      else if (r < 0.35 && live.length) { const src = pick(live); const e = B.copyEntry(entries, src, 'b-' + next++, NOW + step); entries = entries.concat([e]); made.add(e.id); }
      else if (r < 0.55 && kept.length) { const e = pick(kept); const n = B.renamed(e, pick(['Plans', 'Garden', 'x', '  ', e.name])); if (n) { assert.equal(n.id, e.id); entries = entries.map((x) => (x.id === e.id ? n : x)); } }
      else if (r < 0.75 && live.length) { const e = pick(live); entries = entries.map((x) => (x.id === e.id ? B.trashed(x, NOW + step) : x)); }
      else if (r < 0.88 && bin.length) { const e = pick(bin); entries = entries.map((x) => (x.id === e.id ? B.restored(x) : x)); }
      else if (bin.length) {
        const held = rand() < 0.3 ? [pick(bin).id] : [];
        const plan = B.emptyTrashPlan(entries, {}, held);
        for (const g of plan.gone) { assert.ok(g.trashed, 'only what is in the trash goes'); assert.ok(!held.includes(g.id), 'never a board open elsewhere'); emptied.add(g.id); }
        entries = entries.filter((x) => !plan.gone.some((g) => g.id === x.id));
      }
      const ids = entries.map((e) => e.id);
      assert.equal(new Set(ids).size, ids.length, `run ${run}, step ${step}: ids unique`);
      for (const id of made) assert.ok(ids.includes(id) || emptied.has(id), `run ${run}, step ${step}: ${id} is on the list, in the trash, or was emptied`);
    }
  }
});

// ----- The examples (V1-PLAN R5) ---------------------------------------------------------------
// boards/examples/index.json lists the boards a first-time hand can open from the pane. The list
// is READ, not trusted: a row that could not be opened is left out, never thrown at, and a file
// name can only ever be one of the folder's own.

const INDEX = {
  starter: 'molecule',
  examples: [
    { id: 'flowchart', name: 'Flowchart', says: 'boxes and arrows, read as a flowchart, with its Mermaid beside it', file: 'flowchart.jsonl', marks: 16 },
    { id: 'molecule', name: 'Molecule', says: 'the Basics pack: a bubble and a molecule, nothing taught', file: 'molecule.jsonl', marks: 1 },
    { id: 'pattern-page', name: 'Pattern page', says: 'a right triangle that says its long side', file: 'pattern-page.jsonl', marks: 0 },
  ],
};

test('an example is fetched from the examples folder, beside the site\'s Demos — from the app and from the old address alike', () => {
  assert.equal(B.EXAMPLES_BASE, '../boards/examples/');
  assert.equal(B.exampleUrl('flowchart.jsonl'), '../boards/examples/flowchart.jsonl');
  assert.equal(B.exampleUrl('index.json'), '../boards/examples/index.json');
});

test('the rows of the pane: each example with what it shows and how big it is, in the index\'s order', () => {
  const rows = B.exampleRows(INDEX);
  assert.deepEqual(rows.map((r) => r.id), ['flowchart', 'molecule', 'pattern-page']);
  assert.deepEqual(rows[0], { id: 'flowchart', name: 'Flowchart', says: INDEX.examples[0].says, file: 'flowchart.jsonl', words: '16 marks' });
  assert.equal(rows[1].words, '1 mark');
  assert.equal(rows[2].words, 'empty');
});

test('a list that cannot be read is no rows, and a row that cannot be opened is left out — nothing throws', () => {
  for (const bad of [null, undefined, 'x', 7, [], {}, { examples: 'no' }, { examples: [null, 3, 'x', {}] }]) assert.deepEqual(B.exampleRows(bad), [], JSON.stringify(bad));
  const rows = B.exampleRows({ examples: [
    { id: 'a', name: 'A', file: 'a.jsonl', marks: 2 },
    { id: 'b', name: '', file: 'b.jsonl' },                 // no name
    { id: 'c', name: 'C', file: '../c.jsonl' },             // out of the folder
    { id: 'd', name: 'D', file: 'sub/d.jsonl' },            // a path is not a file name
    { id: 'e', name: 'E', file: 'e.txt' },                  // not a log
    { id: 'f', name: 'F', file: 'https://x.test/f.jsonl' }, // another site's
    { id: 'a', name: 'again', file: 'a.jsonl' },            // twice
    { id: 'g', name: 'G', file: 'g.jsonl', marks: -3 },
  ] });
  assert.deepEqual(rows.map((r) => r.id), ['a', 'g']);
  assert.equal(rows[0].says, '');
  assert.equal(rows[1].words, '', 'a count that makes no sense is not shown as one');
});

test('the name of a board made from an example: named for it, and a second is numbered — a name in the trash is taken', () => {
  const row = B.exampleRows(INDEX)[0];
  assert.equal(B.exampleName([], row), 'Flowchart example');
  const one = [board('a', 'My board'), board('b', 'Flowchart example')];
  assert.equal(B.exampleName(one, row), 'Flowchart example 2');
  const two = one.concat([board('c', 'Flowchart example 2', { trashed: 5 })]);
  assert.equal(B.exampleName(two, row), 'Flowchart example 3');
  assert.equal(B.exampleName([{ id: 'folder:x', kind: 'folder', name: 'Flowchart example' }], row), 'Flowchart example', 'a place is not a board');
});

test('the starter is the index\'s own choice when it can be opened; else the first example; else none', () => {
  assert.equal(B.starterOf(INDEX), 'molecule');
  assert.equal(B.starterOf({ starter: 'gone', examples: INDEX.examples }), 'flowchart');
  assert.equal(B.starterOf({ examples: INDEX.examples.slice(1) }), 'molecule');
  assert.equal(B.starterOf({ starter: 'x', examples: [] }), null);
  assert.equal(B.starterOf(null), null);
});

// ----- Kept on the iPad (PLAN-IPAD-NOTES I3): the browser's room, said in words, and when to ask for it -----

test('room in words: bytes as a person says them — KB, MB with a decimal only while small, GB', () => {
  assert.equal(B.spaceWords(0), 'nothing');
  assert.equal(B.spaceWords(600), 'under 1 KB');
  assert.equal(B.spaceWords(300 * 1024), '300 KB');
  assert.equal(B.spaceWords(12.4 * 1024 * 1024), '12 MB');
  assert.equal(B.spaceWords(1.25 * 1024 * 1024), '1.3 MB');
  assert.equal(B.spaceWords(40 * 1024 ** 3), '40 GB');
  assert.equal(B.spaceWords(2.5 * 1024 ** 3), '2.5 GB');
  // Nothing a browser might answer makes it throw.
  for (const v of [undefined, null, NaN, -5, Infinity, '12']) assert.equal(typeof B.spaceWords(v), 'string');
});

test('the storage line: kept on this device with the room said, or may be cleared after a week with the way out said', () => {
  const MB = 1024 * 1024, GB = 1024 ** 3;
  // Persistent: the browser agreed to keep it.
  assert.equal(B.storageWords({ usage: 12 * MB, quota: 40 * GB, persisted: true, installed: false }), 'kept on this device — 12 MB of about 40 GB');
  // Not persistent, in a tab: Safari clears a site's storage after seven days unused.
  const tab = B.storageWords({ usage: 12 * MB, quota: 40 * GB, persisted: false, installed: false });
  assert.match(tab, /^this browser may clear it after a week unused — add to Home Screen/);
  assert.match(tab, /12 MB of about 40 GB/);
  // Installed to the Home Screen: that is the way out, so the warning goes, whatever persisted() says.
  const app = B.storageWords({ usage: 12 * MB, quota: 40 * GB, persisted: false, installed: true });
  assert.match(app, /^kept with the app on this device — 12 MB of about 40 GB/);
  assert.doesNotMatch(app, /clear/);
  // What a browser does not say is said, not guessed: no figures, no persisted().
  assert.match(B.storageWords({ usage: undefined, quota: undefined, persisted: null, installed: false }), /does not say how much room/);
  // A figure missing is left out; the sentence still stands.
  assert.equal(B.storageWords({ usage: 12 * MB, quota: undefined, persisted: true, installed: false }), 'kept on this device — 12 MB');
  // No ids, no jargon in what a person reads.
  for (const w of [tab, app]) assert.doesNotMatch(w, /IndexedDB|quota|persist/i);
});

test('asking the browser to keep the device\'s storage: once, when a board holds something, never for a figure', () => {
  const ok = { supported: true, asked: false, holds: true, mode: 'restore' };
  assert.equal(B.persistPlan(ok).ask, true);
  assert.equal(B.persistPlan(Object.assign({}, ok, { holds: false })).ask, false, 'an empty board has nothing to keep');
  assert.equal(B.persistPlan(Object.assign({}, ok, { asked: true })).ask, false, 'once per device');
  assert.equal(B.persistPlan(Object.assign({}, ok, { supported: false })).ask, false);
  // ?fresh=1 is a test\'s page; a replay, an embed, a room, a folder are not the device\'s board (boardMode 'off').
  assert.equal(B.persistPlan(Object.assign({}, ok, { mode: 'fresh' })).ask, false);
  assert.equal(B.persistPlan(Object.assign({}, ok, { mode: 'off' })).ask, false);
  // Each refusal says which, for a test and a log to read.
  assert.equal(B.persistPlan(ok).why, 'ask');
  assert.equal(B.persistPlan(Object.assign({}, ok, { asked: true })).why, 'already');
  assert.equal(B.persistPlan(Object.assign({}, ok, { mode: 'off' })).why, 'not-the-devices');
  assert.equal(B.persistPlan(Object.assign({}, ok, { holds: false })).why, 'empty');
  assert.equal(B.persistPlan({}).ask, false, 'nothing known, nothing asked');
  assert.equal(typeof B.PERSIST_KEY, 'string');
});

// The board's journal, on its own.
//
//   node --test Demos/surface/17-board.test.mjs
//
// 17-board.js is a fragment of the surface's one closure that names nothing
// outside itself — no DOM, no storage, no session (V1-PLAN R3). So it loads
// here exactly as the browser loads it (as source, inside a function body)
// and is driven with a store held in memory that behaves the way IndexedDB's
// transactions do: a record lands whole or not at all, in the order issued.
//
// Not part of the built surface — Demos/build-surface.mjs concatenates
// `/^\d\d-.*\.js$/`, which `.test.mjs` does not match.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '17-board.js'), 'utf8');
const { journalText, journalEvents, journalDiff, journalFold, legacyEventsOf, openPlan, troubleOf, troubleWords, createJournal } = new Function(
  src + '\n  return { journalText, journalEvents, journalDiff, journalFold, legacyEventsOf, openPlan, troubleOf, troubleWords, createJournal };'
)();

/** mulberry32, as the e2e and the bench use. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The session's log, as the session keeps it: one array pushed onto; a new array to undo or load. */
function fakeSession() {
  let events = [];
  let n = 0;
  return {
    get: () => events,
    stroke() { const ev = { type: 'stroke', points: [{ x: n, y: n * 2 }, { x: n + 5, y: n * 2 + 3 }], at: 1000 + n }; n++; events.push(ev); return ev; },
    other(type) { const ev = { type, at: 1000 + n++ }; events.push(ev); return ev; },
    undo() { if (events.length) events = events.slice(0, -1); },
    undoAt(i) { events = [...events.slice(0, i), ...events.slice(i + 1)]; },
    load(evs) { events = evs.map((e) => ({ ...e })); },
  };
}

/**
 * A store in memory with IndexedDB's transaction semantics: each append is
 * one transaction — it lands whole (the record added, older records deleted
 * when it compacts, the meta written) or not at all — begun in the call.
 * `fail(err, n)` makes the next n appends refuse.
 */
function memoryStore() {
  const records = new Map();
  const failing = [];
  let meta = null;
  const calls = [];
  return {
    calls,
    get meta() { return meta; },
    fail(err, n = 1) { for (let i = 0; i < n; i++) failing.push(err); },
    room() { failing.length = 0; },
    append(rec, o) {
      calls.push({ seq: rec.seq, base: rec.base, n: rec.n, compact: o.compact, meta: !!o.meta });
      const err = failing.shift();
      if (err) return Promise.reject(err);
      if (records.has(rec.seq)) return Promise.reject(Object.assign(new Error('a record under that key exists'), { name: 'ConstraintError' }));
      if (o.compact) for (const k of [...records.keys()]) if (k < rec.seq) records.delete(k);
      records.set(rec.seq, { ...rec });
      if (o.meta) meta = o.meta;
      return Promise.resolve();
    },
    records: () => [...records.values()],
    count: () => records.size,
  };
}
const tick = () => new Promise((r) => setTimeout(r, 0));
const quota = () => Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError' });

test('one event per line, and a line that does not parse is counted, not fatal', () => {
  const evs = [{ type: 'stroke', points: [{ x: 1, y: 2 }] }, { type: 'undo-free', text: 'a\nb "quoted"' }];
  const text = journalText(evs);
  assert.equal(text.split('\n').length, 3); // two lines and the trailing newline
  assert.deepEqual(journalEvents(text), { events: evs, bad: 0 });
  assert.deepEqual(journalEvents(text + '{not json\n'), { events: evs, bad: 1 });
  assert.equal(journalText([]), '');
});

test('the diff: a push is an append, an undo a cut where the event stood, a load the whole log', () => {
  const s = fakeSession();
  s.stroke(); s.stroke();
  const a = s.get();
  assert.equal(journalDiff(a, 2, a), null, 'nothing new');
  s.stroke();
  assert.deepEqual(journalDiff(a, 2, s.get()), { base: 2, events: [a[2]] }, 'it only grew');
  const before = s.get();
  s.undo();
  assert.deepEqual(journalDiff(before, 3, s.get()), { base: 2, events: [] }, 'an undo of the last');
  s.stroke(); s.stroke();
  const b = s.get();
  s.undoAt(1); // an undo that leaves a later event (a tick) in place
  assert.deepEqual(journalDiff(b, 4, s.get()), { base: 1, events: [b[2], b[3]] });
  const c = s.get();
  s.load(c);
  assert.deepEqual(journalDiff(c, 3, s.get()), { base: 0, events: s.get() }, 'a load copies every event');
  assert.deepEqual(journalDiff(c, 3, c.slice()), { base: 3, events: [] }, 'the same events in a new array: nothing to write');
});

test('the fold: appends and cuts replay into the log; a whole log starts a chain', () => {
  const recs = [
    { seq: 1, on: 1, base: 0, n: 2, text: journalText([{ i: 0 }, { i: 1 }]) },
    { seq: 2, on: 1, base: 2, n: 1, text: journalText([{ i: 2 }]) },
    { seq: 3, on: 1, base: 2, n: 0, text: '' }, // undo
    { seq: 4, on: 1, base: 2, n: 2, text: journalText([{ i: 3 }, { i: 4 }]) },
  ];
  const f = journalFold(recs.slice().reverse()); // order is the seq's, not the array's
  assert.deepEqual(f.events, [{ i: 0 }, { i: 1 }, { i: 3 }, { i: 4 }]);
  assert.equal(f.chain, 1);
  assert.equal(f.sinceFull, 3);
  assert.equal(f.lastSeq, 4);
  assert.deepEqual(f.skipped, []);
  const g = journalFold(recs.concat([{ seq: 5, on: 5, base: 0, n: 1, text: journalText([{ i: 9 }]) }, { seq: 6, on: 5, base: 1, n: 1, text: journalText([{ i: 10 }]) }]));
  assert.deepEqual(g.events, [{ i: 9 }, { i: 10 }]);
  assert.equal(g.chain, 5);
});

test('the fold never applies a record to something it was not written against', () => {
  const base = [{ seq: 1, on: 1, base: 0, n: 3, text: journalText([{ i: 0 }, { i: 1 }, { i: 2 }]) }];
  // Record 2 (base 3, one event) never landed; 3 was written on top of it.
  const hole = journalFold(base.concat([{ seq: 3, on: 1, base: 4, n: 1, text: journalText([{ i: 4 }]) }]));
  assert.deepEqual(hole.events.map((e) => e.i), [0, 1, 2]);
  assert.deepEqual(hole.skipped, [3]);
  // A whole log (seq 4) never landed; 5 continued its chain. On chain 1 its base is within
  // reach — and it must still not apply: it was written against a log the store never held.
  const chain = journalFold(base.concat([{ seq: 5, on: 4, base: 1, n: 1, text: journalText([{ i: 'x' }]) }]));
  assert.deepEqual(chain.events.map((e) => e.i), [0, 1, 2]);
  assert.deepEqual(chain.skipped, [5]);
  // A damaged record is counted.
  const bad = journalFold(base.concat([{ seq: 2, on: 1, base: 3, n: 2, text: '{"i":3}\n{broken\n' }]));
  assert.equal(bad.bad, 1);
});

test('the journal writes every change in the call that reports it, and the store folds to the log after every one', async () => {
  const rand = rng(11);
  for (let run = 0; run < 20; run++) {
    const store = memoryStore();
    const jn = createJournal(store, { compactEvery: 7 });
    const s = fakeSession();
    jn.arm({});
    for (let step = 0; step < 60; step++) {
      const r = rand();
      if (r < 0.6) s.stroke();
      else if (r < 0.8) s.undo();
      else if (r < 0.9) s.undoAt(Math.floor(rand() * Math.max(1, s.get().length)));
      else if (r < 0.95) s.load(s.get());
      else s.other('bind');
      const issued = store.calls.length;
      jn.sync(s.get());
      // Begun in the call: a record, if one was needed, is in the store before sync returns —
      // which is what lets a tab die in the next task and lose nothing.
      assert.deepEqual(journalFold(store.records()).events, s.get(), `run ${run}, step ${step}`);
      assert.ok(store.calls.length - issued <= 1, 'one record a change');
    }
    await jn.idle();
    assert.ok(store.count() <= 8, `compaction keeps the chain short (${store.count()} records)`);
  }
});

test('a push is a record of one event — nothing is rewritten', () => {
  const store = memoryStore();
  const jn = createJournal(store);
  const s = fakeSession();
  jn.arm({});
  s.stroke(); jn.sync(s.get());
  for (let i = 0; i < 50; i++) { s.stroke(); jn.sync(s.get()); }
  const appends = store.calls.slice(1);
  assert.ok(appends.every((c) => c.n === 1 && !c.compact && c.base > 0));
  assert.equal(journalFold(store.records()).events.length, 51);
});

test('a failed write is said as a trouble, retried as the whole log after the pause, and the trouble ends when that lands', async () => {
  let clock = 0;
  const heard = [];
  const store = memoryStore();
  const jn = createJournal(store, { now: () => clock, retryMs: 1500, onTrouble: (t) => heard.push(t && t.kind) });
  const s = fakeSession();
  jn.arm({});
  s.stroke(); jn.sync(s.get());
  await jn.idle();
  store.fail(quota(), 1);
  s.stroke(); jn.sync(s.get());
  await jn.idle();
  assert.deepEqual(heard, ['full']);
  assert.equal(jn.trouble.kind, 'full');
  // Within the pause, changes are held, not lost: the session has them.
  clock = 1000;
  s.stroke();
  const before = store.calls.length;
  jn.sync(s.get());
  assert.equal(store.calls.length, before, 'nothing issued inside the pause');
  // After it: the whole log, in one record.
  clock = 1600;
  s.stroke();
  jn.sync(s.get());
  const last = store.calls[store.calls.length - 1];
  assert.equal(last.base, 0);
  assert.equal(last.n, 4);
  await jn.idle();
  assert.equal(jn.trouble, null);
  assert.deepEqual(heard, ['full', null]);
  assert.deepEqual(journalFold(store.records()).events, s.get());
  assert.equal(store.count(), 1, 'the whole log compacted everything before it');
});

test('a whole log that fails takes its appends with it, and the next whole log puts it right', async () => {
  let clock = 0;
  const store = memoryStore();
  const jn = createJournal(store, { now: () => clock, retryMs: 10 });
  const s = fakeSession();
  jn.arm({});
  s.stroke(); s.stroke(); jn.sync(s.get());
  await jn.idle();
  s.load(s.get()); // copies: the whole log again
  store.fail(quota(), 1);
  jn.sync(s.get()); // the whole log — refused
  s.stroke(); jn.sync(s.get()); // an append on its chain, issued before the refusal is heard
  await jn.idle();
  const f = journalFold(store.records());
  assert.equal(f.events.length, 2, 'the append on the refused chain is not applied');
  assert.equal(f.skipped.length, 1);
  assert.equal(jn.trouble.kind, 'full');
  clock = 100;
  jn.flush(s.get());
  await jn.idle();
  assert.equal(jn.trouble, null);
  assert.deepEqual(journalFold(store.records()).events, s.get());
});

test('failures at random: whenever the trouble is over, the store holds the log exactly', async () => {
  const rand = rng(5);
  for (let run = 0; run < 25; run++) {
    let clock = 0;
    const store = memoryStore();
    const jn = createJournal(store, { now: () => clock, retryMs: 5, compactEvery: 9 });
    const s = fakeSession();
    jn.arm({});
    for (let step = 0; step < 80; step++) {
      clock += 1 + Math.floor(rand() * 4);
      const r = rand();
      if (r < 0.65) s.stroke(); else if (r < 0.85) s.undo(); else s.load(s.get());
      if (rand() < 0.12) store.fail(quota(), 1 + Math.floor(rand() * 3));
      jn.sync(s.get());
      await tick();
    }
    // Room again, and a moment later a last try.
    store.room();
    clock += 100;
    for (let k = 0; k < 5 && (jn.trouble || jn.snapshot().inFlight); k++) { jn.flush(s.get()); await jn.idle(); clock += 10; }
    assert.equal(jn.trouble, null, `run ${run}`);
    assert.deepEqual(journalFold(store.records()).events, s.get(), `run ${run}`);
  }
});

test('opening: browser storage\'s old copy is imported once, unchanged, with the meta in the same write', async () => {
  // What browser storage held is JSON: exactly what `JSON.stringify(session.getEvents())` wrote.
  const raw = JSON.stringify([{ type: 'stroke', points: [{ x: 1.5, y: -0 }, { x: 1e21, y: 3 }], at: 1 }, { type: 'bless', name: 'Ünïcode ✓ \ud800', at: 2 }]);
  const old = JSON.parse(raw);
  const plan = openPlan({ meta: null, records: [], legacy: raw, owner: true, now: 42 });
  assert.equal(plan.from, 'browser storage');
  assert.deepEqual(plan.events, old);
  assert.equal(plan.arm.whole, true);
  assert.deepEqual(plan.arm.meta, { v: 1, created: 42, imported: 2 });
  const store = memoryStore();
  const landed = [];
  const jn = createJournal(store, { onLanded: (x) => landed.push(x) });
  jn.arm(plan.arm);
  jn.sync(plan.events.map((e) => ({ ...e }))); // the session holds copies of what was loaded
  await jn.idle();
  assert.deepEqual(store.meta, { v: 1, created: 42, imported: 2 });
  assert.equal(landed.length, 1);
  assert.ok(landed[0].whole && landed[0].meta, 'the adapter hears the import landed, and only then lets the old copy go');
  const back = journalFold(store.records()).events;
  assert.equal(JSON.stringify(back), raw, 'byte for byte');
  // Opened again: the store is the board, and the old copy is not imported a second time.
  const again = openPlan({ meta: store.meta, records: store.records(), legacy: raw, owner: true });
  assert.equal(again.from, 'store');
  assert.equal(again.arm.meta, undefined);
  assert.equal(again.arm.whole, false);
  assert.equal(again.arm.seq, 1);
});

test('opening: another tab holds the board — shown, never written; a damaged store is written whole', () => {
  const recs = [
    { seq: 1, on: 1, base: 0, n: 1, text: journalText([{ i: 0 }]) },
    { seq: 3, on: 1, base: 5, n: 1, text: journalText([{ i: 9 }]) },
  ];
  const ro = openPlan({ meta: { v: 1 }, records: recs, legacy: null, owner: false });
  assert.equal(ro.arm, null);
  assert.deepEqual(ro.events, [{ i: 0 }]);
  const own = openPlan({ meta: { v: 1 }, records: recs, legacy: null, owner: true });
  assert.deepEqual(own.damaged, { skipped: 1, bad: 0 });
  assert.equal(own.arm.whole, true);
  assert.equal(own.arm.seq, 3, 'new records are numbered past every record held, skipped or not');
  const none = openPlan({ meta: null, records: [], legacy: '{"not":"a log"}', owner: true, now: 1 });
  assert.deepEqual(none.events, []);
  assert.equal(none.from, 'nothing');
  assert.equal(legacyEventsOf('[1'), null);
  const fb = openPlan({ fallback: true, legacy: JSON.stringify([{ i: 1 }]) });
  assert.deepEqual(fb.events, [{ i: 1 }]);
  assert.equal(fb.from, 'browser storage');
});

test('troubles, in plain words, each with the way out', () => {
  assert.equal(troubleOf(quota(), 'write').kind, 'full');
  assert.equal(troubleOf(Object.assign(new Error('denied'), { name: 'SecurityError' }), 'open').kind, 'blocked');
  assert.equal(troubleOf(Object.assign(new Error('closed'), { name: 'InvalidStateError' }), 'open').kind, 'blocked');
  assert.equal(troubleOf(Object.assign(new Error('key'), { name: 'ConstraintError' }), 'write').kind, 'elsewhere');
  assert.equal(troubleOf(Object.assign(new Error('disk'), { name: 'UnknownError' }), 'write').kind, 'refused');
  assert.equal(troubleOf(new Error('gone'), 'folder').kind, 'folder');
  const full = troubleWords(troubleOf(quota(), 'write'));
  assert.equal(full.lead, "not saved — the browser's storage for this page is full");
  assert.deepEqual(full.ways, ['export', 'folder']);
  assert.match(troubleWords({ kind: 'blocked', detail: 'SecurityError' }).lead, /^not saved — this browser will not let the page keep anything/);
  assert.match(troubleWords({ kind: 'tab', detail: '' }).lead, /another tab/);
  assert.match(troubleWords({ kind: 'refused', detail: 'UnknownError: disk' }).lead, /UnknownError: disk/);
  assert.equal(troubleWords(null), null);
});

test('readonly writes nothing and remembers there is something to write; arming writes it', async () => {
  const store = memoryStore();
  const jn = createJournal(store);
  const s = fakeSession();
  s.stroke();
  const loaded = s.get();
  jn.readonly();
  assert.equal(jn.trouble.kind, 'tab');
  s.stroke();
  jn.sync(s.get());
  assert.equal(store.calls.length, 0);
  assert.equal(jn.snapshot().dirty, true);
  jn.arm({ arr: loaded, len: 1, seq: 4, chain: 4 });
  assert.equal(jn.trouble, null, 'holding the board ends the other-tab trouble');
  jn.sync(s.get());
  assert.deepEqual(store.calls, [{ seq: 5, base: 1, n: 1, compact: false, meta: false }]);
  jn.off();
  s.stroke();
  jn.sync(s.get());
  assert.equal(store.calls.length, 1, 'off: a folder or a room keeps the log now');
});

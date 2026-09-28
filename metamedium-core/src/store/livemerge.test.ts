// A room merges a line, not the board (V1-PLAN §9 R4d): `Session.rebase`,
// `LiveMerge`, and what the store tells a reader. The seeded rooms in
// room.oracle.test.ts hold all of it to the full merge in every order they
// can generate; these pin the pieces one case at a time.

import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG, type Session, type SessionEvent } from '../session/session';
import { LiveMerge } from './livemerge';
import { LiveStore, LocalHub, COVER_WAIT_MS, COVER_STAGGER_MS, type LiveLine } from './live';
import { mergeLogs } from './merge';
import { rectStroke, circleStroke, lineStroke } from '../test/strokes';

const named = (logName: string, more: Partial<typeof DEFAULT_SESSION_CONFIG> = {}) => createSession({ ...DEFAULT_SESSION_CONFIG, logName, ...more });
const mine = (s: Session) => s.getEvents().filter((e) => !e.by);
const stateOf = (s: Session) => { const st = s.getState(); return JSON.stringify({ ...st, generation: 0, nodes: [...st.nodes.values()] }); };
const tick = () => new Promise((r) => setTimeout(r, 0));

/** A hand's log of `n` boxes, each `gap` ms after the last, from `t0`. */
function drew(logName: string, n: number, t0: number, gap = 1000, x0 = 0): SessionEvent[] {
  const s = named(logName);
  for (let i = 0; i < n; i++) s.addStroke(rectStroke(x0 + i * 160, 100, 120, 80, 8), t0 + i * gap, undefined, 1);
  return mine(s);
}

/** The board a fresh session holds for `logs`, as `me` reads it. */
function oracle(logs: Record<string, readonly SessionEvent[]>, me: string) {
  const s = named(me);
  s.load(mergeLogs(logs, { me }));
  return s;
}

describe('Session.rebase', () => {
  it('nothing cut: the tail is applied as dispatch applies it — no checkpoint gone back to — and the board is the whole log replayed', () => {
    const log = drew('ada~1', 12, 1000);
    const s = named('me~1', { checkpointEvery: 4 });
    s.load(log.slice(0, 8));
    const r = s.rebase(8, log.slice(8));
    expect(r).toEqual({ cut: false, from: 8, applied: 4 });
    expect(s.getEvents()).toHaveLength(12);
    const whole = named('me~1');
    whole.load(log);
    expect(stateOf(s)).toBe(stateOf(whole));
  });

  it('something cut: back to the nearest checkpoint at or before the cut, never zero — and the board is the new log replayed', () => {
    const log = drew('ada~1', 12, 1000);
    const s = named('me~1', { checkpointEvery: 4 });
    s.load(mergeLogs({ 'ada~1': log }, { me: 'me~1' }));
    const other = drew('ben~1', 1, 6500, 1000, 2000);
    const merged = mergeLogs({ 'ada~1': log, 'ben~1': other }, { me: 'me~1' });
    const at = merged.findIndex((e) => e.origin === 'ben~1');
    expect(at).toBe(6);
    const r = s.rebase(at, merged.slice(at));
    expect(r.cut).toBe(true);
    expect(r.from).toBe(4);
    expect(r.applied).toBe(13 - 4);
    const whole = named('me~1');
    whole.load(merged);
    expect(JSON.stringify(s.getEvents())).toBe(JSON.stringify(whole.getEvents()));
    expect(stateOf(s)).toBe(stateOf(whole));
  });

  it('the board is not replaced: generation stands for authored events, and moves when the replay holds one minted off the counter', () => {
    const s = named('me~1', { checkpointEvery: 3 });
    s.load(drew('ada~1', 5, 1000));
    const g0 = s.getState().generation;
    s.rebase(5, drew('ada~1', 6, 1000).slice(5));
    expect(s.getState().generation).toBe(g0);
    s.rebase(2, s.getEvents().slice(2).reverse());
    expect(s.getState().generation).toBe(g0);
    // A mark drawn before its hand had a log name: its ids come off the replay's counter.
    const unnamed = createSession();
    unnamed.addStroke(circleStroke(900, 300, 40, 24), 1500, undefined, 1);
    s.rebase(1, [unnamed.getEvents()[0], ...s.getEvents().slice(1)]);
    expect(s.getState().generation).toBe(g0 + 1);
  });

  it('a late result about a mark still lands after an append — the board was not replaced', () => {
    const s = named('me~1');
    const ada = drew('ada~1', 2, 1000);
    s.load(ada);
    const gen = s.getState().generation;
    const target = s.getState().contentIds[0];
    s.rebase(2, drew('ada~1', 3, 1000).slice(2));
    const said = s.answer({ participantId: 'participant:local', question: 'what', text: 'a box', aboutIds: [target], at: 9000, expect: { generation: gen } });
    expect(said).not.toBeNull();
    expect(s.getState().staleResult).toBeNull();
  });

  it('leaves a checkpoint where it ended: a line crossing a mark drawn since goes back there, not to the last regular one', () => {
    const s = named('me~1', { checkpointEvery: 50 });
    const ada = drew('ada~1', 12, 1000);
    s.load(mergeLogs({ 'ada~1': ada.slice(0, 10) }, { me: 'me~1' }));
    s.rebase(10, mergeLogs({ 'ada~1': ada }, { me: 'me~1' }).slice(10)); // a line: the log is 12 long, a checkpoint at 12
    s.addStroke(circleStroke(900, 500, 40, 24), 20_000, undefined, 1); // this hand draws: 13
    const ben = drew('ben~1', 1, 19_000, 1000, 3000);
    const merged = mergeLogs({ 'ada~1': ada, 'ben~1': ben, 'me~1': mine(s) }, { me: 'me~1' });
    const r = s.rebase(12, merged.slice(12));
    expect(r).toEqual({ cut: true, from: 12, applied: 2 });
    const whole = named('me~1');
    whole.load(merged);
    expect(stateOf(s)).toBe(stateOf(whole));
  });

  it('an undo far back, past the checkpoints that keep the index, rebuilds it and reads the same', () => {
    const s = named('me~1', { checkpointEvery: 2 });
    for (let i = 0; i < 14; i++) s.addStroke(rectStroke(i * 160, (i % 3) * 140, 120, 80, 8), 1000 + i * 100, undefined, 1);
    for (let i = 0; i < 11; i++) s.undo();
    const whole = named('me~1');
    whole.load(s.getEvents());
    expect(s.getEvents()).toHaveLength(3);
    expect(stateOf(s)).toBe(stateOf(whole));
  });

  it('raises the high-water mark as a load does: the next number is past every one it was handed', () => {
    const s = named('me~1');
    s.rebase(0, [{ ...drew('me~1', 1, 1000)[0], seq: 40 }]);
    s.addStroke(lineStroke({ x: 0, y: 0 }, { x: 100, y: 0 }, 12), 2000, undefined, 1);
    expect(s.getEvents()[1].seq).toBe(41);
  });
});

describe('LiveMerge', () => {
  /** A reader: a session merged from `logs` by a LiveMerge, and the oracle beside it. */
  function reader(me = 'me~1', every = 3) {
    const session = named(me, { checkpointEvery: every });
    const merge = new LiveMerge(session, me);
    const logs: Record<string, SessionEvent[]> = {};
    const same = () => {
      const o = oracle({ ...logs, [me]: mine(session) }, me);
      expect(JSON.stringify(session.getEvents())).toBe(JSON.stringify(o.getEvents()));
      expect(stateOf(session)).toBe(stateOf(o));
    };
    return { session, merge, logs, same };
  }

  it('a line after everything held is an append: applied, nothing replayed', () => {
    const r = reader();
    r.logs['ada~1'] = drew('ada~1', 3, 1000);
    expect(r.merge.sync(r.logs).how).toBe('append');
    r.logs['ada~1'].push(...drew('ada~1', 5, 1000).slice(3));
    const rep = r.merge.sync(r.logs);
    expect(rep).toMatchObject({ how: 'append', kept: 3, applied: 2, rebuilt: false });
    r.same();
  });

  it('a line whose event falls before events already applied is a cut, from the nearest checkpoint', () => {
    const r = reader('me~1', 2);
    r.logs['ada~1'] = drew('ada~1', 8, 1000);
    r.merge.sync(r.logs);
    r.logs['ben~1'] = drew('ben~1', 1, 5500, 1000, 3000);
    const rep = r.merge.sync(r.logs);
    expect(rep.how).toBe('cut');
    expect(rep.kept).toBe(5);
    expect(rep.from).toBe(4);
    r.same();
  });

  it('this hand draws between lines: its marks join the merge where their time puts them', () => {
    const r = reader();
    r.logs['ada~1'] = drew('ada~1', 2, 1000);
    r.merge.sync(r.logs);
    r.session.addStroke(circleStroke(600, 400, 40, 24), 1500, undefined, 1); // before ada's second
    r.session.addStroke(circleStroke(700, 400, 40, 24), 9000, undefined, 1); // after everything
    const rep = r.merge.sync(r.logs);
    expect(rep.how).toBe('cut');
    expect(rep.kept).toBe(1);
    r.same();
    r.session.addStroke(circleStroke(800, 400, 40, 24), 10000, undefined, 1);
    expect(r.merge.sync(r.logs).how).toBe('none'); // already where the merge puts it
    r.same();
  });

  it('a whole log in place of the one held — the writer undid — is matched by authorship until they part', () => {
    const r = reader();
    const ada = drew('ada~1', 4, 1000);
    r.logs['ada~1'] = ada;
    r.logs['ben~1'] = drew('ben~1', 2, 1500, 3000, 2000);
    r.merge.sync(r.logs);
    r.logs['ada~1'] = ada.slice(0, 3).map((e) => ({ ...e })); // a new array, new objects, one event fewer
    const rep = r.merge.sync(r.logs);
    expect(rep.how).toBe('cut');
    r.same();
  });

  it('one event in two logs stands once; the reader\'s own copy stands over another\'s', () => {
    const r = reader('ann~1');
    const john = drew('john~1', 2, 1000);
    r.logs['john~1'] = john;
    r.merge.sync(r.logs);
    // The same events under another name: a tab joined again as someone else.
    r.logs['zed~1'] = john.map((e) => ({ ...e }));
    expect(r.merge.sync(r.logs).how).toBe('none');
    r.same();
    // An earlier name holding the same events: its copy is first in the order now.
    r.logs['abe~1'] = john.map((e) => ({ ...e }));
    expect(r.merge.sync(r.logs).how).toBe('cut');
    r.same();
    // And the reader's own copy stands over everyone's.
    const s2 = reader('john~1');
    s2.session.load(john);
    s2.logs['abe~1'] = john.map((e) => ({ ...e }));
    s2.merge.sync(s2.logs);
    s2.same();
    expect(s2.session.getEvents().every((e) => !e.by)).toBe(true);
  });

  it('the session\'s log changed under it — an undo took another hand\'s mark — is read again whole, and the mark comes back', () => {
    const r = reader();
    r.logs['ada~1'] = drew('ada~1', 3, 1000);
    r.merge.sync(r.logs);
    r.session.undo(); // the last event on the board is ada's
    expect(r.session.getEvents()).toHaveLength(2);
    const rep = r.merge.sync(r.logs);
    expect(rep).toMatchObject({ rebuilt: true, how: 'append', kept: 2, applied: 1 });
    r.same();
  });

  it('a first sync over a board a load just made takes the load\'s events as they are: nothing handed over', () => {
    const r = reader();
    r.logs['ada~1'] = drew('ada~1', 3, 1000);
    r.session.load(mergeLogs({ ...r.logs, 'me~1': [] }, { me: 'me~1' }));
    const rep = r.merge.sync(r.logs);
    expect(rep).toMatchObject({ how: 'none', rebuilt: true, kept: 3 });
    r.logs['ada~1'].push(...drew('ada~1', 4, 1000).slice(3));
    expect(r.merge.sync(r.logs)).toMatchObject({ how: 'append', rebuilt: false, applied: 1 });
    r.same();
  });

  it('events with no authorship are matched by what they say', () => {
    const r = reader();
    const old = createSession();
    old.addStroke(rectStroke(0, 0, 100, 60, 8), 1000, undefined, 1);
    old.addStroke(rectStroke(200, 0, 100, 60, 8), 2000, undefined, 1);
    r.logs['old'] = old.getEvents().slice();
    r.merge.sync(r.logs);
    r.logs['old'] = old.getEvents().map((e) => JSON.parse(JSON.stringify(e)));
    expect(r.merge.sync(r.logs).how).toBe('none');
    r.same();
  });
});

describe('what a store tells a reader', () => {
  const wire = () => {
    let cb: ((line: unknown) => void) | null = null;
    const sent: LiveLine[] = [];
    return { sent, deliver: (line: unknown) => cb && cb(line), transport: { send: (l: LiveLine) => void sent.push(l), onMessage: (fn: (line: unknown) => void) => { cb = fn; return () => { cb = null; }; } } };
  };

  it('the revision moves only when a log another hand wrote changes; the logs are held, not copied', () => {
    const w = wire();
    const store = new LiveStore(w.transport as never, 'me~1');
    const ada = drew('ada~1', 3, 1000);
    const rev = () => store.revision();
    const r0 = rev();
    w.deliver({ participant: 'ada~1', events: ada.slice(0, 2), at: 10, sid: 's-ada' });
    expect(rev()).toBe(r0 + 1);
    const held = store.heldLogs()['ada~1'];
    w.deliver({ participant: 'ada~1', events: [], at: 11, hello: true, sid: 's-ada' });
    w.deliver({ relay: 'truncated', room: 'r', dropped: 2 });
    w.deliver({ participant: 'ada~1', events: ada.slice(0, 2).map((e) => ({ ...e })), at: 12, full: true, sid: 's-ada' });
    expect(rev()).toBe(r0 + 1); // nothing changed: a hello, the relay's word, a whole log equal to the one held
    expect(store.heldLogs()['ada~1']).toBe(held);
    w.deliver({ participant: 'ada~1', events: ada.slice(), at: 13, full: true, sid: 's-ada' });
    expect(rev()).toBe(r0 + 2); // a whole log that runs on past the one held: taken as an append
    expect(store.heldLogs()['ada~1']).toBe(held);
    expect(held).toHaveLength(3);
    w.deliver({ participant: 'ada~1', events: ada.slice(0, 1), at: 14, full: true, sid: 's-ada' });
    expect(rev()).toBe(r0 + 3); // an undo: a new array
    expect(store.heldLogs()['ada~1']).not.toBe(held);
    w.deliver({ participant: 'ada~1', events: ada.slice(0, 1), at: 15, sid: 's-ada' });
    expect(rev()).toBe(r0 + 3); // an event already held is held once
    void store.publish(drew('me~1', 1, 5000));
    expect(rev()).toBe(r0 + 3); // this hand's own log is the session's business
  });

  it('a hello is answered once per log: every hand answers for its own, and no hand sends another\'s while its writer is here', async () => {
    const hub = new LocalHub();
    const names = ['h1~a', 'h2~a', 'h3~a', 'h4~a', 'h5~a'];
    const waits: (() => void)[] = [];
    const later = (fn: () => void) => { waits.push(fn); return () => {}; };
    const stores = names.map((n) => new LiveStore(hub.connect(), n, 'r', { later }));
    for (let i = 0; i < names.length; i++) await stores[i].publish(drew(names[i], 2, 1000 + i * 10));
    await tick(); await tick();
    const got: LiveLine[] = [];
    const t = hub.connect();
    const onLine = t.onMessage;
    const newcomer = new LiveStore({ send: t.send, onMessage: (fn) => onLine((l) => { got.push(l as LiveLine); fn(l); }) }, 'new~a', 'r', { later });
    newcomer.hello();
    await tick(); await tick();
    for (const go of waits.splice(0)) go(); // every wait runs out
    await tick(); await tick();
    const wholes = got.filter((l) => l.full);
    expect(wholes.map((l) => l.participant).sort()).toEqual(names);
    expect(wholes.every((l) => !l.via)).toBe(true);
    const logs = await newcomer.readLogs();
    for (const n of names) expect(logs[n]).toHaveLength(2);
  });

  it('a hand that said goodbye is answered for once, by the first of the hands that hold it — at once', async () => {
    const hub = new LocalHub();
    const names = ['h1~b', 'h2~b', 'h3~b', 'h4~b'];
    const later = () => () => {};
    const stores = names.map((n) => new LiveStore(hub.connect(), n, 'r', { later }));
    for (let i = 0; i < names.length; i++) await stores[i].publish(drew(names[i], 2, 1000 + i * 10));
    await tick(); await tick();
    stores[0].close(); // h1 leaves, and says so
    await tick();
    const got: LiveLine[] = [];
    const t = hub.connect();
    const newcomer = new LiveStore({ send: t.send, onMessage: (fn) => t.onMessage((l) => { got.push(l as LiveLine); fn(l); }) }, 'new~b', 'r', { later });
    newcomer.hello();
    await tick(); await tick(); await tick();
    const copies = got.filter((l) => l.full && l.participant === 'h1~b');
    expect(copies).toHaveLength(1);
    expect(copies[0].via).toBe('h2~b'); // the first by name of those still here
    expect((await newcomer.readLogs())['h1~b']).toHaveLength(2);
  });

  it('a hand that vanished without a word is answered for after the wait, once — the others hear the first copy go', async () => {
    const hub = new LocalHub();
    const names = ['h1~c', 'h2~c', 'h3~c', 'h4~c'];
    const timers: { due: number; fn: () => void }[] = [];
    let now = 0;
    const later = (fn: () => void, ms: number) => { timers.push({ due: now + ms, fn }); return () => {}; };
    const stores = names.map((n) => new LiveStore(hub.connect(), n, 'r', { later }));
    for (let i = 0; i < names.length; i++) await stores[i].publish(drew(names[i], 2, 1000 + i * 10));
    await tick(); await tick();
    (stores[0] as unknown as { off: () => void }).off(); // gone, no goodbye: a killed tab
    const got: LiveLine[] = [];
    const t = hub.connect();
    const newcomer = new LiveStore({ send: t.send, onMessage: (fn) => t.onMessage((l) => { got.push(l as LiveLine); fn(l); }) }, 'new~c', 'r', { later });
    newcomer.hello();
    await tick(); await tick();
    expect(got.filter((l) => l.participant === 'h1~c')).toHaveLength(0); // waited for h1 to answer for itself
    // Run the waits out in the order they fall due.
    timers.sort((a, b) => a.due - b.due);
    for (const x of timers.splice(0)) { now = x.due; x.fn(); await tick(); await tick(); }
    const copies = got.filter((l) => l.full && l.participant === 'h1~c');
    expect(copies).toHaveLength(1);
    expect(copies[0].via).toBe('h2~c'); // h1 was first in the order, and never answered
    expect((await newcomer.readLogs())['h1~c']).toHaveLength(2);
    expect(COVER_WAIT_MS).toBeGreaterThan(COVER_STAGGER_MS * 4);
  });

  it('two different events under one number are said as they land, with the merge\'s choice of which is kept', () => {
    const w = wire();
    const store = new LiveStore(w.transport as never, 'carl~c3');
    const one = named('ada~a1');
    one.addStroke(rectStroke(100, 100, 200, 120, 8), 1000, undefined, 1);
    const two = named('ada~a1');
    two.addStroke(circleStroke(600, 160, 60, 24), 500, undefined, 1);
    w.deliver({ participant: 'ada~a1', events: mine(one), at: 1000, sid: 's1' });
    expect(store.notices()).toEqual([]);
    w.deliver({ participant: 'bea~b2', events: mine(two), at: 1500, sid: 's2' });
    const said = store.notices();
    expect(said).toHaveLength(1);
    // bea's copy is at 500, ada's at 1000: the merge keeps bea's.
    expect(said[0]).toMatch(/the one in bea~b2's log is kept and the one in ada~a1's is left out/);
  });
});

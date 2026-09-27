// Two hands on one canvas: two logs arriving live, merged like a folder's.

import { describe, it, expect, vi } from 'vitest';
import { LiveStore, LocalHub, SEND_WAIT_MS } from './live';
import { mergeLogs } from './merge';
import { createSession, DEFAULT_SESSION_CONFIG, type SessionEvent } from '../session/session';
import { rectStroke, circleStroke } from '../test/strokes';
import { authorOf } from '../session/nodes';

const tick = () => new Promise((r) => setTimeout(r, 0));

/** A transport a test speaks into directly, so a line can be put on the wire by hand. */
function wire() {
  let cb: ((line: any) => void) | null = null;
  const sent: any[] = [];
  return {
    sent,
    deliver: (line: any) => cb && cb(line),
    transport: { send: (l: any) => sent.push(l), onMessage: (fn: any) => { cb = fn; return () => { cb = null; }; } },
  };
}

function eventsOf(fn: (s: ReturnType<typeof createSession>) => void) {
  const s = createSession();
  fn(s);
  return s.getEvents();
}

describe('live logs', () => {
  it('an append on one store lands on the other, under its own participant, and presence says who was heard', async () => {
    const hub = new LocalHub();
    const a = new LiveStore(hub.connect(), 'alice');
    const b = new LiveStore(hub.connect(), 'bob');
    const heard: string[] = [];
    b.subscribe((who, evs) => heard.push(who + ':' + evs.length));
    await a.appendLog('alice', eventsOf((s) => s.addStroke(rectStroke(100, 100, 200, 120), 1000)));
    await tick();
    const logs = await b.readLogs();
    expect(Object.keys(logs).sort()).toEqual(['alice', 'bob']);
    expect(logs.alice).toHaveLength(1);
    expect(heard).toEqual(['alice:1']);
    expect(b.presence().map((p) => p.participant)).toEqual(['alice']);
    expect(a.capabilities()).toEqual({ write: true, watch: true });
  });

  it('a newcomer says hello and gets every log in full', async () => {
    const hub = new LocalHub();
    const a = new LiveStore(hub.connect(), 'alice');
    await a.appendLog('alice', eventsOf((s) => { s.addStroke(rectStroke(100, 100, 200, 120), 1000); s.addStroke(circleStroke(400, 160, 40), 1100); }));
    const late = new LiveStore(hub.connect(), 'carol');
    late.hello();
    await tick(); await tick();
    const logs = await late.readLogs();
    expect(logs.alice).toHaveLength(2);
    expect(a.presence().map((p) => p.participant)).toEqual(['carol']);
  });

  it('merged with `me`, another hand\'s events are stamped and the session attributes them to a participant of that name, in its own colour', async () => {
    const hub = new LocalHub();
    const a = new LiveStore(hub.connect(), 'alice');
    const b = new LiveStore(hub.connect(), 'bob');
    await a.appendLog('alice', eventsOf((s) => s.addStroke(rectStroke(100, 100, 200, 120), 1000)));
    await b.appendLog('bob', eventsOf((s) => s.addStroke(circleStroke(500, 160, 40), 1200)));
    await tick();
    const merged = mergeLogs(await b.readLogs(), { me: 'bob' });
    expect(merged.map((e) => e.by ?? '-')).toEqual(['alice', '-']);
    const s = createSession();
    s.load(merged);
    const st = s.getState();
    expect(st.contentIds).toHaveLength(2);
    const [theirs, mine] = st.contentIds.map((id) => st.nodes.get(id)!);
    expect(authorOf(theirs)).toBe('participant:hand:alice');
    expect(authorOf(mine)).toBe('participant:local');
    expect(st.participants).toContain('participant:hand:alice');
    // The hand is a participant node like any other, named for its log, and made only once.
    const again = await b.readLogs();
    s.load(mergeLogs({ alice: again.alice, bob: [] }, { me: 'bob' }));
    expect(s.getState().participants.filter((p) => p === 'participant:hand:alice')).toHaveLength(1);
  });

  // ===== Two logs under one name (NOTES-DRAWING-WITH-THE-HAND §1) ============
  // An append-only log cannot disagree with itself, so a `full` that diverges
  // from what is held under the same name is two hands answering to one.
  describe('a name collision', () => {
    const drew = (x: number) => eventsOf((s) => s.addStroke(rectStroke(x, 100, 200, 120), 1000 + x));

    it('a shorter `full` that diverges is a collision: what is held is kept, and it says so', async () => {
      const w = wire();
      const store = new LiveStore(w.transport as any, 'me');
      const alice = drew(100).concat(drew(300));
      w.deliver({ participant: 'alice', events: alice, at: 1000 });
      w.deliver({ participant: 'alice', events: drew(700), at: 2000, full: true });
      const logs = await store.readLogs();
      expect(logs.alice).toEqual(alice); // refused — refusing is the only answer that cannot lose work
      expect(store.collisions()).toHaveLength(1);
      expect(store.collisions()[0]).toMatch(/two hands are both called "alice"/);
      expect(store.collisions()[0]).toMatch(/from event 1/);
    });

    it('a shorter `full` that is a prefix is a reset, not a collision', async () => {
      const w = wire();
      const store = new LiveStore(w.transport as any, 'me');
      const first = drew(100);
      w.deliver({ participant: 'alice', events: first.concat(drew(300)), at: 1000 });
      w.deliver({ participant: 'alice', events: first, at: 2000, full: true });
      const logs = await store.readLogs();
      expect(logs.alice).toEqual(first);
      expect(store.collisions()).toEqual([]);
    });

    it('a `full` that CONTAINS what is held is one hand mid-stream, not two: a late arrival hears a suffix', async () => {
      const w = wire();
      const store = new LiveStore(w.transport as any, 'me');
      const whole = drew(100).concat(drew(300)).concat(drew(700));
      // Everything this hand heard after it arrived — the tail of alice's log.
      w.deliver({ participant: 'alice', events: whole.slice(2), at: 1000 });
      w.deliver({ participant: 'alice', events: whole, at: 2000, full: true });
      expect((await store.readLogs()).alice).toEqual(whole);
      expect(store.collisions()).toEqual([]);
    });

    it('a `full` older than what has already landed is a stale replay, and installs nothing', async () => {
      const w = wire();
      const store = new LiveStore(w.transport as any, 'me');
      const now = drew(100).concat(drew(300));
      w.deliver({ participant: 'alice', events: now, at: 5000 });
      // The relay's buffer, replayed out of its moment: alice's log as it was.
      w.deliver({ participant: 'alice', events: drew(100), at: 1000, full: true });
      expect((await store.readLogs()).alice).toEqual(now);
      expect(store.collisions()).toEqual([]);
    });
  });

  // ===== Ids that hold (DIRECTOR-PLAN-W2 L1) ==================================
  // Every room harness before this was two parties, both alive. A fix proven
  // only there is the fix that failed: here one hand has left, and the one
  // that joins after it must still hold what it drew — its undo included.
  describe('a room of three, one departed', () => {
    const named = (logName: string) => createSession({ ...DEFAULT_SESSION_CONFIG, logName });
    const mine = (s: ReturnType<typeof createSession>) => s.getEvents().filter((e) => !e.by);
    /** One mark in a named hand's log, as that hand wrote it. */
    const drewBy = (logName: string, x: number) => { const s = named(logName); s.addStroke(rectStroke(x, 100, 200, 120), 1000 + x); return mine(s); };
    /** The store's flush: a hand's whole log as it stands, sent as whatever makes the room's copy equal it. */
    const publish = (store: LiveStore, events: readonly SessionEvent[]) => store.publish(events);

    it('A appends three, answers a hello in full, appends two, undoes one and leaves; C, joining after, holds A’s final four', async () => {
      const hub = new LocalHub();
      const ada = named('ada~1');
      const a = new LiveStore(hub.connect(), 'ada~1', 'r');
      for (let i = 0; i < 3; i++) {
        ada.addStroke(rectStroke(100 + i * 300, 100, 200, 120), 1000 + i * 100);
        await a.appendLog('ada~1', mine(ada).slice(-1));
      }
      // B arrives, says hello, and A answers with its whole log.
      const bob = named('bob~1');
      const b = new LiveStore(hub.connect(), 'bob~1', 'r');
      b.hello();
      await tick(); await tick();
      expect((await b.readLogs())['ada~1']).toEqual(mine(ada));
      bob.addStroke(circleStroke(400, 600, 50), 1500);
      await publish(b, mine(bob));
      // A draws two more, takes the last back, and leaves.
      ada.addStroke(rectStroke(100, 400, 200, 120), 2000);
      await publish(a, mine(ada));
      ada.addStroke(rectStroke(400, 400, 200, 120), 2100);
      await publish(a, mine(ada));
      ada.undo();
      await publish(a, mine(ada));
      await tick(); await tick();
      a.close();
      const final = mine(ada);
      expect(final).toHaveLength(4);
      // C joins after A has gone: only B can tell it what A drew.
      const c = new LiveStore(hub.connect(), 'cleo~1', 'r');
      c.hello();
      await tick(); await tick(); await tick();
      const logs = await c.readLogs();
      expect(logs['ada~1']).toEqual(final);
      expect(logs['bob~1']).toEqual(mine(bob));
      expect((await b.readLogs())['ada~1']).toEqual(final);
      // B told C about A; A is not said to be here.
      expect(c.presence().map((p) => p.participant)).toEqual(['bob~1']);
    });

    it('two stores under one name: BOTH hands that share it learn it, and so does the room', async () => {
      const hub = new LocalHub();
      const drew = (x: number) => eventsOf((s) => s.addStroke(rectStroke(x, 100, 200, 120), 1000 + x));
      const x1 = new LiveStore(hub.connect(), 'x~1', 'r');
      const b = new LiveStore(hub.connect(), 'b~1', 'r');
      await x1.appendLog('x~1', drew(100));
      await tick();
      // A second hand comes up under the same name — a tab duplicated with its
      // storage, a restart that reused a suffix — and says hello, then draws.
      const x2 = new LiveStore(hub.connect(), 'x~1', 'r');
      x2.hello();
      await tick(); await tick();
      await x2.appendLog('x~1', drew(700));
      await tick(); await tick();
      for (const store of [x1, x2, b]) {
        expect(store.collisions()).toHaveLength(1);
        expect(store.collisions()[0]).toMatch(/two hands are both called "x~1"/);
      }
      // What the room heard first is kept; the second hand's lines are refused.
      expect((await b.readLogs())['x~1']).toEqual(drew(100));
    });

    it('a hand’s own lines come back from a relay, and are neither a collision nor held twice', async () => {
      // A relay writes every line back to its sender, and replays them on a
      // reconnect. Checking my own name before discarding it must not mistake
      // my own echo for a second hand.
      let cb: ((line: any) => void) | null = null;
      const echo = { send: (line: any) => { const copy = JSON.parse(JSON.stringify(line)); queueMicrotask(() => cb && cb(copy)); }, onMessage: (fn: any) => { cb = fn; return () => { cb = null; }; } };
      const ada = named('ada~1');
      const a = new LiveStore(echo as any, 'ada~1', 'r');
      ada.addStroke(rectStroke(100, 100, 200, 120), 1000);
      await publish(a, mine(ada));
      a.hello();
      ada.addStroke(rectStroke(400, 100, 200, 120), 1100);
      await publish(a, mine(ada));
      await tick(); await tick();
      expect(a.collisions()).toEqual([]);
      expect((await a.readLogs())['ada~1']).toEqual(mine(ada));
      // Nor is a log it handed on to a newcomer, when that comes back too.
      const bob = drewBy('bob~1', 900);
      cb!({ participant: 'bob~1', events: bob, at: 5000, sid: 's-bob' });
      await tick();
      const landed: string[] = [];
      a.subscribe((who, evs) => { if (evs.length) landed.push(who); });
      cb!({ participant: 'cleo~1', events: [], at: 6000, hello: true, sid: 's-cleo' });
      await tick(); await tick();
      expect(landed).toEqual([]);
      expect((await a.readLogs())['bob~1']).toEqual(bob);
      expect(a.collisions()).toEqual([]);
    });

    it('publish sends the new tail when the log only grew, and the whole log when it did not', async () => {
      const sent: any[] = [];
      const store = new LiveStore({ send: (l) => void sent.push(l), onMessage: () => () => {} }, 'ada~1', 'r');
      const ada = named('ada~1');
      ada.addStroke(rectStroke(100, 100, 200, 120), 1000);
      await publish(store, mine(ada)); // a store's first send is whole: a hand joining again in its sitting replaces what the room holds
      ada.addStroke(rectStroke(400, 100, 200, 120), 1100);
      await publish(store, mine(ada));
      await publish(store, mine(ada)); // nothing new, nothing sent
      ada.undo();
      await publish(store, mine(ada));
      ada.addStroke(rectStroke(700, 100, 200, 120), 1200);
      await publish(store, mine(ada)); // grew again from what was last sent
      expect(sent.map((l) => (l.full ? 'full' : 'append') + ':' + l.events.length)).toEqual(['full:1', 'append:1', 'full:1', 'append:1']);
      expect(sent.every((l) => l.sid === store.sitting && l.participant === 'ada~1')).toBe(true);
    });

    it('an event handed on in a peer’s copy before the writer’s own line lands is held once', async () => {
      const w = wire();
      const store = new LiveStore(w.transport as any, 'me~1');
      const ada = named('ada~1');
      ada.addStroke(rectStroke(100, 100, 200, 120), 1000);
      ada.addStroke(rectStroke(400, 100, 200, 120), 1100);
      const log = mine(ada);
      w.deliver({ participant: 'ada~1', events: log, at: 2000, full: true, sid: 's-ada', via: 'bob~1' });
      // The peer that handed it on is the one heard from, not the writer…
      expect(store.presence().map((p) => p.participant)).toEqual(['bob~1']);
      w.deliver({ participant: 'ada~1', events: log.slice(1), at: 2000, sid: 's-ada' });
      expect((await store.readLogs())['ada~1']).toEqual(log);
      // …until her own line lands.
      expect(store.presence().map((p) => p.participant).sort()).toEqual(['ada~1', 'bob~1']);
    });

    it('a peer’s copy older than what already landed from the writer installs nothing', async () => {
      const w = wire();
      const store = new LiveStore(w.transport as any, 'me~1');
      const ada = named('ada~1');
      ada.addStroke(rectStroke(100, 100, 200, 120), 1000);
      ada.addStroke(rectStroke(400, 100, 200, 120), 1100);
      const log = mine(ada);
      w.deliver({ participant: 'ada~1', events: log, at: 5000, full: true, sid: 's-ada' });
      w.deliver({ participant: 'ada~1', events: log.slice(0, 1), at: 3000, full: true, sid: 's-ada', via: 'bob~1' });
      expect((await store.readLogs())['ada~1']).toEqual(log);
    });

    it('lines leave in the order they were written — and a send that never settles does not wedge the next', async () => {
      vi.useFakeTimers();
      try {
        const went: string[] = [];
        let release: (() => void) | null = null;
        const sends: ((line: any) => Promise<void>)[] = [
          () => new Promise<void>((ok) => { release = ok; }), // the first POST takes its time
          () => Promise.resolve(),
          () => new Promise<void>(() => {}),                 // this one never settles
          () => Promise.resolve(),
        ];
        const slow = { send: (line: any) => { went.push(line.full ? 'full' : 'append:' + line.events.length); return sends[went.length - 1](line); }, onMessage: () => () => {} };
        const store = new LiveStore(slow as any, 'ada~1');
        const ada = named('ada~1');
        ada.addStroke(rectStroke(100, 100, 200, 120), 1000);
        const first = publish(store, mine(ada));
        ada.addStroke(rectStroke(400, 100, 200, 120), 1100);
        const second = publish(store, mine(ada));
        await Promise.resolve();
        expect(went).toEqual(['full']); // the append waits for the full to have gone
        release!();
        await first; await second;
        expect(went).toEqual(['full', 'append:1']);
        ada.addStroke(rectStroke(700, 100, 200, 120), 1200);
        const stuck = publish(store, mine(ada));
        ada.addStroke(rectStroke(100, 400, 200, 120), 1300);
        const after = publish(store, mine(ada));
        await vi.advanceTimersByTimeAsync(SEND_WAIT_MS);
        await stuck; await after;
        expect(went).toEqual(['full', 'append:1', 'append:1', 'append:1']);
      } finally {
        vi.useRealTimers();
      }
    });

    it('the relay’s word that the room outlived its buffer is a notice, beside the collisions', async () => {
      const w = wire();
      const store = new LiveStore(w.transport as any, 'me~1');
      expect(store.notices()).toEqual([]);
      w.deliver({ relay: 'truncated', room: 'r', dropped: 1, kept: 10 });
      expect(store.truncation()).toBe('the room is older than the relay remembers — 1 earlier line is gone');
      w.deliver({ relay: 'truncated', room: 'r', dropped: 12, kept: 10 });
      expect(store.notices()).toEqual(['the room is older than the relay remembers — 12 earlier lines are gone']);
    });
  });

  // ===== One event, applied once (V1-PLAN phase 0, L1b) ======================
  // An event is its authorship — the log that wrote it and its number there.
  // The same event heard in two logs is one event (the merge folds it); two
  // DIFFERENT events under one authorship mean two writers under one name, and
  // the room says so where it says everything else about itself.
  describe('one event under two logs', () => {
    const named = (logName: string) => createSession({ ...DEFAULT_SESSION_CONFIG, logName });

    it('the same event heard in two logs is not a collision', async () => {
      const w = wire();
      const store = new LiveStore(w.transport as any, 'carl~c3');
      const john = named('john~a1');
      john.addStroke(rectStroke(100, 100, 200, 120), 1000);
      const log = john.getEvents().slice();
      w.deliver({ participant: 'john~a1', events: log, at: 1000, sid: 's1' });
      // The same tab, joined again as ann: its log goes out under the new name.
      w.deliver({ participant: 'ann~a1', events: log.map((e) => ({ ...e })), at: 2000, sid: 's1', full: true });
      expect(store.notices()).toEqual([]);
    });

    it('two different events under one number, heard in two logs, raise the notice', async () => {
      const w = wire();
      const store = new LiveStore(w.transport as any, 'carl~c3');
      const one = named('ada~a1');
      one.addStroke(rectStroke(100, 100, 200, 120), 1000);
      const two = named('ada~a1');
      two.addStroke(circleStroke(600, 160, 60), 1500);
      w.deliver({ participant: 'ada~a1', events: one.getEvents().slice(), at: 1000, sid: 's1' });
      w.deliver({ participant: 'bea~b2', events: two.getEvents().slice(), at: 1500, sid: 's2' });
      const said = store.notices();
      expect(said).toHaveLength(1);
      expect(said[0]).toMatch(/"ada~a1"/);
      expect(said[0]).toMatch(/number 1/);
      // Said once, however often it is asked.
      expect(store.notices()).toEqual(said);
    });
  });

  it('a live room holds no files, and says so', async () => {
    const store = new LiveStore(new LocalHub().connect(), 'me');
    expect(await store.list()).toEqual([]);
    await expect(store.read('a.md')).rejects.toThrow(/no files/);
    await expect(store.write('a.md', '#')).rejects.toThrow(/read-only/);
  });
});

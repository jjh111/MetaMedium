// Two hands on one canvas: two logs arriving live, merged like a folder's.

import { describe, it, expect, vi } from 'vitest';
import { LiveStore, LocalHub, SEND_WAIT_MS, LINE_CHARS, RETRY_FIRST_MS } from './live';
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

    it('a relay that refused the hand’s key is a notice, in words and never with the key', async () => {
      const w = wire();
      const store = new LiveStore(w.transport as any, 'me~1');
      w.deliver({ relay: 'refused', room: 'r', status: 401 });
      expect(store.notices()).toEqual(['the relay wants a key for this room and none was given — the room is not reached']);
      w.deliver({ relay: 'refused', room: 'r', status: 403 });
      expect(store.refusal()).toBe('the relay does not take this key for this room — the room is not reached');
      expect(store.notices()).toHaveLength(1);
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

  // V1-PLAN J4: a page offers Claude Code as the model it can ask while a hand
  // that answers briefs at the seat is heard in the room.
  describe('a hand that answers at the seat says so', () => {
    it('on every line of its own — a hello, an append, a whole log, a beat, a goodbye — and presence says it', async () => {
      const w = wire();
      const hand = new LiveStore(w.transport as any, 'claude~c1', 'claude', { seat: true });
      hand.hello();
      await hand.appendLog('claude~c1', eventsOf((s) => s.addStroke(rectStroke(100, 100, 200, 120), 1000)));
      hand.here();
      await hand.publish([]);
      hand.close();
      const own = w.sent.filter((l) => l.participant === 'claude~c1');
      expect(own.length).toBe(5);
      expect(own.every((l) => l.seat === true)).toBe(true);

      const hub = new LocalHub();
      const page = new LiveStore(hub.connect(), 'john~j1', 'claude');
      const claude = new LiveStore(hub.connect(), 'claude~c1', 'claude', { seat: true });
      const other = new LiveStore(hub.connect(), 'fern~f1', 'claude');
      claude.hello();
      other.hello();
      await tick(); await tick();
      const seen = Object.fromEntries(page.presence().map((p) => [p.participant, !!p.seat]));
      expect(seen).toEqual({ 'claude~c1': true, 'fern~f1': false });
      // A goodbye takes it out of the room, seat and all.
      claude.close();
      await tick();
      expect(page.presence().map((p) => p.participant)).toEqual(['fern~f1']);
    });

    it('a copy handed on says nothing of its writer: presence is the sender\'s', async () => {
      const w = wire();
      const page = new LiveStore(w.transport as any, 'john~j1', 'claude');
      w.deliver({ participant: 'claude~c1', events: [], at: 1000, full: true, via: 'fern~f1', seat: true });
      expect(page.presence().map((p) => [p.participant, !!p.seat])).toEqual([['fern~f1', false]]);
    });

    it('a beat moves no revision and changes no log — a quiet hand is still heard', async () => {
      const hub = new LocalHub();
      const page = new LiveStore(hub.connect(), 'john~j1', 'claude');
      const claude = new LiveStore(hub.connect(), 'claude~c1', 'claude', { seat: true });
      await claude.appendLog('claude~c1', eventsOf((s) => s.addStroke(rectStroke(100, 100, 200, 120), 1000)));
      await tick();
      const rev = page.revision();
      const held = (await page.readLogs())['claude~c1'].length;
      claude.here();
      await tick();
      expect(page.revision()).toBe(rev);
      expect((await page.readLogs())['claude~c1'].length).toBe(held);
      expect(page.presence().find((p) => p.participant === 'claude~c1')?.seat).toBe(true);
    });
  });

  // ===== Nothing lost on the wire, and nobody's marks taken by a copy (MU-5, MU-7, MU-8) =====
  describe('what the room did not take is sent again, and what it never can take is said', () => {
    const named = (logName: string) => createSession({ ...DEFAULT_SESSION_CONFIG, logName });
    const mine = (s: ReturnType<typeof createSession>) => s.getEvents().filter((e) => !e.by);

    /**
     * A relay a test can break: every line POSTed resolves to what `answer` says (a SendResult), and a line it
     * takes reaches every other store on it, in order — as a relay echoes a line to everyone in the room.
     */
    function relay() {
      const members: ((line: any) => void)[] = [];
      const posted: any[] = [];
      let answer: (line: any) => { ok: boolean; status?: number; retryAfter?: number } = () => ({ ok: true });
      return {
        posted,
        set: (fn: typeof answer) => { answer = fn; },
        transport() {
          let mineCb: ((line: any) => void) | null = null;
          return {
            send: (line: any) => {
              const r = answer(line);
              posted.push({ line: JSON.parse(JSON.stringify(line)), ok: r.ok, status: r.status });
              if (r.ok) { const copy = JSON.parse(JSON.stringify(line)); for (const m of members) if (m !== mineCb) queueMicrotask(() => m(copy)); }
              return Promise.resolve(r);
            },
            onMessage: (cb: any) => { mineCb = cb; members.push(cb); return () => { mineCb = null; }; },
          };
        },
      };
    }
    /** A clock a test turns: `later` runs what is due when `run` is called. */
    function clock() {
      const due: { fn: () => void; ms: number }[] = [];
      return {
        due,
        later: (fn: () => void, ms: number) => { const job = { fn, ms }; due.push(job); return () => { const i = due.indexOf(job); if (i >= 0) due.splice(i, 1); }; },
        // Microtasks only, so a test on fake timers can turn it too.
        run: async () => { const jobs = due.splice(0); for (const j of jobs) j.fn(); for (let i = 0; i < 30; i++) await Promise.resolve(); },
      };
    }

    it('a line the room did not take is sent again, from where the room\'s copy stops, and the peer holds every mark in order', async () => {
      const r = relay();
      const c = clock();
      const ada = named('ada~1');
      const a = new LiveStore(r.transport() as any, 'ada~1', 'r', { later: c.later });
      const b = new LiveStore(r.transport() as any, 'bob~1', 'r');
      for (const x of [100, 400, 700]) {
        ada.addStroke(rectStroke(x, 100, 200, 120), 1000 + x);
        // The second line never reaches the relay: a phone between networks.
        r.set((line) => (line.events.length && line.events[0] === undefined ? { ok: true } : x === 400 ? { ok: false, status: 0 } : { ok: true }));
        await a.publish(mine(ada));
        await tick();
      }
      // The third was not sent past the hole: it waits for the second, and the room is told nothing out of order.
      expect(a.unsent()).toBe(2);
      expect(a.notices()).toEqual(['not reaching the room — what you draw is kept here and sent when it answers']);
      expect(c.due.map((d) => d.ms)).toEqual([RETRY_FIRST_MS]);
      r.set(() => ({ ok: true }));
      await c.run();
      expect(a.unsent()).toBe(0);
      expect(a.notices()).toEqual([]);
      expect((await b.readLogs())['ada~1']).toEqual(mine(ada));
    });

    it('it waits longer each time the room does not answer — 2 s, 4, 8, … — and at once when the window is back online', async () => {
      const r = relay();
      const c = clock();
      const ada = named('ada~1');
      const a = new LiveStore(r.transport() as any, 'ada~1', 'r', { later: c.later });
      r.set(() => ({ ok: false, status: 503 }));
      ada.addStroke(rectStroke(100, 100, 200, 120), 1000);
      await a.publish(mine(ada));
      await tick();
      const waits: number[] = [];
      for (let i = 0; i < 6; i++) { waits.push(c.due[0].ms); await c.run(); }
      expect(waits).toEqual([2000, 4000, 8000, 16000, 30000, 30000]);
      // Drawing while it waits sends nothing before the wait is up.
      const before = r.posted.length;
      ada.addStroke(rectStroke(400, 100, 200, 120), 1100);
      await a.publish(mine(ada));
      expect(r.posted.length).toBe(before);
      r.set(() => ({ ok: true }));
      await a.resend();
      await tick();
      expect(a.unsent()).toBe(0);
      expect(c.due).toHaveLength(0);
    });

    it('a relay that asks for a moment (429) is left alone for as long as it asked', async () => {
      const r = relay();
      const c = clock();
      const a = new LiveStore(r.transport() as any, 'ada~1', 'r', { later: c.later });
      r.set(() => ({ ok: false, status: 429, retryAfter: 7 }));
      await a.appendLog('ada~1', eventsOf((s) => s.addStroke(rectStroke(100, 100, 200, 120), 1000)));
      await tick();
      expect(c.due.map((d) => d.ms)).toEqual([7000]);
      expect(a.notices()).toEqual(['the room is taking this hand’s lines more slowly — the rest is sent in a moment']);
    });

    it('a name another hand holds (409) stops the hand sending, and is said; nothing is retried', async () => {
      const r = relay();
      const c = clock();
      const a = new LiveStore(r.transport() as any, 'ada~1', 'r', { later: c.later });
      r.set(() => ({ ok: false, status: 409 }));
      await a.appendLog('ada~1', eventsOf((s) => s.addStroke(rectStroke(100, 100, 200, 120), 1000)));
      await tick();
      expect(c.due).toHaveLength(0);
      expect(a.notices()).toEqual(['the room takes nothing more from this hand: its name there is another hand’s — reload the page to join again']);
      const n = r.posted.length;
      r.set(() => ({ ok: true }));
      await a.appendLog('ada~1', eventsOf((s) => s.addStroke(rectStroke(400, 100, 200, 120), 1100)));
      expect(r.posted.length).toBe(n);
    });

    it('a whole log longer than a line goes as a `full` and appends cut between events, and a peer holds all of it', async () => {
      const r = relay();
      const ada = named('ada~1');
      const a = new LiveStore(r.transport() as any, 'ada~1', 'r');
      const b = new LiveStore(r.transport() as any, 'bob~1', 'r');
      const pad = 'x'.repeat(Math.ceil(LINE_CHARS / 3));
      for (let i = 0; i < 8; i++) ada.label({ nodeId: ada.addStroke(rectStroke(100 + i * 300, 100, 200, 120), 1000 + i), text: pad + i, at: 2000 + i });
      const log = mine(ada);
      expect(JSON.stringify(log).length).toBeGreaterThan(2 * LINE_CHARS);
      await a.publish(log);
      await tick(); await tick();
      const lines = r.posted.map((p) => p.line);
      expect(lines.length).toBeGreaterThan(2);
      expect(lines.every((l) => JSON.stringify(l).length < LINE_CHARS + 2000)).toBe(true);
      expect(lines[0].full).toBe(true);
      expect(lines.slice(1).every((l) => !l.full)).toBe(true);
      expect((await b.readLogs())['ada~1']).toEqual(log);
    });

    it('one thing no line can carry (413) is let go of and said, and the rest of the log still goes', async () => {
      const r = relay();
      const ada = named('ada~1');
      const a = new LiveStore(r.transport() as any, 'ada~1', 'r');
      const b = new LiveStore(r.transport() as any, 'bob~1', 'r');
      r.set((line) => (JSON.stringify(line).length > 400_000 ? { ok: false, status: 413 } : { ok: true }));
      ada.addStroke(rectStroke(100, 100, 200, 120), 1000);
      const huge = ada.addStroke(rectStroke(400, 100, 200, 120), 1100);
      expect(ada.label({ nodeId: huge, text: 'y'.repeat(500_000), at: 1200 })).not.toBe(null);
      ada.addStroke(rectStroke(700, 100, 200, 120), 1300);
      await a.publish(mine(ada));
      await tick(); await tick();
      const held = (await b.readLogs())['ada~1'];
      expect(held).toEqual(mine(ada).filter((e) => e.type !== 'label'));
      expect(a.notices()).toEqual(['something on this board is 0.5 MB — more than a room carries in one piece — and was not shared']);
      expect(a.unsent()).toBe(0);
    });

    it('a send taken as gone after its wait that then fails is sent again whole — a hole is never left', async () => {
      vi.useFakeTimers();
      try {
        let settle: ((v: any) => void) | null = null;
        const posted: any[] = [];
        const t = {
          send: (line: any) => { posted.push(line.full ? 'full:' + line.events.length : 'append:' + line.events.length); return posted.length === 2 ? new Promise((ok) => { settle = ok; }) : Promise.resolve({ ok: true }); },
          onMessage: () => () => {},
        };
        const c = clock();
        const ada = named('ada~1');
        const a = new LiveStore(t as any, 'ada~1', 'r', { later: c.later });
        ada.addStroke(rectStroke(100, 100, 200, 120), 1000);
        await a.publish(mine(ada));
        ada.addStroke(rectStroke(400, 100, 200, 120), 1100);
        const slow = a.publish(mine(ada));
        await vi.advanceTimersByTimeAsync(SEND_WAIT_MS);
        await slow;
        ada.addStroke(rectStroke(700, 100, 200, 120), 1200);
        await a.publish(mine(ada));
        expect(posted).toEqual(['full:1', 'append:1', 'append:1']);
        settle!({ ok: false, status: 0 });
        await vi.advanceTimersByTimeAsync(0);
        await c.run();
        expect(posted).toEqual(['full:1', 'append:1', 'append:1', 'full:3']);
      } finally {
        vi.useRealTimers();
      }
    });

    it('a copy handed on may only add: one that leaves out marks held here is refused and said — the writer\'s own whole log still replaces', async () => {
      const w = wire();
      const store = new LiveStore(w.transport as any, 'me~1');
      const ada = named('ada~1');
      ada.addStroke(rectStroke(100, 100, 200, 120), 1000);
      ada.addStroke(rectStroke(400, 100, 200, 120), 1100);
      const log = mine(ada);
      w.deliver({ participant: 'ada~1', events: log, at: 2000, full: true, sid: 's-ada' });
      // Eve hands on "a copy" of Ada's log with nothing in it, stamped far in the future.
      w.deliver({ participant: 'ada~1', events: [], at: 9e12, full: true, sid: 's-ada', via: 'eve~1' });
      expect((await store.readLogs())['ada~1']).toEqual(log);
      expect(store.notices()).toEqual(['a copy of ada’s marks that would have taken some away was refused — what is held here is kept']);
      // A copy that only adds is taken, and its clock holds the writer back from nothing: her undo still lands.
      const more = named('ada~1');
      more.addStroke(rectStroke(100, 100, 200, 120), 1000);
      more.addStroke(rectStroke(400, 100, 200, 120), 1100);
      more.addStroke(rectStroke(700, 100, 200, 120), 1200);
      w.deliver({ participant: 'ada~1', events: mine(more), at: 9e12, full: true, sid: 's-ada', via: 'eve~1' });
      expect((await store.readLogs())['ada~1']).toHaveLength(3);
      w.deliver({ participant: 'ada~1', events: log.slice(0, 1), at: 3000, full: true, sid: 's-ada' });
      expect((await store.readLogs())['ada~1']).toEqual(log.slice(0, 1));
      // A copy that holds what is held as a suffix holds — the room's early lines gone — is taken in its place.
      const fresh = new LiveStore(wire().transport as any, 'n~1');
      const w2 = wire();
      const late = new LiveStore(w2.transport as any, 'late~1');
      w2.deliver({ participant: 'ada~1', events: mine(more).slice(2), at: 2500, sid: 's-ada' });
      w2.deliver({ participant: 'ada~1', events: mine(more), at: 2500, full: true, sid: 's-ada', via: 'bob~1' });
      expect((await late.readLogs())['ada~1']).toEqual(mine(more));
      expect(late.notices()).toEqual([]);
      fresh.close();
    });
  });
});

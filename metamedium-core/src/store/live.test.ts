// Two hands on one canvas: two logs arriving live, merged like a folder's.

import { describe, it, expect } from 'vitest';
import { LiveStore, LocalHub } from './live';
import { mergeLogs } from './merge';
import { createSession } from '../session/session';
import { rectStroke, circleStroke } from '../test/strokes';
import { authorOf } from '../session/nodes';

const tick = () => new Promise((r) => setTimeout(r, 0));

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
    /** A transport this test speaks into directly, so a `full` can be put on the wire by hand. */
    function wire() {
      let cb: ((line: any) => void) | null = null;
      const sent: any[] = [];
      return {
        sent,
        deliver: (line: any) => cb && cb(line),
        transport: { send: (l: any) => sent.push(l), onMessage: (fn: any) => { cb = fn; return () => { cb = null; }; } },
      };
    }
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

  it('a live room holds no files, and says so', async () => {
    const store = new LiveStore(new LocalHub().connect(), 'me');
    expect(await store.list()).toEqual([]);
    await expect(store.read('a.md')).rejects.toThrow(/no files/);
    await expect(store.write('a.md', '#')).rejects.toThrow(/read-only/);
  });
});

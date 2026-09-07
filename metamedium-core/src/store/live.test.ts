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

  it('a live room holds no files, and says so', async () => {
    const store = new LiveStore(new LocalHub().connect(), 'me');
    expect(await store.list()).toEqual([]);
    await expect(store.read('a.md')).rejects.toThrow(/no files/);
    await expect(store.write('a.md', '#')).rejects.toThrow(/read-only/);
  });
});

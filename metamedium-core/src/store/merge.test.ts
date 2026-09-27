import { describe, it, expect } from 'vitest';
import { mergeLogs } from './merge';
import { createSession, DEFAULT_SESSION_CONFIG } from '../session/session';
import { rectStroke, circleStroke } from '../test/strokes';

describe('mergeLogs', () => {
  it('interleaves by time, ties by name, and is order-independent', () => {
    const john = createSession();
    john.addStroke(rectStroke(100, 100, 200, 120), 1000);
    john.addStroke(rectStroke(340, 100, 200, 120), 3000);
    const laptop = createSession();
    laptop.addStroke(circleStroke(600, 160, 60), 2000);
    const a = mergeLogs({ john: john.getEvents(), laptop: laptop.getEvents() });
    const b = mergeLogs({ laptop: laptop.getEvents(), john: john.getEvents() });
    expect(a.map((e) => ('at' in e ? e.at : 0))).toEqual([1000, 2000, 3000]);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('a merged log replays into one canvas', () => {
    const john = createSession();
    john.addStroke(rectStroke(100, 100, 200, 120), 1000);
    const model = createSession();
    model.addStroke(circleStroke(600, 160, 60), 2000);
    const canvas = createSession();
    canvas.load(mergeLogs({ john: john.getEvents(), 'qwen3:8b': model.getEvents() }));
    expect(canvas.getState().contentIds).toHaveLength(2);
  });
});

// ===== One event, applied once (V1-PLAN phase 0, L1b) =========================
// An event's identity is its authorship — the log that wrote it and its number
// there (`origin`, `seq`). The same stamped event can reach a reader in two
// logs: a tab that joined the room again under another person's name hands
// its whole log on under the new name while the room still holds the old one;
// two hands that opened one folder carry the same file's events into one room.
// Merged as two events, the one mark was applied twice — one node, its id
// listed twice on the board, attributed to whichever log merged last.
describe('one event, applied once', () => {
  const named = (logName: string) => createSession({ ...DEFAULT_SESSION_CONFIG, logName });

  it('the same stamped event in two logs is merged once and applied once', () => {
    const john = named('john~a1');
    const box = john.addStroke(rectStroke(100, 100, 200, 120), 1000);
    const log = john.getEvents().slice();
    // The tab joined again as ann in the same page load: its log, with the
    // events john wrote, goes out under ann's name; the room still holds john's.
    const merged = mergeLogs({ 'john~a1': log, 'ann~a1': log.map((e) => ({ ...e })) }, { me: 'carl~c3' });
    expect(merged).toHaveLength(1);
    const canvas = named('carl~c3');
    canvas.load(merged);
    expect(canvas.getState().contentIds).toEqual([box]);
  });

  it('the reader keeps its own copy, so its own marks stay its own', () => {
    const john = named('john~a1');
    john.addStroke(rectStroke(100, 100, 200, 120), 1000);
    const log = john.getEvents().slice();
    // 'ann~a1' sorts first, but the reader's own log is the one it wrote.
    const merged = mergeLogs({ 'ann~a1': log.map((e) => ({ ...e })), 'john~a1': log }, { me: 'john~a1' });
    expect(merged).toHaveLength(1);
    expect(merged[0].by).toBeUndefined();
  });

  it('events with no authorship have no identity, and are never folded together', () => {
    const old = createSession(); // a log from before ids per hand: no origin, no seq
    old.addStroke(rectStroke(100, 100, 200, 120), 1000);
    const log = old.getEvents().slice();
    expect(log[0].origin).toBeUndefined();
    expect(mergeLogs({ a: log, b: log })).toHaveLength(2);
  });

  it('two different events under one authorship are a collision: the first is kept, and it is said', () => {
    // Two writers under one log name — the collision the id fix exists to prevent.
    const one = named('ada~a1');
    one.addStroke(rectStroke(100, 100, 200, 120), 1000);
    const two = named('ada~a1');
    two.addStroke(circleStroke(600, 160, 60), 1500);
    const said: unknown[] = [];
    const merged = mergeLogs({ x: one.getEvents(), y: two.getEvents() }, { onCollision: (c: unknown) => said.push(c) } as never);
    expect(merged).toHaveLength(1);
    expect('at' in merged[0] ? merged[0].at : 0).toBe(1000);
    expect(said).toEqual([{ origin: 'ada~a1', seq: 1, kept: 'x', dropped: 'y' }]);
  });

  it('the fold does not depend on the order the logs are listed in', () => {
    const one = named('ada~a1');
    one.addStroke(rectStroke(100, 100, 200, 120), 1000);
    const two = named('ada~a1');
    two.addStroke(circleStroke(600, 160, 60), 1500);
    const a = mergeLogs({ x: one.getEvents(), y: two.getEvents(), z: one.getEvents() });
    const b = mergeLogs({ z: one.getEvents(), y: two.getEvents(), x: one.getEvents() });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

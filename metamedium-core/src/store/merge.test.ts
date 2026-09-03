import { describe, it, expect } from 'vitest';
import { mergeLogs } from './merge';
import { createSession } from '../session/session';
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

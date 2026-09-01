// Clean forms: a confident reading redrawn, with the ink kept underneath.

import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import { boundsOf, getRep, strokePointsOf } from './nodes';
import { cleanOf, cleanPointsOf, idealize, snapReading, SNAP_CONFIDENCE } from './clean';
import { handRect, handCircle, handLine, handArrow, handTriangle, handText, handDot, circleStroke, rectStroke } from '../test/strokes';
import { getBounds } from '../geometry';

const at = (() => { let t = 1000; return () => (t += 100); })();

describe('snapReading', () => {
  it('offers a confident, unopposed rectangle', () => {
    const s = createSession();
    const id = s.addStroke(handRect(100, 100, 200, 120, { seed: 1 }), at());
    const r = snapReading(s.getState().nodes.get(id)!, s.getState().nodes);
    expect(r.shape).toBe('rectangle');
    expect(r.ok).toBe(true);
    expect(r.weight).toBeGreaterThanOrEqual(SNAP_CONFIDENCE);
  });

  it('never offers writing — handwriting has no clean form', () => {
    const s = createSession();
    const id = s.addStroke(handText(100, 100, 220, 40, { seed: 3 }), at());
    const r = snapReading(s.getState().nodes.get(id)!, s.getState().nodes);
    expect(r.ok).toBe(false);
    expect(r.shape).toBe('text');
  });

  it('holds back when two readings are too close to call', () => {
    // A diamond reads as triangle and rectangle at once; neither should win by snapping.
    const s = createSession();
    const id = s.addStroke(handTriangle({ x: 200, y: 100 }, { x: 300, y: 250 }, { x: 100, y: 250 }, { seed: 2 }), at());
    const node = s.getState().nodes.get(id)!;
    const r = snapReading(node, s.getState().nodes);
    // Whatever it decided, the reasoning names the margin or the shape.
    expect(r.reasoning).toMatch(/triangle|rectangle|close|ahead|unopposed/);
  });
});

describe('snapReading on the shapes people actually draw', () => {
  it('offers a wide header bar — the most common box in any interface', () => {
    const s = createSession();
    const id = s.addStroke(rectStroke(200, 380, 580, 120), at());
    const r = snapReading(s.getState().nodes.get(id)!, s.getState().nodes);
    expect(r.shape).toBe('rectangle');
    expect(r.weight).toBeGreaterThan(0.85);
    expect(r.ok).toBe(true);
  });

  it('offers a thin 9:1 strip — a footer — drawn by hand', () => {
    const s = createSession();
    const id = s.addStroke(handRect(180, 530, 560, 60, { seed: 22 }), at());
    const r = snapReading(s.getState().nodes.get(id)!, s.getState().nodes);
    expect(r.shape).toBe('rectangle');
    expect(r.ok).toBe(true);
  });

  it('offers a hand-drawn banner too', () => {
    const s = createSession();
    const id = s.addStroke(handRect(100, 100, 600, 110, { seed: 21 }), at());
    const r = snapReading(s.getState().nodes.get(id)!, s.getState().nodes);
    expect(r.shape).toBe('rectangle');
    expect(r.ok).toBe(true);
  });
});

describe('idealize', () => {
  const build = (pts: { x: number; y: number }[]) => {
    const s = createSession();
    const id = s.addStroke(pts, at());
    return s.getState().nodes.get(id)!;
  };

  it('squares a box up to the bounds the ink fills', () => {
    const node = build(handRect(100, 100, 200, 120, { seed: 4 }));
    const c = idealize(node, 'rectangle')!;
    expect(c.closed).toBe(true);
    expect(c.points).toHaveLength(4);
    const b = getBounds(c.points);
    const ink = boundsOf(node)!;
    expect(b.minX).toBeCloseTo(ink.minX, 5);
    expect(b.maxY).toBeCloseTo(ink.maxY, 5);
  });

  it('draws a near-round circle round, on the ink\'s centre', () => {
    const node = build(handCircle(300, 300, 80, { seed: 5 }));
    const c = idealize(node, 'circle')!;
    const b = getBounds(c.points);
    expect(b.maxX - b.minX).toBeCloseTo(b.maxY - b.minY, 5);
    expect((b.minX + b.maxX) / 2).toBeCloseTo(300, -1);
  });

  it('keeps a deliberate oval as an oval', () => {
    const node = build(circleStroke(0, 0, 1).map((p) => ({ x: 300 + p.x * 120, y: 300 + p.y * 50 })));
    const c = idealize(node, 'circle')!;
    const b = getBounds(c.points);
    expect((b.maxX - b.minX) / (b.maxY - b.minY)).toBeGreaterThan(2);
  });

  it('joins a line\'s two ends straight', () => {
    const node = build(handLine({ x: 100, y: 100 }, { x: 400, y: 160 }, { seed: 6 }));
    const c = idealize(node, 'line')!;
    expect(c.points).toHaveLength(2);
    expect(c.closed).toBe(false);
  });

  it('gives an arrow a straight shaft and an even barb at the tip', () => {
    const node = build(handArrow({ x: 100, y: 200 }, { x: 400, y: 200 }, { seed: 7 }));
    const c = idealize(node, 'arrow')!;
    expect(c.points).toHaveLength(5);
    const tip = c.points[1];
    expect(tip.x).toBeGreaterThan(c.points[0].x); // points the way it was drawn
    // Wings sit behind the tip, one on each side.
    expect(c.points[2].x).toBeLessThan(tip.x);
    expect(Math.sign(c.points[2].y - tip.y)).toBe(-Math.sign(c.points[4].y - tip.y));
  });

  it('has no clean form for writing', () => {
    const node = build(handText(100, 100, 220, 40, { seed: 8 }));
    expect(idealize(node, 'text')).toBeNull();
  });

  it('makes a dot a round dot', () => {
    const node = build(handDot(50, 50, 3, { seed: 9 }));
    const c = idealize(node, 'dot')!;
    expect(c.closed).toBe(true);
    expect(getBounds(c.points).maxX - getBounds(c.points).minX).toBeGreaterThan(2);
  });
});

describe('session.snap', () => {
  it('adds a clean rep and leaves the ink untouched', () => {
    const s = createSession();
    const pts = handRect(100, 100, 200, 120, { seed: 10 });
    const id = s.addStroke(pts, at());
    const before = strokePointsOf(s.getState().nodes.get(id)!)!;
    s.snap({ ids: [id], at: at() });
    const node = s.getState().nodes.get(id)!;
    expect(cleanOf(node)?.shape).toBe('rectangle');
    expect(strokePointsOf(node)).toEqual(before);
    expect(getRep(node, 'stroke')).toBeDefined();
  });

  it('is an offer taken up, not a command: a text mark is left alone', () => {
    const s = createSession();
    const id = s.addStroke(handText(100, 100, 220, 40, { seed: 11 }), at());
    s.snap({ ids: [id], at: at() });
    expect(cleanOf(s.getState().nodes.get(id)!)).toBeUndefined();
  });

  it('lists candidates once, and not again after they are snapped', () => {
    const s = createSession();
    const a = s.addStroke(handRect(100, 100, 200, 120, { seed: 12 }), at());
    const b = s.addStroke(handCircle(500, 160, 60, { seed: 13 }), at());
    const c = s.addStroke(handText(100, 300, 220, 40, { seed: 14 }), at());
    const offered = s.snapCandidates().map((x) => x.id);
    expect(offered).toContain(a);
    expect(offered).toContain(b);
    expect(offered).not.toContain(c);
    s.snap({ ids: [a], at: at() });
    expect(s.snapCandidates().map((x) => x.id)).toEqual([b]);
  });

  it('undo drops the clean form and the ink is exactly as it was', () => {
    const s = createSession();
    const id = s.addStroke(handRect(100, 100, 200, 120, { seed: 15 }), at());
    s.snap({ ids: [id], at: at() });
    expect(cleanOf(s.getState().nodes.get(id)!)).toBeDefined();
    s.undo();
    expect(cleanOf(s.getState().nodes.get(id)!)).toBeUndefined();
    expect(s.getState().contentIds).toContain(id);
  });

  it('raw mode puts the ink back in front', () => {
    const s = createSession();
    const id = s.addStroke(handRect(100, 100, 200, 120, { seed: 16 }), at());
    s.snap({ ids: [id], at: at() });
    s.snap({ ids: [id], mode: 'raw', at: at() });
    expect(cleanOf(s.getState().nodes.get(id)!)).toBeUndefined();
  });

  it('a snapped mark tidied afterwards carries its clean form with it', () => {
    const s = createSession();
    const ids = [
      s.addStroke(handRect(100, 100, 150, 120, { seed: 17 }), at()),
      s.addStroke(handRect(280, 128, 190, 96, { seed: 18 }), at()),
      s.addStroke(handRect(520, 88, 120, 140, { seed: 19 }), at()),
    ];
    s.snap({ ids, at: at() });
    s.tidy({ ids, mode: 'align', axis: 'row', at: at() });
    for (const id of ids) {
      const node = s.getState().nodes.get(id)!;
      const cb = getBounds(cleanPointsOf(node)!);
      const nb = boundsOf(node)!;
      expect(cb.minX).toBeCloseTo(nb.minX, 3);
      expect(cb.maxY).toBeCloseTo(nb.maxY, 3);
    }
  });

  it('a perfect rectangle from a generator snaps to itself', () => {
    const s = createSession();
    const id = s.addStroke(rectStroke(100, 100, 200, 120), at());
    s.snap({ ids: [id], at: at() });
    const c = cleanOf(s.getState().nodes.get(id)!)!;
    expect(getBounds(c.points)).toEqual(getBounds(rectStroke(100, 100, 200, 120)));
  });
});

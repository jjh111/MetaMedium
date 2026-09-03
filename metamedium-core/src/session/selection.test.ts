// Selection is the lasso that finished — and a hand can then move what it holds.

import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import { boundsOf, strokePointsOf, getRep } from './nodes';
import { cleanOf, cleanPointsOf } from './clean';
import { rectStroke, circleStroke, checkStroke, lineStroke } from '../test/strokes';
import { getBounds } from '../geometry';

function two() {
  const s = createSession();
  const a = s.addStroke(rectStroke(100, 100, 200, 120), 1000);
  const b = s.addStroke(rectStroke(340, 100, 200, 120), 1100);
  return { s, a, b };
}

describe('selection', () => {
  it('taking a loop up selects what it held, by the mark or by the chip', () => {
    const { s, a, b } = two();
    s.addStroke(circleStroke(320, 160, 300), 2000);
    s.addStroke(checkStroke(650, 160), 2500);
    expect(s.getState().selection.sort()).toEqual([a, b].sort());
    const s2 = createSession();
    const c = s2.addStroke(rectStroke(100, 100, 200, 120), 1000);
    s2.addStroke(circleStroke(200, 160, 200), 2000);
    s2.summonHeld(2500);
    expect(s2.getState().selection).toEqual([c]);
  });

  it('a hand\'s next content stroke clears it; deselect clears it; undo of deselect brings it back in place', () => {
    const { s, a, b } = two();
    s.select([a, b], 2000);
    expect(s.getState().selection).toEqual([a, b]);
    s.deselect(2100);
    expect(s.getState().selection).toEqual([]);
    s.undo();
    expect(s.getState().selection).toEqual([a, b]);
    s.addStroke(lineStroke({ x: 100, y: 400 }, { x: 300, y: 400 }), 3000);
    expect(s.getState().selection).toEqual([]);
  });

  it('selecting what is not content selects nothing', () => {
    const { s, a } = two();
    s.select([a, 'nope'], 2000);
    expect(s.getState().selection).toEqual([a]);
  });

  it('blessing a selection selects the artifact it became', () => {
    const { s } = two();
    s.addStroke(circleStroke(320, 160, 300), 2000);
    s.addStroke(checkStroke(650, 160), 2500);
    const art = s.bless({ summonId: s.getState().summon!.id, name: 'pair', at: 3000 })!;
    expect(s.getState().selection).toEqual([art]);
  });
});

describe('moving a selection', () => {
  it('move shifts the marks, keeps the ink, and undo springs back', () => {
    const { s, a, b } = two();
    const before = boundsOf(s.getState().nodes.get(a)!)!;
    const raw = (getRep(s.getState().nodes.get(a)!, 'stroke')!.data as { points: { x: number }[] }).points[0].x;
    s.move({ ids: [a, b], dx: 50, dy: -20, at: 2000 });
    const after = boundsOf(s.getState().nodes.get(a)!)!;
    expect(after.minX).toBeCloseTo(before.minX + 50, 5);
    expect(after.minY).toBeCloseTo(before.minY - 20, 5);
    expect((getRep(s.getState().nodes.get(a)!, 'stroke')!.data as { points: { x: number }[] }).points[0].x).toBe(raw);
    s.undo();
    expect(boundsOf(s.getState().nodes.get(a)!)!.minX).toBeCloseTo(before.minX, 5);
  });

  it('scale about a point, and the clean form scales with the ink', () => {
    const { s, a } = two();
    s.snap({ ids: [a], at: 1500 });
    s.scale({ ids: [a], about: { x: 100, y: 100 }, sx: 2, sy: 0.5, at: 2000 });
    const b = boundsOf(s.getState().nodes.get(a)!)!;
    expect(b.maxX - b.minX).toBeCloseTo(400, 5);
    expect(b.maxY - b.minY).toBeCloseTo(60, 5);
    expect(b.minX).toBeCloseTo(100, 5);
    const cb = getBounds(cleanPointsOf(s.getState().nodes.get(a)!)!);
    expect(cb.maxX - cb.minX).toBeCloseTo(400, 3);
    expect(cleanOf(s.getState().nodes.get(a)!)!.shape).toBe('rectangle');
  });

  it('rotate turns each mark about its centre and swings the centre about the pivot', () => {
    const { s, a } = two();
    const before = boundsOf(s.getState().nodes.get(a)!)!;
    const c = { x: (before.minX + before.maxX) / 2, y: (before.minY + before.maxY) / 2 };
    s.rotate({ ids: [a], about: c, radians: Math.PI / 2, at: 2000 });
    const after = boundsOf(s.getState().nodes.get(a)!)!;
    // A 200×120 box turned a quarter turn about its own centre is 120×200 at the same centre.
    expect(after.maxX - after.minX).toBeCloseTo(120, 3);
    expect(after.maxY - after.minY).toBeCloseTo(200, 3);
    expect((after.minX + after.maxX) / 2).toBeCloseTo(c.x, 3);
    s.rotate({ ids: [a], about: c, radians: Math.PI / 2, at: 2100 });
    const half = boundsOf(s.getState().nodes.get(a)!)!;
    expect(half.maxX - half.minX).toBeCloseTo(200, 3);
    // And a mark away from the pivot swings around it.
    const { s: s2, b } = two();
    s2.rotate({ ids: [b], about: { x: 100, y: 100 }, radians: Math.PI, at: 2000 });
    const swung = boundsOf(s2.getState().nodes.get(b)!)!;
    expect((swung.minX + swung.maxX) / 2).toBeCloseTo(100 - (440 - 100), 3);
  });

  it('moving an artifact moves its members; erasing a selected mark drops it from the selection', () => {
    const { s, a, b } = two();
    s.addStroke(circleStroke(320, 160, 300), 2000);
    s.addStroke(checkStroke(650, 160), 2500);
    const art = s.bless({ summonId: s.getState().summon!.id, name: 'pair', at: 3000 })!;
    const ba = boundsOf(s.getState().nodes.get(a)!)!;
    s.move({ ids: [art], dx: 10, dy: 10, at: 3500 });
    expect(boundsOf(s.getState().nodes.get(a)!)!.minX).toBeCloseTo(ba.minX + 10, 5);
    expect(boundsOf(s.getState().nodes.get(b)!)!.minX).toBeCloseTo(340 + 10, 5);
    const { s: s3, a: c, b: d } = two();
    s3.select([c, d], 4000);
    s3.erase(c, 4100);
    expect(s3.getState().selection).toEqual([d]);
  });

  it('the moved points are what every reading sees', () => {
    const { s, a, b } = two();
    s.move({ ids: [b], dx: 400, dy: 0, at: 2000 });
    const rel = s.read([a, b]).relations.find((r) => r.kind === 'near');
    expect(rel).toBeUndefined(); // no longer near
    expect(getBounds(strokePointsOf(s.getState().nodes.get(b)!)!).minX).toBeCloseTo(740, 5);
  });
});

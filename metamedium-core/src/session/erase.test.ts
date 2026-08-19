import { describe, it, expect } from 'vitest';
import { segmentsIntersect, countCrossings, outlineOf, scratchedOut } from './erase';
import { rectStroke, lineStroke, circleStroke, scratchStroke } from '../test/strokes';
import { getBounds } from '../geometry';

describe('segmentsIntersect', () => {
  it('detects a proper crossing', () => {
    expect(
      segmentsIntersect({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 })
    ).toBe(true);
  });

  it('rejects parallel segments', () => {
    expect(
      segmentsIntersect({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 5 }, { x: 10, y: 5 })
    ).toBe(false);
  });

  it('rejects segments that would cross only if extended', () => {
    expect(
      segmentsIntersect({ x: 0, y: 0 }, { x: 4, y: 4 }, { x: 20, y: 30 }, { x: 30, y: 20 })
    ).toBe(false);
  });
});

describe('outlineOf', () => {
  it('closes a closed stroke back to its start', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    expect(outlineOf({ points: pts, closed: true })).toHaveLength(4);
    expect(outlineOf({ points: pts, closed: false })).toHaveLength(3);
  });

  it('falls back to the bounds rectangle when there are no points', () => {
    const o = outlineOf({ bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 } })!;
    expect(o).toHaveLength(5);
    expect(o[0]).toEqual(o[4]); // closed
  });

  it('returns null for a target with neither points nor bounds', () => {
    expect(outlineOf({})).toBeNull();
  });
});

describe('scratch-out is relational, not gestural', () => {
  const box = rectStroke(100, 100, 200, 150);
  const boxTarget = { id: 'box', points: box, closed: true };

  it('a 3-pass scratch across a box erases it', () => {
    const scratch = scratchStroke(80, 130, 240, 90, 3); // overshoots both walls
    expect(scratchedOut(scratch, [boxTarget])).toEqual(['box']);
  });

  it('a line drawn THROUGH a box crosses twice and is safe', () => {
    const through = lineStroke({ x: 50, y: 175 }, { x: 350, y: 175 });
    expect(countCrossings(through, outlineOf(boxTarget)!)).toBe(2);
    expect(scratchedOut(through, [boxTarget])).toEqual([]);
  });

  it('a stroke on empty canvas erases nothing', () => {
    const elsewhere = scratchStroke(600, 600, 100, 80, 4);
    expect(scratchedOut(elsewhere, [boxTarget])).toEqual([]);
  });

  it('is scale-invariant: the same scratch works on a box 10x larger', () => {
    const big = rectStroke(0, 0, 2000, 1500);
    const bigScratch = scratchStroke(-100, 300, 2200, 900, 3);
    expect(scratchedOut(bigScratch, [{ id: 'big', points: big, closed: true }])).toEqual(['big']);
  });

  it('erases every mark the stroke crossed enough, not just the first', () => {
    const a = rectStroke(0, 0, 100, 100);
    const b = rectStroke(150, 0, 100, 100);
    const sweep = scratchStroke(-20, 20, 300, 60, 3); // spans both boxes
    const hit = scratchedOut(sweep, [
      { id: 'a', points: a, closed: true },
      { id: 'b', points: b, closed: true },
    ]);
    expect(hit.sort()).toEqual(['a', 'b']);
  });

  it('needs at least 3 points to be a scratch at all', () => {
    expect(scratchedOut([{ x: 0, y: 0 }, { x: 1, y: 1 }], [boxTarget])).toEqual([]);
  });

  it('works against a bounds-only target (an artifact has no stroke of its own)', () => {
    const b = getBounds(circleStroke(200, 200, 80));
    const scratch = scratchStroke(80, 170, 240, 60, 3);
    expect(scratchedOut(scratch, [{ id: 'artifact', bounds: b }])).toEqual(['artifact']);
  });
});

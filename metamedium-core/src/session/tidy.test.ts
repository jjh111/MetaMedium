// Tier 0 conversions: what the canvas can do for you with no model attached.

import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import { boundsOf, getRep, strokePointsOf } from './nodes';
import { handRect } from '../test/strokes';

/** Three roughly-drawn boxes, deliberately out of line. */
function wonkyRow() {
  const s = createSession();
  const ids = [
    s.addStroke(handRect(100, 100, 150, 120, { seed: 1 }), 1000),
    s.addStroke(handRect(280, 128, 190, 96, { seed: 2 }), 1100),
    s.addStroke(handRect(520, 88, 120, 140, { seed: 3 }), 1200),
  ];
  return { s, ids };
}

const bounds = (s: ReturnType<typeof createSession>, id: string) => boundsOf(s.getState().nodes.get(id)!)!;
const centreY = (b: { minY: number; maxY: number }) => (b.minY + b.maxY) / 2;
const spread = (xs: number[]) => Math.max(...xs) - Math.min(...xs);

describe('tidy', () => {
  it('puts a wonky row onto one line', () => {
    const { s, ids } = wonkyRow();
    const before = spread(ids.map((id) => centreY(bounds(s, id))));
    s.tidy({ ids, mode: 'align', axis: 'row', at: 2000 });
    const after = spread(ids.map((id) => centreY(bounds(s, id))));
    expect(before).toBeGreaterThan(10); // visibly out of line
    expect(after).toBeLessThan(1);
  });

  it('spaces them evenly across the span they already used', () => {
    const { s, ids } = wonkyRow();
    const spanBefore = { min: bounds(s, ids[0]).minX, max: bounds(s, ids[2]).maxX };
    s.tidy({ ids, mode: 'align', axis: 'row', at: 2000 });
    const rects = ids.map((id) => bounds(s, id));
    // The outer edges stay where the human put them.
    expect(rects[0].minX).toBeCloseTo(spanBefore.min, 1);
    expect(rects[2].maxX).toBeCloseTo(spanBefore.max, 1);
    // And the gaps between them are equal.
    const gaps = [rects[1].minX - rects[0].maxX, rects[2].minX - rects[1].maxX];
    expect(Math.abs(gaps[0] - gaps[1])).toBeLessThan(1);
  });

  it('infers the axis from how the marks already sit', () => {
    const s = createSession();
    const ids = [
      s.addStroke(handRect(100, 100, 200, 90, { seed: 1 }), 1000),
      s.addStroke(handRect(126, 230, 200, 90, { seed: 2 }), 1100),
      s.addStroke(handRect(88, 360, 200, 90, { seed: 3 }), 1200),
    ];
    s.tidy({ ids, mode: 'align', at: 2000 }); // no axis given
    const xs = ids.map((id) => (bounds(s, id).minX + bounds(s, id).maxX) / 2);
    expect(spread(xs)).toBeLessThan(1); // it chose 'column'
  });

  it('matches sizes to the largest, keeping each mark where it is', () => {
    const { s, ids } = wonkyRow();
    const centresBefore = ids.map((id) => centreY(bounds(s, id)));
    s.tidy({ ids, mode: 'equalize', at: 2000 });
    const rects = ids.map((id) => bounds(s, id));
    const widths = rects.map((r) => r.maxX - r.minX);
    expect(spread(widths)).toBeLessThan(1);
    expect(Math.max(...widths)).toBeGreaterThan(185); // the largest, not the smallest
    // Centres are untouched: this changes size, not position.
    ids.forEach((id, i) => expect(centreY(bounds(s, id))).toBeCloseTo(centresBefore[i], 1));
  });

  it('never destroys ink — the original stroke is kept and undo springs it back', () => {
    const { s, ids } = wonkyRow();
    const originalPoints = [...strokePointsOf(s.getState().nodes.get(ids[1])!)!];
    const originalBounds = { ...bounds(s, ids[1]) };

    s.tidy({ ids, mode: 'align', axis: 'row', at: 2000 });
    const node = s.getState().nodes.get(ids[1])!;
    expect(getRep(node, 'transform')).toBeDefined();
    // The stroke rep itself is untouched — only the reading of it moved.
    expect((getRep(node, 'stroke')!.data as { points: unknown[] }).points).toEqual(originalPoints);
    expect(bounds(s, ids[1])).not.toEqual(originalBounds);

    s.undo();
    expect(bounds(s, ids[1])).toEqual(originalBounds);
    expect(getRep(s.getState().nodes.get(ids[1])!, 'transform')).toBeUndefined();
  });

  it('moves the ink the canvas draws, not just the bounds', () => {
    const { s, ids } = wonkyRow();
    const before = strokePointsOf(s.getState().nodes.get(ids[2])!)!;
    s.tidy({ ids, mode: 'align', axis: 'row', at: 2000 });
    const after = strokePointsOf(s.getState().nodes.get(ids[2])!)!;
    expect(after).toHaveLength(before.length);
    expect(after[0]).not.toEqual(before[0]);
  });

  it('tidying twice is not cumulative — it settles', () => {
    const { s, ids } = wonkyRow();
    s.tidy({ ids, mode: 'align', axis: 'row', at: 2000 });
    const once = ids.map((id) => ({ ...bounds(s, id) }));
    s.tidy({ ids, mode: 'align', axis: 'row', at: 2100 });
    ids.forEach((id, i) => {
      expect(bounds(s, id).minX).toBeCloseTo(once[i].minX, 1);
      expect(bounds(s, id).minY).toBeCloseTo(once[i].minY, 1);
    });
  });

  it('does nothing to a single mark, or to marks that are gone', () => {
    const { s, ids } = wonkyRow();
    const before = { ...bounds(s, ids[0]) };
    s.tidy({ ids: [ids[0]], mode: 'align', at: 2000 });
    expect(bounds(s, ids[0])).toEqual(before);

    s.erase(ids[1], 2100);
    s.tidy({ ids, mode: 'align', axis: 'row', at: 2200 });
    expect(getRep(s.getState().nodes.get(ids[1])!, 'transform')).toBeUndefined();
  });
});

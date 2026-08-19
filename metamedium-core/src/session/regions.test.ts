import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import { regionAt, regionsOverlapping } from './regions';
import { rectStroke, circleStroke, checkStroke } from '../test/strokes';

// Three boxes in a row, blessed into one artifact — the MVP's opening move.
function boardWithBoxes() {
  const s = createSession();
  s.addStroke(rectStroke(100, 100, 200, 120), 1000);
  s.addStroke(rectStroke(340, 100, 200, 120), 1100);
  s.addStroke(rectStroke(100, 260, 440, 100), 1200);
  s.addStroke(circleStroke(320, 230, 300), 2000); // lasso around all three
  s.addStroke(checkStroke(640, 230), 2500);
  const id = s.bless({ summonId: s.getState().summon!.id, name: 'page', at: 3000 })!;
  return { s, id };
}

describe('regionsOf', () => {
  it('turns every member mark into a region', () => {
    const { s, id } = boardWithBoxes();
    expect(s.regions(id)).toHaveLength(3);
  });

  it('orders largest first, so a container is declared before what it holds', () => {
    const { s, id } = boardWithBoxes();
    const areas = s.regions(id).map((r) => r.rect.w * r.rect.h);
    expect([...areas].sort((a, b) => b - a)).toEqual(areas);
  });

  it('gives artifact-local coordinates — the space generated code is written in', () => {
    const { s, id } = boardWithBoxes();
    const regions = s.regions(id);
    // Local origin is the artifact frame, so nothing sits at a negative offset.
    for (const r of regions) {
      expect(r.rect.x).toBeGreaterThanOrEqual(0);
      expect(r.rect.y).toBeGreaterThanOrEqual(0);
    }
    // And local is a pure translation of world — same size, shifted origin.
    for (const r of regions) {
      expect(r.rect.w).toBeCloseTo(r.world.w, 5);
      expect(r.rect.h).toBeCloseTo(r.world.h, 5);
    }
  });

  it('records the nesting the human drew', () => {
    const s = createSession();
    s.addStroke(rectStroke(100, 100, 400, 300), 1000); // outer
    s.addStroke(rectStroke(150, 150, 120, 80), 1100); // inner
    s.addStroke(circleStroke(300, 250, 400), 2000);
    s.addStroke(checkStroke(740, 250), 2500);
    const id = s.bless({ summonId: s.getState().summon!.id, name: 'card', at: 3000 })!;

    const regions = s.regions(id);
    const outer = regions[0];
    expect(outer.contains).toContain(regions[1].id);
    expect(regions[1].contains).toHaveLength(0);
  });

  it('drops members that were erased', () => {
    const { s, id } = boardWithBoxes();
    const first = s.regions(id)[0];
    s.erase(first.nodeId, 4000);
    expect(s.regions(id).map((r) => r.nodeId)).not.toContain(first.nodeId);
  });

  it('is empty for a node that is not an artifact', () => {
    const s = createSession();
    const strokeId = s.addStroke(rectStroke(0, 0, 50, 50), 1000);
    expect(s.regions(strokeId)).toEqual([]);
    expect(s.regions('nope')).toEqual([]);
  });
});

describe('addressing a region', () => {
  it('regionAt picks the innermost region under a point', () => {
    const s = createSession();
    s.addStroke(rectStroke(100, 100, 400, 300), 1000);
    s.addStroke(rectStroke(150, 150, 120, 80), 1100);
    s.addStroke(circleStroke(300, 250, 400), 2000);
    s.addStroke(checkStroke(740, 250), 2500);
    const id = s.bless({ summonId: s.getState().summon!.id, name: 'card', at: 3000 })!;
    const regions = s.regions(id);

    const inner = regionAt(regions, 200, 190)!;
    expect(inner.rect.w).toBeLessThan(200); // the small one, not the container
    const outerOnly = regionAt(regions, 450, 380)!;
    expect(outerOnly.rect.w).toBeGreaterThan(300);
    expect(regionAt(regions, 5000, 5000)).toBeNull();
  });

  it('regionsOverlapping returns every region a drawn rect touches', () => {
    const { s, id } = boardWithBoxes();
    const regions = s.regions(id);
    const across = regionsOverlapping(regions, { minX: 90, minY: 110, maxX: 550, maxY: 130 });
    expect(across.length).toBe(2); // the two top boxes, not the bottom bar
    expect(regionsOverlapping(regions, { minX: 9000, minY: 9000, maxX: 9010, maxY: 9010 })).toEqual([]);
  });
});

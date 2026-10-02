// The diff (SHARD-3D-PLAN §4), on masks.
//
// Everything here is synthetic on purpose: a mask is a mask whether it came off
// a renderer or out of a loop, and the whole point of splitting `diff.ts` from
// `silhouette.ts` is that the arithmetic can be pinned with no WebGL anywhere
// near it. The four cases are the four the package has to get right — a body
// that lacks something, a body that has something extra, a body that matches,
// and a ragged pixel that is neither.

import { describe, it, expect } from 'vitest';
import type { Point } from 'metamedium-core';
import {
  NOISE_FRACTION,
  PROFILE_OVERLAP,
  boundsOf,
  diffProfile,
  gridFor,
  overlapOf,
  padBounds,
  pixelArea,
  rasterise,
  viewNameOf,
  whereIn,
  type Grid,
} from './diff';

/** A rectangle in plane units, as a closed outline. */
const box = (minX: number, minY: number, maxX: number, maxY: number): Point[] => [
  { x: minX, y: minY },
  { x: maxX, y: minY },
  { x: maxX, y: maxY },
  { x: minX, y: maxY },
];

/**
 * The BOX, 2 × 3 — the body. The bump stands out of its right-hand edge,
 * 0.7 × 1.0, so the material the drawing wants and the body lacks is 0.7 u².
 */
const BODY = box(0, 0, 2, 3);
const BUMP_AREA = 0.7 * 1;
const BUMPED: Point[] = [
  { x: 0, y: 0 },
  { x: 2, y: 0 },
  { x: 2, y: 1 },
  { x: 2.7, y: 1 },
  { x: 2.7, y: 2 },
  { x: 2, y: 2 },
  { x: 2, y: 3 },
  { x: 0, y: 3 },
];

/** A mask built by hand on its own grid — what a renderer would have handed back. */
function maskOf(outline: Point[], resolution = 160): { mask: Uint8Array; grid: Grid } {
  const grid = gridFor(padBounds(boundsOf(outline), 0.05), resolution);
  return { mask: rasterise([outline], grid), grid };
}

describe('the diff names what the body lacks', () => {
  it('a box against a box-with-a-bump: one missing region, its area, and its side', () => {
    const sil = maskOf(BODY);
    const d = diffProfile({
      ink: BUMPED,
      from: 'ink',
      inkWhy: 'the ink as drawn',
      silhouetteMask: sil,
      view: 'side',
    });
    expect(d.missing).toHaveLength(1);
    expect(d.extra).toHaveLength(0);
    // Within a couple of per cent: a region's area is counted in pixels, and a
    // pixel is a pixel.
    expect(d.missing[0].area).toBeGreaterThan(BUMP_AREA * 0.9);
    expect(d.missing[0].area).toBeLessThan(BUMP_AREA * 1.1);
    expect(d.missing[0].where).toBe('at the right');
    expect(d.missing[0].kind).toBe('missing');
    // An outline to build a prism on, not a bounding box.
    expect(d.missing[0].outline.length).toBeGreaterThanOrEqual(4);
    expect(d.coverage).toBeGreaterThan(0.85);
    expect(d.coverage).toBeLessThan(0.95);
    expect(d.sentence).toMatch(/^side · matches 90% · missing 1 region \(0\.\d\d u²\) at the right · extra none$/);
  });

  it('the same two the other way round: one EXTRA region', () => {
    const sil = maskOf(BUMPED);
    const d = diffProfile({
      ink: BODY,
      from: 'ink',
      inkWhy: 'the ink as drawn',
      silhouetteMask: sil,
      view: 'side',
    });
    expect(d.missing).toHaveLength(0);
    expect(d.extra).toHaveLength(1);
    expect(d.extra[0].area).toBeGreaterThan(BUMP_AREA * 0.9);
    expect(d.extra[0].area).toBeLessThan(BUMP_AREA * 1.1);
    expect(d.sentence).toMatch(/missing none · extra 1 region/);
  });

  it('a body that matches the drawing reads clean, and says so', () => {
    const d = diffProfile({
      ink: BUMPED,
      from: 'clean',
      inkWhy: 'the clean form',
      silhouette: [BUMPED],
      view: 'front',
    });
    expect(d.missing).toHaveLength(0);
    expect(d.extra).toHaveLength(0);
    expect(d.coverage).toBe(1);
    expect(d.dropped).toBe(0);
    expect(d.sentence).toBe('front · matches 100% · missing none · extra none');
    expect(d.from).toBe('clean');
    expect(d.reasoning).toMatch(/the clean form/);
  });

  it('a speck where the two edges disagree is dropped, and counted', () => {
    // A bump a twentieth of a unit across: real pixels, and plainly not a piece
    // of the thing. Under NOISE_FRACTION of the drawing's own area.
    const speck: Point[] = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 1.5 },
      { x: 2.05, y: 1.5 },
      { x: 2.05, y: 1.55 },
      { x: 2, y: 1.55 },
      { x: 2, y: 3 },
      { x: 0, y: 3 },
    ];
    const sil = maskOf(BODY);
    const d = diffProfile({ ink: speck, from: 'ink', inkWhy: 'the ink', silhouetteMask: sil, view: 'side' });
    expect(d.missing).toHaveLength(0);
    expect(d.dropped).toBeGreaterThanOrEqual(1);
    expect(d.sentence).toMatch(/speck/);
    expect(d.reasoning).toMatch(new RegExp(`${(NOISE_FRACTION * 100).toFixed(1)}% of the drawing`));
  });

  it('the grid is one grid, and it is in plane units', () => {
    const sil = maskOf(BODY);
    const d = diffProfile({ ink: BUMPED, from: 'ink', inkWhy: 'x', silhouetteMask: sil, view: 'top' });
    // Long side gets the resolution; the short side is in proportion, so a
    // pixel is the same size along u as along v.
    expect(d.grid.pxU).toBeCloseTo(d.grid.pxV, 3);
    expect(pixelArea(d.grid)).toBeCloseTo(d.grid.pxU * d.grid.pxV, 12);
  });
});

describe('where a region is, said in thirds', () => {
  const frame = { minX: 0, minY: 0, maxX: 3, maxY: 3 };
  it('names the side, and the top or the bottom — v runs DOWN', () => {
    expect(whereIn(frame, { minX: 2.5, minY: 1.4, maxX: 2.9, maxY: 1.6 })).toBe('at the right');
    expect(whereIn(frame, { minX: 0.1, minY: 0.1, maxX: 0.4, maxY: 0.4 })).toBe('at the top left');
    expect(whereIn(frame, { minX: 1.4, minY: 2.6, maxX: 1.6, maxY: 2.9 })).toBe('at the bottom');
    expect(whereIn(frame, { minX: 1.4, minY: 1.4, maxX: 1.6, maxY: 1.6 })).toBe('in the middle');
  });
});

describe('a profile OF a solid, or the start of a new one', () => {
  it('an outline over the solid’s silhouette is a profile of it, and says why', () => {
    const o = overlapOf(BUMPED, [BODY]);
    expect(o.about).toBe(true);
    expect(o.iou).toBeGreaterThan(PROFILE_OVERLAP);
    expect(o.why).toMatch(/share \d+% of their material/);
  });

  it('an outline drawn clear of it is a profile of its own', () => {
    const o = overlapOf(box(10, 10, 12, 13), [BODY]);
    expect(o.about).toBe(false);
    expect(o.iou).toBe(0);
    expect(o.why).toMatch(/under the \d+% floor/);
  });

  it('one INSIDE the other counts, which is the case that matters', () => {
    // A profile drawn to correct a solid is usually much smaller or much
    // bigger than it, and that is exactly when the IoU is low.
    const small = overlapOf(box(0.8, 1.2, 1.2, 1.6), [BODY]);
    expect(small.iou).toBeLessThan(PROFILE_OVERLAP);
    expect(small.about).toBe(true);
    expect(small.why).toMatch(/lies inside/);
    const big = overlapOf(box(-4, -4, 6, 7), [BODY]);
    expect(big.iou).toBeLessThan(PROFILE_OVERLAP);
    expect(big.about).toBe(true);
    expect(big.why).toMatch(/holds \d+%/);
  });

  it('sliding the plane along its own normal changes nothing — the comparison is orthographic', () => {
    // Both outlines are in the plane's own (u, v), and an offset along the
    // normal does not appear in (u, v) at all. Stated as a test because it is
    // the reason the width tile can be slid out beside the box.
    const a = overlapOf(BUMPED, [BODY]);
    const b = overlapOf(BUMPED, [BODY]);
    expect(a.iou).toBe(b.iou);
  });

  it('no silhouette on the plane is not an overlap, and says that too', () => {
    const o = overlapOf(BUMPED, []);
    expect(o.about).toBe(false);
    expect(o.why).toMatch(/no silhouette on this plane/);
  });
});

describe('the three canonical views', () => {
  it('says them the way a hand says them', () => {
    expect(viewNameOf('foundation')).toBe('top');
    expect(viewNameOf('height')).toBe('front');
    expect(viewNameOf('width')).toBe('side');
    expect(viewNameOf('top of artifact:7')).toBe('top of artifact:7');
    expect(viewNameOf(undefined)).toBe('this view');
  });
});

// The point-cloud matcher (MATHS-SPEC §8, Lane F — M8): $P with $Q's early
// abandoning, every stroke keeping a few points, the distance a mean in units
// of the glyph's size.

import { describe, it, expect } from 'vitest';
import type { Point } from '../types';
import { CLOUD_POINTS, MIN_POINTS_PER_STROKE, cloudOf, matchClouds, resampleStroke, shareOut } from './pointcloud';

const line = (a: Point, b: Point, n = 20): Point[] => Array.from({ length: n }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / (n - 1), y: a.y + ((b.y - a.y) * i) / (n - 1) }));
const ring = (cx: number, cy: number, r: number, n = 40): Point[] => Array.from({ length: n + 1 }, (_, i) => ({ x: cx + r * Math.cos((i / n) * Math.PI * 2), y: cy + r * Math.sin((i / n) * Math.PI * 2) }));
const plus = (x: number, y: number, s: number) => [line({ x, y: y + s / 2 }, { x: x + s, y: y + s / 2 }), line({ x: x + s / 2, y }, { x: x + s / 2, y: y + s })];

describe('a cloud', () => {
  it('is resampled to its points, evenly along each stroke', () => {
    const r = resampleStroke(line({ x: 0, y: 0 }, { x: 100, y: 0 }, 7), 11);
    expect(r).toHaveLength(11);
    r.forEach((p, i) => expect(p.x).toBeCloseTo(i * 10, 6));
    // A stroke with no length is its point, every time.
    expect(resampleStroke([{ x: 3, y: 4 }], 5)).toEqual(Array.from({ length: 5 }, () => ({ x: 3, y: 4 })));
  });

  it('shares its points by length, and every stroke keeps a few however short', () => {
    const share = shareOut([100, 0, 0]);
    expect(share.reduce((a, b) => a + b, 0)).toBe(CLOUD_POINTS);
    expect(Math.min(...share)).toBeGreaterThanOrEqual(MIN_POINTS_PER_STROKE);
    expect(share[0]).toBe(CLOUD_POINTS - 2 * MIN_POINTS_PER_STROKE);
  });

  it('stands at the origin, its larger side one', () => {
    const c = cloudOf([ring(500, -300, 80)])!;
    const cx = c.points.reduce((a, p) => a + p.x, 0) / c.points.length;
    const cy = c.points.reduce((a, p) => a + p.y, 0) / c.points.length;
    expect(Math.abs(cx)).toBeLessThan(1e-9);
    expect(Math.abs(cy)).toBeLessThan(1e-9);
    const xs = c.points.map((p) => p.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(1, 2);
    expect(cloudOf([])).toBeNull();
  });
});

describe('two clouds', () => {
  it('are the same however big, wherever, in whatever order and direction their strokes were drawn', () => {
    const a = cloudOf(plus(0, 0, 50))!;
    const moved = cloudOf(plus(900, 400, 140))!;
    const [h, v] = plus(0, 0, 50);
    const other = cloudOf([v.slice().reverse(), h.slice().reverse()])!;
    expect(matchClouds(a, moved)).toBeLessThan(0.01);
    expect(matchClouds(a, other)).toBeLessThan(0.01);
  });

  it('keep their orientation: a plus is not a times sign, a six is not a nine', () => {
    const p = cloudOf(plus(0, 0, 50))!;
    const x = cloudOf([line({ x: 0, y: 0 }, { x: 50, y: 50 }), line({ x: 50, y: 0 }, { x: 0, y: 50 })])!;
    expect(matchClouds(p, x)).toBeGreaterThan(0.05);
  });

  it('are measured as a mean distance, in the glyph’s own size, and abandoned past a bound', () => {
    const a = cloudOf([ring(0, 0, 50)])!;
    const b = cloudOf([line({ x: 0, y: 0 }, { x: 100, y: 0 })])!;
    const d = matchClouds(a, b);
    expect(d).toBeGreaterThan(0.1);
    expect(d).toBeLessThan(1);
    expect(matchClouds(a, b, d / 2)).toBe(Infinity);
    expect(matchClouds(a, b, d * 2)).toBeCloseTo(d, 9);
  });

  it('give a dot of a divided-by sign its points, the same however it was drawn — a touch or a tiny scribble', () => {
    const bar = line({ x: 0, y: 50 }, { x: 60, y: 50 });
    const tap = (x: number, y: number): Point[] => [{ x, y }, { x: x + 0.1, y }];
    const scribble = (x: number, y: number): Point[] => ring(x, y, 2.5, 30).concat(ring(x, y, 1.5, 30));
    const tapped = cloudOf([bar, tap(30, 30), tap(30, 70)])!;
    const scribbled = cloudOf([bar, scribble(30, 30), scribble(30, 70)])!;
    const minus = cloudOf([bar])!;
    // A tap that kept no points would read as a minus; a scribble that took its points by its length, unlike a tap.
    expect(matchClouds(tapped, scribbled)).toBeLessThan(matchClouds(tapped, minus) / 2);
    expect(matchClouds(scribbled, minus)).toBeGreaterThan(matchClouds(tapped, scribbled) * 2);
  });
});

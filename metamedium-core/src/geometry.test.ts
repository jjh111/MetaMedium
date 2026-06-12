import { describe, it, expect } from 'vitest';
import {
  getBounds,
  calculateDistance,
  calculateStraightness,
  isStrokeClosed,
  convexHull,
  countCorners,
  checkOvershoot,
  getFingerprint,
  smoothStroke,
  simplifyStroke,
  normalizeStroke,
  boundingBoxDistance,
  boundsOverlap,
  boundsContain,
  distancePointToBounds,
} from './geometry';
import { lineStroke, circleStroke, rectStroke } from './test/strokes';

describe('getBounds', () => {
  it('returns zeroed bounds for empty input', () => {
    expect(getBounds([])).toEqual({ minX: 0, maxX: 0, minY: 0, maxY: 0 });
  });

  it('computes min/max over all points', () => {
    const bounds = getBounds([
      { x: 10, y: 5 },
      { x: -3, y: 20 },
      { x: 7, y: 0 },
    ]);
    expect(bounds).toEqual({ minX: -3, maxX: 10, minY: 0, maxY: 20 });
  });
});

describe('calculateDistance', () => {
  it('computes euclidean distance', () => {
    expect(calculateDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});

describe('calculateStraightness', () => {
  it('is ~1 for a straight line', () => {
    const s = calculateStraightness(lineStroke({ x: 0, y: 0 }, { x: 200, y: 0 }));
    expect(s).toBeCloseTo(1, 5);
  });

  it('is ~0 for a closed circle (start meets end)', () => {
    const s = calculateStraightness(circleStroke(100, 100, 80));
    expect(s).toBeLessThan(0.05);
  });

  it('is ~0.64 for a half circle (diameter / half circumference)', () => {
    const half = circleStroke(0, 0, 100, 120).slice(0, 61); // 0..PI
    const s = calculateStraightness(half);
    expect(s).toBeCloseTo(2 / Math.PI, 1);
  });
});

describe('isStrokeClosed', () => {
  it('detects a closed circle', () => {
    expect(isStrokeClosed(circleStroke(100, 100, 80))).toBe(true);
  });

  it('rejects an open line', () => {
    expect(isStrokeClosed(lineStroke({ x: 0, y: 0 }, { x: 300, y: 0 }))).toBe(false);
  });

  it('uses size-relative closure: big shapes tolerate bigger gaps', () => {
    // 400px-wide circle with a ~60px gap: fails the 50px absolute test
    // but passes the relative test (60/400 = 15% < 20%).
    const big = circleStroke(0, 0, 200, 120).slice(0, 115);
    const gap = calculateDistance(big[0], big[big.length - 1]);
    expect(gap).toBeGreaterThan(50);
    expect(isStrokeClosed(big)).toBe(true);

    // Same relative gap on a small circle is under the 50px absolute threshold.
    const small = circleStroke(0, 0, 30, 120).slice(0, 115);
    expect(isStrokeClosed(small)).toBe(true);
  });
});

describe('convexHull', () => {
  it('reduces a filled square of points to its 4 corners', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
      { x: 50, y: 50 }, // interior point — must be excluded
    ];
    const hull = convexHull(points);
    expect(hull).toHaveLength(4);
    expect(hull).not.toContainEqual({ x: 50, y: 50 });
  });
});

describe('countCorners', () => {
  it('returns 0 for too few points', () => {
    expect(countCorners(lineStroke({ x: 0, y: 0 }, { x: 10, y: 0 }, 10)).count).toBe(0);
  });

  it('finds no corners on a smooth circle', () => {
    expect(countCorners(circleStroke(100, 100, 80)).count).toBe(0);
  });

  it('finds no corners on a straight line', () => {
    expect(countCorners(lineStroke({ x: 0, y: 0 }, { x: 300, y: 300 })).count).toBe(0);
  });

  it('finds 4 corners on a rectangle drawn from mid-edge', () => {
    expect(countCorners(rectStroke(0, 0, 200, 120)).count).toBe(4);
  });
});

describe('distancePointToBounds', () => {
  const b = { minX: 100, maxX: 200, minY: 100, maxY: 200 };

  it('is 0 for points inside the bounds', () => {
    expect(distancePointToBounds({ x: 150, y: 150 }, b)).toBe(0);
  });

  it('measures the gap to the nearest edge or corner', () => {
    expect(distancePointToBounds({ x: 250, y: 150 }, b)).toBe(50); // right edge
    expect(distancePointToBounds({ x: 150, y: 80 }, b)).toBe(20); // top edge
    expect(distancePointToBounds({ x: 230, y: 60 }, b)).toBe(50); // corner: 3-4-5
  });
});

describe('checkOvershoot', () => {
  it('is size-relative: short strokes do not "overshoot" their own length', () => {
    // A 50px line ends 50px from its start — under the old fixed 50px
    // threshold every short stroke read as overshooting, making short lines
    // unrecognizable. Size-relative thresholding fixes that.
    expect(checkOvershoot(lineStroke({ x: 0, y: 0 }, { x: 50, y: 0 }))).toBe(false);
  });

  it('detects a circle that overshoots its starting point', () => {
    // 1.2 revolutions: the tail passes the start again.
    const points = [];
    for (let i = 0; i <= 144; i++) {
      const a = (i / 120) * Math.PI * 2;
      points.push({ x: 100 + 80 * Math.cos(a), y: 100 + 80 * Math.sin(a) });
    }
    expect(checkOvershoot(points)).toBe(true);
  });

  it('does not flag an open arc', () => {
    const threeQuarter = circleStroke(0, 0, 100, 120).slice(0, 91);
    expect(checkOvershoot(threeQuarter)).toBe(false);
  });
});

describe('getFingerprint', () => {
  it('produces the documented shape for a circle', () => {
    const fp = getFingerprint(circleStroke(100, 100, 80));
    expect(fp.isClosed).toBe(true);
    expect(fp.straightness).toBeLessThan(0.1);
    expect(fp.corners).toBe(0);
    expect(fp.aspectRatio).toBeCloseTo(1, 1);
    expect(fp.size).toBeCloseTo(160, 0);
    expect(fp.pointCount).toBe(121);
  });

  it('produces the documented shape for a line', () => {
    const fp = getFingerprint(lineStroke({ x: 0, y: 0 }, { x: 300, y: 10 }));
    expect(fp.isClosed).toBe(false);
    expect(fp.straightness).toBeCloseTo(1, 3);
    expect(fp.corners).toBe(0);
  });
});

describe('stroke manipulation', () => {
  it('smoothStroke preserves endpoints', () => {
    const stroke = rectStroke(0, 0, 100, 100);
    const smoothed = smoothStroke(stroke);
    expect(smoothed[0]).toEqual(stroke[0]);
    expect(smoothed[smoothed.length - 1]).toEqual(stroke[stroke.length - 1]);
    expect(smoothed.length).toBeGreaterThan(stroke.length);
  });

  it('simplifyStroke collapses a straight line to its endpoints', () => {
    const simplified = simplifyStroke(lineStroke({ x: 0, y: 0 }, { x: 300, y: 0 }));
    expect(simplified).toHaveLength(2);
  });

  it('normalizeStroke scales to target size around the original center', () => {
    const stroke = circleStroke(500, 400, 50);
    const normalized = normalizeStroke(stroke, 200);
    const bounds = getBounds(normalized);
    expect(bounds.maxX - bounds.minX).toBeCloseTo(200, 0);
    expect((bounds.minX + bounds.maxX) / 2).toBeCloseTo(500, 0);
    expect((bounds.minY + bounds.maxY) / 2).toBeCloseTo(400, 0);
  });
});

describe('bounding box operations', () => {
  const a = { minX: 0, maxX: 100, minY: 0, maxY: 100 };
  const b = { minX: 150, maxX: 250, minY: 0, maxY: 100 };
  const inner = { minX: 20, maxX: 80, minY: 20, maxY: 80 };

  it('boundingBoxDistance is the gap between disjoint boxes', () => {
    expect(boundingBoxDistance(a, b)).toBe(50);
    expect(boundingBoxDistance(a, inner)).toBe(0);
  });

  it('boundsOverlap detects overlap and rejects disjoint boxes', () => {
    expect(boundsOverlap(a, inner)).toBe(true);
    expect(boundsOverlap(a, b)).toBe(false);
  });

  it('boundsContain requires full containment', () => {
    expect(boundsContain(a, inner)).toBe(true);
    expect(boundsContain(inner, a)).toBe(false);
    expect(boundsContain(a, b)).toBe(false);
  });
});

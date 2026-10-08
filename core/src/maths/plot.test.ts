// The plot (MATHS-SPEC §8 Lane C, M20): a function drawn on a plane, in canvas units.
//
// Red first: `(x²−4)/(x−2)` with a hole at 2 is a line with a gap and a ring at (2, 4), and the function is never
// asked at 2. Beside it, what makes a plot honest: a pole breaks the line and stands a dashed asymptote, a curve
// that leaves the plane is cut at its edge, a smooth curve costs few points and a bend costs more where it turns.

import { describe, it, expect } from 'vitest';
import { canvasToPlane, planeExtent, planeOf, planeToCanvas, plotOn } from './plot';
import type { PlaneGeometry, Plot } from './plot';
import { compileFunction } from './fn';
import { analyseRational } from './poly';

const RECT = { minX: 100, maxX: 500, minY: 100, maxY: 400 };
const plane = (x: [number, number], y: [number, number]) => planeOf({ x, y, rect: RECT });
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

/** Every plotted point, back on the plane. */
const onPlane = (g: PlaneGeometry, p: Plot) => p.curves.map((c) => c.points.map((q) => canvasToPlane(g, q)));

describe('the plane as numbers', () => {
  it('puts a point of the plane on the canvas and back, upright or turned', () => {
    const g = plane([-3, 3], [0, 9]);
    expect(planeToCanvas(g, { x: 0, y: 0 })).toEqual({ x: 300, y: 400 });
    expect(planeToCanvas(g, { x: 3, y: 9 })).toEqual({ x: 500, y: 100 });
    const back = canvasToPlane(g, planeToCanvas(g, { x: -1.25, y: 6.5 }));
    expect(back.x).toBeCloseTo(-1.25, 9);
    expect(back.y).toBeCloseTo(6.5, 9);
    // Turned a little, and the axes not square to each other: the map and its inverse still agree.
    const t: PlaneGeometry = { ...g, ex: { x: 0.98, y: 0.2 }, ey: { x: 0.15, y: -0.99 } };
    const p = canvasToPlane(t, planeToCanvas(t, { x: 2, y: 4 }));
    expect(p.x).toBeCloseTo(2, 9);
    expect(p.y).toBeCloseTo(4, 9);
  });
  it('knows the box it is drawn in', () => {
    const e = planeExtent(plane([-3, 3], [0, 9]));
    expect(e).toEqual({ minX: 100, maxX: 500, minY: 100, maxY: 400 });
  });
});

describe('(x²−4)/(x−2): one line with a gap and a ring at (2, 4)', () => {
  const g = plane([-3, 5], [-2, 8]);
  const calls: number[] = [];
  const f = (x: number) => { calls.push(x); return (x * x - 4) / (x - 2); };
  const p = plotOn(g, f, { holes: [2] });

  it('gives a ring at (2, 4), open, with the limit from both sides for its height', () => {
    expect(p.holes).toHaveLength(1);
    const h = p.holes[0];
    expect(h.x).toBe(2);
    expect(h.y).toBeCloseTo(4, 5);
    expect(h.found).toBe('given');
    expect(dist(h.at, planeToCanvas(g, { x: 2, y: 4 }))).toBeLessThan(0.01);
    // A ring: a closed run of points all one radius from its centre.
    expect(h.ring.length).toBeGreaterThan(12);
    for (const q of h.ring) expect(dist(q, h.at)).toBeCloseTo(5, 6);
    expect(h.ring[0]).toEqual(h.ring[h.ring.length - 1]);
  });

  it('is one line cut in two where the hole is: nothing is drawn through the ring', () => {
    expect(p.curves).toHaveLength(2);
    const [left, right] = onPlane(g, p);
    expect(Math.max(...left.map((q) => q.x))).toBeLessThan(2);
    expect(Math.min(...right.map((q) => q.x))).toBeGreaterThan(2);
    // Both pieces are the line y = x + 2, to a tenth of a pixel.
    for (const piece of onPlane(g, p)) for (const q of piece) expect(Math.abs(q.y - (q.x + 2)) * g.y.perUnit).toBeLessThan(0.1);
    // Each stops at the ring's edge and no nearer.
    const h = p.holes[0];
    for (const c of p.curves) for (const q of c.points) expect(dist(q, h.at)).toBeGreaterThanOrEqual(4.99);
    const ends = [p.curves[0].points[p.curves[0].points.length - 1], p.curves[1].points[0]];
    for (const q of ends) expect(dist(q, h.at)).toBeLessThan(5.5);
  });

  it('is clipped to what is drawn: a line leaving the box is cut at its edge', () => {
    for (const c of p.curves) for (const q of c.points) {
      expect(q.x).toBeGreaterThanOrEqual(RECT.minX - 1e-6);
      expect(q.x).toBeLessThanOrEqual(RECT.maxX + 1e-6);
      expect(q.y).toBeGreaterThanOrEqual(RECT.minY - 1e-6);
      expect(q.y).toBeLessThanOrEqual(RECT.maxY + 1e-6);
    }
    // y = 8 is the top of the plane: the right piece ends at x = 6 > 5 or at the top, not beyond it.
    expect(p.curves[1].x1).toBeLessThanOrEqual(5 + 1e-9);
  });

  it('never asks the function at the removable point', () => {
    expect(calls.length).toBeGreaterThan(50);
    expect(calls.includes(2)).toBe(false);
    expect(p.evaluations).toBe(calls.length);
  });

  it('says what it drew', () => {
    expect(p.reason).toContain('2 lines');
    expect(p.reason).toContain('a hole at (2, 4)');
  });
});

describe('a hole nobody told of is found at the places a hand writes into a tick', () => {
  it('sin x / x has a hole at (0, 1)', () => {
    const c = compileFunction('sin x / x');
    if (!c.ok) throw new Error(c.reason);
    const g = plane([-10, 10], [-1, 2]);
    const p = plotOn(g, c.f);
    expect(p.holes).toHaveLength(1);
    expect(p.holes[0].found).toBe('sampled');
    expect(p.holes[0].x).toBe(0);
    expect(p.holes[0].y).toBeCloseTo(1, 4);
    expect(p.curves).toHaveLength(2);
  });
  it('a plain parabola has none, and is one line', () => {
    const p = plotOn(plane([-3, 3], [0, 9]), (x) => x * x);
    expect(p.holes).toHaveLength(0);
    expect(p.curves).toHaveLength(1);
    expect(p.asymptotes).toHaveLength(0);
  });
});

describe('a pole breaks the line and stands a dashed asymptote', () => {
  it('1/x is two lines and a dashed vertical at 0, given or found', () => {
    const g = plane([-4, 4], [-4, 4]);
    for (const given of [true, false]) {
      const p = plotOn(g, (x) => (x === 0 ? null : 1 / x), given ? { poles: [0] } : {});
      expect(p.curves).toHaveLength(2);
      const v = p.asymptotes.filter((a) => a.kind === 'vertical');
      expect(v).toHaveLength(1);
      expect(v[0].value).toBeCloseTo(0, 6);
      expect(v[0].found).toBe(given ? 'given' : 'sampled');
      // From the bottom of the plane to the top, straight up.
      expect(v[0].points[0].x).toBeCloseTo(v[0].points[1].x, 9);
      expect(Math.abs(v[0].points[0].y - v[0].points[1].y)).toBeCloseTo(RECT.maxY - RECT.minY, 6);
      // The pieces do not meet: one on each side, the left going down and the right going down from the top.
      const [l, r] = onPlane(g, p);
      expect(Math.max(...l.map((q) => q.x))).toBeLessThan(0);
      expect(Math.min(...r.map((q) => q.x))).toBeGreaterThan(0);
    }
  });
  it('tan x is a row of lines, one asymptote at each odd quarter turn the plane holds', () => {
    const c = compileFunction('tan x');
    if (!c.ok) throw new Error(c.reason);
    const g = plane([-5, 5], [-4, 4]);
    const p = plotOn(g, c.f);
    const at = p.asymptotes.filter((a) => a.kind === 'vertical').map((a) => a.value).sort((a, b) => a - b);
    expect(at).toHaveLength(4);
    [-(3 * Math.PI) / 2, -Math.PI / 2, Math.PI / 2, (3 * Math.PI) / 2].forEach((v, i) => expect(at[i]).toBeCloseTo(v, 2));
    expect(p.curves.length).toBe(5);
    // No piece spans a pole.
    for (const piece of onPlane(g, p)) {
      const xs = piece.map((q) => q.x);
      for (const v of at) expect(xs.some((x) => x < v - 1e-3) && xs.some((x) => x > v + 1e-3)).toBe(false);
    }
  });
  it('1/(x²−1) has two poles and three pieces', () => {
    const a = analyseRational('1/(x^2-1)');
    if (!a.ok) throw new Error(a.reason);
    const g = plane([-3, 3], [-3, 3]);
    const p = plotOn(g, a.reducedFn, { poles: a.poles.map((q) => q.x) });
    expect(p.asymptotes.filter((q) => q.kind === 'vertical').map((q) => q.value).sort()).toEqual([-1, 1]);
    expect(p.curves).toHaveLength(3);
  });
});

describe('where the function is undefined the line ends', () => {
  it('√x starts at 0 and has nothing to the left of it', () => {
    const c = compileFunction('sqrt(x)');
    if (!c.ok) throw new Error(c.reason);
    const g = plane([-4, 4], [-1, 3]);
    const p = plotOn(g, c.f);
    expect(p.curves).toHaveLength(1);
    expect(p.curves[0].x0).toBeGreaterThanOrEqual(0);
    expect(p.curves[0].x0).toBeLessThan(0.01);
    expect(p.holes).toHaveLength(0);
  });
  it('a function that throws or answers NaN is a gap, not an error', () => {
    const g = plane([-2, 2], [-2, 2]);
    const p = plotOn(g, (x) => { if (x > 1) throw new Error('boom'); return x > 0.5 ? NaN : x; });
    expect(p.curves).toHaveLength(1);
    expect(p.curves[0].x1).toBeLessThanOrEqual(0.5 + 1e-6);
  });
  it('a plane with no width plots nothing and says so', () => {
    const p = plotOn(plane([1, 1], [0, 1]), (x) => x);
    expect(p.curves).toEqual([]);
    expect(p.reason).toMatch(/nothing to plot/);
  });
});

describe('sampled where it bends', () => {
  it('a straight line costs about the first pass and a bend costs more', () => {
    const g = plane([-3, 3], [0, 9]);
    const line = plotOn(g, (x) => 1.5 * x + 4.5);
    const bend = plotOn(g, (x) => x * x);
    expect(line.curves[0].points.length).toBe(2);
    expect(bend.curves[0].points.length).toBeGreaterThan(10);
    expect(bend.curves[0].points.length).toBeLessThan(400);
    // The simplified polyline stays within a fifth of a pixel of the true curve.
    for (const q of bend.curves[0].points) {
      const w = canvasToPlane(g, q);
      expect(Math.abs(w.y - w.x * w.x) * g.y.perUnit).toBeLessThan(0.05);
    }
  });
  it('a steep exponential is cut at the top, not drawn off the page', () => {
    const g = plane([-2, 6], [0, 10]);
    const p = plotOn(g, (x) => Math.exp(x));
    expect(p.curves).toHaveLength(1);
    expect(p.curves[0].points[p.curves[0].points.length - 1].y).toBeCloseTo(RECT.minY, 6);
  });
  it('a line along a level the plane draws is an asymptote; the x axis itself is not', () => {
    const g = plane([-4, 4], [-2, 4]);
    const p = plotOn(g, (x) => 1 + 1 / (x * x + 1), { levels: [1, 0] });
    const h = p.asymptotes.filter((a) => a.kind === 'horizontal');
    expect(h.map((a) => a.value)).toEqual([1]);
  });
  it('costs a few thousand evaluations and a few milliseconds', () => {
    const c = compileFunction('(x^2-4)/(x-2)');
    if (!c.ok) throw new Error(c.reason);
    const g = plane([-3, 5], [-2, 8]);
    const t0 = performance.now();
    let p: Plot | null = null;
    for (let i = 0; i < 20; i++) p = plotOn(g, c.f, { holes: [2] });
    const each = (performance.now() - t0) / 20;
    console.log(`plot: (x²−4)/(x−2) ${each.toFixed(2)} ms, ${p!.evaluations} evaluations`);
    expect(p!.evaluations).toBeLessThan(2000);
    expect(each).toBeLessThan(50);
  });
});

describe('the Jake plot from the sources the engine already holds', () => {
  it('compileFunction + analyseRational give the same ring and gap', () => {
    const text = 'y = (x²−4)/(x−2)';
    const c = compileFunction(text);
    const a = analyseRational('(x²−4)/(x−2)');
    if (!c.ok || !a.ok) throw new Error('unreadable');
    expect(a.holes.map((h) => [h.x, h.y])).toEqual([[2, 4]]);
    const g = plane([-3, 5], [-2, 8]);
    const p = plotOn(g, c.f, { holes: a.holes.map((h) => ({ x: h.x, y: h.y })) });
    expect(p.holes[0].y).toBe(4);
    expect(p.curves).toHaveLength(2);
  });
});

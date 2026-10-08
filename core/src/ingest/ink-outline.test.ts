// Outline to centerline (V1-SPEC IN1): a pen stroke stored as the shape its tip swept comes back as the line it
// followed, and says how faithfully. Every outline here is made by the fixtures' pen (`fixtures/pen.ts`) from a
// line whose reading is known, so what should come back is known too.

import { describe, it, expect } from 'vitest';
import { recoverFill, FAITHFUL_AT, type Fill, type OutlineRecovery } from './ink-outline';
import { penOutline, restart, brushWidth, pressureWidth } from './fixtures/pen';
import { unionRings } from './fixtures/union';
import { analyzeStroke } from '../recognition';
import { strokeFor } from '../session/synthesize';
import { handLike } from '../packs/synthesize';
import type { Point } from '../types';

const line = (a: Point, b: Point, n = 40): Point[] => Array.from({ length: n }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / (n - 1), y: a.y + ((b.y - a.y) * i) / (n - 1) }));
const topOf = (pts: Point[]) => analyzeStroke(pts).results[0]?.type;

/** How far a point stands from a polyline. */
function distToPath(p: Point, path: Point[]): number {
  let best = Infinity;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0;
    best = Math.min(best, Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)));
  }
  return best;
}
const maxOff = (recovered: Point[], truth: Point[]) => Math.max(...recovered.map((p) => distToPath(p, truth)));
const lengthOf = (pts: Point[]) => pts.reduce((s, p, i) => (i ? s + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0), 0);

const one = (rs: OutlineRecovery[]): OutlineRecovery => {
  expect(rs).toHaveLength(1);
  return rs[0];
};
const nonzero = (...rings: Point[][]): Fill => ({ rings, rule: 'nonzero' });

describe('a ribbon — one ring, two caps', () => {
  const truth = line({ x: 100, y: 100 }, { x: 300, y: 100 });

  it.each([
    ['flat caps', { cap: 'flat' as const }],
    ['round caps', { cap: 'round' as const }],
  ])('a straight pen with %s comes back as one line along the stroke, by pairing its sides', (_, cap) => {
    const r = one(recoverFill(nonzero(penOutline(truth, { width: 4, ...cap }))));
    expect(r.kind).toBe('pen');
    expect(r.method).toBe('ribbon');
    expect(r.strokes).toHaveLength(1);
    const s = r.strokes[0];
    expect(s.recovery).toBe('ribbon');
    expect(s.closed).toBe(false);
    // On the line, but for the half pen a round cap's apex stands beyond the end of the line the pen followed.
    expect(maxOff(s.points, truth)).toBeLessThan(cap.cap === 'round' ? 2.6 : 1);
    // The line runs the length of the stroke, give or take that half pen at each end.
    expect(lengthOf(s.points)).toBeGreaterThan(195);
    expect(lengthOf(s.points)).toBeLessThan(206);
    expect(r.width).toBeGreaterThan(3.6);
    expect(r.width).toBeLessThan(4.4);
    expect(r.fidelity?.faithful).toBe(true);
    expect(r.fidelity!.recall).toBeGreaterThanOrEqual(FAITHFUL_AT);
    expect(r.fidelity!.precision).toBeGreaterThanOrEqual(FAITHFUL_AT);
  });

  it('does not depend on where the ring starts or which way it is walked', () => {
    const ring = penOutline(truth, { width: 3, cap: 'round' });
    const want = one(recoverFill(nonzero(ring)));
    for (const [start, reverse] of [[0, true], [17, false], [41, true], [ring.length - 3, false]] as const) {
      const r = one(recoverFill(nonzero(restart(ring, start, reverse))));
      expect(r.method).toBe('ribbon');
      expect(r.fidelity?.faithful).toBe(true);
      expect(maxOff(r.strokes[0].points, truth)).toBeLessThan(2.6);
      expect(Math.abs(lengthOf(r.strokes[0].points) - lengthOf(want.strokes[0].points))).toBeLessThan(2);
    }
  });

  it('follows a pen whose width swells and tapers, and a pen whose pressure shivers, and reports the mean width', () => {
    const curve = Array.from({ length: 80 }, (_, i) => ({ x: 100 + i * 3, y: 200 + 25 * Math.sin(i / 12) }));
    for (const width of [brushWidth(7), pressureWidth(3, 5, 0.4)]) {
      const r = one(recoverFill(nonzero(penOutline(curve, { width, cap: 'round' }))));
      expect(r.fidelity?.faithful).toBe(true);
      // Within the widest the pen got, half of it, and a little.
      expect(maxOff(r.strokes[0].points, curve)).toBeLessThan(2.6);
    }
    const brush = one(recoverFill(nonzero(penOutline(curve, { width: brushWidth(7), cap: 'round' }))));
    expect(brush.width).toBeGreaterThan(3.5);
    expect(brush.width).toBeLessThan(6);
  });

  it('bends round a corner without calling the corner a cap', () => {
    const corner = [...line({ x: 50, y: 50 }, { x: 150, y: 50 }, 30), ...line({ x: 150, y: 50 }, { x: 150, y: 150 }, 30).slice(1)];
    const r = one(recoverFill(nonzero(penOutline(corner, { width: 4, cap: 'flat' }))));
    expect(r.method).toBe('ribbon');
    expect(r.fidelity?.faithful).toBe(true);
    expect(maxOff(r.strokes[0].points, corner)).toBeLessThan(2.5);
    expect(lengthOf(r.strokes[0].points)).toBeGreaterThan(190);
  });

  it('gives its points the density of ink, not just its corners', () => {
    const r = one(recoverFill(nonzero(penOutline(truth, { width: 4, cap: 'round' }))));
    const pts = r.strokes[0].points;
    expect(pts.length).toBeGreaterThan(40);
    for (let i = 1; i < pts.length; i++) expect(Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)).toBeLessThan(5);
  });
});

describe('a closed loop — an outline and the hole inside it', () => {
  const circle = (r: number, n = 120): Point[] => Array.from({ length: n }, (_, i) => ({ x: 200 + r * Math.cos((i / n) * 2 * Math.PI), y: 200 + r * Math.sin((i / n) * 2 * Math.PI) }));

  it('a ring and its hole come back as one closed line between them', () => {
    const r = one(recoverFill(nonzero(circle(52), circle(48).reverse())));
    expect(r.kind).toBe('pen');
    expect(r.method).toBe('ribbon');
    expect(r.strokes).toHaveLength(1);
    expect(r.strokes[0].closed).toBe(true);
    expect(maxOff(r.strokes[0].points, [...circle(50), circle(50)[0]])).toBeLessThan(1);
    expect(r.width).toBeGreaterThan(3.6);
    expect(r.width).toBeLessThan(4.4);
    expect(r.fidelity?.faithful).toBe(true);
    expect(topOf(r.strokes[0].points)).toBe('circle');
  });

  it('the fill rule says what is a hole: two rings walked the same way are a hole under even-odd and not under nonzero', () => {
    const outer = circle(52), inner = circle(48);
    const evenodd = one(recoverFill({ rings: [outer, inner], rule: 'evenodd' }));
    expect(evenodd.kind).toBe('pen');
    expect(evenodd.strokes[0].closed).toBe(true);
    // Under nonzero the inner ring, walked the same way, is inside the fill and no hole: it is one disc.
    const disc = recoverFill({ rings: [outer, inner], rule: 'nonzero' });
    expect(disc).toHaveLength(1);
    expect(disc[0].kind).not.toBe('pen');
  });
});

describe('what is not a pen stroke', () => {
  it('a small round mark is a dot: one stroke at its centre, too small to be a shape', () => {
    const ring = Array.from({ length: 16 }, (_, i) => ({ x: 80 + 2.5 * Math.cos((i / 16) * 2 * Math.PI), y: 60 + 2.5 * Math.sin((i / 16) * 2 * Math.PI) }));
    const r = one(recoverFill(nonzero(ring)));
    expect(r.kind).toBe('dot');
    expect(r.strokes).toHaveLength(1);
    for (const p of r.strokes[0].points) expect(Math.hypot(p.x - 80, p.y - 60)).toBeLessThan(2);
    expect(topOf(r.strokes[0].points)).toBe('dot');
  });

  it('a large solid shape is a blob: its edge comes back as a closed line, as drawn', () => {
    const box: Point[] = [{ x: 100, y: 100 }, { x: 300, y: 100 }, { x: 300, y: 180 }, { x: 100, y: 180 }];
    const r = one(recoverFill(nonzero(box)));
    expect(r.kind).toBe('blob');
    expect(r.strokes).toHaveLength(1);
    expect(r.strokes[0].recovery).toBe('stroke');
    expect(r.strokes[0].closed).toBe(true);
    expect(topOf(r.strokes[0].points)).toBe('rectangle');
  });

  it('nothing it can use is nothing: no rings, rings of one or two points, rings with no area', () => {
    expect(recoverFill(nonzero())).toEqual([]);
    expect(recoverFill(nonzero([{ x: 1, y: 1 }]))).toEqual([]);
    expect(recoverFill(nonzero([{ x: 1, y: 1 }, { x: 5, y: 5 }]))).toEqual([]);
    expect(recoverFill(nonzero([{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 20 }]))).toEqual([]);
  });

  it('never throws on points that are not numbers, and leaves them out', () => {
    const bad: Point[] = [{ x: NaN, y: 0 }, { x: 10, y: Infinity }, { x: 5, y: 5 }, { x: 1e308, y: -1e308 }];
    expect(() => recoverFill(nonzero(bad))).not.toThrow();
    const ring = penOutline(line({ x: 10, y: 10 }, { x: 110, y: 10 }), { width: 4, cap: 'flat' });
    const polluted = [...ring.slice(0, 5), { x: NaN, y: NaN }, ...ring.slice(5)];
    expect(() => recoverFill(nonzero(polluted))).not.toThrow();
    expect(() => recoverFill({ rings: null as unknown as Point[][], rule: 'nonzero' })).not.toThrow();
    expect(() => recoverFill(null as unknown as Fill)).not.toThrow();
    expect(() => recoverFill({ rings: [[null as unknown as Point, undefined as unknown as Point, { x: 1, y: 1 }]], rule: 'evenodd' })).not.toThrow();
  });
});

describe('where the ring will not pair — the skeleton', () => {
  /** Two pen strokes crossed, drawn as ONE silhouette (the union of their outlines): a plus. */
  const plus = (): Point[] => {
    const a = 6, L = 60;
    return [
      { x: -a, y: -L }, { x: a, y: -L }, { x: a, y: -a }, { x: L, y: -a }, { x: L, y: a }, { x: a, y: a },
      { x: a, y: L }, { x: -a, y: L }, { x: -a, y: a }, { x: -L, y: a }, { x: -L, y: -a }, { x: -a, y: -a },
    ].map((p) => ({ x: p.x + 200, y: p.y + 200 }));
  };

  it('a plus has four ends and no two sides: the ring is thinned and walked, and both bars come back', () => {
    const r = one(recoverFill(nonzero(plus())));
    expect(r.kind).toBe('pen');
    expect(r.method).toBe('skeleton');
    expect(r.strokes.every((s) => s.recovery === 'skeleton')).toBe(true);
    expect(r.fidelity?.recall).toBeGreaterThanOrEqual(FAITHFUL_AT);
    expect(r.fidelity?.precision).toBeGreaterThanOrEqual(FAITHFUL_AT);
    // Together the strokes cover both bars end to end.
    const all = r.strokes.flatMap((s) => s.points);
    const reach = (f: (p: Point) => number) => [Math.min(...all.map(f)), Math.max(...all.map(f))];
    const [x0, x1] = reach((p) => p.x), [y0, y1] = reach((p) => p.y);
    // The bars run 140 to 260 and are 12 wide: a thinned flat end stands back about half a pen from the end.
    expect(x0).toBeLessThan(150);
    expect(x1).toBeGreaterThan(250);
    expect(y0).toBeLessThan(150);
    expect(y1).toBeGreaterThan(250);
  });

  it('says what each method came to, the ribbon first, whichever stood', () => {
    const r = one(recoverFill(nonzero(plus())));
    expect(r.tried.length).toBeGreaterThanOrEqual(1);
    for (const t of r.tried) {
      expect(['ribbon', 'skeleton']).toContain(t.method);
      expect(t.recall).toBeGreaterThanOrEqual(0);
      expect(t.recall).toBeLessThanOrEqual(1);
      expect(t.precision).toBeGreaterThanOrEqual(0);
      expect(t.precision).toBeLessThanOrEqual(1);
    }
    const stood = r.tried.find((t) => t.method === r.method)!;
    for (const t of r.tried) expect(Math.min(stood.recall, stood.precision)).toBeGreaterThanOrEqual(Math.min(t.recall, t.precision) - 1e-9);
  });

  it('a stroke that crosses itself, as an e does, is still one faithful outline', () => {
    // An e: along the bar, round the bowl and back across the bar's start.
    const path: Point[] = [];
    for (let i = 0; i <= 14; i++) path.push({ x: 100 + (i / 14) * 40, y: 100 });
    for (let i = 1; i <= 30; i++) { const a = (i / 30) * 1.75 * Math.PI; path.push({ x: 120 + 20 * Math.cos(a), y: 100 - 20 * Math.sin(a) }); }
    const r = one(recoverFill(nonzero(penOutline(path, { width: 3, cap: 'round' }))));
    expect(r.kind).toBe('pen');
    expect(r.fidelity?.recall).toBeGreaterThanOrEqual(FAITHFUL_AT);
    expect(r.fidelity?.precision).toBeGreaterThanOrEqual(FAITHFUL_AT);
  });
});

describe('strokes merged into one silhouette', () => {
  const poly = (...pts: Point[]): Point[] => pts.slice(1).reduce<Point[]>((acc, p, i) => acc.concat(line(pts[i], p, 24).slice(i ? 1 : 0)), []);
  const merged = (width: number, ...paths: Point[][]): Fill => ({ rings: unionRings(paths.map((p) => penOutline(p, { width, cap: 'round' }))), rule: 'nonzero' });

  it('the fixture merges strokes into an outer ring and a ring for each hole they closed', () => {
    const ring = (cx: number) => Array.from({ length: 60 }, (_, i) => ({ x: cx + 30 * Math.cos((i / 60) * 2 * Math.PI), y: 100 + 30 * Math.sin((i / 60) * 2 * Math.PI) }));
    expect(unionRings([penOutline(ring(100), { width: 4, cap: 'round' })])).toHaveLength(2);
    // Four strokes laid as a # close the one square between them, so there is a hole.
    const hash = unionRings([penOutline(poly({ x: 50, y: 70 }, { x: 150, y: 70 }), { width: 4, cap: 'flat' }), penOutline(poly({ x: 50, y: 110 }, { x: 150, y: 110 }), { width: 4, cap: 'flat' }), penOutline(poly({ x: 80, y: 40 }, { x: 80, y: 140 }), { width: 4, cap: 'flat' }), penOutline(poly({ x: 120, y: 40 }, { x: 120, y: 140 }), { width: 4, cap: 'flat' })]);
    expect(hash).toHaveLength(2);
  });

  it('an x is two lines that cross, not a heap of scraps where they meet', () => {
    const r = one(recoverFill(merged(3, poly({ x: 60, y: 60 }, { x: 180, y: 190 }), poly({ x: 180, y: 60 }, { x: 60, y: 190 }))));
    expect(r.method).toBe('skeleton');
    expect(r.fidelity?.faithful).toBe(true);
    expect(r.strokes.length).toBeLessThanOrEqual(3);
    expect(Math.max(...r.strokes.map((s) => lengthOf(s.points)))).toBeGreaterThan(150);
  });

  it('a shaft and a head drawn apart, at the worst diagonal for thinning, lose neither wing', () => {
    // Zhang–Suen thinning eats one of two 45° wings from its end at some pixel offsets; the skeleton is drawn
    // again at others until it stands for the fill.
    for (const width of [3, 6]) {
      const r = one(recoverFill(merged(width, poly({ x: 40, y: 100 }, { x: 200, y: 100 }), poly({ x: 170, y: 70 }, { x: 200, y: 100 }, { x: 170, y: 130 }))));
      expect(r.method).toBe('skeleton');
      expect(r.fidelity?.faithful).toBe(true);
      const reach = (f: (p: Point) => number) => [Math.min(...r.strokes.flatMap((s) => s.points.map(f))), Math.max(...r.strokes.flatMap((s) => s.points.map(f)))];
      const [y0, y1] = reach((p) => p.y);
      expect(y0).toBeLessThan(80);
      expect(y1).toBeGreaterThan(120);
    }
  });

  it('a letter with two holes in it, as a b is, has no two sides to pair: the skeleton reads it', () => {
    const bowl = (cy: number) => Array.from({ length: 30 }, (_, i) => { const a = -Math.PI / 2 + (Math.PI * i) / 29; return { x: 80 + 35 * Math.cos(a), y: cy + 35 * Math.sin(a) }; });
    const r = one(recoverFill(merged(4, poly({ x: 80, y: 60 }, { x: 80, y: 200 }), bowl(95), bowl(165))));
    expect(r.method).toBe('skeleton');
    expect(r.fidelity?.faithful).toBe(true);
  });
});

describe('a whole page written as one fill', () => {
  it('thousands of rings in one fill nest as they should: each loop its outline and its hole, in a moment', () => {
    const ring = (cx: number, cy: number, r: number, n = 40): Point[] => Array.from({ length: n }, (_, i) => ({ x: cx + r * Math.cos((i / n) * 2 * Math.PI), y: cy + r * Math.sin((i / n) * 2 * Math.PI) }));
    const rings: Point[][] = [];
    for (let i = 0; i < 2500; i++) {
      const cx = 20 + (i % 50) * 30, cy = 20 + Math.floor(i / 50) * 30;
      rings.push(ring(cx, cy, 9), ring(cx, cy, 6).reverse());
    }
    const t0 = Date.now();
    const got = recoverFill({ rings, rule: 'nonzero' });
    expect(Date.now() - t0).toBeLessThan(8000);
    expect(got).toHaveLength(2500);
    expect(got.every((r) => r.kind === 'pen' && r.strokes.length === 1 && r.strokes[0].closed)).toBe(true);
  });
});

describe('the work a file may cost', () => {
  it('with no raster pixels left an outline keeps its ribbon, unmeasured, and says so', () => {
    const ring = penOutline(line({ x: 10, y: 10 }, { x: 200, y: 10 }), { width: 4, cap: 'round' });
    const work = { rasterPx: 10 };
    const r = one(recoverFill(nonzero(ring), { work }));
    expect(r.kind).toBe('pen');
    expect(r.method).toBe('ribbon');
    expect(r.fidelity).toBeUndefined();
    expect(r.notes.join(' ')).toMatch(/ran out/);
  });

  it('spends what it uses: a measured outline takes its raster from the budget', () => {
    const ring = penOutline(line({ x: 10, y: 10 }, { x: 200, y: 10 }), { width: 4, cap: 'round' });
    const work = { rasterPx: 1_000_000 };
    one(recoverFill(nonzero(ring), { work }));
    expect(work.rasterPx).toBeLessThan(1_000_000);
    expect(work.rasterPx).toBeGreaterThan(0);
  });
});

describe('every shape reads as it did before it was an outline', () => {
  const shapes = [
    { shape: 'line' as const, from: { x: 40, y: 40 }, to: { x: 260, y: 90 } },
    { shape: 'rectangle' as const, x: 50, y: 50, w: 180, h: 110 },
    { shape: 'circle' as const, x: 60, y: 60, w: 130, h: 130 },
    { shape: 'triangle' as const, x: 50, y: 50, w: 160, h: 140 },
  ];
  it.each(shapes.map((s) => [s.shape, s] as const))('%s', (_, s) => {
    for (const seed of [1, 2, 3]) {
      const source = handLike(strokeFor(s)!, seed);
      for (const cap of ['round', 'flat'] as const) {
        const ring = penOutline(source, { width: 4, cap });
        const r = one(recoverFill(nonzero(ring)));
        expect(r.fidelity?.faithful).toBe(true);
        const longest = [...r.strokes].sort((a, b) => lengthOf(b.points) - lengthOf(a.points))[0];
        expect(topOf(longest.points)).toBe(topOf(source));
      }
    }
  });
});

describe('the recovery is deterministic and carries no colour', () => {
  it('the same outline twice is the same answer', () => {
    const ring = penOutline(handLike(strokeFor({ shape: 'circle', x: 0, y: 0, w: 90, h: 90 })!, 7), { width: 3, cap: 'round' });
    expect(recoverFill(nonzero(ring))).toEqual(recoverFill(nonzero(ring)));
  });
});

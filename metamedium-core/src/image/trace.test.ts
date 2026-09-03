// Image tracing: a bitmap of a sketch becomes strokes the shape rung reads.
//
// The fixtures are painted here, not photographed: rasterised strokes of
// uneven width on an uneven ground with flecks of noise — the things a phone
// photo of paper has that a clean bitmap does not. A committed photograph
// is the next fixture to add (BUILD-PLAN WP-9a); until then the ≥ 80% bar is
// held against the painted sketch, which is stated plainly.

import { describe, it, expect } from 'vitest';
import { trace, binarize, thin, otsu, luminance, tracePaths, type Bitmap } from './trace';
import { analyzeStroke } from '../recognition';
import type { Point } from '../types';

// ---- a tiny raster painter ------------------------------------------------

function paper(width: number, height: number, ground = 235, gradient = 0): Bitmap {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const v = Math.round(ground - (gradient * x) / width);
    const i = (y * width + x) * 4;
    data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255;
  }
  return { width, height, data };
}

function dot(b: Bitmap, x: number, y: number, r: number, v: number) {
  const d = b.data as Uint8ClampedArray;
  for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++) for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) {
    if (xx < 0 || yy < 0 || xx >= b.width || yy >= b.height) continue;
    if (Math.hypot(xx - x, yy - y) > r) continue;
    const i = (yy * b.width + xx) * 4;
    d[i] = v; d[i + 1] = v; d[i + 2] = v;
  }
}

/** Paint a polyline with a round brush; `wobble` jitters the width like a pen on paper. */
function paint(b: Bitmap, pts: Point[], width = 2, v = 30, wobble = 0, seed = 1) {
  let s = seed;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], c = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(c.x - a.x, c.y - a.y)));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const r = width / 2 + (wobble ? (rnd() - 0.5) * wobble : 0);
      dot(b, a.x + (c.x - a.x) * t, a.y + (c.y - a.y) * t, Math.max(0.6, r), v);
    }
  }
}

const rect = (x: number, y: number, w: number, h: number): Point[] => [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }];
const circle = (cx: number, cy: number, r: number, n = 64): Point[] => {
  const p: Point[] = [];
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2; p.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }); }
  return p;
};
const line = (a: Point, b: Point): Point[] => [a, b];

function speckle(b: Bitmap, count: number, seed = 7) {
  let s = seed;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < count; i++) dot(b, rnd() * b.width, rnd() * b.height, 0.7, 40);
}

function topOf(points: Point[]) {
  return analyzeStroke(points).results[0]?.type;
}

// ---- tests ----------------------------------------------------------------

describe('image tracing', () => {
  it('three boxes in a bitmap trace to three closed strokes that read as rectangles', () => {
    const b = paper(240, 140);
    paint(b, rect(20, 20, 60, 40));
    paint(b, rect(100, 20, 60, 40));
    paint(b, rect(60, 80, 100, 40));
    const r = trace(b);
    expect(r.inverted).toBe(false);
    expect(r.strokes).toHaveLength(3);
    for (const s of r.strokes) {
      expect(s.closed).toBe(true);
      expect(topOf(s.points)).toBe('rectangle');
    }
    expect(r.reasoning).toMatch(/3 strokes \(3 closed\)/);
  });

  it('a light-on-dark picture is inverted, not read as one giant blot', () => {
    const b = paper(120, 80, 20);
    paint(b, rect(20, 20, 60, 40), 2, 230);
    const r = trace(b);
    expect(r.inverted).toBe(true);
    expect(r.strokes).toHaveLength(1);
    expect(topOf(r.strokes[0].points)).toBe('rectangle');
  });

  it('a painted sketch — wobbly pen, a gradient ground, flecks — yields at least 80% of its shapes', () => {
    const b = paper(420, 300, 225, 40);
    const shapes: { pts: Point[]; expect: string }[] = [
      { pts: rect(20, 20, 110, 70), expect: 'rectangle' },
      { pts: rect(160, 20, 110, 70), expect: 'rectangle' },
      { pts: rect(300, 20, 100, 70), expect: 'rectangle' },
      { pts: circle(75, 200, 45), expect: 'circle' },
      { pts: circle(215, 200, 45), expect: 'circle' },
      { pts: line({ x: 300, y: 150 }, { x: 400, y: 250 }), expect: 'line' },
      { pts: line({ x: 300, y: 280 }, { x: 400, y: 280 }), expect: 'line' },
      { pts: [{ x: 130, y: 55 }, { x: 160, y: 55 }], expect: 'line' },
    ];
    shapes.forEach((s, i) => paint(b, s.pts, 3, 35, 1.6, i + 3));
    speckle(b, 40);
    const r = trace(b);
    const read = r.strokes.map((s) => topOf(s.points));
    // Each expected shape is found once among the traced strokes.
    const have = read.slice();
    let found = 0;
    for (const s of shapes) {
      const i = have.indexOf(s.expect);
      if (i >= 0) { found++; have.splice(i, 1); }
    }
    expect(found / shapes.length).toBeGreaterThanOrEqual(0.8);
    // And the flecks did not become strokes: nothing tiny survived.
    expect(r.strokes.every((s) => s.length >= 8)).toBe(true);
  });

  it('the pieces are plain: Otsu splits two levels, thinning leaves one pixel of width, walking joins ends', () => {
    const b = paper(60, 20);
    paint(b, line({ x: 5, y: 10 }, { x: 55, y: 10 }), 5);
    const lum = luminance(b);
    const t = otsu(lum);
    expect(t).toBeGreaterThanOrEqual(30);
    expect(t).toBeLessThan(235);
    const { mask } = binarize(b);
    const sk = thin(mask, b.width, b.height);
    // One pixel wide: every column the line crosses has exactly one skeleton pixel.
    for (let x = 10; x < 50; x++) {
      let n = 0;
      for (let y = 0; y < b.height; y++) n += sk[y * b.width + x];
      expect(n).toBe(1);
    }
    const paths = tracePaths(sk, b.width, b.height);
    expect(paths).toHaveLength(1);
    expect(paths[0].closed).toBe(false);
    expect(paths[0].points.length).toBeGreaterThan(40);
  });

  it('a stroke drawn through another keeps its identity: an arrow traces to a shaft the rung reads as an arrow, or a line and its barb', () => {
    const b = paper(160, 80);
    paint(b, line({ x: 20, y: 40 }, { x: 130, y: 40 }), 2);
    paint(b, [{ x: 110, y: 25 }, { x: 130, y: 40 }, { x: 110, y: 55 }], 2);
    const r = trace(b);
    const kinds = r.strokes.map((s) => topOf(s.points));
    // The shaft survives as one long stroke whichever way the barb was split.
    expect(r.strokes[0].length).toBeGreaterThan(100);
    expect(kinds[0] === 'arrow' || kinds[0] === 'line').toBe(true);
  });
});

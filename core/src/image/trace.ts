// Image tracing: a bitmap of a sketch becomes strokes the engine can read.
//
// A photographed sketch, a scan, a pasted screenshot of a whiteboard: pixels,
// not marks. This module turns the ink in a bitmap into polylines — the same
// `Point[]` a hand produces — so the shape rung, the relations and the roles
// read them like anything drawn on the canvas. Four steps, each plain:
//
//   1. **Threshold.** Luminance, then Otsu's split between paper and ink. If
//      more than half the image is "ink" the picture is light-on-dark and is
//      inverted, so a whiteboard photo and a chalkboard photo both work.
//   2. **Thin.** Zhang–Suen thinning takes a stroke of any width down to its
//      one-pixel centreline, which is the path the hand took.
//   3. **Trace.** The skeleton is walked into paths: from each free end, then
//      from each junction, then what is left (the loops). At a junction the
//      walk continues into the straightest branch, so a shaft keeps going
//      through the barb of an arrow instead of stopping at it.
//   4. **Simplify.** Douglas–Peucker at a pixel and a half, so the staircase
//      of a raster line does not read as a hundred corners; a path shorter
//      than a few pixels is a fleck of noise and is dropped.
//
// No canvas API in core: the caller supplies `{width, height, data}` (RGBA,
// like ImageData) and gets strokes back in the bitmap's pixel coordinates,
// with a closed flag per stroke and a one-line account of what was decided.

import type { Point } from '../types';
import { simplifyStroke } from '../geometry';

/** RGBA pixels, four numbers per pixel, row-major — the shape of ImageData. */
export interface Bitmap {
  width: number;
  height: number;
  data: ArrayLike<number>;
}

export interface TraceOptions {
  /** Luminance split, 0–255. Default: Otsu's threshold, measured from the image. */
  threshold?: number;
  /** Force ink = light pixels (a chalkboard). Default: decided from the ink fraction. */
  invert?: boolean;
  /** Douglas–Peucker tolerance, in pixels. */
  simplifyPx?: number;
  /** Paths shorter than this, in pixels, are noise. */
  minLengthPx?: number;
}

export interface TracedStroke {
  points: Point[];
  closed: boolean;
  /** Path length in pixels, before simplification. */
  length: number;
}

export interface TraceResult {
  strokes: TracedStroke[];
  threshold: number;
  inverted: boolean;
  /** Fraction of pixels read as ink after thresholding. */
  inkFraction: number;
  reasoning: string;
}

export const DEFAULT_SIMPLIFY_PX = 1.5;
export const DEFAULT_MIN_LENGTH_PX = 8;
/** Spacing of the points handed back, in pixels — the density of ink. */
export const DENSIFY_STEP_PX = 2;

/** Per-pixel luminance, 0–255 (Rec. 601 weights). */
export function luminance(bitmap: Bitmap): Float32Array {
  const n = bitmap.width * bitmap.height;
  const out = new Float32Array(n);
  const d = bitmap.data;
  for (let i = 0; i < n; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    out[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return out;
}

/** Otsu's threshold: the split that best separates two classes of intensity. */
export function otsu(lum: Float32Array): number {
  const hist = new Float64Array(256);
  for (let i = 0; i < lum.length; i++) hist[Math.max(0, Math.min(255, Math.round(lum[i])))]++;
  const total = lum.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0, wB = 0, best = 0, threshold = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) { best = between; threshold = t; }
  }
  return threshold;
}

/** Ink mask: 1 where there is ink. Dark-on-light by default; inverted when most of the picture is "ink". */
export function binarize(bitmap: Bitmap, opts: TraceOptions = {}): { mask: Uint8Array; threshold: number; inverted: boolean; inkFraction: number } {
  const lum = luminance(bitmap);
  const threshold = opts.threshold ?? otsu(lum);
  const n = lum.length;
  const mask = new Uint8Array(n);
  let dark = 0;
  // Otsu's t is the top of the darker class, so ink is at or below it.
  for (let i = 0; i < n; i++) if (lum[i] <= threshold) dark++;
  const inverted = opts.invert ?? dark > n / 2;
  let ink = 0;
  for (let i = 0; i < n; i++) {
    const isInk = inverted ? lum[i] > threshold : lum[i] <= threshold;
    if (isInk) { mask[i] = 1; ink++; }
  }
  return { mask, threshold, inverted, inkFraction: n ? ink / n : 0 };
}

/**
 * Zhang–Suen thinning: the mask reduced to one-pixel-wide centrelines.
 * Two sub-iterations a pass, until a pass removes nothing.
 */
export function thin(mask: Uint8Array, width: number, height: number): Uint8Array {
  const img = new Uint8Array(mask);
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= width || y >= height ? 0 : img[y * width + x]);
  const toDelete: number[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (let pass = 0; pass < 2; pass++) {
      toDelete.length = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!img[y * width + x]) continue;
          const p2 = at(x, y - 1), p3 = at(x + 1, y - 1), p4 = at(x + 1, y), p5 = at(x + 1, y + 1);
          const p6 = at(x, y + 1), p7 = at(x - 1, y + 1), p8 = at(x - 1, y), p9 = at(x - 1, y - 1);
          const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (b < 2 || b > 6) continue;
          const seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
          let a = 0;
          for (let i = 0; i < 8; i++) if (seq[i] === 0 && seq[i + 1] === 1) a++;
          if (a !== 1) continue;
          const c1 = pass === 0 ? p2 * p4 * p6 : p2 * p4 * p8;
          const c2 = pass === 0 ? p4 * p6 * p8 : p2 * p6 * p8;
          if (c1 === 0 && c2 === 0) toDelete.push(y * width + x);
        }
      }
      if (toDelete.length) { changed = true; for (const i of toDelete) img[i] = 0; }
    }
  }
  return img;
}

const N8: [number, number][] = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

/**
 * Walk a skeleton into paths. Free ends first, then junctions, then loops;
 * at a fork the walk takes the branch that continues straightest, so one
 * stroke drawn through another keeps its identity.
 */
export function tracePaths(skeleton: Uint8Array, width: number, height: number): { points: Point[]; closed: boolean }[] {
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && skeleton[y * width + x] === 1;
  const visited = new Uint8Array(skeleton.length);
  const free = (x: number, y: number) => on(x, y) && !visited[y * width + x];
  const freeNeighbours = (x: number, y: number) => {
    const out: Point[] = [];
    for (const [dx, dy] of N8) if (free(x + dx, y + dy)) out.push({ x: x + dx, y: y + dy });
    return out;
  };
  const degree = (x: number, y: number) => {
    let d = 0;
    for (const [dx, dy] of N8) if (on(x + dx, y + dy)) d++;
    return d;
  };

  const paths: { points: Point[]; closed: boolean }[] = [];

  function walk(sx: number, sy: number) {
    const points: Point[] = [{ x: sx, y: sy }];
    visited[sy * width + sx] = 1;
    let x = sx, y = sy, lx = 0, ly = 0;
    for (;;) {
      const next = freeNeighbours(x, y);
      if (next.length === 0) break;
      let pick = next[0];
      if (next.length > 1 && (lx || ly)) {
        // The straightest continuation: max cosine with the last direction.
        let best = -Infinity;
        for (const n of next) {
          const dx = n.x - x, dy = n.y - y;
          const cos = (dx * lx + dy * ly) / Math.hypot(dx, dy);
          if (cos > best) { best = cos; pick = n; }
        }
      } else if (next.length > 1) {
        // From a standing start prefer a 4-neighbour over a diagonal one.
        pick = next.find((n) => n.x === x || n.y === y) ?? next[0];
      }
      lx = pick.x - x; ly = pick.y - y;
      x = pick.x; y = pick.y;
      visited[y * width + x] = 1;
      points.push({ x, y });
    }
    const first = points[0], last = points[points.length - 1];
    const closed = points.length > 8 && Math.abs(first.x - last.x) <= 1 && Math.abs(first.y - last.y) <= 1;
    return { points, closed };
  }

  // 1. From every free end.
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (free(x, y) && degree(x, y) === 1) paths.push(walk(x, y));
  }
  // 2. From every junction (what the ends' walks left behind).
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (free(x, y) && degree(x, y) > 2) {
      // Each free branch from this junction is its own path, joined to it.
      while (freeNeighbours(x, y).length > 0) {
        const p = walk(x, y);
        paths.push(p);
        visited[y * width + x] = 0; // the junction can start another branch
      }
      visited[y * width + x] = 1;
    }
  }
  // 3. Loops: whatever is left has no end to start from.
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (free(x, y)) paths.push(walk(x, y));
  }
  return paths;
}

/**
 * Points every `step` pixels along the simplified path. The engine measures
 * everything along the path and expects ink — a stroke that is only its
 * corners has nothing between them to measure — so the traced polyline is
 * given the density a hand would have left.
 */
export function densify(points: Point[], step = 2): Point[] {
  if (points.length < 2) return points;
  const out: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.round(len / step));
    for (let k = 1; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  return out;
}

function pathLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return len;
}

/** The whole pipeline: bitmap in, strokes out. */
export function trace(bitmap: Bitmap, opts: TraceOptions = {}): TraceResult {
  const { mask, threshold, inverted, inkFraction } = binarize(bitmap, opts);
  const skeleton = thin(mask, bitmap.width, bitmap.height);
  const raw = tracePaths(skeleton, bitmap.width, bitmap.height);
  const tol = opts.simplifyPx ?? DEFAULT_SIMPLIFY_PX;
  const minLen = opts.minLengthPx ?? DEFAULT_MIN_LENGTH_PX;
  const strokes: TracedStroke[] = [];
  let dropped = 0;
  for (const p of raw) {
    const length = pathLength(p.points);
    if (length < minLen || p.points.length < 2) { dropped++; continue; }
    let points = simplifyStroke(p.points.map((q) => ({ x: q.x + 0.5, y: q.y + 0.5 })), tol);
    if (p.closed) points = points.concat([{ ...points[0] }]);
    strokes.push({ points: densify(points), closed: p.closed, length });
  }
  strokes.sort((a, b) => b.length - a.length);
  const closed = strokes.filter((s) => s.closed).length;
  return {
    strokes,
    threshold,
    inverted,
    inkFraction,
    reasoning:
      `ink is ${inverted ? 'lighter' : 'darker'} than ${threshold} (${(inkFraction * 100).toFixed(1)}% of the picture); ` +
      `thinned and walked into ${strokes.length} stroke${strokes.length === 1 ? '' : 's'} (${closed} closed), ${dropped} fleck${dropped === 1 ? '' : 's'} dropped`,
  };
}

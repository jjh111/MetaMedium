// A point-cloud matcher: $P (Vatavu, Anthony and Wobbrock, 2012), with $Q's
// early abandoning (2018). MATHS-SPEC §8, Lane F — M8.
//
// A glyph is read as a CLOUD of points, not as a path: the strokes are
// resampled to a fixed number of points, scaled so the larger side is one and
// moved so the centroid is at the origin, and two clouds are compared by
// matching each point of one to the nearest unmatched point of the other,
// greedily, from several starting points, both ways round. The order the
// strokes were drawn in, their direction and how many there were drop out: a
// four drawn in one stroke or in two, an eight from the top or the bottom, are
// the same cloud. What stays is the shape and its orientation — a six is not a
// nine turned over, and nothing here turns a cloud.
//
// Two departures from $P, each for a glyph it could not read:
//   - Every stroke keeps a few points however short it is
//     (`MIN_POINTS_PER_STROKE`): $P shares the points out by length, and the
//     two dots of ÷ — a tap each — got none, so ÷ was a minus.
//   - The distance is a MEAN — the weighted sum over the total weight — so it
//     is in units of the glyph's own size and a number can be set against it.
//
// Pure: no state, no randomness.

import type { Point } from '../types';

/** Points a cloud is resampled to: $P's 32. */
export const CLOUD_POINTS = 32;
/** Every stroke keeps at least this many of them, however short. */
export const MIN_POINTS_PER_STROKE = 3;
/**
 * A stroke this small against its glyph (its larger side, as a share of the
 * glyph's) is a dot, and keeps only the least share of points whatever its
 * length: a dot drawn as a touch and one drawn as a tiny scribble are the same
 * dot, and the scribble's length is the pen's noise, not its shape.
 */
export const DOT_OF_GLYPH = 0.15;
/** $P's ε: the greedy match starts from every ⌊n^(1−ε)⌋-th point. */
const EPSILON = 0.5;

/** A glyph's points, normalised: centroid at the origin, the larger side one. */
export interface Cloud {
  points: readonly Point[];
}

function pathLength(s: readonly Point[]): number {
  let d = 0;
  for (let i = 1; i < s.length; i++) d += Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y);
  return d;
}

/** One stroke resampled to `n` points evenly along its length. A stroke with no length is its point, `n` times. */
export function resampleStroke(s: readonly Point[], n: number): Point[] {
  if (n <= 0 || s.length === 0) return [];
  const len = pathLength(s);
  if (!(len > 0) || s.length === 1) {
    const cx = s.reduce((a, p) => a + p.x, 0) / s.length, cy = s.reduce((a, p) => a + p.y, 0) / s.length;
    return Array.from({ length: n }, () => ({ x: cx, y: cy }));
  }
  if (n === 1) return [{ x: s[0].x, y: s[0].y }];
  const step = len / (n - 1);
  const out: Point[] = [{ x: s[0].x, y: s[0].y }];
  let carry = 0;
  for (let i = 1; i < s.length && out.length < n; i++) {
    const a = s[i - 1], b = s[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (seg === 0) continue;
    let along = step - carry;
    while (along <= seg && out.length < n) {
      const t = along / seg;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      along += step;
    }
    carry = seg - (along - step);
  }
  const last = s[s.length - 1];
  while (out.length < n) out.push({ x: last.x, y: last.y });
  return out;
}

/** How many of the `n` points each stroke gets: by its length, at least `MIN_POINTS_PER_STROKE`. */
export function shareOut(lengths: readonly number[], n = CLOUD_POINTS): number[] {
  const k = lengths.length;
  if (!k) return [];
  const min = Math.min(MIN_POINTS_PER_STROKE, Math.floor(n / k));
  const total = lengths.reduce((a, b) => a + b, 0);
  const free = n - min * k;
  const raw = lengths.map((l) => (total > 0 ? (l / total) * free : free / k));
  const share = raw.map((r) => min + Math.floor(r));
  let left = n - share.reduce((a, b) => a + b, 0);
  // The points left over go to the strokes that lost most to rounding, in order.
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let j = 0; left > 0; j = (j + 1) % k, left--) share[order[j].i]++;
  return share;
}

/** Strokes as a normalised cloud of `n` points. Null when there is no ink. */
export function cloudOf(strokes: readonly (readonly Point[])[], n = CLOUD_POINTS): Cloud | null {
  const kept = strokes.filter((s) => s.length > 0);
  if (!kept.length) return null;
  const box = (s: readonly Point[]) => {
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
    for (const p of s) { if (p.x < a) a = p.x; if (p.y < b) b = p.y; if (p.x > c) c = p.x; if (p.y > d) d = p.y; }
    return { w: c - a, h: d - b, minX: a, minY: b, maxX: c, maxY: d };
  };
  const boxes = kept.map(box);
  const whole = Math.max(Math.max(...boxes.map((b) => b.maxX)) - Math.min(...boxes.map((b) => b.minX)), Math.max(...boxes.map((b) => b.maxY)) - Math.min(...boxes.map((b) => b.minY)));
  const share = shareOut(kept.map((s, i) => (kept.length > 1 && Math.max(boxes[i].w, boxes[i].h) <= DOT_OF_GLYPH * whole ? 0 : pathLength(s))), n);
  const pts: Point[] = [];
  kept.forEach((s, i) => pts.push(...resampleStroke(s, share[i])));
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, cx = 0, cy = 0;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
    cx += p.x;
    cy += p.y;
  }
  cx /= pts.length;
  cy /= pts.length;
  const size = Math.max(maxX - minX, maxY - minY) || 1;
  return { points: pts.map((p) => ({ x: (p.x - cx) / size, y: (p.y - cy) / size })) };
}

/**
 * $P's cloud distance from `a` to `b`, starting at `a[start]`, as a weighted
 * MEAN of the distances matched. Abandoned (returns Infinity) once the
 * weighted sum passes `bound` — $Q's early abandoning.
 */
function cloudDistance(a: readonly Point[], b: readonly Point[], start: number, bound: number): number {
  const n = a.length;
  const matched = new Uint8Array(n);
  let sum = 0;
  let i = start;
  for (let k = 0; k < n; k++) {
    let best = Infinity, index = -1;
    const p = a[i];
    for (let j = 0; j < n; j++) {
      if (matched[j]) continue;
      const dx = p.x - b[j].x, dy = p.y - b[j].y;
      const d = dx * dx + dy * dy;
      if (d < best) {
        best = d;
        index = j;
      }
    }
    matched[index] = 1;
    sum += (1 - k / n) * Math.sqrt(best);
    if (sum >= bound) return Infinity;
    i = (i + 1) % n;
  }
  return sum;
}

/** The total weight of a match of `n` points: Σ (1 − k/n). */
const totalWeight = (n: number) => (n + 1) / 2;

/**
 * The distance between two clouds of the same size: the least, over the
 * starting points and both directions, of the weighted mean distance between
 * matched points — in units of the glyph's size. `within` is a mean distance
 * past which the match is abandoned and Infinity returned.
 */
export function matchClouds(a: Cloud, b: Cloud, within = Infinity): number {
  const n = a.points.length;
  if (n === 0 || n !== b.points.length) return Infinity;
  const w = totalWeight(n);
  let bound = within * w;
  let found = false;
  const step = Math.max(1, Math.floor(Math.pow(n, 1 - EPSILON)));
  for (let i = 0; i < n; i += step) {
    const d1 = cloudDistance(a.points, b.points, i, bound);
    if (d1 < bound) { bound = d1; found = true; }
    const d2 = cloudDistance(b.points, a.points, i, bound);
    if (d2 < bound) { bound = d2; found = true; }
  }
  return found ? bound / w : Infinity;
}

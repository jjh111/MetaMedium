// What a closed outline is, measured the way a notation needs it
// (V1-PLAN §2.3, §3, §9 D1).
//
// The shape rung is blind to rotation by design: it reads a box drawn at any
// tilt as a rectangle (extent against the tightest box at any angle), and
// that is right for the rung — a hand rarely draws square to the screen. A
// notation needs what the rung deliberately does not say. A decision is a
// box TURNED about 45°, and a data symbol is a box whose sides LEAN. So this
// module measures an outline by its corners and their angles:
//
//   - **the four corners that hold it** — the largest quadrilateral with its
//     corners on the outline's hull, and the share of the hull it holds. A
//     box or a diamond holds nearly all of it; a stadium, an oval or a circle
//     holds two thirds to three quarters, because a round end has no corner
//     to hold (a circle 64% whatever its size — the largest square in it);
//   - **how upright** — how far the sides lie from level and plumb;
//   - **how turned** — how far the DIAGONALS lie from level and plumb, one
//     each way: a diamond's corners stand at the top, the right, the bottom
//     and the left;
//   - **how it leans** — two sides level and the other two parallel, leaning
//     off plumb;
//   - **the tightest box at any angle** — its long axis and how elongated.
//
// Every number is a ratio or an angle, so the same outline reads the same at
// any size and any zoom. Nothing here knows a notation's symbols; a notation
// reads these measures (flowchart.ts).

import type { Point } from '../types';

const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const cross = (a: Point, b: Point) => a.x * b.y - a.y * b.x;
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;
export const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const DEG = 180 / Math.PI;

/** 0 below `lo`, 1 above `hi`, straight between. */
export const ramp = (v: number, lo: number, hi: number) => Math.max(0, Math.min(1, (v - lo) / (hi - lo)));

/** The convex hull, counter-clockwise in the maths sense (monotone chain): robust to repeats and straight runs. */
export function hullOf(points: readonly Point[]): Point[] {
  const pts = [...points].filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)).sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length < 3) return pts.map((p) => ({ x: p.x, y: p.y }));
  const lower: Point[] = [], upper: Point[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(sub(lower[lower.length - 1], lower[lower.length - 2]), sub(p, lower[lower.length - 2])) <= 0) lower.pop();
    lower.push(p);
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(sub(upper[upper.length - 1], upper[upper.length - 2]), sub(p, upper[upper.length - 2])) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1)).map((p) => ({ x: p.x, y: p.y }));
}

export function areaOf(v: readonly Point[]): number {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += cross(v[i], v[(i + 1) % v.length]);
  return Math.abs(s) / 2;
}

export function perimeterOf(v: readonly Point[]): number {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += dist(v[i], v[(i + 1) % v.length]);
  return s;
}

/** Inside a convex polygon, either way round. */
export function insideConvex(p: Point, v: readonly Point[]): boolean {
  if (v.length < 3) return false;
  let sign = 0;
  for (let i = 0; i < v.length; i++) {
    const c = cross(sub(v[(i + 1) % v.length], v[i]), sub(p, v[i]));
    if (Math.abs(c) < 1e-9) continue;
    if (sign === 0) sign = Math.sign(c);
    else if (Math.sign(c) !== sign) return false;
  }
  return true;
}

export function distToSegment(p: Point, a: Point, b: Point): number {
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  const t = l2 > 0 ? Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2)) : 0;
  return Math.hypot(p.x - (a.x + ab.x * t), p.y - (a.y + ab.y * t));
}

/** Distance from a point to a closed ring. */
export function distToRing(p: Point, v: readonly Point[]): number {
  if (v.length === 1) return dist(p, v[0]);
  let best = Infinity;
  for (let i = 0; i < v.length; i++) best = Math.min(best, distToSegment(p, v[i], v[(i + 1) % v.length]));
  return best;
}

/** Distance from a point to an open polyline. */
export function distToPath(p: Point, path: readonly Point[]): number {
  if (path.length === 1) return dist(p, path[0]);
  let best = Infinity;
  for (let i = 1; i < path.length; i++) best = Math.min(best, distToSegment(p, path[i - 1], path[i]));
  return best;
}

/** How far a point stands outside a convex outline: 0 on or inside it. */
export function outside(p: Point, hull: readonly Point[]): number {
  if (hull.length >= 3 && insideConvex(p, hull)) return 0;
  return distToRing(p, hull);
}

/** Reduce a hull to at most `max` corners, dropping each time the one whose loss costs least area. */
function reduceHull(hull: readonly Point[], max = 16): Point[] {
  const v = hull.slice();
  while (v.length > max) {
    let k = 0, least = Infinity;
    for (let i = 0; i < v.length; i++) {
      const a = v[(i - 1 + v.length) % v.length], b = v[i], c = v[(i + 1) % v.length];
      const cost = Math.abs(cross(sub(b, a), sub(c, a))) / 2;
      if (cost < least) {
        least = cost;
        k = i;
      }
    }
    v.splice(k, 1);
  }
  return v;
}

/**
 * The largest quadrilateral with its corners on the hull, and the share of
 * the hull's area it holds (`share`); and the share the largest TRIANGLE on
 * it holds (`three`) — a triangle's three corners hold nearly all of it,
 * where a box's or a diamond's best three hold half. The quadrilateral's
 * corners come back in the hull's own order.
 */
export function cornersOf(hull: readonly Point[]): { share: number; three: number; quad: Point[] } {
  const A = areaOf(hull);
  if (hull.length < 4 || A <= 0) return { share: 0, three: hull.length === 3 && A > 0 ? 1 : 0, quad: [] };
  const v = reduceHull(hull);
  const n = v.length;
  let best = 0, tri = 0, quad: Point[] = [];
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      for (let k = j + 1; k < n; k++) {
        tri = Math.max(tri, areaOf([v[i], v[j], v[k]]));
        for (let l = k + 1; l < n; l++) {
          const q = [v[i], v[j], v[k], v[l]];
          const a = areaOf(q);
          if (a > best) {
            best = a;
            quad = q;
          }
        }
      }
  return { share: best / A, three: tri / A, quad: quad.map((p) => ({ x: p.x, y: p.y })) };
}

/** The tightest box at any angle (rotating calipers over the hull): its centre, its long axis, and its two lengths. */
export function tightBox(hull: readonly Point[]): { centre: Point; axis: Point; long: number; short: number; area: number } | null {
  if (hull.length < 3) return null;
  let best: { centre: Point; axis: Point; long: number; short: number; area: number } | null = null;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i], b = hull[(i + 1) % hull.length];
    const len = dist(a, b);
    if (len < 1e-9) continue;
    const u = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (const p of hull) {
      const pu = p.x * u.x + p.y * u.y, pv = -p.x * u.y + p.y * u.x;
      minU = Math.min(minU, pu); maxU = Math.max(maxU, pu);
      minV = Math.min(minV, pv); maxV = Math.max(maxV, pv);
    }
    const w = maxU - minU, h = maxV - minV, area = w * h;
    if (area <= 0 || (best && area >= best.area)) continue;
    const cu = (minU + maxU) / 2, cv = (minV + maxV) / 2;
    const centre = { x: cu * u.x - cv * u.y, y: cu * u.y + cv * u.x };
    const axis = w >= h ? u : { x: -u.y, y: u.x };
    best = { centre, axis, long: Math.max(w, h), short: Math.min(w, h), area };
  }
  return best;
}

/**
 * The same corners going round clockwise as the screen shows it (y down),
 * starting from `first`: the topmost corner (a diamond's), or the top-left
 * one (a box's) — so the same drawing gives the same order however it was
 * drawn.
 */
export function roundFrom(quad: readonly Point[], first: 'top' | 'top-left'): Point[] {
  let v = quad.map((p) => ({ x: p.x, y: p.y }));
  // Screen-clockwise is a positive shoelace sum with y pointing down.
  let s = 0;
  for (let i = 0; i < v.length; i++) s += cross(v[i], v[(i + 1) % v.length]);
  if (s < 0) v = v.reverse();
  let k = 0;
  v.forEach((p, i) => {
    const q = v[k];
    const better = first === 'top'
      ? p.y < q.y - 1e-9 || (Math.abs(p.y - q.y) <= 1e-9 && p.x < q.x)
      : p.x + p.y < q.x + q.y - 1e-9 || (Math.abs(p.x + p.y - (q.x + q.y)) <= 1e-9 && p.y < q.y);
    if (better) k = i;
  });
  return v.map((_, i) => v[(i + k) % v.length]);
}

/** How far a direction lies from level, 0–90°. */
export const offLevel = (v: Point) => Math.atan2(Math.abs(v.y), Math.abs(v.x)) * DEG;
/** How far a direction lies from plumb, 0–90°. */
export const offPlumb = (v: Point) => 90 - offLevel(v);
/** How far a direction lies from the nearer of level and plumb, 0–45°. */
export const offSquare = (v: Point) => Math.min(offLevel(v), offPlumb(v));

/** The angle between two lines, 0–90°, whichever way each points. */
export function between(a: Point, b: Point): number {
  const la = Math.hypot(a.x, a.y), lb = Math.hypot(b.x, b.y);
  if (la < 1e-9 || lb < 1e-9) return 90;
  return Math.acos(Math.min(1, Math.abs(dot(a, b)) / (la * lb))) * DEG;
}

/** Interior angles of a convex polygon, degrees. */
export function anglesOf(v: readonly Point[]): number[] {
  const n = v.length;
  return v.map((p, i) => {
    const a = sub(v[(i - 1 + n) % n], p), b = sub(v[(i + 1) % n], p);
    const la = Math.hypot(a.x, a.y), lb = Math.hypot(b.x, b.y);
    if (la < 1e-9 || lb < 1e-9) return 180;
    return Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (la * lb)))) * DEG;
  });
}

/** How a quadrilateral stands, in degrees — the measures a notation reads a box, a diamond and a leaning box from. */
export interface QuadStance {
  /** The corners from the top-left, clockwise on screen: a box's top edge is the first side. */
  box: Point[];
  /** The corners from the top, clockwise on screen: a diamond's top, right, bottom and left. */
  diamond: Point[];
  /** The side furthest from level or plumb: 0 for a box square to the screen. */
  upright: number;
  /** The corner furthest from a right angle. */
  square: number;
  /** How far the diagonals stand from one level and one plumb: 0 for a diamond. */
  turned: number;
  /** The top and bottom sides' furthest from level. */
  level: number;
  /** The angle between the two other sides: 0 when they are parallel. */
  parallel: number;
  /** How far those two sides lean off plumb, on average. */
  lean: number;
}

export function stanceOf(quad: readonly Point[]): QuadStance {
  const box = roundFrom(quad, 'top-left');
  const diamond = roundFrom(quad, 'top');
  const sides = box.map((p, i) => sub(box[(i + 1) % 4], p));
  const upright = Math.max(...sides.map(offSquare));
  const square = Math.max(...anglesOf(box).map((a) => Math.abs(a - 90)));
  const d1 = sub(diamond[2], diamond[0]), d2 = sub(diamond[3], diamond[1]);
  // The top-to-bottom diagonal should be plumb and the right-to-left one level.
  const turned = Math.max(offPlumb(d1), offLevel(d2));
  const level = Math.max(offLevel(sides[0]), offLevel(sides[2]));
  const parallel = between(sides[1], sides[3]);
  const lean = (offPlumb(sides[1]) + offPlumb(sides[3])) / 2;
  return { box, diamond, upright, square, turned, level, parallel, lean };
}

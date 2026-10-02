// Affine maps of the plane — what a connector that follows its bindings is
// carried by (V1-PLAN E2, session/follow.ts), and the hand's own placement of
// a mark (its transform's fit, then its turn) as one map, so the two compose.
//
// `{ a, b, c, d, e, f }` is SVG's matrix(a, b, c, d, e, f):
//
//     x' = a·x + c·y + e
//     y' = b·x + d·y + f
//
// A similarity — a turn, an even scale and a step — is the case the follow
// makes in board space: `a = d`, `b = -c`, the complex number a + bi times z,
// plus e + fi. Carried into a mark's own space it may shear, when the hand's
// transform stretched the mark unevenly; on the board it is still the
// similarity it was.

import type { Point } from '../types';

export interface Affine {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export const IDENTITY: Affine = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** A map a log can be trusted to hold: six finite numbers that can be undone. */
export function isAffine(m: unknown): m is Affine {
  if (!m || typeof m !== 'object') return false;
  const o = m as Record<string, unknown>;
  for (const k of ['a', 'b', 'c', 'd', 'e', 'f']) if (typeof o[k] !== 'number' || !Number.isFinite(o[k] as number)) return false;
  const det = (o.a as number) * (o.d as number) - (o.b as number) * (o.c as number);
  return Number.isFinite(det) && Math.abs(det) > 1e-12;
}

/** `m` applied to `p`, every other field of the point (a pen's pressure) kept. */
export function applyAffine<P extends Point>(m: Affine, p: P): P {
  return { ...p, x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
}

/** `outer ∘ inner`: first `inner`, then `outer`. */
export function compose(outer: Affine, inner: Affine): Affine {
  return {
    a: outer.a * inner.a + outer.c * inner.b,
    b: outer.b * inner.a + outer.d * inner.b,
    c: outer.a * inner.c + outer.c * inner.d,
    d: outer.b * inner.c + outer.d * inner.d,
    e: outer.a * inner.e + outer.c * inner.f + outer.e,
    f: outer.b * inner.e + outer.d * inner.f + outer.f,
  };
}

/** The map that undoes `m`, or null when nothing can (it flattens the plane). */
export function invert(m: Affine): Affine | null {
  const det = m.a * m.d - m.b * m.c;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null;
  const a = m.d / det, b = -m.b / det, c = -m.c / det, d = m.a / det;
  return { a, b, c, d, e: -(a * m.e + c * m.f), f: -(b * m.e + d * m.f) };
}

/** A step by (dx, dy). */
export function translation(dx: number, dy: number): Affine {
  return { a: 1, b: 0, c: 0, d: 1, e: dx, f: dy };
}

/**
 * The similarity that holds `pivot` where it is and takes `from` to `to` —
 * a turn and an even scale about the pivot. `from` must not be the pivot.
 */
export function pivotMap(pivot: Point, from: Point, to: Point): Affine {
  // w = (to − pivot) / (from − pivot), as complex numbers.
  const fx = from.x - pivot.x, fy = from.y - pivot.y;
  const tx = to.x - pivot.x, ty = to.y - pivot.y;
  const n = fx * fx + fy * fy;
  const wr = (tx * fx + ty * fy) / n, wi = (ty * fx - tx * fy) / n;
  // z ↦ pivot + w·(z − pivot)
  return { a: wr, b: wi, c: -wi, d: wr, e: pivot.x - wr * pivot.x + wi * pivot.y, f: pivot.y - wi * pivot.x - wr * pivot.y };
}

/**
 * The similarity that takes `p1` to `q1` and `p2` to `q2` — the one map that
 * carries two points where they must go. `p1` and `p2` must differ.
 */
export function carry(p1: Point, p2: Point, q1: Point, q2: Point): Affine {
  // w = (q2 − q1) / (p2 − p1); z ↦ q1 + w·(z − p1)
  const px = p2.x - p1.x, py = p2.y - p1.y;
  const qx = q2.x - q1.x, qy = q2.y - q1.y;
  const n = px * px + py * py;
  const wr = (qx * px + qy * py) / n, wi = (qy * px - qx * py) / n;
  return { a: wr, b: wi, c: -wi, d: wr, e: q1.x - wr * p1.x + wi * p1.y, f: q1.y - wi * p1.x - wr * p1.y };
}

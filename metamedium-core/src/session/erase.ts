// Scratch-out erase: crossing-counted, not gesture-matched.
//
// Erasing is RELATIONAL, not gestural. To scratch a mark out you cross it, back
// and forth — so we count intersections between the stroke and the target's own
// outline. Three crossings erases it.
//
// This replaces the obvious approach (fingerprint the scribble: count direction
// reversals, measure ink density) for a reason worth recording. Those thresholds
// tune against dense synthetic zigzags, but a real hand-drawn scratch is sparse
// (~60Hz sampling, 25–35px between points), wide, and only 2–4 passes. A 3-pass
// scratch across a 240×170 shape lays ~720px of ink against an 820px perimeter
// term — it scores 0.87 against a 1.3 bar and silently fails to erase.
//
// Crossing-counting has no speed, density, or size constant to tune, it is
// zoom-invariant, and it degrades honestly: a line drawn *through* a shape
// crosses twice and is safe; a stroke on empty canvas crosses nothing. It also
// says what the engine already knows how to say — that two things intersect.
//
// Provenance: hand-tuned and proven in johnhanacek/design.html, brought into
// core here with the reasoning intact.
//
// A head is not a scratch (V1-PLAN §9 W1): when every crossing of a mark falls
// where the stroke meets it — within the barb at one of its ends, measured on
// the stroke itself, at an end of it that lands on the mark (on its ink, or on
// a site where the pen's magnet binds it), or at an end of that mark drawn
// over — the stroke is arriving, not rubbing out, and the mark stands.
//
// Found by E2: an arrow drawn in one stroke whose two-wing head lands on a
// box's outline crosses it three or four times — in along the shaft, out along
// a wing, back to the tip, out along the other — and three crossings rubbed
// out the box, the commonest act in a diagram; a wing or a chevron drawn apart,
// starting on the shaft's own tip, rubbed out the shaft. A real scratch crosses
// a mark away from any end — back and forth across it, pass after pass — so it
// erases as it always did: no scratch the corpus holds reads as an arrow, and
// every one crosses its mark far from where it begins or ends. The session
// says where the two meet (`meetingsOf`, session.ts); this module only asks
// whether every crossing falls there (`crossesOnlyWhereTheyMeet`). A bind is
// never in the log before its stroke, so "about to be bound" is the magnet's
// own reach, read as the pen reads it.

import type { Bounds, Point } from '../types';

/** Crossings required before a stroke is read as scratching a mark out. */
export const DEFAULT_ERASE_CROSSINGS = 3;

/** Do segments p1→p2 and p3→p4 properly cross? Collinear touching doesn't count. */
export function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (Math.abs(d) < 1e-10) return false; // parallel or degenerate
  const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

/**
 * The outline a mark occupies. Open strokes are their own path; closed strokes
 * and bounds-only nodes (artifacts) close back to the start, so a scratch
 * through the middle of a box crosses two walls rather than one.
 */
export function outlineOf(target: { points?: Point[]; bounds?: Bounds; closed?: boolean }): Point[] | null {
  if (target.points && target.points.length >= 2) {
    const pts = target.points;
    if (target.closed) return pts.concat([pts[0]]);
    return pts;
  }
  const b = target.bounds;
  if (!b) return null;
  return [
    { x: b.minX, y: b.minY },
    { x: b.maxX, y: b.minY },
    { x: b.maxX, y: b.maxY },
    { x: b.minX, y: b.maxY },
    { x: b.minX, y: b.minY },
  ];
}

/** Where segments p1→p2 and p3→p4 cross, as a share of p1→p2 — the same test as `segmentsIntersect` — or null. */
function crossingAt(p1: Point, p2: Point, p3: Point, p4: Point): number | null {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (Math.abs(d) < 1e-10) return null;
  const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null;
}

/** Where `stroke` crosses `outline`: each crossing's point, in the stroke's order, the same crossings `countCrossings` counts. Stops at `max`. */
export function crossingPoints(stroke: Point[], outline: Point[], max = Infinity): Point[] {
  const out: Point[] = [];
  for (let i = 1; i < stroke.length; i++) {
    const a = stroke[i - 1], b = stroke[i];
    for (let j = 1; j < outline.length; j++) {
      const t = crossingAt(a, b, outline[j - 1], outline[j]);
      if (t === null) continue;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      if (out.length >= max) return out;
    }
  }
  return out;
}

/** How far `p` stands from a path — its nearest segment, the closing one too when `closed`. */
export function distanceToPath(p: Point, path: Point[], closed = false): number {
  if (path.length === 0) return Infinity;
  if (path.length === 1) return Math.hypot(p.x - path[0].x, p.y - path[0].y);
  let best = Infinity;
  const n = closed ? path.length + 1 : path.length;
  for (let i = 1; i < n; i++) {
    const a = path[i - 1], b = path[i % path.length];
    const abx = b.x - a.x, aby = b.y - a.y;
    const l2 = abx * abx + aby * aby;
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / l2)) : 0;
    const d = Math.hypot(p.x - (a.x + abx * t), p.y - (a.y + aby * t));
    if (d < best) best = d;
  }
  return best;
}

/**
 * A place where a stroke meets a mark — a disc about a point. Crossings of the
 * mark's outline inside it are the two meeting, a head arriving or an end
 * landing, and count toward no scratch.
 */
export interface Meeting {
  at: Point;
  radius: number;
  /** Where, in the terms it was measured in: "its head", "its end on the mark's ink". */
  why: string;
}

/**
 * The head at one end of a stroke the shape rung reads as an arrow — its
 * reading's `meta`: which end the head is at, the tail, and the tip where the
 * rung measured the barb's turn. The tip is where the pen FIRST reaches its
 * farthest along the shaft coming from the tail, within `near`, and then as
 * far as it goes on reaching: a two-wing barb comes back to the tip between
 * its wings, and the rung's own tip can sit a wing's length short (heads.ts
 * finds a connector's tip the same way). The head is the disc about that tip
 * that holds the barb — the ink from the tip on — so it is measured on the
 * stroke itself, never in pixels: a head three times the size reaches three
 * times as far. Null when the barb reaches as far as the shaft is long: a
 * second arm, not a head.
 */
export function headOf(points: Point[], arrow: { head?: string; tip?: Point; tail?: Point }, near: number): Meeting | null {
  if (!arrow.tip || !arrow.tail || points.length < 3) return null;
  const { tip: rough, tail } = arrow;
  const L = Math.hypot(rough.x - tail.x, rough.y - tail.y);
  if (!(L > 0)) return null;
  const ux = (rough.x - tail.x) / L, uy = (rough.y - tail.y) / L;
  const along = (p: Point) => (p.x - tail.x) * ux + (p.y - tail.y) * uy;
  const order = arrow.head === 'start' ? points.map((_, i) => points.length - 1 - i) : points.map((_, i) => i);
  let far = -Infinity;
  for (const p of points) far = Math.max(far, along(p));
  let k = order.findIndex((i) => along(points[i]) >= far - near);
  if (k < 0) return null;
  while (k + 1 < order.length && along(points[order[k + 1]]) >= along(points[order[k]])) k++;
  const tip = points[order[k]];
  let reach = 0;
  for (let j = k; j < order.length; j++) {
    const q = points[order[j]];
    reach = Math.max(reach, Math.hypot(q.x - tip.x, q.y - tip.y));
  }
  const shaft = Math.hypot(tip.x - tail.x, tip.y - tail.y);
  if (!(reach > 0) || reach >= shaft) return null;
  return { at: { x: tip.x, y: tip.y }, radius: reach, why: `its head — the barb within ${Math.round(reach)} of its tip` };
}

/** Whether every crossing of `stroke` with `outline` falls where the two meet — inside one of `meetings`. */
export function crossesOnlyWhereTheyMeet(stroke: Point[], outline: Point[], meetings: readonly Meeting[]): boolean {
  if (meetings.length === 0) return false;
  // A billionth of the coordinates: a crossing on the rim of a meeting is in it.
  const slack = (m: Meeting) => m.radius + 1e-9 * (1 + Math.abs(m.at.x) + Math.abs(m.at.y));
  for (const c of crossingPoints(stroke, outline)) {
    if (!meetings.some((m) => Math.hypot(c.x - m.at.x, c.y - m.at.y) <= slack(m))) return false;
  }
  return true;
}

/** How many times `stroke` crosses `outline`. Stops early at `max` — that's enough. */
export function countCrossings(stroke: Point[], outline: Point[], max = DEFAULT_ERASE_CROSSINGS): number {
  let n = 0;
  for (let i = 1; i < stroke.length; i++) {
    for (let j = 1; j < outline.length; j++) {
      if (segmentsIntersect(stroke[i - 1], stroke[i], outline[j - 1], outline[j])) {
        n++;
        if (n >= max) return n;
      }
    }
  }
  return n;
}

export interface ScratchTarget {
  id: string;
  points?: Point[];
  bounds?: Bounds;
  closed?: boolean;
}

/** The box a run of points spans. */
function spanOf(points: Point[]): Bounds {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Whether two boxes could hold a crossing. Two segments can only cross where
 * both are, so strokes whose boxes stand apart cross nothing — and a box is
 * one pass over the points where counting crossings is a pass over every pair
 * of segments. The boxes are compared with a margin of a billionth of their
 * coordinates, so a crossing the segment test would find at the very edge of
 * a box (where rounding lives) is never ruled out by this one.
 */
export function mayCross(a: Bounds, b: Bounds): boolean {
  const pad = 1e-9 * (1 + Math.max(Math.abs(a.minX), Math.abs(a.maxX), Math.abs(a.minY), Math.abs(a.maxY), Math.abs(b.minX), Math.abs(b.maxX), Math.abs(b.minY), Math.abs(b.maxY)));
  // Written so a box that is not a number meets everything: never ruled out here.
  return !(a.maxX + pad < b.minX || b.maxX + pad < a.minX || a.maxY + pad < b.minY || b.maxY + pad < a.minY);
}

/**
 * Which of `targets` this stroke scratched out. Empty means it is ordinary ink —
 * which is the common case, and why this is safe to run on every stroke.
 * A target whose outline's box stands clear of the stroke's is passed over
 * before a single crossing is counted (`mayCross`): it has none to count.
 * `meetingsOf`, when given, says where the stroke meets a target it crossed
 * enough; crossings that all fall there are the stroke arriving, and the
 * target stands (this file's header). It is asked only of a target already
 * crossed enough, which ordinary ink never is.
 */
export function scratchedOut(
  points: Point[],
  targets: ScratchTarget[],
  minCrossings = DEFAULT_ERASE_CROSSINGS,
  meetingsOf?: (id: string) => readonly Meeting[]
): string[] {
  if (points.length < 3) return [];
  const span = spanOf(points);
  const hit: string[] = [];
  for (const t of targets) {
    const outline = outlineOf(t);
    if (!outline) continue;
    if (!mayCross(span, spanOf(outline))) continue;
    if (countCrossings(points, outline, minCrossings) < minCrossings) continue;
    if (meetingsOf && crossesOnlyWhereTheyMeet(points, outline, meetingsOf(t.id))) continue;
    hit.push(t.id);
  }
  return hit;
}

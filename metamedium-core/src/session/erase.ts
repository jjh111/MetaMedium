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

/**
 * Which of `targets` this stroke scratched out. Empty means it is ordinary ink —
 * which is the common case, and why this is safe to run on every stroke.
 */
export function scratchedOut(
  points: Point[],
  targets: ScratchTarget[],
  minCrossings = DEFAULT_ERASE_CROSSINGS
): string[] {
  if (points.length < 3) return [];
  const hit: string[] = [];
  for (const t of targets) {
    const outline = outlineOf(t);
    if (!outline) continue;
    if (countCrossings(points, outline, minCrossings) >= minCrossings) hit.push(t.id);
  }
  return hit;
}

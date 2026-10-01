// A hand moving, scaling or turning marks (the selection's own handles), as
// pure functions of a mark: the one thing the session's reducer does to each
// mark a manipulation moves, so a surface's preview of a drag can ask what
// the mark will be when the hand lets go — and what follows it (V1-PLAN E2,
// follow.ts) — with the very function the replay runs.
//
// The ink is never touched: a mark gains a `'transform'` rep (its frame, where
// it now sits) and, turned, a `'rotation'` rep (its angle about that frame's
// centre); `placed` (nodes.ts) composes them. Undo drops them.

import type { Bounds, Point } from '../types';
import type { MMNode, Rep } from './nodes';
import { fingerprintOf, getRep, regionRepOf } from './nodes';
import { pictureOf } from '../kinds/picture';

/** A move, a scale about a point, or a turn about a point — what a drag of the selection writes. */
export type Manipulation =
  | { type: 'move'; dx: number; dy: number }
  | { type: 'scale'; about: Point; sx: number; sy: number }
  | { type: 'rotate'; about: Point; radians: number };

/**
 * The marks a manipulation of these marks moves: a stroke itself, or an artifact's or a word's members,
 * recursively — never an erased one — and a picture, which has no ink to move in its place and is moved as
 * itself (PLAN-IPAD-NOTES I1): a picture is a mark of the board, drawn under the ink. So is a region
 * (I5), a file brought in with no marks in it, and each carries its own `transform`.
 */
export function manipulableOf(nodes: ReadonlyMap<string, MMNode>, ids: readonly string[]): MMNode[] {
  const out: MMNode[] = [];
  const seen = new Set<string>();
  const visit = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    const n = nodes.get(id);
    if (!n || getRep(n, 'erased')) return;
    if (getRep(n, 'stroke') || pictureOf(n) || regionRepOf(n)) {
      out.push(n);
      return;
    }
    const parts = n.edges.filter((e) => e.rel === 'has-part');
    // A file brought onto the board — a text, a figure — has no marks in it and stands at its own box:
    // it is moved as itself, as a picture is (PLAN-IPAD-NOTES I5: a region carries them).
    if (!parts.length && getRep(n, 'code') && getRep(n, 'bounds')) {
      out.push(n);
      return;
    }
    for (const e of parts) visit(e.to);
  };
  ids.forEach(visit);
  return out;
}

/** A mark's current axis-aligned frame, before rotation — the thing transform reps describe. */
export function markFrameOf(node: MMNode): Bounds | undefined {
  const moved = getRep(node, 'transform')?.data as Bounds | undefined;
  if (moved) return moved;
  // A picture has no fingerprint: the box it was placed in is its frame.
  return fingerprintOf(node)?.bounds ?? (getRep(node, 'bounds')?.data as Bounds | undefined);
}

/** A scale's factors as the reducer takes them: never under a thousandth, so a frame is never flattened. */
export function scaleFactors(sx: number, sy: number): { sx: number; sy: number } {
  return { sx: sx > 1e-3 ? sx : 1e-3, sy: sy > 1e-3 ? sy : 1e-3 };
}

/**
 * The reps a stroke holds once the hand has moved, scaled or turned it: its
 * transform — and, turned, its rotation — replaced, in that order, at the end
 * of its reps; nothing else. Null for a mark with no frame to move.
 */
export function manipulatedReps(node: MMNode, m: Manipulation): Rep[] | null {
  const b = markFrameOf(node);
  if (!b) return null;
  let to: Bounds;
  if (m.type === 'move') {
    to = { minX: b.minX + m.dx, maxX: b.maxX + m.dx, minY: b.minY + m.dy, maxY: b.maxY + m.dy };
  } else if (m.type === 'scale') {
    const { sx, sy } = scaleFactors(m.sx, m.sy);
    to = {
      minX: m.about.x + (b.minX - m.about.x) * sx, maxX: m.about.x + (b.maxX - m.about.x) * sx,
      minY: m.about.y + (b.minY - m.about.y) * sy, maxY: m.about.y + (b.maxY - m.about.y) * sy,
    };
  } else {
    // Each mark turns about its own centre, and its centre swings about the pivot.
    const c = Math.cos(m.radians), s = Math.sin(m.radians);
    const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
    const nx = m.about.x + (cx - m.about.x) * c - (cy - m.about.y) * s;
    const ny = m.about.y + (cx - m.about.x) * s + (cy - m.about.y) * c;
    to = { minX: b.minX + nx - cx, maxX: b.maxX + nx - cx, minY: b.minY + ny - cy, maxY: b.maxY + ny - cy };
  }
  const reps = node.reps.filter((r) => r.modality !== 'transform');
  reps.push({ modality: 'transform', data: to, source: 'user' });
  if (m.type !== 'rotate') return reps;
  const prev = (getRep(node, 'rotation')?.data as number | undefined) ?? 0;
  const turned = reps.filter((r) => r.modality !== 'rotation');
  turned.push({ modality: 'rotation', data: prev + m.radians, source: 'user' });
  return turned;
}

/** Where a point on a moved mark goes: the manipulation as a map of the board (a turn is rigid about its pivot). */
export function manipulationMap(m: Manipulation): (p: Point) => Point {
  if (m.type === 'move') return (p) => ({ x: p.x + m.dx, y: p.y + m.dy });
  if (m.type === 'scale') {
    const { sx, sy } = scaleFactors(m.sx, m.sy), o = m.about;
    return (p) => ({ x: o.x + (p.x - o.x) * sx, y: o.y + (p.y - o.y) * sy });
  }
  const c = Math.cos(m.radians), s = Math.sin(m.radians), o = m.about;
  return (p) => ({ x: o.x + (p.x - o.x) * c - (p.y - o.y) * s, y: o.y + (p.x - o.x) * s + (p.y - o.y) * c });
}

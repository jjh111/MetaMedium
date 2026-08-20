// The relations Tier 0 can see, measured rather than declared.
//
// This is the vocabulary everything else is built on: concepts match against
// it, the gesture resolves scope with it, and a model is handed it as fact
// rather than being asked to infer it from coordinates. Insideness, nearness,
// alignment and direction are things the canvas KNOWS — they should not be
// re-derived by anyone downstream.
//
// Two rules, both learned the hard way elsewhere in this engine:
//
//   1. **Every threshold is a ratio, never a pixel count.** The old spatial
//      graph called anything within 50px "touching", which means one thing on a
//      drawing of postage stamps and something else entirely on a wall-sized
//      board — and something different again at every zoom level.
//   2. **Relations carry strength, not just existence.** "Near" is a matter of
//      degree, and a concept that needs three things in a row should be able to
//      tell a crisp row from a rough one.

import type { Bounds, Point } from '../types';
import { boundsContain, boundsOverlap, boundingBoxDistance } from '../geometry';
import { segmentsIntersect } from '../session/erase';

export type RelationKind =
  /** `from` encloses `to`. */
  | 'contains'
  /** `from` sits inside `to` — the inverse, stored so either end can be asked. */
  | 'inside'
  /** The strokes actually cross. */
  | 'crossing'
  /** Bounds overlap or abut without one enclosing the other. */
  | 'touching'
  /** Close enough, relative to their own size, to read as belonging together. */
  | 'near'
  | 'above'
  | 'below'
  | 'left-of'
  | 'right-of'
  /** Centres lie on a common horizontal line: side by side, as in a row. */
  | 'same-row'
  /** Centres lie on a common vertical line: stacked, as in a column. */
  | 'same-column'
  /** Comparable in size — what makes a set of marks read as peers. */
  | 'same-size';

export interface Relation {
  kind: RelationKind;
  from: string;
  to: string;
  /** 0–1. How strongly this holds, measured. */
  strength: number;
  /** Why, in the terms it was measured in. Surfaced by "why?" and sent to models. */
  reasoning: string;
}

export interface Mark {
  id: string;
  bounds: Bounds;
  /** The stroke itself, when there is one — needed for real crossing tests. */
  points?: Point[];
  closed?: boolean;
}

export interface RelateConfig {
  /** Gap counts as `near` below this fraction of the smaller mark's size. */
  nearRatio: number;
  /** Centres count as aligned below this fraction of the smaller extent. */
  alignRatio: number;
  /** Perpendicular overlap needed before a direction is worth stating. */
  directionOverlap: number;
  /** Size ratio above which two marks read as peers. */
  peerRatio: number;
}

export const DEFAULT_RELATE_CONFIG: RelateConfig = {
  nearRatio: 0.6,
  alignRatio: 0.22,
  directionOverlap: 0.3,
  peerRatio: 0.62,
};

const w = (b: Bounds) => b.maxX - b.minX;
const h = (b: Bounds) => b.maxY - b.minY;
const cx = (b: Bounds) => (b.minX + b.maxX) / 2;
const cy = (b: Bounds) => (b.minY + b.maxY) / 2;
const sizeOf = (b: Bounds) => Math.max(w(b), h(b));

/** Overlap of two 1-D ranges, as a fraction of the shorter one. */
function overlapFraction(aMin: number, aMax: number, bMin: number, bMax: number): number {
  const shorter = Math.min(aMax - aMin, bMax - bMin);
  if (shorter <= 0) return 0;
  return Math.max(0, Math.min(aMax, bMax) - Math.max(aMin, bMin)) / shorter;
}

function crossings(a: Point[], b: Point[], max = 4): number {
  let n = 0;
  for (let i = 1; i < a.length; i++) {
    for (let j = 1; j < b.length; j++) {
      if (segmentsIntersect(a[i - 1], a[i], b[j - 1], b[j])) {
        if (++n >= max) return n;
      }
    }
  }
  return n;
}

/**
 * Every relation that holds between every pair of marks.
 *
 * Pairwise and O(n²), which is right for a drawing: the interesting relations
 * are local, and a board large enough for that to hurt wants a spatial index
 * rather than a cheaper rule.
 */
export function relate(marks: Mark[], config: RelateConfig = DEFAULT_RELATE_CONFIG): Relation[] {
  const out: Relation[] = [];
  const add = (kind: RelationKind, from: string, to: string, strength: number, reasoning: string) => {
    if (strength > 0) out.push({ kind, from, to, strength: Math.min(1, strength), reasoning });
  };

  for (let i = 0; i < marks.length; i++) {
    for (let j = i + 1; j < marks.length; j++) {
      const a = marks[i];
      const b = marks[j];
      const ab = a.bounds;
      const bb = b.bounds;
      // Judged against the SMALLER mark: a dot two hundred pixels from a large
      // box is not near it, however small that gap looks beside the box.
      const ref = Math.max(1, Math.min(sizeOf(ab), sizeOf(bb)));

      // --- Containment ---
      if (boundsContain(ab, bb)) {
        const margin = Math.min(bb.minX - ab.minX, bb.minY - ab.minY, ab.maxX - bb.maxX, ab.maxY - bb.maxY);
        const strength = Math.min(1, 0.5 + margin / Math.max(1, sizeOf(ab)));
        add('contains', a.id, b.id, strength, `${b.id} sits wholly inside ${a.id}`);
        add('inside', b.id, a.id, strength, `${b.id} sits wholly inside ${a.id}`);
        continue; // containment is the whole story for this pair
      }
      if (boundsContain(bb, ab)) {
        const margin = Math.min(ab.minX - bb.minX, ab.minY - bb.minY, bb.maxX - ab.maxX, bb.maxY - ab.maxY);
        const strength = Math.min(1, 0.5 + margin / Math.max(1, sizeOf(bb)));
        add('contains', b.id, a.id, strength, `${a.id} sits wholly inside ${b.id}`);
        add('inside', a.id, b.id, strength, `${a.id} sits wholly inside ${b.id}`);
        continue;
      }

      // --- Contact ---
      const gap = boundingBoxDistance(ab, bb);
      if (a.points && b.points) {
        const n = crossings(a.points, b.points);
        if (n > 0) {
          add('crossing', a.id, b.id, Math.min(1, 0.5 + n * 0.15), `their strokes cross ${n === 4 ? '4 or more' : n} time(s)`);
          add('crossing', b.id, a.id, Math.min(1, 0.5 + n * 0.15), `their strokes cross ${n === 4 ? '4 or more' : n} time(s)`);
        }
      }
      if (boundsOverlap(ab, bb)) {
        const depth = overlapFraction(ab.minX, ab.maxX, bb.minX, bb.maxX) * overlapFraction(ab.minY, ab.maxY, bb.minY, bb.maxY);
        add('touching', a.id, b.id, 0.5 + depth * 0.5, 'their areas overlap');
        add('touching', b.id, a.id, 0.5 + depth * 0.5, 'their areas overlap');
      }
      const nearLimit = config.nearRatio * ref;
      if (gap < nearLimit) {
        const strength = 1 - gap / nearLimit;
        const pct = Math.round((gap / ref) * 100);
        add('near', a.id, b.id, strength, `${Math.round(gap)}px apart — ${pct}% of the smaller mark`);
        add('near', b.id, a.id, strength, `${Math.round(gap)}px apart — ${pct}% of the smaller mark`);
      }

      // --- Direction, but only when they actually share a band ---
      const vOverlap = overlapFraction(ab.minY, ab.maxY, bb.minY, bb.maxY);
      const hOverlap = overlapFraction(ab.minX, ab.maxX, bb.minX, bb.maxX);
      if (vOverlap >= config.directionOverlap) {
        const [left, right] = cx(ab) <= cx(bb) ? [a, b] : [b, a];
        add('left-of', left.id, right.id, vOverlap, `they share a horizontal band (${Math.round(vOverlap * 100)}%)`);
        add('right-of', right.id, left.id, vOverlap, `they share a horizontal band (${Math.round(vOverlap * 100)}%)`);
      }
      if (hOverlap >= config.directionOverlap) {
        const [top, bottom] = cy(ab) <= cy(bb) ? [a, b] : [b, a];
        add('above', top.id, bottom.id, hOverlap, `they share a vertical band (${Math.round(hOverlap * 100)}%)`);
        add('below', bottom.id, top.id, hOverlap, `they share a vertical band (${Math.round(hOverlap * 100)}%)`);
      }

      // --- Alignment: the thing that makes a set read as deliberate ---
      const dy = Math.abs(cy(ab) - cy(bb));
      const dx = Math.abs(cx(ab) - cx(bb));
      const rowTol = config.alignRatio * Math.max(1, Math.min(h(ab), h(bb)));
      const colTol = config.alignRatio * Math.max(1, Math.min(w(ab), w(bb)));
      if (dy < rowTol) {
        add('same-row', a.id, b.id, 1 - dy / rowTol, `centres within ${Math.round(dy)}px vertically`);
        add('same-row', b.id, a.id, 1 - dy / rowTol, `centres within ${Math.round(dy)}px vertically`);
      }
      if (dx < colTol) {
        add('same-column', a.id, b.id, 1 - dx / colTol, `centres within ${Math.round(dx)}px horizontally`);
        add('same-column', b.id, a.id, 1 - dx / colTol, `centres within ${Math.round(dx)}px horizontally`);
      }

      // --- Peerhood ---
      const ratio = Math.min(sizeOf(ab), sizeOf(bb)) / Math.max(1, Math.max(sizeOf(ab), sizeOf(bb)));
      if (ratio > config.peerRatio) {
        add('same-size', a.id, b.id, ratio, `within ${Math.round((1 - ratio) * 100)}% of each other in size`);
        add('same-size', b.id, a.id, ratio, `within ${Math.round((1 - ratio) * 100)}% of each other in size`);
      }
    }
  }
  return out;
}

// ===== Reading the graph =====

export function relationsOf(relations: Relation[], id: string): Relation[] {
  return relations.filter((r) => r.from === id);
}

export function between(relations: Relation[], from: string, to: string): Relation[] {
  return relations.filter((r) => r.from === from && r.to === to);
}

export function has(relations: Relation[], kind: RelationKind, from: string, to: string): Relation | undefined {
  return relations.find((r) => r.kind === kind && r.from === from && r.to === to);
}

/**
 * Marks that hang together, by nearness and contact.
 *
 * The grouping the canvas offers before anyone has said what a group IS —
 * which is what makes a command mark able to act on "these", with no lasso.
 */
export function clusters(marks: Mark[], relations: Relation[]): string[][] {
  const linked = new Map<string, Set<string>>();
  for (const m of marks) linked.set(m.id, new Set());
  for (const r of relations) {
    if (r.kind !== 'near' && r.kind !== 'touching' && r.kind !== 'crossing' && r.kind !== 'contains') continue;
    linked.get(r.from)?.add(r.to);
    linked.get(r.to)?.add(r.from);
  }

  const seen = new Set<string>();
  const out: string[][] = [];
  for (const m of marks) {
    if (seen.has(m.id)) continue;
    const group: string[] = [];
    const stack = [m.id];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      group.push(id);
      for (const other of linked.get(id) ?? []) if (!seen.has(other)) stack.push(other);
    }
    out.push(group);
  }
  return out;
}

/** The relation graph as text a model can read. */
export function describeRelations(relations: Relation[], ids?: string[]): string {
  const scope = ids ? relations.filter((r) => ids.includes(r.from) && ids.includes(r.to)) : relations;
  if (scope.length === 0) return 'No relations between these marks.';
  // One line per pair, listing what holds between them.
  const byPair = new Map<string, Relation[]>();
  for (const r of scope) {
    const key = `${r.from}→${r.to}`;
    (byPair.get(key) ?? byPair.set(key, []).get(key)!).push(r);
  }
  const lines: string[] = [];
  for (const [pair, rels] of byPair) {
    const kinds = rels
      .sort((a, b) => b.strength - a.strength)
      .map((r) => `${r.kind} (${r.strength.toFixed(2)})`)
      .join(', ');
    lines.push(`  ${pair}: ${kinds}`);
  }
  return lines.join('\n');
}

// Lines between boxes, routed side to side (V1-PLAN §3, §9 D5's state half and D6).
//
// The state diagram's reader and the ER diagram's both stand boxes where
// layered.ts puts them and draw a line between each pair of boxes the text
// joins — the class diagram's reader does the same with its own copy of this
// (uml-class-mermaid.ts). Three rules, each a finding of D3 and D4:
//
//   - **Sides facing each other across the ranks.** A line leaves one box by
//     the side toward the box it joins and arrives by the side toward this
//     one — never back across its own box or along its side — and, of the
//     ways that do, the one no other box stands in the way of, then the one
//     that runs with the ranks, then the shortest.
//   - **Around what is in the way.** When no straight way is clear of every
//     other box the line bows around them: the flattest arc the shape rung
//     reads as an arc (mermaid-in.ts's sweeps), on the side that clears.
//   - **Ends sharing a side stand apart along it,** in the order of what each
//     reaches, so no two lines' ends or heads meet.
//
// Pure: boxes and the pairs to join in, sides, arcs and end points out.

import type { Bounds, Point } from '../types';
import type { MermaidFlow } from './mermaid-in';
import { ARC_SWEEPS, arcThrough } from './mermaid-in';

export type Side = 'top' | 'right' | 'bottom' | 'left';
export const SIDES: Side[] = ['top', 'right', 'bottom', 'left'];

/** A box where it stands: its rank in the layout and its outline. */
export interface Standing {
  id: string;
  rank: number;
  box: Bounds;
}

/** A pair to join. */
export interface RouteLink {
  index: number;
  a: string;
  b: string;
}

export interface Routed {
  index: number;
  /** The side each end leaves by: `a`'s, then `b`'s. */
  sides: [Side, Side];
  /** Set when no straight way is clear: the arc's sweep and which way it bows. */
  bow?: { sweep: number; side: 1 | -1 };
  /** Whether the way it takes still crosses a box. */
  crossing: boolean;
}

/** Where an end stands on its side: the point, its share along the side, the side and how many ends share it. */
export interface EndAt {
  point: Point;
  share: number;
  side: Side;
  count: number;
}

/** A side's two ends, going round clockwise as the port runs along it: top TL→TR, right TR→BR, bottom BR→BL, left BL→TL. */
export function sideEnds(b: Bounds, side: Side): [Point, Point] {
  const tl = { x: b.minX, y: b.minY }, tr = { x: b.maxX, y: b.minY }, br = { x: b.maxX, y: b.maxY }, bl = { x: b.minX, y: b.maxY };
  return side === 'top' ? [tl, tr] : side === 'right' ? [tr, br] : side === 'bottom' ? [br, bl] : [bl, tl];
}
export const outward: Record<Side, Point> = { top: { x: 0, y: -1 }, right: { x: 1, y: 0 }, bottom: { x: 0, y: 1 }, left: { x: -1, y: 0 } };
export const sideMiddle = (b: Bounds, side: Side): Point => {
  const [p, q] = sideEnds(b, side);
  return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
};

const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });

/** Whether one score comes before another: the first place they differ decides. */
function lexLess(a: readonly number[], b: readonly number[]): boolean {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
}

/** Whether a segment meets a box (Liang–Barsky). */
function meetsBox(p: Point, q: Point, b: Bounds): boolean {
  let t0 = 0, t1 = 1;
  const dx = q.x - p.x, dy = q.y - p.y;
  for (const [pp, qq] of [[-dx, p.x - b.minX], [dx, b.maxX - p.x], [-dy, p.y - b.minY], [dy, b.maxY - p.y]] as [number, number][]) {
    if (pp === 0) {
      if (qq < 0) return false;
      continue;
    }
    const r = qq / pp;
    if (pp < 0) t0 = Math.max(t0, r);
    else t1 = Math.min(t1, r);
    if (t0 > t1) return false;
  }
  return true;
}

/**
 * Each pair's sides, and its arc when no straight way is clear, and each
 * end's place along its side. `margin` grows every other box before a way
 * is tested against it; `scale` is world units per screen pixel.
 */
export function routeBoxes(standing: ReadonlyMap<string, Standing>, links: readonly RouteLink[], direction: MermaidFlow, margin: number, scale: number): { routes: Map<number, Routed>; ends: Map<string, EndAt> } {
  const across = direction === 'LR' || direction === 'RL';
  const ahead: Side = direction === 'LR' ? 'right' : direction === 'RL' ? 'left' : direction === 'BT' ? 'top' : 'bottom';
  const behind: Side = ahead === 'right' ? 'left' : ahead === 'left' ? 'right' : ahead === 'bottom' ? 'top' : 'bottom';
  const grown = (b: Bounds): Bounds => ({ minX: b.minX - margin, minY: b.minY - margin, maxX: b.maxX + margin, maxY: b.maxY + margin });
  const crossesOf = (pts: readonly Point[], others: readonly Standing[]) => others.filter((o) => pts.some((p, i) => i > 0 && meetsBox(pts[i - 1], p, grown(o.box)))).length;
  /** Leaving `a` along `d`, and arriving at `b` along `e`: each outward from its box, never back across it or along its side. */
  const leavesBoth = (sa: Side, d: Point, sb: Side, e: Point) =>
    d.x * outward[sa].x + d.y * outward[sa].y > 0.2 * Math.hypot(d.x, d.y) && e.x * outward[sb].x + e.y * outward[sb].y > 0.2 * Math.hypot(e.x, e.y);

  const routes = new Map<number, Routed>();
  for (const l of links) {
    const a = standing.get(l.a)!, b = standing.get(l.b)!;
    const others = [...standing.values()].filter((o) => o !== a && o !== b);
    const pref = (sa: Side, sb: Side): number => {
      if (a.rank === b.rank) {
        const aFirst = across ? a.box.minY < b.box.minY : a.box.minX < b.box.minX;
        const facing: [Side, Side] = across ? (aFirst ? ['bottom', 'top'] : ['top', 'bottom']) : aFirst ? ['right', 'left'] : ['left', 'right'];
        return sa === facing[0] && sb === facing[1] ? 0 : 2;
      }
      const [out, into] = b.rank > a.rank ? [ahead, behind] : [behind, ahead];
      if (sa === out && sb === into) return 0;
      if (sa === out || sb === into) return 1;
      return 2;
    };
    let best: { score: number[]; sides: [Side, Side] } | null = null;
    for (const sa of SIDES) {
      for (const sb of SIDES) {
        const P = sideMiddle(a.box, sa), Q = sideMiddle(b.box, sb);
        const v = sub(Q, P);
        const leaves = leavesBoth(sa, v, sb, { x: -v.x, y: -v.y });
        const score = [leaves ? 0 : 1, crossesOf([P, Q], others), pref(sa, sb), Math.hypot(v.x, v.y)];
        if (!best || lexLess(score, best.score)) best = { score, sides: [sa, sb] };
      }
    }
    // No straight way clear of every box: bow around them, the flattest arc the shape rung reads as one.
    let bow: { score: number[]; sides: [Side, Side]; sweep: number; side: 1 | -1 } | null = null;
    if (best!.score[0] || best!.score[1]) {
      for (const sa of SIDES) {
        for (const sb of SIDES) {
          const P = sideMiddle(a.box, sa), Q = sideMiddle(b.box, sb);
          const chord = Math.hypot(Q.x - P.x, Q.y - P.y) / scale;
          ARC_SWEEPS.forEach(([sweep, least], k) => {
            if (chord < least) return;
            for (const side of [1, -1] as const) {
              const pts = arcThrough(P, Q, sweep, side, 24);
              if (!leavesBoth(sa, sub(pts[1], P), sb, sub(pts[23], Q))) continue;
              const score = [crossesOf(pts, others), k, pref(sa, sb), chord];
              if (!bow || lexLess(score, bow.score)) bow = { score, sides: [sa, sb], sweep, side };
            }
          });
        }
      }
    }
    const b0 = bow as { score: number[]; sides: [Side, Side]; sweep: number; side: 1 | -1 } | null;
    if (b0 && (best!.score[0] || b0.score[0] < best!.score[1])) routes.set(l.index, { index: l.index, sides: b0.sides, bow: { sweep: b0.sweep, side: b0.side }, crossing: b0.score[0] > 0 });
    else routes.set(l.index, { index: l.index, sides: best!.sides, crossing: best!.score[1] > 0 });
  }

  // Ends sharing a side stand apart along it, in the order of what each reaches.
  const onSide = new Map<string, { index: number; which: 0 | 1; toward: Point }[]>();
  for (const l of links) {
    const [sa, sb] = routes.get(l.index)!.sides;
    const a = standing.get(l.a)!, b = standing.get(l.b)!;
    for (const [k, s, other, which] of [[a, sa, b, 0], [b, sb, a, 1]] as const) {
      const key = `${k.id}\u0000${s}`;
      const list = onSide.get(key) ?? [];
      list.push({ index: l.index, which, toward: sideMiddle(other.box, which === 0 ? sb : sa) });
      onSide.set(key, list);
    }
  }
  const ends = new Map<string, EndAt>();
  for (const [key, list] of onSide) {
    const [id, side] = key.split('\u0000') as [string, Side];
    const [p, q] = sideEnds(standing.get(id)!.box, side);
    const d = sub(q, p);
    const along = (x: Point) => ((x.x - p.x) * d.x + (x.y - p.y) * d.y) / (d.x * d.x + d.y * d.y);
    list.sort((m, n) => along(m.toward) - along(n.toward) || m.index - n.index);
    list.forEach((e, i) => {
      const share = (i + 1) / (list.length + 1);
      ends.set(`${e.index}:${e.which}`, { point: { x: p.x + d.x * share, y: p.y + d.y * share }, share, side, count: list.length });
    });
  }
  return { routes, ends };
}

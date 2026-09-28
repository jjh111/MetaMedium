// A small deterministic layered layout (V1-PLAN §3, §9 D3).
//
// A Mermaid text says what is joined to what and nothing about where anything
// stands. To draw it as ink, each node needs a place, and this is the
// smallest layout that gives one — ranks along the diagram's direction, an
// order within each rank, and a spacing — holding three rules before any
// beauty:
//
//   - **Deterministic.** The same nodes and links, in the same order, give
//     the same places on any machine: no randomness, nothing iterated in an
//     order the input did not give, no tie left to a sort.
//   - **The text's order is its reading order.** D2 writes a drawing's nodes
//     in its reading order — rows down the page, each row left to right, or
//     columns across for LR — and a hand writing Mermaid lists them roughly
//     so. So a node never stands in an earlier rank than the one written
//     before it, and within a rank the nodes stand in the order they were
//     written; drawn and read again, a text comes back in its own order,
//     which is what makes D3's round trip exact. Within that, a node's rank
//     is the longest path to it along the links that run forward in the text.
//   - **Cycles are broken by the text's order, and said.** A link to a node
//     written before its source runs back against the direction — up the
//     page, or across a rank — and one that closes a cycle is returned with
//     the cycle it closes. A link from a node to itself is left out, and said.
//
// Where a node stands within its rank comes from a few barycentre passes:
// each node is pulled toward the mean place of what it is linked to in the
// ranks before it (sweeping down) or after it (sweeping up), keeping the
// order and the spacing — the least squared move that keeps them apart,
// found by pooling adjacent violators (isotonic regression). The barycentre
// sets places, never the order: reordering a rank to uncross two links would
// change the text on its way back.
//
// The ranks then stand far enough apart that the links, measured centre to
// centre, run more along the direction than across it — the way D2 measures
// a drawing's direction when it writes it back — so a TD text is drawn to be
// read as TD. How far they were stretched is returned.
//
// Pure: nodes and links in, places out. Sizes and gaps are the caller's, in
// whatever units it draws in.

import type { Bounds, Point } from '../types';

export type LayeredDirection = 'TD' | 'LR' | 'RL' | 'BT';

export interface LayeredNode {
  id: string;
  /** Its extent across the page and down it, in the caller's units. */
  w: number;
  h: number;
}

export interface LayeredLink {
  from: string;
  to: string;
}

export interface LayeredOptions {
  /** TD: ranks down the page; LR: across it; RL and BT the other way. */
  direction: LayeredDirection;
  /** The space between one rank and the next, along the direction — before any stretch. */
  rankGap: number;
  /** The space between neighbours in a rank. */
  nodeGap: number;
  /** Barycentre passes, alternately down and up. LAYERED_PASSES when unset. */
  passes?: number;
  /**
   * How much more the links must run along the direction than across it,
   * summed centre to centre, before the rank gap stops stretching.
   * KEEP_DIRECTION when unset; 0 never stretches.
   */
  keepDirection?: number;
}

/** A link that runs against the text's order. */
export interface LayeredBack {
  /** Its index among the links given. */
  index: number;
  /** When it closes a cycle: the nodes around it, from its target through its source and back — else null. */
  cycle: string[] | null;
}

export interface LayeredLayout {
  /** Each node's centre, the drawing's top-left corner at (0, 0). */
  at: Map<string, Point>;
  /** Each node's rank, 0 first. */
  rank: Map<string, number>;
  /** Each rank's nodes, in order. */
  ranks: string[][];
  /** The links that run against the text's order, in the order given. */
  back: LayeredBack[];
  /** Links from a node to itself, by index: left out. */
  loops: number[];
  /** Links naming a node that is not among those given, by index: left out. */
  unknown: number[];
  /** How far the rank gap was stretched to keep the direction: 1 when it was not. */
  stretch: number;
  /** Whether the links run the direction's way once stretched — false when none crosses a rank. */
  kept: boolean;
  bounds: Bounds;
}

/** Barycentre passes: two down, two up — enough to settle a chart of a few dozen nodes, and cheap. */
export const LAYERED_PASSES = 4;
/** The links run at least this much more along the direction than across it (D2 decides by the larger). */
export const KEEP_DIRECTION = 1.2;

/**
 * Isotonic regression — the non-decreasing sequence nearest `y` in squares —
 * by pooling adjacent violators, left to right.
 */
function isotonic(y: readonly number[]): number[] {
  const blocks: { sum: number; n: number }[] = [];
  for (const v of y) {
    blocks.push({ sum: v, n: 1 });
    while (blocks.length > 1) {
      const b = blocks[blocks.length - 1], a = blocks[blocks.length - 2];
      if (a.sum / a.n <= b.sum / b.n) break;
      a.sum += b.sum;
      a.n += b.n;
      blocks.pop();
    }
  }
  const out: number[] = [];
  for (const b of blocks) for (let k = 0; k < b.n; k++) out.push(b.sum / b.n);
  return out;
}

/**
 * Places in a rank as near their targets as they can stand, in order and at
 * least `seps[k]` after the one before (`seps[0]` is unused): the least
 * squared move that keeps them apart.
 */
export function keepApart(targets: readonly number[], seps: readonly number[]): number[] {
  const offset: number[] = [];
  let s = 0;
  targets.forEach((_, k) => {
    if (k) s += seps[k];
    offset.push(s);
  });
  const z = isotonic(targets.map((t, k) => t - offset[k]));
  return z.map((v, k) => v + offset[k]);
}

/** A shortest path from `from` to `to` along forward links, the lowest index first at every step — or null. */
function forwardPath(from: number, to: number, forward: readonly number[][]): number[] | null {
  const prev = new Map<number, number>([[from, -1]]);
  const queue = [from];
  for (let q = 0; q < queue.length; q++) {
    const v = queue[q];
    if (v === to) break;
    for (const w of forward[v]) {
      if (prev.has(w) || w > to) continue;
      prev.set(w, v);
      queue.push(w);
    }
  }
  if (!prev.has(to)) return null;
  const path: number[] = [];
  for (let v = to; v !== -1; v = prev.get(v)!) path.unshift(v);
  return path;
}

const mean = (xs: readonly number[]) => xs.reduce((a, x) => a + x, 0) / xs.length;

/**
 * Where each node stands: ranks along the direction, the text's order within
 * each rank, places pulled toward what each node is linked to. Nodes are
 * taken in the order given — the text's — and a second node with an id
 * already given is ignored.
 */
export function layoutLayered(nodes: readonly LayeredNode[], links: readonly LayeredLink[], opts: LayeredOptions): LayeredLayout {
  const list: LayeredNode[] = [];
  const index = new Map<string, number>();
  for (const v of nodes) {
    if (index.has(v.id)) continue;
    index.set(v.id, list.length);
    list.push(v);
  }
  const n = list.length;
  const across = opts.direction === 'LR' || opts.direction === 'RL';
  const along = (v: LayeredNode) => (across ? v.w : v.h);
  const wide = (v: LayeredNode) => (across ? v.h : v.w);

  // The links: forward in the text, back against it, loops, and ones naming no node.
  const forward: number[][] = list.map(() => []);
  const before: number[][] = list.map(() => []);
  const neighbours: number[][] = list.map(() => []);
  const pairs: [number, number][] = [];
  const back: LayeredBack[] = [];
  const loops: number[] = [];
  const unknown: number[] = [];
  links.forEach((l, k) => {
    const a = index.get(l.from), b = index.get(l.to);
    if (a === undefined || b === undefined) return void unknown.push(k);
    if (a === b) return void loops.push(k);
    pairs.push([a, b]);
    neighbours[a].push(b);
    neighbours[b].push(a);
    if (a < b) {
      forward[a].push(b);
      before[b].push(a);
    } else back.push({ index: k, cycle: null });
  });
  for (const f of forward) f.sort((x, y) => x - y);

  // Ranks: the longest path along forward links, never above the node written before. When no
  // link would then cross a rank — each runs back within one — every link is made to cross one,
  // back links too, or no spacing could make the links run the direction's way.
  const behind: number[][] = list.map(() => []);
  for (const [a, b] of pairs) if (a > b) behind[a].push(b);
  const ranksOf = (strict: boolean) => {
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      let r = i ? out[i - 1] : 0;
      for (const p of before[i]) r = Math.max(r, out[p] + 1);
      if (strict) for (const p of behind[i]) r = Math.max(r, out[p] + 1);
      out.push(r);
    }
    return out;
  };
  let rank = ranksOf(false);
  if (pairs.length && pairs.every(([a, b]) => rank[a] === rank[b])) rank = ranksOf(true);
  const R = n ? rank[n - 1] + 1 : 0;
  const ranks: number[][] = Array.from({ length: R }, () => []);
  for (let i = 0; i < n; i++) ranks[rank[i]].push(i);

  // A link back closes a cycle when its target reaches its source going forward.
  for (const b of back) {
    const l = links[b.index];
    const path = forwardPath(index.get(l.to)!, index.get(l.from)!, forward);
    if (path) b.cycle = [...path, path[0]].map((i) => list[i].id);
  }

  // Across: each rank packed in order, then pulled toward its neighbours.
  const sep = (i: number, j: number) => (wide(list[i]) + wide(list[j])) / 2 + opts.nodeGap;
  const c = new Array<number>(n).fill(0);
  for (const row of ranks) {
    const targets = row.map(() => 0);
    const placed = keepApart(targets, row.map((i, k) => (k ? sep(row[k - 1], i) : 0)));
    row.forEach((i, k) => (c[i] = placed[k]));
  }
  const passes = opts.passes ?? LAYERED_PASSES;
  for (let p = 0; p < passes; p++) {
    const down = p % 2 === 0;
    for (let q = 0; q < R; q++) {
      const r = down ? q : R - 1 - q;
      const row = ranks[r];
      const targets = row.map((i) => {
        const near = neighbours[i].filter((j) => (down ? rank[j] < r : rank[j] > r));
        return near.length ? mean(near.map((j) => c[j])) : c[i];
      });
      const placed = keepApart(targets, row.map((i, k) => (k ? sep(row[k - 1], i) : 0)));
      row.forEach((i, k) => (c[i] = placed[k]));
    }
  }

  // Along: each rank as thick as its thickest node, the gap between, stretched to keep the direction.
  const thick = ranks.map((row) => Math.max(0, ...row.map((i) => along(list[i]))));
  const base: number[] = [];
  thick.forEach((t, r) => base.push(r ? base[r - 1] + (thick[r - 1] + t) / 2 : t / 2));
  let sideways = 0, fixed = 0, spans = 0;
  for (const [a, b] of pairs) {
    sideways += Math.abs(c[b] - c[a]);
    fixed += Math.abs(base[rank[b]] - base[rank[a]]);
    spans += Math.abs(rank[b] - rank[a]);
  }
  const keep = opts.keepDirection ?? KEEP_DIRECTION;
  const unstretched = fixed + opts.rankGap * spans;
  let stretch = 1;
  let kept = !pairs.length || unstretched > sideways;
  if (keep > 0 && pairs.length && unstretched < keep * sideways) {
    if (spans > 0 && opts.rankGap > 0) {
      stretch = (keep * sideways - fixed) / (opts.rankGap * spans);
      kept = true;
    } else kept = unstretched > sideways;
  }
  const m = base.map((b, r) => b + opts.rankGap * stretch * r);

  // Places, the direction applied, the top-left corner at (0, 0).
  const raw = list.map((_, i) => {
    const a = m[rank[i]], x = c[i];
    switch (opts.direction) {
      case 'LR': return { x: a, y: x };
      case 'RL': return { x: -a, y: x };
      case 'BT': return { x, y: -a };
      default: return { x, y: a };
    }
  });
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  list.forEach((v, i) => {
    minX = Math.min(minX, raw[i].x - v.w / 2);
    maxX = Math.max(maxX, raw[i].x + v.w / 2);
    minY = Math.min(minY, raw[i].y - v.h / 2);
    maxY = Math.max(maxY, raw[i].y + v.h / 2);
  });
  if (!n) minX = minY = maxX = maxY = 0;
  const at = new Map<string, Point>();
  list.forEach((v, i) => at.set(v.id, { x: raw[i].x - minX, y: raw[i].y - minY }));

  return {
    at,
    rank: new Map(list.map((v, i) => [v.id, rank[i]])),
    ranks: ranks.map((row) => row.map((i) => list[i].id)),
    back,
    loops,
    unknown,
    stretch,
    kept,
    bounds: { minX: 0, minY: 0, maxX: maxX - minX, maxY: maxY - minY },
  };
}

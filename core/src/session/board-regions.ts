// Regions: named places on a board (PLAN-IPAD-NOTES I5).
//
// A region is a named rectangle that holds whatever stands inside it — ink, pictures, text, figures,
// other regions — so *Monday* and *Pricing* are places on a board, and a region moved takes what it
// holds with it. (Not `regions.ts`, which is the artifact's layout: the drawn boxes a page is read
// from. A region here is the hand's own, on the board.)
//
// WHAT IT HOLDS IS DERIVED, never copied into the log: the things on the content plane whose box is
// mostly inside the region's box — `REGION_HOLDS`, the one rule — read where they stand now. So a mark
// drawn into a region is held at once, a mark dragged out is let go, and nothing is written for either.
// The region itself is a node with a `region` rep and a `bounds` rep: not ink, not content, not an
// artifact, so it never joins a cluster, a signature or a lasso, and it moves, scales and is tidied
// as a mark is (a `transform` rep; `manipulate.ts`).
//
// MOVING IT is one `move` (or `scale`) event naming the region; the session carries what it holds when it
// applies the event (`regionCarries`, the same function a surface's drag preview asks), so one act is
// one undo and the connectors bound to what moved follow by `follow.ts`. A connector the region holds by
// where it stands but that is tied to something the region does not carry is not carried: it follows
// what it is tied to, its other end where it was, rather than walking off its site.

import type { Bounds } from '../types';
import { type MMNode, type RegionRep, boundsOf, getRep, regionRepOf } from './nodes';
import { activeBindingsOf } from './magnets';
import { pictureOf } from '../kinds/picture';
import { rowOf, type Kind } from '../kinds/kinds';

export { regionRepOf };
export type { RegionRep };

/**
 * How much of a thing's box must stand inside a region's for the region to hold it: a share of its
 * area, each axis taken alone — so a line, with no height, is held by where it lies along its length.
 * A thing only touching, or hanging half out, is not held; one drawn into the region mostly is.
 */
export const REGION_HOLDS = 0.6;

/** What a region is asked of: the board as `SessionState` gives it. */
export interface RegionBoard {
  nodes: ReadonlyMap<string, MMNode>;
  contentIds: readonly string[];
  regions: readonly string[];
}

const EPS = 1e-6;
const live = (n: MMNode | undefined): n is MMNode => !!n && !getRep(n, 'erased');

/** The share of `a` along one axis that lies inside `w`; a point-thin extent is in or out. */
function along(a0: number, a1: number, w0: number, w1: number): number {
  const len = a1 - a0;
  if (len <= EPS) return a0 >= w0 - EPS && a0 <= w1 + EPS ? 1 : 0;
  return Math.max(0, Math.min(a1, w1) - Math.max(a0, w0)) / len;
}

/** The share of `box`'s area inside `within`, each axis taken alone. */
export function shareInside(box: Bounds, within: Bounds): number {
  return along(box.minX, box.maxX, within.minX, within.maxX) * along(box.minY, box.maxY, within.minY, within.maxY);
}

/**
 * Where a thing stands: an artifact with marks in it stands where its marks do — its own box is where
 * it was blessed, and stays there when it is moved — and anything else where `boundsOf` says.
 */
export function standingBoxOf(nodes: ReadonlyMap<string, MMNode>, node: MMNode): Bounds | undefined {
  let box: Bounds | undefined;
  let held = false;
  for (const e of node.edges) {
    if (e.rel !== 'has-part') continue;
    const m = nodes.get(e.to);
    if (!live(m)) continue;
    const b = standingBoxOf(nodes, m);
    if (!b) continue;
    held = true;
    box = box ? { minX: Math.min(box.minX, b.minX), minY: Math.min(box.minY, b.minY), maxX: Math.max(box.maxX, b.maxX), maxY: Math.max(box.maxY, b.maxY) } : { ...b };
  }
  return held ? box : boundsOf(node);
}

const areaOf = (b: Bounds) => (b.maxX - b.minX) * (b.maxY - b.minY);

/** The live regions, in the order they were made, each with the box it stands in. */
export function regionsOfBoard(board: RegionBoard): { id: string; name: string; bounds: Bounds; from?: string }[] {
  const out: { id: string; name: string; bounds: Bounds; from?: string }[] = [];
  for (const id of board.regions) {
    const n = board.nodes.get(id);
    const rep = n && live(n) ? regionRepOf(n) : null;
    const bounds = n && boundsOf(n);
    if (!n || !rep || !bounds) continue;
    out.push({ id, name: rep.name, bounds, ...(rep.from ? { from: rep.from } : {}) });
  }
  return out;
}

/** The drawn rectangles regions were taken from: ink that is each region's own frame, never what it holds. */
function ownInkOf(board: RegionBoard): Set<string> {
  const out = new Set<string>();
  for (const r of regionsOfBoard(board)) if (r.from) out.add(r.from);
  return out;
}

/**
 * What stands inside a region right now, one level: the things on the content plane — and the smaller
 * regions — that `REGION_HOLDS` says it holds, never the rectangle it was drawn as. Empty for an id that
 * is no live region.
 */
export function regionMembers(board: RegionBoard, id: string): string[] {
  const regions = regionsOfBoard(board);
  const me = regions.find((r) => r.id === id);
  if (!me) return [];
  const inks = ownInkOf(board);
  const out: string[] = [];
  for (const cid of board.contentIds) {
    if (inks.has(cid)) continue;
    const n = board.nodes.get(cid);
    if (!live(n)) continue;
    const b = standingBoxOf(board.nodes, n);
    if (b && shareInside(b, me.bounds) >= REGION_HOLDS) out.push(cid);
  }
  // A region held by a larger one only: two of a size never hold each other.
  const mine = areaOf(me.bounds);
  for (const r of regions) {
    if (r.id === id || areaOf(r.bounds) >= mine - EPS) continue;
    if (shareInside(r.bounds, me.bounds) >= REGION_HOLDS) out.push(r.id);
  }
  return out;
}

/** Every thing a region holds, however deep: its members, and what each region among them holds. */
function gather(board: RegionBoard, id: string): Set<string> {
  const out = new Set<string>();
  const regions = new Set(board.regions);
  const visit = (rid: string) => {
    for (const m of regionMembers(board, rid)) {
      if (out.has(m)) continue;
      out.add(m);
      if (regions.has(m)) visit(m);
    }
  };
  visit(id);
  out.delete(id);
  return out;
}

/**
 * The marks a manipulation of these ids carries: each id itself, and for a region everything it holds,
 * with the rectangle it was drawn as and what its nested regions hold — less the connectors it holds
 * only by where they stand, tied to something it does not carry (they follow it instead). An id that
 * is no region passes through; the list is in no promised order and has each id once.
 */
export function regionCarries(board: RegionBoard, ids: readonly string[]): string[] {
  const regions = new Set(board.regions);
  const named = new Set(ids);
  const carried = new Set<string>();
  const added = new Set<string>();
  const inks = new Map<string, string | undefined>();
  for (const r of regionsOfBoard(board)) inks.set(r.id, r.from);
  const take = (id: string, geometric: boolean) => {
    if (carried.has(id)) return;
    carried.add(id);
    if (geometric && !named.has(id)) added.add(id);
  };
  for (const id of ids) {
    take(id, false);
    if (!inks.has(id)) continue;
    const from = inks.get(id);
    if (from) take(from, false);
    for (const m of gather(board, id)) {
      take(m, true);
      const nf = inks.get(m);
      if (nf) take(nf, false);
    }
  }
  // A connector held by position, tied to a mark the region does not carry, follows it and is not carried.
  if (added.size) {
    for (let again = true; again;) {
      again = false;
      for (const id of added) {
        if (!carried.has(id) || regions.has(id)) continue;
        const n = board.nodes.get(id);
        if (!n) continue;
        if (activeBindingsOf(n, board.nodes).some((b) => !carried.has(b.nodeId))) {
          carried.delete(id);
          again = true;
        }
      }
    }
  }
  return [...carried];
}

/** What a region holds, in the person's words: counts by what a thing is. */
export interface RegionDescription {
  id: string;
  name: string;
  bounds: Bounds;
  /** Every thing it holds, however deep, in the content plane's order, regions last. */
  things: string[];
  holds: { marks: number; pictures: number; texts: number; figures: number; things: number; regions: number };
}

/** What a thing on the content plane is to a person: ink, a picture, some text, a figure, or something else made. */
export function thingKindOf(node: MMNode): 'marks' | 'pictures' | 'texts' | 'figures' | 'things' {
  if (pictureOf(node)) return 'pictures';
  let code: { data: Record<string, unknown> } | null = null;
  for (let i = node.reps.length - 1; i >= 0; i--) {
    if (node.reps[i].modality === 'code') { code = node.reps[i] as unknown as { data: Record<string, unknown> }; break; }
  }
  // No code: ink and a gathered word are marks; a named thing with marks in it is a thing.
  if (!code) return node.edges.some((e) => e.rel === 'has-part') && !getRep(node, 'stroke') ? 'things' : 'marks';
  let renderer: string | undefined;
  try { renderer = rowOf((code.data.kind as Kind) ?? 'html')?.renderer; } catch { renderer = undefined; }
  if (renderer === 'text' || renderer === 'prose') return 'texts';
  if (renderer === 'vector' || renderer === 'run' || renderer === 'mermaid') return 'figures';
  return 'things';
}

export function describeRegion(board: RegionBoard, id: string): RegionDescription | null {
  const me = regionsOfBoard(board).find((r) => r.id === id);
  if (!me) return null;
  const held = gather(board, id);
  const regions = new Set(board.regions);
  const inks = ownInkOf(board);
  const holds = { marks: 0, pictures: 0, texts: 0, figures: 0, things: 0, regions: 0 };
  const things: string[] = [];
  for (const cid of board.contentIds) {
    if (!held.has(cid) || inks.has(cid)) continue;
    const n = board.nodes.get(cid);
    if (!live(n)) continue;
    holds[thingKindOf(n)]++;
    things.push(cid);
  }
  for (const h of held) if (regions.has(h)) { holds.regions++; things.push(h); }
  return { id, name: me.name, bounds: me.bounds, things, holds };
}

const NOUNS: [keyof RegionDescription['holds'], string, string][] = [
  ['marks', 'mark', 'marks'], ['pictures', 'picture', 'pictures'], ['texts', 'text', 'texts'],
  ['figures', 'figure', 'figures'], ['things', 'thing', 'things'], ['regions', 'region', 'regions'],
];

/** What a region holds, as a phrase: *2 marks, 1 picture* — or *nothing yet*. */
export function holdsSaid(holds: RegionDescription['holds']): string {
  const parts = NOUNS.filter(([k]) => holds[k] > 0).map(([k, one, many]) => holds[k] + ' ' + (holds[k] === 1 ? one : many));
  return parts.length ? parts.join(', ') : 'nothing yet';
}

/** The panel's sentence, and the hand's look: *a region “Monday” — holds 12 marks, 2 pictures*. */
export function regionSaid(d: RegionDescription): string {
  return 'a region “' + d.name + '” — holds ' + holdsSaid(d.holds);
}

/** One line of a board's outline: a region, how deep it nests, and what it holds. */
export interface OutlineEntry {
  id: string;
  name: string;
  bounds: Bounds;
  depth: number;
  /** The smallest region that holds this one, or null at the top. */
  parent: string | null;
  holds: RegionDescription['holds'];
}

/**
 * The board's outline (PLAN-IPAD-NOTES I5): its regions as a tree, a region under the smallest one that
 * holds it, siblings in reading order — top to bottom, then left to right — with what each holds. Derived
 * from where the regions stand; the panel lists it and a tap on a line takes the view to that place.
 */
export function regionOutline(board: RegionBoard): OutlineEntry[] {
  const all = regionsOfBoard(board);
  const parentOf = new Map<string, string | null>();
  for (const r of all) {
    let best: { id: string; area: number } | null = null;
    const mine = areaOf(r.bounds);
    for (const o of all) {
      if (o.id === r.id) continue;
      const area = areaOf(o.bounds);
      if (area <= mine + EPS || shareInside(r.bounds, o.bounds) < REGION_HOLDS) continue;
      if (!best || area < best.area) best = { id: o.id, area };
    }
    parentOf.set(r.id, best ? best.id : null);
  }
  // Reading order: rows from the top — a region starts a new row only when it stands off the row's top
  // by half its own height — and each row from the left, so neighbours a hand drew a little off level read as one row.
  const reading = <T extends { bounds: Bounds }>(list: T[]): T[] => {
    const byTop = list.slice().sort((a, b) => a.bounds.minY - b.bounds.minY || a.bounds.minX - b.bounds.minX);
    const rows: T[][] = [];
    for (const r of byTop) {
      const row = rows[rows.length - 1];
      if (row && r.bounds.minY - row[0].bounds.minY < 0.5 * (r.bounds.maxY - r.bounds.minY)) row.push(r);
      else rows.push([r]);
    }
    return rows.flatMap((row) => row.sort((a, b) => a.bounds.minX - b.bounds.minX));
  };
  const out: OutlineEntry[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const r of reading(all.filter((x) => parentOf.get(x.id) === parent))) {
      out.push({ id: r.id, name: r.name, bounds: r.bounds, depth, parent, holds: describeRegion(board, r.id)!.holds });
      walk(r.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

// Routing: connectors drawn orthogonally between their ports (V1-PLAN §3, §9 D7).
//
// A diagram's connectors are drawn by a hand, and a hand draws a diagonal. A
// notation's are drawn at right angles, leaving each symbol along the way its
// port faces, in a few segments, round whatever stands between. This module is
// that: the route, as a pure function of the board.
//
// ===== What a routed connector is: a mark, and a derived form =====
//
// The choice the plan left open — a new event, or a variant of the `'clean'`
// rep — is a `route` event that writes a **`'route'` rep** on a connector, and
// the rep is DERIVED, never carried. Two things are true of it at once:
//
//   - that a connector is routed is the hand's act, so it is in the log: one
//     `route` event names the connectors (`unroute` is the same event with
//     `mode: 'raw'`, as `snap` has its `raw`), and it replays, undoes, merges
//     and travels in a room as any act does;
//   - WHERE the route runs is not. It is derived from the sites the connector's
//     ends are bound to, wherever they stand now, and from the boxes standing in
//     its way, so it is a pure function of the board: a box moved, a mark drawn
//     in the way or taken away derives it again, in the apply path, at the
//     triggers the follow already has (`followFrom`), and undo of the move
//     takes it back by itself. **Coordinates are never in the log**, and none is
//     carried from one place to the next: the follow of a connector is a
//     similarity of the WHOLE connector (follow.ts), and a route is not a
//     similarity of anything — the sites moved apart and the route round a box
//     has other corners — so it is found again from the ports, never stretched.
//
// Why not a clean-rep variant. `'clean'` is one mark's own form, in its own
// space, moved and reshaped by the hand, and everything that reads where a mark
// stands reads it (`boundsOf`, `standingPointsOf`, the sites, the handles). A
// route stands over TWO other marks, and reading it as where the connector
// stands would change how the drawing reads — its reach, its wires, its heads,
// its flowchart — which a route must not. So **what reads a connector still
// reads its ink** (the follow carries the ink onto the sites, as before), and
// the route is a form drawn in front of it: the hand's ink faint beneath, never
// replaced. It is the same promise a snapped form makes, kept the same way.
//
// While an end is tied to nothing there is nothing to route between: the rep
// stays (the log says routed) with no points, the surface draws the ink, and
// the route stands again when the end is tied.
//
// ===== The route =====
//
// Each end leaves along its port's outward normal (`outwardOf`): a box's edge
// middle straight out of its side; a corner along one of the two sides it
// belongs to — the one that faces the other end; a decision's vertex outward; a
// site in the middle of a mark, which has no outward, toward the other end. A
// short stub goes out first, so the route never runs along the symbol's own
// edge, and then a search over the lines the marks in the way leave open —
// deterministic and bounded — finds the way with the fewest turns, then the
// shortest, never more than `ROUTE_MAX_TURNS`. The marks in the way are the
// closed marks in a window round the two ports; the two symbols' own boxes are
// in the way too. When no route round them has few enough turns the route goes
// through, and SAYS so: `avoided: false`, the marks in `blocked`, *could not
// avoid …* in its reasoning. It never fails to draw one.

import type { Bounds, Point } from '../types';
import type { MMNode } from '../session/nodes';
import { boundsOf, getRep, standsClosed } from '../session/nodes';
import { activeBindingsOf, bindingsOf, boundSiteOf } from '../session/magnets';
import { cleanOf } from '../session/clean';
import { connectorEnds } from '../session/follow';

/** A route turns at most this often: out, across, in — with a step to spare for a mark in the way. */
export const ROUTE_MAX_TURNS = 4;
/** How far a route stands off a symbol before it may turn, in the hand's pixels. */
export const STUB_PX = 18;
/** …or this share of the smaller symbol's smaller side, when that is more — a big symbol is left further. */
export const STUB_SHARE = 0.15;
/** A mark smaller than this, in the hand's pixels, on either side, is a letter or a dot and no mark to go round. */
export const MIN_OBSTACLE_PX = 24;
/** The window read round the two ports for what is in the way: this share of the span between them, never under four stubs. */
export const WINDOW_SHARE = 0.5;
/** No more than this many marks are gone round; the nearest are kept. */
export const MAX_BLOCKS = 24;
/** A head's wings lie this far off the line, in radians — an arrow drawn by hand. */
export const HEAD_SPREAD = 0.5;

const EPS = 1e-6;

export type Dir = 'right' | 'down' | 'left' | 'up';
const DIRS: readonly Dir[] = ['right', 'down', 'left', 'up'];
const VEC: readonly Point[] = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }];
const idx = (d: Dir) => DIRS.indexOf(d);
const opposite = (d: number) => (d + 2) % 4;

/** Inside its box a site is "in the middle of the mark" — no outward — under this share of the way to the edge. */
const INTERIOR = 0.25;
/** At a corner: both offsets this share of the way to the edge or more. */
const CORNER = 0.98;

/**
 * The way a connector leaves a port: out of the side it sits on. `box` is the
 * mark the port belongs to, `toward` where the other end is. A corner belongs
 * to two sides and leaves along the one that faces the other end; a site in
 * the middle of its mark, with no side, leaves toward it.
 */
export function outwardOf(point: Point, box: Bounds, toward: Point): Dir {
  const cx = (box.minX + box.maxX) / 2, cy = (box.minY + box.maxY) / 2;
  const hw = (box.maxX - box.minX) / 2, hh = (box.maxY - box.minY) / 2;
  const ox = hw > EPS ? (point.x - cx) / hw : 0, oy = hh > EPS ? (point.y - cy) / hh : 0;
  const ax = Math.abs(ox), ay = Math.abs(oy);
  const dx = toward.x - point.x, dy = toward.y - point.y;
  const facing = (among: readonly Dir[]): Dir => {
    let best = among[0], score = -Infinity;
    for (const d of among) {
      const v = VEC[idx(d)], s = v.x * dx + v.y * dy;
      if (s > score) { best = d; score = s; }
    }
    return best;
  };
  if (Math.max(ax, ay) < INTERIOR) return facing(DIRS);
  if (ax >= CORNER && ay >= CORNER) return facing([ox > 0 ? 'right' : 'left', oy > 0 ? 'down' : 'up']);
  return ax > ay ? (ox > 0 ? 'right' : 'left') : oy > 0 ? 'down' : 'up';
}

// ===== The geometry alone =====

/** One end of a route: where it stands, the way it leaves, and the box of the mark it leaves. */
export interface RouteEnd {
  point: Point;
  dir: Dir;
  /** The mark's own box: gone round, never through, and where the way out begins. */
  box?: Bounds;
}

/** A mark in the way. */
export interface RouteBlock {
  id: string;
  box: Bounds;
}

/** A route: the polyline from the first end to the second, and what is to be said of it. */
export interface RoutePath {
  /** From `a.point` to `b.point`, every segment along an axis, no three points in a line. */
  points: Point[];
  /** How many times it turns. */
  turns: number;
  /** No mark in the way stands across it. */
  avoided: boolean;
  /** The marks it stands across when it could not go round them. */
  blocked: string[];
  reasoning: string;
}

const grow = (r: Bounds, by: number): Bounds => ({ minX: r.minX - by, minY: r.minY - by, maxX: r.maxX + by, maxY: r.maxY + by });
const insideOpen = (p: Point, r: Bounds) => p.x > r.minX + EPS && p.x < r.maxX - EPS && p.y > r.minY + EPS && p.y < r.maxY - EPS;

/** Whether an axis-aligned segment passes through the open inside of a box. */
function crosses(a: Point, b: Point, r: Bounds): boolean {
  if (Math.abs(a.y - b.y) < EPS) return a.y > r.minY + EPS && a.y < r.maxY - EPS && Math.max(a.x, b.x) > r.minX + EPS && Math.min(a.x, b.x) < r.maxX - EPS;
  return a.x > r.minX + EPS && a.x < r.maxX - EPS && Math.max(a.y, b.y) > r.minY + EPS && Math.min(a.y, b.y) < r.maxY - EPS;
}

/** How far along `dir` a point in a box is from leaving it: nothing when it stands on the edge or outside. */
function exitLength(p: Point, box: Bounds | undefined, dir: number): number {
  if (!box) return 0;
  const v = VEC[dir];
  const d = v.x > 0 ? box.maxX - p.x : v.x < 0 ? p.x - box.minX : v.y > 0 ? box.maxY - p.y : p.y - box.minY;
  return d > EPS ? d : 0;
}

/** Points with the ones in a line and the ones repeated taken out. */
function simplify(pts: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < EPS && Math.abs(last.y - p.y) < EPS) continue;
    out.push(p);
    while (out.length >= 3) {
      const a = out[out.length - 3], b = out[out.length - 2], c = out[out.length - 1];
      const sameX = Math.abs(a.x - b.x) < EPS && Math.abs(b.x - c.x) < EPS, sameY = Math.abs(a.y - b.y) < EPS && Math.abs(b.y - c.y) < EPS;
      if (!sameX && !sameY) break;
      out.splice(out.length - 2, 1);
    }
  }
  return out;
}

/** A binary heap of (cost, order): the order of pushing breaks a tie, so the search is the same every time. */
class Heap {
  private cost: number[] = [];
  private seq: number[] = [];
  private item: number[] = [];
  private n = 0;
  private counter = 0;
  get size() { return this.n; }
  private less(i: number, j: number) { return this.cost[i] < this.cost[j] || (this.cost[i] === this.cost[j] && this.seq[i] < this.seq[j]); }
  private swap(i: number, j: number) {
    [this.cost[i], this.cost[j]] = [this.cost[j], this.cost[i]];
    [this.seq[i], this.seq[j]] = [this.seq[j], this.seq[i]];
    [this.item[i], this.item[j]] = [this.item[j], this.item[i]];
  }
  push(cost: number, item: number) {
    let i = this.n++;
    this.cost[i] = cost; this.seq[i] = this.counter++; this.item[i] = item;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(i, p)) break;
      this.swap(i, p); i = p;
    }
  }
  pop(): { cost: number; item: number } {
    const out = { cost: this.cost[0], item: this.item[0] };
    this.n--;
    if (this.n > 0) {
      this.cost[0] = this.cost[this.n]; this.seq[0] = this.seq[this.n]; this.item[0] = this.item[this.n];
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < this.n && this.less(l, m)) m = l;
        if (r < this.n && this.less(r, m)) m = r;
        if (m === i) break;
        this.swap(i, m); i = m;
      }
    }
    return out;
  }
}

/**
 * One search: the polyline from `a` to `b` with the fewest turns, then the
 * shortest, that leaves each end along its way by a stub of `stub` and goes
 * through none of `blockers` — or null, when there is none, or it turns more
 * than `ROUTE_MAX_TURNS`. The lines it may run along are the two stubs' ends and
 * a margin of a stub off every blocker; the search is over the crossings.
 */
function search(a: RouteEnd, b: RouteEnd, blockers: readonly Bounds[], stub: number): Point[] | null {
  const da = idx(a.dir), db = idx(b.dir);
  const la = exitLength(a.point, a.box, da) + stub, lb = exitLength(b.point, b.box, db) + stub;
  const p1: Point = { x: a.point.x + VEC[da].x * la, y: a.point.y + VEC[da].y * la };
  const p2: Point = { x: b.point.x + VEC[db].x * lb, y: b.point.y + VEC[db].y * lb };
  const grown = blockers.map((r) => grow(r, stub / 2));
  if (grown.some((g) => insideOpen(p1, g) || insideOpen(p2, g))) return null;

  const xs = new Set<number>([p1.x, p2.x, (p1.x + p2.x) / 2]);
  const ys = new Set<number>([p1.y, p2.y, (p1.y + p2.y) / 2]);
  for (const r of blockers) { xs.add(r.minX - stub); xs.add(r.maxX + stub); ys.add(r.minY - stub); ys.add(r.maxY + stub); }
  const X = [...xs].sort((p, q) => p - q), Y = [...ys].sort((p, q) => p - q);
  const nx = X.length, ny = Y.length;
  const ix1 = X.indexOf(p1.x), iy1 = Y.indexOf(p1.y), ix2 = X.indexOf(p2.x), iy2 = Y.indexOf(p2.y);
  if (ix1 < 0 || iy1 < 0 || ix2 < 0 || iy2 < 0) return null;

  const turn = 4 * stub + 0.2 * (Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y));
  const state = (i: number, j: number, d: number) => (i * ny + j) * 4 + d;
  const total = nx * ny * 4;
  const dist = new Float64Array(total).fill(Infinity);
  const prev = new Int32Array(total).fill(-1);
  const done = new Uint8Array(total);
  const heap = new Heap();
  const start = state(ix1, iy1, da), goal = state(ix2, iy2, opposite(db));
  dist[start] = 0;
  heap.push(0, start);
  while (heap.size) {
    const { cost, item } = heap.pop();
    if (done[item]) continue;
    done[item] = 1;
    if (item === goal) break;
    const d = item % 4, cell = (item - d) / 4, j = cell % ny, i = (cell - j) / ny;
    const relax = (to: number, c: number) => {
      if (c < dist[to] - 1e-9) { dist[to] = c; prev[to] = item; heap.push(c, to); }
    };
    for (const nd of [(d + 1) % 4, (d + 3) % 4]) relax(state(i, j, nd), cost + turn);
    const ni = i + VEC[d].x, nj = j + VEC[d].y;
    if (ni < 0 || nj < 0 || ni >= nx || nj >= ny) continue;
    const from = { x: X[i], y: Y[j] }, to = { x: X[ni], y: Y[nj] };
    if (grown.some((g) => crosses(from, to, g))) continue;
    relax(state(ni, nj, d), cost + Math.abs(to.x - from.x) + Math.abs(to.y - from.y));
  }
  if (!done[goal]) return null;

  const nodes: Point[] = [];
  for (let s = goal; s >= 0; s = prev[s]) {
    const d = s % 4, cell = (s - d) / 4, j = cell % ny, i = (cell - j) / ny;
    nodes.push({ x: X[i], y: Y[j] });
  }
  nodes.reverse();
  const line = simplify([a.point, ...nodes, b.point]);
  if (line.length - 2 > ROUTE_MAX_TURNS) return null;
  // The two stubs stand through nothing but the mark each leaves — its own way out.
  for (const r of blockers) {
    const g = grow(r, stub / 2);
    if (r !== a.box && crosses(a.point, p1, g)) return null;
    if (r !== b.box && crosses(p2, b.point, g)) return null;
  }
  return line;
}

/** The way straight across: out, one or two elbows, in — no search, no regard for what stands between. */
function direct(a: RouteEnd, b: RouteEnd, stub: number): Point[] {
  const da = idx(a.dir), db = idx(b.dir);
  const la = exitLength(a.point, a.box, da) + stub, lb = exitLength(b.point, b.box, db) + stub;
  const p1: Point = { x: a.point.x + VEC[da].x * la, y: a.point.y + VEC[da].y * la };
  const p2: Point = { x: b.point.x + VEC[db].x * lb, y: b.point.y + VEC[db].y * lb };
  const horizontal = (d: number) => d === 0 || d === 2;
  const mid: Point[] =
    horizontal(da) && horizontal(db) ? [{ x: (p1.x + p2.x) / 2, y: p1.y }, { x: (p1.x + p2.x) / 2, y: p2.y }]
    : !horizontal(da) && !horizontal(db) ? [{ x: p1.x, y: (p1.y + p2.y) / 2 }, { x: p2.x, y: (p1.y + p2.y) / 2 }]
    : horizontal(da) ? [{ x: p2.x, y: p1.y }] : [{ x: p1.x, y: p2.y }];
  return simplify([a.point, p1, ...mid, p2, b.point]);
}

const sayTurns = (n: number) => (n === 0 ? 'straight across' : n === 1 ? 'one turn' : `${n} turns`);
const sayList = (ids: readonly string[]) => (ids.length <= 3 ? ids.join(', ') : `${ids.slice(0, 3).join(', ')} and ${ids.length - 3} more`);

/**
 * A route between two ends, round the marks in the way. A pure function of
 * its arguments: the same ends and boxes give the same route, always. `scale`
 * is world units per screen pixel, so the stub is the hand's, not the world's.
 */
export function routeBetween(a: RouteEnd, b: RouteEnd, blocks: readonly RouteBlock[], scale = 1): RoutePath {
  const size = (e: RouteEnd) => (e.box ? Math.min(e.box.maxX - e.box.minX, e.box.maxY - e.box.minY) : 0);
  const sides = [size(a), size(b)].filter((v) => v > 0);
  const base = Math.max(STUB_PX * scale, sides.length ? STUB_SHARE * Math.min(...sides) : 0);
  const own = [a.box, b.box].filter((r): r is Bounds => !!r);
  const ranked = blocks
    .slice()
    .sort((p, q) => dist2(centreOf(p.box), a.point) + dist2(centreOf(p.box), b.point) - (dist2(centreOf(q.box), a.point) + dist2(centreOf(q.box), b.point)) || (p.id < q.id ? -1 : 1))
    .slice(0, MAX_BLOCKS);
  const levels = [1, 0.5, 0.25].map((f) => Math.max(base * f, 3 * scale));
  const say = (points: Point[], blocked: string[]): RoutePath => {
    const turns = points.length - 2;
    const way = `out of the ${a.dir}, in at the ${b.dir} — ${sayTurns(turns)}`;
    return {
      points, turns, avoided: blocked.length === 0, blocked,
      reasoning: blocked.length === 0 ? `${way}, clear of the other marks` : `${way}; could not avoid ${sayList(blocked)}`,
    };
  };
  // Round everything in the way, a stub off it — the first level that finds a way.
  for (const stub of levels) {
    const found = search(a, b, [...own, ...ranked.map((r) => r.box)], stub);
    if (found) return say(found, []);
  }
  // Round the two symbols alone, and say what it goes through.
  const through = (points: Point[]) => ranked.filter((r) => points.some((p, i) => i > 0 && crosses(points[i - 1], p, r.box))).map((r) => r.id);
  for (const stub of levels) {
    const found = search(a, b, own, stub);
    if (found) return say(found, through(found));
  }
  const points = direct(a, b, levels[levels.length - 1]);
  return say(points, through(points));
}

const centreOf = (r: Bounds): Point => ({ x: (r.minX + r.maxX) / 2, y: (r.minY + r.maxY) / 2 });
const dist2 = (p: Point, q: Point) => (p.x - q.x) ** 2 + (p.y - q.y) ** 2;

// ===== On a board =====

/** The `'route'` rep a routed connector holds: derived, never logged, replaced and never changed in place. */
export interface RouteRep {
  /** The polyline on the board, from the connector's tail to its tip (an arrow), else from its start to its end; none while an end is tied to nothing. */
  points: Point[];
  /** Which end of the stroke `points[0]` is. */
  from: 'start' | 'end';
  /** The arrow's head kept at the tip, along the last segment: the tip and the two wings' ends. */
  head?: { tip: Point; wings: [Point, Point] };
  turns: number;
  avoided: boolean;
  /** The marks it goes through when it could not go round them. */
  blocked: string[];
  /** The box read for what is in the way, and the marks read there: what a mark moved, drawn or taken away derives it again for. */
  window: Bounds;
  seen: string[];
  reasoning: string;
}

/** The route a connector holds, if it is routed — a rep the engine wrote, read and not trusted. */
export function routeRepOf(node: MMNode): RouteRep | undefined {
  const d = getRep(node, 'route')?.data as Partial<RouteRep> | undefined;
  return d && Array.isArray(d.points) ? (d as RouteRep) : undefined;
}

/** Whether a route stands: the connector is routed and both its ends are tied. */
export function routeStands(node: MMNode): boolean {
  const r = routeRepOf(node);
  return !!r && r.points.length >= 2;
}

/** A connector a route can be drawn for: a stroke with both ends tied, to marks that stand and offer the sites. */
export function routable(node: MMNode, nodes: ReadonlyMap<string, MMNode>): boolean {
  if (!getRep(node, 'stroke') || getRep(node, 'erased')) return false;
  const held = activeBindingsOf(node, nodes).filter((b) => (b.end === 'start' || b.end === 'end') && b.nodeId !== node.id);
  const at = (end: 'start' | 'end') => {
    const b = held.find((x) => x.end === end);
    const t = b && nodes.get(b.nodeId);
    return !!t && !!boundSiteOf(t, nodes, b.site) && !!boundsOf(t);
  };
  return at('start') && at('end');
}

const strokeScale = (node: MMNode) => {
  const s = (getRep(node, 'stroke')?.data as { scale?: number } | undefined)?.scale;
  return s && s > 0 ? s : 1;
};

const isArrow = (node: MMNode) => cleanOf(node)?.shape === 'arrow' || !!getRep(node, 'reading:arrow');

const meets = (p: Bounds, q: Bounds) => p.minX <= q.maxX && q.minX <= p.maxX && p.minY <= q.maxY && q.minY <= p.maxY;
const within = (inner: Bounds, outer: Bounds, slack = 0) => inner.minX >= outer.minX - slack && inner.maxX <= outer.maxX + slack && inner.minY >= outer.minY - slack && inner.maxY <= outer.maxY + slack;

/** The arrow's head at the tip of the last segment: the barb as drawn, never more than a share of the segment. */
function headOf(points: Point[], barb: number): RouteRep['head'] {
  const tip = points[points.length - 1], prev = points[points.length - 2];
  const len = Math.hypot(tip.x - prev.x, tip.y - prev.y);
  if (len < EPS) return undefined;
  const ux = (tip.x - prev.x) / len, uy = (tip.y - prev.y) / len;
  const reach = Math.min(barb, 0.45 * len);
  const wing = (side: number): Point => ({
    x: tip.x - reach * (ux * Math.cos(HEAD_SPREAD) - side * uy * Math.sin(HEAD_SPREAD)),
    y: tip.y - reach * (uy * Math.cos(HEAD_SPREAD) + side * ux * Math.sin(HEAD_SPREAD)),
  });
  return { tip: { ...tip }, wings: [wing(1), wing(-1)] };
}

const idle = (why: string): RouteRep => ({ points: [], from: 'start', turns: 0, avoided: true, blocked: [], window: { minX: 0, minY: 0, maxX: 0, maxY: 0 }, seen: [], reasoning: why });

/**
 * The route a connector stands as, from the sites its ends are bound to
 * where they stand now: a pure function of the board. `near(box)` says which
 * marks lie in a box — the session's index, or a scan; the marks in the way
 * are those of them that are closed and big enough to go round (a letter is
 * not) and that neither hold nor sit inside the symbols the connector joins.
 */
export function deriveRoute(node: MMNode, nodes: ReadonlyMap<string, MMNode>, near: (box: Bounds) => Iterable<string>): RouteRep {
  const held = activeBindingsOf(node, nodes).filter((b) => (b.end === 'start' || b.end === 'end') && b.nodeId !== node.id);
  const bs = held.find((b) => b.end === 'start'), be = held.find((b) => b.end === 'end');
  if (!bs || !be) return idle('an end is tied to nothing, so there is nothing to route between');
  const ts = nodes.get(bs.nodeId), te = nodes.get(be.nodeId);
  const ss = ts && boundSiteOf(ts, nodes, bs.site), se = te && boundSiteOf(te, nodes, be.site);
  const boxS = ts && boundsOf(ts), boxE = te && boundsOf(te);
  if (!ts || !te || !ss || !se || !boxS || !boxE) return idle('a mark it is tied to no longer offers the place it was tied at');
  const arrow = isArrow(node);
  const tail = arrow ? connectorEnds(node, nodes)?.tail ?? 'start' : 'start';
  const [first, last] = tail === 'start' ? [{ site: ss, box: boxS, id: bs.nodeId }, { site: se, box: boxE, id: be.nodeId }] : [{ site: se, box: boxE, id: be.nodeId }, { site: ss, box: boxS, id: bs.nodeId }];
  const scale = strokeScale(node);
  const a: RouteEnd = { point: { ...first.site.point }, dir: outwardOf(first.site.point, first.box, last.site.point), box: first.box };
  const b: RouteEnd = { point: { ...last.site.point }, dir: outwardOf(last.site.point, last.box, first.site.point), box: last.box };

  const lo = { x: Math.min(a.point.x, b.point.x), y: Math.min(a.point.y, b.point.y) }, hi = { x: Math.max(a.point.x, b.point.x), y: Math.max(a.point.y, b.point.y) };
  const pad = Math.max(4 * STUB_PX * scale, WINDOW_SHARE * Math.max(hi.x - lo.x, hi.y - lo.y));
  const window: Bounds = { minX: Math.min(lo.x, first.box.minX, last.box.minX) - pad, minY: Math.min(lo.y, first.box.minY, last.box.minY) - pad, maxX: Math.max(hi.x, first.box.maxX, last.box.maxX) + pad, maxY: Math.max(hi.y, first.box.maxY, last.box.maxY) + pad };
  const blocks: RouteBlock[] = [];
  const seen: string[] = [];
  const minSide = MIN_OBSTACLE_PX * scale;
  for (const id of near(window)) {
    if (id === node.id || id === bs.nodeId || id === be.nodeId) continue;
    const m = nodes.get(id);
    if (!m || getRep(m, 'erased') || !getRep(m, 'stroke')) continue;
    seen.push(id);
    if (bindingsOf(m).length || !standsClosed(m)) continue;
    const box = boundsOf(m);
    if (!box || box.maxX - box.minX < minSide || box.maxY - box.minY < minSide) continue;
    // A mark that holds a symbol it joins is a container, and one inside a symbol is its writing: neither is in the way.
    if (within(boxS, box) || within(boxE, box) || within(box, boxS) || within(box, boxE)) continue;
    blocks.push({ id, box });
  }
  seen.sort();
  const path = routeBetween(a, b, blocks, scale);
  const head = arrow ? headOf(path.points, (getRep(node, 'reading:arrow')?.data as { barb?: number } | undefined)?.barb ?? 18 * scale) : undefined;
  const all = path.points;
  const box: Bounds = {
    minX: Math.min(window.minX, ...all.map((p) => p.x)), minY: Math.min(window.minY, ...all.map((p) => p.y)),
    maxX: Math.max(window.maxX, ...all.map((p) => p.x)), maxY: Math.max(window.maxY, ...all.map((p) => p.y)),
  };
  return {
    points: path.points, from: tail, ...(head ? { head } : {}),
    turns: path.turns, avoided: path.avoided, blocked: path.blocked, window: box, seen, reasoning: path.reasoning,
  };
}

/**
 * Whether a change to these marks can change a route: it is one of the
 * connector, the marks it is tied to and the marks its route was read among,
 * or it now stands in the window the route was read in.
 */
export function routeAffectedBy(node: MMNode, rep: RouteRep, nodes: ReadonlyMap<string, MMNode>, touched: readonly string[]): boolean {
  const ties = new Set(bindingsOf(node).map((b) => b.nodeId));
  for (const id of touched) {
    if (id === node.id || ties.has(id) || rep.seen.includes(id)) return true;
    const m = nodes.get(id);
    const b = m && boundsOf(m);
    if (b && meets(b, rep.window)) return true;
  }
  return false;
}

// ===== Tidy the diagram =====

/** What *Tidy the diagram* lines up: the ranks of the symbols along the way the flows run, each of two or more symbols one row (or column) to align. */
export interface TidyPlan {
  /** The flows run down the page (ranks are rows) or across it (ranks are columns). */
  flow: 'down' | 'across';
  /** The symbols of each rank that stands with others, by the stroke each is — only a symbol of one stroke, whose ink `tidy` may place whole. */
  ranks: { ids: string[]; axis: 'row' | 'column'; spread: number }[];
  /** Symbols left where they stand because more than one stroke draws them. */
  figures: string[];
}

/**
 * A rank is what stands the same number of flows from where the flows begin —
 * the yes and the no of a decision are one rank, however far apart the hand
 * drew them — but only while they are within reach of each other: symbols of a
 * rank stand within this many times the smaller one's extent along the flow, or
 * they are separate ranks (`RANK_BAND`, chained).
 */
export const RANK_SPREAD = 4;
/** Symbols of a rank drawn further apart than `RANK_SPREAD` are split where centres stand more than this many extents apart. */
export const RANK_BAND = 1;

/**
 * The plan for tidying a notation's reading: its symbols by rank — the
 * longest way to each from where the flows begin, a flow round to a symbol
 * already on the way left out — and each rank of two or more a row (flows
 * down) or a column (flows across) for tidy's alignment. `spread` is how far
 * a rank's centres stand off one line, in board units: nothing to align when
 * it is nothing. A symbol no flow joins is left where it stands.
 */
export function tidyPlanOf(
  nodes: ReadonlyMap<string, MMNode>,
  reading: { symbols: readonly { id: string; ids: readonly string[] }[]; connectors: readonly { from: string; to: string; direction?: string }[] },
): TidyPlan {
  type Item = { id: string; sym: string; cx: number; cy: number; w: number; h: number };
  const items: Item[] = [];
  const figures: string[] = [];
  for (const s of reading.symbols) {
    if (s.ids.length !== 1) { figures.push(s.id); continue; }
    const n = nodes.get(s.ids[0]);
    const b = n && boundsOf(n);
    if (b) items.push({ id: s.ids[0], sym: s.id, cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2, w: b.maxX - b.minX, h: b.maxY - b.minY });
  }
  const bySym = new Map(items.map((i) => [i.sym, i]));
  let dx = 0, dy = 0;
  for (const c of reading.connectors) {
    const p = bySym.get(c.from), q = bySym.get(c.to);
    if (p && q) { dx += Math.abs(p.cx - q.cx); dy += Math.abs(p.cy - q.cy); }
  }
  const flow: 'down' | 'across' = dy >= dx ? 'down' : 'across';
  const along = (i: Item) => (flow === 'down' ? i.cy : i.cx);
  const extent = (i: Item) => (flow === 'down' ? i.h : i.w);
  const across = (i: Item) => (flow === 'down' ? i.cx : i.cy);

  // The flows as arrows between symbols: a headless flow runs the way the page reads.
  const out = new Map<string, string[]>();
  const joined = new Set<string>();
  for (const c of reading.connectors) {
    const p = bySym.get(c.from), q = bySym.get(c.to);
    if (!p || !q || p === q) continue;
    const forward = c.direction === 'forward' || c.direction === 'both' || along(p) <= along(q);
    const [u, v] = forward ? [p, q] : [q, p];
    if (!out.has(u.sym)) out.set(u.sym, []);
    out.get(u.sym)!.push(v.sym);
    joined.add(u.sym); joined.add(v.sym);
  }
  // Depth first in reading order: an arrow back to a symbol still on the way is a loop, and is left out.
  const state = new Map<string, 1 | 2>();
  const order: string[] = [];
  const dag = new Map<string, string[]>();
  const visit = (u: string) => {
    state.set(u, 1);
    for (const v of out.get(u) ?? []) {
      if (state.get(v) === 1) continue;
      (dag.get(u) ?? dag.set(u, []).get(u)!).push(v);
      if (!state.has(v)) visit(v);
    }
    state.set(u, 2);
    order.push(u);
  };
  for (const s of reading.symbols) if (joined.has(s.id) && !state.has(s.id)) visit(s.id);
  const rank = new Map<string, number>();
  for (const u of order.slice().reverse()) {
    const r = rank.get(u) ?? 0;
    rank.set(u, r);
    for (const v of dag.get(u) ?? []) rank.set(v, Math.max(rank.get(v) ?? 0, r + 1));
  }
  const byRank = new Map<number, Item[]>();
  for (const [sym, r] of rank) {
    const it = bySym.get(sym);
    if (it) (byRank.get(r) ?? byRank.set(r, []).get(r)!).push(it);
  }
  const ranks: TidyPlan['ranks'] = [];
  for (const r of [...byRank.keys()].sort((p, q) => p - q)) {
    // Within reach of each other along the flow, chained; a rank drawn further apart than that is more than one.
    const sorted = byRank.get(r)!.slice().sort((p, q) => along(p) - along(q) || (p.id < q.id ? -1 : 1));
    let cur: Item[] = [];
    const flush = () => {
      if (cur.length > 1) {
        const cs = cur.map(along);
        const small = Math.min(...cur.map(extent));
        if (Math.max(...cs) - Math.min(...cs) <= RANK_SPREAD * small) {
          ranks.push({ ids: cur.slice().sort((p, q) => across(p) - across(q) || (p.id < q.id ? -1 : 1)).map((i) => i.id), axis: flow === 'down' ? 'row' : 'column', spread: Math.max(...cs) - Math.min(...cs) });
        }
      }
      cur = [];
    };
    for (const it of sorted) {
      const last = cur[cur.length - 1];
      if (last && along(it) - along(last) > RANK_BAND * Math.min(extent(it), extent(last)) * RANK_SPREAD) flush();
      cur.push(it);
    }
    flush();
  }
  return { flow, ranks, figures };
}

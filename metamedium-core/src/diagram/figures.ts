// Figures of several strokes — lines whose ends meet read as one figure
// (V1-PLAN §4, §9 E3; MATHS-PLAN §3, M3).
//
// A triangle ruled in three strokes is one triangle, and a diamond drawn as
// two bent strokes — the top half, then the bottom — is one diamond. The
// shape rung reads each stroke alone and cannot see either; this reads the
// strokes together, the way a concept does, and says what they make:
//
//   - **Ruled strokes.** An open stroke made of straight runs — a line, or a
//     line that bends. It bends where the shape rung's own corner finder sees
//     a corner (`countCorners`), and at a shallower bend the rung reads past —
//     a flat diamond's halves turn barely fifty degrees — when the turn is all
//     in one place: each side of it straight, where an arc bows all along.
//     Writing, arrows, curves and closed strokes are not ruled; a closed
//     stroke is its own mark's figure (`figureOfMark`, maths/dimension.ts).
//   - **Ends meet** when a magnet tied them (a `bound-to` binding from one to
//     the other's end), or when they touch: within the hand's reach of each
//     other — the magnet radius, relative to the smaller stroke's size
//     (magnets.ts). So a hand's small gap or overshoot at a corner still
//     meets, and lines that merely CROSS do not: their ends are nowhere near
//     each other. The corner is where the two lines meet.
//   - **A figure is a cycle** of ruled strokes, end to end, that closes:
//     three corners a triangle, four a quadrilateral — a diamond when it is a
//     quadrilateral turned about 45° (its diagonals level and plumb), a
//     rectangle when its four corners read right — and more a polygon. Where
//     two strokes meet in a straight line they are one side, and the side
//     keeps both marks.
//   - **Every side keeps the marks it was drawn with.** That is what lets the
//     maths say which label sits on which side, so a figure goes to the solver
//     through the maths lane's `polygonFigure`, and `solveBoard(state, {
//     figures: figuresOf(state) })` solves a triangle ruled in three strokes
//     exactly as it solves one drawn in a single stroke.
//
// Derived, like concepts: no node is made and nothing is written to the log.
// The corners are the lines' own — where the fitted lines meet — not the
// wobbly ends of the ink, and the vertices go round from the top, clockwise as
// the screen shows them, so the same drawing gives the same figure whatever
// order it was drawn in.

import type { Point } from '../types';
import type { SessionState } from '../session/session';
import type { MMNode } from '../session/nodes';
import { fingerprintOf, getRep, isWord, strokePointsOf, transcriptOf } from '../session/nodes';
import { snapReading } from '../session/clean';
import { bindingsOf, magnetRadius, siteOf } from '../session/magnets';
import { RIGHT_ANGLE_TOLERANCE } from '../session/measure';
import { MAX_TIER0_CONFIDENCE } from '../recognition';
import { calculateStraightness, countCorners, resampleByArcLength } from '../geometry';
import { polygonFigure } from '../maths/dimension';
import type { Figure, FigureKind } from '../maths/dimension';

/** What a figure of several strokes reads as. */
export type FigureShape = 'triangle' | 'quadrilateral' | 'diamond' | 'rectangle' | 'polygon';

/** One corner of a figure, and how it was made. */
export interface FigureCorner {
  point: Point;
  /**
   * `bound` — two ends a magnet tied; `touching` — two ends within the hand's
   * reach of where their lines meet; `bend` — a stroke turning a corner on
   * its own.
   */
  how: 'bound' | 'touching' | 'bend';
  /** The marks that make it. */
  ids: string[];
  /** How far apart the ends stood, as a share of the reach: 0 for a bend, a bind, or ends that meet exactly. */
  gap: number;
}

/**
 * A figure read from several strokes: the maths lane's `Figure` (its kind is
 * what the solver solves it as), with what it reads as and how its corners
 * were made.
 */
export interface InkFigure extends Figure {
  shape: FigureShape;
  /** 0–1: how cleanly the ends meet and the shape holds, below the shape rung's own ceiling. */
  confidence: number;
  /** One per vertex, in the same order. */
  corners: FigureCorner[];
}

/**
 * Two strokes meeting at less than this turn continue one side: a side ruled
 * in two goes, which a hand joins within a few degrees. A real corner of a
 * figure turns more — a triangle's most obtuse corner of 150° still turns 30°.
 */
export const STRAIGHT_TURN = 20;
/** A quadrilateral is a diamond when its diagonals lie within this many degrees of level and of plumb. */
export const DIAMOND_SLACK = 15;
/**
 * A cycle enclosing less than this share of what its perimeter could (the
 * isoperimetric 4πA/P²) is a sliver — strokes run back along each other — not
 * a figure. A 3-4-5 triangle scores 0.52; a triangle twenty times as long as
 * it is high, 0.08.
 */
export const SLIVER = 0.05;
/**
 * A run is straight when its chord is at least this share of its length
 * (`calculateStraightness`): a hand's ruled line keeps well inside it — 200 px
 * bowed 20 px is 0.97 — while a 60° arc is 0.955.
 */
export const STRAIGHT_RUN = 0.97;
/**
 * A stroke that is not straight bends in ONE place when each side of its
 * farthest point from its chord stands off its own chord by less than this
 * share of how far that point stands off: a bend's sides are straight but for
 * the hand's bow, while an arc's halves each bow a quarter as much as the whole.
 */
export const ONE_BEND = 0.2;
/** The longest cycle of strokes read as one figure: past it, a board of connectors would be searched for rings. */
export const MAX_FIGURE_STROKES = 8;
/** Stop looking after this many cycles: enough for any drawing a hand makes, bounded for any board. */
const MAX_CYCLES = 2000;

const DEG = Math.PI / 180;

// ===== Ruled strokes =====

interface Line {
  point: Point;
  /** Unit, from the run's start toward its end. */
  dir: Point;
}

interface Ruled {
  id: string;
  scale: number;
  size: number;
  runs: Line[];
  /** The stroke's ends on its first and last runs' lines. */
  start: Point;
  end: Point;
  /** Where consecutive runs' lines meet, from the start. */
  bends: Point[];
}

const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;
const cross = (a: Point, b: Point) => a.x * b.y - a.y * b.x;
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** The line through a run's points: through their mean, along their principal axis, pointing from the first toward the last. */
function fitLine(points: readonly Point[]): Line | null {
  if (points.length < 2) return null;
  const n = points.length;
  const c = { x: points.reduce((a, p) => a + p.x, 0) / n, y: points.reduce((a, p) => a + p.y, 0) / n };
  let sxx = 0, syy = 0, sxy = 0;
  for (const p of points) {
    sxx += (p.x - c.x) ** 2;
    syy += (p.y - c.y) ** 2;
    sxy += (p.x - c.x) * (p.y - c.y);
  }
  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  let dir = { x: Math.cos(angle), y: Math.sin(angle) };
  if (dot(sub(points[n - 1], points[0]), dir) < 0) dir = { x: -dir.x, y: -dir.y };
  return { point: c, dir };
}

const onLine = (l: Line, p: Point): Point => {
  const t = dot(sub(p, l.point), l.dir);
  return { x: l.point.x + l.dir.x * t, y: l.point.y + l.dir.y * t };
};

/** Where two lines meet, or null when they are parallel. Nearly parallel lines meet far off — callers check how far. */
function meet(a: Line, b: Line): Point | null {
  const d = cross(a.dir, b.dir);
  if (Math.abs(d) < 1e-9) return null;
  const t = cross(sub(b.point, a.point), b.dir) / d;
  return { x: a.point.x + a.dir.x * t, y: a.point.y + a.dir.y * t };
}

/** How far the farthest point of `path[a..b]` stands off the chord from `path[a]` to `path[b]`, and where it is. */
function offChord(path: readonly Point[], a: number, b: number): { at: number; off: number } {
  const p = path[a], q = path[b];
  const L = dist(p, q);
  let at = a, off = 0;
  for (let i = a + 1; i < b; i++) {
    const d = L > 1e-9 ? Math.abs(cross(sub(q, p), sub(path[i], p))) / L : dist(path[i], p);
    if (d > off) {
      off = d;
      at = i;
    }
  }
  return { at, off };
}

/**
 * The straight runs of `path[a..b]` as index pairs, splitting at a bend the
 * turn is all in one place — or null when it curves.
 */
function straightRuns(path: readonly Point[], a: number, b: number, depth = 0): [number, number][] | null {
  if (b - a < 4) return null;
  if (calculateStraightness(path.slice(a, b + 1)) >= STRAIGHT_RUN) return [[a, b]];
  if (depth >= 3) return null;
  const { at, off } = offChord(path, a, b);
  if (at - a < 4 || b - at < 4) return null;
  if (Math.max(offChord(path, a, at).off, offChord(path, at, b).off) > ONE_BEND * off) return null;
  const left = straightRuns(path, a, at, depth + 1), right = straightRuns(path, at, b, depth + 1);
  return left && right ? [...left, ...right] : null;
}

/**
 * A stroke as straight runs, or null when it is not ruled: closed, writing,
 * an arrow — or any stretch of it that curves.
 */
function ruledOf(node: MMNode, nodes: ReadonlyMap<string, MMNode>): Ruled | null {
  const pts = strokePointsOf(node);
  const fp = fingerprintOf(node);
  if (!pts || !fp || pts.length < 2 || fp.isClosed) return null;
  if (isWord(node) || transcriptOf(node) || getRep(node, 'gesture') || getRep(node, 'erased')) return null;
  const shape = snapReading(node, nodes).shape;
  if (shape === 'arrow' || shape === 'text' || shape === 'dot') return null;
  const scale = (getRep(node, 'stroke')?.data as { scale?: number } | undefined)?.scale ?? 1;

  // Measured along the path: the rung's corners first, then any bend it read past.
  const N = 180;
  const path = resampleByArcLength(pts, N);
  const cuts = countCorners(pts, {}, false).cornerData.map((c) => Math.round(c.t * (N - 1))).filter((i) => i > 4 && i < N - 5);
  const stops = [0, ...cuts, N - 1];
  const spans: [number, number][] = [];
  for (let k = 0; k < stops.length - 1; k++) {
    const r = straightRuns(path, stops[k], stops[k + 1]);
    if (!r) return null;
    spans.push(...r);
  }
  const runs: Line[] = [];
  spans.forEach(([a, b], k) => {
    // Keep clear of a rounded corner: the run's own straight middle sets its line.
    const trim = Math.round((b - a) * 0.08);
    const lo = k > 0 ? a + trim : a, hi = k < spans.length - 1 ? b - trim : b;
    const line = fitLine(path.slice(lo, hi + 1));
    if (line) runs.push(line);
  });
  if (runs.length !== spans.length || !runs.length) return null;
  const b = fp.bounds;
  const size = Math.max(b.maxX - b.minX, b.maxY - b.minY);
  // A bend is where its two runs' lines meet — unless they run so nearly
  // straight on that the lines meet far off, where the ink's own corner will do.
  const bends: Point[] = [];
  for (let k = 1; k < runs.length; k++) {
    const at = path[spans[k][0]];
    const m = meet(runs[k - 1], runs[k]);
    bends.push(m && dist(m, at) <= magnetRadius(size, scale) ? m : onLine(runs[k], at));
  }
  return {
    id: node.id,
    scale,
    size,
    runs,
    start: onLine(runs[0], pts[0]),
    end: onLine(runs[runs.length - 1], pts[pts.length - 1]),
    bends,
  };
}

// ===== Ends and where they meet =====

type Which = 'start' | 'end';

interface End {
  stroke: number;
  which: Which;
  point: Point;
  /** The line of the run at this end, pointing OUT of the stroke. */
  out: Line;
}

interface Meeting {
  a: number; // end indices
  b: number;
  point: Point;
  bound: boolean;
  /** How far apart the two ends stood, as a share of the reach. */
  gap: number;
}

const endIndex = (stroke: number, which: Which) => stroke * 2 + (which === 'start' ? 0 : 1);

/** Which end of a ruled stroke a bound site is — a line's tail and tip, else whichever end the site stands on. */
function endAtSite(r: Ruled, node: MMNode, nodes: ReadonlyMap<string, MMNode>, site: { kind: string; index: number }, reach: number): Which | null {
  if (site.kind === 'tail') return 'start';
  if (site.kind === 'tip') return 'end';
  const s = siteOf(node, nodes, site);
  if (!s) return null;
  if (dist(s.point, r.start) <= reach) return 'start';
  if (dist(s.point, r.end) <= reach) return 'end';
  return null;
}

// ===== Figures =====

/**
 * Every figure the board's ruled strokes make where their ends meet — a
 * triangle, a quadrilateral (a diamond, a rectangle), a polygon — each with
 * its corners, its sides and the marks each was drawn with, its angles, what
 * it reads as and why. Reads the session and changes nothing in it.
 */
export function figuresOf(state: SessionState): InkFigure[] {
  const artifacts = new Set(state.artifacts);
  return figuresAmong(state.nodes, state.contentIds.filter((id) => !artifacts.has(id)));
}

/** The same, among the given marks — for a notation that has its own scope. */
export function figuresAmong(nodes: ReadonlyMap<string, MMNode>, ids: readonly string[]): InkFigure[] {
  const ruled: Ruled[] = [];
  for (const id of ids) {
    const n = nodes.get(id);
    const r = n && ruledOf(n, nodes);
    if (r) ruled.push(r);
  }
  if (ruled.length < 2) return [];
  const byId = new Map(ruled.map((r, i) => [r.id, i]));

  const ends: End[] = [];
  ruled.forEach((r, i) => {
    const first = r.runs[0], last = r.runs[r.runs.length - 1];
    ends.push({ stroke: i, which: 'start', point: r.start, out: { point: first.point, dir: { x: -first.dir.x, y: -first.dir.y } } });
    ends.push({ stroke: i, which: 'end', point: r.end, out: last });
  });
  const reachOf = (a: End, b: End) => magnetRadius(Math.min(ruled[a.stroke].size, ruled[b.stroke].size), Math.max(ruled[a.stroke].scale, ruled[b.stroke].scale));

  // Bound: a stroke's end tied by a magnet to another ruled stroke's end.
  const boundPairs = new Set<string>();
  const pairKey = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);
  ruled.forEach((r, i) => {
    const node = nodes.get(r.id)!;
    for (const bnd of bindingsOf(node, nodes)) {
      if (!bnd.active || (bnd.end !== 'start' && bnd.end !== 'end')) continue;
      const j = byId.get(bnd.nodeId);
      if (j === undefined || j === i) continue;
      const which = endAtSite(ruled[j], nodes.get(bnd.nodeId)!, nodes, bnd.site, reachOf(ends[endIndex(i, bnd.end)], ends[endIndex(j, 'start')]));
      if (which) boundPairs.add(pairKey(endIndex(i, bnd.end), endIndex(j, which)));
    }
  });

  // Every pair of ends of different strokes that meet.
  const meetings = new Map<string, Meeting>();
  for (let a = 0; a < ends.length; a++) {
    for (let b = a + 1; b < ends.length; b++) {
      const ea = ends[a], eb = ends[b];
      if (ea.stroke === eb.stroke) continue;
      const bound = boundPairs.has(pairKey(a, b));
      const reach = reachOf(ea, eb);
      const apart = dist(ea.point, eb.point);
      if (!bound && apart > reach) continue;
      // The corner is where the two lines meet — unless they run on in one
      // line, or meet far off (a sharp corner drawn short), where the ends'
      // own middle will do.
      const corner = meet(ea.out, eb.out);
      const point = corner && dist(corner, ea.point) <= 2 * reach && dist(corner, eb.point) <= 2 * reach ? corner : mid(ea.point, eb.point);
      meetings.set(pairKey(a, b), { a, b, point, bound, gap: bound ? 0 : apart / reach });
    }
  }
  if (!meetings.size) return [];

  // Junctions: ends that meet, gathered.
  const parent = ends.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (const m of meetings.values()) parent[find(m.a)] = find(m.b);
  const met = new Set<number>();
  for (const m of meetings.values()) { met.add(m.a); met.add(m.b); }

  // The graph: a stroke is an edge between the junctions of its two ends.
  const edges: { stroke: number; u: number; v: number }[] = [];
  ruled.forEach((_, i) => {
    const s = endIndex(i, 'start'), e = endIndex(i, 'end');
    if (!met.has(s) || !met.has(e)) return;
    const u = find(s), v = find(e);
    if (u !== v) edges.push({ stroke: i, u, v });
  });

  const figures: InkFigure[] = [];
  const seen = new Set<string>();
  for (const cycle of simpleCycles(edges)) {
    const key = cycle.map((k) => ruled[edges[k].stroke].id).sort().join('+');
    if (seen.has(key)) continue;
    seen.add(key);
    const f = figureOfCycle(cycle.map((k) => edges[k]), ruled, meetings, find, pairKey);
    if (!f) continue;
    // A stroke joining two of its corners across its inside makes it two
    // figures, not one: the faces are the figures, as a hand means them.
    const corners = new Set(cycle.flatMap((k) => [edges[k].u, edges[k].v]));
    const chord = edges.some((e, k) => !cycle.includes(k) && corners.has(e.u) && corners.has(e.v) && runMiddles(ruled[e.stroke]).some((p) => strictlyInside(f, p, ruled[e.stroke])));
    if (!chord) figures.push(f);
  }
  return figures;
}

/** The middle of each straight run of a ruled stroke. */
function runMiddles(r: Ruled): Point[] {
  const stops = [r.start, ...r.bends, r.end];
  return stops.slice(1).map((p, i) => mid(stops[i], p));
}

/** Simple cycles of two or more edges, each once, up to MAX_FIGURE_STROKES long, as edge indices in order. */
function simpleCycles(edges: { u: number; v: number }[]): number[][] {
  const out: number[][] = [];
  const at = new Map<number, number[]>();
  edges.forEach((e, k) => {
    (at.get(e.u) ?? at.set(e.u, []).get(e.u)!).push(k);
    (at.get(e.v) ?? at.set(e.v, []).get(e.v)!).push(k);
  });
  for (let first = 0; first < edges.length && out.length < MAX_CYCLES; first++) {
    const start = edges[first].u;
    const path = [first];
    const visited = new Set([start, edges[first].v]);
    const walk = (node: number) => {
      if (out.length >= MAX_CYCLES) return;
      for (const k of at.get(node) ?? []) {
        if (k <= first || path.includes(k)) continue;
        const e = edges[k];
        const next = e.u === node ? e.v : e.u;
        if (next === start) {
          out.push([...path, k]);
          continue;
        }
        if (visited.has(next) || path.length + 1 >= MAX_FIGURE_STROKES) continue;
        visited.add(next);
        path.push(k);
        walk(next);
        path.pop();
        visited.delete(next);
      }
    };
    walk(edges[first].v);
  }
  return out;
}

function shoelace(v: readonly Point[]): number {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += cross(v[i], v[(i + 1) % v.length]);
  return s / 2;
}

function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const d1 = cross(sub(b, a), sub(c, a)), d2 = cross(sub(b, a), sub(d, a));
  const d3 = cross(sub(d, c), sub(a, c)), d4 = cross(sub(d, c), sub(b, c));
  return d1 * d2 < 0 && d3 * d4 < 0;
}

function selfCrossing(v: readonly Point[]): boolean {
  const n = v.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      if (segmentsCross(v[i], v[(i + 1) % n], v[j], v[(j + 1) % n])) return true;
    }
  }
  return false;
}

function insidePolygon(p: Point, v: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = v.length - 1; i < v.length; j = i++) {
    if (v[i].y > p.y !== v[j].y > p.y && p.x < ((v[j].x - v[i].x) * (p.y - v[i].y)) / (v[j].y - v[i].y) + v[i].x) inside = !inside;
  }
  return inside;
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  const t = l2 > 0 ? Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2)) : 0;
  return dist(p, { x: a.x + ab.x * t, y: a.y + ab.y * t });
}

/** Well inside the figure — further in than the stroke's own reach from every side. */
function strictlyInside(f: Figure, p: Point, r: Ruled): boolean {
  if (!insidePolygon(p, f.vertices)) return false;
  const reach = magnetRadius(r.size, r.scale);
  return f.sides.every((s) => distToSegment(p, s.from, s.to) > reach);
}

/** Interior angles in degrees, reflex ones too, for vertices going round clockwise on screen. */
function interiorAngles(v: readonly Point[]): number[] {
  const n = v.length;
  return v.map((p, k) => {
    const a = sub(p, v[(k - 1 + n) % n]), b = sub(v[(k + 1) % n], p);
    const turn = Math.atan2(cross(a, b), dot(a, b)) / DEG;
    return 180 - turn;
  });
}

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
const count = (n: number) => WORDS[n] ?? String(n);

function figureOfCycle(
  cycle: { stroke: number; u: number; v: number }[],
  ruled: Ruled[],
  meetings: Map<string, Meeting>,
  find: (i: number) => number,
  pairKey: (a: number, b: number) => string
): InkFigure | null {
  // Walk it: each stroke from the junction it shares with the one before.
  let junction = cycle[0].u;
  const walk: { stroke: number; from: Which }[] = [];
  for (const e of cycle) {
    const from: Which = find(endIndex(e.stroke, 'start')) === junction ? 'start' : 'end';
    walk.push({ stroke: e.stroke, from });
    junction = find(endIndex(e.stroke, from === 'start' ? 'end' : 'start'));
  }

  // Corners and sides, in the walk's order.
  let corners: FigureCorner[] = [];
  let sides: string[][] = [];
  walk.forEach((w, i) => {
    const prev = walk[(i - 1 + walk.length) % walk.length];
    const a = endIndex(prev.stroke, prev.from === 'start' ? 'end' : 'start');
    const b = endIndex(w.stroke, w.from);
    const m = meetings.get(pairKey(a, b));
    const r = ruled[w.stroke], q = ruled[prev.stroke];
    if (m) corners.push({ point: m.point, how: m.bound ? 'bound' : 'touching', ids: [q.id, r.id], gap: m.gap });
    else {
      // They met through a third end at the same junction: the corner is where the junction's meetings are.
      const root = find(a);
      const pts = [...meetings.values()].filter((x) => find(x.a) === root).map((x) => x.point);
      const c = { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length };
      corners.push({ point: c, how: 'touching', ids: [q.id, r.id], gap: 1 });
    }
    sides.push([r.id]);
    const bends = w.from === 'start' ? r.bends : [...r.bends].reverse();
    for (const p of bends) {
      corners.push({ point: p, how: 'bend', ids: [r.id], gap: 0 });
      sides.push([r.id]);
    }
  });

  // Where strokes meet in a straight line they make one side, which keeps both marks.
  for (let changed = true; changed && corners.length > 2; ) {
    changed = false;
    const n = corners.length;
    for (let k = 0; k < n; k++) {
      const a = sub(corners[k].point, corners[(k - 1 + n) % n].point), b = sub(corners[(k + 1) % n].point, corners[k].point);
      const la = Math.hypot(a.x, a.y), lb = Math.hypot(b.x, b.y);
      const turn = la > 1e-9 && lb > 1e-9 ? Math.abs(Math.atan2(cross(a, b), dot(a, b))) / DEG : 0;
      if (turn >= STRAIGHT_TURN) continue;
      const before = (k - 1 + n) % n;
      const merged = [...new Set([...sides[before], ...sides[k]])];
      corners = corners.filter((_, i) => i !== k);
      sides = sides.filter((_, i) => i !== k);
      sides[before < k ? before : before - 1] = merged;
      changed = true;
      break;
    }
  }
  const n = corners.length;
  if (n < 3) return null;
  let v = corners.map((c) => c.point);
  const area = shoelace(v);
  const perimeter = v.reduce((s, p, i) => s + dist(p, v[(i + 1) % n]), 0);
  if (perimeter <= 0 || (4 * Math.PI * Math.abs(area)) / (perimeter * perimeter) < SLIVER) return null;
  if (selfCrossing(v)) return null;

  // Round from the top, clockwise as the screen shows it.
  if (area < 0) {
    corners = corners.slice().reverse();
    sides = corners.map((_, k) => sides[(n - 2 - k + n) % n]);
  }
  let top = 0;
  corners.forEach((c, k) => {
    const t = corners[top].point;
    if (c.point.y < t.y || (c.point.y === t.y && c.point.x < t.x)) top = k;
  });
  corners = corners.map((_, k) => corners[(k + top) % n]);
  sides = sides.map((_, k) => sides[(k + top) % n]);
  v = corners.map((c) => c.point);
  const angles = interiorAngles(v);

  // What it reads as.
  const strokes = [...new Set(walk.map((w) => ruled[w.stroke].id))];
  let shape: FigureShape, kind: FigureKind, fit = 1, says: string;
  const right = n === 4 && angles.every((a) => Math.abs(a - 90) <= RIGHT_ANGLE_TOLERANCE);
  if (n === 3) {
    shape = 'triangle';
    kind = 'triangle';
    says = 'a triangle';
  } else if (n === 4) {
    // A diagonal's slope, 0° level to 90° plumb.
    const slope = (p: Point, q: Point) => Math.atan2(Math.abs(q.y - p.y), Math.abs(q.x - p.x)) / DEG;
    const d1 = slope(v[0], v[2]), d2 = slope(v[1], v[3]);
    const levelPlumb = (d1 <= DIAMOND_SLACK && d2 >= 90 - DIAMOND_SLACK) || (d2 <= DIAMOND_SLACK && d1 >= 90 - DIAMOND_SLACK);
    const convex = angles.every((a) => a < 180);
    kind = right ? 'rectangle' : 'quadrilateral';
    if (levelPlumb && convex) {
      shape = 'diamond';
      const worst = Math.max(Math.min(d1, 90 - d1), Math.min(d2, 90 - d2));
      fit = 1 - 0.5 * (worst / DIAMOND_SLACK);
      says = `a diamond — a quadrilateral turned about 45°, its corners at the top, right, bottom and left, its diagonals within ${Math.max(1, Math.ceil(worst))}° of level and plumb${right ? ', its corners square' : ''}`;
    } else if (right) {
      shape = 'rectangle';
      const worst = Math.max(...angles.map((a) => Math.abs(a - 90)));
      fit = 1 - 0.5 * (worst / RIGHT_ANGLE_TOLERANCE);
      says = `a rectangle — its four corners are right within ±${RIGHT_ANGLE_TOLERANCE}° (measure.ts), as the ink measures them`;
    } else {
      shape = 'quadrilateral';
      says = 'a quadrilateral';
    }
  } else {
    shape = 'polygon';
    kind = 'polygon';
    says = `a polygon of ${count(n)} corners`;
  }

  const joints = corners.filter((c) => c.how !== 'bend');
  const bound = joints.filter((c) => c.how === 'bound').length;
  const meetQuality = Math.min(...joints.map((c) => (c.how === 'bound' ? 1 : 1 - 0.5 * Math.min(1, c.gap))));
  const bendCount = corners.length - joints.length;
  const every = joints.length === 2 ? 'both corners' : 'every corner';
  const how = bound === joints.length
    ? `bound by a magnet at ${every}`
    : bound > 0
      ? `bound by a magnet at ${count(bound)} and touching at ${count(joints.length - bound)}`
      : `touching at ${every}, within the hand's reach`;
  const bends = bendCount ? `, with ${count(bendCount)} more where ${strokes.length === 1 ? 'it bends' : 'they bend'}` : '';
  const reason = `${count(strokes.length)} strokes whose ends meet, ${how}${bends}: ${says}`;
  const ids = [...new Set(sides.flat())];
  const base = polygonFigure(v, { id: `figure:${[...strokes].sort().join('+')}`, ids, sideIds: sides, kind, reason });
  return {
    ...base,
    angles,
    shape,
    confidence: MAX_TIER0_CONFIDENCE * meetQuality * fit,
    corners,
  };
}

/** A figure in one line, for a status line, a panel or a brief. */
export function describeFigure(f: InkFigure): string {
  const sides = f.sides.map((s) => `${s.label} by ${s.ids.join(' and ')}`).join('; ');
  return `${f.shape} ${f.confidence.toFixed(2)} — ${f.reason}; ${sides}`;
}

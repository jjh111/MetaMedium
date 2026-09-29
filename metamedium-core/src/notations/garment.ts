// The garment pattern piece (V1-PLAN §3, §9 M6; MATHS-PLAN §1, §4).
//
// What a drafter marks on a piece of a pattern, read from ink:
//
//   - **piece** — a closed outline of some size: the piece of fabric, at its
//     sewing line. Any closed shape, however it was read — a panel is a
//     rectangle, a bodice is not — because what makes it a pattern piece is
//     what is drawn on it, never how it is shaped.
//   - **grain line** — a straight line with a head at each end, inside the
//     piece and a good part of its length: the way the fabric runs. Its heads
//     are read past the line's own ink (a chevron at each end, or a hook at
//     each end of one stroke), never the relation table, which calls a head
//     drawn apart the line's neighbour.
//   - **fold** — the same double-headed line, but standing along an edge of the
//     piece, parallel to it and close: that edge is cut on the fold. What
//     tells a fold from a grain line is where it stands, not how it is drawn.
//   - **notch** — a short tick across the outline (or a small wedge on it), a
//     mark to match to the next piece. It is small enough to be a letter's
//     size, and is a notch by where it stands: on the outline, and square to
//     it.
//   - **dart** — a narrow wedge from an edge, its point inside the piece: one
//     closed triangle, or a V of one open stroke, its two ends on the outline.
//   - **seam allowance** — a second outline standing off the piece the same
//     distance all round: the cutting line, with the allowance between. The
//     piece is the inner outline, the finished size; the outer one is what is
//     cut. It is measured, never assumed: an outline that stands off unevenly
//     is a frame, and one that stands off a piece-sized distance is another
//     piece.
//
// **What a signature cannot see** (the trap, packs/pack.ts): each of the six is
// a relation to the piece's outline — inside it, along it, across it, off it
// the same distance all round — and two need a head kind or an orientation.
// A bag of shapes and the links between them is rotation-free and blind to
// where a line ends, so a grain line and a fold, or a notch and a letter l,
// are the same signature. Read from the geometry here, and the garment@1 pack
// names this notation and restates none of it.
//
// **What it is not.** A box with an arrow in it is a flowchart's frame with a
// flow in it, a box inside a box a card in a panel. What makes a pattern piece
// is evidence a flowchart has no symbol for — a line with a head at both ends
// running the piece's length, a tick across the outline, a wedge standing on
// an edge, an outline the same distance off all round — and the reading's
// confidence is the evidence: the grain line settles it alone, two notches or a
// dart alone do not. Every symbol plays one of the six roles and adds none: the
// piece is a container, its marks annotations, writing inside it a label.
// Derived, like every notation: nothing enters the log. Its content is the
// table below, its single home; the maths of it — the cutting size against the
// sewing size, a fold's half, what true size prints — is `maths/garment.ts`.

import type { Bounds, Point } from '../types';
import type { SessionState } from '../session/session';
import type { MMNode } from '../session/nodes';
import { fingerprintOf, getRep, isWord, resemblances, strokePointsOf, transcriptOf } from '../session/nodes';
import { headsOf } from '../diagram/heads';
import type { Role } from '../diagram/roles';
import { HAND_RESOLUTION_PX, MAX_TIER0_CONFIDENCE } from '../recognition';
import type { Notation, NotationLabel, NotationReading, NotationSymbol } from './notation';
import type { Outline } from './flowchart';
import { outlineOf } from './flowchart';
import { centreOf, countWord, labelWriting, marksOf, ownWords, rolesOf, writingOf } from './graph-kit';
import { distToPath, hullOf, outside } from './shape';

// ===== The table — the garment's content =====

/**
 * The garment pattern piece's content: its six symbols, each with the role it
 * plays and how it looks, and the writing it reads. Content, not code, and
 * this is its single home: the `garment@1` pack names the notation and
 * restates none of it (V1-PLAN §2.3, B3); the rest of this file is what a
 * signature cannot see.
 */
export const GARMENT_TABLE = {
  pack: 'garment@1',
  notation: 'garment',
  name: 'Garment pattern piece',
  describes: 'a pattern piece with its grain line, fold, notches, darts and seam allowance',
  symbols: {
    piece: { role: 'container', describes: 'a closed outline: the piece of fabric, at its sewing line', one: 'piece', many: 'pieces' },
    grain: { role: 'annotation', describes: 'a straight line with a head at each end, inside the piece: the way the fabric runs', one: 'grain line', many: 'grain lines' },
    fold: { role: 'annotation', describes: 'a line with a head at each end along an edge of the piece: that edge is cut on the fold', one: 'fold', many: 'folds' },
    notch: { role: 'annotation', describes: 'a short tick across the outline, or a small wedge on it: a mark to match to the next piece', one: 'notch', many: 'notches' },
    dart: { role: 'annotation', describes: 'a narrow wedge from an edge, its point inside the piece: a fold sewn out', one: 'dart', many: 'darts' },
    seam: { role: 'annotation', describes: 'an outline standing off the piece the same distance all round: the cutting line, the seam allowance between', one: 'seam allowance', many: 'seam allowances' },
  },
  label: { role: 'label', describes: 'writing inside a piece: its name', one: 'word', many: 'words' },
} as const;

export type GarmentSymbolName = keyof typeof GARMENT_TABLE.symbols;
const SYMBOLS = Object.keys(GARMENT_TABLE.symbols) as GarmentSymbolName[];

// ===== Thresholds — this notation's own; the hand's are cited =====

/** A closed outline is a piece only from this size in the hand's space (screen pixels, longest side): anything smaller is a mark on one, or writing. */
export const PIECE_MIN_PX = 90;
/** A grain line or a fold is at least this long in the hand's space… */
export const LINE_MIN_PX = 60;
/** …and a grain line at least this share of the piece's long side. */
export const GRAIN_SHARE = 0.3;
/** A shaft is straight when no point of it stands off its chord by more than this share of its length. */
export const STRAIGHT_DEV = 0.06;
/** A hook at an end of a stroke is a head when it comes back along the shaft by this share of the stroke's length and at least `HOOK_PX` of the hand's. */
export const HOOK_SHARE = 0.03;
export const HOOK_PX = 6;
/** A fold runs within this many degrees of the edge it is along… */
export const PARALLEL_DEG = 15;
/** …stands within this share of the piece's short side of it (and at least `NEAR_PX` of the hand's), and spans this share of the piece's extent along it. */
export const FOLD_NEAR = 0.12;
export const NEAR_PX = 10;
export const FOLD_SPAN = 0.5;
/** A notch is at most this share of the piece's size long, at least this many of the hand's pixels, and crosses the outline at least this many degrees off the edge. */
export const NOTCH_MAX = 0.14;
export const NOTCH_MIN_PX = 1.5 * HAND_RESOLUTION_PX;
export const NOTCH_SQUARE_DEG = 40;
/** An end lands on the outline within this share of the piece's size (and at least `NEAR_PX` of the hand's). */
export const EDGE_TOL = 0.04;
/** A dart is narrow: each of its two long sides is at least this many times its base — and its point is at least this many bases deep. */
export const DART_NARROW = 1.8;
export const DART_DEEP = 1.5;
/** A V's point is at most this many degrees wide. */
export const DART_APEX_DEG = 50;
/** A dart is at least this share of the piece's size deep, at most this share. */
export const DART_SIZE = [0.12, 0.7] as const;
/** A seam allowance stands off this share of the piece's size, at least and at most, and evenly: its widest and narrowest stand within this share of the mean. */
export const SEAM_OFF = [0.02, 0.25] as const;
export const SEAM_EVEN = 0.6;
/** …and at least this many of the hand's pixels. */
export const SEAM_MIN_PX = 6;
/** What each kind of evidence for a pattern piece — a thing a flowchart or a card lacks — is worth to the reading's confidence, as the chance it alone settles it; a second notch counts half, and further ones nothing. */
export const EVIDENCE = { grain: 0.6, fold: 0.5, dart: 0.4, notch: 0.3, notch2: 0.15, seam: 0.3 } as const;
/** With no evidence at all, a piece is this share as sure a pattern piece as its outline makes it; evidence carries the rest. */
export const PLAIN_SHARE = 0.2;

const MAX = MAX_TIER0_CONFIDENCE;
const DEG = 180 / Math.PI;

// ===== The reading's own shapes =====

/** Where a mark stands on a piece: the side of its outline and how far along it (0–1). */
export interface OnEdge {
  side: number;
  at: number;
  point: Point;
}

/** Everything the notation says of a mark, beside the symbol every notation reads. */
export interface GarmentMark extends NotationSymbol {
  symbol: GarmentSymbolName;
  /** The piece it is on (the inner outline, when a piece has a seam allowance). Unset for a piece. */
  piece?: string;
  /** A piece's own corners, in order — its outline reduced to straight sides. */
  corners?: Point[];
  /** A piece's cutting line, when it has one: the outline standing off it (a `seam` mark's stroke). */
  seam?: string;
  /** A grain line's or a fold's shaft, tip to tip, and its heading in degrees clockwise from level, 0–180. */
  from?: Point;
  to?: Point;
  heading?: number;
  /** A grain line: the side of the piece it runs parallel to, when one — else on the bias. A fold: the side it is along. */
  along?: number;
  /** A notch: where it stands; its length. A dart: where its base stands. */
  edge?: OnEdge;
  length?: number;
  /** A dart: its base's two ends, its point, how wide it stands at the edge, and how far in it reaches. */
  base?: [Point, Point];
  apex?: Point;
  width?: number;
  depth?: number;
  /** A seam allowance: how far it stands off the piece, on average, and how unevenly (widest less narrowest, over the mean). */
  offset?: number;
  spread?: number;
  /** The writing inside a piece, which is its name. */
  name?: { text?: string; ids: string[]; unread: string[] };
}

/** What a scope is as a garment pattern piece. */
export interface GarmentReading extends NotationReading {
  symbols: GarmentMark[];
  /** The pieces' ids, in the scope's order. */
  pieces: string[];
  /** What made it a pattern piece rather than shapes and lines, each with how much it counted. */
  evidence: { what: string; weight: number }[];
}

// ===== Geometry =====

const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;
const cross = (a: Point, b: Point) => a.x * b.y - a.y * b.x;
const len = (a: Point) => Math.hypot(a.x, a.y);
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const unit = (a: Point): Point => {
  const l = len(a);
  return l > 1e-12 ? { x: a.x / l, y: a.y / l } : { x: 1, y: 0 };
};
const sizeOf = (b: Bounds) => Math.max(b.maxX - b.minX, b.maxY - b.minY);
const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const pct = (x: number) => `${Math.round(x * 100)}%`;
const px = (x: number) => `${Math.round(x)} px`;
/** The angle between two directions, in degrees, 0–90: a line has no sense. */
const between = (a: Point, b: Point) => Math.acos(Math.min(1, Math.abs(dot(unit(a), unit(b))))) * DEG;

/** A closed outline's points as a ring to measure against. */
const ringOf = (pts: readonly Point[]): Point[] => (pts.length && dist(pts[0], pts[pts.length - 1]) > 1e-9 ? [...pts, pts[0]] : [...pts]);

function pathLength(pts: readonly Point[]): number {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += dist(pts[i - 1], pts[i]);
  return s;
}

/** Douglas–Peucker on an open polyline: the points that keep it within `tol` of what was drawn. */
export function simplify(pts: readonly Point[], tol: number): Point[] {
  if (pts.length < 3) return pts.map((p) => ({ x: p.x, y: p.y }));
  const keep = new Array<boolean>(pts.length).fill(false);
  keep[0] = keep[pts.length - 1] = true;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop()!;
    let far = -1, worst = tol;
    const ab = sub(pts[j], pts[i]), L = len(ab);
    for (let k = i + 1; k < j; k++) {
      const d = L > 1e-12 ? Math.abs(cross(ab, sub(pts[k], pts[i]))) / L : dist(pts[k], pts[i]);
      if (d > worst) (worst = d, (far = k));
    }
    if (far >= 0) {
      keep[far] = true;
      stack.push([i, far], [far, j]);
    }
  }
  return pts.filter((_, k) => keep[k]).map((p) => ({ x: p.x, y: p.y }));
}

/**
 * A closed outline reduced to its corners: the hull's two anchors are the point
 * farthest from its middle — a corner, where a side's own middle is not — and
 * the point farthest from that one, each run between them simplified; and a
 * corner the outline turns less than `STRAIGHT_TURN` degrees at is no corner.
 */
export const STRAIGHT_TURN = 15;
export function cornersOfRing(hull: readonly Point[], tol: number): Point[] {
  if (hull.length < 4) return hull.map((p) => ({ x: p.x, y: p.y }));
  const c = { x: hull.reduce((a, p) => a + p.x, 0) / hull.length, y: hull.reduce((a, p) => a + p.y, 0) / hull.length };
  let i = 0;
  for (let n = 1; n < hull.length; n++) if (dist(c, hull[n]) > dist(c, hull[i])) i = n;
  let k = i;
  for (let n = 0; n < hull.length; n++) if (dist(hull[i], hull[n]) > dist(hull[i], hull[k])) k = n;
  const ring = [...hull.slice(i), ...hull.slice(0, i)];
  const j = (k - i + hull.length) % hull.length;
  const a = simplify(ring.slice(0, j + 1), tol);
  const b = simplify([...ring.slice(j), ring[0]], tol);
  let out = [...a, ...b.slice(1, -1)];
  for (let again = true; again && out.length > 3; ) {
    again = false;
    for (let n = 0; n < out.length; n++) {
      const p = out[(n + out.length - 1) % out.length], q = out[n], r = out[(n + 1) % out.length];
      const turn = Math.acos(Math.max(-1, Math.min(1, dot(unit(sub(q, p)), unit(sub(r, q)))))) * DEG;
      if (turn < STRAIGHT_TURN) {
        out = out.filter((_, m) => m !== n);
        again = true;
        break;
      }
    }
  }
  return out;
}

/** Where a point stands on a polygon: the side nearest it, how far along, and the nearest point on it. */
export function onEdge(p: Point, corners: readonly Point[]): OnEdge {
  let best: OnEdge = { side: 0, at: 0, point: corners[0] };
  let d = Infinity;
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i], b = corners[(i + 1) % corners.length];
    const ab = sub(b, a), l2 = dot(ab, ab);
    const t = l2 > 0 ? Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2)) : 0;
    const q = { x: a.x + ab.x * t, y: a.y + ab.y * t };
    if (dist(p, q) < d) (d = dist(p, q), (best = { side: i, at: t, point: q }));
  }
  return best;
}

/** The unit direction of the outline's own ink where it passes nearest a point. */
function tangentAt(p: Point, ring: readonly Point[]): Point {
  let d = Infinity, t = { x: 1, y: 0 };
  for (let i = 1; i < ring.length; i++) {
    const ab = sub(ring[i], ring[i - 1]), l2 = dot(ab, ab);
    const u = l2 > 0 ? Math.max(0, Math.min(1, dot(sub(p, ring[i - 1]), ab) / l2)) : 0;
    const q = { x: ring[i - 1].x + ab.x * u, y: ring[i - 1].y + ab.y * u };
    if (dist(p, q) < d) (d = dist(p, q), (t = unit(ab)));
  }
  return t;
}

// ===== One open stroke as a line with heads =====

/** A stroke read as a straight shaft with what stands at each end. */
interface Shaft {
  id: string;
  /** Every mark it is drawn with: the stroke, and a head drawn apart. */
  ids: string[];
  /** The tips, tail to tail. */
  a: Point;
  b: Point;
  length: number;
  /** The most any of its points stands off the chord, as a share of its length. */
  dev: number;
  /** Which ends carry a head, and how it was drawn there. */
  heads: { start: 'hook' | 'apart' | null; end: 'hook' | 'apart' | null };
  scale: number;
}

/**
 * A stroke's hooks: at the start when the pen begins on a wing that stands back
 * along the shaft, at the end when it finishes on one — the barb of a head
 * drawn as part of the line. Read on the stroke's own points, in the
 * direction its middle runs, so one stroke with a head at each end is read
 * whole (the shape rung and `headsOf` read the one at the far end). The
 * shaft's tips are the points the pen reached farthest along it.
 */
function hooksOf(pts: readonly Point[], scale: number): { start: boolean; end: boolean; iA: number; iB: number } | null {
  const n = pts.length;
  if (n < 5) return null;
  const cum = [0];
  for (let i = 1; i < n; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]));
  const L = cum[n - 1];
  if (!(L > 0)) return null;
  const at = (share: number) => {
    let i = 0;
    while (i < n - 1 && cum[i] < share * L) i++;
    return i;
  };
  const u = unit(sub(pts[at(0.75)], pts[at(0.25)]));
  const proj = pts.map((p) => dot(sub(p, pts[0]), u));
  let iA = 0, iB = 0;
  for (let i = 1; i < n; i++) {
    if (proj[i] < proj[iA]) iA = i;
    if (proj[i] > proj[iB]) iB = i;
  }
  const hook = Math.max(HOOK_SHARE * L, HOOK_PX * scale);
  return { start: proj[0] - proj[iA] >= hook && iA < iB, end: proj[n - 1] - proj[iB] <= -hook && iA < iB, iA, iB };
}

/** How far the points between two indices stand off the chord between them. */
function deviation(pts: readonly Point[], i: number, j: number): number {
  const a = pts[i], b = pts[j], ab = sub(b, a), L = len(ab);
  if (!(L > 0)) return Infinity;
  let worst = 0;
  for (let k = i; k <= j; k++) worst = Math.max(worst, Math.abs(cross(ab, sub(pts[k], a))) / L);
  return worst / L;
}

function shaftOf(state: SessionState, id: string, node: MMNode, scale: number): Shaft | null {
  const pts = strokePointsOf(node);
  if (!pts || pts.length < 5) return null;
  const L = pathLength(pts);
  if (L < LINE_MIN_PX * scale) return null;
  const hooks = hooksOf(pts, scale);
  const heads = headsOf(state, id);
  const apartAt = (e: 'start' | 'end') => {
    const h = heads?.[e].heads[0];
    return h ? { tip: h.tip, ids: h.ids.filter((x) => x !== id) } : null;
  };
  const sa = apartAt('start'), sb = apartAt('end');
  const start = hooks?.start ? 'hook' : sa ? 'apart' : null;
  const end = hooks?.end ? 'hook' : sb ? 'apart' : null;
  if (!start || !end) return null;
  // The shaft's tips: where the hooked ends' tips are, else the line's own ends (or the head's tip).
  const iA = hooks?.start ? hooks.iA : 0, iB = hooks?.end ? hooks.iB : pts.length - 1;
  const a = start === 'apart' && sa ? sa.tip : pts[iA];
  const b = end === 'apart' && sb ? sb.tip : pts[iB];
  const dev = iB > iA + 2 ? deviation(pts, iA, iB) : Infinity;
  const owned = [...(start === 'apart' && sa ? sa.ids : []), ...(end === 'apart' && sb ? sb.ids : [])];
  return { id, ids: [id, ...owned], a, b, length: dist(a, b), dev, heads: { start, end }, scale };
}

// ===== A piece, before it is read =====

interface Piece {
  outline: Outline;
  id: string;
  pts: Point[];
  ring: Point[];
  hull: Point[];
  size: number;
  short: number;
  long: number;
  scale: number;
  corners: Point[];
  /** Its cutting line, when it has one. */
  seam?: { id: string; outline: Outline; ring: Point[]; offset: number; spread: number; pts: Point[] };
}

const tolOf = (p: Piece) => Math.max(EDGE_TOL * p.size, NEAR_PX * p.scale * 0.5);

/** The largest triangle whose corners are on a hull, as its three points. */
function biggestTriangle(hull: readonly Point[]): [Point, Point, Point] | null {
  const step = Math.max(1, Math.ceil(hull.length / 28));
  const v = hull.filter((_, i) => i % step === 0);
  let best = 0, tri: [Point, Point, Point] | null = null;
  for (let i = 0; i < v.length; i++)
    for (let j = i + 1; j < v.length; j++)
      for (let k = j + 1; k < v.length; k++) {
        const a = Math.abs(cross(sub(v[j], v[i]), sub(v[k], v[i]))) / 2;
        if (a > best) (best = a, (tri = [v[i], v[j], v[k]]));
      }
  return tri;
}

const scaleOf = (n: MMNode): number => (getRep(n, 'stroke')?.data as { scale?: number } | undefined)?.scale ?? 1;

// ===== Reading a scope =====

/**
 * The garment pattern piece a scope makes — the board's content plane when no
 * scope is given — or null when it holds no outline with a grain line, a fold,
 * a notch, a dart or a seam allowance on it. Reads the session and changes
 * nothing in it.
 */
export function readGarment(state: SessionState, scopeIds?: readonly string[]): GarmentReading | null {
  const nodes = state.nodes;
  const { scope, marks } = marksOf(state, scopeIds);
  if (scope.length < 3) return null;

  // 1. What each mark could be: a closed outline, writing, or an open stroke.
  const shut: { id: string; node: MMNode; pts: Point[]; scale: number }[] = [];
  const open: { id: string; node: MMNode; scale: number }[] = [];
  const writing = new Set<string>();
  for (const m of marks) {
    if (isWord(m.node) || transcriptOf(m.node)) {
      writing.add(m.id);
      continue;
    }
    const fp = fingerprintOf(m.node);
    if (!fp) continue;
    if (resemblances(m.node)[0]?.to === 'type:dot') continue;
    const scale = scaleOf(m.node);
    if (fp.isClosed) {
      const pts = strokePointsOf(m.node);
      if (pts && pts.length >= 3) shut.push({ id: m.id, node: m.node, pts, scale });
      continue;
    }
    if (writingOf(m.node)) writing.add(m.id);
    else open.push({ id: m.id, node: m.node, scale });
  }
  // The cheap test before the costly ones: no outline of a piece's size, no piece — and nothing measured but the box.
  const boxOf = (pts: readonly Point[]) => pts.reduce((b, p) => ({ minX: Math.min(b.minX, p.x), maxX: Math.max(b.maxX, p.x), minY: Math.min(b.minY, p.y), maxY: Math.max(b.maxY, p.y) }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  if (!shut.some((c) => sizeOf(boxOf(c.pts)) / c.scale >= PIECE_MIN_PX)) return null;
  const closed: { id: string; node: MMNode; outline: Outline; scale: number }[] = [];
  for (const c of shut) {
    const outline = outlineOf(c.pts);
    if (outline) closed.push({ id: c.id, node: c.node, outline, scale: c.scale });
  }
  const big = closed.filter((c) => sizeOf(c.outline.bounds) / c.scale >= PIECE_MIN_PX);
  if (!big.length) return null;

  // 2. Seam allowances: an outline standing off another the same distance all round. The inner is the piece.
  const area = (c: (typeof big)[number]) => (c.outline.bounds.maxX - c.outline.bounds.minX) * (c.outline.bounds.maxY - c.outline.bounds.minY);
  const bySize = [...big].sort((a, b) => area(b) - area(a));
  const seamOf = new Map<string, { outer: (typeof big)[number]; offset: number; spread: number }>();
  const cutting = new Set<string>();
  for (const inner of bySize) {
    const ipts = strokePointsOf(inner.node) ?? [];
    const isize = inner.outline.size;
    let best: { outer: (typeof big)[number]; offset: number; spread: number } | null = null;
    for (const outer of bySize) {
      if (outer === inner || cutting.has(outer.id) || seamOf.has(outer.id)) continue;
      const ob = outer.outline.bounds, ib = inner.outline.bounds;
      if (!(ob.minX <= ib.minX && ob.minY <= ib.minY && ob.maxX >= ib.maxX && ob.maxY >= ib.maxY)) continue;
      if (!inner.outline.hull.every((p) => outside(p, outer.outline.hull) === 0)) continue;
      const ring = ringOf(strokePointsOf(outer.node) ?? []);
      const step = Math.max(1, Math.floor(ipts.length / 48));
      const ds = ipts.filter((_, i) => i % step === 0).map((p) => distToPath(p, ring));
      if (!ds.length) continue;
      const m = ds.reduce((a, x) => a + x, 0) / ds.length;
      const spread = (Math.max(...ds) - Math.min(...ds)) / (m || 1);
      if (m < Math.max(SEAM_OFF[0] * isize, SEAM_MIN_PX * inner.scale) || m > SEAM_OFF[1] * isize || spread > SEAM_EVEN) continue;
      if (!best || spread < best.spread) best = { outer, offset: m, spread };
    }
    if (best) {
      seamOf.set(inner.id, best);
      cutting.add(best.outer.id);
    }
  }

  // 3. The pieces: the outlines that are no one's cutting line.
  const pieces: Piece[] = bySize
    .filter((c) => !cutting.has(c.id))
    .map((c) => {
      const pts = strokePointsOf(c.node) ?? [];
      const o = c.outline;
      const seam = seamOf.get(c.id);
      const sPts = seam ? (strokePointsOf(seam.outer.node) ?? []) : [];
      return {
        outline: c.outline, id: c.id, pts, ring: ringOf(pts), hull: o.hull, size: o.size, scale: c.scale,
        short: o.frame ? o.frame.short : o.size, long: o.frame ? o.frame.long : o.size,
        corners: cornersOfRing(o.hull, 0.03 * o.size),
        ...(seam ? { seam: { id: seam.outer.id, outline: seam.outer.outline, ring: ringOf(sPts), offset: seam.offset, spread: seam.spread, pts: sPts } } : {}),
      };
    });
  const scopeOrder = new Map(scope.map((id, i) => [id, i]));
  pieces.sort((a, b) => (scopeOrder.get(a.id) ?? 0) - (scopeOrder.get(b.id) ?? 0));
  const held = (p: Point, pc: Piece) => outside(p, pc.hull) <= 0.03 * pc.size;
  const smallest = (fits: (pc: Piece) => boolean): Piece | undefined => pieces.filter(fits).sort((a, b) => a.size - b.size)[0];

  const symbols: GarmentMark[] = [];
  const owned = new Set<string>();
  const taken = new Set<string>();
  const mark = (pc: Piece, symbol: GarmentSymbolName, ids: string[], id: string, confidence: number, reason: string, outline: Point[], extra: Partial<GarmentMark>) => {
    ids.forEach((x) => taken.add(x));
    const box = outline.reduce((b, p) => ({ minX: Math.min(b.minX, p.x), maxX: Math.max(b.maxX, p.x), minY: Math.min(b.minY, p.y), maxY: Math.max(b.maxY, p.y) }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
    symbols.push({
      id, ids, symbol, role: GARMENT_TABLE.symbols[symbol].role as Role, confidence, reason,
      readings: [{ symbol, role: GARMENT_TABLE.symbols[symbol].role as Role, confidence, reason }],
      outline, bounds: box, ports: [], labels: [], piece: pc.id, ...extra,
    });
  };

  // 4. Lines with a head at each end: a fold along an edge, else a grain line inside the piece.
  const shafts: Shaft[] = [];
  const rest: typeof open = [];
  for (const o of open) {
    const sh = shaftOf(state, o.id, o.node, o.scale);
    if (sh && sh.dev <= STRAIGHT_DEV) shafts.push(sh);
    else rest.push(o);
  }
  const folds = new Set<string>();
  for (const sh of shafts) {
    const dir = sub(sh.b, sh.a);
    const heading = ((Math.atan2(dir.y, dir.x) * DEG) % 180 + 180) % 180;
    // A fold: along an edge, parallel, close, and spanning most of it.
    let fold: { pc: Piece; edge: OnEdge; d: number } | null = null;
    for (const pc of pieces) {
      const near = Math.max(FOLD_NEAR * pc.short, NEAR_PX * pc.scale);
      const samples = [0, 0.25, 0.5, 0.75, 1].map((t) => ({ x: sh.a.x + dir.x * t, y: sh.a.y + dir.y * t }));
      const ds = samples.map((p) => distToPath(p, pc.ring));
      if (Math.max(...ds) > near) continue;
      const m = onEdge(mid(sh.a, sh.b), pc.corners);
      const edge = sub(pc.corners[(m.side + 1) % pc.corners.length], pc.corners[m.side]);
      if (between(dir, edge) > PARALLEL_DEG) continue;
      const u = unit(dir);
      const proj = pc.hull.map((p) => dot(p, u));
      if (sh.length < FOLD_SPAN * (Math.max(...proj) - Math.min(...proj))) continue;
      if (!fold || Math.max(...ds) < fold.d) fold = { pc, edge: m, d: Math.max(...ds) };
    }
    if (fold) {
      const conf = MAX * (0.95 - 2 * sh.dev) * (sh.heads.start === 'hook' && sh.heads.end === 'hook' ? 0.9 : 1);
      mark(fold.pc, 'fold', sh.ids, sh.id, conf, `a line with a head at each end, ${px(fold.d)} off the ${fold.edge.side + 1 === 1 ? 'first' : `${fold.edge.side + 1}th`} side and along it — that edge is cut on the fold`, [sh.a, sh.b], { from: sh.a, to: sh.b, heading, along: fold.edge.side, edge: fold.edge, length: sh.length });
      folds.add(sh.id);
      sh.ids.forEach((x) => owned.add(x));
      continue;
    }
    const pc = smallest((p) => held(sh.a, p) && held(sh.b, p) && held(mid(sh.a, sh.b), p));
    if (!pc || sh.length < Math.max(LINE_MIN_PX * sh.scale, GRAIN_SHARE * pc.long)) continue;
    // Parallel to a side of the piece, or on the bias.
    const sides = pc.corners.map((c, i) => between(dir, sub(pc.corners[(i + 1) % pc.corners.length], c)));
    const nearest = sides.indexOf(Math.min(...sides));
    const along = sides[nearest] <= PARALLEL_DEG ? nearest : undefined;
    const conf = MAX * (0.95 - 2 * sh.dev) * (sh.heads.start === 'hook' && sh.heads.end === 'hook' ? 0.9 : 1);
    const how = along !== undefined ? `parallel to the ${along + 1 === 1 ? 'first' : `${along + 1}th`} side` : 'on the bias';
    mark(pc, 'grain', sh.ids, sh.id, conf, `a straight line with a head at each end, ${pct(sh.length / pc.long)} of the piece's length, ${how}`, [sh.a, sh.b], { from: sh.a, to: sh.b, heading, ...(along !== undefined ? { along } : {}), length: sh.length });
    sh.ids.forEach((x) => owned.add(x));
  }

  // 5. Darts and notches among what is left: by where they stand on an outline.
  const rings = (pc: Piece) => (pc.seam ? [pc.ring, pc.seam.ring] : [pc.ring]);
  for (const o of rest) {
    if (owned.has(o.id)) continue;
    const pts = strokePointsOf(o.node) ?? [];
    if (pts.length < 3) continue;
    const L = pathLength(pts);
    if (L / o.scale < NOTCH_MIN_PX) continue;
    // A V of one stroke: two ends on the outline, a point inside.
    const v = simplify(pts, 0.05 * L);
    if (v.length === 3) {
      const [p0, apex, p1] = v;
      const base = dist(p0, p1), l0 = dist(p0, apex), l1 = dist(p1, apex);
      const angle = Math.acos(Math.max(-1, Math.min(1, dot(unit(sub(p0, apex)), unit(sub(p1, apex)))))) * DEG;
      const pc = smallest((p) => held(apex, p) && distToPath(p0, p.ring) <= tolOf(p) && distToPath(p1, p.ring) <= tolOf(p));
      const depth = pc ? dist(apex, mid(p0, p1)) : 0;
      if (pc && angle <= DART_APEX_DEG && Math.min(l0, l1) >= DART_NARROW * base && depth >= DART_DEEP * base && depth >= DART_SIZE[0] * pc.size && depth <= DART_SIZE[1] * pc.size && Math.max(l0, l1) <= 1.5 * Math.min(l0, l1)) {
        const edge = onEdge(mid(p0, p1), pc.corners);
        mark(pc, 'dart', [o.id], o.id, MAX * 0.85, `a V of one stroke, its ends ${px(base)} apart on the outline and its point ${px(depth)} inside — a wedge from the edge`, [p0, p1, apex], { base: [p0, p1], apex, width: base, depth, edge });
        owned.add(o.id);
        continue;
      }
    }
    // A notch: a short straight tick across the outline, or ending on it, and square to it.
    const chord = dist(pts[0], pts[pts.length - 1]);
    for (const pc of pieces.filter((p) => L <= NOTCH_MAX * p.size)) {
      const e0 = pts[0], e1 = pts[pts.length - 1];
      let hit: { ring: Point[]; at: Point; d: number } | null = null;
      for (const ring of rings(pc)) {
        const hull = ring === pc.ring ? pc.hull : pc.seam!.outline.hull;
        const d0 = distToPath(e0, ring), d1 = distToPath(e1, ring);
        const crosses = (outside(e0, hull) === 0) !== (outside(e1, hull) === 0);
        const d = crosses ? 0 : Math.min(d0, d1);
        if (d > tolOf(pc)) continue;
        if (!hit || d < hit.d) hit = { ring, at: d0 <= d1 ? e0 : e1, d };
      }
      if (!hit || chord < 0.8 * L || deviation(pts, 0, pts.length - 1) > 0.15) continue;
      const tick = sub(e1, e0);
      const anchor = hit.d === 0 ? mid(e0, e1) : hit.at;
      if (between(tick, tangentAt(anchor, hit.ring)) < NOTCH_SQUARE_DEG) continue;
      const edge = onEdge(anchor, pc.corners);
      mark(pc, 'notch', [o.id], o.id, MAX * 0.8, `a tick ${px(L)} long ${hit.d === 0 ? 'across' : 'on'} the outline and square to it — a mark to match`, [e0, e1], { edge, length: L, from: e0, to: e1 });
      owned.add(o.id);
      break;
    }
  }
  // Closed marks: a wedge from an edge is a dart, a small one on the outline a notch.
  for (const c of closed) {
    if (owned.has(c.id)) continue;
    const pts = strokePointsOf(c.node) ?? [];
    const tri = biggestTriangle(c.outline.hull);
    if (!tri || c.outline.three < 0.75) continue;
    const sides = [[tri[0], tri[1], tri[2]], [tri[1], tri[2], tri[0]], [tri[2], tri[0], tri[1]]] as const;
    const [b0, b1, apex] = [...sides].sort((p, q) => dist(p[0], p[1]) - dist(q[0], q[1]))[0];
    const base = dist(b0, b1), l0 = dist(b0, apex), l1 = dist(b1, apex), depth = dist(apex, mid(b0, b1));
    const size = c.outline.size;
    const pc = smallest((p) => size < p.size && held(apex, p) && (p.seam ? [p.ring, p.seam.ring] : [p.ring]).some((r) => distToPath(b0, r) <= tolOf(p) && distToPath(b1, r) <= tolOf(p)));
    if (pc && Math.min(l0, l1) >= DART_NARROW * base && depth >= DART_DEEP * base && depth >= DART_SIZE[0] * pc.size && depth <= DART_SIZE[1] * pc.size) {
      const edge = onEdge(mid(b0, b1), pc.corners);
      mark(pc, 'dart', [c.id], c.id, MAX * 0.85, `a narrow wedge, its base ${px(base)} wide on the outline and its point ${px(depth)} inside`, [b0, b1, apex], { base: [b0, b1], apex, width: base, depth, edge });
      owned.add(c.id);
      continue;
    }
    // A small wedge standing on the outline: a notch cut in the edge.
    const centre = centreOf(c.outline.bounds);
    const home = pieces.find((p) => size <= NOTCH_MAX * p.size && rings(p).some((r) => distToPath(centre, r) <= tolOf(p)));
    if (home && pts.length) {
      const edge = onEdge(centre, home.corners);
      mark(home, 'notch', [c.id], c.id, MAX * 0.7, `a small wedge ${px(size)} across, on the outline — a notch`, hullOf(pts), { edge, length: size });
      owned.add(c.id);
    }
  }

  // 6. Each piece's own marks, its seam allowance among them.
  const out: GarmentMark[] = [];
  const evidence: { what: string; weight: number }[] = [];
  for (const pc of pieces) {
    // An outline taken as a dart, or as a notch, is a mark on a piece and not one.
    if (taken.has(pc.id)) continue;
    const own = symbols.filter((s) => s.piece === pc.id);
    if (!own.length && !pc.seam) continue;
    const words = ownWords(nodes, [pc.id]);
    out.push({
      id: pc.id, ids: [pc.id], symbol: 'piece', role: GARMENT_TABLE.symbols.piece.role as Role,
      confidence: MAX * 0.9, reason: `a closed outline ${px(pc.size / pc.scale)} across, with ${own.length + (pc.seam ? 1 : 0) === 1 ? 'a mark' : `${countWord(own.length + (pc.seam ? 1 : 0))} marks`} on it`,
      readings: [{ symbol: 'piece', role: GARMENT_TABLE.symbols.piece.role as Role, confidence: MAX * 0.9, reason: 'a closed outline' }],
      outline: pc.hull.map((p) => ({ x: p.x, y: p.y })), bounds: { ...pc.outline.bounds }, ports: [], labels: [],
      corners: pc.corners, ...(pc.seam ? { seam: pc.seam.id } : {}), ...(words ? { text: words } : {}), name: { ids: [], unread: [] },
    });
    if (pc.seam) {
      const s = pc.seam;
      const reason = `an outline ${px(s.offset)} off the piece all round (${pct(s.spread)} between its widest and narrowest) — the cutting line, the seam allowance between`;
      taken.add(s.id);
      out.push({
        id: s.id, ids: [s.id], symbol: 'seam', role: GARMENT_TABLE.symbols.seam.role as Role, confidence: MAX * (1 - s.spread / 2),
        reason, readings: [{ symbol: 'seam', role: GARMENT_TABLE.symbols.seam.role as Role, confidence: MAX * (1 - s.spread / 2), reason }],
        outline: s.outline.hull.map((p) => ({ x: p.x, y: p.y })), bounds: { ...s.outline.bounds }, ports: [], labels: [],
        piece: pc.id, offset: s.offset, spread: s.spread,
      });
    }
    out.push(...own);
  }
  if (!out.some((s) => s.symbol !== 'piece')) return null;

  // 7. Writing inside a piece is its name, beside it a weaker label.
  const pieceMarks = out.filter((s) => s.symbol === 'piece');
  const heldOwned = new Set([...owned, ...taken]);
  for (const s of pieceMarks) heldOwned.add(s.id);
  const labels: NotationLabel[] = labelWriting(nodes, {
    marks,
    writing,
    symbols: pieceMarks.map((s) => ({ id: s.id, symbol: s.symbol, bounds: s.bounds, outline: s.outline, labels: s.labels })),
    connectors: [],
    owned: heldOwned,
    role: GARMENT_TABLE.label.role as Role,
  });
  for (const s of pieceMarks) {
    const inside = labels.filter((l) => l.of === s.id && l.where === 'inside');
    const said = inside.map((l) => l.text).filter((t): t is string => !!t);
    s.name = { ...(s.text || said.length ? { text: [s.text, ...said].filter(Boolean).join(' ') } : {}), ids: inside.map((l) => l.id), unread: inside.filter((l) => !l.text).map((l) => l.id) };
  }

  // 8. Roles: what every mark in the scope plays — one of the six.
  const { roles, weight, unplaced } = rolesOf(
    scope,
    (put) => {
      for (const s of out) for (const id of s.ids) put(id, s.role, 1);
      for (const l of labels) put(l.id, l.role, l.where === 'alone' ? 0.5 : 1);
    },
    new Map()
  );

  // 9. Is it a pattern piece, and how surely.
  const count = (name: GarmentSymbolName) => out.filter((s) => s.symbol === name).length;
  const grains = count('grain'), foldsN = count('fold'), notches = count('notch'), darts = count('dart'), seams = count('seam');
  const evi: { what: string; weight: number }[] = evidence;
  if (grains) evi.push({ what: grains === 1 ? 'a grain line' : `${countWord(grains)} grain lines`, weight: 1 - (1 - EVIDENCE.grain) ** grains });
  if (foldsN) evi.push({ what: foldsN === 1 ? 'a fold' : `${countWord(foldsN)} folds`, weight: 1 - (1 - EVIDENCE.fold) ** foldsN });
  if (darts) evi.push({ what: darts === 1 ? 'a dart' : `${countWord(darts)} darts`, weight: 1 - (1 - EVIDENCE.dart) ** darts });
  if (notches) evi.push({ what: notches === 1 ? 'a notch' : `${countWord(notches)} notches`, weight: EVIDENCE.notch + (notches > 1 ? EVIDENCE.notch2 : 0) });
  if (seams) evi.push({ what: seams === 1 ? 'a seam allowance' : `${countWord(seams)} seam allowances`, weight: EVIDENCE.seam });
  const settled = 1 - evi.reduce((p, e) => p * (1 - e.weight), 1);
  const coverage = scope.reduce((a, id) => a + (weight[id] ?? 0), 0) / scope.length;
  const sure = out.reduce((a, s) => a + s.confidence, 0) / out.length / MAX;
  const confidence = MAX * Math.sqrt(coverage) * sure * (PLAIN_SHARE + (1 - PLAIN_SHARE) * settled);
  if (!(confidence > 0)) return null;

  const names = pieceMarks.map((s) => s.name?.text).filter(Boolean);
  const said = (n: number, one: string, many: string) => `${countWord(n)} ${n === 1 ? one : many}`;
  const on = [
    grains ? said(grains, 'grain line', 'grain lines') : '',
    foldsN ? said(foldsN, 'fold', 'folds') : '',
    notches ? said(notches, 'notch', 'notches') : '',
    darts ? said(darts, 'dart', 'darts') : '',
    seams ? 'a seam allowance' : '',
  ].filter(Boolean);
  const summary = `${said(pieceMarks.length, 'piece', 'pieces')}${on.length ? `: ${on.join(', ')}` : ''}`;
  const counts: Record<string, number> = { piece: pieceMarks.length, grain: grains, fold: foldsN, notch: notches, dart: darts, seam: seams, word: labels.filter((l) => l.where === 'inside').length };
  const reason = [
    `read as a pattern piece for ${evi.map((e) => e.what).join(' and ')}`,
    names.length ? `named ${names.join(', ')}` : '',
    unplaced.length ? `${countWord(unplaced.length)} mark${unplaced.length === 1 ? '' : 's'} it places nowhere` : '',
  ].filter(Boolean).join(', ');

  // In the scope's own order.
  const first = (s: GarmentMark) => Math.min(...s.ids.map((id) => scopeOrder.get(id) ?? Infinity));
  out.sort((a, b) => first(a) - first(b));
  labels.sort((p, q) => (scopeOrder.get(p.id) ?? 0) - (scopeOrder.get(q.id) ?? 0));

  return {
    notation: 'garment',
    name: GARMENT_TABLE.name,
    confidence,
    summary,
    reason: `${summary} — ${reason}`,
    symbols: out,
    connectors: [],
    labels,
    roles,
    unplaced,
    counts,
    pieces: pieceMarks.map((s) => s.id),
    evidence: evi,
  };
}

// ===== The notation =====

export const GARMENT: Notation = {
  id: 'garment',
  name: GARMENT_TABLE.name,
  describes: GARMENT_TABLE.describes,
  symbols: SYMBOLS.map((name) => ({ name, role: GARMENT_TABLE.symbols[name].role as Role, describes: GARMENT_TABLE.symbols[name].describes, ports: 'none — a mark on the outline, not a place a line is tied' })),
  connectors: [],
  read: (state, scopeIds) => readGarment(state, scopeIds),
};

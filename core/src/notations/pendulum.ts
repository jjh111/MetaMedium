// The pendulum (MATHS-SPEC §8 Lane D, M23; Chalktalk's road, V1-SPEC RN4's first runner).
//
// What a drafter of physics draws, read from ink:
//
//   - **rod** — a straight line, the pendulum's length.
//   - **bob** — a ring, or a spot scribbled solid, at the rod's one end: the rod
//     points at its centre and stops at its edge or goes into it.
//   - **what it hangs from** — at the rod's other end, in order of how much it is
//     worth: a *ceiling* (a level line the rod hangs from the middle of) with
//     *hatching* above it (three or more short strokes leaning together, on the
//     side away from the bob), a *dot* on the rod's top end, or *the rod's top end
//     alone*.
//
// **A pendulum hangs.** The bob is below its pivot, within `MAX_ANGLE_DEG` of
// plumb — a bob above its pivot is a tree, a lollipop, a stick figure's head, not
// a pendulum, and a bob read from a rod that ends on another ring of its own
// size is a bond between two circles, the molecule's. The pivot end is FREE: it
// lands on a ceiling, a dot or nothing, never on a box or a ring it would join.
//
// **Its confidence is its evidence**, as the garment piece's is (garment.ts): a
// rod and a bob that hang are a pendulum only as surely as `PLAIN_SHARE` of
// what the pivot adds — so a rod and a ring with nothing at the rod's top are
// held (the field's Play is still offered, quietly) but under the floor, and a
// ceiling, its hatching or a dot take it above. A reading says what it saw in
// the person's words: *a rod from a pivot, a bob, drawn 20° from plumb*.
//
// **The six roles hold**: the bob a node, the rod an edge, whatever it hangs
// from an annotation, writing beside the rod a label. Derived like every notation
// — nothing enters the log — and `readPendulum` is the one reading; the runner
// below (the first one registered, `run/builtin.ts`) reads the same marks and
// carries what the physics needs: the pivot, the bob's centre, the angle from
// plumb and the length in px.

import type { Bounds, Point } from '../types';
import type { MMNode } from '../session/nodes';
import { boundsOf, fingerprintOf, getRep, isWord, resemblances, strokePointsOf, transcriptOf } from '../session/nodes';
import type { Role } from '../diagram/roles';
import { MAX_TIER0_CONFIDENCE } from '../recognition';
import type { Notation, NotationLabel, NotationReading, NotationSymbol } from './notation';
import { countWord, labelWriting, rolesOf } from './graph-kit';
import { dist, hullOf, perimeterOf, tightBox } from './shape';
import { numbersOf } from '../maths/dimension';
import type { BoardNumber } from '../maths/dimension';
import { convertQuantity, formatNumber } from '../maths/quantity';
import type { BoardMaths } from '../maths/solve';
import { GRAVITY, PENDULUM_DT, pendulumEnergy, pendulumPeriod, pendulumStart, pendulumStep, smallAnglePeriod } from '../physics/pendulum';
import type { PendulumState } from '../physics/pendulum';
import type { RunBoard, RunInputs, RunPlacement, RunReadout, RunReading, Runner } from '../run/runner';
import { runQuantity } from '../run/runner';

// ===== The table — the pendulum's content =====

/**
 * The pendulum's content: its symbols, each with the role it plays and how it looks. Content, not
 * code, and this is its single home; what stays code is what a signature cannot see — a rod is a
 * line that hangs, and the shape rung knows nothing of down.
 */
export const PENDULUM_TABLE = {
  notation: 'pendulum',
  name: 'Pendulum',
  describes: 'a rod hung from a pivot with a bob at its end',
  symbols: {
    rod: { role: 'edge', describes: 'a straight line from the pivot to the bob: the pendulum’s length', one: 'rod', many: 'rods' },
    bob: { role: 'node', describes: 'a ring, or a spot filled solid, at the rod’s lower end', one: 'bob', many: 'bobs' },
    ceiling: { role: 'annotation', describes: 'a level line the rod hangs from', one: 'ceiling', many: 'ceilings' },
    hatching: { role: 'annotation', describes: 'short strokes leaning together above the ceiling: it is solid', one: 'hatching', many: 'hatchings' },
    dot: { role: 'annotation', describes: 'a small dot on the rod’s top end: the pivot', one: 'dot', many: 'dots' },
  },
  label: { role: 'label', describes: 'writing beside the rod: its length', one: 'word', many: 'words' },
} as const;

export type PendulumSymbolName = keyof typeof PENDULUM_TABLE.symbols;
const SYMBOLS = Object.keys(PENDULUM_TABLE.symbols) as PendulumSymbolName[];

// ===== Thresholds — this notation's own; the hand's are cited =====

/** A rod is at least this long in the hand's space (screen pixels)… */
export const ROD_MIN_PX = 60;
/** …and straight: no point of it stands off its chord by more than this share of its length — or, for a short stroke, a hand's own bow of this many of its pixels. */
export const STRAIGHT_DEV = 0.07;
export const STRAIGHT_BOW_PX = 6;
/** The shape rung's own straightness (chord over path) a stroke must show before it is measured at all: a short tick bows as far as a long line does, and reads as little as this. */
export const STRAIGHT_MIN = 0.7;
/** A bob is at least this across in the hand's space, and no more than this share of the pivot-to-bob length across; at least this share. */
export const BOB_MIN_PX = 12;
export const BOB_MAX_OF_LENGTH = 0.9;
export const BOB_MIN_OF_LENGTH = 0.04;
/** A ring is as round as the rung says: at least this surely a circle. */
export const BOB_CIRCLE_MIN = 0.35;
/** A spot filled solid is compact (its tightest box, long over short, no more than this) and dense (its ink runs this many times round its hull). */
export const SPOT_ASPECT = 1.7;
export const SPOT_DENSE = 1.6;
/** The rod's end is on the bob when within this share of the bob's radius past its edge, and at least `TOUCH_PX` of the hand's. */
export const TOUCH_SHARE = 0.4;
export const TOUCH_PX = 8;
/** The rod points at the bob's centre: the centre stands off the rod's line by no more than this share of the bob's radius (and `AIM_PX`). */
export const AIM_SHARE = 0.65;
export const AIM_PX = 3;
/** The far end of the rod is clear of the bob: at least this many radii from its centre. */
export const CLEAR_RADII = 1.2;
/** A pendulum hangs within this many degrees of plumb: full to the first, none by the second. */
export const HANG_DEG = [70, 100] as const;
/** A rod drawn within this many degrees of plumb hangs plumb. */
export const PLUMB_DEG = 1.5;
/** A ceiling — as short as a hatched stub — is level within this many degrees, at least this long in the hand's space and this share of the rod. */
export const CEILING_LEVEL_DEG = 20;
export const CEILING_MIN_PX = 36;
export const CEILING_SHARE = 0.2;
/** The rod hangs from a ceiling when its top end is within this share of the ceiling's length of it (and `TOUCH_PX`), and its projection falls inside the ceiling's span grown by this share each side. */
export const CEILING_TOUCH = 0.05;
export const CEILING_SPAN_SLACK = 0.1;
/** Hatching: strokes this short (at least this many of the hand's pixels, at most this share of the ceiling), leaning together within this many degrees, at least this many degrees off the ceiling, within this share of the rod's length of it. At least `HATCH_MIN` of them. */
export const HATCH_LEN_MIN_PX = 8;
export const HATCH_MAX_OF_CEILING = 0.45;
export const HATCH_ALIGN_DEG = 28;
export const HATCH_OFF_CEILING_DEG = 25;
export const HATCH_BAND = 0.3;
export const HATCH_MIN = 3;
/** A dot on the rod's top end is small beside the bob (this share of its size at most, and at most this many of the hand's pixels) and its centre within its own size of the end. */
export const DOT_OF_BOB = 0.55;
export const DOT_MAX_PX = 28;
export const DOT_TINY_PX = 16;
/** The pivot end is free: it lands on no ring this share of the bob’s size or more, and no closed shape this share of the pendulum's length across both ways. */
export const BOND_OF_BOB = 0.5;
export const BLOCK_OF_LENGTH = 0.4;
/** What each thing the rod hangs from is worth to the reading, as the chance it alone settles it; the rod's top end alone is worth this much. */
export const EVIDENCE = { ceiling: 0.75, hatching: 0.5, dot: 0.7, bare: 0.15 } as const;
/** With no pivot drawn, a pendulum is this share as sure as what the pivot adds carries the rest. */
export const PLAIN_SHARE = 0.2;
/** The least a pendulum is worth offering Play for (a bare rod and a ring are held, under the floor, and still swing). */
export const PENDULUM_OFFER_FLOOR = 0.2;
/** The run's own tuning. */
export const PENDULUM_MAX_STEPS = 1_800_000;
/** Pulled aside, a pendulum is turned this far from plumb. */
export const PULL_ASIDE_DEG = 20;

const MAX = MAX_TIER0_CONFIDENCE;
const DEG = 180 / Math.PI;

// ===== The reading's own shapes =====

export type PivotKind = 'hatched ceiling' | 'ceiling' | 'dot' | 'the rod’s top end';

/** One pendulum, as the physics and the surface need it: everything in canvas units. */
export interface PendulumPart {
  /** The rod's stroke: what a clock stands on and the run's quantities are named by. */
  rod: string;
  bob: string;
  /** Where it hangs from: the rod's top end. */
  pivot: Point;
  /** The bob's centre as drawn, its radius, and the pivot-to-bob distance. */
  bobAt: Point;
  bobRadius: number;
  length: number;
  /** The angle from plumb, radians, positive to the right (the bob right of its pivot). */
  theta: number;
  plumb: boolean;
  pivotKind: PivotKind;
  ceiling?: string;
  hatching: string[];
  dot?: string;
  /** Every mark it is drawn with, rod first. */
  marks: string[];
  /** Where the rod and the bob stand now, their bounds' centres: what a run turns them about the pivot from. */
  centres: Record<string, Point>;
  confidence: number;
  /** The hand's scale at the rod (world units per screen pixel). */
  scale: number;
  reason: string;
}

export interface PendulumReading extends NotationReading {
  pendulums: PendulumPart[];
  evidence: { what: string; weight: number }[];
}

// ===== Geometry =====

const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const len = (a: Point) => Math.hypot(a.x, a.y);
const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const centreOf = (b: Bounds): Point => ({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 });
const sizeOf = (b: Bounds) => Math.max(b.maxX - b.minX, b.maxY - b.minY);
const px = (x: number) => `${Math.round(x)} px`;
const ramp01 = (v: number, lo: number, hi: number) => Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
const scaleOf = (n: MMNode): number => (getRep(n, 'stroke')?.data as { scale?: number } | undefined)?.scale ?? 1;

function pathLength(pts: readonly Point[]): number {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += dist(pts[i - 1], pts[i]);
  return s;
}

/** The distance from a point to a segment. */
function distToSegment(p: Point, a: Point, b: Point): number {
  const ab = sub(b, a), l2 = ab.x * ab.x + ab.y * ab.y;
  if (l2 < 1e-12) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / l2));
  return Math.hypot(p.x - (a.x + t * ab.x), p.y - (a.y + t * ab.y));
}

/** A stroke read as a straight line: its two tips (the points the pen reached farthest along it), its length and how far it bows. */
interface Straight {
  id: string;
  node: MMNode;
  a: Point;
  b: Point;
  length: number;
  /** The most any point stands off the chord, as a share of its length. */
  dev: number;
  scale: number;
}

function straightOf(id: string, node: MMNode, pts: readonly Point[], scale: number): Straight | null {
  if (pts.length < 3) return null;
  // The line's axis is the chord between the two points farthest from each other (the farthest from the first, then the farthest from that);
  // its tips are the points the pen reached farthest along that axis, whatever hook it left at liftoff.
  const first = pts[0];
  let p0 = first;
  for (const p of pts) if (dist(p, first) > dist(p0, first)) p0 = p;
  let p1 = p0;
  for (const p of pts) if (dist(p, p0) > dist(p1, p0)) p1 = p;
  const ab = sub(p1, p0), L = len(ab);
  if (!(L > 0)) return null;
  const u = { x: ab.x / L, y: ab.y / L };
  let dev = 0, lo = Infinity, hi = -Infinity, a = p0, b = p1;
  for (const p of pts) {
    const q = sub(p, p0);
    const along = q.x * u.x + q.y * u.y;
    dev = Math.max(dev, Math.abs(q.x * u.y - q.y * u.x));
    if (along < lo) (lo = along, (a = p));
    if (along > hi) (hi = along, (b = p));
  }
  const length = dist(a, b);
  return { id, node, a, b, length, dev: dev / (length || 1), scale };
}

/** A round thing — a ring or a spot filled solid — as a bob (or a dot) could be. */
interface Round {
  id: string;
  node: MMNode;
  at: Point;
  /** Half the mean of its box's two sides. */
  radius: number;
  size: number;
  scale: number;
  kind: 'ring' | 'spot';
  /** 0–1: how surely it is round. */
  score: number;
  why: string;
}

function roundOf(id: string, node: MMNode, pts: readonly Point[], scale: number): Round | null {
  const b = boundsOf(node);
  if (!b) return null;
  const w = b.maxX - b.minX, h = b.maxY - b.minY;
  const size = Math.max(w, h);
  if (!(size > 0)) return null;
  const fp = fingerprintOf(node);
  const circle = resemblances(node).find((r) => r.to === 'type:circle');
  if (fp?.isClosed && circle && (circle.weight ?? 0) >= BOB_CIRCLE_MIN) {
    const aspect = Math.max(w, h) / Math.max(1e-9, Math.min(w, h));
    if (aspect <= 1.5) {
      const score = Math.min(1, (circle.weight ?? 0) / 0.8) * (1 - 0.5 * ramp01(aspect, 1.1, 1.5));
      return { id, node, at: centreOf(b), radius: (w + h) / 4, size, scale, kind: 'ring', score, why: `a ring ${px(size / scale)} across` };
    }
  }
  // A spot filled solid — whatever the rung called it, and closed or not: compact, and its ink runs many times round its outline.
  const hull = hullOf(pts);
  if (hull.length < 3) return null;
  const box = tightBox(hull);
  const per = perimeterOf(hull);
  if (!box || !(per > 0)) return null;
  const aspect = box.long / Math.max(1e-9, box.short);
  const dense = pathLength(pts) / per;
  if (aspect > SPOT_ASPECT || dense < SPOT_DENSE) return null;
  const score = (1 - ramp01(aspect, 1.3, SPOT_ASPECT)) * ramp01(dense, SPOT_DENSE, 2.4);
  if (score < 0.3) return null;
  return { id, node, at: centreOf(b), radius: (w + h) / 4, size, scale, kind: 'spot', score, why: `a spot filled solid ${px(size / scale)} across` };
}

// ===== Reading a scope =====

/** The marks of a scope a pendulum may be read from: on the board, not erased, not a gesture, not an artifact — and, with no scope given, the marks inside artifacts too. */
function marksIn(board: RunBoard, scopeIds?: readonly string[]): { id: string; node: MMNode }[] {
  const artifacts = new Set(board.artifacts);
  const ids: string[] = [];
  if (scopeIds) ids.push(...new Set(scopeIds));
  else {
    for (const id of board.contentIds) {
      if (!artifacts.has(id)) ids.push(id);
      else {
        // A pendulum that was named is an artifact whose marks are its parts: they are still its ink.
        const a = board.nodes.get(id);
        if (a) for (const e of a.edges) if (e.rel === 'has-part') ids.push(e.to);
      }
    }
  }
  const out: { id: string; node: MMNode }[] = [];
  const seen = new Set<string>();
  const pushMark = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    const n = board.nodes.get(id);
    if (!n || artifacts.has(id) || getRep(n, 'erased') || getRep(n, 'gesture')) return;
    out.push({ id, node: n });
  };
  for (const id of ids) {
    const n = board.nodes.get(id);
    // A scope that names an artifact (a held, named pendulum) is read through its parts.
    if (n && artifacts.has(id)) {
      for (const e of n.edges) if (e.rel === 'has-part') pushMark(e.to);
      continue;
    }
    pushMark(id);
  }
  return out;
}

/** One pendulum candidate before its evidence is counted. */
interface Found {
  rod: Straight;
  bob: Round;
  /** Which of the rod's tips is the pivot, and the other, on the bob. */
  pivotEnd: Point;
  bobEnd: Point;
  theta: number;
  length: number;
  touch: number;
}

/** Every pendulum the marks make, strongest first. Reads the board and changes nothing. */
export function pendulumsIn(board: RunBoard, scopeIds?: readonly string[]): PendulumPart[] {
  return read(board, scopeIds).parts;
}

function read(board: RunBoard, scopeIds?: readonly string[]): { parts: PendulumPart[]; writing: Set<string>; marks: { id: string; node: MMNode }[] } {
  const marks = marksIn(board, scopeIds);
  const writing = new Set<string>();
  const straights: Straight[] = [];
  type Ink = { id: string; node: MMNode; pts: Point[]; scale: number; bounds: Bounds };
  const closedMarks: Ink[] = [];
  const openMarks: Ink[] = [];
  for (const m of marks) {
    if (isWord(m.node) || transcriptOf(m.node)) {
      writing.add(m.id);
      continue;
    }
    const fp = fingerprintOf(m.node);
    const pts = strokePointsOf(m.node);
    const bounds = boundsOf(m.node);
    if (!fp || !pts || pts.length < 3 || !bounds) continue;
    const ink = { id: m.id, node: m.node, pts, scale: scaleOf(m.node), bounds };
    if (fp.isClosed) closedMarks.push(ink);
    else openMarks.push(ink);
  }
  const empty = { parts: [] as PendulumPart[], writing, marks };
  // The cheap test before the costly ones: a rod is a long straight open stroke, and there must be one.
  for (const o of openMarks) {
    const fp = fingerprintOf(o.node)!;
    if (fp.size / o.scale < HATCH_LEN_MIN_PX || fp.straightness < STRAIGHT_MIN) continue;
    const s = straightOf(o.id, o.node, o.pts, o.scale);
    if (s && s.dev * s.length <= Math.max(STRAIGHT_DEV * s.length, STRAIGHT_BOW_PX * s.scale)) straights.push(s);
  }
  // A rod is long, straight to a share of its length, and no arrow: a connector with a head is somebody else's.
  const rods = straights.filter((s) => s.length / s.scale >= ROD_MIN_PX && s.dev <= STRAIGHT_DEV && resemblances(s.node)[0]?.to !== 'type:arrow');
  if (!rods.length) return empty;

  // Round things a rod's end could reach: rings (closed) and spots (open, compact, dense) — and only those are measured.
  const reachable = (b: Bounds, r: Straight) => {
    const slack = Math.max(r.length * 0.35, 40 * r.scale);
    for (const e of [r.a, r.b]) if (e.x >= b.minX - slack && e.x <= b.maxX + slack && e.y >= b.minY - slack && e.y <= b.maxY + slack) return true;
    return false;
  };
  const straightIds = new Set(straights.map((s) => s.id));
  const roundMemo = new Map<string, Round | null>();
  const roundAt = (c: Ink): Round | null => {
    if (!roundMemo.has(c.id)) roundMemo.set(c.id, roundOf(c.id, c.node, c.pts, c.scale));
    return roundMemo.get(c.id)!;
  };
  const rounds: Round[] = [];
  for (const c of closedMarks) {
    if (sizeOf(c.bounds) / c.scale < BOB_MIN_PX || !rods.some((r) => reachable(c.bounds, r))) continue;
    const rd = roundAt(c);
    if (rd) rounds.push(rd);
  }
  for (const o of openMarks) {
    if (straightIds.has(o.id)) continue;
    const size = sizeOf(o.bounds) / o.scale;
    if (size < BOB_MIN_PX / 2 || size > 120 || !rods.some((r) => reachable(o.bounds, r))) continue;
    const rd = roundAt(o);
    if (rd) rounds.push(rd);
  }
  if (!rounds.length) return empty;

  // 1. A rod, a bob at one end: the rod points at its centre, the far end is clear of it, the bob hangs.
  const found: Found[] = [];
  for (const rod of rods) {
    for (const bob of rounds) {
      if (bob.id === rod.id) continue;
      for (const [E, F] of [[rod.a, rod.b], [rod.b, rod.a]] as const) {
        const reach = bob.radius + Math.max(TOUCH_SHARE * bob.radius, TOUCH_PX * bob.scale);
        const d = dist(E, bob.at);
        if (d > reach) continue;
        // The rod points at the bob's centre.
        const ab = sub(E, F), L = len(ab);
        if (!(L > 0)) continue;
        const off = Math.abs(ab.x * (bob.at.y - F.y) - ab.y * (bob.at.x - F.x)) / L;
        if (off > AIM_SHARE * bob.radius + AIM_PX * bob.scale) continue;
        if (dist(F, bob.at) < CLEAR_RADII * bob.radius) continue;
        const length = dist(F, bob.at);
        if (bob.size > BOB_MAX_OF_LENGTH * length || bob.size < BOB_MIN_OF_LENGTH * length) continue;
        // It hangs: the bob below its pivot, within the angle a pendulum swings from.
        const theta = Math.atan2(bob.at.x - F.x, bob.at.y - F.y);
        if (bob.at.y <= F.y || Math.abs(theta) * DEG > HANG_DEG[1]) continue;
        found.push({ rod, bob, pivotEnd: F, bobEnd: E, theta, length, touch: ramp01(d / reach, 0.6, 1) });
      }
    }
  }
  if (!found.length) return empty;

  // 2. The pivot end is free: on no ring of the bob's size, on no block as big as the pendulum.
  const free = (f: Found): boolean => {
    for (const c of closedMarks) {
      if (c.id === f.bob.id || c.id === f.rod.id) continue;
      const b = c.bounds;
      const slack = Math.max(0.04 * f.length, TOUCH_PX * f.rod.scale);
      if (f.pivotEnd.x < b.minX - slack || f.pivotEnd.x > b.maxX + slack || f.pivotEnd.y < b.minY - slack || f.pivotEnd.y > b.maxY + slack) continue;
      const w = b.maxX - b.minX, h = b.maxY - b.minY;
      if (w >= BLOCK_OF_LENGTH * f.length && h >= BLOCK_OF_LENGTH * f.length) return false;
      const ring = roundAt(c);
      if (ring && ring.size >= BOND_OF_BOB * f.bob.size && dist(f.pivotEnd, ring.at) <= ring.radius + Math.max(TOUCH_SHARE * ring.radius, TOUCH_PX * ring.scale)) return false;
    }
    return true;
  };

  // A dot is any small compact mark by the rod's top end: the tap the rung calls a dot, a ring or a spot.
  const smallMarks: Ink[] = [...closedMarks, ...openMarks].filter((c) => !straightIds.has(c.id) && sizeOf(c.bounds) / c.scale <= DOT_MAX_PX);
  const dotNear = (f: Found): Round | null => {
    let best: Round | null = null;
    for (const c of smallMarks) {
      if (c.id === f.bob.id || c.id === f.rod.id) continue;
      const size = sizeOf(c.bounds);
      if (size > DOT_OF_BOB * f.bob.size) continue;
      const at = centreOf(c.bounds);
      const d = dist(at, f.pivotEnd);
      if (d > Math.max(size, TOUCH_PX * c.scale)) continue;
      // A tap, or a scribble no bigger than a fingertip of ink: a dot, whatever the rung made of it.
      const tap = resemblances(c.node).some((r) => r.to === 'type:dot' && (r.weight ?? 0) >= 0.4) || size / c.scale <= DOT_TINY_PX;
      const rd = tap ? ({ id: c.id, node: c.node, at, radius: size / 2, size, scale: c.scale, kind: 'spot', score: 0.8, why: 'a dot' } as Round) : roundAt(c);
      if (!rd) continue;
      if (!best || d < dist(best.at, f.pivotEnd)) best = rd;
    }
    return best;
  };

  // 3. What it hangs from, and how surely it is a pendulum.
  const takenBobs = new Set<string>();
  const takenRods = new Set<string>();
  const scored = found
    .filter(free)
    .map((f) => ({ f, part: partOf(f, straights, dotNear(f)) }))
    .sort((a, b) => b.part.confidence - a.part.confidence || a.f.rod.id.localeCompare(b.f.rod.id));
  const parts: PendulumPart[] = [];
  for (const { f, part } of scored) {
    if (takenBobs.has(f.bob.id) || takenRods.has(f.rod.id)) continue;
    takenBobs.add(f.bob.id);
    takenRods.add(f.rod.id);
    parts.push(part);
  }
  // In the marks' own order.
  const order = new Map(marks.map((m, i) => [m.id, i]));
  parts.sort((a, b) => (order.get(a.rod) ?? 0) - (order.get(b.rod) ?? 0));
  return { parts, writing, marks };
}

/** What a pendulum hangs from, and so how surely it is one. */
function partOf(f: Found, straights: readonly Straight[], dot: Round | null): PendulumPart {
  const { rod, bob } = f;
  const L = f.length, scale = rod.scale;
  const F = f.pivotEnd;

  // A ceiling: a level straight line the rod's top end lies on, in its span.
  let ceiling: Straight | null = null;
  for (const c of straights) {
    if (c.id === rod.id || c.id === bob.id) continue;
    if (c.length / scale < CEILING_MIN_PX || c.length < CEILING_SHARE * L) continue;
    const ab = sub(c.b, c.a);
    const lean = Math.abs(Math.atan2(ab.y, ab.x) * DEG);
    if (Math.min(lean, 180 - lean) > CEILING_LEVEL_DEG) continue;
    const d = distToSegment(F, c.a, c.b);
    if (d > Math.max(CEILING_TOUCH * c.length, TOUCH_PX * scale)) continue;
    const along = ((F.x - c.a.x) * ab.x + (F.y - c.a.y) * ab.y) / (c.length * c.length);
    if (along < -CEILING_SPAN_SLACK || along > 1 + CEILING_SPAN_SLACK) continue;
    // The bob hangs below it.
    if (bob.at.y <= Math.min(c.a.y, c.b.y)) continue;
    if (!ceiling || c.length > ceiling.length) ceiling = c;
  }

  // Hatching: short strokes leaning together, off the ceiling, above it.
  const hatch: Straight[] = [];
  if (ceiling) {
    const cd = sub(ceiling.b, ceiling.a);
    const cAng = Math.atan2(cd.y, cd.x);
    const ceilY = (x: number) => ceiling!.a.y + ((x - ceiling!.a.x) * cd.y) / (cd.x || 1e-9);
    const cand = straights.filter((s) => {
      if (s.id === rod.id || s.id === ceiling!.id) return false;
      if (s.length / s.scale < HATCH_LEN_MIN_PX || s.length > HATCH_MAX_OF_CEILING * ceiling!.length) return false;
      const d = sub(s.b, s.a);
      const diff = Math.abs(((Math.atan2(d.y, d.x) - cAng) * DEG) % 180);
      if (Math.min(diff, 180 - diff) < HATCH_OFF_CEILING_DEG) return false;
      const c = mid(s.a, s.b);
      const along = ((c.x - ceiling!.a.x) * cd.x + (c.y - ceiling!.a.y) * cd.y) / (ceiling!.length * ceiling!.length);
      if (along < -0.1 || along > 1.1) return false;
      // Above the ceiling: on the side the bob is not.
      const rise = ceilY(c.x) - c.y;
      if (rise < -0.5 * s.length || rise > HATCH_BAND * L) return false;
      return true;
    });
    // The largest group that leans together.
    const ang = (s: Straight) => {
      const d = sub(s.b, s.a);
      const a = (Math.atan2(d.y, d.x) * DEG + 180) % 180;
      return a;
    };
    let best: Straight[] = [];
    for (const seed of cand) {
      const group = cand.filter((s) => {
        const diff = Math.abs(ang(s) - ang(seed));
        return Math.min(diff, 180 - diff) <= HATCH_ALIGN_DEG;
      });
      if (group.length > best.length) best = group;
    }
    if (best.length >= HATCH_MIN) hatch.push(...best);
  }

  const evi: { what: string; weight: number }[] = [];
  if (ceiling) evi.push({ what: 'a ceiling it hangs from', weight: EVIDENCE.ceiling });
  if (hatch.length) evi.push({ what: `${countWord(hatch.length)} hatch marks above it`, weight: EVIDENCE.hatching });
  if (dot) evi.push({ what: 'a dot on the rod’s top end', weight: EVIDENCE.dot });
  const bare = !evi.length;
  if (bare) evi.push({ what: 'the rod’s top end alone', weight: EVIDENCE.bare });
  const settled = 1 - evi.reduce((p, e) => p * (1 - e.weight), 1);
  const straight = 1 - Math.min(1, rod.dev / STRAIGHT_DEV) * 0.4;
  const sure = ((straight + bob.score) / 2) * (1 - 0.3 * f.touch);
  const hang = 1 - ramp01(Math.abs(f.theta) * DEG, HANG_DEG[0], HANG_DEG[1]);
  const confidence = MAX * sure * hang * (PLAIN_SHARE + (1 - PLAIN_SHARE) * settled);

  const pivotKind: PivotKind = ceiling ? (hatch.length ? 'hatched ceiling' : 'ceiling') : dot ? 'dot' : 'the rod’s top end';
  const marks = [rod.id, bob.id, ...(ceiling ? [ceiling.id] : []), ...hatch.map((h) => h.id), ...(dot ? [dot.id] : [])];
  const centres: Record<string, Point> = {};
  for (const id of [rod.id, bob.id]) {
    const b = boundsOf(id === rod.id ? rod.node : bob.node);
    if (b) centres[id] = centreOf(b);
  }
  const deg = f.theta * DEG;
  return {
    rod: rod.id,
    bob: bob.id,
    pivot: { x: F.x, y: F.y },
    bobAt: { x: bob.at.x, y: bob.at.y },
    bobRadius: bob.radius,
    length: L,
    theta: f.theta,
    plumb: Math.abs(deg) < PLUMB_DEG,
    pivotKind,
    ...(ceiling ? { ceiling: ceiling.id } : {}),
    hatching: hatch.map((h) => h.id),
    ...(dot ? { dot: dot.id } : {}),
    marks,
    centres,
    confidence,
    scale,
    reason: `a straight rod ${px(rod.length / scale)} long ending on ${bob.why}, hanging ${Math.abs(deg) < PLUMB_DEG ? 'plumb' : `${Math.abs(deg).toFixed(0)}° ${deg < 0 ? 'left' : 'right'} of plumb`} from ${bare ? 'its top end alone — nothing drawn there' : evi.map((e) => e.what).join(' and ')}`,
  };
}

// ===== The sentence =====

/** How far from plumb, in the person's words. */
function leanWords(p: PendulumPart): string {
  if (p.plumb) return 'hanging plumb';
  return `drawn ${Math.abs(Math.round(p.theta * DEG))}° from plumb`;
}

function summaryOf(parts: readonly PendulumPart[]): string {
  if (parts.length === 1) {
    const p = parts[0];
    return p.pivotKind === 'the rod’s top end' ? `a rod and a bob, ${leanWords(p)} — no pivot drawn` : `a rod from a pivot, a bob, ${leanWords(p)}`;
  }
  return `${countWord(parts.length)} pendulums, ${parts.map((p) => leanWords(p).replace(/^drawn /, '')).join(', ')}`;
}

// ===== The notation =====

/** What a scope is as pendulums, or null when it holds no rod with a bob hanging from it. Reads the board and changes nothing. */
export function readPendulum(board: RunBoard, scopeIds?: readonly string[]): PendulumReading | null {
  const { parts, writing, marks } = read(board, scopeIds);
  if (!parts.length) return null;
  const nodes = board.nodes;

  // The symbols: each pendulum's rod, bob, ceiling, hatching and dot.
  const symbols: NotationSymbol[] = [];
  const mk = (id: string, ids: string[], symbol: PendulumSymbolName, confidence: number, reason: string, outline: Point[]): NotationSymbol => {
    const role = PENDULUM_TABLE.symbols[symbol].role as Role;
    const xs = outline.map((p) => p.x), ys = outline.map((p) => p.y);
    return {
      id, ids, symbol, role, confidence, reason,
      readings: [{ symbol, role, confidence, reason }],
      outline, bounds: { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) },
      ports: [], labels: [],
    };
  };
  const inkOf = (id: string) => strokePointsOf(nodes.get(id)!) ?? [];
  const tips = (id: string): Point[] => {
    const n = nodes.get(id)!;
    const s = straightOf(id, n, inkOf(id), scaleOf(n));
    return s ? [s.a, s.b] : inkOf(id).slice(0, 2);
  };
  for (const p of parts) {
    symbols.push(mk(p.rod, [p.rod], 'rod', Math.min(MAX, p.confidence + 0.1), `a straight line ${px(p.length)} from the pivot to the bob, ${leanWords(p)}`, tips(p.rod)));
    const bobPts = hullOf(inkOf(p.bob));
    symbols.push(mk(p.bob, [p.bob], 'bob', Math.min(MAX, p.confidence + 0.1), `a bob about ${px(p.bobRadius * 2)} across at the rod’s lower end`, bobPts.length ? bobPts : [p.bobAt]));
    if (p.ceiling) symbols.push(mk(p.ceiling, [p.ceiling], 'ceiling', p.confidence, 'a level line the rod hangs from', tips(p.ceiling)));
    if (p.hatching.length) symbols.push(mk(p.hatching[0], p.hatching.slice(), 'hatching', p.confidence, `${countWord(p.hatching.length)} short strokes leaning together above the ceiling`, p.hatching.flatMap(tips)));
    if (p.dot) symbols.push(mk(p.dot, [p.dot], 'dot', p.confidence, 'a dot on the rod’s top end', [boundsCentreOf(nodes.get(p.dot)!)]));
  }

  // Writing beside the rod labels it (a length); writing elsewhere is left to its own place.
  const owned = new Set(parts.flatMap((p) => p.marks));
  const labels: NotationLabel[] = labelWriting(nodes, {
    marks,
    writing,
    symbols: symbols.filter((s) => s.symbol === 'rod' || s.symbol === 'bob').map((s) => ({ id: s.id, symbol: s.symbol, bounds: s.bounds, outline: s.outline, labels: s.labels })),
    connectors: [],
    owned,
    role: PENDULUM_TABLE.label.role as Role,
    inside: false,
  });

  const scope = marks.map((m) => m.id);
  const { roles, weight, unplaced } = rolesOf(
    scope,
    (put) => {
      for (const s of symbols) for (const id of s.ids) put(id, s.role, 1);
      for (const l of labels) put(l.id, l.role, l.where === 'alone' ? 0.5 : 1);
    },
    new Map()
  );
  const coverage = scope.reduce((a, id) => a + (weight[id] ?? 0), 0) / scope.length;
  const best = Math.max(...parts.map((p) => p.confidence));
  const confidence = Math.min(MAX, best * Math.sqrt(Math.max(0, coverage)));
  if (!(confidence > 0)) return null;
  const summary = summaryOf(parts);
  const evidence: { what: string; weight: number }[] = parts.map((p) => (p.pivotKind === 'the rod’s top end' ? { what: 'the rod’s top end alone', weight: EVIDENCE.bare as number } : { what: p.pivotKind as string, weight: (p.pivotKind === 'dot' ? EVIDENCE.dot : EVIDENCE.ceiling) as number }));
  const counts: Record<string, number> = {
    rod: parts.length, bob: parts.length,
    ceiling: parts.filter((p) => p.ceiling).length,
    hatching: parts.filter((p) => p.hatching.length).length,
    dot: parts.filter((p) => p.dot).length,
    word: labels.filter((l) => l.where === 'beside').length,
  };
  return {
    notation: 'pendulum',
    name: PENDULUM_TABLE.name,
    confidence,
    summary,
    reason: `${summary} — ${parts.map((p) => p.reason).join('; ')}${unplaced.length ? `, and ${countWord(unplaced.length)} mark${unplaced.length === 1 ? '' : 's'} it places nowhere` : ''}`,
    symbols,
    connectors: [],
    labels,
    roles,
    unplaced,
    counts,
    pendulums: parts,
    evidence,
  };
}

function boundsCentreOf(n: MMNode): Point {
  const b = boundsOf(n);
  return b ? centreOf(b) : { x: 0, y: 0 };
}

export const PENDULUM: Notation = {
  id: 'pendulum',
  name: PENDULUM_TABLE.name,
  describes: PENDULUM_TABLE.describes,
  symbols: SYMBOLS.map((name) => ({ name, role: PENDULUM_TABLE.symbols[name].role as Role, describes: PENDULUM_TABLE.symbols[name].describes, ports: 'none — a mark on a pendulum, not a place a line is tied' })),
  connectors: [],
  read: (state, scopeIds) => readPendulum(state, scopeIds),
};

// ===== The runner =====

/** The pendulum's state while it runs: its physics, with what it was let go from and what it swings with. */
export interface PendulumRunState extends PendulumState {
  L: number;
  g: number;
  theta0: number;
}

/** A length a person wrote beside the rod, in metres. */
interface WrittenLength {
  metres: number;
  /** As written: `2.5 m`, `250 cm`, `3`. */
  text: string;
  unit: string | null;
}

/** What a number says as a length in metres: a range is taken at its middle; a bare number has no unit. */
function lengthOf(n: BoardNumber): WrittenLength | null {
  const r = n.reading;
  if (r.angle || r.step !== undefined || r.value.dim > 1) return null;
  if (r.measure && !['length', 'long', 'height'].includes(r.measure)) return null;
  const q = r.value;
  const m = q.unit ? convertQuantity(q, 'm').quantity : q;
  const metres = (m.lo + m.hi) / 2;
  if (!(metres > 0) || !Number.isFinite(metres)) return null;
  const asWritten = (q.lo + q.hi) / 2;
  return { metres, text: formatNumber(asWritten) + (q.unit ? ` ${q.unit}` : ''), unit: q.unit };
}

/**
 * The length written beside the rod. With the board's maths read (`maths`), it is the number the dimensions
 * attached to the rod as its length — the same reading that ranks a number against every mark it stands
 * near, so a label for the ceiling is not taken for the rod's. Without it, the nearest number within the
 * rod's own reach.
 */
function writtenLength(board: RunBoard, part: PendulumPart, maths: BoardMaths | null): WrittenLength | null {
  if (maths) {
    const rodFigure = maths.dimensions.figures.find((f) => f.kind === 'line' && f.ids.length === 1 && f.ids[0] === part.rod);
    if (!rodFigure) return null;
    for (const a of maths.dimensions.attachments) {
      if (a.as !== 'dimension' || a.figure !== rodFigure.id || !a.key || !(a.key === 'length' || /^side\d+$/.test(a.key))) continue;
      const w = lengthOf(a.number);
      if (w) return w;
    }
    return null;
  }
  const reach = Math.max(0.6 * part.length, 90 * part.scale);
  let best: { w: WrittenLength; d: number } | null = null;
  for (const n of numbersOf(board as Parameters<typeof numbersOf>[0])) {
    const d = distToSegment(n.centre, part.pivot, part.bobAt);
    if (d > reach) continue;
    const w = lengthOf(n);
    if (w && (!best || d < best.d)) best = { w, d };
  }
  return best ? best.w : null;
}

function lengthInput(board: RunBoard, part: PendulumPart, mathsOf?: () => BoardMaths | null): RunInputs['L'] {
  let maths: BoardMaths | null = null;
  try {
    maths = mathsOf?.() ?? null;
  } catch {
    /* a board whose maths cannot be read has no length written on it */
  }
  const w = writtenLength(board, part, maths);
  if (w) {
    return {
      value: w.metres,
      unit: 'm',
      from: 'written',
      reason: w.unit ? `L = ${w.text}, as written beside the rod` : `L = ${w.text}, as written beside the rod — no unit, so taken as metres`,
    };
  }
  // The drawing's scale: a label elsewhere on the drawing says how many metres a pixel is.
  const d = maths?.dimensions.drawings.find((dr) => dr.ids.includes(part.rod) || dr.ids.includes(part.bob));
  if (d?.scale && d.scale.unit) {
    const inUnit = part.length * d.scale.unitsPerCanvasUnit;
    const metres = convertQuantity({ lo: inUnit, hi: inUnit, unit: d.scale.unit, dim: 1, approx: false }, 'm').quantity.lo;
    if (metres > 0 && Number.isFinite(metres)) return { value: metres, unit: 'm', from: 'scale', reason: `L = ${formatNumber(metres)} m, from the drawing’s scale (${d.scale.reason})` };
  }
  return { value: 1, unit: 'm', from: 'assumed', reason: 'L = 1 m assumed — write a length beside the rod to change it' };
}

/** The sentence for the period, in the person's words: T = 2π√(L/g) = 2.01 s. */
export function periodWords(L: number, theta0: number, g: number = GRAVITY): string {
  const T = pendulumPeriod(L, theta0, g);
  return `T = 2π√(L/g) = ${T.toFixed(2)} s`;
}

export const PENDULUM_RUNNER: Runner<PendulumRunState> = {
  id: 'pendulum',
  name: 'the pendulum',
  describe: () => 'a pendulum swings by physics (RK4 at a fixed step), its period exact; its angle, speed and position are quantities any written maths can use',
  dt: PENDULUM_DT,
  maxSteps: PENDULUM_MAX_STEPS,
  reads(board, ids): RunReading[] {
    return pendulumsIn(board, ids)
      .filter((p) => p.confidence >= PENDULUM_OFFER_FLOOR)
      .map((p) => ({
        runner: 'pendulum',
        key: p.rod,
        marks: p.marks.slice(),
        confidence: p.confidence,
        summary: summaryOf([p]),
        reason: p.reason,
        data: p,
      }));
  },
  holds(board, id) {
    const n = board.nodes.get(id);
    if (!n || getRep(n, 'erased')) return false;
    return pendulumsIn(board).some((p) => p.rod === id && p.confidence >= PENDULUM_OFFER_FLOOR);
  },
  inputs(board, run, maths) {
    const p = run.data as PendulumPart;
    return {
      L: lengthInput(board, p, maths),
      theta0: { value: p.theta, unit: 'rad', from: 'drawn', reason: p.plumb ? 'drawn hanging plumb' : `drawn ${Math.abs(p.theta * DEG).toFixed(0)}° from plumb` },
      g: { value: GRAVITY, unit: 'm/s²', from: 'standard', reason: 'g = 9.81 m/s²' },
    };
  },
  init(inputs) {
    return { ...pendulumStart(inputs.theta0.value), L: inputs.L.value, g: inputs.g.value, theta0: inputs.theta0.value };
  },
  step(s, dt) {
    const n = pendulumStep(s, dt, s.g, s.L);
    return { ...n, L: s.L, g: s.g, theta0: s.theta0 };
  },
  outputs(s) {
    const T = pendulumPeriod(s.L, s.theta0, s.g);
    const T0 = smallAnglePeriod(s.L, s.g);
    const deg = s.theta * DEG;
    const pos = { x: s.L * Math.sin(s.theta), y: -s.L * Math.cos(s.theta) };
    return {
      θ: { value: s.theta, unit: 'rad', label: 'θ', text: `${deg.toFixed(1)}°` },
      ω: { value: s.omega, unit: 'rad/s', label: 'ω', text: `${s.omega.toFixed(2)} rad/s` },
      x: { value: pos.x, unit: 'm', label: 'x', text: `${pos.x.toFixed(2)} m` },
      y: { value: pos.y, unit: 'm', label: 'y', text: `${pos.y.toFixed(2)} m` },
      T: { value: T, unit: 's', label: 'T', text: `${T.toFixed(2)} s` },
      T0: { value: T0, unit: 's', label: 'T₀', text: `${T0.toFixed(2)} s` },
      E: { value: pendulumEnergy(s, s.L, s.g), unit: 'J/kg', label: 'E', text: `${pendulumEnergy(s, s.L, s.g).toFixed(3)} J/kg` },
    };
  },
  placements(run, s): RunPlacement[] {
    const p = run.data as PendulumPart;
    // Canvas rotation is clockwise on a screen with y down, and takes an angle from plumb θ to θ − δ.
    const delta = s.theta0 - s.theta;
    const c = Math.cos(delta), sn = Math.sin(delta);
    const out: RunPlacement[] = [];
    for (const id of [p.rod, p.bob]) {
      const C = p.centres[id];
      if (!C) continue;
      const v = sub(C, p.pivot);
      // Where the mark's own centre goes when it is turned about the pivot, less where it was.
      out.push({ id, dx: v.x * c - v.y * sn + p.pivot.x - C.x, dy: v.x * sn + v.y * c + p.pivot.y - C.y, angle: delta, cx: C.x, cy: C.y, about: { x: p.pivot.x, y: p.pivot.y } });
    }
    return out;
  },
  readouts(run, inputs, s): RunReadout[] {
    const p = run.data as PendulumPart;
    const key = run.key;
    const T = pendulumPeriod(s.L, s.theta0, s.g);
    const assumed = inputs.L.from === 'assumed';
    const at = { x: p.pivot.x + Math.max(Math.abs(Math.sin(s.theta0)) * p.length, p.bobRadius) + p.bobRadius + 24 * p.scale, y: p.pivot.y + 0.3 * p.length };
    return [
      {
        quantity: runQuantity(key, 'T'),
        text: `T = ${T.toFixed(2)} s${assumed ? ' · 1 m assumed' : ''}`,
        reason: `${periodWords(s.L, s.theta0, s.g)}${Math.abs(s.theta0) > 0.05 ? `; for small swings it is ${smallAnglePeriod(s.L, s.g).toFixed(2)} s` : ''} — ${inputs.L.reason}`,
        live: false,
        at,
        about: p.marks.slice(),
      },
      {
        quantity: runQuantity(key, 'θ'),
        text: `θ = ${(s.theta * DEG).toFixed(1)}°`,
        reason: 'the angle from plumb, right is positive; it runs live while the pendulum swings',
        live: true,
        at,
        about: p.marks.slice(),
      },
    ];
  },
};

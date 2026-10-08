// The coordinate plane (MATHS-SPEC §8 Lane C, M19): axes, their ticks and numbers, and what is drawn on them.
//
// What a teacher draws before any graph:
//
//   - **two axes** — long straight strokes, lines or arrows, the one nearly level and the other nearly plumb,
//     crossing near the right angle. They cross through each other (x from −3 to 3), or one starts on the other
//     (a half plane: y from 0), or they meet at their ends (the first quadrant). Larger values lie to the right and
//     up, and each axis has a longer arm that way than it has a stub.
//   - **ticks** — short strokes across an axis, the places a number is written.
//   - **numbers** at the ticks — two of them fix an axis's scale and where its zero is; one fixes it with the axes'
//     crossing taken as zero; with ticks and no numbers one tick is one unit; with nothing, a default range is
//     assumed and the reading says so.
//   - **a name** at an axis's end — x, y, t, θ: writing beyond the tip.
//   - **what is drawn on the plane** — a curve (a stroke that is a function of x: `fit.ts` reads which), a point (a
//     dot or a small ring: it reads as its coordinates).
//
// **Not every cross is a pair of axes** (the trap). Two crossing connectors in a flowchart, the legs of a right
// triangle, a pendulum's ceiling and rod, the lines of a Feynman vertex, a garment's grain line and fold are all
// long straight strokes meeting near the right angle. So the reading's confidence is its EVIDENCE, as the garment
// piece's and the pendulum's are: the crossing alone is held under the floor (and a half plane or a corner under that
// again); an arrowhead at each axis's positive end, ticks, numbers at the ticks and a name at an end each add what
// only an axis has. And the strokes must be free where an axis is: a tip that lands on a box, or on the end of another
// long stroke, is a connector's or a triangle's, not an axis's — nothing hangs from a plane's ends.
//
// **The six roles hold**: an axis is a container (it frames where a curve lives), a tick an annotation, a curve or a
// point a node, a number or a name a label. Derived like every notation — nothing enters the log — and `planesIn`
// is the one reading: `plot.ts` draws a function on the geometry it returns, `fit.ts` reads a curve on it, and the
// fill source (`maths/fill-plane.ts`) offers what the maths implies.

import type { Bounds, Point } from '../types';
import type { SessionState } from '../session/session';
import type { MMNode } from '../session/nodes';
import { boundsOf, fingerprintOf, getRep, isWord, strokePointsOf, transcriptOf } from '../session/nodes';
import { headsOf } from '../diagram/heads';
import type { Role } from '../diagram/roles';
import { MAX_TIER0_CONFIDENCE } from '../recognition';
import type { Notation, NotationLabel, NotationReading, NotationSymbol } from './notation';
import { compileFunction } from '../maths/fn';
import { fitCurve } from '../maths/fit';
import type { CurveFit } from '../maths/fit';
import { canvasToPlane, planeToCanvas } from '../maths/plot';
import type { PlaneAxisScale, PlaneGeometry, ScaleHow } from '../maths/plot';
import { bandPhrases, boundsOfAll, wordsOnBoard, writingBands } from '../maths/writing';

// ===== The table — the plane's content =====

/** The plane's content, its single home: what each symbol is, which of the six roles it plays, how it looks. */
export const PLANE_TABLE = {
  notation: 'plane',
  name: 'Coordinate plane',
  describes: 'two axes crossing near the right angle, with ticks, numbers and names, and curves and points drawn on them',
  symbols: {
    axis: { role: 'container', describes: 'a long straight line or arrow, level or plumb: where a curve lives', one: 'axis', many: 'axes' },
    tick: { role: 'annotation', describes: 'a short stroke across an axis, where a number is written', one: 'tick', many: 'ticks' },
    curve: { role: 'node', describes: 'a stroke on the plane that is a function of x', one: 'curve', many: 'curves' },
    point: { role: 'node', describes: 'a dot or a small ring on the plane: its coordinates', one: 'point', many: 'points' },
  },
  label: { role: 'label', describes: 'a number at a tick, or a name at an axis’s end (x, y, t, θ)', one: 'label', many: 'labels' },
} as const;

export type PlaneSymbolName = keyof typeof PLANE_TABLE.symbols;
const SYMBOLS = Object.keys(PLANE_TABLE.symbols) as PlaneSymbolName[];

// ===== Thresholds — this notation's own; the hand's are cited =====

/** An axis is at least this long in the hand's space (screen pixels)… */
export const AXIS_MIN_PX = 80;
/** …straight: the middle of its path (all but `AXIS_TRIM` each end, where an arrow's barb or a pen's hook is) stands off its chord by no more than this share of its length; the shape rung's own straightness has to be at least `AXIS_STRAIGHT_MIN` before it is measured. */
export const AXIS_STRAIGHT_DEV = 0.05;
export const AXIS_TRIM = 0.12;
export const AXIS_STRAIGHT_MIN = 0.7;
/** …and nearly level (the x axis) or nearly plumb (the y axis): within this many degrees. */
export const AXIS_LEVEL_DEG = 22;
/** The axes cross within this many degrees of the right angle: full to the first, none by the second. */
export const PERP_DEG = [5, 16] as const;
/** The longer axis is at most this many times the other. */
export const AXIS_RATIO_MAX = 4;
/** Each axis runs this far (hand's pixels) past the crossing the way values grow; a stub that is shorter is no arm. */
export const POSITIVE_MIN_PX = 60;
/** An axis is said to START at the crossing when the crossing is within this share of its length (and `END_PX`) of its end. */
export const AT_END = 0.06;
export const END_PX = 12;
/** …and a crossing at an axis's far end (its larger-values end) is nobody's axes. */
export const FAR_END = 0.93;
/** A tip is blocked when a closed mark at least this share of the shorter axis is within `TIP_REACH` of it (share of the axis, and `TIP_PX`), or the end of a long straight stroke is. */
export const TIP_BLOCK_OF_AXIS = 0.12;
export const TIP_REACH = 0.07;
export const TIP_PX = 10;
export const LONG_STROKE_OF_AXIS = 0.3;
/** The axes are at least this many times the median of the closed marks round them. */
export const LONG_OF_CLOSED = 1.3;
/** A tick: a stroke at least this long (hand's pixels), at most this share of its axis and at most `TICK_MAX_PX`, straight, within this many degrees of square across the axis, its middle within `TICK_ON_AXIS` of its own length from the axis. */
export const TICK_MIN_PX = 4;
export const TICK_MAX_OF_AXIS = 0.1;
export const TICK_MAX_PX = 44;
export const TICK_PERP_DEG = 35;
export const TICK_ON_AXIS = 0.6;
export const TICK_STRAIGHT_MIN = 0.75;
/** A number belongs to an axis when its middle is within this share of the axis (and `NUM_NEAR_PX`) of it, across, and not past its ends by more than `NUM_SLACK`. */
export const NUM_NEAR = 0.12;
export const NUM_NEAR_PX = 36;
export const NUM_SLACK = 0.07;
/** …and at a tick when within half the ticks' spacing of it (never less than `NUM_AT_TICK_PX`). */
export const NUM_AT_TICK_PX = 20;
/** The crossing's own zone, where a number is the origin's label: this share of the shorter axis (and `ORIGIN_PX`). */
export const ORIGIN_NEAR = 0.08;
export const ORIGIN_PX = 28;
/** A name is within this share of the axis (and `NAME_PX`) of its positive tip. */
export const NAME_REACH = 0.22;
export const NAME_PX = 60;
/** A dot or small ring on the plane: no more than this many hand's pixels across. */
export const POINT_MAX_PX = 26;
/** A curve reaches at least this far (hand's pixels) and this share of the plane's width across, with at least this share of its points on the plane. */
export const CURVE_MIN_PX = 30;
export const CURVE_MIN_OF_PLANE = 0.1;
export const CURVE_INSIDE = 0.8;
/** The scale of an axis is as drawn when the numbers agree with the ticks' spacing to this share of a step. */
export const SCALE_AGREE = 0.2;
/** With nothing said of the scale, each axis is this many units from the crossing to its shorter arm's end. */
export const DEFAULT_UNITS = 5;
/** What each kind of evidence is worth to the reading, as the chance it alone settles it. */
export const EVIDENCE = {
  /** The crossing alone: through each other, one on the other, meeting at their ends. */
  geometry: { cross: 0.3, tee: 0.15, corner: 0.08 },
  /** An arrowhead on both axes, on one. */
  arrows: { both: 0.5, one: 0.28 },
  /** Ticks (two or more) across both axes, across one. */
  ticks: { both: 0.7, one: 0.45 },
  /** Numbers at the ticks: two or more, one; and not at ticks, as a share of these. */
  numbers: { many: 0.6, one: 0.45, loose: 0.6 },
  /** A name at an axis's end: both, one, and unread writing there. */
  names: { both: 0.65, one: 0.45, unread: 0.2 },
} as const;
/** The least a plane is worth being used for by a fill source (the crossing alone is held, under the floor, and still hosts a curve). */
export const PLANE_OFFER_FLOOR = 0.2;
/** Where a plane's numbers are taken out of the dimensions and the page: the notation floor (`NOTATION_FLOOR`, which this module cannot import without a cycle; the test holds them equal). */
export const PLANE_CLAIM_FLOOR = 0.5;
/** The most curves and points read on one plane. */
export const MAX_ON_PLANE = 16;
/** The most long straight strokes of each direction crossed with each other, and the most pairs of them read in full (a sheet of graph paper has a hundred; the surest and longest are read). */
const MAX_AXES = 24;
const MAX_PAIRS = 40;

const MAX = MAX_TIER0_CONFIDENCE;
const DEG = 180 / Math.PI;

// ===== The reading's own shapes =====

export interface PlaneTick {
  id: string;
  /** Canvas units along the axis from the crossing, towards larger values (negative the other way). */
  along: number;
  /** The number written at it. */
  value?: number;
  numberId?: string;
}

export interface PlaneAxis {
  /** The axis's stroke. */
  id: string;
  /** It and the head drawn apart from it. */
  ids: string[];
  /** Its two ends where the pen reached, and how far they are from the crossing along it (the nearer end of a half plane: 0). */
  negTip: Point;
  posTip: Point;
  neg: number;
  pos: number;
  /** A head at that end. */
  heads: { neg: boolean; pos: boolean };
  ticks: PlaneTick[];
  /** The name written at its end, and the writing it is. */
  name?: string;
  nameId?: string;
}

export interface PlaneNumber {
  /** The text or the writing's first mark, and every mark the writing is. */
  id: string;
  ids: string[];
  text: string;
  value: number;
  axis: 'x' | 'y';
  /** Canvas units along the axis from the crossing where it stands (its tick's, when it is at one). */
  along: number;
  atTick: boolean;
  bounds: Bounds;
}

export interface PlaneCurve {
  id: string;
  /** The stroke's points as they stand, in canvas units. */
  points: Point[];
  /** What it is, read as a function of x. */
  fit: CurveFit;
  /** The hand's scale (canvas units per screen pixel) at the stroke. */
  scale: number;
}

export interface PlanePoint {
  id: string;
  at: Point;
  /** Its coordinates on the plane, to the plane's own precision. */
  x: number;
  y: number;
  /** *(2, 4)*. */
  text: string;
  ring: boolean;
}

/** One plane, as the plot, the fit and the fill source need it: a geometry and everything drawn with it. */
export interface PlanePart extends PlaneGeometry {
  /** The x axis's stroke: what the plane is named by. */
  id: string;
  junction: 'cross' | 'tee' | 'corner';
  xAxis: PlaneAxis;
  yAxis: PlaneAxis;
  numbers: PlaneNumber[];
  /** The writing at the crossing (a 0 or an O), when there is any. */
  originLabel?: { id: string; ids: string[] };
  curves: PlaneCurve[];
  points: PlanePoint[];
  /** Strokes drawn on the plane that are no function of x: a guide, a shaded part, a word. */
  marked: string[];
  /** Every stroke of the plane, axes first. */
  marks: string[];
  /** Every text and piece of writing it claimed: tick numbers, the origin's label, names. */
  words: string[];
  confidence: number;
  evidence: { what: string; weight: number }[];
  /** The hand's scale at the axes. */
  scale: number;
  reason: string;
  /** In the person's words: *x from −3 to 3, y from 0 to 9*. */
  summary: string;
}

export interface PlaneReading extends NotationReading {
  planes: PlanePart[];
}

export interface PlaneOptions {
  /** Fit the curves drawn on the plane (default true); the dimensions' claim of tick numbers does not need them. */
  fits?: boolean;
}

// ===== Geometry =====

const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a: Point, k: number): Point => ({ x: a.x * k, y: a.y * k });
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;
const len = (a: Point) => Math.hypot(a.x, a.y);
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const unit = (a: Point): Point => {
  const l = len(a);
  return l > 1e-12 ? { x: a.x / l, y: a.y / l } : { x: 1, y: 0 };
};
const ramp01 = (v: number, lo: number, hi: number) => Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
const centreOf = (b: Bounds): Point => ({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 });
const sizeOf = (b: Bounds) => Math.max(b.maxX - b.minX, b.maxY - b.minY);
const median = (xs: readonly number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};
const scaleOf = (n: MMNode): number => (getRep(n, 'stroke')?.data as { scale?: number } | undefined)?.scale ?? 1;
const COUNT = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const countWord = (n: number) => COUNT[n] ?? String(n);

function pathLength(pts: readonly Point[]): number {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += dist(pts[i - 1], pts[i]);
  return s;
}

/** A number as it reads in a sentence: whole, or to two places, with a true minus. */
export function num(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  const r = Math.abs(v) >= 100 ? Math.round(v) : Number(v.toFixed(2));
  return (r < 0 ? '−' : '') + String(Math.abs(r));
}

// ===== Ink, before it is read =====

interface Ink {
  id: string;
  node: MMNode;
  pts: Point[];
  scale: number;
  bounds: Bounds;
  closed: boolean;
  straightness: number;
  /** Its size across, in the hand's pixels. */
  px: number;
}

/** A stroke read as a straight line: its tips (the points the pen reached farthest along it), its direction and how far the middle of it bows. */
interface Straight extends Ink {
  a: Point;
  b: Point;
  length: number;
  dev: number;
  /** Unit vector from a to b. */
  u: Point;
}

function straightOf(ink: Ink): Straight | null {
  const pts = ink.pts;
  if (pts.length < 5) return null;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]));
  const L = cum[cum.length - 1];
  if (!(L > 0)) return null;
  const mid = pts.filter((_, i) => cum[i] >= AXIS_TRIM * L && cum[i] <= (1 - AXIS_TRIM) * L);
  if (mid.length < 3) return null;
  const chord = sub(mid[mid.length - 1], mid[0]);
  const cl = len(chord);
  if (!(cl > 0)) return null;
  const u0 = unit(chord);
  const nrm = { x: -u0.y, y: u0.x };
  let dev = 0;
  for (const p of mid) dev = Math.max(dev, Math.abs(dot(sub(p, mid[0]), nrm)));
  let lo = Infinity, hi = -Infinity, a = pts[0], b = pts[0];
  for (const p of pts) {
    const s = dot(sub(p, mid[0]), u0);
    if (s < lo) { lo = s; a = p; }
    if (s > hi) { hi = s; b = p; }
  }
  const length = dist(a, b);
  return { ...ink, a, b, length, dev: dev / length, u: unit(sub(b, a)) };
}

/** The marks a scope can read: on the board, not erased, not a gesture, not an artifact. */
function marksIn(state: SessionState, scopeIds?: readonly string[]): { id: string; node: MMNode }[] {
  const artifacts = new Set(state.artifacts);
  const ids = scopeIds ? [...new Set(scopeIds)] : state.contentIds;
  const out: { id: string; node: MMNode }[] = [];
  for (const id of ids) {
    const n = state.nodes.get(id);
    if (!n || artifacts.has(id) || getRep(n, 'erased') || getRep(n, 'gesture')) continue;
    out.push({ id, node: n });
  }
  return out;
}

// ===== Writing: numbers and names =====

interface Phrase {
  id: string;
  ids: string[];
  text: string;
  bounds: Bounds;
  centre: Point;
}

/**
 * One-line texts and phrases of read writing, with where each stands: what could be a tick's number or an axis's name.
 * The board's, not the scope's: a text is an artifact and a scope is marks, and the numbers at a plane's ticks are
 * found by where they stand.
 */
function phrasesOf(state: SessionState): Phrase[] {
  const { texts, pieces } = wordsOnBoard(state);
  const out: Phrase[] = [];
  for (const t of texts) {
    const rows = t.code.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
    if (rows.length !== 1) continue;
    out.push({ id: t.id, ids: [t.id], text: rows[0], bounds: t.bounds, centre: centreOf(t.bounds) });
  }
  for (const band of writingBands(pieces)) {
    for (const phrase of bandPhrases(band)) {
      const bounds = boundsOfAll(phrase.map((p) => p.bounds));
      out.push({ id: phrase[0].id, ids: phrase.map((p) => p.id), text: phrase.map((p) => p.text).join(' ').trim(), bounds, centre: centreOf(bounds) });
    }
  }
  return out;
}

const NUMBER_CHARS = /^[0-9.+\-−–×*·/÷π()\s]+$/;

/** What a phrase says as a number — *−2*, *1.5*, *π/2*, *2π* — or null. */
export function tickValueOf(text: string): number | null {
  const t = text.trim();
  if (!t || t.length > 14 || /[=<>]/.test(t) || !NUMBER_CHARS.test(t) || !/[0-9π]/.test(t)) return null;
  const c = compileFunction(t);
  if (!c.ok || c.variables.length) return null;
  const v = c.f(0);
  return v !== null && Number.isFinite(v) && Math.abs(v) < 1e6 ? v : null;
}

const NAME = /^[A-Za-zÀ-ɏͰ-Ͽ][A-Za-zÀ-ɏͰ-Ͽ0-9_₀-₉ ()./²³]{0,13}$/;

/** What a phrase says as an axis's name — *x*, *t*, *θ*, *time (s)* — or null. */
export function axisNameOf(text: string): string | null {
  const t = text.trim();
  if (!t || /[=+*×·<>]/.test(t) || !NAME.test(t) || tickValueOf(t) !== null) return null;
  return t;
}

// ===== Finding the axes =====

interface Pair {
  h: Straight;
  v: Straight;
  /** Unit vectors: right along the x axis, up along the y axis. */
  ex: Point;
  ey: Point;
  /** The crossing. */
  X: Point;
  left: Point;
  right: Point;
  bottom: Point;
  top: Point;
  junction: 'cross' | 'tee' | 'corner';
  /** How square the crossing is, how straight the axes are: 0–1. */
  sure: number;
  scale: number;
  reason: string;
}

/** Where the infinite lines through a (direction u) and c (direction w) meet; null when parallel. */
function meet(a: Point, u: Point, c: Point, w: Point): Point | null {
  const den = u.x * w.y - u.y * w.x;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c.x - a.x) * w.y - (c.y - a.y) * w.x) / den;
  return add(a, mul(u, t));
}

function pairOf(h: Straight, v: Straight): Pair | null {
  const ex = h.u.x >= 0 ? h.u : mul(h.u, -1);
  const ey = v.u.y <= 0 ? v.u : mul(v.u, -1);
  const cosA = Math.max(-1, Math.min(1, dot(ex, ey)));
  const off = Math.abs(90 - Math.acos(cosA) * DEG);
  if (off > PERP_DEG[1]) return null;
  const X = meet(h.a, h.u, v.a, v.u);
  if (!X) return null;
  const left = dot(h.a, ex) <= dot(h.b, ex) ? h.a : h.b;
  const right = left === h.a ? h.b : h.a;
  const bottom = dot(v.a, ey) <= dot(v.b, ey) ? v.a : v.b;
  const top = bottom === v.a ? v.b : v.a;
  const scale = Math.max(h.scale, v.scale);
  const slack = (L: number) => Math.max(0.04 * L, 12 * scale);
  const negH = dot(sub(X, left), ex), posH = dot(sub(right, X), ex);
  const negV = dot(sub(X, bottom), ey), posV = dot(sub(top, X), ey);
  // The crossing lies on both strokes (a stub's length past an end allowed)…
  if (negH < -slack(h.length) || negV < -slack(v.length)) return null;
  // …with an arm of each running the way values grow…
  if (posH < POSITIVE_MIN_PX * scale || posV < POSITIVE_MIN_PX * scale) return null;
  // …and not at the far end of either (the rod a ceiling hangs: its crossing is at its top).
  if (negH > FAR_END * h.length || negV > FAR_END * v.length) return null;
  const ratio = Math.max(h.length, v.length) / Math.min(h.length, v.length);
  if (ratio > AXIS_RATIO_MAX) return null;
  const atStart = (neg: number, L: number) => neg <= Math.max(AT_END * L, END_PX * scale);
  const sH = atStart(negH, h.length), sV = atStart(negV, v.length);
  const junction = sH && sV ? 'corner' : sH || sV ? 'tee' : 'cross';
  const sure = (1 - 0.4 * ramp01(off, PERP_DEG[0], PERP_DEG[1])) * (1 - 0.3 * Math.min(1, Math.max(h.dev, v.dev) / AXIS_STRAIGHT_DEV));
  return {
    h, v, ex, ey, X, left, right, bottom, top, junction, sure, scale,
    reason: `a level stroke ${Math.round(h.length / scale)} px long and a plumb one ${Math.round(v.length / scale)} px long, crossing ${off < 1 ? 'square' : `${off.toFixed(0)}° off square`}${junction === 'cross' ? ' through each other' : junction === 'tee' ? ', one starting on the other' : ' at their ends'}`,
  };
}

/** Whether the tip of an axis is free: no box lands on it and no long stroke ends on it. */
function tipFree(tip: Point, own: Pair, closed: readonly Ink[], longs: readonly Straight[]): boolean {
  const L = Math.min(own.h.length, own.v.length);
  const reach = Math.max(TIP_REACH * L, TIP_PX * own.scale);
  for (const c of closed) {
    if (sizeOf(c.bounds) < TIP_BLOCK_OF_AXIS * L) continue;
    const b = c.bounds;
    if (tip.x >= b.minX - reach && tip.x <= b.maxX + reach && tip.y >= b.minY - reach && tip.y <= b.maxY + reach) return false;
  }
  for (const s of longs) {
    if (s.id === own.h.id || s.id === own.v.id || s.length < LONG_STROKE_OF_AXIS * L) continue;
    if (dist(s.a, tip) <= reach || dist(s.b, tip) <= reach) return false;
  }
  return true;
}

// ===== A plane, once its axes are found =====

interface Ctx {
  state: SessionState;
  inks: Map<string, Ink>;
  /** Ink that is some other plane's, a tick, a head: not for a second claim. */
  claimed: Set<string>;
  writing: Set<string>;
  phrases: Phrase[];
  closed: Ink[];
  longs: Straight[];
  fits: boolean;
}

/** Heads on an axis: at which of its tips, and the strokes a head drawn apart is made of. */
function headsAt(ctx: Ctx, axis: Straight, neg: Point, pos: Point): { neg: boolean; pos: boolean; ids: string[] } {
  const r = headsOf(ctx.state, axis.id);
  const out = { neg: false, pos: false, ids: [] as string[] };
  if (!r) return out;
  for (const end of [r.start, r.end]) {
    const h = end.heads[0];
    if (!h || (h.kind !== 'arrow' && h.kind !== 'triangle')) continue;
    const tip = h.tip ?? end.point;
    if (dist(tip, pos) <= dist(tip, neg)) out.pos = true;
    else out.neg = true;
    for (const id of h.ids) if (id !== axis.id) out.ids.push(id);
  }
  return out;
}

interface AxisFrame {
  /** Unit vector along the axis towards larger values, and across it. */
  d: Point;
  n: Point;
  /** Distance from the crossing to each tip along `d` (signed). */
  neg: number;
  pos: number;
  L: number;
  scale: number;
}

const along = (X: Point, f: AxisFrame, p: Point) => dot(sub(p, X), f.d);
const across = (X: Point, f: AxisFrame, p: Point) => dot(sub(p, X), f.n);

/** Short straight strokes across an axis. */
function ticksOf(ctx: Ctx, X: Point, f: AxisFrame, axisIds: ReadonlySet<string>): { id: string; s: number }[] {
  const out: { id: string; s: number }[] = [];
  const maxLen = Math.min(TICK_MAX_OF_AXIS * f.L, TICK_MAX_PX * f.scale);
  for (const ink of ctx.inks.values()) {
    if (axisIds.has(ink.id) || ctx.claimed.has(ink.id) || ctx.writing.has(ink.id) || ink.closed) continue;
    const size = sizeOf(ink.bounds);
    if (size < TICK_MIN_PX * f.scale || size > maxLen) continue;
    if (ink.straightness < TICK_STRAIGHT_MIN) continue;
    // The chord between the two points farthest apart.
    let a = ink.pts[0], b = ink.pts[0];
    for (const p of ink.pts) if (dist(p, ink.pts[0]) > dist(b, ink.pts[0])) b = p;
    for (const p of ink.pts) if (dist(p, b) > dist(a, b)) a = p;
    const chord = sub(b, a);
    const cl = len(chord);
    if (!(cl > 0)) continue;
    const u = unit(chord);
    // Square across the axis within TICK_PERP_DEG.
    const offPerp = Math.acos(Math.min(1, Math.abs(dot(u, f.d)))) * DEG;
    if (90 - offPerp > TICK_PERP_DEG) continue;
    const mid = centreOf(ink.bounds);
    const nrm = Math.abs(across(X, f, mid));
    if (nrm > Math.max(TICK_ON_AXIS * cl, 4 * f.scale)) continue;
    const s = along(X, f, mid);
    if (s < -f.neg - Math.max(0.05 * f.L, 10 * f.scale) || s > f.pos + Math.max(0.05 * f.L, 10 * f.scale)) continue;
    out.push({ id: ink.id, s });
  }
  return out.sort((p, q) => p.s - q.s);
}

/** Linear least squares v = b + a·s over (s, v) pairs: slope in value per canvas unit, intercept at the crossing. */
function line(pairs: readonly { s: number; v: number }[]): { a: number; b: number } | null {
  const n = pairs.length;
  const ms = pairs.reduce((x, p) => x + p.s, 0) / n, mv = pairs.reduce((x, p) => x + p.v, 0) / n;
  let ss = 0, sv = 0;
  for (const p of pairs) { ss += (p.s - ms) ** 2; sv += (p.s - ms) * (p.v - mv); }
  if (!(ss > 0)) return null;
  const a = sv / ss;
  return { a, b: mv - a * ms };
}

interface Solved {
  scale: PlaneAxisScale;
  spread: number;
}

/** One axis's scale from the numbers written at it, its ticks, or nothing. */
function solveScale(f: AxisFrame, pairs: { s: number; v: number }[], ticks: readonly PlaneTick[], fallbackPerUnit: number | null, name: string, sameAs: string | null): Solved {
  const distinct = pairs.filter((p, i) => pairs.findIndex((q) => Math.abs(q.s - p.s) < 1e-6) === i && pairs.findIndex((q) => Math.abs(q.v - p.v) < 1e-9) === i);
  const mk = (perUnit: number, at: number, how: ScaleHow, reason: string): PlaneAxisScale => ({
    perUnit,
    at,
    lo: at - f.neg / perUnit,
    hi: at + f.pos / perUnit,
    how,
    reason,
  });
  if (distinct.length >= 2) {
    const fit = line(distinct);
    if (fit && fit.a > 0) {
      const vals = [...new Set(distinct.map((p) => p.v))].sort((x, y) => x - y);
      const step = median(vals.slice(1).map((v, i) => v - vals[i]));
      let b = fit.b;
      const snapped = step > 0 ? Math.round(b / step) * step : b;
      if (step > 0 && Math.abs(b - snapped) <= SCALE_AGREE * step) b = snapped;
      // The slope through the zero it settled on.
      let sv = 0, ss = 0;
      for (const p of distinct) { sv += p.s * (p.v - b); ss += p.s * p.s; }
      const a = b === fit.b || !(ss > 0) ? fit.a : sv / ss;
      const perUnit = 1 / a;
      let spread = 0;
      for (const p of distinct) spread = Math.max(spread, Math.abs(p.s - (p.v - b) / a));
      const unitsApart = step > 0 ? step * perUnit : perUnit;
      const agrees = spread <= Math.max(SCALE_AGREE * unitsApart, 6 * f.scale);
      return {
        spread,
        scale: mk(perUnit, b, 'numbers', `1 ${name} unit is ${perUnit.toFixed(perUnit < 10 ? 1 : 0)} px, from the ${distinct.map((p) => num(p.v)).slice(0, 4).join(', ')} written at ${name === 'x' || name === 'y' ? `the ${name} axis` : 'it'}${b !== 0 ? `, which puts ${num(b)} at the crossing` : ''}${agrees ? '' : ` — though they do not all sit where their ticks do (up to ${Math.round(spread / f.scale)} px off)`}`),
      };
    }
  }
  if (distinct.length === 1 && Math.abs(distinct[0].s) > 4 * f.scale && distinct[0].v !== 0 && Math.sign(distinct[0].s) === Math.sign(distinct[0].v)) {
    const perUnit = distinct[0].s / distinct[0].v;
    return { spread: 0, scale: mk(perUnit, 0, 'number and origin', `1 ${name} unit is ${perUnit.toFixed(perUnit < 10 ? 1 : 0)} px, from the ${num(distinct[0].v)} written at it and the crossing taken as 0`) };
  }
  const gaps = ticks.map((t) => t.along).sort((a, b) => a - b);
  const steps = gaps.slice(1).map((v, i) => v - gaps[i]).filter((d) => d > 4 * f.scale);
  if (ticks.length >= 2 && steps.length) {
    const perUnit = median(steps);
    return { spread: 0, scale: mk(perUnit, 0, 'ticks', `1 ${name} unit is ${perUnit.toFixed(perUnit < 10 ? 1 : 0)} px: one tick is one unit, and no number says otherwise`) };
  }
  if (fallbackPerUnit) {
    return {
      spread: 0,
      scale: mk(fallbackPerUnit, 0, 'assumed', sameAs ? `the scale assumed: 1 ${name} unit is ${fallbackPerUnit.toFixed(fallbackPerUnit < 10 ? 1 : 0)} px, the same as ${sameAs}` : `the scale assumed: the axes ${countWord(DEFAULT_UNITS)} units from the crossing, 1 unit ${fallbackPerUnit.toFixed(fallbackPerUnit < 10 ? 1 : 0)} px`),
    };
  }
  return { spread: 0, scale: mk(1, 0, 'assumed', 'the scale assumed') };
}

/** A point on the plane to the precision a hand draws it to: the power of ten of a unit that is at most ten of its pixels. */
function coordOf(v: number, perUnit: number): number {
  const prec = Math.pow(10, Math.floor(Math.log10(Math.max(1e-9, 10 / perUnit))));
  return Number((Math.round(v / prec) * prec).toFixed(6));
}

/**
 * Read one plane from a pair of axes and the marks round them. Returns null when what is round them says it is not one.
 */
function planeFrom(ctx: Ctx, pr: Pair): PlanePart | null {
  const { X, ex, ey } = pr;
  const scale = pr.scale;
  const axisIds = new Set([pr.h.id, pr.v.id]);
  const fx: AxisFrame = { d: ex, n: ey, neg: Math.max(0, dot(sub(X, pr.left), ex)), pos: dot(sub(pr.right, X), ex), L: pr.h.length, scale };
  const fy: AxisFrame = { d: ey, n: ex, neg: Math.max(0, dot(sub(X, pr.bottom), ey)), pos: dot(sub(pr.top, X), ey), L: pr.v.length, scale };

  // Heads: at the axes' tips, or a chevron drawn apart.
  const hx = headsAt(ctx, pr.h, pr.left, pr.right);
  const hy = headsAt(ctx, pr.v, pr.bottom, pr.top);
  const owned = new Set<string>([...axisIds, ...hx.ids, ...hy.ids]);
  const savedClaim = new Set(ctx.claimed);
  for (const id of owned) ctx.claimed.add(id);

  // Ticks.
  const tx = ticksOf(ctx, X, fx, axisIds);
  const ty = ticksOf(ctx, X, fy, axisIds);
  const tickIds = new Set([...tx, ...ty].map((t) => t.id));
  // A mark that is a tick of both axes (at the crossing) belongs to neither.
  for (const t of tx) if (ty.some((u) => u.id === t.id)) tickIds.delete(t.id);
  const ticksX: PlaneTick[] = tx.filter((t) => tickIds.has(t.id)).map((t) => ({ id: t.id, along: t.s }));
  const ticksY: PlaneTick[] = ty.filter((t) => tickIds.has(t.id)).map((t) => ({ id: t.id, along: t.s }));
  for (const id of tickIds) ctx.claimed.add(id);

  // Numbers and names.
  const numbers: PlaneNumber[] = [];
  const words: string[] = [];
  let originLabel: PlanePart['originLabel'];
  const names: { x?: Phrase; y?: Phrase } = {};
  const originZone = Math.max(ORIGIN_NEAR * Math.min(pr.h.length, pr.v.length), ORIGIN_PX * scale);
  const spacing = (ts: PlaneTick[]) => {
    const g = ts.map((t) => t.along).sort((a, b) => a - b);
    const d = g.slice(1).map((v, i) => v - g[i]).filter((v) => v > 4 * scale);
    return d.length ? median(d) : 40 * scale;
  };
  const sp = { x: spacing(ticksX), y: spacing(ticksY) };
  const tipOf = (f: AxisFrame, pos: boolean) => add(X, mul(f.d, pos ? f.pos : -f.neg));
  for (const ph of ctx.phrases) {
    if (ph.ids.some((id) => ctx.claimed.has(id))) continue;
    const v = tickValueOf(ph.text);
    const nx = Math.abs(across(X, fx, ph.centre)), ny = Math.abs(across(X, fy, ph.centre));
    if (v !== null) {
      if (dist(ph.centre, X) <= originZone) {
        if (!originLabel) originLabel = { id: ph.id, ids: ph.ids };
        continue;
      }
      const nearX = nx <= Math.max(NUM_NEAR * fx.L, NUM_NEAR_PX * scale), nearY = ny <= Math.max(NUM_NEAR * fy.L, NUM_NEAR_PX * scale);
      const sxv = along(X, fx, ph.centre), syv = along(X, fy, ph.centre);
      const inX = nearX && sxv >= -fx.neg - NUM_SLACK * fx.L - 10 * scale && sxv <= fx.pos + NUM_SLACK * fx.L + 10 * scale;
      const inY = nearY && syv >= -fy.neg - NUM_SLACK * fy.L - 10 * scale && syv <= fy.pos + NUM_SLACK * fy.L + 10 * scale;
      const axis = inX && inY ? (nx / Math.max(1, fx.L) <= ny / Math.max(1, fy.L) ? 'x' : 'y') : inX ? 'x' : inY ? 'y' : null;
      if (!axis) continue;
      const ts = axis === 'x' ? ticksX : ticksY;
      const s = axis === 'x' ? sxv : syv;
      const reach = Math.max(0.5 * sp[axis], NUM_AT_TICK_PX * scale);
      const tk = ts.filter((t) => t.value === undefined).map((t) => ({ t, d: Math.abs(t.along - s) })).filter((x) => x.d <= reach).sort((p, q) => p.d - q.d)[0];
      numbers.push({ id: ph.id, ids: ph.ids, text: ph.text, value: v, axis, along: tk ? tk.t.along : s, atTick: !!tk, bounds: ph.bounds });
      if (tk) { tk.t.value = v; tk.t.numberId = ph.id; }
      continue;
    }
    const nm = axisNameOf(ph.text);
    if (nm) {
      const reachX = Math.max(NAME_REACH * fx.L, NAME_PX * scale), reachY = Math.max(NAME_REACH * fy.L, NAME_PX * scale);
      const dx = dist(ph.centre, tipOf(fx, true)), dy = dist(ph.centre, tipOf(fy, true));
      if (dx <= reachX && dx <= dy && !names.x) names.x = ph;
      else if (dy <= reachY && !names.y) names.y = ph;
    }
  }
  for (const n of numbers) { words.push(...n.ids); for (const id of n.ids) ctx.claimed.add(id); }
  if (originLabel) { words.push(...originLabel.ids); for (const id of originLabel.ids) ctx.claimed.add(id); }
  for (const nm of [names.x, names.y]) if (nm) { words.push(...nm.ids); for (const id of nm.ids) ctx.claimed.add(id); }

  // Unread writing at an axis's positive end: a small mark there that is no tick, head or curve.
  let unreadAt = 0;
  for (const ink of ctx.inks.values()) {
    if (ctx.claimed.has(ink.id) || !ctx.writing.has(ink.id)) continue;
    const c = centreOf(ink.bounds);
    for (const [f, nameSlot] of [[fx, names.x], [fy, names.y]] as const) {
      if (nameSlot) continue;
      if (dist(c, tipOf(f, true)) <= Math.max(NAME_REACH * f.L, NAME_PX * scale)) { unreadAt++; ctx.claimed.add(ink.id); }
    }
  }

  // The scale of each axis.
  const pairsOf = (axis: 'x' | 'y') => numbers.filter((n) => n.axis === axis).map((n) => ({ s: n.along, v: n.value }));
  const nameOf = (axis: 'x' | 'y') => (axis === 'x' ? names.x : names.y)?.text.trim() ?? axis;
  const shorter = Math.min(fx.pos, fy.pos);
  const defaultPerUnit = shorter / DEFAULT_UNITS;
  const sx = solveScale(fx, pairsOf('x'), ticksX, defaultPerUnit, nameOf('x'), null);
  const sy = solveScale(fy, pairsOf('y'), ticksY, sx.scale.how === 'assumed' ? defaultPerUnit : sx.scale.perUnit, nameOf('y'), sx.scale.how !== 'assumed' && !pairsOf('y').length && ticksY.length < 2 ? `the ${nameOf('x')} axis` : null);
  // An axis with ticks and numbers on one side and nothing on the other keeps the same unit across.
  if (sx.scale.how === 'assumed' && sy.scale.how !== 'assumed' && !pairsOf('x').length && ticksX.length < 2) {
    const again = solveScale(fx, [], ticksX, sy.scale.perUnit, nameOf('x'), `the ${nameOf('y')} axis`);
    sx.scale = again.scale;
  }

  // Everything is on one plane's geometry now.
  const geo: PlaneGeometry = { origin: X, ex, ey, x: sx.scale, y: sy.scale };

  // What is drawn on it.
  const curves: PlaneCurve[] = [];
  const points: PlanePoint[] = [];
  const marked: string[] = [];
  const planeW = (geo.x.hi - geo.x.lo) * geo.x.perUnit, planeH = (geo.y.hi - geo.y.lo) * geo.y.perUnit;
  const padPx = 0.05 * Math.max(planeW, planeH) + 6 * scale;
  const inside = (p: Point) => {
    const q = canvasToPlane(geo, p);
    return q.x >= geo.x.lo - padPx / geo.x.perUnit && q.x <= geo.x.hi + padPx / geo.x.perUnit && q.y >= geo.y.lo - padPx / geo.y.perUnit && q.y <= geo.y.hi + padPx / geo.y.perUnit;
  };
  for (const ink of ctx.inks.values()) {
    if (ctx.claimed.has(ink.id) || ctx.writing.has(ink.id)) continue;
    if (curves.length + points.length >= MAX_ON_PLANE) break;
    const size = sizeOf(ink.bounds);
    const shareIn = ink.pts.filter(inside).length / ink.pts.length;
    if (shareIn < CURVE_INSIDE) continue;
    if (size <= POINT_MAX_PX * ink.scale) {
      // A dot or a small ring: compact (its path no more than a few times its size).
      if (pathLength(ink.pts) <= 5 * size + 4 * ink.scale) {
        const c = centreOf(ink.bounds);
        const q = canvasToPlane(geo, c);
        const px = coordOf(q.x, geo.x.perUnit), py = coordOf(q.y, geo.y.perUnit);
        points.push({ id: ink.id, at: c, x: px, y: py, text: `(${num(px)}, ${num(py)})`, ring: ink.closed });
        ctx.claimed.add(ink.id);
      }
      continue;
    }
    if (ink.closed) continue;
    if (size < CURVE_MIN_PX * ink.scale || (Math.max(...ink.pts.map((p) => canvasToPlane(geo, p).x)) - Math.min(...ink.pts.map((p) => canvasToPlane(geo, p).x))) * geo.x.perUnit < CURVE_MIN_OF_PLANE * planeW) {
      continue;
    }
    const fit: CurveFit = ctx.fits ? fitCurve(geo, ink.pts, ink.scale) : { ok: false, reason: 'not fitted', fits: [] };
    if (!ctx.fits || (fit.ok && fit.fits.length)) {
      curves.push({ id: ink.id, points: ink.pts, fit, scale: ink.scale });
      ctx.claimed.add(ink.id);
    } else {
      marked.push(ink.id);
      ctx.claimed.add(ink.id);
    }
  }

  // Evidence, and how sure.
  const ev: { what: string; weight: number }[] = [{ what: pr.junction === 'cross' ? 'two long strokes crossing near the right angle' : pr.junction === 'tee' ? 'a long stroke starting on another, near the right angle' : 'two long strokes meeting at their ends, near the right angle', weight: EVIDENCE.geometry[pr.junction] }];
  const posHeaded = (hx.pos ? 1 : 0) + (hy.pos ? 1 : 0);
  const anyHeaded = (hx.pos || hx.neg ? 1 : 0) + (hy.pos || hy.neg ? 1 : 0);
  if (posHeaded === 2 || (anyHeaded === 2 && posHeaded >= 1)) ev.push({ what: 'an arrowhead on both axes', weight: EVIDENCE.arrows.both });
  else if (posHeaded === 1 || anyHeaded >= 1) ev.push({ what: 'an arrowhead on one axis', weight: EVIDENCE.arrows.one });
  const tickAxes = (ticksX.length >= 2 ? 1 : 0) + (ticksY.length >= 2 ? 1 : 0);
  if (tickAxes === 2) ev.push({ what: 'ticks across both axes', weight: EVIDENCE.ticks.both });
  else if (tickAxes === 1) ev.push({ what: 'ticks across an axis', weight: EVIDENCE.ticks.one });
  const atTicks = numbers.filter((n) => n.atTick).length;
  if (numbers.length) {
    const base = numbers.length >= 2 ? EVIDENCE.numbers.many : EVIDENCE.numbers.one;
    ev.push({ what: `${countWord(numbers.length)} number${numbers.length === 1 ? '' : 's'} written at the axes${atTicks ? ' by their ticks' : ''}`, weight: atTicks ? base : base * EVIDENCE.numbers.loose });
  }
  const named = (names.x ? 1 : 0) + (names.y ? 1 : 0);
  if (named === 2) ev.push({ what: 'both axes named', weight: EVIDENCE.names.both });
  else if (named === 1) ev.push({ what: 'an axis named', weight: EVIDENCE.names.one });
  else if (unreadAt) ev.push({ what: 'writing at an axis’s end', weight: EVIDENCE.names.unread });
  const settled = 1 - ev.reduce((p, e) => p * (1 - e.weight), 1);

  // The tips: free of boxes and of other long strokes' ends — the arms' far ends, and the near ends where they do not meet the crossing.
  const tips: Point[] = [pr.right, pr.top];
  if (fx.neg > Math.max(AT_END * fx.L, END_PX * scale)) tips.push(pr.left);
  if (fy.neg > Math.max(AT_END * fy.L, END_PX * scale)) tips.push(pr.bottom);
  const free = tips.every((t) => tipFree(t, pr, ctx.closed, ctx.longs));
  // A corner's near ends meet at the crossing; the far ends are the axes' own and must be free too (a triangle's hypotenuse ends there).
  if (!free) {
    for (const id of owned) if (!savedClaim.has(id)) ctx.claimed.delete(id);
    return null;
  }
  const confidence = MAX * settled * pr.sure;

  // The summary, in the person's words.
  const rng = (a: PlaneAxisScale, nm: string) => `${nm} from ${num(a.lo)} to ${num(a.hi)}`;
  const xn = nameOf('x'), yn = nameOf('y');
  const assumedAny = sx.scale.how === 'assumed' || sy.scale.how === 'assumed';
  const curveWords = curves.length ? `, ${countWord(curves.length)} curve${curves.length === 1 ? '' : 's'}` : '';
  const pointWords = points.length ? `, ${countWord(points.length)} point${points.length === 1 ? '' : 's'}` : '';
  const summary = `${rng(sx.scale, xn)}, ${rng(sy.scale, yn)}${curveWords}${pointWords}${assumedAny ? ', the scale assumed' : ''}`;

  const xAxis: PlaneAxis = { id: pr.h.id, ids: [pr.h.id, ...hx.ids], negTip: pr.left, posTip: pr.right, neg: fx.neg, pos: fx.pos, heads: { neg: hx.neg, pos: hx.pos }, ticks: ticksX, ...(names.x ? { name: names.x.text.trim(), nameId: names.x.id } : {}) };
  const yAxis: PlaneAxis = { id: pr.v.id, ids: [pr.v.id, ...hy.ids], negTip: pr.bottom, posTip: pr.top, neg: fy.neg, pos: fy.pos, heads: { neg: hy.neg, pos: hy.pos }, ticks: ticksY, ...(names.y ? { name: names.y.text.trim(), nameId: names.y.id } : {}) };
  const marks = [pr.h.id, pr.v.id, ...hx.ids, ...hy.ids, ...tickIds, ...curves.map((c) => c.id), ...points.map((p) => p.id), ...marked];
  return {
    ...geo,
    id: pr.h.id,
    junction: pr.junction,
    xAxis,
    yAxis,
    numbers,
    ...(originLabel ? { originLabel } : {}),
    curves,
    points,
    marked,
    marks: [...new Set(marks)],
    words: [...new Set(words)],
    confidence,
    evidence: ev,
    scale,
    summary,
    reason: `${pr.reason}; ${ev.slice(1).map((e) => e.what).join(', ') || 'nothing else that only an axis has'}; ${sx.scale.reason}; ${sy.scale.reason}`,
  };
}

// ===== Reading a scope =====

/** Every plane the marks make, strongest first. Reads the board and changes nothing. */
export function planesIn(state: SessionState, scopeIds?: readonly string[], opts: PlaneOptions = {}): PlanePart[] {
  const marks = marksIn(state, scopeIds);
  const writing = new Set<string>();
  const isWriting = (m: { id: string; node: MMNode }) => isWord(m.node) || !!transcriptOf(m.node);
  const inks = new Map<string, Ink>();
  const inkOf = (m: { id: string; node: MMNode }): Ink | null => {
    const had = inks.get(m.id);
    if (had) return had;
    const fp = fingerprintOf(m.node);
    const pts = strokePointsOf(m.node);
    const bounds = boundsOf(m.node);
    if (!fp || !pts || pts.length < 3 || !bounds) return null;
    const sc = scaleOf(m.node);
    const ink: Ink = { id: m.id, node: m.node, pts, scale: sc, bounds, closed: fp.isClosed, straightness: fp.straightness, px: sizeOf(bounds) / sc };
    inks.set(m.id, ink);
    return ink;
  };
  // The cheap test before the costly ones: an axis is a long straight open stroke, and there must be a level one and a
  // plumb one. (Straightness and closure are the fingerprint's, which a move, a scale or a turn leaves as it was.)
  const hs: Straight[] = [], vs: Straight[] = [], longs: Straight[] = [];
  for (const m of marks) {
    const fp = fingerprintOf(m.node);
    if (!fp || fp.isClosed || fp.straightness < AXIS_STRAIGHT_MIN || isWriting(m)) continue;
    const ink = inkOf(m);
    if (!ink || ink.px < AXIS_MIN_PX) continue;
    const s = straightOf(ink);
    if (!s || s.dev > AXIS_STRAIGHT_DEV || s.length / s.scale < AXIS_MIN_PX) continue;
    longs.push(s);
    const tilt = Math.atan2(Math.abs(s.u.y), Math.abs(s.u.x)) * DEG;
    if (tilt <= AXIS_LEVEL_DEG) hs.push(s);
    else if (tilt >= 90 - AXIS_LEVEL_DEG) vs.push(s);
  }
  if (!hs.length || !vs.length) return [];
  const byLength = (a: Straight, b: Straight) => b.length - a.length;
  hs.sort(byLength);
  vs.sort(byLength);

  const pairs: Pair[] = [];
  for (const h of hs.slice(0, MAX_AXES)) {
    for (const v of vs.slice(0, MAX_AXES)) {
      const p = pairOf(h, v);
      if (p) pairs.push(p);
    }
  }
  if (!pairs.length) return [];
  pairs.sort((a, b) => b.sure - a.sure || Math.min(b.h.length, b.v.length) - Math.min(a.h.length, a.v.length));
  pairs.length = Math.min(pairs.length, MAX_PAIRS);
  // A pair is there: everything else on the board is read now (ticks, heads, curves, what could block a tip).
  const closed: Ink[] = [];
  for (const m of marks) {
    if (isWriting(m)) writing.add(m.id);
    const ink = inkOf(m);
    if (ink?.closed) closed.push(ink);
  }
  // Long against the closed marks round the crossing.
  const longEnough = (p: Pair) => {
    const near = closed.filter((c) => dist(centreOf(c.bounds), p.X) <= 1.5 * Math.max(p.h.length, p.v.length)).map((c) => sizeOf(c.bounds));
    return near.length < 2 || Math.min(p.h.length, p.v.length) >= LONG_OF_CLOSED * median(near);
  };
  const phrases = phrasesOf(state);
  const ctx: Ctx = { state, inks, claimed: new Set(), writing, phrases, closed, longs, fits: opts.fits !== false };

  // Strongest first, each stroke an axis of one plane only.
  const scored: { p: Pair; part: PlanePart }[] = [];
  for (const p of pairs.filter(longEnough)) {
    ctx.claimed = new Set();
    const part = planeFrom(ctx, p);
    if (part && part.confidence > 0) scored.push({ p, part });
  }
  scored.sort((a, b) => b.part.confidence - a.part.confidence || a.p.h.id.localeCompare(b.p.h.id) || a.p.v.id.localeCompare(b.p.v.id));
  const used = new Set<string>();
  const out: PlanePart[] = [];
  for (const { p, part } of scored) {
    if (used.has(p.h.id) || used.has(p.v.id)) continue;
    // Nothing is two planes' mark.
    if (part.marks.some((id) => used.has(id) && id !== p.h.id && id !== p.v.id)) continue;
    for (const id of part.marks) used.add(id);
    out.push(part);
  }
  // In the marks' own order.
  const order = new Map(marks.map((m, i) => [m.id, i]));
  out.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return out;
}

/**
 * The texts and writing a plane claims as its own — the numbers at its ticks, the zero at its crossing, the names
 * at its ends — when it is a plane for certain (`PLANE_CLAIM_FLOOR`). The dimensions leave these out: a 2 at a tick
 * is not the length of the axis it stands by.
 */
export function planeWordIds(state: SessionState): Set<string> {
  const out = new Set<string>();
  for (const p of planesIn(state, undefined, { fits: false })) {
    if (p.confidence < PLANE_CLAIM_FLOOR) continue;
    for (const id of p.words) out.add(id);
  }
  return out;
}

// ===== The sentence =====

function summaryOf(parts: readonly PlanePart[]): string {
  if (parts.length === 1) {
    const p = parts[0];
    const fits = p.curves.map((c) => (c.fit.ok && c.fit.fits[0] ? c.fit.fits[0].best.text : null)).filter((x): x is string => !!x);
    return fits.length === 1 && p.curves.length === 1 ? `${p.summary} (${fits[0]})` : p.summary;
  }
  return `${countWord(parts.length)} coordinate planes: ${parts.map((p) => p.summary).join('; ')}`;
}

// ===== The notation =====

/** What a scope is as coordinate planes, or null when it holds no pair of axes. Reads the board and changes nothing. */
export function readPlane(state: SessionState, scopeIds?: readonly string[], opts: PlaneOptions = {}): PlaneReading | null {
  const parts = planesIn(state, scopeIds, opts);
  if (!parts.length) return null;
  const nodes = state.nodes;
  const marks = marksIn(state, scopeIds);
  const writing = new Set(marks.filter((m) => isWord(m.node) || transcriptOf(m.node)).map((m) => m.id));
  const symbols: NotationSymbol[] = [];
  const inkOf = (id: string) => (nodes.get(id) ? strokePointsOf(nodes.get(id)!) ?? [] : []);
  const mk = (id: string, ids: string[], symbol: PlaneSymbolName, confidence: number, reason: string, outline: Point[]): NotationSymbol => {
    const role = PLANE_TABLE.symbols[symbol].role as Role;
    const xs = outline.map((p) => p.x), ys = outline.map((p) => p.y);
    return {
      id, ids, symbol, role, confidence, reason,
      readings: [{ symbol, role, confidence, reason }],
      outline,
      bounds: { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) },
      ports: [],
      labels: [],
    };
  };
  const labels: NotationLabel[] = [];
  for (const p of parts) {
    const c = p.confidence;
    const name = (a: PlaneAxis, def: string) => a.name ?? def;
    symbols.push(mk(p.xAxis.id, p.xAxis.ids, 'axis', Math.min(MAX, c + 0.1), `the ${name(p.xAxis, 'x')} axis, from ${num(p.x.lo)} to ${num(p.x.hi)}`, [p.xAxis.negTip, p.xAxis.posTip]));
    symbols.push(mk(p.yAxis.id, p.yAxis.ids, 'axis', Math.min(MAX, c + 0.1), `the ${name(p.yAxis, 'y')} axis, from ${num(p.y.lo)} to ${num(p.y.hi)}`, [p.yAxis.negTip, p.yAxis.posTip]));
    for (const [ax, ticks] of [[p.xAxis, p.xAxis.ticks], [p.yAxis, p.yAxis.ticks]] as const) {
      if (ticks.length) symbols.push(mk(ticks[0].id, ticks.map((t) => t.id), 'tick', c, `${countWord(ticks.length)} tick${ticks.length === 1 ? '' : 's'} across the ${ax === p.xAxis ? 'x' : 'y'} axis`, ticks.flatMap((t) => inkOf(t.id).slice(0, 2))));
    }
    for (const cv of p.curves) {
      const top = cv.fit.ok ? cv.fit.fits[0] : undefined;
      symbols.push(mk(cv.id, [cv.id], 'curve', top ? Math.min(MAX, top.confidence) : c * 0.5, top ? top.say : cv.fit.ok ? cv.fit.note ?? 'a stroke on the plane' : cv.fit.reason, cv.points));
    }
    for (const pt of p.points) symbols.push(mk(pt.id, [pt.id], 'point', c, `the point ${pt.text}`, [pt.at]));
    for (const n of p.numbers) labels.push({ id: n.id, of: n.axis === 'x' ? p.xAxis.id : p.yAxis.id, where: 'beside', text: n.text, bounds: n.bounds, role: PLANE_TABLE.label.role as Role, confidence: n.atTick ? MAX * 0.9 : MAX * 0.6, reason: `${n.text} at the ${n.axis} axis${n.atTick ? ', by its tick' : ''}` });
    for (const [ax, axis] of [[p.xAxis, 'x'], [p.yAxis, 'y']] as const) {
      if (ax.nameId) labels.push({ id: ax.nameId, of: ax.id, where: 'beside', text: ax.name, role: PLANE_TABLE.label.role as Role, confidence: MAX * 0.8, reason: `“${ax.name}” at the end of the ${axis} axis: its name` });
    }
  }

  // What each mark plays: the plane's own marks, the rest placed nowhere.
  const roles: Record<string, Role> = {};
  const weight: Record<string, number> = {};
  const put = (id: string, role: Role, w: number) => {
    if (roles[id]) return;
    roles[id] = role;
    weight[id] = w;
  };
  for (const s of symbols) for (const id of s.ids) put(id, s.role, 1);
  for (const p of parts) {
    for (const id of p.marked) put(id, 'annotation', 0.7);
    for (const id of p.xAxis.ids.concat(p.yAxis.ids)) put(id, 'container', 1);
  }
  const unplaced: string[] = [];
  const scope = marks.map((m) => m.id);
  for (const id of scope) {
    if (roles[id]) continue;
    if (writing.has(id)) { put(id, 'label', 0.5); continue; }
    put(id, 'unclassified', 0);
    unplaced.push(id);
  }
  for (const id of Object.keys(roles)) if (!scope.includes(id)) delete roles[id];
  const coverage = scope.length ? scope.reduce((a, id) => a + (weight[id] ?? 0), 0) / scope.length : 1;
  const best = Math.max(...parts.map((p) => p.confidence));
  const confidence = Math.min(MAX, best * Math.sqrt(Math.max(0, coverage)));
  if (!(confidence > 0)) return null;
  const summary = summaryOf(parts);
  const counts: Record<string, number> = {
    axis: parts.length * 2,
    tick: parts.reduce((a, p) => a + p.xAxis.ticks.length + p.yAxis.ticks.length, 0),
    curve: parts.reduce((a, p) => a + p.curves.length, 0),
    point: parts.reduce((a, p) => a + p.points.length, 0),
    number: parts.reduce((a, p) => a + p.numbers.length, 0),
    name: parts.reduce((a, p) => a + (p.xAxis.name ? 1 : 0) + (p.yAxis.name ? 1 : 0), 0),
  };
  return {
    notation: 'plane',
    name: PLANE_TABLE.name,
    confidence,
    summary,
    reason: `${summary} — ${parts.map((p) => p.reason).join('; ')}${unplaced.length ? `, and ${countWord(unplaced.length)} mark${unplaced.length === 1 ? '' : 's'} it places nowhere` : ''}`,
    symbols,
    connectors: [],
    labels,
    roles,
    unplaced,
    counts,
    planes: parts,
  };
}

export const PLANE: Notation = {
  id: 'plane',
  name: PLANE_TABLE.name,
  describes: PLANE_TABLE.describes,
  symbols: SYMBOLS.map((name) => ({ name, role: PLANE_TABLE.symbols[name].role as Role, describes: PLANE_TABLE.symbols[name].describes, ports: 'none — a mark on a plane, not a place a line is tied' })),
  connectors: [],
  read: (state, scopeIds) => readPlane(state, scopeIds),
};

// A plane's geometry, for a caller that has the part and wants to put a point of the plane on the canvas.
export { planeToCanvas, canvasToPlane };

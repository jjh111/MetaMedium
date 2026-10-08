// Waves — a stroke that oscillates along a line (MATHS-SPEC §8, M27).
//
// A Feynman diagram draws its bosons as lines that oscillate: a photon, a W or
// a Z as a **wavy** line, a gluon as a **curly** one — loops in a row, a coil
// — and some hands draw a boson as a **zigzag**. The shape rung has no word for
// any of them (a wavy line turns many times, low and wide, which is what
// writing looks like to it), so this reads a stroke's ink and says whether it
// oscillates about an axis, and how:
//
//   - **Wavy and zigzag** — the stroke's heading swings from one side of its
//     axis to the other and back. Each swing's turn is where the stroke crosses
//     its axis (a node), so the nodes are found as the heading's alternating
//     extremes, past a hysteresis of WAVE_SWING_DEG that a hand's tremor never
//     reaches; the axis is the polyline through them — straight, or gently
//     curved, as a photon in a loop is an arc (the trap: the axis is a smoothed
//     curve, never only the chord). Between two nodes is a half-period, and
//     its crest is the point farthest from the chord between them. A zigzag
//     turns at its crest all at once (ZIGZAG_SHARP of the half-period's turn
//     within ZIGZAG_WINDOW of the crest); a wavy line turns all along.
//   - **Curly** — a coil turns the same way all along, a full turn a loop, so
//     its heading never swings back: the loops are counted by its turning, and
//     each loop's centre is the mean of its ink; the axis runs through them.
//
// **What makes it a wave and not writing** (the trap — cursive oscillates):
// a wave is **regular** — its crests stand off the axis alike, its
// half-periods are alike and its nodes keep a line (together within
// WAVE_IRREGULAR), the crests alternate sides — and it is **long against its
// amplitude**: at least WAVE_LONG times as long as its crests stand off it, and
// at least WAVE_MIN_HALF_PERIODS half-periods. Writing is neither: its letters
// rise to different heights (an ascender beside an x-height), the middle of a
// word jumps with them, and a word is a few times as long as it is tall. A coil
// of loops alike, long against their size, is a gluon; the loops of cursive
// are tall and few. **What ink alone cannot settle**: a scribble as regular as
// a wave — a cursive *mmm*, some of the corpus's scribbles — IS one by its
// ink, a few in a hundred of them; what tells it from a photon is where it
// stands, which is the notation's to read (a boson line meets a vertex).
//
// Every threshold is a ratio of the stroke's own measures, or the hand's on
// screen (scaled by the stroke's own world-units-per-screen-pixel). Derived:
// nothing is written, and a stroke's reading is a pure function of its ink.

import type { Point } from '../types';
import type { MMNode } from '../session/nodes';
import { getRep, placed } from '../session/nodes';
import { MAX_TIER0_CONFIDENCE } from '../recognition';

export type WaveKind = 'wavy' | 'curly' | 'zigzag';

export interface WaveReading {
  kind: WaveKind;
  /** The line the wave runs along, from the stroke's first point to its last, through its nodes (a curly line's loop centres). */
  axis: Point[];
  /** How long the axis is. */
  length: number;
  /** How far its crests stand off the axis, on average — a coil's loops, their radius. */
  amplitude: number;
  /** How far along the axis from one node to the next, on average — a coil's, from one loop to the next, halved. */
  halfPeriod: number;
  /** How many half-periods it runs, the part ones at its ends counted by their share — a coil's loops twice. */
  halfPeriods: number;
  /** How far apart its crests' offsets, and its half-periods, are: each a coefficient of variation. */
  spread: { amplitude: number; period: number };
  /** How far its nodes (a coil's loop centres) stray from the axis their neighbours keep, as a share of its amplitude. */
  wander: number;
  /** The three together: the root of their squares — what WAVE_IRREGULAR bounds. */
  irregular: number;
  /** How far the axis turns from end to end, in degrees: 0 for a straight wave, 180 for a half circle. */
  bend: number;
  /** 0–1, below the shape rung's own ceiling. */
  confidence: number;
  reason: string;
}

// ===== Thresholds — ratios of the stroke's own measures, or the hand's on screen =====

/** A wave runs at least this many half-periods (a coil, this many halves of a loop: two loops). */
export const WAVE_MIN_HALF_PERIODS = 3;
/** …and is at least this many times as long as its crests stand off its axis. Writing is a few times as long as it is tall. */
export const WAVE_LONG = 15;
/** A coil is at least this many times as long as its loops' radius: three loops or so side by side. Cursive's loops are tall and few. */
export const CURLY_LONG = 5;
/**
 * How irregular it may be: its crests' offsets and its half-periods each as a
 * coefficient of variation, and how far its nodes stray from the axis their
 * neighbours keep (a share of its amplitude), taken together (the root of
 * their squares). Letters rise to different heights, a word's middle line
 * jumps with them, and the three together tell it from a wave far better
 * than any one alone.
 */
export const WAVE_IRREGULAR = 0.2;
/** The heading must swing back by this many degrees before a node is counted: past what a hand's tremor turns a straight line. */
export const WAVE_SWING_DEG = 20;
/** Its axis is at least this long on screen. */
export const WAVE_MIN_PX = 40;
/** Its crests stand off the axis by at least this much on screen — more than a straight line's wobble. */
export const WAVE_AMPLITUDE_PX = 2;
/** Its axis turns no more than this many degrees end to end: a photon in a loop is an arc, not a circle. */
export const WAVE_BEND_MAX = 220;
/** A zigzag turns at least this share of each half-period's turn within ZIGZAG_WINDOW of its crest; a wavy line turns all along. */
export const ZIGZAG_SHARP = 0.62;
/** …the window, as a share of the half-period either side of the crest. */
export const ZIGZAG_WINDOW = 0.08;
/** A coil turns at least this many full turns one way. A wavy line on the most bent axis allowed turns well under one and a half. */
export const CURLY_MIN_LOOPS = 1.75;
/** A node's neighbours this many either side say where the axis has drifted to. */
const DRIFT_SPAN = 2;
/** A wave with fewer nodes than this runs straight: too few to tell a bend or a drift from a word's jumping middle. */
export const CURVE_NODES = 6;
/** Where the heading stands within this share of a swing of its extreme is that extreme's plateau, whose middle is the node (a zigzag's straight run). */
const PLATEAU = 0.2;
/** At most this many points are read: a stroke is resampled evenly along its path. */
const MAX_SAMPLES = 480;

const MAX = MAX_TIER0_CONFIDENCE;
const DEG = 180 / Math.PI;
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const ramp = (v: number, lo: number, hi: number) => Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : 0);
/** A coefficient of variation: how far the values stray from their mean, as a share of it. */
function spreadOf(xs: readonly number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  if (!(m > 0)) return Infinity;
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length) / m;
}
const fix = (x: number, d = 2) => x.toFixed(d);

function pathLength(pts: readonly Point[]): number {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += dist(pts[i], pts[i - 1]);
  return s;
}

/** The path walked at an even step: `n + 1` points from its first to its last. */
function resample(pts: readonly Point[], n: number): Point[] {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i], pts[i - 1]));
  const L = cum[cum.length - 1];
  const out: Point[] = [];
  let j = 1;
  for (let k = 0; k <= n; k++) {
    const d = (k / n) * L;
    while (j < cum.length - 1 && cum[j] < d) j++;
    const a = pts[j - 1], b = pts[j];
    const span = cum[j] - cum[j - 1];
    const u = span > 0 ? (d - cum[j - 1]) / span : 0;
    out.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
  }
  return out;
}

/** A moving mean over `half` points either side, the window shrinking at the ends so the first and last points stay. */
function smooth(pts: readonly Point[], half: number): Point[] {
  if (half < 1) return pts.slice();
  const n = pts.length;
  return pts.map((_, i) => {
    const h = Math.min(half, i, n - 1 - i);
    let x = 0, y = 0;
    for (let k = i - h; k <= i + h; k++) {
      x += pts[k].x;
      y += pts[k].y;
    }
    return { x: x / (2 * h + 1), y: y / (2 * h + 1) };
  });
}

/** The heading of each step, unwrapped so it runs on through a full turn. */
function headings(pts: readonly Point[]): number[] {
  const out: number[] = [];
  let prev = 0;
  for (let i = 1; i < pts.length; i++) {
    let a = Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x);
    if (out.length) {
      while (a - prev > Math.PI) a -= 2 * Math.PI;
      while (a - prev < -Math.PI) a += 2 * Math.PI;
    }
    out.push(a);
    prev = a;
  }
  return out;
}

/** The heading's alternating extremes, each confirmed once it has swung back by `swing`. */
function swings(theta: readonly number[], swing: number): number[] {
  const out: number[] = [];
  let hi = 0, lo = 0, mode = 0;
  for (let i = 1; i < theta.length; i++) {
    if (mode === 0) {
      if (theta[i] > theta[hi]) hi = i;
      if (theta[i] < theta[lo]) lo = i;
      if (theta[i] - theta[lo] >= swing) {
        out.push(lo);
        mode = 1;
        hi = i;
      } else if (theta[hi] - theta[i] >= swing) {
        out.push(hi);
        mode = -1;
        lo = i;
      }
    } else if (mode === 1) {
      if (theta[i] > theta[hi]) hi = i;
      else if (theta[hi] - theta[i] >= swing) {
        out.push(hi);
        mode = -1;
        lo = i;
      }
    } else {
      if (theta[i] < theta[lo]) lo = i;
      else if (theta[i] - theta[lo] >= swing) {
        out.push(lo);
        mode = 1;
        hi = i;
      }
    }
  }
  return out;
}

const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

/** The wave a stroke's ink draws, read at the hand's scale (world units per screen pixel), or null when it draws none. */
export function waveOf(raw: readonly Point[], scale = 1): WaveReading | null {
  if (raw.length < 12) return null;
  const P = pathLength(raw);
  if (!(P > 0) || P / scale < WAVE_MIN_PX) return null;
  const n = Math.min(MAX_SAMPLES, Math.max(64, Math.round(P / (0.75 * scale))));
  const step = P / n;
  // A light smoothing, two pixels on screen either side: a sensor's grain, never a wave's.
  const pts = smooth(resample(raw, n), Math.round((2 * scale) / step));
  const theta = headings(pts);
  const loops = Math.abs(theta[theta.length - 1] - theta[0]) / (2 * Math.PI);
  if (loops >= CURLY_MIN_LOOPS) return curlyOf(pts, theta, loops, scale);
  return swingOf(pts, theta, scale);
}

/** The smooth curve an axis runs along: a straight line, or a circle when the nodes bend round one. */
interface Fit {
  /** Signed distance from the curve: which side, and how far. */
  off(p: Point): number;
  /** The nearest point on the curve. */
  on(p: Point): Point;
  /** The point `off` from the curve, on the line from the curve's nearest point to `p` (the sign as `off` gives it). */
  shift(p: Point, off: number): Point;
  /** How far the curve turns between two points on it, in degrees, read through `via` (in order). */
  turn(via: readonly Point[]): number;
}

/** The straight line nearest a set of points (total least squares). */
function lineFit(pts: readonly Point[]): Fit & { rms: number } {
  const c = { x: mean(pts.map((p) => p.x)), y: mean(pts.map((p) => p.y)) };
  let sxx = 0, syy = 0, sxy = 0;
  for (const p of pts) {
    sxx += (p.x - c.x) ** 2;
    syy += (p.y - c.y) ** 2;
    sxy += (p.x - c.x) * (p.y - c.y);
  }
  const a = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const u = { x: Math.cos(a), y: Math.sin(a) };
  const off = (p: Point) => u.x * (p.y - c.y) - u.y * (p.x - c.x);
  const on = (p: Point) => {
    const t = u.x * (p.x - c.x) + u.y * (p.y - c.y);
    return { x: c.x + u.x * t, y: c.y + u.y * t };
  };
  const shift = (p: Point, d: number) => {
    const q = on(p);
    return { x: q.x - u.y * d, y: q.y + u.x * d };
  };
  return { off, on, shift, turn: () => 0, rms: Math.sqrt(mean(pts.map((p) => off(p) ** 2))) };
}

/** The circle nearest a set of points (an algebraic fit), or null when they lie too nearly straight to have one. */
function circleFit(pts: readonly Point[]): (Fit & { rms: number; r: number }) | null {
  if (pts.length < 4) return null;
  // Solve x² + y² + Dx + Ey + F = 0 in least squares, about the points' own centre for conditioning.
  const m = { x: mean(pts.map((p) => p.x)), y: mean(pts.map((p) => p.y)) };
  let a11 = 0, a12 = 0, a13 = 0, a22 = 0, a23 = 0, a33 = 0, b1 = 0, b2 = 0, b3 = 0;
  for (const p of pts) {
    const x = p.x - m.x, y = p.y - m.y, z = -(x * x + y * y);
    a11 += x * x; a12 += x * y; a13 += x; a22 += y * y; a23 += y; a33 += 1;
    b1 += x * z; b2 += y * z; b3 += z;
  }
  const det = a11 * (a22 * a33 - a23 * a23) - a12 * (a12 * a33 - a23 * a13) + a13 * (a12 * a23 - a22 * a13);
  if (!(Math.abs(det) > 1e-12)) return null;
  const D = (b1 * (a22 * a33 - a23 * a23) - a12 * (b2 * a33 - a23 * b3) + a13 * (b2 * a23 - a22 * b3)) / det;
  const E = (a11 * (b2 * a33 - b3 * a23) - b1 * (a12 * a33 - a23 * a13) + a13 * (a12 * b3 - b2 * a13)) / det;
  const F = (a11 * (a22 * b3 - a23 * b2) - a12 * (a12 * b3 - b2 * a13) + b1 * (a12 * a23 - a22 * a13)) / det;
  const c = { x: m.x - D / 2, y: m.y - E / 2 };
  const r2 = (D * D + E * E) / 4 - F;
  if (!(r2 > 0)) return null;
  const r = Math.sqrt(r2);
  const off = (p: Point) => dist(p, c) - r;
  const on = (p: Point) => {
    const d = dist(p, c) || 1;
    return { x: c.x + ((p.x - c.x) / d) * r, y: c.y + ((p.y - c.y) / d) * r };
  };
  const shift = (p: Point, d: number) => {
    const l = dist(p, c) || 1;
    return { x: c.x + ((p.x - c.x) / l) * (r + d), y: c.y + ((p.y - c.y) / l) * (r + d) };
  };
  const turn = (via: readonly Point[]) => {
    let total = 0;
    for (let i = 1; i < via.length; i++) {
      let d = Math.atan2(via[i].y - c.y, via[i].x - c.x) - Math.atan2(via[i - 1].y - c.y, via[i - 1].x - c.x);
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      total += d;
    }
    return Math.abs(total) * DEG;
  };
  return { off, on, shift, turn, rms: Math.sqrt(mean(pts.map((p) => off(p) ** 2))), r };
}

/**
 * The axis near each of a wave's nodes: the line or circle through them all,
 * carried by each node's neighbours' mean offset from it — so a hand's slow
 * drift is the axis, a bend is the curve's (never smoothed inward), and only a
 * node that jumps off its neighbours is wander.
 */
function localAxis(nodes: readonly Point[]): { fit: Fit; local: Point[] } {
  // Too few nodes to tell a bend or a drift from a word's jumping middle: a circle through them, or their
  // neighbours' mean, would fit them by construction. A short wave runs straight.
  if (nodes.length < CURVE_NODES) {
    const fit = lineFit(nodes);
    return { fit, local: nodes.map((p) => fit.on(p)) };
  }
  const fit = axisFit(nodes);
  const offs = nodes.map((p) => fit.off(p));
  const local = nodes.map((p, i) => {
    const h = Math.min(DRIFT_SPAN, i, nodes.length - 1 - i);
    let d = 0;
    for (let k = i - h; k <= i + h; k++) d += offs[k];
    return fit.shift(p, d / (2 * h + 1));
  });
  return { fit, local };
}

/** The axis through a wave's nodes: a line, or a circle when the nodes bend round one — far closer to it than to any line, and not tighter than the span they cover. */
function axisFit(nodes: readonly Point[]): Fit & { rms: number } {
  const line = lineFit(nodes);
  const circle = circleFit(nodes);
  const span = dist(nodes[0], nodes[nodes.length - 1]);
  if (circle && circle.r >= 0.25 * span && circle.rms < 0.5 * line.rms) return circle;
  return line;
}

/** A wavy line or a zigzag: the heading swings to either side of the axis and back. */
function swingOf(pts: readonly Point[], theta: readonly number[], scale: number): WaveReading | null {
  const ext = swings(theta, WAVE_SWING_DEG / DEG);
  if (ext.length < 3) return null;
  // Each extreme's plateau — where the heading stands near it — has its middle at the node: on a
  // sinusoid the extreme itself, on a zigzag the middle of its straight run.
  const nodes: number[] = [];
  for (let k = 0; k < ext.length; k++) {
    const i = ext[k];
    const near = [ext[k - 1], ext[k + 1]].filter((x): x is number => x !== undefined).map((x) => Math.abs(theta[x] - theta[i]));
    const band = PLATEAU * Math.min(...near);
    let l = i, r = i;
    while (l > 0 && Math.abs(theta[l - 1] - theta[i]) <= band) l--;
    while (r < theta.length - 1 && Math.abs(theta[r + 1] - theta[i]) <= band) r++;
    // An extreme whose plateau reaches the stroke's end is where the pen began or stopped, not a node.
    if (l === 0 || r === theta.length - 1) continue;
    // A heading step i runs from point i to point i + 1: the node is the plateau's middle point.
    nodes.push(Math.round((l + r + 1) / 2));
  }
  if (nodes.length < 3) return null;
  const full = nodes.length - 1;
  const at = nodes.map((i) => pts[i]);
  // The axis near each node (localAxis): a hand's slow drift and a gently bent axis are the axis,
  // and only a node that jumps off its neighbours is wander.
  const { fit, local } = localAxis(at);

  // Each half-period: its crest, measured off the local axis, and which side it stands.
  const amps: number[] = [], lens: number[] = [], sides: number[] = [], sharp: number[] = [];
  for (let k = 0; k < full; k++) {
    const a = local[k], b = local[k + 1];
    const chord = dist(a, b);
    if (!(chord > 0)) return null;
    let best = 0, crest = nodes[k], side = 0;
    for (let i = nodes[k] + 1; i < nodes[k + 1]; i++) {
      const c = cross(a, b, pts[i]) / chord;
      if (Math.abs(c) > best) {
        best = Math.abs(c);
        crest = i;
        side = Math.sign(c);
      }
    }
    amps.push(best);
    lens.push(chord);
    sides.push(side);
    const span = nodes[k + 1] - nodes[k];
    const w = Math.max(1, Math.round(ZIGZAG_WINDOW * span));
    const lo = Math.max(nodes[k], crest - w), hi = Math.min(nodes[k + 1], crest + w) - 1;
    const total = Math.abs(theta[Math.min(nodes[k + 1], theta.length - 1)] - theta[Math.min(nodes[k], theta.length - 1)]);
    sharp.push(total > 0 && hi > lo ? Math.abs(theta[hi] - theta[lo]) / total : 0);
  }
  if (sides.some((s, k) => s === 0 || (k > 0 && s === sides[k - 1]))) return null;

  const axis = [pts[0], ...local, pts[pts.length - 1]];
  const length = pathLength(axis);
  const halfPeriod = mean(lens);
  if (!(halfPeriod > 0)) return null;
  const ends = Math.min(1, dist(pts[0], local[0]) / halfPeriod) + Math.min(1, dist(local[local.length - 1], pts[pts.length - 1]) / halfPeriod);
  const amplitude = mean(amps);
  const spread = { amplitude: spreadOf(amps), period: spreadOf(lens) };
  const wander = Math.sqrt(mean(at.map((p, k) => dist(p, local[k]) ** 2))) / (amplitude || 1);
  const bend = fit.turn([fit.on(pts[0]), ...axis.slice(1, -1), fit.on(pts[pts.length - 1])]);
  const kind: WaveKind = mean(sharp) >= ZIGZAG_SHARP ? 'zigzag' : 'wavy';
  return judge(kind, axis, length, amplitude, halfPeriod, full + ends, spread, wander, bend, scale, kind === 'zigzag' ? `turning ${Math.round(mean(sharp) * 100)}% of each swing at its crest` : `turning all along each swing`);
}

/** A curly line: a coil, turning one way a full turn a loop, its loops' centres along an axis. */
function curlyOf(pts: readonly Point[], theta: readonly number[], loops: number, scale: number): WaveReading | null {
  const way = Math.sign(theta[theta.length - 1] - theta[0]);
  // Cut the coil where it has turned another full turn: each piece is a loop.
  const cuts = [0];
  for (let i = 1; i < theta.length; i++) {
    if (way * (theta[i] - theta[0]) >= 2 * Math.PI * cuts.length) cuts.push(i);
  }
  if (cuts.length < 3) return null;
  const centres: Point[] = [], radii: number[] = [];
  for (let k = 0; k + 1 < cuts.length; k++) {
    const piece = pts.slice(cuts[k], cuts[k + 1] + 1);
    const c = { x: mean(piece.map((p) => p.x)), y: mean(piece.map((p) => p.y)) };
    const r = Math.max(...piece.map((p) => dist(p, c)));
    // A loop goes round its centre: its path at least as long as a half circle of its size, and
    // never a knot of a sensor's grain, which turns a full turn in a few pixels.
    if (r / scale < WAVE_AMPLITUDE_PX || pathLength(piece) < Math.PI * r) return null;
    centres.push(c);
    radii.push(r);
  }
  const { fit, local } = centres.length >= 2 ? localAxis(centres) : { fit: lineFit(centres), local: centres.slice() };
  const gaps = local.slice(1).map((c, k) => dist(c, local[k]));
  const axis = [pts[0], ...local, pts[pts.length - 1]];
  const length = pathLength(axis);
  const halfPeriod = mean(gaps) / 2;
  if (!(halfPeriod > 0)) return null;
  const amplitude = mean(radii);
  const spread = { amplitude: spreadOf(radii), period: spreadOf(gaps) };
  const wander = Math.sqrt(mean(centres.map((p, k) => dist(p, local[k]) ** 2))) / (amplitude || 1);
  const bend = fit.turn([fit.on(pts[0]), ...axis.slice(1, -1), fit.on(pts[pts.length - 1])]);
  return judge('curly', axis, length, amplitude, halfPeriod, 2 * loops, spread, wander, bend, scale, `${fix(loops, 1)} loops turning one way`);
}

/** Whether what was measured is a wave, and how sure: regular, long against its amplitude, enough half-periods, an axis that bends gently. */
function judge(
  kind: WaveKind,
  axis: Point[],
  length: number,
  amplitude: number,
  halfPeriod: number,
  halfPeriods: number,
  spread: { amplitude: number; period: number },
  wander: number,
  bend: number,
  scale: number,
  how: string
): WaveReading | null {
  if (halfPeriods < WAVE_MIN_HALF_PERIODS) return null;
  if (length / scale < WAVE_MIN_PX || amplitude / scale < WAVE_AMPLITUDE_PX) return null;
  const long = length / amplitude;
  const enough = kind === 'curly' ? CURLY_LONG : WAVE_LONG;
  if (long < enough) return null;
  const irregular = Math.hypot(spread.amplitude, spread.period, wander);
  if (irregular > WAVE_IRREGULAR) return null;
  if (bend > WAVE_BEND_MAX) return null;
  const even = ramp(WAVE_IRREGULAR - irregular, 0, WAVE_IRREGULAR / 2);
  const evidence = (ramp(halfPeriods, WAVE_MIN_HALF_PERIODS, 2 * WAVE_MIN_HALF_PERIODS) + ramp(long, enough, 2 * enough) + even) / 3;
  const confidence = MAX * (0.6 + 0.4 * evidence);
  const along = bend > 30 ? `along an axis that bends ${Math.round(bend)}°` : 'along a straight axis';
  const reason =
    `${kind === 'curly' ? 'a curly line' : kind === 'zigzag' ? 'a zigzag' : 'a wavy line'}: ${fix(halfPeriods, 1)} half-periods ${along}, ${how}; ` +
    `${fix(long, 0)} times as long as its crests stand off it; its crests vary ${Math.round(spread.amplitude * 100)}%, its half-periods ${Math.round(spread.period * 100)}% and its nodes stray ${Math.round(wander * 100)}% of its amplitude`;
  return { kind, axis, length, amplitude, halfPeriod, halfPeriods, spread, wander, irregular, bend, confidence, reason };
}

// ===== A mark =====

const read = new WeakMap<readonly Point[], { scale: number; wave: WaveReading | null }>();

/**
 * The wave a mark's stroke draws, its axis placed where the mark stands now,
 * or null. Read on the ink as drawn, in the space it was drawn in (so a move
 * never reads it again), and kept while that ink is the same.
 */
export function waveOfNode(node: MMNode): WaveReading | null {
  const stroke = getRep(node, 'stroke')?.data as { points?: Point[]; scale?: number } | undefined;
  if (!stroke?.points || getRep(node, 'erased')) return null;
  const scale = stroke.scale ?? 1;
  let held = read.get(stroke.points);
  if (!held || held.scale !== scale) {
    held = { scale, wave: waveOf(stroke.points, scale) };
    read.set(stroke.points, held);
  }
  const w = held.wave;
  if (!w) return null;
  const axis = placed(node, w.axis);
  const k = pathLength(w.axis) > 0 ? pathLength(axis) / pathLength(w.axis) : 1;
  return k === 1 ? { ...w, axis } : { ...w, axis, length: w.length * k, amplitude: w.amplitude * k, halfPeriod: w.halfPeriod * k };
}

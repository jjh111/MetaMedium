// The plot (MATHS-SPEC §8 Lane C, M20): a function drawn on a coordinate plane.
//
// `plotOn(plane, f, { holes?, poles? })` returns the curve as polylines in CANVAS units — the plane's own axes
// give the map from the numbers a function takes to the ink a hand would have drawn — so a surface only strokes
// them. Four rules:
//
//   - **Sampled where the curve bends.** A first pass at about one sample in three pixels, then each pair of
//     neighbours is split wherever the curve's middle stands further than a fraction of a pixel off the chord
//     between them (`TOL_PX`), down to a quarter of a pixel (`MIN_STEP_PX`). A straight line costs the first
//     pass; a parabola's apex costs a few more points where it turns.
//   - **A break is a break.** Where the function is undefined (a pole, the root of a negative), or where it jumps
//     by more than the plane is tall between two neighbours a quarter pixel apart, the line ends and a new one
//     begins: nothing is drawn across a pole. A break whose two sides have run off the plane is an asymptote,
//     said as a dashed vertical line.
//   - **A hole is a ring, and the line leaves a gap round it.** Where the denominator and the numerator share a
//     factor (`holes: [2]` for `(x²−4)/(x−2)`), the function is never asked at that place — the sampling is cut a
//     ring's radius either side, the limit from both sides gives the ring's height (`found: 'given'`). Holes the
//     caller did not know of are found at the places a hand writes in a tick (halves, quarter turns) where the
//     function is undefined and the two sides agree (`found: 'sampled'`).
//   - **Clipped to what is drawn.** The plane's extent is its axes' two tips each way: a curve that leaves it
//     is cut at the edge, so `1/x` is two lines and `tan x` is a row of them.
//
// The plane itself (`PlaneGeometry`) is a pure record of numbers: where the axes cross, which way each runs and
// how many canvas units a plane unit is. `notations/plane.ts` reads one from ink; `planeOf` makes one from the
// ranges it is to show, which is how the tests (and a surface that draws its own axes) get one.
//
// Derived, never logged. Tier 1: nothing here asks a model.

import type { Bounds, Point } from '../types';

// ===== The plane =====

/** How an axis's scale was settled. */
export type ScaleHow =
  /** Two or more numbers written at it fix both its unit and its zero. */
  | 'numbers'
  /** One number, and the crossing taken as zero. */
  | 'number and origin'
  /** Ticks with no numbers: one tick, one unit. */
  | 'ticks'
  /** Nothing said: a default range, and it says so. */
  | 'assumed';

export interface PlaneAxisScale {
  /** Canvas units in one unit of the plane. Positive. */
  perUnit: number;
  /** The plane's value where the axes cross. */
  at: number;
  /** The plane's values at the two ends the axis is drawn to: where the plot is clipped. */
  lo: number;
  hi: number;
  how: ScaleHow;
  /** In words, for a reason: *1 unit is 52 px, from the 1 and the 2 written at its ticks*. */
  reason: string;
}

/** A coordinate plane as numbers: enough to put a point of the plane on the canvas and a point of the canvas on the plane. */
export interface PlaneGeometry {
  /** Where the axes cross, in canvas units. */
  origin: Point;
  /** Unit vectors, in canvas units: along the x axis towards its larger values (right), along the y axis towards its larger values (up). */
  ex: Point;
  ey: Point;
  x: PlaneAxisScale;
  y: PlaneAxisScale;
}

/** The plane's point on the canvas. */
export function planeToCanvas(g: PlaneGeometry, p: Point): Point {
  const a = (p.x - g.x.at) * g.x.perUnit;
  const b = (p.y - g.y.at) * g.y.perUnit;
  return { x: g.origin.x + g.ex.x * a + g.ey.x * b, y: g.origin.y + g.ex.y * a + g.ey.y * b };
}

/** The canvas's point on the plane. */
export function canvasToPlane(g: PlaneGeometry, p: Point): Point {
  const dx = p.x - g.origin.x, dy = p.y - g.origin.y;
  const det = g.ex.x * g.ey.y - g.ex.y * g.ey.x || 1e-12;
  const a = (dx * g.ey.y - dy * g.ey.x) / det;
  const b = (g.ex.x * dy - g.ex.y * dx) / det;
  return { x: g.x.at + a / g.x.perUnit, y: g.y.at + b / g.y.perUnit };
}

/** The canvas box a plane is drawn in — the corners of its extent, as they stand. */
export function planeExtent(g: PlaneGeometry): Bounds {
  const cs = [
    planeToCanvas(g, { x: g.x.lo, y: g.y.lo }), planeToCanvas(g, { x: g.x.hi, y: g.y.lo }),
    planeToCanvas(g, { x: g.x.hi, y: g.y.hi }), planeToCanvas(g, { x: g.x.lo, y: g.y.hi }),
  ];
  return { minX: Math.min(...cs.map((c) => c.x)), maxX: Math.max(...cs.map((c) => c.x)), minY: Math.min(...cs.map((c) => c.y)), maxY: Math.max(...cs.map((c) => c.y)) };
}

/**
 * A plane made from the ranges it is to show and the canvas box it fills — upright, with 1 on the plane the same
 * number of canvas units wherever the box is wide or tall for it. The crossing stands where (0, 0) falls, even
 * when that is off the box.
 */
export function planeOf(o: { x: readonly [number, number]; y: readonly [number, number]; rect: Bounds; how?: ScaleHow }): PlaneGeometry {
  const w = o.rect.maxX - o.rect.minX, h = o.rect.maxY - o.rect.minY;
  const px = w / (o.x[1] - o.x[0]), py = h / (o.y[1] - o.y[0]);
  const how = o.how ?? 'numbers';
  return {
    origin: { x: o.rect.minX + (0 - o.x[0]) * px, y: o.rect.maxY - (0 - o.y[0]) * py },
    ex: { x: 1, y: 0 },
    ey: { x: 0, y: -1 },
    x: { perUnit: px, at: 0, lo: o.x[0], hi: o.x[1], how, reason: `1 unit across is ${px.toFixed(1)} px` },
    y: { perUnit: py, at: 0, lo: o.y[0], hi: o.y[1], how, reason: `1 unit up is ${py.toFixed(1)} px` },
  };
}

// ===== What a plot is =====

/** A function of one number, null where it is undefined — what `compileFunction` gives. */
export type PlotFn = (x: number) => number | null;

export interface PlotOptions {
  /** Removable points: an x (its height is the limit from both sides) or an x with the height it is known to have. */
  holes?: ReadonlyArray<number | { x: number; y?: number }>;
  /** Places the function runs off to infinity: a dashed vertical line each. */
  poles?: ReadonlyArray<number>;
  /** Levels the curve runs along far out (`y = 1`): a dashed horizontal line each, unless it is the x axis itself. */
  levels?: ReadonlyArray<number>;
  /** Plot only between these values of x (and never beyond the plane's drawn extent). */
  from?: number;
  to?: number;
  /** A hole's ring is this many canvas units across the radius. Default `HOLE_RING`. */
  ring?: number;
}

export interface PlotPiece {
  /** The line, in canvas units. */
  points: Point[];
  /** The values of x at its two ends. */
  x0: number;
  x1: number;
}

export interface PlotHole {
  /** Where it is on the plane. */
  x: number;
  y: number;
  /** Where it is on the canvas, and its open ring. */
  at: Point;
  ring: Point[];
  found: 'given' | 'sampled';
}

export interface PlotAsymptote {
  kind: 'vertical' | 'horizontal';
  /** The x (vertical) or y (horizontal) it lies at. */
  value: number;
  /** The dashed line's two ends, in canvas units. */
  points: [Point, Point];
  found: 'given' | 'sampled';
}

export interface Plot {
  curves: PlotPiece[];
  holes: PlotHole[];
  asymptotes: PlotAsymptote[];
  /** How many times the function was asked. */
  evaluations: number;
  /** In words: *two lines, a hole at (2, 4)*. */
  reason: string;
}

// ===== Constants — the plot's own; the hand's are cited =====

/** A hole's ring, in canvas units across the radius. */
export const HOLE_RING = 5;
/** About one first-pass sample in this many canvas units of the plane's width, never fewer than `BASE_MIN` nor more than `BASE_MAX`. */
export const SAMPLE_EVERY_PX = 3;
export const BASE_MIN = 120;
export const BASE_MAX = 600;
/** A pair of neighbours is split where the curve's middle stands more than this many pixels off the chord between them… */
export const TOL_PX = 0.3;
/** …down to steps this many pixels wide, and no more than this many levels deep. */
export const MIN_STEP_PX = 0.25;
export const MAX_DEPTH = 16;
/** A step between neighbours this many planes' heights tall is a break, not a steep line. */
export const JUMP_OF_HEIGHT = 1;
/** A break whose sides stand this many planes' heights out is an asymptote. */
export const POLE_OF_HEIGHT = 2;
/** The two sides of a removable point agree to this share of the plane's height. */
export const HOLE_AGREE = 5e-4;
/** The function is asked at most this many times for one plot. */
export const MAX_EVALUATIONS = 60_000;
/** A piece is simplified to within this many pixels of the points it was sampled at. */
export const SIMPLIFY_PX = 0.2;
/** A ring is this many points round. */
export const RING_POINTS = 24;

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** Douglas–Peucker to a tolerance, on a polyline in canvas units. */
function simplify(pts: readonly Point[], tol: number): Point[] {
  if (pts.length <= 2) return pts.slice();
  const keep = new Uint8Array(pts.length);
  keep[0] = 1;
  keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop()!;
    const a = pts[i], b = pts[j];
    const dx = b.x - a.x, dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    let worst = -1, at = -1;
    for (let k = i + 1; k < j; k++) {
      const p = pts[k];
      let d: number;
      if (l2 < 1e-18) d = dist(p, a);
      else {
        const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
        d = Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
      }
      if (d > worst) { worst = d; at = k; }
    }
    if (worst > tol && at > 0) {
      keep[at] = 1;
      stack.push([i, at], [at, j]);
    }
  }
  return pts.filter((_, k) => keep[k]);
}

const circle = (c: Point, r: number): Point[] => {
  const out: Point[] = [];
  for (let i = 0; i <= RING_POINTS; i++) {
    const a = (i / RING_POINTS) * Math.PI * 2;
    out.push({ x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) });
  }
  return out;
};

interface Pt { x: number; y: number }
/** A run of consecutive samples, and the sort of break each end has. */
interface Run { pts: Pt[]; startsAt: 'domain' | 'undefined' | 'jump'; endsAt: 'domain' | 'undefined' | 'jump' }

/** The places a hand writes into a tick or a label on an axis: halves, and quarter turns. */
function tickCandidates(from: number, to: number): number[] {
  const out = new Set<number>();
  const add = (v: number) => { if (v > from && v < to) out.add(Number(v.toFixed(12))); };
  const span = to - from;
  if (span / 0.5 <= 80) for (let k = Math.ceil(from / 0.5); k * 0.5 <= to; k++) add(k * 0.5);
  else for (let k = Math.ceil(from); k <= to && out.size < 120; k++) add(k);
  for (let k = Math.ceil(from / (Math.PI / 4)); k * (Math.PI / 4) <= to && k < 4000; k++) add(k * (Math.PI / 4));
  return [...out].sort((a, b) => a - b);
}

/**
 * A function on a plane, as lines, rings and dashes in canvas units. Never asks the function at a removable point
 * it was told of, and never draws a line across a place where it is undefined or runs off.
 */
export function plotOn(plane: PlaneGeometry, f: PlotFn, opts: PlotOptions = {}): Plot {
  const X = plane.x, Y = plane.y;
  const ppx = X.perUnit, ppy = Y.perUnit;
  const lo = Math.max(X.lo, opts.from ?? -Infinity), hi = Math.min(X.hi, opts.to ?? Infinity);
  const ySpan = Y.hi - Y.lo;
  const ring = opts.ring ?? HOLE_RING;
  const empty: Plot = { curves: [], holes: [], asymptotes: [], evaluations: 0, reason: 'nothing to plot — the plane has no width' };
  if (!(hi > lo) || !(ppx > 0) || !(ppy > 0) || !(ySpan > 0)) return empty;

  let evaluations = 0;
  const ev = (x: number): number | null => {
    if (evaluations >= MAX_EVALUATIONS) return null;
    evaluations++;
    try {
      const y = f(x);
      return typeof y === 'number' && Number.isFinite(y) ? y : null;
    } catch {
      return null;
    }
  };
  const gapX = ring / ppx;
  /** How far either side of a removable point the line stops, so that it ends on the ring and not a square's corner off it: the gap shortens where the curve climbs. */
  const gapSides = (x: number): [number, number] => {
    const d = gapX * 0.5;
    const side = (sign: 1 | -1): number => {
      const a = ev(x + sign * d), b = ev(x + sign * 2 * d);
      if (a === null || b === null) return gapX;
      const m = (Math.abs(b - a) / d) * (ppy / ppx);
      return gapX / Math.sqrt(1 + m * m);
    };
    return [side(-1), side(1)];
  };
  const eps = (hi - lo) * 1e-9;
  const near = (a: number, b: number) => Math.abs(a - b) <= (hi - lo) * 1e-7;

  // ----- Holes: the ones told, then the ones a probe finds -----
  const holeXs: { x: number; y?: number; found: 'given' | 'sampled' }[] = [];
  for (const h of opts.holes ?? []) {
    const x = typeof h === 'number' ? h : h.x;
    const y = typeof h === 'number' ? undefined : h.y;
    if (Number.isFinite(x) && x > lo - gapX && x < hi + gapX && !holeXs.some((o) => near(o.x, x))) holeXs.push({ x, ...(y !== undefined && Number.isFinite(y) ? { y } : {}), found: 'given' });
  }
  const poleXs: { x: number; found: 'given' | 'sampled' }[] = [];
  for (const p of opts.poles ?? []) if (Number.isFinite(p) && p >= lo && p <= hi && !poleXs.some((o) => near(o.x, p))) poleXs.push({ x: p, found: 'given' });

  // Every place the function is undefined at a hand's tick, between values it is defined at.
  for (const x of tickCandidates(lo, hi)) {
    if (holeXs.some((o) => near(o.x, x)) || poleXs.some((o) => near(o.x, x))) continue;
    if (ev(x) !== null) continue;
    const h = Math.min(1e-6 * Math.max(1, Math.abs(x)), (hi - lo) * 1e-4);
    const yl = ev(x - h), yr = ev(x + h);
    if (yl === null || yr === null) continue;
    if (Math.abs(yl) > POLE_OF_HEIGHT * ySpan || Math.abs(yr) > POLE_OF_HEIGHT * ySpan) {
      // Out to infinity on one side at least: an asymptote, if the function is going out at either side.
      poleXs.push({ x, found: 'sampled' });
    } else if (Math.abs(yl - yr) <= HOLE_AGREE * ySpan + 1e-9 * Math.max(Math.abs(yl), Math.abs(yr))) {
      holeXs.push({ x, y: (yl + yr) / 2, found: 'sampled' });
    }
  }
  // A given hole with no height has its limit read from both sides.
  const holes: PlotHole[] = [];
  for (const h of holeXs) {
    let y = h.y;
    if (y === undefined) {
      const d = Math.min(1e-6 * Math.max(1, Math.abs(h.x)), (hi - lo) * 1e-4);
      const yl = ev(h.x - d), yr = ev(h.x + d);
      if (yl !== null && yr !== null) y = Math.abs(yl - yr) <= HOLE_AGREE * ySpan + 1e-9 * Math.max(Math.abs(yl), Math.abs(yr)) ? (yl + yr) / 2 : undefined;
      else if (yl !== null) y = yl;
      else if (yr !== null) y = yr;
    }
    if (y === undefined || y < Y.lo || y > Y.hi || h.x < lo || h.x > hi) continue;
    const at = planeToCanvas(plane, { x: h.x, y });
    holes.push({ x: h.x, y, at, ring: circle(at, ring), found: h.found });
  }
  holes.sort((a, b) => a.x - b.x);

  // ----- The domain, cut at holes and poles -----
  const cuts: { from: number; to: number }[] = [];
  const breaks = [
    ...holeXs.map((h) => { const [l, r] = gapSides(h.x); return { a: h.x - l, b: h.x + r }; }),
    ...poleXs.map((p) => ({ a: p.x - eps, b: p.x + eps })),
  ].sort((p, q) => p.a - q.a);
  let at = lo;
  for (const br of breaks) {
    if (br.a > at) cuts.push({ from: at, to: Math.min(br.a, hi) });
    at = Math.max(at, br.b);
  }
  if (at < hi) cuts.push({ from: at, to: hi });

  // ----- Sampling -----
  const base = Math.max(BASE_MIN, Math.min(BASE_MAX, Math.round(((hi - lo) * ppx) / SAMPLE_EVERY_PX)));
  const asymptotes: PlotAsymptote[] = poleXs.map((p) => ({ kind: 'vertical' as const, value: p.x, points: [planeToCanvas(plane, { x: p.x, y: Y.lo }), planeToCanvas(plane, { x: p.x, y: Y.hi })] as [Point, Point], found: p.found }));

  /** The last defined x between a defined `xd` and an undefined `xu`, bisected to a pixel's hundredth. */
  const edge = (xd: number, yd: number, xu: number): Pt => {
    let d = xd, u = xu, yv = yd;
    for (let i = 0; i < 48 && Math.abs(u - d) * ppx > 0.01; i++) {
      const m = (d + u) / 2;
      const ym = ev(m);
      if (ym !== null) { d = m; yv = ym; } else u = m;
    }
    return { x: d, y: yv };
  };

  const runs: Run[] = [];
  for (const cut of cuts) {
    const width = cut.to - cut.from;
    const n0 = Math.max(24, Math.round((base * width) / (hi - lo)));
    const xs: number[] = [], ys: (number | null)[] = [];
    for (let i = 0; i <= n0; i++) {
      const x = i === n0 ? cut.to : cut.from + (width * i) / n0;
      xs.push(x);
      ys.push(ev(x));
    }
    let cur: Pt[] = [];
    let startsAt: Run['startsAt'] = 'domain';
    for (let i = 0; i <= n0; i++) {
      const y = ys[i];
      if (y !== null) {
        if (!cur.length && i > 0 && ys[i - 1] === null) {
          // The first defined sample after an undefined stretch: where does the stretch end?
          const e = edge(xs[i], y, xs[i - 1]);
          if (e.x < xs[i]) cur.push(e);
          startsAt = 'undefined';
        }
        cur.push({ x: xs[i], y });
      } else if (cur.length) {
        const last = cur[cur.length - 1];
        const e = edge(last.x, last.y, xs[i]);
        if (e.x > last.x) cur.push(e);
        runs.push({ pts: cur, startsAt, endsAt: 'undefined' });
        cur = [];
        startsAt = 'undefined';
      }
    }
    if (cur.length) runs.push({ pts: cur, startsAt, endsAt: 'domain' });
  }

  // ----- Refinement: split where the curve's middle is off the chord -----
  const refine = (a: Pt, b: Pt, depth: number, out: Pt[]): void => {
    if (depth >= MAX_DEPTH || (b.x - a.x) * ppx < MIN_STEP_PX || evaluations >= MAX_EVALUATIONS) return;
    const xm = (a.x + b.x) / 2;
    const ym = ev(xm);
    if (ym === null) return;
    if (Math.abs(ym - (a.y + b.y) / 2) * ppy <= TOL_PX) return;
    refine(a, { x: xm, y: ym }, depth + 1, out);
    out.push({ x: xm, y: ym });
    refine({ x: xm, y: ym }, b, depth + 1, out);
  };
  const jumpPx = JUMP_OF_HEIGHT * ySpan * ppy;
  const refined: Run[] = [];
  for (const run of runs) {
    let cur: Pt[] = [run.pts[0]];
    let startsAt = run.startsAt;
    for (let i = 1; i < run.pts.length; i++) {
      const a = run.pts[i - 1], b = run.pts[i];
      const mid: Pt[] = [];
      refine(a, b, 0, mid);
      const seq = [...mid, b];
      let prev = a;
      for (const p of seq) {
        if (Math.abs(p.y - prev.y) * ppy > jumpPx && (p.x - prev.x) * ppx < 2 * MIN_STEP_PX + 1) {
          // A step the plane's own height cannot hold between neighbours a pixel apart: a break.
          refined.push({ pts: cur, startsAt, endsAt: 'jump' });
          cur = [];
          startsAt = 'jump';
          const m = (prev.x + p.x) / 2;
          if (Math.abs(prev.y) > POLE_OF_HEIGHT * ySpan && Math.abs(p.y) > POLE_OF_HEIGHT * ySpan && !poleXs.some((o) => near(o.x, m) || Math.abs(o.x - m) * ppx < 2)) {
            poleXs.push({ x: m, found: 'sampled' });
            asymptotes.push({ kind: 'vertical', value: m, points: [planeToCanvas(plane, { x: m, y: Y.lo }), planeToCanvas(plane, { x: m, y: Y.hi })], found: 'sampled' });
          }
        }
        cur.push(p);
        prev = p;
      }
    }
    refined.push({ pts: cur, startsAt, endsAt: run.endsAt });
  }

  // A break whose end has run off the plane, at an undefined place, is an asymptote too (1/x at an exact zero).
  for (const run of refined) {
    for (const [side, p] of [['start', run.pts[0]], ['end', run.pts[run.pts.length - 1]]] as const) {
      if (!p || (side === 'start' ? run.startsAt : run.endsAt) !== 'undefined') continue;
      if (Math.abs(p.y) <= POLE_OF_HEIGHT * ySpan) continue;
      if (poleXs.some((o) => Math.abs(o.x - p.x) * ppx < 2)) continue;
      poleXs.push({ x: p.x, found: 'sampled' });
      asymptotes.push({ kind: 'vertical', value: p.x, points: [planeToCanvas(plane, { x: p.x, y: Y.lo }), planeToCanvas(plane, { x: p.x, y: Y.hi })], found: 'sampled' });
    }
  }

  // ----- Clip to the plane, and onto the canvas -----
  const pieces: PlotPiece[] = [];
  for (const run of refined) {
    let cur: Pt[] = [];
    const flush = () => {
      if (cur.length >= 2) {
        const pts = simplify(cur.map((p) => planeToCanvas(plane, p)), SIMPLIFY_PX);
        pieces.push({ points: pts, x0: cur[0].x, x1: cur[cur.length - 1].x });
      }
      cur = [];
    };
    const inside = (p: Pt) => p.y >= Y.lo && p.y <= Y.hi;
    const cutAt = (a: Pt, b: Pt, y: number): Pt => ({ x: a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y), y });
    for (let i = 0; i < run.pts.length; i++) {
      const p = run.pts[i];
      const q = i > 0 ? run.pts[i - 1] : null;
      if (inside(p)) {
        if (q && !inside(q)) cur.push(cutAt(q, p, q.y > Y.hi ? Y.hi : Y.lo));
        cur.push(p);
      } else if (q && inside(q)) {
        cur.push(cutAt(q, p, p.y > Y.hi ? Y.hi : Y.lo));
        flush();
      } else if (q && !inside(q) && (q.y > Y.hi) !== (p.y > Y.hi)) {
        // Over the top and out of the bottom in one step: nothing of it is on the plane.
      }
    }
    flush();
  }
  pieces.sort((a, b) => a.x0 - b.x0);

  for (const c of opts.levels ?? []) {
    if (!Number.isFinite(c) || c <= Y.lo || c >= Y.hi || Math.abs(c - Y.at) < 1e-9) continue;
    asymptotes.push({ kind: 'horizontal', value: c, points: [planeToCanvas(plane, { x: X.lo, y: c }), planeToCanvas(plane, { x: X.hi, y: c })], found: 'given' });
  }
  asymptotes.sort((a, b) => (a.kind === b.kind ? a.value - b.value : a.kind === 'vertical' ? -1 : 1));

  const words = [`${pieces.length === 1 ? 'one line' : `${pieces.length} lines`}`];
  for (const h of holes) words.push(`a hole at (${num(h.x)}, ${num(h.y)})`);
  const vs = asymptotes.filter((a) => a.kind === 'vertical');
  if (vs.length) words.push(`${vs.length === 1 ? 'an asymptote' : `${vs.length} asymptotes`} at x = ${vs.map((a) => num(a.value)).join(', ')}`);
  return { curves: pieces, holes, asymptotes, evaluations, reason: words.join(', ') };
}

/** A number as it reads in a reason: whole, or to three places with the zeros trimmed. */
function num(v: number): string {
  if (Math.abs(v - Math.round(v)) < 5e-4) return String(Math.round(v));
  return String(Number(v.toFixed(3)));
}

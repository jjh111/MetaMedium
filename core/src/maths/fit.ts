// A curve read (MATHS-SPEC §8 Lane C, M21): a stroke drawn on a coordinate plane, read as a function.
//
// Jake draws a rough parabola on his axes and *y = x²* stands, with the clean curve lying under his sketch. This is
// the reading under that: the stroke is taken onto the plane's own numbers, and six families a school draws — a
// line, a parabola, a cubic, a sine wave, an exponential and 1/x — are each fitted to it by least squares and
// ranked. Rules:
//
//   - **A fit is plural, with its reason.** Every family that holds the stroke within `KEEP_RMS` of its height is
//     returned, the likeliest first, each saying what it is and how far off it is (*a parabola, y = 0.98x² + 0.1,
//     within 3% of the span*). A parabola is a worse line and a better parabola; nothing wins by silencing the others.
//   - **Ranked by residual, with a penalty for complexity.** The residual is the distance from the stroke to the
//     curve in the hand's own pixels (so a steep curve is not judged by how far it is above itself), as a share of
//     the stroke's height (`span`, never less than a share of the plane's: a level line has no height to be off by).
//     A fit that needs more numbers pays `PENALTY` for each, and a term that adds nothing within the hand's
//     tremor is dropped (`DROP_SLACK`) — so a stroke of a line is a line and not the parabola whose bend is zero,
//     and a parabola about the y axis has no linear term.
//   - **The rounded form is offered when it is within the drawing's precision.** The hand draws 0.98x² + 0.1 and
//     means x². Every coefficient is tried at the numbers a person writes (0, 1, ½, tenths, hundredths, π's
//     multiples, a base like 2); the plainest form that is no worse than the fit by more than the hand's own
//     wobble (`SNAP_FACTOR`, `SNAP_ABS`) is `rounded`. The precision is the drawing's: a rougher stroke rounds
//     further.
//   - **Where the hand doubled back there is no function.** A stroke whose x runs back on itself by more than a
//     share of its span (a loop, a spiral, a letter) is `ok: false` with that reason, and nothing is fitted — a
//     curve of x → y that is not one is not guessed at (MATHS-SPEC rule 14).
//   - **A closed form is derived from the log; no model computes it.** Pure, deterministic, no clocks.
//
// The scale of the plane rules the numbers (MATHS-PLAN rule 2: the labels rule the thing, the ink the topology): a
// stroke is fitted in the plane's units, so the same stroke on axes numbered 1, 2 reads y = x² and on axes
// numbered 2, 4 reads y = 0.5x². When the plane's scale was assumed, the reading says so.

import type { Point } from '../types';
import type { PlaneGeometry } from './plot';
import { canvasToPlane } from './plot';
import { MAX_TIER0_CONFIDENCE } from '../recognition';

// ===== Constants — this fit's own; the hand's are cited =====

/** The stroke is read at about one sample in this many canvas units of its length, never fewer than `SAMPLES_MIN` nor more than `SAMPLES_MAX`. */
export const STEP_PX = 4;
export const SAMPLES_MIN = 24;
export const SAMPLES_MAX = 160;
/** A stroke is no function when its x runs back by more than this share of its x extent (and more than `RETRACE_PX` canvas units): a loop, a spiral, a word. */
export const RETRACE_SHARE = 0.05;
export const RETRACE_PX = 6;
/** …and it is a curve on a plane only when it reaches this far across (canvas units). */
export const MIN_SPAN_PX = 30;
/** The stroke's height is never taken as less than this share of the plane's height. */
export const SPAN_FLOOR_OF_PLANE = 0.15;
/** Each number a family needs, past the first, costs this much of the span. */
export const PENALTY = 0.004;
/** A term whose removal makes the stroke this much further off (as a share of the span) is not dropped… */
export const DROP_SLACK = 0.003;
/** …nor ever less than the hand's own wobble: a steady hand's tremor, in the hand's pixels, is not a curve (`HAND_WOBBLE_PX`; rms, about the hand and not the world). */
export const HAND_WOBBLE_PX = 1.5;
/** A sine's amplitude is at least this share of the span (a stroke drawn as a sine has an amplitude of half its height): below it is the wobble of a level line. */
export const SINE_AMP_OF_SPAN = 0.3;
/** A rounded form is accepted when no further off than the fit's by this factor, or by `SNAP_ABS` of the span — whichever allows more. */
export const SNAP_FACTOR = 1.5;
export const SNAP_ABS = 0.012;
/** A family holds the stroke when it is this near it, as an rms share of the span; at `RMS_ZERO` its confidence is none. */
export const KEEP_RMS = 0.12;
export const RMS_ZERO = 0.1;
/** The least confidence at which a fit is offered as the curve's name. */
export const FIT_OFFER_FLOOR = 0.3;
/** The ends of a stroke (where the pen lands and lifts) are left out of *within N% of the span*: this share of the samples each end. */
export const ENDS_TRIM = 0.03;
/** A sine is looked for between this many periods across the stroke… */
export const PERIODS: readonly [number, number] = [0.75, 8];
/** …and an exponential growing no faster than e to this over the stroke. */
export const GROWTH_MAX = 12;
/** The nearest to zero a stroke's x runs, as a share of its extent, before 1/x is not a reading of it. */
export const RECIPROCAL_CLEAR = 0.02;
/** The most rounded forms tried for one fit. */
export const SNAP_MAX = 6000;

const MAX = MAX_TIER0_CONFIDENCE;

// ===== The result =====

export type FitFamily = 'line' | 'parabola' | 'cubic' | 'sine' | 'exponential' | 'reciprocal';

/** A form a stroke may be read as, its numbers and how far it is from the stroke. */
export interface FitForm {
  /** `y = 0.98x² + 0.1`. */
  text: string;
  /** The right side alone, as `compileFunction` reads it: `0.98x² + 0.1`. */
  expr: string;
  /** Its numbers, in the order the family lists them. */
  params: number[];
  fn: (x: number) => number;
  /** The rms distance from the stroke, as a share of the span. */
  rms: number;
  /** The most any of the stroke's middle samples is off, as a share of the span. */
  worst: number;
}

export interface FitReading {
  family: FitFamily;
  /** For people: *a parabola*. */
  name: string;
  /** As fitted. */
  fitted: FitForm;
  /** The plain form the hand meant, when it is no further off than the drawing's precision; else absent. */
  rounded?: FitForm;
  /** The whole sentence: *a parabola, y = 0.98x² + 0.1, within 3% of the span*. */
  say: string;
  /** Why this one: how far off, what it paid, what it needed. */
  reason: string;
  /** How many numbers it needed (a term dropped is a number not needed). */
  params: number;
  /** Lower is better: rms plus the penalty for numbers. */
  score: number;
  /** 0 to the shape rung's ceiling. */
  confidence: number;
  /** The form a surface should name it by: the rounded when there is one. */
  best: FitForm;
}

export type CurveFit =
  | {
      ok: true;
      /** Every family that holds the stroke, the likeliest first. Empty when none does — *no curve I know holds it*. */
      fits: FitReading[];
      /** The stroke's height used as the span, in canvas units, and how many samples it was read at. */
      span: number;
      samples: number;
      /** Said when the plane's scale was assumed, or no family held the stroke. */
      note?: string;
    }
  | { ok: false; reason: string; fits: [] };

// ===== Small numerics =====

const finite = (v: number) => Number.isFinite(v);

/** Solve A·x = b by elimination with partial pivoting; null when singular. A is n×n, row-major arrays. */
function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / M[r][r];
  }
  return x.every(finite) ? x : null;
}

/** Least squares of y on the columns `cols` (each a function of the sample): the coefficients, or null. */
function lstsq(xs: readonly number[], ys: readonly number[], cols: ((x: number) => number)[]): number[] | null {
  const k = cols.length;
  const A = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  const b = new Array<number>(k).fill(0);
  for (let i = 0; i < xs.length; i++) {
    const row = cols.map((f) => f(xs[i]));
    for (let r = 0; r < k; r++) {
      b[r] += row[r] * ys[i];
      for (let c = r; c < k; c++) A[r][c] += row[r] * row[c];
    }
  }
  for (let r = 0; r < k; r++) for (let c = 0; c < r; c++) A[r][c] = A[c][r];
  return solve(A, b);
}

/** A polyline resampled at equal steps along its length. */
function resample(pts: readonly Point[], n: number): Point[] {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const L = cum[cum.length - 1];
  if (!(L > 0)) return pts.slice();
  const out: Point[] = [];
  let j = 1;
  for (let i = 0; i < n; i++) {
    const s = (L * i) / (n - 1);
    while (j < pts.length - 1 && cum[j] < s) j++;
    const a = pts[j - 1], b = pts[j];
    const seg = cum[j] - cum[j - 1];
    const t = seg > 0 ? (s - cum[j - 1]) / seg : 0;
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
}

// ===== Numbers as they are written =====

/** A number to a given count of significant figures, with the zeros trimmed: 0.1017 → 0.10 → 0.1. */
export function sig(v: number, digits = 2): string {
  if (!finite(v)) return String(v);
  if (v === 0) return '0';
  const a = Math.abs(v);
  const d = a >= 100 ? 0 : Math.max(0, digits - 1 - Math.floor(Math.log10(a)));
  const s = String(Number(a.toFixed(Math.min(12, d))));
  const t = /e/.test(s) ? a.toFixed(12).replace(/\.?0+$/, '') : s;
  return (v < 0 ? '−' : '') + t;
}

const SUPERSCRIPT = ['⁰', '¹', '²', '³'];
const sign = (v: number) => (v < 0 ? '−' : '+');

/** A polynomial as it is written: the highest power first, no 1 in front of x, no zero terms. */
function polyText(coef: readonly { p: number; c: number }[], digits: number): { text: string; expr: string } {
  const terms = coef.filter((t) => t.c !== 0).sort((a, b) => b.p - a.p);
  if (!terms.length) return { text: 'y = 0', expr: '0' };
  let out = '';
  terms.forEach((t, i) => {
    const mag = Math.abs(t.c);
    const num = sig(mag, digits);
    const body = t.p === 0 ? num : `${num === '1' ? '' : num}x${t.p === 1 ? '' : SUPERSCRIPT[t.p]}`;
    out += i === 0 ? (t.c < 0 ? '−' : '') + body : ` ${sign(t.c)} ${body}`;
  });
  return { text: `y = ${out}`, expr: out };
}

// ===== Families =====

/** How far a fit is from the stroke, in canvas units: the distance to the curve, not the height above it. */
interface Measure {
  /** Plane units. */
  xs: number[];
  ys: number[];
  sx: number;
  sy: number;
  /** The stroke's height in canvas units, or a share of the plane's. */
  span: number;
  /** The stroke's x extent. */
  x0: number;
  x1: number;
  /** The least a term must be worth, as a share of the span: the hand's tremor is not a curve. */
  slack: number;
}

function errors(m: Measure, fn: (x: number) => number): { rms: number; worst: number } {
  const n = m.xs.length;
  const h = Math.max(1e-9, (m.x1 - m.x0) * 1e-3);
  const e: number[] = [];
  for (let i = 0; i < n; i++) {
    const yh = fn(m.xs[i]);
    if (!finite(yh)) return { rms: Infinity, worst: Infinity };
    const slope = ((fn(m.xs[i] + h) - fn(m.xs[i] - h)) / (2 * h)) * (m.sy / m.sx);
    const d = (Math.abs(m.ys[i] - yh) * m.sy) / Math.sqrt(1 + (finite(slope) ? slope * slope : 1e12));
    e.push(d);
  }
  const rms = Math.sqrt(e.reduce((a, d) => a + d * d, 0) / n) / m.span;
  const cut = Math.floor(n * ENDS_TRIM);
  const mid = e.slice(cut, n - cut);
  return { rms, worst: Math.max(...(mid.length ? mid : e)) / m.span };
}

interface Candidate {
  family: FitFamily;
  name: string;
  /** Its numbers, in order. */
  params: number[];
  /** Made from numbers: the curve, and the way it is written. */
  make(p: readonly number[]): (x: number) => number;
  write(p: readonly number[], digits: number): { text: string; expr: string };
  /** Per number, the values a person might write instead; the first is the number as fitted. */
  options(p: readonly number[]): number[][];
  /** How many numbers it needed, with terms dropped not counted. */
  used: number;
}

// ----- Polynomials -----

function polynomial(m: Measure, degree: 1 | 2 | 3): Candidate | null {
  const xmax = Math.max(Math.abs(m.x0), Math.abs(m.x1), 1e-9);
  let powers = Array.from({ length: degree + 1 }, (_, p) => p);
  const fit = (ps: readonly number[]): { coef: number[]; fn: (x: number) => number; rms: number } | null => {
    const c = lstsq(m.xs.map((x) => x / xmax), m.ys, ps.map((p) => (u: number) => u ** p));
    if (!c) return null;
    const coef = c.map((v, i) => v / xmax ** ps[i]);
    const fn = (x: number) => coef.reduce((a, v, i) => a + v * x ** ps[i], 0);
    return { coef, fn, rms: errors(m, fn).rms };
  };
  let best = fit(powers);
  if (!best) return null;
  // Drop the term whose loss is least, while the stroke is no further off by more than the hand's tremor.
  while (powers.length > 1) {
    let cheapest: { ps: number[]; f: NonNullable<ReturnType<typeof fit>> } | null = null;
    for (const p of powers) {
      const ps = powers.filter((q) => q !== p);
      const f = fit(ps);
      if (f && (!cheapest || f.rms < cheapest.f.rms)) cheapest = { ps, f };
    }
    if (!cheapest || cheapest.f.rms - best.rms > m.slack) break;
    powers = cheapest.ps;
    best = cheapest.f;
  }
  // Its highest power must be the family's own: a parabola whose bend is gone is the line.
  // (A line may be level: its x is the one term it can lose.)
  const top = Math.max(...powers);
  if (degree === 1 ? top > 1 : top !== degree) return null;
  const names = { 1: top === 0 ? 'a level line' : 'a line', 2: 'a parabola', 3: 'a cubic' } as const;
  const family = (['line', 'line', 'parabola', 'cubic'] as const)[degree];
  const ps = powers;
  const expand = (p: readonly number[]) => ps.map((q, i) => ({ p: q, c: p[i] }));
  return {
    family,
    name: names[degree],
    params: best.coef,
    used: ps.length,
    make: (p) => {
      const t = expand(p);
      return (x) => t.reduce((a, v) => a + v.c * x ** v.p, 0);
    },
    write: (p, digits) => polyText(expand(p), digits),
    options: (p) => p.map((v, i) => values(v, i === ps.length - 1 && top > 0)),
  };
}

// ----- A sine wave -----

function sine(m: Measure): Candidate | null {
  const span = m.x1 - m.x0;
  if (!(span > 0)) return null;
  const xm = (m.x0 + m.x1) / 2;
  const ts = m.xs.map((x) => x - xm);
  const n = ts.length;
  // y ≈ a sin(wt) + b cos(wt) + c, by the normal equations summed in one pass.
  const at = (w: number, withC: boolean) => {
    let ss = 0, cc = 0, sc = 0, s1 = 0, c1 = 0, ys = 0, yc = 0, y1 = 0, yy = 0;
    for (let i = 0; i < n; i++) {
      const sn = Math.sin(w * ts[i]), cs = Math.cos(w * ts[i]), y = m.ys[i];
      ss += sn * sn; cc += cs * cs; sc += sn * cs; s1 += sn; c1 += cs; ys += y * sn; yc += y * cs; y1 += y; yy += y * y;
    }
    const c = withC ? solve([[ss, sc, s1], [sc, cc, c1], [s1, c1, n]], [ys, yc, y1]) : solve([[ss, sc], [sc, cc]], [ys, yc]);
    if (!c) return null;
    const fn = (x: number) => c[0] * Math.sin(w * (x - xm)) + c[1] * Math.cos(w * (x - xm)) + (withC ? c[2] : 0);
    // The residual sum of squares from the sums: yy − c·b.
    const rss = yy - c[0] * ys - c[1] * yc - (withC ? c[2] * y1 : 0);
    return { c, fn, rss };
  };
  const lo = (2 * Math.PI * PERIODS[0]) / span, hi = (2 * Math.PI * PERIODS[1]) / span;
  const N = 120;
  let bw = lo, bs = Infinity;
  const grid: number[] = [];
  for (let i = 0; i <= N; i++) {
    const w = lo * (hi / lo) ** (i / N);
    grid.push(w);
    const f = at(w, true);
    if (f && f.rss < bs) { bs = f.rss; bw = w; }
  }
  // Refine between the neighbours of the best, by bisecting the slope of the residual.
  const k = grid.indexOf(bw);
  let a = grid[Math.max(0, k - 1)], b = grid[Math.min(N, k + 1)];
  for (let i = 0; i < 28; i++) {
    const m1 = a + (b - a) / 3, m2 = b - (b - a) / 3;
    const f1 = at(m1, true), f2 = at(m2, true);
    if (!f1 || !f2) break;
    if (f1.rss < f2.rss) b = m2; else a = m1;
  }
  const w = (a + b) / 2;
  let f = at(w, true);
  if (!f) return null;
  let withC = true;
  // An offset the hand's tremor could have made is not one.
  const flat = at(w, false);
  if (flat && errors(m, flat.fn).rms - errors(m, f.fn).rms <= m.slack) { f = flat; withC = false; }
  const A = Math.hypot(f.c[0], f.c[1]);
  if (!(A > 0) || A * m.sy < SINE_AMP_OF_SPAN * m.span) return null;
  // sin(w(x − xm) + φ0) = sin(wx + φ0 − w·xm)
  const phi0 = Math.atan2(f.c[1], f.c[0]);
  let phi = phi0 - w * xm;
  phi = ((((phi + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
  const params = withC ? [A, w, phi, f.c[2]] : [A, w, phi];
  const make = (p: readonly number[]) => (x: number) => p[0] * Math.sin(p[1] * x + p[2]) + (p.length > 3 ? p[3] : 0);
  return {
    family: 'sine',
    name: 'a sine wave',
    params,
    used: params.length,
    make,
    write: (p, digits) => sineText(p, digits),
    options: (p) => [values(p[0], true), omegas(p[1]), phases(p[2]), ...(p.length > 3 ? [values(p[3], false)] : [])],
  };
}

/** A sine as it is written: cos for a quarter turn, a minus for a half, π's multiples as π. */
function sineText(p: readonly number[], digits: number): { text: string; expr: string } {
  const [A, w, phi] = p;
  const c = p.length > 3 ? p[3] : 0;
  const q = Math.round(phi / (Math.PI / 2));
  const onQuarter = Math.abs(phi - q * (Math.PI / 2)) < 1e-9;
  let amp = A, fnName = 'sin', shift = 0;
  if (onQuarter) {
    const k = ((q % 4) + 4) % 4;
    fnName = k % 2 === 0 ? 'sin' : 'cos';
    if (k === 2 || k === 3) amp = -A;
  } else shift = phi;
  const pi = w / Math.PI;
  const wn = Math.abs(pi - Math.round(pi * 2) / 2) < 1e-9 && pi > 0 ? (pi === 1 ? 'π' : `${sig(pi, 3)}π`) : sig(w, digits);
  const arg = `${wn === '1' ? '' : wn}x${shift ? ` ${sign(shift)} ${sig(Math.abs(shift), digits)}` : ''}`;
  const body = `${amp < 0 ? '−' : ''}${Math.abs(amp) === 1 ? '' : sig(Math.abs(amp), digits)}${fnName}(${arg})`;
  const out = c ? `${body} ${sign(c)} ${sig(Math.abs(c), digits)}` : body;
  return { text: `y = ${out}`, expr: out };
}

// ----- An exponential -----

function exponential(m: Measure): Candidate | null {
  const span = m.x1 - m.x0;
  if (!(span > 0)) return null;
  const xm = (m.x0 + m.x1) / 2;
  const ts = m.xs.map((x) => x - xm);
  const at = (k: number) => {
    let num = 0, den = 0;
    for (let i = 0; i < ts.length; i++) {
      const e = Math.exp(k * ts[i]);
      num += m.ys[i] * e;
      den += e * e;
    }
    if (!(den > 0) || !finite(num)) return null;
    const a = num / den;
    let rss = 0;
    for (let i = 0; i < ts.length; i++) rss += (m.ys[i] - a * Math.exp(k * ts[i])) ** 2;
    return { a, rss };
  };
  const K = GROWTH_MAX / span;
  const N = 240;
  let bk = 0, bs = Infinity;
  for (let i = 0; i <= N; i++) {
    const k = -K + (2 * K * i) / N;
    if (Math.abs(k) * span < 0.3) continue;
    const f = at(k);
    if (f && f.rss < bs) { bs = f.rss; bk = k; }
  }
  if (!finite(bs)) return null;
  let a = bk - (2 * K) / N, b = bk + (2 * K) / N;
  for (let i = 0; i < 50; i++) {
    const m1 = a + (b - a) / 3, m2 = b - (b - a) / 3;
    const f1 = at(m1), f2 = at(m2);
    if (!f1 || !f2) break;
    if (f1.rss < f2.rss) b = m2; else a = m1;
  }
  const k = (a + b) / 2;
  const f = at(k);
  if (!f || Math.abs(k) * span < 0.3) return null;
  const amp = f.a * Math.exp(-k * xm);
  if (!finite(amp) || amp === 0) return null;
  return {
    family: 'exponential',
    name: 'an exponential',
    params: [amp, k],
    used: 2,
    make: (p) => (x) => p[0] * Math.exp(p[1] * x),
    write: (p, digits) => expText(p, digits),
    options: (p) => [values(p[0], true), rates(p[1])],
  };
}

/** The bases a person writes an exponential in. */
const BASES = [2, 3, 4, 5, 10, 0.5];

function expText(p: readonly number[], digits: number): { text: string; expr: string } {
  const [a, k] = p;
  const lead = a < 0 ? '−' : '';
  const am = Math.abs(a);
  const base = BASES.find((b) => Math.abs(Math.log(b) - k) < 1e-9);
  const coef = am === 1 ? '' : sig(am, digits);
  let out: string;
  if (base !== undefined) out = `${lead}${coef}${coef ? ' × ' : ''}${base === 0.5 ? '(1/2)' : base}^x`;
  else if (Math.abs(k - 1) < 1e-9) out = `${lead}${coef}e^x`;
  else out = `${lead}${coef}e^(${k < 0 ? '−' : ''}${Math.abs(k) === 1 ? '' : sig(Math.abs(k), digits)}x)`;
  return { text: `y = ${out}`, expr: out };
}

// ----- 1/x -----

function reciprocal(m: Measure): Candidate | null {
  const span = m.x1 - m.x0;
  const near = RECIPROCAL_CLEAR * span;
  if (!(span > 0) || (m.x0 < near && m.x1 > -near)) return null;
  let num = 0, den = 0;
  for (let i = 0; i < m.xs.length; i++) {
    num += m.ys[i] / m.xs[i];
    den += 1 / (m.xs[i] * m.xs[i]);
  }
  const k = num / den;
  if (!finite(k) || k === 0) return null;
  return {
    family: 'reciprocal',
    name: 'a reciprocal',
    params: [k],
    used: 1,
    make: (p) => (x) => p[0] / x,
    write: (p, digits) => {
      const k2 = p[0];
      const out = `${k2 < 0 ? '−' : ''}${Math.abs(k2) === 1 ? '1' : sig(Math.abs(k2), digits)}/x`;
      return { text: `y = ${out}`, expr: out };
    },
    options: (p) => [values(p[0], true)],
  };
}

// ===== What a person writes instead =====

const TIERS = [1, 0.5, 0.25, 0.1, 0.05, 0.01];

/** Numbers near `v` that a person writes: zero (unless the number must stay), whole numbers, halves, tenths, hundredths. The first is `v` itself. */
function values(v: number, keep: boolean): number[] {
  const out = [v];
  const push = (x: number) => {
    const r = Number(x.toFixed(10));
    if (!out.some((o) => Math.abs(o - r) < 1e-12) && (keep ? r !== 0 && Math.sign(r) === Math.sign(v) : true)) out.push(r);
  };
  if (!keep) push(0);
  for (const t of TIERS) push(Math.round(v / t) * t);
  return out;
}

/** A frequency: a number a person writes, or a multiple of π. */
function omegas(w: number): number[] {
  const out = values(w, true);
  for (const pi of [0.5, 1, 1.5, 2, 3, 4]) if (Math.abs(w - pi * Math.PI) / w < 0.25) out.push(pi * Math.PI);
  return out;
}

/** A phase: nought, a quarter turn, a half, three quarters — or as fitted. */
function phases(phi: number): number[] {
  const out = [phi];
  for (const q of [0, 1, 2, -1, -2]) if (Math.abs(phi - q * (Math.PI / 2)) < 0.5) out.push(q * (Math.PI / 2));
  return out;
}

/** A growth rate: a number a person writes, or the natural log of a base. */
function rates(k: number): number[] {
  const out = values(k, true);
  for (const b of BASES) if (Math.abs(Math.log(b) - k) < 0.35 * Math.abs(k)) out.push(Math.log(b));
  return out;
}

/** How plain a number is to write: nothing for zero, one for ±1, two for a whole number, three for a half or a tenth, four for a hundredth. */
function plainness(v: number): number {
  if (v === 0) return 0;
  const a = Math.abs(v);
  if (Math.abs(a - 1) < 1e-9) return 1;
  if (Math.abs(a - Math.round(a)) < 1e-9) return 2;
  if (Math.abs(a * 2 - Math.round(a * 2)) < 1e-9 || Math.abs(a * 10 - Math.round(a * 10)) < 1e-9) return 3;
  if (Math.abs(a * 100 - Math.round(a * 100)) < 1e-9) return 4;
  for (const b of BASES) if (Math.abs(a - Math.log(b)) < 1e-9) return 3;
  if (Math.abs(a / Math.PI - Math.round((a / Math.PI) * 2) / 2) < 1e-9) return 3;
  return 7;
}

/** The plainest form of a candidate that is within the drawing's precision of the stroke, or null. */
function roundOff(m: Measure, c: Candidate, fitRms: number): FitForm | null {
  const opts = c.options(c.params);
  let total = 1;
  for (const o of opts) total *= o.length;
  if (total > SNAP_MAX) return null;
  const limit = Math.max(fitRms * SNAP_FACTOR, fitRms + SNAP_ABS);
  let best: { p: number[]; cost: number; rms: number } | null = null;
  const pick: number[] = new Array(opts.length).fill(0);
  const walk = (i: number) => {
    if (i === opts.length) {
      const p = pick.map((j, k) => opts[k][j]);
      if (p.every((v, k) => Math.abs(v - c.params[k]) < 1e-12)) return;
      const cost = p.reduce((a, v) => a + plainness(v), 0);
      if (best && cost > best.cost) return;
      const rms = errors(m, c.make(p)).rms;
      if (rms > limit) return;
      if (!best || cost < best.cost || (cost === best.cost && rms < best.rms)) best = { p, cost, rms };
      return;
    }
    for (let j = 0; j < opts[i].length; j++) {
      pick[i] = j;
      walk(i + 1);
    }
  };
  walk(0);
  if (!best) return null;
  const b: { p: number[]; cost: number; rms: number } = best;
  return form(m, c, b.p, 6);
}

function form(m: Measure, c: Candidate, p: readonly number[], digits: number): FitForm {
  const fn = c.make(p);
  const e = errors(m, fn);
  const w = c.write(p, digits);
  return { text: w.text, expr: w.expr, params: p.slice(), fn, rms: e.rms, worst: e.worst };
}

// ===== The reading =====

const pct = (share: number) => Math.max(1, Math.ceil(share * 100 - 1e-9));

/**
 * A stroke on a plane, read as a function. `points` are the stroke's own points in canvas units. Returns every
 * family that holds it, ranked, each with its reason; or why no function can be read from it. `scale` is the hand's
 * (canvas units per screen pixel the stroke was drawn at), which sizes its wobble.
 */
export function fitCurve(plane: PlaneGeometry, points: readonly Point[], scale = 1): CurveFit {
  if (points.length < 3) return { ok: false, reason: 'too few points to be a curve', fits: [] };
  let len = 0;
  for (let i = 1; i < points.length; i++) len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  const n = Math.max(SAMPLES_MIN, Math.min(SAMPLES_MAX, Math.round(len / STEP_PX)));
  const rs = resample(points, n).map((p) => canvasToPlane(plane, p));
  const sx = plane.x.perUnit, sy = plane.y.perUnit;
  // Smooth the hand's tremor lightly, ends kept.
  const sm = rs.map((p, i) => (i === 0 || i === rs.length - 1 ? p : { x: (rs[i - 1].x + p.x + rs[i + 1].x) / 3, y: (rs[i - 1].y + p.y + rs[i + 1].y) / 3 }));

  // A function runs one way along x.
  const dir = Math.sign(sm[sm.length - 1].x - sm[0].x) || 1;
  const xs0 = sm.map((p) => p.x * dir);
  const extentPx = (Math.max(...xs0) - Math.min(...xs0)) * sx;
  if (extentPx < MIN_SPAN_PX) return { ok: false, reason: 'it does not reach across the plane far enough to be a curve of x', fits: [] };
  let back = 0;
  for (let i = 1; i < xs0.length; i++) back += Math.max(0, xs0[i - 1] - xs0[i]);
  const backPx = back * sx;
  if (backPx > Math.max(RETRACE_SHARE * extentPx, RETRACE_PX)) {
    return { ok: false, reason: `the pen doubled back along x (${Math.round(backPx)} px of ${Math.round(extentPx)}), so the stroke is no function of x`, fits: [] };
  }

  const ys = sm.map((p) => p.y);
  const heightPx = (Math.max(...ys) - Math.min(...ys)) * sy;
  const planeH = (plane.y.hi - plane.y.lo) * sy;
  const span = Math.max(heightPx, SPAN_FLOOR_OF_PLANE * planeH, 1e-9);
  const xs = sm.map((p) => p.x);
  const m: Measure = { xs, ys, sx, sy, span, x0: Math.min(...xs), x1: Math.max(...xs), slack: Math.max(DROP_SLACK, (HAND_WOBBLE_PX * scale) / span) };

  const cands = [polynomial(m, 1), polynomial(m, 2), polynomial(m, 3), sine(m), exponential(m), reciprocal(m)].filter((c): c is Candidate => !!c);
  const fits: FitReading[] = [];
  for (const c of cands) {
    const fitted = form(m, c, c.params, 2);
    if (!finite(fitted.rms) || fitted.rms > KEEP_RMS) continue;
    const rounded = roundOff(m, c, fitted.rms) ?? undefined;
    const best = rounded ?? fitted;
    const score = fitted.rms + PENALTY * Math.max(0, c.used - 1);
    const confidence = MAX * Math.max(0, 1 - fitted.rms / RMS_ZERO);
    const say = `${c.name}, ${best.text}, within ${pct(best.worst)}% of the span`;
    fits.push({
      family: c.family,
      name: c.name,
      fitted,
      ...(rounded ? { rounded } : {}),
      say: rounded ? say : `${c.name}, ${fitted.text}, within ${pct(fitted.worst)}% of the span`,
      reason: `${c.name} needing ${c.used} number${c.used === 1 ? '' : 's'}: the stroke is ${(fitted.rms * 100).toFixed(1)}% of the span off it (rms, ${pct(fitted.worst)}% at the worst)${rounded ? `; as ${rounded.text} it is ${(rounded.rms * 100).toFixed(1)}% off, within the drawing's own wobble` : ''}`,
      params: c.used,
      score,
      confidence,
      best,
    });
  }
  fits.sort((a, b) => a.score - b.score || a.params - b.params);
  const assumed = plane.x.how === 'assumed' || plane.y.how === 'assumed';
  const note = !fits.length ? `no curve I know (a line, parabola, cubic, sine, exponential or 1/x) holds it within ${Math.round(KEEP_RMS * 100)}% of the span` : assumed ? 'the plane’s scale was assumed, so the numbers are in units the drawing never said' : undefined;
  return { ok: true, fits, span, samples: n, ...(note ? { note } : {}) };
}

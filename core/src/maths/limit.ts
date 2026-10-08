// Limits (MATHS-SPEC lane B, M13) — Jake's limit and the ones like it.
//
//     lim x→2 (x² − 4)/(x − 2) = 4        lim x→0 sin x / x = 1        lim x→∞ (1 + 1/x)ˣ = e
//
// Four methods, tried in this order, and each result says which one it was (rule 12):
//
//   1. **substitution** — put the point in. If the function has a value there, and is defined
//      on both sides of it, that is the limit. A number over zero is the other thing
//      substitution finds: a pole, and the signs either side say where it goes.
//   2. **factoring** — for 0/0 in a ratio of polynomials: factor top and bottom (poly.ts),
//      cross out what is common, put the point in what is left. At infinity, the highest
//      power on each side. Exact: the steps are written out, the common factor struck.
//   3. **known** — sin x / x, tan x / x, (1 − cos x)/x, (1 − cos x)/x², (eˣ − 1)/x,
//      ln(1 + x)/x and (1 + 1/x)ˣ, scaled and shifted (sin 3x / x, sin(x − 2)/(x − 2)); a
//      known limit is claimed only when the numbers from both sides confirm it.
//   4. **numeric** — sample both sides, 0.1, 0.01, 0.001 … away, and say what the numbers do:
//      settle, grow without bound, disagree, or never settle. A number found this way is
//      "numerically from both sides", not a proof, and is rounded to a simple fraction only
//      when it is that near one.
//
// Never evaluated exactly at the point being approached: the samples are on either side of
// it, so a hole is never read as a value. A one-sided or infinite limit is said as such.
// Tier 1: nothing here is asked of a model.

import type { FnNode } from './fn';
import { evalFn, formatFn, freeVariables, parseFn } from './fn';
import type { Poly } from './poly';
import { analyseRational, factorPoly, polyDegree, polyEvalRat, polyPow, polyScale, polyText, rat, ratDiv, ratFromNumber, ratIsZero, ratSign, ratText, ratToNumber, rationalParts } from './poly';

export type LimitSide = 'left' | 'right' | 'both';

export interface LimitStep {
  kind: 'substitute' | 'factor' | 'cancel' | 'known' | 'sample';
  /** As written down: `(x + 2)(x − 2)/(x − 2) = x + 2`. */
  text: string;
  /** Why, in words. */
  why: string;
  /** For a cancel: the factors crossed out, as written (`x − 2`). */
  struck?: string[];
}

export interface ApproachPoint {
  x: number;
  /** The function there; null where it is undefined. */
  y: number | null;
}

export interface Approach {
  /** Nearer and nearer the point, 0.1 away, 0.01 … — never the point itself. */
  points: ApproachPoint[];
  behaviour: 'settles' | 'grows' | 'oscillates' | 'undefined' | 'not approached';
  /** What it settles on, ±Infinity if it grows without bound, null otherwise. */
  settles: number | null;
}

export interface Approaches {
  /** Values of x below the point (for +∞, all of them); empty when the point is −∞. */
  left: Approach;
  /** Values of x above the point (for −∞, all of them); empty when the point is +∞. */
  right: Approach;
  /** Whether the sides asked about arrive at the same place. */
  agree: boolean;
}

export type LimitResult =
  | {
      ok: true;
      variable: string;
      at: number;
      side: LimitSide;
      /** The limit; ±Infinity when it grows without bound; null when there is none. */
      value: number | null;
      /** The limit exactly, when it is a simple fraction or e or π: `4`, `8/3`, `e`. */
      exact: string | null;
      kind: 'finite' | 'infinite' | 'does not exist';
      method: 'substitution' | 'factoring' | 'known' | 'numeric';
      steps: LimitStep[];
      approach?: Approaches;
      /** What each side heads for, when they were asked about separately. */
      sides?: { left: number | null; right: number | null };
      /** For a known limit: whether the numbers from both sides agree with it. */
      confirmed?: boolean;
      reason: string;
    }
  | { ok: false; reason: string };

type Ok = Extract<LimitResult, { ok: true }>;

/** How many samples are taken to either side, and how far each is from the point: 10⁻¹ … 10⁻⁵ (nearer, and the cancelling of nearly equal numbers loses the answer). */
const SAMPLES = 5;
/** The numbers agree, or a sequence has settled, when they are this near, relative to their size. */
const SETTLE_TOL = 1e-4;
/** Or when the steps shrink fourfold at least and are this near each other. */
const SETTLE_LOOSE = 1e-3;
/** A number is a simple fraction, or e or π, when the samples are this near it. */
const SNAP_TOL = 2e-6;
/** The most a snapped fraction's denominator may be. */
const SNAP_DENOMINATORS = 12;
/** A sequence has grown without bound when it is past this and its steps are not shrinking. */
const GROWN_PAST = 10;
/** How far from the point the defined-on-both-sides check looks, as a share of the scale. */
const DOMAIN_STEPS = [1e-3, 1e-5, 1e-7];
/** A known limit is confirmed when the samples are within this of it, relative to its size. */
const CONFIRM_TOL = 1e-3;

const show = (v: number): string =>
  v === Infinity ? '∞' : v === -Infinity ? '−∞' : Math.abs(v - Math.PI) < 1e-12 ? 'π' : Math.abs(v + Math.PI) < 1e-12 ? '−π' : String(Number(v.toPrecision(6))).replace('-', '−');

/** How far from a point is "near" for a number of that size. */
const scaleOf = (a: number): number => (Number.isFinite(a) && Math.abs(a) >= 10 ? 10 ** Math.floor(Math.log10(Math.abs(a))) : 1);

// ===== Sampling =====

function sample(node: FnNode, v: string, a: number, dir: -1 | 1): ApproachPoint[] {
  const out: ApproachPoint[] = [];
  const scale = scaleOf(a);
  for (let k = 1; k <= SAMPLES; k++) {
    const x = Number.isFinite(a) ? Number((a + dir * 10 ** -k * scale).toPrecision(12)) : Math.sign(a) * 10 ** k;
    if (x === a) continue;
    const y = evalFn(node, { [v]: x });
    out.push({ x, y: y === null ? null : Number(y.toPrecision(10)) });
  }
  return out;
}

/** The nicest number a limit could be: a whole number, a simple fraction, e or π — if the sample is that near it. */
function snap(v: number): { value: number; exact: string } | null {
  const tol = SNAP_TOL * Math.max(1, Math.abs(v));
  const whole = Math.round(v);
  if (Math.abs(v - whole) <= tol) return { value: whole, exact: String(whole).replace('-', '−') };
  for (let q = 2; q <= SNAP_DENOMINATORS; q++) {
    const p = Math.round(v * q);
    if (Math.abs(v - p / q) <= tol) {
      return { value: p / q, exact: ratText(rat(p, q)) };
    }
  }
  if (Math.abs(v - Math.E) <= tol) return { value: Math.E, exact: 'e' };
  if (Math.abs(v - Math.PI) <= tol) return { value: Math.PI, exact: 'π' };
  return null;
}


/** Where a settling run is heading: the last sample, or — when the steps shrink one after another the same way — Aitken's estimate of where they end. */
function heading(a: number, b: number, c: number): number {
  const d1 = b - a, d2 = c - b;
  const second = d2 - d1;
  const r = d1 !== 0 ? d2 / d1 : 1;
  if (Math.abs(second) > 0 && r > 0 && r < 0.5 && Math.sign(d1) === Math.sign(d2)) return c - (d2 * d2) / second;
  return c;
}

/** What a run of samples does as it nears the point. */
function classify(points: ApproachPoint[]): Approach {
  if (!points.length) return { points, behaviour: 'not approached', settles: null };
  const ys = points.map((p) => p.y);
  const defined = ys.filter((y): y is number => y !== null);
  if (defined.length < 3 || ys.slice(-3).some((y) => y === null)) return { points, behaviour: 'undefined', settles: null };
  const n = defined.length;
  const [a, b, c] = [defined[n - 3], defined[n - 2], defined[n - 1]];
  const d1 = Math.abs(b - a), d2 = Math.abs(c - b);
  // runs away: past GROWN_PAST in size, growing, and the steps not dying away
  const grows = Math.abs(c) > GROWN_PAST && Math.abs(c) > Math.abs(b) && Math.abs(b) > Math.abs(a) && Math.sign(a) === Math.sign(c) && Math.sign(b) === Math.sign(c) && d2 >= 0.5 * d1;
  if (grows) return { points, behaviour: 'grows', settles: c > 0 ? Infinity : -Infinity };
  const size = Math.max(1, Math.abs(c));
  if (d2 <= SETTLE_TOL * size || (d2 <= 0.25 * d1 && d2 <= SETTLE_LOOSE * size)) {
    const est = heading(a, b, c) + 0;
    const s = snap(est);
    return { points, behaviour: 'settles', settles: (s ? s.value : Number(est.toPrecision(6))) + 0 };
  }
  return { points, behaviour: 'oscillates', settles: null };
}

function approach(node: FnNode, v: string, a: number): Approaches {
  const left = a === -Infinity ? [] : sample(node, v, a, -1);
  const right = a === Infinity ? [] : sample(node, v, a, 1);
  const L = classify(left), R = classify(right);
  return { left: L, right: R, agree: sidesAgree(L, R) };
}

const sameSettle = (x: number | null, y: number | null): boolean =>
  x !== null && y !== null && (x === y || (Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) <= SETTLE_TOL * Math.max(1, Math.abs(x))));

function sidesAgree(L: Approach, R: Approach): boolean {
  if (L.behaviour === 'not approached') return R.settles !== null;
  if (R.behaviour === 'not approached') return L.settles !== null;
  return sameSettle(L.settles, R.settles);
}

// ===== Steps and results =====

const ratio = (num: string, den: string): string => {
  const signs = (t: string): boolean => {
    let depth = 0;
    for (const ch of t) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (depth === 0 && (ch === '+' || ch === '−')) return true;
    }
    return false;
  };
  const single = (t: string): boolean => /^\([^()]*\)[⁰¹²³⁴⁵⁶⁷⁸⁹]*$/.test(t) || /^[\w.]+[⁰¹²³⁴⁵⁶⁷⁸⁹]*$/.test(t);
  return `${signs(num) ? `(${num})` : num}/${single(den) ? den : `(${den})`}`;
};

function sentenceOfSides(v: string, a: number, left: number | null, right: number | null): string {
  const where = (n: number | null) => (n === null ? 'nowhere it settles' : show(n));
  return `from the left it heads for ${where(left)} and from the right for ${where(right)}, so ${v} → ${show(a)} has no single limit`;
}

function result(base: Omit<Ok, 'ok' | 'steps'> & { steps?: LimitStep[] }): Ok {
  return { ok: true, steps: [], ...base };
}

// ===== Substitution and factoring =====

/** The exact fraction a place is: 2, 0.5, 2.25 — or 1/3 for the double nearest it. Null when it is neither (π, 0.7071…). */
function pointOf(a: number): ReturnType<typeof rat> | null {
  const r = ratFromNumber(a);
  if (r && r.d <= 1000000n) return r;
  for (let q = 2; q <= 1000; q++) {
    const p = Math.round(a * q);
    if (Math.abs(a - p / q) <= 1e-12 * Math.max(1, Math.abs(a))) return rat(p, q);
  }
  return null;
}

/** The limit of a ratio of polynomials at a rational point — exact. Null when the point is not one this can do. */
function rationalLimit(node: FnNode, v: string, a: number, side: LimitSide): Ok | null {
  const parts = rationalParts(node, v);
  if (!parts.ok) return null;
  const point = pointOf(a);
  if (!point) return null;
  const an = analyseRational(node, v);
  if (!an.ok) return null;
  const N = parts.numerator, D = parts.denominator;
  const text = formatFn(node);
  const at = `${v} = ${show(a)}`;
  const Dp = polyEvalRat(D, point);
  const Np = polyEvalRat(N, point);
  if (!ratIsZero(Dp)) {
    // the denominator is not zero here: substitution
    const y = ratDiv(Np, Dp);
    return result({
      variable: v, at: a, side, value: ratToNumber(y), exact: ratText(y), kind: 'finite', method: 'substitution',
      steps: [{ kind: 'substitute', text: `${text} at ${at} is ${ratText(y)}`, why: 'put the number in' }],
      reason: `by substitution: ${text} is ${ratText(y)} at ${at}`,
    });
  }
  const Nr = an.reducedNumerator, Dr = an.reducedDenominator;
  const Dr_a = polyEvalRat(Dr, point);
  const Nr_a = polyEvalRat(Nr, point);
  if (!ratIsZero(Dr_a)) {
    // 0/0 — a factor to cancel
    const steps: LimitStep[] = [{ kind: 'substitute', text: `${text} at ${at} is ${ratIsZero(Np) ? '0/0' : `${ratText(Np)}/0`}`, why: 'putting the number in gives 0 over 0, which says nothing yet' }];
    const fn = factorPoly(N), fd = factorPoly(D);
    const ft = ratio(factorsText(fn, v), factorsText(fd, v));
    steps.push({ kind: 'factor', text: ft, why: 'factor the top and the bottom' });
    const y = ratDiv(Nr_a, Dr_a);
    const struck = factorPoly(an.common).factors.flatMap((f) => Array<string>(f.power).fill(f.text));
    steps.push({
      kind: 'cancel',
      text: `${ft} = ${an.reduced}`,
      why: `${[...new Set(struck)].join(' and ')} is on the top and the bottom, and ${v} is never ${show(a)} on the way in, so it cancels`,
      struck,
    });
    steps.push({ kind: 'substitute', text: `${an.reduced} at ${at} is ${ratText(y)}`, why: 'now put the number in' });
    return result({
      variable: v, at: a, side, value: ratToNumber(y), exact: ratText(y), kind: 'finite', method: 'factoring', steps,
      reason: `by factoring: ${text} = ${an.reduced} for ${v} ≠ ${show(a)}, and ${an.reduced} is ${ratText(y)} at ${at}`,
    });
  }
  // a number over zero: where does it go either side?
  if (ratIsZero(Nr_a)) return null;
  const pole = an.poles.find((p) => Math.abs(p.x - a) <= 1e-9 * Math.max(1, Math.abs(a)));
  if (!pole) return null;
  const goes = (s: '+∞' | '−∞') => (s === '+∞' ? Infinity : -Infinity);
  const [l, r] = [goes(pole.sides[0]), goes(pole.sides[1])];
  const steps: LimitStep[] = [
    { kind: 'substitute', text: `${an.reduced} at ${at} is ${ratText(Nr_a)}/0`, why: 'a number that is not zero over zero: the curve runs off beside this line' },
  ];
  return pickSide({ variable: v, a, side, left: l, right: r, method: 'substitution', steps, text, how: `by substitution: ${text} at ${at} is ${ratText(Nr_a)} over 0` });
}

/** A rational function at infinity: the highest power on each side. */
function rationalAtInfinity(node: FnNode, v: string, a: number): Ok | null {
  const parts = rationalParts(node, v);
  if (!parts.ok) return null;
  const an = analyseRational(node, v);
  if (!an.ok) return null;
  const N = an.reducedNumerator, D = an.reducedDenominator;
  if (!N.length) return null;
  const dn = polyDegree(N), dd = polyDegree(D);
  const text = formatFn(node);
  const where = `${v} → ${show(a)}`;
  const powerText = (n: number) => (n === 0 ? '1' : n === 1 ? v : `${v}${sup(n)}`);
  const why = `factor out the highest power of ${v}, ${powerText(Math.max(dn, dd))}, from the top and the bottom`;
  const steps: LimitStep[] = [{ kind: 'factor', text: `${text}: the top is led by ${powerText(dn)} and the bottom by ${powerText(dd)}`, why }];
  const done = (value: number, exact: string | null, kind: 'finite' | 'infinite', words: string): Ok =>
    result({ variable: v, at: a, side: 'both', value, exact, kind, method: 'factoring', steps, reason: `by factoring out the highest power of ${v}: ${words}` });
  if (dn < dd) {
    steps.push({ kind: 'cancel', text: `every term with ${v} in it shrinks away`, why: 'the bottom grows faster than the top, so the ratio goes to 0' });
    return done(0, '0', 'finite', `the bottom grows faster than the top, so ${text} → 0 as ${where}`);
  }
  const lt = ratDiv(N[dn], D[dd]);
  if (dn === dd) {
    steps.push({ kind: 'cancel', text: `${ratText(N[dn])}/${ratText(D[dd])} = ${ratText(lt)}`, why: 'only the leading terms are left: the ratio of their coefficients' });
    return done(ratToNumber(lt), ratText(lt), 'finite', `only the leading terms count, ${ratText(N[dn])}/${ratText(D[dd])}, so ${text} → ${ratText(lt)} as ${where}`);
  }
  const odd = (dn - dd) % 2 === 1;
  const value = (ratSign(lt) > 0) === (a > 0 || !odd) ? Infinity : -Infinity;
  steps.push({ kind: 'cancel', text: `${text} behaves like ${ratText(lt)}${powerText(dn - dd)}`, why: `the top grows ${dn - dd} power${dn - dd === 1 ? '' : 's'} of ${v} faster than the bottom, without bound` });
  return done(value, null, 'infinite', `the top grows faster than the bottom, so ${text} goes to ${show(value)} as ${where}`);
}

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = (n: number): string => String(n).replace(/\d/g, (d) => SUP[Number(d)]);

/** The factored text of a polynomial, or '' when it did not factor at all. */
function factorsText(f: ReturnType<typeof factorPoly>, v: string): string {
  if (!f.factors.length) return ratText(f.constant);
  const bare = (p: Poly) => p.length === 2 && ratIsZero(p[0]) && p[1].n === 1n && p[1].d === 1n;
  const pow = (s: string, k: number) => (k === 1 ? s : `${s}${sup(k)}`);
  const parts = f.factors.map((g) => (bare(g.poly) ? pow(v, g.power) : pow(`(${polyText(g.poly, v)})`, g.power)));
  const c = f.constant;
  const prefix = c.n === 1n && c.d === 1n ? '' : c.n === -1n && c.d === 1n ? '−' : c.d === 1n ? ratText(c) : `(${ratText(c)})`;
  if (!prefix && f.factors.length === 1 && f.factors[0].power === 1 && !bare(f.factors[0].poly)) return polyText(f.factors[0].poly, v);
  return prefix + parts.join('');
}

interface Pick {
  variable: string;
  a: number;
  side: LimitSide;
  left: number | null;
  right: number | null;
  method: Ok['method'];
  steps: LimitStep[];
  text: string;
  how: string;
}

/** The limit that is asked for, given where each side goes (finite, ±∞ or nowhere). */
function pickSide(p: Pick): Ok {
  const { variable: v, a, side, left, right } = p;
  const where = `${v} → ${show(a)}${side === 'left' ? ' from the left' : side === 'right' ? ' from the right' : ''}`;
  const one = (n: number | null, which: string): Ok => {
    if (n === null) return result({ variable: v, at: a, side, value: null, exact: null, kind: 'does not exist', method: p.method, steps: p.steps, sides: { left, right }, reason: `${p.how}; ${which} the function does not settle, so there is no limit as ${where}` });
    const infinite = !Number.isFinite(n);
    return result({
      variable: v, at: a, side, value: n, exact: infinite ? null : snap(n)?.exact ?? null, kind: infinite ? 'infinite' : 'finite', method: p.method, steps: p.steps, sides: { left, right },
      reason: `${p.how}; ${infinite ? `${p.text} goes to ${show(n)} as ${where}` : `${p.text} → ${show(n)} as ${where}`}`,
    });
  };
  if (side === 'left') return one(left, 'from the left');
  if (side === 'right') return one(right, 'from the right');
  if (left !== null && right !== null && sameSettle(left, right)) return one(left, 'on both sides');
  const opposite = left !== null && right !== null && Number.isFinite(left) === false && Number.isFinite(right) === false && left !== right;
  return result({
    variable: v, at: a, side, value: null, exact: null, kind: 'does not exist', method: p.method, steps: p.steps, sides: { left, right },
    reason: `${p.how}; ${opposite ? `the two sides go off in opposite directions, ${show(left!)} on the left and ${show(right!)} on the right, so there is no limit` : sentenceOfSides(v, a, left, right)}`,
  });
}

// ===== Known limits =====

interface Known {
  value: number;
  exact: string;
  /** In words, for the step. */
  name: string;
  why: string;
}

const polyOf = (node: FnNode, v: string): Poly | null => {
  const parts = rationalParts(node, v);
  if (!parts.ok || !(parts.denominator.length === 1)) return null;
  return parts.numerator.map((c) => ratDiv(c, parts.denominator[0]));
};

/** u as k(x − a): the number k when u is linear and vanishes at a. */
function linearAt(node: FnNode, v: string, a: number): { k: number } | null {
  const p = polyOf(node, v);
  const point = pointOf(a);
  if (!p || !point || polyDegree(p) !== 1 || !ratIsZero(polyEvalRat(p, point))) return null;
  return { k: ratToNumber(p[1]) };
}

/** w as m(x − a)ⁿ exactly, with nothing else in it: the number m. */
function orderAt(node: FnNode, v: string, a: number, n: 1 | 2): number | null {
  const p = polyOf(node, v);
  const point = pointOf(a);
  if (!p || !point || polyDegree(p) !== n) return null;
  const want = polyScale(polyPow([rat(0n - point.n, point.d), rat(1)], n), p[n]);
  const same = want.length === p.length && want.every((c, i) => c.n === p[i].n && c.d === p[i].d);
  return same ? ratToNumber(p[n]) : null;
}

const isCall = (n: FnNode, fn: string): n is Extract<FnNode, { k: 'call' }> => n.k === 'call' && n.fn === fn;
const isOne = (n: FnNode) => n.k === 'num' && n.v === 1;
const isEuler = (n: FnNode) => n.k === 'const' && n.name === 'e';

function fraction(k: number, m: number): { value: number; exact: string } {
  const r = ratDiv(ratFromNumber(k)!, ratFromNumber(m)!);
  return { value: ratToNumber(r), exact: ratText(r) };
}

/** The textbook limits, scaled and shifted, matched on the tree; null when the tree is none of them. */
function knownLimit(node: FnNode, v: string, a: number): Known | null {
  if (node.k !== 'bin') return null;
  if (node.op === '/') {
    const top = node.a, bottom = node.b;
    const finite = Number.isFinite(a);
    // sin(u)/w and tan(u)/w, u = k(x − a), w = m(x − a)
    if (finite && (isCall(top, 'sin') || isCall(top, 'tan'))) {
      const u = linearAt(top.a, v, a), w = orderAt(bottom, v, a, 1);
      if (u && w) {
        const f = fraction(u.k, w);
        return { ...f, name: `${top.fn}(u)/u → 1 as u → 0`, why: `${top.fn} of a small angle is that angle, so ${formatFn(top)}/${formatFn(bottom)} → ${u.k}/${w}` };
      }
    }
    // w/sin(u), w/tan(u)
    if (finite && (isCall(bottom, 'sin') || isCall(bottom, 'tan'))) {
      const u = linearAt(bottom.a, v, a), w = orderAt(top, v, a, 1);
      if (u && w) {
        const f = fraction(w, u.k);
        return { ...f, name: `u/${bottom.fn}(u) → 1 as u → 0`, why: `${bottom.fn} of a small angle is that angle, so ${formatFn(top)}/${formatFn(bottom)} → ${w}/${u.k}` };
      }
    }
    // (1 − cos u)/w and (cos u − 1)/w
    const cosForm = (t: FnNode): { sign: 1 | -1; u: FnNode } | null => {
      if (t.k === 'bin' && t.op === '-' && isOne(t.a) && isCall(t.b, 'cos')) return { sign: 1, u: t.b.a };
      if (t.k === 'bin' && t.op === '-' && isCall(t.a, 'cos') && isOne(t.b)) return { sign: -1, u: t.a.a };
      return null;
    };
    const cf = finite ? cosForm(top) : null;
    if (cf) {
      const u = linearAt(cf.u, v, a);
      const w1 = orderAt(bottom, v, a, 1), w2 = orderAt(bottom, v, a, 2);
      if (u && w1) return { value: 0, exact: '0', name: '(1 − cos u)/u → 0 as u → 0', why: `1 − cos of a small angle is far smaller than the angle, so the ratio → 0` };
      if (u && w2) {
        const f = fraction(cf.sign * u.k * u.k, 2 * w2);
        return { ...f, name: '(1 − cos u)/u² → 1/2 as u → 0', why: `1 − cos u is about u²/2 for a small u, so the ratio → ${f.exact}` };
      }
    }
    // (eᵘ − 1)/w and ln(1 + u)/w
    const expForm = (t: FnNode): FnNode | null => {
      if (t.k !== 'bin' || t.op !== '-' || !isOne(t.b)) return null;
      if (isCall(t.a, 'exp')) return t.a.a;
      if (t.a.k === 'bin' && t.a.op === '^' && isEuler(t.a.a)) return t.a.b;
      return null;
    };
    const eu = finite ? expForm(top) : null;
    if (eu) {
      const u = linearAt(eu, v, a), w = orderAt(bottom, v, a, 1);
      if (u && w) {
        const f = fraction(u.k, w);
        return { ...f, name: '(eᵘ − 1)/u → 1 as u → 0', why: `eᵘ − 1 is about u for a small u, so the ratio → ${f.exact}` };
      }
    }
    if (finite && isCall(top, 'ln') && top.a.k === 'bin' && top.a.op === '+') {
      const inner = isOne(top.a.a) ? top.a.b : isOne(top.a.b) ? top.a.a : null;
      const u = inner ? linearAt(inner, v, a) : null, w = orderAt(bottom, v, a, 1);
      if (u && w) {
        const f = fraction(u.k, w);
        return { ...f, name: 'ln(1 + u)/u → 1 as u → 0', why: `ln(1 + u) is about u for a small u, so the ratio → ${f.exact}` };
      }
    }
    return null;
  }
  // (1 + c/x)^(kx) at ∞ is e^(ck); (1 + kx)^(1/x) at 0 is e^k
  if (node.op === '^') {
    const base = node.a, ex = node.b;
    const lin = (t: FnNode): number | null => {
      const p = polyOf(t, v);
      return p && polyDegree(p) === 1 && ratIsZero(p[0]) ? ratToNumber(p[1]) : p && polyDegree(p) === 0 ? 0 : null;
    };
    if (!Number.isFinite(a) && base.k === 'bin' && base.op === '+' && isOne(base.a) && base.b.k === 'bin' && base.b.op === '/' && base.b.a.k === 'num' && base.b.b.k === 'var' && base.b.b.name === v) {
      const k = lin(ex);
      if (k !== null && k !== 0) return eTo(base.b.a.v * k, '(1 + 1/x)ˣ → e as x → ∞');
    }
    if (a === 0 && base.k === 'bin' && base.op === '+' && isOne(base.a)) {
      const c = lin(base.b);
      const inv = ex.k === 'bin' && ex.op === '/' && ex.a.k === 'num' && ex.b.k === 'var' && ex.b.name === v ? ex.a.v : null;
      if (c !== null && c !== 0 && inv !== null) return eTo(c * inv, '(1 + x)^(1/x) → e as x → 0');
    }
  }
  return null;
}

function eTo(power: number, name: string): Known {
  const exact = power === 1 ? 'e' : `e${Number.isInteger(power) && power > 1 ? sup(power) : `^${show(power)}`}`;
  return { value: Math.exp(power), exact, name, why: 'this is the limit that defines e' };
}

// ===== The limit =====

/**
 * The limit of a function of one variable as it nears `a` (a number, or ±Infinity), from both
 * sides unless `side` says one. Substitution, then cancelling, then the known limits, then the
 * numbers from both sides; the result says which, shows the steps, and gives the approach.
 */
export function limit(input: string | FnNode, variable: string, a: number, side: LimitSide = 'both'): LimitResult {
  if (Number.isNaN(a)) return { ok: false, reason: 'there is no place to approach: the number is not a number' };
  let node: FnNode;
  if (typeof input === 'string') {
    const p = parseFn(input, { variables: [variable] });
    if (!p.ok) return p;
    node = p.node;
  } else node = input;
  const others = freeVariables(node).filter((n) => n !== variable);
  if (others.length) {
    return { ok: false, reason: `${others.join(' and ')} ${others.length === 1 ? 'is' : 'are'} a letter with no value — a limit in ${variable} needs numbers for the rest` };
  }
  const text = formatFn(node);
  const finishing = (r: Ok): Ok => (r.approach ? r : { ...r, approach: approach(node, variable, a) });

  if (Number.isFinite(a)) {
    // 1. substitution
    const v = evalFn(node, { [variable]: a });
    if (v !== null) {
      const scale = scaleOf(a);
      const near = (dir: -1 | 1) => DOMAIN_STEPS.map((h) => evalFn(node, { [variable]: a + dir * h * scale }));
      const l = near(-1), r = near(1);
      const defined = (ys: (number | null)[]) => ys.every((y) => y !== null);
      const absent = (ys: (number | null)[]) => ys.every((y) => y === null);
      if (defined(l) && defined(r)) {
        const exactly = rationalLimit(node, variable, a, side);
        if (exactly && exactly.method === 'substitution') return finishing(exactly);
        const shown = Number(v.toPrecision(10));
        return finishing(result({
          variable, at: a, side, value: shown, exact: snap(shown)?.exact ?? null, kind: 'finite', method: 'substitution',
          steps: [{ kind: 'substitute', text: `${text} at ${variable} = ${show(a)} is ${show(shown)}`, why: 'put the number in' }],
          reason: `by substitution: ${text} is ${show(shown)} at ${variable} = ${show(a)}`,
        }));
      }
      if ((absent(l) || absent(r)) && (defined(l) || defined(r))) {
        // defined at the point and on one side only: a limit from that side, none from both
        const lv = defined(l) ? shownOrNull(v) : null, rv = defined(r) ? shownOrNull(v) : null;
        const steps: LimitStep[] = [{ kind: 'substitute', text: `${text} at ${variable} = ${show(a)} is ${show(v)}`, why: `${text} is not defined on the ${absent(l) ? 'left' : 'right'} of ${show(a)}` }];
        const missing = absent(l) ? 'left' : 'right';
        if (side === 'both') {
          return finishing(result({
            variable, at: a, side, value: null, exact: null, kind: 'does not exist', method: 'substitution', steps, sides: { left: lv, right: rv },
            reason: `by substitution: ${text} is not defined to the ${missing} of ${show(a)}, so there is no two-sided limit; from the ${missing === 'left' ? 'right' : 'left'} it is ${show(v)}`,
          }));
        }
        if ((side === 'left' && absent(l)) || (side === 'right' && absent(r))) {
          return finishing(result({
            variable, at: a, side, value: null, exact: null, kind: 'does not exist', method: 'substitution', steps, sides: { left: lv, right: rv },
            reason: `by substitution: ${text} is not defined to the ${side} of ${show(a)}, so there is no limit from the ${side}`,
          }));
        }
        return finishing(result({
          variable, at: a, side, value: Number(v.toPrecision(10)), exact: snap(v)?.exact ?? null, kind: 'finite', method: 'substitution', steps, sides: { left: lv, right: rv },
          reason: `by substitution: ${text} is ${show(v)} at ${variable} = ${show(a)}, and the ${side} of it is where it is defined`,
        }));
      }
    }
    // 2. factoring (and a number over zero)
    const found = rationalLimit(node, variable, a, side);
    if (found) return finishing(found);
  } else {
    const inf = rationalAtInfinity(node, variable, a);
    if (inf) return finishing({ ...inf, side: side });
  }

  // 3. known limits, confirmed by the numbers
  const known = knownLimit(node, variable, a);
  const ap = approach(node, variable, a);
  if (known) {
    const heading = (s: Approach) => s.behaviour === 'not approached' || (s.settles !== null && Number.isFinite(s.settles) && Math.abs(s.settles - known.value) <= CONFIRM_TOL * Math.max(1, Math.abs(known.value)));
    const confirmed = heading(ap.left) && heading(ap.right) && (ap.left.behaviour !== 'not approached' || ap.right.behaviour !== 'not approached');
    if (confirmed) {
      return {
        ok: true, variable, at: a, side, value: known.value, exact: known.exact, kind: 'finite', method: 'known', confirmed: true, approach: ap,
        steps: [{ kind: 'known', text: `${text} → ${known.exact} as ${variable} → ${show(a)}`, why: known.why }],
        reason: `a known limit, ${known.name}: ${text} → ${known.exact} as ${variable} → ${show(a)}; confirmed numerically from the samples either side`,
      };
    }
  }

  // 4. numerically from both sides
  return numeric(node, variable, a, side, ap);
}

const shownOrNull = (v: number): number => Number(v.toPrecision(10));

function numeric(node: FnNode, v: string, a: number, side: LimitSide, ap: Approaches): LimitResult {
  const text = formatFn(node);
  const pointing = `${v} → ${show(a)}`;
  const steps: LimitStep[] = Number.isFinite(a)
    ? [{ kind: 'sample', text: `${text}: sample either side of ${show(a)}`, why: 'the numbers 0.1, 0.01, 0.001 … away, never the point itself' }]
    : [{ kind: 'sample', text: `${text}: sample ${v} = ${a < 0 ? '−' : ''}10, ${a < 0 ? '−' : ''}100, ${a < 0 ? '−' : ''}1000 …`, why: 'further and further out' }];
  const l = ap.left, r = ap.right;
  const used = (s: LimitSide) => (s === 'left' ? [l] : s === 'right' ? [r] : [l, r]).filter((x) => x.behaviour !== 'not approached');
  const wanted = used(side);
  if (!wanted.length) return { ok: false, reason: `${show(a)} cannot be approached from the ${side}` };
  const sides = { left: l.behaviour === 'not approached' ? null : l.settles, right: r.behaviour === 'not approached' ? null : r.settles };
  const heads = (s: Approach) => (s.behaviour === 'undefined' ? 'the function is not defined there' : s.behaviour === 'oscillates' ? 'it does not settle' : '');
  const refusal = wanted.find((s) => s.behaviour === 'undefined' || s.behaviour === 'oscillates');
  if (refusal) {
    const what = refusal.behaviour === 'undefined' ? `${text} is not defined on that side of ${show(a)}` : `${text} does not settle as ${pointing}`;
    return { ok: true, variable: v, at: a, side, value: null, exact: null, kind: 'does not exist', method: 'numeric', steps, approach: ap, sides, reason: `numerically from ${wanted.length === 2 ? 'both sides' : side !== 'both' ? `the ${side}` : `${v} running out to ${show(a)}`}: ${what}${heads(refusal) && refusal.behaviour === 'oscillates' ? ' — the values keep changing and never head for one number' : ''}, so there is no limit` };
  }
  const values = wanted.map((s) => s.settles as number);
  const agree = values.every((x) => sameSettle(x, values[0]));
  if (!agree) {
    const lv = sides.left, rv = sides.right;
    return {
      ok: true, variable: v, at: a, side, value: null, exact: null, kind: 'does not exist', method: 'numeric', steps, approach: ap, sides,
      reason: `numerically from both sides: ${sentenceOfSides(v, a, lv, rv)}`,
    };
  }
  const value = values[0];
  const how = wanted.length === 2 ? 'numerically from both sides' : side !== 'both' ? `numerically from the ${side}` : `numerically, ${v} running out to ${show(a)}`;
  if (!Number.isFinite(value)) {
    return { ok: true, variable: v, at: a, side, value, exact: null, kind: 'infinite', method: 'numeric', steps, approach: ap, sides, reason: `${how}: ${text} grows without bound, to ${show(value)}, as ${pointing}` };
  }
  const s = snap(value);
  return {
    ok: true, variable: v, at: a, side, value: s ? s.value : value, exact: s ? s.exact : null, kind: 'finite', method: 'numeric', steps, approach: ap, sides,
    reason: `${how}: ${text} heads for ${s ? s.exact : show(value)} as ${pointing} — the numbers, not a proof`,
  };
}

// ===== Reading a limit written out =====

export type ReadLimit = { ok: true; expression: string; variable: string; at: number; side: LimitSide } | { ok: false; reason: string };

const TARGET = /^([+\-−]?\s*(?:∞|inf(?:inity)?|π|pi|\d+(?:\.\d+)?(?:\/\d+)?))/i;

/**
 * A limit as it is written: `lim x→2 (x²−4)/(x−2)`, `lim_{x→0} sin x / x`, `limit as t -> 3 of t^2`,
 * `lim x→0⁺ 1/x`, `lim x→∞ (1+1/x)^x`. The point is a number, a fraction, π or ±∞; the side is a mark
 * stuck to it (0⁺, 0⁻, 0+, 0-).
 */
export function readLimit(text: string): ReadLimit {
  const s = text.replace(/\s+/g, ' ').trim();
  const head = /^lim(?:it)?(?:\s+as\b|\s*_?\s*\{?)\s*([A-Za-z])\s*(?:→|->|⟶|⟼|=>|to\b)\s*/i.exec(s);
  if (!head) return { ok: false, reason: 'that is not a limit written as lim x→a …' };
  const variable = head[1];
  let rest = s.slice(head[0].length);
  const t = TARGET.exec(rest);
  if (!t) return { ok: false, reason: `cannot read where ${variable} is going — a number, a fraction, π or ∞` };
  rest = rest.slice(t[0].length);
  const raw = t[1].replace(/\s+/g, '').replace('−', '-').toLowerCase();
  const sign = raw.startsWith('-') ? -1 : 1;
  const body = raw.replace(/^[+-]/, '');
  let at: number;
  if (body === '∞' || body.startsWith('inf')) at = sign * Infinity;
  else if (body === 'π' || body === 'pi') at = sign * Math.PI;
  else if (body.includes('/')) {
    const [n, d] = body.split('/').map(Number);
    at = (sign * n) / d;
  } else at = sign * Number(body);
  if (!Number.isFinite(at) && !/∞|inf/.test(body)) return { ok: false, reason: `cannot read where ${variable} is going` };
  let side: LimitSide = 'both';
  const mark = /^(⁺|⁻|\^\s*\+|\^\s*-|\^\s*−|\+(?=\s|\}|$)|-(?=\s|\}|$)|−(?=\s|\}|$))/.exec(rest);
  if (mark) {
    side = /[⁺+]/.test(mark[1]) ? 'right' : 'left';
    rest = rest.slice(mark[0].length);
  }
  rest = rest.replace(/^\s*\}?\s*(?:of\b)?\s*/i, '').trim();
  if (!rest) return { ok: false, reason: `lim ${variable}→${show(at)} has nothing after it to take the limit of` };
  return { ok: true, expression: rest, variable, at, side };
}

/** A limit written out, read and worked: `limitFromText('lim x→2 (x²−4)/(x−2)')`. */
export function limitFromText(text: string): LimitResult {
  const r = readLimit(text);
  return r.ok ? limit(r.expression, r.variable, r.at, r.side) : r;
}

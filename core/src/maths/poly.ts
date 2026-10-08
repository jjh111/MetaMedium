// Polynomials and rational functions (MATHS-SPEC lane B, M12) — school algebra in one
// variable, exact over the rationals.
//
// A coefficient is a fraction of two integers of any size (BigInt), never a float, so
// x³ − 1 factors as (x − 1)(x² + x + 1) and a hole sits at exactly x = 2. What is built:
//
//   - a polynomial from a tree (`fn.ts` reads the text): expanded, added, multiplied,
//     divided with a remainder, its gcd taken;
//   - `factor`, over the rationals: the power of x taken out, every rational root found by
//     the rational-root theorem, and what is left split into smaller factors by Kronecker's
//     method (x⁴ + 4 is (x² − 2x + 2)(x² + 2x + 2)) — or shown to have none. Where the work
//     would be too large it is said not to be complete, never claimed;
//   - `analyseRational`: a ratio of polynomials cancelled, and what is left of it — its holes
//     (a common factor's roots, where the curve has a ring and a value), its poles (the
//     reduced denominator's roots, with the way the curve goes either side), and how it ends.
//
// Exact where exact, numeric where it must be: the places of irrational roots are found by
// bisection between the roots of the derivative, and say so by having no `exactX`.
// No model computes anything; nothing here is logged.

import type { FnNode } from './fn';
import { evalFn, formatFn, freeVariables, parseFn, toSuperscript } from './fn';

// ===== Rationals =====

export interface Rat {
  readonly n: bigint;
  readonly d: bigint;
}

const bAbs = (a: bigint): bigint => (a < 0n ? -a : a);
export function bgcd(a: bigint, b: bigint): bigint {
  a = bAbs(a);
  b = bAbs(b);
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

/** A fraction in lowest terms with a positive denominator. */
export function rat(n: bigint | number, d: bigint | number = 1n): Rat {
  let nn = BigInt(n), dd = BigInt(d);
  if (dd === 0n) throw new RangeError('a fraction with nothing underneath');
  if (dd < 0n) {
    nn = -nn;
    dd = -dd;
  }
  const g = bgcd(nn, dd);
  return g > 1n ? { n: nn / g, d: dd / g } : { n: nn, d: dd };
}

const ZERO = rat(0);
const ONE = rat(1);
export const ratIsZero = (a: Rat) => a.n === 0n;
export const ratIsInt = (a: Rat) => a.d === 1n;
export const ratAdd = (a: Rat, b: Rat): Rat => rat(a.n * b.d + b.n * a.d, a.d * b.d);
export const ratSub = (a: Rat, b: Rat): Rat => rat(a.n * b.d - b.n * a.d, a.d * b.d);
export const ratMul = (a: Rat, b: Rat): Rat => rat(a.n * b.n, a.d * b.d);
export const ratDiv = (a: Rat, b: Rat): Rat => rat(a.n * b.d, a.d * b.n);
export const ratNeg = (a: Rat): Rat => ({ n: -a.n, d: a.d });
export const ratCmp = (a: Rat, b: Rat): number => {
  const x = a.n * b.d, y = b.n * a.d;
  return x < y ? -1 : x > y ? 1 : 0;
};
export const ratSign = (a: Rat): number => (a.n < 0n ? -1 : a.n > 0n ? 1 : 0);
export const ratToNumber = (a: Rat): number => Number(a.n) / Number(a.d);

/** A fraction as people write it: `3`, `1/2`, `−3/2`. */
export function ratText(a: Rat): string {
  const body = a.d === 1n ? String(bAbs(a.n)) : `${bAbs(a.n)}/${a.d}`;
  return a.n < 0n ? `−${body}` : body;
}

/** The fraction a decimal as written is: 0.1 is 1/10, not the nearest binary float; null for what is not a finite number. */
export function ratFromNumber(v: number): Rat | null {
  if (!Number.isFinite(v)) return null;
  if (Number.isInteger(v) && Math.abs(v) < 2 ** 53) return rat(BigInt(v));
  const m = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(String(v));
  if (!m) return null;
  const [, sign, whole, frac = '', exp = '0'] = m;
  let n = BigInt(whole + frac);
  let d = 10n ** BigInt(frac.length);
  const e = Number(exp);
  if (e > 0) n *= 10n ** BigInt(e);
  else if (e < 0) d *= 10n ** BigInt(-e);
  return rat(sign ? -n : n, d);
}

// ===== Polynomials: coefficients from the constant term up =====

/** Low to high: [c0, c1, c2] is c0 + c1x + c2x². The zero polynomial is []. */
export type Poly = Rat[];

const trim = (p: Rat[]): Poly => {
  let n = p.length;
  while (n > 0 && ratIsZero(p[n - 1])) n--;
  return n === p.length ? p : p.slice(0, n);
};

export const polyFromNumbers = (nums: readonly number[]): Poly =>
  trim(nums.map((v) => ratFromNumber(v) ?? ZERO));
export const polyDegree = (p: Poly): number => (p.length ? p.length - 1 : -Infinity);
export const polyIsZero = (p: Poly) => p.length === 0;
const lead = (p: Poly): Rat => p[p.length - 1];

export function polyAdd(a: Poly, b: Poly): Poly {
  const out: Rat[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) out.push(ratAdd(a[i] ?? ZERO, b[i] ?? ZERO));
  return trim(out);
}
export const polyNeg = (a: Poly): Poly => a.map(ratNeg);
export const polySub = (a: Poly, b: Poly): Poly => polyAdd(a, polyNeg(b));
export const polyScale = (a: Poly, k: Rat): Poly => (ratIsZero(k) ? [] : a.map((c) => ratMul(c, k)));
export function polyMul(a: Poly, b: Poly): Poly {
  if (!a.length || !b.length) return [];
  const out: Rat[] = Array.from({ length: a.length + b.length - 1 }, () => ZERO);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) out[i + j] = ratAdd(out[i + j], ratMul(a[i], b[j]));
  return trim(out);
}
export function polyPow(a: Poly, n: number): Poly {
  let out: Poly = [ONE];
  for (let i = 0; i < n; i++) out = polyMul(out, a);
  return out;
}

/** a = quotient × b + remainder, exactly; null when b is zero. */
export function polyDivide(a: Poly, b: Poly): { quotient: Poly; remainder: Poly } | null {
  if (!b.length) return null;
  let r = a.slice();
  const q: Rat[] = Array.from({ length: Math.max(0, a.length - b.length + 1) }, () => ZERO);
  const lb = lead(b);
  while (r.length >= b.length) {
    const k = ratDiv(lead(r), lb);
    const shift = r.length - b.length;
    q[shift] = k;
    for (let i = 0; i < b.length; i++) r[i + shift] = ratSub(r[i + shift], ratMul(k, b[i]));
    r = trim(r.slice(0, r.length - 1));
  }
  return { quotient: trim(q), remainder: trim(r) };
}

/** Monic: the polynomial divided by its leading coefficient. */
export const polyMonic = (a: Poly): Poly => (a.length ? polyScale(a, ratDiv(ONE, lead(a))) : a);

/** The greatest common divisor, monic; the zero polynomial when both are zero. */
export function polyGcd(a: Poly, b: Poly): Poly {
  let x = a, y = b;
  while (y.length) [x, y] = [y, polyDivide(x, y)!.remainder];
  return polyMonic(x);
}

export function polyDerivative(a: Poly): Poly {
  return trim(a.slice(1).map((c, i) => ratMul(c, rat(i + 1))));
}

export function polyEvalRat(a: Poly, x: Rat): Rat {
  let out = ZERO;
  for (let i = a.length - 1; i >= 0; i--) out = ratAdd(ratMul(out, x), a[i]);
  return out;
}

export function polyEvalNumber(a: Poly, x: number): number {
  let out = 0;
  for (let i = a.length - 1; i >= 0; i--) out = out * x + ratToNumber(a[i]);
  return out;
}

/** The part with no repeated factor: p / gcd(p, p′). */
function squarefree(p: Poly): Poly {
  if (p.length < 3) return p;
  const g = polyGcd(p, polyDerivative(p));
  return g.length > 1 ? polyDivide(p, g)!.quotient : p;
}

/** `p` as content × a primitive polynomial with whole coefficients and a positive leading one. */
function primitive(p: Poly): { content: Rat; poly: Poly } {
  if (!p.length) return { content: ZERO, poly: [] };
  let l = 1n;
  for (const c of p) l = (l * c.d) / bgcd(l, c.d);
  const ints = p.map((c) => (c.n * l) / c.d);
  let g = 0n;
  for (const c of ints) g = bgcd(g, c);
  const sign = ints[ints.length - 1] < 0n ? -1n : 1n;
  return { content: rat(sign * g, l), poly: ints.map((c) => rat((sign * c) / g)) };
}

const compareCoefficients = (a: Poly, b: Poly): number => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const c = ratCmp(a[i] ?? ZERO, b[i] ?? ZERO);
    if (c) return c;
  }
  return 0;
};

/** A polynomial as written: `x² + x + 1`, `2x³ − 3x + 1/2`, `(1/4)x + 1/2`. */
export function polyText(p: Poly, variable = 'x'): string {
  if (!p.length) return '0';
  const sup = (k: number) => toSuperscript(k) ?? `^${k}`;
  let out = '';
  for (let k = p.length - 1; k >= 0; k--) {
    const c = p[k];
    if (ratIsZero(c)) continue;
    const abs = c.n < 0n ? ratNeg(c) : c;
    const mag = k === 0 ? ratText(abs) : abs.d === 1n && abs.n === 1n ? '' : abs.d === 1n ? ratText(abs) : `(${ratText(abs)})`;
    const term = k === 0 ? mag : `${mag}${variable}${k === 1 ? '' : sup(k)}`;
    out += out ? (c.n < 0n ? ` − ${term}` : ` + ${term}`) : c.n < 0n ? `−${term}` : term;
  }
  return out;
}

// ===== From a tree =====

type Made<T> = { ok: true; value: T } | { ok: false; reason: string };

const MOST_DEGREE = 120;

function constantOf(node: FnNode): number | null {
  return freeVariables(node).length ? null : evalFn(node);
}

/** A polynomial in `v` from a tree, or why it is not one. */
function polyOfNode(node: FnNode, v: string): Made<Poly> {
  const fail = (reason: string): Made<Poly> => ({ ok: false, reason });
  switch (node.k) {
    case 'num': {
      const r = ratFromNumber(node.v);
      return r ? { ok: true, value: trim([r]) } : fail(`${formatFn(node)} is not a number I can keep exactly`);
    }
    case 'var':
      return node.name === v ? { ok: true, value: [ZERO, ONE] } : fail(`${node.name} is another letter — a polynomial in ${v} has numbers for its coefficients`);
    case 'const':
      return fail(`${node.name} is not a rational number, so ${formatFn(node)} is not a polynomial with rational coefficients`);
    case 'neg': {
      const a = polyOfNode(node.a, v);
      return a.ok ? { ok: true, value: polyNeg(a.value) } : a;
    }
    case 'call':
    case 'deg':
      return fail(`${formatFn(node)} is not a polynomial`);
    case 'bin': {
      if (node.op === '^') {
        const e = constantOf(node.b);
        if (e === null) return fail(`${formatFn(node)} is not a polynomial: the power has to be a whole number written out`);
        if (!Number.isInteger(e) || e < 0) {
          return fail(e < 0 && Number.isInteger(e) ? `${formatFn(node)} is a ratio of polynomials, not a polynomial` : `${formatFn(node)} is not a polynomial: the power ${e} is not a whole number`);
        }
        const a = polyOfNode(node.a, v);
        if (!a.ok) return a;
        if (polyDegree(a.value) * e > MOST_DEGREE) return fail('that polynomial is too large to work with here');
        return { ok: true, value: polyPow(a.value, e) };
      }
      const a = polyOfNode(node.a, v);
      if (!a.ok) return a;
      if (node.op === '/') {
        const d = polyOfNode(node.b, v);
        if (!d.ok) return d;
        if (polyDegree(d.value) !== 0) {
          return d.value.length ? fail(`dividing by ${formatFn(node.b)} makes a ratio of polynomials, not a polynomial`) : fail('cannot divide by zero');
        }
        return { ok: true, value: polyScale(a.value, ratDiv(ONE, d.value[0])) };
      }
      const b = polyOfNode(node.b, v);
      if (!b.ok) return b;
      const out = node.op === '+' ? polyAdd(a.value, b.value) : node.op === '-' ? polySub(a.value, b.value) : polyMul(a.value, b.value);
      return polyDegree(out) > MOST_DEGREE ? fail('that polynomial is too large to work with here') : { ok: true, value: out };
    }
  }
}

/** The letter a text is a polynomial in: the one it uses, else x. More than one is asked about. */
function variableOf(node: FnNode, given?: string): Made<string> {
  if (given) return { ok: true, value: given };
  const vs = freeVariables(node);
  if (vs.length > 1) return { ok: false, reason: `it uses more than one letter (${vs.join(', ')}) — say which one it is a polynomial in` };
  return { ok: true, value: vs[0] ?? 'x' };
}

function parseInput(input: string | FnNode, variable?: string): Made<{ node: FnNode; variable: string }> {
  let node: FnNode;
  if (typeof input === 'string') {
    const p = parseFn(input, variable ? { variables: [variable] } : {});
    if (!p.ok) return { ok: false, reason: p.reason };
    node = p.node;
  } else node = input;
  const v = variableOf(node, variable);
  return v.ok ? { ok: true, value: { node, variable: v.value } } : v;
}

export type ParsedPoly = { ok: true; poly: Poly; variable: string } | { ok: false; reason: string };

/** A polynomial from its text (or tree). */
export function parsePoly(input: string | FnNode, variable?: string): ParsedPoly {
  const made = parseInput(input, variable);
  if (!made.ok) return made;
  const p = polyOfNode(made.value.node, made.value.variable);
  return p.ok ? { ok: true, poly: p.value, variable: made.value.variable } : p;
}

export type Expanded = { ok: true; text: string; poly: Poly; variable: string } | { ok: false; reason: string };

/** A text multiplied out: `(x+1)(x−1)` is `x² − 1`. */
export function expand(input: string | FnNode, variable?: string): Expanded {
  const p = parsePoly(input, variable);
  return p.ok ? { ok: true, text: polyText(p.poly, p.variable), poly: p.poly, variable: p.variable } : p;
}

// ===== Roots =====

/** Every positive divisor of n, or null when n is too large to try. */
function divisorsOf(n: bigint): bigint[] | null {
  n = bAbs(n);
  if (n === 0n) return null;
  if (n > 10n ** 13n) return null;
  const out: bigint[] = [];
  const x = Number(n);
  for (let i = 1; i * i <= x; i++) {
    if (x % i === 0) {
      out.push(BigInt(i));
      if (i * i !== x) out.push(BigInt(x / i));
    }
  }
  return out.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

const MOST_CANDIDATES = 400000;

/** The rational roots of a polynomial with whole coefficients (rational root theorem), each once; null if too many to try. */
function rationalRootsOf(q: Poly): Rat[] | null {
  const first = q.find((c) => !ratIsZero(c))!;
  const ps = divisorsOf(first.n);
  const qs = divisorsOf(lead(q).n);
  if (!ps || !qs || ps.length * qs.length * 2 > MOST_CANDIDATES) return null;
  const found: Rat[] = [];
  const seen = new Set<string>();
  for (const a of ps) {
    for (const b of qs) {
      for (const s of [1n, -1n]) {
        const r = rat(s * a, b);
        const key = `${r.n}/${r.d}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (ratIsZero(polyEvalRat(q, r))) found.push(r);
      }
    }
  }
  return found.sort(ratCmp);
}

/** Cauchy's bound: every root is inside ±(1 + max |cᵢ / cₙ|). */
function rootBound(p: Poly): number {
  const l = Math.abs(ratToNumber(lead(p)));
  let m = 0;
  for (let i = 0; i < p.length - 1; i++) m = Math.max(m, Math.abs(ratToNumber(p[i])) / l);
  return 1 + m;
}

/**
 * The distinct real roots, ascending. A repeated root is found once. Between two roots of the
 * derivative the polynomial is monotone, so each stretch holds at most one root, and a sign
 * change finds it by bisection.
 */
export function realRoots(p: Poly): number[] {
  const q = squarefree(p);
  const n = polyDegree(q);
  if (n < 1) return [];
  if (n === 1) return [-ratToNumber(q[0]) / ratToNumber(q[1])];
  const B = rootBound(q);
  const cuts = [-B, ...realRoots(polyDerivative(q)).filter((c) => c > -B && c < B), B];
  const f = (x: number) => polyEvalNumber(q, x);
  const out: number[] = [];
  const scale = (x: number) => q.reduce((m, c, i) => m + Math.abs(ratToNumber(c)) * Math.abs(x) ** i, 0);
  for (let i = 0; i + 1 < cuts.length; i++) {
    let lo = cuts[i], hi = cuts[i + 1];
    let flo = f(lo), fhi = f(hi);
    const tiny = (v: number, x: number) => Math.abs(v) <= 1e-13 * Math.max(1, scale(x));
    if (tiny(flo, lo)) {
      if (!out.length || Math.abs(out[out.length - 1] - lo) > 1e-9) out.push(lo);
      continue;
    }
    if (tiny(fhi, hi)) continue; // the next stretch records it as its own start
    if (Math.sign(flo) === Math.sign(fhi)) continue;
    for (let k = 0; k < 200 && hi - lo > 1e-15 * Math.max(1, Math.abs(lo)); k++) {
      const mid = (lo + hi) / 2;
      const fm = f(mid);
      if (fm === 0) {
        lo = hi = mid;
        break;
      }
      if (Math.sign(fm) === Math.sign(flo)) {
        lo = mid;
        flo = fm;
      } else {
        hi = mid;
        fhi = fm;
      }
    }
    const root = (lo + hi) / 2;
    if (!out.length || Math.abs(out[out.length - 1] - root) > 1e-9) out.push(root);
  }
  // the right-hand end of the last stretch, if the polynomial vanishes there
  const last = cuts[cuts.length - 1];
  if (Math.abs(f(last)) <= 1e-13 * Math.max(1, scale(last)) && (!out.length || Math.abs(out[out.length - 1] - last) > 1e-9)) out.push(last);
  return out.sort((a, b) => a - b);
}

// ===== Factoring =====

export interface Factor {
  /** Primitive, whole coefficients, positive leading coefficient. */
  poly: Poly;
  power: number;
  /** As written: `x − 1`, `x² + x + 1`. */
  text: string;
  /** The rational root it gives, when it is linear. */
  root?: Rat;
}

export interface Factored {
  constant: Rat;
  factors: Factor[];
  /** Every factor shown to be unsplittable over the rationals — false when the work was too large to be sure. */
  complete: boolean;
  /** What was done, in words. */
  steps: string[];
}

const MOST_KRONECKER_DEGREE = 3;
const MOST_COMBINATIONS = 120000;

/** Whole-number points to read a polynomial at: 0, 1, −1, 2, −2 … */
const pointsFor = (k: number): bigint[] => Array.from({ length: k }, (_, i) => BigInt(i === 0 ? 0 : i % 2 ? (i + 1) / 2 : -(i / 2)));

/** The polynomial of degree ≤ points.length − 1 through the points, or null when its coefficients are not whole. */
function interpolateWhole(xs: bigint[], ys: bigint[]): Poly | null {
  let out: Poly = [];
  for (let i = 0; i < xs.length; i++) {
    let term: Poly = [rat(ys[i])];
    for (let j = 0; j < xs.length; j++) {
      if (j === i) continue;
      term = polyMul(term, [rat(-xs[j], xs[i] - xs[j]), rat(1, xs[i] - xs[j])]);
    }
    out = polyAdd(out, term);
  }
  return out.every(ratIsInt) ? out : null;
}

/** A factor of degree 2 to MOST_KRONECKER_DEGREE (or half the degree) of `q`, found by Kronecker's method; 'none' when there is none, 'unsure' when too large to be sure. */
function kronecker(q: Poly): Poly | 'none' | 'unsure' {
  const n = polyDegree(q);
  const top = Math.floor(n / 2);
  let unsure = false;
  for (let m = 2; m <= top; m++) {
    if (m > MOST_KRONECKER_DEGREE) {
      unsure = true;
      break;
    }
    const xs = pointsFor(m + 1);
    const divs: bigint[][] = [];
    let combos = 1;
    let ok = true;
    for (const x of xs) {
      const v = polyEvalRat(q, rat(x)).n;
      const d = divisorsOf(v);
      if (!d) {
        ok = false;
        break;
      }
      divs.push(d.flatMap((a) => [a, -a]));
      combos *= divs[divs.length - 1].length;
      if (combos > MOST_COMBINATIONS * 2) {
        ok = false;
        break;
      }
    }
    if (!ok) {
      unsure = true;
      continue;
    }
    const pick: bigint[] = new Array(xs.length);
    const search = (i: number): Poly | null => {
      if (i === xs.length) {
        const g = interpolateWhole(xs, pick);
        if (!g || polyDegree(g) !== m) return null;
        const prim = primitive(g); // the sign that makes the leading coefficient positive
        if (prim.content.d !== 1n || bAbs(prim.content.n) !== 1n) return null;
        return polyDivide(q, prim.poly)!.remainder.length === 0 ? prim.poly : null;
      }
      for (const d of divs[i]) {
        if (i === 0 && d < 0n) continue; // g and −g are one factor
        pick[i] = d;
        const found = search(i + 1);
        if (found) return found;
      }
      return null;
    };
    const found = search(0);
    if (found) return found;
  }
  return unsure ? 'unsure' : 'none';
}

/** The monomial x, as a factor. */
const X: Poly = [ZERO, ONE];

function linearFactor(r: Rat): Poly {
  // b·x − a for the root a/b
  return [rat(-r.n), rat(r.d)];
}

/** Factor over the rationals. The constant carries the sign and the content; the factors are primitive. */
export function factorPoly(p: Poly): Factored {
  const steps: string[] = [];
  if (!p.length) return { constant: ZERO, factors: [], complete: true, steps: ['zero has no factors'] };
  const { content, poly } = primitive(p);
  const found: { poly: Poly; power: number; root?: Rat }[] = [];
  const add = (f: Poly, root?: Rat) => {
    const same = found.find((g) => compareCoefficients(g.poly, f) === 0);
    if (same) same.power++;
    else found.push({ poly: f, power: 1, ...(root ? { root } : {}) });
  };
  let q = poly;
  let complete = true;
  // a power of x
  let zeros = 0;
  while (q.length > 1 && ratIsZero(q[0])) {
    q = q.slice(1);
    zeros++;
  }
  for (let i = 0; i < zeros; i++) add(X, ZERO);
  if (zeros) steps.push(zeros === 1 ? 'x is a common factor' : `x${toSuperscript(zeros) ?? `^${zeros}`} is a common factor`);
  // rational roots
  if (polyDegree(q) >= 1) {
    const roots = rationalRootsOf(q);
    if (roots === null) {
      complete = false;
      steps.push('the coefficients are too large to try every rational root');
    } else {
      for (const r of roots) {
        const lin = linearFactor(r);
        let times = 0;
        for (;;) {
          const d = polyDivide(q, lin)!;
          if (d.remainder.length) break;
          q = d.quotient;
          times++;
          add(lin, r);
        }
        steps.push(`x = ${ratText(r)} is a rational root${times > 1 ? ` (${times} times)` : ''}, so ${polyText(lin)} is a factor`);
      }
    }
  }
  // what is left has no rational root: split it further, or show it cannot be
  const rest: Poly[] = polyDegree(q) >= 1 ? [q] : [];
  while (rest.length) {
    const r = rest.pop()!;
    const n = polyDegree(r);
    if (n <= 1) {
      if (n === 1) add(primitive(r).poly);
      continue;
    }
    if (n <= 3) {
      add(primitive(r).poly);
      continue;
    }
    const k = kronecker(primitive(r).poly);
    if (k === 'none') add(primitive(r).poly);
    else if (k === 'unsure') {
      complete = false;
      add(primitive(r).poly);
      steps.push(`${polyText(primitive(r).poly)} has no rational root, and is too large to be sure it cannot be split`);
    } else {
      steps.push(`${polyText(primitive(r).poly)} splits into ${polyText(k)} and ${polyText(primitive(polyDivide(primitive(r).poly, k)!.quotient).poly)}`);
      rest.push(k, primitive(polyDivide(primitive(r).poly, k)!.quotient).poly);
    }
  }
  // order: the power of x, the linear factors by root, then the rest by degree and coefficients
  const rank = (f: { poly: Poly; root?: Rat }) => (f.poly.length === 2 && ratIsZero(f.poly[0]) ? 0 : f.root ? 1 : 2);
  found.sort((a, b) => {
    const ra = rank(a), rb = rank(b);
    if (ra !== rb) return ra - rb;
    if (ra === 1) return ratCmp(a.root!, b.root!);
    return a.poly.length - b.poly.length || compareCoefficients(a.poly, b.poly);
  });
  return {
    constant: content,
    factors: found.map((f) => ({ poly: f.poly, power: f.power, text: polyText(f.poly), ...(f.root ? { root: f.root } : {}) })),
    complete,
    steps,
  };
}

function factoredText(f: Factored, variable: string): string {
  if (ratIsZero(f.constant)) return '0';
  const pow = (s: string, k: number) => (k === 1 ? s : `${s}${toSuperscript(k) ?? `^${k}`}`);
  const bare = (g: Factor) => g.poly.length === 2 && ratIsZero(g.poly[0]) && ratIsInt(g.poly[1]) && g.poly[1].n === 1n;
  const parts = f.factors.map((g) => (bare(g) ? pow(variable, g.power) : pow(`(${polyText(g.poly, variable)})`, g.power)));
  const c = f.constant;
  let prefix = '';
  if (c.n === 1n && c.d === 1n) prefix = '';
  else if (c.n === -1n && c.d === 1n) prefix = '−';
  else prefix = c.d === 1n ? ratText(c) : `(${ratText(c)})`;
  // a single unsplittable factor with nothing in front needs no brackets: x² + 1
  if (!prefix && f.factors.length === 1 && f.factors[0].power === 1 && !bare(f.factors[0])) return polyText(f.factors[0].poly, variable);
  if (!parts.length) return ratText(c);
  return prefix + parts.join('');
}

export type FactorResult =
  | {
      ok: true;
      variable: string;
      /** `(x − 1)(x² + x + 1)`. */
      text: string;
      constant: Rat;
      factors: (Factor & { irreducible: boolean })[];
      /** False when a factor of high degree was not checked, said in `reason`. */
      complete: boolean;
      /** How, in words: the rational roots found, what was left and whether it can be split. */
      reason: string;
      steps: string[];
    }
  | { ok: false; reason: string };

/** A polynomial factored over the rationals: `factor('x^3-1')` is `(x − 1)(x² + x + 1)`. */
export function factor(input: string | FnNode | Poly, variable?: string): FactorResult {
  let poly: Poly;
  let v = variable ?? 'x';
  if (Array.isArray(input)) poly = input;
  else {
    const p = parsePoly(input, variable);
    if (!p.ok) return p;
    poly = p.poly;
    v = p.variable;
  }
  const f = factorPoly(poly);
  const text = factoredText(f, v);
  const hard = f.factors.filter((g) => polyDegree(g.poly) >= 2);
  const factors = f.factors.map((g) => ({ ...g, text: polyText(g.poly, v), irreducible: polyDegree(g.poly) <= 1 || f.complete }));
  const steps = f.steps.map((s) => (v === 'x' ? s : s.replace(/\bx\b/g, v)));
  let reason: string;
  if (!poly.length) reason = 'zero has no factors';
  else if (polyDegree(poly) <= 0) reason = `${text} is a number`;
  else if (f.factors.length === 1 && f.factors[0].power === 1 && polyDegree(f.factors[0].poly) >= 2) {
    reason = f.complete ? `${text} has no rational factor — no rational root and no smaller factor, so it cannot be split` : `${text} has no rational root; it may split further, which was not checked`;
  } else {
    reason = `${steps.join('; ')}${hard.length ? `; ${hard.map((g) => polyText(g.poly, v)).join(' and ')} ${hard.length === 1 ? 'has' : 'have'} no rational factor${f.complete ? '' : ' that was found'}` : ''}`;
    if (!steps.length) reason = `${text} is already as factored as it can be`;
  }
  return { ok: true, variable: v, text, constant: f.constant, factors, complete: f.complete, reason, steps };
}

// ===== Rational functions =====

export interface RationalParts {
  numerator: Poly;
  denominator: Poly;
}

type RatFn = RationalParts;

function ratFnOfNode(node: FnNode, v: string): Made<RatFn> {
  const fail = (reason: string): Made<RatFn> => ({ ok: false, reason });
  const poly = (p: Poly): Made<RatFn> => ({ ok: true, value: { numerator: p, denominator: [ONE] } });
  const guard = (r: RatFn): Made<RatFn> =>
    polyDegree(r.numerator) > MOST_DEGREE || polyDegree(r.denominator) > MOST_DEGREE ? fail('that ratio is too large to work with here') : { ok: true, value: r };
  switch (node.k) {
    case 'num': {
      const r = ratFromNumber(node.v);
      return r ? poly(trim([r])) : fail(`${formatFn(node)} is not a number I can keep exactly`);
    }
    case 'var':
      return node.name === v ? poly([ZERO, ONE]) : fail(`${node.name} is another letter — a ratio in ${v} has numbers for its coefficients`);
    case 'const':
      return fail(`${node.name} is not a rational number, so ${formatFn(node)} is not a ratio of polynomials with rational coefficients`);
    case 'call':
    case 'deg':
      return fail(`${formatFn(node)} is not a ratio of polynomials`);
    case 'neg': {
      const a = ratFnOfNode(node.a, v);
      return a.ok ? { ok: true, value: { numerator: polyNeg(a.value.numerator), denominator: a.value.denominator } } : a;
    }
    case 'bin': {
      if (node.op === '^') {
        const e = constantOf(node.b);
        if (e === null || !Number.isInteger(e)) return fail(`${formatFn(node)} is not a ratio of polynomials: the power has to be a whole number written out`);
        const a = ratFnOfNode(node.a, v);
        if (!a.ok) return a;
        if (Math.abs(e) * Math.max(polyDegree(a.value.numerator), polyDegree(a.value.denominator), 1) > MOST_DEGREE) return fail('that ratio is too large to work with here');
        const n = polyPow(a.value.numerator, Math.abs(e)), d = polyPow(a.value.denominator, Math.abs(e));
        if (e >= 0) return { ok: true, value: { numerator: n, denominator: d } };
        return n.length ? { ok: true, value: { numerator: d, denominator: n } } : fail('cannot divide by zero');
      }
      const a = ratFnOfNode(node.a, v);
      if (!a.ok) return a;
      const b = ratFnOfNode(node.b, v);
      if (!b.ok) return b;
      const A = a.value, B = b.value;
      switch (node.op) {
        case '+':
          return guard({ numerator: polyAdd(polyMul(A.numerator, B.denominator), polyMul(B.numerator, A.denominator)), denominator: polyMul(A.denominator, B.denominator) });
        case '-':
          return guard({ numerator: polySub(polyMul(A.numerator, B.denominator), polyMul(B.numerator, A.denominator)), denominator: polyMul(A.denominator, B.denominator) });
        case '*':
          return guard({ numerator: polyMul(A.numerator, B.numerator), denominator: polyMul(A.denominator, B.denominator) });
        case '/':
          return B.numerator.length ? guard({ numerator: polyMul(A.numerator, B.denominator), denominator: polyMul(A.denominator, B.numerator) }) : fail('cannot divide by zero');
      }
    }
  }
}

export interface Hole {
  x: number;
  y: number;
  /** The place and the value as fractions, when they are (a hole at an irrational place has none). */
  exactX?: string;
  exactY?: string;
  /** The factor that cancelled there. */
  factor: string;
}

export interface Pole {
  x: number;
  exactX?: string;
  /** How many times the denominator has the factor. */
  order: number;
  /** Which way the curve goes just left and just right of it. */
  sides: ['+∞' | '−∞', '+∞' | '−∞'];
}

export type EndBehaviour =
  | { kind: 'horizontal'; y: number; text: string }
  | { kind: 'slant'; slope: number; intercept: number; text: string }
  | { kind: 'none'; text: string };

export type RationalAnalysis =
  | {
      ok: true;
      variable: string;
      /** The function as read, printed. */
      text: string;
      numerator: Poly;
      denominator: Poly;
      /** The common factor that cancelled, as written; '' when there was none. */
      cancelled: string;
      common: Poly;
      reducedNumerator: Poly;
      reducedDenominator: Poly;
      /** The function with the common factor cancelled, as written: `x + 2`, `(x + 1)/x`. */
      reduced: string;
      holes: Hole[];
      poles: Pole[];
      end: EndBehaviour;
      /** The reduced function as a number-to-number function; it is defined at a hole (the value the ring marks) and null at a pole. */
      reducedFn: (x: number) => number | null;
      reason: string;
    }
  | { ok: false; reason: string };

/** A ratio of polynomials as numerator and denominator, not yet cancelled; or why it is not one. */
export function rationalParts(input: string | FnNode, variable?: string): ({ ok: true; variable: string; node: FnNode } & RationalParts) | { ok: false; reason: string } {
  const made = parseInput(input, variable);
  if (!made.ok) return made;
  const r = ratFnOfNode(made.value.node, made.value.variable);
  if (!r.ok) return { ok: false, reason: r.reason.includes('ratio of polynomials') || r.reason.includes('another letter') ? r.reason : `${formatFn(made.value.node)} is not a ratio of polynomials: ${r.reason}` };
  return { ok: true, variable: made.value.variable, node: made.value.node, ...r.value };
}

/** Whole coefficients and a positive denominator: the same ratio, scaled. */
function cleared(n: Poly, d: Poly): { n: Poly; d: Poly } {
  let l = 1n;
  for (const c of [...n, ...d]) l = (l * c.d) / bgcd(l, c.d);
  const scale = rat(l);
  let N = polyScale(n, scale), D = polyScale(d, scale);
  let g = 0n;
  for (const c of [...N, ...D]) g = bgcd(g, c.n);
  if (g > 1n) {
    N = polyScale(N, rat(1n, g));
    D = polyScale(D, rat(1n, g));
  }
  if (ratSign(lead(D)) < 0) {
    N = polyNeg(N);
    D = polyNeg(D);
  }
  return { n: N, d: D };
}

const sideOf = (s: number): '+∞' | '−∞' => (s > 0 ? '+∞' : '−∞');

/** A ratio of polynomials cancelled, and what is left of it: its holes, its poles and how it ends. */
export function analyseRational(input: string | FnNode, variable?: string): RationalAnalysis {
  const parts = rationalParts(input, variable);
  if (!parts.ok) return parts;
  const v = parts.variable;
  const { numerator, denominator } = parts;
  if (!denominator.length) return { ok: false, reason: 'cannot divide by zero' };
  const common = numerator.length ? polyGcd(numerator, denominator) : polyMonic(denominator);
  const rn = numerator.length ? polyDivide(numerator, common)!.quotient : [];
  const rd = polyDivide(denominator, common)!.quotient;
  const { n: N, d: D } = cleared(rn, rd);
  const cancelled = polyDegree(common) >= 1 ? polyText(common, v) : '';
  const wrapped = (p: Poly) => (p.filter((c) => !ratIsZero(c)).length > 1 ? `(${polyText(p, v)})` : polyText(p, v));
  const reduced = D.length === 1 && D[0].n === 1n && D[0].d === 1n ? polyText(N, v) : `${wrapped(N)}/${wrapped(D)}`;

  // holes: the roots of the common factor that the reduced denominator does not also have
  const holes: Hole[] = [];
  if (polyDegree(common) >= 1) {
    const cf = factorPoly(common);
    for (const g of cf.factors) {
      if (polyDivide(D, g.poly)!.remainder.length === 0) continue; // still in the denominator: a pole, not a hole
      const gt = polyText(g.poly, v);
      if (g.root) {
        const y = ratDiv(polyEvalRat(N, g.root), polyEvalRat(D, g.root));
        holes.push({ x: ratToNumber(g.root), y: ratToNumber(y), exactX: ratText(g.root), exactY: ratText(y), factor: gt });
      } else {
        for (const r of realRoots(g.poly)) {
          const dv = polyEvalNumber(D, r);
          holes.push({ x: r, y: polyEvalNumber(N, r) / dv, factor: gt });
        }
      }
    }
    holes.sort((a, b) => a.x - b.x);
  }

  // poles: the reduced denominator's real roots, and the way the curve goes either side
  const poles: Pole[] = [];
  if (polyDegree(D) >= 1) {
    const all = realRoots(polyMul(N, D));
    const df = factorPoly(D);
    const sign = (t: number) => {
      const tr = ratFromNumber(t);
      if (!tr) return 1;
      return ratSign(polyEvalRat(N, tr)) * ratSign(polyEvalRat(D, tr)) || 1;
    };
    for (const g of df.factors) {
      const roots = g.root ? [ratToNumber(g.root)] : realRoots(g.poly);
      for (const r of roots) {
        const at = all.findIndex((a) => Math.abs(a - r) < 1e-9 * Math.max(1, Math.abs(r)));
        const prev = at > 0 ? all[at - 1] : r - 2;
        const next = at >= 0 && at + 1 < all.length ? all[at + 1] : r + 2;
        poles.push({
          x: r,
          ...(g.root ? { exactX: ratText(g.root) } : {}),
          order: g.power,
          sides: [sideOf(sign((prev + r) / 2)), sideOf(sign((r + next) / 2))],
        });
      }
    }
    poles.sort((a, b) => a.x - b.x);
  }

  // how it ends: compare the degrees of the reduced top and bottom
  const dn = polyDegree(N), dd = polyDegree(D);
  let end: EndBehaviour;
  if (!N.length || dn < dd) end = { kind: 'horizontal', y: 0, text: 'y = 0' };
  else if (dn === dd) {
    const y = ratDiv(lead(N), lead(D));
    end = { kind: 'horizontal', y: ratToNumber(y), text: `y = ${ratText(y)}` };
  } else if (dn === dd + 1) {
    const q = polyDivide(N, D)!.quotient;
    end = { kind: 'slant', slope: ratToNumber(q[1]), intercept: ratToNumber(q[0] ?? ZERO), text: `y = ${polyText(q, v)}` };
  } else end = { kind: 'none', text: 'grows faster than a line' };

  const reducedFn = (x: number): number | null => {
    const d = polyEvalNumber(D, x);
    if (d === 0) return null;
    const y = polyEvalNumber(N, x) / d;
    return Number.isFinite(y) ? y : null;
  };
  const said: string[] = [];
  if (cancelled) said.push(`${cancelled} is on the top and the bottom, so it cancels: ${reduced}`);
  for (const h of holes) said.push(`a hole at ${v} = ${h.exactX ?? h.x.toPrecision(6)}, where it would be ${h.exactY ?? h.y.toPrecision(6)}`);
  for (const p of poles) said.push(`a pole at ${v} = ${p.exactX ?? p.x.toPrecision(6)}`);
  return {
    ok: true,
    variable: v,
    text: formatFn(parts.node),
    numerator,
    denominator,
    cancelled,
    common,
    reducedNumerator: N,
    reducedDenominator: D,
    reduced,
    holes,
    poles,
    end,
    reducedFn,
    reason: said.join('; ') || 'nothing cancels, and the denominator never vanishes',
  };
}

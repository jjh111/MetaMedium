// Solving — figure by figure, in closed form (MATHS-PLAN.md §3–4; DIRECTOR-PLAN-W2 M4).
//
// A labelled figure says more than its labels: legs of 24 and 8 make the long
// side √(24² + 8²) = 25.30. This derives what the labels fix, every value
// with its formula as the reason, and says so when they cannot all hold. The
// rules it keeps, each MATHS-PLAN's:
//
//   - **Labels rule the thing; the ink rules the topology.** A labelled length
//     is the truth about what was drawn; the ink says which sides meet, and a
//     small square in a corner declares it right. A measured angle near 90° is
//     a READING — offered only when the labels alone cannot fix the figure,
//     said as one (*if the corner at C is right, …*), with the tolerance cited
//     from `measure.ts`. Never a fact.
//   - **Plural, with the disagreement said.** An over-determined figure keeps
//     every consistent reading — each set of labels that hold together — and
//     each says what it cannot keep and by how much (*labelled 24; legs of 24
//     and 8 make it 25.30, 1.30 longer (5%)*). Nothing is settled by silence:
//     a declared square is the only thing never dropped.
//   - **Tier 1 does the arithmetic** — here, with no model, in closed form. No
//     iteration and no residual: a triangle from three facts (SSS, SAS, ASA,
//     AAS, and SSA with both of its answers), a rectangle from any two of
//     width, height, diagonal, area and perimeter, a circle from any one of
//     radius, diameter, circumference or area, an arc from any two of chord,
//     rise, radius and length, a line from its length, parts along one edge
//     summing to their whole. One figure at a time; never two together.
//   - **The ink's measures are the ink's.** What the labels leave open is
//     offered from the drawing's scale — *drawn to scale this would be 10″* —
//     and marked as the ink's, never the thing's.
//
// Nothing here writes: every value is derived state, a pure function of the
// log, and none of it is ever put back into the log or the ink.

import type { SessionState } from '../session/session';
import { RIGHT_ANGLE_TOLERANCE, angleClass } from '../session/measure';
import type { BoardDimensions, Drawing, DrawingScale, Figure, FigureLabel } from './dimension';
import { dimensionsOf, inkMeasure } from './dimension';
import { sheetLines } from './gather';
import { readSheet } from './sheet';
import type { LengthUnit, Quantity } from './quantity';
import { compareQuantities, convertQuantity, formatNumber, formatQuantity, unitSuffix } from './quantity';

// ===== What a solution says =====

/**
 * Where a value comes from: written on the figure, declared by its ink (a
 * square in a corner), derived from those with a formula, taken as a reading
 * for the sake of a reading (a corner that measures right), or the ink's own
 * measure at the drawing's scale.
 */
export type SolvedFrom = 'labelled' | 'declared' | 'derived' | 'assumed' | 'ink';

export interface SolvedValue {
  /** 'side1', 'angle2', 'area', 'perimeter'; 'width', 'height', 'diagonal'; 'radius', 'diameter', 'circumference'; 'chord', 'rise', 'sweep', 'arc'; 'length'; a part, 'side0.part1'. */
  key: string;
  /** For people: 'the long side', 'side BC', 'the angle at C', 'the area'. */
  label: string;
  /** In the drawing's unit — square units for an area, degrees (bare) for an angle. */
  value: Quantity;
  from: SolvedFrom;
  /** For a derived value, how — with the numbers put in: '√(24² + 8²)'. */
  formula?: string;
  /** As people read it: '25.30″', '90°', '96 in²'. */
  text: string;
  reason: string;
}

export interface Conflict {
  /** The key the label that cannot hold is on. */
  key: string;
  label: string;
  /** What was written, in the drawing's unit. */
  written: Quantity;
  /** What the reading makes it. */
  derived: Quantity;
  /** Derived minus written: 1.30 when 24 is written for 25.30. */
  difference: number;
  /** The difference as a share of what was written. */
  share: number;
  /** As written: '24', '⌀ 12'. */
  text: string;
  ids: string[];
  /** 'labelled 24; legs of 24 and 8 make it 25.30, 1.30 longer (5%)'. */
  reason: string;
}

export interface SolveReading {
  /** Every measure this reading fixes, in the drawing's unit, labelled or derived. */
  values: SolvedValue[];
  /** The labels this reading keeps, as written. */
  keeps: string[];
  /** The labels that cannot hold in it, and by how much. */
  conflicts: Conflict[];
  /** What it rests on that is not a fact: a corner that measures right, taken as right. */
  assumes?: string[];
  /** One sentence: '24 on the long side and a leg of 8 make the other leg 22.63″'. */
  sentence: string;
  reason: string;
}

export interface Solution {
  figure: Figure;
  unit: LengthUnit | null;
  /** Every consistent reading, the likeliest first. Empty when the labels fix nothing. */
  readings: SolveReading[];
  /** The first reading's conflicts. */
  conflicts: Conflict[];
  /** Parts that make their whole: '21″ and 22″ make 43″ ✓'. */
  checks: string[];
  /** What the labels leave open, from the drawing's scale: the ink's, never the thing's. */
  ink: SolvedValue[];
  /** Anything else worth saying: labels that hold only against a declared corner; a corner the ink draws right that the labels do not. */
  notes: string[];
}

export interface SolveOptions {
  /** The drawing's unit; unset, the unit the labels write. */
  unit?: LengthUnit | null;
  /** The drawing's scale, for what the labels leave open. */
  scale?: DrawingScale | null;
}

// ===== Numbers =====

type Iv = { lo: number; hi: number };

const TOL = 1e-9;
const DEG = Math.PI / 180;

/** A derived number: as it is when exact to the hundredth, else to two places with the zero kept — 25.30, never 25.3. */
function fmtV(v: number): string {
  const r = Math.round(v * 100) / 100;
  if (Math.abs(v - r) <= TOL * Math.max(1, Math.abs(v))) return formatNumber(v, 2);
  return (r < 0 ? '−' : '') + Math.abs(r).toFixed(2);
}

function fmtIv(iv: Iv): string {
  return iv.hi - iv.lo > TOL * Math.max(1, Math.abs(iv.hi)) ? `${fmtV(iv.lo)}–${fmtV(iv.hi)}` : fmtV(iv.lo);
}

/** Evaluate a closed form at every corner of its inputs' ranges: exact for the monotone forms used here. Null when any corner has no answer. */
function over(ins: readonly Iv[], f: (xs: number[]) => number | null): Iv | null {
  let lo = Infinity, hi = -Infinity;
  const n = ins.length;
  for (let mask = 0; mask < 1 << n; mask++) {
    const xs = ins.map((iv, i) => (mask >> i) & 1 ? iv.hi : iv.lo);
    const v = f(xs);
    if (v === null || !Number.isFinite(v)) return null;
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  return { lo, hi };
}

const point = (v: number): Iv => ({ lo: v, hi: v });

/** A range inside a formula stands in brackets, so √(8² + (2–4)²) never reads as 8² + 2 − 4². */
function bracketRanges(formula: string): string {
  return formula.replace(/(\(?)(~?\d+(?:\.\d+)?–\d+(?:\.\d+)?)(\)?)/g, (all, open: string, range: string, close: string) =>
    open && close ? all : `${open}(${range})${close}`
  );
}

// ===== Facts =====

interface Fact {
  i: number;
  /** The key it fixes under this figure's kind: 'side0', 'angle2', 'width', 'radius' … */
  key: string;
  iv: Iv;
  /** What was written, in the drawing's unit, for checking. */
  q: Quantity;
  /** As written: '24', '⌀ 12'; for parts, '21″ and 22″'. */
  text: string;
  /** The number as written, without its name: '24', '12', '28″'. */
  shown: string;
  name?: string;
  /** Labels of one number are alternatives: at most one is kept. */
  group: string;
  fixed: boolean;
  /** A reading taken as a fact for one reading: why. */
  assumed?: string;
  /** A sum of parts: the parts as written. */
  parts?: string[];
  ids: string[];
}

interface Val {
  iv: Iv;
  formula?: string;
  from: SolvedFrom;
  fact?: Fact;
}

interface Model {
  basis: Fact[];
  vals: Map<string, Val>;
  /** The basis in words: 'legs of 24 and 8'. */
  how: string;
  /** What it makes, for the sentence: '[the long side, 25.30″]'. */
  makes: string[];
  assumed?: string;
  /** Which of SSA's two triangles, when the same labels make two: both are readings. */
  branch?: number;
}

// ===== Triangles =====

/** Side k runs from vertex k to k + 1; the side opposite vertex k is k + 1; the vertex opposite side k is k + 2. */
const oppSide = (v: number) => (v + 1) % 3;
const oppVertex = (s: number) => (s + 2) % 3;
/** The vertex two sides share. */
const shared = (s: number, t: number) => ((s + 1) % 3 === t ? t : (t + 1) % 3 === s ? s : -1);
const V = 'ABC';

interface Tri {
  sides: number[];
  angles: number[];
}

function lawOfCosines(a: number, b: number, C: number): number | null {
  const c2 = a * a + b * b - 2 * a * b * Math.cos(C * DEG);
  return c2 > TOL ? Math.sqrt(c2) : null;
}

function angleFrom(a: number, b: number, opposite: number): number | null {
  const c = (a * a + b * b - opposite * opposite) / (2 * a * b);
  if (c < -1 - 1e-12 || c > 1 + 1e-12) return null;
  return Math.acos(Math.max(-1, Math.min(1, c))) / DEG;
}

function validTri(t: Tri): Tri | null {
  if (t.sides.some((s) => !(s > TOL)) || t.angles.some((a) => !(a > TOL) || a >= 180 - TOL)) return null;
  return t;
}

/** Every triangle three facts fix (0, 1, or 2 for SSA), at one point of their ranges. */
function triangleAt(sides: Map<number, number>, angles: Map<number, number>): Tri[] {
  const S = [...sides.keys()], A = [...angles.keys()];
  const full = (s: number[]): Tri | null => {
    const angles2 = [0, 1, 2].map((v) => {
      const o = oppSide(v);
      return angleFrom(s[(o + 1) % 3], s[(o + 2) % 3], s[o]);
    });
    if (angles2.some((a) => a === null)) return null;
    return validTri({ sides: s, angles: angles2 as number[] });
  };
  if (S.length === 3) {
    const s = [0, 1, 2].map((k) => sides.get(k)!);
    const [a, b, c] = s.slice().sort((x, y) => x - y);
    if (a + b <= c * (1 + TOL)) return [];
    const t = full(s);
    return t ? [t] : [];
  }
  if (S.length === 2 && A.length === 1) {
    const [s, t] = S;
    const v = A[0];
    const X = angles.get(v)!;
    if (shared(s, t) === v) {
      // SAS: the third side by the law of cosines.
      const third = [0, 1, 2].find((k) => k !== s && k !== t)!;
      const c = lawOfCosines(sides.get(s)!, sides.get(t)!, X);
      if (c === null) return [];
      const all = [0, 1, 2].map((k) => (k === third ? c : sides.get(k)!));
      const tri = full(all);
      return tri ? [tri] : [];
    }
    // SSA: the known angle is opposite one known side.
    const o = oppSide(v);
    const n = o === s ? t : s;
    const on = sides.get(o)!, nn = sides.get(n)!;
    const sinY = (nn * Math.sin(X * DEG)) / on;
    if (sinY > 1 + 1e-12) return [];
    const y0 = Math.asin(Math.min(1, sinY)) / DEG;
    const out: Tri[] = [];
    for (const Y of y0 > 90 - 1e-9 && y0 < 90 + 1e-9 ? [y0] : [y0, 180 - y0]) {
      const Z = 180 - X - Y;
      if (Z <= TOL) continue;
      const vy = oppVertex(n);
      const vz = [0, 1, 2].find((k) => k !== v && k !== vy)!;
      const ang = [0, 0, 0];
      ang[v] = X;
      ang[vy] = Y;
      ang[vz] = Z;
      const third = oppSide(vz);
      const side = [0, 0, 0];
      side[o] = on;
      side[n] = nn;
      side[third] = (on * Math.sin(Z * DEG)) / Math.sin(X * DEG);
      const tri = validTri({ sides: side, angles: ang });
      if (tri) out.push(tri);
    }
    return out;
  }
  if (S.length === 1 && A.length === 2) {
    const ang = [0, 0, 0];
    for (const [k, a] of angles) ang[k] = a;
    const missing = [0, 1, 2].find((k) => !angles.has(k))!;
    ang[missing] = 180 - ang[(missing + 1) % 3] - ang[(missing + 2) % 3];
    if (ang[missing] <= TOL) return [];
    const s0 = S[0];
    const known = sides.get(s0)!;
    const across = ang[oppVertex(s0)];
    const side = [0, 1, 2].map((k) => (k === s0 ? known : (known * Math.sin(ang[oppVertex(k)] * DEG)) / Math.sin(across * DEG)));
    const tri = validTri({ sides: side, angles: ang });
    return tri ? [tri] : [];
  }
  return [];
}

function sideName(f: Figure, k: number, right: number | null, hyp = 'the long side'): string {
  if (right !== null && oppVertex(k) === right) return hyp;
  return f.sides[k]?.label ?? `side ${V[k]}${V[(k + 1) % 3]}`;
}

/** The known numbers in words, the larger first: 'legs of 24 and 8'. */
function desc<T extends { v: number }>(xs: T[]): T[] {
  return xs.slice().sort((a, b) => b.v - a.v);
}

function triangleModels(facts: Fact[]): Model[] {
  const sideFacts = facts.filter((x) => /^side\d$/.test(x.key));
  const angleFacts = facts.filter((x) => /^angle\d$/.test(x.key));
  const fixed = facts.filter((x) => x.fixed);
  const pool = [...sideFacts, ...angleFacts];
  const out: Model[] = [];
  const pick = (k: number, from: Fact[]): Fact[][] => {
    if (k === 0) return [[]];
    const res: Fact[][] = [];
    from.forEach((x, i) => {
      for (const rest of pick(k - 1, from.slice(i + 1))) res.push([x, ...rest]);
    });
    return res;
  };
  for (const basis of pick(3, pool)) {
    if (fixed.some((x) => !basis.includes(x))) continue;
    if (new Set(basis.map((x) => x.key)).size !== 3 || new Set(basis.map((x) => x.group)).size !== 3) continue;
    if (!basis.some((x) => x.key.startsWith('side'))) continue;
    // Evaluate at every corner of the ranges; a branch holds only if it holds at all of them.
    const ivs = basis.map((x) => x.iv);
    const at = (xs: number[]) => {
      const sides = new Map<number, number>(), angles = new Map<number, number>();
      basis.forEach((x, i) => (x.key.startsWith('side') ? sides : angles).set(Number(x.key.slice(-1)), xs[i]));
      return triangleAt(sides, angles);
    };
    const exact = ivs.map((iv) => iv.lo);
    const branches = at(exact).length;
    for (let b = 0; b < branches; b++) {
      const sidesIv: Iv[] = [], anglesIv: Iv[] = [];
      let ok = true;
      for (let k = 0; k < 3 && ok; k++) {
        const s = over(ivs, (xs) => at(xs)[b]?.sides[k] ?? null);
        const a = over(ivs, (xs) => at(xs)[b]?.angles[k] ?? null);
        if (!s || !a) ok = false;
        else {
          sidesIv.push(s);
          anglesIv.push(a);
        }
      }
      if (!ok) continue;
      out.push(triangleModel(basis, sidesIv, anglesIv, branches > 1 ? b : -1));
    }
  }
  return out;
}

function triangleModel(basis: Fact[], sides: Iv[], angles: Iv[], branch: number): Model {
  const vals = new Map<string, Val>();
  const known = new Map<string, Fact>(basis.map((x) => [x.key, x]));
  const sideKnown = [0, 1, 2].filter((k) => known.has(`side${k}`));
  const angleKnown = [0, 1, 2].filter((k) => known.has(`angle${k}`));
  const rightFact = angleKnown.find((k) => Math.abs(known.get(`angle${k}`)!.iv.lo - 90) < TOL && Math.abs(known.get(`angle${k}`)!.iv.hi - 90) < TOL);
  const right = rightFact ?? null;
  const n = (k: number) => {
    const x = known.get(`side${k}`);
    return x ? numText(x) : fmtIv(sides[k]);
  };
  const a = (k: number) => {
    const x = known.get(`angle${k}`);
    return x ? numText(x) : fmtIv(angles[k]);
  };
  let how = '';
  const makes: string[] = [];
  const formulas = new Map<string, string>();
  const sideOf = (k: number) => `side${k}`;
  const legsAt = (v: number) => [0, 1, 2].filter((k) => k !== oppSide(v));
  if (right !== null && angleKnown.length === 1 && sideKnown.length === 2) {
    const hyp = oppSide(right);
    const legs = legsAt(right);
    if (!sideKnown.includes(hyp)) {
      const [p, q] = desc(legs.map((k) => ({ k, v: sides[k].lo })));
      how = `legs of ${n(p.k)} and ${n(q.k)}`;
      formulas.set(sideOf(hyp), `√(${n(p.k)}² + ${n(q.k)}²)`);
      makes.push(sideOf(hyp));
    } else {
      const leg = legs.find((k) => sideKnown.includes(k))!;
      const other = legs.find((k) => k !== leg)!;
      how = `${n(hyp)} on the long side and a leg of ${n(leg)}`;
      formulas.set(sideOf(other), `√(${n(hyp)}² − ${n(leg)}²)`);
      makes.push(sideOf(other));
    }
    for (const v of [0, 1, 2]) {
      if (v === right) continue;
      const o = oppSide(v);
      const adj = legs.find((k) => k !== o)!;
      formulas.set(`angle${v}`, `atan(${n(o)} ÷ ${n(adj)})`);
    }
    const [big, small] = desc(legs.map((k) => ({ k, v: sides[k].lo })));
    formulas.set('area', `½ × ${n(big.k)} × ${n(small.k)}`);
  } else if (sideKnown.length === 3) {
    const [p, q, r] = desc(sideKnown.map((k) => ({ k, v: sides[k].lo })));
    how = `sides of ${n(p.k)}, ${n(q.k)} and ${n(r.k)}`;
    for (const v of [0, 1, 2]) {
      const o = oppSide(v);
      const [x, y] = [0, 1, 2].filter((k) => k !== o);
      formulas.set(`angle${v}`, `acos((${n(x)}² + ${n(y)}² − ${n(o)}²) ÷ (2 × ${n(x)} × ${n(y)}))`);
      makes.push(`angle${v}`);
    }
    const s = (sides[0].lo + sides[1].lo + sides[2].lo) / 2;
    formulas.set('area', `√(${fmtV(s)} × ${fmtV(s - sides[0].lo)} × ${fmtV(s - sides[1].lo)} × ${fmtV(s - sides[2].lo)})`);
  } else if (sideKnown.length === 2 && angleKnown.length === 1) {
    const [s, t] = sideKnown;
    const v = angleKnown[0];
    if (shared(s, t) === v) {
      const third = [0, 1, 2].find((k) => k !== s && k !== t)!;
      const [p, q] = desc([{ k: s, v: sides[s].lo }, { k: t, v: sides[t].lo }]);
      how = `sides of ${n(p.k)} and ${n(q.k)} with ${a(v)}° between them`;
      formulas.set(sideOf(third), `√(${n(p.k)}² + ${n(q.k)}² − 2 × ${n(p.k)} × ${n(q.k)} × cos ${a(v)}°)`);
      makes.push(sideOf(third));
      formulas.set('area', `½ × ${n(p.k)} × ${n(q.k)} × sin ${a(v)}°`);
    } else {
      const o = oppSide(v);
      const nn = o === s ? t : s;
      const vy = oppVertex(nn);
      const vz = [0, 1, 2].find((k) => k !== v && k !== vy)!;
      how = `sides of ${n(o)} and ${n(nn)} with ${a(v)}° opposite the ${n(o)}`;
      formulas.set(`angle${vy}`, `${branch === 1 ? '180° − ' : ''}asin(${n(nn)} × sin ${a(v)}° ÷ ${n(o)})`);
      formulas.set(`angle${vz}`, `180° − ${a(v)}° − ${fmtIv(angles[vy])}°`);
      const third = oppSide(vz);
      formulas.set(sideOf(third), `${n(o)} × sin ${fmtIv(angles[vz])}° ÷ sin ${a(v)}°`);
      // The angle is what tells SSA's two triangles apart, so the sentence says it.
      makes.push(sideOf(third), `angle${vy}`);
    }
  } else if (sideKnown.length === 1 && angleKnown.length === 2) {
    const s0 = sideKnown[0];
    const [v1, v2] = angleKnown;
    const missing = [0, 1, 2].find((k) => !angleKnown.includes(k))!;
    const asa = [v1, v2].every((v) => v === s0 || v === (s0 + 1) % 3);
    how = asa ? `angles of ${a(v1)}° and ${a(v2)}° with ${n(s0)} between them` : `angles of ${a(v1)}° and ${a(v2)}° and a side of ${n(s0)}`;
    formulas.set(`angle${missing}`, `180° − ${a(v1)}° − ${a(v2)}°`);
    const across = oppVertex(s0);
    for (const k of [0, 1, 2]) {
      if (k === s0) continue;
      formulas.set(sideOf(k), `${n(s0)} × sin ${a(oppVertex(k))}° ÷ sin ${a(across)}°`);
      makes.push(sideOf(k));
    }
  }
  // The rest follows from the sides.
  if (!formulas.has('area')) {
    const [p, q] = [0, 1];
    formulas.set('area', `½ × ${n(p)} × ${n(q)} × sin ${fmtIv(angles[shared(p, q)])}°`);
  }
  formulas.set('perimeter', desc([0, 1, 2].map((k) => ({ k, v: sides[k].lo }))).map((x) => n(x.k)).join(' + '));
  for (let k = 0; k < 3; k++) {
    const x = known.get(`side${k}`);
    vals.set(sideOf(k), x ? { iv: x.iv, from: 'labelled', fact: x } : { iv: sides[k], from: 'derived', formula: formulas.get(sideOf(k)) });
    const y = known.get(`angle${k}`);
    vals.set(`angle${k}`, y ? { iv: y.iv, from: y.assumed ? 'assumed' : y.fixed ? 'declared' : 'labelled', fact: y } : { iv: angles[k], from: 'derived', formula: formulas.get(`angle${k}`) });
  }
  const area = over([sides[0], sides[1], angles[shared(0, 1)]], ([p, q, C]) => 0.5 * p * q * Math.sin(C * DEG));
  if (area) vals.set('area', { iv: area, from: 'derived', formula: formulas.get('area') });
  vals.set('perimeter', { iv: { lo: sides[0].lo + sides[1].lo + sides[2].lo, hi: sides[0].hi + sides[1].hi + sides[2].hi }, from: 'derived', formula: formulas.get('perimeter') });
  const assumed = basis.find((x) => x.assumed)?.assumed;
  return { basis, vals, how, makes, ...(assumed ? { assumed } : {}), ...(branch >= 0 ? { branch } : {}) };
}

// ===== Rectangles =====

function rectangleModels(facts: Fact[], inkWide: boolean): Model[] {
  const by = (k: string) => facts.filter((x) => x.key === k);
  const W = by('width'), H = by('height'), D = by('diagonal'), A = by('area'), P = by('perimeter');
  const out: Model[] = [];
  const model = (basis: Fact[], w: Iv | null, h: Iv | null, fw: string | undefined, fh: string | undefined, how: string, makes: string[]) => {
    const vals = new Map<string, Val>();
    const put = (key: string, iv: Iv | null, formula?: string) => {
      if (!iv) return;
      const fact = basis.find((x) => x.key === key && !x.parts);
      vals.set(key, fact ? { iv: fact.iv, from: 'labelled', fact } : { iv, from: 'derived', formula });
    };
    put('width', w, fw);
    put('height', h, fh);
    if (w && h) {
      const ws = basis.find((x) => x.key === 'width') ? numText(basis.find((x) => x.key === 'width')!) : fmtIv(w);
      const hs = basis.find((x) => x.key === 'height') ? numText(basis.find((x) => x.key === 'height')!) : fmtIv(h);
      put('diagonal', over([w, h], ([p, q]) => Math.hypot(p, q)), `√(${ws}² + ${hs}²)`);
      put('area', over([w, h], ([p, q]) => p * q), `${ws} × ${hs}`);
      put('perimeter', over([w, h], ([p, q]) => 2 * (p + q)), `2 × (${ws} + ${hs})`);
    }
    out.push({ basis, vals, how, makes });
  };
  const word = (x: Fact) => (x.parts ? x.text : `${/^[aeiou]/.test(x.key) ? 'an' : 'a'} ${x.key} of ${x.shown}`);
  const both = (x: Fact, y: Fact) => `${word(x)} and ${word(y)}`;
  for (const w of W) model([w], w.iv, null, w.parts ? w.parts.join(' + ') : undefined, undefined, word(w), w.parts ? ['width'] : []);
  for (const h of H) model([h], null, h.iv, undefined, h.parts ? h.parts.join(' + ') : undefined, word(h), h.parts ? ['height'] : []);
  for (const w of W) for (const h of H) if (w.group !== h.group) model([w, h], w.iv, h.iv, w.parts?.join(' + '), h.parts?.join(' + '), both(w, h), ['diagonal']);
  for (const d of D) {
    for (const w of W) if (w.group !== d.group) {
      const h = over([d.iv, w.iv], ([dd, ww]) => (dd > ww + TOL ? Math.sqrt(dd * dd - ww * ww) : null));
      if (h) model([w, d], w.iv, h, undefined, `√(${numText(d)}² − ${numText(w)}²)`, both(w, d), ['height']);
    }
    for (const h of H) if (h.group !== d.group) {
      const w = over([d.iv, h.iv], ([dd, hh]) => (dd > hh + TOL ? Math.sqrt(dd * dd - hh * hh) : null));
      if (w) model([h, d], w, h.iv, `√(${numText(d)}² − ${numText(h)}²)`, undefined, both(h, d), ['width']);
    }
  }
  for (const ar of A) {
    for (const w of W) if (w.group !== ar.group) model([w, ar], w.iv, over([ar.iv, w.iv], ([aa, ww]) => aa / ww), undefined, `${numText(ar)} ÷ ${numText(w)}`, both(w, ar), ['height']);
    for (const h of H) if (h.group !== ar.group) model([h, ar], over([ar.iv, h.iv], ([aa, hh]) => aa / hh), h.iv, `${numText(ar)} ÷ ${numText(h)}`, undefined, both(h, ar), ['width']);
  }
  for (const p of P) {
    for (const w of W) if (w.group !== p.group) {
      const h = over([p.iv, w.iv], ([pp, ww]) => (pp / 2 - ww > TOL ? pp / 2 - ww : null));
      if (h) model([w, p], w.iv, h, undefined, `${numText(p)} ÷ 2 − ${numText(w)}`, both(w, p), ['height']);
    }
    for (const h of H) if (h.group !== p.group) {
      const w = over([p.iv, h.iv], ([pp, hh]) => (pp / 2 - hh > TOL ? pp / 2 - hh : null));
      if (w) model([h, p], w, h.iv, `${numText(p)} ÷ 2 − ${numText(h)}`, undefined, both(h, p), ['width']);
    }
  }
  // Two of diagonal, area and perimeter fix the sides' sum and product, so a quadratic: (S ± √(S² − 4P)) ÷ 2 —
  // the longer root to the pair of sides the ink draws longer.
  const pair = (x: Fact, y: Fact, sum: (a: number, b: number) => number | null, prod: (a: number, b: number) => number | null, forms: [string, string]) => {
    if (x.group === y.group) return;
    const root = (sign: number) => over([x.iv, y.iv], ([a, b]) => {
      const S = sum(a, b), Pr = prod(a, b);
      if (S === null || Pr === null || Pr <= 0) return null;
      const disc = S * S - 4 * Pr;
      if (disc < -TOL) return null;
      return (S + sign * Math.sqrt(Math.max(0, disc))) / 2;
    });
    const big = root(1), small = root(-1);
    if (!big || !small) return;
    const [w, h] = inkWide ? [big, small] : [small, big];
    const [fw, fh] = inkWide ? forms : [forms[1], forms[0]];
    model([x, y], w, h, fw, fh, both(x, y), ['width', 'height']);
  };
  const plusMinus = (form: (pm: string) => string): [string, string] => [form('+'), form('−')];
  for (const d of D) for (const ar of A) {
    const [dd, aa] = [numText(d), numText(ar)];
    pair(d, ar, (x, y) => Math.sqrt(x * x + 2 * y), (_, y) => y, plusMinus((pm) => `(√(${dd}² + 2 × ${aa}) ${pm} √(${dd}² − 2 × ${aa})) ÷ 2`));
  }
  for (const d of D) for (const p of P) {
    const [dd, pp] = [numText(d), numText(p)];
    pair(d, p, (_, y) => y / 2, (x, y) => ((y / 2) ** 2 - x * x) / 2, plusMinus((pm) => `(${pp} ÷ 2 ${pm} √(2 × ${dd}² − (${pp} ÷ 2)²)) ÷ 2`));
  }
  for (const ar of A) for (const p of P) {
    const [aa, pp] = [numText(ar), numText(p)];
    pair(ar, p, (_, y) => y / 2, (x) => x, plusMinus((pm) => `(${pp} ÷ 2 ${pm} √((${pp} ÷ 2)² − 4 × ${aa})) ÷ 2`));
  }
  return out;
}

// ===== Circles =====

function circleModels(facts: Fact[]): Model[] {
  const out: Model[] = [];
  for (const x of facts) {
    const r = x.key === 'radius' ? x.iv : x.key === 'diameter' ? over([x.iv], ([d]) => d / 2) : x.key === 'circumference' ? over([x.iv], ([c]) => c / (2 * Math.PI)) : x.key === 'area' ? over([x.iv], ([a]) => (a > 0 ? Math.sqrt(a / Math.PI) : null)) : null;
    if (!r || !(r.lo > 0)) continue;
    const X = numText(x);
    const rs = x.key === 'radius' ? X : fmtIv(r);
    const formulas: Record<string, string> = {
      radius: x.key === 'diameter' ? `${X} ÷ 2` : x.key === 'circumference' ? `${X} ÷ 2π` : `√(${X} ÷ π)`,
      diameter: x.key === 'circumference' ? `${X} ÷ π` : `2 × ${rs}`,
      circumference: x.key === 'diameter' ? `π × ${X}` : `2π × ${rs}`,
      area: `π × ${rs}²`,
    };
    const vals = new Map<string, Val>();
    const put = (key: string, iv: Iv | null) => {
      if (!iv) return;
      vals.set(key, key === x.key ? { iv: x.iv, from: 'labelled', fact: x } : { iv, from: 'derived', formula: formulas[key] });
    };
    put('radius', r);
    put('diameter', over([r], ([v]) => 2 * v));
    put('circumference', over([r], ([v]) => 2 * Math.PI * v));
    put('area', over([r], ([v]) => Math.PI * v * v));
    const named = x.key === 'circumference' && x.name ? x.name : x.key;
    out.push({ basis: [x], vals, how: `${/^[aeiou]/i.test(named) ? 'an' : 'a'} ${named} of ${x.shown}`, makes: [x.key === 'radius' ? 'circumference' : 'radius'] });
  }
  return out;
}

// ===== Arcs =====

function arcModels(f: Figure, facts: Fact[]): Model[] {
  const by = (k: string) => facts.filter((x) => x.key === k);
  const C = by('chord'), H = by('rise'), R = by('radius'), L = by('arc');
  const inkMajor = (f.rise ?? 0) > (f.radius ?? Infinity);
  const out: Model[] = [];
  const build = (basis: Fact[], c: Iv, h: Iv, r: Iv, forms: Record<string, string>, makes: string[]) => {
    const major = h.lo > r.lo + TOL;
    const sweep = over([c, r], ([cc, rr]) => {
      const s = 2 * Math.asin(Math.min(1, cc / (2 * rr))) / DEG;
      return major ? 360 - s : s;
    });
    const vals = new Map<string, Val>();
    const put = (key: string, iv: Iv | null, formula?: string) => {
      if (!iv) return;
      const fact = basis.find((x) => x.key === key);
      vals.set(key, fact ? { iv: fact.iv, from: 'labelled', fact } : { iv, from: 'derived', formula });
    };
    put('chord', c, forms.chord);
    put('rise', h, forms.rise);
    put('radius', r, forms.radius);
    const rs = basis.find((x) => x.key === 'radius') ? numText(basis.find((x) => x.key === 'radius')!) : fmtIv(r);
    const cs = basis.find((x) => x.key === 'chord') ? numText(basis.find((x) => x.key === 'chord')!) : fmtIv(c);
    if (sweep) {
      put('sweep', sweep, `${major ? '360° − ' : ''}2 × asin(${cs} ÷ (2 × ${rs}))`);
      put('arc', over([r, sweep], ([rr, sw]) => rr * sw * DEG), `π × ${rs} × ${fmtIv(sweep)}° ÷ 180°`);
    }
    const word = (x: Fact) => `${/^[aeiou]/i.test(x.key) ? 'an' : 'a'} ${x.key === 'arc' ? 'arc length' : x.key} of ${x.shown}`;
    out.push({ basis, vals, how: basis.map(word).join(' and '), makes });
  };
  for (const c of C) for (const h of H) {
    if (c.group === h.group) continue;
    const r = over([c.iv, h.iv], ([cc, hh]) => (hh > 0 ? (cc * cc) / (8 * hh) + hh / 2 : null));
    if (r) build([c, h], c.iv, h.iv, r, { radius: `${numText(c)}² ÷ (8 × ${numText(h)}) + ${numText(h)} ÷ 2` }, ['radius']);
  }
  for (const c of C) for (const r of R) {
    if (c.group === r.group) continue;
    const h = over([c.iv, r.iv], ([cc, rr]) => (cc <= 2 * rr + TOL ? rr + (inkMajor ? 1 : -1) * Math.sqrt(Math.max(0, rr * rr - (cc * cc) / 4)) : null));
    if (h) build([c, r], c.iv, h, r.iv, { rise: `${numText(r)} ${inkMajor ? '+' : '−'} √(${numText(r)}² − (${numText(c)} ÷ 2)²)` }, ['rise']);
  }
  for (const h of H) for (const r of R) {
    if (h.group === r.group) continue;
    const c = over([h.iv, r.iv], ([hh, rr]) => (hh <= 2 * rr + TOL ? 2 * Math.sqrt(Math.max(0, 2 * rr * hh - hh * hh)) : null));
    if (c) build([h, r], c, h.iv, r.iv, { chord: `2 × √(2 × ${numText(r)} × ${numText(h)} − ${numText(h)}²)` }, ['chord']);
  }
  for (const r of R) for (const l of L) {
    if (r.group === l.group) continue;
    const c = over([r.iv, l.iv], ([rr, ll]) => 2 * rr * Math.sin(ll / rr / 2));
    const h = over([r.iv, l.iv], ([rr, ll]) => rr * (1 - Math.cos(ll / rr / 2)));
    if (c && h) build([r, l], c, h, r.iv, { chord: `2 × ${numText(r)} × sin(${numText(l)} ÷ (2 × ${numText(r)}))`, rise: `${numText(r)} × (1 − cos(${numText(l)} ÷ (2 × ${numText(r)})))` }, ['chord']);
  }
  // One fact alone fixes only itself.
  for (const x of facts) {
    if (x.key === 'arc' || x.key === 'sweep') continue;
    out.push({ basis: [x], vals: new Map([[x.key, { iv: x.iv, from: 'labelled' as const, fact: x }]]), how: `${x.key === 'rise' ? 'a rise' : `a ${x.key}`} of ${x.shown}`, makes: [] });
  }
  return out;
}

// ===== Lines, and figures whose sides stand alone =====

function sideModels(f: Figure, facts: Fact[]): Model[] {
  const out: Model[] = [];
  for (const x of facts) {
    if (!f.sides.some((s) => s.key === x.key)) continue;
    const vals = new Map<string, Val>([[x.key, x.parts ? { iv: x.iv, from: 'derived', formula: x.parts.join(' + '), fact: x } : { iv: x.iv, from: 'labelled', fact: x }]]);
    out.push({ basis: [x], vals, how: x.parts ? x.text : `a length of ${x.shown}`, makes: x.parts ? [x.key] : [] });
  }
  return out;
}

// ===== Readings: which labels hold together =====

/** A label that cannot hold, what the reading makes it, and — when the reading was merged from several — the basis it was set against. */
interface Miss {
  fact: Fact;
  derived: Iv;
  against?: Model;
}

interface Checked {
  model: Model;
  kept: Fact[];
  conflicts: Miss[];
  share: number;
  ink: number;
}

function toQ(iv: Iv, unit: LengthUnit | null, dim: number, approx = false): Quantity {
  return { lo: iv.lo, hi: iv.hi, unit: dim === 0 ? null : unit, dim: unit ? dim : 0, approx };
}

const dimOf = (key: string) => (/^angle\d$/.test(key) || key === 'sweep' ? 0 : key === 'area' ? 2 : 1);

function check(model: Model, facts: Fact[], unit: LengthUnit | null): Checked {
  const kept: Fact[] = [...model.basis];
  const conflicts: Miss[] = [];
  const used = new Set(model.basis.map((x) => x.group));
  const groups = new Map<string, Fact[]>();
  for (const x of facts) if (!used.has(x.group)) (groups.get(x.group) ?? groups.set(x.group, []).get(x.group)!).push(x);
  let share = 0;
  for (const alts of groups.values()) {
    let hit: Fact | null = null;
    let miss: Miss | null = null;
    for (const x of alts) {
      const v = model.vals.get(x.key);
      if (!v) continue;
      const cmp = compareQuantities(toQ(v.iv, unit, dimOf(x.key)), x.q);
      if (cmp.status === 'ok' || cmp.status === 'rounded' || cmp.status === 'within') {
        hit = x;
        break;
      }
      if (cmp.status === 'off' && !miss) miss = { fact: x, derived: v.iv };
    }
    if (hit) kept.push(hit);
    else if (miss) {
      conflicts.push(miss);
      share += Math.abs(miss.derived.lo - miss.fact.iv.lo) / Math.max(TOL, Math.abs(miss.fact.iv.lo));
    }
  }
  return { model, kept, conflicts, share, ink: 0 };
}

/** How far a reading's proportions are from the ink's: a tie-breaker, never a vote against a label. */
function inkDistance(f: Figure, model: Model): number {
  const pairs: [number, number][] = [];
  for (const [key, v] of model.vals) {
    if (dimOf(key) !== 1) continue;
    const ink = inkMeasure(f, inkKeyOf(f, key));
    if (ink && ink > 0 && v.iv.lo > 0) pairs.push([v.iv.lo, ink]);
  }
  if (pairs.length < 2) return 0;
  const ratios = pairs.map(([a, b]) => Math.log(a / b));
  const mean = ratios.reduce((s, r) => s + r, 0) / ratios.length;
  return ratios.reduce((s, r) => s + Math.abs(r - mean), 0);
}

/** The ink's key for a value's key: a rectangle's width is the ink length of its wider pair of sides. */
function inkKeyOf(f: Figure, key: string): string {
  if (f.kind === 'rectangle' && (key === 'width' || key === 'height')) {
    const pair = rectanglePairs(f);
    return key === 'width' ? pair.width[0] : pair.height[0];
  }
  return key;
}

function rectanglePairs(f: Figure): { width: string[]; height: string[] } {
  const horizontal = (k: number) => Math.abs(f.sides[k].to.x - f.sides[k].from.x) >= Math.abs(f.sides[k].to.y - f.sides[k].from.y);
  const evenWide = horizontal(0) || (!horizontal(1) && f.sides[0].length >= f.sides[1].length);
  return evenWide ? { width: ['side0', 'side2'], height: ['side1', 'side3'] } : { width: ['side1', 'side3'], height: ['side0', 'side2'] };
}

// ===== The labels, as facts in the drawing's unit =====

function numText(x: Fact): string {
  if (x.parts) return fmtIv(x.iv);
  return formatQuantity({ ...x.q, unit: null, dim: 0 });
}

/** A part's label, in the drawing's unit. */
interface PartLabel {
  q: Quantity;
  text: string;
}

function factsOf(
  f: Figure,
  labels: readonly FigureLabel[],
  unit: LengthUnit | null,
  notes: string[]
): { facts: Fact[]; partChecks: { side: string; fact: Fact }[]; partLabels: Map<string, PartLabel> } {
  const facts: Fact[] = [];
  const keyOf = (k: string): string | null => {
    if (/^angle\d+$/.test(k)) return f.kind === 'triangle' ? k : null;
    if (f.kind === 'rectangle') {
      const pair = rectanglePairs(f);
      if (pair.width.includes(k) || k === 'width') return 'width';
      if (pair.height.includes(k) || k === 'height') return 'height';
      return ['diagonal', 'area', 'perimeter'].includes(k) ? k : null;
    }
    if (f.kind === 'circle') return ['radius', 'diameter', 'circumference', 'area'].includes(k) ? k : null;
    if (f.kind === 'arc') return ['chord', 'rise', 'radius', 'arc'].includes(k) ? k : null;
    if (f.kind === 'triangle') return /^side\d$/.test(k) || k === 'area' || k === 'perimeter' ? k : null;
    return f.sides.some((s) => s.key === k) ? k : null;
  };
  const inUnit = (q: Quantity, dim: number): Quantity | null => {
    if (dim === 0) return q.unit ? null : { ...q, dim: 0 };
    if (!q.unit) return unit ? { ...q, unit, dim } : { ...q, dim: 0 };
    if (!unit) return q;
    if (q.unit === unit) return q;
    const c = convertQuantity({ ...q, dim }, unit);
    if (c.note) notes.push(c.note);
    return c.quantity;
  };
  labels.forEach((l, i) => {
    if (l.key.includes('.')) return; // parts: summed below
    const key = keyOf(l.key);
    if (!key) return;
    const q = inUnit(l.value, dimOf(key));
    if (!q) return;
    facts.push({
      i,
      key,
      iv: { lo: q.lo, hi: q.hi },
      q,
      text: l.text,
      shown: l.shown ?? l.text,
      ...(l.name ? { name: l.name } : {}),
      group: l.number ?? `label:${i}`,
      fixed: !!l.declared,
      ids: l.ids,
    });
  });
  // Parts along one edge: each labelled once is read as written; when every part is, their sum is a fact about the whole.
  const partChecks: { side: string; fact: Fact }[] = [];
  const partLabels = new Map<string, PartLabel>();
  for (const side of f.sides) {
    if (!side.parts?.length) continue;
    const per = side.parts.map((p) => labels.filter((l) => l.key === p.key));
    per.forEach((ls, i) => {
      const q = ls.length === 1 ? inUnit(ls[0].value, 1) : null;
      if (q) partLabels.set(side.parts![i].key, { q, text: ls[0].text });
    });
    if (per.some((ls) => ls.length !== 1)) continue;
    const qs = per.map((ls) => inUnit(ls[0].value, 1));
    if (qs.some((q) => !q)) continue;
    const key = keyOf(side.key);
    if (!key) continue;
    const lo = qs.reduce((s, q) => s + q!.lo, 0), hi = qs.reduce((s, q) => s + q!.hi, 0);
    const texts = per.map((ls) => ls[0].text);
    const joined = texts.length === 2 ? `${texts[0]} and ${texts[1]}` : `${texts.slice(0, -1).join(', ')} and ${texts[texts.length - 1]}`;
    const fact: Fact = {
      i: labels.length + partChecks.length,
      key,
      iv: { lo, hi },
      q: { lo, hi, unit: qs[0]!.unit, dim: qs[0]!.dim, approx: qs.some((q) => q!.approx) },
      text: joined,
      shown: joined,
      group: `parts:${side.key}`,
      fixed: false,
      parts: qs.map((q) => formatQuantity({ ...q!, unit: null, dim: 0 })),
      ids: per.flatMap((ls) => ls[0].ids),
    };
    facts.push(fact);
    partChecks.push({ side: side.key, fact });
  }
  return { facts, partChecks, partLabels };
}

// ===== Words =====

const angleLabel = (k: number) => `the angle at ${'ABCDEFGH'[k] ?? k}`;

function labelOf(f: Figure, key: string, right: number | null): string {
  const side = /^side(\d)$/.exec(key);
  if (side) return f.kind === 'triangle' ? sideName(f, Number(side[1]), right) : f.sides[Number(side[1])]?.label ?? key;
  const angle = /^angle(\d)$/.exec(key);
  if (angle) return angleLabel(Number(angle[1]));
  if (key.includes('.')) {
    for (const s of f.sides) for (const p of s.parts ?? []) if (p.key === key) return p.label;
  }
  return key === 'arc' ? 'the arc length' : `the ${key}`;
}

function textOf(iv: Iv, key: string, unit: LengthUnit | null, approx = false): string {
  const d = dimOf(key);
  const suffix = d === 0 ? '°' : unitSuffix(unit, d);
  return `${approx ? '~' : ''}${fmtIv(iv)}${suffix}`;
}

const lengthWord = (key: string, more: boolean) => (dimOf(key) === 1 ? (more ? 'longer' : 'shorter') : more ? 'larger' : 'smaller');

function conflictOf(f: Figure, c: Miss, reading: Model, unit: LengthUnit | null, right: number | null): Conflict {
  const x = c.fact;
  const model = c.against ?? reading;
  const d = c.derived.lo - x.iv.lo;
  const share = Math.abs(d) / Math.max(TOL, Math.abs(x.iv.lo));
  const verb = model.basis.length > 1 || /\band\b/.test(model.how) ? 'make' : 'makes';
  const head = x.parts ? `${x.text} make ${textOf(x.iv, x.key, unit)}` : `labelled ${x.text}`;
  const reason = `${head}; ${model.how} ${verb} it ${fmtIv(c.derived)}, ${fmtV(Math.abs(d))} ${lengthWord(x.key, d > 0)} (${Math.round(share * 100)}%)`;
  return {
    key: x.key,
    label: labelOf(f, x.key, right),
    written: x.q,
    derived: toQ(c.derived, unit, dimOf(x.key)),
    difference: d,
    share,
    text: x.text,
    ids: x.ids,
    reason,
  };
}

// ===== Solving a figure =====

/**
 * What a figure's labels fix, every consistent reading, what cannot hold and
 * by how much, and what is left to the ink. One figure, in closed form.
 */
export function solveFigure(figure: Figure, labels: readonly FigureLabel[], options: SolveOptions = {}): Solution {
  const notes: string[] = [];
  const written = labels.find((l) => !l.declared && l.value.unit && l.value.dim >= 1)?.value.unit ?? null;
  const unit = options.unit !== undefined && options.unit !== null ? options.unit : written;
  const { facts, partChecks, partLabels } = factsOf(figure, labels, unit, notes);
  const f = figure;

  // Every basis the labels offer, each solved in closed form for the figure's kind.
  let models: Model[] = [];
  if (f.kind === 'triangle') {
    models = triangleModels(facts);
    const angleFacts = facts.filter((x) => x.key.startsWith('angle'));
    if (!models.length) {
      // Three angles fix a shape and no size: say when they cannot be a triangle.
      if (angleFacts.length === 3 && new Set(angleFacts.map((x) => x.key)).size === 3) {
        const sum = angleFacts.reduce((s, x) => s + x.iv.lo, 0);
        if (Math.abs(sum - 180) > 0.5) notes.push(`the angles add to ${fmtV(sum)}°, not 180°`);
      }
      // A corner the ink draws right is a reading: offered as one, when the labels alone fix nothing.
      if (facts.some((x) => x.key.startsWith('side')) && f.angles) {
        const taken = new Set(angleFacts.map((x) => x.key));
        f.angles.forEach((deg, k) => {
          if (models.length || taken.has(`angle${k}`) || angleClass(deg) !== 'right') return;
          const assumed = `the corner at ${V[k]} measures ${Math.round(deg)}°, right within ±${RIGHT_ANGLE_TOLERANCE}° (measure.ts) — a reading, not a fact`;
          const hyp: Fact = { i: -1, key: `angle${k}`, iv: point(90), q: { lo: 90, hi: 90, unit: null, dim: 0, approx: false }, text: '90°', shown: '90', group: `assumed:${k}`, fixed: true, assumed, ids: [] };
          models = triangleModels([...facts, hyp]);
        });
      }
    }
  } else if (f.kind === 'rectangle') {
    const pair = rectanglePairs(f);
    const w = f.sides.find((s) => s.key === pair.width[0])!.length, h = f.sides.find((s) => s.key === pair.height[0])!.length;
    models = rectangleModels(facts, w >= h);
  } else if (f.kind === 'circle') models = circleModels(facts);
  else if (f.kind === 'arc') models = arcModels(f, facts);
  else models = sideModels(f, facts);

  // Which labels hold together: every model's kept set; a set inside another's is not a reading of its own.
  const checked = models.map((m) => {
    const c = check(m, facts, unit);
    c.ink = inkDistance(f, m);
    return c;
  });
  // The same labels kept are one reading — unless they make two triangles (SSA), which are two.
  const sig = (c: Checked) => c.kept.map((x) => x.i).sort((a, b) => a - b).join(',') + (c.model.assumed ? '?' : '') + (c.model.branch !== undefined ? `#${c.model.branch}` : '');
  const seen = new Map<string, Checked>();
  for (const c of checked) if (!seen.has(sig(c))) seen.set(sig(c), c);
  let distinct = [...seen.values()];
  distinct = distinct.filter((c) => !distinct.some((o) => o !== c && o.kept.length > c.kept.length && c.kept.every((x) => o.kept.includes(x))));
  // Sides only (a line, a quadrilateral): each side stands alone, so one reading takes the first label on every side.
  if ((f.kind === 'quadrilateral' || f.kind === 'polygon') && distinct.length > 1) distinct = mergeSides(distinct);
  distinct.sort((a, b) =>
    b.kept.length - a.kept.length ||
    a.conflicts.length - b.conflicts.length ||
    Number(!!a.model.assumed) - Number(!!b.model.assumed) ||
    a.share - b.share ||
    a.ink - b.ink
  );

  const rightOf = (m: Model): number | null => {
    for (const x of m.basis) if (/^angle\d$/.test(x.key) && Math.abs(x.iv.lo - 90) < TOL && Math.abs(x.iv.hi - 90) < TOL) return Number(x.key.slice(-1));
    return null;
  };
  const readings: SolveReading[] = distinct.map((c) => {
    const right = f.kind === 'triangle' ? rightOf(c.model) : null;
    const values = valuesOf(f, c, unit, right, partLabels);
    const conflicts = c.conflicts.map((x) => conflictOf(f, x, c.model, unit, right));
    const verb = c.model.basis.filter((x) => !x.assumed).length > 1 || /\band\b/.test(c.model.how) ? 'make' : 'makes';
    const made = c.model.makes.map((k) => {
      const v = values.find((x) => x.key === k);
      if (!v) return null;
      const label = right !== null && k.startsWith('side') && oppVertex(Number(k.slice(-1))) !== right && c.model.basis.some((x) => x.key === `side${oppSide(right)}`) ? 'the other leg' : v.label;
      return `${label} ${v.text}`;
    }).filter((x): x is string => !!x);
    const assumes = c.model.assumed ? [c.model.assumed] : undefined;
    const lead = c.model.assumed ? `if the corner at ${V[Number(c.model.basis.find((x) => x.assumed)!.key.slice(-1))]} is right, ` : '';
    const sentence = made.length
      ? `${lead}${c.model.how} ${verb} ${joinAnd(made)}`
      : `${lead}${c.model.basis.map((x) => `${labelOf(f, x.key, right)} ${textOf(x.iv, x.key, unit)}`).join(', ')}, as labelled`;
    return {
      values,
      keeps: c.kept.filter((x) => !x.assumed).map((x) => x.text),
      conflicts,
      ...(assumes ? { assumes } : {}),
      sentence,
      reason: `${sentence}${conflicts.length ? `; ${conflicts.map((x) => x.reason).join('; ')}` : ''}`,
    };
  });

  // Parts that make their whole.
  const checks: string[] = [];
  const top = distinct[0];
  if (top) {
    for (const pc of partChecks) {
      if (!top.kept.includes(pc.fact)) continue;
      const whole = top.kept.find((x) => x !== pc.fact && x.key === pc.fact.key);
      if (whole) checks.push(`${pc.fact.text} make ${textOf(pc.fact.iv, pc.fact.key, unit)} ✓`);
    }
  }

  // What the ink draws right and the labels do not; labels that hold only against a declared corner.
  if (f.kind === 'triangle' && f.angles) {
    const topReading = readings[0];
    if (topReading && !topReading.assumes) {
      f.angles.forEach((deg, k) => {
        if (angleClass(deg) !== 'right' || facts.some((x) => x.key === `angle${k}`)) return;
        const v = topReading.values.find((x) => x.key === `angle${k}`);
        if (v && Math.abs(v.value.lo - 90) >= RIGHT_ANGLE_TOLERANCE) notes.push(`the corner at ${V[k]} measures ${Math.round(deg)}° in the ink; the labels make it ${v.text}`);
      });
    }
    const declared = facts.filter((x) => x.fixed && !x.assumed);
    if (declared.length) {
      const free = triangleModels(facts.filter((x) => !x.fixed)).map((m) => check(m, facts.filter((x) => !x.fixed), unit)).filter((c) => !c.conflicts.length);
      for (const c of free) {
        for (const d of declared) {
          const v = c.model.vals.get(d.key);
          if (v && Math.abs(v.iv.lo - 90) > TOL) {
            const n = c.kept.length;
            notes.push(`the ${n === 3 ? 'three' : n} labels hold together only if the corner at ${V[Number(d.key.slice(-1))]} is ${fmtIv(v.iv)}°, not the right angle its square declares`);
          }
        }
        break;
      }
    }
  }

  // What the labels leave open, from the scale: the ink's.
  const ink: SolvedValue[] = [];
  const scale = options.scale;
  const fixedKeys = new Set(readings[0]?.values.map((v) => v.key) ?? []);
  for (const key of keysOf(f)) {
    if (fixedKeys.has(key)) continue;
    const d = dimOf(key);
    const raw = key === 'sweep' ? inkSweep(f) : inkMeasure(f, inkKeyOf(f, key));
    if (raw === null || !(raw > 0)) continue;
    if (d > 0 && !scale) continue;
    const v = d === 0 ? raw : raw * (scale!.unitsPerCanvasUnit ** d);
    const iv = point(v);
    const text = d === 0 ? `${Math.round(v)}°` : textOf(iv, key, scale!.unit);
    ink.push({
      key,
      label: labelOf(f, key, null),
      value: toQ(iv, scale?.unit ?? unit, d),
      from: 'ink',
      text,
      reason: d === 0 ? `drawn, it measures ${text} — the ink’s, not the thing’s` : `drawn to scale this would be ${text} — the ink’s, not the thing’s (${scale!.reason})`,
    });
  }

  return { figure: f, unit, readings, conflicts: readings[0]?.conflicts ?? [], checks, ink, notes };
}

function joinAnd(xs: string[]): string {
  return xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

function inkSweep(f: Figure): number | null {
  if (f.kind !== 'arc' || !f.radius) return null;
  const chord = f.sides.find((s) => s.key === 'chord')?.length ?? 0;
  const s = (2 * Math.asin(Math.min(1, chord / (2 * f.radius)))) / DEG;
  return (f.rise ?? 0) > f.radius ? 360 - s : s;
}

/** Every value a figure of this kind has, in the order people read them. */
function keysOf(f: Figure): string[] {
  switch (f.kind) {
    case 'triangle':
      return ['side0', 'side1', 'side2', 'angle0', 'angle1', 'angle2', 'area', 'perimeter'];
    case 'rectangle':
      return ['width', 'height', 'diagonal', 'area', 'perimeter'];
    case 'circle':
      return ['radius', 'diameter', 'circumference', 'area'];
    case 'arc':
      return ['chord', 'rise', 'radius', 'sweep', 'arc'];
    default:
      return f.sides.map((s) => s.key);
  }
}

function valuesOf(f: Figure, c: Checked, unit: LengthUnit | null, right: number | null, parts: ReadonlyMap<string, PartLabel>): SolvedValue[] {
  const out: SolvedValue[] = [];
  const keys = keysOf(f);
  const all = [...keys, ...[...c.model.vals.keys()].filter((k) => !keys.includes(k))];
  for (const key of all) {
    const v = c.model.vals.get(key);
    if (!v) continue;
    const approx = !!v.fact?.q.approx;
    const labelled = v.from === 'labelled' || v.from === 'declared' || v.from === 'assumed';
    const value = labelled && v.fact && !v.fact.parts ? { ...v.fact.q, ...(dimOf(key) === 0 ? { unit: null, dim: 0 } : {}) } : toQ(v.iv, unit, dimOf(key), approx);
    const text = labelled && v.fact && !v.fact.parts && dimOf(key) > 0 && v.fact.q.unit === unit ? formatQuantity(v.fact.q) : textOf(v.iv, key, unit, approx);
    const label = labelOf(f, key, right);
    const formula = v.formula ? bracketRanges(v.formula) : undefined;
    const reason =
      v.from === 'derived'
        ? `${label} ${text}${formula ? ` = ${formula}` : ''}`
        : v.from === 'declared'
          ? `${label} is right: a square in the corner declares it`
          : v.from === 'assumed'
            ? v.fact?.assumed ?? `${label}, assumed`
            : `${label} ${text}, as labelled`;
    out.push({ key, label, value, from: v.from, ...(formula && v.from === 'derived' ? { formula } : {}), text, reason });
  }
  // Parts along an edge: each labelled one as written, and one left unlabelled is the whole less the others.
  for (const side of f.sides) {
    if (!side.parts?.length) continue;
    const whole = c.model.vals.get(f.kind === 'rectangle' ? (rectanglePairs(f).width.includes(side.key) ? 'width' : 'height') : side.key);
    const written = side.parts.map((p) => parts.get(p.key));
    side.parts.forEach((p, i) => {
      const w = written[i];
      if (w) out.push({ key: p.key, label: p.label, value: w.q, from: 'labelled', text: formatQuantity(w.q), reason: `${p.label} ${formatQuantity(w.q)}, as labelled` });
    });
    const open = side.parts.filter((_, i) => !written[i]);
    if (!whole || open.length !== 1) continue;
    const known = written.filter((w): w is PartLabel => !!w);
    const lo = whole.iv.lo - known.reduce((a, w) => a + w.q.hi, 0);
    const hi = whole.iv.hi - known.reduce((a, w) => a + w.q.lo, 0);
    if (!(hi > TOL)) continue;
    const iv = { lo: Math.max(0, lo), hi };
    const text = textOf(iv, side.key, unit);
    const formula = bracketRanges([fmtIv(whole.iv), ...known.map((w) => formatQuantity({ ...w.q, unit: null, dim: 0 }))].join(' − '));
    out.push({ key: open[0].key, label: open[0].label, value: toQ(iv, unit, 1), from: 'derived', formula, text, reason: `${open[0].label} ${text} = ${formula}` });
  }
  return out;
}

/** A line's or a quadrilateral's sides stand alone: one reading takes the first label that holds on each. */
function mergeSides(readings: Checked[]): Checked[] {
  const bySide = new Map<string, Checked[]>();
  for (const r of readings) {
    const key = r.model.basis[0].key;
    (bySide.get(key) ?? bySide.set(key, []).get(key)!).push(r);
  }
  const vals = new Map<string, Val>();
  const basis: Fact[] = [];
  const kept: Fact[] = [];
  const conflicts: Miss[] = [];
  let share = 0;
  for (const rs of bySide.values()) {
    rs.sort((a, b) => b.kept.length - a.kept.length || a.share - b.share);
    const best = rs[0];
    for (const [k, v] of best.model.vals) vals.set(k, v);
    basis.push(...best.model.basis);
    kept.push(...best.kept);
    // Each side's conflict is set against that side's own label, not against every side at once.
    conflicts.push(...best.conflicts.map((c) => ({ ...c, against: best.model })));
    share += best.share;
  }
  const how = basis.map((x) => (x.parts ? x.text : `${x.shown}`)).join(', ');
  return [{ model: { basis, vals, how, makes: [] }, kept, conflicts, share, ink: 0 }];
}

// ===== The board =====

export interface FigureMaths {
  figure: Figure;
  labels: FigureLabel[];
  drawing: Drawing | null;
  solution: Solution;
}

export interface BoardMaths {
  dimensions: BoardDimensions;
  /** Every figure on the board, labelled or not, each solved on its own. */
  figures: FigureMaths[];
}

export interface SolveBoardOptions {
  /** The unit a bare number takes where its drawing writes none. Unset: the page's (`readSheet(sheetLines(…)).unit`). */
  unit?: LengthUnit | null;
  /** Figures read some other way — lines whose ends meet (E3). */
  figures?: readonly Figure[];
}

/**
 * The board's maths: every number placed, every figure solved on its own, in
 * the unit its drawing speaks — the one its labels write, else the page's.
 * Reads the session and changes nothing in it.
 */
export function solveBoard(state: SessionState, options: SolveBoardOptions = {}): BoardMaths {
  const unit = options.unit !== undefined ? options.unit : (except: ReadonlySet<string>) => readSheet(sheetLines(state, { except })).unit;
  const dimensions = dimensionsOf(state, { unit, ...(options.figures ? { figures: options.figures } : {}) });
  const figures = dimensions.figures.map((figure) => {
    const labels = dimensions.labels.get(figure.id) ?? [];
    const drawing = dimensions.drawings.find((d) => d.figures.includes(figure.id)) ?? null;
    const solution = solveFigure(figure, labels, { unit: drawing?.unit ?? null, scale: drawing?.scale ?? null });
    return { figure, labels, drawing, solution };
  });
  return { dimensions, figures };
}

/** A solution in a few lines, for a status line, a panel or a brief. */
export function describeSolution(sol: Solution): string {
  const lines: string[] = [];
  const [top, ...rest] = sol.readings;
  if (top) {
    lines.push(top.sentence);
    for (const v of top.values) if (v.from === 'derived') lines.push(`${v.label} ${v.text}${v.formula ? ` = ${v.formula}` : ''}`);
    for (const c of top.conflicts) lines.push(c.reason);
  }
  for (const r of rest) lines.push(`or ${r.sentence}`);
  lines.push(...sol.checks);
  for (const v of sol.ink) lines.push(`${v.label} ${v.text} (the ink’s)`);
  lines.push(...sol.notes);
  return lines.join('\n');
}

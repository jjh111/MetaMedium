// True size — a solved figure drawn at its real size (MATHS-PLAN.md §3 rule 6
// and §4 "draw it to scale"; V1-PLAN.md phase 4, M7).
//
// A sketch is not to scale; its labels are the truth about the thing (rule 2).
// So a drawing at true size is a NEW DOCUMENT built from the numbers the
// solver derived — the ink is never moved and never traced — and it is an SVG
// whose root is paper: `width="24.5in"` with a viewBox in the drawing's unit,
// so a browser or a printer at 100% draws 24″ as twenty-four inches. Its rules:
//
//   - **Drawn by the solved measures, never by the ink.** A triangle whose
//     legs are 24″ and 8″ is drawn exactly so wherever the hand's ink
//     wandered. The ink supplies only which side is which — the solver keys
//     its values by the ink's sides — and which way round the corners go.
//   - **Squared to the page.** Where a figure faces on paper is not one of its
//     measures, so the side the ink draws nearest level or plumb is laid
//     exactly so, and the rest follows from the numbers.
//   - **The first reading, said.** Labels that conflict are drawn from the
//     reading the solver ranks first; the title says so, and the side whose
//     label cannot hold carries what was written on it. A figure its labels do
//     not fix — a quadrilateral's sides alone, a rectangle with one side, a
//     range not yet chosen, a number with no unit — is left out and listed.
//   - **Numbers as the person wrote them.** A label is set as it was written
//     (24″, 7.5″, 4⅛″); a derived length a place finer than the finest label
//     on its figure — whole inches make tenths, tenths hundredths, eighths
//     sixteenths — so it agrees with a ruler laid on the line and claims no
//     more than was written. Coordinates are not rounded to that: rounding a
//     corner to the inch would move it half an inch. They are written to a
//     fixed resolution finer than a printer's dot (`COORD_PLACES`), so the
//     same figures give the same bytes.
//   - **Figures stand apart**, in a row in the order the ink reads left to
//     right, because they were solved apart — one figure at a time, never two
//     together (solve.ts).
//
// Tier 1 and pure: it reads solutions and returns a string. Nothing it
// computes enters the log.

import type { Bounds, Point } from '../types';
import type { Figure, FigureKind, FigureLabel } from './dimension';
import { readNumber } from './dimension';
import type { BoardMaths, Conflict, FigureMaths, Solution, SolveReading, SolvedFrom, SolvedValue } from './solve';
import type { LengthUnit, Quantity } from './quantity';
import { formatNumber, formatQuantity, isRange, quantity, unitSuffix } from './quantity';
import { FONT_FAMILY, esc, expandBounds, fmt, systemOf, textWidth, unionBounds, unitFactor, wrap } from './svg';

// ===== What it returns =====

export interface TrueSizeOptions {
  /** The document's unit. Unset: the unit most of its figures speak; a figure in another converts, and says so. */
  unit?: LengthUnit;
  /** A name for a figure, by id — the name the person gave it. Unset: its kind, numbered when there are several. */
  names?: Readonly<Record<string, string>>;
}

export interface TrueSizeSide {
  /** Which of the ink's sides it is: 'side0' …; 'length'; 'chord', 'rise'; 'radius', 'diameter'. */
  key: string;
  /** For people: 'the long side', 'the width', 'the chord'. */
  label: string;
  /** In the document's coordinates and unit. */
  from: Point;
  to: Point;
  length: number;
  /** Its value as written on it — the label as the person wrote it, or the derived value to their precision — in the figure's own unit. */
  text: string;
  source: SolvedFrom;
}

export interface TrueSizeFigure {
  id: string;
  ids: string[];
  kind: FigureKind;
  name: string;
  /** The unit its labels speak; the document converts when it speaks another. */
  unit: LengthUnit;
  /** Corners (a line's ends; an arc's ends then its bulge; a circle's centre), in the document's coordinates. */
  vertices: Point[];
  sides: TrueSizeSide[];
  centre?: Point;
  radius?: number;
  /** The outline's bounds; and, with its labels and its name, the box it stands in. */
  bounds: Bounds;
  box: Bounds;
  /** How finely its labels were written: 1 for 24, 0.1 for 7.5, 0.125 for 4⅛. */
  precision: number;
  /** The reading drawn — the solver's first — and how many readings it found. */
  reading: SolveReading;
  readings: number;
  /** The labels that cannot hold in the reading drawn. */
  conflicts: Conflict[];
  notes: string[];
}

export interface TrueSizeOmission {
  id: string;
  ids: string[];
  kind: FigureKind;
  name: string;
  /** Whether it carries numbers. A mark with none is only counted in the notes. */
  labelled: boolean;
  reason: string;
}

export interface TrueSize {
  /** The document: its root's width and height are paper (in, cm or mm), its viewBox is in `unit`. */
  svg: string;
  unit: LengthUnit;
  /** In `unit`, exactly as written on the root. */
  width: number;
  height: number;
  title: string;
  notes: string[];
  figures: TrueSizeFigure[];
  omitted: TrueSizeOmission[];
  /**
   * What a print covers (print.ts): the figures with their labels and names,
   * as markup in the document's coordinates with no ids, and the region they
   * stand in — empty when nothing is drawn. The title and the scale bar are
   * the document's; on paper, every page carries its own test square.
   */
  print: { markup: string; region: Bounds };
}

/** Anything solved: the board's maths, or figures solved one by one. */
export type SolvedFigures = BoardMaths | readonly (FigureMaths | Solution)[];

// ===== The paper's furniture =====

/** Sizes of everything that is not a figure: inches for an imperial drawing, millimetres for a metric one. */
interface Furniture {
  /** Around the document. */
  margin: number;
  /** Between figures in the row. */
  gap: number;
  /** Between the title, the figures and the scale bar. */
  block: number;
  /** Type: a side's label, the title, the notes, a figure's name. */
  label: number;
  title: number;
  note: number;
  caption: number;
  /** The outline, and dimension lines, ticks and the scale bar. */
  stroke: number;
  thin: number;
  /** From a side to its label. */
  labelGap: number;
  /** A right angle's square. */
  corner: number;
  /** The narrowest document: room for a title and the scale bar. */
  minWidth: number;
}

const IMPERIAL: Furniture = { margin: 0.25, gap: 1, block: 0.3, label: 0.16, title: 0.2, note: 0.12, caption: 0.14, stroke: 0.02, thin: 0.01, labelGap: 0.1, corner: 0.15, minWidth: 6.5 };
const METRIC: Furniture = { margin: 6, gap: 25, block: 8, label: 4, title: 5, note: 3, caption: 3.5, stroke: 0.5, thin: 0.25, labelGap: 2.5, corner: 4, minWidth: 160 };

function furniture(unit: LengthUnit): Furniture {
  const imperial = systemOf(unit) === 'imperial';
  const k = unitFactor(imperial ? 'in' : 'mm', unit);
  const base = imperial ? IMPERIAL : METRIC;
  const out = {} as Furniture;
  for (const key of Object.keys(base) as (keyof Furniture)[]) out[key] = base[key] * k;
  return out;
}

/**
 * Decimals a coordinate is written to in each unit: a thousandth of an inch
 * is 0.025 mm, and every entry is as fine or finer — under the 0.042 mm dot
 * of a 600 dpi printer — so rounding never moves a line a printer could show.
 */
export const COORD_PLACES: Readonly<Record<LengthUnit, number>> = { in: 3, ft: 4, cm: 3, mm: 2, m: 5 };

/** A root's width is paper: CSS has in, cm and mm, so feet are written in inches and metres in centimetres. */
const PAPER: Record<LengthUnit, { css: 'in' | 'cm' | 'mm'; per: number }> = {
  in: { css: 'in', per: 1 },
  ft: { css: 'in', per: 12 },
  cm: { css: 'cm', per: 1 },
  mm: { css: 'mm', per: 1 },
  m: { css: 'cm', per: 100 },
};

const UNIT_WORDS: Record<LengthUnit, string> = { in: 'inches', ft: 'feet', cm: 'centimetres', mm: 'millimetres', m: 'metres' };

/** The scale bar: how long, a tick at every step, a number at every `every`th. */
const SCALE_BAR: Record<LengthUnit, { length: number; step: number; every: number }> = {
  in: { length: 6, step: 1, every: 1 },
  ft: { length: 1, step: 1 / 12, every: 12 },
  cm: { length: 10, step: 1, every: 5 },
  mm: { length: 100, step: 10, every: 5 },
  m: { length: 0.1, step: 0.01, every: 5 },
};

// ===== Numbers, as the person wrote them =====

/** How finely a number was written: its precision, else what its value needs — 24 is 1, 7.5 is 0.1 — to a thousandth. */
function precisionOf(q: Quantity): number {
  if (q.precision && q.precision > 0) return q.precision;
  for (let d = 0; d <= 3; d++) {
    const f = 10 ** d;
    const whole = (v: number) => Math.abs(v * f - Math.round(v * f)) < 1e-9 * Math.max(1, Math.abs(v * f));
    if (whole(q.lo) && whole(q.hi)) return 1 / f;
  }
  return 0.001;
}

/** A place finer than `p`: eighths make sixteenths, whole units tenths, tenths hundredths. */
function finer(p: number): { fractions: number } | { places: number } {
  const den = Math.round(1 / p);
  if (p < 1 && [2, 4, 8, 16, 32].includes(den) && Math.abs(1 / p - den) < 1e-9) return { fractions: den * 2 };
  return { places: Math.max(0, Math.round(-Math.log10(p))) + 1 };
}

/** A derived number a place finer than the person wrote: 25.3 beside 24 and 8; 4⅞ beside 4⅛ and 2⅝. */
function derivedNumber(v: number, p: number): string {
  const form = finer(p);
  if ('fractions' in form) return formatQuantity(quantity(Math.round(v * form.fractions) / form.fractions), { fractions: form.fractions });
  return formatNumber(v, form.places);
}

function derivedText(q: Quantity, p: number, unit: LengthUnit | null): string {
  const body = isRange(q) ? `${derivedNumber(q.lo, p)}–${derivedNumber(q.hi, p)}` : derivedNumber(q.lo, p);
  return (q.approx ? '~' : '') + body + unitSuffix(unit, q.dim || 1);
}

/** A value as it stands on paper: a label as written, anything derived a place finer than the labels. */
function valueText(v: SolvedValue, p: number, unit: LengthUnit): string {
  if (v.from === 'labelled' && v.value.precision !== undefined && v.value.unit === unit) return formatQuantity(v.value);
  return derivedText(v.value, p, unit);
}

/** The figure's precision: the finest of the lengths labelled on it, else of anything labelled on it. */
function figurePrecision(reading: SolveReading): number {
  const labelled = reading.values.filter((v) => v.from === 'labelled');
  const lengths = labelled.filter((v) => v.value.dim === 1);
  const ps = (lengths.length ? lengths : labelled).map((v) => precisionOf(v.value));
  return ps.length ? Math.min(...ps) : 1;
}

// ===== Geometry =====

const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a: Point, k: number): Point => ({ x: a.x * k, y: a.y * k });
const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const norm = (a: Point): number => Math.hypot(a.x, a.y);
const unit = (a: Point): Point => mul(a, 1 / (norm(a) || 1));
const cross = (a: Point, b: Point): number => a.x * b.y - a.y * b.x;
const DEG = 180 / Math.PI;

/** The four directions a side may be laid along, at 0°, 90°, 180° and 270° (the canvas's y runs down). */
const AXES: readonly Point[] = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }];

/** The axis nearest a side's heading, and how far off it the ink draws it (radians). */
function nearestAxis(from: Point, to: Point): { axis: number; off: number } {
  const t = Math.atan2(to.y - from.y, to.x - from.x);
  const k = Math.round(t / (Math.PI / 2));
  return { axis: ((k % 4) + 4) % 4, off: Math.abs(t - (k * Math.PI) / 2) };
}

/** A quarter turn, the way the corners go: positive is the way a positive signed area turns. */
const turn = (d: Point, s: number): Point => (s > 0 ? { x: -d.y, y: d.x } : { x: d.y, y: -d.x });

/** Away from the figure's inside, for a side running along `d` round a figure that turns `s`. */
const outward = (d: Point, s: number): Point => (s > 0 ? { x: d.y, y: -d.x } : { x: -d.y, y: d.x });

function signedArea(v: readonly Point[]): number {
  let a = 0;
  for (let i = 0; i < v.length; i++) a += cross(v[i], v[(i + 1) % v.length]);
  return a / 2;
}

/** An angle for text along a side, turned so it never reads upside down: in [−90°, 90°). */
function readable(deg: number): number {
  return ((((deg + 90) % 180) + 180) % 180) - 90;
}

/**
 * The side a polygon stands on: the one the ink draws nearest level or plumb,
 * level before plumb when they tie, then the first. Laying it exactly so is a
 * choice of where the figure faces, never of its size.
 */
function baseSide(v: readonly Point[]): number {
  let best = 0;
  let bestOff = Infinity, bestLevel = false;
  for (let k = 0; k < v.length; k++) {
    const { axis, off } = nearestAxis(v[k], v[(k + 1) % v.length]);
    const level = axis % 2 === 0;
    if (off < bestOff - 1e-9 || (Math.abs(off - bestOff) <= 1e-9 && level && !bestLevel)) {
      best = k;
      bestOff = off;
      bestLevel = level;
    }
  }
  return best;
}

/** A rectangle's width is the pair of sides the ink draws level — solve.ts's `rectanglePairs`, read the same way. */
function widthPair(f: Figure): number[] {
  const horizontal = (k: number) => Math.abs(f.sides[k].to.x - f.sides[k].from.x) >= Math.abs(f.sides[k].to.y - f.sides[k].from.y);
  const evenWide = horizontal(0) || (!horizontal(1) && f.sides[0].length >= f.sides[1].length);
  return evenWide ? [0, 2] : [1, 3];
}

// ===== Shapes, before they are placed =====

/** A thin line that is not the outline: a tick, a right angle's square, a dashed radius, chord or rise. */
interface Mark {
  points: Point[];
  closed?: boolean;
  dashed?: boolean;
}

interface Text {
  text: string;
  /** The centre of the text, for 'middle'; its start, for 'start'. */
  at: Point;
  angle: number;
  size: number;
  anchor: 'middle' | 'start';
  /** The measure it states: 'side0', 'width', 'radius' … */
  key?: string;
  caption?: boolean;
}

type Outline =
  | { type: 'polygon'; points: Point[] }
  | { type: 'circle'; centre: Point; r: number }
  | { type: 'arc'; from: Point; to: Point; r: number; large: 0 | 1; sweep: 0 | 1; samples: Point[] }
  | { type: 'line'; from: Point; to: Point };

interface Shape {
  outline: Outline;
  vertices: Point[];
  sides: TrueSizeSide[];
  marks: Mark[];
  texts: Text[];
  centre?: Point;
  radius?: number;
}

interface Ctx {
  fig: Figure;
  vals: Map<string, SolvedValue>;
  /** Figure unit to document unit. */
  f: number;
  F: Furniture;
  precision: number;
  unit: LengthUnit;
  conflicts: Map<string, Conflict>;
  labels: readonly FigureLabel[] | null;
  reading: SolveReading;
}

function lengthOf(c: Ctx, key: string): number {
  return c.vals.get(key)!.value.lo * c.f;
}

function sideTextOf(c: Ctx, key: string): string {
  return valueText(c.vals.get(key)!, c.precision, c.unit);
}

/** What stands on a side: its value, and what was written there when that cannot hold. */
function drawnText(c: Ctx, key: string): string {
  const conflict = c.conflicts.get(key);
  return sideTextOf(c, key) + (conflict ? ` (labelled ${conflict.text})` : '');
}

/** A label along a side, outside it: `tier` 2 stands beyond a first row of part labels. */
function alongSide(c: Ctx, text: string, from: Point, to: Point, n: Point, tier: number, key: string): Text {
  const F = c.F;
  const d = sub(to, from);
  const off = F.labelGap + 0.6 * F.label + (tier - 1) * (1.2 * F.label + F.labelGap);
  return { text, at: add(mid(from, to), mul(n, off)), angle: readable(Math.atan2(d.y, d.x) * DEG), size: F.label, anchor: 'middle', key };
}

/**
 * A polygon's sides, the labels on those that carry one, and — where every
 * part of a side has a value that sums to it — the ticks where other marks
 * divided it and each part's value.
 */
function polygonShape(
  c: Ctx,
  v: Point[],
  s: number,
  side: (k: number) => { key: string; label: string; show: boolean }
): Shape {
  const marks: Mark[] = [];
  const texts: Text[] = [];
  const sides: TrueSizeSide[] = [];
  const n = v.length;
  for (let k = 0; k < n; k++) {
    const a = v[k], b = v[(k + 1) % n];
    const info = side(k);
    const value = c.vals.get(info.key)!;
    const L = norm(sub(b, a));
    sides.push({ key: `side${k}`, label: info.label, from: a, to: b, length: L, text: sideTextOf(c, info.key), source: value.from });
    const d = unit(sub(b, a));
    const out = outward(d, s);
    // Parts along it, when their values make the whole.
    const parts = c.fig.sides[k]?.parts ?? [];
    const pv = parts.map((p) => c.vals.get(p.key));
    const pl = pv.map((x) => (x && !isRange(x.value) && x.value.lo > 0 ? x.value.lo * c.f : NaN));
    const partsHold = parts.length > 0 && pl.every((x) => x > 0) && Math.abs(pl.reduce((t, x) => t + x, 0) - L) <= 1e-6 * Math.max(1, L);
    if (partsHold) {
      let t = 0;
      pl.forEach((len, i) => {
        const p0 = add(a, mul(d, t)), p1 = add(a, mul(d, t + len));
        texts.push(alongSide(c, valueText(pv[i]!, c.precision, c.unit), p0, p1, out, 1, parts[i].key));
        t += len;
        if (i < pl.length - 1) marks.push({ points: [add(p1, mul(out, -c.F.labelGap)), add(p1, mul(out, c.F.labelGap))] });
      });
    }
    if (info.show) texts.push(alongSide(c, drawnText(c, info.key), a, b, out, partsHold ? 2 : 1, info.key));
  }
  return { outline: { type: 'polygon', points: v }, vertices: v, sides, marks, texts };
}

function triangleShape(c: Ctx): Shape {
  const L = [0, 1, 2].map((k) => lengthOf(c, `side${k}`));
  const ink = c.fig.vertices.slice(0, 3);
  const s = Math.sign(signedArea(ink)) || 1;
  const b = baseSide(ink);
  const u = AXES[nearestAxis(ink[b], ink[(b + 1) % 3]).axis];
  const w = turn(u, 1);
  // The base laid along its axis; the far corner from the other two sides, on the side the ink turns.
  const [Lb, La, Lc] = [L[b], L[(b + 1) % 3], L[(b + 2) % 3]];
  const x = (Lb * Lb + Lc * Lc - La * La) / (2 * Lb);
  const y = Math.sqrt(Math.max(0, Lc * Lc - x * x));
  const v: Point[] = [];
  v[b] = { x: 0, y: 0 };
  v[(b + 1) % 3] = mul(u, Lb);
  v[(b + 2) % 3] = add(mul(u, x), mul(w, s * y));
  const shape = polygonShape(c, v, s, (k) => ({ key: `side${k}`, label: c.vals.get(`side${k}`)!.label, show: true }));
  // A right angle, declared or derived, is marked with its square.
  for (let k = 0; k < 3; k++) {
    const a = c.vals.get(`angle${k}`)?.value;
    if (!a || Math.abs(a.lo - 90) > 1e-6 || Math.abs(a.hi - 90) > 1e-6) continue;
    const at = v[k], e1 = unit(sub(v[(k + 1) % 3], at)), e2 = unit(sub(v[(k + 2) % 3], at));
    const q = Math.min(c.F.corner, 0.25 * Math.min(L[k], L[(k + 2) % 3]));
    shape.marks.push({ points: [add(at, mul(e1, q)), add(at, add(mul(e1, q), mul(e2, q))), add(at, mul(e2, q))] });
  }
  return shape;
}

function rectangleShape(c: Ctx): Shape {
  const W = lengthOf(c, 'width'), H = lengthOf(c, 'height');
  const ink = c.fig.vertices.slice(0, 4);
  const s = Math.sign(signedArea(ink)) || 1;
  const wide = widthPair(c.fig);
  const d0 = sub(ink[1], ink[0]);
  let d: Point = wide.includes(0) ? { x: d0.x >= 0 ? 1 : -1, y: 0 } : { x: 0, y: d0.y >= 0 ? 1 : -1 };
  const v: Point[] = [{ x: 0, y: 0 }];
  const dirs: Point[] = [];
  for (let k = 0; k < 4; k++) {
    dirs.push(d);
    if (k < 3) v.push(add(v[k], mul(d, wide.includes(k) ? W : H)));
    d = turn(d, s);
  }
  // Each measure once: on the side it was written beside, else the top for the width and the left for the height.
  const written = (pair: number[]) => {
    for (const l of c.labels ?? []) {
      const m = /^side(\d)$/.exec(l.key);
      if (!l.declared && m && pair.includes(Number(m[1]))) return Number(m[1]);
    }
    return -1;
  };
  const facing = (pair: number[], normal: Point) => pair.find((k) => {
    const o = outward(dirs[k], s);
    return o.x === normal.x && o.y === normal.y;
  }) ?? pair[0];
  const tall = [0, 1, 2, 3].filter((k) => !wide.includes(k));
  const wAt = written(wide) >= 0 ? written(wide) : facing(wide, { x: 0, y: -1 });
  const hAt = written(tall) >= 0 ? written(tall) : facing(tall, { x: -1, y: 0 });
  return polygonShape(c, v, s, (k) => {
    const key = wide.includes(k) ? 'width' : 'height';
    return { key, label: c.vals.get(key)!.label, show: k === wAt || k === hAt };
  });
}

/** A circle's other labelled measure, named as it was written: ⌀ 12″, waist 28″, area 50 in². */
function circleNote(c: Ctx): string | null {
  const labelled = c.reading.values.find((v) => v.from === 'labelled' && ['diameter', 'circumference', 'area'].includes(v.key));
  if (!labelled) return null;
  const text = valueText(labelled, c.precision, c.unit);
  if (labelled.key === 'diameter') return `⌀ ${text}`;
  const written = c.labels?.find((l) => l.key === labelled.key && l.name)?.name ?? c.reading.keeps.map((k) => readNumber(k)?.name).find((x) => !!x);
  return `${written ?? (labelled.key === 'area' ? 'area' : 'C')} ${text}`;
}

function circleShape(c: Ctx): Shape {
  const F = c.F;
  const r = lengthOf(c, 'radius');
  const o = { x: 0, y: 0 }, east = { x: r, y: 0 }, west = { x: -r, y: 0 };
  const radius = c.vals.get('radius')!;
  const sides: TrueSizeSide[] = [{ key: 'radius', label: radius.label, from: o, to: east, length: r, text: sideTextOf(c, 'radius'), source: radius.from }];
  const diameter = c.vals.get('diameter');
  if (diameter) sides.push({ key: 'diameter', label: diameter.label, from: west, to: east, length: 2 * r, text: sideTextOf(c, 'diameter'), source: diameter.from });
  // The radius drawn dashed to the rim, and a small cross at the centre.
  const arm = Math.min(F.corner / 2, r / 4);
  const marks: Mark[] = [
    { points: [o, east], dashed: true },
    { points: [{ x: -arm, y: 0 }, { x: arm, y: 0 }] },
    { points: [{ x: 0, y: -arm }, { x: 0, y: arm }] },
  ];
  const texts: Text[] = [{ text: `r ${drawnText(c, 'radius')}`, at: { x: r / 2, y: -(F.labelGap + 0.6 * F.label) }, angle: 0, size: F.label, anchor: 'middle', key: 'radius' }];
  const note = circleNote(c);
  if (note) texts.push({ text: note, at: { x: 0, y: F.labelGap + 1.2 * F.label }, angle: 0, size: F.label, anchor: 'middle', key: 'measure' });
  return { outline: { type: 'circle', centre: o, r }, vertices: [o], sides, marks, texts, centre: o, radius: r };
}

function arcShape(c: Ctx): Shape {
  const F = c.F;
  const chord = lengthOf(c, 'chord'), h = lengthOf(c, 'rise');
  const r = c.vals.has('radius') ? lengthOf(c, 'radius') : (chord * chord) / (8 * h) + h / 2;
  const [a, e, bulge] = c.fig.vertices;
  const u = AXES[nearestAxis(a, e).axis];
  const w = turn(u, 1);
  const sb = Math.sign(cross(sub(e, a), sub(bulge, a))) || 1;
  const A = { x: 0, y: 0 }, C = mul(u, chord), M = mul(u, chord / 2);
  const B = add(M, mul(w, sb * h));
  const O = add(M, mul(w, sb * (h - r)));
  const large: 0 | 1 = h > r ? 1 : 0;
  const sweep: 0 | 1 = cross(sub(A, O), sub(B, O)) > 0 ? 1 : 0;
  // The curve, sampled for its bounds: from A round O through B to C.
  const span = 2 * (Math.atan2(cross(sub(A, O), sub(B, O)), (A.x - O.x) * (B.x - O.x) + (A.y - O.y) * (B.y - O.y)));
  const a0 = Math.atan2(A.y - O.y, A.x - O.x);
  const samples: Point[] = [];
  for (let i = 0; i <= 64; i++) samples.push(add(O, mul({ x: Math.cos(a0 + (span * i) / 64), y: Math.sin(a0 + (span * i) / 64) }, r)));
  const chordV = c.vals.get('chord')!, riseV = c.vals.get('rise')!;
  const sides: TrueSizeSide[] = [
    { key: 'chord', label: chordV.label, from: A, to: C, length: chord, text: sideTextOf(c, 'chord'), source: chordV.from },
    { key: 'rise', label: riseV.label, from: M, to: B, length: h, text: sideTextOf(c, 'rise'), source: riseV.from },
  ];
  // The rise's label beside its line, reading along the chord, wholly to one side of it.
  const riseText = `rise ${drawnText(c, 'rise')}`;
  const along = readable(Math.atan2(u.y, u.x) * DEG);
  const t = { x: Math.round(Math.cos(along / DEG)), y: Math.round(Math.sin(along / DEG)) };
  const texts: Text[] = [
    alongSide(c, drawnText(c, 'chord'), A, C, mul(w, -sb), 1, 'chord'),
    { text: riseText, at: add(add(M, mul(w, (sb * h) / 2)), mul(t, F.labelGap + textWidth(riseText, F.label) / 2)), angle: along, size: F.label, anchor: 'middle', key: 'rise' },
  ];
  return {
    outline: { type: 'arc', from: A, to: C, r, large, sweep, samples },
    vertices: [A, C, B],
    sides,
    marks: [{ points: [A, C], dashed: true }, { points: [M, B], dashed: true }],
    texts,
    centre: O,
    radius: r,
  };
}

function lineShape(c: Ctx): Shape {
  const F = c.F;
  const L = lengthOf(c, 'length');
  const { from, to } = c.fig.sides[0];
  // A line has no inside: level lines run to the right, plumb ones up, and the label stands above or to the left.
  const d: Point = nearestAxis(from, to).axis % 2 === 0 ? { x: 1, y: 0 } : { x: 0, y: -1 };
  const n = { x: d.y, y: -d.x };
  const A = { x: 0, y: 0 }, B = mul(d, L);
  const value = c.vals.get('length')!;
  const tick = (p: Point): Mark => ({ points: [add(p, mul(n, -F.labelGap)), add(p, mul(n, F.labelGap))] });
  return {
    outline: { type: 'line', from: A, to: B },
    vertices: [A, B],
    sides: [{ key: 'length', label: value.label, from: A, to: B, length: L, text: sideTextOf(c, 'length'), source: value.from }],
    marks: [tick(A), tick(B)],
    texts: [alongSide(c, drawnText(c, 'length'), A, B, n, 1, 'length')],
  };
}

// ===== What the labels fix =====

/** The measures a figure of each kind is drawn from. */
const DRAWN_FROM: Partial<Record<FigureKind, string[]>> = {
  triangle: ['side0', 'side1', 'side2'],
  rectangle: ['width', 'height'],
  circle: ['radius'],
  arc: ['chord', 'rise'],
  line: ['length'],
};

function measureWord(f: Figure, key: string): string {
  const side = /^side(\d)$/.exec(key);
  if (side) return f.sides[Number(side[1])]?.label ?? key;
  return `its ${key}`;
}

/** Why a figure cannot be drawn at true size, or null when it can. */
function whyNot(f: Figure, sol: Solution, labelled: boolean): string | null {
  const reading = sol.readings[0];
  if (!labelled) return 'no numbers on it';
  if (f.kind === 'quadrilateral' || f.kind === 'polygon') return 'its sides alone do not fix its shape';
  if (!sol.unit) return 'its numbers have no unit: write one on a label, or on the page';
  if (!reading) return 'its labels do not fix it';
  const keys = DRAWN_FROM[f.kind];
  if (!keys) return 'nothing here draws a figure of this kind';
  for (const key of keys) {
    const v = reading.values.find((x) => x.key === key);
    if (!v) return `nothing fixes ${measureWord(f, key)}`;
    const text = v.from === 'labelled' && v.value.precision !== undefined ? formatQuantity(v.value) : derivedText(v.value, figurePrecision(reading), sol.unit);
    if (isRange(v.value)) return `${v.label} is ${text}, a range: choose one value to draw it`;
    if (!(v.value.lo > 0)) return `${v.label} is ${text}: no size to draw`;
  }
  return null;
}

// ===== The board, in =====

interface Entry {
  figure: Figure;
  solution: Solution;
  labels: readonly FigureLabel[] | null;
}

function entriesOf(solved: SolvedFigures): Entry[] {
  const list: readonly (FigureMaths | Solution)[] = 'dimensions' in solved ? solved.figures : solved;
  return list.map((x) => ('solution' in x ? { figure: x.figure, solution: x.solution, labels: x.labels } : { figure: x.figure, solution: x, labels: null }));
}

function inkBounds(f: Figure): Bounds {
  const pts = f.outline.length ? f.outline : f.vertices;
  return unionBounds(pts.map((p) => ({ minX: p.x, maxX: p.x, minY: p.y, maxY: p.y })));
}

const article = (kind: string) => (/^[aeiou]/.test(kind) ? 'An' : 'A');

// ===== Drawing =====

function textBox(t: Text): Bounds {
  const w = textWidth(t.text, t.size), h = 1.2 * t.size;
  const x0 = t.anchor === 'middle' ? -w / 2 : 0;
  const corners = [{ x: x0, y: -h / 2 }, { x: x0 + w, y: -h / 2 }, { x: x0 + w, y: h / 2 }, { x: x0, y: h / 2 }];
  const a = t.angle / DEG, ca = Math.cos(a), sa = Math.sin(a);
  return unionBounds(corners.map((p) => {
    const q = { x: t.at.x + p.x * ca - p.y * sa, y: t.at.y + p.x * sa + p.y * ca };
    return { minX: q.x, maxX: q.x, minY: q.y, maxY: q.y };
  }));
}

function outlinePoints(o: Outline): Point[] {
  switch (o.type) {
    case 'polygon':
      return o.points;
    case 'circle':
      return [{ x: o.centre.x - o.r, y: o.centre.y - o.r }, { x: o.centre.x + o.r, y: o.centre.y + o.r }];
    case 'arc':
      return o.samples;
    case 'line':
      return [o.from, o.to];
  }
}

const pointBox = (pts: readonly Point[]): Bounds => unionBounds(pts.map((p) => ({ minX: p.x, maxX: p.x, minY: p.y, maxY: p.y })));

function moved(shape: Shape, by: Point): Shape {
  const m = (p: Point) => add(p, by);
  const o = shape.outline;
  const outline: Outline =
    o.type === 'polygon' ? { type: 'polygon', points: o.points.map(m) }
    : o.type === 'circle' ? { ...o, centre: m(o.centre) }
    : o.type === 'arc' ? { ...o, from: m(o.from), to: m(o.to), samples: o.samples.map(m) }
    : { type: 'line', from: m(o.from), to: m(o.to) };
  return {
    outline,
    vertices: shape.vertices.map(m),
    sides: shape.sides.map((s) => ({ ...s, from: m(s.from), to: m(s.to) })),
    marks: shape.marks.map((k) => ({ ...k, points: k.points.map(m) })),
    texts: shape.texts.map((t) => ({ ...t, at: m(t.at) })),
    ...(shape.centre ? { centre: m(shape.centre) } : {}),
    ...(shape.radius !== undefined ? { radius: shape.radius } : {}),
  };
}

/** How this document writes a coordinate, and its furniture. */
interface Writer {
  n: (v: number) => string;
  F: Furniture;
}

function pathOf(w: Writer, points: readonly Point[], closed: boolean): string {
  return points.map((p, i) => `${i ? 'L' : 'M'} ${w.n(p.x)} ${w.n(p.y)}`).join(' ') + (closed ? ' Z' : '');
}

/** A line of text: `at` is its centre (or its start), and its baseline sits a third of its size below, so the letters' middle is there. */
function textEl(w: Writer, t: Text, attrs = ''): string {
  const baseline = t.at.y + 0.35 * t.size;
  const rot = Math.abs(t.angle) > 1e-9 ? ` transform="rotate(${fmt(t.angle, 2)} ${w.n(t.at.x)} ${w.n(t.at.y)})"` : '';
  const anchor = t.anchor === 'middle' ? ' text-anchor="middle"' : '';
  const key = t.key ? ` data-label="${esc(t.key)}"` : '';
  return `<text x="${w.n(t.at.x)}" y="${w.n(baseline)}" font-size="${w.n(t.size)}"${anchor}${rot}${key}${attrs} fill="currentColor" stroke="none">${esc(t.text)}</text>`;
}

function markEl(w: Writer, k: Mark): string {
  const dash = k.dashed ? ` stroke-dasharray="${w.n(w.F.labelGap / 2)} ${w.n(w.F.labelGap / 2)}"` : '';
  return `<path d="${pathOf(w, k.points, !!k.closed)}" stroke-width="${w.n(w.F.thin)}"${dash}/>`;
}

function outlineEl(w: Writer, o: Outline): string {
  switch (o.type) {
    case 'polygon':
      return `<path data-role="outline" d="${pathOf(w, o.points, true)}"/>`;
    case 'circle':
      return `<circle data-role="outline" cx="${w.n(o.centre.x)}" cy="${w.n(o.centre.y)}" r="${w.n(o.r)}"/>`;
    case 'arc':
      return `<path data-role="outline" d="M ${w.n(o.from.x)} ${w.n(o.from.y)} A ${w.n(o.r)} ${w.n(o.r)} 0 ${o.large} ${o.sweep} ${w.n(o.to.x)} ${w.n(o.to.y)}"/>`;
    case 'line':
      return `<path data-role="outline" d="${pathOf(w, [o.from, o.to], false)}"/>`;
  }
}

function styleOf(w: Writer, stroke = w.F.stroke): string {
  return `fill="none" stroke="currentColor" stroke-width="${w.n(stroke)}" stroke-linecap="round" stroke-linejoin="round" font-family="${FONT_FAMILY}"`;
}

// ===== True size =====

/**
 * Solved figures drawn at their real size, as one SVG document in the
 * drawing's unit: each by its solved measures in the order the ink reads, its
 * values set on its sides, a scale bar, and a short title that says what was
 * drawn, from which reading, and what was left out. Pure: the same figures
 * give the same bytes, and nothing is written anywhere.
 */
export function trueSize(solved: SolvedFigures, options: TrueSizeOptions = {}): TrueSize {
  const entries = entriesOf(solved)
    .map((e) => ({ e, b: inkBounds(e.figure) }))
    .sort((p, q) => p.b.minX - q.b.minX || p.b.minY - q.b.minY || (p.e.figure.id < q.e.figure.id ? -1 : p.e.figure.id > q.e.figure.id ? 1 : 0))
    .map((x) => x.e);

  // Names: the person's, else the kind, numbered when there are several of it.
  const count = new Map<FigureKind, number>();
  for (const e of entries) count.set(e.figure.kind, (count.get(e.figure.kind) ?? 0) + 1);
  const seen = new Map<FigureKind, number>();
  const nameOf = new Map<string, string>();
  for (const e of entries) {
    const k = e.figure.kind;
    const i = (seen.get(k) ?? 0) + 1;
    seen.set(k, i);
    nameOf.set(e.figure.id, options.names?.[e.figure.id] ?? ((count.get(k) ?? 0) > 1 ? `${k} ${i}` : k));
  }

  // Which can be drawn, and why not.
  const drawable: Entry[] = [];
  const omitted: TrueSizeOmission[] = [];
  for (const e of entries) {
    const labelled = e.labels ? e.labels.some((l) => !l.declared) : true;
    const why = whyNot(e.figure, e.solution, labelled);
    if (why) omitted.push({ id: e.figure.id, ids: [...e.figure.ids], kind: e.figure.kind, name: nameOf.get(e.figure.id)!, labelled, reason: why });
    else drawable.push(e);
  }

  // The document's unit: the one asked for, else the one most figures speak.
  const units = new Map<LengthUnit, number>();
  for (const e of drawable) units.set(e.solution.unit!, (units.get(e.solution.unit!) ?? 0) + 1);
  let docUnit: LengthUnit | undefined = options.unit;
  if (!docUnit) for (const [u, n] of units) if (!docUnit || n > units.get(docUnit)!) docUnit = u;
  docUnit ??= entries.map((e) => e.solution.unit).find((u): u is LengthUnit => !!u) ?? 'in';
  const U = docUnit;
  const F = furniture(U);
  const places = COORD_PLACES[U];
  const w: Writer = { n: (v) => fmt(v, places), F };

  // Each figure built at the origin, then its box: the outline, its marks, its labels, and its name below.
  const built = drawable.map((e) => {
    const sol = e.solution;
    const reading = sol.readings[0];
    const figUnit = sol.unit!;
    const precision = figurePrecision(reading);
    const c: Ctx = {
      fig: e.figure,
      vals: new Map(reading.values.map((v) => [v.key, v])),
      f: unitFactor(figUnit, U),
      F,
      precision,
      unit: figUnit,
      conflicts: new Map(sol.conflicts.map((x) => [x.key, x])),
      labels: e.labels,
      reading,
    };
    const shape =
      e.figure.kind === 'triangle' ? triangleShape(c)
      : e.figure.kind === 'rectangle' ? rectangleShape(c)
      : e.figure.kind === 'circle' ? circleShape(c)
      : e.figure.kind === 'arc' ? arcShape(c)
      : lineShape(c);
    const name = nameOf.get(e.figure.id)!;
    const drawnBox = unionBounds([
      expandBounds(pointBox(outlinePoints(shape.outline)), F.stroke / 2),
      ...shape.marks.map((k) => expandBounds(pointBox(k.points), F.thin / 2)),
      ...shape.texts.map(textBox),
    ]);
    const caption: Text = { text: name, at: { x: drawnBox.minX, y: drawnBox.maxY + F.labelGap + 0.6 * F.caption }, angle: 0, size: F.caption, anchor: 'start', caption: true };
    shape.texts.push(caption);
    const box = unionBounds([drawnBox, textBox(caption)]);

    // What the figure says about itself.
    const notes: string[] = [];
    const n = sol.readings.length;
    const from = n > 1 ? `from the first of ${n} readings` : 'from its reading';
    const drawnKeys = new Set(shape.sides.map((x) => x.key).concat(DRAWN_FROM[e.figure.kind] ?? []));
    for (const x of sol.conflicts) {
      const made = derivedText(x.derived, precision, figUnit);
      notes.push(drawnKeys.has(x.key)
        ? `the ${name}: ${x.label} is labelled ${x.text}, which cannot hold; drawn ${made}, ${from}`
        : `the ${name}: ${x.label} is labelled ${x.text}, which cannot hold; the first of ${n} readings makes it ${made}`);
    }
    if (!sol.conflicts.length && n > 1) notes.push(`the ${name}: its labels read ${n} ways; drawn from the first`);
    for (const a of reading.assumes ?? []) {
      const m = /^the corner at ([A-Z]) measures (\d+)°/.exec(a);
      notes.push(m ? `the ${name}: drawn as if the corner at ${m[1]} is right — the ink measures it ${m[2]}°, a reading, not a fact` : `the ${name}: drawn on a reading — ${a}`);
    }
    if (figUnit !== U) notes.push(`the ${name}: labelled in ${UNIT_WORDS[figUnit]}, drawn in ${UNIT_WORDS[U]}`);
    return { e, shape, box, name, notes, precision, figUnit, reading };
  });

  // The title: what, at what, and what was not as simple as that.
  const clauses: string[] = [];
  const one = built.length === 1;
  for (const b of built) {
    const n = b.e.solution.readings.length;
    const who = one ? '' : `the ${b.name} `;
    if (b.e.solution.conflicts.length) clauses.push(`${who}drawn from the first of ${n} readings: its labels conflict`);
    else if (n > 1) clauses.push(`${who}drawn from the first of ${n} readings`);
    const assumed = b.reading.assumes?.[0] && /^the corner at ([A-Z])/.exec(b.reading.assumes[0]);
    if (assumed) clauses.push(`${who}drawn as if the corner at ${assumed[1]} is right`);
  }
  const leftOut = omitted.filter((o) => o.labelled);
  const unlabelled = omitted.filter((o) => !o.labelled);
  if (leftOut.length) clauses.push(`${leftOut.length} figure${leftOut.length > 1 ? 's' : ''} left out`);
  const subject = built.length === 0 ? 'Nothing' : one ? `${article(built[0].e.figure.kind)} ${built[0].e.figure.kind}` : `${built.length} figures`;
  const title = `${subject} at true size, in ${UNIT_WORDS[U]}${clauses.length ? ` — ${clauses.join('; ')}` : ''}`;
  const notes = [
    ...built.flatMap((b) => b.notes),
    ...leftOut.map((o) => `left out: the ${o.name} — ${o.reason}`),
    ...(unlabelled.length ? [`left out: ${unlabelled.length} mark${unlabelled.length > 1 ? 's' : ''} with no numbers on ${unlabelled.length > 1 ? 'them' : 'it'}`] : []),
  ];

  // Layout: the title and notes, the figures in a row, the scale bar.
  const bar = SCALE_BAR[U];
  const rowWidth = built.reduce((t, b) => t + (b.box.maxX - b.box.minX), 0) + F.gap * Math.max(0, built.length - 1);
  const textWide = Math.max(rowWidth, F.minWidth, bar.length);
  const heading: Text[] = [];
  let y = F.margin;
  const titleLines = wrap(title, textWide, F.title);
  for (const line of titleLines) {
    heading.push({ text: line, at: { x: F.margin, y: y + 0.6 * F.title }, angle: 0, size: F.title, anchor: 'start' });
    y += 1.35 * F.title;
  }
  for (const note of notes) {
    for (const line of wrap(note, textWide, F.note)) {
      heading.push({ text: line, at: { x: F.margin, y: y + 0.6 * F.note }, angle: 0, size: F.note, anchor: 'start' });
      y += 1.35 * F.note;
    }
  }
  const top = y + F.block;
  let x = F.margin;
  const placed = built.map((b) => {
    const by = { x: x - b.box.minX, y: top - b.box.minY };
    x += b.box.maxX - b.box.minX + F.gap;
    const shape = moved(b.shape, by);
    const box = { minX: b.box.minX + by.x, maxX: b.box.maxX + by.x, minY: b.box.minY + by.y, maxY: b.box.maxY + by.y };
    return { ...b, shape, box };
  });
  const bottom = placed.length ? Math.max(...placed.map((p) => p.box.maxY)) : y;
  // What a print covers, rounded outward to what is written.
  const q = 10 ** places;
  const pad = placed.length ? expandBounds(unionBounds(placed.map((p) => p.box)), F.labelGap) : null;
  const region = pad
    ? { minX: Math.floor(pad.minX * q + 1e-6) / q, maxX: Math.ceil(pad.maxX * q - 1e-6) / q, minY: Math.floor(pad.minY * q + 1e-6) / q, maxY: Math.ceil(pad.maxY * q - 1e-6) / q }
    : { minX: 0, maxX: 0, minY: 0, maxY: 0 };

  // The scale bar: alternate steps filled, a tick at each, a number at every few.
  const barTop = bottom + F.block;
  const barH = F.labelGap;
  const steps = Math.round(bar.length / bar.step);
  const barParts: string[] = [];
  barParts.push(`<rect x="${w.n(F.margin)}" y="${w.n(barTop)}" width="${w.n(bar.length)}" height="${w.n(barH)}"/>`);
  for (let i = 0; i < steps; i += 2) {
    barParts.push(`<rect x="${w.n(F.margin + i * bar.step)}" y="${w.n(barTop)}" width="${w.n(bar.step)}" height="${w.n(barH)}" fill="currentColor" stroke="none"/>`);
  }
  const barName = `${formatNumber(bar.length, 4)} ${U}`;
  for (let i = 0; i <= steps; i += bar.every) {
    const label = i === steps ? barName : formatNumber(i * bar.step, 4);
    const at = { x: F.margin + i * bar.step, y: barTop + barH + F.labelGap + 0.6 * F.note };
    barParts.push(textEl(w, { text: label, at, angle: 0, size: F.note, anchor: i === 0 ? 'start' : 'middle' }));
  }
  const barBottom = barTop + barH + F.labelGap + 1.2 * F.note;
  const barRight = F.margin + bar.length + textWidth(barName, F.note) / 2;

  // The document's size, rounded up to what is written so nothing is cut.
  const up = (v: number) => Math.ceil(v * q - 1e-6) / q;
  const width = up(Math.max(x - F.gap + F.margin, F.margin + textWide + F.margin, barRight + F.margin));
  const height = up(barBottom + F.margin);

  // The markup.
  const figureEls = placed.map((p) => {
    const lines = [`<g data-figure="${esc(p.e.figure.id)}" data-kind="${p.e.figure.kind}" data-name="${esc(p.name)}">`, outlineEl(w, p.shape.outline)];
    for (const k of p.shape.marks) lines.push(markEl(w, k));
    for (const t of p.shape.texts) lines.push(textEl(w, t, t.caption ? ' data-caption="1"' : ''));
    lines.push('</g>');
    return lines.join('\n');
  });
  const piecesMarkup = placed.length ? `<g ${styleOf(w)}>\n${figureEls.join('\n')}\n</g>` : '';
  const titleMarkup = `<g data-title="1" ${styleOf(w)}>\n${heading.map((t, i) => textEl(w, t, i < titleLines.length ? ' font-weight="600"' : '')).join('\n')}\n</g>`;
  const barMarkup = `<g data-scale-bar="${barName}" ${styleOf(w, F.thin)}>\n${barParts.join('\n')}\n</g>`;
  const paper = PAPER[U];
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(width * paper.per, places)}${paper.css}" height="${fmt(height * paper.per, places)}${paper.css}" viewBox="0 0 ${w.n(width)} ${w.n(height)}">`,
    `<title>${esc(title)}</title>`,
    titleMarkup,
    ...(piecesMarkup ? [piecesMarkup] : []),
    barMarkup,
    '</svg>',
    '',
  ].join('\n');

  const figures: TrueSizeFigure[] = placed.map((p) => ({
    id: p.e.figure.id,
    ids: [...p.e.figure.ids],
    kind: p.e.figure.kind,
    name: p.name,
    unit: p.figUnit,
    vertices: p.shape.vertices,
    sides: p.shape.sides,
    ...(p.shape.centre ? { centre: p.shape.centre } : {}),
    ...(p.shape.radius !== undefined ? { radius: p.shape.radius } : {}),
    bounds: pointBox(outlinePoints(p.shape.outline)),
    box: p.box,
    precision: p.precision,
    reading: p.reading,
    readings: p.e.solution.readings.length,
    conflicts: p.e.solution.conflicts,
    notes: p.notes,
  }));

  return { svg, unit: U, width, height, title, notes, figures, omitted, print: { markup: piecesMarkup, region } };
}

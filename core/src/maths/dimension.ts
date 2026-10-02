// Dimensions — a number beside a mark, offered as one of its measures
// (MATHS-PLAN.md §3–4; DIRECTOR-PLAN-W2 M3a).
//
// A drafter writes 24 beside a side and means *this side is 24 long*. Where a
// number attaches is a READING (MATHS-PLAN rule 1): which figure, which side,
// ranked, with the reason and the runner-up, never settled by silence. Four
// things are read here, each from geometry alone — no model, and nothing
// written to the log:
//
//   - **Figures.** A figure is the abstraction the solver works on: vertices,
//     sides, angles, and the marks each side was drawn with. One closed stroke
//     fills it today (`figureOfMark`, from the clean form the mark carries or
//     would be offered — the same form `measure.ts` measures); lines meeting
//     will fill it in the main lane's E3 (`polygonFigure` is the adapter:
//     corners in order, and which marks drew each side).
//   - **Numbers and where they attach.** A text artifact holding one number,
//     or a phrase of writing a participant has read, parsed by M1
//     (`readNumber`). Each is offered as a measure of the figure it sits
//     beside — a line's length, a side of a triangle or rectangle (or a part
//     of one, where another mark divides it), a circle's radius or diameter,
//     an arc's chord — ranked by its distance to that side's middle RELATIVE
//     TO THE SIDE'S LENGTH and by how squarely it sits across from the side.
//     A name says which measure (`r = 12`, `⌀ 24`, `waist 28″`, `area 48`); a
//     degree sign makes an angle. **A number inside a closed mark is a piece
//     label, not one of that mark's dimensions.**
//   - **Declarations.** A small square in a corner declares a right angle —
//     the ink's, so it rules the topology (rule 2) — and is never a figure to
//     label. **The underline trap:** a drafter underlines each value, and that
//     short line is at once a candidate edge and a candidate dimension line. A
//     number on a short line that spans nothing belongs to the number; a
//     short line whose ends reach other marks spans something, and the number
//     on it is its length.
//   - **The scale of a drawing.** The figures the numbers attach to, clustered
//     by what the canvas sees between them (relations.ts), get a unit — the
//     one their labels write, else the page's — and a scale in units per
//     canvas unit, with how consistently the labels agree with the ink: *to
//     scale within 4%*, or *not to scale; the labels rule*.
//
// Thresholds of the hand are cited, not restated: reach is the magnets' radius
// (magnets.ts), clusters are relations.ts's. The constants below are this
// module's own, each with the reason it has the value it has.

import type { Bounds, Point } from '../types';
import type { SessionState } from '../session/session';
import type { MMNode } from '../session/nodes';
import { boundsOf, fingerprintOf, getRep, placed, strokePointsOf, transcriptOf } from '../session/nodes';
import { cleanOf, cleanPointsOf, idealize, snapReading } from '../session/clean';
import { magnetRadius } from '../session/magnets';
import { clusters, relate } from '../relate/relations';
import type { Mark } from '../relate/relations';
import { normName, parseLine } from './expr';
import type { LengthUnit, Quantity } from './quantity';
import { convertQuantity, formatNumber, formatQuantity, isRange, quantity, unitSuffix } from './quantity';
import { bandPhrases, boundsOfAll, wordsOnBoard, writingBands } from './writing';

// ===== Figures =====

export type FigureKind = 'triangle' | 'rectangle' | 'quadrilateral' | 'polygon' | 'circle' | 'arc' | 'line';

/** A stretch of a side between two places another mark divides it. */
export interface FigurePart {
  /** `${side}.part${i}` — 'side0.part1'. */
  key: string;
  label: string;
  from: Point;
  to: Point;
  length: number;
}

/** A measurable span of a figure: a polygon's side, a line's length, an arc's chord or rise, a circle's radius or diameter. */
export interface FigureSide {
  /** 'side0' (from vertex 0 to vertex 1) …; 'length'; 'chord', 'rise'; 'radius', 'diameter'. */
  key: string;
  /** For people: 'side AB', 'the length', 'the chord'. */
  label: string;
  from: Point;
  to: Point;
  /** In canvas units. */
  length: number;
  /** The marks this side was drawn with — one for a single stroke, its own line for a ruled figure. */
  ids: string[];
  /** Where other marks divide it, in order from `from`: the parts a whole is made of. */
  parts?: FigurePart[];
}

/**
 * A figure: what the solver works on. One closed stroke fills it today; lines
 * whose ends meet will fill it (E3). Everything is in canvas units, measured
 * from the clean form — the maths of the shape, not of the wobble.
 */
export interface Figure {
  /** A single stroke's figure has the mark's id; a figure of several marks carries its own. */
  id: string;
  kind: FigureKind;
  /** Every mark it was read from. */
  ids: string[];
  /** Corners in order around it (a polygon); a line's two ends; an arc's two ends then its bulge; a circle's centre. */
  vertices: Point[];
  sides: FigureSide[];
  /** Interior angles at the vertices, in degrees, as the ink measures them (polygons). */
  angles?: number[];
  centre?: Point;
  radius?: number;
  /** An arc's bulge: how far its deepest point stands off the chord. */
  rise?: number;
  /** An arc's length along the curve. */
  arcLength?: number;
  closed: boolean;
  /** The figure's outline as a polyline (closed figures repeat their first point last): for inside, touch and cross tests. */
  outline: Point[];
  /** How it was read. */
  reason: string;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const vName = (i: number) => LETTERS[i % 26] ?? `V${i}`;

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

function angleAt(prev: Point, v: Point, next: Point): number {
  const a = Math.atan2(prev.y - v.y, prev.x - v.x);
  const b = Math.atan2(next.y - v.y, next.x - v.x);
  let d = Math.abs(a - b);
  if (d > Math.PI) d = 2 * Math.PI - d;
  return (d * 180) / Math.PI;
}

function polygonArea(v: readonly Point[]): number {
  let s = 0;
  for (let i = 0; i < v.length; i++) {
    const a = v[i], b = v[(i + 1) % v.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

function centroid(v: readonly Point[]): Point {
  return { x: v.reduce((a, p) => a + p.x, 0) / v.length, y: v.reduce((a, p) => a + p.y, 0) / v.length };
}

function sizeOfFigure(f: Figure): number {
  const b = boundsOfAll(f.outline.map((p) => ({ minX: p.x, maxX: p.x, minY: p.y, maxY: p.y })));
  return Math.max(b.maxX - b.minX, b.maxY - b.minY);
}

/**
 * A polygon from its corners in order — the adapter a figure of several
 * strokes fills (E3): `sideIds[i]` are the marks that drew the side from
 * corner i to corner i + 1. Three corners are a triangle, four a
 * quadrilateral (a `rectangle` when the caller has read one).
 */
export function polygonFigure(
  vertices: readonly Point[],
  opts: { id: string; ids?: readonly string[]; sideIds?: readonly (readonly string[])[]; kind?: FigureKind; reason?: string }
): Figure {
  const v = vertices.map((p) => ({ x: p.x, y: p.y }));
  const n = v.length;
  const kind: FigureKind = opts.kind ?? (n === 3 ? 'triangle' : n === 4 ? 'quadrilateral' : 'polygon');
  const all = opts.ids ? [...opts.ids] : [...new Set((opts.sideIds ?? []).flat())];
  const sides: FigureSide[] = v.map((p, i) => {
    const q = v[(i + 1) % n];
    return {
      key: `side${i}`,
      label: `side ${vName(i)}${vName((i + 1) % n)}`,
      from: p,
      to: q,
      length: dist(p, q),
      ids: opts.sideIds?.[i] ? [...opts.sideIds[i]] : all.slice(),
    };
  });
  const angles = v.map((p, i) => angleAt(v[(i - 1 + n) % n], p, v[(i + 1) % n]));
  return {
    id: opts.id,
    kind,
    ids: all,
    vertices: v,
    sides,
    angles,
    closed: true,
    outline: [...v, v[0]],
    reason: opts.reason ?? `${n} corners, joined`,
  };
}

function circleOutline(c: Point, r: number, n = 48): Point[] {
  const out: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push({ x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) });
  }
  return out;
}

/**
 * A single stroke as a figure, from the clean form it carries or would be
 * offered, where the mark stands now — the same form `measure.ts` measures.
 * Null for writing (a mark someone has read, or a run of letters), for a dot,
 * for an oval (no rule here solves one), and for ink the shape rung could not
 * place.
 */
export function figureOfMark(node: MMNode, nodes: ReadonlyMap<string, MMNode>): Figure | null {
  const fp = fingerprintOf(node);
  if (!fp || transcriptOf(node) || getRep(node, 'word-run')) return null;
  const snap = snapReading(node, nodes);
  const shape = snap.shape;
  const heldForm = getRep(node, 'clean') ? cleanOf(node) : undefined;
  const offered = heldForm ? undefined : idealize(node, shape);
  const ideal = heldForm ? cleanPointsOf(node) : offered ? placed(node, offered.points) : undefined;
  if (!ideal || ideal.length < 2) return null;
  const why = `one stroke read as a ${shape} (${snap.reasoning})`;
  const id = node.id;
  switch (shape) {
    case 'triangle':
      if (ideal.length < 3) return null;
      return polygonFigure(ideal.slice(0, 3), { id, ids: [id], reason: why });
    case 'rectangle': {
      if (ideal.length < 4) return null;
      // A box drawn leaning keeps its lean (clean.ts, D2): a parallelogram,
      // whose corners are not right — so a quadrilateral, each side standing
      // alone, never a rectangle, whose rules (a diagonal, an area of width
      // times height) assume they are.
      const lean = (heldForm ?? offered)?.lean;
      if (lean !== undefined) {
        return polygonFigure(ideal.slice(0, 4), { id, ids: [id], reason: `${why}; it leans ${Math.round(lean)}° — a parallelogram, solved as a quadrilateral` });
      }
      return polygonFigure(ideal.slice(0, 4), { id, ids: [id], kind: 'rectangle', reason: why });
    }
    case 'circle': {
      const b = boundsOfAll(ideal.map((p) => ({ minX: p.x, maxX: p.x, minY: p.y, maxY: p.y })));
      const w = b.maxX - b.minX, h = b.maxY - b.minY;
      // Round as clean.ts draws it round; an oval keeps its axes and no rule here solves one.
      if (Math.min(w, h) / Math.max(1e-6, w, h) <= 0.85) return null;
      const r = (w + h) / 4;
      const c = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
      const east = { x: c.x + r, y: c.y }, west = { x: c.x - r, y: c.y };
      return {
        id,
        kind: 'circle',
        ids: [id],
        vertices: [c],
        sides: [
          { key: 'radius', label: 'the radius', from: c, to: east, length: r, ids: [id] },
          { key: 'diameter', label: 'the diameter', from: west, to: east, length: 2 * r, ids: [id] },
        ],
        centre: c,
        radius: r,
        closed: true,
        outline: circleOutline(c, r),
        reason: why,
      };
    }
    case 'line':
    case 'arrow': {
      const arrow = getRep(node, 'reading:arrow')?.data as { tip?: Point; tail?: Point } | undefined;
      const from = shape === 'arrow' && arrow?.tail ? arrow.tail : ideal[0];
      const to = shape === 'arrow' && arrow?.tip ? arrow.tip : shape === 'arrow' ? ideal[1] : ideal[ideal.length - 1];
      return {
        id,
        kind: 'line',
        ids: [id],
        vertices: [from, to],
        sides: [{ key: 'length', label: 'the length', from, to, length: dist(from, to), ids: [id] }],
        closed: false,
        outline: [from, to],
        reason: why,
      };
    }
    case 'arc': {
      const a = ideal[0], c = ideal[ideal.length - 1];
      const chord = dist(a, c);
      if (chord < 1e-6) return null;
      let bulge = ideal[Math.floor(ideal.length / 2)], rise = -1;
      for (const p of ideal) {
        const d = Math.abs((c.x - a.x) * (p.y - a.y) - (c.y - a.y) * (p.x - a.x)) / chord;
        if (d > rise) {
          rise = d;
          bulge = p;
        }
      }
      if (rise <= 1e-6) return null;
      const r = (chord * chord) / (8 * rise) + rise / 2;
      // The centre stands on the chord's perpendicular, r from the bulge, on the chord's side of it.
      const m = mid(a, c);
      const toBulge = { x: (bulge.x - m.x) / rise, y: (bulge.y - m.y) / rise };
      const centre = { x: bulge.x - toBulge.x * r, y: bulge.y - toBulge.y * r };
      let arcLength = 0;
      for (let i = 1; i < ideal.length; i++) arcLength += dist(ideal[i], ideal[i - 1]);
      const foot = { x: m.x, y: m.y };
      return {
        id,
        kind: 'arc',
        ids: [id],
        vertices: [a, c, bulge],
        sides: [
          { key: 'chord', label: 'the chord', from: a, to: c, length: chord, ids: [id] },
          { key: 'rise', label: 'the rise', from: foot, to: bulge, length: rise, ids: [id] },
        ],
        centre,
        radius: r,
        rise,
        arcLength,
        closed: false,
        outline: ideal.slice(),
        reason: why,
      };
    }
    default:
      return null;
  }
}

// ===== Numbers =====

/** What a name beside a number says it measures. */
export type MeasureName =
  | 'radius'
  | 'diameter'
  | 'circumference'
  | 'area'
  | 'perimeter'
  | 'diagonal'
  | 'rise'
  | 'chord'
  | 'width'
  | 'height'
  | 'length'
  | 'long'
  | 'arc';

/**
 * The names a drafter writes for a measure. The body's girths — waist, bust,
 * hip — are circumferences: a circle skirt's waist is its inner circle's.
 * Beside a line, any of them is simply the line's length, carrying its name.
 */
const MEASURE_WORDS: Record<string, MeasureName> = {
  r: 'radius', rad: 'radius', radius: 'radius',
  d: 'diameter', dia: 'diameter', diam: 'diameter', diameter: 'diameter', 'ø': 'diameter',
  c: 'circumference', circ: 'circumference', circumference: 'circumference', girth: 'circumference', round: 'circumference',
  waist: 'circumference', hip: 'circumference', hips: 'circumference', bust: 'circumference', chest: 'circumference', neck: 'circumference', head: 'circumference',
  area: 'area',
  p: 'perimeter', perim: 'perimeter', perimeter: 'perimeter',
  diag: 'diagonal', diagonal: 'diagonal',
  rise: 'rise', sagitta: 'rise',
  chord: 'chord', span: 'chord',
  w: 'width', width: 'width', wide: 'width',
  h: 'height', height: 'height', high: 'height', tall: 'height',
  l: 'length', len: 'length', length: 'length',
  hyp: 'long', hypotenuse: 'long',
  arc: 'arc',
};

/** A number as written beside a mark, read by M1. */
export interface NumberReading {
  /** As written: a bare number keeps no unit until its drawing gives it one. For an angle, degrees. */
  value: Quantity;
  /** The name written with it: `r`, `waist`, `Bust`. */
  name?: string;
  /** What the name says it measures. */
  measure?: MeasureName;
  /** A step's value written on a drawing (`1. 15″`): the step it comes from, to check with `checkWritten`. */
  step?: number;
  /** Written in degrees: an angle, not a length. */
  angle?: boolean;
  reason: string;
}

const ANGLE = /^(?:∠\s*)?(?:([A-Za-z]{1,2})\s*=?\s*)?(\d+(?:\.\d+)?)\s*(?:°|º|deg\b\.?|degrees?\b)$/i;
const DIAMETER_SIGN = /^[⌀Øø]\s*/;

/**
 * What one label says, or null when it is not a number to attach: a line of a
 * table (`A. Bust 36`), a formula, a word. Reads a bare number, a length, a
 * range, a named measure (`r = 12`, `waist 28″`, `⌀ 24`), a step's value
 * (`1. 15″`) and an angle (`40°`). A length is never negative.
 */
export function readNumber(text: string): NumberReading | null {
  const s = text.replace(/[  -​ 　]/g, ' ').trim();
  if (!s) return null;
  const ang = ANGLE.exec(s);
  if (ang) {
    const digits = ang[2].split('.')[1]?.length ?? 0;
    const v = quantity(Number(ang[2]), null, { precision: 10 ** -digits });
    return { value: v, angle: true, ...(ang[1] ? { name: ang[1] } : {}), reason: `${formatNumber(v.lo)}°, an angle` };
  }
  const dia = DIAMETER_SIGN.exec(s);
  const body = dia ? s.slice(dia[0].length) : s;
  const p = parseLine(body);
  if (p.label?.kind === 'letter') return null;
  let out: NumberReading | null = null;
  if (p.shape === 'value' && p.value) {
    out = { value: p.value, reason: formatQuantity(p.value) };
    if (p.label?.kind === 'step') {
      out.step = p.label.n;
      out.reason = `${formatQuantity(p.value)}, the value of step ${p.label.n}`;
    }
  } else if (p.shape === 'definition' && p.value && !p.label && !dia) {
    const measure = MEASURE_WORDS[normName(p.name ?? '')];
    out = {
      value: p.value,
      name: p.name,
      ...(measure ? { measure } : {}),
      reason: `${formatQuantity(p.value)}, named ${p.name}${measure ? ` — ${measure === 'long' ? 'the long side' : `a ${measure}`}` : ''}`,
    };
  }
  if (!out || out.value.lo < 0) return null;
  if (dia) {
    out.measure = 'diameter';
    out.name = dia[0].trim();
    out.reason = `${formatQuantity(out.value)}, written as a diameter`;
  }
  return out;
}

/** A number standing on the board. */
export interface BoardNumber {
  /** A stable key: the text artifact's id, or the first mark of the writing. */
  id: string;
  /** The text artifact, or every mark of the writing. */
  ids: string[];
  from: 'text' | 'writing';
  text: string;
  bounds: Bounds;
  centre: Point;
  reading: NumberReading;
}

const centreOf = (b: Bounds): Point => ({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 });

/**
 * Every number on the board: a text artifact holding one line that reads as
 * a number, and each phrase of writing a participant has read that does. A
 * text of several lines is a page — the sheet's — and not a label.
 */
export function numbersOf(state: SessionState): BoardNumber[] {
  const { texts, pieces } = wordsOnBoard(state);
  const out: BoardNumber[] = [];
  for (const t of texts) {
    const rows = t.code.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
    if (rows.length !== 1) continue;
    const reading = readNumber(rows[0]);
    if (reading) out.push({ id: t.id, ids: [t.id], from: 'text', text: rows[0], bounds: t.bounds, centre: centreOf(t.bounds), reading });
  }
  for (const band of writingBands(pieces)) {
    for (const phrase of bandPhrases(band)) {
      // "24 ″" read as two pieces is 24″: a unit mark sits against its number.
      const text = phrase.map((p) => p.text).join(' ').replace(/(\d)\s+(["″”'′])/g, '$1$2');
      const reading = readNumber(text);
      if (!reading) continue;
      const bounds = boundsOfAll(phrase.map((p) => p.bounds));
      out.push({ id: phrase[0].id, ids: phrase.map((p) => p.id), from: 'writing', text, bounds, centre: centreOf(bounds), reading });
    }
  }
  return out;
}

// ===== Geometry for attaching =====

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-12) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Where two segments cross, as a fraction along the first; null when they do not. */
function crossAt(a: Point, b: Point, c: Point, d: Point): number | null {
  const r = { x: b.x - a.x, y: b.y - a.y }, s = { x: d.x - c.x, y: d.y - c.y };
  const den = r.x * s.y - r.y * s.x;
  if (Math.abs(den) < 1e-12) return null;
  const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / den;
  const u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null;
}

function distToOutline(p: Point, outline: readonly Point[]): number {
  let best = Infinity;
  for (let i = 1; i < outline.length; i++) best = Math.min(best, distToSegment(p, outline[i - 1], outline[i]));
  return outline.length === 1 ? dist(p, outline[0]) : best;
}

function insidePolygon(p: Point, v: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = v.length - 1; i < v.length; j = i++) {
    if (v[i].y > p.y !== v[j].y > p.y && p.x < ((v[j].x - v[i].x) * (p.y - v[i].y)) / (v[j].y - v[i].y) + v[i].x) inside = !inside;
  }
  return inside;
}

/** Is the point inside this closed figure? */
export function insideFigure(f: Figure, p: Point): boolean {
  if (!f.closed) return false;
  if (f.kind === 'circle' && f.centre && f.radius) return dist(p, f.centre) < f.radius;
  return insidePolygon(p, f.vertices);
}

function areaOfFigure(f: Figure): number {
  if (f.kind === 'circle' && f.radius) return Math.PI * f.radius * f.radius;
  return polygonArea(f.vertices);
}

// ===== Declarations: a square in a corner, an underline =====

/** A right angle a small square in its corner declares — the ink's, so it rules the topology. */
export interface RightAngleMark {
  figure: string;
  /** Which corner: an index into the figure's vertices. */
  vertex: number;
  /** The square's marks. */
  ids: string[];
  reason: string;
}

/** A square no larger than this share of the shorter side it stands between: a declaration, not a piece. */
const SQUARE_MAX = 0.5;
/** Its points may stray outside the corner by this share of its own size — the hand's slack. */
const SQUARE_SLACK = 0.25;
/** Off its legs, a square's far edges keep at least this share of its size from each leg — an arc across the corner does not. */
const SQUARE_STRAIGHT = 0.8;

/**
 * Does this ink stand in corner `k` of the figure as a small square — an L
 * from one side to the other, or a closed square — and not as an arc (which
 * marks an angle, not a right one)? Measured in the corner's own frame, so a
 * sketched corner that is not quite square still holds its square.
 */
function squareInCorner(f: Figure, k: number, pts: readonly Point[]): boolean {
  const n = f.vertices.length;
  const v = f.vertices[k], next = f.vertices[(k + 1) % n], prev = f.vertices[(k - 1 + n) % n];
  const l1 = dist(v, next), l2 = dist(v, prev);
  if (l1 < 1e-6 || l2 < 1e-6 || pts.length < 3) return false;
  const u1 = { x: (next.x - v.x) / l1, y: (next.y - v.y) / l1 };
  const u2 = { x: (prev.x - v.x) / l2, y: (prev.y - v.y) / l2 };
  const det = u1.x * u2.y - u1.y * u2.x;
  if (Math.abs(det) < 0.2) return false; // a corner too flat to hold a square
  const ab = pts.map((p) => {
    const dx = p.x - v.x, dy = p.y - v.y;
    return { a: (dx * u2.y - dy * u2.x) / det, b: (u1.x * dy - u1.y * dx) / det };
  });
  const s = Math.max(...ab.map((q) => Math.max(q.a, q.b)));
  if (!(s > 0) || s > SQUARE_MAX * Math.min(l1, l2)) return false;
  if (ab.some((q) => q.a < -SQUARE_SLACK * s || q.b < -SQUARE_SLACK * s)) return false;
  // It reaches the sides of the corner, and it has a far corner of its own.
  if (!ab.some((q) => Math.min(q.a, q.b) <= SQUARE_SLACK * s)) return false;
  if (!ab.some((q) => Math.min(q.a, q.b) >= (1 - SQUARE_SLACK) * s)) return false;
  const off = ab.filter((q) => Math.min(q.a, q.b) > SQUARE_SLACK * s);
  const straight = off.filter((q) => Math.max(q.a, q.b) >= SQUARE_STRAIGHT * s).length;
  return off.length > 0 && straight >= 0.9 * off.length;
}

/** A short line under a number that spans nothing: the number's underline, not an edge. */
export interface Underline {
  /** The line's marks. */
  ids: string[];
  /** The number it belongs to (its `id`). */
  number: string;
  reason: string;
}

/** An underline runs no longer than this many of its number's widths — about the number's own width, with room for a flourish. */
const UNDERLINE_SPAN = 2.5;
/** …and no steeper than this slope: it runs along the writing. */
const UNDERLINE_SLOPE = 0.36;

function touchesFigure(p: Point, g: Figure): boolean {
  return distToOutline(p, g.outline) <= magnetRadius(sizeOfFigure(g));
}

function crossesFigure(a: Point, b: Point, g: Figure): boolean {
  for (let i = 1; i < g.outline.length; i++) if (crossAt(a, b, g.outline[i - 1], g.outline[i]) !== null) return true;
  return false;
}

function underlineOf(num: BoardNumber, line: Figure, others: readonly Figure[]): string | null {
  const s = line.sides[0];
  const dx = s.to.x - s.from.x, dy = s.to.y - s.from.y;
  if (Math.abs(dy) > UNDERLINE_SLOPE * Math.abs(dx)) return null;
  const nb = num.bounds;
  const nw = Math.max(1, nb.maxX - nb.minX), nh = Math.max(1, nb.maxY - nb.minY);
  const y = (s.from.y + s.to.y) / 2;
  if (y < num.centre.y || y > nb.maxY + nh) return null;
  const x0 = Math.min(s.from.x, s.to.x), x1 = Math.max(s.from.x, s.to.x);
  const overlap = Math.min(x1, nb.maxX) - Math.max(x0, nb.minX);
  if (overlap < 0.5 * Math.min(x1 - x0, nw)) return null;
  if (s.length > UNDERLINE_SPAN * nw) return null;
  for (const g of others) {
    if (g === line) continue;
    if (touchesFigure(s.from, g) || touchesFigure(s.to, g) || crossesFigure(s.from, s.to, g)) return null;
  }
  return `a short line under ${num.text} that reaches no other mark: its underline, not an edge`;
}

// ===== Parts: where other marks divide a side =====

function withParts(f: Figure, others: readonly Figure[]): Figure {
  if (f.kind === 'circle' || f.kind === 'arc') return f;
  const sides = f.sides.map((side) => {
    const L = side.length;
    if (L < 1e-6) return side;
    const tol = magnetRadius(L);
    const ts: number[] = [];
    const along = (p: Point) => ((p.x - side.from.x) * (side.to.x - side.from.x) + (p.y - side.from.y) * (side.to.y - side.from.y)) / (L * L);
    for (const g of others) {
      if (g === f || g.ids.some((id) => f.ids.includes(id))) continue;
      const points = g.kind === 'line' ? g.vertices : g.kind === 'circle' || g.kind === 'arc' ? [] : g.vertices;
      for (const p of points) if (distToSegment(p, side.from, side.to) <= tol) ts.push(along(p));
      if (g.kind === 'line') {
        const t = crossAt(side.from, side.to, g.vertices[0], g.vertices[1]);
        if (t !== null) ts.push(t);
      }
    }
    const interior = ts.filter((t) => t * L > tol && (1 - t) * L > tol).sort((a, b) => a - b);
    const cuts: number[] = [];
    for (const t of interior) if (!cuts.length || (t - cuts[cuts.length - 1]) * L > tol) cuts.push(t);
    if (!cuts.length) return side;
    const at = (t: number): Point => ({ x: side.from.x + (side.to.x - side.from.x) * t, y: side.from.y + (side.to.y - side.from.y) * t });
    const stops = [0, ...cuts, 1];
    const parts: FigurePart[] = [];
    for (let i = 0; i < stops.length - 1; i++) {
      const a = at(stops[i]), b = at(stops[i + 1]);
      parts.push({ key: `${side.key}.part${i}`, label: `part ${i + 1} of ${stops.length - 1} along ${side.label}`, from: a, to: b, length: dist(a, b) });
    }
    return { ...side, parts };
  });
  return { ...f, sides };
}

// ===== Attaching a number =====

export type AttachmentKind = 'side' | 'part' | 'measure' | 'angle' | 'piece';

export interface AttachmentCandidate {
  figure: string;
  kind: AttachmentKind;
  /** The side, part, measure or angle it would be: 'side1', 'side0.part1', 'radius', 'area', 'angle2', 'piece'. */
  key: string;
  label: string;
  /** 0–1: how sure the geometry is. */
  confidence: number;
  /** Distance from the number to that side's middle, as a share of the side's length (a circle: to its rim, as a share of the radius). */
  offset?: number;
  /** 0–1: how squarely the number sits across from the side's middle. */
  alignment?: number;
  reason: string;
}

export interface Attachment {
  number: BoardNumber;
  /** What the number is here: a measure of a mark, an angle of one, a piece's label — or free, the sheet's. */
  as: 'dimension' | 'angle' | 'piece' | 'free';
  figure?: string;
  key?: string;
  confidence: number;
  /** Every candidate, ranked; the first is the reading. */
  candidates: AttachmentCandidate[];
  runnerUp?: AttachmentCandidate;
  reason: string;
}

/**
 * Below this a number sits beside no mark. With the confidence below, a
 * number square to a side's middle falls to it at about three quarters of
 * the side's length away.
 */
const ATTACH_FLOOR = 0.3;
/** A number inside a closed mark reads as its piece label unless something inside it has a better claim. */
const PIECE_CONFIDENCE = 0.5;
/** A side seen from across its own figure is only ever a distant runner-up. */
const ACROSS_THE_FIGURE = 0.1;

const pct = (x: number) => `${Math.round(x * 100)}%`;

function squareWord(alignment: number): string {
  return alignment >= 0.9 ? 'square to it' : alignment >= 0.6 ? 'a little off square' : 'well off square';
}

/** A number against one segment of a figure: its distance to the middle relative to the length, and how squarely it sits across. */
function segmentCandidate(
  num: BoardNumber,
  f: Figure,
  seg: { key: string; label: string; from: Point; to: Point; length: number },
  kind: 'side' | 'part' | 'measure'
): AttachmentCandidate | null {
  const L = seg.length;
  if (L < 1e-6) return null;
  const p = num.centre;
  const m = mid(seg.from, seg.to);
  const d = dist(p, m);
  const u = { x: (seg.to.x - seg.from.x) / L, y: (seg.to.y - seg.from.y) / L };
  const across = (p.x - m.x) * -u.y + (p.y - m.y) * u.x;
  const offset = d / L;
  const alignment = d < 1e-9 ? 1 : Math.abs(across) / d;
  let confidence = (1 / (1 + 4 * offset * offset)) * (0.4 + 0.6 * alignment);
  let facing = true;
  if (f.closed && kind !== 'measure') {
    // A label stands outside its figure, on the far side of the side from the figure's middle.
    const c = centroid(f.vertices);
    const inward = (c.x - m.x) * -u.y + (c.y - m.y) * u.x;
    facing = across * inward < 0;
    if (!facing) confidence *= ACROSS_THE_FIGURE;
  }
  const whose = f.kind === 'line' ? `${seg.label} of the line` : `${seg.label} of the ${f.kind}`;
  const reason = facing
    ? `${whose}: ${pct(offset)} of its length from its middle, ${squareWord(alignment)}`
    : `${whose}, seen from across the ${f.kind}: ${pct(offset)} of its length from its middle`;
  return { figure: f.id, kind, key: seg.key, label: seg.label, confidence, offset, alignment, reason };
}

/** A number against a circle's rim: radius and diameter alike, so nothing but a name or the scale can tell them apart. */
function rimCandidates(num: BoardNumber, f: Figure): AttachmentCandidate[] {
  if (!f.centre || !f.radius) return [];
  const offset = Math.abs(dist(num.centre, f.centre) - f.radius) / f.radius;
  const confidence = 1 / (1 + 4 * offset * offset);
  const base = `${pct(offset)} of the radius from the circle's rim`;
  return (['radius', 'diameter'] as const).map((key) => ({
    figure: f.id,
    kind: 'measure' as const,
    key,
    label: `the ${key}`,
    confidence,
    offset,
    alignment: 1,
    reason: `the ${key} of the circle: ${base}`,
  }));
}

/** The keys a named measure may take on a figure. */
function namedKeys(f: Figure, measure: MeasureName): { key: string; label: string; segment?: FigureSide }[] {
  const side = (k: string) => f.sides.find((s) => s.key === k);
  const horizontal = (s: FigureSide) => Math.abs(s.to.x - s.from.x) >= Math.abs(s.to.y - s.from.y);
  switch (f.kind) {
    case 'circle':
      if (measure === 'radius' || measure === 'diameter') return [{ key: measure, label: `the ${measure}` }];
      if (measure === 'circumference' || measure === 'area') return [{ key: measure, label: `the ${measure}` }];
      return [];
    case 'arc':
      if (measure === 'chord' || measure === 'width') return [{ key: 'chord', label: 'the chord', segment: side('chord') }];
      if (measure === 'rise' || measure === 'height') return [{ key: 'rise', label: 'the rise', segment: side('rise') }];
      if (measure === 'radius') return [{ key: 'radius', label: 'the radius' }];
      if (measure === 'arc' || measure === 'length') return [{ key: 'arc', label: 'the arc' }];
      return [];
    case 'line':
      return [{ key: 'length', label: 'the length', segment: side('length') }];
    case 'rectangle': {
      if (measure === 'width') return f.sides.filter(horizontal).map((s) => ({ key: s.key, label: s.label, segment: s }));
      if (measure === 'height') return f.sides.filter((s) => !horizontal(s)).map((s) => ({ key: s.key, label: s.label, segment: s }));
      if (measure === 'diagonal' || measure === 'area' || measure === 'perimeter') return [{ key: measure, label: `the ${measure}` }];
      return [];
    }
    default: {
      if (measure === 'area' || measure === 'perimeter') return [{ key: measure, label: `the ${measure}` }];
      if (measure === 'long' && f.kind === 'triangle') {
        let long = f.sides[0];
        for (const s of f.sides) if (s.length > long.length) long = s;
        return [{ key: long.key, label: long.label, segment: long }];
      }
      return [];
    }
  }
}

function candidatesFor(num: BoardNumber, figures: readonly Figure[]): AttachmentCandidate[] {
  const p = num.centre;
  const out: AttachmentCandidate[] = [];
  const reading = num.reading;

  if (reading.angle) {
    for (const f of figures) {
      if (f.kind === 'circle' || f.kind === 'arc' || f.kind === 'line') continue;
      const n = f.vertices.length;
      f.vertices.forEach((v, k) => {
        const next = f.vertices[(k + 1) % n], prev = f.vertices[(k - 1 + n) % n];
        const shorter = Math.min(dist(v, next), dist(v, prev));
        if (shorter < 1e-6) return;
        const offset = dist(p, v) / shorter;
        const within = insideFigure(f, p);
        const confidence = (1 / (1 + 4 * offset * offset)) * (within ? 1 : 0.5);
        out.push({
          figure: f.id,
          kind: 'angle',
          key: `angle${k}`,
          label: `the angle at ${vName(k)}`,
          confidence,
          offset,
          reason: `the angle at ${vName(k)} of the ${f.kind}: ${pct(offset)} of its shorter side from the corner, ${within ? 'inside it' : 'outside it'}`,
        });
      });
    }
    return out.sort((a, b) => b.confidence - a.confidence);
  }

  // A named measure goes where its name says, when a figure here has that measure.
  if (reading.measure) {
    for (const f of figures) {
      for (const k of namedKeys(f, reading.measure)) {
        if (k.segment) {
          const c = segmentCandidate(num, f, { key: k.key, label: k.label, from: k.segment.from, to: k.segment.to, length: k.segment.length }, 'measure');
          if (c) out.push({ ...c, reason: `${c.reason}, as its name says` });
          continue;
        }
        const size = Math.max(1, sizeOfFigure(f));
        const d = insideFigure(f, p) ? 0 : distToOutline(p, f.outline);
        const offset = d / size;
        const confidence = 1 / (1 + 4 * offset * offset);
        out.push({
          figure: f.id,
          kind: 'measure',
          key: k.key,
          label: k.label,
          confidence,
          offset,
          reason: `${k.label} of the ${f.kind}, as its name says: ${d === 0 ? 'written inside it' : `${pct(offset)} of its size from it`}`,
        });
      }
    }
    if (out.some((c) => c.confidence >= ATTACH_FLOOR)) return out.sort((a, b) => b.confidence - a.confidence);
    out.length = 0;
  }

  // Inside a closed mark: its piece label, and none of its sides.
  const containing = figures.filter((f) => insideFigure(f, p));
  const inner = containing.slice().sort((a, b) => areaOfFigure(a) - areaOfFigure(b))[0];
  for (const f of figures) {
    if (containing.includes(f)) continue;
    if (f.kind === 'circle') {
      out.push(...rimCandidates(num, f));
      continue;
    }
    for (const s of f.sides) {
      const c = segmentCandidate(num, f, s, 'side');
      if (c) out.push(c);
      for (const part of s.parts ?? []) {
        const pc = segmentCandidate(num, f, part, 'part');
        if (pc) out.push(pc);
      }
    }
  }
  if (inner) {
    out.push({
      figure: inner.id,
      kind: 'piece',
      key: 'piece',
      label: `the ${inner.kind}'s piece label`,
      confidence: PIECE_CONFIDENCE,
      reason: `inside the ${inner.kind}: a piece label, not one of its dimensions`,
    });
  }
  return out.sort((a, b) => b.confidence - a.confidence);
}

function kindWord(figures: readonly Figure[], id: string): string {
  return figures.find((f) => f.id === id)?.kind ?? 'mark';
}

/** Rank every place a number could attach, and say which it takes and why. */
export function attachNumber(num: BoardNumber, figures: readonly Figure[]): Attachment {
  const candidates = candidatesFor(num, figures);
  const top = candidates[0];
  const runnerUp = candidates.find((c, i) => i > 0 && !(c.figure === top?.figure && c.key === top?.key));
  const next = (c: AttachmentCandidate | undefined) =>
    c ? `; next: ${c.label} of the ${kindWord(figures, c.figure)}${c.offset !== undefined ? `, ${pct(c.offset)} away` : ''}` : '';
  if (!top || top.confidence < ATTACH_FLOOR) {
    return {
      number: num,
      as: 'free',
      confidence: top?.confidence ?? 0,
      candidates,
      ...(top ? { runnerUp: top } : {}),
      reason: `${num.text} is beside no mark${top ? `: the nearest is ${top.reason}` : ''}`,
    };
  }
  const as = top.kind === 'piece' ? 'piece' : top.kind === 'angle' ? 'angle' : 'dimension';
  let reason: string;
  if (as === 'piece') reason = `${num.text} is ${top.reason}${next(runnerUp)}`;
  else {
    reason = `${num.text} labels ${top.reason}`;
    const tie = runnerUp && runnerUp.figure === top.figure && Math.abs(runnerUp.confidence - top.confidence) < 1e-9;
    if (tie && top.key === 'radius' && runnerUp.key === 'diameter') reason += `; nothing written says whether it is the radius or the diameter`;
    reason += next(runnerUp);
  }
  return { number: num, as, figure: top.figure, key: top.key, confidence: top.confidence, candidates, ...(runnerUp ? { runnerUp } : {}), reason };
}

// ===== Labels on a figure =====

/** A fact written or drawn on a figure: what the solver solves from. */
export interface FigureLabel {
  /** A side ('side0'), a part ('side0.part1'), a measure ('radius', 'area', 'chord' …) or an angle ('angle2'). */
  key: string;
  /** As written, a bare number given the unit its drawing speaks; an angle in degrees; an area in square units. */
  value: Quantity;
  /** As written: '24', 'r = 12'; a declared right angle is '∟'. */
  text: string;
  /** The number as written, without its name: '24', '12', '28″'. Unset: the text. */
  shown?: string;
  /** The name written with it: 'r', 'waist'. */
  name?: string;
  /** The number's marks, or the square's. */
  ids: string[];
  /** The number it was read from. Two labels of one number are alternatives — a bare number beside a circle is its radius or its diameter. */
  number?: string;
  /** A right angle declared by a square in the corner: the ink's, never dropped (rule 2). */
  declared?: boolean;
  confidence: number;
  /** A step's value written on the drawing: check it against the sheet with `checkWritten`. */
  step?: number;
  reason: string;
}

// ===== Drawings and their scale =====

export interface DrawingScale {
  unit: LengthUnit | null;
  /** Units per canvas unit: 24″ over 240 px of ink is 0.1. */
  unitsPerCanvasUnit: number;
  /** Canvas units per unit, for people: 1″ ≈ 10 px. */
  pxPerUnit: number;
  /** How many labels it was measured from. */
  labels: number;
  /** The largest share by which a label and the ink disagree at this scale. */
  spread: number;
  /** Whether every label agrees with the ink within `TO_SCALE_WITHIN`. */
  toScale: boolean;
  /** The label furthest from the ink. */
  worst?: { figure: string; key: string; text: string; off: number };
  reason: string;
}

/**
 * A drawing is to scale when every label agrees with the ink within this
 * share: a sketch drawn to proportion by eye. Past it, the labels rule and
 * the ink only says what the drawing would be at its own scale.
 */
export const TO_SCALE_WITHIN = 0.1;

export interface Drawing {
  /** 'drawing:' and its first figure's id. */
  id: string;
  figures: string[];
  /** Every mark of its figures. */
  ids: string[];
  /** The unit its bare numbers take: the one its labels write, else the page's. */
  unit: LengthUnit | null;
  unitReason: string;
  scale: DrawingScale | null;
}

/** The ink's own measure of a key on a figure, in canvas units (degrees for an angle; square canvas units for an area). */
export function inkMeasure(f: Figure, key: string): number | null {
  const [base, part] = key.split('.');
  const side = f.sides.find((s) => s.key === base);
  if (side && part) return side.parts?.find((p) => p.key === key)?.length ?? null;
  if (side) return side.length;
  const angle = /^angle(\d+)$/.exec(key);
  if (angle) return f.angles?.[Number(angle[1])] ?? null;
  const sum = f.sides.reduce((a, s) => a + s.length, 0);
  switch (key) {
    case 'radius':
      return f.radius ?? null;
    case 'diameter':
      return f.radius ? 2 * f.radius : null;
    case 'circumference':
      return f.radius ? 2 * Math.PI * f.radius : null;
    case 'area':
      return f.kind === 'circle' ? (f.radius ? Math.PI * f.radius ** 2 : null) : f.closed ? polygonArea(f.vertices) : null;
    case 'perimeter':
      return f.kind === 'circle' ? (f.radius ? 2 * Math.PI * f.radius : null) : f.closed ? sum : null;
    case 'diagonal':
      return f.kind === 'rectangle' || f.kind === 'quadrilateral' ? dist(f.vertices[0], f.vertices[2]) : null;
    case 'arc':
      return f.arcLength ?? null;
    default:
      return null;
  }
}

/** Is this key a length (so it can set a scale)? */
function isLengthKey(key: string): boolean {
  return !/^angle\d+$/.test(key) && key !== 'area' && key !== 'piece';
}

const UNIT_NAMES: Record<LengthUnit, string> = { in: 'inches', ft: 'feet', cm: 'centimetres', mm: 'millimetres', m: 'metres' };

function scaleOf(labels: readonly { figure: Figure; label: FigureLabel }[], unit: LengthUnit | null): DrawingScale | null {
  const ratios: { figure: string; key: string; text: string; r: number }[] = [];
  // Alternatives of one number — a bare number beside a circle, its radius or its diameter — are one label: the first reading speaks for it.
  const counted = new Set<string>();
  for (const { figure, label } of labels) {
    if (label.declared || !isLengthKey(label.key) || isRange(label.value) || label.value.dim !== (unit ? 1 : label.value.dim)) continue;
    if (label.number) {
      if (counted.has(label.number)) continue;
      counted.add(label.number);
    }
    const ink = inkMeasure(figure, label.key);
    if (!ink || ink <= 0) continue;
    const v = unit && label.value.unit && label.value.unit !== unit ? convertQuantity(label.value, unit).quantity : label.value;
    if (!(v.lo > 0)) continue;
    ratios.push({ figure: figure.id, key: label.key, text: label.text, r: v.lo / ink });
  }
  if (!ratios.length) return null;
  const sorted = ratios.map((x) => x.r).sort((a, b) => a - b);
  const h = Math.floor(sorted.length / 2);
  const scale = sorted.length % 2 ? sorted[h] : (sorted[h - 1] + sorted[h]) / 2;
  let worst = ratios[0], spread = 0;
  for (const x of ratios) {
    const off = Math.abs(x.r / scale - 1);
    if (off > spread) {
      spread = off;
      worst = x;
    }
  }
  const px = 1 / scale;
  const one = `1${unit ? unitSuffix(unit, 1) : ''} ≈ ${formatNumber(px)} px`;
  const toScale = spread <= TO_SCALE_WITHIN;
  let reason: string;
  if (ratios.length === 1) reason = `one label sets the scale, ${one}; nothing to check it against`;
  else if (toScale) reason = `${one}, to scale within ${Math.max(1, Math.ceil(spread * 100 - 1e-9))}%`;
  else reason = `${one}; not to scale; the labels rule (${worst.text} on ${worst.key} is ${pct(spread)} off the ink)`;
  return {
    unit,
    unitsPerCanvasUnit: scale,
    pxPerUnit: px,
    labels: ratios.length,
    spread,
    toScale,
    ...(ratios.length > 1 ? { worst: { figure: worst.figure, key: worst.key, text: worst.text, off: spread } } : {}),
    reason,
  };
}

// ===== The board =====

export interface DimensionOptions {
  /**
   * The unit a bare number takes when its drawing writes none — usually the
   * page's (`readSheet(...).unit`). A function is asked once, with the ids of
   * the numbers that stand on marks, so a caller can read the page without
   * them. Unset: none, and bare numbers stay bare.
   */
  unit?: LengthUnit | null | ((numberIds: ReadonlySet<string>) => LengthUnit | null);
  /**
   * Figures read some other way — lines whose ends meet (E3). Each replaces
   * the single-stroke figures of the marks it is made of.
   */
  figures?: readonly Figure[];
}

export interface BoardDimensions {
  /** Every figure on the board, parts included — less the squares that declare corners and the lines that underline numbers. */
  figures: Figure[];
  numbers: BoardNumber[];
  /** One per number, in the order of `numbers`. */
  attachments: Attachment[];
  /** The facts on each figure, by figure id: its numbers, and its declared right angles. */
  labels: Map<string, FigureLabel[]>;
  rightAngles: RightAngleMark[];
  underlines: Underline[];
  drawings: Drawing[];
  /** Every id of a number read as on a mark — a dimension, an angle or a piece label. Not the sheet's. */
  numberIds: Set<string>;
}

function contentMarks(state: SessionState): MMNode[] {
  const out: MMNode[] = [];
  for (const id of state.contentIds) {
    if (state.artifacts.includes(id)) continue;
    const n = state.nodes.get(id);
    if (n && !getRep(n, 'erased')) out.push(n);
  }
  return out;
}

/**
 * Every number on the board and where it attaches; every figure, with the
 * parts other marks divide its sides into; the corners declared right; the
 * underlines; and each drawing with its unit and scale. Reads the session
 * and changes nothing in it.
 */
export function dimensionsOf(state: SessionState, options: DimensionOptions = {}): BoardDimensions {
  const nodes = state.nodes;
  const numbers = numbersOf(state);
  const numberMarks = new Set(numbers.flatMap((n) => n.ids));
  const marks = contentMarks(state).filter((n) => !numberMarks.has(n.id));

  // Figures: the ones given, then one per mark they do not cover.
  const given = options.figures ?? [];
  const covered = new Set(given.flatMap((f) => f.ids));
  let figures: Figure[] = [...given];
  for (const n of marks) {
    if (covered.has(n.id)) continue;
    const f = figureOfMark(n, nodes);
    if (f) figures.push(f);
  }

  // A square in a corner declares it right, and is not a figure to label.
  const rightAngles: RightAngleMark[] = [];
  const declaring = new Set<string>();
  for (const f of figures) {
    if (f.kind !== 'triangle' && f.kind !== 'quadrilateral' && f.kind !== 'polygon') continue;
    for (const n of marks) {
      if (f.ids.includes(n.id) || declaring.has(n.id)) continue;
      const pts = strokePointsOf(n);
      if (!pts) continue;
      const k = f.vertices.findIndex((_, i) => squareInCorner(f, i, pts));
      if (k < 0) continue;
      declaring.add(n.id);
      rightAngles.push({ figure: f.id, vertex: k, ids: [n.id], reason: `a small square in the corner at ${vName(k)} declares it right` });
    }
  }
  figures = figures.filter((f) => !f.ids.some((id) => declaring.has(id)));

  // The underline: a short line under a number that spans nothing belongs to the number.
  const underlines: Underline[] = [];
  for (const num of numbers) {
    for (const f of figures) {
      if (f.kind !== 'line' || f.ids.length !== 1 || underlines.some((u) => u.ids[0] === f.ids[0])) continue;
      const why = underlineOf(num, f, figures);
      if (why) underlines.push({ ids: [...f.ids], number: num.id, reason: why });
    }
  }
  const underlined = new Set(underlines.flatMap((u) => u.ids));
  figures = figures.filter((f) => !f.ids.some((id) => underlined.has(id)));

  // Where other marks divide a side.
  figures = figures.map((f) => withParts(f, figures));

  // Where each number attaches.
  const attachments = numbers.map((num) => attachNumber(num, figures));
  const numberIds = new Set<string>();
  for (const a of attachments) if (a.as !== 'free') a.number.ids.forEach((id) => numberIds.add(id));

  // The facts on each figure.
  const raw = new Map<string, FigureLabel[]>();
  const push = (fid: string, l: FigureLabel) => (raw.get(fid) ?? raw.set(fid, []).get(fid)!).push(l);
  for (const a of attachments) {
    if (a.as !== 'dimension' && a.as !== 'angle') continue;
    const top = a.candidates[0];
    // Candidates the geometry cannot tell apart — a bare number beside a circle — are alternatives of one number.
    const tied = a.candidates.filter((c) => c.figure === top.figure && c.kind !== 'piece' && Math.abs(c.confidence - top.confidence) < 1e-9);
    for (const c of tied) {
      push(c.figure, {
        key: c.key,
        value: a.number.reading.value,
        text: a.number.text,
        shown: formatQuantity(a.number.reading.value),
        ...(a.number.reading.name ? { name: a.number.reading.name } : {}),
        ids: [...a.number.ids],
        number: a.number.id,
        confidence: c.confidence,
        ...(a.number.reading.step !== undefined ? { step: a.number.reading.step } : {}),
        reason: c === top ? a.reason : `${a.number.text} labels ${c.reason}`,
      });
    }
  }
  for (const ra of rightAngles) {
    push(ra.figure, { key: `angle${ra.vertex}`, value: quantity(90), text: '∟', ids: ra.ids, declared: true, confidence: 1, reason: ra.reason });
  }

  // Drawings: the labelled figures and what they hang together with.
  const byMark = new Map<string, Figure>();
  for (const f of figures) for (const id of f.ids) byMark.set(id, f);
  const relMarks: Mark[] = [];
  for (const id of byMark.keys()) {
    const n = nodes.get(id);
    const b = n && boundsOf(n);
    if (!n || !b) continue;
    relMarks.push({ id, bounds: b, points: strokePointsOf(n), closed: fingerprintOf(n)?.isClosed });
  }
  const groups = clusters(relMarks, relate(relMarks));
  // Union the groups a figure spans (a figure of several marks), and give a figure whose marks are not on the board its own.
  const groupOf = new Map<string, number>();
  groups.forEach((g, i) => g.forEach((id) => groupOf.set(id, i)));
  const parent = groups.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const figureGroup = new Map<string, number>();
  for (const f of figures) {
    const gs = f.ids.map((id) => groupOf.get(id)).filter((g): g is number => g !== undefined);
    if (!gs.length) {
      parent.push(parent.length);
      figureGroup.set(f.id, parent.length - 1);
      continue;
    }
    for (const g of gs.slice(1)) parent[find(g)] = find(gs[0]);
    figureGroup.set(f.id, gs[0]);
  }
  const drawingsByRoot = new Map<number, Figure[]>();
  for (const f of figures) {
    const root = find(figureGroup.get(f.id)!);
    (drawingsByRoot.get(root) ?? drawingsByRoot.set(root, []).get(root)!).push(f);
  }

  const fallback = typeof options.unit === 'function' ? options.unit(numberIds) : options.unit ?? null;
  const labels = new Map<string, FigureLabel[]>();
  const drawings: Drawing[] = [];
  for (const members of drawingsByRoot.values()) {
    const labelled = members.filter((f) => (raw.get(f.id) ?? []).some((l) => !l.declared));
    if (!labelled.length) {
      for (const f of members) if (raw.has(f.id)) labels.set(f.id, raw.get(f.id)!);
      continue;
    }
    // The unit the drawing writes, else the page's.
    const count = new Map<LengthUnit, number>();
    for (const f of members) for (const l of raw.get(f.id) ?? []) if (!l.declared && l.value.unit && l.value.dim >= 1) count.set(l.value.unit, (count.get(l.value.unit) ?? 0) + 1);
    let written: LengthUnit | null = null;
    for (const [u, n] of count) if (!written || n > count.get(written)!) written = u;
    const unit = written ?? fallback;
    const unitReason = written
      ? `${UNIT_NAMES[written]}, written on ${count.get(written)} of its labels`
      : unit
        ? `${UNIT_NAMES[unit]}, the unit the page speaks`
        : 'no unit written, so its numbers stay bare';
    const given: { figure: Figure; label: FigureLabel }[] = [];
    for (const f of members) {
      const ls = (raw.get(f.id) ?? []).map((l) => {
        if (l.declared || /^angle\d+$/.test(l.key) || l.value.unit || !unit) return l;
        return { ...l, value: { ...l.value, unit, dim: l.key === 'area' ? 2 : 1 } };
      });
      if (ls.length) labels.set(f.id, ls);
      for (const l of ls) given.push({ figure: f, label: l });
    }
    const first = members[0];
    drawings.push({
      id: `drawing:${first.id}`,
      figures: members.map((f) => f.id),
      ids: [...new Set(members.flatMap((f) => f.ids))],
      unit,
      unitReason,
      scale: scaleOf(given, unit),
    });
  }

  return { figures, numbers, attachments, labels, rightAngles, underlines, drawings, numberIds };
}

/** The ids of every number that stands on a mark — what the sheet leaves out (gather.ts). */
export function attachedNumberIds(state: SessionState): Set<string> {
  return dimensionsOf(state).numberIds;
}

/** The dimensions in a few lines, for a status line, a panel or a brief. */
export function describeDimensions(d: BoardDimensions): string {
  const lines: string[] = [];
  for (const a of d.attachments) lines.push(a.reason);
  for (const r of d.rightAngles) lines.push(r.reason);
  for (const u of d.underlines) lines.push(u.reason);
  for (const dr of d.drawings) lines.push(`${dr.figures.join(', ')}: ${dr.unitReason}${dr.scale ? `; ${dr.scale.reason}` : ''}`);
  return lines.join('\n');
}

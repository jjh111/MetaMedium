// The garment maths — what the marks of a pattern piece mean in numbers
// (V1-PLAN §9 M6; MATHS-PLAN §1 "a drawing that is also a calculation", §3's
// six rules, §4).
//
// The notation (notations/garment.ts) says what is drawn: a piece, its grain
// line, fold, notches, darts and cutting line. This says what those come to
// once numbers are written on the piece, and what true size prints. Nothing
// here reads ink for a shape; it reads the notation's marks and the solver's
// figures, and never writes anything:
//
//   - **Cutting size against sewing size.** The piece's outline is its
//     sewing line and the outline standing off it all round the cutting line,
//     the seam allowance between. The numbers rule the outline they are
//     written on (rule 2: labels rule the thing, the ink rules the topology):
//     a number in the piece is its sewing size and the cutting line stands the
//     allowance out from it; a number written outside the cutting line is the
//     cutting size, and the piece is sewn smaller — with the other reading said
//     (rule 3), because a hand may mean either. **The allowance's amount is
//     the page's** when it says one (`Add ½″ seam allowance`, which the sheet
//     already reads), else the ink's own offset at the drawing's scale, and
//     said to be the ink's; where both are, the page rules and the ink's is
//     said beside it.
//   - **A fold halves the piece.** The drawn piece is one half; opened, it is
//     twice as wide across the fold.
//   - **What each mark comes to.** The grain along which side; each notch how
//     far in from its nearer corner; each dart how wide at the edge and how
//     long. All measured by the piece's own solved sides — an affine map of the
//     ink's corners onto the true ones — never by the ink's pixels against a
//     ruler.
//   - **True size prints them** (`garmentDecor`, drawn by truesize.ts): the
//     cutting line dashed exactly the allowance out from the outline, the grain
//     line at its length with a head at each end, the notches, the darts, the
//     fold marked and said.
//
// Rectangles and triangles: the figures the solver can fix from their labels
// and true size can draw. A piece the solver cannot fix — a bodice with a
// curved edge is no polygon of labelled sides — says its marks and no sizes.
// Tier 1: no model computes a number. Nothing here enters the log.

import type { Bounds, Point } from '../types';
import type { SessionState } from '../session/session';
import { NOTATION_FLOOR } from '../notations/notation';
import type { GarmentMark } from '../notations/garment';
import { PARALLEL_DEG, readGarment } from '../notations/garment';
import type { Figure, FigureKind } from './dimension';
import type { BoardMaths, FigureMaths } from './solve';
import type { LengthUnit } from './quantity';
import { convertQuantity, formatNumber, formatQuantity, isRange, unitSuffix } from './quantity';

// ===== What it says =====

export interface GarmentDims {
  width: number;
  height: number;
}

/** A piece's seam allowance, in its drawing's unit. */
export interface GarmentSeam {
  /** The cutting line's mark. */
  id: string;
  /** How far the cutting line stands off the piece: the page's, else the ink's. */
  amount: number;
  from: 'page' | 'ink';
  /** The ink's own offset at the drawing's scale, when the drawing has one — said beside the page's when they differ. */
  ink?: number;
  /** The piece at its sewing line, and at its cutting line — sizes, for a rectangle. */
  sewn?: GarmentDims;
  cut?: GarmentDims;
  /** The other reading of the numbers, when they might be either: `or, if 18 × 26″ is the finished size, cut at 19 × 27″`. */
  or?: string;
  reason: string;
}

/** A fold: the drawn piece is one half. */
export interface GarmentFold {
  id: string;
  /** Which side of the piece it is along (the figure's own side numbers). */
  side: number;
  /** For a rectangle: how wide the drawn piece is across the fold, and how wide it opens to. */
  drawn?: number;
  opened?: number;
  reason: string;
}

export interface GarmentNotchMaths {
  id: string;
  side: number;
  /** How far in from the nearer corner of its side, in the drawing's unit. */
  along: number;
  /** How far along the side it stands, 0–1, from the side's first corner. */
  at: number;
}

export interface GarmentDartMaths {
  id: string;
  side: number;
  width: number;
  depth: number;
}

/** What one pattern piece comes to on the board. */
export interface GarmentPieceMaths {
  /** The piece's mark: its outline, at the sewing line. */
  id: string;
  /** Every mark of it: the outline, the cutting line, the grain line, the fold, the notches, the darts, and the heads drawn apart. */
  ids: string[];
  name?: string;
  /** The figure the numbers are written on — the piece's own outline, or its cutting line — and which. Unset when no number is. */
  figure?: { id: string; kind: FigureKind; on: 'sewing' | 'cutting' };
  unit: LengthUnit | null;
  seam?: GarmentSeam;
  fold?: GarmentFold;
  grain?: { id: string; text: string; along?: number };
  notches: GarmentNotchMaths[];
  darts: GarmentDartMaths[];
  /** Plain lines for the person, and every value with its reason behind them. */
  lines: string[];
  rows: { k: string; v: string; why?: string }[];
  /** The piece and its cutting line, as the ink stands: where a chip is placed. */
  bounds: Bounds;
  /** The ink's geometry that true size maps onto the true figure, in canvas units. */
  ink: {
    vertices: Point[];
    grain?: { from: Point; to: Point };
    notches: { from: Point; to: Point }[];
    darts: { base: [Point, Point]; apex: Point }[];
    fold?: { from: Point; to: Point };
  };
}

/** The ink's offset is said beside the page's when they differ by more than this share of the page's. */
export const INK_AGREES = 0.1;

// ===== Geometry =====

const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a: Point, k: number): Point => ({ x: a.x * k, y: a.y * k });
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const cross = (a: Point, b: Point) => a.x * b.y - a.y * b.x;
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;
const norm = (a: Point): Point => {
  const l = Math.hypot(a.x, a.y);
  return l > 1e-12 ? mul(a, 1 / l) : { x: 1, y: 0 };
};
const DEG = 180 / Math.PI;

export function signedArea(v: readonly Point[]): number {
  let a = 0;
  for (let i = 0; i < v.length; i++) a += cross(v[i], v[(i + 1) % v.length]);
  return a / 2;
}

/**
 * A convex polygon offset by `d` — outward when positive, inward when
 * negative — every side moved out along its own normal and each corner the
 * meeting of its two moved sides. The seam allowance drawn true.
 */
export function offsetPolygon(v: readonly Point[], d: number): Point[] {
  const n = v.length;
  const s = Math.sign(signedArea(v)) || 1;
  const lines = v.map((a, i) => {
    const e = norm(sub(v[(i + 1) % n], a));
    const normal = s > 0 ? { x: e.y, y: -e.x } : { x: -e.y, y: e.x };
    return { p: add(a, mul(normal, d)), e };
  });
  return v.map((_, i) => {
    const l1 = lines[(i + n - 1) % n], l2 = lines[i];
    const den = cross(l1.e, l2.e);
    if (Math.abs(den) < 1e-9) return l2.p;
    const t = cross(sub(l2.p, l1.p), l2.e) / den;
    return add(l1.p, mul(l1.e, t));
  });
}

/** An affine map: x′ = a·x + b·y + c, y′ = d·x + e·y + f. */
export interface Affine {
  a: number; b: number; c: number;
  d: number; e: number; f: number;
}

/** The affine map that carries `from` onto `to` — exactly for three points, least squares for more. */
export function affineFit(from: readonly Point[], to: readonly Point[]): Affine | null {
  if (from.length < 3 || from.length !== to.length) return null;
  // Normal equations for [x y 1]·[a b c]ᵀ = x′ and the same for y′.
  const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const rx = [0, 0, 0], ry = [0, 0, 0];
  from.forEach((p, i) => {
    const row = [p.x, p.y, 1];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) M[r][c] += row[r] * row[c];
      rx[r] += row[r] * to[i].x;
      ry[r] += row[r] * to[i].y;
    }
  });
  const solve = (rhs: number[]): number[] | null => {
    const A = M.map((r, i) => [...r, rhs[i]]);
    for (let i = 0; i < 3; i++) {
      let p = i;
      for (let r = i + 1; r < 3; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
      if (Math.abs(A[p][i]) < 1e-9) return null;
      [A[i], A[p]] = [A[p], A[i]];
      for (let r = 0; r < 3; r++) {
        if (r === i) continue;
        const k = A[r][i] / A[i][i];
        for (let c = i; c < 4; c++) A[r][c] -= k * A[i][c];
      }
    }
    return [A[0][3] / A[0][0], A[1][3] / A[1][1], A[2][3] / A[2][2]];
  };
  const x = solve(rx), y = solve(ry);
  return x && y ? { a: x[0], b: x[1], c: x[2], d: y[0], e: y[1], f: y[2] } : null;
}

export const applyAffine = (m: Affine, p: Point): Point => ({ x: m.a * p.x + m.b * p.y + m.c, y: m.d * p.x + m.e * p.y + m.f });

/** The side of a polygon nearest a point, and how far along it the point falls (0–1). */
function sideNear(v: readonly Point[], p: Point): { side: number; at: number; d: number } {
  let best = { side: 0, at: 0, d: Infinity };
  for (let i = 0; i < v.length; i++) {
    const a = v[i], b = v[(i + 1) % v.length], ab = sub(b, a), l2 = dot(ab, ab);
    const t = l2 > 0 ? Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2)) : 0;
    const d = dist(p, add(a, mul(ab, t)));
    if (d < best.d) best = { side: i, at: t, d };
  }
  return best;
}

// ===== A figure's true frame =====

/** A rectangle's width is the pair of sides the ink draws level — truesize.ts's `widthPair`, read the same way. */
function widePair(f: Figure): number[] {
  const horizontal = (k: number) => Math.abs(f.sides[k].to.x - f.sides[k].from.x) >= Math.abs(f.sides[k].to.y - f.sides[k].from.y);
  const evenWide = horizontal(0) || (!horizontal(1) && f.sides[0].length >= f.sides[1].length);
  return evenWide ? [0, 2] : [1, 3];
}

/** What a labelled polygon figure is, in its drawing's unit: each side's true length, and the corners laid out flat. */
interface TrueFrame {
  fm: FigureMaths;
  kind: 'rectangle' | 'triangle';
  unit: LengthUnit;
  /** Side k's true length, from corner k to corner k + 1. */
  lengths: number[];
  /** The corners, in the ink's order, laid at the origin — for measuring, not for drawing. */
  truth: Point[];
  ink: Point[];
  map: Affine;
}

function labelled(fm: FigureMaths | undefined): fm is FigureMaths {
  return !!fm && !!fm.solution.unit && fm.solution.readings.length > 0 && fm.labels.some((l) => !l.declared);
}

function frameOf(fm: FigureMaths): TrueFrame | null {
  const reading = fm.solution.readings[0];
  const unit = fm.solution.unit;
  if (!reading || !unit) return null;
  const val = (key: string) => {
    const v = reading.values.find((x) => x.key === key)?.value;
    return v && !isRange(v) && v.lo > 0 ? v.lo : NaN;
  };
  const f = fm.figure;
  if (f.kind === 'rectangle' && f.vertices.length === 4) {
    const wide = widePair(f);
    const lengths = [0, 1, 2, 3].map((k) => val(wide.includes(k) ? 'width' : 'height'));
    if (lengths.some((x) => !(x > 0))) return null;
    const truth = [{ x: 0, y: 0 }, { x: lengths[0], y: 0 }, { x: lengths[0], y: lengths[1] }, { x: 0, y: lengths[1] }];
    const map = affineFit(f.vertices, truth);
    return map ? { fm, kind: 'rectangle', unit, lengths, truth, ink: f.vertices, map } : null;
  }
  if (f.kind === 'triangle' && f.vertices.length === 3) {
    const lengths = [0, 1, 2].map((k) => val(`side${k}`));
    if (lengths.some((x) => !(x > 0))) return null;
    const [l0, l1, l2] = lengths;
    const x = (l0 * l0 + l2 * l2 - l1 * l1) / (2 * l0), y = Math.sqrt(Math.max(0, l2 * l2 - x * x));
    const truth = [{ x: 0, y: 0 }, { x: l0, y: 0 }, { x, y }];
    const map = affineFit(f.vertices, truth);
    return map ? { fm, kind: 'triangle', unit, lengths, truth, ink: f.vertices, map } : null;
  }
  return null;
}

// ===== Words =====

const num = (v: number) => formatNumber(v, 2);
const dims = (d: GarmentDims, unit: LengthUnit | null) => `${num(d.width)} × ${num(d.height)}${unitSuffix(unit, 1)}`;
const len = (v: number, unit: LengthUnit | null) => `${num(v)}${unitSuffix(unit, 1)}`;

function sideName(frame: TrueFrame, k: number): string {
  return `${len(frame.lengths[k], frame.unit)} side`;
}

// ===== The board's =====

/**
 * What the pattern pieces of a board come to: for each piece the notation
 * reads above its floor, its sizes, its fold, its marks' numbers, in plain
 * lines with every value's reason behind. Reads the session's notation and the
 * solved board and changes nothing in either.
 */
export function garmentMaths(state: SessionState, board: BoardMaths): GarmentPieceMaths[] {
  const reading = readGarment(state);
  if (!reading || reading.confidence < NOTATION_FLOOR) return [];
  const figureOf = (id: string) => board.figures.find((f) => f.figure.ids.length === 1 && f.figure.ids[0] === id);
  const allowance = (() => {
    for (const e of board.sheet.entries) if (e.kind === 'heading' && e.allowance && !isRange(e.allowance.amount)) return e.allowance;
    return null;
  })();
  const out: GarmentPieceMaths[] = [];
  for (const piece of reading.symbols.filter((s) => s.symbol === 'piece')) {
    const own = reading.symbols.filter((s) => s.piece === piece.id);
    const of = (symbol: string) => own.filter((s) => s.symbol === symbol);
    const seamMark = of('seam')[0];
    const ids = [...new Set([piece.id, ...own.flatMap((s) => s.ids)])];
    const bounds = [piece, seamMark].filter((s): s is GarmentMark => !!s).reduce<Bounds>(
      (b, s) => ({ minX: Math.min(b.minX, s.bounds.minX), maxX: Math.max(b.maxX, s.bounds.maxX), minY: Math.min(b.minY, s.bounds.minY), maxY: Math.max(b.maxY, s.bounds.maxY) }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    );

    // Which outline the numbers are on: the piece's own, else its cutting line's.
    const fmP = figureOf(piece.id), fmS = seamMark ? figureOf(seamMark.id) : undefined;
    const numbers = labelled(fmP) ? { fm: fmP, on: 'sewing' as const } : labelled(fmS) ? { fm: fmS, on: 'cutting' as const } : null;
    const frame = numbers ? frameOf(numbers.fm) : null;
    const unit = numbers?.fm.solution.unit ?? null;
    const lines: string[] = [];
    const rows: GarmentPieceMaths['rows'] = [];
    const result: GarmentPieceMaths = {
      id: piece.id, ids, ...(piece.name?.text ? { name: piece.name.text } : {}),
      ...(numbers ? { figure: { id: numbers.fm.figure.id, kind: numbers.fm.figure.kind, on: numbers.on } } : {}),
      unit, notches: [], darts: [], lines, rows, bounds,
      ink: { vertices: numbers ? numbers.fm.figure.vertices.map((p) => ({ x: p.x, y: p.y })) : [], notches: [], darts: [] },
    };

    // The seam allowance.
    if (seamMark && numbers) {
      const fm = numbers.fm;
      const scale = fm.drawing?.scale?.unitsPerCanvasUnit;
      const ink = seamMark.offset !== undefined && scale ? seamMark.offset * scale : undefined;
      const page = allowance ? (allowance.amount.unit && allowance.amount.unit !== unit && unit ? convertQuantity(allowance.amount, unit).quantity : allowance.amount) : null;
      const amount = page ? page.lo : ink;
      if (amount !== undefined && amount > 0) {
        const from: 'page' | 'ink' = page ? 'page' : 'ink';
        const said = page ? formatQuantity(page) : len(amount, unit);
        const seam: GarmentSeam = { id: seamMark.id, amount, from, ...(ink !== undefined ? { ink } : {}), reason: '' };
        if (frame?.kind === 'rectangle') {
          const w = frame.lengths[widePair(fm.figure)[0]], h = frame.lengths[widePair(fm.figure)[0] === 0 ? 1 : 0];
          const grown = (k: number): GarmentDims => ({ width: w + 2 * k, height: h + 2 * k });
          if (numbers.on === 'sewing') {
            seam.sewn = { width: w, height: h };
            seam.cut = grown(amount);
          } else {
            seam.cut = { width: w, height: h };
            seam.sewn = grown(-amount);
            seam.or = `or, if ${dims(seam.cut, unit)} is the finished size, cut at ${dims(grown(amount), unit)}`;
          }
        }
        const because = from === 'page' ? ', as the page says' : ', as the ink draws it';
        seam.reason = from === 'page' ? `${said} — the page's allowance` : `${len(amount, unit)} — the ink's own offset at the drawing's scale`;
        result.seam = seam;
        if (seam.cut && seam.sewn) {
          lines.push(`cut at ${dims(seam.cut, unit)}, sewn at ${dims(seam.sewn, unit)} — ${said} of seam allowance all round${because}`);
          rows.push({ k: 'cutting size', v: dims(seam.cut, unit), why: numbers.on === 'cutting' ? 'the numbers written on the cutting line' : `the sewing size and ${said} either side` });
          rows.push({ k: 'sewing size', v: dims(seam.sewn, unit), why: numbers.on === 'sewing' ? 'the numbers written on the piece' : `the cutting size less ${said} either side` });
          if (seam.or) rows.push({ k: 'or', v: seam.or.replace(/^or, /, '') });
        } else {
          lines.push(`the cutting line stands ${said} off the piece all round${because}`);
        }
        rows.push({ k: 'seam allowance', v: said, why: seam.reason });
        if (page && ink !== undefined && Math.abs(ink - page.lo) > INK_AGREES * page.lo) {
          lines.push(`the ink stands ${len(ink, unit)} off at this scale; the page says ${said} and rules`);
        }
      }
    }

    // A fold: the drawn piece is one half.
    const foldMark = of('fold')[0];
    if (foldMark && foldMark.from && foldMark.to) {
      result.ink.fold = { from: foldMark.from, to: foldMark.to };
      const verts = numbers?.fm.figure.vertices ?? [];
      const at = verts.length ? sideNear(verts, mid(foldMark.from, foldMark.to)) : null;
      const fold: GarmentFold = { id: foldMark.id, side: at?.side ?? 0, reason: 'a line with a head at each end along the edge' };
      if (frame?.kind === 'rectangle' && at) {
        fold.drawn = frame.lengths[(at.side + 1) % 4];
        fold.opened = 2 * fold.drawn;
        lines.push(`cut on the fold: opened, ${len(fold.opened, unit)} across (${len(fold.drawn, unit)} as drawn)`);
        rows.push({ k: 'on the fold', v: `${len(fold.opened, unit)} across opened`, why: `the piece is drawn as one half, ${len(fold.drawn, unit)} across the fold` });
      } else {
        lines.push('cut on the fold: the piece is drawn as one half');
      }
      result.fold = fold;
    }

    // The grain line.
    const grainMark = of('grain')[0];
    if (grainMark && grainMark.from && grainMark.to) {
      result.ink.grain = { from: grainMark.from, to: grainMark.to };
      let text = 'the grain runs on the bias';
      let along: number | undefined;
      if (frame) {
        const dir = sub(grainMark.to, grainMark.from);
        const angles = frame.ink.map((p, i) => Math.acos(Math.min(1, Math.abs(dot(norm(dir), norm(sub(frame.ink[(i + 1) % frame.ink.length], p)))))) * DEG);
        const k = angles.indexOf(Math.min(...angles));
        if (angles[k] <= PARALLEL_DEG) {
          along = k;
          // A rectangle's opposite sides are the same length: the grain runs along both.
          text = frame.kind === 'rectangle' ? `the grain runs along the ${len(frame.lengths[k], unit)} sides` : `the grain runs along the ${len(frame.lengths[k], unit)} side`;
        }
      }
      result.grain = { id: grainMark.id, text, ...(along !== undefined ? { along } : {}) };
      lines.push(text);
      rows.push({ k: 'grain', v: text.replace(/^the grain runs /, '') });
    }

    // Notches: how far in from the nearer corner of their side.
    for (const n of of('notch')) {
      if (!n.from || !n.to) continue;
      result.ink.notches.push({ from: n.from, to: n.to });
      if (!frame) continue;
      const m = sideNear(frame.ink, mid(n.from, n.to));
      const along = Math.min(m.at, 1 - m.at) * frame.lengths[m.side];
      result.notches.push({ id: n.id, side: m.side, along, at: m.at });
    }
    if (result.notches.length && frame) {
      const bySide = new Map<number, GarmentNotchMaths[]>();
      for (const n of result.notches) bySide.set(n.side, [...(bySide.get(n.side) ?? []), n]);
      const said = [...bySide].map(([side, ns]) => `${ns.map((n) => len(n.along, unit)).join(' and ')} in from the nearer corner of the ${sideName(frame, side)}`);
      lines.push(`${result.notches.length} ${result.notches.length === 1 ? 'notch' : 'notches'}: ${said.join('; ')}`);
      for (const n of result.notches) rows.push({ k: 'notch', v: `${len(n.along, unit)} from the nearer corner`, why: `${num(n.at * 100)}% of the way along the ${sideName(frame, n.side)}` });
    }

    // Darts: how wide at the edge, how long.
    for (const d of of('dart')) {
      if (!d.base || !d.apex) continue;
      result.ink.darts.push({ base: d.base, apex: d.apex });
      if (!frame) continue;
      const [a, b, p] = [applyAffine(frame.map, d.base[0]), applyAffine(frame.map, d.base[1]), applyAffine(frame.map, d.apex)];
      result.darts.push({ id: d.id, side: sideNear(frame.ink, mid(d.base[0], d.base[1])).side, width: dist(a, b), depth: dist(p, mid(a, b)) });
    }
    if (result.darts.length) {
      const said = result.darts.map((d) => `a dart ${len(d.width, unit)} wide and ${len(d.depth, unit)} long`);
      lines.push(result.darts.length === 1 ? said[0] : `${result.darts.length} darts: ${said.join(', ')}`);
      for (const d of result.darts) rows.push({ k: 'dart', v: `${len(d.width, unit)} wide, ${len(d.depth, unit)} long`, why: 'measured on the piece’s true sides, from the ink’s corners' });
    }

    if (lines.length || result.seam || result.fold) out.push(result);
    else if (numbers || own.length) out.push(result);
  }
  return out;
}

// ===== What true size prints =====

/** A mark true size draws for a piece, in the document's coordinates. */
export interface GarmentDrawn {
  kind: 'seam' | 'grain' | 'notch' | 'dart' | 'fold';
  points: Point[];
  closed?: boolean;
  dashed?: boolean;
  /** Heads at the line's ends, each a short open polyline. */
  heads?: Point[][];
}

export interface GarmentDecor {
  marks: GarmentDrawn[];
  /** Short words set on the marks: where, and what they say. */
  texts: { text: string; at: Point; angle: number; key: string }[];
  /** For the figure's notes, and a clause for the title. */
  notes: string[];
  title?: string;
}

const chevron = (tip: Point, back: Point, size: number): Point[] => {
  const u = norm(sub(back, tip));
  const rot = (a: number): Point => ({ x: u.x * Math.cos(a) - u.y * Math.sin(a), y: u.x * Math.sin(a) + u.y * Math.cos(a) });
  const a = 28 / DEG;
  return [add(tip, mul(rot(a), size)), tip, add(tip, mul(rot(-a), size))];
};

/**
 * What true size draws for a piece on the figure it was laid out as: the
 * figure's true corners in the document (`truth`, the ink's order), the
 * document units a figure unit comes to, and the furniture's sizes. Never
 * for a piece whose numbers fix no polygon.
 */
export function garmentDecor(piece: GarmentPieceMaths, truth: readonly Point[], opts: { factor: number; head: number; tick: number; gap: number }): GarmentDecor | null {
  const map = piece.ink.vertices.length === truth.length ? affineFit(piece.ink.vertices, truth) : null;
  if (!map || !piece.figure) return null;
  const at = (p: Point) => applyAffine(map, p);
  const marks: GarmentDrawn[] = [];
  const texts: GarmentDecor['texts'] = [];
  const notes: string[] = [];
  let title: string | undefined;
  const unit = piece.unit;

  // The other outline, dashed: the cutting line the allowance out, or the sewing line in.
  if (piece.seam) {
    const d = piece.seam.amount * opts.factor * (piece.figure.on === 'sewing' ? 1 : -1);
    const ring = offsetPolygon(truth, d);
    marks.push({ kind: 'seam', points: ring, closed: true, dashed: true });
    const top = ring.reduce((b, p) => (p.y < b.y ? p : b), ring[0]);
    texts.push({ text: piece.figure.on === 'sewing' ? `cutting line +${len(piece.seam.amount, unit)}` : `sewing line −${len(piece.seam.amount, unit)}`, at: { x: top.x, y: top.y - opts.gap }, angle: 0, key: 'seam' });
  }

  // The grain line: a shaft at its length with a head at each end.
  if (piece.ink.grain) {
    const a = at(piece.ink.grain.from), b = at(piece.ink.grain.to);
    marks.push({ kind: 'grain', points: [a, b], heads: [chevron(a, b, opts.head), chevron(b, a, opts.head)] });
    const c = mid(a, b);
    const u = norm(sub(b, a));
    texts.push({ text: 'grain', at: add(c, { x: -u.y * opts.gap * 1.6, y: u.x * opts.gap * 1.6 }), angle: 0, key: 'grain' });
  }

  // Notches: a tick across the outline where the ink's stands.
  for (const n of piece.ink.notches) {
    const a = at(n.from), b = at(n.to), c = mid(a, b);
    const u = norm(sub(b, a));
    marks.push({ kind: 'notch', points: [sub(c, mul(u, opts.tick / 2)), add(c, mul(u, opts.tick / 2))] });
  }

  // Darts: the wedge, where the ink's stands.
  for (const d of piece.ink.darts) marks.push({ kind: 'dart', points: [at(d.base[0]), at(d.apex), at(d.base[1])] });

  // A fold: the edge it is along is marked, and the piece is said to be half.
  if (piece.ink.fold && piece.fold) {
    const k = piece.fold.side;
    const a = truth[k], b = truth[(k + 1) % truth.length];
    const s = Math.sign(signedArea(truth)) || 1;
    const e = norm(sub(b, a));
    const out = s > 0 ? { x: e.y, y: -e.x } : { x: -e.y, y: e.x };
    const off = opts.head * 1.6;
    const p = add(add(a, mul(e, 0.05 * dist(a, b))), mul(out, off)), q = add(sub(b, mul(e, 0.05 * dist(a, b))), mul(out, off));
    marks.push({ kind: 'fold', points: [p, q], heads: [chevron(p, q, opts.head), chevron(q, p, opts.head)] });
    texts.push({ text: 'fold', at: add(mid(p, q), mul(out, opts.gap * 1.6)), angle: 0, key: 'fold' });
    if (piece.fold.opened !== undefined && piece.fold.drawn !== undefined) {
      notes.push(`cut on the fold — opened it is ${len(piece.fold.opened, unit)} across (${len(piece.fold.drawn, unit)} as drawn, half of it)`);
      title = `cut on the fold, opened ${len(piece.fold.opened, unit)} across`;
    } else {
      notes.push('cut on the fold — the piece is drawn as one half');
      title = 'cut on the fold';
    }
  }
  if (piece.seam && piece.figure.on === 'cutting') notes.push(`the numbers are on the cutting line; the sewing line is ${len(piece.seam.amount, unit)} in from it${piece.seam.or ? ` (${piece.seam.or})` : ''}`);
  return { marks, texts, notes, ...(title ? { title } : {}) };
}


/** What one figure of the board is, if it is a piece's: the piece whose numbers it carries. */
export function pieceOfFigure(board: BoardMaths, figureId: string): GarmentPieceMaths | undefined {
  return board.garment?.find((g) => g.figure?.id === figureId);
}

/** The marks that are a labelled piece's own and no figure of their own to draw: its other outline, its grain line, its notches, its darts. */
export function garmentOwned(board: BoardMaths): Set<string> {
  const out = new Set<string>();
  for (const g of board.garment ?? []) if (g.figure) for (const id of g.ids) out.add(id);
  return out;
}

// The maths on the board — what a surface says beside a figure and a page
// (DIRECTOR-PLAN-W2 M5; V1-PLAN A4; MATHS-PLAN §4 "The surface").
//
// The solver (solve.ts) and the sheet (sheet.ts) derive numbers; this decides
// what is SAID of them and where, as data a surface only draws, so the rules
// are asked in Node:
//
//   - **Beside their figure, never on a card** (the 15 Sep notes, §6). A side
//     the labels fix is a chip beside the middle of that side, on the outside
//     where a label would stand; a label that cannot hold is a chip inside,
//     carrying the solver's own sentence (*labelled 24; legs of 24 and 8 make
//     it 25.30, 1.30 longer (5%)*); a step's check is a chip at the right of
//     its own line (*✓ 14″*, *✗ 12 · written 15*).
//   - **A chip that is a problem stands; one that is only an answer does not**
//     (`standing`). The surface shows every chip for a moment after a change
//     and while the hand is on its marks; a disagreement — a label that cannot
//     hold, a written result that is off, a step with no value — stays, because
//     it is worth a look at rest (colour is signal), where a derived side is
//     something the hand asked to see. Both are always in the panel
//     (`mathsSaid`).
//   - **Plural, with the disagreement said.** A step read two ways carries its
//     other reading (*✓ 48″ · or 46″*); the sentence for the panel says each.
//   - **Derived only.** Nothing here writes a mark, a label or an event: the
//     numbers are a pure function of the log, so a changed measurement changes
//     exactly the chips that depend on it (`diffSheets` is the oracle) and undo
//     puts them back.
//
// And `=` typed in the field is a sum against the page (`evaluateTyped`): the
// page's own definitions resolve its names, and what it says is what the
// canvas would put on the board as text.

import type { Point } from '../types';
import type { Session, SessionEvent, SessionState } from '../session/session';
import { figuresOf } from '../diagram/figures';
import { boundsOf, getRep, transcriptOf } from '../session/nodes';
import { MarkGrid, finiteBounds } from '../relate/grid';
import { reachAround, withinReach } from '../relate/relations';
import { boundingBoxDistance } from '../geometry';
import type { BoardDimensions, BoardNumber } from './dimension';
import { numbersOf } from './dimension';
import { sheetLines } from './gather';
import { checkWritten, readSheet } from './sheet';
import type { CheckEntry, Sheet, StepEntry } from './sheet';
import type { ChainReading } from './expr';
import { rectanglePairs, solveBoard } from './solve';
import { garmentMaths, garmentNotFigures, garmentOf } from './garment';
import type { BoardMaths, Conflict, FigureMaths, SolvedValue } from './solve';
import { formatNumber, formatQuantity, unitSuffix } from './quantity';
import type { Quantity } from './quantity';

// ===== Which ink a number can be about =====

/** The most marks one drawing beside a number is walked to: a doodle that big is not a figure. */
export const BESIDE_MAX = 600;
/**
 * A number can be about a mark within this many of the mark's own sizes of it: a label attaches to a
 * side up to about three quarters of that side's length from its middle (`ATTACH_FLOOR` in dimension.ts),
 * and no side is longer than the mark's own diagonal. Generous, since a mark too far only costs a look.
 */
const ATTACH_REACH = 2;

const isWriting = (state: SessionState, id: string): boolean => {
  const n = state.nodes.get(id);
  return !!n && !!transcriptOf(n);
};

/**
 * The ink beside the numbers: every mark a number can be about (within `ATTACH_REACH` of the mark's own
 * size of it), and the drawings those marks hang together with, walked outwards by within-reach links —
 * the links a ruled figure's strokes meet by. In the board's order, and no more than `BESIDE_MAX`.
 */
function drawingsBeside(state: SessionState, numbers: readonly BoardNumber[]): string[] {
  const artifacts = new Set(state.artifacts);
  const grid = new MarkGrid();
  const order = new Map<string, number>();
  state.contentIds.forEach((id, i) => {
    if (artifacts.has(id)) return;
    const n = state.nodes.get(id);
    const b = n && !getRep(n, 'erased') ? boundsOf(n) : undefined;
    if (!b || !finiteBounds(b)) return;
    grid.set(id, b);
    order.set(id, i);
  });
  const seen = new Set<string>();
  const queue: string[] = [];
  for (const id of order.keys()) {
    const b = grid.boundsOf(id)!;
    const size = Math.max(1, b.maxX - b.minX, b.maxY - b.minY);
    for (const num of numbers) {
      if (boundingBoxDistance(num.bounds, b) <= ATTACH_REACH * size) { seen.add(id); queue.push(id); break; }
    }
  }
  for (let q = 0; q < queue.length && seen.size < BESIDE_MAX; q++) {
    const b = grid.boundsOf(queue[q])!;
    const r = reachAround(b);
    for (const o of grid.query({ minX: b.minX - r, minY: b.minY - r, maxX: b.maxX + r, maxY: b.maxY + r })) {
      if (seen.has(o) || !withinReach(b, grid.boundsOf(o)!)) continue;
      seen.add(o);
      queue.push(o);
    }
  }
  return [...seen].sort((a, b) => order.get(a)! - order.get(b)!);
}

// ===== The board's maths, kept while its log stands =====

/** A page and no figure: nothing stands on a mark, so nothing was placed. */
function emptyDimensions(): BoardDimensions {
  return { figures: [], numbers: [], attachments: [], labels: new Map(), rightAngles: [], underlines: [], drawings: [], numberIds: new Set() };
}

/**
 * The board's maths, or null when there is none to say: no number stands on a
 * mark and no line of the page is a definition, a step or a check. Figures are
 * the strokes' own and the lines whose ends meet (`figuresOf`); each is solved
 * on its own. Reads the session and changes nothing in it — and pays nothing
 * for a board with no numbers and no page, however many marks it holds.
 */
export function boardMaths(state: SessionState): BoardMaths | null {
  const numbers = numbersOf(state);
  if (numbers.length) {
    // Only the ink a number can be about is read for figures: the dimensions and the solver walk every
    // figure against every other, and on a board of two thousand marks with one number on it that was two
    // seconds a stroke. A figure a number is not written beside has nothing to say.
    const ink = drawingsBeside(state, numbers);
    const near = new Set(ink);
    const keep = new Set(state.artifacts);
    const narrowed = {
      ...state,
      contentIds: state.contentIds.filter((id) => near.has(id) || keep.has(id) || isWriting(state, id)),
    };
    // A pattern piece among the figures says what its cutting line, fold and marks come to (M6); its notches,
    // darts and fold are no figures of their own to solve, or a tick across an edge would divide it into parts.
    const piece = garmentOf(narrowed);
    const apart = piece ? garmentNotFigures(piece) : null;
    const solving = apart ? { ...narrowed, contentIds: narrowed.contentIds.filter((id) => !apart.has(id)) } : narrowed;
    const solved = solveBoard(solving, { figures: figuresOf(solving) });
    const garment = piece ? garmentMaths(narrowed, solved, piece) : [];
    return garment.length ? { ...solved, garment } : solved;
  }
  // No number stands on a mark, so none is left out of the page.
  const sheet = readSheet(sheetLines(state, { except: [] }));
  if (!sheet.entries.some((e) => e.kind !== 'heading' && e.kind !== 'note')) return null;
  return { dimensions: emptyDimensions(), sheet, figures: [] };
}

type Memo = { events: readonly SessionEvent[]; length: number; last: SessionEvent | undefined; board: BoardMaths | null };
let memo: Memo | null = null;

/**
 * `boardMaths` for a session, kept while its log stands: which events array it
 * holds (undo and load replace it), how long it is and which event ends it — the
 * one key the surface keeps everything it derives from the log by. The field
 * asks on every keystroke and a paint on every change; the board is read once.
 */
export function boardMathsOf(session: Pick<Session, 'getState' | 'getEvents'>): BoardMaths | null {
  const events = session.getEvents();
  const last = events.length ? events[events.length - 1] : undefined;
  if (memo && memo.events === events && memo.length === events.length && memo.last === last) return memo.board;
  const board = boardMaths(session.getState());
  memo = { events, length: events.length, last, board };
  return board;
}

// ===== Chips =====

export type MathsChipKind = 'side' | 'measure' | 'conflict' | 'step' | 'scale' | 'garment';

/** One thing said beside a figure or a page: a surface draws it and decides when. */
export interface MathsChip {
  /** Stable while the thing it says is about the same: what changed is found by it. */
  key: string;
  kind: MathsChipKind;
  /** What it says: `25.30″`, `✓ 14″`, `labelled 24; legs of 24 and 8 make it 25.30, 1.30 longer (5%)`. */
  text: string;
  /** Where it stands, in canvas units: its centre, or its left end when `align` says so. */
  at: Point;
  align: 'centre' | 'left';
  /**
   * A chip beside a side stands off a point on the figure (`from`) in a direction
   * (`away`, a unit vector): `at` is where that puts a small chip, and a surface that
   * knows the chip's own size stands it just clear of the line it speaks of — a wide
   * sentence beside a short side would otherwise lie across it.
   */
  from?: Point;
  away?: Point;
  /** The marks it is about — the figure's, the numbers written on it, the page's text: pointing at any of them brings it up. */
  ids: string[];
  /** A problem, not an answer: it stays when the moment is over. */
  standing: boolean;
  /** Why, with the formula: for the panel and the tooltip. */
  reason: string;
}

/** How far a chip stands off the middle of its side, in canvas units: past where a label is written. */
export const CHIP_OFFSET = 28;
/** How far right of its own line a step's chip stands. */
export const STEP_GAP = 14;

const fmt = (q: Quantity | null | undefined) => (q ? formatQuantity(q) : 'no value');
const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Every mark a figure stands for: the ink that drew it and the numbers written on it. */
export function marksOfFigure(fm: FigureMaths): string[] {
  return [...new Set([...fm.figure.ids, ...fm.labels.flatMap((l) => l.ids)])];
}

/** Where a key stands on a figure: the middle of its side (or of the part of a side), and which way that side runs. */
export function placeOf(fm: FigureMaths, key: string): { at: Point; dir: Point } | null {
  const [base, part] = key.split('.');
  const side = fm.figure.sides.find((s) => s.key === base);
  if (!side) return null;
  const seg = part ? side.parts?.find((x) => x.key === key) : side;
  if (!seg) return null;
  const dx = seg.to.x - seg.from.x, dy = seg.to.y - seg.from.y, l = Math.hypot(dx, dy);
  return { at: mid(seg.from, seg.to), dir: l > 1e-9 ? { x: dx / l, y: dy / l } : { x: 1, y: 0 } };
}

/**
 * The unit vector that stands off a side, away from what the figure encloses: the side's own
 * normal on the far side from the figure's middle — not the direction from the middle to the
 * side's middle, which on a long low triangle points along the figure and off its side. A line
 * has no inside: it stands on the upper side of the screen.
 */
export function outwardFrom(fm: FigureMaths, place: { at: Point; dir: Point }): Point {
  const f = fm.figure;
  let n = { x: place.dir.y, y: -place.dir.x };
  const inside = f.kind === 'circle' && f.centre ? f.centre : f.kind === 'arc' && f.vertices[2] ? f.vertices[2] : f.closed && f.vertices.length ? { x: f.vertices.reduce((a, p) => a + p.x, 0) / f.vertices.length, y: f.vertices.reduce((a, p) => a + p.y, 0) / f.vertices.length } : null;
  if (inside) {
    const d = (place.at.x - inside.x) * n.x + (place.at.y - inside.y) * n.y;
    if (d < 0) n = { x: -n.x, y: -n.y };
    // A side through the middle (a circle's radius): either way is off it; keep the upper.
    else if (d === 0 && (n.y > 0 || (n.y === 0 && n.x > 0))) n = { x: -n.x, y: -n.y };
    return n;
  }
  return n.y > 0 || (n.y === 0 && n.x > 0) ? { x: -n.x, y: -n.y } : n;
}

/**
 * A quantity's key (MATHS-SPEC §4, M17): what a value on a figure is, for its colour and for the fill-in that is
 * about it — `fig:<figureId>:<valueKey>`, the value key being the solver's own ('side0', 'angle1', 'area', 'radius').
 */
export const quantityKeyOf = (figureId: string, valueKey: string): string => `fig:${figureId}:${valueKey}`;

/**
 * The marks a value on a figure is about (M16): a side's — or a part of one — is the marks that drew that side; an
 * angle's are the two sides that meet at its corner; a rectangle's width or height is the sides it runs along; and
 * every other measure (area, perimeter, a diagonal, a circle's or an arc's) is about the figure's marks whole.
 * Unlike a chip's `ids` (`marksOfFigure`), the numbers written on the figure are not among them.
 */
export function marksOfValue(fm: FigureMaths, key: string): string[] {
  const f = fm.figure;
  const side = /^side(\d+)(?:\.part\d+)?$/.exec(key);
  if (side) return [...(f.sides[Number(side[1])]?.ids ?? f.ids)];
  const angle = /^angle(\d+)$/.exec(key);
  if (angle && f.sides.length >= 2) {
    const k = Number(angle[1]), n = f.sides.length;
    return [...new Set([...(f.sides[(k - 1 + n) % n]?.ids ?? []), ...(f.sides[k % n]?.ids ?? [])])];
  }
  if (f.kind === 'rectangle' && (key === 'width' || key === 'height')) {
    const pair = rectanglePairs(f);
    return [...new Set((key === 'width' ? pair.width : pair.height).flatMap((k) => f.sides.find((s) => s.key === k)?.ids ?? []))];
  }
  return [...f.ids];
}

/** The measures that belong to no side, said one under another below their figure. */
const SAID_BELOW: ReadonlySet<string> = new Set(['diagonal', 'circumference', 'arc']);

/** Why a derived value is what it is: the solver's own words, which say what it is and how. */
const derivedReason = (v: SolvedValue): string => v.reason;

function figureChips(board: BoardMaths): MathsChip[] {
  const out: MathsChip[] = [];
  const scaled = new Set<string>();
  for (const fm of board.figures) {
    const top = fm.solution.readings[0];
    const ids = marksOfFigure(fm);
    const bounds = fm.figure.outline.length ? fm.figure.outline : fm.figure.vertices;
    const box = {
      minX: Math.min(...bounds.map((p) => p.x)), maxX: Math.max(...bounds.map((p) => p.x)),
      minY: Math.min(...bounds.map((p) => p.y)), maxY: Math.max(...bounds.map((p) => p.y)),
    };
    let below = 0;
    if (top) {
      // A side a label cannot hold is said once, by the conflict — which carries its number.
      const contested = new Set(top.conflicts.map((c) => c.key));
      for (const v of top.values) {
        if (v.from !== 'derived' || contested.has(v.key)) continue;
        const there = placeOf(fm, v.key);
        if (there) {
          const n = outwardFrom(fm, there);
          out.push({
            key: `side:${fm.figure.id}:${v.key}`, kind: 'side', text: v.text, ids,
            at: { x: there.at.x + n.x * CHIP_OFFSET, y: there.at.y + n.y * CHIP_OFFSET }, align: 'centre', from: there.at, away: n,
            standing: false, reason: derivedReason(v),
          });
        } else if (SAID_BELOW.has(v.key)) {
          below++;
          out.push({
            key: `measure:${fm.figure.id}:${v.key}`, kind: 'measure', text: `${v.label} ${v.text}`, ids,
            at: { x: (box.minX + box.maxX) / 2, y: box.maxY + CHIP_OFFSET * below }, align: 'centre',
            standing: false, reason: derivedReason(v),
          });
        }
      }
      for (const c of top.conflicts) out.push(conflictChip(board, fm, c, ids));
    }
    // A drawing's scale, once, when more than one label says it: how the labels agree with the ink.
    const drawing = fm.drawing;
    if (drawing?.scale && drawing.scale.labels > 1 && !scaled.has(drawing.id)) {
      scaled.add(drawing.id);
      out.push({
        key: `scale:${drawing.id}`, kind: 'scale', text: drawing.scale.reason, ids: drawing.ids.length ? drawing.ids : ids,
        at: { x: box.minX, y: box.minY - CHIP_OFFSET }, align: 'left', standing: false, reason: drawing.scale.reason,
      });
    }
    // A step's value written on the figure that its step does not make: said beside the number.
    for (const l of fm.labels) {
      if (l.step === undefined || l.declared) continue;
      const check = checkWritten(board.sheet, String(l.step), l.value);
      if (!check || check.status !== 'off') continue;
      const num = board.dimensions.numbers.find((n) => n.id === l.number);
      if (!num) continue;
      out.push({
        key: `label:${fm.figure.id}:${l.number ?? l.text}`, kind: 'step', text: `✗ ${check.reason}`, ids: [...new Set([...l.ids, ...fm.figure.ids])],
        at: { x: num.bounds.maxX + STEP_GAP, y: (num.bounds.minY + num.bounds.maxY) / 2 }, align: 'left', standing: true, reason: check.reason,
      });
    }
  }
  return out;
}

/**
 * A label that cannot hold: the solver's own sentence, right of the number it is about — where the
 * hand looks — else inside its figure beside the side it is on.
 */
function conflictChip(board: BoardMaths, fm: FigureMaths, c: Conflict, ids: string[]): MathsChip {
  const all = [...new Set([...ids, ...c.ids])];
  const num = board.dimensions.numbers.find((n) => n.ids.some((id) => c.ids.includes(id)));
  const key = `conflict:${fm.figure.id}:${c.key}`;
  if (num) {
    return {
      key, kind: 'conflict', text: c.reason, ids: all,
      at: { x: num.bounds.maxX + STEP_GAP, y: (num.bounds.minY + num.bounds.maxY) / 2 }, align: 'left', standing: true, reason: c.reason,
    };
  }
  const v0 = fm.figure.vertices[0] ?? { x: 0, y: 0 };
  const there = placeOf(fm, c.key) ?? { at: v0, dir: { x: 1, y: 0 } };
  const n = outwardFrom(fm, there);
  return {
    key, kind: 'conflict', text: c.reason, ids: all,
    at: { x: there.at.x - n.x * CHIP_OFFSET, y: there.at.y - n.y * CHIP_OFFSET }, align: 'centre', from: there.at, away: { x: -n.x, y: -n.y },
    standing: true, reason: c.reason,
  };
}

/** What a step or a check says of itself, in the fewest characters. Null when it has no reading. */
function stepSaid(readings: readonly ChainReading[]): { text: string; standing: boolean } | null {
  const top = readings[0];
  if (!top) return null;
  if (!top.value) {
    const why = [...top.notes, ...top.unknowns.map((u) => `${u} is not on this sheet`)].filter((x, i, xs) => xs.indexOf(x) === i);
    return { text: `? ${why[0] ?? 'no value'}`, standing: true };
  }
  const v = fmt(top.value);
  const off = top.checks.find((c) => c.status === 'off');
  if (off) return { text: `✗ ${v} · written ${fmt(off.written)}`, standing: true };
  const agrees = top.checks.length > 0 && top.checks.every((c) => c.status !== 'unknown');
  const others = readings.slice(1).map((r) => (r.value ? fmt(r.value) : '')).filter((x, i, xs) => x && x !== v && xs.indexOf(x) === i);
  return { text: `${agrees ? '✓' : '='} ${v}${others.length ? ` · or ${others.slice(0, 2).join(', ')}` : ''}`, standing: false };
}

function stepChips(sheet: Sheet): MathsChip[] {
  const out: MathsChip[] = [];
  for (const e of sheet.entries) {
    if ((e.kind !== 'step' && e.kind !== 'check') || (e.kind === 'step' && e.conflict) || !e.bounds) continue;
    const said = stepSaid(e.readings);
    if (!said) continue;
    out.push({
      key: e.kind === 'step' ? `step:${e.key}` : `check:${e.line}`, kind: 'step', text: said.text, ids: [...(e.ids ?? [])],
      at: { x: e.bounds.maxX + STEP_GAP, y: (e.bounds.minY + e.bounds.maxY) / 2 }, align: 'left', standing: said.standing,
      reason: stepReason(e),
    });
  }
  return out;
}

function stepReason(e: StepEntry | CheckEntry): string {
  const top = e.readings[0];
  if (!top) return e.reason;
  const rest = e.readings.slice(1).map((r) => `or ${fmt(r.value)}${r.label ? ` ${r.label}` : ' from the measurements'}${r.checks.some((c) => c.status === 'off') ? ` ✗ written ${fmt(r.checks.find((c) => c.status === 'off')!.written)}` : ''}`);
  return [`${e.text} — ${e.reason}`, ...rest].join('; ');
}

/**
 * What a pattern piece comes to, said once beside it, below it: the cutting size
 * against the sewing size (`cut 19 × 27″ · sewn 18 × 26″`), and that it is cut on
 * the fold. The marks' own numbers — notches, darts, the grain — are the panel's.
 */
function garmentChips(board: BoardMaths): MathsChip[] {
  const out: MathsChip[] = [];
  for (const g of board.garment ?? []) {
    const cx = (g.bounds.minX + g.bounds.maxX) / 2;
    let row = 0;
    const unit = g.unit ? unitSuffix(g.unit, 1) : '';
    const n = (v: number) => formatNumber(v, 2);
    const say = (key: string, text: string, reason: string) =>
      out.push({ key: `garment:${g.id}:${key}`, kind: 'garment', text, ids: g.ids.slice(), at: { x: cx, y: g.bounds.maxY + CHIP_OFFSET * ++row }, align: 'centre', standing: false, reason });
    if (g.seam?.cut && g.seam.sewn) say('seam', `cut ${n(g.seam.cut.width)} × ${n(g.seam.cut.height)}${unit} · sewn ${n(g.seam.sewn.width)} × ${n(g.seam.sewn.height)}${unit}`, g.lines.join(' — '));
    if (g.fold?.opened !== undefined) say('fold', `cut on the fold · ${n(g.fold.opened)}${unit} across opened`, g.fold.reason);
  }
  return out;
}

/** Everything said beside the figures and the page, in the figures' order and then the page's. */
export function mathsChips(board: BoardMaths): MathsChip[] {
  return [...figureChips(board), ...garmentChips(board), ...stepChips(board.sheet)];
}

// ===== The panel's words =====

export interface MathsSaid {
  /** Plain lines for the person: the answer, what cannot hold, how the labels agree with the ink. */
  lines: string[];
  /** For details: every derived value with its formula, the other readings, the steps. */
  rows: { k: string; v: string; why?: string }[];
}

/**
 * What the maths says of some marks — the figure they belong to, the numbers
 * written on it, the page a text is a line of — or null when they are none of
 * those. Plain lines first, and every value with its formula behind them.
 */
export function mathsSaid(board: BoardMaths, ids: readonly string[]): MathsSaid | null {
  const held = new Set(ids);
  const lines: string[] = [];
  const rows: MathsSaid['rows'] = [];
  for (const fm of board.figures) {
    if (!marksOfFigure(fm).some((id) => held.has(id))) continue;
    const [top, ...rest] = fm.solution.readings;
    if (!top) continue;
    const derived = top.values.filter((v) => v.from === 'derived');
    if (!derived.length && !top.conflicts.length) continue;
    lines.push(top.sentence);
    for (const c of top.conflicts) lines.push(c.reason);
    for (const v of derived) rows.push({ k: v.label, v: v.text, why: v.reason });
    for (const r of rest) rows.push({ k: 'or', v: r.sentence, ...(r.conflicts.length ? { why: r.conflicts.map((c) => c.reason).join('; ') } : {}) });
    for (const v of fm.solution.ink) rows.push({ k: v.label, v: `${v.text} (the ink’s)`, why: v.reason });
    for (const n of fm.solution.notes) rows.push({ k: 'note', v: n });
    // How the labels agree with the ink is working, not an answer: behind details.
    if (fm.drawing?.scale && fm.drawing.scale.labels > 1) rows.push({ k: 'scale', v: fm.drawing.scale.reason });
  }
  // A pattern piece: its cutting size against its sewing size, and what each mark comes to.
  for (const g of board.garment ?? []) {
    if (!g.ids.some((id) => held.has(id))) continue;
    lines.push(...g.lines);
    rows.push(...g.rows);
  }
  const page = board.sheet.entries.filter((e) => (e.kind === 'step' || e.kind === 'check') && (e.ids ?? []).some((id) => held.has(id)));
  if (page.length) {
    const steps = page.filter((e): e is StepEntry => e.kind === 'step' && !e.conflict);
    const off = steps.filter((e) => e.readings[0]?.checks.some((c) => c.status === 'off') || !e.readings[0]?.value);
    if (steps.length) lines.push(`${steps.length} step${steps.length === 1 ? '' : 's'} — ${off.length ? `${steps.length - off.length} agree, ${off.length} ${off.length === 1 ? 'does' : 'do'} not (${off.map((e) => e.key).join(', ')})` : steps.length === 1 ? 'it agrees' : 'every one agrees'}`);
    for (const e of page) {
      if (e.kind !== 'step' && e.kind !== 'check') continue;
      if (e.kind === 'step' && e.conflict) { rows.push({ k: e.text, v: e.conflict }); continue; }
      const said = stepSaid(e.readings);
      if (said) rows.push({ k: e.kind === 'step' ? (e.n !== null ? `${e.n}.` : `${e.letter}.`) : 'check', v: said.text, why: stepReason(e) });
    }
  }
  return lines.length || rows.length ? { lines, rows } : null;
}

// ===== What is typed after = =====

export type TypedMaths =
  | { ok: true; /** What was typed, less the `=`. */ body: string; /** The value, as people read it. */ result: string; /** What goes on the board: the formula with its result. */ words: string; /** A second reading, when the writing allows two. */ also?: string }
  | { ok: false; reason: string };

/**
 * `= 24 ÷ 3` as a sum, read against the board's own page — its definitions
 * resolve a name (*= A ÷ 3*), its unit is a bare number's — with no model. A
 * formula typed alone is stood with its result (*24 ÷ 3 = 8*); one typed whole
 * with an `=` is kept as typed when it holds; one that does not says how, and
 * says nothing else. What it cannot read it says why.
 */
export function evaluateTyped(text: string, board: BoardMaths | null): TypedMaths {
  const body = text.replace(/^\s*=\s*/, '').trim();
  if (!body) return { ok: false, reason: 'type a sum, like = 24 ÷ 3' };
  const page = board ? board.sheet.entries.map((e) => e.text) : [];
  // Typed after `=`, it is a sum whatever its words: what the page lacks is said, not taken for prose.
  const sheet = readSheet([...page, { text: body, maths: true }]);
  const e = sheet.entries[sheet.entries.length - 1];
  if (!e) return { ok: false, reason: 'type a sum, like = 24 ÷ 3' };
  if (e.kind !== 'check') {
    if (e.kind === 'value') return { ok: false, reason: `${body} is only a number — type a sum, like = 24 ÷ 3` };
    if (e.kind === 'definition') return { ok: false, reason: `${body} says what ${e.key} is — type a sum, like = ${e.key} ÷ 3` };
    return { ok: false, reason: `cannot read “${body}” as a sum` };
  }
  const top = e.readings[0];
  if (!top || !top.value) {
    const why = top ? [...top.notes, ...top.unknowns.map((u) => `${u} is not on this sheet`)].filter((x, i, xs) => xs.indexOf(x) === i) : [];
    return { ok: false, reason: why[0] ?? `cannot read “${body}” as a sum` };
  }
  const off = top.checks.find((c) => c.status === 'off');
  if (off) return { ok: false, reason: `${top.formula} is ${fmt(top.value)}, not ${fmt(off.written)}` };
  const result = fmt(top.value);
  const second = e.readings[1];
  return {
    ok: true, body, result,
    words: body.includes('=') ? body : `${top.formula} = ${result}`,
    ...(second && second.value ? { also: `${second.formula} = ${fmt(second.value)}` } : {}),
  };
}

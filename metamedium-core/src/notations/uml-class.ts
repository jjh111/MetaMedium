// The UML class notation (V1-PLAN §3, §9 D4; acceptance A2).
//
// Classes, their compartments, and the relations between them, read from ink:
//
//   - **class** — a box with one or two lines across it, side to side: its
//     compartments. The name is the writing in the top one; the writing in the
//     others is its members, a line of writing to a member — attributes above
//     methods, as UML draws them. A member is a METHOD only when read words say
//     so (a name and its parentheses: `eat()`, `move(dx, dy)`), never because
//     of where it stands and never invented; writing nobody has read is a
//     member whose words are not known. A plain box — no lines across it — is
//     a class with only a name, read lower, and only where the diagram reaches
//     it: a relation joins it to a class with compartments, or the relation
//     itself is UML's (a triangle or a diamond at its end). Boxes and lines are
//     what every diagram has; a compartment or a UML head is what says UML.
//   - **the trap** — a line across a box is `crossing` and `inside` to the
//     relation table, and a box holding boxes is a frame to the role table. So
//     compartments are read from the box's OWN frame, never from those tables:
//     the tightest box around its hull at any angle, its two axes each tried as
//     the one its lines run along, so a turned class reads as a class. A line is
//     a compartment line when, in that frame, it lies level, runs straight, and
//     reaches both sides — a hand's few pixels short or past each side — and
//     stands inside, clear of the top and bottom edges. A box whose inside holds
//     a mark that is no writing — another box, a diagonal, a shape — is a frame
//     or a sketch, not a class; a box with three or more lines across it is a
//     table.
//   - **relations** — lines and arrows whose ends land on two classes, each end
//     read PAST its head (diagram/heads.ts), a magnet's bind first. What sits at
//     an end says the kind: a hollow triangle is inheritance (`<|--`, at the
//     parent), a filled diamond composition (`*--`, at the whole), a hollow one
//     aggregation (`o--`), an open arrow association (`-->`, at what it points
//     to), nothing a plain link (`--`). A head the rung reads first as a circle
//     — a small, shaky triangle does, E3 found — degrades: the relation takes
//     the first head a class relation has, less surely, and says why; with
//     none, the end is plain and says that. A filled diamond drawn as an
//     outline and a quick hatch is gathered into a word by the letter rules
//     (session.ts) and heads.ts reads it as writing: here a word at a relation's
//     end whose letters close an outline is read apart, on a scratch board, as
//     the head it is. Dependency and realization (`..>`, `..|>`) are dashed, and
//     a dashed line is several strokes — gathering them into one connector is a
//     perception of its own that D5's sequence messages need too — so D4 reads
//     solid lines only and says so.
//   - **multiplicities** — short writing near a relation's end ("1", "*",
//     "0..1"), outside the classes: the end it stands nearest, within its reach.
//     Writing beside a relation's middle is its label; writing beside nothing
//     is a note.
//
// Each class offers its four sides as continuous ports through E3's hook
// (session/ports.ts) once the notation is offered — `along:uml-class`, a
// place along a side — and the reading carries the same ports.
//
// Every symbol plays one of the six roles and adds none: a class is a node
// (its box and its compartment lines the strokes it is drawn with), a relation
// an edge (its line and its heads), writing a label, a note an annotation. The
// whole reading is derived, like a concept's: nothing enters the log. Its
// content — names, roles, ports, the Mermaid of each relation — is the table
// below, its single home; the uml-class@1 pack names this notation and
// restates none of it (V1-PLAN §2.3, B3).

import type { Bounds, Point } from '../types';
import type { SessionState } from '../session/session';
import { createSession, DEFAULT_SESSION_CONFIG } from '../session/session';
import type { MMNode } from '../session/nodes';
import { boundsOf, fingerprintOf, getRep, isWord, labelOf, lettersOf, resemblances, strokePointsOf, transcriptOf } from '../session/nodes';
import type { NotationPort, NotationPorts } from '../session/ports';
import { activeBindingsOf, magnetRadius } from '../session/magnets';
import { isLetterLike } from '../session/words';
import type { ConnectorEnd, ConnectorHeads, HeadReading } from '../diagram/heads';
import { headsOf, HEAD_MAX_SHARE } from '../diagram/heads';
import { figuresAmong } from '../diagram/figures';
import type { Role } from '../diagram/roles';
import { MAX_TIER0_CONFIDENCE } from '../recognition';
import type { Notation, NotationConnector, NotationEnd, NotationLabel, NotationReading, NotationSymbol, SymbolReading } from './notation';
import { areaOf, cornersOf, distToPath, hullOf, offLevel, outside, ramp, stanceOf, tightBox } from './shape';
import { CORNERED, SQUARE, THREE_CORNERED } from './flowchart';
import { UNREAD_WRITING } from './mermaid';

// ===== The table — the class diagram's content =====

/**
 * The class diagram's content: its symbol, its relations and the writing it
 * reads, each with the role it plays, and each relation's Mermaid marker at
 * the class it points to (D4's writer writes with these). Content, not code,
 * and this is its single home: the `uml-class@1` pack names the notation and
 * restates none of it (V1-PLAN §2.3, B3).
 */
export const UML_CLASS_TABLE = {
  pack: 'uml-class@1',
  notation: 'uml-class',
  name: 'UML class diagram',
  describes: 'classes — a name, attributes and methods, each in its compartment — and the relations between them',
  symbols: {
    class: {
      role: 'node',
      describes: 'a box with one or two lines across it, side to side — its compartments — the name in the top one; or a plain box, a class with only a name, read lower',
      ports: 'anywhere along its four sides',
      one: 'class',
      many: 'classes',
    },
  },
  connectors: {
    inheritance: { role: 'edge', describes: 'a line with a hollow triangle at the parent', head: 'triangle', filled: false, one: 'inheritance', many: 'inheritances', mermaid: { left: '<|', right: '|>' } },
    composition: { role: 'edge', describes: 'a line with a filled diamond at the whole', head: 'diamond', filled: true, one: 'composition', many: 'compositions', mermaid: { left: '*', right: '*' } },
    aggregation: { role: 'edge', describes: 'a line with a hollow diamond at the whole', head: 'diamond', filled: false, one: 'aggregation', many: 'aggregations', mermaid: { left: 'o', right: 'o' } },
    association: { role: 'edge', describes: 'a line with an open arrow at what it points to', head: 'arrow', filled: false, one: 'association', many: 'associations', mermaid: { left: '<', right: '>' } },
    link: { role: 'edge', describes: 'a line with no head between two classes', head: 'none', filled: false, one: 'link', many: 'links', mermaid: { left: '', right: '' } },
  },
  labels: {
    name: { role: 'label', describes: 'the writing in a class’s top compartment' },
    member: { role: 'label', describes: 'a line of writing in a compartment below the name — an attribute, or a method when its words say so' },
    multiplicity: { role: 'label', describes: 'short writing near a relation’s end: “1”, “*”, “0..1”', one: 'multiplicity', many: 'multiplicities' },
    label: { role: 'label', describes: 'writing beside a relation’s middle', one: 'relation label', many: 'relation labels' },
  },
  mermaid: { header: 'classDiagram', line: '--' },
} as const;

type RelationKind = keyof typeof UML_CLASS_TABLE.connectors;
/** What sits at a relation's end, as a class relation reads it. */
export type UmlMarker = Exclude<RelationKind, 'link'>;
const KINDS = Object.keys(UML_CLASS_TABLE.connectors) as RelationKind[];
/** Which marker says more, when a relation carries one at each end. */
const PRECEDENCE: UmlMarker[] = ['inheritance', 'composition', 'aggregation', 'association'];

// ===== Thresholds — this notation's own; the hand's are cited =====

/** A compartment line lies within this of the class's own level, in degrees: full to the first, gone by the second. */
export const COMPARTMENT_LEVEL = [7, 16] as const;
/** …bows off its own chord by at most this share of its length (a hand's ruled line bows about 2%). */
export const COMPARTMENT_STRAIGHT = [0.06, 0.14] as const;
/** …stops short of a side by at most this share of the class's width — or these pixels on screen, whichever is more — gone by the second. */
export const COMPARTMENT_SHORT = [0.05, 0.12] as const;
export const COMPARTMENT_SHORT_PX = [6, 12] as const;
/** …runs past a side by at most this share of the width, or these pixels. */
export const COMPARTMENT_PAST = [0.12, 0.3] as const;
export const COMPARTMENT_PAST_PX = [16, 40] as const;
/** …and stands inside, clear of the top and bottom edges by this share of the height. */
export const COMPARTMENT_INSET = 0.05;
/** A line counts as a compartment line from this score. */
export const COMPARTMENT_FLOOR = 0.35;
/** A class has one or two compartment lines; a box with more across it is a table. */
export const MAX_COMPARTMENT_LINES = 2;
/** A plain box — no line across it — is a class with only a name, read this much lower. */
export const PLAIN_CLASS = 0.45;
/** A box reads as a class's box from this score (its corners, and how square). */
export const BOX_FLOOR = 0.3;
/** A mark inside a class is writing when it spans at most this share of the class's width and height; wider, it is a mark of its own. */
export const WRITING_SPAN = 0.8;
/** A closed mark inside a class is a letter — an o, a 0 — at most this share of the class's smaller side. */
export const LETTER_SHARE = 0.3;
/** An open stroke outside the classes no bigger than this on screen is a letter — writing, a "1" — not a line of its own. */
export const LETTER_PX = 40;
/** Writing stands at a relation's end within this share of its length from the end; further along, beside its middle. */
export const END_SHARE = 0.35;
/** A per-mark reading below this offers no ports: the pen should not feel a guess. */
export const PORTS_FLOOR = 0.4;

const MAX = MAX_TIER0_CONFIDENCE;
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const count = (n: number) => WORDS[n] ?? String(n);
const deg = (x: number) => `${Math.max(0, Math.round(x))}°`;
const pct = (x: number) => `${Math.round(x * 100)}%`;
const an = (word: string) => `${/^[aeiou]/.test(word) ? 'an' : 'a'} ${word}`;
const DEGREE = 180 / Math.PI;
const scaleOf = (node: MMNode) => (getRep(node, 'stroke')?.data as { scale?: number } | undefined)?.scale ?? 1;
const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;
const centreOf = (b: Bounds): Point => ({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 });
const sizeOfBounds = (b: Bounds) => Math.max(b.maxX - b.minX, b.maxY - b.minY);
const mean = (xs: readonly number[]) => xs.reduce((a, x) => a + x, 0) / Math.max(1, xs.length);

/** Words that say a member is a method: a name, straight into its parentheses — `eat()`, `move(dx, dy)`, `+area() double`. */
export const METHOD_WORDS = /[\p{L}\p{N}_$]\([^()]*\)/u;

// ===== The reading's own shapes =====

/** A member of a class: a line of writing in a compartment below the name, or a line of a compartment line's own label. */
export interface UmlMember {
  /** Its words, when somebody has read them — or a hand wrote them on the compartment's own line. */
  text?: string;
  /** A method only when its words say so; `unread` while its words are not known. */
  kind: 'attribute' | 'method' | 'unread';
  /** The compartment it stands in: 2 and 3 below the name's (1). */
  compartment: number;
  /** The writing it is written with, in reading order; empty for a line of a compartment line's own label. */
  ids: string[];
  /** Which of that writing nobody has read: said as "(unread writing)" in `text`, once for a run of it. */
  unread: string[];
  /** Where its words come from: writing in the compartment, or the label a hand put on the line that opens it. */
  from: 'writing' | 'label';
}

/** A compartment: the band between two of a class's lines, in its own frame. */
export interface UmlCompartment {
  /** 1 for the name's, then down the class. */
  index: number;
  /** The line that opens it — none for the first. */
  line?: string;
  /** The writing in it, in reading order. */
  writing: string[];
}

/** A class, as the notation reads it — a symbol with its compartments, its name and its members. */
export interface UmlClassSymbol extends NotationSymbol {
  symbol: 'class';
  /** Its box: the stroke, or the strokes it is ruled with. */
  box: string[];
  /** Its compartment lines, top to bottom in its own frame. */
  lines: string[];
  compartments: UmlCompartment[];
  /** Its name: the words when known, the writing it is written with, and which of that nobody has read. */
  name: { text?: string; ids: string[]; unread: string[] };
  members: UmlMember[];
  /** How far its own frame is turned from level, in degrees. */
  turn: number;
}

/** One end of a relation, read past its head. */
export interface UmlRelationEnd extends NotationEnd {
  /** What its head says in a class diagram, when it says anything. */
  marker?: UmlMarker;
  /** The short writing beside this end: its words when known, its marks, and which of them nobody has read. */
  multiplicity?: { text?: string; ids: string[]; unread: string[] };
}

/** A relation between two classes. */
export interface UmlRelation extends NotationConnector {
  kind: RelationKind;
  /** `to` is the marked end — the parent, the whole, what an association points to; `from` the other. */
  ends: { from: UmlRelationEnd; to: UmlRelationEnd };
  /** Every kind it could be, the likeliest first — the first is `kind`. */
  readings: { kind: RelationKind; confidence: number; reason: string }[];
}

/** What a scope is as a class diagram. */
export interface UmlClassReading extends NotationReading {
  notation: 'uml-class';
  symbols: UmlClassSymbol[];
  connectors: UmlRelation[];
}

// ===== A box, and its own frame =====

interface Box {
  hull: Point[];
  bounds: Bounds;
  size: number;
  /** 0–1: how much it reads as a box — four corners holding it, square. */
  score: number;
  why: string;
  tight: { centre: Point; axis: Point; long: number; short: number };
}

/** A box's own frame: `u` along its compartment lines (rightward), `v` across them (downward), `w` and `h` its extents. */
interface Frame {
  centre: Point;
  u: Point;
  v: Point;
  w: number;
  h: number;
}

function boxOf(points: readonly Point[], figure: boolean): Box | null {
  const hull = hullOf(points);
  if (hull.length < 3 || areaOf(hull) <= 0) return null;
  const { share, three, quad } = cornersOf(hull);
  const tight = tightBox(hull);
  if (!tight || quad.length !== 4) return null;
  const st = stanceOf(quad);
  // A figure's corners ARE its corners: its four hold all of it.
  const four = figure ? 1 : share;
  const notThree = figure ? 1 : 1 - ramp(three, THREE_CORNERED[0], THREE_CORNERED[1]);
  const cornered = ramp(four, CORNERED[0], CORNERED[1]) * notThree;
  const square = 1 - ramp(st.square, SQUARE[0], SQUARE[1]);
  const xs = hull.map((p) => p.x), ys = hull.map((p) => p.y);
  const bounds = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  return {
    hull,
    bounds,
    size: sizeOfBounds(bounds),
    score: cornered * square,
    why: `a box — its four corners hold ${pct(four)} of it, within ${deg(st.square)} of square`,
    tight,
  };
}

/** Pointing right on screen, or up when plumb. */
const rightward = (u: Point): Point => (u.x < -1e-12 || (Math.abs(u.x) <= 1e-12 && u.y > 0) ? { x: -u.x, y: -u.y } : u);
/** A quarter turn clockwise on screen: `u` rightward gives `v` downward. */
const across = (u: Point): Point => ({ x: -u.y, y: u.x });

/** The box's two frames — each of its axes the one its lines run along — the more level first. */
function framesOf(b: Box): Frame[] {
  const { centre, axis, long, short } = b.tight;
  const a = rightward(axis), p = rightward(across(axis));
  const one: Frame = { centre, u: a, v: across(a), w: long, h: short };
  const two: Frame = { centre, u: p, v: across(p), w: short, h: long };
  return offLevel(a) <= offLevel(p) ? [one, two] : [two, one];
}

const inFrame = (f: Frame, p: Point) => ({ u: dot(sub(p, f.centre), f.u), v: dot(sub(p, f.centre), f.v) });
const onBoard = (f: Frame, u: number, v: number): Point => ({ x: f.centre.x + f.u.x * u + f.v.x * v, y: f.centre.y + f.u.y * u + f.v.y * v });
/** How far the frame is turned from level, signed, in degrees. */
const turnOf = (f: Frame) => Math.atan2(f.u.y, f.u.x) * DEGREE;

/** A line across a box, in its frame: its place across (`v` at `u`), and how well it reads as a compartment line. */
interface CompartmentLine {
  id: string;
  score: number;
  why: string;
  /** Where it crosses, in the frame: `v` at the left and right sides. */
  vLeft: number;
  vRight: number;
}

/** Whether a stroke is a compartment line of a box in this frame — a line across it, level, straight, side to side, inside. */
function compartmentLineOf(id: string, pts: readonly Point[], f: Frame, scale: number): CompartmentLine | null {
  if (pts.length < 2) return null;
  const loc = pts.map((p) => inFrame(f, p));
  let umin = Infinity, umax = -Infinity, vsum = 0;
  let lo = loc[0], hi = loc[0];
  for (const q of loc) {
    if (q.u < umin) (umin = q.u), (lo = q);
    if (q.u > umax) (umax = q.u), (hi = q);
    vsum += q.v;
  }
  if (umax - umin < 0.5 * f.w) return null;
  // Level: its ends' chord against the frame's own level.
  const angle = Math.atan2(Math.abs(hi.v - lo.v), Math.max(1e-9, hi.u - lo.u)) * DEGREE;
  const level = 1 - ramp(angle, COMPARTMENT_LEVEL[0], COMPARTMENT_LEVEL[1]);
  if (level <= 0) return null;
  // Straight: how far it bows off that chord.
  const chord = Math.hypot(hi.u - lo.u, hi.v - lo.v);
  let bow = 0;
  for (const q of loc) bow = Math.max(bow, Math.abs((q.u - lo.u) * (hi.v - lo.v) - (q.v - lo.v) * (hi.u - lo.u)) / Math.max(1e-9, chord));
  const straight = 1 - ramp(bow / chord, COMPARTMENT_STRAIGHT[0], COMPARTMENT_STRAIGHT[1]);
  // Side to side: short of a side by a hand's miss, or past it by a hand's overshoot.
  const short: [number, number] = [Math.max(COMPARTMENT_SHORT[0] * f.w, COMPARTMENT_SHORT_PX[0] * scale), Math.max(COMPARTMENT_SHORT[1] * f.w, COMPARTMENT_SHORT_PX[1] * scale)];
  const past: [number, number] = [Math.max(COMPARTMENT_PAST[0] * f.w, COMPARTMENT_PAST_PX[0] * scale), Math.max(COMPARTMENT_PAST[1] * f.w, COMPARTMENT_PAST_PX[1] * scale)];
  const reachOf = (gap: number) => (gap >= 0 ? 1 - ramp(gap, short[0], short[1]) : 1 - ramp(-gap, past[0], past[1]));
  const gapL = umin + f.w / 2, gapR = f.w / 2 - umax;
  const reach = reachOf(gapL) * reachOf(gapR);
  // Inside: clear of the top and bottom edges.
  const vm = vsum / loc.length;
  const inside = Math.abs(vm) <= f.h / 2 - COMPARTMENT_INSET * f.h ? 1 : 0;
  const score = level * straight * reach * inside;
  if (score <= 0) return null;
  const said = (gap: number, side: string) => (gap >= 0 ? `${Math.round(gap / scale)} px short of the ${side} side` : `${Math.round(-gap / scale)} px past the ${side} side`);
  // Where it crosses the frame's sides: its chord, run out to them.
  const slope = (hi.v - lo.v) / Math.max(1e-9, hi.u - lo.u);
  const vLeft = lo.v + slope * (-f.w / 2 - lo.u), vRight = lo.v + slope * (f.w / 2 - lo.u);
  return {
    id,
    score,
    why: `a line across it, within ${deg(angle)} of its level, ${said(gapL, 'left')} and ${said(gapR, 'right')}`,
    vLeft,
    vRight,
  };
}

/** The line's place across the frame at `u`. */
const lineVAt = (l: CompartmentLine, f: Frame, u: number) => l.vLeft + ((l.vRight - l.vLeft) * (u + f.w / 2)) / Math.max(1e-9, f.w);

// ===== Ports =====

/** A class's four sides as continuous ports: top, right, bottom and left, each from its first corner clockwise. */
function sidesOf(f: Frame): NotationPort[] {
  const tl = onBoard(f, -f.w / 2, -f.h / 2), tr = onBoard(f, f.w / 2, -f.h / 2), br = onBoard(f, f.w / 2, f.h / 2), bl = onBoard(f, -f.w / 2, f.h / 2);
  const side = (name: string, a: Point, b: Point): NotationPort => ({ name: `${name} side`, along: [a, b], reasoning: `anywhere along the class’s ${name} side` });
  return [side('top', tl, tr), side('right', tr, br), side('bottom', br, bl), side('left', bl, tl)];
}

// ===== Writing =====

/** Writing: a word, a mark somebody has read, or a stroke the shape rung reads as text. */
function isWriting(node: MMNode): boolean {
  if (isWord(node) || transcriptOf(node)) return true;
  return resemblances(node)[0]?.to === 'type:text';
}

/** What a piece of writing says, when anybody has read it or a hand labelled its own ink. */
function wordsOfMark(node: MMNode): string | undefined {
  const t = (transcriptOf(node) ?? labelOf(node)?.text)?.trim();
  return t ? t : undefined;
}

/** A member's kind from its words: a method only when they say so; the placeholder for unread writing says nothing. */
export function memberKind(text: string | undefined): UmlMember['kind'] {
  if (!text || text === UNREAD_WRITING) return 'unread';
  return METHOD_WORDS.test(text) ? 'method' : 'attribute';
}

// ===== The E3 hook: one mark, and the ports its class offers =====

let reading = 0;

/** The compartment lines a box's own frame finds among the marks: the frame that finds the most, the more level on a tie. */
function linesOfBox(box: Box, strokes: readonly { id: string; pts: Point[]; scale: number; bounds: Bounds }[]): { frame: Frame; lines: CompartmentLine[] } {
  const grow = 0.3 * box.size;
  const near = strokes.filter((s) => s.bounds.minX >= box.bounds.minX - grow && s.bounds.maxX <= box.bounds.maxX + grow && s.bounds.minY >= box.bounds.minY - grow && s.bounds.maxY <= box.bounds.maxY + grow);
  let best: { frame: Frame; lines: CompartmentLine[] } | null = null;
  for (const f of framesOf(box)) {
    const lines = near.map((s) => compartmentLineOf(s.id, s.pts, f, s.scale)).filter((l): l is CompartmentLine => !!l && l.score >= COMPARTMENT_FLOOR);
    lines.sort((a, b) => (a.vLeft + a.vRight) / 2 - (b.vLeft + b.vRight) / 2);
    if (!best || lines.length > best.lines.length) best = { frame: f, lines };
  }
  return best!;
}

/** A loose open stroke that may be a compartment line: not writing, not a gesture, not part of anything. */
function mayBeLine(n: MMNode): boolean {
  if (!getRep(n, 'stroke') || getRep(n, 'erased') || getRep(n, 'gesture') || n.edges.some((e) => e.rel === 'part-of')) return false;
  const fp = fingerprintOf(n);
  return !!fp && !fp.isClosed && !isWriting(n);
}

/**
 * What the class diagram reads one mark as, on its own, and the ports it
 * offers — the notation's side of E3's hook. A box with one or two lines
 * across it is a class, and offers its four sides; a plain box cannot be told
 * from any other box without the diagram around it, and offers none; a guess
 * offers nothing. Re-entry answers nothing, so the hook never calls itself.
 */
export function umlClassPortsOf(node: MMNode, nodes: ReadonlyMap<string, MMNode>): { symbol: string; ports: NotationPort[] } | null {
  if (reading > 0) return null;
  reading++;
  try {
    if (getRep(node, 'erased') || getRep(node, 'gesture') || isWord(node) || transcriptOf(node)) return null;
    const fp = fingerprintOf(node);
    const pts = strokePointsOf(node);
    if (!fp?.isClosed || !pts || pts.length < 3) return null;
    const box = boxOf(pts, false);
    if (!box || box.score < BOX_FLOOR) return null;
    const strokes: { id: string; pts: Point[]; scale: number; bounds: Bounds }[] = [];
    for (const [id, n] of nodes) {
      if (id === node.id || !mayBeLine(n)) continue;
      const b = boundsOf(n);
      if (!b || b.minX > box.bounds.maxX || b.maxX < box.bounds.minX || b.minY > box.bounds.maxY || b.maxY < box.bounds.minY) continue;
      strokes.push({ id, pts: strokePointsOf(n)!, scale: scaleOf(n), bounds: b });
    }
    const { frame, lines } = linesOfBox(box, strokes);
    if (!lines.length || lines.length > MAX_COMPARTMENT_LINES) return null;
    if (box.score * mean(lines.map((l) => l.score)) < PORTS_FLOOR) return null;
    return { symbol: 'class', ports: sidesOf(frame) };
  } finally {
    reading--;
  }
}

// ===== Reading a scope =====

interface Mark {
  id: string;
  node: MMNode;
  bounds: Bounds;
  centre: Point;
  scale: number;
}

/** A box that may be a class: one closed stroke, or strokes ruled into a quadrilateral. */
interface Candidate {
  /** What stands for it: the stroke, or the figure's `figure:a+b+…`. */
  id: string;
  /** The strokes its box is drawn with. */
  box: string[];
  /** The marks of the scope it covers. */
  marks: string[];
  shape: Box;
  scale: number;
  frame: Frame;
  lines: CompartmentLine[];
  /** How cleanly a figure's strokes meet, else 1. */
  fit: number;
  lead: string;
}

/** What is inside a class: its writing, and anything that is not writing. */
interface Inside {
  writing: Mark[];
  foreign: Mark[];
}

/** The words a hand put on these marks' own ink (`label`): each different word once, the marks in id order. */
function ownWords(nodes: ReadonlyMap<string, MMNode>, ids: readonly string[]): string | undefined {
  const words: string[] = [];
  for (const id of [...new Set(ids)].sort()) {
    const n = nodes.get(id);
    const t = n && labelOf(n)?.text.trim();
    if (t && !words.includes(t)) words.push(t);
  }
  return words.length ? words.join(' ') : undefined;
}

/** How far a point stands from a box: 0 inside it. */
function offBox(p: Point, b: Bounds): number {
  return Math.hypot(Math.max(0, b.minX - p.x, p.x - b.maxX), Math.max(0, b.minY - p.y, p.y - b.maxY));
}

/** How far apart two boxes stand: 0 when they touch or overlap. */
function boxGap(a: Bounds, b: Bounds): number {
  return Math.hypot(Math.max(0, b.minX - a.maxX, a.minX - b.maxX), Math.max(0, b.minY - a.maxY, a.minY - b.maxY));
}

/** Pieces of writing grouped into the lines they stand on, top to bottom, each left to right — in a class's own frame. */
function linesOfWriting(pieces: readonly Mark[], f: Frame): Mark[][] {
  const at = pieces.map((m) => {
    const c = inFrame(f, m.centre);
    const ext = [m.bounds.minX, m.bounds.maxX].flatMap((x) => [m.bounds.minY, m.bounds.maxY].map((y) => inFrame(f, { x, y }).v));
    return { m, u: c.u, v: c.v, lo: Math.min(...ext), hi: Math.max(...ext) };
  });
  at.sort((a, b) => a.v - b.v || a.u - b.u || (a.m.id < b.m.id ? -1 : 1));
  const out: (typeof at)[] = [];
  for (const x of at) {
    const row = out[out.length - 1];
    const first = row?.[0];
    if (first && ((x.v >= first.lo && x.v <= first.hi) || (first.v >= x.lo && first.v <= x.hi))) row.push(x);
    else out.push([x]);
  }
  return out.map((row) => row.sort((a, b) => a.u - b.u || (a.m.id < b.m.id ? -1 : 1)).map((x) => x.m));
}

/** A line's words: its pieces' in order, unread writing as the placeholder, once for a run of it. */
function wordsOfLine(nodes: ReadonlyMap<string, MMNode>, line: readonly Mark[]): { text?: string; unread: string[] } {
  const parts: string[] = [];
  const unread: string[] = [];
  for (const m of line) {
    const t = wordsOfMark(nodes.get(m.id)!);
    if (t) parts.push(t);
    else {
      unread.push(m.id);
      if (parts[parts.length - 1] !== UNREAD_WRITING) parts.push(UNREAD_WRITING);
    }
  }
  const text = parts.join(' ');
  return { ...(unread.length === line.length ? {} : { text }), unread };
}

interface ResolvedEnd {
  class?: Candidate;
  head?: HeadReading;
  /** Marks read as the head that are not the connector: its head drawn apart, a fill, a word read apart. */
  headIds: string[];
  quality: number;
  said: NotationEnd;
}

/** What a head says in a class diagram. */
function markerOfHead(h: HeadReading): UmlMarker | undefined {
  if (h.kind === 'triangle') return h.filled ? 'association' : 'inheritance';
  if (h.kind === 'diamond') return h.filled ? 'composition' : 'aggregation';
  if (h.kind === 'arrow') return 'association';
  return undefined;
}

const headSaid = (h: HeadReading) => (h.kind === 'arrow' ? 'an open arrow' : `${h.filled ? 'a filled' : 'a hollow'} ${h.kind}`);

/** An end's marker from its heads: the first a class relation has, less surely when a head it has none of reads first. */
function markerOf(heads: readonly HeadReading[]): { marker?: UmlMarker; head?: HeadReading; sure: number; why: string; others: { marker?: UmlMarker; sure: number; why: string }[] } {
  const top = heads[0];
  if (!top) return { sure: 1, why: 'no head', others: [] };
  const first = heads.find((h) => markerOfHead(h));
  const others = heads.filter((h) => h !== first).map((h) => ({ marker: markerOfHead(h), sure: h.confidence / MAX, why: `${headSaid(h)} ${h.confidence.toFixed(2)}` }));
  if (!first) return { head: top, sure: top.confidence / MAX, why: `${headSaid(top)} at its end, which no class relation has — a plain end`, others };
  const m = markerOfHead(first)!;
  if (first === top) return { marker: m, head: first, sure: first.confidence / MAX, why: `${headSaid(first)} — ${an(m)}`, others };
  const share = first.confidence / (first.confidence + top.confidence);
  return {
    marker: m,
    head: first,
    sure: (first.confidence / MAX) * share,
    why: `its head reads first as ${headSaid(top)} (${top.confidence.toFixed(2)}), which no class relation has, then as ${headSaid(first)} (${first.confidence.toFixed(2)}) — ${an(m)}, less surely`,
    others: [{ marker: undefined, sure: (top.confidence / MAX) * (1 - share), why: `${headSaid(top)} ${top.confidence.toFixed(2)}, a plain end` }, ...others.filter((o) => o.why !== `${headSaid(top)} ${top.confidence.toFixed(2)}`)],
  };
}

/**
 * A head the letter rules gathered into a word: a filled diamond drawn as an
 * outline and a quick hatch is one word, and heads.ts reads a word as
 * writing. Read apart — the connector and the word's letters alone on a
 * scratch board, far enough apart in time that no word gathers — it is the
 * head it was drawn as. Null when the word closes no outline, or reads as no
 * head even so.
 */
function headOfWord(state: SessionState, conn: MMNode, end: 'start' | 'end', word: MMNode): HeadReading | null {
  const letters = lettersOf(word).map((id) => state.nodes.get(id)).filter((n): n is MMNode => !!n && !getRep(n, 'erased') && !!strokePointsOf(n));
  if (letters.length < 2 || !letters.some((n) => fingerprintOf(n)?.isClosed)) return null;
  const pts = strokePointsOf(conn);
  if (!pts) return null;
  const scratch = createSession();
  let t = 1;
  const cid = scratch.addStroke(pts.map((p) => ({ x: p.x, y: p.y })), t, undefined, scaleOf(conn), { content: true });
  for (const n of letters) scratch.addStroke(strokePointsOf(n)!.map((p) => ({ x: p.x, y: p.y })), (t += 10_000), undefined, scaleOf(n), { content: true });
  const h = headsOf(scratch.getState(), cid);
  const top = h?.[end].heads[0];
  if (!top || top.ids.includes(cid)) return null;
  return { ...top, ids: [word.id], reason: `${top.reason} — its strokes, which the letter rules gathered into a word, read apart` };
}

/**
 * The class diagram a scope makes — the board's content plane when no scope
 * is given — or null when nothing in it says UML: no box with compartment
 * lines, and no relation whose head is a class relation's own (a triangle or
 * a diamond). Reads the session and changes nothing in it.
 */
export function readUmlClass(state: SessionState, scopeIds?: readonly string[]): UmlClassReading | null {
  const nodes = state.nodes;
  const artifacts = new Set(state.artifacts);
  const scope = (scopeIds ? [...new Set(scopeIds)] : state.contentIds.filter((id) => !artifacts.has(id))).filter((id) => {
    const n = nodes.get(id);
    return !!n && !artifacts.has(id) && !getRep(n, 'erased') && !getRep(n, 'gesture') && !!boundsOf(n);
  });
  if (!scope.length) return null;
  const marks = new Map<string, Mark>();
  for (const id of scope) {
    const node = nodes.get(id)!;
    const b = boundsOf(node)!;
    marks.set(id, { id, node, bounds: b, centre: centreOf(b), scale: isWord(node) ? scaleOf(nodes.get(lettersOf(node)[0]) ?? node) : scaleOf(node) });
  }

  // 1. Boxes: closed strokes, and strokes ruled into a quadrilateral.
  const candidates: Candidate[] = [];
  const open: Mark[] = [];
  for (const m of marks.values()) {
    if (isWord(m.node) || transcriptOf(m.node)) continue;
    const fp = fingerprintOf(m.node);
    const pts = strokePointsOf(m.node);
    if (!fp || !pts) continue;
    if (fp.isClosed) {
      const b = boxOf(pts, false);
      if (b && b.score >= BOX_FLOOR) candidates.push({ id: m.id, box: [m.id], marks: [m.id], shape: b, scale: m.scale, frame: framesOf(b)[0], lines: [], fit: 1, lead: '' });
    } else if (!isWriting(m.node)) open.push(m);
  }
  if (!candidates.length && open.length < 4) return null;
  const inFigure = new Set<string>();
  for (const f of figuresAmong(nodes, open.map((m) => m.id))) {
    if (f.vertices.length !== 4) continue;
    const b = boxOf(f.vertices, true);
    if (!b || b.score < BOX_FLOOR) continue;
    candidates.push({ id: f.id, box: [...f.ids], marks: [...f.ids], shape: b, scale: scaleOf(nodes.get(f.ids[0])!), frame: framesOf(b)[0], lines: [], fit: f.confidence / MAX, lead: `${count(f.ids.length)} strokes whose ends meet` });
    f.ids.forEach((id) => inFigure.add(id));
  }
  if (!candidates.length) return null;

  // 2. Containers: a box holding another box is a frame, not a class (the trap: never the role table's word for it).
  const holds = (a: Candidate, b: Candidate) => {
    const c = centreOf(b.shape.bounds);
    return b.shape.size < a.shape.size && offBox(c, a.shape.bounds) === 0 && outside(c, a.shape.hull) === 0;
  };
  const containers = new Set(candidates.filter((a) => candidates.some((b) => a !== b && holds(a, b))));
  const boxes = candidates.filter((c) => !containers.has(c));

  // 3. Compartment lines, read in each box's own frame; each line is one box's, the best.
  const loose = open.filter((m) => !inFigure.has(m.id)).map((m) => ({ id: m.id, pts: strokePointsOf(m.node)!, scale: m.scale, bounds: m.bounds }));
  const lineOwner = new Map<string, { c: Candidate; score: number }>();
  const found = new Map<Candidate, { frame: Frame; lines: CompartmentLine[] }>();
  for (const c of boxes) {
    const r = linesOfBox(c.shape, loose);
    found.set(c, r);
    for (const l of r.lines) {
      const had = lineOwner.get(l.id);
      if (!had || l.score > had.score) lineOwner.set(l.id, { c, score: l.score });
    }
  }
  for (const c of boxes) {
    const r = found.get(c)!;
    c.frame = r.frame;
    c.lines = r.lines.filter((l) => lineOwner.get(l.id)?.c === c);
  }
  const lineIds = new Set([...lineOwner.keys()].filter((id) => boxes.some((c) => c.lines.some((l) => l.id === id))));

  // 4. What stands inside each box: writing, and anything that is not.
  const boxMarks = new Set(candidates.flatMap((c) => c.box));
  const inside = new Map<Candidate, Inside>(boxes.map((c) => [c, { writing: [], foreign: [] }]));
  const insideOf = new Map<string, Candidate>();
  const byArea = [...boxes].sort((a, b) => areaOf(a.shape.hull) - areaOf(b.shape.hull));
  for (const m of marks.values()) {
    if (boxMarks.has(m.id) || lineIds.has(m.id) || inFigure.has(m.id)) continue;
    const c = byArea.find((k) => offBox(m.centre, k.shape.bounds) === 0 && outside(m.centre, k.shape.hull) === 0);
    if (!c) continue;
    insideOf.set(m.id, c);
    const f = c.frame;
    const corners = [m.bounds.minX, m.bounds.maxX].flatMap((x) => [m.bounds.minY, m.bounds.maxY].map((y) => inFrame(f, { x, y })));
    const spanU = Math.max(...corners.map((q) => q.u)) - Math.min(...corners.map((q) => q.u));
    const spanV = Math.max(...corners.map((q) => q.v)) - Math.min(...corners.map((q) => q.v));
    const closed = !!fingerprintOf(m.node)?.isClosed && !isWord(m.node);
    const letter = !closed || sizeOfBounds(m.bounds) <= LETTER_SHARE * Math.min(f.w, f.h);
    if (isWriting(m.node) || (letter && spanU <= WRITING_SPAN * f.w && spanV <= WRITING_SPAN * f.h)) inside.get(c)!.writing.push(m);
    else inside.get(c)!.foreign.push(m);
  }

  // 5. Which boxes may be classes: not a frame, nothing but writing inside, one or two lines at most.
  const tables = new Set<Candidate>();
  const sketches = new Set<Candidate>();
  const classes: Candidate[] = [];
  for (const c of boxes) {
    if (inside.get(c)!.foreign.length) sketches.add(c);
    else if (c.lines.length > MAX_COMPARTMENT_LINES) tables.add(c);
    else classes.push(c);
  }

  // 6. Relations: every open stroke outside the classes that is not a line across one, read past its heads.
  const classOfMark = new Map<string, Candidate>();
  for (const c of classes) for (const id of [...c.box, ...c.lines.map((l) => l.id)]) classOfMark.set(id, c);
  const connectorIds = open.filter((m) => !inFigure.has(m.id) && !lineIds.has(m.id) && !insideOf.has(m.id)).map((m) => m.id);
  if (!classes.length) return null;
  const heads = new Map<string, ConnectorHeads>();
  for (const id of connectorIds) {
    const m = marks.get(id)!;
    // The cheap test first: a relation reaches from a class to a class, so its box comes near two.
    const reachOut = Math.max(m.bounds.maxX - m.bounds.minX, m.bounds.maxY - m.bounds.minY) * 0.5 + magnetRadius(sizeOfBounds(m.bounds), m.scale);
    const near = classes.filter((c) => boxGap(m.bounds, c.shape.bounds) <= reachOut).length;
    if (!near) continue;
    const h = headsOf(state, id);
    if (h) heads.set(id, h);
  }
  // A small plain box that a connector reads as its head — a diamond is a box turned 45° — is that head, not a
  // class: so is what fills it, which stood inside it as if it were writing.
  const demoted = new Set<Candidate>();
  for (const [id, h] of heads) {
    for (const e of [h.start, h.end]) {
      const top = e.heads[0];
      if (!top) continue;
      for (const x of top.ids) {
        const c = classOfMark.get(x);
        if (c && x !== id && !c.lines.length && inside.get(c)!.writing.every((m) => top.ids.includes(m.id))) demoted.add(c);
      }
    }
  }
  const kept = classes.filter((c) => !demoted.has(c));
  if (demoted.size) for (const c of demoted) for (const id of c.box) classOfMark.delete(id);
  // A connector that is itself another's head (a chevron drawn apart) is that head.
  const headOf = new Set<string>();
  for (const [id, h] of heads) for (const e of [h.start, h.end]) for (const x of e.heads[0]?.ids ?? []) if (x !== id && heads.has(x)) headOf.add(x);

  const relations: UmlRelation[] = [];
  const pointers: string[] = [];
  const edgeMarks = new Map<string, string>(); // a head drawn apart → its relation
  const reachOf = (c: Candidate) => Math.max(magnetRadius(c.shape.size, c.scale), c.shape.size * DEFAULT_SESSION_CONFIG.wireEndpointRatio);
  const words = [...marks.values()].filter((m) => isWord(m.node) && !insideOf.has(m.id));
  const usedWords = new Set<string>();
  const endOf = (id: string, e: ConnectorEnd, bindings: ReturnType<typeof activeBindingsOf>, length: number): ResolvedEnd => {
    // What sits at the end: its heads — unless the likeliest is a class this notation reads, which the relation then lands on.
    const onClass = (h: HeadReading) => h.ids.some((x) => x !== id && classOfMark.has(x));
    const landed = e.heads[0] && onClass(e.heads[0]) ? e.heads[0] : undefined;
    let heads = landed ? [] : e.heads.filter((h) => !onClass(h));
    // A head the letter rules gathered into a word, read apart.
    if (!heads.length && !landed) {
      const reach = magnetRadius(0.5 * length, scaleOf(nodes.get(id)!));
      const w = words.find((m) => !usedWords.has(m.id) && sizeOfBounds(m.bounds) <= HEAD_MAX_SHARE * length && offBox(e.point, m.bounds) <= reach);
      const h = w && headOfWord(state, nodes.get(id)!, e.end, w.node);
      if (h) {
        heads = [h];
        usedWords.add(w!.id);
      }
    }
    const head = heads[0];
    const point = head ? head.tip : e.point;
    const headIds = head ? head.ids.filter((x) => x !== id) : [];
    const sayHead = head ? { head: { kind: head.kind, filled: head.filled, ids: [...head.ids], confidence: head.confidence } } : {};
    const bound = bindings.find((b) => b.end === e.end);
    const boundTo = bound && classOfMark.get(bound.nodeId);
    if (boundTo) {
      return { class: boundTo, head, headIds, quality: 1, said: { end: e.end, point: { ...point }, symbol: boundTo.id, ...sayHead, bound: true, reason: `bound by a magnet to ${boundTo.id} (${bound!.site.kind} ${bound!.site.index})` } };
    }
    if (landed) {
      const c = classOfMark.get(landed.ids.find((x) => x !== id && classOfMark.has(x))!)!;
      return { class: c, headIds: [], quality: 1, said: { end: e.end, point: { ...e.point }, symbol: c.id, reason: `it ends on ${c.id}, which heads.ts reads as a head and this notation as a class` } };
    }
    let best: { c: Candidate; d: number } | undefined;
    for (const c of kept) {
      const reach = reachOf(c);
      if (offBox(point, c.shape.bounds) > reach) continue;
      const d = outside(point, c.shape.hull);
      if (d > reach) continue;
      if (!best || d < best.d || (d === best.d && c.shape.size < best.c.shape.size)) best = { c, d };
    }
    if (!best) return { head, headIds, quality: 0, said: { end: e.end, point: { ...point }, ...sayHead, reason: head ? `past its ${head.kind}, nothing within reach` : 'nothing within reach' } };
    return {
      class: best.c,
      head,
      headIds,
      quality: 1 - 0.4 * (best.d / reachOf(best.c)),
      said: { end: e.end, point: { ...point }, symbol: best.c.id, ...sayHead, reason: `${head ? `past its ${head.kind === 'arrow' ? 'arrowhead' : head.kind}, ` : ''}${best.d === 0 ? 'on' : `${Math.round(best.d)} from`} ${best.c.id}` },
    };
  };

  for (const [id, h] of heads) {
    if (headOf.has(id)) continue;
    const node = nodes.get(id)!;
    const pts = strokePointsOf(node)!;
    const length = Math.max(1e-6, Math.hypot(pts[pts.length - 1].x - pts[0].x, pts[pts.length - 1].y - pts[0].y));
    const bindings = activeBindingsOf(node, nodes);
    const [a, b] = [h.start, h.end].map((e) => endOf(id, e, bindings, length));
    if (!a.class || !b.class || a.class === b.class) {
      // A line reaching out from one class is a pointer — unless it is a letter's size: that is writing (a "1").
      const m = marks.get(id)!;
      const letter = isLetterLike(m.bounds, m.scale) && sizeOfBounds(m.bounds) <= LETTER_PX * m.scale;
      if ((a.class || b.class) && !(a.class && b.class) && !letter) pointers.push(id);
      continue;
    }
    const ma = markerOf(a.head ? [a.head, ...h.start.heads.filter((x) => x !== a.head && !x.ids.some((y) => y !== id && classOfMark.has(y)))] : []);
    const mb = markerOf(b.head ? [b.head, ...h.end.heads.filter((x) => x !== b.head && !x.ids.some((y) => y !== id && classOfMark.has(y)))] : []);
    // `to` is the marked end: the stronger marker when both carry one.
    const rank = (m?: UmlMarker) => (m ? PRECEDENCE.indexOf(m) : Infinity);
    let [from, to, mf, mt] = [a, b, ma, mb];
    if (rank(ma.marker) < rank(mb.marker)) [from, to, mf, mt] = [b, a, mb, ma];
    const kind: RelationKind = mt.marker ?? 'link';
    const direction: NotationConnector['direction'] = mt.marker && mf.marker ? 'both' : mt.marker ? 'forward' : 'none';
    const quality = Math.min(from.quality, to.quality);
    const sure = mt.marker ? 0.75 + 0.25 * mt.sure : 0.8;
    const confidence = MAX * quality * sure;
    const reason =
      kind === 'link'
        ? `${an(h.shape)} with no head a class relation has, between ${from.class!.id} and ${to.class!.id}${mt.head || mf.head ? ` — ${[mf, mt].filter((x) => x.head).map((x) => x.why).join('; ')}` : ''}`
        : `${an(h.shape)} from ${from.class!.id} to ${to.class!.id}, ${mt.why} at ${to.class!.id}${mf.marker ? `, and ${mf.why} at ${from.class!.id}` : ''}`;
    // The other kinds it could be: each head reading its marked end holds besides, as sure as heads.ts is of it.
    const readings: UmlRelation['readings'] = [{ kind, confidence, reason }];
    const others = [...mt.others, ...(mt.marker ? [] : mf.others)];
    for (const o of others.sort((p, q) => q.sure - p.sure)) {
      const k: RelationKind = o.marker ?? mf.marker ?? 'link';
      if (readings.some((r) => r.kind === k)) continue;
      readings.push({ kind: k, confidence: Math.min(confidence, MAX * quality * 0.75 * o.sure), reason: `its head read as ${o.why}` });
    }
    const headIds = [...new Set([...a.headIds, ...b.headIds])];
    headIds.forEach((x) => edgeMarks.set(x, id));
    const said = ownWords(nodes, [id]);
    relations.push({
      id,
      ids: [id, ...headIds],
      kind,
      role: UML_CLASS_TABLE.connectors[kind].role as Role,
      direction,
      directed: direction !== 'none',
      from: from.class!.id,
      to: to.class!.id,
      ends: { from: { ...from.said, ...(mf.marker ? { marker: mf.marker } : {}) }, to: { ...to.said, ...(mt.marker ? { marker: mt.marker } : {}) } },
      confidence,
      reason,
      readings,
      labels: [],
      ...(said ? { text: said } : {}),
    });
  }

  // 7. Which classes the diagram reaches: a class with compartment lines, or a plain box a UML relation joins
  //    — and what the relations join to either. A plain box nothing says UML about is only a box.
  const parent = new Map<Candidate, Candidate>(kept.map((c) => [c, c]));
  const find = (c: Candidate): Candidate => (parent.get(c) === c ? c : (parent.set(c, find(parent.get(c)!)), parent.get(c)!));
  const byId = new Map(kept.map((c) => [c.id, c]));
  for (const r of relations) parent.set(find(byId.get(r.from)!), find(byId.get(r.to)!));
  const says = new Set<Candidate>();
  for (const c of kept) if (c.lines.length) says.add(find(c));
  for (const r of relations) if (r.kind !== 'association' && r.kind !== 'link') says.add(find(byId.get(r.from)!));
  const inDiagram = kept.filter((c) => says.has(find(c)));
  if (!inDiagram.length) return null;
  const inSet = new Set(inDiagram);
  const joined = relations.filter((r) => inSet.has(byId.get(r.from)!) && inSet.has(byId.get(r.to)!));
  const leftOut = relations.filter((r) => !joined.includes(r));

  // 8. Writing outside the classes: at a relation's end, a multiplicity; beside its middle, its label; else a note.
  const labels: NotationLabel[] = [];
  const taken = new Set<string>([...relations.flatMap((r) => r.ids), ...pointers, ...edgeMarks.keys(), ...usedWords, ...headOf]);
  const outsideWriting = [...marks.values()].filter((m) => {
    if (insideOf.has(m.id) || boxMarks.has(m.id) || lineIds.has(m.id) || inFigure.has(m.id) || taken.has(m.id)) return false;
    if (isWriting(m.node)) return true;
    // A letter the rung reads as a line — a "1" — is writing when it is small in the hand's space.
    const fp = fingerprintOf(m.node);
    return !!fp && !fp.isClosed && isLetterLike(m.bounds, m.scale) && sizeOfBounds(m.bounds) <= LETTER_PX * m.scale;
  });
  const paths = new Map(joined.map((r) => [r.id, strokePointsOf(nodes.get(r.id)!) ?? []]));
  const atEnd = new Map<string, { r: UmlRelation; end: 'from' | 'to'; ids: string[] }>();
  const onMiddle = new Map<string, string[]>();
  for (const m of outsideWriting) {
    const size = sizeOfBounds(m.bounds);
    let best: { r: UmlRelation; end: 'from' | 'to' | 'middle'; d: number; reach: number } | undefined;
    for (const r of joined) {
      const P = r.ends.from.point, Q = r.ends.to.point;
      const len = Math.max(1e-6, Math.hypot(Q.x - P.x, Q.y - P.y));
      const reachEnd = Math.max(2.5 * magnetRadius(size, m.scale), 1.6 * size);
      for (const [end, E, F] of [['from', P, Q], ['to', Q, P]] as const) {
        const t = dot(sub(m.centre, E), sub(F, E)) / (len * len);
        if (t > END_SHARE || t < -0.4) continue;
        const d = offBox(E, m.bounds);
        if (d <= reachEnd && (!best || d / reachEnd < best.d / best.reach)) best = { r, end, d, reach: reachEnd };
      }
      const t = dot(sub(m.centre, P), sub(Q, P)) / (len * len);
      if (t > END_SHARE && t < 1 - END_SHARE) {
        const reach = Math.max(2 * magnetRadius(size, m.scale), size);
        const d = distToPath(m.centre, paths.get(r.id)!) - size / 2;
        if (d <= reach && (!best || Math.max(0, d) / reach < best.d / best.reach)) best = { r, end: 'middle', d: Math.max(0, d), reach };
      }
    }
    const text = wordsOfMark(m.node);
    const base = { id: m.id, role: 'label' as Role, ...(text ? { text } : {}), bounds: { ...m.bounds } };
    if (best && best.end !== 'middle') {
      const key = `${best.r.id}:${best.end}`;
      const had = atEnd.get(key) ?? { r: best.r, end: best.end, ids: [] };
      had.ids.push(m.id);
      atEnd.set(key, had);
      labels.push({ ...base, of: best.r.id, where: 'beside', confidence: MAX * (1 - 0.4 * (best.d / best.reach)), reason: `short writing ${Math.round(best.d)} from ${best.r.id}’s end at ${best.end === 'from' ? best.r.from : best.r.to} — a multiplicity` });
      continue;
    }
    if (best) {
      onMiddle.set(best.r.id, [...(onMiddle.get(best.r.id) ?? []), m.id]);
      best.r.labels.push(m.id);
      labels.push({ ...base, of: best.r.id, where: 'beside', confidence: MAX * (1 - 0.5 * (best.d / best.reach)), reason: `writing ${Math.round(best.d)} from the middle of ${best.r.id} — its label` });
      continue;
    }
    if (isWriting(m.node)) labels.push({ ...base, where: 'alone', role: 'annotation', confidence: MAX * 0.5, reason: 'writing beside nothing in the diagram — a note' });
  }
  const readingOrder = (ids: readonly string[]) => [...ids].sort((p, q) => {
    const a = marks.get(p)!.bounds, b = marks.get(q)!.bounds;
    const sameRow = !(a.maxY < b.minY || b.maxY < a.minY);
    return sameRow ? a.minX - b.minX : a.minY - b.minY;
  });
  for (const { r, end, ids } of atEnd.values()) {
    const ordered = readingOrder(ids);
    const w = wordsOfLine(nodes, ordered.map((id) => marks.get(id)!));
    r.ends[end].multiplicity = { ...(w.text !== undefined ? { text: w.text } : {}), ids: ordered, unread: w.unread };
    r.labels.push(...ordered);
  }

  // 9. The classes: their compartments, names and members.
  const symbols: UmlClassSymbol[] = inDiagram.map((c) => {
    const f = c.frame;
    const writing = inside.get(c)!.writing;
    const compartments: UmlCompartment[] = [{ index: 1, writing: [] }, ...c.lines.map((l, i) => ({ index: i + 2, line: l.id, writing: [] as string[] }))];
    const byCompartment = new Map<number, Mark[]>(compartments.map((k) => [k.index, []]));
    for (const m of writing) {
      const q = inFrame(f, m.centre);
      const k = 1 + c.lines.filter((l) => lineVAt(l, f, q.u) < q.v).length;
      byCompartment.get(k)!.push(m);
    }
    const members: UmlMember[] = [];
    const nameParts: string[] = [];
    const nameIds: string[] = [];
    const nameUnread: string[] = [];
    const own = ownWords(nodes, c.box);
    if (own) nameParts.push(own);
    for (const k of compartments) {
      const rows = linesOfWriting(byCompartment.get(k.index)!, f);
      k.writing = rows.flat().map((m) => m.id);
      if (k.index === 1) {
        for (const row of rows) {
          const w = wordsOfLine(nodes, row);
          nameParts.push(w.text ?? UNREAD_WRITING);
          nameIds.push(...row.map((m) => m.id));
          nameUnread.push(...w.unread);
        }
        continue;
      }
      // The line that opens the compartment may carry a hand's own words: a member a line.
      const label = k.line ? labelOf(nodes.get(k.line)!)?.text : undefined;
      for (const said of (label ?? '').split('\n').map((x) => x.trim()).filter(Boolean)) {
        members.push({ text: said, kind: memberKind(said), compartment: k.index, ids: [], unread: [], from: 'label' });
      }
      for (const row of rows) {
        const w = wordsOfLine(nodes, row);
        members.push({ ...(w.text !== undefined ? { text: w.text } : {}), kind: memberKind(w.text), compartment: k.index, ids: row.map((m) => m.id), unread: w.unread, from: 'writing' });
      }
    }
    // A name runs on: its pieces' words joined, the placeholder once for a run of it.
    const name: string[] = [];
    for (const p of nameParts) if (!(p === UNREAD_WRITING && name[name.length - 1] === UNREAD_WRITING)) name.push(p);
    const nameText = name.length && !(name.length === 1 && name[0] === UNREAD_WRITING && !own) ? name.join(' ') : undefined;
    const lineScore = c.lines.length ? mean(c.lines.map((l) => l.score)) : 0;
    const confidence = MAX * c.shape.score * c.fit * (c.lines.length ? lineScore : PLAIN_CLASS);
    const lead = c.lead ? `${c.lead}: ` : '';
    const reason = c.lines.length
      ? `${lead}${c.shape.why}, with ${count(c.lines.length)} line${c.lines.length === 1 ? '' : 's'} across it — ${c.lines.map((l) => l.why).join('; ')}`
      : `${lead}${c.shape.why} and no line across it — a class with only a name, read lower`;
    const ids = [...c.box, ...c.lines.map((l) => l.id)];
    const readings: SymbolReading[] = [{ symbol: 'class', role: UML_CLASS_TABLE.symbols.class.role as Role, confidence, reason }];
    for (const m of writing) {
      const k = compartments.find((x) => x.writing.includes(m.id))!;
      labels.push({ id: m.id, of: c.id, where: 'inside', role: 'label', ...(wordsOfMark(m.node) ? { text: wordsOfMark(m.node) } : {}), bounds: { ...m.bounds }, confidence: MAX * 0.9, reason: k.index === 1 ? `writing in ${c.id}’s top compartment — its name` : `writing in ${c.id}’s compartment ${k.index} — a member` });
    }
    return {
      id: c.id,
      ids,
      symbol: 'class' as const,
      role: 'node' as Role,
      confidence,
      reason,
      readings,
      outline: c.shape.hull.map((p) => ({ x: p.x, y: p.y })),
      bounds: { ...c.shape.bounds },
      ports: sidesOf(f),
      labels: writing.map((m) => m.id),
      ...(own ? { text: own } : {}),
      box: [...c.box],
      lines: c.lines.map((l) => l.id),
      compartments,
      name: { ...(nameText !== undefined ? { text: nameText } : {}), ids: nameIds, unread: nameUnread },
      members,
      turn: turnOf(f),
    };
  });

  // 10. Roles: what every mark in the scope plays — one of the six.
  const roles: Record<string, Role> = {};
  const weight: Record<string, number> = {};
  const give = (id: string, role: Role, w: number) => {
    if (roles[id]) return;
    roles[id] = role;
    weight[id] = w;
  };
  for (const s of symbols) for (const id of s.ids) give(id, 'node', 1);
  for (const r of joined) for (const id of r.ids) give(id, 'edge', 1);
  for (const l of labels) give(l.id, l.role, l.where === 'alone' ? 0.5 : 1);
  for (const id of pointers) give(id, 'annotation', 0.5);
  for (const c of containers) for (const id of c.box) give(id, 'container', 0.5);
  const unplaced: string[] = [];
  for (const id of scope) {
    if (roles[id]) continue;
    give(id, 'unclassified', 0);
    unplaced.push(id);
  }

  // 11. Is it a class diagram, and how surely.
  const sure = (xs: number[]) => mean(xs) / MAX;
  const coverage = scope.reduce((a, id) => a + (weight[id] ?? 0), 0) / scope.length;
  const joinedClasses = new Set(joined.flatMap((r) => [r.from, r.to]));
  const connected = symbols.length > 1 ? symbols.filter((s) => joinedClasses.has(s.id)).length / symbols.length : 1;
  const classSure = sure(symbols.map((s) => s.confidence));
  const relationSure = joined.length ? sure(joined.map((r) => r.confidence)) : 1;
  const compartmented = symbols.filter((s) => s.lines.length).length / symbols.length;
  const umlHeads = joined.length ? joined.filter((r) => r.kind !== 'association' && r.kind !== 'link').length / joined.length : 0;
  const evidence = Math.max(compartmented, umlHeads);
  const alone = joined.length ? 1 : 0.75;
  const confidence = MAX * Math.sqrt(coverage * connected) * Math.sqrt(classSure * relationSure) * (0.6 + 0.4 * evidence) * alone;

  const counts: Record<string, number> = { class: symbols.length };
  for (const k of KINDS) counts[k] = joined.filter((r) => r.kind === k).length;
  counts.multiplicity = joined.reduce((a, r) => a + (r.ends.from.multiplicity ? 1 : 0) + (r.ends.to.multiplicity ? 1 : 0), 0);
  counts.label = joined.filter((r) => onMiddle.has(r.id)).length;
  const T = UML_CLASS_TABLE;
  const parts = [`${count(symbols.length)} ${symbols.length === 1 ? T.symbols.class.one : T.symbols.class.many}`];
  for (const k of KINDS) if (counts[k]) parts.push(`${count(counts[k])} ${counts[k] === 1 ? T.connectors[k].one : T.connectors[k].many}`);
  if (counts.multiplicity) parts.push(`${count(counts.multiplicity)} ${counts.multiplicity === 1 ? T.labels.multiplicity.one : T.labels.multiplicity.many}`);
  const summary = parts.join(', ');
  const plain = symbols.filter((s) => !s.lines.length).length;
  const reason = [
    plain ? `${count(symbols.length - plain)} with compartments, ${count(plain)} a plain box` : symbols.length === 1 ? 'its compartments read' : 'every class with its compartments',
    joined.length ? (connected === 1 ? 'every class joined' : `${count(symbols.filter((s) => joinedClasses.has(s.id)).length)} of ${count(symbols.length)} classes joined`) : 'no relation',
    tables.size ? `${count(tables.size)} box${tables.size === 1 ? '' : 'es'} with more lines across ${tables.size === 1 ? 'it' : 'them'} than a class has — a table` : '',
    sketches.size ? `${count(sketches.size)} box${sketches.size === 1 ? '' : 'es'} holding a mark that is no writing — not a class` : '',
    leftOut.length ? `${count(leftOut.length)} line${leftOut.length === 1 ? '' : 's'} between boxes nothing says are classes` : '',
    unplaced.length ? `${count(unplaced.length)} mark${unplaced.length === 1 ? '' : 's'} it places nowhere` : '',
  ].filter(Boolean).join(', ');

  // In the scope's own order.
  const order = new Map(scope.map((id, i) => [id, i]));
  const firstOf = (ids: readonly string[]) => Math.min(...ids.map((id) => order.get(id) ?? Infinity));
  symbols.sort((p, q) => firstOf([p.id, ...p.ids]) - firstOf([q.id, ...q.ids]));
  labels.sort((p, q) => (order.get(p.id) ?? 0) - (order.get(q.id) ?? 0));
  joined.sort((p, q) => (order.get(p.id) ?? 0) - (order.get(q.id) ?? 0));

  return {
    notation: 'uml-class',
    name: T.name,
    confidence,
    summary,
    reason: `${summary} — ${reason}`,
    symbols,
    connectors: joined,
    labels,
    roles,
    unplaced,
    counts,
  };
}

// ===== The notation =====

export const UML_CLASS: Notation = {
  id: 'uml-class',
  name: UML_CLASS_TABLE.name,
  describes: UML_CLASS_TABLE.describes,
  symbols: [{ name: 'class', role: UML_CLASS_TABLE.symbols.class.role as Role, describes: UML_CLASS_TABLE.symbols.class.describes, ports: UML_CLASS_TABLE.symbols.class.ports }],
  connectors: KINDS.map((k) => ({ name: k, role: UML_CLASS_TABLE.connectors[k].role as Role, describes: UML_CLASS_TABLE.connectors[k].describes })),
  read: (state, scopeIds) => readUmlClass(state, scopeIds),
  ports: { notation: 'uml-class', portsOf: umlClassPortsOf } satisfies NotationPorts,
};

// The sequence notation (V1-PLAN §3, §9 D5; acceptance A3).
//
// Participants and the messages between them, in order down the page, read
// from ink:
//
//   - **participant** — a box at the top of a long vertical line, its
//     lifeline. The box is one closed stroke the shape rung reads as a
//     rectangle, square to the page within a hand's tilt, or strokes ruled
//     into one (diagram/figures.ts); its name is the writing in it.
//   - **actor** — a small stick figure, read so: a circle (its head) with a
//     body running down from under it and at least one more short line
//     beside the body — arms, or legs — all of them close under the head.
//     Its name is the writing under the figure; its lifeline starts below.
//   - **lifeline** — a long line (LIFELINE_PX on screen, and LIFELINE_OF_BOX
//     times its box's height), within LIFELINE_PLUMB of plumb, one stroke or
//     dashed (notations/dashes.ts): its top stands under its box's bottom
//     middle — within LIFELINE_MIDDLE of the box's width of it, no further
//     below the box than LIFELINE_BELOW of its height or a hand's reach — and
//     runs down. A line with a head (an arrow) is none; neither is one whose
//     bottom lands on another box, or whose top has a head drawn at it: those
//     are a flowchart's flow and a class diagram's relation. Pieces standing
//     one under the next in the same column are one lifeline — a hand lifts
//     the pen, a head drawn at a dashed lifeline breaks its dashes.
//   - **the trap** — to the relation table a lifeline TOUCHES its box and is
//     an edge from it, and a message CROSSES every lifeline between its ends.
//     So participants are read from the geometry — a box with a long line
//     from its bottom middle — never from the role or relation tables; and a
//     message goes where its ENDS land, read past their heads, whatever it
//     crosses on the way (A → C passing B is A → C).
//   - **message** — a roughly level connector (within MESSAGE_LEVEL) whose
//     ends, past their heads (diagram/heads.ts, a magnet's bind first), land
//     on two lifelines. Solid with a head at one end: a call (`->>`); dashed
//     with a head: a return (`-->>`); with no head, `->` and `-->`, from the
//     end it was drawn from; heads at both ends, `<<->>` and `<<-->>`.
//   - **self-message** — a loop out from a lifeline and back to it: one open
//     stroke both of whose ends land on the same lifeline, bulging to one
//     side. Its head is where it comes back: its own barb — the pen folding
//     back out at the end — or a head drawn apart there, read as heads.ts
//     reads the leg that arrives, on a scratch board.
//   - **labels** — the writing just above a message is its label (a
//     self-message's above its loop, or beside it); a participant's name is
//     the writing in its box, or under its figure; a word a hand put on its
//     own ink (`label`) is the symbol's or the message's own. Writing beside
//     nothing is a note.
//
// Messages are ordered by height — the middle of a message's two ends, or a
// self-message's upper end — which is the order Mermaid writes them in;
// participants left to right by their lifelines. Each lifeline is a
// continuous port along its whole length (`along:sequence`), offered through
// E3's hook once the notation is.
//
// Every symbol plays one of the six roles and adds none: a participant or an
// actor is a node (its box or figure and its lifeline the strokes it is drawn
// with), a message an edge (its line, dashes and heads), writing a label, a
// note an annotation. Derived, like every notation: nothing enters the log.
// Its content — names, roles, ports, the Mermaid of each symbol and arrow —
// is the table below, its single home; the sequence@1 pack names this
// notation and restates none of it (V1-PLAN §2.3, B3). What a dashed
// self-message is, and a cross (`-x`) or an open async head (`-)`), it does
// not read: a dashed line is read straight, and heads.ts has no cross.

import type { Bounds, Point } from '../types';
import type { SessionState } from '../session/session';
import { createSession } from '../session/session';
import type { MMNode } from '../session/nodes';
import { boundsOf, fingerprintOf, getRep, isWord, labelOf, lettersOf, resemblances, strokePointsOf, transcriptOf } from '../session/nodes';
import type { NotationPort, NotationPorts } from '../session/ports';
import { activeBindingsOf, magnetRadius } from '../session/magnets';
import type { ConnectorEnd, ConnectorHeads, HeadReading } from '../diagram/heads';
import { headsOf } from '../diagram/heads';
import { figuresAmong } from '../diagram/figures';
import type { Role } from '../diagram/roles';
import { MAX_TIER0_CONFIDENCE } from '../recognition';
import type { Notation, NotationConnector, NotationEnd, NotationLabel, NotationReading, NotationSymbol, SymbolReading } from './notation';
import { areaOf, cornersOf, distToPath, hullOf, outside, ramp, stanceOf } from './shape';
import { CORNERED, SQUARE, THREE_CORNERED } from './flowchart';
import { UNREAD_WRITING } from './mermaid';
import { zigzagOf } from './uml-class';
import type { DashedLine } from './dashes';
import { dashedHeads, dashedLines } from './dashes';

// ===== The table — the sequence diagram's content =====

/**
 * The sequence diagram's content: its two symbols, its messages, the writing
 * it reads, each with the role it plays, and how each is said in Mermaid
 * (D5's writer writes with these). Content, not code, and this is its single
 * home: the `sequence@1` pack names the notation and restates none of it.
 */
export const SEQUENCE_TABLE = {
  pack: 'sequence@1',
  notation: 'sequence',
  name: 'Sequence diagram',
  describes: 'participants, each at the top of its lifeline, and the messages between them in order down the page',
  symbols: {
    participant: {
      role: 'node',
      describes: 'a box at the top of a long vertical line — its lifeline, one stroke or dashed — the name written in the box',
      ports: 'anywhere along its lifeline',
      one: 'participant',
      many: 'participants',
      mermaid: 'participant',
    },
    actor: {
      role: 'node',
      describes: 'a small stick figure — a circle over a body and a few short lines — at the top of its lifeline, the name written under it',
      ports: 'anywhere along its lifeline',
      one: 'actor',
      many: 'actors',
      mermaid: 'actor',
    },
  },
  connectors: {
    call: { role: 'edge', describes: 'a solid, roughly level line from one lifeline to another, directed by its head', one: 'call', many: 'calls', mermaid: { head: '->>', none: '->', both: '<<->>' } },
    return: { role: 'edge', describes: 'a dashed, roughly level line from one lifeline to another, directed by its head', one: 'return', many: 'returns', mermaid: { head: '-->>', none: '-->', both: '<<-->>' } },
    self: { role: 'edge', describes: 'a loop out from a lifeline and back to it, its head where it comes back', one: 'self-message', many: 'self-messages', mermaid: { head: '->>', none: '->', both: '->>' } },
  },
  labels: {
    name: { role: 'label', describes: 'the writing in a participant’s box, or under an actor’s figure' },
    message: { role: 'label', describes: 'the writing just above a message — above a self-message’s loop, or beside it' },
  },
  mermaid: { header: 'sequenceDiagram' },
} as const;

type ParticipantKind = keyof typeof SEQUENCE_TABLE.symbols;
export type MessageKind = keyof typeof SEQUENCE_TABLE.connectors;
const KINDS = Object.keys(SEQUENCE_TABLE.connectors) as MessageKind[];

// ===== Thresholds — this notation's own; the hand's are cited =====

/** A lifeline stands within this many degrees of plumb: full to the first, gone by the second. */
export const LIFELINE_PLUMB = [10, 20] as const;
/** …is at least this long on screen… */
export const LIFELINE_PX = 60;
/** …and at least this many times as long as its box is tall. */
export const LIFELINE_OF_BOX = 1.5;
/** Its top stands within this share of the box's width of its bottom middle… */
export const LIFELINE_MIDDLE = 0.3;
/** …and below the box's bottom edge by at most this share of its height — or the hand's reach, whichever is more. */
export const LIFELINE_BELOW = 0.35;
/** A lifeline's next piece starts within this share of its length below the last — or these pixels on screen, whichever is more. */
export const LIFELINE_GAP = 0.15;
export const LIFELINE_GAP_PX = 40;
/** A participant's box stands square to the page within this many degrees: full to the first, gone by the second (a diamond is a decision). */
export const BOX_UPRIGHT = [15, 30] as const;
/** A box reads as a participant's from this score. */
export const BOX_FLOOR = 0.3;
/** An actor's head is a circle this big on screen, at least and at most. */
export const HEAD_PX = [10, 80] as const;
/** A message lies within this many degrees of level: full to the first, gone by the second. */
export const MESSAGE_LEVEL = [12, 25] as const;
/** A message's end lands on a lifeline within the hand's reach of it — the magnet radius — or this share of the message's length, whichever is more. */
export const LAND_SHARE = 0.06;
/** A self-message's loop bulges out from its lifeline at least this far on screen… */
export const LOOP_PX = 12;
/** …and comes back at least this far below or above where it left. */
export const LOOP_SPAN_PX = 8;
/** Writing is a message's label when its bottom stands above the message by no more than this many times its own height — or the hand's reach… */
export const LABEL_ABOVE = 1.2;
/** …and dips below it by no more than this share of its height. */
export const LABEL_DIP = 0.35;
/** A mark is inside a box when this share of its ink is. */
export const INK_INSIDE = 0.6;
/** A stroke that crosses its own line this many times, beyond a hand's wobble, is writing — whatever the rung reads it as. */
export const WRITING_ZIGZAG = 4;
/** A per-mark reading below this offers no ports: the pen should not feel a guess. */
export const PORTS_FLOOR = 0.4;

const MAX = MAX_TIER0_CONFIDENCE;
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const count = (n: number) => WORDS[n] ?? String(n);
const deg = (x: number) => `${Math.max(0, Math.round(x))}°`;
const pct = (x: number) => `${Math.round(x * 100)}%`;
const DEG = 180 / Math.PI;
const scaleOf = (node: MMNode) => (getRep(node, 'stroke')?.data as { scale?: number } | undefined)?.scale ?? 1;
const atOf = (node: MMNode) => (getRep(node, 'stroke')?.data as { at?: number } | undefined)?.at ?? node.createdAt;
const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const centreOf = (b: Bounds): Point => ({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 });
const sizeOfBounds = (b: Bounds) => Math.max(b.maxX - b.minX, b.maxY - b.minY);
const mean = (xs: readonly number[]) => xs.reduce((a, x) => a + x, 0) / Math.max(1, xs.length);
const boundsOfPoints = (pts: readonly Point[]): Bounds => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
};
const union = (bs: readonly Bounds[]): Bounds => ({ minX: Math.min(...bs.map((b) => b.minX)), minY: Math.min(...bs.map((b) => b.minY)), maxX: Math.max(...bs.map((b) => b.maxX)), maxY: Math.max(...bs.map((b) => b.maxY)) });
/** How far a point stands from a box: 0 inside it. */
const offBox = (p: Point, b: Bounds) => Math.hypot(Math.max(0, b.minX - p.x, p.x - b.maxX), Math.max(0, b.minY - p.y, p.y - b.maxY));
/** How far a direction lies off plumb, 0–90°. */
const offPlumb = (v: Point) => Math.atan2(Math.abs(v.x), Math.abs(v.y)) * DEG;
/** How far a direction lies off level, 0–90°. */
const offLevel = (v: Point) => Math.atan2(Math.abs(v.y), Math.abs(v.x)) * DEG;

// ===== The reading's own shapes =====

/** A participant, as the notation reads it: a symbol with its lifeline and its name. */
export interface SequenceParticipant extends NotationSymbol {
  symbol: ParticipantKind;
  /** What it is drawn as: its box (the stroke, or the strokes it is ruled with), or its figure's strokes, the head first. */
  figure: string[];
  /** Its lifeline: the stroke, or the dashes — every piece, top to bottom. */
  lifeline: string[];
  /** Drawn dashed, or one line. */
  dashed: boolean;
  /** Where its lifeline runs, top to bottom. */
  top: Point;
  bottom: Point;
  /** Its name: the words when known, the writing it is written with, and which of that nobody has read. */
  name: { text?: string; ids: string[]; unread: string[] };
}

/** A message between two lifelines — or from one back to itself. */
export interface SequenceMessage extends NotationConnector {
  kind: MessageKind;
  /** One stroke, or dashes. */
  line: 'solid' | 'dashed';
  /** How Mermaid says it: '->>', '->', '-->>', '-->', '<<->>', '<<-->>'. */
  arrow: string;
  /** How high it runs, which is what the messages are ordered by: the middle of its two ends, or a self-message's upper end. */
  at: number;
  /** Its place down the page, from 1. */
  order: number;
}

/** What a scope is as a sequence diagram. */
export interface SequenceReading extends NotationReading {
  notation: 'sequence';
  symbols: SequenceParticipant[];
  connectors: SequenceMessage[];
}

// ===== Marks, strokes, writing =====

interface Mark {
  id: string;
  node: MMNode;
  bounds: Bounds;
  centre: Point;
  scale: number;
}

/** A stroke of the scope: a loose one, or a letter standing for its word. */
interface Stroke {
  id: string;
  mark: string;
  node: MMNode;
  ink: Point[];
  bounds: Bounds;
  size: number;
  scale: number;
}

/** Writing: a word, a mark somebody has read, or a stroke the shape rung reads as text. */
function isWriting(node: MMNode): boolean {
  if (isWord(node) || transcriptOf(node)) return true;
  return resemblances(node)[0]?.to === 'type:text';
}

/**
 * Writing, or a stroke that zigzags across its own line as writing does
 * (uml-class.ts's measure) — a flat scribble the rung reads as a line is
 * still the words above a message.
 */
function writingLike(node: MMNode, ink: readonly Point[] | undefined, scale: number): boolean {
  if (isWriting(node)) return true;
  if (!ink || fingerprintOf(node)?.isClosed) return false;
  return zigzagOf(ink, scale) >= WRITING_ZIGZAG;
}

/** What a piece of writing says, when anybody has read it or a hand labelled its own ink. */
function wordsOfMark(node: MMNode): string | undefined {
  const t = (transcriptOf(node) ?? labelOf(node)?.text)?.trim();
  return t ? t : undefined;
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

/** A top reading of the shape rung, and how sure. */
const topOf = (node: MMNode) => {
  const e = resemblances(node)[0];
  return e ? { type: e.to.replace(/^type:/, ''), weight: e.weight ?? 0 } : null;
};
const reads = (node: MMNode, type: string, floor = 0) => resemblances(node).some((e) => e.to === `type:${type}` && (e.weight ?? 0) >= floor);

// ===== Boxes and figures =====

interface Box {
  hull: Point[];
  bounds: Bounds;
  size: number;
  w: number;
  h: number;
  score: number;
  why: string;
}

/** An outline as a participant's box: four corners holding it, square, upright within a hand's tilt. */
function boxOf(points: readonly Point[], figure: boolean): Box | null {
  const hull = hullOf(points);
  if (hull.length < 3 || areaOf(hull) <= 0) return null;
  const { share, three, quad } = cornersOf(hull);
  if (quad.length !== 4) return null;
  const st = stanceOf(quad);
  const four = figure ? 1 : share;
  const notThree = figure ? 1 : 1 - ramp(three, THREE_CORNERED[0], THREE_CORNERED[1]);
  const cornered = ramp(four, CORNERED[0], CORNERED[1]) * notThree;
  const square = 1 - ramp(st.square, SQUARE[0], SQUARE[1]);
  const upright = 1 - ramp(st.upright, BOX_UPRIGHT[0], BOX_UPRIGHT[1]);
  const bounds = boundsOfPoints(hull);
  return {
    hull,
    bounds,
    size: sizeOfBounds(bounds),
    w: bounds.maxX - bounds.minX,
    h: bounds.maxY - bounds.minY,
    score: cornered * square * upright,
    why: `a box — its four corners hold ${pct(four)} of it, within ${deg(st.square)} of square and ${deg(st.upright)} of upright`,
  };
}

/** What a participant is drawn as, before its lifeline is found: a box, or a stick figure. */
interface Head {
  kind: ParticipantKind;
  /** What stands for it: the box's stroke, a ruled box's figure, the figure's head. */
  id: string;
  /** Its strokes: the box's, or the figure's with the head first. */
  strokes: string[];
  /** The scope marks they stand for. */
  marks: string[];
  outline: Point[];
  bounds: Bounds;
  /** Where its lifeline hangs from: the box's bottom middle, or under the figure. */
  foot: Point;
  /** How far across the foot the lifeline's top may stand, and how far below it. */
  across: number;
  below: number;
  /** How tall it is — a lifeline is longer than a box is tall. */
  height: number;
  scale: number;
  score: number;
  why: string;
  /** For an actor: the region its name is written in, under the figure. */
  nameBelow?: Bounds;
  box?: Box;
}

/**
 * A stick figure around a circle: a body running down from under the head,
 * and at least one more short line — arms or legs — all close under it.
 */
function figureOf(head: Stroke, open: readonly Stroke[], used: ReadonlySet<string>): Head | null {
  const s = head.size;
  const hand = s / head.scale;
  if (hand < HEAD_PX[0] || hand > HEAD_PX[1]) return null;
  const c = centreOf(head.bounds);
  const region: Bounds = { minX: c.x - 2.2 * s, maxX: c.x + 2.2 * s, minY: head.bounds.minY + 0.3 * s, maxY: head.bounds.maxY + 3.5 * s };
  const reach = Math.max(0.35 * s, 4 * head.scale);
  const near = open.filter((o) => !used.has(o.id) && o.size <= 3 * s && o.bounds.minX >= region.minX && o.bounds.maxX <= region.maxX && o.bounds.minY >= region.minY && o.bounds.maxY <= region.maxY);
  if (near.length < 2) return null;
  // The body: an end close under the head, running down.
  const bottom = { x: c.x, y: head.bounds.maxY };
  let body: Stroke | null = null, bodyScore = 0;
  for (const o of near) {
    const a = o.ink[0], b = o.ink[o.ink.length - 1];
    const [top, low] = a.y <= b.y ? [a, b] : [b, a];
    const d = Math.min(dist(top, bottom), distToPath(top, head.ink));
    if (d > reach || low.y - top.y < 0.6 * s) continue;
    const plumb = 1 - ramp(offPlumb(sub(low, top)), 20, 35);
    const score = plumb * (1 - 0.5 * (d / reach));
    if (score > bodyScore) (body = o), (bodyScore = score);
  }
  if (!body) return null;
  // The rest: each touching the head, the body or another limb already found.
  const limbs = [body];
  let grew = true;
  while (grew) {
    grew = false;
    for (const o of near) {
      if (limbs.includes(o)) continue;
      const touches = [head, ...limbs].some((l) => o.ink.some((p) => distToPath(p, l.ink) <= reach));
      if (touches) {
        limbs.push(o);
        grew = true;
      }
    }
  }
  if (limbs.length < 2) return null;
  const strokes = [head, ...limbs];
  const bounds = union(strokes.map((x) => x.bounds));
  const circle = (topOf(head.node)?.weight ?? 0) / MAX;
  const score = Math.min(1, circle) * bodyScore * (limbs.length >= 3 ? 1 : 0.85);
  return {
    kind: 'actor',
    id: head.id,
    strokes: strokes.map((x) => x.id),
    marks: [...new Set(strokes.map((x) => x.mark))],
    outline: hullOf(strokes.flatMap((x) => x.ink)),
    bounds,
    foot: { x: c.x, y: bounds.maxY },
    across: Math.max(0.8 * s, 12 * head.scale),
    below: Math.max(4 * s, 70 * head.scale),
    height: bounds.maxY - bounds.minY,
    scale: head.scale,
    score,
    why: `a stick figure — a circle with a body running down from under it and ${count(limbs.length - 1)} more short line${limbs.length === 2 ? '' : 's'} beside it`,
    nameBelow: { minX: c.x - 2 * s, maxX: c.x + 2 * s, minY: bounds.maxY - 0.3 * s, maxY: bounds.maxY + Math.max(1.5 * s, 24 * head.scale) },
  };
}

// ===== Lifelines =====

/** A vertical piece a lifeline may be made of: one stroke, or a dashed line. */
interface Piece {
  id: string;
  /** Its strokes, top to bottom. */
  strokes: string[];
  marks: string[];
  top: Point;
  bottom: Point;
  dashed: boolean;
  scale: number;
  sure: number;
  why: string;
}

/** Where a lifeline runs across at height `y`, between its top and bottom. */
const xAt = (top: Point, bottom: Point, y: number) => (bottom.y === top.y ? top.x : top.x + ((bottom.x - top.x) * (y - top.y)) / (bottom.y - top.y));

/** A stroke as a piece of lifeline: open, a line the rung is sure of, near plumb, long on screen. */
function solidPiece(s: Stroke): Piece | null {
  const fp = fingerprintOf(s.node);
  if (!fp || fp.isClosed || s.ink.length < 2) return null;
  const top = topOf(s.node);
  if (!top || top.type !== 'line') return null;
  const a = s.ink[0], b = s.ink[s.ink.length - 1];
  const [hi, lo] = a.y <= b.y ? [a, b] : [b, a];
  if ((lo.y - hi.y) / s.scale < LIFELINE_PX) return null;
  const plumb = 1 - ramp(offPlumb(sub(lo, hi)), LIFELINE_PLUMB[0], LIFELINE_PLUMB[1]);
  if (plumb <= 0) return null;
  return { id: s.id, strokes: [s.id], marks: [s.mark], top: hi, bottom: lo, dashed: false, scale: s.scale, sure: plumb * Math.min(1, top.weight / MAX), why: `a line ${deg(offPlumb(sub(lo, hi)))} off plumb` };
}

/** A dashed line as a piece of lifeline: near plumb, long on screen. */
function dashedPiece(l: DashedLine, scale: number): Piece | null {
  const [hi, lo] = l.from.y <= l.to.y ? [l.from, l.to] : [l.to, l.from];
  if ((lo.y - hi.y) / scale < LIFELINE_PX) return null;
  const plumb = 1 - ramp(offPlumb(sub(lo, hi)), LIFELINE_PLUMB[0], LIFELINE_PLUMB[1]);
  if (plumb <= 0) return null;
  const strokes = l.from.y <= l.to.y ? [...l.ids] : [...l.ids].reverse();
  return { id: l.id, strokes, marks: [...l.marks], top: hi, bottom: lo, dashed: true, scale, sure: plumb * (l.confidence / MAX), why: `${l.dashes} dashes ${deg(offPlumb(sub(lo, hi)))} off plumb` };
}

/** A participant's lifeline: the pieces that run down from under its box, one under the next. */
interface Lifeline {
  pieces: Piece[];
  top: Point;
  bottom: Point;
  length: number;
  dashed: boolean;
  sure: number;
  why: string;
}

// ===== Heads at the ends of a message =====

/** What points: an open arrow, or a triangle — a head a message arrives with. */
const pointing = (h: HeadReading) => h.kind === 'arrow' || h.kind === 'triangle';

/** A connector end as the notation reads it: the head that points there, if any, and where the end really is. */
interface ReadEnd {
  end: 'start' | 'end';
  point: Point;
  head?: HeadReading;
  reason: string;
}

function readEnd(e: ConnectorEnd, landOn?: (id: string) => boolean): ReadEnd {
  // A head that is the lifeline itself (a dash of it, the box) is no head: the message lands there.
  const heads = e.heads.filter((h) => pointing(h) && !(landOn && h.ids.some(landOn)));
  const head = heads[0];
  return { end: e.end, point: head ? { ...head.tip } : { ...e.point }, ...(head ? { head } : {}), reason: head ? head.reason : e.reason };
}

/**
 * heads.ts's reading of a connector's two ends, asked on a scratch board
 * where the connector and every small stroke near its ends stand each on its
 * own — so a head the letter rules gathered into a word (with the connector,
 * or with the writing beside it) is read as the head it is; heads.ts takes a
 * word for writing. The ids in each head are the board's own.
 */
function headsApart(conn: Stroke, others: readonly Stroke[]): ConnectorHeads | null {
  const a = conn.ink[0], b = conn.ink[conn.ink.length - 1];
  const length = dist(a, b);
  const scratch = createSession();
  let t = 1;
  const id = scratch.addStroke(conn.ink.map((p) => ({ x: p.x, y: p.y })), t, undefined, conn.scale, { content: true });
  const back = new Map<string, string>([[id, conn.id]]);
  for (const o of others) {
    if (o.id === conn.id || o.size > 0.5 * length) continue;
    const reach = magnetRadius(o.size, o.scale) * 1.5;
    if (offBox(a, o.bounds) > reach && offBox(b, o.bounds) > reach) continue;
    back.set(scratch.addStroke(o.ink.map((p) => ({ x: p.x, y: p.y })), (t += 10_000), undefined, o.scale, { content: true }), o.id);
  }
  const h = headsOf(scratch.getState(), id);
  if (!h) return null;
  const map = (e: ConnectorEnd): ConnectorEnd => ({ ...e, heads: e.heads.filter((x) => x.ids.every((k) => back.has(k))).map((x) => ({ ...x, ids: [...new Set(x.ids.map((k) => back.get(k)!))], tip: { ...x.tip } })) });
  return { id: conn.id, shape: h.shape, start: map(h.start), end: map(h.end) };
}

/**
 * A self-message's heads, one at each end of the loop. The leg that arrives
 * — from where the loop is well out to where it meets the lifeline — carries
 * its head at the lifeline: its own barb, when past the point nearest the
 * lifeline the pen goes back out along a wing (the rung reads a short leg
 * with a two-wing barb as writing, so the fold is measured here); else a head
 * drawn apart, read by heads.ts on a scratch board where the leg is one
 * straight stroke with the small marks drawn near its end. The ids in each
 * head are the board's own.
 */
function loopHeads(loop: Stroke, lineX: (y: number) => number, side: number, others: readonly Stroke[]): { start: ReadEnd; end: ReadEnd } {
  const pts = loop.ink;
  const out = pts.map((p) => side * (p.x - lineX(p.y)));
  const far = Math.max(...out);
  const legOf = (which: 'start' | 'end'): ReadEnd => {
    const idx = which === 'end' ? pts.map((_, i) => i) : pts.map((_, i) => pts.length - 1 - i);
    let f = 0;
    idx.forEach((i, k) => {
      if (out[i] >= 0.7 * far) f = k;
    });
    const tail = idx.slice(f);
    const endPoint = pts[idx[idx.length - 1]];
    const plain: ReadEnd = { end: which, point: { ...endPoint }, reason: `a plain ${which}: nothing sits there` };
    if (tail.length < 3) return plain;
    // Its own barb: the pen reaches the lifeline, then folds back out along a wing.
    let k = 0;
    tail.forEach((i, j) => {
      if (out[i] < out[tail[k]]) k = j;
    });
    const wing = Math.max(0, ...tail.slice(k).map((i) => out[i] - out[tail[k]]));
    const came = out[tail[0]] - out[tail[k]];
    const least = Math.max(4 * loop.scale, 0.06 * far);
    if (k < tail.length - 1 && wing >= least && wing <= 0.6 * far && came >= 0.5 * far) {
      const tip = pts[tail[k]];
      const reason = `its own barb at the loop’s ${which}: the pen reaches the lifeline and folds back out ${Math.round(wing / loop.scale)} px — an open arrow`;
      return { end: which, point: { ...tip }, head: { kind: 'arrow', filled: false, confidence: MAX * (0.75 + 0.25 * ramp(wing / least, 1, 2)), reason, ids: [loop.id], tip: { ...tip } }, reason };
    }
    // A head drawn apart at the end: the leg straight, and the small marks near it, on a scratch board.
    const near = others.filter((o) => o.id !== loop.id && o.size <= 0.5 * far && offBox(endPoint, o.bounds) <= magnetRadius(o.size, o.scale) * 1.5);
    if (!near.length) return plain;
    const a = pts[tail[0]];
    const n = Math.max(12, Math.round(dist(a, endPoint) / (3 * loop.scale)));
    const leg: Point[] = [];
    for (let j = 0; j <= n; j++) leg.push({ x: a.x + ((endPoint.x - a.x) * j) / n, y: a.y + ((endPoint.y - a.y) * j) / n });
    const scratch = createSession();
    let t = 1;
    const id = scratch.addStroke(leg, t, undefined, loop.scale, { content: true });
    const back = new Map<string, string>([[id, loop.id]]);
    for (const o of near) back.set(scratch.addStroke(o.ink.map((p) => ({ x: p.x, y: p.y })), (t += 10_000), undefined, o.scale, { content: true }), o.id);
    const h = headsOf(scratch.getState(), id);
    const head = (h?.end.heads ?? []).filter((x) => pointing(x) && x.ids.every((q) => back.has(q)) && !x.ids.includes(id)).map((x) => ({ ...x, ids: x.ids.map((q) => back.get(q)!), tip: { ...x.tip }, reason: x.reason.replace(/at its end/g, `at the loop’s ${which}`) }))[0];
    return head ? { end: which, point: { ...head.tip }, head, reason: head.reason } : plain;
  };
  return { start: legOf('start'), end: legOf('end') };
}

// ===== The E3 hook: one mark, and the ports its lifeline offers =====

let reading = 0;

/**
 * What the sequence diagram reads one mark as, on its own, and the ports it
 * offers — the notation's side of E3's hook. A lifeline — one stroke, or a
 * dash of a dashed one — hanging from a box or a stick figure offers its
 * whole length; anything else offers nothing. Re-entry answers nothing.
 */
export function sequencePortsOf(node: MMNode, nodes: ReadonlyMap<string, MMNode>): { symbol: string; ports: NotationPort[] } | null {
  if (reading > 0) return null;
  reading++;
  try {
    if (getRep(node, 'erased') || getRep(node, 'gesture') || isWord(node) || !getRep(node, 'stroke')) return null;
    const b = boundsOf(node);
    if (!b) return null;
    const scale = scaleOf(node);
    // The column the lifeline stands in, and everything drawn there: a lifeline, its dashes, the box it hangs from.
    const margin = 60 * scale;
    const column: string[] = [];
    for (const [id, n] of nodes) {
      if (getRep(n, 'erased') || getRep(n, 'gesture') || n.edges.some((e) => e.rel === 'part-of' && !e.blessed)) continue;
      const nb = boundsOf(n);
      if (!nb || nb.maxX < b.minX - margin - 400 * scale || nb.minX > b.maxX + margin + 400 * scale) continue;
      column.push(id);
    }
    const state = { nodes: nodes as Map<string, MMNode>, contentIds: column, artifacts: [] as string[] } as unknown as SessionState;
    const r = readSequence(state, column, { lifelinesOnly: true });
    const p = r?.symbols.find((x) => x.lifeline.includes(node.id));
    if (!p || p.confidence < PORTS_FLOOR) return null;
    return { symbol: 'lifeline', ports: p.ports };
  } finally {
    reading--;
  }
}

// ===== Reading a scope =====

interface ReadOptions {
  /** Read the participants and their lifelines only — what the ports need. */
  lifelinesOnly?: boolean;
}

/**
 * The sequence diagram a scope makes — the board's content plane when no
 * scope is given — or null when it holds fewer than two participants, each
 * a box or a stick figure over its lifeline, or no message between two of
 * them. Reads the session and changes nothing in it.
 */
export function readSequence(state: SessionState, scopeIds?: readonly string[], opts: ReadOptions = {}): SequenceReading | null {
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

  // The strokes: loose ones, and each letter of each word, standing for its word.
  const strokes = new Map<string, Stroke>();
  const addStroke = (id: string, mark: string) => {
    const n = nodes.get(id);
    if (!n || getRep(n, 'erased') || getRep(n, 'gesture') || !getRep(n, 'stroke')) return;
    const ink = strokePointsOf(n);
    const b = boundsOf(n);
    if (!ink || ink.length < 2 || !b) return;
    strokes.set(id, { id, mark, node: n, ink, bounds: b, size: sizeOfBounds(b), scale: scaleOf(n) });
  };
  for (const m of marks.values()) {
    if (isWord(m.node)) for (const l of lettersOf(m.node)) addStroke(l, m.id);
    else addStroke(m.id, m.id);
  }
  const loose = [...strokes.values()].filter((s) => s.mark === s.id);
  const closedOf = (s: Stroke) => !!fingerprintOf(s.node)?.isClosed;
  const writes = (s: Stroke) => writingLike(s.node, s.ink, s.scale);

  // 1. What participants hang from: boxes (one stroke, or ruled), and stick figures.
  const heads: Head[] = [];
  const used = new Set<string>();
  for (const s of loose) {
    if (!closedOf(s) || isWriting(s.node) || !reads(s.node, 'rectangle')) continue;
    const box = boxOf(s.ink, false);
    if (!box || box.score < BOX_FLOOR) continue;
    heads.push(headOfBox(s.id, [s.id], [s.mark], box, s.scale, ''));
  }
  const openLoose = loose.filter((s) => !closedOf(s) && !writes(s));
  for (const f of figuresAmong(nodes, openLoose.map((s) => s.id))) {
    if (f.vertices.length !== 4) continue;
    const box = boxOf(f.vertices, true);
    if (!box || box.score < BOX_FLOOR) continue;
    heads.push(headOfBox(f.id, [...f.ids], [...f.ids], { ...box, score: box.score * (f.confidence / MAX) }, strokes.get(f.ids[0])!.scale, `${count(f.ids.length)} strokes whose ends meet: `));
    f.ids.forEach((id) => used.add(id));
  }
  for (const s of loose) {
    if (!closedOf(s) || !reads(s.node, 'circle', 0.4) || topOf(s.node)?.type !== 'circle') continue;
    const fig = figureOf(s, openLoose, used);
    if (!fig) continue;
    heads.push(fig);
    fig.strokes.forEach((id) => used.add(id));
  }
  // A box holding another box is a frame, not a participant (the trap: not the role table's word for it).
  const holds = (a: Head, b: Head) => b.bounds !== a.bounds && sizeOfBounds(b.bounds) < sizeOfBounds(a.bounds) && offBox(centreOf(b.bounds), a.bounds) === 0 && outside(centreOf(b.bounds), a.outline) === 0;
  const frames = new Set(heads.filter((a) => heads.some((b) => a !== b && holds(a, b))));
  const candidates = heads.filter((h) => !frames.has(h));
  const least = opts.lifelinesOnly ? 1 : 2;
  if (candidates.length < least) return null;

  // 2. Lifeline pieces: long lines near plumb, one stroke or dashed.
  const inHeads = new Set(candidates.flatMap((h) => h.strokes));
  const pieces: Piece[] = [];
  for (const s of loose) {
    if (inHeads.has(s.id)) continue;
    const p = solidPiece(s);
    if (p) pieces.push(p);
  }
  // Dashed lines, read once — only where participants might be.
  const lines = dashedLines(state, scope);
  const inLine = new Map<string, DashedLine>();
  for (const l of lines) {
    for (const id of l.ids) inLine.set(id, l);
    const sc = mean(l.ids.map((id) => strokes.get(id)?.scale ?? 1));
    const p = dashedPiece(l, sc);
    if (p) pieces.push(p);
  }

  // 3. Each participant's lifeline: the piece under its foot, then the pieces under that.
  const closedHulls = candidates.map((h) => ({ h, hull: h.outline }));
  const takenPieces = new Set<Piece>();
  const participants: { head: Head; line: Lifeline; sure: number; why: string }[] = [];
  const lifelineOf = (head: Head): Lifeline | null => {
    let best: { p: Piece; score: number } | null = null;
    for (const p of pieces) {
      if (takenPieces.has(p)) continue;
      const dx = Math.abs(p.top.x - head.foot.x);
      const dy = p.top.y - head.foot.y;
      if (dx > head.across || dy > head.below || p.top.y < head.foot.y - 0.5 * head.height) continue;
      // It hangs from this head, not from another one standing between.
      const score = p.sure * (1 - 0.5 * (dx / head.across)) * (1 - 0.3 * Math.max(0, dy / head.below));
      if (!best || score > best.score) best = { p, score };
    }
    if (!best) return null;
    const chain = [best.p];
    let bottom = best.p.bottom;
    for (;;) {
      const length = bottom.y - chain[0].top.y;
      const gapMost = Math.max(LIFELINE_GAP * length, LIFELINE_GAP_PX * head.scale);
      const next = pieces
        .filter((q) => !takenPieces.has(q) && !chain.includes(q) && q.top.y >= bottom.y - 0.2 * gapMost && q.top.y - bottom.y <= gapMost && Math.abs(q.top.x - xAt(chain[0].top, bottom, q.top.y)) <= Math.max(head.across * 0.5, 8 * head.scale))
        .sort((a, b) => a.top.y - b.top.y)[0];
      if (!next) break;
      chain.push(next);
      bottom = next.bottom;
    }
    const top = chain[0].top;
    const length = bottom.y - top.y;
    // Long beside its box, and landing on no other box: a line from a box to a box is a flow, not a lifeline.
    if (length < LIFELINE_OF_BOX * head.height) return null;
    const reachBottom = magnetRadius(0, head.scale);
    if (closedHulls.some(({ h, hull }) => h !== head && offBox(bottom, h.bounds) <= reachBottom && outside(bottom, hull) <= reachBottom)) return null;
    // Nothing closed and small sits between its top and the box: a head drawn there makes it a relation.
    const gapBox: Bounds = { minX: Math.min(top.x, head.foot.x) - head.across * 0.5, maxX: Math.max(top.x, head.foot.x) + head.across * 0.5, minY: head.foot.y - 2, maxY: top.y + 2 };
    if (loose.some((s) => closedOf(s) && !head.strokes.includes(s.id) && s.size < 0.5 * sizeOfBounds(head.bounds) && s.bounds.minY >= gapBox.minY - s.size && s.bounds.maxY <= gapBox.maxY + s.size && s.bounds.minX <= gapBox.maxX && s.bounds.maxX >= gapBox.minX && offBox(top, s.bounds) <= magnetRadius(s.size, s.scale))) return null;
    const sure = mean(chain.map((p) => p.sure)) * ramp(length / Math.max(1e-9, head.height), LIFELINE_OF_BOX, LIFELINE_OF_BOX * 2) ** 0.5;
    const dashed = chain.some((p) => p.dashed);
    return {
      pieces: chain,
      top,
      bottom,
      length,
      dashed,
      sure,
      why: `${chain.length === 1 ? chain[0].why : `${count(chain.length)} pieces, one under the next (${chain.map((p) => p.why).join('; ')})`}, its top ${Math.round(Math.abs(top.x - head.foot.x) / head.scale)} px across from under the ${head.kind === 'actor' ? 'figure' : 'box'}, ${Math.round(length / head.height)} times as long as it is tall`,
    };
  };
  // Heads left to right, so two lifelines never trade pieces by the order the log drew them in.
  for (const head of [...candidates].sort((a, b) => a.foot.x - b.foot.x || (a.id < b.id ? -1 : 1))) {
    const line = lifelineOf(head);
    if (!line) continue;
    line.pieces.forEach((p) => takenPieces.add(p));
    participants.push({ head, line, sure: head.score * line.sure, why: `${head.why}, over its lifeline — ${line.why}` });
  }
  if (participants.length < least) return null;
  participants.sort((a, b) => a.line.top.x - b.line.top.x || (a.head.id < b.head.id ? -1 : 1));

  const lifelineStrokes = new Map<string, number>(); // stroke → participant index
  participants.forEach((p, i) => {
    for (const piece of p.line.pieces) for (const id of piece.strokes) lifelineStrokes.set(id, i);
    for (const id of p.head.strokes) lifelineStrokes.set(id, i);
  });
  const portOf = (p: (typeof participants)[number]): NotationPort => ({ name: 'lifeline', along: [{ ...p.line.top }, { ...p.line.bottom }], reasoning: `anywhere along the lifeline of ${p.head.id}` });
  if (opts.lifelinesOnly) {
    return {
      notation: 'sequence',
      name: SEQUENCE_TABLE.name,
      confidence: MAX * mean(participants.map((p) => p.sure)),
      summary: `${count(participants.length)} lifelines`,
      reason: participants.map((p) => p.why).join('; '),
      symbols: participants.map((p) => participantSymbol(p, portOf(p), nodes, [], [], undefined)),
      connectors: [],
      labels: [],
      roles: {},
      unplaced: [],
      counts: {},
    };
  }

  // 4. Messages. Where a point lands: the lifeline it stands on, within reach, between its top and bottom.
  const landing = (p: Point, reach: number, bound?: string): { i: number; d: number } | null => {
    if (bound !== undefined) {
      const i = lifelineStrokes.get(bound);
      if (i !== undefined) return { i, d: 0 };
    }
    let best: { i: number; d: number } | null = null;
    participants.forEach((q, i) => {
      const { top, bottom } = q.line;
      if (p.y < top.y - reach || p.y > bottom.y + reach) return;
      const d = Math.abs(p.x - xAt(top, bottom, Math.max(top.y, Math.min(bottom.y, p.y))));
      if (d <= reach && (!best || d < best.d)) best = { i, d };
    });
    return best;
  };
  const reachFor = (length: number, scale: number) => Math.max(magnetRadius(0, scale), LAND_SHARE * length);
  const taken = new Set<string>([...lifelineStrokes.keys()]);
  const messages: SequenceMessage[] = [];
  const endSaid = (e: ReadEnd, i: number | undefined, bound: boolean, d: number): NotationEnd => ({
    end: e.end,
    point: { ...e.point },
    ...(i !== undefined ? { symbol: participants[i].head.id } : {}),
    ...(e.head ? { head: { kind: e.head.kind, filled: e.head.filled, ids: [...e.head.ids], confidence: e.head.confidence } } : {}),
    ...(bound ? { bound: true } : {}),
    reason: i === undefined ? `${e.reason}, nothing within reach` : bound ? `bound by a magnet to the lifeline of ${participants[i].head.id}` : `${e.head ? `past its ${e.head.kind === 'arrow' ? 'arrowhead' : e.head.kind}, ` : ''}${Math.round(d)} from the lifeline of ${participants[i].head.id}`,
  });
  const message = (o: {
    id: string;
    ids: string[];
    line: 'solid' | 'dashed';
    a: ReadEnd;
    b: ReadEnd;
    ia: number;
    ib: number;
    da: number;
    db: number;
    bound: [boolean, boolean];
    reach: number;
    sure: number;
    shape: string;
    self: boolean;
    firstDrawn: 'start' | 'end';
  }) => {
    const headA = !!o.a.head, headB = !!o.b.head;
    const direction: NotationConnector['direction'] = headA && headB ? 'both' : headA || headB ? 'forward' : 'none';
    // `to` is where the head is; with none, or one at each end, the end it was drawn toward.
    let [from, to, fi, ti, fd, td, fb, tb] = [o.a, o.b, o.ia, o.ib, o.da, o.db, o.bound[0], o.bound[1]];
    if ((headA && !headB) || (headA === headB && o.firstDrawn === o.b.end)) [from, to, fi, ti, fd, td, fb, tb] = [o.b, o.a, o.ib, o.ia, o.db, o.da, o.bound[1], o.bound[0]];
    const kind: MessageKind = o.self ? 'self' : o.line === 'dashed' ? 'return' : 'call';
    const arrows = SEQUENCE_TABLE.connectors[kind].mermaid;
    const arrow = o.self && o.line === 'dashed' ? (direction === 'none' ? '-->' : '-->>') : direction === 'both' ? arrows.both : direction === 'forward' ? arrows.head : arrows.none;
    const quality = Math.min(1 - 0.4 * (fd / o.reach), 1 - 0.4 * (td / o.reach));
    const pointed = to.head ? 0.75 + 0.25 * (to.head.confidence / MAX) : 0.75;
    const confidence = MAX * quality * pointed * o.sure;
    const P = participants[fi].head.id, Q = participants[ti].head.id;
    const reason = o.self
      ? `a loop out from the lifeline of ${P} and back to it${to.head ? `, ${to.head.reason}` : ', with no head where it comes back'}`
      : direction === 'forward'
        ? `${o.shape} from the lifeline of ${P} to the lifeline of ${Q}, ${to.head!.kind === 'arrow' ? 'its arrowhead' : `its ${to.head!.filled ? 'filled' : 'hollow'} triangle`} at ${Q}`
        : direction === 'both'
          ? `${o.shape} with a head at both ends, between the lifelines of ${P} and ${Q}`
          : `${o.shape} with no head, from the lifeline of ${P} to the lifeline of ${Q} in the order it was drawn`;
    const headIds = [...new Set([...(from.head?.ids ?? []), ...(to.head?.ids ?? [])].filter((x) => !o.ids.includes(x)))];
    const said = ownWords(nodes, o.ids);
    const at = o.self ? Math.min(o.a.point.y, o.b.point.y) : (o.a.point.y + o.b.point.y) / 2;
    messages.push({
      id: o.id,
      ids: [...o.ids, ...headIds],
      kind,
      role: SEQUENCE_TABLE.connectors[kind].role as Role,
      direction,
      directed: direction !== 'none',
      from: P,
      to: Q,
      ends: { from: endSaid(from, fi, fb, fd), to: endSaid(to, ti, tb, td) },
      confidence,
      reason,
      labels: [],
      ...(said ? { text: said } : {}),
      line: o.line,
      arrow,
      at,
      order: 0,
    });
    for (const x of [...o.ids, ...headIds]) taken.add(x);
  };

  // What may be a message: a loose stroke, or a word's main stroke when the rest of the word is small beside it — a
  // loop and the head drawn right after it are one word to the letter rules; a word of writing is not that.
  const wordsNear: Mark[] = [...marks.values()].filter((m) => isWord(m.node));
  const letterOf = new Map<string, Stroke[]>();
  for (const w of wordsNear) {
    const ls = lettersOf(w.node).map((id) => strokes.get(id)).filter((x): x is Stroke => !!x);
    for (const l of ls) if (ls.length >= 2 && ls.every((o) => o === l || o.size <= 0.5 * l.size)) letterOf.set(l.id, ls);
  }
  const mayBe = [...loose, ...[...strokes.values()].filter((x) => letterOf.has(x.id))];
  /** A connector's ends: heads.ts on the board — or apart, when it or a word near it was gathered by the letter rules. */
  const endsOf = (x: Stroke): ConnectorHeads | null => {
    const a = x.ink[0], b = x.ink[x.ink.length - 1];
    const reach = magnetRadius(0, x.scale) * 2;
    const wordy = x.mark !== x.id || wordsNear.some((w) => offBox(a, w.bounds) <= reach || offBox(b, w.bounds) <= reach);
    return wordy ? headsApart(x, [...strokes.values()].filter((o) => !taken.has(o.id))) : headsOf(state, x.id);
  };

  // 4a. Solid messages: open strokes the rung reads as a line, an arrow or an arc, roughly level, each end on a lifeline.
  const nearAny = (p: Point, reach: number) => landing(p, reach) !== null;
  const solidDone = new Set<string>();
  for (const s of mayBe) {
    if (taken.has(s.id) || inLine.has(s.id) || used.has(s.id) || closedOf(s) || writes(s)) continue;
    const a0 = s.ink[0], b0 = s.ink[s.ink.length - 1];
    const length = dist(a0, b0);
    if (length / s.scale < LIFELINE_PX * 0.5) continue;
    const reach = reachFor(length, s.scale);
    // The cheap test first: both ends near a lifeline, allowing for a head that carries an end on past.
    if (!nearAny(a0, reach + 0.5 * length) || !nearAny(b0, reach + 0.5 * length)) continue;
    const level = 1 - ramp(offLevel(sub(b0, a0)), MESSAGE_LEVEL[0], MESSAGE_LEVEL[1]);
    if (level <= 0) continue;
    const h = endsOf(s);
    if (!h) continue;
    const onLifeline = (id: string) => lifelineStrokes.has(id);
    const [a, b] = [readEnd(h.start, onLifeline), readEnd(h.end, onLifeline)];
    const bindings = activeBindingsOf(s.node, nodes);
    const bs = bindings.find((x) => x.end === 'start'), be = bindings.find((x) => x.end === 'end');
    const la = landing(a.point, reach, bs?.nodeId), lb = landing(b.point, reach, be?.nodeId);
    if (!la || !lb || la.i === lb.i) continue;
    message({ id: s.id, ids: [s.id], line: 'solid', a, b, ia: la.i, ib: lb.i, da: la.d, db: lb.d, bound: [!!bs && lifelineStrokes.has(bs.nodeId), !!be && lifelineStrokes.has(be.nodeId)], reach, sure: level, shape: `${/^[aeiou]/.test(h.shape) ? 'an' : 'a'} ${h.shape}`, self: false, firstDrawn: 'start' });
    solidDone.add(s.id);
  }

  // 4b. Dashed messages: dashed lines roughly level, each end on a lifeline.
  for (const l of lines) {
    if (l.ids.some((id) => taken.has(id))) continue;
    if (offLevel(l.axis) >= MESSAGE_LEVEL[1]) continue;
    const sc = mean(l.ids.map((id) => strokes.get(id)?.scale ?? 1));
    const reach = reachFor(l.length, sc);
    if (!nearAny(l.from, reach + l.gap + l.dash * 2) || !nearAny(l.to, reach + l.gap + l.dash * 2)) continue;
    const onLifeline = (id: string) => lifelineStrokes.has(id);
    const h = dashedHeads(state, l, scope);
    const a = readEnd(h.start, onLifeline), b = readEnd(h.end, onLifeline);
    // With no head, an end is where its outer dash stops.
    if (!a.head) a.point = { ...l.from };
    if (!b.head) b.point = { ...l.to };
    const la = landing(a.point, reach), lb = landing(b.point, reach);
    if (!la || !lb || la.i === lb.i) continue;
    // The end the hand began at: nearer the dash drawn first.
    const first = [...l.ids].sort((p, q) => atOf(strokes.get(p)!.node) - atOf(strokes.get(q)!.node))[0];
    const firstDrawn = l.ids.indexOf(first) < l.ids.length / 2 ? 'start' : 'end';
    const level = 1 - ramp(offLevel(l.axis), MESSAGE_LEVEL[0], MESSAGE_LEVEL[1]);
    message({ id: l.id, ids: [...l.ids], line: 'dashed', a, b, ia: la.i, ib: lb.i, da: la.d, db: lb.d, bound: [false, false], reach, sure: level * (l.confidence / MAX), shape: `a dashed line of ${l.dashes} dashes`, self: false, firstDrawn });
  }

  // 4c. Self-messages: a loop both of whose ends land on one lifeline, bulging to one side.
  for (const s of mayBe) {
    if (taken.has(s.id) || inLine.has(s.id) || used.has(s.id) || solidDone.has(s.id) || closedOf(s)) continue;
    const a0 = s.ink[0], b0 = s.ink[s.ink.length - 1];
    const reach = reachFor(s.size, s.scale);
    // The cheap test first: both ends near one lifeline, allowing for a barb that carries an end back out.
    const ca = landing(a0, reach + 0.35 * s.size), cb = landing(b0, reach + 0.35 * s.size);
    if (!ca || !cb || ca.i !== cb.i) continue;
    const q = participants[ca.i].line;
    const lineX = (y: number) => xAt(q.top, q.bottom, y);
    const span = Math.abs(b0.y - a0.y);
    if (span / s.scale < LOOP_SPAN_PX || span > 0.5 * q.length) continue;
    const outR = Math.max(...s.ink.map((p) => p.x - lineX(p.y))), outL = Math.max(...s.ink.map((p) => lineX(p.y) - p.x));
    const side = outR >= outL ? 1 : -1;
    const far = Math.max(outR, outL), back = Math.min(outR, outL);
    if (far / s.scale < LOOP_PX || back > Math.max(reach, 0.15 * far)) continue;
    // Not as far as the next lifeline over: a loop comes back to its own.
    const nextOver = Math.min(...participants.filter((_, i) => i !== ca.i).map((o) => side * (o.line.top.x - q.top.x)).filter((d) => d > 0), Infinity);
    if (far >= 0.8 * nextOver) continue;
    const others = [...strokes.values()].filter((o) => !taken.has(o.id) && o.id !== s.id);
    const h = loopHeads(s, lineX, side, others);
    const bindings = activeBindingsOf(s.node, nodes);
    const bs = bindings.find((x) => x.end === 'start'), be = bindings.find((x) => x.end === 'end');
    const la = landing(h.start.point, reach, bs?.nodeId), lb = landing(h.end.point, reach, be?.nodeId);
    if (!la || !lb || la.i !== ca.i || lb.i !== ca.i) continue;
    const bulge = ramp(far / Math.max(1e-9, span), 0.3, 0.8);
    message({ id: s.id, ids: [s.id], line: 'solid', a: h.start, b: h.end, ia: la.i, ib: lb.i, da: la.d, db: lb.d, bound: [!!bs && lifelineStrokes.has(bs.nodeId), !!be && lifelineStrokes.has(be.nodeId)], reach, sure: 0.85 + 0.15 * bulge, shape: 'a loop', self: true, firstDrawn: 'start' });
  }
  if (!messages.some((m) => m.kind !== 'self')) return null;

  // 5. Down the page: the order Mermaid writes them in.
  messages.sort((p, q) => p.at - q.at || participantX(p.from) - participantX(q.from) || (p.id < q.id ? -1 : 1));
  messages.forEach((m, i) => (m.order = i + 1));
  function participantX(id: string) {
    return participants.find((p) => p.head.id === id)!.line.top.x;
  }

  // 6. Writing: a name in its box or under its figure, a label just above a message, else a note.
  const labels: NotationLabel[] = [];
  const names = new Map<number, Mark[]>();
  const usedMarks = new Set<string>();
  for (const id of taken) {
    const s = strokes.get(id);
    if (s) usedMarks.add(s.mark);
  }
  const writing = [...marks.values()].filter((m) => !usedMarks.has(m.id) && (isWord(m.node) ? true : writingLike(m.node, strokes.get(m.id)?.ink, m.scale)));
  const inkOfMark = (m: Mark) => (isWord(m.node) ? lettersOf(m.node).flatMap((id) => strokes.get(id)?.ink ?? []) : (strokes.get(m.id)?.ink ?? []));
  const byMessage = new Map<SequenceMessage, { m: Mark; gap: number }[]>();
  for (const m of writing) {
    const h = m.bounds.maxY - m.bounds.minY;
    const reach = Math.max(magnetRadius(sizeOfBounds(m.bounds), m.scale), LABEL_ABOVE * h);
    // In a box, or under a figure: its name.
    const home = participants.findIndex((p) => {
      if (p.head.kind === 'participant') {
        const ink = inkOfMark(m);
        if (offBox(m.centre, p.head.bounds) > 0) return false;
        const slack = magnetRadius(p.head.bounds.maxX - p.head.bounds.minX, m.scale) * 0.5;
        return ink.filter((q) => outside(q, p.head.outline) <= slack).length >= INK_INSIDE * Math.max(1, ink.length);
      }
      // Under the figure: its top close under the figure's feet, its middle under the head.
      const r = p.head.nameBelow!;
      return m.bounds.minY >= r.minY && m.bounds.minY <= r.maxY && m.centre.x >= r.minX && m.centre.x <= r.maxX;
    });
    if (home >= 0) {
      (names.get(home) ?? names.set(home, []).get(home)!).push(m);
      continue;
    }
    // Just above a message: the one whose line runs under it nearest.
    let best: { msg: SequenceMessage; gap: number } | null = null;
    for (const msg of messages) {
      const P = msg.ends.from.point, Q = msg.ends.to.point;
      let gap: number;
      if (msg.kind === 'self') {
        const loop = union(msg.ids.map((id) => strokes.get(id)?.bounds).filter((b): b is Bounds => !!b));
        const above = m.centre.x >= loop.minX - 0.2 * (loop.maxX - loop.minX) && m.centre.x <= loop.maxX + 2 * h ? loop.minY - m.bounds.maxY : Infinity;
        const beside = m.bounds.maxY >= loop.minY && m.bounds.minY <= loop.maxY ? m.bounds.minX - loop.maxX : Infinity;
        gap = Math.min(above >= -LABEL_DIP * h ? above : Infinity, beside >= -0.2 * (m.bounds.maxX - m.bounds.minX) ? beside : Infinity);
      } else {
        const lo = Math.min(P.x, Q.x), hi = Math.max(P.x, Q.x);
        const slack = 0.05 * (hi - lo);
        if (m.centre.x < lo - slack || m.centre.x > hi + slack) continue;
        const y = P.x === Q.x ? (P.y + Q.y) / 2 : P.y + ((Q.y - P.y) * (m.centre.x - P.x)) / (Q.x - P.x);
        gap = y - m.bounds.maxY;
        if (gap < -LABEL_DIP * h) continue;
      }
      if (gap > reach) continue;
      if (!best || gap < best.gap) best = { msg, gap };
    }
    if (best) {
      (byMessage.get(best.msg) ?? byMessage.set(best.msg, []).get(best.msg)!).push({ m, gap: best.gap });
      continue;
    }
    const text = wordsOfMark(m.node);
    labels.push({ id: m.id, where: 'alone', role: 'annotation', ...(text ? { text } : {}), bounds: { ...m.bounds }, confidence: MAX * 0.5, reason: 'writing beside nothing in the diagram — a note' });
  }
  const readingOrder = (ms: readonly Mark[]) =>
    [...ms].sort((p, q) => {
      const a = p.bounds, b = q.bounds;
      const sameRow = !(a.maxY < b.minY || b.maxY < a.minY);
      return sameRow ? a.minX - b.minX || (p.id < q.id ? -1 : 1) : a.minY - b.minY;
    });
  for (const [msg, ms] of byMessage) {
    for (const { m, gap } of ms) {
      const text = wordsOfMark(m.node);
      const reach = Math.max(magnetRadius(sizeOfBounds(m.bounds), m.scale), LABEL_ABOVE * (m.bounds.maxY - m.bounds.minY));
      labels.push({ id: m.id, of: msg.id, where: 'beside', role: 'label', ...(text ? { text } : {}), bounds: { ...m.bounds }, confidence: MAX * (1 - 0.5 * (Math.max(0, gap) / reach)), reason: `writing ${Math.round(Math.max(0, gap))} above ${msg.kind === 'self' ? 'the loop' : 'the message'} ${msg.id} — its label` });
    }
    msg.labels = readingOrder(ms.map((x) => x.m)).map((m) => m.id);
  }

  // 7. The participants, with their names.
  const symbols: SequenceParticipant[] = participants.map((p, i) => {
    const ms = readingOrder(names.get(i) ?? []);
    for (const m of ms) {
      const text = wordsOfMark(m.node);
      labels.push({ id: m.id, of: p.head.id, where: 'inside', role: 'label', ...(text ? { text } : {}), bounds: { ...m.bounds }, confidence: MAX * 0.9, reason: p.head.kind === 'actor' ? `writing under ${p.head.id}’s figure — its name` : `writing in ${p.head.id}’s box — its name` });
    }
    return participantSymbol(p, portOf(p), nodes, ms.map((m) => m.id), ms.map((m) => wordsOfMark(m.node)), ownWords(nodes, p.head.strokes));
  });

  // 8. Roles: what every mark in the scope plays — one of the six.
  const roles: Record<string, Role> = {};
  const weight: Record<string, number> = {};
  const give = (id: string, role: Role, w: number) => {
    if (roles[id] || !marks.has(id)) return;
    roles[id] = role;
    weight[id] = w;
  };
  const markOf = (id: string) => strokes.get(id)?.mark ?? id;
  for (const s of symbols) for (const id of s.ids) give(markOf(id), 'node', 1);
  for (const m of messages) for (const id of m.ids) give(markOf(id), 'edge', 1);
  for (const l of labels) give(l.id, l.role, l.where === 'alone' ? 0.5 : 1);
  for (const f of frames) for (const id of f.strokes) give(markOf(id), 'container', 0.5);
  const unplaced: string[] = [];
  for (const id of scope) {
    if (roles[id]) continue;
    give(id, 'unclassified', 0);
    unplaced.push(id);
  }

  // 9. Is it a sequence diagram, and how surely.
  const sure = (xs: number[]) => mean(xs) / MAX;
  const coverage = scope.reduce((a, id) => a + (weight[id] ?? 0), 0) / scope.length;
  const joinedIds = new Set(messages.flatMap((m) => [m.from, m.to]));
  const connected = symbols.filter((s) => joinedIds.has(s.id)).length / symbols.length;
  const participantSure = sure(symbols.map((s) => s.confidence));
  const messageSure = sure(messages.map((m) => m.confidence));
  const headed = messages.filter((m) => m.directed).length / messages.length;
  const confidence = MAX * Math.sqrt(coverage * connected) * Math.sqrt(participantSure * messageSure) * (0.6 + 0.4 * headed);

  const counts: Record<string, number> = {};
  for (const k of Object.keys(SEQUENCE_TABLE.symbols) as ParticipantKind[]) counts[k] = symbols.filter((s) => s.symbol === k).length;
  for (const k of KINDS) counts[k] = messages.filter((m) => m.kind === k).length;
  counts.label = labels.filter((l) => l.where === 'beside').length;
  const T = SEQUENCE_TABLE;
  const parts: string[] = [];
  for (const k of ['actor', 'participant'] as const) if (counts[k]) parts.push(`${count(counts[k])} ${counts[k] === 1 ? T.symbols[k].one : T.symbols[k].many}`);
  for (const k of KINDS) if (counts[k]) parts.push(`${count(counts[k])} ${counts[k] === 1 ? T.connectors[k].one : T.connectors[k].many}`);
  const summary = parts.join(', ');
  const reason = [
    'every participant over its lifeline',
    connected === 1 ? 'every one joined' : `${count(symbols.filter((s) => joinedIds.has(s.id)).length)} of ${count(symbols.length)} joined`,
    `${count(messages.length)} message${messages.length === 1 ? '' : 's'} down the page${headed === 1 ? ', every one pointing' : ''}`,
    counts.label ? `${count(counts.label)} label${counts.label === 1 ? '' : 's'}` : '',
    frames.size ? `${count(frames.size)} box${frames.size === 1 ? '' : 'es'} holding another — a frame, not a participant` : '',
    unplaced.length ? `${count(unplaced.length)} mark${unplaced.length === 1 ? '' : 's'} it places nowhere` : '',
  ].filter(Boolean).join(', ');

  const order = new Map(scope.map((id, i) => [id, i]));
  labels.sort((p, q) => (order.get(p.id) ?? 0) - (order.get(q.id) ?? 0));

  return {
    notation: 'sequence',
    name: T.name,
    confidence,
    summary,
    reason: `${summary} — ${reason}`,
    symbols,
    connectors: messages,
    labels,
    roles,
    unplaced,
    counts,
  };
}

/** A box as what a participant hangs from: its bottom middle the foot. */
function headOfBox(id: string, strokes: string[], marks: string[], box: Box, scale: number, lead: string): Head {
  const reach = magnetRadius(box.size, scale);
  return {
    kind: 'participant',
    id,
    strokes,
    marks,
    outline: box.hull,
    bounds: box.bounds,
    foot: { x: (box.bounds.minX + box.bounds.maxX) / 2, y: box.bounds.maxY },
    across: LIFELINE_MIDDLE * box.w,
    below: Math.max(LIFELINE_BELOW * box.h, reach),
    height: box.h,
    scale,
    score: box.score,
    why: `${lead}${box.why}`,
    box,
  };
}

/** A participant as a symbol of the reading. */
function participantSymbol(
  p: { head: Head; line: Lifeline; sure: number; why: string },
  port: NotationPort,
  nodes: ReadonlyMap<string, MMNode>,
  nameIds: string[],
  nameWords: (string | undefined)[],
  own: string | undefined
): SequenceParticipant {
  const lifeline = p.line.pieces.flatMap((x) => x.strokes);
  // A name runs on: its pieces' words joined, the placeholder once for a run of what nobody has read.
  const parts: string[] = own ? [own] : [];
  const unread: string[] = [];
  nameIds.forEach((id, i) => {
    const w = nameWords[i];
    if (w) parts.push(w);
    else {
      unread.push(id);
      if (parts[parts.length - 1] !== UNREAD_WRITING) parts.push(UNREAD_WRITING);
    }
  });
  const text = parts.length && !(parts.length === 1 && parts[0] === UNREAD_WRITING && !own) ? parts.join(' ') : undefined;
  void nodes;
  const kind = p.head.kind;
  const readings: SymbolReading[] = [{ symbol: kind, role: SEQUENCE_TABLE.symbols[kind].role as Role, confidence: MAX * p.sure, reason: p.why }];
  return {
    id: p.head.id,
    ids: [...p.head.strokes, ...lifeline],
    symbol: kind,
    role: 'node',
    confidence: MAX * p.sure,
    reason: p.why,
    readings,
    outline: p.head.outline.map((q) => ({ x: q.x, y: q.y })),
    bounds: { ...p.head.bounds },
    ports: [port],
    labels: [...nameIds],
    ...(own ? { text: own } : {}),
    figure: [...p.head.strokes],
    lifeline,
    dashed: p.line.dashed,
    top: { ...p.line.top },
    bottom: { ...p.line.bottom },
    name: { ...(text !== undefined ? { text } : {}), ids: [...nameIds], unread },
  };
}

// ===== The notation =====

export const SEQUENCE: Notation = {
  id: 'sequence',
  name: SEQUENCE_TABLE.name,
  describes: SEQUENCE_TABLE.describes,
  symbols: (Object.keys(SEQUENCE_TABLE.symbols) as ParticipantKind[]).map((k) => ({ name: k, role: SEQUENCE_TABLE.symbols[k].role as Role, describes: SEQUENCE_TABLE.symbols[k].describes, ports: SEQUENCE_TABLE.symbols[k].ports })),
  connectors: KINDS.map((k) => ({ name: k, role: SEQUENCE_TABLE.connectors[k].role as Role, describes: SEQUENCE_TABLE.connectors[k].describes })),
  read: (state, scopeIds) => readSequence(state, scopeIds),
  ports: { notation: 'sequence', portsOf: sequencePortsOf } satisfies NotationPorts,
};

// Mermaid in (V1-PLAN §3, §9 D3) — Mermaid text drawn on the board as ink.
//
// D2 says a flowchart the board reads as Mermaid text. This is the other way:
// a Mermaid text — pasted, dropped, or a `mermaid` artifact's own — drawn on
// the board as marks a hand could have made, so the engine reads them exactly
// as it reads a hand's: the shape rung reads each symbol, the flowchart
// notation (D1) reads the chart, and D2 says it back as the text it came
// from. The round trip is the test. Tier 1 — no model is asked — and nothing
// derived enters the log: the layout is computed, and the events are strokes,
// binds and labels. Six rules:
//
//   - **One reader per diagram keyword**, symmetric to D2's writers: the
//     flowchart's reads `flowchart` and `graph`, and D4–D6 add theirs with
//     `registerMermaidReader`. A text no reader knows is refused, whole.
//   - **What is not read is refused, never thrown**: each statement the
//     reader cannot take — a subgraph's frame, a style, a line it cannot
//     parse, a flow from a node to itself — with its line number and why, and
//     everything else read. What is read but drawn otherwise than written — a
//     shape the flowchart has no symbol for, a dotted link, RL — is said in
//     the notes.
//   - **Each symbol is a clean form the notation reads as that symbol.** A
//     process is a rectangle and a start or end a circle, through `strokeFor`
//     (the shape rung's vocabulary, the one a model draws with); a decision,
//     a data symbol and a terminator have no word there, so each is a polygon
//     densified to ink spacing — a square turned 45°, a box leaning 22°, a
//     stadium. Every size is the hand's — in screen pixels at the scale
//     given, well above its resolution — and chosen where the reading is
//     sure: the diamond square (a flat one reads as a triangle), the stadium
//     no longer than 2.6 times its height (a longer one reads as a box), the
//     core symbols within a factor of two of each other (D1 takes a symbol
//     under 0.4 of the chart's median for a connector's head), the circles
//     small beside them (D1 reads a start or end by that). Every stroke is
//     declared content — it never lassoes, commands or scratches — and each is
//     a confident shape or wider than a letter, so the letter rules
//     (session/words.ts) gather none of them into a word.
//   - **Each connector runs from port to port, is bound at both ends, and
//     reads as drawn.** Straight where a clean, clear way exists — an arrow
//     (`strokeFor`, its barb kept in proportion past 800 px on screen, where
//     a capped barb stops reading), a line, or for `<-->` an arrow with a
//     closed triangle at its tail (a stroke with a barb at each end reads as
//     neither) — else an arc bulging out from a pair of ports, its heads
//     closed triangles. Each end stands exactly on a site the mark offers
//     itself (magnets.ts) — a process's and a data symbol's edge middles, a
//     decision's vertices, a circle's and a stadium's cardinals, which are
//     where the flowchart's own ports are — and the `bind` names that site,
//     found again on replay with no notation in use; only where a mark
//     offers none is the flowchart's port named (`port:flowchart`), and each
//     end says which. heads.ts reads, at a connector's end, any mark small
//     beside it, touching the end, on its line — another connector, a head
//     drawn apart, the symbol itself — so ends sharing a port lie 45° apart,
//     and a way that brings any mark past those three gates is drawn first
//     on a scratch session with everything involved and taken only when every
//     end there reads as drawn. What cannot be made to read is said.
//   - **Words go on their own ink.** A node's text and a link's label are
//     each a `label` on that mark (session.label), by the importing hand,
//     which made every mark — so the rule that a word goes only on its own
//     ink holds, and the flowchart reads the words as the symbol's and the
//     flow's own. The words are Mermaid's, decoded (`unescapeMermaid`).
//   - **The text's order is its reading order** (layered.ts): nodes stand
//     where the text's order puts them, so a text D2 wrote comes back in its
//     own order, and a TD text is spaced to read as TD.
//
// One call writes many events. For them to be one act — one undo — the
// caller wraps it: `session.withTool(tool, () => drawMermaid(session, text,
// { at, scale, origin }))`, everything inside one outermost `withTool` being
// one act (V1-PLAN L2j).

import type { Bounds, Point } from '../types';
import type { Session } from '../session/session';
import { createSession } from '../session/session';
import { boundsOf, getRep } from '../session/nodes';
import { magnetRadius, magnetSites } from '../session/magnets';
import { strokeFor } from '../session/synthesize';
import { HAND_RESOLUTION_PX } from '../recognition';
import { FLOWCHART_TABLE, flowchartPortsOf } from './flowchart';
import { headsOf, HEAD_AXIS_SHARE, HEAD_MAX_SHARE } from '../diagram/heads';
import { hullOf } from './shape';
import { UNREAD_WRITING, unescapeMermaid } from './mermaid';
import { layoutLayered } from './layered';
import type { LayeredLayout } from './layered';

/** Which way a diagram runs, as the board draws it: TB is TD. */
export type MermaidFlow = 'TD' | 'LR' | 'RL' | 'BT';

/** A line of the text that was not read, and why. */
export interface MermaidRefusal {
  /** 1-based. */
  line: number;
  /** The statement as written, trimmed. */
  text: string;
  reason: string;
}

/** A node as the text gives it. */
export interface MermaidNodeRead {
  /** The id as written. */
  id: string;
  /** The line it first appears on. */
  line: number;
  /** The notation's symbol it is drawn as: 'process', 'decision', … */
  symbol: string;
  /** Its shape as written — the brackets, '[]', '{}', '([])' … — or '' when the text gives none. */
  shape: string;
  /** Its words, decoded: what Mermaid shows — the id itself when the text gives none. */
  text: string;
}

/** A link as the text gives it. */
export interface MermaidLinkRead {
  /** Its place among the text's links: Mermaid's own numbering (`linkStyle i`). */
  index: number;
  line: number;
  from: string;
  to: string;
  /** Where its heads are, as drawn: at `to`, at both ends, or none. */
  head: 'forward' | 'both' | 'none';
  /** The link as written: '-->', '-.->', '==>', '---', '<-->' … */
  written: string;
  /** Its words, decoded. */
  label?: string;
}

/** A Mermaid text as read, before anything is drawn. */
export interface MermaidRead {
  /** The keyword that opens it, as written: 'flowchart', 'graph' — '' when none was found. */
  keyword: string;
  /** The notation it is read into: 'flowchart' — null when no reader knows the keyword. */
  notation: string | null;
  /** Which way it runs. */
  direction: MermaidFlow;
  nodes: MermaidNodeRead[];
  links: MermaidLinkRead[];
  /** What is read, but drawn otherwise than written: a shape with no symbol of its own, a dotted link … */
  notes: string[];
  /** What is not read at all: each statement with its line and why. */
  refused: MermaidRefusal[];
}

export interface DrawMermaidOptions {
  /** When the first event is written; each after it one millisecond later. */
  at: number;
  /** World units per screen pixel (1/zoom), as `addStroke` takes it: sizes are the hand's at this zoom. 1 when unset. */
  scale?: number;
  /** Who draws it — every mark, bind and label is theirs. The board's own hand when unset. */
  participantId?: string;
  /** Where the drawing's top-left corner stands, in canvas units. Beside everything on the board when unset. */
  origin?: Point;
}

/** One end of a drawn link: the site it is bound at. */
export interface DrawnEnd {
  /** The symbol's mark it is bound to. */
  nodeId: string;
  /** The site, as the `bind` event carries it. */
  site: { kind: string; index: number };
  /** Whose site: the mark's own (magnets.ts), or the notation's port (ports.ts). */
  of: 'mark' | 'notation';
  /** The port it stands for, in the notation's words: 'top', 'right', 'bottom', 'left'. */
  port: string;
  point: Point;
}

/** A link as drawn. */
export interface DrawnLink {
  /** Its place among the text's links (`MermaidLinkRead.index`). */
  index: number;
  /** Mermaid ids. */
  from: string;
  to: string;
  /** The connector's own stroke. */
  id: string;
  /** It and any head drawn apart from it. */
  ids: string[];
  /** How it is drawn: with a head at its target, with none, or with one at each end. */
  drawn: '-->' | '---' | '<-->';
  /** Straight — an arrow or a line — or an arc, where no straight way between the ports was clear; an arc's heads are closed triangles. */
  route: 'straight' | 'arc';
  label?: string;
  start: DrawnEnd;
  end: DrawnEnd;
}

/** What `drawMermaid` drew, and what it did not. */
export interface DrawnMermaid {
  /** The notation it was drawn as — null when nothing was. */
  notation: string | null;
  direction?: MermaidFlow;
  /** Each Mermaid id → the mark drawn for it. */
  ids: Record<string, string>;
  /** The links drawn, in the text's order. */
  links: DrawnLink[];
  /** What is drawn otherwise than written, and what will not read back as written — a sentence each. */
  notes: string[];
  /** What is not drawn at all, with its line and why. */
  refused: MermaidRefusal[];
  /** Where the drawing stands, in canvas units — null when nothing was drawn. */
  bounds: Bounds | null;
  /** The time of the last event written; `at` less one when none was. */
  lastAt: number;
}

/** A reader: the text parsed into a notation, and the parse drawn. */
export interface MermaidReader {
  /** The notation it reads into: 'flowchart'. */
  notation: string;
  /** Read the text — never throws; what it cannot read is refused. */
  read(text: string): MermaidRead;
  /** Draw what was read, as the hand `opts.participantId` would. */
  draw(session: Session, read: MermaidRead, opts: DrawMermaidOptions): DrawnMermaid;
}

const readers = new Map<string, MermaidReader>();

/**
 * Let a Mermaid diagram be read, by the keyword that opens it: 'flowchart',
 * 'graph'. A second reader for the same keyword replaces the first. Returns
 * the way to take it back.
 */
export function registerMermaidReader(keyword: string, reader: MermaidReader): () => void {
  readers.set(keyword, reader);
  return () => {
    if (readers.get(keyword) === reader) readers.delete(keyword);
  };
}

/** The keywords a reader knows, in the order they registered. */
export function mermaidReaders(): string[] {
  return [...readers.keys()];
}

// ===== The text's lines: comments, directives, front matter, the header =====

interface Line {
  /** 1-based. */
  n: number;
  text: string;
}

/** The lines that say something, and what was refused before the header, the header's line and keyword. */
function openText(text: string): { lines: Line[]; refused: MermaidRefusal[]; header: Line | null; keyword: string; rest: string } {
  const all = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
  const lines: Line[] = [];
  const refused: MermaidRefusal[] = [];
  let header: Line | null = null, keyword = '', rest = '';
  for (let i = 0; i < all.length; i++) {
    const t = all[i].trim();
    if (!t) continue;
    // Front matter: a block between two `---` lines, before the diagram.
    if (!header && t === '---') {
      const close = all.findIndex((l, k) => k > i && l.trim() === '---');
      const last = close >= 0 ? close : all.length - 1;
      refused.push({ line: i + 1, text: '---', reason: `front matter (lines ${i + 1}–${last + 1}) configures mermaid.js — nothing on the board takes it` });
      i = last;
      continue;
    }
    if (t.startsWith('%%{')) {
      refused.push({ line: i + 1, text: t, reason: 'a directive configures mermaid.js’s own rendering — nothing on the board takes it' });
      continue;
    }
    if (t.startsWith('%%')) continue;
    if (!header) {
      header = { n: i + 1, text: t };
      const m = /^([A-Za-z][\w-]*)(.*)$/.exec(t);
      keyword = m ? m[1] : '';
      rest = m ? m[2] : t;
      continue;
    }
    lines.push({ n: i + 1, text: t });
  }
  return { lines, refused, header, keyword, rest };
}

/** A Mermaid text as read — nothing drawn. Never throws. */
export function readMermaid(text: string): MermaidRead {
  const open = openText(text);
  const reader = readers.get(open.keyword) ?? readers.get(open.keyword.toLowerCase());
  if (reader) return reader.read(text);
  const refused = [...open.refused];
  if (!open.header) refused.push({ line: 1, text: '', reason: 'nothing to read: a Mermaid text opens with the kind of diagram it is — flowchart, graph, …' });
  else
    refused.push({
      line: open.header.n,
      text: open.header.text,
      reason: open.keyword
        ? `no reader for “${open.keyword}” yet — the board reads ${list(mermaidReaders().map((k) => `“${k}”`))}`
        : 'a Mermaid text opens with the kind of diagram it is — flowchart, graph, …',
    });
  return { keyword: open.keyword, notation: null, direction: 'TD', nodes: [], links: [], notes: [], refused };
}

/**
 * Draw a Mermaid text on the board, as the hand `participantId` would: its
 * symbols as clean forms the notation reads, its links bound at their ports,
 * its words as labels on their own ink. Returns what was drawn and what was
 * not. Never throws on the text; a text no reader knows draws nothing.
 */
export function drawMermaid(session: Session, text: string, opts: DrawMermaidOptions): DrawnMermaid {
  const open = openText(text);
  const reader = readers.get(open.keyword) ?? readers.get(open.keyword.toLowerCase());
  const read = reader ? reader.read(text) : readMermaid(text);
  if (!reader) return { notation: null, ids: {}, links: [], notes: [], refused: read.refused, bounds: null, lastAt: opts.at - 1 };
  return reader.draw(session, read, opts);
}

// ===== Words =====

const COUNT = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const count = (n: number) => COUNT[n] ?? String(n);
const list = (xs: readonly string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const some = (xs: readonly string[], max = 4) => (xs.length > max ? `${xs.slice(0, max).join(', ')} and ${count(xs.length - max)} more` : list(xs));

// ===== The flowchart: reading =====

type FlowSymbol = keyof typeof FLOWCHART_TABLE.symbols;

/** A shape Mermaid writes: its brackets, the symbol it is drawn as, and — when it has no symbol of its own — what it is. */
interface ShapeDef {
  open: string;
  close: string;
  symbol: FlowSymbol;
  /** What Mermaid draws, for a shape the flowchart has no symbol of its own for. */
  otherwise?: string;
}

/**
 * Every node shape Mermaid's flowchart writes. The six the flowchart has come
 * from its table (FLOWCHART_TABLE, the brackets D2 writes); the rest are drawn
 * as the nearest symbol it has, and said.
 */
const SHAPES: ShapeDef[] = [
  ...(Object.entries(FLOWCHART_TABLE.symbols) as [FlowSymbol, (typeof FLOWCHART_TABLE.symbols)[FlowSymbol]][]).map(([symbol, d]) => ({ open: d.mermaid.open, close: d.mermaid.close, symbol })),
  { open: '(', close: ')', symbol: 'process', otherwise: 'a box with round edges' },
  { open: '[[', close: ']]', symbol: 'process', otherwise: 'a subroutine' },
  { open: '[(', close: ')]', symbol: 'process', otherwise: 'a cylinder' },
  { open: '{{', close: '}}', symbol: 'process', otherwise: 'a hexagon' },
  { open: '>', close: ']', symbol: 'process', otherwise: 'an asymmetric shape' },
  { open: '[\\', close: '\\]', symbol: 'data', otherwise: 'a parallelogram leaning left' },
  { open: '[/', close: '\\]', symbol: 'process', otherwise: 'a trapezoid' },
  { open: '[\\', close: '/]', symbol: 'process', otherwise: 'a trapezoid upside down' },
];
/** The opening brackets, longest first, so `(((` is never read as `((` and a `(`. */
const OPENS = [...new Set(SHAPES.map((s) => s.open))].sort((a, b) => b.length - a.length);

/** An id: letters, digits and underscores, a single dash inside one. */
const ID = /[\p{L}\p{N}_](?:[\p{L}\p{N}_]|-(?=[\p{L}\p{N}_]))*/uy;

/** Statements the flowchart reader does not draw, by their first word, and why. */
const NOT_DRAWN: [RegExp, string][] = [
  [/^subgraph\b/, 'a subgraph’s frame is not drawn yet — the nodes and links inside it are'],
  [/^end\b/, 'the end of a subgraph, whose frame is not drawn yet'],
  [/^direction\b/, 'a subgraph’s own direction is not read yet'],
  [/^(style|classDef|class|linkStyle)\b/, 'styling: the board draws in its hand’s own colour, and a Mermaid style is not read'],
  [/^(click|call|href)\b/, 'an interaction the board does not run'],
  [/^(accTitle|accDescr)\b/, 'an accessible title or description, not read yet'],
];

/** Where a statement is being read. */
class Cursor {
  constructor(public s: string, public i = 0) {}
  get done() {
    return this.i >= this.s.length;
  }
  ws() {
    while (this.i < this.s.length && /\s/.test(this.s[this.i])) this.i++;
  }
  peek(t: string) {
    return this.s.startsWith(t, this.i);
  }
  take(t: string) {
    if (!this.peek(t)) return false;
    this.i += t.length;
    return true;
  }
  match(re: RegExp): RegExpExecArray | null {
    re.lastIndex = this.i;
    const m = re.exec(this.s);
    if (m) this.i += m[0].length;
    return m;
  }
}

class Refuse extends Error {}

/** A quoted string at the cursor: its inner text, the quotes gone — a markdown string's backticks too. */
function quoted(c: Cursor, notes: Set<string>): string {
  const start = c.i;
  if (!c.take('"')) throw new Refuse('expected a quoted label');
  const end = c.s.indexOf('"', c.i);
  if (end < 0) {
    c.i = start;
    throw new Refuse('a label’s quotes are never closed');
  }
  let inner = c.s.slice(c.i, end);
  c.i = end + 1;
  if (inner.length >= 2 && inner.startsWith('`') && inner.endsWith('`')) {
    inner = inner.slice(1, -1);
    notes.add('a markdown string’s words are drawn, and its formatting is not');
  }
  return unescapeMermaid(`"${inner}"`);
}

/** Words as Mermaid shows them: entities and line breaks decoded, runs of space as one, trimmed at each line. */
function shown(raw: string): string {
  return unescapeMermaid(`"${raw}"`)
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .trim();
}

interface NodeRef {
  id: string;
  shape?: ShapeDef;
  text?: string;
}

/** A node at the cursor: its id, and the shape and words when the text gives them. */
function readNode(c: Cursor, notes: Set<string>): NodeRef {
  const m = c.match(ID);
  if (!m) throw new Refuse(c.done ? 'a link that leads nowhere' : `expected a node where “${c.s.slice(c.i, c.i + 12)}” stands`);
  const id = m[0];
  if (c.peek('@{')) throw new Refuse('the @{ shape: … } form (Mermaid 11) is not read yet');
  const open = OPENS.find((o) => c.peek(o));
  let ref: NodeRef = { id };
  if (open) {
    c.take(open);
    const shapes = SHAPES.filter((s) => s.open === open);
    let text: string;
    let shape: ShapeDef | undefined;
    const lead = c.i;
    c.ws();
    if (c.peek('"')) {
      text = quoted(c, notes);
      c.ws();
      shape = shapes.find((s) => c.peek(s.close));
      if (!shape) throw new Refuse(`the quoted label is not followed by “${list(shapes.map((s) => s.close))}”`);
      c.take(shape.close);
    } else {
      c.i = lead;
      let best: { at: number; shape: ShapeDef } | null = null;
      for (const s of shapes) {
        const at = c.s.indexOf(s.close, c.i);
        if (at >= 0 && (!best || at < best.at)) best = { at, shape: s };
      }
      if (!best) throw new Refuse(`“${open}” is never closed`);
      text = shown(c.s.slice(c.i, best.at));
      shape = best.shape;
      c.i = best.at + shape.close.length;
    }
    ref = { id, shape, text };
  }
  const cls = c.match(/:::[\w-]+/y);
  if (cls) notes.add('a class (:::…) is styling, which the board does not draw');
  return ref;
}

/** Nodes joined by `&`. */
function readGroup(c: Cursor, notes: Set<string>): NodeRef[] {
  const out = [readNode(c, notes)];
  for (;;) {
    const back = c.i;
    c.ws();
    if (!c.take('&')) {
      c.i = back;
      return out;
    }
    c.ws();
    out.push(readNode(c, notes));
  }
}

interface LinkRef {
  written: string;
  /** From the text's left node to its right one: which ends carry a head. */
  start: '<' | 'o' | 'x' | '';
  end: '>' | 'o' | 'x' | '';
  style: 'plain' | 'dotted' | 'thick';
  label?: string;
  invisible?: boolean;
}

/** The label between pipes after a link: `|yes|`, `|"yes"|`. */
function pipeLabel(c: Cursor, notes: Set<string>): string | undefined {
  const back = c.i;
  c.ws();
  if (!c.take('|')) {
    c.i = back;
    return undefined;
  }
  c.ws();
  let text: string;
  if (c.peek('"')) {
    text = quoted(c, notes);
    c.ws();
  } else {
    const end = c.s.indexOf('|', c.i);
    if (end < 0) throw new Refuse('a link’s label is never closed with “|”');
    text = shown(c.s.slice(c.i, end));
    c.i = end;
  }
  if (!c.take('|')) throw new Refuse('a link’s label is not closed with “|”');
  return text;
}

/** How a link token is drawn: the style of its line. */
const styleOf = (body: string): LinkRef['style'] => (body.includes('.') ? 'dotted' : body.includes('=') ? 'thick' : 'plain');

/** A link at the cursor: `-->`, `---`, `-.->`, `==>`, `<-->`, `--o`, `~~~`, with a label either way. */
function readLink(c: Cursor, notes: Set<string>): LinkRef {
  const at = c.i;
  const invisible = c.match(/~{3,}/y);
  if (invisible) return { written: invisible[0], start: '', end: '', style: 'plain', invisible: true };

  // A label inside the link: `-- yes -->`, `-. maybe .->`, `== sure ==>`.
  const opened = c.match(/(<)?(--|==|-\.)(?=\s|")/y);
  if (opened) {
    const kind = opened[2];
    const closer = kind === '--' ? /\s*(-{2,}(>|o|x)|-{3,})/y : kind === '==' ? /\s*(={2,}(>|o|x)|={3,})/y : /\s*(\.+-(>|o|x)?)/y;
    c.ws();
    let text: string;
    if (c.peek('"')) {
      text = quoted(c, notes);
      c.ws();
      const m = c.match(closer);
      if (!m) throw new Refuse(`a label inside a link is not followed by its end (“${kind === '--' ? '-->' : kind === '==' ? '==>' : '.->'}”)`);
      return finishTextLink(opened[0], opened[1] ?? '', m[1], text);
    }
    // Unquoted: the words run to the first place the link's end stands.
    for (let k = c.i; k < c.s.length; k++) {
      closer.lastIndex = k;
      const m = closer.exec(c.s);
      if (m && m.index === k && k > c.i) {
        text = shown(c.s.slice(c.i, k));
        if (!text) break;
        c.i = k + m[0].length;
        return finishTextLink(opened[0], opened[1] ?? '', m[1], text);
      }
    }
    c.i = at;
    throw new Refuse(`a link that opens “${opened[0]}” and a space holds a label, and this one never reaches its end (“${kind === '--' ? '-->' : kind === '==' ? '==>' : '.->'}”)`);
  }

  const m = c.match(/(<|o|x)?(-{2,}|={2,}|-\.+-)(>|o|x)?/y);
  if (!m) throw new Refuse(`expected a link where “${c.s.slice(c.i, c.i + 12)}” stands`);
  const start = (m[1] ?? '') as LinkRef['start'], end = (m[3] ?? '') as LinkRef['end'], body = m[2];
  // `--` alone opens a label; with no head it must be three long.
  if (!end && !/^(-{3,}|={3,}|-\.+-)$/.test(body)) throw new Refuse(`“${m[0]}” is not a link`);
  const label = pipeLabel(c, notes);
  return { written: m[0], start, end, style: styleOf(body), ...(label !== undefined ? { label } : {}) };
}

/** A link with its label inside it (`-- yes -->`), from what opened it and what closed it. */
function finishTextLink(openedText: string, start: string, closeText: string, text: string): LinkRef {
  const endMark = closeText[closeText.length - 1];
  const end = (endMark === '>' || endMark === 'o' || endMark === 'x' ? endMark : '') as LinkRef['end'];
  const body = openedText.replace(/^</, '') + closeText;
  return { written: `${openedText.trim()} … ${closeText.trim()}`, start: start as LinkRef['start'], end, style: styleOf(body), label: text };
}

/** One statement: its node groups and the links between them. */
function readStatement(c: Cursor, notes: Set<string>): { groups: NodeRef[][]; links: LinkRef[] } {
  const groups = [readGroup(c, notes)];
  const links: LinkRef[] = [];
  for (;;) {
    const back = c.i;
    c.ws();
    if (c.done || c.peek(';')) {
      c.i = back;
      return { groups, links };
    }
    links.push(readLink(c, notes));
    c.ws();
    groups.push(readGroup(c, notes));
  }
}

const DIRECTION: Record<string, MermaidFlow> = { TD: 'TD', TB: 'TD', LR: 'LR', RL: 'RL', BT: 'BT', v: 'TD', '^': 'BT', '>': 'LR', '<': 'RL' };

/** Read a flowchart text — `flowchart` or `graph` — into its nodes and links. Never throws. */
export function readFlowchartText(text: string): MermaidRead {
  const open = openText(text);
  const notes = new Set<string>();
  const refused = [...open.refused];
  const nodes: MermaidNodeRead[] = [];
  const links: MermaidLinkRead[] = [];
  const byId = new Map<string, MermaidNodeRead>();
  const otherwise = new Map<string, string[]>();
  const styled = { dotted: [] as string[], thick: [] as string[], ends: [] as string[] };
  let direction: MermaidFlow = 'TD';
  if (!open.header) {
    refused.push({ line: 1, text: '', reason: 'nothing to read: a flowchart text opens with “flowchart” or “graph”' });
    return { keyword: '', notation: FLOWCHART_TABLE.notation, direction, nodes, links, notes: [], refused };
  }

  const node = (ref: NodeRef, line: number): MermaidNodeRead => {
    let n = byId.get(ref.id);
    if (!n) {
      n = { id: ref.id, line, symbol: 'process', shape: '', text: ref.id };
      byId.set(ref.id, n);
      nodes.push(n);
    }
    if (ref.shape) {
      // The last shape and words written for a node are the ones Mermaid shows.
      n.symbol = ref.shape.symbol;
      n.shape = ref.shape.open + ref.shape.close;
      n.text = ref.text ?? '';
      if (ref.shape.otherwise) {
        const said = otherwise.get(ref.shape.otherwise) ?? [];
        if (!said.includes(ref.id)) said.push(ref.id);
        otherwise.set(ref.shape.otherwise, said);
      }
    }
    return n;
  };

  /** Read one line's statements, separated by `;`. */
  const readLine = (line: Line, from: string) => {
    let rest = from;
    while (rest.trim()) {
      const t = rest.trim();
      rest = '';
      const keyword = NOT_DRAWN.find(([re]) => re.test(t));
      if (keyword) {
        refused.push({ line: line.n, text: t, reason: keyword[1] });
        return;
      }
      const c = new Cursor(t);
      try {
        const st = readStatement(c, notes);
        c.ws();
        if (c.take(';')) rest = c.s.slice(c.i);
        else if (!c.done) throw new Refuse(`“${c.s.slice(c.i, c.i + 16)}” follows the statement`);
        // Nodes are placed as they first appear, left to right.
        const read = st.groups.map((g) => g.map((ref) => node(ref, line.n)));
        st.links.forEach((l, k) => {
          for (const a of read[k]) {
            for (const b of read[k + 1]) {
              const shownAs = `${a.id} ${l.written} ${b.id}`;
              if (l.invisible) {
                refused.push({ line: line.n, text: shownAs, reason: 'an invisible link (~~~) only spaces mermaid.js’s own layout — nothing is drawn for it' });
                continue;
              }
              if (a.id === b.id) {
                refused.push({ line: line.n, text: shownAs, reason: `a flow from ${a.id} to itself — a connector joins two symbols, so it is not drawn` });
                continue;
              }
              let from = a.id, to = b.id;
              let head: MermaidLinkRead['head'];
              const inAtEnd = l.end === '>', inAtStart = l.start === '<';
              if (inAtEnd && inAtStart) head = 'both';
              else if (inAtEnd) head = 'forward';
              else if (inAtStart) {
                head = 'forward';
                [from, to] = [b.id, a.id];
              } else head = 'none';
              if (l.style === 'dotted') styled.dotted.push(shownAs);
              if (l.style === 'thick') styled.thick.push(shownAs);
              if (l.end === 'o' || l.end === 'x' || l.start === 'o' || l.start === 'x') styled.ends.push(shownAs);
              links.push({ index: links.length, line: line.n, from, to, head, written: l.written, ...(l.label !== undefined ? { label: l.label } : {}) });
            }
          }
        });
      } catch (e) {
        if (!(e instanceof Refuse)) throw e;
        refused.push({ line: line.n, text: t, reason: e.message });
      }
    }
  };

  // The header: the keyword, a direction, and perhaps statements after a `;`.
  const h = /^\s*(TD|TB|LR|RL|BT|v|\^|>|<)(?=\s|;|$)\s*;?/.exec(open.rest);
  if (h) direction = DIRECTION[h[1]];
  else if (open.rest.trim() && !open.rest.trim().startsWith(';')) notes.add(`the header gives no direction Mermaid knows (“${open.rest.trim().split(/\s|;/)[0]}”), so it is drawn down the page (TD)`);
  const afterHeader = h ? open.rest.slice(h[0].length) : open.rest.replace(/^\s*[^\s;]*\s*;?/, '');
  if (afterHeader.trim()) readLine(open.header, afterHeader);
  for (const line of open.lines) readLine(line, line.text);

  const said = [...notes];
  if (open.keyword.toLowerCase() === 'flowchart-elk') said.push('the elk layout is mermaid.js’s own; the board lays the chart out itself');
  if (direction === 'RL' || direction === 'BT')
    said.push(
      `drawn ${direction === 'RL' ? 'right to left' : 'bottom to top'}, as the header asks — read back, a drawing says ${direction === 'RL' ? 'LR' : 'TD'} by the way its flows run, and lists its nodes as they stand ${direction === 'RL' ? 'left to right' : 'top to bottom'}`
    );
  for (const [what, ids] of otherwise) {
    const sym = SHAPES.find((s) => s.otherwise === what)!.symbol;
    said.push(`${what} has no symbol of its own in a flowchart, so ${ids.length === 1 ? 'it is' : 'they are'} drawn as ${sym === 'data' ? 'a data symbol' : 'a process'}: ${some(ids)}`);
  }
  if (styled.dotted.length) said.push(`the board has no dotted line: ${styled.dotted.length === 1 ? 'a dotted link is' : 'dotted links are'} drawn plain — ${some(styled.dotted)}`);
  if (styled.thick.length) said.push(`the board has no thick line: ${styled.thick.length === 1 ? 'a thick link is' : 'thick links are'} drawn plain — ${some(styled.thick)}`);
  if (styled.ends.length) said.push(`a circle or a cross at a link’s end (o, x) is no head a flowchart reads, so ${styled.ends.length === 1 ? 'the link is' : 'the links are'} drawn with no head there — ${some(styled.ends)}`);
  return { keyword: open.keyword, notation: FLOWCHART_TABLE.notation, direction, nodes, links, notes: said, refused: refused.sort((a, b) => a.line - b.line) };
}

// ===== The flowchart: drawing =====

/** The text size everything is sized and spaced by, in the hand's space: screen pixels at the scale drawn. A little over the 13 px a label is drawn at. */
export const MERMAID_TEXT_PX = 14;
/** A character's width, in text sizes — a mono face's is 0.6. */
const CHAR = 0.6;
/** A line of words, in text sizes. */
const LINE = 1.4;
/** The core symbols' size — their longer side — lies between these, in text sizes: within a factor of two of each other, so none is under 0.4 of the chart's median and read as a head (flowchart.ts, HEAD_SHARE). */
const CORE_MIN = 8;
const CORE_MAX = 16;
/** A box's height, in text sizes: one line and room around it. */
const BOX_H = 3.4;
/** A data symbol leans this far off plumb: a flowchart reads 16° and more as a lean (LEAN), and a hand's box leans under 5°. */
const DATA_LEAN_DEG = 22;
/** A stadium no longer than this over its height reads as round-ended (its best four corners hold under 0.78 of it); no shorter than this reads as elongated. */
const STADIUM_MAX = 2.6;
const STADIUM_MIN = 1.8;
/** A start or end circle, in text sizes: small beside the core symbols (under half of the smallest), well above the hand's resolution. */
const CIRCLE = 2.6;
/** The gap between ranks, and between neighbours in a rank, in text sizes. */
const RANK_GAP = 4;
const NODE_GAP = 4;
/** Ink is laid every this many screen pixels along a polygon's outline. */
const INK_STEP = 3;
/** An arrow longer than this on screen is drawn with its barb in proportion (strokeFor caps a barb at 40 px, and past about 1,200 px an arrow so drawn reads as a line). */
const ARROW_PROPORTION_PX = 800;
/** A head drawn apart — a closed triangle — is this long on screen: a tenth of its connector's chord, within these. */
const HEAD_MIN_PX = 12;
const HEAD_MAX_PX = 24;
/** The caps: past these the text is drawn in part, and says so. */
export const MERMAID_MAX_NODES = 60;
export const MERMAID_MAX_LINKS = 120;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** A closed outline walked as ink: every `step` along it, back to its start. */
function inkAround(corners: readonly Point[], step: number): Point[] {
  const ring = [...corners, corners[0]];
  const out: Point[] = [{ x: ring[0].x, y: ring[0].y }];
  for (let i = 1; i < ring.length; i++) {
    const a = ring[i - 1], b = ring[i];
    const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 1; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  return out;
}

type Port = 'top' | 'right' | 'bottom' | 'left';

/** A symbol as it will be drawn, in the hand's space (screen pixels) about its own centre. */
interface Figure {
  symbol: FlowSymbol;
  /** Its box: the layout's size. */
  w: number;
  h: number;
  /** Its ink, about (0, 0). */
  ink: () => Point[];
  /** Where each port stands, about (0, 0). */
  ports: Record<Port, Point>;
}

/** The words' extent, in text sizes: the longest line, and the lines. */
function wordsOf(text: string): { chars: number; lines: number } {
  const lines = text ? text.split('\n') : [];
  return { chars: Math.max(0, ...lines.map((l) => [...l].length)), lines: Math.max(1, lines.length) };
}

/** A symbol's size and ink, from its words — in screen pixels. */
function figureOf(symbol: FlowSymbol, text: string): Figure {
  const U = MERMAID_TEXT_PX;
  const { chars, lines } = wordsOf(text);
  const tw = chars * CHAR * U, th = lines * LINE * U;
  switch (symbol) {
    case 'decision': {
      // A square turned 45°: flatter, the shape rung reads it as a triangle or a box unsure.
      const s = clamp(tw + th + 2 * U, CORE_MIN * U, CORE_MAX * U);
      const v = { top: { x: 0, y: -s / 2 }, right: { x: s / 2, y: 0 }, bottom: { x: 0, y: s / 2 }, left: { x: -s / 2, y: 0 } };
      return { symbol, w: s, h: s, ink: () => inkAround([v.top, v.right, v.bottom, v.left], INK_STEP), ports: v };
    }
    case 'data': {
      const body = clamp(tw + 3 * U, CORE_MIN * U, CORE_MAX * U);
      const h = clamp(th + 2 * U, BOX_H * U, 7 * U);
      const lean = h * Math.tan((DATA_LEAN_DEG * Math.PI) / 180);
      const tl = { x: -body / 2 + lean / 2, y: -h / 2 }, tr = { x: body / 2 + lean / 2, y: -h / 2 };
      const br = { x: body / 2 - lean / 2, y: h / 2 }, bl = { x: -body / 2 - lean / 2, y: h / 2 };
      return { symbol, w: body + lean, h, ink: () => inkAround([tl, tr, br, bl], INK_STEP), ports: { top: mid(tl, tr), right: mid(tr, br), bottom: mid(br, bl), left: mid(bl, tl) } };
    }
    case 'terminator': {
      const w = clamp(tw + BOX_H * U, CORE_MIN * U, CORE_MAX * U);
      const h = clamp(Math.max(th + 2 * U, w / STADIUM_MAX), BOX_H * U, w / STADIUM_MIN);
      const r = h / 2, half = w / 2 - r;
      const ink = () => {
        const pts: Point[] = [];
        const n = 16;
        for (let i = 0; i <= n; i++) {
          const a = -Math.PI / 2 + (i / n) * Math.PI;
          pts.push({ x: half + r * Math.cos(a), y: r * Math.sin(a) });
        }
        for (let i = 0; i <= n; i++) {
          const a = Math.PI / 2 + (i / n) * Math.PI;
          pts.push({ x: -half + r * Math.cos(a), y: r * Math.sin(a) });
        }
        return inkAround(pts, INK_STEP);
      };
      return { symbol, w, h, ink, ports: { top: { x: 0, y: -h / 2 }, right: { x: w / 2, y: 0 }, bottom: { x: 0, y: h / 2 }, left: { x: -w / 2, y: 0 } } };
    }
    case 'start':
    case 'end': {
      const d = CIRCLE * U;
      return {
        symbol,
        w: d,
        h: d,
        ink: () => strokeFor({ shape: 'circle', x: -d / 2, y: -d / 2, w: d, h: d })!,
        ports: { top: { x: 0, y: -d / 2 }, right: { x: d / 2, y: 0 }, bottom: { x: 0, y: d / 2 }, left: { x: -d / 2, y: 0 } },
      };
    }
    default: {
      const w = clamp(tw + 3 * U, CORE_MIN * U, CORE_MAX * U);
      const h = clamp(th + 2 * U, BOX_H * U, 7 * U);
      return {
        symbol: 'process',
        w,
        h,
        ink: () => strokeFor({ shape: 'rectangle', x: -w / 2, y: -h / 2, w, h })!,
        ports: { top: { x: 0, y: -h / 2 }, right: { x: w / 2, y: 0 }, bottom: { x: 0, y: h / 2 }, left: { x: -w / 2, y: 0 } },
      };
    }
  }
}

/** A head drawn apart: a closed triangle, its apex on the end, pointing along `out`, `size` long — a head heads.ts reads (screen pixels). */
function triangleHead(apex: Point, out: Point, size: number): Point[] {
  const l = Math.hypot(out.x, out.y) || 1;
  const u = { x: out.x / l, y: out.y / l };
  const base = { x: apex.x - u.x * size, y: apex.y - u.y * size };
  const half = size * 0.55;
  const v = { x: -u.y * half, y: u.x * half };
  return inkAround([apex, add(base, v), { x: base.x - v.x, y: base.y - v.y }], INK_STEP / 1.5);
}

/** A symbol where it stands on the board: its outline, its box, and each port. */
interface Standing {
  id: string;
  rank: number;
  /** Its ink, in canvas units. */
  ink: Point[];
  centre: Point;
  hull: Point[];
  box: Bounds;
  ports: Record<Port, Point>;
}

/** How far a point stands outside a convex outline, either way round: 0 or less on it or inside. */
function outsideBy(p: Point, hull: readonly Point[]): number {
  if (hull.length < 3) return Infinity;
  let sign = 0;
  for (let i = 0; i < hull.length && !sign; i++) {
    const a = hull[i], b = hull[(i + 1) % hull.length];
    sign = Math.sign((b.x - a.x) * (hull[(i + 2) % hull.length].y - a.y) - (b.y - a.y) * (hull[(i + 2) % hull.length].x - a.x));
  }
  let out = -Infinity;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i], b = hull[(i + 1) % hull.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 1e-12) continue;
    // Positive beyond this edge, away from the inside.
    out = Math.max(out, (-sign * ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x))) / len);
  }
  return out;
}

/** Whether a segment meets a box (Liang–Barsky). */
function meetsBox(p: Point, q: Point, b: Bounds): boolean {
  let t0 = 0, t1 = 1;
  const dx = q.x - p.x, dy = q.y - p.y;
  const edges: [number, number][] = [[-dx, p.x - b.minX], [dx, b.maxX - p.x], [-dy, p.y - b.minY], [dy, b.maxY - p.y]];
  for (const [pp, qq] of edges) {
    if (pp === 0) {
      if (qq < 0) return false;
      continue;
    }
    const r = qq / pp;
    if (pp < 0) t0 = Math.max(t0, r);
    else t1 = Math.min(t1, r);
    if (t0 > t1) return false;
  }
  return true;
}

/** A link's way between its two symbols: straight, or an arc when no straight way is clear. */
interface Route {
  kind: 'straight' | 'arc';
  ports: [Port, Port];
  /** An arc's sweep in degrees, and the side of the chord it bulges to. */
  sweep?: number;
  side?: 1 | -1;
  /** It leaves its own symbols at once, rather than running back over one or along its edge. */
  clean: boolean;
  /** Its ends that meet another at a port along nearly its line — where heads.ts may read either as the other's head. */
  clash: number;
  /** It lies along a straight link already drawn. */
  overlaps: boolean;
  /** The other symbols it crosses. */
  crossings: number;
  /** No way between its two symbols read as drawn beside the links already there: the best by the other measures, kept and said. */
  misread?: boolean;
}

/** How many ways, best first, are drawn on a scratch board and read before one is given up on. */
const VERIFIED = 16;

/** What the links already routed hold: their straight segments, and the way each end leaves its port. */
interface RouteTaken {
  straight: [Point, Point][];
  /** Each port's ends, as the way each leaves it. */
  ports: Map<string, { ways: Point[] }>;
}

/**
 * Ends sharing a port lie at least this far apart, in degrees, as lines —
 * whichever way each runs. A short connector lying within about 35° of a
 * longer one's line where they meet, on either side of the meeting, is read
 * as that one's head (heads.ts: small beside it, on its axis).
 */
const APART_DEG = 45;

/** An arc's sweeps, the flattest first, each with the shortest chord on screen it is drawn on: there the shape rung reads it as an arc at 0.92. */
export const ARC_SWEEPS: [number, number][] = [[90, 100], [120, 60], [150, 60]];

/** The points of an arc from P to Q bulging to `side` (+1: left of P→Q as the screen shows it), sweeping `sweep` degrees — `n` segments. */
export function arcThrough(P: Point, Q: Point, sweep: number, side: 1 | -1, n: number): Point[] {
  const c = Math.hypot(Q.x - P.x, Q.y - P.y);
  const u = { x: (Q.x - P.x) / c, y: (Q.y - P.y) / c };
  const out = { x: u.y * side, y: -u.x * side };
  const th = (sweep * Math.PI) / 180;
  const R = c / (2 * Math.sin(th / 2));
  const d = R * Math.cos(th / 2);
  const M = mid(P, Q);
  const C = { x: M.x - out.x * d, y: M.y - out.y * d };
  const a0 = Math.atan2(P.y - C.y, P.x - C.x);
  const a1 = Math.atan2(Q.y - C.y, Q.x - C.x);
  // The way round that passes the bulge.
  const bulge = { x: M.x + out.x * (R - d), y: M.y + out.y * (R - d) };
  let delta = a1 - a0;
  const other = delta > 0 ? delta - 2 * Math.PI : delta + 2 * Math.PI;
  const at = (dl: number) => ({ x: C.x + R * Math.cos(a0 + dl / 2), y: C.y + R * Math.sin(a0 + dl / 2) });
  const off = (dl: number) => Math.hypot(at(dl).x - bulge.x, at(dl).y - bulge.y);
  if (off(other) < off(delta)) delta = other;
  const pts: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (delta * i) / n;
    pts.push({ x: C.x + R * Math.cos(a), y: C.y + R * Math.sin(a) });
  }
  pts[0] = { x: P.x, y: P.y };
  pts[n] = { x: Q.x, y: Q.y };
  return pts;
}

/** Whether two segments lie along each other: each within `tol` of the other's line, overlapping by more than `tol`. */
function alongEachOther(p: Point, q: Point, r: Point, s: Point, tol: number): boolean {
  const L = Math.hypot(q.x - p.x, q.y - p.y);
  if (L < 1e-9) return false;
  const u = { x: (q.x - p.x) / L, y: (q.y - p.y) / L };
  const off = (v: Point) => Math.abs((v.x - p.x) * -u.y + (v.y - p.y) * u.x);
  if (off(r) > tol || off(s) > tol) return false;
  const t = (v: Point) => (v.x - p.x) * u.x + (v.y - p.y) * u.y;
  const lo = Math.max(0, Math.min(t(r), t(s))), hi = Math.min(L, Math.max(t(r), t(s)));
  return hi - lo > tol;
}

/**
 * Which way a link runs between its two symbols. Straight first: of the
 * sixteen port pairs, the first by — it leaves its own symbols at once (a
 * segment from a port that runs back over its symbol is drawn over it); it
 * does not lie along a straight link already drawn; it crosses the fewest
 * other symbols; the direction's own ports (a down-link from a bottom to a
 * top, a link back up from a top to a bottom, the facing sides in one rank);
 * and the shortest. When no straight way is clean, clear and crosses
 * nothing — a flow back up a column, a second link between the same two
 * symbols — an arc bulging out from a pair of ports is tried, the flattest
 * that reads as an arc and crosses least, and taken when it does better.
 * Either is taken only when `reads` says it reads as drawn (the caller's
 * scratch-board check; undefined past its budget). Deterministic: ties go by
 * the order the ports are named.
 */
function routeLink(a: Standing, b: Standing, others: readonly Standing[], dir: MermaidFlow, taken: RouteTaken, margin: number, scale: number, reads: (route: Route) => boolean | undefined): Route {
  const across = dir === 'LR' || dir === 'RL';
  const ahead: Port = dir === 'LR' ? 'right' : dir === 'RL' ? 'left' : dir === 'BT' ? 'top' : 'bottom';
  const behind: Port = ahead === 'right' ? 'left' : ahead === 'left' ? 'right' : ahead === 'bottom' ? 'top' : 'bottom';
  const side = (p: Port) => p !== ahead && p !== behind;
  const pref = (pa: Port, pb: Port): number => {
    if (a.rank === b.rank) {
      const aFirst = across ? a.centre.y < b.centre.y : a.centre.x < b.centre.x;
      const facing: [Port, Port] = across ? (aFirst ? ['bottom', 'top'] : ['top', 'bottom']) : aFirst ? ['right', 'left'] : ['left', 'right'];
      return pa === facing[0] && pb === facing[1] ? 0 : 2;
    }
    const [out, into] = b.rank > a.rank ? [ahead, behind] : [behind, ahead];
    if (pa === out && pb === into) return 0;
    if ((pa === out && side(pb)) || (side(pa) && pb === into)) return 1;
    if (side(pa) && side(pb)) return 2;
    return 3;
  };
  /** Leaving `s` from `from` along `d`: the first step stands clear of it — not inside, and not along its edge. */
  const leaves = (s: Standing, from: Point, d: Point) => {
    const l = Math.hypot(d.x, d.y);
    if (l < 1e-12) return false;
    const size = Math.max(s.box.maxX - s.box.minX, s.box.maxY - s.box.minY);
    const e = 0.02 * size;
    // Clear of the edge by more than a grazing line's: about 9° off it at the least.
    return outsideBy({ x: from.x + (d.x / l) * e, y: from.y + (d.y / l) * e }, s.hull) > 0.15 * e;
  };
  /**
   * Ends sharing a port lie APART_DEG apart as lines, or one is read as the
   * other's head (heads.ts: a mark small beside a connector, touching its
   * end, on its axis either side). So apart, a head drawn apart — a triangle,
   * its centroid on its own connector's line — stands off every other one's
   * axis too, by more than heads.ts allows (0.47 of its size against 0.3).
   */
  const cosApart = Math.cos((APART_DEG * Math.PI) / 180);
  const conflicts = (pa: Port, pb: Port, ways: [Point, Point]) =>
    ([[a.id, pa, ways[0]], [b.id, pb, ways[1]]] as [string, Port, Point][]).filter(([id, port, way]) => {
      const u = taken.ports.get(`${id}:${port}`);
      const l = Math.hypot(way.x, way.y) || 1;
      return !!u && u.ways.some((w) => Math.abs(w.x * way.x + w.y * way.y) / l > cosApart);
    }).length;
  const grown = others.map((o) => ({ minX: o.box.minX - margin, minY: o.box.minY - margin, maxX: o.box.maxX + margin, maxY: o.box.maxY + margin }));
  const crosses = (pts: readonly Point[]) => grown.filter((g) => pts.some((p, i) => i > 0 && meetsBox(pts[i - 1], p, g))).length;

  const byScore = (p: { score: number[] }, q: { score: number[] }) => (lexLess(p.score, q.score) ? -1 : lexLess(q.score, p.score) ? 1 : 0);
  const lines: { score: number[]; route: Route }[] = [];
  for (const pa of PORTS) {
    for (const pb of PORTS) {
      const P = a.ports[pa], Q = b.ports[pb];
      const d = Math.hypot(Q.x - P.x, Q.y - P.y);
      if (d < 1e-9) continue;
      const v = { x: Q.x - P.x, y: Q.y - P.y };
      const clean = leaves(a, P, v) && leaves(b, Q, { x: -v.x, y: -v.y });
      const clash = conflicts(pa, pb, [v, { x: -v.x, y: -v.y }]);
      const overlaps = taken.straight.some(([r, s]) => alongEachOther(P, Q, r, s, 2 * scale));
      const crossings = crosses([P, Q]);
      lines.push({ score: [clean ? 0 : 1, clash, overlaps ? 1 : 0, crossings, pref(pa, pb), d], route: { kind: 'straight', ports: [pa, pb], clean, clash, overlaps, crossings } });
    }
  }
  lines.sort(byScore);
  // A way is taken when it is clean and reads as drawn.
  const first = (cands: { route: Route }[]) => {
    for (const c of cands) if (c.route.clean && reads(c.route)) return c.route;
    return undefined;
  };
  const found = first(lines);
  const line = found ?? { ...lines[0].route, misread: true };
  if (!line.misread && !line.overlaps && !line.crossings) return line;

  const bows: { score: number[]; route: Route }[] = [];
  for (const pa of PORTS) {
    for (const pb of PORTS) {
      const P = a.ports[pa], Q = b.ports[pb];
      const chord = Math.hypot(Q.x - P.x, Q.y - P.y);
      if (chord < 1e-9) continue;
      ARC_SWEEPS.forEach(([sweep, least], k) => {
        if (chord / scale < least) return;
        for (const s of [1, -1] as const) {
          const pts = arcThrough(P, Q, sweep, s, 24);
          const out = { x: pts[1].x - P.x, y: pts[1].y - P.y }, back = { x: pts[23].x - Q.x, y: pts[23].y - Q.y };
          const clean = leaves(a, P, out) && leaves(b, Q, back);
          if (!clean) continue;
          const clash = conflicts(pa, pb, [out, back]);
          const crossings = crosses(pts);
          bows.push({ score: [clash, crossings, k, pa === pb && side(pa) ? 0 : 1, pref(pa, pb), chord], route: { kind: 'arc', ports: [pa, pb], sweep, side: s, clean, clash, overlaps: false, crossings } });
        }
      });
    }
  }
  bows.sort(byScore);
  const arc = first(bows);
  if (arc && (line.misread || line.overlaps || arc.crossings < line.crossings)) return arc;
  return line;
}

const PORTS: Port[] = ['top', 'right', 'bottom', 'left'];

/** Whether one score comes before another: the first place they differ decides. */
function lexLess(a: readonly number[], b: readonly number[]): boolean {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
}

/** A connector's ink, and the heads drawn apart from it — each a closed triangle's ink — in canvas units. */
function connectorInk(route: Route, P: Point, Q: Point, drawn: DrawnLink['drawn'], scale: number): { points: Point[]; heads: Point[][] } {
  const hand = (p: Point) => ({ x: p.x / scale, y: p.y / scale });
  const toWorld = (p: Point) => ({ x: p.x * scale, y: p.y * scale });
  const unit = (v: Point) => {
    const l = Math.hypot(v.x, v.y) || 1;
    return { x: v.x / l, y: v.y / l };
  };
  const chord = Math.hypot(Q.x - P.x, Q.y - P.y) / scale;
  const size = clamp(0.1 * chord, HEAD_MIN_PX, HEAD_MAX_PX);
  const head = (at: Point, pointing: Point) => triangleHead(hand(at), pointing, size).map(toWorld);
  if (route.kind === 'arc') {
    // An arc, laid every few pixels along it on screen; its heads closed triangles along its ends.
    const th = (route.sweep! * Math.PI) / 180;
    const n = clamp(Math.round((chord * th) / (2 * Math.sin(th / 2)) / INK_STEP), 16, 300);
    const points = arcThrough(hand(P), hand(Q), route.sweep!, route.side!, n).map(toWorld);
    const heads: Point[][] = [];
    if (drawn !== '---') heads.push(head(Q, unit({ x: points[n].x - points[n - 1].x, y: points[n].y - points[n - 1].y })));
    if (drawn === '<-->') heads.push(head(P, unit({ x: points[0].x - points[1].x, y: points[0].y - points[1].y })));
    return { points, heads };
  }
  if (drawn === '---') return { points: strokeFor({ shape: 'line', from: hand(P), to: hand(Q) })!.map(toWorld), heads: [] };
  // An arrow long on screen keeps its barb in proportion: strokeFor drawn smaller, then scaled.
  const k = Math.max(1, chord / ARROW_PROPORTION_PX);
  const f = (p: Point) => ({ x: p.x / (scale * k), y: p.y / (scale * k) });
  const points = strokeFor({ shape: 'arrow', from: f(P), to: f(Q) })!.map((p) => ({ x: p.x * scale * k, y: p.y * scale * k }));
  return { points, heads: drawn === '<-->' ? [head(P, unit({ x: P.x - Q.x, y: P.y - Q.y }))] : [] };
}

/** A connector to read on a scratch board: its ink, how it runs and is drawn, and which of its ends stand on the symbols being read. */
interface Scratch {
  ink: { points: Point[]; heads: Point[][] };
  route: Route;
  drawn: DrawnLink['drawn'];
  at: { start: boolean; end: boolean };
}

/** What each end of a connector reads as when drawn right: its own barb, a head drawn apart (by its place in the ink's heads), or no head — a symbol, at most. */
function endsOf(route: Route, drawn: DrawnLink['drawn']): Record<'start' | 'end', 'none' | 'barb' | number> {
  if (route.kind === 'arc') return { start: drawn === '<-->' ? 1 : 'none', end: drawn === '---' ? 'none' : 0 };
  if (drawn === '---') return { start: 'none', end: 'none' };
  return { start: drawn === '<-->' ? 0 : 'none', end: 'barb' };
}

/**
 * Whether connectors read as drawn: put on a scratch board with the symbols
 * they meet — nothing enters the board being drawn on — heads.ts must read,
 * at every end standing on one of those symbols, the connector's own barb,
 * its own head drawn apart, or no head but a symbol. A symbol at an end is
 * read as a head too (a decision as a diamond, a circle as a circle), and so
 * is a short connector along another's line where they meet; when either
 * outranks what was drawn there, the end loses its direction.
 */
function readsAsDrawn(symbols: readonly Point[][], conns: readonly Scratch[], scale: number): boolean {
  const scratch = createSession();
  let t = 1;
  const symbolIds = new Set(symbols.map((ink) => scratch.addStroke([...ink], t++, undefined, scale, { content: true })));
  const placed = conns.map((c) => ({
    c,
    id: scratch.addStroke(c.ink.points, t++, undefined, scale, { content: true }),
    heads: c.ink.heads.map((h) => scratch.addStroke(h, t++, undefined, scale, { content: true })),
  }));
  const st = scratch.getState();
  return placed.every(({ c, id, heads }) => {
    const read = headsOf(st, id);
    if (!read) return false;
    const want = endsOf(c.route, c.drawn);
    return (['start', 'end'] as const).every((end) => {
      if (!c.at[end]) return true;
      const top = read[end].heads[0];
      const w = want[end];
      if (w === 'none') return !top || top.ids.some((x) => symbolIds.has(x));
      // A head is its own reading — not a symbol read as a head with it for fill.
      if (!top || top.ids.some((x) => symbolIds.has(x))) return false;
      return top.ids.includes(w === 'barb' ? id : heads[w]);
    });
  });
}

/** Beside everything on the board: right of its content, level with its top. The origin when the board is empty. */
function besideContent(session: Session, margin: number): Point {
  const st = session.getState();
  let minY = Infinity, maxX = -Infinity;
  for (const id of st.contentIds) {
    const n = st.nodes.get(id);
    const b = n && !getRep(n, 'erased') ? boundsOf(n) : undefined;
    if (!b) continue;
    maxX = Math.max(maxX, b.maxX);
    minY = Math.min(minY, b.minY);
  }
  return Number.isFinite(maxX) ? { x: maxX + margin, y: minY } : { x: 0, y: 0 };
}

/** Draw a read flowchart. */
function drawFlowchartRead(session: Session, read: MermaidRead, opts: DrawMermaidOptions): DrawnMermaid {
  const scale = opts.scale && opts.scale > 0 ? opts.scale : 1;
  const pid = opts.participantId;
  const U = MERMAID_TEXT_PX;
  const notes = [...read.notes];
  const refused = [...read.refused];
  let t = opts.at;
  const next = () => t++;

  // The caps: the first nodes in the text's order, and the links among them.
  const nodes = read.nodes.slice(0, MERMAID_MAX_NODES);
  const kept = new Set(nodes.map((n) => n.id));
  if (read.nodes.length > nodes.length) {
    const cut = read.links.filter((l) => !kept.has(l.from) || !kept.has(l.to)).length;
    notes.push(`the text holds ${read.nodes.length} nodes and the board draws ${MERMAID_MAX_NODES} at most: the first ${MERMAID_MAX_NODES} are drawn, and the ${read.nodes.length - MERMAID_MAX_NODES} after them${cut ? ` and the ${cut} link${cut === 1 ? '' : 's'} that touch them are` : ' are'} not`);
  }
  const among = read.links.filter((l) => kept.has(l.from) && kept.has(l.to));
  const links = among.slice(0, MERMAID_MAX_LINKS);
  if (among.length > links.length) notes.push(`the text holds ${among.length} links among the nodes drawn and the board draws ${MERMAID_MAX_LINKS} at most: the ${among.length - MERMAID_MAX_LINKS} after the first ${MERMAID_MAX_LINKS} are not drawn`);
  if (!nodes.length) {
    notes.push('nothing to draw: the text names no node');
    return { notation: read.notation, direction: read.direction, ids: {}, links: [], notes, refused, bounds: null, lastAt: t - 1 };
  }

  // Sizes, in the hand's space, then the layout in canvas units.
  const figures = new Map(nodes.map((n) => [n.id, figureOf(n.symbol as FlowSymbol, n.text)]));
  const layout: LayeredLayout = layoutLayered(
    nodes.map((n) => ({ id: n.id, w: figures.get(n.id)!.w * scale, h: figures.get(n.id)!.h * scale })),
    links.map((l) => ({ from: l.from, to: l.to })),
    { direction: read.direction, rankGap: RANK_GAP * U * scale, nodeGap: NODE_GAP * U * scale }
  );
  const origin = opts.origin ?? besideContent(session, CORE_MIN * U * scale);
  const centreOf = (id: string) => add(origin, layout.at.get(id)!);
  const world = (id: string, p: Point) => add(centreOf(id), { x: p.x * scale, y: p.y * scale });

  // The symbols: boxes, diamonds and boxes leaning first — shapes no letter is — then the rest, each in the text's order.
  const made = new Map<string, string>();
  const first = (n: MermaidNodeRead) => (n.symbol === 'process' || n.symbol === 'decision' || n.symbol === 'data' ? 0 : 1);
  for (const n of [...nodes].sort((p, q) => first(p) - first(q))) {
    const f = figures.get(n.id)!;
    made.set(n.id, session.addStroke(f.ink().map((p) => world(n.id, p)), next(), pid, scale, { content: true }));
  }
  const ids: Record<string, string> = Object.fromEntries(nodes.map((n) => [n.id, made.get(n.id)!]));
  const placeholder: string[] = [];
  for (const n of nodes) {
    const words = n.text.trim();
    if (!words) continue;
    if (words === UNREAD_WRITING) placeholder.push(n.id);
    session.label({ nodeId: ids[n.id], text: words, participantId: pid, at: next() });
  }

  // Each port where it stands: on a site the mark offers itself, else the notation's port.
  const st = () => session.getState();
  const endAt = (id: string, port: Port): DrawnEnd => {
    const nodeId = ids[id];
    const want = world(id, figures.get(id)!.ports[port]);
    const tol = HAND_RESOLUTION_PX * scale;
    const node = st().nodes.get(nodeId)!;
    let best: { d: number; site: { kind: string; index: number }; point: Point } | null = null;
    for (const s of magnetSites(node, st().nodes)) {
      if (s.kind.startsWith('port:') || s.kind.startsWith('along:')) continue;
      const d = Math.hypot(s.point.x - want.x, s.point.y - want.y);
      if (!best || d < best.d) best = { d, site: { kind: s.kind, index: s.index }, point: { x: s.point.x, y: s.point.y } };
    }
    if (best && best.d <= tol) return { nodeId, site: best.site, of: 'mark', port, point: best.point };
    const read = flowchartPortsOf(node, st().nodes);
    const points = (read?.ports ?? []).filter((p) => p.at && !p.along);
    const k = points.findIndex((p) => Math.hypot(p.at!.x - want.x, p.at!.y - want.y) <= tol);
    if (k >= 0) return { nodeId, site: { kind: `port:${FLOWCHART_TABLE.notation}`, index: k }, of: 'notation', port, point: { ...points[k].at! } };
    notes.push(`${id}’s ${port} is on no site its mark offers: bound at the nearest (${best ? `${best.site.kind} ${best.site.index}` : 'none'})`);
    return { nodeId, site: best?.site ?? { kind: 'centre', index: 0 }, of: 'mark', port, point: want };
  };

  // The links, in the text's order: port to port, a head where the link has one, bound at both ends, its words on its own ink.
  const standing = new Map<string, Standing>();
  const ends = new Map<string, DrawnEnd>();
  for (const n of nodes) {
    const f = figures.get(n.id)!;
    const ink = f.ink().map((p) => world(n.id, p));
    const hull = hullOf(ink);
    const xs = hull.map((p) => p.x), ys = hull.map((p) => p.y);
    // Each port where its end will stand: on the site it is bound at, so what is routed and read is what is drawn.
    for (const p of PORTS) ends.set(`${n.id}:${p}`, endAt(n.id, p));
    const ports = Object.fromEntries(PORTS.map((p) => [p, ends.get(`${n.id}:${p}`)!.point])) as Record<Port, Point>;
    standing.set(n.id, { id: n.id, rank: layout.rank.get(n.id)!, ink, centre: centreOf(n.id), hull, box: { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }, ports });
  }
  const drawnLinks: DrawnLink[] = [];
  const crossing: string[] = [];

  const drawnOf = (l: MermaidLinkRead): DrawnLink['drawn'] => (l.head === 'forward' ? '-->' : l.head === 'both' ? '<-->' : '---');
  // What each routed link will be as ink, and which marks heads.ts could read as a head at which end.
  /** A mark as heads.ts weighs it for a head: its hull, box, size, middle, and how far it reaches for an end to touch it. */
  interface Weighed {
    hull: Point[];
    box: Bounds;
    size: number;
    centre: Point;
    reach: number;
  }
  /** An end as heads.ts reads it: where it is, the way out past it, and its connector's length. */
  interface EndRead {
    point: Point;
    out: Point;
    length: number;
  }
  interface Placed {
    link: MermaidLinkRead;
    route: Route;
    drawn: DrawnLink['drawn'];
    ink: { points: Point[]; heads: Point[][] };
    P: Point;
    Q: Point;
    ends: EndRead[];
    /** The connector, then each head drawn apart. */
    marks: Weighed[];
  }
  const placed: Placed[] = [];
  const weigh = (pts: readonly Point[]): Weighed => {
    const hull = hullOf(pts);
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const box = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
    const size = Math.max(box.maxX - box.minX, box.maxY - box.minY);
    const centre = hull.length ? { x: hull.reduce((k, p) => k + p.x, 0) / hull.length, y: hull.reduce((k, p) => k + p.y, 0) / hull.length } : { x: 0, y: 0 };
    // Touching is within the magnet radius of the mark's own size (heads.ts), here with room to spare.
    return { hull, box, size, centre, reach: 1.5 * magnetRadius(size, scale) };
  };
  const unitOf = (v: Point) => {
    const l = Math.hypot(v.x, v.y) || 1;
    return { x: v.x / l, y: v.y / l };
  };
  const placedOf = (l: MermaidLinkRead, r: Route): Placed => {
    const a = standing.get(l.from)!, b = standing.get(l.to)!;
    const P = a.ports[r.ports[0]], Q = b.ports[r.ports[1]];
    const drawn = drawnOf(l);
    const ink = connectorInk(r, P, Q, drawn, scale);
    const pts = ink.points, n = pts.length;
    const along = (t: number) => pts[Math.min(n - 1, Math.max(0, Math.round(t * (n - 1))))];
    const length = Math.max(Math.hypot(Q.x - P.x, Q.y - P.y), 1e-6);
    // The way out past each end, as heads.ts takes it: along a straight connector, along an arc's last stretch.
    const outs = r.kind === 'arc' ? [unitOf({ x: P.x - along(0.15).x, y: P.y - along(0.15).y }), unitOf({ x: Q.x - along(0.85).x, y: Q.y - along(0.85).y })] : [unitOf({ x: P.x - Q.x, y: P.y - Q.y }), unitOf({ x: Q.x - P.x, y: Q.y - P.y })];
    return { link: l, route: r, drawn, ink, P, Q, ends: [{ point: P, out: outs[0], length }, { point: Q, out: outs[1], length }], marks: [ink.points, ...ink.heads].map(weigh) };
  };
  /**
   * Whether heads.ts could read a mark as a head at an end: it touches the
   * end, it is small beside the end's connector, and it lies on the
   * connector's line — its three gates (HEAD_MAX_SHARE, HEAD_AXIS_SHARE),
   * each with room to spare — or it stands so close to the end it could be
   * a barb's fill. Only then is anything read on a scratch board.
   */
  const mayRead = (e: EndRead, m: Weighed) => {
    const off = Math.max(m.box.minX - e.point.x, 0, e.point.x - m.box.maxX, m.box.minY - e.point.y, e.point.y - m.box.maxY);
    if (off > m.reach) return false;
    const d = m.hull.length < 3 ? Math.min(...m.hull.map((p) => Math.hypot(p.x - e.point.x, p.y - e.point.y))) : outsideBy(e.point, m.hull);
    if (d > m.reach || m.size > 1.2 * HEAD_MAX_SHARE * e.length) return false;
    const v = { x: m.centre.x - e.point.x, y: m.centre.y - e.point.y };
    const across = Math.abs(e.out.x * v.y - e.out.y * v.x), ahead = e.out.x * v.x + e.out.y * v.y;
    return (across <= 1.5 * HEAD_AXIS_SHARE * m.size && ahead >= -1.2 * m.size) || Math.hypot(v.x, v.y) <= 0.25 * e.length;
  };
  const symbolWeight = new Map([...standing.values()].map((o) => [o.id, weigh(o.ink)]));

  // Routes: the flows from one rank to the next first, each taking its own ports, then those that skip ranks, then those that run back.
  const span = (l: MermaidLinkRead) => layout.rank.get(l.to)! - layout.rank.get(l.from)!;
  const routes = new Map<MermaidLinkRead, Route>();
  const taken: RouteTaken = { straight: [], ports: new Map() };
  for (const l of [...links.filter((x) => span(x) === 1), ...links.filter((x) => span(x) > 1), ...links.filter((x) => span(x) < 1)]) {
    const a = standing.get(l.from)!, b = standing.get(l.to)!;
    const others = [...standing.values()].filter((o) => o.id !== a.id && o.id !== b.id);
    const drawn = drawnOf(l);
    // Taken outright when nothing is within heads.ts's reach of its ends and it comes within reach of no
    // other end; else read on a scratch board with every link and symbol it is near — VERIFIED times at most.
    let budget = VERIFIED;
    const reads = (r: Route): boolean | undefined => {
      const c = placedOf(l, r);
      const involved = placed.filter((d) => c.ends.some((e) => d.marks.some((m) => mayRead(e, m))) || d.ends.some((e) => c.marks.some((m) => mayRead(e, m))));
      const nearSymbols = others.filter((o) => c.ends.some((e) => mayRead(e, symbolWeight.get(o.id)!)));
      // A head drawn apart must outrank the symbol it stands on, which heads.ts reads as a head there too.
      const want = endsOf(r, drawn);
      const outranked = ([['start', a], ['end', b]] as const).some(([end, o], k) => typeof want[end] === 'number' && mayRead(c.ends[k], symbolWeight.get(o.id)!));
      if (!involved.length && !nearSymbols.length && !outranked) return true;
      if (budget-- <= 0) return undefined;
      const symbols = new Map<string, Standing>([[a.id, a], [b.id, b], ...nearSymbols.map((o) => [o.id, o] as [string, Standing])]);
      for (const d of involved) for (const id of [d.link.from, d.link.to]) symbols.set(id, standing.get(id)!);
      const conns: Scratch[] = [...involved, c].map((d) => ({ ink: d.ink, route: d.route, drawn: d.drawn, at: { start: true, end: true } }));
      return readsAsDrawn([...symbols.values()].map((o) => o.ink), conns, scale);
    };
    const route = routeLink(a, b, others, read.direction, taken, 0.5 * U * scale, scale, reads);
    if (route.misread) notes.push(`no way between ${l.from} and ${l.to} reads as drawn beside the links already there: read back, the link ${l.from} → ${l.to} or one beside it may say otherwise`);
    routes.set(l, route);
    placed.push(placedOf(l, route));
    const P = a.ports[route.ports[0]], Q = b.ports[route.ports[1]];
    if (route.kind === 'straight') taken.straight.push([P, Q]);
    const pts = route.kind === 'arc' ? arcThrough(P, Q, route.sweep!, route.side!, 24) : [P, Q];
    const ways = [{ x: pts[1].x - P.x, y: pts[1].y - P.y }, { x: pts[pts.length - 2].x - Q.x, y: pts[pts.length - 2].y - Q.y }];
    ([[a.id, route.ports[0], ways[0]], [b.id, route.ports[1], ways[1]]] as [string, Port, Point][]).forEach(([id, port, way]) => {
      const key = `${id}:${port}`;
      const u = taken.ports.get(key) ?? { ways: [] };
      const l = Math.hypot(way.x, way.y) || 1;
      u.ways.push({ x: way.x / l, y: way.y / l });
      taken.ports.set(key, u);
    });
    if (route.overlaps) notes.push(`${l.from} and ${l.to} are joined more often than their sides can keep apart: the link ${l.from} → ${l.to} is drawn along another`);
    if (route.crossings) crossing.push(`${l.from} → ${l.to}`);
  }

  // Drawn in the text's order.
  for (const l of links) {
    const route = routes.get(l)!;
    const start = ends.get(`${l.from}:${route.ports[0]}`)!, end = ends.get(`${l.to}:${route.ports[1]}`)!;
    const P = start.point, Q = end.point;
    const drawn = drawnOf(l);
    const ink = connectorInk(route, P, Q, drawn, scale);
    const id = session.addStroke(ink.points, next(), pid, scale, { content: true });
    const all = [id, ...ink.heads.map((h) => session.addStroke(h, next(), pid, scale, { content: true }))];
    session.bind({ strokeId: id, nodeId: start.nodeId, site: start.site, end: 'start', at: next(), participantId: pid });
    session.bind({ strokeId: id, nodeId: end.nodeId, site: end.site, end: 'end', at: next(), participantId: pid });
    const words = l.label?.trim();
    if (words) {
      if (words === UNREAD_WRITING) placeholder.push(`${l.from} → ${l.to}`);
      session.label({ nodeId: id, text: words, participantId: pid, at: next() });
    }
    drawnLinks.push({ index: l.index, from: l.from, to: l.to, id, ids: all, drawn, route: route.kind, ...(words ? { label: words } : {}), start, end });
  }

  if (crossing.length) notes.push(`a straight connector cannot always go around: ${crossing.length === 1 ? 'the link' : 'the links'} ${some(crossing)} ${crossing.length === 1 ? 'crosses' : 'cross'} a symbol on the way — ${crossing.length === 1 ? 'it reads' : 'they read'} by ${crossing.length === 1 ? 'its' : 'their'} bound ends all the same`);

  // What will not read back as written.
  for (const b of layout.back) {
    if (!b.cycle) continue;
    const l = links[b.index];
    notes.push(`the flow ${l.from} → ${l.to} closes a cycle (${b.cycle.join(' → ')}), and runs back against the direction: ${l.to} comes first in the text`);
  }
  if (layout.stretch > 1) notes.push(`the ranks stand ${layout.stretch.toFixed(1)}× further apart than the text size asks, so the flows run more ${read.direction === 'LR' || read.direction === 'RL' ? 'across' : 'down'} than ${read.direction === 'LR' || read.direction === 'RL' ? 'down' : 'across'}, as the header says`);
  if (!layout.kept) notes.push(`every flow runs within a rank, so read back the drawing will say ${read.direction === 'LR' || read.direction === 'RL' ? 'TD' : 'LR'}, not ${read.direction}`);
  for (const n of nodes) {
    if (n.symbol !== 'start' && n.symbol !== 'end') continue;
    const outs = links.filter((l) => (l.from === n.id && l.head !== 'none') || (l.to === n.id && l.head === 'both')).length;
    const ins = links.filter((l) => (l.to === n.id && l.head !== 'none') || (l.from === n.id && l.head === 'both')).length;
    const plain = links.filter((l) => l.head === 'none' && (l.from === n.id || l.to === n.id)).length;
    if (!outs && !ins && !plain) notes.push(`${n.id} is joined to nothing, and a flowchart reads a small circle as a start or an end only by the flows at it — read back it is left out`);
    else if (n.symbol === 'start' && ins > 0) notes.push(`a flow arrives at the start ${n.id}: a flowchart reads a circle by its flows, so read back it may say (((…))), an end`);
    else if (n.symbol === 'end' && outs > 0) notes.push(`a flow leaves the end ${n.id}: a flowchart reads a circle by its flows, so read back it may say ((…)), a start`);
  }
  if (!nodes.some((n) => n.symbol !== 'start' && n.symbol !== 'end')) notes.push('the chart has no process, decision, terminator or data symbol, and a flowchart needs one: read back, this ink is not a flowchart');
  else if (!drawnLinks.length) notes.push('the chart has no flow, and a flowchart needs one: read back, this ink is not a flowchart');
  if (placeholder.length) notes.push(`“${UNREAD_WRITING}” is what D2 writes for writing nobody has read: it is put on the ink as the words, since the words are not known — ${some(placeholder)}`);

  const b = layout.bounds;
  return {
    notation: read.notation,
    direction: read.direction,
    ids,
    links: drawnLinks,
    notes,
    refused,
    bounds: { minX: origin.x + b.minX, minY: origin.y + b.minY, maxX: origin.x + b.maxX, maxY: origin.y + b.maxY },
    lastAt: t - 1,
  };
}

/** The flowchart's reader: `flowchart`, `graph` and `flowchart-elk`. */
export const FLOWCHART_READER: MermaidReader = {
  notation: FLOWCHART_TABLE.notation,
  read: readFlowchartText,
  draw: drawFlowchartRead,
};

for (const keyword of ['flowchart', 'graph', 'flowchart-elk']) registerMermaidReader(keyword, FLOWCHART_READER);

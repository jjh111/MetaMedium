// Mermaid in (V1-PLAN §3, §9 D3) — Mermaid text drawn on the board as ink.
//
// The contract, ahead of the code (red first): a reader per Mermaid diagram
// keyword, symmetric to D2's writers; the flowchart's reads `flowchart` and
// `graph`; `drawMermaid` lays the diagram out and draws it as clean forms the
// flowchart notation reads, bound at their ports and labelled on their own
// ink; what it cannot read is refused with a line number, never thrown.

import type { Bounds, Point } from '../types';
import type { Session } from '../session/session';

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
  /** How it is drawn: an arrow, a line, or an arrow with a head at its tail too. */
  drawn: '-->' | '---' | '<-->';
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

/** A Mermaid text as read — nothing drawn. */
export function readMermaid(text: string): MermaidRead {
  return { keyword: '', notation: null, direction: 'TD', nodes: [], links: [], notes: [], refused: [{ line: 1, text: String(text).split('\n')[0] ?? '', reason: 'not read yet (D3 red)' }] };
}

/** Draw a Mermaid text on the board. */
export function drawMermaid(session: Session, text: string, opts: DrawMermaidOptions): DrawnMermaid {
  void session;
  const read = readMermaid(text);
  return { notation: null, ids: {}, links: [], notes: [], refused: read.refused, bounds: null, lastAt: opts.at - 1 };
}

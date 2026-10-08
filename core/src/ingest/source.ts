// The ink document: what every adapter hands the surface (V1-SPEC IN1).
//
// A file arrives as bytes in some format. An adapter reads it into this one shape — pages of strokes in the
// colours they were drawn in, pictures with boxes, text, links and tags — and says where it came from. The
// surface lands the document on a board; nothing here knows about boards, sessions or the log.
//
// THE INVARIANT: once imported, a stroke is a stroke. The engine reads it exactly as a hand's, and no reading
// depends on its colour. So a stroke carries its colour and its width as what the source said, for the surface
// to draw (V1-SPEC KN2's fourth rule) until the stroke is given a kind, and the engine never looks at them.
//
// READ, NOT TRUSTED (DATA-1): a file is whatever someone sent. An adapter returns a result, never throws —
// a file it cannot read is `{ ok: false, reason }` with the reason as a sentence a person can be told, and a
// file it can read in part is `{ ok: true, doc, notes }` with a note for everything it left out or cut short.

import type { Point } from '../types';

/** How a stroke was recovered from its source. */
export type Recovery =
  /** The line itself, as the source drew it: a stroked path, a source line a path effect kept, a shape's own edge. */
  | 'stroke'
  /** A filled outline read back to its line by pairing the outline's two sides (`ink-outline.ts`). */
  | 'ribbon'
  /** A filled outline read back to its line by thinning it and walking the junctions (`image/trace.ts`'s own). */
  | 'skeleton';

/**
 * How well a recovered line stands for the outline it came from: *recall* is the share of the outline's area within
 * half a pen width (and a pixel) of the line, *precision* the share of the line's length inside the outline (and
 * a pixel). Faithful means both are at least `FAITHFUL_AT`.
 */
export interface Fidelity {
  recall: number;
  precision: number;
  faithful: boolean;
}

export interface InkStroke {
  /** The line, in the page's units. A time `t` and a pressure `p` are kept where the source has them. */
  points: Point[];
  /** The colour the source drew it in, `#rrggbb`. */
  color: string;
  /** The pen's width in the page's units: the outline's mean width, a stroked path's `stroke-width`; 0 for an edge. */
  width: number;
  /** Paint order within the page, from 0, shared with its pictures and texts: later is on top. */
  order: number;
  recovery: Recovery;
  /** The line comes back to where it began. */
  closed: boolean;
  /** Which outline (or path) of the page this came from: strokes of one outline share it. */
  outline: number;
  /** Less than 1 when the source drew it translucent (a highlighter). Left out when opaque. */
  opacity?: number;
  /** How faithfully a ribbon or skeleton stands for its outline. Left out for a line the source drew. */
  fidelity?: Fidelity;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface InkPicture {
  order: number;
  /** Where it stands on the page. */
  box: Box;
  /** The picture's own bytes, when the file holds them (PNG, JPEG or WebP). */
  bytes?: Uint8Array;
  /** Where the bytes are when the file does not hold them: an address or a path, as written. */
  ref?: string;
  mime?: string;
  /** Its own size in pixels, when it can be read. */
  w?: number;
  h?: number;
  name?: string;
}

export interface InkText {
  order: number;
  text: string;
  /** Where the text begins, on its baseline for a figure's words; 0, 0 for a note. */
  x: number;
  y: number;
  /** The size of its letters in the page's units, when the source says. */
  size?: number;
  color?: string;
  /** `markdown` for a note, whose marks are its own; `plain` for words in a figure. */
  format: 'plain' | 'markdown';
}

export interface InkLink {
  kind: 'wiki' | 'href';
  /** A wiki link's note, or an address. */
  target: string;
  /** The words the link is shown as, when they differ. */
  label?: string;
  /** A heading or block inside the target (`[[Note#Heading]]`). */
  section?: string;
  /** An embed (`![[Note]]`) rather than a reference. */
  embed?: boolean;
}

export interface InkPage {
  index: number;
  /** The page's size in the hand's units — CSS pixels. 0 × 0 for a note, which flows. */
  width: number;
  height: number;
  strokes: InkStroke[];
  pictures: InkPicture[];
  texts: InkText[];
  links: InkLink[];
  tags: string[];
}

export type SourceFormat = 'svg' | 'markdown' | 'png' | 'jpeg' | 'webp';

/** Where a document came from. */
export interface Source {
  /** The SHA-256 of the file's bytes, 64 lower-case hex digits: the key the source is kept under. */
  hash: string;
  /** The file's name as it arrived. */
  name: string;
  format: SourceFormat;
  /** What made the file, when it says (`Adobe Illustrator`, `Inkscape 1.2`). */
  tool?: string;
  /** When the source says it was made, as written (an ISO date or a time). Never the import's own. */
  created?: string;
  /** Which page of a multi-page file this is (IN2). */
  page?: number;
}

/**
 * What the file is taken to be, and why. A drawing of mostly pen-shaped fills and strokes is *ink*; a drawing of
 * mostly shapes and words is a *figure* (it stays the file it was); a note is *text*; a photograph is a *picture*.
 * Both readings of a drawing stay available: the strokes are in the document either way, and the file is the
 * figure.
 */
export interface Reading {
  as: 'ink' | 'figure' | 'text' | 'picture';
  /** The counts the verdict stands on. */
  evidence: Record<string, number>;
  /** Said as a person would be told. */
  words: string;
}

export interface InkDocument {
  source: Source;
  pages: InkPage[];
  reading: Reading;
  /** What the document is called, when the file says (a note's first heading, a figure's title). */
  title?: string;
  /** Set to the sentence that says so when the work on the file was cut short. */
  truncated?: string;
}

export type IngestResult =
  | { ok: true; doc: InkDocument; notes: string[] }
  | { ok: false; reason: string };

export const refuse = (reason: string): IngestResult => ({ ok: false, reason });
export const accept = (doc: InkDocument, notes: string[]): IngestResult => ({ ok: true, doc, notes });

/** An empty page. */
export function blankPage(index: number, width = 0, height = 0): InkPage {
  return { index, width, height, strokes: [], pictures: [], texts: [], links: [], tags: [] };
}

/** A SHA-256 as the sources keep it: 64 lower-case hex digits. */
export const isHash = (s: unknown): s is string => typeof s === 'string' && /^[0-9a-f]{64}$/.test(s);

const HEX = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
/** `#rrggbb` from three channels, each clamped to 0–255. */
export const hexColor = (r: number, g: number, b: number): string => '#' + HEX(r) + HEX(g) + HEX(b);

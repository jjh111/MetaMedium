// Words on the board — text artifacts' lines and writing a participant has
// read, with where each stands (MATHS-PLAN.md §4).
//
// Two readers read them: the sheet (gather.ts), which wants a page of lines,
// and the dimensions (dimension.ts), which want the numbers written beside
// marks. Both read the board the same way, so the reading lives here once:
//
//   - TEXT is a `text` artifact's newest code, a line of it per line;
//   - WRITING is marks carrying a transcript (session/nodes.ts,
//     `transcriptOf`), gathered by band — marks that share a vertical extent
//     are one line, left to right — which is the unit the writing concept
//     reads (concepts/concept.ts). A gap wider than a column's (`COLUMN_GAP`
//     heights of the writing) splits a band into phrases: the sheet joins them
//     again with a column's gap kept, so a formula and the worked line beside
//     it reach it as one line; a label on a drawing is one phrase.
//
// Everything here reads and nothing writes.

import type { Bounds } from '../types';
import type { SessionState } from '../session/session';
import type { MMNode } from '../session/nodes';
import { boundsOf, getRep, transcriptOf } from '../session/nodes';

/** Marks on one band share at least this much of the shorter one's height. */
export const BAND_OVERLAP = 0.35;
/**
 * A gap between marks on one band, in heights of the writing, past which it
 * is a column's gap and not a word's. The writing concept ends a line at the
 * same gap; the sheet goes on and keeps the gap.
 */
export const COLUMN_GAP = 2.5;

/** A piece of writing: one mark a participant has read, and what it says. */
export interface WrittenPiece {
  id: string;
  text: string;
  bounds: Bounds;
}

/** A `text` artifact standing on the board. */
export interface TextOnBoard {
  id: string;
  code: string;
  bounds: Bounds;
}

/** A `text` artifact's words: its newest code, when that is text. */
export function textCodeOf(node: MMNode): string | undefined {
  for (let i = node.reps.length - 1; i >= 0; i--) {
    const r = node.reps[i];
    if (r.modality !== 'code') continue;
    const d = r.data as { kind?: unknown; code?: unknown };
    return d.kind === 'text' && typeof d.code === 'string' ? d.code : undefined;
  }
  return undefined;
}

/**
 * Every text artifact and every piece of read writing on the content plane,
 * in the order the plane holds them. Erased and broken artifacts are gone
 * from the plane and are not read; writing nobody has read is not guessed at.
 */
export function wordsOnBoard(state: SessionState, except?: ReadonlySet<string>): { texts: TextOnBoard[]; pieces: WrittenPiece[] } {
  const texts: TextOnBoard[] = [];
  const pieces: WrittenPiece[] = [];
  for (const id of state.contentIds) {
    if (except?.has(id)) continue;
    const node = state.nodes.get(id);
    if (!node || getRep(node, 'erased')) continue;
    const b = boundsOf(node);
    if (!b) continue;
    if (state.artifacts.includes(id)) {
      const code = textCodeOf(node);
      if (code !== undefined) texts.push({ id, code, bounds: b });
      continue;
    }
    const text = transcriptOf(node)?.trim();
    if (text) pieces.push({ id, text, bounds: b });
  }
  return { texts, pieces };
}

/** How much of the shorter one's height two boxes share. */
export function bandOverlap(a: Bounds, b: Bounds): number {
  const o = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
  const shorter = Math.max(1, Math.min(a.maxY - a.minY, b.maxY - b.minY));
  return o / shorter;
}

function median(xs: number[]): number {
  const s = xs.slice().sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
}

/** Writing in bands, top to bottom, each left to right. */
export function writingBands(pieces: readonly WrittenPiece[]): WrittenPiece[][] {
  const sorted = pieces.slice().sort((p, q) => p.bounds.minY + p.bounds.maxY - (q.bounds.minY + q.bounds.maxY));
  const bands: WrittenPiece[][] = [];
  for (const p of sorted) {
    const band = bands.find((bd) => bd.some((o) => bandOverlap(o.bounds, p.bounds) >= BAND_OVERLAP));
    if (band) band.push(p);
    else bands.push([p]);
  }
  for (const band of bands) band.sort((p, q) => p.bounds.minX - q.bounds.minX);
  return bands;
}

/** The height of a band's writing: the median of its pieces'. */
export function bandHeight(band: readonly WrittenPiece[]): number {
  return Math.max(1, median(band.map((p) => p.bounds.maxY - p.bounds.minY)));
}

/** A band split at every column's gap: the phrases written on it. */
export function bandPhrases(band: readonly WrittenPiece[]): WrittenPiece[][] {
  const h = bandHeight(band);
  const out: WrittenPiece[][] = [];
  for (const p of band) {
    const last = out[out.length - 1];
    if (last && p.bounds.minX - last[last.length - 1].bounds.maxX <= COLUMN_GAP * h) last.push(p);
    else out.push([p]);
  }
  return out;
}

export function boundsOfAll(boxes: readonly Bounds[]): Bounds {
  return {
    minX: Math.min(...boxes.map((b) => b.minX)),
    maxX: Math.max(...boxes.map((b) => b.maxX)),
    minY: Math.min(...boxes.map((b) => b.minY)),
    maxY: Math.max(...boxes.map((b) => b.maxY)),
  };
}

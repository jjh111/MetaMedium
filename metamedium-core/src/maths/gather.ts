// Lines for a sheet, gathered from a session's state (DIRECTOR-PLAN-W2 M2).
//
// The sheet (sheet.ts) reads plain lines. On the board those lines are
// either TEXT — a `text` artifact's code, a line of it per line — or WRITING
// a participant has read: marks carrying a transcript (session/nodes.ts,
// `transcriptOf`). This gathers both, in reading order, with where each line
// stands and which marks it came from, so a later unit can put a check beside
// the step it belongs to. How the board is read — text by its lines, writing
// by band, a column's gap kept — is `writing.ts`, shared with the dimensions.
//
// **A number on a mark is not a line of the page** (M3a). A 24 written beside
// a triangle's side is that side's length, and an 8 inside a piece is its
// label; read as a sheet they would be values that agree with no step, and
// they would vote on the page's unit. So `sheetLines` leaves out every number
// `dimension.ts` reads as on a mark — a dimension, an angle or a piece label.
// A step's value written on a drawing (`1. 15″`) is on a mark too; it is
// checked against its step with `checkWritten`, beside the edge it labels.
//
// It reads and never writes: nothing in the session changes, and nothing the
// sheet derives from these lines is ever put back into the log.

import type { Bounds, Point } from '../types';
import type { SessionState } from '../session/session';
import { attachedNumberIds } from './dimension';
import { bandHeight, boundsOfAll, COLUMN_GAP, wordsOnBoard, writingBands } from './writing';

export interface GatheredLine {
  text: string;
  /** The line's top-left corner, in canvas units. */
  at: Point;
  bounds: Bounds;
  /** The marks or the artifact it was read from. */
  ids: string[];
  from: 'writing' | 'text';
}

export interface SheetLinesOptions {
  /**
   * Ids to leave out. Unset: every number the dimensions read as on a mark
   * (`attachedNumberIds`). A caller that has already read the dimensions
   * passes their `numberIds` and saves reading them twice.
   */
  except?: Iterable<string>;
}

/**
 * Every line a sheet could read on this board: each line of every `text`
 * artifact standing on it, and each band of writing a participant has read —
 * less the numbers that stand on marks. Erased and broken artifacts are gone
 * from the content plane and are not read; writing nobody has read is not
 * guessed at.
 */
export function sheetLines(state: SessionState, options: SheetLinesOptions = {}): GatheredLine[] {
  const except = new Set(options.except ?? attachedNumberIds(state));
  const { texts, pieces } = wordsOnBoard(state, except);
  const out: GatheredLine[] = [];
  for (const t of texts) {
    const b = t.bounds;
    const rows = t.code.split(/\r?\n/);
    const h = (b.maxY - b.minY) / Math.max(1, rows.length);
    rows.forEach((row, i) => {
      const text = row.trim();
      if (!text) return;
      const lb = { minX: b.minX, maxX: b.maxX, minY: b.minY + i * h, maxY: b.minY + (i + 1) * h };
      out.push({ text, at: { x: lb.minX, y: lb.minY }, bounds: lb, ids: [t.id], from: 'text' });
    });
  }

  // Writing: bands, then left to right along each, a column's gap kept.
  for (const band of writingBands(pieces)) {
    const h = bandHeight(band);
    let text = band[0].text;
    for (let i = 1; i < band.length; i++) {
      const gap = band[i].bounds.minX - band[i - 1].bounds.maxX;
      text += (gap > COLUMN_GAP * h ? '   ' : ' ') + band[i].text;
    }
    const bounds = boundsOfAll(band.map((p) => p.bounds));
    out.push({ text, at: { x: bounds.minX, y: bounds.minY }, bounds, ids: band.map((p) => p.id), from: 'writing' });
  }

  // Reading order: top to bottom, then left to right.
  return out
    .map((l, i) => ({ l, i }))
    .sort((a, b) => a.l.bounds.minY - b.l.bounds.minY || a.l.bounds.minX - b.l.bounds.minX || a.i - b.i)
    .map((x) => x.l);
}

// Lines for a sheet, gathered from a session's state (DIRECTOR-PLAN-W2 M2).
//
// The sheet (sheet.ts) reads plain lines. On the board those lines are
// either TEXT — a `text` artifact's code, a line of it per line — or WRITING
// a participant has read: marks carrying a transcript (session/nodes.ts,
// `transcriptOf`). This gathers both, in reading order, with where each line
// stands and which marks it came from, so a later unit can put a check beside
// the step it belongs to.
//
// It reads and never writes: nothing in the session changes, and nothing the
// sheet derives from these lines is ever put back into the log.
//
// Writing is gathered by band — marks that share a vertical extent are one
// line, left to right — which is the unit the writing concept reads
// (concepts/concept.ts). A gap wider than a line of writing's own break is
// kept as a column's gap ("   "), so a formula and the worked line beside it
// reach the sheet as one line, the way the pages write them.

import type { Bounds, Point } from '../types';
import type { SessionState } from '../session/session';
import type { MMNode } from '../session/nodes';
import { boundsOf, getRep, transcriptOf } from '../session/nodes';

export interface GatheredLine {
  text: string;
  /** The line's top-left corner, in canvas units. */
  at: Point;
  bounds: Bounds;
  /** The marks or the artifact it was read from. */
  ids: string[];
  from: 'writing' | 'text';
}

/** Marks on one band share at least this much of the shorter one's height. */
const BAND_OVERLAP = 0.35;
/**
 * A gap between marks on one band, in heights of the writing, past which it
 * is a column's gap and not a word's. The writing concept ends a line at the
 * same gap; here the line goes on, and the gap is kept.
 */
const COLUMN_GAP = 2.5;

/** A `text` artifact's words: its newest code, when that is text. */
function textCodeOf(node: MMNode): string | undefined {
  for (let i = node.reps.length - 1; i >= 0; i--) {
    const r = node.reps[i];
    if (r.modality !== 'code') continue;
    const d = r.data as { kind?: unknown; code?: unknown };
    return d.kind === 'text' && typeof d.code === 'string' ? d.code : undefined;
  }
  return undefined;
}

function overlap(a: Bounds, b: Bounds): number {
  const o = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
  const shorter = Math.max(1, Math.min(a.maxY - a.minY, b.maxY - b.minY));
  return o / shorter;
}

function median(xs: number[]): number {
  const s = xs.slice().sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
}

/**
 * Every line a sheet could read on this board: each line of every `text`
 * artifact standing on it, and each band of writing a participant has read.
 * Erased and broken artifacts are gone from the content plane and are not
 * read; writing nobody has read is not guessed at.
 */
export function sheetLines(state: SessionState): GatheredLine[] {
  const out: GatheredLine[] = [];
  const pieces: { id: string; text: string; b: Bounds }[] = [];
  for (const id of state.contentIds) {
    const node = state.nodes.get(id);
    if (!node || getRep(node, 'erased')) continue;
    const b = boundsOf(node);
    if (!b) continue;
    if (state.artifacts.includes(id)) {
      const code = textCodeOf(node);
      if (code === undefined) continue;
      const rows = code.split(/\r?\n/);
      const h = (b.maxY - b.minY) / Math.max(1, rows.length);
      rows.forEach((row, i) => {
        const text = row.trim();
        if (!text) return;
        const lb = { minX: b.minX, maxX: b.maxX, minY: b.minY + i * h, maxY: b.minY + (i + 1) * h };
        out.push({ text, at: { x: lb.minX, y: lb.minY }, bounds: lb, ids: [id], from: 'text' });
      });
      continue;
    }
    const text = transcriptOf(node)?.trim();
    if (text) pieces.push({ id, text, b });
  }

  // Writing: bands, then left to right along each.
  pieces.sort((p, q) => p.b.minY + p.b.maxY - (q.b.minY + q.b.maxY));
  const bands: (typeof pieces)[] = [];
  for (const p of pieces) {
    const band = bands.find((bd) => bd.some((o) => overlap(o.b, p.b) >= BAND_OVERLAP));
    if (band) band.push(p);
    else bands.push([p]);
  }
  for (const band of bands) {
    band.sort((p, q) => p.b.minX - q.b.minX);
    const h = Math.max(1, median(band.map((p) => p.b.maxY - p.b.minY)));
    let text = band[0].text;
    for (let i = 1; i < band.length; i++) {
      const gap = band[i].b.minX - band[i - 1].b.maxX;
      text += (gap > COLUMN_GAP * h ? '   ' : ' ') + band[i].text;
    }
    const bounds = {
      minX: Math.min(...band.map((p) => p.b.minX)),
      maxX: Math.max(...band.map((p) => p.b.maxX)),
      minY: Math.min(...band.map((p) => p.b.minY)),
      maxY: Math.max(...band.map((p) => p.b.maxY)),
    };
    out.push({ text, at: { x: bounds.minX, y: bounds.minY }, bounds, ids: band.map((p) => p.id), from: 'writing' });
  }

  // Reading order: top to bottom, then left to right.
  return out
    .map((l, i) => ({ l, i }))
    .sort((a, b) => a.l.bounds.minY - b.l.bounds.minY || a.l.bounds.minX - b.l.bounds.minX || a.i - b.i)
    .map((x) => x.l);
}

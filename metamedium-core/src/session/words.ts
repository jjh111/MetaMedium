// Words from letters.
//
// Cursive is one stroke and the shape rung reads it as `text`. Printed
// letters are several — an N, then an A in two strokes, then a V — and each
// one alone reads as a line, a triangle, a couple of corners. The word is not
// any of them; it is the run. So the session gathers small strokes drawn in
// quick succession, side by side on a shared band, into a held `word` node:
// the letters become its parts, the word takes their place in the content
// plane, and it reads as `text` — so it can be a label, be read by a model
// that can see, and become a name. Nothing is committed: the grouping is
// inferred, undo drops it, erasing a letter shrinks it, and it can be split.
//
// Every rule below is in the HAND's space (scaled by 1/zoom): letters are
// small on screen whatever the world coordinates say.

import type { Bounds } from '../types';

/** A stroke taller than this on screen is a shape, not a letter. */
export const LETTER_MAX_HEIGHT_PX = 44;
/** …or wider than this: an underline, a line, a box. */
export const LETTER_MAX_WIDTH_PX = 60;
/** Letters sit closer than this fraction of the run's height. */
export const WORD_GAP_RATIO = 0.7;
/** Their vertical bands overlap by at least this fraction of the shorter. */
export const WORD_BAND_OVERLAP = 0.35;
/** A letter belongs to the word being written now, not one from a minute ago. */
export const WORD_WINDOW_MS = 3000;

export function isLetterLike(b: Bounds, scale: number): boolean {
  const h = (b.maxY - b.minY) / scale, w = (b.maxX - b.minX) / scale;
  return h <= LETTER_MAX_HEIGHT_PX && w <= LETTER_MAX_WIDTH_PX;
}

/**
 * Does a letter-like stroke continue a run? Beside it (either side — people
 * go back to cross a t), on its band, close relative to its height, and soon.
 */
export function joinsRun(
  run: { bounds: Bounds; lastAt: number },
  letter: { bounds: Bounds; at: number },
  scale: number
): { ok: boolean; reasoning: string } {
  if (letter.at - run.lastAt > WORD_WINDOW_MS) return { ok: false, reasoning: 'drawn too long after the last letter' };
  const rb = run.bounds, lb = letter.bounds;
  const runH = Math.max(1, rb.maxY - rb.minY), letH = Math.max(1, lb.maxY - lb.minY);
  const band = Math.min(rb.maxY, lb.maxY) - Math.max(rb.minY, lb.minY);
  // A dot over an i sits ABOVE the band; allow a small mark within the run's
  // x-span that is close above it.
  const withinX = lb.minX >= rb.minX - runH * 0.3 && lb.maxX <= rb.maxX + runH * 0.3;
  const closeAbove = lb.maxY <= rb.minY && rb.minY - lb.maxY <= runH * 0.6 && letH <= runH * 0.5;
  if (withinX && closeAbove) return { ok: true, reasoning: 'a small mark just above the word' };
  // A crossbar is a line with no height, a dot has almost none: for those the
  // band test is whether their centre lies on the run's line.
  const letMid = (lb.minY + lb.maxY) / 2;
  const onLine = band >= Math.min(runH, letH) * WORD_BAND_OVERLAP || (letMid >= rb.minY && letMid <= rb.maxY)
    || ((rb.minY + rb.maxY) / 2 >= lb.minY && (rb.minY + rb.maxY) / 2 <= lb.maxY);
  if (!onLine) return { ok: false, reasoning: 'not on the same line' };
  const gap = Math.max(lb.minX - rb.maxX, rb.minX - lb.maxX, 0);
  const ref = Math.max(runH, letH) / scale;
  if (gap / scale > ref * WORD_GAP_RATIO) return { ok: false, reasoning: 'too far from the last letter to be the same word' };
  // Sizes should match — unless one of them is a dash or a dot.
  const tiny = Math.min(runH, letH) / scale < 10;
  if (!tiny && (letH / runH > 2.2 || runH / letH > 2.2)) return { ok: false, reasoning: 'a different size from the letters beside it' };
  return { ok: true, reasoning: `beside the last letter, on its line, ${Math.round(gap / scale)}px away` };
}

/** Confidence that a run of N letter-like strokes is writing. Two is a guess; five is a word. */
export function wordConfidence(letters: number): number {
  return Math.min(0.88, 0.55 + 0.08 * (letters - 2));
}

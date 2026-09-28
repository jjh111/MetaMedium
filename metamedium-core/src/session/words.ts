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

/**
 * A stroke taller than this on screen is a shape, not a letter. A generous
 * ceiling, not the rule: a letter is a letter by its RUN — on a band, a
 * word's gap apart, similar in height to the letters beside it. The first
 * cap (44 px) was written for x-height letters and threw out every ascender
 * a real hand makes (v10 F1: John's h, l and d were 72–88 px tall).
 */
export const LETTER_MAX_HEIGHT_PX = 150;
/** …or wider than this: an underline, a rule, a box. */
export const LETTER_MAX_WIDTH_PX = 150;
/**
 * A letter may be this many times shorter than the run it joins, at most: an
 * x-height o beside a run that already holds an ascender and a descender
 * (h, e, l, l — the run's box is ascender + x-height + descender, some
 * 3.4 x-heights in John's hand). Four is the ratio with headroom.
 */
export const LETTER_HEIGHT_RATIO = 4;
/** Letters sit closer than this fraction of the run's height. */
export const WORD_GAP_RATIO = 0.7;
/** Their vertical bands overlap by at least this fraction of the shorter. */
export const WORD_BAND_OVERLAP = 0.35;
/** A letter belongs to the word being written now, not one from a minute ago. */
export const WORD_WINDOW_MS = 3000;

/** A flat stroke wider than this is a rule or an underline, not a dash or a crossbar. */
export const DASH_MAX_WIDTH_PX = 60;
/** A stroke shorter than this on screen is a dot, a dash or a crossbar: no size to match a letter by. */
export const LETTER_TINY_PX = 10;

// ===== What is drawing, not writing (V1-PLAN §9 W1) =====
//
// The rules above read bounds and time, and bounds cannot tell a flow from an
// l, nor `< >` from `( )`. Three kinds of stroke are drawing however
// letter-like their bounds, and the session asks each of a stroke before it
// starts or joins a word (`absorbIntoWord`, session.ts), on the stroke's own
// geometry and its neighbours' — never on who drew it or how fast:
//
//   - A CONNECTOR: it reads as a line, an arrow or an arc, and an end of it
//     meets a mark that is not writing (touching it, at a site the magnet
//     binds, or bound — within that mark's magnet reach), or it is long
//     against the x-height of the writing it would join. A tall l is safe on
//     both counts: an ascender is under three x-heights (John's h, l and d
//     stand 72–88 px over an x-height of 31–40, 2.2–2.8), and the session
//     does not count a meeting an l makes as writing does — with a box it
//     stands inside, with a line along the writing rather than end to end
//     with it, or with the ground the run's other letters stand on too.
//   - TWO HALVES: strokes whose ends meet, closing a figure (`figuresAmong`
//     reads a triangle or a quadrilateral), each end within
//     FIGURE_MEET_SHARE of the smaller stroke's size of the other's.
//   - A HEAD DRAWN APART, right after its connector or right before it
//     (`headApartAt`, heads.ts): it is its connector's, and neither is a
//     letter.

/**
 * Two strokes close a figure, and are not letters, only when each end of one
 * meets an end of the other within this share of the smaller stroke's own
 * size: a diamond's quick halves meet within a tenth of a half, while a
 * printed A's crossbar stands a whole crossbar from its legs' feet — near
 * enough for the magnet's reach, which is why the reach alone cannot say it.
 */
export const FIGURE_MEET_SHARE = 0.25;

/**
 * The x-height of a run of letters: the lower median of their heights,
 * leaving out the tiny (a dot, a dash, a crossbar) and whatever reads as a
 * connector (a stem stands an ascender high, and whether a stroke is a stem
 * or a flow is the question being asked). Null when nothing is left.
 */
export function xHeightOf(letters: readonly { height: number; tiny: boolean; connector: boolean }[]): number | null {
  const hs = letters.filter((l) => !l.tiny && !l.connector).map((l) => l.height).sort((a, b) => a - b);
  return hs.length ? hs[Math.floor((hs.length - 1) / 2)] : null;
}

/**
 * Long against a run: LETTER_HEIGHT_RATIO x-heights or more. The tallest
 * letter a hand prints — an ascender, or a descender and its bowl — is under
 * three.
 */
export function longAgainst(length: number, xHeight: number): boolean {
  return length >= LETTER_HEIGHT_RATIO * xHeight;
}

/** Whether two strokes' ends pair up — each end of one within `limit` of a different end of the other. */
export function endsPairUp(a: readonly [{ x: number; y: number }, { x: number; y: number }], b: readonly [{ x: number; y: number }, { x: number; y: number }], limit: number): boolean {
  const d = (p: { x: number; y: number }, q: { x: number; y: number }) => Math.hypot(p.x - q.x, p.y - q.y);
  const straight = Math.max(d(a[0], b[0]), d(a[1], b[1]));
  const crossed = Math.max(d(a[0], b[1]), d(a[1], b[0]));
  return Math.min(straight, crossed) <= limit;
}

export function isLetterLike(b: Bounds, scale: number): boolean {
  const h = (b.maxY - b.minY) / scale, w = (b.maxX - b.minX) / scale;
  if (h > LETTER_MAX_HEIGHT_PX || w > LETTER_MAX_WIDTH_PX) return false;
  // A flat, wide stroke is a rule under something, not a letter — unless it
  // is short enough to be a dash or the bar of a t.
  if (h < 10 && w > DASH_MAX_WIDTH_PX) return false;
  return true;
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
  // Sizes should match to within an ascender — unless one of them is a dash or a dot.
  const tiny = Math.min(runH, letH) / scale < LETTER_TINY_PX;
  if (!tiny && (letH / runH > LETTER_HEIGHT_RATIO || runH / letH > LETTER_HEIGHT_RATIO)) return { ok: false, reasoning: 'a different size from the letters beside it' };
  return { ok: true, reasoning: `beside the last letter, on its line, ${Math.round(gap / scale)}px away` };
}

/** Confidence that a run of N letter-like strokes is writing. Two is a guess; five is a word. */
export function wordConfidence(letters: number): number {
  return Math.min(0.88, 0.55 + 0.08 * (letters - 2));
}

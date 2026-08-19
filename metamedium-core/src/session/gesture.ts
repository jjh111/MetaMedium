// Gesture detection: pure predicates over fingerprints + context.
//
// v0.1 grammar (ARCHITECTURE-v6 §6): two strokes — a lasso (closed-ish,
// encloses content) followed by a check (open, 1–2 corners, small, nearby,
// soon after). Detection is evidence, not commitment: the session engine
// holds a lasso as simultaneously content and gesture-candidate until the
// next event resolves it.
//
// v0.2 (MVP.md §5.2): the resolving mark may be one the USER taught the system
// rather than the built-in check, and it may be required to actually cross the
// lasso rather than merely land near it. The built-in check remains the default
// so the canvas works before it has been taught anything.

import type { Bounds, Fingerprint, Point } from '../types';
import { boundingBoxDistance, boundsContain, boundsOverlap } from '../geometry';
import { segmentsIntersect } from './erase';
import { type CommandMark, matchesCommandMark, BUILTIN_COMMAND_MARK } from './commandmark';

export interface GestureConfig {
  /** Max ms between lasso completion and command mark. Temporal half of the rule. */
  checkWindowMs: number;
  /**
   * How close the mark must come to the selection when it does not actually
   * cross it, as a fraction of the LASSO'S OWN SIZE. A ratio rather than a pixel
   * count, so a tick beside a small group and a tick beside a huge one are
   * judged alike — this was the last fixed-pixel rule in the gesture grammar.
   */
  checkProximityRatio: number;
  /** The mark must be smaller than this fraction of the lasso's size. */
  checkMaxSizeRatio: number;
  /** The user's taught mark. Null (the default) uses the built-in check. */
  commandMark?: CommandMark | null;
}

export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  checkWindowMs: 4000,
  checkProximityRatio: 0.15,
  checkMaxSizeRatio: 0.6,
  commandMark: null,
};

/**
 * A stroke is lasso-like only in context: closed-ish AND enclosing existing
 * content. A closed circle around nothing is just a circle.
 */
export function isLassoLike(fp: Fingerprint, enclosedContentCount: number): boolean {
  return fp.isClosed && enclosedContentCount >= 1;
}

/** Which of the given bounds the lasso fully encloses. */
export function enclosedBy(lassoBounds: Bounds, candidates: { id: string; bounds: Bounds }[]): string[] {
  return candidates.filter((c) => boundsContain(lassoBounds, c.bounds)).map((c) => c.id);
}

/**
 * Check-shaped, by the built-in signature.
 *
 * Kept as a named predicate because "is this a check?" is a question surfaces
 * ask, but it is no longer a hand-rolled rule: it runs the same signature match
 * a taught mark runs. The old version — open, 1–2 corners, smaller than the
 * lasso — accepted an L, a backwards L and an upside-down caret.
 */
export function isCheckLike(
  fp: Fingerprint,
  lassoFp: Fingerprint,
  config: GestureConfig = DEFAULT_GESTURE_CONFIG
): boolean {
  if (fp.size > lassoFp.size * config.checkMaxSizeRatio) return false;
  return matchesCommandMark(fp, BUILTIN_COMMAND_MARK).match;
}

/** Do two strokes cross at least once? */
export function strokesIntersect(a: Point[], b: Point[]): boolean {
  for (let i = 1; i < a.length; i++) {
    for (let j = 1; j < b.length; j++) {
      if (segmentsIntersect(a[i - 1], a[i], b[j - 1], b[j])) return true;
    }
  }
  return false;
}

/**
 * Full resolution test: shape + spatial context + temporal recency.
 * Neither time nor shape alone decides (ARCHITECTURE-v6 principle 4).
 *
 * `strokes` is optional; supplying it enables the intersection test, which is
 * how the MVP's "draw across the lasso" flow reads.
 */
export function resolvesLasso(
  checkFp: Fingerprint,
  checkAt: number,
  lassoFp: Fingerprint,
  lassoAt: number,
  config: GestureConfig = DEFAULT_GESTURE_CONFIG,
  strokes?: { check: Point[]; lasso: Point[] }
): boolean {
  if (checkAt - lassoAt > config.checkWindowMs) return false;

  // Shape: the taught mark if there is one, otherwise the built-in check. Same
  // matcher either way — the default is a signature we ship, not a special case.
  const mark = config.commandMark ?? BUILTIN_COMMAND_MARK;
  if (checkFp.size > lassoFp.size * config.checkMaxSizeRatio) return false;
  if (!matchesCommandMark(checkFp, mark).match) return false;

  // Context: the mark must ENGAGE the selection — cross it, overlap it, or come
  // close relative to the selection's own size. Crossing is the strongest form
  // and the one the MVP flow is built on; a tick at the edge of a circled group
  // is the same intent and is accepted too.
  if (strokes && strokesIntersect(strokes.check, strokes.lasso)) return true;
  if (boundsOverlap(checkFp.bounds, lassoFp.bounds)) return true;
  return (
    boundingBoxDistance(checkFp.bounds, lassoFp.bounds) <
    lassoFp.size * config.checkProximityRatio
  );
}

// ===== Diagnosis =====

export type MissReason = 'too-late' | 'too-big' | 'not-the-mark' | 'not-engaged';

export interface MarkMiss {
  reason: MissReason;
  /** What to tell the human, in their terms. */
  detail: string;
  /**
   * True when the stroke was recognisably an ATTEMPT at the mark and something
   * else stopped it. Worth saying out loud; a stroke that was nothing like the
   * mark is just drawing, and reporting on it would be nagging.
   */
  nearMiss: boolean;
}

/**
 * Why a stroke did not resolve the pending lasso.
 *
 * A gesture that fails silently is indistinguishable from a gesture that does
 * not exist — the user cannot tell whether they drew it wrong, waited too long,
 * or made it too big, so they cannot get better at it. The engine knows exactly
 * which test failed, and it costs nothing to say.
 */
export function whyNotResolved(
  checkFp: Fingerprint,
  checkAt: number,
  lassoFp: Fingerprint,
  lassoAt: number,
  config: GestureConfig = DEFAULT_GESTURE_CONFIG,
  strokes?: { check: Point[]; lasso: Point[] }
): MarkMiss | null {
  const mark = config.commandMark ?? BUILTIN_COMMAND_MARK;
  const match = matchesCommandMark(checkFp, mark);
  const shapeOk = match.match;

  if (checkAt - lassoAt > config.checkWindowMs) {
    return {
      reason: 'too-late',
      detail: `the circle had been waiting more than ${Math.round(config.checkWindowMs / 1000)}s`,
      nearMiss: shapeOk,
    };
  }
  if (checkFp.size > lassoFp.size * config.checkMaxSizeRatio) {
    return {
      reason: 'too-big',
      detail: 'the mark was too large for what it was marking',
      nearMiss: shapeOk,
    };
  }
  if (!shapeOk) {
    // Only volunteer this when the stroke was in the neighbourhood of the mark;
    // otherwise the user was drawing, not gesturing.
    const engaged =
      (strokes && strokesIntersect(strokes.check, strokes.lasso)) ||
      boundsOverlap(checkFp.bounds, lassoFp.bounds);
    return {
      reason: 'not-the-mark',
      detail: match.failedOn
        ? `that is not the ${mark.name} — ${readable(match.failedOn)}`
        : `that is not the ${mark.name}`,
      nearMiss: !!engaged && !checkFp.isClosed,
    };
  }
  return {
    reason: 'not-engaged',
    detail: 'the mark has to cross or touch the circle',
    nearMiss: true,
  };
}

/** The feature that failed, said the way a person would say it. */
function readable(feature: string): string {
  switch (feature) {
    case 'armRatio': return 'its two halves are the wrong lengths';
    case 'turnSharpness': return 'its corner is the wrong sharpness';
    case 'vertexDepth': return 'its corner is in the wrong place';
    case 'endRise': return 'it ends at the wrong height';
    case 'closureRatio': return 'its ends join up';
    case 'corners': return 'it has the wrong number of corners';
    case 'aspect': return 'its proportions are wrong';
    case 'straightness': return 'it is too curved';
    default: return `its ${feature} is off`;
  }
}

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
import { type CommandMark, matchesCommandMark } from './commandmark';

export interface GestureConfig {
  /** Max ms between lasso completion and check start. Temporal half of the rule. */
  checkWindowMs: number;
  /** Max px gap between check and lasso bounds. Contextual half of the rule. */
  checkProximityPx: number;
  /** Check must be smaller than this fraction of the lasso's size. */
  checkMaxSizeRatio: number;
  /** The user's taught mark. Null (the default) falls back to the built-in check. */
  commandMark?: CommandMark | null;
  /**
   * Require a TAUGHT command mark to genuinely cross the lasso rather than land
   * near it. Does not apply to the built-in check: a confirming tick belongs
   * beside a selection, while a command mark is drawn deliberately across it.
   * Ignored when the surface supplies no stroke points.
   */
  requireIntersection?: boolean;
}

export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  checkWindowMs: 4000,
  checkProximityPx: 80,
  checkMaxSizeRatio: 0.6,
  commandMark: null,
  requireIntersection: true,
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
 * Check-shaped: open, a single sharp turn (1–2 detected corners), and small
 * relative to the lasso it would resolve.
 */
export function isCheckLike(
  fp: Fingerprint,
  lassoFp: Fingerprint,
  config: GestureConfig = DEFAULT_GESTURE_CONFIG
): boolean {
  if (fp.isClosed) return false;
  if (fp.corners < 1 || fp.corners > 2) return false;
  if (fp.size > lassoFp.size * config.checkMaxSizeRatio) return false;
  return true;
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

  if (config.commandMark) {
    // A taught mark: fingerprint must match, and it must not dwarf the lasso.
    if (!matchesCommandMark(checkFp, config.commandMark).match) return false;
    if (checkFp.size > lassoFp.size) return false;
    // Crossing is the deliberate act. Proximity is the fallback only for
    // surfaces that hand us no points.
    if (config.requireIntersection && strokes) return strokesIntersect(strokes.check, strokes.lasso);
  } else {
    // The built-in check: a small tick that lands beside the lasso.
    if (!isCheckLike(checkFp, lassoFp, config)) return false;
  }

  return (
    boundsOverlap(checkFp.bounds, lassoFp.bounds) ||
    boundingBoxDistance(checkFp.bounds, lassoFp.bounds) < config.checkProximityPx
  );
}

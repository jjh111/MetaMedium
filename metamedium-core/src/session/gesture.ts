// Gesture detection: pure predicates over fingerprints + context.
// v0.1 grammar (ARCHITECTURE-v6 §6): two strokes — a lasso (closed-ish,
// encloses content) followed by a check (open, 1–2 corners, small, nearby,
// soon after). Detection is evidence, not commitment: the session engine
// holds a lasso as simultaneously content and gesture-candidate until the
// next event resolves it.

import type { Bounds, Fingerprint } from '../types';
import { boundingBoxDistance, boundsContain, boundsOverlap } from '../geometry';

export interface GestureConfig {
  /** Max ms between lasso completion and check start. Temporal half of the rule. */
  checkWindowMs: number;
  /** Max px gap between check and lasso bounds. Contextual half of the rule. */
  checkProximityPx: number;
  /** Check must be smaller than this fraction of the lasso's size. */
  checkMaxSizeRatio: number;
}

export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  checkWindowMs: 4000,
  checkProximityPx: 80,
  checkMaxSizeRatio: 0.6,
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

/**
 * Full resolution test: shape + spatial context + temporal recency.
 * Neither time nor shape alone decides (ARCHITECTURE-v6 principle 4).
 */
export function resolvesLasso(
  checkFp: Fingerprint,
  checkAt: number,
  lassoFp: Fingerprint,
  lassoAt: number,
  config: GestureConfig = DEFAULT_GESTURE_CONFIG
): boolean {
  if (checkAt - lassoAt > config.checkWindowMs) return false;
  if (!isCheckLike(checkFp, lassoFp, config)) return false;
  const near =
    boundsOverlap(checkFp.bounds, lassoFp.bounds) ||
    boundingBoxDistance(checkFp.bounds, lassoFp.bounds) < config.checkProximityPx;
  return near;
}

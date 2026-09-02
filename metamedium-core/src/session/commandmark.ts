// The command mark: the gesture that turns a selection into an offer.
//
// WHAT IT IS. A check — down-left to a sharp elbow, then a longer flick up to
// the right — drawn across a circled group. It is defined by six scale-free
// measurements, not by "a small stroke with a bend in it", and the difference
// matters: the earlier rule (open, 1–2 corners, smaller than the lasso) fired on
// an L, a backwards L, and an upside-down caret. A gesture that fires on any
// bent stroke is not a gesture, it is an accident waiting for the user's hand.
//
// WHY A CHECK.
//   - It already means "yes, do this" to everyone, so nothing has to be taught.
//   - Its elbow is sharp and its arms are ASYMMETRIC (roughly 1:1.6), which is
//     measurable and unlike the shapes the canvas already knows — a triangle, a
//     box and an arc are all either closed or smooth.
//   - It is oriented: the elbow sits low and the stroke ends high. That single
//     constraint separates it from an L, a V and a caret, which is most of what
//     an unoriented rule confuses it with.
//   - It is one stroke and about half a second.
//
// AND IT IS REPLACEABLE. The built-in check is not a special case in the code:
// it is a signature learned from canonical samples, exactly the way YOUR mark is
// learned when you draw it five times. One mechanism, shipped pre-taught. That
// is the thesis pointed at its own interface — the gesture grammar is user
// vocabulary, and the default is just the vocabulary we ship with.

import type { Fingerprint, Point } from '../types';
import { getFingerprint } from '../geometry';

/** How many samples the teach flow collects. Enough for a spread, few enough to draw. */
export const COMMAND_MARK_SAMPLES = 5;

/**
 * Every feature is scale-free — a ratio, a count, or a position within the
 * stroke's own bounding box — so a mark works at any size and any zoom.
 * Three of them are ORIENTED, which is what a check needs and what the old
 * rule lacked entirely.
 */
const FEATURES = [
  'straightness',
  'corners',
  'aspect',
  'closureRatio',
  /** Shorter arm over longer arm, split at the sharpest corner. A V is 1.0; a check ~0.6. */
  'armRatio',
  /** How sharp that corner turns, 0–1 of a half turn. */
  'turnSharpness',
  /** Where the corner sits vertically in the stroke's box. 0 = top (caret), 1 = bottom (check). */
  'vertexDepth',
  /** How much higher the stroke ends than it began, as a fraction of its height. */
  'endRise',
] as const;
type Feature = (typeof FEATURES)[number];

/**
 * Minimum tolerance per feature, in that feature's own units. A user with a very
 * steady hand would otherwise learn a band so tight that their sixth attempt
 * fails — a signature must be at least as loose as ordinary hand variation.
 * These are the designed generosity of the gesture; the learned spread only ever
 * widens them.
 */
const TOLERANCE_FLOOR: Record<Feature, number> = {
  // Widest floor of the set, and measured rather than guessed: across 60
  // hand-drawn checks the straightness of a check ranges 0.46–0.74, because a
  // deep dip lengthens the path without moving the endpoints. It still earns
  // its place — it separates a bend from a curve — but it cannot be the tight
  // feature, and it was rejecting one real check in six when it was.
  straightness: 0.22,
  corners: 0.9,
  aspect: 0.34,
  closureRatio: 0.2,
  armRatio: 0.26,
  turnSharpness: 0.26,
  vertexDepth: 0.34,
  endRise: 0.42,
};

/** Observed spread is widened by this much before it becomes the accept band. */
const SPREAD_MULTIPLIER = 2.5;

export interface CommandMark {
  name: string;
  /** Mean of each scale-free feature across the samples. */
  features: Record<Feature, number>;
  /** Accept band per feature — max(observed spread × multiplier, floor). */
  tolerance: Record<Feature, number>;
  /** Whether the taught mark closes. A hard gate, not a scored feature. */
  isClosed: boolean;
  sampleCount: number;
  /**
   * 0–1. How repeatable the samples were. Low means the user drew five
   * different things, and the surface should say so rather than accept it.
   */
  consistency: number;
}

export interface CommandMatch {
  match: boolean;
  /** 0–1, 1 = dead centre of the learned band. */
  score: number;
  /** Which feature pushed it outside the band, when it failed. */
  failedOn?: Feature;
}

/** The sharpest corner, which is the one the mark is built around. */
function dominantCorner(fp: Fingerprint) {
  const corners = fp.cornerData;
  if (!corners || corners.length === 0) return null;
  return corners.reduce((best, c) => (c.angle > best.angle ? c : best), corners[0]);
}

export function commandMarkFeatures(fp: Fingerprint): Record<Feature, number> {
  const w = Math.max(1, fp.bounds.maxX - fp.bounds.minX);
  const h = Math.max(1, fp.bounds.maxY - fp.bounds.minY);
  const size = Math.max(1, fp.size);
  const corner = dominantCorner(fp);

  // The corner's position along the path splits the stroke into two arms. The
  // path is resampled to uniform arc length, so this is a length ratio.
  const t = corner ? corner.t : 0.5;
  const armRatio = Math.min(t, 1 - t) / Math.max(t, 1 - t, 1e-6);

  return {
    straightness: fp.straightness,
    corners: fp.corners,
    // Orientation-free proportion: a tall mark and a wide one read alike.
    aspect: Math.min(w, h) / Math.max(w, h),
    closureRatio: Math.min(1, fp.closureDistance / size),
    armRatio: corner ? armRatio : 1,
    turnSharpness: corner ? corner.angle / Math.PI : 0,
    vertexDepth: corner ? (corner.y - fp.bounds.minY) / h : 0.5,
    endRise: (fp.start.y - fp.end.y) / h,
  };
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

/**
 * Turn repeated drawings of a mark into a signature.
 *
 * Throws on fewer than two samples — a single sample gives no spread, and a
 * band invented for it would be a guess dressed as a measurement.
 */
export function learnCommandMark(samples: Point[][], name = 'command'): CommandMark {
  if (samples.length < 2) throw new Error('a command mark needs at least 2 samples');
  const fps = samples.map((s) => getFingerprint(s));
  const perFeature = fps.map(commandMarkFeatures);

  const features = {} as Record<Feature, number>;
  const tolerance = {} as Record<Feature, number>;
  const spreadRatios: number[] = [];

  for (const f of FEATURES) {
    const values = perFeature.map((p) => p[f]);
    features[f] = mean(values);
    const sd = stddev(values);
    tolerance[f] = Math.max(sd * SPREAD_MULTIPLIER, TOLERANCE_FLOOR[f]);
    // How much of the accept band the user's own variation already used up.
    spreadRatios.push(Math.min(1, (sd * SPREAD_MULTIPLIER) / tolerance[f]));
  }

  const closedCount = fps.filter((f) => f.isClosed).length;

  return {
    name,
    features,
    tolerance,
    isClosed: closedCount > samples.length / 2,
    sampleCount: samples.length,
    consistency: 1 - mean(spreadRatios),
  };
}

/**
 * Does this stroke's fingerprint fall inside the learned band?
 *
 * Every feature must be inside — one outlier rejects. Rejection matters more
 * than recognition here: a command mark that also fires while you are drawing
 * reads as broken, not as eager.
 */
export function matchesCommandMark(fp: Fingerprint, mark: CommandMark): CommandMatch {
  if (fp.isClosed !== mark.isClosed) {
    return { match: false, score: 0, failedOn: 'closureRatio' };
  }
  const f = commandMarkFeatures(fp);
  let worst = 0;
  let worstFeature: Feature = FEATURES[0];
  for (const key of FEATURES) {
    const normalized = Math.abs(f[key] - mark.features[key]) / mark.tolerance[key];
    if (normalized > worst) {
      worst = normalized;
      worstFeature = key;
    }
  }
  if (worst > 1) return { match: false, score: 0, failedOn: worstFeature };
  return { match: true, score: 1 - worst };
}

/**
 * Would this signature also fire on marks the user already draws? A command mark
 * that collides with their vocabulary is worse than no command mark, so the
 * teach flow refuses one rather than shipping an interface that erupts mid-draw.
 */
export function collidesWith(mark: CommandMark, existing: Fingerprint[]): boolean {
  return existing.some((fp) => matchesCommandMark(fp, mark).match);
}

// ===== The built-in mark =====

/**
 * Canonical checks: the same gesture at different proportions and slants, the
 * way five deliberate attempts by one person would vary. These ARE the teaching
 * samples — the built-in mark goes through `learnCommandMark` like any other.
 */
export function canonicalCheckSamples(): Point[][] {
  const check = (w: number, h: number, dip: number, rise: number, slant = 0) => {
    const start = { x: 0, y: 0 };
    const vertex = { x: w * dip, y: h };
    const end = { x: w, y: -h * rise + w * slant };
    const seg = (a: Point, b: Point, n: number) =>
      Array.from({ length: n }, (_, i) => ({
        x: a.x + (b.x - a.x) * (i / (n - 1)),
        y: a.y + (b.y - a.y) * (i / (n - 1)),
      }));
    return seg(start, vertex, 34).concat(seg(vertex, end, 44).slice(1));
  };
  return [
    check(70, 35, 0.36, 0.45),
    check(64, 40, 0.33, 0.52),
    check(78, 32, 0.38, 0.40),
    check(60, 36, 0.34, 0.58, 0.06),
    check(74, 38, 0.35, 0.47, -0.05),
    // A hand often draws the tail long — a short dip, then a long flick. The
    // first five put the arms near 1:1.6; these reach 1:2.5, which a real
    // check at 1:3 was refused for ("its two halves are the wrong lengths").
    check(88, 30, 0.24, 0.55),
    check(96, 28, 0.21, 0.50, 0.03),
  ];
}

/**
 * The mark the canvas watches for until the user teaches it another one.
 * Not a special case: a signature, pre-taught.
 */
export const BUILTIN_COMMAND_MARK: CommandMark = learnCommandMark(
  canonicalCheckSamples(),
  'check'
);

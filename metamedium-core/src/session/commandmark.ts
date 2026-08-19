// The command mark: a gesture the user TEACHES the system.
//
// The engine already learns user vocabulary — draw a shape, name it, and a
// fingerprint plus weighted comparison recognizes it forever. A gesture is that
// same object on a different plane. So the command mark is learned exactly the
// way "bubble" is learned: draw it a few times, and the samples become a
// signature.
//
// This is the thesis pointed at its own interface. It is also the onboarding:
// teaching the system your mark IS the tutorial.
//
// Size is deliberately NOT a feature. The mark must work at any scale and any
// zoom level, and every feature here is a ratio or a count for that reason.

import type { Fingerprint, Point } from '../types';
import { getFingerprint } from '../geometry';

/** How many samples the teach flow collects. Enough for a spread, few enough to draw. */
export const COMMAND_MARK_SAMPLES = 5;

/** Scale-free features. Add one here and both learn and match pick it up. */
const FEATURES = ['straightness', 'corners', 'aspect', 'closureRatio', 'consistency'] as const;
type Feature = (typeof FEATURES)[number];

/**
 * Minimum tolerance per feature, in that feature's own units. A user with a very
 * consistent hand would otherwise learn a band so tight that their sixth attempt
 * fails — a signature must be at least as loose as ordinary hand variation.
 */
const TOLERANCE_FLOOR: Record<Feature, number> = {
  straightness: 0.12,
  corners: 0.9,
  aspect: 0.25,
  closureRatio: 0.18,
  consistency: 0.3,
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

function featuresOf(fp: Fingerprint): Record<Feature, number> {
  const w = Math.max(1, fp.bounds.maxX - fp.bounds.minX);
  const h = Math.max(1, fp.bounds.maxY - fp.bounds.minY);
  const size = Math.max(1, fp.size);
  return {
    straightness: fp.straightness,
    corners: fp.corners,
    // Orientation-free: a tall mark and a wide mark of the same proportion read alike.
    aspect: Math.min(w, h) / Math.max(w, h),
    closureRatio: Math.min(1, fp.closureDistance / size),
    consistency: fp.angleAnalysis?.consistency ?? 0,
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
  const perFeature = fps.map(featuresOf);

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
  const f = featuresOf(fp);
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

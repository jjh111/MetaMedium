// Heuristic shape recognition (Tier 0).
// Ported from Web App Skeleton/src/core/recognition.ts — same thresholds,
// console noise removed, grounded `reasoning` added to every result.
// Multi-parse: every qualifying detector contributes a candidate; nothing wins
// by silencing the others (ARCHITECTURE-v6 principle 2).

import type { Point, Fingerprint, RecognitionResult, StrokeAnalysis } from './types';
import { getFingerprint, checkOvershoot } from './geometry';

function detectLine(fp: Fingerprint, points: Point[], scale = 1): RecognitionResult | null {
  const hasOvershoot = checkOvershoot(points, 50 * scale);
  const isStraight = fp.straightness > 0.65;
  const notClosed = !fp.isClosed && !hasOvershoot;
  const fewCorners = fp.corners <= 2;

  if (isStraight && notClosed && fewCorners) {
    return {
      type: 'line',
      label: 'Line',
      score: 90,
      confidence: 0.9,
      reasoning: `straightness ${fp.straightness.toFixed(2)} > 0.65, open, ${fp.corners} corner(s)`,
    };
  }
  return null;
}

function detectArc(fp: Fingerprint, points: Point[], scale = 1): RecognitionResult | null {
  const hasOvershoot = checkOvershoot(points, 50 * scale);
  const notClosed = !fp.isClosed && !hasOvershoot;
  const fewCorners = fp.corners <= 1;
  const isCurved = fp.straightness < 0.6;

  if (notClosed && fewCorners && isCurved) {
    return {
      type: 'arc',
      label: 'Arc',
      score: 70,
      confidence: 0.7,
      reasoning: `open, curved (straightness ${fp.straightness.toFixed(2)} < 0.6), smooth`,
    };
  }
  return null;
}

function detectTriangle(fp: Fingerprint): RecognitionResult | null {
  const isClosed = fp.isClosed;
  const hasThreeCorners = fp.corners >= 2 && fp.corners <= 3;
  const reasonableShape = fp.aspectRatio >= 0.3 && fp.aspectRatio <= 3.0;

  if (isClosed && hasThreeCorners && reasonableShape) {
    return {
      type: 'triangle',
      label: 'Triangle',
      score: 85,
      confidence: 0.85,
      reasoning: `closed with ${fp.corners} corner(s) in the triangle range (2–3)`,
    };
  }
  return null;
}

function detectRectangle(fp: Fingerprint): RecognitionResult | null {
  const isClosed = fp.isClosed;
  const hasFourCorners = fp.corners >= 3 && fp.corners <= 4;
  const aspectRatioOk = fp.aspectRatio > 0.3 && fp.aspectRatio < 3.0;

  if (isClosed && hasFourCorners && aspectRatioOk) {
    return {
      type: 'rectangle',
      label: 'Rectangle',
      score: 80,
      confidence: 0.8,
      reasoning: `closed with ${fp.corners} corner(s) in the rectangle range (3–4)`,
    };
  }
  return null;
}

function detectCircle(fp: Fingerprint, points: Point[], scale = 1): RecognitionResult | null {
  const hasOvershoot = checkOvershoot(points, 50 * scale);
  const isClosed = fp.isClosed || hasOvershoot;
  const fewCorners = fp.corners <= 1;
  const notStraight = fp.straightness < 0.5;
  const reasonableRatio = fp.aspectRatio >= 0.3 && fp.aspectRatio <= 3.0;

  if (isClosed && fewCorners && notStraight && reasonableRatio) {
    return {
      type: 'circle',
      label: 'Circle',
      score: 80,
      confidence: 0.8,
      reasoning: `closed${hasOvershoot ? ' (overshoot)' : ''}, curved, smooth, aspect ${fp.aspectRatio.toFixed(2)}`,
    };
  }
  return null;
}

export function analyzeStroke(points: Point[], scale = 1): StrokeAnalysis {
  const fingerprint = getFingerprint(points, scale);

  const results = [
    detectLine(fingerprint, points, scale),
    detectArc(fingerprint, points, scale),
    detectTriangle(fingerprint),
    detectRectangle(fingerprint),
    detectCircle(fingerprint, points, scale),
  ].filter((r): r is RecognitionResult => r !== null);

  results.sort((a, b) => b.score - a.score);

  return { fingerprint, results };
}

// ===== LIBRARY MATCHING =====

export function matchPrimitiveFromLibrary(
  fingerprint: Fingerprint,
  libraryFingerprint: Fingerprint
): number {
  let totalScore = 0;
  let weights = 0;

  // Straightness similarity (weight: 0.3), with veto
  const straightnessDiff = Math.abs(
    fingerprint.straightness - libraryFingerprint.straightness
  );
  if (straightnessDiff > 0.5) return 0;

  const straightnessScore = Math.max(0, 1 - straightnessDiff);
  totalScore += straightnessScore * 0.3;
  weights += 0.3;

  // Aspect ratio similarity (weight: 0.25)
  const aspectRatio1 = Math.min(fingerprint.aspectRatio, 1 / fingerprint.aspectRatio);
  const aspectRatio2 = Math.min(
    libraryFingerprint.aspectRatio,
    1 / libraryFingerprint.aspectRatio
  );
  const aspectDiff = Math.abs(aspectRatio1 - aspectRatio2);
  const aspectScore = Math.max(0, 1 - aspectDiff * 2);
  totalScore += aspectScore * 0.25;
  weights += 0.25;

  // Corner count similarity (weight: 0.2)
  const cornerDiff = Math.abs(fingerprint.corners - libraryFingerprint.corners);
  const cornerScore = Math.max(0, 1 - cornerDiff / 4);
  totalScore += cornerScore * 0.2;
  weights += 0.2;

  // Closure similarity (weight: 0.15)
  const closureMatch =
    fingerprint.isClosed === libraryFingerprint.isClosed ? 1.0 : 0.0;
  totalScore += closureMatch * 0.15;
  weights += 0.15;

  // Size similarity (weight: 0.1)
  const sizeDiff =
    Math.abs(fingerprint.size - libraryFingerprint.size) /
    Math.max(fingerprint.size, libraryFingerprint.size);
  const sizeScore = Math.max(0, 1 - sizeDiff);
  totalScore += sizeScore * 0.1;
  weights += 0.1;

  return totalScore / weights;
}

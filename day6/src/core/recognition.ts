// MetaMedium Day 6 - Shape Recognition System
// Migrated from day5a.html with exact threshold matching
// Simple boolean checks - no complex scoring

import type { Point, Fingerprint, RecognitionResult, StrokeAnalysis } from '../types';
import { getFingerprint, checkOvershoot } from '../utils/geometry';

// ===== SHAPE DETECTION - DAY5A EXACT LOGIC =====

function detectLine(fp: Fingerprint, points: Point[]): RecognitionResult | null {
  const hasOvershoot = checkOvershoot(points);

  const checks = {
    isStraight: fp.straightness > 0.65,
    notClosed: !fp.isClosed && !hasOvershoot,
    fewCorners: fp.corners <= 2
  };

  if (checks.isStraight && checks.notClosed && checks.fewCorners) {
    return {
      type: 'line',
      label: 'Line',
      score: 90,
      confidence: 0.9,
    };
  }
  return null;
}

function detectArc(fp: Fingerprint, points: Point[]): RecognitionResult | null {
  const hasOvershoot = checkOvershoot(points);

  const checks = {
    notClosed: !fp.isClosed && !hasOvershoot,
    fewCorners: fp.corners <= 1,
    isCurved: fp.straightness < 0.6
  };

  if (checks.notClosed && checks.fewCorners && checks.isCurved) {
    return {
      type: 'arc',
      label: 'Arc',
      score: 70,
      confidence: 0.7,
    };
  }
  return null;
}

function detectTriangle(fp: Fingerprint): RecognitionResult | null {
  const checks = {
    isClosed: fp.isClosed,
    hasThreeCorners: fp.corners >= 2 && fp.corners <= 3,
    reasonableShape: fp.aspectRatio >= 0.3 && fp.aspectRatio <= 3.0
  };

  if (checks.isClosed && checks.hasThreeCorners && checks.reasonableShape) {
    return {
      type: 'triangle',
      label: 'Triangle',
      score: 85,
      confidence: 0.85,
    };
  }
  return null;
}

function detectRectangle(fp: Fingerprint): RecognitionResult | null {
  const checks = {
    isClosed: fp.isClosed,
    hasFourCorners: fp.corners >= 3 && fp.corners <= 4,
    aspectRatioOk: fp.aspectRatio > 0.3 && fp.aspectRatio < 3.0
  };

  if (checks.isClosed && checks.hasFourCorners && checks.aspectRatioOk) {
    return {
      type: 'rectangle',
      label: 'Rectangle',
      score: 80,
      confidence: 0.8,
    };
  }
  return null;
}

function detectCircle(fp: Fingerprint, points: Point[]): RecognitionResult | null {
  const hasOvershoot = checkOvershoot(points);

  const checks = {
    isClosed: fp.isClosed || hasOvershoot,
    fewCorners: fp.corners <= 1,
    notStraight: fp.straightness < 0.5,
    reasonableRatio: fp.aspectRatio >= 0.3 && fp.aspectRatio <= 3.0
  };

  if (checks.isClosed && checks.fewCorners && checks.notStraight && checks.reasonableRatio) {
    return {
      type: 'circle',
      label: 'Circle',
      score: 80,
      confidence: 0.8,
    };
  }
  return null;
}

// ===== MAIN ANALYSIS FUNCTION =====

export function analyzeStroke(points: Point[]): StrokeAnalysis {
  const fingerprint = getFingerprint(points);

  console.log('[Recognition] Fingerprint:', {
    points: points.length,
    corners: fingerprint.corners,
    straightness: fingerprint.straightness.toFixed(3),
    isClosed: fingerprint.isClosed,
    aspectRatio: fingerprint.aspectRatio.toFixed(2),
    angleAnalysis: fingerprint.angleAnalysis
  });

  const results: RecognitionResult[] = [];

  // Test shapes - each returns null if disqualified or score of 0
  const line = detectLine(fingerprint, points);
  if (line) {
    console.log('[Recognition] Line scored:', line.score);
    results.push(line);
  }

  const arc = detectArc(fingerprint, points);
  if (arc) {
    console.log('[Recognition] Arc scored:', arc.score);
    results.push(arc);
  }

  const triangle = detectTriangle(fingerprint);
  if (triangle) {
    console.log('[Recognition] Triangle scored:', triangle.score);
    results.push(triangle);
  }

  const rectangle = detectRectangle(fingerprint);
  if (rectangle) {
    console.log('[Recognition] Rectangle scored:', rectangle.score);
    results.push(rectangle);
  }

  const circle = detectCircle(fingerprint, points);
  if (circle) {
    console.log('[Recognition] Circle scored:', circle.score);
    results.push(circle);
  }

  // Sort by score (highest first)
  results.sort((a, b) => b.score - a.score);

  console.log('[Recognition] Winner:', results[0]?.type, results[0]?.score);

  return {
    fingerprint,
    results,
  };
}

// ===== LIBRARY MATCHING =====

export function matchPrimitiveFromLibrary(
  fingerprint: Fingerprint,
  libraryFingerprint: Fingerprint
): number {
  // Geometric similarity score 0-1
  let totalScore = 0;
  let weights = 0;

  // Straightness similarity (weight: 0.3)
  const straightnessDiff = Math.abs(
    fingerprint.straightness - libraryFingerprint.straightness
  );

  // DAY 5 FIX: Veto if straightness too different
  if (straightnessDiff > 0.5) return 0;

  const straightnessScore = Math.max(0, 1 - straightnessDiff);
  totalScore += straightnessScore * 0.3;
  weights += 0.3;

  // Aspect ratio similarity (weight: 0.25)
  const aspectRatio1 = Math.min(
    fingerprint.aspectRatio,
    1 / fingerprint.aspectRatio
  );
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

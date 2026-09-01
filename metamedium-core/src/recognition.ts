// Heuristic shape recognition (Tier 0).
// Ported from Web App Skeleton/src/core/recognition.ts — same thresholds,
// console noise removed, grounded `reasoning` added to every result.
// Multi-parse: every qualifying detector contributes a candidate; nothing wins
// by silencing the others (ARCHITECTURE-v6 principle 2).

import type { Point, Fingerprint, RecognitionResult, StrokeAnalysis } from './types';
import { getFingerprint, checkOvershoot, calculateStraightness, resampleByArcLength } from './geometry';

// ===== Evidence =====
//
// Every detector below scores CONTINUOUSLY from measurements, and the results
// are ranked by that score. The previous version gave each detector a fixed
// confidence (triangle 0.85, rectangle 0.80) and let their corner-count bands
// overlap, so a shape with three detected corners matched both and the triangle
// won — not because it looked like one, but because 85 > 80. A tie between two
// readings has to be broken by evidence, or the ranking means nothing.

/** 1 when `value` sits on `ideal`, falling to 0 at `tolerance` away. */
function fit(value: number, ideal: number, tolerance: number): number {
  return Math.max(0, 1 - Math.abs(value - ideal) / tolerance);
}

/** 0 below `lo`, 1 above `hi`, linear between. */
function ramp(value: number, lo: number, hi: number): number {
  return Math.max(0, Math.min(1, (value - lo) / (hi - lo)));
}

const DEG = Math.PI / 180;

/** Mean turn angle at the detected corners, in radians. */
function meanTurn(fp: Fingerprint): number {
  const a = fp.cornerAngles;
  if (!a || a.length === 0) return 0;
  return a.reduce((x, y) => x + y, 0) / a.length;
}

/**
 * Below this a reading is not worth offering. Deliberately low: multi-parse
 * means several candidates coexist and the human decides (ARCHITECTURE-v6
 * principle 2), so this only filters out noise, it does not pick a winner.
 */
export const MIN_CONFIDENCE = 0.35;

/**
 * The ceiling on a Tier 0 reading. A perfect template fit is still only
 * evidence, and heuristics that report certainty are lying about what they
 * know — a flawless circle is exactly what a hand-drawn letter O looks like.
 * The cap also leaves headroom above the engine, so a participant with more
 * context can outrank it without having to claim 0.99.
 */
export const MAX_TIER0_CONFIDENCE = 0.92;

function result(
  type: string,
  label: string,
  fitScore: number,
  reasoning: string,
  meta?: Record<string, unknown>
): RecognitionResult | null {
  const confidence = fitScore * MAX_TIER0_CONFIDENCE;
  if (confidence < MIN_CONFIDENCE) return null;
  return { type, label, score: Math.round(confidence * 100), confidence, reasoning, ...(meta ? { meta } : {}) };
}

/**
 * Below this many SCREEN pixels a mark has no measurable geometry. Corners,
 * extent and straightness on a 5px blob are sensor noise dressed as evidence,
 * so nothing but `dot` is offered for it — reporting "circle 0.85" there would
 * be a lie about what the engine can see.
 */
export const HAND_RESOLUTION_PX = 8;

function detectLine(fp: Fingerprint, points: Point[], scale = 1): RecognitionResult | null {
  if (fp.isClosed || checkOvershoot(points, 50 * scale)) return null;

  const straight = ramp(fp.straightness, 0.55, 0.95);
  const corners = fit(fp.corners, 0, 3);
  const confidence = straight * 0.7 + corners * 0.3;

  return result(
    'line',
    'Line',
    confidence,
    `open, straightness ${fp.straightness.toFixed(2)}, ${fp.corners} corner(s)`
  );
}

function detectArc(fp: Fingerprint, points: Point[], scale = 1): RecognitionResult | null {
  if (fp.isClosed || checkOvershoot(points, 50 * scale)) return null;

  const curved = 1 - ramp(fp.straightness, 0.25, 0.8);
  const smooth = fit(fp.corners, 0, 2.5);
  const confidence = curved * 0.6 + smooth * 0.4;

  return result(
    'arc',
    'Arc',
    confidence,
    `open, curved (straightness ${fp.straightness.toFixed(2)}), ${fp.corners} corner(s)`
  );
}

function detectTriangle(fp: Fingerprint): RecognitionResult | null {
  if (!fp.isClosed) return null;
  if (fp.aspectRatio < 0.14 || fp.aspectRatio > 7) return null;

  // A triangle fills about half its bounding box. That holds however the
  // corners were counted, which is exactly why it carries the most weight.
  const area = fit(fp.extent, 0.5, 0.3);
  const corners = fit(fp.corners, 3, 2);
  // Interior angles average 60 degrees, so the path TURNS about 120 at each.
  const turn = fp.cornerAngles?.length ? fit(meanTurn(fp), 120 * DEG, 70 * DEG) : 0.5;
  const confidence = area * 0.5 + corners * 0.35 + turn * 0.15;

  return result(
    'triangle',
    'Triangle',
    confidence,
    `closed, ${fp.corners} corner(s), fills ${(fp.extent * 100).toFixed(0)}% of its box (a triangle fills ~50%)`
  );
}

function detectRectangle(fp: Fingerprint): RecognitionResult | null {
  if (!fp.isClosed) return null;
  // Deliberately generous. The aspect guard is only here to keep a LINE from
  // reading as a rectangle, and closure plus extent already do that far better:
  // a line is open and encloses nothing. A tight 5:1 limit meanwhile rejected
  // the single most common shape in any interface — a header bar — which then
  // reached the layout parser as unrecognised 'art'.
  if (fp.aspectRatio < 0.05 || fp.aspectRatio > 20) return null;

  // A rectangle fills its bounding box almost completely — the one measurement
  // that a missed corner cannot take away.
  const area = fit(fp.extent, 1, 0.45);
  const corners = fit(fp.corners, 4, 2.5);
  const turn = fp.cornerAngles?.length ? fit(meanTurn(fp), 90 * DEG, 55 * DEG) : 0.5;
  const confidence = area * 0.45 + corners * 0.35 + turn * 0.2;

  return result(
    'rectangle',
    'Rectangle',
    confidence,
    `closed, ${fp.corners} corner(s) near ${Math.round(meanTurn(fp) / DEG)}°, ` +
      `fills ${(fp.extent * 100).toFixed(0)}% of its box (a rectangle fills ~100%)`
  );
}

function detectCircle(fp: Fingerprint, points: Point[], scale = 1): RecognitionResult | null {
  const hasOvershoot = checkOvershoot(points, 50 * scale);
  if (!fp.isClosed && !hasOvershoot) return null;
  if (fp.aspectRatio < 0.3 || fp.aspectRatio > 3.3) return null;

  const smooth = fit(fp.corners, 0, 3);
  // pi/4: a circle covers 78.5% of the square that bounds it.
  const area = fit(fp.extent, Math.PI / 4, 0.28);
  const curved = 1 - ramp(fp.straightness, 0.2, 0.6);
  const confidence = smooth * 0.45 + area * 0.4 + curved * 0.15;

  return result(
    'circle',
    'Circle',
    confidence,
    `closed${hasOvershoot ? ' (overshoot)' : ''}, ${fp.corners} corner(s), ` +
      `fills ${(fp.extent * 100).toFixed(0)}% of its box (a circle fills ~79%), aspect ${fp.aspectRatio.toFixed(2)}`
  );
}

// ===== The rest of the shape rung: dot, text, arrow (KEYFRAMES.md Stage 1) =====

function detectDot(fp: Fingerprint, scale: number): RecognitionResult | null {
  // Judged at the hand's scale, not the world's: a dot is a dot at any zoom.
  const screen = fp.size / scale;
  const tiny = 1 - ramp(screen, 6, 18);
  return result('dot', 'Dot', tiny, `${Math.round(screen)}px on screen — a point, not a shape`);
}

/**
 * Writing, without reading it.
 *
 * A word is an open stroke that turns many times while staying low and wide
 * and leaving most of its box empty. That is enough to give a mark the `label`
 * role; what the word SAYS is a different capability (handwriting, v7 Stage E)
 * and deliberately not a prerequisite for this one.
 */
function detectText(fp: Fingerprint, points: Point[], scale = 1): RecognitionResult | null {
  if (fp.isClosed || checkOvershoot(points, 50 * scale)) return null;
  const wiggle = ramp(fp.corners, 2, 6);
  const sparse = 1 - ramp(fp.extent, 0.3, 0.7);
  const curvy = 1 - ramp(fp.straightness, 0.25, 0.65);
  const wide = ramp(fp.aspectRatio, 0.6, 2.0);
  if (fp.corners < 3) return null; // one bend is a check or a caret, not a word
  const confidence = wiggle * 0.4 + sparse * 0.25 + curvy * 0.2 + wide * 0.15;
  return result(
    'text',
    'Text',
    confidence,
    `open, turns ${fp.corners} times, fills ${(fp.extent * 100).toFixed(0)}% of a ${fp.aspectRatio.toFixed(1)}:1 box — writing, not a shape`
  );
}

/**
 * A line with a barb: mostly straight, then a sharp turn back near one end.
 *
 * The one shape the diagram rung cannot do without — an edge with no arrow has
 * no direction, and a flow is then just a graph. Detected from the corner
 * positions along the path: a corner that turns hard inside the last (or
 * first) fifth of the stroke, with a straight shaft before it.
 */
function detectArrow(fp: Fingerprint, points: Point[], scale = 1): RecognitionResult | null {
  if (fp.isClosed || checkOvershoot(points, 50 * scale)) return null;
  const corners = fp.cornerData ?? [];
  if (corners.length === 0 || corners.length > 4) return null;

  // The head lives inside this fraction of the path. Generous, because a
  // two-wing head — out one wing, back to the tip, out the other — is three
  // corners and legitimately a third of the stroke; a tighter window read every
  // one of those as a bent line. What keeps a bent line out is the rule below:
  // a corner in the MIDDLE of the stroke is not a head at either end.
  const HEAD = 0.42;
  const atEnd = corners.filter((c) => c.t >= 1 - HEAD);
  const atStart = corners.filter((c) => c.t <= HEAD);
  if (corners.some((c) => c.t > HEAD && c.t < 1 - HEAD)) return null;
  // Both ends bent means a double-headed arrow or a zigzag; either way, not this.
  if (atEnd.length > 0 && atStart.length > 0) return null;

  const path = resampleByArcLength(points, 100);
  const tryHead = (head: 'end' | 'start', cs: typeof corners) => {
    if (cs.length === 0) return null;
    const first = cs.reduce((a, c) => (head === 'end' ? Math.min(a, c.t) : Math.max(a, c.t)), head === 'end' ? 1 : 0);
    const shaft = head === 'end' ? path.slice(0, Math.max(3, Math.round(first * 100))) : path.slice(Math.min(97, Math.round(first * 100)));
    const straight = calculateStraightness(shaft);
    const sharpest = Math.max(...cs.map((c) => c.angle));
    const shaftOk = ramp(straight, 0.72, 0.95);
    const barbOk = ramp(sharpest, (55 * Math.PI) / 180, (110 * Math.PI) / 180);
    // The head is short next to the shaft: a long tail after the corner is a
    // bent line, not a barb. One wing is ~15% of the path, two wings ~35%.
    const headLen = head === 'end' ? 1 - first : first;
    const shortHead = 1 - ramp(headLen, 0.3, 0.45);
    const tipIdx = Math.round(first * 99);
    return {
      fit: shaftOk * 0.5 + barbOk * 0.35 + shortHead * 0.15,
      head,
      tip: path[tipIdx],
      tail: head === 'end' ? path[0] : path[99],
      straight,
      sharpest,
    };
  };
  const best = [tryHead('end', atEnd), tryHead('start', atStart)]
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => b.fit - a.fit)[0];
  if (!best) return null;

  return result(
    'arrow',
    'Arrow',
    best.fit,
    `a straight shaft (${best.straight.toFixed(2)}) with a ${Math.round((best.sharpest * 180) / Math.PI)}° barb at the ${best.head}`,
    { head: best.head, tip: best.tip, tail: best.tail }
  );
}

export function analyzeStroke(points: Point[], scale = 1): StrokeAnalysis {
  const fingerprint = getFingerprint(points, scale);

  // Below the hand's resolution there is no geometry to read — only a dot.
  if (fingerprint.size / scale < HAND_RESOLUTION_PX) {
    const dot = detectDot(fingerprint, scale);
    return { fingerprint, results: dot ? [dot] : [] };
  }

  const results = [
    detectLine(fingerprint, points, scale),
    detectArc(fingerprint, points, scale),
    detectTriangle(fingerprint),
    detectRectangle(fingerprint),
    detectCircle(fingerprint, points, scale),
    detectDot(fingerprint, scale),
    detectText(fingerprint, points, scale),
    detectArrow(fingerprint, points, scale),
  ].filter((r): r is RecognitionResult => r !== null);

  // Ranked by measured confidence — no detector outranks another by fiat.
  results.sort((a, b) => b.confidence - a.confidence);

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

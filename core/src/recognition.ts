// Heuristic shape recognition (Tier 0).
// Ported from Web App Skeleton/src/core/recognition.ts — same thresholds,
// console noise removed, grounded `reasoning` added to every result.
// Multi-parse: every qualifying detector contributes a candidate; nothing wins
// by silencing the others (ARCHITECTURE-v6 principle 2).

import type { Point, Fingerprint, RecognitionResult, StrokeAnalysis } from './types';
import type { Bow } from './geometry';
import { getFingerprint, checkOvershoot, calculateStraightness, resampleByArcLength, bowOf, inkTipIndex } from './geometry';

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

// ===== An even bow: what tells an arc from a line (S1) =====
//
// Straightness — chord over path — is nearly blind to a bow: a 90° arc still
// scores 0.90 and a 30° one 0.99, so every arc under a half circle read as a
// line (a 140° arc was line 0.63). The bulge is not blind to it
// (`bowOf`, geometry.ts). A stroke bows EVENLY, like an arc, when four things
// hold, each measured and each scale-free or about the hand:

/** It sweeps like an arc: nothing below the first, full from the second, degrees. A hand's straight line bows like an arc of up to 21° (the corpus's lines, measured). */
export const ARC_SWEEP = [15, 30] as const;
/**
 * The bulge is SHOWN, in the hand's space: a straight line bows up to about
 * the first on screen (the corpus's shakiest hand bows its lines 11 px, on
 * the denoised path), so a bulge counts from there and fully past the second.
 */
export const ARC_BULGE_PX = [10, 18] as const;
/** It is spread along the stroke: each half bows off its own chord about a quarter as much as the whole (an arc's do); a bend's straight arms under a tenth (measured: 0.09 at most). */
export const ARC_EVEN = [0.07, 0.12] as const;
/** It follows a circle: the path's RMS distance from the circle through its ends and bulge, as a share of the bulge (a hand's arc under 0.3; a hook, a J or an S well past 0.5). */
export const ARC_RESIDUAL = [0.3, 0.5] as const;

/** How surely an open stroke bows evenly, like an arc — 0 to 1 — and the bow it measured. A stroke that turns corners is not bowing (that is writing, or a bend). */
function evenBowOf(fp: Fingerprint, points: Point[], scale: number): { evidence: number; bow: Bow | null } {
  if (fp.isClosed) return { evidence: 0, bow: null };
  const bow = bowOf(points);
  if (!bow) return { evidence: 0, bow };
  const evidence =
    ramp(bow.sweep, ARC_SWEEP[0], ARC_SWEEP[1]) *
    ramp(bow.sagitta / scale, ARC_BULGE_PX[0], ARC_BULGE_PX[1]) *
    ramp(bow.even, ARC_EVEN[0], ARC_EVEN[1]) *
    (1 - ramp(bow.residual, ARC_RESIDUAL[0], ARC_RESIDUAL[1])) *
    fit(fp.corners, 0, 2.5);
  return { evidence, bow };
}

function detectLine(fp: Fingerprint, points: Point[], scale = 1, even = evenBowOf(fp, points, scale), head: HeadRead | null = null): RecognitionResult | null {
  if (fp.isClosed || checkOvershoot(points, 50 * scale)) return null;

  const straight = ramp(fp.straightness, 0.55, 0.95);
  const corners = fit(fp.corners, 0, 3);
  // A line gives way exactly as far as an even bow is shown to be meant, and
  // as far as a head that draws back on its shaft is, where only the hand-scale
  // read found it (S2: a long arrow's head turns no corner, so nothing else
  // took the line's confidence from it; an arrow the corners read keeps its
  // line beside it, as it always did).
  const seen = head?.by === 'seen' ? head : null;
  const confidence = (straight * 0.7 + corners * 0.3) * (1 - even.evidence) * (1 - (seen?.fit ?? 0));
  const bows = even.bow && even.evidence >= 0.05 ? `, but it bows evenly like an arc of ${Math.round(even.bow.sweep)}°` : '';
  const headed = seen && seen.fit >= 0.05 ? `, but its ${seen.head} draws back like an arrow's head` : '';

  return result(
    'line',
    'Line',
    confidence,
    `open, straightness ${fp.straightness.toFixed(2)}, ${fp.corners} corner(s)${bows}${headed}`
  );
}

function detectArc(fp: Fingerprint, points: Point[], scale = 1, even = evenBowOf(fp, points, scale)): RecognitionResult | null {
  if (fp.isClosed || checkOvershoot(points, 50 * scale)) return null;

  // Curved enough that straightness alone says so — past about a half
  // circle — or bowing evenly, which says so from 30°.
  const bent = 1 - ramp(fp.straightness, 0.25, 0.8);
  const curved = Math.max(bent, even.evidence);
  const smooth = fit(fp.corners, 0, 2.5);
  const confidence = curved * 0.6 + smooth * 0.4;
  const b = even.bow;
  const how = b && even.evidence > 0
    ? `bows evenly like an arc of ${Math.round(b.sweep)}° (its bulge ${Math.round(b.sagitta / scale)}px on screen, each half bowing ${b.even.toFixed(2)} of it)`
    : `curved (straightness ${fp.straightness.toFixed(2)})`;

  return result('arc', 'Arc', confidence, `open, ${how}, ${fp.corners} corner(s)`);
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
 * first) fifth of the stroke, with a straight shaft before it — and, on a
 * stroke long enough that the head is a sliver of it, the head at the hand's
 * own scale (`readHead`).
 */
function detectArrow(fp: Fingerprint, points: Point[], scale = 1, best: HeadRead | null = readHead(fp, points, scale)): RecognitionResult | null {
  if (!best) return null;

  // Where the ink points, not where the head's first corner turned: a two-wing
  // barb comes back to the tip between its wings, and the corner the rung
  // measured can sit a wing's length short of it (V1-PLAN S2). The tip is the
  // stroke's own point the pen first reached farthest along the shaft, and
  // the tail is the stroke's own end at the other side.
  const end = best.head === 'end' ? points[0] : points[points.length - 1];
  const at = points[inkTipIndex(points, best.head, end, best.tip, HAND_RESOLUTION_PX * scale)];
  const tail = { x: end.x, y: end.y }, tip = { x: at.x, y: at.y };

  return result(
    'arrow',
    'Arrow',
    best.fit,
    `a straight shaft (${best.straight.toFixed(2)}) with a ${Math.round((best.sharpest * 180) / Math.PI)}° barb at the ${best.head}, ` +
      `the barb ${best.barb.ratio.toFixed(2)} of the shaft`,
    { head: best.head, tip, tail, barb: best.barb.reach }
  );
}

/**
 * A head read on a stroke, and by which reading: the rung's corners, or the
 * head at the hand's own scale.
 */
type HeadRead = HeadSeen & { by: 'corners' | 'seen' };

/**
 * The corners' reading of a head stands wherever it can see the head: it takes
 * at least this share of the path (one wing of a hand's head is about a sixth,
 * two a third; the corner detector's own floor is a sixteenth). Below it the
 * head is a sliver of a long stroke, and the surer of the two readings stands
 * (S2: `headSeenOf`). An arrow the corners read well keeps their reading, to
 * the digit, as every held log was read.
 */
export const HEAD_SHARE_SEEN = 0.1;

/**
 * Which way a stroke's head is read: the corners' where they see it, else the
 * surer of them and the head at the hand's scale. Null for a stroke with none.
 */
function readHead(fp: Fingerprint, points: Point[], scale: number): HeadRead | null {
  if (fp.isClosed || checkOvershoot(points, 50 * scale)) return null;
  const corners = headByCorners(fp, points, scale);
  if (corners && (corners.share ?? 0) >= HEAD_SHARE_SEEN) return { ...corners, by: 'corners' };
  const seen = headSeenOf(fp, points, scale);
  if (seen && (!corners || seen.fit > corners.fit)) return { ...seen, by: 'seen' };
  return corners ? { ...corners, by: 'corners' } : null;
}

/** A head read on a stroke: which end, its tip (a hint the ink's own tip is found from), how straight the shaft is, how hard the barb turns, how big it is against the shaft, and how well it fits an arrow. */
interface HeadSeen {
  /** The share of the path the head takes, where the corners measured it. */
  share?: number;
  fit: number;
  head: 'end' | 'start';
  tip: Point;
  straight: number;
  sharpest: number;
  barb: { reach: number; shaft: number; ratio: number };
}

/**
 * A head from the rung's corners: a corner that turns hard inside the last (or
 * first) fifth of the stroke, with a straight shaft before it.
 */
function headByCorners(fp: Fingerprint, points: Point[], scale: number): HeadSeen | null {
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
  const tryHead = (head: 'end' | 'start', cs: typeof corners): HeadSeen | null => {
    if (cs.length === 0) return null;
    const first = cs.reduce((a, c) => (head === 'end' ? Math.min(a, c.t) : Math.max(a, c.t)), head === 'end' ? 1 : 0);
    const shaft = head === 'end' ? path.slice(0, Math.max(3, Math.round(first * 100))) : path.slice(Math.min(97, Math.round(first * 100)));
    const straight = calculateStraightness(shaft);
    const sharpest = Math.max(...cs.map((c) => c.angle));
    const shaftOk = ramp(straight, 0.72, 0.95);
    // A barb DRAWS BACK on the shaft: the wing turns past ninety degrees
    // (a hand's wing leaves the tip at ~30° off the shaft, a 150° turn). The
    // earlier ramp (55°–110°) took the hook a pen leaves at liftoff for a
    // barb, and every tall l read as an arrow 0.6 (v10 F2).
    const barbOk = ramp(sharpest, BARB_TURN[0], BARB_TURN[1]);
    // The head is short next to the shaft: a long tail after the corner is a
    // bent line, not a barb. One wing is ~15% of the path, two wings ~35% —
    // and under a sixteenth of it is a liftoff hook, not a wing anyone meant.
    const headLen = head === 'end' ? 1 - first : first;
    if (headLen < 0.06) return null;
    const shortHead = 1 - ramp(headLen, 0.3, 0.45);
    const tipIdx = Math.round(first * 99);
    const tail = head === 'end' ? path[0] : path[99];
    // A barb is SHORT AGAINST ITS SHAFT; an L is two arms (S1). The barb's
    // reach from the tip over the shaft's length, which a second arm as long
    // as a box's side never has. Its length, not its angle: an L's corner is
    // square, but raising the angle a barb must turn to keep it out would
    // lose the arrows real hands draw.
    const barb = barbOf(path, tipIdx, head, tail, scale);
    return {
      fit: (shaftOk * 0.5 + barbOk * 0.35 + shortHead * 0.15) * shortBarb(barb, scale),
      share: headLen,
      head,
      tip: path[tipIdx],
      straight,
      sharpest,
      barb,
    };
  };
  return [tryHead('end', atEnd), tryHead('start', atStart)]
    .filter((x): x is HeadSeen => !!x)
    .sort((a, b) => b.fit - a.fit)[0] ?? null;
}

/**
 * Short against the shaft, or short in the hand's space: a barb is a flick of
 * the pen, and on a short arrow the flick is most of the shaft.
 */
function shortBarb(barb: { reach: number; ratio: number }, scale: number): number {
  return Math.max(
    1 - ramp(barb.ratio, BARB_OF_SHAFT[0], BARB_OF_SHAFT[1]),
    1 - ramp(barb.reach / scale, BARB_FLICK_PX[0], BARB_FLICK_PX[1])
  );
}

/** A barb DRAWS BACK on the shaft: the turn at the tip, in radians, from nothing at the first to full credit at the second. */
export const BARB_TURN = [(95 * Math.PI) / 180, (140 * Math.PI) / 180] as const;
/**
 * A barb is at least this many pixels on screen, or it is the hook a pen
 * leaves lifting off (a tall l's is under ten). Only the head read at the
 * hand's scale asks it: the corners' own rule is a share of the path.
 */
export const BARB_MIN_PX = 12;
/** The hand-scale head is looked for in strokes at least this straight overall (a long arrow with a head is nearly as straight as its shaft). */
const HEAD_SEEN_STRAIGHT = 0.5;
/** …and no more than this many points are looked at: a long stroke is read at a coarser step, never a slower one. */
const HEAD_SEEN_POINTS = 2000;

/**
 * A head at the hand's own scale — the one thing the corners cannot see. The
 * corner detector measures its window in fractions of the path, so on a shaft
 * of a thousand pixels a hand-sized head (a wing of thirty) is a sixtieth of
 * the stroke and turns no corner it can find: a long sequence message, an
 * arrow across a wide page, read as a line alone (D5). So the stroke is looked
 * at as the hand drew it: at either end, the ink the pen first reached
 * farthest along the shaft is the tip (`inkTipIndex`), and what follows it is
 * a barb when it is at least a hand's flick long (`BARB_MIN_PX`), DRAWS BACK
 * on the shaft (the turn at the tip, `BARB_TURN` — a hook that bends on ahead
 * or aside does not), is short against the shaft, and the shaft before it is
 * straight. A pen's liftoff hook and an L's second arm are neither; each has
 * its own test in recognition.test.ts. Null when there is no such head.
 */
function headSeenOf(fp: Fingerprint, points: Point[], scale: number): HeadSeen | null {
  if (fp.isClosed || fp.straightness < HEAD_SEEN_STRAIGHT || points.length < 4) return null;
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  if (!(total > 0)) return null;
  const step = Math.max(2 * scale, total / HEAD_SEEN_POINTS);
  const dense = resampleByArcLength(points, Math.max(8, Math.round(total / step) + 1));
  const near = HAND_RESOLUTION_PX * scale;
  const seen = (head: 'end' | 'start'): HeadSeen | null => {
    const pts = head === 'end' ? dense : dense.slice().reverse();
    const tail = pts[0];
    let farAt = 0, farD = 0;
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i].x - tail.x, pts[i].y - tail.y);
      if (d > farD) { farD = d; farAt = i; }
    }
    if (!(farD > 0)) return null;
    const at = inkTipIndex(pts, 'end', tail, pts[farAt], near);
    const tip = pts[at];
    const shaftLen = Math.hypot(tip.x - tail.x, tip.y - tail.y);
    if (!(shaftLen > 0)) return null;
    const ux = (tip.x - tail.x) / shaftLen, uy = (tip.y - tail.y) / shaftLen;
    let reach = 0, wing = tip, barbPath = 0;
    for (let i = at + 1; i < pts.length; i++) {
      barbPath += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      const d = Math.hypot(pts[i].x - tip.x, pts[i].y - tip.y);
      if (d > reach) { reach = d; wing = pts[i]; }
    }
    if (reach / scale < BARB_MIN_PX) return null;
    // The turn at the tip: how far the wing leaves the way the shaft was going.
    const back = ((tip.x - wing.x) * ux + (tip.y - wing.y) * uy) / reach;
    const sharpest = Math.PI - Math.acos(Math.max(-1, Math.min(1, back)));
    const straight = calculateStraightness(pts.slice(0, at + 1));
    const barb = { reach, shaft: shaftLen, ratio: reach / shaftLen };
    const shortHead = 1 - ramp(barbPath / total, 0.3, 0.45);
    const fit = (ramp(straight, 0.72, 0.95) * 0.5 + ramp(sharpest, BARB_TURN[0], BARB_TURN[1]) * 0.35 + shortHead * 0.15) * shortBarb(barb, scale);
    return fit > 0 ? { fit, head, tip, straight, sharpest, barb } : null;
  };
  return [seen('end'), seen('start')].filter((x): x is HeadSeen => !!x).sort((a, b) => b.fit - a.fit)[0] ?? null;
}

/**
 * A barb is at most about this share of its shaft: full credit to the first,
 * none from the second. A hand's barb is a sixth to a fifth of its shaft (the
 * corpus 0.13–0.16, D1's shortest flow 0.22); an L's second arm, even on a
 * box two and a half times as wide as it is tall, is two fifths of its first.
 */
export const BARB_OF_SHAFT = [0.3, 0.45] as const;
/**
 * …or it is a flick of the pen, whatever the shaft: this many pixels on
 * screen at most, full credit to the first. About half John's x-height (31–40
 * px) and D1's heads (16 px); an L's arm on any box a hand draws is longer.
 */
export const BARB_FLICK_PX = [16, 32] as const;

/**
 * The barb at one end of a stroke: how far it reaches from the tip, against
 * how long the shaft is. The tip is where the ink first comes within the
 * hand's resolution of its farthest along the shaft, coming from the tail —
 * the corner the rung measured can sit a wing's length short of it, where a
 * two-wing barb comes back between its wings (heads.ts reads the tip the same
 * way), and an arm drawn square off the shaft never gets farther along it.
 */
function barbOf(path: Point[], tipIdx: number, head: 'end' | 'start', tail: Point, scale: number): { reach: number; shaft: number; ratio: number } {
  const order = head === 'end' ? path.slice(tipIdx) : path.slice(0, tipIdx + 1).reverse();
  const corner = order[0];
  const L = Math.hypot(corner.x - tail.x, corner.y - tail.y) || 1;
  const ux = (corner.x - tail.x) / L, uy = (corner.y - tail.y) / L;
  const along = (p: Point) => (p.x - tail.x) * ux + (p.y - tail.y) * uy;
  const far = Math.max(...order.map(along));
  const k = Math.max(0, order.findIndex((p) => along(p) >= far - HAND_RESOLUTION_PX * scale));
  const tip = order[k];
  let reach = 0;
  for (let i = k; i < order.length; i++) reach = Math.max(reach, Math.hypot(order[i].x - tip.x, order[i].y - tip.y));
  const shaft = Math.hypot(tip.x - tail.x, tip.y - tail.y) || 1;
  return { reach, shaft, ratio: reach / shaft };
}

export function analyzeStroke(points: Point[], scale = 1): StrokeAnalysis {
  const fingerprint = getFingerprint(points, scale);

  // Below the hand's resolution there is no geometry to read — only a dot.
  if (fingerprint.size / scale < HAND_RESOLUTION_PX) {
    const dot = detectDot(fingerprint, scale);
    return { fingerprint, results: dot ? [dot] : [] };
  }

  const even = evenBowOf(fingerprint, points, scale);
  const head = readHead(fingerprint, points, scale);
  const results = [
    detectLine(fingerprint, points, scale, even, head),
    detectArc(fingerprint, points, scale, even),
    detectTriangle(fingerprint),
    detectRectangle(fingerprint),
    detectCircle(fingerprint, points, scale),
    detectDot(fingerprint, scale),
    detectText(fingerprint, points, scale),
    detectArrow(fingerprint, points, scale, head),
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

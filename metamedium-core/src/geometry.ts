// MetaMedium Day 6 - Geometry Utilities
// Migrated from day5.html

import type { Point, Bounds, Fingerprint } from './types';

// ===== BASIC GEOMETRIC CALCULATIONS =====

export function getBounds(points: Point[]): Bounds {
  if (points.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  points.forEach((point) => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  });

  return { minX, maxX, minY, maxY };
}

// Helper function to get bounds from either single-stroke or segment-based strokes
export function getBoundsFromStroke(stroke: Point[] | Point[][]): Bounds {
  // Check if this is a segment-based stroke (Point[][])
  if (Array.isArray(stroke[0]) && typeof (stroke[0] as Point[])[0] === 'object') {
    // Flatten all segments into a single array of points
    const allPoints: Point[] = [];
    (stroke as Point[][]).forEach((segment) => {
      allPoints.push(...segment);
    });
    return getBounds(allPoints);
  }

  // Single-stroke format (Point[])
  return getBounds(stroke as Point[]);
}

export function calculateDistance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * How straight a stroke is: direct distance over path length. 1 = a ruler.
 *
 * Path length is measured on a SIMPLIFIED copy of the stroke, and that detail is
 * load-bearing. Raw path length counts every digitizer wobble, so it grows with
 * the device's report rate rather than with the shape: a genuinely straight line
 * drawn with realistic ±1px sensor noise scores 0.99 on a slow device and 0.30
 * on a fast one, and reads as an arc. Simplifying first — with a tolerance
 * relative to the stroke's own size, so it stays scale-free — measures the shape
 * the hand drew instead of the noise the hardware added. Real curvature is far
 * larger than the tolerance and survives untouched.
 */
/**
 * Mean filter over a window measured in SAMPLES, preserving point count.
 *
 * `smoothStroke` (Chaikin) is the wrong tool here: it doubles the point count
 * per pass, so the passes needed to tame a dense noisy stroke would turn 600
 * points into 40,000. This averages in place, and the caller sizes the window in
 * arc length so it means the same thing at any report rate.
 */
function meanFilter(points: Point[], halfWindow: number): Point[] {
  if (halfWindow < 1 || points.length < 3) return points;
  const out: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    let sx = 0, sy = 0, n = 0;
    const lo = Math.max(0, i - halfWindow);
    const hi = Math.min(points.length - 1, i + halfWindow);
    for (let j = lo; j <= hi; j++) { sx += points[j].x; sy += points[j].y; n++; }
    out.push({ x: sx / n, y: sy / n });
  }
  // Endpoints define direct distance and closure; never move them.
  out[0] = points[0];
  out[out.length - 1] = points[points.length - 1];
  return out;
}

/**
 * Remove digitizer noise while leaving the drawn shape alone.
 *
 * The filter window is sized in ARC LENGTH (a fraction of the stroke's own
 * size), then converted to samples using the stroke's actual sample spacing. So
 * it removes the same physical wobble whether the device reported 60 or 240
 * times a second, and on a sparsely sampled stroke it does almost nothing —
 * there is nothing there to remove. Everything downstream that measures SHAPE
 * rather than position should start here.
 */
export function denoise(points: Point[], windowFraction = 0.015): Point[] {
  if (points.length < 5) return points;
  const bounds = getBounds(points);
  const size = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  if (size <= 0) return points;

  let raw = 0;
  for (let i = 1; i < points.length; i++) raw += calculateDistance(points[i - 1], points[i]);
  const spacing = raw / Math.max(1, points.length - 1);
  if (spacing <= 0) return points;

  return meanFilter(points, Math.min(24, Math.round((size * windowFraction) / spacing)));
}

export function calculateStraightness(points: Point[]): number {
  if (points.length < 2) return 0;

  const start = points[0];
  const end = points[points.length - 1];
  const directDistance = calculateDistance(start, end);

  const bounds = getBounds(points);
  const size = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  const path = simplifyStroke(denoise(points), Math.max(1.2, size * 0.012));

  let pathLength = 0;
  for (let i = 1; i < path.length; i++) {
    pathLength += calculateDistance(path[i - 1], path[i]);
  }

  if (pathLength === 0) return 0;
  return Math.min(1, directDistance / pathLength);
}

export function isStrokeClosed(points: Point[], threshold = 50): boolean {
  if (points.length < 5) return false;

  const start = points[0];
  const end = points[points.length - 1];
  const distance = calculateDistance(start, end);

  const bounds = getBounds(points);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const size = Math.max(width, height);
  const relativeGap = size > 0 ? distance / size : 1;

  // Absolute closure, bounded by the stroke's own size. The intent has always
  // been "small shapes need tight closure, large shapes tolerate bigger gaps",
  // but an unbounded `distance < threshold` does the opposite at the small end:
  // a 45px-wide caret whose ends are 45px apart is plainly open, and yet 45 < 50
  // declared it closed. Capping the absolute allowance at half the stroke's size
  // restores the documented behaviour and, with it, the command mark — which is
  // small by nature and was being read as a loop.
  if (distance < threshold && distance < size * 0.5) return true;

  // Size-relative closure (more forgiving for quick sketches).
  // Allow up to 20% gap for hand-drawn shapes.
  return relativeGap < 0.20;
}

// ===== CONVEX HULL & CORNER DETECTION =====
// Day 5a approach: compute convex hull, then find corners on the hull

function ccw(p1: Point, p2: Point, p3: Point): number {
  // Counter-clockwise test
  // Returns > 0 if counter-clockwise, < 0 if clockwise, 0 if collinear
  return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
}

export function convexHull(points: Point[]): Point[] {
  // Graham scan algorithm for convex hull
  // Returns vertices of convex hull in counter-clockwise order

  if (!points || points.length < 3) return points;

  // Find the bottom-most point (and leftmost if tie)
  let start = points[0];
  for (let i = 1; i < points.length; i++) {
    if (points[i].y < start.y || (points[i].y === start.y && points[i].x < start.x)) {
      start = points[i];
    }
  }

  // Sort points by polar angle with respect to start point
  const sorted = points.filter(p => p !== start).sort((a, b) => {
    const angleA = Math.atan2(a.y - start.y, a.x - start.x);
    const angleB = Math.atan2(b.y - start.y, b.x - start.x);

    if (angleA !== angleB) return angleA - angleB;

    // If same angle, closer point comes first
    const distA = calculateDistance(start, a);
    const distB = calculateDistance(start, b);
    return distA - distB;
  });

  // Build hull
  const hull = [start, sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    let top = hull[hull.length - 1];
    let middle = hull[hull.length - 2];

    // Remove points that make clockwise turn
    while (hull.length > 1 && ccw(middle, top, sorted[i]) <= 0) {
      hull.pop();
      top = hull[hull.length - 1];
      middle = hull[hull.length - 2];
    }

    hull.push(sorted[i]);
  }

  return hull;
}

function calculateAngleBetweenPoints(arm1: Point, vertex: Point, arm2: Point): number {
  // Calculate angle at vertex formed by arm1-vertex-arm2
  // Returns angle in radians [0, 2π]

  const v1x = arm1.x - vertex.x;
  const v1y = arm1.y - vertex.y;

  const v2x = arm2.x - vertex.x;
  const v2y = arm2.y - vertex.y;

  const angle1 = Math.atan2(v1y, v1x);
  const angle2 = Math.atan2(v2y, v2x);

  let radians = angle2 - angle1;

  // Normalize to [0, 2π]
  if (radians < 0) radians += Math.PI * 2;
  if (radians > Math.PI * 2) radians -= Math.PI * 2;

  return radians;
}

export function findCorners(points: Point[], targetCount: number): Point[] {
  // Find the N most prominent corners in a polygon
  // Uses angle analysis to identify sharpest turns

  if (!points || points.length < targetCount) return points;

  const hull = convexHull(points);
  if (hull.length <= targetCount) return hull;

  // Calculate angles at each hull vertex
  const corners: Array<{ point: Point; angle: number; sharpness: number; index: number }> = [];
  for (let i = 0; i < hull.length; i++) {
    const prev = hull[(i - 1 + hull.length) % hull.length];
    const curr = hull[i];
    const next = hull[(i + 1) % hull.length];

    const angle = calculateAngleBetweenPoints(prev, curr, next);

    corners.push({
      point: curr,
      angle: angle,
      sharpness: Math.PI - angle, // How far from straight (π)
      index: i
    });
  }

  // Sort by sharpness (most acute angles first)
  corners.sort((a, b) => b.sharpness - a.sharpness);

  // Take the N sharpest corners
  const selected = corners.slice(0, targetCount);

  // Sort back by position around hull for proper order
  selected.sort((a, b) => a.index - b.index);

  return selected.map(c => c.point);
}

export function findCornersWithSeparation(hullPoints: Point[], targetCount: number): Point[] {
  // Find N corners ensuring they're well-separated
  // Prevents picking multiple corners on the same edge

  if (!hullPoints || hullPoints.length <= targetCount) return hullPoints;

  // Calculate hull perimeter for minimum separation
  let perimeter = 0;
  for (let i = 0; i < hullPoints.length; i++) {
    const next = (i + 1) % hullPoints.length;
    perimeter += calculateDistance(hullPoints[i], hullPoints[next]);
  }

  // Minimum separation: corners must be at least 1/6 of perimeter apart
  const minSeparation = perimeter / (targetCount * 1.5);

  // Calculate angles at each hull vertex
  const corners: Array<{ point: Point; angle: number; sharpness: number; index: number }> = [];
  for (let i = 0; i < hullPoints.length; i++) {
    const prev = hullPoints[(i - 1 + hullPoints.length) % hullPoints.length];
    const curr = hullPoints[i];
    const next = hullPoints[(i + 1) % hullPoints.length];

    const angle = calculateAngleBetweenPoints(prev, curr, next);

    corners.push({
      point: curr,
      angle: angle,
      sharpness: Math.PI - angle,
      index: i
    });
  }

  // Sort by sharpness
  corners.sort((a, b) => b.sharpness - a.sharpness);

  // Greedily select corners ensuring minimum separation
  const selected: Array<{ point: Point; angle: number; sharpness: number; index: number }> = [];

  for (let i = 0; i < corners.length && selected.length < targetCount; i++) {
    const candidate = corners[i];

    // Check if this corner is far enough from all already-selected corners
    let tooClose = false;
    for (const existing of selected) {
      // Calculate distance along hull perimeter
      const indexDiff = Math.abs(candidate.index - existing.index);
      const wrapDiff = hullPoints.length - indexDiff;
      const minIndexDiff = Math.min(indexDiff, wrapDiff);

      // Approximate arc length by number of points
      const approxDist = (minIndexDiff / hullPoints.length) * perimeter;

      if (approxDist < minSeparation) {
        tooClose = true;
        break;
      }
    }

    if (!tooClose) {
      selected.push(candidate);
    }
  }

  // If we couldn't find enough separated corners, fall back to best we have
  if (selected.length < targetCount) {
    // Add the sharpest remaining corners regardless of separation
    for (let i = 0; i < corners.length && selected.length < targetCount; i++) {
      if (!selected.includes(corners[i])) {
        selected.push(corners[i]);
      }
    }
  }

  // Sort by position around hull
  selected.sort((a, b) => a.index - b.index);

  return selected.map(c => c.point);
}

export interface CornerOptions {
  /** Turn angle in radians above which a sample counts as a corner. */
  threshold?: number;
  /** Length of each measuring arm, as a fraction of the whole path. */
  window?: number;
  /** Suppression radius around an accepted corner, as a fraction of the path. */
  separation?: number;
  /** How many uniform samples to reduce the stroke to before measuring. */
  samples?: number;
}

export const DEFAULT_CORNER_OPTIONS: Required<CornerOptions> = {
  // A circle turns 2 x window x 360 degrees across the measuring span — at a
  // 0.055 window that is ~40 degrees, so 50 degrees clears a smooth curve while
  // still catching a rounded rectangle corner.
  threshold: (50 * Math.PI) / 180,
  window: 0.055,
  separation: 0.11,
  samples: 180,
};

/**
 * Resample a stroke to `n` points spaced evenly along its length.
 *
 * This is the fix for the whole family of density bugs. Input points arrive at
 * whatever rate the pointer fired, so a slowly-drawn stroke is dense and a fast
 * one is sparse — and any rule expressed in POINT INDICES therefore means a
 * different physical distance every time. After resampling, index distance IS
 * arc length, and the rules mean what they say.
 */
export function resampleByArcLength(points: Point[], n: number, closed = false): Point[] {
  const path = closed && points.length > 1 ? points.concat([points[0]]) : points;
  if (path.length < 2 || n < 2) return path.slice();

  const cum: number[] = [0];
  for (let i = 1; i < path.length; i++) {
    cum.push(cum[i - 1] + calculateDistance(path[i - 1], path[i]));
  }
  const total = cum[cum.length - 1];
  if (total === 0) return path.slice(0, n);

  const out: Point[] = [];
  const count = closed ? n : n - 1;
  let j = 0;
  for (let i = 0; i < (closed ? n : n); i++) {
    const target = (i / count) * total;
    while (j < cum.length - 2 && cum[j + 1] < target) j++;
    const span = cum[j + 1] - cum[j];
    const t = span > 0 ? (target - cum[j]) / span : 0;
    out.push({
      x: path[j].x + (path[j + 1].x - path[j].x) * t,
      y: path[j].y + (path[j + 1].y - path[j].y) * t,
    });
  }
  return out;
}

/**
 * Corners, measured along the path rather than along the point array.
 *
 * Two properties the previous implementation lacked, both of which showed up as
 * "a rectangle is a triangle":
 *
 *   1. **Scale and density independence.** The measuring arms and the
 *      suppression radius are fractions of the stroke's own length, so the same
 *      rectangle counts four corners whether it was drawn fast or slowly. The
 *      old version used a fixed 8-point arm and a fixed 20-index merge radius,
 *      and returned 1, 2 or 3 corners for one rectangle depending only on
 *      drawing speed — adjacent corners were merged whenever the points were
 *      sparse.
 *   2. **The seam is scanned.** A closed stroke wraps, so a corner at the point
 *      where the stroke starts and ends is found. Drawing a box starting at a
 *      corner — the natural way — used to lose that corner every single time,
 *      which is why a rectangle could never score 4.
 */
export function countCorners(
  points: Point[],
  optionsOrThreshold: CornerOptions | number = {},
  closed?: boolean
): {
  count: number;
  angles: number[];
  /** `t` is the corner's position along the path, 0–1 — arc length, not index. */
  cornerData: { index: number; angle: number; x: number; y: number; t: number }[];
} {
  const opts: Required<CornerOptions> = {
    ...DEFAULT_CORNER_OPTIONS,
    ...(typeof optionsOrThreshold === 'number'
      ? { threshold: optionsOrThreshold }
      : optionsOrThreshold),
  };
  const empty = { count: 0, angles: [], cornerData: [] };
  if (points.length < 8) return empty;

  const isClosed = closed ?? isStrokeClosed(points);
  const n = opts.samples;
  // Denoise first: on a dense noisy stroke the sensor alone can swing a chord
  // angle by ~15 degrees, which is enough to invent corners on a smooth curve.
  const path = resampleByArcLength(denoise(points), n, isClosed);
  if (path.length < 8) return empty;

  // Both windows are fractions of the path, and on an elongated box the short
  // sides are a small fraction of it: at 5:1 each is 8% of the perimeter, at
  // 9:1 under 5%. A suppression window wider than a short side ate one corner
  // at each end, and a measuring arm longer than one turned the MIDDLE of the
  // side into the sharpest turn on the stroke — so a header bar, the most
  // common box in any interface, came back with two corners or six and a
  // rectangle score in the 0.5s. For a closed stroke, bound both by the short
  // side so neither can straddle a whole one. Square-ish strokes (every circle,
  // every ordinary box) are unaffected; open strokes keep the defaults, since a
  // line's short side is its own noise.
  let windowFrac = opts.window;
  let sepFrac = opts.separation;
  if (isClosed) {
    const bb = getBounds(points);
    const bw = bb.maxX - bb.minX, bh = bb.maxY - bb.minY;
    const shortFrac = Math.min(bw, bh) / Math.max(1e-6, 2 * (bw + bh));
    windowFrac = Math.min(opts.window, Math.max(0.02, shortFrac * 0.6));
    sepFrac = Math.min(opts.separation, Math.max(0.03, shortFrac * 0.7));
  }
  const arm = Math.max(2, Math.round(windowFrac * path.length));
  const sep = Math.max(2, Math.round(sepFrac * path.length));
  const at = (i: number) => path[((i % path.length) + path.length) % path.length];

  // Turn angle at every sample: the angle between the chord arriving and the
  // chord leaving, each one `arm` of the path long.
  const turn: number[] = new Array(path.length).fill(0);
  for (let i = 0; i < path.length; i++) {
    if (!isClosed && (i < arm || i >= path.length - arm)) continue;
    const a = at(i - arm), b = at(i), c = at(i + arm);
    const bx = b.x - a.x, by = b.y - a.y;
    const cx = c.x - b.x, cy = c.y - b.y;
    const magB = Math.hypot(bx, by), magC = Math.hypot(cx, cy);
    if (magB === 0 || magC === 0) continue;
    const cos = (bx * cx + by * cy) / (magB * magC);
    turn[i] = Math.acos(Math.max(-1, Math.min(1, cos)));
  }

  // Greedy non-maximum suppression: take the sharpest turn, silence everything
  // within `sep` of it along the path, repeat. Wrapping, so a corner sitting on
  // the seam suppresses its neighbours on both sides like any other.
  const taken: { index: number; angle: number }[] = [];
  const used = new Array(path.length).fill(false);
  for (;;) {
    let best = -1, bestAngle = opts.threshold;
    for (let i = 0; i < path.length; i++) {
      if (!used[i] && turn[i] > bestAngle) { bestAngle = turn[i]; best = i; }
    }
    if (best < 0) break;
    taken.push({ index: best, angle: turn[best] });
    for (let d = -sep; d <= sep; d++) {
      const k = ((best + d) % path.length + path.length) % path.length;
      if (!isClosed && (best + d < 0 || best + d >= path.length)) continue;
      used[k] = true;
    }
  }

  taken.sort((a, b) => a.index - b.index);
  return {
    count: taken.length,
    angles: taken.map((c) => c.angle),
    cornerData: taken.map((c) => ({
      index: c.index,
      angle: c.angle,
      x: path[c.index].x,
      y: path[c.index].y,
      t: c.index / path.length,
    })),
  };
}

/**
 * How much of its own bounding box the stroke's outline encloses, 0–1.
 *
 * The single most discriminating feature the engine was missing, and the reason
 * a rectangle and a triangle were indistinguishable: corner COUNT is fragile
 * (one missed corner and a box becomes a triangle), but a rectangle fills ~1.0
 * of its box, a triangle ~0.5, and a circle ~0.79 — and those hold no matter
 * how the corners were counted, how fast it was drawn, or where it started.
 */
export function shapeExtent(points: Point[]): number {
  if (points.length < 3) return 0;
  const b = getBounds(points);
  const boxArea = (b.maxX - b.minX) * (b.maxY - b.minY);
  if (boxArea <= 0) return 0;

  // Shoelace over the outline, closed back to the start.
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i], q = points[(i + 1) % points.length];
    area += p.x * q.y - q.x * p.y;
  }
  return Math.min(1, Math.abs(area) / 2 / boxArea);
}

export function analyzeCornerAngles(angles: number[]): {
  avgAngle: number;
  variance: number;
  consistency: number;
  rectangleLikeness: number;
  triangleLikeness: number;
} {
  // Analyze the distribution of corner angles
  // Returns metrics useful for distinguishing rectangles from triangles
  // Handle undefined or empty arrays gracefully
  if (!angles || angles.length === 0) {
    return {
      avgAngle: 0,
      variance: 0,
      consistency: 0,
      rectangleLikeness: 0,
      triangleLikeness: 0,
    };
  }

  const avgAngle = angles.reduce((sum, a) => sum + a, 0) / angles.length;
  const variance =
    angles.reduce((sum, a) => sum + Math.pow(a - avgAngle, 2), 0) / angles.length;
  const stdDev = Math.sqrt(variance);

  // Consistency: how similar are all the angles? (0-1, higher = more consistent)
  const consistency =
    angles.length > 1 ? Math.max(0, 1 - stdDev / (Math.PI / 4)) : 1;

  // Check how "rectangle-like" the angles are (close to 90° = π/2)
  const rectangleLikeness =
    angles.reduce((sum, angle) => {
      const deviationFrom90 = Math.abs(angle - Math.PI / 2);
      // Score each corner: perfect 90° = 1, off by 45° = 0
      return sum + Math.max(0, 1 - deviationFrom90 / (Math.PI / 4));
    }, 0) / angles.length;

  // Check how "triangle-like" the angles are (more varied, typically sharper or wider than 90°)
  const triangleLikeness =
    angles.reduce((sum, angle) => {
      // Triangles typically have angles != 90°, often 60° or 120° external
      const deviationFrom90 = Math.abs(angle - Math.PI / 2);
      // Score higher if NOT near 90°
      return sum + Math.min(1, deviationFrom90 / (Math.PI / 6));
    }, 0) / angles.length;

  return {
    avgAngle,
    variance,
    consistency,
    rectangleLikeness,
    triangleLikeness,
  };
}

// ===== OVERSHOOT DETECTION =====

export function checkOvershoot(points: Point[], threshold = 50): boolean {
  // Check if stroke passes near start point at any point (not just at the end)
  // This detects circles/ellipses where user overshoots the starting point.
  //
  // The proximity threshold is size-relative (like closure detection): a fixed
  // 50px threshold made every stroke shorter than ~70px read as "overshooting",
  // which made short strokes unrecognizable as lines.
  if (points.length < 10) return false;

  const start = points[0];

  const bounds = getBounds(points);
  const size = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  const effectiveThreshold = Math.min(threshold, size * 0.2);

  // Check last 30% of stroke for proximity to start
  const checkStart = Math.floor(points.length * 0.7);

  for (let i = checkStart; i < points.length; i++) {
    const distance = Math.sqrt(
      Math.pow(points[i].x - start.x, 2) + Math.pow(points[i].y - start.y, 2)
    );

    if (distance < effectiveThreshold) {
      return true;
    }
  }

  return false;
}

// ===== FINGERPRINTING =====

/**
 * Reduce a stroke to the features detectors read.
 *
 * `scale` is world units per screen pixel at the moment the stroke was drawn —
 * i.e. 1/zoom. It exists because two of the rules here are FIXED pixel
 * thresholds (closure, overshoot), and a fixed threshold in world units makes
 * the same physical gesture read differently at different zoom levels: a check
 * drawn at 1.7× is only ~40 world px end-to-end and reads as CLOSED, while the
 * identical hand movement at 1× reads as open.
 *
 * Position belongs in world space; the hand does not. Passing the scale puts
 * the fixed thresholds back in the space the hand actually worked in. The
 * size-relative half of each rule needs no adjustment — it was already
 * scale-free, which is why it was the right idea to begin with.
 */
export function getFingerprint(points: Point[], scale = 1): Fingerprint {
  const bounds = getBounds(points);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  // Closure is decided first, because corner detection needs to know whether to
  // wrap: a corner on the seam of a closed stroke is a real corner.
  const closed = isStrokeClosed(points, 50 * scale);
  const cornerData = countCorners(points, {}, closed);

  // Calculate closure distance (end-to-start distance)
  const start = points[0];
  const end = points[points.length - 1];
  const closureDistance = Math.sqrt(
    Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
  );

  // Analyze corner angles for shape discrimination
  const angleAnalysis = analyzeCornerAngles(cornerData.angles);

  // Detect tip point for triangles (sharpest corner)
  let tipPoint: Point | undefined;
  if (cornerData.cornerData && cornerData.cornerData.length > 0) {
    let sharpestAngle = Math.PI;
    let sharpestCorner = cornerData.cornerData[0];

    cornerData.cornerData.forEach((corner) => {
      if (corner.angle < sharpestAngle) {
        sharpestAngle = corner.angle;
        sharpestCorner = corner;
      }
    });

    tipPoint = { x: sharpestCorner.x, y: sharpestCorner.y };
  }

  return {
    aspectRatio: height === 0 ? 1 : width / height,
    straightness: calculateStraightness(points),
    isClosed: closed,
    extent: shapeExtent(points),
    closureDistance,
    bounds: bounds,
    size: Math.max(width, height),
    corners: cornerData.count,
    cornerAngles: cornerData.angles,
    cornerData: cornerData.cornerData,
    tipPoint: tipPoint,
    angleAnalysis: angleAnalysis,
    pointCount: points.length,
    start: points[0],
    end: points[points.length - 1],
  };
}

// ===== STROKE MANIPULATION =====

export function smoothStroke(points: Point[], iterations = 2): Point[] {
  if (!points || points.length < 3) return points;

  let smoothed = [...points];
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  for (let iter = 0; iter < iterations; iter++) {
    const newPoints: Point[] = [];
    newPoints.push({ ...smoothed[0] });

    for (let i = 0; i < smoothed.length - 1; i++) {
      const p1 = smoothed[i];
      const p2 = smoothed[i + 1];

      const q = {
        x: 0.75 * p1.x + 0.25 * p2.x,
        y: 0.75 * p1.y + 0.25 * p2.y,
      };

      const r = {
        x: 0.25 * p1.x + 0.75 * p2.x,
        y: 0.25 * p1.y + 0.75 * p2.y,
      };

      newPoints.push(q);
      newPoints.push(r);
    }

    newPoints.push({ ...smoothed[smoothed.length - 1] });
    smoothed = newPoints;
  }

  smoothed[0] = firstPoint;
  smoothed[smoothed.length - 1] = lastPoint;

  return smoothed;
}

export function simplifyStroke(points: Point[], tolerance = 2): Point[] {
  if (!points || points.length <= 2) return points;

  function perpendicularDistance(
    point: Point,
    lineStart: Point,
    lineEnd: Point
  ): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;

    if (dx === 0 && dy === 0) {
      return calculateDistance(point, lineStart);
    }

    const t =
      ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) /
      (dx * dx + dy * dy);
    const clampedT = Math.max(0, Math.min(1, t));

    const projection = {
      x: lineStart.x + clampedT * dx,
      y: lineStart.y + clampedT * dy,
    };

    return calculateDistance(point, projection);
  }

  function douglasPeucker(pts: Point[], tol: number): Point[] {
    if (pts.length < 3) return pts;

    let maxDist = 0;
    let maxIndex = 0;
    const start = pts[0];
    const end = pts[pts.length - 1];

    for (let i = 1; i < pts.length - 1; i++) {
      const dist = perpendicularDistance(pts[i], start, end);
      if (dist > maxDist) {
        maxDist = dist;
        maxIndex = i;
      }
    }

    if (maxDist > tol) {
      const left = douglasPeucker(pts.slice(0, maxIndex + 1), tol);
      const right = douglasPeucker(pts.slice(maxIndex), tol);
      return [...left.slice(0, -1), ...right];
    }

    return [start, end];
  }

  return douglasPeucker(points, tolerance);
}

export function normalizeStroke(points: Point[], targetSize = 200): Point[] {
  // Scale stroke to standard size while maintaining canvas position
  if (!points || points.length === 0) return points;

  const bounds = getBounds(points);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const maxDim = Math.max(width, height);

  if (maxDim === 0) return points;

  const scale = targetSize / maxDim;
  const originalCenterX = (bounds.minX + bounds.maxX) / 2;
  const originalCenterY = (bounds.minY + bounds.maxY) / 2;

  // Scale around the original center position to maintain location on canvas
  return points.map((p) => ({
    x: (p.x - originalCenterX) * scale + originalCenterX,
    y: (p.y - originalCenterY) * scale + originalCenterY,
  }));
}

// ===== BOUNDING BOX OPERATIONS =====

export function distancePointToBounds(p: Point, b: Bounds): number {
  const dx = Math.max(0, b.minX - p.x, p.x - b.maxX);
  const dy = Math.max(0, b.minY - p.y, p.y - b.maxY);
  return Math.sqrt(dx * dx + dy * dy);
}

export function boundingBoxDistance(b1: Bounds, b2: Bounds): number {
  const horizDist = Math.max(
    0,
    b2.minX > b1.maxX ? b2.minX - b1.maxX : b1.minX - b2.maxX
  );
  const vertDist = Math.max(
    0,
    b2.minY > b1.maxY ? b2.minY - b1.maxY : b1.minY - b2.maxY
  );

  return Math.sqrt(horizDist * horizDist + vertDist * vertDist);
}

export function boundsOverlap(b1: Bounds, b2: Bounds): boolean {
  return !(
    b1.maxX < b2.minX ||
    b2.maxX < b1.minX ||
    b1.maxY < b2.minY ||
    b2.maxY < b1.minY
  );
}

export function boundsContain(outer: Bounds, inner: Bounds): boolean {
  return (
    inner.minX >= outer.minX &&
    inner.maxX <= outer.maxX &&
    inner.minY >= outer.minY &&
    inner.maxY <= outer.maxY
  );
}

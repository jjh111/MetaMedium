// MetaMedium Day 6 - Geometry Utilities
// Migrated from day5.html

import type { Point, Bounds, Fingerprint } from '../types';

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
  if (Array.isArray(stroke[0]) && typeof (stroke[0] as any)[0] === 'object') {
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

export function calculateStraightness(points: Point[]): number {
  if (points.length < 2) return 0;

  const start = points[0];
  const end = points[points.length - 1];
  const directDistance = calculateDistance(start, end);

  let pathLength = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    pathLength += Math.sqrt(dx * dx + dy * dy);
  }

  if (pathLength === 0) return 0;
  return directDistance / pathLength;
}

export function isStrokeClosed(points: Point[], threshold = 50): boolean {
  if (points.length < 5) return false;

  const start = points[0];
  const end = points[points.length - 1];
  const distance = calculateDistance(start, end);

  // Check direct closure
  if (distance < threshold) return true;

  // Size-relative closure (more forgiving for quick sketches)
  const bounds = getBounds(points);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const size = Math.max(width, height);
  const relativeGap = size > 0 ? distance / size : 1;

  // Allow up to 20% gap for hand-drawn shapes (was 15%)
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

export function countCorners(points: Point[], angleThreshold = Math.PI / 3): {
  count: number;
  angles: number[];
  cornerData: { index: number; angle: number; x: number; y: number }[];
} {
  // Day 5a exact logic: Fixed parameters for consistent corner detection
  // Angle threshold = 60 degrees (π/3) - catches hand-drawn corners
  if (points.length < 15) {
    console.log('[countCorners] Too few points (<15), returning 0 corners');
    return { count: 0, angles: [], cornerData: [] };
  }

  const cornerPositions: { index: number; angle: number }[] = [];
  const windowSize = 8; // Fixed window to catch sharper corners

  // Sample every 4 points to catch corners better
  for (let i = windowSize; i < points.length - windowSize; i += 4) {
    // Get vectors before and after this point
    const before = {
      x: points[i].x - points[i - windowSize].x,
      y: points[i].y - points[i - windowSize].y
    };
    const after = {
      x: points[i + windowSize].x - points[i].x,
      y: points[i + windowSize].y - points[i].y
    };

    // Calculate angle between vectors
    const dotProduct = before.x * after.x + before.y * after.y;
    const magBefore = Math.sqrt(before.x * before.x + before.y * before.y);
    const magAfter = Math.sqrt(after.x * after.x + after.y * after.y);

    if (magBefore === 0 || magAfter === 0) continue;

    const cosAngle = dotProduct / (magBefore * magAfter);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

    // If angle > threshold (60 degrees), it's a sharp corner
    if (angle > angleThreshold) {
      cornerPositions.push({ index: i, angle: angle });
    }
  }

  // Cluster corners - merge corners within 20 points of each other
  if (cornerPositions.length === 0) return { count: 0, angles: [], cornerData: [] };

  const clusteredCorners = [cornerPositions[0]];
  for (let i = 1; i < cornerPositions.length; i++) {
    const lastCorner = clusteredCorners[clusteredCorners.length - 1];
    const distance = cornerPositions[i].index - lastCorner.index;

    if (distance > 20) {
      // Far enough away, it's a new corner
      clusteredCorners.push(cornerPositions[i]);
    } else if (cornerPositions[i].angle > lastCorner.angle) {
      // Same cluster, but this corner is sharper - replace
      clusteredCorners[clusteredCorners.length - 1] = cornerPositions[i];
    }
  }

  // Add x,y coordinates to corner data
  const cornersWithCoords = clusteredCorners.map(c => ({
    index: c.index,
    angle: c.angle,
    x: points[c.index].x,
    y: points[c.index].y
  }));

  return {
    count: clusteredCorners.length,
    angles: clusteredCorners.map(c => c.angle),
    cornerData: cornersWithCoords
  };
}

// ===== CORNER ANGLE ANALYSIS =====

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
  // This detects circles/ellipses where user overshoots the starting point
  if (points.length < 10) return false;

  const start = points[0];

  // Check last 30% of stroke for proximity to start
  const checkStart = Math.floor(points.length * 0.7);

  for (let i = checkStart; i < points.length; i++) {
    const distance = Math.sqrt(
      Math.pow(points[i].x - start.x, 2) + Math.pow(points[i].y - start.y, 2)
    );

    if (distance < threshold) {
      return true;
    }
  }

  return false;
}

// ===== FINGERPRINTING =====

export function getFingerprint(points: Point[]): Fingerprint {
  const bounds = getBounds(points);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const cornerData = countCorners(points);

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
    isClosed: isStrokeClosed(points),
    closureDistance,
    bounds: bounds,
    size: Math.max(width, height),
    corners: cornerData.count,
    cornerAngles: cornerData.angles,
    cornerData: cornerData.cornerData,
    tipPoint: tipPoint,
    angleAnalysis: angleAnalysis,
    pointCount: points.length,
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

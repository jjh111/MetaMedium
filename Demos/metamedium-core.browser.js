/* metamedium-core browser bundle — built from metamedium-core/src via: npm run build:browser. Do not edit directly. */
"use strict";
var MetaMediumCore = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    BUILTIN_COMMAND_MARK: () => BUILTIN_COMMAND_MARK,
    BUILTIN_CONCEPTS: () => BUILTIN_CONCEPTS,
    BUILTIN_TYPES: () => BUILTIN_TYPES,
    COMMAND_MARK_SAMPLES: () => COMMAND_MARK_SAMPLES,
    DEFAULT_CORNER_OPTIONS: () => DEFAULT_CORNER_OPTIONS,
    DEFAULT_ERASE_CROSSINGS: () => DEFAULT_ERASE_CROSSINGS,
    DEFAULT_GESTURE_CONFIG: () => DEFAULT_GESTURE_CONFIG,
    DEFAULT_RELATE_CONFIG: () => DEFAULT_RELATE_CONFIG,
    DEFAULT_SESSION_CONFIG: () => DEFAULT_SESSION_CONFIG,
    DEFAULT_TIMEOUT_MS: () => DEFAULT_TIMEOUT_MS,
    LOCAL_PARTICIPANT: () => LOCAL_PARTICIPANT,
    LOCAL_TIMEOUT_MS: () => LOCAL_TIMEOUT_MS,
    MAX_READINGS: () => MAX_READINGS,
    MAX_TIER0_CONFIDENCE: () => MAX_TIER0_CONFIDENCE,
    MIN_CONFIDENCE: () => MIN_CONFIDENCE,
    PRESETS: () => PRESETS,
    TIER0_PARTICIPANT: () => TIER0_PARTICIPANT,
    aboutIdsOf: () => aboutIdsOf,
    analyzeCornerAngles: () => analyzeCornerAngles,
    analyzeStroke: () => analyzeStroke,
    between: () => between,
    boundingBoxDistance: () => boundingBoxDistance,
    boundsContain: () => boundsContain,
    boundsOf: () => boundsOf,
    boundsOverlap: () => boundsOverlap,
    buildScaffold: () => buildScaffold,
    buildSpatialGraph: () => buildSpatialGraph,
    bySource: () => bySource,
    byTier: () => byTier,
    calculateDistance: () => calculateDistance,
    calculateStraightness: () => calculateStraightness,
    canonicalCheckSamples: () => canonicalCheckSamples,
    checkOvershoot: () => checkOvershoot,
    clusters: () => clusters,
    collidesWith: () => collidesWith,
    commandMarkFeatures: () => commandMarkFeatures,
    complete: () => complete,
    convexHull: () => convexHull,
    countCorners: () => countCorners,
    countCrossings: () => countCrossings,
    createAgentParticipant: () => createAgentParticipant,
    createBootstrapNodes: () => createBootstrapNodes,
    createExplanationNode: () => createExplanationNode,
    createParticipantNode: () => createParticipantNode,
    createSession: () => createSession,
    denoise: () => denoise,
    describeAddressed: () => describeAddressed,
    describeLayout: () => describeLayout,
    describeRegions: () => describeRegions,
    describeRelations: () => describeRelations,
    describeSession: () => describeSession,
    describeSignature: () => describeSignature,
    disagreement: () => disagreement,
    enclosedBy: () => enclosedBy,
    explanationOf: () => explanationOf,
    findCorners: () => findCorners,
    findCornersWithSeparation: () => findCornersWithSeparation,
    fingerprintOf: () => fingerprintOf,
    frameOf: () => frameOf,
    getBounds: () => getBounds,
    getBoundsFromStroke: () => getBoundsFromStroke,
    getFingerprint: () => getFingerprint,
    getRep: () => getRep,
    has: () => has,
    hasMultipleSources: () => hasMultipleSources,
    interpretationsOf: () => interpretationsOf,
    isCheckLike: () => isCheckLike,
    isExplanation: () => isExplanation,
    isGesture: () => isGesture,
    isLassoLike: () => isLassoLike,
    isParticipant: () => isParticipant,
    isStrokeClosed: () => isStrokeClosed,
    learnCommandMark: () => learnCommandMark,
    listModels: () => listModels,
    matchConcepts: () => matchConcepts,
    matchPrimitiveFromLibrary: () => matchPrimitiveFromLibrary,
    matchesCommandMark: () => matchesCommandMark,
    normalizeStroke: () => normalizeStroke,
    outlineOf: () => outlineOf,
    parseCode: () => parseCode,
    parseFill: () => parseFill,
    parseLayout: () => parseLayout,
    parseReadings: () => parseReadings,
    prepare: () => prepare,
    providerLabel: () => providerLabel,
    providerTier: () => providerTier,
    readingsToEdges: () => readingsToEdges,
    regionAt: () => regionAt,
    regionsOf: () => regionsOf,
    regionsOverlapping: () => regionsOverlapping,
    relate: () => relate,
    relationsOf: () => relationsOf,
    resampleByArcLength: () => resampleByArcLength,
    resemblances: () => resemblances,
    resolvesLasso: () => resolvesLasso,
    scratchedOut: () => scratchedOut,
    segmentsIntersect: () => segmentsIntersect,
    shapeExtent: () => shapeExtent,
    simplifyStroke: () => simplifyStroke,
    smoothStroke: () => smoothStroke,
    sourcesOf: () => sourcesOf,
    spatialCluster: () => spatialCluster,
    strokePointsOf: () => strokePointsOf,
    strokesIntersect: () => strokesIntersect,
    topInterpretation: () => topInterpretation,
    typeNodeId: () => typeNodeId,
    validateRegions: () => validateRegions,
    whyNotResolved: () => whyNotResolved,
    wordOf: () => wordOf
  });

  // src/geometry.ts
  function getBounds(points) {
    if (points.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    points.forEach((point) => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    });
    return { minX, maxX, minY, maxY };
  }
  function getBoundsFromStroke(stroke) {
    if (Array.isArray(stroke[0]) && typeof stroke[0][0] === "object") {
      const allPoints = [];
      stroke.forEach((segment) => {
        allPoints.push(...segment);
      });
      return getBounds(allPoints);
    }
    return getBounds(stroke);
  }
  function calculateDistance(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }
  function meanFilter(points, halfWindow) {
    if (halfWindow < 1 || points.length < 3) return points;
    const out = [];
    for (let i = 0; i < points.length; i++) {
      let sx = 0, sy = 0, n2 = 0;
      const lo = Math.max(0, i - halfWindow);
      const hi = Math.min(points.length - 1, i + halfWindow);
      for (let j = lo; j <= hi; j++) {
        sx += points[j].x;
        sy += points[j].y;
        n2++;
      }
      out.push({ x: sx / n2, y: sy / n2 });
    }
    out[0] = points[0];
    out[out.length - 1] = points[points.length - 1];
    return out;
  }
  function denoise(points, windowFraction = 0.015) {
    if (points.length < 5) return points;
    const bounds = getBounds(points);
    const size = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
    if (size <= 0) return points;
    let raw = 0;
    for (let i = 1; i < points.length; i++) raw += calculateDistance(points[i - 1], points[i]);
    const spacing = raw / Math.max(1, points.length - 1);
    if (spacing <= 0) return points;
    return meanFilter(points, Math.min(24, Math.round(size * windowFraction / spacing)));
  }
  function calculateStraightness(points) {
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
  function isStrokeClosed(points, threshold = 50) {
    if (points.length < 5) return false;
    const start = points[0];
    const end = points[points.length - 1];
    const distance = calculateDistance(start, end);
    const bounds = getBounds(points);
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const size = Math.max(width, height);
    const relativeGap = size > 0 ? distance / size : 1;
    if (distance < threshold && distance < size * 0.5) return true;
    return relativeGap < 0.2;
  }
  function ccw(p1, p2, p3) {
    return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
  }
  function convexHull(points) {
    if (!points || points.length < 3) return points;
    let start = points[0];
    for (let i = 1; i < points.length; i++) {
      if (points[i].y < start.y || points[i].y === start.y && points[i].x < start.x) {
        start = points[i];
      }
    }
    const sorted = points.filter((p) => p !== start).sort((a, b) => {
      const angleA = Math.atan2(a.y - start.y, a.x - start.x);
      const angleB = Math.atan2(b.y - start.y, b.x - start.x);
      if (angleA !== angleB) return angleA - angleB;
      const distA = calculateDistance(start, a);
      const distB = calculateDistance(start, b);
      return distA - distB;
    });
    const hull2 = [start, sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      let top = hull2[hull2.length - 1];
      let middle = hull2[hull2.length - 2];
      while (hull2.length > 1 && ccw(middle, top, sorted[i]) <= 0) {
        hull2.pop();
        top = hull2[hull2.length - 1];
        middle = hull2[hull2.length - 2];
      }
      hull2.push(sorted[i]);
    }
    return hull2;
  }
  function calculateAngleBetweenPoints(arm1, vertex, arm2) {
    const v1x = arm1.x - vertex.x;
    const v1y = arm1.y - vertex.y;
    const v2x = arm2.x - vertex.x;
    const v2y = arm2.y - vertex.y;
    const angle1 = Math.atan2(v1y, v1x);
    const angle2 = Math.atan2(v2y, v2x);
    let radians = angle2 - angle1;
    if (radians < 0) radians += Math.PI * 2;
    if (radians > Math.PI * 2) radians -= Math.PI * 2;
    return radians;
  }
  function findCorners(points, targetCount) {
    if (!points || points.length < targetCount) return points;
    const hull2 = convexHull(points);
    if (hull2.length <= targetCount) return hull2;
    const corners = [];
    for (let i = 0; i < hull2.length; i++) {
      const prev = hull2[(i - 1 + hull2.length) % hull2.length];
      const curr = hull2[i];
      const next = hull2[(i + 1) % hull2.length];
      const angle = calculateAngleBetweenPoints(prev, curr, next);
      corners.push({
        point: curr,
        angle,
        sharpness: Math.PI - angle,
        // How far from straight (π)
        index: i
      });
    }
    corners.sort((a, b) => b.sharpness - a.sharpness);
    const selected = corners.slice(0, targetCount);
    selected.sort((a, b) => a.index - b.index);
    return selected.map((c) => c.point);
  }
  function findCornersWithSeparation(hullPoints, targetCount) {
    if (!hullPoints || hullPoints.length <= targetCount) return hullPoints;
    let perimeter = 0;
    for (let i = 0; i < hullPoints.length; i++) {
      const next = (i + 1) % hullPoints.length;
      perimeter += calculateDistance(hullPoints[i], hullPoints[next]);
    }
    const minSeparation = perimeter / (targetCount * 1.5);
    const corners = [];
    for (let i = 0; i < hullPoints.length; i++) {
      const prev = hullPoints[(i - 1 + hullPoints.length) % hullPoints.length];
      const curr = hullPoints[i];
      const next = hullPoints[(i + 1) % hullPoints.length];
      const angle = calculateAngleBetweenPoints(prev, curr, next);
      corners.push({
        point: curr,
        angle,
        sharpness: Math.PI - angle,
        index: i
      });
    }
    corners.sort((a, b) => b.sharpness - a.sharpness);
    const selected = [];
    for (let i = 0; i < corners.length && selected.length < targetCount; i++) {
      const candidate = corners[i];
      let tooClose = false;
      for (const existing of selected) {
        const indexDiff = Math.abs(candidate.index - existing.index);
        const wrapDiff = hullPoints.length - indexDiff;
        const minIndexDiff = Math.min(indexDiff, wrapDiff);
        const approxDist = minIndexDiff / hullPoints.length * perimeter;
        if (approxDist < minSeparation) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) {
        selected.push(candidate);
      }
    }
    if (selected.length < targetCount) {
      for (let i = 0; i < corners.length && selected.length < targetCount; i++) {
        if (!selected.includes(corners[i])) {
          selected.push(corners[i]);
        }
      }
    }
    selected.sort((a, b) => a.index - b.index);
    return selected.map((c) => c.point);
  }
  var DEFAULT_CORNER_OPTIONS = {
    // A circle turns 2 x window x 360 degrees across the measuring span — at a
    // 0.055 window that is ~40 degrees, so 50 degrees clears a smooth curve while
    // still catching a rounded rectangle corner.
    threshold: 50 * Math.PI / 180,
    window: 0.055,
    separation: 0.11,
    samples: 180
  };
  function resampleByArcLength(points, n2, closed = false) {
    const path = closed && points.length > 1 ? points.concat([points[0]]) : points;
    if (path.length < 2 || n2 < 2) return path.slice();
    const cum = [0];
    for (let i = 1; i < path.length; i++) {
      cum.push(cum[i - 1] + calculateDistance(path[i - 1], path[i]));
    }
    const total = cum[cum.length - 1];
    if (total === 0) return path.slice(0, n2);
    const out = [];
    const count = closed ? n2 : n2 - 1;
    let j = 0;
    for (let i = 0; i < (closed ? n2 : n2); i++) {
      const target = i / count * total;
      while (j < cum.length - 2 && cum[j + 1] < target) j++;
      const span = cum[j + 1] - cum[j];
      const t = span > 0 ? (target - cum[j]) / span : 0;
      out.push({
        x: path[j].x + (path[j + 1].x - path[j].x) * t,
        y: path[j].y + (path[j + 1].y - path[j].y) * t
      });
    }
    return out;
  }
  function countCorners(points, optionsOrThreshold = {}, closed) {
    const opts = {
      ...DEFAULT_CORNER_OPTIONS,
      ...typeof optionsOrThreshold === "number" ? { threshold: optionsOrThreshold } : optionsOrThreshold
    };
    const empty = { count: 0, angles: [], cornerData: [] };
    if (points.length < 8) return empty;
    const isClosed2 = closed ?? isStrokeClosed(points);
    const n2 = opts.samples;
    const path = resampleByArcLength(denoise(points), n2, isClosed2);
    if (path.length < 8) return empty;
    const arm = Math.max(2, Math.round(opts.window * path.length));
    const sep = Math.max(2, Math.round(opts.separation * path.length));
    const at = (i) => path[(i % path.length + path.length) % path.length];
    const turn = new Array(path.length).fill(0);
    for (let i = 0; i < path.length; i++) {
      if (!isClosed2 && (i < arm || i >= path.length - arm)) continue;
      const a = at(i - arm), b = at(i), c = at(i + arm);
      const bx = b.x - a.x, by = b.y - a.y;
      const cx2 = c.x - b.x, cy2 = c.y - b.y;
      const magB = Math.hypot(bx, by), magC = Math.hypot(cx2, cy2);
      if (magB === 0 || magC === 0) continue;
      const cos = (bx * cx2 + by * cy2) / (magB * magC);
      turn[i] = Math.acos(Math.max(-1, Math.min(1, cos)));
    }
    const taken = [];
    const used = new Array(path.length).fill(false);
    for (; ; ) {
      let best = -1, bestAngle = opts.threshold;
      for (let i = 0; i < path.length; i++) {
        if (!used[i] && turn[i] > bestAngle) {
          bestAngle = turn[i];
          best = i;
        }
      }
      if (best < 0) break;
      taken.push({ index: best, angle: turn[best] });
      for (let d = -sep; d <= sep; d++) {
        const k = ((best + d) % path.length + path.length) % path.length;
        if (!isClosed2 && (best + d < 0 || best + d >= path.length)) continue;
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
        t: c.index / path.length
      }))
    };
  }
  function shapeExtent(points) {
    if (points.length < 3) return 0;
    const b = getBounds(points);
    const boxArea = (b.maxX - b.minX) * (b.maxY - b.minY);
    if (boxArea <= 0) return 0;
    let area2 = 0;
    for (let i = 0; i < points.length; i++) {
      const p = points[i], q = points[(i + 1) % points.length];
      area2 += p.x * q.y - q.x * p.y;
    }
    return Math.min(1, Math.abs(area2) / 2 / boxArea);
  }
  function analyzeCornerAngles(angles) {
    if (!angles || angles.length === 0) {
      return {
        avgAngle: 0,
        variance: 0,
        consistency: 0,
        rectangleLikeness: 0,
        triangleLikeness: 0
      };
    }
    const avgAngle = angles.reduce((sum, a) => sum + a, 0) / angles.length;
    const variance = angles.reduce((sum, a) => sum + Math.pow(a - avgAngle, 2), 0) / angles.length;
    const stdDev = Math.sqrt(variance);
    const consistency = angles.length > 1 ? Math.max(0, 1 - stdDev / (Math.PI / 4)) : 1;
    const rectangleLikeness = angles.reduce((sum, angle) => {
      const deviationFrom90 = Math.abs(angle - Math.PI / 2);
      return sum + Math.max(0, 1 - deviationFrom90 / (Math.PI / 4));
    }, 0) / angles.length;
    const triangleLikeness = angles.reduce((sum, angle) => {
      const deviationFrom90 = Math.abs(angle - Math.PI / 2);
      return sum + Math.min(1, deviationFrom90 / (Math.PI / 6));
    }, 0) / angles.length;
    return {
      avgAngle,
      variance,
      consistency,
      rectangleLikeness,
      triangleLikeness
    };
  }
  function checkOvershoot(points, threshold = 50) {
    if (points.length < 10) return false;
    const start = points[0];
    const bounds = getBounds(points);
    const size = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
    const effectiveThreshold = Math.min(threshold, size * 0.2);
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
  function getFingerprint(points, scale = 1) {
    const bounds = getBounds(points);
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const closed = isStrokeClosed(points, 50 * scale);
    const cornerData = countCorners(points, {}, closed);
    const start = points[0];
    const end = points[points.length - 1];
    const closureDistance = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );
    const angleAnalysis = analyzeCornerAngles(cornerData.angles);
    let tipPoint;
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
      bounds,
      size: Math.max(width, height),
      corners: cornerData.count,
      cornerAngles: cornerData.angles,
      cornerData: cornerData.cornerData,
      tipPoint,
      angleAnalysis,
      pointCount: points.length,
      start: points[0],
      end: points[points.length - 1]
    };
  }
  function smoothStroke(points, iterations = 2) {
    if (!points || points.length < 3) return points;
    let smoothed = [...points];
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    for (let iter = 0; iter < iterations; iter++) {
      const newPoints = [];
      newPoints.push({ ...smoothed[0] });
      for (let i = 0; i < smoothed.length - 1; i++) {
        const p1 = smoothed[i];
        const p2 = smoothed[i + 1];
        const q = {
          x: 0.75 * p1.x + 0.25 * p2.x,
          y: 0.75 * p1.y + 0.25 * p2.y
        };
        const r = {
          x: 0.25 * p1.x + 0.75 * p2.x,
          y: 0.25 * p1.y + 0.75 * p2.y
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
  function simplifyStroke(points, tolerance = 2) {
    if (!points || points.length <= 2) return points;
    function perpendicularDistance(point, lineStart, lineEnd) {
      const dx = lineEnd.x - lineStart.x;
      const dy = lineEnd.y - lineStart.y;
      if (dx === 0 && dy === 0) {
        return calculateDistance(point, lineStart);
      }
      const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);
      const clampedT = Math.max(0, Math.min(1, t));
      const projection = {
        x: lineStart.x + clampedT * dx,
        y: lineStart.y + clampedT * dy
      };
      return calculateDistance(point, projection);
    }
    function douglasPeucker(pts, tol) {
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
        const right2 = douglasPeucker(pts.slice(maxIndex), tol);
        return [...left.slice(0, -1), ...right2];
      }
      return [start, end];
    }
    return douglasPeucker(points, tolerance);
  }
  function normalizeStroke(points, targetSize = 200) {
    if (!points || points.length === 0) return points;
    const bounds = getBounds(points);
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const maxDim = Math.max(width, height);
    if (maxDim === 0) return points;
    const scale = targetSize / maxDim;
    const originalCenterX = (bounds.minX + bounds.maxX) / 2;
    const originalCenterY = (bounds.minY + bounds.maxY) / 2;
    return points.map((p) => ({
      x: (p.x - originalCenterX) * scale + originalCenterX,
      y: (p.y - originalCenterY) * scale + originalCenterY
    }));
  }
  function distancePointToBounds(p, b) {
    const dx = Math.max(0, b.minX - p.x, p.x - b.maxX);
    const dy = Math.max(0, b.minY - p.y, p.y - b.maxY);
    return Math.sqrt(dx * dx + dy * dy);
  }
  function boundingBoxDistance(b1, b2) {
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
  function boundsOverlap(b1, b2) {
    return !(b1.maxX < b2.minX || b2.maxX < b1.minX || b1.maxY < b2.minY || b2.maxY < b1.minY);
  }
  function boundsContain(outer, inner) {
    return inner.minX >= outer.minX && inner.maxX <= outer.maxX && inner.minY >= outer.minY && inner.maxY <= outer.maxY;
  }

  // src/recognition.ts
  function fit(value, ideal, tolerance) {
    return Math.max(0, 1 - Math.abs(value - ideal) / tolerance);
  }
  function ramp(value, lo, hi) {
    return Math.max(0, Math.min(1, (value - lo) / (hi - lo)));
  }
  var DEG = Math.PI / 180;
  function meanTurn(fp) {
    const a = fp.cornerAngles;
    if (!a || a.length === 0) return 0;
    return a.reduce((x, y) => x + y, 0) / a.length;
  }
  var MIN_CONFIDENCE = 0.35;
  var MAX_TIER0_CONFIDENCE = 0.92;
  function result(type, label, fitScore, reasoning) {
    const confidence = fitScore * MAX_TIER0_CONFIDENCE;
    if (confidence < MIN_CONFIDENCE) return null;
    return { type, label, score: Math.round(confidence * 100), confidence, reasoning };
  }
  function detectLine(fp, points, scale = 1) {
    if (fp.isClosed || checkOvershoot(points, 50 * scale)) return null;
    const straight = ramp(fp.straightness, 0.55, 0.95);
    const corners = fit(fp.corners, 0, 3);
    const confidence = straight * 0.7 + corners * 0.3;
    return result(
      "line",
      "Line",
      confidence,
      `open, straightness ${fp.straightness.toFixed(2)}, ${fp.corners} corner(s)`
    );
  }
  function detectArc(fp, points, scale = 1) {
    if (fp.isClosed || checkOvershoot(points, 50 * scale)) return null;
    const curved = 1 - ramp(fp.straightness, 0.25, 0.8);
    const smooth = fit(fp.corners, 0, 2.5);
    const confidence = curved * 0.6 + smooth * 0.4;
    return result(
      "arc",
      "Arc",
      confidence,
      `open, curved (straightness ${fp.straightness.toFixed(2)}), ${fp.corners} corner(s)`
    );
  }
  function detectTriangle(fp) {
    if (!fp.isClosed) return null;
    if (fp.aspectRatio < 0.14 || fp.aspectRatio > 7) return null;
    const area2 = fit(fp.extent, 0.5, 0.3);
    const corners = fit(fp.corners, 3, 2);
    const turn = fp.cornerAngles?.length ? fit(meanTurn(fp), 120 * DEG, 70 * DEG) : 0.5;
    const confidence = area2 * 0.5 + corners * 0.35 + turn * 0.15;
    return result(
      "triangle",
      "Triangle",
      confidence,
      `closed, ${fp.corners} corner(s), fills ${(fp.extent * 100).toFixed(0)}% of its box (a triangle fills ~50%)`
    );
  }
  function detectRectangle(fp) {
    if (!fp.isClosed) return null;
    if (fp.aspectRatio < 0.05 || fp.aspectRatio > 20) return null;
    const area2 = fit(fp.extent, 1, 0.45);
    const corners = fit(fp.corners, 4, 2.5);
    const turn = fp.cornerAngles?.length ? fit(meanTurn(fp), 90 * DEG, 55 * DEG) : 0.5;
    const confidence = area2 * 0.45 + corners * 0.35 + turn * 0.2;
    return result(
      "rectangle",
      "Rectangle",
      confidence,
      `closed, ${fp.corners} corner(s) near ${Math.round(meanTurn(fp) / DEG)}\xB0, fills ${(fp.extent * 100).toFixed(0)}% of its box (a rectangle fills ~100%)`
    );
  }
  function detectCircle(fp, points, scale = 1) {
    const hasOvershoot = checkOvershoot(points, 50 * scale);
    if (!fp.isClosed && !hasOvershoot) return null;
    if (fp.aspectRatio < 0.3 || fp.aspectRatio > 3.3) return null;
    const smooth = fit(fp.corners, 0, 3);
    const area2 = fit(fp.extent, Math.PI / 4, 0.28);
    const curved = 1 - ramp(fp.straightness, 0.2, 0.6);
    const confidence = smooth * 0.45 + area2 * 0.4 + curved * 0.15;
    return result(
      "circle",
      "Circle",
      confidence,
      `closed${hasOvershoot ? " (overshoot)" : ""}, ${fp.corners} corner(s), fills ${(fp.extent * 100).toFixed(0)}% of its box (a circle fills ~79%), aspect ${fp.aspectRatio.toFixed(2)}`
    );
  }
  function analyzeStroke(points, scale = 1) {
    const fingerprint = getFingerprint(points, scale);
    const results = [
      detectLine(fingerprint, points, scale),
      detectArc(fingerprint, points, scale),
      detectTriangle(fingerprint),
      detectRectangle(fingerprint),
      detectCircle(fingerprint, points, scale)
    ].filter((r) => r !== null);
    results.sort((a, b) => b.confidence - a.confidence);
    return { fingerprint, results };
  }
  function matchPrimitiveFromLibrary(fingerprint, libraryFingerprint) {
    let totalScore = 0;
    let weights = 0;
    const straightnessDiff = Math.abs(
      fingerprint.straightness - libraryFingerprint.straightness
    );
    if (straightnessDiff > 0.5) return 0;
    const straightnessScore = Math.max(0, 1 - straightnessDiff);
    totalScore += straightnessScore * 0.3;
    weights += 0.3;
    const aspectRatio1 = Math.min(fingerprint.aspectRatio, 1 / fingerprint.aspectRatio);
    const aspectRatio2 = Math.min(
      libraryFingerprint.aspectRatio,
      1 / libraryFingerprint.aspectRatio
    );
    const aspectDiff = Math.abs(aspectRatio1 - aspectRatio2);
    const aspectScore = Math.max(0, 1 - aspectDiff * 2);
    totalScore += aspectScore * 0.25;
    weights += 0.25;
    const cornerDiff = Math.abs(fingerprint.corners - libraryFingerprint.corners);
    const cornerScore = Math.max(0, 1 - cornerDiff / 4);
    totalScore += cornerScore * 0.2;
    weights += 0.2;
    const closureMatch = fingerprint.isClosed === libraryFingerprint.isClosed ? 1 : 0;
    totalScore += closureMatch * 0.15;
    weights += 0.15;
    const sizeDiff = Math.abs(fingerprint.size - libraryFingerprint.size) / Math.max(fingerprint.size, libraryFingerprint.size);
    const sizeScore = Math.max(0, 1 - sizeDiff);
    totalScore += sizeScore * 0.1;
    weights += 0.1;
    return totalScore / weights;
  }

  // src/spatial.ts
  function buildSpatialGraph(components, detectIntersections) {
    const connections = [];
    const containment = [];
    for (let i = 0; i < components.length; i++) {
      for (let j = i + 1; j < components.length; j++) {
        const compA = components[i];
        const compB = components[j];
        const isLineA = compA.type === "line" || compA.recognizedAs === "line";
        const isLineB = compB.type === "line" || compB.recognizedAs === "line";
        if (!isLineA && !isLineB) {
          if (boundsContain(compA.bounds, compB.bounds)) {
            containment.push({ outer: i, inner: j });
            continue;
          }
          if (boundsContain(compB.bounds, compA.bounds)) {
            containment.push({ outer: j, inner: i });
            continue;
          }
        }
        if (boundsOverlap(compA.bounds, compB.bounds)) {
          let intersectionPoints;
          if (detectIntersections && compA.geometricShape && compB.geometricShape) {
            const found = detectIntersections(compA.geometricShape, compB.geometricShape);
            if (found.length > 0) intersectionPoints = found;
          }
          connections.push({
            a: i,
            b: j,
            relationship: "intersecting",
            distance: 0,
            intersectionPoints
          });
          continue;
        }
        const distance = boundingBoxDistance(compA.bounds, compB.bounds);
        if (distance < 50) {
          connections.push({ a: i, b: j, relationship: "touching", distance });
        }
      }
    }
    return { connections, containment };
  }
  function spatialCluster(components, proximityThreshold) {
    if (components.length === 0) return [];
    if (components.length === 1) return [components];
    const clusters2 = [];
    const assigned = /* @__PURE__ */ new Set();
    components.forEach((comp, idx) => {
      if (assigned.has(idx)) return;
      const cluster = [comp];
      assigned.add(idx);
      let changed = true;
      while (changed) {
        changed = false;
        components.forEach((other, otherIdx) => {
          if (assigned.has(otherIdx)) return;
          for (const member of cluster) {
            const dist = boundingBoxDistance(member.bounds, other.bounds);
            if (dist < proximityThreshold) {
              cluster.push(other);
              assigned.add(otherIdx);
              changed = true;
              break;
            }
          }
        });
      }
      clusters2.push(cluster);
    });
    return clusters2;
  }

  // src/session/nodes.ts
  var BUILTIN_TYPES = ["circle", "line", "rectangle", "triangle", "arc"];
  function typeNodeId(type) {
    return `type:${type}`;
  }
  var LOCAL_PARTICIPANT = "participant:local";
  var TIER0_PARTICIPANT = "participant:tier0";
  function createParticipantNode(id, kind, name, at, capability = 0) {
    return {
      id,
      reps: [
        { modality: "participant", data: { kind } },
        { modality: "word", data: name }
      ],
      edges: [],
      capability,
      createdAt: at
    };
  }
  function createExplanationNode(id, data, aboutIds, bounds, participantId, capability, at) {
    return {
      id,
      reps: [
        { modality: "explanation", data, source: participantId },
        { modality: "bounds", data: bounds }
      ],
      edges: [
        // `about` is inferred, not blessed: the human may disagree that this
        // answer is about these marks, and ignoring it is a valid response.
        ...aboutIds.map((to) => ({ to, rel: "about" })),
        { to: participantId, rel: "made-by", blessed: true }
      ],
      capability,
      createdAt: at
    };
  }
  function isExplanation(node) {
    return node.reps.some((r) => r.modality === "explanation");
  }
  function explanationOf(node) {
    return getRep(node, "explanation")?.data;
  }
  function aboutIdsOf(node) {
    return node.edges.filter((e) => e.rel === "about").map((e) => e.to);
  }
  function isParticipant(node) {
    return getRep(node, "participant") !== void 0;
  }
  function createBootstrapNodes(at) {
    return [
      ...BUILTIN_TYPES.map((t) => ({
        id: typeNodeId(t),
        reps: [{ modality: "word", data: t, source: "bootstrap" }],
        edges: [],
        capability: 0,
        createdAt: at
      })),
      createParticipantNode(LOCAL_PARTICIPANT, "human", "local", at),
      createParticipantNode(TIER0_PARTICIPANT, "engine", "tier0-heuristics", at)
    ];
  }
  function getRep(node, modality) {
    return node.reps.find((r) => r.modality === modality);
  }
  function fingerprintOf(node) {
    return getRep(node, "fingerprint")?.data;
  }
  function strokePointsOf(node) {
    const rep = getRep(node, "stroke");
    if (!rep) return void 0;
    const points = rep.data.points;
    const to = getRep(node, "transform")?.data;
    if (!to) return points;
    const from = getBounds(points);
    const fw = Math.max(1e-6, from.maxX - from.minX);
    const fh = Math.max(1e-6, from.maxY - from.minY);
    const sx = (to.maxX - to.minX) / fw;
    const sy = (to.maxY - to.minY) / fh;
    return points.map((p) => ({
      ...p,
      x: to.minX + (p.x - from.minX) * sx,
      y: to.minY + (p.y - from.minY) * sy
    }));
  }
  function wordOf(node) {
    return getRep(node, "word")?.data;
  }
  function isGesture(node) {
    return getRep(node, "gesture") !== void 0;
  }
  function resemblances(node) {
    return node.edges.filter((e) => e.rel === "resembles").sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
  }
  function topInterpretation(node) {
    const name = wordOf(node);
    if (name) return name;
    const top = resemblances(node)[0];
    return top ? top.to.replace(/^type:/, "") : void 0;
  }
  function boundsOf(node) {
    const moved = getRep(node, "transform")?.data;
    if (moved) return moved;
    const fp = fingerprintOf(node);
    if (fp) return fp.bounds;
    return getRep(node, "bounds")?.data;
  }

  // src/session/erase.ts
  var DEFAULT_ERASE_CROSSINGS = 3;
  function segmentsIntersect(p1, p2, p3, p4) {
    const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
    if (Math.abs(d) < 1e-10) return false;
    const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
    const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }
  function outlineOf(target) {
    if (target.points && target.points.length >= 2) {
      const pts = target.points;
      if (target.closed) return pts.concat([pts[0]]);
      return pts;
    }
    const b = target.bounds;
    if (!b) return null;
    return [
      { x: b.minX, y: b.minY },
      { x: b.maxX, y: b.minY },
      { x: b.maxX, y: b.maxY },
      { x: b.minX, y: b.maxY },
      { x: b.minX, y: b.minY }
    ];
  }
  function countCrossings(stroke, outline, max = DEFAULT_ERASE_CROSSINGS) {
    let n2 = 0;
    for (let i = 1; i < stroke.length; i++) {
      for (let j = 1; j < outline.length; j++) {
        if (segmentsIntersect(stroke[i - 1], stroke[i], outline[j - 1], outline[j])) {
          n2++;
          if (n2 >= max) return n2;
        }
      }
    }
    return n2;
  }
  function scratchedOut(points, targets, minCrossings = DEFAULT_ERASE_CROSSINGS) {
    if (points.length < 3) return [];
    const hit = [];
    for (const t of targets) {
      const outline = outlineOf(t);
      if (!outline) continue;
      if (countCrossings(points, outline, minCrossings) >= minCrossings) hit.push(t.id);
    }
    return hit;
  }

  // src/session/commandmark.ts
  var COMMAND_MARK_SAMPLES = 5;
  var FEATURES = [
    "straightness",
    "corners",
    "aspect",
    "closureRatio",
    /** Shorter arm over longer arm, split at the sharpest corner. A V is 1.0; a check ~0.6. */
    "armRatio",
    /** How sharp that corner turns, 0–1 of a half turn. */
    "turnSharpness",
    /** Where the corner sits vertically in the stroke's box. 0 = top (caret), 1 = bottom (check). */
    "vertexDepth",
    /** How much higher the stroke ends than it began, as a fraction of its height. */
    "endRise"
  ];
  var TOLERANCE_FLOOR = {
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
    endRise: 0.42
  };
  var SPREAD_MULTIPLIER = 2.5;
  function dominantCorner(fp) {
    const corners = fp.cornerData;
    if (!corners || corners.length === 0) return null;
    return corners.reduce((best, c) => c.angle > best.angle ? c : best, corners[0]);
  }
  function commandMarkFeatures(fp) {
    const w2 = Math.max(1, fp.bounds.maxX - fp.bounds.minX);
    const h2 = Math.max(1, fp.bounds.maxY - fp.bounds.minY);
    const size = Math.max(1, fp.size);
    const corner = dominantCorner(fp);
    const t = corner ? corner.t : 0.5;
    const armRatio = Math.min(t, 1 - t) / Math.max(t, 1 - t, 1e-6);
    return {
      straightness: fp.straightness,
      corners: fp.corners,
      // Orientation-free proportion: a tall mark and a wide one read alike.
      aspect: Math.min(w2, h2) / Math.max(w2, h2),
      closureRatio: Math.min(1, fp.closureDistance / size),
      armRatio: corner ? armRatio : 1,
      turnSharpness: corner ? corner.angle / Math.PI : 0,
      vertexDepth: corner ? (corner.y - fp.bounds.minY) / h2 : 0.5,
      endRise: (fp.start.y - fp.end.y) / h2
    };
  }
  function mean(xs) {
    return xs.reduce((a, b) => a + b, 0) / xs.length;
  }
  function stddev(xs) {
    if (xs.length < 2) return 0;
    const m = mean(xs);
    return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
  }
  function learnCommandMark(samples, name = "command") {
    if (samples.length < 2) throw new Error("a command mark needs at least 2 samples");
    const fps = samples.map((s) => getFingerprint(s));
    const perFeature = fps.map(commandMarkFeatures);
    const features = {};
    const tolerance = {};
    const spreadRatios = [];
    for (const f of FEATURES) {
      const values = perFeature.map((p) => p[f]);
      features[f] = mean(values);
      const sd = stddev(values);
      tolerance[f] = Math.max(sd * SPREAD_MULTIPLIER, TOLERANCE_FLOOR[f]);
      spreadRatios.push(Math.min(1, sd * SPREAD_MULTIPLIER / tolerance[f]));
    }
    const closedCount = fps.filter((f) => f.isClosed).length;
    return {
      name,
      features,
      tolerance,
      isClosed: closedCount > samples.length / 2,
      sampleCount: samples.length,
      consistency: 1 - mean(spreadRatios)
    };
  }
  function matchesCommandMark(fp, mark) {
    if (fp.isClosed !== mark.isClosed) {
      return { match: false, score: 0, failedOn: "closureRatio" };
    }
    const f = commandMarkFeatures(fp);
    let worst = 0;
    let worstFeature = FEATURES[0];
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
  function collidesWith(mark, existing) {
    return existing.some((fp) => matchesCommandMark(fp, mark).match);
  }
  function canonicalCheckSamples() {
    const check = (w2, h2, dip, rise, slant = 0) => {
      const start = { x: 0, y: 0 };
      const vertex = { x: w2 * dip, y: h2 };
      const end = { x: w2, y: -h2 * rise + w2 * slant };
      const seg = (a, b, n2) => Array.from({ length: n2 }, (_, i) => ({
        x: a.x + (b.x - a.x) * (i / (n2 - 1)),
        y: a.y + (b.y - a.y) * (i / (n2 - 1))
      }));
      return seg(start, vertex, 34).concat(seg(vertex, end, 44).slice(1));
    };
    return [
      check(70, 35, 0.36, 0.45),
      check(64, 40, 0.33, 0.52),
      check(78, 32, 0.38, 0.4),
      check(60, 36, 0.34, 0.58, 0.06),
      check(74, 38, 0.35, 0.47, -0.05)
    ];
  }
  var BUILTIN_COMMAND_MARK = learnCommandMark(
    canonicalCheckSamples(),
    "check"
  );

  // src/session/gesture.ts
  var DEFAULT_GESTURE_CONFIG = {
    checkWindowMs: 4e3,
    checkProximityRatio: 0.15,
    checkMaxSizeRatio: 0.6,
    commandMark: null
  };
  function isLassoLike(fp, enclosedContentCount) {
    return fp.isClosed && enclosedContentCount >= 1;
  }
  function enclosedBy(lassoBounds, candidates) {
    return candidates.filter((c) => boundsContain(lassoBounds, c.bounds)).map((c) => c.id);
  }
  function isCheckLike(fp, lassoFp, config = DEFAULT_GESTURE_CONFIG) {
    if (fp.size > lassoFp.size * config.checkMaxSizeRatio) return false;
    return matchesCommandMark(fp, BUILTIN_COMMAND_MARK).match;
  }
  function strokesIntersect(a, b) {
    for (let i = 1; i < a.length; i++) {
      for (let j = 1; j < b.length; j++) {
        if (segmentsIntersect(a[i - 1], a[i], b[j - 1], b[j])) return true;
      }
    }
    return false;
  }
  function resolvesLasso(checkFp, checkAt, lassoFp, lassoAt, config = DEFAULT_GESTURE_CONFIG, strokes) {
    if (checkAt - lassoAt > config.checkWindowMs) return false;
    const mark = config.commandMark ?? BUILTIN_COMMAND_MARK;
    if (checkFp.size > lassoFp.size * config.checkMaxSizeRatio) return false;
    if (!matchesCommandMark(checkFp, mark).match) return false;
    if (strokes && strokesIntersect(strokes.check, strokes.lasso)) return true;
    if (boundsOverlap(checkFp.bounds, lassoFp.bounds)) return true;
    return boundingBoxDistance(checkFp.bounds, lassoFp.bounds) < lassoFp.size * config.checkProximityRatio;
  }
  function whyNotResolved(checkFp, checkAt, lassoFp, lassoAt, config = DEFAULT_GESTURE_CONFIG, strokes) {
    const mark = config.commandMark ?? BUILTIN_COMMAND_MARK;
    const match = matchesCommandMark(checkFp, mark);
    const shapeOk = match.match;
    if (checkAt - lassoAt > config.checkWindowMs) {
      return {
        reason: "too-late",
        detail: `the circle had been waiting more than ${Math.round(config.checkWindowMs / 1e3)}s`,
        nearMiss: shapeOk
      };
    }
    if (checkFp.size > lassoFp.size * config.checkMaxSizeRatio) {
      return {
        reason: "too-big",
        detail: "the mark was too large for what it was marking",
        nearMiss: shapeOk
      };
    }
    if (!shapeOk) {
      const engaged = strokes && strokesIntersect(strokes.check, strokes.lasso) || boundsOverlap(checkFp.bounds, lassoFp.bounds);
      return {
        reason: "not-the-mark",
        detail: match.failedOn ? `that is not the ${mark.name} \u2014 ${readable(match.failedOn)}` : `that is not the ${mark.name}`,
        nearMiss: !!engaged && !checkFp.isClosed
      };
    }
    return {
      reason: "not-engaged",
      detail: "the mark has to cross or touch the circle",
      nearMiss: true
    };
  }
  function readable(feature) {
    switch (feature) {
      case "armRatio":
        return "its two halves are the wrong lengths";
      case "turnSharpness":
        return "its corner is the wrong sharpness";
      case "vertexDepth":
        return "its corner is in the wrong place";
      case "endRise":
        return "it ends at the wrong height";
      case "closureRatio":
        return "its ends join up";
      case "corners":
        return "it has the wrong number of corners";
      case "aspect":
        return "its proportions are wrong";
      case "straightness":
        return "it is too curved";
      default:
        return `its ${feature} is off`;
    }
  }

  // src/session/regions.ts
  var rectOf = (b) => ({
    x: b.minX,
    y: b.minY,
    w: b.maxX - b.minX,
    h: b.maxY - b.minY
  });
  var insideOf = (outer, inner) => inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h && !(inner.x === outer.x && inner.y === outer.y && inner.w === outer.w && inner.h === outer.h);
  function frameOf(artifact) {
    const b = getRep(artifact, "bounds")?.data ?? boundsOf(artifact);
    return b ? rectOf(b) : null;
  }
  function regionsOf(artifact, nodes) {
    const frame = frameOf(artifact);
    if (!frame) return [];
    const members = artifact.edges.filter((e) => e.rel === "has-part").map((e) => nodes.get(e.to)).filter((n2) => !!n2 && !getRep(n2, "erased"));
    const sized = members.map((n2) => {
      const b = boundsOf(n2);
      return b ? { node: n2, world: rectOf(b) } : null;
    }).filter((m) => !!m).sort((a, b) => b.world.w * b.world.h - a.world.w * a.world.h);
    const draft = sized.map(({ node, world }, i) => ({
      key: i,
      node,
      world,
      contains: [],
      parent: -1
    }));
    for (const outer of draft) {
      for (const inner of draft) {
        if (outer.key !== inner.key && insideOf(outer.world, inner.world)) {
          outer.contains.push(inner.key);
          inner.parent = outer.key;
        }
      }
    }
    const readingOrder = (a, b) => {
      const overlap = Math.min(a.world.y + a.world.h, b.world.y + b.world.h) - Math.max(a.world.y, b.world.y);
      const shorter = Math.min(a.world.h, b.world.h);
      if (overlap > shorter * 0.5) return a.world.x - b.world.x;
      return a.world.y - b.world.y;
    };
    const ordered2 = [];
    const visit = (parentKey) => {
      draft.filter((d) => d.parent === parentKey).sort(readingOrder).forEach((d) => {
        ordered2.push(d);
        visit(d.key);
      });
    };
    visit(-1);
    const idByKey = new Map(ordered2.map((d, i) => [d.key, `r${i + 1}`]));
    return ordered2.map((d) => ({
      id: idByKey.get(d.key),
      nodeId: d.node.id,
      shape: wordOf(d.node) ?? topInterpretation(d.node) ?? "art",
      rect: { x: d.world.x - frame.x, y: d.world.y - frame.y, w: d.world.w, h: d.world.h },
      world: d.world,
      contains: d.contains.map((k) => idByKey.get(k)).filter(Boolean)
    }));
  }
  function regionAt(regions, x, y) {
    let best = null;
    for (const r of regions) {
      const { world: w2 } = r;
      if (x < w2.x || y < w2.y || x > w2.x + w2.w || y > w2.y + w2.h) continue;
      if (!best || w2.w * w2.h < best.world.w * best.world.h) best = r;
    }
    return best;
  }
  function regionsOverlapping(regions, b) {
    return regions.filter(
      (r) => !(b.maxX < r.world.x || b.minX > r.world.x + r.world.w || b.maxY < r.world.y || b.minY > r.world.y + r.world.h)
    );
  }

  // src/relate/relations.ts
  var DEFAULT_RELATE_CONFIG = {
    nearRatio: 0.6,
    alignRatio: 0.22,
    directionOverlap: 0.3,
    peerRatio: 0.62
  };
  var w = (b) => b.maxX - b.minX;
  var h = (b) => b.maxY - b.minY;
  var cx = (b) => (b.minX + b.maxX) / 2;
  var cy = (b) => (b.minY + b.maxY) / 2;
  var sizeOf = (b) => Math.max(w(b), h(b));
  function overlapFraction(aMin, aMax, bMin, bMax) {
    const shorter = Math.min(aMax - aMin, bMax - bMin);
    if (shorter <= 0) return 0;
    return Math.max(0, Math.min(aMax, bMax) - Math.max(aMin, bMin)) / shorter;
  }
  function crossings(a, b, max = 4) {
    let n2 = 0;
    for (let i = 1; i < a.length; i++) {
      for (let j = 1; j < b.length; j++) {
        if (segmentsIntersect(a[i - 1], a[i], b[j - 1], b[j])) {
          if (++n2 >= max) return n2;
        }
      }
    }
    return n2;
  }
  function relate(marks, config = DEFAULT_RELATE_CONFIG) {
    const out = [];
    const add = (kind, from, to, strength, reasoning) => {
      if (strength > 0) out.push({ kind, from, to, strength: Math.min(1, strength), reasoning });
    };
    for (let i = 0; i < marks.length; i++) {
      for (let j = i + 1; j < marks.length; j++) {
        const a = marks[i];
        const b = marks[j];
        const ab = a.bounds;
        const bb = b.bounds;
        const ref = Math.max(1, Math.min(sizeOf(ab), sizeOf(bb)));
        if (boundsContain(ab, bb)) {
          const margin = Math.min(bb.minX - ab.minX, bb.minY - ab.minY, ab.maxX - bb.maxX, ab.maxY - bb.maxY);
          const strength = Math.min(1, 0.5 + margin / Math.max(1, sizeOf(ab)));
          add("contains", a.id, b.id, strength, `${b.id} sits wholly inside ${a.id}`);
          add("inside", b.id, a.id, strength, `${b.id} sits wholly inside ${a.id}`);
          continue;
        }
        if (boundsContain(bb, ab)) {
          const margin = Math.min(ab.minX - bb.minX, ab.minY - bb.minY, bb.maxX - ab.maxX, bb.maxY - ab.maxY);
          const strength = Math.min(1, 0.5 + margin / Math.max(1, sizeOf(bb)));
          add("contains", b.id, a.id, strength, `${a.id} sits wholly inside ${b.id}`);
          add("inside", a.id, b.id, strength, `${a.id} sits wholly inside ${b.id}`);
          continue;
        }
        const gap = boundingBoxDistance(ab, bb);
        if (a.points && b.points) {
          const n2 = crossings(a.points, b.points);
          if (n2 > 0) {
            add("crossing", a.id, b.id, Math.min(1, 0.5 + n2 * 0.15), `their strokes cross ${n2 === 4 ? "4 or more" : n2} time(s)`);
            add("crossing", b.id, a.id, Math.min(1, 0.5 + n2 * 0.15), `their strokes cross ${n2 === 4 ? "4 or more" : n2} time(s)`);
          }
        }
        if (boundsOverlap(ab, bb)) {
          const depth = overlapFraction(ab.minX, ab.maxX, bb.minX, bb.maxX) * overlapFraction(ab.minY, ab.maxY, bb.minY, bb.maxY);
          add("touching", a.id, b.id, 0.5 + depth * 0.5, "their areas overlap");
          add("touching", b.id, a.id, 0.5 + depth * 0.5, "their areas overlap");
        }
        const nearLimit = config.nearRatio * ref;
        if (gap < nearLimit) {
          const strength = 1 - gap / nearLimit;
          const pct = Math.round(gap / ref * 100);
          add("near", a.id, b.id, strength, `${Math.round(gap)}px apart \u2014 ${pct}% of the smaller mark`);
          add("near", b.id, a.id, strength, `${Math.round(gap)}px apart \u2014 ${pct}% of the smaller mark`);
        }
        const vOverlap = overlapFraction(ab.minY, ab.maxY, bb.minY, bb.maxY);
        const hOverlap = overlapFraction(ab.minX, ab.maxX, bb.minX, bb.maxX);
        if (vOverlap >= config.directionOverlap) {
          const [left, right2] = cx(ab) <= cx(bb) ? [a, b] : [b, a];
          add("left-of", left.id, right2.id, vOverlap, `they share a horizontal band (${Math.round(vOverlap * 100)}%)`);
          add("right-of", right2.id, left.id, vOverlap, `they share a horizontal band (${Math.round(vOverlap * 100)}%)`);
        }
        if (hOverlap >= config.directionOverlap) {
          const [top, bottom2] = cy(ab) <= cy(bb) ? [a, b] : [b, a];
          add("above", top.id, bottom2.id, hOverlap, `they share a vertical band (${Math.round(hOverlap * 100)}%)`);
          add("below", bottom2.id, top.id, hOverlap, `they share a vertical band (${Math.round(hOverlap * 100)}%)`);
        }
        const dy = Math.abs(cy(ab) - cy(bb));
        const dx = Math.abs(cx(ab) - cx(bb));
        const rowTol = config.alignRatio * Math.max(1, Math.min(h(ab), h(bb)));
        const colTol = config.alignRatio * Math.max(1, Math.min(w(ab), w(bb)));
        if (dy < rowTol) {
          add("same-row", a.id, b.id, 1 - dy / rowTol, `centres within ${Math.round(dy)}px vertically`);
          add("same-row", b.id, a.id, 1 - dy / rowTol, `centres within ${Math.round(dy)}px vertically`);
        }
        if (dx < colTol) {
          add("same-column", a.id, b.id, 1 - dx / colTol, `centres within ${Math.round(dx)}px horizontally`);
          add("same-column", b.id, a.id, 1 - dx / colTol, `centres within ${Math.round(dx)}px horizontally`);
        }
        const ratio = Math.min(sizeOf(ab), sizeOf(bb)) / Math.max(1, Math.max(sizeOf(ab), sizeOf(bb)));
        if (ratio > config.peerRatio) {
          add("same-size", a.id, b.id, ratio, `within ${Math.round((1 - ratio) * 100)}% of each other in size`);
          add("same-size", b.id, a.id, ratio, `within ${Math.round((1 - ratio) * 100)}% of each other in size`);
        }
      }
    }
    return out;
  }
  function relationsOf(relations, id) {
    return relations.filter((r) => r.from === id);
  }
  function between(relations, from, to) {
    return relations.filter((r) => r.from === from && r.to === to);
  }
  function has(relations, kind, from, to) {
    return relations.find((r) => r.kind === kind && r.from === from && r.to === to);
  }
  function clusters(marks, relations) {
    const linked = /* @__PURE__ */ new Map();
    for (const m of marks) linked.set(m.id, /* @__PURE__ */ new Set());
    for (const r of relations) {
      if (r.kind !== "near" && r.kind !== "touching" && r.kind !== "crossing" && r.kind !== "contains") continue;
      linked.get(r.from)?.add(r.to);
      linked.get(r.to)?.add(r.from);
    }
    const seen = /* @__PURE__ */ new Set();
    const out = [];
    for (const m of marks) {
      if (seen.has(m.id)) continue;
      const group2 = [];
      const stack = [m.id];
      while (stack.length) {
        const id = stack.pop();
        if (seen.has(id)) continue;
        seen.add(id);
        group2.push(id);
        for (const other of linked.get(id) ?? []) if (!seen.has(other)) stack.push(other);
      }
      out.push(group2);
    }
    return out;
  }
  function describeRelations(relations, ids) {
    const scope = ids ? relations.filter((r) => ids.includes(r.from) && ids.includes(r.to)) : relations;
    if (scope.length === 0) return "No relations between these marks.";
    const byPair = /* @__PURE__ */ new Map();
    for (const r of scope) {
      const key = `${r.from}\u2192${r.to}`;
      (byPair.get(key) ?? byPair.set(key, []).get(key)).push(r);
    }
    const lines = [];
    for (const [pair, rels] of byPair) {
      const kinds = rels.sort((a, b) => b.strength - a.strength).map((r) => `${r.kind} (${r.strength.toFixed(2)})`).join(", ");
      lines.push(`  ${pair}: ${kinds}`);
    }
    return lines.join("\n");
  }

  // src/concepts/concept.ts
  var NAME = {
    id: "name",
    label: "Name this\u2026",
    tier: 0,
    effect: { kind: "name" },
    hint: "hold it as a thing you can use again"
  };
  var prompt = (id, label, seed, hint) => ({
    id,
    label,
    tier: 2,
    effect: { kind: "prompt", seed },
    hint
  });
  var tidy = (axis) => ({
    id: `tidy-${axis}`,
    label: axis === "row" ? "Line up across" : "Line up down",
    tier: 0,
    effect: { kind: "tidy", axis },
    hint: "align and space them evenly"
  });
  var EQUALIZE = {
    id: "equalize",
    label: "Match sizes",
    tier: 0,
    effect: { kind: "equalize" },
    hint: "make them the same size as the largest"
  };
  var strongest = (rels, kind, from, to) => has(rels, kind, from, to)?.strength ?? 0;
  function pairwise(scope, kind) {
    const { ids, relations } = scope;
    if (ids.length < 2) return 0;
    let total = 0;
    let pairs = 0;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        total += strongest(relations, kind, ids[i], ids[j]);
        pairs++;
      }
    }
    return pairs ? total / pairs : 0;
  }
  function ordered(scope, axis) {
    const centre = (id) => {
      const b = scope.marks.find((m) => m.id === id).bounds;
      return axis === "x" ? (b.minX + b.maxX) / 2 : (b.minY + b.maxY) / 2;
    };
    return [...scope.ids].sort((a, b) => centre(a) - centre(b));
  }
  function chainStrength(scope, kind, axis) {
    if (scope.ids.length < 2) return 0;
    const seq = ordered(scope, axis);
    let total = 0;
    for (let i = 1; i < seq.length; i++) total += strongest(scope.relations, kind, seq[i - 1], seq[i]);
    return total / (seq.length - 1);
  }
  function nested(scope) {
    return scope.relations.some(
      (r) => r.kind === "contains" && scope.ids.includes(r.from) && scope.ids.includes(r.to)
    );
  }
  function runOfPeers(scope, axis) {
    const beside = axis === "x" ? "left-of" : "above";
    const shares = axis === "x" ? "same-row" : "same-column";
    if (scope.ids.length < 2) return null;
    if (scope.ids.some((id) => !isClosed(scope, id))) return null;
    if (nested(scope)) return null;
    const seq = ordered(scope, axis);
    const bands2 = [];
    for (let i = 1; i < seq.length; i++) {
      const strength = strongest(scope.relations, beside, seq[i - 1], seq[i]);
      if (strength === 0) return null;
      const adjacent = strongest(scope.relations, "near", seq[i - 1], seq[i]) || strongest(scope.relations, "touching", seq[i - 1], seq[i]);
      if (adjacent === 0) return null;
      bands2.push(strength);
    }
    const band = bands2.reduce((a, b) => a + b, 0) / bands2.length;
    const peers = pairwise(scope, "same-size");
    const close = chainStrength(scope, "near", axis);
    const aligned = chainStrength(scope, shares, axis);
    if (peers < 0.3) return null;
    return {
      confidence: band * 0.3 + peers * 0.3 + close * 0.2 + aligned * 0.2,
      reasoning: `${scope.ids.length} comparable marks sitting ${axis === "x" ? "side by side" : "one under another"} (overlap ${band.toFixed(2)}, similarity ${peers.toFixed(2)}) \u2014 ` + (aligned > 0.6 ? "already well lined up" : aligned > 0.25 ? "roughly lined up" : "not lined up yet")
    };
  }
  var closedShapes = /* @__PURE__ */ new Set(["rectangle", "circle", "triangle"]);
  var isClosed = (scope, id) => closedShapes.has(scope.shapes[id] ?? "");
  var isLine = (scope, id) => (scope.shapes[id] ?? "") === "line";
  var BUILTIN_CONCEPTS = [
    {
      name: "row",
      describes: "peers side by side",
      conversions: [
        tidy("row"),
        EQUALIZE,
        NAME,
        prompt("nav", "Make a nav bar", "a navigation bar", "links across the top"),
        prompt("cols", "Make columns", "a page laid out in columns", "equal columns of content")
      ],
      match(scope) {
        return runOfPeers(scope, "x");
      }
    },
    {
      name: "column",
      describes: "peers stacked",
      conversions: [
        tidy("column"),
        EQUALIZE,
        NAME,
        prompt("list", "Make a list", "a vertical list of items", "one item per row"),
        prompt("form", "Make a form", "a form with labelled fields", "fields stacked down the page")
      ],
      match(scope) {
        return runOfPeers(scope, "y");
      }
    },
    {
      name: "frame",
      describes: "a mark holding others",
      conversions: [
        NAME,
        prompt("card", "Make a card", "a card with a heading and body", "contents inside a bordered box"),
        prompt("page", "Make a page", "a page", "the outer mark becomes the page")
      ],
      match(scope) {
        const outer = scope.ids.filter(
          (id) => scope.relations.some((r) => r.kind === "contains" && r.from === id && scope.ids.includes(r.to))
        );
        if (outer.length === 0) return null;
        const held = scope.relations.filter(
          (r) => r.kind === "contains" && outer.includes(r.from) && scope.ids.includes(r.to)
        );
        const strength = held.reduce((a, r) => a + r.strength, 0) / held.length;
        return {
          confidence: Math.min(0.95, 0.45 + strength * 0.5),
          reasoning: `${outer.length} mark(s) wholly enclose ${new Set(held.map((r) => r.to)).size} other(s)`,
          roles: { container: outer, contents: [...new Set(held.map((r) => r.to))] }
        };
      }
    },
    {
      name: "flow",
      describes: "marks joined by lines",
      conversions: [
        NAME,
        prompt("flowchart", "Make a flowchart", "a flowchart with labelled steps", "boxes and arrows as steps"),
        prompt("pipeline", "Make a pipeline", "a processing pipeline", "each box a stage")
      ],
      match(scope) {
        const lines = scope.ids.filter((id) => isLine(scope, id));
        const nodes = scope.ids.filter((id) => isClosed(scope, id));
        if (lines.length === 0 || nodes.length < 2) return null;
        const links = lines.filter((l) => {
          const ends = nodes.filter(
            (n2) => strongest(scope.relations, "crossing", l, n2) > 0 || strongest(scope.relations, "touching", l, n2) > 0 || strongest(scope.relations, "near", l, n2) > 0.55
          );
          return ends.length >= 2;
        });
        if (links.length === 0) return null;
        return {
          confidence: Math.min(0.9, 0.45 + links.length / Math.max(1, nodes.length - 1) * 0.45),
          reasoning: `${nodes.length} closed marks joined by ${links.length} connector(s)`,
          roles: { nodes, links }
        };
      }
    },
    {
      name: "grid",
      describes: "rows and columns of peers",
      conversions: [
        EQUALIZE,
        NAME,
        prompt("table", "Make a table", "a table with a header row", "cells in rows and columns"),
        prompt("gallery", "Make a gallery", "a gallery of cards", "a card per cell")
      ],
      match(scope) {
        if (scope.ids.length < 4) return null;
        if (scope.ids.some((id) => !isClosed(scope, id))) return null;
        const rows = chainStrength(scope, "same-row", "x");
        const cols = chainStrength(scope, "same-column", "y");
        const peers = pairwise(scope, "same-size");
        if (pairwise(scope, "same-row") < 0.2 || pairwise(scope, "same-column") < 0.2) return null;
        if (peers < 0.4) return null;
        return {
          confidence: Math.min(0.9, (rows + cols) * 0.3 + peers * 0.4),
          reasoning: `${scope.ids.length} peers aligned on both axes`
        };
      }
    },
    {
      name: "labelled",
      describes: "a mark with something written in it",
      conversions: [
        NAME,
        prompt("button", "Make a button", "a button with that label", "the inner mark is the label"),
        prompt("field", "Make an input", "a labelled input field", "the inner mark is the placeholder")
      ],
      match(scope) {
        const contains = scope.relations.filter(
          (r) => r.kind === "contains" && scope.ids.includes(r.from) && scope.ids.includes(r.to)
        );
        if (contains.length === 0) return null;
        const writing = contains.filter((r) => !isClosed(scope, r.to));
        if (writing.length === 0) return null;
        return {
          confidence: Math.min(0.85, 0.4 + writing.length * 0.15),
          reasoning: `a closed mark holding ${writing.length} open mark(s) \u2014 writing, not structure`,
          roles: { box: [...new Set(writing.map((r) => r.from))], label: writing.map((r) => r.to) }
        };
      }
    }
  ];
  function matchConcepts(scope, library = BUILTIN_CONCEPTS) {
    const out = [];
    for (const concept of library) {
      const m = concept.match(scope);
      if (!m || m.confidence <= 0) continue;
      out.push({ concept: concept.name, conversions: concept.conversions, ...m });
    }
    return out.sort((a, b) => b.confidence - a.confidence);
  }

  // src/parse/layout.ts
  var area = (r) => r.w * r.h;
  var right = (r) => r.x + r.w;
  var bottom = (r) => r.y + r.h;
  function hull(rects) {
    const x = Math.min(...rects.map((r) => r.x));
    const y = Math.min(...rects.map((r) => r.y));
    return {
      x,
      y,
      w: Math.max(...rects.map(right)) - x,
      h: Math.max(...rects.map(bottom)) - y
    };
  }
  function bands(nodes, axis) {
    if (nodes.length < 2) return null;
    const start = (n2) => axis === "y" ? n2.rect.y : n2.rect.x;
    const end = (n2) => axis === "y" ? bottom(n2.rect) : right(n2.rect);
    const sorted = [...nodes].sort((a, b) => start(a) - start(b));
    const groups = [[sorted[0]]];
    const gaps = [];
    let reach = end(sorted[0]);
    for (let i = 1; i < sorted.length; i++) {
      const n2 = sorted[i];
      if (start(n2) > reach) {
        gaps.push(start(n2) - reach);
        groups.push([n2]);
      } else {
        groups[groups.length - 1].push(n2);
      }
      reach = Math.max(reach, end(n2));
    }
    if (groups.length < 2) return null;
    return { groups, gap: Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) };
  }
  var counter = 0;
  function group(nodes, preferAxis) {
    if (nodes.length === 1) return nodes[0];
    const first = bands(nodes, preferAxis);
    const other = preferAxis === "y" ? "x" : "y";
    const cut = first ?? bands(nodes, other);
    const axis = first ? preferAxis : other;
    const rect2 = hull(nodes.map((n2) => n2.rect));
    if (!cut) {
      return {
        id: `g${++counter}`,
        region: null,
        rect: rect2,
        flow: "stack",
        children: nodes,
        fractions: nodes.map(() => 0),
        gap: 0,
        reasoning: `${nodes.length} marks overlap in both directions, so they are placed rather than flowed`
      };
    }
    const flow = axis === "y" ? "column" : "row";
    const children = cut.groups.map((g) => group(g, axis === "y" ? "x" : "y"));
    const span = (r) => axis === "y" ? r.h : r.w;
    const total = children.reduce((a, c) => a + span(c.rect), 0) || 1;
    return {
      id: `g${++counter}`,
      region: null,
      rect: rect2,
      flow,
      children,
      fractions: children.map((c) => Math.round(span(c.rect) / total * 1e3) / 1e3),
      gap: cut.gap,
      reasoning: `${children.length} bands separated by a clean ${axis === "y" ? "horizontal" : "vertical"} gap, so they read as a ${flow}`
    };
  }
  function leafOf(region) {
    return {
      id: region.id,
      region,
      rect: region.rect,
      flow: "leaf",
      children: [],
      fractions: [],
      gap: 0,
      reasoning: `drawn as a ${region.shape}`
    };
  }
  function parseLayout(regions, frame, connections = []) {
    counter = 0;
    if (regions.length === 0) {
      return {
        root: {
          id: "root",
          region: null,
          rect: frame,
          flow: "leaf",
          children: [],
          fractions: [],
          gap: 0,
          reasoning: "nothing was drawn inside the frame"
        },
        connections
      };
    }
    const byId = new Map(regions.map((r) => [r.id, r]));
    const parentOf = /* @__PURE__ */ new Map();
    for (const r of regions) {
      let best = null;
      for (const other of regions) {
        if (other.id === r.id || !other.contains.includes(r.id)) continue;
        if (!best || area(other.rect) < area(best.rect)) best = other;
      }
      parentOf.set(r.id, best ? best.id : null);
    }
    const build = (id) => {
      const region = byId.get(id);
      const kids = regions.filter((r) => parentOf.get(r.id) === id).map((r) => build(r.id));
      const node = leafOf(region);
      if (kids.length === 0) return node;
      const inner = group(kids, "y");
      return {
        ...node,
        flow: inner.flow === "leaf" ? "stack" : inner.flow,
        children: inner.children.length ? inner.children : [inner],
        fractions: inner.fractions,
        gap: inner.gap,
        reasoning: `${node.reasoning}, containing ${kids.length} mark(s): ${inner.reasoning}`
      };
    };
    const tops = regions.filter((r) => parentOf.get(r.id) === null).map((r) => build(r.id));
    const root = tops.length === 1 ? tops[0] : group(tops, "y");
    return { root, connections };
  }
  function describeLayout(layout) {
    const lines = [];
    const walk = (n2, depth) => {
      const pad = "  ".repeat(depth + 1);
      const size = `${Math.round(n2.rect.w)}\xD7${Math.round(n2.rect.h)}`;
      const label = n2.region ? `${n2.id} (${n2.region.shape})` : `${n2.id} [${n2.flow}]`;
      const share = depth > 0 ? "" : "";
      lines.push(`${pad}${label} ${size} \u2014 ${n2.reasoning}${share}`);
      if (n2.children.length && n2.flow !== "leaf") {
        const pct = n2.fractions.map((f) => `${Math.round(f * 100)}%`).join(" / ");
        if (pct) lines.push(`${pad}  ${n2.flow} split ${pct}, gap ${n2.gap}px`);
      }
      n2.children.forEach((c) => walk(c, depth + 1));
    };
    lines.push("LAYOUT the drawing describes:");
    walk(layout.root, 0);
    if (layout.connections.length) {
      lines.push("", "CONNECTIONS drawn between regions:");
      for (const c of layout.connections) lines.push(`  ${c.from} \u2192 ${c.to}`);
    }
    return lines.join("\n");
  }

  // src/parse/scaffold.ts
  var SAFE_TAGS = /* @__PURE__ */ new Set([
    "div",
    "section",
    "header",
    "footer",
    "main",
    "aside",
    "nav",
    "article",
    "figure",
    "form"
  ]);
  var esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  var styleAttr = (s) => esc(s).replace(/\n/g, " ");
  function renderNode(node, content, depth) {
    const pad = "  ".repeat(depth);
    const own = node.region ? content[node.id] : void 0;
    const tag = own?.tag && SAFE_TAGS.has(own.tag) ? own.tag : "div";
    const box = [];
    if (depth === 1) box.push("flex:1 1 auto");
    else if (depth > 1) {
      box.push(`flex:${node.grow ?? 1} 1 0`, "min-width:0", "min-height:0");
    }
    if (node.marginBefore) {
      box.push(node.parentFlow === "row" ? `margin-left:${node.marginBefore}px` : `margin-top:${node.marginBefore}px`);
    }
    const fill = ["box-sizing:border-box", "width:100%", "height:100%"];
    if (node.flow === "row" || node.flow === "column") {
      fill.push("display:flex", `flex-direction:${node.flow === "row" ? "row" : "column"}`);
    } else if (node.flow === "stack") {
      fill.push("position:relative");
    }
    if (own?.style) fill.push(own.style);
    const attrs = (node.region ? ` data-region="${node.id}"` : "") + (box.length ? ` style="${styleAttr(box.join(";"))}"` : "");
    const inner = node.children.length && node.flow !== "leaf" ? "\n" + node.children.map((c) => renderNode(c, content, depth + 2)).join("\n") + "\n" + pad + "  " : own?.html ?? "";
    if (!node.region) {
      const merged = box.concat(fill.filter((f) => !/^(box-sizing|width|height):/.test(f)));
      return `${pad}<div${merged.length ? ` style="${styleAttr(merged.join(";"))}"` : ""}>${node.children.length ? "\n" + node.children.map((c) => renderNode(c, content, depth + 1)).join("\n") + `
${pad}` : ""}</div>`;
    }
    return `${pad}<${tag}${attrs}>
${pad}  <div style="${styleAttr(fill.join(";"))}">${inner}</div>
${pad}</${tag}>`;
  }
  function prepare(node, parentFlow = "leaf") {
    const main = (n2) => parentFlow === "row" ? n2.rect.w : n2.rect.h;
    const kids = node.children.map((c, i) => {
      const prepared = prepare({ ...c }, node.flow);
      prepared.parentFlow = node.flow;
      prepared.grow = Math.max(1, Math.round(main(c)));
      if (i > 0 && node.flow !== "stack") {
        const prev = node.children[i - 1];
        prepared.marginBefore = node.flow === "row" ? Math.max(0, Math.round(c.rect.x - (prev.rect.x + prev.rect.w))) : Math.max(0, Math.round(c.rect.y - (prev.rect.y + prev.rect.h)));
      }
      return prepared;
    });
    for (const k of kids) {
      k.grow = Math.max(1, Math.round(node.flow === "row" ? k.rect.w : k.rect.h));
    }
    return { ...node, children: kids };
  }
  function buildScaffold(layout, content, theme = {}) {
    const root = prepare(layout.root);
    const body = renderNode({ ...root, parentFlow: "leaf" }, content, 1);
    const t = {
      background: theme.background ?? "#ffffff",
      color: theme.color ?? "#16161a",
      fontFamily: theme.fontFamily ?? "system-ui, -apple-system, 'Segoe UI', sans-serif"
    };
    return [
      "<style>",
      `  .mm-frame { width:100%; height:100%; display:flex; flex-direction:column;`,
      `    background:${styleAttr(t.background)}; color:${styleAttr(t.color)};`,
      `    font-family:${styleAttr(t.fontFamily)}; overflow:hidden; }`,
      "  .mm-frame *, .mm-frame *::before, .mm-frame *::after { box-sizing:border-box; }",
      "  .mm-frame [data-region] { overflow:hidden; }",
      "  .mm-frame [data-region] > * { max-width:100%; }",
      "  .mm-frame h1, .mm-frame h2, .mm-frame h3, .mm-frame p { margin:0 0 0.4em; }",
      "  .mm-frame :last-child { margin-bottom:0; }",
      "</style>",
      '<div class="mm-frame">',
      body,
      "</div>"
    ].join("\n");
  }
  function validateRegions(code, expected) {
    const found = [...code.matchAll(/data-region\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]);
    const counts = /* @__PURE__ */ new Map();
    for (const f of found) counts.set(f, (counts.get(f) ?? 0) + 1);
    const missing = expected.filter((e) => !counts.has(e));
    const duplicated = [...counts.entries()].filter(([, n2]) => n2 > 1).map(([k]) => k);
    return { ok: missing.length === 0 && duplicated.length === 0, missing, duplicated };
  }

  // src/session/session.ts
  var DEFAULT_SESSION_CONFIG = {
    gesture: DEFAULT_GESTURE_CONFIG,
    clusterThresholdPx: 60,
    wireEndpointPx: 30,
    eraseCrossings: DEFAULT_ERASE_CROSSINGS,
    recentWindowMs: 2e4
  };
  function createSession(config = DEFAULT_SESSION_CONFIG) {
    let events = [];
    let nodes = /* @__PURE__ */ new Map();
    let contentIds = [];
    let artifacts = [];
    let pendingLasso = null;
    let summon = null;
    let clusterCandidates = [];
    let participants = [];
    let explanations = [];
    let live = [];
    let commandMark = config.gesture.commandMark ?? null;
    let markMiss = null;
    let lastAt = 0;
    let counter2 = 0;
    const listeners = /* @__PURE__ */ new Set();
    function reset() {
      nodes = /* @__PURE__ */ new Map();
      contentIds = [];
      artifacts = [];
      pendingLasso = null;
      summon = null;
      clusterCandidates = [];
      participants = [LOCAL_PARTICIPANT, TIER0_PARTICIPANT];
      explanations = [];
      live = [];
      commandMark = config.gesture.commandMark ?? null;
      markMiss = null;
      lastAt = 0;
      counter2 = 0;
      for (const n2 of createBootstrapNodes(0)) nodes.set(n2.id, n2);
    }
    reset();
    const nextId = (prefix) => `${prefix}:${++counter2}`;
    function notify() {
      const state = getState();
      listeners.forEach((l) => l(state));
    }
    function contentBoundsList(excludeId) {
      return contentIds.filter((id) => id !== excludeId).map((id) => ({ id, bounds: boundsOf(nodes.get(id)) })).filter((c) => c.bounds !== void 0);
    }
    function asComponent(id, index) {
      const node = nodes.get(id);
      const fp = fingerprintOf(node);
      const type = topInterpretation(node) ?? "art";
      return {
        index,
        recognizedAs: type,
        type,
        fingerprint: fp ?? { bounds: boundsOf(node) },
        bounds: boundsOf(node)
      };
    }
    function signatureOf(ids) {
      const sig = {};
      for (const id of ids) {
        const t = topInterpretation(nodes.get(id)) ?? "art";
        sig[t] = (sig[t] ?? 0) + 1;
      }
      return sig;
    }
    function signaturesEqual(a, b) {
      const keys = /* @__PURE__ */ new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const k of keys) if ((a[k] ?? 0) !== (b[k] ?? 0)) return false;
      return true;
    }
    function recomputeClusterCandidates() {
      clusterCandidates = [];
      if (artifacts.length === 0 || contentIds.length === 0) return;
      const comps = contentIds.map((id, i) => asComponent(id, i));
      const clusters2 = spatialCluster(comps, config.clusterThresholdPx);
      for (const cluster of clusters2) {
        const ids = cluster.map((c) => contentIds[c.index]);
        const strokeIds = ids.filter((id) => !artifacts.includes(id));
        if (strokeIds.length < 2) continue;
        const sig = signatureOf(strokeIds);
        const matches = artifacts.map((aid) => {
          const a = nodes.get(aid);
          const aSig = getRep(a, "signature")?.data;
          if (!aSig || !signaturesEqual(sig, aSig)) return null;
          return { artifactId: aid, name: wordOf(a) ?? aid, score: 1 };
        }).filter((m) => m !== null);
        if (matches.length > 0) clusterCandidates.push({ nodeIds: strokeIds, matches });
      }
    }
    function makeSuggestions(enclosedIds) {
      const sig = signatureOf(enclosedIds);
      const suggestions = [];
      for (const aid of artifacts) {
        const a = nodes.get(aid);
        const aSig = getRep(a, "signature")?.data;
        if (aSig && signaturesEqual(sig, aSig)) {
          suggestions.push({
            id: nextId("sug"),
            kind: "match",
            label: wordOf(a) ?? aid,
            artifactId: aid,
            score: 1
          });
        }
      }
      suggestions.push({ id: nextId("sug"), kind: "prompt", label: "Make\u2026" });
      suggestions.push({ id: nextId("sug"), kind: "name-as-new", label: "Name this\u2026" });
      suggestions.push({ id: nextId("sug"), kind: "keep-as-drawing", label: "Keep as drawing" });
      return suggestions;
    }
    function addSpatialEdges(node) {
      const ids = [...contentIds.filter((id) => id !== node.id), node.id];
      const comps = ids.map((id, i) => asComponent(id, i));
      const graph = buildSpatialGraph(comps);
      const newIdx = ids.length - 1;
      const addPair = (i, j, rel, weight) => {
        if (i !== newIdx && j !== newIdx) return;
        const a = nodes.get(ids[i]);
        const b = nodes.get(ids[j]);
        a.edges.push({ to: b.id, rel, weight });
        b.edges.push({ to: a.id, rel, weight });
      };
      for (const c of graph.connections) addPair(c.a, c.b, c.relationship);
      for (const c of graph.containment) addPair(c.outer, c.inner, "contains");
    }
    function inferWire(node, points, scale) {
      const top = resemblances(node)[0];
      if (!top || top.to !== typeNodeId("line")) return;
      const nearest = (p) => {
        let best = null;
        for (const c of contentBoundsList(node.id)) {
          const d = distancePointToBounds(p, c.bounds);
          if (d < config.wireEndpointPx * scale && (!best || d < best.d)) best = { id: c.id, d };
        }
        return best;
      };
      const a = nearest(points[0]);
      const b = nearest(points[points.length - 1]);
      if (!a || !b || a.id === b.id) return;
      const weight = top.weight;
      node.edges.push({ to: a.id, rel: "connects", weight });
      node.edges.push({ to: b.id, rel: "connects", weight });
      nodes.get(a.id).edges.push({ to: node.id, rel: "connected-by", weight });
      nodes.get(b.id).edges.push({ to: node.id, rel: "connected-by", weight });
    }
    function scratchTargets(excludeId) {
      const ids = /* @__PURE__ */ new Set();
      for (const id of contentIds) {
        if (id === excludeId) continue;
        const n2 = nodes.get(id);
        if (strokePointsOf(n2)) {
          ids.add(id);
          continue;
        }
        for (const e of n2.edges) if (e.rel === "has-part") ids.add(e.to);
      }
      return [...ids].map((id) => nodes.get(id)).filter((n2) => !!n2 && !getRep(n2, "erased") && !!strokePointsOf(n2)).map((n2) => ({
        id: n2.id,
        points: strokePointsOf(n2),
        closed: fingerprintOf(n2)?.isClosed ?? false
      }));
    }
    function buildSummon(ids, source, reasoning, gestureIds, scopeBounds, excludeId, at) {
      const artifactId = liveArtifactUnder(scopeBounds, excludeId);
      const onArtifact = artifactId ? {
        artifactId,
        regionIds: regionsOverlapping(regionsOf(nodes.get(artifactId), nodes), scopeBounds).map((r) => r.id)
      } : void 0;
      return {
        id: nextId("summon"),
        enclosedIds: ids,
        scopeSource: source,
        scopeReasoning: reasoning,
        suggestions: makeSuggestions(ids),
        gestureIds,
        at,
        ...onArtifact ? { onArtifact } : {}
      };
    }
    function recentWithin(at) {
      return contentIds.filter((id) => {
        const n2 = nodes.get(id);
        if (!n2 || getRep(n2, "erased")) return false;
        return at - n2.createdAt <= config.recentWindowMs;
      });
    }
    function markOf(id) {
      const n2 = nodes.get(id);
      const b = n2 && boundsOf(n2);
      if (!n2 || !b) return null;
      return { id, bounds: b, points: strokePointsOf(n2) ?? void 0, closed: fingerprintOf(n2)?.isClosed };
    }
    function engages(points, fp, target) {
      if (target.points && strokesIntersect(points, target.points)) return true;
      if (boundsOverlap(fp.bounds, target.bounds)) return true;
      const size = Math.max(
        1,
        Math.max(target.bounds.maxX - target.bounds.minX, target.bounds.maxY - target.bounds.minY)
      );
      return boundingBoxDistance(fp.bounds, target.bounds) < size * config.gesture.checkProximityRatio;
    }
    function scopeFromMark(points, fp, at) {
      const candidates = contentIds.map(markOf).filter((m) => !!m && !getRep(nodes.get(m.id), "erased"));
      const engaged = candidates.filter((m) => engages(points, fp, m));
      if (engaged.length === 0) return null;
      const union = engaged.reduce(
        (acc, m) => ({
          minX: Math.min(acc.minX, m.bounds.minX),
          minY: Math.min(acc.minY, m.bounds.minY),
          maxX: Math.max(acc.maxX, m.bounds.maxX),
          maxY: Math.max(acc.maxY, m.bounds.maxY)
        }),
        engaged[0].bounds
      );
      const scopeSize = Math.max(union.maxX - union.minX, union.maxY - union.minY);
      if (fp.size > scopeSize) return null;
      const recent = new Set(recentWithin(at));
      const pool = candidates.filter((m) => recent.has(m.id) || engaged.some((e) => e.id === m.id));
      const groups = clusters(pool, relate(pool));
      const ids = new Set(engaged.map((m) => m.id));
      for (const g of groups) {
        if (g.some((id) => ids.has(id))) g.forEach((id) => ids.add(id));
      }
      const grown = ids.size - engaged.length;
      return {
        ids: [...ids],
        source: grown > 0 ? "recent" : "crossed",
        reasoning: grown > 0 ? `the mark crossed ${engaged.length}, and ${grown} more you drew alongside just now came with it` : `the mark crossed ${engaged.length} mark${engaged.length === 1 ? "" : "s"}`
      };
    }
    function liveArtifactUnder(b, excludeId) {
      for (const aid of live) {
        if (aid === excludeId) continue;
        const ab = boundsOf(nodes.get(aid));
        if (ab && boundsOverlap(ab, b)) return aid;
      }
      return null;
    }
    function removeFromContent(id) {
      const idx = contentIds.indexOf(id);
      if (idx >= 0) contentIds.splice(idx, 1);
    }
    function applyStroke(ev) {
      const { points, at } = ev;
      const pid = ev.participantId ?? LOCAL_PARTICIPANT;
      const scale = ev.scale && ev.scale > 0 ? ev.scale : 1;
      const fp = getFingerprint(points, scale);
      const node = {
        id: nextId("stroke"),
        reps: [
          { modality: "stroke", data: { points, at, scale }, source: pid },
          { modality: "fingerprint", data: fp, source: TIER0_PARTICIPANT }
        ],
        edges: [{ to: pid, rel: "made-by" }],
        capability: 0,
        createdAt: at
      };
      nodes.set(node.id, node);
      if (pendingLasso) {
        const lassoNode = nodes.get(pendingLasso.id);
        const lassoFp = fingerprintOf(lassoNode);
        const lassoPoints = strokePointsOf(lassoNode) ?? [];
        const gestureConfig = { ...config.gesture, commandMark };
        const strokePair = { check: points, lasso: lassoPoints };
        if (resolvesLasso(fp, at, lassoFp, pendingLasso.at, gestureConfig, strokePair)) {
          node.reps.push({
            modality: "gesture",
            data: { role: commandMark ? "command" : "check" },
            source: commandMark ? `command-mark:${commandMark.name}` : "heuristic"
          });
          lassoNode.reps.push({ modality: "gesture", data: { role: "lasso" }, source: "heuristic" });
          removeFromContent(lassoNode.id);
          const enclosedIds = enclosedBy(lassoFp.bounds, contentBoundsList());
          summon = buildSummon(
            enclosedIds,
            "lasso",
            `you circled ${enclosedIds.length} mark${enclosedIds.length === 1 ? "" : "s"}`,
            [lassoNode.id, node.id],
            lassoFp.bounds,
            lassoNode.id,
            at
          );
          pendingLasso = null;
          markMiss = null;
          recomputeClusterCandidates();
          return node.id;
        }
        markMiss = whyNotResolved(fp, at, lassoFp, pendingLasso.at, gestureConfig, strokePair);
      } else {
        markMiss = null;
      }
      if (matchesCommandMark(fp, commandMark ?? BUILTIN_COMMAND_MARK).match) {
        const scope = scopeFromMark(points, fp, at);
        if (scope) {
          node.reps.push({
            modality: "gesture",
            data: { role: commandMark ? "command" : "check", scope: scope.source },
            source: commandMark ? `command-mark:${commandMark.name}` : "heuristic"
          });
          const union = getBounds(
            scope.ids.flatMap((id) => {
              const b = boundsOf(nodes.get(id));
              return [
                { x: b.minX, y: b.minY },
                { x: b.maxX, y: b.maxY }
              ];
            })
          );
          summon = buildSummon(scope.ids, scope.source, scope.reasoning, [node.id], union, node.id, at);
          pendingLasso = null;
          markMiss = null;
          recomputeClusterCandidates();
          return node.id;
        }
      }
      const scratched = fp.isClosed ? [] : scratchedOut(points, scratchTargets(node.id), config.eraseCrossings);
      if (scratched.length > 0) {
        node.reps.push({
          modality: "gesture",
          data: { role: "scratch", erased: scratched },
          source: "heuristic"
        });
        pendingLasso = null;
        summon = null;
        for (const id of scratched) eraseNode(id, at);
        return node.id;
      }
      summon = null;
      contentIds.push(node.id);
      const analysis = analyzeStroke(points, scale);
      for (const r of analysis.results) {
        node.edges.push({
          to: typeNodeId(r.type),
          rel: "resembles",
          weight: r.confidence,
          via: TIER0_PARTICIPANT,
          // even the heuristics are a participant
          reasoning: r.reasoning
          // grounded "why", carried with the claim
        });
      }
      addSpatialEdges(node);
      inferWire(node, points, scale);
      const enclosed = enclosedBy(fp.bounds, contentBoundsList(node.id));
      const onLive = liveArtifactUnder(fp.bounds, node.id);
      pendingLasso = isLassoLike(fp, enclosed.length) || fp.isClosed && onLive ? { id: node.id, at } : null;
      recomputeClusterCandidates();
      return node.id;
    }
    function applyBless(ev) {
      if (!summon || summon.id !== ev.summonId) return null;
      const chosen = ev.suggestionId ? summon.suggestions.find((s) => s.id === ev.suggestionId) : void 0;
      if (chosen?.kind === "keep-as-drawing") {
        for (const gid of summon.gestureIds) {
          const g = nodes.get(gid);
          g.reps = g.reps.filter((r) => r.modality !== "gesture");
          contentIds.push(gid);
        }
        summon = null;
        recomputeClusterCandidates();
        return null;
      }
      const name = ev.name ?? chosen?.label;
      if (!name) return null;
      const memberIds = summon.enclosedIds;
      const memberBounds = memberIds.map((id) => boundsOf(nodes.get(id)));
      const unionBounds = getBounds(
        memberBounds.flatMap((b) => [
          { x: b.minX, y: b.minY },
          { x: b.maxX, y: b.maxY }
        ])
      );
      const artifact = {
        id: nextId("artifact"),
        reps: [
          { modality: "word", data: name, source: ev.participantId ?? LOCAL_PARTICIPANT },
          { modality: "bounds", data: unionBounds },
          { modality: "signature", data: signatureOf(memberIds), source: TIER0_PARTICIPANT }
        ],
        edges: [
          ...memberIds.map((id) => ({ to: id, rel: "has-part", blessed: true })),
          ...summon.gestureIds.map((id) => ({ to: id, rel: "blessed-by" })),
          ...chosen?.artifactId ? [{ to: chosen.artifactId, rel: "instance-of", blessed: true }] : []
        ],
        capability: 0,
        createdAt: ev.at
      };
      nodes.set(artifact.id, artifact);
      for (const id of memberIds) {
        nodes.get(id).edges.push({ to: artifact.id, rel: "part-of", blessed: true });
        removeFromContent(id);
      }
      contentIds.push(artifact.id);
      artifacts.push(artifact.id);
      summon = null;
      recomputeClusterCandidates();
      return artifact.id;
    }
    function applyErase(ev) {
      eraseNode(ev.nodeId, ev.at);
    }
    function eraseNode(nodeId, at) {
      const node = nodes.get(nodeId);
      if (!node || node.id.startsWith("type:")) return;
      if (getRep(node, "erased")) return;
      node.reps.push({ modality: "erased", data: { at }, source: "user" });
      removeFromContent(node.id);
      const li = live.indexOf(node.id);
      if (li >= 0) live.splice(li, 1);
      if (pendingLasso?.id === node.id) pendingLasso = null;
      if (summon && (summon.enclosedIds.includes(node.id) || summon.gestureIds.includes(node.id))) {
        summon = null;
      }
      const degrade = (artifactId) => {
        const artifact = nodes.get(artifactId);
        if (!artifact || getRep(artifact, "status")) return;
        artifact.reps.push({ modality: "status", data: "broken", source: "engine" });
        removeFromContent(artifactId);
        const ai = artifacts.indexOf(artifactId);
        if (ai >= 0) artifacts.splice(ai, 1);
        const li2 = live.indexOf(artifactId);
        if (li2 >= 0) live.splice(li2, 1);
        for (const e of artifact.edges) {
          if (e.rel !== "has-part") continue;
          const member = nodes.get(e.to);
          if (member && !getRep(member, "erased") && !contentIds.includes(e.to)) {
            contentIds.push(e.to);
          }
        }
      };
      if (artifacts.includes(node.id)) {
        degrade(node.id);
      } else {
        for (const e of node.edges) {
          if (e.rel === "part-of" && e.blessed) degrade(e.to);
        }
      }
      recomputeClusterCandidates();
    }
    function applyJoin(ev) {
      const node = createParticipantNode(nextId("participant"), ev.kind, ev.name, ev.at, ev.capability ?? 0);
      nodes.set(node.id, node);
      participants.push(node.id);
      return node.id;
    }
    function applyPropose(ev) {
      const node = nodes.get(ev.nodeId);
      if (!node || !participants.includes(ev.participantId)) return;
      for (const e of ev.edges) {
        node.edges.push({
          to: e.to,
          rel: e.rel,
          weight: e.weight,
          via: ev.participantId,
          reasoning: e.reasoning
        });
      }
      recomputeClusterCandidates();
    }
    function applyAnswer(ev) {
      if (!participants.includes(ev.participantId)) return null;
      const about = ev.aboutIds.filter((id) => nodes.has(id));
      if (about.length === 0) return null;
      const subject = about.map((id) => boundsOf(nodes.get(id))).filter((b) => !!b);
      const union = subject.length ? getBounds(
        subject.flatMap((b) => [
          { x: b.minX, y: b.minY },
          { x: b.maxX, y: b.maxY }
        ])
      ) : { minX: 0, minY: 0, maxX: 0, maxY: 0 };
      const gap = 28;
      const width = 260;
      const bounds = {
        minX: union.maxX + gap,
        minY: union.minY,
        maxX: union.maxX + gap + width,
        maxY: union.minY + 120
      };
      const participant = nodes.get(ev.participantId);
      const node = createExplanationNode(
        nextId("explanation"),
        { question: ev.question, text: ev.text },
        about,
        bounds,
        ev.participantId,
        participant?.capability ?? 0,
        ev.at
      );
      nodes.set(node.id, node);
      explanations.push(node.id);
      return node.id;
    }
    function applyTidy(ev) {
      const targets = ev.ids.map((id) => ({ id, node: nodes.get(id), bounds: nodes.get(id) ? boundsOf(nodes.get(id)) : void 0 })).filter((t) => !!t.node && !!t.bounds && !getRep(t.node, "erased"));
      if (targets.length < 2) return;
      const w2 = (b) => b.maxX - b.minX;
      const h2 = (b) => b.maxY - b.minY;
      const span = getBounds(targets.flatMap((t) => [
        { x: t.bounds.minX, y: t.bounds.minY },
        { x: t.bounds.maxX, y: t.bounds.maxY }
      ]));
      const axis = ev.axis ?? (w2(span) >= h2(span) ? "row" : "column");
      let placed;
      if (ev.mode === "equalize") {
        const tw = Math.max(...targets.map((t) => w2(t.bounds)));
        const th = Math.max(...targets.map((t) => h2(t.bounds)));
        placed = targets.map((t) => {
          const cx2 = (t.bounds.minX + t.bounds.maxX) / 2;
          const cy2 = (t.bounds.minY + t.bounds.maxY) / 2;
          return { id: t.id, to: { minX: cx2 - tw / 2, maxX: cx2 + tw / 2, minY: cy2 - th / 2, maxY: cy2 + th / 2 } };
        });
      } else {
        const along = (b) => axis === "row" ? (b.minX + b.maxX) / 2 : (b.minY + b.maxY) / 2;
        const ordered2 = [...targets].sort((a, b) => along(a.bounds) - along(b.bounds));
        const sizes = ordered2.map((t) => axis === "row" ? w2(t.bounds) : h2(t.bounds));
        const total = sizes.reduce((a, b) => a + b, 0);
        const start = axis === "row" ? span.minX : span.minY;
        const end = axis === "row" ? span.maxX : span.maxY;
        const gap = ordered2.length > 1 ? (end - start - total) / (ordered2.length - 1) : 0;
        const cross = ordered2.reduce((acc, t) => acc + (axis === "row" ? (t.bounds.minY + t.bounds.maxY) / 2 : (t.bounds.minX + t.bounds.maxX) / 2), 0) / ordered2.length;
        let cursor = start;
        placed = ordered2.map((t, i) => {
          const size = sizes[i];
          const half = (axis === "row" ? h2(t.bounds) : w2(t.bounds)) / 2;
          const to = axis === "row" ? { minX: cursor, maxX: cursor + size, minY: cross - half, maxY: cross + half } : { minX: cross - half, maxX: cross + half, minY: cursor, maxY: cursor + size };
          cursor += size + gap;
          return { id: t.id, to };
        });
      }
      for (const p of placed) {
        const node = nodes.get(p.id);
        node.reps = node.reps.filter((r) => r.modality !== "transform");
        node.reps.push({ modality: "transform", data: p.to, source: "engine" });
      }
      recomputeClusterCandidates();
    }
    function applyTeach(ev) {
      commandMark = ev.mark;
    }
    function applyCode(ev) {
      const node = nodes.get(ev.nodeId);
      if (!node || !participants.includes(ev.participantId)) return null;
      node.reps.push({
        modality: "code",
        data: {
          code: ev.code,
          language: ev.language ?? "html",
          prompt: ev.prompt,
          fill: ev.fill,
          regions: regionsOf(node, nodes),
          at: ev.at
        },
        source: ev.participantId
      });
      if (!live.includes(node.id)) live.push(node.id);
      return node.id;
    }
    function applyEvent(ev) {
      if ("at" in ev && typeof ev.at === "number") lastAt = Math.max(lastAt, ev.at);
      switch (ev.type) {
        case "stroke":
          return applyStroke(ev);
        case "bless":
          return applyBless(ev);
        case "join":
          return applyJoin(ev);
        case "propose":
          applyPropose(ev);
          return null;
        case "answer":
          return applyAnswer(ev);
        case "teach":
          applyTeach(ev);
          return null;
        case "tidy":
          applyTidy(ev);
          return null;
        case "code":
          return applyCode(ev);
        case "dismiss":
          if (summon?.id === ev.summonId) summon = null;
          return null;
        case "erase":
          applyErase(ev);
          return null;
        case "tick":
          return null;
      }
    }
    function replay() {
      reset();
      for (const ev of events) applyEvent(ev);
    }
    function dispatch(ev) {
      events.push(ev);
      const result2 = applyEvent(ev);
      notify();
      return result2;
    }
    function undo() {
      for (let i = events.length - 1; i >= 0; i--) {
        if (events[i].type !== "tick") {
          events = [...events.slice(0, i), ...events.slice(i + 1)];
          replay();
          notify();
          return;
        }
      }
    }
    function getState() {
      return {
        nodes,
        contentIds: [...contentIds],
        pendingLassoId: pendingLasso?.id ?? null,
        summon: summon ? { ...summon, enclosedIds: [...summon.enclosedIds] } : null,
        clusterCandidates: clusterCandidates.map((c) => ({ ...c })),
        artifacts: [...artifacts],
        participants: [...participants],
        explanations: [...explanations],
        commandMark,
        markMiss,
        recentIds: recentWithin(lastAt),
        live: [...live]
      };
    }
    function subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
    return {
      addStroke: (points, at, participantId, scale) => dispatch({ type: "stroke", points, at, participantId, scale }),
      join: (kind, name, at, capability) => dispatch({ type: "join", kind, name, at, capability }),
      propose: (args) => void dispatch({ type: "propose", ...args }),
      answer: (args) => dispatch({ type: "answer", ...args }),
      teachCommandMark: (mark, at) => void dispatch({ type: "teach", mark, at }),
      tidy: (args) => void dispatch({ type: "tidy", ...args }),
      attachCode: (args) => dispatch({ type: "code", ...args }),
      regions: (artifactId) => {
        const node = nodes.get(artifactId);
        return node ? regionsOf(node, nodes) : [];
      },
      read: (ids) => {
        const marks = ids.map(markOf).filter((m) => !!m);
        const relations = relate(marks);
        const shapes = {};
        const names = {};
        for (const m of marks) {
          const n2 = nodes.get(m.id);
          shapes[m.id] = topInterpretation(n2) ?? "art";
          const word = wordOf(n2);
          if (word) names[m.id] = word;
        }
        const scope = { ids: marks.map((m) => m.id), marks, relations, shapes, names };
        return { scope, relations, concepts: matchConcepts(scope) };
      },
      tick: (at) => void dispatch({ type: "tick", at }),
      bless: (args) => dispatch({ type: "bless", ...args }),
      dismiss: (summonId, at) => void dispatch({ type: "dismiss", summonId, at }),
      erase: (nodeId, at) => void dispatch({ type: "erase", nodeId, at }),
      undo,
      getState,
      subscribe,
      getEvents: () => events
    };
  }

  // src/session/interpretations.ts
  function participantName(id, nodes) {
    const p = nodes.get(id);
    if (!p || !isParticipant(p)) return id;
    return wordOf(p) ?? id;
  }
  function participantTier(id, nodes) {
    const p = nodes.get(id);
    return p?.capability ?? 0;
  }
  function interpretationsOf(node, nodes) {
    const out = [];
    const name = wordOf(node);
    if (name) {
      const blessedBy = node.edges.find((e) => e.rel === "blessed-by" && e.blessed)?.to;
      out.push({
        label: name,
        to: node.id,
        source: blessedBy ?? LOCAL_PARTICIPANT,
        sourceName: participantName(blessedBy ?? LOCAL_PARTICIPANT, nodes),
        tier: participantTier(blessedBy ?? LOCAL_PARTICIPANT, nodes),
        weight: 1,
        reasoning: "blessed by a participant",
        blessed: true
      });
    }
    for (const e of resemblances(node)) {
      const source = e.via;
      out.push({
        label: e.to.replace(/^type:/, ""),
        to: e.to,
        source,
        // An un-attributed resemblance is the engine's own Tier 0 reading:
        // recognition ran inline at stroke time, before any participant spoke.
        sourceName: source ? participantName(source, nodes) : participantName(TIER0_PARTICIPANT, nodes),
        tier: source ? participantTier(source, nodes) : 0,
        weight: e.weight ?? 0,
        reasoning: e.reasoning,
        blessed: e.blessed === true
      });
    }
    return out.sort((a, b) => {
      if (a.blessed !== b.blessed) return a.blessed ? -1 : 1;
      return b.weight - a.weight;
    });
  }
  function byTier(interpretations) {
    const groups = /* @__PURE__ */ new Map();
    for (const i of interpretations) {
      const g = groups.get(i.tier);
      if (g) g.push(i);
      else groups.set(i.tier, [i]);
    }
    return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([key, list]) => ({ key, label: `tier ${key}`, interpretations: list }));
  }
  function bySource(interpretations) {
    const groups = /* @__PURE__ */ new Map();
    for (const i of interpretations) {
      const key = i.source ?? TIER0_PARTICIPANT;
      const g = groups.get(key);
      if (g) g.push(i);
      else groups.set(key, [i]);
    }
    return [...groups.entries()].map(([key, list]) => ({
      key,
      label: list[0].sourceName,
      interpretations: list
    }));
  }
  function disagreement(interpretations) {
    if (interpretations.length < 2) return null;
    const byLabel = /* @__PURE__ */ new Map();
    for (const i of interpretations) {
      const entry = byLabel.get(i.label);
      const src = i.sourceName;
      if (entry) {
        entry.bestWeight = Math.max(entry.bestWeight, i.weight);
        entry.sources.add(src);
      } else {
        byLabel.set(i.label, { bestWeight: i.weight, sources: /* @__PURE__ */ new Set([src]) });
      }
    }
    if (byLabel.size < 2) return null;
    const labels = [...byLabel.entries()].map(([label, v]) => ({ label, bestWeight: v.bestWeight, sources: [...v.sources] })).sort((a, b) => b.bestWeight - a.bestWeight);
    const allSources = new Set(labels.flatMap((l) => l.sources));
    const crossSource = allSources.size > 1 && labels.some((l) => !l.sources.every((s) => labels[0].sources.includes(s)));
    return { labels, crossSource };
  }
  function sourcesOf(interpretations) {
    return [...new Set(interpretations.map((i) => i.sourceName))];
  }
  function hasMultipleSources(interpretations) {
    return sourcesOf(interpretations).length > 1;
  }

  // src/llm/provider.ts
  var PRESETS = {
    ollama: { kind: "openai-compatible", baseUrl: "http://localhost:11434/v1" },
    lmStudio: { kind: "openai-compatible", baseUrl: "http://localhost:1234/v1" },
    openRouter: { kind: "openai-compatible", baseUrl: "https://openrouter.ai/api/v1" },
    anthropic: { kind: "anthropic", baseUrl: "https://api.anthropic.com/v1" }
  };
  var DEFAULT_TIMEOUT_MS = 6e4;
  var LOCAL_TIMEOUT_MS = 3e5;
  function providerLabel(config) {
    return config.label ?? `llm:${config.model}`;
  }
  function providerTier(config) {
    return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(config.baseUrl) ? 1 : 2;
  }
  function withTimeout(ms, external) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    const relay = () => ctl.abort();
    if (external) {
      if (external.aborted) ctl.abort();
      else external.addEventListener("abort", relay, { once: true });
    }
    return {
      signal: ctl.signal,
      done: () => {
        clearTimeout(t);
        external?.removeEventListener("abort", relay);
      }
    };
  }
  async function post(url, headers, body, timeoutMs, external) {
    const { signal, done } = withTimeout(timeoutMs, external);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify(body),
        signal
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        return { ok: false, error: `HTTP ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}` };
      }
      return { ok: true, json: await res.json() };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (external?.aborted) return { ok: false, error: "cancelled" };
      return { ok: false, error: signal.aborted ? `timed out after ${timeoutMs}ms` : msg };
    } finally {
      done();
    }
  }
  function firstString(...candidates) {
    for (const c of candidates) if (typeof c === "string" && c.length > 0) return c;
    return void 0;
  }
  async function completeOpenAICompatible(config, messages, timeoutMs, external) {
    const headers = {};
    if (config.apiKey) headers.authorization = `Bearer ${config.apiKey}`;
    const res = await post(
      `${config.baseUrl.replace(/\/$/, "")}/chat/completions`,
      headers,
      { model: config.model, messages, stream: false },
      timeoutMs,
      external
    );
    if (!res.ok) return res;
    const body = res.json;
    const text = firstString(body?.choices?.[0]?.message?.content);
    if (text === void 0) return { ok: false, error: "no completion text in response" };
    return { ok: true, text, model: firstString(body.model) ?? config.model };
  }
  async function completeAnthropic(config, messages, timeoutMs, external) {
    if (!config.apiKey) return { ok: false, error: "anthropic requires an API key" };
    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const user = messages.filter((m) => m.role === "user");
    if (user.length === 0) return { ok: false, error: "no user message" };
    const res = await post(
      `${config.baseUrl.replace(/\/$/, "")}/messages`,
      {
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
        // The canvas is a browser surface; without this the API rejects the
        // request rather than the browser blocking it at CORS.
        "anthropic-dangerous-direct-browser-access": "true"
      },
      {
        model: config.model,
        max_tokens: 4096,
        ...system ? { system } : {},
        messages: user.map((m) => ({ role: "user", content: m.content }))
      },
      timeoutMs,
      external
    );
    if (!res.ok) return res;
    const body = res.json;
    if (body?.stop_reason === "refusal") {
      return { ok: false, error: "model declined the request" };
    }
    const text = body?.content?.find((b) => b?.type === "text")?.text;
    if (typeof text !== "string") return { ok: false, error: "no text block in response" };
    return { ok: true, text, model: firstString(body.model) ?? config.model };
  }
  async function complete(config, messages, opts = {}) {
    const timeoutMs = config.timeoutMs ?? (providerTier(config) === 1 ? LOCAL_TIMEOUT_MS : DEFAULT_TIMEOUT_MS);
    try {
      return config.kind === "anthropic" ? await completeAnthropic(config, messages, timeoutMs, opts.signal) : await completeOpenAICompatible(config, messages, timeoutMs, opts.signal);
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
  async function listModels(config) {
    const headers = {};
    if (config.apiKey) headers.authorization = `Bearer ${config.apiKey}`;
    try {
      const { signal, done } = withTimeout(5e3);
      const res = await fetch(`${config.baseUrl.replace(/\/$/, "")}/models`, { headers, signal });
      done();
      if (!res.ok) return { ok: false, models: [], error: `HTTP ${res.status}` };
      const body = await res.json();
      const models = (body?.data ?? []).map((m) => m?.id).filter((id) => typeof id === "string").sort();
      return { ok: true, models };
    } catch (err) {
      return { ok: false, models: [], error: err instanceof Error ? err.message : String(err) };
    }
  }

  // src/participants/serialize.ts
  function n(v, round) {
    return round ? String(Math.round(v)) : v.toFixed(2);
  }
  function describeNode(node, state, opts) {
    const lines = [];
    const name = wordOf(node);
    lines.push(`${node.id}${name ? ` (named "${name}")` : ""}`);
    const fp = fingerprintOf(node);
    if (fp) {
      lines.push(
        `  geometry: straightness ${fp.straightness.toFixed(2)}, ${fp.corners} corner(s), ${fp.isClosed ? "closed" : "open"}, aspect ${fp.aspectRatio.toFixed(2)}, size ${n(fp.size, opts.round)}px`
      );
    }
    const b = boundsOf(node);
    if (b) {
      lines.push(
        `  at: (${n(b.minX, opts.round)},${n(b.minY, opts.round)})\u2013(${n(b.maxX, opts.round)},${n(b.maxY, opts.round)})`
      );
    }
    if (opts.includeInterpretations) {
      const reads = interpretationsOf(node, state.nodes);
      if (reads.length > 0) {
        lines.push("  read as:");
        for (const r of reads) {
          lines.push(
            `    - "${r.label}" ${r.weight.toFixed(2)} by ${r.sourceName}${r.blessed ? " [blessed]" : ""}${r.reasoning ? ` \u2014 ${r.reasoning}` : ""}`
          );
        }
      }
    }
    const rels = node.edges.filter(
      (e) => e.rel !== "resembles" && e.rel !== "blessed-by" && e.rel !== "made-by"
    );
    if (rels.length > 0) {
      const shown = rels.map((e) => `${e.rel} ${e.to}`).join(", ");
      lines.push(`  relations: ${shown}`);
    }
    return lines.join("\n");
  }
  function describeSession(state, options = {}) {
    const includeInterpretations = options.includeInterpretations ?? true;
    const round = options.round ?? true;
    const ids = options.nodeIds ?? state.contentIds;
    const nodes = ids.map((id) => state.nodes.get(id)).filter((x) => !!x && !isParticipant(x) && !isGesture(x));
    if (nodes.length === 0) return "(nothing on the canvas)";
    const parts = [];
    const named = state.artifacts.map((id) => state.nodes.get(id)).filter((x) => !!x).map((a) => wordOf(a)).filter((w2) => !!w2);
    if (named.length > 0) {
      parts.push(`Known names in this session: ${named.join(", ")}`);
    }
    const others = state.participants.map((id) => state.nodes.get(id)).filter((x) => !!x).map((p) => wordOf(p)).filter((w2) => !!w2);
    if (others.length > 0) parts.push(`Participants: ${others.join(", ")}`);
    parts.push(`Marks (${nodes.length}):`);
    for (const node of nodes) {
      parts.push(describeNode(node, state, { includeInterpretations, round }));
    }
    return parts.join("\n");
  }
  function describeSignature(state, nodeIds) {
    const counts = /* @__PURE__ */ new Map();
    for (const id of nodeIds) {
      const node = state.nodes.get(id);
      if (!node) continue;
      const reads = interpretationsOf(node, state.nodes);
      const top = reads[0]?.label;
      if (!top) continue;
      counts.set(top, (counts.get(top) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => `${count}\xD7${label}`).join(" + ");
  }
  function rect(r, round = true) {
    const v = (x) => round ? Math.round(x) : Number(x.toFixed(2));
    return `x=${v(r.x)} y=${v(r.y)} w=${v(r.w)} h=${v(r.h)}`;
  }
  function describeRegions(regions, frame) {
    const lines = [`FRAME: ${Math.round(frame.w)}\xD7${Math.round(frame.h)} px (origin 0,0 is the artifact's top-left).`];
    if (regions.length === 0) {
      lines.push("No regions were drawn \u2014 you may lay the frame out freely.");
      return lines.join("\n");
    }
    lines.push("", "REGIONS the human drew, in artifact-local pixels:");
    for (const r of regions) {
      const nested2 = r.contains.length ? `, contains ${r.contains.join(", ")}` : "";
      lines.push(`  ${r.id}: ${rect(r.rect)} \u2014 drawn as a ${r.shape}${nested2}`);
    }
    return lines.join("\n");
  }
  function describeAddressed(regions, addressedIds) {
    const hit = regions.filter((r) => addressedIds.includes(r.id));
    if (hit.length === 0) return "The mark did not land on any region \u2014 treat it as addressing the whole artifact.";
    return [
      "The human drew over this artifact. The mark lands on:",
      ...hit.map((r) => `  ${r.id} (${rect(r.rect)}, drawn as a ${r.shape})`),
      "Change only what those regions cover. Leave the rest of the code as it is."
    ].join("\n");
  }

  // src/participants/agent.ts
  var MAX_READINGS = 4;
  var SYSTEM_PROMPT = `You are a participant on a shared drawing canvas, alongside a human and the canvas's own geometric recognizer.

You are given GROUNDED FACTS about marks that were drawn: measured geometry, spatial relations, and how other participants already read them. You are not given an image. Trust the measurements \u2014 they are exact.

Your job is to offer INTERPRETATIONS, not answers.

Rules:
- Offer between 1 and ${MAX_READINGS} genuinely different readings, ranked by confidence. A drawing can be several things at once; that ambiguity is useful information, not a problem to resolve.
- Do NOT simply restate a reading that is already listed unless you actively agree with it \u2014 and if you do agree, say why it holds up.
- If you disagree with another participant's reading, offer yours anyway. Disagreement is a signal the human wants to see.
- Ground every reading in the facts you were given. Cite the specific geometry or relation that supports it.
- Confidence is 0.0\u20131.0 and should be honest. Low confidence on a real possibility beats false certainty.

Reply with ONLY a JSON array, no prose, no code fences:
[{"label":"short-name","confidence":0.0-1.0,"reasoning":"one sentence citing the evidence"}]`;
  var ASK_PROMPT = `You are a participant on a shared drawing canvas, answering a question about specific marks the human has selected.

You are given GROUNDED FACTS: measured geometry, spatial relations between marks, and how each participant (including the canvas's own recognizer) currently reads them. You are not given an image.

Answer the question directly, in 1\u20133 short sentences of plain prose.

Rules:
- CITE THE EVIDENCE. Refer to the actual measurements and relations you were given \u2014 "these three closed shapes are joined by two strokes that touch both" \u2014 not to a general impression of what the drawing looks like.
- Do not restate the drawing back to the human. They can see it. Say the thing they cannot see.
- If the readings disagree, say so and explain what separates them. The disagreement is usually the answer.
- If the facts do not support an answer, say what is missing rather than guessing.
- No preamble, no markdown, no bullet points. Just the answer.`;
  var MAKE_PROMPT = `You are a participant on a shared drawing canvas. The human drew a layout and asked you to build it.

THE LAYOUT IS ALREADY DECIDED. It was measured from their drawing and the canvas will assemble it. You are not writing the page structure and you must not try to: no wrappers, no positioning, no widths or heights, no flexbox. If you emit layout it will be discarded, and if you omit a region it will render empty.

Your job is the CONTENT of each region: the words, the semantics, and the look.

For each region id you are given, return:
  - "html"  \u2014 the inner HTML of that region. Real copy, never lorem ipsum. Headings, paragraphs, links, lists, buttons. Inline styles are fine for type and colour.
  - "tag"   \u2014 one of div, section, header, footer, main, aside, nav, article, figure, form. Choose the one that fits what the region is.
  - "style" \u2014 optional inline style for the region box itself: background, padding, border, alignment.

Also return a "theme": background, color, accent, fontFamily for the page as a whole.

Rules:
- Fill EVERY region you are given, using its exact id.
- A wide region across the top is almost always a header; across the bottom, a footer. Side-by-side regions of similar size are columns of equal standing.
- Write as if this were shipping. Specific copy, considered colour, real link text.
- No <script>. No external images, fonts, or stylesheets \u2014 nothing that loads from the network.

Reply with ONLY a JSON object, no prose, no code fences:
{"theme":{"background":"#\u2026","color":"#\u2026","accent":"#\u2026","fontFamily":"\u2026"},"regions":{"r1":{"tag":"header","style":"\u2026","html":"\u2026"}}}`;
  var REVISE_PROMPT = `You are a participant on a shared drawing canvas, changing part of a page you or another participant already filled in.

You are given the layout, the content each region currently holds, and which regions the human's new mark lands on.

Rules:
- Return ONLY the regions you are changing. Regions you leave out keep exactly what they have.
- Change only the regions the mark addresses. If the request cannot be satisfied within them, do the closest thing that can be, and say nothing about the rest.
- The layout is not yours to change. No positioning, no sizes, no wrappers.
- Return "theme" only if the request is about the whole page's look.

Reply with ONLY a JSON object, no prose, no code fences:
{"regions":{"r2":{"tag":"aside","style":"\u2026","html":"\u2026"}}}`;
  function clamp01(v) {
    const n2 = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n2)) return 0.5;
    return Math.max(0, Math.min(1, n2));
  }
  function parseReadings(text) {
    if (!text) return [];
    const unfenced = text.replace(/```(?:json)?/gi, "").trim();
    const start = unfenced.indexOf("[");
    const end = unfenced.lastIndexOf("]");
    if (start === -1 || end === -1 || end < start) return [];
    let parsed;
    try {
      parsed = JSON.parse(unfenced.slice(start, end + 1));
    } catch {
      return [];
    }
    if (!Array.isArray(parsed)) return [];
    const readings = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const rec = item;
      const label = typeof rec.label === "string" ? rec.label.trim() : "";
      if (!label) continue;
      readings.push({
        label,
        confidence: clamp01(rec.confidence),
        reasoning: typeof rec.reasoning === "string" ? rec.reasoning.trim() : ""
      });
    }
    return readings.sort((a, b) => b.confidence - a.confidence);
  }
  function parseCode(text) {
    if (!text) return "";
    const fenced = text.match(/```(?:html|xml)?\s*\n([\s\S]*?)```/i);
    const body = (fenced ? fenced[1] : text).trim();
    const first = body.indexOf("<");
    if (first === -1) return "";
    const last = body.lastIndexOf(">");
    return body.slice(first, last + 1).trim();
  }
  function parseLoose(text) {
    try {
      return JSON.parse(text);
    } catch {
    }
    let out = "";
    let inString = false;
    let escaped = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inString) {
        out += c;
        if (escaped) escaped = false;
        else if (c === "\\") escaped = true;
        else if (c === '"') inString = false;
        continue;
      }
      if (c === '"') {
        inString = true;
        out += c;
        continue;
      }
      if (c === "`") {
        let body = "";
        i++;
        while (i < text.length && text[i] !== "`") {
          body += text[i];
          i++;
        }
        out += JSON.stringify(body);
        continue;
      }
      out += c;
    }
    out = out.replace(/,(\s*[}\]])/g, "$1");
    try {
      return JSON.parse(out);
    } catch {
      return null;
    }
  }
  function outermostObject(text) {
    const start = text.indexOf("{");
    if (start === -1) return null;
    let depth = 0;
    let inString = false;
    let inTemplate = false;
    let escaped = false;
    for (let i = start; i < text.length; i++) {
      const c = text[i];
      if (inTemplate) {
        if (c === "`") inTemplate = false;
        continue;
      }
      if (inString) {
        if (escaped) escaped = false;
        else if (c === "\\") escaped = true;
        else if (c === '"') inString = false;
        continue;
      }
      if (c === '"') inString = true;
      else if (c === "`") inTemplate = true;
      else if (c === "{") depth++;
      else if (c === "}" && --depth === 0) return text.slice(start, i + 1);
    }
    return null;
  }
  function parseFill(text) {
    if (!text) return null;
    const json = outermostObject(text.replace(/```(?:json)?/gi, ""));
    if (!json) return null;
    const parsed = parseLoose(json);
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed;
    const rawRegions = obj.regions && typeof obj.regions === "object" ? obj.regions : obj;
    const regions = {};
    for (const [id, value] of Object.entries(rawRegions)) {
      if (!/^r\d+$/.test(id)) continue;
      if (typeof value === "string") {
        regions[id] = { html: value };
        continue;
      }
      if (!value || typeof value !== "object") continue;
      const v = value;
      const html = typeof v.html === "string" ? v.html : typeof v.content === "string" ? v.content : "";
      if (!html) continue;
      regions[id] = {
        html,
        tag: typeof v.tag === "string" ? v.tag.toLowerCase() : void 0,
        style: typeof v.style === "string" ? v.style : void 0
      };
    }
    if (Object.keys(regions).length === 0) return null;
    const t = obj.theme && typeof obj.theme === "object" ? obj.theme : {};
    const str = (k) => typeof t[k] === "string" ? t[k] : void 0;
    return {
      theme: { background: str("background"), color: str("color"), accent: str("accent"), fontFamily: str("fontFamily") },
      regions
    };
  }
  function readingsToEdges(readings, targetIsCluster) {
    return readings.map((r) => ({
      // A cluster reading names a possible composition; a stroke reading names a
      // type. Both live in the same `type:` namespace the engine already uses.
      to: `type:${r.label.toLowerCase().replace(/\s+/g, "-")}`,
      rel: "resembles",
      weight: r.confidence,
      reasoning: r.reasoning || (targetIsCluster ? "proposed for this group" : "proposed for this mark")
    }));
  }
  function createAgentParticipant(session, config, at = 0) {
    const name = providerLabel(config);
    const id = session.join("agent", name, at, providerTier(config));
    async function interpret(nodeIds, now, signal) {
      const state = session.getState();
      const targets = nodeIds.filter((n2) => state.nodes.has(n2));
      if (targets.length === 0) return { ok: false, readings: [], error: "no such nodes" };
      const isCluster = targets.length > 1;
      const context = describeSession(state, { nodeIds: targets });
      const signature = isCluster ? describeSignature(state, targets) : "";
      const question = isCluster ? `These ${targets.length} marks were grouped together (${signature}). What could this group be? Offer several readings.` : `What could this mark be? Offer several readings.`;
      const result2 = await complete(
        config,
        [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `${context}

${question}` }
        ],
        { signal }
      );
      if (!result2.ok) return { ok: false, readings: [], error: result2.error };
      const readings = parseReadings(result2.text);
      if (readings.length === 0) {
        return { ok: false, readings: [], error: "no parseable readings", raw: result2.text };
      }
      const target = targets[0];
      session.propose({
        participantId: id,
        nodeId: target,
        edges: readingsToEdges(readings, isCluster),
        at: now
      });
      return { ok: true, readings, raw: result2.text };
    }
    async function ask(question, nodeIds, now, signal) {
      const q = question.trim();
      if (!q) return { ok: false, error: "no question" };
      const state = session.getState();
      const targets = nodeIds.filter((n2) => state.nodes.has(n2));
      if (targets.length === 0) return { ok: false, error: "no such nodes" };
      const context = describeSession(state, { nodeIds: targets });
      const result2 = await complete(
        config,
        [
          { role: "system", content: ASK_PROMPT },
          { role: "user", content: `${context}

Question: ${q}` }
        ],
        { signal }
      );
      if (!result2.ok) return { ok: false, error: result2.error };
      const text = result2.text.trim();
      if (!text) return { ok: false, error: "empty answer" };
      const explanationId = session.answer({
        participantId: id,
        question: q,
        text,
        aboutIds: targets,
        at: now
      });
      if (!explanationId) return { ok: false, error: "the canvas did not accept the answer", text };
      return { ok: true, text, explanationId };
    }
    function connectionsOf(artifact, state, regions) {
      const byNode = new Map(regions.map((r) => [r.nodeId, r.id]));
      const out = [];
      for (const e of artifact.edges) {
        if (e.rel !== "has-part") continue;
        const node = state.nodes.get(e.to);
        if (!node) continue;
        const ends = node.edges.filter((x) => x.rel === "connects").map((x) => byNode.get(x.to)).filter(Boolean);
        if (ends.length === 2) out.push({ from: ends[0], to: ends[1], via: byNode.get(node.id) });
      }
      return out;
    }
    async function generate(args) {
      const prompt2 = args.prompt.trim();
      if (!prompt2) return { ok: false, error: "no prompt" };
      const state = session.getState();
      const artifact = state.nodes.get(args.artifactId);
      if (!artifact) return { ok: false, error: "no such artifact" };
      const frame = frameOf(artifact);
      if (!frame) return { ok: false, error: "artifact has no frame" };
      const regions = regionsOf(artifact, state.nodes);
      if (regions.length === 0) return { ok: false, error: "nothing was drawn inside the artifact" };
      const layout = parseLayout(regions, frame, connectionsOf(artifact, state, regions));
      const existing = [...artifact.reps].reverse().find((r) => r.modality === "code");
      const previous = existing?.data?.fill;
      const revising = !!previous;
      const ids = regions.map((r) => r.id);
      const addressed = args.addressed?.length ? args.addressed : ids;
      const lines = [describeLayout(layout), ""];
      if (revising) {
        lines.push("WHAT EACH REGION HOLDS NOW:");
        for (const id2 of ids) {
          const c = previous.regions[id2];
          lines.push(`  ${id2}: ${c ? `<${c.tag ?? "div"}> ${c.html.replace(/\s+/g, " ").slice(0, 160)}` : "(empty)"}`);
        }
        lines.push("", `THE MARK LANDS ON: ${addressed.join(", ")}. Change only those.`);
      } else {
        lines.push(`REGIONS TO FILL: ${ids.join(", ")}`);
      }
      lines.push("", `The human asks: ${prompt2}`);
      const result2 = await complete(
        config,
        [
          { role: "system", content: revising ? REVISE_PROMPT : MAKE_PROMPT },
          { role: "user", content: lines.join("\n") }
        ],
        { signal: args.signal }
      );
      if (!result2.ok) return { ok: false, error: result2.error };
      const fill = parseFill(result2.text);
      if (!fill) return { ok: false, error: "no usable content in reply", raw: result2.text };
      const merged = {
        theme: { ...previous?.theme ?? {}, ...fill.theme ?? {} },
        regions: { ...previous?.regions ?? {} }
      };
      for (const [id2, content] of Object.entries(fill.regions)) {
        if (!ids.includes(id2)) continue;
        if (revising && !addressed.includes(id2)) continue;
        merged.regions[id2] = content;
      }
      const filled = ids.filter((id2) => merged.regions[id2]);
      if (filled.length === 0) {
        return { ok: false, error: "the model filled none of the regions", raw: result2.text };
      }
      const code = buildScaffold(layout, merged.regions, merged.theme);
      const check = validateRegions(code, ids);
      if (!check.ok) {
        return {
          ok: false,
          error: `the page does not match the drawing (missing ${check.missing.join(", ") || "none"}${check.duplicated.length ? `, duplicated ${check.duplicated.join(", ")}` : ""})`,
          code,
          raw: result2.text
        };
      }
      const accepted = session.attachCode({
        participantId: id,
        nodeId: args.artifactId,
        code,
        language: "html",
        prompt: prompt2,
        fill: merged,
        at: args.at
      });
      if (!accepted) {
        return { ok: false, error: "the canvas did not accept the code", code, raw: result2.text };
      }
      return {
        ok: true,
        code,
        revised: revising,
        filled,
        unfilled: ids.filter((x) => !merged.regions[x]),
        raw: result2.text
      };
    }
    return { id, name, config, interpret, ask, generate };
  }
  return __toCommonJS(index_exports);
})();

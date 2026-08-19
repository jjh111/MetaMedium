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
    BUILTIN_TYPES: () => BUILTIN_TYPES,
    COMMAND_MARK_SAMPLES: () => COMMAND_MARK_SAMPLES,
    DEFAULT_ERASE_CROSSINGS: () => DEFAULT_ERASE_CROSSINGS,
    DEFAULT_GESTURE_CONFIG: () => DEFAULT_GESTURE_CONFIG,
    DEFAULT_SESSION_CONFIG: () => DEFAULT_SESSION_CONFIG,
    DEFAULT_TIMEOUT_MS: () => DEFAULT_TIMEOUT_MS,
    LOCAL_PARTICIPANT: () => LOCAL_PARTICIPANT,
    MAX_READINGS: () => MAX_READINGS,
    PRESETS: () => PRESETS,
    TIER0_PARTICIPANT: () => TIER0_PARTICIPANT,
    aboutIdsOf: () => aboutIdsOf,
    analyzeCornerAngles: () => analyzeCornerAngles,
    analyzeStroke: () => analyzeStroke,
    boundingBoxDistance: () => boundingBoxDistance,
    boundsContain: () => boundsContain,
    boundsOf: () => boundsOf,
    boundsOverlap: () => boundsOverlap,
    buildSpatialGraph: () => buildSpatialGraph,
    bySource: () => bySource,
    byTier: () => byTier,
    calculateDistance: () => calculateDistance,
    calculateStraightness: () => calculateStraightness,
    checkOvershoot: () => checkOvershoot,
    collidesWith: () => collidesWith,
    complete: () => complete,
    convexHull: () => convexHull,
    countCorners: () => countCorners,
    countCrossings: () => countCrossings,
    createAgentParticipant: () => createAgentParticipant,
    createBootstrapNodes: () => createBootstrapNodes,
    createExplanationNode: () => createExplanationNode,
    createParticipantNode: () => createParticipantNode,
    createSession: () => createSession,
    describeAddressed: () => describeAddressed,
    describeRegions: () => describeRegions,
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
    matchPrimitiveFromLibrary: () => matchPrimitiveFromLibrary,
    matchesCommandMark: () => matchesCommandMark,
    normalizeStroke: () => normalizeStroke,
    outlineOf: () => outlineOf,
    parseCode: () => parseCode,
    parseReadings: () => parseReadings,
    providerLabel: () => providerLabel,
    providerTier: () => providerTier,
    readingsToEdges: () => readingsToEdges,
    regionAt: () => regionAt,
    regionsOf: () => regionsOf,
    regionsOverlapping: () => regionsOverlapping,
    resemblances: () => resemblances,
    resolvesLasso: () => resolvesLasso,
    scratchedOut: () => scratchedOut,
    segmentsIntersect: () => segmentsIntersect,
    simplifyStroke: () => simplifyStroke,
    smoothStroke: () => smoothStroke,
    sourcesOf: () => sourcesOf,
    spatialCluster: () => spatialCluster,
    strokePointsOf: () => strokePointsOf,
    strokesIntersect: () => strokesIntersect,
    topInterpretation: () => topInterpretation,
    typeNodeId: () => typeNodeId,
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
  function calculateStraightness(points) {
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
  function isStrokeClosed(points, threshold = 50) {
    if (points.length < 5) return false;
    const start = points[0];
    const end = points[points.length - 1];
    const distance = calculateDistance(start, end);
    if (distance < threshold) return true;
    const bounds = getBounds(points);
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const size = Math.max(width, height);
    const relativeGap = size > 0 ? distance / size : 1;
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
    const hull = [start, sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      let top = hull[hull.length - 1];
      let middle = hull[hull.length - 2];
      while (hull.length > 1 && ccw(middle, top, sorted[i]) <= 0) {
        hull.pop();
        top = hull[hull.length - 1];
        middle = hull[hull.length - 2];
      }
      hull.push(sorted[i]);
    }
    return hull;
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
    const hull = convexHull(points);
    if (hull.length <= targetCount) return hull;
    const corners = [];
    for (let i = 0; i < hull.length; i++) {
      const prev = hull[(i - 1 + hull.length) % hull.length];
      const curr = hull[i];
      const next = hull[(i + 1) % hull.length];
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
  function countCorners(points, angleThreshold = Math.PI / 3) {
    if (points.length < 15) {
      return { count: 0, angles: [], cornerData: [] };
    }
    const cornerPositions = [];
    const windowSize = 8;
    for (let i = windowSize; i < points.length - windowSize; i += 4) {
      const before = {
        x: points[i].x - points[i - windowSize].x,
        y: points[i].y - points[i - windowSize].y
      };
      const after = {
        x: points[i + windowSize].x - points[i].x,
        y: points[i + windowSize].y - points[i].y
      };
      const dotProduct = before.x * after.x + before.y * after.y;
      const magBefore = Math.sqrt(before.x * before.x + before.y * before.y);
      const magAfter = Math.sqrt(after.x * after.x + after.y * after.y);
      if (magBefore === 0 || magAfter === 0) continue;
      const cosAngle = dotProduct / (magBefore * magAfter);
      const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
      if (angle > angleThreshold) {
        cornerPositions.push({ index: i, angle });
      }
    }
    if (cornerPositions.length === 0) return { count: 0, angles: [], cornerData: [] };
    const clusteredCorners = [cornerPositions[0]];
    for (let i = 1; i < cornerPositions.length; i++) {
      const lastCorner = clusteredCorners[clusteredCorners.length - 1];
      const distance = cornerPositions[i].index - lastCorner.index;
      if (distance > 20) {
        clusteredCorners.push(cornerPositions[i]);
      } else if (cornerPositions[i].angle > lastCorner.angle) {
        clusteredCorners[clusteredCorners.length - 1] = cornerPositions[i];
      }
    }
    const cornersWithCoords = clusteredCorners.map((c) => ({
      index: c.index,
      angle: c.angle,
      x: points[c.index].x,
      y: points[c.index].y
    }));
    return {
      count: clusteredCorners.length,
      angles: clusteredCorners.map((c) => c.angle),
      cornerData: cornersWithCoords
    };
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
  function getFingerprint(points) {
    const bounds = getBounds(points);
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const cornerData = countCorners(points);
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
      isClosed: isStrokeClosed(points),
      closureDistance,
      bounds,
      size: Math.max(width, height),
      corners: cornerData.count,
      cornerAngles: cornerData.angles,
      cornerData: cornerData.cornerData,
      tipPoint,
      angleAnalysis,
      pointCount: points.length
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
        const right = douglasPeucker(pts.slice(maxIndex), tol);
        return [...left.slice(0, -1), ...right];
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
  function detectLine(fp, points) {
    const hasOvershoot = checkOvershoot(points);
    const isStraight = fp.straightness > 0.65;
    const notClosed = !fp.isClosed && !hasOvershoot;
    const fewCorners = fp.corners <= 2;
    if (isStraight && notClosed && fewCorners) {
      return {
        type: "line",
        label: "Line",
        score: 90,
        confidence: 0.9,
        reasoning: `straightness ${fp.straightness.toFixed(2)} > 0.65, open, ${fp.corners} corner(s)`
      };
    }
    return null;
  }
  function detectArc(fp, points) {
    const hasOvershoot = checkOvershoot(points);
    const notClosed = !fp.isClosed && !hasOvershoot;
    const fewCorners = fp.corners <= 1;
    const isCurved = fp.straightness < 0.6;
    if (notClosed && fewCorners && isCurved) {
      return {
        type: "arc",
        label: "Arc",
        score: 70,
        confidence: 0.7,
        reasoning: `open, curved (straightness ${fp.straightness.toFixed(2)} < 0.6), smooth`
      };
    }
    return null;
  }
  function detectTriangle(fp) {
    const isClosed = fp.isClosed;
    const hasThreeCorners = fp.corners >= 2 && fp.corners <= 3;
    const reasonableShape = fp.aspectRatio >= 0.3 && fp.aspectRatio <= 3;
    if (isClosed && hasThreeCorners && reasonableShape) {
      return {
        type: "triangle",
        label: "Triangle",
        score: 85,
        confidence: 0.85,
        reasoning: `closed with ${fp.corners} corner(s) in the triangle range (2\u20133)`
      };
    }
    return null;
  }
  function detectRectangle(fp) {
    const isClosed = fp.isClosed;
    const hasFourCorners = fp.corners >= 3 && fp.corners <= 4;
    const aspectRatioOk = fp.aspectRatio > 0.3 && fp.aspectRatio < 3;
    if (isClosed && hasFourCorners && aspectRatioOk) {
      return {
        type: "rectangle",
        label: "Rectangle",
        score: 80,
        confidence: 0.8,
        reasoning: `closed with ${fp.corners} corner(s) in the rectangle range (3\u20134)`
      };
    }
    return null;
  }
  function detectCircle(fp, points) {
    const hasOvershoot = checkOvershoot(points);
    const isClosed = fp.isClosed || hasOvershoot;
    const fewCorners = fp.corners <= 1;
    const notStraight = fp.straightness < 0.5;
    const reasonableRatio = fp.aspectRatio >= 0.3 && fp.aspectRatio <= 3;
    if (isClosed && fewCorners && notStraight && reasonableRatio) {
      return {
        type: "circle",
        label: "Circle",
        score: 80,
        confidence: 0.8,
        reasoning: `closed${hasOvershoot ? " (overshoot)" : ""}, curved, smooth, aspect ${fp.aspectRatio.toFixed(2)}`
      };
    }
    return null;
  }
  function analyzeStroke(points) {
    const fingerprint = getFingerprint(points);
    const results = [
      detectLine(fingerprint, points),
      detectArc(fingerprint, points),
      detectTriangle(fingerprint),
      detectRectangle(fingerprint),
      detectCircle(fingerprint, points)
    ].filter((r) => r !== null);
    results.sort((a, b) => b.score - a.score);
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
    const clusters = [];
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
      clusters.push(cluster);
    });
    return clusters;
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
    return rep ? rep.data.points : void 0;
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
  var FEATURES = ["straightness", "corners", "aspect", "closureRatio", "consistency"];
  var TOLERANCE_FLOOR = {
    straightness: 0.12,
    corners: 0.9,
    aspect: 0.25,
    closureRatio: 0.18,
    consistency: 0.3
  };
  var SPREAD_MULTIPLIER = 2.5;
  function featuresOf(fp) {
    const w = Math.max(1, fp.bounds.maxX - fp.bounds.minX);
    const h = Math.max(1, fp.bounds.maxY - fp.bounds.minY);
    const size = Math.max(1, fp.size);
    return {
      straightness: fp.straightness,
      corners: fp.corners,
      // Orientation-free: a tall mark and a wide mark of the same proportion read alike.
      aspect: Math.min(w, h) / Math.max(w, h),
      closureRatio: Math.min(1, fp.closureDistance / size),
      consistency: fp.angleAnalysis?.consistency ?? 0
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
    const perFeature = fps.map(featuresOf);
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
    const f = featuresOf(fp);
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

  // src/session/gesture.ts
  var DEFAULT_GESTURE_CONFIG = {
    checkWindowMs: 4e3,
    checkProximityPx: 80,
    checkMaxSizeRatio: 0.6,
    commandMark: null,
    requireIntersection: true
  };
  function isLassoLike(fp, enclosedContentCount) {
    return fp.isClosed && enclosedContentCount >= 1;
  }
  function enclosedBy(lassoBounds, candidates) {
    return candidates.filter((c) => boundsContain(lassoBounds, c.bounds)).map((c) => c.id);
  }
  function isCheckLike(fp, lassoFp, config = DEFAULT_GESTURE_CONFIG) {
    if (fp.isClosed) return false;
    if (fp.corners < 1 || fp.corners > 2) return false;
    if (fp.size > lassoFp.size * config.checkMaxSizeRatio) return false;
    return true;
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
    if (config.commandMark) {
      if (!matchesCommandMark(checkFp, config.commandMark).match) return false;
      if (checkFp.size > lassoFp.size) return false;
      if (config.requireIntersection && strokes) return strokesIntersect(strokes.check, strokes.lasso);
    } else {
      if (!isCheckLike(checkFp, lassoFp, config)) return false;
    }
    return boundsOverlap(checkFp.bounds, lassoFp.bounds) || boundingBoxDistance(checkFp.bounds, lassoFp.bounds) < config.checkProximityPx;
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
    const regions = sized.map(({ node, world }, i) => ({
      id: `r${i + 1}`,
      nodeId: node.id,
      shape: wordOf(node) ?? topInterpretation(node) ?? "art",
      rect: { x: world.x - frame.x, y: world.y - frame.y, w: world.w, h: world.h },
      world,
      contains: []
    }));
    for (const outer of regions) {
      for (const inner of regions) {
        if (outer.id !== inner.id && insideOf(outer.world, inner.world)) outer.contains.push(inner.id);
      }
    }
    return regions;
  }
  function regionAt(regions, x, y) {
    let best = null;
    for (const r of regions) {
      const { world: w } = r;
      if (x < w.x || y < w.y || x > w.x + w.w || y > w.y + w.h) continue;
      if (!best || w.w * w.h < best.world.w * best.world.h) best = r;
    }
    return best;
  }
  function regionsOverlapping(regions, b) {
    return regions.filter(
      (r) => !(b.maxX < r.world.x || b.minX > r.world.x + r.world.w || b.maxY < r.world.y || b.minY > r.world.y + r.world.h)
    );
  }

  // src/session/session.ts
  var DEFAULT_SESSION_CONFIG = {
    gesture: DEFAULT_GESTURE_CONFIG,
    clusterThresholdPx: 60,
    wireEndpointPx: 30,
    eraseCrossings: DEFAULT_ERASE_CROSSINGS
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
    let counter = 0;
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
      counter = 0;
      for (const n2 of createBootstrapNodes(0)) nodes.set(n2.id, n2);
    }
    reset();
    const nextId = (prefix) => `${prefix}:${++counter}`;
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
      const clusters = spatialCluster(comps, config.clusterThresholdPx);
      for (const cluster of clusters) {
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
    function inferWire(node, points) {
      const top = resemblances(node)[0];
      if (!top || top.to !== typeNodeId("line")) return;
      const nearest = (p) => {
        let best = null;
        for (const c of contentBoundsList(node.id)) {
          const d = distancePointToBounds(p, c.bounds);
          if (d < config.wireEndpointPx && (!best || d < best.d)) best = { id: c.id, d };
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
    function removeFromContent(id) {
      const idx = contentIds.indexOf(id);
      if (idx >= 0) contentIds.splice(idx, 1);
    }
    function applyStroke(ev) {
      const { points, at } = ev;
      const pid = ev.participantId ?? LOCAL_PARTICIPANT;
      const fp = getFingerprint(points);
      const node = {
        id: nextId("stroke"),
        reps: [
          { modality: "stroke", data: { points, at }, source: pid },
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
        if (resolvesLasso(fp, at, lassoFp, pendingLasso.at, gestureConfig, {
          check: points,
          lasso: lassoPoints
        })) {
          node.reps.push({
            modality: "gesture",
            data: { role: commandMark ? "command" : "check" },
            source: commandMark ? `command-mark:${commandMark.name}` : "heuristic"
          });
          lassoNode.reps.push({ modality: "gesture", data: { role: "lasso" }, source: "heuristic" });
          removeFromContent(lassoNode.id);
          const enclosedIds = enclosedBy(lassoFp.bounds, contentBoundsList());
          summon = {
            id: nextId("summon"),
            enclosedIds,
            suggestions: makeSuggestions(enclosedIds),
            gestureIds: [lassoNode.id, node.id],
            at
          };
          pendingLasso = null;
          recomputeClusterCandidates();
          return node.id;
        }
      }
      const scratched = scratchedOut(
        points,
        contentIds.filter((id) => id !== node.id).map((id) => {
          const n2 = nodes.get(id);
          const nfp = fingerprintOf(n2);
          return {
            id,
            points: strokePointsOf(n2) ?? void 0,
            bounds: boundsOf(n2) ?? void 0,
            closed: nfp?.isClosed ?? false
          };
        }),
        config.eraseCrossings
      );
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
      const analysis = analyzeStroke(points);
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
      inferWire(node, points);
      const enclosed = enclosedBy(fp.bounds, contentBoundsList(node.id));
      pendingLasso = isLassoLike(fp, enclosed.length) ? { id: node.id, at } : null;
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
          regions: regionsOf(node, nodes),
          at: ev.at
        },
        source: ev.participantId
      });
      if (!live.includes(node.id)) live.push(node.id);
      return node.id;
    }
    function applyEvent(ev) {
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
      const result = applyEvent(ev);
      notify();
      return result;
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
      addStroke: (points, at, participantId) => dispatch({ type: "stroke", points, at, participantId }),
      join: (kind, name, at, capability) => dispatch({ type: "join", kind, name, at, capability }),
      propose: (args) => void dispatch({ type: "propose", ...args }),
      answer: (args) => dispatch({ type: "answer", ...args }),
      teachCommandMark: (mark, at) => void dispatch({ type: "teach", mark, at }),
      attachCode: (args) => dispatch({ type: "code", ...args }),
      regions: (artifactId) => {
        const node = nodes.get(artifactId);
        return node ? regionsOf(node, nodes) : [];
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
  var DEFAULT_TIMEOUT_MS = 3e4;
  function providerLabel(config) {
    return config.label ?? `llm:${config.model}`;
  }
  function providerTier(config) {
    return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(config.baseUrl) ? 1 : 2;
  }
  function withTimeout(ms) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    return { signal: ctl.signal, done: () => clearTimeout(t) };
  }
  async function post(url, headers, body, timeoutMs) {
    const { signal, done } = withTimeout(timeoutMs);
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
      return { ok: false, error: signal.aborted ? `timed out after ${timeoutMs}ms` : msg };
    } finally {
      done();
    }
  }
  function firstString(...candidates) {
    for (const c of candidates) if (typeof c === "string" && c.length > 0) return c;
    return void 0;
  }
  async function completeOpenAICompatible(config, messages, timeoutMs) {
    const headers = {};
    if (config.apiKey) headers.authorization = `Bearer ${config.apiKey}`;
    const res = await post(
      `${config.baseUrl.replace(/\/$/, "")}/chat/completions`,
      headers,
      { model: config.model, messages, stream: false },
      timeoutMs
    );
    if (!res.ok) return res;
    const body = res.json;
    const text = firstString(body?.choices?.[0]?.message?.content);
    if (text === void 0) return { ok: false, error: "no completion text in response" };
    return { ok: true, text, model: firstString(body.model) ?? config.model };
  }
  async function completeAnthropic(config, messages, timeoutMs) {
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
      timeoutMs
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
  async function complete(config, messages) {
    const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    try {
      return config.kind === "anthropic" ? await completeAnthropic(config, messages, timeoutMs) : await completeOpenAICompatible(config, messages, timeoutMs);
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
      if (!res.ok) return [];
      const body = await res.json();
      return (body?.data ?? []).map((m) => m?.id).filter((id) => typeof id === "string");
    } catch {
      return [];
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
    const named = state.artifacts.map((id) => state.nodes.get(id)).filter((x) => !!x).map((a) => wordOf(a)).filter((w) => !!w);
    if (named.length > 0) {
      parts.push(`Known names in this session: ${named.join(", ")}`);
    }
    const others = state.participants.map((id) => state.nodes.get(id)).filter((x) => !!x).map((p) => wordOf(p)).filter((w) => !!w);
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
      const nested = r.contains.length ? `, contains ${r.contains.join(", ")}` : "";
      lines.push(`  ${r.id}: ${rect(r.rect)} \u2014 drawn as a ${r.shape}${nested}`);
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
  var MAKE_PROMPT = `You are a participant on a shared drawing canvas. The human has drawn a layout and asked you to build it.

You are given the FRAME and the REGIONS the human drew, measured in pixels, plus grounded facts about each mark. You are not given an image.

THE REGIONS ARE NOT SUGGESTIONS. The human drew them and their ink stays visible on the canvas outlining what you build. If you move, resize, or ignore a region, the ink will no longer line up with the result and the drawing will be visibly wrong. You choose what goes in a region and how it looks. You do not choose where the regions are.

Rules:
- Output a single self-contained HTML fragment: markup plus one <style> block. No <html>, <head>, or <body> tags, no external requests, no <script> unless the human asked for behaviour.
- Position each region with \`position:absolute\` at exactly the left/top/width/height you were given, on a \`position:relative\` root sized to the frame.
- Give every region-backed element \`data-region="rN"\` matching its region id. This is how the canvas knows which of your elements the human's ink is pointing at \u2014 omitting it breaks the link between the drawing and the code.
- A region that contains others is their container; nest accordingly and position children relative to it.
- Design it well within those constraints: real copy, considered type, sensible colour. Do not emit placeholder lorem ipsum.

Reply with ONLY the HTML. No prose, no code fences, no explanation.`;
  var REVISE_PROMPT = `You are a participant on a shared drawing canvas, revising code you or another participant already generated.

You are given the existing HTML, the region frame it was built against, and which regions the human's new mark lands on.

Rules:
- Return the COMPLETE revised HTML fragment, not a diff and not a fragment of a fragment.
- Change only what the addressed regions cover. Everything else must come back byte-identical.
- Keep every \`data-region\` attribute and every absolute position exactly as they were. The human's ink is registered against those coordinates.
- If the request cannot be satisfied without moving a region, do the closest thing that keeps the geometry, and do not move it.

Reply with ONLY the HTML. No prose, no code fences, no explanation.`;
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
    async function interpret(nodeIds, now) {
      const state = session.getState();
      const targets = nodeIds.filter((n2) => state.nodes.has(n2));
      if (targets.length === 0) return { ok: false, readings: [], error: "no such nodes" };
      const isCluster = targets.length > 1;
      const context = describeSession(state, { nodeIds: targets });
      const signature = isCluster ? describeSignature(state, targets) : "";
      const question = isCluster ? `These ${targets.length} marks were grouped together (${signature}). What could this group be? Offer several readings.` : `What could this mark be? Offer several readings.`;
      const result = await complete(config, [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `${context}

${question}` }
      ]);
      if (!result.ok) return { ok: false, readings: [], error: result.error };
      const readings = parseReadings(result.text);
      if (readings.length === 0) {
        return { ok: false, readings: [], error: "no parseable readings", raw: result.text };
      }
      const target = targets[0];
      session.propose({
        participantId: id,
        nodeId: target,
        edges: readingsToEdges(readings, isCluster),
        at: now
      });
      return { ok: true, readings, raw: result.text };
    }
    async function ask(question, nodeIds, now) {
      const q = question.trim();
      if (!q) return { ok: false, error: "no question" };
      const state = session.getState();
      const targets = nodeIds.filter((n2) => state.nodes.has(n2));
      if (targets.length === 0) return { ok: false, error: "no such nodes" };
      const context = describeSession(state, { nodeIds: targets });
      const result = await complete(config, [
        { role: "system", content: ASK_PROMPT },
        { role: "user", content: `${context}

Question: ${q}` }
      ]);
      if (!result.ok) return { ok: false, error: result.error };
      const text = result.text.trim();
      if (!text) return { ok: false, error: "empty answer" };
      const explanationId = session.answer({
        participantId: id,
        question: q,
        text,
        aboutIds: targets,
        at: now
      });
      return { ok: true, text, explanationId: explanationId ?? void 0 };
    }
    async function generate(args) {
      const prompt = args.prompt.trim();
      if (!prompt) return { ok: false, error: "no prompt" };
      const state = session.getState();
      const artifact = state.nodes.get(args.artifactId);
      if (!artifact) return { ok: false, error: "no such artifact" };
      const frame = frameOf(artifact);
      if (!frame) return { ok: false, error: "artifact has no frame" };
      const regions = regionsOf(artifact, state.nodes);
      const existing = [...artifact.reps].reverse().find((r) => r.modality === "code");
      const revising = !!existing;
      const context = describeSession(state, {
        nodeIds: regions.map((r) => r.nodeId)
      });
      const user = revising ? [
        describeRegions(regions, frame),
        "",
        "EXISTING CODE:",
        String(existing.data.code),
        "",
        describeAddressed(regions, args.addressed ?? []),
        "",
        `The human asks: ${prompt}`
      ].join("\n") : [context, "", describeRegions(regions, frame), "", `The human asks: ${prompt}`].join("\n");
      const result = await complete(config, [
        { role: "system", content: revising ? REVISE_PROMPT : MAKE_PROMPT },
        { role: "user", content: user }
      ]);
      if (!result.ok) return { ok: false, error: result.error };
      const code = parseCode(result.text);
      if (!code) return { ok: false, error: "no usable code in reply", raw: result.text };
      session.attachCode({
        participantId: id,
        nodeId: args.artifactId,
        code,
        language: "html",
        prompt,
        at: args.at
      });
      return { ok: true, code, revised: revising, raw: result.text };
    }
    return { id, name, config, interpret, ask, generate };
  }
  return __toCommonJS(index_exports);
})();

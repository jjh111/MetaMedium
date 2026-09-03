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
      for (let key2 of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key2) && key2 !== except)
          __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
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
    DEFAULT_MAX_FORCE: () => DEFAULT_MAX_FORCE,
    DEFAULT_RELATE_CONFIG: () => DEFAULT_RELATE_CONFIG,
    DEFAULT_SESSION_CONFIG: () => DEFAULT_SESSION_CONFIG,
    DEFAULT_SPEED: () => DEFAULT_SPEED,
    DEFAULT_TIMEOUT_MS: () => DEFAULT_TIMEOUT_MS,
    HAND_RESOLUTION_PX: () => HAND_RESOLUTION_PX,
    LETTER_MAX_HEIGHT_PX: () => LETTER_MAX_HEIGHT_PX,
    LOCAL_PARTICIPANT: () => LOCAL_PARTICIPANT,
    LOCAL_TIMEOUT_MS: () => LOCAL_TIMEOUT_MS,
    MAX_DRAWN: () => MAX_DRAWN,
    MAX_READINGS: () => MAX_READINGS,
    MAX_TIER0_CONFIDENCE: () => MAX_TIER0_CONFIDENCE,
    MIN_CONFIDENCE: () => MIN_CONFIDENCE,
    PRESETS: () => PRESETS,
    ROLES: () => ROLES,
    SETTLED_CONFIDENCE: () => SETTLED_CONFIDENCE,
    SNAPPABLE: () => SNAPPABLE,
    SNAP_CONFIDENCE: () => SNAP_CONFIDENCE,
    SNAP_MARGIN: () => SNAP_MARGIN,
    TARGETED: () => TARGETED,
    TIER0_PARTICIPANT: () => TIER0_PARTICIPANT,
    VERBS: () => VERBS,
    WORD_GAP_RATIO: () => WORD_GAP_RATIO,
    WORD_WINDOW_MS: () => WORD_WINDOW_MS,
    aboutIdsOf: () => aboutIdsOf,
    analyzeCornerAngles: () => analyzeCornerAngles,
    analyzeStroke: () => analyzeStroke,
    applyWalls: () => applyWalls,
    assignRoles: () => assignRoles,
    between: () => between,
    boundingBoxDistance: () => boundingBoxDistance,
    boundsContain: () => boundsContain,
    boundsOf: () => boundsOf,
    boundsOverlap: () => boundsOverlap,
    buildGraphScaffold: () => buildGraphScaffold,
    buildScaffold: () => buildScaffold,
    bySource: () => bySource,
    byTier: () => byTier,
    calculateDistance: () => calculateDistance,
    calculateStraightness: () => calculateStraightness,
    canonicalCheckSamples: () => canonicalCheckSamples,
    checkOvershoot: () => checkOvershoot,
    cleanOf: () => cleanOf,
    cleanPointsOf: () => cleanPointsOf,
    clusters: () => clusters,
    collidesWith: () => collidesWith,
    commandMarkFeatures: () => commandMarkFeatures,
    complete: () => complete,
    convexHull: () => convexHull,
    countCorners: () => countCorners,
    countCrossings: () => countCrossings,
    createAgentParticipant: () => createAgentParticipant,
    createBootstrapNodes: () => createBootstrapNodes,
    createBridgeParticipant: () => createBridgeParticipant,
    createExplanationNode: () => createExplanationNode,
    createParticipantNode: () => createParticipantNode,
    createSession: () => createSession,
    denoise: () => denoise,
    describeAddressed: () => describeAddressed,
    describeGraph: () => describeGraph,
    describeLayout: () => describeLayout,
    describeMaths: () => describeMaths,
    describeReading: () => describeReading,
    describeRegions: () => describeRegions,
    describeRelations: () => describeRelations,
    describeRoles: () => describeRoles,
    describeRoute: () => describeRoute,
    describeSession: () => describeSession,
    describeSignature: () => describeSignature,
    describeSnap: () => describeSnap,
    disagreement: () => disagreement,
    enclosedBy: () => enclosedBy,
    explanationOf: () => explanationOf,
    findCorners: () => findCorners,
    findCornersWithSeparation: () => findCornersWithSeparation,
    fingerprintOf: () => fingerprintOf,
    fit: () => fit2,
    force: () => force,
    frameOf: () => frameOf,
    genreOf: () => genreOf,
    getBounds: () => getBounds,
    getBoundsFromStroke: () => getBoundsFromStroke,
    getFingerprint: () => getFingerprint,
    getRep: () => getRep,
    has: () => has,
    hasMultipleSources: () => hasMultipleSources,
    idealize: () => idealize,
    intents: () => intents,
    interpretationsOf: () => interpretationsOf,
    isCheckLike: () => isCheckLike,
    isExplanation: () => isExplanation,
    isGesture: () => isGesture,
    isLassoLike: () => isLassoLike,
    isLetterLike: () => isLetterLike,
    isParticipant: () => isParticipant,
    isStrokeClosed: () => isStrokeClosed,
    isWord: () => isWord,
    joinsRun: () => joinsRun,
    learnCommandMark: () => learnCommandMark,
    lettersOf: () => lettersOf,
    listModels: () => listModels,
    matchConcepts: () => matchConcepts,
    matchPrimitiveFromLibrary: () => matchPrimitiveFromLibrary,
    matchesCommandMark: () => matchesCommandMark,
    measure: () => measure,
    mergeLogs: () => mergeLogs,
    nodeIdsIn: () => nodeIdsIn,
    normalizeStroke: () => normalizeStroke,
    outlineOf: () => outlineOf,
    parseCode: () => parseCode,
    parseFill: () => parseFill,
    parseGraph: () => parseGraph,
    parseLayout: () => parseLayout,
    parseReadings: () => parseReadings,
    parseShapes: () => parseShapes,
    parseTranscripts: () => parseTranscripts,
    placed: () => placed,
    prepare: () => prepare,
    providerLabel: () => providerLabel,
    providerTier: () => providerTier,
    readingsToEdges: () => readingsToEdges,
    regionAt: () => regionAt,
    regionIdsIn: () => regionIdsIn,
    regionsOf: () => regionsOf,
    regionsOverlapping: () => regionsOverlapping,
    relate: () => relate,
    relationsOf: () => relationsOf,
    resampleByArcLength: () => resampleByArcLength,
    resemblances: () => resemblances,
    resolvesLasso: () => resolvesLasso,
    route: () => route,
    scratchedOut: () => scratchedOut,
    seeded: () => seeded,
    segmentsIntersect: () => segmentsIntersect,
    shapeExtent: () => shapeExtent,
    simplifyStroke: () => simplifyStroke,
    sizeOf: () => sizeOf,
    smoothStroke: () => smoothStroke,
    snapReading: () => snapReading,
    sourcesOf: () => sourcesOf,
    steer: () => steer,
    step: () => step,
    stripThink: () => stripThink,
    strokeFor: () => strokeFor,
    strokePointsOf: () => strokePointsOf,
    strokesIntersect: () => strokesIntersect,
    textOf: () => textOf,
    topInterpretation: () => topInterpretation,
    transcriptOf: () => transcriptOf,
    transcriptsOf: () => transcriptsOf,
    typeNodeId: () => typeNodeId,
    validateRegions: () => validateRegions,
    wallBoxes: () => wallBoxes,
    whyNotResolved: () => whyNotResolved,
    wordConfidence: () => wordConfidence,
    wordOf: () => wordOf,
    worldOf: () => worldOf
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
    let windowFrac = opts.window;
    let sepFrac = opts.separation;
    if (isClosed2) {
      const bb = getBounds(points);
      const bw = bb.maxX - bb.minX, bh = bb.maxY - bb.minY;
      const shortFrac = Math.min(bw, bh) / Math.max(1e-6, 2 * (bw + bh));
      windowFrac = Math.min(opts.window, Math.max(0.02, shortFrac * 0.6));
      sepFrac = Math.min(opts.separation, Math.max(0.03, shortFrac * 0.7));
    }
    const arm = Math.max(2, Math.round(windowFrac * path.length));
    const sep = Math.max(2, Math.round(sepFrac * path.length));
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
    let area2 = 0;
    for (let i = 0; i < points.length; i++) {
      const p = points[i], q = points[(i + 1) % points.length];
      area2 += p.x * q.y - q.x * p.y;
    }
    area2 = Math.abs(area2) / 2;
    if (area2 <= 0) return 0;
    const hull2 = convexHull(points);
    if (hull2.length < 3) return 0;
    let best = Infinity;
    for (let i = 0; i < hull2.length; i++) {
      const a = hull2[i], b = hull2[(i + 1) % hull2.length];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 1e-9) continue;
      const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
      let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
      for (const p of hull2) {
        const u = p.x * ux + p.y * uy, v = -p.x * uy + p.y * ux;
        if (u < minU) minU = u;
        if (u > maxU) maxU = u;
        if (v < minV) minV = v;
        if (v > maxV) maxV = v;
      }
      const boxArea = (maxU - minU) * (maxV - minV);
      if (boxArea > 0 && boxArea < best) best = boxArea;
    }
    if (!Number.isFinite(best) || best <= 0) return 0;
    return Math.min(1, area2 / best);
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
        const dist2 = perpendicularDistance(pts[i], start, end);
        if (dist2 > maxDist) {
          maxDist = dist2;
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
  function result(type, label, fitScore, reasoning, meta) {
    const confidence = fitScore * MAX_TIER0_CONFIDENCE;
    if (confidence < MIN_CONFIDENCE) return null;
    return { type, label, score: Math.round(confidence * 100), confidence, reasoning, ...meta ? { meta } : {} };
  }
  var HAND_RESOLUTION_PX = 8;
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
  function detectDot(fp, scale) {
    const screen = fp.size / scale;
    const tiny = 1 - ramp(screen, 6, 18);
    return result("dot", "Dot", tiny, `${Math.round(screen)}px on screen \u2014 a point, not a shape`);
  }
  function detectText(fp, points, scale = 1) {
    if (fp.isClosed || checkOvershoot(points, 50 * scale)) return null;
    const wiggle = ramp(fp.corners, 2, 6);
    const sparse = 1 - ramp(fp.extent, 0.3, 0.7);
    const curvy = 1 - ramp(fp.straightness, 0.25, 0.65);
    const wide = ramp(fp.aspectRatio, 0.6, 2);
    if (fp.corners < 3) return null;
    const confidence = wiggle * 0.4 + sparse * 0.25 + curvy * 0.2 + wide * 0.15;
    return result(
      "text",
      "Text",
      confidence,
      `open, turns ${fp.corners} times, fills ${(fp.extent * 100).toFixed(0)}% of a ${fp.aspectRatio.toFixed(1)}:1 box \u2014 writing, not a shape`
    );
  }
  function detectArrow(fp, points, scale = 1) {
    if (fp.isClosed || checkOvershoot(points, 50 * scale)) return null;
    const corners = fp.cornerData ?? [];
    if (corners.length === 0 || corners.length > 4) return null;
    const HEAD = 0.42;
    const atEnd = corners.filter((c) => c.t >= 1 - HEAD);
    const atStart = corners.filter((c) => c.t <= HEAD);
    if (corners.some((c) => c.t > HEAD && c.t < 1 - HEAD)) return null;
    if (atEnd.length > 0 && atStart.length > 0) return null;
    const path = resampleByArcLength(points, 100);
    const tryHead = (head, cs) => {
      if (cs.length === 0) return null;
      const first = cs.reduce((a, c) => head === "end" ? Math.min(a, c.t) : Math.max(a, c.t), head === "end" ? 1 : 0);
      const shaft = head === "end" ? path.slice(0, Math.max(3, Math.round(first * 100))) : path.slice(Math.min(97, Math.round(first * 100)));
      const straight = calculateStraightness(shaft);
      const sharpest = Math.max(...cs.map((c) => c.angle));
      const shaftOk = ramp(straight, 0.72, 0.95);
      const barbOk = ramp(sharpest, 55 * Math.PI / 180, 110 * Math.PI / 180);
      const headLen = head === "end" ? 1 - first : first;
      const shortHead = 1 - ramp(headLen, 0.3, 0.45);
      const tipIdx = Math.round(first * 99);
      return {
        fit: shaftOk * 0.5 + barbOk * 0.35 + shortHead * 0.15,
        head,
        tip: path[tipIdx],
        tail: head === "end" ? path[0] : path[99],
        straight,
        sharpest
      };
    };
    const best = [tryHead("end", atEnd), tryHead("start", atStart)].filter((x) => !!x).sort((a, b) => b.fit - a.fit)[0];
    if (!best) return null;
    return result(
      "arrow",
      "Arrow",
      best.fit,
      `a straight shaft (${best.straight.toFixed(2)}) with a ${Math.round(best.sharpest * 180 / Math.PI)}\xB0 barb at the ${best.head}`,
      { head: best.head, tip: best.tip, tail: best.tail }
    );
  }
  function analyzeStroke(points, scale = 1) {
    const fingerprint = getFingerprint(points, scale);
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
      detectArrow(fingerprint, points, scale)
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

  // src/session/nodes.ts
  var BUILTIN_TYPES = ["circle", "line", "rectangle", "triangle", "arc", "arrow", "text", "dot"];
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
    return placed(node, points);
  }
  function placed(node, points) {
    const raw = getRep(node, "stroke")?.data?.points ?? points;
    const to = getRep(node, "transform")?.data;
    const rotation = getRep(node, "rotation")?.data ?? 0;
    let out = points;
    if (to) {
      const from = getBounds(raw);
      const fw = Math.max(1e-6, from.maxX - from.minX);
      const fh = Math.max(1e-6, from.maxY - from.minY);
      const sx = (to.maxX - to.minX) / fw;
      const sy = (to.maxY - to.minY) / fh;
      out = points.map((p) => ({ ...p, x: to.minX + (p.x - from.minX) * sx, y: to.minY + (p.y - from.minY) * sy }));
    }
    if (rotation) {
      const frame = to ?? getBounds(raw);
      const cx2 = (frame.minX + frame.maxX) / 2, cy2 = (frame.minY + frame.maxY) / 2;
      const c = Math.cos(rotation), s = Math.sin(rotation);
      out = out.map((p) => ({ ...p, x: cx2 + (p.x - cx2) * c - (p.y - cy2) * s, y: cy2 + (p.x - cx2) * s + (p.y - cy2) * c }));
    }
    return out;
  }
  function wordOf(node) {
    return getRep(node, "word")?.data;
  }
  function transcriptsOf(node) {
    return node.reps.filter((r) => r.modality === "transcript").map((r) => {
      const d = r.data;
      return {
        text: typeof d?.text === "string" ? d.text : "",
        confidence: r.confidence ?? 0,
        source: r.source,
        reasoning: typeof d?.reasoning === "string" ? d.reasoning : void 0
      };
    }).filter((t) => t.text.length > 0).sort((a, b) => b.confidence - a.confidence);
  }
  function transcriptOf(node) {
    return transcriptsOf(node)[0]?.text;
  }
  function isWord(node) {
    return getRep(node, "word-run") !== void 0;
  }
  function lettersOf(node) {
    return (getRep(node, "word-run")?.data?.letters ?? []).slice();
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
    if (getRep(node, "rotation") && getRep(node, "stroke")) return getBounds(strokePointsOf(node));
    const moved = getRep(node, "transform")?.data;
    if (moved) return moved;
    const fp = fingerprintOf(node);
    if (fp) return fp.bounds;
    return getRep(node, "bounds")?.data;
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
    return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([key2, list]) => ({ key: key2, label: `tier ${key2}`, interpretations: list }));
  }
  function bySource(interpretations) {
    const groups = /* @__PURE__ */ new Map();
    for (const i of interpretations) {
      const key2 = i.source ?? TIER0_PARTICIPANT;
      const g = groups.get(key2);
      if (g) g.push(i);
      else groups.set(key2, [i]);
    }
    return [...groups.entries()].map(([key2, list]) => ({
      key: key2,
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

  // src/session/clean.ts
  var SNAP_CONFIDENCE = 0.7;
  var SNAP_MARGIN = 0.12;
  var SNAPPABLE = /* @__PURE__ */ new Set(["rectangle", "circle", "triangle", "line", "arrow", "arc", "dot"]);
  function snapReading(node, nodes) {
    const tier0 = interpretationsOf(node, nodes).filter((r) => r.tier === 0 && r.to.startsWith("type:"));
    const top = tier0[0];
    if (!top) return { shape: "art", weight: 0, ok: false, reasoning: "no shape reading" };
    const second = tier0[1];
    const shape = top.label;
    if (!SNAPPABLE.has(shape)) {
      return { shape, weight: top.weight, ok: false, reasoning: `${shape} has no clean form` };
    }
    if (top.weight < SNAP_CONFIDENCE) {
      return { shape, weight: top.weight, ok: false, reasoning: `${shape} ${top.weight.toFixed(2)} is below ${SNAP_CONFIDENCE}` };
    }
    if (second && top.weight - second.weight < SNAP_MARGIN) {
      return {
        shape,
        weight: top.weight,
        ok: false,
        reasoning: `${shape} ${top.weight.toFixed(2)} and ${second.label} ${second.weight.toFixed(2)} are too close to call`
      };
    }
    return {
      shape,
      weight: top.weight,
      ok: true,
      reasoning: second ? `${shape} ${top.weight.toFixed(2)}, well ahead of ${second.label} ${second.weight.toFixed(2)}` : `${shape} ${top.weight.toFixed(2)}, unopposed`
    };
  }
  var TAU = Math.PI * 2;
  function ellipse(b, n2 = 64) {
    const cx2 = (b.minX + b.maxX) / 2, cy2 = (b.minY + b.maxY) / 2;
    const rx = (b.maxX - b.minX) / 2, ry = (b.maxY - b.minY) / 2;
    const out = [];
    for (let i = 0; i < n2; i++) {
      const a = i / n2 * TAU;
      out.push({ x: cx2 + rx * Math.cos(a), y: cy2 + ry * Math.sin(a) });
    }
    return out;
  }
  function sideOf(a, b, p) {
    return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  }
  function circumcircle(a, b, c) {
    const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
    if (Math.abs(d) < 1e-9) return null;
    const a2 = a.x * a.x + a.y * a.y, b2 = b.x * b.x + b.y * b.y, c2 = c.x * c.x + c.y * c.y;
    const cx2 = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d;
    const cy2 = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d;
    return { cx: cx2, cy: cy2, r: Math.hypot(a.x - cx2, a.y - cy2) };
  }
  function idealize(node, shape) {
    const fp = fingerprintOf(node);
    const raw = getRep(node, "stroke")?.data?.points;
    if (!fp || !raw || raw.length < 2) return null;
    const b = fp.bounds;
    const w2 = b.maxX - b.minX, h2 = b.maxY - b.minY;
    switch (shape) {
      case "rectangle": {
        return {
          shape,
          closed: true,
          points: [
            { x: b.minX, y: b.minY },
            { x: b.maxX, y: b.minY },
            { x: b.maxX, y: b.maxY },
            { x: b.minX, y: b.maxY }
          ],
          reasoning: `the box the ink fills, ${Math.round(w2)}\xD7${Math.round(h2)}, squared up`
        };
      }
      case "circle": {
        const aspect = Math.min(w2, h2) / Math.max(1e-6, w2, h2);
        if (aspect > 0.85) {
          const r = (w2 + h2) / 4;
          const cx2 = (b.minX + b.maxX) / 2, cy2 = (b.minY + b.maxY) / 2;
          return {
            shape,
            closed: true,
            points: ellipse({ minX: cx2 - r, maxX: cx2 + r, minY: cy2 - r, maxY: cy2 + r }),
            reasoning: `a circle of radius ${Math.round(r)} on the ink's centre`
          };
        }
        return { shape, closed: true, points: ellipse(b), reasoning: `an oval ${Math.round(w2)}\xD7${Math.round(h2)}, as drawn` };
      }
      case "triangle": {
        const corners = (fp.cornerData ?? []).slice().sort((p, q) => q.angle - p.angle).slice(0, 3);
        if (corners.length === 3) {
          corners.sort((p, q) => p.t - q.t);
          return {
            shape,
            closed: true,
            points: corners.map((c) => ({ x: c.x, y: c.y })),
            reasoning: "its three sharpest corners, joined straight"
          };
        }
        return {
          shape,
          closed: true,
          points: [{ x: (b.minX + b.maxX) / 2, y: b.minY }, { x: b.maxX, y: b.maxY }, { x: b.minX, y: b.maxY }],
          reasoning: "an upright triangle in the box the ink fills"
        };
      }
      case "line": {
        return { shape, closed: false, points: [fp.start, fp.end], reasoning: "its two ends, joined straight" };
      }
      case "arrow": {
        const meta = getRep(node, "reading:arrow")?.data;
        const tail = meta?.tail ?? fp.start, tip = meta?.tip ?? fp.end;
        const len = Math.hypot(tip.x - tail.x, tip.y - tail.y);
        if (len < 1e-6) return null;
        const ux = (tip.x - tail.x) / len, uy = (tip.y - tail.y) / len;
        const barb = Math.max(6, Math.min(len * 0.28, 40));
        const wing = (s) => ({
          x: tip.x - barb * (ux * Math.cos(0.5) - s * uy * Math.sin(0.5)),
          y: tip.y - barb * (uy * Math.cos(0.5) + s * ux * Math.sin(0.5))
        });
        return {
          shape,
          closed: false,
          points: [tail, tip, wing(1), tip, wing(-1)],
          reasoning: "a straight shaft from tail to tip, with an even barb"
        };
      }
      case "arc": {
        const a = fp.start, c = fp.end;
        let mid = raw[Math.floor(raw.length / 2)], best = -1;
        for (const p of raw) {
          const d = Math.abs(sideOf(a, c, p));
          if (d > best) {
            best = d;
            mid = p;
          }
        }
        const cc = circumcircle(a, mid, c);
        if (!cc) return { shape: "line", closed: false, points: [a, c], reasoning: "too flat to bow; drawn straight" };
        const a0 = Math.atan2(a.y - cc.cy, a.x - cc.cx);
        const a1 = Math.atan2(c.y - cc.cy, c.x - cc.cx);
        const am = Math.atan2(mid.y - cc.cy, mid.x - cc.cx);
        let sweep = a1 - a0;
        const norm = (x) => (x % TAU + TAU) % TAU;
        const viaCcw = norm(am - a0) < norm(a1 - a0);
        sweep = viaCcw ? norm(a1 - a0) : -norm(a0 - a1);
        const n2 = 40;
        const points = [];
        for (let i = 0; i <= n2; i++) {
          const t = a0 + sweep * i / n2;
          points.push({ x: cc.cx + cc.r * Math.cos(t), y: cc.cy + cc.r * Math.sin(t) });
        }
        return { shape, closed: false, points, reasoning: `a circular arc of radius ${Math.round(cc.r)} through its ends and its bulge` };
      }
      case "dot": {
        const cx2 = (b.minX + b.maxX) / 2, cy2 = (b.minY + b.maxY) / 2;
        const r = Math.max(1.5, Math.max(w2, h2) / 2);
        return {
          shape,
          closed: true,
          points: ellipse({ minX: cx2 - r, maxX: cx2 + r, minY: cy2 - r, maxY: cy2 + r }, 24),
          reasoning: "a round dot where the ink landed"
        };
      }
      default:
        return null;
    }
  }
  function cleanOf(node) {
    return getRep(node, "clean")?.data;
  }
  function cleanPointsOf(node) {
    const clean = cleanOf(node);
    if (!clean) return void 0;
    if (!getRep(node, "stroke")) return clean.points;
    return placed(node, clean.points);
  }
  function describeSnap(node, nodes) {
    const clean = cleanOf(node);
    if (clean) return `drawn clean as a ${clean.shape} \u2014 ${clean.reasoning}`;
    const r = snapReading(node, nodes);
    const name = wordOf(node);
    return (r.ok ? `could be drawn clean as a ${r.shape}` : `kept as ink`) + (name ? ` (${name})` : "") + ` \u2014 ${r.reasoning}`;
  }

  // src/session/synthesize.ts
  var MAX_DRAWN = 8;
  function seg(a, b, n2, out, skipFirst) {
    for (let i = skipFirst ? 1 : 0; i < n2; i++) {
      const t = i / (n2 - 1);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  function strokeFor(s) {
    if (s.shape === "line" || s.shape === "arrow") {
      const len = Math.hypot(s.to.x - s.from.x, s.to.y - s.from.y);
      if (!(len > 1)) return null;
      const out2 = [];
      seg(s.from, s.to, Math.max(12, Math.round(len / 6)), out2, false);
      if (s.shape === "arrow") {
        const ux = (s.to.x - s.from.x) / len, uy = (s.to.y - s.from.y) / len;
        const barb = Math.max(8, Math.min(len * 0.2, 40));
        const wing = (side) => ({
          x: s.to.x - barb * (ux * Math.cos(0.5) - side * uy * Math.sin(0.5)),
          y: s.to.y - barb * (uy * Math.cos(0.5) + side * ux * Math.sin(0.5))
        });
        seg(s.to, wing(1), 8, out2, true);
        seg(wing(1), s.to, 8, out2, true);
        seg(s.to, wing(-1), 8, out2, true);
      }
      return out2;
    }
    const r = s;
    const { x, y, w: w2, h: h2 } = r;
    if (!(w2 > 1) || !(h2 > 1)) return null;
    if (r.shape === "circle") {
      const out2 = [];
      const n2 = 96;
      for (let i = 0; i <= n2; i++) {
        const a = i / n2 * Math.PI * 2;
        out2.push({ x: x + w2 / 2 + w2 / 2 * Math.cos(a), y: y + h2 / 2 + h2 / 2 * Math.sin(a) });
      }
      return out2;
    }
    const verts = r.shape === "triangle" ? [{ x: x + w2 / 2, y }, { x: x + w2, y: y + h2 }, { x, y: y + h2 }] : [{ x, y }, { x: x + w2, y }, { x: x + w2, y: y + h2 }, { x, y: y + h2 }];
    const out = [];
    const per = Math.max(10, Math.round(Math.max(w2, h2) / 8));
    for (let i = 0; i < verts.length; i++) seg(verts[i], verts[(i + 1) % verts.length], per, out, i > 0);
    return out;
  }
  function parseShapes(text) {
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
    const num2 = (v) => typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : null;
    const pt = (v) => {
      if (!v || typeof v !== "object") return null;
      const r = v;
      const x = num2(r.x), y = num2(r.y);
      return x === null || y === null ? null : { x, y };
    };
    const out = [];
    for (const item of parsed) {
      if (out.length >= MAX_DRAWN) break;
      if (!item || typeof item !== "object") continue;
      const r = item;
      const kind = String(r.shape ?? r.type ?? r.kind ?? "").toLowerCase().trim();
      const why = typeof r.why === "string" ? r.why : typeof r.reasoning === "string" ? r.reasoning : void 0;
      if (kind === "line" || kind === "arrow") {
        const from = pt(r.from) ?? (num2(r.x1) !== null && num2(r.y1) !== null ? { x: num2(r.x1), y: num2(r.y1) } : null);
        const to = pt(r.to) ?? (num2(r.x2) !== null && num2(r.y2) !== null ? { x: num2(r.x2), y: num2(r.y2) } : null);
        if (from && to) out.push({ shape: kind, from, to, why });
        continue;
      }
      if (kind === "rectangle" || kind === "rect" || kind === "box" || kind === "circle" || kind === "ellipse" || kind === "triangle") {
        const x = num2(r.x), y = num2(r.y), w2 = num2(r.w ?? r.width), h2 = num2(r.h ?? r.height);
        if (x === null || y === null || w2 === null || h2 === null) continue;
        const shape = kind === "rect" || kind === "box" ? "rectangle" : kind === "ellipse" ? "circle" : kind;
        out.push({ shape, x, y, w: w2, h: h2, why });
      }
    }
    return out;
  }

  // src/session/measure.ts
  var deg = (rad) => rad * 180 / Math.PI;
  var r0 = (v) => Math.round(v);
  var r1 = (v) => Math.round(v * 10) / 10;
  function angleAt(prev, v, next) {
    const a = Math.atan2(prev.y - v.y, prev.x - v.x);
    const b = Math.atan2(next.y - v.y, next.x - v.x);
    let d = Math.abs(a - b);
    if (d > Math.PI) d = 2 * Math.PI - d;
    return deg(d);
  }
  function classify(degrees) {
    if (Math.abs(degrees - 90) < 4) return "right";
    return degrees < 90 ? "acute" : "obtuse";
  }
  function measure(node, nodes) {
    const fp = fingerprintOf(node);
    if (!fp) return null;
    const reading = snapReading(node, nodes);
    const shape = reading.shape;
    const held = getRep(node, "clean") ? cleanPointsOf(node) : void 0;
    const ideal = held ?? idealize(node, shape)?.points ?? strokePointsOf(node);
    if (!ideal || ideal.length < 2) return null;
    const b = held ? getBounds(held) : boundsOf(node) ?? getBounds(ideal);
    const w2 = b.maxX - b.minX, h2 = b.maxY - b.minY;
    const centre = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
    const m = [];
    switch (shape) {
      case "circle": {
        const round = Math.min(w2, h2) / Math.max(1e-6, w2, h2) > 0.85;
        const r = (w2 + h2) / 4;
        m.push({ key: "centre", label: "centre", value: r0(centre.x), unit: "", at: centre });
        m.push({ key: "centreY", label: "centre y", value: r0(centre.y), unit: "" });
        if (round) {
          m.push({ key: "radius", label: "radius", value: r0(r), unit: "px" });
          m.push({ key: "circumference", label: "circumference", value: r0(2 * Math.PI * r), unit: "px" });
          m.push({ key: "area", label: "area", value: r0(Math.PI * r * r), unit: "px\xB2" });
        } else {
          m.push({ key: "rx", label: "radius x", value: r0(w2 / 2), unit: "px" });
          m.push({ key: "ry", label: "radius y", value: r0(h2 / 2), unit: "px" });
          m.push({ key: "area", label: "area", value: r0(Math.PI * (w2 / 2) * (h2 / 2)), unit: "px\xB2" });
        }
        return { shape, measures: m };
      }
      case "rectangle": {
        m.push({ key: "width", label: "width", value: r0(w2), unit: "px" });
        m.push({ key: "height", label: "height", value: r0(h2), unit: "px" });
        m.push({ key: "perimeter", label: "perimeter", value: r0(2 * (w2 + h2)), unit: "px" });
        m.push({ key: "area", label: "area", value: r0(w2 * h2), unit: "px\xB2" });
        m.push({ key: "aspect", label: "aspect", value: r1(w2 / Math.max(1e-6, h2)), unit: "" });
        return { shape, measures: m };
      }
      case "triangle": {
        const v = ideal.slice(0, 3);
        if (v.length < 3) return null;
        const sides = [0, 1, 2].map((i) => Math.hypot(v[(i + 1) % 3].x - v[i].x, v[(i + 1) % 3].y - v[i].y));
        const angles = [0, 1, 2].map((i) => angleAt(v[(i + 2) % 3], v[i], v[(i + 1) % 3]));
        angles.forEach((a, i) => m.push({ key: `angle${i}`, label: `angle ${"ABC"[i]} (${classify(a)})`, value: r0(a), unit: "\xB0", at: v[i] }));
        sides.forEach((s2, i) => m.push({ key: `side${i}`, label: `side ${"ABC"[i]}${"ABC"[(i + 1) % 3]}`, value: r0(s2), unit: "px" }));
        const s = sides.reduce((a, c) => a + c, 0) / 2;
        m.push({ key: "area", label: "area", value: r0(Math.sqrt(Math.max(0, s * (s - sides[0]) * (s - sides[1]) * (s - sides[2])))), unit: "px\xB2" });
        return { shape, measures: m };
      }
      case "line":
      case "arrow": {
        const arrow = getRep(node, "reading:arrow")?.data;
        const from = shape === "arrow" && arrow?.tail ? arrow.tail : fp.start;
        const to = shape === "arrow" && arrow?.tip ? arrow.tip : fp.end;
        const len = Math.hypot(to.x - from.x, to.y - from.y);
        const heading = (deg(Math.atan2(-(to.y - from.y), to.x - from.x)) % 360 + 360) % 360;
        m.push({ key: "length", label: "length", value: r0(len), unit: "px" });
        m.push({ key: "heading", label: shape === "arrow" ? "points" : "heading", value: r0(heading), unit: "\xB0" });
        m.push({ key: "slope", label: "slope", value: Math.abs(to.x - from.x) < 1e-6 ? Infinity : r1((to.y - from.y) / (to.x - from.x)), unit: "" });
        return { shape, measures: m };
      }
      case "arc": {
        const pts = ideal;
        const a = pts[0], c = pts[pts.length - 1];
        const chord = Math.hypot(c.x - a.x, c.y - a.y);
        let arcLen = 0;
        for (let i = 1; i < pts.length; i++) arcLen += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        m.push({ key: "arcLength", label: "arc length", value: r0(arcLen), unit: "px" });
        m.push({ key: "chord", label: "chord", value: r0(chord), unit: "px" });
        let sag = 0;
        for (const p of pts) {
          const d = Math.abs((c.x - a.x) * (p.y - a.y) - (c.y - a.y) * (p.x - a.x)) / Math.max(1e-6, chord);
          if (d > sag) sag = d;
        }
        if (sag > 1e-6) {
          const r = chord * chord / (8 * sag) + sag / 2;
          m.push({ key: "radius", label: "radius", value: r0(r), unit: "px" });
          m.push({ key: "sweep", label: "sweep", value: r0(deg(2 * Math.asin(Math.min(1, chord / (2 * r))))), unit: "\xB0" });
        }
        return { shape, measures: m };
      }
      case "dot": {
        m.push({ key: "centre", label: "at", value: r0(centre.x), unit: "", at: centre });
        m.push({ key: "centreY", label: "at y", value: r0(centre.y), unit: "" });
        return { shape, measures: m };
      }
      default:
        return null;
    }
  }
  function describeMaths(maths) {
    return maths.measures.filter((x) => x.key !== "centreY").map((x) => {
      if (x.key === "centre" && x.at) return `${x.label} (${r0(x.at.x)}, ${r0(x.at.y)})`;
      const v = Number.isFinite(x.value) ? x.value.toLocaleString("en-US") : "\u221E";
      return `${x.label} ${v}${x.unit}`;
    }).join(" \xB7 ");
  }

  // src/session/words.ts
  var LETTER_MAX_HEIGHT_PX = 44;
  var LETTER_MAX_WIDTH_PX = 60;
  var WORD_GAP_RATIO = 0.7;
  var WORD_BAND_OVERLAP = 0.35;
  var WORD_WINDOW_MS = 3e3;
  function isLetterLike(b, scale) {
    const h2 = (b.maxY - b.minY) / scale, w2 = (b.maxX - b.minX) / scale;
    return h2 <= LETTER_MAX_HEIGHT_PX && w2 <= LETTER_MAX_WIDTH_PX;
  }
  function joinsRun(run, letter, scale) {
    if (letter.at - run.lastAt > WORD_WINDOW_MS) return { ok: false, reasoning: "drawn too long after the last letter" };
    const rb = run.bounds, lb = letter.bounds;
    const runH = Math.max(1, rb.maxY - rb.minY), letH = Math.max(1, lb.maxY - lb.minY);
    const band = Math.min(rb.maxY, lb.maxY) - Math.max(rb.minY, lb.minY);
    const withinX = lb.minX >= rb.minX - runH * 0.3 && lb.maxX <= rb.maxX + runH * 0.3;
    const closeAbove = lb.maxY <= rb.minY && rb.minY - lb.maxY <= runH * 0.6 && letH <= runH * 0.5;
    if (withinX && closeAbove) return { ok: true, reasoning: "a small mark just above the word" };
    const letMid = (lb.minY + lb.maxY) / 2;
    const onLine = band >= Math.min(runH, letH) * WORD_BAND_OVERLAP || letMid >= rb.minY && letMid <= rb.maxY || (rb.minY + rb.maxY) / 2 >= lb.minY && (rb.minY + rb.maxY) / 2 <= lb.maxY;
    if (!onLine) return { ok: false, reasoning: "not on the same line" };
    const gap = Math.max(lb.minX - rb.maxX, rb.minX - lb.maxX, 0);
    const ref = Math.max(runH, letH) / scale;
    if (gap / scale > ref * WORD_GAP_RATIO) return { ok: false, reasoning: "too far from the last letter to be the same word" };
    const tiny = Math.min(runH, letH) / scale < 10;
    if (!tiny && (letH / runH > 2.2 || runH / letH > 2.2)) return { ok: false, reasoning: "a different size from the letters beside it" };
    return { ok: true, reasoning: `beside the last letter, on its line, ${Math.round(gap / scale)}px away` };
  }
  function wordConfidence(letters) {
    return Math.min(0.88, 0.55 + 0.08 * (letters - 2));
  }

  // src/store/merge.ts
  function mergeLogs(logs) {
    const names = Object.keys(logs).sort();
    const tagged = [];
    for (const name of names) logs[name].forEach((ev, i) => tagged.push({ ev, name, i }));
    tagged.sort((a, b) => {
      const ta = atOf(a.ev), tb = atOf(b.ev);
      if (ta !== tb) return ta - tb;
      if (a.name !== b.name) return a.name < b.name ? -1 : 1;
      return a.i - b.i;
    });
    return tagged.map((t) => ({ ...t.ev }));
  }
  function atOf(ev) {
    return "at" in ev && typeof ev.at === "number" ? ev.at : 0;
  }

  // src/behave/verbs.ts
  var VERBS = ["wander", "seek", "flee", "home", "school", "hold", "avoid", "consume", "spawn", "drift", "expire"];
  var TARGETED = /* @__PURE__ */ new Set(["seek", "flee", "home", "school", "consume", "spawn", "expire"]);
  var DEFAULT_SPEED = 120;
  var DEFAULT_MAX_FORCE = 240;
  var sizeOf = (b) => Math.max(1, Math.sqrt(Math.max(1, b.w) * Math.max(1, b.h)));
  var dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  var num = (t, k, d) => typeof t.params?.[k] === "number" ? t.params[k] : d;
  function nearest(world, name, only) {
    if (!name) return null;
    const mine = sizeOf(world.me);
    let best = null;
    for (const o of world.named(name)) {
      if (o.id === world.me.id) continue;
      const s = sizeOf(o);
      if (only === "bigger" && s < mine * 1.25) continue;
      if (only === "smaller" && s > mine / 1.25) continue;
      const d = dist(world.me, o);
      if (!best || d < best.d) best = { body: o, d };
    }
    return best;
  }
  function toward(world, to, speed, weight) {
    const d = dist(world.me, to);
    if (d < 1e-6) return { fx: 0, fy: 0 };
    const dx = (to.x - world.me.x) / d * speed, dy = (to.y - world.me.y) / d * speed;
    return { fx: (dx - world.me.vx) * weight, fy: (dy - world.me.vy) * weight };
  }
  var none = (reasoning) => ({ fx: 0, fy: 0, reasoning });
  function force(term, world, speed = DEFAULT_SPEED) {
    const me = world.me, w2 = term.weight;
    switch (term.verb) {
      case "wander": {
        const turn = num(term, "turn", 0.9);
        const a = me.heading + (world.rng() - 0.5) * turn;
        return { fx: Math.cos(a) * speed * 0.5 * w2, fy: Math.sin(a) * speed * 0.5 * w2, reasoning: "wandering" };
      }
      case "seek": {
        const n2 = nearest(world, term.target);
        if (!n2) return none(`nothing named ${term.target} to seek`);
        const f = toward(world, n2.body, speed, w2);
        return { ...f, reasoning: `seeking ${n2.body.id} (${term.target}) ${Math.round(n2.d)}px away` };
      }
      case "flee": {
        const only = typeof term.params?.only === "string" ? term.params.only : void 0;
        const n2 = nearest(world, term.target, only);
        const range = num(term, "range", sizeOf(me) * 6);
        if (!n2 || n2.d > range) return none(`nothing${only ? " " + only : ""} named ${term.target} within ${Math.round(range)}px`);
        const falloff = 1 - n2.d / range;
        const away = { x: me.x + (me.x - n2.body.x), y: me.y + (me.y - n2.body.y) };
        const f = toward(world, away, speed, w2 * (0.4 + 0.6 * falloff));
        return { ...f, reasoning: `fleeing ${n2.body.id} (${term.target}${only ? ", " + only : ""}) ${Math.round(n2.d)}px away` };
      }
      case "home": {
        const n2 = nearest(world, term.target);
        if (!n2) return none(`nothing named ${term.target} to keep to`);
        const range = num(term, "range", sizeOf(n2.body) * 1.5);
        if (n2.d > range) {
          const f = toward(world, n2.body, speed, w2);
          return { ...f, reasoning: `returning to ${n2.body.id} (${term.target}), ${Math.round(n2.d)}px out` };
        }
        const a = me.heading + (world.rng() - 0.5) * 1.2;
        return { fx: Math.cos(a) * speed * 0.25 * w2, fy: Math.sin(a) * speed * 0.25 * w2, reasoning: `at home in ${n2.body.id} (${term.target})` };
      }
      case "school": {
        const range = num(term, "range", sizeOf(me) * 5);
        const peers = (term.target ? world.named(term.target) : world.others).filter((o) => o.id !== me.id && dist(me, o) <= range);
        if (!peers.length) return none(`no ${term.target ?? "peers"} within ${Math.round(range)}px to school with`);
        let cx2 = 0, cy2 = 0, ax = 0, ay = 0, sx = 0, sy = 0;
        const tooClose = sizeOf(me) * 1.4;
        for (const o of peers) {
          cx2 += o.x;
          cy2 += o.y;
          ax += o.vx;
          ay += o.vy;
          const d = dist(me, o);
          if (d < tooClose && d > 1e-6) {
            sx += (me.x - o.x) / d * (1 - d / tooClose);
            sy += (me.y - o.y) / d * (1 - d / tooClose);
          }
        }
        const n2 = peers.length;
        const coh = toward(world, { x: cx2 / n2, y: cy2 / n2 }, speed, 1);
        const ali = { fx: ax / n2 - me.vx, fy: ay / n2 - me.vy };
        return {
          fx: (coh.fx * 0.6 + ali.fx * 0.8 + sx * speed * 1.5) * w2,
          fy: (coh.fy * 0.6 + ali.fy * 0.8 + sy * speed * 1.5) * w2,
          reasoning: `schooling with ${n2} ${term.target ?? "peer"}${n2 === 1 ? "" : "s"}`
        };
      }
      case "hold": {
        const o = me.origin ?? { x: me.x, y: me.y };
        const radius = num(term, "radius", sizeOf(me) * 3);
        const d = dist(me, o);
        if (d <= radius) return none(`holding within ${Math.round(radius)}px of where it began`);
        const f = toward(world, o, speed, w2 * Math.min(1, (d - radius) / radius + 0.3));
        return { ...f, reasoning: `${Math.round(d - radius)}px past its ${Math.round(radius)}px hold \u2014 returning` };
      }
      case "drift": {
        const deg2 = num(term, "direction", -90);
        const a = deg2 * Math.PI / 180;
        return { fx: Math.cos(a) * speed * 0.6 * w2, fy: Math.sin(a) * speed * 0.6 * w2, reasoning: `drifting toward ${deg2}\xB0` };
      }
      case "avoid":
        return none("sliding along walls");
      case "consume":
      case "spawn":
      case "expire":
        return none(`${term.verb} is an intent, not a force`);
    }
  }
  function intents(term, world) {
    const me = world.me;
    switch (term.verb) {
      case "consume": {
        const n2 = nearest(world, term.target);
        if (n2 && n2.d <= (sizeOf(me) + sizeOf(n2.body)) / 2) return [{ kind: "consume", target: term.target, body: n2.body.id }];
        return [];
      }
      case "spawn": {
        const every = num(term, "every", 4);
        const before = Math.floor((me.age - world.dt) / every), after = Math.floor(me.age / every);
        return after > before && me.age >= every ? [{ kind: "spawn", target: term.target }] : [];
      }
      case "expire": {
        const after = num(term, "after", Infinity);
        if (me.age >= after) return [{ kind: "expire" }];
        const n2 = nearest(world, term.target);
        if (n2 && n2.d <= (sizeOf(me) + sizeOf(n2.body)) / 2) return [{ kind: "expire", body: n2.body.id }];
        return [];
      }
      default:
        return [];
    }
  }

  // src/behave/walls.ts
  function wallBoxes(walls) {
    return walls.map((w2) => {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const p of w2.points) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
      return { minX, maxX, minY, maxY };
    });
  }
  var angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  function applyWalls(body, boxes, dt, state = { contactSteps: 0 }) {
    let { x, y, vx, vy } = body;
    let reasoning = "";
    if (!boxes.length) return { vx, vy, x, y, reasoning, state };
    const size = sizeOf(body);
    const standoff = Math.max(9, size * 0.45);
    const half = Math.max(6, Math.min(body.w, body.h) * 0.5);
    const speed = Math.hypot(vx, vy);
    const heading = speed > 1e-6 ? Math.atan2(vy, vx) : body.heading;
    let contact = false;
    for (const r of boxes) {
      const look = 24 + size * 1.2;
      const px = x + Math.cos(heading) * look, py = y + Math.sin(heading) * look;
      const s = standoff + half;
      if (px > r.minX - s && px < r.maxX + s && py > r.minY - s && py < r.maxY + s) {
        const away = Math.atan2(y - (r.minY + r.maxY) / 2, x - (r.minX + r.maxX) / 2);
        const t1 = away + Math.PI / 2, t2 = away - Math.PI / 2;
        const slide = Math.abs(angleDiff(t1, heading)) <= Math.abs(angleDiff(t2, heading)) ? t1 : t2;
        const target = slide + angleDiff(away, slide) * 0.3;
        const turned = heading + angleDiff(target, heading) * 0.35;
        const sp = Math.max(speed, 1e-6);
        vx = Math.cos(turned) * sp;
        vy = Math.sin(turned) * sp;
        reasoning = "sliding along a wall ahead";
      }
      const m = half + 2;
      if (x > r.minX - m && x < r.maxX + m && y > r.minY - m && y < r.maxY + m) {
        contact = true;
        const pushLeft = x - (r.minX - m), pushRight = r.maxX + m - x, pushUp = y - (r.minY - m), pushDown = r.maxY + m - y;
        const least = Math.min(pushLeft, pushRight, pushUp, pushDown);
        const sp = Math.max(Math.hypot(vx, vy), size * 0.8);
        if (least === pushLeft || least === pushRight) {
          x = least === pushLeft ? r.minX - m : r.maxX + m;
          const sign = vy >= 0 ? 1 : -1;
          vx = 0;
          vy = sign * sp;
        } else {
          y = least === pushUp ? r.minY - m : r.maxY + m;
          const sign = vx >= 0 ? 1 : -1;
          vy = 0;
          vx = sign * sp;
        }
        reasoning = "redirected along a wall face";
      }
    }
    const contactSteps = contact ? state.contactSteps + 1 : 0;
    if (contactSteps > Math.round(1.5 / Math.max(dt, 1e-3))) {
      let best = null, bd = Infinity;
      for (const r of boxes) {
        const d = Math.hypot(x - (r.minX + r.maxX) / 2, y - (r.minY + r.maxY) / 2);
        if (d < bd) {
          bd = d;
          best = r;
        }
      }
      if (best) {
        const away = Math.atan2(y - (best.minY + best.maxY) / 2, x - (best.minX + best.maxX) / 2);
        const sp = Math.max(Math.hypot(vx, vy), size * 0.6);
        vx = Math.cos(away) * sp;
        vy = Math.sin(away) * sp;
        reasoning = "pressed against a wall too long \u2014 disengaging";
      }
      return { vx, vy, x, y, reasoning, state: { contactSteps: 0 } };
    }
    return { vx, vy, x, y, reasoning, state: { contactSteps } };
  }

  // src/behave/steer.ts
  function steer(b, world) {
    const speed = b.speed ?? DEFAULT_SPEED, maxForce = b.maxForce ?? DEFAULT_MAX_FORCE;
    const results = [];
    const all = [];
    let fx = 0, fy = 0;
    for (const t of b.terms) {
      const f = force(t, world, speed);
      results.push({ ...f, verb: t.verb, target: t.target, weight: t.weight, share: 0 });
      fx += f.fx;
      fy += f.fy;
      all.push(...intents(t, world));
    }
    const total = results.reduce((a, r) => a + Math.hypot(r.fx, r.fy), 0) || 1;
    for (const r of results) r.share = Math.hypot(r.fx, r.fy) / total;
    const mag = Math.hypot(fx, fy);
    if (mag > maxForce) {
      fx *= maxForce / mag;
      fy *= maxForce / mag;
    }
    return { fx, fy, terms: results, intents: all };
  }
  function step(b, world, wallState = { contactSteps: 0 }) {
    const speed = b.speed ?? DEFAULT_SPEED;
    const s = steer(b, world);
    const me = world.me;
    let vx = me.vx + s.fx * world.dt, vy = me.vy + s.fy * world.dt;
    const sp = Math.hypot(vx, vy);
    if (sp > speed) {
      vx *= speed / sp;
      vy *= speed / sp;
    }
    const walled = applyWalls({ ...me, vx, vy }, wallBoxes(world.walls), world.dt, wallState);
    const x = walled.x + walled.vx * world.dt, y = walled.y + walled.vy * world.dt;
    const moving = Math.hypot(walled.vx, walled.vy) > 1e-6;
    return {
      body: { ...me, x, y, vx: walled.vx, vy: walled.vy, heading: moving ? Math.atan2(walled.vy, walled.vx) : me.heading, age: me.age + world.dt },
      steering: s,
      wall: walled.reasoning,
      wallState: walled.state
    };
  }
  function seeded(seed) {
    let a = seed >>> 0;
    return () => {
      a = a + 1831565813 >>> 0;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function worldOf(me, others, walls, t, dt, rng) {
    return { t, dt, me, others, walls, named: (name) => others.filter((o) => o.name === name), rng };
  }

  // src/behave/fit.ts
  var key = (t) => t.target ? `${t.verb}:${t.target}` : t.verb;
  function fit2(demo, basis, worldAt, speed = 120) {
    if (demo.length < 3) return { terms: [], residual: 1, explained: {}, reasoning: "too short to fit" };
    const v = [];
    for (let i = 0; i < demo.length - 1; i++) {
      const dt = Math.max(1e-3, demo[i + 1].t - demo[i].t);
      v.push({ x: (demo[i + 1].x - demo[i].x) / dt, y: (demo[i + 1].y - demo[i].y) / dt });
    }
    const rows = [];
    for (let i = 0; i < v.length - 1; i++) {
      const dt = Math.max(1e-3, demo[i + 1].t - demo[i].t);
      const a = [(v[i + 1].x - v[i].x) / dt, (v[i + 1].y - v[i].y) / dt];
      const me = { id: "demo", name: "demo", x: demo[i + 1].x, y: demo[i + 1].y, vx: v[i].x, vy: v[i].y, w: 20, h: 12, heading: Math.atan2(v[i].y, v[i].x), age: demo[i + 1].t - demo[0].t, origin: { x: demo[0].x, y: demo[0].y } };
      rows.push({ a, t: demo[i + 1].t, me });
    }
    const names = /* @__PURE__ */ new Set();
    for (const r of rows) for (const o of worldAt(r.t, r.me).others) names.add(o.name);
    const candidates = [];
    for (const verb of basis) {
      if (verb === "wander" || verb === "avoid" || verb === "consume" || verb === "spawn" || verb === "expire") continue;
      if (verb === "home" && basis.includes("seek")) continue;
      if (TARGETED.has(verb)) for (const n2 of names) candidates.push({ verb, target: n2, weight: 1 });
      else candidates.push({ verb, weight: 1 });
    }
    if (!candidates.length) return { terms: [], residual: 1, explained: {}, reasoning: "no verb explains this motion" };
    const F = rows.map((r) => candidates.map((c) => {
      const f = force(c, worldAt(r.t, r.me), speed);
      return [f.fx, f.fy];
    }));
    const target = rows.map((r) => r.a);
    const norm = Math.sqrt(target.reduce((s, a) => s + a[0] * a[0] + a[1] * a[1], 0)) || 1;
    const residualOf = (w2) => {
      let s = 0;
      for (let i = 0; i < rows.length; i++) {
        let px = 0, py = 0;
        for (let j = 0; j < w2.length; j++) {
          px += F[i][j][0] * w2[j];
          py += F[i][j][1] * w2[j];
        }
        s += (px - target[i][0]) ** 2 + (py - target[i][1]) ** 2;
      }
      return Math.sqrt(s) / norm;
    };
    const k = candidates.length;
    const G = Array.from({ length: k }, () => new Array(k).fill(0));
    const bvec = new Array(k).fill(0);
    for (let i = 0; i < rows.length; i++) {
      for (let p = 0; p < k; p++) {
        bvec[p] += F[i][p][0] * target[i][0] + F[i][p][1] * target[i][1];
        for (let q = p; q < k; q++) {
          const v2 = F[i][p][0] * F[i][q][0] + F[i][p][1] * F[i][q][1];
          G[p][q] += v2;
          if (q !== p) G[q][p] += v2;
        }
      }
    }
    const solve = (lambda, mask2) => {
      const w2 = new Array(k).fill(0);
      const shrink = lambda * norm * norm;
      for (let sweep2 = 0; sweep2 < 400; sweep2++) {
        let moved = 0;
        for (let j = 0; j < k; j++) {
          if (mask2 && !mask2[j]) {
            w2[j] = 0;
            continue;
          }
          if (G[j][j] <= 1e-12) continue;
          let r = bvec[j];
          for (let i = 0; i < k; i++) if (i !== j) r -= G[j][i] * w2[i];
          const next = Math.max(0, (r - shrink) / G[j][j]);
          moved = Math.max(moved, Math.abs(next - w2[j]));
          w2[j] = next;
        }
        if (moved < 1e-9) break;
      }
      return w2;
    };
    const sweep = [0, 1e-3, 3e-3, 0.01, 0.03, 0.1, 0.3];
    const significant = (w2) => {
      const m = Math.max(...w2, 1e-9);
      return w2.filter((x) => x > 0.05 && x > m * 0.1).length;
    };
    const fits = sweep.map((l) => {
      const w2 = solve(l);
      return { w: w2, residual: residualOf(w2), count: significant(w2) };
    });
    const best = Math.min(...fits.map((f) => f.residual));
    const sparse = fits.filter((f) => f.residual <= best * 1.1 + 1e-9).sort((a, b) => a.count - b.count || a.residual - b.residual)[0];
    const mask = sparse.w.map((x) => x > 0.05 && x > Math.max(...sparse.w, 1e-9) * 0.1);
    const refit = solve(0, mask);
    const chosen = { w: refit, residual: residualOf(refit), count: significant(refit) };
    const terms = [];
    const explained = {};
    let totalForce = 0;
    const forces = candidates.map((_, j) => Math.sqrt(F.reduce((s, row) => s + (row[j][0] * chosen.w[j]) ** 2 + (row[j][1] * chosen.w[j]) ** 2, 0)));
    for (const f of forces) totalForce += f;
    const maxW = Math.max(...chosen.w, 1e-9);
    candidates.forEach((c, j) => {
      if (chosen.w[j] <= 0.05 || chosen.w[j] <= maxW * 0.1) return;
      const share = totalForce ? forces[j] / totalForce : 0;
      const t = { ...c, weight: Math.round(chosen.w[j] * 100) / 100, reasoning: `explains ${Math.round(share * 100)}% of what was shown` };
      terms.push(t);
      explained[key(t)] = share;
    });
    terms.sort((a, b) => b.weight - a.weight);
    const missing = Math.round(chosen.residual * 100);
    return {
      terms,
      residual: chosen.residual,
      explained,
      reasoning: terms.length ? `${terms.map((t) => `${t.verb}${t.target ? " " + t.target : ""} ${t.weight}`).join(", ")}; ${missing}% of the motion is unexplained${missing > 35 ? " \u2014 something is missing" : ""}` : "no verb explains this motion"
    };
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
    for (const key2 of FEATURES) {
      const normalized = Math.abs(f[key2] - mark.features[key2]) / mark.tolerance[key2];
      if (normalized > worst) {
        worst = normalized;
        worstFeature = key2;
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
      const seg2 = (a, b, n2) => Array.from({ length: n2 }, (_, i) => ({
        x: a.x + (b.x - a.x) * (i / (n2 - 1)),
        y: a.y + (b.y - a.y) * (i / (n2 - 1))
      }));
      return seg2(start, vertex, 34).concat(seg2(vertex, end, 44).slice(1));
    };
    return [
      check(70, 35, 0.36, 0.45),
      check(64, 40, 0.33, 0.52),
      check(78, 32, 0.38, 0.4),
      check(60, 36, 0.34, 0.58, 0.06),
      check(74, 38, 0.35, 0.47, -0.05),
      // A hand often draws the tail long — a short dip, then a long flick. The
      // first five put the arms near 1:1.6; these reach 1:2.5, which a real
      // check at 1:3 was refused for ("its two halves are the wrong lengths").
      check(88, 30, 0.24, 0.55),
      check(96, 28, 0.21, 0.5, 0.03)
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
        detail: match.failedOn ? `that is not ${named(mark.name)} \u2014 ${readable(match.failedOn)}` : `that is not ${named(mark.name)}`,
        nearMiss: !!engaged && !checkFp.isClosed
      };
    }
    return {
      reason: "not-engaged",
      detail: "the mark has to cross or touch the circle",
      nearMiss: true
    };
  }
  function named(name) {
    return /^(your|my|the)\b/i.test(name) ? name : `a ${name}`;
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
  var sizeOf2 = (b) => Math.max(w(b), h(b));
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
        const ref = Math.max(1, Math.min(sizeOf2(ab), sizeOf2(bb)));
        if (boundsContain(ab, bb)) {
          const margin = Math.min(bb.minX - ab.minX, bb.minY - ab.minY, ab.maxX - bb.maxX, ab.maxY - bb.maxY);
          const strength = Math.min(1, 0.5 + margin / Math.max(1, sizeOf2(ab)));
          add("contains", a.id, b.id, strength, `${b.id} sits wholly inside ${a.id}`);
          add("inside", b.id, a.id, strength, `${b.id} sits wholly inside ${a.id}`);
          continue;
        }
        if (boundsContain(bb, ab)) {
          const margin = Math.min(ab.minX - bb.minX, ab.minY - bb.minY, bb.maxX - ab.maxX, bb.maxY - ab.maxY);
          const strength = Math.min(1, 0.5 + margin / Math.max(1, sizeOf2(bb)));
          add("contains", b.id, a.id, strength, `${a.id} sits wholly inside ${b.id}`);
          add("inside", a.id, b.id, strength, `${a.id} sits wholly inside ${b.id}`);
          continue;
        }
        const gap = boundingBoxDistance(ab, bb);
        if (a.points && b.points && boundsOverlap(ab, bb)) {
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
        const ratio = Math.min(sizeOf2(ab), sizeOf2(bb)) / Math.max(1, Math.max(sizeOf2(ab), sizeOf2(bb)));
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
      const key2 = `${r.from}\u2192${r.to}`;
      (byPair.get(key2) ?? byPair.set(key2, []).get(key2)).push(r);
    }
    const lines = [];
    for (const [pair, rels] of byPair) {
      const kinds = rels.sort((a, b) => b.strength - a.strength).map((r) => `${r.kind} (${r.strength.toFixed(2)})`).join(", ");
      lines.push(`  ${pair}: ${kinds}`);
    }
    return lines.join("\n");
  }

  // src/diagram/roles.ts
  var ROLES = ["container", "node", "edge", "label", "annotation", "unclassified"];
  var CLOSED = /* @__PURE__ */ new Set(["rectangle", "circle", "triangle"]);
  var CONNECTOR = /* @__PURE__ */ new Set(["line", "arrow", "arc"]);
  var WRITING = /* @__PURE__ */ new Set(["text", "dot"]);
  var isClosed = (s, id) => CLOSED.has(s.shapes[id] ?? "");
  var isConnector = (s, id) => CONNECTOR.has(s.shapes[id] ?? "");
  var isWriting = (s, id) => WRITING.has(s.shapes[id] ?? "");
  var inScope = (s, id) => s.ids.includes(id);
  function contents(s, id) {
    return s.relations.filter((r) => r.kind === "contains" && r.from === id && inScope(s, r.to)).sort((a, b) => b.strength - a.strength);
  }
  function enclosingMark(s, id) {
    return s.relations.filter((r) => r.kind === "inside" && r.from === id && inScope(s, r.to)).sort((a, b) => b.strength - a.strength)[0];
  }
  function nearestMark(s, id) {
    return s.relations.filter((r) => r.kind === "near" && r.from === id && inScope(s, r.to)).sort((a, b) => b.strength - a.strength)[0];
  }
  var ENGAGING = /* @__PURE__ */ new Set(["near", "touching", "crossing", "contains", "inside"]);
  function relatesToAnything(s, id) {
    if (s.relations.some(
      (r) => ENGAGING.has(r.kind) && (r.from === id && inScope(s, r.to) || r.to === id && inScope(s, r.from))
    ))
      return true;
    if (s.wires[id]?.ends.some((e) => inScope(s, e))) return true;
    return Object.values(s.wires).some((w2) => w2.ends.includes(id));
  }
  function place(s, id) {
    const shape = s.shapes[id] ?? "art";
    const shapeConf = s.shapeConfidence[id] ?? 0.5;
    const wire = s.wires[id];
    const ends = wire ? wire.ends.filter((e) => inScope(s, e) && e !== id) : [];
    const held = isClosed(s, id) ? contents(s, id) : [];
    if (held.length > 0) {
      const strength = held.reduce((a, r) => a + r.strength, 0) / held.length;
      return {
        id,
        role: "container",
        rule: 1,
        confidence: Math.min(0.95, 0.5 + strength * 0.45),
        reasoning: `a ${shape} wholly enclosing ${held.length} mark${held.length === 1 ? "" : "s"}`,
        targets: held.map((r) => r.to)
      };
    }
    if (isWriting(s, id)) {
      const inside = enclosingMark(s, id);
      if (inside && isClosed(s, inside.to)) {
        return {
          id,
          role: "label",
          rule: 2,
          confidence: Math.min(0.95, 0.55 + inside.strength * 0.4),
          reasoning: `${shape} sitting inside ${inside.to}`,
          targets: [inside.to]
        };
      }
    }
    if (shape === "text") {
      const near = nearestMark(s, id);
      if (near && near.strength > 0.25) {
        return {
          id,
          role: "label",
          rule: 3,
          confidence: Math.min(0.85, 0.35 + near.strength * 0.45),
          reasoning: `writing beside ${near.to} \u2014 ${near.reasoning}`,
          targets: [near.to]
        };
      }
    }
    if (shape === "arrow" && ends.length >= 2 && wire?.from && wire?.to) {
      return {
        id,
        role: "edge",
        rule: 4,
        confidence: Math.min(0.95, 0.6 + shapeConf * 0.35),
        reasoning: `an arrow from ${wire.from} to ${wire.to}`,
        targets: ends,
        direction: { from: wire.from, to: wire.to }
      };
    }
    if (isConnector(s, id) && ends.length >= 2) {
      return {
        id,
        role: "edge",
        rule: 5,
        confidence: Math.min(0.9, 0.55 + shapeConf * 0.3),
        reasoning: `a ${shape} joining ${ends.join(" and ")}`,
        targets: ends
      };
    }
    if (isConnector(s, id) && ends.length === 1) {
      return {
        id,
        role: "annotation",
        rule: 6,
        confidence: 0.6,
        reasoning: `a ${shape} pointing at ${ends[0]} from nowhere in particular`,
        targets: ends
      };
    }
    const wiredTo = Object.entries(s.wires).filter(([w2, v]) => w2 !== id && v.ends.includes(id)).map(([w2]) => w2);
    if (isClosed(s, id) || shape === "dot" && wiredTo.length > 0) {
      return {
        id,
        role: "node",
        rule: 7,
        confidence: Math.min(0.92, 0.45 + shapeConf * 0.45),
        reasoning: wiredTo.length ? `a ${shape} with ${wiredTo.length} connector${wiredTo.length === 1 ? "" : "s"} attached` : `a ${shape} standing on its own`,
        targets: wiredTo
      };
    }
    if (!relatesToAnything(s, id)) {
      return {
        id,
        role: "annotation",
        rule: 8,
        confidence: 0.5,
        reasoning: `a ${shape} touching nothing \u2014 a note in the margin`,
        targets: []
      };
    }
    return {
      id,
      role: "unclassified",
      rule: 0,
      confidence: 0,
      reasoning: `a ${shape} that relates to other marks, but not in a way the table names`,
      targets: []
    };
  }
  function assignRoles(scope) {
    return scope.ids.map((id) => place(scope, id));
  }
  function genreOf(roles) {
    const counts = { container: 0, node: 0, edge: 0, label: 0, annotation: 0, unclassified: 0 };
    for (const r of roles) counts[r.role]++;
    const things = counts.container + counts.node;
    if (things === 0) {
      return { genre: "empty", reasoning: "nothing here plays a node or a container", counts };
    }
    if (counts.edge === 0) {
      return {
        genre: "layout",
        reasoning: `${things} node${things === 1 ? "" : "s"}/container${things === 1 ? "" : "s"} and no edges \u2014 marks tiling a space`,
        counts
      };
    }
    if (counts.container > 0) {
      return {
        genre: "mixed",
        reasoning: `${counts.edge} edge${counts.edge === 1 ? "" : "s"} between ${counts.node} node${counts.node === 1 ? "" : "s"}, inside ${counts.container} container${counts.container === 1 ? "" : "s"}`,
        counts
      };
    }
    return {
      genre: "graph",
      reasoning: `${counts.node} node${counts.node === 1 ? "" : "s"} joined by ${counts.edge} edge${counts.edge === 1 ? "" : "s"}`,
      counts
    };
  }
  function describeRoles(roles, genre) {
    const lines = [];
    if (genre) lines.push(`GENRE: ${genre.genre} \u2014 ${genre.reasoning}`);
    lines.push("ROLES each mark plays:");
    for (const r of roles) {
      const dir = r.direction ? ` (${r.direction.from} \u2192 ${r.direction.to})` : "";
      const tg = r.targets.length && !r.direction ? ` [${r.targets.join(", ")}]` : "";
      lines.push(`  ${r.id}: ${r.role}${dir}${tg} \u2014 ${r.reasoning}`);
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
  function rolesOf(scope) {
    if (scope.roles) return scope.roles;
    const shapeConfidence = {};
    for (const id of scope.ids) shapeConfidence[id] = 0.8;
    return assignRoles({ ids: scope.ids, shapes: scope.shapes, shapeConfidence, relations: scope.relations, wires: {} });
  }
  var withRole = (scope, role) => rolesOf(scope).filter((r) => r.role === role);
  var allPlay = (scope, role) => scope.ids.length > 0 && rolesOf(scope).every((r) => r.role === role);
  function runOfPeers(scope, axis) {
    const beside = axis === "x" ? "left-of" : "above";
    const shares = axis === "x" ? "same-row" : "same-column";
    if (scope.ids.length < 2) return null;
    if (!allPlay(scope, "node")) return null;
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
        const containers = withRole(scope, "container");
        if (containers.length === 0) return null;
        const contents2 = [...new Set(containers.flatMap((c) => c.targets))];
        const confidence = containers.reduce((a, c) => a + c.confidence, 0) / containers.length;
        return {
          confidence,
          reasoning: `${containers.length} container${containers.length === 1 ? "" : "s"} holding ${contents2.length} mark${contents2.length === 1 ? "" : "s"}`,
          roles: { container: containers.map((c) => c.id), contents: contents2 }
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
        const nodes = withRole(scope, "node").map((r) => r.id);
        const edges = withRole(scope, "edge");
        if (edges.length === 0 || nodes.length < 2) return null;
        const directed = edges.filter((e) => e.direction).length;
        return {
          confidence: Math.min(0.9, 0.45 + edges.length / Math.max(1, nodes.length - 1) * 0.45),
          reasoning: `${nodes.length} nodes joined by ${edges.length} edge${edges.length === 1 ? "" : "s"}` + (directed ? `, ${directed} of them pointing somewhere` : ""),
          roles: { nodes, links: edges.map((e) => e.id) }
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
        if (!allPlay(scope, "node")) return null;
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
        const labels = withRole(scope, "label").filter((l) => l.rule === 2);
        if (labels.length === 0) return null;
        return {
          confidence: labels.reduce((a, l) => a + l.confidence, 0) / labels.length,
          reasoning: `${labels.length} mark${labels.length === 1 ? "" : "s"} of writing inside a box`,
          roles: { box: [...new Set(labels.flatMap((l) => l.targets))], label: labels.map((l) => l.id) }
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
    const connectors = new Set(connections.map((c) => c.via).filter((v) => !!v));
    if (connectors.size) {
      regions = regions.filter((r) => !connectors.has(r.id));
    }
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
  function regionIdsIn(layout) {
    const out = [];
    const walk = (n2) => {
      if (n2.region) out.push(n2.id);
      n2.children.forEach(walk);
    };
    walk(layout.root);
    return out;
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
    if (depth === 1) box.push("flex:1 1 0", "min-width:0", "min-height:0");
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

  // src/parse/graph.ts
  var esc2 = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  var styleAttr2 = (s) => esc2(s).replace(/\n/g, " ");
  var SAFE_TAGS2 = /* @__PURE__ */ new Set(["div", "section", "article", "aside", "figure", "header", "footer", "nav", "main", "form"]);
  function closest(points, to) {
    let best = 0;
    let bestD = Infinity;
    points.forEach((p, i) => {
      const d = Math.hypot(p.x - to.x, p.y - to.y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }
  function parseGraph(regions, frame, roles, opts) {
    const byNode = new Map(regions.map((r) => [r.nodeId, r]));
    const roleOf = new Map(roles.map((r) => [r.id, r]));
    const regionIdOf = (nodeId) => byNode.get(nodeId)?.id;
    const nodes = [];
    const edges = [];
    const unplaced = [];
    const labelsFor = /* @__PURE__ */ new Map();
    for (const r of regions) {
      const role = roleOf.get(r.nodeId);
      if (role?.role === "label") {
        for (const t of role.targets) (labelsFor.get(t) ?? labelsFor.set(t, []).get(t)).push(r.id);
      }
    }
    for (const r of regions) {
      const role = roleOf.get(r.nodeId);
      if (!role) {
        unplaced.push(r.id);
        continue;
      }
      switch (role.role) {
        case "node":
        case "container":
          nodes.push({
            id: r.id,
            nodeId: r.nodeId,
            rect: r.rect,
            shape: r.shape,
            container: role.role === "container",
            labels: labelsFor.get(r.nodeId) ?? []
          });
          break;
        case "edge": {
          const world = opts.strokes[r.nodeId];
          const [fromNode, toNode] = role.direction ? [role.direction.from, role.direction.to] : [role.targets[0], role.targets[1]];
          const from = fromNode && regionIdOf(fromNode);
          const to = toNode && regionIdOf(toNode);
          if (!world || !from || !to) {
            unplaced.push(r.id);
            break;
          }
          let pts = world;
          const arrow = opts.arrows?.[r.nodeId];
          if (arrow) {
            const ti = closest(world, arrow.tip);
            const ta = closest(world, arrow.tail);
            pts = ti >= ta ? world.slice(ta, ti + 1) : world.slice(ti, ta + 1).reverse();
          }
          edges.push({
            id: r.id,
            nodeId: r.nodeId,
            from,
            to,
            directed: !!role.direction,
            path: pts.map((p) => ({ x: p.x - frame.x, y: p.y - frame.y })),
            labels: labelsFor.get(r.nodeId) ?? []
          });
          break;
        }
        case "label":
          break;
        // folded into what it labels
        default:
          unplaced.push(r.id);
      }
    }
    nodes.sort((a, b) => (b.container ? 1 : 0) - (a.container ? 1 : 0) || b.rect.w * b.rect.h - a.rect.w * a.rect.h);
    return { frame, nodes, edges, unplaced };
  }
  function nodeIdsIn(graph) {
    return graph.nodes.map((n2) => n2.id);
  }
  function describeGraph(graph) {
    const lines = [`GRAPH the drawing describes, in a ${Math.round(graph.frame.w)}\xD7${Math.round(graph.frame.h)} frame:`];
    lines.push("NODES, placed where they were drawn:");
    for (const n2 of graph.nodes) {
      const lbl = n2.labels.length ? ` \u2014 has writing in it (${n2.labels.join(", ")})` : "";
      lines.push(`  ${n2.id}: ${n2.container ? "container" : "node"}, ${n2.shape}, ${Math.round(n2.rect.w)}\xD7${Math.round(n2.rect.h)} at (${Math.round(n2.rect.x)},${Math.round(n2.rect.y)})${lbl}`);
    }
    lines.push("EDGES, as drawn:");
    for (const e of graph.edges) {
      lines.push(`  ${e.id}: ${e.from} ${e.directed ? "\u2192" : "\u2014"} ${e.to}${e.labels.length ? ` labelled by ${e.labels.join(", ")}` : ""}`);
    }
    if (graph.unplaced.length) lines.push(`UNPLACED (rendered as ink only): ${graph.unplaced.join(", ")}`);
    return lines.join("\n");
  }
  function pathD(points) {
    if (points.length === 0) return "";
    return points.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  }
  function buildGraphScaffold(graph, content, theme = {}) {
    const t = {
      background: theme.background ?? "#ffffff",
      color: theme.color ?? "#16161a",
      accent: theme.accent ?? "#3b5bdb",
      fontFamily: theme.fontFamily ?? "system-ui, -apple-system, 'Segoe UI', sans-serif"
    };
    const { w: w2, h: h2 } = graph.frame;
    const edgeSvg = [
      `  <svg class="mm-edges" viewBox="0 0 ${Math.round(w2)} ${Math.round(h2)}" width="${Math.round(w2)}" height="${Math.round(h2)}" xmlns="http://www.w3.org/2000/svg">`,
      `    <defs><marker id="mm-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${styleAttr2(t.accent)}"/></marker></defs>`,
      ...graph.edges.map(
        (e) => `    <path data-region="${e.id}" d="${pathD(e.path)}" fill="none" stroke="${styleAttr2(t.accent)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${e.directed ? ' marker-end="url(#mm-head)"' : ""}/>`
      ),
      "  </svg>"
    ].join("\n");
    const nodeHtml = graph.nodes.map((n2) => {
      const own = content[n2.id];
      const tag = own?.tag && SAFE_TAGS2.has(own.tag) ? own.tag : "div";
      const box = `position:absolute;left:${Math.round(n2.rect.x)}px;top:${Math.round(n2.rect.y)}px;width:${Math.round(n2.rect.w)}px;height:${Math.round(n2.rect.h)}px`;
      const fill = ["box-sizing:border-box", "width:100%", "height:100%", "overflow:hidden", own?.style ?? ""].filter(Boolean).join(";");
      return `  <${tag} data-region="${n2.id}" style="${styleAttr2(box)}">
    <div style="${styleAttr2(fill)}">${own?.html ?? ""}</div>
  </${tag}>`;
    }).join("\n");
    return [
      "<style>",
      `  .mm-frame { position:relative; width:100%; height:100%; overflow:hidden;`,
      `    background:${styleAttr2(t.background)}; color:${styleAttr2(t.color)}; font-family:${styleAttr2(t.fontFamily)}; }`,
      "  .mm-frame *, .mm-frame *::before, .mm-frame *::after { box-sizing:border-box; }",
      "  .mm-frame .mm-edges { position:absolute; left:0; top:0; }",
      "  .mm-frame [data-region] { overflow:hidden; }",
      "  .mm-frame h1, .mm-frame h2, .mm-frame h3, .mm-frame p { margin:0 0 0.35em; }",
      "</style>",
      '<div class="mm-frame">',
      edgeSvg,
      nodeHtml,
      "</div>"
    ].join("\n");
  }

  // src/session/session.ts
  var DEFAULT_SESSION_CONFIG = {
    gesture: DEFAULT_GESTURE_CONFIG,
    wireEndpointRatio: 0.15,
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
    let selection = [];
    let commandMark = config.gesture.commandMark ?? null;
    let markMiss = null;
    let lastAt = 0;
    let counter2 = 0;
    const listeners = /* @__PURE__ */ new Set();
    const CHECKPOINT_EVERY = 200;
    let checkpoints = [];
    function snapshot() {
      return structuredClone({
        nodes,
        contentIds,
        artifacts,
        pendingLasso,
        summon,
        clusterCandidates,
        participants,
        explanations,
        live,
        selection,
        commandMark,
        markMiss,
        lastAt,
        counter: counter2
      });
    }
    function restore(snap) {
      const s = structuredClone(snap);
      nodes = s.nodes;
      contentIds = s.contentIds;
      artifacts = s.artifacts;
      pendingLasso = s.pendingLasso;
      summon = s.summon;
      clusterCandidates = s.clusterCandidates;
      participants = s.participants;
      explanations = s.explanations;
      live = s.live;
      selection = s.selection;
      commandMark = s.commandMark;
      markMiss = s.markMiss;
      lastAt = s.lastAt;
      counter2 = s.counter;
    }
    function maybeCheckpoint(length) {
      if (length > 0 && length % CHECKPOINT_EVERY === 0 && !checkpoints.some((c) => c.length === length)) {
        checkpoints.push({ length, snap: snapshot() });
      }
    }
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
      selection = [];
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
      const marks = contentIds.map(markOf).filter((m) => !!m);
      const groups = clusters(marks, relate(marks));
      for (const ids of groups) {
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
      const me = markOf(node.id);
      if (!me) return;
      for (const id of contentIds) {
        if (id === node.id) continue;
        const other = markOf(id);
        if (!other) continue;
        for (const r of relate([me, other])) {
          nodes.get(r.from)?.edges.push({
            to: r.to,
            rel: r.kind,
            weight: r.strength,
            via: TIER0_PARTICIPANT,
            reasoning: r.reasoning
          });
        }
      }
    }
    function inferWire(node, points, scale) {
      const top = resemblances(node)[0];
      if (!top) return;
      const kind = top.to.replace(/^type:/, "");
      if (kind !== "line" && kind !== "arrow") return;
      const arrow = getRep(node, "reading:arrow")?.data;
      const ends = kind === "arrow" && arrow ? [arrow.tail, arrow.tip] : [points[0], points[points.length - 1]];
      const nearest2 = (p) => {
        let best = null;
        for (const c of contentBoundsList(node.id)) {
          const size = Math.max(c.bounds.maxX - c.bounds.minX, c.bounds.maxY - c.bounds.minY);
          const reach = Math.max(10 * scale, size * config.wireEndpointRatio);
          const d = distancePointToBounds(p, c.bounds);
          if (d < reach && (!best || d < best.d)) best = { id: c.id, d };
        }
        return best;
      };
      const a = nearest2(ends[0]);
      const b = nearest2(ends[1]);
      if (!a || !b || a.id === b.id) return;
      const weight = top.weight;
      const why = `its ${kind === "arrow" ? "tail" : "start"} lands on ${a.id} and its ${kind === "arrow" ? "tip" : "end"} on ${b.id}`;
      node.edges.push({ to: a.id, rel: "connects", weight, reasoning: why });
      node.edges.push({ to: b.id, rel: "connects", weight, reasoning: why });
      nodes.get(a.id).edges.push({ to: node.id, rel: "connected-by", weight });
      nodes.get(b.id).edges.push({ to: node.id, rel: "connected-by", weight });
      if (kind === "arrow") {
        node.edges.push({ to: a.id, rel: "points-from", weight, reasoning: why });
        node.edges.push({ to: b.id, rel: "points-to", weight, reasoning: why });
      }
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
      selection = ids.slice();
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
      const byHand = !ev.content;
      if (pendingLasso && byHand) {
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
      if (byHand && matchesCommandMark(fp, commandMark ?? BUILTIN_COMMAND_MARK).match) {
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
      const scratched = fp.isClosed || !byHand ? [] : scratchedOut(points, scratchTargets(node.id), config.eraseCrossings);
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
      if (byHand) {
        summon = null;
        selection = [];
      }
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
      for (const r of analysis.results) {
        if (r.meta) node.reps.push({ modality: `reading:${r.type}`, data: r.meta, source: TIER0_PARTICIPANT });
      }
      if (absorbIntoWord(node, fp, at, scale)) {
        recomputeClusterCandidates();
        return node.id;
      }
      addSpatialEdges(node);
      inferWire(node, points, scale);
      const enclosed = enclosedBy(fp.bounds, contentBoundsList(node.id));
      const onLive = liveArtifactUnder(fp.bounds, node.id);
      pendingLasso = byHand && (isLassoLike(fp, enclosed.length) || fp.isClosed && onLive) ? { id: node.id, at } : null;
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
      selection = [];
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
      selection = selection.filter((id) => id !== node.id);
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
      if (isWord(node)) {
        for (const id of lettersOf(node)) eraseNode(id, at);
      }
      for (const e of node.edges) {
        if (e.rel === "part-of" && !e.blessed && nodes.get(e.to) && isWord(nodes.get(e.to))) shrinkWord(e.to, node.id);
      }
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
      for (const r of ev.reps ?? []) {
        node.reps.push({
          modality: r.modality,
          data: r.reasoning === void 0 ? r.data : { ...r.data, reasoning: r.reasoning },
          confidence: r.confidence,
          source: ev.participantId
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
      let placed2;
      if (ev.mode === "equalize") {
        const tw = Math.max(...targets.map((t) => w2(t.bounds)));
        const th = Math.max(...targets.map((t) => h2(t.bounds)));
        placed2 = targets.map((t) => {
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
        placed2 = ordered2.map((t, i) => {
          const size = sizes[i];
          const half = (axis === "row" ? h2(t.bounds) : w2(t.bounds)) / 2;
          const to = axis === "row" ? { minX: cursor, maxX: cursor + size, minY: cross - half, maxY: cross + half } : { minX: cross - half, maxX: cross + half, minY: cursor, maxY: cursor + size };
          cursor += size + gap;
          return { id: t.id, to };
        });
      }
      for (const p of placed2) {
        const node = nodes.get(p.id);
        node.reps = node.reps.filter((r) => r.modality !== "transform");
        node.reps.push({ modality: "transform", data: p.to, source: "engine" });
      }
      recomputeClusterCandidates();
    }
    function snappableIds() {
      const out = contentIds.filter((id) => !artifacts.includes(id) && id !== pendingLasso?.id);
      for (const aid of artifacts) {
        const a = nodes.get(aid);
        if (a) {
          for (const e of a.edges) if (e.rel === "has-part") out.push(e.to);
        }
      }
      return out;
    }
    function candidatesAmong(ids) {
      const out = [];
      for (const id of ids) {
        const node = nodes.get(id);
        if (!node || getRep(node, "erased") || !getRep(node, "stroke") || cleanOf(node)) continue;
        const r = snapReading(node, nodes);
        if (r.ok) out.push({ id, ...r });
      }
      return out;
    }
    function applySnap(ev) {
      if (ev.mode === "raw") {
        for (const id of ev.ids) {
          const node = nodes.get(id);
          if (node) node.reps = node.reps.filter((r) => r.modality !== "clean");
        }
        return;
      }
      for (const c of candidatesAmong(ev.ids)) {
        const node = nodes.get(c.id);
        const clean = idealize(node, c.shape);
        if (!clean) continue;
        node.reps.push({ modality: "clean", data: clean, confidence: c.weight, source: ev.participantId ?? "engine" });
      }
    }
    function wordBounds(letterIds) {
      return getBounds(letterIds.flatMap((id) => {
        const b = boundsOf(nodes.get(id));
        return [{ x: b.minX, y: b.minY }, { x: b.maxX, y: b.maxY }];
      }));
    }
    function setWordReps(word, letterIds) {
      word.reps = word.reps.filter((r) => r.modality !== "word-run" && r.modality !== "bounds");
      word.reps.push({ modality: "word-run", data: { letters: letterIds }, source: TIER0_PARTICIPANT });
      word.reps.push({ modality: "bounds", data: wordBounds(letterIds), source: TIER0_PARTICIPANT });
      word.edges = word.edges.filter((e) => e.rel !== "has-part" && e.rel !== "resembles");
      for (const id of letterIds) word.edges.push({ to: id, rel: "has-part" });
      word.edges.push({
        to: typeNodeId("text"),
        rel: "resembles",
        weight: wordConfidence(letterIds.length),
        via: TIER0_PARTICIPANT,
        reasoning: `${letterIds.length} small strokes in a row on one line \u2014 printed letters`
      });
    }
    function looksLikeShape(n2) {
      const top = resemblances(n2)[0];
      if (!top) return false;
      const t = top.to.replace(/^type:/, "");
      return (t === "rectangle" || t === "triangle") && (top.weight ?? 0) >= 0.72;
    }
    function absorbIntoWord(node, fp, at, scale) {
      if (!isLetterLike(fp.bounds, scale) || looksLikeShape(node)) return false;
      const prevId = contentIds.filter((id) => id !== node.id).pop();
      if (!prevId) return false;
      const prev = nodes.get(prevId);
      const letter = { bounds: fp.bounds, at };
      if (isWord(prev)) {
        const letters = lettersOf(prev);
        const lastAt2 = (getRep(nodes.get(letters[letters.length - 1]), "stroke")?.data).at;
        const j2 = joinsRun({ bounds: boundsOf(prev), lastAt: lastAt2 }, letter, scale);
        if (!j2.ok) return false;
        letters.push(node.id);
        setWordReps(prev, letters);
        node.edges.push({ to: prev.id, rel: "part-of", reasoning: j2.reasoning });
        removeFromContent(node.id);
        return true;
      }
      const prevFp = fingerprintOf(prev);
      const prevStroke = getRep(prev, "stroke")?.data;
      if (!prevFp || !prevStroke || getRep(prev, "gesture")) return false;
      if (pendingLasso?.id === prev.id) return false;
      if (!isLetterLike(prevFp.bounds, prevStroke.scale ?? scale) || looksLikeShape(prev)) return false;
      const j = joinsRun({ bounds: prevFp.bounds, lastAt: prevStroke.at }, letter, scale);
      if (!j.ok) return false;
      const word = { id: nextId("word"), reps: [], edges: [{ to: LOCAL_PARTICIPANT, rel: "made-by" }], capability: 0, createdAt: at };
      nodes.set(word.id, word);
      setWordReps(word, [prev.id, node.id]);
      for (const id of [prev.id, node.id]) {
        nodes.get(id).edges.push({ to: word.id, rel: "part-of", reasoning: j.reasoning });
      }
      const idx = contentIds.indexOf(prev.id);
      contentIds.splice(idx, 1, word.id);
      removeFromContent(node.id);
      if (pendingLasso?.id === node.id) pendingLasso = null;
      return true;
    }
    function shrinkWord(wordId, without) {
      const word = nodes.get(wordId);
      if (!word || !isWord(word)) return;
      const letters = lettersOf(word).filter((id) => id !== without && !getRep(nodes.get(id), "erased"));
      if (letters.length >= 2 && without !== null) {
        setWordReps(word, letters);
        return;
      }
      const idx = contentIds.indexOf(wordId);
      if (idx >= 0) contentIds.splice(idx, 1, ...letters);
      for (const id of letters) {
        const n2 = nodes.get(id);
        n2.edges = n2.edges.filter((e) => !(e.rel === "part-of" && e.to === wordId));
      }
      word.reps.push({ modality: "status", data: "dissolved", source: "engine" });
      word.edges = word.edges.filter((e) => e.rel !== "has-part");
    }
    function applySelect(ev) {
      selection = ev.ids.filter((id) => contentIds.includes(id));
    }
    function manipulable(ids) {
      const out = [];
      const seen = /* @__PURE__ */ new Set();
      const visit = (id) => {
        if (seen.has(id)) return;
        seen.add(id);
        const n2 = nodes.get(id);
        if (!n2 || getRep(n2, "erased")) return;
        if (getRep(n2, "stroke")) {
          out.push(n2);
          return;
        }
        for (const e of n2.edges) if (e.rel === "has-part") visit(e.to);
      };
      ids.forEach(visit);
      return out;
    }
    function setTransform(node, to) {
      node.reps = node.reps.filter((r) => r.modality !== "transform");
      node.reps.push({ modality: "transform", data: to, source: "user" });
    }
    function frameBounds(node) {
      const moved = getRep(node, "transform")?.data;
      if (moved) return moved;
      return fingerprintOf(node)?.bounds;
    }
    function applyMove(ev) {
      for (const n2 of manipulable(ev.ids)) {
        const b = frameBounds(n2);
        if (!b) continue;
        setTransform(n2, { minX: b.minX + ev.dx, maxX: b.maxX + ev.dx, minY: b.minY + ev.dy, maxY: b.maxY + ev.dy });
        refreshWordBounds(n2);
      }
      recomputeClusterCandidates();
    }
    function applyScale(ev) {
      const sx = ev.sx > 1e-3 ? ev.sx : 1e-3, sy = ev.sy > 1e-3 ? ev.sy : 1e-3;
      for (const n2 of manipulable(ev.ids)) {
        const b = frameBounds(n2);
        if (!b) continue;
        setTransform(n2, {
          minX: ev.about.x + (b.minX - ev.about.x) * sx,
          maxX: ev.about.x + (b.maxX - ev.about.x) * sx,
          minY: ev.about.y + (b.minY - ev.about.y) * sy,
          maxY: ev.about.y + (b.maxY - ev.about.y) * sy
        });
        refreshWordBounds(n2);
      }
      recomputeClusterCandidates();
    }
    function applyRotate(ev) {
      const c = Math.cos(ev.radians), s = Math.sin(ev.radians);
      for (const n2 of manipulable(ev.ids)) {
        const b = frameBounds(n2);
        if (!b) continue;
        const cx2 = (b.minX + b.maxX) / 2, cy2 = (b.minY + b.maxY) / 2;
        const nx = ev.about.x + (cx2 - ev.about.x) * c - (cy2 - ev.about.y) * s;
        const ny = ev.about.y + (cx2 - ev.about.x) * s + (cy2 - ev.about.y) * c;
        setTransform(n2, { minX: b.minX + nx - cx2, maxX: b.maxX + nx - cx2, minY: b.minY + ny - cy2, maxY: b.maxY + ny - cy2 });
        const prev = getRep(n2, "rotation")?.data ?? 0;
        n2.reps = n2.reps.filter((r) => r.modality !== "rotation");
        n2.reps.push({ modality: "rotation", data: prev + ev.radians, source: "user" });
        refreshWordBounds(n2);
      }
      recomputeClusterCandidates();
    }
    function refreshWordBounds(letter) {
      for (const e of letter.edges) {
        if (e.rel !== "part-of") continue;
        const w2 = nodes.get(e.to);
        if (w2 && isWord(w2)) setWordReps(w2, lettersOf(w2));
      }
    }
    function applySplit(ev) {
      shrinkWord(ev.nodeId, null);
    }
    function applySummon(ev) {
      if (!pendingLasso) return null;
      const lassoNode = nodes.get(pendingLasso.id);
      const lassoFp = lassoNode && fingerprintOf(lassoNode);
      if (!lassoNode || !lassoFp) return null;
      lassoNode.reps.push({ modality: "gesture", data: { role: "lasso" }, source: "heuristic" });
      removeFromContent(lassoNode.id);
      const enclosedIds = enclosedBy(lassoFp.bounds, contentBoundsList());
      summon = buildSummon(
        enclosedIds,
        "lasso",
        `you circled ${enclosedIds.length} mark${enclosedIds.length === 1 ? "" : "s"} and asked`,
        [lassoNode.id],
        lassoFp.bounds,
        lassoNode.id,
        ev.at
      );
      pendingLasso = null;
      markMiss = null;
      recomputeClusterCandidates();
      return summon.id;
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
        case "summon":
          return applySummon(ev);
        case "split":
          applySplit(ev);
          return null;
        case "select":
          applySelect(ev);
          return null;
        case "deselect":
          selection = [];
          return null;
        case "move":
          applyMove(ev);
          return null;
        case "scale":
          applyScale(ev);
          return null;
        case "rotate":
          applyRotate(ev);
          return null;
        case "tidy":
          applyTidy(ev);
          return null;
        case "snap":
          applySnap(ev);
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
      checkpoints = checkpoints.filter((c) => c.length <= events.length);
      const from = checkpoints[checkpoints.length - 1];
      let start = 0;
      if (from) {
        restore(from.snap);
        start = from.length;
      } else reset();
      for (let i = start; i < events.length; i++) {
        applyEvent(events[i]);
        maybeCheckpoint(i + 1);
      }
    }
    function dispatch(ev) {
      events.push(ev);
      const result2 = applyEvent(ev);
      maybeCheckpoint(events.length);
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
        live: [...live],
        selection: [...selection]
      };
    }
    function subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
    return {
      addStroke: (points, at, participantId, scale, options) => dispatch({ type: "stroke", points, at, participantId, scale, content: options?.content }),
      join: (kind, name, at, capability) => dispatch({ type: "join", kind, name, at, capability }),
      propose: (args) => void dispatch({ type: "propose", ...args }),
      answer: (args) => dispatch({ type: "answer", ...args }),
      teachCommandMark: (mark, at) => void dispatch({ type: "teach", mark, at }),
      tidy: (args) => void dispatch({ type: "tidy", ...args }),
      snap: (args) => void dispatch({ type: "snap", ...args }),
      snapCandidates: (ids) => candidatesAmong(ids ?? snappableIds()),
      attachCode: (args) => dispatch({ type: "code", ...args }),
      regions: (artifactId) => {
        const node = nodes.get(artifactId);
        return node ? regionsOf(node, nodes) : [];
      },
      read: (ids) => {
        const marks = ids.map(markOf).filter((m) => !!m);
        const relations = relate(marks);
        const shapes = {};
        const shapeConfidence = {};
        const names = {};
        const transcripts = {};
        const wires = {};
        for (const m of marks) {
          const n2 = nodes.get(m.id);
          const top = resemblances(n2)[0];
          shapes[m.id] = top ? top.to.replace(/^type:/, "") : "art";
          shapeConfidence[m.id] = top?.weight ?? 0;
          const word = wordOf(n2);
          if (word) names[m.id] = word;
          const said = transcriptOf(n2);
          if (said) transcripts[m.id] = said;
          const ends = n2.edges.filter((e) => e.rel === "connects").map((e) => e.to);
          if (ends.length) {
            wires[m.id] = {
              ends,
              from: n2.edges.find((e) => e.rel === "points-from")?.to,
              to: n2.edges.find((e) => e.rel === "points-to")?.to
            };
          }
        }
        const scopeIds = marks.map((m) => m.id);
        const roles = assignRoles({ ids: scopeIds, shapes, shapeConfidence, relations, wires });
        const genre = genreOf(roles);
        const scope = { ids: scopeIds, marks, relations, shapes, names, transcripts, roles };
        return { scope, relations, roles, genre, concepts: matchConcepts(scope) };
      },
      tick: (at) => void dispatch({ type: "tick", at }),
      summonHeld: (at) => dispatch({ type: "summon", at }),
      splitWord: (nodeId, at) => void dispatch({ type: "split", nodeId, at }),
      select: (ids, at) => void dispatch({ type: "select", ids, at }),
      deselect: (at) => void dispatch({ type: "deselect", at }),
      move: (args) => void dispatch({ type: "move", ...args }),
      scale: (args) => void dispatch({ type: "scale", ...args }),
      rotate: (args) => void dispatch({ type: "rotate", ...args }),
      bless: (args) => dispatch({ type: "bless", ...args }),
      dismiss: (summonId, at) => void dispatch({ type: "dismiss", summonId, at }),
      erase: (nodeId, at) => void dispatch({ type: "erase", nodeId, at }),
      undo,
      load: (log) => {
        events = log.map((ev) => ({ ...ev }));
        checkpoints = [];
        replay();
        notify();
      },
      getState,
      subscribe,
      getEvents: () => events
    };
  }

  // src/llm/provider.ts
  var PRESETS = {
    ollama: { kind: "openai-compatible", baseUrl: "http://localhost:11434/v1" },
    lmStudio: { kind: "openai-compatible", baseUrl: "http://localhost:1234/v1" },
    openRouter: { kind: "openai-compatible", baseUrl: "https://openrouter.ai/api/v1" },
    anthropic: { kind: "anthropic", baseUrl: "https://api.anthropic.com/v1" }
  };
  function textOf(content) {
    return typeof content === "string" ? content : content.filter((p) => p.type === "text").map((p) => p.text).join("\n");
  }
  function dataUrlParts(dataUrl) {
    const m = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl);
    return m ? { mediaType: m[1], data: m[2] } : null;
  }
  function openAIContent(content) {
    if (typeof content === "string") return content;
    return content.map(
      (p) => p.type === "text" ? { type: "text", text: p.text } : { type: "image_url", image_url: { url: p.dataUrl } }
    );
  }
  function anthropicContent(content) {
    if (typeof content === "string") return content;
    return content.map((p) => {
      if (p.type === "text") return { type: "text", text: p.text };
      const parts = dataUrlParts(p.dataUrl);
      return parts ? { type: "image", source: { type: "base64", media_type: parts.mediaType, data: parts.data } } : { type: "text", text: "(an image the transport could not encode)" };
    });
  }
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
  function stripThink(text) {
    const stripped = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
    const open = stripped.search(/<think>/i);
    return (open === -1 ? stripped : stripped.slice(0, open)).trim();
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
      { model: config.model, messages: messages.map((m) => ({ role: m.role, content: openAIContent(m.content) })), stream: false },
      timeoutMs,
      external
    );
    if (!res.ok) return res;
    const body = res.json;
    const raw = firstString(body?.choices?.[0]?.message?.content);
    if (raw === void 0) return { ok: false, error: "no completion text in response" };
    const text = stripThink(raw);
    return { ok: true, text, model: firstString(body.model) ?? config.model };
  }
  async function completeAnthropic(config, messages, timeoutMs, external) {
    if (!config.apiKey) return { ok: false, error: "anthropic requires an API key" };
    const system = messages.filter((m) => m.role === "system").map((m) => textOf(m.content)).join("\n\n");
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
        messages: user.map((m) => ({ role: "user", content: anthropicContent(m.content) }))
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
    const said = transcriptsOf(node);
    if (said.length > 0) {
      lines.push("  writing reads:");
      for (const t of said) lines.push(`    - "${t.text}" ${t.confidence.toFixed(2)} by ${t.source ?? "unknown"}`);
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
    const named2 = state.artifacts.map((id) => state.nodes.get(id)).filter((x) => !!x).map((a) => wordOf(a)).filter((w2) => !!w2);
    if (named2.length > 0) {
      parts.push(`Known names in this session: ${named2.join(", ")}`);
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
  var ENGAGING_RELATIONS = ["contains", "near", "touching", "crossing"];
  function roleLine(r, name, noun, said) {
    const me = name(r.id);
    if (!me) return void 0;
    const others = r.targets.map(name).filter((x) => !!x);
    switch (r.role) {
      case "container":
        return `${me}: container${others.length ? `, holding ${others.join(", ")}` : ""} \u2014 its contents are its sections`;
      case "label":
        if (said) {
          return others.length ? `${me}: label for ${others[0]} \u2014 the human wrote "${said}" there. Use those words: they are ${others[0]}'s title, and ${me} shows them` : `${me}: label \u2014 the human wrote "${said}". Use those words`;
        }
        return others.length ? `${me}: label for ${others[0]} \u2014 handwriting the human put there. You cannot read it; write the title or caption that belongs in that place, and treat ${others[0]} as titled by it` : `${me}: label \u2014 handwriting; write what belongs there`;
      case "edge": {
        if (r.direction) {
          const from = name(r.direction.from), to = name(r.direction.to);
          if (from && to) return `${me}: edge ${from} \u2192 ${to} \u2014 a connection with a direction`;
        }
        return others.length ? `${me}: edge joining ${others.join(" and ")}` : `${me}: edge`;
      }
      case "annotation":
        return `${me}: annotation${others.length ? ` near ${others[0]}` : ""} \u2014 a note in the margin, not part of the ${noun}s' content`;
      case "node":
        return `${me}: node \u2014 a ${noun} that holds content of its own`;
      default:
        return `${me}: unclassified \u2014 ${r.reasoning}`;
    }
  }
  function describeReading(reading, options = {}) {
    const name = options.idOf ?? ((id) => id);
    const noun = options.noun ?? "region";
    const lines = [];
    lines.push(`GENRE: ${reading.genre.genre} \u2014 ${reading.genre.reasoning}`);
    const roleLines = reading.roles.map((r) => roleLine(r, name, noun, reading.scope?.transcripts?.[r.id])).filter((x) => !!x);
    if (roleLines.length) {
      lines.push("", `WHAT EACH ${noun.toUpperCase()} PLAYS:`);
      for (const l of roleLines) lines.push(`  ${l}`);
    }
    const seen = /* @__PURE__ */ new Set();
    const sits = [];
    for (const c of reading.concepts) {
      const members = [...new Set(Object.values(c.roles ?? {}).flat())].map(name).filter((x) => !!x);
      const who = members.length ? members.join(", ") : "these marks";
      sits.push(`${who} read as a ${c.concept} (${c.confidence.toFixed(2)}) \u2014 ${c.reasoning}`);
    }
    for (const r of reading.relations) {
      if (!ENGAGING_RELATIONS.includes(r.kind)) continue;
      const a = name(r.from), b = name(r.to);
      if (!a || !b) continue;
      const key2 = r.kind === "contains" ? `${r.kind}:${a}:${b}` : `${r.kind}:${[a, b].sort().join(":")}`;
      if (seen.has(key2)) continue;
      seen.add(key2);
      const verb = r.kind === "contains" ? "contains" : r.kind === "near" ? "is near" : r.kind === "touching" ? "touches" : "crosses";
      sits.push(`${a} ${verb} ${b} (${r.strength.toFixed(2)})`);
    }
    if (sits.length) {
      lines.push("", "HOW THEY SIT:");
      for (const l of sits) lines.push(`  ${l}`);
    }
    const names = Object.entries(reading.scope?.names ?? {}).map(([id, w2]) => [name(id), w2]).filter((x) => !!x[0]);
    if (names.length) {
      lines.push("", "NAMES the human gave:");
      for (const [id, w2] of names) lines.push(`  ${id}: "${w2}"`);
    }
    return lines.join("\n");
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

THE DRAWING IS THE BRIEF. Below the layout you are told what each region PLAYS, how the regions sit, and any names the human gave. Read it before writing a word:
- A label is handwriting the human put inside a region. You cannot read it, so write the title or caption that belongs in exactly that place, and make the region it labels read as titled by it.
- Regions in a row are peers of equal standing. A column is a sequence, top to bottom. A container's contents are its sections, and the container itself frames them.
- A short request ("a page", "a card") is not a request for placeholders. Infer a specific subject from the structure \u2014 a header over two columns over a footer is a product page, a box with a label inside it is a titled panel \u2014 and commit to it throughout.

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
  var READ_PROMPT = `You are reading handwriting from a shared drawing canvas. The image shows one handwritten mark, dark ink on a light ground, exactly as the human drew it.

Transcribe what it says. Offer up to 3 readings ranked by confidence when the writing is ambiguous; one when it is clear. Keep the human's casing and punctuation. Do not describe the image, do not guess at meaning, do not add words that are not there.

Reply with ONLY a JSON array, no prose, no code fences:
[{"text":"what it says","confidence":0.0-1.0}]`;
  var DRAW_PROMPT = `You are a participant on a shared drawing canvas, alongside a human. You have been asked to ADD MARKS to the drawing.

You are given the marks already on the canvas as measured facts \u2014 positions, sizes, what each reads as and plays \u2014 in canvas units (y grows downward). You are not given an image.

Say what you would draw. You may use only these shapes:
  - {"shape":"rectangle","x":..,"y":..,"w":..,"h":..,"why":"..."}
  - {"shape":"circle","x":..,"y":..,"w":..,"h":..,"why":"..."}   (x,y,w,h is the box the circle fills)
  - {"shape":"triangle","x":..,"y":..,"w":..,"h":..,"why":"..."}
  - {"shape":"line","from":{"x":..,"y":..},"to":{"x":..,"y":..},"why":"..."}
  - {"shape":"arrow","from":{"x":..,"y":..},"to":{"x":..,"y":..},"why":"..."}   (points from tail to tip)

Rules:
- At most ${MAX_DRAWN} shapes. Fewer is better; draw what was asked and nothing decorative.
- Place new marks relative to what is there: match the sizes and spacing you were given, sit beside or below the marks you were pointed at, and do not overlap them unless asked to.
- An arrow's ends should land on the marks it joins \u2014 near an edge, not at the centre.
- "why" is one short clause the human will see beside the mark.

Reply with ONLY a JSON array, no prose, no code fences.`;
  function parseTranscripts(text) {
    if (!text) return [];
    const unfenced = text.replace(/```(?:json)?/gi, "").trim();
    const start = unfenced.indexOf("[");
    const end = unfenced.lastIndexOf("]");
    if (start === -1 || end === -1 || end < start) {
      const bare = unfenced.replace(/^["'\s]+|["'\s]+$/g, "");
      return bare && bare.length <= 80 && !/\n/.test(bare) ? [{ text: bare, confidence: 0.5 }] : [];
    }
    let parsed;
    try {
      parsed = JSON.parse(unfenced.slice(start, end + 1));
    } catch {
      return [];
    }
    if (!Array.isArray(parsed)) return [];
    const out = [];
    for (const item of parsed) {
      if (typeof item === "string" && item.trim()) {
        out.push({ text: item.trim(), confidence: 0.5 });
        continue;
      }
      if (!item || typeof item !== "object") continue;
      const rec = item;
      const t = typeof rec.text === "string" ? rec.text : typeof rec.label === "string" ? rec.label : "";
      if (!t.trim()) continue;
      out.push({ text: t.trim(), confidence: clamp01(rec.confidence) });
    }
    return out.sort((a, b) => b.confidence - a.confidence);
  }
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
  function salvageRegions(text) {
    const out = {};
    const re = /"(r\d+)"\s*:\s*\{/g;
    let m;
    while (m = re.exec(text)) {
      const start = m.index + m[0].length - 1;
      let depth = 0, inString = false, escaped = false, end = -1;
      for (let i = start; i < text.length; i++) {
        const c = text[i];
        if (inString) {
          if (escaped) escaped = false;
          else if (c === "\\") escaped = true;
          else if (c === '"') inString = false;
          continue;
        }
        if (c === '"') inString = true;
        else if (c === "{") depth++;
        else if (c === "}" && --depth === 0) {
          end = i;
          break;
        }
      }
      if (end === -1) break;
      const entry = parseLoose(text.slice(start, end + 1));
      if (entry && typeof entry === "object") out[m[1]] = entry;
    }
    return Object.keys(out).length ? out : null;
  }
  function parseFill(text) {
    if (!text) return null;
    const unfenced = text.replace(/```(?:json)?/gi, "");
    const json = outermostObject(unfenced);
    const parsed = json ? parseLoose(json) : null;
    const salvaged = parsed && typeof parsed === "object" ? null : salvageRegions(unfenced);
    if (!salvaged && (!parsed || typeof parsed !== "object")) return null;
    const obj = salvaged ? { regions: salvaged } : parsed;
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
  function createAgentParticipant(session, config, at = 0, options = {}) {
    const send = options.transport ?? ((c, m, o) => complete(c, m, o));
    const name = options.name ?? providerLabel(config);
    const id = session.join("agent", name, at, options.tier ?? providerTier(config));
    async function interpret(nodeIds, now, signal) {
      const state = session.getState();
      const targets = nodeIds.filter((n2) => state.nodes.has(n2));
      if (targets.length === 0) return { ok: false, readings: [], error: "no such nodes" };
      const isCluster = targets.length > 1;
      const context = describeSession(state, { nodeIds: targets }) + (isCluster ? `

${describeReading(session.read(targets), { noun: "mark" })}` : "");
      const signature = isCluster ? describeSignature(state, targets) : "";
      const question = isCluster ? `These ${targets.length} marks were grouped together (${signature}). What could this group be? Offer several readings.` : `What could this mark be? Offer several readings.`;
      const result2 = await send(
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
      const context = describeSession(state, { nodeIds: targets }) + (targets.length > 1 ? `

${describeReading(session.read(targets), { noun: "mark" })}` : "");
      const result2 = await send(
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
      const reading = session.read(regions.map((r) => r.nodeId));
      const genre = reading.genre.genre;
      const regionIdOf = new Map(regions.map((r) => [r.nodeId, r.id]));
      const idOf = (id2) => regionIdOf.get(id2);
      const inside = [];
      for (const r of reading.roles) {
        if (r.role !== "container" || r.targets.length < 2) continue;
        const me = idOf(r.id);
        if (!me) continue;
        for (const c of session.read(r.targets).concepts) {
          const members = [...new Set(Object.values(c.roles ?? {}).flat())].map(idOf).filter((x) => !!x);
          const who = members.length ? members.join(", ") : r.targets.map(idOf).filter(Boolean).join(", ");
          inside.push(`  within ${me}: ${who} read as a ${c.concept} (${c.confidence.toFixed(2)}) \u2014 ${c.reasoning}`);
        }
      }
      const brief = describeReading(reading, { idOf }) + (inside.length ? `

WITHIN CONTAINERS:
${inside.join("\n")}` : "");
      let plan;
      if (genre === "graph" || genre === "mixed") {
        const strokes = {};
        const arrows = {};
        for (const r of regions) {
          const n2 = state.nodes.get(r.nodeId);
          if (!n2) continue;
          const pts = strokePointsOf(n2);
          if (pts) strokes[r.nodeId] = pts;
          const a = getRep(n2, "reading:arrow")?.data;
          if (a) arrows[r.nodeId] = a;
        }
        const graph = parseGraph(regions, frame, reading.roles, { strokes, arrows });
        plan = {
          describe: `${describeGraph(graph)}

${brief}`,
          ids: nodeIdsIn(graph),
          build: (c, t) => buildGraphScaffold(graph, c, t)
        };
      } else {
        const layout = parseLayout(regions, frame, connectionsOf(artifact, state, regions));
        plan = {
          describe: `${describeLayout(layout)}

${brief}`,
          // What the layout PLACES, not every mark that was drawn: a connector
          // is an edge, and content written for a line is content thrown away.
          ids: regionIdsIn(layout),
          build: (c, t) => buildScaffold(layout, c, t)
        };
      }
      const existing = [...artifact.reps].reverse().find((r) => r.modality === "code");
      const previous = existing?.data?.fill;
      const revising = !!previous;
      const ids = plan.ids;
      if (ids.length === 0) return { ok: false, error: "nothing in this artifact can hold content" };
      const addressed = args.addressed?.length ? args.addressed.filter((a) => ids.includes(a)) : ids;
      const lines = [plan.describe, ""];
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
      const result2 = await send(
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
      const changed = ids.filter((id2) => fill.regions[id2] && (!revising || addressed.includes(id2)));
      if (filled.length === 0) {
        return { ok: false, error: "the model filled none of the regions", raw: result2.text };
      }
      const code = plan.build(merged.regions, merged.theme ?? {});
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
        genre,
        filled,
        changed,
        unfilled: ids.filter((x) => !merged.regions[x]),
        raw: result2.text
      };
    }
    async function read(args) {
      if (!config.vision) return { ok: false, transcripts: [], error: `${name} cannot see images` };
      const state = session.getState();
      const node = state.nodes.get(args.nodeId);
      if (!node) return { ok: false, transcripts: [], error: "no such node" };
      if (!/^data:image\//.test(args.image)) return { ok: false, transcripts: [], error: "image must be a data URL" };
      const result2 = await send(
        config,
        [
          { role: "system", content: READ_PROMPT },
          { role: "user", content: [{ type: "image", dataUrl: args.image }, { type: "text", text: "What does this say?" }] }
        ],
        { signal: args.signal }
      );
      if (!result2.ok) return { ok: false, transcripts: [], error: result2.error };
      const transcripts = parseTranscripts(result2.text);
      if (transcripts.length === 0) return { ok: false, transcripts: [], error: "no readable transcript in reply", raw: result2.text };
      session.propose({
        participantId: id,
        nodeId: args.nodeId,
        edges: [],
        reps: transcripts.map((t) => ({ modality: "transcript", data: { text: t.text }, confidence: t.confidence })),
        at: args.at
      });
      return { ok: true, transcripts, raw: result2.text };
    }
    async function draw(args) {
      const prompt2 = args.prompt.trim();
      if (!prompt2) return { ok: false, ids: [], shapes: [], error: "no prompt" };
      const state = session.getState();
      const pointed = (args.nodeIds ?? []).filter((n2) => state.nodes.has(n2));
      const all = state.contentIds.filter((n2) => !state.artifacts.includes(n2));
      const context = describeSession(state, { nodeIds: all.length ? all : void 0 });
      const reading = all.length > 1 ? `

${describeReading(session.read(all), { noun: "mark" })}` : "";
      const focus = pointed.length ? `

THE HUMAN POINTED AT: ${pointed.join(", ")}${(() => {
        const bs = pointed.map((p) => boundsOf(state.nodes.get(p))).filter((b) => !!b);
        if (!bs.length) return "";
        const minX = Math.min(...bs.map((b) => b.minX)), minY = Math.min(...bs.map((b) => b.minY));
        const maxX = Math.max(...bs.map((b) => b.maxX)), maxY = Math.max(...bs.map((b) => b.maxY));
        return ` \u2014 together they span x ${Math.round(minX)}\u2013${Math.round(maxX)}, y ${Math.round(minY)}\u2013${Math.round(maxY)}`;
      })()}` : "";
      const result2 = await send(
        config,
        [
          { role: "system", content: DRAW_PROMPT },
          { role: "user", content: `${context}${reading}${focus}

The human asks: ${prompt2}` }
        ],
        { signal: args.signal }
      );
      if (!result2.ok) return { ok: false, ids: [], shapes: [], error: result2.error };
      const shapes = parseShapes(result2.text);
      if (shapes.length === 0) return { ok: false, ids: [], shapes: [], error: "nothing drawable in reply", raw: result2.text };
      const ids = [];
      let at2 = args.at;
      for (const s of shapes) {
        const points = strokeFor(s);
        if (!points) continue;
        const made = session.addStroke(points, at2, id, 1, { content: true });
        ids.push(made);
        at2 += 1;
        if (s.why) session.answer({ participantId: id, question: prompt2, text: s.why, aboutIds: [made], at: at2 });
        at2 += 1;
      }
      if (ids.length === 0) return { ok: false, ids: [], shapes, error: "every shape had no size", raw: result2.text };
      return { ok: true, ids, shapes, raw: result2.text };
    }
    return { id, name, config, interpret, ask, generate, read, draw };
  }

  // src/participants/bridge.ts
  function createBridgeParticipant(session, at = 0, options = {}) {
    const name = options.name ?? "bridge";
    const timeoutMs = options.timeoutMs ?? 6e5;
    let waiting = null;
    let counter2 = 0;
    const listeners = /* @__PURE__ */ new Set();
    const notify = () => listeners.forEach((l) => l(waiting?.request ?? null));
    function settle(result2) {
      if (!waiting) return;
      clearTimeout(waiting.timer);
      const { resolve } = waiting;
      waiting = null;
      resolve(result2);
      notify();
    }
    const describeForHand = (content) => typeof content === "string" ? content : content.map((p) => p.type === "text" ? p.text : "[an image of the ink is attached]").join("\n");
    const transport = (_config, messages, opts) => {
      if (waiting) {
        return Promise.resolve({ ok: false, error: "already waiting on an answer" });
      }
      const request = {
        id: `bridge:${++counter2}`,
        // A person answering by hand gets the words; an image the bridge cannot
        // show is said to be there rather than silently dropped.
        system: textOf(messages.find((m) => m.role === "system")?.content ?? ""),
        user: describeForHand(messages.find((m) => m.role === "user")?.content ?? ""),
        at: Date.now()
      };
      return new Promise((resolve) => {
        const timer = setTimeout(() => settle({ ok: false, error: `no answer within ${timeoutMs}ms` }), timeoutMs);
        waiting = { request, resolve, timer };
        if (opts.signal) {
          if (opts.signal.aborted) settle({ ok: false, error: "cancelled" });
          else opts.signal.addEventListener("abort", () => settle({ ok: false, error: "cancelled" }), { once: true });
        }
        notify();
      });
    };
    const config = { kind: "openai-compatible", baseUrl: "bridge://local", model: name };
    const agent = createAgentParticipant(session, config, at, {
      transport,
      name,
      tier: options.tier ?? 2
    });
    return {
      ...agent,
      pending: () => waiting?.request ?? null,
      deliver(requestId, text) {
        if (!waiting || waiting.request.id !== requestId) return false;
        settle({ ok: true, text, model: name });
        return true;
      },
      cancel(requestId, reason) {
        if (!waiting || waiting.request.id !== requestId) return false;
        settle({ ok: false, error: reason ?? "cancelled" });
        return true;
      },
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }
    };
  }

  // src/participants/router.ts
  var TIER0_ABILITIES = {
    read: true,
    arrange: true,
    answer: false,
    build: false,
    name: false
  };
  var SETTLED_CONFIDENCE = 0.6;
  function route(ability, state, options = {}) {
    const top = options.concepts?.[0];
    const settledLocally = TIER0_ABILITIES[ability] && !!top && top.confidence >= SETTLED_CONFIDENCE;
    const ids = options.participantIds ?? state.participants;
    const candidates = [];
    for (const pid of ids) {
      const node = state.nodes.get(pid);
      if (!node) continue;
      const kind = node.reps.find((r) => r.modality === "participant")?.data?.kind;
      if (kind !== "agent") continue;
      const tier = node.capability ?? 0;
      candidates.push({
        participantId: pid,
        name: wordOf(node) ?? pid,
        tier,
        // Local before hosted: on a machine you own, latency is the only price,
        // and it is one you have already paid for.
        cost: tier,
        why: tier === 1 ? "runs on this machine" : "hosted"
      });
    }
    candidates.sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
    return {
      ability,
      settledLocally,
      localAnswer: settledLocally ? `${top.concept} (${top.confidence.toFixed(2)}) \u2014 ${top.reasoning}` : void 0,
      candidates
    };
  }
  function describeRoute(r) {
    if (r.settledLocally) return `Tier 0 has this: ${r.localAnswer}`;
    if (r.candidates.length === 0) return `Nothing here can ${r.ability} \u2014 add a model, or bridge one in.`;
    return `${r.ability}: ${r.candidates.map((c) => `${c.name} (tier ${c.tier})`).join(", ")}`;
  }
  return __toCommonJS(index_exports);
})();

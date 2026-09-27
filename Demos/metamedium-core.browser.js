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
  var __copyProps = (to, from, except, desc2) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key2 of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key2) && key2 !== except)
          __defProp(to, key2, { get: () => from[key2], enumerable: !(desc2 = __getOwnPropDesc(from, key2)) || desc2.enumerable });
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
    COORD_PLACES: () => COORD_PLACES,
    DEFAULT_CORNER_OPTIONS: () => DEFAULT_CORNER_OPTIONS,
    DEFAULT_ERASE_CROSSINGS: () => DEFAULT_ERASE_CROSSINGS,
    DEFAULT_FILE_LIMIT: () => DEFAULT_FILE_LIMIT,
    DEFAULT_GESTURE_CONFIG: () => DEFAULT_GESTURE_CONFIG,
    DEFAULT_MAX_FORCE: () => DEFAULT_MAX_FORCE,
    DEFAULT_MIN_LENGTH_PX: () => DEFAULT_MIN_LENGTH_PX,
    DEFAULT_RELATE_CONFIG: () => DEFAULT_RELATE_CONFIG,
    DEFAULT_SESSION_CONFIG: () => DEFAULT_SESSION_CONFIG,
    DEFAULT_SIMPLIFY_PX: () => DEFAULT_SIMPLIFY_PX,
    DEFAULT_SPEED: () => DEFAULT_SPEED,
    DEFAULT_TIMEOUT_MS: () => DEFAULT_TIMEOUT_MS,
    DIRECTED_LINKS: () => DIRECTED_LINKS,
    ENGINE_NAME: () => ENGINE_NAME,
    ENGINE_PARTICIPANT: () => ENGINE_PARTICIPANT,
    FLAT_MARGIN: () => FLAT_MARGIN,
    FolderStore: () => FolderStore,
    GITHUB_API: () => GITHUB_API,
    GRAPH3D_MARK: () => GRAPH3D_MARK,
    GitStore: () => GitStore,
    HAND_RESOLUTION_PX: () => HAND_RESOLUTION_PX,
    HERE: () => HERE,
    KINDS: () => KINDS,
    LENGTH_UNITS: () => LENGTH_UNITS,
    LETTER_MAX_HEIGHT_PX: () => LETTER_MAX_HEIGHT_PX,
    LOCAL_PARTICIPANT: () => LOCAL_PARTICIPANT,
    LOCAL_TIMEOUT_MS: () => LOCAL_TIMEOUT_MS,
    LOG_DIR: () => LOG_DIR,
    LOG_EXT: () => LOG_EXT,
    LiveStore: () => LiveStore,
    LocalHub: () => LocalHub,
    MAGNET_SCREEN_PX: () => MAGNET_SCREEN_PX,
    MAGNET_SIZE_FRACTION: () => MAGNET_SIZE_FRACTION,
    MANIFEST_PATH: () => MANIFEST_PATH,
    MATCH_FLOOR: () => MATCH_FLOOR,
    MAX_DRAWN: () => MAX_DRAWN,
    MAX_READINGS: () => MAX_READINGS,
    MAX_TIER0_CONFIDENCE: () => MAX_TIER0_CONFIDENCE,
    META_DIR: () => META_DIR,
    MIN_CONFIDENCE: () => MIN_CONFIDENCE,
    MemoryStore: () => MemoryStore,
    NO_MATCH: () => NO_MATCH,
    PAPERS: () => PAPERS,
    PHRASES: () => PHRASES,
    PRESETS: () => PRESETS,
    RIGHT_ANGLE_TOLERANCE: () => RIGHT_ANGLE_TOLERANCE,
    ROLES: () => ROLES,
    ReadOnlyError: () => ReadOnlyError,
    SETTLED_CONFIDENCE: () => SETTLED_CONFIDENCE,
    SKIP_DIRS: () => SKIP_DIRS,
    SNAPPABLE: () => SNAPPABLE,
    SNAP_CONFIDENCE: () => SNAP_CONFIDENCE,
    SNAP_MARGIN: () => SNAP_MARGIN,
    SYMMETRIC_LINKS: () => SYMMETRIC_LINKS,
    StaticStore: () => StaticStore,
    TARGETED: () => TARGETED,
    TIER0_PARTICIPANT: () => TIER0_PARTICIPANT,
    TIER1_LIBRARY: () => TIER1_LIBRARY,
    TO_SCALE_WITHIN: () => TO_SCALE_WITHIN,
    VERBS: () => VERBS,
    WORD_GAP_RATIO: () => WORD_GAP_RATIO,
    WORD_WINDOW_MS: () => WORD_WINDOW_MS,
    aboutIdsOf: () => aboutIdsOf,
    activeBindingsOf: () => activeBindingsOf,
    addExample: () => addExample,
    addressablesOf: () => addressablesOf,
    alongSegment: () => alongSegment,
    analyzeCornerAngles: () => analyzeCornerAngles,
    analyzeStroke: () => analyzeStroke,
    angleClass: () => angleClass,
    applyWalls: () => applyWalls,
    arithmetic: () => arithmetic,
    assignRoles: () => assignRoles,
    attachNumber: () => attachNumber,
    attachedNumberIds: () => attachedNumberIds,
    authorOf: () => authorOf,
    behaviourSource: () => behaviourSource,
    behavioursOf: () => behavioursOf,
    between: () => between,
    binarize: () => binarize,
    bindingsOf: () => bindingsOf,
    blessedBehaviourOf: () => blessedBehaviourOf,
    boundRepsOf: () => boundRepsOf,
    boundToMark: () => boundToMark,
    boundingBoxDistance: () => boundingBoxDistance,
    boundsContain: () => boundsContain,
    boundsOf: () => boundsOf,
    boundsOverlap: () => boundsOverlap,
    buildGraph3D: () => buildGraph3D,
    buildGraphScaffold: () => buildGraphScaffold,
    buildScaffold: () => buildScaffold,
    buildStructure: () => buildStructure,
    bySource: () => bySource,
    byTier: () => byTier,
    calculateDistance: () => calculateDistance,
    calculateStraightness: () => calculateStraightness,
    canonicalCheckSamples: () => canonicalCheckSamples,
    checkOvershoot: () => checkOvershoot,
    checkWritten: () => checkWritten,
    choice: () => choice,
    clausesOf: () => clausesOf,
    cleanOf: () => cleanOf,
    cleanPointsOf: () => cleanPointsOf,
    clusters: () => clusters,
    collidesWith: () => collidesWith,
    commandMarkFeatures: () => commandMarkFeatures,
    compareQuantities: () => compareQuantities,
    compareSignatures: () => compareSignatures,
    complete: () => complete,
    connectionsFor: () => connectionsFor,
    connectionsOf: () => connectionsOf,
    controlOf: () => controlOf,
    convertQuantity: () => convertQuantity,
    convexHull: () => convexHull,
    countCorners: () => countCorners,
    countCrossings: () => countCrossings,
    createAgentParticipant: () => createAgentParticipant,
    createBootstrapNodes: () => createBootstrapNodes,
    createBridgeParticipant: () => createBridgeParticipant,
    createDecideParticipant: () => createDecideParticipant,
    createExplanationNode: () => createExplanationNode,
    createParticipantNode: () => createParticipantNode,
    createSession: () => createSession,
    createStubDecideTransport: () => createStubDecideTransport,
    decodeLog: () => decodeLog,
    denoise: () => denoise,
    dependentsOf: () => dependentsOf,
    describeAddressed: () => describeAddressed,
    describeAuthorshipCollision: () => describeAuthorshipCollision,
    describeBehaviour: () => describeBehaviour,
    describeBinding: () => describeBinding,
    describeDimensions: () => describeDimensions,
    describeExpr: () => describeExpr,
    describeFrame: () => describeFrame,
    describeGraph: () => describeGraph,
    describeLayout: () => describeLayout,
    describeMagnet: () => describeMagnet,
    describeMaths: () => describeMaths,
    describeReading: () => describeReading,
    describeRegions: () => describeRegions,
    describeRelations: () => describeRelations,
    describeRoles: () => describeRoles,
    describeRoute: () => describeRoute,
    describeSession: () => describeSession,
    describeSheet: () => describeSheet,
    describeSignature: () => describeSignature,
    describeSnap: () => describeSnap,
    describeSolution: () => describeSolution,
    describeStale: () => describeStale,
    describeStructure: () => describeStructure,
    describeTier1: () => describeTier1,
    diffSheets: () => diffSheets,
    dimensionsOf: () => dimensionsOf,
    disagreement: () => disagreement,
    elementsOf: () => elementsOf,
    enclosedBy: () => enclosedBy,
    encodeLog: () => encodeLog,
    evaluateChain: () => evaluateChain,
    evaluateExpr: () => evaluateExpr,
    explanationOf: () => explanationOf,
    exportFrame: () => exportFrame,
    figureOfMark: () => figureOfMark,
    findCorners: () => findCorners,
    findCornersWithSeparation: () => findCornersWithSeparation,
    fingerprintOf: () => fingerprintOf,
    fit: () => fit2,
    force: () => force,
    formatExpr: () => formatExpr,
    formatNumber: () => formatNumber,
    formatQuantity: () => formatQuantity,
    frameOf: () => frameOf,
    frameOfNode: () => frameOfNode,
    functionsOf: () => functionsOf,
    genreOf: () => genreOf,
    getBounds: () => getBounds,
    getBoundsFromStroke: () => getBoundsFromStroke,
    getFingerprint: () => getFingerprint,
    getRep: () => getRep,
    handLabel: () => handLabel,
    has: () => has,
    hasMultipleSources: () => hasMultipleSources,
    headingsOf: () => headingsOf,
    holds: () => holds,
    idealize: () => idealize,
    inkMeasure: () => inkMeasure,
    insideFigure: () => insideFigure,
    instantFor: () => instantFor,
    intents: () => intents,
    interfacesOf: () => interfacesOf,
    interpretationsOf: () => interpretationsOf,
    isBare: () => isBare,
    isCanvasFile: () => isCanvasFile,
    isCheckLike: () => isCheckLike,
    isExplanation: () => isExplanation,
    isFlat: () => isFlat,
    isFrame: () => isFrame,
    isGesture: () => isGesture,
    isLassoLike: () => isLassoLike,
    isLetterLike: () => isLetterLike,
    isParticipant: () => isParticipant,
    isRange: () => isRange,
    isStrokeClosed: () => isStrokeClosed,
    isWord: () => isWord,
    joinsRun: () => joinsRun,
    keysOf: () => keysOf2,
    kindOf: () => kindOf,
    labelOf: () => labelOf,
    labelsOf: () => labelsOf,
    leadOf: () => leadOf,
    learnCommandMark: () => learnCommandMark,
    lettersOf: () => lettersOf,
    levelOf: () => levelOf,
    listModels: () => listModels,
    localityOf: () => localityOf,
    logPathFor: () => logPathFor,
    luminance: () => luminance,
    magnetRadius: () => magnetRadius,
    magnetSites: () => magnetSites,
    magnetsNear: () => magnetsNear,
    matchBrace: () => matchBrace,
    matchConcepts: () => matchConcepts,
    matchDefinition: () => matchDefinition,
    matchPrimitiveFromLibrary: () => matchPrimitiveFromLibrary,
    matchesCommandMark: () => matchesCommandMark,
    measure: () => measure,
    mergeLogs: () => mergeLogs,
    nearestMagnet: () => nearestMagnet,
    negateQuantity: () => negateQuantity,
    nodeIdsIn: () => nodeIdsIn,
    normName: () => normName,
    normalizeStroke: () => normalizeStroke,
    noul: () => noul,
    numbersOf: () => numbersOf,
    otsu: () => otsu,
    outlineOf: () => outlineOf,
    paramsOf: () => paramsOf,
    parseBehaviour: () => parseBehaviour,
    parseBehaviourReply: () => parseBehaviourReply,
    parseChain: () => parseChain,
    parseClause: () => parseClause,
    parseCode: () => parseCode,
    parseExpression: () => parseExpression,
    parseFill: () => parseFill,
    parseGitSpec: () => parseGitSpec,
    parseGraph: () => parseGraph,
    parseLayout: () => parseLayout,
    parseLine: () => parseLine,
    parseProgram: () => parseProgram,
    parseQuantity: () => parseQuantity,
    parseReadings: () => parseReadings,
    parseShapes: () => parseShapes,
    parseTranscripts: () => parseTranscripts,
    participantOfLog: () => participantOfLog,
    placed: () => placed,
    planFor: () => planFor,
    polygonFigure: () => polygonFigure,
    prepare: () => prepare,
    printTiled: () => printTiled,
    providerLabel: () => providerLabel,
    providerLocality: () => providerLocality,
    providerTier: () => providerTier,
    quantity: () => quantity,
    rangeOf: () => rangeOf,
    ranked: () => ranked,
    readNumber: () => readNumber,
    readSheet: () => readSheet,
    readingsToEdges: () => readingsToEdges,
    reasonOf: () => reasonOf,
    regionAt: () => regionAt,
    regionIdsIn: () => regionIdsIn,
    regionsOf: () => regionsOf,
    regionsOverlapping: () => regionsOverlapping,
    relate: () => relate,
    relationsOf: () => relationsOf,
    resampleByArcLength: () => resampleByArcLength,
    resemblances: () => resemblances,
    resolveFrame: () => resolveFrame,
    resolvesLasso: () => resolvesLasso,
    route: () => route,
    rowOf: () => rowOf,
    runsOf: () => runsOf,
    sameExpr: () => sameExpr,
    scopeOf: () => scopeOf,
    score: () => score,
    scratchedOut: () => scratchedOut,
    seeded: () => seeded,
    segmentsIntersect: () => segmentsIntersect,
    shapeExtent: () => shapeExtent,
    sheetEntry: () => sheetEntry,
    sheetLines: () => sheetLines,
    sheetValue: () => sheetValue,
    simplifyStroke: () => simplifyStroke,
    singular: () => singular,
    sittingName: () => sittingName,
    sittingToken: () => sittingToken,
    sizeOf: () => sizeOf2,
    sliderOf: () => sliderOf,
    slotsIn: () => slotsIn,
    smoothStroke: () => smoothStroke,
    snapReading: () => snapReading,
    solveBoard: () => solveBoard,
    solveFigure: () => solveFigure,
    sourcesOf: () => sourcesOf,
    steer: () => steer,
    step: () => step,
    stripThink: () => stripThink,
    strokeFor: () => strokeFor,
    strokePointsOf: () => strokePointsOf,
    strokesIntersect: () => strokesIntersect,
    structuralSignature: () => structuralSignature,
    textOf: () => textOf3,
    thin: () => thin,
    toBytes: () => toBytes,
    toText: () => toText,
    topInterpretation: () => topInterpretation,
    trace: () => trace,
    tracePaths: () => tracePaths,
    transcriptOf: () => transcriptOf,
    transcriptsOf: () => transcriptsOf,
    trueSize: () => trueSize,
    typeNodeId: () => typeNodeId,
    validateRegions: () => validateRegions,
    wallBoxes: () => wallBoxes,
    whyNotResolved: () => whyNotResolved,
    withParams: () => withParams,
    wordConfidence: () => wordConfidence,
    wordOf: () => wordOf,
    worldOf: () => worldOf
  });

  // src/geometry.ts
  function getBounds(points) {
    if (points.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    points.forEach((point2) => {
      minX = Math.min(minX, point2.x);
      maxX = Math.max(maxX, point2.x);
      minY = Math.min(minY, point2.y);
      maxY = Math.max(maxY, point2.y);
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
  function calculateDistance(p1, p22) {
    return Math.sqrt(Math.pow(p22.x - p1.x, 2) + Math.pow(p22.y - p1.y, 2));
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
    let pathLength2 = 0;
    for (let i = 1; i < path.length; i++) {
      pathLength2 += calculateDistance(path[i - 1], path[i]);
    }
    if (pathLength2 === 0) return 0;
    return Math.min(1, directDistance / pathLength2);
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
  function ccw(p1, p22, p3) {
    return (p22.x - p1.x) * (p3.y - p1.y) - (p22.y - p1.y) * (p3.x - p1.x);
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
    const turn2 = new Array(path.length).fill(0);
    for (let i = 0; i < path.length; i++) {
      if (!isClosed2 && (i < arm || i >= path.length - arm)) continue;
      const a = at(i - arm), b = at(i), c = at(i + arm);
      const bx = b.x - a.x, by = b.y - a.y;
      const cx2 = c.x - b.x, cy2 = c.y - b.y;
      const magB = Math.hypot(bx, by), magC = Math.hypot(cx2, cy2);
      if (magB === 0 || magC === 0) continue;
      const cos = (bx * cx2 + by * cy2) / (magB * magC);
      turn2[i] = Math.acos(Math.max(-1, Math.min(1, cos)));
    }
    const taken = [];
    const used = new Array(path.length).fill(false);
    for (; ; ) {
      let best = -1, bestAngle = opts.threshold;
      for (let i = 0; i < path.length; i++) {
        if (!used[i] && turn2[i] > bestAngle) {
          bestAngle = turn2[i];
          best = i;
        }
      }
      if (best < 0) break;
      taken.push({ index: best, angle: turn2[best] });
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
        const p22 = smoothed[i + 1];
        const q = {
          x: 0.75 * p1.x + 0.25 * p22.x,
          y: 0.75 * p1.y + 0.25 * p22.y
        };
        const r = {
          x: 0.25 * p1.x + 0.75 * p22.x,
          y: 0.25 * p1.y + 0.75 * p22.y
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
    function perpendicularDistance(point2, lineStart, lineEnd) {
      const dx = lineEnd.x - lineStart.x;
      const dy = lineEnd.y - lineStart.y;
      if (dx === 0 && dy === 0) {
        return calculateDistance(point2, lineStart);
      }
      const t = ((point2.x - lineStart.x) * dx + (point2.y - lineStart.y) * dy) / (dx * dx + dy * dy);
      const clampedT = Math.max(0, Math.min(1, t));
      const projection = {
        x: lineStart.x + clampedT * dx,
        y: lineStart.y + clampedT * dy
      };
      return calculateDistance(point2, projection);
    }
    function douglasPeucker(pts, tol) {
      if (pts.length < 3) return pts;
      let maxDist = 0;
      let maxIndex = 0;
      const start = pts[0];
      const end = pts[pts.length - 1];
      for (let i = 1; i < pts.length - 1; i++) {
        const dist3 = perpendicularDistance(pts[i], start, end);
        if (dist3 > maxDist) {
          maxDist = dist3;
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
    const turn2 = fp.cornerAngles?.length ? fit(meanTurn(fp), 120 * DEG, 70 * DEG) : 0.5;
    const confidence = area2 * 0.5 + corners * 0.35 + turn2 * 0.15;
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
    const turn2 = fp.cornerAngles?.length ? fit(meanTurn(fp), 90 * DEG, 55 * DEG) : 0.5;
    const confidence = area2 * 0.45 + corners * 0.35 + turn2 * 0.2;
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
      const barbOk = ramp(sharpest, 95 * Math.PI / 180, 140 * Math.PI / 180);
      const headLen = head === "end" ? 1 - first : first;
      if (headLen < 0.06) return null;
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
  var ENGINE_PARTICIPANT = TIER0_PARTICIPANT;
  var ENGINE_NAME = "engine";
  function localityOf(node) {
    const rep = node.reps.find((r) => r.modality === "participant");
    const l = rep?.data?.locality;
    return l === "local" || l === "hosted" ? l : null;
  }
  function authorOf(node) {
    const e = node.edges.find((x) => x.rel === "made-by");
    return e ? e.to : LOCAL_PARTICIPANT;
  }
  function createParticipantNode(id, kind, name, at, capability = 0, locality) {
    return {
      id,
      reps: [
        { modality: "participant", data: locality ? { kind, locality } : { kind } },
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
      createParticipantNode(TIER0_PARTICIPANT, "engine", ENGINE_NAME, at)
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
  function labelsOf(node) {
    return node.reps.filter((r) => r.modality === "label").map((r) => {
      const d = r.data;
      return {
        text: typeof d?.text === "string" ? d.text : "",
        source: r.source,
        at: typeof d?.at === "number" ? d.at : node.createdAt
      };
    });
  }
  function labelOf(node) {
    const all = labelsOf(node);
    const last = all[all.length - 1];
    return last && last.text.length > 0 ? last : void 0;
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
    const moved2 = getRep(node, "transform")?.data;
    if (moved2) return moved2;
    const fp = fingerprintOf(node);
    if (fp) return fp.bounds;
    return getRep(node, "bounds")?.data;
  }
  function blessedBehaviourOf(node) {
    for (let i = node.reps.length - 1; i >= 0; i--) {
      const r = node.reps[i];
      if (r.modality === "behaviour" && r.data.blessed) return r.data;
    }
    return void 0;
  }
  function behavioursOf(node) {
    return node.reps.filter((r) => r.modality === "behaviour").reverse();
  }
  function isFrame(node) {
    return getRep(node, "frame") !== void 0;
  }
  function frameOfNode(node) {
    return getRep(node, "frame")?.data;
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
        blessed: true,
        basis: "name"
      });
    }
    const label = labelOf(node);
    if (label) {
      const source = label.source ?? LOCAL_PARTICIPANT;
      out.push({
        label: label.text,
        to: node.id,
        source,
        sourceName: participantName(source, nodes),
        tier: participantTier(source, nodes),
        weight: 1,
        reasoning: "labelled by the hand that made this mark",
        blessed: false,
        basis: "label"
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
        blessed: e.blessed === true,
        basis: "resemblance"
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
        let mid4 = raw[Math.floor(raw.length / 2)], best = -1;
        for (const p of raw) {
          const d = Math.abs(sideOf(a, c, p));
          if (d > best) {
            best = d;
            mid4 = p;
          }
        }
        const cc = circumcircle(a, mid4, c);
        if (!cc) return { shape: "line", closed: false, points: [a, c], reasoning: "too flat to bow; drawn straight" };
        const a0 = Math.atan2(a.y - cc.cy, a.x - cc.cx);
        const a1 = Math.atan2(c.y - cc.cy, c.x - cc.cx);
        const am = Math.atan2(mid4.y - cc.cy, mid4.x - cc.cx);
        let sweep = a1 - a0;
        const norm2 = (x) => (x % TAU + TAU) % TAU;
        const viaCcw = norm2(am - a0) < norm2(a1 - a0);
        sweep = viaCcw ? norm2(a1 - a0) : -norm2(a0 - a1);
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
  var RIGHT_ANGLE_TOLERANCE = 4;
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
  function angleClass(degrees) {
    if (Math.abs(degrees - 90) < RIGHT_ANGLE_TOLERANCE) return "right";
    return degrees < 90 ? "acute" : "obtuse";
  }
  function measure(node, nodes, board) {
    const plain = measureInk(node, nodes);
    return plain && board ? inUnits(plain, node.id, board) : plain;
  }
  function inUnits(plain, id, board) {
    const fm = board.figures.find((f) => f.figure.ids.includes(id) && f.labels.some((l) => !l.declared));
    if (!fm) return plain;
    const sol = fm.solution;
    const [top, ...rest] = sol.readings;
    return {
      ...plain,
      unit: sol.unit,
      values: top?.values ?? [],
      conflicts: sol.conflicts,
      readings: rest.map((r) => r.sentence),
      ...top?.assumes ? { assumes: top.assumes } : {},
      checks: sol.checks,
      ink: sol.ink,
      ...fm.drawing?.scale ? { scale: fm.drawing.scale.reason } : {},
      notes: sol.notes
    };
  }
  function measureInk(node, nodes) {
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
        angles.forEach((a, i) => m.push({ key: `angle${i}`, label: `angle ${"ABC"[i]} (${angleClass(a)})`, value: r0(a), unit: "\xB0", at: v[i] }));
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
    const ink = maths.measures.filter((x) => x.key !== "centreY").map((x) => {
      if (x.key === "centre" && x.at) return `${x.label} (${r0(x.at.x)}, ${r0(x.at.y)})`;
      const v = Number.isFinite(x.value) ? x.value.toLocaleString("en-US") : "\u221E";
      return `${x.label} ${v}${x.unit}`;
    }).join(" \xB7 ");
    if (!maths.values) return ink;
    const said = [];
    for (const a of maths.assumes ?? []) said.push(a);
    for (const v of maths.values) if (v.from === "derived") said.push(`${v.label} ${v.text}${v.formula ? ` = ${v.formula}` : ""}`);
    for (const c of maths.conflicts ?? []) said.push(c.reason);
    for (const r of maths.readings ?? []) said.push(`or ${r}`);
    said.push(...maths.checks ?? []);
    for (const v of maths.ink ?? []) said.push(`${v.label} ${v.text} (the ink\u2019s)`);
    if (maths.scale) said.push(maths.scale);
    said.push(...maths.notes ?? []);
    return [...said, ink].filter(Boolean).join(" \xB7 ");
  }

  // src/maths/quantity.ts
  var LENGTH_UNITS = ["in", "ft", "cm", "mm", "m"];
  var MM_PER = { in: 25.4, ft: 304.8, cm: 10, mm: 1, m: 1e3 };
  var UNIT_WORD = {
    in: ["inch", "inches"],
    ft: ["foot", "feet"],
    cm: ["centimetre", "centimetres"],
    mm: ["millimetre", "millimetres"],
    m: ["metre", "metres"]
  };
  function quantity(value, unit2 = null, opts = {}) {
    const q = { lo: value, hi: value, unit: unit2, dim: opts.dim ?? (unit2 ? 1 : 0), approx: !!opts.approx };
    if (opts.precision !== void 0) q.precision = opts.precision;
    return q;
  }
  function rangeOf(lo, hi, unit2 = null, opts = {}) {
    const q = quantity(Math.min(lo, hi), unit2, opts);
    q.hi = Math.max(lo, hi);
    return q;
  }
  function tolFor(...values) {
    return 1e-6 * Math.max(1, ...values.map((v) => Math.abs(v)));
  }
  function isRange(q) {
    return q.hi - q.lo > tolFor(q.lo, q.hi);
  }
  function holds(q, v) {
    const t = tolFor(q.lo, q.hi, v);
    return v >= q.lo - t && v <= q.hi + t;
  }
  function isBare(q) {
    return q.unit === null && q.dim === 0;
  }
  function formatNumber(v, digits = 2) {
    if (!Number.isFinite(v)) return Number.isNaN(v) ? "?" : v > 0 ? "\u221E" : "\u2212\u221E";
    const f = 10 ** digits;
    const r = Math.round(v * f) / f;
    if (r === 0) return "0";
    const s = digits > 0 ? r.toFixed(digits).replace(/\.?0+$/, "") : r.toFixed(0);
    return s.startsWith("-") ? "\u2212" + s.slice(1) : s;
  }
  function unitSuffix(unit2, dim, words = false) {
    if (!unit2 || dim === 0) return "";
    if (dim === 1) {
      if (!words && unit2 === "in") return "\u2033";
      if (!words && unit2 === "ft") return "\u2032";
      return " " + unit2;
    }
    const sup = { 2: "\xB2", 3: "\xB3" };
    if (dim > 0) return " " + unit2 + (sup[dim] ?? `^${dim}`);
    return " per " + unit2 + (dim < -1 ? sup[-dim] ?? `^${-dim}` : "");
  }
  var FRACTION_GLYPH = {
    "1/2": "\xBD",
    "1/3": "\u2153",
    "2/3": "\u2154",
    "1/4": "\xBC",
    "3/4": "\xBE",
    "1/5": "\u2155",
    "2/5": "\u2156",
    "3/5": "\u2157",
    "4/5": "\u2158",
    "1/6": "\u2159",
    "5/6": "\u215A",
    "1/8": "\u215B",
    "3/8": "\u215C",
    "5/8": "\u215D",
    "7/8": "\u215E"
  };
  var FRACTION_DENOMINATORS = [2, 3, 4, 8, 16, 32];
  var gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
  function asFraction(v, den) {
    const n2 = Math.round(v * den);
    if (Math.abs(v * den - n2) > 1e-6 || n2 % den === 0) return null;
    const whole = Math.trunc(Math.abs(n2) / den);
    const rem = Math.abs(n2) % den;
    const g = gcd(rem, den);
    const f = `${rem / g}/${den / g}`;
    const glyph = FRACTION_GLYPH[f];
    const sign = v < 0 ? "\u2212" : "";
    if (!whole) return sign + (glyph ?? f);
    return sign + String(whole) + (glyph ?? ` ${f}`);
  }
  function formatQuantity(q, opts = {}) {
    const written = q.precision && q.precision < 1 ? Math.round(1 / q.precision) : 0;
    const den = opts.fractions ?? (FRACTION_DENOMINATORS.includes(written) && Math.abs(1 / q.precision - written) < 1e-9 ? written : 0);
    const n2 = (v) => (den ? asFraction(v, den) : null) ?? formatNumber(v, opts.digits ?? 2);
    let body;
    if (!isRange(q)) body = n2(q.lo);
    else if (q.lo < 0 || q.hi < 0) body = `${n2(q.lo)} to ${n2(q.hi)}`;
    else body = `${n2(q.lo)}\u2013${n2(q.hi)}`;
    return (q.approx ? "~" : "") + body + unitSuffix(q.unit, q.dim, opts.words);
  }
  function unitName(unit2, plural) {
    return UNIT_WORD[unit2][plural ? 1 : 0];
  }
  var VULGAR = {
    "\xBD": [1, 2],
    "\u2153": [1, 3],
    "\u2154": [2, 3],
    "\xBC": [1, 4],
    "\xBE": [3, 4],
    "\u2155": [1, 5],
    "\u2156": [2, 5],
    "\u2157": [3, 5],
    "\u2158": [4, 5],
    "\u2159": [1, 6],
    "\u215A": [5, 6],
    "\u2150": [1, 7],
    "\u215B": [1, 8],
    "\u215C": [3, 8],
    "\u215D": [5, 8],
    "\u215E": [7, 8],
    "\u2151": [1, 9],
    "\u2152": [1, 10]
  };
  function isVulgar(c) {
    return c !== void 0 && c in VULGAR;
  }
  var isDigit = (c) => c !== void 0 && c >= "0" && c <= "9";
  var isLetter = (c) => c !== void 0 && /[A-Za-zÀ-ɏ]/.test(c);
  function scanNumber(s, i) {
    let j = i;
    let whole = "";
    while (isDigit(s[j])) whole += s[j++];
    let value;
    let precision = 1;
    if (s[j] === "." && isDigit(s[j + 1])) {
      let frac = "";
      j++;
      while (isDigit(s[j])) frac += s[j++];
      value = Number(`${whole || "0"}.${frac}`);
      precision = 10 ** -frac.length;
      return { value, precision, text: s.slice(i, j), end: j };
    }
    if (!whole) {
      if (!isVulgar(s[j])) return null;
      const [a, b] = VULGAR[s[j]];
      return { value: a / b, precision: 1 / b, text: s[j], end: j + 1 };
    }
    value = Number(whole);
    const k = s[j] === " " && isVulgar(s[j + 1]) ? j + 1 : j;
    if (isVulgar(s[k])) {
      const [a, b] = VULGAR[s[k]];
      return { value: value + a / b, precision: 1 / b, text: s.slice(i, k + 1), end: k + 1 };
    }
    const glued = /^[/⁄](\d+)/.exec(s.slice(j));
    if (glued && !isDigit(s[j + glued[0].length]) && s[j + glued[0].length] !== ".") {
      const den = Number(glued[1]);
      if (den > 0 && value < den) return { value: value / den, precision: 1 / den, text: s.slice(i, j + glued[0].length), end: j + glued[0].length };
    }
    const mixed = /^ (\d+)[/⁄](\d+)/.exec(s.slice(j));
    if (mixed) {
      const num2 = Number(mixed[1]), den = Number(mixed[2]);
      const after = s[j + mixed[0].length];
      if (den > 0 && num2 < den && !isDigit(after) && after !== ".") {
        return { value: value + num2 / den, precision: 1 / den, text: s.slice(i, j + mixed[0].length), end: j + mixed[0].length };
      }
    }
    return { value, precision, text: s.slice(i, j), end: j };
  }
  var INCH_MARKS = ["\u2033", '"', "\u201D", "\u201C", "\u3003"];
  var FOOT_MARKS = ["\u2032", "'", "\u2019", "\u2018"];
  var UNIT_WORDS = {
    in: "in",
    "in.": "in",
    inch: "in",
    inches: "in",
    ft: "ft",
    "ft.": "ft",
    foot: "ft",
    feet: "ft",
    cm: "cm",
    centimetre: "cm",
    centimetres: "cm",
    centimeter: "cm",
    centimeters: "cm",
    mm: "mm",
    millimetre: "mm",
    millimetres: "mm",
    millimeter: "mm",
    millimeters: "mm",
    m: "m",
    metre: "m",
    metres: "m",
    meter: "m",
    meters: "m"
  };
  function scanUnit(s, i) {
    if (s[i] === "'" && s[i + 1] === "'") return { unit: "in", text: "''", end: i + 2 };
    if (INCH_MARKS.includes(s[i])) return { unit: "in", text: s[i], end: i + 1 };
    if (FOOT_MARKS.includes(s[i]) && !isLetter(s[i + 1])) return { unit: "ft", text: s[i], end: i + 1 };
    const k = s[i] === " " ? i + 1 : i;
    const m = /^[A-Za-z]+\.?/.exec(s.slice(k));
    if (!m) return null;
    let word = m[0];
    let unit2 = UNIT_WORDS[word.toLowerCase()];
    if (!unit2 && word.endsWith(".")) {
      word = word.slice(0, -1);
      unit2 = UNIT_WORDS[word.toLowerCase()];
    }
    if (!unit2) return null;
    return { unit: unit2, text: s.slice(i, k + word.length), end: k + word.length };
  }
  function scanMeasure(s, i) {
    const n2 = scanNumber(s, i);
    if (!n2) return null;
    const u = scanUnit(s, n2.end);
    if (!u) return { value: n2.value, precision: n2.precision, unit: null, text: n2.text, end: n2.end };
    if (u.unit === "ft") {
      const k = s[u.end] === " " ? u.end + 1 : u.end;
      const n22 = isDigit(s[k]) || isVulgar(s[k]) ? scanNumber(s, k) : null;
      const u2 = n22 ? scanUnit(s, n22.end) : null;
      if (n22 && u2 && u2.unit === "in") {
        return { value: n2.value * 12 + n22.value, precision: n22.precision, unit: "in", text: s.slice(i, u2.end), end: u2.end };
      }
    }
    return { value: n2.value, precision: n2.precision, unit: u.unit, text: s.slice(i, u.end), end: u.end };
  }
  var DASH_CHARS = "-\u2013\u2014\u2212\u2010\u2011\u2012";
  function parseQuantity(text) {
    const s = text.replace(/[  -   　]/g, " ").trim();
    let i = 0;
    let approx = false;
    const approxWord = /^(~|≈|about\s+|approx\.?\s*|c\.\s*|ca\.\s*)/i.exec(s);
    if (approxWord) {
      approx = true;
      i = approxWord[0].length;
    }
    let sign = 1;
    if (DASH_CHARS.includes(s[i]) && (isDigit(s[i + 1]) || s[i + 1] === "." || isVulgar(s[i + 1]))) {
      sign = -1;
      i++;
    }
    const a = scanMeasure(s, i);
    if (!a) return null;
    i = a.end;
    let lo = sign * a.value;
    let hi = lo;
    let unit2 = a.unit;
    let precision = a.precision;
    let isRangeWritten = false;
    const note = [];
    const rest = /^\s*(?:[-–—−‐‑‒]|to\s)\s*/.exec(s.slice(i));
    if (rest) {
      const b = scanMeasure(s, i + rest[0].length);
      if (!b) return null;
      if (b.value <= lo) return null;
      const bv = b.value;
      if (unit2 && b.unit && unit2 !== b.unit) {
        const c = convertQuantity(quantity(lo, unit2), b.unit);
        note.push(c.note ?? "");
        lo = c.quantity.lo;
        if (bv <= lo) return null;
      }
      unit2 = b.unit ?? unit2;
      hi = bv;
      precision = Math.min(precision, b.precision);
      isRangeWritten = true;
      i = b.end;
    }
    if (s.slice(i).trim().length > 0) return null;
    const q = rangeOf(lo, hi, unit2, { approx, precision });
    const unitWords = unit2 ? ` ${unitName(unit2, true)}` : "";
    let reason;
    if (isRangeWritten) reason = `a range, from ${formatNumber(lo)} to ${formatNumber(hi)}${unitWords}`;
    else reason = unit2 ? `${formatNumber(lo)} ${unitName(unit2, lo !== 1)}` : `the number ${formatNumber(lo)}, no unit written`;
    if (approx) reason = `approximate: ${reason}`;
    if (a.text.includes("/") || a.text.includes("\u2044") || Object.keys(VULGAR).some((v) => a.text.includes(v))) reason += `, written as a fraction`;
    if (note.length) reason += ` (${note.filter(Boolean).join("; ")})`;
    return { quantity: q, text: s, reason };
  }
  function convertQuantity(q, unit2) {
    if (!q.unit || q.dim === 0 || q.unit === unit2) return { quantity: q };
    const f = (MM_PER[q.unit] / MM_PER[unit2]) ** q.dim;
    const out = { ...q, lo: q.lo * f, hi: q.hi * f, unit: unit2 };
    delete out.precision;
    return { quantity: out, note: `${formatQuantity(q)} is ${formatQuantity(out)}` };
  }
  var dimName = (q) => q.dim === 0 ? "a number" : q.dim === 1 ? "a length" : q.dim === 2 ? "an area" : `a quantity of dimension ${q.dim}`;
  function computed(lo, hi, unit2, dim, approx) {
    return { lo: Math.min(lo, hi), hi: Math.max(lo, hi), unit: dim === 0 ? null : unit2, dim, approx };
  }
  function negateQuantity(q) {
    const out = { ...q, lo: -q.hi, hi: -q.lo };
    delete out.precision;
    return out;
  }
  function arithmetic(op, a, b) {
    const notes = [];
    const approx = a.approx || b.approx;
    if (op === "+" || op === "-") {
      let x = a, y2 = b;
      if (isBare(x) && y2.dim !== 0) x = { ...x, unit: y2.unit, dim: y2.dim };
      if (isBare(y2) && x.dim !== 0) y2 = { ...y2, unit: x.unit, dim: x.dim };
      if (x.dim !== y2.dim) return { quantity: null, notes, error: `cannot ${op === "+" ? "add" : "subtract"} ${dimName(y2)} ${op === "+" ? "to" : "from"} ${dimName(x)}` };
      if (x.unit && y2.unit && x.unit !== y2.unit) {
        const c = convertQuantity(y2, x.unit);
        if (c.note) notes.push(c.note);
        y2 = c.quantity;
      }
      const unit3 = x.unit ?? y2.unit;
      if (op === "+") return { quantity: computed(x.lo + y2.lo, x.hi + y2.hi, unit3, x.dim, approx), notes };
      return { quantity: computed(x.lo - y2.hi, x.hi - y2.lo, unit3, x.dim, approx), notes };
    }
    let y = b;
    if (a.unit && y.unit && a.unit !== y.unit && y.dim !== 0) {
      const c = convertQuantity(y, a.unit);
      if (c.note) notes.push(c.note);
      y = c.quantity;
    }
    const unit2 = a.unit ?? y.unit;
    if (op === "*") {
      const p3 = [a.lo * y.lo, a.lo * y.hi, a.hi * y.lo, a.hi * y.hi];
      return { quantity: computed(Math.min(...p3), Math.max(...p3), unit2, a.dim + y.dim, approx), notes };
    }
    if (y.lo <= 0 && y.hi >= 0) {
      const error = isRange(y) ? `cannot divide by ${formatQuantity(y)}: it holds zero` : "cannot divide by zero";
      return { quantity: null, notes, error };
    }
    const p = [a.lo / y.lo, a.lo / y.hi, a.hi / y.lo, a.hi / y.hi];
    return { quantity: computed(Math.min(...p), Math.max(...p), unit2, a.dim - y.dim, approx), notes };
  }
  function compareQuantities(computedQ, written) {
    const w2 = formatQuantity(written);
    if (!computedQ) return { status: "unknown", written, computed: null, reason: `nothing to check ${w2} against` };
    let c = computedQ;
    let note;
    if (written.unit && c.unit && written.unit !== c.unit && written.dim === c.dim) {
      const conv = convertQuantity(c, written.unit);
      c = conv.quantity;
      note = conv.note;
    }
    const shown = isBare(written) && c.unit ? { ...written, unit: c.unit, dim: c.dim } : written;
    const ws = formatQuantity(shown);
    const cs = formatQuantity(c);
    const base = { written, computed: computedQ, ...note ? { note } : {} };
    if (written.unit && c.unit && written.dim !== c.dim) {
      return { ...base, status: "off", reason: `written ${ws} is ${dimName(written)}, computed ${cs} is ${dimName(c)}` };
    }
    const t = tolFor(c.lo, c.hi, written.lo, written.hi);
    const wRange = isRange(written), cRange = isRange(c);
    const off = (d) => ({
      ...base,
      status: "off",
      difference: d,
      reason: `written ${ws}, computed ${cs}: ${formatNumber(Math.abs(d))}${unitSuffix(c.unit ?? written.unit, c.unit ? c.dim : written.dim)} ${d > 0 ? "more" : "less"} than computed`
    });
    if (!wRange && !cRange) {
      const d = written.lo - c.lo;
      if (Math.abs(d) <= t) return { ...base, status: "ok", difference: 0, reason: `\u2713 ${cs}` };
      const p = written.precision ?? 0;
      const slack = written.approx ? Math.max(p, 1) : p / 2;
      if (p > 0 && Math.abs(d) <= slack + t) return { ...base, status: "rounded", difference: d, reason: `\u2248 ${cs}, written ${ws}` };
      return off(d);
    }
    if (!wRange && cRange) {
      if (holds(c, written.lo)) return { ...base, status: "within", difference: 0, reason: `${ws} chosen from ${cs}` };
      return off(written.lo < c.lo ? written.lo - c.lo : written.lo - c.hi);
    }
    if (wRange && !cRange) {
      if (holds(written, c.lo)) return { ...base, status: "within", difference: 0, reason: `${cs} is within the written ${ws}` };
      return off(c.lo < written.lo ? written.lo - c.lo : written.hi - c.lo);
    }
    if (Math.abs(written.lo - c.lo) <= t && Math.abs(written.hi - c.hi) <= t) return { ...base, status: "ok", difference: 0, reason: `\u2713 ${cs}` };
    if (written.lo <= c.hi + t && c.lo <= written.hi + t) return { ...base, status: "within", difference: 0, reason: `${ws} overlaps ${cs}` };
    return off(written.lo > c.hi ? written.lo - c.hi : written.hi - c.lo);
  }

  // src/maths/expr.ts
  var GLYPH = { "+": "+", "-": "\u2212", "*": "\xD7", "/": "\xF7" };
  function normName(s) {
    return s.trim().replace(/[-‐]/g, " ").replace(/\s+/g, " ").toLowerCase();
  }
  var SPACES = /[  -   　]/g;
  var DASHES = "-\u2013\u2014\u2212\u2010\u2011\u2012";
  var TIMES = "\xD7*\xB7\u22C5\u2715\u2716";
  var DIVIDES = "\xF7/\u2044";
  var LETTER = /[A-Za-zÀ-ɏ]/;
  var CIRCLED = (() => {
    const m = {};
    for (let n2 = 1; n2 <= 20; n2++) m[String.fromCharCode(9312 + n2 - 1)] = n2;
    for (let n2 = 1; n2 <= 10; n2++) m[String.fromCharCode(10102 + n2 - 1)] = n2;
    for (let n2 = 1; n2 <= 10; n2++) m[String.fromCharCode(10112 + n2 - 1)] = n2;
    for (let n2 = 1; n2 <= 10; n2++) m[String.fromCharCode(9461 + n2 - 1)] = n2;
    return m;
  })();
  var isDigit2 = (c) => c !== void 0 && c >= "0" && c <= "9";
  function operandEnd(t) {
    return !!t && (t.t === "num" || t.t === "word" || t.t === "name" || t.t === "ref" || t.t === "rp");
  }
  function operandStart(t) {
    return !!t && (t.t === "num" || t.t === "word" || t.t === "name" || t.t === "ref" || t.t === "lp");
  }
  function scan(s) {
    const out = [];
    let i = 0;
    let space = 0;
    let approxNext = false;
    const sp = () => {
      const v = space;
      space = 0;
      return v;
    };
    while (i < s.length) {
      const c = s[i];
      if (c === " " || c === "," || c === ";") {
        space += 1;
        i++;
        continue;
      }
      if (c === "	" || c === "\n" || c === "\r") {
        space += 4;
        i++;
        continue;
      }
      if (isDigit2(c) || c === "." && isDigit2(s[i + 1]) || isVulgar(c)) {
        const m = scanMeasure(s, i);
        if (m) {
          const q = quantity(m.value, m.unit, { approx: approxNext, precision: m.precision });
          out.push({ t: "num", q, text: s.slice(i, m.end), at: i, end: m.end, space: sp() });
          approxNext = false;
          i = m.end;
          continue;
        }
      }
      if (c in CIRCLED) {
        out.push({ t: "ref", step: CIRCLED[c], text: c, bare: false, at: i, end: i + 1, space: sp() });
        i++;
        continue;
      }
      if (c === "(") {
        const m = /^\(\s*(\d{1,2})\s*\)/.exec(s.slice(i));
        if (m) {
          out.push({ t: "ref", step: Number(m[1]), text: m[0], bare: true, at: i, end: i + m[0].length, space: sp() });
          i += m[0].length;
          continue;
        }
        out.push({ t: "lp", at: i, end: i + 1, space: sp() });
        i++;
        continue;
      }
      if (c === ")") {
        out.push({ t: "rp", at: i, end: i + 1, space: sp() });
        i++;
        continue;
      }
      if (c === "+" || c === "\uFF0B") {
        out.push({ t: "op", op: "+", glyph: c, at: i, end: i + 1, space: sp() });
        i++;
        continue;
      }
      if (DASHES.includes(c)) {
        out.push({ t: "dash", glyph: c, at: i, end: i + 1, space: sp() });
        i++;
        continue;
      }
      if (TIMES.includes(c)) {
        out.push({ t: "op", op: "*", glyph: c, at: i, end: i + 1, space: sp() });
        i++;
        continue;
      }
      if (DIVIDES.includes(c)) {
        out.push({ t: "op", op: "/", glyph: c, at: i, end: i + 1, space: sp() });
        i++;
        continue;
      }
      if (c === ":") {
        const prev = out[out.length - 1];
        if (prev && prev.t === "word" && space === 0) out.push({ t: "eq", approx: false, glyph: ":", at: i, end: i + 1, space: sp() });
        else out.push({ t: "op", op: "/", glyph: ":", at: i, end: i + 1, space: sp() });
        i++;
        continue;
      }
      if (c === "=" || c === "\uFF1D") {
        out.push({ t: "eq", approx: false, glyph: c, at: i, end: i + 1, space: sp() });
        i++;
        continue;
      }
      if (c === "\u2248") {
        if (operandEnd(out[out.length - 1])) out.push({ t: "eq", approx: true, glyph: c, at: i, end: i + 1, space: sp() });
        else approxNext = true;
        i++;
        continue;
      }
      if (c === "~") {
        approxNext = true;
        i++;
        continue;
      }
      if (c === "." && !isDigit2(s[i + 1]) && operandEnd(out[out.length - 1])) {
        space += 1;
        i++;
        continue;
      }
      if (LETTER.test(c)) {
        let j = i + 1;
        while (j < s.length) {
          const d = s[j];
          if (LETTER.test(d)) {
            j++;
            continue;
          }
          if ((d === "'" || d === "\u2019") && LETTER.test(s[j + 1] ?? "")) {
            j++;
            continue;
          }
          if ((d === "-" || d === "\u2010") && j - i >= 2 && /^[A-Za-zÀ-ɏ]{2}/.test(s.slice(j + 1))) {
            j++;
            continue;
          }
          break;
        }
        const w2 = s.slice(i, j);
        if (w2.toLowerCase() === "step") {
          const m = /^\s*(\d{1,3})(?!\d)/.exec(s.slice(j));
          if (m) {
            out.push({ t: "ref", step: Number(m[1]), text: s.slice(i, j + m[0].length), bare: false, at: i, end: j + m[0].length, space: sp() });
            i = j + m[0].length;
            continue;
          }
        }
        out.push({ t: "word", w: w2, at: i, end: j, space: sp() });
        i = j;
        continue;
      }
      out.push({ t: "junk", text: c, at: i, end: i + 1, space: sp() });
      i++;
    }
    return out;
  }
  function refine(toks) {
    const mapped = toks.map((t, k) => {
      if (t.t !== "word") return t;
      const prev = toks[k - 1], next = toks[k + 1];
      if ((t.w === "x" || t.w === "X") && operandEnd(prev) && operandStart(next)) {
        return { t: "op", op: "*", glyph: t.w, at: t.at, end: t.end, space: t.space };
      }
      if (t.w.toLowerCase() === "to" && prev?.t === "num" && next?.t === "num") {
        return { t: "dash", glyph: "to", at: t.at, end: t.end, space: t.space };
      }
      return t;
    });
    const out = [];
    for (const t of mapped) {
      if (t.t !== "word") {
        out.push(t);
        continue;
      }
      const last = out[out.length - 1];
      if (last && last.t === "name" && last.end <= t.at) {
        last.name = `${last.name} ${t.w}`;
        last.end = t.end;
        continue;
      }
      out.push({ t: "name", name: t.w, at: t.at, end: t.end, space: t.space });
    }
    return out;
  }
  function parseTokens(toks, leftToRight) {
    let p = 0;
    const primary = () => {
      const t = toks[p];
      if (!t) return null;
      switch (t.t) {
        case "num":
          p++;
          return { k: "num", q: t.q, text: t.text, id: t.id };
        case "name":
          p++;
          return { k: "name", name: t.name };
        case "ref":
          p++;
          return t.bare ? { k: "ref", step: t.step, text: t.text, bare: true } : { k: "ref", step: t.step, text: t.text };
        case "lp": {
          p++;
          const e2 = top();
          if (!e2) return null;
          if (toks[p]?.t === "rp") p++;
          return e2;
        }
        default:
          return null;
      }
    };
    const unary = () => {
      const t = toks[p];
      if (t?.t === "op" && t.op === "-") {
        p++;
        const a = unary();
        return a ? { k: "neg", a } : null;
      }
      if (t?.t === "op" && t.op === "+") {
        p++;
        return unary();
      }
      return primary();
    };
    const level = (ops, next) => () => {
      let a = next();
      while (a) {
        const t = toks[p];
        if (!t || t.t !== "op" || !ops.includes(t.op)) break;
        p++;
        const b = next();
        if (!b) return null;
        a = { k: "op", op: t.op, a, b };
      }
      return a;
    };
    const product = level(["*", "/"], unary);
    const sum = level(["+", "-"], product);
    const flat = level(["+", "-", "*", "/"], unary);
    const top = leftToRight ? flat : sum;
    const e = top();
    return e && p === toks.length ? e : null;
  }
  function sameExpr(a, b) {
    switch (a.k) {
      case "num":
        return b.k === "num" && a.q.lo === b.q.lo && a.q.hi === b.q.hi && a.q.unit === b.q.unit && a.q.dim === b.q.dim;
      case "name":
        return b.k === "name" && normName(a.name) === normName(b.name);
      case "ref":
        return b.k === "ref" && a.step === b.step;
      case "op":
        return b.k === "op" && a.op === b.op && sameExpr(a.a, b.a) && sameExpr(a.b, b.b);
      case "neg":
        return b.k === "neg" && sameExpr(a.a, b.a);
      case "carry":
        return b.k === "carry" && sameExpr(a.a, b.a);
    }
  }
  function opOf(e) {
    if (e.k === "op") return e.op;
    if (e.k === "carry") return opOf(e.a);
    return null;
  }
  var leafText = (e) => e.k === "num" ? formatQuantity(e.q) : e.k === "name" ? e.name : e.k === "ref" ? e.text : "";
  function fmtExpr(e, sub2) {
    const own = sub2?.(e);
    if (own !== void 0) return own;
    switch (e.k) {
      case "num":
      case "name":
      case "ref":
        return leafText(e);
      case "carry":
        return fmtExpr(e.a, sub2);
      case "neg": {
        const inner = fmtExpr(e.a, sub2);
        return "\u2212" + (opOf(e.a) ? `(${inner})` : inner);
      }
      case "op": {
        const la = fmtExpr(e.a, sub2), lb = fmtExpr(e.b, sub2);
        const oa = opOf(e.a), ob = opOf(e.b);
        return `${oa && oa !== e.op ? `(${la})` : la} ${GLYPH[e.op]} ${ob ? `(${lb})` : lb}`;
      }
    }
  }
  function formatExpr(e) {
    return fmtExpr(e);
  }
  function hasNames(e) {
    switch (e.k) {
      case "name":
      case "ref":
      case "carry":
        return true;
      case "num":
        return false;
      case "neg":
        return hasNames(e.a);
      case "op":
        return hasNames(e.a) || hasNames(e.b);
    }
  }
  function fold(e) {
    if (e.k === "op") {
      const a = fold(e.a), b = fold(e.b);
      if (a.k === "num" && b.k === "num") {
        const r = arithmetic(e.op, a.q, b.q);
        if (r.quantity) return { k: "num", q: r.quantity, text: formatQuantity(r.quantity), id: -1 };
      }
      return { k: "op", op: e.op, a, b };
    }
    if (e.k === "neg") {
      const a = fold(e.a);
      return a.k === "num" ? { k: "num", q: negateQuantity(a.q), text: formatQuantity(negateQuantity(a.q)), id: -1 } : { k: "neg", a };
    }
    return e;
  }
  function depth(e) {
    if (e.k === "op") return 1 + Math.max(depth(e.a), depth(e.b));
    if (e.k === "neg" || e.k === "carry") return depth(e.a);
    return 0;
  }
  var isCount = (e, n2) => e.k === "num" && isBare(e.q) && !isRange(e.q) && e.q.lo === n2;
  function describeExpr(expr) {
    const e = fold(expr);
    if (!hasNames(e) || depth(e) > 2) return void 0;
    const say = (x, top) => {
      switch (x.k) {
        case "num":
        case "name":
        case "ref":
          return leafText(x);
        case "carry":
          return say(x.a, top);
        case "neg":
          return `minus ${say(x.a, false)}`;
        case "op": {
          const a = say(x.a, false), b = say(x.b, false);
          const simple = x.a.k !== "op" && x.b.k === "num";
          switch (x.op) {
            case "+":
              return top && simple ? `${b} more than ${a}` : `${a} plus ${b}`;
            case "-":
              return top && simple ? `${b} less than ${a}` : `${a} minus ${b}`;
            case "*":
              if (isCount(x.b, 2)) return `twice ${a}`;
              if (isCount(x.b, 3)) return `three times ${a}`;
              return `${a} times ${b}`;
            case "/":
              if (isCount(x.b, 2)) return `${a}, halved`;
              if (isCount(x.b, 3)) return `a third of ${a}`;
              if (isCount(x.b, 4)) return `a quarter of ${a}`;
              return `${a} over ${b}`;
          }
        }
      }
    };
    return say(e, true);
  }
  var MAX_CHOICES = 3;
  function readSegment(toks, src) {
    const junk = toks.find((t) => t.t === "junk");
    if (junk && junk.t === "junk") return { readings: [], error: `cannot read \u201C${junk.text}\u201D` };
    if (toks.some((t) => t.t === "eq")) return { readings: [], error: "more than one expression" };
    const plans = [];
    toks.forEach((t, k) => {
      if (t.t !== "dash") return;
      const prev = toks[k - 1], next = toks[k + 1];
      if (!operandEnd(prev)) return plans.push({ index: k, mode: "unary" });
      if (t.glyph === "to") return plans.push({ index: k, mode: "range" });
      if (prev.t === "num" && next?.t === "num" && !isRange(prev.q) && !isRange(next.q) && prev.q.lo < next.q.lo && (prev.q.unit === null || next.q.unit === null || prev.q.unit === next.q.unit)) {
        return plans.push({ index: k, mode: "choice", plain: t.glyph === "\u2212" ? "minus" : "range" });
      }
      plans.push({ index: k, mode: "minus" });
    });
    const choices = plans.filter((p) => p.mode === "choice");
    const masks = [];
    if (choices.length <= MAX_CHOICES) for (let m = 0; m < 1 << choices.length; m++) masks.push(m);
    else {
      masks.push(0);
      choices.forEach((_, j) => masks.push(1 << j));
    }
    const out = [];
    for (const mask of masks) {
      const asOf = (plan) => {
        if (plan.mode === "range") return "range";
        if (plan.mode !== "choice") return "minus";
        const j = choices.indexOf(plan);
        const flipped = mask >> j & 1;
        return flipped ? plan.plain === "range" ? "minus" : "range" : plan.plain;
      };
      const ptoks = [];
      const dashChoices = [];
      const dashReasons = [];
      let ok = true;
      for (let k = 0; k < toks.length; k++) {
        const t = toks[k];
        if (t.t === "dash") {
          const plan = plans.find((p) => p.index === k);
          const as = asOf(plan);
          const prevOut = ptoks[ptoks.length - 1];
          const next = toks[k + 1];
          if (as === "range" && prevOut?.t === "num" && !isRange(prevOut.q) && next?.t === "num") {
            const prevTok = toks[k - 1];
            const q = rangeOf(prevTok.q.lo, next.q.hi, next.q.unit ?? prevTok.q.unit, {
              approx: prevTok.q.approx || next.q.approx,
              precision: Math.min(prevTok.q.precision ?? 1, next.q.precision ?? 1)
            });
            ptoks.pop();
            const text = src.slice(prevTok.at, next.end);
            ptoks.push({ t: "num", q, text, id: prevTok.at });
            if (plan.mode === "choice") {
              dashChoices.push({ kind: "dash", text, as: "range", plain: plan.plain === "range" });
              dashReasons.push(dashReason(prevTok.q, next.q, "range", plan.plain === "range"));
            }
            k++;
            continue;
          }
          if (plan.mode === "choice") {
            const prevTok = toks[k - 1];
            const nextTok = next;
            dashChoices.push({ kind: "dash", text: src.slice(prevTok.at, nextTok.end), as: "minus", plain: plan.plain === "minus" });
            dashReasons.push(dashReason(prevTok.q, nextTok.q, "minus", plan.plain === "minus"));
          }
          ptoks.push({ t: "op", op: "-" });
          continue;
        }
        switch (t.t) {
          case "num":
            ptoks.push({ t: "num", q: t.q, text: t.text, id: t.at });
            break;
          case "name":
            ptoks.push({ t: "name", name: t.name });
            break;
          case "word":
            ptoks.push({ t: "name", name: t.w });
            break;
          case "ref":
            ptoks.push({ t: "ref", step: t.step, text: t.text, bare: t.bare });
            break;
          case "op":
            ptoks.push({ t: "op", op: t.op });
            break;
          case "lp":
            ptoks.push({ t: "lp" });
            break;
          case "rp":
            ptoks.push({ t: "rp" });
            break;
          default:
            ok = false;
        }
      }
      if (!ok) continue;
      const byPrecedence = parseTokens(ptoks, false);
      const leftToRight = parseTokens(ptoks, true);
      const departures = dashChoices.filter((c) => !c.plain).length;
      const push = (expr, order, orderReason) => {
        if (out.some((r) => sameExpr(r.expr, expr))) return;
        const formula = formatExpr(expr);
        const clauses = [...dashReasons, ...orderReason ? [orderReason] : []];
        out.push({
          expr,
          formula,
          reason: clauses.length ? clauses.join("; ") : `one reading: ${formula}`,
          departures: departures + (order && !order.plain ? 1 : 0),
          choices: [...dashChoices, ...order ? [order] : []]
        });
      };
      if (byPrecedence && leftToRight && !sameExpr(byPrecedence, leftToRight)) {
        const f = formatExpr(byPrecedence);
        push(
          byPrecedence,
          { kind: "order", text: f, as: "precedence", plain: true },
          `by precedence (\xD7 and \xF7 before + and \u2212): ${describeExpr(byPrecedence) ?? f}`
        );
        push(
          leftToRight,
          { kind: "order", text: formatExpr(leftToRight), as: "left-to-right", plain: false },
          `as worked, left to right: ${describeExpr(leftToRight) ?? formatExpr(leftToRight)}`
        );
      } else if (byPrecedence ?? leftToRight) {
        push(byPrecedence ?? leftToRight, null, null);
      }
    }
    if (!out.length) return { readings: [], error: `cannot read \u201C${src.slice(toks[0]?.at ?? 0, toks[toks.length - 1]?.end ?? 0)}\u201D as a formula` };
    const ranked2 = out.map((r, i) => ({ r, i })).sort((x, y) => x.r.departures - y.r.departures || x.i - y.i).map((x) => x.r);
    return { readings: ranked2 };
  }
  function dashReason(a, b, as, plain) {
    const A = formatQuantity(a), B = formatQuantity(b);
    const range = formatQuantity(rangeOf(a.lo, b.hi, b.unit ?? a.unit));
    const diff = arithmetic("-", a, b).quantity;
    const D = diff ? formatQuantity(diff) : "?";
    if (as === "range") {
      return plain ? `a dash between ${A} and ${B}, the smaller first, reads as a range, ${range}: ${A} \u2212 ${B} would be ${D}, and a length is not negative` : `read as a range instead, ${range}, since a length is not negative`;
    }
    return plain ? `a minus sign between ${A} and ${B}: ${A} \u2212 ${B} = ${D}` : `the dash as a minus: ${A} \u2212 ${B} = ${D}, a negative length`;
  }
  function parseExpression(text) {
    const s = text.replace(SPACES, " ");
    const toks = refine(scan(s));
    if (!toks.length || toks.some((t) => t.t === "eq")) return [];
    const segs = splitSegments(toks);
    if (segs.length !== 1) return [];
    return readSegment(segs[0].toks, s).readings;
  }
  var GAP_SPACES = 3;
  function splitSegments(toks) {
    const segs = [{ toks: [] }];
    let depth2 = 0;
    for (const t of toks) {
      const cur = segs[segs.length - 1];
      if (t.t === "eq" && depth2 === 0) {
        segs.push({ toks: [], join: t.approx ? "\u2248" : "=" });
        continue;
      }
      if (depth2 === 0 && operandEnd(cur.toks[cur.toks.length - 1]) && operandStart(t)) {
        segs.push({ toks: [t], join: t.space >= GAP_SPACES ? "gap" : "beside" });
        if (t.t === "lp") depth2++;
        continue;
      }
      if (t.t === "lp") depth2++;
      if (t.t === "rp") depth2 = Math.max(0, depth2 - 1);
      cur.toks.push(t);
    }
    return segs.filter((s) => s.toks.length > 0);
  }
  function parseChain(text) {
    const s = text.replace(SPACES, " ");
    const toks = refine(scan(s));
    const segments = splitSegments(toks).map((seg2) => {
      const first = seg2.toks[0], last = seg2.toks[seg2.toks.length - 1];
      const { readings, error } = readSegment(seg2.toks, s);
      return {
        text: s.slice(first.at, last.end),
        ...seg2.join ? { join: seg2.join } : {},
        readings,
        ...error ? { error } : {}
      };
    });
    return { text: s, segments };
  }
  var LETTER_LABEL = /^\s*([A-Z])\s*[.):]\s+(?=\S)/;
  var STEP_LABEL = /^\s*(?:step\s*)?(\d{1,3})\s*[.):]\s+(?=\S)/i;
  var PAREN_LABEL = /^\s*\((\d{1,3})\)\s+(?=\S)/;
  var STARTS_WITH_OP = /^\s*[+\-–—−×*·÷/:=]/;
  function splitLabel(s) {
    let m = LETTER_LABEL.exec(s);
    if (m) return { label: { kind: "letter", letter: m[1], text: m[0].trim() }, body: s.slice(m[0].length) };
    m = STEP_LABEL.exec(s);
    if (m) return { label: { kind: "step", n: Number(m[1]), text: m[0].trim() }, body: s.slice(m[0].length) };
    m = PAREN_LABEL.exec(s);
    if (m && !STARTS_WITH_OP.test(s.slice(m[0].length))) return { label: { kind: "step", n: Number(m[1]), text: m[0].trim() }, body: s.slice(m[0].length) };
    const c = s.trimStart()[0];
    if (c && c in CIRCLED) {
      const rest = s.trimStart().slice(1);
      if (/^\s+\S/.test(rest) && !STARTS_WITH_OP.test(rest)) return { label: { kind: "step", n: CIRCLED[c], text: c }, body: rest.trimStart() };
    }
    return { body: s };
  }
  function loneQuantity(seg2) {
    const e = seg2.readings[0]?.expr;
    if (!e) return null;
    if (e.k === "num") return e.q;
    if (e.k === "neg" && e.a.k === "num") return negateQuantity(e.a.q);
    return null;
  }
  function parseLine(text) {
    const s = text.replace(SPACES, " ").trim();
    const { label, body } = splitLabel(s);
    const chain = parseChain(body);
    const segs = chain.segments;
    const base = { text: s, ...label ? { label } : {}, body: body.trim(), chain };
    if (!segs.length) return { ...base, shape: "empty" };
    if (segs.some((g) => !g.readings.length)) return { ...base, shape: "unreadable" };
    const kinds = segs.map((g) => g.readings[0].expr.k === "name" ? "name" : loneQuantity(g) ? "quantity" : "expr");
    if (kinds.length === 1 && kinds[0] === "name") return { ...base, shape: "heading" };
    if (kinds.length === 1 && kinds[0] === "quantity") return { ...base, shape: "value", value: loneQuantity(segs[0]) };
    if (kinds.length === 2 && kinds[0] === "name" && kinds[1] === "quantity") {
      const e = segs[0].readings[0].expr;
      return { ...base, shape: "definition", name: e.k === "name" ? e.name : segs[0].text, value: loneQuantity(segs[1]) };
    }
    return { ...base, shape: "formula" };
  }
  function scopeOf(names = {}, steps = {}, unit2 = null) {
    const toQ2 = (v) => typeof v === "string" ? parseQuantity(v)?.quantity ?? null : v;
    const table = /* @__PURE__ */ new Map();
    for (const [k, v] of Object.entries(names)) {
      table.set(normName(k), Array.isArray(v) ? v : [{ value: toQ2(v), key: k }]);
    }
    return {
      unit: unit2,
      name: (n2) => table.get(normName(n2)),
      step: (n2) => steps[n2] !== void 0 ? { value: toQ2(steps[n2]), key: String(n2) } : void 0
    };
  }
  function pick(res, label) {
    if (label) {
      const alt = res.find((r) => r.alternative && r.label === label);
      if (alt) return alt;
    }
    return res.find((r) => !r.alternative) ?? res[0];
  }
  function evaluateExpr(expr, scope = {}, options = {}) {
    const uses = /* @__PURE__ */ new Set();
    const unknowns = /* @__PURE__ */ new Set();
    const notes = [];
    const resolved = [];
    const shown = /* @__PURE__ */ new Map();
    const bound = options.bindings;
    const note = (n2) => {
      if (!notes.includes(n2)) notes.push(n2);
    };
    const rec = (e) => {
      switch (e.k) {
        case "num": {
          const b = bound?.get(`num:${e.id}`);
          if (b) {
            shown.set(e, formatQuantity(b));
            return b;
          }
          return e.q;
        }
        case "name": {
          const b = bound?.get(`name:${normName(e.name)}`);
          if (b) {
            shown.set(e, formatQuantity(b));
            resolved.push({ subject: e.name, value: b, from: "worked" });
            return b;
          }
          const res = scope.name?.(e.name);
          if (!res || !res.length) {
            unknowns.add(e.name);
            return null;
          }
          const r = pick(res, options.label);
          if (r.key) uses.add(r.key);
          resolved.push({ subject: e.name, value: r.value, key: r.key, label: r.label, alternative: r.alternative, from: "scope" });
          if (!r.value) {
            unknowns.add(e.name);
            if (r.reason) note(r.reason);
            return null;
          }
          shown.set(e, formatQuantity(r.value));
          return r.value;
        }
        case "ref": {
          const b = bound?.get(`ref:${e.step}`);
          if (b) {
            shown.set(e, formatQuantity(b));
            resolved.push({ subject: e.text, value: b, from: "worked" });
            return b;
          }
          const r = scope.step?.(e.step);
          if (r) {
            if (r.key) uses.add(r.key);
            resolved.push({ subject: e.text, value: r.value, key: r.key, from: "scope" });
            if (r.value) {
              shown.set(e, formatQuantity(r.value));
              return r.value;
            }
            note(r.reason ?? `step ${e.step} has no value`);
            return null;
          }
          if (e.bare) {
            const n2 = quantity(e.step);
            note(`${e.text} read as the number ${e.step}: there is no step ${e.step}`);
            resolved.push({ subject: e.text, value: n2, from: "number" });
            shown.set(e, String(e.step));
            return n2;
          }
          note(`there is no step ${e.step}`);
          return null;
        }
        case "neg": {
          const v = rec(e.a);
          return v && negateQuantity(v);
        }
        case "op": {
          const a = rec(e.a), b = rec(e.b);
          if (!a || !b) return null;
          const r = arithmetic(e.op, a, b);
          r.notes.forEach(note);
          if (r.error) note(r.error);
          return r.quantity;
        }
        case "carry": {
          const v = rec(e.a);
          if (v) return v;
          shown.set(e, e.text);
          note(`carried the written ${e.text}`);
          return e.written;
        }
      }
    };
    const value = rec(expr);
    return {
      value,
      worked: fmtExpr(expr, (e) => shown.get(e)),
      uses: [...uses],
      unknowns: [...unknowns],
      notes,
      resolved
    };
  }
  function newAcc(from) {
    return { bindings: new Map(from ?? []), bound: [], keyed: [], checks: [], fails: 0, passes: 0 };
  }
  function constantValue(w2) {
    if (w2.k === "num") return w2.q;
    if (w2.k === "ref" && w2.bare) return quantity(w2.step);
    if (hasNames(w2)) return null;
    return evaluateExpr(w2).value;
  }
  function tally(acc, c) {
    acc.checks.push(c);
    if (c.status === "off") acc.fails++;
    else if (c.status !== "unknown") acc.passes++;
  }
  function unify(f, w2, ctx, acc) {
    const partial = () => {
      const wv = constantValue(w2);
      if (!wv) return false;
      const ev = evaluateExpr(f, ctx.scope, { label: ctx.label, bindings: acc.bindings });
      tally(acc, { ...compareQuantities(ev.value, wv), text: textOf(w2), segment: ctx.segment, what: "restated", subject: formatExpr(f) });
      return true;
    };
    switch (f.k) {
      case "op":
        if (w2.k === "op") return f.op === w2.op && unify(f.a, w2.a, ctx, acc) && unify(f.b, w2.b, ctx, acc);
        return w2.k === "num" || w2.k === "neg" ? partial() : false;
      case "neg":
        if (w2.k === "neg") return unify(f.a, w2.a, ctx, acc);
        return w2.k === "num" ? partial() : false;
      case "carry":
        if (w2.k === "num") return partial();
        return unify(f.a, w2, ctx, acc);
      case "name":
      case "ref": {
        if (w2.k === "name") return f.k === "name" && normName(f.name) === normName(w2.name);
        if (w2.k === "ref" && !w2.bare) return f.k === "ref" && f.step === w2.step;
        const wv = constantValue(w2);
        if (!wv) return false;
        const subject = f.k === "name" ? f.name : f.text;
        const known = evaluateExpr(f, ctx.scope, { label: ctx.label, bindings: acc.bindings });
        if (known.value) {
          tally(acc, { ...compareQuantities(known.value, wv), text: textOf(w2), segment: ctx.segment, what: "restated", subject });
          return true;
        }
        const v = isBare(wv) && ctx.scope.unit ? { ...wv, unit: ctx.scope.unit, dim: 1 } : wv;
        const key2 = f.k === "name" ? `name:${normName(f.name)}` : `ref:${f.step}`;
        const binding = { kind: f.k === "name" ? "name" : "step", subject, value: v, reason: `${subject} as ${formatQuantity(v)}` };
        acc.bindings.set(key2, v);
        acc.bound.push(binding);
        acc.keyed.push({ key: key2, binding });
        return true;
      }
      case "num": {
        const wv = constantValue(w2);
        if (!wv) return false;
        if (isRange(f.q)) {
          const v = isBare(wv) && f.q.unit ? { ...wv, unit: f.q.unit, dim: f.q.dim } : wv;
          const subject = formatQuantity(f.q);
          if (!isRange(v) && holds(f.q, v.lo)) {
            acc.bindings.set(`num:${f.id}`, v);
            acc.bound.push({ kind: "range", subject, value: v, reason: `${formatQuantity(v)} chosen from ${subject}` });
            acc.passes++;
            return true;
          }
          tally(acc, { ...compareQuantities(f.q, v), text: textOf(w2), segment: ctx.segment, what: "restated", subject });
          return true;
        }
        const c = compareQuantities(f.q, wv);
        if (c.status === "ok" || c.status === "rounded") {
          acc.passes++;
          return true;
        }
        return false;
      }
    }
  }
  function textOf(e) {
    return e.k === "num" ? e.text : formatExpr(e);
  }
  function leftmostNum(e) {
    if (e.k === "num") return e;
    if (e.k === "op") return leftmostNum(e.a);
    return null;
  }
  function replaceLeaf(e, leaf, by) {
    if (e === leaf) return by;
    if (e.k === "op") return { ...e, a: replaceLeaf(e.a, leaf, by), b: replaceLeaf(e.b, leaf, by) };
    if (e.k === "neg") return { ...e, a: replaceLeaf(e.a, leaf, by) };
    return e;
  }
  function namesIn(e, out = []) {
    if (e.k === "name") {
      if (!out.some((n2) => normName(n2) === normName(e.name))) out.push(e.name);
    } else if (e.k === "op") {
      namesIn(e.a, out);
      namesIn(e.b, out);
    } else if (e.k === "neg" || e.k === "carry") namesIn(e.a, out);
    return out;
  }
  function alternativeLabels(exprs, scope) {
    const labels = [];
    for (const e of exprs) {
      for (const n2 of namesIn(e)) {
        for (const r of scope.name?.(n2) ?? []) if (r.alternative && r.label && !labels.includes(r.label)) labels.push(r.label);
      }
    }
    return labels;
  }
  function takesLabel(e, label, scope) {
    return namesIn(e).some((n2) => (scope.name?.(n2) ?? []).some((r) => r.alternative && r.label === label));
  }
  function refsIn(e, out = []) {
    if (e.k === "ref") out.push(e.step);
    else if (e.k === "op") {
      refsIn(e.a, out);
      refsIn(e.b, out);
    } else if (e.k === "neg" || e.k === "carry") refsIn(e.a, out);
    return out;
  }
  var cmpScore = (a, b) => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
    return 0;
  };
  function runChain(reading, rest, scope, label, skip = /* @__PURE__ */ new Set(), seed = []) {
    let cur = reading.expr;
    const acc = newAcc();
    const seeded2 = [];
    for (const s of seed) {
      acc.bindings.set(s.key, s.binding.value);
      seeded2.push(s.binding);
    }
    const notes = [];
    let restated = 0;
    const restatedSegs = [];
    const restatedTexts = [];
    const skipped = [];
    rest.forEach((seg2, k) => {
      const segment = k + 1;
      if (skip.has(segment)) {
        skipped.push(seg2.text);
        return;
      }
      if (!seg2.readings.length) {
        notes.push(seg2.error ?? `cannot read \u201C${seg2.text}\u201D`);
        return;
      }
      const lone = loneQuantity(seg2);
      if (lone) {
        const ev = evaluateExpr(cur, scope, { label, bindings: acc.bindings });
        tally(acc, { ...compareQuantities(ev.value, lone), text: seg2.text, segment, what: "result" });
        if (!ev.value) cur = { k: "carry", a: cur, written: lone, text: seg2.text };
        return;
      }
      const options = [];
      for (const sr of seg2.readings) {
        const trial = newAcc(acc.bindings);
        if (unify(cur, sr.expr, { scope, label, segment }, trial)) {
          options.push({
            score: [trial.fails, 0, -trial.passes],
            apply: () => {
              for (const [key2, v] of trial.bindings) acc.bindings.set(key2, v);
              acc.bound.push(...trial.bound);
              acc.keyed.push(...trial.keyed);
              acc.checks.push(...trial.checks);
              acc.fails += trial.fails;
              acc.passes += trial.passes;
              restated++;
              restatedSegs.push(segment);
              restatedTexts.push(seg2.join === "gap" ? `the worked line \u201C${seg2.text}\u201D` : `\u201C${seg2.text}\u201D`);
            }
          });
        }
        const leaf = leftmostNum(sr.expr);
        if (leaf && !isRange(leaf.q)) {
          const ev = evaluateExpr(cur, scope, { label, bindings: acc.bindings });
          const c = { ...compareQuantities(ev.value, leaf.q), text: leaf.text, segment, what: "carried" };
          const next = replaceLeaf(sr.expr, leaf, { k: "carry", a: cur, written: leaf.q, text: leaf.text });
          options.push({
            score: [c.status === "off" ? 1 : 0, 1, c.status === "unknown" || c.status === "off" ? 0 : -1],
            apply: () => {
              tally(acc, c);
              cur = next;
            }
          });
        }
      }
      if (!options.length) {
        notes.push(`\u201C${seg2.text}\u201D neither restates the line nor carries it on`);
        return;
      }
      options.reduce((best, o) => cmpScore(o.score, best.score) < 0 ? o : best).apply();
    });
    return { reading, label, cur, acc, restated, restatedSegs, restatedTexts, skipped, seeded: seeded2, notes };
  }
  var joinNames = (xs) => xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
  var runKey = (r) => [r.acc.fails, -r.restated, -r.acc.passes, r.li, r.reading.departures, r.ri];
  var sortRuns = (runs) => runs.sort((a, b) => cmpScore(runKey(a), runKey(b)));
  function evaluateChain(chain, scope = {}) {
    const [first, ...rest] = chain.segments;
    if (!first) return [];
    if (!first.readings.length) {
      const why = first.error ?? `cannot read \u201C${first.text}\u201D`;
      return [{ expr: null, formula: first.text, value: null, worked: first.text, checks: [], bindings: [], restated: 0, uses: [], unknowns: [], notes: [why], reason: why }];
    }
    const labels = alternativeLabels(first.readings.map((r) => r.expr), scope);
    let runs = [];
    first.readings.forEach((reading, ri) => {
      [void 0, ...labels].forEach((label, li) => {
        if (label && !takesLabel(reading.expr, label, scope)) return;
        runs.push({ ...runChain(reading, rest, scope, label), ri, li });
      });
    });
    sortRuns(runs);
    const settled = runs.find((r) => r.restated > 0);
    if (settled) {
      const worked = new Set(settled.restatedSegs);
      runs = runs.map((r) => {
        if (r.restatedSegs.some((s) => worked.has(s))) return r;
        const names = namesIn(r.reading.expr).map(normName);
        const refs = refsIn(r.reading.expr);
        const seed = settled.acc.keyed.filter((x) => x.binding.kind === "name" && names.includes(x.key.slice(5)) || x.binding.kind === "step" && refs.includes(Number(x.key.slice(4)))).map((x) => ({ key: x.key, binding: { ...x.binding, reason: `${x.binding.reason}, as the worked line puts it` } }));
        return { ...runChain(r.reading, rest, scope, r.label, worked, seed), ri: r.ri, li: r.li };
      });
      sortRuns(runs);
    }
    const plural = first.readings.length > 1;
    return runs.map((run) => {
      const ev = evaluateExpr(run.cur, scope, { label: run.label, bindings: run.acc.bindings });
      const unknown = (u) => scope.describeUnknown?.(u) ?? `${u} is not defined`;
      const notes = [...run.notes];
      for (const n2 of ev.notes) if (!notes.includes(n2)) notes.push(n2);
      for (const u of ev.unknowns) if (!notes.some((n2) => n2.includes(u))) notes.push(unknown(u));
      const formula = formatExpr(run.cur);
      const clauses = [];
      if (plural) clauses.push(run.reading.reason);
      if (labels.length) {
        const taken = ev.resolved.filter((r) => r.from === "scope" && r.value);
        const alt = taken.filter((r) => r.alternative);
        if (run.label) {
          clauses.push(`${run.label} on ${joinNames(alt.map((r) => r.subject))} (${alt.map((r) => `${r.subject} ${formatQuantity(r.value)}`).join(", ")})`);
        } else {
          const plainLabel = taken.find((r) => r.label)?.label ?? "as written";
          clauses.push(`${plainLabel} (${taken.map((r) => `${r.subject} ${formatQuantity(r.value)}`).join(", ")})`);
        }
      }
      if (run.restated) {
        const fixed = run.acc.bound.map((b) => b.reason);
        const across = run.restatedTexts.some((t) => t.startsWith("the worked line"));
        clauses.push(`${run.restatedTexts.join(" and ")} ${across ? "has this form" : "restates it with the numbers put in"}${fixed.length ? `, with ${fixed.join(" and ")}` : ""}`);
      }
      if (run.skipped.length) {
        clauses.push(`the worked line ${run.skipped.map((t) => `\u201C${t}\u201D`).join(" and ")} does not have this form${run.seeded.length ? `; it puts ${run.seeded.map((b) => `${b.subject} as ${formatQuantity(b.value)}`).join(" and ")}` : ""}`);
      }
      const offs = run.acc.checks.filter((c) => c.status === "off");
      clauses.push(ev.value ? `${formula} = ${formatQuantity(ev.value)}` : `${formula}: no value`);
      if (run.acc.checks.length) {
        clauses.push(
          offs.length ? offs.map((c) => c.reason).join("; ") : run.acc.checks.some((c) => c.status === "unknown") ? "nothing to check some of the written numbers against" : "every written number checks"
        );
      }
      for (const n2 of notes) if (!clauses.includes(n2)) clauses.push(n2);
      return {
        expr: run.cur,
        formula,
        value: ev.value,
        worked: ev.value && ev.worked !== formatQuantity(ev.value) ? `${ev.worked} = ${formatQuantity(ev.value)}` : ev.worked,
        checks: run.acc.checks,
        bindings: [...run.seeded, ...run.acc.bound],
        restated: run.restated,
        ...run.label ? { label: run.label } : {},
        uses: ev.uses,
        unknowns: ev.unknowns,
        notes,
        reason: clauses.join("; ")
      };
    });
  }

  // src/maths/sheet.ts
  var fmt = (q) => q ? formatQuantity(q) : "no value";
  var ADDS = /^\s*(add|plus)\b/i;
  function unitsWritten(p) {
    const out = [];
    const walk = (e) => {
      if (e.k === "num") {
        if (e.q.unit && e.q.dim === 1) out.push(e.q.unit);
      } else if (e.k === "op") {
        walk(e.a);
        walk(e.b);
      } else if (e.k === "neg" || e.k === "carry") walk(e.a);
    };
    for (const seg2 of p.chain.segments) if (seg2.readings[0]) walk(seg2.readings[0].expr);
    return out;
  }
  var UNIT_NAMES = { in: "inches", ft: "feet", cm: "centimetres", mm: "millimetres", m: "metres" };
  function inferUnit(parses) {
    const lines = /* @__PURE__ */ new Map();
    for (const p of parses) for (const u of new Set(unitsWritten(p))) lines.set(u, (lines.get(u) ?? 0) + 1);
    if (!lines.size) return { unit: null, reason: "no unit is written here, so the numbers stay bare" };
    let best = null;
    for (const [u, n3] of lines) if (!best || n3 > lines.get(best)) best = u;
    const n2 = lines.get(best);
    const others = [...lines.keys()].filter((u) => u !== best);
    return {
      unit: best,
      reason: `${UNIT_NAMES[best]} (${unitSuffix(best, 1).trim()}), the unit written on ${n2} line${n2 === 1 ? "" : "s"}; a bare measurement here is in ${UNIT_NAMES[best]}${others.length ? ` (also written: ${others.join(", ")})` : ""}`
    };
  }
  function headingAmount(p) {
    if (!ADDS.test(p.body)) return void 0;
    const kinds = p.chain.segments.map((g2) => {
      const e2 = g2.readings[0]?.expr;
      return !e2 ? "x" : e2.k === "name" ? "name" : e2.k === "num" ? "num" : "x";
    });
    if (kinds.includes("x") || kinds.filter((k) => k === "num").length !== 1) return void 0;
    const g = p.chain.segments[kinds.indexOf("num")];
    const e = g.readings[0].expr;
    return e.k === "num" ? e.q : void 0;
  }
  function headingWords(p) {
    const names = p.chain.segments.map((g) => g.readings[0]?.expr).filter((e) => e?.k === "name").map((e) => e.name);
    return (names.length ? names.join(" ") : p.body).replace(/^\s*(add|plus)\s*/i, "").trim();
  }
  function classify(src, line) {
    const parse = parseLine(src.text);
    const d = { line, src, parse, kind: "note" };
    const L = parse.label;
    const unreadable = () => parse.shape === "empty" ? `${L ? `${L.text} with nothing after it` : "an empty line"}` : `cannot read \u201C${parse.body}\u201D`;
    if (L?.kind === "letter") {
      if (parse.shape === "definition") return { ...d, kind: "definition", key: L.letter, letter: L.letter, name: parse.name, value: parse.value };
      if (parse.shape === "value") return { ...d, kind: "definition", key: L.letter, letter: L.letter, value: parse.value };
      if (parse.shape === "heading") return { ...d, kind: "definition", key: L.letter, letter: L.letter, name: parse.body, value: null };
      if (parse.shape === "formula") return { ...d, kind: "step", key: L.letter, letter: L.letter, n: null, chain: parse.chain };
      return { ...d, note: unreadable() };
    }
    if (L?.kind === "step") {
      if (parse.shape === "value") return { ...d, kind: "label", key: String(L.n), n: L.n, step: String(L.n), written: parse.value, chain: parse.chain };
      if (parse.shape === "formula" || parse.shape === "definition" || parse.shape === "heading") return { ...d, kind: "step", key: String(L.n), n: L.n, chain: parse.chain };
      return { ...d, note: unreadable() };
    }
    const amount2 = headingAmount(parse);
    if (amount2) return { ...d, kind: "heading", title: parse.body, amount: amount2 };
    if (parse.shape === "heading") return { ...d, kind: "heading", title: parse.body };
    if (parse.shape === "definition") return { ...d, kind: "definition", key: parse.name, name: parse.name, value: parse.value };
    if (parse.shape === "value") return { ...d, kind: "value", written: parse.value };
    if (parse.shape === "formula") return { ...d, kind: "check", chain: parse.chain };
    return { ...d, note: unreadable() };
  }
  function hasNames2(chain) {
    const walk = (e) => e.k === "name" || e.k === "ref" ? true : e.k === "op" ? walk(e.a) || walk(e.b) : e.k === "neg" || e.k === "carry" ? walk(e.a) : false;
    return chain.segments.some((g) => g.readings.some((r) => walk(r.expr)));
  }
  function mentions(chain) {
    const names = [];
    const steps = [];
    const walk = (e) => {
      if (e.k === "name") names.push(e.name);
      else if (e.k === "ref") steps.push(e.step);
      else if (e.k === "op") {
        walk(e.a);
        walk(e.b);
      } else if (e.k === "neg" || e.k === "carry") walk(e.a);
    };
    for (const g of chain.segments) for (const r of g.readings) walk(r.expr);
    return { names, steps };
  }
  function addsAmount(e, amount2) {
    if (!e) return false;
    if (e.k === "op") {
      if (e.op === "+" && e.b.k === "num" && !isRange(e.b.q) && compareQuantities(amount2, e.b.q).status === "ok") return true;
      return addsAmount(e.a, amount2) || addsAmount(e.b, amount2);
    }
    if (e.k === "neg" || e.k === "carry") return addsAmount(e.a, amount2);
    return false;
  }
  var stepsPhrase = (keys) => keys.length === 1 ? `step ${keys[0]}` : `steps ${keys.slice(0, -1).join(", ")} and ${keys[keys.length - 1]}`;
  function cyclesOf(keys, deps) {
    const index = /* @__PURE__ */ new Map();
    const low = /* @__PURE__ */ new Map();
    const onStack = /* @__PURE__ */ new Set();
    const stack = [];
    const out = /* @__PURE__ */ new Map();
    let i = 0;
    const visit = (v) => {
      index.set(v, i);
      low.set(v, i);
      i++;
      stack.push(v);
      onStack.add(v);
      for (const w2 of deps.get(v) ?? []) {
        if (!index.has(w2)) {
          visit(w2);
          low.set(v, Math.min(low.get(v), low.get(w2)));
        } else if (onStack.has(w2)) low.set(v, Math.min(low.get(v), index.get(w2)));
      }
      if (low.get(v) === index.get(v)) {
        const scc = [];
        let w2;
        do {
          w2 = stack.pop();
          onStack.delete(w2);
          scc.push(w2);
        } while (w2 !== v);
        if (scc.length > 1 || deps.get(v)?.has(v)) {
          const members = keys.filter((k) => scc.includes(k));
          for (const m of members) out.set(m, members);
        }
      }
    };
    for (const k of keys) if (!index.has(k)) visit(k);
    return out;
  }
  function readSheet(input, options = {}) {
    const sources = input.map(
      (x) => typeof x === "string" ? { text: x } : { text: x.text, ...x.at ? { at: x.at } : {}, ...x.bounds ? { bounds: x.bounds } : {}, ...x.ids ? { ids: [...x.ids] } : {} }
    );
    const drafts = sources.map((src, line) => classify(src, line));
    const { unit: unit2, reason: unitReason } = options.unit !== void 0 ? { unit: options.unit, reason: options.unit ? `${UNIT_NAMES[options.unit]}, as given` : "no unit, as given" } : inferUnit(drafts.map((d) => d.parse));
    const withUnit = (q) => isBare(q) && unit2 ? { ...q, unit: unit2, dim: 1 } : q;
    const nameIndex = /* @__PURE__ */ new Map();
    const defByKey = /* @__PURE__ */ new Map();
    const stepByKey = /* @__PURE__ */ new Map();
    for (const d of drafts) {
      if (d.kind === "definition") {
        const keys = [d.letter, d.name].filter((k) => !!k).map(normName);
        const taken = keys.find((k) => nameIndex.has(k));
        if (taken) {
          const first = defByKey.get(nameIndex.get(taken));
          d.conflict = `${d.letter ?? d.name} is written again as ${d.value ? fmt(withUnit(d.value)) : "nothing"}; the first, ${first?.value ? fmt(withUnit(first.value)) : "with no number"}, is kept`;
          continue;
        }
        for (const k of keys) nameIndex.set(k, d.key);
        defByKey.set(d.key, d);
      } else if (d.kind === "step") {
        if (stepByKey.has(d.key) || d.letter && nameIndex.has(normName(d.letter))) {
          d.conflict = `${d.n !== null && d.n !== void 0 ? `step ${d.n}` : d.letter} is written twice; the first is kept`;
          continue;
        }
        stepByKey.set(d.key, d);
        if (d.letter) nameIndex.set(normName(d.letter), d.key);
      }
    }
    for (const d of drafts) {
      if (d.kind === "label" && !stepByKey.has(d.step)) {
        d.kind = "step";
        stepByKey.set(d.key, d);
      }
    }
    let heading;
    for (const d of drafts) {
      if (d.kind === "heading") {
        heading = d.line;
        continue;
      }
      if (heading !== void 0) d.under = heading;
    }
    drafts.forEach((d, i) => {
      const above = drafts[i - 1];
      if (d.kind !== "check" || !above || above.kind !== "step" || above.conflict || above.workedLine !== void 0 || hasNames2(d.chain)) return;
      if (above.chain.segments.some((g) => g.join === "gap")) return;
      const joined = parseChain(`${above.parse.body}   ${d.parse.body}`);
      if (!evaluateChain(joined, { unit: unit2 }).some((r) => r.restated > 0)) return;
      above.chain = joined;
      above.workedLine = d.line;
      d.kind = "worked";
      d.step = above.key;
    });
    const stepKeys = [...stepByKey.keys()];
    const deps = /* @__PURE__ */ new Map();
    for (const k of stepKeys) {
      const m = mentions(stepByKey.get(k).chain);
      const set = /* @__PURE__ */ new Set();
      for (const n2 of m.names) {
        const key2 = nameIndex.get(normName(n2));
        if (key2 && stepByKey.has(key2)) set.add(key2);
      }
      for (const s of m.steps) if (stepByKey.has(String(s))) set.add(String(s));
      deps.set(k, set);
    }
    const cycles = cyclesOf(stepKeys, deps);
    const who = (k) => /^\d+$/.test(k) ? `step ${k}` : k;
    const evaluate = (alternatives2) => {
      const values = /* @__PURE__ */ new Map();
      const readings = /* @__PURE__ */ new Map();
      const scopeFor = (allowance) => ({
        unit: unit2,
        describeUnknown: (name) => `${name} is not on this sheet`,
        name: (n2) => {
          const key2 = nameIndex.get(normName(n2));
          if (key2 === void 0) return void 0;
          const def = defByKey.get(key2);
          if (!def) {
            const v2 = values.get(key2) ?? null;
            return [{ value: v2, key: key2, ...v2 ? {} : { reason: cycles.has(key2) ? `${key2} is in a cycle` : `${key2} has no value` } }];
          }
          const v = def.value ? withUnit(def.value) : null;
          const plain2 = { value: v, key: key2, label: "from the measurements", ...v ? {} : { reason: `${key2} has no number yet` } };
          if (!allowance || !v) return [plain2];
          const alt = arithmetic("+", v, allowance.amount).quantity;
          if (!alt) return [plain2];
          return [plain2, { value: alt, key: key2, label: allowance.label, alternative: true, reason: `${key2} ${fmt(v)} + ${fmt(allowance.amount)}` }];
        },
        step: (n2) => {
          const key2 = String(n2);
          if (!stepByKey.has(key2)) return void 0;
          if (cycles.has(key2)) return { value: null, key: key2, reason: `step ${n2} is in a cycle` };
          const v = values.get(key2) ?? null;
          return { value: v, key: key2, ...v ? {} : { reason: `step ${n2} has no value` } };
        }
      });
      const run = (key2) => {
        if (readings.has(key2)) return;
        const d = stepByKey.get(key2);
        const loop = cycles.get(key2);
        if (loop) {
          const why = loop.length === 1 ? `${who(key2)} refers to itself \u2014 a cycle, so it cannot be worked out` : `${loop.map(who).join(" and ")} refer to each other \u2014 a cycle, so none of them can be worked out`;
          readings.set(key2, [{ expr: null, formula: d.parse.body, value: null, worked: d.parse.body, checks: [], bindings: [], restated: 0, uses: [...deps.get(key2)], unknowns: [], notes: [why], reason: why }]);
          values.set(key2, null);
          return;
        }
        for (const dep of deps.get(key2) ?? []) run(dep);
        const r = evaluateChain(d.chain, scopeFor(alternatives2.get(key2)));
        readings.set(key2, r);
        values.set(key2, r[0]?.value ?? null);
      };
      stepKeys.forEach(run);
      return { values, readings, scopeFor };
    };
    const plain = evaluate(/* @__PURE__ */ new Map());
    const allowances = /* @__PURE__ */ new Map();
    for (const h2 of drafts) {
      if (h2.kind !== "heading" || !ADDS.test(h2.title) && !/\ballowance\b/i.test(h2.title)) continue;
      const label = `with ${headingWords(h2.parse)}`;
      if (h2.amount) {
        const amount2 = withUnit(h2.amount);
        allowances.set(h2.line, { amount: amount2, label, from: [], reason: `${h2.title}: ${fmt(amount2)}, as the heading says` });
        continue;
      }
      const seen = [];
      for (const d of drafts) {
        if (d.kind !== "step" || d.under !== h2.line || d.conflict) continue;
        const e = plain.readings.get(d.key)?.[0]?.expr;
        if (e && e.k === "op" && e.op === "+" && e.b.k === "num" && !isRange(e.b.q) && e.a.k !== "num") seen.push({ key: d.key, k: withUnit(e.b.q) });
      }
      if (!seen.length) continue;
      const tally2 = seen.map((s) => ({ ...s, n: seen.filter((o) => compareQuantities(o.k, s.k).status === "ok").length }));
      const top = tally2.reduce((a, b) => b.n > a.n ? b : a);
      const from = seen.filter((s) => compareQuantities(s.k, top.k).status === "ok").map((s) => s.key);
      allowances.set(h2.line, { amount: top.k, label, from, reason: `${h2.title}: ${fmt(top.k)}, as ${stepsPhrase(from)} ${from.length === 1 ? "adds" : "add"} it` });
    }
    const alternatives = /* @__PURE__ */ new Map();
    for (const d of drafts) {
      if (d.kind !== "step" || d.conflict || d.under === void 0) continue;
      const a = allowances.get(d.under);
      if (!a) continue;
      if (plain.readings.get(d.key)?.some((r) => addsAmount(r.expr, a.amount))) continue;
      alternatives.set(d.key, a);
    }
    const done = alternatives.size ? evaluate(alternatives) : plain;
    const readingsOf = (key2) => done.readings.get(key2) ?? [];
    const entries = drafts.map((d) => {
      const base = {
        line: d.line,
        text: d.src.text,
        ...d.src.at ? { at: d.src.at } : {},
        ...d.src.bounds ? { bounds: d.src.bounds } : {},
        ...d.src.ids ? { ids: d.src.ids } : {},
        ...d.under !== void 0 ? { under: d.under } : {},
        reason: ""
      };
      switch (d.kind) {
        case "definition": {
          const value = d.value ? withUnit(d.value) : null;
          const head = [d.letter, d.name].filter(Boolean).join(" \xB7 ");
          const reason = d.conflict ? d.conflict : value ? `${head} = ${fmt(value)}${d.value && isBare(d.value) && unit2 ? `, in the ${UNIT_NAMES[unit2]} this page writes` : ""}` : `${head}: a measurement with no number yet`;
          return { ...base, kind: "definition", key: d.key, ...d.letter ? { letter: d.letter } : {}, ...d.name ? { name: d.name } : {}, value, ...d.conflict ? { conflict: d.conflict } : {}, reason };
        }
        case "step": {
          if (d.conflict) {
            return { ...base, kind: "step", key: d.key, n: d.n ?? null, ...d.letter ? { letter: d.letter } : {}, formula: d.parse.body, value: null, readings: [], uses: [], conflict: d.conflict, reason: d.conflict };
          }
          const readings = readingsOf(d.key);
          const top = readings[0];
          const uses = [...new Set(readings.flatMap((r) => r.uses))];
          return {
            ...base,
            kind: "step",
            key: d.key,
            n: d.n ?? null,
            ...d.letter ? { letter: d.letter } : {},
            formula: top?.formula ?? d.parse.body,
            value: top?.value ?? null,
            readings,
            uses,
            ...d.workedLine !== void 0 ? { worked: d.workedLine } : {},
            reason: stepReason(readings, nameIndex)
          };
        }
        case "heading": {
          const allowance = allowances.get(d.line);
          return { ...base, kind: "heading", title: d.title, ...allowance ? { allowance } : {}, reason: allowance ? allowance.reason : `${d.title}: kept as context for the lines under it` };
        }
        case "check": {
          const readings = evaluateChain(d.chain, done.scopeFor(void 0));
          return { ...base, kind: "check", value: readings[0]?.value ?? null, readings, reason: readings[0]?.reason ?? `cannot read \u201C${d.parse.body}\u201D` };
        }
        case "worked":
          return { ...base, kind: "worked", step: d.step, reason: `the worked line of ${who(d.step)}` };
        case "label": {
          const written = withUnit(d.written);
          const check2 = checkReadings(d.step, readingsOf(d.step), written);
          return { ...base, kind: "label", step: d.step, written, check: check2, reason: check2.reason };
        }
        case "value": {
          const written = withUnit(d.written);
          const matches = stepKeys.filter((k) => !cycles.has(k)).map((k) => checkReadings(k, readingsOf(k), written)).filter((c) => c.status === "ok" || c.status === "rounded" || c.status === "within" || c.status === "spans");
          return { ...base, kind: "value", written, matches, reason: matches.length ? matches.map((m) => m.reason).join("; ") : `${fmt(written)} agrees with no step here` };
        }
        default:
          return { ...base, kind: "note", reason: d.note ?? `cannot read \u201C${d.parse.body}\u201D` };
      }
    });
    return { entries, unit: unit2, unitReason };
  }
  function nameOf(r, readings) {
    return r.label ?? (readings.some((x) => x.label) ? "from the measurements" : `as ${r.formula}`);
  }
  function stepReason(readings, nameIndex) {
    const top = readings[0];
    if (!top) return "nothing to read";
    const parts = [top.reason];
    for (const b of top.bindings) {
      if (b.kind === "name" && !nameIndex.has(normName(b.subject))) parts.push(`${b.subject} is not on this sheet; the worked line puts ${fmt(b.value)} for it`);
    }
    for (const o of readings.slice(1)) parts.push(`or ${fmt(o.value)} ${nameOf(o, readings)}`);
    return parts.join("; ");
  }
  function checkReadings(key2, readings, w2) {
    const who = /^\d+$/.test(key2) ? `step ${key2}` : key2;
    const per = readings.map((r, index) => ({ index, value: r.value, ...pick2(compareQuantities(r.value, w2)) }));
    const out = (status, reason) => ({
      step: key2,
      written: w2,
      status,
      readings: per.map((p) => ({ index: p.index, status: p.status, value: p.value })),
      reason
    });
    if (!readings.length) return out("unknown", `${who} has no reading to check ${fmt(w2)} against`);
    if (isRange(w2) && readings.length >= 2) {
      const at = (v) => readings.findIndex((r) => r.value && !isRange(r.value) && compareQuantities(r.value, { ...w2, lo: v, hi: v }).status === "ok");
      const lo = at(w2.lo), hi = at(w2.hi);
      if (lo >= 0 && hi >= 0 && lo !== hi) {
        return out("spans", `${fmt(w2)} spans ${who}'s readings: ${fmt(readings[lo].value)} ${nameOf(readings[lo], readings)}, ${fmt(readings[hi].value)} ${nameOf(readings[hi], readings)}`);
      }
    }
    const good = (s) => s === "ok" || s === "rounded" || s === "within";
    if (good(per[0].status)) return out(per[0].status, `${fmt(w2)} is ${who}: ${per[0].reason}`);
    const other = per.find((p) => good(p.status));
    if (other) {
      const r = readings[other.index];
      return out(other.status, `${fmt(w2)} is ${who} ${nameOf(r, readings)} (${fmt(r.value)}), not its first reading (${fmt(readings[0].value)})`);
    }
    if (per.every((p) => p.status === "unknown")) return out("unknown", `${who} has no value to check ${fmt(w2)} against`);
    return out("off", `${who} is ${fmt(readings[0].value)}; written ${fmt(w2)}`);
  }
  function pick2(c) {
    return { status: c.status, reason: c.reason };
  }
  function sheetEntry(sheet, key2) {
    const k = key2.trim();
    const live = (e) => (e.kind === "definition" || e.kind === "step") && !e.conflict;
    const direct = sheet.entries.find((e) => live(e) && e.key === k);
    if (direct) return direct;
    const n2 = normName(k.replace(/^step\s+/i, "").replace(/[.)]$/, ""));
    return sheet.entries.find((e) => {
      if (!live(e)) return false;
      if (e.kind === "definition") return normName(e.key) === n2 || !!e.name && normName(e.name) === n2 || !!e.letter && normName(e.letter) === n2;
      return e.kind === "step" && normName(e.key) === n2;
    });
  }
  function sheetValue(sheet, key2) {
    const e = sheetEntry(sheet, key2);
    return e && (e.kind === "definition" || e.kind === "step") ? e.value : null;
  }
  function dependentsOf(sheet, key2) {
    const start = sheetEntry(sheet, key2);
    if (!start || start.kind !== "definition" && start.kind !== "step") return [];
    const steps = sheet.entries.filter((e) => e.kind === "step" && !e.conflict);
    const found = /* @__PURE__ */ new Set();
    const frontier = [start.key];
    while (frontier.length) {
      const k = frontier.pop();
      for (const s of steps) {
        if (s.uses.includes(k) && !found.has(s.key)) {
          found.add(s.key);
          frontier.push(s.key);
        }
      }
    }
    return steps.filter((s) => found.has(s.key)).map((s) => s.key);
  }
  function checkWritten(sheet, key2, written) {
    const e = sheetEntry(sheet, key2);
    if (!e || e.kind !== "step") return null;
    const q = typeof written === "string" ? parseQuantity(written)?.quantity : written;
    if (!q) return null;
    return checkReadings(e.key, e.readings, isBare(q) && sheet.unit ? { ...q, unit: sheet.unit, dim: 1 } : q);
  }
  var sig = (q) => q ? `${q.lo}|${q.hi}|${q.unit}|${q.dim}|${q.approx}` : "-";
  function entryKey(e) {
    switch (e.kind) {
      case "definition":
      case "step":
        return e.conflict ? null : e.key;
      case "heading":
        return `heading ${e.title}`;
      case "label":
      case "value":
      case "check":
        return `${e.kind} ${e.line}`;
      default:
        return null;
    }
  }
  function signature(e) {
    const readings = (rs) => rs.map((r) => [sig(r.value), r.label ?? "", r.formula, r.checks.map((c) => `${c.status}:${sig(c.computed)}`).join(",")].join(" ")).join(" / ");
    switch (e.kind) {
      case "definition":
        return sig(e.value);
      case "step":
      case "check":
        return readings(e.readings);
      case "heading":
        return e.allowance ? `${sig(e.allowance.amount)} ${e.allowance.from.join(",")}` : "";
      case "label":
        return e.check ? `${e.check.status} ${e.check.readings.map((r) => r.status).join(",")}` : "";
      case "value":
        return e.matches.map((m) => `${m.step}:${m.status}`).join(",");
      default:
        return "";
    }
  }
  function diffSheets(a, b) {
    const index = (s) => {
      const m = /* @__PURE__ */ new Map();
      for (const e of s.entries) {
        const k = entryKey(e);
        if (k !== null && !m.has(k)) m.set(k, signature(e));
      }
      return m;
    };
    const A = index(a), B = index(b);
    const out = [];
    for (const [k, v] of B) if (A.get(k) !== v) out.push(k);
    for (const k of A.keys()) if (!B.has(k)) out.push(k);
    return out;
  }
  function describeSheet(sheet) {
    const lines = [];
    for (const e of sheet.entries) {
      switch (e.kind) {
        case "definition":
          lines.push(e.conflict ? `${e.text} \u2014 ${e.conflict}` : `${[e.letter, e.name].filter(Boolean).join(" \xB7 ")} = ${fmt(e.value)}`);
          break;
        case "heading":
          lines.push(e.allowance ? `${e.title} \u2014 ${fmt(e.allowance.amount)}${e.allowance.from.length ? `, as ${stepsPhrase(e.allowance.from)} ${e.allowance.from.length === 1 ? "adds" : "add"} it` : ""}` : e.title);
          break;
        case "step": {
          if (e.conflict) {
            lines.push(`${e.text} \u2014 ${e.conflict}`);
            break;
          }
          const [top, ...rest] = e.readings;
          if (!top) break;
          const mark = (r) => {
            const off = r.checks.find((c) => c.status === "off");
            if (off) return ` \u2717 written ${fmt(off.written)}`;
            return r.checks.length && r.checks.every((c) => c.status !== "unknown") ? " \u2713" : "";
          };
          const head = e.n !== null ? `${e.n}.` : `${e.letter}.`;
          if (!top.value) {
            const why = [...top.notes, ...top.unknowns.map((u) => `${u} is not on this sheet`)].filter((x, i, xs) => xs.indexOf(x) === i);
            lines.push(`${head} ${top.formula} \u2014 ${why.join("; ") || "no value"}`);
            break;
          }
          lines.push(`${head} ${top.formula} = ${fmt(top.value)}${top.label ? ` ${top.label}` : ""}${mark(top)}${rest.map((r) => ` \xB7 or ${fmt(r.value)} ${nameOf(r, e.readings)}${mark(r)}`).join("")}`);
          break;
        }
        case "label":
        case "value":
        case "check":
          lines.push(`${e.text} \u2014 ${e.reason}`);
          break;
        default:
          break;
      }
    }
    return lines.join("\n");
  }

  // src/session/magnets.ts
  var MAGNET_SCREEN_PX = 14;
  var MAGNET_SIZE_FRACTION = 0.06;
  function magnetRadius(sizePx, scale = 1) {
    return Math.max(MAGNET_SCREEN_PX * scale, sizePx * MAGNET_SIZE_FRACTION);
  }
  var mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  function formOf(node, nodes) {
    const fp = fingerprintOf(node);
    const ink = strokePointsOf(node);
    if (!fp || !ink || ink.length < 2) return null;
    const reading = snapReading(node, nodes);
    const held = getRep(node, "clean") ? cleanPointsOf(node) : void 0;
    const ideal = held ?? (reading.ok ? idealize(node, reading.shape)?.points : void 0);
    if (ideal && ideal.length >= 2 && reading.shape) return { shape: reading.shape, points: ideal };
    return { shape: "ink", points: ink };
  }
  function magnetSites(node, nodes) {
    const form = formOf(node, nodes);
    if (!form) return [];
    const b = boundsOf(node) ?? getBounds(form.points);
    const w2 = b.maxX - b.minX, h2 = b.maxY - b.minY;
    const centre = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
    const out = [];
    const counts = {};
    const add2 = (kind, point2, why) => {
      const index = counts[kind] ?? 0;
      counts[kind] = index + 1;
      out.push({ nodeId: node.id, shape: form.shape, kind, index, point: point2, reasoning: why });
    };
    switch (form.shape) {
      case "line":
      case "arrow": {
        const arrow = getRep(node, "reading:arrow")?.data;
        const tail = form.shape === "arrow" && arrow?.tail ? arrow.tail : form.points[0];
        const tip = form.shape === "arrow" && arrow?.tip ? arrow.tip : form.points[form.points.length - 1];
        add2("tail", tail, `the ${form.shape}'s tail \u2014 where it begins`);
        add2("tip", tip, `the ${form.shape}'s tip \u2014 where it ends`);
        add2("middle", mid(tail, tip), "halfway along it");
        break;
      }
      case "rectangle": {
        const v = form.points.slice(0, 4);
        if (v.length === 4) {
          v.forEach((p) => add2("corner", p, "a corner of the rectangle"));
          for (let i = 0; i < 4; i++) add2("middle", mid(v[i], v[(i + 1) % 4]), "the middle of an edge");
        } else {
          boundsSites(add2, b);
        }
        add2("centre", centre, "the centre of the rectangle");
        break;
      }
      case "circle": {
        add2("centre", centre, "the centre of the circle");
        const rx = w2 / 2, ry = h2 / 2;
        const cardinals = [
          ["north", { x: centre.x, y: centre.y - ry }],
          ["east", { x: centre.x + rx, y: centre.y }],
          ["south", { x: centre.x, y: centre.y + ry }],
          ["west", { x: centre.x - rx, y: centre.y }]
        ];
        for (const [name, p] of cardinals) add2("cardinal", p, `the ${name} of the circle`);
        break;
      }
      case "triangle": {
        const v = form.points.slice(0, 3);
        if (v.length === 3) {
          v.forEach((p) => add2("corner", p, "a corner of the triangle"));
          add2("centre", { x: (v[0].x + v[1].x + v[2].x) / 3, y: (v[0].y + v[1].y + v[2].y) / 3 }, "the centroid");
        } else {
          boundsSites(add2, b);
        }
        break;
      }
      case "arc": {
        add2("tail", form.points[0], "where the arc begins");
        add2("tip", form.points[form.points.length - 1], "where the arc ends");
        add2("centre", centre, "the middle of the arc\u2019s span");
        break;
      }
      case "dot":
        add2("point", centre, "the dot");
        break;
      default:
        boundsSites(add2, b);
        add2("centre", centre, "the centre of the mark\u2019s bounds");
        break;
    }
    return out;
  }
  function boundsSites(add2, b) {
    add2("corner", { x: b.minX, y: b.minY }, "a corner of the mark\u2019s bounds");
    add2("corner", { x: b.maxX, y: b.minY }, "a corner of the mark\u2019s bounds");
    add2("corner", { x: b.maxX, y: b.maxY }, "a corner of the mark\u2019s bounds");
    add2("corner", { x: b.minX, y: b.maxY }, "a corner of the mark\u2019s bounds");
  }
  function nearestMagnet(at, sites, radius) {
    let best = null;
    for (const site of sites) {
      const distance = Math.hypot(site.point.x - at.x, site.point.y - at.y);
      if (distance > radius) continue;
      if (!best || distance < best.distance) best = { site, distance };
    }
    return best;
  }
  function magnetsNear(at, nodes, ids, radius, exclude) {
    const hits = [];
    for (const id of ids) {
      if (exclude?.has(id)) continue;
      const node = nodes.get(id);
      if (!node) continue;
      for (const site of magnetSites(node, nodes)) {
        const distance = Math.hypot(site.point.x - at.x, site.point.y - at.y);
        if (distance <= radius) hits.push({ site, distance });
      }
    }
    hits.sort((a, b) => a.distance - b.distance);
    return hits;
  }
  function describeMagnet(site) {
    const r = (v) => Math.round(v);
    return `${site.reasoning} at (${r(site.point.x)}, ${r(site.point.y)})`;
  }
  function onTheBoard(nodeId, nodes) {
    if (!nodes) return true;
    const n2 = nodes.get(nodeId);
    return !!n2 && !getRep(n2, "erased");
  }
  function bindingsOf(node, nodes) {
    const out = [];
    for (const e of node.edges) {
      if (e.rel !== "bound-to" || typeof e.end !== "string" || !e.site) continue;
      out.push({
        strokeId: node.id,
        end: e.end,
        nodeId: e.to,
        site: e.site,
        via: e.via,
        reasoning: e.reasoning,
        active: onTheBoard(e.to, nodes)
      });
    }
    return out;
  }
  function boundRepsOf(node) {
    return node.reps.filter((r) => r.modality === "bound").map((r) => r.data);
  }
  function activeBindingsOf(node, nodes) {
    return bindingsOf(node, nodes).filter((b) => b.active);
  }
  function boundToMark(nodeId, nodes, ids, opts = {}) {
    if (opts.active && !onTheBoard(nodeId, nodes)) return [];
    const out = [];
    for (const id of ids) {
      const n2 = nodes.get(id);
      if (!n2 || opts.active && getRep(n2, "erased")) continue;
      for (const b of bindingsOf(n2, nodes)) {
        if (b.nodeId !== nodeId) continue;
        if (opts.active && !b.active) continue;
        out.push(b);
      }
    }
    return out;
  }
  function describeBinding(b) {
    const where = `its ${b.end} on ${b.site.kind} ${b.site.index} of ${b.nodeId}`;
    return b.active ? where : `${where} \u2014 erased since`;
  }

  // src/session/erase.ts
  var DEFAULT_ERASE_CROSSINGS = 3;
  function segmentsIntersect(p1, p22, p3, p4) {
    const d = (p22.x - p1.x) * (p4.y - p3.y) - (p22.y - p1.y) * (p4.x - p3.x);
    if (Math.abs(d) < 1e-10) return false;
    const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
    const u = ((p3.x - p1.x) * (p22.y - p1.y) - (p3.y - p1.y) * (p22.x - p1.x)) / d;
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
    const add2 = (kind, from, to, strength, reasoning) => {
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
          add2("contains", a.id, b.id, strength, `${b.id} sits wholly inside ${a.id}`);
          add2("inside", b.id, a.id, strength, `${b.id} sits wholly inside ${a.id}`);
          continue;
        }
        if (boundsContain(bb, ab)) {
          const margin = Math.min(ab.minX - bb.minX, ab.minY - bb.minY, bb.maxX - ab.maxX, bb.maxY - ab.maxY);
          const strength = Math.min(1, 0.5 + margin / Math.max(1, sizeOf(bb)));
          add2("contains", b.id, a.id, strength, `${a.id} sits wholly inside ${b.id}`);
          add2("inside", a.id, b.id, strength, `${a.id} sits wholly inside ${b.id}`);
          continue;
        }
        const gap = boundingBoxDistance(ab, bb);
        if (a.points && b.points && boundsOverlap(ab, bb)) {
          const n2 = crossings(a.points, b.points);
          if (n2 > 0) {
            add2("crossing", a.id, b.id, Math.min(1, 0.5 + n2 * 0.15), `their strokes cross ${n2 === 4 ? "4 or more" : n2} time(s)`);
            add2("crossing", b.id, a.id, Math.min(1, 0.5 + n2 * 0.15), `their strokes cross ${n2 === 4 ? "4 or more" : n2} time(s)`);
          }
        }
        if (boundsOverlap(ab, bb)) {
          const depth2 = overlapFraction(ab.minX, ab.maxX, bb.minX, bb.maxX) * overlapFraction(ab.minY, ab.maxY, bb.minY, bb.maxY);
          add2("touching", a.id, b.id, 0.5 + depth2 * 0.5, "their areas overlap");
          add2("touching", b.id, a.id, 0.5 + depth2 * 0.5, "their areas overlap");
        }
        const nearLimit = config.nearRatio * ref;
        if (gap < nearLimit) {
          const strength = 1 - gap / nearLimit;
          const pct2 = Math.round(gap / ref * 100);
          add2("near", a.id, b.id, strength, `${Math.round(gap)}px apart \u2014 ${pct2}% of the smaller mark`);
          add2("near", b.id, a.id, strength, `${Math.round(gap)}px apart \u2014 ${pct2}% of the smaller mark`);
        }
        const vOverlap = overlapFraction(ab.minY, ab.maxY, bb.minY, bb.maxY);
        const hOverlap = overlapFraction(ab.minX, ab.maxX, bb.minX, bb.maxX);
        if (vOverlap >= config.directionOverlap) {
          const [left, right2] = cx(ab) <= cx(bb) ? [a, b] : [b, a];
          add2("left-of", left.id, right2.id, vOverlap, `they share a horizontal band (${Math.round(vOverlap * 100)}%)`);
          add2("right-of", right2.id, left.id, vOverlap, `they share a horizontal band (${Math.round(vOverlap * 100)}%)`);
        }
        if (hOverlap >= config.directionOverlap) {
          const [top, bottom2] = cy(ab) <= cy(bb) ? [a, b] : [b, a];
          add2("above", top.id, bottom2.id, hOverlap, `they share a vertical band (${Math.round(hOverlap * 100)}%)`);
          add2("below", bottom2.id, top.id, hOverlap, `they share a vertical band (${Math.round(hOverlap * 100)}%)`);
        }
        const dy = Math.abs(cy(ab) - cy(bb));
        const dx = Math.abs(cx(ab) - cx(bb));
        const rowTol = config.alignRatio * Math.max(1, Math.min(h(ab), h(bb)));
        const colTol = config.alignRatio * Math.max(1, Math.min(w(ab), w(bb)));
        if (dy < rowTol) {
          add2("same-row", a.id, b.id, 1 - dy / rowTol, `centres within ${Math.round(dy)}px vertically`);
          add2("same-row", b.id, a.id, 1 - dy / rowTol, `centres within ${Math.round(dy)}px vertically`);
        }
        if (dx < colTol) {
          add2("same-column", a.id, b.id, 1 - dx / colTol, `centres within ${Math.round(dx)}px horizontally`);
          add2("same-column", b.id, a.id, 1 - dx / colTol, `centres within ${Math.round(dx)}px horizontally`);
        }
        const ratio = Math.min(sizeOf(ab), sizeOf(bb)) / Math.max(1, Math.max(sizeOf(ab), sizeOf(bb)));
        if (ratio > config.peerRatio) {
          add2("same-size", a.id, b.id, ratio, `within ${Math.round((1 - ratio) * 100)}% of each other in size`);
          add2("same-size", b.id, a.id, ratio, `within ${Math.round((1 - ratio) * 100)}% of each other in size`);
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

  // src/maths/writing.ts
  var BAND_OVERLAP = 0.35;
  var COLUMN_GAP = 2.5;
  function textCodeOf(node) {
    for (let i = node.reps.length - 1; i >= 0; i--) {
      const r = node.reps[i];
      if (r.modality !== "code") continue;
      const d = r.data;
      return d.kind === "text" && typeof d.code === "string" ? d.code : void 0;
    }
    return void 0;
  }
  function wordsOnBoard(state, except) {
    const texts = [];
    const pieces = [];
    for (const id of state.contentIds) {
      if (except?.has(id)) continue;
      const node = state.nodes.get(id);
      if (!node || getRep(node, "erased")) continue;
      const b = boundsOf(node);
      if (!b) continue;
      if (state.artifacts.includes(id)) {
        const code = textCodeOf(node);
        if (code !== void 0) texts.push({ id, code, bounds: b });
        continue;
      }
      const text = transcriptOf(node)?.trim();
      if (text) pieces.push({ id, text, bounds: b });
    }
    return { texts, pieces };
  }
  function bandOverlap(a, b) {
    const o = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
    const shorter = Math.max(1, Math.min(a.maxY - a.minY, b.maxY - b.minY));
    return o / shorter;
  }
  function median(xs) {
    const s = xs.slice().sort((a, b) => a - b);
    return s.length ? s[Math.floor(s.length / 2)] : 0;
  }
  function writingBands(pieces) {
    const sorted = pieces.slice().sort((p, q) => p.bounds.minY + p.bounds.maxY - (q.bounds.minY + q.bounds.maxY));
    const bands2 = [];
    for (const p of sorted) {
      const band = bands2.find((bd) => bd.some((o) => bandOverlap(o.bounds, p.bounds) >= BAND_OVERLAP));
      if (band) band.push(p);
      else bands2.push([p]);
    }
    for (const band of bands2) band.sort((p, q) => p.bounds.minX - q.bounds.minX);
    return bands2;
  }
  function bandHeight(band) {
    return Math.max(1, median(band.map((p) => p.bounds.maxY - p.bounds.minY)));
  }
  function bandPhrases(band) {
    const h2 = bandHeight(band);
    const out = [];
    for (const p of band) {
      const last = out[out.length - 1];
      if (last && p.bounds.minX - last[last.length - 1].bounds.maxX <= COLUMN_GAP * h2) last.push(p);
      else out.push([p]);
    }
    return out;
  }
  function boundsOfAll(boxes) {
    return {
      minX: Math.min(...boxes.map((b) => b.minX)),
      maxX: Math.max(...boxes.map((b) => b.maxX)),
      minY: Math.min(...boxes.map((b) => b.minY)),
      maxY: Math.max(...boxes.map((b) => b.maxY))
    };
  }

  // src/maths/dimension.ts
  var LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var vName = (i) => LETTERS[i % 26] ?? `V${i}`;
  var dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  var mid2 = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  function angleAt2(prev, v, next) {
    const a = Math.atan2(prev.y - v.y, prev.x - v.x);
    const b = Math.atan2(next.y - v.y, next.x - v.x);
    let d = Math.abs(a - b);
    if (d > Math.PI) d = 2 * Math.PI - d;
    return d * 180 / Math.PI;
  }
  function polygonArea(v) {
    let s = 0;
    for (let i = 0; i < v.length; i++) {
      const a = v[i], b = v[(i + 1) % v.length];
      s += a.x * b.y - b.x * a.y;
    }
    return Math.abs(s) / 2;
  }
  function centroid(v) {
    return { x: v.reduce((a, p) => a + p.x, 0) / v.length, y: v.reduce((a, p) => a + p.y, 0) / v.length };
  }
  function sizeOfFigure(f) {
    const b = boundsOfAll(f.outline.map((p) => ({ minX: p.x, maxX: p.x, minY: p.y, maxY: p.y })));
    return Math.max(b.maxX - b.minX, b.maxY - b.minY);
  }
  function polygonFigure(vertices, opts) {
    const v = vertices.map((p) => ({ x: p.x, y: p.y }));
    const n2 = v.length;
    const kind = opts.kind ?? (n2 === 3 ? "triangle" : n2 === 4 ? "quadrilateral" : "polygon");
    const all = opts.ids ? [...opts.ids] : [...new Set((opts.sideIds ?? []).flat())];
    const sides = v.map((p, i) => {
      const q = v[(i + 1) % n2];
      return {
        key: `side${i}`,
        label: `side ${vName(i)}${vName((i + 1) % n2)}`,
        from: p,
        to: q,
        length: dist(p, q),
        ids: opts.sideIds?.[i] ? [...opts.sideIds[i]] : all.slice()
      };
    });
    const angles = v.map((p, i) => angleAt2(v[(i - 1 + n2) % n2], p, v[(i + 1) % n2]));
    return {
      id: opts.id,
      kind,
      ids: all,
      vertices: v,
      sides,
      angles,
      closed: true,
      outline: [...v, v[0]],
      reason: opts.reason ?? `${n2} corners, joined`
    };
  }
  function circleOutline(c, r, n2 = 48) {
    const out = [];
    for (let i = 0; i <= n2; i++) {
      const a = i / n2 * Math.PI * 2;
      out.push({ x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) });
    }
    return out;
  }
  function figureOfMark(node, nodes) {
    const fp = fingerprintOf(node);
    if (!fp || transcriptOf(node) || getRep(node, "word-run")) return null;
    const snap = snapReading(node, nodes);
    const shape = snap.shape;
    const held = getRep(node, "clean") ? cleanPointsOf(node) : void 0;
    const ideal = held ?? (() => {
      const i = idealize(node, shape);
      return i ? placed(node, i.points) : void 0;
    })();
    if (!ideal || ideal.length < 2) return null;
    const why = `one stroke read as a ${shape} (${snap.reasoning})`;
    const id = node.id;
    switch (shape) {
      case "triangle":
        if (ideal.length < 3) return null;
        return polygonFigure(ideal.slice(0, 3), { id, ids: [id], reason: why });
      case "rectangle":
        if (ideal.length < 4) return null;
        return polygonFigure(ideal.slice(0, 4), { id, ids: [id], kind: "rectangle", reason: why });
      case "circle": {
        const b = boundsOfAll(ideal.map((p) => ({ minX: p.x, maxX: p.x, minY: p.y, maxY: p.y })));
        const w2 = b.maxX - b.minX, h2 = b.maxY - b.minY;
        if (Math.min(w2, h2) / Math.max(1e-6, w2, h2) <= 0.85) return null;
        const r = (w2 + h2) / 4;
        const c = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
        const east = { x: c.x + r, y: c.y }, west = { x: c.x - r, y: c.y };
        return {
          id,
          kind: "circle",
          ids: [id],
          vertices: [c],
          sides: [
            { key: "radius", label: "the radius", from: c, to: east, length: r, ids: [id] },
            { key: "diameter", label: "the diameter", from: west, to: east, length: 2 * r, ids: [id] }
          ],
          centre: c,
          radius: r,
          closed: true,
          outline: circleOutline(c, r),
          reason: why
        };
      }
      case "line":
      case "arrow": {
        const arrow = getRep(node, "reading:arrow")?.data;
        const from = shape === "arrow" && arrow?.tail ? arrow.tail : ideal[0];
        const to = shape === "arrow" && arrow?.tip ? arrow.tip : shape === "arrow" ? ideal[1] : ideal[ideal.length - 1];
        return {
          id,
          kind: "line",
          ids: [id],
          vertices: [from, to],
          sides: [{ key: "length", label: "the length", from, to, length: dist(from, to), ids: [id] }],
          closed: false,
          outline: [from, to],
          reason: why
        };
      }
      case "arc": {
        const a = ideal[0], c = ideal[ideal.length - 1];
        const chord = dist(a, c);
        if (chord < 1e-6) return null;
        let bulge = ideal[Math.floor(ideal.length / 2)], rise = -1;
        for (const p of ideal) {
          const d = Math.abs((c.x - a.x) * (p.y - a.y) - (c.y - a.y) * (p.x - a.x)) / chord;
          if (d > rise) {
            rise = d;
            bulge = p;
          }
        }
        if (rise <= 1e-6) return null;
        const r = chord * chord / (8 * rise) + rise / 2;
        const m = mid2(a, c);
        const toBulge = { x: (bulge.x - m.x) / rise, y: (bulge.y - m.y) / rise };
        const centre = { x: bulge.x - toBulge.x * r, y: bulge.y - toBulge.y * r };
        let arcLength = 0;
        for (let i = 1; i < ideal.length; i++) arcLength += dist(ideal[i], ideal[i - 1]);
        const foot = { x: m.x, y: m.y };
        return {
          id,
          kind: "arc",
          ids: [id],
          vertices: [a, c, bulge],
          sides: [
            { key: "chord", label: "the chord", from: a, to: c, length: chord, ids: [id] },
            { key: "rise", label: "the rise", from: foot, to: bulge, length: rise, ids: [id] }
          ],
          centre,
          radius: r,
          rise,
          arcLength,
          closed: false,
          outline: ideal.slice(),
          reason: why
        };
      }
      default:
        return null;
    }
  }
  var MEASURE_WORDS = {
    r: "radius",
    rad: "radius",
    radius: "radius",
    d: "diameter",
    dia: "diameter",
    diam: "diameter",
    diameter: "diameter",
    "\xF8": "diameter",
    c: "circumference",
    circ: "circumference",
    circumference: "circumference",
    girth: "circumference",
    round: "circumference",
    waist: "circumference",
    hip: "circumference",
    hips: "circumference",
    bust: "circumference",
    chest: "circumference",
    neck: "circumference",
    head: "circumference",
    area: "area",
    p: "perimeter",
    perim: "perimeter",
    perimeter: "perimeter",
    diag: "diagonal",
    diagonal: "diagonal",
    rise: "rise",
    sagitta: "rise",
    chord: "chord",
    span: "chord",
    w: "width",
    width: "width",
    wide: "width",
    h: "height",
    height: "height",
    high: "height",
    tall: "height",
    l: "length",
    len: "length",
    length: "length",
    hyp: "long",
    hypotenuse: "long",
    arc: "arc"
  };
  var ANGLE = /^(?:∠\s*)?(?:([A-Za-z]{1,2})\s*=?\s*)?(\d+(?:\.\d+)?)\s*(?:°|º|deg\b\.?|degrees?\b)$/i;
  var DIAMETER_SIGN = /^[⌀Øø]\s*/;
  function readNumber(text) {
    const s = text.replace(/[  -​ 　]/g, " ").trim();
    if (!s) return null;
    const ang = ANGLE.exec(s);
    if (ang) {
      const digits = ang[2].split(".")[1]?.length ?? 0;
      const v = quantity(Number(ang[2]), null, { precision: 10 ** -digits });
      return { value: v, angle: true, ...ang[1] ? { name: ang[1] } : {}, reason: `${formatNumber(v.lo)}\xB0, an angle` };
    }
    const dia = DIAMETER_SIGN.exec(s);
    const body = dia ? s.slice(dia[0].length) : s;
    const p = parseLine(body);
    if (p.label?.kind === "letter") return null;
    let out = null;
    if (p.shape === "value" && p.value) {
      out = { value: p.value, reason: formatQuantity(p.value) };
      if (p.label?.kind === "step") {
        out.step = p.label.n;
        out.reason = `${formatQuantity(p.value)}, the value of step ${p.label.n}`;
      }
    } else if (p.shape === "definition" && p.value && !p.label && !dia) {
      const measure2 = MEASURE_WORDS[normName(p.name ?? "")];
      out = {
        value: p.value,
        name: p.name,
        ...measure2 ? { measure: measure2 } : {},
        reason: `${formatQuantity(p.value)}, named ${p.name}${measure2 ? ` \u2014 ${measure2 === "long" ? "the long side" : `a ${measure2}`}` : ""}`
      };
    }
    if (!out || out.value.lo < 0) return null;
    if (dia) {
      out.measure = "diameter";
      out.name = dia[0].trim();
      out.reason = `${formatQuantity(out.value)}, written as a diameter`;
    }
    return out;
  }
  var centreOf = (b) => ({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 });
  function numbersOf(state) {
    const { texts, pieces } = wordsOnBoard(state);
    const out = [];
    for (const t of texts) {
      const rows = t.code.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
      if (rows.length !== 1) continue;
      const reading = readNumber(rows[0]);
      if (reading) out.push({ id: t.id, ids: [t.id], from: "text", text: rows[0], bounds: t.bounds, centre: centreOf(t.bounds), reading });
    }
    for (const band of writingBands(pieces)) {
      for (const phrase of bandPhrases(band)) {
        const text = phrase.map((p) => p.text).join(" ").replace(/(\d)\s+(["″”'′])/g, "$1$2");
        const reading = readNumber(text);
        if (!reading) continue;
        const bounds = boundsOfAll(phrase.map((p) => p.bounds));
        out.push({ id: phrase[0].id, ids: phrase.map((p) => p.id), from: "writing", text, bounds, centre: centreOf(bounds), reading });
      }
    }
    return out;
  }
  function distToSegment(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    if (l2 < 1e-12) return dist(p, a);
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }
  function crossAt(a, b, c, d) {
    const r = { x: b.x - a.x, y: b.y - a.y }, s = { x: d.x - c.x, y: d.y - c.y };
    const den = r.x * s.y - r.y * s.x;
    if (Math.abs(den) < 1e-12) return null;
    const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / den;
    const u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null;
  }
  function distToOutline(p, outline) {
    let best = Infinity;
    for (let i = 1; i < outline.length; i++) best = Math.min(best, distToSegment(p, outline[i - 1], outline[i]));
    return outline.length === 1 ? dist(p, outline[0]) : best;
  }
  function insidePolygon(p, v) {
    let inside = false;
    for (let i = 0, j = v.length - 1; i < v.length; j = i++) {
      if (v[i].y > p.y !== v[j].y > p.y && p.x < (v[j].x - v[i].x) * (p.y - v[i].y) / (v[j].y - v[i].y) + v[i].x) inside = !inside;
    }
    return inside;
  }
  function insideFigure(f, p) {
    if (!f.closed) return false;
    if (f.kind === "circle" && f.centre && f.radius) return dist(p, f.centre) < f.radius;
    return insidePolygon(p, f.vertices);
  }
  function areaOfFigure(f) {
    if (f.kind === "circle" && f.radius) return Math.PI * f.radius * f.radius;
    return polygonArea(f.vertices);
  }
  var SQUARE_MAX = 0.5;
  var SQUARE_SLACK = 0.25;
  var SQUARE_STRAIGHT = 0.8;
  function squareInCorner(f, k, pts) {
    const n2 = f.vertices.length;
    const v = f.vertices[k], next = f.vertices[(k + 1) % n2], prev = f.vertices[(k - 1 + n2) % n2];
    const l1 = dist(v, next), l2 = dist(v, prev);
    if (l1 < 1e-6 || l2 < 1e-6 || pts.length < 3) return false;
    const u1 = { x: (next.x - v.x) / l1, y: (next.y - v.y) / l1 };
    const u2 = { x: (prev.x - v.x) / l2, y: (prev.y - v.y) / l2 };
    const det = u1.x * u2.y - u1.y * u2.x;
    if (Math.abs(det) < 0.2) return false;
    const ab = pts.map((p) => {
      const dx = p.x - v.x, dy = p.y - v.y;
      return { a: (dx * u2.y - dy * u2.x) / det, b: (u1.x * dy - u1.y * dx) / det };
    });
    const s = Math.max(...ab.map((q) => Math.max(q.a, q.b)));
    if (!(s > 0) || s > SQUARE_MAX * Math.min(l1, l2)) return false;
    if (ab.some((q) => q.a < -SQUARE_SLACK * s || q.b < -SQUARE_SLACK * s)) return false;
    if (!ab.some((q) => Math.min(q.a, q.b) <= SQUARE_SLACK * s)) return false;
    if (!ab.some((q) => Math.min(q.a, q.b) >= (1 - SQUARE_SLACK) * s)) return false;
    const off = ab.filter((q) => Math.min(q.a, q.b) > SQUARE_SLACK * s);
    const straight = off.filter((q) => Math.max(q.a, q.b) >= SQUARE_STRAIGHT * s).length;
    return off.length > 0 && straight >= 0.9 * off.length;
  }
  var UNDERLINE_SPAN = 2.5;
  var UNDERLINE_SLOPE = 0.36;
  function touchesFigure(p, g) {
    return distToOutline(p, g.outline) <= magnetRadius(sizeOfFigure(g));
  }
  function crossesFigure(a, b, g) {
    for (let i = 1; i < g.outline.length; i++) if (crossAt(a, b, g.outline[i - 1], g.outline[i]) !== null) return true;
    return false;
  }
  function underlineOf(num2, line, others) {
    const s = line.sides[0];
    const dx = s.to.x - s.from.x, dy = s.to.y - s.from.y;
    if (Math.abs(dy) > UNDERLINE_SLOPE * Math.abs(dx)) return null;
    const nb = num2.bounds;
    const nw = Math.max(1, nb.maxX - nb.minX), nh = Math.max(1, nb.maxY - nb.minY);
    const y = (s.from.y + s.to.y) / 2;
    if (y < num2.centre.y || y > nb.maxY + nh) return null;
    const x0 = Math.min(s.from.x, s.to.x), x1 = Math.max(s.from.x, s.to.x);
    const overlap = Math.min(x1, nb.maxX) - Math.max(x0, nb.minX);
    if (overlap < 0.5 * Math.min(x1 - x0, nw)) return null;
    if (s.length > UNDERLINE_SPAN * nw) return null;
    for (const g of others) {
      if (g === line) continue;
      if (touchesFigure(s.from, g) || touchesFigure(s.to, g) || crossesFigure(s.from, s.to, g)) return null;
    }
    return `a short line under ${num2.text} that reaches no other mark: its underline, not an edge`;
  }
  function withParts(f, others) {
    if (f.kind === "circle" || f.kind === "arc") return f;
    const sides = f.sides.map((side) => {
      const L = side.length;
      if (L < 1e-6) return side;
      const tol = magnetRadius(L);
      const ts = [];
      const along = (p) => ((p.x - side.from.x) * (side.to.x - side.from.x) + (p.y - side.from.y) * (side.to.y - side.from.y)) / (L * L);
      for (const g of others) {
        if (g === f || g.ids.some((id) => f.ids.includes(id))) continue;
        const points = g.kind === "line" ? g.vertices : g.kind === "circle" || g.kind === "arc" ? [] : g.vertices;
        for (const p of points) if (distToSegment(p, side.from, side.to) <= tol) ts.push(along(p));
        if (g.kind === "line") {
          const t = crossAt(side.from, side.to, g.vertices[0], g.vertices[1]);
          if (t !== null) ts.push(t);
        }
      }
      const interior = ts.filter((t) => t * L > tol && (1 - t) * L > tol).sort((a, b) => a - b);
      const cuts = [];
      for (const t of interior) if (!cuts.length || (t - cuts[cuts.length - 1]) * L > tol) cuts.push(t);
      if (!cuts.length) return side;
      const at = (t) => ({ x: side.from.x + (side.to.x - side.from.x) * t, y: side.from.y + (side.to.y - side.from.y) * t });
      const stops = [0, ...cuts, 1];
      const parts = [];
      for (let i = 0; i < stops.length - 1; i++) {
        const a = at(stops[i]), b = at(stops[i + 1]);
        parts.push({ key: `${side.key}.part${i}`, label: `part ${i + 1} of ${stops.length - 1} along ${side.label}`, from: a, to: b, length: dist(a, b) });
      }
      return { ...side, parts };
    });
    return { ...f, sides };
  }
  var ATTACH_FLOOR = 0.3;
  var PIECE_CONFIDENCE = 0.5;
  var ACROSS_THE_FIGURE = 0.1;
  var pct = (x) => `${Math.round(x * 100)}%`;
  function squareWord(alignment) {
    return alignment >= 0.9 ? "square to it" : alignment >= 0.6 ? "a little off square" : "well off square";
  }
  function segmentCandidate(num2, f, seg2, kind) {
    const L = seg2.length;
    if (L < 1e-6) return null;
    const p = num2.centre;
    const m = mid2(seg2.from, seg2.to);
    const d = dist(p, m);
    const u = { x: (seg2.to.x - seg2.from.x) / L, y: (seg2.to.y - seg2.from.y) / L };
    const across = (p.x - m.x) * -u.y + (p.y - m.y) * u.x;
    const offset = d / L;
    const alignment = d < 1e-9 ? 1 : Math.abs(across) / d;
    let confidence = 1 / (1 + 4 * offset * offset) * (0.4 + 0.6 * alignment);
    let facing = true;
    if (f.closed && kind !== "measure") {
      const c = centroid(f.vertices);
      const inward = (c.x - m.x) * -u.y + (c.y - m.y) * u.x;
      facing = across * inward < 0;
      if (!facing) confidence *= ACROSS_THE_FIGURE;
    }
    const whose = f.kind === "line" ? `${seg2.label} of the line` : `${seg2.label} of the ${f.kind}`;
    const reason = facing ? `${whose}: ${pct(offset)} of its length from its middle, ${squareWord(alignment)}` : `${whose}, seen from across the ${f.kind}: ${pct(offset)} of its length from its middle`;
    return { figure: f.id, kind, key: seg2.key, label: seg2.label, confidence, offset, alignment, reason };
  }
  function rimCandidates(num2, f) {
    if (!f.centre || !f.radius) return [];
    const offset = Math.abs(dist(num2.centre, f.centre) - f.radius) / f.radius;
    const confidence = 1 / (1 + 4 * offset * offset);
    const base = `${pct(offset)} of the radius from the circle's rim`;
    return ["radius", "diameter"].map((key2) => ({
      figure: f.id,
      kind: "measure",
      key: key2,
      label: `the ${key2}`,
      confidence,
      offset,
      alignment: 1,
      reason: `the ${key2} of the circle: ${base}`
    }));
  }
  function namedKeys(f, measure2) {
    const side = (k) => f.sides.find((s) => s.key === k);
    const horizontal = (s) => Math.abs(s.to.x - s.from.x) >= Math.abs(s.to.y - s.from.y);
    switch (f.kind) {
      case "circle":
        if (measure2 === "radius" || measure2 === "diameter") return [{ key: measure2, label: `the ${measure2}` }];
        if (measure2 === "circumference" || measure2 === "area") return [{ key: measure2, label: `the ${measure2}` }];
        return [];
      case "arc":
        if (measure2 === "chord" || measure2 === "width") return [{ key: "chord", label: "the chord", segment: side("chord") }];
        if (measure2 === "rise" || measure2 === "height") return [{ key: "rise", label: "the rise", segment: side("rise") }];
        if (measure2 === "radius") return [{ key: "radius", label: "the radius" }];
        if (measure2 === "arc" || measure2 === "length") return [{ key: "arc", label: "the arc" }];
        return [];
      case "line":
        return [{ key: "length", label: "the length", segment: side("length") }];
      case "rectangle": {
        if (measure2 === "width") return f.sides.filter(horizontal).map((s) => ({ key: s.key, label: s.label, segment: s }));
        if (measure2 === "height") return f.sides.filter((s) => !horizontal(s)).map((s) => ({ key: s.key, label: s.label, segment: s }));
        if (measure2 === "diagonal" || measure2 === "area" || measure2 === "perimeter") return [{ key: measure2, label: `the ${measure2}` }];
        return [];
      }
      default: {
        if (measure2 === "area" || measure2 === "perimeter") return [{ key: measure2, label: `the ${measure2}` }];
        if (measure2 === "long" && f.kind === "triangle") {
          let long = f.sides[0];
          for (const s of f.sides) if (s.length > long.length) long = s;
          return [{ key: long.key, label: long.label, segment: long }];
        }
        return [];
      }
    }
  }
  function candidatesFor(num2, figures) {
    const p = num2.centre;
    const out = [];
    const reading = num2.reading;
    if (reading.angle) {
      for (const f of figures) {
        if (f.kind === "circle" || f.kind === "arc" || f.kind === "line") continue;
        const n2 = f.vertices.length;
        f.vertices.forEach((v, k) => {
          const next = f.vertices[(k + 1) % n2], prev = f.vertices[(k - 1 + n2) % n2];
          const shorter = Math.min(dist(v, next), dist(v, prev));
          if (shorter < 1e-6) return;
          const offset = dist(p, v) / shorter;
          const within = insideFigure(f, p);
          const confidence = 1 / (1 + 4 * offset * offset) * (within ? 1 : 0.5);
          out.push({
            figure: f.id,
            kind: "angle",
            key: `angle${k}`,
            label: `the angle at ${vName(k)}`,
            confidence,
            offset,
            reason: `the angle at ${vName(k)} of the ${f.kind}: ${pct(offset)} of its shorter side from the corner, ${within ? "inside it" : "outside it"}`
          });
        });
      }
      return out.sort((a, b) => b.confidence - a.confidence);
    }
    if (reading.measure) {
      for (const f of figures) {
        for (const k of namedKeys(f, reading.measure)) {
          if (k.segment) {
            const c = segmentCandidate(num2, f, { key: k.key, label: k.label, from: k.segment.from, to: k.segment.to, length: k.segment.length }, "measure");
            if (c) out.push({ ...c, reason: `${c.reason}, as its name says` });
            continue;
          }
          const size = Math.max(1, sizeOfFigure(f));
          const d = insideFigure(f, p) ? 0 : distToOutline(p, f.outline);
          const offset = d / size;
          const confidence = 1 / (1 + 4 * offset * offset);
          out.push({
            figure: f.id,
            kind: "measure",
            key: k.key,
            label: k.label,
            confidence,
            offset,
            reason: `${k.label} of the ${f.kind}, as its name says: ${d === 0 ? "written inside it" : `${pct(offset)} of its size from it`}`
          });
        }
      }
      if (out.some((c) => c.confidence >= ATTACH_FLOOR)) return out.sort((a, b) => b.confidence - a.confidence);
      out.length = 0;
    }
    const containing = figures.filter((f) => insideFigure(f, p));
    const inner = containing.slice().sort((a, b) => areaOfFigure(a) - areaOfFigure(b))[0];
    for (const f of figures) {
      if (containing.includes(f)) continue;
      if (f.kind === "circle") {
        out.push(...rimCandidates(num2, f));
        continue;
      }
      for (const s of f.sides) {
        const c = segmentCandidate(num2, f, s, "side");
        if (c) out.push(c);
        for (const part of s.parts ?? []) {
          const pc = segmentCandidate(num2, f, part, "part");
          if (pc) out.push(pc);
        }
      }
    }
    if (inner) {
      out.push({
        figure: inner.id,
        kind: "piece",
        key: "piece",
        label: `the ${inner.kind}'s piece label`,
        confidence: PIECE_CONFIDENCE,
        reason: `inside the ${inner.kind}: a piece label, not one of its dimensions`
      });
    }
    return out.sort((a, b) => b.confidence - a.confidence);
  }
  function kindWord(figures, id) {
    return figures.find((f) => f.id === id)?.kind ?? "mark";
  }
  function attachNumber(num2, figures) {
    const candidates = candidatesFor(num2, figures);
    const top = candidates[0];
    const runnerUp = candidates.find((c, i) => i > 0 && !(c.figure === top?.figure && c.key === top?.key));
    const next = (c) => c ? `; next: ${c.label} of the ${kindWord(figures, c.figure)}${c.offset !== void 0 ? `, ${pct(c.offset)} away` : ""}` : "";
    if (!top || top.confidence < ATTACH_FLOOR) {
      return {
        number: num2,
        as: "free",
        confidence: top?.confidence ?? 0,
        candidates,
        ...top ? { runnerUp: top } : {},
        reason: `${num2.text} is beside no mark${top ? `: the nearest is ${top.reason}` : ""}`
      };
    }
    const as = top.kind === "piece" ? "piece" : top.kind === "angle" ? "angle" : "dimension";
    let reason;
    if (as === "piece") reason = `${num2.text} is ${top.reason}${next(runnerUp)}`;
    else {
      reason = `${num2.text} labels ${top.reason}`;
      const tie = runnerUp && runnerUp.figure === top.figure && Math.abs(runnerUp.confidence - top.confidence) < 1e-9;
      if (tie && top.key === "radius" && runnerUp.key === "diameter") reason += `; nothing written says whether it is the radius or the diameter`;
      reason += next(runnerUp);
    }
    return { number: num2, as, figure: top.figure, key: top.key, confidence: top.confidence, candidates, ...runnerUp ? { runnerUp } : {}, reason };
  }
  var TO_SCALE_WITHIN = 0.1;
  function inkMeasure(f, key2) {
    const [base, part] = key2.split(".");
    const side = f.sides.find((s) => s.key === base);
    if (side && part) return side.parts?.find((p) => p.key === key2)?.length ?? null;
    if (side) return side.length;
    const angle = /^angle(\d+)$/.exec(key2);
    if (angle) return f.angles?.[Number(angle[1])] ?? null;
    const sum = f.sides.reduce((a, s) => a + s.length, 0);
    switch (key2) {
      case "radius":
        return f.radius ?? null;
      case "diameter":
        return f.radius ? 2 * f.radius : null;
      case "circumference":
        return f.radius ? 2 * Math.PI * f.radius : null;
      case "area":
        return f.kind === "circle" ? f.radius ? Math.PI * f.radius ** 2 : null : f.closed ? polygonArea(f.vertices) : null;
      case "perimeter":
        return f.kind === "circle" ? f.radius ? 2 * Math.PI * f.radius : null : f.closed ? sum : null;
      case "diagonal":
        return f.kind === "rectangle" || f.kind === "quadrilateral" ? dist(f.vertices[0], f.vertices[2]) : null;
      case "arc":
        return f.arcLength ?? null;
      default:
        return null;
    }
  }
  function isLengthKey(key2) {
    return !/^angle\d+$/.test(key2) && key2 !== "area" && key2 !== "piece";
  }
  var UNIT_NAMES2 = { in: "inches", ft: "feet", cm: "centimetres", mm: "millimetres", m: "metres" };
  function scaleOf(labels, unit2) {
    const ratios = [];
    const counted = /* @__PURE__ */ new Set();
    for (const { figure, label } of labels) {
      if (label.declared || !isLengthKey(label.key) || isRange(label.value) || label.value.dim !== (unit2 ? 1 : label.value.dim)) continue;
      if (label.number) {
        if (counted.has(label.number)) continue;
        counted.add(label.number);
      }
      const ink = inkMeasure(figure, label.key);
      if (!ink || ink <= 0) continue;
      const v = unit2 && label.value.unit && label.value.unit !== unit2 ? convertQuantity(label.value, unit2).quantity : label.value;
      if (!(v.lo > 0)) continue;
      ratios.push({ figure: figure.id, key: label.key, text: label.text, r: v.lo / ink });
    }
    if (!ratios.length) return null;
    const sorted = ratios.map((x) => x.r).sort((a, b) => a - b);
    const h2 = Math.floor(sorted.length / 2);
    const scale = sorted.length % 2 ? sorted[h2] : (sorted[h2 - 1] + sorted[h2]) / 2;
    let worst = ratios[0], spread2 = 0;
    for (const x of ratios) {
      const off = Math.abs(x.r / scale - 1);
      if (off > spread2) {
        spread2 = off;
        worst = x;
      }
    }
    const px = 1 / scale;
    const one = `1${unit2 ? unitSuffix(unit2, 1) : ""} \u2248 ${formatNumber(px)} px`;
    const toScale = spread2 <= TO_SCALE_WITHIN;
    let reason;
    if (ratios.length === 1) reason = `one label sets the scale, ${one}; nothing to check it against`;
    else if (toScale) reason = `${one}, to scale within ${Math.max(1, Math.ceil(spread2 * 100 - 1e-9))}%`;
    else reason = `${one}; not to scale; the labels rule (${worst.text} on ${worst.key} is ${pct(spread2)} off the ink)`;
    return {
      unit: unit2,
      unitsPerCanvasUnit: scale,
      pxPerUnit: px,
      labels: ratios.length,
      spread: spread2,
      toScale,
      ...ratios.length > 1 ? { worst: { figure: worst.figure, key: worst.key, text: worst.text, off: spread2 } } : {},
      reason
    };
  }
  function contentMarks(state) {
    const out = [];
    for (const id of state.contentIds) {
      if (state.artifacts.includes(id)) continue;
      const n2 = state.nodes.get(id);
      if (n2 && !getRep(n2, "erased")) out.push(n2);
    }
    return out;
  }
  function dimensionsOf(state, options = {}) {
    const nodes = state.nodes;
    const numbers = numbersOf(state);
    const numberMarks = new Set(numbers.flatMap((n2) => n2.ids));
    const marks = contentMarks(state).filter((n2) => !numberMarks.has(n2.id));
    const given = options.figures ?? [];
    const covered = new Set(given.flatMap((f) => f.ids));
    let figures = [...given];
    for (const n2 of marks) {
      if (covered.has(n2.id)) continue;
      const f = figureOfMark(n2, nodes);
      if (f) figures.push(f);
    }
    const rightAngles = [];
    const declaring = /* @__PURE__ */ new Set();
    for (const f of figures) {
      if (f.kind !== "triangle" && f.kind !== "quadrilateral" && f.kind !== "polygon") continue;
      for (const n2 of marks) {
        if (f.ids.includes(n2.id) || declaring.has(n2.id)) continue;
        const pts = strokePointsOf(n2);
        if (!pts) continue;
        const k = f.vertices.findIndex((_, i) => squareInCorner(f, i, pts));
        if (k < 0) continue;
        declaring.add(n2.id);
        rightAngles.push({ figure: f.id, vertex: k, ids: [n2.id], reason: `a small square in the corner at ${vName(k)} declares it right` });
      }
    }
    figures = figures.filter((f) => !f.ids.some((id) => declaring.has(id)));
    const underlines = [];
    for (const num2 of numbers) {
      for (const f of figures) {
        if (f.kind !== "line" || f.ids.length !== 1 || underlines.some((u) => u.ids[0] === f.ids[0])) continue;
        const why = underlineOf(num2, f, figures);
        if (why) underlines.push({ ids: [...f.ids], number: num2.id, reason: why });
      }
    }
    const underlined = new Set(underlines.flatMap((u) => u.ids));
    figures = figures.filter((f) => !f.ids.some((id) => underlined.has(id)));
    figures = figures.map((f) => withParts(f, figures));
    const attachments = numbers.map((num2) => attachNumber(num2, figures));
    const numberIds = /* @__PURE__ */ new Set();
    for (const a of attachments) if (a.as !== "free") a.number.ids.forEach((id) => numberIds.add(id));
    const raw = /* @__PURE__ */ new Map();
    const push = (fid, l) => (raw.get(fid) ?? raw.set(fid, []).get(fid)).push(l);
    for (const a of attachments) {
      if (a.as !== "dimension" && a.as !== "angle") continue;
      const top = a.candidates[0];
      const tied = a.candidates.filter((c) => c.figure === top.figure && c.kind !== "piece" && Math.abs(c.confidence - top.confidence) < 1e-9);
      for (const c of tied) {
        push(c.figure, {
          key: c.key,
          value: a.number.reading.value,
          text: a.number.text,
          shown: formatQuantity(a.number.reading.value),
          ...a.number.reading.name ? { name: a.number.reading.name } : {},
          ids: [...a.number.ids],
          number: a.number.id,
          confidence: c.confidence,
          ...a.number.reading.step !== void 0 ? { step: a.number.reading.step } : {},
          reason: c === top ? a.reason : `${a.number.text} labels ${c.reason}`
        });
      }
    }
    for (const ra of rightAngles) {
      push(ra.figure, { key: `angle${ra.vertex}`, value: quantity(90), text: "\u221F", ids: ra.ids, declared: true, confidence: 1, reason: ra.reason });
    }
    const byMark = /* @__PURE__ */ new Map();
    for (const f of figures) for (const id of f.ids) byMark.set(id, f);
    const relMarks = [];
    for (const id of byMark.keys()) {
      const n2 = nodes.get(id);
      const b = n2 && boundsOf(n2);
      if (!n2 || !b) continue;
      relMarks.push({ id, bounds: b, points: strokePointsOf(n2), closed: fingerprintOf(n2)?.isClosed });
    }
    const groups = clusters(relMarks, relate(relMarks));
    const groupOf = /* @__PURE__ */ new Map();
    groups.forEach((g, i) => g.forEach((id) => groupOf.set(id, i)));
    const parent = groups.map((_, i) => i);
    const find = (i) => parent[i] === i ? i : parent[i] = find(parent[i]);
    const figureGroup = /* @__PURE__ */ new Map();
    for (const f of figures) {
      const gs = f.ids.map((id) => groupOf.get(id)).filter((g) => g !== void 0);
      if (!gs.length) {
        parent.push(parent.length);
        figureGroup.set(f.id, parent.length - 1);
        continue;
      }
      for (const g of gs.slice(1)) parent[find(g)] = find(gs[0]);
      figureGroup.set(f.id, gs[0]);
    }
    const drawingsByRoot = /* @__PURE__ */ new Map();
    for (const f of figures) {
      const root = find(figureGroup.get(f.id));
      (drawingsByRoot.get(root) ?? drawingsByRoot.set(root, []).get(root)).push(f);
    }
    const fallback = typeof options.unit === "function" ? options.unit(numberIds) : options.unit ?? null;
    const labels = /* @__PURE__ */ new Map();
    const drawings = [];
    for (const members of drawingsByRoot.values()) {
      const labelled = members.filter((f) => (raw.get(f.id) ?? []).some((l) => !l.declared));
      if (!labelled.length) {
        for (const f of members) if (raw.has(f.id)) labels.set(f.id, raw.get(f.id));
        continue;
      }
      const count = /* @__PURE__ */ new Map();
      for (const f of members) for (const l of raw.get(f.id) ?? []) if (!l.declared && l.value.unit && l.value.dim >= 1) count.set(l.value.unit, (count.get(l.value.unit) ?? 0) + 1);
      let written = null;
      for (const [u, n2] of count) if (!written || n2 > count.get(written)) written = u;
      const unit2 = written ?? fallback;
      const unitReason = written ? `${UNIT_NAMES2[written]}, written on ${count.get(written)} of its labels` : unit2 ? `${UNIT_NAMES2[unit2]}, the unit the page speaks` : "no unit written, so its numbers stay bare";
      const given2 = [];
      for (const f of members) {
        const ls = (raw.get(f.id) ?? []).map((l) => {
          if (l.declared || /^angle\d+$/.test(l.key) || l.value.unit || !unit2) return l;
          return { ...l, value: { ...l.value, unit: unit2, dim: l.key === "area" ? 2 : 1 } };
        });
        if (ls.length) labels.set(f.id, ls);
        for (const l of ls) given2.push({ figure: f, label: l });
      }
      const first = members[0];
      drawings.push({
        id: `drawing:${first.id}`,
        figures: members.map((f) => f.id),
        ids: [...new Set(members.flatMap((f) => f.ids))],
        unit: unit2,
        unitReason,
        scale: scaleOf(given2, unit2)
      });
    }
    return { figures, numbers, attachments, labels, rightAngles, underlines, drawings, numberIds };
  }
  function attachedNumberIds(state) {
    return dimensionsOf(state).numberIds;
  }
  function describeDimensions(d) {
    const lines = [];
    for (const a of d.attachments) lines.push(a.reason);
    for (const r of d.rightAngles) lines.push(r.reason);
    for (const u of d.underlines) lines.push(u.reason);
    for (const dr of d.drawings) lines.push(`${dr.figures.join(", ")}: ${dr.unitReason}${dr.scale ? `; ${dr.scale.reason}` : ""}`);
    return lines.join("\n");
  }

  // src/maths/gather.ts
  function sheetLines(state, options = {}) {
    const except = new Set(options.except ?? attachedNumberIds(state));
    const { texts, pieces } = wordsOnBoard(state, except);
    const out = [];
    for (const t of texts) {
      const b = t.bounds;
      const rows = t.code.split(/\r?\n/);
      const h2 = (b.maxY - b.minY) / Math.max(1, rows.length);
      rows.forEach((row, i) => {
        const text = row.trim();
        if (!text) return;
        const lb = { minX: b.minX, maxX: b.maxX, minY: b.minY + i * h2, maxY: b.minY + (i + 1) * h2 };
        out.push({ text, at: { x: lb.minX, y: lb.minY }, bounds: lb, ids: [t.id], from: "text" });
      });
    }
    for (const band of writingBands(pieces)) {
      const h2 = bandHeight(band);
      let text = band[0].text;
      for (let i = 1; i < band.length; i++) {
        const gap = band[i].bounds.minX - band[i - 1].bounds.maxX;
        text += (gap > COLUMN_GAP * h2 ? "   " : " ") + band[i].text;
      }
      const bounds = boundsOfAll(band.map((p) => p.bounds));
      out.push({ text, at: { x: bounds.minX, y: bounds.minY }, bounds, ids: band.map((p) => p.id), from: "writing" });
    }
    return out.map((l, i) => ({ l, i })).sort((a, b) => a.l.bounds.minY - b.l.bounds.minY || a.l.bounds.minX - b.l.bounds.minX || a.i - b.i).map((x) => x.l);
  }

  // src/maths/solve.ts
  var TOL = 1e-9;
  var DEG2 = Math.PI / 180;
  function fmtV(v) {
    const r = Math.round(v * 100) / 100;
    if (Math.abs(v - r) <= TOL * Math.max(1, Math.abs(v))) return formatNumber(v, 2);
    return (r < 0 ? "\u2212" : "") + Math.abs(r).toFixed(2);
  }
  function fmtIv(iv) {
    return iv.hi - iv.lo > TOL * Math.max(1, Math.abs(iv.hi)) ? `${fmtV(iv.lo)}\u2013${fmtV(iv.hi)}` : fmtV(iv.lo);
  }
  function over(ins, f) {
    let lo = Infinity, hi = -Infinity;
    const n2 = ins.length;
    for (let mask = 0; mask < 1 << n2; mask++) {
      const xs = ins.map((iv, i) => mask >> i & 1 ? iv.hi : iv.lo);
      const v = f(xs);
      if (v === null || !Number.isFinite(v)) return null;
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    return { lo, hi };
  }
  var point = (v) => ({ lo: v, hi: v });
  function bracketRanges(formula) {
    return formula.replace(
      /(\(?)(~?\d+(?:\.\d+)?–\d+(?:\.\d+)?)(\)?)/g,
      (all, open, range, close) => open && close ? all : `${open}(${range})${close}`
    );
  }
  var oppSide = (v) => (v + 1) % 3;
  var oppVertex = (s) => (s + 2) % 3;
  var shared = (s, t) => (s + 1) % 3 === t ? t : (t + 1) % 3 === s ? s : -1;
  var V = "ABC";
  function lawOfCosines(a, b, C) {
    const c2 = a * a + b * b - 2 * a * b * Math.cos(C * DEG2);
    return c2 > TOL ? Math.sqrt(c2) : null;
  }
  function angleFrom(a, b, opposite) {
    const c = (a * a + b * b - opposite * opposite) / (2 * a * b);
    if (c < -1 - 1e-12 || c > 1 + 1e-12) return null;
    return Math.acos(Math.max(-1, Math.min(1, c))) / DEG2;
  }
  function validTri(t) {
    if (t.sides.some((s) => !(s > TOL)) || t.angles.some((a) => !(a > TOL) || a >= 180 - TOL)) return null;
    return t;
  }
  function triangleAt(sides, angles) {
    const S = [...sides.keys()], A = [...angles.keys()];
    const full = (s) => {
      const angles2 = [0, 1, 2].map((v) => {
        const o = oppSide(v);
        return angleFrom(s[(o + 1) % 3], s[(o + 2) % 3], s[o]);
      });
      if (angles2.some((a) => a === null)) return null;
      return validTri({ sides: s, angles: angles2 });
    };
    if (S.length === 3) {
      const s = [0, 1, 2].map((k) => sides.get(k));
      const [a, b, c] = s.slice().sort((x, y) => x - y);
      if (a + b <= c * (1 + TOL)) return [];
      const t = full(s);
      return t ? [t] : [];
    }
    if (S.length === 2 && A.length === 1) {
      const [s, t] = S;
      const v = A[0];
      const X = angles.get(v);
      if (shared(s, t) === v) {
        const third = [0, 1, 2].find((k) => k !== s && k !== t);
        const c = lawOfCosines(sides.get(s), sides.get(t), X);
        if (c === null) return [];
        const all = [0, 1, 2].map((k) => k === third ? c : sides.get(k));
        const tri = full(all);
        return tri ? [tri] : [];
      }
      const o = oppSide(v);
      const n2 = o === s ? t : s;
      const on = sides.get(o), nn = sides.get(n2);
      const sinY = nn * Math.sin(X * DEG2) / on;
      if (sinY > 1 + 1e-12) return [];
      const y0 = Math.asin(Math.min(1, sinY)) / DEG2;
      const out = [];
      for (const Y of y0 > 90 - 1e-9 && y0 < 90 + 1e-9 ? [y0] : [y0, 180 - y0]) {
        const Z = 180 - X - Y;
        if (Z <= TOL) continue;
        const vy = oppVertex(n2);
        const vz = [0, 1, 2].find((k) => k !== v && k !== vy);
        const ang = [0, 0, 0];
        ang[v] = X;
        ang[vy] = Y;
        ang[vz] = Z;
        const third = oppSide(vz);
        const side = [0, 0, 0];
        side[o] = on;
        side[n2] = nn;
        side[third] = on * Math.sin(Z * DEG2) / Math.sin(X * DEG2);
        const tri = validTri({ sides: side, angles: ang });
        if (tri) out.push(tri);
      }
      return out;
    }
    if (S.length === 1 && A.length === 2) {
      const ang = [0, 0, 0];
      for (const [k, a] of angles) ang[k] = a;
      const missing = [0, 1, 2].find((k) => !angles.has(k));
      ang[missing] = 180 - ang[(missing + 1) % 3] - ang[(missing + 2) % 3];
      if (ang[missing] <= TOL) return [];
      const s0 = S[0];
      const known = sides.get(s0);
      const across = ang[oppVertex(s0)];
      const side = [0, 1, 2].map((k) => k === s0 ? known : known * Math.sin(ang[oppVertex(k)] * DEG2) / Math.sin(across * DEG2));
      const tri = validTri({ sides: side, angles: ang });
      return tri ? [tri] : [];
    }
    return [];
  }
  function sideName(f, k, right2, hyp = "the long side") {
    if (right2 !== null && oppVertex(k) === right2) return hyp;
    return f.sides[k]?.label ?? `side ${V[k]}${V[(k + 1) % 3]}`;
  }
  function desc(xs) {
    return xs.slice().sort((a, b) => b.v - a.v);
  }
  function triangleModels(facts) {
    const sideFacts = facts.filter((x) => /^side\d$/.test(x.key));
    const angleFacts = facts.filter((x) => /^angle\d$/.test(x.key));
    const fixed = facts.filter((x) => x.fixed);
    const pool = [...sideFacts, ...angleFacts];
    const out = [];
    const pick3 = (k, from) => {
      if (k === 0) return [[]];
      const res = [];
      from.forEach((x, i) => {
        for (const rest of pick3(k - 1, from.slice(i + 1))) res.push([x, ...rest]);
      });
      return res;
    };
    for (const basis of pick3(3, pool)) {
      if (fixed.some((x) => !basis.includes(x))) continue;
      if (new Set(basis.map((x) => x.key)).size !== 3 || new Set(basis.map((x) => x.group)).size !== 3) continue;
      if (!basis.some((x) => x.key.startsWith("side"))) continue;
      const ivs = basis.map((x) => x.iv);
      const at = (xs) => {
        const sides = /* @__PURE__ */ new Map(), angles = /* @__PURE__ */ new Map();
        basis.forEach((x, i) => (x.key.startsWith("side") ? sides : angles).set(Number(x.key.slice(-1)), xs[i]));
        return triangleAt(sides, angles);
      };
      const exact = ivs.map((iv) => iv.lo);
      const branches = at(exact).length;
      for (let b = 0; b < branches; b++) {
        const sidesIv = [], anglesIv = [];
        let ok = true;
        for (let k = 0; k < 3 && ok; k++) {
          const s = over(ivs, (xs) => at(xs)[b]?.sides[k] ?? null);
          const a = over(ivs, (xs) => at(xs)[b]?.angles[k] ?? null);
          if (!s || !a) ok = false;
          else {
            sidesIv.push(s);
            anglesIv.push(a);
          }
        }
        if (!ok) continue;
        out.push(triangleModel(basis, sidesIv, anglesIv, branches > 1 ? b : -1));
      }
    }
    return out;
  }
  function triangleModel(basis, sides, angles, branch) {
    const vals = /* @__PURE__ */ new Map();
    const known = new Map(basis.map((x) => [x.key, x]));
    const sideKnown = [0, 1, 2].filter((k) => known.has(`side${k}`));
    const angleKnown = [0, 1, 2].filter((k) => known.has(`angle${k}`));
    const rightFact = angleKnown.find((k) => Math.abs(known.get(`angle${k}`).iv.lo - 90) < TOL && Math.abs(known.get(`angle${k}`).iv.hi - 90) < TOL);
    const right2 = rightFact ?? null;
    const n2 = (k) => {
      const x = known.get(`side${k}`);
      return x ? numText(x) : fmtIv(sides[k]);
    };
    const a = (k) => {
      const x = known.get(`angle${k}`);
      return x ? numText(x) : fmtIv(angles[k]);
    };
    let how = "";
    const makes = [];
    const formulas = /* @__PURE__ */ new Map();
    const sideOf2 = (k) => `side${k}`;
    const legsAt = (v) => [0, 1, 2].filter((k) => k !== oppSide(v));
    if (right2 !== null && angleKnown.length === 1 && sideKnown.length === 2) {
      const hyp = oppSide(right2);
      const legs = legsAt(right2);
      if (!sideKnown.includes(hyp)) {
        const [p, q] = desc(legs.map((k) => ({ k, v: sides[k].lo })));
        how = `legs of ${n2(p.k)} and ${n2(q.k)}`;
        formulas.set(sideOf2(hyp), `\u221A(${n2(p.k)}\xB2 + ${n2(q.k)}\xB2)`);
        makes.push(sideOf2(hyp));
      } else {
        const leg = legs.find((k) => sideKnown.includes(k));
        const other = legs.find((k) => k !== leg);
        how = `${n2(hyp)} on the long side and a leg of ${n2(leg)}`;
        formulas.set(sideOf2(other), `\u221A(${n2(hyp)}\xB2 \u2212 ${n2(leg)}\xB2)`);
        makes.push(sideOf2(other));
      }
      for (const v of [0, 1, 2]) {
        if (v === right2) continue;
        const o = oppSide(v);
        const adj = legs.find((k) => k !== o);
        formulas.set(`angle${v}`, `atan(${n2(o)} \xF7 ${n2(adj)})`);
      }
      const [big, small] = desc(legs.map((k) => ({ k, v: sides[k].lo })));
      formulas.set("area", `\xBD \xD7 ${n2(big.k)} \xD7 ${n2(small.k)}`);
    } else if (sideKnown.length === 3) {
      const [p, q, r] = desc(sideKnown.map((k) => ({ k, v: sides[k].lo })));
      how = `sides of ${n2(p.k)}, ${n2(q.k)} and ${n2(r.k)}`;
      for (const v of [0, 1, 2]) {
        const o = oppSide(v);
        const [x, y] = [0, 1, 2].filter((k) => k !== o);
        formulas.set(`angle${v}`, `acos((${n2(x)}\xB2 + ${n2(y)}\xB2 \u2212 ${n2(o)}\xB2) \xF7 (2 \xD7 ${n2(x)} \xD7 ${n2(y)}))`);
        makes.push(`angle${v}`);
      }
      const s = (sides[0].lo + sides[1].lo + sides[2].lo) / 2;
      formulas.set("area", `\u221A(${fmtV(s)} \xD7 ${fmtV(s - sides[0].lo)} \xD7 ${fmtV(s - sides[1].lo)} \xD7 ${fmtV(s - sides[2].lo)})`);
    } else if (sideKnown.length === 2 && angleKnown.length === 1) {
      const [s, t] = sideKnown;
      const v = angleKnown[0];
      if (shared(s, t) === v) {
        const third = [0, 1, 2].find((k) => k !== s && k !== t);
        const [p, q] = desc([{ k: s, v: sides[s].lo }, { k: t, v: sides[t].lo }]);
        how = `sides of ${n2(p.k)} and ${n2(q.k)} with ${a(v)}\xB0 between them`;
        formulas.set(sideOf2(third), `\u221A(${n2(p.k)}\xB2 + ${n2(q.k)}\xB2 \u2212 2 \xD7 ${n2(p.k)} \xD7 ${n2(q.k)} \xD7 cos ${a(v)}\xB0)`);
        makes.push(sideOf2(third));
        formulas.set("area", `\xBD \xD7 ${n2(p.k)} \xD7 ${n2(q.k)} \xD7 sin ${a(v)}\xB0`);
      } else {
        const o = oppSide(v);
        const nn = o === s ? t : s;
        const vy = oppVertex(nn);
        const vz = [0, 1, 2].find((k) => k !== v && k !== vy);
        how = `sides of ${n2(o)} and ${n2(nn)} with ${a(v)}\xB0 opposite the ${n2(o)}`;
        formulas.set(`angle${vy}`, `${branch === 1 ? "180\xB0 \u2212 " : ""}asin(${n2(nn)} \xD7 sin ${a(v)}\xB0 \xF7 ${n2(o)})`);
        formulas.set(`angle${vz}`, `180\xB0 \u2212 ${a(v)}\xB0 \u2212 ${fmtIv(angles[vy])}\xB0`);
        const third = oppSide(vz);
        formulas.set(sideOf2(third), `${n2(o)} \xD7 sin ${fmtIv(angles[vz])}\xB0 \xF7 sin ${a(v)}\xB0`);
        makes.push(sideOf2(third), `angle${vy}`);
      }
    } else if (sideKnown.length === 1 && angleKnown.length === 2) {
      const s0 = sideKnown[0];
      const [v1, v2] = angleKnown;
      const missing = [0, 1, 2].find((k) => !angleKnown.includes(k));
      const asa = [v1, v2].every((v) => v === s0 || v === (s0 + 1) % 3);
      how = asa ? `angles of ${a(v1)}\xB0 and ${a(v2)}\xB0 with ${n2(s0)} between them` : `angles of ${a(v1)}\xB0 and ${a(v2)}\xB0 and a side of ${n2(s0)}`;
      formulas.set(`angle${missing}`, `180\xB0 \u2212 ${a(v1)}\xB0 \u2212 ${a(v2)}\xB0`);
      const across = oppVertex(s0);
      for (const k of [0, 1, 2]) {
        if (k === s0) continue;
        formulas.set(sideOf2(k), `${n2(s0)} \xD7 sin ${a(oppVertex(k))}\xB0 \xF7 sin ${a(across)}\xB0`);
        makes.push(sideOf2(k));
      }
    }
    if (!formulas.has("area")) {
      const [p, q] = [0, 1];
      formulas.set("area", `\xBD \xD7 ${n2(p)} \xD7 ${n2(q)} \xD7 sin ${fmtIv(angles[shared(p, q)])}\xB0`);
    }
    formulas.set("perimeter", desc([0, 1, 2].map((k) => ({ k, v: sides[k].lo }))).map((x) => n2(x.k)).join(" + "));
    for (let k = 0; k < 3; k++) {
      const x = known.get(`side${k}`);
      vals.set(sideOf2(k), x ? { iv: x.iv, from: "labelled", fact: x } : { iv: sides[k], from: "derived", formula: formulas.get(sideOf2(k)) });
      const y = known.get(`angle${k}`);
      vals.set(`angle${k}`, y ? { iv: y.iv, from: y.assumed ? "assumed" : y.fixed ? "declared" : "labelled", fact: y } : { iv: angles[k], from: "derived", formula: formulas.get(`angle${k}`) });
    }
    const area2 = over([sides[0], sides[1], angles[shared(0, 1)]], ([p, q, C]) => 0.5 * p * q * Math.sin(C * DEG2));
    if (area2) vals.set("area", { iv: area2, from: "derived", formula: formulas.get("area") });
    vals.set("perimeter", { iv: { lo: sides[0].lo + sides[1].lo + sides[2].lo, hi: sides[0].hi + sides[1].hi + sides[2].hi }, from: "derived", formula: formulas.get("perimeter") });
    const assumed = basis.find((x) => x.assumed)?.assumed;
    return { basis, vals, how, makes, ...assumed ? { assumed } : {}, ...branch >= 0 ? { branch } : {} };
  }
  function rectangleModels(facts, inkWide) {
    const by = (k) => facts.filter((x) => x.key === k);
    const W = by("width"), H = by("height"), D = by("diagonal"), A = by("area"), P = by("perimeter");
    const out = [];
    const model = (basis, w2, h2, fw, fh, how, makes) => {
      const vals = /* @__PURE__ */ new Map();
      const put = (key2, iv, formula) => {
        if (!iv) return;
        const fact = basis.find((x) => x.key === key2 && !x.parts);
        vals.set(key2, fact ? { iv: fact.iv, from: "labelled", fact } : { iv, from: "derived", formula });
      };
      put("width", w2, fw);
      put("height", h2, fh);
      if (w2 && h2) {
        const ws = basis.find((x) => x.key === "width") ? numText(basis.find((x) => x.key === "width")) : fmtIv(w2);
        const hs = basis.find((x) => x.key === "height") ? numText(basis.find((x) => x.key === "height")) : fmtIv(h2);
        put("diagonal", over([w2, h2], ([p, q]) => Math.hypot(p, q)), `\u221A(${ws}\xB2 + ${hs}\xB2)`);
        put("area", over([w2, h2], ([p, q]) => p * q), `${ws} \xD7 ${hs}`);
        put("perimeter", over([w2, h2], ([p, q]) => 2 * (p + q)), `2 \xD7 (${ws} + ${hs})`);
      }
      out.push({ basis, vals, how, makes });
    };
    const word = (x) => x.parts ? x.text : `${/^[aeiou]/.test(x.key) ? "an" : "a"} ${x.key} of ${x.shown}`;
    const both = (x, y) => `${word(x)} and ${word(y)}`;
    for (const w2 of W) model([w2], w2.iv, null, w2.parts ? w2.parts.join(" + ") : void 0, void 0, word(w2), w2.parts ? ["width"] : []);
    for (const h2 of H) model([h2], null, h2.iv, void 0, h2.parts ? h2.parts.join(" + ") : void 0, word(h2), h2.parts ? ["height"] : []);
    for (const w2 of W) for (const h2 of H) if (w2.group !== h2.group) model([w2, h2], w2.iv, h2.iv, w2.parts?.join(" + "), h2.parts?.join(" + "), both(w2, h2), ["diagonal"]);
    for (const d of D) {
      for (const w2 of W) if (w2.group !== d.group) {
        const h2 = over([d.iv, w2.iv], ([dd, ww]) => dd > ww + TOL ? Math.sqrt(dd * dd - ww * ww) : null);
        if (h2) model([w2, d], w2.iv, h2, void 0, `\u221A(${numText(d)}\xB2 \u2212 ${numText(w2)}\xB2)`, both(w2, d), ["height"]);
      }
      for (const h2 of H) if (h2.group !== d.group) {
        const w2 = over([d.iv, h2.iv], ([dd, hh]) => dd > hh + TOL ? Math.sqrt(dd * dd - hh * hh) : null);
        if (w2) model([h2, d], w2, h2.iv, `\u221A(${numText(d)}\xB2 \u2212 ${numText(h2)}\xB2)`, void 0, both(h2, d), ["width"]);
      }
    }
    for (const ar of A) {
      for (const w2 of W) if (w2.group !== ar.group) model([w2, ar], w2.iv, over([ar.iv, w2.iv], ([aa, ww]) => aa / ww), void 0, `${numText(ar)} \xF7 ${numText(w2)}`, both(w2, ar), ["height"]);
      for (const h2 of H) if (h2.group !== ar.group) model([h2, ar], over([ar.iv, h2.iv], ([aa, hh]) => aa / hh), h2.iv, `${numText(ar)} \xF7 ${numText(h2)}`, void 0, both(h2, ar), ["width"]);
    }
    for (const p of P) {
      for (const w2 of W) if (w2.group !== p.group) {
        const h2 = over([p.iv, w2.iv], ([pp, ww]) => pp / 2 - ww > TOL ? pp / 2 - ww : null);
        if (h2) model([w2, p], w2.iv, h2, void 0, `${numText(p)} \xF7 2 \u2212 ${numText(w2)}`, both(w2, p), ["height"]);
      }
      for (const h2 of H) if (h2.group !== p.group) {
        const w2 = over([p.iv, h2.iv], ([pp, hh]) => pp / 2 - hh > TOL ? pp / 2 - hh : null);
        if (w2) model([h2, p], w2, h2.iv, `${numText(p)} \xF7 2 \u2212 ${numText(h2)}`, void 0, both(h2, p), ["width"]);
      }
    }
    const pair = (x, y, sum, prod, forms) => {
      if (x.group === y.group) return;
      const root = (sign) => over([x.iv, y.iv], ([a, b]) => {
        const S = sum(a, b), Pr = prod(a, b);
        if (S === null || Pr === null || Pr <= 0) return null;
        const disc = S * S - 4 * Pr;
        if (disc < -TOL) return null;
        return (S + sign * Math.sqrt(Math.max(0, disc))) / 2;
      });
      const big = root(1), small = root(-1);
      if (!big || !small) return;
      const [w2, h2] = inkWide ? [big, small] : [small, big];
      const [fw, fh] = inkWide ? forms : [forms[1], forms[0]];
      model([x, y], w2, h2, fw, fh, both(x, y), ["width", "height"]);
    };
    const plusMinus = (form) => [form("+"), form("\u2212")];
    for (const d of D) for (const ar of A) {
      const [dd, aa] = [numText(d), numText(ar)];
      pair(d, ar, (x, y) => Math.sqrt(x * x + 2 * y), (_, y) => y, plusMinus((pm) => `(\u221A(${dd}\xB2 + 2 \xD7 ${aa}) ${pm} \u221A(${dd}\xB2 \u2212 2 \xD7 ${aa})) \xF7 2`));
    }
    for (const d of D) for (const p of P) {
      const [dd, pp] = [numText(d), numText(p)];
      pair(d, p, (_, y) => y / 2, (x, y) => ((y / 2) ** 2 - x * x) / 2, plusMinus((pm) => `(${pp} \xF7 2 ${pm} \u221A(2 \xD7 ${dd}\xB2 \u2212 (${pp} \xF7 2)\xB2)) \xF7 2`));
    }
    for (const ar of A) for (const p of P) {
      const [aa, pp] = [numText(ar), numText(p)];
      pair(ar, p, (_, y) => y / 2, (x) => x, plusMinus((pm) => `(${pp} \xF7 2 ${pm} \u221A((${pp} \xF7 2)\xB2 \u2212 4 \xD7 ${aa})) \xF7 2`));
    }
    return out;
  }
  function circleModels(facts) {
    const out = [];
    for (const x of facts) {
      const r = x.key === "radius" ? x.iv : x.key === "diameter" ? over([x.iv], ([d]) => d / 2) : x.key === "circumference" ? over([x.iv], ([c]) => c / (2 * Math.PI)) : x.key === "area" ? over([x.iv], ([a]) => a > 0 ? Math.sqrt(a / Math.PI) : null) : null;
      if (!r || !(r.lo > 0)) continue;
      const X = numText(x);
      const rs = x.key === "radius" ? X : fmtIv(r);
      const formulas = {
        radius: x.key === "diameter" ? `${X} \xF7 2` : x.key === "circumference" ? `${X} \xF7 2\u03C0` : `\u221A(${X} \xF7 \u03C0)`,
        diameter: x.key === "circumference" ? `${X} \xF7 \u03C0` : `2 \xD7 ${rs}`,
        circumference: x.key === "diameter" ? `\u03C0 \xD7 ${X}` : `2\u03C0 \xD7 ${rs}`,
        area: `\u03C0 \xD7 ${rs}\xB2`
      };
      const vals = /* @__PURE__ */ new Map();
      const put = (key2, iv) => {
        if (!iv) return;
        vals.set(key2, key2 === x.key ? { iv: x.iv, from: "labelled", fact: x } : { iv, from: "derived", formula: formulas[key2] });
      };
      put("radius", r);
      put("diameter", over([r], ([v]) => 2 * v));
      put("circumference", over([r], ([v]) => 2 * Math.PI * v));
      put("area", over([r], ([v]) => Math.PI * v * v));
      const named2 = x.key === "circumference" && x.name ? x.name : x.key;
      out.push({ basis: [x], vals, how: `${/^[aeiou]/i.test(named2) ? "an" : "a"} ${named2} of ${x.shown}`, makes: [x.key === "radius" ? "circumference" : "radius"] });
    }
    return out;
  }
  function arcModels(f, facts) {
    const by = (k) => facts.filter((x) => x.key === k);
    const C = by("chord"), H = by("rise"), R = by("radius"), L = by("arc");
    const inkMajor = (f.rise ?? 0) > (f.radius ?? Infinity);
    const out = [];
    const build = (basis, c, h2, r, forms, makes) => {
      const major = h2.lo > r.lo + TOL;
      const sweep = over([c, r], ([cc, rr]) => {
        const s = 2 * Math.asin(Math.min(1, cc / (2 * rr))) / DEG2;
        return major ? 360 - s : s;
      });
      const vals = /* @__PURE__ */ new Map();
      const put = (key2, iv, formula) => {
        if (!iv) return;
        const fact = basis.find((x) => x.key === key2);
        vals.set(key2, fact ? { iv: fact.iv, from: "labelled", fact } : { iv, from: "derived", formula });
      };
      put("chord", c, forms.chord);
      put("rise", h2, forms.rise);
      put("radius", r, forms.radius);
      const rs = basis.find((x) => x.key === "radius") ? numText(basis.find((x) => x.key === "radius")) : fmtIv(r);
      const cs = basis.find((x) => x.key === "chord") ? numText(basis.find((x) => x.key === "chord")) : fmtIv(c);
      if (sweep) {
        put("sweep", sweep, `${major ? "360\xB0 \u2212 " : ""}2 \xD7 asin(${cs} \xF7 (2 \xD7 ${rs}))`);
        put("arc", over([r, sweep], ([rr, sw]) => rr * sw * DEG2), `\u03C0 \xD7 ${rs} \xD7 ${fmtIv(sweep)}\xB0 \xF7 180\xB0`);
      }
      const word = (x) => `${/^[aeiou]/i.test(x.key) ? "an" : "a"} ${x.key === "arc" ? "arc length" : x.key} of ${x.shown}`;
      out.push({ basis, vals, how: basis.map(word).join(" and "), makes });
    };
    for (const c of C) for (const h2 of H) {
      if (c.group === h2.group) continue;
      const r = over([c.iv, h2.iv], ([cc, hh]) => hh > 0 ? cc * cc / (8 * hh) + hh / 2 : null);
      if (r) build([c, h2], c.iv, h2.iv, r, { radius: `${numText(c)}\xB2 \xF7 (8 \xD7 ${numText(h2)}) + ${numText(h2)} \xF7 2` }, ["radius"]);
    }
    for (const c of C) for (const r of R) {
      if (c.group === r.group) continue;
      const h2 = over([c.iv, r.iv], ([cc, rr]) => cc <= 2 * rr + TOL ? rr + (inkMajor ? 1 : -1) * Math.sqrt(Math.max(0, rr * rr - cc * cc / 4)) : null);
      if (h2) build([c, r], c.iv, h2, r.iv, { rise: `${numText(r)} ${inkMajor ? "+" : "\u2212"} \u221A(${numText(r)}\xB2 \u2212 (${numText(c)} \xF7 2)\xB2)` }, ["rise"]);
    }
    for (const h2 of H) for (const r of R) {
      if (h2.group === r.group) continue;
      const c = over([h2.iv, r.iv], ([hh, rr]) => hh <= 2 * rr + TOL ? 2 * Math.sqrt(Math.max(0, 2 * rr * hh - hh * hh)) : null);
      if (c) build([h2, r], c, h2.iv, r.iv, { chord: `2 \xD7 \u221A(2 \xD7 ${numText(r)} \xD7 ${numText(h2)} \u2212 ${numText(h2)}\xB2)` }, ["chord"]);
    }
    for (const r of R) for (const l of L) {
      if (r.group === l.group) continue;
      const c = over([r.iv, l.iv], ([rr, ll]) => 2 * rr * Math.sin(ll / rr / 2));
      const h2 = over([r.iv, l.iv], ([rr, ll]) => rr * (1 - Math.cos(ll / rr / 2)));
      if (c && h2) build([r, l], c, h2, r.iv, { chord: `2 \xD7 ${numText(r)} \xD7 sin(${numText(l)} \xF7 (2 \xD7 ${numText(r)}))`, rise: `${numText(r)} \xD7 (1 \u2212 cos(${numText(l)} \xF7 (2 \xD7 ${numText(r)})))` }, ["chord"]);
    }
    for (const x of facts) {
      if (x.key === "arc" || x.key === "sweep") continue;
      out.push({ basis: [x], vals: /* @__PURE__ */ new Map([[x.key, { iv: x.iv, from: "labelled", fact: x }]]), how: `${x.key === "rise" ? "a rise" : `a ${x.key}`} of ${x.shown}`, makes: [] });
    }
    return out;
  }
  function sideModels(f, facts) {
    const out = [];
    for (const x of facts) {
      if (!f.sides.some((s) => s.key === x.key)) continue;
      const vals = /* @__PURE__ */ new Map([[x.key, x.parts ? { iv: x.iv, from: "derived", formula: x.parts.join(" + "), fact: x } : { iv: x.iv, from: "labelled", fact: x }]]);
      out.push({ basis: [x], vals, how: x.parts ? x.text : `a length of ${x.shown}`, makes: x.parts ? [x.key] : [] });
    }
    return out;
  }
  function toQ(iv, unit2, dim, approx = false) {
    return { lo: iv.lo, hi: iv.hi, unit: dim === 0 ? null : unit2, dim: unit2 ? dim : 0, approx };
  }
  var dimOf = (key2) => /^angle\d$/.test(key2) || key2 === "sweep" ? 0 : key2 === "area" ? 2 : 1;
  function check(model, facts, unit2) {
    const kept = [...model.basis];
    const conflicts = [];
    const used = new Set(model.basis.map((x) => x.group));
    const groups = /* @__PURE__ */ new Map();
    for (const x of facts) if (!used.has(x.group)) (groups.get(x.group) ?? groups.set(x.group, []).get(x.group)).push(x);
    let share = 0;
    for (const alts of groups.values()) {
      let hit = null;
      let miss = null;
      for (const x of alts) {
        const v = model.vals.get(x.key);
        if (!v) continue;
        const cmp = compareQuantities(toQ(v.iv, unit2, dimOf(x.key)), x.q);
        if (cmp.status === "ok" || cmp.status === "rounded" || cmp.status === "within") {
          hit = x;
          break;
        }
        if (cmp.status === "off" && !miss) miss = { fact: x, derived: v.iv };
      }
      if (hit) kept.push(hit);
      else if (miss) {
        conflicts.push(miss);
        share += Math.abs(miss.derived.lo - miss.fact.iv.lo) / Math.max(TOL, Math.abs(miss.fact.iv.lo));
      }
    }
    return { model, kept, conflicts, share, ink: 0 };
  }
  function inkDistance(f, model) {
    const pairs = [];
    for (const [key2, v] of model.vals) {
      if (dimOf(key2) !== 1) continue;
      const ink = inkMeasure(f, inkKeyOf(f, key2));
      if (ink && ink > 0 && v.iv.lo > 0) pairs.push([v.iv.lo, ink]);
    }
    if (pairs.length < 2) return 0;
    const ratios = pairs.map(([a, b]) => Math.log(a / b));
    const mean2 = ratios.reduce((s, r) => s + r, 0) / ratios.length;
    return ratios.reduce((s, r) => s + Math.abs(r - mean2), 0);
  }
  function inkKeyOf(f, key2) {
    if (f.kind === "rectangle" && (key2 === "width" || key2 === "height")) {
      const pair = rectanglePairs(f);
      return key2 === "width" ? pair.width[0] : pair.height[0];
    }
    return key2;
  }
  function rectanglePairs(f) {
    const horizontal = (k) => Math.abs(f.sides[k].to.x - f.sides[k].from.x) >= Math.abs(f.sides[k].to.y - f.sides[k].from.y);
    const evenWide = horizontal(0) || !horizontal(1) && f.sides[0].length >= f.sides[1].length;
    return evenWide ? { width: ["side0", "side2"], height: ["side1", "side3"] } : { width: ["side1", "side3"], height: ["side0", "side2"] };
  }
  function numText(x) {
    if (x.parts) return fmtIv(x.iv);
    return formatQuantity({ ...x.q, unit: null, dim: 0 });
  }
  function factsOf(f, labels, unit2, notes) {
    const facts = [];
    const keyOf = (k) => {
      if (/^angle\d+$/.test(k)) return f.kind === "triangle" ? k : null;
      if (f.kind === "rectangle") {
        const pair = rectanglePairs(f);
        if (pair.width.includes(k) || k === "width") return "width";
        if (pair.height.includes(k) || k === "height") return "height";
        return ["diagonal", "area", "perimeter"].includes(k) ? k : null;
      }
      if (f.kind === "circle") return ["radius", "diameter", "circumference", "area"].includes(k) ? k : null;
      if (f.kind === "arc") return ["chord", "rise", "radius", "arc"].includes(k) ? k : null;
      if (f.kind === "triangle") return /^side\d$/.test(k) || k === "area" || k === "perimeter" ? k : null;
      return f.sides.some((s) => s.key === k) ? k : null;
    };
    const inUnit = (q, dim) => {
      if (dim === 0) return q.unit ? null : { ...q, dim: 0 };
      if (!q.unit) return unit2 ? { ...q, unit: unit2, dim } : { ...q, dim: 0 };
      if (!unit2) return q;
      if (q.unit === unit2) return q;
      const c = convertQuantity({ ...q, dim }, unit2);
      if (c.note) notes.push(c.note);
      return c.quantity;
    };
    labels.forEach((l, i) => {
      if (l.key.includes(".")) return;
      const key2 = keyOf(l.key);
      if (!key2) return;
      const q = inUnit(l.value, dimOf(key2));
      if (!q) return;
      facts.push({
        i,
        key: key2,
        iv: { lo: q.lo, hi: q.hi },
        q,
        text: l.text,
        shown: l.shown ?? l.text,
        ...l.name ? { name: l.name } : {},
        group: l.number ?? `label:${i}`,
        fixed: !!l.declared,
        ids: l.ids
      });
    });
    const partChecks = [];
    const partLabels = /* @__PURE__ */ new Map();
    for (const side of f.sides) {
      if (!side.parts?.length) continue;
      const per = side.parts.map((p) => labels.filter((l) => l.key === p.key));
      per.forEach((ls, i) => {
        const q = ls.length === 1 ? inUnit(ls[0].value, 1) : null;
        if (q) partLabels.set(side.parts[i].key, { q, text: ls[0].text });
      });
      if (per.some((ls) => ls.length !== 1)) continue;
      const qs = per.map((ls) => inUnit(ls[0].value, 1));
      if (qs.some((q) => !q)) continue;
      const key2 = keyOf(side.key);
      if (!key2) continue;
      const lo = qs.reduce((s, q) => s + q.lo, 0), hi = qs.reduce((s, q) => s + q.hi, 0);
      const texts = per.map((ls) => ls[0].text);
      const joined = texts.length === 2 ? `${texts[0]} and ${texts[1]}` : `${texts.slice(0, -1).join(", ")} and ${texts[texts.length - 1]}`;
      const fact = {
        i: labels.length + partChecks.length,
        key: key2,
        iv: { lo, hi },
        q: { lo, hi, unit: qs[0].unit, dim: qs[0].dim, approx: qs.some((q) => q.approx) },
        text: joined,
        shown: joined,
        group: `parts:${side.key}`,
        fixed: false,
        parts: qs.map((q) => formatQuantity({ ...q, unit: null, dim: 0 })),
        ids: per.flatMap((ls) => ls[0].ids)
      };
      facts.push(fact);
      partChecks.push({ side: side.key, fact });
    }
    return { facts, partChecks, partLabels };
  }
  var angleLabel = (k) => `the angle at ${"ABCDEFGH"[k] ?? k}`;
  function labelOf2(f, key2, right2) {
    const side = /^side(\d)$/.exec(key2);
    if (side) return f.kind === "triangle" ? sideName(f, Number(side[1]), right2) : f.sides[Number(side[1])]?.label ?? key2;
    const angle = /^angle(\d)$/.exec(key2);
    if (angle) return angleLabel(Number(angle[1]));
    if (key2.includes(".")) {
      for (const s of f.sides) for (const p of s.parts ?? []) if (p.key === key2) return p.label;
    }
    return key2 === "arc" ? "the arc length" : `the ${key2}`;
  }
  function textOf2(iv, key2, unit2, approx = false) {
    const d = dimOf(key2);
    const suffix = d === 0 ? "\xB0" : unitSuffix(unit2, d);
    return `${approx ? "~" : ""}${fmtIv(iv)}${suffix}`;
  }
  var lengthWord = (key2, more) => dimOf(key2) === 1 ? more ? "longer" : "shorter" : more ? "larger" : "smaller";
  function conflictOf(f, c, reading, unit2, right2) {
    const x = c.fact;
    const model = c.against ?? reading;
    const d = c.derived.lo - x.iv.lo;
    const share = Math.abs(d) / Math.max(TOL, Math.abs(x.iv.lo));
    const verb = model.basis.length > 1 || /\band\b/.test(model.how) ? "make" : "makes";
    const head = x.parts ? `${x.text} make ${textOf2(x.iv, x.key, unit2)}` : `labelled ${x.text}`;
    const reason = `${head}; ${model.how} ${verb} it ${fmtIv(c.derived)}, ${fmtV(Math.abs(d))} ${lengthWord(x.key, d > 0)} (${Math.round(share * 100)}%)`;
    return {
      key: x.key,
      label: labelOf2(f, x.key, right2),
      written: x.q,
      derived: toQ(c.derived, unit2, dimOf(x.key)),
      difference: d,
      share,
      text: x.text,
      ids: x.ids,
      reason
    };
  }
  function solveFigure(figure, labels, options = {}) {
    const notes = [];
    const written = labels.find((l) => !l.declared && l.value.unit && l.value.dim >= 1)?.value.unit ?? null;
    const unit2 = options.unit !== void 0 && options.unit !== null ? options.unit : written;
    const { facts, partChecks, partLabels } = factsOf(figure, labels, unit2, notes);
    const f = figure;
    let models = [];
    if (f.kind === "triangle") {
      models = triangleModels(facts);
      const angleFacts = facts.filter((x) => x.key.startsWith("angle"));
      if (!models.length) {
        if (angleFacts.length === 3 && new Set(angleFacts.map((x) => x.key)).size === 3) {
          const sum = angleFacts.reduce((s, x) => s + x.iv.lo, 0);
          if (Math.abs(sum - 180) > 0.5) notes.push(`the angles add to ${fmtV(sum)}\xB0, not 180\xB0`);
        }
        if (facts.some((x) => x.key.startsWith("side")) && f.angles) {
          const taken = new Set(angleFacts.map((x) => x.key));
          f.angles.forEach((deg2, k) => {
            if (models.length || taken.has(`angle${k}`) || angleClass(deg2) !== "right") return;
            const assumed = `the corner at ${V[k]} measures ${Math.round(deg2)}\xB0, right within \xB1${RIGHT_ANGLE_TOLERANCE}\xB0 (measure.ts) \u2014 a reading, not a fact`;
            const hyp = { i: -1, key: `angle${k}`, iv: point(90), q: { lo: 90, hi: 90, unit: null, dim: 0, approx: false }, text: "90\xB0", shown: "90", group: `assumed:${k}`, fixed: true, assumed, ids: [] };
            models = triangleModels([...facts, hyp]);
          });
        }
      }
    } else if (f.kind === "rectangle") {
      const pair = rectanglePairs(f);
      const w2 = f.sides.find((s) => s.key === pair.width[0]).length, h2 = f.sides.find((s) => s.key === pair.height[0]).length;
      models = rectangleModels(facts, w2 >= h2);
    } else if (f.kind === "circle") models = circleModels(facts);
    else if (f.kind === "arc") models = arcModels(f, facts);
    else models = sideModels(f, facts);
    const checked = models.map((m) => {
      const c = check(m, facts, unit2);
      c.ink = inkDistance(f, m);
      return c;
    });
    const sig2 = (c) => c.kept.map((x) => x.i).sort((a, b) => a - b).join(",") + (c.model.assumed ? "?" : "") + (c.model.branch !== void 0 ? `#${c.model.branch}` : "");
    const seen = /* @__PURE__ */ new Map();
    for (const c of checked) if (!seen.has(sig2(c))) seen.set(sig2(c), c);
    let distinct = [...seen.values()];
    distinct = distinct.filter((c) => !distinct.some((o) => o !== c && o.kept.length > c.kept.length && c.kept.every((x) => o.kept.includes(x))));
    if ((f.kind === "quadrilateral" || f.kind === "polygon") && distinct.length > 1) distinct = mergeSides(distinct);
    distinct.sort(
      (a, b) => b.kept.length - a.kept.length || a.conflicts.length - b.conflicts.length || Number(!!a.model.assumed) - Number(!!b.model.assumed) || a.share - b.share || a.ink - b.ink
    );
    const rightOf = (m) => {
      for (const x of m.basis) if (/^angle\d$/.test(x.key) && Math.abs(x.iv.lo - 90) < TOL && Math.abs(x.iv.hi - 90) < TOL) return Number(x.key.slice(-1));
      return null;
    };
    const readings = distinct.map((c) => {
      const right2 = f.kind === "triangle" ? rightOf(c.model) : null;
      const values = valuesOf(f, c, unit2, right2, partLabels);
      const conflicts = c.conflicts.map((x) => conflictOf(f, x, c.model, unit2, right2));
      const verb = c.model.basis.filter((x) => !x.assumed).length > 1 || /\band\b/.test(c.model.how) ? "make" : "makes";
      const made = c.model.makes.map((k) => {
        const v = values.find((x) => x.key === k);
        if (!v) return null;
        const label = right2 !== null && k.startsWith("side") && oppVertex(Number(k.slice(-1))) !== right2 && c.model.basis.some((x) => x.key === `side${oppSide(right2)}`) ? "the other leg" : v.label;
        return `${label} ${v.text}`;
      }).filter((x) => !!x);
      const assumes = c.model.assumed ? [c.model.assumed] : void 0;
      const lead = c.model.assumed ? `if the corner at ${V[Number(c.model.basis.find((x) => x.assumed).key.slice(-1))]} is right, ` : "";
      const sentence = made.length ? `${lead}${c.model.how} ${verb} ${joinAnd(made)}` : `${lead}${c.model.basis.map((x) => `${labelOf2(f, x.key, right2)} ${textOf2(x.iv, x.key, unit2)}`).join(", ")}, as labelled`;
      return {
        values,
        keeps: c.kept.filter((x) => !x.assumed).map((x) => x.text),
        conflicts,
        ...assumes ? { assumes } : {},
        sentence,
        reason: `${sentence}${conflicts.length ? `; ${conflicts.map((x) => x.reason).join("; ")}` : ""}`
      };
    });
    const checks = [];
    const top = distinct[0];
    if (top) {
      for (const pc of partChecks) {
        if (!top.kept.includes(pc.fact)) continue;
        const whole = top.kept.find((x) => x !== pc.fact && x.key === pc.fact.key);
        if (whole) checks.push(`${pc.fact.text} make ${textOf2(pc.fact.iv, pc.fact.key, unit2)} \u2713`);
      }
    }
    if (f.kind === "triangle" && f.angles) {
      const topReading = readings[0];
      if (topReading && !topReading.assumes) {
        f.angles.forEach((deg2, k) => {
          if (angleClass(deg2) !== "right" || facts.some((x) => x.key === `angle${k}`)) return;
          const v = topReading.values.find((x) => x.key === `angle${k}`);
          if (v && Math.abs(v.value.lo - 90) >= RIGHT_ANGLE_TOLERANCE) notes.push(`the corner at ${V[k]} measures ${Math.round(deg2)}\xB0 in the ink; the labels make it ${v.text}`);
        });
      }
      const declared = facts.filter((x) => x.fixed && !x.assumed);
      if (declared.length) {
        const free = triangleModels(facts.filter((x) => !x.fixed)).map((m) => check(m, facts.filter((x) => !x.fixed), unit2)).filter((c) => !c.conflicts.length);
        for (const c of free) {
          for (const d of declared) {
            const v = c.model.vals.get(d.key);
            if (v && Math.abs(v.iv.lo - 90) > TOL) {
              const n2 = c.kept.length;
              notes.push(`the ${n2 === 3 ? "three" : n2} labels hold together only if the corner at ${V[Number(d.key.slice(-1))]} is ${fmtIv(v.iv)}\xB0, not the right angle its square declares`);
            }
          }
          break;
        }
      }
    }
    const ink = [];
    const scale = options.scale;
    const fixedKeys = new Set(readings[0]?.values.map((v) => v.key) ?? []);
    for (const key2 of keysOf(f)) {
      if (fixedKeys.has(key2)) continue;
      const d = dimOf(key2);
      const raw = key2 === "sweep" ? inkSweep(f) : inkMeasure(f, inkKeyOf(f, key2));
      if (raw === null || !(raw > 0)) continue;
      if (d > 0 && !scale) continue;
      const v = d === 0 ? raw : raw * scale.unitsPerCanvasUnit ** d;
      const iv = point(v);
      const text = d === 0 ? `${Math.round(v)}\xB0` : textOf2(iv, key2, scale.unit);
      ink.push({
        key: key2,
        label: labelOf2(f, key2, null),
        value: toQ(iv, scale?.unit ?? unit2, d),
        from: "ink",
        text,
        reason: d === 0 ? `drawn, it measures ${text} \u2014 the ink\u2019s, not the thing\u2019s` : `drawn to scale this would be ${text} \u2014 the ink\u2019s, not the thing\u2019s (${scale.reason})`
      });
    }
    return { figure: f, unit: unit2, readings, conflicts: readings[0]?.conflicts ?? [], checks, ink, notes };
  }
  function joinAnd(xs) {
    return xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
  }
  function inkSweep(f) {
    if (f.kind !== "arc" || !f.radius) return null;
    const chord = f.sides.find((s2) => s2.key === "chord")?.length ?? 0;
    const s = 2 * Math.asin(Math.min(1, chord / (2 * f.radius))) / DEG2;
    return (f.rise ?? 0) > f.radius ? 360 - s : s;
  }
  function keysOf(f) {
    switch (f.kind) {
      case "triangle":
        return ["side0", "side1", "side2", "angle0", "angle1", "angle2", "area", "perimeter"];
      case "rectangle":
        return ["width", "height", "diagonal", "area", "perimeter"];
      case "circle":
        return ["radius", "diameter", "circumference", "area"];
      case "arc":
        return ["chord", "rise", "radius", "sweep", "arc"];
      default:
        return f.sides.map((s) => s.key);
    }
  }
  function valuesOf(f, c, unit2, right2, parts) {
    const out = [];
    const keys = keysOf(f);
    const all = [...keys, ...[...c.model.vals.keys()].filter((k) => !keys.includes(k))];
    for (const key2 of all) {
      const v = c.model.vals.get(key2);
      if (!v) continue;
      const approx = !!v.fact?.q.approx;
      const labelled = v.from === "labelled" || v.from === "declared" || v.from === "assumed";
      const value = labelled && v.fact && !v.fact.parts ? { ...v.fact.q, ...dimOf(key2) === 0 ? { unit: null, dim: 0 } : {} } : toQ(v.iv, unit2, dimOf(key2), approx);
      const text = labelled && v.fact && !v.fact.parts && dimOf(key2) > 0 && v.fact.q.unit === unit2 ? formatQuantity(v.fact.q) : textOf2(v.iv, key2, unit2, approx);
      const label = labelOf2(f, key2, right2);
      const formula = v.formula ? bracketRanges(v.formula) : void 0;
      const reason = v.from === "derived" ? `${label} ${text}${formula ? ` = ${formula}` : ""}` : v.from === "declared" ? `${label} is right: a square in the corner declares it` : v.from === "assumed" ? v.fact?.assumed ?? `${label}, assumed` : `${label} ${text}, as labelled`;
      out.push({ key: key2, label, value, from: v.from, ...formula && v.from === "derived" ? { formula } : {}, text, reason });
    }
    for (const side of f.sides) {
      if (!side.parts?.length) continue;
      const whole = c.model.vals.get(f.kind === "rectangle" ? rectanglePairs(f).width.includes(side.key) ? "width" : "height" : side.key);
      const written = side.parts.map((p) => parts.get(p.key));
      side.parts.forEach((p, i) => {
        const w2 = written[i];
        if (w2) out.push({ key: p.key, label: p.label, value: w2.q, from: "labelled", text: formatQuantity(w2.q), reason: `${p.label} ${formatQuantity(w2.q)}, as labelled` });
      });
      const open = side.parts.filter((_, i) => !written[i]);
      if (!whole || open.length !== 1) continue;
      const known = written.filter((w2) => !!w2);
      const lo = whole.iv.lo - known.reduce((a, w2) => a + w2.q.hi, 0);
      const hi = whole.iv.hi - known.reduce((a, w2) => a + w2.q.lo, 0);
      if (!(hi > TOL)) continue;
      const iv = { lo: Math.max(0, lo), hi };
      const text = textOf2(iv, side.key, unit2);
      const formula = bracketRanges([fmtIv(whole.iv), ...known.map((w2) => formatQuantity({ ...w2.q, unit: null, dim: 0 }))].join(" \u2212 "));
      out.push({ key: open[0].key, label: open[0].label, value: toQ(iv, unit2, 1), from: "derived", formula, text, reason: `${open[0].label} ${text} = ${formula}` });
    }
    return out;
  }
  function mergeSides(readings) {
    const bySide = /* @__PURE__ */ new Map();
    for (const r of readings) {
      const key2 = r.model.basis[0].key;
      (bySide.get(key2) ?? bySide.set(key2, []).get(key2)).push(r);
    }
    const vals = /* @__PURE__ */ new Map();
    const basis = [];
    const kept = [];
    const conflicts = [];
    let share = 0;
    for (const rs of bySide.values()) {
      rs.sort((a, b) => b.kept.length - a.kept.length || a.share - b.share);
      const best = rs[0];
      for (const [k, v] of best.model.vals) vals.set(k, v);
      basis.push(...best.model.basis);
      kept.push(...best.kept);
      conflicts.push(...best.conflicts.map((c) => ({ ...c, against: best.model })));
      share += best.share;
    }
    const how = basis.map((x) => x.parts ? x.text : `${x.shown}`).join(", ");
    return [{ model: { basis, vals, how, makes: [] }, kept, conflicts, share, ink: 0 }];
  }
  function solveBoard(state, options = {}) {
    const pages = [];
    const readPage = (except) => {
      const sheet2 = readSheet(sheetLines(state, { except }));
      pages.push(sheet2);
      return sheet2;
    };
    const unit2 = options.unit !== void 0 ? options.unit : (except) => readPage(except).unit;
    const dimensions = dimensionsOf(state, { unit: unit2, ...options.figures ? { figures: options.figures } : {} });
    const sheet = pages[0] ?? readPage(dimensions.numberIds);
    const figures = dimensions.figures.map((figure) => {
      const labels = dimensions.labels.get(figure.id) ?? [];
      const drawing = dimensions.drawings.find((d) => d.figures.includes(figure.id)) ?? null;
      const solution = solveFigure(figure, labels, { unit: drawing?.unit ?? null, scale: drawing?.scale ?? null });
      const seen = /* @__PURE__ */ new Set();
      const steps = [];
      for (const l of labels) {
        if (l.step === void 0 || l.declared || seen.has(l.number ?? l.text)) continue;
        seen.add(l.number ?? l.text);
        const check2 = checkWritten(sheet, String(l.step), l.value);
        if (check2) steps.push(check2);
      }
      return { figure, labels, drawing, solution, steps };
    });
    return { dimensions, sheet, figures };
  }
  function describeSolution(sol) {
    const lines = [];
    const [top, ...rest] = sol.readings;
    if (top) {
      lines.push(top.sentence);
      for (const v of top.values) if (v.from === "derived") lines.push(`${v.label} ${v.text}${v.formula ? ` = ${v.formula}` : ""}`);
      for (const c of top.conflicts) lines.push(c.reason);
    }
    for (const r of rest) lines.push(`or ${r.sentence}`);
    lines.push(...sol.checks);
    for (const v of sol.ink) lines.push(`${v.label} ${v.text} (the ink\u2019s)`);
    lines.push(...sol.notes);
    return lines.join("\n");
  }

  // src/maths/svg.ts
  function fmt2(v, places) {
    const f = 10 ** places;
    const r = Math.round(v * f) / f;
    if (r === 0 || !Number.isFinite(r)) return "0";
    const s = r.toFixed(places);
    return places > 0 ? s.replace(/\.?0+$/, "") : s;
  }
  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  var FONT_FAMILY = "IBM Plex Mono, ui-monospace, Menlo, Consolas, monospace";
  var MONO_ADVANCE = 0.6;
  function textWidth(text, size) {
    return [...text].length * MONO_ADVANCE * size;
  }
  function wrap(text, width, size) {
    const most = Math.max(8, Math.floor(width / (MONO_ADVANCE * size)));
    const lines = [];
    let line = "";
    for (const word of text.split(" ")) {
      if (!line) line = word;
      else if ([...line].length + 1 + [...word].length <= most) line += " " + word;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    return lines;
  }
  function unitFactor(from, to) {
    return from === to ? 1 : convertQuantity(quantity(1, from), to).quantity.lo;
  }
  function systemOf(unit2) {
    return unit2 === "in" || unit2 === "ft" ? "imperial" : "metric";
  }
  function unionBounds(boxes) {
    return {
      minX: Math.min(...boxes.map((b) => b.minX)),
      maxX: Math.max(...boxes.map((b) => b.maxX)),
      minY: Math.min(...boxes.map((b) => b.minY)),
      maxY: Math.max(...boxes.map((b) => b.maxY))
    };
  }
  function expandBounds(b, d) {
    return { minX: b.minX - d, maxX: b.maxX + d, minY: b.minY - d, maxY: b.maxY + d };
  }

  // src/maths/truesize.ts
  var IMPERIAL = { margin: 0.25, gap: 1, block: 0.3, label: 0.16, title: 0.2, note: 0.12, caption: 0.14, stroke: 0.02, thin: 0.01, labelGap: 0.1, corner: 0.15, minWidth: 6.5 };
  var METRIC = { margin: 6, gap: 25, block: 8, label: 4, title: 5, note: 3, caption: 3.5, stroke: 0.5, thin: 0.25, labelGap: 2.5, corner: 4, minWidth: 160 };
  function furniture(unit2) {
    const imperial = systemOf(unit2) === "imperial";
    const k = unitFactor(imperial ? "in" : "mm", unit2);
    const base = imperial ? IMPERIAL : METRIC;
    const out = {};
    for (const key2 of Object.keys(base)) out[key2] = base[key2] * k;
    return out;
  }
  var COORD_PLACES = { in: 3, ft: 4, cm: 3, mm: 2, m: 5 };
  var PAPER = {
    in: { css: "in", per: 1 },
    ft: { css: "in", per: 12 },
    cm: { css: "cm", per: 1 },
    mm: { css: "mm", per: 1 },
    m: { css: "cm", per: 100 }
  };
  var UNIT_WORDS2 = { in: "inches", ft: "feet", cm: "centimetres", mm: "millimetres", m: "metres" };
  var SCALE_BAR = {
    in: { length: 6, step: 1, every: 1 },
    ft: { length: 1, step: 1 / 12, every: 12 },
    cm: { length: 10, step: 1, every: 5 },
    mm: { length: 100, step: 10, every: 5 },
    m: { length: 0.1, step: 0.01, every: 5 }
  };
  function precisionOf(q) {
    if (q.precision && q.precision > 0) return q.precision;
    for (let d = 0; d <= 3; d++) {
      const f = 10 ** d;
      const whole = (v) => Math.abs(v * f - Math.round(v * f)) < 1e-9 * Math.max(1, Math.abs(v * f));
      if (whole(q.lo) && whole(q.hi)) return 1 / f;
    }
    return 1e-3;
  }
  function finer(p) {
    const den = Math.round(1 / p);
    if (p < 1 && [2, 4, 8, 16, 32].includes(den) && Math.abs(1 / p - den) < 1e-9) return { fractions: den * 2 };
    return { places: Math.max(0, Math.round(-Math.log10(p))) + 1 };
  }
  function derivedNumber(v, p) {
    const form = finer(p);
    if ("fractions" in form) return formatQuantity(quantity(Math.round(v * form.fractions) / form.fractions), { fractions: form.fractions });
    return formatNumber(v, form.places);
  }
  function derivedText(q, p, unit2) {
    const body = isRange(q) ? `${derivedNumber(q.lo, p)}\u2013${derivedNumber(q.hi, p)}` : derivedNumber(q.lo, p);
    return (q.approx ? "~" : "") + body + unitSuffix(unit2, q.dim || 1);
  }
  function valueText(v, p, unit2) {
    if (v.from === "labelled" && v.value.precision !== void 0 && v.value.unit === unit2) return formatQuantity(v.value);
    return derivedText(v.value, p, unit2);
  }
  function figurePrecision(reading) {
    const labelled = reading.values.filter((v) => v.from === "labelled");
    const lengths = labelled.filter((v) => v.value.dim === 1);
    const ps = (lengths.length ? lengths : labelled).map((v) => precisionOf(v.value));
    return ps.length ? Math.min(...ps) : 1;
  }
  var add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
  var sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
  var mul = (a, k) => ({ x: a.x * k, y: a.y * k });
  var mid3 = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  var norm = (a) => Math.hypot(a.x, a.y);
  var unit = (a) => mul(a, 1 / (norm(a) || 1));
  var cross = (a, b) => a.x * b.y - a.y * b.x;
  var DEG3 = 180 / Math.PI;
  var AXES = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }];
  function nearestAxis(from, to) {
    const t = Math.atan2(to.y - from.y, to.x - from.x);
    const k = Math.round(t / (Math.PI / 2));
    return { axis: (k % 4 + 4) % 4, off: Math.abs(t - k * Math.PI / 2) };
  }
  var turn = (d, s) => s > 0 ? { x: -d.y, y: d.x } : { x: d.y, y: -d.x };
  var outward = (d, s) => s > 0 ? { x: d.y, y: -d.x } : { x: -d.y, y: d.x };
  function signedArea(v) {
    let a = 0;
    for (let i = 0; i < v.length; i++) a += cross(v[i], v[(i + 1) % v.length]);
    return a / 2;
  }
  function readable(deg2) {
    return ((deg2 + 90) % 180 + 180) % 180 - 90;
  }
  function baseSide(v) {
    let best = 0;
    let bestOff = Infinity, bestLevel = false;
    for (let k = 0; k < v.length; k++) {
      const { axis, off } = nearestAxis(v[k], v[(k + 1) % v.length]);
      const level = axis % 2 === 0;
      if (off < bestOff - 1e-9 || Math.abs(off - bestOff) <= 1e-9 && level && !bestLevel) {
        best = k;
        bestOff = off;
        bestLevel = level;
      }
    }
    return best;
  }
  function widthPair(f) {
    const horizontal = (k) => Math.abs(f.sides[k].to.x - f.sides[k].from.x) >= Math.abs(f.sides[k].to.y - f.sides[k].from.y);
    const evenWide = horizontal(0) || !horizontal(1) && f.sides[0].length >= f.sides[1].length;
    return evenWide ? [0, 2] : [1, 3];
  }
  function lengthOf(c, key2) {
    return c.vals.get(key2).value.lo * c.f;
  }
  function sideTextOf(c, key2) {
    return valueText(c.vals.get(key2), c.precision, c.unit);
  }
  function drawnText(c, key2) {
    const conflict = c.conflicts.get(key2);
    return sideTextOf(c, key2) + (conflict ? ` (labelled ${conflict.text})` : "");
  }
  function alongSide(c, text, from, to, n2, tier, key2) {
    const F = c.F;
    const d = sub(to, from);
    const off = F.labelGap + 0.6 * F.label + (tier - 1) * (1.2 * F.label + F.labelGap);
    return { text, at: add(mid3(from, to), mul(n2, off)), angle: readable(Math.atan2(d.y, d.x) * DEG3), size: F.label, anchor: "middle", key: key2 };
  }
  function polygonShape(c, v, s, side) {
    const marks = [];
    const texts = [];
    const sides = [];
    const n2 = v.length;
    for (let k = 0; k < n2; k++) {
      const a = v[k], b = v[(k + 1) % n2];
      const info = side(k);
      const value = c.vals.get(info.key);
      const L = norm(sub(b, a));
      sides.push({ key: `side${k}`, label: info.label, from: a, to: b, length: L, text: sideTextOf(c, info.key), source: value.from });
      const d = unit(sub(b, a));
      const out = outward(d, s);
      const parts = c.fig.sides[k]?.parts ?? [];
      const pv = parts.map((p) => c.vals.get(p.key));
      const pl = pv.map((x) => x && !isRange(x.value) && x.value.lo > 0 ? x.value.lo * c.f : NaN);
      const partsHold = parts.length > 0 && pl.every((x) => x > 0) && Math.abs(pl.reduce((t, x) => t + x, 0) - L) <= 1e-6 * Math.max(1, L);
      if (partsHold) {
        let t = 0;
        pl.forEach((len, i) => {
          const p0 = add(a, mul(d, t)), p1 = add(a, mul(d, t + len));
          texts.push(alongSide(c, valueText(pv[i], c.precision, c.unit), p0, p1, out, 1, parts[i].key));
          t += len;
          if (i < pl.length - 1) marks.push({ points: [add(p1, mul(out, -c.F.labelGap)), add(p1, mul(out, c.F.labelGap))] });
        });
      }
      if (info.show) texts.push(alongSide(c, drawnText(c, info.key), a, b, out, partsHold ? 2 : 1, info.key));
    }
    return { outline: { type: "polygon", points: v }, vertices: v, sides, marks, texts };
  }
  function triangleShape(c) {
    const L = [0, 1, 2].map((k) => lengthOf(c, `side${k}`));
    const ink = c.fig.vertices.slice(0, 3);
    const s = Math.sign(signedArea(ink)) || 1;
    const b = baseSide(ink);
    const u = AXES[nearestAxis(ink[b], ink[(b + 1) % 3]).axis];
    const w2 = turn(u, 1);
    const [Lb, La, Lc] = [L[b], L[(b + 1) % 3], L[(b + 2) % 3]];
    const x = (Lb * Lb + Lc * Lc - La * La) / (2 * Lb);
    const y = Math.sqrt(Math.max(0, Lc * Lc - x * x));
    const v = [];
    v[b] = { x: 0, y: 0 };
    v[(b + 1) % 3] = mul(u, Lb);
    v[(b + 2) % 3] = add(mul(u, x), mul(w2, s * y));
    const shape = polygonShape(c, v, s, (k) => ({ key: `side${k}`, label: c.vals.get(`side${k}`).label, show: true }));
    for (let k = 0; k < 3; k++) {
      const a = c.vals.get(`angle${k}`)?.value;
      if (!a || Math.abs(a.lo - 90) > 1e-6 || Math.abs(a.hi - 90) > 1e-6) continue;
      const at = v[k], e1 = unit(sub(v[(k + 1) % 3], at)), e2 = unit(sub(v[(k + 2) % 3], at));
      const q = Math.min(c.F.corner, 0.25 * Math.min(L[k], L[(k + 2) % 3]));
      shape.marks.push({ points: [add(at, mul(e1, q)), add(at, add(mul(e1, q), mul(e2, q))), add(at, mul(e2, q))] });
    }
    return shape;
  }
  function rectangleShape(c) {
    const W = lengthOf(c, "width"), H = lengthOf(c, "height");
    const ink = c.fig.vertices.slice(0, 4);
    const s = Math.sign(signedArea(ink)) || 1;
    const wide = widthPair(c.fig);
    const d0 = sub(ink[1], ink[0]);
    let d = wide.includes(0) ? { x: d0.x >= 0 ? 1 : -1, y: 0 } : { x: 0, y: d0.y >= 0 ? 1 : -1 };
    const v = [{ x: 0, y: 0 }];
    const dirs = [];
    for (let k = 0; k < 4; k++) {
      dirs.push(d);
      if (k < 3) v.push(add(v[k], mul(d, wide.includes(k) ? W : H)));
      d = turn(d, s);
    }
    const written = (pair) => {
      for (const l of c.labels ?? []) {
        const m = /^side(\d)$/.exec(l.key);
        if (!l.declared && m && pair.includes(Number(m[1]))) return Number(m[1]);
      }
      return -1;
    };
    const facing = (pair, normal) => pair.find((k) => {
      const o = outward(dirs[k], s);
      return o.x === normal.x && o.y === normal.y;
    }) ?? pair[0];
    const tall = [0, 1, 2, 3].filter((k) => !wide.includes(k));
    const wAt = written(wide) >= 0 ? written(wide) : facing(wide, { x: 0, y: -1 });
    const hAt = written(tall) >= 0 ? written(tall) : facing(tall, { x: -1, y: 0 });
    return polygonShape(c, v, s, (k) => {
      const key2 = wide.includes(k) ? "width" : "height";
      return { key: key2, label: c.vals.get(key2).label, show: k === wAt || k === hAt };
    });
  }
  function circleNote(c) {
    const labelled = c.reading.values.find((v) => v.from === "labelled" && ["diameter", "circumference", "area"].includes(v.key));
    if (!labelled) return null;
    const text = valueText(labelled, c.precision, c.unit);
    if (labelled.key === "diameter") return `\u2300 ${text}`;
    const written = c.labels?.find((l) => l.key === labelled.key && l.name)?.name ?? c.reading.keeps.map((k) => readNumber(k)?.name).find((x) => !!x);
    return `${written ?? (labelled.key === "area" ? "area" : "C")} ${text}`;
  }
  function circleShape(c) {
    const F = c.F;
    const r = lengthOf(c, "radius");
    const o = { x: 0, y: 0 }, east = { x: r, y: 0 }, west = { x: -r, y: 0 };
    const radius = c.vals.get("radius");
    const sides = [{ key: "radius", label: radius.label, from: o, to: east, length: r, text: sideTextOf(c, "radius"), source: radius.from }];
    const diameter = c.vals.get("diameter");
    if (diameter) sides.push({ key: "diameter", label: diameter.label, from: west, to: east, length: 2 * r, text: sideTextOf(c, "diameter"), source: diameter.from });
    const arm = Math.min(F.corner / 2, r / 4);
    const marks = [
      { points: [o, east], dashed: true },
      { points: [{ x: -arm, y: 0 }, { x: arm, y: 0 }] },
      { points: [{ x: 0, y: -arm }, { x: 0, y: arm }] }
    ];
    const texts = [{ text: `r ${drawnText(c, "radius")}`, at: { x: r / 2, y: -(F.labelGap + 0.6 * F.label) }, angle: 0, size: F.label, anchor: "middle", key: "radius" }];
    const note = circleNote(c);
    if (note) texts.push({ text: note, at: { x: 0, y: F.labelGap + 1.2 * F.label }, angle: 0, size: F.label, anchor: "middle", key: "measure" });
    return { outline: { type: "circle", centre: o, r }, vertices: [o], sides, marks, texts, centre: o, radius: r };
  }
  function arcShape(c) {
    const F = c.F;
    const chord = lengthOf(c, "chord"), h2 = lengthOf(c, "rise");
    const r = c.vals.has("radius") ? lengthOf(c, "radius") : chord * chord / (8 * h2) + h2 / 2;
    const [a, e, bulge] = c.fig.vertices;
    const u = AXES[nearestAxis(a, e).axis];
    const w2 = turn(u, 1);
    const sb = Math.sign(cross(sub(e, a), sub(bulge, a))) || 1;
    const A = { x: 0, y: 0 }, C = mul(u, chord), M = mul(u, chord / 2);
    const B = add(M, mul(w2, sb * h2));
    const O = add(M, mul(w2, sb * (h2 - r)));
    const large = h2 > r ? 1 : 0;
    const sweep = cross(sub(A, O), sub(B, O)) > 0 ? 1 : 0;
    const span = 2 * Math.atan2(cross(sub(A, O), sub(B, O)), (A.x - O.x) * (B.x - O.x) + (A.y - O.y) * (B.y - O.y));
    const a0 = Math.atan2(A.y - O.y, A.x - O.x);
    const samples = [];
    for (let i = 0; i <= 64; i++) samples.push(add(O, mul({ x: Math.cos(a0 + span * i / 64), y: Math.sin(a0 + span * i / 64) }, r)));
    const chordV = c.vals.get("chord"), riseV = c.vals.get("rise");
    const sides = [
      { key: "chord", label: chordV.label, from: A, to: C, length: chord, text: sideTextOf(c, "chord"), source: chordV.from },
      { key: "rise", label: riseV.label, from: M, to: B, length: h2, text: sideTextOf(c, "rise"), source: riseV.from }
    ];
    const riseText = `rise ${drawnText(c, "rise")}`;
    const along = readable(Math.atan2(u.y, u.x) * DEG3);
    const t = { x: Math.round(Math.cos(along / DEG3)), y: Math.round(Math.sin(along / DEG3)) };
    const texts = [
      alongSide(c, drawnText(c, "chord"), A, C, mul(w2, -sb), 1, "chord"),
      { text: riseText, at: add(add(M, mul(w2, sb * h2 / 2)), mul(t, F.labelGap + textWidth(riseText, F.label) / 2)), angle: along, size: F.label, anchor: "middle", key: "rise" }
    ];
    return {
      outline: { type: "arc", from: A, to: C, r, large, sweep, samples },
      vertices: [A, C, B],
      sides,
      marks: [{ points: [A, C], dashed: true }, { points: [M, B], dashed: true }],
      texts,
      centre: O,
      radius: r
    };
  }
  function lineShape(c) {
    const F = c.F;
    const L = lengthOf(c, "length");
    const { from, to } = c.fig.sides[0];
    const d = nearestAxis(from, to).axis % 2 === 0 ? { x: 1, y: 0 } : { x: 0, y: -1 };
    const n2 = { x: d.y, y: -d.x };
    const A = { x: 0, y: 0 }, B = mul(d, L);
    const value = c.vals.get("length");
    const tick = (p) => ({ points: [add(p, mul(n2, -F.labelGap)), add(p, mul(n2, F.labelGap))] });
    return {
      outline: { type: "line", from: A, to: B },
      vertices: [A, B],
      sides: [{ key: "length", label: value.label, from: A, to: B, length: L, text: sideTextOf(c, "length"), source: value.from }],
      marks: [tick(A), tick(B)],
      texts: [alongSide(c, drawnText(c, "length"), A, B, n2, 1, "length")]
    };
  }
  var DRAWN_FROM = {
    triangle: ["side0", "side1", "side2"],
    rectangle: ["width", "height"],
    circle: ["radius"],
    arc: ["chord", "rise"],
    line: ["length"]
  };
  function measureWord(f, key2) {
    const side = /^side(\d)$/.exec(key2);
    if (side) return f.sides[Number(side[1])]?.label ?? key2;
    return `its ${key2}`;
  }
  function whyNot(f, sol, labelled) {
    const reading = sol.readings[0];
    if (!labelled) return "no numbers on it";
    if (f.kind === "quadrilateral" || f.kind === "polygon") return "its sides alone do not fix its shape";
    if (!sol.unit) return "its numbers have no unit: write one on a label, or on the page";
    if (!reading) return "its labels do not fix it";
    const keys = DRAWN_FROM[f.kind];
    if (!keys) return "nothing here draws a figure of this kind";
    for (const key2 of keys) {
      const v = reading.values.find((x) => x.key === key2);
      if (!v) return `nothing fixes ${measureWord(f, key2)}`;
      const text = v.from === "labelled" && v.value.precision !== void 0 ? formatQuantity(v.value) : derivedText(v.value, figurePrecision(reading), sol.unit);
      if (isRange(v.value)) return `${v.label} is ${text}, a range: choose one value to draw it`;
      if (!(v.value.lo > 0)) return `${v.label} is ${text}: no size to draw`;
    }
    return null;
  }
  function entriesOf(solved) {
    const list = "dimensions" in solved ? solved.figures : solved;
    return list.map((x) => "solution" in x ? { figure: x.figure, solution: x.solution, labels: x.labels } : { figure: x.figure, solution: x, labels: null });
  }
  function inkBounds(f) {
    const pts = f.outline.length ? f.outline : f.vertices;
    return unionBounds(pts.map((p) => ({ minX: p.x, maxX: p.x, minY: p.y, maxY: p.y })));
  }
  var article = (kind) => /^[aeiou]/.test(kind) ? "An" : "A";
  function textBox(t) {
    const w2 = textWidth(t.text, t.size), h2 = 1.2 * t.size;
    const x0 = t.anchor === "middle" ? -w2 / 2 : 0;
    const corners = [{ x: x0, y: -h2 / 2 }, { x: x0 + w2, y: -h2 / 2 }, { x: x0 + w2, y: h2 / 2 }, { x: x0, y: h2 / 2 }];
    const a = t.angle / DEG3, ca = Math.cos(a), sa = Math.sin(a);
    return unionBounds(corners.map((p) => {
      const q = { x: t.at.x + p.x * ca - p.y * sa, y: t.at.y + p.x * sa + p.y * ca };
      return { minX: q.x, maxX: q.x, minY: q.y, maxY: q.y };
    }));
  }
  function outlinePoints(o) {
    switch (o.type) {
      case "polygon":
        return o.points;
      case "circle":
        return [{ x: o.centre.x - o.r, y: o.centre.y - o.r }, { x: o.centre.x + o.r, y: o.centre.y + o.r }];
      case "arc":
        return o.samples;
      case "line":
        return [o.from, o.to];
    }
  }
  var pointBox = (pts) => unionBounds(pts.map((p) => ({ minX: p.x, maxX: p.x, minY: p.y, maxY: p.y })));
  function moved(shape, by) {
    const m = (p) => add(p, by);
    const o = shape.outline;
    const outline = o.type === "polygon" ? { type: "polygon", points: o.points.map(m) } : o.type === "circle" ? { ...o, centre: m(o.centre) } : o.type === "arc" ? { ...o, from: m(o.from), to: m(o.to), samples: o.samples.map(m) } : { type: "line", from: m(o.from), to: m(o.to) };
    return {
      outline,
      vertices: shape.vertices.map(m),
      sides: shape.sides.map((s) => ({ ...s, from: m(s.from), to: m(s.to) })),
      marks: shape.marks.map((k) => ({ ...k, points: k.points.map(m) })),
      texts: shape.texts.map((t) => ({ ...t, at: m(t.at) })),
      ...shape.centre ? { centre: m(shape.centre) } : {},
      ...shape.radius !== void 0 ? { radius: shape.radius } : {}
    };
  }
  function pathOf(w2, points, closed) {
    return points.map((p, i) => `${i ? "L" : "M"} ${w2.n(p.x)} ${w2.n(p.y)}`).join(" ") + (closed ? " Z" : "");
  }
  function textEl(w2, t, attrs = "") {
    const baseline = t.at.y + 0.35 * t.size;
    const rot = Math.abs(t.angle) > 1e-9 ? ` transform="rotate(${fmt2(t.angle, 2)} ${w2.n(t.at.x)} ${w2.n(t.at.y)})"` : "";
    const anchor = t.anchor === "middle" ? ' text-anchor="middle"' : "";
    const key2 = t.key ? ` data-label="${esc(t.key)}"` : "";
    return `<text x="${w2.n(t.at.x)}" y="${w2.n(baseline)}" font-size="${w2.n(t.size)}"${anchor}${rot}${key2}${attrs} fill="currentColor" stroke="none">${esc(t.text)}</text>`;
  }
  function markEl(w2, k) {
    const dash = k.dashed ? ` stroke-dasharray="${w2.n(w2.F.labelGap / 2)} ${w2.n(w2.F.labelGap / 2)}"` : "";
    return `<path d="${pathOf(w2, k.points, !!k.closed)}" stroke-width="${w2.n(w2.F.thin)}"${dash}/>`;
  }
  function outlineEl(w2, o) {
    switch (o.type) {
      case "polygon":
        return `<path data-role="outline" d="${pathOf(w2, o.points, true)}"/>`;
      case "circle":
        return `<circle data-role="outline" cx="${w2.n(o.centre.x)}" cy="${w2.n(o.centre.y)}" r="${w2.n(o.r)}"/>`;
      case "arc":
        return `<path data-role="outline" d="M ${w2.n(o.from.x)} ${w2.n(o.from.y)} A ${w2.n(o.r)} ${w2.n(o.r)} 0 ${o.large} ${o.sweep} ${w2.n(o.to.x)} ${w2.n(o.to.y)}"/>`;
      case "line":
        return `<path data-role="outline" d="${pathOf(w2, [o.from, o.to], false)}"/>`;
    }
  }
  function styleOf(w2, stroke = w2.F.stroke) {
    return `fill="none" stroke="currentColor" stroke-width="${w2.n(stroke)}" stroke-linecap="round" stroke-linejoin="round" font-family="${FONT_FAMILY}"`;
  }
  function trueSize(solved, options = {}) {
    const entries = entriesOf(solved).map((e) => ({ e, b: inkBounds(e.figure) })).sort((p, q2) => p.b.minX - q2.b.minX || p.b.minY - q2.b.minY || (p.e.figure.id < q2.e.figure.id ? -1 : p.e.figure.id > q2.e.figure.id ? 1 : 0)).map((x2) => x2.e);
    const count = /* @__PURE__ */ new Map();
    for (const e of entries) count.set(e.figure.kind, (count.get(e.figure.kind) ?? 0) + 1);
    const seen = /* @__PURE__ */ new Map();
    const nameOf2 = /* @__PURE__ */ new Map();
    for (const e of entries) {
      const k = e.figure.kind;
      const i = (seen.get(k) ?? 0) + 1;
      seen.set(k, i);
      nameOf2.set(e.figure.id, options.names?.[e.figure.id] ?? ((count.get(k) ?? 0) > 1 ? `${k} ${i}` : k));
    }
    const drawable = [];
    const omitted = [];
    for (const e of entries) {
      const labelled = e.labels ? e.labels.some((l) => !l.declared) : true;
      const why = whyNot(e.figure, e.solution, labelled);
      if (why) omitted.push({ id: e.figure.id, ids: [...e.figure.ids], kind: e.figure.kind, name: nameOf2.get(e.figure.id), labelled, reason: why });
      else drawable.push(e);
    }
    const units = /* @__PURE__ */ new Map();
    for (const e of drawable) units.set(e.solution.unit, (units.get(e.solution.unit) ?? 0) + 1);
    let docUnit = options.unit;
    if (!docUnit) {
      for (const [u, n2] of units) if (!docUnit || n2 > units.get(docUnit)) docUnit = u;
    }
    docUnit ??= entries.map((e) => e.solution.unit).find((u) => !!u) ?? "in";
    const U = docUnit;
    const F = furniture(U);
    const places = COORD_PLACES[U];
    const w2 = { n: (v) => fmt2(v, places), F };
    const built = drawable.map((e) => {
      const sol = e.solution;
      const reading = sol.readings[0];
      const figUnit = sol.unit;
      const precision = figurePrecision(reading);
      const c = {
        fig: e.figure,
        vals: new Map(reading.values.map((v) => [v.key, v])),
        f: unitFactor(figUnit, U),
        F,
        precision,
        unit: figUnit,
        conflicts: new Map(sol.conflicts.map((x2) => [x2.key, x2])),
        labels: e.labels,
        reading
      };
      const shape = e.figure.kind === "triangle" ? triangleShape(c) : e.figure.kind === "rectangle" ? rectangleShape(c) : e.figure.kind === "circle" ? circleShape(c) : e.figure.kind === "arc" ? arcShape(c) : lineShape(c);
      const name = nameOf2.get(e.figure.id);
      const drawnBox = unionBounds([
        expandBounds(pointBox(outlinePoints(shape.outline)), F.stroke / 2),
        ...shape.marks.map((k) => expandBounds(pointBox(k.points), F.thin / 2)),
        ...shape.texts.map(textBox)
      ]);
      const caption = { text: name, at: { x: drawnBox.minX, y: drawnBox.maxY + F.labelGap + 0.6 * F.caption }, angle: 0, size: F.caption, anchor: "start", caption: true };
      shape.texts.push(caption);
      const box = unionBounds([drawnBox, textBox(caption)]);
      const notes2 = [];
      const n2 = sol.readings.length;
      const from = n2 > 1 ? `from the first of ${n2} readings` : "from its reading";
      const drawnKeys = new Set(shape.sides.map((x2) => x2.key).concat(DRAWN_FROM[e.figure.kind] ?? []));
      for (const x2 of sol.conflicts) {
        const made = derivedText(x2.derived, precision, figUnit);
        notes2.push(drawnKeys.has(x2.key) ? `the ${name}: ${x2.label} is labelled ${x2.text}, which cannot hold; drawn ${made}, ${from}` : `the ${name}: ${x2.label} is labelled ${x2.text}, which cannot hold; the first of ${n2} readings makes it ${made}`);
      }
      if (!sol.conflicts.length && n2 > 1) notes2.push(`the ${name}: its labels read ${n2} ways; drawn from the first`);
      for (const a of reading.assumes ?? []) {
        const m = /^the corner at ([A-Z]) measures (\d+)°/.exec(a);
        notes2.push(m ? `the ${name}: drawn as if the corner at ${m[1]} is right \u2014 the ink measures it ${m[2]}\xB0, a reading, not a fact` : `the ${name}: drawn on a reading \u2014 ${a}`);
      }
      if (figUnit !== U) notes2.push(`the ${name}: labelled in ${UNIT_WORDS2[figUnit]}, drawn in ${UNIT_WORDS2[U]}`);
      return { e, shape, box, name, notes: notes2, precision, figUnit, reading };
    });
    const clauses = [];
    const one = built.length === 1;
    for (const b of built) {
      const n2 = b.e.solution.readings.length;
      const who = one ? "" : `the ${b.name} `;
      if (b.e.solution.conflicts.length) clauses.push(`${who}drawn from the first of ${n2} readings: its labels conflict`);
      else if (n2 > 1) clauses.push(`${who}drawn from the first of ${n2} readings`);
      const assumed = b.reading.assumes?.[0] && /^the corner at ([A-Z])/.exec(b.reading.assumes[0]);
      if (assumed) clauses.push(`${who}drawn as if the corner at ${assumed[1]} is right`);
    }
    const leftOut = omitted.filter((o) => o.labelled);
    const unlabelled = omitted.filter((o) => !o.labelled);
    if (leftOut.length) clauses.push(`${leftOut.length} figure${leftOut.length > 1 ? "s" : ""} left out`);
    const subject = built.length === 0 ? "Nothing" : one ? `${article(built[0].e.figure.kind)} ${built[0].e.figure.kind}` : `${built.length} figures`;
    const title = `${subject} at true size, in ${UNIT_WORDS2[U]}${clauses.length ? ` \u2014 ${clauses.join("; ")}` : ""}`;
    const notes = [
      ...built.flatMap((b) => b.notes),
      ...leftOut.map((o) => `left out: the ${o.name} \u2014 ${o.reason}`),
      ...unlabelled.length ? [`left out: ${unlabelled.length} mark${unlabelled.length > 1 ? "s" : ""} with no numbers on ${unlabelled.length > 1 ? "them" : "it"}`] : []
    ];
    const bar = SCALE_BAR[U];
    const rowWidth = built.reduce((t, b) => t + (b.box.maxX - b.box.minX), 0) + F.gap * Math.max(0, built.length - 1);
    const textWide = Math.max(rowWidth, F.minWidth, bar.length);
    const heading = [];
    let y = F.margin;
    const titleLines = wrap(title, textWide, F.title);
    for (const line of titleLines) {
      heading.push({ text: line, at: { x: F.margin, y: y + 0.6 * F.title }, angle: 0, size: F.title, anchor: "start" });
      y += 1.35 * F.title;
    }
    for (const note of notes) {
      for (const line of wrap(note, textWide, F.note)) {
        heading.push({ text: line, at: { x: F.margin, y: y + 0.6 * F.note }, angle: 0, size: F.note, anchor: "start" });
        y += 1.35 * F.note;
      }
    }
    const top = y + F.block;
    let x = F.margin;
    const placed2 = built.map((b) => {
      const by = { x: x - b.box.minX, y: top - b.box.minY };
      x += b.box.maxX - b.box.minX + F.gap;
      const shape = moved(b.shape, by);
      const box = { minX: b.box.minX + by.x, maxX: b.box.maxX + by.x, minY: b.box.minY + by.y, maxY: b.box.maxY + by.y };
      return { ...b, shape, box };
    });
    const bottom2 = placed2.length ? Math.max(...placed2.map((p) => p.box.maxY)) : y;
    const q = 10 ** places;
    const pad = placed2.length ? expandBounds(unionBounds(placed2.map((p) => p.box)), F.labelGap) : null;
    const region = pad ? { minX: Math.floor(pad.minX * q + 1e-6) / q, maxX: Math.ceil(pad.maxX * q - 1e-6) / q, minY: Math.floor(pad.minY * q + 1e-6) / q, maxY: Math.ceil(pad.maxY * q - 1e-6) / q } : { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    const barTop = bottom2 + F.block;
    const barH = F.labelGap;
    const steps = Math.round(bar.length / bar.step);
    const barParts = [];
    barParts.push(`<rect x="${w2.n(F.margin)}" y="${w2.n(barTop)}" width="${w2.n(bar.length)}" height="${w2.n(barH)}"/>`);
    for (let i = 0; i < steps; i += 2) {
      barParts.push(`<rect x="${w2.n(F.margin + i * bar.step)}" y="${w2.n(barTop)}" width="${w2.n(bar.step)}" height="${w2.n(barH)}" fill="currentColor" stroke="none"/>`);
    }
    const barName = `${formatNumber(bar.length, 4)} ${U}`;
    for (let i = 0; i <= steps; i += bar.every) {
      const label = i === steps ? barName : formatNumber(i * bar.step, 4);
      const at = { x: F.margin + i * bar.step, y: barTop + barH + F.labelGap + 0.6 * F.note };
      barParts.push(textEl(w2, { text: label, at, angle: 0, size: F.note, anchor: i === 0 ? "start" : "middle" }));
    }
    const barBottom = barTop + barH + F.labelGap + 1.2 * F.note;
    const barRight = F.margin + bar.length + textWidth(barName, F.note) / 2;
    const up = (v) => Math.ceil(v * q - 1e-6) / q;
    const width = up(Math.max(x - F.gap + F.margin, F.margin + textWide + F.margin, barRight + F.margin));
    const height = up(barBottom + F.margin);
    const figureEls = placed2.map((p) => {
      const lines = [`<g data-figure="${esc(p.e.figure.id)}" data-kind="${p.e.figure.kind}" data-name="${esc(p.name)}">`, outlineEl(w2, p.shape.outline)];
      for (const k of p.shape.marks) lines.push(markEl(w2, k));
      for (const t of p.shape.texts) lines.push(textEl(w2, t, t.caption ? ' data-caption="1"' : ""));
      lines.push("</g>");
      return lines.join("\n");
    });
    const piecesMarkup = placed2.length ? `<g ${styleOf(w2)}>
${figureEls.join("\n")}
</g>` : "";
    const titleMarkup = `<g data-title="1" ${styleOf(w2)}>
${heading.map((t, i) => textEl(w2, t, i < titleLines.length ? ' font-weight="600"' : "")).join("\n")}
</g>`;
    const barMarkup = `<g data-scale-bar="${barName}" ${styleOf(w2, F.thin)}>
${barParts.join("\n")}
</g>`;
    const paper = PAPER[U];
    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt2(width * paper.per, places)}${paper.css}" height="${fmt2(height * paper.per, places)}${paper.css}" viewBox="0 0 ${w2.n(width)} ${w2.n(height)}">`,
      `<title>${esc(title)}</title>`,
      titleMarkup,
      ...piecesMarkup ? [piecesMarkup] : [],
      barMarkup,
      "</svg>",
      ""
    ].join("\n");
    const figures = placed2.map((p) => ({
      id: p.e.figure.id,
      ids: [...p.e.figure.ids],
      kind: p.e.figure.kind,
      name: p.name,
      unit: p.figUnit,
      vertices: p.shape.vertices,
      sides: p.shape.sides,
      ...p.shape.centre ? { centre: p.shape.centre } : {},
      ...p.shape.radius !== void 0 ? { radius: p.shape.radius } : {},
      bounds: pointBox(outlinePoints(p.shape.outline)),
      box: p.box,
      precision: p.precision,
      reading: p.reading,
      readings: p.e.solution.readings.length,
      conflicts: p.e.solution.conflicts,
      notes: p.notes
    }));
    return { svg, unit: U, width, height, title, notes, figures, omitted, print: { markup: piecesMarkup, region } };
  }

  // src/maths/print.ts
  var PAPERS = {
    letter: { name: "Letter", width: 8.5, height: 11, unit: "in", margin: 0.5, pad: 0.15, big: 0.28, small: 0.09, thin: 0.01, cell: 0.16, mapCell: 0.6 },
    a4: { name: "A4", width: 210, height: 297, unit: "mm", margin: 12, pad: 4, big: 7, small: 2.3, thin: 0.25, cell: 4, mapCell: 15 }
  };
  var PAGE_PLACES = { in: 4, mm: 3 };
  function rowName(r) {
    let s = "";
    for (let n2 = r + 1; n2 > 0; n2 = Math.floor((n2 - 1) / 26)) s = String.fromCharCode(65 + (n2 - 1) % 26) + s;
    return s;
  }
  function amount(v, unit2) {
    const q = quantity(v, unit2);
    return systemOf(unit2) === "imperial" ? formatQuantity(q, { fractions: 16, words: true }) : formatQuantity(q, { words: true });
  }
  function tidy(v, places) {
    return Number(fmt2(v, places));
  }
  function printTiled(doc, options = {}) {
    const paper = options.paper ?? "letter";
    const P = PAPERS[paper];
    const orientation = options.orientation ?? "portrait";
    const [pw, ph] = orientation === "landscape" ? [P.height, P.width] : [P.width, P.height];
    const pu = P.unit;
    const U = doc.unit;
    const imperial = systemOf(U) === "imperial";
    const k = unitFactor(U, pu);
    const pn = (v) => fmt2(v, PAGE_PLACES[pu]);
    const places = COORD_PLACES[U];
    const dn = (v) => fmt2(v, places);
    const testSquare = imperial ? { size: 1, unit: "in", text: "1 in" } : { size: 2, unit: "cm", text: "2 cm" };
    const S = testSquare.size * unitFactor(testSquare.unit, pu);
    const m = options.margin ? options.margin.lo * unitFactor(options.margin.unit ?? pu, pu) : P.margin;
    const footer = S + 2 * P.pad;
    const Wp = pw - 2 * m, Hp = ph - 2 * m - footer;
    const od = options.overlap ? options.overlap.lo * unitFactor(options.overlap.unit ?? U, U) : imperial ? unitFactor("in", U) / 2 : unitFactor("cm", U);
    const Wd = Wp / k, Hd = Hp / k;
    const region = doc.print.region;
    const rw = region.maxX - region.minX, rh = region.maxY - region.minY;
    const base = {
      paper,
      orientation,
      unit: U,
      tile: { width: tidy(Wd, places), height: tidy(Hd, places) },
      overlap: tidy(od, places),
      region,
      testSquare
    };
    const empty = (reason2, error) => ({ ...base, rows: 0, cols: 0, pages: [], assembly: "", html: "", reason: reason2, ...error ? { error } : {} });
    if (!(rw > 0 && rh > 0) || !doc.print.markup) return empty("nothing to print: no figure is drawn at true size");
    if (!(od >= 0) || Wd <= od || Hd <= od) {
      const why = `the margins and a ${amount(od, U)} overlap leave no room on ${P.name} ${orientation}`;
      return empty(`nothing to print: ${why}`, why);
    }
    const count = (len, tile) => len <= tile + 1e-9 ? 1 : Math.ceil((len - od) / (tile - od) - 1e-9);
    const cols = count(rw, Wd), rows = count(rh, Hd);
    const n2 = rows * cols;
    const x0 = (c) => region.minX + c * (Wd - od);
    const y0 = (r) => region.minY + r * (Hd - od);
    const label = (r, c) => `${rowName(r)}${c + 1}`;
    const F = imperial ? { rho: 0.12, font: 0.1, dash: 0.1, thin: 0.01, gap: 0.04 } : { rho: 3, font: 2.5, dash: 2.5, thin: 0.25, gap: 1 };
    const kf = unitFactor(imperial ? "in" : "mm", U);
    const longest = 2 * (rowName(rows - 1).length + String(cols).length) + 1;
    const rho = Math.min(F.rho * kf, 0.4 * od), font = Math.min(F.font * kf, 0.9 * od / (0.6 * longest)), dash = F.dash * kf, gap = F.gap * kf;
    const text = (x, y, t, anchor) => `<text x="${dn(x)}" y="${dn(y + 0.35 * font)}" font-size="${dn(font)}"${anchor === "middle" ? ' text-anchor="middle"' : ""} fill="currentColor" stroke="none">${esc(t)}</text>`;
    const dashes = `stroke-dasharray="${dn(dash)} ${dn(dash)}"`;
    const across = (r, c) => {
      const x = x0(c + 1) + od / 2, top = y0(r), yM = top + Hd / 2;
      const name = `${label(r, c)}|${label(r, c + 1)}`;
      const below = yM + rho + gap + 1.2 * font + gap;
      return [
        `<g data-join="${name}">`,
        `<path d="M ${dn(x)} ${dn(top)} L ${dn(x)} ${dn(yM - rho)} M ${dn(x)} ${dn(below)} L ${dn(x)} ${dn(top + Hd)}" ${dashes}/>`,
        `<circle cx="${dn(x)}" cy="${dn(yM)}" r="${dn(rho)}"/>`,
        `<path d="M ${dn(x - rho)} ${dn(yM)} L ${dn(x + rho)} ${dn(yM)} M ${dn(x)} ${dn(yM - rho)} L ${dn(x)} ${dn(yM + rho)}"/>`,
        text(x, yM + rho + gap + 0.6 * font, name, "middle"),
        "</g>"
      ].join("\n");
    };
    const down = (r, c) => {
      const y = y0(r + 1) + od / 2, left = x0(c), xM = left + Wd / 2;
      const name = `${label(r, c)}/${label(r + 1, c)}`;
      const after = xM + rho + gap + textWidth(name, font) + gap;
      return [
        `<g data-join="${name}">`,
        `<path d="M ${dn(left)} ${dn(y)} L ${dn(xM - rho)} ${dn(y)} M ${dn(after)} ${dn(y)} L ${dn(left + Wd)} ${dn(y)}" ${dashes}/>`,
        `<circle cx="${dn(xM)}" cy="${dn(y)}" r="${dn(rho)}"/>`,
        `<path d="M ${dn(xM - rho)} ${dn(y)} L ${dn(xM + rho)} ${dn(y)} M ${dn(xM)} ${dn(y - rho)} L ${dn(xM)} ${dn(y + rho)}"/>`,
        text(xM + rho + gap, y, name, "start"),
        "</g>"
      ].join("\n");
    };
    const square = testSquare.text;
    const sentences = [
      `Measure this square before you cut: it must be exactly ${square} on each side.`,
      "If it is not, the printer scaled this page: print again at 100% (actual size), not fit to page.",
      `Pages overlap by ${amount(od, U)}: trim one along a dashed line and lay it over its neighbour, matching the \u2295 marks.`
    ];
    const lastPage = `page ${n2} of ${n2}`;
    const colW = Math.max(textWidth("W".repeat(rowName(rows - 1).length + String(cols).length), P.big), textWidth(lastPage, P.small));
    const gap2 = 1.5 * P.pad;
    const cell = Math.min(P.cell, S / rows, 1.6 * S / cols);
    const fy = ph - m - footer;
    const mapRight = pw - m - colW - gap2;
    const mapLeft = mapRight - cols * cell;
    const textLeft = m + S + gap2;
    const textWide = Math.max(mapLeft - gap2 - textLeft, 10 * P.small);
    const words = sentences.flatMap((s) => wrap(s, textWide, P.small));
    const style = (thin2) => `fill="none" stroke="currentColor" stroke-width="${pn(thin2)}" stroke-linecap="round" stroke-linejoin="round" font-family="${FONT_FAMILY}"`;
    const pages = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const name = label(r, c);
        const index = pages.length;
        const joins = [];
        if (r > 0) joins.push(down(r - 1, c));
        if (c > 0) joins.push(across(r, c - 1));
        if (c < cols - 1) joins.push(across(r, c));
        if (r < rows - 1) joins.push(down(r, c));
        const e = m - k * x0(c), f = m - k * y0(r);
        const footerEls = [];
        footerEls.push(`<rect data-test-square="${square}" x="${pn(m)}" y="${pn(fy + P.pad)}" width="${pn(S)}" height="${pn(S)}" fill="currentColor" fill-opacity="0.12" stroke="none"/>`);
        footerEls.push(`<rect x="${pn(m + P.thin / 2)}" y="${pn(fy + P.pad + P.thin / 2)}" width="${pn(S - P.thin)}" height="${pn(S - P.thin)}"/>`);
        footerEls.push(`<text x="${pn(m + S / 2)}" y="${pn(fy + P.pad + S / 2 + 0.35 * P.small)}" font-size="${pn(P.small)}" text-anchor="middle" fill="currentColor" stroke="none">${esc(square)}</text>`);
        words.forEach((line, i) => {
          footerEls.push(`<text x="${pn(textLeft)}" y="${pn(fy + P.pad + (i + 0.8) * 1.3 * P.small)}" font-size="${pn(P.small)}" fill="currentColor" stroke="none">${esc(line)}</text>`);
        });
        for (let rr = 0; rr < rows; rr++) {
          for (let cc = 0; cc < cols; cc++) {
            const here = rr === r && cc === c;
            footerEls.push(`<rect data-cell="${label(rr, cc)}"${here ? ' data-here="1"' : ""} x="${pn(mapLeft + cc * cell)}" y="${pn(fy + P.pad + rr * cell)}" width="${pn(cell)}" height="${pn(cell)}"${here ? ' fill="currentColor"' : ""}/>`);
          }
        }
        footerEls.push(`<text x="${pn(pw - m)}" y="${pn(fy + P.pad + 0.8 * P.big)}" font-size="${pn(P.big)}" font-weight="600" text-anchor="end" fill="currentColor" stroke="none">${name}</text>`);
        footerEls.push(`<text x="${pn(pw - m)}" y="${pn(fy + P.pad + P.big + 1.3 * P.small)}" font-size="${pn(P.small)}" text-anchor="end" fill="currentColor" stroke="none">page ${index + 1} of ${n2}</text>`);
        const svg = [
          `<svg xmlns="http://www.w3.org/2000/svg" width="${pn(pw)}${pu}" height="${pn(ph)}${pu}" viewBox="0 0 ${pn(pw)} ${pn(ph)}" data-page="${name}">`,
          `<title>${esc(`${name} \xB7 page ${index + 1} of ${n2} \xB7 ${doc.title}`)}</title>`,
          `<defs><clipPath id="mm-tile-${name}"><rect x="${pn(m)}" y="${pn(m)}" width="${pn(Wp)}" height="${pn(Hp)}"/></clipPath></defs>`,
          `<g clip-path="url(#mm-tile-${name})">`,
          `<g transform="matrix(${fmt2(k, 10)} 0 0 ${fmt2(k, 10)} ${pn(e)} ${pn(f)})">`,
          doc.print.markup,
          ...joins.length ? [`<g ${style(F.thin * kf)}>`, ...joins, "</g>"] : [],
          "</g>",
          "</g>",
          `<rect data-tile-frame="${name}" x="${pn(m)}" y="${pn(m)}" width="${pn(Wp)}" height="${pn(Hp)}" fill="none" stroke="currentColor" stroke-width="${pn(P.thin)}" stroke-opacity="0.35"/>`,
          `<g data-footer="${name}" ${style(P.thin)}>`,
          ...footerEls,
          "</g>",
          "</svg>",
          ""
        ].join("\n");
        pages.push({
          label: name,
          row: r,
          col: c,
          index,
          region: { minX: tidy(x0(c), places), maxX: tidy(x0(c) + Wd, places), minY: tidy(y0(r), places), maxY: tidy(y0(r) + Hd, places) },
          svg
        });
      }
    }
    const mc = P.mapCell;
    const assembly = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${pn(cols * mc)}${pu}" height="${pn(rows * mc)}${pu}" viewBox="0 0 ${pn(cols * mc)} ${pn(rows * mc)}" data-assembly="${cols}\xD7${rows}">`,
      `<g ${style(P.thin)}>`,
      ...pages.map((p) => [
        `<rect data-cell="${p.label}" x="${pn(p.col * mc)}" y="${pn(p.row * mc)}" width="${pn(mc)}" height="${pn(mc)}"/>`,
        `<text x="${pn((p.col + 0.5) * mc)}" y="${pn((p.row + 0.5) * mc + 0.35 * 0.3 * mc)}" font-size="${pn(0.3 * mc)}" text-anchor="middle" fill="currentColor" stroke="none">${p.label}</text>`
      ].join("\n")),
      "</g>",
      "</svg>"
    ].join("\n");
    const pages1 = n2 === 1 ? "page" : "pages";
    const reason = `${n2} ${pages1}, ${cols} across and ${rows} down, on ${P.name} ${orientation} at 100%: each shows ${formatNumber(Wd, 2)} \xD7 ${formatNumber(Hd, 2)} ${U} of the drawing, and neighbours share ${amount(od, U)}; measure the ${square} square on any page before cutting`;
    const sheetW = `${pn(pw)}${pu}`, sheetH = `${pn(ph)}${pu}`;
    const html = [
      "<!doctype html>",
      '<html lang="en">',
      "<head>",
      '<meta charset="utf-8">',
      `<title>${esc(`${doc.title} \u2014 ${n2} ${pages1}, ${P.name} ${orientation}`)}</title>`,
      "<style>",
      `@page { size: ${sheetW} ${sheetH}; margin: 0; }`,
      "html, body { margin: 0; padding: 0; background: #fff; color: #000; }",
      `.sheet { width: ${sheetW}; height: ${sheetH}; overflow: hidden; break-after: page; page-break-after: always; }`,
      ".sheet:last-child { break-after: auto; page-break-after: auto; }",
      `.sheet > svg { display: block; width: ${sheetW}; height: ${sheetH}; }`,
      `.guide { font: 14px/1.5 ${FONT_FAMILY}; max-width: 46em; margin: 0 auto; padding: 24px 16px; }`,
      ".guide svg { display: block; max-width: 100%; height: auto; margin-top: 16px; }",
      "@media screen { body { background: #e9e7e2; } .sheet { margin: 24px auto; background: #fff; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3); } }",
      "@media print { .guide { display: none; } }",
      "</style>",
      "</head>",
      "<body>",
      '<div class="guide">',
      `<h1>${esc(doc.title)}</h1>`,
      `<p>${esc(`${n2} ${pages1}, ${cols} across and ${rows} down, on ${P.name} ${orientation}.`)}</p>`,
      "<ol>",
      "<li>Print at 100% \u2014 \u201Cactual size\u201D \u2014 with fit to page turned off.</li>",
      `<li>${esc(`Measure the square on the first page before you cut: it must be exactly ${square} on each side. If it is not, the printer scaled the page; print again.`)}</li>`,
      `<li>${esc(`Lay the pages out as the map shows, A1 at the top left. Pages overlap by ${amount(od, U)}: trim one along a dashed line, lay it over its neighbour with the \u2295 marks on each other, and tape.`)}</li>`,
      "</ol>",
      assembly,
      "</div>",
      ...pages.map((p) => `<section class="sheet" aria-label="page ${p.label}">
${p.svg}</section>`),
      "</body>",
      "</html>",
      ""
    ].join("\n");
    return { ...base, rows, cols, pages, assembly, html, reason };
  }

  // src/session/words.ts
  var LETTER_MAX_HEIGHT_PX = 150;
  var LETTER_MAX_WIDTH_PX = 150;
  var LETTER_HEIGHT_RATIO = 4;
  var WORD_GAP_RATIO = 0.7;
  var WORD_BAND_OVERLAP = 0.35;
  var WORD_WINDOW_MS = 3e3;
  var DASH_MAX_WIDTH_PX = 60;
  function isLetterLike(b, scale) {
    const h2 = (b.maxY - b.minY) / scale, w2 = (b.maxX - b.minX) / scale;
    if (h2 > LETTER_MAX_HEIGHT_PX || w2 > LETTER_MAX_WIDTH_PX) return false;
    if (h2 < 10 && w2 > DASH_MAX_WIDTH_PX) return false;
    return true;
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
    if (!tiny && (letH / runH > LETTER_HEIGHT_RATIO || runH / letH > LETTER_HEIGHT_RATIO)) return { ok: false, reasoning: "a different size from the letters beside it" };
    return { ok: true, reasoning: `beside the last letter, on its line, ${Math.round(gap / scale)}px away` };
  }
  function wordConfidence(letters) {
    return Math.min(0.88, 0.55 + 0.08 * (letters - 2));
  }

  // src/store/merge.ts
  function mergeLogs(logs, opts = {}) {
    const names = Object.keys(logs).sort();
    const tagged = [];
    for (const name of names) logs[name].forEach((ev, i) => tagged.push({ ev, name, i }));
    tagged.sort((a, b) => {
      const ta = atOf(a.ev), tb = atOf(b.ev);
      if (ta !== tb) return ta - tb;
      if (a.name !== b.name) return a.name < b.name ? -1 : 1;
      return a.i - b.i;
    });
    const kept = foldAuthorship(tagged, opts);
    const stamp = opts.me !== void 0;
    return kept.map((t) => stamp && t.name !== opts.me ? { ...t.ev, by: t.name } : { ...t.ev });
  }
  function describeAuthorshipCollision(c) {
    return `two different events are both "${c.origin}" number ${c.seq} \u2014 the one in ${c.kept}'s log is kept and the one in ${c.dropped}'s is left out; two hands have written under one name`;
  }
  function foldAuthorship(tagged, opts) {
    const winner = /* @__PURE__ */ new Map();
    for (const t of tagged) {
      const k = authorKey(t.ev);
      if (k === null) continue;
      const held = winner.get(k);
      if (!held || opts.me !== void 0 && t.name === opts.me && held.name !== opts.me) winner.set(k, t);
    }
    const out = [];
    for (const t of tagged) {
      const k = authorKey(t.ev);
      if (k === null) {
        out.push(t);
        continue;
      }
      const w2 = winner.get(k);
      if (w2 === t) {
        out.push(t);
        continue;
      }
      if (opts.onCollision && !sameEvent(w2.ev, t.ev)) {
        opts.onCollision({ origin: t.ev.origin, seq: t.ev.seq, kept: w2.name, dropped: t.name });
      }
    }
    return out;
  }
  function authorKey(ev) {
    if (typeof ev.origin !== "string" || !ev.origin) return null;
    if (typeof ev.seq !== "number" || !Number.isSafeInteger(ev.seq) || ev.seq < 0) return null;
    return `${ev.origin}#${ev.seq}`;
  }
  function sameEvent(a, b) {
    if (a === b) return true;
    return canonical(a, true) === canonical(b, true);
  }
  function canonical(v, top = false) {
    if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
    if (Array.isArray(v)) return "[" + v.map((x) => canonical(x)).join(",") + "]";
    const o = v;
    const keys = Object.keys(o).filter((k) => o[k] !== void 0 && !(top && k === "by")).sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonical(o[k])).join(",") + "}";
  }
  function atOf(ev) {
    return "at" in ev && typeof ev.at === "number" ? ev.at : 0;
  }

  // src/session/hands.ts
  var ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
  function sittingToken(length = 4, random = Math.random) {
    let out = "";
    for (let i = 0; i < length; i++) out += ALPHABET[Math.floor(random() * ALPHABET.length) % ALPHABET.length];
    return out;
  }
  function sittingName(person, suffix = sittingToken()) {
    const who = String(person ?? "").replace(/~.*$/, "").trim() || "hand";
    return `${who}~${suffix}`;
  }
  function handLabel(name) {
    return String(name ?? "").replace(/~[^~]*$/, "");
  }

  // src/kinds/kinds.ts
  var KINDS = [
    { kind: "html", extensions: ["html", "htm"], mime: "text/html", renderer: "page", addressing: "regions", textual: true },
    { kind: "js", extensions: ["js", "mjs", "ts"], mime: "text/javascript", renderer: "source", addressing: "functions", textual: true },
    { kind: "json", extensions: ["json"], mime: "application/json", renderer: "tree", addressing: "keys", textual: true },
    { kind: "svg", extensions: ["svg"], mime: "image/svg+xml", renderer: "vector", addressing: "elements", textual: true },
    { kind: "md", extensions: ["md", "markdown"], mime: "text/markdown", renderer: "prose", addressing: "headings", textual: true },
    { kind: "png", extensions: ["png"], mime: "image/png", renderer: "image", addressing: "pixels", textual: false },
    { kind: "jpg", extensions: ["jpg", "jpeg"], mime: "image/jpeg", renderer: "image", addressing: "pixels", textual: false },
    { kind: "text", extensions: ["txt"], mime: "text/plain", renderer: "text", addressing: "runs", textual: true },
    { kind: "control", extensions: [], mime: "application/json", renderer: "control", addressing: "value", textual: true },
    // A program that renders itself (a three.js scene, a 2D drawing) in a
    // scripts-only, opaque-origin frame with a clear background, and REPORTS
    // its parts — named things at named places — so ink over it lands on them.
    { kind: "run", extensions: ["run.js"], mime: "text/javascript", renderer: "run", addressing: "parts", textual: true }
  ];
  function kindOf(path) {
    const lower = path.toLowerCase();
    for (const row of KINDS) for (const e of row.extensions) if (e.includes(".") && lower.endsWith("." + e)) return row;
    const ext = (path.split(".").pop() ?? "").toLowerCase();
    if (!ext || ext === path.toLowerCase()) return void 0;
    return KINDS.find((k) => k.extensions.includes(ext));
  }
  function rowOf(kind) {
    return KINDS.find((k) => k.kind === kind);
  }

  // src/store/seam.ts
  var META_DIR = ".metamedium";
  var LOG_DIR = `${META_DIR}/logs`;
  var LOG_EXT = ".jsonl";
  function logPathFor(participant) {
    const safe = participant.replace(/[^A-Za-z0-9._-]+/g, "_");
    return `${LOG_DIR}/${safe}${LOG_EXT}`;
  }
  function participantOfLog(path) {
    if (!path.startsWith(LOG_DIR + "/") || !path.endsWith(LOG_EXT)) return null;
    return path.slice(LOG_DIR.length + 1, -LOG_EXT.length);
  }
  function encodeLog(events) {
    return events.map((ev) => JSON.stringify(ev)).join("\n") + (events.length ? "\n" : "");
  }
  function decodeLog(text) {
    const events = [];
    let skipped = 0;
    for (const line of text.split("\n")) {
      const l = line.trim();
      if (!l) continue;
      try {
        events.push(JSON.parse(l));
      } catch {
        skipped++;
      }
    }
    return { events, skipped };
  }
  function isCanvasFile(path) {
    if (path === META_DIR || path.startsWith(META_DIR + "/")) return null;
    const parts = path.split("/");
    if (parts.some((p) => p.startsWith(".") && p !== META_DIR)) return null;
    const row = kindOf(path);
    return row ? { path, kind: row.kind } : null;
  }
  var encoder = new TextEncoder();
  var decoder = new TextDecoder();
  function toBytes(data) {
    return typeof data === "string" ? encoder.encode(data) : data;
  }
  function toText(data) {
    return typeof data === "string" ? data : decoder.decode(data);
  }
  var ReadOnlyError = class extends Error {
    constructor(what) {
      super(`${what}: this store is read-only`);
      this.name = "ReadOnlyError";
    }
  };
  var MemoryStore = class {
    constructor(seed = {}, opts = {}) {
      this.files = /* @__PURE__ */ new Map();
      for (const [path, data] of Object.entries(seed)) this.files.set(path, toBytes(data));
      this.readOnly = !!opts.readOnly;
    }
    capabilities() {
      return { write: !this.readOnly, watch: false };
    }
    async list() {
      const out = [];
      for (const [path, bytes] of this.files) {
        const e = isCanvasFile(path);
        if (e) out.push({ ...e, size: bytes.length });
      }
      return out.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
    }
    async read(path) {
      const bytes = this.files.get(path);
      if (!bytes) throw new Error(`${path}: not in the folder`);
      const row = kindOf(path);
      return row && !row.textual ? bytes : toText(bytes);
    }
    async write(path, data) {
      if (this.readOnly) throw new ReadOnlyError(`write ${path}`);
      this.files.set(path, toBytes(data));
    }
    async appendLog(participant, events) {
      if (this.readOnly) throw new ReadOnlyError(`append to ${participant}'s log`);
      if (events.length === 0) return;
      const path = logPathFor(participant);
      const prev = this.files.get(path);
      const next = encoder.encode(encodeLog(events));
      if (!prev) {
        this.files.set(path, next);
        return;
      }
      const joined = new Uint8Array(prev.length + next.length);
      joined.set(prev, 0);
      joined.set(next, prev.length);
      this.files.set(path, joined);
    }
    async readLogs() {
      const out = {};
      for (const [path, bytes] of this.files) {
        const who = participantOfLog(path);
        if (who) out[who] = decodeLog(toText(bytes)).events;
      }
      return out;
    }
    /** Every path held, logs included — for tests and for export. */
    paths() {
      return [...this.files.keys()].sort();
    }
  };

  // src/store/live.ts
  var SEND_WAIT_MS = 1e4;
  var LiveStore = class {
    constructor(transport, me, room = "room", opts = {}) {
      this.transport = transport;
      this.me = me;
      this.room = room;
      this.logs = {};
      /** The authorship of every event each held log carries, so an event heard twice is held once. */
      this.carried = /* @__PURE__ */ new Map();
      this.seen = /* @__PURE__ */ new Map();
      /** The newest `at` already applied from each hand, so a replayed snapshot cannot install a past state. */
      this.applied = /* @__PURE__ */ new Map();
      /** The sitting heard writing each log. */
      this.sittings = /* @__PURE__ */ new Map();
      /** A name two hands are both using: the sentence that says so. */
      this.collided = /* @__PURE__ */ new Map();
      /**
       * A log name two different events were both numbered under, found in the
       * logs held here (the merge's collision, L1b): one sentence per name.
       */
      this.misnumbered = /* @__PURE__ */ new Map();
      /** Whether the logs held here changed since they were last read for `misnumbered`. */
      this.logsChanged = false;
      /** The relay's word that this room is older than its buffer. */
      this.truncated = null;
      /** Whether this store has put MY log on the wire yet, in any form. */
      this.published = false;
      this.lastAt = 0;
      /** The line still leaving, when the transport is asynchronous. */
      this.tail = null;
      this.listeners = [];
      this.sitting = opts.sitting || sittingToken(8);
      this.logs[me] = [];
      this.off = transport.onMessage((line) => this.receive(line));
    }
    capabilities() {
      return { write: true, watch: true };
    }
    /** A live room holds logs, not files: nothing to list, read or write. */
    async list() {
      return [];
    }
    async read(path) {
      throw new Error(`${path}: a live room holds no files`);
    }
    async write(path, _data) {
      void _data;
      throw new ReadOnlyError(path);
    }
    async appendLog(participant, events) {
      if (!events.length) return;
      const log = this.logs[participant] ??= [];
      log.push(...events);
      this.logsChanged = true;
      if (participant === this.me) this.published = true;
      await this.post({ participant, events: events.slice(), at: this.stamp(), sid: this.sitting });
    }
    /**
     * Put MY log on the wire as it stands: `events` is the whole of it, and the
     * store sends whatever makes every peer's copy equal it. When it only grew
     * since the last send, that is the new tail, as an append. When it did not —
     * an undo, a reset, anything that is not growth — it is the whole log, as a
     * `full`, which every peer takes in place of what it held: an undo reaches
     * the room instead of standing only here (L1). The first send of a store is
     * always whole, so a hand that joins a room again in the same sitting
     * replaces what the room holds of it rather than doubling it.
     */
    async publish(events) {
      const sent = this.logs[this.me];
      if (this.published && extendsLog(sent, events)) {
        if (events.length > sent.length) await this.appendLog(this.me, events.slice(sent.length));
        return;
      }
      this.published = true;
      this.logs[this.me] = events.slice();
      this.logsChanged = true;
      await this.post({ participant: this.me, events: events.slice(), at: this.stamp(), full: true, sid: this.sitting });
    }
    async readLogs() {
      const out = {};
      for (const [k, v] of Object.entries(this.logs)) out[k] = v.slice();
      return out;
    }
    /** Ask the room for its logs; every peer answers with every log it holds, in full. */
    hello() {
      void this.post({ participant: this.me, events: [], at: this.stamp(), hello: true, sid: this.sitting });
    }
    /** Every hand heard from, and when. */
    presence() {
      return [...this.seen.entries()].map(([participant, at]) => ({ participant, at })).sort((a, b) => b.at - a.at);
    }
    /**
     * Names heard from two hands at once — two sittings writing under one name,
     * or, for a line from before sittings, a `full` that disagrees with what is
     * held (an append-only log cannot diverge from itself). The fault that
     * silently ate a drawing (§1 of NOTES-DRAWING-WITH-THE-HAND). One sentence
     * per name, for the status bar. The two hands that share the name hear it
     * too: this hand's own name is checked before any line is discarded.
     */
    collisions() {
      return [...this.collided.values()];
    }
    /** The relay's word that this room is older than its buffer, as a sentence, or null. */
    truncation() {
      const n2 = this.truncated;
      if (!n2) return null;
      return `the room is older than the relay remembers \u2014 ${n2.dropped} earlier line${n2.dropped === 1 ? " is" : "s are"} gone`;
    }
    /**
     * Log names two DIFFERENT events were both numbered under, in the logs held
     * here — one sentence per name. The same event heard in two logs is one
     * event, and the merge folds it without a word; two events under one
     * authorship are two writers under one name, and the merge keeps the first
     * (L1b). Read when asked, from the logs as they stand, and remembered once
     * said, like a name collision.
     */
    misnumberings() {
      if (this.logsChanged) {
        this.logsChanged = false;
        mergeLogs(this.logs, {
          me: this.me,
          onCollision: (c) => {
            if (!this.misnumbered.has(c.origin)) this.misnumbered.set(c.origin, describeAuthorshipCollision(c));
          }
        });
      }
      return [...this.misnumbered.values()];
    }
    /**
     * Everything the room has said about itself, one sentence each: the name
     * collisions, the events numbered twice under one name, then the truncation.
     */
    notices() {
      const out = this.collisions().concat(this.misnumberings());
      const t = this.truncation();
      if (t) out.push(t);
      return out;
    }
    /**
     * Fires when another participant's events land, with what landed — and,
     * with no events, when the room says something about itself (a hello, a
     * collision, the relay's truncation, whose participant is '').
     */
    subscribe(cb) {
      this.listeners.push(cb);
      return () => {
        this.listeners = this.listeners.filter((l) => l !== cb);
      };
    }
    close() {
      if (this.off) this.off();
      this.off = null;
      if (this.transport.close) this.transport.close();
    }
    /** A clock for this store's own lines that never runs backwards, so the newest of them is always the present. */
    stamp() {
      this.lastAt = Math.max(Date.now(), this.lastAt + 1);
      return this.lastAt;
    }
    /**
     * Send lines in the order they were written. A synchronous transport sends
     * at once; an asynchronous one (a POST) is waited for before the next line
     * goes, or two POSTs in flight could reach the relay the wrong way round.
     * A line that fails is gone — the next whole log carries what it held.
     */
    post(line) {
      const go = () => {
        let r;
        try {
          r = this.transport.send(line);
        } catch {
          return void 0;
        }
        if (!r || typeof r.then !== "function") return void 0;
        return new Promise((done) => {
          const timer = setTimeout(done, SEND_WAIT_MS);
          timer.unref?.();
          r.then(
            () => {
              clearTimeout(timer);
              done();
            },
            () => {
              clearTimeout(timer);
              done();
            }
          );
        });
      };
      const settle = (t2) => t2.then(() => {
        if (this.tail === t2) this.tail = null;
      });
      if (!this.tail) {
        const r = go();
        if (!r) return Promise.resolve();
        const t2 = settle(r);
        this.tail = t2;
        return t2;
      }
      const t = settle(this.tail.then(go));
      this.tail = t;
      return t;
    }
    /**
     * Answer a hello: my own log, and every other log held — each still marked
     * with the sitting that wrote it and the newest line of it applied here — so
     * a hand that has left is caught up by the hands that stayed.
     */
    answer() {
      void this.post({ participant: this.me, events: this.logs[this.me].slice(), at: this.stamp(), full: true, sid: this.sitting });
      for (const [name, events] of Object.entries(this.logs)) {
        if (name === this.me) continue;
        const at = this.applied.get(name);
        if (at === void 0) continue;
        const line = { participant: name, events: events.slice(), at, full: true, via: this.me };
        const sid = this.sittings.get(name);
        if (sid) line.sid = sid;
        void this.post(line);
      }
    }
    collide(name, sentence) {
      if (this.collided.has(name)) return;
      this.collided.set(name, sentence);
      this.notify(name, []);
    }
    receive(raw) {
      if (!raw || typeof raw !== "object") return;
      if (raw.relay === "truncated") {
        const n2 = raw;
        this.truncated = { relay: "truncated", room: n2.room, dropped: Math.max(0, Number(n2.dropped) || 0), kept: n2.kept };
        this.notify("", []);
        return;
      }
      const line = raw;
      if (typeof line.participant !== "string") return;
      if (line.via === this.me) return;
      const sid = typeof line.sid === "string" && line.sid ? line.sid : void 0;
      const from = typeof line.via === "string" && line.via ? line.via : line.participant;
      if (line.participant === this.me) {
        if (!sid || sid === this.sitting) return;
        this.collide(this.me, `two hands are both called "${this.me}" \u2014 this one, and another writing under its name; neither is taken for the other, so reload one to give it a new name`);
        if (line.hello) this.answer();
        return;
      }
      if (from !== this.me) this.seen.set(from, Date.now());
      if (sid) {
        const known = this.sittings.get(line.participant);
        if (known === void 0) this.sittings.set(line.participant, sid);
        else if (known !== sid) {
          this.collide(line.participant, `two hands are both called "${line.participant}" \u2014 the one heard first is kept and the other's lines are refused; reload one to give it a new name`);
          if (line.hello) this.answer();
          return;
        }
      }
      if (line.hello) {
        this.answer();
        this.notify(line.participant, []);
        return;
      }
      const events = Array.isArray(line.events) ? line.events : [];
      const at = typeof line.at === "number" ? line.at : Date.now();
      if (line.full) {
        const last = this.applied.get(line.participant);
        if (last !== void 0 && at < last) return;
        const held = this.logs[line.participant];
        if (!sid) {
          const i = held && held.length ? divergence(held, events) : -1;
          if (i >= 0) {
            this.collide(line.participant, `two hands are both called "${line.participant}" \u2014 their logs disagree from event ${i + 1}; what is held is kept, so rename one`);
            return;
          }
        }
        this.logs[line.participant] = events.slice();
        this.logsChanged = true;
        this.carried.set(line.participant, new Set(events.map(authorKey2).filter((k) => k !== null)));
      } else {
        const log = this.logs[line.participant] ??= [];
        let keys = this.carried.get(line.participant);
        if (!keys) this.carried.set(line.participant, keys = /* @__PURE__ */ new Set());
        for (const ev of events) {
          const k = authorKey2(ev);
          if (k !== null) {
            if (keys.has(k)) continue;
            keys.add(k);
          }
          log.push(ev);
          this.logsChanged = true;
        }
      }
      this.applied.set(line.participant, Math.max(this.applied.get(line.participant) ?? 0, at));
      this.notify(line.participant, events);
    }
    notify(participant, events) {
      for (const l of this.listeners) l(participant, events);
    }
  };
  function authorKey2(ev) {
    return typeof ev.origin === "string" && ev.origin && typeof ev.seq === "number" && Number.isSafeInteger(ev.seq) ? `${ev.origin}#${ev.seq}` : null;
  }
  var contentKeys = /* @__PURE__ */ new WeakMap();
  function eventKey(ev) {
    const k = authorKey2(ev);
    if (k !== null) return k;
    let s = contentKeys.get(ev);
    if (s === void 0) {
      s = JSON.stringify(ev);
      contentKeys.set(ev, s);
    }
    return s;
  }
  function extendsLog(sent, now) {
    if (now.length < sent.length) return false;
    for (let i = 0; i < sent.length; i++) if (eventKey(sent[i]) !== eventKey(now[i])) return false;
    return true;
  }
  function divergence(held, incoming) {
    const a = held.map((e) => JSON.stringify(e));
    const b = incoming.map((e) => JSON.stringify(e));
    const i = unaccounted(a, b);
    if (i < 0) return -1;
    if (unaccounted(b, a) < 0) return -1;
    return i;
  }
  function unaccounted(a, b) {
    let j = 0;
    for (let i = 0; i < a.length; i++) {
      while (j < b.length && b[j] !== a[i]) j++;
      if (j >= b.length) return i;
      j++;
    }
    return -1;
  }
  var LocalHub = class {
    constructor() {
      this.members = [];
    }
    connect() {
      let cb = null;
      const hub = this;
      const transport = {
        send(line) {
          const copy = JSON.parse(JSON.stringify(line));
          for (const m of hub.members) if (m !== cb) queueMicrotask(() => m(copy));
        },
        onMessage(fn) {
          cb = fn;
          hub.members.push(fn);
          return () => {
            hub.members = hub.members.filter((m) => m !== fn);
            cb = null;
          };
        }
      };
      return transport;
    }
  };

  // src/store/static.ts
  var MANIFEST_PATH = `${META_DIR}/manifest.json`;
  var StaticStore = class {
    constructor(base, fetcher) {
      this.base = base;
      this.fetcher = fetcher;
      this.manifest = null;
      if (!this.base.endsWith("/")) this.base += "/";
    }
    capabilities() {
      return { write: false, watch: false };
    }
    url(path) {
      return this.base + path.split("/").map(encodeURIComponent).join("/");
    }
    async loadManifest() {
      if (!this.manifest) {
        this.manifest = (async () => {
          const r = await this.fetcher(this.url(MANIFEST_PATH));
          if (!r.ok) throw new Error(`${MANIFEST_PATH}: ${r.status} \u2014 a static canvas needs its manifest`);
          const m = JSON.parse(await r.text());
          return { files: Array.isArray(m.files) ? m.files.filter((f) => typeof f === "string") : [] };
        })();
      }
      return this.manifest;
    }
    async list() {
      const m = await this.loadManifest();
      const out = [];
      for (const path of m.files) {
        const e = isCanvasFile(path);
        if (e) out.push(e);
      }
      return out.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
    }
    async read(path) {
      const r = await this.fetcher(this.url(path));
      if (!r.ok) throw new Error(`${path}: ${r.status}`);
      const row = kindOf(path);
      if (row && !row.textual) return new Uint8Array(await r.arrayBuffer());
      return r.text();
    }
    async write(path, _data) {
      throw new ReadOnlyError(`write ${path}`);
    }
    async appendLog(participant, _events) {
      throw new ReadOnlyError(`append to ${participant}'s log`);
    }
    async readLogs() {
      const m = await this.loadManifest();
      const out = {};
      for (const path of m.files) {
        const who = participantOfLog(path);
        if (!who) continue;
        const r = await this.fetcher(this.url(path));
        if (!r.ok) continue;
        out[who] = decodeLog(await r.text()).events;
      }
      return out;
    }
  };

  // src/store/folder.ts
  var SKIP_DIRS = ["node_modules", "dist", "build", "out", "coverage", "target", "vendor"];
  var DEFAULT_FILE_LIMIT = 400;
  var FolderStore = class {
    constructor(root, opts = {}) {
      this.root = root;
      this.opts = opts;
      /** Set when the last `list()` hit the limit: the folder holds more than was shown. */
      this.truncated = false;
    }
    capabilities() {
      return { write: !this.opts.readOnly, watch: false };
    }
    async walk(dir, prefix, out, logs) {
      for await (const [name, handle] of dir.entries()) {
        const path = prefix ? `${prefix}/${name}` : name;
        if (out.length >= (this.opts.limit ?? DEFAULT_FILE_LIMIT)) {
          this.truncated = true;
          return;
        }
        if (handle.kind === "directory") {
          if (name.startsWith(".") && path !== ".metamedium" && !path.startsWith(".metamedium/")) continue;
          if ((this.opts.skip ?? SKIP_DIRS).includes(name)) continue;
          await this.walk(handle, path, out, logs);
          continue;
        }
        if (participantOfLog(path)) {
          logs.push(path);
          continue;
        }
        const e = isCanvasFile(path);
        if (!e) continue;
        const f = await handle.getFile();
        out.push({ ...e, size: f.size, modified: f.lastModified });
      }
    }
    async list() {
      const out = [];
      this.truncated = false;
      await this.walk(this.root, "", out, []);
      return out.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
    }
    async fileHandle(path, create) {
      const parts = path.split("/");
      let dir = this.root;
      for (const p of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(p, { create });
      return dir.getFileHandle(parts[parts.length - 1], { create });
    }
    async read(path) {
      const h2 = await this.fileHandle(path, false);
      const f = await h2.getFile();
      const row = kindOf(path);
      if (row && !row.textual) return new Uint8Array(await f.arrayBuffer());
      return f.text();
    }
    async write(path, data) {
      if (this.opts.readOnly) throw new ReadOnlyError(`write ${path}`);
      const h2 = await this.fileHandle(path, true);
      if (!h2.createWritable) throw new ReadOnlyError(`write ${path}`);
      const w2 = await h2.createWritable();
      await w2.write(toBytes(data));
      await w2.close();
    }
    async appendLog(participant, events) {
      if (this.opts.readOnly) throw new ReadOnlyError(`append to ${participant}'s log`);
      if (events.length === 0) return;
      const path = logPathFor(participant);
      const h2 = await this.fileHandle(path, true);
      if (!h2.createWritable) throw new ReadOnlyError(`append to ${participant}'s log`);
      const existing = await (await h2.getFile()).text();
      const w2 = await h2.createWritable({ keepExistingData: false });
      await w2.write(toBytes(existing + encodeLog(events)));
      await w2.close();
    }
    async readLogs() {
      const out = {};
      let dir;
      try {
        dir = this.root;
        for (const p of LOG_DIR.split("/")) dir = await dir.getDirectoryHandle(p, { create: false });
      } catch {
        return out;
      }
      for await (const [name, handle] of dir.entries()) {
        if (handle.kind !== "file") continue;
        const who = participantOfLog(`${LOG_DIR}/${name}`);
        if (!who) continue;
        out[who] = decodeLog(toText(await (await handle.getFile()).text())).events;
      }
      return out;
    }
  };

  // src/store/git.ts
  function parseGitSpec(spec) {
    const m = /^([^/@\s]+)\/([^/@\s]+)(?:@([^/\s]+))?(?:\/(.+))?$/.exec(spec.trim());
    if (!m) return null;
    return { owner: m[1], repo: m[2], branch: m[3] || void 0, dir: m[4] ? m[4].replace(/\/+$/, "") : void 0 };
  }
  function b64encode(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function b64decode(text) {
    const s = atob(text.replace(/\s+/g, ""));
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  var GITHUB_API = "https://api.github.com";
  var GitStore = class {
    constructor(spec, fetcher, token, api = GITHUB_API) {
      this.spec = spec;
      this.fetcher = fetcher;
      this.token = token;
      this.api = api;
      this.shas = /* @__PURE__ */ new Map();
      this.branch = spec.branch ?? null;
    }
    capabilities() {
      return { write: !!this.token, watch: false };
    }
    headers() {
      const h2 = { Accept: "application/vnd.github+json" };
      if (this.token) h2.Authorization = `Bearer ${this.token}`;
      return h2;
    }
    full(path) {
      return this.spec.dir ? `${this.spec.dir}/${path}` : path;
    }
    relative(full) {
      if (!this.spec.dir) return full;
      return full.startsWith(this.spec.dir + "/") ? full.slice(this.spec.dir.length + 1) : null;
    }
    async branchName() {
      if (this.branch) return this.branch;
      const r = await this.fetcher(`${this.api}/repos/${this.spec.owner}/${this.spec.repo}`, { headers: this.headers() });
      if (!r.ok) throw new Error(`${this.spec.owner}/${this.spec.repo}: ${r.status}`);
      const info = JSON.parse(await r.text());
      this.branch = info.default_branch || "main";
      return this.branch;
    }
    /** The whole tree in one request; only files of known kinds, under the canvas's directory. */
    async list() {
      const branch = await this.branchName();
      const r = await this.fetcher(`${this.api}/repos/${this.spec.owner}/${this.spec.repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`, { headers: this.headers() });
      if (!r.ok) throw new Error(`tree of ${this.spec.owner}/${this.spec.repo}@${branch}: ${r.status}`);
      const tree = JSON.parse(await r.text());
      const out = [];
      for (const t of tree.tree ?? []) {
        if (t.type !== "blob") continue;
        const rel = this.relative(t.path);
        if (rel === null) continue;
        this.shas.set(rel, t.sha);
        if (participantOfLog(rel)) continue;
        const e = isCanvasFile(rel);
        if (e) out.push({ ...e, size: t.size });
      }
      return out.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
    }
    async contents(path) {
      const branch = await this.branchName();
      const r = await this.fetcher(`${this.api}/repos/${this.spec.owner}/${this.spec.repo}/contents/${this.full(path).split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(branch)}`, { headers: this.headers() });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`${path}: ${r.status}`);
      const body = JSON.parse(await r.text());
      this.shas.set(path, body.sha);
      return { content: body.content ? b64decode(body.content) : new Uint8Array(), sha: body.sha };
    }
    async read(path) {
      const c = await this.contents(path);
      if (!c) throw new Error(`${path}: not in the repository`);
      const row = kindOf(path);
      return row && !row.textual ? c.content : toText(c.content);
    }
    /** A write is a commit of one file. The blob's sha is needed to update; a missing one means a new file. */
    async write(path, data, message) {
      if (!this.token) throw new ReadOnlyError(`write ${path}`);
      const branch = await this.branchName();
      let sha = this.shas.get(path);
      if (!sha) {
        const c = await this.contents(path);
        sha = c?.sha;
      }
      const r = await this.fetcher(`${this.api}/repos/${this.spec.owner}/${this.spec.repo}/contents/${this.full(path).split("/").map(encodeURIComponent).join("/")}`, {
        method: "PUT",
        headers: { ...this.headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ message: message ?? `metamedium: ${path}`, content: b64encode(toBytes(data)), branch, ...sha ? { sha } : {} })
      });
      if (!r.ok) throw new Error(`write ${path}: ${r.status}`);
      const body = JSON.parse(await r.text());
      if (body.content?.sha) this.shas.set(path, body.content.sha);
    }
    async appendLog(participant, events) {
      if (!this.token) throw new ReadOnlyError(`append to ${participant}'s log`);
      if (events.length === 0) return;
      const path = logPathFor(participant);
      const existing = await this.contents(path);
      const text = (existing ? toText(existing.content) : "") + encodeLog(events);
      await this.write(path, text, `metamedium: ${participant}, ${events.length} event${events.length === 1 ? "" : "s"}`);
    }
    async readLogs() {
      if (this.shas.size === 0) await this.list();
      const out = {};
      for (const path of this.shas.keys()) {
        const who = participantOfLog(path);
        if (!who) continue;
        const c = await this.contents(path);
        if (c) out[who] = decodeLog(toText(c.content)).events;
      }
      return out;
    }
  };

  // src/session/signature.ts
  var DIRECTED_LINKS = /* @__PURE__ */ new Set(["contains", "points-to"]);
  var SYMMETRIC_LINKS = /* @__PURE__ */ new Set(["crossing", "touching", "near", "connects"]);
  var MATCH_FLOOR = 0.75;
  var SAME = 0.999;
  var SHAPE_WEIGHT = 0.6;
  var LINK_WEIGHT = 0.4;
  function structuralSignature(ids, nodes, typeOf) {
    const members = new Set(ids);
    const shapes = {};
    const links = {};
    const types = /* @__PURE__ */ new Map();
    for (const id of ids) {
      const t = typeOf(id);
      types.set(id, t);
      shapes[t] = (shapes[t] ?? 0) + 1;
    }
    const seen = /* @__PURE__ */ new Set();
    for (const id of ids) {
      const node = nodes.get(id);
      if (!node) continue;
      for (const e of node.edges) {
        if (!members.has(e.to) || e.to === id) continue;
        const a = types.get(id), b = types.get(e.to);
        let key2;
        if (DIRECTED_LINKS.has(e.rel)) {
          key2 = `${a}>${e.rel}>${b}`;
        } else if (SYMMETRIC_LINKS.has(e.rel)) {
          const [x, y] = [a, b].sort();
          key2 = `${x}-${e.rel}-${y}`;
        } else continue;
        const pair = [id, e.to].sort().join("|") + "|" + e.rel;
        if (seen.has(pair)) continue;
        seen.add(pair);
        links[key2] = (links[key2] ?? 0) + 1;
      }
    }
    return { shapes, links, size: ids.length };
  }
  function bagDistance(a, b) {
    let shared2 = 0, total = 0;
    const keys = /* @__PURE__ */ new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      const x = a[k] ?? 0, y = b[k] ?? 0;
      shared2 += Math.min(x, y);
      total += Math.max(x, y);
    }
    return { shared: shared2, total };
  }
  function printBag(bag) {
    return Object.entries(bag).sort((p, q) => q[1] - p[1] || p[0].localeCompare(q[0])).map(([k, v]) => v > 1 ? `${v}\xD7${k}` : k).join(" + ");
  }
  function describeStructure(sig2) {
    const shapes = printBag(sig2.shapes) || "nothing";
    const links = Object.entries(sig2.links).sort((p, q) => q[1] - p[1] || p[0].localeCompare(q[0])).map(([k, v]) => v > 1 ? `${k} \xD7${v}` : k).join(", ");
    return links ? `${shapes}; ${links}` : `${shapes}; no links`;
  }
  function compareSignatures(a, b) {
    const s = bagDistance(a.shapes, b.shapes);
    const l = bagDistance(a.links, b.links);
    const shapeScore = s.total === 0 ? 1 : s.shared / s.total;
    const linkScore = l.total === 0 ? 1 : l.shared / l.total;
    const score2 = SHAPE_WEIGHT * shapeScore + LINK_WEIGHT * linkScore;
    const parts = [];
    parts.push(shapeScore >= SAME ? `same shapes (${printBag(a.shapes)})` : `shapes ${s.shared}/${s.total} in common`);
    if (l.total === 0) parts.push("no links either side");
    else parts.push(linkScore >= SAME ? `same links (${Object.keys(a.links).length} kind${Object.keys(a.links).length === 1 ? "" : "s"})` : `links ${l.shared}/${l.total} in common`);
    return { score: score2, reasoning: parts.join("; ") };
  }
  function matchDefinition(group2, definition, examples) {
    for (const r of examples?.rejected ?? []) {
      if (compareSignatures(group2, r).score >= SAME) {
        return { score: 0, vetoed: true, reasoning: "a group like this was corrected: not this" };
      }
    }
    let best = compareSignatures(group2, definition);
    let via = "the definition";
    for (const a of examples?.accepted ?? []) {
      const m = compareSignatures(group2, a);
      if (m.score > best.score) {
        best = m;
        via = "an accepted example";
      }
    }
    return { score: best.score, vetoed: false, reasoning: `${best.reasoning} \u2014 against ${via}` };
  }
  function addExample(examples, sig2, verdict) {
    const ex = { accepted: [...examples?.accepted ?? []], rejected: [...examples?.rejected ?? []] };
    const same = (s) => compareSignatures(s, sig2).score >= SAME;
    if (verdict === "is") {
      ex.rejected = ex.rejected.filter((s) => !same(s));
      if (!ex.accepted.some(same)) ex.accepted.push(sig2);
    } else {
      ex.accepted = ex.accepted.filter((s) => !same(s));
      if (!ex.rejected.some(same)) ex.rejected.push(sig2);
    }
    return ex;
  }

  // src/kinds/address.ts
  function addressablesOf(kind, source) {
    switch (kind) {
      case "js":
        return functionsOf(source);
      case "json":
        return keysOf2(source);
      case "md":
        return headingsOf(source);
      case "svg":
        return elementsOf(source);
      case "text":
        return runsOf(source);
      default:
        return [];
    }
  }
  function matchBrace(src, open) {
    let depth2 = 0, i = open;
    while (i < src.length) {
      const c = src[i];
      if (c === '"' || c === "'" || c === "`") {
        const q = c;
        i++;
        while (i < src.length && src[i] !== q) {
          if (src[i] === "\\") i++;
          if (q === "`" && src[i] === "$" && src[i + 1] === "{") {
            const e = matchBrace(src, i + 1);
            if (e === -1) return -1;
            i = e;
            continue;
          }
          i++;
        }
        i++;
        continue;
      }
      if (c === "/" && src[i + 1] === "/") {
        i = src.indexOf("\n", i);
        if (i === -1) return -1;
        continue;
      }
      if (c === "/" && src[i + 1] === "*") {
        i = src.indexOf("*/", i);
        if (i === -1) return -1;
        i += 2;
        continue;
      }
      if (c === "{") depth2++;
      else if (c === "}") {
        depth2--;
        if (depth2 === 0) return i + 1;
      }
      i++;
    }
    return -1;
  }
  var DECL = /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:(function\*?)\s+([A-Za-z_$][\w$]*)|(class)\s+([A-Za-z_$][\w$]*)|(const|let|var)\s+([A-Za-z_$][\w$]*)\s*=)/;
  function functionsOf(src) {
    const out = [];
    const seen = /* @__PURE__ */ new Map();
    let i = 0;
    while (i < src.length) {
      const lineEnd = src.indexOf("\n", i);
      const line = src.slice(i, lineEnd === -1 ? src.length : lineEnd);
      const m = DECL.exec(line);
      if (m) {
        const name = m[2] ?? m[4] ?? m[6];
        const isBlock = !!(m[1] || m[3]);
        let end;
        if (isBlock) {
          const open = src.indexOf("{", i);
          end = open === -1 ? -1 : matchBrace(src, open);
        } else {
          end = statementEnd(src, i);
        }
        if (end !== -1) {
          const n2 = (seen.get(name) ?? 0) + 1;
          seen.set(name, n2);
          out.push({ id: `fn:${name}${n2 > 1 ? "#" + n2 : ""}`, label: name, start: i, end, depth: 0 });
          i = end;
          continue;
        }
      }
      if (lineEnd === -1) break;
      i = lineEnd + 1;
    }
    return out;
  }
  function statementEnd(src, from) {
    let depth2 = 0, i = from;
    while (i < src.length) {
      const c = src[i];
      if (c === '"' || c === "'" || c === "`") {
        const q = c;
        i++;
        while (i < src.length && src[i] !== q) {
          if (src[i] === "\\") i++;
          i++;
        }
        i++;
        continue;
      }
      if (c === "/" && src[i + 1] === "/") {
        i = src.indexOf("\n", i);
        if (i === -1) return src.length;
        continue;
      }
      if (c === "/" && src[i + 1] === "*") {
        i = src.indexOf("*/", i);
        if (i === -1) return src.length;
        i += 2;
        continue;
      }
      if (c === "{" || c === "(" || c === "[") depth2++;
      else if (c === "}" || c === ")" || c === "]") depth2--;
      else if (c === ";" && depth2 === 0) return i + 1;
      else if (c === "\n" && depth2 === 0 && /^\s*\n/.test(src.slice(i + 1, i + 3))) return i + 1;
      i++;
    }
    return src.length;
  }
  function keysOf2(src, maxDepth = 3) {
    const out = [];
    let parsed;
    try {
      parsed = JSON.parse(src);
    } catch {
      return out;
    }
    const walk = (obj, path, from, depth2) => {
      if (!obj || typeof obj !== "object" || Array.isArray(obj) || depth2 > maxDepth) return from;
      let cursor = from;
      for (const key2 of Object.keys(obj)) {
        const needle = JSON.stringify(key2);
        const at = src.indexOf(needle + ":", cursor) !== -1 ? src.indexOf(needle + ":", cursor) : src.indexOf(needle, cursor);
        if (at === -1) continue;
        const valueStart = src.indexOf(":", at) + 1;
        const end = valueEnd(src, valueStart);
        const id = ["key", ...path, key2].join(path.length ? "." : ":").replace(/^key\./, "key:");
        out.push({ id: path.length ? `key:${[...path, key2].join(".")}` : `key:${key2}`, label: [...path, key2].join("."), start: at, end, depth: depth2 });
        void id;
        walk(obj[key2], [...path, key2], valueStart, depth2 + 1);
        cursor = end;
      }
      return cursor;
    };
    walk(parsed, [], 0, 0);
    return out;
  }
  function valueEnd(src, from) {
    let i = from;
    while (i < src.length && /\s/.test(src[i])) i++;
    const c = src[i];
    if (c === "{" || c === "[") {
      const close = c === "{" ? "}" : "]";
      let depth2 = 0;
      for (; i < src.length; i++) {
        const ch = src[i];
        if (ch === '"') {
          i++;
          while (i < src.length && src[i] !== '"') {
            if (src[i] === "\\") i++;
            i++;
          }
          continue;
        }
        if (ch === c) depth2++;
        else if (ch === close) {
          depth2--;
          if (depth2 === 0) return i + 1;
        }
      }
      return src.length;
    }
    if (c === '"') {
      i++;
      while (i < src.length && src[i] !== '"') {
        if (src[i] === "\\") i++;
        i++;
      }
      return i + 1;
    }
    while (i < src.length && !/[,}\]\n]/.test(src[i])) i++;
    return i;
  }
  function headingsOf(src) {
    const out = [];
    const re = /^(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/gm;
    const heads = [];
    let m;
    while (m = re.exec(src)) heads.push({ level: m[1].length, text: m[2], start: m.index });
    const seen = /* @__PURE__ */ new Map();
    heads.forEach((h2, i) => {
      let end = src.length;
      for (let j = i + 1; j < heads.length; j++) if (heads[j].level <= h2.level) {
        end = heads[j].start;
        break;
      }
      const slug = h2.text.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "") || "section";
      const n2 = (seen.get(slug) ?? 0) + 1;
      seen.set(slug, n2);
      out.push({ id: `h:${slug}${n2 > 1 ? "#" + n2 : ""}`, label: h2.text, start: h2.start, end, depth: h2.level - 1 });
    });
    return out;
  }
  function elementsOf(source) {
    const out = [];
    const src = source.replace(/<!--[\s\S]*?-->/g, (c) => " ".repeat(c.length));
    const root = src.search(/<svg[\s>]/i);
    if (root === -1) return out;
    const rootOpenEnd = src.indexOf(">", root);
    if (rootOpenEnd === -1) return out;
    const counts = /* @__PURE__ */ new Map();
    let i = rootOpenEnd + 1, depth2 = 0;
    const tag = /<\/?([A-Za-z][\w:-]*)([^>]*?)(\/?)>/g;
    tag.lastIndex = i;
    let m;
    let openAt = -1, openName = "", openAttrs = "";
    while (m = tag.exec(src)) {
      const closing = src[m.index + 1] === "/";
      const name = m[1], selfClosing = m[3] === "/";
      if (closing) {
        if (name.toLowerCase() === "svg" && depth2 === 0) break;
        depth2--;
        if (depth2 === 0 && openAt !== -1) {
          push(openName, openAttrs, openAt, m.index + m[0].length);
          openAt = -1;
        }
        continue;
      }
      if (depth2 === 0) {
        if (selfClosing) {
          push(name, m[2], m.index, m.index + m[0].length);
          continue;
        }
        openAt = m.index;
        openName = name;
        openAttrs = m[2];
      }
      if (!selfClosing) depth2++;
    }
    function push(name, attrs, start, end) {
      const idAttr = /\bid\s*=\s*"([^"]+)"/.exec(attrs)?.[1];
      const n2 = (counts.get(name) ?? 0) + 1;
      counts.set(name, n2);
      out.push({ id: idAttr ? `el:${idAttr}` : `el:${name}#${n2}`, label: idAttr ?? `${name} ${n2}`, start, end, depth: 0 });
    }
    return out;
  }
  function runsOf(src) {
    const out = [];
    const re = /[^\n][\s\S]*?(?=\n\s*\n|$)/g;
    let m, n2 = 0;
    while (m = re.exec(src)) {
      if (!m[0].trim()) continue;
      n2++;
      out.push({ id: `p:${n2}`, label: m[0].trim().slice(0, 40), start: m.index, end: m.index + m[0].length, depth: 0 });
      if (m.index === re.lastIndex) re.lastIndex++;
    }
    return out;
  }

  // src/frames/frame.ts
  function alongSegment(a, b, p) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1e-9) return { t: 0, off: Math.hypot(p.x - a.x, p.y - a.y) };
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
    const q = { x: a.x + dx * t, y: a.y + dy * t };
    return { t, off: Math.hypot(p.x - q.x, p.y - q.y) };
  }
  function centreOf2(node) {
    const b = boundsOf(node);
    return b ? { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 } : null;
  }
  function endsOf(node) {
    const pts = strokePointsOf(node);
    if (!pts || pts.length < 2) return null;
    return { a: pts[0], b: pts[pts.length - 1] };
  }
  function topShape(node) {
    return resemblances(node)[0]?.to.replace(/^type:/, "");
  }
  function sliderOf(ids, nodes, scale = 1) {
    const members = ids.map((id) => nodes.get(id)).filter((n2) => !!n2);
    const tracks = members.filter((n2) => topShape(n2) === "line" || topShape(n2) === "arrow");
    const knobs = members.filter((n2) => {
      const s = topShape(n2);
      if (s === "dot") return true;
      if (s !== "circle") return false;
      const fp = fingerprintOf(n2);
      return !!fp && fp.size / scale <= 40;
    });
    let best = null;
    for (const tr of tracks) {
      const ends = endsOf(tr);
      if (!ends) continue;
      for (const k of knobs) {
        const c = centreOf2(k);
        if (!c) continue;
        const { t, off } = alongSegment(ends.a, ends.b, c);
        const trackLen = Math.hypot(ends.b.x - ends.a.x, ends.b.y - ends.a.y);
        if (off > Math.max(12 * scale, trackLen * 0.12)) continue;
        if (!best || off < best.off) best = { track: tr.id, knob: k.id, t, off };
      }
    }
    if (!best) return null;
    return { ...best, reasoning: `the knob sits ${Math.round(best.t * 100)}% along the track, ${Math.round(best.off)}px off it` };
  }
  function controlOf(artifact, nodes) {
    const code = [...artifact.reps].reverse().find((r) => r.modality === "code" && r.data.kind === "control");
    if (!code) return null;
    let data = { min: 0, max: 1 };
    try {
      data = { ...data, ...JSON.parse(code.data.code) };
    } catch {
    }
    const members = artifact.edges.filter((e) => e.rel === "has-part").map((e) => e.to);
    const s = sliderOf(members, nodes);
    if (!s) return null;
    const value = data.min + (data.max - data.min) * s.t;
    return { value, t: s.t, min: data.min, max: data.max, reasoning: s.reasoning };
  }
  var PARAM = /^(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(-?\d+(?:\.\d+)?)\s*;?/;
  function paramsOf(source) {
    const out = [];
    for (const f of functionsOf(source)) {
      const text = source.slice(f.start, f.end);
      const m = PARAM.exec(text);
      if (!m) continue;
      const at = text.indexOf(m[2], m[0].indexOf("=")) + f.start;
      out.push({ name: m[1], value: Number(m[2]), start: at, end: at + m[2].length });
    }
    return out;
  }
  function withParams(source, values) {
    const params = paramsOf(source).filter((p) => p.name in values).sort((a, b) => b.start - a.start);
    let out = source;
    for (const p of params) out = out.slice(0, p.start) + String(values[p.name]) + out.slice(p.end);
    return out;
  }
  function slotsIn(html) {
    const out = [];
    const re = /data-region="([^"]+)"/g;
    let m;
    while (m = re.exec(html)) if (!out.includes(m[1])) out.push(m[1]);
    return out;
  }
  function newestCode(node) {
    const r = [...node.reps].reverse().find((x) => x.modality === "code");
    if (!r) return null;
    const d = r.data;
    return { kind: d.kind ?? d.language ?? "html", code: d.code };
  }
  function interfacesOf(node, nodes) {
    const offers = [];
    const accepts = [];
    const code = newestCode(node);
    const name = wordOf(node);
    if (code?.kind === "control") {
      const c = controlOf(node, nodes);
      if (c) offers.push({ id: "value", label: name ?? "value", type: "number", min: c.min, max: c.max, value: c.value });
    } else if (code?.kind === "js") {
      for (const p of paramsOf(code.code)) accepts.push({ id: `param:${p.name}`, label: p.name, type: "number", value: p.value });
    } else if (code?.kind === "json") {
      try {
        const obj = JSON.parse(code.code);
        for (const [k, v] of Object.entries(obj)) {
          if (typeof v === "number") accepts.push({ id: `key:${k}`, label: k, type: "number", value: v });
          else if (typeof v === "string") accepts.push({ id: `key:${k}`, label: k, type: "text", value: v });
        }
      } catch {
      }
    } else if (code?.kind === "html") {
      for (const id of slotsIn(code.code)) accepts.push({ id: `slot:${id}`, label: id, type: "text" });
    } else if (code?.kind === "text") {
      offers.push({ id: "words", label: name ?? "words", type: "text", value: code.code });
    }
    const said = transcriptOf(node);
    if (said && !offers.some((o) => o.id === "words")) offers.push({ id: "words", label: said, type: "text", value: said });
    const b = blessedBehaviourOf(node);
    if (b) {
      accepts.push({ id: "speed", label: "speed", type: "number", min: 10, max: 600, value: b.speed ?? 120 });
      b.terms.forEach((t, i) => {
        accepts.push({ id: `term:${i}`, label: `${t.verb}${t.target ? " " + t.target : ""} weight`, type: "number", min: 0, max: 2, value: t.weight });
      });
    }
    return { offers, accepts };
  }
  function similarity(a, b) {
    const x = a.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(), y = b.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!x || !y) return 0;
    if (x === y) return 1;
    if (x.includes(y) || y.includes(x)) return 0.8;
    const wa = new Set(x.split(" ")), wb = new Set(y.split(" "));
    let shared2 = 0;
    for (const w2 of wa) if (wb.has(w2)) shared2++;
    return shared2 ? 0.6 * shared2 / Math.max(wa.size, wb.size) : 0;
  }
  function connectionsFor(ids, nodes) {
    const ifaces = ids.map((id) => ({ id, node: nodes.get(id), iface: nodes.get(id) ? interfacesOf(nodes.get(id), nodes) : { offers: [], accepts: [] } }));
    const out = [];
    for (const src of ifaces) {
      for (const o of src.iface.offers) {
        for (const dst of ifaces) {
          if (dst.id === src.id) continue;
          for (const a of dst.iface.accepts) {
            if (a.type !== o.type) continue;
            const named2 = similarity(o.label, a.label);
            const score2 = 0.5 + 0.5 * named2;
            const why = named2 > 0 ? `${o.label} \u2192 ${a.label}: the names match` : `${o.label} \u2192 ${a.label}: a ${o.type} for a ${o.type}`;
            out.push({ from: { id: src.id, port: o.id }, to: { id: dst.id, port: a.id }, reasoning: why, score: score2 });
          }
        }
      }
    }
    return out.sort((p, q) => q.score - p.score);
  }
  function portValue(node, port, nodes) {
    const iface = interfacesOf(node, nodes);
    return iface.offers.find((o) => o.id === port)?.value;
  }
  function resolveFrame(frame, nodes) {
    const code = {};
    const behaviour = {};
    const carried = [];
    const params = {};
    const keys = {};
    const slots = {};
    for (const c of frame.connections) {
      const src = nodes.get(c.from.id), dst = nodes.get(c.to.id);
      if (!src || !dst) continue;
      const raw = portValue(src, c.from.port, nodes);
      const value = typeof raw === "number" ? +raw.toFixed(4) : raw;
      carried.push({ connection: c, value });
      if (value === void 0) continue;
      const [kind, name] = c.to.port.split(":");
      if (kind === "param" && typeof value === "number") (params[dst.id] ??= {})[name] = value;
      else if (kind === "key") (keys[dst.id] ??= {})[name] = value;
      else if (kind === "slot") (slots[dst.id] ??= {})[name] = String(value);
      else if (kind === "speed" && typeof value === "number") (behaviour[dst.id] ??= { weights: {} }).speed = value;
      else if (kind === "term" && typeof value === "number") (behaviour[dst.id] ??= { weights: {} }).weights[Number(name)] = value;
    }
    for (const id of frame.members) {
      const node = nodes.get(id);
      const nc = node && newestCode(node);
      if (!node || !nc) continue;
      if (nc.kind === "js" && params[id]) code[id] = withParams(nc.code, params[id]);
      if (nc.kind === "json" && keys[id]) {
        try {
          code[id] = JSON.stringify({ ...JSON.parse(nc.code), ...keys[id] }, null, 2);
        } catch {
        }
      }
      if (nc.kind === "html" && slots[id]) {
        let html = nc.code;
        for (const [region, text] of Object.entries(slots[id])) {
          html = html.replace(new RegExp(`(<([a-z0-9]+)[^>]*data-region="${region}"[^>]*>)([\\s\\S]*?)(</\\2>)`, "i"), (_m, open, _tag, _inner, close) => `${open}${escapeHtml(text)}${close}`);
        }
        code[id] = html;
      }
    }
    return { code, behaviour, carried };
  }
  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
  }
  function describeFrame(frame, nodes) {
    const name = (id) => wordOf(nodes.get(id)) ?? id;
    const wires = frame.connections.map((c) => `${name(c.from.id)}.${c.from.port} \u2192 ${name(c.to.id)}.${c.to.port}`);
    return `${frame.members.length} member${frame.members.length === 1 ? "" : "s"}` + (wires.length ? `; ${wires.join(", ")}` : "; no connections");
  }
  var EXT = { html: "html", js: "js", json: "json", svg: "svg", md: "md", text: "txt", control: "json" };
  function exportFrame(frameName, frame, nodes) {
    const resolved = resolveFrame(frame, nodes);
    const files = {};
    const safe = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "member";
    const used = /* @__PURE__ */ new Map();
    const members = [];
    for (const id of frame.members) {
      const node = nodes.get(id);
      const nc = node && newestCode(node);
      if (!node) continue;
      const kind = nc?.kind ?? "control";
      const base = safe(wordOf(node) ?? id);
      const n2 = (used.get(base) ?? 0) + 1;
      used.set(base, n2);
      const file = `${base}${n2 > 1 ? "-" + n2 : ""}.${EXT[kind] ?? "txt"}`;
      let content = resolved.code[id] ?? nc?.code ?? "";
      if (kind === "control") {
        const c = controlOf(node, nodes);
        content = JSON.stringify({ value: c?.value ?? null, min: c?.min ?? 0, max: c?.max ?? 1 }, null, 2);
      }
      files[file] = content;
      members.push({ id, file, kind });
      if (kind === "html" && !files["index.html"]) files["index.html"] = content;
    }
    files["frame.json"] = JSON.stringify({ name: frameName, members, connections: frame.connections }, null, 2);
    return files;
  }

  // src/behave/verbs.ts
  var VERBS = ["wander", "seek", "flee", "home", "school", "hold", "avoid", "consume", "spawn", "drift", "expire"];
  var TARGETED = /* @__PURE__ */ new Set(["seek", "flee", "home", "school", "consume", "spawn", "expire"]);
  var DEFAULT_SPEED = 120;
  var DEFAULT_MAX_FORCE = 240;
  var sizeOf2 = (b) => Math.max(1, Math.sqrt(Math.max(1, b.w) * Math.max(1, b.h)));
  var dist2 = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  var num = (t, k, d) => typeof t.params?.[k] === "number" ? t.params[k] : d;
  function nearest(world, name, only) {
    if (!name) return null;
    const mine = sizeOf2(world.me);
    let best = null;
    for (const o of world.named(name)) {
      if (o.id === world.me.id) continue;
      const s = sizeOf2(o);
      if (only === "bigger" && s < mine * 1.25) continue;
      if (only === "smaller" && s > mine / 1.25) continue;
      const d = dist2(world.me, o);
      if (!best || d < best.d) best = { body: o, d };
    }
    return best;
  }
  function toward(world, to, speed, weight) {
    const d = dist2(world.me, to);
    if (d < 1e-6) return { fx: 0, fy: 0 };
    const dx = (to.x - world.me.x) / d * speed, dy = (to.y - world.me.y) / d * speed;
    return { fx: (dx - world.me.vx) * weight, fy: (dy - world.me.vy) * weight };
  }
  var none = (reasoning) => ({ fx: 0, fy: 0, reasoning });
  function force(term, world, speed = DEFAULT_SPEED) {
    const me = world.me, w2 = term.weight;
    switch (term.verb) {
      case "wander": {
        const turn2 = num(term, "turn", 0.9);
        const a = me.heading + (world.rng() - 0.5) * turn2;
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
        const range = num(term, "range", sizeOf2(me) * 6);
        if (!n2 || n2.d > range) return none(`nothing${only ? " " + only : ""} named ${term.target} within ${Math.round(range)}px`);
        const falloff = 1 - n2.d / range;
        const away = { x: me.x + (me.x - n2.body.x), y: me.y + (me.y - n2.body.y) };
        const f = toward(world, away, speed, w2 * (0.4 + 0.6 * falloff));
        return { ...f, reasoning: `fleeing ${n2.body.id} (${term.target}${only ? ", " + only : ""}) ${Math.round(n2.d)}px away` };
      }
      case "home": {
        const n2 = nearest(world, term.target);
        if (!n2) return none(`nothing named ${term.target} to keep to`);
        const range = num(term, "range", sizeOf2(n2.body) * 1.5);
        if (n2.d > range) {
          const f = toward(world, n2.body, speed, w2);
          return { ...f, reasoning: `returning to ${n2.body.id} (${term.target}), ${Math.round(n2.d)}px out` };
        }
        const a = me.heading + (world.rng() - 0.5) * 1.2;
        return { fx: Math.cos(a) * speed * 0.25 * w2, fy: Math.sin(a) * speed * 0.25 * w2, reasoning: `at home in ${n2.body.id} (${term.target})` };
      }
      case "school": {
        const range = num(term, "range", sizeOf2(me) * 5);
        const peers = (term.target ? world.named(term.target) : world.others).filter((o) => o.id !== me.id && dist2(me, o) <= range);
        if (!peers.length) return none(`no ${term.target ?? "peers"} within ${Math.round(range)}px to school with`);
        let cx2 = 0, cy2 = 0, ax = 0, ay = 0, sx = 0, sy = 0;
        const tooClose = sizeOf2(me) * 1.4;
        for (const o of peers) {
          cx2 += o.x;
          cy2 += o.y;
          ax += o.vx;
          ay += o.vy;
          const d = dist2(me, o);
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
        const radius = num(term, "radius", sizeOf2(me) * 3);
        const d = dist2(me, o);
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
        if (n2 && n2.d <= (sizeOf2(me) + sizeOf2(n2.body)) / 2) return [{ kind: "consume", target: term.target, body: n2.body.id }];
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
        if (n2 && n2.d <= (sizeOf2(me) + sizeOf2(n2.body)) / 2) return [{ kind: "expire", body: n2.body.id }];
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
    const size = sizeOf2(body);
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
  function fit2(demo, basis, worldAt, speed = 120, body = {}) {
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
      const me = { id: body.id ?? "demo", name: body.name ?? "demo", x: demo[i + 1].x, y: demo[i + 1].y, vx: v[i].x, vy: v[i].y, w: body.w ?? 20, h: body.h ?? 12, heading: Math.atan2(v[i].y, v[i].x), age: demo[i + 1].t - demo[0].t, origin: { x: demo[0].x, y: demo[0].y } };
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
    const norm2 = Math.sqrt(target.reduce((s, a) => s + a[0] * a[0] + a[1] * a[1], 0)) || 1;
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
      return Math.sqrt(s) / norm2;
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
      const shrink = lambda * norm2 * norm2;
      for (let sweep2 = 0; sweep2 < 400; sweep2++) {
        let moved2 = 0;
        for (let j = 0; j < k; j++) {
          if (mask2 && !mask2[j]) {
            w2[j] = 0;
            continue;
          }
          if (G[j][j] <= 1e-12) continue;
          let r = bvec[j];
          for (let i = 0; i < k; i++) if (i !== j) r -= G[j][i] * w2[i];
          const next = Math.max(0, (r - shrink) / G[j][j]);
          moved2 = Math.max(moved2, Math.abs(next - w2[j]));
          w2[j] = next;
        }
        if (moved2 < 1e-9) break;
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

  // src/behave/words.ts
  var PHRASES = {
    seek: ["swim toward", "swims toward", "swim towards", "swims towards", "go to", "goes to", "head for", "heads for", "move toward", "moves toward", "seek", "seeks", "chase", "chases", "follow", "follows", "hunt", "hunts", "approach", "approaches", "toward", "towards"],
    flee: ["run from", "runs from", "swim away from", "swims away from", "run away from", "runs away from", "flee from", "flees from", "flee", "flees", "escape", "escapes", "fear", "fears", "afraid of", "scared of", "away from"],
    home: ["hide in", "hides in", "hide among", "hides among", "shelter in", "shelters in", "live in", "lives in", "rest in", "rests in", "return to", "returns to", "go home to", "goes home to", "home to", "home"],
    school: ["school with", "schools with", "flock with", "flocks with", "swim with", "swims with", "stay with", "stays with", "group with", "groups with", "school", "schools", "flock", "flocks"],
    hold: ["stay put", "stays put", "stay still", "stays still", "keep to", "keeps to", "hold position", "holds position", "stay where", "stays where", "hold", "holds"],
    avoid: ["steer clear of", "steers clear of", "keep away from", "keeps away from", "avoid", "avoids", "dodge", "dodges"],
    consume: ["feed on", "feeds on", "eat", "eats", "consume", "consumes", "devour", "devours"],
    spawn: ["spawn", "spawns", "give off", "gives off", "release", "releases", "emit", "emits"],
    drift: ["drift", "drifts", "float", "floats", "rise", "rises", "sink", "sinks", "fall", "falls"],
    expire: ["die", "dies", "expire", "expires", "vanish", "vanishes", "disappear", "disappears", "fade", "fades"],
    wander: ["wander", "wanders", "roam", "roams", "meander", "meanders", "explore", "explores", "swim around", "swims around", "swim about", "swims about", "mill about", "mills about", "move around", "moves around"]
  };
  var ARTICLES = /* @__PURE__ */ new Set(["the", "a", "an", "any", "anything", "everything", "all", "other", "others", "every", "some", "its", "their", "nearby", "near", "nearest", "closest"]);
  var STOP = /* @__PURE__ */ new Set(["and", "then", "while", "but", "when", "until", "so", "or"]);
  function modifiers(words) {
    let only;
    let weight = 1;
    let direction;
    for (const w2 of words) {
      if (w2 === "bigger" || w2 === "larger" || w2 === "big" || w2 === "large") only = "bigger";
      if (w2 === "smaller" || w2 === "little" || w2 === "small" || w2 === "tiny") only = "smaller";
      if (w2 === "slowly" || w2 === "gently" || w2 === "a" || w2 === "little") weight = Math.min(weight, 0.5);
      if (w2 === "quickly" || w2 === "fast" || w2 === "hard" || w2 === "always") weight = Math.max(weight, 1.5);
      if (w2 === "up" || w2 === "upward" || w2 === "upwards") direction = "up";
      if (w2 === "down" || w2 === "downward" || w2 === "downwards") direction = "down";
    }
    return { only, weight, direction };
  }
  function clausesOf(text) {
    return text.toLowerCase().replace(/[“”"']/g, "").split(/[,;.\n]+|\b(?:and|then|while|but)\b/).map((c) => c.trim()).filter(Boolean);
  }
  function parseClause(clause) {
    const c = " " + clause.replace(/\s+/g, " ").trim() + " ";
    let best = null;
    for (const verb of VERBS) {
      for (const phrase of PHRASES[verb]) {
        const at = c.indexOf(" " + phrase + " ");
        if (at < 0) continue;
        if (!best || phrase.length > best.phrase.length || phrase.length === best.phrase.length && at < best.at) best = { verb, phrase, at };
      }
    }
    if (!best) return null;
    const before = c.slice(0, best.at).trim().split(" ").filter(Boolean);
    const afterWords = c.slice(best.at + best.phrase.length + 2).trim().split(" ").filter(Boolean);
    const mods = modifiers([...before, ...afterWords]);
    const targetWords = [];
    for (const w2 of afterWords) {
      if (STOP.has(w2)) break;
      if (ARTICLES.has(w2) || w2 === "bigger" || w2 === "larger" || w2 === "smaller" || w2 === "big" || w2 === "large" || w2 === "small" || w2 === "little" || w2 === "tiny" || w2 === "slowly" || w2 === "quickly" || w2 === "fast" || w2 === "gently" || w2 === "hard" || w2 === "always" || w2 === "than" || w2 === "it" || w2 === "itself" || w2 === "them") continue;
      targetWords.push(w2);
    }
    const term = { verb: best.verb, weight: mods.weight, reasoning: `from \u201C${clause.trim()}\u201D` };
    if (TARGETED.has(best.verb)) {
      if (targetWords.length) term.target = singular(targetWords.join(" "));
      else if (mods.only) term.target = "*";
    }
    const params = {};
    if (mods.only && (best.verb === "flee" || best.verb === "seek" || best.verb === "avoid" || best.verb === "consume")) params.only = mods.only;
    if (mods.direction && best.verb === "drift") params.direction = mods.direction;
    if (Object.keys(params).length) term.params = params;
    return term;
  }
  function singular(word) {
    if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
    if (word.endsWith("shes") || word.endsWith("ches") || word.endsWith("xes") || word.endsWith("sses")) return word.slice(0, -2);
    if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);
    return word;
  }
  function parseBehaviour(text) {
    const clauses = clausesOf(text);
    const terms = [];
    const unparsed = [];
    for (const c of clauses) {
      const t = parseClause(c);
      if (t) terms.push(t);
      else unparsed.push(c);
    }
    const reasoning = terms.length ? `${terms.length} of ${clauses.length} clause${clauses.length === 1 ? "" : "s"} read as verbs` + (unparsed.length ? `; could not read: ${unparsed.map((u) => `\u201C${u}\u201D`).join(", ")}` : "") : clauses.length ? "no clause names a verb the tank knows" : "nothing written";
    return {
      behaviour: terms.length ? { terms, source: "words" } : null,
      terms,
      unparsed,
      reasoning
    };
  }
  function describeBehaviour(b) {
    return b.terms.map((t) => {
      const only = typeof t.params?.only === "string" ? ` ${t.params.only}` : "";
      const target = t.target ? ` ${t.target === "*" ? "anything" : t.target}${only}` : "";
      const w2 = Math.abs(t.weight - 1) > 1e-6 ? ` (${t.weight.toFixed(2)})` : "";
      return `${t.verb}${target}${w2}`;
    }).join(" \xB7 ") || "nothing";
  }
  function behaviourSource(b) {
    const lines = b.terms.map((t) => {
      const args = [];
      if (t.target) args.push(JSON.stringify(t.target));
      args.push(String(+t.weight.toFixed(2)));
      if (t.params && Object.keys(t.params).length) args.push(JSON.stringify(t.params));
      return `  ${t.verb}(${args.join(", ")}),${t.reasoning ? "  // " + t.reasoning : ""}`;
    });
    return `// steer(world): the sum of these verbs, each a force
return sum(
${lines.join("\n")}
);`;
  }

  // src/image/trace.ts
  var DEFAULT_SIMPLIFY_PX = 1.5;
  var DEFAULT_MIN_LENGTH_PX = 8;
  function luminance(bitmap) {
    const n2 = bitmap.width * bitmap.height;
    const out = new Float32Array(n2);
    const d = bitmap.data;
    for (let i = 0; i < n2; i++) {
      const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
      out[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }
    return out;
  }
  function otsu(lum) {
    const hist = new Float64Array(256);
    for (let i = 0; i < lum.length; i++) hist[Math.max(0, Math.min(255, Math.round(lum[i])))]++;
    const total = lum.length;
    let sum = 0;
    for (let t = 0; t < 256; t++) sum += t * hist[t];
    let sumB = 0, wB = 0, best = 0, threshold = 127;
    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (wB === 0) continue;
      const wF = total - wB;
      if (wF === 0) break;
      sumB += t * hist[t];
      const mB = sumB / wB, mF = (sum - sumB) / wF;
      const between2 = wB * wF * (mB - mF) * (mB - mF);
      if (between2 > best) {
        best = between2;
        threshold = t;
      }
    }
    return threshold;
  }
  function binarize(bitmap, opts = {}) {
    const lum = luminance(bitmap);
    const threshold = opts.threshold ?? otsu(lum);
    const n2 = lum.length;
    const mask = new Uint8Array(n2);
    let dark = 0;
    for (let i = 0; i < n2; i++) if (lum[i] <= threshold) dark++;
    const inverted = opts.invert ?? dark > n2 / 2;
    let ink = 0;
    for (let i = 0; i < n2; i++) {
      const isInk = inverted ? lum[i] > threshold : lum[i] <= threshold;
      if (isInk) {
        mask[i] = 1;
        ink++;
      }
    }
    return { mask, threshold, inverted, inkFraction: n2 ? ink / n2 : 0 };
  }
  function thin(mask, width, height) {
    const img = new Uint8Array(mask);
    const at = (x, y) => x < 0 || y < 0 || x >= width || y >= height ? 0 : img[y * width + x];
    const toDelete = [];
    let changed = true;
    while (changed) {
      changed = false;
      for (let pass = 0; pass < 2; pass++) {
        toDelete.length = 0;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (!img[y * width + x]) continue;
            const p22 = at(x, y - 1), p3 = at(x + 1, y - 1), p4 = at(x + 1, y), p5 = at(x + 1, y + 1);
            const p6 = at(x, y + 1), p7 = at(x - 1, y + 1), p8 = at(x - 1, y), p9 = at(x - 1, y - 1);
            const b = p22 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
            if (b < 2 || b > 6) continue;
            const seq = [p22, p3, p4, p5, p6, p7, p8, p9, p22];
            let a = 0;
            for (let i = 0; i < 8; i++) if (seq[i] === 0 && seq[i + 1] === 1) a++;
            if (a !== 1) continue;
            const c1 = pass === 0 ? p22 * p4 * p6 : p22 * p4 * p8;
            const c2 = pass === 0 ? p4 * p6 * p8 : p22 * p6 * p8;
            if (c1 === 0 && c2 === 0) toDelete.push(y * width + x);
          }
        }
        if (toDelete.length) {
          changed = true;
          for (const i of toDelete) img[i] = 0;
        }
      }
    }
    return img;
  }
  var N8 = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  function tracePaths(skeleton, width, height) {
    const on = (x, y) => x >= 0 && y >= 0 && x < width && y < height && skeleton[y * width + x] === 1;
    const visited = new Uint8Array(skeleton.length);
    const free = (x, y) => on(x, y) && !visited[y * width + x];
    const freeNeighbours = (x, y) => {
      const out = [];
      for (const [dx, dy] of N8) if (free(x + dx, y + dy)) out.push({ x: x + dx, y: y + dy });
      return out;
    };
    const degree = (x, y) => {
      let d = 0;
      for (const [dx, dy] of N8) if (on(x + dx, y + dy)) d++;
      return d;
    };
    const paths = [];
    function walk(sx, sy) {
      const points = [{ x: sx, y: sy }];
      visited[sy * width + sx] = 1;
      let x = sx, y = sy, lx = 0, ly = 0;
      for (; ; ) {
        const next = freeNeighbours(x, y);
        if (next.length === 0) break;
        let pick3 = next[0];
        if (next.length > 1 && (lx || ly)) {
          let best = -Infinity;
          for (const n2 of next) {
            const dx = n2.x - x, dy = n2.y - y;
            const cos = (dx * lx + dy * ly) / Math.hypot(dx, dy);
            if (cos > best) {
              best = cos;
              pick3 = n2;
            }
          }
        } else if (next.length > 1) {
          pick3 = next.find((n2) => n2.x === x || n2.y === y) ?? next[0];
        }
        lx = pick3.x - x;
        ly = pick3.y - y;
        x = pick3.x;
        y = pick3.y;
        visited[y * width + x] = 1;
        points.push({ x, y });
      }
      const first = points[0], last = points[points.length - 1];
      const closed = points.length > 8 && Math.abs(first.x - last.x) <= 1 && Math.abs(first.y - last.y) <= 1;
      return { points, closed };
    }
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (free(x, y) && degree(x, y) === 1) paths.push(walk(x, y));
    }
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (free(x, y) && degree(x, y) > 2) {
        while (freeNeighbours(x, y).length > 0) {
          const p = walk(x, y);
          paths.push(p);
          visited[y * width + x] = 0;
        }
        visited[y * width + x] = 1;
      }
    }
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (free(x, y)) paths.push(walk(x, y));
    }
    return paths;
  }
  function densify(points, step2 = 2) {
    if (points.length < 2) return points;
    const out = [points[0]];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const n2 = Math.max(1, Math.round(len / step2));
      for (let k = 1; k <= n2; k++) out.push({ x: a.x + (b.x - a.x) * k / n2, y: a.y + (b.y - a.y) * k / n2 });
    }
    return out;
  }
  function pathLength(points) {
    let len = 0;
    for (let i = 1; i < points.length; i++) len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    return len;
  }
  function trace(bitmap, opts = {}) {
    const { mask, threshold, inverted, inkFraction } = binarize(bitmap, opts);
    const skeleton = thin(mask, bitmap.width, bitmap.height);
    const raw = tracePaths(skeleton, bitmap.width, bitmap.height);
    const tol = opts.simplifyPx ?? DEFAULT_SIMPLIFY_PX;
    const minLen = opts.minLengthPx ?? DEFAULT_MIN_LENGTH_PX;
    const strokes = [];
    let dropped = 0;
    for (const p of raw) {
      const length = pathLength(p.points);
      if (length < minLen || p.points.length < 2) {
        dropped++;
        continue;
      }
      let points = simplifyStroke(p.points.map((q) => ({ x: q.x + 0.5, y: q.y + 0.5 })), tol);
      if (p.closed) points = points.concat([{ ...points[0] }]);
      strokes.push({ points: densify(points), closed: p.closed, length });
    }
    strokes.sort((a, b) => b.length - a.length);
    const closed = strokes.filter((s) => s.closed).length;
    return {
      strokes,
      threshold,
      inverted,
      inkFraction,
      reasoning: `ink is ${inverted ? "lighter" : "darker"} than ${threshold} (${(inkFraction * 100).toFixed(1)}% of the picture); thinned and walked into ${strokes.length} stroke${strokes.length === 1 ? "" : "s"} (${closed} closed), ${dropped} fleck${dropped === 1 ? "" : "s"} dropped`
    };
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
  var MAX_WIDEN = 2.5;
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
      tolerance[f] = Math.min(Math.max(sd * SPREAD_MULTIPLIER, TOLERANCE_FLOOR[f]), TOLERANCE_FLOOR[f] * MAX_WIDEN);
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
    const check2 = (w2, h2, dip, rise, slant = 0) => {
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
      check2(70, 35, 0.36, 0.45),
      check2(64, 40, 0.33, 0.52),
      check2(78, 32, 0.38, 0.4),
      check2(60, 36, 0.34, 0.58, 0.06),
      check2(74, 38, 0.35, 0.47, -0.05),
      // A hand often draws the tail long — a short dip, then a long flick. The
      // first five put the arms near 1:1.6; these reach 1:2.5, which a real
      // check at 1:3 was refused for ("its two halves are the wrong lengths").
      check2(88, 30, 0.24, 0.55),
      check2(96, 28, 0.21, 0.5, 0.03)
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
        detail: match.failedOn ? `that is not ${named(mark.name)} \u2014 ${readable2(match.failedOn)}` : `that is not ${named(mark.name)}`,
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
  function readable2(feature) {
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

  // src/session/stale.ts
  function describeStale(reason, what, name, maker) {
    const who = name ? `${name}'s ` : "";
    const answer = what === "code" ? "code" : what === "answer" ? "answer" : what === "label" ? "label" : "reading";
    switch (reason) {
      case "not-your-ink":
        return `that mark was made by ${maker ?? "another hand"} \u2014 a label is a word on your own ink, and naming somebody else's mark is theirs to do`;
      case "erased":
        return `the target was erased before ${who}${answer} arrived`;
      case "missing":
        return `the target was gone before ${who}${answer} arrived`;
      case "replaced":
        return `the board was replaced before ${who}${answer} arrived`;
      case "superseded":
        return `the target moved on before ${who}${answer} arrived \u2014 it was written against an older version`;
      case "unknown-participant":
        return `${who || "that participant "}is not in this session`;
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
    tier: 1,
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
  var tidy2 = (axis) => ({
    id: `tidy-${axis}`,
    label: axis === "row" ? "Line up across" : "Line up down",
    tier: 1,
    effect: { kind: "tidy", axis },
    hint: "align and space them evenly"
  });
  var EQUALIZE = {
    id: "equalize",
    label: "Match sizes",
    tier: 1,
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
      // The first drawn control (ARCHITECTURE-v8 §15): a line with a dot on it
      // is a slider, and the dot's place along the line is its value.
      name: "slider",
      describes: "a knob on a track",
      conversions: [
        { id: "control", label: "Make it a slider", tier: 1, effect: { kind: "control" }, hint: "its value is where the knob sits; drag the knob to set it" },
        NAME
      ],
      match(scope) {
        const tracks = scope.ids.filter((id) => scope.shapes[id] === "line" || scope.shapes[id] === "arrow");
        const knobs = scope.ids.filter((id) => scope.shapes[id] === "dot" || scope.shapes[id] === "circle");
        if (scope.ids.length !== 2 || tracks.length !== 1 || knobs.length !== 1) return null;
        const track = scope.marks.find((m) => m.id === tracks[0]), knob = scope.marks.find((m) => m.id === knobs[0]);
        if (!track || !knob) return null;
        const tb = track.bounds, kb = knob.bounds;
        const knobSize = Math.max(kb.maxX - kb.minX, kb.maxY - kb.minY);
        const trackLen = Math.max(tb.maxX - tb.minX, tb.maxY - tb.minY);
        if (knobSize > trackLen * 0.5) return null;
        const engaged = scope.relations.some((r) => (r.kind === "touching" || r.kind === "crossing" || r.kind === "near" || r.kind === "contains" || r.kind === "inside") && (r.from === track.id && r.to === knob.id || r.from === knob.id && r.to === track.id));
        if (!engaged) return null;
        const confidence = Math.min(0.9, 0.55 + 0.35 * (1 - knobSize / trackLen));
        return {
          confidence,
          reasoning: `a ${scope.shapes[knob.id]} ${Math.round(knobSize)}px across on a ${Math.round(trackLen)}px ${scope.shapes[track.id]}`,
          roles: { track: [track.id], knob: [knob.id] }
        };
      }
    },
    {
      name: "row",
      describes: "peers side by side",
      conversions: [
        tidy2("row"),
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
        tidy2("column"),
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
      // Words and cursive marks on one band, near each other, gather by NEARNESS
      // into a line of writing (SURFACE-v10-PLAN D3) — the unit a reader wants,
      // since a phrase is read better than its words. Letters gather into a
      // word by succession (session/words.ts); this is the rung above it, and
      // needs no clock: the writing is there, however long ago it was written.
      name: "writing",
      describes: "a line of writing",
      conversions: [NAME],
      match(scope) {
        const words = scope.ids.filter((id) => scope.shapes[id] === "text").map((id) => scope.marks.find((m) => m.id === id)).filter((m) => !!m);
        if (words.length < 2) return null;
        const sorted = words.slice().sort((a, b) => a.bounds.minX - b.bounds.minX);
        const heights = sorted.map((m) => Math.max(1, m.bounds.maxY - m.bounds.minY));
        const meanH = heights.reduce((a, b) => a + b, 0) / heights.length;
        const bandOverlap2 = (a, b) => {
          const overlap = Math.min(a.bounds.maxY, b.bounds.maxY) - Math.max(a.bounds.minY, b.bounds.minY);
          const shorter = Math.max(1, Math.min(a.bounds.maxY - a.bounds.minY, b.bounds.maxY - b.bounds.minY));
          return overlap / shorter;
        };
        const bands2 = [];
        for (const m of sorted) {
          const bd = bands2.find((x) => x.some((o) => bandOverlap2(o, m) >= 0.35));
          if (bd) bd.push(m);
          else bands2.push([m]);
        }
        const best = bands2.slice().sort((a, b) => b.length - a.length)[0];
        const line = [best[0]];
        let band = 1, spacing = 1;
        for (let i = 1; i < best.length; i++) {
          const a = line[line.length - 1], b = best[i];
          const gap = b.bounds.minX - a.bounds.maxX;
          if (gap > meanH * 2.5) break;
          band = Math.min(band, Math.min(1, bandOverlap2(a, b)));
          spacing = Math.min(spacing, 1 - Math.max(0, gap) / (meanH * 2.5));
          line.push(b);
        }
        if (line.length < 2) return null;
        const confidence = Math.min(0.9, 0.5 + 0.2 * band + 0.1 * spacing + 0.05 * (line.length - 2));
        return {
          confidence,
          reasoning: `${line.length} marks of writing on one line, a word's gap apart${line.length < words.length ? ` (${words.length - line.length} more not on it)` : ""}`,
          roles: { words: line.map((m) => m.id) }
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
    const walk = (n2, depth2) => {
      const pad = "  ".repeat(depth2 + 1);
      const size = `${Math.round(n2.rect.w)}\xD7${Math.round(n2.rect.h)}`;
      const label = n2.region ? `${n2.id} (${n2.region.shape})` : `${n2.id} [${n2.flow}]`;
      const share = depth2 > 0 ? "" : "";
      lines.push(`${pad}${label} ${size} \u2014 ${n2.reasoning}${share}`);
      if (n2.children.length && n2.flow !== "leaf") {
        const pct2 = n2.fractions.map((f) => `${Math.round(f * 100)}%`).join(" / ");
        if (pct2) lines.push(`${pad}  ${n2.flow} split ${pct2}, gap ${n2.gap}px`);
      }
      n2.children.forEach((c) => walk(c, depth2 + 1));
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
  var esc2 = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  var styleAttr = (s) => esc2(s).replace(/\n/g, " ");
  function renderNode(node, content, depth2) {
    const pad = "  ".repeat(depth2);
    const own = node.region ? content[node.id] : void 0;
    const tag = own?.tag && SAFE_TAGS.has(own.tag) ? own.tag : "div";
    const box = [];
    if (depth2 === 1) box.push("flex:1 1 0", "min-width:0", "min-height:0");
    else if (depth2 > 1) {
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
    const inner = node.children.length && node.flow !== "leaf" ? "\n" + node.children.map((c) => renderNode(c, content, depth2 + 2)).join("\n") + "\n" + pad + "  " : own?.html ?? "";
    if (!node.region) {
      const merged = box.concat(fill.filter((f) => !/^(box-sizing|width|height):/.test(f)));
      return `${pad}<div${merged.length ? ` style="${styleAttr(merged.join(";"))}"` : ""}>${node.children.length ? "\n" + node.children.map((c) => renderNode(c, content, depth2 + 1)).join("\n") + `
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
  var esc3 = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  var styleAttr2 = (s) => esc3(s).replace(/\n/g, " ");
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
    let clusterCandidates = [];
    let participants = [];
    let explanations = [];
    let live = [];
    let clocks = {};
    let gestures = /* @__PURE__ */ new Map();
    let markHands = /* @__PURE__ */ new Map();
    let staleResult = null;
    let generation = 0;
    let lastAt = 0;
    let counter2 = 0;
    let myLog = config.logName;
    let logNameSaid = config.logName !== void 0;
    const highWater = /* @__PURE__ */ new Map();
    const sawNumber = (name, seq) => {
      if (Number.isSafeInteger(seq) && seq > (highWater.get(name) ?? 0)) highWater.set(name, seq);
    };
    const listeners = /* @__PURE__ */ new Set();
    const CHECKPOINT_EVERY = 200;
    let checkpoints = [];
    function snapshot() {
      return structuredClone({
        nodes,
        contentIds,
        artifacts,
        clusterCandidates,
        participants,
        explanations,
        live,
        gestures,
        markHands,
        lastAt,
        counter: counter2,
        clocks
      });
    }
    function restore(snap) {
      const s = structuredClone(snap);
      nodes = s.nodes;
      contentIds = s.contentIds;
      artifacts = s.artifacts;
      clusterCandidates = s.clusterCandidates;
      participants = s.participants;
      explanations = s.explanations;
      live = s.live;
      gestures = s.gestures;
      markHands = s.markHands;
      lastAt = s.lastAt;
      counter2 = s.counter;
      clocks = s.clocks ?? {};
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
      clusterCandidates = [];
      participants = [LOCAL_PARTICIPANT, TIER0_PARTICIPANT];
      explanations = [];
      live = [];
      clocks = {};
      gestures = /* @__PURE__ */ new Map();
      markHands = /* @__PURE__ */ new Map();
      lastAt = 0;
      counter2 = 0;
      for (const n2 of createBootstrapNodes(0)) nodes.set(n2.id, n2);
    }
    reset();
    let mint = null;
    const minted = /* @__PURE__ */ new Map();
    function mintKeyOf(ev) {
      if (!ev.origin || typeof ev.seq !== "number") return null;
      if (!Number.isSafeInteger(ev.seq) || ev.seq < 0) return null;
      return `${ev.origin}:${ev.seq}`;
    }
    const nextId = (prefix) => {
      if (mint === null) return `${prefix}:${++counter2}`;
      const n2 = (minted.get(prefix) ?? 0) + 1;
      minted.set(prefix, n2);
      return n2 === 1 ? `${prefix}:${mint}` : `${prefix}:${mint}.${n2}`;
    };
    function notify() {
      const state = getState();
      listeners.forEach((l) => l(state));
    }
    function contentBoundsList(excludeId) {
      return contentIds.filter((id) => id !== excludeId).map((id) => ({ id, bounds: boundsOf(nodes.get(id)) })).filter((c) => c.bounds !== void 0);
    }
    function signatureOf(ids) {
      return structuralSignature(ids, nodes, (id) => topInterpretation(nodes.get(id)) ?? "art");
    }
    function matchesFor(ids) {
      const sig2 = signatureOf(ids);
      const out = [];
      for (const aid of artifacts) {
        const a = nodes.get(aid);
        const code = [...a.reps].reverse().find((r) => r.modality === "code")?.data;
        if (code?.kind === "text") continue;
        const aSig = getRep(a, "signature")?.data;
        if (!aSig) continue;
        const examples = getRep(a, "examples")?.data;
        const m = matchDefinition(sig2, aSig, examples);
        if (m.vetoed || m.score < MATCH_FLOOR) continue;
        out.push({ artifactId: aid, name: wordOf(a) ?? aid, score: m.score, reasoning: m.reasoning });
      }
      return out.sort((p, q) => q.score - p.score);
    }
    function recomputeClusterCandidates() {
      clusterCandidates = [];
      if (artifacts.length === 0 || contentIds.length === 0) return;
      const marks = contentIds.map(markOf).filter((m) => !!m);
      const groups = clusters(marks, relate(marks));
      for (const ids of groups) {
        const strokeIds = ids.filter((id) => !artifacts.includes(id));
        if (strokeIds.length < 2) continue;
        const matches = matchesFor(strokeIds);
        if (matches.length > 0) clusterCandidates.push({ nodeIds: strokeIds, matches });
      }
    }
    function makeSuggestions(enclosedIds) {
      const suggestions = [];
      for (const m of matchesFor(enclosedIds)) {
        suggestions.push({
          id: nextId("sug"),
          kind: "match",
          label: m.name,
          artifactId: m.artifactId,
          score: m.score,
          reasoning: m.reasoning
        });
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
        const code = [...n2.reps].reverse().find((r) => r.modality === "code")?.data;
        if (code?.kind === "text") continue;
        for (const e of n2.edges) if (e.rel === "has-part") ids.add(e.to);
      }
      return [...ids].map((id) => nodes.get(id)).filter((n2) => !!n2 && !getRep(n2, "erased") && !!strokePointsOf(n2)).map((n2) => ({
        id: n2.id,
        points: strokePointsOf(n2),
        closed: fingerprintOf(n2)?.isClosed ?? false
      }));
    }
    function handOf(ev) {
      const named2 = ev.participantId ?? LOCAL_PARTICIPANT;
      if (isHuman(named2)) return named2;
      return ev.by ? handId(ev.by) : LOCAL_PARTICIPANT;
    }
    function blankGestures(hand) {
      const commandMark = hand === LOCAL_PARTICIPANT ? config.gesture.commandMark ?? null : null;
      return { pendingLasso: null, summon: null, selection: [], markMiss: null, commandMark };
    }
    function gesturesOf(hand) {
      let g = gestures.get(hand);
      if (!g) gestures.set(hand, g = blankGestures(hand));
      return g;
    }
    function isPendingLasso(id) {
      for (const g of gestures.values()) if (g.pendingLasso?.id === id) return true;
      return false;
    }
    function buildSummon(ids, source, reasoning, gestureIds, scopeBounds, excludeId, at, g) {
      const artifactId = liveArtifactUnder(scopeBounds, excludeId);
      const onArtifact = artifactId ? {
        artifactId,
        regionIds: regionsOverlapping(regionsOf(nodes.get(artifactId), nodes), scopeBounds).map((r) => r.id)
      } : void 0;
      g.selection = ids.slice();
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
    function recentWithin(at, hand) {
      return contentIds.filter((id) => {
        if ((markHands.get(id) ?? LOCAL_PARTICIPANT) !== hand) return false;
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
    function scopeFromMark(points, fp, at, hand) {
      const candidates = contentIds.map(markOf).filter((m) => !!m && !getRep(nodes.get(m.id), "erased"));
      const engaged = candidates.filter((m) => {
        if (m.points && strokesIntersect(points, m.points)) return true;
        if (m.points && !m.closed) return false;
        if (!m.points) return boundsOverlap(fp.bounds, m.bounds);
        if (boundsOverlap(fp.bounds, m.bounds)) return true;
        const size = Math.max(1, m.bounds.maxX - m.bounds.minX, m.bounds.maxY - m.bounds.minY);
        return boundingBoxDistance(fp.bounds, m.bounds) < size * config.gesture.checkProximityRatio;
      });
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
      const recent = new Set(recentWithin(at, hand));
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
      const hand = handOf(ev);
      const g = gesturesOf(hand);
      markHands.set(node.id, hand);
      const byHand = !ev.content;
      if (g.pendingLasso && byHand) {
        const lassoNode = nodes.get(g.pendingLasso.id);
        const lassoFp = fingerprintOf(lassoNode);
        const lassoPoints = strokePointsOf(lassoNode) ?? [];
        const gestureConfig = { ...config.gesture, commandMark: g.commandMark };
        const strokePair = { check: points, lasso: lassoPoints };
        if (resolvesLasso(fp, at, lassoFp, g.pendingLasso.at, gestureConfig, strokePair)) {
          node.reps.push({
            modality: "gesture",
            data: { role: g.commandMark ? "command" : "check" },
            source: g.commandMark ? `command-mark:${g.commandMark.name}` : "heuristic"
          });
          lassoNode.reps.push({ modality: "gesture", data: { role: "lasso" }, source: "heuristic" });
          removeFromContent(lassoNode.id);
          const enclosedIds = enclosedBy(lassoFp.bounds, contentBoundsList());
          g.summon = buildSummon(
            enclosedIds,
            "lasso",
            `you circled ${enclosedIds.length} mark${enclosedIds.length === 1 ? "" : "s"}`,
            [lassoNode.id, node.id],
            lassoFp.bounds,
            lassoNode.id,
            at,
            g
          );
          g.pendingLasso = null;
          g.markMiss = null;
          recomputeClusterCandidates();
          return node.id;
        }
        g.markMiss = whyNotResolved(fp, at, lassoFp, g.pendingLasso.at, gestureConfig, strokePair);
      } else {
        g.markMiss = null;
      }
      if (byHand && matchesCommandMark(fp, g.commandMark ?? BUILTIN_COMMAND_MARK).match) {
        const scope = scopeFromMark(points, fp, at, hand);
        if (scope) {
          node.reps.push({
            modality: "gesture",
            data: { role: g.commandMark ? "command" : "check", scope: scope.source },
            source: g.commandMark ? `command-mark:${g.commandMark.name}` : "heuristic"
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
          g.summon = buildSummon(scope.ids, scope.source, scope.reasoning, [node.id], union, node.id, at, g);
          g.pendingLasso = null;
          g.markMiss = null;
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
        g.pendingLasso = null;
        g.summon = null;
        for (const id of scratched) eraseNode(id, at);
        return node.id;
      }
      if (byHand) {
        g.summon = null;
        g.selection = [];
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
      if (absorbIntoWord(node, fp, at, scale, hand)) {
        recomputeClusterCandidates();
        return node.id;
      }
      addSpatialEdges(node);
      inferWire(node, points, scale);
      const enclosed = enclosedBy(fp.bounds, contentBoundsList(node.id));
      const onLive = liveArtifactUnder(fp.bounds, node.id);
      g.pendingLasso = byHand && (isLassoLike(fp, enclosed.length) || fp.isClosed && onLive) ? { id: node.id, at } : null;
      recomputeClusterCandidates();
      return node.id;
    }
    function applyBless(ev) {
      const hand = handOf(ev);
      const own = gestures.get(hand);
      const summon = own?.summon;
      if (!own || !summon || summon.id !== ev.summonId) return null;
      const chosen = ev.suggestionId ? summon.suggestions.find((s) => s.id === ev.suggestionId) : void 0;
      if (chosen?.kind === "keep-as-drawing") {
        for (const gid of summon.gestureIds) {
          const g = nodes.get(gid);
          g.reps = g.reps.filter((r) => r.modality !== "gesture");
          contentIds.push(gid);
        }
        own.summon = null;
        recomputeClusterCandidates();
        return null;
      }
      const name = ev.name ?? chosen?.label;
      if (!name) return null;
      const memberIds = summon.enclosedIds;
      const memberBounds = memberIds.map((id) => boundsOf(nodes.get(id)));
      const unionBounds2 = getBounds(
        memberBounds.flatMap((b) => [
          { x: b.minX, y: b.minY },
          { x: b.maxX, y: b.maxY }
        ])
      );
      const named2 = ev.participantId ?? LOCAL_PARTICIPANT;
      const maker = hand;
      if (ev.by && maker === handId(ev.by)) handParticipant(ev.by);
      const artifact = {
        id: nextId("artifact"),
        reps: [
          { modality: "word", data: name, source: named2 },
          { modality: "bounds", data: unionBounds2 },
          { modality: "signature", data: signatureOf(memberIds), source: TIER0_PARTICIPANT }
        ],
        edges: [
          ...maker !== LOCAL_PARTICIPANT ? [{ to: maker, rel: "made-by" }] : [],
          ...memberIds.map((id) => ({ to: id, rel: "has-part", blessed: true })),
          ...summon.gestureIds.map((id) => ({ to: id, rel: "blessed-by" })),
          ...chosen?.artifactId ? [{ to: chosen.artifactId, rel: "instance-of", blessed: true }] : []
        ],
        capability: 0,
        createdAt: ev.at
      };
      nodes.set(artifact.id, artifact);
      markHands.set(artifact.id, hand);
      for (const id of memberIds) {
        nodes.get(id).edges.push({ to: artifact.id, rel: "part-of", blessed: true });
        removeFromContent(id);
      }
      contentIds.push(artifact.id);
      artifacts.push(artifact.id);
      own.selection = [];
      own.summon = null;
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
      for (const g of gestures.values()) {
        g.selection = g.selection.filter((id) => id !== node.id);
        if (g.pendingLasso?.id === node.id) g.pendingLasso = null;
        if (g.summon && (g.summon.enclosedIds.includes(node.id) || g.summon.gestureIds.includes(node.id))) g.summon = null;
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
      const node = createParticipantNode(nextId("participant"), ev.kind, ev.name, ev.at, ev.capability ?? 0, ev.locality);
      nodes.set(node.id, node);
      participants.push(node.id);
      return node.id;
    }
    function applyPropose(ev) {
      const node = nodes.get(ev.nodeId);
      if (!node || !participants.includes(ev.participantId)) return;
      if (getRep(node, "erased")) return;
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
    function applyLabel(ev) {
      const node = nodes.get(ev.nodeId);
      if (!node || getRep(node, "erased")) return null;
      const pid = ev.participantId ?? LOCAL_PARTICIPANT;
      if (authorOf(node) !== pid) return null;
      node.reps.push({ modality: "label", data: { text: ev.text, at: ev.at }, source: pid });
      return node.id;
    }
    function applyAnswer(ev) {
      if (!participants.includes(ev.participantId)) return null;
      const about = ev.aboutIds.filter((id) => {
        const n2 = nodes.get(id);
        return !!n2 && !getRep(n2, "erased");
      });
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
        const cross2 = ordered2.reduce((acc, t) => acc + (axis === "row" ? (t.bounds.minY + t.bounds.maxY) / 2 : (t.bounds.minX + t.bounds.maxX) / 2), 0) / ordered2.length;
        let cursor = start;
        placed2 = ordered2.map((t, i) => {
          const size = sizes[i];
          const half = (axis === "row" ? h2(t.bounds) : w2(t.bounds)) / 2;
          const to = axis === "row" ? { minX: cursor, maxX: cursor + size, minY: cross2 - half, maxY: cross2 + half } : { minX: cross2 - half, maxX: cross2 + half, minY: cursor, maxY: cursor + size };
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
      const out = contentIds.filter((id) => !artifacts.includes(id) && !isPendingLasso(id));
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
    function applyBind(ev) {
      const stroke = nodes.get(ev.strokeId);
      const target = nodes.get(ev.nodeId);
      if (!stroke || !target || ev.strokeId === ev.nodeId) return;
      const by = ev.participantId ?? LOCAL_PARTICIPANT;
      const site = { kind: ev.site.kind, index: ev.site.index };
      stroke.edges = stroke.edges.filter((e) => !(e.rel === "bound-to" && e.end === ev.end));
      stroke.edges.push({
        to: ev.nodeId,
        rel: "bound-to",
        blessed: true,
        via: by,
        end: ev.end,
        site,
        reasoning: `its ${ev.end} was released on ${ev.site.kind} ${ev.site.index} of this mark`
      });
      stroke.reps = stroke.reps.filter((r) => !(r.modality === "bound" && r.data.end === ev.end));
      stroke.reps.push({
        modality: "bound",
        data: { end: ev.end, nodeId: ev.nodeId, site: { ...site } },
        source: by
      });
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
    const SHAPE_NOT_LETTER = 0.72;
    function topShape2(n2) {
      const top = resemblances(n2)[0];
      if (!top) return null;
      return { type: top.to.replace(/^type:/, ""), weight: top.weight ?? 0 };
    }
    function neverLetter(n2) {
      const t = topShape2(n2);
      return !!t && (t.type === "rectangle" || t.type === "triangle") && t.weight >= SHAPE_NOT_LETTER;
    }
    function shapeAlone(n2) {
      const t = topShape2(n2);
      return !!t && t.type !== "text" && t.type !== "art" && t.weight >= SHAPE_NOT_LETTER;
    }
    function letterCandidate(id, scale) {
      const n2 = nodes.get(id);
      if (!n2 || isWord(n2) || getRep(n2, "gesture") || isPendingLasso(id)) return null;
      const fp = fingerprintOf(n2);
      const st = getRep(n2, "stroke")?.data;
      if (!fp || !st) return null;
      const sc = st.scale ?? scale;
      if (!isLetterLike(fp.bounds, sc) || neverLetter(n2)) return null;
      return { node: n2, bounds: fp.bounds, at: st.at, scale: sc };
    }
    function absorbIntoWord(node, fp, at, scale, hand) {
      if (!isLetterLike(fp.bounds, scale) || neverLetter(node)) return false;
      const maker = authorOf(node);
      const ordered2 = contentIds.filter((id) => id !== node.id && authorOf(nodes.get(id)) === maker);
      const prevId = ordered2[ordered2.length - 1];
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
      const first = letterCandidate(prevId, scale);
      if (!first) return false;
      if (shapeAlone(node) && shapeAlone(prev)) return false;
      const j = joinsRun({ bounds: first.bounds, lastAt: first.at }, letter, scale);
      if (!j.ok) return false;
      const run = [first];
      let bounds = first.bounds;
      for (let i = ordered2.length - 2; i >= 0; i--) {
        const cand = letterCandidate(ordered2[i], scale);
        if (!cand) break;
        const back = joinsRun({ bounds, lastAt: cand.at }, { bounds: cand.bounds, at: run[0].at }, cand.scale);
        if (!back.ok) break;
        run.unshift(cand);
        bounds = { minX: Math.min(bounds.minX, cand.bounds.minX), minY: Math.min(bounds.minY, cand.bounds.minY), maxX: Math.max(bounds.maxX, cand.bounds.maxX), maxY: Math.max(bounds.maxY, cand.bounds.maxY) };
      }
      const letterIds = run.map((r) => r.node.id).concat(node.id);
      const word = { id: nextId("word"), reps: [], edges: [{ to: maker, rel: "made-by" }], capability: 0, createdAt: at };
      nodes.set(word.id, word);
      markHands.set(word.id, hand);
      setWordReps(word, letterIds);
      for (const id of letterIds) {
        nodes.get(id).edges.push({ to: word.id, rel: "part-of", reasoning: j.reasoning });
      }
      const idx = contentIds.indexOf(letterIds[0]);
      contentIds.splice(idx, 1, word.id);
      for (const id of letterIds.slice(1)) removeFromContent(id);
      const own = gestures.get(hand);
      if (own && own.pendingLasso?.id === node.id) own.pendingLasso = null;
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
      gesturesOf(handOf(ev)).selection = ev.ids.filter((id) => contentIds.includes(id));
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
      const moved2 = getRep(node, "transform")?.data;
      if (moved2) return moved2;
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
    function applyCorrect(ev) {
      const def = nodes.get(ev.definitionId);
      if (!def || !artifacts.includes(ev.definitionId)) return;
      const ids = ev.ids.filter((id) => nodes.has(id));
      if (ids.length === 0) return;
      const sig2 = signatureOf(ids);
      const prev = getRep(def, "examples")?.data;
      def.reps = def.reps.filter((r) => r.modality !== "examples");
      def.reps.push({
        modality: "examples",
        data: addExample(prev, sig2, ev.verdict),
        source: ev.participantId ?? LOCAL_PARTICIPANT
      });
      recomputeClusterCandidates();
      const summon = gestures.get(handOf(ev))?.summon;
      if (summon && sameSet(summon.enclosedIds, ids)) {
        summon.suggestions = summon.suggestions.filter((g) => g.kind !== "match");
        summon.suggestions.unshift(...makeSuggestions(ids).filter((g) => g.kind === "match"));
      }
    }
    function applyClock(ev) {
      if (!artifacts.includes(ev.nodeId) && !live.includes(ev.nodeId)) return;
      const prev = clocks[ev.nodeId] ?? { playing: false, seed: 1, at: ev.at };
      switch (ev.op) {
        case "play":
          clocks[ev.nodeId] = { playing: true, seed: prev.seed, at: ev.at };
          break;
        case "pause":
          clocks[ev.nodeId] = { playing: false, seed: prev.seed, at: ev.at, ...ev.reason ? { reason: ev.reason } : {} };
          break;
        case "reset":
          clocks[ev.nodeId] = { playing: prev.playing, seed: prev.seed, at: ev.at };
          break;
        case "seed":
          clocks[ev.nodeId] = { playing: prev.playing, seed: ev.seed ?? prev.seed, at: ev.at };
          break;
      }
    }
    function applyFrame(ev) {
      const members = ev.ids.filter((id) => artifacts.includes(id) && !getRep(nodes.get(id), "erased"));
      if (members.length < 1 || !ev.name.trim()) return null;
      const pid = ev.participantId ?? LOCAL_PARTICIPANT;
      const bs = members.map((id) => boundsOf(nodes.get(id))).filter((b) => !!b);
      const union = bs.length ? getBounds(bs.flatMap((b) => [{ x: b.minX, y: b.minY }, { x: b.maxX, y: b.maxY }])) : null;
      const frame = {
        id: nextId("frame"),
        reps: [
          { modality: "word", data: ev.name.trim(), source: pid },
          { modality: "frame", data: { members, connections: ev.connections.filter((c) => members.includes(c.from.id) && members.includes(c.to.id)) }, source: pid },
          { modality: "signature", data: signatureOf(members), source: TIER0_PARTICIPANT },
          ...union ? [{ modality: "bounds", data: union, source: TIER0_PARTICIPANT }] : []
        ],
        edges: [
          { to: pid, rel: "made-by" },
          ...members.map((id) => ({ to: id, rel: "refers-to", blessed: true }))
        ],
        capability: 0,
        createdAt: ev.at
      };
      nodes.set(frame.id, frame);
      artifacts.push(frame.id);
      return frame.id;
    }
    function applyImport(ev) {
      const pid = ev.participantId ?? LOCAL_PARTICIPANT;
      if (!participants.includes(pid)) return null;
      if (ev.strokes && ev.strokes.length) {
        let first = null;
        let at = ev.at;
        for (const pts of ev.strokes) {
          if (!pts || pts.length < 2) continue;
          const id = applyStroke({ type: "stroke", points: pts, at, participantId: pid, scale: 1, content: true, ...ev.by ? { by: ev.by } : {} });
          if (id && !first) first = id;
          at += 1;
        }
        return first;
      }
      if (ev.code === void 0) return null;
      const name = ev.name?.trim() || ev.path.split("/").pop() || ev.path;
      const node = {
        id: nextId("artifact"),
        reps: [
          { modality: "word", data: name, source: pid },
          { modality: "bounds", data: { ...ev.bounds }, source: pid },
          { modality: "code", data: { code: ev.code, language: ev.kind, kind: ev.kind, path: ev.path, regions: [], at: ev.at }, source: pid },
          { modality: "signature", data: { shapes: { [ev.kind]: 1 }, links: {}, size: 1 }, source: TIER0_PARTICIPANT }
        ],
        edges: [{ to: pid, rel: "made-by" }],
        capability: 0,
        createdAt: ev.at
      };
      nodes.set(node.id, node);
      markHands.set(node.id, handOf(ev));
      artifacts.push(node.id);
      contentIds.push(node.id);
      if (ev.kind !== "png" && ev.kind !== "jpg") live.push(node.id);
      recomputeClusterCandidates();
      return node.id;
    }
    function isHuman(participantId) {
      if (participantId === LOCAL_PARTICIPANT) return true;
      const p = nodes.get(participantId);
      const kind = p ? getRep(p, "participant")?.data?.kind : void 0;
      return kind === "human";
    }
    function applyBehave(ev) {
      const node = nodes.get(ev.nodeId);
      if (!node || !artifacts.includes(ev.nodeId)) return;
      const pid = ev.participantId ?? LOCAL_PARTICIPANT;
      if (!participants.includes(pid)) return;
      const terms = Array.isArray(ev.behaviour?.terms) ? ev.behaviour.terms : [];
      if (terms.length === 0 && !ev.behaviour?.code) return;
      node.reps.push({
        modality: "behaviour",
        data: { ...ev.behaviour, terms, blessed: isHuman(pid), at: ev.at },
        source: pid
      });
    }
    function sameSet(a, b) {
      if (a.length !== b.length) return false;
      const set = new Set(a);
      return b.every((x) => set.has(x));
    }
    function applySummon(ev) {
      const g = gesturesOf(handOf(ev));
      if (ev.ids) {
        const ids = ev.ids.filter((id) => contentIds.includes(id));
        const boxes = ids.map((id) => boundsOf(nodes.get(id))).filter((b) => !!b);
        if (!ids.length || !boxes.length) return null;
        const union = boxes.reduce((a, b) => ({
          minX: Math.min(a.minX, b.minX),
          minY: Math.min(a.minY, b.minY),
          maxX: Math.max(a.maxX, b.maxX),
          maxY: Math.max(a.maxY, b.maxY)
        }));
        const summon2 = buildSummon(ids, "pointed", `you pointed at ${ids.length} mark${ids.length === 1 ? "" : "s"}`, [], union, "", ev.at, g);
        g.summon = summon2;
        g.markMiss = null;
        recomputeClusterCandidates();
        return summon2.id;
      }
      if (!g.pendingLasso) return null;
      const lassoNode = nodes.get(g.pendingLasso.id);
      const lassoFp = lassoNode && fingerprintOf(lassoNode);
      if (!lassoNode || !lassoFp) return null;
      lassoNode.reps.push({ modality: "gesture", data: { role: "lasso" }, source: "heuristic" });
      removeFromContent(lassoNode.id);
      const enclosedIds = enclosedBy(lassoFp.bounds, contentBoundsList());
      const summon = buildSummon(
        enclosedIds,
        "lasso",
        `you circled ${enclosedIds.length} mark${enclosedIds.length === 1 ? "" : "s"} and asked`,
        [lassoNode.id],
        lassoFp.bounds,
        lassoNode.id,
        ev.at,
        g
      );
      g.summon = summon;
      g.pendingLasso = null;
      g.markMiss = null;
      recomputeClusterCandidates();
      return summon.id;
    }
    function applyTeach(ev) {
      gesturesOf(handOf(ev)).commandMark = ev.mark;
    }
    function codeVersion(nodeId) {
      const node = nodes.get(nodeId);
      return node ? node.reps.filter((r) => r.modality === "code").length : 0;
    }
    function staleFor(ev, expect) {
      let what;
      let targets;
      switch (ev.type) {
        case "code":
          what = "code";
          targets = [ev.nodeId];
          break;
        case "propose":
          what = "propose";
          targets = [ev.nodeId];
          break;
        // An answer may be about several marks. It is refused only when NOTHING
        // it was about is left; while one mark survives the answer still has
        // something to be anchored beside, and applyAnswer drops the rest.
        case "answer":
          what = "answer";
          targets = ev.aboutIds;
          break;
        case "label":
          what = "label";
          targets = [ev.nodeId];
          break;
        default:
          return null;
      }
      const participantId = "participantId" in ev ? ev.participantId : void 0;
      const at = "at" in ev && typeof ev.at === "number" ? ev.at : lastAt;
      const pNode = participantId ? nodes.get(participantId) : void 0;
      const name = pNode ? getRep(pNode, "word")?.data : void 0;
      const refuse = (reason, nodeId, maker) => ({
        what,
        reason,
        nodeId,
        participantId,
        detail: describeStale(reason, what, typeof name === "string" ? name : void 0, maker),
        at
      });
      if (expect?.generation !== void 0 && expect.generation !== generation) {
        return refuse("replaced", targets[0] ?? "");
      }
      if (participantId !== void 0 && !participants.includes(participantId)) {
        return refuse("unknown-participant", targets[0] ?? "");
      }
      const alive = targets.filter((id) => {
        const n2 = nodes.get(id);
        return !!n2 && !getRep(n2, "erased");
      });
      if (alive.length === 0) {
        const id = targets[0] ?? "";
        const n2 = nodes.get(id);
        return refuse(!n2 ? "missing" : "erased", id);
      }
      if (ev.type === "label") {
        const node = nodes.get(targets[0]);
        const maker = node ? authorOf(node) : LOCAL_PARTICIPANT;
        const mine = ev.participantId ?? LOCAL_PARTICIPANT;
        if (node && maker !== mine) {
          const makerNode = nodes.get(maker);
          const makerName = makerNode ? getRep(makerNode, "word")?.data : void 0;
          return refuse("not-your-ink", targets[0], typeof makerName === "string" ? makerName : maker);
        }
      }
      if (expect?.version !== void 0 && what === "code" && codeVersion(targets[0]) !== expect.version) {
        return refuse("superseded", targets[0]);
      }
      return null;
    }
    function applyCode(ev) {
      const node = nodes.get(ev.nodeId);
      if (!node || !participants.includes(ev.participantId)) return null;
      if (getRep(node, "erased")) return null;
      node.reps.push({
        modality: "code",
        data: {
          code: ev.code,
          language: ev.language ?? ev.kind ?? "html",
          kind: ev.kind ?? "html",
          prompt: ev.prompt,
          from: ev.from,
          fill: ev.fill,
          regions: regionsOf(node, nodes),
          at: ev.at
        },
        source: ev.participantId
      });
      if (!live.includes(node.id)) live.push(node.id);
      return node.id;
    }
    function handId(name) {
      return "participant:hand:" + name.replace(/[^A-Za-z0-9._-]+/g, "_");
    }
    function handParticipant(name) {
      const id = handId(name);
      if (!nodes.has(id)) {
        nodes.set(id, createParticipantNode(id, "human", handLabel(name), lastAt));
        participants.push(id);
      }
      return id;
    }
    function applyEvent(raw) {
      const pid = "participantId" in raw ? raw.participantId : void 0;
      const ev = raw.by && (!pid || pid === LOCAL_PARTICIPANT) ? { ...raw, participantId: handParticipant(raw.by) } : raw;
      if ("at" in ev && typeof ev.at === "number") lastAt = Math.max(lastAt, ev.at);
      mint = mintKeyOf(ev);
      minted.clear();
      try {
        return applyByType(ev);
      } finally {
        mint = null;
        minted.clear();
      }
    }
    function applyByType(ev) {
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
        case "label":
          return applyLabel(ev);
        case "teach":
          applyTeach(ev);
          return null;
        case "correct":
          applyCorrect(ev);
          return null;
        case "clock":
          applyClock(ev);
          return null;
        case "behave":
          applyBehave(ev);
          return null;
        case "frame":
          return applyFrame(ev);
        case "import":
          return applyImport(ev);
        case "summon":
          return applySummon(ev);
        case "split":
          applySplit(ev);
          return null;
        case "select":
          applySelect(ev);
          return null;
        case "deselect":
          gesturesOf(handOf(ev)).selection = [];
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
        case "bind":
          applyBind(ev);
          return null;
        case "code":
          return applyCode(ev);
        case "dismiss": {
          const g = gestures.get(handOf(ev));
          if (g && g.summon?.id === ev.summonId) g.summon = null;
          return null;
        }
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
    function dispatch(raw) {
      staleResult = null;
      const ev = myLog === void 0 || raw.seq !== void 0 ? raw : { ...raw, origin: myLog, seq: (highWater.get(myLog) ?? 0) + 1 };
      if (ev.origin && typeof ev.seq === "number") sawNumber(ev.origin, ev.seq);
      events.push(ev);
      const result2 = applyEvent(ev);
      maybeCheckpoint(events.length);
      notify();
      return result2;
    }
    function guarded(ev, expect) {
      const stale = staleFor(ev, expect);
      if (stale) {
        staleResult = stale;
        notify();
        return null;
      }
      return dispatch(ev);
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
      const reader = gestures.get(LOCAL_PARTICIPANT) ?? blankGestures(LOCAL_PARTICIPANT);
      return {
        nodes,
        contentIds: [...contentIds],
        pendingLassoId: reader.pendingLasso?.id ?? null,
        summon: reader.summon ? { ...reader.summon, enclosedIds: [...reader.summon.enclosedIds] } : null,
        clusterCandidates: clusterCandidates.map((c) => ({ ...c })),
        artifacts: [...artifacts],
        participants: [...participants],
        explanations: [...explanations],
        commandMark: reader.commandMark,
        markMiss: reader.markMiss,
        staleResult,
        generation,
        recentIds: recentWithin(lastAt, LOCAL_PARTICIPANT),
        live: [...live],
        clocks: { ...clocks },
        selection: [...reader.selection]
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
      join: (kind, name, at, capability, locality) => dispatch({ type: "join", kind, name, at, capability, ...locality ? { locality } : {} }),
      propose: ({ expect, ...args }) => void guarded({ type: "propose", ...args }, expect),
      answer: ({ expect, ...args }) => guarded({ type: "answer", ...args }, expect),
      label: (args) => guarded({ type: "label", ...args }),
      teachCommandMark: (mark, at) => void dispatch({ type: "teach", mark, at }),
      correct: (args) => void dispatch({ type: "correct", ...args }),
      clock: (args) => void dispatch({ type: "clock", ...args }),
      behave: (args) => void dispatch({ type: "behave", ...args }),
      frame: (args) => dispatch({ type: "frame", ...args }),
      import: (args) => dispatch({ type: "import", ...args }),
      matchesOf: (ids) => matchesFor(ids),
      tidy: (args) => void dispatch({ type: "tidy", ...args }),
      snap: (args) => void dispatch({ type: "snap", ...args }),
      bind: (args) => void dispatch({ type: "bind", ...args }),
      snapCandidates: (ids) => candidatesAmong(ids ?? snappableIds()),
      attachCode: ({ expect, ...args }) => guarded({ type: "code", ...args }, expect),
      codeVersion,
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
      summonMarks: (ids, at) => dispatch({ type: "summon", ids: ids.slice(), at }),
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
        generation++;
        staleResult = null;
        events = log.map((ev) => ({ ...ev }));
        checkpoints = [];
        if (!logNameSaid) {
          let remembered;
          for (const ev of events) if (!ev.by && ev.origin) remembered = ev.origin;
          if (remembered !== void 0) myLog = remembered;
        }
        for (const ev of events) {
          if (ev.origin && typeof ev.seq === "number") sawNumber(ev.origin, ev.seq);
        }
        replay();
        notify();
      },
      getState,
      subscribe,
      getEvents: () => events,
      setLogName: (name) => {
        myLog = name;
        logNameSaid = true;
      },
      logName: () => myLog ?? null
    };
  }

  // src/llm/provider.ts
  var PRESETS = {
    ollama: { kind: "openai-compatible", baseUrl: "http://localhost:11434/v1" },
    lmStudio: { kind: "openai-compatible", baseUrl: "http://localhost:1234/v1" },
    openRouter: { kind: "openai-compatible", baseUrl: "https://openrouter.ai/api/v1" },
    anthropic: { kind: "anthropic", baseUrl: "https://api.anthropic.com/v1" }
  };
  function textOf3(content) {
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
  function providerLocality(config) {
    return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(config.baseUrl) ? "local" : "hosted";
  }
  function providerTier(config) {
    void config;
    return 2;
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
    const system = messages.filter((m) => m.role === "system").map((m) => textOf3(m.content)).join("\n\n");
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
    const timeoutMs = config.timeoutMs ?? (providerLocality(config) === "local" ? LOCAL_TIMEOUT_MS : DEFAULT_TIMEOUT_MS);
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

  // src/parse/plan.ts
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
  function planFor(session, artifactId) {
    const state = session.getState();
    const artifact = state.nodes.get(artifactId);
    if (!artifact) return { error: "no such artifact" };
    const frame = frameOf(artifact);
    if (!frame) return { error: "artifact has no frame" };
    const regions = regionsOf(artifact, state.nodes);
    if (regions.length === 0) return { error: "nothing was drawn inside the artifact" };
    const reading = session.read(regions.map((r) => r.nodeId));
    const genre = reading.genre.genre;
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
      return { genre, regions, reading, ids: nodeIdsIn(graph), describe: describeGraph(graph), build: (c, t) => buildGraphScaffold(graph, c, t) };
    }
    const layout = parseLayout(regions, frame, connectionsOf(artifact, state, regions));
    return { genre, regions, reading, ids: regionIdsIn(layout), describe: describeLayout(layout), build: (c, t) => buildScaffold(layout, c, t) };
  }

  // src/tier1/library.ts
  var TIER1_LIBRARY = [
    { id: "relations", name: "relations", ability: "read", does: "what the canvas can see between marks \u2014 inside, near, crossing, aligned \u2014 every threshold a ratio of their size", source: "relate/relations.ts" },
    { id: "roles", name: "the diagram rung", ability: "read", does: "what a mark plays: container, node, edge, label, annotation", source: "diagram/roles.ts" },
    { id: "concepts", name: "concepts", ability: "read", does: "a row, a column, a frame, a flow, a grid, a label, a slider \u2014 matched plurally, ranked", source: "concepts/concept.ts" },
    { id: "tidy", name: "tidy", ability: "arrange", does: "line marks up and space them evenly, or match their sizes; the ink untouched", source: "session/session.ts (tidy)" },
    { id: "clean", name: "clean forms", ability: "clean", does: "a confident, unambiguous reading redrawn from the ink's own measurements", source: "session/clean.ts" },
    { id: "structure", name: "structure", ability: "structure", does: "a page or a diagram from the drawing \u2014 the regions in place, no words", source: "tier1/library.ts, parse/" },
    { id: "signature", name: "signatures", ability: "name", does: "a named group recognised again by its shapes and the links between them", source: "session/signature.ts" },
    { id: "verbs", name: "words into verbs", ability: "verbs", does: "the common ways each verb is said, read with no model", source: "behave/words.ts" },
    { id: "library", name: "the library", ability: "reuse", does: "a brief the library already answers reuses that program", source: "kinds/, Demos/surface/09-palette.js" },
    { id: "trace", name: "tracing", ability: "trace", does: "a picture of a sketch becomes ink", source: "image/trace.ts" },
    { id: "measure", name: "the maths", ability: "measure", does: "what follows from a reading, as numbers", source: "session/measure.ts" },
    { id: "fit", name: "acting out", ability: "fit", does: "a dragged path fitted onto the verb basis, the residual named", source: "behave/fit.ts" },
    { id: "frames", name: "wiring", ability: "wire", does: "artifacts wired by their ports, connections offered by type and ranked by name", source: "frames/frame.ts" },
    { id: "words", name: "words from letters", ability: "words", does: "printed letters gathered into one word", source: "session/words.ts" },
    { id: "graph3d", name: "a graph in 3D", ability: "structure", does: "nodes as spheres and edges as bonds, turning in the frame, each sphere named for its mark", source: "tier1/library.ts (buildGraph3D)" }
  ];
  function describeTier1() {
    return TIER1_LIBRARY.map((m) => `${m.name} \u2014 ${m.does}`).join("\n");
  }
  var tagFor = (role) => role === "container" ? "section" : role === "label" ? "header" : "div";
  function buildStructure(session, artifactId) {
    const plan = planFor(session, artifactId);
    if ("error" in plan) return { ok: false, error: plan.error };
    const roleOf = new Map(plan.reading.roles.map((r) => [r.id, r.role]));
    const regionRole = new Map(plan.regions.map((r) => [r.id, roleOf.get(r.nodeId)]));
    const content = {};
    for (const id of plan.ids) {
      const role = regionRole.get(id) ?? "region";
      content[id] = {
        tag: tagFor(role),
        html: `<span class="mm-slot">${id} \xB7 ${role}</span>`,
        style: "display:flex;align-items:center;justify-content:center;border:1px dashed rgba(0,0,0,0.22);color:rgba(0,0,0,0.5);font:12px system-ui,sans-serif;min-height:0;"
      };
    }
    const code = plan.build(content, { background: "#fbfaf7", color: "#3a3a3a" });
    const check2 = validateRegions(code, plan.ids);
    if (!check2.ok) return { ok: false, error: `the structure does not match the drawing (missing ${check2.missing.join(", ") || "none"})` };
    return {
      ok: true,
      code,
      ids: plan.ids,
      genre: plan.genre,
      reasoning: `${plan.genre}: ${plan.ids.length} region${plan.ids.length === 1 ? "" : "s"} from the drawing, in place, with no words \u2014 the structure only`,
      participantId: ENGINE_PARTICIPANT
    };
  }
  var GRAPH3D_MARK = "// mm:structure graph3d";
  var GRAPH3D_PROGRAM = `
var W = mm.width, H = mm.height, S = Math.max(W, H) / 3.6; // pixels per unit at z = 0
var byId = {};
ATOMS.forEach(function (a) { byId[a.id] = a; });
if (mm.THREE && mm.scene) {
  var group = new THREE.Group();
  var atomMat = new THREE.MeshStandardMaterial({ color: 0x2b5f8e, roughness: 0.4, metalness: 0.05 });
  var bondMat = new THREE.MeshStandardMaterial({ color: 0x9a978c, roughness: 0.7 });
  ATOMS.forEach(function (a) {
    var m = new THREE.Mesh(new THREE.SphereGeometry(a.r, 32, 24), atomMat);
    m.position.set(a.x, a.y, 0); m.name = a.id; group.add(m);
  });
  BONDS.forEach(function (b) {
    var p = byId[b[0]], q = byId[b[1]]; if (!p || !q) return;
    var from = new THREE.Vector3(p.x, p.y, 0), to = new THREE.Vector3(q.x, q.y, 0);
    var d = new THREE.Vector3().subVectors(to, from), len = d.length(); if (!(len > 0)) return;
    var c = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, len, 12), bondMat);
    c.position.copy(from).addScaledVector(d, 0.5);
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    group.add(c);
  });
  mm.scene.add(group);
  // It turns on its own; a hand inside the frame turns it by dragging (the frame takes the pointer while it plays).
  var dragging = false, lastX = 0, spin = 0;
  mm.onPointer(function (p) {
    if (p.type === 'down') { dragging = true; lastX = p.x; }
    else if (p.type === 'move' && dragging) { spin += (p.x - lastX) * 0.01; lastX = p.x; }
    else { dragging = false; }
  });
  mm.onFrame(function (t, dt) { if (!dragging) spin += dt * 0.4; group.rotation.y = spin; group.rotation.x = Math.sin(t * 0.25) * 0.2; });
} else {
  // No three.js (offline, or it never loaded): the same graph flat, and the parts reported by hand.
  var cx = W / 2, cy = H / 2;
  mm.onFrame(function () {
    var g = mm.ctx; g.clearRect(0, 0, W, H);
    g.lineWidth = 3; g.strokeStyle = '#9a978c';
    BONDS.forEach(function (b) { var p = byId[b[0]], q = byId[b[1]]; if (!p || !q) return; g.beginPath(); g.moveTo(cx + p.x * S, cy - p.y * S); g.lineTo(cx + q.x * S, cy - q.y * S); g.stroke(); });
    g.fillStyle = '#2b5f8e';
    ATOMS.forEach(function (a) { var x = cx + a.x * S, y = cy - a.y * S, r = a.r * S; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); mm.report(a.id, x - r, y - r, r * 2, r * 2); });
  });
}
`;
  function buildGraph3D(session, artifactId) {
    const plan = planFor(session, artifactId);
    if ("error" in plan) return { ok: false, error: plan.error };
    if (plan.genre !== "graph" && plan.genre !== "mixed") return { ok: false, error: `a ${plan.genre} is not a graph \u2014 nothing to stand as spheres` };
    const state = session.getState();
    const artifact = state.nodes.get(artifactId);
    const frame = frameOf(artifact);
    const roleOf = new Map(plan.reading.roles.map((r) => [r.id, r.role]));
    const atoms = plan.regions.filter((r) => roleOf.get(r.nodeId) === "node");
    if (atoms.length < 2) return { ok: false, error: "fewer than two nodes to join" };
    const known = new Set(atoms.map((a) => a.id));
    const bonds = connectionsOf(artifact, state, plan.regions).filter((c) => known.has(c.from) && known.has(c.to));
    const s = 3.6 / Math.max(1, frame.w, frame.h);
    const A = atoms.map((a) => ({
      id: a.id,
      x: +((a.rect.x + a.rect.w / 2 - frame.w / 2) * s).toFixed(3),
      y: +((frame.h / 2 - (a.rect.y + a.rect.h / 2)) * s).toFixed(3),
      r: +Math.max(0.08, Math.min(a.rect.w, a.rect.h) / 2 * s).toFixed(3)
    }));
    const code = [
      `${GRAPH3D_MARK} \u2014 ${A.length} spheres, ${bonds.length} bonds, from the drawing`,
      `var ATOMS = ${JSON.stringify(A)};`,
      `var BONDS = ${JSON.stringify(bonds.map((b) => [b.from, b.to]))};`,
      GRAPH3D_PROGRAM.trim()
    ].join("\n");
    return {
      ok: true,
      code,
      ids: A.map((a) => a.id),
      atoms: A.length,
      bonds: bonds.length,
      reasoning: `${A.length} nodes as spheres and ${bonds.length} edge${bonds.length === 1 ? "" : "s"} as bonds, in the frame, turning \u2014 each sphere named for its mark`,
      participantId: ENGINE_PARTICIPANT
    };
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
    const label = labelOf(node);
    if (label) lines.push(`  labelled "${label.text}" by the hand that made it`);
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
  var HERE = `THE CANVAS holds only these: ink (the human's marks, read as rectangle, circle, triangle, line, arrow, text or dot), names the human gives a group, PAGES (regions the drawing laid out, filled per region id), PROGRAMS (the body of a function of \`mm\`: width, height, ctx, THREE/scene/camera when 3D loaded, onFrame, onPointer, report), TEXT (plain words, editable), SVG markup, and short answers placed beside marks. Nothing else exists here \u2014 no files, servers, frameworks or libraries beyond three.js r128.`;
  var SYSTEM_PROMPT = `You are a participant on a shared drawing canvas, alongside a human and the canvas's own geometric recognizer.

${HERE}

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

${HERE}

You are given GROUNDED FACTS: measured geometry, spatial relations between marks, and how each participant (including the canvas's own recognizer) currently reads them. You are not given an image.

Answer the question directly, in 1\u20133 short sentences of plain prose.

Rules:
- CITE THE EVIDENCE. Refer to the actual measurements and relations you were given \u2014 "these three closed shapes are joined by two strokes that touch both" \u2014 not to a general impression of what the drawing looks like.
- Do not restate the drawing back to the human. They can see it. Say the thing they cannot see.
- If the readings disagree, say so and explain what separates them. The disagreement is usually the answer.
- If the facts do not support an answer, say what is missing rather than guessing.
- No preamble, no markdown, no bullet points. Just the answer.`;
  var MAKE_PROMPT = `You are a participant on a shared drawing canvas. The human drew a layout and asked you to build it.

${HERE}

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
  var BEHAVE_PROMPT = `You are a participant on a shared drawing canvas. A human wrote, beside a thing they drew and named, some words about what it DOES. Map those words onto the canvas's closed vocabulary of steering verbs \u2014 nothing else runs here:

  wander            drift about (no target)
  seek <name>       move toward the nearest thing named <name>
  flee <name>       move away from the nearest thing named <name> (params.only: "bigger" | "smaller" to qualify)
  home <name>       return to and rest in the nearest thing named <name>
  school <name>     move with others named <name>
  hold              keep to where it started
  avoid <name>      steer around things named <name>
  consume <name>    eat things named <name> on contact
  spawn <name>      give off things named <name>
  drift             float with a direction (params.direction: "up" | "down")
  expire            disappear after a while

A target is a NAME the human uses for something on the canvas; use the word they used, singular. Weights are 0\u20132, 1 is normal. Reply with JSON only:
{"terms":[{"verb":"flee","target":"shark","weight":1,"params":{"only":"bigger"},"why":"'runs from big sharks'"}],"unread":["any clause you could not map"]}
Every term's "why" quotes the words it came from. Do not invent a verb outside the list.`;
  var PROGRAM_PROMPT = `You are a participant on a shared drawing canvas. The human circled a drawing and typed a brief, and the canvas cannot answer it from what it holds \u2014 so you write a PROGRAM that renders it, right there, in the drawing's own frame.

${HERE}

THE CONTRACT. Your code is the body of a function with one argument, \`mm\`:
  mm.width, mm.height     the frame in pixels \u2014 fill it; the drawing sits exactly here
  mm.THREE                three.js, when it loaded (r128); may be undefined offline
  mm.scene, mm.camera, mm.renderer   a ready three.js scene with a TRANSPARENT background, a perspective camera looking at the origin, and a renderer that draws every frame \u2014 add meshes to mm.scene; do not create your own renderer or canvas
  mm.ctx                  a 2D canvas context the size of the frame, for drawings with no 3D; clear it yourself each frame
  mm.onFrame(fn)          fn(t, dt) runs every frame; use it to animate
  mm.onPointer(fn)        fn({type:'down'|'move'|'up', x, y}) when a hand presses inside the frame while it plays; mm.pointer holds the latest
  mm.report(name, x, y, w, h)   a PART: a named rectangle in frame pixels, so ink drawn over it lands on that name. Report every distinct thing you draw, every frame, at where it is now. For three.js, give each mesh a .name and the canvas reports it for you.
Rules:
- The background must stay CLEAR: nothing fills the frame; only the thing itself is drawn. It is a figure on the human's canvas, not a page.
- No imports, no fetch, no network, no DOM outside what mm gives you. Plain JavaScript that runs as written.
- Fit the frame: size the thing to mm.width/mm.height.
- Keep it short and readable \u2014 this program becomes a library entry the human will read and reuse.

THE LIBRARY. Programs the canvas already holds are listed below by name. If one already IS what was asked, do not write a new one: reply {"reuse":"<its name>"}. Reuse is the point; write fresh only when nothing there fits.

Reply with ONLY a JSON object, no prose, no code fences:
{"name":"torus","parts":["torus"],"code":"\u2026the function body, as one JSON string\u2026"}
or
{"reuse":"<library name>"}`;
  var DRAW_PROMPT = `You are a participant on a shared drawing canvas, alongside a human. You have been asked to ADD MARKS to the drawing.

${HERE}

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
    let depth2 = 0;
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
      else if (c === "{") depth2++;
      else if (c === "}" && --depth2 === 0) return text.slice(start, i + 1);
    }
    return null;
  }
  function salvageRegions(text) {
    const out = {};
    const re = /"(r\d+)"\s*:\s*\{/g;
    let m;
    while (m = re.exec(text)) {
      const start = m.index + m[0].length - 1;
      let depth2 = 0, inString = false, escaped = false, end = -1;
      for (let i = start; i < text.length; i++) {
        const c = text[i];
        if (inString) {
          if (escaped) escaped = false;
          else if (c === "\\") escaped = true;
          else if (c === '"') inString = false;
          continue;
        }
        if (c === '"') inString = true;
        else if (c === "{") depth2++;
        else if (c === "}" && --depth2 === 0) {
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
  function parseProgram(text) {
    const json = outermostObject(text);
    if (json) {
      try {
        const o = JSON.parse(json);
        if (typeof o.reuse === "string" && o.reuse.trim()) return { reuse: o.reuse.trim() };
        if (typeof o.code === "string" && o.code.trim()) {
          return {
            name: typeof o.name === "string" ? o.name.trim() : void 0,
            parts: Array.isArray(o.parts) ? o.parts.filter((p) => typeof p === "string") : void 0,
            code: o.code
          };
        }
      } catch {
      }
    }
    const fence = /```(?:js|javascript)?\s*([\s\S]*?)```/.exec(text);
    if (fence && fence[1].trim()) {
      const name = /"?name"?\s*[:=]\s*"([^"]+)"/.exec(text)?.[1];
      return { code: fence[1].trim(), name };
    }
    return null;
  }
  function parseBehaviourReply(text) {
    const json = outermostObject(text);
    const terms = [];
    const dropped = [];
    let unread = [];
    if (!json) return { terms, unread, dropped };
    let parsed;
    try {
      parsed = JSON.parse(json);
    } catch {
      return { terms, unread, dropped };
    }
    for (const raw of Array.isArray(parsed.terms) ? parsed.terms : []) {
      const t = raw;
      const verb = String(t.verb ?? "").toLowerCase();
      if (!VERBS.includes(verb)) {
        dropped.push(String(t.verb ?? "?"));
        continue;
      }
      const term = { verb, weight: Math.max(0, Math.min(2, Number(t.weight) || 1)), reasoning: t.why ? String(t.why) : "from the model" };
      if (TARGETED.has(verb) && t.target) term.target = String(t.target).toLowerCase().trim();
      if (t.params && typeof t.params === "object") {
        const params = {};
        for (const [k, v] of Object.entries(t.params)) if (typeof v === "number" || typeof v === "string") params[k] = v;
        if (Object.keys(params).length) term.params = params;
      }
      terms.push(term);
    }
    unread = (Array.isArray(parsed.unread) ? parsed.unread : []).map((u) => String(u));
    return { terms, unread, dropped };
  }
  function createAgentParticipant(session, config, at = 0, options = {}) {
    const send = options.transport ?? ((c, m, o) => complete(c, m, o));
    const name = options.name ?? providerLabel(config);
    const id = session.join("agent", name, at, options.tier ?? providerTier(config), options.locality ?? providerLocality(config));
    const staleWhy = (fallback) => session.getState().staleResult?.detail ?? fallback;
    async function interpret(nodeIds, now, signal) {
      const state = session.getState();
      const generation = state.generation;
      const targets = nodeIds.filter((n2) => state.nodes.has(n2));
      if (targets.length === 0) return { ok: false, readings: [], error: "no such nodes" };
      const isCluster = targets.length > 1;
      const context = describeSession(state, { nodeIds: targets }) + (isCluster ? `

${describeReading(session.read(targets), { noun: "mark" })}` : "");
      const signature2 = isCluster ? describeSignature(state, targets) : "";
      const question = isCluster ? `These ${targets.length} marks were grouped together (${signature2}). What could this group be? Offer several readings.` : `What could this mark be? Offer several readings.`;
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
        at: now,
        expect: { generation }
      });
      const stale = session.getState().staleResult;
      if (stale) return { ok: false, readings, error: stale.detail, raw: result2.text };
      return { ok: true, readings, raw: result2.text };
    }
    async function ask(question, nodeIds, now, signal) {
      const q = question.trim();
      if (!q) return { ok: false, error: "no question" };
      const state = session.getState();
      const generation = state.generation;
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
        at: now,
        expect: { generation }
      });
      if (!explanationId) return { ok: false, error: staleWhy("the canvas did not accept the answer"), text };
      return { ok: true, text, explanationId };
    }
    async function generate(args) {
      const prompt2 = args.prompt.trim();
      if (!prompt2) return { ok: false, error: "no prompt" };
      const state = session.getState();
      const generation = state.generation;
      const version = session.codeVersion(args.artifactId);
      const artifact = state.nodes.get(args.artifactId);
      if (!artifact) return { ok: false, error: "no such artifact" };
      const frame = frameOf(artifact);
      if (!frame) return { ok: false, error: "artifact has no frame" };
      const regions = regionsOf(artifact, state.nodes);
      if (regions.length === 0) return { ok: false, error: "nothing was drawn inside the artifact" };
      const planned = planFor(session, args.artifactId);
      if ("error" in planned) return { ok: false, error: planned.error };
      const reading = planned.reading;
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
      const plan = { describe: `${planned.describe}

${brief}`, ids: planned.ids, build: planned.build };
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
      const check2 = validateRegions(code, ids);
      if (!check2.ok) {
        return {
          ok: false,
          error: `the page does not match the drawing (missing ${check2.missing.join(", ") || "none"}${check2.duplicated.length ? `, duplicated ${check2.duplicated.join(", ")}` : ""})`,
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
        at: args.at,
        // A build is not pinned to a version: several participants may each
        // offer code for the same artifact and every offer is held. Only a
        // revision, which was written from one particular version, is pinned.
        expect: revising ? { generation, version } : { generation }
      });
      if (!accepted) {
        return { ok: false, error: staleWhy("the canvas did not accept the code"), code, raw: result2.text };
      }
      return {
        ok: true,
        code,
        revised: revising,
        genre: planned.genre,
        filled,
        changed,
        unfilled: ids.filter((x) => !merged.regions[x]),
        raw: result2.text
      };
    }
    async function read(args) {
      if (!config.vision) return { ok: false, transcripts: [], error: `${name} cannot see images` };
      const state = session.getState();
      const generation = state.generation;
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
      if (args.hold !== false) {
        session.propose({
          participantId: id,
          nodeId: args.nodeId,
          edges: [],
          reps: transcripts.map((t) => ({ modality: "transcript", data: { text: t.text }, confidence: t.confidence })),
          at: args.at,
          expect: { generation }
        });
        const stale = session.getState().staleResult;
        if (stale) return { ok: false, transcripts, error: stale.detail, raw: result2.text };
      }
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
    async function program(args) {
      const prompt2 = args.prompt.trim();
      if (!prompt2) return { ok: false, error: "no prompt" };
      const state = session.getState();
      const generation = state.generation;
      const artifact = state.nodes.get(args.artifactId);
      if (!artifact) return { ok: false, error: "no such artifact" };
      const frame = frameOf(artifact);
      if (!frame) return { ok: false, error: "artifact has no frame" };
      const members = artifact.edges.filter((e) => e.rel === "has-part").map((e) => e.to).filter((m) => state.nodes.has(m));
      const drawing = members.length ? describeReading(session.read(members), { noun: "mark" }) : "nothing but the frame";
      const library = (args.library ?? []).map((l) => `  - ${l.name}`).join("\n");
      const result2 = await send(
        config,
        [
          { role: "system", content: PROGRAM_PROMPT },
          { role: "user", content: `THE FRAME: ${Math.round(frame.w)}\xD7${Math.round(frame.h)} pixels.

THE DRAWING inside it:
${drawing}

THE LIBRARY holds:
${library || "  (nothing yet)"}

The human typed: ${prompt2}` }
        ],
        { signal: args.signal }
      );
      if (!result2.ok) return { ok: false, error: result2.error };
      const parsed = parseProgram(result2.text);
      if (!parsed) return { ok: false, error: "no program in the reply", raw: result2.text };
      if (parsed.reuse) return { ok: true, reuse: parsed.reuse, raw: result2.text };
      const accepted = session.attachCode({ participantId: id, nodeId: args.artifactId, code: parsed.code, kind: "run", prompt: prompt2, at: args.at, expect: { generation } });
      if (!accepted) return { ok: false, error: staleWhy("the canvas did not accept the program"), raw: result2.text };
      return { ok: true, name: parsed.name, parts: parsed.parts, code: parsed.code, raw: result2.text };
    }
    async function behave(args) {
      const words = args.words.trim();
      if (!words) return { ok: false, behaviour: null, via: "none", unread: [], error: "no words" };
      const state = session.getState();
      if (!state.artifacts.includes(args.nodeId)) return { ok: false, behaviour: null, via: "none", unread: [], error: "not a definition" };
      const local = parseBehaviour(words);
      if (local.unparsed.length === 0 && local.behaviour) {
        session.behave({ nodeId: args.nodeId, behaviour: local.behaviour, participantId: id, at: args.at });
        return { ok: true, behaviour: local.behaviour, via: "table", unread: [] };
      }
      const names = state.artifacts.map((a) => state.nodes.get(a)).map((n2) => n2 ? getRep(n2, "word")?.data : void 0).filter((w2) => !!w2);
      const result2 = await send(
        config,
        [
          { role: "system", content: BEHAVE_PROMPT },
          { role: "user", content: `Things on the canvas are named: ${names.length ? names.join(", ") : "(nothing named yet)"}.

The human wrote: \u201C${words}\u201D` + (local.terms.length ? `

The canvas already read: ${describeBehaviour({ terms: local.terms })}. Read the rest: ${local.unparsed.map((u) => `\u201C${u}\u201D`).join(", ")}.` : "") }
        ],
        { signal: args.signal }
      );
      if (!result2.ok) {
        if (local.behaviour) session.behave({ nodeId: args.nodeId, behaviour: local.behaviour, participantId: id, at: args.at });
        return { ok: !!local.behaviour, behaviour: local.behaviour, via: local.behaviour ? "table" : "none", unread: local.unparsed, error: result2.error };
      }
      const reply = parseBehaviourReply(result2.text);
      const seen = new Set(local.terms.map((t) => `${t.verb}:${t.target ?? ""}`));
      const terms = [...local.terms, ...reply.terms.filter((t) => !seen.has(`${t.verb}:${t.target ?? ""}`))];
      if (terms.length === 0) return { ok: false, behaviour: null, via: "none", unread: reply.unread.length ? reply.unread : local.unparsed, error: "nothing in the reply maps onto a verb", raw: result2.text };
      const behaviour = { terms, source: "model" };
      session.behave({ nodeId: args.nodeId, behaviour, participantId: id, at: args.at });
      return { ok: true, behaviour, via: "model", unread: reply.unread, raw: result2.text };
    }
    return { id, name, config, interpret, ask, generate, read, draw, behave, program };
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
        system: textOf3(messages.find((m) => m.role === "system")?.content ?? ""),
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
      tier: options.tier ?? 2,
      locality: options.locality ?? "hosted"
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

  // src/participants/decide.ts
  var NO_MATCH = "no-match";
  var FLAT_MARGIN = 0.05;
  function choice(id, ask, candidates, about) {
    const has2 = candidates.some((c) => c.id === NO_MATCH);
    return {
      kind: "choice",
      id,
      ask,
      about,
      candidates: has2 ? candidates : [...candidates, { id: NO_MATCH, text: "none of these" }]
    };
  }
  function score(id, ask, levels, about) {
    return { kind: "score", id, ask, levels, about };
  }
  function noul(id, statement, about) {
    return { kind: "noul", id, ask: statement, statement, about };
  }
  var p2 = (p) => p.toFixed(2);
  function ranked(answer) {
    if (answer.kind === "noul") {
      return [
        { of: "yes", p: answer.yes },
        { of: "no", p: 1 - answer.yes }
      ];
    }
    return [...answer.distribution].sort((a, b) => b.p - a.p);
  }
  function isFlat(answer, margin = FLAT_MARGIN) {
    if (answer.kind === "noul") {
      const d = Math.abs(answer.yes - 0.5);
      return {
        flat: d < margin,
        why: `yes ${p2(answer.yes)} \u2014 ${p2(d)} from an even chance`
      };
    }
    const order = ranked(answer);
    if (order.length === 0) return { flat: true, why: "no distribution came back" };
    if (order.length === 1) return { flat: false, why: `only one outcome: ${order[0].of} ${p2(order[0].p)}` };
    const lead = order[0].p - order[1].p;
    return {
      flat: lead < margin,
      why: `${order[0].of} ${p2(order[0].p)} leads ${order[1].of} ${p2(order[1].p)} by ${p2(lead)}`
    };
  }
  function reasonOf(question, answer) {
    const dist3 = ranked(answer).map((d) => `${d.of} ${p2(d.p)}`).join(" \xB7 ");
    if (answer.kind === "noul") return `asked \u201C${question.ask}\u201D \u2014 ${dist3}`;
    if (answer.kind === "score") {
      const levels = answer.levels.join(" < ");
      return `asked \u201C${question.ask}\u201D (score over ${levels}) \u2014 ${dist3}; expectation ${answer.expectation.toFixed(2)}, confidence ${p2(answer.confidence)}`;
    }
    const offered = question.candidates.map((c) => c.id).join(", ");
    return `asked \u201C${question.ask}\u201D (choice among ${offered}) \u2014 ${dist3}; confidence ${p2(answer.confidence)}`;
  }
  function levelOf(answer) {
    const i = Math.max(0, Math.min(answer.levels.length - 1, Math.round(answer.expectation)));
    return answer.levels[i] ?? "";
  }
  function leadOf(answer) {
    return ranked(answer)[0]?.p ?? 0;
  }
  function createDecideParticipant(session, transport, at = 0, options = {}) {
    const name = options.name ?? "decide";
    const tier = options.tier ?? 1.5;
    const margin = options.flatMargin ?? FLAT_MARGIN;
    const id = session.join("agent", name, at, tier, options.locality ?? "local");
    async function ask(questions, now, signal) {
      const snapshot = session.getState().generation;
      const started = Date.now();
      let result2;
      try {
        result2 = await transport(questions, { signal });
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
          rows: [],
          unanswered: questions.map((q) => q.id),
          snapshot,
          ms: Date.now() - started
        };
      }
      const ms = Date.now() - started;
      if (!result2.ok) {
        return { ok: false, error: result2.error, rows: [], unanswered: questions.map((q) => q.id), snapshot, ms };
      }
      const byId = new Map(result2.answers.map((a) => [a.questionId, a]));
      const rows = [];
      const unanswered = [];
      for (const q of questions) {
        const answer = byId.get(q.id);
        if (!answer) {
          unanswered.push(q.id);
          continue;
        }
        if (answer.kind !== q.kind) {
          unanswered.push(q.id);
          continue;
        }
        const { flat, why } = isFlat(answer, margin);
        rows.push({ question: q, answer, flat, flatWhy: why, reason: reasonOf(q, answer), held: false });
      }
      const state = session.getState();
      if (state.generation !== snapshot) {
        return {
          ok: true,
          rows,
          unanswered,
          snapshot,
          ms,
          via: result2.via,
          refused: `the board was replaced while the seat was answering (generation ${snapshot} \u2192 ${state.generation})`
        };
      }
      for (const row of rows) {
        if (row.flat) continue;
        const targets = (row.question.about ?? []).filter((n2) => state.nodes.has(n2));
        if (!targets.length) continue;
        const edges = [];
        if (row.answer.kind === "choice" && row.answer.pick && row.answer.pick !== NO_MATCH) {
          edges.push({
            to: `type:${row.answer.pick.toLowerCase().replace(/\s+/g, "-")}`,
            rel: "resembles",
            weight: leadOf(row.answer),
            reasoning: row.reason
          });
        }
        const rep = {
          modality: "decision",
          data: { question: row.question, answer: row.answer, snapshot },
          confidence: leadOf(row.answer),
          reasoning: row.reason
        };
        session.propose({
          participantId: id,
          nodeId: targets[0],
          edges,
          reps: [rep],
          at: now,
          expect: { generation: snapshot }
        });
        const stale = session.getState().staleResult;
        row.held = !stale;
        if (stale) {
          return { ok: true, rows, unanswered, snapshot, ms, via: result2.via, refused: stale.detail };
        }
      }
      return { ok: true, rows, unanswered, snapshot, ms, via: result2.via };
    }
    return { id, name, tier, ask };
  }
  var even = (outcomes) => outcomes.map((of) => ({ of, p: outcomes.length ? 1 / outcomes.length : 0 }));
  function spread(outcomes, lead, p) {
    const rest = outcomes.filter((o) => o !== lead);
    const each = rest.length ? Math.max(0, 1 - p) / rest.length : 0;
    return outcomes.map((of) => ({ of, p: of === lead ? p : each }));
  }
  var expectationOf = (levels, dist3) => dist3.reduce((n2, d) => n2 + levels.indexOf(d.of) * d.p, 0);
  function createStubDecideTransport(book, options = {}) {
    const unscripted = options.unscripted ?? "flat";
    return async (questions) => {
      const answers = [];
      for (const q of questions) {
        const told = book[q.id];
        if (!told && unscripted === "unanswered") continue;
        const entry = told ?? { flat: true };
        if (q.kind === "noul") {
          const yes = "yes" in entry ? entry.yes : 0.5;
          answers.push({ kind: "noul", questionId: q.id, yes });
          continue;
        }
        if (q.kind === "score") {
          const dist4 = "level" in entry ? spread(q.levels, entry.level, entry.p) : even(q.levels);
          answers.push({
            kind: "score",
            questionId: q.id,
            levels: q.levels,
            distribution: dist4,
            expectation: expectationOf(q.levels, dist4),
            confidence: "confidence" in entry && entry.confidence !== void 0 ? entry.confidence : "level" in entry ? entry.p : 0
          });
          continue;
        }
        const ids = q.candidates.map((c) => c.id);
        const dist3 = "pick" in entry && ids.includes(entry.pick) ? spread(ids, entry.pick, entry.p) : even(ids);
        const order = [...dist3].sort((a, b) => b.p - a.p);
        const lead = order.length > 1 && order[0].p - order[1].p < FLAT_MARGIN ? null : order[0]?.of ?? null;
        answers.push({
          kind: "choice",
          questionId: q.id,
          pick: lead,
          distribution: dist3,
          confidence: "confidence" in entry && entry.confidence !== void 0 ? entry.confidence : "pick" in entry ? entry.p : 0
        });
      }
      return { ok: true, answers, via: options.via ?? "stub" };
    };
  }

  // src/participants/router.ts
  var SETTLED_BY_TIER1 = {
    read: true,
    arrange: true,
    answer: false,
    build: false,
    name: false
  };
  function instantFor(ability) {
    const id = ability === "read" ? "concepts" : ability === "arrange" ? "tidy" : ability === "build" ? "structure" : ability === "name" ? "signature" : null;
    return id ? TIER1_LIBRARY.find((m) => m.id === id) : void 0;
  }
  var SETTLED_CONFIDENCE = 0.6;
  function route(ability, state, options = {}) {
    const top = options.concepts?.[0];
    const settledLocally = SETTLED_BY_TIER1[ability] && !!top && top.confidence >= SETTLED_CONFIDENCE;
    const ids = options.participantIds ?? state.participants;
    const candidates = [];
    for (const pid of ids) {
      const node = state.nodes.get(pid);
      if (!node) continue;
      const kind = node.reps.find((r) => r.modality === "participant")?.data?.kind;
      if (kind !== "agent") continue;
      const tier = node.capability ?? 0;
      const locality = localityOf(node);
      candidates.push({
        participantId: pid,
        name: wordOf(node) ?? pid,
        tier,
        // Local before hosted: on a machine you own, latency is the only price,
        // and it is one you have already paid for. Locality is a cost, not a tier.
        cost: locality === "local" ? 1 : 2,
        why: locality === "local" ? "runs on this machine" : "hosted",
        ...locality ? { locality } : {}
      });
    }
    candidates.sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
    const instant = instantFor(ability);
    return {
      ability,
      settledLocally,
      localAnswer: settledLocally ? `${top.concept} (${top.confidence.toFixed(2)}) \u2014 ${top.reasoning}` : void 0,
      candidates,
      ...instant ? { instant } : {}
    };
  }
  function describeRoute(r) {
    if (r.settledLocally) return `The canvas has this (tier 1): ${r.localAnswer}`;
    if (r.candidates.length === 0) {
      return r.instant ? `Tier 1 can ${r.instant.does.split(" \u2014 ")[0]}; nothing here can ${r.ability} beyond that \u2014 add a model, or bridge one in.` : `Nothing here can ${r.ability} \u2014 add a model, or bridge one in.`;
    }
    return `${r.ability}: ${r.candidates.map((c) => `${c.name} (tier ${c.tier}${c.locality ? ", " + c.locality : ""})`).join(", ")}`;
  }
  return __toCommonJS(index_exports);
})();

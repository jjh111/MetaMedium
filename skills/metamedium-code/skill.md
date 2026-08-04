<metamedium-code>

# MetaMedium Code Patterns Skill

This skill documents reusable code patterns extracted from MetaMedium development sessions. Use these patterns when building recognition systems, gesture-based interfaces, or composable drawing applications.

> **Provenance — the one intentional mirror.** Every other document in this
> repo cites `metamedium-core/src/*.ts` instead of restating thresholds,
> because ten copies drifted. This skill keeps real code inline on purpose:
> Claude Code loads it standalone, without the repo. That makes it the one file
> that can silently go stale.
>
> **Verified against the engine: August 2026.** Re-verify when recognition
> changes — `metamedium-core/src/recognition.ts` and `src/geometry.ts` win any
> disagreement.

---

## Core Type Patterns

### Geometric Primitives

```typescript
interface Point { x: number; y: number; }

interface Bounds {
  minX: number; maxX: number;
  minY: number; maxY: number;
}

interface Fingerprint {
  aspectRatio: number;      // width / height
  straightness: number;     // 0-1, direct/path ratio
  isClosed: boolean;        // start ≈ end
  closureDistance: number;  // px between start/end
  bounds: Bounds;
  size: number;             // max(width, height)
  corners: number;          // detected corner count
  cornerAngles?: number[];  // angles in radians
  cornerData?: CornerInfo[];
  tipPoint?: Point;         // sharpest corner (triangles)
  angleAnalysis: AngleAnalysis;
  pointCount: number;
}
```

**Key Insight**: The fingerprint is the recognition primitive. All matching flows through fingerprint comparison.

### Recognition Result

```typescript
interface RecognitionResult {
  type: string;           // shape key
  label: string;          // display name
  score: number;          // 0-100
  confidence: number;     // 0-1
  isUserPrimitive?: boolean;
  isComposition?: boolean;
  componentCount?: number;
  matchDetails?: any;
}
```

---

## Geometry Utilities

### Bounds Calculation

```typescript
function getBounds(points: Point[]): Bounds {
  if (points.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  points.forEach(point => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  });

  return { minX, maxX, minY, maxY };
}
```

### Straightness (Line Detection Core)

```typescript
function calculateStraightness(points: Point[]): number {
  if (points.length < 2) return 0;

  const start = points[0];
  const end = points[points.length - 1];
  const directDistance = Math.sqrt(
    (end.x - start.x) ** 2 + (end.y - start.y) ** 2
  );

  let pathLength = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    pathLength += Math.sqrt(dx * dx + dy * dy);
  }

  return pathLength === 0 ? 0 : directDistance / pathLength;
}
```

**Interpretation**:
- `> 0.75`: Line territory
- `0.5-0.75`: Rectangle edges
- `< 0.4`: Curved (circles)

### Size-Relative Closure

```typescript
function isStrokeClosed(points: Point[], threshold = 50): boolean {
  if (points.length < 5) return false;

  const start = points[0];
  const end = points[points.length - 1];
  const distance = Math.sqrt(
    (end.x - start.x) ** 2 + (end.y - start.y) ** 2
  );

  // Direct closure check
  if (distance < threshold) return true;

  // Size-relative closure (allows larger gaps on larger shapes)
  const bounds = getBounds(points);
  const size = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  const relativeGap = size > 0 ? distance / size : 1;

  return relativeGap < 0.20; // Allow 20% gap
}
```

**Key Insight**: Size-relative thresholds scale naturally with drawing size.

---

## Shape Detection Patterns

### Boolean Check Pattern

Each detector returns null (no match) or a result. No complex scoring - just pass/fail checks.

```typescript
function detectLine(fp: Fingerprint, points: Point[]): RecognitionResult | null {
  const checks = {
    isStraight: fp.straightness > 0.65,
    notClosed: !fp.isClosed && !checkOvershoot(points),
    fewCorners: fp.corners <= 2
  };

  if (checks.isStraight && checks.notClosed && checks.fewCorners) {
    return { type: 'line', label: 'Line', score: 90, confidence: 0.9 };
  }
  return null;
}

function detectCircle(fp: Fingerprint, points: Point[]): RecognitionResult | null {
  const checks = {
    isClosed: fp.isClosed || checkOvershoot(points),
    fewCorners: fp.corners <= 1,
    notStraight: fp.straightness < 0.5,
    reasonableRatio: fp.aspectRatio >= 0.3 && fp.aspectRatio <= 3.0
  };

  if (checks.isClosed && checks.fewCorners && checks.notStraight && checks.reasonableRatio) {
    return { type: 'circle', label: 'Circle', score: 80, confidence: 0.8 };
  }
  return null;
}
```

### Main Analysis Function

```typescript
function analyzeStroke(points: Point[]): { fingerprint: Fingerprint; results: RecognitionResult[] } {
  const fingerprint = getFingerprint(points);
  const results: RecognitionResult[] = [];

  // Run all detectors
  const line = detectLine(fingerprint, points);
  if (line) results.push(line);

  const circle = detectCircle(fingerprint, points);
  if (circle) results.push(circle);

  // ... other detectors

  // Sort by confidence
  results.sort((a, b) => b.score - a.score);

  return { fingerprint, results };
}
```

---

## Corner Detection (Convex Hull)

### Graham Scan Convex Hull

```typescript
function convexHull(points: Point[]): Point[] {
  if (points.length < 3) return points;

  // Find bottom-most point
  let start = points[0];
  for (const p of points) {
    if (p.y < start.y || (p.y === start.y && p.x < start.x)) {
      start = p;
    }
  }

  // Sort by polar angle
  const sorted = points
    .filter(p => p !== start)
    .sort((a, b) => {
      const angleA = Math.atan2(a.y - start.y, a.x - start.x);
      const angleB = Math.atan2(b.y - start.y, b.x - start.x);
      return angleA - angleB;
    });

  // Build hull with ccw test
  const hull = [start, sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    while (hull.length > 1 && !ccw(hull[hull.length - 2], hull[hull.length - 1], sorted[i])) {
      hull.pop();
    }
    hull.push(sorted[i]);
  }

  return hull;
}

function ccw(p1: Point, p2: Point, p3: Point): boolean {
  return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x) > 0;
}
```

### Corner Clustering

```typescript
function countCorners(points: Point[], angleThreshold = Math.PI / 3) {
  if (points.length < 15) return { count: 0, angles: [], cornerData: [] };

  const windowSize = 8;
  const cornerPositions: { index: number; angle: number }[] = [];

  // Sample every 4 points
  for (let i = windowSize; i < points.length - windowSize; i += 4) {
    const before = {
      x: points[i].x - points[i - windowSize].x,
      y: points[i].y - points[i - windowSize].y
    };
    const after = {
      x: points[i + windowSize].x - points[i].x,
      y: points[i + windowSize].y - points[i].y
    };

    const dot = before.x * after.x + before.y * after.y;
    const mag = Math.sqrt(before.x ** 2 + before.y ** 2) *
                Math.sqrt(after.x ** 2 + after.y ** 2);

    const angle = Math.acos(Math.max(-1, Math.min(1, dot / mag)));

    if (angle > angleThreshold) {
      cornerPositions.push({ index: i, angle });
    }
  }

  // Cluster corners within 20 points
  const clustered = [cornerPositions[0]];
  for (let i = 1; i < cornerPositions.length; i++) {
    const last = clustered[clustered.length - 1];
    if (cornerPositions[i].index - last.index > 20) {
      clustered.push(cornerPositions[i]);
    } else if (cornerPositions[i].angle > last.angle) {
      clustered[clustered.length - 1] = cornerPositions[i];
    }
  }

  return { count: clustered.length, angles: clustered.map(c => c.angle) };
}
```

---

## Spatial Relationship Patterns

### Spatial Graph

```typescript
interface SpatialGraph {
  connections: Array<{
    a: number;
    b: number;
    relationship: 'touching' | 'intersecting';
    distance: number;
  }>;
  containment: Array<{ outer: number; inner: number }>;
}

function buildSpatialGraph(components: Component[]): SpatialGraph {
  const connections = [];
  const containment = [];

  for (let i = 0; i < components.length; i++) {
    for (let j = i + 1; j < components.length; j++) {
      const a = components[i];
      const b = components[j];

      // Check containment
      if (boundsContain(a.bounds, b.bounds)) {
        containment.push({ outer: i, inner: j });
        continue;
      }

      // Check overlap
      if (boundsOverlap(a.bounds, b.bounds)) {
        connections.push({ a: i, b: j, relationship: 'intersecting', distance: 0 });
        continue;
      }

      // Check proximity
      const distance = boundingBoxDistance(a.bounds, b.bounds);
      if (distance < 50) {
        connections.push({ a: i, b: j, relationship: 'touching', distance });
      }
    }
  }

  return { connections, containment };
}
```

### Spatial Clustering

```typescript
function spatialCluster(components: Component[], threshold: number): Component[][] {
  const clusters: Component[][] = [];
  const assigned = new Set<number>();

  components.forEach((comp, idx) => {
    if (assigned.has(idx)) return;

    const cluster = [comp];
    assigned.add(idx);

    // Iteratively add nearby components
    let changed = true;
    while (changed) {
      changed = false;
      components.forEach((other, otherIdx) => {
        if (assigned.has(otherIdx)) return;

        for (const member of cluster) {
          if (boundingBoxDistance(member.bounds, other.bounds) < threshold) {
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
```

---

## Library Matching Pattern

### Fingerprint Comparison

```typescript
function matchPrimitiveFromLibrary(fp: Fingerprint, libFp: Fingerprint): number {
  let totalScore = 0;

  // Straightness (veto if too different)
  const straightDiff = Math.abs(fp.straightness - libFp.straightness);
  if (straightDiff > 0.5) return 0;
  totalScore += (1 - straightDiff) * 0.3;

  // Aspect ratio
  const ar1 = Math.min(fp.aspectRatio, 1 / fp.aspectRatio);
  const ar2 = Math.min(libFp.aspectRatio, 1 / libFp.aspectRatio);
  totalScore += Math.max(0, 1 - Math.abs(ar1 - ar2) * 2) * 0.25;

  // Corner count
  const cornerDiff = Math.abs(fp.corners - libFp.corners);
  totalScore += Math.max(0, 1 - cornerDiff / 4) * 0.2;

  // Closure match
  totalScore += (fp.isClosed === libFp.isClosed ? 1 : 0) * 0.15;

  // Size similarity
  const sizeDiff = Math.abs(fp.size - libFp.size) / Math.max(fp.size, libFp.size);
  totalScore += Math.max(0, 1 - sizeDiff) * 0.1;

  return totalScore;
}
```

---

## Tiered Interpretation Pattern

### Orchestrator with Escalation

```typescript
interface LLMSettings {
  tier1ApiKey: string | null;
  tier2ApiKey: string | null;
  preferredTier: 0 | 1 | 2;
  autoEscalate: boolean;
  autoEscalateThreshold: number;
}

async function interpret(context: InterpretationContext): Promise<InterpretationResult> {
  const startTier = settings.preferredTier;
  let result = await interpretAtTier(context, startTier);

  // Auto-escalate if confidence is low
  if (settings.autoEscalate &&
      result.candidates[0]?.confidence < settings.autoEscalateThreshold) {
    const nextTier = getNextTier(result.tier);
    if (nextTier !== null) {
      result = await interpretAtTier(context, nextTier);
    }
  }

  return result;
}

async function interpretAtTier(context: Context, tier: number): Promise<Result> {
  // Fall back gracefully: 2 -> 1 -> 0
  if (tier >= 2 && tier2Available) return tier2.interpret(context);
  if (tier >= 1 && tier1Available) return tier1.interpret(context);
  return heuristic.interpret(context);
}
```

---

## Zustand Store Pattern

### State + Actions

```typescript
interface Store {
  // State
  strokes: Point[][];
  context: string[];        // maps 1:1 with strokes
  suggestions: RecognitionResult[];
  library: Library;

  // Actions
  startStroke: (point: Point) => void;
  addPoint: (point: Point) => void;
  endStroke: () => void;
  acceptSuggestion: (suggestion: RecognitionResult) => void;
}

const useStore = create<Store>((set, get) => ({
  strokes: [],
  context: [],
  suggestions: [],
  library: initialLibrary,

  endStroke: () => {
    const state = get();
    const processedStroke = [...state.currentStroke];

    // Analyze
    const analysis = analyzeStroke(processedStroke);

    // Update state atomically
    set({
      strokes: [...state.strokes, processedStroke],
      context: [...state.context, ''],
      suggestions: analysis.results,
      currentStroke: [],
      isDrawing: false,
    });
  },

  acceptSuggestion: (suggestion) => {
    const state = get();
    const idx = state.selectedStrokeIndex;

    const newContext = [...state.context];
    newContext[idx] = suggestion.type;

    set({
      context: newContext,
      selectedStrokeIndex: null,
      suggestions: [],
    });
  },
}));
```

---

## Selection Gesture Pattern

### Circle + Checkmark Detection

```typescript
function detectSelectionGesture(stroke: Point[], shapes: Shape[]) {
  if (shapes.length === 0 || stroke.length < 20) {
    return { isSelection: false };
  }

  // Split: 75% circular, 25% tail
  const split = Math.floor(stroke.length * 0.75);
  const circularPart = stroke.slice(0, split);
  const tailPart = stroke.slice(split);

  // Circular part should be closed-ish and curved
  const circularClosed = isApproximatelyClosed(circularPart);
  const circularCurved = calculateStraightness(circularPart) < 0.5;

  // Tail should be relatively straight (the checkmark)
  const tailStraight = calculateStraightness(tailPart) > 0.3;
  const hasTail = tailPart.length > 5;

  if (!circularCurved || !tailStraight || !hasTail) {
    return { isSelection: false };
  }

  // Find enclosed shapes
  const enclosedIndices = findEnclosedShapes(circularPart, shapes);

  return {
    isSelection: enclosedIndices.length > 0,
    enclosedIndices,
  };
}
```

---

## Summary

These patterns form the foundation of MetaMedium's recognition system:

1. **Fingerprinting** - Extract numeric signatures from strokes
2. **Boolean Detection** - Simple pass/fail checks, no complex scoring
3. **Size-Relative Thresholds** - Scale naturally with drawing size
4. **Spatial Graphs** - Track relationships between shapes
5. **Tiered Escalation** - Start fast, escalate when uncertain
6. **Atomic State Updates** - Use Zustand for predictable state

The key insight: **Recognition should flow from geometric features, not pixel matching.**

</metamedium-code>

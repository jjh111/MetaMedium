<metamedium-code>

# MetaMedium Code Patterns Skill

This skill documents reusable code patterns from the MetaMedium engine. Use
these patterns when building recognition systems, gesture-based interfaces, or
composable drawing applications.

> **Provenance — the one intentional mirror.** Every other document in this
> repo cites `metamedium-core/src/*.ts` instead of restating thresholds,
> because ten copies drifted. This skill keeps real code inline on purpose:
> Claude Code loads it standalone, without the repo. That makes it the one file
> that can silently go stale.
>
> **Verified against the engine: September 2026.** Every code block below is
> the engine's own code, copied as shipped (a few are abridged, and say so).
> Re-verify when recognition changes — `metamedium-core/src/geometry.ts`,
> `src/recognition.ts` and `src/session/clean.ts` win any disagreement, and
> the numbers live only there and in the tests beside them
> (`geometry.test.ts`, `recognition.test.ts`, `recognition.bench.test.ts`,
> `clean.bench.test.ts`, `commandmark.bench.test.ts`).

---

## Core Type Patterns

> `metamedium-core/src/types.ts`

### Geometric Primitives

```typescript
interface Point {
  x: number;
  y: number;
  t?: number; // timestamp, when the surface provides it
}

interface Bounds {
  minX: number; maxX: number;
  minY: number; maxY: number;
}

interface Fingerprint {
  aspectRatio: number;      // width / height
  straightness: number;     // 0-1, direct/path ratio (measured on a denoised path)
  isClosed: boolean;        // start ≈ end, size-relative
  /**
   * Fraction of its own bounding box the outline encloses, 0–1.
   * Rectangle ~1.0, circle ~0.79, triangle ~0.5. Robust where corner count is
   * fragile, which is what keeps a box from reading as a triangle.
   */
  extent: number;
  closureDistance: number;  // world units between start and end
  bounds: Bounds;
  size: number;             // max(width, height)
  corners: number;          // detected corner count
  cornerAngles?: number[];  // radians
  /** `t` is the corner's position along the path, 0–1 — arc length, not index. */
  cornerData?: { index: number; angle: number; x: number; y: number; t: number }[];
  /** First and last point — where the stroke began and ended, direction included. */
  start: Point;
  end: Point;
  tipPoint?: Point;         // sharpest corner (triangles)
  angleAnalysis: AngleAnalysis;
  pointCount: number;
}
```

**Key Insight**: The fingerprint is the recognition primitive. All matching
flows through fingerprint comparison. `extent` is the strongest single
discriminator between closed shapes; corner count is the most fragile.

### Recognition Result

```typescript
interface RecognitionResult {
  type: string;           // shape key
  label: string;          // display name
  score: number;          // 0-100
  confidence: number;     // 0-1
  reasoning: string;      // grounded "why" — part of the thesis, not decoration
  /**
   * What the detector measured beyond a label, when there is something. An
   * arrow carries its tip and tail: direction is a fact about the stroke, and
   * the diagram rung needs it as one.
   */
  meta?: Record<string, unknown>;
}

interface StrokeAnalysis {
  fingerprint: Fingerprint;
  results: RecognitionResult[];   // every qualifying reading, ranked by confidence
}
```

`reasoning` is required. It is what the "why" inspector surfaces, and a
reading without one is a verdict, not evidence.

---

## Geometry Utilities

> `metamedium-core/src/geometry.ts`

### Bounds Calculation

```typescript
function getBounds(points: Point[]): Bounds {
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
```

### Straightness — measured on a denoised, simplified path

Direct distance over path length, 1 = a ruler. The path length is measured on
a **denoised and simplified** copy of the stroke, and that detail is
load-bearing: raw path length counts every digitizer wobble, so it grows with
the device's report rate rather than with the shape. A genuinely straight line
with realistic ±1px sensor noise scored 0.99 on a slow device and 0.30 on a
fast one, and read as an arc.

```typescript
/**
 * Remove digitizer noise while leaving the drawn shape alone.
 *
 * The filter window is sized in ARC LENGTH (a fraction of the stroke's own
 * size), then converted to samples using the stroke's actual sample spacing. So
 * it removes the same physical wobble whether the device reported 60 or 240
 * times a second, and on a sparsely sampled stroke it does almost nothing.
 */
function denoise(points: Point[], windowFraction = 0.015): Point[] {
  if (points.length < 5) return points;
  const bounds = getBounds(points);
  const size = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  if (size <= 0) return points;

  let raw = 0;
  for (let i = 1; i < points.length; i++) raw += calculateDistance(points[i - 1], points[i]);
  const spacing = raw / Math.max(1, points.length - 1);
  if (spacing <= 0) return points;

  // meanFilter: in-place mean over ±halfWindow samples; endpoints never move.
  return meanFilter(points, Math.min(24, Math.round((size * windowFraction) / spacing)));
}

function calculateStraightness(points: Point[]): number {
  if (points.length < 2) return 0;

  const start = points[0];
  const end = points[points.length - 1];
  const directDistance = calculateDistance(start, end);

  const bounds = getBounds(points);
  const size = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  // simplifyStroke is Douglas–Peucker; the tolerance is relative to the
  // stroke's own size, so this stays scale-free.
  const path = simplifyStroke(denoise(points), Math.max(1.2, size * 0.012));

  let pathLength = 0;
  for (let i = 1; i < path.length; i++) {
    pathLength += calculateDistance(path[i - 1], path[i]);
  }

  if (pathLength === 0) return 0;
  return Math.min(1, directDistance / pathLength);
}
```

**Interpretation**: no detector reads straightness against a fixed cutoff.
Each one ramps it continuously into a score (see *Shape Detection* below), so
the bands that matter are the `ramp(...)` arguments in
`src/recognition.ts`, not a table here. Everything downstream that measures
*shape* rather than *position* starts from `denoise()`.

### Size-Relative Closure

A stroke closes if the start–end gap is under a fixed pixel threshold **or**
under a fraction of the stroke's own size. The fixed term is itself **bounded
by the stroke's size**, or it inverts the rule at the small end.

```typescript
function isStrokeClosed(points: Point[], threshold = 50): boolean {
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
  return relativeGap < 0.20;
}
```

**Key Insight**: Size-relative thresholds scale naturally with drawing size.
A fixed term that is *not* bounded by size does the opposite of what it says
for small strokes.

### Overshoot — the same size-relative guard

A circle drawn past its own start is closed even though `isStrokeClosed` says
open. The proximity threshold is size-relative for the same reason closure is:
a fixed one made every short stroke read as overshooting.

```typescript
function checkOvershoot(points: Point[], threshold = 50): boolean {
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
    if (distance < effectiveThreshold) return true;
  }

  return false;
}
```

### Extent — how much of its box the outline fills

The single most discriminating feature the engine was missing, and the reason
a rectangle and a triangle were indistinguishable: corner *count* is fragile
(one missed corner and a box becomes a triangle), but extent holds no matter
how the corners were counted, how fast it was drawn, or where it started.

```typescript
function shapeExtent(points: Point[]): number {
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
```

### Fixed pixel thresholds are about the HAND, not the world

On an infinite canvas the surface feeds world coordinates, which silently makes
every fixed-pixel rule zoom-dependent: the same check reads open at 1× and
closed at 1.7×. `getFingerprint` and `analyzeStroke` take `scale` — world
units per screen pixel, i.e. 1/zoom — and apply it to the two fixed terms
(closure, overshoot). The size-relative halves need no adjustment; they were
already scale-free. **Surfaces with a viewport must pass it**, and log it with
each stroke so replay is deterministic.

```typescript
// Abridged: tipPoint and angleAnalysis derivation omitted.
function getFingerprint(points: Point[], scale = 1): Fingerprint {
  const bounds = getBounds(points);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  // Closure is decided first, because corner detection needs to know whether to
  // wrap: a corner on the seam of a closed stroke is a real corner.
  const closed = isStrokeClosed(points, 50 * scale);
  const cornerData = countCorners(points, {}, closed);

  const start = points[0];
  const end = points[points.length - 1];
  const closureDistance = calculateDistance(start, end);

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
    tipPoint,          // the sharpest corner, when any
    angleAnalysis,     // analyzeCornerAngles(cornerData.angles)
    pointCount: points.length,
    start,
    end,
  };
}
```

---

## Corner Detection — along the path, not the point array

> `countCorners`, `resampleByArcLength`, `CornerOptions` in `src/geometry.ts`.
> The convex-hull helpers (`convexHull`, `findCorners`) are still exported for
> callers that want hull vertices, but they are **not** on the recognition
> path any more.

Two properties the previous implementation lacked, both of which showed up as
"a rectangle is a triangle":

1. **Scale and density independence.** The measuring arms and the suppression
   radius are fractions of the stroke's own length, so the same rectangle
   counts four corners whether it was drawn fast or slowly. The old version
   used a fixed 8-point arm and a fixed 20-index merge radius, and returned
   1, 2 or 3 corners for one rectangle depending only on drawing speed.
2. **The seam is scanned.** A closed stroke wraps, so a corner where the stroke
   starts and ends is found. Drawing a box from a corner — the natural way —
   used to lose that corner every time, which is why a rectangle could never
   score 4.

And one more, added when header bars came back with two corners: **both
windows are bounded by the stroke's short side** for closed strokes, so neither
can straddle a whole one on a thin box.

```typescript
interface CornerOptions {
  /** Turn angle in radians above which a sample counts as a corner. */
  threshold?: number;
  /** Length of each measuring arm, as a fraction of the whole path. */
  window?: number;
  /** Suppression radius around an accepted corner, as a fraction of the path. */
  separation?: number;
  /** How many uniform samples to reduce the stroke to before measuring. */
  samples?: number;
}

const DEFAULT_CORNER_OPTIONS: Required<CornerOptions> = {
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
 * Input points arrive at whatever rate the pointer fired, so any rule expressed
 * in POINT INDICES means a different physical distance every time. After
 * resampling, index distance IS arc length, and the rules mean what they say.
 */
function resampleByArcLength(points: Point[], n: number, closed = false): Point[] {
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
  for (let i = 0; i < n; i++) {
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

function countCorners(
  points: Point[],
  optionsOrThreshold: CornerOptions | number = {},
  closed?: boolean
): {
  count: number;
  angles: number[];
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
  // sides are a small fraction of it. A suppression window wider than a short
  // side ate one corner at each end, and a measuring arm longer than one turned
  // the MIDDLE of the side into the sharpest turn on the stroke. For a closed
  // stroke, bound both by the short side so neither can straddle a whole one.
  // Square-ish strokes are unaffected; open strokes keep the defaults, since a
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
```

**Key Insight**: express every rule in arc length, never in point indices.
After `resampleByArcLength`, index distance *is* arc length, and a fraction of
the path means the same physical thing at any speed, density, or zoom.

---

## Shape Detection Patterns

> `metamedium-core/src/recognition.ts`

### Evidence-Scored, Multi-Parse — not pass/fail

Every detector scores **continuously** from measurements, and results rank by
that score. The engine used to give each detector a fixed confidence
(triangle 0.85, rectangle 0.80) behind boolean checks with overlapping corner
bands, so a three-corner shape matched both and the triangle won because
85 > 80. A tie broken by a constant is not a ranking.

Two helpers turn a measurement into a score, and one gate turns a score into a
result:

```typescript
/** 1 when `value` sits on `ideal`, falling to 0 at `tolerance` away. */
function fit(value: number, ideal: number, tolerance: number): number {
  return Math.max(0, 1 - Math.abs(value - ideal) / tolerance);
}

/** 0 below `lo`, 1 above `hi`, linear between. */
function ramp(value: number, lo: number, hi: number): number {
  return Math.max(0, Math.min(1, (value - lo) / (hi - lo)));
}

/**
 * Below this a reading is not worth offering. Deliberately low: multi-parse
 * means several candidates coexist and the human decides, so this only
 * filters out noise, it does not pick a winner.
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
 * so nothing but `dot` is offered for it.
 */
export const HAND_RESOLUTION_PX = 8;
```

### Two detectors, as shipped

A detector has a hard gate (what it cannot be), then a weighted sum of fits,
then a `reasoning` string in the terms it measured. Note that the fixed
overshoot term is scaled by the hand's `scale`, and that `extent` carries the
most weight wherever a closed shape is being told from another.

```typescript
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
```

**The shape rung is closed: eight detectors.** The other six follow the same
pattern and live in `src/recognition.ts`:

| Detector | Gate | What it weighs |
|---|---|---|
| `detectArc` | open | curvature (inverse straightness), few corners |
| `detectTriangle` | closed, sane aspect | extent near a half box, three corners, mean turn near 120° |
| `detectRectangle` | closed, very generous aspect (a header bar is a rectangle) | extent near a full box, four corners, mean turn near 90° |
| `detectDot` | — | size *on screen* (`fp.size / scale`) |
| `detectText` | open, at least a few turns | many corners, sparse box, curvy, wide. Writing *without reading it*: enough to make a mark a `label` |
| `detectArrow` | open, 1–4 corners, none in the middle | a straight shaft, a sharp barb inside one end, a short head. Returns `meta: { head, tip, tail }` |

### Main Analysis Function

```typescript
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
```

**Key Insight**: a diamond is legitimately *triangle* and *rectangle* at once.
Return every qualifying reading, ranked; the caller decides. Nothing wins by
silencing the others.

---

## Clean Forms: the snap gate

> `metamedium-core/src/session/clean.ts` — `snapReading`, `idealize`,
> `session.snap()`, `session.snapCandidates()`.

The shape rung says "rectangle 0.86"; the canvas can draw that rectangle. A
snapped mark gains a `'clean'` rep beside its ink; **ink is never replaced**,
and undo drops the rep. The gate that decides whether a mark may be redrawn
reads the engine's own Tier 0 shape reading only — a model calling a box "a
card" is a claim about meaning, not geometry.

```typescript
/** The top Tier 0 reading must reach this to be offered for snapping. */
export const SNAP_CONFIDENCE = 0.7;
/** …and lead the next reading by this much, or the mark is ambiguous. */
export const SNAP_MARGIN = 0.12;

/** Shapes that have a clean form at all. Writing has none. */
export const SNAPPABLE = new Set(['rectangle', 'circle', 'triangle', 'line', 'arrow', 'arc', 'dot']);

interface SnapReading {
  shape: string;
  weight: number;
  ok: boolean;        // whether this mark qualifies to be redrawn
  reasoning: string;  // why it does or does not
}

export function snapReading(node: MMNode, nodes: ReadonlyMap<string, MMNode>): SnapReading {
  const tier0 = interpretationsOf(node, nodes).filter((r) => r.tier === 0 && r.to.startsWith('type:'));
  const top = tier0[0];
  if (!top) return { shape: 'art', weight: 0, ok: false, reasoning: 'no shape reading' };
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
      reasoning: `${shape} ${top.weight.toFixed(2)} and ${second.label} ${second.weight.toFixed(2)} are too close to call`,
    };
  }
  return {
    shape,
    weight: top.weight,
    ok: true,
    reasoning: second
      ? `${shape} ${top.weight.toFixed(2)}, well ahead of ${second.label} ${second.weight.toFixed(2)}`
      : `${shape} ${top.weight.toFixed(2)}, unopposed`,
  };
}
```

**Confident AND unambiguous.** A diamond that is triangle 0.61 / rectangle
0.58 is never redrawn as either: that would silently settle an argument the
engine deliberately holds open. `idealize(node, shape)` then builds the clean
form **from the ink's own measurements** — bounds, the three sharpest corners,
the arrow's tip and tail, the arc's bulge through its chord — never from a
template. Zero wrong snaps over the whole corpus is pinned in
`clean.bench.test.ts`.

---

## Relations — what the canvas can SEE between marks

> `metamedium-core/src/relate/relations.ts`. This replaced the old spatial
> graph (`spatial.ts`, with its fixed 50px "touching"), which is retired.

Two rules, both learned the hard way:

1. **Every threshold is a ratio, never a pixel count.** Fifty pixels means one
   thing on a drawing of postage stamps and another on a wall-sized board, and
   something different again at every zoom.
2. **Relations carry strength, not just existence.** A concept that needs three
   things in a row should be able to tell a crisp row from a rough one.

```typescript
type RelationKind =
  | 'contains' | 'inside'            // one encloses the other (stored both ways)
  | 'crossing'                       // the strokes actually cross
  | 'touching'                       // bounds overlap or abut, no enclosure
  | 'near'                           // close, relative to their own size
  | 'above' | 'below' | 'left-of' | 'right-of'
  | 'same-row' | 'same-column'       // centres on a common line
  | 'same-size';                     // comparable in size — peers

interface Relation {
  kind: RelationKind;
  from: string;
  to: string;
  strength: number;   // 0–1, measured
  reasoning: string;  // why, in the terms it was measured in
}

interface Mark {
  id: string;
  bounds: Bounds;
  points?: Point[];   // the stroke itself, when there is one — needed for real crossing tests
  closed?: boolean;
}

interface RelateConfig {
  /** Gap counts as `near` below this fraction of the smaller mark's size. */
  nearRatio: number;
  /** Centres count as aligned below this fraction of the smaller extent. */
  alignRatio: number;
  /** Perpendicular overlap needed before a direction is worth stating. */
  directionOverlap: number;
  /** Size ratio above which two marks read as peers. */
  peerRatio: number;
}

export const DEFAULT_RELATE_CONFIG: RelateConfig = {
  nearRatio: 0.6,
  alignRatio: 0.22,
  directionOverlap: 0.3,
  peerRatio: 0.62,
};

/** Every relation that holds between every pair of marks. Pairwise, O(n²). */
export function relate(marks: Mark[], config: RelateConfig = DEFAULT_RELATE_CONFIG): Relation[];

/**
 * Connected components over the ENGAGING relations (near, touching, crossing,
 * contains) — the grouping the canvas offers before anyone has said what a
 * group is. This is what lets a command mark act on "these" with no lasso.
 */
export function clusters(marks: Mark[], relations: Relation[]): string[][];
```

Inside `relate`, nearness is judged against the **smaller** mark: a dot two
hundred pixels from a large box is not near it, however small that gap looks
beside the box. Concepts (`row`, `column`, `frame`, `flow`, `grid`,
`labelled` in `src/concepts/concept.ts`) are predicates over these relations,
and alignment is a concept's *confidence*, not its gate.

---

## Library Matching Pattern

> `matchPrimitiveFromLibrary` in `src/recognition.ts`.

Weighted fingerprint comparison with a straightness veto.

```typescript
export function matchPrimitiveFromLibrary(
  fingerprint: Fingerprint,
  libraryFingerprint: Fingerprint
): number {
  let totalScore = 0;
  let weights = 0;

  // Straightness similarity (weight: 0.3), with veto
  const straightnessDiff = Math.abs(fingerprint.straightness - libraryFingerprint.straightness);
  if (straightnessDiff > 0.5) return 0;

  totalScore += Math.max(0, 1 - straightnessDiff) * 0.3;
  weights += 0.3;

  // Aspect ratio similarity (weight: 0.25) — orientation-free
  const aspectRatio1 = Math.min(fingerprint.aspectRatio, 1 / fingerprint.aspectRatio);
  const aspectRatio2 = Math.min(libraryFingerprint.aspectRatio, 1 / libraryFingerprint.aspectRatio);
  totalScore += Math.max(0, 1 - Math.abs(aspectRatio1 - aspectRatio2) * 2) * 0.25;
  weights += 0.25;

  // Corner count similarity (weight: 0.2)
  const cornerDiff = Math.abs(fingerprint.corners - libraryFingerprint.corners);
  totalScore += Math.max(0, 1 - cornerDiff / 4) * 0.2;
  weights += 0.2;

  // Closure similarity (weight: 0.15)
  totalScore += (fingerprint.isClosed === libraryFingerprint.isClosed ? 1.0 : 0.0) * 0.15;
  weights += 0.15;

  // Size similarity (weight: 0.1)
  const sizeDiff =
    Math.abs(fingerprint.size - libraryFingerprint.size) /
    Math.max(fingerprint.size, libraryFingerprint.size);
  totalScore += Math.max(0, 1 - sizeDiff) * 0.1;
  weights += 0.1;

  return totalScore / weights;
}
```

---

## Gestures: taught, and relational

> `src/session/commandmark.ts`, `src/session/gesture.ts`, `src/session/erase.ts`.
> This replaced the one-stroke "circle with a checkmark tail" gesture, which is
> retired: the lasso and the command mark are two strokes, and the mark is
> *learned*, not hard-coded.

### The command mark is a learned signature

The built-in check ✓ is not a special case in the code. `BUILTIN_COMMAND_MARK`
is a signature learned from canonical samples by `learnCommandMark`, exactly
the way a user's own mark is learned when they draw it five times. Every
feature is **scale-free** (a ratio, a count, or a position within the stroke's
own box), so a mark works at any size and any zoom; three of them are
oriented, which is what separates a check from an L, a V and a caret.

```typescript
/** How many samples the teach flow collects. */
export const COMMAND_MARK_SAMPLES = 5;

// straightness, corners, aspect, closureRatio,
// armRatio      — shorter arm over longer, split at the sharpest corner (a V is 1.0, a check ~0.6)
// turnSharpness — how sharp that corner turns, 0–1 of a half turn
// vertexDepth   — where the corner sits vertically in the box: 0 = top (caret), 1 = bottom (check)
// endRise       — how much higher the stroke ends than it began, as a fraction of its height
type Feature = 'straightness' | 'corners' | 'aspect' | 'closureRatio'
             | 'armRatio' | 'turnSharpness' | 'vertexDepth' | 'endRise';

interface CommandMark {
  name: string;
  features: Record<Feature, number>;    // mean of each feature across the samples
  tolerance: Record<Feature, number>;   // accept band: max(observed spread × multiplier, floor)
  isClosed: boolean;                    // a hard gate, not a scored feature
  sampleCount: number;
  consistency: number;                  // 0–1; low means five different things were drawn
}

interface CommandMatch {
  match: boolean;
  score: number;        // 0–1, 1 = dead centre of the learned band
  failedOn?: Feature;   // which feature pushed it outside the band
}

/** Throws on fewer than two samples — one sample gives no spread. */
export function learnCommandMark(samples: Point[][], name = 'command'): CommandMark;

/**
 * Every feature must be inside the band — one outlier rejects. Rejection
 * matters more than recognition here: a command mark that also fires while
 * you are drawing reads as broken, not as eager.
 */
export function matchesCommandMark(fp: Fingerprint, mark: CommandMark): CommandMatch {
  if (fp.isClosed !== mark.isClosed) {
    return { match: false, score: 0, failedOn: 'closureRatio' };
  }
  const f = commandMarkFeatures(fp);
  let worst = 0;
  let worstFeature: Feature = FEATURES[0];
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

/** Would this signature also fire on marks the user already draws? The teach flow refuses one that does. */
export function collidesWith(mark: CommandMark, existing: Fingerprint[]): boolean;
```

Tolerance floors (`TOLERANCE_FLOOR` in `commandmark.ts`) are the *designed*
generosity per feature; a learned spread only ever widens them. The
straightness floor is the widest and was measured across sixty hand-drawn
checks, not guessed. `commandmark.bench.test.ts` pins 100% acceptance of the
check corpus and **zero** false fires across the drawing corpus.

### Engagement is relative to the selection

```typescript
interface GestureConfig {
  /** How long after a lasso a command mark still refers to it. */
  checkWindowMs: number;
  /** The mark must cross, overlap, or come within this fraction of the LASSO's size. */
  checkProximityRatio: number;
  /** The mark must be smaller than this fraction of the lasso's size. */
  checkMaxSizeRatio: number;
  /** The user's taught mark. Null (the default) uses the built-in check. */
  commandMark?: CommandMark | null;
}

export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  checkWindowMs: 4000,
  checkProximityRatio: 0.15,
  checkMaxSizeRatio: 0.6,
  commandMark: null,
};
```

No fixed pixel term remains in the gesture grammar. A stroke is lasso-like
only in context: closed-ish **and** enclosing existing content (or a region of
a live artifact). And the mark reads *backwards*: it looks over the recent
window for what it crossed and what was drawn alongside, so a lasso is not a
mode you must enter first. `whyNotResolved` reports `too-late` / `too-big` /
`not-the-mark` / `not-engaged` so a miss is visible.

### Erasing is relational: count crossings

No speed, density or size constant to tune; zoom-invariant; degrades honestly
(a line drawn *through* a shape crosses twice and is safe). A **closed** stroke
is never a scratch, and scratch targets are ink, never artifacts.

```typescript
/** Crossings required before a stroke is read as scratching a mark out. */
export const DEFAULT_ERASE_CROSSINGS = 3;

interface ScratchTarget {
  id: string;
  points?: Point[];
  bounds?: Bounds;
  closed?: boolean;
}

/** Which of `targets` this stroke scratched out. Empty means ordinary ink — the common case. */
export function scratchedOut(
  points: Point[],
  targets: ScratchTarget[],
  minCrossings = DEFAULT_ERASE_CROSSINGS
): string[] {
  if (points.length < 3) return [];
  const hit: string[] = [];
  for (const t of targets) {
    // outlineOf: an open stroke is its own path; closed strokes and
    // bounds-only targets close back to the start, so a scratch through a box
    // crosses two walls rather than one.
    const outline = outlineOf(t);
    if (!outline) continue;
    if (countCrossings(points, outline, minCrossings) >= minCrossings) hit.push(t.id);
  }
  return hit;
}
```

---

## Participants and Tiers — routing, not escalation

> `src/participants/router.ts`, `src/llm/provider.ts`,
> `src/session/interpretations.ts`. The old "escalate only on low confidence"
> orchestrator is **withdrawn**: escalation means suppression, and
> disagreement between sources is exactly what the human wants to see.

- **Tier 0:** engine heuristics (always available, offline)
- **Tier 1:** local model — Ollama or LM Studio, OpenAI-compatible
- **Tier 2:** hosted model — OpenRouter or Anthropic, bring-your-own-key
- **Tier 3:** structural proposals — reserved

Tier is *derived from the provider*, never configured by hand, and carried on
the participant node:

```typescript
type Capability = 0 | 1 | 2 | 3;

/** localhost → 1, anything else → 2. */
export function providerTier(config: ProviderConfig): 1 | 2 {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(config.baseUrl) ? 1 : 2;
}
```

**Tier 0 answers first, and a model is asked only for what it cannot do.**
Routing returns *every* candidate, cheapest first — it is not a fallback chain,
because several participants answering at once is the point.

```typescript
type Ability = 'read' | 'answer' | 'build' | 'name' | 'arrange';

interface Candidate {
  participantId: string;
  name: string;
  tier: Capability;
  cost: number;   // lower is cheaper to ask: local before hosted, engine before either
  why: string;
}

interface Route {
  ability: Ability;
  /** True when the engine already has an answer good enough that asking anyone would be spending time to be told what it knows. */
  settledLocally: boolean;
  localAnswer?: string;     // shown instead of a spinner
  candidates: Candidate[];  // everyone who could answer, cheapest first. Empty is a normal outcome.
}

/** How confident a Tier 0 reading has to be before asking a model about it is wasted. */
export const SETTLED_CONFIDENCE = 0.6;

export function route(ability: Ability, state: SessionState, options?: { concepts?: ConceptMatch[]; participantIds?: string[] }): Route;
```

**The rules that make tiers safe:**

- Models receive structured geometry (fingerprints, relations, roles, the
  layout tree), **not screenshots**.
- Every tier *proposes*; no tier commits. A model's output is an unblessed,
  attributed edge the human blesses or ignores.
- **All tiers show at once.** Read with `interpretationsOf()` / `byTier()` /
  `bySource()` / `disagreement()`; `topInterpretation()` is a headline helper,
  not the truth.
- A model call never blocks drawing. Degrade to Tier 0; never gate on a tier.
- The transport is injectable, so a participant can be answered by hand
  (`createBridgeParticipant`) — same prompts, same parsing, same channel.

---

## Surface State (legacy: Web App Skeleton)

The canonical state model is the session engine (`createSession` in
`src/session/session.ts`): an event log over a node graph, where marks gain
reps (`'stroke'`, `'fingerprint'`, `'transform'`, `'clean'`, `'code'`) and
nothing is destroyed. The React surface in `Web App Skeleton/` predates it and
keeps its own Zustand store; the pattern is still a sound one for a surface,
so it stays here — **but the recognition it calls is a diverged copy** and
should not receive new logic.

```typescript
interface Store {
  strokes: Point[][];
  context: string[];        // maps 1:1 with strokes
  suggestions: RecognitionResult[];
  library: Library;

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

    // A surface with a viewport passes 1/zoom here (see "about the HAND").
    const analysis = analyzeStroke(processedStroke, state.scale ?? 1);

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

    set({ context: newContext, selectedStrokeIndex: null, suggestions: [] });
  },
}));
```

---

## Summary

These patterns form the foundation of MetaMedium's recognition system:

1. **Fingerprinting** — extract numeric signatures from strokes; `extent` is
   the strongest discriminator, corner count the most fragile
2. **Evidence-scored, multi-parse detection** — continuous fits, capped below
   certainty, every qualifying reading returned with its reasoning
3. **Size-relative thresholds, measured along the path** — a fraction of the
   stroke's own size or length, never a pixel count or a point index; fixed
   terms are bounded by size and scaled to the hand
4. **A snap gate that is confident AND unambiguous** — a redrawn form never
   settles an argument the engine holds open
5. **Relations as ratios with strength** — what the canvas can see, before
   anyone says what a group is
6. **Learned, relational gestures** — the command mark is a taught signature;
   erasing counts crossings
7. **Routing, not escalation** — Tier 0 first, every candidate returned, all
   tiers shown at once, nothing commits

The key insight: **Recognition should flow from geometric features, not pixel
matching — and every number in it should be a measurement the engine can
explain.**

</metamedium-code>

// Synthetic stroke generators for tests.
// These approximate hand-drawn input densely enough for corner detection
// (countCorners needs >= 15 points and samples with an 8-point window).

import type { Point } from '../types';

export function lineStroke(from: Point, to: Point, n = 60): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    points.push({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
  }
  return points;
}

export function circleStroke(cx: number, cy: number, r: number, n = 120): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    points.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return points;
}

// Open arc: three quarters of a circle, clearly curved and clearly not closed.
export function arcStroke(cx: number, cy: number, r: number, n = 90): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 1.5;
    points.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return points;
}

// Walks a closed polygon perimeter starting mid-edge, so every vertex is an
// interior point of the stroke and visible to corner detection.
function polygonStroke(vertices: Point[], pointsPerEdge: number): Point[] {
  const midFirst = {
    x: (vertices[0].x + vertices[1].x) / 2,
    y: (vertices[0].y + vertices[1].y) / 2,
  };
  const path: Point[] = [midFirst, ...vertices.slice(1), vertices[0], midFirst];
  const points: Point[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    points.push(...lineStroke(path[i], path[i + 1], pointsPerEdge).slice(i === 0 ? 0 : 1));
  }
  return points;
}

export function rectStroke(x: number, y: number, w: number, h: number, pointsPerEdge = 30): Point[] {
  return polygonStroke(
    [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ],
    pointsPerEdge
  );
}

export function triangleStroke(a: Point, b: Point, c: Point, pointsPerEdge = 40): Point[] {
  return polygonStroke([a, b, c], pointsPerEdge);
}

// A check mark: short down-right segment, then a longer up-right flick.
// Open, one sharp corner — the summon gesture from ARCHITECTURE-v6 §6.
export function checkStroke(x: number, y: number): Point[] {
  return [
    ...lineStroke({ x, y }, { x: x + 25, y: y + 35 }, 30),
    ...lineStroke({ x: x + 25, y: y + 35 }, { x: x + 70, y: y - 15 }, 30).slice(1),
  ];
}

// A scratch-out: horizontal back-and-forth passes across a band. Callers place
// it so it OVERSHOOTS the target's left and right edges, which is what a real
// scratch does and what makes each pass worth two crossings. Sparse on purpose —
// real hand scratches sample with 25–35px gaps, which is exactly what defeated
// the old ink-density heuristic (erase.ts).
export function scratchStroke(x: number, y: number, width: number, height: number, passes = 3): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < passes; i++) {
    const yi = y + (passes === 1 ? 0 : (height * i) / (passes - 1));
    const from = { x: i % 2 === 0 ? x : x + width, y: yi };
    const to = { x: i % 2 === 0 ? x + width : x, y: yi };
    if (i > 0) points.push({ x: from.x, y: points[points.length - 1].y });
    points.push(...lineStroke(from, to, 10).slice(i === 0 ? 0 : 1));
  }
  return points;
}

// A caret "^" — the stand-in for a taught command mark in tests. Open, two
// strokes' worth of turn, and unlike the check it is drawn symmetrically, so
// repeated samples with jitter give a realistic learned band.
export function caretStroke(x: number, y: number, w = 60, h = 40, jitter = 0): Point[] {
  const j = (k: number) => (jitter ? (Math.sin(k * 12.9898) * 43758.5453) % 1 * jitter : 0);
  return [
    ...lineStroke({ x, y: y + h }, { x: x + w / 2 + j(1), y: y + j(2) }, 30),
    ...lineStroke({ x: x + w / 2 + j(1), y: y + j(2) }, { x: x + w, y: y + h + j(3) }, 30).slice(1),
  ];
}

// ===== Hand-drawn stroke generators =====
//
// The synthetic generators above are geometrically perfect, which is exactly
// what let a broken corner detector look healthy for months: a perfect rect
// drawn from the middle of an edge happened to hit the one sampling density
// the thresholds were tuned against. These generators vary the things a real
// hand varies — where the stroke starts, how much it wobbles, how rounded the
// corners are, how densely it samples, and whether it quite closes — so a
// detector has to survive all of them rather than one lucky case.
//
// Deterministic: same seed, same stroke. Tests must not be flaky.

/** Tiny deterministic PRNG (mulberry32) — reproducible "hand wobble". */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface HandOptions {
  /** Wobble amplitude in px. 0 = a ruler; 3–5 = a normal hand. */
  jitter?: number;
  /** Points per unit length. Low = drawn fast, high = drawn slowly. */
  density?: number;
  /** Corner rounding as a fraction of the shorter adjoining edge (0–0.4). */
  round?: number;
  /** Where along the outline the stroke starts, 0–1. 0 = at a vertex. */
  startAt?: number;
  /** How far short of (or past) the start the stroke ends, in px. */
  closureGap?: number;
  /**
   * High-frequency digitizer noise in px, applied per SAMPLE. Distinct from
   * `jitter`, which is low-frequency tremor applied per position: a real device
   * has both, and only this one gets worse the faster the device reports.
   * ±0.5–1.5px is typical for a pen, more for a finger.
   */
  sensorNoise?: number;
  seed?: number;
}

const DEFAULTS: Required<HandOptions> = {
  jitter: 2.5,
  density: 0.35,
  round: 0.12,
  startAt: 0,
  closureGap: 0,
  sensorNoise: 0,
  seed: 1,
};

function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/**
 * Hand tremor as a function of position along the stroke, NOT per sample.
 *
 * This distinction is the whole point. Independent per-point noise is white
 * noise: at high sampling density it adds enormous path length and collapses
 * straightness, so a "line" drawn slowly would score 0.37 and read as an arc —
 * an artefact of the generator, not of any hand. Real tremor is low-frequency
 * and depends on where you are in the stroke, so drawing the same line slowly
 * gives you more points along the same wobble, not more wobble.
 */
function tremor(seed: number, amplitude: number): (t: number) => Point {
  const r = rng(seed);
  const waves = [1.7, 3.3, 6.1].map((freq) => ({
    freq,
    phaseX: r() * Math.PI * 2,
    phaseY: r() * Math.PI * 2,
    weight: 1 / freq,
  }));
  const norm = waves.reduce((a, w) => a + w.weight, 0);
  return (t: number) => {
    let dx = 0, dy = 0;
    for (const w of waves) {
      dx += Math.sin(t * Math.PI * 2 * w.freq + w.phaseX) * w.weight;
      dy += Math.cos(t * Math.PI * 2 * w.freq + w.phaseY) * w.weight;
    }
    return { x: (dx / norm) * amplitude, y: (dy / norm) * amplitude };
  };
}

function quadratic(a: Point, c: Point, b: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  };
}

/**
 * Walk a closed polygon the way a hand does: rounded corners, wobble, and a
 * start point anywhere along the outline (not necessarily a vertex).
 */
export function handPolygon(vertices: Point[], options: HandOptions = {}): Point[] {
  const o = { ...DEFAULTS, ...options };
  const n = vertices.length;

  // Build the ideal path: straight runs joined by rounded corners.
  const path: Point[] = [];
  for (let i = 0; i < n; i++) {
    const prev = vertices[(i - 1 + n) % n];
    const cur = vertices[i];
    const next = vertices[(i + 1) % n];
    const inLen = Math.hypot(cur.x - prev.x, cur.y - prev.y);
    const outLen = Math.hypot(next.x - cur.x, next.y - cur.y);
    const r = Math.min(0.45, o.round);
    const a = lerp(cur, prev, (r * Math.min(inLen, outLen)) / (inLen || 1));
    const b = lerp(cur, next, (r * Math.min(inLen, outLen)) / (outLen || 1));

    const from = path.length ? path[path.length - 1] : a;
    const straight = Math.hypot(a.x - from.x, a.y - from.y);
    const steps = Math.max(1, Math.round(straight * o.density));
    for (let k = 1; k <= steps; k++) path.push(lerp(from, a, k / steps));

    if (r > 0.001) {
      const arcLen = Math.hypot(b.x - a.x, b.y - a.y) * 1.3;
      const arcSteps = Math.max(2, Math.round(arcLen * o.density));
      for (let k = 1; k <= arcSteps; k++) path.push(quadratic(a, cur, b, k / arcSteps));
    } else {
      path.push(b);
    }
  }
  // Close the loop back to the first point.
  const first = path[0];
  const last = path[path.length - 1];
  const tail = Math.max(1, Math.round(Math.hypot(first.x - last.x, first.y - last.y) * o.density));
  for (let k = 1; k <= tail; k++) path.push(lerp(last, first, k / tail));

  // Rotate so the stroke starts where the hand started.
  const offset = Math.round(o.startAt * path.length) % path.length;
  const rotated = path.slice(offset).concat(path.slice(0, offset));

  // Trim (or extend) the tail so the ends don't meet exactly.
  let out = rotated;
  if (o.closureGap > 0) {
    let acc = 0;
    let cut = out.length - 1;
    for (let i = out.length - 1; i > 1; i--) {
      acc += Math.hypot(out[i].x - out[i - 1].x, out[i].y - out[i - 1].y);
      cut = i;
      if (acc >= o.closureGap) break;
    }
    out = out.slice(0, cut);
  }

  const wobble = tremor(o.seed, o.jitter);
  const noise = rng(o.seed * 977 + 13);
  return out.map((p, i) => {
    const d = wobble(i / Math.max(1, out.length - 1));
    return {
      x: p.x + d.x + (noise() - 0.5) * 2 * o.sensorNoise,
      y: p.y + d.y + (noise() - 0.5) * 2 * o.sensorNoise,
    };
  });
}

export function handRect(x: number, y: number, w: number, h: number, options: HandOptions = {}): Point[] {
  return handPolygon(
    [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ],
    options
  );
}

export function handTriangle(a: Point, b: Point, c: Point, options: HandOptions = {}): Point[] {
  return handPolygon([a, b, c], options);
}

export function handCircle(cx: number, cy: number, r: number, options: HandOptions = {}): Point[] {
  const o = { ...DEFAULTS, ...options };
  const wobble = tremor(o.seed, o.jitter);
  const noise = rng(o.seed * 977 + 13);
  const steps = Math.max(24, Math.round(2 * Math.PI * r * o.density));
  const sweep = Math.PI * 2 - (o.closureGap > 0 ? o.closureGap / r : 0);
  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * sweep + o.startAt * Math.PI * 2;
    // A hand-drawn circle is never a perfect one — let the radius breathe.
    const rr = r * (1 + Math.sin(t * 3 + o.seed) * 0.03);
    const d = wobble(i / steps);
    points.push({
      x: cx + rr * Math.cos(t) + d.x + (noise() - 0.5) * 2 * o.sensorNoise,
      y: cy + rr * Math.sin(t) + d.y + (noise() - 0.5) * 2 * o.sensorNoise,
    });
  }
  return points;
}

export function handLine(from: Point, to: Point, options: HandOptions = {}): Point[] {
  const o = { ...DEFAULTS, ...options };
  const wobble = tremor(o.seed, o.jitter);
  const noise = rng(o.seed * 977 + 13);
  const len = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(12, Math.round(len * o.density));
  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Hands bow slightly; a "straight" line is a very shallow arc.
    const bow = Math.sin(t * Math.PI) * o.jitter * 1.5;
    const nx = -(to.y - from.y) / (len || 1), ny = (to.x - from.x) / (len || 1);
    const d = wobble(t);
    points.push({
      x: from.x + (to.x - from.x) * t + nx * bow + d.x * 0.5 + (noise() - 0.5) * 2 * o.sensorNoise,
      y: from.y + (to.y - from.y) * t + ny * bow + d.y * 0.5 + (noise() - 0.5) * 2 * o.sensorNoise,
    });
  }
  return points;
}

// ===== The rest of the shape rung: arrow, text, dot =====

/**
 * A single-stroke arrow the way a hand draws one: the shaft, then at the tip
 * the pen turns sharply back along one wing — or, with `wings: 2`, back along
 * one wing, returns to the tip, and out along the other.
 */
export function handArrow(
  from: Point,
  to: Point,
  options: HandOptions & { headLen?: number; wings?: 1 | 2; headAt?: 'end' | 'start' } = {}
): Point[] {
  const o = { headLen: 28, wings: 1 as 1 | 2, headAt: 'end' as 'end' | 'start', ...options };
  const noise = rng((o.seed ?? 1) * 313 + 7);
  const [tail, tip] = o.headAt === 'end' ? [from, to] : [to, from];
  const len = Math.hypot(tip.x - tail.x, tip.y - tail.y) || 1;
  const ux = (tip.x - tail.x) / len, uy = (tip.y - tail.y) / len;
  const wing = (side: 1 | -1): Point => {
    // Each wing leaves the tip at ~30° off the shaft, pointing back toward the tail.
    const a = Math.PI / 6 + (noise() - 0.5) * 0.25;
    const bx = -ux * Math.cos(a) - side * -uy * Math.sin(a);
    const by = -uy * Math.cos(a) - side * ux * Math.sin(a);
    return { x: tip.x + bx * o.headLen, y: tip.y + by * o.headLen };
  };
  const shaftOpts = { ...options, jitter: (options.jitter ?? 2.5) * 0.6 };
  const shaft = handLine(tail, tip, shaftOpts);
  const legs: Point[] = [];
  const w1 = handLine(tip, wing(1), { ...shaftOpts, seed: (o.seed ?? 1) + 11 }).slice(1);
  legs.push(...w1);
  if (o.wings === 2) {
    // Back to the tip, then out the other wing.
    legs.push(...handLine(wing(1), tip, { ...shaftOpts, seed: (o.seed ?? 1) + 12 }).slice(1));
    legs.push(...handLine(tip, wing(-1), { ...shaftOpts, seed: (o.seed ?? 1) + 13 }).slice(1));
  }
  const pts = shaft.concat(legs);
  // A head at the start means the pen drew the head first, then the shaft.
  return o.headAt === 'start' ? pts.reverse() : pts;
}

/**
 * A scribbled word: the pen advances across `width` while rising and falling
 * through `humps` peaks, the way cursive or quick print reads at arm's length.
 * Not legible — that is the point. The shape rung only has to know that
 * writing is here, not what it says.
 */
export function handText(
  x: number,
  y: number,
  width: number,
  height: number,
  options: HandOptions & { humps?: number } = {}
): Point[] {
  const o = { ...DEFAULTS, humps: 5, ...options };
  const r = rng(o.seed * 91 + 3);
  const wobble = tremor(o.seed, o.jitter);
  const noise = rng(o.seed * 977 + 13);
  // Peaks and troughs of varying height, like ascenders and descenders.
  const verts: Point[] = [];
  const n = Math.max(3, o.humps) * 2;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const up = i % 2 === 0;
    const amp = up ? 0.15 + r() * 0.35 : 0.65 + r() * 0.35;
    verts.push({ x: x + t * width + (r() - 0.5) * (width / n) * 0.5, y: y + amp * height });
  }
  // Walk it with slightly rounded turns, at the requested density.
  const points: Point[] = [];
  for (let i = 0; i < verts.length - 1; i++) {
    const a = verts[i], b = verts[i + 1];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(2, Math.round(seg * o.density));
    for (let k = i === 0 ? 0 : 1; k <= steps; k++) {
      const t = k / steps;
      // Ease near the turn so it is a bend, not a spike.
      const e = t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
      points.push(lerp(a, b, e * 0.3 + t * 0.7));
    }
  }
  return points.map((p, i) => {
    const d = wobble(i / Math.max(1, points.length - 1));
    return {
      x: p.x + d.x + (noise() - 0.5) * 2 * o.sensorNoise,
      y: p.y + d.y + (noise() - 0.5) * 2 * o.sensorNoise,
    };
  });
}

/** A dot: a tiny blob, the pen touching down and lifting. */
export function handDot(cx: number, cy: number, r: number, options: HandOptions = {}): Point[] {
  const o = { ...DEFAULTS, ...options };
  const noise = rng(o.seed * 977 + 13);
  const steps = Math.max(6, Math.round(2 * Math.PI * r * Math.max(0.5, o.density)));
  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 1.7;
    points.push({
      x: cx + r * Math.cos(t) * (0.6 + 0.4 * (i / steps)) + (noise() - 0.5) * o.sensorNoise,
      y: cy + r * Math.sin(t) * (0.6 + 0.4 * (i / steps)) + (noise() - 0.5) * o.sensorNoise,
    });
  }
  return points;
}

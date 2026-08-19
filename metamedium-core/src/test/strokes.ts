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

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

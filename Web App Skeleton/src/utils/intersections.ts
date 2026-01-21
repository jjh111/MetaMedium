// MetaMedium Day 6 - Geometric Intersection Detection
// Calculate actual intersection points between shapes

import type { Point, Shape } from '../types';

// ===== LINE-LINE INTERSECTION =====

export function intersectLineLine(
  line1Start: Point,
  line1End: Point,
  line2Start: Point,
  line2End: Point
): Point | null {
  // Check if two line segments intersect
  // Returns intersection point if they intersect, null otherwise

  const x1 = line1Start.x,
    y1 = line1Start.y;
  const x2 = line1End.x,
    y2 = line1End.y;
  const x3 = line2Start.x,
    y3 = line2Start.y;
  const x4 = line2End.x,
    y4 = line2End.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  // Lines are parallel or coincident
  if (Math.abs(denom) < 0.0001) return null;

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  // Check if intersection is within both line segments
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1),
    };
  }

  return null;
}

// ===== LINE-CIRCLE INTERSECTION =====

export function intersectLineCircle(
  lineStart: Point,
  lineEnd: Point,
  circleCenter: Point,
  circleRadius: number
): Point[] {
  // Check if line segment intersects circle
  // Returns array of intersection points (0, 1, or 2 points)

  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const fx = lineStart.x - circleCenter.x;
  const fy = lineStart.y - circleCenter.y;

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - circleRadius * circleRadius;

  let discriminant = b * b - 4 * a * c;

  // No intersection
  if (discriminant < 0) return [];

  discriminant = Math.sqrt(discriminant);

  const t1 = (-b - discriminant) / (2 * a);
  const t2 = (-b + discriminant) / (2 * a);

  const intersections: Point[] = [];

  // Check if intersections are within line segment (t between 0 and 1)
  if (t1 >= 0 && t1 <= 1) {
    intersections.push({
      x: lineStart.x + t1 * dx,
      y: lineStart.y + t1 * dy,
    });
  }

  if (t2 >= 0 && t2 <= 1 && Math.abs(t2 - t1) > 0.0001) {
    intersections.push({
      x: lineStart.x + t2 * dx,
      y: lineStart.y + t2 * dy,
    });
  }

  return intersections;
}

// ===== CIRCLE-CIRCLE INTERSECTION =====

export function intersectCircleCircle(
  center1: Point,
  radius1: number,
  center2: Point,
  radius2: number
): Point[] {
  // Check if two circles intersect
  // Returns array of intersection points (0, 1, or 2 points)

  const dx = center2.x - center1.x;
  const dy = center2.y - center1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Circles don't intersect (too far apart or one contains the other)
  if (dist > radius1 + radius2 || dist < Math.abs(radius1 - radius2)) {
    return [];
  }

  // Circles are coincident (infinite intersections)
  if (dist < 0.0001 && Math.abs(radius1 - radius2) < 0.0001) {
    return [];
  }

  // One intersection point (circles are tangent)
  if (
    Math.abs(dist - (radius1 + radius2)) < 0.0001 ||
    Math.abs(dist - Math.abs(radius1 - radius2)) < 0.0001
  ) {
    const t = radius1 / dist;
    return [
      {
        x: center1.x + t * dx,
        y: center1.y + t * dy,
      },
    ];
  }

  // Two intersection points
  const a = (radius1 * radius1 - radius2 * radius2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(radius1 * radius1 - a * a);

  const px = center1.x + (a / dist) * dx;
  const py = center1.y + (a / dist) * dy;

  return [
    {
      x: px + (h / dist) * dy,
      y: py - (h / dist) * dx,
    },
    {
      x: px - (h / dist) * dy,
      y: py + (h / dist) * dx,
    },
  ];
}

// ===== HIGH-LEVEL SHAPE INTERSECTION DETECTION =====

export function detectShapeIntersections(shapeA: Shape, shapeB: Shape): Point[] {
  // High-level intersection detection between two shapes
  // Returns array of intersection points

  if (!shapeA || !shapeB || !shapeA.definition || !shapeB.definition) {
    return [];
  }

  const typeA = shapeA.definition.type;
  const typeB = shapeB.definition.type;

  // Helper: get circle info (handles both circle and ellipse)
  function getCircleInfo(shape: Shape): { center: Point; radius: number } | null {
    if (shape.definition.type === 'circle') {
      return {
        center: shape.definition.center,
        radius: shape.definition.radius,
      };
    } else if (shape.definition.type === 'ellipse') {
      return {
        center: shape.definition.center,
        radius: (shape.definition.radiusX + shape.definition.radiusY) / 2,
      };
    }
    return null;
  }

  // Circle-Circle intersection (handles circle, ellipse, or mix)
  if ((typeA === 'circle' || typeA === 'ellipse') && (typeB === 'circle' || typeB === 'ellipse')) {
    const circleA = getCircleInfo(shapeA);
    const circleB = getCircleInfo(shapeB);

    if (circleA && circleB) {
      return intersectCircleCircle(circleA.center, circleA.radius, circleB.center, circleB.radius);
    }
  }

  // Line-Line intersection
  if (typeA === 'segment' && typeB === 'segment') {
    const intersection = intersectLineLine(
      shapeA.definition.start,
      shapeA.definition.end,
      shapeB.definition.start,
      shapeB.definition.end
    );
    return intersection ? [intersection] : [];
  }

  // Line-Circle intersection
  if (typeA === 'segment' && (typeB === 'circle' || typeB === 'ellipse')) {
    const circleB = getCircleInfo(shapeB);
    if (circleB) {
      return intersectLineCircle(
        shapeA.definition.start,
        shapeA.definition.end,
        circleB.center,
        circleB.radius
      );
    }
  }

  if ((typeA === 'circle' || typeA === 'ellipse') && typeB === 'segment') {
    // Swap and call recursively
    return detectShapeIntersections(shapeB, shapeA);
  }

  // Line-Polygon intersection
  if (typeA === 'segment' && typeB === 'polygon') {
    const points: Point[] = [];
    const vertices = shapeB.definition.vertices;

    for (let i = 0; i < vertices.length; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % vertices.length];
      const intersection = intersectLineLine(
        shapeA.definition.start,
        shapeA.definition.end,
        v1,
        v2
      );
      if (intersection) points.push(intersection);
    }

    return points;
  }

  if (typeA === 'polygon' && typeB === 'segment') {
    // Swap and call recursively
    return detectShapeIntersections(shapeB, shapeA);
  }

  // Polygon-Polygon intersection (check each edge pair)
  if (typeA === 'polygon' && typeB === 'polygon') {
    const points: Point[] = [];
    const verticesA = shapeA.definition.vertices;
    const verticesB = shapeB.definition.vertices;

    for (let i = 0; i < verticesA.length; i++) {
      const v1A = verticesA[i];
      const v2A = verticesA[(i + 1) % verticesA.length];

      for (let j = 0; j < verticesB.length; j++) {
        const v1B = verticesB[j];
        const v2B = verticesB[(j + 1) % verticesB.length];

        const intersection = intersectLineLine(v1A, v2A, v1B, v2B);
        if (intersection) points.push(intersection);
      }
    }

    return points;
  }

  // Circle-Polygon intersection
  if ((typeA === 'circle' || typeA === 'ellipse') && typeB === 'polygon') {
    const circleA = getCircleInfo(shapeA);
    if (!circleA) return [];

    const points: Point[] = [];
    const vertices = shapeB.definition.vertices;

    for (let i = 0; i < vertices.length; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % vertices.length];
      const intersections = intersectLineCircle(v1, v2, circleA.center, circleA.radius);
      points.push(...intersections);
    }

    return points;
  }

  if (typeA === 'polygon' && (typeB === 'circle' || typeB === 'ellipse')) {
    // Swap and call recursively
    return detectShapeIntersections(shapeB, shapeA);
  }

  return [];
}

// Spatial relationships and clustering.
// Ported from Web App Skeleton/src/core/spatial.ts. Geometric intersection
// detection is injected (the core has no Shape implementation); without it,
// overlapping bounds still register as 'intersecting' without point data.

import type { Component, Point, SpatialGraph, SpatialConnection, SpatialContainment } from './types';
import { boundsOverlap, boundsContain, boundingBoxDistance } from './geometry';

export type IntersectionDetector = (a: unknown, b: unknown) => Point[];

export function buildSpatialGraph(
  components: Component[],
  detectIntersections?: IntersectionDetector
): SpatialGraph {
  const connections: SpatialConnection[] = [];
  const containment: SpatialContainment[] = [];

  for (let i = 0; i < components.length; i++) {
    for (let j = i + 1; j < components.length; j++) {
      const compA = components[i];
      const compB = components[j];

      // Lines don't define enclosed areas — skip containment for them.
      const isLineA = compA.type === 'line' || compA.recognizedAs === 'line';
      const isLineB = compB.type === 'line' || compB.recognizedAs === 'line';

      if (!isLineA && !isLineB) {
        if (boundsContain(compA.bounds, compB.bounds)) {
          containment.push({ outer: i, inner: j });
          continue; // contained shapes don't get other relationships
        }
        if (boundsContain(compB.bounds, compA.bounds)) {
          containment.push({ outer: j, inner: i });
          continue;
        }
      }

      if (boundsOverlap(compA.bounds, compB.bounds)) {
        let intersectionPoints: Point[] | undefined;
        if (detectIntersections && compA.geometricShape && compB.geometricShape) {
          const found = detectIntersections(compA.geometricShape, compB.geometricShape);
          if (found.length > 0) intersectionPoints = found;
        }
        connections.push({
          a: i,
          b: j,
          relationship: 'intersecting',
          distance: 0,
          intersectionPoints,
        });
        continue;
      }

      const distance = boundingBoxDistance(compA.bounds, compB.bounds);
      if (distance < 50) {
        connections.push({ a: i, b: j, relationship: 'touching', distance });
      }
    }
  }

  return { connections, containment };
}

export function spatialCluster(
  components: Component[],
  proximityThreshold: number
): Component[][] {
  if (components.length === 0) return [];
  if (components.length === 1) return [components];

  const clusters: Component[][] = [];
  const assigned = new Set<number>();

  components.forEach((comp, idx) => {
    if (assigned.has(idx)) return;

    const cluster: Component[] = [comp];
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

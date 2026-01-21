// MetaMedium Day 6 - Spatial Clustering System
// Migrated from day5.html

import type { Component, SpatialGraph, SpatialConnection, SpatialContainment } from '../types';
import { boundsOverlap, boundsContain, boundingBoxDistance, getFingerprint } from '../utils/geometry';
import { findSubsetMatches } from './matching';
import { vlog } from '../utils/logger';
import { detectShapeIntersections } from '../utils/intersections';

// ===== SPATIAL GRAPH BUILDING =====

export function buildSpatialGraph(components: Component[]): SpatialGraph {
  const connections: SpatialConnection[] = [];
  const containment: SpatialContainment[] = [];

  // Check all pairs for relationships
  for (let i = 0; i < components.length; i++) {
    for (let j = i + 1; j < components.length; j++) {
      const compA = components[i];
      const compB = components[j];

      // Skip containment checks for lines (they don't define enclosed areas)
      const isLineA = compA.type === 'line' || compA.recognizedAs === 'line';
      const isLineB = compB.type === 'line' || compB.recognizedAs === 'line';

      // Check containment (only for shapes with area, not lines)
      if (!isLineA && !isLineB) {
        if (boundsContain(compA.bounds, compB.bounds)) {
          containment.push({ outer: i, inner: j });
          continue; // Contained shapes don't have other relationships
        }
        if (boundsContain(compB.bounds, compA.bounds)) {
          containment.push({ outer: j, inner: i });
          continue;
        }
      }

      // Check overlap (intersecting) and calculate actual intersection points if shapes are available
      if (boundsOverlap(compA.bounds, compB.bounds)) {
        let intersectionPoints = undefined;

        // Calculate actual intersection points if geometric shapes are available
        if (compA.geometricShape && compB.geometricShape) {
          intersectionPoints = detectShapeIntersections(
            compA.geometricShape,
            compB.geometricShape
          );
          // Only use if we found actual points
          if (intersectionPoints.length === 0) {
            intersectionPoints = undefined;
          }
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

      // Check proximity (touching)
      const distance = boundingBoxDistance(compA.bounds, compB.bounds);
      if (distance < 50) {
        // DAY 5: 35px threshold for tight matching
        connections.push({
          a: i,
          b: j,
          relationship: 'touching',
          distance,
        });
      }
    }
  }

  return { connections, containment };
}

// ===== SPATIAL CLUSTERING =====

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

    // Iteratively add nearby components
    let changed = true;
    while (changed) {
      changed = false;
      components.forEach((other, otherIdx) => {
        if (assigned.has(otherIdx)) return;

        // Check if other is near any cluster member
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

// ===== COMPOSITION CHECKING =====

export function checkCanvasForCompositions(
  strokes: any[],
  strokeIds: string[],
  context: string[],
  refinedStrokes: any[],
  shapes: any[],
  library: any,
  proximityThreshold: number
): any[] {
  // Auto-name unaccepted strokes temporarily
  const tempContext = [...context];
  let artCounter = 0;
  strokes.forEach((_, idx) => {
    if (!tempContext[idx] || tempContext[idx] === '') {
      tempContext[idx] = `art${artCounter}`;
      artCounter++;
    }
  });

  if (strokes.length < 1) return [];

  // Build all components
  const allComponents: Component[] = strokes
    .map((stroke, idx) => {
      const recognizedAs = tempContext[idx] || '';
      if (!recognizedAs) return null;

      // Extract type for fingerprinting
      let type = 'unknown';
      if (recognizedAs.startsWith('art')) {
        type = 'art';
      } else if (library[recognizedAs]) {
        const libItem = library[recognizedAs];
        type = libItem.shapeType || libItem.type || 'user-shape';
      } else {
        type = recognizedAs;
      }

      // Use refined stroke if available, otherwise original
      const strokeToAnalyze = refinedStrokes[idx] || stroke;
      const fingerprint = getFingerprint(strokeToAnalyze);

      return {
        index: idx,
        strokeId: strokeIds[idx],
        originalStroke: stroke,
        refinedStroke: refinedStrokes[idx],
        recognizedAs,
        type,
        fingerprint: fingerprint,
        bounds: fingerprint.bounds,
        geometricShape: shapes[idx],
      } as Component;
    })
    .filter((c): c is Component => c !== null);

  if (allComponents.length < 1) return [];

  // DAY 5 FIX: Spatial clustering with 35px threshold
  const clusters = spatialCluster(allComponents, proximityThreshold);

  console.log(`🔍 Found ${clusters.length} spatial clusters:`, clusters.map((c) => c.length));

  // Check each cluster for composition matches
  const allMatches: any[] = [];

  clusters.forEach((clusterComponents, clusterIdx) => {
    vlog(
      `\n🔍 === CLUSTER ${clusterIdx}: ${clusterComponents.length} components ===`
    );
    vlog('🔍 Components:', clusterComponents.map((c) => `${c.recognizedAs}(${c.type})`).join(', '));

    if (clusterComponents.length < 1) return;

    // Track which components are already matched (for non-overlapping matches)
    const usedIndices = new Set<number>();

    // Sort compositions by component count (larger first)
    const compositionKeys = Object.keys(library)
      .filter((key) => {
        const item = library[key];
        return (
          (item.type === 'builtin-composition' || item.type === 'composition') &&
          item.fingerprint
        );
      })
      .sort((a, b) => {
        const countA = library[a].fingerprint.componentCount || 0;
        const countB = library[b].fingerprint.componentCount || 0;
        return countB - countA;
      });

    vlog(
      `🔍 Checking compositions in priority order: ${compositionKeys
        .map((k) => `${k}(${library[k].fingerprint.componentCount})`)
        .join(', ')}`
    );

    // Check compositions in priority order
    compositionKeys.forEach((key) => {
      const libItem = library[key];

      vlog(`\n🔍 Searching for "${key}" in cluster ${clusterIdx}...`);

      // Extract parameters for findSubsetMatches
      const requiredTypes = libItem.fingerprint.componentTypes;
      const requiredCount = libItem.fingerprint.componentCount;
      const threshold = 0.8;
      const proximityThreshold = 35; // DAY 5 FIX: Tight matching

      // Find subset matches within this cluster
      const subsetMatches = findSubsetMatches(
        clusterComponents,
        requiredTypes,
        requiredCount,
        libItem.fingerprint,
        libItem.components || null,
        threshold,
        proximityThreshold
      );

      if (subsetMatches.length > 0) {
        // Take best match (greedy)
        const bestMatch = subsetMatches[0];
        const componentIndices = bestMatch.components.map((c: Component) => c.index);

        // Check if any components are already used
        const hasOverlap = componentIndices.some((idx: number) => usedIndices.has(idx));

        if (!hasOverlap) {
          console.log(
            `✅ Found "${key}" in cluster ${clusterIdx}! Components: [${componentIndices.join(', ')}]`
          );

          // Mark components as used
          componentIndices.forEach((idx: number) => usedIndices.add(idx));

          // Add to matches
          allMatches.push({
            type: key,
            label: libItem.label,
            score: Math.round(bestMatch.score * 100),
            confidence: bestMatch.score,
            isComposition: true,
            componentCount: libItem.fingerprint.componentCount,
            matchDetails: bestMatch.matchDetails,
            clusterIndex: clusterIdx,
            componentIndices: componentIndices,
          });
        } else {
          console.log(
            `⚠️ "${key}" match overlaps with already-matched components, skipping`
          );
        }
      }
    });

    vlog(
      `🔍 Cluster ${clusterIdx} complete. Used ${usedIndices.size}/${clusterComponents.length} components.`
    );
  });

  console.log('🔍 Final matches from all clusters:', allMatches);
  return allMatches;
}

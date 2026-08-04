import { describe, it, expect } from 'vitest';
import { buildSpatialGraph, spatialCluster } from './spatial';
import { getFingerprint } from '../utils/geometry';
import { circleStroke, lineStroke } from '../test/strokes';
import type { Component, Point } from '../types';

let nextId = 0;
function makeComponent(points: Point[], type: string, index: number): Component {
  const fingerprint = getFingerprint(points);
  return {
    index,
    strokeId: `s${nextId++}`,
    originalStroke: points,
    refinedStroke: null,
    recognizedAs: type,
    type,
    fingerprint,
    bounds: fingerprint.bounds,
    geometricShape: undefined as unknown as Component['geometricShape'],
  };
}

describe('buildSpatialGraph', () => {
  it('detects containment (small circle inside big circle)', () => {
    const outer = makeComponent(circleStroke(200, 200, 150), 'circle', 0);
    const inner = makeComponent(circleStroke(200, 200, 40), 'circle', 1);

    const graph = buildSpatialGraph([outer, inner]);
    expect(graph.containment).toEqual([{ outer: 0, inner: 1 }]);
    // Contained shapes have no other relationships.
    expect(graph.connections).toHaveLength(0);
  });

  it('detects intersection (overlapping circles)', () => {
    const a = makeComponent(circleStroke(200, 200, 100), 'circle', 0);
    const b = makeComponent(circleStroke(330, 200, 100), 'circle', 1);

    const graph = buildSpatialGraph([a, b]);
    expect(graph.containment).toHaveLength(0);
    expect(graph.connections).toHaveLength(1);
    expect(graph.connections[0].relationship).toBe('intersecting');
  });

  it('detects touching (nearby but not overlapping)', () => {
    const a = makeComponent(circleStroke(100, 100, 50), 'circle', 0);
    const b = makeComponent(circleStroke(240, 100, 50), 'circle', 1); // 40px gap

    const graph = buildSpatialGraph([a, b]);
    expect(graph.connections).toHaveLength(1);
    expect(graph.connections[0].relationship).toBe('touching');
    expect(graph.connections[0].distance).toBeCloseTo(40, 0);
  });

  it('reports no relationship for distant shapes', () => {
    const a = makeComponent(circleStroke(100, 100, 50), 'circle', 0);
    const b = makeComponent(circleStroke(500, 500, 50), 'circle', 1);

    const graph = buildSpatialGraph([a, b]);
    expect(graph.connections).toHaveLength(0);
    expect(graph.containment).toHaveLength(0);
  });

  it('skips containment for lines (no enclosed area)', () => {
    const box = makeComponent(circleStroke(200, 200, 150), 'circle', 0);
    const line = makeComponent(
      lineStroke({ x: 150, y: 200 }, { x: 250, y: 200 }),
      'line',
      1
    );

    const graph = buildSpatialGraph([box, line]);
    expect(graph.containment).toHaveLength(0);
    // Bounds overlap, so it registers as intersecting instead.
    expect(graph.connections[0]?.relationship).toBe('intersecting');
  });
});

describe('spatialCluster', () => {
  it('groups nearby components and separates distant ones', () => {
    const a = makeComponent(circleStroke(100, 100, 40), 'circle', 0);
    const b = makeComponent(circleStroke(190, 100, 40), 'circle', 1); // 10px from a
    const c = makeComponent(circleStroke(600, 600, 40), 'circle', 2); // far away

    const clusters = spatialCluster([a, b, c], 35);
    expect(clusters).toHaveLength(2);
    const sizes = clusters.map((cl) => cl.length).sort();
    expect(sizes).toEqual([1, 2]);
  });

  it('chains transitively: a-b near, b-c near => one cluster', () => {
    const a = makeComponent(circleStroke(100, 100, 40), 'circle', 0);
    const b = makeComponent(circleStroke(190, 100, 40), 'circle', 1);
    const c = makeComponent(circleStroke(280, 100, 40), 'circle', 2);

    const clusters = spatialCluster([a, b, c], 35);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toHaveLength(3);
  });

  it('handles empty and single-component input', () => {
    expect(spatialCluster([], 35)).toEqual([]);
    const solo = makeComponent(circleStroke(100, 100, 40), 'circle', 0);
    expect(spatialCluster([solo], 35)).toEqual([[solo]]);
  });
});

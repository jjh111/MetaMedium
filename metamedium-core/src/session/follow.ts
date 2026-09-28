// Bindings follow (V1-PLAN §4 and §9 E2; CONTROL-POINTS-PLAN P3, as amended).
//
// The contract, red first: nothing follows yet. A connector's two ends are
// read here — its start and its end as the stroke was drawn, where it stands.

import type { Point } from '../types';
import type { MMNode } from './nodes';
import { strokePointsOf } from './nodes';

/** A connector's two ends where it stands now, and which of them is its tail. */
export interface ConnectorEnds {
  start: Point;
  end: Point;
  /** Which stroke end is the tail — the start, unless an arrow was drawn head first. */
  tail: 'start' | 'end';
}

/** Where a stroke's two ends stand now. */
export function connectorEnds(node: MMNode, _nodes: ReadonlyMap<string, MMNode>): ConnectorEnds | null {
  void _nodes;
  const pts = strokePointsOf(node);
  if (!pts || pts.length < 2) return null;
  return { start: pts[0], end: pts[pts.length - 1], tail: 'start' };
}

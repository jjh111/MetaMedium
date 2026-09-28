// Handles — a mark's own points, made draggable (V1-PLAN §4 and §9 E1;
// CONTROL-POINTS-PLAN P2). The contract, with nothing behind it yet: the red
// tests in handles.test.ts are written against it.

import type { Point } from '../types';
import type { MMNode } from './nodes';
import type { CleanShape } from './clean';

/** What a handle is on its mark: the magnets' own kinds, and an arc's bulge. */
export type HandleKind = 'corner' | 'middle' | 'centre' | 'cardinal' | 'tip' | 'tail' | 'point' | 'bulge';

export interface Handle {
  nodeId: string;
  /** The clean form it belongs to: 'rectangle', 'circle', … */
  shape: string;
  kind: HandleKind;
  /** 0-based among same-kind handles of the mark, in the magnets' order. */
  index: number;
  /** Where it stands on the board. */
  point: Point;
  /** What dragging it does, in words. */
  reasoning: string;
}

/** A reshape as it would stand: the mark holding the reshaped clean form, and where the handle lands in the mark's own space. */
export interface ReshapePreview {
  node: MMNode;
  clean: CleanShape;
  to: Point;
}

/** The handles of one mark with a clean form — held, or the one it would be offered; none without one. */
export function handlesOf(_node: MMNode, _nodes: ReadonlyMap<string, MMNode>): Handle[] {
  return [];
}

/** What dragging `handle` to `to` (on the board) would make of the mark, or null when it makes nothing. */
export function reshapePreview(_node: MMNode, _nodes: ReadonlyMap<string, MMNode>, _handle: { kind: string; index: number }, _to: Point): ReshapePreview | null {
  return null;
}

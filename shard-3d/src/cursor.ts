// ===== cursor =====
// Where the hand is working, as one world point (SHARD-3D-PLAN §3, the note of
// 16 September 2026).
//
// John, with two Blender screenshots: *"The mapping of drawing in non-standard
// axes should behave like Blender does."* The screenshots are Blender's
// Annotation tool with **Placement: 3D Cursor** — a circle drawn in a free
// three-quarter view lands on a plane parallel to the view **at that moment**,
// through the 3D cursor, and orbiting away shows it as a thin ellipse, fully
// drawn and opaque: ordinary world geometry, not a thing that follows the
// camera and not a thing that fades.
//
// So the shard needs what Blender has: a cursor the hand can put somewhere.
// It is the plane picker's own origin — the thing that already stood at the
// world origin and could slide — and this module is the one rule for moving
// it: **the surface under the pointer, else the foundation plane under it**.
//
// Runtime, not the log. Where the hand is working is a camera-side fact, the
// way the pose is: nothing about the board changes when the cursor moves, only
// where the next unchosen stroke will land. The picker's origin was never a
// log event either, so this follows what was already there rather than adding
// a kind of state.
//
// No three.js: the surface hit and a ray arrive as arithmetic, so this tests
// headlessly beside `plane.ts` and `planarity.ts`.

import { foundation, rayPlane, type Ray, type Vec3 } from './plane';

export interface CursorPlacement {
  /** Where the cursor goes. */
  at: Vec3;
  /** Why, in the words the status line uses. */
  why: string;
  /** Which rule placed it — the surface, or the ground under the pointer. */
  on: 'surface' | 'foundation';
}

export interface PlaceCursorScope {
  /**
   * Where the pointer's ray met a solid's surface, when it met one. The caller
   * owns the solids, so it does the hit test; this module owns the rule.
   */
  surface: Vec3 | null;
  /** What it met it with — the pointer, as a world ray. */
  ray: Ray;
  /** What the surface was, for the reason: `artifact:7`. */
  what?: string;
}

/**
 * Blender's placement rule, in the shard's terms: **a solid's surface under
 * the pointer takes the cursor; failing that, the foundation plane does.**
 *
 * Null when neither can — a camera looking along the ground from below it
 * meets nothing, and a cursor that jumped to infinity would be worse than a
 * cursor that stayed put. The caller says so and leaves it where it is.
 */
export function placeCursor(scope: PlaceCursorScope): CursorPlacement | null {
  if (scope.surface) {
    return {
      at: scope.surface,
      why: `on ${scope.what ?? 'the surface'} under the pointer`,
      on: 'surface',
    };
  }
  const ground = rayPlane(scope.ray, foundation('world', 'the ground, for the cursor'));
  if (!ground) return null;
  return { at: ground, why: 'on the foundation plane under the pointer', on: 'foundation' };
}

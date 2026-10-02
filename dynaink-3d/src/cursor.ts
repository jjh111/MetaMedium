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
// **And until it is placed, it FOLLOWS the centre of the view** (push 2, G1).
// Blender's cursor is static and starts at the world origin; the shard's does
// not, and John's second board is why. He looked one to four units up and drew
// four free loops, and every one of them landed at floor level — because the
// view plane stood through a cursor nobody had moved, at (0, 0, 0), while the
// camera's target was at y 0.9–3.7. The ink was behind or in front of the
// volume he was working in, never in it.
//
// So the rule is: **the view plane passes through the volume the hand is
// working in.** By default that is the camera's TARGET — the centre of the
// view, which pans and orbits with the hand, so the plane is always where you
// are looking. A cursor PLACED by shift + click is a decision and sticks,
// until `0`, a clear, or a shift + click on the cursor itself lets it go.
//
// **What follows is the view plane, not the picker.** The picker's origin is
// where the planes it hands out pass through, so a foundation standing on a
// following cursor would be a ground that lifts off the ground the moment you
// looked up — and the picker is a thing you can click, so parking it in the
// middle of the view puts three tiles under the middle of every drawing. It
// stands on the PLACED cursor, and at the world origin while there is none.
//
// No three.js: the surface hit and a ray arrive as arithmetic, so this tests
// headlessly beside `plane.ts` and `planarity.ts`.

import { foundation, length, rayPlane, sub, type Ray, type Vec3 } from './plane';

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

// ---- the cursor's two states ------------------------------------------------

/**
 * Where the hand is working, as the surface holds it: a PLACED point, or
 * nothing — and nothing means it follows the centre of the view.
 *
 * One field, because there are exactly two states and a boolean beside a point
 * could hold a third that means nothing (placed nowhere, or following a point).
 */
export interface CursorState {
  /** The point shift + click put it on, or null while it follows the view. */
  placed: Vec3 | null;
  /** Why it is there — the placement's own words. Empty while it follows. */
  why: string;
}

export const FOLLOWING: CursorState = { placed: null, why: '' };

/** Is the cursor following the centre of the view, rather than standing where it was put? */
export function cursorFollowsTarget(state: CursorState): boolean {
  return state.placed === null;
}

/** Where the cursor stands right now, and why — one answer for the picker, the view plane and the panel. */
export function cursorAt(state: CursorState, target: Vec3): { at: Vec3; why: string; follows: boolean } {
  if (state.placed) return { at: state.placed, why: state.why, follows: false };
  return {
    at: target,
    why: 'the centre of the view — shift + click to put it somewhere',
    follows: true,
  };
}

/**
 * The sentence the status line and the panel say about the view plane, in the
 * two forms John has to be able to tell apart at a glance.
 */
export function describeAnchor(state: CursorState): string {
  return cursorFollowsTarget(state)
    ? 'view · through the centre of the view'
    : 'view · through the placed cursor';
}

/**
 * How near a shift + click has to land to the cursor it already placed to mean
 * *let it go* rather than *put it there*. A ratio of nothing — it is a WORLD
 * distance against the size of the thing being clicked on, so it is scaled by
 * the caller, who knows what a hand's width is on this screen at this zoom.
 */
export const RELEASE_WITHIN = 1;

/**
 * What a shift + click does: place the cursor, or — clicking the cursor where
 * it already stands — let it go back to following the view.
 *
 * `handSize` is what a hand's width comes to in world units where the click
 * landed (the pen's own scale), so the same gesture works at any zoom.
 */
export function shiftClick(
  state: CursorState,
  placement: CursorPlacement,
  handSize: number
): { state: CursorState; said: string } {
  if (state.placed && length(sub(placement.at, state.placed)) <= RELEASE_WITHIN * Math.max(handSize, 1e-6)) {
    return {
      state: FOLLOWING,
      said: 'cursor let go — the view plane follows the centre of the view again',
    };
  }
  return {
    state: { placed: placement.at, why: placement.why },
    said: `cursor placed · ${placement.why} — it stays there until 0, a clear, or a shift + click on it`,
  };
}

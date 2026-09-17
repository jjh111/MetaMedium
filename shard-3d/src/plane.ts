// ===== plane =====
// Where a mark lies (SHARD-3D-PLAN §2.1), as pure geometry.
//
// Invariant 1: ink lies on a plane. Every stroke is 2D in the coordinates of
// the plane it lies on, so the shape rung, clean forms, the maths and the
// relations run on it unchanged. There is no free-space stroke.
//
// No three.js in this file. Planes are 2D once the plane is known, so the
// whole module is arithmetic and tests headlessly — which is also why §11
// names it as the first thing that can land back in core.

import type { Point } from 'metamedium-core';
// TYPE ONLY: erased at compile time, so `planarity.ts` → `plane.ts` stays the
// one run-time direction and the pure modules have no cycle between them.
import type { PlaneCandidate } from './planarity';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * How a stroke came to lie where it lies. P0 implements `chosen` and the
 * `world` default; `face` / `view` / `previous` are P1's scorer, and the
 * vocabulary is closed here so that P1 adds rows, not a new kind of thing.
 */
export type PlaneSource = 'chosen' | 'face' | 'view' | 'world' | 'previous';

export interface Plane {
  /** Where the plane's (0, 0) sits in world space. */
  origin: Vec3;
  /** Unit normal. Slid along this by the gizmo's handle. */
  normal: Vec3;
  /**
   * The world direction of the plane's **+v** axis — chosen, for each named
   * plane, so that +v runs DOWN the screen in that plane's canonical view.
   * The engine's 2D space has y down; a plane whose v ran the other way would
   * read every arrow and every letter upside down.
   */
  up: Vec3;
  source: PlaneSource;
  /** `foundation` | `height` | `width`, when it is one of the three. */
  name?: string;
  /** Why the ink landed here. Said out loud in the panel — never inferred silently. */
  why: string;
}

// ---- vector arithmetic ----------------------------------------------------

export const v3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
export const add = (a: Vec3, b: Vec3): Vec3 => v3(a.x + b.x, a.y + b.y, a.z + b.z);
export const sub = (a: Vec3, b: Vec3): Vec3 => v3(a.x - b.x, a.y - b.y, a.z - b.z);
export const mul = (a: Vec3, k: number): Vec3 => v3(a.x * k, a.y * k, a.z * k);
export const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: Vec3, b: Vec3): Vec3 =>
  v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
export const length = (a: Vec3): number => Math.sqrt(dot(a, a));
export function normalize(a: Vec3): Vec3 {
  const l = length(a);
  return l === 0 ? v3(0, 0, 0) : mul(a, 1 / l);
}

// ---- the plane's own frame -------------------------------------------------

/** The plane's +u axis: to the right on screen in the plane's canonical view. */
export function uAxis(plane: Plane): Vec3 {
  return normalize(cross(plane.normal, plane.up));
}

/** The plane's +v axis: down the screen in the plane's canonical view. */
export function vAxis(plane: Plane): Vec3 {
  return normalize(plane.up);
}

/** A world point's coordinates in the plane, ignoring any component off it. */
export function toPlane(plane: Plane, world: Vec3): Point {
  const d = sub(world, plane.origin);
  return { x: dot(d, uAxis(plane)), y: dot(d, vAxis(plane)) };
}

/** A plane point back in world space. */
export function toWorld(plane: Plane, p: Point): Vec3 {
  return add(add(plane.origin, mul(uAxis(plane), p.x)), mul(vAxis(plane), p.y));
}

/** How far off the plane a world point sits, signed along the normal. */
export function offsetOf(plane: Plane, world: Vec3): number {
  return dot(sub(world, plane.origin), normalize(plane.normal));
}

/**
 * A world point reflected across a plane (push 2, G3).
 *
 * The arithmetic `solid.ts`'s `reflectionOf` does as a matrix, said as a point
 * — so a profile can be mirrored without a renderer, which is what a part's
 * mirror needs and what makes it testable.
 */
export function reflectAcross(plane: Plane, world: Vec3): Vec3 {
  const n = normalize(plane.normal);
  return sub(world, mul(n, 2 * offsetOf(plane, world)));
}

/** The same plane, slid along its own normal. The gizmo's handle. */
export function slide(plane: Plane, distance: number): Plane {
  return {
    ...plane,
    origin: add(plane.origin, mul(normalize(plane.normal), distance)),
    why: distance === 0 ? plane.why : `${plane.why}, slid ${distance.toFixed(2)} along its normal`,
  };
}

// ---- rays ------------------------------------------------------------------

export interface Ray {
  origin: Vec3;
  direction: Vec3;
}

/**
 * Where a ray meets a plane, or null when it runs parallel to it or behind
 * the eye. A plane seen near edge-on still returns a point; whether it is too
 * oblique to draw on is a reading, not an intersection (§10, P1's scorer).
 */
export function rayPlane(ray: Ray, plane: Plane): Vec3 | null {
  const n = normalize(plane.normal);
  const denom = dot(n, ray.direction);
  if (Math.abs(denom) < 1e-9) return null;
  const t = dot(n, sub(plane.origin, ray.origin)) / denom;
  if (!Number.isFinite(t) || t <= 0) return null;
  return add(ray.origin, mul(ray.direction, t));
}

// ---- the camera's pose, held with view ink ---------------------------------

/**
 * Where the camera stood. A screen path means nothing without it, so every
 * stroke keeps one (invariant 4: "the log is the source" — screen path + pose
 * kept with the stroke, so any plane is derivable from either later). View
 * ink is held with its pose besides, because a view plane only exists from
 * the view it was drawn on (§3, "art … held with the camera pose it was drawn
 * at, drawn faint from other angles, sharp from its own").
 */
export interface Pose {
  position: Vec3;
  target: Vec3;
  up: Vec3;
  /** Vertical field of view, degrees — a ray-caster cannot be rebuilt without it. */
  fov: number;
  aspect: number;
  /**
   * The frustum height, when the camera that held this pose was ORTHOGRAPHIC.
   * Absent means perspective, which is what every pose held before the
   * projection could be toggled — so old ink rebuilds its ray-caster exactly
   * as it always did, and ink drawn in ortho rebuilds an ortho one.
   */
  ortho?: number;
}

/** The angle, in degrees, between where two poses look. */
export function poseAngle(a: Pose, b: Pose): number {
  const la = normalize(sub(a.target, a.position));
  const lb = normalize(sub(b.target, b.position));
  const c = Math.max(-1, Math.min(1, dot(la, lb)));
  return (Math.acos(c) * 180) / Math.PI;
}

/** How face-on a plane is to a look direction: 1 flat on, 0 edge-on. */
export function facing(plane: Plane, look: Vec3): number {
  return Math.abs(dot(normalize(plane.normal), normalize(look)));
}

// ---- the scale the hand worked at ------------------------------------------

/** Turns a screen point into a world ray. The scene's camera, as a function. */
export type RayCaster = (screen: Point) => Ray;

/**
 * Plane units per screen pixel at the pen — the `scale` the engine's
 * thresholds are read in (CLAUDE.md: "fixed pixel thresholds are about the
 * HAND, not the world"). Under perspective it varies with depth, so it is
 * measured where the pen is and logged with the stroke.
 *
 * Measured, not derived from the projection matrix: two screen points a pixel
 * apart are cast onto the plane and the distance between the hits is the
 * answer. That holds for any camera, including an oblique view of a plane
 * where the two axes stretch differently — the mean of the two is taken,
 * because the engine's scale is one number.
 */
export function scaleAt(plane: Plane, ray: RayCaster, screen: Point, delta = 1): number {
  const at = rayPlane(ray(screen), plane);
  const dx = rayPlane(ray({ x: screen.x + delta, y: screen.y }), plane);
  const dy = rayPlane(ray({ x: screen.x, y: screen.y + delta }), plane);
  if (!at || !dx || !dy) return 1;
  const su = length(sub(dx, at)) / delta;
  const sv = length(sub(dy, at)) / delta;
  const s = (su + sv) / 2;
  return Number.isFinite(s) && s > 0 ? s : 1;
}

// ---- the three named planes ------------------------------------------------

/**
 * The foundation: the ground, XZ, normal +Y. Drawing down the screen from a
 * camera in front of and above the origin runs +v toward the viewer (+Z), so
 * +u is +X — right on screen.
 */
export function foundation(source: PlaneSource = 'chosen', why = 'the foundation tile was held when the pen went down'): Plane {
  return { origin: v3(0, 0, 0), normal: v3(0, 1, 0), up: v3(0, 0, 1), source, name: 'foundation', why };
}

/** The height plane: XY, normal +Z — the wall you face. */
export function height(source: PlaneSource = 'chosen', why = 'the height tile was held when the pen went down'): Plane {
  return { origin: v3(0, 0, 0), normal: v3(0, 0, 1), up: v3(0, -1, 0), source, name: 'height', why };
}

/** The width plane: YZ, normal +X — the wall on your right. */
export function width(source: PlaneSource = 'chosen', why = 'the width tile was held when the pen went down'): Plane {
  return { origin: v3(0, 0, 0), normal: v3(1, 0, 0), up: v3(0, -1, 0), source, name: 'width', why };
}

export type PlaneName = 'foundation' | 'height' | 'width';

export const NAMED: Record<PlaneName, (source?: PlaneSource, why?: string) => Plane> = {
  foundation,
  height,
  width,
};

/** The three, in the order the gizmo shows them. */
export const PLANE_NAMES: PlaneName[] = ['foundation', 'height', 'width'];

// ---- the seam P1 extends ---------------------------------------------------

export interface PenState {
  /** The tile held, if any. */
  chosen: PlaneName | null;
  /**
   * Why that plane is the chosen one, when it was not a tile that said so —
   * an axis view chooses the plane it faces (16 September 2026), and the ink
   * must not claim a tile nobody held. Absent means the tile.
   */
  why?: string;
  /** How far the chosen plane has been slid along its normal. */
  offset: number;
  /**
   * The planes the evidence offers when nothing is chosen, best-first as
   * `planarity.pickAtPenDown` ranked them. Only the TYPE crosses this seam —
   * `planarity.ts` imports the geometry from here, never the other way round,
   * so there is no cycle at run time.
   */
  candidates?: PlaneCandidate[];
}

/**
 * Which plane a stroke lands on — ONE function, so the read planes extend a
 * decision that already exists rather than inventing a second one.
 *
 * A CHOSEN plane is a decision and wins outright (§2.1: blessed by the act).
 * With nothing chosen the plane is READ, and the candidates the scorer built
 * at pen-down arrive here already ranked; the first is the one the stroke is
 * projected live onto. With no candidates at all — a camera that can draw on
 * nothing — the ground is still the answer rather than a refused stroke.
 */
export function planeForPenDown(state: PenState): Plane {
  if (state.chosen) {
    const p = NAMED[state.chosen](
      'chosen',
      state.why ?? `the ${state.chosen} tile was held when the pen went down`
    );
    return state.offset ? slide(p, state.offset) : p;
  }
  const read = state.candidates?.[0];
  if (read) return read.plane;
  return foundation('world', 'nothing was chosen, and the evidence offered no plane — the ground is the fallback');
}

/** One line for the panel and the status: the plane, its source, and why. */
export function describePlane(plane: Plane): string {
  return `${plane.name ?? 'plane'} · ${plane.source}`;
}

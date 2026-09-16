// ===== view =====
// The camera's own compass, as pure arithmetic (§7: "the three canonical views
// a tap away, the pinned views as chips").
//
// `gizmo.ts` is how a plane is CHOSEN; this is how the camera is MOVED, and the
// two are different questions that happen to share a word. Everything here is
// numbers — the six axis poses, the flip to the other side, framing a bounds,
// the depth order of the compass's balls, and the ortho height that makes the
// projection toggle not jump — so it tests headlessly, with no WebGL anywhere
// near it, exactly as `plane.ts` and `planarity.ts` do.
//
// World convention, as the shard has it: **Y is up**. So the foundation (XZ)
// is seen flat on from the TOP, the height plane (XY) from the FRONT, and the
// width plane (YZ) from the RIGHT. Each ball's `up` is picked so that the
// plane it faces reads in its own canonical orientation — +u right on screen
// and +v down it, which is the same rule `plane.ts` chose its axes by, and the
// reason a letter drawn on the ground is not upside down from above.

import {
  add,
  cross,
  dot,
  mul,
  normalize,
  sub,
  v3,
  type PlaneName,
  type Pose,
  type Vec3,
} from './plane';
import { FACING_FLOOR } from './planarity';

export type Axis = 'x' | 'y' | 'z';

/** The six sides. Closed, like every other vocabulary here. */
export type AxisView = 'right' | 'left' | 'top' | 'bottom' | 'front' | 'back';

/** In the order the compass names them: the three positives, then their backs. */
export const AXIS_VIEWS: AxisView[] = ['right', 'top', 'front', 'left', 'bottom', 'back'];

/** Which way the camera stands FROM its target, per view. Unit. */
export const VIEW_DIR: Record<AxisView, Vec3> = {
  right: v3(1, 0, 0),
  left: v3(-1, 0, 0),
  top: v3(0, 1, 0),
  bottom: v3(0, -1, 0),
  front: v3(0, 0, 1),
  back: v3(0, 0, -1),
};

/**
 * Which way is up on screen, per view.
 *
 * Y for the four sides. Looking straight down or straight up there is no such
 * thing as "Y up", so the top view takes −Z (which puts +X to the right and
 * +Z down the screen — the foundation plane's own (u, v) frame, so a plan
 * drawn on the ground reads the right way round from above) and the bottom
 * view takes its mirror.
 */
export const VIEW_UP: Record<AxisView, Vec3> = {
  right: v3(0, 1, 0),
  left: v3(0, 1, 0),
  top: v3(0, 0, -1),
  bottom: v3(0, 0, 1),
  front: v3(0, 1, 0),
  back: v3(0, 1, 0),
};

const OPPOSITE: Record<AxisView, AxisView> = {
  right: 'left',
  left: 'right',
  top: 'bottom',
  bottom: 'top',
  front: 'back',
  back: 'front',
};

/** The other side of the same axis — Blender's second tap on a ball. */
export function opposite(view: AxisView): AxisView {
  return OPPOSITE[view];
}

const AXIS_OF: Record<AxisView, { axis: Axis; negative: boolean }> = {
  right: { axis: 'x', negative: false },
  left: { axis: 'x', negative: true },
  top: { axis: 'y', negative: false },
  bottom: { axis: 'y', negative: true },
  front: { axis: 'z', negative: false },
  back: { axis: 'z', negative: true },
};

export function axisOf(view: AxisView): { axis: Axis; negative: boolean } {
  return AXIS_OF[view];
}

export function viewForAxis(axis: Axis, negative = false): AxisView {
  const found = AXIS_VIEWS.find((v) => AXIS_OF[v].axis === axis && AXIS_OF[v].negative === negative);
  return found as AxisView;
}

// ---- the compass and the plane picker agree --------------------------------

const PLANE_VIEW: Record<PlaneName, AxisView> = {
  foundation: 'top', // XZ, seen from +Y
  height: 'front', // XY, seen from +Z
  width: 'right', // YZ, seen from +X
};

/** The view that faces a chosen plane flat on. One tap on that ball. */
export function viewFacingPlane(name: PlaneName): AxisView {
  return PLANE_VIEW[name];
}

/** The plane a ball's view faces — both sides of an axis face the same plane. */
export function planeFacedBy(view: AxisView): PlaneName {
  const { axis } = AXIS_OF[view];
  return axis === 'y' ? 'foundation' : axis === 'z' ? 'height' : 'width';
}

/** The normal of one of the three named planes. */
export function planeNormal(name: PlaneName): Vec3 {
  return name === 'foundation' ? v3(0, 1, 0) : name === 'height' ? v3(0, 0, 1) : v3(1, 0, 0);
}

/**
 * How flat-on a named plane would be from a look direction: 1 flat on, 0 edge
 * on. The same term the planarity scorer measures (`facing`), asked of the
 * camera rather than of a candidate.
 */
export function facingFrom(name: PlaneName, look: Vec3): number {
  return Math.abs(dot(planeNormal(name), normalize(look)));
}

/**
 * Below the scorer's own floor a plane is too oblique to draw on. A camera
 * move must never land there silently — §10's last risk, said out loud in the
 * status line rather than discovered by drawing a stroke that goes nowhere.
 */
export function tooOblique(name: PlaneName, look: Vec3): boolean {
  return facingFrom(name, look) < FACING_FLOOR;
}

// ---- the six poses ---------------------------------------------------------

export interface PoseOptions {
  target: Vec3;
  dist: number;
  fov: number;
  aspect: number;
  /** The ortho frustum height, when the camera is orthographic. */
  ortho?: number;
}

/**
 * A canonical view, keeping the target and the distance the camera already
 * has. A snap is a turn, not a re-frame: what you were looking at stays what
 * you are looking at, seen from the side.
 */
export function poseForAxis(view: AxisView, o: PoseOptions): Pose {
  const dir = VIEW_DIR[view];
  const dist = Math.max(0.5, o.dist);
  return {
    position: add(o.target, mul(dir, dist)),
    target: o.target,
    up: VIEW_UP[view],
    fov: o.fov,
    aspect: o.aspect,
    ...(o.ortho !== undefined ? { ortho: o.ortho } : {}),
  };
}

/** Which axis view a pose is already at, within a tolerance, or null. */
export function viewOfPose(pose: Pose, withinDeg = 3): AxisView | null {
  const d = normalize(sub(pose.position, pose.target));
  const cos = Math.cos((withinDeg * Math.PI) / 180);
  for (const v of AXIS_VIEWS) if (dot(d, VIEW_DIR[v]) >= cos) return v;
  return null;
}

// ---- framing ---------------------------------------------------------------

export interface Bounds3 {
  min: Vec3;
  max: Vec3;
}

export function boundsOf(points: Vec3[]): Bounds3 | null {
  if (!points.length) return null;
  const min = v3(Infinity, Infinity, Infinity);
  const max = v3(-Infinity, -Infinity, -Infinity);
  for (const p of points) {
    min.x = Math.min(min.x, p.x); max.x = Math.max(max.x, p.x);
    min.y = Math.min(min.y, p.y); max.y = Math.max(max.y, p.y);
    min.z = Math.min(min.z, p.z); max.z = Math.max(max.z, p.z);
  }
  return { min, max };
}

export function unionBounds(a: Bounds3 | null, b: Bounds3 | null): Bounds3 | null {
  if (!a) return b;
  if (!b) return a;
  return {
    min: v3(Math.min(a.min.x, b.min.x), Math.min(a.min.y, b.min.y), Math.min(a.min.z, b.min.z)),
    max: v3(Math.max(a.max.x, b.max.x), Math.max(a.max.y, b.max.y), Math.max(a.max.z, b.max.z)),
  };
}

export const centreOf = (b: Bounds3): Vec3 =>
  v3((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, (b.min.z + b.max.z) / 2);

/** Half the diagonal: the radius of the sphere that holds the box, at any angle. */
export const radiusOf = (b: Bounds3): number =>
  Math.max(1e-4, 0.5 * Math.hypot(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z));

/** How much air is left around a framed thing. */
export const FRAME_MARGIN = 1.18;

/**
 * The pose that fits a bounds, for this camera's fov and aspect — and the
 * ortho height that fits the same thing, so the persp/ortho tile can be
 * pressed before or after *home* and see the same picture.
 *
 * The bounding SPHERE is what is fitted, not the box: a box framed by its own
 * extents falls out of frame the moment the camera turns, and the whole point
 * of a compass is that it turns.
 */
export function frameFor(
  b: Bounds3,
  o: { fov: number; aspect: number; margin?: number }
): { target: Vec3; dist: number; ortho: number } {
  const r = radiusOf(b) * (o.margin ?? FRAME_MARGIN);
  const halfV = (Math.max(1, o.fov) * Math.PI) / 360;
  const aspect = o.aspect > 0 ? o.aspect : 1;
  const halfH = Math.atan(Math.tan(halfV) * aspect);
  const half = Math.max(1e-3, Math.min(halfV, halfH));
  const dist = Math.max(0.5, r / Math.sin(half));
  return { target: centreOf(b), dist, ortho: orthoHeightFor(dist, o.fov) };
}

/**
 * The height of the perspective frustum AT the target — the ortho box that
 * shows the same thing at the same size. This is the whole of "the toggle does
 * not jump": switch either way through this and the picture stays put, except
 * for the convergence itself, which is what was asked for.
 */
export function orthoHeightFor(dist: number, fov: number): number {
  return 2 * Math.max(0.5, dist) * Math.tan((Math.max(1, fov) * Math.PI) / 360);
}

/** Its inverse: the distance at which a perspective camera frames that height. */
export function distForOrthoHeight(height: number, fov: number): number {
  return Math.max(0.5, height / (2 * Math.tan((Math.max(1, fov) * Math.PI) / 360)));
}

// ---- the compass itself ----------------------------------------------------

export interface Ball {
  view: AxisView;
  axis: Axis;
  negative: boolean;
  /** `X` / `Y` / `Z` on the positive ends; the negatives are hollow and bare. */
  label: string;
  /** Where the ball sits in the widget, in −1 … 1, **y already down the screen**. */
  x: number;
  y: number;
  /** Along the view direction: bigger is farther from the eye. */
  depth: number;
}

/**
 * The six balls as the compass shows them from a pose, **farthest first** — so
 * a painter drawing them in order gets the near ones over the far ones with no
 * z-buffer and no second scene. This is the whole of "it turns with the
 * camera": the axes are projected onto the camera's own screen basis.
 */
export function balls(pose: Pose): Ball[] {
  const forward = normalize(sub(pose.target, pose.position));
  let up = normalize(pose.up);
  // A pose looking straight along its own up has no screen basis; nudge rather
  // than return NaN, which is how a compass becomes invisible at the poles.
  if (Math.abs(dot(forward, up)) > 0.999) up = Math.abs(forward.y) > 0.9 ? v3(0, 0, -1) : v3(0, 1, 0);
  const right = normalize(cross(forward, up));
  const screenUp = cross(right, forward);
  const out: Ball[] = AXIS_VIEWS.map((view) => {
    const d = VIEW_DIR[view];
    const { axis, negative } = AXIS_OF[view];
    return {
      view,
      axis,
      negative,
      label: negative ? '' : axis.toUpperCase(),
      x: dot(d, right),
      y: -dot(d, screenUp),
      depth: dot(d, forward),
    };
  });
  return out.sort((a, b) => b.depth - a.depth);
}

/** A ball's size, so a near one reads nearer than a far one. */
export function ballScale(depth: number, near = 1, far = 0.66): number {
  const k = (1 - depth) / 2; // depth 1 (far) → 0, depth −1 (near) → 1
  return far + (near - far) * Math.max(0, Math.min(1, k));
}

/** The name a ball is known by, for its tooltip. */
export function labelFor(view: AxisView): string {
  return view;
}

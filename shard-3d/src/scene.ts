// ===== scene =====
// The space: a three.js scene on the paper ground, a camera that is either
// perspective or orthographic, and the orbit / draw split.
//
// ORBIT is the right button, a drag on the navigation gizmo, or a drag with
// Space held. DRAW is the left button and one finger. PAN is the middle
// button, shift + the right button, or two fingers. §3: "orbit is two fingers,
// or the right button, or a held modifier; one finger and the left button
// draw." The split is here so that ink.ts never has to ask whether a drag was
// meant as a camera move.
//
// TRACKPAD and TOUCH take Blender's map, and what each gesture means is read
// by `gesture.ts`, which is pure: a two-finger swipe orbits, `Shift` + swipe
// pans, a pinch or `Ctrl`/`Cmd` + swipe dollies; on a screen, two fingers
// pinch or orbit and three pan. A mouse wheel keeps the dolly it always had.
// This file is left holding the listeners and nothing else — every threshold
// and every sign is named and tested over there.

import * as THREE from 'three';
import type { Colours } from './theme';
import type { Point } from 'metamedium-core';
import { v3, type Pose, type Ray, type Vec3 } from './plane';
import {
  distForOrthoHeight,
  frameFor,
  orbitBy,
  orthoHeightFor,
  poseForAxis,
  type AxisView,
  type Bounds3,
} from './view';
import {
  noTouchMemory,
  noWheelMemory,
  readTouch,
  readWheel,
  type TouchMemory,
  type TouchPoint,
  type WheelMemory,
} from './gesture';

export type Projection = 'persp' | 'ortho';

export interface Space {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  /** The camera as it stands — perspective or orthographic, live. */
  readonly camera: THREE.Camera;
  canvas: HTMLCanvasElement;
  /** A screen point as a world ray — the camera as a function, for plane.ts. */
  rayFor(screen: Point): Ray;
  /**
   * The same, from a POSE the log holds rather than from where the camera is
   * now — what makes a stroke's screen path re-projectable onto another plane
   * long after the camera has moved (the runner-up chip's flip).
   */
  rayForPose(pose: Pose, screen: Point): Ray;
  /** Where the camera stands, as the log holds it. */
  pose(): Pose;
  /** Ease the camera back to a pose — the pinned-views chip, and the compass. */
  easeTo(pose: Pose, ms?: number): void;
  /** A world point as a screen point. */
  project(world: Vec3): Point;
  /**
   * The same, under a POSE the log holds. A scratch's crossings are counted in
   * the view the stroke was drawn in, not in whatever view the camera has
   * wandered to since — so the silhouette it is counted against is projected
   * through the same spare camera the flip re-projects through.
   */
  projectForPose(pose: Pose, world: Vec3): Point;
  /** The direction the camera looks. */
  look(): Vec3;
  /** The camera's own up — a plane's v axis is read off it. */
  up(): Vec3;
  paint(colours: Colours): void;
  render(): void;
  /** Frame the camera on one of the canonical views. */
  view(which: 'free' | 'top' | 'front' | 'side'): void;
  /** True while the camera is being dragged, so a pen-down is not ink. */
  orbiting(): boolean;
  /** Called on every camera change, so the chrome can re-place itself. */
  onChange(fn: () => void): void;
  /**
   * Called when a stroke in progress turns out to have been the first finger
   * of a camera gesture — **drop it, do not finish it**.
   *
   * A touch screen has no way to know that a second finger is coming, so one
   * finger has already been drawing for a moment by the time it lands. Ending
   * that stroke the ordinary way would leave a stray mark on the board after
   * every pinch. The scene is the only thing that sees the second finger, and
   * `ink.ts` is the only thing that holds the live stroke, so this is the seam
   * between them; `pointercancel` could not carry it, because a real
   * `pointercancel` means the pen was taken away mid-stroke and that stroke is
   * still the hand's.
   */
  onAbandon(fn: () => void): void;
  target: THREE.Vector3;

  // ---- the navigation gizmo drives these ----------------------------------
  /**
   * Turn by hand, in radians — what a drag on the compass does.
   *
   * Around the TARGET unless a pivot is given, in which case the camera and
   * the target turn rigidly about it and the pivot stays under its own pixel.
   */
  turn(dTheta: number, dPhi: number, pivot?: Vec3 | null): void;
  /** Slide the target across the screen plane, in screen pixels. */
  pan(dxPx: number, dyPx: number): void;
  /** Dolly by a factor, toward a screen point when one is given. */
  dolly(factor: number, at?: Point): void;
  /** How far the camera stands from its target. */
  distance(): number;
  /** The vertical field of view, degrees — perspective's, always. */
  fov(): number;
  aspect(): number;
  /** Ease onto one of the six axis views, keeping the target and the distance. */
  snap(view: AxisView, ms?: number): void;
  /** Ease to a pose that fits a bounds — *home*. */
  frame(bounds: Bounds3, ms?: number): void;
  projection(): Projection;
  /**
   * Swap the projection **without moving the picture**: the ortho frustum is
   * the perspective frustum's height at the target, and back the other way.
   */
  setProjection(p: Projection): void;
  /**
   * What a camera move should happen AROUND, asked at the moment it starts.
   *
   * The scene knows about neither selections nor solids, so it asks — and it
   * says WHY it is asking, because the two answers differ: an ORBIT turns
   * around the selection when there is one (you are working on that thing)
   * and around the target otherwise, while a DOLLY goes toward whatever is
   * under the pointer, selected or not (you are pointing at where you want to
   * be). Answering both with "the selection" is how a wheel over the corner of
   * a thing sails past it. A null answer is the ordinary one for an orbit: the
   * target is the centre the hand panned to, and a turn keeps it.
   */
  setPivot(fn: (screen: Point, why: 'orbit' | 'dolly') => Vec3 | null): void;
}

const DEFAULT_PHI = Math.PI * 0.32; // a little above the horizon
const DEFAULT_THETA = Math.PI * 0.22;
const DEFAULT_DIST = 15;
const FOV = 45;

/**
 * How near the pole the camera may stand. Exactly overhead there is no "up"
 * and `lookAt` is degenerate — a hundredth of a degree short of it is the same
 * picture and a stable one, and it is what makes the compass's TOP ball a
 * real top view rather than the 83° the old drag clamp allowed.
 */
const POLE = Math.PI / 2 - 0.002;
/** How far a *drag* may climb: the pole is reachable by the compass, not by hand. */
const DRAG_POLE = 1.45;

export function createSpace(host: HTMLElement, colours: Colours): Space {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const canvas = renderer.domElement;
  canvas.className = 'stage';
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const persp = new THREE.PerspectiveCamera(FOV, 1, 0.05, 500);
  // The orthographic twin. Its frustum is symmetric about the camera's own
  // plane (`near = −far`), which keeps a ray cast through it starting exactly
  // where a perspective ray would — at the eye — so `rayPlane`'s "not behind
  // me" rule means the same thing under both projections.
  const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, -500, 500);
  let projection: Projection = 'persp';
  let orthoHeight = orthoHeightFor(DEFAULT_DIST, FOV);
  const cam = (): THREE.PerspectiveCamera | THREE.OrthographicCamera =>
    projection === 'ortho' ? orthoCam : persp;

  const target = new THREE.Vector3(0, 0, 0);

  // Spherical orbit, held by hand rather than by OrbitControls: the shard
  // needs the button split above, and sixty lines is cheaper than fighting a
  // controller's own idea of which gesture is which.
  let dist = DEFAULT_DIST;
  let theta = DEFAULT_THETA; // around Y
  let phi = DEFAULT_PHI; // from the ground plane, up
  let dragging: 'orbit' | 'pan' | null = null;
  /** What the orbit in progress turns about. Null is the target. */
  let orbitPivot: Vec3 | null = null;
  let spaceHeld = false;
  let pivotFn: ((screen: Point, why: 'orbit' | 'dolly') => Vec3 | null) | null = null;
  const changeFns: (() => void)[] = [];
  const emit = () => changeFns.forEach((f) => f());
  const abandonFns: (() => void)[] = [];
  const abandon = () => abandonFns.forEach((f) => f());

  function place() {
    const r = Math.max(0.5, dist);
    const pos = new THREE.Vector3(
      target.x + r * Math.cos(phi) * Math.sin(theta),
      target.y + r * Math.sin(phi),
      target.z + r * Math.cos(phi) * Math.cos(theta)
    );
    // Both cameras stand in the same place, so the projection tile swaps the
    // lens and nothing else — there is no second pose to keep in step.
    for (const c of [persp, orthoCam] as THREE.Camera[]) {
      c.position.copy(pos);
      c.lookAt(target);
    }
    const aspect = persp.aspect || 1;
    const halfH = orthoHeight / 2;
    orthoCam.top = halfH;
    orthoCam.bottom = -halfH;
    orthoCam.right = halfH * aspect;
    orthoCam.left = -halfH * aspect;
    const reach = r * 4 + 100;
    orthoCam.near = -reach;
    orthoCam.far = reach;
    orthoCam.updateProjectionMatrix();
    persp.updateMatrixWorld();
    orthoCam.updateMatrixWorld();
  }

  // ---- the ground ----------------------------------------------------------
  const grid = new THREE.GridHelper(20, 20);
  const gridMat = grid.material as THREE.Material & { opacity: number; transparent: boolean };
  gridMat.transparent = true;
  gridMat.opacity = 0.5;
  grid.renderOrder = -1;
  scene.add(grid);

  // Light enough to see the ink against; the space itself makes no claim.
  //
  // The levels are set so a face of `--paper-dk` comes back ON the paper it
  // was named for — three's lighting is physically correct, so an ambient of
  // 0.9 renders the recessed ground token as slate and the solids would read
  // as a material nobody chose. A key and a fill from opposite sides keep the
  // faces of a box told apart without any of them going to white.
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  key.position.set(4, 8, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.9);
  fill.position.set(-6, 2, -5);
  scene.add(fill);

  function paint(c: Colours) {
    scene.background = new THREE.Color(c.paper);
    const line = new THREE.Color(c.grid);
    const g = grid as unknown as { geometry: THREE.BufferGeometry };
    const attr = g.geometry.getAttribute('color') as THREE.BufferAttribute | undefined;
    if (attr) {
      for (let i = 0; i < attr.count; i++) attr.setXYZ(i, line.r, line.g, line.b);
      attr.needsUpdate = true;
    }
  }
  paint(colours);

  function resize() {
    // Never zero. A tab that has not been laid out yet reports a host of no
    // size, and an aspect of 0 makes the projection matrix NaN — after which
    // every ray, every projected point and every stroke is NaN, silently. Found
    // by opening the shard in a background tab.
    const w = Math.max(1, host.clientWidth || window.innerWidth || 1);
    const h = Math.max(1, host.clientHeight || window.innerHeight || 1);
    renderer.setSize(w, h, false);
    persp.aspect = w / h;
    persp.updateProjectionMatrix();
    place();
    render();
  }

  function render() {
    renderer.render(scene, cam());
  }

  // ---- the camera as a function --------------------------------------------
  // plane.ts is pure, so it takes the camera as a ray caster rather than an
  // import. This is also what `scaleAt` measures through.
  function ndcOf(screen: Point): THREE.Vector2 {
    const rect = canvas.getBoundingClientRect();
    return new THREE.Vector2(
      ((screen.x - rect.left) / rect.width) * 2 - 1,
      -((screen.y - rect.top) / rect.height) * 2 + 1
    );
  }

  function rayThrough(c: THREE.Camera, screen: Point): Ray {
    const caster = new THREE.Raycaster();
    caster.setFromCamera(ndcOf(screen), c);
    const o = caster.ray.origin;
    const d = caster.ray.direction;
    return { origin: v3(o.x, o.y, o.z), direction: v3(d.x, d.y, d.z) };
  }

  function rayFor(screen: Point): Ray {
    return rayThrough(cam(), screen);
  }

  function look(): Vec3 {
    const d = new THREE.Vector3();
    cam().getWorldDirection(d);
    return v3(d.x, d.y, d.z);
  }

  function up(): Vec3 {
    const c = cam();
    const u = c.up.clone().applyQuaternion(c.quaternion).normalize();
    return v3(u.x, u.y, u.z);
  }

  function pose(): Pose {
    const c = cam();
    return {
      position: v3(c.position.x, c.position.y, c.position.z),
      target: v3(target.x, target.y, target.z),
      up: up(),
      fov: persp.fov,
      aspect: persp.aspect,
      // A pose is only rebuildable if it says which lens took it.
      ...(projection === 'ortho' ? { ortho: orthoHeight } : {}),
    };
  }

  /**
   * A ray from a pose the log holds, not from where the camera is now.
   *
   * A stroke's screen path is only meaningful under the camera it was drawn
   * with, so re-projecting it onto another plane — which is what the chip's
   * flip does, possibly minutes later — has to rebuild that camera. A spare
   * camera is placed at the pose and cast through; nothing about the live
   * camera moves. The spare is orthographic when the pose was taken through
   * the ortho lens, because under ortho every ray is parallel and a
   * perspective stand-in would fan them.
   */
  const spare = new THREE.PerspectiveCamera(FOV, 1, 0.05, 500);
  const spareOrtho = new THREE.OrthographicCamera(-1, 1, 1, -1, -500, 500);
  function standSpare(p: Pose): THREE.Camera {
    const c: THREE.Camera = p.ortho ? spareOrtho : spare;
    if (p.ortho) {
      const halfH = p.ortho / 2;
      spareOrtho.top = halfH;
      spareOrtho.bottom = -halfH;
      spareOrtho.right = halfH * (p.aspect || 1);
      spareOrtho.left = -halfH * (p.aspect || 1);
      spareOrtho.near = -500;
      spareOrtho.far = 500;
    } else {
      spare.fov = p.fov;
      spare.aspect = p.aspect;
    }
    c.position.set(p.position.x, p.position.y, p.position.z);
    c.up.set(p.up.x, p.up.y, p.up.z);
    c.lookAt(p.target.x, p.target.y, p.target.z);
    (c as THREE.PerspectiveCamera).updateProjectionMatrix();
    c.updateMatrixWorld(true);
    return c;
  }
  function rayForPose(p: Pose, screen: Point): Ray {
    return rayThrough(standSpare(p), screen);
  }

  function projectWith(c: THREE.Camera, world: Vec3): Point {
    const v = new THREE.Vector3(world.x, world.y, world.z).project(c);
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + ((v.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - v.y) / 2) * rect.height,
    };
  }

  function project(world: Vec3): Point {
    return projectWith(cam(), world);
  }

  function projectForPose(p: Pose, world: Vec3): Point {
    return projectWith(standSpare(p), world);
  }

  /**
   * Ease back to a pinned view, or onto a compass ball. The camera is
   * spherical, so a pose comes back as (target, distance, theta, phi) and the
   * three are interpolated — which keeps the return on the same arc an orbit
   * travels, rather than sliding through the ground. One easing for every
   * camera move the chrome starts: there is no second curve anywhere.
   */
  let easing: number | null = null;
  function easeTo(p: Pose, ms = 420) {
    const d = new THREE.Vector3(
      p.position.x - p.target.x,
      p.position.y - p.target.y,
      p.position.z - p.target.z
    );
    const toDist = Math.max(0.5, d.length());
    // Clamped just short of the pole: a pose asking for exactly overhead is a
    // top view, and `lookAt` cannot build a frame there.
    const toPhi = Math.max(-POLE, Math.min(POLE, Math.asin(Math.max(-1, Math.min(1, d.y / toDist)))));
    let toTheta = Math.atan2(d.x, d.z);
    // Take the short way round, rather than unwinding a whole turn.
    while (toTheta - theta > Math.PI) toTheta -= Math.PI * 2;
    while (toTheta - theta < -Math.PI) toTheta += Math.PI * 2;
    const from = { dist, theta, phi, target: target.clone(), ortho: orthoHeight };
    const toOrtho = p.ortho ?? orthoHeightFor(toDist, persp.fov);
    const to = new THREE.Vector3(p.target.x, p.target.y, p.target.z);
    const t0 = performance.now();
    if (easing !== null) cancelAnimationFrame(easing);
    // `ms <= 0` is "be there now" — the viewcube, and the e2e, which cannot
    // wait on frames to assert what the camera is.
    if (ms <= 0) {
      dist = toDist;
      theta = toTheta;
      phi = toPhi;
      orthoHeight = toOrtho;
      target.copy(to);
      place();
      emit();
      render();
      return;
    }
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // ease in-out
      dist = from.dist + (toDist - from.dist) * e;
      theta = from.theta + (toTheta - from.theta) * e;
      phi = from.phi + (toPhi - from.phi) * e;
      orthoHeight = from.ortho + (toOrtho - from.ortho) * e;
      target.copy(from.target).lerp(to, e);
      place();
      emit();
      render();
      easing = k < 1 ? requestAnimationFrame(tick) : null;
    };
    tick();
  }

  // ---- moving the camera by hand -------------------------------------------

  /**
   * Turn. **Around the target** by default — the centre the hand panned to, so
   * an orbit after a pan turns about where the hand is looking and the view's
   * translation survives it. Around a pivot when one is given, rigidly: the
   * arithmetic is `orbitBy`, and it is tested there.
   */
  function turn(dTheta: number, dPhi: number, pivot?: Vec3 | null) {
    const next = orbitBy(
      { target: v3(target.x, target.y, target.z), theta, phi },
      dTheta,
      dPhi,
      pivot ?? null,
      DRAG_POLE
    );
    theta = next.theta;
    phi = next.phi;
    target.set(next.target.x, next.target.y, next.target.z);
    place();
    emit();
    render();
  }

  /** World units per screen pixel at the target — what a pan is measured in. */
  function unitsPerPixel(): number {
    const h = Math.max(1, canvas.getBoundingClientRect().height);
    return (projection === 'ortho' ? orthoHeight : orthoHeightFor(dist, persp.fov)) / h;
  }

  function pan(dxPx: number, dyPx: number) {
    const c = cam();
    const right = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 0);
    const upv = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 1);
    const k = unitsPerPixel();
    target.addScaledVector(right, -dxPx * k);
    target.addScaledVector(upv, dyPx * k);
    place();
    emit();
    render();
  }

  /**
   * Dolly, **toward the pointer** rather than toward the middle of the screen.
   *
   * The focus is whatever the pointer is over, else the point of the screen
   * plane through the target under it. Scaling the camera's offset FROM that
   * focus by the same factor as the distance leaves the pixel under the
   * pointer where it was — which is why a wheel over a corner of a thing
   * arrives at that corner instead of sliding it off the screen.
   */
  function dolly(factor: number, at?: Point) {
    const before = Math.max(0.5, Math.min(120, dist));
    const after = Math.max(0.5, Math.min(120, dist * factor));
    const k = after / before;
    if (at) {
      const focus = focusUnder(at);
      if (focus) {
        target.set(
          focus.x + (target.x - focus.x) * k,
          focus.y + (target.y - focus.y) * k,
          focus.z + (target.z - focus.z) * k
        );
      }
    }
    dist = after;
    // Under ortho there is no distance to travel: the lens narrows instead,
    // by the same factor, so the wheel means one thing under both projections.
    if (projection === 'ortho') orthoHeight = Math.max(0.05, orthoHeight * k);
    place();
    emit();
    render();
  }

  /** What the pointer is over, else the screen plane through the target. */
  function focusUnder(at: Point): Vec3 | null {
    const hit = pivotFn?.(at, 'dolly') ?? null;
    if (hit) return hit;
    const r = rayFor(at);
    const n = look();
    const denom = n.x * r.direction.x + n.y * r.direction.y + n.z * r.direction.z;
    if (Math.abs(denom) < 1e-9) return null;
    const t =
      (n.x * (target.x - r.origin.x) + n.y * (target.y - r.origin.y) + n.z * (target.z - r.origin.z)) / denom;
    if (!Number.isFinite(t)) return null;
    return v3(r.origin.x + r.direction.x * t, r.origin.y + r.direction.y * t, r.origin.z + r.direction.z * t);
  }

  function snap(view: AxisView, ms = 420) {
    easeTo(
      poseForAxis(view, {
        target: v3(target.x, target.y, target.z),
        dist,
        fov: persp.fov,
        aspect: persp.aspect,
        ...(projection === 'ortho' ? { ortho: orthoHeight } : {}),
      }),
      ms
    );
  }

  function frame(bounds: Bounds3, ms = 420) {
    const fit = frameFor(bounds, { fov: persp.fov, aspect: persp.aspect });
    const d = new THREE.Vector3(
      Math.cos(phi) * Math.sin(theta),
      Math.sin(phi),
      Math.cos(phi) * Math.cos(theta)
    ).multiplyScalar(Math.min(120, fit.dist));
    easeTo(
      {
        position: v3(fit.target.x + d.x, fit.target.y + d.y, fit.target.z + d.z),
        target: fit.target,
        up: v3(0, 1, 0),
        fov: persp.fov,
        aspect: persp.aspect,
        ...(projection === 'ortho' ? { ortho: fit.ortho } : {}),
      },
      ms
    );
  }

  function setProjection(p: Projection) {
    if (p === projection) return;
    // The picture does not jump: going to ortho, the frustum height is the
    // perspective one AT THE TARGET; coming back, the distance is the one that
    // frames that height. Either direction is the other's inverse.
    if (p === 'ortho') orthoHeight = orthoHeightFor(dist, persp.fov);
    else dist = Math.max(0.5, Math.min(120, distForOrthoHeight(orthoHeight, persp.fov)));
    projection = p;
    place();
    emit();
    render();
  }

  // ---- the split -----------------------------------------------------------
  let last = { x: 0, y: 0 };
  let touches = 0;
  let wheelMemory: WheelMemory = noWheelMemory();
  let touchMemory: TouchMemory = noTouchMemory();

  function wantsCamera(e: PointerEvent): 'orbit' | 'pan' | null {
    if (e.pointerType === 'touch') return null; // touch is handled by touchmove
    if (e.button === 1) return 'pan';
    if (e.button === 2) return e.shiftKey ? 'pan' : 'orbit';
    if (spaceHeld) return e.shiftKey ? 'pan' : 'orbit';
    return null;
  }

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.addEventListener(
    'pointerdown',
    (e) => {
      if (e.pointerType === 'touch') {
        touches++;
        // The second finger of a gesture. Whatever the first one has been
        // drawing since it landed was never a stroke — drop it before the
        // camera starts moving under it.
        if (touches === 2) abandon();
      }
      const want = wantsCamera(e);
      if (!want) return;
      dragging = want;
      last = { x: e.clientX, y: e.clientY };
      // What this orbit turns about, asked once, at the moment the drag
      // begins: the selection when there is one, else nothing — and nothing
      // means the target, which is where the hand last panned to.
      orbitPivot = want === 'orbit' ? pivotFn?.({ x: e.clientX, y: e.clientY }, 'orbit') ?? null : null;
      try { canvas.setPointerCapture(e.pointerId); } catch { /* not a live pointer */ }
      e.preventDefault();
    },
    true // capture: the camera decides before the pen sees the event
  );

  canvas.addEventListener(
    'pointermove',
    (e) => {
      if (!dragging) return;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      last = { x: e.clientX, y: e.clientY };
      if (dragging === 'pan') pan(dx, dy);
      else turn(-dx * 0.006, dy * 0.006, orbitPivot);
      e.preventDefault();
      e.stopPropagation();
    },
    true
  );

  const end = (e: PointerEvent) => {
    if (e.pointerType === 'touch') touches = Math.max(0, touches - 1);
    if (dragging) {
      dragging = null;
      orbitPivot = null;
      e.stopPropagation();
    }
  };
  canvas.addEventListener('pointerup', end, true);
  canvas.addEventListener('pointercancel', end, true);

  /**
   * A wheel is three devices wearing one event: a mouse, a trackpad swiping,
   * and a trackpad pinching. `readWheel` says which and what it means; this
   * handler only spends the answer.
   *
   * A dolly goes toward the POINTER. An orbit and a pan do not: they are the
   * same acts a drag makes, and a drag turns about the view's centre.
   */
  canvas.addEventListener(
    'wheel',
    (e) => {
      const rect = canvas.getBoundingClientRect();
      const move = readWheel(e, wheelMemory, { width: rect.width, height: rect.height }, performance.now());
      wheelMemory = move.memory;
      if (move.act === 'dolly') dolly(move.factor, { x: e.clientX, y: e.clientY });
      else if (move.act === 'pan') pan(move.dxPx, move.dyPx);
      else turn(move.dTheta, move.dPhi, pivotFn?.({ x: e.clientX, y: e.clientY }, 'orbit') ?? null);
      e.preventDefault();
    },
    { passive: false }
  );

  /**
   * One finger draws. **Two fingers pinch or orbit; three pan.** Which of the
   * two a pair is doing is decided once, by `readTouch`, after they have
   * travelled far enough to say — and nothing moves before then.
   */
  const onTouch = (e: TouchEvent) => {
    const points: TouchPoint[] = Array.from(e.touches, (t) => ({
      id: t.identifier,
      x: t.clientX,
      y: t.clientY,
    }));
    const move = readTouch(points, touchMemory);
    touchMemory = move.memory;
    if (!move.act) {
      // A landing or a lifting still has to be swallowed, or the browser takes
      // the second finger for a page zoom.
      if (points.length > 1 && e.cancelable) e.preventDefault();
      return;
    }
    if (move.act === 'dolly') dolly(move.factor, move.at);
    else if (move.act === 'pan') pan(move.dxPx, move.dyPx);
    else turn(move.dTheta, move.dPhi, pivotFn?.(move.at, 'orbit') ?? null);
    if (e.cancelable) e.preventDefault();
  };
  canvas.addEventListener('touchstart', onTouch, { passive: false });
  canvas.addEventListener('touchmove', onTouch, { passive: false });
  canvas.addEventListener('touchend', onTouch, { passive: false });
  canvas.addEventListener('touchcancel', onTouch, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') spaceHeld = true;
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') spaceHeld = false;
  });

  function view(which: 'free' | 'top' | 'front' | 'side') {
    if (which === 'top') { phi = POLE; theta = 0; }
    else if (which === 'front') { phi = 0; theta = 0; }
    else if (which === 'side') { phi = 0; theta = Math.PI / 2; }
    else { phi = DEFAULT_PHI; theta = DEFAULT_THETA; dist = DEFAULT_DIST; }
    place();
    emit();
    render();
  }

  window.addEventListener('resize', resize);
  resize();

  return {
    renderer,
    scene,
    get camera() {
      return cam();
    },
    canvas,
    rayFor,
    rayForPose,
    pose,
    easeTo,
    project,
    projectForPose,
    look,
    up,
    paint: (c) => { paint(c); render(); },
    render,
    view,
    // A second finger down IS a camera move in progress, whether or not it has
    // travelled yet — which is what stops `ink.ts` starting a stroke from it.
    // The first finger's stroke is already live by then; `onAbandon` drops it.
    orbiting: () => dragging !== null || touches >= 2,
    onChange: (fn) => void changeFns.push(fn),
    onAbandon: (fn) => void abandonFns.push(fn),
    target,
    turn,
    pan,
    dolly,
    distance: () => dist,
    fov: () => persp.fov,
    aspect: () => persp.aspect,
    snap,
    frame,
    projection: () => projection,
    setProjection,
    setPivot: (fn) => { pivotFn = fn; },
  };
}

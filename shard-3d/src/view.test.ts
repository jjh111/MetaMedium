import { describe, it, expect } from 'vitest';
import { dot, cross, normalize, sub, v3, type Pose, type Vec3 } from './plane';
import {
  AXIS_VIEWS,
  balls,
  ballScale,
  boundsOf,
  distForOrthoHeight,
  facingFrom,
  frameFor,
  opposite,
  orthoHeightFor,
  planeFacedBy,
  poseForAxis,
  tooOblique,
  unionBounds,
  viewFacingPlane,
  viewForAxis,
  viewOfPose,
  orbitBy,
  turnAbout,
  VIEW_DIR,
  VIEW_UP,
  type AxisView,
  type Bounds3,
} from './view';

const near = (a: number, b: number, eps = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(eps);
const nearV = (a: Vec3, b: Vec3, eps = 1e-6) => {
  near(a.x, b.x, eps);
  near(a.y, b.y, eps);
  near(a.z, b.z, eps);
};

const BASE = { fov: 45, aspect: 16 / 9 };

describe('the six axis poses', () => {
  it('stands the camera on the axis, keeping the target and the distance', () => {
    const target = v3(2, -1, 3);
    for (const view of AXIS_VIEWS) {
      const p = poseForAxis(view, { target, dist: 8, ...BASE });
      nearV(p.target, target);
      near(Math.hypot(p.position.x - target.x, p.position.y - target.y, p.position.z - target.z), 8);
      // It looks straight back down the axis it stands on.
      nearV(normalize(sub(p.target, p.position)), {
        x: -VIEW_DIR[view].x,
        y: -VIEW_DIR[view].y,
        z: -VIEW_DIR[view].z,
      });
      nearV(p.up, VIEW_UP[view]);
      // The up is never the axis itself, or `lookAt` has no frame to build.
      expect(Math.abs(dot(p.up, VIEW_DIR[view]))).toBeLessThan(1e-9);
    }
  });

  it('carries the ortho height only when the camera is orthographic', () => {
    const persp = poseForAxis('front', { target: v3(0, 0, 0), dist: 10, ...BASE });
    expect(persp.ortho).toBeUndefined();
    const ortho = poseForAxis('front', { target: v3(0, 0, 0), dist: 10, ...BASE, ortho: 6 });
    expect(ortho.ortho).toBe(6);
  });

  it('never lets a pose come back with a NaN in it', () => {
    for (const view of AXIS_VIEWS) {
      const p = poseForAxis(view, { target: v3(0, 0, 0), dist: 0, ...BASE });
      for (const k of [p.position, p.target, p.up]) {
        expect(Number.isFinite(k.x) && Number.isFinite(k.y) && Number.isFinite(k.z)).toBe(true);
      }
      // A zero distance would put the camera in the target: floored instead.
      expect(Math.hypot(p.position.x, p.position.y, p.position.z)).toBeGreaterThan(0);
    }
  });
});

describe('the flip to the other side', () => {
  it('is its own inverse, and stays on the axis', () => {
    for (const view of AXIS_VIEWS) {
      const other = opposite(view);
      expect(other).not.toBe(view);
      expect(opposite(other)).toBe(view);
      nearV(VIEW_DIR[other], { x: -VIEW_DIR[view].x, y: -VIEW_DIR[view].y, z: -VIEW_DIR[view].z });
    }
  });

  it('names the same six by axis and sign', () => {
    expect(viewForAxis('x')).toBe('right');
    expect(viewForAxis('x', true)).toBe('left');
    expect(viewForAxis('y')).toBe('top');
    expect(viewForAxis('y', true)).toBe('bottom');
    expect(viewForAxis('z')).toBe('front');
    expect(viewForAxis('z', true)).toBe('back');
  });
});

describe('the compass and the plane picker agree', () => {
  it('faces each named plane from one ball, and back', () => {
    // Y is up, so the foundation (XZ) is the TOP view, the height plane (XY)
    // the FRONT, the width plane (YZ) the RIGHT.
    expect(viewFacingPlane('foundation')).toBe('top');
    expect(viewFacingPlane('height')).toBe('front');
    expect(viewFacingPlane('width')).toBe('right');
    expect(planeFacedBy('top')).toBe('foundation');
    expect(planeFacedBy('bottom')).toBe('foundation');
    expect(planeFacedBy('back')).toBe('height');
    expect(planeFacedBy('left')).toBe('width');
  });

  it('reads a plane flat on from its own ball and edge-on from the others', () => {
    for (const view of AXIS_VIEWS) {
      const look = { x: -VIEW_DIR[view].x, y: -VIEW_DIR[view].y, z: -VIEW_DIR[view].z };
      const facing = planeFacedBy(view);
      near(facingFrom(facing, look), 1);
      expect(tooOblique(facing, look)).toBe(false);
      for (const other of ['foundation', 'height', 'width'] as const) {
        if (other === facing) continue;
        near(facingFrom(other, look), 0);
        // …which is exactly the case the status line has to say out loud.
        expect(tooOblique(other, look)).toBe(true);
      }
    }
  });

  it('a plane a little off flat-on is still drawable', () => {
    const look = normalize(v3(0, -1, 0.35)); // a shallow look down at the ground
    expect(tooOblique('foundation', look)).toBe(false);
  });
});

describe('the ortho height, so the toggle does not jump', () => {
  it('is the perspective frustum height at the target, and it inverts', () => {
    for (const fov of [30, 45, 60]) {
      for (const d of [1, 8, 15, 90]) {
        const h = orthoHeightFor(d, fov);
        // The height a perspective camera frames at that distance: 2·d·tan(fov/2).
        near(h, 2 * d * Math.tan((fov * Math.PI) / 360), 1e-9);
        near(distForOrthoHeight(h, fov), d, 1e-9);
      }
    }
  });
});

// A camera built from the pose, by hand, so the framing test is arithmetic and
// not three.js: where each corner lands in normalised device coordinates.
function ndcOf(pose: Pose, world: Vec3, ortho?: number): { x: number; y: number; ahead: boolean } {
  const forward = normalize(sub(pose.target, pose.position));
  const right = normalize(cross(forward, pose.up));
  const up = cross(right, forward);
  const v = sub(world, pose.position);
  const halfV = (pose.fov * Math.PI) / 360;
  const depth = dot(v, forward);
  if (ortho !== undefined) {
    return { x: dot(v, right) / ((ortho / 2) * pose.aspect), y: dot(v, up) / (ortho / 2), ahead: true };
  }
  return {
    x: dot(v, right) / (depth * Math.tan(halfV) * pose.aspect),
    y: dot(v, up) / (depth * Math.tan(halfV)),
    ahead: depth > 0,
  };
}

const cornersOf = (b: Bounds3): Vec3[] => {
  const out: Vec3[] = [];
  for (const x of [b.min.x, b.max.x])
    for (const y of [b.min.y, b.max.y])
      for (const z of [b.min.z, b.max.z]) out.push(v3(x, y, z));
  return out;
};

describe('framing', () => {
  const boxes: Record<string, Bounds3> = {
    cube: { min: v3(-1, -1, -1), max: v3(1, 1, 1) },
    slab: { min: v3(-9, 0, -0.4), max: v3(9, 0.6, 0.4) },
    tower: { min: v3(3, 0, 3), max: v3(4, 12, 4) },
    speck: { min: v3(0, 0, 0), max: v3(0.01, 0.01, 0.01) },
  };

  it('fits the whole of it, at any aspect and from any of the six views', () => {
    for (const [name, b] of Object.entries(boxes)) {
      for (const aspect of [2.2, 16 / 9, 1, 0.55]) {
        const fit = frameFor(b, { fov: 45, aspect });
        for (const view of AXIS_VIEWS) {
          const pose = poseForAxis(view, { target: fit.target, dist: fit.dist, fov: 45, aspect });
          for (const c of cornersOf(b)) {
            const p = ndcOf(pose, c);
            expect(p.ahead, `${name} ${view} ${aspect}: a corner behind the eye`).toBe(true);
            expect(Math.abs(p.x), `${name} ${view} ${aspect}: x`).toBeLessThanOrEqual(1);
            expect(Math.abs(p.y), `${name} ${view} ${aspect}: y`).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it('fits it under ORTHO too, at the height the persp distance implies', () => {
    for (const [name, b] of Object.entries(boxes)) {
      for (const aspect of [2.2, 1, 0.55]) {
        const fit = frameFor(b, { fov: 45, aspect });
        near(fit.ortho, orthoHeightFor(fit.dist, 45), 1e-9);
        for (const view of AXIS_VIEWS) {
          const pose = poseForAxis(view, { target: fit.target, dist: fit.dist, fov: 45, aspect, ortho: fit.ortho });
          for (const c of cornersOf(b)) {
            const p = ndcOf(pose, c, fit.ortho);
            expect(Math.abs(p.x), `${name} ${view} ${aspect}: x`).toBeLessThanOrEqual(1);
            expect(Math.abs(p.y), `${name} ${view} ${aspect}: y`).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it('leaves air around it, rather than filling the frame to the pixel', () => {
    const fit = frameFor(boxes.cube, { fov: 45, aspect: 1 });
    const pose = poseForAxis('front', { target: fit.target, dist: fit.dist, fov: 45, aspect: 1 });
    const p = ndcOf(pose, v3(1, 1, 1));
    expect(Math.abs(p.y)).toBeLessThan(0.95);
    expect(Math.abs(p.y)).toBeGreaterThan(0.4);
  });

  it('centres on the bounds, and never puts the camera inside the thing', () => {
    const fit = frameFor(boxes.tower, { fov: 45, aspect: 1 });
    nearV(fit.target, v3(3.5, 6, 3.5));
    expect(fit.dist).toBeGreaterThan(6);
  });

  it('reads a bounds off points, and grows one with another', () => {
    const a = boundsOf([v3(0, 0, 0), v3(2, 3, -1)]);
    expect(a).not.toBeNull();
    nearV(a!.min, v3(0, 0, -1));
    nearV(a!.max, v3(2, 3, 0));
    expect(boundsOf([])).toBeNull();
    const both = unionBounds(a, boundsOf([v3(-5, 0, 0)]));
    nearV(both!.min, v3(-5, 0, -1));
    expect(unionBounds(null, a)).toBe(a);
    expect(unionBounds(a, null)).toBe(a);
  });
});

describe('the compass turns with the camera', () => {
  const poseFrom = (dir: Vec3, up = v3(0, 1, 0)): Pose => ({
    position: dir,
    target: v3(0, 0, 0),
    up,
    fov: 45,
    aspect: 1,
  });

  it('puts the near ball last, so a painter draws it over the far one', () => {
    const order = balls(poseFrom(v3(0, 0, 10)));
    expect(order[order.length - 1].view).toBe('front'); // +Z is nearest the eye
    expect(order[0].view).toBe('back');
    // Farthest first, all the way down.
    for (let i = 1; i < order.length; i++) expect(order[i].depth).toBeLessThanOrEqual(order[i - 1].depth);
  });

  it('places the axes where they are seen, with y already down the screen', () => {
    const front = balls(poseFrom(v3(0, 0, 10)));
    const x = front.find((b) => b.view === 'right')!;
    const y = front.find((b) => b.view === 'top')!;
    near(x.x, 1); // +X to the right
    near(x.y, 0);
    near(y.y, -1); // +Y up the screen is a NEGATIVE y in the widget
    near(y.x, 0);
    // From the right-hand side, +Z now points left and +X is head on.
    const side = balls(poseFrom(v3(10, 0, 0)));
    near(side.find((b) => b.view === 'front')!.x, -1);
    near(side.find((b) => b.view === 'right')!.depth, -1);
  });

  it('turns: a quarter turn puts the BACK ball where the X ball stood', () => {
    // Walk a quarter turn round the thing and the compass turns with you: the
    // ball that was on the right of the widget is the one that was ahead.
    const a = balls(poseFrom(v3(0, 0, 10))).find((b) => b.view === 'right')!;
    const b = balls(poseFrom(v3(10, 0, 0))).find((b) => b.view === 'back')!;
    near(a.x, b.x);
    near(a.y, b.y);
    // …and the ball you walked onto is now the one under your eye.
    near(balls(poseFrom(v3(10, 0, 0))).find((x) => x.view === 'right')!.depth, -1);
  });

  it('has a frame at the poles, where up and the look direction are the same', () => {
    const top = balls(poseFrom(v3(0, 10, 0)));
    for (const b of top) {
      expect(Number.isFinite(b.x) && Number.isFinite(b.y) && Number.isFinite(b.depth)).toBe(true);
    }
    near(top.find((b) => b.view === 'top')!.depth, -1);
    expect(Math.hypot(top.find((b) => b.view === 'front')!.x, top.find((b) => b.view === 'front')!.y)).toBeCloseTo(1, 6);
  });

  it('labels the positives and leaves the negatives bare', () => {
    const all = balls(poseFrom(v3(6, 6, 6)));
    expect(all.filter((b) => b.label).map((b) => b.label).sort()).toEqual(['X', 'Y', 'Z']);
    expect(all.filter((b) => b.negative).every((b) => b.label === '')).toBe(true);
    expect(all.length).toBe(6);
  });

  it('draws a near ball bigger than a far one', () => {
    expect(ballScale(-1)).toBeGreaterThan(ballScale(1));
    expect(ballScale(0)).toBeGreaterThan(ballScale(0.5));
    expect(ballScale(5)).toBe(ballScale(1)); // clamped, not inverted
  });
});

describe('which view a pose is already at', () => {
  it('names one within the tolerance, and nothing off it', () => {
    for (const view of AXIS_VIEWS) {
      const p = poseForAxis(view, { target: v3(1, 2, 3), dist: 9, ...BASE });
      expect(viewOfPose(p)).toBe(view);
    }
    const free: Pose = { position: v3(6, 5, 7), target: v3(0, 0, 0), up: v3(0, 1, 0), fov: 45, aspect: 1 };
    expect(viewOfPose(free)).toBeNull();
    // The pole clamp the scene uses is a tenth of a degree off; still the top.
    const nearlyTop: Pose = { position: v3(0, 10, 0.02), target: v3(0, 0, 0), up: v3(0, 0, -1), fov: 45, aspect: 1 };
    expect(viewOfPose(nearlyTop)).toBe('top');
  });
});

describe('the vocabulary is closed', () => {
  it('is six, each with a direction, an up and an opposite', () => {
    expect(AXIS_VIEWS.length).toBe(6);
    const seen = new Set<AxisView>(AXIS_VIEWS);
    expect(seen.size).toBe(6);
    for (const v of AXIS_VIEWS) {
      near(Math.hypot(VIEW_DIR[v].x, VIEW_DIR[v].y, VIEW_DIR[v].z), 1);
      near(Math.hypot(VIEW_UP[v].x, VIEW_UP[v].y, VIEW_UP[v].z), 1);
    }
  });
});

// ---- the orbit -------------------------------------------------------------
//
// The rule John asked for: an orbit must respect the translation of the view.
// The default pivot is the target — the centre the hand panned to — so a turn
// never moves it. With a pivot, the camera and the target turn rigidly about
// that point, which is the same claim said twice: the distance is kept, and
// the pivot keeps its place in the camera's own frame, so it stays under its
// own pixel and nothing snaps to the middle of the screen.

const len = (v: Vec3) => Math.hypot(v.x, v.y, v.z);

/** Where the camera stands, from the orbit's own three numbers. */
const eyeOf = (o: { target: Vec3; theta: number; phi: number }, dist: number): Vec3 =>
  v3(
    o.target.x + dist * Math.cos(o.phi) * Math.sin(o.theta),
    o.target.y + dist * Math.sin(o.phi),
    o.target.z + dist * Math.cos(o.phi) * Math.cos(o.theta)
  );

/** A world point in the camera's own frame — right, up, forward — as the eye sees it. */
function inCameraFrame(o: { target: Vec3; theta: number; phi: number }, dist: number, p: Vec3): Vec3 {
  const eye = eyeOf(o, dist);
  const forward = normalize(sub(o.target, eye));
  const right = normalize(cross(forward, v3(0, 1, 0)));
  const up = cross(right, forward);
  const d = sub(p, eye);
  return v3(dot(d, right), dot(d, up), dot(d, forward));
}

describe('an orbit respects the translation of the view', () => {
  const panned = { target: v3(3.4, 1.2, -2.6), theta: 0.7, phi: 0.4 };

  it('leaves the target alone with no pivot — pan, then turn, and the centre stays put', () => {
    // The pan is the only thing that moved the target; the orbit must not.
    for (const [dTheta, dPhi] of [[0.9, 0.2], [-1.4, -0.35], [0.03, 0]] as [number, number][]) {
      const after = orbitBy(panned, dTheta, dPhi);
      nearV(after.target, panned.target);
      near(after.theta, panned.theta + dTheta);
      near(after.phi, panned.phi + dPhi);
      // And the distance is the orbit's own invariant — it is not a parameter
      // of the turn at all, so the eye stays on the same sphere about the
      // target it did not move.
      near(len(sub(eyeOf(after, 9), after.target)), 9);
    }
  });

  it('does nothing at all at the first radian — t = 0 is the identity', () => {
    const pivot = v3(-1, 0.5, 2);
    const at0 = orbitBy(panned, 0, 0, pivot);
    nearV(at0.target, panned.target);
    near(at0.theta, panned.theta);
    near(at0.phi, panned.phi);
  });

  it('turns camera and target rigidly about an off-centre pivot', () => {
    const pivot = v3(-1.5, 0.8, 2.2);
    const dist = 9;
    const before = inCameraFrame(panned, dist, pivot);
    const eyeBefore = eyeOf(panned, dist);
    for (const [dTheta, dPhi] of [[0.25, 0.12], [-0.6, -0.2], [1.1, 0.05]] as [number, number][]) {
      const after = orbitBy(panned, dTheta, dPhi, pivot);
      // The camera–target vector keeps its length: a turn is not a dolly.
      near(len(sub(eyeOf(after, dist), after.target)), dist, 1e-9);
      // The pivot is the same distance from the eye as it was — rigid.
      near(len(sub(pivot, eyeOf(after, dist))), len(sub(pivot, eyeBefore)), 1e-9);
      // And it sits in the same place in the camera's own frame, which is the
      // whole claim: it stays under its own pixel, so nothing snaps.
      nearV(inCameraFrame(after, dist, pivot), before, 1e-9);
    }
  });

  it('keeps the pair rigid at the pole, where the turn is clamped short', () => {
    const pivot = v3(2, 0, 1);
    const dist = 7;
    const high = { target: v3(1, 0, 0), theta: 0.2, phi: 1.4 };
    const before = inCameraFrame(high, dist, pivot);
    // Asking for far more climb than the clamp allows: the target must swing
    // by the angle actually travelled, not by the one asked for.
    const after = orbitBy(high, 0.1, 5, pivot, 1.45);
    near(after.phi, 1.45);
    nearV(inCameraFrame(after, dist, pivot), before, 1e-9);
  });

  it('turns a vector about an axis the way Rodrigues says', () => {
    nearV(turnAbout(v3(1, 0, 0), v3(0, 1, 0), Math.PI / 2), v3(0, 0, -1));
    nearV(turnAbout(v3(0, 0, 1), v3(0, 1, 0), Math.PI / 2), v3(1, 0, 0));
    nearV(turnAbout(v3(2, 3, 4), v3(0, 1, 0), 0), v3(2, 3, 4));
  });
});

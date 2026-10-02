// The cursor's placement rule, headless: a surface hit and a ray in, a world
// point out. Blender's 3D Cursor gesture, in the shard's terms — the surface
// under the pointer takes it, else the foundation plane does.

import { describe, it, expect } from 'vitest';
import {
  cursorAt,
  cursorFollowsTarget,
  describeAnchor,
  FOLLOWING,
  placeCursor,
  shiftClick,
} from './cursor';
import { normalize, sub, v3, type Ray } from './plane';

/** A ray from a point, aimed at another. */
const rayTo = (from: ReturnType<typeof v3>, at: ReturnType<typeof v3>): Ray => ({
  origin: from,
  direction: normalize(sub(at, from)),
});

describe('placing the cursor', () => {
  it('takes the surface under the pointer when there is one', () => {
    const on = v3(1.5, 2, -0.5);
    const got = placeCursor({ surface: on, ray: rayTo(v3(0, 10, 14), on), what: 'artifact:7' })!;
    expect(got.on).toBe('surface');
    expect(got.at).toEqual(on);
    expect(got.why).toMatch(/artifact:7/);
  });

  it('falls to the foundation plane under the pointer when there is no surface', () => {
    // A camera above and in front, aimed at a point on the ground: the cursor
    // lands on that point, because the ground is what the ray met.
    const target = v3(3, 0, -2);
    const got = placeCursor({ surface: null, ray: rayTo(v3(0, 10, 14), target) })!;
    expect(got.on).toBe('foundation');
    expect(got.at.x).toBeCloseTo(target.x, 6);
    expect(got.at.y).toBeCloseTo(0, 6);
    expect(got.at.z).toBeCloseTo(target.z, 6);
    expect(got.why).toMatch(/foundation plane/);
  });

  it('a surface beats the ground even when the ray would also meet the ground', () => {
    // The whole point of the rule's order: a box's top face is over the
    // ground, and the pointer that met the face meant the face.
    const face = v3(0, 2, 0);
    const got = placeCursor({ surface: face, ray: rayTo(v3(0, 10, 14), face), what: 'artifact:7' })!;
    expect(got.at.y).toBe(2);
  });

  it('says nothing rather than jumping to infinity when neither can take it', () => {
    // Level with the ground, looking along it: the ray never meets the
    // foundation plane. Null, so the caller leaves the cursor where it is —
    // a cursor that leapt to the horizon would be worse than one that stayed.
    const along: Ray = { origin: v3(0, 4, 14), direction: v3(0, 0, -1) };
    expect(placeCursor({ surface: null, ray: along })).toBeNull();
  });

  it('does not take the ground BEHIND the eye', () => {
    // A camera under the ground looking further down: the plane is behind it,
    // and `rayPlane` refuses a negative t. Placing the cursor behind the hand
    // is not a placement.
    const below: Ray = { origin: v3(0, -3, 0), direction: normalize(v3(0, -1, 0.2)) };
    expect(placeCursor({ surface: null, ray: below })).toBeNull();
  });
});

// ---- push 2, G1: the view plane stands where the hand is working ------------
//
// John's second board: four free loops, every one of them at floor level,
// because the view plane stood through a cursor nobody had moved from (0, 0, 0)
// while the camera looked at targets 0.9–3.7 units up. The ink went in front of
// or behind the volume he was working in, never in it.

describe('the cursor follows the centre of the view until it is placed', () => {
  it('follows the camera’s target, and moves with it', () => {
    expect(cursorFollowsTarget(FOLLOWING)).toBe(true);
    const first = cursorAt(FOLLOWING, v3(0.581, 0.938, 0.244));
    expect(first.follows).toBe(true);
    expect(first.at).toEqual(v3(0.581, 0.938, 0.244));
    // The hand orbits and pans; the plane goes with it, with nothing to remember.
    const later = cursorAt(FOLLOWING, v3(4.075, 3.683, 2.773));
    expect(later.at.y).toBeCloseTo(3.683, 6);
    expect(describeAnchor(FOLLOWING)).toBe('view · through the centre of the view');
  });

  it('a placed cursor STICKS, and the target no longer moves it', () => {
    const placed = placeCursor({ surface: v3(1.5, 2, -0.5), ray: rayTo(v3(0, 10, 14), v3(1.5, 2, -0.5)), what: 'artifact:7' })!;
    const { state, said } = shiftClick(FOLLOWING, placed, 0.4);
    expect(cursorFollowsTarget(state)).toBe(false);
    expect(said).toMatch(/cursor placed/);
    expect(said).toMatch(/until 0, a clear, or a shift \+ click on it/);
    // The camera can look anywhere now; the plane stays where it was put.
    expect(cursorAt(state, v3(99, 99, 99)).at).toEqual(v3(1.5, 2, -0.5));
    expect(describeAnchor(state)).toBe('view · through the placed cursor');
  });

  it('a shift + click ON the cursor lets it go again', () => {
    const at = v3(1.5, 2, -0.5);
    const held = shiftClick(FOLLOWING, placeCursor({ surface: at, ray: rayTo(v3(0, 10, 14), at) })!, 0.4).state;
    // A click a hair off where it stands is the cursor itself, at this zoom.
    const again = placeCursor({ surface: v3(1.6, 2.05, -0.45), ray: rayTo(v3(0, 10, 14), at) })!;
    const let_go = shiftClick(held, again, 0.4);
    expect(cursorFollowsTarget(let_go.state)).toBe(true);
    expect(let_go.said).toMatch(/follows the centre of the view again/);
  });

  it('a shift + click somewhere ELSE moves it rather than letting it go', () => {
    const held = shiftClick(FOLLOWING, placeCursor({ surface: v3(1.5, 2, -0.5), ray: rayTo(v3(0, 10, 14), v3(1.5, 2, -0.5)) })!, 0.4).state;
    const far = v3(6, 0, 3);
    const moved = shiftClick(held, placeCursor({ surface: far, ray: rayTo(v3(0, 10, 14), far) })!, 0.4);
    expect(cursorFollowsTarget(moved.state)).toBe(false);
    expect(moved.state.placed).toEqual(far);
  });
});

// The cursor's placement rule, headless: a surface hit and a ray in, a world
// point out. Blender's 3D Cursor gesture, in the shard's terms — the surface
// under the pointer takes it, else the foundation plane does.

import { describe, it, expect } from 'vitest';
import { placeCursor } from './cursor';
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

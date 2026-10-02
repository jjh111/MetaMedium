// The plane maths, headless: no three.js, no WebGL, no camera object — just
// a ray caster as a function, which is the whole point of keeping plane.ts pure.

import { describe, it, expect } from 'vitest';
import {
  foundation,
  height,
  width,
  toPlane,
  toWorld,
  uAxis,
  vAxis,
  rayPlane,
  scaleAt,
  slide,
  offsetOf,
  facing,
  planeForPenDown,
  describePlane,
  v3,
  normalize,
  type Plane,
  type RayCaster,
} from './plane';

const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

describe('the plane frame', () => {
  it('runs +u right and +v down the screen in each plane’s canonical view', () => {
    // The engine's 2D space has y down. A plane whose v ran the other way
    // would read every drawing upside down. (`toEqual` would trip over -0.)
    const same = (a: { x: number; y: number; z: number }, b: [number, number, number]) => {
      expect(near(a.x, b[0])).toBe(true);
      expect(near(a.y, b[1])).toBe(true);
      expect(near(a.z, b[2])).toBe(true);
    };
    same(uAxis(foundation()), [1, 0, 0]); // east
    same(vAxis(foundation()), [0, 0, 1]); // toward the viewer

    same(uAxis(height()), [1, 0, 0]);
    same(vAxis(height()), [0, -1, 0]); // down the wall

    same(uAxis(width()), [0, 0, -1]);
    same(vAxis(width()), [0, -1, 0]);
  });

  it('round-trips world ↔ plane on every named plane', () => {
    for (const plane of [foundation(), height(), width()]) {
      for (const p of [{ x: 0, y: 0 }, { x: 3, y: -2 }, { x: -1.25, y: 7.5 }]) {
        const back = toPlane(plane, toWorld(plane, p));
        expect(near(back.x, p.x, 1e-12)).toBe(true);
        expect(near(back.y, p.y, 1e-12)).toBe(true);
      }
    }
  });

  it('puts a plane point ON the plane — zero offset along the normal', () => {
    for (const plane of [foundation(), height(), width()]) {
      expect(near(offsetOf(plane, toWorld(plane, { x: 4, y: -3 })), 0, 1e-12)).toBe(true);
    }
  });

  it('slides along its own normal, and says so', () => {
    const p = slide(foundation(), 2.5);
    expect(p.origin).toEqual(v3(0, 2.5, 0));
    expect(p.why).toMatch(/slid 2.50 along its normal/);
    // A point at (0,0) in the slid plane is 2.5 above the world origin.
    expect(toWorld(p, { x: 0, y: 0 })).toEqual(v3(0, 2.5, 0));
  });
});

describe('ray–plane', () => {
  it('meets the ground where it should', () => {
    const hit = rayPlane({ origin: v3(1, 5, 2), direction: v3(0, -1, 0) }, foundation());
    expect(hit).toEqual(v3(1, 0, 2));
  });

  it('returns null when the ray runs parallel to the plane', () => {
    expect(rayPlane({ origin: v3(0, 5, 0), direction: v3(1, 0, 0) }, foundation())).toBeNull();
  });

  it('returns null when the plane is behind the eye', () => {
    expect(rayPlane({ origin: v3(0, 5, 0), direction: v3(0, 1, 0) }, foundation())).toBeNull();
  });

  it('reports how face-on a plane is', () => {
    expect(near(facing(height(), v3(0, 0, -1)), 1)).toBe(true); // flat on
    expect(near(facing(height(), v3(1, 0, 0)), 0)).toBe(true); // edge-on
  });
});

/**
 * A pinhole camera at the origin looking down -Z, as a ray caster. This is all
 * `scaleAt` needs to know about a camera, which is why the module stays pure.
 */
function pinhole(focal = 800): RayCaster {
  return (screen) => ({
    origin: v3(0, 0, 0),
    direction: normalize(v3(screen.x, -screen.y, -focal)),
  });
}

describe('scaleAt — plane units per screen pixel at the pen', () => {
  const wall = (z: number): Plane => ({ ...height(), origin: v3(0, 0, z) });

  it('is larger on a farther plane than on a nearer one', () => {
    // §10's last risk, as arithmetic: the hand's resolution is in screen
    // pixels, and a plane far from the camera makes a small stroke. The
    // per-stroke scale is what handles it.
    const ray = pinhole(800);
    const nearScale = scaleAt(wall(-5), ray, { x: 0, y: 0 });
    const farScale = scaleAt(wall(-20), ray, { x: 0, y: 0 });
    expect(farScale).toBeGreaterThan(nearScale);
    // Four times the depth is four times the units per pixel, under a pinhole.
    expect(near(farScale / nearScale, 4, 1e-6)).toBe(true);
  });

  it('is the focal ratio on a plane facing the camera', () => {
    // At depth d with focal f, one pixel spans d/f plane units.
    const s = scaleAt(wall(-8), pinhole(800), { x: 0, y: 0 });
    expect(near(s, 8 / 800, 1e-6)).toBe(true);
  });

  it('grows toward the horizon on a plane seen obliquely', () => {
    // The ground under a camera that looks along -Z from above: the far end
    // of the screen is farther away, so a pixel there covers more ground.
    const ground: Plane = { ...foundation(), origin: v3(0, -3, 0) };
    const ray: RayCaster = (screen) => ({
      origin: v3(0, 0, 0),
      direction: normalize(v3(screen.x, -screen.y, -800)),
    });
    const low = scaleAt(ground, ray, { x: 0, y: 300 }); // near the camera
    const high = scaleAt(ground, ray, { x: 0, y: 80 }); // toward the horizon
    expect(high).toBeGreaterThan(low);
  });

  it('falls back to 1 rather than to a nonsense number when nothing is hit', () => {
    const away: RayCaster = () => ({ origin: v3(0, 5, 0), direction: v3(1, 0, 0) });
    expect(scaleAt(foundation(), away, { x: 0, y: 0 })).toBe(1);
  });
});

describe('planeForPenDown — the one seam P1 extends', () => {
  it('answers the chosen plane, and says the tile was held', () => {
    const p = planeForPenDown({ chosen: 'height', offset: 0 });
    expect(p.name).toBe('height');
    expect(p.source).toBe('chosen');
    expect(p.why).toMatch(/height tile was held/);
    expect(describePlane(p)).toBe('height · chosen');
  });

  it('carries the slide into the chosen plane', () => {
    const p = planeForPenDown({ chosen: 'foundation', offset: 1.5 });
    expect(p.origin).toEqual(v3(0, 1.5, 0));
  });

  it('falls back to the ground and says why, rather than refusing the stroke', () => {
    const p = planeForPenDown({ chosen: null, offset: 0 });
    expect(p.name).toBe('foundation');
    expect(p.source).toBe('world');
    expect(p.why).toMatch(/nothing was chosen/);
  });
});

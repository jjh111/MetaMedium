// Push 2, G2 — the parts of a hull, said (SHARD-3D-PUSH-2.md §1's last
// paragraph, and G2's row).
//
// Headless, like `hull.test.ts` and `massing.test.ts`: the runs, the frame and
// the words are arithmetic, and the bodies go through the real CSG seam.
//
// The one thing pinned here that is a measurement rather than a design is the
// last describe: **John's own castle-sketch numbers give TWO parts, not three**,
// and the reason is in the drawing rather than in the code. Three partial
// silhouettes from two standpoints do not determine three masses.

import { describe, it, expect } from 'vitest';
import type { Point } from 'metamedium-core';
import { createLog, type SpaceRead } from './log';
import { deriveTree } from './solid';
import {
  runsOf,
  runsOfHull,
  partsOfHull,
  footprintFrame,
  placeOf,
  describeParts,
  boxOverlap,
  PART_OVERLAP,
  RUN_ON_GROUND,
  WHOLE_SPAN,
} from './parts';
import { FEET_ON_GROUND } from './form';
import {
  foundation,
  normalize,
  sub,
  cross,
  mul,
  uAxis,
  vAxis,
  type Plane,
  type Vec3,
} from './plane';
import type { HullStep, Profile2D, PlaneRef } from './op';
import * as THREE from 'three';

const SCALE = 0.012;

/** No renderer: the diff's seam is not what these tests are about. */
const blindSpace: SpaceRead = {
  silhouettes: () => [],
  spanAlong: () => 0,
  silhouetteOn: () => null,
};

// ---- the shapes a hand draws ------------------------------------------------

function loop(corners: Point[], per = 20): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    for (let s = 0; s < per; s++) {
      const t = s / per;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  out.push(corners[0]);
  return out;
}

const rect = (x: number, y: number, w: number, h: number) =>
  loop([{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }]);

function run(a: Point, b: Point, per: number): Point[] {
  const out: Point[] = [];
  for (let i = 0; i <= per; i++) {
    const t = i / per;
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
}

function viewPlane(from: Vec3, at: Vec3): Plane {
  const look = normalize(sub(at, from));
  const normal = mul(look, -1);
  const right = normalize(cross(look, { x: 0, y: 1, z: 0 }));
  const up = normalize(cross(look, right)); // down the screen
  return { origin: at, normal, up, source: 'view', name: 'view', why: 'a free view' };
}

/** Where the GROUND crosses a plane, at a given u — in that plane's own v. */
function groundV(plane: Plane, u: number): number {
  const U = uAxis(plane);
  const V = vAxis(plane);
  return -(plane.origin.y + u * U.y) / V.y;
}

/** A ⊓ in a plane's own (u, v), both feet on the world ground. +v runs DOWN. */
function tower(plane: Plane, u: number, w: number, tall: number, per = 10): Point[] {
  const a = groundV(plane, u);
  const b = groundV(plane, u + w);
  return [
    ...run({ x: u, y: a }, { x: u, y: a - tall }, per),
    ...run({ x: u, y: a - tall }, { x: u + w, y: b - tall }, per),
    ...run({ x: u + w, y: b - tall }, { x: u + w, y: b }, per),
  ];
}

/** Two ⊓ drawn WITHOUT lifting the pen: up, over, down, along the ground, up, over, down. */
function twoTowers(plane: Plane, u: number, w: number, gap: number, tall: number, per = 8): Point[] {
  const first = tower(plane, u, w, tall, per);
  const second = tower(plane, u + w + gap, w, tall, per);
  const across = run(first[first.length - 1], second[0], per);
  return [...first, ...across.slice(1, -1), ...second];
}

const FROM_FRONT = viewPlane({ x: 8, y: 5, z: 14 }, { x: 2, y: 1.2, z: 2 });
const FROM_SIDE = viewPlane({ x: 14, y: 5, z: -5 }, { x: 2, y: 1.2, z: 2 });

/** A claim, in the shape the hull step holds one. */
function claim(id: string, plane: Plane, points: Point[], ground: boolean, closed = false) {
  const profile: Profile2D = { shape: 'polygon', points, closed, reasoning: 'the ink as drawn' };
  const p: PlaneRef = { origin: plane.origin, normal: plane.normal, up: plane.up, ...(plane.name ? { name: plane.name } : {}) };
  return { id, profile, plane: p, ...(ground ? { ground: true } : {}) };
}


// ---- 1 · the runs ------------------------------------------------------------

describe('a claim’s runs: what stands between its feet', () => {
  it('a ⊓ touches the ground twice and is ONE run', () => {
    const c = claim('stroke:2', FROM_FRONT, tower(FROM_FRONT, -1.4, 2.4, 3), true);
    const { runs, why } = runsOf(c);
    expect(runs).toHaveLength(1);
    expect(runs[0].claimId).toBe('stroke:2');
    expect(runs[0].index).toBe(0);
    expect(runs[0].ground).toBe(true);
    expect(why).toMatch(/2 ground touches → 1 run/);
    expect(runs[0].reasoning).toMatch(/closed on the ground/);
  });

  it('a stroke that touches the ground THREE times is two runs', () => {
    const c = claim('stroke:3', FROM_FRONT, twoTowers(FROM_FRONT, -2.5, 1.6, 1.2, 3), true);
    const { runs, why } = runsOf(c);
    expect(runs).toHaveLength(2);
    expect(why).toMatch(/3 ground touches → 2 runs/);
    expect(runs.map((r) => r.index)).toEqual([0, 1]);
    // Both are the same stroke: one pen-down, two things standing.
    expect(new Set(runs.map((r) => r.claimId))).toEqual(new Set(['stroke:3']));
    // …and they are drawn apart: the second starts to the right of the first.
    const uOf = (r: (typeof runs)[number]) => Math.min(...r.profile.points.map((p) => p.x));
    expect(uOf(runs[1])).toBeGreaterThan(uOf(runs[0]));
  });

  it('a closed silhouette is one run, by its own ink', () => {
    const c = claim('stroke:4', FROM_FRONT, rect(-1, -2.5, 2, 2), false, true);
    const { runs } = runsOf(c);
    expect(runs).toHaveLength(1);
    expect(runs[0].ground).toBe(false);
    expect(runs[0].reasoning).toMatch(/closed by its own ink/);
  });

  it('a stroke that never leaves the ground claims nothing, and says why', () => {
    const flat = run({ x: -2, y: groundV(FROM_FRONT, -2) }, { x: 2, y: groundV(FROM_FRONT, 2) }, 20);
    const { runs, why } = runsOf(claim('stroke:5', FROM_FRONT, flat, true));
    expect(runs).toHaveLength(0);
    expect(why).toMatch(/never reaches the ground|a run needs two feet/);
  });

  it('a run’s feet are the same feet the form rung found', () => {
    // If these two ever disagree, a stroke read as an elevation would stand a
    // claim with no runs in it, and the hull would have parts nobody could see.
    expect(RUN_ON_GROUND).toBe(FEET_ON_GROUND);
  });
});

// ---- 2 · the frame, and the place in words -----------------------------------

describe('where a part stands, in the footprint’s own frame', () => {
  const plan = claim('stroke:1', foundation(), rect(-3, -2, 6, 4), false, true);

  it('the frame’s u is the footprint’s LONGEST edge, not its diagonal', () => {
    const frame = footprintFrame(plan, null);
    // A 6 × 4 plan: half-spans of 3 and 2. Reaching furthest is the diagonal
    // (3.6), which is what the first draft of this measured and got wrong.
    expect(frame.half.u).toBeCloseTo(3, 1);
    expect(frame.half.v).toBeCloseTo(2, 1);
    expect(Math.abs(frame.u.x)).toBeCloseTo(1, 2);
    expect(frame.compass.u.plus).toBe('east');
    expect(frame.compass.v.minus).toBe('north');
    expect(frame.reasoning).toMatch(/north is −Z/);
  });

  it('the nine cells are said the way a plan is read', () => {
    const frame = footprintFrame(plan, null);
    const small = { u: 0.6, v: 0.6 };
    const at = (u: number, v: number) => placeOf(frame, { u, v }, small).words;
    expect(at(-2.4, -1.4)).toBe('at the north-west corner');
    expect(at(2.4, -1.4)).toBe('at the north-east corner');
    expect(at(2.4, 1.4)).toBe('at the south-east corner');
    expect(at(0, 1.4)).toBe('along the south edge');
    expect(at(-2.4, 0)).toBe('along the west edge');
    expect(at(0, 0)).toBe('in the middle');
  });

  it('a part that covers the plan IS the plan, wherever its centre falls', () => {
    const frame = footprintFrame(plan, null);
    const whole = placeOf(frame, { u: 0.1, v: 0.1 }, { u: 6 * 0.95, v: 4 * 0.95 });
    expect(whole.words).toBe('the whole footprint');
    expect(whole.reasoning).toMatch(/it is the thing, not a place on it/);
    // …and just under the bar it is a place on the plan again.
    const under = placeOf(frame, { u: 0.1, v: 0.1 }, { u: 6 * (WHOLE_SPAN - 0.1), v: 4 * (WHOLE_SPAN - 0.1) });
    expect(under.words).toBe('in the middle');
  });

  it('with no footprint the standing body’s own ground box is the frame, and says so', () => {
    const box = new THREE.Box3(new THREE.Vector3(-1, 0, -2), new THREE.Vector3(1, 3, 2));
    expect(footprintFrame(null, box).reasoning).toMatch(/no footprint was drawn/);
  });
});

// ---- 3 · the parts of a hull -------------------------------------------------

/** A footprint and two ⊓ from two views — `hull.test.ts`'s own castle sketch. */
function twoViewTower() {
  const log = createLog();
  log.sees(blindSpace);
  const plan = log.add(rect(0, 0, 4, 4), foundation(), SCALE, 1000);
  const front = log.add(tower(FROM_FRONT, -1.4, 2.4, 3), FROM_FRONT, SCALE, 2000);
  const side = log.add(tower(FROM_SIDE, -1.2, 2.2, 2), FROM_SIDE, SCALE, 3000);
  log.hull(log.hullable()!, 5000);
  const solid = log.solids()[0];
  const step = solid.tree.steps.find((s) => s.op === 'hull') as HullStep;
  const { geometry } = deriveTree(solid.tree, {});
  return { log, plan, front, side, solid, step, geometry };
}

describe('the parts of a hull: the runs, cut out of what stands', () => {
  it('two views of ONE tower merge into one part', () => {
    const { step, geometry } = twoViewTower();
    // Two runs go in…
    expect(runsOfHull(step).runs.filter((r) => r.ground)).toHaveLength(2);
    // …and one part comes out, carrying both strokes as its provenance.
    const found = partsOfHull(step, geometry);
    expect(found.parts).toHaveLength(1);
    expect(found.parts[0].id).toBe('part:1');
    expect(found.parts[0].from).toHaveLength(2);
    expect(found.parts[0].sentence).toMatch(/from stroke:\d+ \(drawn from .+\) and stroke:\d+ \(drawn from .+\)/);
  });

  it('a part says its span, its height and where it stands, in one sentence', () => {
    const { step, geometry } = twoViewTower();
    const found = partsOfHull(step, geometry);
    const [part] = found.parts;
    expect(part.height).toBeGreaterThan(1.5);
    expect(part.span.u).toBeGreaterThan(0);
    expect(part.span.v).toBeGreaterThan(0);
    expect(part.place.words).toMatch(/corner|edge|middle|whole footprint/);
    expect(part.place.reasoning).toMatch(/cut in thirds each way/);
    expect(describeParts(found)).toEqual([part.sentence]);
    expect(part.sentence).toMatch(/^part 1 — [\d.]+ × [\d.]+ u on the footprint, [\d.]+ u tall, /);
  });

  it('the footprint is not a part of the thing it bounds', () => {
    const { step, geometry, plan } = twoViewTower();
    const found = partsOfHull(step, geometry);
    for (const p of found.parts) expect(p.from).not.toContain(plan);
  });

  it('part ids are stable across a re-derive', () => {
    const { step, geometry } = twoViewTower();
    const once = partsOfHull(step, geometry).parts.map((p) => `${p.id} ${p.sentence}`);
    const again = partsOfHull(step, geometry).parts.map((p) => `${p.id} ${p.sentence}`);
    expect(again).toEqual(once);
  });

  it('a hull that stands nothing has no parts, and says so rather than throwing', () => {
    const { step } = twoViewTower();
    const found = partsOfHull(step, null);
    expect(found.parts).toHaveLength(0);
    expect(found.dropped.join(' ')).toMatch(/nothing stands/);
  });

  it('the merge is a ratio of the SMALLER body, and it is named', () => {
    const big = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(4, 4, 4));
    const inside = new THREE.Box3(new THREE.Vector3(1, 1, 1), new THREE.Vector3(2, 2, 2));
    const beside = new THREE.Box3(new THREE.Vector3(9, 0, 0), new THREE.Vector3(10, 4, 4));
    expect(boxOverlap(big, inside)).toBeCloseTo(1, 5); // the small one is wholly in
    expect(boxOverlap(big, beside)).toBe(0);
    expect(PART_OVERLAP).toBeGreaterThan(0);
    expect(PART_OVERLAP).toBeLessThan(1);
  });
});

// ---- 4 · a scratch across a part ---------------------------------------------

describe('a scratch across one part takes that part’s claim out', () => {
  it('the claim goes, the hull stays, and undo puts it back', () => {
    const { log, solid, front } = twoViewTower();
    const before = (log.solidOf(solid.id)!.tree.steps[0] as HullStep).claims.length;
    expect(before).toBe(3);

    // `dropPart` is what a scratch across a single part reaches; here it is
    // driven directly, because the part→claim seam is the surface's.
    log.sees({ ...blindSpace, claimsOfPart: () => [front] });
    const gone = log.dropPart(solid.id, 'part:1', 'it was scratched out', 6000);
    expect(gone).toBeTruthy();
    const after = log.solidOf(solid.id)!.tree.steps[0] as HullStep;
    expect(after.claims).toHaveLength(before - 1);
    expect(after.claims.map((c) => c.id)).not.toContain(front);
    expect(after.reasoning).toMatch(/part:1 is no longer claimed/);
    // Ink is never covered.
    expect(log.marks()).toHaveLength(3);

    log.undo();
    expect((log.solidOf(solid.id)!.tree.steps[0] as HullStep).claims).toHaveLength(before);
  });

  it('a part TWO views agree on is not unsaid by one of them', () => {
    const { log, solid, front, side } = twoViewTower();
    log.sees({ ...blindSpace, claimsOfPart: () => [front, side] });
    expect(log.dropPart(solid.id, 'part:1', 'it was scratched out', 6000)).toBeNull();
    expect((log.solidOf(solid.id)!.tree.steps[0] as HullStep).claims).toHaveLength(3);
  });

  it('a hull is never left with fewer than two claims', () => {
    const log = createLog();
    log.sees(blindSpace);
    const plan = log.add(rect(0, 0, 4, 4), foundation(), SCALE, 1000);
    const front = log.add(tower(FROM_FRONT, -1.4, 2.4, 3), FROM_FRONT, SCALE, 2000);
    log.hull(log.hullable()!, 5000);
    const solid = log.solids()[0];
    expect((solid.tree.steps[0] as HullStep).claims).toHaveLength(2);
    log.sees({ ...blindSpace, claimsOfPart: () => [front] });
    expect(log.dropPart(solid.id, 'part:1', 'it was scratched out', 6000)).toBeNull();
    expect(plan).toBeTruthy();
  });
});

// ---- 5 · John's own board ----------------------------------------------------

/**
 * **`?demo=castle-sketch`'s own numbers** (`CASTLE_SKETCH` in `main.ts`): a
 * 6 × 4 plan, two towers at (∓2.4, −1.4) drawn from one standpoint and a wall
 * at (0, +1.8) drawn from another.
 *
 * The board is built here on two view planes rather than through the renderer,
 * so this is the drawing and not the choreography — `e2e.js` drives the demo
 * itself. What it pins is the honest count, which is **two parts and not
 * three**, and the reason is in §4 of the plan rather than in this file: the
 * visual hull is the intersection of COMPLETE silhouettes, and a hand sketching
 * a castle draws a partial one from each place it stands. A tower seen once has
 * no depth; what fixes it is a second view of that tower, which is exactly what
 * the two-view tower above has and John's board has not.
 */
function castleSketchNumbers() {
  const V0 = viewPlane({ x: 9, y: 4.5, z: 9 }, { x: 0, y: 1.2, z: 0 });
  const V1 = viewPlane({ x: -3, y: 4.5, z: 12 }, { x: 0, y: 1.2, z: 0 });
  const log = createLog();
  log.sees(blindSpace);
  const plan = log.add(rect(-3, -2, 6, 4), foundation(), SCALE, 1000);
  // The towers and the wall, aimed at their anchors in each plane's own u.
  const uOf = (plane: Plane, at: Vec3) => {
    const U = uAxis(plane);
    return (at.x - plane.origin.x) * U.x + (at.y - plane.origin.y) * U.y + (at.z - plane.origin.z) * U.z;
  };
  const a = log.add(tower(V0, uOf(V0, { x: -2.4, y: 0, z: -1.4 }) - 0.5, 1.0, 2.6), V0, SCALE, 2000);
  const b = log.add(tower(V0, uOf(V0, { x: 2.4, y: 0, z: -1.4 }) - 0.5, 1.0, 2.6), V0, SCALE, 3000);
  const w = log.add(tower(V1, uOf(V1, { x: 0, y: 0, z: 1.8 }) - 1.1, 2.2, 1.7), V1, SCALE, 4000);
  return { log, plan, a, b, w };
}

describe('John’s castle-sketch, by its own numbers', () => {
  it('the footprint and three ⊓ from two standpoints all read as claims', () => {
    const { log, plan, a, b, w } = castleSketchNumbers();
    expect(log.formOf(plan)!.role).toBe('profile');
    for (const id of [a, b, w]) expect(log.formOf(id)!.role).toBe('elevation');
    const h = log.hullable()!;
    expect(h.claimIds).toHaveLength(4);
    expect(h.footprintId).toBe(plan);
  });

  it('it stands a hull, and the hull has parts with sentences', () => {
    const { log } = castleSketchNumbers();
    log.hull(log.hullable()!, 5000);
    const solid = log.solids()[0];
    const step = solid.tree.steps.find((s) => s.op === 'hull') as HullStep;
    const { geometry, broken } = deriveTree(solid.tree, {});
    expect(broken).toBeNull();
    expect(geometry).toBeTruthy();

    // Four claims → four runs, one of which is the footprint's and is not a part.
    expect(runsOfHull(step).runs).toHaveLength(4);

    const found = partsOfHull(step, geometry);
    expect(found.parts.length).toBeGreaterThan(0);
    for (const p of found.parts) {
      expect(p.sentence).toMatch(/^part \d — [\d.]+ × [\d.]+ u on the footprint, [\d.]+ u tall, .+; from stroke:/);
      expect(p.place.words).toMatch(/corner|edge|middle|whole footprint/);
    }
    // Reading order: left to right along the plan's longest edge.
    const us = found.parts.map((p) => p.bounds.getCenter(new THREE.Vector3()).x);
    expect([...us].sort((x, y) => x - y)).toEqual(us);
  });

  it('TWO parts, not three — and the drawing is why', () => {
    // Pinned as a measurement, not as a design. Three partial silhouettes from
    // two standpoints do not determine three masses: intersecting them keeps
    // only what every standpoint agrees on. Read `siteOf` in `parts.ts` for
    // what was tried instead and why it was worse (it invented a size).
    const { log } = castleSketchNumbers();
    log.hull(log.hullable()!, 5000);
    const solid = log.solids()[0];
    const step = solid.tree.steps.find((s) => s.op === 'hull') as HullStep;
    const { geometry } = deriveTree(solid.tree, {});
    expect(partsOfHull(step, geometry).parts).toHaveLength(2);
  });
});

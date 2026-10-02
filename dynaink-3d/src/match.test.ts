// `match` — the diff resolved, and re-derived (SHARD-3D-PLAN §4).
//
// The thing these tests are actually about is invariant 4. A `match` step holds
// no region, no area and no outline: it holds which profile, which way and on
// which plane, and everything else is worked out again when the tree is walked.
// So the test walks the tree with an INJECTED silhouette — the seam
// `deriveTree` takes precisely so that a renderer is not a precondition for
// knowing whether the arithmetic is right — and then puts the whole log through
// a fresh session to check the tree comes back the same.
//
// There is three.js in here, but no WebGL: geometry and booleans are arithmetic.

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ENGINE_PARTICIPANT, type Point } from 'metamedium-core';
import { createLog, type SpaceRead } from './log';
import { boundsOf, gridFor, padBounds, rasterise } from './diff';
import type { PlaneSilhouette } from './silhouette';
import { deriveTree, type DeriveContext } from './solid';
import { parseOpTree, type MatchStep, type OpTree } from './op';
import { foundation, height, toPlane, width, type Plane, type Vec3 } from './plane';

const SCALE = 0.012;

function rect(x: number, y: number, w: number, h: number, per = 20): Point[] {
  const c = [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }];
  const out: Point[] = [];
  for (let i = 0; i < c.length - 1; i++)
    for (let s = 0; s < per; s++) {
      const t = s / per;
      out.push({ x: c[i].x + (c[i + 1].x - c[i].x) * t, y: c[i].y + (c[i + 1].y - c[i].y) * t });
    }
  out.push(c[0]);
  return out;
}

const run = (a: Point, b: Point, n = 24): Point[] =>
  Array.from({ length: n + 1 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n }));

/** A closed outline through corners, densified the way a hand leaves one. */
function loop(corners: Point[], per = 14): Point[] {
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

/**
 * The box the whole file works against: rect(-7, -2, 4, 2.6) on the foundation,
 * grown 2.4 up. World x ∈ [−7, −3], y ∈ [0, 2.4], z ∈ [−2, 0.6].
 *
 * On the WIDTH plane (+u along −Z, +v down) that is u ∈ [−0.6, 2], v ∈ [−2.4, 0]
 * — its side view, and where the profiles below are drawn.
 */
const BOX = { minX: -7, maxX: -3, minY: 0, maxY: 2.4, minZ: -2, maxZ: 0.6 };

/** The side profile WITH a bump on its right: 0.7 × 0.8 = 0.56 u² the box lacks. */
const BUMP_AREA = 0.7 * 0.8;
const SIDE_WITH_BUMP: Point[] = [
  { x: -0.6, y: 0 },
  { x: 2, y: 0 },
  { x: 2, y: -0.8 },
  { x: 2.7, y: -0.8 },
  { x: 2.7, y: -1.6 },
  { x: 2, y: -1.6 },
  { x: 2, y: -2.4 },
  { x: -0.6, y: -2.4 },
];

/**
 * A silhouette, faked from a box.
 *
 * Honest for this shape and for these planes: the orthographic projection of an
 * axis-aligned box along an axis IS the rectangle of its projected corners, so
 * the fake is what the renderer would have produced, computed instead of drawn.
 */
function silhouetteOfBox(box: { min: Vec3; max: Vec3 }, plane: Plane): PlaneSilhouette {
  const corners: Point[] = [];
  for (const x of [box.min.x, box.max.x])
    for (const y of [box.min.y, box.max.y])
      for (const z of [box.min.z, box.max.z]) corners.push(toPlane(plane, { x, y, z }));
  const b = boundsOf(corners);
  const outline: Point[] = [
    { x: b.minX, y: b.minY },
    { x: b.maxX, y: b.minY },
    { x: b.maxX, y: b.maxY },
    { x: b.minX, y: b.maxY },
  ];
  const grid = gridFor(padBounds(b, 0.05), 160);
  return {
    mask: rasterise([outline], grid),
    grid,
    outlines: [outline],
    fraction: 0.5,
    reasoning: 'a box projected by arithmetic — what the renderer would have drawn',
  };
}

/** The space the log reads silhouettes off, with no renderer behind it. */
function fakeSpace(box = BOX): SpaceRead {
  return {
    silhouettes: () => [],
    spanAlong: () => 0,
    silhouetteOn: (_id, plane) =>
      silhouetteOfBox({ min: { x: box.minX, y: box.minY, z: box.minZ }, max: { x: box.maxX, y: box.maxY, z: box.maxZ } }, plane),
  };
}

/** The same, as `deriveTree`'s own seam: the body-so-far, whatever it is now. */
function deriveContext(log: ReturnType<typeof createLog>): DeriveContext {
  return {
    inkOf: (id) => log.inkFor(id),
    silhouetteOf: (geometry, plane) => {
      geometry.computeBoundingBox();
      const b = geometry.boundingBox;
      if (!b) return null;
      return silhouetteOfBox({ min: { x: b.min.x, y: b.min.y, z: b.min.z }, max: { x: b.max.x, y: b.max.y, z: b.max.z } }, plane);
    },
  };
}

function boardWithABoxAndASideProfile() {
  const log = createLog();
  log.sees(fakeSpace());
  const profileId = log.add(rect(-7, -2, 4, 2.6), foundation(), SCALE, 1000);
  const extentId = log.add(run({ x: -7, y: 0 }, { x: -7, y: -2.4 }), height(), SCALE, 2000);
  const made = log.makeable();
  const solid = log.make(made[0], 3000);
  const sideId = log.add(loop(SIDE_WITH_BUMP), width(), SCALE, 4000);
  return { log, profileId, extentId, sideId, solidId: solid!.id };
}

describe('a closed stroke over a solid’s silhouette is a profile OF it', () => {
  it('reads as a profile of the box, on the side, and says why', () => {
    const { log, sideId, solidId } = boardWithABoxAndASideProfile();
    const form = log.formOf(sideId);
    expect(form?.role).toBe('profile');
    expect(form?.rule).toBe(2);
    expect(form?.against?.solidId).toBe(solidId);
    expect(form?.against?.view).toBe('side');
    expect(form?.reasoning).toMatch(/the side profile of/);
    expect(form?.reasoning).toMatch(/what it affords is the diff/);
    expect(form?.targets).toEqual([solidId]);
  });

  it('and NOTHING is waiting for an extent beside it — it is not a new solid', () => {
    const { log, sideId } = boardWithABoxAndASideProfile();
    expect(log.makeable().some((m) => m.profileId === sideId)).toBe(false);
    expect(log.solids()).toHaveLength(1);
  });

  it('a closed stroke clear of the solid is a profile of its own', () => {
    const { log } = boardWithABoxAndASideProfile();
    // Ten units off along +u: nothing of the box's side view is anywhere near it.
    const loneId = log.add(loop([
      { x: 12, y: 0 }, { x: 14, y: 0 }, { x: 14, y: -2 }, { x: 12, y: -2 },
    ]), width(), SCALE, 5000);
    const form = log.formOf(loneId);
    expect(form?.role).toBe('profile');
    expect(form?.against).toBeUndefined();
    expect(form?.reasoning).toMatch(/the face a solid grows from/);
  });

  it('the ink a solid was MADE from is its provenance, never a profile of it', () => {
    const { log, profileId } = boardWithABoxAndASideProfile();
    expect(log.formOf(profileId)?.against).toBeUndefined();
  });
});

describe('the diff, through the log', () => {
  it('names one missing region, and its area is the bump’s', () => {
    const { log, sideId } = boardWithABoxAndASideProfile();
    const diff = log.diffFor(sideId);
    expect(diff).toBeTruthy();
    expect(diff!.view).toBe('side');
    expect(diff!.extra).toHaveLength(0);
    expect(diff!.missing).toHaveLength(1);
    expect(diff!.missing[0].area).toBeGreaterThan(BUMP_AREA * 0.8);
    expect(diff!.missing[0].area).toBeLessThan(BUMP_AREA * 1.2);
    expect(diff!.sentence).toMatch(/^side · matches \d+% · missing 1 region/);
  });

  it('says which outline it read, and why', () => {
    const { log, sideId } = boardWithABoxAndASideProfile();
    const diff = log.diffFor(sideId)!;
    expect(['ink', 'clean']).toContain(diff.from);
    expect(diff.reasoning).toMatch(/rasterised against the side silhouette/);
  });
});

describe('the match step holds nothing derived', () => {
  it('carries the profile, the way and the plane — and no region', () => {
    const { log, sideId, solidId } = boardWithABoxAndASideProfile();
    const made = log.match(sideId, 'add', 5000);
    expect(made).toBeTruthy();
    const step = made!.step as MatchStep;
    expect(step.op).toBe('match');
    expect(step.how).toBe('add');
    expect(step.from).toEqual([sideId]);
    expect(step.plane.normal).toEqual({ x: 1, y: 0, z: 0 });

    const solid = log.solidOf(solidId)!;
    expect(solid.tree.steps).toHaveLength(2);
    expect(solid.tree.steps[1].on).toBe(solid.tree.steps[0].id);

    // The whole point: no area, no outline, no region, anywhere in the step.
    const text = JSON.stringify(step);
    expect(text).not.toMatch(/"area"/);
    expect(text).not.toMatch(/"outline"/);
    expect(text).not.toMatch(/"missing"/);
    expect(Object.keys(step).sort()).toEqual(['from', 'how', 'id', 'on', 'op', 'plane', 'reasoning']);
  });

  it('re-derives the region from the ink and an injected silhouette, and grows the body', () => {
    const { log, sideId, solidId } = boardWithABoxAndASideProfile();
    const before = deriveTree(log.solidOf(solidId)!.tree, deriveContext(log));
    expect(before.geometry).toBeTruthy();
    before.geometry!.computeBoundingBox();
    expect(before.geometry!.boundingBox!.min.z).toBeCloseTo(BOX.minZ, 2);

    log.match(sideId, 'add', 5000);
    const after = deriveTree(log.solidOf(solidId)!.tree, deriveContext(log));
    expect(after.broken).toBeNull();
    expect(after.geometry).toBeTruthy();
    after.geometry!.computeBoundingBox();
    // The bump stands out to u = 2.7, which on the width plane is z = −2.7.
    expect(after.geometry!.boundingBox!.min.z).toBeLessThan(-2.6);
    expect(after.geometry!.boundingBox!.min.z).toBeGreaterThan(-2.85);
    // …and nothing else moved.
    expect(after.geometry!.boundingBox!.max.y).toBeCloseTo(BOX.maxY, 1);
    expect(after.geometry!.boundingBox!.min.x).toBeCloseTo(BOX.minX, 1);

    // The walk reported the diff it re-derived, in the engine's own hands —
    // never in the log.
    expect(after.diffs?.[0]?.diff.view).toBe('side');
  });

  it('a match whose ink is not on the board marks the solid broken and leaves the body', () => {
    const { log, sideId, solidId } = boardWithABoxAndASideProfile();
    log.match(sideId, 'add', 5000);
    const tree = log.solidOf(solidId)!.tree;
    const blind = deriveTree(tree, { silhouetteOf: deriveContext(log).silhouetteOf });
    expect(blind.broken).toMatch(/that ink is not on the board/);
    expect(blind.geometry).toBeTruthy(); // the body is what it was
  });

  it('*Take it off* cuts the extra, and a profile the body already matches affords nothing', () => {
    const { log, solidId, sideId } = boardWithABoxAndASideProfile();
    // A side profile SMALLER than the box: the body has material the drawing
    // does not, and that is an `extra` region.
    const smallId = log.add(loop([
      { x: -0.6, y: 0 }, { x: 1.2, y: 0 }, { x: 1.2, y: -2.4 }, { x: -0.6, y: -2.4 },
    ]), width(), SCALE, 6000);
    const diff = log.diffFor(smallId)!;
    expect(diff.missing).toHaveLength(0);
    expect(diff.extra).toHaveLength(1);
    expect(log.matchable(solidId, 'remove')?.profile.markId).toBe(smallId);
    // The BIG side profile is still standing beside it and still asks for its
    // bump: since P5 a profile with another inside it is a profile too, so two
    // claims about one body stand at once, and *Add it* is about the newest one
    // that still has something to say.
    expect(log.matchable(solidId, 'add')?.profile.markId).toBe(sideId);

    const made = log.match(smallId, 'remove', 7000);
    expect((made!.step as MatchStep).how).toBe('remove');
    const after = deriveTree(log.solidOf(solidId)!.tree, deriveContext(log));
    expect(after.broken).toBeNull();
    after.geometry!.computeBoundingBox();
    // u = 1.2 is z = −1.2: the far edge of the box has been taken off.
    expect(after.geometry!.boundingBox!.min.z).toBeGreaterThan(-1.35);
  });
});

describe('the tree round-trips', () => {
  it('through the code rep, and through a whole replay of the log', () => {
    const { log, sideId, solidId } = boardWithABoxAndASideProfile();
    log.match(sideId, 'add', 5000);
    const tree = log.solidOf(solidId)!.tree;

    // The `code` rep is text; the tree comes back out of it unchanged.
    const node = log.session.getState().nodes.get(solidId)!;
    const code = [...node.reps].reverse().find((r) => r.modality === 'code')?.data as { code: string };
    const parsed = parseOpTree(code.code) as OpTree;
    expect(parsed).toEqual(tree);

    // And the whole log, replayed into a fresh session, stands the same solid.
    const events = log.session.getEvents();
    const again = createLog();
    again.sees(fakeSpace());
    again.session.load(events);
    const replayed = again.solidOf(solidId);
    expect(replayed).toBeTruthy();
    expect(replayed!.tree).toEqual(tree);
    expect(replayed!.tree.steps[1].op).toBe('match');

    // Derived from the replayed log, it is the same body — because the log is
    // the source and the region was never in it.
    const geo = deriveTree(replayed!.tree, deriveContext(again)).geometry!;
    geo.computeBoundingBox();
    expect(geo.boundingBox!.min.z).toBeLessThan(-2.6);
  });

  it('the version before the match is still held, and undo walks back to it', () => {
    const { log, sideId, solidId } = boardWithABoxAndASideProfile();
    log.match(sideId, 'add', 5000);
    const node = () => log.session.getState().nodes.get(solidId)!;
    expect(node().reps.filter((r) => r.modality === 'code')).toHaveLength(2);
    log.undo();
    const solid = log.solidOf(solidId)!;
    expect(solid.tree.steps).toHaveLength(1);
    expect(solid.tree.steps[0].op).toBe('extrude');
    // The profile's ink is untouched — it is a standing claim, not a consumed
    // feature, which is what lets the row re-read after the act.
    expect(log.marks().some((m) => m.id === sideId)).toBe(true);
    expect(log.diffFor(sideId)!.missing).toHaveLength(1);
  });

  it('the match is the engine’s, like every other tier 1 act', () => {
    const { log, sideId, solidId } = boardWithABoxAndASideProfile();
    log.match(sideId, 'add', 5000);
    const node = log.session.getState().nodes.get(solidId)!;
    const code = [...node.reps].reverse().find((r) => r.modality === 'code')!;
    expect(code.source).toBe(ENGINE_PARTICIPANT);
  });
});

describe('the derived mesh is a real body', () => {
  it('the added region is welded to the box, not standing beside it', () => {
    const { log, sideId, solidId } = boardWithABoxAndASideProfile();
    log.match(sideId, 'add', 5000);
    const geo = deriveTree(log.solidOf(solidId)!.tree, deriveContext(log)).geometry!;
    // A ray straight down through the bump meets the body; one past it does not.
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    mesh.updateMatrixWorld(true);
    const down = (x: number, z: number) => {
      const caster = new THREE.Raycaster(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0));
      return caster.intersectObject(mesh, false)[0]?.point.y ?? null;
    };
    expect(down(-5, -2.35)).toBeGreaterThan(1.5); // the bump's top, y ≈ 1.6
    expect(down(-5, -2.35)).toBeLessThan(1.75);
    expect(down(-5, 0)).toBeCloseTo(BOX.maxY, 1); // the box, untouched
    expect(down(-5, -3.5)).toBeNull(); // clear past the bump
  });
});

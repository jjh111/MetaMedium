// What a body is still answering to (GRAPH-1), and what that does to the row.
//
// The defect this file pins: a placed mug reported *honours the drawing 20% ·
// top 39 · top 0*, and the 0 was the FIRST mug's plan, rasterised where the
// first mug's plan lies. Two inks a `place` step references play two different
// roles — the outline it stands at, and the outline the definition it copied
// was made from — and comparing the second one in place is comparing this body
// against somewhere else.
//
// Three claims are pinned here:
//
//   * **The roles are separated.** Every closed mark a tree references comes
//     back classified: drawn here, carried from the definition, drawn since.
//   * **A correspondence is CARRIED, never dropped.** The placement's own pose
//     puts the definition's outlines where this body stands, so a translation,
//     a turn or a half-scale placement does not lower agreement at all — and
//     when the pose cannot be derived, the id stays and the number goes.
//   * **A real disagreement still reads as one.** Placing a definition at an
//     outline that is not its shape is reported, not smoothed away.
//
// three.js is in here as arithmetic: the silhouettes are projected boxes, so
// the whole file runs with no renderer.

import { describe, it, expect } from 'vitest';
import { getFingerprint, type Point } from 'metamedium-core';
import { createLog, type Log, type SpaceRead } from './log';
import { boundsOf, gridFor, padBounds, rasterise } from './diff';
import type { PlaneSilhouette } from './silhouette';
import { deriveTree } from './solid';
import { placeFrames, type ExtrudeStep, type FeatureStep, type OpStep, type OpTree, type PlaceStep } from './op';
import {
  activeConstraints,
  carryOutline,
  carryPoint,
  type ActiveConstraint,
  type Carry,
  type ConstraintContext,
} from './constraints';
import { foundation, height, toPlane, toWorld, width, type Plane, type Vec3 } from './plane';

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

const line = (a: Point, b: Point, n = 24): Point[] =>
  Array.from({ length: n + 1 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n }));

// ===== the query, on its own =================================================

const OPEN = 'stroke:extent';

/** Everything is a closed outline except the extent, and every ink is a unit square. */
const plainCtx = (over: Partial<ConstraintContext> = {}): ConstraintContext => ({
  closed: (id) => id !== OPEN,
  inkOf: () => ({ points: rect(0, 0, 1, 1) }),
  ...over,
});

const extrude = (id: string, from: string[]): ExtrudeStep => ({
  id,
  op: 'extrude',
  from,
  profile: { shape: 'rectangle', points: rect(0, 0, 1, 1), closed: true, reasoning: 'a test' },
  plane: { origin: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, up: { x: 0, y: 0, z: -1 }, name: 'foundation' },
  depth: 1,
  reasoning: 'a test',
});

const cut = (id: string, on: string, from: string[]): FeatureStep => ({
  id,
  op: 'cut',
  on,
  from,
  profile: { shape: 'circle', points: rect(0.2, 0.2, 0.3, 0.3), closed: true, reasoning: 'a test' },
  plane: { origin: { x: 0, y: 1, z: 0 }, normal: { x: 0, y: 1, z: 0 }, up: { x: 0, y: 0, z: -1 }, name: 'top of it' },
  depth: -1,
  start: 0.1,
  reasoning: 'a test',
});

const placeOf = (over: Partial<PlaceStep> = {}): PlaceStep => ({
  id: 'step:1',
  op: 'place',
  from: ['stroke:9', 'stroke:1'],
  reasoning: 'placed from box',
  steps: [extrude('step:1', ['stroke:1', OPEN])],
  offset: { x: 0, y: 0, z: 0 },
  definition: 'box',
  of: 'stroke:1',
  toMark: 'stroke:9',
  fromPlane: { origin: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, up: { x: 0, y: 0, z: -1 }, name: 'foundation' },
  toPlane: { origin: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, up: { x: 0, y: 0, z: -1 }, name: 'foundation' },
  ...over,
});

const treeOf = (...steps: OpStep[]): OpTree => ({ mm: 'op', version: 1, steps });
const by = (cs: ActiveConstraint[], id: string) => cs.find((c) => c.markId === id)!;

describe('the active constraints of an instance', () => {
  it('an extrude’s outline is a target sketch, and its extent is no claim at all', () => {
    const cs = activeConstraints(treeOf(extrude('step:1', ['stroke:1', OPEN])), plainCtx());
    expect(cs).toHaveLength(1);
    expect(cs[0]).toMatchObject({ markId: 'stroke:1', kind: 'target', scores: true, op: 'extrude' });
    expect(cs[0].carry).toEqual([]);
  });

  it('a placement’s two references play DIFFERENT roles — the bug, as a classification', () => {
    const cs = activeConstraints(treeOf(placeOf()), plainCtx());
    expect(cs.map((c) => c.markId)).toEqual(['stroke:9', 'stroke:1']);
    // The outline it stands at: drawn here, measured where it lies.
    expect(by(cs, 'stroke:9')).toMatchObject({ kind: 'target', scores: true });
    expect(by(cs, 'stroke:9').carry).toEqual([]);
    // The definition's own outline: a correspondence, carried by the pose.
    const source = by(cs, 'stroke:1');
    expect(source).toMatchObject({ kind: 'source', scores: true, definition: 'box' });
    expect(source.carry).toHaveLength(1);
    expect(source.carry[0].how).toBe('posed');
    expect(source.carry[0].why).toMatch(/carried onto this one/);
    // The extent inside the copied tree is still not a claim.
    expect(cs.some((c) => c.markId === OPEN)).toBe(false);
  });

  it('a placement whose source ink has gone keeps its ids and gives up its number', () => {
    const cs = activeConstraints(
      treeOf(placeOf()),
      plainCtx({ inkOf: (id) => (id === 'stroke:1' ? null : { points: rect(0, 0, 1, 1) }) })
    );
    const source = by(cs, 'stroke:1');
    expect(source.kind).toBe('source');
    expect(source.scores).toBe(false);
    expect(source.aside).toMatch(/is not on the board/);
    // Provenance is never dropped to hide a number.
    expect(cs.map((c) => c.markId)).toContain('stroke:1');
    // …and what WAS drawn here still scores.
    expect(by(cs, 'stroke:9').scores).toBe(true);
  });

  it('a dup carries the outlines it copied by the offset it stands at', () => {
    const dup: PlaceStep = {
      id: 'step:2',
      op: 'place',
      from: ['stroke:1'],
      reasoning: 'a dup',
      steps: [extrude('step:1', ['stroke:1', OPEN])],
      offset: { x: 4, y: 0, z: 0 },
    };
    const cs = activeConstraints(treeOf(dup), plainCtx());
    expect(cs).toHaveLength(1);
    expect(cs[0]).toMatchObject({ markId: 'stroke:1', kind: 'source', scores: true });
    expect(cs[0].carry[0]).toMatchObject({ how: 'shift', offset: { x: 4, y: 0, z: 0 } });
  });

  it('a feature is a claim about a FACE: kept, said, and not counted', () => {
    const cs = activeConstraints(
      treeOf(extrude('step:1', ['stroke:1', OPEN]), cut('step:2', 'step:1', ['stroke:5'])),
      plainCtx()
    );
    const hole = by(cs, 'stroke:5');
    expect(hole.scores).toBe(false);
    // Short in the row, and the whole reason under it.
    expect(hole.aside).toMatch(/is the hole, not the outline/);
    expect(hole.reasoning).toMatch(/intersection over a union/);
    // Coverage is an intersection over a union: a small circle against a whole
    // body reads near zero whichever way it was meant, so it is not a number.
    expect(hole.kind).toBe('target');
  });

  it('an outline drawn before a cut says it is expected to read low', () => {
    const cs = activeConstraints(
      treeOf(extrude('step:1', ['stroke:1', OPEN]), cut('step:2', 'step:1', ['stroke:5'])),
      plainCtx()
    );
    expect(by(cs, 'stroke:1').expect).toMatch(/less is expected to show/);
    // …and with nothing taken off, it says nothing of the sort.
    const clean = activeConstraints(treeOf(extrude('step:1', ['stroke:1', OPEN])), plainCtx());
    expect(clean[0].expect).toBeUndefined();
  });

  it('a placement of something with a hole in it says so on the outline it stands at', () => {
    const holed = placeOf({ steps: [extrude('step:1', ['stroke:1', OPEN]), cut('step:2', 'step:1', ['stroke:5'])] });
    const cs = activeConstraints(treeOf(holed), plainCtx());
    expect(by(cs, 'stroke:9').expect).toMatch(/less is expected to show/);
  });

  it('a placement INSIDE a placement is all correspondence, carried twice', () => {
    const inner = placeOf({ id: 'step:1', of: 'stroke:1', toMark: 'stroke:4' });
    const outer = placeOf({ id: 'step:1', of: 'stroke:4', toMark: 'stroke:9', steps: [inner] });
    const cs = activeConstraints(treeOf(outer), plainCtx());
    // Only what was drawn HERE is a target; the nested placement's own outline
    // was drawn at the definition, and comes back carried by both poses.
    expect(by(cs, 'stroke:9').kind).toBe('target');
    expect(by(cs, 'stroke:4').kind).toBe('source');
    expect(by(cs, 'stroke:1').kind).toBe('source');
    expect(by(cs, 'stroke:1').carry).toHaveLength(2);
  });

  it('a revision is what was drawn since, and nothing is counted twice', () => {
    const cs = activeConstraints(treeOf(extrude('step:1', ['stroke:1', OPEN])), plainCtx(), ['stroke:7', 'stroke:1']);
    expect(cs.map((c) => c.markId)).toEqual(['stroke:1', 'stroke:7']);
    expect(by(cs, 'stroke:7')).toMatchObject({ kind: 'revision', op: 'drawn-since', scores: true });
    // The tree's own claim is the tree's: a `match`'s profile is not a revision as well.
    expect(by(cs, 'stroke:1').kind).toBe('target');
  });
});

// ===== carrying ==============================================================

describe('carrying an outline into the body’s own space', () => {
  const posed = (from: Plane, to: Plane, fromPoints: Point[], toPoints: Point[]): Carry[] => [
    { how: 'posed', ...placeFrames({ from: { points: fromPoints, plane: from }, to: { points: toPoints, plane: to } }), why: 'a test' },
  ];

  /** Where an outline really is, whatever frame it is written in. */
  const worldBounds = (plane: Plane, points: Point[]) => {
    const w = points.map((p) => toWorld(plane, p));
    const span = (get: (v: Vec3) => number) => ({
      min: Math.min(...w.map(get)),
      max: Math.max(...w.map(get)),
    });
    return { x: span((v) => v.x), y: span((v) => v.y), z: span((v) => v.z) };
  };

  it('a half-size outline drawn elsewhere lands exactly on the outline it was placed at', () => {
    const src = rect(-7, -2, 4, 2.6);
    const dst = rect(2, 3, 2, 1.3);
    const carried = carryOutline(posed(foundation(), foundation(), src, dst), foundation(), src);
    // In the WORLD — the frame the body stands in — it is the outline it was placed at.
    const got = worldBounds(carried.plane, carried.points);
    const want = worldBounds(foundation(), dst);
    expect(got.x.min).toBeCloseTo(want.x.min, 6);
    expect(got.x.max).toBeCloseTo(want.x.max, 6);
    expect(got.z.min).toBeCloseTo(want.z.min, 6);
    expect(got.z.max).toBeCloseTo(want.z.max, 6);
  });

  it('a TURN onto another plane carries the plane with the ink', () => {
    const src = rect(0, 0, 2, 2);
    const dst = rect(5, -1, 2, 2);
    const carry = posed(foundation(), height(), src, dst);
    const carried = carryOutline(carry, foundation(), src);
    // The ink now lies on the height plane…
    expect(carried.plane.normal.x).toBeCloseTo(height().normal.x, 6);
    expect(carried.plane.normal.y).toBeCloseTo(height().normal.y, 6);
    expect(carried.plane.normal.z).toBeCloseTo(height().normal.z, 6);
    // …exactly where the outline it was placed at lies.
    const got = worldBounds(carried.plane, carried.points);
    const want = worldBounds(height(), dst);
    for (const axis of ['x', 'y', 'z'] as const) {
      expect(got[axis].min).toBeCloseTo(want[axis].min, 6);
      expect(got[axis].max).toBeCloseTo(want[axis].max, 6);
    }
    // …and the plane it comes back on is the frame those numbers are written in.
    const one = toWorld(foundation(), src[0]);
    expect(toPlane(carried.plane, carryPoint(carry, one)).x).toBeCloseTo(carried.points[0].x, 6);
  });

  it('with nothing to carry, the ink and its plane come back untouched', () => {
    const src = rect(0, 0, 2, 2);
    const plane = foundation();
    const same = carryOutline([], plane, src);
    expect(same.points).toBe(src);
    expect(same.plane).toBe(plane);
  });
});

// ===== through the log, with a body that really stands =======================

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

/**
 * A space that answers for EACH BODY WHERE IT STANDS: the tree is derived and
 * its own box is projected. That is the whole point of the fixture — a space
 * that returned one picture for every id could not tell the defect from the fix.
 */
function spaceOver(ref: { log: Log | null }): SpaceRead {
  return {
    silhouettes: () => [],
    spanAlong: () => 0,
    silhouetteOn: (id, plane) => {
      const log = ref.log;
      const solid = log?.solidOf(id);
      if (!log || !solid) return null;
      const derived = deriveTree(solid.tree, { inkOf: (m) => log.inkFor(m) });
      if (!derived.geometry) return null;
      derived.geometry.computeBoundingBox();
      const b = derived.geometry.boundingBox;
      if (!b) return null;
      return silhouetteOfBox(
        { min: { x: b.min.x, y: b.min.y, z: b.min.z }, max: { x: b.max.x, y: b.max.y, z: b.max.z } },
        plane
      );
    },
  };
}

/** Where a body actually reads on a plane, in that plane's own (u, v). */
function bodyOn(log: Log, solidId: string, plane: Plane) {
  const derived = deriveTree(log.solidOf(solidId)!.tree, { inkOf: (m) => log.inkFor(m) });
  derived.geometry!.computeBoundingBox();
  const b = derived.geometry!.boundingBox!;
  const corners: Point[] = [];
  for (const x of [b.min.x, b.max.x])
    for (const y of [b.min.y, b.max.y])
      for (const z of [b.min.z, b.max.z]) corners.push(toPlane(plane, { x, y, z }));
  return boundsOf(corners);
}

/** A box, named and taken, with a copy of it placed half-size across the board. */
function boardWithAPlacedBox(again: Point[] = rect(2, 3, 2, 1.3), at: Plane = foundation()) {
  const ref: { log: Log | null } = { log: null };
  const log = createLog();
  ref.log = log;
  log.sees(spaceOver(ref));
  const profileId = log.add(rect(-7, -2, 4, 2.6), foundation(), SCALE, 1000);
  log.add(line({ x: -7, y: 0 }, { x: -7, y: -2.4 }), height(), SCALE, 2000);
  const solid = log.make(log.makeable()[0], 3000)!;
  log.name(solid.id, 'box', 4000);
  log.take(solid.id, 5000);
  const againId = log.add(again, at, SCALE, 6000);
  const made = log.place('box', againId, 7000)!;
  return { log, ref, profileId, againId, originalId: solid.id, placedId: made.id, scale: made.scale };
}

describe('honours the drawing, on a placed instance', () => {
  it('the placed box never counts the original’s plan as a second zero — it CARRIES it', () => {
    const { log, profileId, againId, placedId } = boardWithAPlacedBox();
    const h = log.honoursOf(placedId)!;
    expect(h).toBeTruthy();
    // Two claims, both about this body: the outline drawn here, and the
    // definition's own outline carried onto it.
    expect(h.per.map((p) => p.markId)).toEqual([againId, profileId]);
    expect(h.per.map((p) => p.kind)).toEqual(['target', 'source']);
    expect(h.per.find((p) => p.markId === profileId)!.of).toBe('box');
    for (const p of h.per) expect(p.coverage).toBeGreaterThan(0.9);
    // The defect, in one line: nothing reads zero because it was measured
    // somewhere else.
    expect(h.per.some((p) => p.coverage < 0.05)).toBe(false);
    expect(h.overall).toBeGreaterThan(0.9);
    expect(h.sentence).toMatch(/carried from box/);
  });

  it('a half-size copy agrees exactly as much as the original does', () => {
    const { log, originalId, placedId } = boardWithAPlacedBox();
    const original = log.honoursOf(originalId)!;
    const placed = log.honoursOf(placedId)!;
    // A uniform scale is not a disagreement: the same claim, carried, reads the same.
    expect(placed.overall).toBeGreaterThan(original.overall - 0.05);
  });

  it('a copy placed on ANOTHER PLANE — a turn — agrees just as much', () => {
    const { log, placedId } = boardWithAPlacedBox(rect(2, -1, 2, 1.3), width());
    const h = log.honoursOf(placedId)!;
    expect(h.per).toHaveLength(2);
    for (const p of h.per) expect(p.coverage).toBeGreaterThan(0.9);
  });

  it('a real mismatch in the outline it was placed at is STILL reported', () => {
    // A long thin outline is not the box's shape: the placement scales by the
    // size ratio, so the body is a box and the drawing is not.
    const { log, againId, placedId, profileId } = boardWithAPlacedBox(rect(2, 3, 3.2, 0.5));
    const h = log.honoursOf(placedId)!;
    const drawnHere = h.per.find((p) => p.markId === againId)!;
    expect(drawnHere.kind).toBe('target');
    expect(drawnHere.coverage).toBeLessThan(0.7);
    // …and the correspondence, which the body really does honour, is not dragged down with it.
    expect(h.per.find((p) => p.markId === profileId)!.coverage).toBeGreaterThan(0.9);
    expect(h.overall).toBeLessThan(0.95);
  });

  it('a profile drawn against the instance afterwards is a REVISION, scored where it lies', () => {
    const { log, placedId } = boardWithAPlacedBox();
    // Its side, drawn on the width plane OVER the body itself — where the body
    // stands, not where the definition's was drawn.
    const seen = bodyOn(log, placedId, width());
    const sideId = log.add(rect(seen.minX, seen.minY, seen.maxX - seen.minX, seen.maxY - seen.minY), width(), SCALE, 8000);
    const mine = log.profilesOf(placedId).map((p) => p.markId);
    expect(mine).toContain(sideId);
    const h = log.honoursOf(placedId)!;
    const revision = h.per.find((p) => p.markId === sideId);
    expect(revision).toBeTruthy();
    expect(revision!.kind).toBe('revision');
    expect(h.sentence).toMatch(/drawn since/);
  });

  it('undo takes the placement back and the original’s claims are exactly what they were', () => {
    const { log, originalId, placedId } = boardWithAPlacedBox();
    const before = log.honoursOf(originalId)!;
    log.undo();
    expect(log.solidOf(placedId)).toBeNull();
    const after = log.honoursOf(originalId)!;
    expect(after.per.map((p) => `${p.markId}|${p.kind}`)).toEqual(before.per.map((p) => `${p.markId}|${p.kind}`));
    expect(after.overall).toBeCloseTo(before.overall, 6);
  });

  it('REPLAY: the whole log through a fresh session classifies every claim the same way', () => {
    const { log, placedId } = boardWithAPlacedBox();
    const before = log.honoursOf(placedId)!;

    const ref: { log: Log | null } = { log: null };
    const replayed = createLog();
    ref.log = replayed;
    replayed.sees(spaceOver(ref));
    replayed.session.load(log.session.getEvents());

    const after = replayed.honoursOf(placedId)!;
    expect(after.per.map((p) => `${p.markId}|${p.kind}|${p.of ?? ''}`)).toEqual(
      before.per.map((p) => `${p.markId}|${p.kind}|${p.of ?? ''}`)
    );
    expect(after.sentence).toBe(before.sentence);
  });

  it('the claims come back from the tree itself, so the same walk answers off the log', () => {
    const { log, placedId, profileId, againId } = boardWithAPlacedBox();
    const tree = log.solidOf(placedId)!.tree;
    const cs = activeConstraints(tree, {
      inkOf: (id) => log.inkFor(id),
      closed: (id) => !!getFingerprint(log.markOf(id)?.points ?? [], SCALE).isClosed,
    });
    expect(cs.map((c) => `${c.markId}|${c.kind}`)).toEqual([`${againId}|target`, `${profileId}|source`]);
  });
});

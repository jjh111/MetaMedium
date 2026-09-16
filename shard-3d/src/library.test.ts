// The library: a definition carries its profiles, and a profile drawn again is
// matched against them (SHARD-3D-PLAN §2.5, §2.6 rule 3).
//
// Three things are pinned here, and they are the three P6 claims:
//
//   * **A mug's outline is not a box's.** The comparison has to tell two closed
//     profiles apart, or an offer to place one is a coin toss; the file states
//     both shapes and asserts the discrimination in both directions.
//   * **A correction sticks, and a REPLAY remembers it.** The whole log goes
//     through a fresh session and the same outline is still refused.
//   * **A placement holds no pose.** The step carries two stroke ids; the
//     scale, the turn and the shift are worked out again when the tree is
//     walked, and the walk is driven here with an injected silhouette and no
//     renderer at all.
//
// There is three.js in here, but no WebGL: geometry is arithmetic.

import { describe, it, expect } from 'vitest';
import { getFingerprint, type Point } from 'metamedium-core';
import {
  addProfileExample,
  compareProfiles,
  matchLibraryDefinition,
  planeKindOf,
  printOf,
  rankMatches,
  PROFILE_FLOOR,
  PLANE_LIFT,
  PLANE_DROP,
  type LibraryDefinition,
  type ProfileSignature,
} from './library';
import { createLog, type SpaceRead } from './log';
import { boundsOf, gridFor, padBounds, rasterise } from './diff';
import type { PlaneSilhouette } from './silhouette';
import { deriveTree, type DeriveContext } from './solid';
import { describeStep, parseOpTree, type PlaceStep } from './op';
import { parseProposal } from './generator';
import { foundation, height, toPlane, type Plane, type Vec3 } from './plane';

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
 * A mug, seen from the side: a body with a handle standing out of one edge.
 *
 * The numbers matter. Its bounding box is 4.0 × 2.4 and it fills 7.2 of the
 * 9.6 square units in it — extent 0.75 against a rectangle's 1.00 — which is
 * the handle, said as a number. That is what the comparison below has to see.
 */
const MUG_OUTLINE: Point[] = [
  { x: 0, y: 0 },
  { x: 2.4, y: 0 },
  { x: 2.4, y: -0.6 },
  { x: 4.0, y: -0.6 },
  { x: 4.0, y: -1.5 },
  { x: 2.4, y: -1.5 },
  { x: 2.4, y: -2.4 },
  { x: 0, y: -2.4 },
];

const printFor = (points: Point[]) => printOf(getFingerprint(points, SCALE));

const definitionOf = (
  name: string,
  points: Point[],
  planeKind: ProfileSignature['planeKind'],
  markId = `stroke:${name}`
): LibraryDefinition => ({
  name,
  basedOn: name,
  whole: true,
  profiles: [{ markId, planeKind, shape: 'polygon', print: printFor(points) }],
});

describe('a profile against a definition’s profiles', () => {
  const mug = definitionOf('mug', loop(MUG_OUTLINE), 'width');
  const box = definitionOf('box', rect(0, 0, 2.4, 2.4), 'width');

  it('the same outline drawn again scores high, and says what agreed', () => {
    // Drawn again somewhere else and a little bigger — the size is what `place`
    // scales by, so it is deliberately not part of what makes it the same shape.
    const again = printFor(loop(MUG_OUTLINE.map((p) => ({ x: p.x * 1.3 + 9, y: p.y * 1.3 - 4 }))));
    const m = matchLibraryDefinition(again, 'width', mug)!;
    expect(m.name).toBe('mug');
    expect(m.score).toBeGreaterThan(0.9);
    expect(m.reasoning).toMatch(/corners against/);
    expect(m.reasoning).toMatch(/extent/);
  });

  it('a plain rectangle is a BOX and is not a mug — both directions', () => {
    const plain = printFor(rect(0, 0, 2.4, 2.4));
    const asBox = matchLibraryDefinition(plain, 'width', box)!;
    const asMug = matchLibraryDefinition(plain, 'width', mug)!;
    expect(asBox.score).toBeGreaterThan(0.9);
    expect(asMug.score).toBeLessThan(PROFILE_FLOOR);
    expect(asBox.score - asMug.score).toBeGreaterThan(0.25);

    const mugAgain = printFor(loop(MUG_OUTLINE));
    const mugAsMug = matchLibraryDefinition(mugAgain, 'width', mug)!;
    const mugAsBox = matchLibraryDefinition(mugAgain, 'width', box)!;
    expect(mugAsMug.score).toBeGreaterThan(0.9);
    expect(mugAsBox.score).toBeLessThan(PROFILE_FLOOR);
  });

  it('the plane kind lifts an agreement and lowers a disagreement, and never vetoes', () => {
    const again = printFor(loop(MUG_OUTLINE));
    const same = matchLibraryDefinition(again, 'width', mug)!;
    const other = matchLibraryDefinition(again, 'foundation', mug)!;
    expect(same.score).toBeGreaterThan(other.score);
    // The same outline is the same outline: the whole difference between the
    // two numbers is the plane term, and it is at most the lift plus the drop.
    expect(same.score - other.score).toBeGreaterThanOrEqual(PLANE_DROP - 1e-9);
    expect(same.score - other.score).toBeLessThanOrEqual(PLANE_LIFT + PLANE_DROP + 1e-9);
    // Lowered, not refused: a mug drawn on the width plane is still a mug.
    expect(other.score).toBeGreaterThan(PROFILE_FLOOR);
    expect(other.reasoning).toMatch(/a plane is where a thing was drawn, not what it is/);
  });

  it('core’s straightness veto still holds: a line is not an outline', () => {
    const line = printFor(run({ x: 0, y: 0 }, { x: 3, y: 0 }));
    const c = compareProfiles(line, printFor(loop(MUG_OUTLINE)));
    expect(c.vetoed).toBe(true);
    expect(c.score).toBe(0);
    expect(c.reasoning).toMatch(/veto/);
  });

  it('matches rank plurally above the floor, best first, each with its reason', () => {
    const mugAgain = printFor(loop(MUG_OUTLINE));
    // A second definition whose outline is nearly the mug's: both are offered.
    const cup = definitionOf(
      'cup',
      loop(MUG_OUTLINE.map((p) => ({ x: p.x, y: p.y * 0.95 }))),
      'width',
      'stroke:cup'
    );
    const ranked = rankMatches(mugAgain, 'width', [box, cup, mug]);
    expect(ranked.length).toBe(2);
    expect(ranked.map((r) => r.name)).not.toContain('box');
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
    for (const r of ranked) expect(r.reasoning.length).toBeGreaterThan(20);
  });

  it('a rejected example vetoes the match outright, and says it was corrected', () => {
    const outline = loop(MUG_OUTLINE);
    const sig: ProfileSignature = {
      markId: 'stroke:9',
      planeKind: 'width',
      shape: 'polygon',
      print: printFor(outline),
    };
    const corrected: LibraryDefinition = { ...mug, examples: addProfileExample(undefined, sig, 'is-not') };
    const m = matchLibraryDefinition(printFor(outline), 'width', corrected)!;
    expect(m.vetoed).toBe(true);
    expect(m.score).toBe(0);
    expect(m.reasoning).toMatch(/was corrected: not a mug/);
    expect(rankMatches(printFor(outline), 'width', [corrected])).toHaveLength(0);
  });

  it('`addProfileExample` takes one off the other list rather than holding both', () => {
    const sig: ProfileSignature = {
      markId: 'stroke:9',
      planeKind: 'width',
      shape: 'polygon',
      print: printFor(loop(MUG_OUTLINE)),
    };
    const no = addProfileExample(undefined, sig, 'is-not');
    const yes = addProfileExample(no, sig, 'is');
    expect(no.rejected).toHaveLength(1);
    expect(yes.rejected).toHaveLength(0);
    expect(yes.accepted).toHaveLength(1);
  });

  it('planeKindOf reads the plane the way the offer says it', () => {
    expect(planeKindOf(foundation())).toBe('foundation');
    expect(planeKindOf(height())).toBe('height');
    expect(planeKindOf({ ...foundation(), name: undefined, source: 'face' })).toBe('face');
  });

  it('the plane penalty is smaller than the corner term — a mug is a mug wherever it is drawn', () => {
    expect(PLANE_DROP).toBeLessThan(0.28);
  });
});

// ===== through the log =======================================================

const BOX = { minX: -7, maxX: -3, minY: 0, maxY: 2.4, minZ: -2, maxZ: 0.6 };

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

function fakeSpace(box = BOX): SpaceRead {
  return {
    silhouettes: () => [],
    spanAlong: () => 0,
    silhouetteOn: (_id, plane) =>
      silhouetteOfBox({ min: { x: box.minX, y: box.minY, z: box.minZ }, max: { x: box.maxX, y: box.maxY, z: box.maxZ } }, plane),
  };
}

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

/** A box, named by the hand and taken: the library then holds it under that name. */
function boardWithATakenBox() {
  const log = createLog();
  log.sees(fakeSpace());
  const profileId = log.add(rect(-7, -2, 4, 2.6), foundation(), SCALE, 1000);
  const extentId = log.add(run({ x: -7, y: 0 }, { x: -7, y: -2.4 }), height(), SCALE, 2000);
  const solid = log.make(log.makeable()[0], 3000)!;
  log.name(solid.id, 'box', 4000);
  const took = log.take(solid.id, 5000);
  return { log, profileId, extentId, solidId: solid.id, took };
}

describe('taking a version holds the WHOLE as a definition, with its profiles', () => {
  it('holds the name the hand gave, with the outlines it was made from', () => {
    const { log, profileId, took } = boardWithATakenBox();
    expect(took?.name).toBe('box');
    const defs = log.definitions();
    const whole = defs.find((d) => d.name === 'box')!;
    expect(whole).toBeTruthy();
    expect(whole.whole).toBe(true);
    expect(whole.steps).toHaveLength(1);
    expect(whole.profiles.map((p) => p.markId)).toEqual([profileId]);
    expect(whole.profiles[0].planeKind).toBe('foundation');
    expect(whole.why).toMatch(/the whole of/);
  });

  it('an EXTENT is not a profile — a line is not an outline to match on', () => {
    const { log, extentId } = boardWithATakenBox();
    const whole = log.definitions().find((d) => d.name === 'box')!;
    expect(whole.profiles.some((p) => p.markId === extentId)).toBe(false);
  });

  it('the hand’s own name wins over a step’s — the part never names the whole', () => {
    const { log, solidId } = boardWithATakenBox();
    expect(log.solidOf(solidId)!.name).toBe('box');
    expect(log.solidOf(solidId)!.named).toBe('human');
  });
});

describe('the profile drawn again is offered', () => {
  /** The same footprint, half the size, well clear of the box. */
  function drawAgain(log: ReturnType<typeof createLog>) {
    return log.add(rect(2, 3, 2, 1.3), foundation(), SCALE, 6000);
  }

  it('offers the definition, above the floor, with a reason', () => {
    const { log } = boardWithATakenBox();
    const againId = drawAgain(log);
    const matches = log.definitionMatches(againId);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].name).toBe('box');
    expect(matches[0].score).toBeGreaterThan(0.8);
    expect(matches[0].reasoning).toMatch(/the same kind of plane/);
  });

  it('ink a solid was made from is its provenance — never offered as a match', () => {
    const { log, profileId } = boardWithATakenBox();
    expect(log.definitionMatches(profileId)).toHaveLength(0);
  });

  it('a line is never offered a definition', () => {
    const { log } = boardWithATakenBox();
    const lineId = log.add(run({ x: 6, y: 6 }, { x: 9, y: 6 }), foundation(), SCALE, 6000);
    expect(log.definitionMatches(lineId)).toHaveLength(0);
  });

  it('*Not a box* is held in the log, and survives a REPLAY', () => {
    const { log } = boardWithATakenBox();
    const againId = drawAgain(log);
    expect(log.definitionMatches(againId).some((m) => m.name === 'box')).toBe(true);

    const said = log.correct('box', againId, 'is-not', 7000)!;
    expect(said.definition).toBe('box');
    expect(said.why).toMatch(/is not a box/);
    expect(log.definitionMatches(againId).some((m) => m.name === 'box')).toBe(false);

    // The whole log, through a fresh session: the correction is an event like
    // everything else, so the same outline is still refused.
    const replayed = createLog();
    replayed.sees(fakeSpace());
    replayed.session.load(log.session.getEvents());
    expect(replayed.definitions().find((d) => d.name === 'box')?.examples?.rejected).toHaveLength(1);
    expect(replayed.definitionMatches(againId).some((m) => m.name === 'box')).toBe(false);
    // …and an outline that is NOT the corrected one is still offered.
    // A different outline — much longer for its height — is still offered: a
    // correction is about the SHAPE that was corrected, not about every
    // rectangle ever drawn.
    const other = replayed.add(rect(9, 9, 2.8, 1.0), foundation(), SCALE, 8000);
    expect(replayed.definitionMatches(other).some((m) => m.name === 'box')).toBe(true);
  });

  it('one undo takes the correction back', () => {
    const { log } = boardWithATakenBox();
    const againId = drawAgain(log);
    log.correct('box', againId, 'is-not', 7000);
    expect(log.definitionMatches(againId).some((m) => m.name === 'box')).toBe(false);
    log.undo();
    expect(log.definitionMatches(againId).some((m) => m.name === 'box')).toBe(true);
  });
});

describe('place — the definition standing where the profile was drawn again', () => {
  function placed() {
    const { log, profileId, solidId } = boardWithATakenBox();
    const againId = log.add(rect(2, 3, 2, 1.3), foundation(), SCALE, 6000);
    const made = log.place('box', againId, 7000)!;
    return { log, profileId, solidId, againId, made };
  }

  it('is a NEW artifact, named from the library, holding one `place` step', () => {
    const { log, made, solidId, againId } = placed();
    expect(made).toBeTruthy();
    expect(made.id).not.toBe(solidId);
    expect(log.solids()).toHaveLength(2);
    const solid = log.solidOf(made.id)!;
    expect(solid.name).toBe('box');
    expect(solid.named).toBe('human');
    expect(solid.memberIds).toContain(againId);
    expect(solid.tree.steps).toHaveLength(1);
    const step = solid.tree.steps[0] as PlaceStep;
    expect(step.op).toBe('place');
    expect(step.definition).toBe('box');
    expect(step.toMark).toBe(againId);
    expect(step.from).toContain(againId);
  });

  it('holds NO pose — only the two inks it is derived from', () => {
    const { log, made, profileId, againId } = placed();
    const step = log.solidOf(made.id)!.tree.steps[0] as PlaceStep;
    expect(step.of).toBe(profileId);
    expect(step.toMark).toBe(againId);
    expect(step.fromPlane?.name).toBe('foundation');
    expect(step.toPlane?.name).toBe('foundation');
    // Nothing that could go stale: no scale, no matrix, no centre.
    expect(Object.keys(step)).not.toContain('scale');
    expect(Object.keys(step)).not.toContain('matrix');
    expect(JSON.stringify(step)).not.toMatch(/"centre/);
    expect(step.reasoning).toMatch(/every time the tree is walked/);
  });

  it('the scale is the size ratio, and the body stands where the outline was drawn', () => {
    const { log, made } = placed();
    // 2 × 1.3 against 4 × 2.6 — half, exactly.
    expect(made.scale).toBeCloseTo(0.5, 2);
    const derived = deriveTree(log.solidOf(made.id)!.tree, deriveContext(log));
    expect(derived.broken).toBeNull();
    const geo = derived.geometry!;
    geo.computeBoundingBox();
    const b = geo.boundingBox!;
    expect(b.min.x).toBeCloseTo(2, 1);
    expect(b.max.x).toBeCloseTo(4, 1);
    expect(b.min.z).toBeCloseTo(3, 1);
    expect(b.max.z).toBeCloseTo(4.3, 1);
    // Half as tall as the box it was placed from, because the scale is uniform.
    expect(b.min.y).toBeCloseTo(0, 2);
    expect(b.max.y).toBeCloseTo(1.2, 1);
  });

  it('the original is untouched — one tree, two things', () => {
    const { log, solidId } = placed();
    const first = log.solidOf(solidId)!;
    expect(first.tree.steps).toHaveLength(1);
    expect(first.tree.steps[0].op).toBe('extrude');
  });

  it('ROUND TRIP: the whole log through a fresh session derives the same body', () => {
    const { log, made } = placed();
    const replayed = createLog();
    replayed.sees(fakeSpace());
    replayed.session.load(log.session.getEvents());
    const again = replayed.solids().find((s) => s.id === made.id)!;
    expect(again).toBeTruthy();
    expect(JSON.stringify(again.tree)).toBe(JSON.stringify(log.solidOf(made.id)!.tree));
    // …and the code the log holds is still one of the shard's own trees.
    expect(parseOpTree(undefined)).toBeNull();
    const derived = deriveTree(again.tree, deriveContext(replayed));
    expect(derived.broken).toBeNull();
    derived.geometry!.computeBoundingBox();
    expect(derived.geometry!.boundingBox!.max.y).toBeCloseTo(1.2, 1);
  });

  it('one undo takes the placement off and leaves both inks', () => {
    const { log, made, againId } = placed();
    expect(log.solids()).toHaveLength(2);
    log.undo();
    expect(log.solids()).toHaveLength(1);
    expect(log.solidOf(made.id)).toBeNull();
    expect(log.markOf(againId)).toBeTruthy();
  });

  it('with no mark it stands at the world origin, and says it took no size from anything', () => {
    const { log } = boardWithATakenBox();
    const made = log.place('box', null, 7000)!;
    expect(made.scale).toBe(1);
    const step = log.solidOf(made.id)!.tree.steps[0] as PlaceStep;
    expect(step.toMark).toBeUndefined();
    expect(step.toPoint).toEqual({ x: 0, y: 0, z: 0 });
    expect(step.reasoning).toMatch(/at the world origin/);
    const derived = deriveTree(log.solidOf(made.id)!.tree, deriveContext(log));
    derived.geometry!.computeBoundingBox();
    const b = derived.geometry!.boundingBox!;
    expect((b.min.x + b.max.x) / 2).toBeCloseTo(0, 5);
    expect((b.min.z + b.max.z) / 2).toBeCloseTo(0, 5);
  });

  it('a placement whose source ink has gone marks the solid broken, and leaves the log alone', () => {
    const { log, made, profileId } = placed();
    const tree = log.solidOf(made.id)!.tree;
    const derived = deriveTree(tree, { inkOf: (id) => (id === profileId ? null : log.inkFor(id)) });
    expect(derived.broken).toMatch(/is not on the board/);
  });

  it('says *placed from box* in the panel’s own words', () => {
    const { log, made, againId } = placed();
    const step = log.solidOf(made.id)!.tree.steps[0];
    const said = describeStep(step);
    expect(said).toMatch(/placed from box/);
    expect(said).toMatch(new RegExp(`from .*${againId}`));
  });

  it('refuses, with a reason, what it cannot place', () => {
    const { log, profileId } = boardWithATakenBox();
    expect(log.whyNotPlace('mug', null)).toMatch(/nothing in the library is called/);
    expect(log.whyNotPlace('box', profileId)).toMatch(/already taken into a solid/);
    expect(log.whyNotPlace('box', null)).toBeNull();
  });
});

describe('`reuse` is honoured by placing, not by writing a tree', () => {
  it('a model that says the library already holds it writes nothing, and the shard places it', () => {
    const { log, solidId } = boardWithATakenBox();
    // The reply a model gives when the brief's DEFINITIONS line already carries
    // what was asked for (v9 S5's rule, and §6's last clause).
    const proposal = parseProposal('{"reuse":"box"}');
    expect(proposal.reuse).toBe('box');
    expect(proposal.steps).toHaveLength(0);
    expect(proposal.reasoning).toMatch(/reused, not written/);

    const versionsBefore = log.session.getState().nodes.get(solidId)!.reps.filter((r) => r.modality === 'code').length;
    const againId = log.add(rect(2, 3, 2, 1.3), foundation(), SCALE, 6000);
    const made = log.place(proposal.reuse!, againId, 7000)!;
    expect(made.name).toBe('box');
    expect(log.solids()).toHaveLength(2);
    // Nothing was written into the solid the brief was about.
    const versionsAfter = log.session.getState().nodes.get(solidId)!.reps.filter((r) => r.modality === 'code').length;
    expect(versionsAfter).toBe(versionsBefore);
  });

  it('the brief lists what the library holds, with its step and profile counts', () => {
    const { log } = boardWithATakenBox();
    const scene = log.scene('another one like that');
    expect(scene.definitions).toHaveLength(1);
    expect(scene.definitions![0]).toMatchObject({ name: 'box', steps: 1, profiles: 1, whole: true });
  });
});

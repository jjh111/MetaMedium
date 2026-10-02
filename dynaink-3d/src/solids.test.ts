// Solids in the log (invariant 4: the log is the source, the mesh is derived).
//
// Nothing here renders anything. These tests go through the REAL session — the
// same events a hand makes — and check that a solid is held as an op tree
// referencing its strokes, attributed to the engine, that the whole thing
// replays into a fresh session unchanged, and that one undo removes the solid
// and leaves the ink.

import { describe, it, expect } from 'vitest';
import { ENGINE_PARTICIPANT, type Point } from 'metamedium-core';
import { createLog } from './log';
import { foundation, height, v3, type Plane } from './plane';
import type { PlaneCandidate } from './planarity';
import { parseOpTree, type ExtrudeStep, type RevolveStep } from './op';

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

function ring(cx: number, cy: number, r: number, n = 56): Point[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    return { x: cx + Math.cos(t) * r, y: cy + Math.sin(t) * r };
  });
}

const run = (a: Point, b: Point, n = 24): Point[] =>
  Array.from({ length: n + 1 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n }));

/** The scale a pen at this depth would have worked at, near enough for a headless test. */
const SCALE = 0.012;

function boardWithABox() {
  const log = createLog();
  const profileId = log.add(rect(-7, -2, 4, 2.6), foundation(), SCALE, 1000);
  const extentId = log.add(run({ x: -7, y: 0 }, { x: -7, y: -2.4 }), height(), SCALE, 2000);
  return { log, profileId, extentId };
}

describe('the form rung, through the log', () => {
  it('reads the rectangle as a profile and the line as its extent', () => {
    const { log, profileId, extentId } = boardWithABox();
    const forms = log.forms();
    expect(forms.find((f) => f.id === profileId)?.role).toBe('profile');
    const extent = forms.find((f) => f.id === extentId);
    expect(extent?.role).toBe('extent');
    expect(extent?.targets).toEqual([profileId]);
  });

  it('affords exactly one extrude, and nothing else', () => {
    const { log, profileId, extentId } = boardWithABox();
    expect(log.makeable()).toEqual([
      expect.objectContaining({ kind: 'extrude', profileId, extentId }),
    ]);
  });
});

describe('a box, made at tier 1', () => {
  it('stands as ONE artifact carrying an extrude step, attributed to the engine', () => {
    const { log, profileId, extentId } = boardWithABox();
    const made = log.make(log.makeable()[0], 3000);
    expect(made).not.toBeNull();
    expect(made!.name).toBe('box');

    const solids = log.solids();
    expect(solids).toHaveLength(1);
    const solid = solids[0];
    expect(solid.tree.steps).toHaveLength(1);
    const step = solid.tree.steps[0] as ExtrudeStep;
    expect(step.op).toBe('extrude');
    expect(step.depth).toBeCloseTo(2.4, 2);
    expect(step.from).toEqual([profileId, extentId]);
    expect(solid.memberIds).toEqual([profileId, extentId]);

    // Attribution: tier 1 made it, so the engine is the author of the tree.
    const node = log.session.getState().nodes.get(solid.id)!;
    const code = [...node.reps].reverse().find((r) => r.modality === 'code')!;
    expect(code.source).toBe(ENGINE_PARTICIPANT);
    expect((code.data as { kind: string }).kind).toBe('json');
  });

  it('is built from the CLEAN rectangle, not from the wobble', () => {
    const { log } = boardWithABox();
    log.make(log.makeable()[0], 3000);
    const step = log.solids()[0].tree.steps[0] as ExtrudeStep;
    expect(step.profile.shape).toBe('rectangle');
    expect(step.profile.points).toHaveLength(4);
    expect(step.profile.reasoning).toMatch(/squared up/);
  });

  it('keeps the ink: the profile and the extent are still marks on the board', () => {
    const { log, profileId, extentId } = boardWithABox();
    log.make(log.makeable()[0], 3000);
    const ids = log.marks().map((m) => m.id);
    expect(ids).toContain(profileId);
    expect(ids).toContain(extentId);
    expect(log.solidFor(profileId)?.id).toBe(log.solids()[0].id);
  });

  it('does not offer to make the same solid twice', () => {
    const { log } = boardWithABox();
    log.make(log.makeable()[0], 3000);
    expect(log.makeable()).toEqual([]);
  });
});

describe('a revolve', () => {
  it('a closed profile with a line beside it in its own plane turns about it', () => {
    const log = createLog();
    const p = log.add(ring(2, -2, 0.8), height(), SCALE, 1000);
    const a = log.add(run({ x: 4, y: -0.4 }, { x: 4, y: -3.6 }), height(), SCALE, 2000);
    expect(log.forms().find((f) => f.id === a)?.role).toBe('axis');
    const made = log.make(log.makeable()[0], 3000);
    expect(made!.name).toBe('revolve');
    const step = log.solids()[0].tree.steps[0] as RevolveStep;
    expect(step.op).toBe('revolve');
    expect(step.from).toEqual([p, a]);
    expect(step.axis.direction.y).toBeCloseTo(1, 3);
    expect(step.sweep).toBeCloseTo(Math.PI * 2, 3);
  });
});

describe('replay — the whole solid is a function of the log', () => {
  it('a fresh session fed the same events stands the same tree, with the same depth', () => {
    const { log } = boardWithABox();
    log.make(log.makeable()[0], 3000);
    const before = log.solids()[0];

    const replayed = createLog();
    replayed.session.load(log.session.getEvents().map((e) => ({ ...e })));
    const after = replayed.solids();

    expect(after).toHaveLength(1);
    expect(after[0].id).toBe(before.id);
    expect(after[0].tree).toEqual(before.tree);
    expect((after[0].tree.steps[0] as ExtrudeStep).depth).toBeCloseTo(
      (before.tree.steps[0] as ExtrudeStep).depth,
      6
    );
    // And the tree really is what the log holds, not something re-derived:
    const node = replayed.session.getState().nodes.get(after[0].id)!;
    const code = [...node.reps].reverse().find((r) => r.modality === 'code')!.data as { code: string };
    expect(parseOpTree(code.code)).toEqual(before.tree);
  });
});

describe('undo removes the solid and leaves the ink', () => {
  it('one undo drops the solid; the two marks stay exactly where they were', () => {
    const { log, profileId, extentId } = boardWithABox();
    log.make(log.makeable()[0], 3000);
    expect(log.solids()).toHaveLength(1);

    log.undo();

    expect(log.solids()).toHaveLength(0);
    const ids = log.marks().map((m) => m.id);
    expect(ids).toEqual([profileId, extentId]);
    // …and the offer is back, because the marks are back on the content plane.
    expect(log.makeable()).toHaveLength(1);
  });

  it('the next undo drops the extent, and the one after that the profile', () => {
    const { log, profileId } = boardWithABox();
    log.make(log.makeable()[0], 3000);
    log.undo();
    log.undo();
    expect(log.marks().map((m) => m.id)).toEqual([profileId]);
    log.undo();
    expect(log.marks()).toEqual([]);
  });
});

describe('the hand\'s own name, and taking a solid off the board', () => {
  it('a name typed in the field is held as the hand\'s, over the engine\'s word', () => {
    const { log } = boardWithABox();
    log.make(log.makeable()[0], 3000);
    const id = log.solids()[0].id;
    expect(log.solidOf(id)!.named).toBe('engine');
    log.name(id, 'plinth', 4000);
    expect(log.solidOf(id)!.name).toBe('plinth');
    expect(log.solidOf(id)!.named).toBe('human');
    log.name(id, 'base', 5000);
    expect(log.solidOf(id)!.name).toBe('base'); // the newest, not the first
  });

  it('removing a solid leaves its ink on the board', () => {
    const { log, profileId, extentId } = boardWithABox();
    log.make(log.makeable()[0], 3000);
    log.remove(log.solids()[0].id, 4000);
    expect(log.solids()).toHaveLength(0);
    expect(log.marks().map((m) => m.id)).toEqual([profileId, extentId]);
  });
});

// ===== P3: features, cuts and the rest of tier 1 ===========================

/**
 * A board with a box standing, and a circle drawn on its top face.
 *
 * The face plane is stated the way P1's read gives it: source `face`, and the
 * winner's ANCHOR carrying the face's own extent and the solid it belongs to.
 * That anchor is all row 3 needs, and it is what the log keeps in the plane
 * rep — so this is the same shape a real pen-down produces.
 */
function boardWithAFeature() {
  const { log, profileId, extentId } = boardWithABox();
  const solid = log.make(log.makeable()[0], 3000)!;
  const face: Plane = {
    origin: v3(0, 2.4, 0),
    normal: v3(0, 1, 0),
    up: v3(0, 0, 1),
    source: 'face',
    name: `top of ${solid.id}`,
    why: `the pen came down on the top of ${solid.id}`,
  };
  const candidate: PlaneCandidate = {
    plane: face,
    label: `top of ${solid.id}`,
    confidence: 0.82,
    reasoning: 'reads circle 0.91 there',
    oblique: false,
    anchor: { bounds: { minX: -7, minY: -2, maxX: -3, maxY: 0.6 }, what: `top of ${solid.id}`, solidId: solid.id },
  };
  const featureId = log.add(ring(-5, -0.7, 0.6), face, SCALE, 4000, { candidates: [candidate] });
  return { log, profileId, extentId, solidId: solid.id, featureId };
}

describe('a feature on a face', () => {
  it('plays `feature`, names the face, and is offered — never acted on', () => {
    const { log, featureId, solidId } = boardWithAFeature();
    const form = log.formOf(featureId)!;
    expect(form.role).toBe('feature');
    expect(form.rule).toBe(3);
    expect(form.targets).toEqual([solidId]);
    // Tier 1 makes nothing of it on its own: a hole and a boss are two
    // intentions, and the drawing does not say which.
    expect(log.makeable()).toEqual([]);
    const offer = log.featureFor(solidId)!;
    expect(offer.featureId).toBe(featureId);
    expect(offer.extentId).toBeUndefined();
  });
});

describe('cut — a new VERSION of the same solid', () => {
  it('appends a nested step, keeps the solid, and holds every version of the tree', () => {
    const { log, solidId, featureId } = boardWithAFeature();
    const before = log.solidOf(solidId)!;
    const node0 = log.session.getState().nodes.get(solidId)!;
    const versionsBefore = node0.reps.filter((r) => r.modality === 'code').length;

    const made = log.cut(log.featureFor(solidId)!, 5000)!;
    expect(made.id).toBe(solidId);
    const after = log.solidOf(solidId)!;
    expect(log.solids()).toHaveLength(1); // a cut is not a second solid
    expect(after.tree.steps.map((s) => s.op)).toEqual(['extrude', 'cut']);
    expect(after.tree.steps[1].on).toBe(before.tree.steps[0].id);
    expect(after.tree.steps[1].from).toEqual([featureId]);

    // EVERY version is held: the first tree is still in the log, attributed.
    const node = log.session.getState().nodes.get(solidId)!;
    const codes = node.reps.filter((r) => r.modality === 'code');
    expect(codes).toHaveLength(versionsBefore + 1);
    expect(parseOpTree((codes[0].data as { code: string }).code)!.steps).toHaveLength(1);
    expect(parseOpTree((codes[1].data as { code: string }).code)!.steps).toHaveLength(2);
    expect(codes[1].source).toBe(ENGINE_PARTICIPANT);

    // The feature's ink is taken into the solid, so it is not offered again…
    expect(log.solidFor(featureId)!.id).toBe(solidId);
    expect(log.featureFor(solidId)).toBeNull();
    // …and it is still ink on the board (invariant 3).
    expect(log.marks().map((m) => m.id)).toContain(featureId);
  });

  it('one undo drops the version and leaves the box standing on its first tree', () => {
    const { log, solidId, featureId } = boardWithAFeature();
    log.cut(log.featureFor(solidId)!, 5000);
    expect(log.solidOf(solidId)!.tree.steps).toHaveLength(2);

    log.undo();
    const back = log.solidOf(solidId);
    expect(back).toBeTruthy();
    expect(back!.tree.steps.map((s) => s.op)).toEqual(['extrude']);
    // The circle is still lying on the face — undo dropped the cut, not the ink.
    expect(log.marks().map((m) => m.id)).toContain(featureId);
    // …and it is offered again, because the tree no longer names it.
    expect(log.featureFor(solidId)!.featureId).toBe(featureId);
  });

  it('replays into a fresh session as the SAME nested tree', () => {
    const { log, solidId } = boardWithAFeature();
    log.cut(log.featureFor(solidId)!, 5000);
    const before = log.solidOf(solidId)!;

    const replayed = createLog();
    replayed.session.load(log.session.getEvents().map((e) => ({ ...e })));
    const after = replayed.solidOf(solidId)!;
    expect(after.tree).toEqual(before.tree);
    expect(after.tree.steps[1].on).toBe(after.tree.steps[0].id);
  });
});

describe('boss, mirror and dup', () => {
  it('a boss is the same feature, the other way, and also a version', () => {
    const { log, solidId } = boardWithAFeature();
    const made = log.boss(log.featureFor(solidId)!, 5000)!;
    const step = log.solidOf(solidId)!.tree.steps[1];
    expect(step.op).toBe('boss');
    expect(made.step.op).toBe('boss');
    expect((step as { depth: number }).depth).toBeGreaterThan(0);
  });

  it('a mirror appends a step naming the plane it reflects across', () => {
    const { log, solidId } = boardWithAFeature();
    log.mirror(solidId, height(), 5000);
    const step = log.solidOf(solidId)!.tree.steps[1];
    expect(step.op).toBe('mirror');
    expect(step.on).toBe(log.solidOf(solidId)!.tree.steps[0].id);
  });

  it('a dup is a `place` of a copy of the tree, on the body it came from — one tree, two bodies', () => {
    const { log, solidId } = boardWithAFeature();
    log.dup(solidId, 5000);
    expect(log.solids()).toHaveLength(1);
    const step = log.solidOf(solidId)!.tree.steps[1];
    expect(step.op).toBe('place');
    expect(step.on).toBe(log.solidOf(solidId)!.tree.steps[0].id);
    expect((step as { offset: { x: number } }).offset.x).toBeGreaterThan(0);
  });
});

// The op tree (SHARD-3D-PLAN §2.4).
//
// A solid is a tree of steps, not a mesh: these tests pin the PARAMETERS the
// tree derives from the drawing — the direction an extrude grows, the depth
// and its sign, the axis a revolve turns about — because everything the
// renderer does afterwards is a function of exactly those numbers.

import { describe, it, expect } from 'vitest';
import type { Point } from 'metamedium-core';
import {
  FULL_SWEEP,
  OP_KINDS,
  OP_MARK,
  OP_PACKAGES,
  describeStep,
  encodeOpTree,
  extrudeStep,
  isOpTree,
  latheProfile,
  parseOpTree,
  revolveStep,
  strokesOf,
  treeOf,
  bossStep,
  cutStep,
  depthsOf,
  mirrorStep,
  nextStepId,
  placeStep,
  rootOf,
  withStep,
  type FeatureInput,
  type LineInput,
  type Profile2D,
  type ProfileInput,
} from './op';
import { foundation, height, v3, type Plane } from './plane';

const square: Point[] = [
  { x: -7, y: -2 },
  { x: -3, y: -2 },
  { x: -3, y: 0.6 },
  { x: -7, y: 0.6 },
];

const profile: ProfileInput = {
  id: 'stroke:1',
  plane: foundation(),
  clean: { shape: 'rectangle', points: square, closed: true, reasoning: 'the box the ink fills, squared up' },
};

/** On the height plane, +v is DOWN: (-7, -2.4) is world (-7, 2.4, 0) — up. */
const up: LineInput = { id: 'stroke:2', plane: height(), points: [{ x: -7, y: 0 }, { x: -7, y: -2.4 }] };
const down: LineInput = { id: 'stroke:2', plane: height(), points: [{ x: -7, y: 0 }, { x: -7, y: 2.4 }] };

describe('the vocabulary is whole, and says which package fills each row', () => {
  it('carries every step of §2.4', () => {
    // `match` is P4's growth of the closed vocabulary and `massing` is P5's —
    // both sanctioned by their package, which is the only way §2.6 lets a
    // closed rung grow.
    expect(OP_KINDS).toEqual([
      'extrude', 'revolve', 'sweep', 'loft', 'cut', 'boss', 'union', 'mirror', 'place', 'along', 'match', 'massing', 'mesh',
    ]);
    expect(OP_KINDS.every((k) => !!OP_PACKAGES[k])).toBe(true);
    expect(OP_PACKAGES.extrude).toBe('P2');
    expect(OP_PACKAGES.cut).toBe('P3');
    expect(OP_PACKAGES.match).toMatch(/^P4/);
    expect(OP_PACKAGES.massing).toMatch(/^P5/);
  });
});

describe('extrude(profile, extent)', () => {
  it('grows the profile along its plane\'s normal, by the extent\'s own length', () => {
    const step = extrudeStep(profile, up);
    expect(step.op).toBe('extrude');
    expect(step.depth).toBeCloseTo(2.4, 4);
    expect(step.plane.normal).toEqual({ x: 0, y: 1, z: 0 });
    expect(step.profile.shape).toBe('rectangle');
    expect(step.from).toEqual(['stroke:1', 'stroke:2']);
    expect(step.reasoning).toMatch(/grown 2\.40 u along its normal/);
  });

  it('signs the depth by which side of the plane the extent went', () => {
    expect(extrudeStep(profile, down).depth).toBeCloseTo(-2.4, 4);
    expect(extrudeStep(profile, down).reasoning).toMatch(/against its normal/);
  });

  it('is the length that was DRAWN, not a number from anywhere else', () => {
    const shorter: LineInput = { id: 'stroke:2', plane: height(), points: [{ x: -7, y: 0 }, { x: -7, y: -0.8 }] };
    expect(extrudeStep(profile, shorter).depth).toBeCloseTo(0.8, 4);
  });

  it('describes itself as the panel shows it', () => {
    expect(describeStep(extrudeStep(profile, up))).toBe('extrude · depth 2.40 u · from stroke:1 + stroke:2');
  });
});

describe('revolve(profile, axis, sweep)', () => {
  // A circle centred at height (2, -2) — world (2, 2, 0) — with a vertical
  // line at world x = 4 beside it.
  const disc: ProfileInput = {
    id: 'p',
    plane: height(),
    clean: {
      shape: 'circle',
      closed: true,
      reasoning: 'a circle of radius 0.8 on the ink\'s centre',
      points: Array.from({ length: 24 }, (_, i) => {
        const t = (i / 24) * Math.PI * 2;
        return { x: 2 + Math.cos(t) * 0.8, y: -2 + Math.sin(t) * 0.8 };
      }),
    },
  };
  const axis: LineInput = { id: 'a', plane: height(), points: [{ x: 4, y: -0.4 }, { x: 4, y: -3.6 }] };

  it('keeps the axis as a world line, and turns the whole way by default', () => {
    const step = revolveStep(disc, axis);
    expect(step.op).toBe('revolve');
    expect(step.axis.point).toEqual({ x: 4, y: 0.4, z: 0 });
    expect(step.axis.direction.y).toBeCloseTo(1, 4);
    expect(step.axis.direction.x).toBeCloseTo(0, 4);
    expect(step.sweep).toBeCloseTo(FULL_SWEEP, 3);
    expect(step.reasoning).toMatch(/turned the whole way/);
  });

  it('measures the profile as radius from the axis and height along it', () => {
    const prof = latheProfile(revolveStep(disc, axis));
    const radii = prof.map((p) => p.r);
    // The circle's centre is 2 units from the axis and its radius is 0.8.
    expect(Math.min(...radii)).toBeCloseTo(1.2, 3);
    expect(Math.max(...radii)).toBeCloseTo(2.8, 3);
    // …and it never reaches the axis, so the lathe is a ring, not a cone.
    expect(Math.min(...radii)).toBeGreaterThan(0);
  });

  it('takes a part turn when asked', () => {
    const step = revolveStep(disc, axis, Math.PI);
    expect(step.sweep).toBeCloseTo(Math.PI, 4);
    expect(describeStep(step)).toMatch(/revolve · 180°/);
  });
});

describe('the tree as the log holds it', () => {
  it('carries the marker on its first line, the way GRAPH3D_MARK marks a program', () => {
    const text = encodeOpTree(treeOf(extrudeStep(profile, up)));
    expect(text.split('\n')[0].startsWith(OP_MARK)).toBe(true);
    expect(isOpTree(text)).toBe(true);
    expect(isOpTree('{"some":"other json"}')).toBe(false);
    expect(isOpTree(undefined)).toBe(false);
  });

  it('round-trips: the tree out is the tree in', () => {
    const tree = treeOf(extrudeStep(profile, up));
    const back = parseOpTree(encodeOpTree(tree));
    expect(back).toEqual(tree);
  });

  it('refuses text that is not one of the shard\'s trees', () => {
    expect(parseOpTree('// mm:structure graph3d\nvar ATOMS = [];')).toBeNull();
    expect(parseOpTree(OP_MARK + '\nnot json at all')).toBeNull();
  });

  it('names every stroke it was made from — what ink over the solid addresses', () => {
    expect(strokesOf(treeOf(extrudeStep(profile, up)))).toEqual(['stroke:1', 'stroke:2']);
  });
});

// ===== P3: cut, boss, mirror, dup, and the tree that nests ==================

/** The top face of the box the extrude makes: y = 2.4, normal +Y, the face's own frame. */
const face: Plane = {
  origin: v3(0, 2.4, 0),
  normal: v3(0, 1, 0),
  up: v3(0, 0, 1),
  source: 'face',
  name: 'top of artifact:7',
  why: 'the pen came down on it',
};

/** A 1.2-wide, 0.8-tall hole shape in the face's own (u, v). */
const holeShape: Profile2D = {
  shape: 'circle',
  closed: true,
  reasoning: 'a circle of radius 0.6 on the ink\'s centre',
  points: Array.from({ length: 24 }, (_, i) => {
    const t = (i / 24) * Math.PI * 2;
    return { x: -5 + Math.cos(t) * 0.6, y: -0.7 + Math.sin(t) * 0.4 };
  }),
};

const feature: FeatureInput = { id: 'stroke:5', plane: face, clean: holeShape, solidId: 'artifact:7' };
const boxTree = () => treeOf(extrudeStep(profile, up));

describe('cut — the depth §8 fixes', () => {
  it('with no extent it goes THROUGH: as far as the body reaches down the normal, and says so', () => {
    const step = cutStep(boxTree(), feature, { span: 2.4 });
    expect(step.op).toBe('cut');
    expect(step.through).toBe(true);
    // Sunk, not raised: a cut goes AGAINST the face's outward normal.
    expect(step.depth).toBeLessThan(0);
    // The span plus the tool's own lift, so no face of the tool is coplanar.
    expect(Math.abs(step.depth)).toBeGreaterThan(2.4);
    expect(Math.abs(step.depth)).toBeLessThan(2.4 * 1.1);
    // And it starts ABOVE the face for the same reason.
    expect(step.start).toBeGreaterThan(0);
    expect(step.reasoning).toMatch(/cut THROUGH/);
    expect(step.reasoning).toMatch(/all the way out the far side/);
  });

  it('an extent drawn from the feature\'s edge sets the depth instead, and it says whose', () => {
    const step = cutStep(boxTree(), feature, { extent: { id: 'stroke:6', length: 0.9 }, span: 2.4 });
    expect(step.through).toBeUndefined();
    expect(Math.abs(step.depth)).toBeGreaterThan(0.9);
    expect(Math.abs(step.depth)).toBeLessThan(0.9 * 1.15);
    expect(step.reasoning).toMatch(/the length of the extent stroke:6/);
  });

  it('it nests: the cut names the step it acts on, and that step is the extrude', () => {
    const tree = boxTree();
    const step = cutStep(tree, feature, { span: 2.4 }, nextStepId(tree));
    const next = withStep(tree, step);
    expect(step.on).toBe(tree.steps[0].id);
    expect(step.id).not.toBe(tree.steps[0].id);
    // The tree's ANSWER is the cut, not the extrude it was cut into.
    expect(rootOf(next)!.id).toBe(step.id);
    expect(depthsOf(next).get(step.id)).toBe(1);
    expect(depthsOf(next).get(tree.steps[0].id)).toBe(0);
  });

  it('the cut is from the feature\'s stroke — ink over the hole addresses the circle', () => {
    const step = cutStep(boxTree(), feature, { span: 2.4 });
    expect(step.from).toEqual(['stroke:5']);
    expect(strokesOf(withStep(boxTree(), step))).toEqual(['stroke:1', 'stroke:2', 'stroke:5']);
  });
});

describe('boss — the other intention, the same feature', () => {
  it('with no extent it rises by the feature\'s OWN SHORT SIDE — the only depth the drawing has', () => {
    const step = bossStep(boxTree(), feature);
    expect(step.op).toBe('boss');
    expect(step.depth).toBeGreaterThan(0); // raised, along the normal
    // The hole shape is 1.2 × 0.8; its short side is 0.8.
    expect(Math.abs(step.depth)).toBeGreaterThan(0.8);
    expect(Math.abs(step.depth)).toBeLessThan(0.8 * 1.1);
    expect(step.start).toBeLessThan(0); // sunk a hair into the body
    expect(step.reasoning).toMatch(/its own short side/);
  });

  it('an extent sets the depth for a boss exactly as it does for a cut', () => {
    const step = bossStep(boxTree(), feature, { extent: { id: 'stroke:6', length: 1.7 } });
    expect(Math.abs(step.depth)).toBeGreaterThan(1.7);
    expect(step.reasoning).toMatch(/the length of the extent stroke:6/);
  });

  it('a cut and a boss of the SAME feature differ only in sign and in which boolean', () => {
    const c = cutStep(boxTree(), feature, { span: 2.4 });
    const b = bossStep(boxTree(), feature);
    expect(c.profile).toEqual(b.profile);
    expect(c.plane).toEqual(b.plane);
    expect(Math.sign(c.depth)).toBe(-Math.sign(b.depth));
  });
});

describe('mirror and place', () => {
  it('a mirror names the plane it reflects across and the step it acts on', () => {
    const tree = boxTree();
    const step = mirrorStep(tree, height(), nextStepId(tree));
    expect(step.op).toBe('mirror');
    expect(step.on).toBe(tree.steps[0].id);
    expect(step.plane.name).toBe('height');
    expect(step.reasoning).toMatch(/and its reflection across the height plane/);
    expect(describeStep(step)).toMatch(/mirror · across the height/);
  });

  it('a dup is a place of a COPY of the tree, offset, and it carries every stroke of it', () => {
    const tree = boxTree();
    const step = placeStep(tree, v3(4.4, 0, 0), 'a copy standing beside it', nextStepId(tree));
    expect(step.op).toBe('place');
    expect(step.steps).toHaveLength(1);
    expect(step.steps[0]).not.toBe(tree.steps[0]); // a copy, not the same object
    expect(step.offset).toEqual({ x: 4.4, y: 0, z: 0 });
    expect(step.from).toEqual(['stroke:1', 'stroke:2']);
    expect(strokesOf(treeOf(step))).toEqual(['stroke:1', 'stroke:2']);
  });
});

describe('the nested tree round-trips through the text the log holds', () => {
  it('encode → parse gives back the same tree, nesting and all', () => {
    const tree = boxTree();
    const cut = cutStep(tree, feature, { span: 2.4 }, nextStepId(tree));
    const full = withStep(tree, cut);
    const back = parseOpTree(encodeOpTree(full));
    expect(back).toEqual(full);
    expect(back!.steps.map((s) => s.op)).toEqual(['extrude', 'cut']);
    expect(rootOf(back!)!.op).toBe('cut');
  });

  it('the marker line names every step, so the log is readable without parsing it', () => {
    const tree = boxTree();
    const full = withStep(tree, cutStep(tree, feature, { span: 2.4 }, nextStepId(tree)));
    expect(encodeOpTree(full).split('\n')[0]).toBe(`${OP_MARK} — extrude · cut`);
  });
});

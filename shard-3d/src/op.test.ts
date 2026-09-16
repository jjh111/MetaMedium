// The op tree (SHARD-3D-PLAN §2.4).
//
// A solid is a tree of steps, not a mesh: these tests pin the PARAMETERS the
// tree derives from the drawing — the direction an extrude grows, the depth
// and its sign, the axis a revolve turns about — because everything the
// renderer does afterwards is a function of exactly those numbers.

import { describe, it, expect } from 'vitest';
import { ENGINE_PARTICIPANT, type Point } from 'metamedium-core';
import {
  FULL_SWEEP,
  OP_KINDS,
  OP_LIMITS,
  OP_MARK,
  OP_PACKAGES,
  clipStep,
  describeStep,
  encodeOpTree,
  extrudeStep,
  isOpTree,
  latheProfile,
  massingStep,
  matchStep,
  parseOpTree,
  placeDefinitionStep,
  readOpTree,
  revolveStep,
  strokesOf,
  treeOf,
  validateOpTree,
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
  type OpStep,
  type OpTree,
  type PlaceStep,
  type Profile2D,
  type ProfileInput,
} from './op';
import { createLog } from './log';
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

  it('rejects an extrude missing its required depth', () => {
    const raw = '// mm:op tree v1\n' + JSON.stringify({ mm: 'op', version: 1, steps: [{ id: 's1', op: 'extrude', from: ['x'] }] });
    expect(parseOpTree(raw)).toBeNull();
  });
});

// ===== DATA-1: a tree from outside is validated, never cast =================
//
// The regression above is the whole of it in one line: that tree used to parse,
// and `describeStep` threw out of `depth.toFixed()` the moment the panel tried
// to say what it was. What follows walks every step type the same way — delete
// each field a step cannot be read without, and the tree must be refused WITH A
// REASON — plus the bounds, the references, and the round-trip.

/** A deep copy with one path deleted: `steps[0].profile.points`. */
function without(tree: OpTree, path: string): unknown {
  const copy = JSON.parse(JSON.stringify(tree)) as Record<string, unknown>;
  const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let at: Record<string, unknown> = copy;
  for (const k of keys.slice(0, -1)) at = at[k] as Record<string, unknown>;
  delete at[keys[keys.length - 1]];
  return copy;
}

/** …and one path set to a value, for the tests about what a field may HOLD. */
function withValue(tree: OpTree, path: string, value: unknown): unknown {
  const copy = JSON.parse(JSON.stringify(tree)) as Record<string, unknown>;
  const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let at: Record<string, unknown> = copy;
  for (const k of keys.slice(0, -1)) at = at[k] as Record<string, unknown>;
  at[keys[keys.length - 1]] = value;
  return copy;
}

const asTree = (...steps: OpStep[]): OpTree => ({ mm: 'op', version: 1, steps });

/** A disc and an axis beside it, for the revolve. */
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
const discAxis: LineInput = { id: 'a', plane: height(), points: [{ x: 4, y: -0.4 }, { x: 4, y: -3.6 }] };

/**
 * One valid tree per step type, built by the shard's OWN constructors — so the
 * "valid" side of every row below is a tree the shard really makes, not a
 * fixture written to suit the validator.
 */
const CASES: { op: string; tree: OpTree; required: string[]; optional: string[] }[] = (() => {
  const box = treeOf(extrudeStep(profile, up));
  const cut = cutStep(box, feature, { span: 2.4 }, 'step:2');
  const boss = bossStep(box, feature, {}, 'step:2');
  const mirror = mirrorStep(box, height(), 'step:2');
  const massing = massingStep([
    { id: 'stroke:1', plane: foundation(), clean: profile.clean },
    { id: 'stroke:3', plane: height(), clean: disc.clean },
  ]);
  const dup = placeStep(box, v3(4.4, 0, 0), 'a copy standing beside it', 'step:2');
  const placed = placeDefinitionStep({
    definition: 'mug',
    steps: box.steps,
    of: 'stroke:1',
    fromPlane: foundation(),
    to: { markId: 'stroke:9', plane: foundation() },
    id: 'step:1',
    why: 'the outline drawn here is the mug\'s own plan, 0.8× the size',
  });
  return [
    {
      op: 'extrude',
      tree: box,
      required: [
        'steps[0].id', 'steps[0].op', 'steps[0].from', 'steps[0].reasoning',
        'steps[0].profile', 'steps[0].profile.points', 'steps[0].profile.closed',
        'steps[0].profile.shape', 'steps[0].profile.reasoning',
        'steps[0].plane', 'steps[0].plane.normal', 'steps[0].plane.up', 'steps[0].plane.origin',
        'steps[0].depth',
      ],
      // No `on` (a leaf stands on nothing), no name, no material, no author.
      optional: ['steps[0].plane.name'],
    },
    {
      op: 'revolve',
      tree: treeOf(revolveStep(disc, discAxis)),
      required: [
        'steps[0].profile', 'steps[0].plane', 'steps[0].axis',
        'steps[0].axis.point', 'steps[0].axis.direction', 'steps[0].sweep',
      ],
      optional: ['steps[0].plane.name'],
    },
    {
      op: 'cut',
      tree: withStep(box, cut),
      // A cut's contract is its own: a feature, a face, a depth and where the
      // tool starts — never an extrude's, and never a revolve's sweep.
      required: ['steps[1].on', 'steps[1].profile', 'steps[1].plane', 'steps[1].depth', 'steps[1].start'],
      optional: ['steps[1].through'],
    },
    {
      op: 'boss',
      tree: withStep(box, boss),
      required: ['steps[1].on', 'steps[1].profile', 'steps[1].plane', 'steps[1].depth', 'steps[1].start'],
      optional: [],
    },
    {
      op: 'mirror',
      tree: withStep(box, mirror),
      required: ['steps[1].on', 'steps[1].plane'],
      optional: ['steps[1].plane.name'],
    },
    {
      op: 'match',
      tree: withStep(box, matchStep(box, { id: 'stroke:9', plane: foundation() }, 'add', 'the drawing has a lip the body lacks', 'step:2')),
      required: ['steps[1].on', 'steps[1].how', 'steps[1].plane'],
      optional: [],
    },
    {
      op: 'massing',
      tree: treeOf(massing),
      required: [
        'steps[0].profiles', 'steps[0].profiles[0].id',
        'steps[0].profiles[0].profile', 'steps[0].profiles[0].plane',
      ],
      // `bound` is the clip's, and a massing that is not a clip has none.
      optional: [],
    },
    {
      op: 'place (a dup)',
      tree: withStep(box, dup),
      required: ['steps[1].offset', 'steps[1].steps'],
      // A dup names no definition: its offset is the whole of its pose.
      optional: ['steps[1].definition', 'steps[1].of', 'steps[1].fromPlane', 'steps[1].toMark'],
    },
    {
      op: 'place (of a definition)',
      tree: treeOf(placed),
      required: ['steps[0].of', 'steps[0].fromPlane', 'steps[0].toPlane', 'steps[0].offset', 'steps[0].steps'],
      optional: [],
    },
  ];
})();

describe('DATA-1 · every step type says what it cannot be read without', () => {
  it('accepts the tree each case is built from', () => {
    for (const c of CASES) {
      const check = validateOpTree(c.tree);
      expect(check.ok ? null : `${c.op}: ${check.at} — ${check.reason}`).toBeNull();
    }
  });

  for (const c of CASES) {
    it(`${c.op}: deleting any required field is refused, and the reason says which`, () => {
      for (const path of c.required) {
        const check = validateOpTree(without(c.tree, path));
        expect(check.ok ? `${path} was accepted missing` : null).toBeNull();
        if (!check.ok) {
          // The fault names the field itself, not the artifact in general —
          // "steps[3].depth", which is what the panel can put in front of you.
          expect(check.at).toBe(path);
          // …and it says what was wrong in words, not as a code.
          expect(check.reason).toMatch(/^[a-z].{20,}/);
        }
      }
    });

    if (c.optional.length) {
      it(`${c.op}: its optional fields are optional, and that is the rule — not an oversight`, () => {
        for (const path of c.optional) {
          const check = validateOpTree(without(c.tree, path));
          expect(check.ok ? null : `${path}: ${check.reason}`).toBeNull();
        }
      });
    }
  }

  it('never confuses one op\'s contract with another\'s', () => {
    // A revolve has no depth and a cut has no sweep: neither absence is a fault,
    // and neither presence makes the other op readable.
    const revolve = treeOf(revolveStep(disc, discAxis));
    expect(validateOpTree(revolve).ok).toBe(true);
    const box = treeOf(extrudeStep(profile, up));
    const cut = withStep(box, cutStep(box, feature, { span: 2.4 }, 'step:2'));
    expect(validateOpTree(cut).ok).toBe(true);
    // An extrude carrying a sweep instead of a depth is still an extrude with
    // no depth — the sweep does not stand in for it.
    const swapped = withValue(without(box, 'steps[0].depth') as OpTree, 'steps[0].sweep', Math.PI);
    const check = validateOpTree(swapped);
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.at).toBe('steps[0].depth');
  });
});

describe('DATA-1 · numbers, references and ids', () => {
  const box = treeOf(extrudeStep(profile, up));

  it('refuses a depth that is not a finite number', () => {
    for (const v of [null, 'deep', NaN, Infinity, -Infinity, {}]) {
      const check = validateOpTree(withValue(box, 'steps[0].depth', v));
      expect(check.ok ? `${String(v)} was accepted as a depth` : check.at).toBe('steps[0].depth');
    }
  });

  it('refuses a stroke id that is not a string', () => {
    const check = validateOpTree(withValue(box, 'steps[0].from', [7]));
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.at).toBe('steps[0].from[0]');
  });

  it('refuses a massing profile whose id is not a string', () => {
    const massing = treeOf(massingStep([{ id: 'stroke:1', plane: foundation(), clean: profile.clean }]));
    const check = validateOpTree(withValue(massing, 'steps[0].profiles[0].id', { name: 'stroke:1' }));
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.at).toBe('steps[0].profiles[0].id');
  });

  it('refuses an `on` that names a step which is not there', () => {
    const cut = withStep(box, cutStep(box, feature, { span: 2.4 }, 'step:2'));
    const check = validateOpTree(withValue(cut, 'steps[1].on', 'step:99'));
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.reason).toMatch(/no step before it/);
  });

  it('refuses an `on` that names a LATER step — the tree is built by appending', () => {
    const cut = cutStep(box, feature, { span: 2.4 }, 'step:2');
    // The cut put first, so it acts on a step that has not stood yet.
    const check = validateOpTree(asTree(cut, box.steps[0]));
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.at).toBe('steps[0].on');
  });

  it('refuses a clip bound to a step which is not there', () => {
    const massing = treeOf(massingStep([{ id: 'stroke:1', plane: foundation(), clean: profile.clean }]));
    const clipped = withStep(massing, clipStep('step:1', 'step:1', 'step:2'));
    expect(validateOpTree(clipped).ok).toBe(true);
    const check = validateOpTree(withValue(clipped, 'steps[1].bound', 'step:404'));
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.at).toBe('steps[1].bound');
  });

  it('refuses two steps with the same id', () => {
    const twice = asTree(box.steps[0], { ...box.steps[0] });
    const check = validateOpTree(twice);
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.reason).toMatch(/both called step:1/);
  });

  it('lets a `place` reuse ids inside its own copy — a nested tree is its own namespace', () => {
    // A dup carries a COPY of the tree, whose step is called `step:1` while the
    // place standing beside it is `step:1` too. Two namespaces, not a clash.
    const dup = treeOf(placeStep(box, v3(4.4, 0, 0), 'a copy beside it', 'step:1'));
    expect((dup.steps[0] as PlaceStep).steps[0].id).toBe('step:1');
    expect(validateOpTree(dup).ok).toBe(true);
  });

  it('refuses an op outside the closed vocabulary', () => {
    const check = validateOpTree(withValue(box, 'steps[0].op', 'chamfer'));
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.reason).toMatch(/not one of the 13 steps/);
  });

  it('refuses a plane whose up runs along its normal — a frame with no u axis', () => {
    const check = validateOpTree(withValue(box, 'steps[0].plane.up', { x: 0, y: 1, z: 0 }));
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.reason).toMatch(/runs along its normal/);
  });

  it('refuses an outline with too few points to have an inside', () => {
    const check = validateOpTree(withValue(box, 'steps[0].profile.points', [{ x: 0, y: 0 }, { x: 1, y: 1 }]));
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.at).toBe('steps[0].profile.points');
  });
});

describe('DATA-1 · the version, and the bounds', () => {
  const box = treeOf(extrudeStep(profile, up));

  it('refuses a tree that is not marked as one, and a version it cannot read', () => {
    expect(validateOpTree({ mm: 'graph3d', version: 1, steps: [] }).ok).toBe(false);
    const future = validateOpTree({ mm: 'op', version: 2, steps: [] });
    expect(future.ok).toBe(false);
    if (!future.ok) {
      expect(future.at).toBe('version');
      expect(future.reason).toMatch(/version 2/);
    }
    expect(validateOpTree({ mm: 'op', steps: [] }).ok).toBe(false);
    expect(validateOpTree(null).ok).toBe(false);
    expect(validateOpTree([]).ok).toBe(false);
    expect(validateOpTree({ mm: 'op', version: 1 }).ok).toBe(false);
    expect(validateOpTree({ mm: 'op', version: 1, steps: {} }).ok).toBe(false);
    // The empty tree IS readable: a solid with no steps derives no body, which
    // is a thing to say about it, not a thing to refuse to read.
    expect(validateOpTree({ mm: 'op', version: 1, steps: [] }).ok).toBe(true);
  });

  it('refuses more steps than a tree may carry, without walking them all', () => {
    const steps = Array.from({ length: OP_LIMITS.steps + 1 }, (_, i) => ({ ...box.steps[0], id: `step:${i + 1}` }));
    const t0 = Date.now();
    const check = validateOpTree({ mm: 'op', version: 1, steps });
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.reason).toMatch(/past the 512/);
    expect(Date.now() - t0).toBeLessThan(1000);
  });

  it('refuses a placement nested past the bound, and does not hang doing it', () => {
    // A copy of a copy of a copy of a copy … a thousand deep.
    let nested: unknown = { mm: 'op', version: 1, steps: [box.steps[0]] };
    for (let i = 0; i < 1000; i++) {
      nested = {
        mm: 'op',
        version: 1,
        steps: [{
          id: 'step:1', op: 'place', from: [], reasoning: 'a copy of a copy',
          offset: { x: 0, y: 0, z: 0 }, steps: (nested as OpTree).steps,
        }],
      };
    }
    const t0 = Date.now();
    const check = validateOpTree(nested);
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.reason).toMatch(/nested more than 8 deep/);
    expect(Date.now() - t0).toBeLessThan(1000);
  });

  it('refuses an outline of a million points', () => {
    const points = Array.from({ length: OP_LIMITS.profilePoints + 1 }, (_, i) => ({ x: i, y: i }));
    const check = validateOpTree(withValue(box, 'steps[0].profile.points', points));
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.reason).toMatch(/past the 4096/);
  });
});

describe('DATA-1 · what the callers get', () => {
  const badExtrude ='// mm:op tree v1\n' + JSON.stringify({ mm: 'op', version: 1, steps: [{ id: 's1', op: 'extrude', from: ['x'] }] });

  it('keeps parseOpTree\'s null contract, and the sibling carries the reason', () => {
    expect(parseOpTree(badExtrude)).toBeNull();
    const read = readOpTree(badExtrude);
    expect(read.ok).toBe(false);
    if (!read.ok) {
      expect(read.mine).toBe(true); // it is ours, and it is broken — worth saying
      expect(read.at).toBe('steps[0].reasoning');
      expect(read.reason).toMatch(/reasoning is missing/);
    }
  });

  it('tells a tree of another kind apart from one of ours that will not read', () => {
    const other = readOpTree('// mm:structure graph3d\nvar ATOMS = [];');
    expect(other.ok).toBe(false);
    if (!other.ok) expect(other.mine).toBe(false); // somebody else's artifact — skip it, say nothing

    const ours = readOpTree(OP_MARK + '\nnot json at all');
    expect(ours.ok).toBe(false);
    if (!ours.ok) {
      expect(ours.mine).toBe(true);
      expect(ours.reason).toMatch(/is not JSON/);
    }
  });

  it('every accepted tree is safe to describe — which is what the defect was', () => {
    // `describeStep` threw out of `depth.toFixed()` on the tree above. Nothing
    // that gets past the validator can do that again.
    const trees = CASES.map((c) => c.tree);
    for (const tree of trees) {
      for (const step of tree.steps) expect(typeof describeStep(step)).toBe('string');
    }
    // …and the unbuilt rows describe themselves too.
    for (const op of OP_KINDS) {
      const step = { id: 'step:1', op, from: [], reasoning: 'declared, unbuilt' } as unknown as OpStep;
      const tree = asTree(step);
      const check = validateOpTree(tree);
      if (check.ok) expect(typeof describeStep(step)).toBe('string');
    }
  });

  it('a valid tree round-trips with its semantics exactly: parse → serialise → parse', () => {
    for (const c of CASES) {
      const once = parseOpTree(encodeOpTree(c.tree));
      expect(once).toEqual(c.tree);
      const twice = parseOpTree(encodeOpTree(once!));
      expect(twice).toEqual(c.tree);
      // Not merely equal by value — the same answer to the questions the tree
      // is asked: which step is the result, how deep each one sits, whose ink.
      expect(rootOf(twice!)!.id).toBe(rootOf(c.tree)!.id);
      expect([...depthsOf(twice!)]).toEqual([...depthsOf(c.tree)]);
      expect(strokesOf(twice!)).toEqual(strokesOf(c.tree));
    }
  });
});

describe('DATA-1 · a bad artifact is isolated, not fatal', () => {
  /** A board with a real box on it, and one artifact whose code will not read. */
  function boardWithABadArtifact(code: string) {
    const log = createLog();
    const profileId = log.add(
      (() => {
        const c = [{ x: -7, y: -2 }, { x: -3, y: -2 }, { x: -3, y: 0.6 }, { x: -7, y: 0.6 }, { x: -7, y: -2 }];
        const out: Point[] = [];
        for (let i = 0; i < c.length - 1; i++)
          for (let s = 0; s < 20; s++) {
            const t = s / 20;
            out.push({ x: c[i].x + (c[i + 1].x - c[i].x) * t, y: c[i].y + (c[i + 1].y - c[i].y) * t });
          }
        out.push(c[0]);
        return out;
      })(),
      foundation(),
      0.012,
      1000
    );
    const extentId = log.add(
      Array.from({ length: 25 }, (_, i) => ({ x: -7, y: -2.4 * (i / 24) })),
      height(),
      0.012,
      2000
    );
    const good = log.make(log.makeable()[0], 3000);

    // …and the bad one, written the way a folder, a merged log or another
    // hand's machine would write it: a code rep on a blessed artifact.
    const loose = log.add(
      Array.from({ length: 25 }, (_, i) => {
        const t = (i / 24) * Math.PI * 2;
        return { x: 4 + Math.cos(t), y: Math.sin(t) };
      }),
      foundation(),
      0.012,
      4000
    );
    const summonId = log.session.summonMarks([loose], 5000);
    const badId = log.session.bless({ summonId: summonId!, name: 'thing', at: 5000, participantId: ENGINE_PARTICIPANT });
    log.session.attachCode({
      participantId: ENGINE_PARTICIPANT,
      nodeId: badId!,
      code,
      kind: 'json',
      language: 'json',
      prompt: 'a tree from somewhere else',
      at: 5000,
    });
    return { log, goodId: good!.id, badId: badId!, profileId, extentId, loose };
  }

  const malformed = '// mm:op tree v1\n' + JSON.stringify({
    mm: 'op',
    version: 1,
    steps: [{ id: 's1', op: 'extrude', from: ['x'], reasoning: 'a box' }],
  });

  it('the bad artifact stands, says why, and the good one still derives', () => {
    const { log, goodId, badId } = boardWithABadArtifact(malformed);
    const solids = log.solids();
    expect(solids).toHaveLength(2);

    const bad = log.solidOf(badId)!;
    // The FIRST thing wrong with it, where it is: this extrude has no profile,
    // no plane and no depth, and the panel says the first rather than a list.
    expect(bad.broken).toMatch(/profile is missing/);
    expect(bad.broken).toMatch(/steps\[0\]\.profile/);
    expect(bad.tree.steps).toEqual([]);

    // The rest of the board is untouched: the box still carries its extrude.
    const good = log.solidOf(goodId)!;
    expect(good.broken).toBeUndefined();
    expect(good.tree.steps).toHaveLength(1);
    expect(good.tree.steps[0].op).toBe('extrude');
    expect(describeStep(good.tree.steps[0])).toMatch(/^extrude · depth/);
  });

  it('its raw code is still in the log, exactly as it arrived — nothing was repaired', () => {
    const { log, badId } = boardWithABadArtifact(malformed);
    const node = log.session.getState().nodes.get(badId)!;
    const code = [...node.reps].reverse().find((r) => r.modality === 'code')!.data as { code: string };
    expect(code.code).toBe(malformed);
  });

  it('its ink is still on the board, and every mark still selects', () => {
    const { log, profileId, loose } = boardWithABadArtifact(malformed);
    expect(log.markOf(profileId)).not.toBeNull();
    expect(log.markOf(loose)).not.toBeNull();
    // The marks the good solid was made from are still readable as forms.
    expect(log.forms().find((f) => f.id === profileId)?.role).toBe('profile');
  });

  it('an extrude whose ONLY missing field is the depth is named exactly', () => {
    // The review's own case, with everything else in place: the fault is the
    // depth, and the panel can say so rather than "something is wrong".
    const almost = encodeOpTree(treeOf(extrudeStep(profile, up)));
    const stripped = almost.split('\n').filter((l) => !/"depth"/.test(l)).join('\n').replace(/,(\s*})/, '$1');
    const { log, badId } = boardWithABadArtifact(stripped);
    const bad = log.solidOf(badId)!;
    expect(bad.broken).toMatch(/the extrude's depth is missing/);
    expect(bad.broken).toMatch(/steps\[0\]\.depth/);
    // …and the artifact is still THERE, with its name and its ink.
    expect(bad.name).toBe('thing');
    expect(bad.memberIds.length).toBeGreaterThan(0);
  });

  it('an artifact of some OTHER kind is skipped in silence, not called broken', () => {
    const { log, badId } = boardWithABadArtifact('// mm:structure graph3d\nvar ATOMS = [];');
    expect(log.solidOf(badId)).toBeNull();
    expect(log.solids()).toHaveLength(1);
  });
});

// `describeSpace` — the brief (SHARD-3D-PLAN §6).
//
// What is pinned here is the REGION-ID RULE: every name is said in the step's
// own id, and every mark in its own stroke id, because that is what makes a
// reply attachable to the thing it is about. And the HERE paragraph, because a
// model with no ground writes meshes and files.

import { describe, it, expect } from 'vitest';
import { describeSpace, honoursSentence, HERE_IN_SPACE, type SpaceScene } from './brief';
import { massingStep } from './op';
import { foundation, height } from './plane';

const rect = (x: number, y: number, w: number, h: number) => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
  { x, y },
];

const PLAN = rect(-2, -1.5, 4, 3);
const FRONT = rect(-2, -3, 4, 3);

function board(extra: Partial<SpaceScene> = {}): SpaceScene {
  const step = massingStep(
    [
      { id: 'stroke:1', plane: foundation(), clean: { shape: 'rectangle', points: PLAN, closed: true, reasoning: 'clean' } },
      { id: 'stroke:2', plane: height(), clean: { shape: 'rectangle', points: FRONT, closed: true, reasoning: 'clean' } },
    ],
    'step:1'
  );
  return {
    solids: [
      {
        id: 'artifact:5',
        name: 'massing',
        named: 'engine',
        tree: { mm: 'op', version: 1, steps: [step] },
      },
    ],
    planes: [
      {
        name: 'foundation',
        view: 'top',
        normal: { x: 0, y: 1, z: 0 },
        marks: [{ id: 'stroke:1', shape: 'rectangle', confidence: 0.91, plays: 'profile', rule: 2, points: PLAN, taken: 'artifact:5' }],
      },
      {
        name: 'height',
        view: 'front',
        normal: { x: 0, y: 0, z: 1 },
        marks: [{ id: 'stroke:2', shape: 'rectangle', confidence: 0.88, plays: 'profile', rule: 2, points: FRONT, taken: 'artifact:5' }],
      },
    ],
    words: 'a castle with green turret tops',
    ...extra,
  };
}

describe('describeSpace', () => {
  it('leads with what STANDS, and says the massing is the extent to stay inside', () => {
    const text = describeSpace(board());
    expect(text).toMatch(/WHAT STANDS — 1 solid/);
    expect(text).toMatch(/artifact:5 “massing”/);
    expect(text).toMatch(/a MASSING: it is already standing/);
    expect(text).toMatch(/the extent your proposal must stay inside/);
    expect(text).toMatch(/step:1 — massing · 2 profiles intersected · from stroke:1 \+ stroke:2/);
  });

  it('names every plane, the view a hand calls it, and every mark on it BY ITS OWN ID', () => {
    const text = describeSpace(board());
    expect(text).toMatch(/foundation — the top view/);
    expect(text).toMatch(/height — the front view/);
    expect(text).toMatch(/stroke:1 — rectangle 0\.91, plays profile \(row 2\)/);
    // The sizes are in the plane's own units, so a depth in a reply is in them too.
    expect(text).toMatch(/4\.00 × 3\.00 u/);
    expect(text).toMatch(/taken into artifact:5/);
  });

  it('says there are no names when there are none, and asks for them from the words', () => {
    const text = describeSpace(board());
    expect(text).toMatch(/NAMES IN PLAY: none/);
    expect(text).toMatch(/THE WORDS THE HUMAN TYPED: “a castle with green turret tops”/);
  });

  it('lists every name in play IN ITS STEP’S OWN ID, with its material and what it is based on', () => {
    const text = describeSpace(
      board({
        names: [
          { name: 'castle', solidId: 'artifact:5', stepId: 'step:2', op: 'extrude' },
          { name: 'turret', solidId: 'artifact:5', stepId: 'step:3', op: 'boss', basedOn: 'castle', definition: true },
          { name: 'top', solidId: 'artifact:5', stepId: 'step:4', op: 'boss', colour: 'green', basedOn: 'castle', definition: true },
        ],
      })
    );
    // *things*, not *steps*, since G3: a name may be on a part of a hull.
    expect(text).toMatch(/NAMES IN PLAY — use these exact words for these exact things/);
    expect(text).toMatch(/“castle” = artifact:5\/step:2 \(extrude\)/);
    expect(text).toMatch(/“turret” = artifact:5\/step:3 \(boss\), based on castle — held as a definition/);
    expect(text).toMatch(/“top” = artifact:5\/step:4 \(boss\), material green/);
    expect(text).toMatch(/do not invent a synonym/);
  });

  it('offers the library so a model may answer {"reuse": …} rather than write', () => {
    const text = describeSpace(
      board({ definitions: [{ name: 'turret', basedOn: 'castle', ops: ['boss', 'boss'], steps: 2, profiles: 1 }] })
    );
    expect(text).toMatch(/DEFINITIONS THE LIBRARY HOLDS/);
    // P6: the name, what it is part of, how many steps it holds and how many
    // outlines it would be recognised by — enough to say *that already exists*.
    expect(text).toMatch(/“turret” \(a part of castle\) — 2 steps, recognised by 1 profile: boss · boss/);
    expect(text).toMatch(/reply \{"reuse":"<name>"\} and write nothing/);
  });

  it('says when a definition is the WHOLE of a thing rather than a part of it', () => {
    const text = describeSpace(
      board({ definitions: [{ name: 'castle', basedOn: 'castle', ops: ['massing', 'boss'], steps: 2, profiles: 3, whole: true }] })
    );
    expect(text).toMatch(/“castle” \(the whole of it\) — 2 steps, recognised by 3 profiles/);
  });

  it('a regen says which steps may change, and that every other one is fixed', () => {
    const text = describeSpace(board({ mutable: [{ stepId: 'step:3', name: 'turret' }] }));
    expect(text).toMatch(/ONLY THESE STEPS MAY CHANGE/);
    expect(text).toMatch(/step:3 \(“turret”\)/);
    expect(text).toMatch(/a reply that touches one is refused/);
  });

  it('carries the diff when the board is reporting one', () => {
    const text = describeSpace(board({ diffs: [{ markId: 'stroke:9', view: 'side', sentence: 'side · matches 84% · missing 1 region' }] }));
    expect(text).toMatch(/WHERE THE BODY AND THE DRAWING DISAGREE/);
    expect(text).toMatch(/stroke:9 — side · matches 84%/);
  });

  it('ends with what can be made here, and what cannot', () => {
    const text = describeSpace(board());
    expect(text.endsWith(HERE_IN_SPACE)).toBe(true);
    // The closed vocabularies, said.
    expect(HERE_IN_SPACE).toMatch(/foundation \(the ground, you see it from the top\)/);
    expect(HERE_IN_SPACE).toMatch(/extrude, revolve, cut, boss, mirror/);
    expect(HERE_IN_SPACE).toMatch(/rectangle, a circle or a polygon/);
    // …and the refusals, which is the half a small model most needs.
    expect(HERE_IN_SPACE).toMatch(/no meshes, no vertices, no triangles, no code, no files/);
    expect(HERE_IN_SPACE).toMatch(/You do not write \*\*|You do not write/);
  });

  it('says so when nothing has been drawn', () => {
    const text = describeSpace({ solids: [], planes: [] });
    expect(text).toMatch(/WHAT STANDS: nothing yet/);
    expect(text).toMatch(/nothing has been drawn/);
    expect(text).toMatch(/THE HUMAN TYPED NOTHING/);
  });
});

describe('the honours-the-drawing sentence', () => {
  it('is the mean, and then every view with its own number', () => {
    expect(honoursSentence([
      { view: 'front', coverage: 0.96 },
      { view: 'top', coverage: 0.95 },
      { view: 'side', coverage: 0.88 },
    ])).toBe('honours the drawing 93% · front 96 · top 95 · side 88');
  });

  it('says what is missing rather than a number nobody measured', () => {
    expect(honoursSentence([])).toMatch(/no profile of it has been drawn to check against/);
  });
});

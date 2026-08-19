// The MVP flow at the engine level (MVP.md §2): teach a mark, lasso, command,
// prompt, code. Plus scratch-out erase, which is how you take it back.

import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import { learnCommandMark } from './commandmark';
import { getRep, isGesture } from './nodes';
import { rectStroke, circleStroke, checkStroke, caretStroke, scratchStroke, lineStroke } from '../test/strokes';
import { getFingerprint } from '../geometry';

const CARETS = [
  caretStroke(0, 0, 60, 40),
  caretStroke(10, 5, 66, 44),
  caretStroke(0, 0, 54, 38),
  caretStroke(20, 20, 62, 46),
  caretStroke(5, 5, 58, 36),
];

describe('teaching a command mark', () => {
  it('starts untaught, and the built-in check still summons', () => {
    const s = createSession();
    expect(s.getState().commandMark).toBeNull();
    s.addStroke(rectStroke(100, 100, 100, 80), 1000);
    s.addStroke(circleStroke(150, 140, 140), 2000);
    s.addStroke(checkStroke(300, 140), 2500);
    expect(s.getState().summon).not.toBeNull();
  });

  it('once taught, the taught mark summons and the old check does not', () => {
    const s = createSession();
    s.teachCommandMark(learnCommandMark(CARETS, 'caret'), 500);
    expect(s.getState().commandMark?.name).toBe('caret');

    s.addStroke(rectStroke(100, 100, 100, 80), 1000);
    s.addStroke(circleStroke(150, 140, 140), 2000);
    // A check no longer resolves it — the grammar is the user's now.
    s.addStroke(checkStroke(320, 140), 2500);
    expect(s.getState().summon).toBeNull();
  });

  // Two sessions, because a non-resolving stroke settles the lasso as content —
  // that is deferred commitment working, not an artefact of the test.
  function lassoed() {
    const s = createSession();
    s.teachCommandMark(learnCommandMark(CARETS, 'caret'), 500);
    s.addStroke(rectStroke(100, 100, 100, 80), 1000);
    s.addStroke(circleStroke(150, 140, 140), 2000); // lasso spans x 10..290
    return s;
  }

  it('a taught mark ACROSS the lasso summons — crossing is the deliberate act', () => {
    const s = lassoed();
    s.addStroke(caretStroke(250, 120, 80, 50), 3000);
    expect(s.getState().summon).not.toBeNull();
  });

  it('a taught mark just OUTSIDE the lasso still summons — engaging it is enough', () => {
    // One rule for every mark: cross the selection, overlap it, or come close
    // relative to its size. A tick at the edge of a circled group is the same
    // intent as one drawn through it, and the grammar should not make the user
    // guess which of the two the canvas wanted.
    const s = lassoed();
    s.addStroke(caretStroke(300, 120, 60, 40), 2500);
    expect(s.getState().summon).not.toBeNull();
  });

  it('a taught mark drawn FAR from the lasso does not summon', () => {
    const s = lassoed();
    s.addStroke(caretStroke(900, 900, 60, 40), 2500);
    expect(s.getState().summon).toBeNull();
  });

  it('proximity scales with the selection, not with pixels', () => {
    // The same gap that engages a small group must NOT engage a huge one drawn
    // ten times larger — otherwise "near" means something different at every
    // zoom level and on every size of drawing.
    const near = createSession();
    near.teachCommandMark(learnCommandMark(CARETS, 'caret'), 500);
    near.addStroke(rectStroke(100, 100, 100, 80), 1000);
    near.addStroke(circleStroke(150, 140, 140), 2000); // size 280, so 15% = 42px
    near.addStroke(caretStroke(300, 120, 60, 40), 2500); // ~10px away
    expect(near.getState().summon).not.toBeNull();

    const far = createSession();
    far.teachCommandMark(learnCommandMark(CARETS, 'caret'), 500);
    far.addStroke(rectStroke(100, 100, 20, 16), 1000);
    far.addStroke(circleStroke(110, 108, 28), 2000); // size 56, so 15% = 8.4px
    far.addStroke(caretStroke(160, 96, 12, 8), 2500); // ~22px away — too far now
    expect(far.getState().summon).toBeNull();
  });

  it('records who resolved the lasso — the mark, by name', () => {
    const s = createSession();
    s.teachCommandMark(learnCommandMark(CARETS, 'caret'), 500);
    s.addStroke(rectStroke(100, 100, 100, 80), 1000);
    s.addStroke(circleStroke(150, 140, 140), 2000);
    const cmdId = s.addStroke(caretStroke(250, 120, 80, 50), 3000);
    const rep = getRep(s.getState().nodes.get(cmdId)!, 'gesture')!;
    expect((rep.data as { role: string }).role).toBe('command');
    expect(rep.source).toBe('command-mark:caret');
  });

  it('teaching replays — it is session history, not a setting', () => {
    const s = createSession();
    s.addStroke(rectStroke(0, 0, 50, 50), 900);
    s.teachCommandMark(learnCommandMark(CARETS, 'caret'), 1000);
    s.addStroke(rectStroke(100, 100, 50, 50), 1100);
    s.undo(); // drops the last stroke, replays everything before it
    expect(s.getState().commandMark?.name).toBe('caret');
  });

  it('can be un-taught, returning to the built-in check', () => {
    const s = createSession();
    s.teachCommandMark(learnCommandMark(CARETS, 'caret'), 500);
    s.teachCommandMark(null, 600);
    expect(s.getState().commandMark).toBeNull();
    s.addStroke(rectStroke(100, 100, 100, 80), 1000);
    s.addStroke(circleStroke(150, 140, 140), 2000);
    s.addStroke(checkStroke(300, 140), 2500);
    expect(s.getState().summon).not.toBeNull();
  });
});

describe('the summon offers a freeform prompt', () => {
  it('every summon carries a prompt suggestion', () => {
    const s = createSession();
    s.addStroke(rectStroke(100, 100, 100, 80), 1000);
    s.addStroke(circleStroke(150, 140, 140), 2000);
    s.addStroke(checkStroke(300, 140), 2500);
    const kinds = s.getState().summon!.suggestions.map((x) => x.kind);
    expect(kinds).toContain('prompt');
    expect(kinds).toContain('name-as-new');
    expect(kinds).toContain('keep-as-drawing');
  });
});

describe('code makes an artifact live', () => {
  function artifact() {
    const s = createSession();
    s.addStroke(rectStroke(100, 100, 200, 120), 1000);
    s.addStroke(rectStroke(340, 100, 200, 120), 1100);
    s.addStroke(circleStroke(320, 160, 300), 2000);
    s.addStroke(checkStroke(650, 160), 2500);
    const id = s.bless({ summonId: s.getState().summon!.id, name: 'landing page', at: 3000 })!;
    return { s, id };
  }

  it('attaching code adds the artifact to the live plane', () => {
    const { s, id } = artifact();
    const pid = s.join('agent', 'llm:test', 3100, 2);
    expect(s.getState().live).toEqual([]);
    s.attachCode({ participantId: pid, nodeId: id, code: '<h1>hi</h1>', prompt: 'a page', at: 3200 });
    expect(s.getState().live).toEqual([id]);
  });

  it('the code rep carries the region frame it was generated against', () => {
    const { s, id } = artifact();
    const pid = s.join('agent', 'llm:test', 3100, 2);
    s.attachCode({ participantId: pid, nodeId: id, code: '<h1>hi</h1>', at: 3200 });
    const rep = getRep(s.getState().nodes.get(id)!, 'code')!;
    expect((rep.data as { regions: unknown[] }).regions).toHaveLength(2);
    expect(rep.source).toBe(pid);
  });

  it('is a proposal, not a commitment — several participants may each attach code', () => {
    const { s, id } = artifact();
    const a = s.join('agent', 'llm:one', 3100, 1);
    const b = s.join('agent', 'llm:two', 3100, 2);
    s.attachCode({ participantId: a, nodeId: id, code: '<p>A</p>', at: 3200 });
    s.attachCode({ participantId: b, nodeId: id, code: '<p>B</p>', at: 3300 });
    const codes = s.getState().nodes.get(id)!.reps.filter((r) => r.modality === 'code');
    expect(codes).toHaveLength(2);
    expect(s.getState().live).toEqual([id]); // listed once, however many readings
    // Attribution is mandatory: each attempt says who made it.
    expect(codes.map((r) => r.source).sort()).toEqual([a, b].sort());
  });

  it('ignores code from a participant that never joined', () => {
    const { s, id } = artifact();
    expect(s.attachCode({ participantId: 'ghost', nodeId: id, code: 'x', at: 3200 })).toBeNull();
    expect(s.getState().live).toEqual([]);
  });

  it('a broken artifact leaves the live plane — its contract with the ink is void', () => {
    const { s, id } = artifact();
    const pid = s.join('agent', 'llm:test', 3100, 2);
    s.attachCode({ participantId: pid, nodeId: id, code: '<h1>hi</h1>', at: 3200 });
    const member = s.getState().nodes.get(id)!.edges.find((e) => e.rel === 'has-part')!.to;
    s.erase(member, 3400);
    expect(s.getState().artifacts).not.toContain(id);
    expect(s.getState().live).toEqual([]);
    // The code is still on the node, so undo brings the whole thing back.
    s.undo();
    expect(s.getState().live).toEqual([id]);
  });

  it('erasing a live artifact takes it off the live plane', () => {
    const { s, id } = artifact();
    const pid = s.join('agent', 'llm:test', 3100, 2);
    s.attachCode({ participantId: pid, nodeId: id, code: '<h1>hi</h1>', at: 3200 });
    s.erase(id, 3400);
    expect(s.getState().live).toEqual([]);
  });
});

describe('scratch-out erase, through the session', () => {
  it('scratching a mark rubs it out and does not become content', () => {
    const s = createSession();
    const boxId = s.addStroke(rectStroke(100, 100, 200, 150), 1000);
    expect(s.getState().contentIds).toContain(boxId);

    const scratchId = s.addStroke(scratchStroke(80, 130, 240, 90, 3), 2000);
    expect(s.getState().contentIds).not.toContain(boxId);
    expect(s.getState().contentIds).not.toContain(scratchId);
    expect(isGesture(s.getState().nodes.get(scratchId)!)).toBe(true);
  });

  it('ink is never destroyed — the erased node stays in the graph, marked', () => {
    const s = createSession();
    const boxId = s.addStroke(rectStroke(100, 100, 200, 150), 1000);
    s.addStroke(scratchStroke(80, 130, 240, 90, 3), 2000);
    const node = s.getState().nodes.get(boxId)!;
    expect(node).toBeDefined();
    expect(getRep(node, 'erased')).toBeDefined();
  });

  it('a line drawn THROUGH a shape is ordinary ink, not an erase', () => {
    const s = createSession();
    const boxId = s.addStroke(rectStroke(100, 100, 200, 150), 1000);
    const lineId = s.addStroke(lineStroke({ x: 50, y: 175 }, { x: 350, y: 175 }), 2000);
    expect(s.getState().contentIds).toContain(boxId);
    expect(s.getState().contentIds).toContain(lineId);
  });

  it('scratching undoes — the mark comes back', () => {
    const s = createSession();
    const boxId = s.addStroke(rectStroke(100, 100, 200, 150), 1000);
    s.addStroke(scratchStroke(80, 130, 240, 90, 3), 2000);
    expect(s.getState().contentIds).not.toContain(boxId);
    s.undo();
    expect(s.getState().contentIds).toContain(boxId);
  });

  it('scratching a member degrades its artifact, as any erase does', () => {
    const s = createSession();
    s.addStroke(rectStroke(100, 100, 100, 80), 1000);
    s.addStroke(rectStroke(240, 100, 100, 80), 1100);
    s.addStroke(circleStroke(220, 140, 200), 2000);
    s.addStroke(checkStroke(440, 140), 2500);
    const id = s.bless({ summonId: s.getState().summon!.id, name: 'pair', at: 3000 })!;
    expect(s.getState().artifacts).toContain(id);

    s.addStroke(scratchStroke(80, 120, 140, 50, 3), 4000);
    expect(s.getState().artifacts).not.toContain(id);
    expect(getRep(s.getState().nodes.get(id)!, 'status')?.data).toBe('broken');
  });

  it('does not fire on the command mark that resolves a lasso', () => {
    const s = createSession();
    s.teachCommandMark(learnCommandMark(CARETS, 'caret'), 500);
    s.addStroke(rectStroke(100, 100, 100, 80), 1000);
    s.addStroke(circleStroke(150, 140, 140), 2000);
    s.addStroke(caretStroke(250, 120, 80, 50), 3000);
    expect(s.getState().summon).not.toBeNull();
  });
});

describe('ink over a live artifact addresses what is under it', () => {
  function livePage() {
    const s = createSession();
    s.addStroke(rectStroke(100, 100, 200, 120), 1000);
    s.addStroke(rectStroke(340, 100, 200, 120), 1100);
    s.addStroke(circleStroke(320, 160, 300), 2000);
    s.addStroke(checkStroke(650, 160), 2500);
    const id = s.bless({ summonId: s.getState().summon!.id, name: 'page', at: 3000 })!;
    const pid = s.join('agent', 'llm:test', 3100, 2);
    s.attachCode({ participantId: pid, nodeId: id, code: '<div></div>', at: 3200 });
    return { s, id };
  }

  it('a closed loop over a mark is a lasso, never a scratch — closure decides', () => {
    const s = createSession();
    const boxId = s.addStroke(rectStroke(100, 100, 200, 120), 1000);
    // Exactly tangent to the box's top and bottom edges: six crossings, and
    // still a selection rather than an erase.
    const lasso = s.addStroke(circleStroke(200, 160, 60), 2000);
    expect(s.getState().contentIds).toContain(boxId);
    expect(s.getState().contentIds).toContain(lasso);
  });

  it('a circle drawn ON a live artifact is lasso-like even enclosing no mark', () => {
    const { s } = livePage();
    // Small circle inside the left box: encloses nothing, but it is on the page.
    const lasso = s.addStroke(circleStroke(200, 160, 45), 4000);
    expect(s.getState().pendingLassoId).toBe(lasso);
  });

  it('the summon reports which artifact and which regions the ink covers', () => {
    const { s, id } = livePage();
    const regions = s.regions(id);
    s.addStroke(circleStroke(200, 160, 60), 4000); // sized so a check can resolve it
    s.addStroke(checkStroke(258, 150), 4200);

    const summon = s.getState().summon!;
    expect(summon.onArtifact).toBeDefined();
    expect(summon.onArtifact!.artifactId).toBe(id);
    // The left box, not the right one.
    const left = regions.find((r) => r.world.x < 200)!;
    expect(summon.onArtifact!.regionIds).toEqual([left.id]);
  });

  it('a lasso away from the artifact carries no artifact context', () => {
    const { s } = livePage();
    s.addStroke(rectStroke(1200, 1200, 60, 60), 3900);
    s.addStroke(circleStroke(1230, 1230, 90), 4000);
    s.addStroke(checkStroke(1340, 1230), 4200);
    expect(s.getState().summon!.onArtifact).toBeUndefined();
  });

  it('does not fire before the artifact is live — code is what makes it addressable', () => {
    const s = createSession();
    s.addStroke(rectStroke(100, 100, 200, 120), 1000);
    s.addStroke(rectStroke(340, 100, 200, 120), 1100);
    s.addStroke(circleStroke(320, 160, 300), 2000);
    s.addStroke(checkStroke(650, 160), 2500);
    s.bless({ summonId: s.getState().summon!.id, name: 'page', at: 3000 });
    // No code attached: a small circle inside encloses nothing and stays ink.
    const lasso = s.addStroke(circleStroke(200, 160, 45), 4000);
    expect(s.getState().pendingLassoId).not.toBe(lasso);
  });
});

// The cost of world coordinates, and the fix (geometry.ts getFingerprint).
describe('the same hand gesture reads the same at any zoom', () => {
  // A near-closed loop as the hand draws it: 200 screen px across with a
  // 45 screen px gap. Whether that counts as closed is decided by the ABSOLUTE
  // threshold (the relative one rejects it at 22.5%), which is exactly the rule
  // that lives in pixels — so it is the rule that breaks without a scale.
  const handLoop = (zoom: number) => {
    const k = 1 / zoom;
    const r = 100 * k;
    const gap = 45 * k;
    const sweep = Math.PI * 2 - gap / r;
    const points = [];
    for (let i = 0; i <= 120; i++) {
      const a = (i / 120) * sweep;
      points.push({ x: 400 + r * Math.cos(a), y: 400 + r * Math.sin(a) });
    }
    return points;
  };

  it.each([0.25, 0.5, 1, 2, 3])('reads the same at zoom %s when the scale is passed', (zoom) => {
    expect(getFingerprint(handLoop(zoom), 1 / zoom).isClosed).toBe(true);
  });

  it('flips on zoom when the scale is NOT passed — the bug this parameter fixes', () => {
    expect(getFingerprint(handLoop(1)).isClosed).toBe(true);
    expect(getFingerprint(handLoop(0.25)).isClosed).toBe(false); // same hand, different answer
    expect(getFingerprint(handLoop(0.25), 4).isClosed).toBe(true); // scale restores it
  });

  it('a small open mark is never mistaken for a loop, at any zoom', () => {
    // A caret is ~60px across with its ends ~60px apart: plainly open, and yet
    // an unbounded `gap < 50px` rule called it closed once it shrank a little.
    for (const zoom of [0.4, 1, 2]) {
      const k = 1 / zoom;
      const pts = [
        ...lineStroke({ x: 0, y: 40 * k }, { x: 30 * k, y: 0 }, 30),
        ...lineStroke({ x: 30 * k, y: 0 }, { x: 60 * k, y: 40 * k }, 30).slice(1),
      ];
      expect(getFingerprint(pts, k).isClosed).toBe(false);
    }
  });

  it('the scale is logged with the stroke, so undo replays identically', () => {
    const s = createSession();
    const id = s.addStroke(circleStroke(200, 200, 40), 1000, undefined, 0.5);
    const rep = s.getState().nodes.get(id)!.reps.find((r) => r.modality === 'stroke')!;
    expect((rep.data as { scale: number }).scale).toBe(0.5);
    s.addStroke(rectStroke(0, 0, 20, 20), 1100, undefined, 0.5);
    s.undo();
    const after = s.getState().nodes.get(id)!.reps.find((r) => r.modality === 'stroke')!;
    expect((after.data as { scale: number }).scale).toBe(0.5);
  });
});


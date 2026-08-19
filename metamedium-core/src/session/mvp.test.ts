// The MVP flow at the engine level (MVP.md §2): teach a mark, lasso, command,
// prompt, code. Plus scratch-out erase, which is how you take it back.

import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import { learnCommandMark } from './commandmark';
import { getRep, isGesture } from './nodes';
import { rectStroke, circleStroke, checkStroke, caretStroke, scratchStroke, lineStroke } from '../test/strokes';

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

  it('a taught mark BESIDE the lasso does not summon', () => {
    const s = lassoed();
    // Close enough for the old proximity rule, but it crosses nothing.
    s.addStroke(caretStroke(300, 120, 60, 40), 2500);
    expect(s.getState().summon).toBeNull();
  });

  it('a taught mark ACROSS the lasso summons — crossing is the deliberate act', () => {
    const s = lassoed();
    s.addStroke(caretStroke(250, 120, 80, 50), 3000);
    expect(s.getState().summon).not.toBeNull();
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

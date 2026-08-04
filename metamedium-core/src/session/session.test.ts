// Unit tests for the session engine's no-modes invariants.
// The full user story lives in session.scenario.test.ts.

import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import { isGesture, strokePointsOf } from './nodes';
import { circleStroke, lineStroke, checkStroke } from '../test/strokes';

describe('held ambiguity', () => {
  it('a closed stroke enclosing content is BOTH content and pending lasso', () => {
    const s = createSession();
    s.addStroke(circleStroke(300, 300, 40), 0);
    const lassoId = s.addStroke(circleStroke(300, 300, 150), 1000);

    const state = s.getState();
    expect(state.pendingLassoId).toBe(lassoId);
    expect(state.contentIds).toContain(lassoId); // still content too
    const lasso = state.nodes.get(lassoId)!;
    expect(lasso.edges.some((e) => e.rel === 'resembles' && e.to === 'type:circle')).toBe(true);
  });

  it('a closed stroke enclosing nothing is just content, not a lasso', () => {
    const s = createSession();
    const id = s.addStroke(circleStroke(300, 300, 100), 0);
    expect(s.getState().pendingLassoId).toBeNull();
    expect(s.getState().contentIds).toContain(id);
  });

  it('an unresolved lasso commits as content when something else follows', () => {
    const s = createSession();
    s.addStroke(circleStroke(300, 300, 40), 0);
    const lassoId = s.addStroke(circleStroke(300, 300, 150), 1000);
    s.addStroke(lineStroke({ x: 700, y: 700 }, { x: 900, y: 700 }), 2000);

    const state = s.getState();
    expect(state.pendingLassoId).toBeNull();
    expect(state.summon).toBeNull();
    expect(state.contentIds).toContain(lassoId);
    expect(isGesture(state.nodes.get(lassoId)!)).toBe(false);
  });

  it('a check too late does NOT resolve the lasso (temporal half)', () => {
    const s = createSession();
    s.addStroke(circleStroke(300, 300, 40), 0);
    s.addStroke(circleStroke(300, 300, 150), 1000);
    s.addStroke(checkStroke(460, 300), 60000); // way past the window

    expect(s.getState().summon).toBeNull();
  });

  it('a check too far away does NOT resolve the lasso (contextual half)', () => {
    const s = createSession();
    s.addStroke(circleStroke(300, 300, 40), 0);
    s.addStroke(circleStroke(300, 300, 150), 1000);
    s.addStroke(checkStroke(900, 900), 2000); // prompt, but nowhere near

    expect(s.getState().summon).toBeNull();
  });
});

describe('summoning', () => {
  function summonedSession() {
    const s = createSession();
    const inner = s.addStroke(circleStroke(300, 300, 40), 0);
    const lassoId = s.addStroke(circleStroke(300, 300, 150), 1000);
    const checkId = s.addStroke(checkStroke(460, 300), 2000);
    return { s, inner, lassoId, checkId };
  }

  it('lasso + check summons over the enclosed content, retroactively lifting both gestures', () => {
    const { s, inner, lassoId, checkId } = summonedSession();
    const state = s.getState();

    expect(state.summon).not.toBeNull();
    expect(state.summon!.enclosedIds).toEqual([inner]);
    expect(state.summon!.gestureIds).toEqual([lassoId, checkId]);
    expect(isGesture(state.nodes.get(lassoId)!)).toBe(true);
    expect(isGesture(state.nodes.get(checkId)!)).toBe(true);
    expect(state.contentIds).not.toContain(lassoId);
    expect(state.contentIds).not.toContain(checkId);
    // Ink preserved on gesture strokes — nothing is destroyed.
    expect(strokePointsOf(state.nodes.get(lassoId)!)).toBeDefined();
    // Suggestions always include the no-commitment exits.
    const kinds = state.summon!.suggestions.map((x) => x.kind);
    expect(kinds).toContain('name-as-new');
    expect(kinds).toContain('keep-as-drawing');
  });

  it('drawing past a summon dissolves it — ignoring is a valid answer', () => {
    const { s } = summonedSession();
    const next = s.addStroke(lineStroke({ x: 700, y: 700 }, { x: 900, y: 700 }), 3000);

    const state = s.getState();
    expect(state.summon).toBeNull();
    expect(state.contentIds).toContain(next); // input was never blocked
  });

  it('"keep as drawing" un-gestures the strokes back onto the content plane', () => {
    const { s, lassoId, checkId } = summonedSession();
    const keep = s.getState().summon!.suggestions.find((x) => x.kind === 'keep-as-drawing')!;
    const result = s.bless({ summonId: s.getState().summon!.id, suggestionId: keep.id, at: 3000 });

    const state = s.getState();
    expect(result).toBeNull(); // no artifact created
    expect(state.artifacts).toHaveLength(0);
    expect(state.contentIds).toContain(lassoId);
    expect(state.contentIds).toContain(checkId);
    expect(isGesture(state.nodes.get(lassoId)!)).toBe(false);
  });

  it('blessing with a stale summon id is a no-op', () => {
    const { s } = summonedSession();
    expect(s.bless({ summonId: 'summon:nope', name: 'x', at: 3000 })).toBeNull();
    expect(s.getState().summon).not.toBeNull(); // untouched
  });

  it('explicit dismiss clears the summon without side effects', () => {
    const { s, inner } = summonedSession();
    s.dismiss(s.getState().summon!.id, 3000);
    const state = s.getState();
    expect(state.summon).toBeNull();
    expect(state.contentIds).toContain(inner);
  });
});

describe('blessing into artifacts', () => {
  it('naming creates an artifact that absorbs its members and keeps their ink', () => {
    const s = createSession();
    const inner = s.addStroke(circleStroke(300, 300, 40), 0);
    s.addStroke(circleStroke(300, 300, 150), 1000);
    s.addStroke(checkStroke(460, 300), 2000);

    const artifactId = s.bless({ summonId: s.getState().summon!.id, name: 'bubble', at: 3000 })!;
    const state = s.getState();

    expect(state.artifacts).toEqual([artifactId]);
    expect(state.contentIds).toEqual([artifactId]); // opaque from outside
    expect(state.summon).toBeNull();

    const artifact = state.nodes.get(artifactId)!;
    expect(artifact.edges.some((e) => e.rel === 'has-part' && e.to === inner)).toBe(true);
    expect(artifact.edges.filter((e) => e.rel === 'blessed-by')).toHaveLength(2); // provenance
    expect(artifact.capability).toBe(0); // everything starts inert

    const member = state.nodes.get(inner)!;
    expect(member.edges.some((e) => e.rel === 'part-of' && e.to === artifactId)).toBe(true);
    expect(strokePointsOf(member)).toBeDefined(); // transparent within: ink intact
  });
});

describe('event log', () => {
  it('records every input for replay', () => {
    const s = createSession();
    s.addStroke(circleStroke(300, 300, 40), 0);
    s.tick(500);
    s.addStroke(circleStroke(300, 300, 150), 1000);
    expect(s.getEvents().map((e) => e.type)).toEqual(['stroke', 'tick', 'stroke']);
  });
});

describe('wire inference (inferred, then blessed)', () => {
  it('a line landing on two nodes is held as a candidate connection', () => {
    const s = createSession();
    const a = s.addStroke(circleStroke(200, 200, 40), 0);
    const b = s.addStroke(circleStroke(500, 200, 40), 1000);
    const wire = s.addStroke(lineStroke({ x: 245, y: 200 }, { x: 455, y: 200 }), 2000);

    const state = s.getState();
    const wireNode = state.nodes.get(wire)!;
    const connects = wireNode.edges.filter((e) => e.rel === 'connects');
    expect(connects.map((e) => e.to).sort()).toEqual([a, b].sort());
    // Inferred, not blessed — held like every other interpretation.
    expect(connects.every((e) => !e.blessed)).toBe(true);
    expect(
      state.nodes.get(a)!.edges.some((e) => e.rel === 'connected-by' && e.to === wire)
    ).toBe(true);
  });

  it('a line touching only one node is not a wire', () => {
    const s = createSession();
    s.addStroke(circleStroke(200, 200, 40), 0);
    const wire = s.addStroke(lineStroke({ x: 245, y: 200 }, { x: 455, y: 200 }), 1000);
    const wireNode = s.getState().nodes.get(wire)!;
    expect(wireNode.edges.filter((e) => e.rel === 'connects')).toHaveLength(0);
  });
});

describe('undo (event replay)', () => {
  it('undoing a stroke removes it and rebuilds identical prior state', () => {
    const s = createSession();
    s.addStroke(circleStroke(200, 200, 40), 0);
    // Snapshot now — state.nodes is a live view of the graph, not a copy.
    const beforeContent = s.getState().contentIds;
    const beforeKeys = [...s.getState().nodes.keys()].sort();
    s.addStroke(circleStroke(500, 200, 40), 1000);
    s.undo();

    const after = s.getState();
    expect(after.contentIds).toEqual(beforeContent);
    expect(after.artifacts).toEqual([]);
    expect([...after.nodes.keys()].sort()).toEqual(beforeKeys);
  });

  it('undoing a bless restores the summon — the offer comes back', () => {
    const s = createSession();
    s.addStroke(circleStroke(300, 300, 40), 0);
    s.addStroke(circleStroke(300, 300, 150), 1000);
    s.addStroke(checkStroke(460, 300), 2000);
    const summonId = s.getState().summon!.id;
    s.bless({ summonId, name: 'bubble', at: 3000 });
    expect(s.getState().artifacts).toHaveLength(1);

    s.undo();
    const state = s.getState();
    expect(state.artifacts).toHaveLength(0);
    expect(state.summon).not.toBeNull();
    expect(state.summon!.id).toBe(summonId); // deterministic replay
  });

  it('skips ticks: undo targets the last meaningful input', () => {
    const s = createSession();
    s.addStroke(circleStroke(200, 200, 40), 0);
    s.addStroke(circleStroke(500, 200, 40), 1000);
    s.tick(1500);
    s.tick(1600);
    s.undo();
    expect(s.getState().contentIds).toHaveLength(1);
  });
});

describe('erase & artifact degradation', () => {
  it('erasing a loose stroke removes it from content but keeps its node (ink preserved)', () => {
    const s = createSession();
    const id = s.addStroke(circleStroke(200, 200, 40), 0);
    s.erase(id, 1000);

    const state = s.getState();
    expect(state.contentIds).not.toContain(id);
    const node = state.nodes.get(id)!;
    expect(node).toBeDefined();
    expect(strokePointsOf(node)).toBeDefined();
    expect(node.reps.some((r) => r.modality === 'erased')).toBe(true);
  });

  it('erasing a member degrades the artifact: visibly broken, survivors return as ink', () => {
    const s = createSession();
    const m1 = s.addStroke(circleStroke(250, 300, 40), 0);
    const m2 = s.addStroke(circleStroke(350, 300, 40), 1000);
    s.addStroke(circleStroke(300, 300, 160), 2000); // lasso
    s.addStroke(checkStroke(470, 300), 3000); // check
    const artifactId = s.bless({ summonId: s.getState().summon!.id, name: 'pair', at: 4000 })!;
    expect(s.getState().contentIds).toEqual([artifactId]);

    s.erase(m1, 5000);
    const state = s.getState();
    // Never a silent phantom:
    const artifact = state.nodes.get(artifactId)!;
    expect(artifact.reps.some((r) => r.modality === 'status' && r.data === 'broken')).toBe(true);
    expect(state.artifacts).not.toContain(artifactId);
    expect(state.contentIds).not.toContain(artifactId);
    // Survivors come back as loose ink; the erased member does not.
    expect(state.contentIds).toContain(m2);
    expect(state.contentIds).not.toContain(m1);
  });

  it('erasing an artifact demotes it and frees all its members', () => {
    const s = createSession();
    const m1 = s.addStroke(circleStroke(250, 300, 40), 0);
    const m2 = s.addStroke(circleStroke(350, 300, 40), 1000);
    s.addStroke(circleStroke(300, 300, 160), 2000);
    s.addStroke(checkStroke(470, 300), 3000);
    const artifactId = s.bless({ summonId: s.getState().summon!.id, name: 'pair', at: 4000 })!;

    s.erase(artifactId, 5000);
    const state = s.getState();
    expect(state.artifacts).toHaveLength(0);
    expect(state.contentIds).toContain(m1);
    expect(state.contentIds).toContain(m2);
    // Membership history is retained — nothing is destroyed, only demoted.
    expect(state.nodes.get(m1)!.edges.some((e) => e.rel === 'part-of')).toBe(true);
  });

  it('erase + undo round-trips: the artifact is whole again', () => {
    const s = createSession();
    const m1 = s.addStroke(circleStroke(250, 300, 40), 0);
    s.addStroke(circleStroke(350, 300, 40), 1000);
    s.addStroke(circleStroke(300, 300, 160), 2000);
    s.addStroke(checkStroke(470, 300), 3000);
    const artifactId = s.bless({ summonId: s.getState().summon!.id, name: 'pair', at: 4000 })!;

    s.erase(m1, 5000);
    s.undo();
    const state = s.getState();
    expect(state.artifacts).toEqual([artifactId]);
    expect(state.contentIds).toEqual([artifactId]);
    expect(state.nodes.get(artifactId)!.reps.some((r) => r.modality === 'status')).toBe(false);
  });
});

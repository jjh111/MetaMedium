// THE EXECUTABLE SPEC (ARCHITECTURE-v6-SESSION-ENGINE.md §8)
//
// This test encodes the canonical user story end to end:
//
//   doodle a diagram (3 circles + 2 connecting lines) → circle it (lasso) →
//   check gesture → context summoned → name it "molecule" → it becomes a held
//   artifact → draw the same arrangement elsewhere → the system recognizes
//   "molecule" → lasso + check it → accept the match.
//
// It is the contract for every surface built on the engine. Change it
// knowingly or not at all.

import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import { isGesture, resemblances, strokePointsOf, topInterpretation, wordOf } from './nodes';
import { circleStroke, lineStroke, checkStroke } from '../test/strokes';
import type { Point } from '../types';

// 3 circles + 2 connecting lines, translated by (dx, dy).
function moleculeStrokes(dx = 0, dy = 0): Point[][] {
  const t = (points: Point[]) => points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
  return [
    t(circleStroke(200, 200, 40)),
    t(circleStroke(380, 200, 40)),
    t(circleStroke(290, 340, 40)),
    t(lineStroke({ x: 245, y: 200 }, { x: 335, y: 200 })),
    t(lineStroke({ x: 220, y: 245 }, { x: 270, y: 320 })),
  ];
}

describe('the canonical loop', () => {
  it('doodle → lasso → check → summon → name → hold → re-recognize → accept', () => {
    const s = createSession();
    let t = 0;
    const next = () => (t += 1000);

    // ===== 1. Doodle the diagram =====
    const memberIds = moleculeStrokes().map((points) => s.addStroke(points, next()));

    let state = s.getState();
    expect(state.contentIds).toHaveLength(5);
    expect(state.summon).toBeNull();
    expect(state.pendingLassoId).toBeNull(); // nothing encloses anything yet

    // Multi-parse held: every stroke carries ranked candidates, none committed.
    const topTypes = memberIds.map((id) => topInterpretation(state.nodes.get(id)!));
    expect(topTypes.filter((x) => x === 'circle')).toHaveLength(3);
    expect(topTypes.filter((x) => x === 'line')).toHaveLength(2);

    // ===== 2. Circle it =====
    const lassoId = s.addStroke(circleStroke(290, 270, 170), next());

    state = s.getState();
    // Held ambiguity: the lasso is simultaneously content (a circle candidate)
    // and the pending gesture. Nothing has been decided.
    expect(state.pendingLassoId).toBe(lassoId);
    expect(state.contentIds).toContain(lassoId);
    expect(
      state.nodes.get(lassoId)!.edges.some((e) => e.rel === 'resembles' && e.to === 'type:circle')
    ).toBe(true);

    // ===== 3. Check — the summon =====
    const checkId = s.addStroke(checkStroke(470, 300), next());

    state = s.getState();
    expect(state.summon).not.toBeNull();
    // The lasso defined the parse scope: exactly the five diagram strokes.
    expect([...state.summon!.enclosedIds].sort()).toEqual([...memberIds].sort());
    // Retroactivity: both strokes became gesture, left the content plane…
    expect(isGesture(state.nodes.get(lassoId)!)).toBe(true);
    expect(isGesture(state.nodes.get(checkId)!)).toBe(true);
    expect(state.contentIds).toHaveLength(5);
    // …but their ink and prior candidates persist (nothing is destroyed).
    expect(strokePointsOf(state.nodes.get(lassoId)!)).toBeDefined();
    expect(resemblances(state.nodes.get(lassoId)!).length).toBeGreaterThan(0);

    // Summoning, not confirming: nothing was accepted yet.
    expect(state.artifacts).toHaveLength(0);

    // ===== 4. Name it =====
    const moleculeId = s.bless({ summonId: state.summon!.id, name: 'molecule', at: next() })!;

    state = s.getState();
    expect(state.artifacts).toEqual([moleculeId]);
    expect(wordOf(state.nodes.get(moleculeId)!)).toBe('molecule');
    // Opaque from outside: the artifact is now ONE node on the content plane.
    expect(state.contentIds).toEqual([moleculeId]);
    // Transparent within: members keep their nodes, ink, and candidates.
    for (const id of memberIds) {
      const m = state.nodes.get(id)!;
      expect(m.edges.some((e) => e.rel === 'part-of' && e.to === moleculeId && e.blessed)).toBe(true);
      expect(strokePointsOf(m)).toBeDefined();
    }

    // ===== 5. Draw the same arrangement elsewhere =====
    const secondIds = moleculeStrokes(400, 0).map((points) => s.addStroke(points, next()));

    state = s.getState();
    // The system recognizes "molecule" — as a held candidate, not a commitment.
    expect(state.clusterCandidates).toHaveLength(1);
    const candidate = state.clusterCandidates[0];
    expect([...candidate.nodeIds].sort()).toEqual([...secondIds].sort());
    expect(candidate.matches[0].name).toBe('molecule');
    expect(state.artifacts).toHaveLength(1); // still just one — nothing auto-committed

    // ===== 6. Lasso + check the second one: the match is offered =====
    s.addStroke(circleStroke(690, 270, 170), next());
    s.addStroke(checkStroke(870, 300), next());

    state = s.getState();
    expect(state.summon).not.toBeNull();
    const match = state.summon!.suggestions.find((x) => x.kind === 'match');
    expect(match).toBeDefined();
    expect(match!.label).toBe('molecule');

    // ===== 7. Accept the match =====
    const secondMoleculeId = s.bless({
      summonId: state.summon!.id,
      suggestionId: match!.id,
      at: next(),
    })!;

    state = s.getState();
    expect(state.artifacts).toHaveLength(2);
    const second = state.nodes.get(secondMoleculeId)!;
    expect(wordOf(second)).toBe('molecule');
    expect(second.edges.some((e) => e.rel === 'instance-of' && e.to === moleculeId)).toBe(true);
    // The canvas now holds exactly two artifacts — strokes correctly held.
    expect(state.contentIds.sort()).toEqual([moleculeId, secondMoleculeId].sort());

    // ===== Grounded "why" is available throughout =====
    const firstCircle = state.nodes.get(memberIds[0])!;
    const top = resemblances(firstCircle)[0];
    expect(top.to).toBe('type:circle');
    expect(top.weight).toBeGreaterThanOrEqual(0.8);
  });
});

// A held lasso can be summoned explicitly — the discoverable path to the same offer.

import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import { rectStroke, circleStroke, checkStroke, lineStroke } from '../test/strokes';
import { isGesture } from './nodes';

describe('session.summonHeld', () => {
  it('reaches the same summon the command mark would', () => {
    const s = createSession();
    const a = s.addStroke(rectStroke(100, 100, 200, 120), 1000);
    const b = s.addStroke(rectStroke(340, 100, 200, 120), 1100);
    const lasso = s.addStroke(circleStroke(320, 160, 300), 2000);
    expect(s.getState().pendingLassoId).toBe(lasso);
    const id = s.summonHeld(2500);
    const st = s.getState();
    expect(id).toBeTruthy();
    expect(st.summon?.id).toBe(id);
    expect(st.summon?.enclosedIds.sort()).toEqual([a, b].sort());
    expect(st.summon?.scopeSource).toBe('lasso');
    expect(isGesture(st.nodes.get(lasso)!)).toBe(true);
    expect(st.contentIds).not.toContain(lasso);
    expect(st.pendingLassoId).toBeNull();
    // And blessing from it works exactly as from the mark.
    const art = s.bless({ summonId: id!, name: 'pair', at: 3000 });
    expect(art).toBeTruthy();
  });

  it('does nothing when nothing is held', () => {
    const s = createSession();
    s.addStroke(rectStroke(100, 100, 200, 120), 1000);
    expect(s.summonHeld(2000)).toBeNull();
    expect(s.getState().summon).toBeNull();
  });

  it('is an event like any other: undo puts the loop back as content', () => {
    const s = createSession();
    s.addStroke(rectStroke(100, 100, 200, 120), 1000);
    const lasso = s.addStroke(circleStroke(200, 160, 200), 2000);
    s.summonHeld(2500);
    s.undo();
    expect(s.getState().summon).toBeNull();
    expect(s.getState().pendingLassoId).toBe(lasso);
  });

  it('summonMarks: a tap on the chip beside a matching group summons those marks, and the match leads', () => {
    const s = createSession();
    const trio = (x: number, y: number, t: number) => [
      s.addStroke(circleStroke(x, y, 40), t), s.addStroke(circleStroke(x + 160, y, 40), t + 10),
      s.addStroke(lineStroke({ x: x + 44, y }, { x: x + 116, y }), t + 20),
    ];
    trio(200, 200, 1000);
    s.addStroke(circleStroke(280, 200, 170), 2000);
    const first = s.summonHeld(2500)!;
    s.bless({ summonId: first, name: 'molecule', at: 3000 });
    const again = trio(200, 500, 4000);
    const cand = s.getState().clusterCandidates.find((c) => c.matches.some((m) => m.name === 'molecule'));
    expect(cand).toBeTruthy();
    const id = s.summonMarks(cand!.nodeIds, 5000);
    const st = s.getState();
    expect(id).toBeTruthy();
    expect(st.summon?.scopeSource).toBe('pointed');
    expect(st.summon?.enclosedIds.sort()).toEqual(again.sort());
    expect(st.summon?.gestureIds).toEqual([]);
    expect(st.selection.sort()).toEqual(again.sort());
    const match = st.summon!.suggestions.find((g) => g.kind === 'match');
    expect(match?.label).toBe('molecule');
    // Blessing the match from it holds an instance, as from a loop.
    const inst = s.bless({ summonId: id!, suggestionId: match!.id, at: 6000 });
    expect(inst).toBeTruthy();
    expect(s.getState().nodes.get(inst!)!.edges.some((e) => e.rel === 'instance-of')).toBe(true);
    // Undo drops the summon; the marks are content again.
    s.undo(); s.undo();
    expect(s.getState().summon).toBeNull();
    expect(again.every((m) => s.getState().contentIds.includes(m))).toBe(true);
  });

  it('summonMarks ignores ids that are not content, and summons nothing when none remain', () => {
    const s = createSession();
    const a = s.addStroke(rectStroke(100, 100, 200, 120), 1000);
    expect(s.summonMarks(['nope'], 2000)).toBeNull();
    expect(s.getState().summon).toBeNull();
    const id = s.summonMarks([a, 'nope'], 2100);
    expect(id).toBeTruthy();
    expect(s.getState().summon?.enclosedIds).toEqual([a]);
  });

  it('the mark still works afterwards — the two paths coexist', () => {
    const s = createSession();
    s.addStroke(rectStroke(100, 100, 200, 120), 1000);
    s.addStroke(circleStroke(200, 160, 200), 2000);
    s.addStroke(checkStroke(420, 150), 2500);
    expect(s.getState().summon).not.toBeNull();
  });
});

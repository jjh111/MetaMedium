// A held lasso can be summoned explicitly — the discoverable path to the same offer.

import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import { rectStroke, circleStroke, checkStroke } from '../test/strokes';
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

  it('the mark still works afterwards — the two paths coexist', () => {
    const s = createSession();
    s.addStroke(rectStroke(100, 100, 200, 120), 1000);
    s.addStroke(circleStroke(200, 160, 200), 2000);
    s.addStroke(checkStroke(420, 150), 2500);
    expect(s.getState().summon).not.toBeNull();
  });
});

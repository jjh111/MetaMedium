// The command mark reads BACKWARDS.
//
// Requiring a lasso before the mark can act is a mode wearing a different hat:
// you have to declare a selection before you are allowed to say what to do with
// it. Reading back over the marks you just made removes that step — draw four
// boxes, strike through them, and the canvas knows which four you meant.

import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG } from './session';
import { getRep } from './nodes';
import { handRect, checkStroke, lineStroke, rectStroke, circleStroke } from '../test/strokes';

/** Three boxes in a row, drawn in one breath. */
function threeBoxes(s: ReturnType<typeof createSession>, t = 1000) {
  const ids = [
    s.addStroke(handRect(100, 100, 150, 120, { seed: 1 }), t),
    s.addStroke(handRect(290, 100, 150, 120, { seed: 2 }), t + 400),
    s.addStroke(handRect(480, 100, 150, 120, { seed: 3 }), t + 800),
  ];
  return ids;
}

describe('the mark acts with nothing circled first', () => {
  it('strikes through one of a group and takes the whole group', () => {
    const s = createSession();
    const ids = threeBoxes(s);
    // A check across the middle box. No lasso anywhere.
    s.addStroke(checkStroke(300, 130), 2200);

    const summon = s.getState().summon!;
    expect(summon).not.toBeNull();
    expect([...summon.enclosedIds].sort()).toEqual([...ids].sort());
    expect(summon.scopeSource).toBe('recent');
    expect(summon.scopeReasoning).toMatch(/drew alongside/);
  });

  it('takes only what it crossed when there is nothing recent around it', () => {
    const s = createSession();
    const lone = s.addStroke(handRect(100, 100, 150, 120, { seed: 1 }), 1000);
    // Something else entirely, far away and long ago.
    s.addStroke(handRect(2000, 2000, 150, 120, { seed: 2 }), 1100);
    s.addStroke(checkStroke(120, 130), 60_000);

    const summon = s.getState().summon!;
    expect(summon.enclosedIds).toEqual([lone]);
    expect(summon.scopeSource).toBe('crossed');
  });

  it('does nothing at all when the mark touches nothing', () => {
    const s = createSession();
    threeBoxes(s);
    s.addStroke(checkStroke(3000, 3000), 2200);
    expect(s.getState().summon).toBeNull();
  });

  it('leaves the mark out of the content plane — it is a gesture, not ink', () => {
    const s = createSession();
    threeBoxes(s);
    const markId = s.addStroke(checkStroke(300, 130), 2200);
    const state = s.getState();
    expect(state.contentIds).not.toContain(markId);
    expect(getRep(state.nodes.get(markId)!, 'gesture')).toBeDefined();
  });

  it('records how it decided, so a wrong guess is visible rather than mysterious', () => {
    const s = createSession();
    threeBoxes(s);
    s.addStroke(checkStroke(300, 130), 2200);
    const g = getRep(s.getState().nodes.get(s.getState().summon!.gestureIds[0])!, 'gesture')!;
    expect((g.data as { scope: string }).scope).toBe('recent');
  });
});

describe('the temporal window is what "just now" means', () => {
  it('does not sweep in marks drawn long before', () => {
    const s = createSession();
    const old1 = s.addStroke(handRect(100, 100, 150, 120, { seed: 1 }), 1000);
    // Drawn much later, right beside it.
    const fresh = s.addStroke(handRect(290, 100, 150, 120, { seed: 2 }), 400_000);
    s.addStroke(checkStroke(300, 130), 400_500);

    const summon = s.getState().summon!;
    expect(summon.enclosedIds).toContain(fresh);
    expect(summon.enclosedIds).not.toContain(old1);
  });

  it('sweeps them in when they were drawn inside the window', () => {
    const s = createSession();
    const a = s.addStroke(handRect(100, 100, 150, 120, { seed: 1 }), 400_000);
    const b = s.addStroke(handRect(290, 100, 150, 120, { seed: 2 }), 400_000 + DEFAULT_SESSION_CONFIG.recentWindowMs - 500);
    s.addStroke(checkStroke(300, 130), 400_000 + DEFAULT_SESSION_CONFIG.recentWindowMs);
    expect([...s.getState().summon!.enclosedIds].sort()).toEqual([a, b].sort());
  });

  it('reports the window as state, so a surface can show what is in play', () => {
    const s = createSession();
    const ids = threeBoxes(s, 1000);
    expect([...s.getState().recentIds].sort()).toEqual([...ids].sort());
  });
});

describe('an explicit circle still wins', () => {
  it('a lasso plus a mark scopes to what was circled, not to what was crossed', () => {
    const s = createSession();
    const boxes = threeBoxes(s);
    // Circle only the first two.
    s.addStroke(circleStroke(270, 160, 210), 2000);
    s.addStroke(checkStroke(500, 175), 2200);

    const summon = s.getState().summon!;
    expect(summon.scopeSource).toBe('lasso');
    expect(summon.enclosedIds).toContain(boxes[0]);
    expect(summon.enclosedIds).toContain(boxes[1]);
    expect(summon.enclosedIds).not.toContain(boxes[2]);
  });
});

describe('the mark still has to be the mark', () => {
  it('an ordinary stroke through a group is ink, not a gesture', () => {
    const s = createSession();
    const ids = threeBoxes(s);
    const line = s.addStroke(lineStroke({ x: 90, y: 160 }, { x: 640, y: 160 }, 60), 2200);
    expect(s.getState().summon).toBeNull();
    expect(s.getState().contentIds).toContain(line);
    expect(s.getState().contentIds).toEqual(expect.arrayContaining(ids));
  });

  it('a scratch-out still erases rather than summoning', () => {
    const s = createSession();
    const ids = threeBoxes(s);
    // Scratched across the first box only.
    s.addStroke(
      [
        ...lineStroke({ x: 80, y: 130 }, { x: 270, y: 130 }, 10),
        ...lineStroke({ x: 270, y: 160 }, { x: 80, y: 160 }, 10),
        ...lineStroke({ x: 80, y: 190 }, { x: 270, y: 190 }, 10),
      ],
      2200
    );
    expect(s.getState().summon).toBeNull();
    expect(s.getState().contentIds).not.toContain(ids[0]);
  });

  it('a mark that dwarfs everything it touched is a drawing', () => {
    const s = createSession();
    s.addStroke(rectStroke(100, 100, 40, 30), 1000);
    // A check ten times the size of the only thing it crosses.
    s.addStroke(checkStroke(60, 60).map((p) => ({ x: p.x * 6, y: p.y * 6 })), 1200);
    expect(s.getState().summon).toBeNull();
  });
});

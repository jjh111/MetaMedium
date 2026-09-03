// Replay from a checkpoint is replay from zero — only faster.

import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import { rectStroke, lineStroke, circleStroke, checkStroke } from '../test/strokes';
import { wordOf } from './nodes';

function fingerprint(s: ReturnType<typeof createSession>) {
  const st = s.getState();
  return JSON.stringify({
    content: st.contentIds, artifacts: st.artifacts, live: st.live, selection: st.selection,
    names: st.artifacts.map((id) => wordOf(st.nodes.get(id)!)),
    nodes: [...st.nodes.keys()].length, summon: !!st.summon, pending: st.pendingLassoId,
  });
}

describe('checkpoints', () => {
  it('a long log replayed from its checkpoints matches a replay from zero', () => {
    const s = createSession();
    let t = 1000;
    for (let i = 0; i < 230; i++) {
      s.addStroke(lineStroke({ x: 0, y: i * 10 }, { x: 400, y: i * 10 + 3 }), (t += 100));
    }
    s.addStroke(rectStroke(100, 3000, 200, 120), (t += 100));
    s.addStroke(rectStroke(340, 3000, 200, 120), (t += 100));
    s.addStroke(circleStroke(320, 3060, 300), (t += 100));
    s.addStroke(checkStroke(650, 3060), (t += 100));
    s.bless({ summonId: s.getState().summon!.id, name: 'pair', at: (t += 100) });
    const viaCheckpoints = fingerprint(s);
    const fresh = createSession();
    fresh.load(JSON.parse(JSON.stringify(s.getEvents())));
    expect(fingerprint(fresh)).toBe(viaCheckpoints);
  });

  it('undo on a long log is fast, and correct', () => {
    const s = createSession();
    let t = 1000;
    for (let i = 0; i < 420; i++) s.addStroke(lineStroke({ x: 0, y: i * 10 }, { x: 400, y: i * 10 + 3 }), (t += 100));
    const before = s.getState().contentIds.length;
    // Undo replays from the 400-event checkpoint: 20 events, not 420.
    const t0 = performance.now();
    s.undo();
    const fromCheckpoint = performance.now() - t0;
    expect(s.getState().contentIds.length).toBe(before - 1);
    // The same log with no checkpoints, from zero, for the comparison.
    const fresh = createSession();
    const log = JSON.parse(JSON.stringify(s.getEvents()));
    const t1 = performance.now();
    fresh.load(log);
    const fromZero = performance.now() - t1;
    // 20 events from the checkpoint against 420 from zero; the snapshot's
    // clone and the later strokes' longer relation passes eat some of the gap.
    expect(fromCheckpoint).toBeLessThan(fromZero / 2);
  });

  it('a checkpoint past a cut is never used', () => {
    const s = createSession();
    let t = 1000;
    for (let i = 0; i < 210; i++) s.addStroke(lineStroke({ x: 0, y: i * 10 }, { x: 400, y: i * 10 + 3 }), (t += 100));
    for (let i = 0; i < 15; i++) s.undo(); // back below the 200-event checkpoint
    expect(s.getState().contentIds).toHaveLength(195);
    s.addStroke(rectStroke(100, 100, 200, 120), (t += 100));
    expect(s.getState().contentIds).toHaveLength(196);
    const fresh = createSession();
    fresh.load(JSON.parse(JSON.stringify(s.getEvents())));
    expect(fingerprint(fresh)).toBe(fingerprint(s));
  });
});

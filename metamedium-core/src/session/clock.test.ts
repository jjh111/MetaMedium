// Clocks: play is the bless that lets an artifact's code run (I9); a pause
// carries why; the clock is log state, so it replays and undoes.

import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import { rectStroke, circleStroke, checkStroke } from '../test/strokes';
import { LOCAL_PARTICIPANT } from './nodes';

function liveArtifact(s: ReturnType<typeof createSession>, kind: 'js' | 'html' = 'js') {
  s.addStroke(rectStroke(100, 100, 200, 120), 1000);
  s.addStroke(circleStroke(200, 160, 200), 2000);
  s.addStroke(checkStroke(420, 150), 3000);
  const id = s.bless({ summonId: s.getState().summon!.id, name: 'thing', at: 4000 })!;
  s.attachCode({ participantId: LOCAL_PARTICIPANT, nodeId: id, code: 'return { fx: 1, fy: 0 };', kind, at: 5000 });
  return id;
}

describe('clocks', () => {
  it('a code rep carries its kind, html by default', () => {
    const s = createSession();
    const id = liveArtifact(s, 'js');
    const rep = s.getState().nodes.get(id)!.reps.filter((r) => r.modality === 'code').pop()!;
    expect((rep.data as { kind: string }).kind).toBe('js');
    const s2 = createSession();
    const id2 = liveArtifact(s2, 'html');
    const rep2 = s2.getState().nodes.get(id2)!.reps.filter((r) => r.modality === 'code').pop()!;
    expect((rep2.data as { kind: string }).kind).toBe('html');
  });

  it('nothing plays until a hand plays it; a pause can say why; reset and seed keep the rest', () => {
    const s = createSession();
    const id = liveArtifact(s);
    expect(s.getState().clocks[id]).toBeUndefined();
    s.clock({ nodeId: id, op: 'play', at: 6000 });
    expect(s.getState().clocks[id]).toEqual({ playing: true, seed: 1, at: 6000 });
    s.clock({ nodeId: id, op: 'seed', seed: 42, at: 6100 });
    expect(s.getState().clocks[id].seed).toBe(42);
    expect(s.getState().clocks[id].playing).toBe(true);
    s.clock({ nodeId: id, op: 'pause', reason: 'threw: boom', at: 6200 });
    expect(s.getState().clocks[id]).toEqual({ playing: false, seed: 42, at: 6200, reason: 'threw: boom' });
    s.clock({ nodeId: id, op: 'reset', at: 6300 });
    expect(s.getState().clocks[id]).toEqual({ playing: false, seed: 42, at: 6300 });
  });

  it('a clock on something that is not live is ignored, and clocks replay and undo', () => {
    const s = createSession();
    const id = liveArtifact(s);
    s.clock({ nodeId: 'stroke:1', op: 'play', at: 6000 });
    expect(s.getState().clocks['stroke:1']).toBeUndefined();
    s.clock({ nodeId: id, op: 'play', at: 6000 });
    const copy = createSession();
    copy.load(s.getEvents());
    expect(copy.getState().clocks[id].playing).toBe(true);
    s.undo();
    expect(s.getState().clocks[id]).toBeUndefined();
  });
});

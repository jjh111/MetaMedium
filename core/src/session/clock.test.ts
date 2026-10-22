// Clocks: play is the bless that lets an artifact's code run (I9); a pause
// carries why; the clock is log state, so it replays and undoes.

import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG } from './session';
import { rectStroke, circleStroke, checkStroke } from '../test/strokes';
import { LOCAL_PARTICIPANT } from './nodes';
import { mergeLogs } from '../store/merge';

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

  it('a clock on a stroke is ignored — clocks belong to artifacts — and clocks replay and undo', () => {
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

  it('clockAuthor names the PERSON who last set the clock, or null for this hand (C1)', () => {
    // This hand plays its own program: nobody else, so null.
    const mine = createSession();
    const id = liveArtifact(mine);
    expect(mine.clockAuthor(id)).toBeNull();
    mine.clock({ nodeId: id, op: 'play', at: 6000 });
    expect(mine.clockAuthor(id)).toBeNull();

    // Another hand draws, blesses and plays a js in its own log; merged as a
    // room merges, the reader reads the play as that person's — so a surface
    // knows the program is playing for someone else before it runs it here.
    const eve = createSession({ ...DEFAULT_SESSION_CONFIG, logName: 'eve~zz' });
    const eid = liveArtifact(eve);
    eve.clock({ nodeId: eid, op: 'play', at: 6000 });

    const me = createSession({ ...DEFAULT_SESSION_CONFIG, logName: 'me~aa' });
    me.load(mergeLogs({ 'me~aa': [], 'eve~zz': eve.getEvents() }, { me: 'me~aa' }));
    const theId = Object.keys(me.getState().clocks)[0];
    expect(me.getState().clocks[theId].playing).toBe(true);
    expect(me.clockAuthor(theId)).toBe('eve');

    // When this hand then plays it too, the last word is this hand's: null.
    me.clock({ nodeId: theId, op: 'play', at: 7000 });
    expect(me.clockAuthor(theId)).toBeNull();
  });
});

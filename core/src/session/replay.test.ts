// A recording replays as itself — the mechanism behind replays-as-figures.

import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import { rectStroke, circleStroke, checkStroke } from '../test/strokes';
import { wordOf, transcriptOf } from './nodes';
import { cleanOf } from './clean';

function record() {
  const s = createSession();
  const a = s.addStroke(rectStroke(100, 100, 200, 120), 1000);
  const b = s.addStroke(rectStroke(340, 100, 200, 120), 1100);
  s.snap({ ids: [a, b], at: 1200 });
  const pid = s.join('agent', 'llm:recorded', 1300, 1);
  s.propose({ participantId: pid, nodeId: a, edges: [{ to: 'type:card', rel: 'resembles', weight: 0.7, reasoning: 'recorded' }], at: 1400 });
  s.addStroke(circleStroke(320, 160, 300), 2000);
  s.addStroke(checkStroke(650, 160), 2500);
  s.bless({ summonId: s.getState().summon!.id, name: 'pair', at: 3000 });
  s.answer({ participantId: pid, question: 'why?', text: 'two boxes side by side', aboutIds: [a, b], at: 3500 });
  return s;
}

describe('session.load', () => {
  it('replays a recording into an identical state, with no model attached', () => {
    const original = record();
    const log = JSON.parse(JSON.stringify(original.getEvents()));
    const copy = createSession();
    copy.load(log);
    const A = original.getState(), B = copy.getState();
    expect(B.contentIds).toEqual(A.contentIds);
    expect(B.artifacts).toEqual(A.artifacts);
    expect(B.explanations).toEqual(A.explanations);
    expect([...B.nodes.keys()]).toEqual([...A.nodes.keys()]);
    expect(wordOf(B.nodes.get(A.artifacts[0])!)).toBe('pair');
    expect(cleanOf(B.nodes.get('stroke:1')!)).toBeDefined();
  });

  it('a prefix of the log stands at that step, and the session continues from it', () => {
    const log = record().getEvents();
    const s = createSession();
    s.load(log.slice(0, 2)); // two boxes, nothing else yet
    expect(s.getState().contentIds).toHaveLength(2);
    expect(s.getState().artifacts).toHaveLength(0);
    s.load(log.slice(0, 7)); // through the check: a summon is open
    expect(s.getState().summon).not.toBeNull();
    // The reader draws on: the recorded session continues with their mark.
    s.addStroke(rectStroke(100, 400, 200, 120), 9000);
    expect(s.getState().contentIds).toHaveLength(3);
    expect(s.getEvents()).toHaveLength(8);
  });

  it('a recorded transcript replays as a held reading', () => {
    const s = createSession();
    const id = s.addStroke(rectStroke(100, 100, 200, 120), 1000);
    const pid = s.join('agent', 'llm:seeing', 1100, 1);
    s.propose({ participantId: pid, nodeId: id, edges: [], reps: [{ modality: 'transcript', data: { text: 'Pricing' }, confidence: 0.9 }], at: 1200 });
    const copy = createSession();
    copy.load(JSON.parse(JSON.stringify(s.getEvents())));
    expect(transcriptOf(copy.getState().nodes.get(id)!)).toBe('Pricing');
  });
});

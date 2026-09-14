// Another hand's log, merged: everything in it is that hand's — its ink, and
// also what it said, proposed and wrote in its own "local" name (v10 T2).
import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import { LOCAL_PARTICIPANT, transcriptsOf } from './nodes';
import { mergeLogs } from '../store/merge';

function box(x: number, y: number, w: number, h: number) {
  const pts = [];
  for (let i = 0; i <= 20; i++) pts.push({ x: x + (w * i) / 20, y });
  for (let i = 0; i <= 20; i++) pts.push({ x: x + w, y: y + (h * i) / 20 });
  for (let i = 0; i <= 20; i++) pts.push({ x: x + w - (w * i) / 20, y: y + h });
  for (let i = 0; i <= 20; i++) pts.push({ x, y: y + h - (h * i) / 20 });
  return pts;
}

describe('a hand in a room', () => {
  it('attributes another log\'s local answers, proposals and code to that hand', () => {
    const ann = createSession();
    const id = ann.addStroke(box(0, 0, 100, 60), 1000, undefined, 1, { content: true });
    ann.answer({ participantId: LOCAL_PARTICIPANT, question: 'why', text: 'a box for the header', aboutIds: [id], at: 1001 });
    ann.propose({ participantId: LOCAL_PARTICIPANT, nodeId: id, edges: [], reps: [{ modality: 'transcript', data: { text: 'hello' }, confidence: 0.9 }], at: 1002 });

    const me = createSession();
    me.load(mergeLogs({ ann: ann.getEvents(), me: [] }, { me: 'me' }));
    const s = me.getState();
    const hand = 'participant:hand:ann';
    expect(s.participants).toContain(hand);
    const mark = s.nodes.get(s.contentIds[0])!;
    expect(mark.edges.find((e) => e.rel === 'made-by')?.to).toBe(hand);
    const answer = s.nodes.get(s.explanations[0])!;
    expect(answer.edges.some((e) => e.rel === 'made-by' && e.to === hand)).toBe(true);
    expect(answer.edges.some((e) => e.to === LOCAL_PARTICIPANT)).toBe(false);
    expect(transcriptsOf(mark)[0].source).toBe(hand);
  });

  it('leaves my own log unstamped and mine', () => {
    const me = createSession();
    const id = me.addStroke(box(0, 0, 100, 60), 1000);
    me.answer({ participantId: LOCAL_PARTICIPANT, question: 'why', text: 'mine', aboutIds: [id], at: 1001 });
    me.load(mergeLogs({ me: me.getEvents(), ann: [] }, { me: 'me' }));
    const s = me.getState();
    const answer = s.nodes.get(s.explanations[0])!;
    expect(answer.edges.some((e) => e.rel === 'made-by' && e.to === LOCAL_PARTICIPANT)).toBe(true);
  });
});

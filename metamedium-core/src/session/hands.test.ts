// Another hand's log, merged: everything in it is that hand's — its ink, and
// also what it said, proposed and wrote in its own "local" name (v10 T2).
import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import { LOCAL_PARTICIPANT, transcriptsOf, wordOf } from './nodes';
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

  it('shows a hand by the person\'s name, without the suffix that tells their tabs apart', () => {
    const ann = createSession();
    ann.addStroke(box(0, 0, 100, 60), 1000);
    const me = createSession();
    me.load(mergeLogs({ 'ann~k3x9': ann.getEvents(), me: [] }, { me: 'me' }));
    const s = me.getState();
    expect(s.participants).toContain('participant:hand:ann_k3x9');
    expect(wordOf(s.nodes.get('participant:hand:ann_k3x9')!)).toBe('ann');
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

// Writing taken as text is a transcription, not vocabulary (v10 F8).
describe('writing as text', () => {
  it('a blessed group carrying text code is never offered as a match for other writing', () => {
    const s = createSession();
    const a = s.addStroke(box(0, 0, 40, 60), 1000);
    const b = s.addStroke(box(60, 0, 40, 60), 1100);
    s.addStroke(box(-30, -30, 160, 120), 1200);
    const sum = s.summonHeld(1300)!;
    const id = s.bless({ summonId: sum, name: 'hello world', at: 1400 })!;
    s.attachCode({ participantId: LOCAL_PARTICIPANT, nodeId: id, kind: 'text', code: 'hello world', from: 'writing', at: 1500 });
    void a; void b;
    // Another pair of boxes like the first: no chip, because a text is not a definition.
    s.addStroke(box(300, 0, 40, 60), 2000);
    s.addStroke(box(360, 0, 40, 60), 2100);
    expect(s.getState().clusterCandidates).toHaveLength(0);
  });
});

// The ink under a text is provenance: a scratch over it erases nothing (v10 F12).
describe('a text holds its ink', () => {
  it('a scratch across a text made from writing erases none of the strokes underneath', () => {
    const s = createSession();
    s.addStroke(box(0, 0, 40, 60), 1000);
    s.addStroke(box(60, 0, 40, 60), 1100);
    s.addStroke(box(-30, -30, 160, 120), 1200);
    const sum = s.summonHeld(1300)!;
    const id = s.bless({ summonId: sum, name: 'hello world', at: 1400 })!;
    s.attachCode({ participantId: LOCAL_PARTICIPANT, nodeId: id, kind: 'text', code: 'hello world', from: 'writing', at: 1500 });
    const before = s.getState().contentIds.slice();
    // Three passes across the first word's box: a scratch by every rule.
    const pts = [];
    for (let i = 0; i <= 20; i++) pts.push({ x: -10 + (60 * i) / 20, y: 10 });
    for (let i = 0; i <= 20; i++) pts.push({ x: 50 - (60 * i) / 20, y: 30 });
    for (let i = 0; i <= 20; i++) pts.push({ x: -10 + (60 * i) / 20, y: 50 });
    const scratch = s.addStroke(pts, 2000);
    const st = s.getState();
    expect(st.contentIds).toEqual(before.concat(scratch));
    expect(st.live).toContain(id);
    const members = st.nodes.get(id)!.edges.filter((e) => e.rel === 'has-part').map((e) => e.to);
    for (const m of members) expect(st.nodes.get(m)!.reps.some((r) => r.modality === 'erased')).toBe(false);
  });
});

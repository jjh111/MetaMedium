// A hand may put a word on its OWN ink (the notes, §B) — and on nobody else's.
//
// Naming a mark somebody else made is blessing it, which is the human's act.
// Naming a mark you just made is not: it is labelling your own ink. These
// pin the difference, and the shape a label takes: a rep on the mark, never
// an artifact, never a file.
import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG } from './session';
import { LOCAL_PARTICIPANT, labelOf, labelsOf, wordOf, resemblances } from './nodes';
import { interpretationsOf } from './interpretations';
import { mergeLogs } from '../store/merge';
import { describeSession } from '../participants/serialize';

function box(x: number, y: number, w: number, h: number) {
  const pts = [];
  for (let i = 0; i <= 20; i++) pts.push({ x: x + (w * i) / 20, y });
  for (let i = 0; i <= 20; i++) pts.push({ x: x + w, y: y + (h * i) / 20 });
  for (let i = 0; i <= 20; i++) pts.push({ x: x + w - (w * i) / 20, y: y + h });
  for (let i = 0; i <= 20; i++) pts.push({ x, y: y + h - (h * i) / 20 });
  return pts;
}

/** A session that knows what its log is called, so its ids are its own (D8). */
const hand = (logName: string) => createSession({ ...DEFAULT_SESSION_CONFIG, logName });

describe('labelling your own ink', () => {
  it('holds the word on the mark, attributed to the hand that made it', () => {
    const s = createSession();
    const id = s.addStroke(box(0, 0, 100, 60), 1000, undefined, 1, { content: true });
    expect(s.label({ nodeId: id, text: 'inlet', at: 1001 })).toBe(id);

    const node = s.getState().nodes.get(id)!;
    expect(labelOf(node)!.text).toBe('inlet');
    expect(labelOf(node)!.source).toBe(LOCAL_PARTICIPANT);
    expect(s.getState().staleResult).toBeNull();
  });

  it('is not a bless: no name, and the engine\'s own readings stand beside it', () => {
    const s = createSession();
    const id = s.addStroke(box(0, 0, 100, 60), 1000, undefined, 1, { content: true });
    const before = resemblances(s.getState().nodes.get(id)!).map((e) => e.to);
    s.label({ nodeId: id, text: 'inlet', at: 1001 });

    const node = s.getState().nodes.get(id)!;
    // The blessed name is what a bless writes; a label writes nothing there.
    expect(wordOf(node)).toBeUndefined();
    expect(resemblances(node).map((e) => e.to)).toEqual(before);

    const reads = interpretationsOf(node, s.getState().nodes);
    const mine = reads.find((r) => r.label === 'inlet')!;
    expect(mine.blessed).toBe(false);
    // One named reading among several, never the only one.
    expect(reads.length).toBeGreaterThan(1);
    expect(reads.some((r) => r.label === 'rectangle')).toBe(true);
  });

  it('is not an artifact, so it can never be a file in the folder view', () => {
    const s = createSession();
    const id = s.addStroke(box(0, 0, 100, 60), 1000, undefined, 1, { content: true });
    const before = s.getState();
    s.label({ nodeId: id, text: 'inlet', at: 1001 });
    const after = s.getState();
    expect(after.artifacts).toEqual(before.artifacts);
    expect(after.live).toEqual(before.live);
    expect(after.contentIds).toEqual(before.contentIds);
    expect(after.explanations).toEqual(before.explanations);
  });

  it('relabels, and an empty word takes the label off again', () => {
    const s = createSession();
    const id = s.addStroke(box(0, 0, 100, 60), 1000, undefined, 1, { content: true });
    s.label({ nodeId: id, text: 'inlet', at: 1001 });
    s.label({ nodeId: id, text: 'outlet', at: 1002 });
    expect(labelOf(s.getState().nodes.get(id)!)!.text).toBe('outlet');
    // Every one is kept: relabelling is history, not an overwrite.
    expect(labelsOf(s.getState().nodes.get(id)!).map((l) => l.text)).toEqual(['inlet', 'outlet']);

    s.label({ nodeId: id, text: '', at: 1003 });
    expect(labelOf(s.getState().nodes.get(id)!)).toBeUndefined();
  });

  it('undoes, because state is a pure function of the log', () => {
    const s = createSession();
    const id = s.addStroke(box(0, 0, 100, 60), 1000, undefined, 1, { content: true });
    s.label({ nodeId: id, text: 'inlet', at: 1001 });
    s.undo();
    expect(labelOf(s.getState().nodes.get(id)!)).toBeUndefined();
  });

  it('says the word in the brief a model is handed', () => {
    const s = createSession();
    const id = s.addStroke(box(0, 0, 100, 60), 1000, undefined, 1, { content: true });
    s.label({ nodeId: id, text: 'inlet', at: 1001 });
    expect(describeSession(s.getState())).toContain('labelled "inlet"');
  });
});

describe('labelling another hand\'s ink is refused', () => {
  it('refuses at the door, with a reason, and never enters the log', () => {
    const ann = hand('ann');
    const id = ann.addStroke(box(0, 0, 100, 60), 1000, undefined, 1, { content: true });

    const me = hand('me');
    me.load(mergeLogs({ ann: ann.getEvents(), me: [] }, { me: 'me' }));
    const mark = me.getState().contentIds[0];
    expect(mark).toBe(id);
    const before = me.getEvents().length;

    expect(me.label({ nodeId: mark, text: 'inlet', at: 2000 })).toBeNull();

    const stale = me.getState().staleResult!;
    expect(stale.what).toBe('label');
    expect(stale.reason).toBe('not-your-ink');
    expect(stale.nodeId).toBe(mark);
    expect(stale.detail).toContain('ann');
    expect(stale.detail).toContain('your own ink');
    // Never into the log: a refused event replayed would come back to life.
    expect(me.getEvents().length).toBe(before);
    expect(labelOf(me.getState().nodes.get(mark)!)).toBeUndefined();
  });

  it('drops it on replay too, when it arrives in a merged log', () => {
    // Ann labels a mark of her own; that stands. Then a log arrives claiming
    // to label MY mark in Ann's name — the door never saw it, so the apply
    // path has to refuse it, or the merge would be a way around the rule.
    const me = hand('me');
    const mine = me.addStroke(box(0, 0, 100, 60), 1000, undefined, 1, { content: true });

    const ann = hand('ann');
    const hers = ann.addStroke(box(400, 0, 100, 60), 1000, undefined, 1, { content: true });
    ann.label({ nodeId: hers, text: 'hers', at: 1001 });
    // Forge an event in Ann's log pointing at MY mark.
    const forged = [...ann.getEvents(), { type: 'label' as const, nodeId: mine, text: 'mine', at: 1002 }];

    const merged = hand('me');
    merged.load(mergeLogs({ ann: forged, me: me.getEvents() }, { me: 'me' }));
    const s = merged.getState();
    expect(labelOf(s.nodes.get(mine)!)).toBeUndefined();
    expect(labelOf(s.nodes.get(hers)!)!.text).toBe('hers');
    expect(labelOf(s.nodes.get(hers)!)!.source).toBe('participant:hand:ann');
  });

  it('refuses a mark that is gone, and one that was rubbed out', () => {
    const s = createSession();
    const id = s.addStroke(box(0, 0, 100, 60), 1000, undefined, 1, { content: true });
    s.erase(id, 1001);
    expect(s.label({ nodeId: id, text: 'inlet', at: 1002 })).toBeNull();
    expect(s.getState().staleResult!.reason).toBe('erased');

    expect(s.label({ nodeId: 'stroke:nope', text: 'inlet', at: 1003 })).toBeNull();
    expect(s.getState().staleResult!.reason).toBe('missing');
  });
});

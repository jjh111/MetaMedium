// A hand may put a word on its OWN ink (the notes, §B) — and on nobody else's.
//
// Naming a mark somebody else made is blessing it, which is the human's act.
// Naming a mark you just made is not: it is labelling your own ink. These
// pin the difference, and the shape a label takes: a rep on the mark, never
// an artifact, never a file.
import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG, type Session } from './session';
import { LOCAL_PARTICIPANT, ENGINE_PARTICIPANT, authorOf, labelOf, labelsOf, wordOf, resemblances } from './nodes';
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

  it('says what the reading is based on, so a label never stands in for the shape rung', () => {
    // Half the surface asks for "the tier-0 reading" to mean "what the shape
    // rung measured". A label sits at its maker's tier with weight 1, so it
    // would lead that list and stand in for a measurement (L2b).
    const s = createSession();
    const id = s.addStroke(box(0, 0, 100, 60), 1000, undefined, 1, { content: true });
    s.label({ nodeId: id, text: 'inlet', at: 1001 });
    const reads = interpretationsOf(s.getState().nodes.get(id)!, s.getState().nodes);
    expect(reads.find((r) => r.label === 'inlet')!.basis).toBe('label');
    expect(reads.find((r) => r.label === 'rectangle')!.basis).toBe('resemblance');
    const shape = reads.filter((r) => r.tier === 0 && r.basis !== 'label')[0];
    expect(shape.label).toBe('rectangle');
  });

  it('erasing the mark takes the label with it, and undo of the erase brings both', () => {
    const s = createSession();
    const id = s.addStroke(box(0, 0, 100, 60), 1000, undefined, 1, { content: true });
    s.label({ nodeId: id, text: 'inlet', at: 1001 });
    s.erase(id, 1002);
    expect(s.getState().contentIds).not.toContain(id);
    s.undo();
    expect(s.getState().contentIds).toContain(id);
    expect(labelOf(s.getState().nodes.get(id)!)!.text).toBe('inlet');
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

// ===== An artifact is made by whoever blessed it (V1-PLAN L2f) ==============
// A bless wrote no `made-by` edge, so every board read an artifact as its own
// READER's. In a room that broke the label rule twice over: the maker's word
// on her own artifact was dropped whenever another hand's board replayed her
// log, and that other hand could label her artifact at its own door. Ink never
// had this defect — a stroke from another hand's log is that hand's.
//
// The maker of an artifact is who BLESSED it — the same attribution a stroke
// gets — and not who drew its marks: a hand may bless a group several hands
// drew, and each of those marks stays its drawer's.

/** Two boxes side by side, taken up and named: one thing, made by this hand. */
function pairOf(s: Session, x: number, t: number, name: string) {
  const a = s.addStroke(box(x, 0, 100, 60), t, undefined, 1, { content: true });
  const b = s.addStroke(box(x + 150, 0, 100, 60), t + 100, undefined, 1, { content: true });
  const summonId = s.summonMarks([a, b], t + 200)!;
  const artifact = s.bless({ summonId, name, at: t + 300 })!;
  return { a, b, artifact };
}

describe('an artifact is made by whoever blessed it (V1-PLAN L2f)', () => {
  it('the maker\'s word on her own artifact survives every replay, and is hers on every board', () => {
    const ann = hand('ann');
    const { artifact } = pairOf(ann, 0, 1000, 'pair');
    expect(ann.label({ nodeId: artifact, text: 'inlet', at: 1400 })).toBe(artifact);
    const annLog = ann.getEvents().slice();
    // Bob has drawn before her, so merging his log moves every one of her events.
    const bob = hand('bob');
    bob.addStroke(box(0, 300, 100, 60), 500, undefined, 1, { content: true });
    const bobLog = bob.getEvents().slice();

    const boards: [string, Record<string, typeof annLog>, string][] = [
      ['ann', { ann: annLog }, LOCAL_PARTICIPANT],
      ['bob', { ann: annLog, bob: bobLog }, 'participant:hand:ann'],
      ['cleo', { ann: annLog, bob: bobLog }, 'participant:hand:ann'],
      ['cleo', { bob: bobLog, ann: annLog }, 'participant:hand:ann'],
    ];
    for (const [me, logs, maker] of boards) {
      const board = hand(me);
      board.load(mergeLogs(logs, { me }));
      const node = board.getState().nodes.get(artifact)!;
      expect(board.getState().artifacts).toEqual([artifact]);
      expect(authorOf(node)).toBe(maker);
      expect(labelOf(node)?.text).toBe('inlet');
      expect(labelOf(node)?.source).toBe(maker);
    }
  });

  it('another hand\'s word on it is refused at the door, with the reason, and never enters the log', () => {
    const ann = hand('ann');
    const { artifact } = pairOf(ann, 0, 1000, 'pair');
    ann.label({ nodeId: artifact, text: 'inlet', at: 1400 });

    const bob = hand('bob');
    bob.load(mergeLogs({ ann: ann.getEvents().slice(), bob: [] }, { me: 'bob' }));
    const before = bob.getEvents().length;
    expect(bob.label({ nodeId: artifact, text: 'mine now', at: 2000 })).toBeNull();

    const stale = bob.getState().staleResult!;
    expect(stale.what).toBe('label');
    expect(stale.reason).toBe('not-your-ink');
    expect(stale.nodeId).toBe(artifact);
    expect(stale.detail).toContain('ann');
    expect(stale.detail).toContain('your own ink');
    expect(bob.getEvents().length).toBe(before);
    // Hers stands, and is still hers.
    expect(labelOf(bob.getState().nodes.get(artifact)!)!.text).toBe('inlet');
    expect(labelOf(bob.getState().nodes.get(artifact)!)!.source).toBe('participant:hand:ann');
  });

  it('a word another hand wrote on it is dropped on every replay, and the maker\'s stands', () => {
    // Before this unit Bob's own door let it through, so a log of his can
    // carry it; the apply path is what has to hold the rule on every board.
    const ann = hand('ann');
    const { artifact } = pairOf(ann, 0, 1000, 'pair');
    ann.label({ nodeId: artifact, text: 'inlet', at: 1400 });
    const annLog = ann.getEvents().slice();
    const bobLog = [{ type: 'label' as const, nodeId: artifact, text: 'mine now', at: 2000 }];

    for (const [me, logs] of [['cleo', { ann: annLog, bob: bobLog }], ['ann', { ann: annLog, bob: bobLog }]] as const) {
      const board = hand(me);
      board.load(mergeLogs(logs, { me }));
      const node = board.getState().nodes.get(artifact)!;
      expect(labelsOf(node).map((l) => l.text)).toEqual(['inlet']);
      expect(labelOf(node)!.source).toBe(me === 'ann' ? LOCAL_PARTICIPANT : 'participant:hand:ann');
    }
  });

  it('the maker is who BLESSED it, not who drew its marks: a hand may bless a group two hands drew', () => {
    const ann = hand('ann');
    const hers = ann.addStroke(box(0, 0, 100, 60), 1000, undefined, 1, { content: true });

    // Bob, holding her log, draws beside her box and takes the two up as one thing.
    const bob = hand('bob');
    bob.load(mergeLogs({ ann: ann.getEvents().slice(), bob: [] }, { me: 'bob' }));
    const his = bob.addStroke(box(150, 0, 100, 60), 1100, undefined, 1, { content: true });
    const summonId = bob.summonMarks([hers, his], 1200)!;
    const artifact = bob.bless({ summonId, name: 'pair', at: 1300 })!;
    const bobLog = bob.getEvents().filter((e) => !e.by);

    // On his board: the thing is his; her box is still hers, his box his.
    let s = bob.getState();
    expect(authorOf(s.nodes.get(artifact)!)).toBe(LOCAL_PARTICIPANT);
    expect(authorOf(s.nodes.get(hers)!)).toBe('participant:hand:ann');
    expect(authorOf(s.nodes.get(his)!)).toBe(LOCAL_PARTICIPANT);

    // On hers, replaying his log beside her own: the thing is his there too.
    const annBoard = hand('ann');
    annBoard.load(mergeLogs({ ann: ann.getEvents().slice(), bob: bobLog }, { me: 'ann' }));
    s = annBoard.getState();
    expect(s.artifacts).toEqual([artifact]);
    expect(authorOf(s.nodes.get(artifact)!)).toBe('participant:hand:bob');
    expect(authorOf(s.nodes.get(hers)!)).toBe(LOCAL_PARTICIPANT);
    expect(authorOf(s.nodes.get(his)!)).toBe('participant:hand:bob');

    // Drawing one of its marks does not make it hers to label; her own mark still is.
    expect(annBoard.label({ nodeId: artifact, text: 'ours', at: 2000 })).toBeNull();
    expect(annBoard.getState().staleResult!.reason).toBe('not-your-ink');
    expect(annBoard.getState().staleResult!.detail).toContain('bob');
    expect(annBoard.label({ nodeId: hers, text: 'left', at: 2001 })).toBe(hers);
    // And he may put a word on the thing he made.
    expect(bob.label({ nodeId: artifact, text: 'pair', at: 2002 })).toBe(artifact);
  });

  it('a board\'s own blesses stay its own hand\'s, and the node is what it always was', () => {
    // Every held log is a board's own blesses. `authorOf` reads no edge as the
    // local participant, so nothing new is written on the node, and a held log
    // replays node for node.
    for (const s of [createSession(), hand('ann')]) {
      const { artifact } = pairOf(s, 0, 1000, 'pair');
      const node = s.getState().nodes.get(artifact)!;
      expect(authorOf(node)).toBe(LOCAL_PARTICIPANT);
      expect(node.edges.filter((e) => e.rel === 'made-by')).toEqual([]);
      expect(node.edges.map((e) => e.rel)).toEqual(['has-part', 'has-part']);
      expect(s.label({ nodeId: artifact, text: 'inlet', at: 1400 })).toBe(artifact);
    }
  });

  it('a bless in the engine\'s name is its hand\'s act — the shard stands a hull at tier 1 — and the engine keeps its word on it', () => {
    // Every tier proposes and none commits: a bless is a person's act. The
    // shard blesses a hull in the ENGINE's name, inside the act of the hand
    // whose log holds it, so the hull is that hand's on every board — the
    // hand may put a word on what its drawing stood, and nobody else may.
    const ann = hand('ann');
    const a = ann.addStroke(box(0, 0, 100, 60), 1000, undefined, 1, { content: true });
    const b = ann.addStroke(box(150, 0, 100, 60), 1100, undefined, 1, { content: true });
    const summonId = ann.summonMarks([a, b], 1200)!;
    const artifact = ann.bless({ summonId, name: 'hull', at: 1300, participantId: ENGINE_PARTICIPANT })!;
    const hers = ann.getState().nodes.get(artifact)!;
    expect(authorOf(hers)).toBe(LOCAL_PARTICIPANT);
    // Her own board's node is what it always was: no edge, and the engine's word.
    expect(hers.edges.some((e) => e.rel === 'made-by')).toBe(false);
    expect(hers.reps.find((r) => r.modality === 'word')!.source).toBe(ENGINE_PARTICIPANT);
    expect(ann.label({ nodeId: artifact, text: 'keep', at: 1400 })).toBe(artifact);

    const bob = hand('bob');
    bob.load(mergeLogs({ ann: ann.getEvents().slice(), bob: [] }, { me: 'bob' }));
    const onBob = bob.getState().nodes.get(artifact)!;
    expect(authorOf(onBob)).toBe('participant:hand:ann');
    expect(onBob.reps.find((r) => r.modality === 'word')!.source).toBe(ENGINE_PARTICIPANT);
    expect(labelOf(onBob)!.text).toBe('keep');
    expect(labelOf(onBob)!.source).toBe('participant:hand:ann');
    expect(bob.label({ nodeId: artifact, text: 'mine now', at: 1500 })).toBeNull();
    expect(bob.getState().staleResult!.reason).toBe('not-your-ink');
  });
});

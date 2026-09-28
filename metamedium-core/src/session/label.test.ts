// A hand may put a word on its OWN ink (the notes, §B) — and on nobody else's.
//
// Naming a mark somebody else made is blessing it, which is the human's act.
// Naming a mark you just made is not: it is labelling your own ink. These
// pin the difference, and the shape a label takes: a rep on the mark, never
// an artifact, never a file.
import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG, type Session, type SessionEvent } from './session';
import { LOCAL_PARTICIPANT, ENGINE_PARTICIPANT, authorOf, labelOf, labelsOf, wordOf, resemblances, isWord, lettersOf } from './nodes';
import { interpretationsOf } from './interpretations';
import { mergeLogs } from '../store/merge';
import { describeSession } from '../participants/serialize';
import { lineStroke } from '../test/strokes';
import type { Point } from '../types';

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

// ===== A word is made by whoever wrote its letters (V1-PLAN L2g) ============
// Printed letters gather into a held `word` node (words.ts), and the gathering
// wrote every word `made-by` the LOCAL participant, whoever wrote its letters.
// So on another hand's board her word read as the reader's: her label on it
// was dropped on every replay but her own, and that board could label it at
// its own door — while its letters were hers all along. And gathering never
// asked who wrote a letter: a merge interleaves the hands' events by time, so
// his letter printed beside hers read as the next letter of her word, and a
// mark of his landing between two of hers broke her run.
//
// A word is ONE hand's run: made by the hand that wrote its letters, on every
// board, and never gathered from two hands' letters.

const seg = (a: Point, b: Point) => lineStroke(a, b, 14);
/** Block capitals as a hand prints them: N and V one stroke each, A two. */
const N = (x: number, y: number, h = 30) => [seg({ x, y: y + h }, { x, y }).concat(seg({ x, y }, { x: x + 18, y: y + h }).slice(1), seg({ x: x + 18, y: y + h }, { x: x + 18, y }).slice(1))];
const A = (x: number, y: number, h = 30) => [seg({ x, y: y + h }, { x: x + 10, y }).concat(seg({ x: x + 10, y }, { x: x + 20, y: y + h }).slice(1)), seg({ x: x + 4, y: y + h * 0.6 }, { x: x + 16, y: y + h * 0.6 })];
const V = (x: number, y: number, h = 30) => [seg({ x, y }, { x: x + 10, y: y + h }).concat(seg({ x: x + 10, y: y + h }, { x: x + 20, y }).slice(1))];
/** N, A, V printed side by side on one line: four strokes, one word. */
const NAV = (x: number, y: number) => [...N(x, y), ...A(x + 26, y), ...V(x + 54, y)];

/** The word a letter stands in on this board, if any. */
function wordHolding(s: Session, letter: string): string | undefined {
  const st = s.getState();
  return st.contentIds.find((id) => { const n = st.nodes.get(id)!; return isWord(n) && lettersOf(n).includes(letter); });
}

/** Print NAV at (x, y), a stroke every 400 ms from `t`: its letters, and the word they gathered into. */
function print(s: Session, x: number, y: number, t: number) {
  const letters = NAV(x, y).map((pts, i) => s.addStroke(pts, t + 400 * i));
  return { letters, word: wordHolding(s, letters[0])! };
}

describe('a word is made by whoever wrote its letters (V1-PLAN L2g)', () => {
  it('the writer\'s label on her own word survives every replay, and the word is hers on every board', () => {
    const ann = hand('ann');
    const { letters, word } = print(ann, 100, 100, 1000);
    expect(lettersOf(ann.getState().nodes.get(word)!)).toEqual(letters);
    expect(ann.label({ nodeId: word, text: 'nav', at: 3000 })).toBe(word);
    const annLog = ann.getEvents().slice();
    // Bob has drawn before her, so merging his log moves every one of her events.
    const bob = hand('bob');
    bob.addStroke(box(0, 300, 100, 60), 500, undefined, 1, { content: true });
    const bobLog = bob.getEvents().slice();

    const boards: [string, Record<string, typeof annLog>, string][] = [
      ['ann', { ann: annLog }, LOCAL_PARTICIPANT],
      ['ann', { ann: annLog, bob: bobLog }, LOCAL_PARTICIPANT],
      ['bob', { ann: annLog, bob: bobLog }, 'participant:hand:ann'],
      ['cleo', { ann: annLog, bob: bobLog }, 'participant:hand:ann'],
      ['cleo', { bob: bobLog, ann: annLog }, 'participant:hand:ann'],
    ];
    for (const [me, logs, maker] of boards) {
      const board = hand(me);
      board.load(mergeLogs(logs, { me }));
      const s = board.getState();
      const node = s.nodes.get(word)!;
      expect(isWord(node)).toBe(true);
      expect(lettersOf(node)).toEqual(letters);
      // Her letters were always hers on every board; the word they make is too.
      for (const id of letters) expect(authorOf(s.nodes.get(id)!)).toBe(maker);
      expect(authorOf(node)).toBe(maker);
      expect(labelOf(node)?.text).toBe('nav');
      expect(labelOf(node)?.source).toBe(maker);
    }
  });

  it('another hand\'s label on her word is refused at the door, with the reason, and never enters the log', () => {
    const ann = hand('ann');
    const { word } = print(ann, 100, 100, 1000);
    ann.label({ nodeId: word, text: 'nav', at: 3000 });

    const bob = hand('bob');
    bob.load(mergeLogs({ ann: ann.getEvents().slice(), bob: [] }, { me: 'bob' }));
    const before = bob.getEvents().length;
    expect(bob.label({ nodeId: word, text: 'mine now', at: 4000 })).toBeNull();

    const stale = bob.getState().staleResult!;
    expect(stale.what).toBe('label');
    expect(stale.reason).toBe('not-your-ink');
    expect(stale.nodeId).toBe(word);
    expect(stale.detail).toContain('ann');
    expect(stale.detail).toContain('your own ink');
    expect(bob.getEvents().length).toBe(before);
    // Hers stands, and is still hers.
    expect(labelOf(bob.getState().nodes.get(word)!)!.text).toBe('nav');
    expect(labelOf(bob.getState().nodes.get(word)!)!.source).toBe('participant:hand:ann');
  });

  it('a label another hand wrote on her word is dropped on every replay — his own board\'s too — and hers stands', () => {
    // Before this unit Bob's own door let it through, so a log of his can
    // carry it; the apply path is what has to hold the rule on every board.
    const ann = hand('ann');
    const { word } = print(ann, 100, 100, 1000);
    ann.label({ nodeId: word, text: 'nav', at: 3000 });
    const annLog = ann.getEvents().slice();
    const bobLog = [{ type: 'label' as const, nodeId: word, text: 'mine now', at: 4000 }];

    for (const me of ['ann', 'bob', 'cleo']) {
      const board = hand(me);
      board.load(mergeLogs({ ann: annLog, bob: bobLog }, { me }));
      const node = board.getState().nodes.get(word)!;
      expect(labelsOf(node).map((l) => l.text)).toEqual(['nav']);
      expect(labelOf(node)!.source).toBe(me === 'ann' ? LOCAL_PARTICIPANT : 'participant:hand:ann');
    }
  });

  it('letters of two hands never gather into one word: hers and his, interleaved on one band', () => {
    // She prints an N, he an A right beside it, she a V beside that: one line,
    // a letter's gap apart, each within the window of the one before. Merged by
    // time, every board reads exactly a run of letters — but two hands wrote it.
    const ann = hand('ann'), bob = hand('bob');
    const [n] = N(100, 100), [a1, a2] = A(126, 100), [v] = V(154, 100);
    const hers = [ann.addStroke(n, 1000)];
    const his = [bob.addStroke(a1, 1400), bob.addStroke(a2, 1800)];
    hers.push(ann.addStroke(v, 2200));
    const whose = (id: string) => (hers.includes(id) ? 'ann' : his.includes(id) ? 'bob' : id);

    for (const me of ['ann', 'bob', 'cleo']) {
      const board = hand(me);
      board.load(mergeLogs({ ann: ann.getEvents().slice(), bob: bob.getEvents().slice() }, { me }));
      const s = board.getState();
      for (const w of s.contentIds.map((id) => s.nodes.get(id)!).filter(isWord)) {
        expect([...new Set(lettersOf(w).map(whose))]).toHaveLength(1);
        for (const id of lettersOf(w)) expect(authorOf(s.nodes.get(id)!)).toBe(authorOf(w));
      }
      // Every letter still stands on the board, in a word of its own hand's or alone.
      const standing = s.contentIds.flatMap((id) => { const x = s.nodes.get(id)!; return isWord(x) ? lettersOf(x) : [id]; });
      expect(standing.sort()).toEqual([...hers, ...his].sort());
    }
  });

  it('two hands printing at once each make their own word, whole: the merge interleaves them, and neither breaks the other\'s run', () => {
    // The trap. Her letters come in quick succession from HER hand, but the
    // merge interleaves the hands by time, so the mark just before her next
    // letter on the board is his. Taken for the last letter of her run, it
    // broke her word — here into nothing at all, since his is a line below.
    const ann = hand('ann'), bob = hand('bob');
    const hers = print(ann, 100, 100, 1000); // at 1000, 1400, 1800, 2200
    const his = print(bob, 100, 400, 1200); // at 1200, 1600, 2000, 2400, a line below
    const boards: [string, string, string][] = [
      ['ann', LOCAL_PARTICIPANT, 'participant:hand:bob'],
      ['bob', 'participant:hand:ann', LOCAL_PARTICIPANT],
      ['cleo', 'participant:hand:ann', 'participant:hand:bob'],
    ];
    for (const [me, hersBy, hisBy] of boards) {
      const board = hand(me);
      board.load(mergeLogs({ ann: ann.getEvents().slice(), bob: bob.getEvents().slice() }, { me }));
      const s = board.getState();
      // Two words, each the one its hand made on its own board: the same id, the same letters.
      expect(s.contentIds).toEqual([hers.word, his.word]);
      expect(lettersOf(s.nodes.get(hers.word)!)).toEqual(hers.letters);
      expect(lettersOf(s.nodes.get(his.word)!)).toEqual(his.letters);
      expect(authorOf(s.nodes.get(hers.word)!)).toBe(hersBy);
      expect(authorOf(s.nodes.get(his.word)!)).toBe(hisBy);
    }
  });

  it('a mark a model drew beside her letters never joins her word: a word is one maker\'s run', () => {
    // One board, no merge: a model's mark is declared content in its own name,
    // and a crossbar it draws inside her run is still its mark, not her letter.
    const s = createSession();
    const model = s.join('agent', 'llm:drawer', 900, 2);
    const [n] = N(100, 100), [a1, a2] = A(126, 100), [v] = V(154, 100);
    const hers = [s.addStroke(n, 1000), s.addStroke(a1, 1400)];
    const its = s.addStroke(a2, 1800, model, 1, { content: true });
    hers.push(s.addStroke(v, 2200));
    expect(wordHolding(s, its)).toBeUndefined();
    const word = wordHolding(s, hers[0])!;
    expect(lettersOf(s.getState().nodes.get(word)!)).toEqual(hers);
    expect(authorOf(s.getState().nodes.get(word)!)).toBe(LOCAL_PARTICIPANT);
    expect(authorOf(s.getState().nodes.get(its)!)).toBe(model);
  });

  it('a board\'s own word is what it always was: made by its own hand, the same edges in the same order', () => {
    // Every word a board gathers from its own letters named the local
    // participant, and still does — so a board's own writing replays node for node.
    for (const s of [createSession(), hand('ann')]) {
      const { letters, word } = print(s, 100, 100, 1000);
      const node = s.getState().nodes.get(word)!;
      expect(lettersOf(node)).toEqual(letters);
      expect(authorOf(node)).toBe(LOCAL_PARTICIPANT);
      expect(node.edges[0]).toEqual({ to: LOCAL_PARTICIPANT, rel: 'made-by' });
      expect(node.edges.map((e) => e.rel)).toEqual(['made-by', 'has-part', 'has-part', 'has-part', 'has-part', 'resembles']);
      expect(s.label({ nodeId: word, text: 'nav', at: 3000 })).toBe(word);
    }
  });
});

// ===== A person is the same person across sittings (V1-PLAN L2i) ============
// A live hand's log is one SITTING — a page load, a process (L1) — named
// `person~suffix` (`sittingName`) and shown under the person's name and colour
// (`handLabel`). But the rules that ask "is this mine?" compared the exact log
// name, so after a reload a person could no longer label the marks they drew
// before it: core refused `not-your-ink` — "that mark was made by john", said
// to john — and the field said *no label — john made this mark*. A reload must
// not make someone a stranger to their own ink.
//
// Those rules compare the PERSON — the log name without its sitting's suffix —
// so every sitting of one person may label that person's marks, on every board,
// and another person's are refused as before. What stays per sitting: the logs,
// their participants, ids and numbering (L1), and gestures (L2h,
// gesture-hands.test.ts). Attribution was already the person's and is unchanged.

/** A hand's own log: the session's unstamped events, as a tab sends them. */
const own = (s: Session) => s.getEvents().filter((e) => !e.by);
/** The participant a log's events are attributed to on a board that is not its own. */
const handIdOf = (logName: string) => 'participant:hand:' + logName.replace(/[^A-Za-z0-9._-]+/g, '_');

describe('a person is the same person across sittings (V1-PLAN L2i)', () => {
  it('after a reload, john labels a mark he drew before it: accepted at the door, and it stands on every board', () => {
    const a1 = hand('john~a1');
    const box1 = a1.addStroke(box(0, 0, 100, 60), 1000, undefined, 1, { content: true });
    // The reload: a new sitting with no memory of the first, which hears the room.
    const b2 = hand('john~b2');
    b2.load(mergeLogs({ 'john~a1': own(a1), 'john~b2': [] }, { me: 'john~b2' }));
    // Attribution is what it was: the mark is the earlier sitting's, shown as john.
    const before = b2.getState();
    expect(authorOf(before.nodes.get(box1)!)).toBe(handIdOf('john~a1'));
    expect(wordOf(before.nodes.get(handIdOf('john~a1'))!)).toBe('john');

    expect(b2.label({ nodeId: box1, text: 'inlet', at: 2000 })).toBe(box1);
    expect(b2.getState().staleResult).toBeNull();
    expect(labelOf(b2.getState().nodes.get(box1)!)).toEqual({ text: 'inlet', source: LOCAL_PARTICIPANT, at: 2000 });
    // Still the earlier sitting's mark: the rule changed, not whose it is.
    expect(authorOf(b2.getState().nodes.get(box1)!)).toBe(handIdOf('john~a1'));

    // Every board replays it the same: the earlier sitting's own (a tab still
    // open), the later one's, and another person's — the logs in either order.
    const boards: [string, Record<string, SessionEvent[]>, string][] = [
      ['john~a1', { 'john~a1': own(a1), 'john~b2': own(b2) }, handIdOf('john~b2')],
      ['john~b2', { 'john~a1': own(a1), 'john~b2': own(b2) }, LOCAL_PARTICIPANT],
      ['fern~x1', { 'john~a1': own(a1), 'john~b2': own(b2) }, handIdOf('john~b2')],
      ['fern~x1', { 'john~b2': own(b2), 'john~a1': own(a1) }, handIdOf('john~b2')],
    ];
    for (const [me, logs, writer] of boards) {
      const board = hand(me);
      board.load(mergeLogs(logs, { me }));
      const node = board.getState().nodes.get(box1)!;
      expect(labelOf(node)?.text).toBe('inlet');
      expect(labelOf(node)?.source).toBe(writer);
    }
  });

  it('what he drew in either sitting is his in the other: the earlier tab, still open, labels what the later one drew', () => {
    // Two tabs of one person, both open: each may put a word on the other's ink.
    const a1 = hand('john~a1'), b2 = hand('john~b2');
    const first = a1.addStroke(box(0, 0, 100, 60), 1000, undefined, 1, { content: true });
    const second = b2.addStroke(box(300, 0, 100, 60), 1100, undefined, 1, { content: true });
    a1.load(mergeLogs({ 'john~a1': own(a1), 'john~b2': own(b2) }, { me: 'john~a1' }));
    b2.load(mergeLogs({ 'john~a1': own(a1), 'john~b2': own(b2) }, { me: 'john~b2' }));
    expect(a1.label({ nodeId: second, text: 'outlet', at: 2000 })).toBe(second);
    expect(b2.label({ nodeId: first, text: 'inlet', at: 2001 })).toBe(first);
    for (const me of ['john~a1', 'john~b2', 'fern~x1']) {
      const board = hand(me);
      board.load(mergeLogs({ 'john~a1': own(a1), 'john~b2': own(b2) }, { me }));
      const s = board.getState();
      expect(labelOf(s.nodes.get(first)!)?.text).toBe('inlet');
      expect(labelOf(s.nodes.get(second)!)?.text).toBe('outlet');
    }
  });

  it('a thing he blessed and a word he wrote in one sitting are his to label in the next', () => {
    const a1 = hand('john~a1');
    const { artifact } = pairOf(a1, 0, 1000, 'pair');
    const { word } = print(a1, 100, 300, 2000);
    const b2 = hand('john~b2');
    b2.load(mergeLogs({ 'john~a1': own(a1), 'john~b2': [] }, { me: 'john~b2' }));
    expect(authorOf(b2.getState().nodes.get(artifact)!)).toBe(handIdOf('john~a1'));
    expect(authorOf(b2.getState().nodes.get(word)!)).toBe(handIdOf('john~a1'));
    expect(b2.label({ nodeId: artifact, text: 'inlet', at: 5000 })).toBe(artifact);
    expect(b2.label({ nodeId: word, text: 'nav', at: 5001 })).toBe(word);
    for (const me of ['john~a1', 'john~b2', 'fern~x1']) {
      const board = hand(me);
      board.load(mergeLogs({ 'john~a1': own(a1), 'john~b2': own(b2) }, { me }));
      const s = board.getState();
      expect(labelOf(s.nodes.get(artifact)!)?.text).toBe('inlet');
      expect(labelOf(s.nodes.get(word)!)?.text).toBe('nav');
    }
  });

  it('another person is refused as before — at the door with whose it is, and on replay on every board', () => {
    const a1 = hand('john~a1');
    const box1 = a1.addStroke(box(0, 0, 100, 60), 1000, undefined, 1, { content: true });
    // fern, and johnny — whose name only begins like his — are other people.
    for (const other of ['fern~x1', 'johnny~z1']) {
      const s = hand(other);
      s.load(mergeLogs({ 'john~a1': own(a1), [other]: [] }, { me: other }));
      const before = s.getEvents().length;
      expect(s.label({ nodeId: box1, text: 'mine now', at: 2000 })).toBeNull();
      const stale = s.getState().staleResult!;
      expect(stale.reason).toBe('not-your-ink');
      expect(stale.detail).toContain('made by john');
      expect(s.getEvents().length).toBe(before);
    }
    // A log of hers that carries one anyway is dropped on every board — his two sittings', hers, a third's.
    const forged = [{ type: 'label' as const, nodeId: box1, text: 'mine now', at: 2000 }];
    for (const me of ['john~a1', 'john~b2', 'fern~x1', 'cleo~c1']) {
      const board = hand(me);
      board.load(mergeLogs({ 'john~a1': own(a1), 'fern~x1': forged }, { me }));
      expect(labelOf(board.getState().nodes.get(box1)!)).toBeUndefined();
    }
    // And a later sitting of his may not label hers.
    const fern = hand('fern~x1');
    const hers = fern.addStroke(box(300, 0, 100, 60), 1100, undefined, 1, { content: true });
    const b2 = hand('john~b2');
    b2.load(mergeLogs({ 'john~a1': own(a1), 'fern~x1': own(fern), 'john~b2': [] }, { me: 'john~b2' }));
    expect(b2.label({ nodeId: hers, text: 'mine now', at: 3000 })).toBeNull();
    expect(b2.getState().staleResult!.reason).toBe('not-your-ink');
    expect(b2.getState().staleResult!.detail).toContain('made by fern');
  });

  it('what stays per sitting: two logs, two participants, and each its own numbering — the rule merges no one', () => {
    const a1 = hand('john~a1');
    const x = a1.addStroke(box(0, 0, 100, 60), 1000, undefined, 1, { content: true });
    const b2 = hand('john~b2');
    b2.load(mergeLogs({ 'john~a1': own(a1), 'john~b2': [] }, { me: 'john~b2' }));
    const y = b2.addStroke(box(300, 0, 100, 60), 2000, undefined, 1, { content: true });
    // Each sitting numbers its own marks, from its own name: no number is reused.
    expect(x).toBe('stroke:john~a1:1');
    expect(y).toBe('stroke:john~b2:1');
    const fern = hand('fern~x1');
    fern.load(mergeLogs({ 'john~a1': own(a1), 'john~b2': own(b2), 'fern~x1': [] }, { me: 'fern~x1' }));
    const s = fern.getState();
    // Two sittings are two hands on her board, both shown as john.
    expect(s.participants).toContain(handIdOf('john~a1'));
    expect(s.participants).toContain(handIdOf('john~b2'));
    expect(authorOf(s.nodes.get(x)!)).toBe(handIdOf('john~a1'));
    expect(authorOf(s.nodes.get(y)!)).toBe(handIdOf('john~b2'));
    expect(wordOf(s.nodes.get(handIdOf('john~a1'))!)).toBe('john');
    expect(wordOf(s.nodes.get(handIdOf('john~b2'))!)).toBe('john');
  });

  it('the field\'s question — is this mine? — is the door\'s: every sitting of the person, and nobody else', () => {
    const a1 = hand('john~a1'), fern = hand('fern~x1');
    const before = a1.addStroke(box(0, 0, 100, 60), 1000, undefined, 1, { content: true });
    const hers = fern.addStroke(box(300, 0, 100, 60), 1100, undefined, 1, { content: true });
    const b2 = hand('john~b2');
    b2.load(mergeLogs({ 'john~a1': own(a1), 'fern~x1': own(fern), 'john~b2': [] }, { me: 'john~b2' }));
    const after = b2.addStroke(box(600, 0, 100, 60), 2000, undefined, 1, { content: true });
    const model = b2.join('agent', 'llm:drawer', 2100, 2);
    const its = b2.addStroke(box(900, 0, 100, 60), 2200, model, 1, { content: true });
    // This board's own hand: both of john's sittings' marks, not fern's, not a model's.
    expect([before, after, hers, its].map((id) => b2.isMine(id))).toEqual([true, true, false, false]);
    // Asked for another participant: fern's is hers alone, and the model's is its own.
    expect([before, after, hers, its].map((id) => b2.isMine(id, handIdOf('fern~x1')))).toEqual([false, false, true, false]);
    expect([before, after, hers, its].map((id) => b2.isMine(id, model))).toEqual([false, false, false, true]);
    expect(b2.isMine('stroke:nope')).toBe(false);
    // And the door agrees, mark by mark.
    for (const id of [before, after, hers, its]) {
      const probe = hand('john~b2');
      probe.load(b2.getEvents().slice());
      expect(probe.label({ nodeId: id, text: 'x', at: 3000 }) === id).toBe(b2.isMine(id));
    }
  });

  it('a board never told what its log is called compares hands exactly, as it always did', () => {
    // An unnamed board is no sitting of anyone: nothing of another log's is its own.
    const a1 = hand('john~a1');
    const box1 = a1.addStroke(box(0, 0, 100, 60), 1000, undefined, 1, { content: true });
    const bare = createSession();
    bare.load(mergeLogs({ 'john~a1': own(a1), me: [] }, { me: 'me' }));
    expect(bare.label({ nodeId: box1, text: 'inlet', at: 2000 })).toBeNull();
    expect(bare.getState().staleResult!.reason).toBe('not-your-ink');
    // Its own ink is still its own.
    const mine = bare.addStroke(box(300, 0, 100, 60), 2100, undefined, 1, { content: true });
    expect(bare.label({ nodeId: mine, text: 'outlet', at: 2200 })).toBe(mine);
  });
});

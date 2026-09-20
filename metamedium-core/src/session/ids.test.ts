// Ids per hand (SURFACE-v10-PLAN D8) — a node id is a function of the EVENT
// that made it, not of where that event landed in the merge.
//
// The defect this pins: `nextId` counted node-minting events in the MERGED
// log, so two participants who merged different sets of logs gave the same
// event different ids. Everything that refers to a mark by id — the MCP
// hand's `canvas_say`, `canvas_propose`, `canvas_transcribe`, a model's
// proposals in its own log — landed on whatever mark happened to hold that
// number in the reader's board. Observed in real use: five sentences about
// five boxes attached themselves to five unrelated marks.

import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG, type SessionEvent } from './session';
import { mergeLogs } from '../store/merge';
import { rectStroke, circleStroke, checkStroke } from '../test/strokes';
import { boundsOf, wordOf } from './nodes';

const named = (logName: string) => createSession({ ...DEFAULT_SESSION_CONFIG, logName });

/** Where a mark actually is — the witness that an id still names the same marks. */
function whereIs(s: ReturnType<typeof createSession>, id: string) {
  const n = s.getState().nodes.get(id);
  const b = n && boundsOf(n);
  return b ? `${Math.round(b.minX)},${Math.round(b.minY)}` : null;
}

/** Three marks and the check that takes them up: a definition, in one hand. */
function definition(s: ReturnType<typeof createSession>, x: number, t: number, name: string) {
  const box = s.addStroke(rectStroke(x, 100, 200, 120), t);
  s.addStroke(circleStroke(x + 100, 160, 200), t + 100);
  s.addStroke(checkStroke(x + 320, 150), t + 200);
  const artifact = s.bless({ summonId: s.getState().summon!.id, name, at: t + 300 })!;
  return { box, artifact };
}

describe('ids per hand — an id is a function of the event', () => {
  it('two logs, two merge orders, the same ids', () => {
    // Bob draws his definition before Ada draws hers, so merging his log in
    // moves every one of her events four places down the replay. That move is
    // exactly what used to renumber her marks. (The two hands take their own
    // marks up in their own time: a check reads the board it lands on, and
    // interleaving two hands' GESTURES is a question about the gesture
    // grammar, not about ids.)
    const ada = named('ada');
    const bob = named('bob~t1');
    const b = definition(bob, 900, 400, 'bubble');
    const a = definition(ada, 100, 1000, 'molecule');
    const adaLog = ada.getEvents().slice();
    const bobLog = bob.getEvents().slice();

    // The merge is the same whoever runs it, and whoever they are is not an
    // input to an id: both hands and a third reader see one board.
    for (const me of ['ada', 'bob~t1', 'cleo']) {
      const canvas = named(me);
      canvas.load(mergeLogs({ ada: adaLog, 'bob~t1': bobLog }, { me }));
      expect(whereIs(canvas, a.box)).toBe(whereIs(ada, a.box));
      expect(whereIs(canvas, b.box)).toBe(whereIs(bob, b.box));
      expect(wordOf(canvas.getState().nodes.get(a.artifact)!)).toBe('molecule');
      expect(wordOf(canvas.getState().nodes.get(b.artifact)!)).toBe('bubble');
    }

    // And position is not an input either, at all: the whole logs back to
    // back, either way round. Each log keeps its own order, so each hand's
    // causality holds, but every event of one of them has moved. What the
    // board MEANS depends on the order — a check landing on a board that
    // already holds another hand's marks is reading a different board — so
    // this asks only the question at issue: does the event still mint the id
    // it minted, and does that id still name the mark it named?
    const stamped = bobLog.map((e) => ({ ...e, by: 'bob~t1' }));
    const orders: SessionEvent[][] = [[...adaLog, ...stamped], [...stamped, ...adaLog]];
    for (const log of orders) {
      const canvas = named('cleo');
      canvas.load(JSON.parse(JSON.stringify(log)));
      expect(whereIs(canvas, a.box)).toBe(whereIs(ada, a.box));
      expect(whereIs(canvas, b.box)).toBe(whereIs(bob, b.box));
    }

    // And the ids are the writers' own, unqualified by whoever is reading.
    expect(a.box).toBe('stroke:ada:1');
    expect(b.box).toBe('stroke:bob~t1:1');
  });

  it('the counter gets that wrong — the defect, pinned', () => {
    // The same two hands with no names: both fall back to the counter over
    // the merged replay, which is the old rule exactly. Ada's box is `stroke:1`
    // on her own board and something else entirely on the merged one, so a
    // sentence she sends about `stroke:1` lands on Bob's mark. This is the
    // failure the named case above no longer has; it stays here as the
    // witness, and it is what every surface still does until it says its name.
    const ada = createSession();
    const bob = createSession();
    definition(bob, 900, 400, 'bubble');
    const a = definition(ada, 100, 1000, 'molecule');
    const canvas = createSession();
    canvas.load(mergeLogs({ ada: ada.getEvents().slice(), bob: bob.getEvents().slice() }, { me: 'cleo' }));
    expect(a.box).toBe('stroke:1');
    expect(whereIs(ada, a.box)).not.toBeNull();
    expect(whereIs(canvas, a.box)).not.toBe(whereIs(ada, a.box));
  });

  it('a reader who holds only some of the logs still names the same marks', () => {
    // The merge SET is the other half of the defect: Ada alone, Ada and Bob,
    // Ada and Bob and a model's log are three different replays.
    const ada = named('ada');
    const { box, artifact } = definition(ada, 100, 1000, 'molecule');
    const bob = named('bob');
    bob.addStroke(circleStroke(900, 900, 60), 500);
    const qwen = named('qwen3:8b');
    const pid = qwen.join('agent', 'qwen3:8b', 600, 1);

    const logs = { ada: ada.getEvents().slice(), bob: bob.getEvents().slice(), 'qwen3:8b': qwen.getEvents().slice() };
    for (const subset of [['ada'], ['ada', 'bob'], ['ada', 'bob', 'qwen3:8b']]) {
      const some = Object.fromEntries(subset.map((k) => [k, logs[k as keyof typeof logs]]));
      const canvas = named('reader');
      canvas.load(mergeLogs(some, { me: 'reader' }));
      expect(whereIs(canvas, box)).toBe(whereIs(ada, box));
      expect(wordOf(canvas.getState().nodes.get(artifact)!)).toBe('molecule');
    }

    // A model's participant id is its own log's too, so its proposals in its
    // own file name the participant everyone else sees (the merge gap noted
    // in CLAUDE.md's live-logs section).
    expect(pid).toBe('participant:qwen3:8b:1');
  });

  it('a sentence said about another hand’s mark lands on that mark', () => {
    // The failure in the wild, end to end: the hand reads the room, says
    // something about a mark it found there, and its log goes back into a
    // room holding a third log it has never seen.
    const ada = named('ada');
    const boxes = [0, 1, 2].map((i) => ada.addStroke(rectStroke(100 + i * 300, 100, 200, 120), 1000 + i * 100));

    const hand = named('claude');
    hand.load(mergeLogs({ ada: ada.getEvents().slice() }, { me: 'claude' }));
    const pid = hand.join('agent', 'claude', 2000, 2);
    hand.answer({ participantId: pid, question: 'what is this?', text: 'the middle box', aboutIds: [boxes[1]], at: 2100 });

    const bob = named('bob');
    bob.addStroke(circleStroke(2000, 2000, 60), 1050);

    const canvas = named('john~a1b2');
    canvas.load(mergeLogs({
      ada: ada.getEvents().slice(),
      bob: bob.getEvents().slice(),
      claude: hand.getEvents().filter((e) => !e.by),
    }, { me: 'john~a1b2' }));

    const st = canvas.getState();
    expect(st.explanations).toHaveLength(1);
    const about = st.nodes.get(st.explanations[0])!.edges.filter((e) => e.rel === 'about').map((e) => e.to);
    expect(about).toEqual([boxes[1]]);
    expect(whereIs(canvas, boxes[1])).toBe(whereIs(ada, boxes[1]));
  });

  it('a held log — written before this rule — opens with the ids it always had', () => {
    // Every event of it carries no authorship, which is what a log written
    // before today looks like. Its own events REFER to these ids (the bless
    // names its summon, the answer names its marks), so anything that
    // renumbered them would break the log from the inside.
    const old = createSession();
    const a = old.addStroke(rectStroke(100, 100, 200, 120), 1000);
    const b = old.addStroke(rectStroke(340, 100, 200, 120), 1100);
    const pid = old.join('agent', 'llm:recorded', 1300, 1);
    old.addStroke(circleStroke(320, 160, 300), 2000);
    old.addStroke(checkStroke(650, 160), 2500);
    const summonId = old.getState().summon!.id;
    const artifact = old.bless({ summonId, name: 'pair', at: 3000 })!;
    const answer = old.answer({ participantId: pid, question: 'why?', text: 'two boxes', aboutIds: [a, b], at: 3500 })!;
    const held = JSON.parse(JSON.stringify(old.getEvents())) as SessionEvent[];

    // No stamps anywhere: this is byte for byte the log the old code wrote.
    expect(held.some((e) => e.origin !== undefined || e.seq !== undefined)).toBe(false);
    // The numbering is the counter's, pinned to what the rule handed out
    // before the change — including the three suggestions the summon minted
    // between `summon:6` and `artifact:10`.
    expect([a, b, pid, summonId, artifact, answer])
      .toEqual(['stroke:1', 'stroke:2', 'participant:3', 'summon:6', 'artifact:10', 'explanation:11']);

    // And it opens as itself, in a session that has a name of its own.
    const reopened = named('john~a1b2');
    reopened.load(held);
    expect(reopened.getState().artifacts).toEqual([artifact]);
    expect(wordOf(reopened.getState().nodes.get(artifact)!)).toBe('pair');
    expect(reopened.getState().explanations).toEqual([answer]);
    expect(whereIs(reopened, a)).toBe(whereIs(old, a));

    // Drawing on goes on under the new rule; the held ids are untouched.
    const fresh = reopened.addStroke(rectStroke(100, 500, 200, 120), 4000);
    expect(fresh).toBe('stroke:john~a1b2:1');
    expect(whereIs(reopened, a)).toBe(whereIs(old, a));
  });

  it('a session that was never told its name keeps the counter, byte for byte', () => {
    // Every surface that has not been taught to say its log's name behaves
    // exactly as it did, and writes exactly the log it did.
    const s = createSession();
    expect(s.logName()).toBeNull();
    expect(s.addStroke(rectStroke(100, 100, 200, 120), 1000)).toBe('stroke:1');
    expect(s.addStroke(circleStroke(600, 160, 60), 2000)).toBe('stroke:2');
    expect(Object.keys(s.getEvents()[0]).sort()).toEqual(['at', 'content', 'participantId', 'points', 'scale', 'type']);
  });

  it('one event minting two nodes of one family numbers them after the first', () => {
    const s = named('ada');
    s.addStroke(rectStroke(100, 100, 200, 120), 1000);
    s.addStroke(circleStroke(200, 160, 200), 1100);
    s.addStroke(checkStroke(420, 150), 1200);
    const summon = s.getState().summon!;
    expect(summon.id).toBe('summon:ada:3');
    expect(summon.suggestions.map((g) => g.id)).toEqual(['sug:ada:3', 'sug:ada:3.2', 'sug:ada:3.3']);
    // Every id on the board is still its own.
    const keys = [...s.getState().nodes.keys()];
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('two log names that differ only in punctuation are two hands', () => {
    // The name goes into the id as it is. A scrub that collapsed both of
    // these to `qwen3_8b` would hand them one another's marks — the very
    // failure this change exists to end. It needs no scrub: the number is the
    // last colon-separated field, so a name that carries colons of its own
    // still reads back as itself.
    const a = named('qwen3:8b');
    const b = named('qwen3-8b');
    expect(a.addStroke(rectStroke(100, 100, 200, 120), 1000)).toBe('stroke:qwen3:8b:1');
    expect(b.addStroke(rectStroke(900, 900, 200, 120), 1000)).toBe('stroke:qwen3-8b:1');
    const canvas = named('reader');
    canvas.load(mergeLogs({ 'qwen3:8b': a.getEvents().slice(), 'qwen3-8b': b.getEvents().slice() }, { me: 'reader' }));
    expect(canvas.getState().contentIds).toHaveLength(2);
  });

  it('undo does not hand a dropped event’s number to the next one', () => {
    // A peer that already heard the first would otherwise be holding two
    // different marks under one id.
    const s = named('ada');
    const first = s.addStroke(rectStroke(100, 100, 200, 120), 1000);
    s.undo();
    const second = s.addStroke(circleStroke(900, 900, 60), 2000);
    expect(second).not.toBe(first);
    expect([first, second]).toEqual(['stroke:ada:1', 'stroke:ada:2']);
  });

  it('a board reopened in a new tab renumbers nothing, and writes on past the log', () => {
    // The tab's name carries a per-tab suffix, so every reload is a new `me`.
    const first = named('john~a1b2');
    const box = first.addStroke(rectStroke(100, 100, 200, 120), 1000);
    const log = JSON.parse(JSON.stringify(first.getEvents())) as SessionEvent[];

    const next = named('john~z9y8');
    next.load(mergeLogs({ 'john~a1b2': log }, { me: 'john~z9y8' }));
    expect(next.getState().nodes.has(box)).toBe(true);
    expect(next.addStroke(circleStroke(900, 900, 60), 2000)).toBe('stroke:john~z9y8:1');

    // A host that never says a name picks the log's own name back up, so an
    // autosave reopened in place goes on being one log — and goes on past the
    // highest number it already used rather than reissuing one.
    const anonymous = createSession();
    anonymous.load(log);
    expect(anonymous.logName()).toBe('john~a1b2');
    expect(anonymous.addStroke(circleStroke(900, 900, 60), 2000)).toBe('stroke:john~a1b2:2');
  });

  it('a name said out loud outranks the one the log remembers', () => {
    const first = named('john~a1b2');
    first.addStroke(rectStroke(100, 100, 200, 120), 1000);
    const said = createSession();
    said.setLogName('john~c3d4');
    said.load(JSON.parse(JSON.stringify(first.getEvents())));
    expect(said.logName()).toBe('john~c3d4');
    expect(said.addStroke(circleStroke(900, 900, 60), 2000)).toBe('stroke:john~c3d4:1');
  });

  it('a garbled stamp falls back to the counter rather than minting a blurred id', () => {
    // A log is read, not trusted (DATA-1). An empty name or a fractional
    // number would run the two forms into each other.
    const events: SessionEvent[] = [
      { type: 'stroke', points: rectStroke(100, 100, 200, 120), at: 1000, origin: '', seq: 1 },
      { type: 'stroke', points: circleStroke(900, 900, 60), at: 2000, origin: 'ada', seq: 1.5 },
      { type: 'stroke', points: rectStroke(100, 500, 200, 120), at: 3000, origin: 'ada', seq: 2 },
    ];
    const s = createSession();
    s.load(events);
    expect(s.getState().contentIds).toEqual(['stroke:1', 'stroke:2', 'stroke:ada:2']);
  });
});

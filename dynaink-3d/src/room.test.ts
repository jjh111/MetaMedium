// The room, headless: two hands on one hub, no relay and no browser.
//
// What is worth pinning is not the transport — that is core's, and core tests
// it — but the two things G5 adds: another hand's marks arrive as THEIRS, and a
// brief parked in the room comes back answered through the same channel.

/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { boundsOf, createSession, LocalHub, LOCAL_PARTICIPANT, topInterpretation, type SessionEvent } from '@dynaink/core';
import { joinRoom, otherHand, refusalOf, saidInRoom, splitPrompt, BRIEF_QUESTION, legacySeatTraffic } from './room';
import { decodeBoard } from './export';
import { createLog } from './log';
import { foundation } from './plane';

/**
 * A seat exchange written by the pairing this file's `brief`/id rule replaced —
 * recorded once, by the code as it stood before L2a, and never regenerated
 * (`fixtures/README.md` says how). As a module rather than off the disk, the
 * way `decide.test.ts` reads John's boards.
 */
const BEFORE_IDS = import.meta.glob('../fixtures/seat-before-ids.mm.log', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

/** Let the hub's microtask deliveries and the merges that follow them settle. */
const settle = async (rounds = 8) => {
  for (let i = 0; i < rounds; i++) await new Promise((r) => setTimeout(r, 0));
};

const box = (x: number, y: number, w: number, h: number) => {
  const corners = [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
    { x, y },
  ];
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < corners.length - 1; i++)
    for (let s = 0; s < 20; s++) {
      const t = s / 20;
      out.push({
        x: corners[i].x + (corners[i + 1].x - corners[i].x) * t,
        y: corners[i].y + (corners[i + 1].y - corners[i].y) * t,
      });
    }
  out.push(corners[0]);
  return out;
};

describe('two hands in one room', () => {
  it("another hand's stroke arrives stamped `by`, and reads as its own mark", async () => {
    const hub = new LocalHub();
    const mine = createSession();
    const theirs = createSession();
    const a = joinRoom({ session: mine, room: 'r', transport: hub.connect(), name: 'john' });
    const b = joinRoom({ session: theirs, room: 'r', transport: hub.connect(), name: 'claude' });
    await settle();

    theirs.addStroke(box(0, 0, 120, 80), Date.now(), undefined, 1, { content: true });
    await settle();

    const s = mine.getState();
    const ids = s.contentIds;
    expect(ids.length).toBe(1);
    const node = s.nodes.get(ids[0])!;
    // Read by the shape rung like anyone's — a hand's mark is a mark.
    expect(topInterpretation(node)).toBe('rectangle');
    // And it is THEIRS: attributed to a participant of their log's name, made
    // on first sight, never to the reader's own local participant.
    const made = node.edges.find((e) => e.rel === 'made-by')!;
    expect(made.to).not.toBe(LOCAL_PARTICIPANT);
    expect(made.to).toMatch(/^participant:hand:claude/);
    a.close();
    b.close();
  });

  it('my own marks stay mine, and are not doubled by the merge', async () => {
    const hub = new LocalHub();
    const mine = createSession();
    const theirs = createSession();
    const a = joinRoom({ session: mine, room: 'r', transport: hub.connect(), name: 'john' });
    const b = joinRoom({ session: theirs, room: 'r', transport: hub.connect(), name: 'claude' });
    await settle();

    mine.addStroke(box(0, 0, 100, 60), Date.now(), undefined, 1, { content: true });
    await settle();
    mine.addStroke(box(200, 0, 100, 60), Date.now() + 1, undefined, 1, { content: true });
    await settle();

    // Two marks here, not four: my log is the session's own unstamped events,
    // never the room's copy of it.
    expect(mine.getState().contentIds.length).toBe(2);
    expect(theirs.getState().contentIds.length).toBe(2);
    const seen = theirs.getState();
    for (const id of seen.contentIds) {
      const made = seen.nodes.get(id)!.edges.find((e) => e.rel === 'made-by')!;
      expect(made.to).toMatch(/^participant:hand:john/);
    }
    a.close();
    b.close();
  });
});

describe('ids that hold in the room (DIRECTOR-PLAN-W2 L1)', () => {
  it('an undo reaches the other hand — the log shrank, so the whole of it is sent', async () => {
    const hub = new LocalHub();
    const mine = createSession();
    const room = joinRoom({ session: mine, room: 'r', transport: hub.connect(), name: 'john' });
    const hand = otherHand(hub.connect(), 'claude', 'r');
    await settle();
    mine.addStroke(box(0, 0, 100, 60), Date.now(), undefined, 1, { content: true });
    await settle();
    mine.addStroke(box(200, 0, 100, 60), Date.now() + 1, undefined, 1, { content: true });
    await settle();
    expect(hand.session.getState().contentIds.length).toBe(2);
    mine.undo();
    await settle();
    // Counting what was sent could not say this: the log shrank, nothing was
    // sent, and the other hand went on holding the mark.
    expect(hand.session.getState().contentIds.length).toBe(1);
    room.close();
    hand.close();
  });

  it('an undo and a new mark before the next send: the other hand holds the new mark, not the undone one', async () => {
    const hub = new LocalHub();
    const mine = createSession();
    const room = joinRoom({ session: mine, room: 'r', transport: hub.connect(), name: 'john' });
    const hand = otherHand(hub.connect(), 'claude', 'r');
    await settle();
    mine.addStroke(box(0, 0, 100, 60), Date.now(), undefined, 1, { content: true });
    mine.addStroke(box(200, 0, 100, 60), Date.now() + 1, undefined, 1, { content: true });
    await settle();
    mine.undo();
    mine.addStroke(box(400, 200, 60, 60), Date.now() + 2, undefined, 1, { content: true });
    await settle();
    const theirs = hand.session.getState();
    const lefts = theirs.contentIds.map((id) => Math.round(boundsOf(theirs.nodes.get(id)!)!.minX)).sort((a, b) => a - b);
    expect(lefts).toEqual([0, 400]);
    room.close();
    hand.close();
  });

  // Undo is per hand (V1-PLAN L2j): a room's board is every hand's log merged
  // by time, and the top of it may be the other hand's. The shard's undo
  // reads its act — the stroke and the plane held with it, one `at` — off its
  // OWN events, and core's undo takes back its own; the other hand's mark,
  // drawn after, stands on both boards.
  it("undo takes back this tab's act — the stroke and its plane — never the other hand's mark drawn after it", async () => {
    const hub = new LocalHub();
    const log = createLog();
    const room = joinRoom({ session: log.session, room: 'r', transport: hub.connect(), name: 'john' });
    const hand = otherHand(hub.connect(), 'claude', 'r');
    await settle();
    const mine = log.add(box(0, 0, 1.2, 0.8), foundation(), 0.012, 1000);
    await settle();
    const theirs = hand.session.addStroke(box(300, 0, 100, 60), 5000, undefined, 1, { content: true });
    await settle();
    for (const s of [log.session, hand.session]) expect([...s.getState().contentIds].sort()).toEqual([mine, theirs].sort());
    const top = log.session.getEvents()[log.session.getEvents().length - 1];
    expect(top.by).toMatch(/^claude/); // the other hand's mark is last on this tab's board
    log.undo();
    await settle();
    for (const s of [log.session, hand.session]) {
      const st = s.getState();
      expect(st.contentIds).toEqual([theirs]);
      expect(st.nodes.has(mine)).toBe(false);
    }
    // Nothing of this tab's act is left behind — not the plane held on its stroke.
    expect(log.session.getEvents().filter((e) => !e.by)).toEqual([]);
    expect(log.markOf(mine)).toBeNull();
    room.close();
    hand.close();
  });

  it('a tab is one sitting: joining again in the page load keeps the name, and the person is the label', async () => {
    const hub = new LocalHub();
    const first = joinRoom({ session: createSession(), room: 'r', transport: hub.connect(), name: 'john' });
    first.close();
    const again = joinRoom({ session: createSession(), room: 'r', transport: hub.connect(), name: 'john' });
    expect(again.me).toBe(first.me);
    expect(again.label).toBe('john');
    expect(again.me).toMatch(/^john~/);
    again.close();
  });

  it('a second hand under this tab’s own name is a notice here, for the status line', async () => {
    const hub = new LocalHub();
    const room = joinRoom({ session: createSession(), room: 'r', transport: hub.connect(), name: 'john' });
    await settle();
    const twin = otherHand(hub.connect(), room.me, 'r');
    await settle();
    expect(room.notices().some((n) => n.startsWith(`two hands are both called "${room.me}"`))).toBe(true);
    room.close();
    twin.close();
  });

  it('a room older than the relay remembers is a notice here too', async () => {
    let deliver: ((line: unknown) => void) | null = null;
    const quiet = { send: () => undefined, onMessage: (cb: (line: unknown) => void) => { deliver = cb; return () => { deliver = null; }; } };
    const room = joinRoom({ session: createSession(), room: 'r', transport: quiet as never, name: 'john' });
    deliver!({ relay: 'truncated', room: 'r', dropped: 7, kept: 5000 });
    expect(room.notices()).toEqual(['the room is older than the relay remembers — 7 earlier lines are gone']);
    room.close();
  });
});

describe('a brief parked in the room', () => {
  it('waits, is listed by the other hand, and settles with its answer', async () => {
    const hub = new LocalHub();
    const mine = createSession();
    const room = joinRoom({ session: mine, room: 'r', transport: hub.connect(), name: 'john' });
    const hand = otherHand(hub.connect(), 'claude', 'r');
    await settle();

    // Something for the brief to be about: an answer stands beside its subject.
    const markId = mine.addStroke(box(0, 0, 120, 80), Date.now(), undefined, 1, { content: true });
    await settle();

    const asked = room.ask({
      prompt: 'the rules\n\n----\n\nTHE SCENE\n\nPropose the tree. The human asked for: “a castle”',
      brief: 'THE SCENE',
      words: 'a castle',
      about: [markId],
    });
    await settle();

    // It is waiting on this side…
    expect(room.waiting().map((w) => w.words)).toEqual(['a castle']);
    // …and the other hand can see it, with the words and the brief separated.
    const pending = hand.pending();
    expect(pending.length).toBe(1);
    expect(pending[0].words).toBe('a castle');
    expect(pending[0].brief).toBe('THE SCENE');
    expect(pending[0].from).toMatch(/john/);
    // In ITS OWN ids — never carried across from the hand that asked.
    expect(pending[0].about.length).toBe(1);

    expect(hand.answer(pending[0].key, '{"steps":[]}')).toBe(true);
    await settle();

    const out = await asked;
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.text).toBe('{"steps":[]}');
      expect(out.by).toMatch(/claude/);
    }
    // Nothing is left waiting once it is answered.
    expect(room.waiting()).toEqual([]);
    expect(hand.pending()).toEqual([]);
    room.close();
    hand.close();
  });

  it('a refusal comes back as a failure with the reason, not as a proposal', async () => {
    const hub = new LocalHub();
    const mine = createSession();
    const room = joinRoom({ session: mine, room: 'r', transport: hub.connect(), name: 'john' });
    const hand = otherHand(hub.connect(), 'claude', 'r');
    await settle();
    const markId = mine.addStroke(box(0, 0, 120, 80), Date.now(), undefined, 1, { content: true });
    await settle();

    const asked = room.ask({ prompt: 'p', brief: 'b', words: 'w', about: [markId] });
    await settle();
    expect(hand.refuse(hand.pending()[0].key, 'nothing is standing to fill')).toBe(true);
    await settle();

    const out = await asked;
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toMatch(/nothing is standing to fill/);
    room.close();
    hand.close();
  });

  it('a brief about nothing is refused before it is parked', async () => {
    const hub = new LocalHub();
    const mine = createSession();
    const room = joinRoom({ session: mine, room: 'r', transport: hub.connect(), name: 'john' });
    const out = await room.ask({ prompt: 'p', brief: 'b', words: 'w', about: [] });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toMatch(/nothing is selected/);
    room.close();
  });

  it('a signal stops it, the way Esc stops a model', async () => {
    const hub = new LocalHub();
    const mine = createSession();
    const room = joinRoom({ session: mine, room: 'r', transport: hub.connect(), name: 'john' });
    await settle();
    const markId = mine.addStroke(box(0, 0, 120, 80), Date.now(), undefined, 1, { content: true });
    await settle();
    const ac = new AbortController();
    const asked = room.ask({ prompt: 'p', brief: 'b', words: 'w', about: [markId], signal: ac.signal });
    await settle();
    expect(room.waiting().length).toBe(1);
    ac.abort();
    const out = await asked;
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toBe('stopped');
    expect(room.waiting()).toEqual([]);
    room.close();
  });

  it('answering a brief nobody parked does nothing', async () => {
    const hub = new LocalHub();
    const hand = otherHand(hub.connect(), 'claude', 'r');
    await settle();
    expect(hand.answer('nosuchkey', '{}')).toBe(false);
    hand.close();
  });
});

describe('the pieces of the protocol', () => {
  it('splits a prompt back into the brief and the words', () => {
    const user = 'THE SCENE\nwith planes\n\nPropose the tree. The human asked for: “castle with green tops”';
    expect(splitPrompt(user)).toEqual({ brief: 'THE SCENE\nwith planes', words: 'castle with green tops' });
  });

  it('keeps the whole prompt as the brief when the marker is not there', () => {
    expect(splitPrompt('just a brief')).toEqual({ brief: 'just a brief', words: '' });
  });

  it('a brief with no words splits to no words', () => {
    expect(splitPrompt('THE SCENE\n\nPropose the tree.')).toEqual({ brief: 'THE SCENE', words: '' });
  });

  it('reads a refusal, and is not fooled by a proposal', () => {
    expect(refusalOf('{"refuse":"nothing is standing"}')).toBe('nothing is standing');
    expect(refusalOf('{"steps":[{"id":"s1"}]}')).toBe(null);
    expect(refusalOf('not json at all')).toBe(null);
    expect(refusalOf('{"refuse":"  "}')).toBe(null);
  });

  it('a brief carries the word, and nothing minted beside it', () => {
    expect(BRIEF_QUESTION).toBe('brief');
  });

  it('the old spelling is recognised, and nothing else is taken for it', () => {
    expect(legacySeatTraffic('brief:k4f2')).toBe(true);
    expect(legacySeatTraffic('answer:k4f2')).toBe(true);
    expect(legacySeatTraffic(BRIEF_QUESTION)).toBe(false);
    expect(legacySeatTraffic('explanation:john~a1b2:4')).toBe(false);
    expect(legacySeatTraffic('note')).toBe(false);
  });
});

// ---- the pairing is the brief's own node id (DIRECTOR-PLAN-W2 L2a, week 1's U1d)
//
// The key the asking hand used to mint is gone. What pairs a brief with its
// answer is the id the core derives for the brief — the log that wrote it and
// that event's number in that log (L1) — which every hand derives alike. These
// pin that they really do, on boards where a counter over the merged replay
// would have numbered the brief differently.

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The answer EVENT a hand wrote in its own log about a brief — what crossed the wire. */
function answerEventFor(events: readonly SessionEvent[], briefId: string) {
  return events.find(
    (e): e is Extract<SessionEvent, { type: 'answer' }> => e.type === 'answer' && !e.by && e.question === briefId
  );
}

describe('the pairing is the brief node’s own id', () => {
  it('both hands know the brief by one id, a late hand derives it too, and the answer names it', async () => {
    const hub = new LocalHub();
    const mine = createSession();
    const room = joinRoom({ session: mine, room: 'r', transport: hub.connect(), name: 'john' });
    const hand = otherHand(hub.connect(), 'claude', 'r');
    await settle();

    // The other hand draws FIRST, so the two sessions do not merge the same
    // logs in the same order when the brief is written — the board a counter
    // over the merged replay numbered differently.
    hand.session.addStroke(box(300, 0, 90, 90), Date.now(), undefined, 1, { content: true });
    await settle();
    const markId = mine.addStroke(box(0, 0, 120, 80), Date.now() + 1, undefined, 1, { content: true });
    await settle();

    const asked = room.ask({ prompt: 'p', brief: 'b', words: 'a castle', about: [markId] });
    await settle();

    // The switch that makes it true: the tab said what its log is called.
    expect(mine.logName()).toBe(room.me);

    const parked = room.waiting()[0];
    const pending = hand.pending()[0];
    // One id, derived twice — and in the AUTHORED form, which is the whole
    // reason it can be matched across hands (`explanation:3` would be this
    // reader's private numbering).
    expect(pending.key).toBe(parked.key);
    expect(parked.key).toMatch(new RegExp(`^explanation:${escape(room.me)}:\\d+$`));

    // A third hand walking in LATE, merging the same lines in an order nobody
    // else saw, derives the same id from the same event.
    const late = otherHand(hub.connect(), 'zoe', 'r');
    await settle();
    expect(late.pending().map((b) => b.key)).toEqual([parked.key]);
    late.close();

    // It IS the brief's node, on both boards, and it says only that it is a brief.
    expect(mine.getState().explanations).toContain(parked.key);
    expect(hand.session.getState().explanations).toContain(parked.key);
    const theirBrief = hand.session.getState().nodes.get(parked.key)!;
    const rep = theirBrief.reps.find((r) => r.modality === 'explanation')!;
    expect((rep.data as { question: string }).question).toBe(BRIEF_QUESTION);
    // What it is about is the same ids in both sessions.
    expect(pending.about).toEqual([markId]);

    expect(hand.answer(pending.key, '{"steps":[]}')).toBe(true);
    await settle();
    const out = await asked;
    expect(out.ok).toBe(true);

    // The answer as it crossed the wire: it names the brief by that id, and its
    // `aboutIds` are the brief node's `about` edges as read in the OTHER
    // party's session — the asker's — so nothing was translated on the way.
    const sent = answerEventFor(hand.session.getEvents(), parked.key);
    expect(sent).toBeTruthy();
    const briefHere = mine.getState().nodes.get(parked.key)!;
    expect(sent!.aboutIds).toEqual(briefHere.edges.filter((e) => e.rel === 'about').map((e) => e.to));
    // …and it landed in the asker's board about exactly those marks.
    const s = mine.getState();
    const landed = s.explanations
      .map((id) => s.nodes.get(id)!)
      .find((n) => (n.reps.find((r) => r.modality === 'explanation')?.data as { question?: string })?.question === parked.key)!;
    expect(landed).toBeTruthy();
    expect(landed.edges.filter((e) => e.rel === 'about').map((e) => e.to)).toEqual([markId]);
    room.close();
    hand.close();
  });

  it('a reader holding ONE hand’s log derives that hand’s brief under the same id', async () => {
    // The harness's own trap: two hands on one hub merge the same lines, so a
    // counter over the merged replay agrees with itself and proves nothing.
    // This reader holds a SUBSET — one log, not two — which is what a hand
    // arriving at a partly caught-up room holds.
    const hub = new LocalHub();
    const mine = createSession();
    const room = joinRoom({ session: mine, room: 'r', transport: hub.connect(), name: 'john' });
    const hand = otherHand(hub.connect(), 'claude', 'r');
    await settle();
    // Claude's own mark, so Claude's log stands alone: an answer is refused
    // when nothing it is about is on the board.
    const markId = hand.session.addStroke(box(0, 0, 120, 80), Date.now(), undefined, 1, { content: true });
    await settle();

    // John's brief goes in first, so in the merged board Claude's is the
    // SECOND explanation, and on its own it would be the first.
    void room.ask({ prompt: 'p', brief: 'b', words: 'mine', about: [markId] });
    await settle();
    const theirBriefId = hand.session.answer({
      participantId: LOCAL_PARTICIPANT,
      question: BRIEF_QUESTION,
      text: 'a brief of their own',
      aboutIds: [markId],
      at: Date.now() + 1,
    })!;
    await settle();

    expect(mine.getState().explanations.indexOf(theirBriefId)).toBe(1);
    const alone = createSession();
    alone.load(hand.session.getEvents().filter((e) => !e.by));
    const briefs = alone.getState().explanations.filter((id) => {
      const rep = alone.getState().nodes.get(id)!.reps.find((r) => r.modality === 'explanation');
      return (rep?.data as { question?: string } | undefined)?.question === BRIEF_QUESTION;
    });
    expect(briefs).toEqual([theirBriefId]);
    room.close();
    hand.close();
  });

  it('two briefs from two hands never collide, and answering one settles only that one', async () => {
    const hub = new LocalHub();
    const a = createSession();
    const b = createSession();
    const roomA = joinRoom({ session: a, room: 'r', transport: hub.connect(), name: 'john' });
    const roomB = joinRoom({ session: b, room: 'r', transport: hub.connect(), name: 'ada' });
    const hand = otherHand(hub.connect(), 'claude', 'r');
    await settle();

    const ma = a.addStroke(box(0, 0, 120, 80), Date.now(), undefined, 1, { content: true });
    await settle();
    const mb = b.addStroke(box(400, 0, 120, 80), Date.now() + 1, undefined, 1, { content: true });
    await settle();
    const askedA = roomA.ask({ prompt: 'pa', brief: 'ba', words: 'from john', about: [ma] });
    await settle();
    const askedB = roomB.ask({ prompt: 'pb', brief: 'bb', words: 'from ada', about: [mb] });
    await settle();

    const parked = hand.pending();
    expect(parked.length).toBe(2);
    const fromJohn = parked.find((p) => p.prompt === 'pa')!;
    const fromAda = parked.find((p) => p.prompt === 'pb')!;
    expect(fromJohn.key).not.toBe(fromAda.key);
    expect(fromJohn.key).toBe(roomA.waiting()[0].key);
    expect(fromAda.key).toBe(roomB.waiting()[0].key);

    expect(hand.answer(fromAda.key, '{"steps":[{"id":"s1"}]}')).toBe(true);
    await settle();
    expect(roomB.waiting()).toEqual([]);
    expect(roomA.waiting().length).toBe(1);
    const outB = await askedB;
    expect(outB.ok && outB.text).toBe('{"steps":[{"id":"s1"}]}');

    expect(hand.answer(fromJohn.key, '{"steps":[]}')).toBe(true);
    await settle();
    const outA = await askedA;
    expect(outA.ok && outA.text).toBe('{"steps":[]}');
    roomA.close();
    roomB.close();
    hand.close();
  });

  it('a mark drawn in the room has one id in both boards', async () => {
    const hub = new LocalHub();
    const mine = createSession();
    const theirs = createSession();
    const a = joinRoom({ session: mine, room: 'r', transport: hub.connect(), name: 'john' });
    const b = joinRoom({ session: theirs, room: 'r', transport: hub.connect(), name: 'claude' });
    await settle();
    const id = mine.addStroke(box(0, 0, 120, 80), Date.now(), undefined, 1, { content: true });
    await settle();
    // What a `space_say` aimed at an id read off `space_look` needs, and what
    // the counter could not give it.
    expect(theirs.getState().contentIds).toEqual([id]);
    expect(id).toMatch(new RegExp(`^stroke:${escape(a.me)}:\\d+$`));
    a.close();
    b.close();
  });

  it('nothing in the room writes the old spelling any more', async () => {
    const hub = new LocalHub();
    const mine = createSession();
    const room = joinRoom({ session: mine, room: 'r', transport: hub.connect(), name: 'john' });
    const hand = otherHand(hub.connect(), 'claude', 'r');
    await settle();
    const markId = mine.addStroke(box(0, 0, 120, 80), Date.now(), undefined, 1, { content: true });
    await settle();
    const asked = room.ask({ prompt: 'p', brief: 'b', words: 'w', about: [markId] });
    await settle();
    expect(hand.answer(hand.pending()[0].key, '{"steps":[]}')).toBe(true);
    await settle();
    await asked;
    const refused = room.ask({ prompt: 'p2', brief: 'b', words: 'w', about: [markId] });
    await settle();
    expect(hand.refuse(hand.pending()[0].key, 'no')).toBe(true);
    await settle();
    await refused;

    const questions = [...mine.getEvents(), ...hand.session.getEvents()]
      .filter((e): e is Extract<SessionEvent, { type: 'answer' }> => e.type === 'answer')
      .map((e) => e.question);
    expect(questions.length).toBeGreaterThanOrEqual(4);
    expect(questions.filter((q) => legacySeatTraffic(q))).toEqual([]);
    room.close();
    hand.close();
  });
});

describe('a log written before the pairing changed', () => {
  const text = BEFORE_IDS['../fixtures/seat-before-ids.mm.log'];

  it('is the old pairing, recorded — briefs and answers under a minted key', () => {
    expect(typeof text).toBe('string');
    const { events, skipped } = decodeBoard(text);
    expect(skipped).toBe(0);
    const questions = events
      .filter((e): e is Extract<SessionEvent, { type: 'answer' }> => e.type === 'answer')
      .map((e) => e.question);
    // Three briefs (answered, refused, left waiting), their two answers, one
    // sentence — all written by the code as it stood before L2a.
    expect(questions.filter((q) => legacySeatTraffic(q)).length).toBe(5);
    expect(questions.filter((q) => !legacySeatTraffic(q))).toEqual(['note']);
    // A log with no name: counter ids, as every log before ids per hand.
    expect(events.every((e) => e.origin === undefined)).toBe(true);
  });

  it('replays with its briefs and answers unread, and its sentence read', () => {
    const { events } = decodeBoard(text);
    const session = createSession();
    session.load(events);
    expect(saidInRoom(session).map((x) => x.text)).toEqual(['the plan is 4 × 2.6 — a courtyard, not a keep']);
    expect(saidInRoom(session)[0].by).toBe('claude');
  });

  it('a room opened over it waits on nothing, and no hand is offered an old brief to answer', async () => {
    const { events } = decodeBoard(text);
    const hub = new LocalHub();
    const mine = createSession();
    mine.load(events);
    const room = joinRoom({ session: mine, room: 'r', transport: hub.connect(), name: 'john' });
    const hand = otherHand(hub.connect(), 'fable', 'r');
    await settle();
    // The tab's own lines — its mark and its three old briefs — reached the hand…
    expect(hand.session.getState().contentIds.length).toBe(1);
    // …and none of them is a brief anyone can settle: the tab that parked the
    // one left waiting ran code that no longer exists.
    expect(hand.pending()).toEqual([]);
    expect(room.waiting()).toEqual([]);
    room.close();
    hand.close();
  });
});

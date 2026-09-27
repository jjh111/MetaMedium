// The room, headless: two hands on one hub, no relay and no browser.
//
// What is worth pinning is not the transport — that is core's, and core tests
// it — but the two things G5 adds: another hand's marks arrive as THEIRS, and a
// brief parked in the room comes back answered through the same channel.

import { describe, it, expect } from 'vitest';
import { boundsOf, createSession, LocalHub, LOCAL_PARTICIPANT, topInterpretation } from 'metamedium-core';
import { joinRoom, otherHand, refusalOf, splitPrompt, ANSWER_PREFIX, BRIEF_PREFIX } from './room';

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

  it('the question prefixes are the pairing, and they are twins', () => {
    expect(BRIEF_PREFIX).toBe('brief:');
    expect(ANSWER_PREFIX).toBe('answer:');
  });
});

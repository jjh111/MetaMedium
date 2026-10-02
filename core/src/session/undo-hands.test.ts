// Undo is per hand (V1-PLAN L2j, found by R4d).
//
// A room's board is the merge of every hand's log, interleaved by time, and
// undo dropped the last event on the BOARD — which, whenever another hand drew
// after this one, was the other hand's. Nothing was sent (this hand's own log
// had not changed), so the mark stood on every other board and came back here
// at the next line that changed a log. Undo takes back this hand's own last
// ACT: the events it wrote at once — one dispatched event, or everything a
// tool wrote inside one `withTool` call — found among the events of its own
// log (the ones no merge stamped `by`) in the order it wrote them, never by
// where the merge happened to put them. The log shrinks, so the whole of it
// is sent (L1's `publish`), and every other hand's merge cuts it out (R4d's
// `LiveMerge`) — so the other boards lose exactly that act.

import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG, type Session, type SessionEvent } from './session';
import { labelOf } from './nodes';
import { mergeLogs } from '../store/merge';
import { LiveStore, LocalHub, type LiveLine, type LiveTransport } from '../store/live';
import { LiveMerge, type MergeReport } from '../store/livemerge';
import { labelInk } from '../tools/label';
import { registerTool, takeOffer, toolScope, offersFor } from '../tools/registry';
import type { Tool } from '../tools/tool';
import { rectStroke, circleStroke } from '../test/strokes';

const named = (logName: string) => createSession({ ...DEFAULT_SESSION_CONFIG, logName });
const tick = () => new Promise((r) => setTimeout(r, 0));
const settle = async () => {
  for (let i = 0; i < 4; i++) await tick();
};
/** Everything a board shows, less how often it was replaced. */
const stateOf = (s: Session) => {
  const st = s.getState();
  return JSON.stringify({ ...st, generation: 0, nodes: [...st.nodes.values()] });
};
/** An event's authorship, as a key. */
const keyOf = (e: SessionEvent) => `${e.origin}#${e.seq}`;
/** A box of this hand's, 120 × 80, its left edge at `x`. */
const box = (s: Session, x: number, at: number, y = 100) => s.addStroke(rectStroke(x, y, 120, 80), at, undefined, 1);

/** The board a fresh session holds for these logs, as `me` reads them: the oracle. */
function oracle(me: string, logs: Record<string, readonly SessionEvent[]>): Session {
  const s = named(me);
  s.load(mergeLogs(logs, { me }));
  return s;
}

/** A hand in a live room, held as the canvas holds one: its session, its store, and the merge kept standing (R4d). */
class Hand {
  readonly session: Session;
  readonly store: LiveStore;
  merge!: LiveMerge;
  /** Every line this hand's store put on the wire, as sent. */
  readonly sent: LiveLine[] = [];
  constructor(hub: LocalHub, readonly me: string) {
    this.session = named(me);
    const wire = hub.connect();
    const tapped: LiveTransport = {
      send: (line) => {
        this.sent.push(JSON.parse(JSON.stringify(line)) as LiveLine);
        return wire.send(line);
      },
      onMessage: wire.onMessage,
    };
    this.store = new LiveStore(tapped, me, 'room');
  }
  /** Into the room as `openLive` goes: my log as it stands, the room's logs merged, the merge kept, a hello. */
  async join(): Promise<void> {
    await this.store.publish(this.mine());
    this.session.load(mergeLogs(await this.store.readLogs(), { me: this.me }));
    this.merge = new LiveMerge(this.session, this.me);
    this.merge.sync(this.store.heldLogs());
    this.store.hello();
  }
  /** My log, in the order written (`LiveStore.ownLog`). */
  mine(): SessionEvent[] {
    return this.store.ownLog(this.session.getEvents());
  }
  /** Autosave: my log as it stands — the new tail, or the whole of it when it shrank. */
  async send(): Promise<void> {
    await this.store.publish(this.mine());
  }
  /** A line landed: the merge brought up to the logs as held. */
  hear(): MergeReport {
    return this.merge.sync(this.store.heldLogs());
  }
  /** The board is the full merge of the logs this hand holds and its own, replayed from zero. */
  isTheMerge(): void {
    const logs = { ...this.store.heldLogs(), [this.me]: this.session.getEvents().filter((e) => !e.by) };
    const o = oracle(this.me, logs);
    expect(JSON.stringify(this.session.getEvents())).toBe(JSON.stringify(o.getEvents()));
    expect(stateOf(this.session)).toBe(stateOf(o));
  }
}

/** Two hands in one room, both joined and each holding the other. */
async function room(her: string, his: string): Promise<{ ann: Hand; bob: Hand }> {
  const hub = new LocalHub();
  const ann = new Hand(hub, her);
  const bob = new Hand(hub, his);
  await ann.join();
  await bob.join();
  await settle();
  ann.hear();
  bob.hear();
  return { ann, bob };
}

describe('undo is per hand (V1-PLAN L2j)', () => {
  // She draws, he draws after her — by the clocks, by his clock set behind
  // hers, and at the very same moment with the names breaking the tie either
  // way — and she undoes. The merge puts his mark after hers in some of these
  // and before it in the rest; her undo takes back her own mark in all of them.
  const orders: [string, string, string, number, number][] = [
    ['her mark first in the merge: he drew later by the clocks', 'ann~a1', 'bob~b1', 1000, 2000],
    ['his mark first in the merge: he drew after her, his clock behind hers', 'ann~a1', 'bob~b1', 2000, 1000],
    ['the same moment, her name first: the tie puts his mark after hers', 'ann~a1', 'bob~b1', 1000, 1000],
    ['the same moment, his name first: the tie puts his mark before hers', 'ann~a1', 'abe~b1', 1000, 1000],
  ];
  for (const [what, her, his, tHer, tHis] of orders) {
    it(`A draws, B draws after, A undoes: her mark is gone and his stands, on both boards (${what})`, async () => {
      const { ann, bob } = await room(her, his);
      const kept = box(ann.session, 100, tHer - 500);
      const hers = box(ann.session, 300, tHer);
      await ann.send();
      await settle();
      bob.hear();
      const theirs = box(bob.session, 600, tHis, 300);
      await bob.send();
      await settle();
      ann.hear();
      for (const h of [ann, bob]) expect([...h.session.getState().contentIds].sort()).toEqual([kept, hers, theirs].sort());
      const hisEvents = bob.session.getEvents().filter((e) => e.origin === his).map(keyOf);

      ann.session.undo();
      await ann.send();
      await settle();
      const cut = bob.hear();

      for (const h of [ann, bob]) {
        const st = h.session.getState();
        expect([...st.contentIds].sort()).toEqual([kept, theirs].sort());
        expect(st.nodes.has(hers)).toBe(false);
        // Every event of his still stands on her board and his.
        const held = new Set(h.session.getEvents().map(keyOf));
        for (const k of hisEvents) expect(held.has(k)).toBe(true);
        h.isTheMerge();
      }
      // Her log shrank in the order she wrote it — the box she drew last is
      // the one gone — so the whole of it went out, and his merge cut it out.
      const last = ann.sent[ann.sent.length - 1];
      expect(last.full).toBe(true);
      expect(last.events.map((e) => e.type)).toEqual(['stroke']);
      expect(ann.mine().map(keyOf)).toEqual(last.events.map(keyOf));
      expect(cut.how).toBe('cut');
    });
  }

  it('a hand with nothing of its own on the board takes nothing back', () => {
    const bob = named('bob~b1');
    box(bob, 100, 1000);
    box(bob, 300, 2000);
    const board = oracle('ann~a1', { 'bob~b1': bob.getEvents() });
    const before = board.getEvents().slice();
    board.undo();
    expect(board.getEvents()).toEqual(before);
    expect(board.getState().contentIds).toHaveLength(2);
  });

  it("the last act is the one this hand wrote last, not the last of its events in the merge's order", () => {
    const ann = named('ann~a1');
    const first = box(ann, 100, 5000);
    // Written after the first, stamped before it: a clock set back, or a
    // result that lands carrying the moment it was asked for.
    const second = box(ann, 300, 4000);
    const bob = named('bob~b1');
    const his = box(bob, 600, 4500, 300);
    const board = oracle('ann~a1', { 'ann~a1': ann.getEvents(), 'bob~b1': bob.getEvents() });
    expect(board.getEvents().map((e) => e.origin)).toEqual(['ann~a1', 'bob~b1', 'ann~a1']);
    board.undo();
    expect([...board.getState().contentIds].sort()).toEqual([first, his].sort());
    board.undo();
    expect(board.getState().contentIds).toEqual([his]);
    board.undo();
    expect(board.getState().contentIds).toEqual([his]);
    expect(second).not.toBe(first);
  });

  it('a tool act of several events — everything written inside one withTool — is undone in one step', () => {
    const s = named('ann~a1');
    const ids = [box(s, 100, 1000), box(s, 260, 1100, 110), box(s, 420, 1200, 96)];
    const before = stateOf(s);
    const n = s.getEvents().length;
    s.withTool('test:tidy-and-clean', () => {
      s.tidy({ ids, mode: 'align', axis: 'row', at: 2000 });
      s.tidy({ ids, mode: 'equalize', at: 2000 });
      s.snap({ ids, at: 2000 });
    });
    expect(s.getEvents()).toHaveLength(n + 3);
    s.undo();
    expect(s.getEvents()).toHaveLength(n);
    expect(stateOf(s)).toBe(before);
  });

  it('an offer taken through the one door is one act, and so is a host that wraps the door in its own withTool (the surface)', () => {
    const TWO: Tool = {
      id: 'test:two-boxes',
      name: 'two boxes',
      describe: () => 'draws two boxes beside the held marks',
      offers: () => [{ key: 'test:two-boxes', label: 'Two boxes', reason: 'a test', base: 0.4, tool: 'test:two-boxes' }],
      take: (_offer, _scope, session, at) => {
        session.addStroke(rectStroke(700, 100, 120, 80), at, undefined, 1);
        session.addStroke(rectStroke(900, 100, 120, 80), at, undefined, 1);
        return { detail: 'two' };
      },
    };
    const off = registerTool(TWO);
    try {
      for (const wrapped of [false, true]) {
        const s = named('ann~a1');
        const ids = [box(s, 100, 1000), box(s, 300, 1100)];
        s.summonMarks(ids, 1500);
        const before = stateOf(s);
        const scope = toolScope(s);
        const offer = offersFor(scope).find((o) => o.tool === TWO.id)!;
        const take = () => {
          takeOffer(offer, scope, s, 2000);
          // What only the host can do, inside the same stamp: one more event.
          s.select(ids, 2001);
        };
        if (wrapped) s.withTool(TWO.id, take, offer.key);
        else take();
        s.undo();
        if (wrapped) {
          // The whole act — the tool's two boxes and the host's select — in one step.
          expect(stateOf(s)).toBe(before);
        } else {
          // The host's select was its own act; the tool's two boxes were one.
          s.undo();
          expect(stateOf(s)).toBe(before);
        }
      }
    } finally {
      off();
    }
  });

  it('labelling three marks is one act: one undo takes every label off, and the field the act closed first stays closed', () => {
    const s = named('ann~a1');
    const ids = [box(s, 100, 1000), box(s, 300, 1100), box(s, 500, 1200)];
    const summon = s.summonMarks(ids, 1500)!;
    const r = labelInk(s, { summonId: summon, ids, word: 'inlet', at: 2000 });
    expect(r.done).toEqual(ids);
    expect(s.getState().summon).toBeNull();
    s.undo();
    const st = s.getState();
    expect(ids.map((id) => labelOf(st.nodes.get(id)!)?.text ?? null)).toEqual([null, null, null]);
    // The field closed BEFORE the words were written (L2e), and that close is
    // not part of the act: it stays closed, and the next undo takes it back.
    expect(st.summon).toBeNull();
    expect(st.contentIds).toEqual(ids);
  });

  it('a tool act is still one act after the log is written out and read back in', () => {
    const s = named('fern');
    const ids = [box(s, 100, 1000), box(s, 300, 1100), box(s, 500, 1200)];
    s.withTool('test:tidy-twice', () => {
      s.tidy({ ids, mode: 'align', axis: 'row', at: 2000 });
      s.tidy({ ids, mode: 'equalize', at: 2000 });
    });
    const reopened = named('fern');
    reopened.load(JSON.parse(JSON.stringify(s.getEvents())));
    reopened.undo();
    const three = named('fern');
    three.load(s.getEvents().slice(0, 3));
    expect(stateOf(reopened)).toBe(stateOf(three));
  });

  it("another hand's tool act of several events is undone whole on its board and on hers, past the mark she drew after it", async () => {
    const { ann, bob } = await room('ann~a1', 'bob~b1');
    const hers = box(ann.session, 100, 1000);
    await ann.send();
    await settle();
    bob.hear();
    let two: string[] = [];
    bob.session.withTool('test:pair', () => {
      two = [box(bob.session, 400, 2000, 300), bob.session.addStroke(circleStroke(700, 340, 40), 2000, undefined, 1)];
    });
    await bob.send();
    await settle();
    ann.hear();
    const after = box(ann.session, 100, 3000, 400);
    await ann.send();
    await settle();
    bob.hear();
    for (const h of [ann, bob]) expect(h.session.getState().contentIds).toHaveLength(4);

    bob.session.undo();
    await bob.send();
    await settle();
    ann.hear();
    for (const h of [ann, bob]) {
      const st = h.session.getState();
      expect([...st.contentIds].sort()).toEqual([hers, after].sort());
      for (const id of two) expect(st.nodes.has(id)).toBe(false);
      h.isTheMerge();
    }
  });

  it('outside a tool, one undo is one event, as it always was', () => {
    const s = named('ann~a1');
    const a = box(s, 100, 1000);
    const b = box(s, 300, 1100);
    const summon = s.summonMarks([a, b], 1200)!;
    const thing = s.bless({ summonId: summon, name: 'pair', at: 1300 })!;
    expect(s.getState().artifacts).toEqual([thing]);
    s.undo(); // the bless: the field comes back
    expect(s.getState().artifacts).toEqual([]);
    expect(s.getState().summon?.id).toBe(summon);
    s.undo(); // the summon
    expect(s.getState().summon).toBeNull();
    s.undo(); // the second box
    expect(s.getState().contentIds).toEqual([a]);
  });
});

describe('what an act is, and how undo takes one back (V1-PLAN L2j)', () => {
  /** A board replayed from zero, for comparing with one that went back to a checkpoint. */
  const fresh = (me: string, log: readonly SessionEvent[]) => {
    const s = named(me);
    s.load(log);
    return s;
  };

  it('lastAct names what undo takes back — the act, in the order it stands — and nothing when the hand has none', () => {
    const s = named('ann~a1');
    expect(s.lastAct()).toEqual([]);
    const ids = [box(s, 100, 1000), box(s, 300, 1100)];
    expect(s.lastAct().map((e) => e.seq)).toEqual([2]);
    s.withTool('test:pair', () => {
      s.tidy({ ids, mode: 'align', axis: 'row', at: 2000 });
      s.tidy({ ids, mode: 'equalize', at: 2000 });
    });
    const act = s.lastAct();
    expect(act.map((e) => e.type)).toEqual(['tidy', 'tidy']);
    expect(act.every((e) => e.act === act[0].act && e.tool === 'test:pair')).toBe(true);
    const before = s.getEvents().filter((e) => !act.includes(e));
    s.undo();
    expect(s.getEvents()).toEqual(before);
  });

  it('nested withTool calls write one act; a new outermost call is the next act, numbered past it', () => {
    const s = named('ann~a1');
    const ids = [box(s, 100, 1000), box(s, 300, 1100)];
    s.withTool('outer', () => {
      s.withTool('inner', () => s.snap({ ids, at: 2000 }));
      s.tidy({ ids, mode: 'equalize', at: 2000 });
    });
    s.withTool('next', () => s.tidy({ ids, mode: 'align', axis: 'row', at: 2100 }));
    const acts = s.getEvents().slice(2).map((e) => [e.tool, e.act]);
    expect(acts).toEqual([['inner', 1], ['outer', 1], ['next', 2]]);
    // Plain events carry none.
    expect(s.getEvents().slice(0, 2).every((e) => e.act === undefined)).toBe(true);
    s.undo();
    expect(s.getEvents()).toHaveLength(4);
    s.undo();
    expect(s.getEvents()).toHaveLength(2);
  });

  it('the field a tool closes before anything else is not its act; a close after it has written something is', () => {
    const s = named('ann~a1');
    const ids = [box(s, 100, 1000), box(s, 300, 1100)];
    const summon = s.summonMarks(ids, 1200)!;
    s.withTool('test:close-first', () => {
      s.dismiss(summon, 2000);
      s.tidy({ ids, mode: 'equalize', at: 2000 });
      s.deselect(2000);
    });
    const tail = s.getEvents().slice(-3);
    expect(tail.map((e) => [e.type, e.act])).toEqual([['dismiss', undefined], ['tidy', 1], ['deselect', 1]]);
    s.undo(); // the tidy and the deselect after it
    expect(s.getEvents().slice(-1)[0].type).toBe('dismiss');
    expect(s.getState().summon).toBeNull();
    s.undo(); // the close, an event of its own
    expect(s.getState().summon?.id).toBe(summon);
  });

  it('a throw inside a tool leaves what it wrote as one act, and the next act is numbered past it', () => {
    const s = named('ann~a1');
    const ids = [box(s, 100, 1000), box(s, 300, 1100)];
    expect(() => s.withTool('broken', () => {
      s.tidy({ ids, mode: 'equalize', at: 2000 });
      s.snap({ ids, at: 2000 });
      throw new Error('no');
    })).toThrow('no');
    s.withTool('fine', () => s.tidy({ ids, mode: 'align', axis: 'row', at: 2100 }));
    expect(s.getEvents().slice(2).map((e) => e.act)).toEqual([1, 1, 2]);
    s.undo();
    s.undo();
    expect(s.getEvents()).toHaveLength(2);
  });

  it('act numbers only rise: an undo, a load of the log and a load of nothing never hand one out again', () => {
    const s = named('ann~a1');
    const ids = [box(s, 100, 1000), box(s, 300, 1100)];
    s.withTool('t', () => s.tidy({ ids, mode: 'equalize', at: 2000 }));
    s.withTool('t', () => s.tidy({ ids, mode: 'align', axis: 'row', at: 2100 }));
    s.undo();
    s.withTool('t', () => s.tidy({ ids, mode: 'align', axis: 'row', at: 2200 }));
    expect(s.getEvents().slice(-1)[0].act).toBe(3);
    const reopened = named('ann~a1');
    reopened.load(s.getEvents());
    reopened.withTool('t', () => reopened.snap({ ids, at: 2300 }));
    expect(reopened.getEvents().slice(-1)[0].act).toBe(4);
    reopened.load([]);
    reopened.withTool('t', () => reopened.addStroke(rectStroke(0, 400, 120, 80), 2400, undefined, 1));
    expect(reopened.getEvents()[0].act).toBe(5);
  });

  it('taken from the middle of a board: the replay goes back to a checkpoint before the act, never one taken with it, and reads as a replay from zero', () => {
    const ann = named('ann~a1');
    const bob = named('bob~b1');
    for (let i = 0; i < 6; i++) box(bob, 100 + i * 150, 1000 + i * 100, 300);
    const mine = box(ann, 100, 1150);
    for (let i = 0; i < 6; i++) box(bob, 100 + i * 150, 2000 + i * 100, 500);
    const logs = { 'ann~a1': ann.getEvents(), 'bob~b1': bob.getEvents() };
    const board = createSession({ ...DEFAULT_SESSION_CONFIG, logName: 'ann~a1', checkpointEvery: 2 });
    board.load(mergeLogs(logs, { me: 'ann~a1' }));
    const at = board.getEvents().findIndex((e) => !e.by);
    expect(at).toBe(2);
    board.undo();
    expect(board.getState().nodes.has(mine)).toBe(false);
    expect(board.getEvents()).toHaveLength(12);
    expect(stateOf(board)).toBe(stateOf(fresh('ann~a1', board.getEvents())));
    // And it draws on from there as the replay would.
    box(board, 900, 9000, 700);
    expect(stateOf(board)).toBe(stateOf(fresh('ann~a1', board.getEvents())));
  });

  it('ticks are never taken back, and a checkpoint taken among them after the act is not gone back to (R4d\'s latent finding)', () => {
    const s = createSession({ ...DEFAULT_SESSION_CONFIG, logName: 'ann~a1', checkpointEvery: 2 });
    box(s, 100, 1000);
    box(s, 300, 1100);
    const last = box(s, 500, 1200);
    s.tick(1300);
    s.tick(1400); // a checkpoint at 4 holds the third box
    s.tick(1500);
    s.undo();
    expect(s.getEvents().map((e) => e.type)).toEqual(['stroke', 'stroke', 'tick', 'tick', 'tick']);
    expect(s.getState().nodes.has(last)).toBe(false);
    expect(stateOf(s)).toBe(stateOf(fresh('ann~a1', s.getEvents())));
  });

  it('the board is replaced only when something left standing after the act mints its ids off the counter', () => {
    // Authored events after the act: the same ids in the replay, so a model
    // still thinking about a mark answers about it.
    const ann = named('ann~a1');
    box(ann, 100, 1000);
    const bob = named('bob~b1');
    box(bob, 300, 2000, 300);
    const board = oracle('ann~a1', { 'ann~a1': ann.getEvents(), 'bob~b1': bob.getEvents() });
    const g0 = board.getState().generation;
    board.undo();
    expect(board.getState().generation).toBe(g0);
    // A mark after it with no authorship (drawn before its hand had a name):
    // its id comes off the replay's counter, so the board is replaced.
    const old = createSession();
    old.addStroke(rectStroke(300, 300, 120, 80), 2000, undefined, 1);
    const board2 = oracle('ann~a1', { 'ann~a1': ann.getEvents(), old: old.getEvents() });
    const g1 = board2.getState().generation;
    board2.undo();
    expect(board2.getState().generation).toBe(g1 + 1);
    expect(board2.getState().contentIds).toHaveLength(1);
    // A board of one hand, its act the last thing on it: never replaced.
    const one = createSession();
    box(one, 100, 1000);
    box(one, 300, 1100);
    const g2 = one.getState().generation;
    one.undo();
    expect(one.getState().generation).toBe(g2);
  });

  it('with no authorship there is no number: a board of one hand that was never named undoes in the order written, one event at a time', () => {
    const s = createSession();
    const a = box(s, 100, 2000);
    const b = box(s, 300, 1000); // written after, stamped before
    s.undo();
    expect(s.getState().contentIds).toEqual([a]);
    s.undo();
    expect(s.getState().contentIds).toEqual([]);
    expect(b).not.toBe(a);
  });

  it('marks drawn before a hand had a name are taken back after everything it wrote under its name, in the order the log holds them', () => {
    const s = createSession();
    const early = [box(s, 100, 1000), box(s, 300, 1100)];
    s.setLogName('ann~a1');
    const later = box(s, 500, 1200);
    const bob = named('bob~b1');
    const his = box(bob, 100, 5000, 300);
    const board = oracle('ann~a1', { 'ann~a1': s.getEvents(), 'bob~b1': bob.getEvents() });
    board.undo();
    expect(board.getState().nodes.has(later)).toBe(false);
    board.undo();
    expect([...board.getState().contentIds].sort()).toEqual([early[0], his].sort());
    board.undo();
    expect(board.getState().contentIds).toEqual([his]);
    board.undo();
    expect(board.getState().contentIds).toEqual([his]);
  });

  it("a model's reading in this hand's log is this hand's act: undo takes it back, as it always did", () => {
    const s = named('ann~a1');
    const a = box(s, 100, 1000);
    const model = s.join('agent', 'qwen3', 1100, 2);
    s.propose({ participantId: model, nodeId: a, edges: [{ to: 'type:rectangle', rel: 'resembles', weight: 0.7, reasoning: 'four corners' }], at: 1200 });
    const n = s.getEvents().length;
    expect(s.lastAct().map((e) => e.type)).toEqual(['propose']);
    s.undo();
    expect(s.getEvents()).toHaveLength(n - 1);
    expect(s.getEvents().slice(-1)[0].type).toBe('join');
  });
});

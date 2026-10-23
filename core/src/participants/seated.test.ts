// A model that joined on one board and is asked on another (the I7 finding, 1 Oct 2026).
//
// A board loaded in place takes every `join` with it: joins are events in the old board's log. The
// surface keeps the model it joined, so on the new board an ask answered *that participant is not in
// this session*. The rule pinned here is the general one: a participant is on the board it is asked on
// — made again, lazily, by the first ask, and never twice — and merely loading a board writes nothing.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import { createAgentParticipant, type Transport } from './agent';
import { createDecideParticipant, createStubDecideTransport, choice } from './decide';
import { createBridgeParticipant } from './bridge';
import { createSeatParticipant } from './seat';
import { wordOf } from '../session/nodes';
import { PRESETS } from '../llm/provider';
import { circleStroke } from '../test/strokes';
import type { SessionEvent } from '../session/session';
import { mergeLogs } from '../store/merge';
import { othersJoined } from './seated';

const local = { ...PRESETS.ollama, model: 'qwen3' } as const;
const other = { ...PRESETS.ollama, model: 'gemma3' } as const;
const says = (text: string): Transport => async () => ({ ok: true, text, model: 'stub' });
const joins = (s: ReturnType<typeof createSession>) => s.getEvents().filter((e: SessionEvent) => e.type === 'join');

/** A session with one mark, and the events a second board would hold. */
function boardWithMark(at = 1000) {
  const s = createSession();
  const mark = s.addStroke(circleStroke(300, 300, 40), at);
  return { s, mark };
}

describe('a model joined on one board is asked on the next', () => {
  it('a load writes nothing; the first ask joins again, once, and answers', async () => {
    const { s } = boardWithMark();
    const agent = createAgentParticipant(s, local, 1100, { transport: says('a circle') });
    expect(joins(s)).toHaveLength(1);

    s.load([]);
    expect(s.getEvents()).toHaveLength(0); // a board only looked at is never written
    const mark = s.addStroke(circleStroke(200, 200, 30), 2000);
    const eventsBefore = s.getEvents().length;

    const res = await agent.ask('what is it?', [mark], 2100);
    expect(res.ok).toBe(true);
    expect(joins(s)).toHaveLength(1);
    expect(s.getEvents().length).toBeGreaterThan(eventsBefore);
    expect(s.getState().participants).toContain(agent.id);
    // Attributed to the participant of THIS board, whose word is the model's.
    expect(wordOf(s.getState().nodes.get(agent.id)!)).toBe(agent.name);

    // Asked again: still one join.
    expect((await agent.ask('and now?', [mark], 2200)).ok).toBe(true);
    expect(joins(s)).toHaveLength(1);
  });

  it('a board reopened that already holds its join gets no second', async () => {
    const { s: a, mark: markA } = boardWithMark();
    const agent = createAgentParticipant(a, local, 1100, { transport: says('a circle') });
    await agent.ask('first?', [markA], 1200);
    const kept = a.getEvents().slice();
    expect(joins(a)).toHaveLength(1);

    a.load([]);
    a.load(kept); // the board comes back whole, its join with it
    const res = await agent.ask('again?', [markA], 3000);
    expect(res.ok).toBe(true);
    expect(joins(a)).toHaveLength(1);
    expect(a.getState().participants).toContain(agent.id);
  });

  it('is never taken for another model that happens to hold the same participant id', async () => {
    const { s: a } = boardWithMark();
    const agent = createAgentParticipant(a, local, 1100, { transport: says('a circle') });
    const idOnA = agent.id;

    // Another board, where a different model joined first and holds that very id.
    const { s: b, mark } = boardWithMark();
    const stranger = createAgentParticipant(b, other, 1100, { transport: says('x') });
    expect(stranger.id).toBe(idOnA);
    a.load(b.getEvents());

    const res = await agent.ask('who am I?', [mark], 3000);
    expect(res.ok).toBe(true);
    expect(agent.id).not.toBe(stranger.id);
    expect(joins(a)).toHaveLength(2);
    expect(wordOf(a.getState().nodes.get(agent.id)!)).toBe(agent.name);
  });

  it('every way of asking seats it first — reading, drawing, a program, behaviour', async () => {
    const { s } = boardWithMark();
    const agent = createAgentParticipant(s, local, 1100, { transport: says('[]') });
    s.load([]);
    const mark = s.addStroke(circleStroke(200, 200, 30), 2000);
    await agent.interpret([mark], 2100);
    expect(joins(s)).toHaveLength(1);
    s.load([]);
    const mark2 = s.addStroke(circleStroke(200, 200, 30), 2000);
    await agent.draw({ prompt: 'a box', nodeIds: [mark2], at: 2100 });
    expect(joins(s)).toHaveLength(1);
    expect(s.getState().participants).toContain(agent.id);
  });

  it('`seat` is idempotent and names the participant on this board', () => {
    const { s } = boardWithMark();
    const agent = createAgentParticipant(s, local, 1100, { transport: says('x') });
    const first = agent.id;
    expect(agent.seat(1200)).toBe(first);
    expect(joins(s)).toHaveLength(1);
    s.load([]);
    const now = agent.seat(2000);
    expect(joins(s)).toHaveLength(1);
    expect(agent.id).toBe(now);
    expect(s.getState().participants).toContain(now);
    expect(agent.seat(2100)).toBe(now);
    expect(joins(s)).toHaveLength(1);
  });

  it('made lazily (a model the page seats on its own, unasked), it writes nothing until its first ask — and joins once', async () => {
    const { s, mark } = boardWithMark();
    const before = s.getEvents().length;
    const agent = createAgentParticipant(s, local, 1100, { transport: says('a circle'), lazy: true, name: 'dyna.ink writer' });
    expect(s.getEvents()).toHaveLength(before); // made, and the board only looked at: nothing written
    expect(agent.id).toBe('');
    const res = await agent.ask('what is it?', [mark], 1200);
    expect(res.ok).toBe(true);
    expect(joins(s)).toHaveLength(1);
    expect(agent.id).not.toBe('');
    expect(wordOf(s.getState().nodes.get(agent.id)!)).toBe('dyna.ink writer');
    expect((await agent.ask('and now?', [mark], 1300)).ok).toBe(true);
    expect(joins(s)).toHaveLength(1);
    // Made lazily on a board that already holds its join: it is that participant, and writes nothing.
    const kept = s.getEvents().slice();
    const again = createAgentParticipant(s, local, 1400, { transport: says('x'), lazy: true, name: 'dyna.ink writer' });
    expect(again.id).toBe(agent.id);
    expect(s.getEvents()).toHaveLength(kept.length);
  });

  it('a bridge, which wraps an agent, keeps up with it', async () => {
    const { s } = boardWithMark();
    const bridge = createBridgeParticipant(s, 1100, { name: 'hand' });
    s.load([]);
    bridge.seat(2000);
    expect(s.getState().participants).toContain(bridge.id);
    expect(joins(s)).toHaveLength(1);
  });
});

describe('the decision seat is seated the same way', () => {
  it('asks on a board it was not joined on, and joins there once', async () => {
    const { s: a } = boardWithMark();
    const seat = createDecideParticipant(a, createStubDecideTransport({}), 1100, { name: 'jury' });
    a.load([]);
    const mark = a.addStroke(circleStroke(200, 200, 30), 2000);
    const q = choice('q', 'which?', [{ id: 'bubble', text: 'a bubble' }, { id: 'wheel', text: 'a wheel' }], [mark]);
    const run = await seat.ask([q], 2100);
    expect(run.ok).toBe(true);
    expect(joins(a)).toHaveLength(1);
    expect(a.getState().participants).toContain(seat.id);
    await seat.ask([q], 2200);
    expect(joins(a)).toHaveLength(1);
  });
});

describe('the canvas\'s own seat (Claude Code) is seated the same way', () => {
  it('keeps the live id through the spread, and is joined again by `seat` after a load', () => {
    const { s } = boardWithMark();
    const seat = createSeatParticipant(s, 1100, { baseUrl: 'http://127.0.0.1:8020' });
    expect(s.getState().participants).toContain(seat.id);
    s.load([]);
    expect(s.getState().participants).not.toContain(seat.id);
    const now = seat.seat(2000);
    expect(seat.id).toBe(now);
    expect(s.getState().participants).toContain(now);
    expect(joins(s)).toHaveLength(1);
  });
});

describe('a join written by seating is not a hand\'s act, and is never another hand\'s', () => {
  const reading = (label: string): Transport => async () => ({ ok: true, text: JSON.stringify([{ label, confidence: 0.8, reasoning: 'r' }]), model: 'stub' });
  const readsOf = (s: ReturnType<typeof createSession>, id: string) => {
    const n = s.getState().nodes.get(id);
    return n ? n.edges.filter((e) => e.rel === 'resembles' && e.via).map((e) => `${e.to} · ${e.via}`) : [];
  };

  it('undo while a lazily seated model thinks takes back the person\'s last act — never its join — and the answer lands', async () => {
    const s = createSession();
    s.setLogName('john~a1');
    const a = s.addStroke(circleStroke(300, 300, 40), 1000);
    const stray = s.addStroke(circleStroke(600, 300, 40), 1100);
    let release!: () => void;
    const held: Transport = () => new Promise((ok) => { release = () => ok({ ok: true, text: JSON.stringify([{ label: 'a bubble', confidence: 0.8, reasoning: 'round' }]), model: 'stub' }); });
    const agent = createAgentParticipant(s, local, 1200, { transport: held, lazy: true, name: 'dyna.ink writer' });
    const asked = agent.interpret([a], 1300);
    const join = s.getEvents().slice(-1)[0];
    expect(join.type).toBe('join');
    expect((join as { seated?: boolean }).seated).toBe(true);
    expect(s.lastAct().map((e) => e.type)).toEqual(['stroke']);
    s.undo();
    expect(s.getState().contentIds).toEqual([a]); // the stray mark went, as the person meant
    expect(s.getState().contentIds).not.toContain(stray);
    expect(s.getState().participants).toContain(agent.id);
    release();
    const res = await asked;
    expect(res.ok).toBe(true);
    expect(readsOf(s, a).length).toBeGreaterThan(0);
  });

  it('a join the hand made itself is still its act: only a seated join is passed over', () => {
    const s = createSession();
    s.setLogName('john~a1');
    s.addStroke(circleStroke(300, 300, 40), 1000);
    s.join('agent', 'qwen3', 1100, 2);
    expect(s.lastAct().map((e) => e.type)).toEqual(['join']);
  });

  it('in a room, a page\'s seat never takes another hand\'s participant of the same name, so that hand\'s undo leaves its readings', async () => {
    const ann = createSession();
    ann.setLogName('ann~a1');
    const a1 = ann.addStroke(circleStroke(300, 300, 40), 1000);
    const annAgent = createAgentParticipant(ann, local, 1001, { transport: reading('ann-reading'), lazy: true, name: 'dyna.ink writer' });
    await annAgent.interpret([a1], 1100);
    const annLog = ann.getEvents().slice();

    const me = createSession();
    me.setLogName('john~b2');
    me.load(mergeLogs({ 'ann~a1': annLog, 'john~b2': [] }, { me: 'john~b2' }));
    const m1 = me.addStroke(circleStroke(600, 300, 40), 1200);
    const mine = createAgentParticipant(me, local, 1201, { transport: reading('john-reading'), lazy: true, name: 'dyna.ink writer' });
    expect(mine.id).toBe(''); // ann's participant of that name is hers, not this page's
    expect((await mine.interpret([m1], 1300)).ok).toBe(true);
    expect(mine.id).not.toBe(annAgent.id);
    const myLog = me.getEvents().filter((e) => !e.by);
    expect(myLog.filter((e) => e.type === 'join')).toHaveLength(1);

    // ann's board drops her own join and reading (a log she rewrote): my reading stands on every board.
    const annWithout = annLog.filter((e) => e.type !== 'join' && e.type !== 'propose');
    const again = createSession();
    again.setLogName('john~b2');
    again.load(mergeLogs({ 'ann~a1': annWithout, 'john~b2': myLog }, { me: 'john~b2' }));
    expect(readsOf(again, m1).length).toBeGreaterThan(0);
  });

  it('othersJoined names the participants a merge stamped `by`, and nothing of this hand\'s own', () => {
    const ann = createSession();
    ann.setLogName('ann~a1');
    ann.join('agent', 'x', 1000, 2);
    const me = createSession();
    me.setLogName('john~b2');
    me.join('agent', 'x', 1100, 2);
    const merged = mergeLogs({ 'ann~a1': ann.getEvents().slice(), 'john~b2': me.getEvents().slice() }, { me: 'john~b2' });
    expect([...othersJoined(merged)]).toEqual(['participant:ann~a1:1']);
  });
});

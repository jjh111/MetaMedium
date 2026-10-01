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
import { wordOf } from '../session/nodes';
import { PRESETS } from '../llm/provider';
import { circleStroke } from '../test/strokes';
import type { SessionEvent } from '../session/session';

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

// One class of citizen: humans, AI agents, and the engine's own recognizers
// are all participants. Marks and interpretations are attributed acts through
// the same events — there is no separate "AI input" channel.

import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import {
  LOCAL_PARTICIPANT,
  TIER0_PARTICIPANT,
  isParticipant,
  resemblances,
  topInterpretation,
  wordOf,
} from './nodes';
import { circleStroke, lineStroke, checkStroke } from '../test/strokes';

describe('participants are nodes', () => {
  it('every session starts with the local human and the tier-0 heuristics', () => {
    const s = createSession();
    const state = s.getState();
    expect(state.participants).toEqual([LOCAL_PARTICIPANT, TIER0_PARTICIPANT]);
    expect(isParticipant(state.nodes.get(LOCAL_PARTICIPANT)!)).toBe(true);
    // The medium is itself a participant.
    expect(wordOf(state.nodes.get(TIER0_PARTICIPANT)!)).toBe('tier0-heuristics');
  });

  it('join registers an agent as a node in the graph', () => {
    const s = createSession();
    const agent = s.join('agent', 'claude', 0);
    const state = s.getState();
    expect(state.participants).toContain(agent);
    const node = state.nodes.get(agent)!;
    expect(isParticipant(node)).toBe(true);
    expect(wordOf(node)).toBe('claude');
  });
});

describe('attribution', () => {
  it('strokes carry made-by edges; unattributed input belongs to the local human', () => {
    const s = createSession();
    const agent = s.join('agent', 'claude', 0);
    const humanStroke = s.addStroke(circleStroke(200, 200, 40), 1000);
    const agentStroke = s.addStroke(circleStroke(500, 200, 40), 2000, agent);

    const state = s.getState();
    const madeBy = (id: string) =>
      state.nodes.get(id)!.edges.find((e) => e.rel === 'made-by')!.to;
    expect(madeBy(humanStroke)).toBe(LOCAL_PARTICIPANT);
    expect(madeBy(agentStroke)).toBe(agent);
  });

  it("even the engine's own recognitions are attributed proposals", () => {
    const s = createSession();
    const id = s.addStroke(circleStroke(200, 200, 40), 0);
    const top = resemblances(s.getState().nodes.get(id)!)[0];
    expect(top.via).toBe(TIER0_PARTICIPANT);
  });

  it('claims carry their grounded reasoning, whoever makes them', () => {
    const s = createSession();
    const agent = s.join('agent', 'claude', 0);
    const id = s.addStroke(circleStroke(200, 200, 40), 1000);

    // The engine's own claim explains itself...
    expect(resemblances(s.getState().nodes.get(id)!)[0].reasoning).toContain('closed');

    // ...and so does an agent's.
    s.propose({
      participantId: agent,
      nodeId: id,
      edges: [
        {
          to: 'type:rectangle',
          rel: 'resembles',
          weight: 0.95,
          reasoning: 'four corner-ish turns at near-right angles',
        },
      ],
      at: 2000,
    });
    const top = resemblances(s.getState().nodes.get(id)!)[0];
    expect(top.via).toBe(agent);
    expect(top.reasoning).toBe('four corner-ish turns at near-right angles');
  });
});

describe('same-class citizenship', () => {
  it("an agent's stroke is a full citizen: recognized, lassoable, blessable by a human", () => {
    const s = createSession();
    const agent = s.join('agent', 'claude', 0);

    // Human draws one circle; the agent draws the other and the connector.
    const h = s.addStroke(circleStroke(250, 300, 40), 1000);
    const a1 = s.addStroke(circleStroke(390, 300, 40), 2000, agent);
    const a2 = s.addStroke(lineStroke({ x: 295, y: 300 }, { x: 345, y: 300 }, 60), 3000, agent);

    // Agent ink is held and interpreted exactly like human ink.
    let state = s.getState();
    expect(topInterpretation(state.nodes.get(a1)!)).toBe('circle');
    expect(topInterpretation(state.nodes.get(a2)!)).toBe('line');

    // Human lassos the mixed-authorship group and blesses it.
    s.addStroke(circleStroke(320, 300, 160), 4000);
    s.addStroke(checkStroke(490, 320), 5000);
    state = s.getState();
    expect([...state.summon!.enclosedIds].sort()).toEqual([h, a1, a2].sort());

    const artifactId = s.bless({ summonId: state.summon!.id, name: 'link', at: 6000 })!;
    state = s.getState();
    expect(state.artifacts).toEqual([artifactId]);
    // The artifact holds strokes from both participants, attribution intact.
    const authors = state.summon === null &&
      [h, a1, a2].map((id) => state.nodes.get(id)!.edges.find((e) => e.rel === 'made-by')!.to);
    expect(authors).toEqual([LOCAL_PARTICIPANT, agent, agent]);
  });

  it('an agent can summon and bless too — gestures are not human-only', () => {
    const s = createSession();
    const agent = s.join('agent', 'claude', 0);
    s.addStroke(circleStroke(300, 300, 40), 1000);
    s.addStroke(circleStroke(300, 300, 150), 2000, agent); // agent lassos
    s.addStroke(checkStroke(460, 300), 3000, agent); // agent checks

    let state = s.getState();
    expect(state.summon).not.toBeNull();

    const artifactId = s.bless({
      summonId: state.summon!.id,
      name: 'bubble',
      at: 4000,
      participantId: agent,
    })!;
    state = s.getState();
    const artifact = state.nodes.get(artifactId)!;
    expect(artifact.reps.find((r) => r.modality === 'word')!.source).toBe(agent);
  });
});

describe('propose — the channel LLM tiers plug into', () => {
  it('a proposal is held as an attributed, unblessed edge and can re-rank the reading', () => {
    const s = createSession();
    const agent = s.join('agent', 'claude-haiku', 0);
    const id = s.addStroke(circleStroke(200, 200, 40), 1000); // tier0 says circle @0.8

    s.propose({
      participantId: agent,
      nodeId: id,
      edges: [{ to: 'type:rectangle', rel: 'resembles', weight: 0.95 }],
      at: 2000,
    });

    const state = s.getState();
    const node = state.nodes.get(id)!;
    const top = resemblances(node)[0];
    // Multi-parse at work: the stronger proposal re-ranks the held reading…
    expect(top.to).toBe('type:rectangle');
    expect(top.via).toBe(agent);
    expect(top.blessed).toBeFalsy();
    // …but nothing was committed, and the prior candidate is still held.
    expect(state.artifacts).toHaveLength(0);
    expect(resemblances(node).some((e) => e.to === 'type:circle')).toBe(true);
  });

  it('proposals from unregistered participants are ignored', () => {
    const s = createSession();
    const id = s.addStroke(circleStroke(200, 200, 40), 0);
    s.propose({
      participantId: 'participant:nobody',
      nodeId: id,
      edges: [{ to: 'type:line', rel: 'resembles', weight: 1 }],
      at: 1000,
    });
    expect(topInterpretation(s.getState().nodes.get(id)!)).toBe('circle');
  });

  it('undo removes a proposal — replay covers the new events', () => {
    const s = createSession();
    const agent = s.join('agent', 'claude', 0);
    const id = s.addStroke(circleStroke(200, 200, 40), 1000);
    s.propose({
      participantId: agent,
      nodeId: id,
      edges: [{ to: 'type:rectangle', rel: 'resembles', weight: 0.95 }],
      at: 2000,
    });
    expect(topInterpretation(s.getState().nodes.get(id)!)).toBe('rectangle');

    s.undo();
    const state = s.getState();
    expect(topInterpretation(state.nodes.get(id)!)).toBe('circle');
    expect(state.participants).toContain(agent); // the join survives
  });
});

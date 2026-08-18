// Stage C: the human asks on the canvas, and the answer lands IN the canvas.
//
// The properties under test are the ones that make this a canvas conversation
// rather than a chat box bolted to the side: answers are nodes, they are
// anchored to what they are about, they are attributed and unblessed, and
// several participants may answer the same question without any of them
// winning.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createSession } from '../session/session';
import {
  isExplanation,
  explanationOf,
  aboutIdsOf,
  boundsOf,
  getRep,
} from '../session/nodes';
import { createAgentParticipant } from './agent';
import { PRESETS } from '../llm/provider';
import { circleStroke, lineStroke } from '../test/strokes';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

function stubOpenAI(content: string) {
  globalThis.fetch = vi.fn(async () =>
    new Response(JSON.stringify({ model: 'stub', choices: [{ message: { content } }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  ) as unknown as typeof fetch;
}

const local = { ...PRESETS.ollama, model: 'qwen3' } as const;

function threeCirclesAndTwoLines() {
  const s = createSession();
  const ids = [
    s.addStroke(circleStroke(300, 300, 34), 1000),
    s.addStroke(circleStroke(430, 300, 34), 1010),
    s.addStroke(circleStroke(365, 410, 34), 1020),
    s.addStroke(lineStroke({ x: 336, y: 300 }, { x: 394, y: 300 }), 1030),
    s.addStroke(lineStroke({ x: 320, y: 332 }, { x: 352, y: 378 }), 1040),
  ];
  return { s, ids };
}

describe('an answer is a node in the canvas', () => {
  it('places the answer, attributed and anchored to the marks it is about', async () => {
    const { s, ids } = threeCirclesAndTwoLines();
    stubOpenAI('These three closed shapes are each joined by strokes that touch two of them.');

    const agent = createAgentParticipant(s, local, 1100);
    const res = await agent.ask('why these?', ids, 1200);

    expect(res.ok).toBe(true);
    expect(res.explanationId).toBeTruthy();

    const state = s.getState();
    const node = state.nodes.get(res.explanationId!)!;

    expect(isExplanation(node)).toBe(true);
    expect(explanationOf(node)!.question).toBe('why these?');
    expect(explanationOf(node)!.text).toContain('closed shapes');
    // Anchored: it knows exactly which marks it speaks for.
    expect(aboutIdsOf(node).sort()).toEqual(ids.slice().sort());
    // Attributed to the agent, and the attribution is blessed (it really said it).
    expect(node.edges.find((e) => e.rel === 'made-by')!.to).toBe(agent.id);
    expect(node.edges.find((e) => e.rel === 'made-by')!.blessed).toBe(true);
  });

  it('is UNBLESSED about its subject — ignoring an answer is a valid response', async () => {
    const { s, ids } = threeCirclesAndTwoLines();
    stubOpenAI('An answer.');
    const agent = createAgentParticipant(s, local, 1100);
    const res = await agent.ask('what is this?', ids, 1200);

    const node = s.getState().nodes.get(res.explanationId!)!;
    // The `about` claim is inference, not a commitment the human made.
    expect(node.edges.filter((e) => e.rel === 'about').every((e) => !e.blessed)).toBe(true);
  });

  it('is placed beside its subject, not on top of it', async () => {
    const { s, ids } = threeCirclesAndTwoLines();
    stubOpenAI('An answer.');
    const agent = createAgentParticipant(s, local, 1100);
    const res = await agent.ask('why?', ids, 1200);

    const state = s.getState();
    const explanation = boundsOf(state.nodes.get(res.explanationId!)!)!;
    const subject = ids.map((i) => boundsOf(state.nodes.get(i)!)!);
    const rightmost = Math.max(...subject.map((b) => b.maxX));

    expect(explanation.minX).toBeGreaterThan(rightmost);
  });

  it('carries the answering participant tier so surfaces can group it', async () => {
    const { s, ids } = threeCirclesAndTwoLines();
    stubOpenAI('An answer.');
    const hosted = createAgentParticipant(
      s, { ...PRESETS.openRouter, model: 'hosted', apiKey: 'k' }, 1100
    );
    const res = await hosted.ask('why?', ids, 1200);

    expect(s.getState().nodes.get(res.explanationId!)!.capability).toBe(2);
  });
});

describe('explanations are a plane of their own', () => {
  it('does not join the content plane, so it is never lassoed or clustered as ink', async () => {
    const { s, ids } = threeCirclesAndTwoLines();
    const contentBefore = s.getState().contentIds.length;

    stubOpenAI('An answer.');
    const agent = createAgentParticipant(s, local, 1100);
    const res = await agent.ask('why?', ids, 1200);

    const state = s.getState();
    expect(state.contentIds).toHaveLength(contentBefore);
    expect(state.contentIds).not.toContain(res.explanationId);
    expect(state.explanations).toContain(res.explanationId);
  });

  it('can be erased like anything else', async () => {
    const { s, ids } = threeCirclesAndTwoLines();
    stubOpenAI('An answer.');
    const agent = createAgentParticipant(s, local, 1100);
    const res = await agent.ask('why?', ids, 1200);

    s.erase(res.explanationId!, 1300);
    const node = s.getState().nodes.get(res.explanationId!)!;
    expect(getRep(node, 'erased')).toBeTruthy();
  });
});

describe('several participants may answer the same question', () => {
  it('holds every answer — none replaces another', async () => {
    const { s, ids } = threeCirclesAndTwoLines();

    stubOpenAI('The lines connect the circles pairwise.');
    const a = createAgentParticipant(s, { ...PRESETS.ollama, model: 'qwen3' }, 1100);
    const ra = await a.ask('why these?', ids, 1200);

    stubOpenAI('It reads as a graph: three nodes, two edges.');
    const b = createAgentParticipant(s, { ...PRESETS.openRouter, model: 'hosted', apiKey: 'k' }, 1210);
    const rb = await b.ask('why these?', ids, 1220);

    const state = s.getState();
    expect(state.explanations).toHaveLength(2);
    expect(state.explanations).toContain(ra.explanationId);
    expect(state.explanations).toContain(rb.explanationId);

    // Two voices, two tiers, same question — both on the record.
    const tiers = state.explanations.map((id) => state.nodes.get(id)!.capability);
    expect(tiers.sort()).toEqual([1, 2]);
  });
});

describe('failure never breaks the canvas', () => {
  it('places nothing when the model is unreachable', async () => {
    const { s, ids } = threeCirclesAndTwoLines();
    globalThis.fetch = vi.fn(async () => new Response('down', { status: 503 })) as unknown as typeof fetch;

    const agent = createAgentParticipant(s, local, 1100);
    const res = await agent.ask('why?', ids, 1200);

    expect(res.ok).toBe(false);
    expect(s.getState().explanations).toHaveLength(0);
  });

  it('rejects an empty question and an empty answer', async () => {
    const { s, ids } = threeCirclesAndTwoLines();
    const agent = createAgentParticipant(s, local, 1100);

    expect((await agent.ask('   ', ids, 1200)).ok).toBe(false);

    stubOpenAI('   ');
    expect((await agent.ask('why?', ids, 1200)).ok).toBe(false);
    expect(s.getState().explanations).toHaveLength(0);
  });

  it('ignores an answer from a participant that never joined', () => {
    const { s, ids } = threeCirclesAndTwoLines();
    const placed = s.answer({
      participantId: 'participant:ghost',
      question: 'why?',
      text: 'because',
      aboutIds: ids,
      at: 1200,
    });
    expect(placed).toBeNull();
    expect(s.getState().explanations).toHaveLength(0);
  });
});

describe('the question is grounded in the graph', () => {
  it('sends measurements, relations and rival readings — never an image', async () => {
    const { s, ids } = threeCirclesAndTwoLines();

    let sent = '';
    globalThis.fetch = vi.fn(async (_u: unknown, init?: RequestInit) => {
      sent = String(init?.body ?? '');
      return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }),
        { status: 200, headers: { 'content-type': 'application/json' } });
    }) as unknown as typeof fetch;

    const agent = createAgentParticipant(s, local, 1100);
    await agent.ask('why these?', ids, 1200);

    expect(sent).toContain('straightness');
    expect(sent).toContain('relations');
    expect(sent).toContain('tier0-heuristics');
    expect(sent).toContain('CITE THE EVIDENCE');
    expect(sent).toContain('Question: why these?');
    expect(sent.toLowerCase()).not.toContain('base64');
  });
});

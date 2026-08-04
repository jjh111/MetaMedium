// The agent adapter. No network: `complete()` is driven through a stub server
// via a patched global fetch, so these tests pin behaviour, not connectivity.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createSession } from '../session/session';
import { interpretationsOf, bySource, byTier, disagreement } from '../session/interpretations';
import { createAgentParticipant, parseReadings, readingsToEdges, MAX_READINGS } from './agent';
import { describeSession, describeSignature } from './serialize';
import { PRESETS, providerTier } from '../llm/provider';
import { circleStroke, lineStroke } from '../test/strokes';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

/** Stub an OpenAI-compatible server returning `content`. */
function stubOpenAI(content: string) {
  globalThis.fetch = vi.fn(async () =>
    new Response(JSON.stringify({ model: 'stub-model', choices: [{ message: { content } }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  ) as unknown as typeof fetch;
}

function stubFailure(status: number, body = 'nope') {
  globalThis.fetch = vi.fn(async () => new Response(body, { status })) as unknown as typeof fetch;
}

const localConfig = { ...PRESETS.ollama, model: 'qwen3' } as const;

describe('parseReadings — tolerant by necessity', () => {
  it('parses a clean array', () => {
    const r = parseReadings('[{"label":"circle","confidence":0.9,"reasoning":"closed"}]');
    expect(r).toHaveLength(1);
    expect(r[0]).toEqual({ label: 'circle', confidence: 0.9, reasoning: 'closed' });
  });

  it('survives code fences and surrounding prose from local models', () => {
    const r = parseReadings(
      'Sure! Here you go:\n```json\n[{"label":"wheel","confidence":0.4,"reasoning":"round"}]\n```\nHope that helps.'
    );
    expect(r).toHaveLength(1);
    expect(r[0].label).toBe('wheel');
  });

  it('ranks by confidence and keeps every reading', () => {
    const r = parseReadings(
      '[{"label":"a","confidence":0.2,"reasoning":"x"},' +
        '{"label":"b","confidence":0.9,"reasoning":"y"},' +
        '{"label":"c","confidence":0.5,"reasoning":"z"}]'
    );
    expect(r.map((x) => x.label)).toEqual(['b', 'c', 'a']);
  });

  it('clamps nonsense confidences instead of trusting them', () => {
    const r = parseReadings(
      '[{"label":"a","confidence":5,"reasoning":""},{"label":"b","confidence":-2,"reasoning":""}]'
    );
    expect(r.find((x) => x.label === 'a')!.confidence).toBe(1);
    expect(r.find((x) => x.label === 'b')!.confidence).toBe(0);
  });

  it('returns nothing rather than throwing on garbage', () => {
    expect(parseReadings('')).toEqual([]);
    expect(parseReadings('I cannot help with that.')).toEqual([]);
    expect(parseReadings('[{not json')).toEqual([]);
    expect(parseReadings('[{"confidence":0.9}]')).toEqual([]); // no label
  });
});

describe('readingsToEdges', () => {
  it('namespaces labels and carries confidence + reasoning through', () => {
    const edges = readingsToEdges(
      [{ label: 'Letter O', confidence: 0.6, reasoning: 'glyph-like' }],
      false
    );
    expect(edges[0].to).toBe('type:letter-o');
    expect(edges[0].rel).toBe('resembles');
    expect(edges[0].weight).toBe(0.6);
    expect(edges[0].reasoning).toBe('glyph-like');
  });

  it('always supplies a reason, even when the model omits one', () => {
    const edges = readingsToEdges([{ label: 'x', confidence: 0.5, reasoning: '' }], true);
    expect(edges[0].reasoning).toBeTruthy();
  });
});

describe('the agent as a participant', () => {
  it('joins as an agent and proposes EVERY reading it offered', async () => {
    const s = createSession();
    const id = s.addStroke(circleStroke(200, 200, 40), 1000);

    stubOpenAI(
      '[{"label":"circle","confidence":0.9,"reasoning":"closed and smooth"},' +
        '{"label":"letter-o","confidence":0.6,"reasoning":"glyph-sized"},' +
        '{"label":"wheel","confidence":0.3,"reasoning":"round"}]'
    );

    const agent = createAgentParticipant(s, localConfig, 1100);
    const result = await agent.interpret([id], 1200);

    expect(result.ok).toBe(true);
    expect(result.readings).toHaveLength(3);

    // All three land on the node, attributed to the agent — none collapsed.
    const node = s.getState().nodes.get(id)!;
    const fromAgent = interpretationsOf(node, s.getState().nodes).filter(
      (r) => r.source === agent.id
    );
    expect(fromAgent).toHaveLength(3);
    expect(fromAgent.every((r) => r.sourceName === 'llm:qwen3')).toBe(true);
    expect(fromAgent.every((r) => r.reasoning)).toBe(true);
  });

  it('sits BESIDE tier 0 rather than replacing it', async () => {
    const s = createSession();
    const id = s.addStroke(circleStroke(200, 200, 40), 1000);

    stubOpenAI('[{"label":"letter-o","confidence":0.95,"reasoning":"reads as a glyph"}]');
    const agent = createAgentParticipant(s, localConfig, 1100);
    await agent.interpret([id], 1200);

    const node = s.getState().nodes.get(id)!;
    const groups = bySource(interpretationsOf(node, s.getState().nodes));

    // Even at 0.95 the model does not evict the engine's own reading.
    expect(groups.map((g) => g.label).sort()).toEqual(['llm:qwen3', 'tier0-heuristics']);

    const d = disagreement(interpretationsOf(node, s.getState().nodes));
    expect(d?.crossSource).toBe(true);
  });

  it('holds two models in the same tier without merging them', async () => {
    const s = createSession();
    const id = s.addStroke(circleStroke(200, 200, 40), 1000);

    stubOpenAI('[{"label":"ring","confidence":0.8,"reasoning":"a"}]');
    const a = createAgentParticipant(s, { ...PRESETS.ollama, model: 'qwen3' }, 1100);
    await a.interpret([id], 1200);

    stubOpenAI('[{"label":"hoop","confidence":0.7,"reasoning":"b"}]');
    const b = createAgentParticipant(s, { ...PRESETS.lmStudio, model: 'llama3' }, 1210);
    await b.interpret([id], 1220);

    const node = s.getState().nodes.get(id)!;
    const labels = interpretationsOf(node, s.getState().nodes).map((r) => r.label);
    expect(labels).toContain('ring');
    expect(labels).toContain('hoop');
    expect(bySource(interpretationsOf(node, s.getState().nodes))).toHaveLength(3);
  });

  it('degrades to Tier 0 on a failed call and leaves the session untouched', async () => {
    const s = createSession();
    const id = s.addStroke(circleStroke(200, 200, 40), 1000);
    const before = interpretationsOf(s.getState().nodes.get(id)!, s.getState().nodes).length;

    stubFailure(500);
    const agent = createAgentParticipant(s, localConfig, 1100);
    const result = await agent.interpret([id], 1200);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('500');
    // Tier 0's readings are intact; nothing was added or removed.
    const after = interpretationsOf(s.getState().nodes.get(id)!, s.getState().nodes).length;
    expect(after).toBe(before);
  });

  it('treats an unparseable reply as a failure, not a crash', async () => {
    const s = createSession();
    const id = s.addStroke(circleStroke(200, 200, 40), 1000);

    stubOpenAI('I am not going to answer in JSON today.');
    const agent = createAgentParticipant(s, localConfig, 1100);
    const result = await agent.interpret([id], 1200);

    expect(result.ok).toBe(false);
    expect(result.error).toBe('no parseable readings');
    expect(result.raw).toBeTruthy(); // kept for debugging
  });

  it('reads a multi-stroke group and proposes composition readings', async () => {
    const s = createSession();
    const ids = [
      s.addStroke(circleStroke(300, 300, 34), 1000),
      s.addStroke(circleStroke(430, 300, 34), 1010),
      s.addStroke(circleStroke(365, 410, 34), 1020),
      s.addStroke(lineStroke({ x: 336, y: 300 }, { x: 394, y: 300 }), 1030),
      s.addStroke(lineStroke({ x: 320, y: 332 }, { x: 352, y: 378 }), 1040),
    ];

    stubOpenAI(
      '[{"label":"molecule","confidence":0.8,"reasoning":"three nodes joined by bonds"},' +
        '{"label":"network","confidence":0.6,"reasoning":"nodes and edges"}]'
    );

    const agent = createAgentParticipant(s, localConfig, 1100);
    const result = await agent.interpret(ids, 1200);

    expect(result.ok).toBe(true);
    expect(result.readings.map((r) => r.label)).toEqual(['molecule', 'network']);
  });

  it('is unregistered-safe — nothing lands without a join', async () => {
    const s = createSession();
    const id = s.addStroke(circleStroke(200, 200, 40), 1000);
    const before = s.getState().nodes.get(id)!.edges.length;

    // The engine ignores proposals from participants it does not know.
    s.propose({
      participantId: 'participant:never-joined',
      nodeId: id,
      edges: [{ to: 'type:x', rel: 'resembles', weight: 1, reasoning: 'should not land' }],
      at: 1200,
    });

    expect(s.getState().nodes.get(id)!.edges.length).toBe(before);
  });
});

describe('the prompt sends grounded facts, not pixels', () => {
  it('describes measured geometry, position, and existing readings', () => {
    const s = createSession();
    const id = s.addStroke(circleStroke(200, 200, 40), 1000);
    const text = describeSession(s.getState(), { nodeIds: [id] });

    expect(text).toContain('straightness');
    expect(text).toContain('corner(s)');
    expect(text).toContain('read as:');
    expect(text).toContain('tier0-heuristics');
    // Never an image reference — the commitment is grounded-not-pixels.
    expect(text.toLowerCase()).not.toContain('base64');
    expect(text.toLowerCase()).not.toContain('image');
  });

  it('carries disagreement into the prompt so the model can respond to it', async () => {
    const s = createSession();
    const id = s.addStroke(circleStroke(200, 200, 40), 1000);

    stubOpenAI('[{"label":"letter-o","confidence":0.7,"reasoning":"glyph"}]');
    const a = createAgentParticipant(s, localConfig, 1100);
    await a.interpret([id], 1200);

    const text = describeSession(s.getState(), { nodeIds: [id] });
    expect(text).toContain('llm:qwen3');
    expect(text).toContain('tier0-heuristics');
    expect(text).toContain('letter-o');
  });

  it('summarises a group as a type histogram', () => {
    const s = createSession();
    const ids = [
      s.addStroke(circleStroke(300, 300, 34), 1000),
      s.addStroke(circleStroke(430, 300, 34), 1010),
      s.addStroke(lineStroke({ x: 336, y: 300 }, { x: 394, y: 300 }), 1020),
    ];
    const sig = describeSignature(s.getState(), ids);
    expect(sig).toMatch(/\d+×/);
  });

  it('says so plainly when there is nothing to describe', () => {
    const s = createSession();
    expect(describeSession(s.getState())).toBe('(nothing on the canvas)');
  });
});

describe('tiers label the voice', () => {
  it('joins a local model at tier 1 and a hosted one at tier 2', async () => {
    const s = createSession();
    const id = s.addStroke(circleStroke(200, 200, 40), 1000);

    stubOpenAI('[{"label":"ring","confidence":0.7,"reasoning":"a"}]');
    const local = createAgentParticipant(s, { ...PRESETS.ollama, model: 'qwen3' }, 1100);
    await local.interpret([id], 1200);

    stubOpenAI('[{"label":"glyph","confidence":0.8,"reasoning":"b"}]');
    const hosted = createAgentParticipant(
      s, { ...PRESETS.openRouter, model: 'some/model', apiKey: 'k' }, 1210
    );
    await hosted.interpret([id], 1220);

    const node = s.getState().nodes.get(id)!;
    const tiers = byTier(interpretationsOf(node, s.getState().nodes));

    // Three tiers present at once: engine 0, local 1, hosted 2 — none hidden.
    expect(tiers.map((g) => g.key)).toEqual([0, 1, 2]);
    expect(tiers.find((g) => g.key === 1)!.interpretations[0].sourceName).toBe('llm:qwen3');
    expect(tiers.find((g) => g.key === 2)!.interpretations[0].sourceName).toBe('llm:some/model');
  });

  it('reads localhost as tier 1 regardless of port, and anything else as tier 2', () => {
    expect(providerTier({ kind: 'openai-compatible', baseUrl: 'http://localhost:11434/v1', model: 'm' })).toBe(1);
    expect(providerTier({ kind: 'openai-compatible', baseUrl: 'http://127.0.0.1:1234/v1', model: 'm' })).toBe(1);
    expect(providerTier({ kind: 'openai-compatible', baseUrl: 'https://openrouter.ai/api/v1', model: 'm' })).toBe(2);
    expect(providerTier({ kind: 'anthropic', baseUrl: 'https://api.anthropic.com/v1', model: 'm' })).toBe(2);
  });
});

describe('the multi-interpretation contract', () => {
  it('instructs the model to offer several readings, never one', async () => {
    const s = createSession();
    const id = s.addStroke(circleStroke(200, 200, 40), 1000);

    let sentBody = '';
    globalThis.fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
      sentBody = String(init?.body ?? '');
      return new Response(
        JSON.stringify({ choices: [{ message: { content: '[{"label":"x","confidence":0.5,"reasoning":"y"}]' } }] }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }) as unknown as typeof fetch;

    const agent = createAgentParticipant(s, localConfig, 1100);
    await agent.interpret([id], 1200);

    expect(sentBody).toContain('INTERPRETATIONS, not answers');
    expect(sentBody).toContain(`between 1 and ${MAX_READINGS}`);
    expect(sentBody).toContain('Disagreement is a signal');
    expect(sentBody).toContain('Offer several readings');
  });
});

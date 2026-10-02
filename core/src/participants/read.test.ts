// Handwriting, read by a model that can see — v7 Stage E.
//
// The one place pixels are sent. Pinned here: the image goes out as an
// `image_url` part, what comes back lands as held transcript reps on the mark,
// a model that cannot see is never asked, and the brief for generation carries
// the words.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createSession } from '../session/session';
import { createAgentParticipant, parseTranscripts } from './agent';
import { transcriptsOf, transcriptOf } from '../session/nodes';
import { PRESETS } from '../llm/provider';
import { rectStroke, handText, circleStroke, checkStroke } from '../test/strokes';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

let lastBody: Record<string, unknown> | null = null;
function stub(content: string) {
  lastBody = null;
  globalThis.fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
    lastBody = JSON.parse(String(init?.body ?? '{}'));
    return new Response(JSON.stringify({ model: 'stub', choices: [{ message: { content } }] }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
}

const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const seeing = { ...PRESETS.ollama, model: 'qwen3.5:9b', vision: true } as const;
const blind = { ...PRESETS.ollama, model: 'qwen3:8b' } as const;

describe('parseTranscripts', () => {
  it('reads the documented shape, ranked', () => {
    const t = parseTranscripts('[{"text":"Pricing","confidence":0.9},{"text":"Prizing","confidence":0.3}]');
    expect(t.map((x) => x.text)).toEqual(['Pricing', 'Prizing']);
  });
  it('accepts a bare word from a model that skipped the JSON', () => {
    expect(parseTranscripts('"Pricing"')).toEqual([{ text: 'Pricing', confidence: 0.5 }]);
  });
  it('rejects prose', () => {
    expect(parseTranscripts('The image shows a word.\nIt might say pricing.')).toEqual([]);
  });
});

describe('agent.read', () => {
  it('sends the ink as an image and holds every transcript on the mark, attributed', async () => {
    const s = createSession();
    const id = s.addStroke(handText(100, 100, 200, 40, { seed: 1 }), 1000);
    stub('[{"text":"Pricing","confidence":0.9},{"text":"Pricing!","confidence":0.4}]');
    const agent = createAgentParticipant(s, seeing, 1500);
    const res = await agent.read({ nodeId: id, image: PNG, at: 2000 });
    expect(res.ok).toBe(true);

    const msgs = lastBody!.messages as { role: string; content: unknown }[];
    const user = msgs.find((m) => m.role === 'user')!.content as { type: string; image_url?: { url: string } }[];
    expect(user.some((p) => p.type === 'image_url' && p.image_url?.url === PNG)).toBe(true);

    const node = s.getState().nodes.get(id)!;
    const held = transcriptsOf(node);
    expect(held.map((t) => t.text)).toEqual(['Pricing', 'Pricing!']);
    expect(held[0].source).toBe(agent.id);
    expect(transcriptOf(node)).toBe('Pricing');
  });

  it('never asks a model that cannot see', async () => {
    const s = createSession();
    const id = s.addStroke(handText(100, 100, 200, 40, { seed: 2 }), 1000);
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    const agent = createAgentParticipant(s, blind, 1500);
    const res = await agent.read({ nodeId: id, image: PNG, at: 2000 });
    expect(res.ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(transcriptsOf(s.getState().nodes.get(id)!)).toEqual([]);
  });

  it('undo drops the transcript — it was a proposal', async () => {
    const s = createSession();
    const id = s.addStroke(handText(100, 100, 200, 40, { seed: 3 }), 1000);
    stub('[{"text":"Pricing","confidence":0.9}]');
    const agent = createAgentParticipant(s, seeing, 1500);
    await agent.read({ nodeId: id, image: PNG, at: 2000 });
    s.undo();
    expect(transcriptOf(s.getState().nodes.get(id)!)).toBeUndefined();
  });
});

describe('the words reach the brief', () => {
  it('a read label is handed to generation as the title of what it labels', async () => {
    const s = createSession();
    s.addStroke(rectStroke(50, 50, 600, 400), 1000);
    const box = s.addStroke(rectStroke(80, 160, 250, 200), 1100);
    const word = s.addStroke(handText(110, 200, 150, 36, { seed: 4 }), 1200);
    expect(box).toBeTruthy();
    stub('[{"text":"Pricing","confidence":0.9}]');
    const agent = createAgentParticipant(s, seeing, 1300);
    await agent.read({ nodeId: word, image: PNG, at: 1400 });

    s.addStroke(circleStroke(350, 250, 420), 2000);
    s.addStroke(checkStroke(820, 250), 2500);
    const id = s.bless({ summonId: s.getState().summon!.id, name: 'page', at: 3000 })!;

    stub(JSON.stringify({ regions: { r1: { html: 'a' }, r2: { html: 'b' }, r3: { html: 'c' } } }));
    const res = await agent.generate({ prompt: 'a page', artifactId: id, at: 4000 });
    expect(res.ok).toBe(true);
    const u = String((lastBody!.messages as { role: string; content: string }[]).find((m) => m.role === 'user')!.content);
    expect(u).toMatch(/label for r2 — the human wrote "Pricing" there/);
  });
});

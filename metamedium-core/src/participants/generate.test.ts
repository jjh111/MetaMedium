// Diagram → living code. No network: `complete()` is driven through a stub
// server via a patched global fetch, so these tests pin behaviour, not
// connectivity.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createSession } from '../session/session';
import { createAgentParticipant, parseCode } from './agent';
import { describeRegions, describeAddressed } from './serialize';
import { frameOf, regionsOf } from '../session/regions';
import { getRep } from '../session/nodes';
import { PRESETS } from '../llm/provider';
import { rectStroke, circleStroke, checkStroke } from '../test/strokes';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

let lastBody: Record<string, unknown> | null = null;

function stubOpenAI(content: string) {
  lastBody = null;
  globalThis.fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
    lastBody = JSON.parse(String(init?.body ?? '{}'));
    return new Response(JSON.stringify({ model: 'stub', choices: [{ message: { content } }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
}

function stubFailure(status: number) {
  globalThis.fetch = vi.fn(async () => new Response('down', { status })) as unknown as typeof fetch;
}

const config = { ...PRESETS.ollama, model: 'qwen3' } as const;
const userPrompt = () =>
  String((lastBody?.messages as { role: string; content: string }[]).find((m) => m.role === 'user')!.content);
const systemPrompt = () =>
  String((lastBody?.messages as { role: string; content: string }[]).find((m) => m.role === 'system')!.content);

// Two boxes side by side, blessed — the MVP's opening move.
function board() {
  const s = createSession();
  s.addStroke(rectStroke(100, 100, 200, 120), 1000);
  s.addStroke(rectStroke(340, 100, 200, 120), 1100);
  s.addStroke(circleStroke(320, 160, 300), 2000);
  s.addStroke(checkStroke(650, 160), 2500);
  const id = s.bless({ summonId: s.getState().summon!.id, name: 'page', at: 3000 })!;
  return { s, id };
}

describe('parseCode — tolerant by necessity', () => {
  it('takes plain HTML', () => {
    expect(parseCode('<div>hi</div>')).toBe('<div>hi</div>');
  });

  it('unwraps a code fence', () => {
    expect(parseCode('```html\n<div>hi</div>\n```')).toBe('<div>hi</div>');
  });

  it('drops the preamble models add despite being told not to', () => {
    expect(parseCode('Sure! Here is your page:\n\n<section>x</section>\n\nHope that helps!')).toBe(
      '<section>x</section>'
    );
  });

  it('returns empty rather than throwing on a reply with no markup', () => {
    expect(parseCode('I cannot do that.')).toBe('');
    expect(parseCode('')).toBe('');
  });
});

describe('describeRegions — the layout contract', () => {
  it('states the frame and every region in local pixels', () => {
    const { s, id } = board();
    const artifact = s.getState().nodes.get(id)!;
    const text = describeRegions(regionsOf(artifact, s.getState().nodes), frameOf(artifact)!);
    expect(text).toContain('FRAME:');
    expect(text).toMatch(/r1: x=\d+ y=\d+ w=\d+ h=\d+/);
    expect(text).toContain('r2:');
  });

  it('says so plainly when nothing was drawn to constrain it', () => {
    expect(describeRegions([], { x: 0, y: 0, w: 100, h: 100 })).toContain('freely');
  });
});

describe('generate — build', () => {
  it('attaches code to the artifact and makes it live', async () => {
    const { s, id } = board();
    stubOpenAI('<section data-region="r1">A</section>');
    const agent = createAgentParticipant(s, config, 3100);

    const r = await agent.generate({ prompt: 'a landing page', artifactId: id, at: 3200 });
    expect(r.ok).toBe(true);
    expect(r.revised).toBe(false);
    expect(s.getState().live).toEqual([id]);
    expect((getRep(s.getState().nodes.get(id)!, 'code')!.data as { code: string }).code).toContain('data-region');
  });

  it('sends the drawn geometry as a contract, not a suggestion', async () => {
    const { s, id } = board();
    stubOpenAI('<div></div>');
    const agent = createAgentParticipant(s, config, 3100);
    await agent.generate({ prompt: 'a page', artifactId: id, at: 3200 });

    expect(userPrompt()).toContain('REGIONS the human drew');
    expect(userPrompt()).toMatch(/r1: x=\d+/);
    expect(systemPrompt()).toContain('THE REGIONS ARE NOT SUGGESTIONS');
    expect(systemPrompt()).toContain('data-region');
  });

  it('sends no image — grounded facts only', async () => {
    const { s, id } = board();
    stubOpenAI('<div></div>');
    const agent = createAgentParticipant(s, config, 3100);
    await agent.generate({ prompt: 'a page', artifactId: id, at: 3200 });
    expect(JSON.stringify(lastBody)).not.toMatch(/image_url|base64|data:image/);
  });

  it('degrades rather than throwing when the model is offline', async () => {
    const { s, id } = board();
    stubFailure(503);
    const agent = createAgentParticipant(s, config, 3100);

    const r = await agent.generate({ prompt: 'a page', artifactId: id, at: 3200 });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('503');
    expect(s.getState().live).toEqual([]); // canvas untouched
  });

  it('rejects a reply with no usable markup, and keeps the artifact clean', async () => {
    const { s, id } = board();
    stubOpenAI('I would rather not.');
    const agent = createAgentParticipant(s, config, 3100);
    const r = await agent.generate({ prompt: 'a page', artifactId: id, at: 3200 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/no usable code/);
    expect(s.getState().live).toEqual([]);
  });

  it('refuses an empty prompt and an unknown artifact', async () => {
    const { s, id } = board();
    stubOpenAI('<div></div>');
    const agent = createAgentParticipant(s, config, 3100);
    expect((await agent.generate({ prompt: '   ', artifactId: id, at: 1 })).error).toBe('no prompt');
    expect((await agent.generate({ prompt: 'x', artifactId: 'nope', at: 1 })).error).toBe('no such artifact');
  });
});

describe('generate — revise', () => {
  async function built() {
    const { s, id } = board();
    stubOpenAI('<section data-region="r1">first</section>');
    const agent = createAgentParticipant(s, config, 3100);
    await agent.generate({ prompt: 'a page', artifactId: id, at: 3200 });
    return { s, id, agent };
  }

  it('a second prompt on a live artifact revises rather than rebuilds', async () => {
    const { id, agent } = await built();
    stubOpenAI('<section data-region="r1">second</section>');

    const r = await agent.generate({ prompt: 'make it blue', artifactId: id, at: 3300, addressed: ['r1'] });
    expect(r.ok).toBe(true);
    expect(r.revised).toBe(true);
    expect(systemPrompt()).toContain('revising code');
    expect(userPrompt()).toContain('EXISTING CODE:');
    expect(userPrompt()).toContain('first'); // the previous code went along
  });

  it('tells the model exactly which regions the ink landed on', async () => {
    const { id, agent } = await built();
    stubOpenAI('<div></div>');
    await agent.generate({ prompt: 'bigger', artifactId: id, at: 3300, addressed: ['r2'] });
    expect(userPrompt()).toContain('The mark lands on:');
    expect(userPrompt()).toContain('r2');
    expect(userPrompt()).toContain('Leave the rest of the code as it is.');
  });

  it('falls back to the whole artifact when the ink hit no region', async () => {
    const { id, agent } = await built();
    stubOpenAI('<div></div>');
    await agent.generate({ prompt: 'darker', artifactId: id, at: 3300, addressed: [] });
    expect(userPrompt()).toContain('addressing the whole artifact');
  });

  it('keeps every version — revision is a proposal, not an overwrite', async () => {
    const { s, id, agent } = await built();
    stubOpenAI('<section data-region="r1">second</section>');
    await agent.generate({ prompt: 'again', artifactId: id, at: 3300 });

    const codes = s.getState().nodes.get(id)!.reps.filter((r) => r.modality === 'code');
    expect(codes).toHaveLength(2);
    expect(String((codes[0].data as { code: string }).code)).toContain('first');
    expect(String((codes[1].data as { code: string }).code)).toContain('second');
  });

  it('a failed revision leaves the working version in place', async () => {
    const { s, id, agent } = await built();
    stubFailure(500);
    const r = await agent.generate({ prompt: 'break it', artifactId: id, at: 3300 });
    expect(r.ok).toBe(false);
    expect(s.getState().live).toEqual([id]);
    const codes = s.getState().nodes.get(id)!.reps.filter((x) => x.modality === 'code');
    expect(codes).toHaveLength(1);
  });
});

describe('describeAddressed', () => {
  it('names the regions the mark covers', () => {
    const { s, id } = board();
    const artifact = s.getState().nodes.get(id)!;
    const regions = regionsOf(artifact, s.getState().nodes);
    expect(describeAddressed(regions, [regions[0].id])).toContain(regions[0].id);
  });
});

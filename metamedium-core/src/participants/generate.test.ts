// Diagram → living code. No network: `complete()` is driven through a stub
// server via a patched global fetch, so these tests pin behaviour, not
// connectivity.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createSession } from '../session/session';
import { createAgentParticipant, parseCode, parseFill } from './agent';
import { frameOf, regionsOf } from '../session/regions';
import { parseLayout } from '../parse/layout';
import { buildScaffold, validateRegions } from '../parse/scaffold';

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

/** A model reply in the fill contract. */
const fillReply = (regions: Record<string, unknown>, theme?: Record<string, string>) =>
  JSON.stringify({ theme: theme ?? { background: '#fff', color: '#111' }, regions });

describe('parseFill — tolerant by necessity', () => {
  it('parses the documented shape', () => {
    const f = parseFill(fillReply({ r1: { tag: 'header', html: '<h1>Hi</h1>', style: 'padding:8px' } }))!;
    expect(f.regions.r1).toEqual({ tag: 'header', html: '<h1>Hi</h1>', style: 'padding:8px' });
    expect(f.theme?.background).toBe('#fff');
  });

  it('survives fences and preamble', () => {
    const f = parseFill('Sure!\n```json\n' + fillReply({ r1: { html: '<p>x</p>' } }) + '\n```\nHope that helps.')!;
    expect(f.regions.r1.html).toBe('<p>x</p>');
  });

  it('accepts a bare id → html map, which is what smaller models reach for', () => {
    const f = parseFill('{"r1":"<h1>A</h1>","r2":"<p>B</p>"}')!;
    expect(Object.keys(f.regions)).toEqual(['r1', 'r2']);
    expect(f.regions.r2.html).toBe('<p>B</p>');
  });

  it('ignores keys that are not region ids, and entries with no html', () => {
    const f = parseFill('{"regions":{"r1":{"html":"<p>ok</p>"},"notes":"blah","r2":{"tag":"div"}}}')!;
    expect(Object.keys(f.regions)).toEqual(['r1']);
  });

  // Every repair below is here because a real local model produced it.
  it('accepts JavaScript template literals, which is what devstral writes', () => {
    // Asked for JSON whose values are HTML full of double quotes, it reaches
    // for a backtick rather than escaping. This was the single failure mode
    // that stopped real generation working end to end.
    const reply =
      '{"theme":{"background":"#fff"},"regions":\n' +
      '  {"r1":{"tag":"header","style":"padding:20px;",\n' +
      '        "html":`<h1>Welcome</h1><p style="color:#6c757d;">Sub</p>`},\n' +
      '   "r2":{"tag":"article","html":`<h2>Features</h2>`}}}';
    const f = parseFill(reply)!;
    expect(f.regions.r1.html).toBe('<h1>Welcome</h1><p style="color:#6c757d;">Sub</p>');
    expect(f.regions.r2.tag).toBe('article');
    expect(f.theme?.background).toBe('#fff');
  });

  it('is not confused by braces inside a template literal', () => {
    const f = parseFill('{"regions":{"r1":{"html":`<p>{ not the end }</p>`}}}')!;
    expect(f.regions.r1.html).toBe('<p>{ not the end }</p>');
  });

  it('leaves a backtick inside a normal JSON string alone', () => {
    const f = parseFill('{"regions":{"r1":{"html":"<code>a ` b</code>"}}}')!;
    expect(f.regions.r1.html).toBe('<code>a ` b</code>');
  });

  it('forgives trailing commas', () => {
    const f = parseFill('{"regions":{"r1":{"html":"<p>x</p>",},},}')!;
    expect(f.regions.r1.html).toBe('<p>x</p>');
  });

  it('prefers strict JSON — a valid reply is never rewritten', () => {
    const f = parseFill('{"regions":{"r1":{"html":"a \\u0060 b"}}}')!;
    expect(f.regions.r1.html).toBe('a ` b');
  });

  it('returns null rather than throwing on junk', () => {
    expect(parseFill('I would rather not.')).toBeNull();
    expect(parseFill('{ broken')).toBeNull();
    expect(parseFill('')).toBeNull();
  });

  it('finds the object even when the html contains braces', () => {
    const f = parseFill('{"regions":{"r1":{"html":"<p style=\\"color:red\\">{a}</p>"}}}')!;
    expect(f.regions.r1.html).toContain('{a}');
  });
});

describe('buildScaffold — the engine owns structure', () => {
  function layoutFor(s: ReturnType<typeof createSession>, id: string) {
    const node = s.getState().nodes.get(id)!;
    return { layout: parseLayout(regionsOf(node, s.getState().nodes), frameOf(node)!), node };
  }

  it('emits one element per region, carrying its id', () => {
    const { s, id } = board();
    const { layout } = layoutFor(s, id);
    const code = buildScaffold(layout, { r1: { html: 'A' }, r2: { html: 'B' } });
    expect(validateRegions(code, ['r1', 'r2']).ok).toBe(true);
  });

  it('lays regions out with flex, never absolute positioning', () => {
    const { s, id } = board();
    const { layout } = layoutFor(s, id);
    const code = buildScaffold(layout, { r1: { html: 'A' }, r2: { html: 'B' } });
    expect(code).toContain('display:flex');
    expect(code).not.toContain('position:absolute');
  });

  it('grows children in the proportions that were drawn', () => {
    const s = createSession();
    s.addStroke(rectStroke(100, 100, 400, 100), 1000); // 1 part tall
    s.addStroke(rectStroke(100, 240, 400, 300), 1100); // 3 parts tall
    s.addStroke(circleStroke(300, 300, 400), 2000);
    s.addStroke(checkStroke(740, 300), 2500);
    const id = s.bless({ summonId: s.getState().summon!.id, name: 'p', at: 3000 })!;
    const { layout } = layoutFor(s, id);
    const code = buildScaffold(layout, { r1: { html: 'A' }, r2: { html: 'B' } });
    // The root is flex:1 1 0 too, so read the children specifically.
    const grows = [...code.matchAll(/data-region="r\d+" style="flex:(\d+) 1 0/g)].map((m) => Number(m[1]));
    expect(grows).toHaveLength(2);
    expect(grows[1] / grows[0]).toBeGreaterThan(2.5);
  });

  it('uses the semantic tag the model chose, and refuses one it invented', () => {
    const { s, id } = board();
    const { layout } = layoutFor(s, id);
    const code = buildScaffold(layout, {
      r1: { html: 'A', tag: 'header' },
      r2: { html: 'B', tag: 'script' },
    });
    expect(code).toContain('<header');
    expect(code).not.toContain('<script');
  });

  it('escapes a style that tries to break out of its attribute', () => {
    const { s, id } = board();
    const { layout } = layoutFor(s, id);
    const code = buildScaffold(layout, {
      r1: { html: 'A', style: 'color:red" onload="alert(1)' },
      r2: { html: 'B' },
    });
    expect(code).not.toContain('onload="alert(1)"');
    expect(code).toContain('&quot;');
  });
});

describe('validateRegions', () => {
  it('catches a page that dropped a region', () => {
    const r = validateRegions('<div data-region="r1"></div>', ['r1', 'r2']);
    expect(r.ok).toBe(false);
    expect(r.missing).toEqual(['r2']);
  });

  it('catches a page that emitted one twice', () => {
    const r = validateRegions('<i data-region="r1"></i><i data-region="r1"></i>', ['r1']);
    expect(r.ok).toBe(false);
    expect(r.duplicated).toEqual(['r1']);
  });
});

describe('generate — build', () => {
  it('fills every region and makes the artifact live', async () => {
    const { s, id } = board();
    stubOpenAI(fillReply({ r1: { tag: 'header', html: '<h1>Left</h1>' }, r2: { html: '<p>Right</p>' } }));
    const agent = createAgentParticipant(s, config, 3100);

    const r = await agent.generate({ prompt: 'a landing page', artifactId: id, at: 3200 });
    expect(r.ok).toBe(true);
    expect(r.revised).toBe(false);
    expect(r.filled).toEqual(['r1', 'r2']);
    expect(r.unfilled).toEqual([]);
    expect(s.getState().live).toEqual([id]);
    expect(r.code).toContain('data-region="r1"');
    expect(r.code).toContain('<h1>Left</h1>');
  });

  it('sends the LAYOUT, not a list of rectangles', async () => {
    const { s, id } = board();
    stubOpenAI(fillReply({ r1: { html: 'A' }, r2: { html: 'B' } }));
    const agent = createAgentParticipant(s, config, 3100);
    await agent.generate({ prompt: 'a page', artifactId: id, at: 3200 });

    expect(userPrompt()).toContain('LAYOUT the drawing describes');
    expect(userPrompt()).toContain('read as a row');
    expect(userPrompt()).toContain('REGIONS TO FILL: r1, r2');
    expect(systemPrompt()).toContain('THE LAYOUT IS ALREADY DECIDED');
  });

  it('sends no image — grounded facts only', async () => {
    const { s, id } = board();
    stubOpenAI(fillReply({ r1: { html: 'A' } }));
    const agent = createAgentParticipant(s, config, 3100);
    await agent.generate({ prompt: 'a page', artifactId: id, at: 3200 });
    expect(JSON.stringify(lastBody)).not.toMatch(/image_url|base64|data:image/);
  });

  // The failure that motivated the whole design: a real local model returned
  // good content and NO positioning at all. It cannot happen now, because the
  // model is not asked to position anything.
  it('keeps the geometry even when the model ignores layout entirely', async () => {
    const { s, id } = board();
    stubOpenAI(fillReply({
      r1: { html: '<div style="position:static">no layout here</div>' },
      r2: { html: 'nor here' },
    }));
    const agent = createAgentParticipant(s, config, 3100);
    const r = await agent.generate({ prompt: 'a page', artifactId: id, at: 3200 });
    expect(r.ok).toBe(true);
    expect(validateRegions(r.code!, ['r1', 'r2']).ok).toBe(true);
    expect(r.code).toContain('display:flex');
  });

  it('reports regions the model left empty rather than hiding them', async () => {
    const { s, id } = board();
    stubOpenAI(fillReply({ r1: { html: 'only one' } }));
    const agent = createAgentParticipant(s, config, 3100);
    const r = await agent.generate({ prompt: 'a page', artifactId: id, at: 3200 });
    expect(r.ok).toBe(true);
    expect(r.filled).toEqual(['r1']);
    expect(r.unfilled).toEqual(['r2']);
  });

  it('ignores content for regions the drawing does not have', async () => {
    const { s, id } = board();
    stubOpenAI(fillReply({ r1: { html: 'A' }, r2: { html: 'B' }, r9: { html: 'invented' } }));
    const agent = createAgentParticipant(s, config, 3100);
    const r = await agent.generate({ prompt: 'a page', artifactId: id, at: 3200 });
    expect(r.code).not.toContain('invented');
  });

  it('degrades rather than throwing when the model is offline', async () => {
    const { s, id } = board();
    stubFailure(503);
    const agent = createAgentParticipant(s, config, 3100);
    const r = await agent.generate({ prompt: 'a page', artifactId: id, at: 3200 });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('503');
    expect(s.getState().live).toEqual([]);
  });

  it('rejects a reply with no usable content, and keeps the artifact clean', async () => {
    const { s, id } = board();
    stubOpenAI('I would rather not.');
    const agent = createAgentParticipant(s, config, 3100);
    const r = await agent.generate({ prompt: 'a page', artifactId: id, at: 3200 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/no usable content/);
    expect(s.getState().live).toEqual([]);
  });

  it('refuses an empty prompt, an unknown artifact, and an artifact with no marks', async () => {
    const { s, id } = board();
    stubOpenAI(fillReply({ r1: { html: 'A' } }));
    const agent = createAgentParticipant(s, config, 3100);
    expect((await agent.generate({ prompt: '   ', artifactId: id, at: 1 })).error).toBe('no prompt');
    expect((await agent.generate({ prompt: 'x', artifactId: 'nope', at: 1 })).error).toBe('no such artifact');
  });
});

describe('generate — revise', () => {
  async function built() {
    const { s, id } = board();
    stubOpenAI(fillReply({ r1: { html: '<h1>first</h1>' }, r2: { html: '<p>untouched</p>' } }));
    const agent = createAgentParticipant(s, config, 3100);
    await agent.generate({ prompt: 'a page', artifactId: id, at: 3200 });
    return { s, id, agent };
  }

  it('a second prompt on a live artifact revises rather than rebuilds', async () => {
    const { agent, id } = await built();
    stubOpenAI(fillReply({ r1: { html: '<h1>second</h1>' } }));
    const r = await agent.generate({ prompt: 'change the heading', artifactId: id, at: 3300, addressed: ['r1'] });
    expect(r.ok).toBe(true);
    expect(r.revised).toBe(true);
    expect(systemPrompt()).toContain('changing part of a page');
    expect(userPrompt()).toContain('WHAT EACH REGION HOLDS NOW');
    expect(userPrompt()).toContain('first');
  });

  it('changes the addressed region and leaves the rest byte-identical', async () => {
    const { agent, id } = await built();
    stubOpenAI(fillReply({ r1: { html: '<h1>second</h1>' } }));
    const r = await agent.generate({ prompt: 'x', artifactId: id, at: 3300, addressed: ['r1'] });
    expect(r.code).toContain('<h1>second</h1>');
    expect(r.code).toContain('<p>untouched</p>');
  });

  it('refuses to change a region the ink did not address', async () => {
    const { agent, id } = await built();
    // The model overreaches and rewrites both; the engine keeps it to the one.
    stubOpenAI(fillReply({ r1: { html: '<h1>second</h1>' }, r2: { html: '<p>OVERREACH</p>' } }));
    const r = await agent.generate({ prompt: 'x', artifactId: id, at: 3300, addressed: ['r1'] });
    expect(r.code).not.toContain('OVERREACH');
    expect(r.code).toContain('<p>untouched</p>');
  });

  it('tells the model which regions the ink landed on', async () => {
    const { agent, id } = await built();
    stubOpenAI(fillReply({ r2: { html: 'B' } }));
    await agent.generate({ prompt: 'bigger', artifactId: id, at: 3300, addressed: ['r2'] });
    expect(userPrompt()).toContain('THE MARK LANDS ON: r2');
  });

  it('keeps every version — revision is a proposal, not an overwrite', async () => {
    const { s, id, agent } = await built();
    stubOpenAI(fillReply({ r1: { html: '<h1>second</h1>' } }));
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
    expect(s.getState().nodes.get(id)!.reps.filter((x) => x.modality === 'code')).toHaveLength(1);
  });
});

describe('an agent never claims what the canvas refused', () => {
  it('reports failure when the session rejects the code', async () => {
    const { s, id } = board();
    stubOpenAI(fillReply({ r1: { html: 'x' } }));
    const agent = createAgentParticipant(s, config, 3100);
    s.undo(); // drops the join event, un-registering the agent

    const r = await agent.generate({ prompt: 'a page', artifactId: id, at: 3200 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/did not accept/);
    expect(s.getState().live).toEqual([]);
  });

  it('reports failure when the session rejects the answer', async () => {
    const { s, id } = board();
    stubOpenAI('Because the three boxes share a frame.');
    const agent = createAgentParticipant(s, config, 3100);
    s.undo();

    const r = await agent.ask('why?', [id], 3200);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/did not accept/);
    expect(s.getState().explanations).toEqual([]);
  });
});

describe('parseCode still guards the free-form path', () => {
  it('unwraps a fence and drops preamble', () => {
    expect(parseCode('Here:\n```html\n<div>hi</div>\n```')).toBe('<div>hi</div>');
    expect(parseCode('nope')).toBe('');
  });
});

describe('the drawing survives whatever the model writes into it', () => {
  function layoutFor(s: ReturnType<typeof createSession>, id: string) {
    const node = s.getState().nodes.get(id)!;
    return parseLayout(regionsOf(node, s.getState().nodes), frameOf(node)!);
  }

  it('zeroes min-size on every flex item, not just containers', () => {
    // A flex item's default min-height is `auto`: it refuses to shrink below
    // its content, so one region holding a long list pushes its siblings out of
    // place and the ink stops lining up. Real copy from a real model drifted
    // 38px on exactly this.
    const { s, id } = board();
    const code = buildScaffold(layoutFor(s, id), {
      r1: { html: '<ul><li>a</li><li>b</li><li>c</li><li>d</li><li>e</li></ul>' },
      r2: { html: 'short' },
    });
    const items = [...code.matchAll(/flex:\d+ 1 0[^"]*/g)].map((m) => m[0]);
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item).toContain('min-width:0');
      expect(item).toContain('min-height:0');
    }
  });

  it('clips a region rather than letting it grow the page', () => {
    const { s, id } = board();
    const code = buildScaffold(layoutFor(s, id), { r1: { html: 'x' }, r2: { html: 'y' } });
    expect(code).toContain('[data-region] { overflow:hidden; }');
  });
});

describe('the region box is pure geometry', () => {
  function layoutFor(s: ReturnType<typeof createSession>, id: string) {
    const node = s.getState().nodes.get(id)!;
    return parseLayout(regionsOf(node, s.getState().nodes), frameOf(node)!);
  }

  // With box-sizing:border-box, a flex-basis:0 item cannot be smaller than its
  // own padding and border — so a padded region starts ahead of its siblings
  // and the whole column shifts. A real page drifted 28px on exactly this.
  it('keeps the model’s padding off the element that carries data-region', () => {
    const { s, id } = board();
    const code = buildScaffold(layoutFor(s, id), {
      r1: { html: 'A', style: 'padding:20px;border-bottom:2px solid #ddd' },
      r2: { html: 'B' },
    });
    const regionTag = code.match(/<[a-z]+ data-region="r1" style="([^"]*)"/)![1];
    expect(regionTag).toContain('flex:');
    expect(regionTag).not.toContain('padding');
    expect(regionTag).not.toContain('border');
    // …and it is still applied, one level in.
    expect(code).toContain('padding:20px');
  });

  it('gives the inner element the full box so padding insets rather than overflows', () => {
    const { s, id } = board();
    const code = buildScaffold(layoutFor(s, id), { r1: { html: 'A', style: 'padding:12px' }, r2: { html: 'B' } });
    expect(code).toMatch(/box-sizing:border-box;width:100%;height:100%/);
  });

  it('nests child regions inside the container’s inner element', () => {
    const s = createSession();
    s.addStroke(rectStroke(100, 100, 400, 300), 1000); // outer
    s.addStroke(rectStroke(140, 150, 320, 80), 1100); // inside it
    s.addStroke(rectStroke(140, 250, 320, 100), 1200); // inside it
    s.addStroke(circleStroke(300, 250, 400), 2000);
    s.addStroke(checkStroke(740, 250), 2500);
    const id = s.bless({ summonId: s.getState().summon!.id, name: 'card', at: 3000 })!;
    const code = buildScaffold(layoutFor(s, id), {
      r1: { html: '', style: 'padding:16px' },
      r2: { html: 'A' },
      r3: { html: 'B' },
    });
    expect(validateRegions(code, ['r1', 'r2', 'r3']).ok).toBe(true);
    // r2 and r3 appear after r1 opens and before it closes.
    const openR1 = code.indexOf('data-region="r1"');
    const r2at = code.indexOf('data-region="r2"');
    expect(r2at).toBeGreaterThan(openR1);
  });
});

describe('connectors are edges all the way through', () => {
  it('does not ask a model to write content for a line', async () => {
    const s = createSession();
    s.addStroke(rectStroke(220, 240, 200, 140), 1000);
    s.addStroke(rectStroke(560, 240, 200, 140), 1100);
    s.addStroke(
      Array.from({ length: 40 }, (_, i) => ({ x: 420 + (140 * i) / 39, y: 310 })),
      1200
    );
    s.addStroke(circleStroke(490, 310, 400), 2000);
    s.addStroke(checkStroke(900, 310), 2200);
    const id = s.bless({ summonId: s.getState().summon!.id, name: 'flow', at: 3000 })!;

    stubOpenAI(fillReply({ r1: { html: 'A' }, r2: { html: 'B' } }));
    const agent = createAgentParticipant(s, config, 3100);
    const r = await agent.generate({ prompt: 'a signup flow', artifactId: id, at: 3200 });

    expect(userPrompt()).toContain('read as a row');
    expect(userPrompt()).toMatch(/REGIONS TO FILL: r1, r2$/m);
    expect(r.ok).toBe(true);
    expect(r.unfilled).toEqual([]);
  });
});

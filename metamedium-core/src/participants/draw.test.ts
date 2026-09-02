// A model contributing marks — the conversation benchmark's other half.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createSession } from '../session/session';
import { createAgentParticipant } from './agent';
import { parseShapes, strokeFor } from '../session/synthesize';
import { getRep, boundsOf } from '../session/nodes';
import { interpretationsOf } from '../session/interpretations';
import { PRESETS } from '../llm/provider';
import { rectStroke } from '../test/strokes';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; vi.restoreAllMocks(); });

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
const config = { ...PRESETS.ollama, model: 'qwen3:8b' } as const;

describe('parseShapes', () => {
  it('reads the vocabulary and drops what the canvas cannot read', () => {
    const s = parseShapes('[{"shape":"rectangle","x":1,"y":2,"w":30,"h":20},{"shape":"star","x":0,"y":0,"w":9,"h":9},{"shape":"arrow","from":{"x":0,"y":0},"to":{"x":50,"y":0}}]');
    expect(s.map((x) => x.shape)).toEqual(['rectangle', 'arrow']);
  });
  it('accepts width/height and x1,y1,x2,y2 spellings', () => {
    const s = parseShapes('[{"type":"box","x":1,"y":2,"width":30,"height":20},{"shape":"line","x1":0,"y1":0,"x2":40,"y2":0}]');
    expect(s.map((x) => x.shape)).toEqual(['rectangle', 'line']);
  });
  it('caps a runaway reply', () => {
    const many = JSON.stringify(Array.from({ length: 40 }, (_, i) => ({ shape: 'circle', x: i * 10, y: 0, w: 5, h: 5 })));
    expect(parseShapes(many).length).toBeLessThanOrEqual(8);
  });
});

describe('strokeFor → the shape rung reads it back', () => {
  const readAs = (pts: { x: number; y: number }[]) => {
    const s = createSession();
    const id = s.addStroke(pts, 1000);
    return interpretationsOf(s.getState().nodes.get(id)!, s.getState().nodes)[0]?.label;
  };
  it('rectangle', () => expect(readAs(strokeFor({ shape: 'rectangle', x: 100, y: 100, w: 200, h: 120 })!)).toBe('rectangle'));
  it('circle', () => expect(readAs(strokeFor({ shape: 'circle', x: 100, y: 100, w: 120, h: 120 })!)).toBe('circle'));
  it('triangle', () => expect(readAs(strokeFor({ shape: 'triangle', x: 100, y: 100, w: 160, h: 140 })!)).toBe('triangle'));
  it('line', () => expect(readAs(strokeFor({ shape: 'line', from: { x: 100, y: 100 }, to: { x: 400, y: 160 } })!)).toBe('line'));
  it('arrow', () => expect(readAs(strokeFor({ shape: 'arrow', from: { x: 100, y: 100 }, to: { x: 400, y: 100 } })!)).toBe('arrow'));
  it('a shape with no size is nothing', () => expect(strokeFor({ shape: 'rectangle', x: 0, y: 0, w: 0, h: 10 })).toBeNull());
});

describe('agent.draw', () => {
  it('draws what the model says, attributed, through the same channel as a hand', async () => {
    const s = createSession();
    const a = s.addStroke(rectStroke(100, 100, 200, 120), 1000);
    const b = s.addStroke(rectStroke(460, 100, 200, 120), 1100);
    stub('[{"shape":"rectangle","x":100,"y":260,"w":560,"h":80,"why":"a footer under both"},{"shape":"arrow","from":{"x":304,"y":160},"to":{"x":456,"y":160},"why":"joins them"}]');
    const agent = createAgentParticipant(s, config, 1500);
    const res = await agent.draw({ prompt: 'add a footer and join the boxes', nodeIds: [a, b], at: 2000 });
    expect(res.ok).toBe(true);
    expect(res.ids).toHaveLength(2);

    const st = s.getState();
    for (const id of res.ids) {
      const n = st.nodes.get(id)!;
      expect(getRep(n, 'stroke')!.source).toBe(agent.id);
      expect(st.contentIds).toContain(id);
    }
    expect(interpretationsOf(st.nodes.get(res.ids[0])!, st.nodes)[0].label).toBe('rectangle');
    expect(interpretationsOf(st.nodes.get(res.ids[1])!, st.nodes)[0].label).toBe('arrow');
    const fb = boundsOf(st.nodes.get(res.ids[0])!)!;
    expect(Math.round(fb.minY)).toBe(260);

    // The model's reason for each mark is placed beside it, attributed.
    expect(st.explanations).toHaveLength(2);
    const u = String((lastBody!.messages as { role: string; content: string }[]).find((m) => m.role === 'user')!.content);
    expect(u).toContain('THE HUMAN POINTED AT');
    expect(u).toContain('add a footer');
  });

  it('adds nothing when the reply is not drawable', async () => {
    const s = createSession();
    s.addStroke(rectStroke(100, 100, 200, 120), 1000);
    stub('I would add a footer below the boxes.');
    const agent = createAgentParticipant(s, config, 1500);
    const res = await agent.draw({ prompt: 'add a footer', at: 2000 });
    expect(res.ok).toBe(false);
    expect(s.getState().contentIds).toHaveLength(1);
  });

  it('undo removes the model\'s marks one at a time, like anyone\'s', async () => {
    const s = createSession();
    s.addStroke(rectStroke(100, 100, 200, 120), 1000);
    stub('[{"shape":"circle","x":400,"y":100,"w":100,"h":100}]');
    const agent = createAgentParticipant(s, config, 1500);
    const res = await agent.draw({ prompt: 'add a circle', at: 2000 });
    expect(res.ok).toBe(true);
    s.undo();
    expect(s.getState().contentIds).toHaveLength(1);
  });
});

describe('a model\'s drawn marks are declared content, never gestures', () => {
  it('an arrow that crosses a box three times does not erase it, and a loop is not a lasso', async () => {
    const s = createSession();
    const box = s.addStroke(rectStroke(300, 100, 200, 120), 1000);
    // A barbed arrow whose tip lands inside the box: the barb crosses the edge
    // back and forth — three crossings, a scratch if a hand had drawn it. And a
    // loop around the box, which from a hand would be a held lasso.
    stub('[{"shape":"arrow","from":{"x":100,"y":160},"to":{"x":330,"y":160}},{"shape":"circle","x":250,"y":50,"w":300,"h":220}]');
    const agent = createAgentParticipant(s, config, 1500);
    const res = await agent.draw({ prompt: 'point at the box and ring it', at: 2000 });
    expect(res.ok).toBe(true);
    const st = s.getState();
    expect(st.contentIds).toContain(box);
    expect(st.pendingLassoId).toBeNull();
    expect(st.summon).toBeNull();
    for (const id of res.ids) {
      expect(st.contentIds).toContain(id);
      expect(getRep(st.nodes.get(id)!, 'gesture')).toBeUndefined();
    }
  });

  it('the same strokes, undeclared, ARE gestures — the rule is about what was declared, not who drew', () => {
    const s = createSession();
    const box = s.addStroke(rectStroke(300, 100, 200, 120), 1000);
    s.addStroke(strokeFor({ shape: 'arrow', from: { x: 100, y: 160 }, to: { x: 330, y: 160 } })!, 1100);
    expect(s.getState().contentIds).not.toContain(box);
  });
});

// What the tools say of themselves (V1-PLAN B1): one line each for the pane
// and a brief (`describeTools`), and — in HERE, on every prompt that makes or
// reads — the canvas's own tools by name, so a model knows what the canvas
// does with no model. Read from the registry when the prompt is made.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import { rectStroke } from '../test/strokes';
import { PRESETS, type ChatMessage } from '../llm/provider';
import { HERE, here, createAgentParticipant } from '../participants/agent';
import type { Tool } from './tool';
import { describeTools, registerTool, registeredTools } from './registry';

const ECHO: Tool = {
  id: 'test:echo',
  name: 'the echo',
  describe: () => 'says the scope back, for a test',
  offers: () => [],
  take: () => ({}),
};

describe('what the tools say of themselves', () => {
  it('describeTools: every registered tool, one line — its name and what it does', () => {
    const lines = describeTools().split('\n');
    expect(lines.length).toBe(registeredTools().length);
    expect(lines[0]).toMatch(/^corrections — /);
    expect(lines).toContain('clean forms — a confident, unambiguous reading redrawn from the ink\'s own measurements; the ink kept beneath');
    // A filter says a subset: the tools that need no model.
    expect(describeTools((t) => t.asks === 'model').split('\n').map((l) => l.split(' — ')[0])).toEqual(['reading the writing', 'what is this', 'which is it']);
  });

  it('HERE names the canvas’s own tools — not a model’s — and a tool registered later is named when the next prompt is made', () => {
    expect(here().startsWith(HERE)).toBe(true);
    expect(here()).toMatch(/THE CANVAS'S OWN TOOLS, which need no model: corrections, text, naming, labels, tidy, /);
    expect(here()).not.toMatch(/reading the writing|what is this/);
    const off = registerTool(ECHO);
    try {
      expect(here()).toMatch(/, the echo\.$/);
    } finally {
      off();
    }
    expect(here()).not.toMatch(/the echo/);
  });

  it('a model is told them: the prompts that carry HERE carry the tools', async () => {
    const s = createSession();
    s.addStroke(rectStroke(100, 100, 120, 80), 1000);
    const seen: ChatMessage[][] = [];
    const agent = createAgentParticipant(s, { ...PRESETS.ollama, model: 'stub' }, 1500, {
      transport: async (_c, messages) => { seen.push(messages); return { ok: true, text: '[]', model: 'stub' }; },
    });
    await agent.interpret(s.getState().contentIds, 2000);
    const system = String(seen[0].find((m) => m.role === 'system')!.content);
    expect(system).toContain(HERE);
    expect(system).toContain('THE CANVAS\'S OWN TOOLS, which need no model: corrections, text, naming, labels, tidy, drawn controls, clean forms, a graph in 3D, wiring, editing text, words into verbs, clocks, duplicate, keep as drawing, the structure, maths, Mermaid, drawing from Mermaid, routing.');
  });
});

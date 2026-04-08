// MetaMedium Lens Canvas — Entry Point
import { registerLens } from './core/lens-registry';
import { RawLens } from './lenses/raw';
import { restore, addNode, getGraph } from './core/graph';
import { init as initViewport } from './canvas/viewport';
import { initRenderer, setTheme } from './canvas/renderer';
import { initInteractions } from './canvas/interactions';

import { CardLens } from './lenses/card';
import { TreeLens } from './lenses/tree';
import { CodeLens } from './lenses/code';

// ── Register lenses (order doesn't matter — MoE confidence decides) ──
registerLens(RawLens);
registerLens(CardLens);
registerLens(TreeLens);
registerLens(CodeLens);

// ── Setup canvas ──
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

initViewport(canvas);
initRenderer(canvas);
initInteractions(canvas);

// ── Restore persisted state ──
const restored = restore();

// ── Seed with real Hermes system data if empty ──
import * as graph from './core/graph';

if (!restored || getGraph().nodes.length === 0) {
  // ═══════════════════════════════════════════
  // Row 1: Model fallback chain
  // ═══════════════════════════════════════════
  const opus = addNode({
    data: {
      name: 'Claude Opus 4',
      provider: 'anthropic',
      model: 'claude-opus-4-6',
      context: '200K tokens',
      pricing: '$15 / $75 per M tokens',
      role: 'Primary — architecture, synthesis, client work',
      routing: 'delegate_task(model="claude-opus-4-6")',
    },
    dataType: 'json',
    position: { x: 60, y: 40, width: 340, height: 250 },
    source: 'system',
    meaning: 'Frontier model — foundations & decisions',
  });

  const sonnet = addNode({
    data: {
      name: 'Claude Sonnet 4.6',
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      context: '200K tokens',
      role: 'Default — handles everything else',
      tools: 'All toolsets enabled',
      platform: 'CLI, Telegram, Slack',
    },
    dataType: 'json',
    position: { x: 440, y: 40, width: 340, height: 230 },
    source: 'system',
    meaning: 'Workhorse model — daily operations',
  });

  const glm = addNode({
    data: {
      name: 'GLM-5.1',
      provider: 'nous',
      model: 'z-ai/glm-5.1',
      context: '202K tokens',
      pricing: '$1.40 / $4.40 per M tokens',
      role: 'Cloud fallback',
      status: 'Under evaluation',
    },
    dataType: 'json',
    position: { x: 820, y: 40, width: 320, height: 230 },
    source: 'system',
    meaning: 'Cloud fallback — cheaper alternative',
  });

  const local = addNode({
    data: {
      name: 'Qwen 3.5 35B-A3B',
      provider: 'LM Studio (local)',
      model: 'qwen3.5-35b-a3b',
      context: '32K tokens',
      pricing: 'Free — runs on Monolith',
      speed: '38.5 tok/s on M2 Max',
      role: 'Offline fallback',
      note: 'MoE architecture, leaks thinking tokens',
    },
    dataType: 'json',
    position: { x: 1180, y: 40, width: 320, height: 250 },
    source: 'system',
    meaning: 'Offline fallback — local inference',
  });

  // ═══════════════════════════════════════════
  // Row 2: Core system architecture
  // ═══════════════════════════════════════════
  const hermes = addNode({
    data: {
      name: 'Hermes Agent',
      description: 'Personal AI agent with persistent memory, tool orchestration, and multi-platform gateway',
      platforms: 'CLI, Telegram, Slack, Discord',
      tools: '30+ tools across 15 toolsets',
      skills: '32 skill categories, 80+ skills',
      cron: '9 scheduled jobs (briefing, clients, research, coherence)',
      memory: 'Cortex (11 entities, 23 facts, 7 decisions, 13 relations)',
      sessions: 'FTS5-indexed conversation history',
    },
    dataType: 'json',
    position: { x: 60, y: 340, width: 380, height: 300 },
    source: 'system',
    meaning: 'The agent itself — orchestrator of everything',
  });

  const cortex = addNode({
    data: {
      name: 'Memory Cortex',
      architecture: 'SQLite + FTS5 (Phase 1+2 live)',
      entities: { people: 2, projects: 3, tools: 3, orgs: 1 },
      tiers: 'hot (5 facts injected every session), warm, cold',
      relations: '13 typed edges (works_on, owns, knows, part_of, uses)',
      decisions: '7 active architectural decisions',
      harvester: 'on_session_end auto-extraction',
      next: 'Phase 3: nomic-embed-text + sqlite-vec (blocked)',
    },
    dataType: 'json',
    position: { x: 480, y: 340, width: 360, height: 300 },
    source: 'system',
    meaning: 'Structured knowledge graph — institutional memory',
  });

  const vault = addNode({
    data: {
      name: 'JH Vault',
      type: 'Obsidian knowledge base',
      path: '~/Documents/JHvault',
      notes: '42,000+ notes',
      areas: 'EarthStar/, Projects/, Notes/, Resources/, Templates/',
      format: 'YYYY-MM-DD daily notes in root',
      integration: 'Obsidian CLI for all vault operations',
    },
    dataType: 'json',
    position: { x: 880, y: 340, width: 320, height: 260 },
    source: 'system',
    meaning: 'Living second brain — 42K notes',
  });

  // ═══════════════════════════════════════════
  // Row 3: Projects
  // ═══════════════════════════════════════════
  const mm = addNode({
    data: {
      name: 'MetaMedium',
      type: 'Recursively intelligent parsing system',
      architecture: 'MoE routing between shape experts, continuous library as embedding space',
      insight: 'Everything is a node. Types are nodes. Relations are nodes. What something IS = what it connects to.',
      components: 'Lens Canvas, Fish Demo, Shape Recognition',
      stack: 'TypeScript, Canvas2D, Vite',
    },
    dataType: 'json',
    position: { x: 60, y: 690, width: 360, height: 260 },
    source: 'system',
    meaning: 'No-mode interface — marks become meaning',
  });

  const es = addNode({
    data: {
      name: 'Earth Star',
      type: 'Regenerative systems intelligence framework',
      equation: 'Gomens = sum(waste * love) -> TENDING -> d(regenerative_systems)/dt',
      principles: 'Kincentric worldview, seven-generation thinking, coherence optimization',
      optimization: 'nabla(C) >= 0 across all fractal scales',
      site: 'earthstar.space',
      aesthetic: 'Egyptian basalt + Y2K aero meets design agency',
    },
    dataType: 'json',
    position: { x: 460, y: 690, width: 360, height: 260 },
    source: 'system',
    meaning: 'Anti-entropy economics — life as objective function',
  });

  // ═══════════════════════════════════════════
  // Code lens: the MoE pattern
  // ═══════════════════════════════════════════
  addNode({
    data: `// MoE Lens Matching — each lens votes
export function matchLens(dataType, data) {
  let best = { lens: RawLens, score: 0 };
  for (const lens of registry) {
    const score = lens.matches(dataType, data);
    if (score > best.score)
      best = { lens, score };
  }
  return best.lens;
}
// CardLens:  0.7 for json
// TreeLens:  0.85 for nested json
// CodeLens:  0.9 for code strings`,
    dataType: 'code',
    position: { x: 860, y: 690, width: 360, height: 240 },
    source: 'system',
  });

  // ═══════════════════════════════════════════
  // Edges — relationships
  // ═══════════════════════════════════════════
  // Fallback chain
  graph.addEdge({ from: opus.id, to: sonnet.id, type: 'dependency', label: 'delegates to', source: 'system' });
  graph.addEdge({ from: sonnet.id, to: glm.id, type: 'dependency', label: 'fallback', source: 'system' });
  graph.addEdge({ from: glm.id, to: local.id, type: 'dependency', label: 'fallback', source: 'system' });

  // System connections
  graph.addEdge({ from: hermes.id, to: sonnet.id, type: 'dependency', label: 'runs on', source: 'system' });
  graph.addEdge({ from: hermes.id, to: cortex.id, type: 'composition', label: 'contains', source: 'system' });
  graph.addEdge({ from: hermes.id, to: vault.id, type: 'relationship', label: 'reads/writes', source: 'system' });

  // Project connections
  graph.addEdge({ from: mm.id, to: hermes.id, type: 'relationship', label: 'built with', source: 'system' });
  graph.addEdge({ from: es.id, to: hermes.id, type: 'relationship', label: 'informed by', source: 'system' });
  graph.addEdge({ from: es.id, to: mm.id, type: 'annotation', label: 'substrate', source: 'system' });
}

// ── Theme toggle ──
const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
setTheme(isDark);
document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

// ── Expose API on window for LLM/console access ──
(window as any).__canvas = {
  addNode: graph.addNode,
  updateNode: graph.updateNode,
  removeNode: graph.removeNode,
  addEdge: graph.addEdge,
  removeEdge: graph.removeEdge,
  getGraph: graph.getGraph,
  getNode: graph.getNode,
  clearGraph: graph.clearGraph,
};

// ── UI wiring ──
document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  setTheme(next === 'dark');
  const btn = document.getElementById('theme-toggle')!;
  btn.textContent = next === 'dark' ? '☼ Light' : '☾ Dark';
});

document.getElementById('clear-btn')?.addEventListener('click', () => {
  if (confirm('Clear all nodes and edges?')) {
    graph.clearGraph();
  }
});

// ── LLM API relay ──
import { initApiRelay } from './llm/api-client';
initApiRelay();

console.log('%c🔮 Lens Canvas ready', 'color: #7dd8f7; font-weight: bold');
console.log('  window.__canvas — API for LLM/console interaction');
console.log('  Double-click canvas to create nodes');
console.log('  Ctrl/Cmd+scroll to zoom, scroll to pan');

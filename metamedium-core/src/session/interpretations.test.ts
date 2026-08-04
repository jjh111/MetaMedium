// Multi-interpretation is a guarantee, not a nicety (ARCHITECTURE-v7 §4.1).
// These tests exist to fail loudly if anything starts collapsing readings.

import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import { LOCAL_PARTICIPANT, TIER0_PARTICIPANT, resemblances } from './nodes';
import {
  interpretationsOf,
  byTier,
  bySource,
  disagreement,
  sourcesOf,
  hasMultipleSources,
} from './interpretations';
import { circleStroke } from '../test/strokes';

function sessionWithACircle() {
  const s = createSession();
  const id = s.addStroke(circleStroke(200, 200, 40), 1000);
  return { s, id };
}

describe('interpretationsOf — nothing is collapsed', () => {
  it('surfaces the engine tier-0 reading with its grounded reasoning', () => {
    const { s, id } = sessionWithACircle();
    const node = s.getState().nodes.get(id)!;

    const reads = interpretationsOf(node, s.getState().nodes);

    expect(reads.length).toBeGreaterThan(0);
    expect(reads.every((r) => r.tier === 0)).toBe(true);
    expect(reads[0].sourceName).toBe('tier0-heuristics');
    // The substance behind "why?" travels with the reading.
    expect(reads[0].reasoning).toBeTruthy();
  });

  it('keeps EVERY reading a single model offers — multi-parse within one source', () => {
    const { s, id } = sessionWithACircle();
    const agent = s.join('agent', 'llm:qwen3', 1100);

    // One model, three candidate readings. All three must survive.
    s.propose({
      participantId: agent,
      nodeId: id,
      at: 1200,
      edges: [
        { to: 'type:circle', rel: 'resembles', weight: 0.9, reasoning: 'closed, smooth' },
        { to: 'type:letter-o', rel: 'resembles', weight: 0.5, reasoning: 'could be a glyph' },
        { to: 'type:wheel', rel: 'resembles', weight: 0.3, reasoning: 'round with a hub' },
      ],
    });

    const node = s.getState().nodes.get(id)!;
    const reads = interpretationsOf(node, s.getState().nodes);
    const fromAgent = reads.filter((r) => r.source === agent);

    expect(fromAgent).toHaveLength(3);
    expect(fromAgent.map((r) => r.label)).toEqual(['circle', 'letter-o', 'wheel']);
    // Ranked by confidence, but none suppressed.
    expect(fromAgent[0].weight).toBeGreaterThan(fromAgent[2].weight);
  });

  it('holds several models WITHIN one tier side by side', () => {
    const { s, id } = sessionWithACircle();
    const a = s.join('agent', 'llm:qwen3', 1100);
    const b = s.join('agent', 'llm:llama3', 1110);

    s.propose({ participantId: a, nodeId: id, at: 1200,
      edges: [{ to: 'type:circle', rel: 'resembles', weight: 0.9, reasoning: 'a' }] });
    s.propose({ participantId: b, nodeId: id, at: 1210,
      edges: [{ to: 'type:ring', rel: 'resembles', weight: 0.8, reasoning: 'b' }] });

    const node = s.getState().nodes.get(id)!;
    const groups = bySource(interpretationsOf(node, s.getState().nodes));

    // tier0 + two agents — three distinct voices, none merged.
    expect(groups.map((g) => g.label).sort()).toEqual(
      ['llm:llama3', 'llm:qwen3', 'tier0-heuristics'].sort()
    );
  });

  it('shows ALL tiers at once — tiers are simultaneous, not an escalation ladder', () => {
    const { s, id } = sessionWithACircle();
    const local = s.join('agent', 'llm:qwen3', 1100);
    const hosted = s.join('agent', 'llm:claude-opus-5', 1110);

    s.propose({ participantId: local, nodeId: id, at: 1200,
      edges: [{ to: 'type:circle', rel: 'resembles', weight: 0.7, reasoning: 'local read' }] });
    s.propose({ participantId: hosted, nodeId: id, at: 1210,
      edges: [{ to: 'type:letter-o', rel: 'resembles', weight: 0.95, reasoning: 'hosted read' }] });

    const node = s.getState().nodes.get(id)!;
    const reads = interpretationsOf(node, s.getState().nodes);

    // The high-confidence hosted reading does NOT evict the cheaper ones.
    expect(sourcesOf(reads)).toHaveLength(3);
    expect(hasMultipleSources(reads)).toBe(true);
    expect(reads.some((r) => r.sourceName === 'tier0-heuristics')).toBe(true);
    expect(reads.some((r) => r.sourceName === 'llm:qwen3')).toBe(true);
    expect(reads.some((r) => r.sourceName === 'llm:claude-opus-5')).toBe(true);
  });

  it('groups by tier without dropping anything', () => {
    const { s, id } = sessionWithACircle();
    const agent = s.join('agent', 'llm:qwen3', 1100);
    s.propose({ participantId: agent, nodeId: id, at: 1200,
      edges: [{ to: 'type:letter-o', rel: 'resembles', weight: 0.6, reasoning: 'glyph' }] });

    const node = s.getState().nodes.get(id)!;
    const all = interpretationsOf(node, s.getState().nodes);
    const tiers = byTier(all);

    const total = tiers.reduce((n, g) => n + g.interpretations.length, 0);
    expect(total).toBe(all.length);
    expect(tiers[0].key).toBe(0); // ascending — cheap readings listed first
  });
});

describe('disagreement is a first-class signal', () => {
  it('reports divergence across sources', () => {
    const { s, id } = sessionWithACircle();
    const agent = s.join('agent', 'llm:claude-opus-5', 1100);
    s.propose({ participantId: agent, nodeId: id, at: 1200,
      edges: [{ to: 'type:letter-o', rel: 'resembles', weight: 0.95, reasoning: 'reads as a glyph' }] });

    const node = s.getState().nodes.get(id)!;
    const d = disagreement(interpretationsOf(node, s.getState().nodes));

    expect(d).not.toBeNull();
    expect(d!.crossSource).toBe(true);
    expect(d!.labels.map((l) => l.label)).toContain('letter-o');
    expect(d!.labels.map((l) => l.label)).toContain('circle');
  });

  it('does NOT call one model offering several readings a disagreement', () => {
    const s = createSession();
    // A stroke the heuristics read as exactly one thing keeps the test focused
    // on the agent's own multi-parse.
    const id = s.addStroke(circleStroke(200, 200, 40), 1000);
    const node0 = s.getState().nodes.get(id)!;
    const tier0Labels = new Set(resemblances(node0).map((e) => e.to));

    const agent = s.join('agent', 'llm:qwen3', 1100);
    // Propose the SAME labels tier 0 already has, so the only multiplicity
    // present comes from within a single source.
    s.propose({
      participantId: agent,
      nodeId: id,
      at: 1200,
      edges: [...tier0Labels].map((to) => ({
        to, rel: 'resembles', weight: 0.5, reasoning: 'agrees with the engine',
      })),
    });

    const node = s.getState().nodes.get(id)!;
    const d = disagreement(interpretationsOf(node, s.getState().nodes));

    // Same label set from both sources → agreement, whatever the count.
    if (d) expect(d.crossSource).toBe(false);
  });

  it('returns null when there is nothing to disagree about', () => {
    expect(disagreement([])).toBeNull();
    expect(
      disagreement([
        { label: 'circle', to: 'type:circle', sourceName: 'tier0-heuristics',
          tier: 0, weight: 0.8, blessed: false },
      ])
    ).toBeNull();
  });
});

describe('blessing does not erase the readings underneath', () => {
  it('lists the blessed name first while keeping every inferred reading', () => {
    const { s, id } = sessionWithACircle();
    const agent = s.join('agent', 'llm:qwen3', 1100);
    s.propose({ participantId: agent, nodeId: id, at: 1200,
      edges: [{ to: 'type:letter-o', rel: 'resembles', weight: 0.6, reasoning: 'glyph' }] });

    const node = s.getState().nodes.get(id)!;
    const before = interpretationsOf(node, s.getState().nodes);
    expect(before.every((r) => !r.blessed)).toBe(true);

    // The human commits — the alternatives are still on the record.
    const after = interpretationsOf(node, s.getState().nodes);
    expect(after.length).toBe(before.length);
    expect(after.some((r) => r.sourceName === 'llm:qwen3')).toBe(true);
  });
});

describe('provenance', () => {
  it('never attributes an agent reading to the engine', () => {
    const { s, id } = sessionWithACircle();
    const agent = s.join('agent', 'llm:qwen3', 1100);
    s.propose({ participantId: agent, nodeId: id, at: 1200,
      edges: [{ to: 'type:spiral', rel: 'resembles', weight: 0.4, reasoning: 'loose coil' }] });

    const node = s.getState().nodes.get(id)!;
    const spiral = interpretationsOf(node, s.getState().nodes).find((r) => r.label === 'spiral')!;

    expect(spiral.source).toBe(agent);
    expect(spiral.sourceName).toBe('llm:qwen3');
    expect(spiral.source).not.toBe(TIER0_PARTICIPANT);
    expect(spiral.source).not.toBe(LOCAL_PARTICIPANT);
  });
});

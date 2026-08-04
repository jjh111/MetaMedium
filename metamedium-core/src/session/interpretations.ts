// Reading a node WITHOUT collapsing to one answer.
//
// ARCHITECTURE-v6 principle 2 — nothing wins by silencing the others — applies
// to model tiers exactly as it applies to heuristics. Tier 0 is multi-parse;
// the LLM tiers inherit that in three directions at once:
//
//   - several readings from one model,
//   - several models inside one tier,
//   - every tier at once (NOT an escalation ladder — see ARCHITECTURE-v7 §4.1).
//
// `topInterpretation()` in nodes.ts stays for surfaces that need a headline.
// Everything here is the non-collapsing path beside it. Where the sources
// DISAGREE is the signal worth surfacing, so `disagreement()` is a first-class
// export rather than an afterthought.

import type { MMNode, Capability } from './nodes';
import { resemblances, wordOf, isParticipant } from './nodes';
import { TIER0_PARTICIPANT, LOCAL_PARTICIPANT } from './nodes';

/** One reading of a node, with everything needed to show who said it and why. */
export interface Interpretation {
  /** What it reads as — a type name ('circle') or an artifact name ('molecule'). */
  label: string;
  /** Node id this reading points at (`type:circle`, or an artifact id). */
  to: string;
  /** Participant id that made the claim; undefined for un-attributed engine edges. */
  source?: string;
  /** Human-readable participant name ('tier0-heuristics', 'llm:qwen3', 'local'). */
  sourceName: string;
  /** Capability tier of the source. Tier 0 = engine heuristics. */
  tier: Capability;
  /** Confidence 0–1 where the source provided one. */
  weight: number;
  /** Why this source makes this claim — the substance behind "why?". */
  reasoning?: string;
  /** True when a human has committed to this reading (a blessed name). */
  blessed: boolean;
}

/** A group of interpretations sharing a source or a tier. */
export interface InterpretationGroup<K extends string | number> {
  key: K;
  label: string;
  interpretations: Interpretation[];
}

function participantName(id: string, nodes: ReadonlyMap<string, MMNode>): string {
  const p = nodes.get(id);
  if (!p || !isParticipant(p)) return id;
  return wordOf(p) ?? id;
}

function participantTier(id: string, nodes: ReadonlyMap<string, MMNode>): Capability {
  const p = nodes.get(id);
  return (p?.capability ?? 0) as Capability;
}

/**
 * Every reading of a node, ranked by weight, NOTHING collapsed.
 *
 * A blessed name is included as a reading of its own (weight 1, blessed) so a
 * surface can show "the human called this X, and these three sources read it
 * as Y, Z, W" in one list.
 */
export function interpretationsOf(
  node: MMNode,
  nodes: ReadonlyMap<string, MMNode>
): Interpretation[] {
  const out: Interpretation[] = [];

  const name = wordOf(node);
  if (name) {
    const blessedBy = node.edges.find((e) => e.rel === 'blessed-by' && e.blessed)?.to;
    out.push({
      label: name,
      to: node.id,
      source: blessedBy ?? LOCAL_PARTICIPANT,
      sourceName: participantName(blessedBy ?? LOCAL_PARTICIPANT, nodes),
      tier: participantTier(blessedBy ?? LOCAL_PARTICIPANT, nodes),
      weight: 1,
      reasoning: 'blessed by a participant',
      blessed: true,
    });
  }

  for (const e of resemblances(node)) {
    const source = e.via;
    out.push({
      label: e.to.replace(/^type:/, ''),
      to: e.to,
      source,
      // An un-attributed resemblance is the engine's own Tier 0 reading:
      // recognition ran inline at stroke time, before any participant spoke.
      sourceName: source ? participantName(source, nodes) : participantName(TIER0_PARTICIPANT, nodes),
      tier: source ? participantTier(source, nodes) : 0,
      weight: e.weight ?? 0,
      reasoning: e.reasoning,
      blessed: e.blessed === true,
    });
  }

  // Blessed first, then by confidence. Ranking is a display nicety — every
  // reading survives regardless of where it lands.
  return out.sort((a, b) => {
    if (a.blessed !== b.blessed) return a.blessed ? -1 : 1;
    return b.weight - a.weight;
  });
}

/** The same readings grouped by capability tier, ascending (0 first). */
export function byTier(
  interpretations: Interpretation[]
): InterpretationGroup<Capability>[] {
  const groups = new Map<Capability, Interpretation[]>();
  for (const i of interpretations) {
    const g = groups.get(i.tier);
    if (g) g.push(i);
    else groups.set(i.tier, [i]);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([key, list]) => ({ key, label: `tier ${key}`, interpretations: list }));
}

/**
 * The same readings grouped by who said them — two models in one tier stay
 * distinct, which is the point.
 */
export function bySource(
  interpretations: Interpretation[]
): InterpretationGroup<string>[] {
  const groups = new Map<string, Interpretation[]>();
  for (const i of interpretations) {
    const key = i.source ?? TIER0_PARTICIPANT;
    const g = groups.get(key);
    if (g) g.push(i);
    else groups.set(key, [i]);
  }
  return [...groups.entries()].map(([key, list]) => ({
    key,
    label: list[0].sourceName,
    interpretations: list,
  }));
}

/** A point where sources read the same node differently. */
export interface Disagreement {
  /** Distinct labels offered, ranked by the best weight backing each. */
  labels: { label: string; bestWeight: number; sources: string[] }[];
  /** True when at least two DIFFERENT sources back different labels. */
  crossSource: boolean;
}

/**
 * Where the readings diverge.
 *
 * Disagreement is a first-class signal, not noise: when Tier 0 says `circle`
 * and Tier 2 says `the letter O`, the gap is the interesting part. Returns
 * null when every source agrees (or only one reading exists).
 */
export function disagreement(interpretations: Interpretation[]): Disagreement | null {
  if (interpretations.length < 2) return null;

  const byLabel = new Map<string, { bestWeight: number; sources: Set<string> }>();
  for (const i of interpretations) {
    const entry = byLabel.get(i.label);
    const src = i.sourceName;
    if (entry) {
      entry.bestWeight = Math.max(entry.bestWeight, i.weight);
      entry.sources.add(src);
    } else {
      byLabel.set(i.label, { bestWeight: i.weight, sources: new Set([src]) });
    }
  }

  if (byLabel.size < 2) return null;

  const labels = [...byLabel.entries()]
    .map(([label, v]) => ({ label, bestWeight: v.bestWeight, sources: [...v.sources] }))
    .sort((a, b) => b.bestWeight - a.bestWeight);

  // Cross-source only when the competing labels don't all come from one voice:
  // a single model offering three readings is multi-parse, not disagreement.
  const allSources = new Set(labels.flatMap((l) => l.sources));
  const crossSource =
    allSources.size > 1 && labels.some((l) => !l.sources.every((s) => labels[0].sources.includes(s)));

  return { labels, crossSource };
}

/** Distinct sources that have offered a reading of this node. */
export function sourcesOf(interpretations: Interpretation[]): string[] {
  return [...new Set(interpretations.map((i) => i.sourceName))];
}

/**
 * Convenience for surfaces: does this node carry readings from more than one
 * participant? Drives "several sources read this differently" affordances.
 */
export function hasMultipleSources(interpretations: Interpretation[]): boolean {
  return sourcesOf(interpretations).length > 1;
}


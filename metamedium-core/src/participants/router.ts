// Who gets asked, and whether anyone needs to be.
//
// The rule the rest of the engine already follows, made explicit: **Tier 0
// answers first, and a model is asked only for what Tier 0 cannot do.** Shape,
// insideness, nearness, alignment, layout structure — those are measurements the
// canvas holds. Sending them to a model is slower, less reliable, costs
// something, and produces an answer the engine already had.
//
// What is left over is genuinely a model's work: naming a thing in a way a
// person would recognise, writing the words that go in a box, explaining a
// relationship in prose, reading handwriting.
//
// Routing is deliberately NOT a fallback chain. Every candidate that can answer
// is returned, ranked, because several participants answering the same question
// is the point (ARCHITECTURE-v7 §4.1). The caller may ask one, or all of them,
// and hold every answer.

import type { Capability } from '../session/nodes';
import type { SessionState } from '../session/session';
import { wordOf } from '../session/nodes';
import type { ConceptMatch } from '../concepts/concept';

/** The kinds of work a participant can be asked for. */
export type Ability =
  /** What are these marks? */
  | 'read'
  /** Why / what is going on here? */
  | 'answer'
  /** Turn this into something that runs. */
  | 'build'
  /** What should this be called? */
  | 'name'
  /** Rearrange the marks themselves. */
  | 'arrange';

export interface Candidate {
  participantId: string;
  name: string;
  tier: Capability;
  /** Lower is cheaper to ask: local before hosted, engine before either. */
  cost: number;
  why: string;
}

export interface Route {
  ability: Ability;
  /**
   * True when the engine already has an answer good enough that asking anyone
   * would be spending time to be told what it knows.
   */
  settledLocally: boolean;
  /** Why it is settled, when it is — shown instead of a spinner. */
  localAnswer?: string;
  /** Everyone who could answer, cheapest first. Empty is a normal outcome. */
  candidates: Candidate[];
}

/** What the engine can do unaided. */
const TIER0_ABILITIES: Record<Ability, boolean> = {
  read: true,
  arrange: true,
  answer: false,
  build: false,
  name: false,
};

/**
 * How confident a Tier 0 reading has to be before asking a model about it is
 * spending someone's time to be told what the canvas already knew. Below it the
 * engine still answers — it just does not claim the question is closed.
 */
export const SETTLED_CONFIDENCE = 0.6;

export interface RouteOptions {
  /** Concepts Tier 0 read for the marks in question, if any. */
  concepts?: ConceptMatch[];
  /** Participants to consider. Defaults to every agent in the session. */
  participantIds?: string[];
}

export function route(ability: Ability, state: SessionState, options: RouteOptions = {}): Route {
  const top = options.concepts?.[0];
  const settledLocally =
    TIER0_ABILITIES[ability] && !!top && top.confidence >= SETTLED_CONFIDENCE;

  const ids = options.participantIds ?? state.participants;
  const candidates: Candidate[] = [];

  for (const pid of ids) {
    const node = state.nodes.get(pid);
    if (!node) continue;
    const kind = (node.reps.find((r) => r.modality === 'participant')?.data as { kind?: string } | undefined)?.kind;
    if (kind !== 'agent') continue; // humans and the engine are not "asked"
    const tier = node.capability ?? 0;
    candidates.push({
      participantId: pid,
      name: wordOf(node) ?? pid,
      tier,
      // Local before hosted: on a machine you own, latency is the only price,
      // and it is one you have already paid for.
      cost: tier,
      why: tier === 1 ? 'runs on this machine' : 'hosted',
    });
  }

  candidates.sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));

  return {
    ability,
    settledLocally,
    localAnswer: settledLocally
      ? `${top!.concept} (${top!.confidence.toFixed(2)}) — ${top!.reasoning}`
      : undefined,
    candidates,
  };
}

/**
 * A one-line account of what routing decided, for a surface to show.
 *
 * Worth surfacing rather than logging: "the engine already knows this" is a
 * better answer than a spinner, and "nobody can answer that yet" is a better
 * answer than silence.
 */
export function describeRoute(r: Route): string {
  if (r.settledLocally) return `Tier 0 has this: ${r.localAnswer}`;
  if (r.candidates.length === 0) return `Nothing here can ${r.ability} — add a model, or bridge one in.`;
  return `${r.ability}: ${r.candidates.map((c) => `${c.name} (tier ${c.tier})`).join(', ')}`;
}

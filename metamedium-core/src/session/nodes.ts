// The node model: everything is a node; meaning emerges from representations
// and connections. See ARCHITECTURE-v6-SESSION-ENGINE.md §4 and
// metamedium-core-schema.md. This open structure — not a closed
// {strokes, shape, name} record — is what lets the same artifact carry ink
// today and renderable/executable payloads later (capability tiers, §7).

import type { Bounds, Fingerprint, Point } from '../types';

export type Capability = 0 | 1 | 2 | 3;

export interface Rep {
  modality: string; // 'stroke' | 'fingerprint' | 'word' | 'gesture' | 'signature' | 'html' | ... (open set)
  data: unknown;
  confidence?: number;
  source?: string; // provenance: 'heuristic' | 'user' | 'llm:<model>' | ...
}

export interface Edge {
  to: string;
  rel: string; // 'resembles' | 'part-of' | 'has-part' | 'instance-of' | 'blessed-by' | 'touching' | 'intersecting' | 'contains' | 'connects' | ...
  weight?: number;
  blessed?: boolean; // inferred (absent/false) vs blessed (true)
  via?: string;
  /** Grounded justification for this claim — the substance behind "why?". */
  reasoning?: string;
}

export interface MMNode {
  id: string;
  reps: Rep[];
  edges: Edge[];
  capability: Capability;
  createdAt: number;
}

// ===== Bootstrap type nodes =====
// Not privileged — just nodes many others connect to ("popular, not sacred").

export const BUILTIN_TYPES = ['circle', 'line', 'rectangle', 'triangle', 'arc'] as const;

export function typeNodeId(type: string): string {
  return `type:${type}`;
}

// ===== Participants =====
// One class of citizen: humans, AI agents, and the engine's own recognizers
// are all participants — nodes that contribute attributed acts to the shared
// canvas. What differs is the nuance of their marks (humans enter through
// stroke dynamics; agents may enter through words, refined geometry, or
// payloads), not their standing.

export type ParticipantKind = 'human' | 'agent' | 'engine';

/** The default local human, present in every session. */
export const LOCAL_PARTICIPANT = 'participant:local';
/** The engine's Tier-0 heuristics — the medium is itself a participant. */
export const TIER0_PARTICIPANT = 'participant:tier0';

export function createParticipantNode(
  id: string,
  kind: ParticipantKind,
  name: string,
  at: number,
  /**
   * Which tier this participant speaks at. Humans and the engine's own
   * heuristics are 0; a local model is 1, a hosted one 2 (ARCHITECTURE-v7 §4).
   * Tiers are simultaneous, so this labels a voice — it never ranks one above
   * another or gates what a participant may propose.
   */
  capability: Capability = 0
): MMNode {
  return {
    id,
    reps: [
      { modality: 'participant', data: { kind } },
      { modality: 'word', data: name },
    ],
    edges: [],
    capability,
    createdAt: at,
  };
}

/**
 * An answer placed IN the canvas rather than in a chat log.
 *
 * An explanation is a node like everything else: attributed, positioned,
 * erasable, and — crucially — **unblessed**. It is a participant's proposal
 * about some marks, not a verdict, so several participants can answer the same
 * question and every answer is held (ARCHITECTURE-v7 §4.1).
 */
export interface ExplanationData {
  question: string;
  text: string;
}

export function createExplanationNode(
  id: string,
  data: ExplanationData,
  aboutIds: string[],
  bounds: Bounds,
  participantId: string,
  capability: Capability,
  at: number
): MMNode {
  return {
    id,
    reps: [
      { modality: 'explanation', data, source: participantId },
      { modality: 'bounds', data: bounds },
    ],
    edges: [
      // `about` is inferred, not blessed: the human may disagree that this
      // answer is about these marks, and ignoring it is a valid response.
      ...aboutIds.map((to) => ({ to, rel: 'about' })),
      { to: participantId, rel: 'made-by', blessed: true },
    ],
    capability,
    createdAt: at,
  };
}

export function isExplanation(node: MMNode): boolean {
  return node.reps.some((r) => r.modality === 'explanation');
}

export function explanationOf(node: MMNode): ExplanationData | undefined {
  return getRep(node, 'explanation')?.data as ExplanationData | undefined;
}

/** Which marks an explanation claims to be about. */
export function aboutIdsOf(node: MMNode): string[] {
  return node.edges.filter((e) => e.rel === 'about').map((e) => e.to);
}

export function isParticipant(node: MMNode): boolean {
  return getRep(node, 'participant') !== undefined;
}

export function createBootstrapNodes(at: number): MMNode[] {
  return [
    ...BUILTIN_TYPES.map((t) => ({
      id: typeNodeId(t),
      reps: [{ modality: 'word', data: t, source: 'bootstrap' }],
      edges: [],
      capability: 0 as const,
      createdAt: at,
    })),
    createParticipantNode(LOCAL_PARTICIPANT, 'human', 'local', at),
    createParticipantNode(TIER0_PARTICIPANT, 'engine', 'tier0-heuristics', at),
  ];
}

// ===== Accessors =====

export function getRep(node: MMNode, modality: string): Rep | undefined {
  return node.reps.find((r) => r.modality === modality);
}

export function fingerprintOf(node: MMNode): Fingerprint | undefined {
  return getRep(node, 'fingerprint')?.data as Fingerprint | undefined;
}

export function strokePointsOf(node: MMNode): Point[] | undefined {
  const rep = getRep(node, 'stroke');
  return rep ? (rep.data as { points: Point[] }).points : undefined;
}

export function wordOf(node: MMNode): string | undefined {
  return getRep(node, 'word')?.data as string | undefined;
}

export function isGesture(node: MMNode): boolean {
  return getRep(node, 'gesture') !== undefined;
}

/** Ranked 'resembles' interpretations — the held multi-parse. */
export function resemblances(node: MMNode): Edge[] {
  return node.edges
    .filter((e) => e.rel === 'resembles')
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
}

/** The current best reading of a node: blessed name, else top resemblance. */
export function topInterpretation(node: MMNode): string | undefined {
  const name = wordOf(node);
  if (name) return name;
  const top = resemblances(node)[0];
  return top ? top.to.replace(/^type:/, '') : undefined;
}

export function boundsOf(node: MMNode): Bounds | undefined {
  const fp = fingerprintOf(node);
  if (fp) return fp.bounds;
  return getRep(node, 'bounds')?.data as Bounds | undefined;
}

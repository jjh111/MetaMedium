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

export function createBootstrapNodes(at: number): MMNode[] {
  return BUILTIN_TYPES.map((t) => ({
    id: typeNodeId(t),
    reps: [{ modality: 'word', data: t, source: 'bootstrap' }],
    edges: [],
    capability: 0,
    createdAt: at,
  }));
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

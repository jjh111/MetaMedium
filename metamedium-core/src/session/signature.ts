// Structural signatures: what a group of marks IS, as a small graph.
//
// The first signature was a histogram — "3 circle + 2 line" — and it could not
// tell a circle with two lines inside it from a circle with two lines lying
// against it. Those are different things a user might name, and a definition
// that cannot tell them apart matches the wrong one and cannot be corrected.
//
// So a signature is now two bags: the shapes (the histogram, kept) and the
// LINKS between them — every engaging relation the canvas can see between two
// members, keyed by the shapes at each end. `circle>contains>line ×2` is what
// makes the first group; `circle-touching-line ×2` the second. Bags, not an
// ordered graph, so the signature is free of drawing order and of which
// circle was which; and small, so it is cheap to compare and plain to print.
//
// Similarity is measured, with reasoning, and matches rank plurally: the
// engine offers every definition above the floor, best first, and says in
// words what matched and what did not. A `correct` event adds a group's
// signature to a definition's accepted or rejected examples, so a wrong match
// is corrected once and stays corrected — the human decided, the engine
// remembers, and nothing here knows what any definition is called.

import type { Edge, MMNode } from './nodes';

/** The bag of shapes and the bag of links between them. */
export interface StructuralSignature {
  /** Type histogram: `{ circle: 3, line: 2 }`. */
  shapes: Record<string, number>;
  /** Link histogram, keyed `a>rel>b` (directed) or `a-rel-b` (symmetric, ends sorted). */
  links: Record<string, number>;
  /** How many marks. */
  size: number;
}

/** What a definition has been told, by correction, about groups that are and are not it. */
export interface Examples {
  accepted: StructuralSignature[];
  rejected: StructuralSignature[];
}

export interface SignatureMatch {
  score: number;
  reasoning: string;
}

/**
 * The relations that make a link. Directed ones are kept from the container's
 * end only, so a pair contributes one link, not two; positional relations
 * (above, same-row, …) are layout, not structure, and are left out — a
 * molecule drawn on its side is the same molecule.
 */
export const DIRECTED_LINKS = new Set(['contains', 'points-to']);
export const SYMMETRIC_LINKS = new Set(['crossing', 'touching', 'near', 'connects']);

/** A definition is offered as a match at or above this similarity. */
export const MATCH_FLOOR = 0.75;
/** At or above this, two signatures are the same thing — what a rejection is compared at. */
export const SAME = 0.999;

const SHAPE_WEIGHT = 0.6;
const LINK_WEIGHT = 0.4;

/**
 * The signature of a group, read from the node graph. `typeOf` says what each
 * member reads as (its top interpretation), and the links are the engaging
 * edges between members — the same held relations the palette and the diagram
 * rung read from.
 */
export function structuralSignature(
  ids: readonly string[],
  nodes: ReadonlyMap<string, MMNode>,
  typeOf: (id: string) => string
): StructuralSignature {
  const members = new Set(ids);
  const shapes: Record<string, number> = {};
  const links: Record<string, number> = {};
  const types = new Map<string, string>();
  for (const id of ids) {
    const t = typeOf(id);
    types.set(id, t);
    shapes[t] = (shapes[t] ?? 0) + 1;
  }
  // Each unordered pair contributes each symmetric relation once, whichever
  // end recorded it; a directed relation is recorded once from its source.
  const seen = new Set<string>();
  for (const id of ids) {
    const node = nodes.get(id);
    if (!node) continue;
    for (const e of node.edges as Edge[]) {
      if (!members.has(e.to) || e.to === id) continue;
      const a = types.get(id)!, b = types.get(e.to)!;
      let key: string;
      if (DIRECTED_LINKS.has(e.rel)) {
        key = `${a}>${e.rel}>${b}`;
      } else if (SYMMETRIC_LINKS.has(e.rel)) {
        const [x, y] = [a, b].sort();
        key = `${x}-${e.rel}-${y}`;
      } else continue;
      const pair = [id, e.to].sort().join('|') + '|' + e.rel;
      if (seen.has(pair)) continue;
      seen.add(pair);
      links[key] = (links[key] ?? 0) + 1;
    }
  }
  return { shapes, links, size: ids.length };
}

function bagDistance(a: Record<string, number>, b: Record<string, number>): { shared: number; total: number } {
  let shared = 0, total = 0;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const x = a[k] ?? 0, y = b[k] ?? 0;
    shared += Math.min(x, y);
    total += Math.max(x, y);
  }
  return { shared, total };
}

function printBag(bag: Record<string, number>): string {
  return Object.entries(bag)
    .sort((p, q) => q[1] - p[1] || p[0].localeCompare(q[0]))
    .map(([k, v]) => (v > 1 ? `${v}×${k}` : k))
    .join(' + ');
}

/** "3×circle + 2×line; circle>contains>line ×2" — the signature, in words. */
export function describeStructure(sig: StructuralSignature): string {
  const shapes = printBag(sig.shapes) || 'nothing';
  const links = Object.entries(sig.links)
    .sort((p, q) => q[1] - p[1] || p[0].localeCompare(q[0]))
    .map(([k, v]) => (v > 1 ? `${k} ×${v}` : k))
    .join(', ');
  return links ? `${shapes}; ${links}` : `${shapes}; no links`;
}

/**
 * How alike two signatures are, 0–1, and why. Shapes count for more than
 * links (a group of different shapes is a different thing before its
 * arrangement is looked at), but only the links can tell two groups with the
 * same shapes apart.
 */
export function compareSignatures(a: StructuralSignature, b: StructuralSignature): SignatureMatch {
  const s = bagDistance(a.shapes, b.shapes);
  const l = bagDistance(a.links, b.links);
  const shapeScore = s.total === 0 ? 1 : s.shared / s.total;
  const linkScore = l.total === 0 ? 1 : l.shared / l.total;
  const score = SHAPE_WEIGHT * shapeScore + LINK_WEIGHT * linkScore;
  const parts: string[] = [];
  parts.push(shapeScore >= SAME ? `same shapes (${printBag(a.shapes)})` : `shapes ${s.shared}/${s.total} in common`);
  if (l.total === 0) parts.push('no links either side');
  else parts.push(linkScore >= SAME ? `same links (${Object.keys(a.links).length} kind${Object.keys(a.links).length === 1 ? '' : 's'})` : `links ${l.shared}/${l.total} in common`);
  return { score, reasoning: parts.join('; ') };
}

/**
 * A group against one definition: its signature, its accepted examples, and
 * its rejected ones. The best of signature-or-accepted is the score; a
 * rejected example the group is the same as vetoes the match outright, with
 * the correction named as the reason.
 */
export function matchDefinition(
  group: StructuralSignature,
  definition: StructuralSignature,
  examples?: Examples
): SignatureMatch & { vetoed: boolean } {
  for (const r of examples?.rejected ?? []) {
    if (compareSignatures(group, r).score >= SAME) {
      return { score: 0, vetoed: true, reasoning: 'a group like this was corrected: not this' };
    }
  }
  let best = compareSignatures(group, definition);
  let via = 'the definition';
  for (const a of examples?.accepted ?? []) {
    const m = compareSignatures(group, a);
    if (m.score > best.score) { best = m; via = 'an accepted example'; }
  }
  return { score: best.score, vetoed: false, reasoning: `${best.reasoning} — against ${via}` };
}

/** Add a group's signature to a definition's examples, deduplicated, and take it off the other list. */
export function addExample(examples: Examples | undefined, sig: StructuralSignature, verdict: 'is' | 'is-not'): Examples {
  const ex: Examples = { accepted: [...(examples?.accepted ?? [])], rejected: [...(examples?.rejected ?? [])] };
  const same = (s: StructuralSignature) => compareSignatures(s, sig).score >= SAME;
  if (verdict === 'is') {
    ex.rejected = ex.rejected.filter((s) => !same(s));
    if (!ex.accepted.some(same)) ex.accepted.push(sig);
  } else {
    ex.accepted = ex.accepted.filter((s) => !same(s));
    if (!ex.rejected.some(same)) ex.rejected.push(sig);
  }
  return ex;
}

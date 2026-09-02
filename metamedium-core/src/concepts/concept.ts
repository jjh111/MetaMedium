// Concepts: the meaning-mappings, kept as a library rather than as code paths.
//
// A drawing surface that recognises circles and rectangles knows shapes. What
// makes marks MEAN something is the relations between them — three peers in a
// row is a nav bar, a box holding boxes is a frame, marks joined end to end are
// a flow. Those readings are the vocabulary of the medium, so they live in one
// place, as data, and they are matched against the Tier 0 relation graph rather
// than being special-cased in the session.
//
// Two things follow from keeping them declarative:
//
//   - **They can be added without touching the engine.** A concept is a name, a
//     predicate over relations, and a list of what it can become.
//   - **They are not the model's job.** Insideness, nearness, alignment and
//     peerhood are things the canvas measured. A concept built on them is Tier 0
//     — available offline, instantly, and identically every time. A model may
//     add readings beside these; it never has to supply them.
//
// The user's own named artifacts are concepts too. This file holds the ones
// that are structural rather than personal — the grammar, not the vocabulary.
//
// Concepts are built ON THE DIAGRAM RUNG (KEYFRAMES.md Stage 5), not on raw
// shapes. A row is a run of `node`s; a frame is a `container` and what it
// holds; a flow is `node`s joined by `edge`s. Asking the roles instead of the
// shapes made every predicate shorter, and gave the flow its direction for free.

import type { Mark, Relation } from '../relate/relations';
import type { Role, RoleReading } from '../diagram/roles';
import { assignRoles } from '../diagram/roles';
import { has } from '../relate/relations';

export interface ConceptScope {
  ids: string[];
  marks: Mark[];
  relations: Relation[];
  /** What Tier 0 reads each mark as: 'rectangle', 'circle', 'line'… */
  shapes: Record<string, string>;
  /** Names the human has already given these marks, where they have. */
  names: Record<string, string>;
  /** What the writing says, where a participant has read it (top transcript). */
  transcripts?: Record<string, string>;
  /** The diagram rung — what each mark plays. Concepts are built on these. */
  roles?: RoleReading[];
}

/** What a concept can be turned into. */
export interface Conversion {
  id: string;
  label: string;
  /**
   * Whether the engine can do this alone. Tier 0 conversions are the ones that
   * make the canvas worth using with no model attached at all.
   */
  tier: 0 | 2;
  /** What it does, for the surface to carry out. */
  effect:
    | { kind: 'name' }
    | { kind: 'tidy'; axis: 'row' | 'column' }
    | { kind: 'equalize' }
    | { kind: 'prompt'; seed: string };
  /** One line saying what will happen. */
  hint?: string;
}

export interface ConceptMatch {
  concept: string;
  confidence: number;
  /** Grounded, in the terms it was measured in. */
  reasoning: string;
  /** Which marks play which part, when the concept has parts. */
  roles?: Record<string, string[]>;
  conversions: Conversion[];
}

export interface Concept {
  name: string;
  /** Shown under the name in the palette. */
  describes: string;
  match(scope: ConceptScope): Omit<ConceptMatch, 'concept' | 'conversions'> | null;
  conversions: Conversion[];
}

// ===== Shared conversions =====

const NAME: Conversion = {
  id: 'name',
  label: 'Name this…',
  tier: 0,
  effect: { kind: 'name' },
  hint: 'hold it as a thing you can use again',
};

const prompt = (id: string, label: string, seed: string, hint: string): Conversion => ({
  id,
  label,
  tier: 2,
  effect: { kind: 'prompt', seed },
  hint,
});

const tidy = (axis: 'row' | 'column'): Conversion => ({
  id: `tidy-${axis}`,
  label: axis === 'row' ? 'Line up across' : 'Line up down',
  tier: 0,
  effect: { kind: 'tidy', axis },
  hint: 'align and space them evenly',
});

const EQUALIZE: Conversion = {
  id: 'equalize',
  label: 'Match sizes',
  tier: 0,
  effect: { kind: 'equalize' },
  hint: 'make them the same size as the largest',
};

// ===== Helpers over the relation graph =====

const strongest = (rels: Relation[], kind: Relation['kind'], from: string, to: string): number =>
  has(rels, kind, from, to)?.strength ?? 0;

/** Mean strength of a relation across every pair in the scope. */
function pairwise(scope: ConceptScope, kind: Relation['kind']): number {
  const { ids, relations } = scope;
  if (ids.length < 2) return 0;
  let total = 0;
  let pairs = 0;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      total += strongest(relations, kind, ids[i], ids[j]);
      pairs++;
    }
  }
  return pairs ? total / pairs : 0;
}

/** Marks in the order they sit along an axis. */
function ordered(scope: ConceptScope, axis: 'x' | 'y'): string[] {
  const centre = (id: string) => {
    const b = scope.marks.find((m) => m.id === id)!.bounds;
    return axis === 'x' ? (b.minX + b.maxX) / 2 : (b.minY + b.maxY) / 2;
  };
  return [...scope.ids].sort((a, b) => centre(a) - centre(b));
}

/** Mean strength of a relation between CONSECUTIVE marks along an axis. */
function chainStrength(scope: ConceptScope, kind: Relation['kind'], axis: 'x' | 'y'): number {
  if (scope.ids.length < 2) return 0;
  const seq = ordered(scope, axis);
  let total = 0;
  for (let i = 1; i < seq.length; i++) total += strongest(scope.relations, kind, seq[i - 1], seq[i]);
  return total / (seq.length - 1);
}

// ===== The diagram rung, as concepts see it =====

/**
 * Roles for the scope. `session.read()` supplies them; a caller that built a
 * scope by hand gets them derived from the shapes, with no wires.
 */
function rolesOf(scope: ConceptScope): RoleReading[] {
  if (scope.roles) return scope.roles;
  const shapeConfidence: Record<string, number> = {};
  for (const id of scope.ids) shapeConfidence[id] = 0.8;
  return assignRoles({ ids: scope.ids, shapes: scope.shapes, shapeConfidence, relations: scope.relations, wires: {} });
}

const withRole = (scope: ConceptScope, role: Role): RoleReading[] =>
  rolesOf(scope).filter((r) => r.role === role);

const allPlay = (scope: ConceptScope, role: Role): boolean =>
  scope.ids.length > 0 && rolesOf(scope).every((r) => r.role === role);

/**
 * A run of peers along one axis.
 *
 * **Alignment is the confidence, not the gate.** Requiring marks to already sit
 * on a clean line before calling them a row means the concept only fires on
 * drawings that need no tidying — exactly backwards, since offering to line them
 * up is the most useful thing it can do. What makes a row is that the marks sit
 * BESIDE each other, sharing a band, comparable in size. How straight they are
 * is how confident the reading is, and it is said out loud so the human can see
 * why the offer is there.
 */
function runOfPeers(scope: ConceptScope, axis: 'x' | 'y') {
  const beside: Relation['kind'] = axis === 'x' ? 'left-of' : 'above';
  const shares: Relation['kind'] = axis === 'x' ? 'same-row' : 'same-column';
  if (scope.ids.length < 2) return null;
  // Peers are NODES. A container is not a peer of what it holds, and an edge is
  // not a peer of anything — the role table already settled both.
  if (!allPlay(scope, 'node')) return null;

  const seq = ordered(scope, axis);
  const bands: number[] = [];
  for (let i = 1; i < seq.length; i++) {
    const strength = strongest(scope.relations, beside, seq[i - 1], seq[i]);
    if (strength === 0) return null; // a break in the run: not a row
    // Adjacency has to hold between NEIGHBOURS, not merely on average. Two
    // boxes beside each other and a third two thousand pixels away still
    // averages out as "nearish", and is plainly not a row.
    const adjacent =
      strongest(scope.relations, 'near', seq[i - 1], seq[i]) ||
      strongest(scope.relations, 'touching', seq[i - 1], seq[i]);
    if (adjacent === 0) return null;
    bands.push(strength);
  }
  const band = bands.reduce((a, b) => a + b, 0) / bands.length;
  const peers = pairwise(scope, 'same-size');
  const close = chainStrength(scope, 'near', axis);
  const aligned = chainStrength(scope, shares, axis);
  if (peers < 0.3) return null;

  return {
    confidence: band * 0.3 + peers * 0.3 + close * 0.2 + aligned * 0.2,
    reasoning:
      `${scope.ids.length} comparable marks sitting ${axis === 'x' ? 'side by side' : 'one under another'} ` +
      `(overlap ${band.toFixed(2)}, similarity ${peers.toFixed(2)}) — ` +
      (aligned > 0.6 ? 'already well lined up' : aligned > 0.25 ? 'roughly lined up' : 'not lined up yet'),
  };
}


// ===== The library =====

export const BUILTIN_CONCEPTS: Concept[] = [
  {
    name: 'row',
    describes: 'peers side by side',
    conversions: [tidy('row'), EQUALIZE, NAME,
      prompt('nav', 'Make a nav bar', 'a navigation bar', 'links across the top'),
      prompt('cols', 'Make columns', 'a page laid out in columns', 'equal columns of content')],
    match(scope) {
      return runOfPeers(scope, 'x');
    },
  },
  {
    name: 'column',
    describes: 'peers stacked',
    conversions: [tidy('column'), EQUALIZE, NAME,
      prompt('list', 'Make a list', 'a vertical list of items', 'one item per row'),
      prompt('form', 'Make a form', 'a form with labelled fields', 'fields stacked down the page')],
    match(scope) {
      return runOfPeers(scope, 'y');
    },
  },
  {
    name: 'frame',
    describes: 'a mark holding others',
    conversions: [NAME,
      prompt('card', 'Make a card', 'a card with a heading and body', 'contents inside a bordered box'),
      prompt('page', 'Make a page', 'a page', 'the outer mark becomes the page')],
    match(scope) {
      const containers = withRole(scope, 'container');
      if (containers.length === 0) return null;
      const contents = [...new Set(containers.flatMap((c) => c.targets))];
      const confidence = containers.reduce((a, c) => a + c.confidence, 0) / containers.length;
      return {
        confidence,
        reasoning: `${containers.length} container${containers.length === 1 ? '' : 's'} holding ${contents.length} mark${contents.length === 1 ? '' : 's'}`,
        roles: { container: containers.map((c) => c.id), contents },
      };
    },
  },
  {
    name: 'flow',
    describes: 'marks joined by lines',
    conversions: [NAME,
      prompt('flowchart', 'Make a flowchart', 'a flowchart with labelled steps', 'boxes and arrows as steps'),
      prompt('pipeline', 'Make a pipeline', 'a processing pipeline', 'each box a stage')],
    match(scope) {
      const nodes = withRole(scope, 'node').map((r) => r.id);
      const edges = withRole(scope, 'edge');
      if (edges.length === 0 || nodes.length < 2) return null;
      const directed = edges.filter((e) => e.direction).length;
      return {
        confidence: Math.min(0.9, 0.45 + (edges.length / Math.max(1, nodes.length - 1)) * 0.45),
        reasoning:
          `${nodes.length} nodes joined by ${edges.length} edge${edges.length === 1 ? '' : 's'}` +
          (directed ? `, ${directed} of them pointing somewhere` : ''),
        roles: { nodes, links: edges.map((e) => e.id) },
      };
    },
  },
  {
    name: 'grid',
    describes: 'rows and columns of peers',
    conversions: [EQUALIZE, NAME,
      prompt('table', 'Make a table', 'a table with a header row', 'cells in rows and columns'),
      prompt('gallery', 'Make a gallery', 'a gallery of cards', 'a card per cell')],
    match(scope) {
      if (scope.ids.length < 4) return null;
      if (!allPlay(scope, 'node')) return null;
      const rows = chainStrength(scope, 'same-row', 'x');
      const cols = chainStrength(scope, 'same-column', 'y');
      const peers = pairwise(scope, 'same-size');
      // Both axes must be doing real work, or it is a row or a column.
      if (pairwise(scope, 'same-row') < 0.2 || pairwise(scope, 'same-column') < 0.2) return null;
      if (peers < 0.4) return null;
      return {
        confidence: Math.min(0.9, (rows + cols) * 0.3 + peers * 0.4),
        reasoning: `${scope.ids.length} peers aligned on both axes`,
      };
    },
  },
  {
    name: 'labelled',
    describes: 'a mark with something written in it',
    conversions: [NAME,
      prompt('button', 'Make a button', 'a button with that label', 'the inner mark is the label'),
      prompt('field', 'Make an input', 'a labelled input field', 'the inner mark is the placeholder')],
    match(scope) {
      // A label placed by the table's row 2: writing sitting inside a closed mark.
      const labels = withRole(scope, 'label').filter((l) => l.rule === 2);
      if (labels.length === 0) return null;
      return {
        confidence: labels.reduce((a, l) => a + l.confidence, 0) / labels.length,
        reasoning: `${labels.length} mark${labels.length === 1 ? '' : 's'} of writing inside a box`,
        roles: { box: [...new Set(labels.flatMap((l) => l.targets))], label: labels.map((l) => l.id) },
      };
    },
  },
];

/**
 * Every concept that reads this scope, best first.
 *
 * Plural on purpose. Four boxes in a line are a row AND a set of peers AND
 * possibly a nav bar, and the canvas holds all of it — the same rule the shape
 * detectors follow (ARCHITECTURE-v6 principle 2).
 */
export function matchConcepts(scope: ConceptScope, library: Concept[] = BUILTIN_CONCEPTS): ConceptMatch[] {
  const out: ConceptMatch[] = [];
  for (const concept of library) {
    const m = concept.match(scope);
    if (!m || m.confidence <= 0) continue;
    out.push({ concept: concept.name, conversions: concept.conversions, ...m });
  }
  return out.sort((a, b) => b.confidence - a.confidence);
}

// The diagram rung: what a mark PLAYS, as against what it is.
//
// KEYFRAMES.md §2–3. The shape rung says "rectangle"; this rung says
// "container". It is the link between seeing a shape and writing a div, and it
// is a CLOSED vocabulary of six — which is the whole point. Six entries can be
// enumerated on one screen, tested exhaustively, and argued with; the mapping
// from shape-plus-context to role is a table that IS the library, not a
// predicate hidden in a function.
//
// The table is read top to bottom and the first row that matches wins. A mark
// no row places is `unclassified`, said out loud — the canvas can name a gap it
// cannot fill, which an open-ended library never could.

import type { Relation } from '../relate/relations';
import { has } from '../relate/relations';

export type Role = 'container' | 'node' | 'edge' | 'label' | 'annotation' | 'unclassified';

export const ROLES: readonly Role[] = ['container', 'node', 'edge', 'label', 'annotation', 'unclassified'];

export interface RoleReading {
  id: string;
  role: Role;
  /** 0–1, from the strengths of the relations the rule used. */
  confidence: number;
  /** Which row of the table placed it. 0 = none did. */
  rule: number;
  /** Why, in the terms it was measured in. */
  reasoning: string;
  /** What it holds (container), joins (edge), or belongs to (label / pointer). */
  targets: string[];
  /** For a directed edge: which way it points. */
  direction?: { from: string; to: string };
}

/** A wire the session inferred: a line or arrow whose ends landed on marks. */
export interface Wire {
  ends: string[];
  from?: string;
  to?: string;
}

export interface RoleScope {
  ids: string[];
  /** Top shape reading per mark: 'rectangle', 'arrow', 'text', … */
  shapes: Record<string, string>;
  /** Confidence of that top reading, 0–1. */
  shapeConfidence: Record<string, number>;
  relations: Relation[];
  /** Connectors keyed by the connector's id. */
  wires: Record<string, Wire>;
}

const CLOSED = new Set(['rectangle', 'circle', 'triangle']);
const CONNECTOR = new Set(['line', 'arrow', 'arc']);
const WRITING = new Set(['text', 'dot']);

const isClosed = (s: RoleScope, id: string) => CLOSED.has(s.shapes[id] ?? '');
const isConnector = (s: RoleScope, id: string) => CONNECTOR.has(s.shapes[id] ?? '');
const isWriting = (s: RoleScope, id: string) => WRITING.has(s.shapes[id] ?? '');
const inScope = (s: RoleScope, id: string) => s.ids.includes(id);

/** Marks this one wholly encloses, strongest first. */
function contents(s: RoleScope, id: string): Relation[] {
  return s.relations
    .filter((r) => r.kind === 'contains' && r.from === id && inScope(s, r.to))
    .sort((a, b) => b.strength - a.strength);
}

/** The smallest mark that wholly encloses this one. */
function enclosingMark(s: RoleScope, id: string): Relation | undefined {
  // `inside` is emitted for every ancestor; the strongest is the tightest fit.
  return s.relations
    .filter((r) => r.kind === 'inside' && r.from === id && inScope(s, r.to))
    .sort((a, b) => b.strength - a.strength)[0];
}

/** The nearest mark, by the `near` relation, when there is one. */
function nearestMark(s: RoleScope, id: string): Relation | undefined {
  return s.relations
    .filter((r) => r.kind === 'near' && r.from === id && inScope(s, r.to))
    .sort((a, b) => b.strength - a.strength)[0];
}

/**
 * Relations that mean two marks are actually ENGAGED with each other. Peerhood
 * and alignment are not: a note in the margin can be the same size as a box on
 * the page, or share a row with it, and still be in the margin.
 */
const ENGAGING = new Set<Relation['kind']>(['near', 'touching', 'crossing', 'contains', 'inside']);

function relatesToAnything(s: RoleScope, id: string): boolean {
  if (
    s.relations.some(
      (r) => ENGAGING.has(r.kind) && ((r.from === id && inScope(s, r.to)) || (r.to === id && inScope(s, r.from)))
    )
  )
    return true;
  if (s.wires[id]?.ends.some((e) => inScope(s, e))) return true;
  return Object.values(s.wires).some((w) => w.ends.includes(id));
}

/**
 * The table, applied to one mark. Rows are numbered as in KEYFRAMES.md §3.
 */
function place(s: RoleScope, id: string): RoleReading {
  const shape = s.shapes[id] ?? 'art';
  const shapeConf = s.shapeConfidence[id] ?? 0.5;
  const wire = s.wires[id];
  const ends = wire ? wire.ends.filter((e) => inScope(s, e) && e !== id) : [];

  // 1. closed, contains ≥1 mark → container
  const held = isClosed(s, id) ? contents(s, id) : [];
  if (held.length > 0) {
    const strength = held.reduce((a, r) => a + r.strength, 0) / held.length;
    return {
      id, role: 'container', rule: 1,
      confidence: Math.min(0.95, 0.5 + strength * 0.45),
      reasoning: `a ${shape} wholly enclosing ${held.length} mark${held.length === 1 ? '' : 's'}`,
      targets: held.map((r) => r.to),
    };
  }

  // 2. text or dot, inside a closed mark → label of it
  if (isWriting(s, id)) {
    const inside = enclosingMark(s, id);
    if (inside && isClosed(s, inside.to)) {
      return {
        id, role: 'label', rule: 2,
        confidence: Math.min(0.95, 0.55 + inside.strength * 0.4),
        reasoning: `${shape} sitting inside ${inside.to}`,
        targets: [inside.to],
      };
    }
  }

  // 3. text near a mark, not inside it → label of it (a caption)
  if (shape === 'text') {
    const near = nearestMark(s, id);
    if (near && near.strength > 0.25) {
      return {
        id, role: 'label', rule: 3,
        confidence: Math.min(0.85, 0.35 + near.strength * 0.45),
        reasoning: `writing beside ${near.to} — ${near.reasoning}`,
        targets: [near.to],
      };
    }
  }

  // 4. arrow with both ends on marks → edge, directed
  if (shape === 'arrow' && ends.length >= 2 && wire?.from && wire?.to) {
    return {
      id, role: 'edge', rule: 4,
      confidence: Math.min(0.95, 0.6 + shapeConf * 0.35),
      reasoning: `an arrow from ${wire.from} to ${wire.to}`,
      targets: ends,
      direction: { from: wire.from, to: wire.to },
    };
  }

  // 5. line with both ends on marks → edge, undirected
  if (isConnector(s, id) && ends.length >= 2) {
    return {
      id, role: 'edge', rule: 5,
      confidence: Math.min(0.9, 0.55 + shapeConf * 0.3),
      reasoning: `a ${shape} joining ${ends.join(' and ')}`,
      targets: ends,
    };
  }

  // 6. arrow or line with one end on a mark → annotation (a pointer)
  if (isConnector(s, id) && ends.length === 1) {
    return {
      id, role: 'annotation', rule: 6,
      confidence: 0.6,
      reasoning: `a ${shape} pointing at ${ends[0]} from nowhere in particular`,
      targets: ends,
    };
  }

  // 7. closed → node. A dot that something connects to is a node too — a
  //    terminus, a state, a bullet with a line to it.
  const wiredTo = Object.entries(s.wires).filter(([w, v]) => w !== id && v.ends.includes(id)).map(([w]) => w);
  if (isClosed(s, id) || (shape === 'dot' && wiredTo.length > 0)) {
    return {
      id, role: 'node', rule: 7,
      confidence: Math.min(0.92, 0.45 + shapeConf * 0.45),
      reasoning: wiredTo.length
        ? `a ${shape} with ${wiredTo.length} connector${wiredTo.length === 1 ? '' : 's'} attached`
        : `a ${shape} standing on its own`,
      targets: wiredTo,
    };
  }

  // 8. anything that relates to nothing → annotation
  if (!relatesToAnything(s, id)) {
    return {
      id, role: 'annotation', rule: 8,
      confidence: 0.5,
      reasoning: `a ${shape} touching nothing — a note in the margin`,
      targets: [],
    };
  }

  // 9. nothing matched — say so
  return {
    id, role: 'unclassified', rule: 0,
    confidence: 0,
    reasoning: `a ${shape} that relates to other marks, but not in a way the table names`,
    targets: [],
  };
}

/** Every mark's role. Order matches `scope.ids`. */
export function assignRoles(scope: RoleScope): RoleReading[] {
  return scope.ids.map((id) => place(scope, id));
}

// ===== Genre: a page and a flowchart do not compile the same way =====

export type Genre = 'layout' | 'graph' | 'mixed' | 'empty';

export interface GenreReading {
  genre: Genre;
  reasoning: string;
  counts: Record<Role, number>;
}

export function genreOf(roles: RoleReading[]): GenreReading {
  const counts = { container: 0, node: 0, edge: 0, label: 0, annotation: 0, unclassified: 0 } as Record<Role, number>;
  for (const r of roles) counts[r.role]++;
  const things = counts.container + counts.node;

  if (things === 0) {
    return { genre: 'empty', reasoning: 'nothing here plays a node or a container', counts };
  }
  if (counts.edge === 0) {
    return {
      genre: 'layout',
      reasoning: `${things} node${things === 1 ? '' : 's'}/container${things === 1 ? '' : 's'} and no edges — marks tiling a space`,
      counts,
    };
  }
  if (counts.container > 0) {
    return {
      genre: 'mixed',
      reasoning: `${counts.edge} edge${counts.edge === 1 ? '' : 's'} between ${counts.node} node${counts.node === 1 ? '' : 's'}, inside ${counts.container} container${counts.container === 1 ? '' : 's'}`,
      counts,
    };
  }
  return {
    genre: 'graph',
    reasoning: `${counts.node} node${counts.node === 1 ? '' : 's'} joined by ${counts.edge} edge${counts.edge === 1 ? '' : 's'}`,
    counts,
  };
}

/** The rung as text a model — or a person — can read. */
export function describeRoles(roles: RoleReading[], genre?: GenreReading): string {
  const lines: string[] = [];
  if (genre) lines.push(`GENRE: ${genre.genre} — ${genre.reasoning}`);
  lines.push('ROLES each mark plays:');
  for (const r of roles) {
    const dir = r.direction ? ` (${r.direction.from} → ${r.direction.to})` : '';
    const tg = r.targets.length && !r.direction ? ` [${r.targets.join(', ')}]` : '';
    lines.push(`  ${r.id}: ${r.role}${dir}${tg} — ${r.reasoning}`);
  }
  return lines.join('\n');
}

export { has as _hasRelation };

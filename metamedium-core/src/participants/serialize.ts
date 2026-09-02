// The graph as text a model can reason over.
//
// This is the actual test surface for v7's hypothesis: that a model operating
// on a structured space — where facts are already agreed with the human through
// the canvas — is better scaffolded than the same model reading a transcript or
// a screenshot. So this serializer sends GROUNDED FACTS, never pixels:
// fingerprints, spatial relations, existing readings, attribution.
//
// It also carries the disagreements. A model that can see "tier0 says circle
// (0.80), llm:qwen3 says letter-o (0.60)" can respond to the gap rather than
// re-deriving from scratch.

import type { MMNode } from '../session/nodes';
import type { SessionState } from '../session/session';
import { fingerprintOf, wordOf, boundsOf, isParticipant, isGesture, transcriptsOf } from '../session/nodes';
import { interpretationsOf } from '../session/interpretations';
import type { Rect, Region } from '../session/regions';
import type { Relation } from '../relate/relations';
import type { GenreReading, RoleReading } from '../diagram/roles';
import type { ConceptMatch, ConceptScope } from '../concepts/concept';

export interface SerializeOptions {
  /** Restrict to these nodes (e.g. a lasso's contents). Default: all content. */
  nodeIds?: string[];
  /** Include existing readings and who made them. Default: true. */
  includeInterpretations?: boolean;
  /** Round coordinates to whole pixels to keep the prompt small. Default: true. */
  round?: boolean;
}

function n(v: number, round: boolean): string {
  return round ? String(Math.round(v)) : v.toFixed(2);
}

function describeNode(
  node: MMNode,
  state: SessionState,
  opts: Required<Pick<SerializeOptions, 'includeInterpretations' | 'round'>>
): string {
  const lines: string[] = [];
  const name = wordOf(node);
  lines.push(`${node.id}${name ? ` (named "${name}")` : ''}`);

  const fp = fingerprintOf(node);
  if (fp) {
    lines.push(
      `  geometry: straightness ${fp.straightness.toFixed(2)}, ` +
        `${fp.corners} corner(s), ${fp.isClosed ? 'closed' : 'open'}, ` +
        `aspect ${fp.aspectRatio.toFixed(2)}, size ${n(fp.size, opts.round)}px`
    );
  }

  const b = boundsOf(node);
  if (b) {
    lines.push(
      `  at: (${n(b.minX, opts.round)},${n(b.minY, opts.round)})–` +
        `(${n(b.maxX, opts.round)},${n(b.maxY, opts.round)})`
    );
  }

  if (opts.includeInterpretations) {
    const reads = interpretationsOf(node, state.nodes);
    if (reads.length > 0) {
      lines.push('  read as:');
      for (const r of reads) {
        lines.push(
          `    - "${r.label}" ${r.weight.toFixed(2)} by ${r.sourceName}` +
            `${r.blessed ? ' [blessed]' : ''}${r.reasoning ? ` — ${r.reasoning}` : ''}`
        );
      }
    }
  }

  // What the writing says, as read — the one fact that came in as pixels.
  const said = transcriptsOf(node);
  if (said.length > 0) {
    lines.push('  writing reads:');
    for (const t of said) lines.push(`    - "${t.text}" ${t.confidence.toFixed(2)} by ${t.source ?? 'unknown'}`);
  }

  // Spatial relations are the part a screenshot cannot hand a model directly.
  const rels = node.edges.filter(
    (e) => e.rel !== 'resembles' && e.rel !== 'blessed-by' && e.rel !== 'made-by'
  );
  if (rels.length > 0) {
    const shown = rels.map((e) => `${e.rel} ${e.to}`).join(', ');
    lines.push(`  relations: ${shown}`);
  }

  return lines.join('\n');
}

/**
 * Render the session (or a slice of it) as grounded text.
 *
 * Participants and gesture strokes are excluded: an agent reasons about
 * content, and the lasso that selected the content is not part of what was
 * drawn.
 */
export function describeSession(state: SessionState, options: SerializeOptions = {}): string {
  const includeInterpretations = options.includeInterpretations ?? true;
  const round = options.round ?? true;

  const ids = options.nodeIds ?? state.contentIds;
  const nodes = ids
    .map((id) => state.nodes.get(id))
    .filter((x): x is MMNode => !!x && !isParticipant(x) && !isGesture(x));

  if (nodes.length === 0) return '(nothing on the canvas)';

  const parts: string[] = [];

  const named = state.artifacts
    .map((id) => state.nodes.get(id))
    .filter((x): x is MMNode => !!x)
    .map((a) => wordOf(a))
    .filter((w): w is string => !!w);
  if (named.length > 0) {
    parts.push(`Known names in this session: ${named.join(', ')}`);
  }

  const others = state.participants
    .map((id) => state.nodes.get(id))
    .filter((x): x is MMNode => !!x)
    .map((p) => wordOf(p))
    .filter((w): w is string => !!w);
  if (others.length > 0) parts.push(`Participants: ${others.join(', ')}`);

  parts.push(`Marks (${nodes.length}):`);
  for (const node of nodes) {
    parts.push(describeNode(node, state, { includeInterpretations, round }));
  }

  return parts.join('\n');
}

/** A compact type histogram — "3×circle + 2×line" — for cluster prompts. */
export function describeSignature(state: SessionState, nodeIds: string[]): string {
  const counts = new Map<string, number>();
  for (const id of nodeIds) {
    const node = state.nodes.get(id);
    if (!node) continue;
    const reads = interpretationsOf(node, state.nodes);
    const top = reads[0]?.label;
    if (!top) continue;
    counts.set(top, (counts.get(top) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => `${count}×${label}`)
    .join(' + ');
}

// ===== The region frame =====
//
// MVP.md §6.2: generated code is written INTO a frame the human drew. The
// rects below are not a suggestion the model may improve on — they are the
// layout, and the ink on the canvas is the record of them. A model that moves
// a region breaks the visible promise that the doodle outlines the div.


function rect(r: Rect, round = true): string {
  const v = (x: number) => (round ? Math.round(x) : Number(x.toFixed(2)));
  return `x=${v(r.x)} y=${v(r.y)} w=${v(r.w)} h=${v(r.h)}`;
}

/**
 * The drawn geometry as a layout contract. Local pixels, because that is the
 * coordinate space the generated code positions itself in.
 */
export function describeRegions(regions: Region[], frame: Rect): string {
  const lines = [`FRAME: ${Math.round(frame.w)}×${Math.round(frame.h)} px (origin 0,0 is the artifact's top-left).`];
  if (regions.length === 0) {
    lines.push('No regions were drawn — you may lay the frame out freely.');
    return lines.join('\n');
  }
  lines.push('', 'REGIONS the human drew, in artifact-local pixels:');
  for (const r of regions) {
    const nested = r.contains.length ? `, contains ${r.contains.join(', ')}` : '';
    lines.push(`  ${r.id}: ${rect(r.rect)} — drawn as a ${r.shape}${nested}`);
  }
  return lines.join('\n');
}

/** Which regions a mark drawn over a live artifact addresses. */
export function describeAddressed(regions: Region[], addressedIds: string[]): string {
  const hit = regions.filter((r) => addressedIds.includes(r.id));
  if (hit.length === 0) return 'The mark did not land on any region — treat it as addressing the whole artifact.';
  return [
    'The human drew over this artifact. The mark lands on:',
    ...hit.map((r) => `  ${r.id} (${rect(r.rect)}, drawn as a ${r.shape})`),
    'Change only what those regions cover. Leave the rest of the code as it is.',
  ].join('\n');
}

// ===== The reading, as a brief =====
//
// What `session.read()` returns is the engine's whole understanding of a set
// of marks: what each plays, how they sit, what the arrangement reads as. A
// model handed the layout tree alone writes a page that FITS the boxes; handed
// this as well, it can write the page the boxes were drawn FOR. "A page" is a
// two-word prompt; the drawing is the brief, and this is the drawing read out.

export interface ReadingLike {
  relations: Relation[];
  roles: RoleReading[];
  genre: GenreReading;
  concepts: ConceptMatch[];
  scope?: Partial<Pick<ConceptScope, 'names' | 'transcripts'>>;
}

export interface DescribeReadingOptions {
  /**
   * Rename marks for the reader — node ids to region ids, when the reader will
   * fill regions. A mark this returns undefined for is left out, because the
   * reader has no way to act on it.
   */
  idOf?: (nodeId: string) => string | undefined;
  /** Say what the region ids mean for the reader. Default: "region". */
  noun?: string;
}

const ENGAGING_RELATIONS: Relation['kind'][] = ['contains', 'near', 'touching', 'crossing'];

function roleLine(
  r: RoleReading,
  name: (id: string) => string | undefined,
  noun: string,
  said?: string
): string | undefined {
  const me = name(r.id);
  if (!me) return undefined;
  const others = r.targets.map(name).filter((x): x is string => !!x);
  switch (r.role) {
    case 'container':
      return `${me}: container${others.length ? `, holding ${others.join(', ')}` : ''} — its contents are its sections`;
    case 'label':
      if (said) {
        return others.length
          ? `${me}: label for ${others[0]} — the human wrote "${said}" there. Use those words: they are ${others[0]}'s title, and ${me} shows them`
          : `${me}: label — the human wrote "${said}". Use those words`;
      }
      return others.length
        ? `${me}: label for ${others[0]} — handwriting the human put there. You cannot read it; write the title or caption that belongs in that place, and treat ${others[0]} as titled by it`
        : `${me}: label — handwriting; write what belongs there`;
    case 'edge': {
      if (r.direction) {
        const from = name(r.direction.from), to = name(r.direction.to);
        if (from && to) return `${me}: edge ${from} → ${to} — a connection with a direction`;
      }
      return others.length ? `${me}: edge joining ${others.join(' and ')}` : `${me}: edge`;
    }
    case 'annotation':
      return `${me}: annotation${others.length ? ` near ${others[0]}` : ''} — a note in the margin, not part of the ${noun}s' content`;
    case 'node':
      return `${me}: node — a ${noun} that holds content of its own`;
    default:
      return `${me}: unclassified — ${r.reasoning}`;
  }
}

/**
 * The engine's reading of some marks, as text a model can act on.
 *
 * Says only what was measured: roles from the table, concepts with their
 * confidence, the relations that bind marks together, names the human gave.
 * Alignment and peerhood relations are folded into the concepts that use them
 * rather than listed pairwise — a row is one fact, not six.
 */
export function describeReading(reading: ReadingLike, options: DescribeReadingOptions = {}): string {
  const name = options.idOf ?? ((id: string) => id);
  const noun = options.noun ?? 'region';
  const lines: string[] = [];

  lines.push(`GENRE: ${reading.genre.genre} — ${reading.genre.reasoning}`);

  const roleLines = reading.roles
    .map((r) => roleLine(r, name, noun, reading.scope?.transcripts?.[r.id]))
    .filter((x): x is string => !!x);
  if (roleLines.length) {
    lines.push('', `WHAT EACH ${noun.toUpperCase()} PLAYS:`);
    for (const l of roleLines) lines.push(`  ${l}`);
  }

  const seen = new Set<string>();
  const sits: string[] = [];
  for (const c of reading.concepts) {
    const members = [...new Set(Object.values(c.roles ?? {}).flat())].map(name).filter((x): x is string => !!x);
    const who = members.length ? members.join(', ') : 'these marks';
    sits.push(`${who} read as a ${c.concept} (${c.confidence.toFixed(2)}) — ${c.reasoning}`);
  }
  for (const r of reading.relations) {
    if (!ENGAGING_RELATIONS.includes(r.kind)) continue;
    const a = name(r.from), b = name(r.to);
    if (!a || !b) continue;
    // Symmetric kinds once per pair; contains is directional and already unique.
    const key = r.kind === 'contains' ? `${r.kind}:${a}:${b}` : `${r.kind}:${[a, b].sort().join(':')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const verb = r.kind === 'contains' ? 'contains' : r.kind === 'near' ? 'is near' : r.kind === 'touching' ? 'touches' : 'crosses';
    sits.push(`${a} ${verb} ${b} (${r.strength.toFixed(2)})`);
  }
  if (sits.length) {
    lines.push('', 'HOW THEY SIT:');
    for (const l of sits) lines.push(`  ${l}`);
  }

  const names = Object.entries(reading.scope?.names ?? {})
    .map(([id, w]) => [name(id), w] as const)
    .filter((x): x is readonly [string, string] => !!x[0]);
  if (names.length) {
    lines.push('', 'NAMES the human gave:');
    for (const [id, w] of names) lines.push(`  ${id}: "${w}"`);
  }

  return lines.join('\n');
}

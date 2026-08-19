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
import { fingerprintOf, wordOf, boundsOf, isParticipant, isGesture } from '../session/nodes';
import { interpretationsOf } from '../session/interpretations';
import type { Rect, Region } from '../session/regions';

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

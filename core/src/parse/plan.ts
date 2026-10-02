// How a drawing compiles: the plan a page or a diagram is built from.
//
// One place decides it, so the model's fill and the engine's own structure
// (tier1/library.ts) build the same thing. The diagram rung picks the genre:
// boxes tiling a space reflow as a page (parse/layout.ts); nodes joined by
// edges keep their positions and their arrows (parse/graph.ts).

import type { Session } from '../session/session';
import { frameOf, regionsOf, type Region } from '../session/regions';
import { getRep, strokePointsOf } from '../session/nodes';
import type { Point } from '../types';
import { parseLayout, describeLayout, regionIdsIn } from './layout';
import { parseGraph, describeGraph, nodeIdsIn, buildGraphScaffold } from './graph';
import { buildScaffold, type RegionContent, type Theme } from './scaffold';

export interface Plan {
  genre: ReturnType<Session['read']>['genre']['genre'];
  /** The regions the artifact holds, in reading order — the ids the human, the model and the DOM share. */
  regions: Region[];
  /** The diagram rung's reading of them: relations, roles, genre, concepts. */
  reading: ReturnType<Session['read']>;
  /** What the structure places: a connector is an edge, not a region to fill. */
  ids: string[];
  /** The structure, in words, for a brief. */
  describe: string;
  /** The code, given content per region and a theme. */
  build: (content: Record<string, RegionContent>, theme: Theme) => string;
}

/** The connections among an artifact's members, in region ids. */
export function connectionsOf(
  artifact: { edges: { to: string; rel: string }[] },
  state: ReturnType<Session['getState']>,
  regions: { id: string; nodeId: string }[]
): { from: string; to: string; via?: string }[] {
  const byNode = new Map(regions.map((r) => [r.nodeId, r.id]));
  const out: { from: string; to: string; via?: string }[] = [];
  for (const e of artifact.edges) {
    if (e.rel !== 'has-part') continue;
    const node = state.nodes.get(e.to);
    if (!node) continue;
    const ends = node.edges.filter((x) => x.rel === 'connects').map((x) => byNode.get(x.to)).filter(Boolean) as string[];
    if (ends.length === 2) out.push({ from: ends[0], to: ends[1], via: byNode.get(node.id) });
  }
  return out;
}

/** The plan for an artifact, or why there is none. */
export function planFor(session: Session, artifactId: string): Plan | { error: string } {
  const state = session.getState();
  const artifact = state.nodes.get(artifactId);
  if (!artifact) return { error: 'no such artifact' };
  const frame = frameOf(artifact);
  if (!frame) return { error: 'artifact has no frame' };
  const regions = regionsOf(artifact, state.nodes);
  if (regions.length === 0) return { error: 'nothing was drawn inside the artifact' };
  const reading = session.read(regions.map((r) => r.nodeId));
  const genre = reading.genre.genre;
  if (genre === 'graph' || genre === 'mixed') {
    const strokes: Record<string, Point[]> = {};
    const arrows: Record<string, { tip: Point; tail: Point }> = {};
    for (const r of regions) {
      const n = state.nodes.get(r.nodeId);
      if (!n) continue;
      const pts = strokePointsOf(n);
      if (pts) strokes[r.nodeId] = pts;
      const a = getRep(n, 'reading:arrow')?.data as { tip: Point; tail: Point } | undefined;
      if (a) arrows[r.nodeId] = a;
    }
    const graph = parseGraph(regions, frame, reading.roles, { strokes, arrows });
    return { genre, regions, reading, ids: nodeIdsIn(graph), describe: describeGraph(graph), build: (c, t) => buildGraphScaffold(graph, c, t) };
  }
  const layout = parseLayout(regions, frame, connectionsOf(artifact, state, regions));
  return { genre, regions, reading, ids: regionIdsIn(layout), describe: describeLayout(layout), build: (c, t) => buildScaffold(layout, c, t) };
}

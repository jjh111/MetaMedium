// The graph code target, through a real session: draw a flowchart, read it,
// parse it, build it, and check the ink still lines up.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import { frameOf, regionsOf } from '../session/regions';
import { getRep, strokePointsOf } from '../session/nodes';
import { parseGraph, buildGraphScaffold, describeGraph, nodeIdsIn } from './graph';
import { validateRegions } from './scaffold';
import { handRect, handArrow, handLine, handText, handCircle, checkStroke } from '../test/strokes';
import type { Point } from '../types';

/** Draw the given strokes, circle them all, bless, and parse as a graph. */
function graphOf(draw: (s: ReturnType<typeof createSession>) => string[]) {
  const s = createSession();
  const memberIds = draw(s);
  const pts = memberIds.flatMap((id) => strokePointsOf(s.getState().nodes.get(id)!)!);
  const cx = (Math.min(...pts.map((p) => p.x)) + Math.max(...pts.map((p) => p.x))) / 2;
  const cy = (Math.min(...pts.map((p) => p.y)) + Math.max(...pts.map((p) => p.y))) / 2;
  const r = Math.max(...pts.map((p) => Math.hypot(p.x - cx, p.y - cy))) + 60;
  s.addStroke(handCircle(cx, cy, r, { seed: 9 }), 5000);
  s.addStroke(checkStroke(cx + r + 20, cy), 5200);
  const artId = s.bless({ summonId: s.getState().summon!.id, name: 'diagram', at: 6000 })!;
  const node = s.getState().nodes.get(artId)!;
  const regions = regionsOf(node, s.getState().nodes);
  const reading = s.read(regions.map((x) => x.nodeId));
  const strokes: Record<string, Point[]> = {};
  const arrows: Record<string, { tip: Point; tail: Point }> = {};
  for (const reg of regions) {
    const n = s.getState().nodes.get(reg.nodeId)!;
    strokes[reg.nodeId] = strokePointsOf(n)!;
    const a = getRep(n, 'reading:arrow')?.data as { tip: Point; tail: Point } | undefined;
    if (a) arrows[reg.nodeId] = a;
  }
  const frame = frameOf(node)!;
  const graph = parseGraph(regions, frame, reading.roles, { strokes, arrows });
  return { s, artId, regions, reading, frame, graph, memberIds };
}

describe('parseGraph', () => {
  it('reads two boxes and an arrow as two nodes and one directed edge', () => {
    const { graph, regions, memberIds } = graphOf((s) => [
      s.addStroke(handRect(100, 100, 140, 80, { seed: 1 }), 1000),
      s.addStroke(handRect(420, 100, 140, 80, { seed: 2 }), 1100),
      s.addStroke(handArrow({ x: 245, y: 140 }, { x: 415, y: 140 }, { seed: 3 }), 1200),
    ]);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
    const [a, b] = memberIds.map((id) => regions.find((r) => r.nodeId === id)!.id);
    expect(graph.edges[0].from).toBe(a);
    expect(graph.edges[0].to).toBe(b);
    expect(graph.edges[0].directed).toBe(true);
    expect(graph.unplaced).toEqual([]);
  });

  it('places nodes where they were drawn, in artifact-local pixels', () => {
    const { graph, frame } = graphOf((s) => [
      s.addStroke(handRect(100, 100, 140, 80, { seed: 1 }), 1000),
      s.addStroke(handRect(420, 100, 140, 80, { seed: 2 }), 1100),
      s.addStroke(handArrow({ x: 245, y: 140 }, { x: 415, y: 140 }, { seed: 3 }), 1200),
    ]);
    for (const n of graph.nodes) {
      expect(n.rect.x).toBeGreaterThanOrEqual(0);
      expect(n.rect.y).toBeGreaterThanOrEqual(0);
      expect(n.rect.x + n.rect.w).toBeLessThanOrEqual(frame.w + 1);
    }
  });

  it("an edge's path follows the drawn ink, tail first and cut at the tip", () => {
    const { graph } = graphOf((s) => [
      s.addStroke(handRect(100, 100, 140, 80, { seed: 1 }), 1000),
      s.addStroke(handRect(420, 100, 140, 80, { seed: 2 }), 1100),
      s.addStroke(handArrow({ x: 245, y: 140 }, { x: 415, y: 140 }, { seed: 3 }), 1200),
    ]);
    const e = graph.edges[0];
    const from = graph.nodes.find((n) => n.id === e.from)!;
    const to = graph.nodes.find((n) => n.id === e.to)!;
    const first = e.path[0], last = e.path[e.path.length - 1];
    // Starts by the tail node, ends by the tip node — not at the end of a wing.
    expect(Math.abs(first.x - (from.rect.x + from.rect.w))).toBeLessThan(20);
    expect(Math.abs(last.x - to.rect.x)).toBeLessThan(20);
    expect(e.path.length).toBeGreaterThan(5);
  });

  it('a plain line is an undirected edge', () => {
    const { graph } = graphOf((s) => [
      s.addStroke(handRect(100, 100, 140, 80, { seed: 1 }), 1000),
      s.addStroke(handRect(420, 100, 140, 80, { seed: 2 }), 1100),
      s.addStroke(handLine({ x: 242, y: 140 }, { x: 418, y: 140 }, { seed: 3 }), 1200),
    ]);
    expect(graph.edges[0].directed).toBe(false);
  });

  it('folds writing inside a box into that node, rather than making it a node of its own', () => {
    const { graph, regions, memberIds } = graphOf((s) => [
      s.addStroke(handRect(100, 100, 200, 70, { seed: 1 }), 1000),
      s.addStroke(handText(125, 118, 150, 30, { seed: 2, humps: 5 }), 1050),
      s.addStroke(handRect(480, 100, 200, 70, { seed: 3 }), 1100),
      s.addStroke(handArrow({ x: 305, y: 135 }, { x: 475, y: 135 }, { seed: 4 }), 1200),
    ]);
    const box = regions.find((r) => r.nodeId === memberIds[0])!.id;
    const word = regions.find((r) => r.nodeId === memberIds[1])!.id;
    expect(graph.nodes.map((n) => n.id)).not.toContain(word);
    expect(graph.nodes.find((n) => n.id === box)!.labels).toEqual([word]);
    expect(graph.unplaced).toEqual([]);
  });

  it('asks the model to fill nodes only — edges are structure', () => {
    const { graph } = graphOf((s) => [
      s.addStroke(handRect(100, 100, 140, 80, { seed: 1 }), 1000),
      s.addStroke(handRect(420, 100, 140, 80, { seed: 2 }), 1100),
      s.addStroke(handArrow({ x: 245, y: 140 }, { x: 415, y: 140 }, { seed: 3 }), 1200),
    ]);
    expect(nodeIdsIn(graph)).toHaveLength(2);
    expect(nodeIdsIn(graph)).not.toContain(graph.edges[0].id);
  });

  it('describes itself for a model', () => {
    const { graph } = graphOf((s) => [
      s.addStroke(handRect(100, 100, 140, 80, { seed: 1 }), 1000),
      s.addStroke(handRect(420, 100, 140, 80, { seed: 2 }), 1100),
      s.addStroke(handArrow({ x: 245, y: 140 }, { x: 415, y: 140 }, { seed: 3 }), 1200),
    ]);
    const text = describeGraph(graph);
    expect(text).toContain('GRAPH the drawing describes');
    expect(text).toContain('→');
    expect(text).toContain('placed where they were drawn');
  });
});

describe('buildGraphScaffold', () => {
  const build = () => {
    const g = graphOf((s) => [
      s.addStroke(handRect(100, 100, 140, 80, { seed: 1 }), 1000),
      s.addStroke(handRect(420, 100, 140, 80, { seed: 2 }), 1100),
      s.addStroke(handArrow({ x: 245, y: 140 }, { x: 415, y: 140 }, { seed: 3 }), 1200),
    ]);
    const content: Record<string, { html: string; tag?: string; style?: string }> = {};
    for (const n of g.graph.nodes) content[n.id] = { html: `<b>${n.id}</b>`, tag: 'section', style: 'padding:12px;background:#eef' };
    return { ...g, code: buildGraphScaffold(g.graph, content, { accent: '#c9a84c' }) };
  };

  it('gives every node and every edge an element carrying its region', () => {
    const { code, graph } = build();
    expect(validateRegions(code, [...graph.nodes.map((n) => n.id), ...graph.edges.map((e) => e.id)]).ok).toBe(true);
  });

  it('positions nodes absolutely — in a graph, the drawn position is the content', () => {
    const { code } = build();
    expect(code).toMatch(/data-region="r\d+" style="position:absolute;left:\d+px;top:\d+px;width:\d+px;height:\d+px"/);
  });

  it('draws directed edges as SVG paths with a head at the tip', () => {
    const { code } = build();
    expect(code).toContain('<svg class="mm-edges"');
    expect(code).toMatch(/<path data-region="r\d+" d="M[\d. ]+ L/);
    expect(code).toContain('marker-end="url(#mm-head)"');
  });

  it('keeps the region element pure and puts the model’s style one level in', () => {
    const { code } = build();
    const regionTag = code.match(/<section data-region="r\d+" style="([^"]*)"/)![1];
    expect(regionTag).not.toContain('padding');
    expect(code).toContain('padding:12px;background:#eef');
  });

  it('uses the theme accent for edges', () => {
    const { code } = build();
    expect(code).toContain('stroke="#c9a84c"');
  });
});

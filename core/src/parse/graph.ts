// The graph code target: a drawing whose GENRE is `graph` or `mixed`.
//
// KEYFRAMES.md Stage 4. `parse/layout.ts` reads a page — boxes tiling a space,
// where the drawn positions are a sketch of a flow that should reflow. A
// flowchart is the opposite: the drawn positions ARE the content, and an edge
// is a thing in its own right. Compiling a flowchart through the layout parser
// would flatten its boxes into flex columns and throw its arrows away.
//
// So here nodes are placed where they were drawn, edges are SVG paths that
// follow the ink the human actually laid down (with a head where the arrow
// pointed), and labels fold into the node they sit in. The same contract as
// the layout target holds: the engine owns structure, the model owns content,
// and `data-region` ties every element back to the mark that made it.

import type { Point } from '../types';
import type { Rect, Region } from '../session/regions';
import type { RoleReading } from '../diagram/roles';
import type { RegionContent, Theme } from './scaffold';

export interface GraphNode {
  /** Region id — the same id the model, the human and the DOM use. */
  id: string;
  nodeId: string;
  rect: Rect;
  shape: string;
  /** True when this node holds other nodes (genre `mixed`). Drawn behind them. */
  container: boolean;
  /** Region ids of writing that sits inside this node. */
  labels: string[];
}

export interface GraphEdge {
  id: string;
  nodeId: string;
  from: string;
  to: string;
  directed: boolean;
  /** The drawn stroke, in artifact-local pixels, tail first. */
  path: Point[];
  labels: string[];
}

export interface Graph {
  frame: Rect;
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Region ids the parse could not place — reported, never dropped silently. */
  unplaced: string[];
}

const esc = (s: string) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const styleAttr = (s: string) => esc(s).replace(/\n/g, ' ');

const SAFE_TAGS = new Set(['div', 'section', 'article', 'aside', 'figure', 'header', 'footer', 'nav', 'main', 'form']);

function closest(points: Point[], to: Point): number {
  let best = 0;
  let bestD = Infinity;
  points.forEach((p, i) => {
    const d = Math.hypot(p.x - to.x, p.y - to.y);
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}

export interface ParseGraphOptions {
  /** Each member's stroke, keyed by NODE id, in world coordinates. */
  strokes: Record<string, Point[]>;
  /** Arrow tip/tail per node id, where the shape rung measured one. */
  arrows?: Record<string, { tip: Point; tail: Point }>;
}

/**
 * Read regions plus their roles as a graph.
 *
 * Roles are keyed by NODE id (they come from `session.read`); regions carry the
 * region id ↔ node id mapping. Everything that reaches the model or the DOM is
 * said in region ids.
 */
export function parseGraph(regions: Region[], frame: Rect, roles: RoleReading[], opts: ParseGraphOptions): Graph {
  const byNode = new Map(regions.map((r) => [r.nodeId, r]));
  const roleOf = new Map(roles.map((r) => [r.id, r]));
  const regionIdOf = (nodeId: string) => byNode.get(nodeId)?.id;

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const unplaced: string[] = [];
  const labelsFor = new Map<string, string[]>(); // node id → label region ids

  // Labels first, so nodes and edges can pick theirs up.
  for (const r of regions) {
    const role = roleOf.get(r.nodeId);
    if (role?.role === 'label') {
      for (const t of role.targets) (labelsFor.get(t) ?? labelsFor.set(t, []).get(t)!).push(r.id);
    }
  }

  for (const r of regions) {
    const role = roleOf.get(r.nodeId);
    if (!role) { unplaced.push(r.id); continue; }
    switch (role.role) {
      case 'node':
      case 'container':
        nodes.push({
          id: r.id,
          nodeId: r.nodeId,
          rect: r.rect,
          shape: r.shape,
          container: role.role === 'container',
          labels: labelsFor.get(r.nodeId) ?? [],
        });
        break;
      case 'edge': {
        const world = opts.strokes[r.nodeId];
        const [fromNode, toNode] = role.direction
          ? [role.direction.from, role.direction.to]
          : [role.targets[0], role.targets[1]];
        const from = fromNode && regionIdOf(fromNode);
        const to = toNode && regionIdOf(toNode);
        if (!world || !from || !to) { unplaced.push(r.id); break; }
        // Tail first, and cut at the tip so the head marker sits where the
        // arrow pointed rather than at the end of a wing.
        let pts = world;
        const arrow = opts.arrows?.[r.nodeId];
        if (arrow) {
          const ti = closest(world, arrow.tip);
          const ta = closest(world, arrow.tail);
          pts = ti >= ta ? world.slice(ta, ti + 1) : world.slice(ti, ta + 1).reverse();
        }
        edges.push({
          id: r.id,
          nodeId: r.nodeId,
          from,
          to,
          directed: !!role.direction,
          path: pts.map((p) => ({ x: p.x - frame.x, y: p.y - frame.y })),
          labels: labelsFor.get(r.nodeId) ?? [],
        });
        break;
      }
      case 'label':
        break; // folded into what it labels
      default:
        unplaced.push(r.id);
    }
  }

  // Containers behind what they hold: larger first.
  nodes.sort((a, b) => (b.container ? 1 : 0) - (a.container ? 1 : 0) || b.rect.w * b.rect.h - a.rect.w * a.rect.h);
  return { frame, nodes, edges, unplaced };
}

/** Region ids the model is asked to fill: the nodes. Edges are structure. */
export function nodeIdsIn(graph: Graph): string[] {
  return graph.nodes.map((n) => n.id);
}

/** The graph as text a model can read. */
export function describeGraph(graph: Graph): string {
  const lines = [`GRAPH the drawing describes, in a ${Math.round(graph.frame.w)}×${Math.round(graph.frame.h)} frame:`];
  lines.push('NODES, placed where they were drawn:');
  for (const n of graph.nodes) {
    const lbl = n.labels.length ? ` — has writing in it (${n.labels.join(', ')})` : '';
    lines.push(`  ${n.id}: ${n.container ? 'container' : 'node'}, ${n.shape}, ${Math.round(n.rect.w)}×${Math.round(n.rect.h)} at (${Math.round(n.rect.x)},${Math.round(n.rect.y)})${lbl}`);
  }
  lines.push('EDGES, as drawn:');
  for (const e of graph.edges) {
    lines.push(`  ${e.id}: ${e.from} ${e.directed ? '→' : '—'} ${e.to}${e.labels.length ? ` labelled by ${e.labels.join(', ')}` : ''}`);
  }
  if (graph.unplaced.length) lines.push(`UNPLACED (rendered as ink only): ${graph.unplaced.join(', ')}`);
  return lines.join('\n');
}

function pathD(points: Point[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
}

/**
 * The finished artifact for a graph: nodes as positioned elements, edges as an
 * SVG layer underneath following the drawn ink, every one carrying its region.
 */
export function buildGraphScaffold(graph: Graph, content: Record<string, RegionContent>, theme: Theme = {}): string {
  const t = {
    background: theme.background ?? '#ffffff',
    color: theme.color ?? '#16161a',
    accent: theme.accent ?? '#3b5bdb',
    fontFamily: theme.fontFamily ?? "system-ui, -apple-system, 'Segoe UI', sans-serif",
  };
  const { w, h } = graph.frame;

  const edgeSvg = [
    `  <svg class="mm-edges" viewBox="0 0 ${Math.round(w)} ${Math.round(h)}" width="${Math.round(w)}" height="${Math.round(h)}" xmlns="http://www.w3.org/2000/svg">`,
    `    <defs><marker id="mm-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${styleAttr(t.accent)}"/></marker></defs>`,
    ...graph.edges.map(
      (e) =>
        `    <path data-region="${e.id}" d="${pathD(e.path)}" fill="none" stroke="${styleAttr(t.accent)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${e.directed ? ' marker-end="url(#mm-head)"' : ''}/>`
    ),
    '  </svg>',
  ].join('\n');

  const nodeHtml = graph.nodes
    .map((n) => {
      const own = content[n.id];
      const tag = own?.tag && SAFE_TAGS.has(own.tag) ? own.tag : 'div';
      const box = `position:absolute;left:${Math.round(n.rect.x)}px;top:${Math.round(n.rect.y)}px;width:${Math.round(n.rect.w)}px;height:${Math.round(n.rect.h)}px`;
      // The region element is pure geometry; the model's style goes one level in
      // (parse/scaffold.ts explains why — padding must inset, never resize).
      const fill = ['box-sizing:border-box', 'width:100%', 'height:100%', 'overflow:hidden', own?.style ?? ''].filter(Boolean).join(';');
      return `  <${tag} data-region="${n.id}" style="${styleAttr(box)}">\n    <div style="${styleAttr(fill)}">${own?.html ?? ''}</div>\n  </${tag}>`;
    })
    .join('\n');

  return [
    '<style>',
    `  .mm-frame { position:relative; width:100%; height:100%; overflow:hidden;`,
    `    background:${styleAttr(t.background)}; color:${styleAttr(t.color)}; font-family:${styleAttr(t.fontFamily)}; }`,
    '  .mm-frame *, .mm-frame *::before, .mm-frame *::after { box-sizing:border-box; }',
    '  .mm-frame .mm-edges { position:absolute; left:0; top:0; }',
    '  .mm-frame [data-region] { overflow:hidden; }',
    '  .mm-frame h1, .mm-frame h2, .mm-frame h3, .mm-frame p { margin:0 0 0.35em; }',
    '</style>',
    '<div class="mm-frame">',
    edgeSvg,
    nodeHtml,
    '</div>',
  ].join('\n');
}

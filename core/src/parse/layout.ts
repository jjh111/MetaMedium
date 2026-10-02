// Reading a drawing as a LAYOUT, not as a bag of rectangles.
//
// Regions alone give generation a set of pixel rects, and a model handed pixel
// rects writes absolutely-positioned divs — a faithful tracing of the ink that
// is not real code. It does not reflow, it has no semantics, and editing it
// means editing coordinates.
//
// What a human sees in four boxes is structure: a bar across the top, two
// columns beneath it, a bar across the bottom. That structure is recoverable
// from the geometry, and it is what turns the same drawing into flexbox with
// proportional sizing.
//
// The algorithm is a recursive XY-cut, borrowed from document layout analysis:
// look for a gap that runs clean across the group, split there, and recurse
// with the axis flipped. Nothing about it is specific to web pages — it reports
// what the drawing does, and the generator decides what to build from it.

import type { Rect, Region } from '../session/regions';

export type Flow = 'row' | 'column' | 'stack' | 'leaf';

export interface LayoutNode {
  /** Region id, or a synthetic `g1`, `g2`… for a group the cut discovered. */
  id: string;
  /** The region this node is, when it is one. Groups have no region of their own. */
  region: Region | null;
  /** Bounding rect in artifact-local pixels. */
  rect: Rect;
  /** How this node's children are arranged. */
  flow: Flow;
  children: LayoutNode[];
  /**
   * Each child's share of the main axis, 0–1, from the sizes the human drew.
   * This is what lets generated code be proportional rather than pixel-pinned.
   */
  fractions: number[];
  /** The gap between children along the main axis, in local pixels. */
  gap: number;
  /** Why this node reads the way it does — carried into the prompt and the "why". */
  reasoning: string;
  // --- Filled in by the renderer (parse/scaffold.ts), not by the parse. ---
  /** Flex growth along the parent's axis, from the size the human drew. */
  grow?: number;
  /** The drawn gap before this child, in local pixels. */
  marginBefore?: number;
  /** The flow this node sits inside, so it knows which margin to set. */
  parentFlow?: Flow;
}

export interface Connection {
  from: string;
  to: string;
  /** The mark that connects them, when a stroke does the connecting. */
  via?: string;
}

export interface Layout {
  root: LayoutNode;
  connections: Connection[];
}

const area = (r: Rect) => r.w * r.h;
const right = (r: Rect) => r.x + r.w;
const bottom = (r: Rect) => r.y + r.h;

function hull(rects: Rect[]): Rect {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  return {
    x,
    y,
    w: Math.max(...rects.map(right)) - x,
    h: Math.max(...rects.map(bottom)) - y,
  };
}

/**
 * Split `nodes` into bands along one axis, wherever a gap runs clean across.
 * Returns null when no such gap exists — which is the signal to try the other
 * axis, and then to give up and stack.
 */
function bands(nodes: LayoutNode[], axis: 'y' | 'x'): { groups: LayoutNode[][]; gap: number } | null {
  if (nodes.length < 2) return null;
  const start = (n: LayoutNode) => (axis === 'y' ? n.rect.y : n.rect.x);
  const end = (n: LayoutNode) => (axis === 'y' ? bottom(n.rect) : right(n.rect));

  const sorted = [...nodes].sort((a, b) => start(a) - start(b));
  const groups: LayoutNode[][] = [[sorted[0]]];
  const gaps: number[] = [];
  let reach = end(sorted[0]);

  for (let i = 1; i < sorted.length; i++) {
    const n = sorted[i];
    if (start(n) > reach) {
      // Clean gap: nothing in the group so far extends into this node's band.
      gaps.push(start(n) - reach);
      groups.push([n]);
    } else {
      groups[groups.length - 1].push(n);
    }
    reach = Math.max(reach, end(n));
  }

  if (groups.length < 2) return null;
  return { groups, gap: Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) };
}

let counter = 0;

function group(nodes: LayoutNode[], preferAxis: 'y' | 'x'): LayoutNode {
  if (nodes.length === 1) return nodes[0];

  const first = bands(nodes, preferAxis);
  const other = preferAxis === 'y' ? 'x' : 'y';
  const cut = first ?? bands(nodes, other);
  const axis = first ? preferAxis : other;
  const rect = hull(nodes.map((n) => n.rect));

  if (!cut) {
    // Overlapping in both directions: the human drew things on top of each
    // other, and only absolute placement can honour that.
    return {
      id: `g${++counter}`,
      region: null,
      rect,
      flow: 'stack',
      children: nodes,
      fractions: nodes.map(() => 0),
      gap: 0,
      reasoning: `${nodes.length} marks overlap in both directions, so they are placed rather than flowed`,
    };
  }

  const flow: Flow = axis === 'y' ? 'column' : 'row';
  // Each band becomes a child, cut again on the opposite axis.
  const children = cut.groups.map((g) => group(g, axis === 'y' ? 'x' : 'y'));
  const span = (r: Rect) => (axis === 'y' ? r.h : r.w);
  const total = children.reduce((a, c) => a + span(c.rect), 0) || 1;

  return {
    id: `g${++counter}`,
    region: null,
    rect,
    flow,
    children,
    fractions: children.map((c) => Math.round((span(c.rect) / total) * 1000) / 1000),
    gap: cut.gap,
    reasoning:
      `${children.length} bands separated by a clean ` +
      `${axis === 'y' ? 'horizontal' : 'vertical'} gap, so they read as a ${flow}`,
  };
}

function leafOf(region: Region): LayoutNode {
  return {
    id: region.id,
    region,
    rect: region.rect,
    flow: 'leaf',
    children: [],
    fractions: [],
    gap: 0,
    reasoning: `drawn as a ${region.shape}`,
  };
}

/**
 * Read a set of regions as a layout tree.
 *
 * Containment the human drew is honoured first — a box inside a box is that
 * box's child, not its sibling — and the cut runs within each container.
 */
export function parseLayout(regions: Region[], frame: Rect, connections: Connection[] = []): Layout {
  counter = 0;

  // A connector is an EDGE, not a box. A line joining two marks necessarily
  // straddles both of them, so leaving it in the cut makes every flow diagram
  // read as "these overlap in both directions" and collapse to absolute
  // placement. Taking it out lets the boxes read as the row they are, and the
  // connection it carries is already recorded separately.
  const connectors = new Set(connections.map((c) => c.via).filter((v): v is string => !!v));
  if (connectors.size) {
    regions = regions.filter((r) => !connectors.has(r.id));
  }

  if (regions.length === 0) {
    return {
      root: {
        id: 'root',
        region: null,
        rect: frame,
        flow: 'leaf',
        children: [],
        fractions: [],
        gap: 0,
        reasoning: 'nothing was drawn inside the frame',
      },
      connections,
    };
  }

  // Containment: each region's parent is the smallest region that contains it.
  const byId = new Map(regions.map((r) => [r.id, r]));
  const parentOf = new Map<string, string | null>();
  for (const r of regions) {
    let best: Region | null = null;
    for (const other of regions) {
      if (other.id === r.id || !other.contains.includes(r.id)) continue;
      if (!best || area(other.rect) < area(best.rect)) best = other;
    }
    parentOf.set(r.id, best ? best.id : null);
  }

  const build = (id: string): LayoutNode => {
    const region = byId.get(id)!;
    const kids = regions.filter((r) => parentOf.get(r.id) === id).map((r) => build(r.id));
    const node = leafOf(region);
    if (kids.length === 0) return node;
    // A container's children are cut inside it. Prefer a horizontal cut first:
    // reading order is top to bottom, so a column is the more likely reading.
    const inner = group(kids, 'y');
    return {
      ...node,
      flow: inner.flow === 'leaf' ? 'stack' : inner.flow,
      children: inner.children.length ? inner.children : [inner],
      fractions: inner.fractions,
      gap: inner.gap,
      reasoning: `${node.reasoning}, containing ${kids.length} mark(s): ${inner.reasoning}`,
    };
  };

  const tops = regions.filter((r) => parentOf.get(r.id) === null).map((r) => build(r.id));
  const root = tops.length === 1 ? tops[0] : group(tops, 'y');
  return { root, connections };
}

/** The tree as indented text — what the model is actually shown. */
export function describeLayout(layout: Layout): string {
  const lines: string[] = [];
  const walk = (n: LayoutNode, depth: number) => {
    const pad = '  '.repeat(depth + 1);
    const size = `${Math.round(n.rect.w)}×${Math.round(n.rect.h)}`;
    const label = n.region ? `${n.id} (${n.region.shape})` : `${n.id} [${n.flow}]`;
    const share = depth > 0 ? '' : '';
    lines.push(`${pad}${label} ${size} — ${n.reasoning}${share}`);
    if (n.children.length && n.flow !== 'leaf') {
      const pct = n.fractions.map((f) => `${Math.round(f * 100)}%`).join(' / ');
      if (pct) lines.push(`${pad}  ${n.flow} split ${pct}, gap ${n.gap}px`);
    }
    n.children.forEach((c) => walk(c, depth + 1));
  };
  lines.push('LAYOUT the drawing describes:');
  walk(layout.root, 0);
  if (layout.connections.length) {
    lines.push('', 'CONNECTIONS drawn between regions:');
    for (const c of layout.connections) lines.push(`  ${c.from} → ${c.to}`);
  }
  return lines.join('\n');
}

/** Every region id the layout actually places — connectors excluded. */
export function regionIdsIn(layout: Layout): string[] {
  const out: string[] = [];
  const walk = (n: LayoutNode) => {
    if (n.region) out.push(n.id);
    n.children.forEach(walk);
  };
  walk(layout.root);
  return out;
}

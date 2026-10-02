// The mind-map board (V1-PLAN §9 D6): drawn the way a hand draws one —
// jittered strokes, a central circle with a word in it, three branches out of
// it, two of them with leaves, every node a closed shape with its word written
// in it and every branch a plain line from one to the next — and what it should
// read as.
//
// The board, the centre at the left of the page and the map fanning out:
//
//                                      [ Pizza ]
//                              [ Food ] <
//                             /          [ Ramen ]
//     [ Hotel ]              /
//         |                 /
//     [ Sleep ] ------ ( Trip ) ------- ( Travel )
//
//   nodes      the centre a circle; the branches boxes and a circle; the leaves boxes
//   branches   plain lines from one node's edge to the next, no head, nothing beside them
//   words      one word written in each node
//
// Strokes are drawn four seconds apart, so the letter rules gather none of
// them into a word. Everything is deterministic: a variant is a seed, a wobble
// and a tilt of the whole page.
//
// The ids the golden (mindmap.mermaid.ts) names are the nodes' shapes, drawn
// first on every hand: Trip `stroke:1`, Food `stroke:2`, Travel `stroke:3`,
// Sleep `stroke:4`, Pizza `stroke:5`, Ramen `stroke:6`, Hotel `stroke:7`.

import type { Point } from '../../types';
import type { Session } from '../../session/session';
import { handCircle, handLine, handText } from '../../test/strokes';
import { handShape, boxCorners } from './hand';

export interface MindMapVariant {
  seed: number;
  /** Wobble in px. */
  jitter: number;
  /** How far the whole page is turned, in degrees — a hand's page is never square to the screen. */
  tilt: number;
}

export const MINDMAP_VARIANTS: MindMapVariant[] = [];
for (const seed of [1, 2, 3, 4, 5, 6]) {
  for (const jitter of [1.5, 3]) {
    for (const tilt of [0, 3, -3]) MINDMAP_VARIANTS.push({ seed: seed * 10 + MINDMAP_VARIANTS.length, jitter, tilt });
  }
}

export type NodeName = 'Trip' | 'Food' | 'Travel' | 'Sleep' | 'Pizza' | 'Ramen' | 'Hotel';

/** What the board should read as: nodes by name, each with the marks it is drawn with, and the branches between them. */
export interface MindMapExpected {
  nodes: Record<NodeName, { shape: 'circle' | 'box'; box: string[]; name: string[]; depth: number; parent?: NodeName }>;
  /** The branches, each from the node nearer the centre to the one farther out; the line's own stroke. */
  branches: { name: string; id: string; from: NodeName; to: NodeName }[];
  /** What a model that can see reads each piece of writing as, by mark. */
  words: Record<string, string>;
}

/** The words the writing says, in the order the board draws it. */
export const MINDMAP_WORDS: Record<NodeName, string> = { Trip: 'Trip', Food: 'Food', Travel: 'Travel', Sleep: 'Sleep', Pizza: 'Pizza', Ramen: 'Ramen', Hotel: 'Hotel' };

const NODES: Record<NodeName, { cx: number; cy: number; w: number; h: number; shape: 'circle' | 'box' }> = {
  Trip: { cx: 420, cy: 300, w: 124, h: 124, shape: 'circle' },
  Food: { cx: 740, cy: 110, w: 130, h: 56, shape: 'box' },
  Travel: { cx: 760, cy: 480, w: 100, h: 100, shape: 'circle' },
  Sleep: { cx: 90, cy: 300, w: 120, h: 56, shape: 'box' },
  Pizza: { cx: 1040, cy: 40, w: 110, h: 50, shape: 'box' },
  Ramen: { cx: 1040, cy: 180, w: 110, h: 50, shape: 'box' },
  Hotel: { cx: 90, cy: 120, w: 110, h: 50, shape: 'box' },
};
const ORDER: NodeName[] = ['Trip', 'Food', 'Travel', 'Sleep', 'Pizza', 'Ramen', 'Hotel'];
const BRANCHES: [NodeName, NodeName][] = [['Trip', 'Food'], ['Trip', 'Travel'], ['Trip', 'Sleep'], ['Food', 'Pizza'], ['Food', 'Ramen'], ['Sleep', 'Hotel']];
/** The page turns about its middle. */
const PIVOT = { x: 560, y: 260 };

/** Where the line from one node to another leaves and lands: on each edge, a few pixels short. */
function between(a: NodeName, b: NodeName, gap = 5): [Point, Point] {
  const A = NODES[a], B = NODES[b];
  const len = Math.hypot(B.cx - A.cx, B.cy - A.cy);
  const u = { x: (B.cx - A.cx) / len, y: (B.cy - A.cy) / len };
  // How far from a node's centre its edge lies along the line: a circle's radius, a box's where the ray meets a side.
  const reach = (n: typeof A) => (n.shape === 'circle' ? n.w / 2 : Math.min(Math.abs(u.x) > 1e-9 ? n.w / 2 / Math.abs(u.x) : Infinity, Math.abs(u.y) > 1e-9 ? n.h / 2 / Math.abs(u.y) : Infinity));
  const ra = reach(A) + gap, rb = reach(B) + gap;
  return [{ x: A.cx + u.x * ra, y: A.cy + u.y * ra }, { x: B.cx - u.x * rb, y: B.cy - u.y * rb }];
}

/** Draw the mind-map board on a session. Returns what it should read as. */
export function drawMindMap(s: Session, v: MindMapVariant, t0 = 1000, o: { round?: number } = {}): MindMapExpected {
  let t = t0;
  const c = Math.cos((v.tilt * Math.PI) / 180), sn = Math.sin((v.tilt * Math.PI) / 180);
  const turn = (p: Point): Point => ({ x: PIVOT.x + (p.x - PIVOT.x) * c - (p.y - PIVOT.y) * sn, y: PIVOT.y + (p.x - PIVOT.x) * sn + (p.y - PIVOT.y) * c });
  const draw = (pts: Point[], gap = 4000) => s.addStroke(pts.map(turn), (t += gap));
  const j = v.jitter;
  const seed = (k: number) => v.seed * 100 + k;
  const start = (k: number) => (v.seed * 0.37 + k * 0.23) % 1;
  const words = (x: number, y: number, w: number, h: number, k: number) => handText(x, y, w, h, { seed: seed(k), humps: Math.max(4, Math.round(w / 15)), jitter: 1 });

  // 1. The nodes, first on every hand: a circle for the centre, boxes and a circle for the rest.
  const shapeIds = {} as Record<NodeName, string>;
  ORDER.forEach((name, i) => {
    const n = NODES[name];
    shapeIds[name] =
      n.shape === 'circle'
        ? draw(handCircle(n.cx, n.cy, n.w / 2, { seed: seed(i + 1), jitter: j, startAt: start(i + 1) }))
        : draw(handShape(boxCorners(n.cx, n.cy, n.w, n.h), { seed: seed(i + 1), jitter: j, startAt: start(i + 1), round: o.round ?? 0.06 }));
  });

  // 2. The branches: plain lines from edge to edge.
  const lineIds = BRANCHES.map(([a, b], i) => {
    const [P, Q] = between(a, b);
    return draw(handLine(P, Q, { seed: seed(11 + i), jitter: j * 0.6 }));
  });

  // 3. The words, one in each node.
  const nameIds = {} as Record<NodeName, string>;
  ORDER.forEach((name, i) => {
    const n = NODES[name];
    const w = Math.min(n.w - 30, 12 * name.length + 8);
    nameIds[name] = draw(words(n.cx - w / 2, n.cy - 10, w, 20, 31 + i));
  });

  const wordsOf: Record<string, string> = {};
  for (const name of ORDER) wordsOf[nameIds[name]] = MINDMAP_WORDS[name];
  const parentOf: Partial<Record<NodeName, NodeName>> = {};
  for (const [a, b] of BRANCHES) parentOf[b] = a;
  const depthOf = (name: NodeName): number => (parentOf[name] ? 1 + depthOf(parentOf[name]!) : 0);
  const nodes = {} as MindMapExpected['nodes'];
  for (const name of ORDER) nodes[name] = { shape: NODES[name].shape, box: [shapeIds[name]], name: [nameIds[name]], depth: depthOf(name), ...(parentOf[name] ? { parent: parentOf[name] } : {}) };
  return {
    nodes,
    branches: BRANCHES.map(([a, b], i) => ({ name: `${a}—${b}`, id: lineIds[i], from: a, to: b })),
    words: wordsOf,
  };
}

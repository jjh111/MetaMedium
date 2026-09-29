// The mind-map notation (V1-PLAN §3, §9 D6).
//
// A mind map — a central node and the branches out of it — read from ink:
//
//   - **node** — a closed shape with its word written in it: one stroke the
//     shape rung reads as a circle, an oval or a box (or strokes ruled into a
//     box, diagram/figures.ts), the word the writing inside it. A circle
//     stands as a circle and anything with corners as a box — the shape says
//     how a Mermaid writer brackets it. A box with a line across it holds
//     compartments (a class's) and a box holding another shape is a frame;
//     neither is a node.
//   - **root** — the node the rest hang from: the most central of the tree
//     (the least total distance to the others), where several are as central,
//     the one with most branches, then a circle, then the larger.
//   - **branch** — a plain line from one node to another, no head, nothing
//     written beside it. Its ends are read past any head (diagram/heads.ts), a
//     magnet's bind first (graph-kit.ts, as the flowchart reads a flow). It
//     stands from the node nearer the root to the one farther out, whichever
//     way it was drawn; a node's branches are taken clockwise from the top
//     round the root, and round any other node clockwise from the way it
//     faces — away from its own parent.
//
// **What it is not.** A mind map is shapes joined in a tree, which is also what
// an ER diagram's entities are, and a molecule's bubbles. What makes it a mind
// map is what those lack or have too much of: a word in every node (a molecule
// has none), a hub with several branches and branches that go on past it
// (depth), lines with nothing beside them — an ER diagram writes a multiplicity
// and a verb on every line, which counts against a mind map, as does a head, a
// compartment, and any line that closes a loop. Arrows are the flowchart's and
// never reach the costly part of the reading. Read from the geometry, never the
// relation or role tables (the trap): they call a node beside a line's end its
// head. Bare words on a branch — a hand's other mind map — are not read; the
// nodes are shapes.
//
// Every symbol plays one of the six roles and adds none: a node and the root
// are nodes, a branch an edge, writing a label. Derived, like every notation:
// nothing enters the log. Its content — names, roles, ports, the Mermaid of
// each shape — is the table below, its single home; the mindmap@1 pack
// (packs/shipped/mindmap.ts) names this notation and restates none of it. The
// graph notations' joining and words are graph-kit.ts.

import type { Bounds, Point } from '../types';
import type { SessionState } from '../session/session';
import type { MMNode } from '../session/nodes';
import { fingerprintOf, getRep, isWord, resemblances, strokePointsOf, transcriptOf } from '../session/nodes';
import type { NotationPort, NotationPorts } from '../session/ports';
import { isLetterLike } from '../session/words';
import { boundsOf } from '../session/nodes';
import { figuresAmong } from '../diagram/figures';
import type { Role } from '../diagram/roles';
import { MAX_TIER0_CONFIDENCE } from '../recognition';
import type { Notation, NotationConnector, NotationReading, NotationSymbol } from './notation';
import type { Candidate } from './flowchart';
import { figureCandidate, mayBeSide, strokeCandidate } from './flowchart';
import { centreOf, countWord, joinSymbols, labelWriting, lineAcross, marksOf, mean, ownWords, rolesOf, symbolOf, writingOf } from './graph-kit';
import { insideOf, isBox, isForeign, isRound, portsFor, stateShape } from './state';

// ===== The table — the mind map's content =====

/**
 * The mind map's content: its two symbols, its connector, the writing it
 * reads, each with the role it plays, where it takes a connector, and how it is
 * said in Mermaid (the writer writes with these): each shape's delimiters
 * round its words. Content, not code, and this is its single home: the
 * `mindmap@1` pack names the notation and restates none of it (V1-PLAN §2.3,
 * B3); the rest of this file is what a signature cannot see.
 */
export const MINDMAP_TABLE = {
  pack: 'mindmap@1',
  notation: 'mindmap',
  name: 'Mind map',
  describes: 'a central node and the branches out of it, a word in every node',
  symbols: {
    root: { role: 'node', describes: 'the central node: a shape with its word written in it, the rest hanging from it', ports: 'its border, anywhere along it', one: 'root', many: 'roots' },
    node: { role: 'node', describes: 'a shape with its word written in it, hanging from the node nearer the centre', ports: 'its border, anywhere along it', one: 'node', many: 'nodes' },
  },
  connectors: {
    branch: { role: 'edge', describes: 'a plain line from one node to another, nothing beside it', one: 'branch', many: 'branches' },
  },
  label: { role: 'label', describes: 'writing inside a node: its word', one: 'word', many: 'words' },
  /** How each shape is bracketed in Mermaid: a circle `((…))`, a box `[…]`. */
  shapes: {
    circle: { open: '((', close: '))', describes: 'a circle or an oval' },
    box: { open: '[', close: ']', describes: 'a box, its corners square or round' },
  },
  mermaid: { header: 'mindmap', indent: '    ' },
} as const;

export type MindMapShape = keyof typeof MINDMAP_TABLE.shapes;
const SHAPES = Object.keys(MINDMAP_TABLE.shapes) as MindMapShape[];
type SymbolName = keyof typeof MINDMAP_TABLE.symbols;
const SYMBOLS = Object.keys(MINDMAP_TABLE.symbols) as SymbolName[];

// ===== Thresholds — this notation's own; the hand's are cited =====

/** A mark this small in the hand's space (screen pixels, longest side) is writing, however the shape rung read it. */
export const LETTER_PX = 40;
/** A per-mark reading below this offers no ports: the pen should not feel a guess. */
export const PORTS_FLOOR = 0.4;
/** With no evidence at all, shapes joined in a tree are this share as sure a mind map as their structure makes them; evidence carries the rest. */
export const PLAIN_SHARE = 0.2;

/**
 * What each kind of evidence for a mind map — a thing an ER diagram, a
 * flowchart and a molecule lack — is worth to the reading's confidence, as the
 * chance it alone settles it: a word in every node (scaled by how many have
 * one), a hub with three branches or more (two, a chain, a third of that), and
 * branches that go on past the first ring. Together they settle it as
 * independent chances do.
 */
export const EVIDENCE = { named: 0.55, hub: 0.5, chain: 0.15, deep: 0.3 } as const;
/** A board whose lines have writing beside them — an ER diagram's multiplicities and verbs — is at most this much less a mind map, per share of its lines that have. */
export const WRITTEN_PENALTY = 0.92;
/** …whose connectors carry heads (flows, UML relations)… */
export const HEADED_PENALTY = 0.75;
/** …whose boxes have compartments (a class diagram's)… */
export const CLASSLIKE_PENALTY = 0.8;
/** …and whose lines close a loop, so the shapes are a graph and no tree, per share of its lines that do. */
export const LOOP_PENALTY = 0.6;

const MAX = MAX_TIER0_CONFIDENCE;
const pct = (x: number) => `${Math.round(x * 100)}%`;

// ===== The reading's own shapes =====

/** What the writing inside a node says: its words, the marks, and which were not read. */
export interface MindMapWriting {
  text?: string;
  ids: string[];
  unread: string[];
}

/** A node of the map, as the notation reads it. */
export interface MindMapNode extends NotationSymbol {
  symbol: SymbolName;
  shape: MindMapShape;
  /** Its distance from the root, in branches. */
  depth: number;
  /** The node it hangs from — none for the root. */
  parent?: string;
  /** The nodes hanging from it, in the order a hand reads round it. */
  children: string[];
  name: MindMapWriting;
}

/** A branch, from the node nearer the root to the one farther out. */
export interface MindMapBranch extends NotationConnector {
  /** Whether it is one of the tree's own branches; a line that closes a loop is not. */
  tree: boolean;
}

/** What a scope is as a mind map. */
export interface MindMapReading extends NotationReading {
  symbols: MindMapNode[];
  connectors: MindMapBranch[];
  root: string;
  /** What made it a mind map rather than shapes and lines, each with how much it counted. */
  evidence: { what: string; weight: number }[];
  /** Counted against it: lines with writing beside them, heads, boxes with compartments, lines that close a loop. */
  written: number;
  headed: number;
  classLike: number;
  loops: number;
}

// ===== The E3 hook: one mark, and the ports its node offers =====

let reading = 0;

/**
 * What the mind-map notation reads one mark as, on its own, and the ports its
 * symbol offers — the notation's side of E3's hook. A lone closed stroke read
 * as a circle or a box offers its border; anything else offers nothing.
 * Re-entry answers nothing, so the hook never calls itself.
 */
export function mindMapPortsOf(node: MMNode, nodes: ReadonlyMap<string, MMNode>): { symbol: string; ports: NotationPort[] } | null {
  if (reading > 0) return null;
  reading++;
  try {
    if (getRep(node, 'erased') || getRep(node, 'gesture') || isWord(node) || transcriptOf(node)) return null;
    const fp = fingerprintOf(node);
    if (!fp?.isClosed) return null;
    const c = strokeCandidate(node);
    if (!c || isForeign(c)) return null;
    const sure = isRound(c) ? (c.shapes[0]?.score ?? 0) : isBox(c) ? stateShape(c).score : 0;
    if (MAX * sure < PORTS_FLOOR) return null;
    return { symbol: 'node', ports: portsFor(c, nodes) };
  } finally {
    reading--;
  }
}

// ===== Reading a scope =====

const sizeOf = (b: Bounds) => Math.max(b.maxX - b.minX, b.maxY - b.minY);
const TAU = Math.PI * 2;

/** The angle of a direction clockwise from the top of the page, in [0, 2π): north (0, −1) is 0, east π/2. */
export const clockwiseFromTop = (from: Point, to: Point): number => {
  const a = Math.atan2(to.x - from.x, -(to.y - from.y));
  return a < 0 ? a + TAU : a;
};

/** What a piece of writing says, when anybody has read it or a hand labelled its own ink. */
function wordsOfMark(node: MMNode): string | undefined {
  const t = (transcriptOf(node) ?? (getRep(node, 'label')?.data as { text?: string } | undefined)?.text)?.trim();
  return t ? t : undefined;
}

/** Writing's words: its pieces' in order, the pieces not read kept apart. */
function writingWords(nodes: ReadonlyMap<string, MMNode>, ids: readonly string[], own?: string): MindMapWriting {
  const parts: string[] = own?.trim() ? [own.trim()] : [];
  const unread: string[] = [];
  for (const id of ids) {
    const t = wordsOfMark(nodes.get(id)!);
    if (t) parts.push(t);
    else unread.push(id);
  }
  return { ...(parts.length ? { text: parts.join(' ') } : {}), ids: [...ids], unread };
}

/**
 * The mind map a scope makes — the board's content plane when no scope is
 * given — or null when it holds no three shapes joined by plain lines. Reads
 * the session and changes nothing in it.
 */
export function readMindMap(state: SessionState, scopeIds?: readonly string[]): MindMapReading | null {
  const nodes = state.nodes;
  const { scope, marks } = marksOf(state, scopeIds);
  if (scope.length < 5) return null;

  // 1. What each mark could be: a closed outline, writing, or an open stroke.
  const closed = new Map<string, Candidate>();
  const writing = new Set<string>();
  const open: string[] = [];
  const tiny = (id: string) => {
    const b = boundsOf(nodes.get(id)!);
    const scale = (getRep(nodes.get(id)!, 'stroke')?.data as { scale?: number } | undefined)?.scale ?? 1;
    return !!b && isLetterLike(b, scale) && sizeOf(b) <= LETTER_PX * scale;
  };
  for (const m of marks) {
    if (isWord(m.node) || transcriptOf(m.node)) {
      writing.add(m.id);
      continue;
    }
    const fp = fingerprintOf(m.node);
    if (!fp) continue;
    if (fp.isClosed) {
      const c = strokeCandidate(m.node);
      if (c && !tiny(m.id)) closed.set(m.id, c);
      else if (writingOf(m.node) || tiny(m.id)) writing.add(m.id);
      continue;
    }
    if (writingOf(m.node) || tiny(m.id)) writing.add(m.id);
    else open.push(m.id);
  }
  // Boxes ruled in several strokes.
  const inFigure = new Set<string>();
  const figures: Candidate[] = [];
  for (const f of figuresAmong(nodes, open.filter((id) => mayBeSide(nodes.get(id)!)))) {
    const c = figureCandidate(f, f.id, [...f.ids], (getRep(nodes.get(f.ids[0])!, 'stroke')?.data as { scale?: number } | undefined)?.scale ?? 1, `${countWord(f.ids.length)} strokes whose ends meet`);
    if (!c || !isBox(c)) continue;
    figures.push(c);
    f.ids.forEach((id) => inFigure.add(id));
  }

  // 2. The nodes: circles, ovals and boxes. A shape holding another is a frame; a box with a line across it holds compartments.
  const shapes = [...closed.values(), ...figures].filter((c) => !isForeign(c) && (isRound(c) || isBox(c)));
  if (shapes.length < 3) return null;
  const containers = new Set<Candidate>();
  for (const a of shapes) for (const b of shapes) if (a !== b && insideOf(a, b)) containers.add(a);
  const lines = open.filter((id) => !inFigure.has(id) && resemblances(nodes.get(id)!)[0]?.to !== 'type:arrow');
  const classLike = shapes.filter((c) => !containers.has(c) && lines.some((id) => lineAcross(c, strokePointsOf(nodes.get(id)!) ?? [])));
  const candidates = shapes.filter((c) => !containers.has(c) && !classLike.includes(c));
  // The cheap test before the costly one: the joining reads every stroke's heads, and a board of arrows joins nothing here.
  if (candidates.length < 3 || lines.length < 2) return null;

  // 3. The branches: every open stroke joining two nodes.
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const symbolOfMark = new Map<string, Candidate>();
  for (const c of candidates) for (const id of [...c.ids, ...c.marks]) symbolOfMark.set(id, c);
  const joined = joinSymbols(state, { open: open.filter((id) => !inFigure.has(id)), symbols: candidates, symbolOfMark, kind: 'branch', role: MINDMAP_TABLE.connectors.branch.role as Role });
  if (joined.connectors.length < 2) return null;
  const pointers = [...joined.pointers];
  const headed = joined.connectors.filter((k) => k.directed).length;

  // 4. The tree: the most central node is the root; every other hangs from the node nearer it.
  const neighbours = new Map<string, Set<string>>(candidates.map((c) => [c.id, new Set()]));
  for (const k of joined.connectors) {
    neighbours.get(k.from)!.add(k.to);
    neighbours.get(k.to)!.add(k.from);
  }
  const distancesFrom = (root: string) => {
    const d = new Map<string, number>([[root, 0]]);
    const queue = [root];
    for (let i = 0; i < queue.length; i++) for (const n of neighbours.get(queue[i])!) if (!d.has(n)) (d.set(n, d.get(queue[i])! + 1), queue.push(n));
    return d;
  };
  const linked = candidates.filter((c) => neighbours.get(c.id)!.size > 0);
  // The largest group joined by lines is the map; a shape joined to nothing is beside it.
  const groups: Candidate[][] = [];
  const seen = new Set<string>();
  for (const c of linked) {
    if (seen.has(c.id)) continue;
    const g = [...distancesFrom(c.id).keys()];
    g.forEach((id) => seen.add(id));
    groups.push(g.map((id) => byId.get(id)!));
  }
  groups.sort((a, b) => b.length - a.length);
  const group = groups[0];
  if (!group || group.length < 3) return null;
  const scopeOrder = new Map(scope.map((id, i) => [id, i]));
  const firstOf = (c: Candidate) => Math.min(...[c.id, ...c.ids].map((id) => scopeOrder.get(id) ?? Infinity));
  const total = new Map(group.map((c) => [c.id, [...distancesFrom(c.id).values()].reduce((a, x) => a + x, 0)]));
  const root = [...group].sort(
    (a, b) =>
      total.get(a.id)! - total.get(b.id)! ||
      neighbours.get(b.id)!.size - neighbours.get(a.id)!.size ||
      Number(isRound(b)) - Number(isRound(a)) ||
      b.outline.size - a.outline.size ||
      firstOf(a) - firstOf(b)
  )[0];
  const depth = distancesFrom(root.id);
  const parent = new Map<string, string>();
  const inTree = new Set<string>(); // connector ids
  for (const k of joined.connectors) {
    const [a, b] = [depth.get(k.from), depth.get(k.to)];
    if (a === undefined || b === undefined || a === b) continue;
    if (Math.abs(a - b) !== 1) continue;
    const [near, far] = a < b ? [k.from, k.to] : [k.to, k.from];
    if (!parent.has(far)) {
      parent.set(far, near);
      inTree.add(k.id);
    }
  }
  const centre = (id: string) => centreOf(byId.get(id)!.outline.bounds);
  const children = new Map<string, string[]>(group.map((c) => [c.id, []]));
  for (const [child, p] of parent) children.get(p)!.push(child);
  for (const [id, kids] of children) {
    const p = parent.get(id);
    // Round the root clockwise from the top; round any other node clockwise from the way it faces, away from its parent.
    const away = p ? Math.atan2(centre(id).x - centre(p).x, -(centre(id).y - centre(p).y)) : 0;
    const angle = (kid: string) => {
      const a = clockwiseFromTop(centre(id), centre(kid));
      if (!p) return a;
      let r = a - (away < 0 ? away + TAU : away);
      while (r > Math.PI) r -= TAU;
      while (r <= -Math.PI) r += TAU;
      return r;
    };
    kids.sort((a, b) => angle(a) - angle(b) || (a < b ? -1 : 1));
  }

  // 5. Nodes as symbols; writing inside a node is its word; beside a line it counts against the reading.
  const members = new Set(group.map((c) => c.id));
  const out: MindMapNode[] = group.map((c) => {
    const round = isRound(c);
    const score = round ? (c.shapes[0]?.score ?? 0) : stateShape(c).score;
    const confidence = MAX * score * c.fit;
    const why = round ? `a ${c.outline.aspect < 1.25 ? 'circle' : 'oval'}, ${c.outline.aspect.toFixed(1)}:1` : stateShape(c).why;
    const isRoot = c === root;
    const reason = `${c.lead ? `${c.lead}: ` : ''}${why} — ${isRoot ? 'the most central of the tree' : `${countWord(depth.get(c.id)!)} ${depth.get(c.id) === 1 ? 'branch' : 'branches'} from the root`}`;
    const kids = children.get(c.id)!;
    return {
      ...symbolOf(c, isRoot ? 'root' : 'node', MINDMAP_TABLE.symbols.node.role as Role, confidence, reason, portsFor(c, nodes), ownWords(nodes, [c.id, ...c.ids])),
      symbol: isRoot ? 'root' : 'node',
      shape: round ? 'circle' : 'box',
      depth: depth.get(c.id)!,
      ...(parent.has(c.id) ? { parent: parent.get(c.id)! } : {}),
      children: kids,
      name: { ids: [], unread: [] },
    } as MindMapNode;
  });
  const branches: MindMapBranch[] = joined.connectors
    .filter((k) => members.has(k.from) && members.has(k.to))
    .map((k) => {
      const tree = inTree.has(k.id);
      const [from, to] = tree && parent.get(k.to) === k.from ? [k.from, k.to] : tree ? [k.to, k.from] : depth.get(k.from)! <= depth.get(k.to)! ? [k.from, k.to] : [k.to, k.from];
      const swap = from !== k.from;
      return {
        ...k,
        from,
        to,
        ends: swap ? { from: k.ends.to, to: k.ends.from } : k.ends,
        direction: 'none' as const,
        directed: false,
        reason: `a line joining ${from} and ${to}${k.directed ? `, its head ignored — a branch has no direction of its own (${k.reason})` : ', no head'}${tree ? '' : ' — it closes a loop'}`,
        tree,
      };
    });
  const owned = new Set<string>();
  for (const s of out) for (const id of [...s.ids, ...byId.get(s.id)!.marks]) owned.add(id);
  const labels = labelWriting(nodes, {
    marks,
    writing,
    symbols: out,
    connectors: branches,
    owned,
    role: MINDMAP_TABLE.label.role as Role,
  });
  for (const s of out) {
    const inside = labels.filter((l) => l.of === s.id && l.where === 'inside').map((l) => l.id);
    s.name = writingWords(nodes, inside, s.text);
  }
  const written = branches.filter((k) => k.labels.length > 0 || k.text).length;

  // 6. Roles: what every mark in the scope plays — one of the six.
  const { roles, weight, unplaced } = rolesOf(
    scope,
    (put) => {
      for (const s of out) for (const id of [...s.ids, ...byId.get(s.id)!.marks]) put(id, s.role, 1);
      for (const k of branches) for (const id of k.ids) put(id, k.role, 1);
      for (const l of labels) put(l.id, l.role, l.where === 'alone' ? 0.5 : 1);
      for (const id of pointers) put(id, 'annotation', 0.5);
      for (const c of containers) for (const id of c.marks) put(id, 'container', 0.5);
      for (const c of classLike) for (const id of c.marks) put(id, 'container', 0.5);
    },
    joined.edgeMarks
  );

  // 7. Is it a mind map, and how surely.
  const connected = out.length / candidates.length;
  const coverage = scope.reduce((a, id) => a + (weight[id] ?? 0), 0) / scope.length;
  const symbolSure = mean(out.map((s) => s.confidence)) / MAX;
  const relSure = mean(branches.map((k) => k.confidence)) / MAX;
  const named = out.filter((s) => s.name.ids.length > 0 || s.text).length / out.length;
  const rootKids = children.get(root.id)!.length;
  const deepest = Math.max(...out.map((s) => s.depth));
  const evidence: { what: string; weight: number }[] = [];
  if (named > 0) evidence.push({ what: `${countWord(out.filter((s) => s.name.ids.length > 0 || s.text).length)} of ${countWord(out.length)} nodes with a word in them`, weight: EVIDENCE.named * named });
  if (rootKids >= 3) evidence.push({ what: `a centre with ${countWord(rootKids)} branches`, weight: EVIDENCE.hub });
  else if (rootKids === 2) evidence.push({ what: 'a centre with two branches', weight: EVIDENCE.chain });
  if (deepest >= 2) evidence.push({ what: `branches ${countWord(deepest)} deep`, weight: EVIDENCE.deep });
  const settled = 1 - evidence.reduce((p, e) => p * (1 - e.weight), 1);
  const loops = branches.filter((k) => !k.tree).length;
  const share = (n: number) => n / branches.length;
  const against = 1 - (1 - WRITTEN_PENALTY * share(written)) * (1 - HEADED_PENALTY * (headed / joined.connectors.length)) * (1 - CLASSLIKE_PENALTY * (classLike.length / (classLike.length + out.length))) * (1 - LOOP_PENALTY * share(loops));
  const confidence = MAX * Math.sqrt(connected * coverage) * Math.sqrt(symbolSure * relSure) * (PLAIN_SHARE + (1 - PLAIN_SHARE) * settled) * (1 - against);
  if (!(confidence > 0)) return null;

  const counts: Record<string, number> = { root: 1, node: out.length - 1, branch: branches.length, word: out.filter((s) => s.name.ids.length > 0 || s.text).length };
  const summary = [`a root with ${countWord(rootKids)} ${rootKids === 1 ? 'branch' : 'branches'}`, `${countWord(out.length)} nodes`, `${countWord(deepest)} ${deepest === 1 ? 'level' : 'levels'} deep`].join(', ');
  const reason = [
    connected === 1 ? 'every shape joined in one tree' : `${countWord(out.length)} of ${countWord(candidates.length)} shapes joined`,
    evidence.length ? `read as a mind map for ${evidence.map((e) => e.what).join(' and ')}` : 'shapes and plain lines with nothing only a mind map has',
    written ? `${countWord(written)} ${written === 1 ? 'line has' : 'lines have'} writing beside ${written === 1 ? 'it' : 'them'}, which a mind map’s branches have not` : '',
    headed ? `${countWord(headed)} ${headed === 1 ? 'line has' : 'lines have'} a head, which a branch has not` : '',
    classLike.length ? `${countWord(classLike.length)} ${classLike.length === 1 ? 'box has' : 'boxes have'} compartments, as a class does` : '',
    loops ? `${countWord(loops)} ${loops === 1 ? 'line closes' : 'lines close'} a loop (${pct(share(loops))} of them)` : '',
    unplaced.length ? `${countWord(unplaced.length)} mark${unplaced.length === 1 ? '' : 's'} it places nowhere` : '',
  ].filter(Boolean).join(', ');

  // In the scope's own order — the tree's reading order is each node's `children`.
  out.sort((p, q) => firstOf(byId.get(p.id)!) - firstOf(byId.get(q.id)!));
  labels.sort((p, q) => (scopeOrder.get(p.id) ?? 0) - (scopeOrder.get(q.id) ?? 0));
  branches.sort((p, q) => (scopeOrder.get(p.id) ?? 0) - (scopeOrder.get(q.id) ?? 0));

  return {
    notation: 'mindmap',
    name: MINDMAP_TABLE.name,
    confidence,
    summary,
    reason: `${summary} — ${reason}`,
    symbols: out,
    connectors: branches,
    labels,
    roles,
    unplaced,
    counts,
    root: root.id,
    evidence,
    written,
    headed,
    classLike: classLike.length,
    loops,
  };
}

/** The shapes a Mermaid writer brackets a node with. */
export const shapeTokens = (shape: MindMapShape) => MINDMAP_TABLE.shapes[shape];
export { SHAPES };

// ===== The notation =====

export const MINDMAP: Notation = {
  id: 'mindmap',
  name: MINDMAP_TABLE.name,
  describes: MINDMAP_TABLE.describes,
  symbols: SYMBOLS.map((name) => ({ name, role: MINDMAP_TABLE.symbols[name].role as Role, describes: MINDMAP_TABLE.symbols[name].describes, ports: MINDMAP_TABLE.symbols[name].ports })),
  connectors: [{ name: 'branch', role: MINDMAP_TABLE.connectors.branch.role as Role, describes: MINDMAP_TABLE.connectors.branch.describes }],
  read: (state, scopeIds) => readMindMap(state, scopeIds),
  ports: { notation: 'mindmap', portsOf: mindMapPortsOf } satisfies NotationPorts,
};

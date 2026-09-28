// The flowchart notation (V1-PLAN §3, §9 D1).
//
// Processes, decisions and the flows between them, read from ink:
//
//   - **process** — an upright box: four corners, sides level and plumb,
//     corners square. In one stroke, or ruled in several (diagram/figures.ts).
//   - **decision** — a diamond: a box or a quadrilateral TURNED about 45°, its
//     corners at the top, the right, the bottom and the left. The shape rung
//     is blind to rotation by design — it reads a square diamond as a
//     rectangle and a flat one as a circle, a triangle or a box, all unsure —
//     so a diamond is known here only from its corners' angle: the diagonals
//     stand one plumb and one level. A box drawn a little tilted is not
//     turned; it stays a process (the trap). In one stroke, or two — top and
//     bottom halves, or left and right halves, which the letter rules gather
//     into a word when they come quickly (session.ts); the word's two strokes
//     meeting end to end as a diamond are read here as the decision they are.
//   - **terminator** — an elongated round-ended form, a stadium or an oval:
//     no corners to hold it.
//   - **data** — a parallelogram: top and bottom level, the other two sides
//     parallel and leaning off plumb.
//   - **start** and **end** — small circles, small beside the chart's other
//     symbols: one a flow leaves is the start, one a flow arrives at the end.
//   - **flows** — arrows and lines whose ends land on two symbols. Each end is
//     read PAST its head: an arrow's own barb, a head drawn apart (a chevron, a
//     small triangle) — the session's own wire stops at such a head, and the
//     symbol beyond its tip is where the flow goes. The heads direct it; a
//     line with none is undirected. A small start dot at a line's end is read
//     by heads.ts as a circle head — plural, as it should be — and the
//     flowchart decides it is the start. A magnet's bind outranks nearness.
//   - **labels** — writing inside a symbol labels it; writing beside a flow
//     labels the flow ("yes", "no").
//
// Each symbol offers its ports through E3's hook (session/ports.ts) once the
// notation is offered: a decision's four vertices, a process's (and data's)
// edge middles, a terminator's two ends and two sides. The reading carries the
// same ports, computed by the same function.
//
// The whole reading is derived, like a concept's: nothing enters the log. Its
// content — the names, roles, ports and Mermaid of each symbol — is the typed
// table below, its single home: the flowchart@1 pack (packs/shipped/flowchart.ts)
// names this notation and restates none of it (V1-PLAN §2.3, B3).

import type { Bounds, Point } from '../types';
import type { SessionState } from '../session/session';
import { DEFAULT_SESSION_CONFIG } from '../session/session';
import type { MMNode } from '../session/nodes';
import { boundsOf, fingerprintOf, getRep, isWord, labelOf, lettersOf, placed, resemblances, strokePointsOf, transcriptOf } from '../session/nodes';
import type { NotationPort, NotationPorts } from '../session/ports';
import { activeBindingsOf, magnetRadius } from '../session/magnets';
import type { ConnectorHeads, HeadReading } from '../diagram/heads';
import { headsOf } from '../diagram/heads';
import type { InkFigure } from '../diagram/figures';
import { figuresAmong } from '../diagram/figures';
import type { Role } from '../diagram/roles';
import { MAX_TIER0_CONFIDENCE } from '../recognition';
import type { Notation, NotationConnector, NotationEnd, NotationLabel, NotationReading, NotationSymbol, SymbolReading } from './notation';
import type { QuadStance } from './shape';
import { areaOf, cornersOf, distToPath, hullOf, mid, outside, ramp, stanceOf, tightBox } from './shape';

// ===== The table — the flowchart's content =====

/**
 * The flowchart's content: each symbol's name, the role it plays, where it
 * takes a connector, and how it is said in Mermaid (D2 writes with these).
 * Content, not code, and this is its single home: the `flowchart@1` pack names
 * the notation and restates none of it (V1-PLAN §2.3, B3); the rest of this
 * file is what a signature cannot see.
 */
export const FLOWCHART_TABLE = {
  pack: 'flowchart@1',
  notation: 'flowchart',
  name: 'Flowchart',
  describes: 'processes, decisions and the flows between them',
  symbols: {
    process: { role: 'node', describes: 'an upright rectangle', ports: 'its edge middles', one: 'process', many: 'processes', mermaid: { open: '[', close: ']' } },
    decision: { role: 'node', describes: 'a diamond — a box or a quadrilateral turned about 45°, in one stroke or several', ports: 'its four vertices', one: 'decision', many: 'decisions', mermaid: { open: '{', close: '}' } },
    terminator: { role: 'node', describes: 'an elongated round-ended form — a stadium, or an oval', ports: 'its two ends and its two sides', one: 'terminator', many: 'terminators', mermaid: { open: '([', close: '])' } },
    data: { role: 'node', describes: 'a parallelogram — top and bottom level, its sides leaning', ports: 'its edge middles', one: 'data symbol', many: 'data symbols', mermaid: { open: '[/', close: '/]' } },
    start: { role: 'node', describes: 'a small circle a flow leaves', ports: 'the circle’s own centre and cardinals', one: 'start', many: 'starts', mermaid: { open: '((', close: '))' } },
    end: { role: 'node', describes: 'a small circle a flow arrives at', ports: 'the circle’s own centre and cardinals', one: 'end', many: 'ends', mermaid: { open: '(((', close: ')))' } },
  },
  connectors: {
    flow: { role: 'edge', describes: 'an arrow or a line between two symbols, directed by its heads', one: 'flow', many: 'flows', mermaid: { forward: '-->', none: '---', both: '<-->', label: '|%label%|' } },
  },
  label: { role: 'label', describes: 'writing inside a symbol, or beside a flow', one: 'label', many: 'labels' },
  mermaid: { header: 'flowchart', direction: 'TD' },
} as const;

type SymbolName = keyof typeof FLOWCHART_TABLE.symbols;
const SYMBOLS = Object.keys(FLOWCHART_TABLE.symbols) as SymbolName[];
const CORE = new Set<SymbolName>(['process', 'decision', 'terminator', 'data']);

// ===== Thresholds — this notation's own; the hand's are cited =====

/** A symbol's four corners hold at least this much of it to count as cornered (a box or diamond 0.83–0.92, a stadium 0.67–0.79, a circle 0.64). */
export const CORNERED = [0.78, 0.86] as const;
/** …and its best three corners no more than this (a triangle's 0.79–0.84 hand-drawn, any quadrilateral's about 0.5). */
export const THREE_CORNERED = [0.62, 0.74] as const;
/** A process's sides lie within this of level and plumb: full to the first, gone by the second (the trap: a hand's tilt of 12° is still upright). */
export const UPRIGHT = [12, 33] as const;
/** …and its corners within this of square. */
export const SQUARE = [12, 28] as const;
/** A decision's diagonals stand within this of plumb and level. */
export const TURNED = [12, 24] as const;
/** A data symbol's sides lean at least this far off plumb (a box's own wobble is under 6°)… */
export const LEAN = [8, 16] as const;
/** …its top and bottom within this of level, and its leaning sides within this of parallel. */
export const LEVEL = [8, 14] as const;
export const PARALLEL = [10, 18] as const;
/** A terminator is at least this elongated (its tightest box, long over short). */
export const ELONGATED = [1.35, 1.7] as const;
/** A start or end is round — no more elongated than this. */
export const ROUND = [1.25, 1.5] as const;
/** …and small beside the chart's other symbols: full at the first share of their median size, gone by the second. */
export const SMALL = [0.5, 0.85] as const;
/** A core symbol this small beside the others, sitting at a connector's end, is that connector's head, not a symbol. */
export const HEAD_SHARE = 0.4;
/** A per-mark reading below this offers no ports: the pen should not feel a guess. */
export const PORTS_FLOOR = 0.4;

const MAX = MAX_TIER0_CONFIDENCE;
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const count = (n: number) => WORDS[n] ?? String(n);
const deg = (x: number) => `${Math.max(0, Math.round(x))}°`;
const an = (word: string) => `${/^[aeiou]/.test(word) ? 'an' : 'a'} ${word}`;
const pct = (x: number) => `${Math.round(x * 100)}%`;
const scaleOf = (node: MMNode) => (getRep(node, 'stroke')?.data as { scale?: number } | undefined)?.scale ?? 1;

// ===== Reading one outline =====

interface Outline {
  hull: Point[];
  bounds: Bounds;
  size: number;
  four: number;
  three: number;
  stance: QuadStance | null;
  aspect: number;
  extent: number;
  frame: { centre: Point; axis: Point; long: number; short: number } | null;
}

function outlineOf(points: readonly Point[]): Outline | null {
  const hull = hullOf(points);
  if (hull.length < 3) return null;
  const A = areaOf(hull);
  if (A <= 0) return null;
  const { share, three, quad } = cornersOf(hull);
  const box = tightBox(hull);
  const xs = hull.map((p) => p.x), ys = hull.map((p) => p.y);
  const bounds = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  return {
    hull,
    bounds,
    size: Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY),
    four: hull.length === 3 ? 0 : share,
    three,
    stance: quad.length === 4 ? stanceOf(quad) : null,
    aspect: box ? box.long / Math.max(1e-9, box.short) : 1,
    extent: box ? A / box.area : 0,
    frame: box,
  };
}

/** How much the outline reads as each shape symbol, and why — 0 where it does not. `round` is a start or end in waiting: whether it is one depends on the chart. */
function shapeScores(o: Outline): { symbol: SymbolName | 'round'; score: number; why: string }[] {
  const out: { symbol: SymbolName | 'round'; score: number; why: string }[] = [];
  const notThree = 1 - ramp(o.three, THREE_CORNERED[0], THREE_CORNERED[1]);
  const cornered = ramp(o.four, CORNERED[0], CORNERED[1]) * notThree;
  const st = o.stance;
  if (st) {
    const process = cornered * (1 - ramp(st.upright, UPRIGHT[0], UPRIGHT[1])) * (1 - ramp(st.square, SQUARE[0], SQUARE[1]));
    if (process > 0) out.push({ symbol: 'process', score: process, why: `an upright box — its sides within ${deg(st.upright)} of level and plumb, its corners within ${deg(st.square)} of square` });
    // A diamond keeps its corners with less of them: a rounded diamond's four still hold three quarters.
    const decision = ramp(o.four, 0.72, 0.8) * notThree * (1 - ramp(st.turned, TURNED[0], TURNED[1]));
    if (decision > 0) out.push({ symbol: 'decision', score: decision, why: `a diamond — its corners at the top, right, bottom and left, a box turned about 45° (its diagonals within ${deg(st.turned)} of plumb and level)` });
    const data =
      cornered *
      (1 - ramp(st.level, LEVEL[0], LEVEL[1])) *
      (1 - ramp(st.parallel, PARALLEL[0], PARALLEL[1])) *
      ramp(st.lean, LEAN[0], LEAN[1]) *
      ramp(st.square, LEAN[0], LEAN[1]) *
      (1 - ramp(st.lean, 55, 70));
    if (data > 0) out.push({ symbol: 'data', score: data, why: `a parallelogram — top and bottom within ${deg(st.level)} of level, its sides leaning ${deg(st.lean)} off plumb` });
  }
  const rounded = 1 - ramp(o.four, CORNERED[0], CORNERED[1]);
  const terminator = rounded * ramp(o.aspect, ELONGATED[0], ELONGATED[1]) * ramp(o.extent, 0.72, 0.8);
  if (terminator > 0) out.push({ symbol: 'terminator', score: terminator, why: `an elongated round-ended form, ${o.aspect.toFixed(1)}:1 — no corners to hold it (its best four hold ${pct(o.four)})` });
  const round = (1 - ramp(o.four, 0.76, 0.84)) * (1 - ramp(o.aspect, ROUND[0], ROUND[1])) * ramp(o.extent, 0.72, 0.78);
  if (round > 0) out.push({ symbol: 'round', score: round, why: `a circle, ${o.aspect.toFixed(1)}:1, with no corners` });
  return out.sort((a, b) => b.score - a.score);
}

// ===== Ports =====

/** Where a symbol takes a connector — the ports E3's hook offers, and the reading carries. */
function portsFor(symbol: SymbolName, o: Outline): NotationPort[] {
  const st = o.stance;
  if (symbol === 'decision' && st) {
    const names = ['top', 'right', 'bottom', 'left'];
    return st.diamond.map((p, i) => ({ name: names[i], at: { x: p.x, y: p.y }, reasoning: `the decision’s ${names[i]} vertex` }));
  }
  if ((symbol === 'process' || symbol === 'data') && st) {
    const b = st.box;
    const names = ['top', 'right', 'bottom', 'left'];
    return names.map((name, i) => ({ name, at: mid(b[i], b[(i + 1) % 4]), reasoning: `the middle of the ${symbol === 'data' ? 'data symbol' : 'process'}’s ${name} edge` }));
  }
  if (symbol === 'terminator' && o.frame) {
    const { centre: c, axis: u, long, short } = o.frame;
    const v = { x: -u.y, y: u.x };
    const across = (k: number, along: number): Point => ({ x: c.x + u.x * along + v.x * k, y: c.y + u.y * along + v.y * k });
    const level = Math.abs(u.x) >= Math.abs(u.y);
    const ends = [across(0, -long / 2), across(0, long / 2)].sort((p, q) => (level ? p.x - q.x : p.y - q.y));
    const flat = Math.max(0, long / 2 - short / 2);
    const sides = [-short / 2, short / 2].map((k) => (flat > 0.1 * short ? [across(k, -flat), across(k, flat)] : [across(k, 0)]));
    sides.sort((p, q) => (level ? p[0].y - q[0].y : p[0].x - q[0].x));
    const endNames = level ? ['left end', 'right end'] : ['top end', 'bottom end'];
    const sideNames = level ? ['top side', 'bottom side'] : ['left side', 'right side'];
    return [
      ...ends.map((p, i) => ({ name: endNames[i], at: p, reasoning: `the terminator’s ${endNames[i]}` })),
      ...sides.map((s, i) => (s.length === 2 ? { name: sideNames[i], along: s, reasoning: `anywhere along the terminator’s ${sideNames[i]}` } : { name: sideNames[i], at: s[0], reasoning: `the terminator’s ${sideNames[i]}` })),
    ];
  }
  // A start or end takes a flow where the circle itself offers one: its centre and cardinals (magnets.ts).
  return [];
}

// ===== Candidates: what could be a symbol =====

interface Candidate {
  /** What stands for it — a stroke, a word, or a figure of several loose strokes. */
  id: string;
  /** The strokes it is drawn with. */
  ids: string[];
  /** The marks of the scope it covers — the roles map's keys for it. */
  marks: string[];
  outline: Outline;
  scale: number;
  /** Shape readings, the likeliest first, each 0–1 before the ceiling. */
  shapes: { symbol: SymbolName | 'round'; score: number; why: string }[];
  /** How it was drawn, said before the shape: 'two strokes whose ends meet'. */
  lead: string;
  /** How cleanly its strokes meet (a figure), else 1. */
  fit: number;
}

const coreOf = (c: Candidate) => c.shapes.find((s) => s.symbol !== 'round');
const topCore = (c: Candidate) => {
  const s = c.shapes[0];
  return s && s.symbol !== 'round' ? s : undefined;
};

/** A closed stroke as a candidate. */
function strokeCandidate(node: MMNode): Candidate | null {
  const pts = strokePointsOf(node);
  const fp = fingerprintOf(node);
  if (!pts || !fp || pts.length < 3) return null;
  const top = resemblances(node)[0]?.to;
  const dot = top === 'type:dot';
  if (!fp.isClosed && !dot) return null;
  const o = outlineOf(pts);
  if (!o) return null;
  const shapes = dot ? [{ symbol: 'round' as const, score: 0.7, why: 'a dot' }] : shapeScores(o);
  if (!shapes.length) return null;
  return { id: node.id, ids: [node.id], marks: [node.id], outline: o, scale: scaleOf(node), shapes, lead: '', fit: 1 };
}

/** Several strokes whose ends meet, as a candidate. */
function figureCandidate(f: InkFigure, id: string, marks: string[], scale: number, lead: string): Candidate | null {
  if (f.vertices.length !== 4) return null;
  const o = outlineOf(f.vertices);
  if (!o) return null;
  // A figure's corners ARE its corners: its four hold all of it.
  const shapes = shapeScores({ ...o, four: 1 }).filter((s) => s.symbol !== 'terminator' && s.symbol !== 'round');
  if (!shapes.length) return null;
  return { id, ids: [...f.ids], marks, outline: { ...o, four: 1 }, scale, shapes, lead, fit: f.confidence / MAX };
}

/** A word whose letters are strokes meeting end to end as a figure: the letter rules gathered a symbol. */
function wordCandidate(word: MMNode, nodes: ReadonlyMap<string, MMNode>): Candidate | null {
  const letters = lettersOf(word).filter((id) => nodes.has(id) && !getRep(nodes.get(id)!, 'erased'));
  if (letters.length < 2) return null;
  for (const f of figuresAmong(nodes, letters)) {
    if (f.ids.length !== letters.length || !letters.every((id) => f.ids.includes(id))) continue;
    const lead = `${count(letters.length)} strokes the letter rules gathered into a word, whose ends meet as one figure`;
    const c = figureCandidate(f, word.id, [word.id], scaleOf(nodes.get(letters[0])!), lead);
    if (c) return { ...c, ids: letters };
  }
  return null;
}

/** Readings of a candidate as symbols, with confidences under the ceiling — `round` left for the chart to decide. */
function readingsOf(c: Candidate): SymbolReading[] {
  return c.shapes
    .filter((s): s is { symbol: SymbolName; score: number; why: string } => s.symbol !== 'round')
    .map((s) => ({
      symbol: s.symbol,
      role: FLOWCHART_TABLE.symbols[s.symbol].role as Role,
      confidence: MAX * s.score * c.fit,
      reason: c.lead ? `${c.lead}: ${s.why}` : s.why,
    }))
    .filter((r) => r.confidence >= 0.02);
}

// ===== The E3 hook: one mark, and the ports its symbol offers =====

let reading = 0;

/** An open loose stroke that could be a ruled side of a figure (figures.ts reads no arrow, writing, dot or closed stroke). */
function mayBeSide(n: MMNode): boolean {
  if (!getRep(n, 'stroke') || getRep(n, 'erased') || getRep(n, 'gesture') || n.edges.some((e) => e.rel === 'part-of')) return false;
  const fp = fingerprintOf(n);
  const top = resemblances(n)[0]?.to;
  return !!fp && !fp.isClosed && top !== 'type:arrow' && top !== 'type:text' && top !== 'type:dot';
}

/** A stroke's two ends where they stand now — only those two placed, not the whole stroke. */
function endsOf(n: MMNode): [Point, Point] | null {
  const raw = (getRep(n, 'stroke')?.data as { points?: Point[] } | undefined)?.points;
  if (!raw || raw.length < 2) return null;
  const [a, b] = placed(n, [raw[0], raw[raw.length - 1]]);
  return [a, b];
}

const sizeOf = (n: MMNode) => {
  const b = boundsOf(n);
  return b ? Math.max(b.maxX - b.minX, b.maxY - b.minY) : 0;
};

/** What a stroke's ends are tied to by a magnet, end by end — a short list, read once. */
function tiesOf(n: MMNode): { end?: string; to: string }[] {
  return n.edges.filter((e) => e.rel === 'bound-to').map((e) => ({ end: e.end, to: e.to }));
}

/**
 * Whether each end of `a` meets an end of `b` — within the reach figures.ts
 * allows, with room to spare — or is tied to `b` by a magnet. A bound end is
 * released ON its site, so where the ends are is the test; the ties catch one
 * that has moved since.
 */
function endsMeet(a: MMNode, ea: [Point, Point], ties: { end?: string; to: string }[], b: MMNode): { start: boolean; end: boolean } {
  const eb = endsOf(b);
  if (!eb) return { start: false, end: false };
  const reach = 1.5 * magnetRadius(Math.min(sizeOf(a), sizeOf(b)), Math.max(scaleOf(a), scaleOf(b)));
  const meets = (p: Point, end: 'start' | 'end') => eb.some((q) => Math.hypot(p.x - q.x, p.y - q.y) <= reach) || ties.some((t) => t.to === b.id && (!t.end || t.end === end));
  return { start: meets(ea[0], 'start'), end: meets(ea[1], 'end') };
}

/**
 * The strokes a figure this one is a side of would be made of: open strokes
 * joined end to end with it, a few at most — or just itself, when one of its
 * ends meets no other stroke's, because then it closes nothing.
 */
function sideCluster(node: MMNode, nodes: ReadonlyMap<string, MMNode>, max = 12): string[] {
  const out = [node.id];
  const seen = new Set(out);
  let start = false, end = false;
  for (let i = 0; i < out.length && out.length < max; i++) {
    const a = nodes.get(out[i])!;
    const ea = endsOf(a);
    if (!ea) continue;
    const ties = tiesOf(a);
    for (const [id, n] of nodes) {
      if (seen.has(id) || out.length >= max) continue;
      // The cheap test first — where its ends are — and what it reads as only for a stroke whose ends meet.
      const m = endsMeet(a, ea, ties, n);
      if ((!m.start && !m.end) || !mayBeSide(n)) continue;
      if (i === 0) {
        start ||= m.start;
        end ||= m.end;
      }
      seen.add(id);
      out.push(id);
    }
    if (i === 0 && !(start && end)) return [node.id];
  }
  return out;
}

/** The candidate a mark is part of, read on its own — no chart around it. */
function candidateOfMark(node: MMNode, nodes: ReadonlyMap<string, MMNode>): Candidate | null {
  if (getRep(node, 'erased') || transcriptOf(node)) return null;
  if (isWord(node)) return null; // a word has no ink of its own: its first letter offers for it
  const word = node.edges.find((e) => e.rel === 'part-of' && !e.blessed && nodes.get(e.to) && isWord(nodes.get(e.to)!));
  if (word) {
    const c = wordCandidate(nodes.get(word.to)!, nodes);
    return c && [...c.ids].sort()[0] === node.id ? c : null;
  }
  if (node.edges.some((e) => e.rel === 'part-of')) return null;
  const fp = fingerprintOf(node);
  if (!fp) return null;
  if (fp.isClosed) return strokeCandidate(node);
  if (!mayBeSide(node)) return null;
  const around = sideCluster(node, nodes);
  if (around.length < 2) return null;
  for (const f of figuresAmong(nodes, around)) {
    if (!f.ids.includes(node.id)) continue;
    if ([...f.ids].sort()[0] !== node.id) return null; // one stroke offers for the figure
    return figureCandidate(f, f.id, [...f.ids], scaleOf(node), `${count(f.ids.length)} strokes whose ends meet`);
  }
  return null;
}

/**
 * What the flowchart reads one mark as, on its own, and the ports its symbol
 * offers — the notation's side of E3's hook. A start or an end cannot be told
 * without the chart around it, and offers none of its own; a guess offers
 * nothing. Re-entry (a figure asking for a bound site while it is being read)
 * answers nothing, so the hook never calls itself without end.
 */
export function flowchartPortsOf(node: MMNode, nodes: ReadonlyMap<string, MMNode>): { symbol: string; ports: NotationPort[] } | null {
  if (reading > 0) return null;
  reading++;
  try {
    const c = candidateOfMark(node, nodes);
    const top = c && readingsOf(c)[0];
    if (!c || !top || top.confidence < PORTS_FLOOR) return null;
    return { symbol: top.symbol, ports: portsFor(top.symbol as SymbolName, c.outline) };
  } finally {
    reading--;
  }
}

// ===== Reading a scope =====

interface Mark {
  id: string;
  node: MMNode;
}

/** Writing: a word, a mark somebody has read, or a stroke the shape rung reads as text. */
function isWriting(node: MMNode): boolean {
  if (isWord(node) || transcriptOf(node)) return true;
  return resemblances(node)[0]?.to === 'type:text';
}

function centreOf(b: Bounds): Point {
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
}

/**
 * The words a hand put on these marks' own ink (`label`, session.ts): each
 * different word once, the marks taken in id order so the same marks say the
 * same words however the log was merged. A figure's strokes each carry the
 * word the hand labelled them with, so it is said once.
 */
function ownWords(nodes: ReadonlyMap<string, MMNode>, ids: readonly string[]): string | undefined {
  const words: string[] = [];
  for (const id of [...new Set(ids)].sort()) {
    const n = nodes.get(id);
    const t = n && labelOf(n)?.text.trim();
    if (t && !words.includes(t)) words.push(t);
  }
  return words.length ? words.join(' ') : undefined;
}

/** How far a point stands from a box: 0 inside it. The cheap test in front of every hull and path distance. */
function offBox(p: Point, b: Bounds): number {
  return Math.hypot(Math.max(0, b.minX - p.x, p.x - b.maxX), Math.max(0, b.minY - p.y, p.y - b.maxY));
}

/** How far apart two boxes stand: 0 when they touch or overlap. */
function boxGap(a: Bounds, b: Bounds): number {
  return Math.hypot(Math.max(0, b.minX - a.maxX, a.minX - b.maxX), Math.max(0, b.minY - a.maxY, a.minY - b.maxY));
}

function boundsOfPoints(pts: readonly Point[]): Bounds {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

/** The nine places on a box a label is measured from: its centre, corners and edge middles. */
function boxPoints(b: Bounds): Point[] {
  const xs = [b.minX, (b.minX + b.maxX) / 2, b.maxX], ys = [b.minY, (b.minY + b.maxY) / 2, b.maxY];
  return xs.flatMap((x) => ys.map((y) => ({ x, y })));
}

const reachOfSymbol = (c: Candidate) => Math.max(magnetRadius(c.outline.size, c.scale), c.outline.size * DEFAULT_SESSION_CONFIG.wireEndpointRatio);

/**
 * The flowchart a scope makes — the board's content plane when no scope is
 * given — or null when it holds no process, decision, terminator or data
 * symbol, or no flow joining two symbols. Reads the session and changes
 * nothing in it.
 */
export function readFlowchart(state: SessionState, scopeIds?: readonly string[]): NotationReading | null {
  const nodes = state.nodes;
  const artifacts = new Set(state.artifacts);
  const scope = (scopeIds ? [...new Set(scopeIds)] : state.contentIds.filter((id) => !artifacts.has(id))).filter((id) => {
    const n = nodes.get(id);
    return !!n && !artifacts.has(id) && !getRep(n, 'erased') && !getRep(n, 'gesture');
  });
  if (!scope.length) return null;
  const marks: Mark[] = scope.map((id) => ({ id, node: nodes.get(id)! }));

  // 1. Candidates: closed strokes, words that are figures, figures of loose strokes.
  const candidates: Candidate[] = [];
  const open: string[] = [];
  const writing = new Set<string>();
  for (const m of marks) {
    if (isWord(m.node)) {
      const c = wordCandidate(m.node, nodes);
      if (c) candidates.push(c);
      else writing.add(m.id);
      continue;
    }
    if (transcriptOf(m.node)) {
      writing.add(m.id);
      continue;
    }
    const c = strokeCandidate(m.node);
    if (c) {
      candidates.push(c);
      continue;
    }
    if (isWriting(m.node)) writing.add(m.id);
    else if (fingerprintOf(m.node) && !fingerprintOf(m.node)!.isClosed) open.push(m.id);
  }
  const inFigure = new Set<string>();
  for (const f of figuresAmong(nodes, open)) {
    const c = figureCandidate(f, f.id, [...f.ids], scaleOf(nodes.get(f.ids[0])!), `${count(f.ids.length)} strokes whose ends meet`);
    if (!c || !readingsOf(c).length) continue;
    candidates.push(c);
    f.ids.forEach((id) => inFigure.add(id));
  }

  // 2. Which candidates are symbols. A closed mark holding another is a
  //    container — flowchart symbols do not nest — and a small round mark
  //    inside a symbol is a letter of its label, not a start.
  const containers = new Set<string>();
  const inside = (a: Candidate, b: Candidate) => {
    const c = centreOf(b.outline.bounds);
    return b.outline.size < a.outline.size && offBox(c, a.outline.bounds) === 0 && outside(c, a.outline.hull) === 0;
  };
  for (const a of candidates) {
    if (!coreOf(a)) continue;
    for (const b of candidates) if (a !== b && inside(a, b) && topCore(b)) containers.add(a.id);
  }
  const cores = candidates.filter((c) => !containers.has(c.id) && topCore(c) && readingsOf(c).length);
  if (!cores.length) return null;
  const sizes = cores.map((c) => c.outline.size).sort((a, b) => a - b);
  const median = sizes[Math.floor(sizes.length / 2)];
  const rounds = candidates.filter((c) => {
    if (containers.has(c.id) || topCore(c)) return false;
    const r = c.shapes.find((s) => s.symbol === 'round');
    if (!r) return false;
    if (cores.some((k) => inside(k, c))) {
      c.marks.forEach((id) => writing.add(id));
      return false;
    }
    return r.score * (1 - ramp(c.outline.size / median, SMALL[0], SMALL[1])) > 0.1;
  });

  // 3. Connectors: every open stroke that is not a side of a figure, read past its heads.
  const symbolOfMark = new Map<string, Candidate>();
  for (const c of [...cores, ...rounds]) for (const id of [...c.ids, ...c.marks]) symbolOfMark.set(id, c);
  const heads = new Map<string, ConnectorHeads>();
  for (const id of open) {
    if (inFigure.has(id)) continue;
    const h = headsOf(state, id);
    if (h) heads.set(id, h);
  }
  // A core symbol small beside the others, sitting at a connector's end on its axis, is that connector's head.
  const demoted = new Set<Candidate>();
  for (const h of heads.values()) {
    for (const e of [h.start, h.end]) {
      const top = e.heads[0];
      const c = top && top.ids.map((id) => symbolOfMark.get(id)).find((x) => x && x.ids[0] !== h.id);
      if (c && cores.includes(c) && c.outline.size <= HEAD_SHARE * median) demoted.add(c);
    }
  }
  const symbols = [...cores, ...rounds].filter((c) => !demoted.has(c));
  const isSymbol = new Set(symbols);

  const connectors: NotationConnector[] = [];
  const pointers: string[] = [];
  const edgeMarks = new Map<string, string>(); // a head drawn apart → its connector
  for (const [id, h] of heads) {
    const node = nodes.get(id)!;
    const bindings = activeBindingsOf(node, nodes);
    const ends = [h.start, h.end].map((e) => endOf(e, id, bindings, symbols, isSymbol, symbolOfMark));
    const [a, b] = ends;
    if (!a.symbol || !b.symbol || a.symbol.id === b.symbol.id) {
      if ((a.symbol || b.symbol) && !(a.symbol && b.symbol)) pointers.push(id);
      continue;
    }
    const pointsIn = (e: typeof a) => !!e.head && (e.head.kind === 'arrow' || e.head.kind === 'triangle');
    let direction: NotationConnector['direction'] = 'none';
    let [from, to] = [a, b];
    if (pointsIn(b) && !pointsIn(a)) direction = 'forward';
    else if (pointsIn(a) && !pointsIn(b)) {
      direction = 'forward';
      [from, to] = [b, a];
    } else if (pointsIn(a) && pointsIn(b)) direction = 'both';
    const headIds = [...new Set(ends.flatMap((e) => (e.head ? e.head.ids : [])).filter((x) => x !== id))];
    headIds.forEach((x) => edgeMarks.set(x, id));
    const pointing = direction === 'forward' ? to.head! : undefined;
    const quality = Math.min(from.quality, to.quality) * (pointing ? 0.75 + 0.25 * (pointing.confidence / MAX) : direction === 'both' ? 0.85 : 0.8);
    const reason =
      direction === 'forward'
        ? `${an(h.shape)} from ${from.symbol!.id} to ${to.symbol!.id}, its ${to.head!.kind === 'arrow' ? 'arrowhead' : `${to.head!.filled ? 'filled' : 'hollow'} ${to.head!.kind}`} at ${to.symbol!.id}`
        : direction === 'both'
          ? `${an(h.shape)} with a head at both ends, between ${from.symbol!.id} and ${to.symbol!.id}`
          : `${an(h.shape)} with no head, from ${from.symbol!.id} to ${to.symbol!.id} in the order it was drawn`;
    const words = ownWords(nodes, [id]);
    connectors.push({
      id,
      ids: [id, ...headIds],
      kind: 'flow',
      role: FLOWCHART_TABLE.connectors.flow.role,
      direction,
      directed: direction !== 'none',
      from: from.symbol!.id,
      to: to.symbol!.id,
      ends: { from: from.said, to: to.said },
      confidence: MAX * quality,
      reason,
      labels: [],
      ...(words ? { text: words } : {}),
    });
  }

  // 4. Starts and ends: a small circle a flow leaves, or one a flow arrives at.
  const readings = new Map<Candidate, SymbolReading[]>();
  for (const c of symbols) {
    if (!rounds.includes(c)) {
      readings.set(c, readingsOf(c));
      continue;
    }
    const outs = connectors.filter((k) => k.directed && k.from === c.id).length;
    const ins = connectors.filter((k) => k.directed && k.to === c.id).length;
    const plain = connectors.filter((k) => !k.directed && (k.from === c.id || k.to === c.id));
    if (!outs && !ins && !plain.length) continue; // joined to nothing: not a start or an end
    const r = c.shapes.find((s) => s.symbol === 'round')!;
    const small = 1 - ramp(c.outline.size / median, SMALL[0], SMALL[1]);
    let symbol: 'start' | 'end', sure: number, why: string;
    if (outs && !ins) [symbol, sure, why] = ['start', 1, `${count(outs)} flow${outs === 1 ? '' : 's'} leave${outs === 1 ? 's' : ''} it`];
    else if (ins && !outs) [symbol, sure, why] = ['end', 1, `${count(ins)} flow${ins === 1 ? '' : 's'} arrive${ins === 1 ? 's' : ''} at it`];
    else if (ins || outs) [symbol, sure, why] = [ins >= outs ? 'end' : 'start', 0.6, 'flows both arrive at it and leave it'];
    else {
      const other = plain[0].from === c.id ? plain[0].to : plain[0].from;
      const o = symbols.find((x) => x.id === other)!;
      const above = centreOf(c.outline.bounds).y <= centreOf(o.outline.bounds).y;
      [symbol, sure, why] = [above ? 'start' : 'end', 0.7, `a line with no head joins it, and it sits ${above ? 'above' : 'below'} what it joins`];
    }
    const size = `${Math.round((c.outline.size / median) * 100)}% the size of the chart’s other symbols`;
    readings.set(c, [{ symbol, role: FLOWCHART_TABLE.symbols[symbol].role as Role, confidence: MAX * r.score * small * sure, reason: `${r.why}, ${size} — ${why}` }]);
  }
  const placed = symbols.filter((c) => readings.get(c)?.length);
  const out: NotationSymbol[] = placed.map((c) => {
    const rs = readings.get(c)!;
    const top = rs[0];
    const words = ownWords(nodes, [c.id, ...c.ids]);
    return {
      id: c.id,
      ids: [...c.ids],
      symbol: top.symbol,
      role: top.role,
      confidence: top.confidence,
      reason: top.reason,
      readings: rs,
      outline: c.outline.hull.map((p) => ({ x: p.x, y: p.y })),
      bounds: { ...c.outline.bounds },
      ports: portsFor(top.symbol as SymbolName, c.outline),
      labels: [],
      ...(words ? { text: words } : {}),
    };
  });
  const bySymbol = new Map(out.map((s) => [s.id, s]));
  // A connector whose end landed on a round mark no reading kept joins nothing after all.
  for (let i = connectors.length - 1; i >= 0; i--) {
    const k = connectors[i];
    if (!bySymbol.has(k.from) || !bySymbol.has(k.to)) {
      pointers.push(k.id);
      connectors.splice(i, 1);
    }
  }

  // 5. Labels: writing inside a symbol, or beside a flow; else beside a symbol; else alone.
  const labels: NotationLabel[] = [];
  const paths = new Map(connectors.map((k) => {
    const pts = strokePointsOf(nodes.get(k.id)!) ?? [];
    return [k.id, { pts, box: pts.length ? boundsOfPoints(pts) : null }];
  }));
  for (const m of marks) {
    if (!writing.has(m.id) || symbolOfMark.has(m.id)) continue;
    const b = boundsOf(m.node);
    if (!b) continue;
    const c = centreOf(b);
    const size = Math.max(b.maxX - b.minX, b.maxY - b.minY);
    const text = transcriptOf(m.node) ?? labelOf(m.node)?.text;
    const home = out
      .filter((s) => offBox(c, s.bounds) === 0 && outside(c, s.outline) === 0 && Math.max(s.bounds.maxX - s.bounds.minX, s.bounds.maxY - s.bounds.minY) > size)
      .sort((p, q) => (p.bounds.maxX - p.bounds.minX) * (p.bounds.maxY - p.bounds.minY) - (q.bounds.maxX - q.bounds.minX) * (q.bounds.maxY - q.bounds.minY))[0];
    const base = { id: m.id, role: FLOWCHART_TABLE.label.role as Role, ...(text ? { text } : {}), bounds: { ...b } };
    if (home) {
      labels.push({ ...base, of: home.id, where: 'inside', confidence: MAX * 0.9, reason: `writing inside ${home.symbol} ${home.id}` });
      home.labels.push(m.id);
      continue;
    }
    // Beside is within the writing's own size — the gap a hand leaves between a word and what it labels — and never under twice the hand's reach.
    const reach = Math.max(2 * magnetRadius(size, scaleOf(m.node)), size);
    const pts = boxPoints(b);
    const flow = connectors
      .filter((k) => {
        const box = paths.get(k.id)!.box;
        return !!box && boxGap(b, box) <= reach;
      })
      .map((k) => ({ k, d: Math.min(...pts.map((p) => distToPath(p, paths.get(k.id)!.pts))) }))
      .filter((x) => x.d <= reach)
      .sort((p, q) => p.d - q.d)[0];
    if (flow) {
      labels.push({ ...base, of: flow.k.id, where: 'beside', confidence: MAX * (1 - 0.5 * (flow.d / reach)), reason: `writing ${Math.round(flow.d)} from the flow ${flow.k.id}, within its own size` });
      flow.k.labels.push(m.id);
      continue;
    }
    const by = out
      .filter((s) => boxGap(b, s.bounds) <= reach)
      .map((s) => ({ s, d: Math.min(...pts.map((p) => outside(p, s.outline))) }))
      .filter((x) => x.d <= reach)
      .sort((p, q) => p.d - q.d)[0];
    if (by) {
      labels.push({ ...base, of: by.s.id, where: 'beside', confidence: MAX * 0.6 * (1 - 0.5 * (by.d / reach)), reason: `writing ${Math.round(by.d)} from ${by.s.symbol} ${by.s.id}` });
      by.s.labels.push(m.id);
      continue;
    }
    labels.push({ ...base, where: 'alone', role: 'annotation', confidence: MAX * 0.5, reason: 'writing beside nothing in the chart — a note' });
  }

  // 6. Roles: what every mark in the scope plays under this notation — one of the six.
  const roles: Record<string, Role> = {};
  const weight: Record<string, number> = {};
  const give = (id: string, role: Role, w: number) => {
    if (roles[id]) return;
    roles[id] = role;
    weight[id] = w;
  };
  for (const s of out) for (const c of placed.filter((x) => x.id === s.id)) for (const id of [...c.marks, ...c.ids]) give(id, s.role, 1);
  for (const k of connectors) for (const id of k.ids) give(id, k.role, 1);
  for (const l of labels) give(l.id, l.role, l.where === 'alone' ? 0.5 : 1);
  for (const id of pointers) give(id, 'annotation', 0.5);
  for (const id of containers) give(id, 'container', 0.5);
  const unplaced: string[] = [];
  for (const m of marks) {
    if (roles[m.id]) continue;
    const via = edgeMarks.get(m.id);
    if (via) give(m.id, 'edge', 1);
    else {
      give(m.id, 'unclassified', 0);
      unplaced.push(m.id);
    }
  }
  for (const id of Object.keys(roles)) if (!scope.includes(id)) delete roles[id];

  // 7. Is it a flowchart, and how surely.
  const core = out.filter((s) => CORE.has(s.symbol as SymbolName));
  if (!core.length || !connectors.length) return null;
  const joined = new Set(connectors.flatMap((k) => [k.from, k.to]));
  const connected = out.filter((s) => joined.has(s.id)).length / out.length;
  const coverage = scope.reduce((a, id) => a + (weight[id] ?? 0), 0) / scope.length;
  const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / Math.max(1, xs.length);
  const symbolSure = mean(out.map((s) => s.confidence)) / MAX;
  const flowSure = mean(connectors.map((k) => k.confidence)) / MAX;
  const pointing = connectors.filter((k) => k.directed).length / connectors.length;
  const distinct = out.some((s) => s.symbol !== 'process') ? 1 : 0;
  const confidence = MAX * Math.sqrt(connected * coverage) * Math.sqrt(symbolSure * flowSure) * (0.55 + 0.45 * pointing) * (0.8 + 0.2 * distinct);

  const counts: Record<string, number> = {};
  for (const name of SYMBOLS) counts[name] = out.filter((s) => s.symbol === name).length;
  counts.flow = connectors.length;
  counts.label = labels.filter((l) => l.where !== 'alone').length;
  const parts = SYMBOLS.filter((name) => counts[name]).map((name) => `${count(counts[name])} ${counts[name] === 1 ? FLOWCHART_TABLE.symbols[name].one : FLOWCHART_TABLE.symbols[name].many}`);
  parts.push(`${count(connectors.length)} ${connectors.length === 1 ? 'flow' : 'flows'}`);
  const summary = parts.join(', ');
  const directed = connectors.filter((k) => k.directed).length;
  const reason = [
    connected === 1 ? 'every symbol joined' : `${count(out.filter((s) => joined.has(s.id)).length)} of ${count(out.length)} symbols joined`,
    directed === connectors.length ? `every flow pointing` : `${count(directed)} of ${count(connectors.length)} flows pointing`,
    counts.label ? `${count(counts.label)} label${counts.label === 1 ? '' : 's'}` : '',
    unplaced.length ? `${count(unplaced.length)} mark${unplaced.length === 1 ? '' : 's'} it places nowhere` : '',
  ].filter(Boolean).join(', ');

  // In the scope's own order.
  const order = new Map(scope.map((id, i) => [id, i]));
  const firstOf = (ids: readonly string[]) => Math.min(...ids.map((id) => order.get(id) ?? Infinity));
  out.sort((p, q) => firstOf([p.id, ...p.ids]) - firstOf([q.id, ...q.ids]));
  labels.sort((p, q) => (order.get(p.id) ?? 0) - (order.get(q.id) ?? 0));
  connectors.sort((p, q) => (order.get(p.id) ?? 0) - (order.get(q.id) ?? 0));

  return {
    notation: 'flowchart',
    name: FLOWCHART_TABLE.name,
    confidence,
    summary,
    reason: `${summary} — ${reason}`,
    symbols: out,
    connectors,
    labels,
    roles,
    unplaced,
    counts,
  };
}

interface ResolvedEnd {
  symbol?: Candidate;
  head?: HeadReading;
  quality: number;
  said: NotationEnd;
}

/** One end of a connector: a magnet's bind first; else past its head, the nearest symbol within reach. */
function endOf(
  e: ConnectorHeads['start'],
  connectorId: string,
  bindings: ReturnType<typeof activeBindingsOf>,
  symbols: Candidate[],
  isSymbol: Set<Candidate>,
  symbolOfMark: Map<string, Candidate>
): ResolvedEnd {
  // What sits at the end: the likeliest head — unless the flowchart reads it as a symbol, which the flow then lands on.
  let head: HeadReading | undefined;
  let point = e.point;
  let landed: Candidate | undefined;
  for (const h of e.heads) {
    const c = h.ids.map((id) => (id === connectorId ? undefined : symbolOfMark.get(id))).find((x) => x && isSymbol.has(x));
    if (c) {
      landed = c;
      break;
    }
    head = h;
    point = h.tip;
    break;
  }
  const headSaid = head ? { kind: head.kind, filled: head.filled, ids: [...head.ids], confidence: head.confidence } : undefined;
  const bound = bindings.find((b) => b.end === e.end);
  const boundTo = bound && symbolOfMark.get(bound.nodeId);
  if (boundTo && isSymbol.has(boundTo)) {
    return {
      symbol: boundTo,
      head,
      quality: 1,
      said: { end: e.end, point: { x: point.x, y: point.y }, symbol: boundTo.id, ...(headSaid ? { head: headSaid } : {}), bound: true, reason: `bound by a magnet to ${boundTo.id} (${bound!.site.kind} ${bound!.site.index})` },
    };
  }
  if (landed) {
    return {
      symbol: landed,
      head: undefined,
      quality: 1,
      said: { end: e.end, point: { x: e.point.x, y: e.point.y }, symbol: landed.id, reason: `it ends on ${landed.id}, which heads.ts reads as a head and the flowchart as a symbol` },
    };
  }
  let best: { c: Candidate; d: number } | undefined;
  for (const c of symbols) {
    if (!isSymbol.has(c)) continue;
    const reach = reachOfSymbol(c);
    if (offBox(point, c.outline.bounds) > reach) continue;
    const d = outside(point, c.outline.hull);
    if (d > reach) continue;
    if (!best || d < best.d || (d === best.d && c.outline.size < best.c.outline.size)) best = { c, d };
  }
  if (!best) {
    return { head, quality: 0, said: { end: e.end, point: { x: point.x, y: point.y }, ...(headSaid ? { head: headSaid } : {}), reason: head ? `past its ${head.kind}, nothing within reach` : 'nothing within reach' } };
  }
  const reach = reachOfSymbol(best.c);
  return {
    symbol: best.c,
    head,
    quality: 1 - 0.4 * (best.d / reach),
    said: {
      end: e.end,
      point: { x: point.x, y: point.y },
      symbol: best.c.id,
      ...(headSaid ? { head: headSaid } : {}),
      reason: `${head ? `past its ${head.kind === 'arrow' ? 'arrowhead' : head.kind}, ` : ''}${best.d === 0 ? 'on' : `${Math.round(best.d)} from`} ${best.c.id}`,
    },
  };
}

// ===== The notation =====

export const FLOWCHART: Notation = {
  id: 'flowchart',
  name: FLOWCHART_TABLE.name,
  describes: FLOWCHART_TABLE.describes,
  symbols: SYMBOLS.map((name) => ({
    name,
    role: FLOWCHART_TABLE.symbols[name].role as Role,
    describes: FLOWCHART_TABLE.symbols[name].describes,
    ports: FLOWCHART_TABLE.symbols[name].ports,
  })),
  connectors: [{ name: 'flow', role: FLOWCHART_TABLE.connectors.flow.role as Role, describes: FLOWCHART_TABLE.connectors.flow.describes }],
  read: (state, scopeIds) => readFlowchart(state, scopeIds),
  ports: { notation: 'flowchart', portsOf: flowchartPortsOf } satisfies NotationPorts,
};

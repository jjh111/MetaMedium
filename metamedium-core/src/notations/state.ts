// The state notation (V1-PLAN §3, §9 D5's state half).
//
// States and the transitions between them, read from ink:
//
//   - **state** — a rounded box: one closed stroke the shape rung reads as a
//     box, a stadium or (when it is not small beside the chart) a circle, its
//     corners square or round — a hand's rounded box is a rectangle to the
//     rung and a box with softened corners to the corner measures, and both
//     are states; or strokes ruled into one (diagram/figures.ts). Its name is
//     the writing in it. A box holding another state is a composite state's
//     frame and is left out, said. A diamond or a leaning box is a flowchart's
//     decision or data symbol, not a state, and counts against the reading.
//   - **initial** — a small dot scribbled solid, a transition leaving it: one
//     stroke the shape rung reads as anything or nothing (an arc, writing, a
//     rectangle), which is why it is read from its ink alone — compact,
//     small beside the states, and dense: its path runs a good many times its
//     outline. A tap the rung calls a dot is one too.
//   - **final** — a ring with a smaller mark inside it, a transition arriving:
//     a scribbled dot, a tap, or a second ring — the bullseye. A small hollow
//     ring alone is read as an initial or a final by which way its transition
//     runs, less surely.
//   - **transitions** — arrows between two states, the initial dot or the
//     final ring, each end read PAST its head (diagram/heads.ts; a small mark
//     the rung calls a circle head at an end is the dot or the ring the
//     transition lands on), a magnet's bind first; and a **self-transition**,
//     a loop out of a state and back — one open stroke both of whose ends land
//     on one state, bulging out, its head its own barb where it comes back.
//     The shape rung reads such a loop as an arc or as nothing, and heads.ts
//     finds no barb on it, so the loop is measured here, the way a sequence
//     diagram's self-message is (sequence.ts). A line with no head is no
//     transition. Transitions are solid: dashes are not read.
//   - **labels** — writing inside a state names it; writing beside a
//     transition labels it (the event).
//
// **What it is not.** A state diagram is boxes and arrows, which is what a
// flowchart is, so the trap is to read every flowchart as one. What makes it
// a state diagram is what a flowchart has no symbol for: the solid initial
// dot, the final ring, the loop out of a state and back, rounded states. The
// reading's confidence is its structure (every symbol joined, every
// transition pointing) scaled by that evidence, so plain boxes and arrows
// read as a flowchart and stay under the floor here, and a board with a
// decision or a data symbol in it is a flowchart's. Read from the geometry,
// never the relation or role tables (the trap): they call a state a node
// among nodes and a dot beside an arrow's tail its head.
//
// Every symbol plays one of the six roles and adds none: a state, an initial
// dot and a final ring are nodes, a transition an edge, writing a label.
// Derived, like every notation: nothing enters the log. Its content — names,
// roles, ports, the Mermaid of each symbol — is the table below, its single
// home; the state@1 pack (packs/shipped/state.ts) names this notation and
// restates none of it. The graph notations' joining and words are graph-kit.ts.

import type { Point } from '../types';
import type { SessionState } from '../session/session';
import type { MMNode } from '../session/nodes';
import { fingerprintOf, getRep, isWord, resemblances, strokePointsOf, transcriptOf } from '../session/nodes';
import type { NotationPort, NotationPorts } from '../session/ports';
import { activeBindingsOf } from '../session/magnets';
import { cleanOf, cleanPointsOf } from '../session/clean';
import { figuresAmong } from '../diagram/figures';
import type { Role } from '../diagram/roles';
import { MAX_TIER0_CONFIDENCE } from '../recognition';
import type { Notation, NotationConnector, NotationEnd, NotationReading, NotationSymbol } from './notation';
import type { Candidate } from './flowchart';
import { figureCandidate, mayBeSide, outlineOf, reachOfSymbol, scaleOf, strokeCandidate } from './flowchart';
import { offSquare, outside, perimeterOf, ramp } from './shape';
import { centreOf, countWord, inkOf, joinSymbols, labelWriting, marksOf, mean, median, pathLength, rolesOf, symbolOf, writingOf } from './graph-kit';

// ===== The table — the state diagram's content =====

/**
 * The state diagram's content: its three symbols, its transition, the writing
 * it reads, each with the role it plays, where it takes a connector, and how
 * it is said in Mermaid (the writer writes with these). Content, not code, and
 * this is its single home: the `state@1` pack names the notation and restates
 * none of it (V1-PLAN §2.3, B3); the rest of this file is what a signature
 * cannot see.
 */
export const STATE_TABLE = {
  pack: 'state@1',
  notation: 'state',
  name: 'State diagram',
  describes: 'states, the transitions between them, an initial dot and a final ring',
  symbols: {
    state: { role: 'node', describes: 'a rounded box, its name written in it', ports: 'its border, anywhere along it', one: 'state', many: 'states', mermaid: { declare: 'state' } },
    initial: { role: 'node', describes: 'a small dot scribbled solid, a transition leaving it', ports: 'the dot’s own centre and cardinals', one: 'initial state', many: 'initial states', mermaid: { token: '[*]' } },
    final: { role: 'node', describes: 'a ring with a dot or a second ring inside it, a transition arriving', ports: 'the ring’s own centre and cardinals', one: 'final state', many: 'final states', mermaid: { token: '[*]' } },
  },
  connectors: {
    transition: { role: 'edge', describes: 'an arrow from one state to another — or a loop out of a state and back — the event written beside it', one: 'transition', many: 'transitions', mermaid: { arrow: '-->', label: ': ' } },
  },
  label: { role: 'label', describes: 'writing inside a state (its name), or beside a transition (its event)', one: 'label', many: 'labels' },
  mermaid: { header: 'stateDiagram-v2', direction: 'TD' },
} as const;

type SymbolName = keyof typeof STATE_TABLE.symbols;
const SYMBOLS = Object.keys(STATE_TABLE.symbols) as SymbolName[];

// ===== Thresholds — this notation's own; the hand's are cited =====

/** A filled mark's ink runs this many times the perimeter of its own outline: a ring or a box runs about once round, a spiral or a zigzag many times. Half by the first, whole by the second. */
export const FILLED_PATH = [1.6, 2.4] as const;
/** A filled mark is compact: no more elongated than this (its tightest box, long over short) — writing runs wide. */
export const BLOB_ASPECT = [1.4, 2.0] as const;
/** A tap the shape rung calls a dot is as sure a filled mark as this. */
export const DOT_FILLED = 0.8;
/** An initial dot or a final ring is small beside the states: full at this share of their median size, gone by the second. */
export const SMALL_BESIDE = [0.3, 0.5] as const;
/** A bullseye's inner mark is between these shares of its ring's size… */
export const INNER_SHARE = [0.15, 0.85] as const;
/** …and its centre lies within this share of the ring's size of the ring's centre. */
export const INNER_CENTRED = 0.3;
/** A loop bulges out of its state at least this share of the state's size, or this many screen pixels, whichever is more. */
export const LOOP_OUT = 0.12;
export const LOOP_OUT_PX = 12;
/** A loop's end, past a hand's reach, may still land: its ends are within the state's reach, and the loop stands out at least this many times as far as either end. */
export const LOOP_STANDS_OUT = 2;
/** A loop's barb: the pen goes back out along a wing at least this share of how far the loop reaches (or this many screen pixels), and at most a share of it. */
export const BARB_SHARE = [0.06, 0.6] as const;
export const BARB_PX = 4;
/** A state is round-cornered when its four best corners hold less than this much of it: a plain box holds 0.83–0.92 (flowchart.ts), a rounded one less. Whole by the first, none by the second. */
export const ROUNDED_BY = [0.8, 0.92] as const;
/** A box with round corners, which the corner measures read as a stadium or as a box less surely, fills its own tightest box this much: full by the second, none by the first (a circle or an oval fills 0.79). */
export const ROUNDED_EXTENT = [0.82, 0.9] as const;
/** …and stands square to the page within this many degrees, as a box does (flowchart.ts's UPRIGHT is its own). */
export const ROUNDED_UPRIGHT = [12, 33] as const;
/** A per-mark reading below this offers no ports: the pen should not feel a guess. */
export const PORTS_FLOOR = 0.4;

/**
 * What each kind of evidence for a state diagram — a thing a flowchart has no
 * symbol for — is worth to the reading's confidence, as the chance it alone
 * settles it; several together settle it as independent chances do. Not the
 * confidence of any one mark: how much more a state diagram this makes the
 * drawing than the boxes and arrows every diagram is made of.
 */
export const EVIDENCE = { initial: 0.5, final: 0.5, loop: 0.35, rounded: 0.25 } as const;
/** With no evidence at all a board of boxes and arrows is this share as sure a state diagram as its structure makes it; evidence carries the rest. */
export const PLAIN_SHARE = 0.3;
/** A board with a flowchart's own symbols in it — a decision, a data symbol — is this much less a state diagram, at most, for a board of them alone. */
export const FOREIGN_PENALTY = 0.75;

const MAX = MAX_TIER0_CONFIDENCE;
const pct = (x: number) => `${Math.round(x * 100)}%`;

// ===== The reading's own shapes =====

/** A symbol of a state diagram, as the notation reads it. */
export interface StateSymbol extends NotationSymbol {
  symbol: SymbolName;
  /** How round-cornered a state is, 0–1: 0 for a plain box. Every state has one; the initial and the final have none. */
  rounded?: number;
}

/** A transition, between two states — or from one back to itself. */
export interface StateTransition extends NotationConnector {
  /** A loop out of a state and back. */
  self: boolean;
}

/** What a scope is as a state diagram. */
export interface StateReading extends NotationReading {
  symbols: StateSymbol[];
  connectors: StateTransition[];
  /** What made it a state diagram rather than boxes and arrows, each with how much it counted, and what counted against it. */
  evidence: { what: string; weight: number }[];
  foreign: number;
}

// ===== Candidates: what could be a symbol =====

/** A compact, dense mark — a spot filled solid — as a candidate, whatever the shape rung called it. */
function blobCandidate(node: MMNode): Candidate | null {
  const pts = strokePointsOf(node);
  const fp = fingerprintOf(node);
  if (!pts || !fp || pts.length < 3) return null;
  const o = outlineOf(pts);
  if (!o) return null;
  const compact = 1 - ramp(o.aspect, BLOB_ASPECT[0], BLOB_ASPECT[1]);
  const top = resemblances(node)[0]?.to;
  const ratio = pathLength(pts) / Math.max(1e-9, perimeterOf(o.hull));
  const dense = top === 'type:dot' ? DOT_FILLED : ramp(ratio, FILLED_PATH[0], FILLED_PATH[1]);
  const score = compact * dense;
  if (score < 0.3) return null;
  const why = top === 'type:dot' ? 'a tap — a dot' : `a mark filled solid — its ink runs ${ratio.toFixed(1)} times round its outline, ${o.aspect.toFixed(1)}:1`;
  return { id: node.id, ids: [node.id], marks: [node.id], outline: o, scale: scaleOf(node), shapes: [{ symbol: 'round', score, why }], lead: '', fit: 1 };
}

/** A compact small mark — dense or not — as a candidate: what may stand inside a ring and make it a bullseye. */
function compactCandidate(node: MMNode): Candidate | null {
  const pts = strokePointsOf(node);
  if (!pts || pts.length < 3) return null;
  const o = outlineOf(pts);
  if (!o) return null;
  const compact = 1 - ramp(o.aspect, BLOB_ASPECT[0], BLOB_ASPECT[1]);
  if (compact < 0.5) return null;
  return { id: node.id, ids: [node.id], marks: [node.id], outline: o, scale: scaleOf(node), shapes: [{ symbol: 'round', score: compact, why: `a small mark, ${o.aspect.toFixed(1)}:1` }], lead: '', fit: 1 };
}

/**
 * How much a candidate reads as the shape of a state — a box, a stadium, or a
 * box with round corners — and why; 0 where it does not. The flowchart's
 * measures (flowchart.ts `shapeScores`) say box and stadium; a hand's rounded
 * box holds less of itself in its four best corners than a box and more than
 * a stadium and reads as either, unsurely, so it is also known by how fully
 * it fills its own tightest box and how square it stands to the page.
 */
function stateShape(c: Candidate): { score: number; why: string } {
  let best = { score: 0, why: '' };
  for (const s of c.shapes) if ((s.symbol === 'process' || s.symbol === 'terminator') && s.score > best.score) best = { score: s.score, why: s.why };
  const o = c.outline;
  if (c.ids.length === 1 && o.frame && !isForeign(c) && topShape(c) !== 'round') {
    const off = offSquare(o.frame.axis);
    const rect = ramp(o.extent, ROUNDED_EXTENT[0], ROUNDED_EXTENT[1]) * (1 - ramp(o.three, 0.62, 0.74)) * (1 - ramp(off, ROUNDED_UPRIGHT[0], ROUNDED_UPRIGHT[1]));
    if (rect > best.score) best = { score: rect, why: `a round-cornered box, ${o.aspect.toFixed(1)}:1 — its sides within ${Math.round(off)}° of level and plumb, it fills ${pct(o.extent)} of its own box` };
  }
  return best;
}

const topShape = (c: Candidate) => c.shapes[0]?.symbol;
const isRound = (c: Candidate) => topShape(c) === 'round';
const isForeign = (c: Candidate) => topShape(c) === 'decision' || topShape(c) === 'data';
const isBox = (c: Candidate) => !isForeign(c) && !isRound(c) && stateShape(c).score > 0.05;

function insideOf(a: Candidate, b: Candidate): boolean {
  const c = centreOf(b.outline.bounds);
  return b.outline.size < a.outline.size && outside(c, a.outline.hull) === 0;
}

// ===== Loops =====

interface Loop {
  id: string;
  ids: string[];
  state: Candidate;
  ends: { start: NotationEnd; end: NotationEnd };
  /** Which ends carry a barb. */
  barbs: { start: boolean; end: boolean };
  /** How far it stands out of the state, in the state's sizes. */
  out: number;
  confidence: number;
  reason: string;
  bound: boolean;
}

/**
 * The barb at one end of a loop: from where the loop is well out to where it
 * meets the state, the pen reaches the state and folds back out along a wing.
 * Measured on the distance from the state's outline (`d`), the way a
 * self-message's is off its lifeline (sequence.ts `loopHeads`). Null when the
 * end is plain.
 */
function loopBarb(pts: readonly Point[], d: readonly number[], which: 'start' | 'end', far: number, scale: number): { tip: Point; wing: number } | null {
  const idx = which === 'end' ? pts.map((_, i) => i) : pts.map((_, i) => pts.length - 1 - i);
  let f = 0;
  idx.forEach((i, k) => {
    if (d[i] >= 0.7 * far) f = k;
  });
  const tail = idx.slice(f);
  if (tail.length < 3) return null;
  let k = 0;
  tail.forEach((i, j) => {
    if (d[i] < d[tail[k]]) k = j;
  });
  const wing = Math.max(0, ...tail.slice(k).map((i) => d[i] - d[tail[k]]));
  const came = d[tail[0]] - d[tail[k]];
  const least = Math.max(BARB_PX * scale, BARB_SHARE[0] * far);
  if (k < tail.length - 1 && wing >= least && wing <= BARB_SHARE[1] * far && came >= 0.5 * far) return { tip: pts[tail[k]], wing };
  return null;
}

/** A stroke as a loop out of one of the states and back, or null. */
function loopOf(node: MMNode, states: readonly Candidate[], nodes: ReadonlyMap<string, MMNode>): Loop | null {
  const pts = inkOf(node);
  if (pts.length < 6) return null;
  const scale = scaleOf(node);
  const bindings = activeBindingsOf(node, nodes);
  const bound = (end: 'start' | 'end') => bindings.find((b) => b.end === end);
  let best: { s: Candidate; d: number[]; far: number; near: number } | null = null;
  for (const s of states) {
    const d = pts.map((p) => outside(p, s.outline.hull));
    const reach = reachOfSymbol(s);
    const [d0, d1] = [d[0], d[d.length - 1]];
    const tied = [bound('start'), bound('end')].every((b) => !!b && (s.ids.includes(b.nodeId) || s.marks.includes(b.nodeId)));
    if (!tied && (d0 > reach || d1 > reach)) continue;
    const far = Math.max(...d);
    const need = Math.max(LOOP_OUT * s.outline.size, LOOP_OUT_PX * scale);
    if (far < need || far < LOOP_STANDS_OUT * Math.max(d0, d1)) continue;
    const near = d0 + d1;
    if (!best || near < best.near) best = { s, d, far, near };
  }
  if (!best) return null;
  const { s, d, far } = best;
  const barbs = { start: loopBarb(pts, d, 'start', far, scale), end: loopBarb(pts, d, 'end', far, scale) };
  const put = (which: 'start' | 'end', p: Point, barb: { tip: Point; wing: number } | null): NotationEnd => {
    const b = bound(which);
    const tied = !!b && (s.ids.includes(b.nodeId) || s.marks.includes(b.nodeId));
    return {
      end: which,
      point: barb ? { x: barb.tip.x, y: barb.tip.y } : { x: p.x, y: p.y },
      symbol: s.id,
      ...(barb ? { head: { kind: 'arrow' as const, filled: false, ids: [node.id], confidence: MAX * (0.75 + 0.25 * ramp(barb.wing / Math.max(1e-9, BARB_PX * scale), 1, 2)) } } : {}),
      ...(tied ? { bound: true } : {}),
      reason: barb
        ? `its own barb at the loop’s ${which}: the pen reaches ${s.id} and folds back out ${Math.round(barb.wing / scale)} px — an open arrow`
        : `a plain ${which}: it lands on ${s.id}`,
    };
  };
  const ends = { start: put('start', pts[0], barbs.start), end: put('end', pts[pts.length - 1], barbs.end) };
  const bulge = Math.min(1, far / Math.max(1e-9, 0.5 * s.outline.size));
  return {
    id: node.id,
    ids: [node.id],
    state: s,
    ends,
    barbs: { start: !!barbs.start, end: !!barbs.end },
    out: far / Math.max(1e-9, s.outline.size),
    confidence: MAX * (0.85 + 0.15 * bulge),
    reason: `a loop out of ${s.id} and back, standing out ${pct(far / Math.max(1e-9, s.outline.size))} of its size`,
    bound: !!(bound('start') && bound('end')),
  };
}

// ===== Ports =====

/**
 * The outline a state's ports are read from: the clean form a lone stroke
 * holds where it stands — drawn clean, or reshaped by a hand (E1) — because
 * the form is where the mark stands and a binding at its border must follow
 * it there (V1-PLAN E2); else the ink's, as the state was read.
 */
function borderOf(c: Candidate, nodes: ReadonlyMap<string, MMNode>): Point[] {
  const n = c.ids.length === 1 ? nodes.get(c.ids[0]) : undefined;
  const form = n && cleanOf(n) ? cleanPointsOf(n) : undefined;
  const o = (form && form.length >= 3 ? outlineOf(form) : null) ?? c.outline;
  return o.hull.map((p) => ({ x: p.x, y: p.y }));
}

function portsFor(c: Candidate, nodes: ReadonlyMap<string, MMNode>): NotationPort[] {
  return [{ name: 'border', along: borderOf(c, nodes), closed: true, reasoning: 'anywhere along the state’s border' }];
}

let reading = 0;

/**
 * What the state notation reads one mark as, on its own, and the ports its
 * symbol offers — the notation's side of E3's hook. A lone closed stroke
 * read as a box offers its border; anything else — a dot, a ring, a
 * transition, writing — offers nothing of its own (a circle's own sites are
 * the mark's). Re-entry answers nothing, so the hook never calls itself.
 */
export function statePortsOf(node: MMNode, nodes: ReadonlyMap<string, MMNode>): { symbol: string; ports: NotationPort[] } | null {
  if (reading > 0) return null;
  reading++;
  try {
    if (getRep(node, 'erased') || getRep(node, 'gesture') || isWord(node) || transcriptOf(node)) return null;
    const fp = fingerprintOf(node);
    if (!fp?.isClosed) return null;
    const c = strokeCandidate(node);
    if (!c || !isBox(c)) return null;
    if (MAX * stateShape(c).score < PORTS_FLOOR) return null;
    return { symbol: 'state', ports: portsFor(c, nodes) };
  } finally {
    reading--;
  }
}

// ===== Reading a scope =====

/**
 * The state diagram a scope makes — the board's content plane when no scope
 * is given — or null when it holds no state, or no transition joining two
 * things. Reads the session and changes nothing in it.
 */
export function readState(state: SessionState, scopeIds?: readonly string[]): StateReading | null {
  const nodes = state.nodes;
  const { scope, marks } = marksOf(state, scopeIds);
  if (!scope.length) return null;

  // 1. What each mark could be: a closed outline, a filled spot, writing, or an open stroke.
  const closed = new Map<string, Candidate>();
  const blobs = new Map<string, Candidate>();
  const compacts = new Map<string, Candidate>();
  const writing = new Set<string>();
  const open: string[] = [];
  for (const m of marks) {
    if (isWord(m.node) || transcriptOf(m.node)) {
      writing.add(m.id);
      continue;
    }
    const blob = blobCandidate(m.node);
    if (blob) blobs.set(m.id, blob);
    const c = strokeCandidate(m.node);
    if (c) closed.set(m.id, c);
    else if (!blob) {
      const k = compactCandidate(m.node);
      if (k) compacts.set(m.id, k);
    }
    if (c || blob) continue;
    if (writingOf(m.node)) writing.add(m.id);
    else if (fingerprintOf(m.node) && !fingerprintOf(m.node)!.isClosed) open.push(m.id);
  }
  const inFigure = new Set<string>();
  const figures: Candidate[] = [];
  for (const f of figuresAmong(nodes, open.filter((id) => mayBeSide(nodes.get(id)!)))) {
    const c = figureCandidate(f, f.id, [...f.ids], scaleOf(nodes.get(f.ids[0])!), `${countWord(f.ids.length)} strokes whose ends meet`);
    if (!c || !isBox(c)) continue;
    figures.push(c);
    f.ids.forEach((id) => inFigure.add(id));
  }

  // 2. How big a state is here: the median of the boxes, else of the circles.
  const boxes = [...closed.values(), ...figures].filter((c) => isBox(c) && !blobs.has(c.id));
  const rounds = [...closed.values()].filter((c) => isRound(c) && !blobs.has(c.id));
  const pool = boxes.length ? boxes : rounds;
  if (!pool.length) return null;
  const ref = median(pool.map((c) => c.outline.size));
  const smallness = (c: Candidate) => 1 - ramp(c.outline.size / ref, SMALL_BESIDE[0], SMALL_BESIDE[1]);

  // 3. The small marks: spots filled solid, and rings — a ring with a mark inside it is a bullseye, a final state.
  const spots = [...blobs.values()].filter((c) => smallness(c) >= 0.5);
  const rings = rounds.filter((c) => !spots.includes(c));
  const insideMarks = [...spots, ...rings];
  const finals: { c: Candidate; inner: Candidate }[] = [];
  // A small ring is a bullseye round any compact mark; one as big as a state only round a spot or a ring — a letter in a circle is a name.
  const markIn = (ring: Candidate) => (smallness(ring) >= 0.5 ? [...insideMarks, ...compacts.values()] : insideMarks);
  const taken = new Set<Candidate>();
  for (const ring of [...rings].sort((a, b) => b.outline.size - a.outline.size)) {
    if (taken.has(ring)) continue;
    const inner = markIn(ring).find((x) => {
      if (x === ring || taken.has(x) || finals.some((f) => f.c === x)) return false;
      const share = x.outline.size / ring.outline.size;
      if (share < INNER_SHARE[0] || share > INNER_SHARE[1]) return false;
      const cx = centreOf(x.outline.bounds), cr = centreOf(ring.outline.bounds);
      return outside(cx, ring.outline.hull) === 0 && Math.hypot(cx.x - cr.x, cx.y - cr.y) <= INNER_CENTRED * ring.outline.size;
    });
    if (!inner) continue;
    taken.add(ring);
    taken.add(inner);
    finals.push({ c: ring, inner });
  }
  const finalCandidates: Candidate[] = finals.map(({ c, inner }) => ({
    ...c,
    ids: [c.id, inner.id],
    marks: [c.id, inner.id],
    lead: `a ring with ${rings.includes(inner) ? 'a second ring' : 'a mark'} inside it`,
  }));
  const lone = [...spots, ...rings].filter((c) => !taken.has(c));
  const hollow = lone.filter((c) => rings.includes(c) && smallness(c) >= 0.5);
  const dots = lone.filter((c) => spots.includes(c));

  // 4. The states: boxes and stadiums, and circles that are not small; a box holding another state is a composite's frame.
  const stateLike = [...boxes, ...rounds.filter((c) => !taken.has(c) && !hollow.includes(c) && !spots.includes(c) && smallness(c) < 0.5)];
  const containers = new Set<Candidate>();
  for (const a of stateLike) for (const b of stateLike) if (a !== b && insideOf(a, b)) containers.add(a);
  const states = stateLike.filter((c) => !containers.has(c));
  const foreign = [...closed.values()].filter((c) => isForeign(c) && !blobs.has(c.id) && !spots.includes(c)).length;
  if (!states.length) return null;

  // 5. Transitions: arrows between what stands; then loops out of a state and back.
  const pending = [...dots, ...hollow];
  const symbols = [...states, ...finalCandidates, ...pending];
  const symbolOfMark = new Map<string, Candidate>();
  for (const c of symbols) for (const id of [...c.ids, ...c.marks]) symbolOfMark.set(id, c);
  const joined = joinSymbols(state, { open: open.filter((id) => !inFigure.has(id)), symbols, symbolOfMark, kind: 'transition', role: STATE_TABLE.connectors.transition.role as Role });
  const pointers = [...joined.pointers];
  const transitions: StateTransition[] = [];
  for (const k of joined.connectors) {
    if (k.directed) transitions.push({ ...k, self: false });
    else pointers.push(k.id);
  }

  const loops: Loop[] = [];
  const asLoops = [...joined.loose, ...[...writing].filter((id) => !isWord(nodes.get(id)!) && !transcriptOf(nodes.get(id)!) && !!fingerprintOf(nodes.get(id)!) && !fingerprintOf(nodes.get(id)!)!.isClosed)];
  for (const id of asLoops) {
    const l = loopOf(nodes.get(id)!, states, nodes);
    if (l && (l.barbs.start || l.barbs.end)) loops.push(l);
  }
  const loopIds = new Set(loops.map((l) => l.id));
  for (const l of loops) {
    const both = l.barbs.start && l.barbs.end;
    const words = ownWordsOf(nodes, [l.id]);
    transitions.push({
      id: l.id,
      ids: [...l.ids],
      kind: 'transition',
      role: STATE_TABLE.connectors.transition.role as Role,
      direction: both ? 'both' : 'forward',
      directed: true,
      from: l.state.id,
      to: l.state.id,
      ends: { from: l.barbs.end && !both ? l.ends.start : l.ends.start, to: l.barbs.end ? l.ends.end : l.ends.start },
      confidence: l.confidence,
      reason: l.reason,
      labels: [],
      self: true,
      ...(words ? { text: words } : {}),
    });
    loopIds.add(l.id);
  }

  // 6. Initial and final: a dot a transition leaves, a ring one arrives at.
  const outsOf = (c: Candidate) => transitions.filter((k) => k.from === c.id && k.to !== c.id).length;
  const insOf = (c: Candidate) => transitions.filter((k) => k.to === c.id && k.from !== c.id).length;
  const placedSymbols: { c: Candidate; symbol: SymbolName; sure: number; why: string; score: number }[] = [];
  for (const c of states) placedSymbols.push({ c, symbol: 'state', sure: 1, why: '', score: 0 });
  for (const c of finalCandidates) {
    const [outs, ins] = [outsOf(c), insOf(c)];
    if (!outs && !ins) continue;
    placedSymbols.push({ c, symbol: 'final', sure: ins && !outs ? 1 : 0.5, why: `${c.lead}, ${ins ? `${countWord(ins)} transition${ins === 1 ? '' : 's'} arrive${ins === 1 ? 's' : ''} at it` : 'a transition leaves it'}`, score: 1 });
  }
  for (const c of dots) {
    const [outs, ins] = [outsOf(c), insOf(c)];
    if (!outs && !ins) continue;
    const initial = outs >= ins;
    placedSymbols.push({ c, symbol: initial ? 'initial' : 'final', sure: outs && !ins ? 1 : ins && !outs ? 0.6 : 0.5, why: `${c.shapes[0].why} — ${initial ? `${countWord(outs)} transition${outs === 1 ? '' : 's'} leave${outs === 1 ? 's' : ''} it` : `${countWord(ins)} transition${ins === 1 ? '' : 's'} arrive${ins === 1 ? 's' : ''} at it`}`, score: c.shapes[0].score });
  }
  for (const c of hollow) {
    const [outs, ins] = [outsOf(c), insOf(c)];
    if (!outs && !ins) continue;
    const initial = outs >= ins;
    placedSymbols.push({ c, symbol: initial ? 'initial' : 'final', sure: 0.5 * (outs && ins ? 0.6 : 1), why: `${c.shapes[0].why}, hollow — ${initial ? 'a transition leaves it' : 'a transition arrives at it'}`, score: c.shapes[0].score });
  }
  const isPlaced = new Set(placedSymbols.map((p) => p.c));
  // A transition that landed on a small mark no reading kept joins nothing after all.
  for (let i = transitions.length - 1; i >= 0; i--) {
    const k = transitions[i];
    const ends = [k.from, k.to];
    if (ends.every((id) => placedSymbols.some((p) => p.c.id === id))) continue;
    pointers.push(k.id);
    transitions.splice(i, 1);
  }
  if (!transitions.length) return null;

  const rounded = new Map<Candidate, number>();
  const out: StateSymbol[] = placedSymbols.map((p) => {
    const c = p.c;
    const words = ownWordsOf(nodes, [c.id, ...c.ids]);
    if (p.symbol === 'state') {
      const b = stateShape(c);
      const round = isBox(c) ? 1 - ramp(c.outline.four, ROUNDED_BY[0], ROUNDED_BY[1]) : 0;
      rounded.set(c, round);
      const confidence = MAX * (isBox(c) ? b.score : 0.6 * (c.shapes[0]?.score ?? 0)) * c.fit;
      const reason = isBox(c) ? `${c.lead ? `${c.lead}: ` : ''}${b.why}${round > 0.3 && !b.why.startsWith('a round') ? ` — round-cornered (its best four corners hold ${pct(c.outline.four)})` : ''}` : `a circle standing as a state, ${c.outline.aspect.toFixed(1)}:1 and not small beside the others`;
      return { ...symbolOf(c, 'state', STATE_TABLE.symbols.state.role as Role, confidence, reason, portsFor(c, nodes), words), symbol: 'state', rounded: round } as StateSymbol;
    }
    const role = STATE_TABLE.symbols[p.symbol].role as Role;
    const confidence = MAX * Math.min(1, p.score || 1) * p.sure * (p.symbol === 'final' && finalCandidates.includes(c) ? 1 : smallness(c));
    return { ...symbolOf(c, p.symbol, role, confidence, p.why, [], words), symbol: p.symbol } as StateSymbol;
  });

  // 7. Labels: writing inside a state names it; beside a transition it is the event.
  const owned = new Set<string>();
  for (const s of out) for (const id of s.ids) owned.add(id);
  for (const c of pending) if (!isPlaced.has(c)) for (const id of c.ids) if (writingOf(nodes.get(id)!)) writing.add(id);
  const labels = labelWriting(nodes, {
    marks,
    writing: new Set([...writing].filter((id) => !loopIds.has(id))),
    symbols: out,
    connectors: transitions,
    owned,
    role: STATE_TABLE.label.role as Role,
  });

  // 8. Roles: what every mark in the scope plays — one of the six.
  const edgeMarks = joined.edgeMarks;
  const { roles, weight, unplaced } = rolesOf(
    scope,
    (put) => {
      for (const s of out) for (const id of [...s.ids, ...symbolOfMarkIds(symbolOfMark, s.id)]) put(id, s.role, 1);
      for (const k of transitions) for (const id of k.ids) put(id, k.role, 1);
      for (const l of labels) put(l.id, l.role, l.where === 'alone' ? 0.5 : 1);
      for (const id of pointers) put(id, 'annotation', 0.5);
      for (const c of containers) for (const id of c.marks) put(id, 'container', 0.5);
    },
    edgeMarks
  );

  // 9. Is it a state diagram, and how surely.
  const stateOnes = out.filter((s) => s.symbol === 'state');
  if (!stateOnes.length) return null;
  const joinedIds = new Set(transitions.flatMap((k) => [k.from, k.to]));
  const connected = out.filter((s) => joinedIds.has(s.id)).length / out.length;
  const coverage = scope.reduce((a, id) => a + (weight[id] ?? 0), 0) / scope.length;
  const symbolSure = mean(out.filter((s) => s.symbol === 'state').map((s) => s.confidence)) / MAX;
  const flowSure = mean(transitions.map((k) => k.confidence)) / MAX;
  const pointing = transitions.filter((k) => k.directed).length / transitions.length;
  const evidence: { what: string; weight: number }[] = [];
  const initials = out.filter((s) => s.symbol === 'initial'), finalsRead = out.filter((s) => s.symbol === 'final');
  const filledInitial = initials.filter((s) => dots.some((c) => c.id === s.id));
  if (filledInitial.length) evidence.push({ what: 'an initial dot scribbled solid', weight: EVIDENCE.initial * Math.min(...filledInitial.map((s) => s.confidence / MAX)) });
  const bullseyes = finalsRead.filter((s) => finalCandidates.some((c) => c.id === s.id));
  if (bullseyes.length) evidence.push({ what: 'a final ring with a mark inside it', weight: EVIDENCE.final * Math.min(...bullseyes.map((s) => s.confidence / MAX)) });
  const selfOnes = transitions.filter((k) => k.self);
  if (selfOnes.length) evidence.push({ what: 'a loop out of a state and back', weight: EVIDENCE.loop * Math.min(...selfOnes.map((k) => k.confidence / MAX)) });
  const roundShare = mean(stateOnes.map((s) => s.rounded ?? 0));
  if (roundShare > 0.05) evidence.push({ what: 'round-cornered states', weight: EVIDENCE.rounded * roundShare });
  const settled = 1 - evidence.reduce((p, e) => p * (1 - e.weight), 1);
  const against = foreign ? FOREIGN_PENALTY * Math.min(1, foreign / (foreign + stateOnes.length)) : 0;
  const confidence = MAX * Math.sqrt(connected * coverage) * Math.sqrt(symbolSure * flowSure) * (0.6 + 0.4 * pointing) * (PLAIN_SHARE + (1 - PLAIN_SHARE) * settled) * (1 - against);
  if (!(confidence > 0)) return null;

  const counts: Record<string, number> = {};
  for (const name of SYMBOLS) counts[name] = out.filter((s) => s.symbol === name).length;
  counts.transition = transitions.length;
  counts.label = labels.filter((l) => l.where !== 'alone').length;
  const parts = SYMBOLS.filter((name) => counts[name]).map((name) => `${countWord(counts[name])} ${counts[name] === 1 ? STATE_TABLE.symbols[name].one : STATE_TABLE.symbols[name].many}`);
  parts.push(`${countWord(transitions.length)} ${transitions.length === 1 ? 'transition' : 'transitions'}${selfOnes.length ? ` (${countWord(selfOnes.length)} a loop)` : ''}`);
  const summary = parts.join(', ');
  const reason = [
    connected === 1 ? 'every symbol joined' : `${countWord(out.filter((s) => joinedIds.has(s.id)).length)} of ${countWord(out.length)} symbols joined`,
    evidence.length ? `read as a state diagram, not a flowchart, for ${evidence.map((e) => e.what).join(', ')}` : 'boxes and arrows with nothing only a state diagram has — a flowchart’s reading is likelier',
    foreign ? `${countWord(foreign)} ${foreign === 1 ? 'symbol' : 'symbols'} only a flowchart has (a decision or a data symbol)` : '',
    unplaced.length ? `${countWord(unplaced.length)} mark${unplaced.length === 1 ? '' : 's'} it places nowhere` : '',
  ].filter(Boolean).join(', ');

  // In the scope's own order.
  const order = new Map(scope.map((id, i) => [id, i]));
  const firstOf = (ids: readonly string[]) => Math.min(...ids.map((id) => order.get(id) ?? Infinity));
  out.sort((p, q) => firstOf([p.id, ...p.ids]) - firstOf([q.id, ...q.ids]));
  labels.sort((p, q) => (order.get(p.id) ?? 0) - (order.get(q.id) ?? 0));
  transitions.sort((p, q) => (order.get(p.id) ?? 0) - (order.get(q.id) ?? 0));

  return {
    notation: 'state',
    name: STATE_TABLE.name,
    confidence,
    summary,
    reason: `${summary} — ${reason}`,
    symbols: out,
    connectors: transitions,
    labels,
    roles,
    unplaced,
    counts,
    evidence: evidence.map((e) => ({ what: e.what, weight: e.weight })),
    foreign,
  };
}

/** Every mark a symbol is drawn with, by the map the reading built. */
function symbolOfMarkIds(map: ReadonlyMap<string, Candidate>, id: string): string[] {
  const out: string[] = [];
  for (const [mark, c] of map) if (c.id === id) out.push(mark);
  return out;
}

/** The words a hand put on these marks' own ink, each different word once. */
function ownWordsOf(nodes: ReadonlyMap<string, MMNode>, ids: readonly string[]): string | undefined {
  const words: string[] = [];
  for (const id of [...new Set(ids)].sort()) {
    const n = nodes.get(id);
    const t = n && (getRep(n, 'label')?.data as { text?: string } | undefined)?.text?.trim();
    if (t && !words.includes(t)) words.push(t);
  }
  return words.length ? words.join(' ') : undefined;
}

// ===== The notation =====

export const STATE: Notation = {
  id: 'state',
  name: STATE_TABLE.name,
  describes: STATE_TABLE.describes,
  symbols: SYMBOLS.map((name) => ({
    name,
    role: STATE_TABLE.symbols[name].role as Role,
    describes: STATE_TABLE.symbols[name].describes,
    ports: STATE_TABLE.symbols[name].ports,
  })),
  connectors: [{ name: 'transition', role: STATE_TABLE.connectors.transition.role as Role, describes: STATE_TABLE.connectors.transition.describes }],
  read: (state, scopeIds) => readState(state, scopeIds),
  ports: { notation: 'state', portsOf: statePortsOf } satisfies NotationPorts,
};

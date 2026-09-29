// What the graph notations share (V1-PLAN §3, §9 D5's state half and D6).
//
// The state diagram, the ER diagram and the mind map are each a set of
// symbols joined by connectors, and what joins them is read the same way the
// flowchart reads a flow (flowchart.ts): every open stroke that is not a side
// of a figure, its heads read (diagram/heads.ts), each end resolved PAST its
// head to the symbol it lands on — a magnet's bind first, else the nearest
// symbol within reach — and a direction from what points. Each notation
// decides what its symbols are, what its connectors are called and how sure
// it is; this is only the joining, the words a writer says a reading's
// writing with, and the small measures they share. Nothing here enters the
// log, and nothing here knows a symbol's name.

import type { Bounds, Point } from '../types';
import type { SessionState } from '../session/session';
import type { MMNode } from '../session/nodes';
import { boundsOf, fingerprintOf, getRep, isWord, resemblances, strokePointsOf, transcriptOf } from '../session/nodes';
import { activeBindingsOf } from '../session/magnets';
import type { ConnectorHeads } from '../diagram/heads';
import { headsOf } from '../diagram/heads';
import type { Role } from '../diagram/roles';
import { MAX_TIER0_CONFIDENCE } from '../recognition';
import type { NotationConnector, NotationLabel, NotationReading, NotationSymbol } from './notation';
import type { MermaidOptions } from './mermaid';
import { UNREAD_WRITING, inReadingOrder, naturalCompare } from './mermaid';
import type { Candidate } from './flowchart';
import { an, boundsOfPoints, boxGap, boxPoints, centreOf, endOf, isWriting, offBox, ownWords, reachOfSymbol, scaleOf } from './flowchart';
import { distToPath, outside } from './shape';
import { magnetRadius } from '../session/magnets';

const MAX = MAX_TIER0_CONFIDENCE;

export { centreOf, offBox, boxGap, boundsOfPoints, ownWords, an, scaleOf };

/** The marks of a scope that a notation may read: on the board, not erased, not a gesture, not an artifact. */
export function marksOf(state: SessionState, scopeIds?: readonly string[]): { scope: string[]; marks: { id: string; node: MMNode }[] } {
  const nodes = state.nodes;
  const artifacts = new Set(state.artifacts);
  const scope = (scopeIds ? [...new Set(scopeIds)] : state.contentIds.filter((id) => !artifacts.has(id))).filter((id) => {
    const n = nodes.get(id);
    return !!n && !artifacts.has(id) && !getRep(n, 'erased') && !getRep(n, 'gesture');
  });
  return { scope, marks: scope.map((id) => ({ id, node: nodes.get(id)! })) };
}

/** Writing: a word, a mark somebody has read, or a stroke the shape rung reads as text. */
export const writingOf = (node: MMNode): boolean => isWriting(node);

/** The median of a list, or 0. */
export function median(xs: readonly number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
}

/** The mean of a list, or 0. */
export const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : 0);

/** A stroke's ink where it stands now, in canvas units. */
export const inkOf = (n: MMNode): Point[] => strokePointsOf(n) ?? [];

/** How long a path is. */
export function pathLength(pts: readonly Point[]): number {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return s;
}

// ===== Connectors =====

export interface ConnectorsIn {
  /** The open strokes to read as connectors (never a side of a figure). */
  open: readonly string[];
  /** The symbols a connector's end may land on. */
  symbols: readonly Candidate[];
  /** Every mark a symbol is drawn with (strokes and marks) → the symbol. */
  symbolOfMark: ReadonlyMap<string, Candidate>;
  /** The connector's kind, and the role it plays. */
  kind: string;
  role: Role;
  /** Smallest share of a chart's median a symbol may be, sitting at a connector's end on its axis, before it is that connector's head — as flowchart's HEAD_SHARE; 0 asks nothing. */
  headShare?: number;
  median?: number;
}

export interface Joined {
  connectors: NotationConnector[];
  /** Open strokes that reach one symbol only — a pointer at something. */
  pointers: string[];
  /** A head drawn apart → its connector. */
  edgeMarks: Map<string, string>;
  /** Every open stroke's heads, by id — for those that read as connectors. */
  heads: Map<string, ConnectorHeads>;
  /** Open strokes joined to nothing the notation has. */
  loose: string[];
}

/**
 * Every open stroke among `open`, read past its heads and joined to the two
 * symbols its ends land on — as the flowchart reads a flow (flowchart.ts
 * step 3). A stroke whose ends land on one symbol, or on none, is not a
 * connector here: it is a pointer (one end) or left `loose` (for a loop, a
 * label or a note to be read by the notation itself).
 */
export function joinSymbols(state: SessionState, inp: ConnectorsIn): Joined {
  const nodes = state.nodes;
  const isSymbol = new Set(inp.symbols);
  const symbols = [...inp.symbols];
  const symbolOfMark = inp.symbolOfMark as Map<string, Candidate>;
  const heads = new Map<string, ConnectorHeads>();
  for (const id of inp.open) {
    const h = headsOf(state, id);
    if (h) heads.set(id, h);
  }
  const connectors: NotationConnector[] = [];
  const pointers: string[] = [];
  const loose: string[] = [];
  const edgeMarks = new Map<string, string>();
  const joined = new Set<string>();
  for (const id of inp.open) {
    const h = heads.get(id);
    if (!h) {
      loose.push(id);
      continue;
    }
    const node = nodes.get(id)!;
    const bindings = activeBindingsOf(node, nodes);
    const ends = [h.start, h.end].map((e) => endOf(e, id, bindings, symbols, isSymbol, symbolOfMark));
    const [a, b] = ends;
    if (!a.symbol || !b.symbol || a.symbol.id === b.symbol.id) {
      if ((a.symbol || b.symbol) && !(a.symbol && b.symbol)) pointers.push(id);
      else loose.push(id);
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
    joined.add(id);
    connectors.push({
      id,
      ids: [id, ...headIds],
      kind: inp.kind,
      role: inp.role,
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
  return { connectors, pointers, edgeMarks, heads, loose };
}

// ===== Labels =====

/** A symbol a label may belong to, as the label pass needs it. */
export interface Labelled {
  id: string;
  symbol: string;
  bounds: Bounds;
  outline: Point[];
  labels: string[];
}

/**
 * Writing: inside a symbol it names the symbol; beside a connector it labels
 * the connector; beside a symbol it is a weaker label of that symbol; else it
 * is a note (flowchart.ts step 5). Fills each symbol's and connector's `labels`.
 */
export function labelWriting(
  nodes: ReadonlyMap<string, MMNode>,
  inp: {
    marks: readonly { id: string; node: MMNode }[];
    writing: ReadonlySet<string>;
    symbols: readonly Labelled[];
    connectors: readonly NotationConnector[];
    /** Marks that belong to a symbol (its strokes) — never labels. */
    owned: ReadonlySet<string>;
    role: Role;
    /** Whether writing inside a symbol may stand for it, else only beside. Default true. */
    inside?: boolean;
  }
): NotationLabel[] {
  const labels: NotationLabel[] = [];
  const paths = new Map(
    inp.connectors.map((k) => {
      const pts = strokePointsOf(nodes.get(k.id)!) ?? [];
      return [k.id, { pts, box: pts.length ? boundsOfPoints(pts) : null }];
    })
  );
  const sized = (b: Bounds) => Math.max(b.maxX - b.minX, b.maxY - b.minY);
  for (const m of inp.marks) {
    if (!inp.writing.has(m.id) || inp.owned.has(m.id)) continue;
    const b = boundsOf(m.node);
    if (!b) continue;
    const c = centreOf(b);
    const size = sized(b);
    const text = transcriptOf(m.node) ?? undefined;
    const own = m.node && (getRep(m.node, 'label')?.data as { text?: string } | undefined)?.text;
    const said = text ?? own;
    const home =
      inp.inside === false
        ? undefined
        : inp.symbols
            .filter((s) => offBox(c, s.bounds) === 0 && outside(c, s.outline) === 0 && sized(s.bounds) > size)
            .sort((p, q) => (p.bounds.maxX - p.bounds.minX) * (p.bounds.maxY - p.bounds.minY) - (q.bounds.maxX - q.bounds.minX) * (q.bounds.maxY - q.bounds.minY))[0];
    const base = { id: m.id, role: inp.role, ...(said ? { text: said } : {}), bounds: { ...b } };
    if (home) {
      labels.push({ ...base, of: home.id, where: 'inside', confidence: MAX * 0.9, reason: `writing inside ${home.symbol} ${home.id}` });
      home.labels.push(m.id);
      continue;
    }
    const scale = scaleOf(m.node);
    const reach = Math.max(2 * magnetRadius(size, scale), size);
    const pts = boxPoints(b);
    const flow = inp.connectors
      .filter((k) => {
        const box = paths.get(k.id)!.box;
        return !!box && boxGap(b, box) <= reach;
      })
      .map((k) => ({ k, d: Math.min(...pts.map((p) => distToPath(p, paths.get(k.id)!.pts))) }))
      .filter((x) => x.d <= reach)
      .sort((p, q) => p.d - q.d)[0];
    if (flow) {
      labels.push({ ...base, of: flow.k.id, where: 'beside', confidence: MAX * (1 - 0.5 * (flow.d / reach)), reason: `writing ${Math.round(flow.d)} from ${flow.k.kind} ${flow.k.id}, within its own size` });
      (flow.k.labels as string[]).push(m.id);
      continue;
    }
    const by = inp.symbols
      .filter((s) => boxGap(b, s.bounds) <= reach)
      .map((s) => ({ s, d: Math.min(...pts.map((p) => outside(p, s.outline))) }))
      .filter((x) => x.d <= reach)
      .sort((p, q) => p.d - q.d)[0];
    if (by) {
      labels.push({ ...base, of: by.s.id, where: 'beside', confidence: MAX * 0.6 * (1 - 0.5 * (by.d / reach)), reason: `writing ${Math.round(by.d)} from ${by.s.symbol} ${by.s.id}` });
      by.s.labels.push(m.id);
      continue;
    }
    labels.push({ ...base, where: 'alone', role: 'annotation', confidence: MAX * 0.5, reason: 'writing beside nothing in the diagram — a note' });
  }
  return labels;
}

// ===== Roles =====

/** What every mark in the scope plays, and the ones no symbol took: each mark once, one of the six. */
export function rolesOf(
  scope: readonly string[],
  give: (put: (id: string, role: Role, w: number) => void) => void,
  edgeMarks: ReadonlyMap<string, string>
): { roles: Record<string, Role>; weight: Record<string, number>; unplaced: string[] } {
  const roles: Record<string, Role> = {};
  const weight: Record<string, number> = {};
  const put = (id: string, role: Role, w: number) => {
    if (roles[id]) return;
    roles[id] = role;
    weight[id] = w;
  };
  give(put);
  const unplaced: string[] = [];
  for (const id of scope) {
    if (roles[id]) continue;
    if (edgeMarks.has(id)) put(id, 'edge', 1);
    else {
      put(id, 'unclassified', 0);
      unplaced.push(id);
    }
  }
  for (const id of Object.keys(roles)) if (!scope.includes(id)) delete roles[id];
  return { roles, weight, unplaced };
}

// ===== Words, for a writer =====

const COUNT = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
export const countWord = (n: number) => COUNT[n] ?? String(n);
export const listWords = (xs: readonly string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
export const someWords = (xs: readonly string[], max = 4) => (xs.length > max ? `${xs.slice(0, max).join(', ')} and ${countWord(xs.length - max)} more` : listWords(xs));

/**
 * What a reading's writing says, for a writer: the words a hand put on the
 * symbol's own ink, then the writing inside it, then beside it, each in
 * reading order — the placeholder for writing nobody has read, once for a
 * run of it, and each such piece kept for the notes.
 */
export function wordsFor(reading: NotationReading, opts: MermaidOptions) {
  const labels = new Map(reading.labels.map((l) => [l.id, l]));
  const unread: { where: string; ids: string[] }[] = [];
  const unreadIds = new Set<string>();
  const wordsOf = (own: string | undefined, labelIds: readonly string[], owner: string, where: string): string | null => {
    const mine = [...new Set([...labelIds, ...reading.labels.filter((l) => l.of === owner).map((l) => l.id)])].map(
      (id): NotationLabel => labels.get(id) ?? { id, of: owner, where: 'beside', role: 'label', confidence: 0, reason: 'writing' }
    );
    const inOrder = (at: NotationLabel['where']) => inReadingOrder(mine.filter((l) => l.where === at), (l) => l.bounds, (l) => l.id);
    const parts: string[] = own?.trim() ? [own.trim()] : [];
    const missing: string[] = [];
    for (const l of [...inOrder('inside'), ...inOrder('beside')]) {
      const text = l.text?.trim();
      if (text) parts.push(text);
      else if (opts.readWith?.(l.id)) continue;
      else {
        missing.push(l.id);
        if (parts[parts.length - 1] !== UNREAD_WRITING) parts.push(UNREAD_WRITING);
      }
    }
    if (missing.length) {
      unread.push({ where, ids: missing });
      missing.forEach((id) => unreadIds.add(id));
    }
    return parts.length ? parts.join(' ') : null;
  };
  return { wordsOf, unread, unreadIds };
}

/** The notes every graph writer ends with: unread writing, what has no writing, writing that labels nothing, marks left out. */
export function notesFor(
  reading: NotationReading,
  said: ReadonlySet<string>,
  unread: readonly { where: string; ids: string[] }[],
  blank: { what: string; plural: string; ids: readonly string[] },
  extra: readonly string[] = []
): string[] {
  const notes: string[] = [];
  if (unread.length) {
    const n = unread.reduce((k, u) => k + u.ids.length, 0);
    notes.push(`${n === 1 ? 'one piece of writing has' : `${countWord(n)} pieces of writing have`} not been read, so ${n === 1 ? 'its words are' : 'their words are'} not known — written "${UNREAD_WRITING}": ${someWords(unread.map((u) => u.where), 6)}`);
  }
  if (blank.ids.length) notes.push(`${blank.ids.length === 1 ? `one ${blank.what} has` : `${countWord(blank.ids.length)} ${blank.plural} have`} no writing ${blank.ids.length === 1 ? 'and is' : 'and are'} written blank: ${someWords(blank.ids, 6)}`);
  const alone = reading.labels.filter((l) => !said.has(l.id)).map((l) => l.id).sort(naturalCompare);
  if (alone.length) notes.push(`writing that labels nothing in the diagram is left out: ${someWords(alone, 6)}`);
  const left = Object.keys(reading.roles).filter((id) => !said.has(id) && !alone.includes(id)).sort(naturalCompare);
  if (left.length) notes.push(`${left.length === 1 ? 'one mark' : `${countWord(left.length)} marks`} the diagram has no place for ${left.length === 1 ? 'is' : 'are'} left out: ${someWords(left.map((id) => `${id} (${reading.roles[id]})`), 8)}`);
  notes.push(...extra);
  return notes;
}

/** Symbol-shaped things a notation builds from candidates. */
export function symbolOf(c: Candidate, symbol: string, role: Role, confidence: number, reason: string, ports: NotationSymbol['ports'], words: string | undefined, readings?: NotationSymbol['readings']): NotationSymbol {
  return {
    id: c.id,
    ids: [...c.ids],
    symbol,
    role,
    confidence,
    reason,
    readings: readings ?? [{ symbol, role, confidence, reason }],
    outline: c.outline.hull.map((p) => ({ x: p.x, y: p.y })),
    bounds: { ...c.outline.bounds },
    ports,
    labels: [],
    ...(words ? { text: words } : {}),
  };
}

export { fingerprintOf, isWord, resemblances, reachOfSymbol };

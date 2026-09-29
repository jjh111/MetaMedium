// The ER notation (V1-PLAN §3, §9 D6).
//
// An entity–relationship diagram, read from ink:
//
//   - **entity** — a box with its name written in it: one closed stroke the
//     shape rung reads as a box (or strokes ruled into one, diagram/figures.ts),
//     the name the writing inside it. A box with a line across it holds
//     compartments — a class's — and is no entity; a box holding another box is
//     a frame and is left out.
//   - **relationship** — a plain line from one entity to another, no head, the
//     verb written beside its middle. Its ends are read past any head
//     (diagram/heads.ts), a magnet's bind first (graph-kit.ts, as the flowchart
//     reads a flow). A relationship has no direction: it stands from the entity
//     that comes first in reading order, the left one, else the upper.
//   - **multiplicity** — short writing near a relationship's end: "1", "*",
//     "0..1", "1..*". Where it has been read it says how many, said as one of
//     four cardinalities — one, zero or one, zero or more, one or more —
//     the crow's-foot tokens of Mermaid. A crow's foot drawn as ink is not
//     read: the writing is what says how many.
//
// **What it is not.** An ER diagram is boxes and lines, which is also what a
// class diagram and a flowchart are, so the trap is to read them all as one.
// What makes it an ER diagram is what they lack: lines with no head at all,
// joining boxes with nothing in them but a name, with a multiplicity at their
// ends and a verb beside them. The reading's confidence is its structure —
// every entity joined, every relationship a line — scaled by that evidence,
// and against it counts a box with compartments (a class), a connector with a
// head (a flow, a UML relation) and a symbol only a flowchart has. Arrows are
// the flowchart's and never reach the costly part of the reading. Read from the
// geometry, never the relation or role tables (the trap): they call a
// multiplicity beside a line's end its head.
//
// Every symbol plays one of the six roles and adds none: an entity a node, a
// relationship an edge, writing a label. Derived, like every notation: nothing
// enters the log. Its content — names, roles, ports, the Mermaid of each
// symbol and of each cardinality — is the table below, its single home; the
// er@1 pack (packs/shipped/er.ts) names this notation and restates none of it.
// The graph notations' joining and words are graph-kit.ts.

import type { Bounds } from '../types';
import type { SessionState } from '../session/session';
import type { MMNode } from '../session/nodes';
import { boundsOf, fingerprintOf, getRep, isWord, labelOf, resemblances, strokePointsOf, transcriptOf } from '../session/nodes';
import type { NotationPort, NotationPorts } from '../session/ports';
import { isLetterLike } from '../session/words';
import { figuresAmong } from '../diagram/figures';
import type { Role } from '../diagram/roles';
import { MAX_TIER0_CONFIDENCE } from '../recognition';
import type { Notation, NotationConnector, NotationLabel, NotationReading, NotationSymbol } from './notation';
import type { Candidate } from './flowchart';
import { figureCandidate, mayBeSide, strokeCandidate } from './flowchart';
import { centreOf, countWord, joinSymbols, joinsTwo, labelWriting, lineAcross, marksOf, mean, ownWords, rolesOf, symbolOf, writingOf } from './graph-kit';
import { insideOf, isBox, portsFor, stateShape } from './state';

// ===== The table — the ER diagram's content =====

/**
 * The ER diagram's content: its symbol, its connector, the writing it reads,
 * each with the role it plays, where it takes a connector, and how it is said
 * in Mermaid (the writer writes with these), and the four cardinalities with
 * the words a hand writes for each and the crow's-foot token each is. Content,
 * not code, and this is its single home: the `er@1` pack names the notation
 * and restates none of it (V1-PLAN §2.3, B3); the rest of this file is what a
 * signature cannot see.
 */
export const ER_TABLE = {
  pack: 'er@1',
  notation: 'er',
  name: 'ER diagram',
  describes: 'entities, the relationships between them, the multiplicity at each end of each',
  symbols: {
    entity: { role: 'node', describes: 'a box with its name written in it', ports: 'its border, anywhere along it', one: 'entity', many: 'entities', mermaid: { declare: 'alias' } },
  },
  connectors: {
    relationship: { role: 'edge', describes: 'a plain line from one entity to another, its verb beside its middle', one: 'relationship', many: 'relationships', mermaid: { line: '--', label: ' : ' } },
  },
  labels: {
    name: { role: 'label', describes: 'writing inside an entity: its name', one: 'name', many: 'names' },
    multiplicity: { role: 'label', describes: 'short writing near a relationship’s end: “1”, “*”, “0..1”, “1..*”', one: 'multiplicity', many: 'multiplicities' },
    verb: { role: 'label', describes: 'writing beside the middle of a relationship: its verb', one: 'verb', many: 'verbs' },
  },
  /** How many, said four ways; `left` is the token on a line's left side, `right` on its right (Mermaid's). */
  cardinalities: {
    one: { says: 'exactly one', left: '||', right: '||', written: '1' },
    'zero-one': { says: 'zero or one', left: '|o', right: 'o|', written: '0..1' },
    'zero-many': { says: 'zero or more', left: '}o', right: 'o{', written: '*' },
    'one-many': { says: 'one or more', left: '}|', right: '|{', written: '1..*' },
  },
  /** What is written where nothing says how many: the least a line claims. */
  unsaid: 'zero-many',
  mermaid: { header: 'erDiagram', direction: 'TB' },
} as const;

export type Cardinality = keyof typeof ER_TABLE.cardinalities;
const CARDINALITIES = Object.keys(ER_TABLE.cardinalities) as Cardinality[];

/**
 * How many a piece of writing says, or null where it says nothing of the four:
 * the digits and stars a hand writes, the words for them, and Mermaid's own
 * tokens. The pieces of one end are read together (`1` `..` `*`).
 */
export function cardinalityOf(text: string | undefined): Cardinality | null {
  if (!text) return null;
  const t = text
    .toLowerCase()
    .replace(/[\s_]+/g, '')
    .replace(/[–—‒−]/g, '-')
    .replace(/…/g, '..')
    .replace(/(?<=\d)(?:to|-|,)(?=[\d*nm])/g, '..')
    .replace(/[×✱✳∗＊]/g, '*');
  const many = /^(\*|n|m|many|\+)$/;
  const lo = /^(\d+|zero|one)\.\.(\*|n|m|many|\d+)$/.exec(t);
  if (/^(1|one|exactlyone|onlyone|\|\|)$/.test(t) || t === '1..1') return 'one';
  if (/^(0\.\.1|zeroorone|oneorzero|optional|o\||\|o|zero-one|zeroone)$/.test(t)) return 'zero-one';
  if (many.test(t) || /^(0\.\.(\*|n|m|many)|0\+|zeroormore|zeroormany|manyzero|o\{|\}o|zero-many|zeromany)$/.test(t)) return 'zero-many';
  if (/^(1\.\.(\*|n|m|many)|1\+|oneormore|oneormany|manyone|\|\{|\}\||one-many|onemany)$/.test(t)) return 'one-many';
  if (lo && (lo[1] === '0' || lo[1] === 'zero') && many.test(lo[2])) return 'zero-many';
  if (lo && (lo[1] === '1' || lo[1] === 'one') && many.test(lo[2])) return 'one-many';
  return null;
}

// ===== Thresholds — this notation's own; the hand's are cited =====

/** Writing near a relationship's end is a multiplicity when its centre lies within this share of the line's length of the end… */
export const END_SHARE = 0.32;
/** …and is no longer than this share of the line; longer is a verb. */
export const MULTIPLICITY_SHARE = 0.3;
/** Read writing that says how many is a multiplicity wherever it stands but the middle third of its line. */
export const MIDDLE_SHARE = 0.34;
/** A mark this small in the hand's space (screen pixels, longest side) is writing, however the shape rung read it. */
export const LETTER_PX = 40;
/** A per-mark reading below this offers no ports: the pen should not feel a guess. */
export const PORTS_FLOOR = 0.4;

/**
 * What each kind of evidence for an ER diagram — a thing neither a class
 * diagram nor a flowchart has — is worth to the reading's confidence, as the
 * chance it alone settles it, at every end (or every relationship) it holds
 * for; the two together settle it as independent chances do.
 */
export const EVIDENCE = { multiplicity: 0.7, verb: 0.25 } as const;
/** With no evidence at all, boxes joined by plain lines are this share as sure an ER diagram as their structure makes them; evidence carries the rest. */
export const PLAIN_SHARE = 0.2;
/** A board of boxes with compartments — a class diagram's — is at most this much less an ER diagram. */
export const CLASSLIKE_PENALTY = 0.8;
/** A board whose connectors carry heads (flows, UML relations) is at most this much less an ER diagram, per share that do. */
export const HEADED_PENALTY = 0.75;

const MAX = MAX_TIER0_CONFIDENCE;

// ===== The reading's own shapes =====

/** What a piece of writing at an entity or a line's end says: its words, the marks, and which were not read. */
export interface ErWriting {
  text?: string;
  ids: string[];
  unread: string[];
}

/** An entity, as the notation reads it. */
export interface ErEntity extends NotationSymbol {
  symbol: 'entity';
  /** The name: what a hand labelled the box with and the writing inside it. */
  name: ErWriting;
}

/** One end of a relationship. */
export interface ErEnd {
  /** The entity it lands on. */
  entity: string;
  /** The writing near this end, when there is any. */
  multiplicity?: ErWriting;
  /** How many that writing says, when it has been read and says one of the four. */
  cardinality: Cardinality | null;
}

/** A relationship between two entities. */
export interface ErRelationship extends NotationConnector {
  sides: { from: ErEnd; to: ErEnd };
  /** The verb: writing beside the middle, and a word put on the line's own ink. */
  verb?: ErWriting;
}

/** What a scope is as an ER diagram. */
export interface ErReading extends NotationReading {
  symbols: ErEntity[];
  connectors: ErRelationship[];
  /** What made it an ER diagram rather than boxes and lines, each with how much it counted, and what counted against it. */
  evidence: { what: string; weight: number }[];
  /** Boxes with compartments — a class's — and connectors with heads, counted against it. */
  classLike: number;
  headed: number;
}

// ===== The E3 hook: one mark, and the ports its entity offers =====

let reading = 0;

/**
 * What the ER notation reads one mark as, on its own, and the ports its
 * symbol offers — the notation's side of E3's hook. A lone closed stroke read
 * as a box offers its border; anything else offers nothing. Re-entry answers
 * nothing, so the hook never calls itself.
 */
export function erPortsOf(node: MMNode, nodes: ReadonlyMap<string, MMNode>): { symbol: string; ports: NotationPort[] } | null {
  if (reading > 0) return null;
  reading++;
  try {
    if (getRep(node, 'erased') || getRep(node, 'gesture') || isWord(node) || transcriptOf(node)) return null;
    const fp = fingerprintOf(node);
    if (!fp?.isClosed) return null;
    const c = strokeCandidate(node);
    if (!c || !isBox(c)) return null;
    if (MAX * stateShape(c).score < PORTS_FLOOR) return null;
    return { symbol: 'entity', ports: portsFor(c, nodes) };
  } finally {
    reading--;
  }
}

// ===== Reading a scope =====

const sizeOf = (b: Bounds) => Math.max(b.maxX - b.minX, b.maxY - b.minY);

/** What a piece of writing says, when anybody has read it or a hand labelled its own ink. */
function wordsOfMark(node: MMNode): string | undefined {
  const t = (transcriptOf(node) ?? labelOf(node)?.text)?.trim();
  return t ? t : undefined;
}

/** A line of writing's words: its pieces' in order, none read → no text. */
function writingOf2(nodes: ReadonlyMap<string, MMNode>, ids: readonly string[], joiner: string, own?: string): ErWriting {
  const parts: string[] = own?.trim() ? [own.trim()] : [];
  const unread: string[] = [];
  for (const id of ids) {
    const t = wordsOfMark(nodes.get(id)!);
    if (t) parts.push(t);
    else unread.push(id);
  }
  const anyRead = parts.length > 0;
  return { ...(anyRead ? { text: parts.join(joiner) } : {}), ids: [...ids], unread };
}

/**
 * The ER diagram a scope makes — the board's content plane when no scope is
 * given — or null when it holds no two entities joined by a plain line.
 * Reads the session and changes nothing in it.
 */
export function readEr(state: SessionState, scopeIds?: readonly string[]): ErReading | null {
  const nodes = state.nodes;
  const { scope, marks } = marksOf(state, scopeIds);
  if (scope.length < 3) return null;

  // 1. What each mark could be: a closed outline, writing, or an open stroke.
  const closed = new Map<string, Candidate>();
  const writing = new Set<string>();
  const open: string[] = [];
  const small: string[] = [];
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
    if (writingOf(m.node)) writing.add(m.id);
    else if (tiny(m.id)) small.push(m.id);
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

  // 2. The entities: boxes. A box holding another box is a frame; a box with a line across it holds compartments — a class's.
  const boxes = [...closed.values(), ...figures].filter((c) => isBox(c));
  if (boxes.length < 2) return null;
  const containers = new Set<Candidate>();
  for (const a of boxes) for (const b of boxes) if (a !== b && insideOf(a, b)) containers.add(a);
  const candidates = boxes.filter((c) => !containers.has(c));
  // A stroke as small as a letter that joins two boxes is a relationship between two close ones, not writing.
  for (const id of small) {
    if (joinsTwo(strokePointsOf(nodes.get(id)!) ?? [], candidates)) open.push(id);
    else writing.add(id);
  }
  const lines = open.filter((id) => !inFigure.has(id) && resemblances(nodes.get(id)!)[0]?.to !== 'type:arrow');
  const compartmented = (c: Candidate) => lines.some((id) => lineAcross(c, strokePointsOf(nodes.get(id)!) ?? []));
  const classLike = candidates.filter(compartmented);
  const entities = candidates.filter((c) => !classLike.includes(c));
  if (entities.length < 2) return null;
  // The cheap test before the costly one: the joining reads every stroke's heads, and a board of arrows joins nothing here.
  if (!lines.length) return null;

  // 3. The relationships: every open stroke joining two entities. A head counts against.
  const symbolOfMark = new Map<string, Candidate>();
  for (const c of entities) for (const id of [...c.ids, ...c.marks]) symbolOfMark.set(id, c);
  const joined = joinSymbols(state, { open: open.filter((id) => !inFigure.has(id)), symbols: entities, symbolOfMark, kind: 'relationship', role: ER_TABLE.connectors.relationship.role as Role });
  if (!joined.connectors.length) return null;
  const pointers = [...joined.pointers];
  const byId = new Map(entities.map((c) => [c.id, c]));
  const headed = joined.connectors.filter((k) => k.directed).length;

  // Each relationship stands from the entity first in reading order — no direction of its own.
  const relationships: ErRelationship[] = joined.connectors.map((k) => {
    const a = centreOf(byId.get(k.from)!.outline.bounds), b = centreOf(byId.get(k.to)!.outline.bounds);
    const across = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
    const swap = across ? b.x < a.x : b.y < a.y;
    const [from, to] = swap ? [k.to, k.from] : [k.from, k.to];
    const ends = swap ? { from: k.ends.to, to: k.ends.from } : k.ends;
    return {
      ...k,
      from,
      to,
      ends,
      direction: 'none' as const,
      directed: false,
      reason: `a line joining ${from} and ${to}${k.directed ? `, its head ignored — a relationship has no direction (${k.reason})` : ', no head'}`,
      sides: { from: { entity: from, cardinality: null }, to: { entity: to, cardinality: null } },
    };
  });

  // 4. Entities as symbols; writing: inside an entity its name, beside a line's end its multiplicity, beside its middle its verb.
  const out: ErEntity[] = entities.map((c) => {
    const b = stateShape(c);
    const confidence = MAX * b.score * c.fit;
    const reason = `${c.lead ? `${c.lead}: ` : ''}${b.why}`;
    return { ...symbolOf(c, 'entity', ER_TABLE.symbols.entity.role as Role, confidence, reason, portsFor(c, nodes), ownWords(nodes, [c.id, ...c.ids])), symbol: 'entity', name: { ids: [], unread: [] } } as ErEntity;
  });
  const owned = new Set<string>();
  for (const s of out) for (const id of [...s.ids, ...byId.get(s.id)!.marks]) owned.add(id);
  const labels = labelWriting(nodes, {
    marks,
    writing,
    symbols: out,
    connectors: relationships,
    owned,
    role: ER_TABLE.labels.name.role as Role,
  });

  const reliedOn = new Map(relationships.map((r) => [r.id, r]));
  const labelById = new Map(labels.map((l) => [l.id, l]));
  // Writing beside a relationship: near an end and short, or read words that count, is a candidate multiplicity; the pieces of one end
  // are read together — “0” “..” “1” — and are a multiplicity if none has been read, or together they say one of the four.
  const groups = new Map<string, { r: ErRelationship; at: 'from' | 'to'; ids: string[] }>();
  for (const l of labels) {
    if (l.where !== 'beside' || !l.of || !l.bounds) continue;
    const r = reliedOn.get(l.of);
    if (!r) continue;
    const P = r.ends.from.point, Q = r.ends.to.point;
    const len = Math.max(1e-6, Math.hypot(Q.x - P.x, Q.y - P.y));
    const mid = centreOf(l.bounds);
    const t = ((mid.x - P.x) * (Q.x - P.x) + (mid.y - P.y) * (Q.y - P.y)) / (len * len);
    const middle = t > 0.5 - MIDDLE_SHARE / 2 && t < 0.5 + MIDDLE_SHARE / 2;
    const atEnd = t <= END_SHARE || t >= 1 - END_SHARE;
    const shortEnough = sizeOf(l.bounds) <= MULTIPLICITY_SHARE * len;
    const counts = l.text !== undefined && cardinalityOf(l.text) !== null;
    if (middle || !((atEnd && shortEnough) || counts)) continue;
    const at: 'from' | 'to' = t < 0.5 ? 'from' : 'to';
    const g = groups.get(`${r.id}:${at}`) ?? { r, at, ids: [] };
    g.ids.push(l.id);
    groups.set(`${r.id}:${at}`, g);
  }
  const isMultiplicity = new Set<string>();
  for (const g of groups.values()) {
    const read = g.ids.map((id) => labelById.get(id)!.text).filter((x): x is string => x !== undefined);
    if (read.length && cardinalityOf(read.join('')) === null) continue;
    g.ids.forEach((id) => isMultiplicity.add(id));
    (g.r.sides[g.at].multiplicity ??= { ids: [], unread: [] }).ids.push(...g.ids);
    for (const id of g.ids) labelById.get(id)!.reason += ` — near its end at ${g.r.sides[g.at].entity}: a multiplicity`;
  }
  const kept: NotationLabel[] = [...labels];
  // A multiplicity is not the verb; its pieces in reading order, its words read together.
  const inReading = (ids: string[]) =>
    [...ids].sort((p, q) => {
      const a = labelById.get(p)!.bounds!, b = labelById.get(q)!.bounds!;
      const sameRow = !(a.maxY < b.minY || b.maxY < a.minY);
      return sameRow ? a.minX - b.minX : a.minY - b.minY;
    });
  for (const r of relationships) {
    r.labels = r.labels.filter((id) => !isMultiplicity.has(id));
    for (const at of ['from', 'to'] as const) {
      const side = r.sides[at];
      if (!side.multiplicity) continue;
      const ordered = inReading(side.multiplicity.ids);
      const w = writingOf2(nodes, ordered, '');
      side.multiplicity = w;
      side.cardinality = cardinalityOf(w.text);
    }
    const own = (getRep(nodes.get(r.id)!, 'label')?.data as { text?: string } | undefined)?.text?.trim();
    if (r.labels.length || own) r.verb = writingOf2(nodes, inReading(r.labels), ' ', own);
  }
  for (const s of out) {
    const inside = labels.filter((l) => l.of === s.id && l.where === 'inside').map((l) => l.id);
    s.name = writingOf2(nodes, inside, ' ', s.text);
  }

  // 5. Roles: what every mark in the scope plays — one of the six.
  for (const l of kept) if (isMultiplicity.has(l.id)) l.role = ER_TABLE.labels.multiplicity.role as Role;
  const { roles, weight, unplaced } = rolesOf(
    scope,
    (put) => {
      for (const s of out) for (const id of [...s.ids, ...byId.get(s.id)!.marks]) put(id, s.role, 1);
      for (const k of relationships) for (const id of k.ids) put(id, k.role, 1);
      for (const l of kept) put(l.id, l.role, l.where === 'alone' ? 0.5 : 1);
      for (const id of pointers) put(id, 'annotation', 0.5);
      for (const c of containers) for (const id of c.marks) put(id, 'container', 0.5);
      for (const c of classLike) for (const id of c.marks) put(id, 'container', 0.5);
    },
    joined.edgeMarks
  );

  // 6. Is it an ER diagram, and how surely.
  const joinedIds = new Set(relationships.flatMap((k) => [k.from, k.to]));
  const connected = out.filter((s) => joinedIds.has(s.id)).length / out.length;
  const coverage = scope.reduce((a, id) => a + (weight[id] ?? 0), 0) / scope.length;
  const symbolSure = mean(out.map((s) => s.confidence)) / MAX;
  const relSure = mean(relationships.map((k) => k.confidence)) / MAX;
  const ends = relationships.length * 2;
  const withMult = relationships.reduce((a, r) => a + (r.sides.from.multiplicity ? 1 : 0) + (r.sides.to.multiplicity ? 1 : 0), 0);
  const withVerb = relationships.filter((r) => r.verb).length;
  const evidence: { what: string; weight: number }[] = [];
  if (withMult) evidence.push({ what: `${countWord(withMult)} of ${countWord(ends)} line ends with a multiplicity written at them`, weight: EVIDENCE.multiplicity * (withMult / ends) });
  if (withVerb) evidence.push({ what: `${countWord(withVerb)} of ${countWord(relationships.length)} lines with a verb beside them`, weight: EVIDENCE.verb * (withVerb / relationships.length) });
  const settled = 1 - evidence.reduce((p, e) => p * (1 - e.weight), 1);
  const classShare = classLike.length ? classLike.length / (classLike.length + out.length) : 0;
  const headShare = headed / joined.connectors.length;
  const against = 1 - (1 - CLASSLIKE_PENALTY * classShare) * (1 - HEADED_PENALTY * headShare);
  const confidence = MAX * Math.sqrt(connected * coverage) * Math.sqrt(symbolSure * relSure) * (PLAIN_SHARE + (1 - PLAIN_SHARE) * settled) * (1 - against);
  if (!(confidence > 0)) return null;

  const counts: Record<string, number> = { entity: out.length, relationship: relationships.length };
  counts.multiplicity = withMult;
  counts.verb = withVerb;
  const summary = [
    `${countWord(out.length)} ${out.length === 1 ? 'entity' : 'entities'}`,
    `${countWord(relationships.length)} ${relationships.length === 1 ? 'relationship' : 'relationships'}`,
    ...(withMult ? [`${countWord(withMult)} ${withMult === 1 ? 'multiplicity' : 'multiplicities'}`] : []),
  ].join(', ');
  const reason = [
    connected === 1 ? 'every entity joined' : `${countWord(out.filter((s) => joinedIds.has(s.id)).length)} of ${countWord(out.length)} entities joined`,
    evidence.length ? `read as an ER diagram, not a flowchart or a class diagram, for ${evidence.map((e) => e.what).join(' and ')}` : 'boxes and plain lines with nothing only an ER diagram has — a multiplicity, a verb',
    classLike.length ? `${countWord(classLike.length)} ${classLike.length === 1 ? 'box has' : 'boxes have'} compartments, as a class does` : '',
    headed ? `${countWord(headed)} ${headed === 1 ? 'line has' : 'lines have'} a head, which a relationship has not` : '',
    unplaced.length ? `${countWord(unplaced.length)} mark${unplaced.length === 1 ? '' : 's'} it places nowhere` : '',
  ].filter(Boolean).join(', ');

  // In the scope's own order.
  const order = new Map(scope.map((id, i) => [id, i]));
  const firstOf = (ids: readonly string[]) => Math.min(...ids.map((id) => order.get(id) ?? Infinity));
  out.sort((p, q) => firstOf([p.id, ...p.ids]) - firstOf([q.id, ...q.ids]));
  kept.sort((p, q) => (order.get(p.id) ?? 0) - (order.get(q.id) ?? 0));
  relationships.sort((p, q) => (order.get(p.id) ?? 0) - (order.get(q.id) ?? 0));

  return {
    notation: 'er',
    name: ER_TABLE.name,
    confidence,
    summary,
    reason: `${summary} — ${reason}`,
    symbols: out,
    connectors: relationships,
    labels: kept,
    roles,
    unplaced,
    counts,
    evidence,
    classLike: classLike.length,
    headed,
  };
}

/** How many an end says, as words for a sentence. */
export const saysOf = (c: Cardinality | null): string => (c ? ER_TABLE.cardinalities[c].says : 'not said');
export { CARDINALITIES };

// ===== The notation =====

export const ER: Notation = {
  id: 'er',
  name: ER_TABLE.name,
  describes: ER_TABLE.describes,
  symbols: [{ name: 'entity', role: ER_TABLE.symbols.entity.role as Role, describes: ER_TABLE.symbols.entity.describes, ports: ER_TABLE.symbols.entity.ports }],
  connectors: [{ name: 'relationship', role: ER_TABLE.connectors.relationship.role as Role, describes: ER_TABLE.connectors.relationship.describes }],
  read: (state, scopeIds) => readEr(state, scopeIds),
  ports: { notation: 'er', portsOf: erPortsOf } satisfies NotationPorts,
};

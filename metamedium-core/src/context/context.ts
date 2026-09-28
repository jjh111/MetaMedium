// Context — conceptual adjacency, read from the board and the log (V1-PLAN
// §2.2, B2).
//
// What stands BESIDE the hand makes some acts likelier than others: new boxes
// drawn beside a flowchart are likelier drawn clean than lined up; a pair of
// boxes beside a row is likelier lined up. John asked for exactly this: keep
// the suggested top offer in that context when near — conceptual adjacency can
// bias the top suggestion. This file reads the context; `rank.ts` applies it.
//
// A context is three lists, each weighted, each with its reason:
//
//   - **notations** read over what the scope sits beside (`notationsOf`, above
//     `NOTATION_FLOOR`): *it sits beside a flowchart: three processes, one
//     decision, three flows*;
//   - **concepts** read there (`session.read`): *it sits beside a row: 3
//     comparable marks sitting side by side*;
//   - **recent** acts this hand took beside it, read from the log — the events
//     a tool's offer wrote carry `tool`, `offer` and `at` (B1's stamp).
//
// Four rules keep it from becoming a mode:
//
//   1. **Beside, never inside.** The scope's own marks are its reading, which
//      already set every item's base; the context is what surrounds them. So a
//      scope with nothing beside it reads an EMPTY context, and ranks exactly
//      as it did before context (B1's order, e2e 49's golden).
//   2. **Nearness is relative to the marks' own size**, never a pixel count
//      (relations.ts's rule): full within a mark's reach — `near`'s own limit,
//      a ratio of the smaller mark — and fading to nothing at `CONTEXT_FADE`
//      times it. The same board at ten times the size reads the same.
//   3. **What is beside is the thing, not the nearest mark.** A box beside a
//      flowchart is within reach of one process at most; the flowchart is
//      what that process hangs together with — the marks joined to it by
//      within-reach links, walked outwards (the same links the session
//      clusters by), the scope left out. Each such neighbourhood is read on
//      its own, so a flowchart on one side and a row on the other are both
//      said, neither blurring the other. The walk is bounded
//      (`NEIGHBOURHOOD_MAX`), nearest first.
//   4. **An act lifts only while it is recent, and only near.** An act fades
//      over `RECENT_MS` since it was taken, and counts only as near as its
//      marks are to the scope — or as near as the neighbourhood it touched.
//      An act on the scope's own marks is not beside them, and another hand's
//      act is not this hand's.
//
// Everything here is derived: computed from the board and the log on demand,
// nothing written. `now` is the log's own latest time unless the caller says,
// so a context is a pure function of the log — which is what lets a surface
// keep it keyed by the log (R4c) and an undo leave no stale lift behind.

import type { Bounds, Point } from '../types';
import type { SessionEvent, SessionState } from '../session/session';
import { boundsOf, getRep, wordOf } from '../session/nodes';
import { MarkGrid, finiteBounds } from '../relate/grid';
import { DEFAULT_RELATE_CONFIG, nearLimitOf, reachAround, withinReach } from '../relate/relations';
import { boundingBoxDistance, boundsOverlap } from '../geometry';
import { NOTATION_FLOOR, notationsOf } from '../notations/notation';
import { getTool } from '../tools/registry';
import type { Context, ScopeReading } from '../tools/tool';
import { type PackSource, affinityOf, shippedPack } from '../packs/registry';

export type { Context } from '../tools/tool';
export { NO_CONTEXT } from '../tools/tool';

/** Full lift within a mark's reach (`near`'s own limit); nothing past this many times that reach. */
export const CONTEXT_FADE = 2.5;
/** How long an act taken beside the hand still lifts what it took, fading to nothing. */
export const RECENT_MS = 120_000;
/** The most marks the neighbourhoods beside one scope are read over, nearest first. */
export const NEIGHBOURHOOD_MAX = 80;
/** How far back, in events, the log is read for what was just taken. */
export const RECENT_EVENTS_MAX = 400;

/** What a context is read from: the board, its reading of a scope, and its log — a session, as a reader. */
export interface ContextSource {
  getState(): SessionState;
  read(ids: string[]): ScopeReading;
  getEvents(): readonly SessionEvent[];
}

export interface ContextOptions {
  /** When the context is read, for how recent the acts beside it are. The log's latest `at` when not said. */
  now?: number;
  /** Where the board's packs come from, for their affinities: the shipped packs when not said (a bench hands in its own). */
  packs?: PackSource;
}

/** A notation read beside the scope. */
export interface ContextNotation {
  id: string;
  /** The notation's own name: 'Flowchart'. */
  name: string;
  /** confidence × nearness: what it lifts by. */
  weight: number;
  /** How sure the notation is of what it read, 0–1. */
  confidence: number;
  /** How near what it read is to the scope, relative to the marks' size, 0–1. */
  nearness: number;
  /** What it saw: 'three processes, one decision, three flows'. */
  summary: string;
  /** Why it lifts, as the pill and the panel say it: 'it sits beside a flowchart: three processes, one decision, three flows'. */
  reason: string;
  /** The earliest mark, in the board's order, of the neighbourhood it was read over. */
  anchor: string;
}

/** A concept read beside the scope. */
export interface ContextConcept {
  name: string;
  weight: number;
  confidence: number;
  nearness: number;
  reason: string;
  anchor: string;
}

/** An act this hand took beside the scope. */
export interface ContextAct {
  tool: string;
  /** The offer's key it took. */
  offer: string;
  at: number;
  /** nearness × how recent: what it lifts by. */
  weight: number;
  reason: string;
}

/** A context as `contextAt` reads it: the lists in full, the strongest first. */
export interface ReadContext extends Context {
  notations: ContextNotation[];
  concepts: ContextConcept[];
  recent: ContextAct[];
  kind: string | null;
  key: string | null;
  /** When it was read. */
  at: number;
}

/**
 * How near two marks are, for context: 1 when their boxes meet or the gap is
 * under `near`'s own limit (a ratio of the smaller mark — the one number
 * "within reach" means everywhere), fading to 0 at `CONTEXT_FADE` times that
 * limit. Relative to the marks' own size, so scale-free.
 */
export function nearnessOf(a: Bounds, b: Bounds): number {
  if (!finiteBounds(a) || !finiteBounds(b)) return 0;
  if (boundsOverlap(a, b)) return 1;
  return fade(boundingBoxDistance(a, b), nearLimitOf(a, b));
}

/** How near a point is to a mark: the mark's own reach (`reachAround`) is the limit, since a point has no size. */
export function pointNearnessOf(p: Point, b: Bounds): number {
  if (!finiteBounds(b) || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return 0;
  const dx = Math.max(0, b.minX - p.x, p.x - b.maxX);
  const dy = Math.max(0, b.minY - p.y, p.y - b.maxY);
  return fade(Math.hypot(dx, dy), reachAround(b));
}

function fade(gap: number, limit: number): number {
  if (gap < limit) return 1;
  const far = limit * CONTEXT_FADE;
  return gap >= far ? 0 : 1 - (gap - limit) / (far - limit);
}

const isPoint = (at: readonly string[] | Point): at is Point =>
  !Array.isArray(at) && typeof (at as Point).x === 'number' && typeof (at as Point).y === 'number';

/** The log's latest time: the hand's last act anywhere, which is what "since the last act there" is measured from. */
function lastAtOf(events: readonly SessionEvent[]): number {
  let at = 0;
  for (let i = events.length - 1, n = 0; i >= 0 && n < 64; i--, n++) if (events[i].at > at) at = events[i].at;
  return at;
}

const article = (word: string) => (/^[aeiou]/i.test(word) ? 'an' : 'a');

/** How a concept beside the hand is said: 'a row', 'a line of writing'. */
const CONCEPT_NOUN: Readonly<Record<string, string>> = {
  writing: 'a line of writing',
  labelled: 'a mark with writing in it',
};
export const conceptNoun = (name: string): string => CONCEPT_NOUN[name] ?? article(name) + ' ' + name;

/** A concept's reasoning, short: up to its measurements. */
const shortReason = (reasoning: string) => reasoning.split(/ \(| — /)[0].trim();

/** A neighbourhood: the marks one thing beside the scope is made of, in the board's order. */
interface Neighbourhood {
  ids: string[];
  anchor: string;
  nearness: number;
}

function emptyContext(scopeIds: string[], at: number, affinity: Record<string, string[]>): ReadContext {
  return { scopeIds, notations: [], concepts: [], recent: [], kind: null, key: null, at, affinity };
}

/** Far from any context: nothing beside the scope lifts anything. */
export function isEmptyContext(ctx: Context | null | undefined): boolean {
  return !ctx || (!ctx.notations.length && !ctx.concepts.length && !ctx.recent.length);
}

/**
 * The context at a scope — the marks a field holds (`ids`), or a point where
 * the pen is: which notations and concepts stand beside it, each weighted by
 * how near and how sure, and what this hand just took there. Derived; writes
 * nothing. Far from anything, every list is empty and `key` is null.
 */
export function contextAt(board: ContextSource, at: readonly string[] | Point, opts: ContextOptions = {}): ReadContext {
  const state = board.getState();
  const events = board.getEvents();
  const now = opts.now ?? lastAtOf(events);
  // What the packs this board uses say an entry beside the hand makes likelier (B3).
  const affinity = affinityOf(state.packs ?? [], opts.packs ?? shippedPack);
  const point = isPoint(at) ? at : null;
  const scopeIds = point ? [] : [...new Set(at as readonly string[])].filter((id) => state.nodes.has(id));
  const scope = new Set(scopeIds);
  const boxes: Bounds[] = [];
  for (const id of scopeIds) {
    const b = boundsOf(state.nodes.get(id)!);
    if (b && finiteBounds(b)) boxes.push(b);
  }
  if (!point && !boxes.length) return emptyContext(scopeIds, now, affinity);

  const nearScope = (b: Bounds): number => {
    if (point) return pointNearnessOf(point, b);
    let best = 0;
    for (const s of boxes) {
      const n = nearnessOf(s, b);
      if (n > best) best = n;
      if (best === 1) break;
    }
    return best;
  };

  // The board around the scope, filed by its marks' own boxes; the scope left out.
  const grid = new MarkGrid();
  const order = new Map<string, number>();
  state.contentIds.forEach((id, i) => {
    if (scope.has(id)) return;
    const n = state.nodes.get(id);
    const b = n && boundsOf(n);
    if (!b || !finiteBounds(b)) return;
    grid.set(id, b);
    order.set(id, i);
  });

  // What the scope is near: every mark within the fade of it, and how near.
  const seeds = new Map<string, number>();
  const consider = (id: string) => {
    if (seeds.has(id)) return;
    const n = nearScope(grid.boundsOf(id)!);
    if (n > 0) seeds.set(id, n);
  };
  if (point) {
    for (const id of grid.around(point, (cell) => CONTEXT_FADE * DEFAULT_RELATE_CONFIG.nearRatio * cell)) consider(id);
  } else {
    for (const b of boxes) {
      const r = CONTEXT_FADE * reachAround(b);
      for (const id of grid.query({ minX: b.minX - r, minY: b.minY - r, maxX: b.maxX + r, maxY: b.maxY + r })) consider(id);
    }
  }

  // What each of those hangs together with: walked outwards by within-reach
  // links, nearest first, one neighbourhood per thing beside the scope.
  const byOrder = (p: string, q: string) => order.get(p)! - order.get(q)!;
  const hoods: Neighbourhood[] = [];
  const hoodOf = new Map<string, Neighbourhood>();
  const visited = new Set<string>();
  let budget = NEIGHBOURHOOD_MAX;
  const seeded = [...seeds].sort((a, b) => b[1] - a[1] || byOrder(a[0], b[0]));
  for (const [seed] of seeded) {
    if (visited.has(seed) || budget <= 0) continue;
    const hood: Neighbourhood = { ids: [], anchor: seed, nearness: 0 };
    const queue = [seed];
    visited.add(seed);
    while (queue.length && budget > 0) {
      const x = queue.shift()!;
      hood.ids.push(x);
      hoodOf.set(x, hood);
      budget--;
      hood.nearness = Math.max(hood.nearness, seeds.get(x) ?? 0);
      const bx = grid.boundsOf(x)!;
      const r = reachAround(bx);
      for (const o of grid.query({ minX: bx.minX - r, minY: bx.minY - r, maxX: bx.maxX + r, maxY: bx.maxY + r })) {
        if (visited.has(o) || !withinReach(bx, grid.boundsOf(o)!)) continue;
        visited.add(o);
        queue.push(o);
      }
    }
    hood.ids.sort(byOrder);
    hood.anchor = hood.ids[0];
    hoods.push(hood);
  }

  // What each neighbourhood reads as: a notation above the floor, the concepts.
  const notations = new Map<string, ContextNotation>();
  const concepts = new Map<string, ContextConcept>();
  for (const hood of hoods) {
    let read: ReturnType<typeof notationsOf> = [];
    try {
      read = notationsOf(state, hood.ids);
    } catch {
      read = [];
    }
    for (const r of read) {
      if (!(r.confidence >= NOTATION_FLOOR)) continue;
      const weight = r.confidence * hood.nearness;
      const had = notations.get(r.notation);
      if (had && had.weight >= weight) continue;
      const name = r.name.toLowerCase();
      notations.set(r.notation, {
        id: r.notation, name: r.name, weight, confidence: r.confidence, nearness: hood.nearness, summary: r.summary,
        reason: `it sits beside ${article(name)} ${name}: ${r.summary}`, anchor: hood.anchor,
      });
    }
    if (hood.ids.length < 2) continue; // one mark is no concept: every one of them is a relation between marks
    for (const c of board.read(hood.ids.slice()).concepts) {
      const weight = c.confidence * hood.nearness;
      const had = concepts.get(c.concept);
      if (had && had.weight >= weight) continue;
      concepts.set(c.concept, {
        name: c.concept, weight, confidence: c.confidence, nearness: hood.nearness,
        reason: `it sits beside ${conceptNoun(c.concept)}: ${shortReason(c.reasoning)}`, anchor: hood.anchor,
      });
    }
  }

  const recent = recentActs(state, events, now, scope, nearScope, hoodOf);

  const byWeight = <T extends { weight: number }>(xs: Iterable<T>) => [...xs].sort((a, b) => b.weight - a.weight);
  const ns = byWeight(notations.values());
  const cs = byWeight(concepts.values());
  // The kind: the strongest notation — the more particular reading — else the strongest concept.
  const lead = ns[0] ? { kind: 'notation:' + ns[0].id, anchor: ns[0].anchor } : cs[0] ? { kind: 'concept:' + cs[0].name, anchor: cs[0].anchor } : null;
  return {
    scopeIds,
    notations: ns,
    concepts: cs,
    recent,
    kind: lead ? lead.kind : null,
    key: lead ? lead.kind + '@' + lead.anchor : null,
    at: now,
    affinity,
  };
}

/** The marks an event acted on, as far as the event itself says. */
function targetsOf(ev: SessionEvent, state: SessionState): string[] {
  const e = ev as SessionEvent & { ids?: unknown; nodeId?: unknown; aboutIds?: unknown; strokeId?: unknown; name?: unknown };
  const out: string[] = [];
  if (Array.isArray(e.ids)) for (const id of e.ids) if (typeof id === 'string') out.push(id);
  if (Array.isArray(e.aboutIds)) for (const id of e.aboutIds) if (typeof id === 'string') out.push(id);
  if (typeof e.nodeId === 'string') out.push(e.nodeId);
  if (typeof e.strokeId === 'string') out.push(e.strokeId);
  // What a bless, a frame or an import made: the id its authorship minted, or
  // the artifact made at that moment under that name.
  if (ev.type === 'bless' || ev.type === 'frame' || ev.type === 'import') {
    if (ev.origin && typeof ev.seq === 'number') out.push(`artifact:${ev.origin}:${ev.seq}`);
    else {
      for (const id of state.artifacts) {
        const n = state.nodes.get(id);
        if (n && n.createdAt === ev.at && (typeof e.name !== 'string' || wordOf(n) === e.name)) out.push(id);
      }
    }
  }
  return out;
}

/** How a tool is said: its name in the registry, else its id. */
const toolName = (id: string) => getTool(id)?.name ?? id;

/** What this hand just took beside the scope, strongest first, one entry per offer. */
function recentActs(
  state: SessionState,
  events: readonly SessionEvent[],
  now: number,
  scope: ReadonlySet<string>,
  nearScope: (b: Bounds) => number,
  hoodOf: ReadonlyMap<string, Neighbourhood>
): ContextAct[] {
  // One act is every event one outermost `withTool` wrote (its `act`), else one event.
  const acts = new Map<string, { tool: string; offer: string; at: number; ids: Set<string> }>();
  for (let i = events.length - 1, n = 0; i >= 0 && n < RECENT_EVENTS_MAX; i--, n++) {
    const ev = events[i];
    if (!ev.tool || ev.by !== undefined) continue; // a tool's act, and this hand's: another log's is another hand's
    if (!(ev.at <= now) || now - ev.at > RECENT_MS) continue;
    const key = ev.act !== undefined ? 'act:' + ev.act : 'event:' + i;
    let a = acts.get(key);
    if (!a) acts.set(key, (a = { tool: ev.tool, offer: ev.offer ?? ev.tool, at: ev.at, ids: new Set() }));
    if (ev.at > a.at) a.at = ev.at;
    for (const id of targetsOf(ev, state)) a.ids.add(id);
  }
  const best = new Map<string, ContextAct>();
  for (const a of acts.values()) {
    let near = 0;
    for (const id of a.ids) {
      if (scope.has(id)) continue; // on the scope itself: here, not beside
      const node = state.nodes.get(id);
      if (!node || getRep(node, 'erased')) continue;
      const b = boundsOf(node);
      if (!b || !finiteBounds(b)) continue;
      near = Math.max(near, nearScope(b), hoodOf.get(id)?.nearness ?? 0);
    }
    const recency = 1 - (now - a.at) / RECENT_MS;
    const weight = near * Math.max(0, recency);
    if (!(weight > 0)) continue;
    const had = best.get(a.offer);
    if (had && had.weight >= weight) continue;
    best.set(a.offer, { tool: a.tool, offer: a.offer, at: a.at, weight, reason: `you used ${toolName(a.tool)} beside it` });
  }
  return [...best.values()].sort((a, b) => b.weight - a.weight);
}

/**
 * The context in words, strongest first, one line each — for the panel:
 * "a flowchart 0.69 — three processes, one decision, three flows".
 */
export function describeContext(ctx: Context): string[] {
  const out: string[] = [];
  for (const n of ctx.notations as (Context['notations'][number] & Partial<ContextNotation>)[]) {
    const name = (n.name ?? n.id).toLowerCase();
    out.push(`${article(name)} ${name} ${n.weight.toFixed(2)}${n.summary ? ' — ' + n.summary : ''}`);
  }
  for (const c of ctx.concepts) out.push(`${conceptNoun(c.name)} ${c.weight.toFixed(2)}`);
  for (const r of ctx.recent) out.push(`${toolName(r.tool)}, taken beside it${typeof r.weight === 'number' ? ' ' + r.weight.toFixed(2) : ''}`);
  return out;
}


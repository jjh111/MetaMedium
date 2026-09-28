// The registry: every tool the canvas has, in the order the field offers them
// (V1-PLAN §2.1, B1). It replaces three scattered lists — the tier-1
// library's entries, the concepts' conversions, the palette's hand-built
// pills — with one: a tool is one file and one registration line, and what it
// offers is in `offersFor` for every scope it applies to.
//
// The order is the registration order, and it is the tie-break when two
// offers are equally likely (`rank.ts`). The built-ins register in the order
// the field always built its pills in (`builtin.ts`), so a field reads exactly
// as it did before tools.
//
// The registry is state a surface cannot see change in the log: a tool
// registered or unregistered changes what the field offers with no event. So
// it says so — `toolsVersion()` for a cache to key by, and `onToolsChange` for
// a surface to repaint an open field.

import type { Session, Summon } from '../session/session';
import { LOCAL_PARTICIPANT, transcriptOf, wordOf } from '../session/nodes';
import type { Context, Offer, Taken, Tool, ToolHost, ToolReading, ToolScope, SessionReader } from './tool';
import { NO_CONTEXT } from './tool';

const registry = new Map<string, Tool>();
const listeners = new Set<() => void>();
let version = 0;

function changed(): void {
  version++;
  for (const listener of [...listeners]) listener();
}

/**
 * Register a tool; returns the way to unregister it. A tool registered again
 * under the same id replaces the one before, in its place.
 */
export function registerTool(tool: Tool): () => void {
  if (!tool || typeof tool.id !== 'string' || !tool.id) throw new Error('a tool has an id');
  if (typeof tool.offers !== 'function' || typeof tool.take !== 'function') {
    throw new Error(`tool "${tool.id}": a tool says what it offers and takes what it offered`);
  }
  registry.set(tool.id, tool);
  changed();
  return () => {
    if (registry.get(tool.id) === tool) unregisterTool(tool.id);
  };
}

/** Stop a tool offering. False when no tool had that id. */
export function unregisterTool(id: string): boolean {
  const had = registry.delete(id);
  if (had) changed();
  return had;
}

export function getTool(id: string): Tool | undefined {
  return registry.get(id);
}

/** Every tool, in the order they offer. */
export function registeredTools(): Tool[] {
  return [...registry.values()];
}

/** Bumped by every registration and unregistration: what a cache of offers keys by, beside the log. */
export function toolsVersion(): number {
  return version;
}

/** Hear when the tools change — an open field offers again. Returns the way to stop hearing. */
export function onToolsChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * An offer as the field may hold it: its tool's own, whatever it named; and
 * never leading if it asks anyone — Enter with nothing typed takes the
 * leading item, and a model or a seat is asked only by a deliberate act.
 */
function held(offer: Offer, tool: Tool): Offer {
  let o = offer.tool === tool.id ? offer : { ...offer, tool: tool.id };
  if (o.lead && o.asks) {
    const { lead: _lead, ...rest } = o;
    o = rest;
  }
  return o;
}

/** Offers in order, each key once: a later offer under a key already offered is not the field's to hold twice. */
function gather(tools: Iterable<Tool>, each: (tool: Tool) => Offer[]): Offer[] {
  const out: Offer[] = [];
  const keys = new Set<string>();
  for (const tool of tools) {
    for (const offer of each(tool)) {
      if (keys.has(offer.key)) continue;
      keys.add(offer.key);
      out.push(held(offer, tool));
    }
  }
  return out;
}

/**
 * Everything the tools offer for a scope, in registry order, each tool's
 * offers in its own order. Unranked: `rankOffers` orders them. Every offer is
 * the tool's own — one naming another tool is taken as the tool that made
 * it — and every key is offered once (the first tool to offer it keeps it).
 */
export function offersFor(scope: ToolScope, ctx: Context = NO_CONTEXT): Offer[] {
  return gather(registry.values(), (tool) => tool.offers(scope, ctx));
}

/**
 * What the typed text completes to, from every tool that completes, in
 * registry order — each placed in the field by its `place`, not ranked.
 */
export function completionsFor(scope: ToolScope, ctx: Context = NO_CONTEXT): Offer[] {
  return gather(registry.values(), (tool) => (tool.completes ? tool.completes(scope, ctx) : []));
}

/** The tools that offer something for a scope, in registry order. */
export function toolsFor(scope: ToolScope, ctx: Context = NO_CONTEXT): Tool[] {
  return registeredTools().filter((tool) => tool.offers(scope, ctx).length > 0);
}

/** What every tool that reads says of a scope, attributed. */
export function readingsFor(scope: ToolScope): (ToolReading & { tool: string })[] {
  const out: (ToolReading & { tool: string })[] = [];
  for (const tool of registry.values()) {
    if (!tool.reads) continue;
    for (const r of tool.reads(scope)) out.push({ ...r, tool: tool.id });
  }
  return out;
}

/**
 * Take an offer, through the one door that stamps: every event the tool
 * writes carries its id and the offer's key. What is left for the host — an
 * act only the host can perform — comes back in `host`, and a host that
 * performs it inside `session.withTool(offer.tool, …, offer.key)` stamps
 * what that writes too.
 */
export function takeOffer(offer: Offer, scope: ToolScope, session: Session, at: number): Taken {
  const tool = registry.get(offer.tool);
  if (!tool) throw new Error(`no tool "${offer.tool}" is registered to take "${offer.key}"`);
  return session.withTool(tool.id, () => tool.take(offer, scope, session, at), offer.key) || {};
}

/** Every tool, one line each: its name and what it does — for `HERE`, the models pane and a brief. */
export function describeTools(filter: (tool: Tool) => boolean = () => true): string {
  return registeredTools()
    .filter(filter)
    .map((tool) => `${tool.name} — ${tool.describe()}`)
    .join('\n');
}

/**
 * What a host that knows nothing of its own passes: snap offered, no models,
 * writing read when a transcript is held, nothing flipped, a participant said
 * by its name, no text beside any ink.
 */
export function defaultHost(session: SessionReader): ToolHost {
  return {
    snap: 'offer',
    models: [],
    isRead: (id) => {
      const node = session.getState().nodes.get(id);
      return !!node && !!transcriptOf(node);
    },
    isFlipped: () => false,
    nameOf: (pid) => {
      if (pid === LOCAL_PARTICIPANT) return 'you';
      const node = session.getState().nodes.get(pid);
      return (node && wordOf(node)) || pid;
    },
    textNear: () => null,
  };
}

/**
 * Gather a scope: the summon the field stands on (the session's own, unless
 * one is given), its marks on the content plane, what the engine reads of
 * it, what is typed, and the host's facts over `defaultHost`'s.
 */
export function toolScope(
  session: SessionReader,
  opts: { summon?: Summon; text?: string; word?: string | null; host?: Partial<ToolHost> } = {}
): ToolScope {
  const state = session.getState();
  const summon = opts.summon ?? state.summon;
  if (!summon) throw new Error('a scope is what a summon holds, and nothing is held');
  const content = new Set(state.contentIds);
  return {
    session,
    state,
    summon,
    marks: summon.enclosedIds.filter((id) => content.has(id)),
    reading: session.read(summon.enclosedIds),
    text: (opts.text ?? '').trim(),
    word: opts.word ?? null,
    host: { ...defaultHost(session), ...opts.host },
  };
}

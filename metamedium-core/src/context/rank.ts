// Rank — the field's order with the context applied, and the steady top
// (V1-PLAN §2.2, B2).
//
// `rank(items, ctx)` is B1's order (`rankOffers`: the reading first, then
// learned use) with one more factor: what stands beside the hand. The same
// function orders the reading drawn under a new mark, the field's two rows, and
// — when seats arrive — the candidates a seat is asked about, so none of them
// can disagree about what leads.
//
// Five rules (§2.2):
//
//   1. **A lift, never a filter.** The context multiplies an item's score by a
//      bounded factor — at most a quarter again (`CONTEXT_LIFT_MAX`) — and
//      nothing is removed or hidden. Far from any context the factor is 1 for
//      every item and the order is exactly B1's, key for key.
//   2. **Every lift says why**, in `because`, the strongest reason first:
//      *it sits beside a flowchart: three processes, one decision*. An item
//      nothing lifted says nothing.
//   3. **The steady top** (`steadyTop`). In one context the top offer changes
//      only when another beats it by a margin (`STEADY_MARGIN`), so the
//      suggestion the hand reaches for stays where it expects while it works
//      nearby. What led is the caller's to remember — runtime, never the log —
//      and it lapses after `STEADY_MS` without an act in that context.
//   4. **Use is learned per context.** The device's counts come in twice: this
//      context's and the global; an item's count here is used first, the
//      global as the fallback. Core keeps no counts.
//   5. **What the hand named, wrote, or a model read HERE is not lifted**, and
//      no lift or learned use carries a generic item past it. Those readings
//      are about these marks already; what is beside them says nothing more.
//
// An item stands on what its grounds say (`grounds.on` — a concept's name for
// a conversion, `clean` for the clean forms), on the concept a reading names
// (`concept:row`), and on its tool. A context entry lifts what stands on its
// own name, and on its `AFFINITY` — what that notation or concept beside the
// hand makes likelier. That table is content, not code: packs (B3) will carry
// their own.

import type { Context, Grounds } from '../tools/tool';
import { NO_CONTEXT } from '../tools/tool';
import type { Rankable, Uses } from '../tools/rank';
import { isSpecific, likelihoodOf } from '../tools/rank';
import { getTool } from '../tools/registry';
import { BUILTIN_CONCEPTS } from '../concepts/concept';
import { registeredNotations } from '../notations/notation';

/** The most a context lifts an item: a quarter again, as learned use does. */
export const CONTEXT_LIFT_MAX = 1.25;
/** An act of the same tool, but another of its offers, lifts half as much as the offer itself. */
export const RECENT_SAME_TOOL = 0.5;
/** Another offer must beat the held top by this share of its score to take the top. */
export const STEADY_MARGIN = 0.1;
/** How long a held top is kept without an act in its context. */
export const STEADY_MS = 120_000;

/**
 * What a notation or concept beside the hand makes likelier, besides what
 * stands on its own name: the grounds (`on:…`), tools (`tool:…`) and keys
 * (`key:…`) it lifts. A flowchart is drawn clean and its marks join as flows
 * (V1-PLAN A1: *it reads as a flowchart; clean it*).
 */
export const AFFINITY: Readonly<Record<string, readonly string[]>> = {
  'notation:flowchart': ['on:flow', 'on:clean'],
};

/** Everything an entry of a context lifts: what stands on its own name, and its affinity. */
export function liftTargets(kind: string): string[] {
  const at = kind.indexOf(':');
  const type = kind.slice(0, at), name = kind.slice(at + 1);
  const own = type === 'notation' ? ['on:' + name, 'tool:notation:' + name] : ['on:' + name];
  return own.concat(AFFINITY[kind] ?? []);
}

/** An item as `rank` reads it: B1's rankable, and the tool that offers it, where one does. */
export interface RankItem extends Rankable {
  tool?: string;
  grounds?: Pick<Grounds, 'on' | 'confidence'> & { why?: string };
}

/** An item ranked: its likelihood (B1's), the context's lift, the score they make, and why. */
export type Ranked<T> = T & {
  likelihood: number;
  /** The context's factor: 1 when nothing beside the hand lifted it. */
  lift: number;
  /** likelihood × lift — what the order is by. */
  score: number;
  /** Why it was lifted, the strongest reason first; empty when it was not. */
  because: string[];
  /** Held first by `steadyTop`: it led here a moment ago. */
  steady?: boolean;
};

/** What an item stands on, as a context names it: `on:row`, `tool:clean`, `key:snap`. */
export function standsOn(item: RankItem): Set<string> {
  const out = new Set<string>();
  const on = item.grounds?.on;
  if (on) out.add('on:' + on);
  // A concept's own reading stands on that concept: `concept:row` is the row.
  if (item.key.startsWith('concept:')) out.add('on:' + item.key.slice('concept:'.length));
  if (item.tool) out.add('tool:' + item.tool);
  out.add('key:' + item.key);
  return out;
}

/** How a tool is said in a reason: its name, else its id. */
const toolName = (id: string) => getTool(id)?.name ?? id;

/**
 * What the context does for one item: a factor in [1, CONTEXT_LIFT_MAX] and
 * the reasons, strongest first. The factor is the strongest single reason's —
 * two reasons for the same item do not add up past the bound.
 */
export function liftOf(item: RankItem, ctx: Context = NO_CONTEXT): { factor: number; because: string[] } {
  if (!ctx || isSpecific(item)) return { factor: 1, because: [] };
  const on = standsOn(item);
  const hits: { w: number; why: string }[] = [];
  const lifts = (kind: string) => liftTargets(kind).some((t) => on.has(t));
  for (const n of ctx.notations) if (n.weight > 0 && lifts('notation:' + n.id)) hits.push({ w: n.weight, why: n.reason });
  for (const c of ctx.concepts) if (c.weight > 0 && lifts('concept:' + c.name)) hits.push({ w: c.weight, why: c.reason ?? 'it sits beside a ' + c.name });
  for (const r of ctx.recent) {
    const w = r.weight ?? 0;
    if (!(w > 0)) continue;
    if (r.offer === item.key) hits.push({ w, why: 'you just took it beside these' });
    else if (item.tool && r.tool === item.tool) hits.push({ w: w * RECENT_SAME_TOOL, why: 'you just used ' + toolName(r.tool) + ' beside these' });
  }
  if (!hits.length) return { factor: 1, because: [] };
  hits.sort((a, b) => b.w - a.w);
  const because: string[] = [];
  for (const h of hits) if (!because.includes(h.why)) because.push(h.why);
  return { factor: 1 + (CONTEXT_LIFT_MAX - 1) * Math.min(1, hits[0].w), because };
}

/**
 * Whether any context could lift any of these items. When none can, the
 * context need not be read at all: `rank(items, ctx)` is `rank(items)` for
 * every context there is. The reading under a new mark asks this first, so a
 * stroke costs no neighbourhood when nothing it reads could be lifted.
 */
export function canLift(items: readonly RankItem[]): boolean {
  const targets = new Set<string>();
  for (const c of BUILTIN_CONCEPTS) for (const t of liftTargets('concept:' + c.name)) targets.add(t);
  for (const n of registeredNotations()) for (const t of liftTargets('notation:' + n)) targets.add(t);
  for (const kind of Object.keys(AFFINITY)) for (const t of liftTargets(kind)) targets.add(t);
  return items.some((item) => {
    if (isSpecific(item)) return false;
    if (item.tool) return true; // an act taken beside the hand lifts its tool's offers
    for (const t of standsOn(item)) if (targets.has(t)) return true;
    return false;
  });
}

export interface RankOptions {
  /** How often this device took each item, anywhere (B1's counts). */
  uses?: Uses;
  /** How often it took each item in this context's kind: used first, the global count as the fallback. */
  usesHere?: Uses;
}

/**
 * The items, most likely first, each with its likelihood, the context's lift,
 * its score and why. Stable: equal scores keep the order the items came in —
 * the registry's. Pure: the items are copied, never changed, and nothing is
 * removed. With no context (or one with nothing in it), the order and every
 * likelihood are exactly `rankOffers`'s.
 */
export function rank<T extends RankItem>(items: readonly T[], ctx: Context = NO_CONTEXT, opts: RankOptions = {}): Ranked<T>[] {
  const uses: Uses = opts.usesHere ? { ...(opts.uses ?? {}), ...opts.usesHere } : opts.uses ?? {};
  const out = items.map((item) => {
    const likelihood = likelihoodOf(item, uses);
    const lift = liftOf(item, ctx);
    return { ...item, likelihood, lift: lift.factor, score: likelihood * lift.factor, because: lift.because } as Ranked<T>;
  });
  // No lift carries a generic item past what the hand named, wrote, or a model read here.
  let floor = Infinity;
  for (const x of out) if (isSpecific(x) && x.likelihood < floor) floor = x.likelihood;
  for (const x of out) if (x.lift > 1 && x.likelihood < floor && x.score >= floor) x.score = floor * (1 - 1e-12);
  return out.sort((a, b) => b.score - a.score);
}

/** What a surface remembers of the top in one context: the item's key, and when it led. */
export interface HeldTop {
  key: string;
  at: number;
}

export interface SteadyOptions<T extends RankItem> {
  /** How far ahead another must be to take the top: a share of the held one's score. */
  margin?: number;
  /** Which items the top is among — the field's affordances, not its readings. All, when not said. */
  eligible?: (item: Ranked<T>) => boolean;
  /** Now, to judge whether the held top has lapsed (`STEADY_MS`); a held top with no time never lapses. */
  now?: number;
}

/**
 * Hold the top steady (§2.2 rule 3): the ranked items, with the item that led
 * in this context a moment ago kept first among the eligible ones unless
 * another beats its score by more than the margin. Nothing is removed; the
 * held item moves to where the leader stood and says why. It never holds a
 * generic item over one standing on what the hand named, wrote, or a model
 * read here. Pure; the memory is the caller's.
 */
export function steadyTop<T extends RankItem>(ranked: readonly Ranked<T>[], held: HeldTop | string | null | undefined, opts: SteadyOptions<T> = {}): Ranked<T>[] {
  const out = ranked.slice();
  if (!held) return out;
  const h = typeof held === 'string' ? { key: held, at: undefined } : held;
  if (opts.now !== undefined && h.at !== undefined && opts.now - h.at > STEADY_MS) return out;
  const eligible = opts.eligible ?? (() => true);
  const leadAt = out.findIndex((x) => eligible(x));
  const heldAt = out.findIndex((x) => x.key === h.key && eligible(x));
  if (leadAt < 0 || heldAt <= leadAt) return out; // not offered now, or already first
  const lead = out[leadAt], kept = out[heldAt];
  if (isSpecific(lead) && !isSpecific(kept)) return out;
  const margin = opts.margin ?? STEADY_MARGIN;
  if (lead.score > kept.score * (1 + margin)) return out;
  out.splice(heldAt, 1);
  out.splice(leadAt, 0, { ...kept, steady: true, because: [`it led here a moment ago, and nothing here beats it by ${Math.round(margin * 100)}%`, ...kept.because] });
  return out;
}

/** The first item a steady ranking leads with among the eligible ones, to remember. */
export function topOf<T extends RankItem>(ranked: readonly Ranked<T>[], eligible: (item: Ranked<T>) => boolean = () => true): Ranked<T> | undefined {
  return ranked.find((x) => eligible(x));
}

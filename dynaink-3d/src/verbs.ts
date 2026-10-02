// ===== verbs =====
// Verbs bind to objects by NAME (SHARD-3D-PLAN §2.6 rule 4).
//
// *Make the turrets taller* resolves the object by name when nothing is
// selected, the verb from the closed list, and the scope to the steps so
// named. This is `behave/words.ts`'s pattern ported: a TABLE of the ways each
// verb is said, longest phrase first, and **what the table cannot read is
// returned, not dropped** — so the field can offer to ask a model what it
// meant and hold the answer as a way of saying that verb.
//
// Nothing here knows any name in advance. The names in play are handed in, and
// whether anything is called that is the log's business — the same separation
// `words.ts` keeps between a clause and a tank.
//
// Pure: no DOM, no session, no three.js.

import { singular } from 'metamedium-core';

/** The verbs a phrase over names may resolve to. Closed, like every vocabulary here. */
export type PhraseVerb = 'regen' | 'drop' | 'paint';

export const PHRASE_VERBS: readonly PhraseVerb[] = ['regen', 'drop', 'paint'];

/** What a regen is being asked for, in the human's own word. A hint, never a measurement. */
export type Change = 'taller' | 'shorter' | 'wider' | 'narrower' | 'bigger' | 'smaller' | 'different';

/**
 * The ways each verb is said. One table, so a phrasing is added here and
 * nowhere else. Longer phrases are matched first, exactly as `PHRASES` is.
 */
export const SAYINGS: Record<PhraseVerb, readonly string[]> = {
  regen: [
    'make', 'makes', 'redo', 'regenerate', 'regen', 'rebuild', 'do', 'try', 'change',
  ],
  drop: [
    'get rid of', 'take away', 'take off', 'remove', 'delete', 'drop', 'lose', 'without',
  ],
  paint: [
    'paint', 'colour', 'color', 'make', 'turn',
  ],
};

/** The words that ask for a change of size, and which way. */
export const CHANGES: Record<string, Change> = {
  taller: 'taller',
  higher: 'taller',
  longer: 'taller',
  shorter: 'shorter',
  lower: 'shorter',
  wider: 'wider',
  fatter: 'wider',
  broader: 'wider',
  narrower: 'narrower',
  thinner: 'narrower',
  slimmer: 'narrower',
  bigger: 'bigger',
  larger: 'bigger',
  smaller: 'smaller',
  tinier: 'smaller',
};

/** Words a noun phrase carries that are not the noun. */
const ARTICLES = new Set([
  'the', 'a', 'an', 'its', 'their', 'all', 'every', 'each', 'both', 'this', 'that', 'these', 'those', 'my',
]);
const FILLER = new Set(['is', 'are', 'be', 'get', 'gets', 'look', 'looks', 'it', 'them', 'please', 'to', 'and']);

export interface NameRef {
  name: string;
  /** Every step that name covers, in the tree's own ids. */
  stepIds: string[];
  /**
   * G3: every PART that name covers, in the engine's own `part:n` ids.
   *
   * A name on a hull's part is not a name on a step — *make the towers taller*
   * has to reach the parts, and a `stepIds`-only reading would have found
   * nothing to scope the regen to and sent the whole tree.
   */
  partIds?: string[];
  solidId: string;
}

export interface PhraseReading {
  verb: PhraseVerb;
  /** The names the phrase pointed at, as they are spelled in the tree. */
  names: string[];
  /** Every step those names cover — what the act is scoped to. */
  stepIds: string[];
  /** G3: every part those names cover — the other thing an act may be scoped to. */
  partIds: string[];
  solidId?: string;
  /** For `regen`: which way the change goes, in the human's own word. */
  change?: Change;
  /** For `paint`: the colour word. */
  colour?: string;
  reasoning: string;
}

/** A phrase the table could not read — returned, never dropped. */
export interface Unread {
  unread: string;
  /** Why the table could not place it, in the terms it looked in. */
  reasoning: string;
}

export type PhraseResult = PhraseReading | Unread;

export const isUnread = (r: PhraseResult | null): r is Unread => !!r && 'unread' in r;

/** The colour words a phrase may paint with — the same closed list the tree holds. */
export interface PhraseScope {
  names: NameRef[];
  colours: string[];
  /** Ways of saying a verb the hand has TAUGHT, held in the log and replayed. */
  taught?: { phrase: string; verb: PhraseVerb; target?: string }[];
}

const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/[“”"'.,;!?]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

/**
 * Which names a phrase points at. A noun resolves against the names in play,
 * singular or plural — *the turrets* is `turret`, the way a definition is
 * named (`words.ts`'s `singular`, reused rather than re-implemented).
 */
export function namesIn(text: string, names: NameRef[]): NameRef[] {
  const ws = words(text);
  const out: NameRef[] = [];
  for (const w of ws) {
    if (ARTICLES.has(w) || FILLER.has(w)) continue;
    const s = singular(w);
    const hit = names.find((n) => {
      const k = n.name.toLowerCase();
      return k === w || k === s || singular(k) === s;
    });
    if (hit && !out.includes(hit)) out.push(hit);
  }
  return out;
}

/** The change word in a phrase, if it carries one. */
export function changeIn(text: string): Change | undefined {
  for (const w of words(text)) if (w in CHANGES) return CHANGES[w];
  return undefined;
}

/** The colour word in a phrase, if it carries one of ours. */
export function colourIn(text: string, colours: string[]): string | undefined {
  const known = new Set(colours.map((c) => c.toLowerCase()));
  for (const w of words(text)) if (known.has(w)) return w;
  return undefined;
}

function reading(
  verb: PhraseVerb,
  hits: NameRef[],
  reasoning: string,
  extra: Partial<PhraseReading> = {}
): PhraseReading {
  return {
    verb,
    names: hits.map((h) => h.name),
    stepIds: hits.flatMap((h) => h.stepIds),
    partIds: hits.flatMap((h) => h.partIds ?? []),
    ...(hits[0] ? { solidId: hits[0].solidId } : {}),
    reasoning,
    ...extra,
  };
}

/**
 * What a phrase over names means, or the phrase back.
 *
 * Read in the order the three verbs are distinguishable in, which is by what
 * ELSE the phrase carries rather than by which word it starts with — *make*
 * says all three, and what separates them is a colour word, a change word, or
 * neither:
 *
 *   1. a name and a COLOUR word  → `paint`  (*the tops are red*)
 *   2. a name and a CHANGE word  → `regen`  (*make the turrets taller*)
 *   3. a name and a DROP saying  → `drop`   (*remove the turret*)
 *
 * A phrase with no name in it is not a phrase over names, and comes back
 * unread — which is right: it is a brief, and the field sends it to a model as
 * one.
 */
export function readPhrase(text: string, scope: PhraseScope): PhraseResult | null {
  const t = (text ?? '').trim();
  if (!t) return null;

  // A way of saying it the hand has already taught, held in the log. Checked
  // first, because it is the hand's own word and it beats the table's guess.
  const taught = scope.taught?.find((s) => s.phrase.toLowerCase() === t.toLowerCase());
  if (taught) {
    const hits = taught.target
      ? scope.names.filter((n) => n.name.toLowerCase() === taught.target!.toLowerCase())
      : namesIn(t, scope.names);
    if (hits.length) {
      return reading(taught.verb, hits, `“${t}” is a way you have already said ${taught.verb} — taught once, held in the log, replayed`);
    }
  }

  const hits = namesIn(t, scope.names);
  if (!hits.length) return null;
  const said = hits
    .map((h) => {
      const parts = h.partIds?.length ?? 0;
      const what = parts
        ? `${parts} part${parts === 1 ? '' : 's'}${h.stepIds.length ? ` and ${h.stepIds.length} step${h.stepIds.length === 1 ? '' : 's'}` : ''}`
        : `${h.stepIds.length} step${h.stepIds.length === 1 ? '' : 's'}`;
      return `“${h.name}” (${what})`;
    })
    .join(', ');
  // *steps* or *parts*, whichever the names actually cover (G3). A part is not
  // a step, and a line that says otherwise is the reading line promising an act
  // the landing does not make.
  const covering = hits.some((h) => h.partIds?.length) ? 'parts' : 'steps';

  // A colour word ASKS for something when the phrase also says so — a paint
  // saying, or the plain copula a hand uses (*the tops are red*). A colour
  // word alone is a description, and it falls through to the rows below.
  const lower = t.toLowerCase();
  const colour = colourIn(t, scope.colours);
  const asks = SAYINGS.paint.some((p) => lower.includes(p)) || /\b(is|are|should be|go)\b/.test(lower);
  if (colour && asks) {
    return reading(
      'paint',
      hits,
      `${said} painted ${colour} — the material is a word bound to those ${covering}, tier 1`,
      { colour }
    );
  }

  const change = changeIn(t);
  if (change) {
    return reading('regen', hits, `${said} made ${change} — only those ${covering} are asked for again, the rest is fixed`, { change });
  }

  if (SAYINGS.drop.some((p) => t.toLowerCase().includes(p))) {
    return reading(
      'drop',
      hits,
      covering === 'parts'
        ? `${said} unsaid — their claims come out of the hull, one version each, tier 1`
        : `${said} taken out of the tree — a new version without them, tier 1`
    );
  }

  if (SAYINGS.regen.some((p) => words(t).includes(p))) {
    return reading('regen', hits, `${said} asked for again — the rest is fixed`, { change: 'different' });
  }

  return {
    unread: t,
    reasoning:
      `${said} is a name this space knows, but nothing in “${t}” says what to do with it — ` +
      `the table reads a colour word (paint), a change word (${Object.keys(CHANGES).slice(0, 4).join(', ')}, …) ` +
      `or a way of saying remove`,
  };
}

/** One line for the field's reading line. */
export function describePhrase(r: PhraseReading): string {
  const what =
    r.verb === 'paint'
      ? `paint ${r.names.join(', ')} ${r.colour}`
      : r.verb === 'drop'
        ? `remove ${r.names.join(', ')}`
        : `regen ${r.names.join(', ')}${r.change && r.change !== 'different' ? ` — ${r.change}` : ''}`;
  const n = r.stepIds.length + r.partIds.length;
  const kind = r.partIds.length && !r.stepIds.length ? 'part' : 'step';
  return `${what} · ${n} ${kind}${n === 1 ? '' : 's'}`;
}

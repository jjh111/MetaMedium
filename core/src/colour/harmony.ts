// Where a hue is placed (V1-SPEC KN3a): the lens, and the acts that place hues in it.
//
// HUE IS THE KIND AND ITS KIN. A kind takes the hue its person names; else it goes where it is easiest to tell apart
// from every kind already held — not where the wheel has the widest gap, because at one lightness a deuteranope can
// lose two hues 180° apart. The score is the least OKLab distance to each held kind, for typical sight first and
// each colour-blind simulation weighted below it, on both grounds, less a penalty for standing near a colour the
// chrome keeps for itself; scores that tie within TIE are settled by which hue the kind's NAME leans toward, so the
// same name leans the same way everywhere.
//
// Relations decide the rest. *x is a kind of y*: x keeps y's hue (siblings fan a little either side) and is drawn
// a step toward the ground. *x is kin to y*: x is placed beside y, on the side that stays most distinct. *x opposes
// y*: across the wheel. Who moves is settled by the relation: never a hue the person said, else the LATER kind;
// a pair made by the one act is placed together, where both stand most apart from the rest.
//
// THE ACT KEEPS THE HUE. A hue is chosen once, in the act that made or related the kind, and nothing placed later
// moves it, so nothing cascades. A kind placed against another is held RELATIVE to it — its anchor and an offset —
// and follows when that anchor's hue changes, which only its person (a recolour) or a relation can do. Lightness and
// chroma are never held: they are worked out afresh for whichever ground is showing (scale.ts). `applyAct` hands
// back what an act decided (`held`), and `holdKind` puts it back without placing a thing, which is how a log will
// rebuild the board: the choice, made under a palette, is the act's and not the palette's.
//
// Pure: a lens is plain data (kinds in the order made, and the relations said), a palette is a parameter, and
// nothing here reads a clock, a random number or a file. Ported from the specimen; the sentences are its own.
import { hueDistance, normHue } from './oklch';
import type { Rgb } from './oklch';
import { VISIONS, simulateVision, oklabDistance } from './access';
import type { Vision } from './access';
import { DEFAULT_PALETTE, GROUND_NAMES, DEPTHS_DRAWN, colourOf } from './scale';
import type { Palette } from './scale';
import { hueOfWord } from './names';

// ---- the lens ----------------------------------------------------------------------

/** How a kind's hue was chosen: placed where it is most distinct, said by its person, or held relative to another kind. */
export type KindSource = 'placed' | 'said' | 'relative';
/** How a kind was placed against another: it is a kind of it, kin to it, or opposes it. */
export type KindRel = 'sub' | 'kin' | 'opposes';

export interface Kind {
  name: string;
  /** Where it stands on the wheel. For a relative kind this is derived from its anchor, every time a hue changes. */
  hue: number;
  source: KindSource;
  /** Steps down a family: 0 for a kind of nothing, one more than its parent's otherwise. Derived. */
  depth: number;
  /** When it was made; kinds are read, placed against and given patterns in this order. */
  order: number;
  /** The kind it is a kind of, if any. */
  parent: string | null;
  /** The kind it was placed against, if relative; its hue is the anchor's plus `offset`. */
  anchor: string | null;
  offset: number;
  rel: KindRel | null;
  /** The colour word (or hex) its person gave it, when `source` is 'said'. */
  word?: string;
}

/** A relation said between two kinds that is kept in their hues: sub-kinds are kept in `parent`. */
export interface Relation {
  a: string;
  b: string;
  rel: 'kin' | 'opposes';
}

/** The person's kinds in the order made, and the relations said between them. Plain data. */
export interface Lens {
  kinds: Map<string, Kind>;
  rels: Relation[];
  /** The order the next kind will be made at. */
  order: number;
}

export const emptyLens = (): Lens => ({ kinds: new Map(), rels: [], order: 0 });

/** The kinds in the order they were made. */
export const kindsOf = (lens: Lens): Kind[] => [...lens.kinds.values()].sort((x, y) => x.order - y.order);

/** What a person says: a kind is made (with a colour, or placed), or related to another. */
export type KindAct =
  | { act: 'say'; a: string; word?: string }
  | { act: KindRel; a: string; b: string };

/** What one act decided about one kind, as the act's own record: enough to hold the kind again without placing it. */
export interface KindHold {
  name: string;
  source: KindSource;
  /** The hue chosen. For a relative kind it is only what the kind stood at; it follows its anchor. */
  hue: number;
  word?: string;
  parent: string | null;
  anchor: string | null;
  offset: number;
  rel: KindRel | null;
  order: number;
}

export interface ActResult {
  /** The sentence the board says about what the act did. */
  said: string;
  /** Every kind the act made or changed, as it left it, in the order made. */
  held: KindHold[];
  /** The relation the act kept between two kinds, if it kept one. */
  related: Relation | null;
  /** The kinds that were already held and stand at another hue now: the one recoloured or re-placed, and what follows it. */
  moved: string[];
}

// ---- what placing weighs ----------------------------------------------------------------

/** How much each way of seeing counts toward a new hue's room: typical sight first, the simulations below it. */
const VISION_WEIGHT: Readonly<Record<Vision, number>> = { typical: 1, protan: 0.35, deutan: 0.35, tritan: 0.15 };
/** A hue this near a colour the chrome keeps is leaned away from … */
const SIGNAL_REACH = 12;
/** … by this much of a score, at most, at the colour itself. */
const SIGNAL_WEIGHT = 0.02;
/** Scores within this are a tie, and the name's lean decides. */
const TIE = 0.002;
/** A hue the person named this near a chrome colour is told so. */
const SIGNAL_NEAR = 14;
/** Hues between these (yellows and the greens that lean on them) cannot read when pale on paper, and are drawn darker. */
const PALE_ON_PAPER = { from: 80, to: 135 } as const;

/** Kin are placed this many degrees from what they are kin to … */
const KIN_FROM = 26;
const KIN_TO = 45;
/** … nearest this, which costs nothing, and a little more for every degree away. */
const KIN_IDEAL = 32;
const KIN_COST = 0.001;
/** Opposites are placed across the wheel, up to this many degrees either side of straight across … */
const OPPOSE_SPREAD = 20;
const OPPOSE_COST = 0.0015;
/** … and a pair made by one act is searched at every PAIR_STEP degrees, kin at these offsets, opposites at these. */
const PAIR_STEP = 2;
const PAIR_KIN = [-40, -32, -26, 26, 32, 40];
const PAIR_OPPOSE = [164, 172, 180, 188, 196];
const PAIR_COST = 0.0015;
const PAIR_TIE = 1e-9;
/** A kind of something fans off its parent's hue by these, in the order siblings are made. */
const FAN = [0, 28, -28, 56, -56, 84, -84];
/** Kinds the person said are kin or opposed read as that when their hues stand this near or this far apart. */
const READS_AS_KIN = 45;
const READS_AS_OPPOSITES = 150;

// ---- a hue's place on the wheel ---------------------------------------------------------

/** A name's lean: FNV-1a, to a degree, so the same name leans the same way on every machine. */
export function nameHue(name: string): number {
  let x = 2166136261;
  for (const ch of name) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619); }
  return (x >>> 0) % 360;
}

/** What standing near a colour the chrome keeps costs a hue: nothing 12° away, the most at the colour itself. */
export const signalPenalty = (hue: number, palette: Palette = DEFAULT_PALETTE): number =>
  palette.signals.reduce((p, s) => p + Math.max(0, SIGNAL_REACH - hueDistance(hue, s.hue)) / SIGNAL_REACH * SIGNAL_WEIGHT, 0);

/** The said colour at a hue and depth on each ground, kept for the palette: placing asks for the same ones again and again. */
const SEEN_MAX = 20000;
const seenBy = new WeakMap<Palette, Map<string, Rgb[]>>();
function seen(hue: number, depth: number, palette: Palette): Rgb[] {
  let cache = seenBy.get(palette);
  if (!cache) seenBy.set(palette, (cache = new Map()));
  const d = Math.min(depth, DEPTHS_DRAWN);
  const key = hue + ':' + d;                                 // the exact hue: a cache must not decide a score
  let colours = cache.get(key);
  if (!colours) {
    colours = GROUND_NAMES.map(g => colourOf({ hue, depth: d }, g, 'said', palette).rgb);
    if (cache.size >= SEEN_MAX) cache.clear();
    cache.set(key, colours);
  }
  return colours;
}

/** The least distance this eye sees between two kinds' colours, on either ground. */
function apartness(A: readonly Rgb[], B: readonly Rgb[], v: Vision): number {
  let min = Infinity;
  for (let gi = 0; gi < A.length; gi++) min = Math.min(min, oklabDistance(simulateVision(A[gi], v), simulateVision(B[gi], v)));
  return min;
}

/** A place to try: a hue, and optionally the offset it is from its anchor and what standing there costs. */
export interface Candidate {
  hue: number;
  off?: number;
  cost?: number;
}
export interface Placed extends Candidate {
  /** Room to be told apart from every kind held, less the chrome's penalty and the candidate's own cost. */
  score: number;
  room: number;
}

/**
 * The best of the candidates: the one easiest to tell apart from `others` for every way of seeing on both grounds,
 * less standing near the chrome's colours and the candidate's cost; a tie within TIE goes to the hue nearest
 * `prefer`. `depth` is the step down a family the kind will be drawn at.
 */
export function placeHue(candidates: readonly Candidate[], others: readonly { hue: number; depth: number }[], prefer: number, depth = 0, palette: Palette = DEFAULT_PALETTE): Placed {
  const theirs = others.map(o => seen(o.hue, o.depth, palette));
  let best: Placed | null = null;
  for (const c of candidates) {
    const mine = seen(c.hue, depth, palette);
    let room = 0;
    for (const v of VISIONS) room += VISION_WEIGHT[v] * (theirs.length ? Math.min(...theirs.map(t => apartness(mine, t, v))) : 1);
    const score = room - signalPenalty(c.hue, palette) - (c.cost || 0);
    if (!best || score > best.score + TIE ||
      (Math.abs(score - best.score) <= TIE && hueDistance(c.hue, prefer) < hueDistance(best.hue, prefer))) best = { ...c, score, room };
  }
  return best as Placed;
}

// ---- following an anchor ------------------------------------------------------------------

/** A kind's hue: its own if placed or said, else its anchor's plus the offset it was placed at. */
function resolveHue(lens: Lens, k: Kind, seenNames = new Set<string>()): number {
  if (k.source !== 'relative') return k.hue;
  if (seenNames.has(k.name)) return k.hue;
  seenNames.add(k.name);
  const a = lens.kinds.get(k.anchor as string);
  return a ? normHue(resolveHue(lens, a, seenNames) + k.offset) : k.hue;
}

/** Hues and depths after a change: every relative kind follows its anchor again, every kind counts its parents. */
function refresh(lens: Lens): void {
  for (const k of lens.kinds.values()) k.hue = resolveHue(lens, k);
  for (const k of lens.kinds.values()) {
    let d = 0, p = k.parent;
    const seenNames = new Set([k.name]);
    while (p && !seenNames.has(p)) { seenNames.add(p); d++; p = lens.kinds.get(p)?.parent ?? null; }
    k.depth = d;
  }
}

/** Whether k's hue follows target's, through any chain of anchors. */
function dependsOn(lens: Lens, k: Kind | undefined, target: string): boolean {
  const seenNames = new Set<string>();
  while (k && k.source === 'relative' && !seenNames.has(k.name)) {
    if (k.anchor === target) return true;
    seenNames.add(k.name);
    k = lens.kinds.get(k.anchor as string);
  }
  return false;
}

/** A kind and every kind whose hue follows it: what a recolour moves. */
export const familyOf = (lens: Lens, name: string): Kind[] => [...lens.kinds.values()].filter(k => k.name === name || dependsOn(lens, k, name));
const othersThan = (lens: Lens, names: Set<string>): Kind[] => [...lens.kinds.values()].filter(k => !names.has(k.name));

// ---- the acts -----------------------------------------------------------------------------

function newKind(lens: Lens, name: string): Kind {
  return { name, hue: 0, source: 'placed', depth: 0, order: lens.order++, parent: null, anchor: null, offset: 0, rel: null };
}

/** A kind made by its first use, placed where it is most distinct from every kind held. */
function make(lens: Lens, name: string, palette: Palette): { k: Kind; made: boolean; why: string } {
  const held = lens.kinds.get(name);
  if (held) return { k: held, made: false, why: '' };
  const k = newKind(lens, name);
  const others = [...lens.kinds.values()];
  const wheel: Candidate[] = [];
  for (let h = 0; h < 360; h += 1) wheel.push({ hue: h });
  const best = placeHue(wheel, others, nameHue(name), 0, palette);
  k.hue = best.hue;
  lens.kinds.set(name, k);
  const near = others.length ? others.reduce((a, o) => (hueDistance(o.hue, best.hue) < hueDistance(a.hue, best.hue) ? o : a)) : null;
  const gap = near ? `the most distinct place left (${Math.round(hueDistance(near.hue, best.hue))}° from ${near.name})` : 'the first kind; its name leans it there';
  return { k, made: true, why: `${name} → ${Math.round(k.hue)}°, ${gap}` };
}

/** *it's an idea*, with or without a colour: makes the kind, or gives an existing kind a colour (a recolour). */
function say(lens: Lens, name: string, word: string | undefined, palette: Palette): string {
  const named = hueOfWord(word);
  if (named) {
    // The person's hue: the kind is made at it, and there is nothing to place.
    let k = lens.kinds.get(name);
    if (!k) lens.kinds.set(name, (k = newKind(lens, name)));
    k.source = 'said'; k.hue = named.hue; k.word = named.word; k.anchor = null; k.offset = 0;
    refresh(lens);
    const sig = palette.signals.find(s => hueDistance(s.hue, named.hue) < SIGNAL_NEAR);
    const pale = named.hue > PALE_ON_PAPER.from && named.hue < PALE_ON_PAPER.to;
    return `${name} → ${Math.round(named.hue)}°, your ${named.word}` +
      (pale ? '; on paper a yellow is drawn as dark as words need, ochre or olive, and on the dark ground it is yellow' : '') +
      (sig ? `; it stands by the chrome's colour for ${sig.name} (${Math.round(hueDistance(sig.hue, named.hue))}° away) — on ink it means ${name}` : '');
  }
  const { made, why } = make(lens, name, palette);
  if (!word) return made ? why : `${name} is already a kind`;
  return `${made ? why + '; ' : ''}“${word}” is no colour this space knows${/gr[ae]y|black|white/.test(word) ? ' — a kind takes a hue, and grey, black and white have none' : ''}`;
}

/** *a is a kind of b*, *a is kin to b*, *a opposes b*. */
function relate(lens: Lens, a: string, b: string, rel: KindRel, palette: Palette): { said: string; related?: Relation } {
  const A = make(lens, a, palette), B = make(lens, b, palette);
  const ka = A.k, kb = B.k;
  if (a === b) return { said: `${a} cannot be related to itself` };

  if (rel === 'sub') {
    if (dependsOn(lens, kb, a) || kb.parent === a) return { said: `${b} already hangs from ${a}` };
    ka.parent = b;
    if (ka.source === 'said') { refresh(lens); return { said: `${a} keeps your ${ka.word}; as a kind of ${b} it is drawn a step toward the ground` }; }
    const siblings = [...lens.kinds.values()].filter(k => k.parent === b && k !== ka && k.anchor === b && k.rel === 'sub');
    const used = new Set(siblings.map(s => Math.round(s.offset)));
    const offset = FAN.find(o => !used.has(o)) ?? 0;
    Object.assign(ka, { source: 'relative', anchor: b, offset, rel: 'sub' });
    refresh(lens);
    return { said: `${a} is a kind of ${b}: ${b}'s hue${offset ? ` ${offset > 0 ? '+' : '−'}${Math.abs(offset)}°` : ''}, a step toward the ground` };
  }

  // Kin or opposed: who moves? Never a hue the person said; else the later kind.
  lens.rels = lens.rels.filter(r => !((r.a === a && r.b === b) || (r.a === b && r.b === a)));
  const related: Relation = { a, b, rel };
  lens.rels.push({ ...related });
  let mover = kb, anchor = ka;
  if (kb.source === 'said' && ka.source !== 'said') { mover = ka; anchor = kb; }
  else if (ka.source !== 'said' && kb.source !== 'said' && ka.order > kb.order) { mover = ka; anchor = kb; }
  const apart = Math.round(hueDistance(ka.hue, kb.hue));
  if (mover.source === 'said') {
    return { said: `you gave ${a} and ${b} their colours; they stand ${apart}° apart, so they read as ${apart >= READS_AS_OPPOSITES ? 'opposites' : apart <= READS_AS_KIN ? 'kin' : 'neither kin nor opposites'}`, related };
  }
  if (dependsOn(lens, anchor, mover.name)) return { said: `${anchor.name}'s hue already follows ${mover.name}'s; nothing moved`, related };
  const fam = new Set(familyOf(lens, mover.name).map(k => k.name));
  fam.add(anchor.name);
  for (const k of familyOf(lens, anchor.name)) fam.add(k.name);
  const others = othersThan(lens, fam);

  if (A.made && B.made) {
    // Both new: place the pair together, where both stand most apart from the rest.
    const offs = rel === 'kin' ? PAIR_KIN : PAIR_OPPOSE;
    const ideal = rel === 'kin' ? KIN_IDEAL : 180;
    let best: { h: number; off: number; score: number } | null = null;
    for (let h = 0; h < 360; h += PAIR_STEP) {
      for (const off of offs) {
        const one = placeHue([{ hue: h }], others, nameHue(anchor.name), 0, palette);
        const two = placeHue([{ hue: normHue(h + off) }], others, nameHue(mover.name), 0, palette);
        const score = Math.min(one.score, two.score) - Math.abs(Math.abs(off) - ideal) * PAIR_COST;
        if (!best || score > best.score + PAIR_TIE) best = { h, off, score };
      }
    }
    const at = best as { h: number; off: number };
    anchor.hue = at.h;
    Object.assign(mover, { source: 'relative', anchor: anchor.name, offset: at.off, rel });
    refresh(lens);
    return {
      said: rel === 'kin'
        ? `${a} is kin to ${b}: placed together, ${Math.abs(at.off)}° apart, where both stand most distinct`
        : `${a} opposes ${b}: placed together across the wheel, ${Math.round(hueDistance(mover.hue, anchor.hue))}° apart`,
      related,
    };
  }

  const cands: Candidate[] = [];
  if (rel === 'kin') {
    for (let d = KIN_FROM; d <= KIN_TO; d++) for (const s of [1, -1]) cands.push({ hue: normHue(anchor.hue + s * d), off: s * d, cost: Math.abs(d - KIN_IDEAL) * KIN_COST });
  } else {
    for (let e = -OPPOSE_SPREAD; e <= OPPOSE_SPREAD; e++) cands.push({ hue: normHue(anchor.hue + 180 + e), off: 180 + e, cost: Math.abs(e) * OPPOSE_COST });
  }
  const best = placeHue(cands, [...others, anchor], nameHue(mover.name), mover.depth, palette);
  Object.assign(mover, { source: 'relative', anchor: anchor.name, offset: best.off, rel });
  refresh(lens);
  return {
    said: rel === 'kin'
      ? `${a} is kin to ${b}: ${mover.name} ${Math.abs(Math.round(best.off as number))}° beside ${anchor.name}, on the side that stays most distinct`
      : `${a} opposes ${b}: ${mover.name} across the wheel from ${anchor.name}, ${Math.round(hueDistance(mover.hue, anchor.hue))}° apart`,
    related,
  };
}

/** What an act decided about a kind, as one string: two kinds were decided alike when these are equal. A relative kind's hue is not one of them. */
const decisionOf = (k: Kind): string => JSON.stringify([k.source, k.source === 'relative' ? null : k.hue, k.word ?? null, k.parent, k.anchor, k.offset, k.rel, k.order]);

function holdOf(k: Kind): KindHold {
  const h: KindHold = { name: k.name, source: k.source, hue: k.hue, parent: k.parent, anchor: k.anchor, offset: k.offset, rel: k.rel, order: k.order };
  if (k.word !== undefined) h.word = k.word;
  return h;
}

/**
 * Say an act on a lens. A kind is made by its first use (given the colour named, or placed where it is most
 * distinct); a kind of, kin and opposite relate two kinds and place the later one; a colour for a kind already held
 * recolours it. The lens is changed; the sentence says what was done, `held` is what each kind the act made or
 * changed was left as, and `moved` the kinds already held that stand at another hue now — the kind itself and what
 * follows it, and never anything else.
 */
export function applyAct(lens: Lens, act: KindAct, palette: Palette = DEFAULT_PALETTE): ActResult {
  const before = new Map(kindsOf(lens).map(k => [k.name, { hue: k.hue, decision: decisionOf(k) }]));
  const r = act.act === 'say' ? { said: say(lens, act.a, act.word, palette), related: undefined } : relate(lens, act.a, act.b, act.act, palette);
  const held: KindHold[] = [], moved: string[] = [];
  for (const k of kindsOf(lens)) {
    const was = before.get(k.name);
    if (!was || was.decision !== decisionOf(k)) held.push(holdOf(k));
    if (was && was.hue !== k.hue) moved.push(k.name);
  }
  return { said: r.said, held, related: r.related ?? null, moved };
}

/**
 * Hold a kind as an act left it, with no placing: made if it is new, otherwise changed to what the act decided.
 * Followers and depths are found again. This is how a board is rebuilt from its acts.
 */
export function holdKind(lens: Lens, h: KindHold): void {
  const k = lens.kinds.get(h.name) ?? { name: h.name, hue: h.hue, source: h.source, depth: 0, order: h.order, parent: null, anchor: null, offset: 0, rel: null } as Kind;
  k.source = h.source; k.hue = h.hue; k.parent = h.parent; k.anchor = h.anchor; k.offset = h.offset; k.rel = h.rel; k.order = h.order;
  if (h.word !== undefined) k.word = h.word; else delete k.word;
  lens.kinds.set(h.name, k);
  lens.order = Math.max(lens.order, h.order + 1);
  refresh(lens);
}

/** Hold a relation as an act kept it: said again, it replaces the one between the same two kinds. */
export function holdRelation(lens: Lens, r: Relation): void {
  lens.rels = lens.rels.filter(x => !((x.a === r.a && x.b === r.b) || (x.a === r.b && x.b === r.a)));
  lens.rels.push({ ...r });
}

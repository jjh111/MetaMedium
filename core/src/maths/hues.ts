// Colour for relations (MATHS-SPEC §5, M17): one quantity has one colour wherever it stands.
//
// A side, an angle, a radius, a name, a function: each quantity a board speaks of is given a HUE, and its mark's
// halo, its ghost, its chip and the number written for it all take it, so a symbol is linked to its picture by
// sight. This is that hue, over the colour space (KN3a, `colour/`): pure, no model, nothing logged — a hue is
// DERIVED from the quantities the board has, found again whenever they change.
//
// Two kinds of quantity, two ways to a hue:
//
//   - **The roles of a right triangle are fixed** (John, 8 Oct 2026): *opposite*, *adjacent*, *hypotenuse* and *the
//     angle* have one hue each on every board, so a student learns that opposite is always that colour (SOH CAH
//     TOA, M14). They are one table, `ROLE_HUES`, chosen once — the four that stand furthest apart for every eye on
//     both grounds, none within `ROLE_SIGNAL_MARGIN` of a colour the chrome keeps for itself — and the table is
//     checked by its test, not trusted. On a board where one would look too close to a kind or a quantity already
//     there it is NUDGED the least that clears it, and the nudge is SAID (`nudged.said`: *opposite, moved from its
//     usual hue beside “water”*), in the fill-in's reason.
//   - **Every other quantity is placed for the board**: where it is easiest to tell from the board's kinds, the
//     four roles (reserved on every board) and the quantities already placed — typical sight first, the three
//     colour-blind simulations below it, on both grounds (`placeHue`). Deterministic: the keys sorted (numbers
//     as numbers, so a figure drawn later sorts later and an earlier quantity's hue does not move when a later
//     one arrives), the same board the same hues, whatever order they are asked in. Where colour alone cannot
//     tell two apart for some eye, the later takes a second channel (`channel`, KN3a's `channels`) — a dash
//     pattern, never lightness, which is depth.
//
// Certainty is chroma (`quantityColour`): a ghost is offered, muted; a written value is said, full.
import {
  DEFAULT_PALETTE,
  GROUND_NAMES,
  LOOK_ALIKE,
  VISIONS,
  channels,
  colourOf,
  hueDistance,
  nameHue,
  normHue,
  oklabDistance,
  placeHue,
  simulateVision,
} from '../colour';
import type { Candidate, Certainty, Channel, Colour, Ground, Palette, Rgb } from '../colour';

// ===== The roles of a right triangle =====

export const ROLES = ['opposite', 'adjacent', 'hypotenuse', 'angle'] as const;
export type Role = (typeof ROLES)[number];

/**
 * The four hues, in degrees on the OKLCH wheel — the same on every board.
 *
 * Chosen by searching every hue at every degree for the four whose two least-apart colours stand furthest apart
 * for every eye (typical sight, and Machado's protan, deutan and tritan) on both grounds, with typical sight kept
 * at least 0.10 OKLab apart for every pair, and none nearer than `ROLE_SIGNAL_MARGIN` to a signal colour of the
 * chrome. At one lightness no four hues reach `LOOK_ALIKE` for every eye (the best is 0.054); the closest pair is
 * the one a second channel is for (`roleChannels`). The test (`hues.test.ts`) measures all of it again.
 */
export const ROLE_HUES: Readonly<Record<Role, number>> = Object.freeze({ opposite: 191, adjacent: 111, hypotenuse: 8, angle: 314 });

/** A role hue stands at least this far (degrees) from every signal colour of the chrome, so it never reads as a state. */
export const ROLE_SIGNAL_MARGIN = 18;
/**
 * Two colours this near (OKLab) to typical sight read as one: a role is nudged off a kind that stands this near it.
 * (Typical sight, because the other eyes lose whole stretches of the wheel — no hue within 60° of another clears
 * 0.06 for a tritanope — and where colour cannot tell two apart for some eye a second channel does, `quantityHues`.)
 */
export const CLASH = LOOK_ALIKE;
/** No two roles stand nearer than this under ANY eye: the table's own floor (it reaches 0.054 at best). */
export const ROLE_FLOOR = 0.05;
/** A role is nudged no more than this many degrees; if nothing clears within it, it stays and the sentence says so. */
export const NUDGE_MAX = 60;
/** Hues are searched at every this many degrees, then the best is refined a degree at a time within this many either side. */
export const PLACE_STEP = 6;
export const PLACE_REFINE = PLACE_STEP - 1;
/**
 * The most quantities placed by search. Past this many nobody tells hues apart by colour anyway (the second
 * channel is what is left), and the search costs more each: later keys take the hue their name leans toward,
 * and the channel says what colour cannot.
 */
export const PLACE_MAX = 32;

/** A quantity key that names a role rather than a drawing's value: `role:hypotenuse`. */
export const ROLE_PREFIX = 'role:';
export const roleKey = (role: Role): string => ROLE_PREFIX + role;
export const roleOfKey = (key: string): Role | null => {
  if (!key.startsWith(ROLE_PREFIX)) return null;
  const r = key.slice(ROLE_PREFIX.length);
  return (ROLES as readonly string[]).includes(r) ? (r as Role) : null;
};

// ===== What a hue stands against =====

/**
 * A kind (or any quantity with a hue already) that a role must not look like: its name for the sentence, its hue,
 * its depth (steps down a family). The board's kinds, once they are on the board (KN1), come through `boardKinds`.
 */
export interface HueKind {
  name: string;
  hue: number;
  depth?: number;
}

/**
 * The kinds a board has, as hues. None today — the kind event (KN1) is queued — so every role stands at its usual
 * hue on a real board; the parameter is how a board with kinds, and the nudge, are asked and tested.
 */
export function boardKinds(_state?: unknown): HueKind[] {
  return [];
}

// ===== Seeing a hue =====

type Seen = Rgb[]; // the colour on each ground, in GROUND_NAMES order
const seenBy = new WeakMap<Palette, Map<string, Seen>>();
function seen(hue: number, depth: number, palette: Palette): Seen {
  let cache = seenBy.get(palette);
  if (!cache) seenBy.set(palette, (cache = new Map()));
  const key = `${hue}:${depth}`;
  let got = cache.get(key);
  if (!got) {
    got = GROUND_NAMES.map((g) => colourOf({ hue, depth }, g, 'said', palette).rgb);
    cache.set(key, got);
  }
  return got;
}

/** The least OKLab distance between two hues under any eye on either ground — the figure that says whether they look alike. */
export function apartness(a: { hue: number; depth?: number }, b: { hue: number; depth?: number }, palette: Palette = DEFAULT_PALETTE): number {
  const A = seen(a.hue, a.depth ?? 0, palette), B = seen(b.hue, b.depth ?? 0, palette);
  let least = Infinity;
  for (const v of VISIONS) for (let g = 0; g < A.length; g++) least = Math.min(least, oklabDistance(simulateVision(A[g], v), simulateVision(B[g], v)));
  return least;
}

/** The distance typical sight sees between two hues, the nearer of the two grounds. */
export function typicalApartness(a: { hue: number; depth?: number }, b: { hue: number; depth?: number }, palette: Palette = DEFAULT_PALETTE): number {
  const A = seen(a.hue, a.depth ?? 0, palette), B = seen(b.hue, b.depth ?? 0, palette);
  let least = Infinity;
  for (let g = 0; g < A.length; g++) least = Math.min(least, oklabDistance(A[g], B[g]));
  return least;
}

// ===== The role hues on a board =====

export interface RoleHue {
  role: Role;
  /** The hue it stands at here: its usual one unless it was nudged. */
  hue: number;
  /** Its usual hue (`ROLE_HUES`). */
  usual: number;
  /** Set when the usual hue looked too like something already there and it was moved. */
  nudged?: {
    /** Degrees moved (signed); 0 when nothing within `NUDGE_MAX` cleared. */
    by: number;
    /** What it stood too near: the kind's name. */
    beside: string;
    /** In words, for the fill-in's reason: *opposite, moved from its usual hue beside “water”*. */
    said: string;
  };
}

/** What a hue is held to clear, by `CLASH` to typical sight: the kinds (and fixed quantities) already there, and the other roles at their own hues. */
function obstaclesFor(role: Role, kinds: readonly HueKind[]): { name: string; hue: number; depth: number; isRole: boolean }[] {
  return [
    ...kinds.map((k) => ({ name: k.name, hue: k.hue, depth: k.depth ?? 0, isRole: false })),
    ...ROLES.filter((r) => r !== role).map((r) => ({ name: r, hue: ROLE_HUES[r], depth: 0, isRole: true })),
  ];
}

/**
 * Where a role stands on a board with these kinds. Its usual hue when nothing there looks like it; otherwise the
 * nearest hue — the least move, one degree at a time either way — that clears every kind and every other role by
 * `CLASH`, and the nudge said.
 */
export function roleHue(role: Role, kinds: readonly HueKind[] = [], palette: Palette = DEFAULT_PALETTE): RoleHue {
  const usual = ROLE_HUES[role];
  const against = obstaclesFor(role, kinds);
  const clashing = (h: number) => against.find((o) => typicalApartness({ hue: h }, o, palette) < CLASH);
  // Only a kind moves a role off its table: the roles stand where they stand (the table is checked, not searched here).
  const nearest = kinds
    .map((k) => ({ k, d: typicalApartness({ hue: usual }, k, palette) }))
    .filter((x) => x.d < CLASH)
    .sort((a, b) => a.d - b.d)[0]?.k;
  if (!nearest) return { role, hue: usual, usual };
  const beside = nearest.name;
  for (let d = 1; d <= NUDGE_MAX; d++) {
    for (const sign of [1, -1]) {
      const h = normHue(usual + sign * d);
      if (!clashing(h)) {
        return { role, hue: h, usual, nudged: { by: sign * d, beside, said: `${role}, moved from its usual hue beside “${beside}”` } };
      }
    }
  }
  return { role, hue: usual, usual, nudged: { by: 0, beside, said: `${role}, looks like “${beside}” and could not be moved clear of it` } };
}

// ===== A quantity's hue =====

export interface QuantityHue {
  key: string;
  hue: number;
  depth: number;
  /** A role's hue (fixed, maybe nudged) or one placed for the board. */
  source: 'role' | 'placed';
  role?: Role;
  nudged?: RoleHue['nudged'];
  /** The second channel that tells it from a quantity it looks like for some eye; `solid` when colour tells it apart. */
  channel: Channel;
}

export interface HueOptions {
  /** Which of the keys is a role's quantity, by key: a right triangle's hypotenuse is `hypotenuse`. */
  roles?: ReadonlyMap<string, Role>;
  /** The board's kinds: hues the roles are nudged off, and the quantities placed away from. */
  kinds?: readonly HueKind[];
  palette?: Palette;
}

/** Keys in the order a person made them: numbers as numbers, so `stroke:2` sorts before `stroke:10`. */
export function naturalCompare(a: string, b: string): number {
  const pa = a.split(/(\d+)/), pb = b.split(/(\d+)/);
  for (let i = 0; i < Math.min(pa.length, pb.length); i++) {
    if (pa[i] === pb[i]) continue;
    if (i % 2 === 1) return Number(pa[i]) - Number(pb[i]) || (pa[i] < pb[i] ? -1 : 1);
    return pa[i] < pb[i] ? -1 : 1;
  }
  return pa.length - pb.length;
}

/**
 * The hue of every quantity a board speaks of. The roles' quantities take their role's hue; the rest are placed,
 * in the natural order of their keys, each where it is easiest to tell from the kinds, the four roles and the
 * quantities placed before it. A pure function of the set of keys, the kinds and the role assignment — not of the
 * order they are asked in.
 */
export function quantityHues(keys: Iterable<string>, opts: HueOptions = {}): Map<string, QuantityHue> {
  const palette = opts.palette ?? DEFAULT_PALETTE;
  const kinds = opts.kinds ?? [];
  const sorted = [...new Set(keys)].sort(naturalCompare);
  const out = new Map<string, QuantityHue>();

  // The four roles are reserved on every board — a quantity placed here never looks like a role a student has learned.
  const roleHues = ROLES.map((r) => roleHue(r, kinds, palette));
  const reserved = roleHues.map((r) => ({ hue: r.hue, depth: 0 }));
  const held: { hue: number; depth: number }[] = [...kinds.map((k) => ({ hue: k.hue, depth: k.depth ?? 0 })), ...reserved];

  const wheel: Candidate[] = [];
  for (let h = 0; h < 360; h += PLACE_STEP) wheel.push({ hue: h });
  /** The best hue for a key: coarse over the wheel, then a degree at a time round the best. */
  const place = (key: string): number => {
    const prefer = nameHue(key);
    const coarse = placeHue(wheel, held, prefer, 0, palette);
    const fine: Candidate[] = [];
    for (let d = -PLACE_REFINE; d <= PLACE_REFINE; d++) fine.push({ hue: normHue(coarse.hue + d) });
    return placeHue(fine, held, prefer, 0, palette).hue;
  };

  let searched = 0;
  for (const key of sorted) {
    const role = opts.roles?.get(key) ?? roleOfKey(key);
    if (role) {
      const r = roleHues.find((x) => x.role === role)!;
      out.set(key, { key, hue: r.hue, depth: 0, source: 'role', role, ...(r.nudged ? { nudged: r.nudged } : {}), channel: 'solid' });
      continue;
    }
    const hue = searched++ < PLACE_MAX ? place(key) : nameHue(key);
    held.push({ hue, depth: 0 });
    out.set(key, { key, hue, depth: 0, source: 'placed', channel: 'solid' });
  }

  // Where colour cannot tell two apart for some eye the later takes a pattern: the four roles first, always, in their
  // own order (so a role's pattern is the same whichever roles a board happens to show), then the rest in the order
  // they were placed.
  const order = [
    ...roleHues.map((r) => ({ name: roleKey(r.role), hue: r.hue, depth: 0 })),
    ...sorted.map((k) => out.get(k)!).filter((q) => q.source === 'placed').map((q) => ({ name: q.key, hue: q.hue, depth: q.depth })),
  ].map((k, i) => ({ ...k, order: i }));
  const patterns = channels(order, undefined, palette);
  for (const q of out.values()) q.channel = patterns.get(q.role ? roleKey(q.role) : q.key)?.channel ?? 'solid';
  return out;
}

/** The four roles' patterns on a board with these kinds: which of the four a second channel tells from the one it looks like. */
export function roleChannels(kinds: readonly HueKind[] = [], palette: Palette = DEFAULT_PALETTE): Map<Role, Channel> {
  const hues = ROLES.map((r) => ({ r, h: roleHue(r, kinds, palette) }));
  const got = channels(hues.map((x, i) => ({ name: x.r, order: i, hue: x.h.hue, depth: 0 })), undefined, palette);
  return new Map(hues.map((x) => [x.r, got.get(x.r)!.channel]));
}

/** A quantity's colour for a ground: muted when it is only offered (a ghost), full when it is said (a written value, a chip). */
export function quantityColour(q: Pick<QuantityHue, 'hue' | 'depth'>, ground: Ground, certainty: Certainty = 'offered', palette: Palette = DEFAULT_PALETTE): Colour {
  return colourOf({ hue: q.hue, depth: q.depth }, ground, certainty, palette);
}

export { hueDistance };

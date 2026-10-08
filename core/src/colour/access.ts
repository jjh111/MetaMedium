// What an eye can tell apart (V1-SPEC KN3a): contrast, colour-blind sight, the distance between two lights, which
// pairs of kinds read as one, and the second channel that does the work colour cannot.
//
// Spacing hues by angle promises nothing. At one lightness a deuteranope can lose two hues set 180° apart, and past
// about eight kinds there are always pairs a dichromat cannot tell apart by colour. So every pair of kinds is
// measured — on both grounds, under typical sight and the three colour-blind simulations (Machado, Oliveira &
// Fernandes 2009, severity 1, applied in linear RGB) — and a pair closer than LOOK_ALIKE under any of them is given
// a second channel: the later kind takes the first pattern none of its look-alikes holds. That is the only thing
// done about it. Lightness means depth, so it is never spent on this, and a kind is never refused.
//
// Patterns are named here and drawn by whoever draws: a dash on a shape or a connector, a small mark on hover for
// writing. They are handed out in the order kinds were made, so a kind made later never changes an earlier kind's.
import { linearToOklab, relativeLuminance, contrastRatio } from './oklch';
import type { Rgb } from './oklch';
import { colourOf, GROUND_NAMES, DEFAULT_PALETTE } from './scale';
import type { Palette } from './scale';

// What a person can read: the light a colour gives and WCAG's ratio, kept with the conversions they are made of.
export { relativeLuminance, contrastRatio };

// ---- colour-blind sight ---------------------------------------------------------

/** The ways of seeing a colour is checked under, most eyes first. */
export const VISIONS = ['typical', 'protan', 'deutan', 'tritan'] as const;
export type Vision = (typeof VISIONS)[number];

type Matrix = readonly [readonly [number, number, number], readonly [number, number, number], readonly [number, number, number]];

/** Machado, Oliveira & Fernandes (2009), severity 1, for linear RGB: protanopia, deuteranopia, tritanopia. */
export const MACHADO: Readonly<Record<Exclude<Vision, 'typical'>, Matrix>> = Object.freeze({
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
});

/** Who each way of seeing is, in the words the board uses for them. */
export const WHO: Readonly<Record<Vision, string>> = Object.freeze({ typical: 'everyone', protan: 'protanopes', deutan: 'deuteranopes', tritan: 'tritanopes' });

/** Linear light as the given eye sees it (clamped to what a screen can show). Most eyes see it as it is. */
export function simulateVision(rgb: readonly number[], vision: Vision): Rgb {
  if (vision === 'typical') return [rgb[0], rgb[1], rgb[2]];
  return MACHADO[vision].map(r => Math.min(1, Math.max(0, r[0] * rgb[0] + r[1] * rgb[1] + r[2] * rgb[2]))) as Rgb;
}

/** The distance between two lights (linear) in OKLab, which is near enough to how far apart they look. */
export function oklabDistance(p: readonly number[], q: readonly number[]): number {
  const A = linearToOklab(p), B = linearToOklab(q);
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
}

// ---- which kinds read as one ------------------------------------------------------

/** OKLab distance under which two kinds read as one, for some eye. */
export const LOOK_ALIKE = 0.06;

/** What the pairs need to know of a kind: its name, when it was made, and where it stands. Any `Kind` is one. */
export interface AccessKind {
  name: string;
  order: number;
  hue: number;
  depth: number;
}

/** How far apart two kinds are under each way of seeing (the least over both grounds), and the least of those. */
export interface KindPair {
  a: string;
  b: string;
  by: Record<Vision, number>;
  min: number;
}

const inOrder = <K extends { order: number }>(kinds: readonly K[]): K[] => [...kinds].sort((x, y) => x.order - y.order);

/** Every pair of kinds, once, in the order made, with how far apart they are for every eye on either ground. */
export function distinctness(kinds: readonly AccessKind[], palette: Palette = DEFAULT_PALETTE): KindPair[] {
  const ks = inOrder(kinds);
  const drawn = ks.map(k => GROUND_NAMES.map(g => colourOf(k, g, 'said', palette).rgb));
  const pairs: KindPair[] = [];
  for (let i = 0; i < ks.length; i++) {
    for (let j = i + 1; j < ks.length; j++) {
      const by = {} as Record<Vision, number>;
      for (const v of VISIONS) {
        let min = Infinity;
        for (let gi = 0; gi < GROUND_NAMES.length; gi++) min = Math.min(min, oklabDistance(simulateVision(drawn[i][gi], v), simulateVision(drawn[j][gi], v)));
        by[v] = min;
      }
      pairs.push({ a: ks[i].name, b: ks[j].name, by, min: Math.min(...Object.values(by)) });
    }
  }
  return pairs;
}

// ---- the second channel -----------------------------------------------------------

/**
 * The patterns, in the order they are handed out: solid, then the specimen's four, then three more so that twelve
 * kinds and more can each be told from the kinds they look like (the specimen's five were not enough for twelve).
 */
export const CHANNELS = ['solid', 'dashed', 'dotted', 'dash-dot', 'long', 'dash-dot-dot', 'short', 'sparse'] as const;
export type Channel = (typeof CHANNELS)[number];

/** A kind's second channel: its pattern, the earlier kind it is most alike to, to whom, and whether it had to repeat one. */
export interface KindChannel {
  channel: Channel;
  /** The earlier kind it looks most like, or null when it looks like none. */
  alike: string | null;
  /** The eyes it looks alike to, in words (WHO). */
  who: string[];
  /** True when every pattern was held by a kind it looks alike to, so it takes the last and a look-alike has it too. Said, never silent. */
  repeats: boolean;
}

/**
 * The second channel of every kind. In the order made, a kind takes the first pattern none of its look-alikes
 * (earlier kinds closer than LOOK_ALIKE under some eye) holds, so kinds that tell apart share `solid`, and a kind
 * made later never changes an earlier one's. When the patterns run out the last is taken again and `repeats` says so.
 */
export function channels(kinds: readonly AccessKind[], pairs?: readonly KindPair[], palette: Palette = DEFAULT_PALETTE): Map<string, KindChannel> {
  const measured = pairs ?? distinctness(kinds, palette);
  const out = new Map<string, KindChannel>();
  for (const k of inOrder(kinds)) {
    const alike = measured
      .filter(p => p.min < LOOK_ALIKE && (p.a === k.name || p.b === k.name))
      .map(p => ({ other: p.a === k.name ? p.b : p.a, p }))
      .filter(x => out.has(x.other));
    const taken = new Set(alike.map(x => out.get(x.other)!.channel));
    const free = CHANNELS.find(c => !taken.has(c));
    const worst = alike.sort((x, y) => x.p.min - y.p.min)[0];
    out.set(k.name, {
      channel: free ?? CHANNELS[CHANNELS.length - 1],
      alike: worst ? worst.other : null,
      who: worst ? VISIONS.filter(v => worst.p.by[v] < LOOK_ALIKE).map(v => WHO[v]) : [],
      repeats: free === undefined,
    });
  }
  return out;
}

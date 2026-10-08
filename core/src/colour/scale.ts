// A kind's colour for a ground (V1-SPEC KN3a): its hue, its depth and its certainty, drawn as sRGB.
//
// The three axes each carry one meaning. HUE is which kind (and its kin) — the ground never moves it. LIGHTNESS is
// depth: each step down a family (insight is a kind of idea) keeps the parent's hue and moves a step toward the
// ground, lighter on paper and darker in the dark room; two steps are drawn, and deeper kinds share the second.
// CHROMA is how sure: a said kind is at the ground's full chroma (lowered only where sRGB cannot reach it), an
// offered kind a fixed share of that, at the same lightness. A suggestion is only a chip and has no colour here.
//
// And what is drawn must read. A colour is checked against its ground: words need WORDS_CONTRAST, and marks, which
// need only MARKS_CONTRAST, need no more. If it does not read, lightness moves toward the ink — darker on paper,
// lighter in the dark room — until it does, the hue untouched, and `moved` says how far. A person's own colour that
// cannot read as named (a pale yellow on paper) is therefore never refused: it keeps its hue, and is drawn as ochre
// or olive.
//
// The checking is of the DRAWN colour. The specimen measured a colour's contrast before the byte was rounded, so a
// deep kind on paper could be drawn a hair under the floor while the page said it was on it; here the light the hex
// gives is what is measured, and lightness keeps moving until that reads too.
//
// The palette is handed in. Core cannot read CSS, so the grounds, the hand's ink on each and the chrome's signal
// colours are a parameter; the defaults are brand/tokens.css's values, and palette.files.test.mjs fails the day a
// default and the file disagree. The bands (which lightness at which depth, which chroma) are this module's until
// they move into the tokens.
import { hexToLinear, linearToHex, linearToOklab, oklabToLch, inSrgb, relativeLuminance, contrastRatio, type Rgb } from './oklch';

/** The two grounds a kind is drawn on: paper, and the dark room. Their order is the order everything reads them in. */
export const GROUND_NAMES = ['paper', 'dark'] as const;
export type Ground = (typeof GROUND_NAMES)[number];
/** Said by the person, or offered by the canvas (nearness, a typed group): an offer is muted. */
export type Certainty = 'said' | 'offered';

/** An offered kind's chroma, as a share of a said kind's. */
export const OFFERED_SHARE = 0.38;
/** Contrast against the ground that words need (WCAG AA). What a kind is drawn at always clears it. */
export const WORDS_CONTRAST = 4.5;
/** Contrast that marks need. Anything that clears the words' floor clears this. */
export const MARKS_CONTRAST = 3;
/** Steps down a family that are drawn; deeper kinds share the last and take a second channel. */
export const DEPTHS_DRAWN = 2;
/** Lightness moves toward the ink in steps of this, to read … */
export const MOVE_STEP = 0.005;
/** … and never by more than this: a band that cannot read stops here, and the colour says what it came to. */
export const MOVE_MAX = 0.3;

/** One ground: its colour, the hand's ink on it, and the bands a kind is drawn in on it. */
export interface GroundSpec {
  /** The ground (--paper), as hex. */
  readonly ground: string;
  /** The hand's own ink on it (--stroke-hand), as hex. */
  readonly ink: string;
  /** OKLab lightness at depth 0, 1 and 2: a step down a family is a step toward the ground. */
  readonly L: readonly [number, number, number];
  /** OKLCH chroma of a said kind, before sRGB has its say. */
  readonly C: number;
  /** The sign of a step toward the ground: lighter on paper (1), darker in the dark room (-1). */
  readonly toward: 1 | -1;
}

/** A colour the chrome keeps for itself (read, confident, unsure, broken, a model's): never on the ink. */
export interface Signal {
  readonly name: string;
  readonly hex: string;
  /** Where it stands on the wheel, in degrees. A kind's hue leans away from these. */
  readonly hue: number;
}

export interface Palette {
  readonly grounds: Readonly<Record<Ground, GroundSpec>>;
  readonly signals: readonly Signal[];
}

/** What a page hands in, read from its tokens: any of it, and only what is hex (or a lightness, or a chroma) is taken. */
export interface PaletteInput {
  grounds?: Partial<Record<Ground, { ground?: string; ink?: string; L?: readonly number[]; C?: number }>>;
  signals?: readonly { name: string; hex: string }[] | null;
}

const HEX6 = /^#[0-9a-f]{6}$/i;
const hueOfHex = (hex: string): number => oklabToLch(linearToOklab(hexToLinear(hex)))[2];

function build(grounds: Record<Ground, GroundSpec>, signals: readonly { name: string; hex: string }[]): Palette {
  const frozen = {} as Record<Ground, GroundSpec>;
  for (const g of GROUND_NAMES) frozen[g] = Object.freeze({ ...grounds[g], L: Object.freeze([...grounds[g].L]) as unknown as GroundSpec['L'] });
  return Object.freeze({
    grounds: Object.freeze(frozen),
    signals: Object.freeze(signals.map(s => Object.freeze({ name: s.name, hex: s.hex, hue: hueOfHex(s.hex) }))),
  });
}

/**
 * brand/tokens.css's values: the grounds (--paper) and the hand's ink on each (--stroke-hand), light and dark; and
 * the chrome's signal colours, light (--sig-read, --sig-high, --sig-mid, --sig-low, --sig-model).
 */
export const DEFAULT_PALETTE: Palette = build(
  {
    paper: { ground: '#f8f5ef', ink: '#0c1a24', L: [0.44, 0.505, 0.57], C: 0.15, toward: 1 },
    dark: { ground: '#131315', ink: '#e3edf1', L: [0.8, 0.735, 0.67], C: 0.13, toward: -1 },
  },
  [
    { name: 'read', hex: '#1c5fb8' },
    { name: 'confident', hex: '#0b6f7d' },
    { name: 'unsure', hex: '#a3761c' },
    { name: 'broken', hex: '#a8493c' },
    { name: 'a model', hex: '#6b4fa8' },
  ],
);

const isBand = (L: unknown): L is [number, number, number] =>
  Array.isArray(L) && L.length === 3 && L.every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1);
const isChroma = (C: unknown): C is number => typeof C === 'number' && Number.isFinite(C) && C >= 0 && C <= 0.4;

/**
 * A palette from what a page read from its tokens, over a base (the defaults). A ground or ink that is not a hex,
 * a band that is not three lightnesses or a chroma that is not one, and a signal that is not a hex are left as
 * the base had them; signals replace the base's as a set, and only if at least one is a hex. Never throws, and
 * never changes the base: a palette, once made, is frozen.
 */
export function makePalette(input: PaletteInput = {}, base: Palette = DEFAULT_PALETTE): Palette {
  const grounds = {} as Record<Ground, GroundSpec>;
  for (const g of GROUND_NAMES) {
    const was = base.grounds[g], got = input.grounds?.[g];
    grounds[g] = {
      ground: got && HEX6.test(got.ground ?? '') ? got.ground!.toLowerCase() : was.ground,
      ink: got && HEX6.test(got.ink ?? '') ? got.ink!.toLowerCase() : was.ink,
      L: got && isBand(got.L) ? got.L : was.L,
      C: got && isChroma(got.C) ? got.C : was.C,
      toward: was.toward,
    };
  }
  const named = (input.signals || []).filter(s => s && HEX6.test(s.hex || '')).map(s => ({ name: s.name, hex: s.hex.toLowerCase() }));
  return build(grounds, named.length ? named : base.signals);
}

/** A kind's colour on a ground: OKLCH as drawn, its linear light and hex, and how it came to read. */
export interface Colour {
  /** Lightness it was drawn at: the band's, less whatever moved toward the ink to read. */
  L: number;
  /** Chroma it was drawn at, after sRGB. */
  C: number;
  /** The kind's hue, untouched. */
  h: number;
  rgb: Rgb;
  hex: string;
  /** The contrast of the DRAWN colour (its hex) against the ground. */
  contrast: number;
  /** How far lightness moved toward the ink to read (0 when it did not); the cap is MOVE_MAX. */
  moved: number;
  /** The step down a family it was drawn at, 0 to DEPTHS_DRAWN. */
  depth: number;
}

/** The light a hex gives, as drawn: the byte has rounded it. */
const drawnLight = (rgb: readonly number[]): number => relativeLuminance(hexToLinear(linearToHex(rgb)));

/**
 * A kind's colour for a ground, a certainty and a palette. It reads on its ground (WORDS_CONTRAST, as it is drawn)
 * or `moved` says how far lightness had to go and the number says it still does not.
 */
export function colourOf(kind: { hue: number; depth: number }, ground: Ground, certainty: Certainty = 'said', palette: Palette = DEFAULT_PALETTE): Colour {
  const g = palette.grounds[ground];
  const depth = Math.min(kind.depth, DEPTHS_DRAWN);
  const groundLight = relativeLuminance(hexToLinear(g.ground));
  /** A colour reads when it clears the floor as it is and as it will be drawn: a byte can round it under. */
  const reads = (rgb: readonly number[]) =>
    contrastRatio(relativeLuminance(rgb), groundLight) >= WORDS_CONTRAST && contrastRatio(drawnLight(rgb), groundLight) >= WORDS_CONTRAST;
  let L = g.L[depth], moved = 0;
  let said = inSrgb(L, g.C, kind.hue);
  while (!reads(said.rgb) && moved < MOVE_MAX) {
    L -= MOVE_STEP * g.toward; moved += MOVE_STEP; said = inSrgb(L, g.C, kind.hue);
  }
  let c = certainty === 'said' ? said : inSrgb(L, said.C * OFFERED_SHARE, kind.hue);
  while (!reads(c.rgb) && moved < MOVE_MAX) {
    L -= MOVE_STEP * g.toward; moved += MOVE_STEP; c = inSrgb(L, said.C * (certainty === 'said' ? 1 : OFFERED_SHARE), kind.hue);
  }
  const hex = linearToHex(c.rgb);
  return { ...c, hex, contrast: contrastRatio(relativeLuminance(hexToLinear(hex)), groundLight), moved: Math.round(moved * 1000) / 1000, depth };
}

/**
 * The move, in words, for a ledger or a panel: nothing when the colour read where its band put it, else how far
 * lightness went toward the ink to read — and, when even the cap was not enough, that it still does not.
 */
export function movedWords(c: Colour): string {
  if (!c.moved) return '';
  const said = `lightness moved ${c.moved} to read`;
  return c.contrast >= WORDS_CONTRAST ? said : `${said}, and still reads only ${c.contrast.toFixed(1)}:1`;
}

// The colour words a person says (V1-SPEC KN3a): a word means a HUE, and the ground decides how light and how
// strong it is drawn, so *purple* is the same purple on paper and in the dark room. A hex is read for its hue alone
// for the same reason: a pale yellow named as #fff176 is a yellow, and the space draws it as dark as paper needs.
// Grey, black and white have no hue to take, and a kind takes a hue, so they are not colours here.
import { hexToLinear, linearToOklab, oklabToLch } from './oklch';

/** The hue, in degrees on the OKLCH wheel, each word stands at. */
export const COLOUR_WORDS: Readonly<Record<string, number>> = Object.freeze({
  red: 29, scarlet: 33, crimson: 20, rose: 5, pink: 355, magenta: 330, fuchsia: 335,
  purple: 305, violet: 298, lavender: 300, plum: 320, indigo: 280, blue: 264, navy: 264,
  cobalt: 262, azure: 245, sky: 240, cyan: 215, teal: 195, turquoise: 185, aqua: 190,
  green: 145, emerald: 160, forest: 145, mint: 165, lime: 130, chartreuse: 125, olive: 110,
  yellow: 105, gold: 92, mustard: 95, amber: 80, ochre: 75, orange: 62, tangerine: 58,
  coral: 40, salmon: 35, peach: 50, brown: 55, rust: 40, copper: 48, tan: 70,
});

/** Under this chroma a hex is a grey, and a grey has no hue to name. */
const GREY_BELOW = 0.02;

const HEX = /^#?[0-9a-f]{6}$|^#?[0-9a-f]{3}$/;

/** A word's hue, and the word as it was read: lower case, a hex with its #. */
export interface NamedHue {
  hue: number;
  word: string;
}

/** The hue a colour word or a hex means, or null when it means none: a word not known, or a grey. */
export function hueOfWord(word: string | null | undefined): NamedHue | null {
  const w = (word || '').trim().toLowerCase();
  if (HEX.test(w)) {
    const [, C, hue] = oklabToLch(linearToOklab(hexToLinear(w.startsWith('#') ? w : '#' + w)));
    return C < GREY_BELOW ? null : { hue, word: w.startsWith('#') ? w : '#' + w };
  }
  return Object.prototype.hasOwnProperty.call(COLOUR_WORDS, w) ? { hue: COLOUR_WORDS[w], word: w } : null;
}

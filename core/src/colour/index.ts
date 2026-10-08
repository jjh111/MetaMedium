// The colour space (V1-SPEC KN3a): colour that follows meaning, generated in OKLCH. Hue is which kind and its kin,
// lightness is depth, chroma is how sure; every colour is checked to read on both grounds and for colour-blind
// eyes, and a second channel (a pattern) does what colour cannot. Pure, with the palette handed in. Derived: only
// the acts that make and relate kinds are ever kept, and what they decided is a hue.
export {
  srgbToLinear,
  linearToSrgb,
  parseHex,
  hexToLinear,
  linearToHex,
  linearToOklab,
  oklabToLinear,
  oklabToLch,
  lchToOklab,
  normHue,
  hueDistance,
  maxChroma,
  inSrgb,
  relativeLuminance,
  contrastRatio,
} from './oklch';
export type { Rgb, Lab, Lch, Fitted } from './oklch';
export {
  GROUND_NAMES,
  DEFAULT_PALETTE,
  OFFERED_SHARE,
  WORDS_CONTRAST,
  MARKS_CONTRAST,
  DEPTHS_DRAWN,
  MOVE_STEP,
  MOVE_MAX,
  makePalette,
  colourOf,
  movedWords,
} from './scale';
export type { Ground, Certainty, GroundSpec, Signal, Palette, PaletteInput, Colour } from './scale';
export { VISIONS, MACHADO, WHO, LOOK_ALIKE, CHANNELS, simulateVision, oklabDistance, distinctness, channels } from './access';
export type { Vision, Channel, AccessKind, KindPair, KindChannel } from './access';
export { COLOUR_WORDS, hueOfWord } from './names';
export type { NamedHue } from './names';
export { emptyLens, kindsOf, applyAct, holdKind, holdRelation, familyOf, nameHue, signalPenalty, placeHue } from './harmony';
export type { Kind, KindSource, KindRel, Relation, Lens, KindAct, KindHold, ActResult, Candidate, Placed } from './harmony';
export { meaning } from './meaning';

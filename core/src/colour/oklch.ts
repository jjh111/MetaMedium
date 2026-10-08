// OKLCH, OKLab and sRGB (V1-SPEC KN3a): the ground floor of the colour space. Pure arithmetic with no
// dependency, ported from the specimen (brand/colour-space.html) and Björn Ottosson's OKLab (2020).
//
// Why OKLCH: its three axes mean something a person can be told. Hue is an angle, and a kind's hue is the kind;
// lightness is how far toward the ground a colour stands; chroma is how vivid, and the colour space reads it as
// how sure. Distance in OKLab is near enough to what an eye sees that it can decide where a new hue should go.
//
// Colour here is carried as LINEAR light (red, green and blue each 0 to 1, before sRGB's gamma), because that is
// where light adds, where luminance is read and where colour-blind sight is simulated. A hex is what is drawn.
// Gamut mapping is by reducing chroma and keeping lightness and hue, so a colour sRGB cannot reach is the nearest
// one it can along the same hue, never a different colour.

/** Light as a screen makes it, linear: red, green and blue, each 0 to 1. */
export type Rgb = [number, number, number];
/** OKLab: lightness, then the green–red and the blue–yellow axes. */
export type Lab = [number, number, number];
/** OKLCH: lightness, chroma and a hue in degrees from 0 up to 360. */
export type Lch = [number, number, number];

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

// ---- sRGB and linear light ---------------------------------------------------

/** One sRGB channel (0 to 1, gamma-encoded) as linear light. */
export const srgbToLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
/** One channel of linear light as sRGB (0 to 1, gamma-encoded). */
export const linearToSrgb = (c: number): number => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** A hex colour as three bytes: three digits or six, with or without the #, in any case. Null for anything else. */
export function parseHex(hex: string): [number, number, number] | null {
  const m = HEX.exec((hex || '').trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split('').map(x => x + x).join('') : m[1];
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** A hex colour as linear light. What is no hex is black, as the specimen did: a colour is never a thrown error. */
export function hexToLinear(hex: string): Rgb {
  const bytes = parseHex(hex) ?? [0, 0, 0];
  return bytes.map(v => srgbToLinear(v / 255)) as Rgb;
}

/** Linear light as the hex a screen draws: lower case, six digits, each channel rounded to a byte and clamped. */
export const linearToHex = (rgb: readonly number[]): string =>
  '#' + rgb.map(c => Math.round(clamp01(linearToSrgb(clamp01(c))) * 255).toString(16).padStart(2, '0')).join('');

// ---- OKLab and OKLCH ----------------------------------------------------------

/** Linear light as OKLab. */
export function linearToOklab([r, g, b]: readonly number[]): Lab {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** OKLab as linear light. It can lie outside 0 to 1: that is what the gamut is for. */
export function oklabToLinear([L, a, b]: readonly number[]): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** An angle in degrees as a hue in a turn: 0 up to 360. */
export const normHue = (h: number): number => ((h % 360) + 360) % 360;

/** OKLab as OKLCH. A colour with no chroma has no hue worth asking; the angle is whatever the noise left. */
export const oklabToLch = ([L, a, b]: readonly number[]): Lch => [L, Math.hypot(a, b), normHue((Math.atan2(b, a) * 180) / Math.PI)];

/** OKLCH as OKLab. */
export const lchToOklab = (L: number, C: number, h: number): Lab => [L, C * Math.cos((h * Math.PI) / 180), C * Math.sin((h * Math.PI) / 180)];

/** How far apart two hues are, the short way round: 0 to 180 degrees. */
export function hueDistance(a: number, b: number): number {
  const d = Math.abs(normHue(a) - normHue(b));
  return d > 180 ? 360 - d : d;
}

// ---- fitting a colour inside sRGB ----------------------------------------------

/** How far outside 0 to 1 a channel may lie and still count as inside: the binary search's own resolution. */
const GAMUT_EPS = 1e-7;
const inGamut = (rgb: readonly number[]): boolean => rgb.every(c => c >= -GAMUT_EPS && c <= 1 + GAMUT_EPS);

/** The most chroma sRGB holds at a lightness and a hue (found by halving, to a billionth of a chroma). */
export function maxChroma(L: number, h: number): number {
  let lo = 0, hi = 0.4;
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklabToLinear(lchToOklab(L, mid, h)))) lo = mid; else hi = mid;
  }
  return lo;
}

/** A colour fitted inside sRGB. `L`, `C` and `h` are what it came to; `rgb` is its linear light. */
export interface Fitted {
  L: number;
  C: number;
  h: number;
  rgb: Rgb;
}

/**
 * Gamut mapping by reducing chroma: the hue and the lightness are kept, and the chroma is lowered to what sRGB
 * holds there — never a different hue. A colour sRGB already holds is returned as it was.
 */
export function inSrgb(L: number, C: number, h: number): Fitted {
  const c = Math.min(C, maxChroma(L, h));
  return { L, C: c, h, rgb: oklabToLinear(lchToOklab(L, c, h)).map(clamp01) as Rgb };
}

// ---- luminance and contrast ------------------------------------------------------

/** The light a colour gives, relative to white (WCAG): the Y of linear sRGB. */
export const relativeLuminance = ([r, g, b]: readonly number[]): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** WCAG's contrast ratio of two luminances: 1 for the same light, 21 for black on white, in either order. */
export const contrastRatio = (y1: number, y2: number): number => (Math.max(y1, y2) + 0.05) / (Math.min(y1, y2) + 0.05);

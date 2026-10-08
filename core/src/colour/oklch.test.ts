// The colour space's ground floor (V1-SPEC KN3a): sRGB, linear light, OKLab and OKLCH, hex in and out, and
// fitting a colour inside sRGB by lowering its chroma. Pure arithmetic, so the reference values are
// Björn Ottosson's published ones for the sRGB primaries, and the rest are properties.
import { describe, it, expect } from 'vitest';
import {
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

const lchOfHex = (hex: string) => oklabToLch(linearToOklab(hexToLinear(hex)));

describe('sRGB and linear light', () => {
  it('turns a channel to light and back, and keeps the ends', () => {
    expect(srgbToLinear(0)).toBe(0);
    expect(srgbToLinear(1)).toBeCloseTo(1, 12);
    expect(linearToSrgb(0)).toBe(0);
    expect(linearToSrgb(1)).toBeCloseTo(1, 12);
    for (let i = 0; i <= 255; i++) expect(linearToSrgb(srgbToLinear(i / 255)) * 255).toBeCloseTo(i, 9);
  });

  it('is gamma-encoded: middle grey is a fifth of the light', () => {
    expect(srgbToLinear(0.5)).toBeCloseTo(0.2140, 3);
  });

  it('reads hex of three digits or six, with or without the #, in any case', () => {
    expect(parseHex('#0c1a24')).toEqual([12, 26, 36]);
    expect(parseHex('0C1A24')).toEqual([12, 26, 36]);
    expect(parseHex('#fa0')).toEqual([255, 170, 0]);
    expect(parseHex('  #FA0 ')).toEqual([255, 170, 0]);
  });

  it('reads what is not hex as nothing, and as black when asked for light — never throws', () => {
    for (const bad of ['', '#', '#12', '#12345', '#1234567', 'purple', '#gg0000', 'not a colour']) {
      expect(parseHex(bad)).toBeNull();
      expect(hexToLinear(bad)).toEqual([0, 0, 0]);
    }
  });

  it('writes hex lower case, six digits, rounded, and clamps what lies outside', () => {
    expect(linearToHex([1, 1, 1])).toBe('#ffffff');
    expect(linearToHex([0, 0, 0])).toBe('#000000');
    expect(linearToHex([2, -1, 0.5])).toBe('#ff00bc');
    for (const hex of ['#0c1a24', '#f8f5ef', '#131315', '#e3edf1', '#1c5fb8', '#a8493c', '#000000', '#ffffff']) {
      expect(linearToHex(hexToLinear(hex))).toBe(hex);
    }
  });
});

describe('OKLab and OKLCH', () => {
  it('puts white at lightness 1 with no colour, and black at 0', () => {
    const [L, a, b] = linearToOklab([1, 1, 1]);
    expect(L).toBeCloseTo(1, 6);
    expect(a).toBeCloseTo(0, 6);
    expect(b).toBeCloseTo(0, 6);
    expect(linearToOklab([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it('knows the sRGB primaries (Ottosson, 2020)', () => {
    const red = lchOfHex('#ff0000');
    expect(red[0]).toBeCloseTo(0.628, 3);
    expect(red[1]).toBeCloseTo(0.2577, 3);
    expect(red[2]).toBeCloseTo(29.23, 1);
    const green = lchOfHex('#00ff00');
    expect(green[0]).toBeCloseTo(0.8664, 3);
    expect(green[1]).toBeCloseTo(0.2948, 3);
    expect(green[2]).toBeCloseTo(142.5, 1);
    const blue = lchOfHex('#0000ff');
    expect(blue[0]).toBeCloseTo(0.452, 3);
    expect(blue[1]).toBeCloseTo(0.3132, 3);
    expect(blue[2]).toBeCloseTo(264.05, 1);
  });

  it('goes to OKLab and back without losing the colour', () => {
    for (const hex of ['#663693', '#1a6400', '#823b00', '#d1a8ff', '#5a4a6c', '#f8f5ef', '#131315']) {
      expect(linearToHex(oklabToLinear(linearToOklab(hexToLinear(hex))))).toBe(hex);
    }
  });

  it('goes between polar and Cartesian, with the hue in degrees from 0 to 360', () => {
    const [L, C, h] = oklabToLch(lchToOklab(0.5, 0.1, 200));
    expect(L).toBeCloseTo(0.5, 12);
    expect(C).toBeCloseTo(0.1, 12);
    expect(h).toBeCloseTo(200, 9);
    expect(oklabToLch(lchToOklab(0.5, 0.1, -30))[2]).toBeCloseTo(330, 9);
    expect(oklabToLch(lchToOklab(0.5, 0.1, 725))[2]).toBeCloseTo(5, 9);
  });

  it('keeps a hue in a turn, and measures between hues the short way round', () => {
    expect(normHue(-10)).toBe(350);
    expect(normHue(370)).toBe(10);
    expect(normHue(360)).toBe(0);
    expect(normHue(0)).toBe(0);
    expect(hueDistance(10, 350)).toBe(20);
    expect(hueDistance(0, 180)).toBe(180);
    expect(hueDistance(300, 40)).toBe(100);
    expect(hueDistance(40, 300)).toBe(100);
    expect(hueDistance(123, 123)).toBe(0);
    expect(hueDistance(-10, 710)).toBe(0);                // the same hue, a turn apart
    expect(hueDistance(-10, 30)).toBe(40);
  });
});

describe('fitting a colour inside sRGB by lowering its chroma', () => {
  const inside = (rgb: readonly number[]) => rgb.every(c => c >= 0 && c <= 1);
  /** Where the colour lies before anything is clamped: the proof it was fitted, not squeezed. */
  const unclamped = (fit: { L: number; C: number; h: number }) => oklabToLinear(lchToOklab(fit.L, fit.C, fit.h));
  const held = (rgb: readonly number[]) => rgb.every(c => c >= -2e-7 && c <= 1 + 2e-7);

  it('finds the most chroma sRGB holds at a lightness and hue', () => {
    expect(maxChroma(0.5, 264)).toBeCloseTo(0.281, 3);
    expect(maxChroma(0.7, 145)).toBeCloseTo(0.2202, 3);
    // Near black and near white there is little room to be coloured in.
    expect(maxChroma(0.05, 100)).toBeLessThan(0.02);
    expect(maxChroma(0.99, 100)).toBeLessThan(0.03);
  });

  it('puts that chroma on the edge: a hair under is inside sRGB, a hair over is not', () => {
    for (const [L, h] of [[0.44, 305], [0.8, 140], [0.6, 30], [0.7, 200], [0.5, 90]] as const) {
      const edge = maxChroma(L, h);
      const under = oklabToLinear(lchToOklab(L, edge - 1e-6, h));
      const over = oklabToLinear(lchToOklab(L, edge + 1e-4, h));
      expect(under.every(c => c >= -1e-6 && c <= 1 + 1e-6)).toBe(true);
      expect(inside(over)).toBe(false);
    }
  });

  it('lowers chroma and keeps lightness and hue when sRGB cannot reach the colour', () => {
    const fit = inSrgb(0.7, 0.4, 145);
    expect(fit.C).toBeCloseTo(maxChroma(0.7, 145), 12);
    expect(fit.C).toBeLessThan(0.4);
    expect(fit.L).toBe(0.7);
    expect(fit.h).toBe(145);
    expect(held(unclamped(fit))).toBe(true);
    expect(inside(fit.rgb)).toBe(true);
    const [L, , h] = oklabToLch(linearToOklab(fit.rgb));
    expect(L).toBeCloseTo(0.7, 4);
    expect(hueDistance(h, 145)).toBeLessThan(0.01);
  });

  it('leaves a colour sRGB already holds as it was', () => {
    const fit = inSrgb(0.5, 0.1, 305);
    expect(fit.C).toBe(0.1);
    expect(oklabToLch(linearToOklab(fit.rgb))[1]).toBeCloseTo(0.1, 6);
    // …and chroma is all it gives up: cyan at this lightness holds less than 0.1.
    expect(inSrgb(0.5, 0.1, 200).C).toBeLessThan(0.1);
  });

  it('fits every hue, at any lightness, inside — by chroma, never by clamping', () => {
    for (let h = 0; h < 360; h += 7) {
      for (const L of [0.2, 0.44, 0.57, 0.67, 0.8, 0.95]) {
        const fit = inSrgb(L, 0.4, h);
        expect(held(unclamped(fit))).toBe(true);
        expect(fit.L).toBe(L);
        expect(fit.h).toBe(h);
      }
    }
  });
});

describe('luminance and contrast', () => {
  it('is the light a colour gives: white is 1, black 0, and green most of the rest', () => {
    expect(relativeLuminance([1, 1, 1])).toBe(1);
    expect(relativeLuminance([0, 0, 0])).toBe(0);
    expect(relativeLuminance([0, 1, 0])).toBeCloseTo(0.7152, 6);
    expect(relativeLuminance(hexToLinear('#f8f5ef'))).toBeCloseTo(0.9149, 3);
    expect(relativeLuminance(hexToLinear('#131315'))).toBeCloseTo(0.0066, 4);
  });

  it('is WCAG’s ratio: black on white is 21:1, a colour on itself 1:1, and the order is no matter', () => {
    expect(contrastRatio(1, 0)).toBe(21);
    expect(contrastRatio(0, 1)).toBe(21);
    expect(contrastRatio(0.3, 0.3)).toBe(1);
    expect(contrastRatio(0.2, 0.05)).toBeCloseTo(0.25 / 0.1, 12);
  });
});

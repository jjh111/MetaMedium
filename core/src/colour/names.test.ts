// The colour words a person says (V1-SPEC KN3a): a word means a hue, and the ground decides how light and how
// strong; a hex is read for its hue alone. A kind takes a hue, so grey, black and white have none.
import { describe, it, expect } from 'vitest';
import { COLOUR_WORDS, hueOfWord } from './names';
import { hueDistance } from './oklch';

describe('colour words', () => {
  it('map a word to a hue: purple is one', () => {
    expect(hueOfWord('purple')).toEqual({ hue: 305, word: 'purple' });
    expect(hueOfWord('teal')).toEqual({ hue: 195, word: 'teal' });
    expect(hueOfWord('yellow')).toEqual({ hue: 105, word: 'yellow' });
  });

  it('put the families where an eye puts them', () => {
    const hue = (w: string) => hueOfWord(w)!.hue;
    for (const w of ['red', 'scarlet', 'crimson', 'rose', 'coral', 'salmon']) expect(hueDistance(hue(w), 25), w).toBeLessThan(25);
    for (const w of ['green', 'forest', 'emerald', 'mint']) expect(hueDistance(hue(w), 150), w).toBeLessThan(20);
    for (const w of ['blue', 'navy', 'cobalt', 'azure']) expect(hueDistance(hue(w), 255), w).toBeLessThan(20);
    for (const w of ['purple', 'violet', 'lavender', 'plum', 'indigo']) expect(hueDistance(hue(w), 300), w).toBeLessThan(25);
    expect(hueDistance(hue('orange'), hue('red'))).toBeGreaterThan(20);
    expect(hueDistance(hue('yellow'), hue('green'))).toBeGreaterThan(20);
  });

  it('are all a hue in a turn, and each is its own key lower case', () => {
    const words = Object.keys(COLOUR_WORDS);
    expect(words.length).toBeGreaterThanOrEqual(40);
    for (const w of words) {
      expect(w).toBe(w.toLowerCase());
      expect(COLOUR_WORDS[w]).toBeGreaterThanOrEqual(0);
      expect(COLOUR_WORDS[w]).toBeLessThan(360);
      expect(hueOfWord(w)).toEqual({ hue: COLOUR_WORDS[w], word: w });
    }
  });

  it('are read in any case, with space around them', () => {
    expect(hueOfWord('  Purple ')).toEqual({ hue: 305, word: 'purple' });
    expect(hueOfWord('TEAL')).toEqual({ hue: 195, word: 'teal' });
  });

  it('read hex for its hue and nothing of its lightness: a pale yellow is a yellow', () => {
    const pale = hueOfWord('#fff176')!;
    expect(pale.word).toBe('#fff176');
    expect(hueDistance(pale.hue, 105)).toBeLessThan(10);
    const dim = hueOfWord('#7a6a00')!;
    expect(hueDistance(pale.hue, dim.hue)).toBeLessThan(10);
    expect(hueOfWord('#7b2cbf')!.hue).toBeCloseTo(hueOfWord('7B2CBF')!.hue, 12);
  });

  it('read hex of three digits, with or without the #, and give the word its #', () => {
    expect(hueOfWord('#f00')!.word).toBe('#f00');
    expect(hueOfWord('#f00')!.hue).toBeCloseTo(29.23, 1);
    expect(hueOfWord('00f')!.word).toBe('#00f');
    expect(hueOfWord('00f')!.hue).toBeCloseTo(264.05, 1);
  });

  it('find no hue in what has none — grey, black, white, a hex with no colour in it', () => {
    for (const w of ['#808080', '#000000', '#ffffff', '#fff', '#000', '#777', 'grey', 'gray', 'black', 'white']) expect(hueOfWord(w), w).toBeNull();
  });

  it('say nothing of what they do not know', () => {
    for (const w of ['banana', 'colour', '', '   ', '#', '#12', '#gg0000', 'purple haze']) expect(hueOfWord(w), JSON.stringify(w)).toBeNull();
    expect(hueOfWord(null)).toBeNull();
    expect(hueOfWord(undefined)).toBeNull();
  });
});

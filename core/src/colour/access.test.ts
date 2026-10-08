// What an eye can tell apart (V1-SPEC KN3a): contrast, colour-blind sight (Machado 2009, severity 1, in
// linear RGB), the distance between two lights in OKLab, which pairs of kinds read as one under every way of
// seeing on both grounds, and the second channel that does the work colour cannot. Lightness is never spent on
// that: it means depth.
import { describe, it, expect } from 'vitest';
import {
  VISIONS,
  MACHADO,
  WHO,
  CHANNELS,
  LOOK_ALIKE,
  simulateVision,
  oklabDistance,
  distinctness,
  channels,
  relativeLuminance,
  contrastRatio,
  type AccessKind,
} from './access';
import { hexToLinear } from './oklch';
import { colourOf, GROUND_NAMES } from './scale';

const kind = (name: string, order: number, hue: number, depth = 0): AccessKind => ({ name, order, hue, depth });
const light = (hex: string) => hexToLinear(hex);
const apart = (a: string, b: string, v: (typeof VISIONS)[number]) => oklabDistance(simulateVision(light(a), v), simulateVision(light(b), v));

/** n kinds an even turn apart: the spacing by angle that promises nothing to a dichromat. */
const evenly = (n: number) => Array.from({ length: n }, (_, i) => kind(`k${i}`, i, (i * 360) / n));

describe('contrast and luminance, reachable from here as well', () => {
  it('are the same ones the conversions carry', () => {
    expect(relativeLuminance([1, 1, 1])).toBe(1);
    expect(contrastRatio(1, 0)).toBe(21);
  });
});

describe('colour-blind sight (Machado, Oliveira & Fernandes 2009, severity 1, in linear RGB)', () => {
  it('names four ways of seeing, most eyes first, and says who each is', () => {
    expect([...VISIONS]).toEqual(['typical', 'protan', 'deutan', 'tritan']);
    expect(WHO).toEqual({ typical: 'everyone', protan: 'protanopes', deutan: 'deuteranopes', tritan: 'tritanopes' });
  });

  it('carries the published matrices', () => {
    expect(MACHADO.protan).toEqual([[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]]);
    expect(MACHADO.deutan).toEqual([[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]]);
    expect(MACHADO.tritan).toEqual([[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]]);
  });

  it('keeps a grey grey: every row of every matrix sums to one', () => {
    for (const m of [MACHADO.protan, MACHADO.deutan, MACHADO.tritan]) for (const row of m) expect(row[0] + row[1] + row[2]).toBeCloseTo(1, 5);
    for (const v of VISIONS) {
      const [r, g, b] = simulateVision(light('#808080'), v);
      expect(Math.abs(r - g)).toBeLessThan(1e-5);
      expect(Math.abs(g - b)).toBeLessThan(1e-5);
    }
  });

  it('leaves most eyes’ colours as they were', () => {
    const rgb = light('#663693');
    expect(simulateVision(rgb, 'typical')).toEqual([...rgb]);
  });

  it('brings red and green close for a protanope and nearer still for a deuteranope', () => {
    const typical = apart('#cc3333', '#339933', 'typical');
    expect(apart('#cc3333', '#339933', 'protan')).toBeLessThan(typical * 0.7);
    expect(apart('#cc3333', '#339933', 'deutan')).toBeLessThan(LOOK_ALIKE);
  });

  it('closes up yellow and magenta for a tritanope', () => {
    expect(apart('#ffff00', '#ff00ff', 'tritan')).toBeLessThan(apart('#ffff00', '#ff00ff', 'typical') * 0.7);
  });

  it('clamps what it makes to light a screen can show', () => {
    for (const v of VISIONS) for (const hex of ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff']) {
      expect(simulateVision(light(hex), v).every(c => c >= 0 && c <= 1)).toBe(true);
    }
  });
});

describe('the distance between two lights', () => {
  it('is zero for one light, symmetric, and about one from white to black', () => {
    const a = light('#663693'), b = light('#1a6400');
    expect(oklabDistance(a, a)).toBe(0);
    expect(oklabDistance(a, b)).toBe(oklabDistance(b, a));
    expect(oklabDistance(a, b)).toBeGreaterThan(0.1);
    expect(oklabDistance([1, 1, 1], [0, 0, 0])).toBeCloseTo(1, 6);
  });
});

describe('which kinds read as one', () => {
  it('names every pair once, in the order the kinds were made, whatever order they are handed over', () => {
    const ks = [kind('c', 2, 200), kind('a', 0, 10), kind('b', 1, 100)];
    expect(distinctness(ks).map(p => `${p.a}/${p.b}`)).toEqual(['a/b', 'a/c', 'b/c']);
  });

  it('measures each pair under every way of seeing, and keeps the least of them', () => {
    const [p] = distinctness([kind('a', 0, 20), kind('b', 1, 200)]);
    expect(Object.keys(p.by)).toEqual([...VISIONS]);
    expect(p.min).toBe(Math.min(...Object.values(p.by)));
  });

  it('takes the least over both grounds: a pair is only as far apart as the nearer ground says', () => {
    const a = kind('a', 0, 20), b = kind('b', 1, 60);
    const [p] = distinctness([a, b]);
    const onEach = GROUND_NAMES.map(g => oklabDistance(colourOf(a, g).rgb, colourOf(b, g).rgb));
    expect(p.by.typical).toBe(Math.min(...onEach));
  });

  it('cannot tell one hue from itself, and can tell the wheel’s far sides apart for most eyes', () => {
    const [same] = distinctness([kind('a', 0, 140), kind('b', 1, 140)]);
    expect(same.min).toBe(0);
    const [far] = distinctness([kind('a', 0, 20), kind('b', 1, 200)]);
    expect(far.by.typical).toBeGreaterThan(0.2);
  });

  it('finds that an even spacing of angles promises a dichromat nothing', () => {
    const lost = distinctness(evenly(12)).filter(p => p.by.deutan < LOOK_ALIKE && p.by.typical > 0.2);
    expect(lost.length).toBeGreaterThan(0);
  });

  it('is a pure function of the kinds and the palette', () => {
    const ks = evenly(7);
    expect(distinctness(ks)).toEqual(distinctness(ks));
  });
});

describe('second channels', () => {
  it('are patterns: solid first, then the specimen’s four, then three more so that twelve kinds can be told apart', () => {
    expect([...CHANNELS].slice(0, 5)).toEqual(['solid', 'dashed', 'dotted', 'dash-dot', 'long']);
    expect(CHANNELS.length).toBeGreaterThanOrEqual(8);
    expect(new Set(CHANNELS).size).toBe(CHANNELS.length);
  });

  it('leave kinds that tell apart solid: nothing is added where colour does the work', () => {
    const ks = [kind('a', 0, 20), kind('b', 1, 200)];
    const ch = channels(ks, distinctness(ks));
    expect(ch.get('a')).toEqual({ channel: 'solid', alike: null, who: [], repeats: false });
    expect(ch.get('b')).toEqual({ channel: 'solid', alike: null, who: [], repeats: false });
  });

  it('give the later of two look-alikes the first pattern its look-alike does not hold, and say to whom they look alike', () => {
    const ks = [kind('a', 0, 140), kind('b', 1, 140)];
    const ch = channels(ks, distinctness(ks));
    expect(ch.get('a')!.channel).toBe('solid');
    expect(ch.get('b')).toEqual({ channel: 'dashed', alike: 'a', who: ['everyone', 'protanopes', 'deuteranopes', 'tritanopes'], repeats: false });
  });

  it('are shared by kinds that are not alike', () => {
    const ks = [kind('a', 0, 140), kind('b', 1, 140), kind('c', 2, 320)];
    const ch = channels(ks, distinctness(ks));
    expect(ch.get('c')!.channel).toBe('solid');
    expect(ch.get('c')!.alike).toBeNull();
  });

  it('never change an earlier kind’s pattern when a later kind is made', () => {
    const ks = evenly(14);
    let before = channels(ks.slice(0, 3), distinctness(ks.slice(0, 3)));
    for (let n = 4; n <= ks.length; n++) {
      const now = channels(ks.slice(0, n), distinctness(ks.slice(0, n)));
      for (const [name, c] of before) expect(now.get(name)).toEqual(c);
      before = now;
    }
  });

  it('carry twelve kinds: every pair either tells apart under each way of seeing or has two patterns', () => {
    for (const ks of [evenly(12), evenly(11), [...evenly(9), kind('x', 9, 5), kind('y', 10, 17), kind('z', 11, 333)]]) {
      const pairs = distinctness(ks);
      const ch = channels(ks, pairs);
      for (const p of pairs) {
        if (p.min >= LOOK_ALIKE) continue;
        expect(ch.get(p.a)!.channel, `${p.a} and ${p.b} look alike, so they need two patterns`).not.toBe(ch.get(p.b)!.channel);
      }
      expect([...ch.values()].some(c => c.repeats)).toBe(false);
    }
  });

  it('say when the patterns run out, and which kinds repeat one, instead of repeating silently', () => {
    // Ten kinds of one hue look alike to all, and there are eight patterns.
    const ks = Array.from({ length: CHANNELS.length + 2 }, (_, i) => kind(`k${i}`, i, 140));
    const ch = channels(ks, distinctness(ks));
    const names = ks.map(k => ch.get(k.name)!);
    expect(names.slice(0, CHANNELS.length).every(c => !c.repeats)).toBe(true);
    expect(names.slice(0, CHANNELS.length).map(c => c.channel)).toEqual([...CHANNELS]);
    expect(names[CHANNELS.length].repeats).toBe(true);
    expect(names[CHANNELS.length + 1].repeats).toBe(true);
  });

  it('never use lightness: the pattern is the only thing a second channel changes', () => {
    const k = kind('a', 0, 140);
    const before = colourOf(k, 'paper').hex;
    channels([k, kind('b', 1, 140)], distinctness([k, kind('b', 1, 140)]));
    expect(colourOf(k, 'paper').hex).toBe(before);
  });
});

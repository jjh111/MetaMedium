// A kind's colour (V1-SPEC KN3a): its hue, its depth and its certainty, for a ground. Hue is which kind,
// lightness is depth (each step down a family a step toward the ground), chroma is how sure (a said kind at full
// chroma, an offered one a fixed share of it). The ground sets how light, never which hue; and what is drawn must
// read: 4.5:1 for words and so 3:1 for marks, found by moving lightness toward the ink, and said.
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PALETTE,
  GROUND_NAMES,
  OFFERED_SHARE,
  WORDS_CONTRAST,
  MARKS_CONTRAST,
  DEPTHS_DRAWN,
  MOVE_MAX,
  makePalette,
  colourOf,
  type Ground,
} from './scale';
import { hexToLinear, linearToOklab, oklabToLch, relativeLuminance, contrastRatio, hueDistance, maxChroma } from './oklch';

const lum = (hex: string) => relativeLuminance(hexToLinear(hex));
/** The contrast of what is drawn — the hex — against the ground it is drawn on. */
const drawn = (hex: string, ground: Ground, palette = DEFAULT_PALETTE) => contrastRatio(lum(hex), lum(palette.grounds[ground].ground));
const hueOfHex = (hex: string) => oklabToLch(linearToOklab(hexToLinear(hex)))[2];

describe('the palette: grounds, inks and the chrome’s colours, handed in', () => {
  it('has two grounds, paper and the dark room, each with its ink and the bands it allows', () => {
    expect([...GROUND_NAMES]).toEqual(['paper', 'dark']);
    for (const g of GROUND_NAMES) {
      const spec = DEFAULT_PALETTE.grounds[g];
      expect(spec.ground).toMatch(/^#[0-9a-f]{6}$/);
      expect(spec.ink).toMatch(/^#[0-9a-f]{6}$/);
      expect(spec.L).toHaveLength(3);
      expect(spec.C).toBeGreaterThan(0);
    }
  });

  it('steps toward the ground the way each ground lies: lighter on paper, darker in the dark room', () => {
    const { paper, dark } = DEFAULT_PALETTE.grounds;
    expect(paper.toward).toBe(1);
    expect(dark.toward).toBe(-1);
    expect(paper.L[0]).toBeLessThan(paper.L[1]);
    expect(paper.L[1]).toBeLessThan(paper.L[2]);
    expect(dark.L[0]).toBeGreaterThan(dark.L[1]);
    expect(dark.L[1]).toBeGreaterThan(dark.L[2]);
  });

  it('holds the five colours the chrome keeps for itself, each with the hue it stands at', () => {
    expect(DEFAULT_PALETTE.signals.map(s => s.name)).toEqual(['read', 'confident', 'unsure', 'broken', 'a model']);
    for (const s of DEFAULT_PALETTE.signals) expect(hueOfHex(s.hex)).toBeCloseTo(s.hue, 9);
    expect(DEFAULT_PALETTE.signals.find(s => s.name === 'a model')!.hue).toBeCloseTo(295.5, 1);
  });

  it('is frozen: a palette once made is never changed', () => {
    expect(Object.isFrozen(DEFAULT_PALETTE)).toBe(true);
    expect(Object.isFrozen(DEFAULT_PALETTE.grounds)).toBe(true);
    expect(Object.isFrozen(DEFAULT_PALETTE.grounds.paper)).toBe(true);
    expect(Object.isFrozen(DEFAULT_PALETTE.signals)).toBe(true);
    expect(() => { (DEFAULT_PALETTE.grounds.paper as { ground: string }).ground = '#000000'; }).toThrow();
  });

  it('is made new from a page’s tokens, taking the colours that are hex and leaving the rest as they were', () => {
    const p = makePalette({
      grounds: { paper: { ground: '#fffaf0', ink: '#102030' }, dark: { ground: 'black', ink: '#ABCDEF' } },
      signals: [{ name: 'read', hex: '#0000ff' }, { name: 'bad', hex: 'blue' }],
    });
    expect(p.grounds.paper.ground).toBe('#fffaf0');
    expect(p.grounds.paper.ink).toBe('#102030');
    expect(p.grounds.paper.L).toEqual(DEFAULT_PALETTE.grounds.paper.L);
    expect(p.grounds.dark.ground).toBe(DEFAULT_PALETTE.grounds.dark.ground);   // “black” is no hex
    expect(p.grounds.dark.ink).toBe('#abcdef');
    expect(p.signals.map(s => s.name)).toEqual(['read']);
    expect(p.signals[0].hue).toBeCloseTo(264.05, 1);
    expect(Object.isFrozen(p)).toBe(true);
  });

  it('keeps the chrome’s colours when none handed in is hex, and never changes the palette it was made from', () => {
    const p = makePalette({ signals: [{ name: 'x', hex: 'nope' }] });
    expect(p.signals).toEqual(DEFAULT_PALETTE.signals);
    expect(makePalette()).toEqual(DEFAULT_PALETTE);
    expect(DEFAULT_PALETTE.grounds.paper.ground).toBe('#f8f5ef');
  });

  it('lets a page hand in the bands too, and ignores what is not a lightness or a chroma', () => {
    const p = makePalette({ grounds: { paper: { L: [0.4, 0.5, 0.6], C: 0.1 }, dark: { L: [2, 0.7, 0.6] as never, C: -1 } } });
    expect(p.grounds.paper.L).toEqual([0.4, 0.5, 0.6]);
    expect(p.grounds.paper.C).toBe(0.1);
    expect(p.grounds.dark.L).toEqual(DEFAULT_PALETTE.grounds.dark.L);
    expect(p.grounds.dark.C).toBe(DEFAULT_PALETTE.grounds.dark.C);
  });
});

describe('a kind’s colour', () => {
  it('is the lightness of its depth and the chroma of its ground, where sRGB reaches them', () => {
    for (const g of GROUND_NAMES) {
      const spec = DEFAULT_PALETTE.grounds[g];
      for (const hue of [0, 40, 105, 140, 200, 264, 305, 340]) {
        const c = colourOf({ hue, depth: 0 }, g);
        expect(c.h).toBe(hue);
        expect(c.depth).toBe(0);
        expect(c.C).toBeCloseTo(Math.min(spec.C, maxChroma(c.L, hue)), 12);
        expect(c.hex).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it('lowers chroma only where sRGB cannot reach the target, and by chroma alone', () => {
    const cyan = colourOf({ hue: 200, depth: 0 }, 'paper');
    expect(cyan.C).toBeLessThan(DEFAULT_PALETTE.grounds.paper.C);        // sRGB holds little at this lightness and hue
    const purple = colourOf({ hue: 305, depth: 0 }, 'paper');
    expect(purple.C).toBe(DEFAULT_PALETTE.grounds.paper.C);              // and plenty here
  });

  it('takes a step toward the ground for each step down a family: lighter on paper, darker in the dark room', () => {
    for (let hue = 0; hue < 360; hue += 15) {
      const [p0, p1, p2] = [0, 1, 2].map(depth => colourOf({ hue, depth }, 'paper').L);
      const [d0, d1, d2] = [0, 1, 2].map(depth => colourOf({ hue, depth }, 'dark').L);
      expect(p0).toBeLessThan(p1);
      expect(p1).toBeLessThan(p2);
      expect(d0).toBeGreaterThan(d1);
      expect(d1).toBeGreaterThan(d2);
    }
    // A whole step where nothing had to move to read.
    expect(colourOf({ hue: 305, depth: 1 }, 'paper').L - colourOf({ hue: 305, depth: 0 }, 'paper').L).toBeCloseTo(0.065, 9);
    expect(colourOf({ hue: 305, depth: 0 }, 'dark').L - colourOf({ hue: 305, depth: 1 }, 'dark').L).toBeCloseTo(0.065, 9);
  });

  it('draws two steps and no more: deeper kinds share the second', () => {
    expect(DEPTHS_DRAWN).toBe(2);
    const two = colourOf({ hue: 140, depth: 2 }, 'paper');
    for (const depth of [3, 4, 9]) {
      const deeper = colourOf({ hue: 140, depth }, 'paper');
      expect(deeper.hex).toBe(two.hex);
      expect(deeper.depth).toBe(DEPTHS_DRAWN);
    }
  });

  it('draws an offered kind at a fixed share of a said one’s chroma, muted, never more vivid', () => {
    expect(OFFERED_SHARE).toBe(0.38);
    for (const g of GROUND_NAMES) for (let hue = 0; hue < 360; hue += 10) {
      const said = colourOf({ hue, depth: 0 }, g, 'said');
      const offered = colourOf({ hue, depth: 0 }, g, 'offered');
      expect(offered.C).toBeCloseTo(said.C * OFFERED_SHARE, 9);
      expect(offered.C).toBeLessThan(said.C);
    }
  });

  it('keeps the hue on both grounds, and for a said kind and an offered one: only lightness and chroma move', () => {
    for (let hue = 0; hue < 360; hue += 5) {
      for (const depth of [0, 1, 2]) {
        for (const g of GROUND_NAMES) {
          const said = colourOf({ hue, depth }, g);
          const offered = colourOf({ hue, depth }, g, 'offered');
          expect(said.h).toBe(hue);
          expect(offered.h).toBe(hue);
          // What is drawn is 8-bit, so its hue is the kind’s to within what a byte can say.
          expect(hueDistance(hueOfHex(said.hex), hue)).toBeLessThan(1.5);
          expect(hueDistance(hueOfHex(offered.hex), hue)).toBeLessThan(3.5);
        }
      }
    }
    const paper = colourOf({ hue: 305, depth: 0 }, 'paper'), dark = colourOf({ hue: 305, depth: 0 }, 'dark');
    expect(paper.L).not.toBe(dark.L);
    expect(paper.hex).not.toBe(dark.hex);
  });
});

describe('colour that reads', () => {
  it('asks 4.5:1 of words and 3:1 of marks', () => {
    expect(WORDS_CONTRAST).toBe(4.5);
    expect(MARKS_CONTRAST).toBe(3);
  });

  it('clears 4.5:1 on its ground at every hue, depth, certainty and ground — as drawn, not as it was before the byte', () => {
    let worst = Infinity;
    for (const g of GROUND_NAMES) for (const depth of [0, 1, 2, 3]) for (const certainty of ['said', 'offered'] as const) {
      for (let hue = 0; hue < 360; hue += 0.5) {
        const c = colourOf({ hue, depth }, g, certainty);
        const asDrawn = drawn(c.hex, g);
        worst = Math.min(worst, asDrawn);
        expect(c.contrast, `${g} d${depth} ${certainty} ${hue}`).toBeCloseTo(asDrawn, 9);
        expect(asDrawn, `${g} d${depth} ${certainty} ${hue} ${c.hex}`).toBeGreaterThanOrEqual(WORDS_CONTRAST);
      }
    }
    expect(worst).toBeGreaterThanOrEqual(MARKS_CONTRAST);
  });

  it('moves lightness toward the ink to read, and no other way, and says how far', () => {
    let moves = 0;
    for (const g of GROUND_NAMES) {
      const spec = DEFAULT_PALETTE.grounds[g];
      for (let depth = 0; depth <= 2; depth++) for (let hue = 0; hue < 360; hue += 3) {
        const c = colourOf({ hue, depth }, g);
        expect(c.moved).toBeGreaterThanOrEqual(0);
        expect(c.moved).toBeLessThanOrEqual(MOVE_MAX);
        // Toward the ink is away from the ground: darker on paper, lighter in the dark room.
        expect(c.L).toBeCloseTo(spec.L[depth] - spec.toward * c.moved, 9);
        if (c.moved > 0) moves++;
      }
    }
    expect(moves).toBeGreaterThan(0);                                    // the deepest kinds on paper do need it
    expect(colourOf({ hue: 305, depth: 0 }, 'paper').moved).toBe(0);     // and a kind at the surface does not
  });

  it('stops at a cap and says so, for a band that can never read', () => {
    const faint = makePalette({ grounds: { paper: { L: [0.99, 0.99, 0.99] } } });
    const c = colourOf({ hue: 140, depth: 0 }, 'paper', 'said', faint);
    expect(c.moved).toBeCloseTo(MOVE_MAX, 9);
    expect(c.contrast).toBeLessThan(WORDS_CONTRAST);                     // the number tells the truth
  });

  it('keeps a person’s pale yellow: its hue, drawn as dark as paper needs', () => {
    const yellow = 105;
    const paper = colourOf({ hue: yellow, depth: 0 }, 'paper');
    const dark = colourOf({ hue: yellow, depth: 0 }, 'dark');
    expect(paper.L).toBeLessThan(0.5);                                   // ochre, olive: not the pale colour that was named
    expect(drawn(paper.hex, 'paper')).toBeGreaterThanOrEqual(WORDS_CONTRAST);
    expect(dark.L).toBeGreaterThan(0.7);                                 // and in the dark room it is yellow
    expect(hueDistance(hueOfHex(paper.hex), yellow)).toBeLessThan(1.5);
    expect(hueDistance(hueOfHex(dark.hex), yellow)).toBeLessThan(1.5);
  });

  it('is a pure function of the kind, the ground and the palette', () => {
    expect(colourOf({ hue: 77.7, depth: 1 }, 'dark', 'offered')).toEqual(colourOf({ hue: 77.7, depth: 1 }, 'dark', 'offered'));
  });
});

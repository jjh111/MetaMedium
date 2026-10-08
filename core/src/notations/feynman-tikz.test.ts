// TikZ-Feynman out (MATHS-SPEC §8, M27): the e⁻ e⁺ → μ⁻ μ⁺ board, every hand
// of it, writes the golden `\feynmandiagram` once its names are read — and so
// do Møller, Compton and the gluon exchange. Styles and keys are checked
// against the TikZ-Feynman manual as its author knows it; nothing here was
// compiled (no LuaLaTeX in the container), and the writer says so. What a hand
// wrote never reaches TeX: only the table's names are written.

import { describe, it, expect } from 'vitest';
import { createSession, readFeynman, feynmanTikz } from '../index';
import type { FeynmanReading } from '../index';
import { drawFeynman, readFeynmanWords, FEYNMAN_VARIANTS, FEYNMAN_BOARDS } from './fixtures/feynman';
import { FEYNMAN_TIKZ } from './fixtures/feynman.tikz';

const SLOW = 120_000;

describe('TikZ-Feynman out', () => {
  for (const board of FEYNMAN_BOARDS) {
    it(`${board}: every hand, its names read and its boson named, writes the golden`, () => {
      const wrong: string[] = [];
      for (const v of FEYNMAN_VARIANTS) {
        const s = createSession();
        const e = drawFeynman(s, board, v, 1000, { named: true });
        readFeynmanWords(s, e);
        const t = feynmanTikz(readFeynman(s.getState()) as FeynmanReading);
        if (t?.text !== FEYNMAN_TIKZ[board]) wrong.push(`seed ${v.seed} ${v.arrows} ${v.photon}:\n${t?.text}`);
      }
      expect(wrong).toEqual([]);
    }, SLOW);
  }

  it('says what it needs, and names each node for the symbol it stands for', () => {
    const s = createSession();
    const e = drawFeynman(s, 's', FEYNMAN_VARIANTS[0], 1000, { named: true });
    readFeynmanWords(s, e);
    const r = readFeynman(s.getState()) as FeynmanReading;
    const t = feynmanTikz(r)!;
    expect(t.preamble).toBe('\\usepackage{tikz-feynman}');
    expect(t.engine).toBe('lualatex');
    expect(Object.keys(t.names).sort()).toEqual(['a', 'b', 'f1', 'f2', 'i1', 'i2']);
    expect(t.names.a.startsWith('vertex:')).toBe(true);
    expect(t.names.i1).toBe(`external:${e.lines[0].id}`);
    expect(t.notes).toEqual([]);
  });

  it('before its names are read: no particle written, the photon taken as one and said, the shape the same', () => {
    const s = createSession();
    drawFeynman(s, 's', FEYNMAN_VARIANTS[0], 1000, { named: false });
    const t = feynmanTikz(readFeynman(s.getState()) as FeynmanReading)!;
    expect(t.text).toBe(
      [
        '\\feynmandiagram [horizontal=a to b] {',
        '  i1 -- [fermion] a -- [fermion] i2,',
        '  a -- [photon] b,',
        '  f2 -- [fermion] b -- [fermion] f1,',
        '};',
      ].join('\n')
    );
    expect(t.notes.filter((n) => /has no particle written on it/.test(n))).toHaveLength(4);
    expect(t.notes.some((n) => /is written as a photon, with no name on it/.test(n))).toBe(true);
  });

  it('what a hand wrote never reaches TeX: a name that is no particle is left out, and said', () => {
    const s = createSession();
    const e = drawFeynman(s, 's', FEYNMAN_VARIANTS[0], 1000, { named: true, words: { 'e⁻ in': '}\\input{x}' } });
    readFeynmanWords(s, e);
    const t = feynmanTikz(readFeynman(s.getState()) as FeynmanReading)!;
    expect(t.text).not.toMatch(/input/);
    expect(t.text).toMatch(/^ {2}i1 -- \[fermion\] a/m);
    expect(t.notes.some((n) => /^i1 has no particle written on it — “}\\input\{x\}” names none in the table$/.test(n))).toBe(true);
  });

  it('a diagram that is none writes nothing', () => {
    expect(feynmanTikz({ diagrams: [] } as unknown as FeynmanReading)).toBeNull();
  });
});

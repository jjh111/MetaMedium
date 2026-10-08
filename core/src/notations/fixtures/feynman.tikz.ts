// The TikZ-Feynman every hand of each board must write once its names are read
// and its boson is named (MATHS-SPEC §8, M27). The s-channel board is the
// spec's own example — e⁻ e⁺ → μ⁻ μ⁺ by a photon — its vertices named a and b
// in time, the particles i1, i2 coming in and f1, f2 going out, each fermion a
// chain along its arrow. Unverified by a compiler: the container these were
// written in has no LuaLaTeX.

export const FEYNMAN_TIKZ = {
  s: [
    '\\feynmandiagram [horizontal=a to b] {',
    '  i1 [particle=\\(e^{-}\\)] -- [fermion] a -- [fermion] i2 [particle=\\(e^{+}\\)],',
    '  a -- [photon, edge label=\\(\\gamma\\)] b,',
    '  f2 [particle=\\(\\mu^{+}\\)] -- [fermion] b -- [fermion] f1 [particle=\\(\\mu^{-}\\)],',
    '};',
  ].join('\n'),
  t: [
    '\\feynmandiagram [vertical=a to b] {',
    '  i1 [particle=\\(e^{-}\\)] -- [fermion] a -- [fermion] f1 [particle=\\(e^{-}\\)],',
    '  i2 [particle=\\(e^{-}\\)] -- [fermion] b -- [fermion] f2 [particle=\\(e^{-}\\)],',
    '  a -- [photon, edge label=\\(\\gamma\\)] b,',
    '};',
  ].join('\n'),
  compton: [
    '\\feynmandiagram [horizontal=a to b] {',
    '  i1 [particle=\\(e^{-}\\)] -- [fermion] a -- [fermion] b -- [fermion] f1 [particle=\\(e^{-}\\)],',
    '  i2 [particle=\\(\\gamma\\)] -- [photon] a,',
    '  b -- [photon] f2 [particle=\\(\\gamma\\)],',
    '};',
  ].join('\n'),
  gluon: [
    '\\feynmandiagram [vertical=a to b] {',
    '  i1 [particle=\\(u\\)] -- [fermion] a -- [fermion] f1 [particle=\\(u\\)],',
    '  i2 [particle=\\(d\\)] -- [fermion] b -- [fermion] f2 [particle=\\(d\\)],',
    '  a -- [gluon, edge label=\\(g\\)] b,',
    '};',
  ].join('\n'),
} as const;

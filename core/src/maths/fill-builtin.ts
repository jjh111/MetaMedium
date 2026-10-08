// The fill sources the canvas ships with (MATHS-SPEC §4, C0), registered in the
// order that breaks a tie between two fill-ins of equal rank under one key. A
// new source is one file beside `fill.ts`, one import here and one entry in the
// list, appended — as a tool is in `tools/builtin.ts`.

import { registerFillSource } from './fill';
import type { FillSource } from './fill';
import { FIGURE_SOURCE } from './fill-figure';

export const BUILTIN_FILL_SOURCES: readonly FillSource[] = [
  FIGURE_SOURCE,
];

for (const s of BUILTIN_FILL_SOURCES) registerFillSource(s);

// test-molecule@1 — the pack the tests use (V1-PLAN §9 B3). Never listed in a
// surface (`isTestPack`): it exists so a test can use a pack whose content it
// knows exactly, whatever the shipped packs become.
//
// One definition, the canonical loop's molecule (session.scenario.test.ts),
// drawn once in the shape rung's vocabulary and once as recorded strokes; a
// connector; an affinity — every part of the format, so a test of any part
// has one to read.

import type { Point } from '../../types';
import type { Pack } from '../pack';

/** A ring of `n` points, closed: a circle as a recorded stroke. */
const ring = (cx: number, cy: number, r: number, n = 48): Point[] =>
  Array.from({ length: n + 1 }, (_, i) => ({ x: cx + r * Math.cos((i / n) * Math.PI * 2), y: cy + r * Math.sin((i / n) * Math.PI * 2) }));
/** A straight recorded stroke of `n` points. */
const run = (x1: number, y1: number, x2: number, y2: number, n = 24): Point[] =>
  Array.from({ length: n }, (_, i) => ({ x: x1 + ((x2 - x1) * i) / (n - 1), y: y1 + ((y2 - y1) * i) / (n - 1) }));

export const TEST_MOLECULE: Pack = {
  id: 'test-molecule',
  version: 1,
  name: 'Test molecule',
  describes: 'for tests only: the canonical loop’s molecule, known before it is taught',
  definitions: [
    {
      name: 'molecule',
      describes: 'three circles joined by two lines, as the canonical loop draws them',
      samples: [
        [
          { shape: 'circle', x: 160, y: 160, w: 80, h: 80 },
          { shape: 'circle', x: 340, y: 160, w: 80, h: 80 },
          { shape: 'circle', x: 250, y: 300, w: 80, h: 80 },
          { shape: 'line', from: { x: 245, y: 200 }, to: { x: 335, y: 200 } },
          { shape: 'line', from: { x: 220, y: 245 }, to: { x: 270, y: 320 } },
        ],
      ],
      strokes: [[ring(200, 200, 40), ring(380, 200, 40), ring(290, 340, 40), run(245, 200, 335, 200), run(220, 245, 270, 320)]],
      export: { mermaid: '(({label}))' },
    },
  ],
  connectors: [{ name: 'bond', describes: 'a line between two circles', head: 'none', role: 'edge', export: { mermaid: '---' } }],
  affinities: { 'concept:row': ['key:snap'] },
};

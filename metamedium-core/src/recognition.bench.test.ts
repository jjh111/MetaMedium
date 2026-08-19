// The recognition benchmark.
//
// Perfect synthetic strokes let a broken corner detector look healthy: they
// happen to sit at whatever sampling density the thresholds were tuned against.
// This sweeps the things a real hand varies — where the stroke starts, wobble,
// corner rounding, drawing speed (sampling density), and closure — and reports
// how often the TOP reading is right.
//
// It is a benchmark, so it prints a table. It is also a test, so it fails if
// accuracy regresses.

import { describe, it, expect } from 'vitest';
import { analyzeStroke } from './recognition';
import { getFingerprint } from './geometry';
import { handRect } from './test/strokes';
import { buildCases, score } from './test/cases';

describe('recognition benchmark — hand-drawn strokes', () => {
  const cases = buildCases();
  const result = score(cases);

  it('reports the confusion table', () => {
    const lines = [`\n  ${cases.length} hand-drawn strokes, top-reading accuracy ${(result.accuracy * 100).toFixed(1)}%`];
    for (const [shape, s] of Object.entries(result.byShape)) {
      const confused = Object.entries(s.confusedWith)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k}×${v}`)
        .join(' ');
      lines.push(
        `  ${shape.padEnd(10)} top ${String(s.top).padStart(3)}/${String(s.n).padEnd(3)} ` +
        `(${((s.top / s.n) * 100).toFixed(0).padStart(3)}%)   offered ${((s.present / s.n) * 100).toFixed(0).padStart(3)}%` +
        (confused ? `   confused: ${confused}` : '')
      );
    }
    console.log(lines.join('\n'));
    expect(cases.length).toBeGreaterThan(200);
  });

  it('reads the right shape at least 90% of the time', () => {
    expect(result.accuracy).toBeGreaterThanOrEqual(0.9);
  });

  for (const shape of ['rectangle', 'triangle', 'circle', 'line']) {
    it(`never confuses a ${shape} more than 15% of the time`, () => {
      const s = result.byShape[shape];
      expect(s.top / s.n).toBeGreaterThanOrEqual(0.85);
    });
  }

  it('a rectangle drawn from a corner is not a triangle — the reported bug', () => {
    for (const density of [0.12, 0.35, 1.0]) {
      const pts = handRect(0, 0, 200, 140, { startAt: 0, density, jitter: 2.5, seed: 7 });
      const top = analyzeStroke(pts).results[0];
      expect(top?.type, `density ${density} read as ${top?.type}`).toBe('rectangle');
    }
  });

  it('reads the bars an interface is made of, not just tidy squares', () => {
    // A header, a nav, a footer, an input field. The aspect guard used to
    // reject anything past 5:1, so the most common shape in any UI arrived at
    // the layout parser as unrecognised 'art'.
    for (const [w, h] of [[600, 90], [800, 60], [900, 44], [1200, 70]]) {
      const top = analyzeStroke(handRect(0, 0, w, h, { seed: 5 })).results[0];
      expect(top?.type, `${w}x${h} read as ${top?.type}`).toBe('rectangle');
    }
  });

  it('counts a rectangle as 4 corners regardless of how fast it was drawn', () => {
    for (const density of [0.12, 0.2, 0.35, 0.6, 1.0, 1.6]) {
      const fp = getFingerprint(handRect(0, 0, 200, 140, { startAt: 0, density, jitter: 2, seed: 3 }));
      expect(fp.corners, `density ${density} counted ${fp.corners}`).toBe(4);
    }
  });
});

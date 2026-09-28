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
import { buildCases, buildArcCases, ARC_SWEEPS, score } from './test/cases';

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

// ===== S1: arcs of every sweep, and no false arcs =====
//
// A wide arc used to read as a line — straightness alone is blind to a bow
// until the sweep passes 150° (a 140° arc was line 0.63). The arcs are their
// own sweep, 30° to 300°, drawn every way the corpus draws everything else;
// the corpus itself must not gain an arc it did not have.

describe('recognition benchmark — arcs by sweep (S1)', () => {
  const cases = buildArcCases();
  const bySweep = new Map<number, { n: number; top: number; steady: number; steadyTop: number; confused: Record<string, number> }>();
  for (const c of cases) {
    const top = analyzeStroke(c.points).results[0]?.type;
    const b = bySweep.get(c.sweep) ?? { n: 0, top: 0, steady: 0, steadyTop: 0, confused: {} };
    bySweep.set(c.sweep, b);
    const steady = !/jit5/.test(c.label);
    b.n++;
    if (steady) b.steady++;
    if (top === 'arc') {
      b.top++;
      if (steady) b.steadyTop++;
    } else b.confused[top ?? 'nothing'] = (b.confused[top ?? 'nothing'] ?? 0) + 1;
  }

  it('reports arcs by sweep', () => {
    const lines = [`\n  ${cases.length} hand-drawn arcs, 30° to 300°`];
    for (const [sweep, b] of bySweep) {
      const confused = Object.entries(b.confused).map(([k, v]) => `${k}×${v}`).join(' ');
      lines.push(`  arc ${String(sweep).padStart(3)}°  top ${String(b.top).padStart(3)}/${b.n} (${((b.top / b.n) * 100).toFixed(0).padStart(3)}%)   steady hand ${b.steadyTop}/${b.steady}` + (confused ? `   confused: ${confused}` : ''));
    }
    console.log(lines.join('\n'));
    expect([...bySweep.keys()]).toEqual([...ARC_SWEEPS]);
  });

  it('reads an arc as an arc at every sweep from 30° to 300° — 98% of every hand, all of a steady one', () => {
    for (const [sweep, b] of bySweep) {
      expect(b.top / b.n, `${sweep}°`).toBeGreaterThanOrEqual(0.98);
      expect(b.steadyTop, `${sweep}° steady`).toBe(b.steady);
    }
  });

  it('gives the corpus no new arc: nothing but a line carries one, and no line reads as one first', () => {
    const offered: string[] = [];
    for (const c of buildCases()) {
      const r = analyzeStroke(c.points).results;
      if (r[0]?.type === 'arc') offered.push(`${c.label} reads as an arc first`);
      else if (c.expect !== 'line' && r.some((x) => x.type === 'arc')) offered.push(`${c.label} carries an arc`);
    }
    expect(offered).toEqual([]);
  });
});

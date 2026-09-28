import { describe, it, expect } from 'vitest';
import { analyzeStroke, matchPrimitiveFromLibrary, MAX_TIER0_CONFIDENCE } from './recognition';
import { getFingerprint } from './geometry';
import { lineStroke, circleStroke, arcStroke, rectStroke, triangleStroke, handRect, handTriangle, handPolygon, handLine, handArrow, handArc } from './test/strokes';
import type { Point } from './types';

describe('analyzeStroke — primitive recognition', () => {
  it('recognizes a circle', () => {
    const { results } = analyzeStroke(circleStroke(200, 200, 100));
    expect(results[0]?.type).toBe('circle');
    expect(results[0].confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('recognizes a line', () => {
    const { results } = analyzeStroke(lineStroke({ x: 0, y: 0 }, { x: 400, y: 30 }));
    expect(results[0]?.type).toBe('line');
    expect(results[0].confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('recognizes a short line (size-relative overshoot fix)', () => {
    const { results } = analyzeStroke(lineStroke({ x: 0, y: 0 }, { x: 50, y: 0 }));
    expect(results[0]?.type).toBe('line');
  });

  it('recognizes an open arc', () => {
    const { results } = analyzeStroke(arcStroke(200, 200, 100));
    expect(results[0]?.type).toBe('arc');
  });

  it('recognizes a rectangle (4 corners beats the triangle detector)', () => {
    const { results } = analyzeStroke(rectStroke(50, 50, 220, 140));
    expect(results[0]?.type).toBe('rectangle');
  });

  it('recognizes a triangle', () => {
    const { results } = analyzeStroke(
      triangleStroke({ x: 100, y: 250 }, { x: 300, y: 250 }, { x: 200, y: 60 })
    );
    expect(results[0]?.type).toBe('triangle');
  });

  it('returns results sorted by score, highest first', () => {
    const { results } = analyzeStroke(
      triangleStroke({ x: 100, y: 250 }, { x: 300, y: 250 }, { x: 200, y: 60 })
    );
    const scores = results.map((r) => r.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });
});

describe('matchPrimitiveFromLibrary', () => {
  it('scores identical fingerprints as a perfect match', () => {
    const fp = getFingerprint(circleStroke(200, 200, 100));
    expect(matchPrimitiveFromLibrary(fp, fp)).toBeCloseTo(1, 5);
  });

  it('scores similar shapes highly despite size differences', () => {
    const small = getFingerprint(circleStroke(100, 100, 50));
    const large = getFingerprint(circleStroke(300, 300, 90));
    expect(matchPrimitiveFromLibrary(small, large)).toBeGreaterThan(0.7);
  });

  it('vetoes matches when straightness differs by more than 0.5', () => {
    const circle = getFingerprint(circleStroke(200, 200, 100)); // straightness ~0
    const line = getFingerprint(lineStroke({ x: 0, y: 0 }, { x: 400, y: 0 })); // ~1
    expect(matchPrimitiveFromLibrary(circle, line)).toBe(0);
  });
});

// ===== The refresh (Aug 2026) =====

describe('a rectangle is not a triangle', () => {
  // The reported bug. Two causes: corner counting measured in point-index space
  // (so it missed a corner whenever the stroke was drawn quickly) and could
  // never see the corner on the seam; and the two detectors had overlapping
  // corner bands with fixed confidences, so a 3-corner shape matched both and
  // triangle won because 0.85 > 0.80 — not because it looked like one.
  it('reads as a rectangle however fast it was drawn and wherever it started', () => {
    for (const density of [0.12, 0.35, 1.0, 2.5]) {
      for (const startAt of [0, 0.13, 0.5]) {
        const top = analyzeStroke(handRect(0, 0, 200, 140, { density, startAt, jitter: 2.5, seed: 8 })).results[0];
        expect(top?.type, `density ${density} start ${startAt} read as ${top?.type}`).toBe('rectangle');
      }
    }
  });

  it('separates them by how much of the box they fill, not by corner count alone', () => {
    const rect = analyzeStroke(handRect(0, 0, 200, 140, { seed: 8 })).fingerprint;
    const tri = analyzeStroke(handTriangle({ x: 0, y: 160 }, { x: 100, y: 0 }, { x: 200, y: 160 }, { seed: 8 })).fingerprint;
    expect(rect.extent).toBeGreaterThan(0.85);
    expect(tri.extent).toBeLessThan(0.65);
  });

  it('a triangle is still a triangle', () => {
    for (const density of [0.12, 0.35, 1.0]) {
      const top = analyzeStroke(handTriangle({ x: 0, y: 170 }, { x: 160, y: 10 }, { x: 210, y: 170 }, { density, seed: 8 })).results[0];
      expect(top?.type).toBe('triangle');
    }
  });
});

describe('confidence is measured, not assigned', () => {
  it('ranks readings by evidence — a clean shape outscores a marginal one', () => {
    const clean = analyzeStroke(handRect(0, 0, 200, 140, { jitter: 0, round: 0, seed: 1 })).results[0]!;
    const rough = analyzeStroke(handRect(0, 0, 200, 140, { jitter: 6, round: 0.4, seed: 1 })).results[0]!;
    expect(clean.confidence).toBeGreaterThan(rough.confidence);
  });

  it('never claims certainty — a perfect fit is still only evidence', () => {
    for (const pts of [rectStroke(0, 0, 200, 140), circleStroke(0, 0, 90), triangleStroke({ x: 0, y: 160 }, { x: 100, y: 0 }, { x: 200, y: 160 })]) {
      for (const r of analyzeStroke(pts).results) {
        expect(r.confidence).toBeLessThanOrEqual(MAX_TIER0_CONFIDENCE);
      }
    }
  });

  it('leaves headroom for a participant with more context to outrank it', () => {
    const top = analyzeStroke(circleStroke(0, 0, 90)).results[0]!;
    expect(top.confidence).toBeLessThan(0.95);
  });

  it('states the evidence in its reasoning', () => {
    const r = analyzeStroke(handRect(0, 0, 200, 140, { seed: 2 })).results[0]!;
    expect(r.reasoning).toMatch(/fills \d+% of its box/);
  });
});

describe('multi-parse survives — ambiguity is reported, not resolved', () => {
  it('offers competing readings for a genuinely ambiguous shape', () => {
    // A pentagon has a corner more than a rectangle and five more than a
    // circle, and fills its box like neither. Both readings are true;
    // collapsing to one would be the lie. (A diamond used to be the example
    // here — but a diamond is a rotated square, and now that extent is
    // measured against the tightest box at any angle the engine says so.)
    const reg = (n: number, r = 100) => Array.from({ length: n }, (_, i) => ({
      x: 150 + r * Math.cos((i / n) * Math.PI * 2 - Math.PI / 2),
      y: 150 + r * Math.sin((i / n) * Math.PI * 2 - Math.PI / 2),
    }));
    const results = analyzeStroke(handPolygon(reg(5), { jitter: 2, seed: 3 })).results;
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.map((r) => r.type)).toEqual(expect.arrayContaining(['rectangle', 'circle']));
  });

  it('does not spam readings for an unambiguous one', () => {
    const results = analyzeStroke(handRect(0, 0, 200, 140, { jitter: 1, seed: 3 })).results;
    expect(results[0].type).toBe('rectangle');
    expect(results.filter((r) => r.confidence > 0.5)).toHaveLength(1);
  });
});

// ===== S1: an L, a wide arc (V1-PLAN §9, found by D1 and the maths lane) =====

/** Two ruled arms meeting at `b`: from `a` to the bend, then on to `c`, each a hand's line. */
function ell(a: Point, b: Point, c: Point, o: { seed?: number; jitter?: number } = {}): Point[] {
  const opts = { jitter: o.jitter ?? 1.5, seed: o.seed ?? 1 };
  return [...handLine(a, b, opts), ...handLine(b, c, { ...opts, seed: (o.seed ?? 1) + 101 }).slice(1)];
}

/** Turn a stroke about the origin, `deg` degrees. */
const turned = (pts: Point[], deg: number): Point[] => {
  const t = (deg * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
  return pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
};

describe('an arrow’s barb is short against its shaft; an L is two arms (S1)', () => {
  it('an L is not an arrow: no arrow reading at all, whichever way it is drawn', () => {
    // The second arm is two fifths of the first or more — the Ls a box drawn
    // in two strokes is made of (D1: a 160×70 process is two Ls of 0.44).
    const missed: string[] = [];
    for (const ratio of [0.4, 0.44, 0.5, 0.6, 0.75, 1]) {
      for (const long of [120, 160, 240]) {
        for (const turn of [0, 90, 200, 300]) {
          for (const side of [1, -1]) {
            for (const jitter of [0, 2]) {
              const pts = turned(ell({ x: 0, y: 0 }, { x: long, y: 0 }, { x: long, y: side * long * ratio }, { seed: long + turn, jitter }), turn);
              const arrow = analyzeStroke(pts).results.find((r) => r.type === 'arrow');
              if (arrow) missed.push(`${ratio} of ${long}, turned ${turn}, side ${side}, jitter ${jitter}: arrow ${arrow.confidence.toFixed(2)}`);
            }
          }
        }
      }
    }
    expect(missed).toEqual([]);
  });

  it('the box D1 drew as two Ls is two strokes that are not arrows', () => {
    // Top then right, and left then bottom: 160 and 70, the finding's arrow 0.59 each.
    const first = ell({ x: 320, y: 845 }, { x: 480, y: 845 }, { x: 480, y: 915 }, { seed: 7 });
    const second = ell({ x: 320, y: 845 }, { x: 320, y: 915 }, { x: 480, y: 915 }, { seed: 9 });
    for (const pts of [first, second]) {
      const results = analyzeStroke(pts).results;
      expect(results.map((r) => r.type)).not.toContain('arrow');
      expect(results[0]?.type).toBe('line'); // a bent line: a connector, still
    }
  });

  it('an arrow says how long its barb is against its shaft, and a hand’s barb is short', () => {
    for (const opts of [{}, { wings: 2 as const, headLen: 32 }, { headAt: 'start' as const }, { wings: 2 as const, headLen: 16 }]) {
      for (const seed of [1, 2, 3]) {
        const r = analyzeStroke(handArrow({ x: 0, y: 0 }, { x: 220, y: 30 }, { ...opts, seed })).results[0];
        expect(r?.type).toBe('arrow');
        const m = /barb (\d\.\d\d) of (?:its|the) shaft/.exec(r!.reasoning);
        expect(m, r!.reasoning).not.toBeNull();
        expect(Number(m![1])).toBeLessThan(0.3);
      }
    }
  });

  it('a barb is a flick of the pen: a short arrow with a hand-sized head is still an arrow', () => {
    // On a 40px shaft a 16px barb is 0.4 of it — as long against its shaft as
    // an L's arm — but in the hand's space it is a flick, not an arm.
    for (const [len, headLen] of [[40, 16], [50, 16], [60, 20]]) {
      for (const seed of [1, 2, 3]) {
        const results = analyzeStroke(handArrow({ x: 0, y: 0 }, { x: len, y: len * 0.25 }, { headLen, seed, jitter: 1 })).results;
        expect(results.map((r) => r.type), `${len} with ${headLen}`).toContain('arrow');
      }
    }
  });

  it('a tall l with a liftoff flick stays a line (QA-v10: no arrow)', () => {
    // John's l, 8×73 on screen: a stem, and the hook a pen leaves lifting off.
    for (const seed of [1, 2, 3, 4]) {
      const stem = handLine({ x: 0, y: 0 }, { x: 1, y: 66 }, { seed, jitter: 1, density: 1 });
      const hook = Array.from({ length: 8 }, (_, i) => {
        const a = Math.PI - ((i + 1) / 8) * Math.PI * 0.6;
        return { x: 7 + 6 * Math.cos(a), y: 66 + 6 * Math.sin(a) * 0.9 };
      });
      const results = analyzeStroke(stem.concat(hook)).results;
      expect(results[0]?.type).toBe('line');
      expect(results.map((r) => r.type)).not.toContain('arrow');
    }
  });
});

describe('a wide arc is an arc; a line is still a line (S1)', () => {
  it('the finding: a 140° arc reads as an arc, not line 0.63', () => {
    const results = analyzeStroke(handArc(300, 300, 150, -160, 140, { jitter: 0, density: 0.5 })).results;
    expect(results[0]?.type).toBe('arc');
    expect(results[0].reasoning).toMatch(/140|1[34]\d°/);
  });

  it('arcs of every sweep from 30° to 300°, drawn steadily, read as arcs, and say their sweep', () => {
    const missed: string[] = [];
    for (const sweep of [30, 45, 60, 90, 120, 140, 180, 240, 300]) {
      const r = sweep <= 180 ? 120 / Math.sin((sweep * Math.PI) / 360) : 100;
      for (const seed of [1, 2, 3]) {
        for (const jitter of [0, 1.5]) {
          const top = analyzeStroke(handArc(0, 0, r, -90 - sweep / 2 + seed * 40, sweep, { seed, jitter })).results[0];
          if (top?.type !== 'arc') missed.push(`${sweep}° seed ${seed} jitter ${jitter}: ${top?.type} ${top?.confidence.toFixed(2)}`);
        }
      }
    }
    expect(missed).toEqual([]);
  });

  it('a slow, wobbly straight line is never an arc — measured on the denoised path', () => {
    const arcs: string[] = [];
    for (let seed = 1; seed <= 12; seed++) {
      for (const len of [120, 180, 240, 400]) {
        for (const [jitter, sensorNoise, density] of [[5, 2, 2.5], [5, 0, 0.35], [2.5, 1, 1]]) {
          const a = (seed * 37) % 360;
          const to = { x: len * Math.cos((a * Math.PI) / 180), y: len * Math.sin((a * Math.PI) / 180) };
          const results = analyzeStroke(handLine({ x: 0, y: 0 }, to, { jitter, sensorNoise, density, seed })).results;
          const line = results.find((r) => r.type === 'line'), arc = results.find((r) => r.type === 'arc');
          if (results[0]?.type === 'arc' || (arc && (!line || arc.confidence >= line.confidence))) arcs.push(`${len}px seed ${seed} jitter ${jitter}: ${results.map((r) => `${r.type} ${r.confidence.toFixed(2)}`).join(' · ')}`);
        }
      }
    }
    expect(arcs).toEqual([]);
  });

  it('a bend is not an arc: the half of a diamond drawn in two strokes', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      for (const [w, h] of [[120, 120], [160, 100], [220, 90]]) {
        const pts = ell({ x: -w / 2, y: 0 }, { x: 0, y: -h / 2 }, { x: w / 2, y: 0 }, { seed: seed * 90 + w, jitter: 1.5 });
        expect(analyzeStroke(pts).results[0]?.type, `${w}×${h} seed ${seed}`).not.toBe('arc');
      }
    }
  });
});

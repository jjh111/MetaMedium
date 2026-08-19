import { describe, it, expect } from 'vitest';
import { analyzeStroke, matchPrimitiveFromLibrary, MAX_TIER0_CONFIDENCE } from './recognition';
import { getFingerprint } from './geometry';
import { lineStroke, circleStroke, arcStroke, rectStroke, triangleStroke, handRect, handTriangle, handPolygon } from './test/strokes';

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
    // A diamond has four corners like a rectangle and fills half its box like a
    // triangle. Both readings are true; collapsing to one would be the lie.
    const results = analyzeStroke(
      handPolygon([{ x: 100, y: 0 }, { x: 200, y: 100 }, { x: 100, y: 200 }, { x: 0, y: 100 }], { jitter: 2, seed: 3 })
    ).results;
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.map((r) => r.type)).toEqual(expect.arrayContaining(['triangle', 'rectangle']));
  });

  it('does not spam readings for an unambiguous one', () => {
    const results = analyzeStroke(handRect(0, 0, 200, 140, { jitter: 1, seed: 3 })).results;
    expect(results[0].type).toBe('rectangle');
    expect(results.filter((r) => r.confidence > 0.5)).toHaveLength(1);
  });
});

import { describe, it, expect } from 'vitest';
import { analyzeStroke, matchPrimitiveFromLibrary } from './recognition';
import { getFingerprint } from './geometry';
import { lineStroke, circleStroke, arcStroke, rectStroke, triangleStroke } from './test/strokes';

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

import { describe, it, expect } from 'vitest';
import { learnCommandMark, matchesCommandMark, collidesWith, COMMAND_MARK_SAMPLES } from './commandmark';
import { getFingerprint } from '../geometry';
import { caretStroke, circleStroke, rectStroke, lineStroke, triangleStroke, checkStroke } from '../test/strokes';

// Five hand-drawn-ish carets: same mark, varying size and proportion.
const samples = [
  caretStroke(0, 0, 60, 40),
  caretStroke(10, 5, 66, 44),
  caretStroke(0, 0, 54, 38),
  caretStroke(20, 20, 62, 46),
  caretStroke(5, 5, 58, 36),
];

describe('learnCommandMark', () => {
  it('needs more than one sample — a single sample has no spread to measure', () => {
    expect(() => learnCommandMark([caretStroke(0, 0)])).toThrow(/at least 2/);
  });

  it('learns from the standard sample count', () => {
    expect(samples).toHaveLength(COMMAND_MARK_SAMPLES);
    const mark = learnCommandMark(samples, 'caret');
    expect(mark.name).toBe('caret');
    expect(mark.sampleCount).toBe(5);
    expect(mark.consistency).toBeGreaterThan(0);
  });

  it('reports low consistency when the samples are five different marks', () => {
    const inconsistent = learnCommandMark([
      circleStroke(0, 0, 50),
      lineStroke({ x: 0, y: 0 }, { x: 100, y: 0 }),
      rectStroke(0, 0, 80, 80),
      triangleStroke({ x: 0, y: 0 }, { x: 50, y: 80 }, { x: 100, y: 0 }),
      caretStroke(0, 0),
    ]);
    expect(inconsistent.consistency).toBeLessThan(learnCommandMark(samples).consistency);
  });
});

describe('matchesCommandMark', () => {
  const mark = learnCommandMark(samples, 'caret');

  it('accepts a sixth caret it never saw', () => {
    expect(matchesCommandMark(getFingerprint(caretStroke(300, 300, 70, 48)), mark).match).toBe(true);
  });

  it('is scale-invariant — the same mark drawn 5x larger still matches', () => {
    expect(matchesCommandMark(getFingerprint(caretStroke(0, 0, 300, 200)), mark).match).toBe(true);
  });

  it('scores dead-centre marks higher than edge-of-band ones', () => {
    const centre = matchesCommandMark(getFingerprint(caretStroke(0, 0, 60, 40)), mark);
    const edge = matchesCommandMark(getFingerprint(caretStroke(0, 0, 60, 22)), mark);
    expect(centre.score).toBeGreaterThan(edge.score);
  });

  // Rejection matters more than recognition: a command mark that also fires
  // while you draw reads as broken, not as eager (MVP.md §5.2).
  it.each([
    ['circle', circleStroke(0, 0, 60)],
    ['rectangle', rectStroke(0, 0, 120, 90)],
    ['line', lineStroke({ x: 0, y: 0 }, { x: 200, y: 10 })],
    ['triangle', triangleStroke({ x: 0, y: 0 }, { x: 60, y: 100 }, { x: 120, y: 0 })],
  ])('does NOT fire on an ordinary %s', (_label, stroke) => {
    expect(matchesCommandMark(getFingerprint(stroke), mark).match).toBe(false);
  });

  it('rejects a closed mark outright when the taught mark is open', () => {
    const r = matchesCommandMark(getFingerprint(circleStroke(0, 0, 40)), mark);
    expect(r.match).toBe(false);
    expect(r.score).toBe(0);
  });

  it('names the feature that pushed a near-miss outside the band', () => {
    const r = matchesCommandMark(getFingerprint(lineStroke({ x: 0, y: 0 }, { x: 200, y: 0 })), mark);
    expect(r.match).toBe(false);
    expect(r.failedOn).toBeDefined();
  });
});

describe('collidesWith', () => {
  const mark = learnCommandMark(samples, 'caret');

  it('refuses a signature that would fire on the user’s own vocabulary', () => {
    const vocabulary = [caretStroke(0, 0, 64, 42)].map(getFingerprint);
    expect(collidesWith(mark, vocabulary)).toBe(true);
  });

  it('passes when the vocabulary is nothing like the mark', () => {
    const vocabulary = [circleStroke(0, 0, 50), rectStroke(0, 0, 100, 60)].map(getFingerprint);
    expect(collidesWith(mark, vocabulary)).toBe(false);
  });
});

describe('a taught mark can be something other than a caret', () => {
  it('learns a check and still rejects circles', () => {
    const mark = learnCommandMark(
      [checkStroke(0, 0), checkStroke(5, 5), checkStroke(10, 0), checkStroke(0, 8), checkStroke(3, 3)],
      'tick'
    );
    expect(matchesCommandMark(getFingerprint(checkStroke(500, 500)), mark).match).toBe(true);
    expect(matchesCommandMark(getFingerprint(circleStroke(0, 0, 60)), mark).match).toBe(false);
  });
});

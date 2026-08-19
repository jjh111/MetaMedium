// The gesture benchmark.
//
// A command mark is judged on two things, and the second matters more: does it
// fire when you make it, and does it stay quiet when you are just drawing? A
// mark that erupts mid-stroke reads as broken, not as eager — so the rejection
// corpus here is deliberately larger than the acceptance one, and includes the
// shapes the canvas's own vocabulary is made of.

import { describe, it, expect } from 'vitest';
import {
  BUILTIN_COMMAND_MARK,
  learnCommandMark,
  matchesCommandMark,
  canonicalCheckSamples,
} from './commandmark';
import { getFingerprint } from '../geometry';
import {
  handRect, handTriangle, handCircle, handLine, handPolygon, rng,
  circleStroke, rectStroke, triangleStroke, lineStroke, arcStroke, scratchStroke,
} from '../test/strokes';
import type { Point } from '../types';

/** A check as a hand makes it: varying size, proportion, slant, and wobble. */
function handCheck(seed: number): Point[] {
  const r = rng(seed);
  const w = 45 + r() * 80;
  const h = w * (0.4 + r() * 0.35);
  const dip = 0.28 + r() * 0.16;
  const rise = 0.35 + r() * 0.35;
  const slant = (r() - 0.5) * 0.22;
  const wob = () => (r() - 0.5) * (w * 0.035);
  const seg = (a: Point, b: Point, n: number) =>
    Array.from({ length: n }, (_, i) => ({
      x: a.x + (b.x - a.x) * (i / (n - 1)) + wob(),
      y: a.y + (b.y - a.y) * (i / (n - 1)) + wob(),
    }));
  const start = { x: 0, y: 0 };
  const vertex = { x: w * dip, y: h };
  const end = { x: w, y: -h * rise + w * slant };
  return seg(start, vertex, 30).concat(seg(vertex, end, 40).slice(1));
}

describe('the built-in command mark is defined, not assumed', () => {
  it('is a signature, learned from canonical samples like any taught mark', () => {
    expect(BUILTIN_COMMAND_MARK.name).toBe('check');
    expect(BUILTIN_COMMAND_MARK.sampleCount).toBe(canonicalCheckSamples().length);
    expect(BUILTIN_COMMAND_MARK.isClosed).toBe(false);
  });

  it('accepts a check drawn by hand, at any size', () => {
    let hits = 0;
    for (let seed = 1; seed <= 60; seed++) {
      if (matchesCommandMark(getFingerprint(handCheck(seed)), BUILTIN_COMMAND_MARK).match) hits++;
    }
    expect(hits / 60).toBeGreaterThanOrEqual(0.9);
  });

  // The reason the gesture needed defining: the previous rule (open, 1–2
  // corners, smaller than the lasso) fired on every one of these.
  const notAMark: [string, Point[]][] = [
    ['an L', lineStroke({ x: 0, y: 0 }, { x: 60, y: 0 }, 30).concat(lineStroke({ x: 60, y: 0 }, { x: 60, y: 60 }, 30).slice(1))],
    ['a backwards L', lineStroke({ x: 0, y: 60 }, { x: 0, y: 0 }, 30).concat(lineStroke({ x: 0, y: 0 }, { x: 60, y: 0 }, 30).slice(1))],
    ['an upside-down caret', lineStroke({ x: 0, y: 60 }, { x: 30, y: 0 }, 30).concat(lineStroke({ x: 30, y: 0 }, { x: 60, y: 60 }, 30).slice(1))],
    ['a V (symmetric arms)', lineStroke({ x: 0, y: 0 }, { x: 30, y: 60 }, 30).concat(lineStroke({ x: 30, y: 60 }, { x: 60, y: 0 }, 30).slice(1))],
    ['a check drawn backwards', lineStroke({ x: 70, y: -15 }, { x: 25, y: 35 }, 30).concat(lineStroke({ x: 25, y: 35 }, { x: 0, y: 0 }, 30).slice(1))],
    ['a rectangle', rectStroke(0, 0, 120, 90)],
    ['a circle', circleStroke(0, 0, 60)],
    ['a triangle', triangleStroke({ x: 0, y: 100 }, { x: 60, y: 0 }, { x: 120, y: 100 })],
    ['a line', lineStroke({ x: 0, y: 0 }, { x: 150, y: 30 })],
    ['an arc', arcStroke(0, 0, 60)],
    ['a scratch-out', scratchStroke(0, 0, 160, 60, 3)],
    ['a hand-drawn box', handRect(0, 0, 140, 100, { seed: 3 })],
    ['a hand-drawn triangle', handTriangle({ x: 0, y: 120 }, { x: 70, y: 0 }, { x: 140, y: 120 }, { seed: 3 })],
    ['a hand-drawn circle', handCircle(0, 0, 70, { seed: 3 })],
    ['a hand-drawn line', handLine({ x: 0, y: 0 }, { x: 160, y: 40 }, { seed: 3 })],
    ['a diamond', handPolygon([{ x: 60, y: 0 }, { x: 120, y: 60 }, { x: 60, y: 120 }, { x: 0, y: 60 }], { seed: 3 })],
  ];

  it.each(notAMark)('stays quiet on %s', (_label, points) => {
    expect(matchesCommandMark(getFingerprint(points), BUILTIN_COMMAND_MARK).match).toBe(false);
  });

  it('is quiet across the whole recognition corpus — no false fires while drawing', () => {
    let fired = 0;
    let total = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const shapes = [
        handRect(0, 0, 180 + seed * 5, 130, { seed }),
        handTriangle({ x: 0, y: 150 }, { x: 90, y: 0 }, { x: 180, y: 150 }, { seed }),
        handCircle(0, 0, 60 + seed * 3, { seed }),
        handLine({ x: 0, y: 0 }, { x: 200, y: 20 * seed }, { seed }),
      ];
      for (const s of shapes) {
        total++;
        if (matchesCommandMark(getFingerprint(s), BUILTIN_COMMAND_MARK).match) fired++;
      }
    }
    expect(fired, `${fired}/${total} ordinary marks summoned`).toBe(0);
  });
});

describe('orientation is part of the mark', () => {
  it('separates a check from its mirror and its upside-down twin', () => {
    const upright = getFingerprint(handCheck(5));
    expect(matchesCommandMark(upright, BUILTIN_COMMAND_MARK).match).toBe(true);

    const flipped = getFingerprint(handCheck(5).map((p) => ({ x: p.x, y: -p.y })));
    expect(matchesCommandMark(flipped, BUILTIN_COMMAND_MARK).match).toBe(false);
  });
});

describe('a taught mark replaces the built-in one entirely', () => {
  const caret = (x: number, y: number, w: number, h: number) =>
    lineStroke({ x, y: y + h }, { x: x + w / 2, y }, 30).concat(
      lineStroke({ x: x + w / 2, y }, { x: x + w, y: y + h }, 30).slice(1)
    );

  it('learns a caret and then rejects the check it used to accept', () => {
    const mark = learnCommandMark(
      [caret(0, 0, 60, 40), caret(0, 0, 66, 44), caret(0, 0, 54, 38), caret(0, 0, 62, 46), caret(0, 0, 58, 36)],
      'caret'
    );
    expect(matchesCommandMark(getFingerprint(caret(200, 200, 70, 46)), mark).match).toBe(true);
    expect(matchesCommandMark(getFingerprint(handCheck(9)), mark).match).toBe(false);
  });

  it('a taught mark is held to the same silence requirement', () => {
    const mark = learnCommandMark(
      [caret(0, 0, 60, 40), caret(0, 0, 66, 44), caret(0, 0, 54, 38), caret(0, 0, 62, 46), caret(0, 0, 58, 36)],
      'caret'
    );
    for (const [label, points] of notAMarkShapes()) {
      expect(matchesCommandMark(getFingerprint(points), mark).match, label).toBe(false);
    }
  });

  function notAMarkShapes(): [string, Point[]][] {
    return [
      ['rectangle', handRect(0, 0, 140, 100, { seed: 4 })],
      ['circle', handCircle(0, 0, 70, { seed: 4 })],
      ['triangle', handTriangle({ x: 0, y: 120 }, { x: 70, y: 0 }, { x: 140, y: 120 }, { seed: 4 })],
      ['line', handLine({ x: 0, y: 0 }, { x: 160, y: 40 }, { seed: 4 })],
      ['scratch', scratchStroke(0, 0, 160, 60, 3)],
    ];
  }
});

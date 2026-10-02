import { describe, it, expect } from 'vitest';
import { getFingerprint } from '../geometry';
import { circleStroke, lineStroke } from '../test/strokes';
import { isLassoLike, isCheckLike, resolvesLasso, enclosedBy } from './gesture';
import { checkStroke } from '../test/strokes';

const lassoFp = getFingerprint(circleStroke(300, 300, 200));

describe('isLassoLike', () => {
  it('requires closure AND enclosed content — a circle around nothing is just a circle', () => {
    const fp = getFingerprint(circleStroke(300, 300, 200));
    expect(isLassoLike(fp, 0)).toBe(false);
    expect(isLassoLike(fp, 3)).toBe(true);
  });

  it('rejects open strokes regardless of enclosure', () => {
    const fp = getFingerprint(lineStroke({ x: 0, y: 0 }, { x: 400, y: 0 }));
    expect(isLassoLike(fp, 3)).toBe(false);
  });
});

describe('isCheckLike', () => {
  it('accepts an open, one-corner, small stroke', () => {
    const fp = getFingerprint(checkStroke(520, 300));
    expect(fp.isClosed).toBe(false);
    expect(fp.corners).toBeGreaterThanOrEqual(1);
    expect(isCheckLike(fp, lassoFp)).toBe(true);
  });

  it('rejects closed strokes and smooth strokes', () => {
    expect(isCheckLike(getFingerprint(circleStroke(500, 300, 30)), lassoFp)).toBe(false);
    expect(
      isCheckLike(getFingerprint(lineStroke({ x: 500, y: 300 }, { x: 560, y: 320 })), lassoFp)
    ).toBe(false); // straight line: 0 corners
  });

  it('rejects strokes too large relative to the lasso', () => {
    const smallLasso = getFingerprint(circleStroke(300, 300, 40));
    const bigCheck = getFingerprint(checkStroke(350, 300)); // size 70 > 0.6 * 80
    expect(isCheckLike(bigCheck, smallLasso)).toBe(false);
  });
});

describe('resolvesLasso — temporal + contextual, never time alone', () => {
  const checkFp = getFingerprint(checkStroke(520, 300)); // just outside lasso bounds

  it('resolves when shape, proximity, and recency all hold', () => {
    expect(resolvesLasso(checkFp, 1000, lassoFp, 0)).toBe(true);
  });

  it('fails when too late, even if shape and proximity hold', () => {
    expect(resolvesLasso(checkFp, 10000, lassoFp, 0)).toBe(false);
  });

  it('fails when too far away, even if prompt and check-shaped', () => {
    const farCheck = getFingerprint(checkStroke(900, 900));
    expect(resolvesLasso(farCheck, 1000, lassoFp, 0)).toBe(false);
  });
});

describe('enclosedBy', () => {
  it('returns only fully enclosed candidates', () => {
    const inside = getFingerprint(circleStroke(300, 300, 50)).bounds;
    const outside = getFingerprint(circleStroke(700, 700, 50)).bounds;
    const ids = enclosedBy(lassoFp.bounds, [
      { id: 'in', bounds: inside },
      { id: 'out', bounds: outside },
    ]);
    expect(ids).toEqual(['in']);
  });
});

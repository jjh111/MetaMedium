// The field's order, in Node (V1-PLAN B1): the reading first, then learned
// use — the palette's `baseLikelihood`, moved into core with the device's
// counts handed in.

import { describe, it, expect } from 'vitest';
import { baseOn, likelihoodOf, rankOffers, isSpecific, useLift, MODEL_DISCOUNT, USE_LIFT_MAX, type Rankable } from './rank';

const item = (key: string, base: number, more: Partial<Rankable> = {}): Rankable => ({ key, base, ...more });

describe('the field’s order', () => {
  it('what an item stands on sets its base: known, then written, then proposed, then a concept', () => {
    expect(baseOn({ on: 'known', confidence: 0.3 })).toBe(1.4);
    expect(baseOn({ on: 'written', confidence: 0.3 })).toBe(1.35);
    expect(baseOn({ on: 'proposed', confidence: 0.8 })).toBeCloseTo(1.28, 10);
    expect(baseOn({ on: 'clean', confidence: 1 })).toBeCloseTo(0.95, 10);
    expect(baseOn({ on: 'row', confidence: 0.8 })).toBeCloseTo(0.86, 10);
    // The number is the palette's own arithmetic, so ties fall as they always did.
    expect(baseOn({ on: 'row', confidence: 0.83 })).toBe(0.5 + 0.45 * 0.83);
  });

  it('asking a model costs a little; a seat is asked like the canvas', () => {
    expect(likelihoodOf(item('what', 0.36, { asks: 'model' }))).toBe(0.36 * MODEL_DISCOUNT);
    expect(likelihoodOf(item('decide', 0.36, { asks: 'seat' }))).toBe(0.36);
  });

  it('learned use lifts a generic item, up to a quarter again, and never one specific to these marks', () => {
    expect(useLift(0)).toBe(1);
    expect(useLift(1)).toBeCloseTo(1 + 0.2 * Math.log(2), 10);
    expect(useLift(3)).toBe(USE_LIFT_MAX); // 1 + 0.2 ln 4 is past the bound already
    expect(useLift(10000)).toBe(USE_LIFT_MAX);
    const uses = { what: 50, 'label:inlet': 50 };
    expect(likelihoodOf(item('what', 0.36, { asks: 'model' }), uses)).toBe(0.36 * MODEL_DISCOUNT * USE_LIFT_MAX);
    const label = item('label:inlet', 1.35, { grounds: { on: 'written', confidence: 0.9 } });
    expect(isSpecific(label)).toBe(true);
    expect(likelihoodOf(label, uses)).toBe(1.35);
  });

  it('ranks most likely first, stable on ties, and changes nothing it is given', () => {
    const items = [
      item('keep', 0),
      item('read-any', 0.4, { asks: 'model' }),
      item('row:tidy-row', baseOn({ on: 'row', confidence: 0.83 }), { grounds: { on: 'row', confidence: 0.83 } }),
      item('row:equalize', baseOn({ on: 'row', confidence: 0.83 }), { grounds: { on: 'row', confidence: 0.83 } }),
      item('snap', baseOn({ on: 'clean', confidence: 0.9 }), { grounds: { on: 'clean', confidence: 0.9 } }),
      item('duplicate', 0),
    ];
    const before = JSON.stringify(items);
    const ranked = rankOffers(items);
    expect(ranked.map((i) => i.key)).toEqual(['snap', 'row:tidy-row', 'row:equalize', 'read-any', 'keep', 'duplicate']);
    expect(JSON.stringify(items)).toBe(before);
    expect(ranked[0].likelihood).toBeCloseTo(0.915, 10);
  });

  it('a hand that always asks what a group is sees it rise past reading it as writing, and never past a name it gave', () => {
    const items = [
      item('sug:1', 1.4, { grounds: { on: 'known', confidence: 0.7 } }),
      item('read-any', 0.4, { asks: 'model' }),
      item('what', 0.36, { asks: 'model' }),
    ];
    expect(rankOffers(items).map((i) => i.key)).toEqual(['sug:1', 'read-any', 'what']);
    expect(rankOffers(items, { what: 20 }).map((i) => i.key)).toEqual(['sug:1', 'what', 'read-any']);
  });
});

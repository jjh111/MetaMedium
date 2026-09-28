// Rank with the context applied (V1-PLAN §2.2, B2), pure: what an item stands
// on, what a context entry lifts, the bound, the reasons, learned use per
// context, what is never lifted, and the steady top.

import { describe, it, expect } from 'vitest';
import type { Context } from '../tools/tool';
import { NO_CONTEXT } from '../tools/tool';
import { baseOn, rankOffers, type Uses } from '../tools/rank';
import { AFFINITY, CONTEXT_LIFT_MAX, canLift, liftOf, liftTargets, rank, standsOn, steadyTop, topOf, type RankItem, type Ranked } from './rank';

const conv = (key: string, on: string, confidence: number, tool: string): RankItem => ({ key, base: baseOn({ on, confidence }), tool, grounds: { on, confidence } });
const ctxOf = (c: Partial<Context>): Context => ({ ...NO_CONTEXT, ...c });
const FLOW = ctxOf({ notations: [{ id: 'flowchart', weight: 0.8, reason: 'it sits beside a flowchart: three processes, one decision' }], kind: 'notation:flowchart', key: 'notation:flowchart@stroke:1' });
const ROW = ctxOf({ concepts: [{ name: 'row', weight: 0.8, reason: 'it sits beside a row: 3 comparable marks sitting side by side' }], kind: 'concept:row', key: 'concept:row@stroke:9' });

const items: RankItem[] = [
  conv('row:tidy-row', 'row', 0.94, 'tidy'),
  conv('row:equalize', 'row', 0.94, 'tidy'),
  conv('snap', 'clean', 0.9, 'clean'),
  { key: 'read-any', base: 0.4, tool: 'read', asks: 'model' },
  { key: 'what', base: 0.36, tool: 'what', asks: 'model' },
];

describe('rank — the field’s order, with what stands beside the hand', () => {
  it('what an item stands on: its grounds, the concept a reading names, its tool, its key', () => {
    expect([...standsOn(items[0])].sort()).toEqual(['key:row:tidy-row', 'on:row', 'tool:tidy']);
    expect([...standsOn({ key: 'concept:flow', base: 0.9, grounds: { on: 'concept', confidence: 0.9 } })].sort()).toEqual(['key:concept:flow', 'on:concept', 'on:flow']);
    // A notation lifts what stands on its own name and its tool, and its affinity; a concept, what stands on its name.
    expect(liftTargets('notation:flowchart')).toEqual(['on:flowchart', 'tool:notation:flowchart', ...AFFINITY['notation:flowchart']]);
    expect(liftTargets('concept:row')).toEqual(['on:row']);
  });

  it('a lift multiplies by a bounded factor and says why; nothing else moves', () => {
    const byRow = rank(items, ROW);
    expect(byRow.map((x) => x.key)).toEqual(['row:tidy-row', 'row:equalize', 'snap', 'read-any', 'what']);
    const tidy = byRow[0];
    expect(tidy.lift).toBeCloseTo(1 + (CONTEXT_LIFT_MAX - 1) * 0.8, 12);
    expect(tidy.because).toEqual(['it sits beside a row: 3 comparable marks sitting side by side']);
    expect(byRow.find((x) => x.key === 'snap')!).toMatchObject({ lift: 1, because: [] });
    const byFlow = rank(items, FLOW);
    expect(byFlow.map((x) => x.key)).toEqual(['snap', 'row:tidy-row', 'row:equalize', 'read-any', 'what']);
    expect(byFlow[0].because).toEqual(['it sits beside a flowchart: three processes, one decision']);
    // However strong the context, a quarter again at most.
    const loud = ctxOf({ notations: [{ id: 'flowchart', weight: 7, reason: 'loud' }] });
    expect(liftOf(items[2], loud).factor).toBe(CONTEXT_LIFT_MAX);
    // Two reasons for one item: the strongest sets the factor, both are said, strongest first.
    const both = ctxOf({ notations: FLOW.notations, recent: [{ tool: 'clean', offer: 'snap', at: 1, weight: 0.5 }] });
    expect(liftOf(items[2], both)).toEqual({ factor: 1 + (CONTEXT_LIFT_MAX - 1) * 0.8, because: ['it sits beside a flowchart: three processes, one decision', 'you just took it beside these'] });
  });

  it('with no context it is rankOffers, key for key and number for number — use included', () => {
    for (const uses of [{}, { what: 20 }, { snap: 1, 'row:equalize': 5 }] as Uses[]) {
      const a = rank(items, NO_CONTEXT, { uses });
      const b = rankOffers(items, uses);
      expect(a.map((x) => x.key)).toEqual(b.map((x) => x.key));
      expect(a.map((x) => x.likelihood)).toEqual(b.map((x) => x.likelihood));
      expect(a.map((x) => x.score)).toEqual(b.map((x) => x.likelihood));
    }
    // And a context whose entries lift none of these is the same thing.
    const elsewhere = ctxOf({ concepts: [{ name: 'writing', weight: 0.9, reason: 'it sits beside a line of writing' }] });
    expect(rank(items, elsewhere).map((x) => x.key)).toEqual(rankOffers(items).map((x) => x.key));
  });

  it('an act just taken beside the hand lifts that offer, and its tool’s other offers half as much', () => {
    const took = ctxOf({ recent: [{ tool: 'tidy', offer: 'row:equalize', at: 5, weight: 0.8 }] });
    const r = rank(items, took);
    expect(r[0].key).toBe('row:equalize');
    expect(r[0].because).toEqual(['you just took it beside these']);
    const sibling = r.find((x) => x.key === 'row:tidy-row')!;
    expect(sibling.lift).toBeCloseTo(1 + (CONTEXT_LIFT_MAX - 1) * 0.4, 12);
    expect(sibling.because).toEqual(['you just used tidy beside these']);
  });

  it('use is learned per context: this context’s count first, the global as the fallback', () => {
    const uses = { 'row:equalize': 0, what: 9 };
    const here = { 'row:equalize': 9 };
    const r = rank(items, NO_CONTEXT, { uses, usesHere: here });
    // equalize is lifted by its count here; what keeps its global count, since this context has none for it.
    expect(r.find((x) => x.key === 'row:equalize')!.likelihood).toBe(rankOffers(items, { 'row:equalize': 9 }).find((x) => x.key === 'row:equalize')!.likelihood);
    expect(r.find((x) => x.key === 'what')!.likelihood).toBe(rankOffers(items, { what: 9 }).find((x) => x.key === 'what')!.likelihood);
    expect(r[0].key).toBe('row:equalize');
  });

  it('what the hand named, wrote, or a model read here is never lifted, and nothing lifted passes it', () => {
    const named: RankItem = { key: 'sug:1', base: baseOn({ on: 'known', confidence: 0.7 }), grounds: { on: 'known', confidence: 0.7 } };
    const read: RankItem = { key: 'proposed:card', base: baseOn({ on: 'proposed', confidence: 0 }), grounds: { on: 'proposed', confidence: 0 } };
    const flow: RankItem = { key: 'concept:flow', base: baseOn({ on: 'concept', confidence: 1 }), grounds: { on: 'concept', confidence: 1 } };
    const loud = ctxOf({ concepts: [{ name: 'flow', weight: 1, reason: 'it sits beside a flow' }], recent: [{ tool: 'x', offer: 'sug:1', at: 1, weight: 1 }] });
    const r = rank([flow, read, named], loud, { uses: { 'concept:flow': 99 } });
    expect(r.map((x) => x.key)).toEqual(['sug:1', 'proposed:card', 'concept:flow']);
    expect(r[0]).toMatchObject({ lift: 1, because: [] });
    expect(r[2].lift).toBe(CONTEXT_LIFT_MAX);
    expect(r[2].score).toBeLessThan(r[1].score);
    expect(r[2].because).toEqual(['it sits beside a flow']);
  });

  it('canLift: whether any context could lift any of these — the reading under a mark never can', () => {
    const underMark: RankItem[] = [
      { key: 'word', base: baseOn({ on: 'known', confidence: 1 }), grounds: { on: 'known', confidence: 1 } },
      { key: 'said', base: baseOn({ on: 'written', confidence: 0.9 }), grounds: { on: 'written', confidence: 0.9 } },
      { key: 'shape:rectangle', base: baseOn({ on: 'shape', confidence: 0.86 }), grounds: { on: 'shape', confidence: 0.86 } },
    ];
    expect(canLift(underMark)).toBe(false);
    expect(canLift([{ key: 'concept:row', base: 0.8, grounds: { on: 'concept', confidence: 0.7 } }])).toBe(true);
    expect(canLift([items[3]])).toBe(true); // a tool's offer: an act taken beside the hand may lift it
  });
});

describe('the steady top — a margin, never a filter', () => {
  const r = (key: string, score: number, grounds?: RankItem['grounds']): Ranked<RankItem> => ({ key, base: score, grounds, likelihood: score, lift: 1, score, because: [] });

  it('holds the one that led among the eligible, moving it to the leader’s place and saying why', () => {
    const certain = r('concept:row', 0.93, { on: 'concept', confidence: 0.94 });
    const ranked = [certain, r('row:tidy-row', 0.925), r('snap', 0.915), r('what', 0.3)];
    const eligible = (x: Ranked<RankItem>) => !x.key.startsWith('concept:');
    const out = steadyTop(ranked, { key: 'snap', at: 0 }, { eligible, now: 10 });
    expect(out.map((x) => x.key)).toEqual(['concept:row', 'snap', 'row:tidy-row', 'what']);
    expect(out[1]).toMatchObject({ steady: true, because: ['it led here a moment ago, and nothing here beats it by 10%'] });
    expect(topOf(out, eligible)!.key).toBe('snap');
    // What was ranked is not changed.
    expect(ranked.map((x) => x.key)).toEqual(['concept:row', 'row:tidy-row', 'snap', 'what']);
    expect(ranked[2].steady).toBeUndefined();
  });

  it('lets go when another beats it by the margin, when it is not offered, when it is stale, and never over what is specific to these marks', () => {
    const held = { key: 'snap', at: 0 };
    expect(steadyTop([r('row:tidy-row', 1.02), r('snap', 0.9)], held)[0].key).toBe('row:tidy-row');
    expect(steadyTop([r('row:tidy-row', 0.9), r('what', 0.3)], held).map((x) => x.key)).toEqual(['row:tidy-row', 'what']);
    expect(steadyTop([r('row:tidy-row', 0.92), r('snap', 0.9)], held, { now: 120_001 })[0].key).toBe('row:tidy-row');
    expect(steadyTop([r('row:tidy-row', 0.92), r('snap', 0.9)], 'snap')[0].key).toBe('snap');
    const named = r('sug:1', 1.4, { on: 'known', confidence: 1 });
    expect(steadyTop([named, r('snap', 1.35)], held)[0].key).toBe('sug:1');
  });
});

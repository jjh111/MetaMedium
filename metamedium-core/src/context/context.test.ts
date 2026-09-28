// Context (V1-PLAN §2.2, B2): conceptual adjacency lifts, never hides, and the
// top offer holds steady. The three things B2 is done by, in Node:
//
//   - the same scope ranks differently beside a flowchart and beside a row,
//     each lift with its reason;
//   - small score changes never flip the top offer within one context;
//   - far from any context the order is exactly B1's — the golden fixtures of
//     `tools/builtin.test.ts` (e2e 49), key for key.
//
// And the rules that keep a context from being a mode: nearness relative to
// the marks' own size, acts that fade, nothing written, nothing removed.

import { describe, it, expect } from 'vitest';
import { createSession, type Session } from '../session/session';
import type { Bounds, Point } from '../types';
import type { Offer, ToolHost } from '../tools/tool';
import { offersFor, takeOffer, toolScope } from '../tools/registry';
import { rankOffers, type Uses } from '../tools/rank';
import '../tools/builtin';
import { drawFlowchart, FLOWCHART_VARIANTS } from '../notations/fixtures/flowchart';
import { contextAt, isEmptyContext, nearnessOf, pointNearnessOf, CONTEXT_FADE, RECENT_MS } from './context';
import { rank, steadyTop, type HeldTop, type Ranked } from './rank';

// The harness's own strokes (Demos/session-engine.e2e.js, window.__helpers), as builtin.test.ts draws them.
const line = (a: Point, b: Point, n = 40): Point[] => Array.from({ length: n }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / (n - 1), y: a.y + ((b.y - a.y) * i) / (n - 1) }));
function rect(x: number, y: number, w: number, h: number): Point[] {
  const v = [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
  const mid = { x: (v[0].x + v[1].x) / 2, y: (v[0].y + v[1].y) / 2 };
  const path = [mid, v[1], v[2], v[3], v[0], mid];
  let p: Point[] = [];
  for (let i = 0; i < path.length - 1; i++) p = p.concat(line(path[i], path[i + 1], 26).slice(i ? 1 : 0));
  return p;
}
const circle = (cx: number, cy: number, r: number, n = 110): Point[] => Array.from({ length: n + 1 }, (_, i) => ({ x: cx + r * Math.cos((i / n) * Math.PI * 2), y: cy + r * Math.sin((i / n) * Math.PI * 2) }));
function word(x: number, y: number, w: number, h: number, humps = 7): Point[] {
  const p: Point[] = [];
  const n = humps * 14;
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = t * humps * Math.PI;
    p.push({ x: x + w * t, y: y + h / 2 - (h / 2) * Math.abs(Math.sin(a)) * (0.7 + 0.3 * Math.cos(a * 0.37)) });
  }
  return p;
}

let clock = 1_000_000;
const draw = (s: Session, pts: Point[], gap = 4000) => s.addStroke(pts, (clock += gap), undefined, 1);
const hold = (s: Session, ids: string[]) => { s.summonMarks(ids, (clock += 100)); };
const letGo = (s: Session) => { const sum = s.getState().summon; if (sum) s.dismiss(sum.id, (clock += 100)); };

/** A host as the surface's is in the golden run: the stub joined, and it can see. */
const HOST: Partial<ToolHost> = { models: [{ name: 'llm:e2e-stub', sees: true }] };
/** What the tools offer for what the field holds now. */
const offersNow = (s: Session): Offer[] => offersFor(toolScope(s, { host: HOST }));
const keys = (xs: { key: string }[]) => xs.map((x) => x.key);

/** A pair of boxes, the same shapes wherever they are put: two peers side by side — a row of their own. */
const pair = (s: Session, x: number, y: number) => [draw(s, rect(x, y, 120, 60)), draw(s, rect(x + 140, y, 120, 60))];
/** The golden row of three boxes (e2e 49). */
const threeBoxes = (s: Session, ox = 0) => [[200, 200], [360, 204], [520, 200]].map(([x, y]) => draw(s, rect(ox + x, y, 120, 80), 100));

describe('context — what stands beside the hand lifts what it makes likelier, and says why (V1-PLAN §2.2)', () => {
  it('the same scope ranks differently beside a flowchart and beside a row, each lift with its reason', () => {
    // Beside a flowchart: the bench's hand-drawn one, with the pair to the right of its first process,
    // on a board that uses the flowchart pack — whose affinities say what a flowchart makes likelier (B3).
    const sf = createSession();
    drawFlowchart(sf, FLOWCHART_VARIANTS[0]);
    expect(sf.use('flowchart@1', (clock += 100))).toBeNull();
    const inFlow = pair(sf, 560, 320);
    hold(sf, inFlow);
    const offersF = offersNow(sf);
    const ctxF = contextAt(sf, inFlow);
    expect(ctxF.notations.map((n) => n.id)).toEqual(['flowchart']);
    expect(ctxF.notations[0].reason).toMatch(/^it sits beside a flowchart: three processes, two decisions/);
    expect(ctxF.kind).toBe('notation:flowchart');

    // Beside a row: the golden row of three, with the same pair to its right.
    const sr = createSession();
    threeBoxes(sr);
    const inRow = pair(sr, 680, 210);
    hold(sr, inRow);
    const offersR = offersNow(sr);
    const ctxR = contextAt(sr, inRow);
    expect(ctxR.notations).toEqual([]); // a row of boxes is no flowchart
    expect(ctxR.concepts.map((c) => c.name)).toEqual(['row']);
    expect(ctxR.concepts[0].reason).toBe('it sits beside a row: 3 comparable marks sitting side by side');
    expect(ctxR.kind).toBe('concept:row');

    // The same scope: the same offers, in the same order, before any context.
    expect(keys(offersF)).toEqual(keys(offersR));
    expect(keys(rankOffers(offersF))).toEqual(['row:tidy-row', 'row:equalize', 'snap', 'read-any', 'what', 'duplicate', 'keep']);

    // Beside the flowchart, drawing them clean leads — the flowchart is drawn clean (A1).
    const byF = rank(offersF, ctxF);
    expect(byF[0]).toMatchObject({ key: 'snap', label: 'Draw them clean' });
    expect(byF[0].lift).toBeGreaterThan(1);
    expect(byF[0].because[0]).toMatch(/^it sits beside a flowchart: three processes, two decisions/);
    // The same flowchart on a board that uses no pack is still READ — recognition is never gated on a
    // declaration — and lifts nothing here: what it makes likelier is the pack's to say.
    const bare = createSession();
    drawFlowchart(bare, FLOWCHART_VARIANTS[0]);
    const inBare = pair(bare, 560, 320);
    hold(bare, inBare);
    const ctxBare = contextAt(bare, inBare);
    expect(ctxBare.notations.map((n) => n.id)).toEqual(['flowchart']);
    expect(keys(rank(offersNow(bare), ctxBare))).toEqual(keys(rankOffers(offersNow(bare))));
    // Beside the row, lining them up leads, and matching sizes with it: they stand on a row.
    const byR = rank(offersR, ctxR);
    expect(keys(byR).slice(0, 3)).toEqual(['row:tidy-row', 'row:equalize', 'snap']);
    expect(byR[0].because).toEqual(['it sits beside a row: 3 comparable marks sitting side by side']);
    expect(keys(byF)).not.toEqual(keys(byR));

    for (const ranked of [byF, byR]) {
      // A lift, never a filter: every offer is still there…
      expect(keys(ranked).sort()).toEqual(keys(offersF).sort());
      for (const o of ranked) {
        // …and every lift says why; what nothing lifted says nothing.
        expect(o.because.length > 0).toBe(o.lift > 1);
        expect(o.score).toBeCloseTo(o.likelihood * o.lift, 12);
      }
    }
    // The lift is bounded: at most a quarter again.
    for (const o of [...byF, ...byR]) expect(o.lift).toBeLessThanOrEqual(1.25);
  });

  it('far from any context the order is exactly B1’s: the golden fixtures, key for key, and a scope a board away from a flowchart', () => {
    const same = (s: Session, ids: string[], golden: string[]) => {
      const ctx = contextAt(s, ids);
      expect(isEmptyContext(ctx)).toBe(true);
      expect(ctx.key).toBeNull();
      const offers = offersNow(s);
      for (const uses of [{}, { what: 20, snap: 3 }] as Uses[]) {
        const ranked = rank(offers, ctx, { uses });
        expect(keys(ranked)).toEqual(keys(rankOffers(offers, uses)));
        for (const o of ranked) expect([o.lift, o.because.length, o.score]).toEqual([1, 0, o.likelihood]);
      }
      expect(keys(rank(offers, ctx))).toEqual(golden);
    };

    // A row of three boxes.
    const s1 = createSession();
    const row = threeBoxes(s1);
    hold(s1, row);
    same(s1, row, ['snap', 'row:tidy-row', 'row:equalize', 'read-any', 'what', 'duplicate', 'keep']);

    // A molecule; named, and the second one drawn.
    const s2 = createSession();
    const mol = (ox: number) => [
      ...[[300, 300], [500, 300], [400, 460]].map(([x, y]) => draw(s2, circle(ox + x, y, 40), 100)),
      draw(s2, line({ x: ox + 340, y: 300 }, { x: ox + 460, y: 300 }, 30), 100),
      draw(s2, line({ x: ox + 328, y: 328 }, { x: ox + 372, y: 432 }, 30), 100),
    ];
    const first = mol(0);
    hold(s2, first);
    same(s2, first, ['snap', '3d', 'read-any', 'what', 'duplicate', 'keep']);
    s2.bless({ summonId: s2.getState().summon!.id, name: 'molecule', at: (clock += 100) });
    const second = mol(560);
    hold(s2, second);
    const sug = s2.getState().summon!.suggestions.find((x) => x.kind === 'match')!;
    same(s2, second, ['snap', 'not:' + sug.id, '3d', 'read-any', 'what', 'duplicate', 'keep']);

    // A line of writing, unread and read.
    const s3 = createSession();
    const words = ([[200, 300, 90, 28, 6], [320, 302, 110, 26, 7], [460, 300, 80, 28, 5]] as const).map(([x, y, w, h, humps]) => draw(s3, word(x, y, w, h, humps), 100));
    hold(s3, words);
    same(s3, words, ['read', 'what', 'duplicate', 'keep']);
    const reader = s3.join('agent', 'e2e-stub', (clock += 100), 2, 'local');
    words.forEach((id, i) => s3.propose({ participantId: reader, nodeId: id, edges: [], reps: [{ modality: 'transcript', data: { text: ['hello', 'wide', 'world'][i] }, confidence: 0.9 }], at: (clock += 1) }));
    same(s3, words, ['label:hello wide world', 'line-text:' + words.join(','), 'what', 'duplicate', 'keep']);

    // A pair a board away from a flowchart: nothing beside it, and B1's order — lining up leads.
    const s4 = createSession();
    drawFlowchart(s4, FLOWCHART_VARIANTS[0]);
    const far = pair(s4, 5000, 320);
    hold(s4, far);
    same(s4, far, ['row:tidy-row', 'row:equalize', 'snap', 'read-any', 'what', 'duplicate', 'keep']);
  });

  it('small score changes never flip the top offer within one context', () => {
    // Three scores within a tenth of one another: the one that led holds the top, whichever is ahead now.
    const item = (key: string, score: number): Ranked<{ key: string; base: number }> =>
      ({ key, base: score, likelihood: score, lift: 1, score, because: [] });
    const held: HeldTop = { key: 'snap', at: 1000 };
    for (let d = -0.09; d <= 0.0901; d += 0.01) {
      const snap = item('snap', 0.9), tidy = item('row:tidy-row', 0.9 * (1 + d));
      const ranked = [snap, tidy].sort((a, b) => b.score - a.score);
      const steady = steadyTop(ranked, held, { now: 2000 });
      expect(steady[0].key).toBe('snap');
      expect(steady.map((x) => x.key).sort()).toEqual(['row:tidy-row', 'snap']);
      if (ranked[0].key !== 'snap') {
        expect(steady[0].steady).toBe(true);
        expect(steady[0].because[0]).toBe('it led here a moment ago, and nothing here beats it by 10%');
      }
    }
    // A clear lead takes the top: past the margin, the new one leads.
    expect(steadyTop([item('row:tidy-row', 1.0), item('snap', 0.9)], held, { now: 2000 })[0].key).toBe('row:tidy-row');
    // Nothing held, or held too long ago with no act there since: the order as ranked.
    expect(steadyTop([item('row:tidy-row', 0.92), item('snap', 0.9)], null)[0].key).toBe('row:tidy-row');
    expect(steadyTop([item('row:tidy-row', 0.92), item('snap', 0.9)], held, { now: 1000 + 120_001 })[0].key).toBe('row:tidy-row');

    // On the board: boxes drawn one after another beside a flowchart, each time
    // the marks drawn so far held — one box, then two, then three. With no
    // context the top flips (one box is only drawn clean; two in a row are
    // lined up first). In the flowchart's context — the board using its pack — it holds.
    const s = createSession();
    drawFlowchart(s, FLOWCHART_VARIANTS[0]);
    s.use('flowchart@1', (clock += 100));
    const tops: string[] = [], plain: string[] = [], contexts: (string | null)[] = [];
    const memory = new Map<string, HeldTop>();
    const drawn: string[] = [];
    for (const x of [560, 700, 840]) {
      drawn.push(draw(s, rect(x, 320, 120, 60)));
      hold(s, drawn);
      const offers = offersNow(s);
      const ctx = contextAt(s, drawn);
      contexts.push(ctx.key);
      const shown = (o: Offer) => !o.hidden;
      plain.push(keys(rankOffers(offers).filter(shown))[0]);
      const steady = steadyTop(rank(offers, ctx), ctx.key ? memory.get(ctx.key) : null, { eligible: shown, now: clock });
      const top = steady.find(shown)!;
      if (ctx.key) memory.set(ctx.key, { key: top.key, at: clock });
      tops.push(top.key);
      expect(top.because.length).toBeGreaterThan(0); // and it says why it is first
      letGo(s);
    }
    expect(plain).toEqual(['snap', 'row:tidy-row', 'row:tidy-row']);
    expect(new Set(contexts).size).toBe(1);
    expect(contexts[0]).toMatch(/^notation:flowchart@/);
    expect(tops).toEqual(['snap', 'snap', 'snap']);
  });
});

describe('context — nearness relative to the marks’ own size, and a lift that fades', () => {
  it('full within a mark’s reach, nothing past CONTEXT_FADE times it — and the same at any scale', () => {
    const box = (x: number, y: number, w: number, h: number): Bounds => ({ minX: x, minY: y, maxX: x + w, maxY: y + h });
    const a = box(0, 0, 120, 60);
    // `near`'s own limit between two 120-wide boxes is 0.6 × 120 = 72.
    expect(nearnessOf(a, box(150, 0, 120, 60))).toBe(1); // a gap of 30
    expect(nearnessOf(a, box(191, 0, 120, 60))).toBe(1); // 71
    expect(nearnessOf(a, box(120 + 72 * CONTEXT_FADE, 0, 120, 60))).toBe(0);
    let before = 1;
    for (let gap = 72; gap <= 72 * CONTEXT_FADE; gap += 9) {
      const n = nearnessOf(a, box(120 + gap, 0, 120, 60));
      expect(n).toBeLessThanOrEqual(before);
      before = n;
    }
    // A dot two hundred units from a large box is not near it: the smaller mark sets the reach.
    expect(nearnessOf(box(0, 0, 400, 400), box(600, 0, 6, 6))).toBe(0);
    // Scale-free: the same pair at a tenth and at ten times the size.
    for (const k of [0.1, 10]) {
      const s = (b: Bounds): Bounds => ({ minX: b.minX * k, minY: b.minY * k, maxX: b.maxX * k, maxY: b.maxY * k });
      for (const gap of [30, 90, 120, 150]) {
        const b = box(120 + gap, 0, 120, 60);
        expect(nearnessOf(s(a), s(b))).toBeCloseTo(nearnessOf(a, b), 12);
      }
    }
    // A point is near a mark within the mark's own reach.
    expect(pointNearnessOf({ x: 60, y: 30 }, a)).toBe(1);
    expect(pointNearnessOf({ x: 120 + 0.6 * 120 * CONTEXT_FADE + 1, y: 30 }, a)).toBe(0);
  });

  it('on the board the lift decays as the scope moves away from a flowchart, and is gone past the fade', () => {
    const weights: number[] = [];
    for (const x of [560, 600, 640, 680, 760, 900]) {
      const s = createSession();
      drawFlowchart(s, FLOWCHART_VARIANTS[0]);
      const ids = pair(s, x, 320);
      const ctx = contextAt(s, ids);
      const n = ctx.notations.find((e) => e.id === 'flowchart');
      weights.push(n ? n.weight : 0);
    }
    for (let i = 1; i < weights.length; i++) expect(weights[i]).toBeLessThanOrEqual(weights[i - 1]);
    expect(weights[0]).toBeGreaterThan(0.7);
    expect(weights[weights.length - 1]).toBe(0);
  });

  it('the context at a point, where the pen is: beside a flowchart, and nothing in empty ground', () => {
    const s = createSession();
    drawFlowchart(s, FLOWCHART_VARIANTS[0]);
    const here = contextAt(s, { x: 500, y: 350 });
    expect(here.notations.map((n) => n.id)).toEqual(['flowchart']);
    expect(here.scopeIds).toEqual([]);
    expect(isEmptyContext(contextAt(s, { x: 4000, y: 4000 }))).toBe(true);
  });

  it('an act taken beside the hand lifts what it took, while it is recent — and an act on the scope itself, or by another hand, does not', () => {
    const s = createSession();
    const a = pair(s, 200, 200);
    hold(s, a);
    // Draw them clean, through the one door that stamps.
    const snap = offersNow(s).find((o) => o.key === 'snap')!;
    takeOffer(snap, toolScope(s, { host: HOST }), s, (clock += 100));
    const tookAt = clock;
    letGo(s);
    // Two more boxes beside them.
    const b = pair(s, 480, 200);
    hold(s, b);
    const ctx = contextAt(s, b);
    expect(ctx.recent.map((r) => [r.tool, r.offer])).toEqual([['clean', 'snap']]);
    expect(ctx.recent[0].weight).toBeGreaterThan(0.9);
    const ranked = rank(offersNow(s), ctx);
    const clean = ranked.find((o) => o.key === 'snap')!;
    expect(clean.because).toContain('you just took it beside these');
    // Fading: half-way through RECENT_MS it counts about half; past it, not at all.
    const half = contextAt(s, b, { now: tookAt + RECENT_MS / 2 }).recent[0];
    expect(half.weight).toBeGreaterThan(0.4);
    expect(half.weight).toBeLessThan(0.6);
    expect(contextAt(s, b, { now: tookAt + RECENT_MS + 1 }).recent).toEqual([]);
    // The marks the act was ON are not beside themselves.
    expect(contextAt(s, a).recent).toEqual([]);
    letGo(s);

    // Another hand's act, merged into this log, is that hand's.
    const t = createSession();
    const c = pair(t, 200, 200);
    const d = pair(t, 480, 200);
    t.load(t.getEvents().concat([{ type: 'snap', ids: c, at: (clock += 100), tool: 'clean', offer: 'snap', by: 'fern' }]));
    expect(contextAt(t, d).recent).toEqual([]);
  });

  it('derived from the board and the log: erase the flowchart and its lift is gone; undo the erase and it is back', () => {
    const s = createSession();
    const fc = drawFlowchart(s, FLOWCHART_VARIANTS[0]);
    const ids = pair(s, 560, 320);
    expect(contextAt(s, ids).notations.map((n) => n.id)).toEqual(['flowchart']);
    const marks = [...Object.values(fc.symbols).flatMap((x) => x.ids), ...fc.flows.map((f) => f.id), ...fc.labels.map((l) => l.id)];
    for (const id of marks) s.erase(id, (clock += 10));
    expect(isEmptyContext(contextAt(s, ids))).toBe(true);
    const events = s.getEvents().length;
    for (let i = 0; i < marks.length; i++) s.undo();
    expect(s.getEvents().length).toBe(events - marks.length);
    expect(contextAt(s, ids).notations.map((n) => n.id)).toEqual(['flowchart']);
    // Reading a context writes nothing.
    const before = s.getEvents().length;
    contextAt(s, ids);
    contextAt(s, { x: 500, y: 350 });
    expect(s.getEvents().length).toBe(before);
  });
});

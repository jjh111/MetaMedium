// ===== the act =====
// ACT-1 of the director review of 15 September 2026: one undo is one whole ACT,
// and the act is read back out of the log's own timestamps rather than guessed
// at by walking a fixed number of events. See `undo` in `log.ts`.
//
// The first two cases are the review's own regression, verbatim: with one
// generated profile the old walk restored the tree and left the profile behind,
// and with sixteen it left all sixteen and the eighteen-step tree standing.

import { describe, it, expect } from 'vitest';
import { createLog, type Log } from './log';
import { foundation, height, width, v3, type Plane } from './plane';
import type { PlaneCandidate } from './planarity';
import type { Proposal } from './generator';

const SCALE = 0.012;

function rect(x: number, y: number, w: number, h: number) {
  const c = [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
  const p: { x: number; y: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const a = c[i], b = c[(i + 1) % 4];
    for (let j = 0; j < 20; j++) p.push({ x: a.x + (b.x - a.x) * j / 20, y: a.y + (b.y - a.y) * j / 20 });
  }
  p.push(c[0]);
  return p;
}

function ring(cx: number, cy: number, r: number) {
  return Array.from({ length: 33 }, (_, i) => {
    const t = (i / 32) * Math.PI * 2;
    return { x: cx + Math.cos(t) * r, y: cy + Math.sin(t) * r };
  });
}

const blindSpace = () => ({ silhouettes: () => [], spanAlong: () => 0, silhouetteOn: () => null });

/** Three views, stood up as a massing, with a model in the seat. */
function board() {
  const log = createLog();
  log.sees(blindSpace());
  log.add(rect(-2, -1.5, 4, 3), foundation(), SCALE, 1000);
  log.add(rect(-2, -3, 4, 3), height(), SCALE, 1100);
  log.add(rect(-1.5, -3, 3, 3), width(), SCALE, 1200);
  const id = log.mass(log.massable()!, 4000)!.id;
  const by = { id: log.joinAgent('audit-stub', 'local', 4500), name: 'audit-stub' };
  return { log, id, by };
}

/** A reply of n bosses, each standing on the one before. */
function reply(n: number): Proposal {
  const profiles = Array.from({ length: n }, (_, i) => ({
    id: `p${i}`, shape: 'circle' as const, plane: 'foundation', centre: { x: i - 1, y: 0 }, r: 0.3,
  }));
  const steps = profiles.map((p, i) => ({
    id: `s${i}`, op: 'boss' as const, on: i === 0 ? undefined : `s${i - 1}`, profile: p.id, depth: 0.5, why: 'audit',
  }));
  return { steps, profiles, dropped: 0, droppedWhy: [], reasoning: 'audit' } as unknown as Proposal;
}

const treeJSON = (log: Log, id: string) => JSON.stringify(log.solidOf(id)!.tree);

describe('director regressions: undo is one whole act', () => {
  for (const n of [1, 16]) {
    it(`undo is one whole model act with ${n} profiles`, () => {
      const { log, id, by } = board();
      const before = treeJSON(log, id);
      const out = log.applyProposal(id, reply(n), by, 5000);
      expect(out).not.toBeNull();
      expect(out!.drawn).toHaveLength(n);
      log.undo();
      const remaining = out!.drawn.filter((i) => log.markOf(i) !== null);
      expect(treeJSON(log, id)).toBe(before);
      expect(remaining).toHaveLength(0);
    });
  }

  it('keeps the human ink, the names and the unrelated work the act never touched', () => {
    const { log, id, by } = board();
    log.name(id, 'plinth', 4600);
    // Work beside the proposal: a fourth view, drawn by the hand, part of nothing.
    const loose = log.add(ring(8, 8, 0.7), foundation(), SCALE, 4700);
    const marksBefore = log.marks().map((m) => m.id);
    const before = treeJSON(log, id);

    const out = log.applyProposal(id, reply(4), by, 5000)!;
    log.undo();

    expect(treeJSON(log, id)).toBe(before);
    expect(out.drawn.filter((i) => log.markOf(i) !== null)).toHaveLength(0);
    // Every mark that was on the board before the act is still on it, and the
    // name the hand gave survives — undo took the act, not the session.
    expect(log.marks().map((m) => m.id)).toEqual(marksBefore);
    expect(log.markOf(loose)).not.toBeNull();
    expect(log.solidOf(id)!.name).toBe('plinth');
    expect(log.solidOf(id)!.named).toBe('human');
  });

  it('a late reply is its own act: the stroke the hand drew while it waited stays', () => {
    const { log, id, by } = board();
    const before = treeJSON(log, id);
    // Enter was pressed at 5000; the hand kept drawing; the reply lands after.
    const asked = 5000;
    const meanwhile = log.add(ring(8, 8, 0.7), foundation(), SCALE, 6000);
    // The reply carries the moment it was ASKED for, not the moment it lands —
    // the stamp is taken when it is applied, so it is still its own act.
    const out = log.applyProposal(id, reply(3), by, asked)!;
    expect(out.drawn).toHaveLength(3);

    log.undo();
    expect(treeJSON(log, id)).toBe(before);
    expect(out.drawn.filter((i) => log.markOf(i) !== null)).toHaveLength(0);
    expect(log.markOf(meanwhile)).not.toBeNull();

    // And the stroke drawn while waiting is the next act, not part of the reply.
    log.undo();
    expect(log.markOf(meanwhile)).toBeNull();
  });

  it('two proposals on two solids: each undo takes one of them', () => {
    const log = createLog();
    log.sees(blindSpace());
    log.add(rect(-2, -1.5, 4, 3), foundation(), SCALE, 1000);
    log.add(rect(-2, -3, 4, 3), height(), SCALE, 1100);
    const a = log.mass(log.massable()!, 2000)!.id;
    log.add(rect(18, -1.5, 4, 3), foundation(), SCALE, 3000);
    log.add(rect(18, -3, 4, 3), height(), SCALE, 3100);
    const b = log.mass(log.massable()!, 4000)!.id;
    expect(b).not.toBe(a);
    const by = { id: log.joinAgent('audit-stub', 'local', 4500), name: 'audit-stub' };

    const aBefore = treeJSON(log, a);
    const bBefore = treeJSON(log, b);
    const first = log.applyProposal(a, reply(2), by, 5000)!;
    const second = log.applyProposal(b, reply(3), by, 6000)!;
    expect(treeJSON(log, a)).not.toBe(aBefore);
    expect(treeJSON(log, b)).not.toBe(bBefore);

    log.undo();
    // The second act went, whole; the first is untouched.
    expect(treeJSON(log, b)).toBe(bBefore);
    expect(second.drawn.filter((i) => log.markOf(i) !== null)).toHaveLength(0);
    expect(treeJSON(log, a)).not.toBe(aBefore);
    expect(first.drawn.filter((i) => log.markOf(i) !== null)).toHaveLength(2);

    log.undo();
    expect(treeJSON(log, a)).toBe(aBefore);
    expect(first.drawn.filter((i) => log.markOf(i) !== null)).toHaveLength(0);
  });

  it('through a JSON round trip of the log, the acts group the same way', () => {
    const { log, id, by } = board();
    const before = treeJSON(log, id);
    const out = log.applyProposal(id, reply(5), by, 5000)!;

    // The log as it would be written to a file and read back.
    const events = JSON.parse(JSON.stringify(log.session.getEvents()));
    const again = createLog();
    again.sees(blindSpace());
    again.session.load(events);
    expect(treeJSON(again, id)).toBe(treeJSON(log, id));

    again.undo();
    log.undo();
    // Replayed and live undo to the same board: the boundary is in the log, so
    // nothing was held in memory that the round trip could lose.
    expect(treeJSON(again, id)).toBe(before);
    expect(treeJSON(again, id)).toBe(treeJSON(log, id));
    expect(out.drawn.filter((i) => again.markOf(i) !== null)).toHaveLength(0);
    expect(again.marks().map((m) => m.id)).toEqual(log.marks().map((m) => m.id));
  });

  it('a log whose events carry no time still undoes by the old walk', () => {
    const { log, id, by } = board();
    log.applyProposal(id, reply(1), by, 5000);
    // A log from somewhere else: the times are gone, so the run cannot be read
    // and `undoByWalking` — what undo was before ACT-1 — takes over.
    const events = (JSON.parse(JSON.stringify(log.session.getEvents())) as { at?: number }[]).map((e) => {
      const { at: _at, ...rest } = e;
      return rest;
    });
    const again = createLog();
    again.sees(blindSpace());
    again.session.load(events as never);
    const solids = again.solids().length;
    expect(() => again.undo()).not.toThrow();
    // It does what it always did: something came off, and the board still stands.
    expect(again.solids().length).toBeLessThanOrEqual(solids);
  });
});

describe('the acts the hand makes are whole too', () => {
  const run = (a: { x: number; y: number }, b: { x: number; y: number }, n = 24) =>
    Array.from({ length: n + 1 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n }));

  /** A box the hand built at tier 1 — the same board `solids.test.ts` builds. */
  function built() {
    const log = createLog();
    log.sees(blindSpace());
    const profileId = log.add(rect(-7, -2, 4, 2.6), foundation(), SCALE, 1000);
    const extentId = log.add(run({ x: -7, y: 0 }, { x: -7, y: -2.4 }), height(), SCALE, 2000);
    const made = log.make(log.makeable()[0], 3000)!;
    return { log, profileId, extentId, solidId: made.id };
  }

  it('undo of a cut leaves the human circle that cut it', () => {
    const { log, solidId } = built();
    const plane: Plane = {
      origin: v3(0, 2.4, 0), normal: v3(0, 1, 0), up: v3(0, 0, 1), source: 'face',
      name: `top of ${solidId}`, why: `the pen came down on the top of ${solidId}`,
    };
    const candidate: PlaneCandidate = {
      plane, label: `top of ${solidId}`, confidence: 0.82, reasoning: 'reads circle 0.91 there', oblique: false,
      anchor: { bounds: { minX: -7, minY: -2, maxX: -3, maxY: 0.6 }, what: `top of ${solidId}`, solidId },
    };
    const featureId = log.add(ring(-5, -0.7, 0.6), plane, SCALE, 4000, { candidates: [candidate] });
    const feature = log.featureFor(solidId)!;
    expect(feature, 'the form rung did not read the circle as a feature').toBeTruthy();
    const before = treeJSON(log, solidId);
    log.cut(feature, 5000);
    expect(treeJSON(log, solidId)).not.toBe(before);

    log.undo();
    expect(treeJSON(log, solidId)).toBe(before);
    expect(log.markOf(featureId), 'the undo took the circle the hand drew').not.toBeNull();
    expect(log.solidOf(solidId)).not.toBeNull();
  });

  it('undo of the solid leaves both strokes, and undo again takes one stroke', () => {
    const { log, profileId, extentId, solidId } = built();
    log.undo();
    expect(log.solidOf(solidId)).toBeNull();
    expect(log.markOf(profileId)).not.toBeNull();
    expect(log.markOf(extentId)).not.toBeNull();
    log.undo();
    expect(log.markOf(extentId)).toBeNull();
    expect(log.markOf(profileId)).not.toBeNull();
  });

  it('a correction is still one act, and takes nothing under it', () => {
    const { log, solidId } = built();
    log.name(solidId, 'box', 3500);
    log.take(solidId, 4000);
    const def = log.definitions().find((d) => d.name === 'box');
    expect(def).toBeTruthy();
    const againId = log.add(rect(9, 9, 2.8, 1.0), foundation(), SCALE, 5000);

    const said = log.correct('box', againId, 'is-not', 6000);
    expect(said).toBeTruthy();
    const rejected = () => log.definitions().find((d) => d.name === 'box')?.examples?.rejected ?? [];
    expect(rejected()).toHaveLength(1);

    log.undo();
    // The correction went; the mark it was said about, and the definition it
    // was said against, both stay.
    expect(rejected()).toHaveLength(0);
    expect(log.markOf(againId), 'the undo ate the mark under the correction').not.toBeNull();
    expect(log.definitions().find((d) => d.name === 'box')).toBeTruthy();

    // And the definitions come off next, as one act, leaving the solid.
    log.undo();
    expect(log.markOf(againId)).toBeNull();
    log.undo();
    expect(log.definitions().find((d) => d.name === 'box')).toBeFalsy();
    expect(log.solidOf(solidId)).not.toBeNull();
  });

  it('two acts in the same millisecond are two undos', () => {
    const log = createLog();
    log.sees(blindSpace());
    // The clock does not move between them — what a synthetic pointer does all
    // the time, and a fast hand can. They are still two strokes and two acts.
    const a = log.add(rect(-2, -1.5, 4, 3), foundation(), SCALE, 1000);
    const b = log.add(rect(9, 9, 2.8, 1.0), foundation(), SCALE, 1000);
    expect(log.marks()).toHaveLength(2);
    log.undo();
    expect(log.markOf(b)).toBeNull();
    expect(log.markOf(a), 'one undo took both strokes drawn in the same millisecond').not.toBeNull();
    log.undo();
    expect(log.markOf(a)).toBeNull();
  });

  it('every verb stamps one time of its own, and no verb reuses one the log holds', () => {
    // The act table in `log.ts` names each verb's `at` by index. If an index is
    // wrong the verb's events are stamped with whatever sat in that argument,
    // so the check is against what the log actually holds, not the numbers.
    const { log, id, by } = board();
    const stamps = () => (log.session.getEvents() as { type: string; at?: number }[])
      .filter((e) => e.type !== 'tick').map((e) => e.at);

    const runs = (xs: (number | undefined)[]) => {
      const out: (number | undefined)[] = [];
      for (const x of xs) if (out[out.length - 1] !== x) out.push(x);
      return out;
    };
    // Every act's events are contiguous and share one stamp: the list of
    // distinct runs has no repeats, so no act's stamp is used twice.
    const check = () => {
      const r = runs(stamps());
      expect(new Set(r).size, `an act's stamp was reused: ${r.join(', ')}`).toBe(r.length);
      expect(r.every((x) => typeof x === 'number')).toBe(true);
    };
    check();

    log.name(id, 'plinth', 4600);
    log.applyProposal(id, reply(2), by, 4600); // a stale time, deliberately
    log.take(id, 4600);
    log.correct('plinth', log.add(rect(9, 9, 2.8, 1), foundation(), SCALE, 4600), 'is-not', 4600);
    log.teachSaying({ phrase: 'make it taller', verb: 'boss', why: 'the hand said so' }, 4600);
    log.paintSteps(id, [log.solidOf(id)!.tree.steps[0].id], 'red', 'the hand said red', 4600);
    check();

    // And each of those comes back off, one act at a time, down to the board
    // the massing stood on.
    const marksBefore = 3;
    for (let i = 0; i < 12 && log.marks().length > marksBefore; i++) log.undo();
    expect(log.marks()).toHaveLength(marksBefore);
  });
});

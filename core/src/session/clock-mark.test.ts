// A clock on the mark a runner reads (MATHS-SPEC §8 Lane D, M23).
//
// `applyClock` took a clock only on an artifact: a definition whose instances
// move, a program that runs. A pendulum is not an artifact — it is a rod and a
// bob among the ink — and teaching it a name just to play it would make a
// definition nobody asked for. So a clock may also stand on the mark a registered
// runner reads (`Runner.holds`), and on nothing else: a clock on any other stroke
// is ignored as it always was (session/clock.test.ts holds that).
//
// The clock is log state, so it replays and undoes; time is not, and nothing here
// writes it.

import { describe, it, expect } from 'vitest';
import { createSession } from '../index';
import { handLine } from '../test/strokes';
import { drawPendulum } from '../notations/fixtures/pendulum';
import type { PendulumVariant } from '../notations/fixtures/pendulum';

const base: PendulumVariant = { seed: 7, jitter: 1.5, theta: 20, length: 220, pivot: 'hatched', bob: 'ring' };

describe('a clock on a pendulum’s rod', () => {
  it('is held: nothing plays until a hand plays it, and then the rod’s clock says so', () => {
    const s = createSession();
    const e = drawPendulum(s, base, 1000);
    expect(s.getState().clocks[e.rod]).toBeUndefined();
    s.clock({ nodeId: e.rod, op: 'play', at: 100_000 });
    expect(s.getState().clocks[e.rod]).toEqual({ playing: true, seed: 1, at: 100_000 });
    s.clock({ nodeId: e.rod, op: 'pause', at: 101_000 });
    expect(s.getState().clocks[e.rod]).toEqual({ playing: false, seed: 1, at: 101_000 });
    s.clock({ nodeId: e.rod, op: 'reset', at: 102_000 });
    expect(s.getState().clocks[e.rod]).toEqual({ playing: false, seed: 1, at: 102_000 });
  });

  it('makes no artifact, teaches no definition and moves no mark', () => {
    const s = createSession();
    const e = drawPendulum(s, base, 1000);
    const before = { artifacts: s.getState().artifacts.slice(), contentIds: s.getState().contentIds.slice(), live: s.getState().live.slice() };
    s.clock({ nodeId: e.rod, op: 'play', at: 100_000 });
    const st = s.getState();
    expect(st.artifacts).toEqual(before.artifacts);
    expect(st.contentIds).toEqual(before.contentIds);
    expect(st.live).toEqual(before.live);
    expect(s.getEvents().filter((ev) => ev.type !== 'stroke')).toHaveLength(1);
  });

  it('replays and undoes like any event', () => {
    const s = createSession();
    const e = drawPendulum(s, base, 1000);
    s.clock({ nodeId: e.rod, op: 'play', at: 100_000 });
    const copy = createSession();
    copy.load(s.getEvents());
    expect(copy.getState().clocks[e.rod]).toEqual({ playing: true, seed: 1, at: 100_000 });
    s.undo();
    expect(s.getState().clocks[e.rod]).toBeUndefined();
  });

  it('is ignored on what no runner reads: the bob, the ceiling, a line standing alone', () => {
    const s = createSession();
    const e = drawPendulum(s, base, 1000);
    const alone = s.addStroke(handLine({ x: 900, y: 100 }, { x: 900, y: 300 }, { seed: 3 }), 200_000);
    for (const id of [e.bob, e.pivot[0], alone]) {
      s.clock({ nodeId: id, op: 'play', at: 300_000 });
      expect(s.getState().clocks[id], id).toBeUndefined();
    }
    s.clock({ nodeId: 'stroke:no-such', op: 'play', at: 300_000 });
    expect(s.getState().clocks['stroke:no-such']).toBeUndefined();
  });

  it('can always be paused or reset once held — even after the bob is gone, so a run can be stopped', () => {
    const s = createSession();
    const e = drawPendulum(s, base, 1000);
    s.clock({ nodeId: e.rod, op: 'play', at: 100_000 });
    s.erase(e.bob, 110_000);
    expect(s.getState().nodes.get(e.bob)!.reps.some((r) => r.modality === 'erased')).toBe(true);
    s.clock({ nodeId: e.rod, op: 'pause', at: 120_000 });
    expect(s.getState().clocks[e.rod].playing).toBe(false);
  });

  it('stands on the rod of a pendulum whose marks were named into an artifact', () => {
    const s = createSession();
    const e = drawPendulum(s, base, 1000);
    s.summonMarks(e.all, 90_000);
    s.bless({ summonId: s.getState().summon!.id, name: 'pendulum', at: 91_000 });
    s.clock({ nodeId: e.rod, op: 'play', at: 100_000 });
    expect(s.getState().clocks[e.rod]).toMatchObject({ playing: true });
  });
});

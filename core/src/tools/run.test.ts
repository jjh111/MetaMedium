// The run tool (MATHS-SPEC §8 Lane D, M23; V1-SPEC RN4): *Play the pendulum*.
//
// Nothing runs unblessed, so playing is the hand's own event — one `clock` play
// on the pendulum's rod — and an offer at rest to play never plays by itself. A
// pendulum drawn plumb hangs still, so it is offered *Pull it aside*, which turns
// the rod and bob about the pivot in one act. And nothing that is not a pendulum
// is offered either: e2e 49's golden scopes — a row of boxes, a molecule, a line
// of writing — never see this tool.

import { describe, it, expect } from 'vitest';
import { createSession, type Session } from '../session/session';
import { handCircle, handLine, handRect } from '../test/strokes';
import { drawPendulum } from '../notations/fixtures/pendulum';
import type { PendulumVariant } from '../notations/fixtures/pendulum';
import { drawMolecule, drawWriting } from '../notations/fixtures/flowchart';
import { readPendulum } from '../notations/pendulum';
import { offersFor, toolScope, takeOffer, getTool } from './registry';
import { rankOffers } from './rank';
import '../index';

const base: PendulumVariant = { seed: 7, jitter: 1.5, theta: 20, length: 220, pivot: 'hatched', bob: 'ring' };

const hold = (s: Session, ids: string[], at = 900_000) => { s.summonMarks(ids, at); };
const offersOf = (s: Session, host: Parameters<typeof toolScope>[1] = {}) => rankOffers(offersFor(toolScope(s, host))).filter((o) => o.tool === 'run');
const board = (v: Partial<PendulumVariant> = {}) => {
  const s = createSession();
  const e = drawPendulum(s, { ...base, ...v }, 1000);
  hold(s, e.all);
  return { s, e };
};

describe('the run tool', () => {
  it('is registered, and says what it does', () => {
    const t = getTool('run');
    expect(t).toBeDefined();
    expect(t!.describe().length).toBeGreaterThan(20);
    expect(t!.describe()).toMatch(/pendulum/);
  });

  it('a pendulum held is offered Play the pendulum, with its period in the reason and the length it assumed', () => {
    const { s, e } = board();
    const play = offersOf(s).find((o) => o.key === `run:play:${e.rod}`)!;
    expect(play).toBeDefined();
    expect(play.label).toBe('Play the pendulum');
    expect(play.reason).toMatch(/T = 2π√\(L\/g\) = 2\.\d\d s/);
    expect(play.reason).toMatch(/1 m assumed/);
    expect(play.verbs).toEqual(expect.arrayContaining(['play', 'swing', 'run']));
    expect(play.grounds?.on).toBe('notation');
    expect(play.asks).toBeUndefined();
    expect(play.data).toMatchObject({ key: e.rod, op: 'play' });
  });

  it('a length written beside the rod is the length, and the reason says where it came from', () => {
    const s = createSession();
    const e = drawPendulum(s, base, 1000);
    const mid = { x: (e.pivotAt.x + e.bobAt.x) / 2, y: (e.pivotAt.y + e.bobAt.y) / 2 };
    const t = s.import({ kind: 'text', path: 'text/L.txt', name: '2.5 m', bounds: { minX: mid.x + 24, minY: mid.y - 12, maxX: mid.x + 90, maxY: mid.y + 12 }, code: '2.5 m', at: 60000 })!;
    hold(s, [...e.all, t]);
    const play = offersOf(s).find((o) => o.key === `run:play:${e.rod}`)!;
    expect(play.reason).toMatch(/L = 2\.5 m, as written/);
    // 2π√(2.5/9.81) = 3.17 s, a hair longer for the swing's size.
    expect(play.reason).toMatch(/T = 2π√\(L\/g\) = 3\.\d\d s/);
    expect(play.reason).not.toMatch(/assumed/);
  });

  it('taking Play writes ONE clock event on the rod — the hand’s own act, stamped with the tool — and one undo takes it back', () => {
    const { s, e } = board();
    const before = s.getEvents().length;
    const scope = toolScope(s, {});
    const offer = offersFor(scope).find((o) => o.key === `run:play:${e.rod}`)!;
    const taken = takeOffer(offer, scope, s, 910_000);
    expect(taken.host).toBeUndefined();
    const evs = s.getEvents().slice(before).filter((ev) => ev.type === 'clock');
    expect(evs).toHaveLength(1);
    expect(evs[0]).toMatchObject({ type: 'clock', nodeId: e.rod, op: 'play', tool: 'run', offer: `run:play:${e.rod}` });
    expect(s.getState().clocks[e.rod]).toMatchObject({ playing: true });
    s.undo();
    expect(s.getState().clocks[e.rod]).toBeUndefined();
  });

  it('a playing pendulum is offered Pause and Reset; the host says what runs in this sitting, which the log alone does not', () => {
    const { s, e } = board();
    s.clock({ nodeId: e.rod, op: 'play', at: 910_000 });
    const keys = (host = {}) => offersOf(s, { host }).map((o) => o.label);
    // The log says playing; the host (a page opened after) says nothing is running here: Play again.
    expect(keys({ running: () => false })).toContain('Play the pendulum');
    expect(keys({ running: () => false })).not.toContain('Pause the pendulum');
    expect(keys({ running: () => true })).toContain('Pause the pendulum');
    expect(keys({ running: () => true })).toContain('Reset the pendulum');
    // A host that says nothing is believed by the log.
    expect(keys()).toContain('Pause the pendulum');
  });

  it('Pause and Reset are the clock’s own ops on the rod', () => {
    const { s, e } = board();
    s.clock({ nodeId: e.rod, op: 'play', at: 910_000 });
    const scope = toolScope(s, { host: { running: () => true } });
    takeOffer(offersFor(scope).find((o) => o.label === 'Pause the pendulum')!, scope, s, 920_000);
    expect(s.getState().clocks[e.rod].playing).toBe(false);
    const scope2 = toolScope(s, { host: { running: () => false } });
    takeOffer(offersFor(scope2).find((o) => o.label === 'Reset the pendulum')!, scope2, s, 930_000);
    expect(s.getEvents().filter((ev) => ev.type === 'clock').map((ev) => (ev as { op: string }).op)).toEqual(['play', 'pause', 'reset']);
  });

  it('a rod drawn plumb is offered Pull it aside; taking it turns the rod and bob about the pivot in one act, and undo puts them back', () => {
    const { s, e } = board({ theta: 0 });
    const aside = offersOf(s).find((o) => o.label === 'Pull it aside')!;
    expect(aside).toBeDefined();
    expect(aside.reason).toMatch(/plumb/);
    const before = s.getEvents().length;
    const scope = toolScope(s, {});
    takeOffer(offersFor(scope).find((o) => o.key === aside.key)!, scope, s, 915_000);
    const r = readPendulum(s.getState())!;
    expect(Math.abs((r.pendulums[0].theta * 180) / Math.PI - 20)).toBeLessThan(2);
    // The pivot stays put; the ceiling is not touched.
    expect(Math.hypot(r.pendulums[0].pivot.x - e.pivotAt.x, r.pendulums[0].pivot.y - e.pivotAt.y)).toBeLessThan(6);
    const acts = new Set(s.getEvents().slice(before).map((ev) => (ev as { act?: number }).act));
    expect(acts.size).toBe(1);
    s.undo();
    const back = readPendulum(s.getState())!;
    expect(Math.abs((back.pendulums[0].theta * 180) / Math.PI)).toBeLessThan(1.5);
  });

  it('a pendulum already drawn aside is not offered to be pulled aside', () => {
    const { s } = board({ theta: 20 });
    expect(offersOf(s).map((o) => o.label)).not.toContain('Pull it aside');
  });

  it('is never offered for the golden scopes: a row of boxes, a molecule, a line of writing', () => {
    const row = createSession();
    const rowIds = [0, 1, 2].map((i) => row.addStroke(handRect(200 + i * 160, 200 + (i === 1 ? 4 : 0), 120, 80, { seed: 30 + i }), 1000 + i * 5000));
    hold(row, rowIds);
    expect(offersOf(row)).toEqual([]);
    const mol = createSession();
    hold(mol, drawMolecule(mol, 3));
    expect(offersOf(mol)).toEqual([]);
    const words = createSession();
    hold(words, drawWriting(words, 3));
    expect(offersOf(words)).toEqual([]);
  });

  it('is not offered for a rod and a ring that merely stand near each other', () => {
    const s = createSession();
    const a = s.addStroke(handLine({ x: 100, y: 100 }, { x: 100, y: 300 }, { seed: 4 }), 1000);
    const b = s.addStroke(handCircle(400, 320, 24, { seed: 5 }), 5000);
    hold(s, [a, b]);
    expect(offersOf(s)).toEqual([]);
  });

  it('is offered for a pendulum inside a blessed artifact — the held thing is the artifact, whose marks it reads', () => {
    const s = createSession();
    const e = drawPendulum(s, base, 1000);
    hold(s, e.all);
    const id = s.bless({ summonId: s.getState().summon!.id, name: 'pendulum', at: 91_000 })!;
    expect(id).toBeTruthy();
    hold(s, [id], 95_000);
    const play = offersOf(s).find((o) => o.label === 'Play the pendulum');
    expect(play).toBeDefined();
    expect(play!.data).toMatchObject({ key: e.rod, op: 'play' });
  });

  it('a clock on the rod does nothing to a definition’s tank, and teaches nothing: no artifact is made', () => {
    const { s, e } = board();
    const artifacts = s.getState().artifacts.length;
    s.clock({ nodeId: e.rod, op: 'play', at: 910_000 });
    expect(s.getState().artifacts.length).toBe(artifacts);
    expect(s.getState().clocks[e.rod]).toMatchObject({ playing: true });
  });
});

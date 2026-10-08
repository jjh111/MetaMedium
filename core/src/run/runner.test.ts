// The runner contract at its smallest (V1-SPEC RN4; MATHS-SPEC §8 Lane D, M23).
//
// A runner reads marks as something that can run, takes its inputs from them,
// and is stepped at a fixed small step: its state is a pure function of the
// log, the inputs and the step count, never logged, re-derived whenever the
// inputs change and kept (with keyframes, to scrub) while they do not. Every
// run has a step budget and says when it stopped. Pinned here with a stub — the
// pendulum's own tests are beside the pendulum.

import { describe, it, expect, afterEach } from 'vitest';
import { createSession } from '../session/session';
import { lineStroke } from '../test/strokes';
import { createStepper, inputsKeyOf, parseRunQuantity, registerRunner, runQuantity, runnerById, runners, runsIn, runsReport, RUN_KEYFRAME_EVERY } from './runner';
import type { Runner } from './runner';

interface Tick { n: number; x: number; rate: number }

let calls = 0;
const tick = (over: Partial<Runner<Tick>> = {}): Runner<Tick> => ({
  id: 'test-tick',
  name: 'a counter',
  dt: 0.1,
  maxSteps: 50,
  describe: () => 'counts, and counts again',
  reads(state, ids) {
    const scope = ids ? [...ids] : state.contentIds;
    return scope.length ? [{ runner: 'test-tick', key: scope[0], marks: scope.slice(), confidence: 0.9, summary: `${scope.length} marks that count`, reason: 'any marks will do' }] : [];
  },
  holds: (board, id) => board.contentIds[0] === id,
  inputs: () => ({ rate: { value: 2, unit: '', from: 'drawn', reason: 'two a second' } }),
  init: (inputs) => ({ n: 0, x: 0, rate: inputs.rate.value }),
  step(s, dt) {
    calls++;
    return { ...s, n: s.n + 1, x: s.x + s.rate * dt };
  },
  outputs: (s) => ({ x: { value: s.x, unit: '', label: 'x', text: s.x.toFixed(1) } }),
  placements: () => [],
  readouts: () => [],
  ...over,
});

const boardWith = (n = 2) => {
  const s = createSession();
  for (let i = 0; i < n; i++) s.addStroke(lineStroke({ x: 0, y: i * 80 }, { x: 200, y: i * 80 }), 1000 + i * 5000);
  return s;
};

let off: (() => void)[] = [];
afterEach(() => {
  off.forEach((f) => f());
  off = [];
});
const register = (r: Runner<any>) => {
  off.push(registerRunner(r));
  return r;
};

describe('the registry', () => {
  it('lists runners in the order they registered; a second under the same id replaces the first in place', () => {
    const a = register(tick());
    const b = register(tick({ id: 'test-other', name: 'another' }));
    const ids = runners().map((r) => r.id);
    expect(ids.indexOf('test-tick')).toBeLessThan(ids.indexOf('test-other'));
    expect(runnerById('test-tick')).toBe(a);
    const c = register(tick({ name: 'a new counter' }));
    expect(runnerById('test-tick')).toBe(c);
    expect(runners().map((r) => r.id)).toEqual(ids);
    expect(b.id).toBe('test-other');
  });

  it('takes a runner back out', () => {
    const undo = registerRunner(tick({ id: 'test-gone' }));
    expect(runnerById('test-gone')).toBeDefined();
    undo();
    expect(runnerById('test-gone')).toBeUndefined();
  });
});

describe('what runs', () => {
  it('asks every runner of the marks, plural and strongest first, with each run’s inputs read', () => {
    register(tick());
    register(tick({ id: 'test-weak', reads: (_s, ids) => [{ runner: 'test-weak', key: 'k', marks: ids ? [...ids] : [], confidence: 0.3, summary: 'weakly', reason: 'barely' }] }));
    const s = boardWith();
    const mine = runsIn(s.getState()).filter((r) => r.runner.id.startsWith('test-'));
    expect(mine.map((r) => r.runner.id)).toEqual(['test-tick', 'test-weak']);
    expect(mine[0].reading.key).toBe(s.getState().contentIds[0]);
    expect(mine[0].inputs.rate.value).toBe(2);
    expect(mine[0].inputsKey).toBe(inputsKeyOf(mine[0].inputs));
  });

  it('asks only the marks it is given', () => {
    register(tick());
    const s = boardWith(3);
    const ids = s.getState().contentIds;
    const r = runsIn(s.getState(), [ids[1]]).filter((x) => x.runner.id === 'test-tick');
    expect(r).toHaveLength(1);
    expect(r[0].reading.marks).toEqual([ids[1]]);
  });

  it('leaves a runner that throws out, and names it — the others stand', () => {
    register(tick());
    register(tick({ id: 'test-throws', reads: () => { throw new Error('no ground'); } }));
    const rep = runsReport(boardWith().getState());
    expect(rep.runs.some((r) => r.runner.id === 'test-tick')).toBe(true);
    expect(rep.refused).toEqual([{ runner: 'test-throws', reason: 'threw: no ground' }]);
  });

  it('keys a run by inputs: the same numbers the same key, another number another', () => {
    const a = inputsKeyOf({ L: { value: 1, unit: 'm', from: 'assumed', reason: '' } });
    expect(inputsKeyOf({ L: { value: 1, unit: 'm', from: 'written', reason: 'other words' } })).toBe(a);
    expect(inputsKeyOf({ L: { value: 1.5, unit: 'm', from: 'assumed', reason: '' } })).not.toBe(a);
  });

  it('names an output run:<key>:<name>, whatever the key holds', () => {
    expect(runQuantity('stroke:ada:7', 'θ')).toBe('run:stroke:ada:7:θ');
    expect(parseRunQuantity('run:stroke:ada:7:θ')).toEqual({ key: 'stroke:ada:7', name: 'θ' });
    expect(parseRunQuantity('run:3:T')).toEqual({ key: '3', name: 'T' });
    expect(parseRunQuantity('fig:3:side0')).toBeNull();
    expect(parseRunQuantity('run:x')).toBeNull();
  });
});

describe('the stepper', () => {
  const make = (over: Partial<Runner<Tick>> = {}) => {
    register(tick(over));
    const run = runsIn(boardWith().getState()).find((r) => r.runner.id === 'test-tick')!;
    return createStepper(run);
  };

  it('steps at the runner’s fixed step; time is the step count times it, exactly', () => {
    const st = make();
    expect(st.steps).toBe(0);
    expect(st.t).toBe(0);
    st.advance(1);
    expect(st.steps).toBe(10);
    expect(st.t).toBeCloseTo(1, 12);
    expect(st.outputs().x.value).toBeCloseTo(2, 12);
  });

  it('carries the remainder: frames of any length make the steps one long frame would', () => {
    const a = make();
    a.advance(2.3);
    const b = make();
    for (let i = 0; i < 23; i++) b.advance(0.1);
    const c = make();
    for (let i = 0; i < 230; i++) c.advance(0.01);
    expect(b.steps).toBe(a.steps);
    expect(c.steps).toBe(a.steps);
    expect(a.steps).toBeGreaterThanOrEqual(22);
    expect(a.steps).toBeLessThanOrEqual(23);
  });

  it('stops at its budget and says so: stopped after N steps', () => {
    const st = make({ maxSteps: 30 });
    st.advance(100);
    expect(st.steps).toBe(30);
    expect(st.stopped).toMatchObject({ steps: 30, why: 'budget' });
    expect(st.stopped!.sentence).toMatch(/^stopped after 30 steps/);
    st.advance(10);
    expect(st.steps).toBe(30);
    st.reset();
    expect(st.stopped).toBeNull();
    expect(st.steps).toBe(0);
  });

  it('says how long that was in the run’s own time, in words, and what starts it again', () => {
    const short = make({ maxSteps: 30 });
    short.advance(100);
    expect(short.stopped!.sentence).toBe('stopped after 30 steps — 3 s of its own time, the most a run takes; Play starts it again from the top');
    const long = make({ maxSteps: 36_000, dt: 0.1 });
    long.advance(1e6);
    expect(long.stopped!.sentence).toBe('stopped after 36,000 steps — 60 minutes of its own time, the most a run takes; Play starts it again from the top');
  });

  it('says a thousand with its comma', () => {
    const st = make({ maxSteps: 1500, dt: 0.001 });
    st.advance(100);
    expect(st.stopped!.sentence).toMatch(/^stopped after 1,500 steps/);
  });

  it('seeks back to where it was: the state at a step is the same however it is reached', () => {
    const st = make({ maxSteps: 100_000, dt: 0.01 });
    st.advanceSteps(3 * RUN_KEYFRAME_EVERY + 17);
    const was = st.outputs().x.value;
    const here = st.steps;
    st.seek(2 * RUN_KEYFRAME_EVERY * 0.01 + 0.05);
    expect(st.steps).toBe(2 * RUN_KEYFRAME_EVERY + 5);
    st.advanceSteps(here - st.steps);
    expect(st.steps).toBe(here);
    expect(st.outputs().x.value).toBe(was);
  });

  it('seeking back re-derives from a keyframe, not from t = 0', () => {
    const st = make({ maxSteps: 100_000, dt: 0.01 });
    st.advanceSteps(5 * RUN_KEYFRAME_EVERY + 3);
    calls = 0;
    st.seek((5 * RUN_KEYFRAME_EVERY - 10) * 0.01);
    expect(calls).toBeLessThanOrEqual(RUN_KEYFRAME_EVERY);
    expect(st.steps).toBe(5 * RUN_KEYFRAME_EVERY - 10);
  });

  it('is a pure function of its inputs: two steppers of one run agree to the bit', () => {
    const a = make({ maxSteps: 100_000 });
    const b = make({ maxSteps: 100_000 });
    a.advanceSteps(777);
    b.advanceSteps(300);
    b.advanceSteps(477);
    expect(b.outputs()).toEqual(a.outputs());
  });

  it('seeks to zero as a reset, with the first state back', () => {
    const st = make();
    st.advance(2);
    st.seek(0);
    expect(st.steps).toBe(0);
    expect(st.outputs().x.value).toBe(0);
  });
});

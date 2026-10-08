// The runner contract, at its smallest (V1-SPEC §3.6 and RN4; MATHS-SPEC §8 Lane D, M23).
//
// A **runner** reads marks as something that can run — a pendulum is a pivot, a
// rod and a bob — takes its inputs from what is written and drawn beside them,
// and is stepped at a fixed small step. Four rules keep a run honest:
//
//   - **Nothing runs unblessed.** A run is started by the hand's own `clock`
//     play event and stopped by Esc; reading a runner's marks, offering to play
//     it and drawing it at rest never start one. This file holds no clock and no
//     timer: a run is stepped by whoever holds it (the surface's frame loop, a
//     test), and `advance(seconds)` only says how many fixed steps that is.
//   - **Time is derived, never logged.** A run's state is a pure function of the
//     inputs and the step count; the log holds whether it plays, never how far
//     it has got. A stepper keeps keyframes so it can be scrubbed back without
//     starting again from t = 0, and the surface keeps one while the inputs are
//     the same (`inputsKey`) — a long run is not re-derived at every change to
//     the log.
//   - **Every run has a step budget, and says when it stopped** (V1-SPEC's
//     *stopped after 1,000 steps — a loop?*). A runner names its own: a pendulum's
//     fixed step is small, so its budget is a long time, not a thousand steps.
//   - **A run's outputs are named quantities** any written maths can use:
//     `run:<key>:θ` (`runQuantity`), the key being the mark the clock stands on.
//
// A runner is registered once and read from the registry (`registerRunner`), as
// a notation, a tool or a fill-in source is; `Runner.holds` tells the session
// which marks may carry a clock (`applyClock`, which took only an artifact's
// before) — the mark a registered runner reads, and no other.

import type { Point } from '../types';
import type { SessionState } from '../session/session';
import type { BoardMaths } from '../maths/solve';

// ===== What a run is made of =====

/** Where an input came from: written beside the marks, read off the drawing's scale, drawn, a standard constant, or assumed and said. */
export type InputFrom = 'written' | 'scale' | 'drawn' | 'standard' | 'assumed';

/** One number a run takes in, with its unit and where it came from. */
export interface RunInput {
  value: number;
  /** `m`, `m/s²`, `rad`, or '' for a bare number. */
  unit: string;
  from: InputFrom;
  /** Why, in words a person can read: *1 m assumed*, *2.5 m, as written beside the rod*. */
  reason: string;
}
export type RunInputs = Record<string, RunInput>;

/** A named quantity a run puts out. */
export interface RunOutput {
  value: number;
  unit: string;
  /** What it is called on the page: `θ`, `T`. */
  label: string;
  /** As it would be written: `12.3°`, `2.01 s`. */
  text: string;
}
export type RunOutputs = Record<string, RunOutput>;

/**
 * How a mark is drawn while a run moves it: turned `angle` radians clockwise about (`cx`, `cy`), then
 * moved by (`dx`, `dy`) — the shape a tank's body has (`bodyPlacement`), so what already draws a moved
 * body draws this. `about` is the point the run turns it about, for those who would rather say that.
 */
export interface RunPlacement {
  id: string;
  dx: number;
  dy: number;
  angle: number;
  cx: number;
  cy: number;
  about?: Point;
}

/** A word or a number to stand beside a run: T, the live θ. Derived each frame; never in the log. */
export interface RunReadout {
  /** The quantity it is, `run:<key>:T`. */
  quantity: string;
  /** As it would be written: `T = 2.01 s`. */
  text: string;
  /** How it is worked out, in a line. */
  reason: string;
  /** True for what changes as the run runs, false for what it only is. */
  live: boolean;
  /** Where it stands, in canvas units: the middle of its left edge. */
  at: Point;
  /** The marks it concerns. */
  about: string[];
}

/** What a runner reads of some marks: one run it could make. */
export interface RunReading {
  runner: string;
  /** The mark the run's clock stands on and its quantities are named by: a pendulum's rod. */
  key: string;
  /** Every mark it is drawn with. */
  marks: string[];
  /** 0–1. */
  confidence: number;
  /** In a few words: *a rod from a pivot, a bob, drawn 20° from plumb*. */
  summary: string;
  reason: string;
  /** Whatever the runner needs to carry from reading to inputs, placements and readouts; opaque to everyone else. */
  data?: unknown;
}

/** The part of a board a runner reads: its marks, as a session's state holds them. */
export type RunBoard = Pick<SessionState, 'nodes' | 'contentIds' | 'artifacts'>;

export interface Runner<S = unknown> {
  id: string;
  /** For people: *the pendulum*. */
  name: string;
  /** One line, for a brief and the models pane. */
  describe(): string;
  /** The fixed step, in seconds of the run's own time. */
  dt: number;
  /** The most steps a run takes before it stops and says so. */
  maxSteps: number;
  /** Read marks (a scope, else the board) as runs it could make — plural, likeliest first. */
  reads(board: RunBoard, ids?: readonly string[]): RunReading[];
  /** Whether the mark `id` is the key of a run this board holds: the mark a clock may stand on. */
  holds(board: RunBoard, id: string): boolean;
  /** The numbers a run takes in. `board` reads the board's maths when asked (a length written beside the rod). */
  inputs(board: RunBoard, run: RunReading, maths?: () => BoardMaths | null): RunInputs;
  init(inputs: RunInputs, run: RunReading): S;
  step(s: S, dt: number): S;
  outputs(s: S): RunOutputs;
  /** How the marks are drawn at this state: the ink never changes, only where it is drawn. */
  placements(run: RunReading, s: S): RunPlacement[];
  /** What stands beside the run at this state. */
  readouts(run: RunReading, inputs: RunInputs, s: S): RunReadout[];
}

// ===== The registry =====

const registry = new Map<string, Runner<any>>();
let version = 0;

/** Let a runner read. A second under the same id replaces the first, in its place. Returns the way to take it back. */
export function registerRunner<S>(r: Runner<S>): () => void {
  registry.set(r.id, r as Runner<any>);
  version++;
  return () => {
    if (registry.get(r.id) === r) {
      registry.delete(r.id);
      version++;
    }
  };
}

/** The runners, in the order they registered. */
export function runners(): Runner<any>[] {
  return [...registry.values()];
}

export function runnerById(id: string): Runner<any> | undefined {
  return registry.get(id);
}

/** Moves whenever a runner is registered or taken back, so what was derived before is read again. */
export function runnersVersion(): number {
  return version;
}

/** Whether any registered runner holds a run keyed by this mark: the question `applyClock` asks of a clock on a mark. A runner that throws holds nothing. */
export function runnerHolds(board: RunBoard, id: string): boolean {
  for (const r of registry.values()) {
    try {
      if (r.holds(board, id)) return true;
    } catch {
      /* a runner that cannot say holds nothing */
    }
  }
  return false;
}

// ===== A run: what a runner read, with its inputs =====

export interface Run<S = unknown> {
  runner: Runner<S>;
  reading: RunReading;
  inputs: RunInputs;
  /** What the inputs come to, as a string: a run with the same key here is the same run, whatever the log did meanwhile. */
  inputsKey: string;
}

/** The numbers of a run's inputs as one string, rounded to a part in a billion: the same numbers the same key, wherever they were read from. */
export function inputsKeyOf(inputs: RunInputs): string {
  return Object.keys(inputs)
    .sort()
    .map((k) => `${k}=${Number(inputs[k].value.toPrecision(9))}${inputs[k].unit}`)
    .join(';');
}

export interface RunsReport {
  runs: Run[];
  /** The runners left out of this reading, and why. */
  refused: { runner: string; reason: string }[];
}

/**
 * Every registered runner's reading of the marks given (the board's content, and the marks inside its
 * artifacts, when none are), with each run's inputs read: strongest first, a runner that throws left out
 * and named. `maths` reads the board's maths when a runner asks for it, and not before.
 */
export function runsReport(board: RunBoard, ids?: readonly string[], maths?: () => BoardMaths | null): RunsReport {
  const runs: Run[] = [];
  const refused: RunsReport['refused'] = [];
  for (const runner of registry.values()) {
    try {
      for (const reading of runner.reads(board, ids)) {
        const inputs = runner.inputs(board, reading, maths);
        runs.push({ runner, reading, inputs, inputsKey: inputsKeyOf(inputs) });
      }
    } catch (e) {
      refused.push({ runner: runner.id, reason: `threw: ${e instanceof Error ? e.message : String(e)}` });
    }
  }
  runs.sort((a, b) => b.reading.confidence - a.reading.confidence);
  return { runs, refused };
}

/** The runs a board's marks make, strongest first. */
export function runsIn(board: RunBoard, ids?: readonly string[], maths?: () => BoardMaths | null): Run[] {
  return runsReport(board, ids, maths).runs;
}

/** The mark a run's quantity `name` is named by: `run:<key>:θ`. A key may hold colons (`stroke:ada:7`); a name never does. */
export function runQuantity(key: string, name: string): string {
  return `run:${key}:${name}`;
}

/** The key and the name a `run:<key>:<name>` quantity says — or null when it is no run's. */
export function parseRunQuantity(q: string): { key: string; name: string } | null {
  if (!q.startsWith('run:')) return null;
  const rest = q.slice(4);
  const cut = rest.lastIndexOf(':');
  if (cut <= 0 || cut === rest.length - 1) return null;
  return { key: rest.slice(0, cut), name: rest.slice(cut + 1) };
}

// ===== The stepper: a run in time =====

/** A keyframe is kept every this many steps, so a run scrubbed back re-derives from at most this many. */
export const RUN_KEYFRAME_EVERY = 1000;

/** Why a run stopped by itself, and the sentence for it. */
export interface RunStop {
  steps: number;
  why: 'budget';
  sentence: string;
}

export interface RunStepper<S = unknown> {
  readonly run: Run<S>;
  /**
   * Take a run read again from the board: the same inputs, so the same physics, but maybe the marks have moved —
   * where a mark stands is the reading's, and the state of the run is the inputs'. False (and nothing changed)
   * when the inputs are not the same.
   */
  rebase(next: Run<S>): boolean;
  /** Steps taken, and the time they make: steps × dt, exactly. */
  readonly steps: number;
  readonly t: number;
  /** Set when the run stopped by itself; cleared by a reset or a seek back. */
  readonly stopped: RunStop | null;
  state(): S;
  /** Advance by this many seconds of the run's own time: the fixed steps they make, the remainder kept for the next. */
  advance(seconds: number): void;
  advanceSteps(n: number): void;
  /** Go to a time: back through the nearest keyframe, or forward by stepping. */
  seek(t: number): void;
  reset(): void;
  outputs(): RunOutputs;
  placements(): RunPlacement[];
  readouts(): RunReadout[];
}

const withCommas = (n: number) => n.toLocaleString('en-US');

/** A run's own time in the person's words: 90 s, 62 minutes, 2.5 hours. */
function timeWords(seconds: number): string {
  if (seconds < 120) return `${Math.round(seconds)} s`;
  if (seconds < 7200) return `${Math.round(seconds / 60)} minutes`;
  return `${(seconds / 3600).toFixed(1)} hours`;
}

/** A stepper over a run, from t = 0. */
export function createStepper<S>(start: Run<S>): RunStepper<S> {
  let run = start;
  const { runner } = run;
  const first = runner.init(run.inputs, run.reading);
  let state = first;
  let steps = 0;
  let acc = 0;
  let stopped: RunStop | null = null;
  // Keyframes by step number; step 0 is the first state.
  const frames = new Map<number, S>([[0, first]]);

  const budget = (): RunStop => ({
    steps: runner.maxSteps,
    why: 'budget',
    sentence: `stopped after ${withCommas(runner.maxSteps)} steps — ${timeWords(runner.maxSteps * runner.dt)} of its own time, the most a run takes; Play starts it again from the top`,
  });

  function advanceSteps(n: number) {
    for (let i = 0; i < n; i++) {
      if (steps >= runner.maxSteps) {
        stopped = budget();
        return;
      }
      state = runner.step(state, runner.dt);
      steps++;
      if (steps % RUN_KEYFRAME_EVERY === 0 && !frames.has(steps)) frames.set(steps, state);
    }
    if (steps >= runner.maxSteps) stopped = budget();
  }

  function seekSteps(target: number) {
    target = Math.max(0, Math.min(runner.maxSteps, Math.round(target)));
    if (target < steps) {
      const key = Math.floor(target / RUN_KEYFRAME_EVERY) * RUN_KEYFRAME_EVERY;
      state = frames.get(key) ?? first;
      steps = frames.has(key) ? key : 0;
      stopped = null;
    }
    advanceSteps(target - steps);
  }

  return {
    get run() { return run; },
    rebase(next: Run<S>) {
      if (next.runner !== runner || next.inputsKey !== run.inputsKey) return false;
      run = next;
      return true;
    },
    get steps() { return steps; },
    get t() { return steps * runner.dt; },
    get stopped() { return stopped; },
    state: () => state,
    advance(seconds: number) {
      if (!(seconds > 0) || stopped) return;
      acc += seconds;
      // A part in a million of a step forgives the floating-point dust of summing frames.
      const whole = Math.floor(acc / runner.dt + 1e-6);
      acc -= whole * runner.dt;
      if (acc < 0) acc = 0;
      advanceSteps(whole);
    },
    advanceSteps,
    seek(t: number) {
      acc = 0;
      seekSteps(t / runner.dt);
    },
    reset() {
      state = first;
      steps = 0;
      acc = 0;
      stopped = null;
    },
    outputs: () => runner.outputs(state),
    placements: () => runner.placements(run.reading, state),
    readouts: () => runner.readouts(run.reading, run.inputs, state),
  };
}

/** A run sampled over time — the data a plot is drawn from (RN8) and a test reads: the outputs every `every` steps. */
export function traceOf<S>(run: Run<S>, seconds: number, every = 1): { t: number; outputs: RunOutputs }[] {
  const st = createStepper(run);
  const out = [{ t: 0, outputs: st.outputs() }];
  const n = Math.min(run.runner.maxSteps, Math.round(seconds / run.runner.dt));
  for (let i = every; i <= n; i += every) {
    st.advanceSteps(every);
    out.push({ t: st.t, outputs: st.outputs() });
  }
  return out;
}

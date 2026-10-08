// The run tool (MATHS-SPEC §8 Lane D, M23; V1-SPEC RN4): *Play the pendulum*.
//
// A pendulum is a rod, a bob and a pivot among the ink (notations/pendulum.ts).
// This tool makes it alive — and only by the hand's own act. **Nothing runs
// unblessed**: *Play* writes ONE `clock` play event on the pendulum's rod, which
// is all the log ever holds of a run (time is derived, never logged), and an
// offer at rest to play never plays by itself. *Pause* and *Reset* are the
// clock's own ops. A pendulum drawn plumb hangs still, so it is also offered
// *Pull it aside* — one `rotate` of the rod and bob about the pivot, one act,
// one undo — until the drag is wave 2's.
//
// What is offered stands on the pendulum the held marks make (the marks inside
// a named artifact included) and on nothing else: a row of boxes, a molecule and
// a line of writing never see it (e2e 49's golden). Tier 1: no model, no wait.

import type { Point } from '../types';
import type { SessionState } from '../session/session';
import { boardMathsOf } from '../maths/board';
import { runsIn } from '../run/runner';
import type { Run } from '../run/runner';
import { PENDULUM_OFFER_FLOOR, PULL_ASIDE_DEG, periodWords } from '../notations/pendulum';
import type { PendulumPart } from '../notations/pendulum';
import { baseOn } from './rank';
import type { Grounds, Offer, Tool, ToolScope } from './tool';

/** The marks a scope holds, the parts of any named artifact among them taken in: a pendulum that was named is still ink. */
export function marksHeld(state: SessionState, ids: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (id: string) => {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  };
  for (const id of ids) {
    const n = state.nodes.get(id);
    if (n && state.artifacts.includes(id)) {
      for (const e of n.edges) if (e.rel === 'has-part') add(e.to);
    } else add(id);
  }
  return out;
}

/** The runs the held marks make, each with enough of a pendulum to be offered: a rod, a bob that hangs and some sureness. */
function runsHeld(scope: ToolScope): Run[] {
  const marks = marksHeld(scope.state, scope.summon.enclosedIds);
  if (!marks.length) return [];
  return runsIn(scope.state, marks, () => boardMathsOf(scope.session)).filter((r) => r.reading.confidence >= PENDULUM_OFFER_FLOOR);
}

const partOf = (run: Run): PendulumPart => run.reading.data as PendulumPart;

/** Whether this run is running in this sitting: the host's word, else the log's. */
function runningNow(scope: ToolScope, key: string): boolean {
  if (scope.host.running) return !!scope.host.running(key);
  return !!scope.state.clocks[key]?.playing;
}

export const RUN: Tool = {
  id: 'run',
  name: 'running a pendulum',
  describe: () => 'a pendulum — a rod from a pivot with a bob — is played, paused or reset by the hand’s own act and swings by physics, its period exact; a rod drawn plumb can be pulled aside; time is never in the log',
  offers(scope) {
    const out: Offer[] = [];
    for (const run of runsHeld(scope)) {
      const p = partOf(run);
      const key = run.reading.key;
      const clock = scope.state.clocks[key];
      const running = runningNow(scope, key);
      const L = run.inputs.L;
      const grounds: Grounds = { on: 'notation', confidence: run.reading.confidence, why: `${run.reading.summary}` };
      const base = baseOn(grounds) - 0.05;
      out.push({
        key: `run:${running ? 'pause' : 'play'}:${key}`,
        label: running ? 'Pause the pendulum' : 'Play the pendulum',
        reason: running
          ? 'hold it where it is; Reset puts it back where it was drawn'
          : `swing it by physics — ${periodWords(L.value, p.theta)}; ${L.reason}`,
        base,
        tool: 'run',
        grounds,
        verbs: running ? ['pause', 'stop', 'hold', 'freeze'] : ['play', 'swing', 'run', 'start', 'go', 'alive', 'animate'],
        data: { key, op: running ? 'pause' : 'play' },
      });
      if (running || clock) {
        out.push({
          key: `run:reset:${key}`,
          label: 'Reset the pendulum',
          reason: 'back to t = 0, where it was drawn',
          base: 0.4,
          tool: 'run',
          verbs: ['reset', 'rewind', 'restart'],
          data: { key, op: 'reset' },
        });
      }
      // Hanging plumb it stays where it is: offer to pull it aside, until the drag is wave 2's.
      if (p.plumb) {
        out.push({
          key: `run:aside:${key}`,
          label: 'Pull it aside',
          reason: `it hangs plumb, so it would stay still — turn the rod and bob ${PULL_ASIDE_DEG}° about the pivot, then Play`,
          base: base - 0.02,
          tool: 'run',
          grounds,
          verbs: ['aside', 'pull', 'pull aside', 'drag', 'lift', 'tilt'],
          data: { key, op: 'aside', rod: p.rod, bob: p.bob, pivot: p.pivot },
        });
      }
    }
    return out;
  },
  take(offer, _scope, session, at) {
    const d = offer.data as { key: string; op: 'play' | 'pause' | 'reset' | 'aside'; rod?: string; bob?: string; pivot?: Point };
    if (d.op === 'aside') {
      if (!d.rod || !d.bob || !d.pivot) return;
      // The bob goes to the right: positive is right, and a hand pulls it the way it can see.
      session.rotate({ ids: [d.rod, d.bob], about: d.pivot, radians: -(PULL_ASIDE_DEG * Math.PI) / 180, at });
      return;
    }
    session.clock({ nodeId: d.key, op: d.op, at });
  },
};

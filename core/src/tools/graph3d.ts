// A graph in 3D (SURFACE-v10-PLAN D7): circles joined by lines stand as
// spheres and bonds at once, in the loop's frame, from the drawing alone — a
// `run` program the engine writes (tier1/library.ts, `buildGraph3D`), each
// sphere named for its mark so ink over it lands on that mark. Taking it
// blesses the loop (as the definition it matches, when one does), attaches
// the program in the engine's name and plays it, because the hand asked.

import { buildGraph3D } from '../tier1/library';
import { interpretationsOf } from '../session/interpretations';
import type { Tool } from './tool';
import { artifactsIn } from './board';

/** The shapes a sphere is drawn as, and a bond (PLAN-USER-SURFACE U1d): circles joined by lines — what the tool builds. */
const SPHERE = new Set(['circle', 'dot']);
const BOND = new Set(['line', 'arc']);

export const GRAPH3D: Tool = {
  id: 'graph3d',
  name: 'a graph in 3D',
  describe: () => 'nodes joined by edges stand as spheres and bonds, turning in the frame, each sphere named for its mark',
  offers(scope) {
    const { reading } = scope;
    if (!(reading.genre.genre === 'graph' || reading.genre.genre === 'mixed')) return [];
    if (scope.marks.length < 2 || artifactsIn(scope.state, scope.summon.enclosedIds).length) return [];
    const nodes = reading.roles.filter((r) => r.role === 'node').length, edges = reading.roles.filter((r) => r.role === 'edge').length;
    if (nodes < 2 || edges < 1) return [];
    // Offered for what it builds, and only that: every node drawn as a circle, every edge as a line.
    // A flowchart of boxes is a graph too, and "Show it in 3D" on it was noise.
    const shapeOf = (id: string) => {
      const n = scope.state.nodes.get(id);
      return n ? interpretationsOf(n, scope.state.nodes).filter((r) => r.tier === 0 && r.basis !== 'label')[0]?.label : undefined;
    };
    for (const r of reading.roles) {
      if (r.role === 'node' && !SPHERE.has(shapeOf(r.id) ?? '')) return [];
      if (r.role === 'edge' && !BOND.has(shapeOf(r.id) ?? '')) return [];
    }
    return [{
      key: '3d',
      label: 'Show it in 3D',
      reason: nodes + ' spheres and ' + edges + ' bond' + (edges === 1 ? '' : 's') + ' in the frame, turning — press inside to turn it; ink over a sphere lands on its mark → then: What is this? asks which molecule',
      base: 0.4,
      tool: 'graph3d',
      verbs: ['3d', 'show in 3d', 'in 3d', 'spheres'],
    }];
  },
  take(_offer, scope, session, at) {
    const sum = scope.summon;
    const match = sum.suggestions.find((x) => x.kind === 'match');
    const made = match ? session.bless({ summonId: sum.id, suggestionId: match.id, at }) : session.bless({ summonId: sum.id, name: 'graph in 3d', at });
    if (!made) return { made: null, detail: { ok: false, error: 'could not hold that group' } };
    const built = buildGraph3D(session, made);
    if (!built.ok) return { made, detail: { ok: false, error: built.error } };
    session.attachCode({ participantId: built.participantId, nodeId: made, kind: 'run', code: built.code, prompt: 'show it in 3D', at: at + 1 });
    session.clock({ nodeId: made, op: 'play', at: at + 2 });
    return { made, detail: { ok: true, reasoning: built.reasoning } };
  },
};

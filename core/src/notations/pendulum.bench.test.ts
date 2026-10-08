// The pendulum's bench (MATHS-SPEC §8 Lane D, M23): the command mark's pattern for
// a notation. Two questions, and the second matters more:
//
//   - **Does it read its own drawings?** The pendulum drawn again with other
//     seeds, wobbles, angles, lengths, pivots and bobs, elsewhere on the page, at
//     0.6× and 1.8× of the size it was written at — never the ink its thresholds
//     were read against — must read as a pendulum above the floor, with the rod
//     and the bob the marks they are, and the angle to 3°.
//   - **Does it stay quiet on everything else?** The recognition corpus's single
//     marks, the flowchart bench's thirty-six flowcharts, the class-diagram,
//     sequence, state, ER, mind-map and garment boards, wireframes, a canonical
//     molecule, lines of writing, a row of boxes and a hub, and the maths pages the
//     push draws (a right triangle ruled in three lines with its square) read no
//     pendulum above the floor.

import { describe, it, expect } from 'vitest';
import { createSession, NOTATION_FLOOR } from '../index';
import type { Session } from '../index';
import type { Point } from '../types';
import { buildCases, buildTurnedCases, buildArcCases } from '../test/cases';
import { handCircle, handLine, handRect } from '../test/strokes';
import { FLOWCHART_VARIANTS, drawFlowchart, drawMolecule, drawWireframe, drawWriting } from './fixtures/flowchart';
import { CLASS_VARIANTS, drawClassDiagram, drawClassPair } from './fixtures/uml-class';
import { SEQUENCE_VARIANTS, drawSequence } from './fixtures/sequence';
import { STATE_VARIANTS, drawState } from './fixtures/state';
import { ER_VARIANTS, drawEr } from './fixtures/er';
import { MINDMAP_VARIANTS, drawMindMap } from './fixtures/mindmap';
import { GARMENT_VARIANTS, drawGarment } from './fixtures/garment';
import { PENDULUM_VARIANTS, drawPendulum } from './fixtures/pendulum';
import { readPendulum } from './pendulum';

const SLOW = 180_000;
const deg = (rad: number) => (rad * 180) / Math.PI;

describe('its own drawings, drawn again at other sizes and in other places', () => {
  const places = [{ k: 1, at: { x: 400, y: 120 } }, { k: 0.6, at: { x: 3000, y: 200 } }, { k: 1.8, at: { x: 200, y: 3000 } }];
  it('every one reads as a pendulum above the floor — its rod, its bob, the angle drawn, the pivot it hangs from', () => {
    const misses: string[] = [];
    let drawn = 0;
    let weakest = 1;
    for (const v of PENDULUM_VARIANTS) {
      for (const p of places) {
        drawn++;
        const s = createSession();
        const e = drawPendulum(s, v, 1000, p);
        const r = readPendulum(s.getState());
        const label = `seed ${v.seed} ${v.pivot} ${v.bob} θ${v.theta} ×${p.k}`;
        if (!r || r.confidence < NOTATION_FLOOR || v.pivot === 'none') {
          if (v.pivot !== 'none') misses.push(`${label}: ${r ? r.confidence.toFixed(2) : 'nothing'}`);
          continue;
        }
        weakest = Math.min(weakest, r.confidence);
        const q = r.pendulums[0];
        if (r.pendulums.length !== 1) misses.push(`${label}: ${r.pendulums.length} pendulums`);
        if (q.rod !== e.rod) misses.push(`${label}: the rod is ${q.rod}, want ${e.rod}`);
        if (q.bob !== e.bob) misses.push(`${label}: the bob is ${q.bob}, want ${e.bob}`);
        if (Math.abs(deg(q.theta) - e.theta) > 3) misses.push(`${label}: θ ${deg(q.theta).toFixed(1)}, want ${e.theta}`);
        if (Math.abs(q.length - e.length) / e.length > 0.08) misses.push(`${label}: L ${q.length.toFixed(0)}, want ${e.length.toFixed(0)}`);
        if (v.pivot === 'hatched' && q.pivotKind !== 'hatched ceiling') misses.push(`${label}: hangs from ${q.pivotKind}`);
        if (v.pivot === 'ceiling' && q.pivotKind !== 'ceiling') misses.push(`${label}: hangs from ${q.pivotKind}`);
        if (v.pivot === 'dot' && q.pivotKind !== 'dot') misses.push(`${label}: hangs from ${q.pivotKind}`);
      }
    }
    console.log(`pendulum: own ${drawn - misses.length}/${drawn}, weakest ${weakest.toFixed(2)}`);
    expect(misses).toEqual([]);
  }, SLOW);

  it('with no pivot drawn the same drawings read, weaker, and under the floor — the rod’s top end alone', () => {
    const wrong: string[] = [];
    for (const v of PENDULUM_VARIANTS.filter((x) => x.theta !== 41).slice(0, 36)) {
      const s = createSession();
      drawPendulum(s, { ...v, pivot: 'none' }, 1000);
      const bare = readPendulum(s.getState());
      const s2 = createSession();
      drawPendulum(s2, { ...v, pivot: 'ceiling' }, 1000);
      const ceiling = readPendulum(s2.getState());
      if (!bare) { wrong.push(`seed ${v.seed}: nothing`); continue; }
      if (!ceiling || bare.confidence >= ceiling.confidence) wrong.push(`seed ${v.seed}: bare ${bare.confidence.toFixed(2)} is not under ${ceiling ? ceiling.confidence.toFixed(2) : 'nothing'}`);
      if (bare.confidence >= NOTATION_FLOOR) wrong.push(`seed ${v.seed}: bare ${bare.confidence.toFixed(2)} clears the floor`);
    }
    expect(wrong).toEqual([]);
  }, SLOW);
});

/** The corpus the packs' bench uses, as drawings. */
describe('the negatives: nothing else reads as a pendulum above the floor', () => {
  const above = (draws: [string, (s: Session) => unknown][]) => {
    const out: string[] = [];
    for (const [label, draw] of draws) {
      const s = createSession();
      draw(s);
      const r = readPendulum(s.getState());
      if (r && r.confidence >= NOTATION_FLOOR) out.push(`${label}: ${r.confidence.toFixed(2)} — ${r.summary}`);
    }
    return out;
  };
  const strokesOn = (s: Session, strokes: Point[][]) => strokes.forEach((p, i) => s.addStroke(p, 1000 + i * 5000));

  it('the recognition corpus — every shape every way a hand draws it, boxes turned, arcs of every sweep', () => {
    const cases = [...buildCases(), ...buildTurnedCases(), ...buildArcCases()];
    expect(above(cases.map((c) => [c.label, (s: Session) => strokesOn(s, [c.points])]))).toEqual([]);
  }, SLOW);

  it('the flowchart bench — thirty-six hand-drawn flowcharts', () => {
    expect(above(FLOWCHART_VARIANTS.map((v) => [`flowchart seed ${v.seed}`, (s: Session) => drawFlowchart(s, v)]))).toEqual([]);
  }, SLOW);

  it('the class, sequence, state, ER, mind-map and garment boards — every hand', () => {
    expect(
      above([
        ...CLASS_VARIANTS.flatMap((v): [string, (s: Session) => unknown][] => [[`class seed ${v.seed}`, (s) => drawClassDiagram(s, v)], [`A2 seed ${v.seed}`, (s) => drawClassPair(s, v)]]),
        ...SEQUENCE_VARIANTS.map((v): [string, (s: Session) => unknown] => [`sequence ${v.style} seed ${v.seed}`, (s) => drawSequence(s, v)]),
        ...STATE_VARIANTS.map((v): [string, (s: Session) => unknown] => [`state seed ${v.seed}`, (s) => drawState(s, v)]),
        ...ER_VARIANTS.map((v): [string, (s: Session) => unknown] => [`er seed ${v.seed}`, (s) => drawEr(s, v)]),
        ...MINDMAP_VARIANTS.map((v): [string, (s: Session) => unknown] => [`mindmap seed ${v.seed}`, (s) => drawMindMap(s, v)]),
        ...GARMENT_VARIANTS.map((v): [string, (s: Session) => unknown] => [`garment seed ${v.seed} ${v.grain} ${v.edge}`, (s) => drawGarment(s, v)]),
      ])
    ).toEqual([]);
  }, SLOW);

  it('wireframes, the canonical molecule, writing, a row of boxes, a hub, a lollipop and a right triangle with its square', () => {
    const draws: [string, (s: Session) => unknown][] = [];
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      draws.push([`wireframe ${seed}`, (s) => drawWireframe(s, seed)]);
      draws.push([`writing ${seed}`, (s) => drawWriting(s, seed)]);
      draws.push([`molecule ${seed}`, (s) => drawMolecule(s, seed)]);
      draws.push([`row ${seed}`, (s) => strokesOn(s, [0, 1, 2].map((i) => handRect(200 + i * 160, 200 + (i === 1 ? 4 : 0), 120, 80, { seed: seed * 10 + i })))]);
      draws.push([
        `hub ${seed}`,
        (s) =>
          strokesOn(s, [
            handCircle(400, 400, 40, { seed: seed * 20 }),
            ...[[400, 200], [600, 400], [400, 600], [200, 400]].flatMap(([x, y], i) => [handCircle(x, y, 30, { seed: seed * 20 + i + 1 }), handLine({ x: 400 + (x - 400) * 0.25, y: 400 + (y - 400) * 0.25 }, { x: 400 + (x - 400) * 0.83, y: 400 + (y - 400) * 0.83 }, { seed: seed * 20 + i + 5 })]),
          ]),
      ]);
      // A tree: a ring at the end of a long line that rises from the ground — the bob sits above no pivot.
      draws.push([`tree ${seed}`, (s) => strokesOn(s, [handLine({ x: 400, y: 500 }, { x: 400, y: 340 }, { seed }), handCircle(400, 300, 40, { seed: seed + 1 }), handLine({ x: 300, y: 500 }, { x: 500, y: 500 }, { seed: seed + 2 })])]);
      // A right triangle ruled in three lines, a ring written beside it.
      draws.push([`triangle ${seed}`, (s) => strokesOn(s, [handLine({ x: 100, y: 400 }, { x: 340, y: 400 }, { seed }), handLine({ x: 100, y: 400 }, { x: 100, y: 200 }, { seed: seed + 1 }), handLine({ x: 100, y: 200 }, { x: 340, y: 400 }, { seed: seed + 2 }), handCircle(420, 300, 18, { seed: seed + 3 })])]);
    }
    expect(above(draws)).toEqual([]);
  }, SLOW);
});

// The coordinate plane's bench (MATHS-SPEC §8 Lane C, M19): the command mark's pattern for a notation. Two
// questions, and the second matters more:
//
//   - **Does it read its own drawings?** A plane drawn again with other seeds, wobbles, units and styles — everything,
//     arrows only, a first quadrant with ticks and numbers, a half plane, plain lines with ticks and names, a bare plus
//     sign — elsewhere on the page, at 0.6× and 1.8× of the size it was written at, must read as a coordinate plane
//     above the floor (the bare plus, held under it and above the offer floor), with its two axes the marks they are
//     and, where numbers or ticks say it, its scale to a twentieth.
//   - **Does it stay quiet on everything else?** Not every cross is a pair of axes. The recognition corpus, the
//     flowchart bench's thirty-six flowcharts, the class-diagram, sequence, state, ER, mind-map and garment boards,
//     the pendulum bench, the four Feynman boards, wireframes, a canonical molecule, lines of writing, a row of
//     boxes, a hub, a tree, a right triangle with its square and a window with a cross in its panes read no plane
//     above the floor — nor above the offer floor, a stricter line the pendulum bench holds itself to.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import type { Session } from '../session/session';
import type { Point } from '../types';
import { NOTATION_FLOOR, notationsOf } from './notation';
import { PLANE_OFFER_FLOOR, planesIn } from './plane';
import { PLANE_VARIANTS, drawPlane } from './fixtures/plane';
import { buildCases, buildTurnedCases, buildArcCases } from '../test/cases';
import { handArrow, handCircle, handLine, handRect } from '../test/strokes';
import { FLOWCHART_VARIANTS, drawFlowchart, drawMolecule, drawWireframe, drawWriting } from './fixtures/flowchart';
import { CLASS_VARIANTS, drawClassDiagram, drawClassPair } from './fixtures/uml-class';
import { SEQUENCE_VARIANTS, drawSequence } from './fixtures/sequence';
import { STATE_VARIANTS, drawState } from './fixtures/state';
import { ER_VARIANTS, drawEr } from './fixtures/er';
import { MINDMAP_VARIANTS, drawMindMap } from './fixtures/mindmap';
import { GARMENT_VARIANTS, drawGarment } from './fixtures/garment';
import { PENDULUM_VARIANTS, drawPendulum } from './fixtures/pendulum';
import { FEYNMAN_BOARDS, FEYNMAN_VARIANTS, drawFeynman } from './fixtures/feynman';

const SLOW = 300_000;
const places = [{ k: 1, at: { x: 400, y: 330 } }, { k: 0.6, at: { x: 3000, y: 800 } }, { k: 1.8, at: { x: 700, y: 3000 } }];

describe('its own drawings, drawn again at other sizes and in other places', () => {
  it('every one reads as a coordinate plane — its axes the marks they are, its scale to a twentieth', () => {
    const misses: string[] = [];
    const by: Record<string, { n: number; ok: number; lo: number; hi: number }> = {};
    let drawn = 0;
    for (const v of PLANE_VARIANTS) {
      for (const p of places) {
        drawn++;
        const s = createSession();
        const e = drawPlane(s, v, 1000, p);
        const label = `seed ${v.seed} ${v.style} ×${p.k}`;
        const parts = planesIn(s.getState());
        const t = (by[v.style] ??= { n: 0, ok: 0, lo: 1, hi: 0 });
        t.n++;
        const part = parts[0];
        if (!part) { misses.push(`${label}: no plane`); continue; }
        t.lo = Math.min(t.lo, part.confidence);
        t.hi = Math.max(t.hi, part.confidence);
        let ok = true;
        const bad = (why: string) => { ok = false; misses.push(`${label}: ${why}`); };
        if (parts.length !== 1) bad(`${parts.length} planes`);
        if (part.id !== e.x) bad(`x axis is ${part.id}, want ${e.x}`);
        if (part.yAxis.id !== e.y) bad(`y axis is ${part.yAxis.id}, want ${e.y}`);
        if (v.style === 'bare') {
          if (part.confidence >= NOTATION_FLOOR || part.confidence < PLANE_OFFER_FLOOR) bad(`bare plus ${part.confidence.toFixed(2)} not in [${PLANE_OFFER_FLOOR}, ${NOTATION_FLOOR})`);
        } else if (part.confidence < NOTATION_FLOOR) bad(`only ${part.confidence.toFixed(2)}`);
        if (e.numbered || v.style === 'names') {
          const want = e.unit;
          if (Math.abs(part.x.perUnit - want) / want > 0.05) bad(`x unit ${part.x.perUnit.toFixed(1)}, want ${want.toFixed(1)}`);
          if (Math.abs(part.y.perUnit - want) / want > 0.05) bad(`y unit ${part.y.perUnit.toFixed(1)}, want ${want.toFixed(1)}`);
          if (part.x.how !== (e.numbered ? 'numbers' : 'ticks')) bad(`x scale from ${part.x.how}`);
        } else if (part.x.how !== 'assumed') bad(`x scale from ${part.x.how}, want assumed`);
        if (e.numbered && part.numbers.length < 4) bad(`${part.numbers.length} numbers read`);
        if (e.named && (part.xAxis.name !== 'x' || part.yAxis.name !== 'y')) bad(`names ${part.xAxis.name}/${part.yAxis.name}`);
        if (e.arrows !== (part.xAxis.heads.pos && part.yAxis.heads.pos)) bad(`arrows read ${part.xAxis.heads.pos}/${part.yAxis.heads.pos}, want ${e.arrows}`);
        // First among the notations, when it is said at all.
        if (part.confidence >= NOTATION_FLOOR) {
          const rs = notationsOf(s.getState());
          if (rs[0]?.notation !== 'plane') bad(`first is ${rs[0]?.notation}`);
        }
        if (ok) t.ok++;
      }
    }
    for (const [style, t] of Object.entries(by)) console.log(`plane: ${style.padEnd(7)} ${t.ok}/${t.n}, confidence ${t.lo.toFixed(2)}–${t.hi.toFixed(2)}`);
    console.log(`plane: own ${drawn - misses.length}/${drawn} (${drawn} drawings)`);
    expect(misses).toEqual([]);
  }, SLOW);
});

/** The corpus the other benches use, as drawings. */
describe('the negatives: nothing else reads as a coordinate plane above the floor', () => {
  let highest = 0;
  const above = (draws: [string, (s: Session) => unknown][], floor = PLANE_OFFER_FLOOR) => {
    const out: string[] = [];
    for (const [label, draw] of draws) {
      const s = createSession();
      draw(s);
      const p = planesIn(s.getState(), undefined, { fits: false })[0];
      if (p) highest = Math.max(highest, p.confidence);
      if (p && p.confidence >= floor) out.push(`${label}: ${p.confidence.toFixed(2)} — ${p.summary}`);
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

  it('the pendulum bench and the four Feynman boards — every hand, at three sizes', () => {
    expect(
      above([
        ...PENDULUM_VARIANTS.flatMap((v): [string, (s: Session) => unknown][] => places.map((p) => [`pendulum seed ${v.seed} ${v.pivot} θ${v.theta} ×${p.k}`, (s: Session) => drawPendulum(s, v, 1000, p)])),
        ...FEYNMAN_BOARDS.flatMap((b): [string, (s: Session) => unknown][] => FEYNMAN_VARIANTS.flatMap((v) => places.map((p): [string, (s: Session) => unknown] => [`feynman ${b} seed ${v.seed} ×${p.k}`, (s) => drawFeynman(s, b, v, 1000, { k: p.k, at: p.at })]))),
      ])
    ).toEqual([]);
  }, SLOW);

  it('wireframes, the canonical molecule, writing, a row of boxes, a hub, a tree, a window with a cross in it and a right triangle with its square', () => {
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
      draws.push([`tree ${seed}`, (s) => strokesOn(s, [handLine({ x: 400, y: 500 }, { x: 400, y: 340 }, { seed }), handCircle(400, 300, 40, { seed: seed + 1 }), handLine({ x: 300, y: 500 }, { x: 500, y: 500 }, { seed: seed + 2 })])]);
      draws.push([`triangle ${seed}`, (s) => strokesOn(s, [handLine({ x: 100, y: 400 }, { x: 340, y: 400 }, { seed }), handLine({ x: 100, y: 400 }, { x: 100, y: 200 }, { seed: seed + 1 }), handLine({ x: 100, y: 200 }, { x: 340, y: 400 }, { seed: seed + 2 }), handRect(100, 385, 15, 15, { seed: seed + 3 })])]);
      // A window: a frame with a cross in its panes — long straight strokes crossing at the right angle inside a box.
      draws.push([`window ${seed}`, (s) => strokesOn(s, [handRect(200, 150, 300, 260, { seed }), handLine({ x: 350, y: 150 }, { x: 350, y: 410 }, { seed: seed + 1 }), handLine({ x: 200, y: 280 }, { x: 500, y: 280 }, { seed: seed + 2 })])]);
      // Two connectors crossing between four boxes: each with a head, free ends on the boxes.
      draws.push([
        `crossing arrows ${seed}`,
        (s) =>
          strokesOn(s, [
            handRect(100, 270, 90, 60, { seed }), handRect(480, 270, 90, 60, { seed: seed + 1 }), handRect(290, 60, 90, 60, { seed: seed + 2 }), handRect(290, 480, 90, 60, { seed: seed + 3 }),
            handArrow({ x: 190, y: 300 }, { x: 480, y: 300 }, { seed: seed + 4 }), handArrow({ x: 335, y: 480 }, { x: 335, y: 120 }, { seed: seed + 5 }),
          ]),
      ]);
    }
    expect(above(draws)).toEqual([]);
  }, SLOW);

  it('the highest any other board reached is under the offer floor', () => {
    console.log(`plane: highest any other board reached ${highest.toFixed(2)} (offer floor ${PLANE_OFFER_FLOOR}, notation floor ${NOTATION_FLOOR})`);
    expect(highest).toBeLessThan(PLANE_OFFER_FLOOR);
  });
});

// The garment pattern piece's bench (V1-PLAN §9 M6): the command mark's
// pattern for a notation. Two questions, and the second matters more:
//
//   - **Does it read its own drawings?** The pattern board drawn again with
//     other seeds and wobbles, elsewhere on the page, and at 0.6× and 1.8× of
//     the size it was written at — never the ink its thresholds were read
//     against — must read as a garment pattern piece, above the floor, with
//     every mark the thing it is.
//   - **Does it stay quiet on everything else?** The recognition corpus's
//     single marks (every shape every way a hand draws it), the flowchart
//     bench's thirty-six flowcharts, the class-diagram, sequence, state, ER and
//     mind-map boards, wireframes, a canonical molecule, lines of writing, a
//     row of boxes and a hub read 0 above the floor.

import { describe, it, expect } from 'vitest';
import { createSession, NOTATION_FLOOR, readGarment } from '../index';
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

const SLOW = 180_000;

/** Every drawing of the pattern board again: each variant at three sizes and places, and what each mark should have read as. */
describe('its own drawings, drawn again at other sizes and in other places', () => {
  const places = [{ k: 1, at: { x: 300, y: 340 } }, { k: 0.6, at: { x: 3000, y: 200 } }, { k: 1.8, at: { x: 200, y: 3000 } }];
  it('every one reads as a garment pattern piece above the floor, with all its marks — seams, folds, grain lines, notches, darts', () => {
    const misses: string[] = [];
    let drawn = 0;
    for (const v of GARMENT_VARIANTS) {
      for (const p of places) {
        drawn++;
        const s = createSession();
        const e = drawGarment(s, v, 1000, p);
        const r = readGarment(s.getState());
        const label = `seed ${v.seed} ${v.grain} ${v.dart} ${v.edge} ×${p.k}`;
        if (!r || r.confidence < NOTATION_FLOOR) { misses.push(`${label}: ${r ? r.confidence.toFixed(2) : 'nothing'}`); continue; }
        const count = (name: string) => r.symbols.filter((m) => m.symbol === name).length;
        const want = { piece: 1, grain: 1, notch: 2, dart: 1, seam: v.edge === 'seam' ? 1 : 0, fold: v.edge === 'fold' ? 1 : 0 };
        for (const [name, n] of Object.entries(want)) if (count(name) !== n) misses.push(`${label}: ${count(name)} ${name}, want ${n}`);
        if (r.pieces[0] !== e.piece) misses.push(`${label}: the piece is ${r.pieces[0]}`);
      }
    }
    console.log(`garment: own ${drawn - misses.length}/${drawn}`);
    expect(misses).toEqual([]);
  }, SLOW);
});

/** The corpus the packs' bench uses, as drawings. */
describe('the negatives: nothing else reads as a garment pattern piece above the floor', () => {
  const above = (draws: [string, (s: Session) => unknown][]) => {
    const out: string[] = [];
    for (const [label, draw] of draws) {
      const s = createSession();
      draw(s);
      const r = readGarment(s.getState());
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

  it('the class, sequence, state, ER and mind-map boards — every hand', () => {
    expect(
      above([
        ...CLASS_VARIANTS.flatMap((v): [string, (s: Session) => unknown][] => [[`class seed ${v.seed}`, (s) => drawClassDiagram(s, v)], [`A2 seed ${v.seed}`, (s) => drawClassPair(s, v)]]),
        ...SEQUENCE_VARIANTS.map((v): [string, (s: Session) => unknown] => [`sequence ${v.style} seed ${v.seed}`, (s) => drawSequence(s, v)]),
        ...STATE_VARIANTS.map((v): [string, (s: Session) => unknown] => [`state seed ${v.seed}`, (s) => drawState(s, v)]),
        ...ER_VARIANTS.map((v): [string, (s: Session) => unknown] => [`er seed ${v.seed}`, (s) => drawEr(s, v)]),
        ...MINDMAP_VARIANTS.map((v): [string, (s: Session) => unknown] => [`mindmap seed ${v.seed}`, (s) => drawMindMap(s, v)]),
      ])
    ).toEqual([]);
  }, SLOW);

  it('wireframes, the canonical molecule, writing, a row of boxes and a hub', () => {
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
    }
    expect(above(draws)).toEqual([]);
  }, SLOW);
});

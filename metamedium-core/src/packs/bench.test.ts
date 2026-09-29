// The packs' bench (V1-PLAN §2.3, §9 B3): every shipped pack reads its own
// drawings — drawn again with other seeds, elsewhere, smaller and larger —
// and stays quiet on the drawing corpus the other benches use: the
// recognition corpus's single marks (every shape every way a hand draws it,
// boxes turned, arcs of every sweep), the flowchart bench's thirty-six
// flowcharts, its wireframes and lines of writing, the class-diagram bench's
// boards (D4), the sequence board every way it is drawn (D5), the state board (D5's state half), a row of boxes and a hub.
// A canonical molecule in the corpus says what it is, and must be read as one.
//
// A false read is a match above the floor on a drawing that is neither
// labelled that definition nor has its very structure; the corpus's circles
// ARE bubbles to a signature, and are said so, not counted. None is allowed.

import { describe, it, expect } from 'vitest';
import { createSession, type Session } from '../session/session';
import type { Point } from '../types';
import { buildCases, buildTurnedCases, buildArcCases } from '../test/cases';
import { handCircle, handLine, handRect } from '../test/strokes';
import { FLOWCHART_VARIANTS, drawFlowchart, drawMolecule, drawWireframe, drawWriting } from '../notations/fixtures/flowchart';
import { CLASS_VARIANTS, drawClassDiagram, drawClassPair } from '../notations/fixtures/uml-class';
import { SEQUENCE_VARIANTS, drawSequence } from '../notations/fixtures/sequence';
import { STATE_VARIANTS, drawState } from '../notations/fixtures/state';
import { benchCorpus, packBench, type BenchDrawing, type PackBenchResult } from './bench';
import { shippedPacks } from './registry';
import { packRef } from './pack';

/** The strokes a fixture draws, as a hand left them. */
function strokesOf(draw: (s: Session) => unknown): Point[][] {
  const s = createSession();
  draw(s);
  return s.getEvents().flatMap((e) => (e.type === 'stroke' ? [e.points] : []));
}

function corpus(): BenchDrawing[] {
  const out: BenchDrawing[] = [];
  for (const c of [...buildCases(), ...buildTurnedCases(), ...buildArcCases()]) out.push({ label: c.label, strokes: [c.points] });
  FLOWCHART_VARIANTS.forEach((v) => out.push({ label: `flowchart seed ${v.seed} jitter ${v.jitter} tilt ${v.tilt}`, strokes: strokesOf((s) => drawFlowchart(s, v)) }));
  // The class-diagram bench's boards (D4): six classes and five relations, and A2's pair.
  CLASS_VARIANTS.filter((_, i) => i % 6 === 0).forEach((v) => {
    out.push({ label: `class diagram seed ${v.seed}`, strokes: strokesOf((s) => drawClassDiagram(s, v)) });
    out.push({ label: `A2 seed ${v.seed}`, strokes: strokesOf((s) => drawClassPair(s, v)) });
  });
  // The sequence bench's board (D5): boxes over solid and dashed lifelines, and a stick figure; calls, a loop, a dashed return.
  SEQUENCE_VARIANTS.filter((_, i) => i % 4 === 0).forEach((v) => out.push({ label: `A3 ${v.style} seed ${v.seed}`, strokes: strokesOf((s) => drawSequence(s, v)) }));
  // The state bench's board (D5): rounded states, an initial dot, a final ring, a loop out of a state.
  STATE_VARIANTS.filter((_, i) => i % 4 === 0).forEach((v) => out.push({ label: `A4 seed ${v.seed} dot ${v.dot} final ${v.final}`, strokes: strokesOf((s) => drawState(s, v)) }));
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    out.push({ label: `wireframe ${seed}`, strokes: strokesOf((s) => drawWireframe(s, seed)) });
    out.push({ label: `writing ${seed}`, strokes: strokesOf((s) => drawWriting(s, seed)) });
    out.push({ label: `canonical molecule ${seed}`, strokes: strokesOf((s) => drawMolecule(s, seed)), is: 'molecule' });
    // Three boxes in a row, the golden's own (e2e 49), and a hub: a centre joined to four satellites.
    out.push({ label: `row of three boxes ${seed}`, strokes: [0, 1, 2].map((i) => handRect(200 + i * 160, 200 + (i === 1 ? 4 : 0), 120, 80, { seed: seed * 10 + i })) });
    out.push({
      label: `hub of four ${seed}`,
      strokes: [
        handCircle(400, 400, 40, { seed: seed * 20 }),
        ...[[400, 200], [600, 400], [400, 600], [200, 400]].flatMap(([x, y], i) => [
          handCircle(x, y, 30, { seed: seed * 20 + i + 1 }),
          handLine({ x: 400 + (x - 400) * 0.25, y: 400 + (y - 400) * 0.25 }, { x: 400 + (x - 400) * 0.83, y: 400 + (y - 400) * 0.83 }, { seed: seed * 20 + i + 5 }),
        ]),
      ],
    });
  }
  return out;
}

/** A bench in a few lines, for the record. */
function said(r: PackBenchResult): string {
  const own = r.own.map((o) => `${o.definition} ${o.read}/${o.drawn}`).join(', ') || 'no definitions';
  const same = new Map<string, number>();
  for (const x of r.corpus.same) same.set(x.definition, (same.get(x.definition) ?? 0) + 1);
  return `${r.pack}: own ${own} (${(r.ownRate * 100).toFixed(1)}%); corpus ${r.corpus.drawn} drawings, false reads ${r.corpus.falseReads.length}, labelled read ${r.corpus.expected.length}, labelled missed ${r.corpus.missed.length}${same.size ? ', the same structure: ' + [...same].map(([d, n]) => `${n} as ${d}`).join(', ') : ''}`;
}

describe('every shipped pack is benched', () => {
  // Laid out once, on one board: every pack is benched against the same marks.
  const drawings = benchCorpus(corpus());

  for (const pack of shippedPacks()) {
    it(`${packRef(pack)} reads its own drawings, and nothing in the corpus falsely`, () => {
      const r = packBench(pack, { corpus: drawings });
      console.log(said(r));
      for (const m of r.own.flatMap((o) => o.misses).slice(0, 5)) console.log('  missed:', m);
      for (const f of r.corpus.falseReads.slice(0, 5)) console.log('  false read:', f);
      // Its own drawings, by other hands' seeds and at other sizes, read as themselves.
      expect(r.ownRate).toBeGreaterThanOrEqual(0.95);
      // Nothing that is not it reads as it above the floor.
      expect(r.corpus.falseReads).toEqual([]);
      // A drawing that says it is one of the pack's is read as it.
      expect(r.corpus.missed).toEqual([]);
    });
  }

  it('basics@1: every canonical molecule in the corpus is its molecule, and every circle the rung reads alone is its bubble', () => {
    const r = packBench(shippedPacks().find((p) => packRef(p) === 'basics@1')!, { corpus: drawings });
    expect(r.corpus.expected.filter((x) => x.definition === 'molecule' && x.as === 'held').map((x) => x.label)).toEqual([1, 2, 3, 4, 5, 6].map((n) => `canonical molecule ${n}`));
    expect(r.corpus.same.every((x) => x.definition === 'bubble' && x.as === 'held')).toBe(true);
    expect(r.corpus.same.length).toBeGreaterThan(0);
    expect(r.own.map((o) => o.definition)).toEqual(['bubble', 'molecule']);
  });
});

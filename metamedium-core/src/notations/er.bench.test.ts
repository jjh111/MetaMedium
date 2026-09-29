// The ER-diagram bench (V1-PLAN §2.3 "every pack has a bench", §9 D6).
//
// A hand-drawn ER diagram — jittered strokes, four entities with their names
// written in them, three plain lines between them with a multiplicity written
// at each end and a verb beside each middle — must read as an ER diagram, first
// among the readings, with EVERY entity, name, relationship, multiplicity and
// verb right, drawn every way the variants draw it: seeds, a steady and a
// shaky hand, the page turned a few degrees. The traps, swept on their own:
// boxes drawn with round corners and with none at all. And what is not an ER
// diagram — the flowchart bench, the class bench, the sequence and state
// boards, a UI wireframe, the canonical molecule, a line of writing — never
// reads as one above the floor.
//
// It is a benchmark, so it prints its rates. It is also a test, so it fails
// when one of them drops.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import type { Session } from '../session/session';
import { notationsOf, NOTATION_FLOOR } from './notation';
import { readEr } from './er';
import type { ErReading } from './er';
import { drawEr, ER_VARIANTS } from './fixtures/er';
import type { ErExpected } from './fixtures/er';
import { drawFlowchart, drawWireframe, drawMolecule, drawWriting, FLOWCHART_VARIANTS } from './fixtures/flowchart';
import { drawClassDiagram, drawClassPair, CLASS_VARIANTS } from './fixtures/uml-class';
import { drawSequence, SEQUENCE_VARIANTS } from './fixtures/sequence';
import { drawState, STATE_VARIANTS } from './fixtures/state';

/** Each of these reads a few dozen boards through every registered notation: more than vitest's five seconds on a loaded machine. */
const SLOW = 120_000;

const sameSet = (a: readonly string[], b: readonly string[]) => [...a].sort().join('|') === [...b].sort().join('|');

interface Tally {
  n: number;
  right: number;
  wrong: string[];
}
const tally = (): Tally => ({ n: 0, right: 0, wrong: [] });
const count = (t: Tally, ok: boolean, why: string) => {
  t.n++;
  if (ok) t.right++;
  else t.wrong.push(why);
};
const rate = (t: Tally) => `${t.right}/${t.n} (${t.n ? ((t.right / t.n) * 100).toFixed(0) : '—'}%)`;

interface Tallies {
  diagrams: Tally;
  first: Tally;
  entities: Tally;
  names: Tally;
  relationships: Tally;
  multiplicities: Tally;
  verbs: Tally;
}
const tallies = (): Tallies => ({ diagrams: tally(), first: tally(), entities: tally(), names: tally(), relationships: tally(), multiplicities: tally(), verbs: tally() });

/** Score one reading of the board against what was drawn. */
function score(s: Session, r: ErReading | null, e: ErExpected, label: string, t: Tallies) {
  count(t.diagrams, !!r && r.confidence >= NOTATION_FLOOR, `${label}: ${r ? `read ${r.confidence.toFixed(2)}` : 'no reading'}`);
  const all = notationsOf(s.getState());
  count(t.first, all[0]?.notation === 'er', `${label}: not first — ${all.map((x) => `${x.notation} ${x.confidence.toFixed(2)}`).join(', ')}`);
  const idOf = new Map<string, string>();
  for (const [name, want] of Object.entries(e.entities)) {
    const got = r?.symbols.find((p) => p.ids.includes(want.box[0]));
    if (got) idOf.set(name, got.id);
    count(t.entities, !!got && got.symbol === 'entity' && sameSet(got.ids, want.box), `${label} ${name}: ${got ? `${got.symbol} [${got.ids}]` : 'not read'}`);
    count(t.names, !!got && sameSet(got.name.ids, want.name), `${label} ${name}: name ${got ? got.name.ids.join(',') : '—'}, wanted ${want.name.join(',')}`);
  }
  for (const want of e.relationships) {
    const got = r?.connectors.find((k) => k.id === want.id);
    const joins = !!got && sameSet([got.from, got.to], [idOf.get(want.a) ?? '?', idOf.get(want.b) ?? '?']);
    count(t.relationships, joins, `${label} ${want.name}: ${got ? `${got.from}—${got.to} — ${got.reason}` : 'not read'}`);
    const at = (entity: string) => (got && got.sides.from.entity === idOf.get(entity) ? got.sides.from : got?.sides.to);
    count(t.multiplicities, !!got && sameSet(at(want.a)?.multiplicity?.ids ?? [], want.aMult) && sameSet(at(want.b)?.multiplicity?.ids ?? [], want.bMult), `${label} ${want.name}: ends ${got ? `${at(want.a)?.multiplicity?.ids ?? '—'} / ${at(want.b)?.multiplicity?.ids ?? '—'}` : '—'}, wanted ${want.aMult} / ${want.bMult}`);
    count(t.verbs, !!got && sameSet(got.labels, want.verb), `${label} ${want.name}: verb ${got ? got.labels.join(',') : '—'}, wanted ${want.verb.join(',')}`);
  }
}

const lines = (name: string, t: Tallies) => [
  `  ${name}`,
  `    read as an ER diagram ${rate(t.diagrams)}   first among the readings ${rate(t.first)}`,
  `    entities ${rate(t.entities)}   names ${rate(t.names)}   relationships ${rate(t.relationships)}   multiplicities ${rate(t.multiplicities)}   verbs ${rate(t.verbs)}`,
];
const wrongOf = (t: Tallies) => [...t.diagrams.wrong, ...t.first.wrong, ...t.entities.wrong, ...t.names.wrong, ...t.relationships.wrong, ...t.multiplicities.wrong, ...t.verbs.wrong];

describe('the ER-diagram bench', () => {
  const confidences: number[] = [];
  const scoreAll = (name: string, opts: { round?: number }) => {
    const t = tallies();
    for (const v of ER_VARIANTS) {
      const label = `${name}: seed ${v.seed} jitter ${v.jitter} tilt ${v.tilt}`;
      const s = createSession();
      const e = drawEr(s, v, 1000, opts);
      const r = readEr(s.getState());
      if (r && name === 'the board') confidences.push(r.confidence);
      score(s, r, e, label, t);
    }
    return t;
  };
  const main = scoreAll('the board', {});
  const rounder = scoreAll('rounder boxes', { round: 0.25 });
  const square = scoreAll('boxes with no round corner', { round: 0 });

  it('prints its rates', () => {
    const out = [
      'ER-diagram bench',
      ...lines(`the board, ${ER_VARIANTS.length} hands (confidence ${Math.min(...confidences).toFixed(2)}–${Math.max(...confidences).toFixed(2)})`, main),
      ...lines('rounder boxes', rounder),
      ...lines('boxes with no round corner', square),
    ];
    console.log(out.join('\n'));
    expect(out.length).toBeGreaterThan(0);
  });

  it('every hand of the board reads as an ER diagram, first among the readings, with every entity, name, relationship, multiplicity and verb right', () => {
    expect(wrongOf(main)).toEqual([]);
    expect(main.diagrams.n).toBe(ER_VARIANTS.length);
    expect(main.entities.n).toBe(4 * ER_VARIANTS.length);
    expect(main.relationships.n).toBe(3 * ER_VARIANTS.length);
    expect(main.multiplicities.n).toBe(3 * ER_VARIANTS.length);
  }, SLOW);

  it('boxes with round corners, and with none, are entities all the same', () => {
    expect(wrongOf(rounder)).toEqual([]);
    expect(wrongOf(square)).toEqual([]);
  }, SLOW);

  // And what is not an ER diagram.
  const negatives: [string, () => { r: ErReading | null; what: string }[]][] = [
    ['the flowchart bench', () => FLOWCHART_VARIANTS.map((v) => ({ what: `seed ${v.seed}`, r: read((s) => drawFlowchart(s, v)) }))],
    ['the class bench — its six-class board and A2', () => CLASS_VARIANTS.flatMap((v) => [{ what: `board seed ${v.seed}`, r: read((s) => drawClassDiagram(s, v)) }, { what: `A2 seed ${v.seed}`, r: read((s) => drawClassPair(s, v)) }])],
    ['the sequence board', () => SEQUENCE_VARIANTS.map((v) => ({ what: `${v.style} seed ${v.seed}`, r: read((s) => drawSequence(s, v)) }))],
    ['the state board', () => STATE_VARIANTS.map((v) => ({ what: `seed ${v.seed}`, r: read((s) => drawState(s, v)) }))],
    ['a UI wireframe', () => [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({ what: `seed ${seed}`, r: read((s) => drawWireframe(s, seed)) }))],
    ['the canonical molecule', () => [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({ what: `seed ${seed}`, r: read((s) => drawMolecule(s, seed)) }))],
    ['a line of writing', () => [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({ what: `seed ${seed}`, r: read((s) => drawWriting(s, seed)) }))],
  ];
  function read(draw: (s: Session) => unknown): ErReading | null {
    const s = createSession();
    draw(s);
    return readEr(s.getState());
  }
  for (const [name, run] of negatives) {
    it(`${name} reads 0 above the floor as an ER diagram`, () => {
      const results = run();
      const above = results.filter((x) => x.r && x.r.confidence >= NOTATION_FLOOR).map((x) => `${x.what}: ${x.r!.confidence.toFixed(2)} — ${x.r!.summary}`);
      const highest = Math.max(0, ...results.map((x) => x.r?.confidence ?? 0));
      console.log(`  ${name}: highest ${highest.toFixed(2)} over ${results.length} boards`);
      expect(above).toEqual([]);
    }, SLOW);
  }
});

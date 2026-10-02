// The state-diagram bench (V1-PLAN §2.3 "every pack has a bench", §9 D5's state half).
//
// A hand-drawn state diagram — jittered strokes, three rounded states, an
// initial dot scribbled solid (a spiral in, or a zigzag across), a final ring
// round a scribbled dot, a tap or a second ring, six transitions (one a loop
// out of a state and back whose barb folds back where it arrives), a word
// written beside each and in each state — must read as a state diagram, first
// among the readings, with EVERY state, name, initial dot, final ring,
// transition, direction and label right, drawn every way the variants draw it:
// seeds, a steady and a shaky hand, the page turned a few degrees. The traps,
// swept on their own: the ring and the dot in it drawn quickly, which the
// letter rules gather into a word; the states drawn with square corners. And
// what is not a state diagram — the flowchart bench, the class bench, the
// sequence board, a UI wireframe, the canonical molecule, a line of writing —
// never reads as one above the floor.
//
// It is a benchmark, so it prints its rates. It is also a test, so it fails
// when one of them drops.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import type { Session } from '../session/session';
import { notationsOf, NOTATION_FLOOR } from './notation';
import { readState } from './state';
import type { StateReading } from './state';
import { drawState, STATE_VARIANTS } from './fixtures/state';
import type { StateExpected } from './fixtures/state';
import { drawFlowchart, drawWireframe, drawMolecule, drawWriting, FLOWCHART_VARIANTS } from './fixtures/flowchart';
import { drawClassDiagram, drawClassPair, CLASS_VARIANTS } from './fixtures/uml-class';
import { drawSequence, SEQUENCE_VARIANTS } from './fixtures/sequence';

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
  states: Tally;
  names: Tally;
  initial: Tally;
  final: Tally;
  transitions: Record<string, Tally>;
  labels: Tally;
}
const tallies = (): Tallies => ({ diagrams: tally(), first: tally(), states: tally(), names: tally(), initial: tally(), final: tally(), transitions: {}, labels: tally() });

interface View {
  id: string;
  ids: string[];
  symbol: string;
  labels: string[];
}

/** Score one reading of the board against what was drawn. */
function score(s: Session, r: StateReading | null, e: StateExpected, label: string, t: Tallies) {
  count(t.diagrams, !!r && r.confidence >= NOTATION_FLOOR, `${label}: ${r ? `read ${r.confidence.toFixed(2)}` : 'no reading'}`);
  const all = notationsOf(s.getState());
  count(t.first, all[0]?.notation === 'state', `${label}: not first — ${all.map((x) => `${x.notation} ${x.confidence.toFixed(2)}`).join(', ')}`);
  const symbols = (r?.symbols ?? []) as unknown as View[];
  const idOf = new Map<string, string>();
  for (const [name, want] of Object.entries(e.states)) {
    const got = symbols.find((p) => p.ids.includes(want.box[0]));
    if (got) idOf.set(name, got.id);
    count(t.states, !!got && got.symbol === 'state' && sameSet(got.ids, want.box), `${label} ${name}: ${got ? `${got.symbol} [${got.ids}]` : 'not read'}`);
    count(t.names, !!got && sameSet(got.labels, want.name), `${label} ${name}: name ${got ? got.labels.join(',') : '—'}, wanted ${want.name.join(',')}`);
  }
  const initial = symbols.find((p) => p.ids.includes(e.initial[0]));
  if (initial) idOf.set('initial', initial.id);
  count(t.initial, !!initial && initial.symbol === 'initial' && sameSet(initial.ids, e.initial), `${label} initial: ${initial ? `${initial.symbol} [${initial.ids}]` : 'not read'}`);
  const final = symbols.find((p) => p.ids.includes(e.final[0]));
  if (final) idOf.set('final', final.id);
  count(t.final, !!final && final.symbol === 'final' && sameSet(final.ids, e.final), `${label} final: ${final ? `${final.symbol} [${final.ids}]` : 'not read'}`);
  for (const want of e.transitions) {
    const got = r?.connectors.find((k) => k.id === want.id);
    const tt = (t.transitions[want.self ? 'loop' : 'arrow'] ??= tally());
    count(tt, !!got && got.from === idOf.get(want.from) && got.to === idOf.get(want.to) && got.self === want.self, `${label} ${want.name}: ${got ? `${got.from}→${got.to} self ${got.self} — ${got.reason}` : 'not read'}`);
    count(t.labels, !!got && sameSet(got.labels, want.label), `${label} ${want.name}: label ${got ? got.labels.join(',') : '—'}, wanted ${want.label.join(',')}`);
  }
}

const lines = (name: string, t: Tallies) => [
  `  ${name}`,
  `    read as a state diagram ${rate(t.diagrams)}   first among the readings ${rate(t.first)}`,
  `    states ${rate(t.states)}   names ${rate(t.names)}   initial ${rate(t.initial)}   final ${rate(t.final)}`,
  `    transitions — ${Object.entries(t.transitions).map(([k, v]) => `${k} ${rate(v)}`).join('   ')}   labels ${rate(t.labels)}`,
];
const wrongOf = (t: Tallies) => [...t.diagrams.wrong, ...t.first.wrong, ...t.states.wrong, ...t.names.wrong, ...t.initial.wrong, ...t.final.wrong, ...Object.values(t.transitions).flatMap((x) => x.wrong), ...t.labels.wrong];

describe('the state-diagram bench', () => {
  // The board, every hand.
  const board = tallies();
  const confidences: number[] = [];
  const scoreAll = (name: string, opts: { quick?: boolean; round?: number }, variants = STATE_VARIANTS) => {
    const t = tallies();
    for (const v of variants) {
      const label = `${name}: seed ${v.seed} jitter ${v.jitter} tilt ${v.tilt} dot ${v.dot} final ${v.final}`;
      const s = createSession();
      const e = drawState(s, v, 1000, opts);
      const r = readState(s.getState());
      if (r && name === 'the board') confidences.push(r.confidence);
      score(s, r, e, label, t);
    }
    return t;
  };
  const main = scoreAll('the board', {});
  Object.assign(board, main);
  const quick = scoreAll('the ring and its dot drawn quickly', { quick: true });
  const square = scoreAll('square-cornered states', { round: 0.08 });

  it('prints its rates', () => {
    const out = [
      'state-diagram bench',
      ...lines(`the board, ${STATE_VARIANTS.length} hands (confidence ${Math.min(...confidences).toFixed(2)}–${Math.max(...confidences).toFixed(2)})`, main),
      ...lines('the ring and the dot in it drawn quickly, gathered into a word', quick),
      ...lines('states with square corners', square),
    ];
    console.log(out.join('\n'));
    expect(out.length).toBeGreaterThan(0);
  });

  it('every hand of the board reads as a state diagram, first among the readings, with every symbol, transition, direction and label right', () => {
    expect(wrongOf(main)).toEqual([]);
    expect(main.diagrams.n).toBe(STATE_VARIANTS.length);
    expect(main.states.n).toBe(3 * STATE_VARIANTS.length);
    expect(main.transitions.arrow.n).toBe(5 * STATE_VARIANTS.length);
    expect(main.transitions.loop.n).toBe(STATE_VARIANTS.length);
  }, SLOW);

  it('a ring and the dot in it drawn quickly — which the letter rules gather into a word — are still a final state', () => {
    expect(wrongOf(quick)).toEqual([]);
  }, SLOW);

  it('states with square corners are states too, read as a state diagram from the dot, the ring and the loop alone — but a flowchart reads square boxes as well as it reads anything, and is said beside it', () => {
    // Round corners are one piece of evidence of four. Without them the diagram is still one above the floor, with every symbol and
    // transition right, and within a tenth of the flowchart's reading of the same boxes and arrows, which may stand above it.
    expect(wrongOf(square).filter((w) => !/not first/.test(w))).toEqual([]);
    const behind = square.first.wrong.filter((w) => {
      const m = /flowchart ([\d.]+), state ([\d.]+)/.exec(w);
      return !m || Number(m[1]) - Number(m[2]) > 0.1;
    });
    expect(behind).toEqual([]);
  }, SLOW);

  // And what is not a state diagram.
  const negatives: [string, () => { r: StateReading | null; what: string }[]][] = [
    ['the flowchart bench', () => FLOWCHART_VARIANTS.map((v) => ({ what: `seed ${v.seed}`, r: read((s) => drawFlowchart(s, v)) }))],
    ['the class bench — its six-class board and A2', () => CLASS_VARIANTS.flatMap((v) => [{ what: `board seed ${v.seed}`, r: read((s) => drawClassDiagram(s, v)) }, { what: `A2 seed ${v.seed}`, r: read((s) => drawClassPair(s, v)) }])],
    ['the sequence board', () => SEQUENCE_VARIANTS.map((v) => ({ what: `${v.style} seed ${v.seed}`, r: read((s) => drawSequence(s, v)) }))],
    ['a UI wireframe', () => [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({ what: `seed ${seed}`, r: read((s) => drawWireframe(s, seed)) }))],
    ['the canonical molecule', () => [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({ what: `seed ${seed}`, r: read((s) => drawMolecule(s, seed)) }))],
    ['a line of writing', () => [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({ what: `seed ${seed}`, r: read((s) => drawWriting(s, seed)) }))],
  ];
  function read(draw: (s: Session) => unknown): StateReading | null {
    const s = createSession();
    draw(s);
    return readState(s.getState());
  }
  for (const [name, run] of negatives) {
    it(`${name} reads 0 above the floor as a state diagram`, () => {
      const results = run();
      const above = results.filter((x) => x.r && x.r.confidence >= NOTATION_FLOOR).map((x) => `${x.what}: ${x.r!.confidence.toFixed(2)} — ${x.r!.summary}`);
      const highest = Math.max(0, ...results.map((x) => x.r?.confidence ?? 0));
      console.log(`  ${name}: highest ${highest.toFixed(2)} over ${results.length} boards`);
      expect(above).toEqual([]);
    }, SLOW);
  }
});

// The mind-map bench (V1-PLAN §2.3 "every pack has a bench", §9 D6).
//
// A hand-drawn mind map — jittered strokes, a central circle, three branches
// out of it, two of them with leaves, a word written in every node, a plain
// line for every branch — must read as a mind map, first among the readings,
// with EVERY node, word, shape, root, depth, parent, branch and order right,
// drawn every way the variants draw it: seeds, a steady and a shaky hand, the
// page turned a few degrees. The traps, swept on their own: boxes drawn with
// round corners and with none at all. And what is not a mind map — the
// flowchart bench, the class bench, the sequence, state and ER boards, a UI
// wireframe, the canonical molecule, a line of writing — never reads as one
// above the floor.
//
// It is a benchmark, so it prints its rates. It is also a test, so it fails
// when one of them drops.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import type { Session } from '../session/session';
import { notationsOf, NOTATION_FLOOR } from './notation';
import { readMindMap } from './mindmap';
import type { MindMapReading } from './mindmap';
import { drawMindMap, MINDMAP_VARIANTS } from './fixtures/mindmap';
import type { MindMapExpected, NodeName } from './fixtures/mindmap';
import { drawFlowchart, drawWireframe, drawMolecule, drawWriting, FLOWCHART_VARIANTS } from './fixtures/flowchart';
import { drawClassDiagram, drawClassPair, CLASS_VARIANTS } from './fixtures/uml-class';
import { drawSequence, SEQUENCE_VARIANTS } from './fixtures/sequence';
import { drawState, STATE_VARIANTS } from './fixtures/state';
import { drawEr, ER_VARIANTS } from './fixtures/er';

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
  roots: Tally;
  nodes: Tally;
  names: Tally;
  shapes: Tally;
  depths: Tally;
  branches: Tally;
  order: Tally;
}
const tallies = (): Tallies => ({ diagrams: tally(), first: tally(), roots: tally(), nodes: tally(), names: tally(), shapes: tally(), depths: tally(), branches: tally(), order: tally() });

/** Score one reading of the board against what was drawn. */
function score(s: Session, r: MindMapReading | null, e: MindMapExpected, label: string, t: Tallies) {
  count(t.diagrams, !!r && r.confidence >= NOTATION_FLOOR, `${label}: ${r ? `read ${r.confidence.toFixed(2)}` : 'no reading'}`);
  const all = notationsOf(s.getState());
  count(t.first, all[0]?.notation === 'mindmap', `${label}: not first — ${all.map((x) => `${x.notation} ${x.confidence.toFixed(2)}`).join(', ')}`);
  const idOf = new Map<string, string>();
  for (const [name, want] of Object.entries(e.nodes)) {
    const got = r?.symbols.find((p) => p.ids.includes(want.box[0]));
    if (got) idOf.set(name, got.id);
    count(t.nodes, !!got && sameSet(got.ids, want.box), `${label} ${name}: ${got ? `${got.symbol} [${got.ids}]` : 'not read'}`);
    count(t.roots, !!got && (got.symbol === 'root') === (name === 'Trip'), `${label} ${name}: ${got ? got.symbol : 'not read'}`);
    count(t.names, !!got && sameSet(got.name.ids, want.name), `${label} ${name}: word ${got ? got.name.ids.join(',') : '—'}, wanted ${want.name.join(',')}`);
    count(t.shapes, !!got && got.shape === want.shape, `${label} ${name}: shape ${got?.shape ?? '—'}, wanted ${want.shape}`);
    count(t.depths, !!got && got.depth === want.depth, `${label} ${name}: depth ${got?.depth ?? '—'}, wanted ${want.depth}`);
  }
  for (const want of e.branches) {
    const got = r?.connectors.find((k) => k.id === want.id);
    count(t.branches, !!got && got.from === idOf.get(want.from) && got.to === idOf.get(want.to) && got.tree, `${label} ${want.name}: ${got ? `${got.from}→${got.to} — ${got.reason}` : 'not read'}`);
  }
  // The order round every node: the children the notation lists are the ones drawn, in the order the fixture stands them.
  const kids: Record<string, NodeName[]> = { Trip: ['Food', 'Travel', 'Sleep'], Food: ['Pizza', 'Ramen'], Sleep: ['Hotel'], Travel: [], Pizza: [], Ramen: [], Hotel: [] };
  for (const [name, want] of Object.entries(kids)) {
    const got = r?.symbols.find((p) => p.id === idOf.get(name));
    const gotKids = got?.children ?? [];
    count(t.order, gotKids.length === want.length && want.every((k, i) => gotKids[i] === idOf.get(k)), `${label} ${name}: children ${gotKids.join(',') || '—'}, wanted ${want.join(',') || '—'}`);
  }
}

const lines = (name: string, t: Tallies) => [
  `  ${name}`,
  `    read as a mind map ${rate(t.diagrams)}   first among the readings ${rate(t.first)}`,
  `    nodes ${rate(t.nodes)}   root ${rate(t.roots)}   words ${rate(t.names)}   shapes ${rate(t.shapes)}   depths ${rate(t.depths)}   branches ${rate(t.branches)}   order ${rate(t.order)}`,
];
const wrongOf = (t: Tallies) => [...t.diagrams.wrong, ...t.first.wrong, ...t.roots.wrong, ...t.nodes.wrong, ...t.names.wrong, ...t.shapes.wrong, ...t.depths.wrong, ...t.branches.wrong, ...t.order.wrong];

describe('the mind-map bench', () => {
  const confidences: number[] = [];
  const scoreAll = (name: string, opts: { round?: number }) => {
    const t = tallies();
    for (const v of MINDMAP_VARIANTS) {
      const label = `${name}: seed ${v.seed} jitter ${v.jitter} tilt ${v.tilt}`;
      const s = createSession();
      const e = drawMindMap(s, v, 1000, opts);
      const r = readMindMap(s.getState());
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
      'mind-map bench',
      ...lines(`the board, ${MINDMAP_VARIANTS.length} hands (confidence ${Math.min(...confidences).toFixed(2)}–${Math.max(...confidences).toFixed(2)})`, main),
      ...lines('rounder boxes', rounder),
      ...lines('boxes with no round corner', square),
    ];
    console.log(out.join('\n'));
    expect(out.length).toBeGreaterThan(0);
  });

  it('every hand of the board reads as a mind map, first among the readings, with every node, word, shape, root, depth, branch and order right', () => {
    expect(wrongOf(main)).toEqual([]);
    expect(main.diagrams.n).toBe(MINDMAP_VARIANTS.length);
    expect(main.nodes.n).toBe(7 * MINDMAP_VARIANTS.length);
    expect(main.branches.n).toBe(6 * MINDMAP_VARIANTS.length);
    expect(main.order.n).toBe(7 * MINDMAP_VARIANTS.length);
  }, SLOW);

  it('boxes with round corners, and with none, are nodes all the same', () => {
    expect(wrongOf(rounder)).toEqual([]);
    expect(wrongOf(square)).toEqual([]);
  }, SLOW);

  // And what is not a mind map.
  const negatives: [string, () => { r: MindMapReading | null; what: string }[]][] = [
    ['the flowchart bench', () => FLOWCHART_VARIANTS.map((v) => ({ what: `seed ${v.seed}`, r: read((s) => drawFlowchart(s, v)) }))],
    ['the class bench — its six-class board and A2', () => CLASS_VARIANTS.flatMap((v) => [{ what: `board seed ${v.seed}`, r: read((s) => drawClassDiagram(s, v)) }, { what: `A2 seed ${v.seed}`, r: read((s) => drawClassPair(s, v)) }])],
    ['the sequence board', () => SEQUENCE_VARIANTS.map((v) => ({ what: `${v.style} seed ${v.seed}`, r: read((s) => drawSequence(s, v)) }))],
    ['the state board', () => STATE_VARIANTS.map((v) => ({ what: `seed ${v.seed}`, r: read((s) => drawState(s, v)) }))],
    ['the ER board — boxes joined in a tree, but every line written on', () => ER_VARIANTS.map((v) => ({ what: `seed ${v.seed}`, r: read((s) => drawEr(s, v)) }))],
    ['a UI wireframe', () => [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({ what: `seed ${seed}`, r: read((s) => drawWireframe(s, seed)) }))],
    ['the canonical molecule', () => [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({ what: `seed ${seed}`, r: read((s) => drawMolecule(s, seed)) }))],
    ['a line of writing', () => [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({ what: `seed ${seed}`, r: read((s) => drawWriting(s, seed)) }))],
  ];
  function read(draw: (s: Session) => unknown): MindMapReading | null {
    const s = createSession();
    draw(s);
    return readMindMap(s.getState());
  }
  for (const [name, run] of negatives) {
    it(`${name} reads 0 above the floor as a mind map`, () => {
      const results = run();
      const above = results.filter((x) => x.r && x.r.confidence >= NOTATION_FLOOR).map((x) => `${x.what}: ${x.r!.confidence.toFixed(2)} — ${x.r!.summary}`);
      const highest = Math.max(0, ...results.map((x) => x.r?.confidence ?? 0));
      console.log(`  ${name}: highest ${highest.toFixed(2)} over ${results.length} boards`);
      expect(above).toEqual([]);
    }, SLOW);
  }
});

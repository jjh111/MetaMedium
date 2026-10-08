// The Feynman-diagram bench (MATHS-SPEC §8, M27): every pack has a bench, and
// this one asks two questions.
//
//   - **Does it read its own drawings?** The four boards — e⁻ e⁺ → μ⁻ μ⁺ in
//     the s-channel, Møller's e⁻ e⁻ → e⁻ e⁻ in the t-channel, Compton's e⁻ γ →
//     e⁻ γ, and u d → u d by a gluon — each drawn by thirty-six hands (seeds, a
//     steady and a shaky hand, the page turned, the fermions' arrows a chevron
//     or a barb, a photon wavy or a zigzag, the boson named or not), at 1×, at
//     0.6× and at 1.8× elsewhere on the page, must read as a Feynman diagram,
//     first among the readings, with every line the kind it was drawn as and
//     joining the vertices it was drawn between, every name on the line it was
//     written beside — and, once a model that can see has read the names, the
//     right process, channel and order.
//   - **Does it stay quiet on everything else?** The other notations' boards,
//     a wireframe, the canonical molecule, a row of boxes, a hub, the
//     recognition corpus's single marks and lines of writing read as no
//     Feynman diagram above the floor; and no writing — the corpus's, the
//     shared fixtures', a printed line, the names on these very boards — reads
//     as a wavy line.
//
// It is a benchmark, so it prints its rates. It is also a test, so it fails
// when one of them drops.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import type { Session } from '../session/session';
import type { Point } from '../types';
import { getRep } from '../session/nodes';
import { notationsOf, NOTATION_FLOOR } from './notation';
import { readFeynman } from './feynman';
import type { FeynmanReading } from './feynman';
import { waveOf, waveOfNode } from '../diagram/waves';
import { drawFeynman, readFeynmanWords, FEYNMAN_VARIANTS, FEYNMAN_BOARDS } from './fixtures/feynman';
import type { FeynmanBoardName, FeynmanExpected } from './fixtures/feynman';
import { buildCases, buildTurnedCases, buildArcCases } from '../test/cases';
import { handCircle, handLine, handRect, handPrint } from '../test/strokes';
import { FLOWCHART_VARIANTS, drawFlowchart, drawMolecule, drawWireframe, drawWriting } from './fixtures/flowchart';
import { CLASS_VARIANTS, drawClassDiagram, drawClassPair } from './fixtures/uml-class';
import { SEQUENCE_VARIANTS, drawSequence } from './fixtures/sequence';
import { STATE_VARIANTS, drawState } from './fixtures/state';
import { ER_VARIANTS, drawEr } from './fixtures/er';
import { MINDMAP_VARIANTS, drawMindMap } from './fixtures/mindmap';
import { GARMENT_VARIANTS, drawGarment } from './fixtures/garment';

/** Each of these reads a few hundred boards through every registered notation: more than vitest's five seconds. */
const SLOW = 300_000;

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

const PLACES = [
  { k: 1, at: { x: 430, y: 310 } },
  { k: 0.6, at: { x: 3000, y: 200 } },
  { k: 1.8, at: { x: 200, y: 3000 } },
];

interface Tallies {
  read: Tally;
  first: Tally;
  lines: Tally;
  vertices: Tally;
  labels: Tally;
  process: Tally;
  channel: Tally;
  order: Tally;
}
const tallies = (): Tallies => ({ read: tally(), first: tally(), lines: tally(), vertices: tally(), labels: tally(), process: tally(), channel: tally(), order: tally() });

/** Score one board against what was drawn: before the names are read, and after. */
function score(s: Session, e: FeynmanExpected, label: string, t: Tallies, confidences: number[]) {
  const r = readFeynman(s.getState());
  if (r) confidences.push(r.confidence);
  count(t.read, !!r && r.confidence >= NOTATION_FLOOR, `${label}: ${r ? `read ${r.confidence.toFixed(2)}` : 'no reading'}`);
  const all = notationsOf(s.getState());
  count(t.first, all[0]?.notation === 'feynman', `${label}: not first — ${all.map((x) => `${x.notation} ${x.confidence.toFixed(2)}`).join(', ')}`);
  if (!r) return;
  const d = r.diagrams[0];
  // Each line: its kind, its marks, and the vertices it was drawn between, by their names in time.
  const nameOfEnd = (sym: string) => (sym.startsWith('external:') ? 'free' : d.names[sym]);
  for (const want of e.lines) {
    const got = r.lines.find((l) => l.id === want.id);
    const ends = got ? [nameOfEnd(got.lineEnds[0].vertex ?? `external:${got.id}`), nameOfEnd(got.lineEnds[1].vertex ?? `external:${got.id}`)] : [];
    count(
      t.lines,
      !!got && got.kind === want.kind && sameSet(got.ids, want.ids) && sameSet(ends, [want.from, want.to]),
      `${label} ${want.name}: ${got ? `${got.kind} [${got.ids}] ${ends.join('→')}` : 'not read'}, wanted ${want.kind} [${want.ids}] ${want.from}→${want.to}`
    );
    count(t.labels, !!got && sameSet(got.labels, want.label), `${label} ${want.name}: labels ${got?.labels.join(',') ?? '—'}, wanted ${want.label.join(',')}`);
  }
  for (const [name, ids] of Object.entries(e.vertices)) {
    const v = r.vertices.find((x) => d.names[x.id] === name);
    count(t.vertices, !!v && sameSet(v.lines.map((x) => x.line), ids) && v.degree === 3, `${label} vertex ${name}: ${v ? v.lines.map((x) => x.line).join(',') : 'none'}, wanted ${ids.join(',')}`);
  }
  // Once the names are read: the process, the channel and the order.
  readFeynmanWords(s, e);
  const rr = readFeynman(s.getState());
  const dd = rr?.diagrams[0];
  count(t.process, dd?.process === e.process, `${label}: process ${dd?.process ?? dd?.processSaid ?? '—'}, wanted ${e.process}`);
  count(t.channel, dd?.channel === e.channel, `${label}: channel ${dd?.channel ?? '—'}, wanted ${e.channel}`);
  count(t.order, dd?.order.said === e.order && !!dd && dd.loops === 0, `${label}: order ${dd?.order.said ?? '—'} loops ${dd?.loops}, wanted ${e.order}`);
}

const wrongOf = (t: Tallies) => Object.values(t).flatMap((x: Tally) => x.wrong);
const lines = (name: string, t: Tallies) => [
  `  ${name}`,
  `    read ${rate(t.read)}   first ${rate(t.first)}   lines ${rate(t.lines)}   vertices ${rate(t.vertices)}   labels ${rate(t.labels)}`,
  `    once read — process ${rate(t.process)}   channel ${rate(t.channel)}   order ${rate(t.order)}`,
];

describe('the Feynman-diagram bench: its own drawings', () => {
  const per: Record<string, Tallies> = {};
  const all = tallies();
  const confidences: number[] = [];
  for (const board of FEYNMAN_BOARDS) {
    for (const p of PLACES) {
      const t = (per[`${board} ×${p.k}`] = tallies());
      for (const v of FEYNMAN_VARIANTS) {
        const s = createSession();
        const e = drawFeynman(s, board as FeynmanBoardName, v, 1000, { k: p.k, at: p.at });
        score(s, e, `${board} ×${p.k} seed ${v.seed} jitter ${v.jitter} tilt ${v.tilt} ${v.arrows} ${v.photon}${v.named ? ' named' : ''}`, t, confidences);
      }
      for (const [k, x] of Object.entries(t) as [keyof Tallies, Tally][]) {
        all[k].n += x.n;
        all[k].right += x.right;
        all[k].wrong.push(...x.wrong);
      }
    }
  }

  it('prints its rates', () => {
    const out = [
      `Feynman-diagram bench — ${FEYNMAN_VARIANTS.length} hands of each of four boards at three sizes (confidence ${Math.min(...confidences).toFixed(2)}–${Math.max(...confidences).toFixed(2)})`,
      ...Object.entries(per).flatMap(([name, t]) => lines(name, t)),
      ...lines('all', all),
    ];
    console.log(out.join('\n'));
    expect(out.length).toBeGreaterThan(0);
  });

  it('every hand of every board, at every size, reads as a Feynman diagram, first, with every line, vertex and name — and once read, the process, channel and order', () => {
    expect(wrongOf(all)).toEqual([]);
    expect(all.read.n).toBe(4 * 3 * FEYNMAN_VARIANTS.length);
    expect(FEYNMAN_VARIANTS.length).toBe(36);
  }, SLOW);
});

describe('the Feynman-diagram bench: nothing else reads as one', () => {
  const above = (draws: [string, (s: Session) => unknown][]) => {
    const out: string[] = [];
    let highest = 0;
    for (const [label, draw] of draws) {
      const s = createSession();
      draw(s);
      const r = readFeynman(s.getState());
      highest = Math.max(highest, r?.confidence ?? 0);
      if (r && r.confidence >= NOTATION_FLOOR) out.push(`${label}: ${r.confidence.toFixed(2)} — ${r.summary}`);
    }
    return { out, highest, n: draws.length };
  };
  const strokesOn = (s: Session, strokes: Point[][]) => strokes.forEach((p, i) => s.addStroke(p, 1000 + i * 5000));
  const said = (name: string, r: { highest: number; n: number }) => console.log(`  ${name}: highest ${r.highest.toFixed(2)} over ${r.n} boards`);

  it('the recognition corpus — every shape every way a hand draws it, boxes turned, arcs of every sweep', () => {
    const cases = [...buildCases(), ...buildTurnedCases(), ...buildArcCases()];
    const r = above(cases.map((c) => [c.label, (s: Session) => strokesOn(s, [c.points])]));
    said('the recognition corpus', r);
    expect(r.out).toEqual([]);
  }, SLOW);

  it('the flowchart bench, and the class, sequence, state, ER, mind-map and garment boards — every hand', () => {
    const r = above([
      ...FLOWCHART_VARIANTS.map((v): [string, (s: Session) => unknown] => [`flowchart seed ${v.seed}`, (s) => drawFlowchart(s, v)]),
      ...CLASS_VARIANTS.flatMap((v): [string, (s: Session) => unknown][] => [[`class seed ${v.seed}`, (s) => drawClassDiagram(s, v)], [`A2 seed ${v.seed}`, (s) => drawClassPair(s, v)]]),
      ...SEQUENCE_VARIANTS.map((v): [string, (s: Session) => unknown] => [`sequence ${v.style} seed ${v.seed}`, (s) => drawSequence(s, v)]),
      ...STATE_VARIANTS.map((v): [string, (s: Session) => unknown] => [`state seed ${v.seed}`, (s) => drawState(s, v)]),
      ...ER_VARIANTS.map((v): [string, (s: Session) => unknown] => [`er seed ${v.seed}`, (s) => drawEr(s, v)]),
      ...MINDMAP_VARIANTS.map((v): [string, (s: Session) => unknown] => [`mindmap seed ${v.seed}`, (s) => drawMindMap(s, v)]),
      ...GARMENT_VARIANTS.map((v): [string, (s: Session) => unknown] => [`garment seed ${v.seed}`, (s) => drawGarment(s, v)]),
    ]);
    said('the other notations’ boards', r);
    expect(r.out).toEqual([]);
  }, SLOW);

  it('wireframes, the canonical molecule, lines of writing, a row of boxes and a hub', () => {
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
    const r = above(draws);
    said('wireframes, molecules, writing, rows and hubs', r);
    expect(r.out).toEqual([]);
  }, SLOW);

  it('no writing reads as a wavy line: the corpus’s writing, the shared lines of writing, a printed line, and the names on these boards', () => {
    const waves: string[] = [];
    let n = 0;
    for (const c of [...buildCases(), ...buildTurnedCases()].filter((c) => c.expect === 'text')) {
      n++;
      if (waveOf(c.points)) waves.push(c.label);
    }
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const s = createSession();
      for (const id of drawWriting(s, seed)) {
        n++;
        const w = waveOfNode(s.getState().nodes.get(id)!);
        if (w) waves.push(`drawWriting ${seed} ${id}: ${w.reason}`);
      }
      for (const text of ['hello world', 'the sea and the wind', 'red and white sails', 'now then', 'try this one']) {
        for (const stroke of handPrint(text, 100, 200, { seed }).strokes) {
          n++;
          if (waveOf(stroke)) waves.push(`printed “${text}” seed ${seed}`);
        }
      }
    }
    // The names written on every hand of every board: read as names, never as lines.
    for (const board of FEYNMAN_BOARDS) {
      for (const v of FEYNMAN_VARIANTS) {
        for (const p of PLACES) {
          const s = createSession();
          const e = drawFeynman(s, board as FeynmanBoardName, v, 1000, { k: p.k, at: p.at, named: true });
          const r = readFeynman(s.getState()) as FeynmanReading;
          for (const id of Object.keys(e.words)) {
            n++;
            const node = s.getState().nodes.get(id)!;
            const asLine = r.lines.some((l) => l.ids.includes(id));
            const raw = (getRep(node, 'stroke')!.data as { points: Point[]; scale?: number }).points;
            if (asLine || waveOf(raw)) waves.push(`${board} ×${p.k} seed ${v.seed}: the name ${id} (“${e.words[id]}”)${asLine ? ' read as a line' : ' read as a wave'}`);
          }
        }
      }
    }
    console.log(`  writing read as a wavy line: ${waves.length} of ${n}`);
    expect(waves).toEqual([]);
  }, SLOW);
});

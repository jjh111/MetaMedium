// The class-diagram bench (V1-PLAN §2.3 "every pack has a bench", §9 D4).
//
// A hand-drawn class diagram — jittered strokes, six classes (compartment
// lines drawn as separate strokes, one class ruled in four, one turned, one a
// plain box), two hollow triangles, a filled diamond and a hollow one, an open
// arrow, three multiplicities, writing in every compartment — must read as a
// class diagram, first among the readings, with EVERY class, name, member,
// relation and multiplicity right, drawn every way the variants draw it:
// seeds, a steady and a shaky hand, a class turned up to ten degrees either
// way. A2's pair likewise. The traps, swept on their own: classes turned to
// thirty degrees read in their own frame; small shaky triangles, which heads.ts
// can read first as circles, degrade and say so; a filled diamond hatched
// within the word window is gathered into a word and read apart. And what is
// not a class diagram — the flowchart bench, a UI wireframe, the canonical
// molecule, a line of writing — never reads as one above the floor.
//
// It is a benchmark, so it prints its rates. It is also a test, so it fails
// when one of them drops.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import type { Session } from '../session/session';
import { notationsOf, NOTATION_FLOOR } from './notation';
import { readUmlClass } from './uml-class';
import type { UmlClassReading, UmlRelation } from './uml-class';
import { drawClassDiagram, drawClassPair, triangleHead, CLASS_VARIANTS } from './fixtures/uml-class';
import type { ClassExpected } from './fixtures/uml-class';
import { drawFlowchart, drawWireframe, drawMolecule, drawWriting, FLOWCHART_VARIANTS } from './fixtures/flowchart';
import { handShape, boxCorners } from './fixtures/hand';
import { handLine, handText } from '../test/strokes';
import type { Point } from '../types';

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
  classes: Tally;
  compartments: Tally;
  names: Tally;
  members: Tally;
  relations: Record<string, Tally>;
  multiplicities: Tally;
}
const tallies = (): Tallies => ({ diagrams: tally(), first: tally(), classes: tally(), compartments: tally(), names: tally(), members: tally(), relations: {}, multiplicities: tally() });

/** Score one reading of a board against what was drawn. */
function score(s: Session, r: UmlClassReading | null, e: ClassExpected, label: string, t: Tallies) {
  count(t.diagrams, !!r && r.confidence >= NOTATION_FLOOR, `${label}: ${r ? `read ${r.confidence.toFixed(2)}` : 'no reading'}`);
  count(t.first, notationsOf(s.getState())[0]?.notation === 'uml-class', `${label}: not first — ${notationsOf(s.getState()).map((x) => `${x.notation} ${x.confidence.toFixed(2)}`).join(', ')}`);
  const idOf = new Map<string, string>(); // expected class name → reading id
  for (const [name, want] of Object.entries(e.classes)) {
    const got = r?.symbols.find((c) => sameSet(c.box, want.box));
    if (got) idOf.set(name, got.id);
    count(t.classes, !!got, `${label} ${name}: ${got ? '' : 'not read as a class'}`);
    count(t.compartments, !!got && sameSet(got.lines, want.lines), `${label} ${name}: lines ${got ? got.lines.join(',') : '—'}, wanted ${want.lines.join(',')}`);
    count(t.names, !!got && sameSet(got.name.ids, want.name), `${label} ${name}: name ${got ? got.name.ids.join(',') : '—'}, wanted ${want.name.join(',')}`);
    const members = got ? got.members.filter((m) => m.from === 'writing').map((m) => ({ compartment: m.compartment, ids: m.ids })) : [];
    count(t.members, JSON.stringify(members) === JSON.stringify(want.members), `${label} ${name}: members ${JSON.stringify(members)}, wanted ${JSON.stringify(want.members)}`);
  }
  for (const want of e.relations) {
    const got = r?.connectors.find((c) => c.id === want.id);
    const tt = (t.relations[want.kind] ??= tally());
    const ok = !!got && got.kind === want.kind && got.to === idOf.get(want.to) && got.from === idOf.get(want.from) && sameSet(got.ids, want.ids);
    count(tt, ok, `${label} ${want.name}: ${got ? `${got.kind} ${got.from}→${got.to} [${got.ids.join(',')}] — ${got.reason}` : 'not read'}`);
  }
  for (const want of e.multiplicities) {
    const rel = e.relations.find((x) => x.name === want.of)!;
    const got = r?.connectors.find((c) => c.id === rel.id) as UmlRelation | undefined;
    const end = got && (got.ends.from.symbol === idOf.get(want.at) ? got.ends.from : got.ends.to.symbol === idOf.get(want.at) ? got.ends.to : undefined);
    count(t.multiplicities, !!end?.multiplicity?.ids.includes(want.id), `${label} multiplicity at ${want.at} on “${want.of}”: ${end?.multiplicity ? end.multiplicity.ids.join(',') : 'none there'}`);
  }
}

const lines = (name: string, t: Tallies) => [
  `  ${name}`,
  `    read as a class diagram  ${rate(t.diagrams)}   first among the readings ${rate(t.first)}`,
  `    classes ${rate(t.classes)}   compartment lines ${rate(t.compartments)}   names ${rate(t.names)}   members ${rate(t.members)}`,
  `    relations — ${Object.entries(t.relations).map(([k, v]) => `${k} ${rate(v)}`).join('   ')}`,
  ...(t.multiplicities.n ? [`    multiplicities ${rate(t.multiplicities)}`] : []),
];
const wrongOf = (t: Tallies) => [...t.diagrams.wrong, ...t.first.wrong, ...t.classes.wrong, ...t.compartments.wrong, ...t.names.wrong, ...t.members.wrong, ...Object.values(t.relations).flatMap((x) => x.wrong), ...t.multiplicities.wrong];

describe('the class-diagram bench', () => {
  // The bench board and A2, every hand.
  const board = tallies(), pair = tallies();
  const confidences: number[] = [];
  for (const v of CLASS_VARIANTS) {
    const label = `seed ${v.seed} jitter ${v.jitter} tilt ${v.tilt}`;
    const s = createSession();
    const e = drawClassDiagram(s, v);
    const r = readUmlClass(s.getState());
    if (r) confidences.push(r.confidence);
    score(s, r, e, label, board);
    const p = createSession();
    const ep = drawClassPair(p, v);
    score(p, readUmlClass(p.getState()), ep, `A2 ${label}`, pair);
  }

  // The trap: a class read in its own frame, turned from -30° to 30°.
  const turned = tally();
  for (const seed of [1, 2, 3]) {
    for (const jitter of [1.5, 3]) {
      for (let tilt = -30; tilt <= 30; tilt += 5) {
        const s = createSession();
        const c = { x: 400, y: 300 }, rad = (tilt * Math.PI) / 180;
        const at = (p: Point) => ({ x: c.x + p.x * Math.cos(rad) - p.y * Math.sin(rad), y: c.y + p.x * Math.sin(rad) + p.y * Math.cos(rad) });
        let t = 1000;
        const box = s.addStroke(handShape(boxCorners(c.x, c.y, 220, 160, tilt), { seed: seed * 10 + 1, jitter }), (t += 4000));
        const l1 = s.addStroke(handLine(at({ x: -108, y: -40 }), at({ x: 108, y: -40 }), { seed: seed * 10 + 2, jitter: jitter * 0.6 }), (t += 4000));
        const l2 = s.addStroke(handLine(at({ x: -109, y: 25 }), at({ x: 107, y: 25 }), { seed: seed * 10 + 3, jitter: jitter * 0.6 }), (t += 4000));
        const w = (x: number, y: number, ww: number, n: number) => s.addStroke(handText(x, y, ww, 18, { seed: seed * 10 + n, humps: Math.round(ww / 20), jitter: 1 }).map(at), (t += 4000));
        const name = w(-40, -70, 80, 4), a1 = w(-96, -30, 110, 5), m1 = w(-96, 40, 90, 6);
        const r = readUmlClass(s.getState());
        const got = r?.symbols.find((x) => x.box[0] === box);
        const ok = !!got && sameSet(got.lines, [l1, l2]) && sameSet(got.name.ids, [name]) && JSON.stringify(got.members.map((m) => [m.compartment, m.ids])) === JSON.stringify([[2, [a1]], [3, [m1]]]);
        count(turned, ok, `turned ${tilt}° (seed ${seed}, jitter ${jitter}): ${got ? `lines ${got.lines.length}, turn ${got.turn.toFixed(0)}°, name ${got.name.ids}, members ${JSON.stringify(got.members.map((m) => [m.compartment, m.ids]))}` : 'no class'}`);
      }
    }
  }

  // The trap: small, shaky hollow triangles — heads.ts reads some first as circles. The relation degrades: the
  // first head a class relation has, less surely, and says so; never a triangle silently lost.
  const small = { inheritance: 0, degraded: 0, link: 0, other: 0, n: 0, said: 0, none: 0 };
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    for (const len of [8, 10, 12, 14, 16]) {
      for (const jitter of [1.5, 2.5, 3.5]) {
        const s = createSession();
        let t = 1000;
        s.addStroke(handShape(boxCorners(300, 120, 200, 150), { seed: seed * 7 + 1 }), (t += 4000));
        s.addStroke(handLine({ x: 202, y: 90 }, { x: 398, y: 90 }, { seed: seed * 7 + 2, jitter: 1 }), (t += 4000));
        s.addStroke(handShape(boxCorners(300, 420, 200, 120), { seed: seed * 7 + 3 }), (t += 4000));
        s.addStroke(handLine({ x: 202, y: 395 }, { x: 398, y: 395 }, { seed: seed * 7 + 4, jitter: 1 }), (t += 4000));
        const line = s.addStroke(handLine({ x: 300, y: 358 }, { x: 300, y: 197 + len }, { seed: seed * 7 + 5, jitter: 1.2 }), (t += 4000));
        s.addStroke(triangleHead({ x: 300, y: 196 }, { x: 0, y: -1 }, len, { seed: seed * 7 + 6, jitter }), (t += 4000));
        const r = readUmlClass(s.getState());
        const rel = r?.connectors.find((c) => c.id === line);
        small.n++;
        if (!rel) small.none++;
        else if (rel.kind === 'inheritance' && /less surely/.test(rel.reason)) small.degraded++;
        else if (rel.kind === 'inheritance') small.inheritance++;
        else if (rel.kind === 'link') small.link++;
        else small.other++;
        // Whatever it reads as first, the triangle is among its readings, or its reason says what sits at the end.
        if (rel && (rel.kind === 'inheritance' || rel.readings.some((x) => x.kind === 'inheritance') || /which no class relation has|reads as no head/.test(rel.reason))) small.said++;
      }
    }
  }

  // The trap: a filled diamond hatched within the word window — the letter rules gather outline and hatch into a word.
  const quick = tally();
  for (const v of CLASS_VARIANTS.slice(0, 12)) {
    const s = createSession();
    const e = drawClassDiagram(s, { ...v, fillAfter: 800 });
    const gathered = [...s.getState().nodes.keys()].some((k) => k.startsWith('word'));
    const got = readUmlClass(s.getState())?.connectors.find((c) => c.id === e.relations[2].id);
    count(quick, gathered && got?.kind === 'composition', `seed ${v.seed}: ${gathered ? 'gathered into a word' : 'not gathered'}, read ${got ? got.kind : 'nothing'}`);
  }

  // What is not a class diagram.
  const negatives: Record<string, { n: number; above: string[]; highest: number }> = {};
  const against = (name: string, boards: ((s: Session) => unknown)[]) => {
    const n = (negatives[name] = { n: 0, above: [] as string[], highest: 0 });
    boards.forEach((draw, i) => {
      const s = createSession();
      draw(s);
      const r = readUmlClass(s.getState());
      n.n++;
      n.highest = Math.max(n.highest, r?.confidence ?? 0);
      if (r && r.confidence >= NOTATION_FLOOR) n.above.push(`board ${i}: ${r.confidence.toFixed(2)} — ${r.summary}`);
    });
  };
  against('the flowchart bench', FLOWCHART_VARIANTS.map((v) => (s: Session) => drawFlowchart(s, v)));
  against('UI wireframe', [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => (s: Session) => drawWireframe(s, seed)));
  against('canonical molecule', [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => (s: Session) => drawMolecule(s, seed)));
  against('line of writing', [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => (s: Session) => drawWriting(s, seed)));

  it('reports its rates', () => {
    const out = [
      `\n  class-diagram bench — ${CLASS_VARIANTS.length} hands of each board, floor ${NOTATION_FLOOR}; the board read ${Math.min(...confidences).toFixed(2)}–${Math.max(...confidences).toFixed(2)}`,
      ...lines('the bench board: six classes, five relations, three multiplicities', board),
      ...lines('A2: two classes, one inheritance', pair),
      `  the trap: classes turned −30° to 30° read in their own frame   ${rate(turned)}`,
      `  small shaky triangles (8–16 px): ${small.n} — inheritance ${small.inheritance}, inheritance less surely (read first as a circle) ${small.degraded}, a plain link ${small.link}, another kind first ${small.other}, no relation ${small.none}; the triangle among the readings or what sits there said ${small.said}/${small.n}`,
      `  a filled diamond hatched within the word window: gathered and still a composition ${rate(quick)}`,
      ...Object.entries(negatives).map(([name, n]) => `  ${name.padEnd(22)} above the floor ${n.above.length}/${n.n}   highest ${n.highest.toFixed(2)}`),
    ];
    const wrong = [...wrongOf(board), ...wrongOf(pair), ...turned.wrong, ...quick.wrong].slice(0, 12);
    if (wrong.length) out.push('  wrong:', ...wrong.map((w) => `    ${w}`));
    console.log(out.join('\n'));
    expect(CLASS_VARIANTS.length).toBeGreaterThanOrEqual(36);
  });

  it('every hand-drawn class diagram reads as one, above the floor and first among the readings', () => {
    for (const t of [board, pair]) {
      expect(t.diagrams.wrong).toEqual([]);
      expect(t.first.wrong).toEqual([]);
    }
  });

  it('every class right — its box, its compartment lines, its name and its members', () => {
    for (const t of [board, pair]) {
      expect(t.classes.wrong).toEqual([]);
      expect(t.compartments.wrong).toEqual([]);
      expect(t.names.wrong).toEqual([]);
      expect(t.members.wrong).toEqual([]);
    }
  });

  it('every relation right — its kind from its heads, its ends past them — and every multiplicity at its end', () => {
    for (const t of [board, pair]) for (const [kind, x] of Object.entries(t.relations)) expect(x.wrong, kind).toEqual([]);
    expect(Object.keys(board.relations).sort()).toEqual(['aggregation', 'association', 'composition', 'inheritance']);
    expect(board.multiplicities.wrong).toEqual([]);
  });

  it('the trap: a turned class is read in its own frame', () => {
    expect(turned.wrong).toEqual([]);
  });

  it('the trap: a small shaky triangle degrades and says so — never silently another relation', () => {
    expect(small.none).toBe(0);
    expect(small.said).toBe(small.n);
    expect(small.inheritance + small.degraded).toBeGreaterThanOrEqual(0.85 * small.n);
  });

  it('the trap: a filled diamond gathered into a word by the letter rules is read apart, still a composition', () => {
    expect(quick.wrong).toEqual([]);
  });

  it('the flowchart bench, a UI wireframe, the canonical molecule and a line of writing never read as a class diagram above the floor', () => {
    for (const [name, n] of Object.entries(negatives)) expect(n.above, name).toEqual([]);
  });
});

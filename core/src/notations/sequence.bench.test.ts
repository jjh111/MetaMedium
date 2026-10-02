// The sequence-diagram bench (V1-PLAN §2.3 "every pack has a bench", §9 D5).
//
// A hand-drawn sequence diagram — jittered strokes, three participants (boxes
// over solid lifelines, boxes over dashed ones, or a stick figure), four
// messages (a call, a self-message whose barb folds back where it arrives, a
// call, and a dashed return with a chevron at the far end that crosses the
// middle lifeline on the way), a label written above each — must read as a
// sequence diagram, first among the readings, with EVERY participant,
// lifeline, name, message, message order and label right, drawn every way
// the variants draw it: seeds, a steady and a shaky hand, the page turned a
// few degrees, the return's chevron drawn right after its last dash (the
// letter rules gather them into a word) or seconds after. The traps, swept on
// their own: messages crossing one and two lifelines on the way, solid and
// dashed, either way — each ends where its ends land; the page turned to
// eight degrees either way; a self-message whose head is drawn apart; a
// lifeline drawn in two goes (the pen lifted, a longer gap among the dashes),
// read as one lifeline in pieces. And what is not a sequence diagram — the flowchart bench, the class
// bench, a UI wireframe, the canonical molecule, a line of writing — never
// reads as one above the floor.
//
// It is a benchmark, so it prints its rates. It is also a test, so it fails
// when one of them drops.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import type { Session } from '../session/session';
import { notationsOf, NOTATION_FLOOR } from './notation';
import { readSequence } from './sequence';
import type { SequenceReading } from './sequence';
import { drawSequence, dashesAlong, chevron, handPath, SEQUENCE_VARIANTS } from './fixtures/sequence';
import type { SequenceExpected } from './fixtures/sequence';
import { drawFlowchart, drawWireframe, drawMolecule, drawWriting, FLOWCHART_VARIANTS } from './fixtures/flowchart';
import { drawClassDiagram, drawClassPair, CLASS_VARIANTS } from './fixtures/uml-class';
import { handShape, boxCorners } from './fixtures/hand';
import { handArrow, handLine } from '../test/strokes';

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
  participants: Tally;
  lifelines: Tally;
  names: Tally;
  messages: Record<string, Tally>;
  order: Tally;
  labels: Tally;
}
const tallies = (): Tallies => ({ diagrams: tally(), first: tally(), participants: tally(), lifelines: tally(), names: tally(), messages: {}, order: tally(), labels: tally() });

/** Score one reading of the board against what was drawn. */
function score(s: Session, r: SequenceReading | null, e: SequenceExpected, label: string, t: Tallies) {
  count(t.diagrams, !!r && r.confidence >= NOTATION_FLOOR, `${label}: ${r ? `read ${r.confidence.toFixed(2)}` : 'no reading'}`);
  const all = notationsOf(s.getState());
  count(t.first, all[0]?.notation === 'sequence', `${label}: not first — ${all.map((x) => `${x.notation} ${x.confidence.toFixed(2)}`).join(', ')}`);
  const idOf = new Map<string, string>();
  for (const [name, want] of Object.entries(e.participants)) {
    const got = r?.symbols.find((p) => p.figure.includes(want.figure[0]));
    if (got) idOf.set(name, got.id);
    count(t.participants, !!got && got.symbol === want.symbol && sameSet(got.figure, want.figure), `${label} ${name}: ${got ? `${got.symbol} [${got.figure}]` : 'not read'}`);
    count(t.lifelines, !!got && sameSet(got.lifeline, want.lifeline), `${label} ${name}: lifeline ${got ? got.lifeline.length : '—'} of ${want.lifeline.length}`);
    count(t.names, !!got && sameSet(got.name.ids, want.name), `${label} ${name}: name ${got ? got.name.ids.join(',') : '—'}, wanted ${want.name.join(',')}`);
  }
  e.messages.forEach((want, k) => {
    const got = r?.connectors.find((m) => want.ids.some((id) => m.ids.includes(id)));
    const tt = (t.messages[want.kind] ??= tally());
    const ok = !!got && got.kind === want.kind && got.from === idOf.get(want.from) && got.to === idOf.get(want.to) && sameSet(got.ids, want.ids);
    count(tt, ok, `${label} ${want.name}: ${got ? `${got.kind} ${got.from}→${got.to} (${got.ids.length} marks of ${want.ids.length}) — ${got.reason}` : 'not read'}`);
    count(t.order, !!got && got.order === k + 1, `${label} ${want.name}: order ${got?.order ?? '—'}, wanted ${k + 1}`);
    count(t.labels, !!got && sameSet(got.labels, want.label), `${label} ${want.name}: label ${got ? got.labels.join(',') : '—'}, wanted ${want.label.join(',')}`);
  });
}

const lines = (name: string, t: Tallies) => [
  `  ${name}`,
  `    read as a sequence diagram ${rate(t.diagrams)}   first among the readings ${rate(t.first)}`,
  `    participants ${rate(t.participants)}   lifelines ${rate(t.lifelines)}   names ${rate(t.names)}`,
  `    messages — ${Object.entries(t.messages).map(([k, v]) => `${k} ${rate(v)}`).join('   ')}   in order ${rate(t.order)}   labels ${rate(t.labels)}`,
];
const wrongOf = (t: Tallies) => [...t.diagrams.wrong, ...t.first.wrong, ...t.participants.wrong, ...t.lifelines.wrong, ...t.names.wrong, ...Object.values(t.messages).flatMap((x) => x.wrong), ...t.order.wrong, ...t.labels.wrong];

/** Two or more participants in a row, each a box over a lifeline — one stroke or dashed — at the given x's. */
function row(s: Session, xs: number[], o: { dashed?: boolean; t0?: number; seed?: number; top?: number; bottom?: number } = {}) {
  let t = o.t0 ?? 1000;
  const seed = o.seed ?? 1, top = o.top ?? 40, bottom = o.bottom ?? 520;
  const boxes = xs.map((x, i) => s.addStroke(handShape(boxCorners(x, top + 28, 130, 56), { seed: seed * 10 + i }), (t += 4000)));
  const lifelines = xs.map((x, i) =>
    o.dashed
      ? dashesAlong({ x, y: top + 60 }, { x, y: bottom }, { seed: seed * 20 + i }).map((pts, k) => s.addStroke(pts, (t += k ? 200 : 4000)))
      : [s.addStroke(handLine({ x, y: top + 59 }, { x: x + 1, y: bottom }, { seed: seed * 20 + i, jitter: 1 }), (t += 4000))]
  );
  return { boxes, lifelines, at: () => t, tick: (gap = 4000) => (t += gap) };
}

describe('the sequence-diagram bench', () => {
  // The board, every hand.
  const board = tallies();
  const confidences: number[] = [];
  for (const v of SEQUENCE_VARIANTS) {
    const label = `${v.style} seed ${v.seed} jitter ${v.jitter} tilt ${v.tilt} chevron ${v.headAfter} ms`;
    const s = createSession();
    const e = drawSequence(s, v);
    const r = readSequence(s.getState());
    if (r) confidences.push(r.confidence);
    score(s, r, e, label, board);
  }

  // The trap: a message crossing one and two lifelines on the way — solid and dashed, either way — ends where its ends land.
  const crossing = tally();
  for (const seed of [1, 2, 3]) {
    for (const dashedLifelines of [false, true]) {
      for (const dashed of [false, true]) {
        for (const [a, b] of [[0, 2], [2, 0], [0, 3], [3, 0], [1, 3], [3, 1]]) {
          const s = createSession();
          const xs = [150, 400, 650, 900];
          const g = row(s, xs, { dashed: dashedLifelines, seed });
          const y = 260 + seed * 7;
          const dir = Math.sign(xs[b] - xs[a]);
          let ids: string[];
          if (!dashed) ids = [s.addStroke(handArrow({ x: xs[a] + dir * 3, y }, { x: xs[b] - dir * 4, y: y + 2 }, { wings: 2, headLen: 14, seed: seed + a * 7 + b, jitter: 1 }), g.tick())];
          else {
            ids = dashesAlong({ x: xs[a] + dir * 4, y }, { x: xs[b] - dir * 22, y }, { seed: seed * 3 + a + b, dash: 14, gap: 9 }).map((pts, k) => s.addStroke(pts, g.tick(k ? 200 : 4000)));
            ids.push(s.addStroke(chevron({ x: xs[b] - dir * 4, y }, { x: dir, y: 0 }, 15, { seed }), g.tick(300)));
          }
          // And a call between the first two, so there is a diagram whatever the crossing does.
          s.addStroke(handArrow({ x: xs[0] + 3, y: 160 }, { x: xs[1] - 4, y: 160 }, { wings: 2, headLen: 14, seed: 99, jitter: 1 }), g.tick());
          const r = readSequence(s.getState());
          const want = { from: g.boxes[a], to: g.boxes[b] };
          const got = r?.connectors.find((m) => ids.some((id) => m.ids.includes(id)));
          count(crossing, !!got && got.from === want.from && got.to === want.to && got.kind === (dashed ? 'return' : 'call') && sameSet(got.ids, ids), `${dashed ? 'dashed' : 'solid'} ${a}→${b} over ${dashedLifelines ? 'dashed' : 'solid'} lifelines, seed ${seed}: ${got ? `${got.kind} ${got.from}→${got.to} (${got.ids.length} of ${ids.length})` : 'not read'}`);
        }
      }
    }
  }

  // The trap: the page turned to eight degrees either way.
  const turned = tally();
  for (const tilt of [-8, -6, -4, 4, 6, 8]) {
    for (const v of [SEQUENCE_VARIANTS[0], SEQUENCE_VARIANTS[13], SEQUENCE_VARIANTS[26]]) {
      const s = createSession();
      const e = drawSequence(s, { ...v, tilt });
      const r = readSequence(s.getState());
      const t = tallies();
      score(s, r, e, '', t);
      const ok = !wrongOf(t).length;
      count(turned, ok, `${v.style} turned ${tilt}°: ${wrongOf(t).slice(0, 2).join('; ')}`);
    }
  }

  // The trap: a self-message whose head is drawn apart — the loop, then a chevron where it comes back.
  const apart = tally();
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const s = createSession();
    const g = row(s, [150, 450], { seed });
    const lx = 450;
    const loop = s.addStroke(handPath([{ x: lx + 4, y: 200 }, { x: lx + 64, y: 200 }, { x: lx + 64, y: 240 }, { x: lx + 4, y: 240 }], { seed, jitter: 1, density: 0.5 }), g.tick());
    const head = s.addStroke(chevron({ x: lx + 4, y: 240 }, { x: -1, y: 0 }, 12, { seed }), g.tick(600));
    s.addStroke(handArrow({ x: 153, y: 320 }, { x: 446, y: 321 }, { wings: 2, headLen: 14, seed, jitter: 1 }), g.tick());
    const r = readSequence(s.getState());
    const got = r?.connectors.find((m) => m.ids.includes(loop));
    count(apart, !!got && got.kind === 'self' && got.directed && got.ids.includes(head), `seed ${seed}: ${got ? `${got.kind} ${got.arrow} [${got.ids}] — ${got.reason}` : 'not read'}`);
  }

  // The trap: a lifeline drawn in two goes — the pen lifted halfway, or a longer gap left among the dashes — is one lifeline, in pieces.
  const pieces = tally();
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    for (const dashed of [false, true]) {
      const s = createSession();
      let t = 1000;
      const xs = [150, 450, 750];
      const boxes = xs.map((x, i) => s.addStroke(handShape(boxCorners(x, 68, 130, 56), { seed: seed * 10 + i }), (t += 4000)));
      const drawn: string[][] = xs.map((x, i) => {
        // The middle lifeline breaks off at 290 and goes on from 320.
        const parts = i === 1 ? [[100, 290], [320, 520]] : [[100, 520]];
        return parts.flatMap(([a, b]) =>
          dashed ? dashesAlong({ x, y: a }, { x, y: b }, { seed: seed * 20 + i + a }).map((pts, k) => s.addStroke(pts, (t += k ? 200 : 4000))) : [s.addStroke(handLine({ x, y: a }, { x: x + 1, y: b }, { seed: seed * 20 + i + a, jitter: 1 }), (t += 4000))]
        );
      });
      const low = s.addStroke(handArrow({ x: 746, y: 420 }, { x: 454, y: 421 }, { wings: 2, headLen: 14, seed, jitter: 1 }), (t += 4000));
      s.addStroke(handArrow({ x: 153, y: 180 }, { x: 446, y: 181 }, { wings: 2, headLen: 14, seed, jitter: 1 }), (t += 4000));
      const r = readSequence(s.getState());
      const mid = r?.symbols.find((p) => p.id === boxes[1]);
      const msg = r?.connectors.find((m) => m.ids.includes(low));
      count(pieces, !!mid && sameSet(mid.lifeline, drawn[1]) && !!msg && msg.to === boxes[1] && msg.from === boxes[2], `${dashed ? 'dashed' : 'solid'} seed ${seed}: ${mid ? `lifeline ${mid.lifeline.length} of ${drawn[1].length} marks, to ${Math.round(mid.bottom.y)}` : 'no participant'}; ${msg ? `${msg.kind} ${msg.from}→${msg.to}` : 'the message below the break not read'}`);
    }
  }

  // What is not a sequence diagram.
  const negatives: Record<string, { n: number; above: string[]; highest: number }> = {};
  const against = (name: string, boards: ((s: Session) => unknown)[]) => {
    const n = (negatives[name] = { n: 0, above: [] as string[], highest: 0 });
    boards.forEach((draw, i) => {
      const s = createSession();
      draw(s);
      const r = readSequence(s.getState());
      n.n++;
      n.highest = Math.max(n.highest, r?.confidence ?? 0);
      if (r && r.confidence >= NOTATION_FLOOR) n.above.push(`board ${i}: ${r.confidence.toFixed(2)} — ${r.summary}`);
    });
  };
  against('the flowchart bench', FLOWCHART_VARIANTS.map((v) => (s: Session) => drawFlowchart(s, v)));
  against('the class bench', CLASS_VARIANTS.flatMap((v) => [(s: Session) => drawClassDiagram(s, v), (s: Session) => drawClassPair(s, v)]));
  against('UI wireframe', [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => (s: Session) => drawWireframe(s, seed)));
  against('canonical molecule', [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => (s: Session) => drawMolecule(s, seed)));
  against('line of writing', [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => (s: Session) => drawWriting(s, seed)));

  it('reports its rates', () => {
    const out = [
      `\n  sequence-diagram bench — ${SEQUENCE_VARIANTS.length} hands, floor ${NOTATION_FLOOR}; the board read ${Math.min(...confidences).toFixed(2)}–${Math.max(...confidences).toFixed(2)}`,
      ...lines('the board: three participants, four messages (two calls, a self-message, a dashed return across a lifeline)', board),
      `  the trap: a message crossing one or two lifelines, solid and dashed, either way, over solid and dashed lifelines   ${rate(crossing)}`,
      `  the page turned −8° to 8°   ${rate(turned)}`,
      `  a self-message whose head is drawn apart   ${rate(apart)}`,
      `  a lifeline drawn in two goes — one stroke or dashes — read as one, in pieces   ${rate(pieces)}`,
      ...Object.entries(negatives).map(([name, n]) => `  ${name.padEnd(22)} above the floor ${n.above.length}/${n.n}   highest ${n.highest.toFixed(2)}`),
    ];
    const wrong = [...wrongOf(board), ...crossing.wrong, ...turned.wrong, ...apart.wrong, ...pieces.wrong].slice(0, 12);
    if (wrong.length) out.push('  wrong:', ...wrong.map((w) => `    ${w}`));
    console.log(out.join('\n'));
    expect(SEQUENCE_VARIANTS.length).toBeGreaterThanOrEqual(36);
  });

  it('every hand-drawn board reads as a sequence diagram, above the floor and first among the readings', () => {
    expect(board.diagrams.wrong).toEqual([]);
    expect(board.first.wrong).toEqual([]);
  });

  it('every participant right — its box or figure, its lifeline, its name', () => {
    expect(board.participants.wrong).toEqual([]);
    expect(board.lifelines.wrong).toEqual([]);
    expect(board.names.wrong).toEqual([]);
  });

  it('every message right — its kind, from and to, its marks — in order down the page, each with its label', () => {
    for (const [kind, x] of Object.entries(board.messages)) expect(x.wrong, kind).toEqual([]);
    expect(Object.keys(board.messages).sort()).toEqual(['call', 'return', 'self']);
    expect(board.order.wrong).toEqual([]);
    expect(board.labels.wrong).toEqual([]);
  });

  it('the trap: a message crossing lifelines on its way ends where its ends land', () => {
    expect(crossing.wrong).toEqual([]);
  });

  it('the page turned to eight degrees either way still reads', () => {
    expect(turned.wrong).toEqual([]);
  });

  it('a self-message’s head drawn apart is its head', () => {
    expect(apart.wrong).toEqual([]);
  });

  it('a lifeline drawn in two goes is one lifeline in pieces, and a message below the break lands on it', () => {
    expect(pieces.wrong).toEqual([]);
  });

  it('the flowchart bench, the class bench, a UI wireframe, the canonical molecule and a line of writing never read as a sequence diagram above the floor', () => {
    for (const [name, n] of Object.entries(negatives)) expect(n.above, name).toEqual([]);
  });
});


// A connector is not a letter, and halves are not letters (V1-PLAN §9 W1,
// findings 2 and 3).
//
// The letter rules gather small strokes written in quick succession, side by
// side on a band, into a word (words.ts, `absorbIntoWord` in session.ts). A
// short vertical line is exactly what an l looks like — so a flowchart's flow
// with "yes" written beside it, or a class relation with "1" and "*" at its
// ends, was gathered into the word and the connection was lost (found by D4:
// 3 of 6). And bounds cannot tell `< >` from `( )`: a diamond drawn as its
// left and right halves, quickly, was gathered as a word (found by D1).
//
// The trap: a tall l beside a word is also a short vertical line. So the rules
// read the stroke's own geometry and its neighbours' — what its ends meet,
// how long it is against the writing's own x-height, whether two strokes'
// ends close a figure — never who drew it or how fast.

import { describe, it, expect } from 'vitest';
import type { Point } from '../types';
import { createSession, type Session } from './session';
import { getRep, isWord, lettersOf } from './nodes';
import { magnetSites } from './magnets';
import { figuresOf } from '../diagram/figures';
import { handArrow, handLine, handText, handPrint, lineStroke } from '../test/strokes';
import { handShape, boxCorners, diamondCorners, diamondLeftRight, bent } from '../notations/fixtures/hand';

const wordsOf = (s: Session) => {
  const st = s.getState();
  return st.contentIds.filter((id) => isWord(st.nodes.get(id)!)).map((id) => lettersOf(st.nodes.get(id)!));
};
const inAWord = (s: Session, id: string) => wordsOf(s).some((w) => w.includes(id));
const sameSet = (a: readonly string[], b: readonly string[]) => [...a].sort().join('|') === [...b].sort().join('|');
const roleOf = (s: Session, ids: string[], id: string) => s.read(ids).roles.find((r) => r.id === id)?.role;

/** Strokes written one after another, `gap` ms apart. */
function write(s: Session, strokes: Point[][], t0: number, gap = 350): { ids: string[]; t: number } {
  const ids: string[] = [];
  let t = t0;
  for (const pts of strokes) {
    ids.push(s.addStroke(pts, t));
    t += gap;
  }
  return { ids, t };
}

/** The point of some ink nearest `p`. */
const nearestOf = (ink: Point[], p: Point) => ink.reduce((a, b) => (Math.hypot(b.x - p.x, b.y - p.y) < Math.hypot(a.x - p.x, a.y - p.y) ? b : a));

/** The site of a mark nearest a point: where the pen's magnet holds an end. */
function siteNear(s: Session, id: string, p: Point) {
  return magnetSites(s.getState().nodes.get(id)!, s.getState().nodes).sort((a, b) => Math.hypot(a.point.x - p.x, a.point.y - p.y) - Math.hypot(b.point.x - p.x, b.point.y - p.y))[0];
}

// ===== A flow with "yes" beside it =====

/** A decision above, a process below, a vertical flow between them touching both, and "yes" printed beside the flow. */
function flowWithYes(o: { order: 'flow first' | 'yes first'; kind: 'line' | 'arrow'; seed: number; bound?: boolean; xHeight?: number }) {
  const s = createSession();
  const qInk = handShape(diamondCorners(400, 200, 160, 100), { seed: o.seed });
  const pInk = handShape(boxCorners(400, 400, 160, 70), { seed: o.seed + 5 });
  const Q = s.addStroke(qInk, 1000);
  const P = s.addStroke(pInk, 2000);
  // The flow leaves the decision's bottom vertex and lands on the process's top edge: both ends ON the ink.
  const top = nearestOf(qInk, { x: 400, y: 252 });
  const bottom = nearestOf(pInk, { x: 400, y: 364 });
  // A plain flow ends ON the box; an arrow's tip stops two pixels short of it (a head landing on an outline is W1's first rule, tested apart).
  const pts = o.kind === 'line'
    ? handLine(top, bottom, { seed: o.seed, jitter: 1 })
    : handArrow(top, { x: bottom.x, y: bottom.y - 2 }, { wings: 2, headLen: 14, seed: o.seed, jitter: 1 });
  const yes = handPrint('yes', 412, 322, { xHeight: o.xHeight ?? 20, seed: o.seed, jitter: 1 });
  let t = 6000;
  let flow: string;
  let letters: string[];
  const drawFlow = (at: number) => {
    const id = s.addStroke(pts, at);
    if (o.bound) {
      s.bind({ strokeId: id, nodeId: Q, site: { kind: siteNear(s, Q, top).kind, index: siteNear(s, Q, top).index }, end: 'start', at: at + 1 });
      s.bind({ strokeId: id, nodeId: P, site: { kind: siteNear(s, P, bottom).kind, index: siteNear(s, P, bottom).index }, end: 'end', at: at + 2 });
    }
    return id;
  };
  if (o.order === 'flow first') {
    flow = drawFlow(t);
    letters = write(s, yes.strokes, t + 400).ids;
  } else {
    const w = write(s, yes.strokes, t);
    letters = w.ids;
    flow = drawFlow(w.t);
  }
  return { s, Q, P, flow, letters };
}

describe('a connector is not a letter: a flow with "yes" beside it', () => {
  for (const order of ['flow first', 'yes first'] as const) {
    for (const kind of ['line', 'arrow'] as const) {
      for (const bound of [false, true]) {
        it(`${order}, the flow ${kind === 'line' ? 'a line' : 'an arrow'}${bound ? ', bound at both ends by the magnet' : ''}: the flow is still a flow and "yes" still a word`, () => {
          const wrong: string[] = [];
          for (const seed of [1, 2, 3]) {
            const { s, Q, P, flow, letters } = flowWithYes({ order, kind, seed, bound });
            if (inAWord(s, flow)) wrong.push(`seed ${seed}: the flow was gathered into a word`);
            else if (roleOf(s, [Q, P, flow], flow) !== 'edge') wrong.push(`seed ${seed}: the flow plays ${roleOf(s, [Q, P, flow], flow)}`);
            const ws = wordsOf(s);
            if (ws.length !== 1 || !sameSet(ws[0], letters)) wrong.push(`seed ${seed}: the words are ${JSON.stringify(ws.map((w) => w.map((id) => (id === flow ? 'flow' : letters.indexOf(id)))))}`);
          }
          expect(wrong).toEqual([]);
        });
      }
    }
  }

  it('a flow that meets nothing yet, long against the x-height of the writing beside it, is not a letter either', () => {
    const wrong: string[] = [];
    for (const order of ['flow first', 'yes first'] as const) {
      for (const seed of [1, 2, 3]) {
        const s = createSession();
        const pts = handLine({ x: 400, y: 260 }, { x: 400, y: 360 }, { seed, jitter: 1 });
        const yes = handPrint('yes', 412, 322, { xHeight: 18, seed, jitter: 1 });
        let flow: string, letters: string[];
        if (order === 'flow first') {
          flow = s.addStroke(pts, 6000);
          letters = write(s, yes.strokes, 6400).ids;
        } else {
          const w = write(s, yes.strokes, 6000);
          letters = w.ids;
          flow = s.addStroke(pts, w.t);
        }
        const ws = wordsOf(s);
        if (inAWord(s, flow) || ws.length !== 1 || !sameSet(ws[0], letters)) wrong.push(`${order} seed ${seed}: ${JSON.stringify(ws.map((w) => w.map((id) => (id === flow ? 'flow' : letters.indexOf(id)))))}`);
      }
    }
    expect(wrong).toEqual([]);
  });
});

// ===== A class relation with its multiplicities =====

describe('a connector is not a letter: a class relation with "1" and "*" at its ends', () => {
  for (const order of ['relation first', 'multiplicities first'] as const) {
    it(`${order}: the relation is still a relation, and each multiplicity is writing of its own`, () => {
      const wrong: string[] = [];
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        const s = createSession();
        // Two classes, each a box with a compartment line across it, 80 px apart; the relation between them touches both.
        const A = s.addStroke(handShape(boxCorners(400, 150, 200, 120), { seed }), 1000);
        s.addStroke(handLine({ x: 302, y: 125 }, { x: 498, y: 126 }, { seed: seed + 1, jitter: 1 }), 1500);
        const B = s.addStroke(handShape(boxCorners(400, 350, 200, 120), { seed: seed + 3 }), 2000);
        s.addStroke(handLine({ x: 302, y: 325 }, { x: 498, y: 326 }, { seed: seed + 4, jitter: 1 }), 2500);
        const relPts = handLine({ x: 400, y: 211 }, { x: 400, y: 289 }, { seed, jitter: 1 });
        // "1" below A and "*" above B, beside the line: short writing, as D4's bench writes a multiplicity.
        const onePts = handText(408, 214, 12, 26, { seed: seed + 10, humps: 2, jitter: 1 });
        const manyPts = handText(408, 260, 14, 26, { seed: seed + 11, humps: 2, jitter: 1 });
        let rel: string, one: string, many: string;
        if (order === 'relation first') {
          rel = s.addStroke(relPts, 6000);
          one = s.addStroke(onePts, 6400);
          many = s.addStroke(manyPts, 6800);
        } else {
          one = s.addStroke(onePts, 6000);
          many = s.addStroke(manyPts, 6400);
          rel = s.addStroke(relPts, 6800);
        }
        if (inAWord(s, rel)) wrong.push(`seed ${seed}: the relation was gathered into a word`);
        else if (roleOf(s, [A, B, rel], rel) !== 'edge') wrong.push(`seed ${seed}: the relation plays ${roleOf(s, [A, B, rel], rel)}`);
        if (wordsOf(s).some((w) => w.includes(one) && w.includes(many))) wrong.push(`seed ${seed}: "1" and "*" were gathered as one word across the relation`);
      }
      expect(wrong).toEqual([]);
    });
  }
});

// ===== Halves are not letters =====

describe('halves are not letters: two strokes whose ends meet, closing a figure, are a figure', () => {
  it('a diamond drawn as its left and right halves in quick succession is one diamond, not a word — at three sizes', () => {
    const wrong: string[] = [];
    for (const [w, h] of [[160, 100], [80, 60], [60, 60]]) {
      for (const seed of [1, 2, 3]) {
        for (const gap of [400, 800]) {
          const s = createSession();
          const [left, right] = diamondLeftRight(diamondCorners(400, 300, w, h), { seed, jitter: 1 });
          const a = s.addStroke(left, 1000), b = s.addStroke(right, 1000 + gap);
          const figure = figuresOf(s.getState()).find((f) => sameSet(f.ids, [a, b]));
          if (wordsOf(s).length) wrong.push(`${w}×${h} seed ${seed} ${gap} ms: gathered as a word`);
          if (figure?.shape !== 'diamond') wrong.push(`${w}×${h} seed ${seed} ${gap} ms: the figure read is ${figure?.shape ?? 'none'}`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  it('a small triangle drawn as a bent stroke and its base, quickly, is one triangle, not a word', () => {
    const wrong: string[] = [];
    for (const size of [40, 60]) {
      for (const seed of [1, 2, 3]) {
        const s = createSession();
        const A = { x: 400 - size / 2, y: 300 }, T = { x: 400, y: 300 - size * 0.9 }, B = { x: 400 + size / 2, y: 300 };
        const a = s.addStroke(bent(A, T, B, { seed, jitter: 1 }), 1000);
        const b = s.addStroke(handLine(B, A, { seed: seed + 3, jitter: 1 }), 1500);
        const figure = figuresOf(s.getState()).find((f) => sameSet(f.ids, [a, b]));
        if (wordsOf(s).length) wrong.push(`${size} seed ${seed}: gathered as a word`);
        if (figure?.shape !== 'triangle') wrong.push(`${size} seed ${seed}: the figure read is ${figure?.shape ?? 'none'}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('writing just before the halves keeps its word, and the halves stay a figure', () => {
    const s = createSession();
    const no = handPrint('no', 250, 320, { xHeight: 34, seed: 2, jitter: 1 });
    const letters = write(s, no.strokes, 1000).ids;
    const [left, right] = diamondLeftRight(diamondCorners(360, 300, 70, 60), { seed: 4, jitter: 1 });
    const a = s.addStroke(left, 2000), b = s.addStroke(right, 2400);
    const ws = wordsOf(s);
    expect(ws.map((w) => w.length)).toEqual([2]);
    expect(sameSet(ws[0], letters)).toBe(true);
    expect(inAWord(s, a) || inAWord(s, b)).toBe(false);
    expect(figuresOf(s.getState()).some((f) => sameSet(f.ids, [a, b]))).toBe(true);
  });
});

// ===== The controls: writing a real hand prints still gathers =====

describe('the control: what a real hand prints still gathers into its words', () => {
  it('"hello world" in John\'s proportions — x-height 31 to 40, ascenders 2.3 x-heights — is two words holding every stroke', () => {
    const wrong: string[] = [];
    for (const xh of [31, 34, 40]) {
      for (const seed of [1, 2, 3]) {
        const s = createSession();
        const hello = handPrint('hello', 100, 300, { xHeight: xh, seed });
        const world = handPrint('world', hello.end + 70, 300, { xHeight: xh, seed });
        const a = write(s, hello.strokes, 1000);
        const b = write(s, world.strokes, a.t + 400);
        const ws = wordsOf(s);
        if (ws.length !== 2 || !sameSet(ws[0], a.ids) || !sameSet(ws[1], b.ids)) wrong.push(`x-height ${xh} seed ${seed}: ${ws.map((w) => w.length).join(' + ')} letters`);
        if (s.getState().contentIds.length !== 2) wrong.push(`x-height ${xh} seed ${seed}: ${s.getState().contentIds.length} marks on the board`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('the trap: an l is a short vertical line — "hello" written inside a box, sitting on a box, and under a class\'s compartment line, its ascenders within a magnet\'s reach, is still one word', () => {
    const wrong: string[] = [];
    for (const seed of [1, 2, 3]) {
      for (const where of ['inside a box', 'sitting on a box', 'under a compartment line'] as const) {
        const s = createSession();
        const xh = 30, asc = xh * 2.3;
        if (where === 'inside a box') {
          // The box's top edge 6 px above the l's tops.
          s.addStroke(handShape(boxCorners(160, 300 - asc / 2 + 6, 200, asc + 40), { seed }), 1000);
        } else if (where === 'sitting on a box') {
          // The baseline 6 px above the box's top edge.
          s.addStroke(handShape(boxCorners(160, 306 + 60, 220, 120), { seed }), 1000);
        } else {
          // A class box, and its compartment line 6 px above the ascenders.
          s.addStroke(handShape(boxCorners(160, 300 - 20, 220, 200), { seed }), 1000);
          s.addStroke(handLine({ x: 52, y: 300 - asc - 6 }, { x: 268, y: 300 - asc - 5 }, { seed: seed + 9, jitter: 1 }), 1500);
        }
        const hello = handPrint('hello', 80, 300, { xHeight: xh, seed });
        const { ids } = write(s, hello.strokes, 5000);
        const ws = wordsOf(s);
        if (ws.length !== 1 || !sameSet(ws[0], ids)) wrong.push(`${where} seed ${seed}: ${JSON.stringify(ws.map((w) => w.length))}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('the words the letter rules always gathered — N A V, the big hand, I O N — gather as they did', () => {
    const seg = (a: Point, b: Point) => lineStroke(a, b, 14);
    const s = createSession();
    // I, O, then N: a line and a circle, gathered back by the N the rung cannot place.
    const I = [seg({ x: 100, y: 100 }, { x: 100, y: 130 })];
    const O = handShape(boxCorners(122, 115, 14, 30), { seed: 3, round: 0.45 });
    const N = [seg({ x: 146, y: 130 }, { x: 146, y: 100 }).concat(seg({ x: 146, y: 100 }, { x: 164, y: 130 }).slice(1), seg({ x: 164, y: 130 }, { x: 164, y: 100 }).slice(1))];
    const { ids } = write(s, [...I, O, ...N], 1000, 400);
    expect(wordsOf(s).length).toBe(1);
    expect(sameSet(wordsOf(s)[0], ids)).toBe(true);
    expect(getRep(s.getState().nodes.get(ids[0])!, 'gesture')).toBeUndefined();
  });
});

// ===== A head drawn apart (found by the sequence-diagram unit) =====

describe('a head drawn apart is part of its connector, never a letter', () => {
  it('a self-message loop on a lifeline, and its head drawn right after it — a chevron, or a small closed triangle — are neither of them letters', () => {
    const wrong: string[] = [];
    for (const head of ['chevron', 'triangle'] as const) {
      for (const seed of [1, 2, 3]) {
        const s = createSession();
        s.addStroke(handLine({ x: 500, y: 100 }, { x: 501, y: 700 }, { seed, jitter: 1 }), 1000);
        // Out from the lifeline, down, and back to it: a loop 44 wide and 34 tall.
        const loop = s.addStroke([
          ...handLine({ x: 503, y: 300 }, { x: 538, y: 300 }, { seed, jitter: 0.8 }),
          ...handLine({ x: 538, y: 300 }, { x: 546, y: 308 }, { seed: seed + 1, jitter: 0.4 }).slice(1),
          ...handLine({ x: 546, y: 308 }, { x: 546, y: 326 }, { seed: seed + 2, jitter: 0.6 }).slice(1),
          ...handLine({ x: 546, y: 326 }, { x: 538, y: 334 }, { seed: seed + 3, jitter: 0.4 }).slice(1),
          ...handLine({ x: 538, y: 334 }, { x: 503, y: 334 }, { seed: seed + 4, jitter: 0.8 }).slice(1),
        ], 5000);
        // Its head at (503, 334), pointing left, into the lifeline.
        const pts = head === 'chevron'
          ? [...handLine({ x: 513, y: 327 }, { x: 503, y: 334 }, { seed: seed + 5, jitter: 0.4 }), ...handLine({ x: 503, y: 334 }, { x: 513, y: 341 }, { seed: seed + 6, jitter: 0.4 }).slice(1)]
          : [...handLine({ x: 503, y: 334 }, { x: 515, y: 327 }, { seed: seed + 5, jitter: 0.3 }), ...handLine({ x: 515, y: 327 }, { x: 515, y: 341 }, { seed: seed + 6, jitter: 0.3 }).slice(1), ...handLine({ x: 515, y: 341 }, { x: 503, y: 334 }, { seed: seed + 7, jitter: 0.3 }).slice(1)];
        const h = s.addStroke(pts, 5400);
        if (inAWord(s, loop) || inAWord(s, h)) wrong.push(`${head} seed ${seed}: ${JSON.stringify(wordsOf(s).map((w) => w.map((id) => (id === loop ? 'loop' : id === h ? 'head' : id))))}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it("a dashed line's last dash and the chevron that ends it are neither of them letters, and no dash is gathered back", () => {
    const wrong: string[] = [];
    for (const seed of [1, 2, 3]) {
      const s = createSession();
      const dashes: string[] = [];
      let t = 5000;
      for (let x = 100; x < 290; x += 26) {
        dashes.push(s.addStroke(handLine({ x, y: 400 + (seed % 2) }, { x: x + 16, y: 400 }, { seed: seed + x, jitter: 0.5 }), t));
        t += 150;
      }
      const tipX = 100 + 26 * (dashes.length - 1) + 16;
      const chevron = s.addStroke([...handLine({ x: tipX - 12, y: 393 }, { x: tipX, y: 400 }, { seed: seed + 5, jitter: 0.4 }), ...handLine({ x: tipX, y: 400 }, { x: tipX - 12, y: 407 }, { seed: seed + 6, jitter: 0.4 }).slice(1)], t + 150);
      const gathered = [...dashes, chevron].filter((id) => inAWord(s, id));
      if (gathered.length) wrong.push(`seed ${seed}: ${gathered.length} of its ${dashes.length} dashes and chevron gathered into a word`);
    }
    expect(wrong).toEqual([]);
  });

  it('the control: a word printed with stems, bowls and dots — "hid", "slid", "sold", "held" — still gathers whole', () => {
    const wrong: string[] = [];
    for (const text of ['hid', 'slid', 'sold', 'held']) {
      for (const seed of [1, 2, 3]) {
        const s = createSession();
        const p = handPrint(text, 100, 300, { xHeight: 34, seed });
        const { ids } = write(s, p.strokes, 1000);
        const ws = wordsOf(s);
        if (ws.length !== 1 || !sameSet(ws[0], ids)) wrong.push(`"${text}" seed ${seed}: ${JSON.stringify(ws.map((w) => w.length))} of ${ids.length}`);
      }
    }
    expect(wrong).toEqual([]);
  });
});

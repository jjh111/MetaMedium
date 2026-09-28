// The flowchart bench (V1-PLAN §2.3 "every pack has a bench", §9 D1).
//
// A hand-drawn flowchart — jittered strokes, a diamond in one stroke and one
// in two, a box ruled in four, arrows with their own barbs and one line
// without, a start of a terminator, data, an end circle, labels inside
// symbols and "yes" and "no" beside the flows leaving a decision — must read
// as a flowchart with EVERY symbol and EVERY flow right, drawn every way the
// variants draw it (seeds, a steady and a shaky hand, a process tilted up to
// ten degrees either way). And three boards that are not flowcharts — a UI
// wireframe, the canonical molecule, a line of writing — must never read as
// one above the floor. The trap, swept on its own: boxes drawn a little
// tilted stay processes, and diamonds of every proportion are decisions.
//
// It is a benchmark, so it prints its rates. It is also a test, so it fails
// when one of them drops.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import type { Session } from '../session/session';
import { readFlowchart } from './flowchart';
import { notationsOf, NOTATION_FLOOR } from './notation';
import type { NotationReading } from './notation';
import { drawFlowchart, drawWireframe, drawMolecule, drawWriting, FLOWCHART_VARIANTS } from './fixtures/flowchart';
import type { Expected } from './fixtures/flowchart';
import { handShape, boxCorners, diamondCorners, diamondTopBottom } from './fixtures/hand';
import { handArrow, inkOf } from '../test/strokes';
import { cleanOf, cleanPointsOf } from '../session/clean';
import { getRep, strokePointsOf } from '../session/nodes';
import type { MMNode } from '../session/nodes';

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

const atOf = (n: MMNode) => (getRep(n, 'stroke')!.data as { at: number }).at;

/**
 * *Draw them clean* on every mark, and the board drawn again as it then
 * shows — each clean form in front, where the surface draws it, and the ink
 * of every mark that has none — so the notation can read what the human now
 * sees (S1). Returns the new board and each old stroke's id on it.
 */
function drawnClean(s: Session): { board: Session; idOf: (id: string) => string } {
  const strokes = [...s.getState().nodes.values()].filter((n) => getRep(n, 'stroke') && !getRep(n, 'erased')).sort((a, b) => atOf(a) - atOf(b));
  s.snap({ ids: strokes.map((n) => n.id), at: Math.max(...strokes.map(atOf)) + 1000 });
  const board = createSession();
  const ids = new Map<string, string>();
  for (const { id } of strokes) {
    const n = s.getState().nodes.get(id)!;
    const clean = cleanOf(n);
    ids.set(id, board.addStroke(clean ? inkOf(cleanPointsOf(n)!, clean.closed) : strokePointsOf(n)!, atOf(n)));
  }
  return { board, idOf: (id) => ids.get(id)! };
}

/** Score one reading of the flowchart against what was drawn. */
function score(r: NotationReading | null, e: Expected, label: string, t: { charts: Tally; symbols: Tally; flows: Tally; labels: Tally }) {
  count(t.charts, !!r && r.confidence >= NOTATION_FLOOR, `${label}: ${r ? `read ${r.confidence.toFixed(2)}` : 'no reading'}`);
  const nameOf = new Map<string, string>(); // symbol id in the reading → expected name
  for (const [name, want] of Object.entries(e.symbols)) {
    const got = r?.symbols.find((x) => sameSet(x.ids, want.ids));
    if (got) nameOf.set(got.id, name);
    count(t.symbols, got?.symbol === want.symbol, `${label} ${name}: wanted ${want.symbol}, read ${got ? `${got.symbol} ${got.confidence.toFixed(2)}` : 'nothing'}`);
  }
  for (const f of e.flows) {
    const got = r?.connectors.find((c) => c.id === f.id);
    const from = got && nameOf.get(got.from), to = got && nameOf.get(got.to);
    const ok = !!got && from === f.from && to === f.to && got.directed === f.directed;
    count(t.flows, ok, `${label} ${f.name}: wanted ${f.from}→${f.to}${f.directed ? '' : ' (undirected)'}, read ${got ? `${from ?? got.from}→${to ?? got.to}${got.directed ? '' : ' (undirected)'}` : 'nothing'}`);
  }
  for (const l of e.labels) {
    const got = r?.labels.find((x) => x.id === l.id);
    const flow = e.flows.find((f) => f.name === l.of);
    const want = flow ? flow.id : r?.symbols.find((x) => sameSet(x.ids, e.symbols[l.of].ids))?.id;
    count(t.labels, !!got && got.of === want && got.where === l.where, `${label} label on ${l.of}: read ${got ? `${got.where} ${got.of}` : 'nothing'}`);
  }
}

describe('the flowchart bench', () => {
  const t = { charts: tally(), symbols: tally(), flows: tally(), labels: tally(), top: tally() };
  const confidences: number[] = [];
  for (const v of FLOWCHART_VARIANTS) {
    const s = createSession();
    const e = drawFlowchart(s, v);
    const label = `seed ${v.seed} jitter ${v.jitter} tilt ${v.tilt}`;
    const r = readFlowchart(s.getState());
    if (r) confidences.push(r.confidence);
    score(r, e, label, t);
    // Among every notation's readings of the board, the flowchart is the likeliest.
    count(t.top, notationsOf(s.getState())[0]?.notation === 'flowchart', `${label}: not first among the readings`);
  }

  // After *Draw them clean* (S1): a decision redrawn as its upright bounds
  // was a process. Every decision must still be one; the other symbols are
  // reported.
  const clean = { decisions: tally(), others: tally() };
  for (const v of FLOWCHART_VARIANTS) {
    const s = createSession();
    const e = drawFlowchart(s, v);
    const { board, idOf } = drawnClean(s);
    const r = readFlowchart(board.getState());
    for (const [name, want] of Object.entries(e.symbols)) {
      const got = r?.symbols.find((x) => sameSet(x.ids, want.ids.map(idOf)));
      count(want.symbol === 'decision' ? clean.decisions : clean.others, got?.symbol === want.symbol, `seed ${v.seed} ${name} drawn clean: wanted ${want.symbol}, read ${got ? `${got.symbol} ${got.confidence.toFixed(2)}` : 'nothing'}`);
    }
  }

  // The boards that are not flowcharts.
  const negatives: Record<string, { n: number; above: string[]; highest: number }> = {};
  const against = (name: string, draw: (s: Session, seed: number) => unknown) => {
    const n = (negatives[name] = { n: 0, above: [] as string[], highest: 0 });
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const s = createSession();
      draw(s, seed);
      const r = readFlowchart(s.getState());
      n.n++;
      n.highest = Math.max(n.highest, r?.confidence ?? 0);
      if (r && r.confidence >= NOTATION_FLOOR) n.above.push(`seed ${seed}: ${r.confidence.toFixed(2)} — ${r.summary}`);
    }
  };
  against('UI wireframe', drawWireframe);
  against('canonical molecule', drawMolecule);
  against('line of writing', drawWriting);

  // The trap, swept: a process above, the case below, an arrow between.
  const trap = { tilted: tally(), diamonds: tally(), twoStroke: tally() };
  const under = (draw: (s: Session) => string[], top: number): { ids: string[]; r: NotationReading | null } => {
    const s = createSession();
    s.addStroke(handShape(boxCorners(200, 100, 160, 70), { seed: 5 }), 1000);
    s.addStroke(handArrow({ x: 200, y: 139 }, { x: 200, y: top - 4 }, { wings: 2, headLen: 16, seed: 6, jitter: 1 }), 5000);
    const ids = draw(s);
    return { ids, r: readFlowchart(s.getState()) };
  };
  const symbolIn = (x: { ids: string[]; r: NotationReading | null }) => x.r?.symbols.find((y) => sameSet(y.ids, x.ids));
  /** The same board, every mark drawn clean first. */
  const underClean = (draw: (s: Session) => string[], top: number): { ids: string[]; r: NotationReading | null } => {
    const s = createSession();
    s.addStroke(handShape(boxCorners(200, 100, 160, 70), { seed: 5 }), 1000);
    s.addStroke(handArrow({ x: 200, y: 139 }, { x: 200, y: top - 4 }, { wings: 2, headLen: 16, seed: 6, jitter: 1 }), 5000);
    const ids = draw(s);
    const { board, idOf } = drawnClean(s);
    return { ids: ids.map(idOf), r: readFlowchart(board.getState()) };
  };
  const trapClean = { diamonds: tally(), twoStroke: tally() };
  for (const seed of [1, 2, 3, 4]) {
    for (const jitter of [1.5, 3]) {
      for (const tilt of [-12, -9, -6, -3, 0, 3, 6, 9, 12]) {
        const x = under((s) => [s.addStroke(handShape(boxCorners(200, 320, 160, 70, tilt), { seed: seed * 50 + tilt, jitter }), 9000)], 286);
        const got = symbolIn(x);
        count(trap.tilted, got?.symbol === 'process', `box tilted ${tilt}° (seed ${seed}, jitter ${jitter}): ${got ? `${got.symbol} ${got.confidence.toFixed(2)}` : 'nothing'}`);
      }
      for (const [w, h] of [[120, 120], [140, 100], [160, 100], [180, 110], [200, 100], [220, 90]]) {
        const x = under((s) => [s.addStroke(handShape(diamondCorners(200, 330, w, h), { seed: seed * 70 + w, jitter }), 9000)], 330 - h / 2);
        const got = symbolIn(x);
        count(trap.diamonds, got?.symbol === 'decision', `diamond ${w}×${h} (seed ${seed}, jitter ${jitter}): ${got ? `${got.symbol} ${got.confidence.toFixed(2)}` : 'nothing'}`);
        const y = under((s) => diamondTopBottom(diamondCorners(200, 330, w, h), { seed: seed * 90 + w, jitter: jitter / 2 }).map((pts, i) => s.addStroke(pts, 9000 + i * 1000)), 330 - h / 2);
        const got2 = symbolIn(y);
        count(trap.twoStroke, got2?.symbol === 'decision', `diamond ${w}×${h} in two (seed ${seed}, jitter ${jitter}): ${got2 ? `${got2.symbol} ${got2.confidence.toFixed(2)}` : 'nothing'}`);
        const xc = symbolIn(underClean((s) => [s.addStroke(handShape(diamondCorners(200, 330, w, h), { seed: seed * 70 + w, jitter }), 9000)], 330 - h / 2));
        count(trapClean.diamonds, xc?.symbol === 'decision', `diamond ${w}×${h} drawn clean (seed ${seed}, jitter ${jitter}): ${xc ? `${xc.symbol} ${xc.confidence.toFixed(2)}` : 'nothing'}`);
        const yc = symbolIn(underClean((s) => diamondTopBottom(diamondCorners(200, 330, w, h), { seed: seed * 90 + w, jitter: jitter / 2 }).map((pts, i) => s.addStroke(pts, 9000 + i * 1000)), 330 - h / 2));
        count(trapClean.twoStroke, yc?.symbol === 'decision', `diamond ${w}×${h} in two, drawn clean (seed ${seed}, jitter ${jitter}): ${yc ? `${yc.symbol} ${yc.confidence.toFixed(2)}` : 'nothing'}`);
      }
    }
  }

  it('reports its rates', () => {
    const lines = [
      `\n  flowchart bench — ${FLOWCHART_VARIANTS.length} hand-drawn flowcharts, floor ${NOTATION_FLOOR}`,
      `  read as a flowchart   ${rate(t.charts)}   confidence ${Math.min(...confidences).toFixed(2)}–${Math.max(...confidences).toFixed(2)}`,
      `  first among readings  ${rate(t.top)}`,
      `  symbols right         ${rate(t.symbols)}`,
      `  flows right           ${rate(t.flows)}`,
      `  labels placed         ${rate(t.labels)}`,
      `  the trap: boxes tilted up to 12° read as processes   ${rate(trap.tilted)}`,
      `  diamonds in one stroke read as decisions            ${rate(trap.diamonds)}`,
      `  diamonds in two strokes read as decisions           ${rate(trap.twoStroke)}`,
      `  after Draw them clean: the flowcharts' decisions      ${rate(clean.decisions)}   their other symbols ${rate(clean.others)}`,
      `  after Draw them clean: diamonds in one stroke        ${rate(trapClean.diamonds)}   in two ${rate(trapClean.twoStroke)}`,
      ...Object.entries(negatives).map(([name, n]) => `  ${name.padEnd(20)} above the floor ${n.above.length}/${n.n}   highest ${n.highest.toFixed(2)}`),
    ];
    const wrong = [...t.charts.wrong, ...t.symbols.wrong, ...t.flows.wrong, ...t.labels.wrong, ...trap.tilted.wrong, ...trap.diamonds.wrong, ...trap.twoStroke.wrong, ...clean.decisions.wrong, ...trapClean.diamonds.wrong, ...trapClean.twoStroke.wrong, ...clean.others.wrong].slice(0, 12);
    if (wrong.length) lines.push('  wrong:', ...wrong.map((w) => `    ${w}`));
    console.log(lines.join('\n'));
    expect(FLOWCHART_VARIANTS.length).toBeGreaterThanOrEqual(36);
  });

  it('every hand-drawn flowchart reads as one, above the floor, and first among the readings', () => {
    expect(t.charts.wrong).toEqual([]);
    expect(t.top.wrong).toEqual([]);
  });

  it('every symbol right', () => {
    expect(t.symbols.wrong).toEqual([]);
  });

  it('every flow right — its ends past its heads, its direction from its heads', () => {
    expect(t.flows.wrong).toEqual([]);
  });

  it('every label on the symbol it sits in, or the flow it sits beside', () => {
    expect(t.labels.wrong).toEqual([]);
  });

  it('the trap: a box drawn a little tilted stays a process; a diamond is a decision, in one stroke or two', () => {
    expect(trap.tilted.wrong).toEqual([]);
    expect(trap.diamonds.wrong).toEqual([]);
    expect(trap.twoStroke.wrong).toEqual([]);
  });

  it('after Draw them clean, every decision is still a decision — a diamond is not redrawn as a box (S1)', () => {
    expect(clean.decisions.wrong).toEqual([]);
    expect(trapClean.diamonds.wrong).toEqual([]);
    expect(trapClean.twoStroke.wrong).toEqual([]);
  });

  it('a UI wireframe, the canonical molecule and a line of writing never read as a flowchart above the floor', () => {
    for (const [name, n] of Object.entries(negatives)) expect(n.above, name).toEqual([]);
  });
});

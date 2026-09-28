// The dash reading (V1-PLAN §9 D5; notations/dashes.ts): a bench of dashed
// lines drawn by hand — every heading, a hand's dash lengths and gaps, a
// steady and a shaky hand, at zoom 1 and in the hand's space at 0.5× and 2× —
// each read as ONE line with all its dashes and its ends where they are; and
// what must never read as one: printed capitals (bars and serifs in a row,
// joined to their stems), digits between minus signs, a line of writing, the
// flowchart and class benches, a wireframe, the molecule. A dashed line whose
// chevron the letter rules gathered into a word with its last dash still
// reads, the chevron its head. It is a benchmark, so it prints its rates.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import type { Session } from '../session/session';
import type { Point } from '../types';
import { isWord } from '../session/nodes';
import { dashedLines, dashedHeads, MIN_DASHES } from './dashes';
import { drawDashed, drawPrinted, PRINTED } from './fixtures/dashes';
import { drawSequence, SEQUENCE_VARIANTS } from './fixtures/sequence';
import { drawFlowchart, drawWireframe, drawMolecule, drawWriting, FLOWCHART_VARIANTS } from './fixtures/flowchart';
import { drawClassDiagram, drawClassPair, CLASS_VARIANTS } from './fixtures/uml-class';

const sameSet = (a: readonly string[], b: readonly string[]) => [...a].sort().join('|') === [...b].sort().join('|');
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

describe('the dash bench', () => {
  // Every heading, a hand's dashes and gaps (hand px), a steady and a shaky hand, three seeds, three zooms.
  const HEADINGS = [0, 90, 180, 270, 20, -35, 60];
  const SPACING: [number, number][] = [[8, 6], [14, 9], [24, 12], [20, 18]];
  let n = 0, right = 0, ends = 0;
  const wrong: string[] = [];
  for (const heading of HEADINGS) {
    for (const [dash, gap] of SPACING) {
      for (const jitter of [0.5, 1.2]) {
        const s = createSession();
        const want: { ids: string[]; a: Point; b: Point; label: string; scale: number }[] = [];
        let t = 1000, k = 0;
        for (const seed of [1, 2, 3]) {
          for (const scale of [1, 0.5, 2]) {
            const a = { x: (k % 3) * 3000, y: Math.floor(k / 3) * 3000 };
            const L = 300 * scale, rad = (heading * Math.PI) / 180;
            const b = { x: a.x + L * Math.cos(rad), y: a.y + L * Math.sin(rad) };
            const d = drawDashed(s, a, b, { dash, gap, seed: seed * 7 + heading, jitter, scale, t0: t });
            t = d.at;
            want.push({ ids: d.ids, a, b, label: `${heading}° dash ${dash} gap ${gap} jitter ${jitter} seed ${seed} ×${scale}`, scale });
            k++;
          }
        }
        const lines = dashedLines(s.getState());
        for (const w of want) {
          n++;
          const got = lines.filter((l) => l.ids.some((id) => w.ids.includes(id)));
          const ok = got.length === 1 && sameSet(got[0].ids, w.ids);
          if (ok) right++;
          else wrong.push(`${w.label}: ${got.map((l) => l.dashes).join(' + ') || 'nothing'} of ${w.ids.length} dashes`);
          // Its ends where the line was drawn, within a dash.
          if (ok) {
            const l = got[0];
            const near = (p: Point, q: Point) => dist(p, q) <= (dash + 2) * w.scale;
            if ((near(l.from, w.a) && near(l.to, w.b)) || (near(l.from, w.b) && near(l.to, w.a))) ends++;
            else wrong.push(`${w.label}: ends ${JSON.stringify(l.from)} ${JSON.stringify(l.to)}`);
          }
        }
      }
    }
  }

  // Printed capitals: bars, crossbars and serifs a dash's length, in a row — joined to their stems.
  let printed = 0;
  const falsePrinted: string[] = [];
  for (const word of [...PRINTED, '1 - 2 - 3 - 4']) {
    for (const seed of [1, 2, 3, 4]) {
      for (const scale of [1, 0.5, 2]) {
        for (const h of [30, 40]) {
          const s = createSession();
          drawPrinted(s, word, 100 * scale, 100 * scale, h * scale, { seed, scale });
          printed++;
          for (const l of dashedLines(s.getState())) falsePrinted.push(`“${word}” seed ${seed} ×${scale} h ${h}: ${l.reason}`);
        }
      }
    }
  }

  // What the other benches draw.
  const negatives: Record<string, { n: number; found: string[] }> = {};
  const against = (name: string, boards: ((s: Session) => unknown)[]) => {
    const x = (negatives[name] = { n: 0, found: [] as string[] });
    boards.forEach((draw, i) => {
      const s = createSession();
      draw(s);
      x.n++;
      for (const l of dashedLines(s.getState())) x.found.push(`board ${i}: ${l.reason}`);
    });
  };
  against('the flowchart bench', FLOWCHART_VARIANTS.map((v) => (s: Session) => drawFlowchart(s, v)));
  against('the class bench', CLASS_VARIANTS.flatMap((v) => [(s: Session) => drawClassDiagram(s, v), (s: Session) => drawClassPair(s, v)]));
  against('UI wireframe', [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => (s: Session) => drawWireframe(s, seed)));
  against('canonical molecule', [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => (s: Session) => drawMolecule(s, seed)));
  against('line of writing', [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => (s: Session) => drawWriting(s, seed)));

  it('reports its rates', () => {
    console.log([
      `\n  dash bench — ${n} dashed lines drawn by hand (${HEADINGS.length} headings × ${SPACING.length} spacings × 2 hands × 3 seeds × 3 zooms)`,
      `    read as one line with every dash ${right}/${n}   its ends where drawn ${ends}/${right}`,
      `  printed capitals, ${printed} words (${PRINTED.length + 1} texts × 4 seeds × 3 zooms × 2 sizes): read as a dashed line ${falsePrinted.length}`,
      ...Object.entries(negatives).map(([name, x]) => `  ${name.padEnd(22)} ${x.n} boards, dashed lines found ${x.found.length}`),
      ...[...wrong, ...falsePrinted].slice(0, 10).map((w) => `    ${w}`),
    ].join('\n'));
    expect(n).toBe(HEADINGS.length * SPACING.length * 2 * 9);
  });

  it('every dashed line drawn by hand reads as one line, every dash in it, its ends where it was drawn', () => {
    expect(wrong).toEqual([]);
    expect(right).toBe(n);
  });

  it('no printed word reads as a dashed line — its bars and serifs are joined to their stems, and digits stand in the gaps', () => {
    expect(falsePrinted).toEqual([]);
  });

  it('nothing the other benches draw reads as a dashed line', () => {
    for (const [name, x] of Object.entries(negatives)) expect(x.found, name).toEqual([]);
  });
});

describe('the dash reading, rule by rule', () => {
  it('a row of hyphens is a dashed line — it is what a hand dashes with', () => {
    const s = createSession();
    const { ids } = drawPrinted(s, '------', 100, 100, 36);
    const lines = dashedLines(s.getState());
    expect(lines).toHaveLength(1);
    expect(sameSet(lines[0].ids, ids)).toBe(true);
  });

  it('two strokes in line are a broken line, not a dashed one', () => {
    const s = createSession();
    drawDashed(s, { x: 100, y: 100 }, { x: 131, y: 100 }, { dash: 13, gap: 9 });
    expect(dashedLines(s.getState())).toEqual([]);
    expect(MIN_DASHES).toBe(3);
  });

  it('a dashed line crossing another steeply: both read whole, each dash of one crossing the other no joint', () => {
    const s = createSession();
    const h = drawDashed(s, { x: 100, y: 300 }, { x: 500, y: 300 }, { seed: 3, gap: 7 });
    const v = drawDashed(s, { x: 300, y: 100 }, { x: 300, y: 500 }, { seed: 4, gap: 7, t0: h.at });
    const lines = dashedLines(s.getState());
    expect(lines.map((l) => l.dashes).sort()).toEqual([h.ids.length, v.ids.length].sort());
    expect(lines.some((l) => sameSet(l.ids, h.ids))).toBe(true);
    expect(lines.some((l) => sameSet(l.ids, v.ids))).toBe(true);
  });

  it('a mark standing in a gap cuts the row there; a mark touching a dash away from the row’s ends leaves that dash out', () => {
    const s = createSession();
    const { ids, at } = drawDashed(s, { x: 100, y: 100 }, { x: 400, y: 100 }, { seed: 5, dash: 14, gap: 10 });
    // A short stem down from the middle of the seventh dash: a T's joint.
    const mid = s.getState().nodes.get(ids[6])!;
    void mid;
    const lines0 = dashedLines(s.getState());
    expect(lines0).toHaveLength(1);
    const d = lines0[0];
    const k = 6;
    const p = { x: d.from.x + (d.to.x - d.from.x) * ((k + 0.5) / ids.length), y: 100 };
    s.addStroke([{ x: p.x, y: 101 }, { x: p.x, y: 108 }, { x: p.x, y: 116 }, { x: p.x + 0.4, y: 124 }], at + 4000);
    const after = dashedLines(s.getState());
    expect(after.every((l) => l.ids.length < ids.length)).toBe(true);
    expect(after.flatMap((l) => l.ids)).not.toContain(ids[k]);
  });

  it('a chevron drawn right after the last dash — gathered with it into a word by the letter rules — is the line’s head, and the dash still a dash', () => {
    let gathered = 0;
    for (const v of SEQUENCE_VARIANTS.filter((x) => x.headAfter < 3000)) {
      const s = createSession();
      const e = drawSequence(s, v);
      const want = e.messages[3];
      const chevronId = want.ids[want.ids.length - 1];
      const st = s.getState();
      const word = [...st.nodes.values()].find((n) => isWord(n) && n.edges.some((x) => x.rel === 'has-part' && x.to === chevronId));
      if (word) gathered++;
      const line = dashedLines(st).find((l) => l.ids.some((id) => want.ids.includes(id)))!;
      expect(sameSet(line.ids, want.ids.slice(0, -1)), `seed ${v.seed}`).toBe(true);
      if (word) expect(line.marks).toContain(word.id);
      const h = dashedHeads(st, line);
      // The chevron is at Alice's end — the left, the line's `from` — an open arrow.
      expect(h.start.heads[0]?.kind, `seed ${v.seed}: ${h.start.reason}`).toBe('arrow');
      expect(h.start.heads[0]?.ids).toEqual([chevronId]);
      expect(h.end.heads).toEqual([]);
    }
    // The letter rules did gather most of them — this is the case being tested.
    expect(gathered).toBeGreaterThanOrEqual(12);
  });

  it('derived: reading writes nothing, and reads the same again', () => {
    const s = createSession();
    drawSequence(s, SEQUENCE_VARIANTS[12]);
    const events = s.getEvents().length, nodes = s.getState().nodes.size;
    const a = JSON.stringify(dashedLines(s.getState()));
    expect(JSON.stringify(dashedLines(s.getState()))).toBe(a);
    dashedHeads(s.getState(), dashedLines(s.getState())[0]);
    expect(s.getEvents().length).toBe(events);
    expect(s.getState().nodes.size).toBe(nodes);
  });
});

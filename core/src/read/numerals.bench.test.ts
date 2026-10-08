// The numerals' bench (MATHS-SPEC §8, Lane F — M8), the command mark's pattern
// (`session/commandmark.bench.test.ts`) for a keypad: does it read what it is
// written, and does it stay quiet on everything else? The second matters more.
//
//   - EVERY GLYPH, every style, at 0.6×, 1× and 1.8× of a 40-unit digit, drawn
//     by `handGlyph` — never the reader's own samples: other seeds, a tremor of
//     its own, every control point pushed about, the glyph slanted, turned and
//     stretched, its strokes in another order and direction, sampled fast or
//     slowly with a digitizer's noise — and read alone on the line it stands
//     on, as a label is. Top-1 at least 95% overall and 90% for every class.
//   - LINES OF MATHS written by `handLine` and read with nothing given: the
//     strokes grouped, the runs and their line measured, the glyphs read.
//   - THE DRAWING CORPUS the other benches use — the recognition corpus as it
//     is drawn, its marks shrunk to a letter's size and forced as labels, the
//     flowcharts, the class, sequence, state, ER, mind-map and pattern-piece
//     boards, wireframes, molecules, rows, hubs and lines of writing — reads no
//     digit above the floor, but a digit's twins: a nought that is a circle, a
//     one that is a line, each said as a tie.
//
// HOW FAR THIS IS FROM A HAND: every glyph here is a parametric definition
// drawn with seeded noise. The bench measures the reader against the variation
// its author imagined, not the variation of anyone's hand; John's own digits
// (wave 2's teach pane) are the bench that decides whether it ships.

import { describe, it, expect } from 'vitest';
import type { Point } from '../types';
import { createSession, type Session } from '../session/session';
import { buildCases, buildTurnedCases, buildArcCases } from '../test/cases';
import { handCircle, handLine as strokeLine, handRect } from '../test/strokes';
import { FLOWCHART_VARIANTS, drawFlowchart, drawMolecule, drawWireframe, drawWriting } from '../notations/fixtures/flowchart';
import { CLASS_VARIANTS, drawClassDiagram, drawClassPair } from '../notations/fixtures/uml-class';
import { SEQUENCE_VARIANTS, drawSequence } from '../notations/fixtures/sequence';
import { STATE_VARIANTS, drawState } from '../notations/fixtures/state';
import { ER_VARIANTS, drawEr } from '../notations/fixtures/er';
import { MINDMAP_VARIANTS, drawMindMap } from '../notations/fixtures/mindmap';
import { GARMENT_VARIANTS, drawGarment } from '../notations/fixtures/garment';
import { GLYPHS, GLYPH_TABLE, type Glyph } from './glyphs';
import { GLYPH_STYLES, handGlyph, handLine } from './samples';
import { readNumerals, numeralModel, type GlyphRead } from './numerals';

const SIZES = [0.6, 1, 1.8] as const;
const BASE = 40;
const SEEDS = 8;

const pct = (n: number, of: number) => `${((100 * n) / Math.max(1, of)).toFixed(1)}%`;

describe('every glyph reads as itself', () => {
  it('top-1 at least 95% over every style at 0.6×, 1× and 1.8×, and at least 90% for every glyph', () => {
    numeralModel();
    const per = new Map<Glyph, { n: number; ok: number }>();
    const bySize = new Map<number, { n: number; ok: number }>();
    const confusions = new Map<string, number>();
    let n = 0, ok = 0;
    const t0 = performance.now();
    for (const st of GLYPH_STYLES) {
      for (const k of SIZES) {
        for (let s = 0; s < SEEDS; s++) {
          const g = handGlyph(st, { seed: 90_000 + s * 31 + GLYPH_STYLES.indexOf(st) * 977, size: BASE * k, x: 120, baseline: 300 });
          const read = readNumerals(g.strokes, { line: g.line, asLabel: true });
          const got = read.glyphs.length === 1 ? read.glyphs[0].glyph : read.glyphs.map((x) => x.glyph ?? '?').join('|');
          const right = got === st.glyph;
          n++;
          if (right) ok++;
          else confusions.set(`${st.glyph} (${st.style}) → ${got ?? 'nothing'}`, (confusions.get(`${st.glyph} (${st.style}) → ${got ?? 'nothing'}`) ?? 0) + 1);
          const p = per.get(st.glyph) ?? { n: 0, ok: 0 };
          per.set(st.glyph, { n: p.n + 1, ok: p.ok + (right ? 1 : 0) });
          const z = bySize.get(k) ?? { n: 0, ok: 0 };
          bySize.set(k, { n: z.n + 1, ok: z.ok + (right ? 1 : 0) });
        }
      }
    }
    const ms = (performance.now() - t0) / n;
    console.log(`numerals: ${ok}/${n} glyphs read as themselves (${pct(ok, n)}), ${ms.toFixed(1)} ms a glyph through the whole reader`);
    console.log('  by size: ' + [...bySize].map(([k, v]) => `×${k} ${pct(v.ok, v.n)}`).join(', '));
    console.log('  by glyph: ' + GLYPHS.map((g) => `${g} ${pct(per.get(g)!.ok, per.get(g)!.n)}`).join(', '));
    if (confusions.size) console.log('  confused: ' + [...confusions].map(([k, v]) => `${k} ×${v}`).join('; '));
    expect(ok / n).toBeGreaterThanOrEqual(0.95);
    for (const g of GLYPHS) expect(per.get(g)!.ok / per.get(g)!.n, `${g}: ${per.get(g)!.ok}/${per.get(g)!.n}`).toBeGreaterThanOrEqual(0.9);
  }, 180_000);
});

describe('lines of maths read as they were written', () => {
  const LINES = ['24.5″', '3 + 4 = 7', '12 × 3 = 36', '(x − 2)(x + 2)', '45°', '6′ 2″', '50%', 'y = 2x + 1', '√2', '1/2', '7 ÷ 7 = 1', '10', '100', '0.75', '13 + 2 = 15', 'θ = 30°', '2π', '9 − 8 = 1', '1.5 × 4 = 6'];

  it('glyph by glyph, and whole', () => {
    let lines = 0, exact = 0, glyphs = 0, right = 0;
    const missed: string[] = [];
    const t0 = performance.now();
    LINES.forEach((text, li) => {
      for (const k of SIZES) {
        for (let s = 0; s < 2; s++) {
          const hl = handLine(text, { seed: 7_000 + li * 53 + s * 13 + Math.round(k * 10), size: BASE * k, x: 50, baseline: 400 });
          const read = readNumerals(hl.strokes);
          const want = hl.glyphs.map((g) => GLYPH_TABLE[g].text).join('');
          const got = read.runs.map((r) => r.text).join(' ');
          lines++;
          if (got === want) exact++;
          else missed.push(`${text} ×${k} → ${got}`);
          // Glyph by glyph: each written glyph whose strokes were read as one glyph, as it.
          for (let gi = 0; gi < hl.glyphs.length; gi++) {
            glyphs++;
            const ids = hl.glyphOf.flatMap((of, i) => (of === gi ? [i] : []));
            const g = read.glyphs.find((x) => x.strokes.length === ids.length && ids.every((i) => x.strokes.includes(i)));
            if (g && g.glyph === hl.glyphs[gi]) right++;
          }
        }
      }
    });
    console.log(`numerals, lines: ${exact}/${lines} read whole (${pct(exact, lines)}), ${right}/${glyphs} glyphs grouped and read right (${pct(right, glyphs)}), ${((performance.now() - t0) / lines).toFixed(0)} ms a line`);
    if (missed.length) console.log('  missed: ' + missed.join('; '));
    expect(right / glyphs).toBeGreaterThanOrEqual(0.95);
    expect(exact / lines).toBeGreaterThanOrEqual(0.85);
  }, 180_000);
});

// ===== The negatives =====

/** The strokes a fixture draws, as a hand left them. */
function strokesOf(draw: (s: Session) => unknown): Point[][] {
  const s = createSession();
  draw(s);
  return s.getEvents().flatMap((e) => (e.type === 'stroke' ? [e.points] : []));
}

/** A digit read is allowed only as a twin: a nought or a one, its twins said beside it. */
function falseDigits(label: string, glyphs: readonly GlyphRead[]): string[] {
  const out: string[] = [];
  for (const g of glyphs) {
    if (!g.glyph || GLYPH_TABLE[g.glyph].kind !== 'digit') continue;
    const twin = (g.glyph === '0' && g.ties.includes('a circle') && g.ties.includes('O')) || (g.glyph === '1' && g.ties.includes('a line') && g.ties.includes('l'));
    if (!twin) out.push(`${label}: ${g.glyph} ${g.confidence.toFixed(2)} — ${g.reasoning}`);
  }
  return out;
}

/** A mark shrunk to a letter's size: a mark already smaller — a dot — is left as it is, not blown up into a curl. */
const fitTo = (pts: Point[], size: number): Point[] => {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const k = Math.min(1, size / Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1e-6));
  return pts.map((p) => ({ x: (p.x - Math.min(...xs)) * k, y: (p.y - Math.min(...ys)) * k }));
};

describe('the drawing corpus reads no digit, but its twins', () => {
  const singles = [...buildCases(), ...buildTurnedCases(), ...buildArcCases()];

  it('the recognition corpus, as it is drawn', () => {
    const bad: string[] = [];
    let signs = 0;
    for (const c of singles) {
      const read = readNumerals([c.points]);
      bad.push(...falseDigits(c.label, read.glyphs));
      signs += read.glyphs.filter((g) => g.glyph).length;
    }
    console.log(`numerals, the recognition corpus as drawn: ${singles.length} marks, ${bad.length} false digits, ${signs} glyphs read at all`);
    expect(bad).toEqual([]);
  }, 180_000);

  it('the recognition corpus shrunk to a letter’s size and forced as labels: only twins', () => {
    const bad: string[] = [];
    const read: Record<string, number> = {};
    let n = 0;
    singles.forEach((c, i) => {
      if (i % 6) return;
      n++;
      const r = readNumerals([fitTo(c.points, BASE)], { asLabel: true });
      bad.push(...falseDigits(`${c.label} (a label)`, r.glyphs));
      for (const g of r.glyphs) if (g.glyph) read[g.glyph] = (read[g.glyph] ?? 0) + 1;
    });
    console.log(`numerals, ${n} marks of the corpus as labels: read as ${Object.entries(read).map(([g, k]) => `${g} ×${k}`).join(', ') || 'nothing'}; ${bad.length} false digits`);
    for (const b of bad.slice(0, 8)) console.log('  ' + b);
    expect(bad).toEqual([]);
  }, 180_000);

  it('the notation boards, wireframes, molecules, rows, hubs and lines of writing', () => {
    const boards: { label: string; strokes: Point[][] }[] = [];
    FLOWCHART_VARIANTS.filter((_, i) => i % 3 === 0).forEach((v) => boards.push({ label: `flowchart ${v.seed}`, strokes: strokesOf((s) => drawFlowchart(s, v)) }));
    CLASS_VARIANTS.filter((_, i) => i % 6 === 0).forEach((v) => {
      boards.push({ label: `class diagram ${v.seed}`, strokes: strokesOf((s) => drawClassDiagram(s, v)) });
      boards.push({ label: `A2 ${v.seed}`, strokes: strokesOf((s) => drawClassPair(s, v)) });
    });
    SEQUENCE_VARIANTS.filter((_, i) => i % 4 === 0).forEach((v) => boards.push({ label: `sequence ${v.style} ${v.seed}`, strokes: strokesOf((s) => drawSequence(s, v)) }));
    STATE_VARIANTS.filter((_, i) => i % 4 === 0).forEach((v) => boards.push({ label: `state ${v.seed}`, strokes: strokesOf((s) => drawState(s, v)) }));
    ER_VARIANTS.filter((_, i) => i % 6 === 0).forEach((v) => boards.push({ label: `ER ${v.seed}`, strokes: strokesOf((s) => drawEr(s, v)) }));
    MINDMAP_VARIANTS.filter((_, i) => i % 6 === 0).forEach((v) => boards.push({ label: `mind map ${v.seed}`, strokes: strokesOf((s) => drawMindMap(s, v)) }));
    GARMENT_VARIANTS.filter((_, i) => i % 6 === 0).forEach((v) => boards.push({ label: `pattern piece ${v.seed}`, strokes: strokesOf((s) => drawGarment(s, v)) }));
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      boards.push({ label: `wireframe ${seed}`, strokes: strokesOf((s) => drawWireframe(s, seed)) });
      boards.push({ label: `writing ${seed}`, strokes: strokesOf((s) => drawWriting(s, seed)) });
      boards.push({ label: `molecule ${seed}`, strokes: strokesOf((s) => drawMolecule(s, seed)) });
      boards.push({ label: `row ${seed}`, strokes: [0, 1, 2].map((i) => handRect(200 + i * 160, 200 + (i === 1 ? 4 : 0), 120, 80, { seed: seed * 10 + i })) });
      boards.push({
        label: `hub ${seed}`,
        strokes: [
          handCircle(400, 400, 40, { seed: seed * 20 }),
          ...[[400, 200], [600, 400], [400, 600], [200, 400]].flatMap(([x, y], i) => [
            handCircle(x, y, 30, { seed: seed * 20 + i + 1 }),
            strokeLine({ x: 400 + (x - 400) * 0.25, y: 400 + (y - 400) * 0.25 }, { x: 400 + (x - 400) * 0.83, y: 400 + (y - 400) * 0.83 }, { seed: seed * 20 + i + 5 }),
          ]),
        ],
      });
    }
    const bad: string[] = [];
    const read: Record<string, number> = {};
    for (const b of boards) {
      const r = readNumerals(b.strokes);
      bad.push(...falseDigits(b.label, r.glyphs));
      for (const g of r.glyphs) if (g.glyph) read[g.glyph] = (read[g.glyph] ?? 0) + 1;
    }
    console.log(`numerals, ${boards.length} boards: read as ${Object.entries(read).map(([g, k]) => `${g} ×${k}`).join(', ') || 'nothing'}; ${bad.length} false digits`);
    for (const b of bad.slice(0, 8)) console.log('  ' + b);
    expect(bad).toEqual([]);
  }, 180_000);
});

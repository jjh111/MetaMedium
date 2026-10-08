// Waves (MATHS-SPEC §8, M27): a stroke that oscillates about an axis — wavy, a
// zigzag, or a coil of loops — read with its axis, how many half-periods it
// runs, how far its crests stand off and how evenly; and what is no wave: a
// line, an arc, a circle, a spiral scribbled solid, the corpus's single marks,
// writing. The trap, pinned: cursive oscillates, and a wave is regular and long
// against its amplitude where writing is neither — and what ink alone cannot
// settle (a scribble as regular as a wave) is said, with its rate.

import { describe, it, expect } from 'vitest';
import { waveOf, waveOfNode, WAVE_MIN_HALF_PERIODS, WAVE_LONG, WAVE_IRREGULAR, CURVE_NODES } from './waves';
import { wavyLine, zigzagLine, curlyLine } from '../notations/fixtures/feynman';
import { buildCases, buildTurnedCases, buildArcCases } from '../test/cases';
import { handCircle, handLine, handArc, handText, handPrint, rng } from '../test/strokes';
import { filledDot } from '../notations/fixtures/state';
import { drawWriting } from '../notations/fixtures/flowchart';
import { createSession } from '../session/session';
import type { Point } from '../types';

const A = { x: 100, y: 120 };
const along = (len: number, deg = 8): Point => ({ x: A.x + len * Math.cos((deg * Math.PI) / 180), y: A.y + len * Math.sin((deg * Math.PI) / 180) });

describe('a wave is read with its axis', () => {
  for (const k of [0.6, 1, 1.8]) {
    for (const seed of [1, 2, 3, 4]) {
      it(`a wavy line, ×${k}, seed ${seed}: wavy, its half-periods, its crests and a straight axis from end to end`, () => {
        const b = along(260 * k);
        const pts = wavyLine(A, b, { seed, amplitude: 7 * k, halfPeriod: 15 * k, jitter: 1.2 });
        const w = waveOf(pts)!;
        expect(w, 'read').not.toBeNull();
        expect(w.kind).toBe('wavy');
        expect(w.halfPeriods).toBeGreaterThan(15);
        expect(w.halfPeriods).toBeLessThan(19.5);
        expect(w.amplitude / (7 * k)).toBeGreaterThan(0.75);
        expect(w.amplitude / (7 * k)).toBeLessThan(1.15);
        expect(w.bend).toBeLessThan(15);
        expect(w.axis[0]).toEqual(pts[0]);
        expect(w.axis[w.axis.length - 1]).toEqual(pts[pts.length - 1]);
        expect(w.irregular).toBeLessThanOrEqual(WAVE_IRREGULAR);
        expect(w.reason).toMatch(/^a wavy line: \d+\.\d half-periods along a straight axis/);
      });

      it(`a coil of loops, ×${k}, seed ${seed}: curly, two half-periods a loop`, () => {
        const b = along(220 * k, -20);
        const w = waveOf(curlyLine(A, b, { seed, amplitude: 9 * k, halfPeriod: 7 * k, jitter: 1 }))!;
        expect(w, 'read').not.toBeNull();
        expect(w.kind).toBe('curly');
        // 220 along at 14 a loop: 16 loops, the last a part one.
        expect(w.halfPeriods / 2).toBeGreaterThan(14.5);
        expect(w.halfPeriods / 2).toBeLessThan(16.5);
        expect(w.amplitude / (9 * k)).toBeGreaterThan(0.85);
      });
    }
  }

  it('a zigzag drawn with a steady hand turns at its crests, and is told from a wavy line', () => {
    for (const seed of [1, 2, 3]) {
      const w = waveOf(zigzagLine(A, along(280), { seed, amplitude: 9, halfPeriod: 16, jitter: 0.4 }))!;
      expect(w.kind, `seed ${seed}: ${w.reason}`).toBe('zigzag');
      const s = waveOf(wavyLine(A, along(280), { seed, amplitude: 9, halfPeriod: 16, jitter: 0.4 }))!;
      expect(s.kind).toBe('wavy');
    }
  });

  it('a photon in a loop is an arc: its axis is read as a curve, not the chord', () => {
    for (const bow of [0.25, 0.4, -0.45]) {
      const pts = wavyLine(A, along(260), { seed: 7, amplitude: 6, halfPeriod: 13, jitter: 1, bow });
      const w = waveOf(pts)!;
      expect(w, `bow ${bow}`).not.toBeNull();
      expect(w.kind).toBe('wavy');
      // A sagitta of a quarter of the chord bends the axis about 106°, of 0.45 about 168°.
      expect(w.bend, `bow ${bow}`).toBeGreaterThan(Math.abs(bow) > 0.3 ? 130 : 80);
      // Along the arc, not the chord: longer than the 260 between its ends.
      expect(w.length).toBeGreaterThan(290);
      const coil = waveOf(curlyLine(A, along(260), { seed: 7, amplitude: 9, halfPeriod: 7, bow }))!;
      expect(coil.kind, `coil bow ${bow}`).toBe('curly');
      expect(coil.bend).toBeGreaterThan(80);
    }
  });

  it('a mark’s wave is read once on its ink as drawn, and its axis placed where the mark stands now', () => {
    const s = createSession();
    const id = s.addStroke(wavyLine(A, along(240), { seed: 3 }), 1000);
    const before = waveOfNode(s.getState().nodes.get(id)!)!;
    s.move({ ids: [id], dx: 500, dy: -40, at: 5000 });
    const after = waveOfNode(s.getState().nodes.get(id)!)!;
    expect(after.halfPeriods).toBe(before.halfPeriods);
    expect(after.axis[0].x - before.axis[0].x).toBeCloseTo(500, 6);
    expect(after.axis[0].y - before.axis[0].y).toBeCloseTo(-40, 6);
    expect(after.length).toBeCloseTo(before.length, 6);
  });
});

describe('what is no wave', () => {
  it('a straight line, an arc, a circle, a spiral or a zigzag scribbled solid, at any size', () => {
    for (const k of [0.6, 1, 2]) {
      for (const seed of [1, 2, 3, 4, 5]) {
        expect(waveOf(handLine(A, along(300 * k), { seed, jitter: 3 })), `line ${k} ${seed}`).toBeNull();
        expect(waveOf(handArc(300, 300, 120 * k, 10, 200, { seed })), `arc ${k} ${seed}`).toBeNull();
        expect(waveOf(handCircle(300, 300, 80 * k, { seed })), `circle ${k} ${seed}`).toBeNull();
        expect(waveOf(filledDot(300, 300, 10 * k, { style: 'spiral', seed })), `spiral ${k} ${seed}`).toBeNull();
        expect(waveOf(filledDot(300, 300, 10 * k, { style: 'zigzag', seed })), `scribble ${k} ${seed}`).toBeNull();
      }
    }
  });

  it('a wave too short, too few half-periods, or crests too uneven, is none', () => {
    // Two half-periods: too few to be a wave.
    expect(waveOf(wavyLine(A, along(30), { amplitude: 2, halfPeriod: 15, seed: 1 }))).toBeNull();
    // Crests that stand off as far as the line is long: not long against its amplitude.
    const tall = wavyLine(A, along(120), { amplitude: 30, halfPeriod: 15, seed: 1 });
    expect(waveOf(tall)).toBeNull();
    // Crests that rise and fall at random: not regular.
    const uneven = wavyLine(A, along(260), { seed: 2, amplitude: 7, halfPeriod: 15, vary: 0.9 });
    expect(waveOf(uneven)).toBeNull();
    expect(WAVE_MIN_HALF_PERIODS).toBe(3);
    expect(WAVE_LONG).toBeGreaterThan(10);
  });

  it('none of the recognition corpus’s single marks — every shape every way a hand draws it — is a wave', () => {
    const waves = [...buildCases(), ...buildTurnedCases(), ...buildArcCases()].filter((c) => waveOf(c.points)).map((c) => c.label);
    expect(waves).toEqual([]);
  });

  it('writing is no wave: the corpus’s words, the shared lines of writing, and printed letters', () => {
    const found: string[] = [];
    for (const c of buildCases().filter((c) => c.expect === 'text')) if (waveOf(c.points)) found.push(c.label);
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const s = createSession();
      drawWriting(s, seed);
      for (const n of s.getState().nodes.values()) if (waveOfNode(n)) found.push(`drawWriting ${seed} ${n.id}`);
      for (const stroke of handPrint('the sea and the wind now', 100, 200, { seed }).strokes) if (waveOf(stroke)) found.push(`printed seed ${seed}`);
    }
    expect(found).toEqual([]);
  });

  it('what ink alone cannot settle: a scribble as regular as a wave is one by its ink — said, a few in a hundred — and a short one runs straight', () => {
    // The corpus's scribble drawn a thousand ways: words of every width, height and hump count. A few are as
    // regular, and as long against their height, as a short photon; the notation tells them apart by where they
    // stand (a boson line meets a vertex), which feynman.bench.test.ts holds.
    const r = rng(17);
    let waves = 0, n = 0;
    for (let seed = 1; seed <= 1000; seed++) {
      const h = 16 + r() * 24, w = h * (1.2 + r() * 6);
      const humps = [5, Math.max(4, Math.round(w / 15)), Math.max(2, Math.round(w / 22)), 3 + Math.floor(r() * 8)][seed % 4];
      n++;
      const got = waveOf(handText(0, 0, w, h, { seed, humps, jitter: 0.5 + r() * 2 }));
      if (got) {
        waves++;
        // Whatever reads as one reads as a regular one, and a short one as straight.
        expect(got.irregular).toBeLessThanOrEqual(WAVE_IRREGULAR);
        if (got.halfPeriods < CURVE_NODES - 2) expect(got.bend).toBe(0);
      }
    }
    console.log(`  scribbles read as a wave by their ink: ${waves} of ${n}`);
    expect(waves / n).toBeLessThan(0.03);
  });
});

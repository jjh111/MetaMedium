// The coordinate plane (MATHS-SPEC §8 Lane C, M19; T4's axes).
//
// Red first: a plane drawn from two arrows with ticks at 1 and 2 reads its scale. Around it: the reading's words
// (*a coordinate plane — x from −3 to 3, y from 0 to 9*), a point on the plane as its coordinates, a curve on it
// read as a function, the writing at an axis's end naming it, and the numbers at its ticks claimed as the axes' own.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import { describeNotation, notationsOf, NOTATION_FLOOR, notationById, registeredNotations } from './notation';
import { PLANE, PLANE_CLAIM_FLOOR, PLANE_OFFER_FLOOR, planesIn, planeWordIds, readPlane, axisNameOf, tickValueOf } from './plane';
import { drawPlane, putText } from './fixtures/plane';
import type { PlaneVariant } from './fixtures/plane';
import { handArrow, handCircle, handDot, handLine } from '../test/strokes';
import { canvasToPlane, planeToCanvas } from '../maths/plot';
import { handCurve } from '../maths/fixtures/curves';

const V = (style: PlaneVariant['style'], seed = 3, jitter = 2, unit = 60): PlaneVariant => ({ seed, jitter, style, unit });

describe('registered', () => {
  it('reads from the start, and its claim floor is the notation floor', () => {
    expect(registeredNotations()).toContain('plane');
    expect(notationById('plane')).toBe(PLANE);
    expect(PLANE_CLAIM_FLOOR).toBe(NOTATION_FLOOR);
  });
});

describe('red first: two arrows with ticks at 1 and 2 read their scale', () => {
  it('the unit is the tick spacing, from the numbers written by the ticks', () => {
    const s = createSession();
    const O = { x: 300, y: 300 };
    s.addStroke(handArrow({ x: 100, y: 300 }, { x: 560, y: 300 }, { seed: 1, jitter: 2, headLen: 16, wings: 2 }), 1000);
    s.addStroke(handArrow({ x: 300, y: 520 }, { x: 300, y: 60 }, { seed: 2, jitter: 2, headLen: 16, wings: 2 }), 6000);
    // Ticks at 1 and 2 on each axis, 80 px a unit.
    [1, 2].forEach((i) => {
      s.addStroke(handLine({ x: 300 + i * 80, y: 294 }, { x: 300 + i * 80, y: 306 }, { seed: 10 + i, jitter: 0.5 }), 10000 + i * 4000);
      s.addStroke(handLine({ x: 294, y: 300 - i * 80 }, { x: 306, y: 300 - i * 80 }, { seed: 20 + i, jitter: 0.5 }), 20000 + i * 4000);
      putText(s, String(i), { x: 300 + i * 80, y: 320 });
      putText(s, String(i), { x: 276, y: 300 - i * 80 });
    });
    const planes = planesIn(s.getState());
    expect(planes).toHaveLength(1);
    const p = planes[0];
    expect(p.confidence).toBeGreaterThanOrEqual(NOTATION_FLOOR);
    expect(p.x.how).toBe('numbers');
    expect(p.x.perUnit).toBeGreaterThan(78);
    expect(p.x.perUnit).toBeLessThan(82);
    expect(p.x.at).toBe(0);
    expect(p.y.perUnit).toBeGreaterThan(78);
    expect(p.y.perUnit).toBeLessThan(82);
    // The plane maps its own numbers onto the ink.
    const c = planeToCanvas(p, { x: 2, y: 1 });
    expect(Math.hypot(c.x - 460, c.y - 220)).toBeLessThan(3);
    const q = canvasToPlane(p, { x: 380, y: 140 });
    expect(q.x).toBeCloseTo(1, 1);
    expect(q.y).toBeCloseTo(2, 1);
    // Its extent is where the axes are drawn to.
    expect(p.x.lo).toBeCloseTo(-200 / 80, 1);
    expect(p.x.hi).toBeCloseTo(260 / 80, 1);
    expect(p.y.hi).toBeCloseTo(240 / 80, 1);
    void O;
  });
});

describe('a plane is said in the person’s words', () => {
  const s = createSession();
  const e = drawPlane(s, V('full'));
  const readings = notationsOf(s.getState());
  const r = readings.find((x) => x.notation === 'plane')!;

  it('reads as a coordinate plane above the floor, first of the notations that read', () => {
    expect(r).toBeDefined();
    expect(r.confidence).toBeGreaterThanOrEqual(NOTATION_FLOOR);
    expect(readings[0].notation).toBe('plane');
    expect(describeNotation(r)).toMatch(/^a coordinate plane 0\.\d\d — x from −3\.[45]\d? to 3\.[56]\d?, y from −3\.[23]\d? to 3\.[45]\d?/);
  });
  it('says the axes, the ticks, the numbers and the names', () => {
    expect(r.counts).toMatchObject({ axis: 2, number: 12, name: 2 });
    expect(r.counts.tick).toBe(12);
    expect(r.symbols.filter((x) => x.symbol === 'axis').map((x) => x.id)).toEqual([e.x, e.y]);
    expect(r.symbols.find((x) => x.id === e.x)!.reason).toMatch(/^the x axis, from −3\.[45]\d? to 3\.[56]\d?$/);
    expect(r.symbols.find((x) => x.id === e.x)!.role).toBe('container');
    expect(r.symbols.find((x) => x.symbol === 'tick')!.role).toBe('annotation');
    expect(r.labels.filter((l) => l.text === 'x' || l.text === 'y')).toHaveLength(2);
    expect(r.unplaced).toEqual([]);
  });
  it('derives: the log holds only the ink and the texts', () => {
    expect(s.getEvents().every((ev) => !/plane|axis/.test(ev.type))).toBe(true);
  });
});

describe('a point on the plane reads as its coordinates', () => {
  it('a dot at (2, 3) is (2, 3), and a small ring at (−1, 2) is (−1, 2)', () => {
    const s = createSession();
    const O = { x: 400, y: 330 }, U = 60;
    drawPlane(s, V('full', 3, 1.5, U));
    s.addStroke(handDot(O.x + 2 * U, O.y - 3 * U, 4, { seed: 5 }), 90000);
    s.addStroke(handCircle(O.x - U, O.y - 2 * U, 6, { seed: 6, jitter: 0.5 }), 95000);
    const p = planesIn(s.getState())[0];
    expect(p.points.map((q) => q.text)).toEqual(['(2, 3)', '(−1, 2)']);
    expect(p.points[1].ring).toBe(true);
    const r = readPlane(s.getState())!;
    expect(r.counts.point).toBe(2);
    expect(r.symbols.filter((x) => x.symbol === 'point').map((x) => x.reason)).toEqual(['the point (2, 3)', 'the point (−1, 2)']);
    expect(describeNotation(r)).toContain('two points');
  });
});

describe('a curve on the plane is read as a function', () => {
  it('a parabola on axes numbered −3 to 3 and 0 to 9 reads y = x², and the plane says so', () => {
    const s = createSession();
    const O = { x: 300, y: 500 }, U = 60;
    // x from −3 to 3 and y from 0 to 9 at 60 / 36 px a unit: a half plane, arrows, ticks and numbers.
    s.addStroke(handArrow({ x: 300 - 3.5 * U, y: O.y }, { x: 300 + 3.6 * U, y: O.y }, { seed: 1, jitter: 1.5, headLen: 16, wings: 2 }), 1000);
    s.addStroke(handArrow({ x: 300, y: O.y }, { x: 300, y: O.y - 9.5 * 36 }, { seed: 2, jitter: 1.5, headLen: 16, wings: 2 }), 6000);
    for (const i of [-3, -2, -1, 1, 2, 3]) {
      s.addStroke(handLine({ x: 300 + i * U, y: O.y - 6 }, { x: 300 + i * U, y: O.y + 6 }, { seed: 10 + i + 5, jitter: 0.4 }), 10000 + (i + 5) * 4000);
      putText(s, String(i).replace('-', '−'), { x: 300 + i * U, y: O.y + 20 }, i < 0 ? 24 : 14);
    }
    for (const i of [3, 6, 9]) {
      s.addStroke(handLine({ x: 294, y: O.y - i * 36 }, { x: 306, y: O.y - i * 36 }, { seed: 30 + i, jitter: 0.4 }), 40000 + i * 1000);
      putText(s, String(i), { x: 276, y: O.y - i * 36 });
    }
    const p0 = planesIn(s.getState(), undefined, { fits: false })[0];
    expect(p0.x.perUnit).toBeCloseTo(60, 0);
    expect(p0.y.perUnit).toBeCloseTo(36, 0);
    const stroke = handCurve(p0, (x) => x * x, -3, 3, { seed: 4, jitter: 2.5 });
    s.addStroke(stroke, 100000);
    const part = planesIn(s.getState())[0];
    expect(part.curves).toHaveLength(1);
    const fit = part.curves[0].fit;
    expect(fit.ok && fit.fits[0].family).toBe('parabola');
    expect(fit.ok && fit.fits[0].best.text).toBe('y = x²');
    const r = readPlane(s.getState())!;
    expect(describeNotation(r)).toMatch(/one curve \(y = x²\)/);
    expect(r.symbols.find((x) => x.symbol === 'curve')!.reason).toMatch(/^a parabola, y = x², within \d+% of the span$/);
  });
});

describe('writing at an axis’s end names it', () => {
  it('t and θ, and the sentence says them', () => {
    const s = createSession();
    drawPlane(s, V('arrows'));
    putText(s, 't', { x: 400 + 3.6 * 60 + 22, y: 332 }, 12);
    putText(s, 'θ', { x: 402, y: 330 - 3.5 * 60 - 22 }, 12);
    const r = readPlane(s.getState())!;
    expect(r.planes[0].xAxis.name).toBe('t');
    expect(r.planes[0].yAxis.name).toBe('θ');
    expect(r.summary).toMatch(/^t from .*, θ from /);
  });
  it('what is a name and what is a number', () => {
    expect(tickValueOf('−2')).toBe(-2);
    expect(tickValueOf('1.5')).toBe(1.5);
    expect(tickValueOf('π/2')).toBeCloseTo(Math.PI / 2, 9);
    expect(tickValueOf('2π')).toBeCloseTo(2 * Math.PI, 9);
    expect(tickValueOf('y = 3')).toBeNull();
    expect(tickValueOf('x')).toBeNull();
    expect(axisNameOf('x')).toBe('x');
    expect(axisNameOf('θ')).toBe('θ');
    expect(axisNameOf('time (s)')).toBe('time (s)');
    expect(axisNameOf('y = x²')).toBeNull();
    expect(axisNameOf('3')).toBeNull();
  });
});

describe('the scale', () => {
  it('numbers fix it, a number with the origin fixes it, ticks alone make a tick a unit, nothing assumes and says', () => {
    const how = (style: PlaneVariant['style']) => planesIn(drawn(style).getState())[0];
    const drawn = (style: PlaneVariant['style']) => { const s = createSession(); drawPlane(s, V(style)); return s; };
    expect(how('full').x.how).toBe('numbers');
    expect(how('full').x.perUnit).toBeGreaterThan(58);
    expect(how('full').x.perUnit).toBeLessThan(62);
    expect(how('names').x.how).toBe('ticks');
    expect(how('names').x.perUnit).toBeGreaterThan(58);
    expect(how('names').x.perUnit).toBeLessThan(62);
    const bare = how('arrows');
    expect(bare.x.how).toBe('assumed');
    expect(bare.y.perUnit).toBe(bare.x.perUnit);
    expect(bare.summary).toMatch(/the scale assumed/);
    expect(bare.x.reason).toMatch(/^the scale assumed: the axes five units from the crossing/);
    // One number and the origin.
    const s = createSession();
    drawPlane(s, V('arrows'));
    putText(s, '2', { x: 400 + 2 * 60, y: 350 });
    const one = planesIn(s.getState())[0];
    expect(one.x.how).toBe('number and origin');
    expect(one.x.perUnit).toBeCloseTo(60, -1);
  });
  it('numbers that run the wrong way are not a scale', () => {
    const s = createSession();
    drawPlane(s, V('arrows'));
    putText(s, '2', { x: 400 + 60, y: 350 });
    putText(s, '1', { x: 400 + 120, y: 350 });
    expect(planesIn(s.getState())[0].x.how).toBe('assumed');
  });
});

describe('the numbers at a plane’s ticks are its own, not the axes’ lengths', () => {
  it('the dimensions leave them out: no scale chip, no problem standing on a plane', async () => {
    const { boardMaths, mathsChips } = await import('../maths/board');
    const s = createSession();
    drawPlane(s, V('full'));
    const claimed = planeWordIds(s.getState());
    expect(claimed.size).toBeGreaterThanOrEqual(12);
    const b = boardMaths(s.getState());
    expect(b === null || mathsChips(b).length === 0).toBe(true);
  });
  it('a plane under the floor claims nothing', () => {
    const s = createSession();
    drawPlane(s, V('bare'));
    putText(s, '24', { x: 460, y: 350 });
    expect(planeWordIds(s.getState()).size).toBe(0);
  });
});

describe('what a plane is not', () => {
  it('a bare plus is held under the floor but can still host a curve; a half plane and a corner less so', () => {
    const conf = (style: PlaneVariant['style']) => {
      const s = createSession();
      drawPlane(s, V(style));
      return planesIn(s.getState())[0]?.confidence ?? 0;
    };
    const bare = conf('bare');
    expect(bare).toBeGreaterThanOrEqual(PLANE_OFFER_FLOOR);
    expect(bare).toBeLessThan(NOTATION_FLOOR);
    expect(conf('full')).toBeGreaterThan(conf('arrows'));
    expect(conf('arrows')).toBeGreaterThanOrEqual(NOTATION_FLOOR);
    expect(conf('arrows')).toBeGreaterThan(bare);
  });
  it('a pendulum’s ceiling and rod, a right triangle’s legs and a flowchart’s crossing arrows are not axes', () => {
    const none = (draw: (s: ReturnType<typeof createSession>) => void) => {
      const s = createSession();
      draw(s);
      return (planesIn(s.getState())[0]?.confidence ?? 0) < PLANE_OFFER_FLOOR;
    };
    // Ceiling and rod, the rod hanging from the middle.
    expect(none((s) => { s.addStroke(handLine({ x: 300, y: 100 }, { x: 500, y: 100 }, { seed: 1 }), 1000); s.addStroke(handLine({ x: 400, y: 100 }, { x: 400, y: 330 }, { seed: 2 }), 6000); })).toBe(true);
    // A right triangle ruled in three lines.
    expect(none((s) => { s.addStroke(handLine({ x: 100, y: 400 }, { x: 340, y: 400 }, { seed: 1 }), 1000); s.addStroke(handLine({ x: 100, y: 400 }, { x: 100, y: 200 }, { seed: 2 }), 6000); s.addStroke(handLine({ x: 100, y: 200 }, { x: 340, y: 400 }, { seed: 3 }), 11000); })).toBe(true);
    // Two crossing arrows between boxes.
    expect(none((s) => {
      s.addStroke(handArrow({ x: 150, y: 300 }, { x: 450, y: 300 }, { seed: 1 }), 1000);
      s.addStroke(handArrow({ x: 300, y: 450 }, { x: 300, y: 150 }, { seed: 2 }), 6000);
      for (const [x, y] of [[100, 300], [500, 300], [300, 480], [300, 120]]) s.addStroke(handCircle(x, y, 38, { seed: x + y }), 12000 + x * 10);
    })).toBe(true);
  });
});

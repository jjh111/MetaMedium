import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import { measure, describeMaths, RIGHT_ANGLE_TOLERANCE } from './measure';
import { boundsOf } from './nodes';
import { circleStroke, rectStroke, lineStroke, triangleStroke, handText, handArrow, handRect, handBox, inkOf } from '../test/strokes';
import { boxCorners, parallelogramCorners, handShape } from '../notations/fixtures/hand';
import { solveBoard } from '../maths/solve';
import { TRIANGLE_LABELS, TRIANGLE_CORNERS, TRIANGLE_SQUARE, TRIANGLE_LABEL_BOXES, TRIANGLE_EXPECTED } from '../maths/fixtures/triangle';

const built = (pts: { x: number; y: number }[]) => {
  const s = createSession();
  const id = s.addStroke(pts, 1000);
  return measure(s.getState().nodes.get(id)!, s.getState().nodes);
};
const get = (m: ReturnType<typeof built>, key: string) => m!.measures.find((x) => x.key === key)!.value;

describe('measure — the maths of a mark', () => {
  it('a circle has a centre, a radius, a circumference and an area', () => {
    const m = built(circleStroke(300, 200, 80));
    expect(m!.shape).toBe('circle');
    expect(get(m, 'radius')).toBe(80);
    expect(get(m, 'circumference')).toBe(Math.round(2 * Math.PI * 80));
    expect(get(m, 'area')).toBe(Math.round(Math.PI * 80 * 80));
    expect(m!.measures.find((x) => x.key === 'centre')!.at).toEqual({ x: 300, y: 200 });
  });

  it('a rectangle has width, height, perimeter, area and aspect', () => {
    const m = built(rectStroke(100, 100, 200, 120));
    expect(get(m, 'width')).toBe(200);
    expect(get(m, 'height')).toBe(120);
    expect(get(m, 'perimeter')).toBe(640);
    expect(get(m, 'area')).toBe(24000);
  });

  it('a line has a length and a heading, up being 90°', () => {
    const m = built(lineStroke({ x: 100, y: 300 }, { x: 100, y: 100 }));
    expect(m!.shape).toBe('line');
    expect(get(m, 'length')).toBe(200);
    expect(get(m, 'heading')).toBe(90);
  });

  it('an arrow reports where it points, tail to tip', () => {
    const m = built(handArrow({ x: 100, y: 100 }, { x: 400, y: 100 }, { seed: 1 }));
    expect(m!.shape).toBe('arrow');
    expect(Math.abs(get(m, 'heading'))).toBeLessThan(6);
  });

  it('a triangle\'s angles sum to 180°', () => {
    const m = built(triangleStroke({ x: 200, y: 100 }, { x: 320, y: 300 }, { x: 80, y: 300 }));
    expect(m!.shape).toBe('triangle');
    const sum = ['angle0', 'angle1', 'angle2'].reduce((a, k) => a + get(m, k), 0);
    expect(Math.abs(sum - 180)).toBeLessThanOrEqual(2);
  });

  it('writing has no maths', () => {
    expect(built(handText(100, 100, 200, 40, { seed: 2 }))).toBeNull();
  });

  it('describes itself on one line', () => {
    const m = built(circleStroke(300, 200, 80));
    expect(describeMaths(m!)).toMatch(/^centre \(300, 200\) · radius 80px · circumference \d+px · area [\d,]+px²$/);
  });
});

// ===== A turned box by its sides (V1-PLAN §9 D2, the maths lane's item from S1) =====

describe('measure — a box by its sides, at whatever angle it stands', () => {
  it('a box turned 30° measures its own sides, not the upright box around it', () => {
    // Its axis-aligned bounds are 233×204; its sides are 200 and 120.
    const m = built(inkOf(boxCorners(300, 300, 200, 120, 30), true));
    expect(m!.shape).toBe('rectangle');
    expect(get(m, 'width')).toBe(200);
    expect(get(m, 'height')).toBe(120);
    expect(get(m, 'perimeter')).toBe(640);
    expect(get(m, 'area')).toBe(24000);
    expect(get(m, 'aspect')).toBe(1.7);
  });

  it('drawn by hand, turned either way, within a few px of its sides — the side nearer level is its width', () => {
    for (const [turn, w, h] of [[20, 200, 120], [-35, 200, 120], [60, 120, 200]] as const) {
      const m = built(handBox(300, 300, 200, 120, turn, { seed: 7 + turn, jitter: 1.5 }));
      expect(m!.shape, `turned ${turn}°`).toBe('rectangle');
      expect(Math.abs(get(m, 'width') - w), `turned ${turn}°: width ${get(m, 'width')}`).toBeLessThanOrEqual(4);
      expect(Math.abs(get(m, 'height') - h), `turned ${turn}°: height ${get(m, 'height')}`).toBeLessThanOrEqual(4);
    }
  });

  it('a box drawn upright measures as it always did — the box its ink fills', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      for (const [w, h] of [[200, 140], [320, 130], [170, 170]]) {
        const s = createSession();
        const id = s.addStroke(handRect(100, 100, w, h, { seed, jitter: 2.5 }), 1000);
        const node = s.getState().nodes.get(id)!;
        const b = boundsOf(node)!;
        const m = measure(node, s.getState().nodes)!;
        expect(get(m, 'width'), `${w}×${h} seed ${seed}`).toBe(Math.round(b.maxX - b.minX));
        expect(get(m, 'height'), `${w}×${h} seed ${seed}`).toBe(Math.round(b.maxY - b.minY));
        expect(m.measures.some((x) => x.key === 'lean')).toBe(false);
      }
    }
  });

  it('a box that leans — a flowchart’s data symbol — measures its base, its height and its lean', () => {
    // 180 wide, 64 high, its top 28 to the right of its bottom: the sides lean 24°.
    const m = built(inkOf(parallelogramCorners(300, 300, 180, 64, 28), true));
    expect(m!.shape).toBe('rectangle');
    expect(get(m, 'width')).toBe(180);
    expect(get(m, 'height')).toBe(64);
    expect(get(m, 'area')).toBe(11520);
    expect(get(m, 'perimeter')).toBe(500);
    expect(get(m, 'lean')).toBe(24);
    const hand = built(handShape(parallelogramCorners(300, 300, 180, 64, 28), { seed: 3, jitter: 2 }));
    expect(Math.abs(get(hand, 'lean') - 24)).toBeLessThanOrEqual(4);
  });
});

// ===== In units, when numbers are written on the mark (MATHS-PLAN §4; DIRECTOR-PLAN-W2 M4) =====

describe('measure — in the drawing’s units, when numbers are written on the mark', () => {
  function labelled(opts: { labels?: boolean } = {}) {
    const s = createSession();
    const { right, longLegEnd, shortLegEnd } = TRIANGLE_CORNERS;
    const tri = s.addStroke(triangleStroke(right, longLegEnd, shortLegEnd), 1000);
    s.addStroke(rectStroke(TRIANGLE_SQUARE.x, TRIANGLE_SQUARE.y, TRIANGLE_SQUARE.size, TRIANGLE_SQUARE.size, 12), 20000);
    const line = s.addStroke(lineStroke({ x: 600, y: 300 }, { x: 900, y: 300 }), 40000);
    if (opts.labels !== false) {
      const t = (code: string, bounds: { minX: number; maxX: number; minY: number; maxY: number }, at: number) =>
        s.import({ kind: 'text', path: `text/${at}.txt`, name: code, bounds, code, at });
      t(TRIANGLE_LABELS.legs[0], TRIANGLE_LABEL_BOXES.longLeg, 60000);
      t(TRIANGLE_LABELS.legs[1], TRIANGLE_LABEL_BOXES.shortLeg, 61000);
      t(TRIANGLE_LABELS.long, TRIANGLE_LABEL_BOXES.longSide, 62000);
    }
    return { s, tri, line };
  }

  it('the tolerance a measured corner reads as right within is one constant, and the labels print it', () => {
    expect(RIGHT_ANGLE_TOLERANCE).toBeGreaterThan(0);
    const { s, tri } = labelled();
    const m = measure(s.getState().nodes.get(tri)!, s.getState().nodes)!;
    expect(m.measures.filter((x) => x.label.includes('(right)'))).toHaveLength(1);
  });

  it('a mark that carries no labels measures exactly as before — board or no board', () => {
    const { s, line, tri } = labelled();
    const st = s.getState();
    const board = solveBoard(st, { unit: 'in' });
    const plain = measure(st.nodes.get(line)!, st.nodes);
    expect(measure(st.nodes.get(line)!, st.nodes, board)).toEqual(plain);
    expect(describeMaths(measure(st.nodes.get(line)!, st.nodes, board)!)).toBe(describeMaths(plain!));
    const bare = labelled({ labels: false });
    const bst = bare.s.getState();
    expect(measure(bst.nodes.get(bare.tri)!, bst.nodes, solveBoard(bst))).toEqual(measure(bst.nodes.get(bare.tri)!, bst.nodes));
    expect(tri).toBeDefined();
  });

  it('a labelled triangle speaks inches: what was derived, with its formula, the conflict and the other reading', () => {
    const { s, tri } = labelled();
    const st = s.getState();
    const m = measure(st.nodes.get(tri)!, st.nodes, solveBoard(st, { unit: 'in' }))!;
    expect(m.unit).toBe('in');
    const long = m.values!.find((v) => v.label === 'the long side')!;
    expect(long).toMatchObject({ from: 'derived', text: TRIANGLE_EXPECTED.longSide, formula: TRIANGLE_EXPECTED.formula });
    expect(m.conflicts!.map((c) => c.reason)).toEqual([TRIANGLE_EXPECTED.conflict]);
    expect(m.readings).toContain(TRIANGLE_EXPECTED.other);
    expect(m.scale).toMatch(/to scale within \d+%/);
    // The measures of the ink are still there, in px, as they always were.
    expect(m.measures.find((x) => x.key === 'side0')!.unit).toBe('px');
    const line = describeMaths(m);
    expect(line).toContain(`the long side ${TRIANGLE_EXPECTED.longSide} = ${TRIANGLE_EXPECTED.formula}`);
    expect(line).toContain(TRIANGLE_EXPECTED.conflict);
    expect(line).toContain(`or ${TRIANGLE_EXPECTED.other}`);
    expect(line).toMatch(/side AB \d+px/);
  });
});

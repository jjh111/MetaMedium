// Connector heads — what sits at each end of a line or arrow (V1-PLAN §3, §9 E3).
//
// A connector's kind is written at its ends: an open arrow (the arrow's own
// barb), a small closed triangle, diamond or circle touching the end — each
// hollow or filled. Filled is ink coverage inside the head relative to the
// head's own area, never a pixel count: a fast hatch leaves gaps, and the
// same hatch at three times the size must read the same. A letter or a word
// at a line's end is writing, not a head. Every reading is derived, with a
// confidence and a reason, and nothing is written to the log.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import type { Session } from '../session/session';
import { headsOf, connectorHeads, FILLED_AT } from './heads';
import type { HeadReading } from './heads';
import { lineStroke, circleStroke, triangleStroke, rectStroke, handArrow, handPolygon, handText } from '../test/strokes';
import type { Point } from '../types';

// ===== Drawing heads =====

const centroid = (poly: Point[]): Point => ({
  x: poly.reduce((a, p) => a + p.x, 0) / poly.length,
  y: poly.reduce((a, p) => a + p.y, 0) / poly.length,
});

/** Where a level line at `y` enters and leaves a convex polygon, or null. */
function chordAt(poly: Point[], y: number): [number, number] | null {
  const xs: number[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if ((a.y - y) * (b.y - y) > 0 || a.y === b.y) continue;
    xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
  }
  if (xs.length < 2) return null;
  return [Math.min(...xs), Math.max(...xs)];
}

/**
 * A fill the way a hand lays one: one stroke going back and forth across the
 * head, `passes` times, kept inside its outline by `inset` of its size (so it
 * never scratches the outline out). `skip` leaves a band clear — the shaft
 * that runs through an arrow's own barb — and the hatch crosses it once.
 */
function hatch(poly: Point[], passes: number, inset = 0.2, skip?: { y: number; half: number }): Point[] {
  const c = centroid(poly);
  const shrunk = poly.map((p) => ({ x: c.x + (p.x - c.x) * (1 - inset), y: c.y + (p.y - c.y) * (1 - inset) }));
  const minY = Math.min(...shrunk.map((p) => p.y)), maxY = Math.max(...shrunk.map((p) => p.y));
  const out: Point[] = [];
  let k = 0;
  for (let i = 0; i < passes; i++) {
    const y = minY + ((i + 0.5) / passes) * (maxY - minY);
    if (skip && Math.abs(y - skip.y) < skip.half) continue;
    const chord = chordAt(shrunk, y);
    if (!chord) continue;
    const [x0, x1] = chord;
    const from = k % 2 ? { x: x1, y } : { x: x0, y };
    const to = k % 2 ? { x: x0, y } : { x: x1, y };
    if (out.length) out.push(...lineStroke(out[out.length - 1], from, 5).slice(1));
    out.push(...lineStroke(from, to, 10).slice(out.length ? 1 : 0));
    k++;
  }
  return out;
}

const ring = (c: Point, r: number, n = 32): Point[] =>
  Array.from({ length: n }, (_, i) => ({ x: c.x + r * Math.cos((i / n) * 2 * Math.PI), y: c.y + r * Math.sin((i / n) * 2 * Math.PI) }));

/** A connector from (100, 200) running right, `k` times the base size: 300 long, its end at x = 100 + 300k. */
function connector(s: Session, k = 1, at = 1000): { id: string; end: Point } {
  const end = { x: 100 + 300 * k, y: 200 };
  return { id: s.addStroke(lineStroke({ x: 100, y: 200 }, end, 60), at), end };
}

const triangleAt = (end: Point, k = 1): Point[] => [
  { x: end.x, y: end.y - 15 * k },
  { x: end.x + 30 * k, y: end.y },
  { x: end.x, y: end.y + 15 * k },
];
const diamondAt = (end: Point, k = 1): Point[] => [
  { x: end.x, y: end.y },
  { x: end.x + 20 * k, y: end.y - 11 * k },
  { x: end.x + 40 * k, y: end.y },
  { x: end.x + 20 * k, y: end.y + 11 * k },
];
const closed = (poly: Point[]) => handPolygon(poly, { jitter: 0, round: 0, density: 1 });

const top = (s: Session, id: string, which: 'start' | 'end' = 'end'): HeadReading | undefined => headsOf(s.getState(), id)![which].heads[0];

// ===== The heads =====

describe('the arrow’s own barb', () => {
  it('two wings: an open arrow at the end it points to, nothing at its tail', () => {
    const s = createSession();
    const id = s.addStroke(handArrow({ x: 100, y: 200 }, { x: 400, y: 200 }, { wings: 2, seed: 1 }), 1000);
    const h = headsOf(s.getState(), id)!;
    expect(h.shape).toBe('arrow');
    expect(h.end.heads[0]).toMatchObject({ kind: 'arrow', filled: false, ids: [id] });
    expect(h.end.point.x).toBeGreaterThan(390);
    expect(h.start.heads).toEqual([]);
    expect(h.start.reason).toMatch(/plain/);
  });

  it('one wing is an open arrow too', () => {
    const s = createSession();
    const id = s.addStroke(handArrow({ x: 100, y: 200 }, { x: 400, y: 200 }, { wings: 1, seed: 2 }), 1000);
    expect(top(s, id)).toMatchObject({ kind: 'arrow', filled: false });
  });

  it('a barb drawn head first sits at the stroke’s start', () => {
    const s = createSession();
    const id = s.addStroke(handArrow({ x: 100, y: 200 }, { x: 400, y: 200 }, { wings: 2, seed: 3, headAt: 'start' }), 1000);
    const h = headsOf(s.getState(), id)!;
    expect(h.start.heads[0]).toMatchObject({ kind: 'arrow', filled: false });
    expect(h.end.heads).toEqual([]);
  });

  it('a barb closed in the same stroke as its shaft is a hollow triangle', () => {
    const s = createSession();
    const tip = { x: 400, y: 200 }, w1 = { x: 376, y: 186 }, w2 = { x: 376, y: 214 };
    const pts = [
      ...lineStroke({ x: 100, y: 200 }, tip, 80),
      ...lineStroke(tip, w1, 12).slice(1),
      ...lineStroke(w1, w2, 12).slice(1),
      ...lineStroke(w2, tip, 12).slice(1),
    ];
    const id = s.addStroke(pts, 1000);
    const h = headsOf(s.getState(), id)!;
    expect(h.shape).toBe('arrow');
    expect(h.end.heads[0]).toMatchObject({ kind: 'triangle', filled: false, ids: [id] });
  });

  it('a barb filled with a hatch is a filled triangle', () => {
    const s = createSession();
    const pts = handArrow({ x: 100, y: 200 }, { x: 400, y: 200 }, { wings: 2, seed: 1 });
    const id = s.addStroke(pts, 1000);
    const barb = pts.filter((p) => p.x > 360);
    const w1 = barb.reduce((a, p) => (p.y < a.y ? p : a)), w2 = barb.reduce((a, p) => (p.y > a.y ? p : a));
    const fill = s.addStroke(hatch([{ x: 400, y: 200 }, w1, w2], 7, 0.3, { y: 200, half: 1.5 }), 5000);
    expect(s.getState().contentIds).toContain(id); // the fill is not a scratch across the arrow
    const head = top(s, id)!;
    expect(head).toMatchObject({ kind: 'triangle', filled: true });
    expect(head.ids).toEqual(expect.arrayContaining([id, fill]));
  });
});

describe('a small closed head touching the end', () => {
  it('a triangle, hollow', () => {
    const s = createSession();
    const c = connector(s);
    const tri = s.addStroke(triangleStroke(...(triangleAt(c.end) as [Point, Point, Point]), 20), 5000);
    const head = top(s, c.id)!;
    expect(head).toMatchObject({ kind: 'triangle', filled: false, ids: [tri] });
    expect(head.fill!).toBeLessThan(FILLED_AT);
    expect(head.tip.x).toBeCloseTo(c.end.x + 30, -1);
    expect(headsOf(s.getState(), c.id)!.start.heads).toEqual([]);
  });

  it('a triangle, filled', () => {
    const s = createSession();
    const c = connector(s);
    const poly = triangleAt(c.end);
    const tri = s.addStroke(triangleStroke(poly[0], poly[1], poly[2], 20), 5000);
    const fill = s.addStroke(hatch(poly, 6), 9000);
    const head = top(s, c.id)!;
    expect(head).toMatchObject({ kind: 'triangle', filled: true });
    expect(head.ids.sort()).toEqual([tri, fill].sort());
    expect(head.fill!).toBeGreaterThanOrEqual(FILLED_AT);
  });

  it('a diamond, hollow and filled', () => {
    const s = createSession();
    const c = connector(s);
    s.addStroke(closed(diamondAt(c.end)), 5000);
    expect(top(s, c.id)).toMatchObject({ kind: 'diamond', filled: false });

    const s2 = createSession();
    const c2 = connector(s2);
    s2.addStroke(closed(diamondAt(c2.end)), 5000);
    s2.addStroke(hatch(diamondAt(c2.end), 6), 9000);
    expect(top(s2, c2.id)).toMatchObject({ kind: 'diamond', filled: true });
  });

  it('a circle, hollow and filled', () => {
    const s = createSession();
    const c = connector(s);
    s.addStroke(circleStroke(c.end.x + 13, c.end.y, 13), 5000);
    expect(top(s, c.id)).toMatchObject({ kind: 'circle', filled: false });

    const s2 = createSession();
    const c2 = connector(s2);
    s2.addStroke(circleStroke(c2.end.x + 13, c2.end.y, 13), 5000);
    s2.addStroke(hatch(ring({ x: c2.end.x + 13, y: c2.end.y }, 13), 6), 9000);
    expect(top(s2, c2.id)).toMatchObject({ kind: 'circle', filled: true });
  });

  it('a separate open chevron at the end is an open arrow', () => {
    const s = createSession();
    const c = connector(s);
    const v = s.addStroke([...lineStroke({ x: 378, y: 186 }, c.end, 14), ...lineStroke(c.end, { x: 378, y: 214 }, 14).slice(1)], 5000);
    expect(top(s, c.id)).toMatchObject({ kind: 'arrow', filled: false, ids: [v] });
  });

  it('each end is read on its own: a diamond at the start, a filled triangle at the end', () => {
    const s = createSession();
    const c = connector(s);
    const start = { x: 100, y: 200 };
    s.addStroke(closed(diamondAt(start).map((p) => ({ x: 2 * start.x - p.x, y: p.y }))), 5000);
    const poly = triangleAt(c.end);
    s.addStroke(triangleStroke(poly[0], poly[1], poly[2], 20), 9000);
    s.addStroke(hatch(poly, 6), 13000);
    const h = headsOf(s.getState(), c.id)!;
    expect(h.start.heads[0]).toMatchObject({ kind: 'diamond', filled: false });
    expect(h.end.heads[0]).toMatchObject({ kind: 'triangle', filled: true });
  });
});

describe('filled is coverage relative to the head’s own area', () => {
  it('a fast hatch leaves gaps and still reads filled — the same at three times the size', () => {
    const cover: number[] = [];
    for (const k of [1, 3]) {
      const s = createSession();
      const c = connector(s, k);
      const poly = triangleAt(c.end, k);
      s.addStroke(triangleStroke(poly[0], poly[1], poly[2], 20), 5000);
      s.addStroke(hatch(poly, 3), 9000);
      const head = top(s, c.id)!;
      expect(head, `at ${k}×`).toMatchObject({ kind: 'triangle', filled: true });
      cover.push(head.fill!);
    }
    expect(Math.abs(cover[0] - cover[1])).toBeLessThan(0.1);
  });

  it('a hollow head stays hollow at any size', () => {
    for (const k of [1, 3]) {
      const s = createSession();
      const c = connector(s, k);
      s.addStroke(closed(diamondAt(c.end, k)), 5000);
      expect(top(s, c.id), `at ${k}×`).toMatchObject({ kind: 'diamond', filled: false });
    }
  });
});

describe('what is not a head', () => {
  it('a word printed at the line’s end is writing', () => {
    const s = createSession();
    const c = connector(s);
    const seg = (a: Point, b: Point) => lineStroke(a, b, 14);
    const x = c.end.x + 6, y = 185, h = 30;
    // N, A, V — printed letters the session gathers into one word.
    const strokes: Point[][] = [
      seg({ x, y: y + h }, { x, y }).concat(seg({ x, y }, { x: x + 18, y: y + h }).slice(1), seg({ x: x + 18, y: y + h }, { x: x + 18, y }).slice(1)),
      seg({ x: x + 26, y: y + h }, { x: x + 36, y }).concat(seg({ x: x + 36, y }, { x: x + 46, y: y + h }).slice(1)),
      seg({ x: x + 30, y: y + h * 0.6 }, { x: x + 42, y: y + h * 0.6 }),
      seg({ x: x + 54, y }, { x: x + 64, y: y + h }).concat(seg({ x: x + 64, y: y + h }, { x: x + 74, y }).slice(1)),
    ];
    let t = 5000;
    for (const pts of strokes) { s.addStroke(pts, t); t += 400; }
    const h2 = headsOf(s.getState(), c.id)!;
    expect(h2.end.heads).toEqual([]);
    expect(h2.end.reason).toMatch(/writing/);
  });

  it('a scribbled word at the line’s end is writing', () => {
    const s = createSession();
    const c = connector(s);
    s.addStroke(handText(c.end.x + 4, 186, 90, 28, { seed: 3 }), 5000);
    const h = headsOf(s.getState(), c.id)!;
    expect(h.end.heads).toEqual([]);
    expect(h.end.reason).toMatch(/writing/);
  });

  it('a letter somebody has read is writing, however round it is', () => {
    const s = createSession();
    const c = connector(s);
    const o = s.addStroke(circleStroke(c.end.x + 13, c.end.y, 13), 5000);
    expect(top(s, c.id)).toMatchObject({ kind: 'circle' });
    const pid = s.join('agent', 'llm:seeing', 6000, 2);
    s.propose({ participantId: pid, nodeId: o, edges: [], reps: [{ modality: 'transcript', data: { text: 'o' }, confidence: 0.9 }], at: 6100 });
    const h = headsOf(s.getState(), c.id)!;
    expect(h.end.heads).toEqual([]);
    expect(h.end.reason).toMatch(/writing/);
  });

  it('the box a connector runs to is a node, not a head', () => {
    const s = createSession();
    const c = connector(s);
    s.addStroke(rectStroke(c.end.x, 140, 200, 120), 5000);
    expect(headsOf(s.getState(), c.id)!.end.heads).toEqual([]);
  });

  it('a small mark beside the end, off the line’s axis, is not a head', () => {
    const s = createSession();
    const c = connector(s);
    // It touches the end, but it stands above the line, where a label would.
    s.addStroke(circleStroke(c.end.x + 4, c.end.y - 12, 10), 5000);
    expect(headsOf(s.getState(), c.id)!.end.heads).toEqual([]);
  });

  it('a plain line has plain ends', () => {
    const s = createSession();
    const c = connector(s);
    const h = headsOf(s.getState(), c.id)!;
    expect(h.shape).toBe('line');
    expect(h.start.heads).toEqual([]);
    expect(h.end.heads).toEqual([]);
  });

  it('only a line, an arrow or an arc is a connector', () => {
    const s = createSession();
    const box = s.addStroke(rectStroke(100, 100, 200, 120), 1000);
    expect(headsOf(s.getState(), box)).toBeNull();
    expect(headsOf(s.getState(), 'stroke:nope')).toBeNull();
  });
});

describe('heads are derived readings', () => {
  it('each with a confidence and a reason, the likeliest first', () => {
    const s = createSession();
    const c = connector(s);
    const poly = triangleAt(c.end);
    s.addStroke(triangleStroke(poly[0], poly[1], poly[2], 20), 5000);
    s.addStroke(hatch(poly, 6), 9000);
    const heads = headsOf(s.getState(), c.id)!.end.heads;
    expect(heads.length).toBeGreaterThan(0);
    for (const h of heads) {
      expect(h.confidence).toBeGreaterThan(0);
      expect(h.confidence).toBeLessThanOrEqual(1);
      expect(h.reason.length).toBeGreaterThan(10);
    }
    for (let i = 1; i < heads.length; i++) expect(heads[i - 1].confidence).toBeGreaterThanOrEqual(heads[i].confidence);
    expect(heads[0].reason).toMatch(/fill|cover/);
  });

  it('reading them writes nothing: the log and the graph are as they were', () => {
    const s = createSession();
    const c = connector(s);
    s.addStroke(closed(diamondAt(c.end)), 5000);
    const events = s.getEvents().length;
    const nodes = s.getState().nodes.size;
    const first = headsOf(s.getState(), c.id);
    const all = connectorHeads(s.getState());
    expect(s.getEvents().length).toBe(events);
    expect(s.getState().nodes.size).toBe(nodes);
    expect(headsOf(s.getState(), c.id)).toEqual(first);
    // Every connector on the board is read — the diamond is not one.
    expect(all.map((h) => h.id)).toEqual([c.id]);
    // State is a pure function of the log: replayed, the same reading.
    const again = createSession();
    again.load(s.getEvents());
    expect(headsOf(again.getState(), c.id)).toEqual(first);
  });
});

// The maths tool (DIRECTOR-PLAN-W2 M5; V1-PLAN §5 "Maths is a tool"): what the
// solver can do with the held marks, offered as the field offers everything —
// Show the sizes for a drawing whose numbers fix a side, Check the steps for a
// page, Print at true size when a figure stands in a unit. Tier 1, no model,
// and never for what e2e 49's golden scopes hold: a row of boxes, a molecule,
// a line of writing.

import { describe, it, expect } from 'vitest';
import type { Bounds, Point } from '../types';
import { createSession, type Session } from '../session/session';
import { lineStroke, rectStroke } from '../test/strokes';
import { offersFor, toolScope, takeOffer, getTool } from './registry';
import { rankOffers } from './rank';
import './builtin';
import { TRIANGLE_LABELS, TRIANGLE_CORNERS, TRIANGLE_SQUARE, TRIANGLE_LABEL_BOXES } from '../maths/fixtures/triangle';
import { APRON_LINES } from '../maths/fixtures/apron.sample';

// The harness's own strokes (Demos/session-engine.e2e.js, window.__helpers), as builtin.test.ts draws them.
const line = (a: Point, b: Point, n = 40): Point[] => Array.from({ length: n }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / (n - 1), y: a.y + ((b.y - a.y) * i) / (n - 1) }));
function rect(x: number, y: number, w: number, h: number): Point[] {
  const v = [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
  const mid = { x: (v[0].x + v[1].x) / 2, y: (v[0].y + v[1].y) / 2 };
  const path = [mid, v[1], v[2], v[3], v[0], mid];
  let p: Point[] = [];
  for (let i = 0; i < path.length - 1; i++) p = p.concat(line(path[i], path[i + 1], 26).slice(i ? 1 : 0));
  return p;
}
const circle = (cx: number, cy: number, r: number, n = 110): Point[] => Array.from({ length: n + 1 }, (_, i) => ({ x: cx + r * Math.cos((i / n) * Math.PI * 2), y: cy + r * Math.sin((i / n) * Math.PI * 2) }));
function word(x: number, y: number, w: number, h: number, humps = 7): Point[] {
  const p: Point[] = [];
  const n = humps * 14;
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = t * humps * Math.PI;
    p.push({ x: x + w * t, y: y + h / 2 - (h / 2) * Math.abs(Math.sin(a)) * (0.7 + 0.3 * Math.cos(a * 0.37)) });
  }
  return p;
}

let clock = 1000;
const draw = (s: Session, pts: Point[]) => s.addStroke(pts, (clock += 4000), undefined, 1);
const hold = (s: Session, ids: string[]) => { s.summonMarks(ids, (clock += 100)); };
const text = (s: Session, code: string, b: Bounds) => s.import({ kind: 'text', path: `text/${(clock += 10)}.txt`, name: code, bounds: b, code, at: clock })!;

/** The offers the maths tool makes for a held scope, ranked as the field ranks them. */
const mathsOffers = (s: Session) => rankOffers(offersFor(toolScope(s, {}))).filter((o) => o.tool === 'maths');

function triangle(unit = '', long?: string) {
  const s = createSession();
  const { right, longLegEnd, shortLegEnd } = TRIANGLE_CORNERS;
  const marks = [lineStroke(right, longLegEnd), lineStroke(shortLegEnd, right), lineStroke(longLegEnd, shortLegEnd)].map((p) => draw(s, p));
  marks.push(draw(s, rectStroke(TRIANGLE_SQUARE.x, TRIANGLE_SQUARE.y, TRIANGLE_SQUARE.size, TRIANGLE_SQUARE.size, 12)));
  marks.push(text(s, TRIANGLE_LABELS.legs[0] + unit, TRIANGLE_LABEL_BOXES.longLeg));
  marks.push(text(s, TRIANGLE_LABELS.legs[1] + unit, TRIANGLE_LABEL_BOXES.shortLeg));
  if (long) marks.push(text(s, long + unit, TRIANGLE_LABEL_BOXES.longSide));
  return { s, marks };
}

describe('the maths tool', () => {
  it('is registered, and says what it does', () => {
    const t = getTool('maths');
    expect(t).toBeDefined();
    expect(t!.describe().length).toBeGreaterThan(20);
  });

  it('a labelled triangle held: Show the sizes, saying the answer, and it leads — the numbers were written here', () => {
    const { s, marks } = triangle();
    hold(s, marks);
    const offers = mathsOffers(s);
    const sizes = offers.find((o) => o.key === 'maths:sizes')!;
    expect(sizes.label).toBe('Show the sizes');
    expect(sizes.reason).toContain('25.30');
    expect(sizes.asks).toBeUndefined();
    expect(sizes.grounds?.on).toBe('written');
    // Bare numbers have no unit, so nothing can be printed at true size.
    expect(offers.some((o) => o.key === 'maths:print')).toBe(false);
    const all = rankOffers(offersFor(toolScope(s, {})));
    expect(all[0].key).toBe('maths:sizes');
  });

  it('with a unit written, Print at true size is offered too', () => {
    const { s, marks } = triangle('″');
    hold(s, marks);
    const keys = mathsOffers(s).map((o) => o.key);
    expect(keys).toEqual(expect.arrayContaining(['maths:sizes', 'maths:print']));
  });

  it('a drawing whose labels cannot hold: Show the sizes says so', () => {
    const { s, marks } = triangle('', '24');
    hold(s, marks);
    const sizes = mathsOffers(s).find((o) => o.key === 'maths:sizes')!;
    expect(sizes.reason).toContain('labelled 24; legs of 24 and 8 make it 25.30');
  });

  it('a page of steps held: Check the steps, saying how many agree', () => {
    const s = createSession();
    const page = text(s, APRON_LINES.join('\n'), { minX: 100, maxX: 500, minY: 100, maxY: 400 });
    hold(s, [page]);
    const check = mathsOffers(s).find((o) => o.key === 'maths:steps')!;
    expect(check.label).toBe('Check the steps');
    expect(check.reason).toMatch(/6 steps/);
  });

  it('taking it writes nothing: the sizes are derived, and the ink stays', () => {
    const { s, marks } = triangle();
    hold(s, marks);
    const offer = mathsOffers(s).find((o) => o.key === 'maths:sizes')!;
    const before = s.getEvents().length;
    const taken = takeOffer(offer, toolScope(s, {}), s, (clock += 100));
    expect(taken.host).toBe('maths-show');
    expect(s.getEvents().length).toBe(before);
  });

  it('is offered for none of the three golden scopes: a row of boxes, a molecule, a line of writing', () => {
    // A row of three boxes.
    const a = createSession();
    hold(a, [[200, 200], [360, 204], [520, 200]].map(([x, y]) => draw(a, rect(x, y, 120, 80))));
    expect(mathsOffers(a)).toEqual([]);
    // A molecule.
    const b = createSession();
    const mol = [[300, 300], [500, 300], [400, 460]].map(([x, y]) => draw(b, circle(x, y, 40)));
    mol.push(draw(b, line({ x: 340, y: 300 }, { x: 460, y: 300 }, 30)), draw(b, line({ x: 328, y: 328 }, { x: 372, y: 432 }, 30)));
    hold(b, mol);
    expect(mathsOffers(b)).toEqual([]);
    // A line of writing, read.
    const c = createSession();
    const words = ([[200, 300, 90, 28, 6], [320, 302, 110, 26, 7], [460, 300, 80, 28, 5]] as const).map(([x, y, w, h, humps]) => draw(c, word(x, y, w, h, humps)));
    const reader = c.join('agent', 'e2e-stub', (clock += 100), 2, 'local');
    ['hello', 'brave', 'world'].forEach((t, i) => c.propose({ participantId: reader, nodeId: words[i], edges: [], reps: [{ modality: 'transcript', data: { text: t }, confidence: 0.9 }], at: (clock += 1) }));
    hold(c, words);
    expect(mathsOffers(c)).toEqual([]);
  });
});

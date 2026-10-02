// A diagram (PLAN-FIELD-PAR FP2): nodes joined by connectors tied at both ends
// read as *a diagram* when no notation says more — John's two squares and a
// line — and are said in Mermaid as a flowchart. A molecule is its own thing,
// a line tied at one end is not yet a diagram, and a drawing a notation reads
// above the floor is that notation's alone.

import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG, type Session } from '../session/session';
import { magnetSites, nearestMagnet } from '../session/magnets';
import { notationsOf, NOTATION_FLOOR, describeNotation } from './notation';
import { toMermaid } from './mermaid';
import { DIAGRAM_NOTATION, TIED_LIFT } from './diagram';
import { rectStroke, lineStroke, circleStroke } from '../test/strokes';
import { handArrow } from '../test/strokes';
import { offersFor, toolScope } from '../tools/registry';
import { BUILTIN_TOOLS } from '../tools/builtin';
import type { Point } from '../types';

void BUILTIN_TOOLS;
const fresh = () => createSession({ ...DEFAULT_SESSION_CONFIG, logName: 'diagram~t1' });

/** Tie a connector's end to the nearest site of `target` to `at`, as the pen's magnet does. */
function tie(s: Session, stroke: string, target: string, end: 'start' | 'end', at: Point, t: number) {
  const st = s.getState();
  const hit = nearestMagnet(at, magnetSites(st.nodes.get(target)!, st.nodes), 40)!;
  expect(hit).toBeTruthy();
  s.bind({ strokeId: stroke, nodeId: target, site: { kind: hit.site.kind, index: hit.site.index }, end, at: t });
}

/** John's drawing: two boxes, a line from the right edge of one to the left edge of the other. */
function twoBoxes(tied: 'both' | 'one' | 'none' = 'both') {
  const s = fresh();
  const a = s.addStroke(rectStroke(100, 100, 160, 110), 1000);
  const b = s.addStroke(rectStroke(460, 100, 160, 110), 2000);
  const l = s.addStroke(lineStroke({ x: 260, y: 155 }, { x: 460, y: 155 }), 3000);
  if (tied !== 'none') tie(s, l, a, 'start', { x: 260, y: 155 }, 3001);
  if (tied === 'both') tie(s, l, b, 'end', { x: 460, y: 155 }, 3002);
  return { s, a, b, l };
}

describe('a diagram — nodes joined by connectors tied at both ends, when no notation says more', () => {
  it('reads John\'s two boxes and a line tied at both ends as a diagram, above the floor, said in his words', () => {
    const { s } = twoBoxes('both');
    const rs = notationsOf(s.getState());
    expect(rs[0].notation).toBe(DIAGRAM_NOTATION);
    expect(rs[0].confidence).toBeGreaterThanOrEqual(NOTATION_FLOOR);
    expect(rs[0].confidence).toBeCloseTo(NOTATION_FLOOR + TIED_LIFT, 6);
    expect(describeNotation(rs[0])).toMatch(/^a diagram 0\.\d\d — two nodes, one connector$/);
  });

  it('is said in Mermaid as the flowchart it is read as: two nodes and a line with no head', () => {
    const { s } = twoBoxes('both');
    const m = toMermaid(notationsOf(s.getState())[0])!;
    expect(m).toBeTruthy();
    expect(m.text.split('\n')[0]).toMatch(/^flowchart (TD|LR)$/);
    expect(m.text).toMatch(/ --- /);
  });

  it('a line tied at one end, or at none, is not yet a diagram', () => {
    for (const t of ['one', 'none'] as const) {
      const { s } = twoBoxes(t);
      expect(notationsOf(s.getState()).some((r) => r.notation === DIAGRAM_NOTATION)).toBe(false);
    }
  });

  it('the molecule is its own thing: circles joined by tied lines are no diagram', () => {
    const s = fresh();
    const c = [100, 300, 500].map((x, i) => s.addStroke(circleStroke(x, 200, 50), 1000 + i * 1000));
    const l1 = s.addStroke(lineStroke({ x: 150, y: 200 }, { x: 250, y: 200 }), 4000);
    const l2 = s.addStroke(lineStroke({ x: 350, y: 200 }, { x: 450, y: 200 }), 5000);
    tie(s, l1, c[0], 'start', { x: 150, y: 200 }, 4001);
    tie(s, l1, c[1], 'end', { x: 250, y: 200 }, 4002);
    tie(s, l2, c[1], 'start', { x: 350, y: 200 }, 5001);
    tie(s, l2, c[2], 'end', { x: 450, y: 200 }, 5002);
    expect(notationsOf(s.getState()).some((r) => r.notation === DIAGRAM_NOTATION)).toBe(false);
  });

  it('is not said where a notation reads above the floor — an arrow tied at both ends is the flowchart\'s', () => {
    const s = fresh();
    const a = s.addStroke(rectStroke(100, 100, 160, 110), 1000);
    const b = s.addStroke(rectStroke(460, 100, 160, 110), 2000);
    const f = s.addStroke(handArrow({ x: 262, y: 155 }, { x: 458, y: 155 }, { seed: 7 }), 3000);
    tie(s, f, a, 'start', { x: 262, y: 155 }, 3001);
    tie(s, f, b, 'end', { x: 458, y: 155 }, 3002);
    const rs = notationsOf(s.getState());
    expect(rs[0].notation).toBe('flowchart');
    expect(rs.some((r) => r.notation === DIAGRAM_NOTATION)).toBe(false);
  });

  it('held, it is offered what a diagram has: Make it Mermaid, Tidy the diagram and Route the connectors', () => {
    const { s, a, b, l } = twoBoxes('both');
    s.summonMarks([a, b, l], 900_000);
    const keys = offersFor(toolScope(s)).map((o) => o.key);
    expect(keys).toEqual(expect.arrayContaining(['mermaid', 'tidy-diagram', 'route']));
  });
});

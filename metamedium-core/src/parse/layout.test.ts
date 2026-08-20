// Reading a drawing as a layout.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import { parseLayout, describeLayout, type LayoutNode } from './layout';
import { frameOf, regionsOf } from '../session/regions';
import { handRect, handCircle, checkStroke } from '../test/strokes';
import type { Point } from '../types';

/** Bless a set of boxes into an artifact and parse its layout. */
function layoutOf(boxes: Point[][]) {
  const s = createSession();
  boxes.forEach((b, i) => s.addStroke(b, 1000 + i * 10));
  const all = boxes.flat();
  const cx = (Math.min(...all.map((p) => p.x)) + Math.max(...all.map((p) => p.x))) / 2;
  const cy = (Math.min(...all.map((p) => p.y)) + Math.max(...all.map((p) => p.y))) / 2;
  const r = Math.max(...all.map((p) => Math.hypot(p.x - cx, p.y - cy))) + 60;
  s.addStroke(handCircle(cx, cy, r, { seed: 9 }), 2000);
  s.addStroke(checkStroke(cx + r + 20, cy), 2200);
  const id = s.bless({ summonId: s.getState().summon!.id, name: 'page', at: 3000 })!;
  const node = s.getState().nodes.get(id)!;
  const regions = regionsOf(node, s.getState().nodes);
  return { layout: parseLayout(regions, frameOf(node)!), regions, s, id };
}

const kinds = (n: LayoutNode): string =>
  n.children.length ? `${n.flow}(${n.children.map(kinds).join(',')})` : n.id;

describe('parseLayout', () => {
  it('reads a header, two columns and a footer as a column containing a row', () => {
    // The shape of a landing page, and the case that showed why regions alone
    // are not enough: as four rects it is a bag; as a layout it is structure.
    const { layout } = layoutOf([
      handRect(100, 100, 600, 90, { seed: 1 }),
      handRect(100, 220, 290, 240, { seed: 2 }),
      handRect(410, 220, 290, 240, { seed: 3 }),
      handRect(100, 490, 600, 70, { seed: 4 }),
    ]);
    expect(kinds(layout.root)).toBe('column(r1,row(r2,r3),r4)');
  });

  it('reads a plain stack of bars as a column', () => {
    const { layout } = layoutOf([
      handRect(100, 100, 400, 80, { seed: 1 }),
      handRect(100, 210, 400, 80, { seed: 2 }),
      handRect(100, 320, 400, 80, { seed: 3 }),
    ]);
    expect(kinds(layout.root)).toBe('column(r1,r2,r3)');
  });

  it('reads side-by-side boxes as a row', () => {
    const { layout } = layoutOf([
      handRect(100, 100, 150, 200, { seed: 1 }),
      handRect(290, 100, 150, 200, { seed: 2 }),
      handRect(480, 100, 150, 200, { seed: 3 }),
    ]);
    expect(kinds(layout.root)).toBe('row(r1,r2,r3)');
  });

  it('honours containment the human drew', () => {
    const { layout } = layoutOf([
      handRect(100, 100, 500, 400, { seed: 1 }), // outer
      handRect(140, 150, 420, 120, { seed: 2 }), // inside it
      handRect(140, 310, 420, 140, { seed: 3 }), // inside it
    ]);
    expect(kinds(layout.root)).toBe('column(r2,r3)');
    expect(layout.root.id).toBe('r1'); // the container is the root, not a group
  });

  it('falls back to a stack when marks overlap in both directions', () => {
    const { layout } = layoutOf([
      handRect(100, 100, 300, 200, { seed: 1 }),
      handRect(250, 180, 300, 200, { seed: 2 }), // overlaps diagonally
    ]);
    expect(layout.root.flow).toBe('stack');
  });

  it('splits the main axis in the proportions that were drawn', () => {
    const { layout } = layoutOf([
      handRect(100, 100, 400, 100, { seed: 1 }), // 1 part
      handRect(100, 210, 400, 300, { seed: 2 }), // 3 parts
    ]);
    const [a, b] = layout.root.fractions;
    expect(a).toBeGreaterThan(0.2);
    expect(a).toBeLessThan(0.3);
    expect(b).toBeGreaterThan(0.7);
    expect(a + b).toBeCloseTo(1, 2);
  });

  it('carries the gap the human left between bands', () => {
    const { layout } = layoutOf([
      handRect(100, 100, 400, 100, { seed: 1 }),
      handRect(100, 240, 400, 100, { seed: 2 }), // 40px below
    ]);
    expect(layout.root.gap).toBeGreaterThan(25);
    expect(layout.root.gap).toBeLessThan(55);
  });

  it('describes itself in words the model can read', () => {
    const { layout } = layoutOf([
      handRect(100, 100, 600, 90, { seed: 1 }),
      handRect(100, 220, 290, 240, { seed: 2 }),
      handRect(410, 220, 290, 240, { seed: 3 }),
    ]);
    const text = describeLayout(layout);
    expect(text).toContain('LAYOUT the drawing describes');
    expect(text).toContain('column split');
    expect(text).toMatch(/r1 \(rectangle\)/);
    expect(text).toContain('read as a row');
  });

  it('is empty-safe', () => {
    const empty = parseLayout([], { x: 0, y: 0, w: 100, h: 100 });
    expect(empty.root.children).toEqual([]);
    expect(describeLayout(empty)).toContain('LAYOUT');
  });
});

describe('connectors are edges, not boxes', () => {
  it('reads two boxes joined by a line as a row, not a stack', () => {
    const s = createSession();
    const a = s.addStroke(handRect(220, 240, 200, 140, { seed: 1 }), 1000);
    const b = s.addStroke(handRect(560, 240, 200, 140, { seed: 2 }), 1100);
    s.addStroke(
      Array.from({ length: 40 }, (_, i) => ({ x: 420 + (140 * i) / 39, y: 310 })),
      1200
    );
    s.addStroke(handCircle(490, 310, 400, { seed: 3 }), 2000);
    s.addStroke(checkStroke(900, 310), 2200);
    const id = s.bless({ summonId: s.getState().summon!.id, name: 'flow', at: 3000 })!;
    const node = s.getState().nodes.get(id)!;
    const regions = regionsOf(node, s.getState().nodes);
    const connector = regions.find((r) => r.shape === 'line')!;

    // Without the connection, the line straddles both boxes and defeats the cut.
    const naive = parseLayout(regions, frameOf(node)!);
    expect(naive.root.flow).toBe('stack');

    // Told which mark is the connector, the boxes read as what they are.
    const informed = parseLayout(regions, frameOf(node)!, [
      { from: 'r1', to: 'r2', via: connector.id },
    ]);
    expect(informed.root.flow).toBe('row');
    expect(informed.root.children).toHaveLength(2);
    expect(informed.connections).toHaveLength(1);
    expect([a, b]).toHaveLength(2);
  });
});

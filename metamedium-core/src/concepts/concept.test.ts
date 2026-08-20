// Concepts read the relation graph, not the pixels.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import { relate, clusters, has } from '../relate/relations';
import { handRect, lineStroke, rectStroke } from '../test/strokes';
import type { Point } from '../types';

function board(strokes: Point[][]) {
  const s = createSession();
  const ids = strokes.map((p, i) => s.addStroke(p, 1000 + i * 100));
  return { s, ids, read: () => s.read(ids) };
}

const rowOfThree = () =>
  board([
    handRect(100, 100, 150, 120, { seed: 1 }),
    handRect(290, 100, 150, 120, { seed: 2 }),
    handRect(480, 100, 150, 120, { seed: 3 }),
  ]);

const columnOfThree = () =>
  board([
    handRect(100, 100, 200, 90, { seed: 1 }),
    handRect(100, 230, 200, 90, { seed: 2 }),
    handRect(100, 360, 200, 90, { seed: 3 }),
  ]);

describe('relations are measured, and scale-free', () => {
  it('sees nearness relative to the marks’ own size, not in pixels', () => {
    const near = relate([
      { id: 'a', bounds: { minX: 0, minY: 0, maxX: 300, maxY: 300 } },
      { id: 'b', bounds: { minX: 340, minY: 0, maxX: 640, maxY: 300 } },
    ]);
    // Two big boxes 40px apart read as near…
    expect(has(near, 'near', 'a', 'b')).toBeDefined();

    const far = relate([
      { id: 'a', bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 } },
      { id: 'b', bounds: { minX: 50, minY: 0, maxX: 60, maxY: 10 } },
    ]);
    // …while two tiny marks the same 40px apart do not.
    expect(has(far, 'near', 'a', 'b')).toBeUndefined();
  });

  it('states insideness from both ends', () => {
    const r = relate([
      { id: 'outer', bounds: { minX: 0, minY: 0, maxX: 400, maxY: 400 } },
      { id: 'inner', bounds: { minX: 50, minY: 50, maxX: 150, maxY: 150 } },
    ]);
    expect(has(r, 'contains', 'outer', 'inner')).toBeDefined();
    expect(has(r, 'inside', 'inner', 'outer')).toBeDefined();
    // Containment is the whole story: no direction or nearness noise beside it.
    expect(r.filter((x) => x.from === 'outer').map((x) => x.kind)).toEqual(['contains']);
  });

  it('only states a direction when the marks actually share a band', () => {
    const sideBySide = relate([
      { id: 'a', bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 } },
      { id: 'b', bounds: { minX: 150, minY: 0, maxX: 250, maxY: 100 } },
    ]);
    expect(has(sideBySide, 'left-of', 'a', 'b')).toBeDefined();

    const diagonal = relate([
      { id: 'a', bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 } },
      { id: 'b', bounds: { minX: 150, minY: 400, maxX: 250, maxY: 500 } },
    ]);
    expect(has(diagonal, 'left-of', 'a', 'b')).toBeUndefined();
  });

  it('carries strength, so a crisp row can be told from a rough one', () => {
    const crisp = relate([
      { id: 'a', bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 } },
      { id: 'b', bounds: { minX: 120, minY: 0, maxX: 220, maxY: 100 } },
    ]);
    const rough = relate([
      { id: 'a', bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 } },
      { id: 'b', bounds: { minX: 120, minY: 18, maxX: 220, maxY: 118 } },
    ]);
    expect(has(crisp, 'same-row', 'a', 'b')!.strength).toBeGreaterThan(
      has(rough, 'same-row', 'a', 'b')!.strength
    );
  });

  it('clusters what hangs together', () => {
    const marks = [
      { id: 'a', bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 } },
      { id: 'b', bounds: { minX: 120, minY: 0, maxX: 220, maxY: 100 } },
      { id: 'far', bounds: { minX: 5000, minY: 5000, maxX: 5100, maxY: 5100 } },
    ];
    const groups = clusters(marks, relate(marks)).map((g) => g.sort());
    expect(groups).toHaveLength(2);
    expect(groups.find((g) => g.includes('a'))).toEqual(['a', 'b']);
  });
});

describe('concepts', () => {
  it('reads three aligned peers as a row', () => {
    const top = rowOfThree().read().concepts[0];
    expect(top.concept).toBe('row');
    expect(top.reasoning).toMatch(/side by side/);
    expect(top.reasoning).toMatch(/already well lined up/);
  });

  it('reads three stacked peers as a column', () => {
    expect(columnOfThree().read().concepts[0].concept).toBe('column');
  });

  // The reading that matters most is the untidy one: a concept that only fires
  // on marks already in a clean line can never offer to line anything up.
  it('reads a WONKY row as a row, and says it is not lined up yet', () => {
    const { read } = board([
      handRect(200, 220, 180, 140, { seed: 1 }),
      handRect(430, 250, 210, 110, { seed: 2 }),
      handRect(700, 200, 150, 170, { seed: 3 }),
    ]);
    const row = read().concepts.find((c) => c.concept === 'row')!;
    expect(row).toBeDefined();
    expect(row.reasoning).toMatch(/not lined up yet|roughly lined up/);
    expect(row.conversions.map((c) => c.id)).toContain('tidy-row');
  });

  it('is not fooled by a break in the run', () => {
    const { read } = board([
      handRect(100, 100, 150, 120, { seed: 1 }),
      handRect(290, 100, 150, 120, { seed: 2 }),
      handRect(3000, 100, 150, 120, { seed: 3 }), // miles away
    ]);
    expect(read().concepts.map((c) => c.concept)).not.toContain('row');
  });

  it('a frame is not also a row — nesting rules a run out', () => {
    const { read } = board([
      handRect(100, 100, 500, 300, { seed: 1 }),
      handRect(140, 150, 180, 200, { seed: 2 }),
      handRect(360, 150, 180, 200, { seed: 3 }),
    ]);
    const names = read().concepts.map((c) => c.concept);
    expect(names).toContain('frame');
    expect(names).not.toContain('row');
  });

  it('does not call a scattered pile a row', () => {
    const { read } = board([
      handRect(100, 100, 150, 120, { seed: 1 }),
      handRect(400, 380, 90, 200, { seed: 2 }),
      handRect(180, 620, 210, 60, { seed: 3 }),
    ]);
    expect(read().concepts.map((c) => c.concept)).not.toContain('row');
  });

  it('reads a mark holding others as a frame, and says which is which', () => {
    const { read } = board([
      handRect(100, 100, 500, 400, { seed: 1 }),
      handRect(150, 160, 180, 100, { seed: 2 }),
      handRect(150, 300, 180, 100, { seed: 3 }),
    ]);
    const frame = read().concepts.find((c) => c.concept === 'frame')!;
    expect(frame).toBeDefined();
    expect(frame.roles!.container).toHaveLength(1);
    expect(frame.roles!.contents).toHaveLength(2);
  });

  it('reads boxes joined by a line as a flow', () => {
    const { read } = board([
      handRect(100, 100, 150, 120, { seed: 1 }),
      handRect(400, 100, 150, 120, { seed: 2 }),
      lineStroke({ x: 250, y: 160 }, { x: 400, y: 160 }, 40),
    ]);
    const flow = read().concepts.find((c) => c.concept === 'flow');
    expect(flow).toBeDefined();
    expect(flow!.roles!.nodes).toHaveLength(2);
  });

  it('offers conversions the engine can do alone, not only ones needing a model', () => {
    const row = rowOfThree().read().concepts.find((c) => c.concept === 'row')!;
    const tier0 = row.conversions.filter((c) => c.tier === 0);
    expect(tier0.map((c) => c.id)).toEqual(expect.arrayContaining(['tidy-row', 'equalize', 'name']));
  });

  it('says nothing about a single mark that relates to nothing', () => {
    const s = createSession();
    const id = s.addStroke(rectStroke(0, 0, 100, 80), 1000);
    expect(s.read([id]).concepts).toEqual([]);
  });
});

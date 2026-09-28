// The tool registry (V1-PLAN §2.1, B1): a new tool is one file and one
// registration line, and what it offers is in the field's offers for a scope
// it applies to — and nowhere else.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import { topInterpretation } from '../session/nodes';
import { rectStroke, circleStroke } from '../test/strokes';
import type { Tool } from './tool';
import { registerTool, offersFor, getTool, toolScope } from './registry';

/** A tool that applies to boxes: it offers to count them. The whole of a tool, in one object. */
const COUNT_BOXES: Tool = {
  id: 'test:count-boxes',
  name: 'count the boxes',
  describe: () => 'says how many boxes a scope holds',
  offers(scope) {
    const boxes = scope.marks.filter((id) => topInterpretation(scope.state.nodes.get(id)!) === 'rectangle');
    if (!boxes.length) return [];
    return [{ key: 'test:count-boxes', label: `Count ${boxes.length} box${boxes.length === 1 ? '' : 'es'}`, reason: 'a test tool', base: 0.45, tool: 'test:count-boxes' }];
  },
  take: () => ({ host: 'nothing' }),
};

function held(draw: (s: ReturnType<typeof createSession>) => string[]) {
  const s = createSession();
  const ids = draw(s);
  s.summonMarks(ids, 5000);
  return s;
}

describe('the tool registry', () => {
  it('a tool registered in one line offers in the field for a scope it applies to', () => {
    const boxes = held((s) => [s.addStroke(rectStroke(100, 100, 120, 80), 1000), s.addStroke(rectStroke(260, 100, 120, 80), 1100)]);
    const circle = held((s) => [s.addStroke(circleStroke(200, 200, 50), 1000)]);

    const unregister = registerTool(COUNT_BOXES);
    try {
      expect(getTool('test:count-boxes')).toBe(COUNT_BOXES);
      const offered = offersFor(toolScope(boxes)).find((o) => o.tool === 'test:count-boxes');
      expect(offered).toMatchObject({ key: 'test:count-boxes', label: 'Count 2 boxes', tool: 'test:count-boxes' });
      // A scope it does not apply to: nothing from it.
      expect(offersFor(toolScope(circle)).some((o) => o.tool === 'test:count-boxes')).toBe(false);
    } finally {
      unregister();
    }
    // Unregistered, it offers nowhere.
    expect(getTool('test:count-boxes')).toBeUndefined();
    expect(offersFor(toolScope(boxes)).some((o) => o.tool === 'test:count-boxes')).toBe(false);
  });
});

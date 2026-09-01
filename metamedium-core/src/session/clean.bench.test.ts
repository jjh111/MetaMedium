// The snap offer, measured over the whole drawing corpus.
//
// Two numbers matter and both are pinned: a clean form is offered for nearly
// every honest shape, and NEVER as the wrong shape. A snap that redraws a
// triangle as a box is worse than no snap at all, because it happens silently
// and the ink underneath is what the human stops looking at.

import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import { snapReading } from './clean';
import { buildCases } from '../test/cases';

describe('snap over the corpus', () => {
  const tally: Record<string, { n: number; ok: number; wrong: string[] }> = {};
  for (const c of buildCases()) {
    const s = createSession();
    const id = s.addStroke(c.points, 1000);
    const r = snapReading(s.getState().nodes.get(id)!, s.getState().nodes);
    const t = (tally[c.expect] ||= { n: 0, ok: 0, wrong: [] });
    t.n++;
    if (r.ok && r.shape === c.expect) t.ok++;
    else if (r.ok) t.wrong.push(`${c.label} → ${r.shape}`);
  }

  it('never offers the wrong shape', () => {
    for (const [shape, t] of Object.entries(tally)) expect(t.wrong, shape).toEqual([]);
  });

  it('offers a clean form for at least 95% of every drawable shape', () => {
    for (const shape of ['rectangle', 'triangle', 'circle', 'line', 'arrow', 'dot']) {
      const t = tally[shape];
      expect(t.ok / t.n, shape).toBeGreaterThanOrEqual(0.95);
    }
  });

  it('never offers to redraw writing', () => {
    expect(tally.text.ok).toBe(0);
  });
});

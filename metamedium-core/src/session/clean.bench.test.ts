// The snap offer, measured over the whole drawing corpus.
//
// Two numbers matter and both are pinned: a clean form is offered for nearly
// every honest shape, and NEVER as the wrong shape. A snap that redraws a
// triangle as a box is worse than no snap at all, because it happens silently
// and the ink underneath is what the human stops looking at.
//
// S1 adds three: a box drawn turned is offered at its own angle — a diamond
// redrawn as its upright bounds was a flowchart's decision turned into a
// process — an arc is offered as an arc, and every clean form, drawn again as
// ink, reads as the shape it is the clean form of.

import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import { idealize, snapReading } from './clean';
import { analyzeStroke } from '../recognition';
import { buildCases, buildTurnedCases, buildArcCases } from '../test/cases';
import type { Case } from '../test/cases';
import { inkOf } from '../test/strokes';

/** The angle a clean box's first side lies at, folded to a box's quarter turn, against the angle it was drawn at. */
function offAngle(points: { x: number; y: number }[], turn: number): number {
  const d = (Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x) * 180) / Math.PI;
  const apart = (((d - turn) % 90) + 90) % 90;
  return Math.min(apart, 90 - apart);
}

interface Tally { n: number; ok: number; wrong: string[]; readBack: string[]; offAngle: string[] }

function tallyOf(cases: (Case & { turn?: number })[]): Record<string, Tally> {
  const tally: Record<string, Tally> = {};
  for (const c of cases) {
    const s = createSession();
    const id = s.addStroke(c.points, 1000);
    const node = s.getState().nodes.get(id)!;
    const r = snapReading(node, s.getState().nodes);
    const t = (tally[c.expect] ||= { n: 0, ok: 0, wrong: [], readBack: [], offAngle: [] });
    t.n++;
    if (r.ok && r.shape === c.expect) t.ok++;
    else if (r.ok) t.wrong.push(`${c.label} → ${r.shape}`);
    if (!r.ok) continue;
    const clean = idealize(node, r.shape);
    if (!clean) continue;
    // Drawn again as ink, the clean form reads as the shape it cleans.
    const again = analyzeStroke(inkOf(clean.points, clean.closed)).results[0]?.type;
    if (again !== r.shape) t.readBack.push(`${c.label}: a clean ${r.shape} reads back as ${again ?? 'nothing'}`);
    if (c.turn !== undefined && r.shape === 'rectangle') {
      const off = offAngle(clean.points, c.turn);
      if (off > 3.5) t.offAngle.push(`${c.label}: cleaned ${off.toFixed(1)}° off the angle it was drawn at`);
    }
  }
  return tally;
}

const pct = (t: Tally) => `${t.ok}/${t.n} (${((t.ok / t.n) * 100).toFixed(1)}%)`;

describe('snap over the corpus', () => {
  const tally = tallyOf(buildCases());
  const turned = tallyOf(buildTurnedCases()).rectangle;
  const arcs = tallyOf(buildArcCases()).arc;

  it('reports its rates', () => {
    const lines = ['\n  snap over the corpus — offered as the right shape, never the wrong one'];
    for (const [shape, t] of Object.entries(tally)) lines.push(`  ${shape.padEnd(10)} ${pct(t).padEnd(16)} wrong ${t.wrong.length}   read back wrong ${t.readBack.length}`);
    lines.push(`  turned box ${pct(turned).padEnd(16)} wrong ${turned.wrong.length}   read back wrong ${turned.readBack.length}   off its angle ${turned.offAngle.length}`);
    lines.push(`  arc        ${pct(arcs).padEnd(16)} wrong ${arcs.wrong.length}   read back wrong ${arcs.readBack.length}`);
    const trouble = [...Object.values(tally).flatMap((t) => [...t.wrong, ...t.readBack]), ...turned.wrong, ...turned.readBack, ...turned.offAngle, ...arcs.wrong, ...arcs.readBack].slice(0, 12);
    if (trouble.length) lines.push('  trouble:', ...trouble.map((x) => `    ${x}`));
    console.log(lines.join('\n'));
    expect(turned.n).toBeGreaterThan(800);
  });

  it('never offers the wrong shape', () => {
    for (const [shape, t] of Object.entries(tally)) expect(t.wrong, shape).toEqual([]);
    expect(turned.wrong, 'turned boxes').toEqual([]);
    expect(arcs.wrong, 'arcs').toEqual([]);
  });

  it('offers a clean form for at least 95% of every drawable shape', () => {
    for (const shape of ['rectangle', 'triangle', 'circle', 'line', 'arrow', 'dot']) {
      const t = tally[shape];
      expect(t.ok / t.n, shape).toBeGreaterThanOrEqual(0.95);
    }
    expect(turned.ok / turned.n, 'turned boxes').toBeGreaterThanOrEqual(0.95);
    expect(arcs.ok / arcs.n, 'arcs').toBeGreaterThanOrEqual(0.95);
  });

  it('never offers to redraw writing', () => {
    expect(tally.text.ok).toBe(0);
  });

  it('draws a turned box clean at the angle it was drawn — a diamond stays a diamond', () => {
    expect(turned.offAngle).toEqual([]);
  });

  it('every clean form, drawn again as ink, reads as the shape it is the clean form of', () => {
    for (const [shape, t] of Object.entries(tally)) expect(t.readBack, shape).toEqual([]);
    expect(turned.readBack, 'turned boxes').toEqual([]);
    expect(arcs.readBack, 'arcs').toEqual([]);
  });
});

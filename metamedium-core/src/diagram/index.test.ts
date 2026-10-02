// What a reading asks of a big scope, answered through an index (V1-PLAN I2):
// the roles' rows through the scope's own tables, the heads' candidates through
// the content plane filed for the length of one reading. Each must give what
// the walk gave, exactly — these pin that against the walk, and that a scope of
// a thousand strokes (one picture traced into ink) is read in no time at all.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import { headsOf, connectorHeads, withBoardIndex } from './heads';
import { notationsOf, registeredNotations, notationById, sayable, type NotationReading } from '../notations/notation';
import { drawMermaid } from '../notations/mermaid-in';
import { assignRoles, type RoleScope } from './roles';
import { relate, type Mark } from '../relate/relations';
import { boundsOf, fingerprintOf, strokePointsOf, topInterpretation } from '../session/nodes';
import { tracedFragments, lineStroke, circleStroke, triangleStroke } from '../test/strokes';

/** A flowchart of many symbols: more marks than a board needs the index for. */
function chart(nodes: number) {
  const s = createSession();
  const lines = ['flowchart TD'];
  for (let i = 1; i < nodes; i++) lines.push(`  n${i}["step ${i}"] --> n${i + 1}["step ${i + 1}"]`);
  const drawn = drawMermaid(s, lines.join('\n'), { at: 1000 });
  expect(drawn.notes, 'the chart is drawn whole').toBeDefined();
  return s;
}

describe('the heads read through a filed plane are the heads the walk reads', () => {
  it('a flowchart of forty symbols: every connector, filed once or walked, reads the same', () => {
    const s = chart(40);
    const state = s.getState();
    expect(state.contentIds.length, 'enough marks to be filed').toBeGreaterThan(64);
    const walked = state.contentIds.map((id) => headsOf(state, id)).filter((h) => h !== null);
    expect(walked.length).toBeGreaterThan(30);
    expect(connectorHeads(state)).toEqual(walked);
    expect(withBoardIndex(state, () => state.contentIds.map((id) => headsOf(state, id)).filter((h) => h !== null))).toEqual(walked);
  });

  it('a head drawn apart, its fill scribbled inside it, is read whole by a filed plane — the fill is not within the end\'s point', () => {
    const s = createSession();
    let t = 1000;
    const line = s.addStroke(lineStroke({ x: 0, y: 0 }, { x: 300, y: 0 }, 60), (t += 500), undefined, 1);
    // A triangle at the end, pointing along the line, and a scribble filling it: marks near the end, none on it.
    s.addStroke(triangleStroke({ x: 300, y: 0 }, { x: 262, y: -16 }, { x: 262, y: 16 }), (t += 500), undefined, 1);
    for (let k = -2; k <= 2; k++) s.addStroke(lineStroke({ x: 266, y: k * 5 }, { x: 288 - Math.abs(k) * 5, y: k * 3 }, 24), (t += 400), undefined, 1);
    // Marks enough, a board away, that the plane is filed.
    for (let i = 0; i < 80; i++) s.addStroke(circleStroke(3000 + (i % 10) * 200, 3000 + Math.floor(i / 10) * 200, 40), (t += 300), undefined, 1);
    const state = s.getState();
    expect(state.contentIds.length).toBeGreaterThan(64);
    const walked = headsOf(state, line)!;
    const filed = withBoardIndex(state, () => headsOf(state, line)!);
    expect(walked.end.heads[0]?.kind, 'the head is read at all').toBe('triangle');
    expect(walked.end.heads[0]?.ids.length, 'with its fill among the marks it is made of').toBeGreaterThan(2);
    expect(filed).toEqual(walked);
  });

  it('the notations of a flowchart read the same whether or not the plane is filed for them', () => {
    const s = chart(40);
    const state = s.getState();
    const scope = state.contentIds.filter((id) => !state.artifacts.includes(id));
    // Each notation asked directly reads its heads by walking the plane; `notationsOf` files it once for all of them.
    const walked = sayable(registeredNotations()
      .map((id) => notationById(id)!.read(state, scope))
      .filter((r): r is NotationReading => !!r && r.confidence > 0 && r.confidence <= 1));
    const filed = notationsOf(state, scope);
    expect(filed[0].name).toMatch(/flowchart/i);
    expect(filed).toEqual(walked);
  });
});

describe('the roles of a scope, through its tables', () => {
  it('every mark of a traced picture is placed as the walk of the relations placed it', () => {
    const s = createSession();
    const box = { minX: 0, minY: 0, maxX: 160, maxY: 160 };
    s.import({ kind: 'png', path: 'photo.jpg', bounds: box, strokes: tracedFragments(5, 150, box), at: 1000 });
    const st = s.getState();
    const ids = st.contentIds.filter((id) => !st.artifacts.includes(id));
    const marks: Mark[] = ids.map((id) => {
      const n = st.nodes.get(id)!;
      return { id, bounds: boundsOf(n)!, points: strokePointsOf(n) ?? undefined, closed: fingerprintOf(n)?.isClosed };
    });
    const relations = relate(marks);
    const shapes = Object.fromEntries(ids.map((id) => [id, topInterpretation(st.nodes.get(id)!) ?? 'art']));
    const scope: RoleScope = { ids, shapes, shapeConfidence: {}, relations, wires: {} };
    // The table as it was: filtering the whole list of relations for every mark.
    const walk = (id: string, kind: string) => relations.filter((r) => r.kind === kind && r.from === id && ids.includes(r.to)).sort((a, b) => b.strength - a.strength)[0];
    const roles = assignRoles(scope);
    expect(roles.length).toBe(ids.length);
    for (const r of roles) {
      if (r.rule === 3) expect(r.targets).toEqual([walk(r.id, 'near')!.to]);
      if (r.rule === 2) expect(r.targets).toEqual([walk(r.id, 'inside')!.to]);
    }
  });

  it('the thousand strokes of a traced picture are read — relations, roles, notations — in a few seconds', () => {
    // 1,000 strokes in one scope took 3.4 s to read and 6 s to ask the notations before the roles'
    // tables and the heads' candidates were indexed; a loose ceiling guards a hundredfold, not a machine.
    const s = createSession();
    const box = { minX: 0, minY: 0, maxX: 450, maxY: 520 };
    s.import({ kind: 'png', path: 'photo.jpg', bounds: box, strokes: tracedFragments(6, 1000, box), at: 1000 });
    const st = s.getState();
    const ids = st.contentIds.filter((id) => !st.artifacts.includes(id));
    const t0 = performance.now();
    s.read(ids);
    notationsOf(st, ids);
    expect(performance.now() - t0).toBeLessThan(20_000);
  });
});

// Structural signatures: two definitions with the same shapes but different
// structure are told apart, matches rank plurally with reasoning, and a
// correction holds. The fixtures are A and B — the engine never learns a word.

import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import { circleStroke, lineStroke, checkStroke } from '../test/strokes';
import { structuralSignature, compareSignatures, matchDefinition, addExample, describeStructure, MATCH_FLOOR } from './signature';
import { topInterpretation } from './nodes';
import type { Point } from '../types';

// A: a circle with two lines INSIDE it.
function groupA(ox = 0, oy = 0): Point[][] {
  return [
    circleStroke(200 + ox, 200 + oy, 100),
    lineStroke({ x: 150 + ox, y: 180 + oy }, { x: 250 + ox, y: 180 + oy }),
    lineStroke({ x: 150 + ox, y: 220 + oy }, { x: 250 + ox, y: 220 + oy }),
  ];
}
// B: a circle with two lines CROSSING it. Same shapes — 1 circle, 2 lines.
function groupB(ox = 0, oy = 0): Point[][] {
  return [
    circleStroke(200 + ox, 200 + oy, 100),
    lineStroke({ x: 50 + ox, y: 190 + oy }, { x: 350 + ox, y: 190 + oy }),
    lineStroke({ x: 50 + ox, y: 210 + oy }, { x: 350 + ox, y: 210 + oy }),
  ];
}

/** Draw a group, circle it, cross it with the check, name it. Returns the artifact id and the member ids. */
function define(s: ReturnType<typeof createSession>, strokes: Point[][], name: string, t: { now: number }, cx: number, cy: number) {
  const ids = strokes.map((p) => s.addStroke(p, (t.now += 1000)));
  s.addStroke(circleStroke(cx, cy, 190), (t.now += 1000));
  s.addStroke(checkStroke(cx + 160, cy + 40), (t.now += 1000));
  const summon = s.getState().summon!;
  expect(summon).not.toBeNull();
  const id = s.bless({ summonId: summon.id, name, at: (t.now += 1000) })!;
  return { id, ids };
}

describe('structural signatures', () => {
  it('same shapes, different links: A and B are different signatures, and the words say why', () => {
    const s = createSession();
    const a = groupA().map((p) => s.addStroke(p, 1000));
    const b = groupB(500).map((p) => s.addStroke(p, 2000));
    const type = (id: string) => topInterpretation(s.getState().nodes.get(id)!) ?? 'art';
    const sa = structuralSignature(a, s.getState().nodes, type);
    const sb = structuralSignature(b, s.getState().nodes, type);
    expect(sa.shapes).toEqual({ circle: 1, line: 2 });
    expect(sb.shapes).toEqual({ circle: 1, line: 2 });
    expect(sa.links['circle>contains>line']).toBe(2);
    expect(sb.links['circle-crossing-line']).toBe(2);
    const m = compareSignatures(sa, sb);
    expect(m.score).toBeLessThan(MATCH_FLOOR);
    expect(m.reasoning).toMatch(/same shapes/);
    expect(m.reasoning).toMatch(/links \d+\/\d+ in common/);
    expect(describeStructure(sa)).toBe('2×line + circle; circle>contains>line ×2, line-near-line');
  });

  it('is free of drawing order', () => {
    const s = createSession();
    const type = (id: string) => topInterpretation(s.getState().nodes.get(id)!) ?? 'art';
    const forward = groupA().map((p) => s.addStroke(p, 1000));
    const backward = groupA(600).reverse().map((p) => s.addStroke(p, 2000));
    const sf = structuralSignature(forward, s.getState().nodes, type);
    const sb = structuralSignature(backward, s.getState().nodes, type);
    expect(compareSignatures(sf, sb).score).toBe(1);
  });

  it('a group like A matches A and not B; matches are plural and ranked with reasoning', () => {
    const s = createSession();
    const t = { now: 0 };
    const A = define(s, groupA(), 'A', t, 200, 200);
    const B = define(s, groupB(600), 'B', t, 800, 200);
    expect(s.getState().artifacts).toEqual([A.id, B.id]);

    // Defining B did not offer A: the summon's match list was empty.
    // (Checked below through matchesOf, which is the same reading.)
    const again = groupA(0, 500).map((p) => s.addStroke(p, (t.now += 1000)));
    const matches = s.matchesOf(again);
    expect(matches.map((m) => m.name)).toEqual(['A']);
    expect(matches[0].score).toBe(1);
    expect(matches[0].reasoning).toMatch(/same shapes/);
    expect(matches[0].reasoning).toMatch(/same links/);

    // The held candidate says the same, plurally, without committing.
    const cands = s.getState().clusterCandidates;
    expect(cands).toHaveLength(1);
    expect(cands[0].matches.map((m) => m.name)).toEqual(['A']);
    expect(cands[0].matches[0].reasoning).toBeDefined();

    // And a group like B matches B, not A.
    const bAgain = groupB(600, 500).map((p) => s.addStroke(p, (t.now += 1000)));
    expect(s.matchesOf(bAgain).map((m) => m.name)).toEqual(['B']);
  });

  it('a wrong match is corrected once and stays corrected — and "is" teaches a new example', () => {
    const s = createSession();
    const t = { now: 0 };
    const A = define(s, groupA(), 'A', t, 200, 200);
    const B = define(s, groupB(600), 'B', t, 800, 200);

    // The human says this A-shaped group is NOT A.
    const g1 = groupA(0, 500).map((p) => s.addStroke(p, (t.now += 1000)));
    expect(s.matchesOf(g1).map((m) => m.name)).toEqual(['A']);
    s.correct({ ids: g1, definitionId: A.id, verdict: 'is-not', at: (t.now += 1000) });
    expect(s.matchesOf(g1)).toEqual([]);
    expect(s.getState().clusterCandidates).toEqual([]);

    // The next group like it is not offered A either: the correction holds.
    const g2 = groupA(0, 900).map((p) => s.addStroke(p, (t.now += 1000)));
    expect(s.matchesOf(g2)).toEqual([]);

    // …and saying it IS B makes B match groups like it from now on.
    s.correct({ ids: g2, definitionId: B.id, verdict: 'is', at: (t.now += 1000) });
    const m = s.matchesOf(g2);
    expect(m.map((x) => x.name)).toEqual(['B']);
    expect(m[0].reasoning).toMatch(/accepted example/);
    // A correction is an event: undo takes B's example away, and redoing it puts it back.
    s.undo();
    expect(s.matchesOf(g2)).toEqual([]);
    s.correct({ ids: g2, definitionId: B.id, verdict: 'is', at: (t.now += 1000) });
    const g3 = groupA(0, 1300).map((p) => s.addStroke(p, (t.now += 1000)));
    expect(s.matchesOf(g3).map((x) => x.name)).toEqual(['B']);

    // …and it replays.
    const replayed = createSession();
    replayed.load(s.getEvents());
    expect(replayed.matchesOf(g3).map((x) => x.name)).toEqual(['B']);
  });

  it('addExample moves a signature between the lists rather than holding it on both', () => {
    const sig = { shapes: { circle: 1 }, links: {}, size: 1 };
    let ex = addExample(undefined, sig, 'is-not');
    expect(ex.rejected).toHaveLength(1);
    ex = addExample(ex, sig, 'is');
    expect(ex.rejected).toHaveLength(0);
    expect(ex.accepted).toHaveLength(1);
    expect(matchDefinition(sig, { shapes: { line: 1 }, links: {}, size: 1 }, ex).score).toBe(1);
  });
});

// A library pack, used by one event (V1-PLAN §2.3, §9 B3).
//
// The canonical loop teaches a molecule by naming one: three circles and two
// bonds, circled, checked, named — and the next molecule drawn is recognised
// (session.scenario.test.ts). A library pack is that teaching SHIPPED, the way
// the command mark is: the board says it uses the pack, in one `use` event in
// its log, and the first molecule drawn on it is recognised with nothing
// taught — matched by the same structural signature a taught definition is,
// attributed to the pack, and never on the board as an artifact or a file.
//
// The invariant is the log as source: a pack's definitions are present only
// because a `use` event says so. The same strokes with no such event match
// nothing, and the same log with it replays to the match.

import { describe, it, expect } from 'vitest';
import { createSession, type SessionEvent } from '../session/session';
import { authorOf, wordOf } from '../session/nodes';
import { circleStroke, lineStroke, checkStroke } from '../test/strokes';
import type { Point } from '../types';

/** The canonical loop's molecule: three circles and two bonds, moved by (dx, dy). */
function moleculeStrokes(dx = 0, dy = 0): Point[][] {
  const t = (points: Point[]) => points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
  return [
    t(circleStroke(200, 200, 40)),
    t(circleStroke(380, 200, 40)),
    t(circleStroke(290, 340, 40)),
    t(lineStroke({ x: 245, y: 200 }, { x: 335, y: 200 })),
    t(lineStroke({ x: 220, y: 245 }, { x: 270, y: 320 })),
  ];
}

/** The one event: this board uses the test pack. Handed over as a log line, the way a board read from its store hands it. */
const USE: SessionEvent = { type: 'use', pack: 'test-molecule@1', at: 1 } as unknown as SessionEvent;

describe('a library pack, used by one event', () => {
  it('a board that uses the test pack recognises a molecule drawn with no teaching', () => {
    const s = createSession();
    let t = 1000;
    const next = () => (t += 1000);
    s.load([USE]);

    const ids = moleculeStrokes().map((points) => s.addStroke(points, next()));
    let state = s.getState();

    // Nothing was taught and nothing is on the board but the ink.
    expect(state.artifacts).toEqual([]);
    expect(state.contentIds).toHaveLength(5);

    // The group is recognised — held, not committed — as the pack's molecule.
    expect(state.clusterCandidates).toHaveLength(1);
    const candidate = state.clusterCandidates[0];
    expect([...candidate.nodeIds].sort()).toEqual([...ids].sort());
    const match = candidate.matches[0];
    expect(match.name).toBe('molecule');
    expect(match.score).toBeGreaterThanOrEqual(0.75);

    // The definition is the pack's: attributed to it, and not an artifact.
    const def = state.nodes.get(match.artifactId)!;
    expect(def).toBeDefined();
    expect(authorOf(def)).toBe('library:test-molecule@1');
    expect(wordOf(def)).toBe('molecule');
    expect(state.artifacts).not.toContain(match.artifactId);
    expect(state.contentIds).not.toContain(match.artifactId);

    // Circled and checked, the field offers it by name…
    s.addStroke(circleStroke(290, 270, 170), next());
    s.addStroke(checkStroke(470, 300), next());
    state = s.getState();
    expect(state.summon).not.toBeNull();
    const offered = state.summon!.suggestions.find((x) => x.kind === 'match');
    expect(offered).toBeDefined();
    expect(offered!.label).toBe('molecule');
    expect(offered!.artifactId).toBe(match.artifactId);

    // …and taking it makes this hand's molecule, an instance of the pack's.
    const made = s.bless({ summonId: state.summon!.id, suggestionId: offered!.id, at: next() })!;
    state = s.getState();
    expect(state.artifacts).toEqual([made]);
    const artifact = state.nodes.get(made)!;
    expect(wordOf(artifact)).toBe('molecule');
    expect(authorOf(artifact)).toBe('participant:local');
    expect(artifact.edges.some((e) => e.rel === 'instance-of' && e.to === match.artifactId)).toBe(true);
  });

  it('the same molecule on a board with no pack matches nothing', () => {
    const s = createSession();
    let t = 1000;
    moleculeStrokes().forEach((points) => s.addStroke(points, (t += 1000)));
    const state = s.getState();
    expect(state.clusterCandidates).toEqual([]);
    expect(state.artifacts).toEqual([]);
  });

  it('the event is what makes it: the same strokes replay to a match with it, and to none without it', () => {
    const drawn = createSession();
    let t = 1000;
    moleculeStrokes(40, 60).forEach((points) => drawn.addStroke(points, (t += 1000)));
    const strokes = drawn.getEvents().slice();

    const without = createSession();
    without.load(strokes);
    expect(without.getState().clusterCandidates).toEqual([]);

    const withPack = createSession();
    withPack.load([USE, ...strokes]);
    expect(withPack.getState().clusterCandidates.map((c) => c.matches[0]?.name)).toEqual(['molecule']);

    // Anywhere in the log: used after the strokes were drawn, the group is read again.
    const after = createSession();
    after.load([...strokes, { ...(USE as object), at: t + 1000 } as SessionEvent]);
    expect(after.getState().clusterCandidates.map((c) => c.matches[0]?.name)).toEqual(['molecule']);
  });
});

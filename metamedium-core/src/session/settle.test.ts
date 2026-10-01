// Pictures traced into ink beside definitions (V1-PLAN I2, PLAN-IPAD-NOTES §1
// item 4). A photograph traced is a thousand strokes in ONE connected group, and
// a board that holds any artifact settles its groups against the definitions at
// every change: the group was gathered, walked and signed again whole for every
// stroke of an import, and again for every stroke a hand drew on it. The groups
// are now settled when something reads them, a group no definition could be
// like by size is not signed or walked in order, and a stroke that joins one
// joins it where it stands. Every one of those must give what the walk of the
// whole board gives, and what a replay from zero gives — these pin that, and
// that an import of thousands is not quadratic. (The budgets are bench/budgets.test.mjs's.)

import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG, type Session } from './session';
import { rectStroke, circleStroke, lineStroke, rng, tracedFragments } from '../test/strokes';
import { boundsOf, fingerprintOf, strokePointsOf } from './nodes';
import { clusters, relate, type Mark } from '../relate/relations';
import type { Point } from '../types';

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>';

function markOf(s: Session, id: string): Mark | null {
  const n = s.getState().nodes.get(id);
  const b = n && boundsOf(n);
  if (!n || !b) return null;
  return { id, bounds: b, points: strokePointsOf(n) ?? undefined, closed: fingerprintOf(n)?.isClosed };
}

/** What every change gave when it walked the whole board: every group, every definition (reach.test.ts's oracle). */
function walked(s: Session) {
  const st = s.getState();
  if (st.artifacts.length === 0 || st.contentIds.length === 0) return { candidates: [], biggest: 0 };
  const marks = st.contentIds.map((id) => markOf(s, id)).filter((m): m is Mark => !!m);
  const out: { nodeIds: string[]; matches: unknown[] }[] = [];
  let biggest = 0;
  for (const ids of clusters(marks, relate(marks))) {
    const strokeIds = ids.filter((id) => !st.artifacts.includes(id));
    biggest = Math.max(biggest, strokeIds.length);
    if (strokeIds.length < 2) continue;
    const matches = s.matchesOf(strokeIds);
    if (matches.length) out.push({ nodeIds: strokeIds, matches });
  }
  return { candidates: out, biggest };
}

describe('a picture traced into ink beside definitions', () => {
  for (const seed of [1, 2, 3]) {
    it(`the groups kept are the groups the walk finds, after every event — the tangle, a stroke on it, and a definition as big as it (seed ${seed})`, () => {
      const r = rng(seed * 104729);
      const s = createSession();
      let t = 1000;
      const check = (what: string) => {
        const w = walked(s);
        expect(s.getState().clusterCandidates, what).toEqual(w.candidates);
        return w;
      };
      const molecule = (x: number, y: number) => [
        s.addStroke(circleStroke(x, y, 30), (t += 500)), s.addStroke(circleStroke(x + 100, y, 30), (t += 500)),
        s.addStroke(lineStroke({ x: x + 32, y }, { x: x + 68, y }), (t += 500)),
      ];
      const moleculeDef = s.bless({ summonId: s.summonMarks(molecule(100, 100), (t += 800))!, name: 'molecule', at: (t += 800) })!;
      s.import({ kind: 'svg', path: 'figure.svg', bounds: { minX: 0, minY: 400, maxX: 300, maxY: 620 }, code: SVG, at: (t += 900) });
      check('a molecule defined, an SVG beside it');
      // A picture's strokes: one import, one group of a few dozen, more than any definition's size.
      const box = { minX: 600, minY: 100, maxX: 760, maxY: 260 };
      const first = tracedFragments(seed, 70, box);
      s.import({ kind: 'png', path: 'photo.jpg', bounds: box, strokes: first, at: (t += 900) });
      const w = check('a traced picture');
      expect(w.biggest, 'the strokes of one picture are one group, bigger than the definition').toBeGreaterThan(30);
      // Molecules drawn where they match, and one on the picture itself, where it joins the group.
      for (let i = 0; i < 4; i++) { molecule(1200 + i * 400, 100); check(`a molecule apart (${i})`); }
      molecule(640, 130);
      check('a molecule on the picture');
      // Strokes drawn on the picture, each joining the group it is in, and some a little off it.
      for (let i = 0; i < 25; i++) {
        const x = box.minX + r() * 200 - 20, y = box.minY + r() * 200 - 20;
        const pts: Point[] = Array.from({ length: 12 }, (_, k) => ({ x: x + k * 3, y: y + Math.sin(k / 3) * 5 }));
        s.addStroke(pts, (t += 600));
        check(`a stroke on the picture (${i})`);
      }
      // A move out of the group and an erase inside it take it apart again.
      const loose = s.getState().contentIds.filter((id) => !s.getState().artifacts.includes(id));
      s.move({ ids: [loose[loose.length - 3]], dx: 900, dy: 700, at: (t += 900) });
      check('a stroke moved away from the picture');
      s.erase(loose[loose.length - 8], (t += 900));
      check('a stroke erased from it');
      // A second picture, and a definition made of the first as it stands: the groups
      // that were too big for every definition are signed now, and the second matches it.
      const box2 = { minX: 600, minY: 800, maxX: 760, maxY: 960 };
      s.import({ kind: 'png', path: 'photo2.jpg', bounds: box2, strokes: tracedFragments(seed + 50, 70, box2), at: (t += 900) });
      check('a second picture');
      const picture = walked(s);
      const group = s.getState().contentIds.filter((id) => {
        const b = boundsOf(s.getState().nodes.get(id)!);
        return b && b.minX >= box.minX - 40 && b.maxX <= box.maxX + 40 && b.minY >= box.minY - 40 && b.maxY <= box.maxY + 40 && !s.getState().artifacts.includes(id);
      });
      expect(group.length).toBeGreaterThan(30);
      const def = s.bless({ summonId: s.summonMarks(group, (t += 900))!, name: 'photo', at: (t += 900) });
      expect(def).toBeTruthy();
      check('the first picture named');
      // Against a corrected one: the second picture is told it is not a photo.
      const cand = s.getState().clusterCandidates.find((c) => c.matches.some((m) => m.artifactId === def));
      if (cand) s.correct({ ids: cand.nodeIds, definitionId: def!, verdict: 'is-not', at: (t += 900) });
      check('a correction on a big group');
      s.correct({ ids: group, definitionId: moleculeDef, verdict: 'is', at: (t += 900) });
      check('a big group taught as an example of a small definition');
      expect(picture.biggest).toBeGreaterThan(30);
      // Undo from the end, each from a checkpoint.
      for (let i = 0; i < 6; i++) {
        s.undo();
        const fresh = createSession();
        fresh.load(JSON.parse(JSON.stringify(s.getEvents())));
        expect(s.getState().clusterCandidates, `undo ${i} against a replay from zero`).toEqual(fresh.getState().clusterCandidates);
      }
      check('after the undos');
    }, 240_000);

    it(`the log replays to the same board however often it is settled while it does (seed ${seed})`, () => {
      const s = createSession();
      let t = 1000;
      const molecule = (x: number, y: number) => [
        s.addStroke(circleStroke(x, y, 30), (t += 500)), s.addStroke(circleStroke(x + 100, y, 30), (t += 500)),
        s.addStroke(lineStroke({ x: x + 32, y }, { x: x + 68, y }), (t += 500)),
      ];
      s.bless({ summonId: s.summonMarks(molecule(100, 100), (t += 800))!, name: 'molecule', at: (t += 800) });
      s.import({ kind: 'svg', path: 'figure.svg', bounds: { minX: 0, minY: 400, maxX: 300, maxY: 620 }, code: SVG, at: (t += 900) });
      for (let k = 0; k < 3; k++) {
        const box = { minX: 600 + k * 400, minY: 100, maxX: 760 + k * 400, maxY: 260 };
        s.import({ kind: 'png', path: `photo-${k}.jpg`, bounds: box, strokes: tracedFragments(seed * 10 + k, 60, box), at: (t += 900) });
        molecule(box.minX + 20, box.minY + 40);
      }
      for (let i = 0; i < 30; i++) s.addStroke(lineStroke({ x: 620 + i * 4, y: 120 }, { x: 640 + i * 4, y: 240 }, 12), (t += 400));
      const want = JSON.parse(JSON.stringify(s.getState().clusterCandidates));
      const log = JSON.parse(JSON.stringify(s.getEvents()));
      // Settled once at the end of the load, at every 200 events, at every event, and every few.
      for (const every of [undefined, 1, 3, 7]) {
        const fresh = createSession(every ? { ...DEFAULT_SESSION_CONFIG, checkpointEvery: every } : DEFAULT_SESSION_CONFIG);
        fresh.load(log);
        expect(fresh.getState().clusterCandidates, `settled every ${every ?? 'whole load'}`).toEqual(want);
        expect(JSON.stringify([...fresh.getState().nodes]), `nodes, settled every ${every ?? 'whole load'}`).toBe(JSON.stringify([...s.getState().nodes]));
      }
    });
  }

  it('a group that grows a stroke at a time through the size of a definition is matched exactly while it is that size', () => {
    const r = rng(77);
    const s = createSession();
    let t = 1000;
    s.import({ kind: 'svg', path: 'figure.svg', bounds: { minX: 0, minY: 3000, maxX: 300, maxY: 3220 }, code: SVG, at: (t += 900) });
    // Bubbles over one another in a patch, forty of them a definition, the same shapes in every patch
    // (circles, not lines: a line that ends on two marks is a connector and unsettles its groups itself).
    const hatch = (x: number, y: number, n: number) => {
      const ids: string[] = [];
      for (let i = 0; i < n; i++) ids.push(s.addStroke(circleStroke(x + r() * 70, y + r() * 70, 10 + r() * 10), (t += 300)));
      return ids;
    };
    const check = (what: string) => expect(s.getState().clusterCandidates, what).toEqual(walked(s).candidates);
    const def = s.bless({ summonId: s.summonMarks(hatch(0, 0, 40), (t += 800))!, name: 'hatch', at: (t += 800) })!;
    check('a patch named');
    hatch(1000, 0, 40);
    check('another patch of forty');
    expect(s.getState().clusterCandidates.some((c) => c.matches.some((m) => m.artifactId === def)), 'a patch like it is matched').toBe(true);
    // A patch grown a stroke at a time: too small, in the size of the definition, then too big for it.
    const grown: string[] = [];
    for (let i = 0; i < 84; i++) {
      grown.push(...hatch(2000, 0, 1));
      // Every stroke from before the definition's size is in reach (24 of 40) to past it (68), a few after.
      if ((i >= 20 && i < 72) || i % 6 === 0) check(`a patch of ${i + 1}`);
    }
    // The patch of 110 is named: what was too big is the size of a definition now.
    s.bless({ summonId: s.summonMarks(grown, (t += 800))!, name: 'big patch', at: (t += 800) });
    check('the big patch named');
    hatch(3000, 0, 84);
    check('a patch of as many beside it');
  }, 240_000);

  it('a group taught as an example of a small definition is matched where it stands, however big it is', () => {
    const r = rng(78);
    const s = createSession();
    let t = 1000;
    const hatch = (x: number, y: number, n: number) => {
      const ids: string[] = [];
      for (let i = 0; i < n; i++) ids.push(s.addStroke(circleStroke(x + r() * 70, y + r() * 70, 10 + r() * 10), (t += 300)));
      return ids;
    };
    const moleculeDef = s.bless({ summonId: s.summonMarks([
      s.addStroke(circleStroke(100, 100, 30), (t += 500)), s.addStroke(circleStroke(200, 100, 30), (t += 500)),
      s.addStroke(lineStroke({ x: 132, y: 100 }, { x: 168, y: 100 }), (t += 500)),
    ], (t += 800))!, name: 'molecule', at: (t += 800) })!;
    const patch = hatch(1000, 0, 45);
    expect(s.getState().clusterCandidates, 'a patch of bubbles is no molecule').toEqual([]);
    s.correct({ ids: patch, definitionId: moleculeDef, verdict: 'is', at: (t += 900) });
    hatch(2000, 0, 45);
    const w = walked(s);
    expect(s.getState().clusterCandidates).toEqual(w.candidates);
    expect(w.candidates.length, 'the taught example is matched').toBeGreaterThanOrEqual(1);
  });

  it('an import of 1,500 traced strokes beside an SVG, and its replay, are not quadratic in the picture', () => {
    // 1,500 strokes in one group took 40 s to apply and as long to replay before the groups were
    // settled once; a loose ceiling, since a timer in a unit test is a guard against a hundredfold
    // and the budgets (≤ 4 ms a stroke, ≤ 0.25 ms a mark to replay) are bench/budgets.test.mjs's.
    const s = createSession();
    s.import({ kind: 'svg', path: 'figure.svg', bounds: { minX: 0, minY: 0, maxX: 300, maxY: 220 }, code: SVG, at: 1000 });
    const box = { minX: 400, minY: 0, maxX: 850, maxY: 520 };
    const strokes = tracedFragments(9, 1500, box);
    const t0 = performance.now();
    s.import({ kind: 'png', path: 'photo.jpg', bounds: box, strokes, at: 2000 });
    const applied = performance.now() - t0;
    expect(s.getState().contentIds.length).toBeGreaterThan(1400);
    const t1 = performance.now();
    createSession().load(JSON.parse(JSON.stringify(s.getEvents())));
    const replayed = performance.now() - t1;
    expect(applied, 'applying the import').toBeLessThan(10_000);
    expect(replayed, 'replaying it').toBeLessThan(10_000);
  });
});

// The rungs above the groups read the strokes as they always did.
describe('the boxes of a board settled in one go read as they did one at a time', () => {
  it('a row of boxes beside an artifact is still matched against a definition of boxes', () => {
    const s = createSession();
    let t = 1000;
    s.import({ kind: 'svg', path: 'figure.svg', bounds: { minX: 0, minY: 400, maxX: 300, maxY: 620 }, code: SVG, at: (t += 900) });
    const trio = (x: number, y: number) => [
      s.addStroke(rectStroke(x, y, 60, 40), (t += 400)), s.addStroke(rectStroke(x + 90, y, 60, 40), (t += 400)), s.addStroke(rectStroke(x + 180, y, 60, 40), (t += 400)),
    ];
    s.bless({ summonId: s.summonMarks(trio(100, 100), (t += 500))!, name: 'row', at: (t += 500) });
    trio(100, 400);
    trio(100, 700);
    expect(s.getState().clusterCandidates.length).toBeGreaterThanOrEqual(2);
    const fresh = createSession();
    fresh.load(JSON.parse(JSON.stringify(s.getEvents())));
    expect(fresh.getState().clusterCandidates).toEqual(s.getState().clusterCandidates);
  });
});

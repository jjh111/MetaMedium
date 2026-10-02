// The engine holds a board without walking it (V1-PLAN §9 R4b): relations are
// stored for the pairs within reach of each other, found through an index; the
// groups a definition could match are kept, and found again only where a mark
// joined, left or moved; a checkpoint shares what never changes; a scratch
// counts crossings only on the ink its box meets. Every one of those must give
// exactly what the walk of the whole board gave — these pin that, against the
// walk itself, done here from the engine's public functions.

import { describe, it, expect } from 'vitest';
import { createSession, type Session } from './session';
import { rectStroke, circleStroke, lineStroke, scratchStroke, rng } from '../test/strokes';
import { boundsOf, fingerprintOf, strokePointsOf, getRep, isWord, TIER0_PARTICIPANT } from './nodes';
import { clusters, relate, ENGAGING_KINDS, type Mark } from '../relate/relations';
import { scratchedOut, DEFAULT_ERASE_CROSSINGS } from './erase';
import type { Point } from '../types';

const RELATION_KINDS = new Set(['contains', 'inside', 'crossing', 'touching', 'near', 'above', 'below', 'left-of', 'right-of', 'same-row', 'same-column', 'same-size']);

function markOf(s: Session, id: string): Mark | null {
  const n = s.getState().nodes.get(id);
  const b = n && boundsOf(n);
  if (!n || !b) return null;
  return { id, bounds: b, points: strokePointsOf(n) ?? undefined, closed: fingerprintOf(n)?.isClosed };
}

/** What `recomputeClusterCandidates` gave when it walked the whole board: every group, every definition. */
function walkedCandidates(s: Session) {
  const st = s.getState();
  if (st.artifacts.length === 0 || st.contentIds.length === 0) return [];
  const marks = st.contentIds.map((id) => markOf(s, id)).filter((m): m is Mark => !!m);
  const out: { nodeIds: string[]; matches: unknown[] }[] = [];
  for (const ids of clusters(marks, relate(marks))) {
    const strokeIds = ids.filter((id) => !st.artifacts.includes(id));
    if (strokeIds.length < 2) continue;
    const matches = s.matchesOf(strokeIds);
    if (matches.length) out.push({ nodeIds: strokeIds, matches });
  }
  return out;
}

/** The relation edges one node stores, by the mark at the other end. */
function relationsStored(s: Session, id: string) {
  return s.getState().nodes.get(id)!.edges.filter((e) => e.via === TIER0_PARTICIPANT && RELATION_KINDS.has(e.rel));
}

// Block capitals, as a hand prints them (session/words.test.ts).
const seg = (a: Point, b: Point, n = 14) => lineStroke(a, b, n);
const N = (x: number, y: number, h = 30) => [seg({ x, y: y + h }, { x, y }).concat(seg({ x, y }, { x: x + 18, y: y + h }).slice(1), seg({ x: x + 18, y: y + h }, { x: x + 18, y }).slice(1))];
const V = (x: number, y: number, h = 30) => [seg({ x, y }, { x: x + 10, y: y + h }).concat(seg({ x: x + 10, y: y + h }, { x: x + 20, y }).slice(1))];

describe('what is stored is what is read', () => {
  it('a pair within reach keeps every relation relate finds, in its order; a pair out of reach keeps none', () => {
    const s = createSession();
    const a = s.addStroke(rectStroke(100, 100, 120, 80), 1000);
    const b = s.addStroke(rectStroke(250, 105, 120, 80), 2000); // 30 apart: near
    const far = s.addStroke(rectStroke(4000, 100, 120, 80), 3000); // the same size and row, a board away
    const toB = relationsStored(s, a).filter((e) => e.to === b);
    const want = relate([markOf(s, b)!, markOf(s, a)!]).filter((r) => r.from === a);
    expect(toB.map((e) => [e.rel, e.weight])).toEqual(want.map((r) => [r.kind, r.strength]));
    expect(toB.map((e) => e.rel)).toEqual(expect.arrayContaining(['near', 'left-of', 'same-row', 'same-size']));
    // Out of reach, it would read same-size and same-row — a scope asks for that, the board does not hold it.
    expect(relate([markOf(s, a)!, markOf(s, far)!]).map((r) => r.kind)).toEqual(expect.arrayContaining(['same-size', 'same-row']));
    expect(relationsStored(s, far)).toEqual([]);
    expect(relationsStored(s, a).some((e) => e.to === far)).toBe(false);
    // …and a reading of the three still sees them: session.read relates its scope on demand.
    const read = s.read([a, b, far]);
    expect(read.relations.some((r) => r.kind === 'same-size' && r.from === a && r.to === far)).toBe(true);
  });

  it('four hundred boxes a board apart store no relation at all — they held 159,600 same-size edges', () => {
    const s = createSession();
    let t = 1000;
    for (let i = 0; i < 400; i++) s.addStroke(rectStroke((i % 20) * 600, Math.floor(i / 20) * 600, 120, 80), (t += 900));
    let stored = 0;
    for (const id of s.getState().contentIds) stored += relationsStored(s, id).length;
    expect(stored).toBe(0);
    // Two of them, read together, are the same size — on demand.
    const [p, q] = s.getState().contentIds;
    expect(s.read([p, q]).relations.some((r) => r.kind === 'same-size')).toBe(true);
  });

  it('every stored relation is of a pair with an engaging relation on each end', () => {
    const s = createSession();
    const r = rng(3);
    let t = 1000;
    for (let i = 0; i < 120; i++) {
      const x = r() * 3000, y = r() * 2000;
      const pts = r() < 0.4 ? rectStroke(x, y, 40 + r() * 200, 30 + r() * 120) : r() < 0.7 ? circleStroke(x, y, 15 + r() * 80) : lineStroke({ x, y }, { x: x + (r() - 0.5) * 300, y: y + (r() - 0.5) * 300 });
      s.addStroke(pts, (t += 700));
    }
    for (const [id] of s.getState().nodes) {
      const rels = relationsStored(s, id);
      const engaged = new Set(rels.filter((e) => ENGAGING_KINDS.has(e.rel as never)).map((e) => e.to));
      for (const e of rels) expect(engaged.has(e.to)).toBe(true);
    }
  });
});

describe('the groups a definition matches, kept, are the groups the walk finds', () => {
  for (const seed of [1, 2, 3, 4]) {
    it(`after every event of a board drawn, moved, blessed, corrected, rubbed out and undone (seed ${seed})`, () => {
      const r = rng(seed * 7919);
      const s = createSession();
      let t = 1000;
      const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
      const content = () => s.getState().contentIds;
      const near = () => {
        const ids = content();
        const b = ids.length ? boundsOf(s.getState().nodes.get(pick(ids))!) : null;
        return b && r() < 0.7 ? { x: b.maxX + 10 + r() * 60, y: b.minY + (r() - 0.5) * 60 } : { x: r() * 5000, y: r() * 3000 };
      };
      const drawn: string[][] = [];
      const molecule = (x: number, y: number) => {
        const c1 = s.addStroke(circleStroke(x, y, 30), (t += 500));
        const c2 = s.addStroke(circleStroke(x + 100, y, 30), (t += 500));
        const l = s.addStroke(lineStroke({ x: x + 32, y }, { x: x + 68, y }), (t += 500));
        drawn.push([c1, c2, l]);
        return [c1, c2, l];
      };
      let held = 0;
      const check = (what: string) => {
        const walked = walkedCandidates(s);
        expect(s.getState().clusterCandidates, what).toEqual(walked);
        held = Math.max(held, walked.length);
        trace.push(`${what}:${walked.length}`);
      };
      const trace: string[] = [];
      // Two definitions to match against.
      const first = molecule(200, 200);
      const moleculeDef = s.bless({ summonId: s.summonMarks(first, (t += 800))!, name: 'molecule', at: (t += 800) })!;
      const box = [s.addStroke(rectStroke(600, 150, 160, 100), (t += 900)), s.addStroke(rectStroke(620, 170, 60, 40), (t += 700))];
      s.bless({ summonId: s.summonMarks(box, (t += 800))!, name: 'framed', at: (t += 800) });
      check('two definitions');
      for (let step = 0; step < 120; step++) {
        const roll = r();
        const ids = content().filter((id) => !s.getState().artifacts.includes(id));
        let what = '';
        if (roll < 0.25) {
          // Mostly somewhere clear, where it can match; now and then beside something, where it joins it.
          const p = r() < 0.65 ? { x: r() * 8000, y: r() * 5000 } : near();
          molecule(p.x, p.y);
          what = 'a molecule';
        } else if (roll < 0.45) {
          const p = near();
          s.addStroke(r() < 0.5 ? rectStroke(p.x, p.y, 60 + r() * 120, 40 + r() * 80) : circleStroke(p.x, p.y, 20 + r() * 50), (t += 900));
          what = 'a shape';
        } else if (roll < 0.55) {
          const p = near();
          for (const pts of [...N(p.x, p.y), ...V(p.x + 26, p.y)]) s.addStroke(pts, (t += 350));
          what = 'a word';
        } else if (roll < 0.65 && ids.length) {
          s.move({ ids: [pick(ids)], dx: (r() - 0.5) * 400, dy: (r() - 0.5) * 300, at: (t += 900) });
          what = 'a move';
        } else if (roll < 0.72 && ids.length) {
          s.erase(pick(ids), (t += 900));
          what = 'an erase';
        } else if (roll < 0.78 && ids.length) {
          const b = boundsOf(s.getState().nodes.get(pick(ids))!)!;
          s.addStroke(scratchStroke(b.minX, (b.minY + b.maxY) / 2, b.maxX - b.minX, Math.max(10, (b.maxY - b.minY) / 2), 3), (t += 900));
          what = 'a scratch';
        } else if (roll < 0.83) {
          // A no on the first match vetoes every group like it; a yes on a
          // molecule drawn earlier takes such a veto back.
          const cand = s.getState().clusterCandidates[0];
          if (cand && r() < 0.3) s.correct({ ids: cand.nodeIds, definitionId: cand.matches[0].artifactId, verdict: 'is-not', at: (t += 900) });
          else s.correct({ ids: pick(drawn), definitionId: moleculeDef, verdict: 'is', at: (t += 900) });
          what = 'a correction';
        } else if (roll < 0.88) {
          const cand = s.getState().clusterCandidates[0];
          if (cand) {
            const sid = s.summonMarks(cand.nodeIds, (t += 900));
            if (sid) s.bless({ summonId: sid, name: `def ${step}`, at: (t += 900) });
          }
          what = 'a bless';
        } else if (roll < 0.93) {
          s.undo();
          const fresh = createSession();
          fresh.load(JSON.parse(JSON.stringify(s.getEvents())));
          expect(s.getState().clusterCandidates, 'undo against a replay from zero').toEqual(fresh.getState().clusterCandidates);
          continue;
        } else {
          const words = content().filter((id) => isWord(s.getState().nodes.get(id)!));
          if (words.length) {
            // A split does not read the groups again — the next event does.
            s.splitWord(pick(words), (t += 900));
            continue;
          }
          const p = near();
          molecule(p.x, p.y);
          what = 'a molecule';
        }
        check(`step ${step}: ${what}`);
      }
      // Not a comparison of two empty lists: the board held several matched groups at once.
      expect(held, trace.join(' ')).toBeGreaterThanOrEqual(3);
    });
  }
});

describe('checkpoints share what never changes', () => {
  it('a board restored from its checkpoints, again and again, is the board replayed from zero', () => {
    const s = createSession();
    const r = rng(17);
    let t = 1000;
    const trio = (x: number, y: number) => [
      s.addStroke(circleStroke(x, y, 30), (t += 400)), s.addStroke(circleStroke(x + 100, y, 30), (t += 400)),
      s.addStroke(lineStroke({ x: x + 32, y }, { x: x + 68, y }), (t += 400)),
    ];
    s.bless({ summonId: s.summonMarks(trio(100, 100), (t += 500))!, name: 'molecule', at: (t += 500) });
    for (let i = 0; i < 150; i++) trio((i % 12) * 400, 400 + Math.floor(i / 12) * 300);
    // Past the 200- and 400-event checkpoints. Now change what the checkpoints hold.
    const ids = s.getState().contentIds.filter((id) => !s.getState().artifacts.includes(id));
    for (let i = 0; i < 20; i++) s.move({ ids: [ids[Math.floor(r() * ids.length)]], dx: 30, dy: -20, at: (t += 300) });
    for (let i = 0; i < 10; i++) s.erase(ids[Math.floor(r() * ids.length)], (t += 300));
    const same = (what: string) => {
      const fresh = createSession();
      fresh.load(JSON.parse(JSON.stringify(s.getEvents())));
      const a = s.getState(), b = fresh.getState();
      expect(a.contentIds, what).toEqual(b.contentIds);
      expect(a.clusterCandidates, what).toEqual(b.clusterCandidates);
      expect(JSON.stringify([...a.nodes]), what).toBe(JSON.stringify([...b.nodes]));
    };
    same('as drawn');
    // Undo back past everything above: each undo restores a checkpoint and replays from it.
    for (let i = 0; i < 40; i++) s.undo();
    same('after forty undos');
    // Draw on, and undo again from the same checkpoints.
    trio(9000, 9000);
    for (let i = 0; i < 3; i++) s.undo();
    same('after drawing on and undoing again');
  });
});

describe('the scratch test counts crossings only on the ink its box meets', () => {
  /** Every mark a scratch could rub out, as the walk found them: loose ink, then what artifacts and words hold. */
  function walkedTargets(s: Session, excludeId: string) {
    const st = s.getState();
    const ids = new Set<string>();
    for (const id of st.contentIds) {
      if (id === excludeId) continue;
      const n = st.nodes.get(id)!;
      if (strokePointsOf(n)) { ids.add(id); continue; }
      const code = [...n.reps].reverse().find((r) => r.modality === 'code')?.data as { kind?: string } | undefined;
      if (code?.kind === 'text') continue;
      for (const e of n.edges) if (e.rel === 'has-part') ids.add(e.to);
    }
    return [...ids].map((id) => st.nodes.get(id)!).filter((n) => !getRep(n, 'erased') && strokePointsOf(n))
      .map((n) => ({ id: n.id, points: strokePointsOf(n)!, closed: fingerprintOf(n)?.isClosed ?? false }));
  }

  it('rubs out a loose mark, an artifact\'s members and a word\'s letters, in the order the walk met them', () => {
    const s = createSession();
    let t = 1000;
    const loose = s.addStroke(lineStroke({ x: 100, y: 140 }, { x: 180, y: 140 }), (t += 900));
    const m1 = s.addStroke(rectStroke(300, 100, 80, 80), (t += 900));
    const m2 = s.addStroke(rectStroke(420, 100, 80, 80), (t += 900));
    s.bless({ summonId: s.summonMarks([m1, m2], (t += 800))!, name: 'pair', at: (t += 800) });
    for (const pts of [...N(600, 110), ...V(626, 110)]) s.addStroke(pts, (t += 350));
    const word = s.getState().contentIds.find((id) => isWord(s.getState().nodes.get(id)!))!;
    expect(word).toBeTruthy();
    // Far away from all of them: crosses nothing, rubs out nothing.
    const idle = s.addStroke(scratchStroke(3000, 3000, 200, 40, 3), (t += 900));
    expect(getRep(s.getState().nodes.get(idle)!, 'gesture')).toBeUndefined();
    // One long zigzag across all of them, up and down every seven pixels.
    const zig: Point[] = [];
    for (let i = 0; i <= 97; i++) zig.push({ x: 60 + i * 7, y: i % 2 ? 90 : 190 });
    const dense = zig.slice(1).flatMap((p, i) => lineStroke(zig[i], p, 8).slice(i ? 1 : 0));
    const expected = scratchedOut(dense, walkedTargets(s, 'none'), DEFAULT_ERASE_CROSSINGS);
    expect(expected[0]).toBe(loose);
    expect(expected).toEqual(expect.arrayContaining([m1, m2]));
    expect(expected.filter((id) => !([loose, m1, m2] as string[]).includes(id)).length).toBeGreaterThan(0); // letters
    const scratch = s.addStroke(dense, (t += 900));
    const gesture = getRep(s.getState().nodes.get(scratch)!, 'gesture')?.data as { role: string; erased: string[] } | undefined;
    expect(gesture?.role).toBe('scratch');
    expect(gesture!.erased).toEqual(expected);
    for (const id of expected) expect(getRep(s.getState().nodes.get(id)!, 'erased')).toBeTruthy();
  });
});

// A point's time is data, never a reading (PLAN-IPAD-NOTES I3).
//
// The surface now gives every point of a stroke `t` — whole milliseconds since the press — beside the pen's
// `p`, and reads a pencil's coalesced samples, so a stroke has several times the points it had. Nothing in the
// engine may read either: the same hand-drawn marks, with and without a time and a pressure on every point,
// must be read the same — every node's readings, its fingerprint, its roles and the board's relations — and
// a time survives the log exactly as it was given.

import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG, type Session } from './session';
import { handRect, handCircle, handLine, handArrow, handTriangle, handText } from '../test/strokes';
import type { Point } from '../types';

/** The same ink, each point given a time (whole ms, rising, a pencil's 4 ms apart) and a pressure. */
const stamped = (pts: Point[]): Point[] => pts.map((q, i) => ({ ...q, t: i * 4 + (i % 3), p: Math.round((0.3 + 0.4 * Math.sin(i / 7) ** 2) * 1000) / 1000 }));

function board(stamp: boolean): Session {
  const s = createSession({ ...DEFAULT_SESSION_CONFIG, logName: 'hand' });
  const ink: Point[][] = [
    handRect(100, 100, 220, 140, { seed: 3 }),
    handCircle(500, 170, 60, { seed: 3 }),
    handLine({ x: 330, y: 170 }, { x: 440, y: 170 }, { seed: 3 }),
    handArrow({ x: 100, y: 330 }, { x: 320, y: 330 }, { seed: 3 }),
    handTriangle({ x: 520, y: 300 }, { x: 640, y: 300 }, { x: 580, y: 400 }, { seed: 3 }),
    handText(100, 440, 160, 40, { seed: 3 }),
  ];
  ink.forEach((pts, i) => s.addStroke(stamp ? stamped(pts) : pts, 1000 + i * 900, undefined, 1));
  return s;
}

/**
 * A point as the engine reads it: x and y. A fingerprint keeps the stroke's own first and last point, so a
 * `t` and a `p` ride along on them as data (a pen's pressure always has); they are not what was read.
 */
const asRead = (_k: string, v: unknown) => {
  if (v && typeof v === 'object' && !Array.isArray(v) && typeof (v as Point).x === 'number' && typeof (v as Point).y === 'number') {
    const { t: _t, p: _p, ...rest } = v as Point;
    return rest;
  }
  return v;
};

/** What the engine reads of a board: no raw points, only readings. */
const readings = (s: Session) => {
  const st = s.getState();
  return JSON.stringify({
    content: st.contentIds,
    nodes: [...st.nodes.values()].map((n) => ({
      id: n.id,
      reps: n.reps.filter((r) => r.modality !== 'stroke').map((r) => ({ modality: r.modality, data: r.data, confidence: r.confidence })),
      edges: n.edges,
    })),
    candidates: st.clusterCandidates.map((c) => ({ ids: c.nodeIds, matches: c.matches.map((m) => m.name) })),
  }, asRead);
};

describe('a point\'s time and pressure are data, never a reading (I3)', () => {
  it('reads the same marks the same with and without them', () => {
    const a = board(false), b = board(true);
    expect(a.getState().contentIds.length).toBeGreaterThanOrEqual(5);
    expect(readings(b)).toBe(readings(a));
  });

  it('keeps a time as it was given through the log, and a replay reads the same', () => {
    const b = board(true);
    const events = JSON.parse(JSON.stringify(b.getEvents()));
    const strokes = events.filter((e: { type: string }) => e.type === 'stroke');
    expect(strokes.every((e: { points: Point[] }) => e.points.every((q) => Number.isInteger(q.t) && typeof q.p === 'number'))).toBe(true);
    const again = createSession({ ...DEFAULT_SESSION_CONFIG, logName: 'hand' });
    again.load(events);
    expect(readings(again)).toBe(readings(b));
  });
});

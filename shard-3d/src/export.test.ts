// G0 — the board as its log, out and back in, and a captured view rebuilt.
//
// Two claims are pinned here, and the second one is the reason the package is
// first in the order:
//
// - **A board round-trips.** Export it, open it into a fresh session, and the
//   marks, the solids, the names and the trees are the same — because state is
//   a pure function of the log (invariant 4) and the export is the log.
// - **John's own board stands.** `fixtures/john-2026-09-16-massing.json` is a
//   captured VIEW of his second board, and the converter rebuilds three
//   profiles from their bounds and stands the massing. That is what G1 measures
//   the Y fault against, and it must not be a synthetic drawing.
//
// No renderer anywhere: the diff's seam is not what any of this is about.

import { describe, expect, it } from 'vitest';
import type { Point } from 'metamedium-core';
import {
  boardFilename,
  boardFromFixture,
  decodeBoard,
  encodeBoard,
  looksLikeLog,
  type Fixture,
} from './export';
import { createLog, type SpaceRead } from './log';
import { foundation, height, width, NAMED } from './plane';
import { FIXTURE_PEN_PX } from './export';
import captured from '../fixtures/john-2026-09-16-massing.json';

const SCALE = 0.012;

const blindSpace: SpaceRead = {
  silhouettes: () => [],
  spanAlong: () => 0,
  silhouetteOn: () => null,
};

function loop(corners: Point[], per = 14): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    for (let s = 0; s < per; s++) {
      const t = s / per;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  out.push(corners[0]);
  return out;
}
const rect = (x: number, y: number, w: number, h: number, per = 20) =>
  loop([{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }], per);

/** The same three views `massing.test.ts` uses, so the board is a known one. */
const PLAN = rect(-2, -1.5, 4, 3);
const FRONT = rect(-2, -3, 4, 3);
const SIDE = rect(-1.5, -3, 3, 3);

function boardWithMassing() {
  const log = createLog();
  log.sees(blindSpace);
  log.add(PLAN, foundation(), SCALE, 1000);
  log.add(FRONT, height(), SCALE, 2000);
  log.add(SIDE, width(), SCALE, 3000);
  const m = log.massable();
  if (m) log.mass(m);
  return log;
}

describe('the format is the canvas’s', () => {
  it('one JSON event per line, and every line parses on its own', () => {
    const log = boardWithMassing();
    const text = encodeBoard(log.session.getEvents());
    const lines = text.split('\n').filter((l) => l.trim());
    expect(lines.length).toBe(log.session.getEvents().length);
    for (const line of lines) expect(() => JSON.parse(line)).not.toThrow();
  });

  it('a broken line is skipped and COUNTED, never fatal', () => {
    const log = boardWithMassing();
    const text = encodeBoard(log.session.getEvents());
    const { events, skipped } = decodeBoard(text + 'not json at all\n');
    expect(skipped).toBe(1);
    expect(events.length).toBe(log.session.getEvents().length);
  });

  it('the filename says what it is, and both spellings come back in', () => {
    expect(boardFilename(new Date(2026, 8, 16, 9, 5))).toBe('shard-2026-09-16-0905.mm.log');
    for (const n of ['a.mm.log', 'b.log', 'c.jsonl', 'canvas.json']) expect(looksLikeLog(n)).toBe(true);
    expect(looksLikeLog('board.svg')).toBe(false);
    expect(looksLikeLog('photo.png')).toBe(false);
  });
});

describe('a board round-trips through export → open', () => {
  it('the same marks, the same solids, the same names and the same trees', () => {
    const made = boardWithMassing();
    made.name(made.solids()[0].id, 'keep');
    const text = encodeBoard(made.session.getEvents());

    const opened = createLog();
    opened.sees(blindSpace);
    opened.session.load(decodeBoard(text).events);

    expect(opened.marks().map((m) => m.id)).toEqual(made.marks().map((m) => m.id));
    expect(opened.solids()).toHaveLength(made.solids().length);
    expect(opened.solids()[0].name).toBe('keep');
    expect(opened.solids()[0].named).toBe('human');
    expect(JSON.stringify(opened.solids()[0].tree)).toBe(JSON.stringify(made.solids()[0].tree));
    // The plane a mark lies on is a rep in the log, so it travels too.
    expect(opened.marks().map((m) => m.plane.name)).toEqual(made.marks().map((m) => m.plane.name));
  });

  it('opening REPLACES the board rather than adding to it', () => {
    const a = boardWithMassing();
    const text = encodeBoard(a.session.getEvents());
    const b = createLog();
    b.sees(blindSpace);
    b.add(rect(20, 20, 2, 2), foundation(), SCALE, 500);
    expect(b.marks()).toHaveLength(1);
    b.session.load(decodeBoard(text).events);
    // The stroke that was there is gone: a load is a new board, which is why
    // the tile asks before it does it on a board holding work.
    expect(b.marks()).toHaveLength(a.marks().length);
    expect(b.marks().some((m) => m.plane.name === 'height')).toBe(true);
  });

  it('an empty board round-trips as an empty board', () => {
    const log = createLog();
    log.sees(blindSpace);
    const text = encodeBoard(log.session.getEvents());
    expect(text).toBe('');
    expect(decodeBoard(text)).toEqual({ events: [], skipped: 0 });
  });
});

// ---- the fixture converter --------------------------------------------------

/** John's second board, 16 September 2026 — the real one, not a synthetic one. */
const FIXTURE = captured as unknown as Fixture;

describe('a captured view rebuilt: John’s second board', () => {
  it('rebuilds the marks that lay on the three named planes, and counts the rest', () => {
    const built = boardFromFixture(FIXTURE);
    // The three profiles he drew on the tiles, plus the one line on the
    // foundation. The six view-plane strokes are dropped AND said.
    expect(built.marks.map((m) => m.was).sort()).toEqual(['stroke:15', 'stroke:3', 'stroke:8', 'stroke:9']);
    expect(built.dropped).toHaveLength(6);
    for (const why of built.dropped) expect(why).toMatch(/view plane/);
    expect(built.sentence).toMatch(/a reconstruction, not a replay/);
  });

  it('each one is rebuilt as the shape the fixture recorded, on its own plane', () => {
    const built = boardFromFixture(FIXTURE);
    const by = new Map(built.marks.map((m) => [m.was, m]));
    expect(by.get('stroke:8')!.plane).toBe('height');
    expect(by.get('stroke:8')!.shape).toBe('circle');
    expect(by.get('stroke:9')!.plane).toBe('width');
    expect(by.get('stroke:15')!.plane).toBe('foundation');
    expect(by.get('stroke:15')!.shape).toBe('rectangle');
    // …and inside the bounds the fixture recorded, which is the whole claim the
    // rebuild makes about the drawing.
    const xs = by.get('stroke:15')!.points.map((p) => p.x);
    expect(Math.min(...xs)).toBeCloseTo(0.41, 2);
    expect(Math.max(...xs)).toBeCloseTo(5.451, 2);
  });

  it('the three profiles stand a massing — G1’s board, standing', () => {
    const built = boardFromFixture(FIXTURE);
    const log = createLog();
    log.sees(blindSpace);
    for (const m of built.marks) {
      const xs = m.points.map((p) => p.x);
      const ys = m.points.map((p) => p.y);
      const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      log.add(m.points, NAMED[m.plane]('chosen', m.why), size / FIXTURE_PEN_PX);
    }
    const m = log.massable();
    expect(m).toBeTruthy();
    // Exactly the three the fixture's own solid was made from: the circle on
    // the height plane, the circle on the width plane, the rectangle footprint.
    expect(m!.planes.slice().sort()).toEqual(['foundation', 'height', 'width']);
    expect(m!.profileIds).toHaveLength(3);
    expect(log.mass(m!)).toBeTruthy();
    expect(log.solids()).toHaveLength(1);
    expect(log.solids()[0].name).toBe('massing');
  });

  it('a fixture with nothing rebuildable says so rather than standing an empty board', () => {
    const built = boardFromFixture({ marks: [{ id: 'stroke:1', plane: 'view', bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 } }] });
    expect(built.marks).toHaveLength(0);
    expect(built.dropped).toHaveLength(1);
  });

  it('a reading the converter cannot build from a box is dropped and named', () => {
    const built = boardFromFixture({
      marks: [{ id: 'stroke:1', plane: 'foundation', reads: 'dot 0.9', bounds: { minX: 0, minY: 0, maxX: 0.1, maxY: 0.1 } }],
    });
    expect(built.marks).toHaveLength(0);
    expect(built.dropped[0]).toMatch(/dot 0\.9/);
  });
});

// ---- the seam a brief asks, and what it says is missing ---------------------

describe('standFor: what a brief would find to fill', () => {
  it('names the massing when the drawing stands one', () => {
    const log = boardWithMassing();
    // The massing is already standing here, so nothing further is standable —
    // its profiles are taken. What matters is that the seam never guesses.
    const stand = log.standFor();
    expect(stand.can).toBeNull();
    expect(stand.missing).toBeTruthy();
  });

  it('on an empty board it says what to DRAW, not what the shard noticed', () => {
    const log = createLog();
    log.sees(blindSpace);
    const stand = log.standFor();
    expect(stand.can).toBeNull();
    expect(stand.missing).toMatch(/footprint on the foundation/);
    expect(stand.missing).toMatch(/from the side/);
  });

  it('one plane’s worth of outlines asks for another side', () => {
    const log = createLog();
    log.sees(blindSpace);
    log.add(PLAN, foundation(), SCALE, 1000);
    const stand = log.standFor();
    expect(stand.can).toBeNull();
    expect(stand.missing).toMatch(/on the foundation alone/);
    expect(stand.missing).toMatch(/another tile/);
  });

  it('two planes that do not overlap are told they are two drawings', () => {
    const log = createLog();
    log.sees(blindSpace);
    log.add(PLAN, foundation(), SCALE, 1000);
    log.add(rect(98, -3, 4, 3), height(), SCALE, 2000);
    const stand = log.standFor();
    expect(stand.can).toBeNull();
    expect(stand.missing).toMatch(/do not overlap/);
  });

  it('two overlapping planes ARE something to stand, and it is the massing', () => {
    const log = createLog();
    log.sees(blindSpace);
    log.add(PLAN, foundation(), SCALE, 1000);
    log.add(FRONT, height(), SCALE, 2000);
    const stand = log.standFor();
    expect(stand.can?.kind).toBe('massing');
    expect(stand.can!.massable.planes.slice().sort()).toEqual(['foundation', 'height']);
    expect(stand.missing).toBe('');
  });
});

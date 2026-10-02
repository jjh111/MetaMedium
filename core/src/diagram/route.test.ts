// Routing (V1-PLAN §3, §9 D7): connectors drawn orthogonally between their
// ports. Two halves. The geometry alone — `routeBetween`, a pure function of
// two ends and the boxes in the way — and the board's: a `route` event marks a
// connector as routed, its polyline is DERIVED from the sites its ends are
// bound to wherever they stand now (so a box moved re-routes it, one move
// event, undo springs it back), and nothing about how the drawing READS
// changes — its ends, its wires, its flowchart, its Mermaid.

import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG, type Session } from '../session/session';
import { boundsOf, getRep } from '../session/nodes';
import { bindingsOf, boundSiteOf } from '../session/magnets';
import { notationsOf } from '../notations/notation';
import { toMermaid } from '../notations/mermaid';
import { drawMermaid } from '../notations/mermaid-in';
import { rng, rectStroke } from '../test/strokes';
import type { Bounds, Point } from '../types';
import { ROUTE_MAX_TURNS, outwardOf, routeBetween, routeRepOf, type RouteBlock, type RouteEnd } from './route';

const box = (minX: number, minY: number, maxX: number, maxY: number): Bounds => ({ minX, minY, maxX, maxY });
const orthogonal = (pts: Point[]) => pts.every((p, i) => i === 0 || (Math.abs(p.x - pts[i - 1].x) < 1e-9) !== (Math.abs(p.y - pts[i - 1].y) < 1e-9));
/** Whether a segment passes through the open inside of a box. */
function crosses(a: Point, b: Point, r: Bounds): boolean {
  const eps = 1e-6;
  if (Math.abs(a.y - b.y) < eps) return a.y > r.minY + eps && a.y < r.maxY - eps && Math.max(a.x, b.x) > r.minX + eps && Math.min(a.x, b.x) < r.maxX - eps;
  return a.x > r.minX + eps && a.x < r.maxX - eps && Math.max(a.y, b.y) > r.minY + eps && Math.min(a.y, b.y) < r.maxY - eps;
}
const crossesAny = (pts: Point[], r: Bounds) => pts.some((p, i) => i > 0 && crosses(pts[i - 1], p, r));
const turnsOf = (pts: Point[]) => Math.max(0, pts.length - 2);

describe('where a connector leaves a port: along the outward normal', () => {
  const b = box(0, 0, 200, 100);
  it('a box’s edge middles leave straight out of their side', () => {
    expect(outwardOf({ x: 200, y: 50 }, b, { x: 900, y: 900 })).toBe('right');
    expect(outwardOf({ x: 0, y: 50 }, b, { x: 900, y: 900 })).toBe('left');
    expect(outwardOf({ x: 100, y: 0 }, b, { x: 900, y: 900 })).toBe('up');
    expect(outwardOf({ x: 100, y: 100 }, b, { x: 900, y: 900 })).toBe('down');
  });
  it('a corner leaves along one of the two sides it belongs to — the one that faces the other end', () => {
    expect(outwardOf({ x: 200, y: 100 }, b, { x: 300, y: 500 })).toBe('down');
    expect(outwardOf({ x: 200, y: 100 }, b, { x: 800, y: 130 })).toBe('right');
    expect(outwardOf({ x: 0, y: 0 }, b, { x: -50, y: -400 })).toBe('up');
    expect(outwardOf({ x: 0, y: 0 }, b, { x: -600, y: -20 })).toBe('left');
  });
  it('a decision’s vertex leaves outward, whatever the box it is drawn in', () => {
    const d = box(0, 0, 112, 112);
    expect(outwardOf({ x: 56, y: 0 }, d, { x: 0, y: 500 })).toBe('up');
    expect(outwardOf({ x: 112, y: 56 }, d, { x: 0, y: 500 })).toBe('right');
    expect(outwardOf({ x: 56, y: 112 }, d, { x: 900, y: 0 })).toBe('down');
    expect(outwardOf({ x: 0, y: 56 }, d, { x: 900, y: 0 })).toBe('left');
  });
  it('a site in the middle of a mark has no outward: it leaves toward the other end', () => {
    expect(outwardOf({ x: 100, y: 50 }, b, { x: 900, y: 60 })).toBe('right');
    expect(outwardOf({ x: 100, y: 50 }, b, { x: 110, y: -900 })).toBe('up');
  });
});

describe('routeBetween: a few segments, clear of what is in the way', () => {
  const a: RouteEnd = { point: { x: 200, y: 50 }, dir: 'right', box: box(0, 0, 200, 100) };
  const b: RouteEnd = { point: { x: 500, y: 250 }, dir: 'left', box: box(500, 200, 700, 300) };

  it('two ports facing each other, one below the other, make a Z: out of the first, in at the second, two turns', () => {
    const r = routeBetween(a, b, []);
    expect(r.points[0]).toEqual(a.point);
    expect(r.points[r.points.length - 1]).toEqual(b.point);
    expect(orthogonal(r.points)).toBe(true);
    expect(r.points[1].x).toBeGreaterThan(a.point.x);
    expect(r.points[1].y).toBe(a.point.y);
    const n = r.points.length;
    expect(r.points[n - 2].y).toBe(b.point.y);
    expect(r.points[n - 2].x).toBeLessThan(b.point.x);
    expect(r.turns).toBe(2);
    expect(turnsOf(r.points)).toBe(2);
    expect(r.avoided).toBe(true);
    expect(r.blocked).toEqual([]);
  });

  it('two ports on one line join in one straight segment', () => {
    const r = routeBetween({ point: { x: 200, y: 50 }, dir: 'right', box: box(0, 0, 200, 100) }, { point: { x: 500, y: 50 }, dir: 'left', box: box(500, 0, 700, 100) }, []);
    expect(r.points).toEqual([{ x: 200, y: 50 }, { x: 500, y: 50 }]);
    expect(r.turns).toBe(0);
  });

  it('a mark in the way is gone round, and the route says nothing crossed it', () => {
    const wall: RouteBlock = { id: 'wall', box: box(300, 0, 400, 320) };
    const r = routeBetween(a, b, [wall]);
    expect(orthogonal(r.points)).toBe(true);
    expect(crossesAny(r.points, wall.box)).toBe(false);
    expect(crossesAny(r.points, a.box!)).toBe(false);
    expect(crossesAny(r.points, b.box!)).toBe(false);
    expect(r.turns).toBeLessThanOrEqual(ROUTE_MAX_TURNS);
    expect(r.avoided).toBe(true);
    expect(r.blocked).toEqual([]);
    expect(r.reasoning).not.toMatch(/could not avoid/);
  });

  it('a port shut in by marks cannot be reached round them: it goes through, says which, and says it could not avoid them', () => {
    const ring: RouteBlock[] = [
      { id: 'n', box: box(440, 140, 760, 190) },
      { id: 's', box: box(440, 310, 760, 360) },
      { id: 'w', box: box(440, 140, 490, 360) },
      { id: 'e', box: box(710, 140, 760, 360) },
    ];
    const r = routeBetween(a, b, ring);
    expect(r.points[0]).toEqual(a.point);
    expect(r.points[r.points.length - 1]).toEqual(b.point);
    expect(orthogonal(r.points)).toBe(true);
    expect(r.avoided).toBe(false);
    expect(r.blocked.length).toBeGreaterThan(0);
    expect(r.blocked.every((id) => ring.some((x) => x.id === id))).toBe(true);
    expect(r.reasoning).toMatch(/could not avoid/);
    expect(r.turns).toBeLessThanOrEqual(ROUTE_MAX_TURNS);
  });

  it('is deterministic, and over a hundred random layouts it always ends on its ports in orthogonal segments of at most four turns, and when it says it avoided, it did', () => {
    const rand = rng(7);
    const dirs = ['right', 'down', 'left', 'up'] as const;
    const at = (d: (typeof dirs)[number], bx: Bounds): Point =>
      d === 'right' ? { x: bx.maxX, y: (bx.minY + bx.maxY) / 2 } : d === 'left' ? { x: bx.minX, y: (bx.minY + bx.maxY) / 2 } : d === 'down' ? { x: (bx.minX + bx.maxX) / 2, y: bx.maxY } : { x: (bx.minX + bx.maxX) / 2, y: bx.minY };
    for (let k = 0; k < 100; k++) {
      const ba = box(0, 0, 100 + rand() * 100, 60 + rand() * 60);
      const ox = 150 + rand() * 500, oy = (rand() - 0.5) * 600;
      const bb = box(ox, oy, ox + 80 + rand() * 120, oy + 50 + rand() * 80);
      const da = dirs[Math.floor(rand() * 4)], db = dirs[Math.floor(rand() * 4)];
      const blocks: RouteBlock[] = [];
      for (let i = 0; i < Math.floor(rand() * 5); i++) {
        const x = rand() * 700, y = (rand() - 0.5) * 700;
        blocks.push({ id: 'o' + i, box: box(x, y, x + 30 + rand() * 120, y + 30 + rand() * 120) });
      }
      const ea: RouteEnd = { point: at(da, ba), dir: da, box: ba }, eb: RouteEnd = { point: at(db, bb), dir: db, box: bb };
      const r = routeBetween(ea, eb, blocks);
      expect(routeBetween(ea, eb, blocks)).toEqual(r);
      expect(r.points[0]).toEqual(ea.point);
      expect(r.points[r.points.length - 1]).toEqual(eb.point);
      expect(orthogonal(r.points), 'layout ' + k).toBe(true);
      expect(r.turns).toBeLessThanOrEqual(ROUTE_MAX_TURNS);
      expect(turnsOf(r.points)).toBe(r.turns);
      if (r.avoided) for (const bl of blocks) expect(crossesAny(r.points, bl.box), `layout ${k} crossed ${bl.id}`).toBe(false);
      else expect(r.reasoning).toMatch(/could not avoid/);
    }
  });
});

// ===== On a board =====

const named = (checkpointEvery?: number) => createSession({ ...DEFAULT_SESSION_CONFIG, logName: 'router~t1', ...(checkpointEvery ? { checkpointEvery } : {}) });
const nodeOf = (s: Session, id: string) => s.getState().nodes.get(id)!;
/** Every connector of the flowchart the board reads, in the reading's order. */
function connectorsOf(s: Session): string[] {
  return notationsOf(s.getState())[0].connectors.map((c) => c.id);
}
/** What a drawing reads as, said in ways a route must leave alone. */
function readings(s: Session) {
  const st = s.getState();
  const r = notationsOf(st)[0];
  return {
    summary: `${r.notation}: ${r.summary}`,
    mermaid: toMermaid(r)?.text,
    connectors: r.connectors.map((c) => `${c.from}>${c.to} ${c.direction} ${c.kind}`),
    wires: connectorsOf(s).map((id) => nodeOf(s, id).edges.filter((e) => ['connects', 'points-from', 'points-to'].includes(e.rel)).map((e) => `${e.rel}:${e.to}`).sort().join(',')),
  };
}
const inkOf = (s: Session, id: string) => JSON.stringify(getRep(nodeOf(s, id), 'stroke')!.data);
const ROUTES = (s: Session) => connectorsOf(s).map((id) => routeRepOf(nodeOf(s, id)));

const CHART = 'flowchart TD\n A[Start] --> B{Ok?}\n B --> C[Go]\n B --> D[Stop]';
function chart(text = CHART, s: Session = named()) {
  drawMermaid(s, text, { at: 1000 });
  return s;
}
const at = (n: number) => 100_000 + n;

describe('a routed connector', () => {
  it('a route event marks the connectors, and each polyline is derived from its bound sites: orthogonal, ending on its ports, at most four turns', () => {
    const s = chart();
    const ids = connectorsOf(s);
    expect(ids.length).toBe(3);
    const before = s.getEvents().length;
    expect(s.route({ ids, at: at(1) })).toBe(3);
    expect(s.getEvents().slice(before).map((e) => e.type)).toEqual(['route']);
    const st = s.getState();
    for (const id of ids) {
      const rep = routeRepOf(nodeOf(s, id))!;
      expect(rep, id).toBeDefined();
      expect(rep.points.length).toBeGreaterThanOrEqual(2);
      expect(orthogonal(rep.points)).toBe(true);
      expect(rep.turns).toBeLessThanOrEqual(ROUTE_MAX_TURNS);
      // It ends on the two sites its ends are bound to, wherever they stand.
      const sites = bindingsOf(nodeOf(s, id)).map((b) => boundSiteOf(st.nodes.get(b.nodeId)!, st.nodes, b.site)!.point);
      const ends = [rep.points[0], rep.points[rep.points.length - 1]];
      for (const p of sites) expect(ends.some((e) => Math.hypot(e.x - p.x, e.y - p.y) < 1e-6), id).toBe(true);
    }
  });

  it('the ink is untouched, and how the drawing reads is exactly as it was: its flowchart, its flows, its wires, its Mermaid', () => {
    const s = chart();
    const ids = connectorsOf(s);
    const ink = ids.map((id) => inkOf(s, id));
    const was = readings(s);
    s.route({ ids, at: at(1) });
    expect(ids.map((id) => inkOf(s, id))).toEqual(ink);
    expect(readings(s)).toEqual(was);
  });

  it('a connector goes round the mark that stands between its ports', () => {
    const s = chart('flowchart TD\n A[One] --> B[Two]\n B --> C[Three]\n A --> C');
    const ids = connectorsOf(s);
    s.route({ ids, at: at(1) });
    const r = notationsOf(s.getState())[0];
    const two = r.symbols.find((x) => x.text === 'Two')!;
    const skip = r.connectors.find((c) => c.from !== two.id && c.to !== two.id)!;
    const rep = routeRepOf(nodeOf(s, skip.id))!;
    expect(rep.avoided).toBe(true);
    expect(crossesAny(rep.points, two.bounds)).toBe(false);
    expect(orthogonal(rep.points)).toBe(true);
  });

  it('its head is kept at the tip, along the last segment', () => {
    const s = chart();
    const ids = connectorsOf(s);
    s.route({ ids, at: at(1) });
    for (const id of ids) {
      const rep = routeRepOf(nodeOf(s, id))!;
      expect(rep.head, id).toBeDefined();
      const tip = rep.points[rep.points.length - 1], prev = rep.points[rep.points.length - 2];
      expect(rep.head!.tip).toEqual(tip);
      const dx = Math.sign(tip.x - prev.x), dy = Math.sign(tip.y - prev.y);
      for (const w of rep.head!.wings) {
        // A wing lies behind the tip along the last segment, and to a side of it.
        expect((w.x - tip.x) * dx + (w.y - tip.y) * dy).toBeLessThan(0);
        expect(Math.abs((w.x - tip.x) * dy) + Math.abs((w.y - tip.y) * dx)).toBeGreaterThan(0);
      }
    }
  });

  it('a box moved re-routes what is tied to it — one move event, the route from the sites where they stand now — and one undo springs it back', () => {
    const s = chart();
    const ids = connectorsOf(s);
    s.route({ ids, at: at(1) });
    const symbols = notationsOf(s.getState())[0].symbols;
    const go = symbols.find((x) => x.text === 'Go')!;
    const was = JSON.stringify(ROUTES(s));
    const n = s.getEvents().length;
    s.move({ ids: go.ids, dx: 90, dy: 40, at: at(2) });
    expect(s.getEvents().slice(n).map((e) => e.type)).toEqual(['move']);
    const st = s.getState();
    const moved = ids.map((id) => routeRepOf(nodeOf(s, id))!);
    expect(JSON.stringify(moved)).not.toBe(was);
    for (const [i, id] of ids.entries()) {
      const rep = moved[i];
      expect(orthogonal(rep.points)).toBe(true);
      for (const b of bindingsOf(nodeOf(s, id))) {
        const p = boundSiteOf(st.nodes.get(b.nodeId)!, st.nodes, b.site)!.point;
        expect([rep.points[0], rep.points[rep.points.length - 1]].some((e) => Math.hypot(e.x - p.x, e.y - p.y) < 1e-6)).toBe(true);
      }
    }
    s.undo();
    expect(JSON.stringify(ROUTES(s))).toBe(was);
  });

  it('a mark drawn in the way, or taken away, re-routes it too', () => {
    const s = chart('flowchart TD\n A[One] --> B[Two]');
    const ids = connectorsOf(s);
    s.route({ ids, at: at(1) });
    const rep0 = routeRepOf(nodeOf(s, ids[0]))!;
    const mid = { x: (rep0.points[0].x + rep0.points[rep0.points.length - 1].x) / 2, y: (rep0.points[0].y + rep0.points[rep0.points.length - 1].y) / 2 };
    const wall = s.addStroke(rectStroke(mid.x - 120, mid.y - 20, 240, 40), at(2), undefined, 1);
    const rep1 = routeRepOf(nodeOf(s, ids[0]))!;
    expect(rep1.avoided).toBe(true);
    expect(crossesAny(rep1.points, boundsOf(nodeOf(s, wall))!)).toBe(false);
    expect(JSON.stringify(rep1.points)).not.toBe(JSON.stringify(rep0.points));
    s.undo();
    expect(JSON.stringify(routeRepOf(nodeOf(s, ids[0]))!.points)).toBe(JSON.stringify(rep0.points));
  });

  it('undo takes the routing away, and showing the ink again does too; neither writes anything but its event', () => {
    const s = chart();
    const ids = connectorsOf(s);
    const n = s.getEvents().length;
    s.route({ ids, at: at(1) });
    s.undo();
    expect(s.getEvents().length).toBe(n);
    expect(ROUTES(s).every((r) => r === undefined)).toBe(true);
    s.route({ ids, at: at(2) });
    expect(s.route({ ids, mode: 'raw', at: at(3) })).toBe(3);
    expect(ROUTES(s).every((r) => r === undefined)).toBe(true);
    // Nothing to change, nothing written.
    const m = s.getEvents().length;
    expect(s.route({ ids, mode: 'raw', at: at(4) })).toBe(0);
    expect(s.getEvents().length).toBe(m);
  });

  it('a connector with an end tied to nothing is not routed: nothing is written for it', () => {
    const s = chart('flowchart TD\n A[One] --> B[Two]');
    const [id] = connectorsOf(s);
    s.unbind({ strokeId: id, end: 'end', at: at(1) });
    const n = s.getEvents().length;
    expect(s.route({ ids: [id], at: at(2) })).toBe(0);
    expect(s.getEvents().length).toBe(n);
  });

  it('a route whose end is let go stands no more — and stands again when the end is tied again', () => {
    const s = chart('flowchart TD\n A[One] --> B[Two]');
    const [id] = connectorsOf(s);
    s.route({ ids: [id], at: at(1) });
    const was = JSON.stringify(routeRepOf(nodeOf(s, id))!.points);
    const tie = bindingsOf(nodeOf(s, id)).map((b) => ({ ...b }));
    for (const b of tie) s.unbind({ strokeId: id, end: b.end as 'start' | 'end', at: at(2) });
    // Routed still, as the log says, with nothing to route between: the ink is drawn.
    expect(routeRepOf(nodeOf(s, id))!.points).toEqual([]);
    for (const b of tie) s.bind({ strokeId: id, nodeId: b.nodeId, site: b.site, end: b.end as 'start' | 'end', at: at(3) });
    expect(JSON.stringify(routeRepOf(nodeOf(s, id))!.points)).toBe(was);
  });

  it('state is a pure function of the log: replayed whole, or from a checkpoint, every route is the same', () => {
    const s = chart(CHART, named(4));
    const ids = connectorsOf(s);
    s.route({ ids, at: at(1) });
    const go = notationsOf(s.getState())[0].symbols.find((x) => x.text === 'Go')!;
    s.move({ ids: go.ids, dx: 60, dy: 25, at: at(2) });
    s.route({ ids: [ids[0]], mode: 'raw', at: at(3) });
    s.undo();
    const fresh = named();
    fresh.load(s.getEvents().slice());
    expect(JSON.stringify(ROUTES(fresh))).toBe(JSON.stringify(ROUTES(s)));
  });
});

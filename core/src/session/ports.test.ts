// Ports by notation — the hook beside `magnetSites` (V1-PLAN §4, §9 E3).
//
// A notation reads marks as its symbols and offers that notation's ports: a
// decision's vertices, a class's sides, a lifeline's whole length, a state's
// border. They come back through the queries the pen already asks —
// `magnetSites`, `nearestMagnet`, `magnetsNear` — so the surface feels them
// with no change, and a connector released on one binds there through the
// `bind` event as it is. No notation exists yet; the two here are test
// notations. Pinned first: with none registered, every query answers exactly
// as it did before the hook (the golden, captured from the code as it was).

import { describe, it, expect, afterEach } from 'vitest';
import { createSession } from './session';
import { magnetSites, nearestMagnet, magnetsNear, siteOf, bindingsOf, describeBinding, MAGNET_SCREEN_PX } from './magnets';
import type { MagnetSite } from './magnets';
import { registerPorts, unregisterPorts, registeredPorts, alongIndex, alongOf, ALONG_STEPS } from './ports';
import type { NotationPorts } from './ports';
import { snapReading } from './clean';
import { boundsOf, strokePointsOf } from './nodes';
import type { MMNode } from './nodes';
import { lineStroke, circleStroke } from '../test/strokes';
import { goldenBoard, goldenQueries } from '../test/magnets-golden';
import { MAGNETS_GOLDEN } from '../test/magnets.golden';
import type { Point } from '../types';

/** A vertical line reads as a lifeline: its head is a point port, its whole length a continuous one. */
const LIFELINES: NotationPorts = {
  notation: 'test-seq',
  portsOf(node: MMNode, nodes: ReadonlyMap<string, MMNode>) {
    if (snapReading(node, nodes).shape !== 'line') return null;
    const b = boundsOf(node)!;
    if (b.maxX - b.minX > 0.2 * (b.maxY - b.minY)) return null;
    const pts = strokePointsOf(node)!;
    const a = pts[0], z = pts[pts.length - 1];
    const [top, bottom] = a.y <= z.y ? [a, z] : [z, a];
    return {
      symbol: 'lifeline',
      ports: [
        { name: 'head', at: top, reasoning: 'where the lifeline hangs from' },
        { name: 'lifeline', along: [top, bottom], reasoning: 'anywhere down the lifeline' },
      ],
    };
  },
};

/** A circle reads as a state: its whole border is a continuous port. */
const STATES: NotationPorts = {
  notation: 'test-state',
  portsOf(node: MMNode, nodes: ReadonlyMap<string, MMNode>) {
    if (snapReading(node, nodes).shape !== 'circle') return null;
    const b = boundsOf(node)!;
    const c = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
    const r = (b.maxX - b.minX + b.maxY - b.minY) / 4;
    const ring: Point[] = [];
    for (let i = 0; i < 48; i++) ring.push({ x: c.x + r * Math.cos((i / 48) * 2 * Math.PI), y: c.y + r * Math.sin((i / 48) * 2 * Math.PI) });
    return { symbol: 'state', ports: [{ name: 'border', along: ring, closed: true, reasoning: 'anywhere on the state’s border' }] };
  },
};

const NOTHING: NotationPorts = { notation: 'test-nothing', portsOf: () => null };

const plain = (x: unknown) => JSON.parse(JSON.stringify(x));

afterEach(() => {
  for (const n of registeredPorts()) unregisterPorts(n);
});

/** A board with one lifeline (x = 400, y 100 → 400) and a connector coming at it from the left. */
function lifelineBoard() {
  const s = createSession();
  const lifeline = s.addStroke(lineStroke({ x: 400, y: 100 }, { x: 400, y: 400 }), 1000);
  const connector = s.addStroke(lineStroke({ x: 100, y: 200 }, { x: 391, y: 200 }), 5000);
  return { s, lifeline, connector };
}

describe('with no notation registered, the magnets are exactly as they were', () => {
  it('every query answers as the golden captured before the hook', () => {
    expect(registeredPorts()).toEqual([]);
    expect(plain(goldenQueries(goldenBoard()))).toEqual(MAGNETS_GOLDEN);
  });

  it('a notation that reads nothing adds nothing, and one unregistered leaves nothing behind', () => {
    registerPorts(NOTHING);
    expect(plain(goldenQueries(goldenBoard()))).toEqual(MAGNETS_GOLDEN);
    const off = registerPorts(LIFELINES);
    off();
    unregisterPorts(NOTHING.notation);
    expect(registeredPorts()).toEqual([]);
    expect(plain(goldenQueries(goldenBoard()))).toEqual(MAGNETS_GOLDEN);
  });
});

describe('a notation offers ports through the queries the pen already asks', () => {
  it('a point port is a site of its own kind, after the mark’s own sites', () => {
    registerPorts(LIFELINES);
    const { s, lifeline } = lifelineBoard();
    const st = s.getState();
    const sites = magnetSites(st.nodes.get(lifeline)!, st.nodes);
    // The line's own sites are first and unchanged.
    expect(sites.slice(0, 3).map((x) => x.kind)).toEqual(['tail', 'tip', 'middle']);
    const head = sites.find((x) => x.kind === 'port:test-seq')!;
    expect(head).toMatchObject({ nodeId: lifeline, index: 0, notation: 'test-seq', port: 'head', shape: 'lifeline' });
    expect(head.point).toEqual({ x: 400, y: 100 });
    expect(head.reasoning).toContain('where the lifeline hangs from');
  });

  it('a continuous port: the nearest point on it is the port, one hit per port', () => {
    registerPorts(LIFELINES);
    const { s, lifeline } = lifelineBoard();
    const st = s.getState();
    // A third of the way down, nine units off: no end, no middle is in reach.
    const at = { x: 391, y: 200 };
    const near = magnetsNear(at, st.nodes, [lifeline], 14);
    expect(near).toHaveLength(1);
    const hit = near[0];
    expect(hit.site.kind).toBe('along:test-seq');
    expect(hit.site.port).toBe('lifeline');
    expect(hit.site.point.x).toBeCloseTo(400, 6);
    expect(Math.abs(hit.site.point.y - 200)).toBeLessThanOrEqual(300 / ALONG_STEPS);
    expect(hit.distance).toBeCloseTo(9, 0);
    // nearestMagnet over the mark's sites says the same.
    const nearest = nearestMagnet(at, magnetSites(st.nodes.get(lifeline)!, st.nodes), 14)!;
    expect(nearest.site.kind).toBe('along:test-seq');
    expect(nearest.site.index).toBe(hit.site.index);
    expect(nearest.site.point).toEqual(hit.site.point);
  });

  it('the pen feels the whole length through magnetSites alone, as the surface asks today', () => {
    registerPorts(LIFELINES);
    const { s, lifeline } = lifelineBoard();
    const st = s.getState();
    const sites = magnetSites(st.nodes.get(lifeline)!, st.nodes);
    // The surface's own loop (Demos/surface/05-snap.js, magnetQuery): the nearest site point within the hand's radius.
    const feel = (w: Point) => {
      let best: { site: MagnetSite; distance: number } | null = null;
      for (const site of sites) {
        const distance = Math.hypot(site.point.x - w.x, site.point.y - w.y);
        if (distance <= MAGNET_SCREEN_PX && (!best || distance < best.distance)) best = { site, distance };
      }
      return best;
    };
    for (let y = 100; y <= 400; y += 5) {
      const felt = feel({ x: 394, y });
      expect(felt, `felt at y = ${y}`).not.toBeNull();
      // What it lands on can be found again from the kind and index alone.
      const again = siteOf(st.nodes.get(lifeline)!, st.nodes, { kind: felt!.site.kind, index: felt!.site.index })!;
      expect(again.point.x).toBeCloseTo(felt!.site.point.x, 9);
      expect(again.point.y).toBeCloseTo(felt!.site.point.y, 9);
    }
  });

  it('a connector released on a continuous port binds there, and the binding finds its place again', () => {
    registerPorts(LIFELINES);
    const { s, lifeline, connector } = lifelineBoard();
    const st = s.getState();
    const hit = magnetsNear({ x: 391, y: 200 }, st.nodes, [lifeline], 14)[0];
    s.bind({ strokeId: connector, nodeId: lifeline, site: { kind: hit.site.kind, index: hit.site.index }, end: 'end', at: 6000 });
    const b = bindingsOf(s.getState().nodes.get(connector)!, s.getState().nodes);
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ end: 'end', nodeId: lifeline, site: { kind: 'along:test-seq', index: hit.site.index }, active: true });
    expect(describeBinding(b[0])).toContain('along:test-seq');
    const found = siteOf(s.getState().nodes.get(lifeline)!, s.getState().nodes, b[0].site)!;
    expect(found.point).toEqual(hit.site.point);

    // The log is the source: replayed into a fresh session, the same claim finds the same place.
    const again = createSession();
    again.load(s.getEvents());
    const b2 = bindingsOf(again.getState().nodes.get(connector)!, again.getState().nodes);
    expect(b2.map((x) => x.site)).toEqual([b[0].site]);
    expect(siteOf(again.getState().nodes.get(lifeline)!, again.getState().nodes, b2[0].site)!.point).toEqual(hit.site.point);
  });

  it('a place along a port is a share of its length, so it moves with the mark', () => {
    registerPorts(LIFELINES);
    const { s, lifeline } = lifelineBoard();
    const hit = magnetsNear({ x: 391, y: 200 }, s.getState().nodes, [lifeline], 14)[0];
    s.move({ ids: [lifeline], dx: 50, dy: 20, at: 7000 });
    const moved = siteOf(s.getState().nodes.get(lifeline)!, s.getState().nodes, { kind: hit.site.kind, index: hit.site.index })!;
    expect(moved.point.x).toBeCloseTo(hit.site.point.x + 50, 6);
    expect(moved.point.y).toBeCloseTo(hit.site.point.y + 20, 6);
  });

  it('a closed outline port: a state’s border, the nearest point on it', () => {
    registerPorts(STATES);
    const s = createSession();
    const state = s.addStroke(circleStroke(500, 300, 80), 1000);
    const st = s.getState();
    // Off the rim at 30°, nowhere near a cardinal.
    const a = Math.PI / 6;
    const at = { x: 500 + 88 * Math.cos(a), y: 300 + 88 * Math.sin(a) };
    const hit = nearestMagnet(at, magnetSites(st.nodes.get(state)!, st.nodes), 14)!;
    expect(hit.site.kind).toBe('along:test-state');
    expect(Math.hypot(hit.site.point.x - 500, hit.site.point.y - 300)).toBeCloseTo(80, 0);
    expect(Math.atan2(hit.site.point.y - 300, hit.site.point.x - 500)).toBeCloseTo(a, 1);
  });

  it('a notation that throws is left out; the mark’s own sites and the other notations’ stand', () => {
    registerPorts({ notation: 'test-broken', portsOf: () => { throw new Error('a bug in a notation'); } });
    registerPorts(LIFELINES);
    const { s, lifeline } = lifelineBoard();
    const st = s.getState();
    const sites = magnetSites(st.nodes.get(lifeline)!, st.nodes);
    expect(sites.slice(0, 3).map((x) => x.kind)).toEqual(['tail', 'tip', 'middle']);
    expect(sites.some((x) => x.kind === 'port:test-seq')).toBe(true);
    expect(sites.some((x) => x.kind.includes('test-broken'))).toBe(false);
  });

  it('a notation no longer in use leaves its bindings as history: the claim stays, the place is not found', () => {
    const off = registerPorts(LIFELINES);
    const { s, lifeline, connector } = lifelineBoard();
    const hit = magnetsNear({ x: 391, y: 200 }, s.getState().nodes, [lifeline], 14)[0];
    s.bind({ strokeId: connector, nodeId: lifeline, site: { kind: hit.site.kind, index: hit.site.index }, end: 'end', at: 6000 });
    off();
    const st = s.getState();
    const b = bindingsOf(st.nodes.get(connector)!, st.nodes);
    expect(b).toHaveLength(1);
    expect(siteOf(st.nodes.get(lifeline)!, st.nodes, b[0].site)).toBeNull();
    // The mark's own sites are found as ever.
    expect(siteOf(st.nodes.get(lifeline)!, st.nodes, { kind: 'tip', index: 0 })!.point).toEqual({ x: 400, y: 400 });
  });

  it('where along a port is said in thousandths, per port', () => {
    expect(ALONG_STEPS).toBe(1000);
    expect(alongOf(alongIndex(0, 0.25))).toEqual({ ordinal: 0, t: 0.25 });
    expect(alongOf(alongIndex(2, 1))).toEqual({ ordinal: 2, t: 1 });
    expect(alongOf(alongIndex(1, 0))).toEqual({ ordinal: 1, t: 0 });
    expect(alongIndex(1, 0)).not.toBe(alongIndex(0, 1));
  });
});

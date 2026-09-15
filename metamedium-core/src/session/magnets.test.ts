import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import { magnetSites, nearestMagnet, magnetsNear, magnetRadius, describeMagnet } from './magnets';
import { circleStroke, rectStroke, lineStroke, triangleStroke, arcStroke, handArrow, handText } from '../test/strokes';

const built = (pts: { x: number; y: number }[]) => {
  const s = createSession();
  const id = s.addStroke(pts, 1000);
  const st = s.getState();
  return { id, sites: magnetSites(st.nodes.get(id)!, st.nodes), session: s };
};
const kinds = (sites: ReturnType<typeof built>['sites']) => sites.map((s) => s.kind);
const near = (a: { x: number; y: number }, b: { x: number; y: number }, tol = 2) =>
  Math.abs(a.x - b.x) <= tol && Math.abs(a.y - b.y) <= tol;

describe('magnets — the places a mark offers attachment', () => {
  it('a line offers tail, tip and middle', () => {
    const { sites } = built(lineStroke({ x: 100, y: 300 }, { x: 100, y: 100 }));
    expect(kinds(sites)).toEqual(['tail', 'tip', 'middle']);
    expect(near(sites[0].point, { x: 100, y: 300 })).toBe(true);
    expect(near(sites[1].point, { x: 100, y: 100 })).toBe(true);
    expect(near(sites[2].point, { x: 100, y: 200 })).toBe(true);
  });

  it('an arrow offers tail and tip where it actually points', () => {
    const { sites } = built(handArrow({ x: 100, y: 100 }, { x: 400, y: 100 }, { seed: 1 }));
    const tip = sites.find((s) => s.kind === 'tip')!;
    const tail = sites.find((s) => s.kind === 'tail')!;
    expect(tip.point.x).toBeGreaterThan(tail.point.x);
    expect(sites.find((s) => s.kind === 'middle')).toBeTruthy();
  });

  it('a rectangle offers four corners, four edge-middles and a centre', () => {
    const { sites } = built(rectStroke(100, 100, 200, 120));
    expect(kinds(sites).filter((k) => k === 'corner')).toHaveLength(4);
    expect(kinds(sites).filter((k) => k === 'middle')).toHaveLength(4);
    const centre = sites.find((s) => s.kind === 'centre')!;
    expect(near(centre.point, { x: 200, y: 160 })).toBe(true);
    const corners = sites.filter((s) => s.kind === 'corner');
    expect(corners.some((c) => near(c.point, { x: 100, y: 100 }, 6))).toBe(true);
    expect(corners.some((c) => near(c.point, { x: 300, y: 220 }, 6))).toBe(true);
  });

  it('a circle offers its centre and four cardinals at its own radii', () => {
    const { sites } = built(circleStroke(300, 200, 80));
    const centre = sites.find((s) => s.kind === 'centre')!;
    expect(near(centre.point, { x: 300, y: 200 })).toBe(true);
    const cardinals = sites.filter((s) => s.kind === 'cardinal');
    expect(cardinals).toHaveLength(4);
    expect(cardinals.every((c) => Math.abs(Math.hypot(c.point.x - 300, c.point.y - 200) - 80) < 4)).toBe(true);
  });

  it('a triangle offers three corners and the centroid', () => {
    const { sites } = built(triangleStroke({ x: 200, y: 100 }, { x: 320, y: 300 }, { x: 80, y: 300 }));
    expect(sites.filter((s) => s.kind === 'corner')).toHaveLength(3);
    const c = sites.find((s) => s.kind === 'centre')!;
    expect(near(c.point, { x: 200, y: 233 }, 6)).toBe(true);
  });

  it('an arc offers its two ends and the middle of its span', () => {
    const { sites } = built(arcStroke(200, 200, 100));
    expect(kinds(sites)).toEqual(['tail', 'tip', 'centre']);
  });

  it('writing offers only its bounds — an offer, never a lie about shape', () => {
    const { sites } = built(handText(100, 100, 120, 40, { seed: 2 }));
    expect(sites.length).toBeGreaterThan(0);
    expect(sites.every((s) => s.shape === 'ink')).toBe(true);
    expect(kinds(sites)).toContain('corner');
    expect(kinds(sites)).toContain('centre');
  });

  it('nearestMagnet takes the closest site inside the radius and refuses outside it', () => {
    const { sites } = built(rectStroke(100, 100, 200, 120));
    const corner = sites.find((s) => s.kind === 'corner' && near(s.point, { x: 100, y: 100 }, 6))!;
    const hit = nearestMagnet({ x: 108, y: 106 }, sites, 20);
    expect(hit!.site).toBe(corner);
    expect(nearestMagnet({ x: 500, y: 500 }, sites, 20)).toBeNull();
  });

  it('magnetsNear gathers across marks and honours the exclude set', () => {
    const s = createSession();
    const a = s.addStroke(rectStroke(100, 100, 100, 80), 1000);
    const bId = s.addStroke(circleStroke(320, 140, 40), 1001);
    const st = s.getState();
    const hits = magnetsNear({ x: 205, y: 140 }, st.nodes, [a, bId], 30);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].site.nodeId === a || hits[0].site.nodeId === bId).toBe(true);
    const excluded = magnetsNear({ x: 205, y: 140 }, st.nodes, [a, bId], 30, new Set([a]));
    expect(excluded.every((h) => h.site.nodeId !== a)).toBe(true);
  });

  it('the radius is about the hand: zoom scales the screen part, size the rest', () => {
    expect(magnetRadius(100, 1)).toBe(14);
    expect(magnetRadius(100, 2)).toBe(28);
    expect(magnetRadius(1000, 1)).toBe(60);
  });

  it('a held clean form moves the sites to the clean geometry, not the wobble', () => {
    const s = createSession();
    const id = s.addStroke(rectStroke(100, 100, 200, 120), 1000);
    s.snap({ ids: [id], at: 1001 });
    const st = s.getState();
    const sites = magnetSites(st.nodes.get(id)!, st.nodes);
    expect(sites.every((x) => x.shape === 'rectangle')).toBe(true);
    expect(sites.filter((x) => x.kind === 'corner')).toHaveLength(4);
  });

  it('describeMagnet says where, in one line', () => {
    const { sites } = built(lineStroke({ x: 100, y: 300 }, { x: 100, y: 100 }));
    expect(describeMagnet(sites[0])).toContain('(100, 300)');
  });
});

describe('bind — an arrow ends AT the box, and the graph says so', () => {
  it('a bind lands as a blessed bound-to edge, the site kept as a rep', () => {
    const s = createSession();
    const box = s.addStroke(rectStroke(100, 100, 200, 120), 1000);
    const line = s.addStroke(lineStroke({ x: 100, y: 100 }, { x: 500, y: 400 }), 1001);
    s.bind({ strokeId: line, nodeId: box, site: { kind: 'corner', index: 0 }, end: 'start', at: 1002 });
    const node = s.getState().nodes.get(line)!;
    const edge = node.edges.find((e) => e.rel === 'bound-to');
    expect(edge?.to).toBe(box);
    expect(edge?.blessed).toBe(true);
    expect(edge?.reasoning).toContain('start');
    const rep = node.reps.find((r) => r.modality === 'bound');
    expect(rep?.data).toEqual({ end: 'start', nodeId: box, site: { kind: 'corner', index: 0 } });
  });

  it('binding the same end again moves the claim, never doubles it', () => {
    const s = createSession();
    const a = s.addStroke(rectStroke(100, 100, 100, 80), 1000);
    const b = s.addStroke(circleStroke(400, 140, 40), 1001);
    const line = s.addStroke(lineStroke({ x: 100, y: 100 }, { x: 400, y: 140 }), 1002);
    s.bind({ strokeId: line, nodeId: a, site: { kind: 'corner', index: 0 }, end: 'start', at: 1003 });
    s.bind({ strokeId: line, nodeId: b, site: { kind: 'cardinal', index: 3 }, end: 'start', at: 1004 });
    const node = s.getState().nodes.get(line)!;
    expect(node.edges.filter((e) => e.rel === 'bound-to' && e.to === a)).toHaveLength(0);
    expect(node.reps.filter((r) => r.modality === 'bound' && (r.data as { end: string }).end === 'start')).toHaveLength(1);
    expect((node.reps.find((r) => r.modality === 'bound')!.data as { nodeId: string }).nodeId).toBe(b);
  });

  it('undo lets the bind go; the stroke stays', () => {
    const s = createSession();
    const box = s.addStroke(rectStroke(100, 100, 200, 120), 1000);
    const line = s.addStroke(lineStroke({ x: 100, y: 100 }, { x: 500, y: 400 }), 1001);
    s.bind({ strokeId: line, nodeId: box, site: { kind: 'corner', index: 0 }, end: 'end', at: 1002 });
    s.undo();
    const node = s.getState().nodes.get(line)!;
    expect(node.edges.some((e) => e.rel === 'bound-to')).toBe(false);
    expect(node.reps.some((r) => r.modality === 'bound')).toBe(false);
    // The stroke itself is untouched — only the claim went.
    expect(s.getState().nodes.has(line)).toBe(true);
    expect(s.getEvents().filter((e) => e.type === 'stroke')).toHaveLength(2);
  });

  it('a bind to a mark that is not there is nothing, not an error', () => {
    const s = createSession();
    const line = s.addStroke(lineStroke({ x: 100, y: 100 }, { x: 500, y: 400 }), 1001);
    s.bind({ strokeId: line, nodeId: 'stroke:nope', site: { kind: 'corner', index: 0 }, end: 'end', at: 1002 });
    expect(s.getState().nodes.get(line)!.edges.some((e) => e.rel === 'bound-to')).toBe(false);
  });
});

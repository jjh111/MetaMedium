// The routing tool (V1-PLAN §3, §9 D7): a drawing that reads as a notation and
// holds connectors tied at both ends is offered *Tidy the diagram* — tidy's
// alignment of the symbols and every connector routed, in one act — and *Route
// the connectors* alone; once routed, the way back is offered too. It is never
// offered for what has no connector tied at both ends: a row of boxes, a
// molecule, a flowchart drawn without its arrows bound.

import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG, type Session } from '../session/session';
import { boundsOf } from '../session/nodes';
import { notationsOf } from '../notations/notation';
import { toMermaid } from '../notations/mermaid';
import { drawMermaid } from '../notations/mermaid-in';
import { drawFlowchart, FLOWCHART_VARIANTS } from '../notations/fixtures/flowchart';
import { routeRepOf } from '../diagram/route';
import { rectStroke } from '../test/strokes';
import { offersFor, toolScope, takeOffer, getTool, registeredTools } from './registry';
import { rankOffers } from './rank';
import { BUILTIN_TOOLS } from './builtin';
import { ROUTE } from './route';

const named = () => createSession({ ...DEFAULT_SESSION_CONFIG, logName: 'router~t2' });
const hold = (s: Session, ids: string[], at = 900_000) => { s.summonMarks(ids, at); };
const offered = (s: Session) => rankOffers(offersFor(toolScope(s))).map((o) => o.key);
const offerOf = (s: Session, key: string) => rankOffers(offersFor(toolScope(s))).find((o) => o.key === key)!;
const CHART = 'flowchart TD\n A[Start] --> B{Ok?}\n B --> C[Go]\n B --> D[Stop]';

function chart(text = CHART) {
  const s = named();
  drawMermaid(s, text, { at: 1000 });
  hold(s, s.getState().contentIds.slice());
  return s;
}
const reading = (s: Session) => notationsOf(s.getState())[0];
const orthogonal = (pts: { x: number; y: number }[]) => pts.every((p, i) => i === 0 || (Math.abs(p.x - pts[i - 1].x) < 1e-9) !== (Math.abs(p.y - pts[i - 1].y) < 1e-9));
const centreY = (s: Session, text: string) => {
  const sym = reading(s).symbols.find((x) => x.text === text)!;
  const b = boundsOf(s.getState().nodes.get(sym.ids[0])!)!;
  return (b.minY + b.maxY) / 2;
};

describe('the routing tool', () => {
  it('is a built-in, registered after the field’s own (the trace tool follows it), so the existing order stands', () => {
    expect(BUILTIN_TOOLS[BUILTIN_TOOLS.length - 2]).toBe(ROUTE);
    expect(getTool('route')).toBe(ROUTE);
    expect(registeredTools().map((t) => t.id).indexOf('route')).toBe(BUILTIN_TOOLS.length - 2);
    expect(ROUTE.describe().length).toBeGreaterThan(20);
  });

  it('a flowchart with its arrows tied, held, is offered Tidy the diagram and Route the connectors — asking no model — and says what it read', () => {
    const s = chart();
    const keys = offered(s);
    expect(keys).toContain('tidy-diagram');
    expect(keys).toContain('route');
    expect(keys).not.toContain('unroute');
    const t = offerOf(s, 'tidy-diagram');
    expect(t).toMatchObject({ label: 'Tidy the diagram', tool: 'route' });
    expect(t.asks).toBeUndefined();
    expect(t.reason).toMatch(/flowchart/);
    expect(offerOf(s, 'route')).toMatchObject({ label: 'Route the connectors', tool: 'route' });
  });

  it('is offered for nothing else: not a flowchart drawn with its arrows loose, not one box, not a row', () => {
    const loose = named();
    drawFlowchart(loose, FLOWCHART_VARIANTS[0]);
    hold(loose, loose.getState().contentIds.slice());
    expect(offered(loose)).not.toContain('route');
    expect(offered(loose)).not.toContain('tidy-diagram');
    const row = named();
    const ids = [0, 1, 2].map((i) => row.addStroke(rectStroke(100 + i * 300, 100, 200, 100), 1000 + i, undefined, 1));
    hold(row, ids);
    expect(offered(row)).not.toContain('route');
    const one = named();
    hold(one, [one.addStroke(rectStroke(100, 100, 200, 100), 1000, undefined, 1)]);
    expect(offered(one)).not.toContain('tidy-diagram');
  });

  it('Route the connectors routes every tied connector in one act, and offers the way back', () => {
    const s = chart();
    const was = { mermaid: toMermaid(reading(s))!.text, summary: reading(s).summary };
    const before = s.getEvents().length;
    const taken = takeOffer(offerOf(s, 'route'), toolScope(s), s, 1_000_000);
    expect(taken.detail).toMatchObject({ routed: 3 });
    const wrote = s.getEvents().slice(before);
    expect(wrote.every((e) => e.tool === 'route' && e.offer === 'route')).toBe(true);
    expect(new Set(wrote.map((e) => e.act)).size).toBe(1);
    for (const c of reading(s).connectors) expect(routeRepOf(s.getState().nodes.get(c.id)!)!.points.length).toBeGreaterThanOrEqual(2);
    expect({ mermaid: toMermaid(reading(s))!.text, summary: reading(s).summary }).toEqual(was);
    hold(s, s.getState().contentIds.slice(), 1_100_000);
    expect(offered(s)).toContain('unroute');
    expect(offered(s)).not.toContain('route');
    takeOffer(offerOf(s, 'unroute'), toolScope(s), s, 1_200_000);
    for (const c of reading(s).connectors) expect(routeRepOf(s.getState().nodes.get(c.id)!)).toBeUndefined();
  });

  it('Tidy the diagram lines up the symbols of a rank and routes every connector — one act, one undo, the drawing reads as it did', () => {
    const s = chart();
    // Stop is knocked down out of its rank.
    const stop = reading(s).symbols.find((x) => x.text === 'Stop')!;
    s.move({ ids: stop.ids, dx: 0, dy: 70, at: 950_000 });
    hold(s, s.getState().contentIds.slice(), 960_000);
    expect(Math.abs(centreY(s, 'Stop') - centreY(s, 'Go'))).toBeGreaterThan(50);
    const was = { mermaid: toMermaid(reading(s))!.text, summary: reading(s).summary };
    const before = s.getEvents().length;
    const taken = takeOffer(offerOf(s, 'tidy-diagram'), toolScope(s), s, 1_000_000);
    expect(taken.detail).toMatchObject({ routed: 3 });
    const wrote = s.getEvents().slice(before);
    expect(wrote.map((e) => e.type)).toContain('tidy');
    expect(wrote.map((e) => e.type)).toContain('route');
    expect(wrote.every((e) => e.tool === 'route' && e.offer === 'tidy-diagram')).toBe(true);
    expect(new Set(wrote.map((e) => e.act)).size).toBe(1);
    // The rank is lined up; every connector is orthogonal; the drawing reads as it did.
    expect(Math.abs(centreY(s, 'Stop') - centreY(s, 'Go'))).toBeLessThan(1);
    const connectors = reading(s).connectors;
    expect(connectors.length).toBe(3);
    for (const c of connectors) expect(orthogonal(routeRepOf(s.getState().nodes.get(c.id)!)!.points)).toBe(true);
    expect({ mermaid: toMermaid(reading(s))!.text, summary: reading(s).summary }).toEqual(was);
    // One undo takes the whole tidy away — the symbols back where they stood, the routes gone.
    s.undo();
    expect(s.getEvents().length).toBe(before);
    expect(Math.abs(centreY(s, 'Stop') - centreY(s, 'Go'))).toBeGreaterThan(50);
    for (const c of reading(s).connectors) expect(routeRepOf(s.getState().nodes.get(c.id)!)).toBeUndefined();
  });
});

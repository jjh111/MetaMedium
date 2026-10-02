// *Make it a region* and `region: Monday` (PLAN-IPAD-NOTES I5): offered where a rectangle holds things,
// typed round marks with none, never in the golden scopes; one act, stamped, undone whole.

import { describe, it, expect } from 'vitest';
import { createSession, type Session } from '../session/session';
import { boundsOf } from '../session/nodes';
import { regionMembers, regionRepOf, describeRegion } from '../session/board-regions';
import { rectStroke, circleStroke } from '../test/strokes';
import { offersFor, toolScope, takeOffer, registeredTools } from './registry';
import { rankOffers } from './rank';
import './builtin';
import { makeRegion, regionFrameOf, regionRound, REGION_MIN_HELD, REGION_MARGIN_MIN, nextRegionName } from './region';

let clock = 1000;
const draw = (s: Session, pts: ReturnType<typeof rectStroke>) => s.addStroke(pts, (clock += 100), undefined, 1);
const hold = (s: Session, ids: string[]) => { s.summonMarks(ids, (clock += 100)); };
const notes = (s: Session) => [[60, 60], [260, 70], [120, 220]].map(([x, y]) => draw(s, rectStroke(x, y, 110, 70)));
const HASH = 'sha256:' + 'ef'.repeat(32);
const picture = (s: Session) => s.import({ kind: 'jpg', path: 'p.jpg', bounds: { minX: 300, minY: 220, maxX: 460, maxY: 340 }, asset: HASH, mime: 'image/jpeg', w: 1600, h: 1200, at: (clock += 100) })!;
const keys = (s: Session) => offersFor(toolScope(s, {})).map((o) => o.key);

describe('region — the tool', () => {
  it('is registered after trace (and, since I9, before notes like this), and describes itself', () => {
    const t = registeredTools();
    const at = t.findIndex((x) => x.id === 'region');
    expect(t[at - 1].id).toBe('trace');
    expect(t[at + 1].id).toBe('like');
    expect(t[at].describe()).toMatch(/holds whatever stands inside/);
  });

  it('a rectangle drawn round three notes and a picture is offered Make it a region, once held with them', () => {
    const s = createSession();
    const ns = notes(s);
    const pic = picture(s);
    const frame = draw(s, rectStroke(20, 20, 500, 360));
    hold(s, [frame, ...ns, pic]);
    const found = regionFrameOf(s.getState(), s.getState().summon!.enclosedIds);
    expect(found?.frame).toBe(frame);
    expect(found!.held.length).toBeGreaterThanOrEqual(REGION_MIN_HELD);
    const offers = offersFor(toolScope(s, {}));
    const o = offers.find((x) => x.key === 'region')!;
    expect(o).toMatchObject({ label: 'Make it a region', tool: 'region' });
    expect(o.hidden).toBeFalsy();
    expect(o.asks).toBeUndefined();
  });

  it('is not offered for a box with little in it, a row of boxes, a lone box or marks with no rectangle', () => {
    const s = createSession();
    const ns = notes(s);
    hold(s, ns);
    expect(keys(s)).not.toContain('region'); // no rectangle holds the rest
    const small = createSession();
    const frame = draw(small, rectStroke(20, 20, 500, 360));
    const [a] = notes(small);
    hold(small, [frame, a]);
    expect(keys(small)).not.toContain('region'); // holds one thing
    const lone = createSession();
    hold(lone, [draw(lone, rectStroke(20, 20, 500, 360))]);
    expect(keys(lone)).not.toContain('region');
    const flow = createSession();
    const f = draw(flow, rectStroke(20, 20, 500, 360));
    const inside = notes(flow);
    const outside = draw(flow, circleStroke(900, 200, 40));
    hold(flow, [f, ...inside, outside]); // one held mark stands outside: no frame
    expect(keys(flow)).not.toContain('region');
  });

  it('taking it is one act stamped region: the field closes first, then one region event at the rectangle, its ink kept', () => {
    const s = createSession();
    const ns = notes(s);
    const pic = picture(s);
    const frame = draw(s, rectStroke(20, 20, 500, 360));
    hold(s, [frame, ...ns, pic]);
    const scope = toolScope(s, {});
    const n = s.getEvents().length;
    const taken = takeOffer(offersFor(scope).find((o) => o.key === 'region')!, scope, s, (clock += 100));
    const evs = s.getEvents().slice(n);
    expect(evs.map((e) => [e.type, e.tool])).toEqual([['dismiss', 'region'], ['deselect', 'region'], ['region', 'region']]);
    expect(taken.made).toBeTruthy();
    const st = s.getState();
    const id = taken.made!;
    expect(st.regions).toEqual([id]);
    expect(regionRepOf(st.nodes.get(id)!)).toMatchObject({ name: 'Region 1', from: frame });
    expect(boundsOf(st.nodes.get(id)!)).toEqual(boundsOf(st.nodes.get(frame)!));
    expect(describeRegion(st, id)!.holds).toMatchObject({ marks: 3, pictures: 1 });
    // The frame is the region's, never counted as held; erasing the ink is the hand's, not this act.
    expect(regionMembers(st, id)).not.toContain(frame);
    s.undo();
    expect(s.getState().regions).toEqual([]);
    expect(s.getState().contentIds).toContain(frame);
  });

  it('typed, a region is drawn round the held marks with a margin — and marks with no rectangle never offer a pill', () => {
    const s = createSession();
    const ns = notes(s);
    hold(s, ns);
    const around = regionRound(s.getState(), ns)!;
    const union = ns.map((id) => boundsOf(s.getState().nodes.get(id)!)!);
    expect(around.minX).toBeLessThanOrEqual(Math.min(...union.map((b) => b.minX)) - REGION_MARGIN_MIN);
    expect(around.maxY).toBeGreaterThanOrEqual(Math.max(...union.map((b) => b.maxY)) + REGION_MARGIN_MIN);
    const made = makeRegion(s, { ids: ns, name: ' Monday ', at: (clock += 100), summonId: s.getState().summon!.id })!;
    expect(made).toMatchObject({ name: 'Monday', around: 'marks' });
    expect(describeRegion(s.getState(), made.id)!.holds.marks).toBe(3);
    // Nothing to stand it round: nothing made, nothing written.
    const n = s.getEvents().length;
    expect(makeRegion(s, { ids: [], name: 'x', at: (clock += 100) })).toBeNull();
    expect(s.getEvents().length).toBe(n);
  });

  it('a typed region takes a held rectangle that holds the rest as its frame, even when it holds one thing', () => {
    const s = createSession();
    const frame = draw(s, rectStroke(20, 20, 500, 360));
    const [a] = notes(s);
    hold(s, [frame, a]);
    const made = makeRegion(s, { ids: [frame, a], name: 'Pricing', at: (clock += 100), summonId: s.getState().summon!.id })!;
    expect(made.around).toBe('frame');
    expect(regionRepOf(s.getState().nodes.get(made.id)!)!.from).toBe(frame);
  });

  it('default names do not repeat', () => {
    const s = createSession();
    const ns = notes(s);
    expect(nextRegionName(s.getState())).toBe('Region 1');
    makeRegion(s, { ids: ns, at: (clock += 100) });
    expect(nextRegionName(s.getState())).toBe('Region 2');
    s.renameRegion({ nodeId: s.getState().regions[0], name: 'region 2', at: (clock += 100) });
    expect(nextRegionName(s.getState())).toBe('Region 1');
  });

  it('adds no pill to the golden scopes: a row of boxes, a molecule, a line of writing offer what they did', () => {
    const s = createSession();
    const row = [[200, 200], [360, 204], [520, 200]].map(([x, y]) => draw(s, rectStroke(x, y, 120, 80)));
    hold(s, row);
    expect(keys(s)).not.toContain('region');
    expect(rankOffers(offersFor(toolScope(s, {}))).some((o) => o.tool === 'region')).toBe(false);
  });
});

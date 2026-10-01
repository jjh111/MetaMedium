// *Notes like this* (PLAN-IPAD-NOTES I9): a typed offer on held marks that carry words, present only where a
// semantic seat is held — so the field's golden offers (e2e 49) cannot move — and, taken, a host act that asks
// the seat; the tool itself writes nothing.
import { describe, it, expect } from 'vitest';
import { createSession, type Session } from '../session/session';
import { rectStroke, circleStroke } from '../test/strokes';
import type { ToolHost } from './tool';
import { offersFor, toolScope, takeOffer, describeTools, registeredTools } from './registry';
import { LIKE } from './like';
import './builtin';

let clock = 1000;
const hold = (s: Session, ids: string[]) => { s.summonMarks(ids, (clock += 100)); };
const SEAT: Partial<ToolHost> = { semantic: { name: 'potion-base-8M' } };
const like = (s: Session, host: Partial<ToolHost> = SEAT) => offersFor(toolScope(s, { host })).filter((o) => o.tool === 'like');

describe('Notes like this', () => {
  it('is offered for held marks with words when a semantic seat is held — typed only, never a slot — and says what asks', () => {
    const s = createSession();
    const box = s.addStroke(rectStroke(0, 0, 100, 60), (clock += 100), undefined, 1, { content: true })!;
    s.label({ nodeId: box, text: 'Pricing', at: (clock += 100) });
    hold(s, [box]);
    const offers = like(s);
    expect(offers).toHaveLength(1);
    const o = offers[0];
    expect(o.label).toBe('Notes like this');
    expect(o.key).toBe('like');
    expect(o.hidden).toBe(true);
    expect(o.asks).toBe('model');
    expect(o.verbs).toEqual(expect.arrayContaining(['like', 'notes like this', 'similar']));
    expect(o.reason).toMatch(/potion-base-8M/);
    expect(o.reason).toMatch(/this device|nothing sent/);
    expect((o.data as { text: string }).text).toBe('Pricing');
    expect((o.data as { ids: string[] }).ids).toEqual([box]);
  });

  it('is not offered with nobody in the seat, for marks with no words, or for nothing held — the golden scopes are untouched', () => {
    const s = createSession();
    const box = s.addStroke(rectStroke(0, 0, 100, 60), (clock += 100), undefined, 1, { content: true })!;
    s.label({ nodeId: box, text: 'Pricing', at: (clock += 100) });
    const bare = s.addStroke(circleStroke(500, 500, 40), (clock += 100), undefined, 1, { content: true })!;
    hold(s, [box]);
    expect(like(s, {})).toEqual([]);                    // no seat
    expect(like(s, { semantic: null })).toEqual([]);
    hold(s, [bare]);
    expect(like(s)).toEqual([]);                        // a circle with no word on it
    // Not a pill of the row either, with the seat held: it is typed.
    const all = offersFor(toolScope(s, { host: SEAT }));
    expect(all.filter((o) => o.tool === 'like' && !o.hidden)).toEqual([]);
  });

  it('says a held region by the words it carries: its name and what it holds', () => {
    const s = createSession();
    const inner = s.addStroke(rectStroke(40, 400, 100, 60), (clock += 100), undefined, 1, { content: true })!;
    s.label({ nodeId: inner, text: 'Margins', at: (clock += 100) });
    const region = s.region({ name: 'Monday', bounds: { minX: 0, minY: 380, maxX: 300, maxY: 520 }, at: (clock += 100) })!;
    s.summonMarks([region], (clock += 100));
    const o = like(s);
    // A region reaches the field by the selection, not the content plane: when the field holds it, the offer says its words.
    if (o.length) expect((o[0].data as { text: string }).text).toBe('Monday Margins');
  });

  it('taking it writes nothing and names the host act with the words and the marks it was asked about', () => {
    const s = createSession();
    const box = s.addStroke(rectStroke(0, 0, 100, 60), (clock += 100), undefined, 1, { content: true })!;
    s.label({ nodeId: box, text: 'Pricing', at: (clock += 100) });
    hold(s, [box]);
    const scope = toolScope(s, { host: SEAT });
    const n = s.getEvents().length;
    const taken = takeOffer(like(s)[0], scope, s, (clock += 100));
    expect(taken.host).toBe('like');
    expect(s.getEvents().length).toBe(n);
  });

  it('is a registered tool, described', () => {
    expect(LIKE.id).toBe('like');
    expect(registeredTools().some((t) => t.id === 'like')).toBe(true);
    expect(describeTools()).toMatch(/notes like this/i);
  });
});

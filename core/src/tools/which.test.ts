// *Which is it?* (V1-PLAN I7, PLAN-IPAD-NOTES §3 the decider): when the library's top two
// definitions match a held group about equally, and a decider is seated, the field OFFERS to
// ask it — a deliberate act with a dot, never taken for the hand, never on a clear lead and
// never with nobody in the seat. The asking is the host's; the offer is data.

import { describe, it, expect } from 'vitest';
import { createSession, type Session } from '../session/session';
import type { Point } from '../types';
import type { ToolHost } from './tool';
import { offersFor, toolScope, takeOffer } from './registry';
import { WHICH, TIE_MARGIN, tiedMatches } from './which';
import './builtin';

const line = (a: Point, b: Point, n = 40): Point[] => Array.from({ length: n }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / (n - 1), y: a.y + ((b.y - a.y) * i) / (n - 1) }));
const circle = (cx: number, cy: number, r: number, n = 110): Point[] => Array.from({ length: n + 1 }, (_, i) => ({ x: cx + r * Math.cos((i / n) * Math.PI * 2), y: cy + r * Math.sin((i / n) * Math.PI * 2) }));

let clock = 1000;
const draw = (s: Session, pts: Point[]) => s.addStroke(pts, (clock += 100), undefined, 1);
const molecule = (s: Session, ox: number) => [
  ...[[300, 300], [500, 300], [400, 460]].map(([x, y]) => draw(s, circle(ox + x, y, 40))),
  draw(s, line({ x: ox + 340, y: 300 }, { x: ox + 460, y: 300 }, 30)),
  draw(s, line({ x: ox + 328, y: 328 }, { x: ox + 372, y: 432 }, 30)),
];
const nameIt = (s: Session, ids: string[], name: string) => {
  s.summonMarks(ids, (clock += 100));
  s.bless({ summonId: s.getState().summon!.id, name, at: (clock += 100) });
};
const hold = (s: Session, ids: string[]) => { s.summonMarks(ids, (clock += 100)); };

const DECIDER: Partial<ToolHost> = { decider: { name: 'jev' } };
const which = (s: Session, host: Partial<ToolHost> = DECIDER) => offersFor(toolScope(s, { host })).filter((o) => o.tool === 'which');

describe('Which is it?', () => {
  it('is offered when the top two definitions tie and a decider is seated — and says what it asks, and that it asks a model', () => {
    const s = createSession();
    nameIt(s, molecule(s, 0), 'molecule');
    nameIt(s, molecule(s, 1200), 'compound');
    hold(s, molecule(s, 2400));
    const sugs = s.getState().summon!.suggestions.filter((x) => x.kind === 'match');
    expect(sugs.length).toBeGreaterThanOrEqual(2);
    const offers = which(s);
    expect(offers).toHaveLength(1);
    const o = offers[0];
    expect(o.label).toBe('Which is it?');
    expect(o.asks).toBe('model');
    expect(o.reason).toMatch(/molecule/);
    expect(o.reason).toMatch(/compound/);
    expect(o.reason).toMatch(/jev/);
    // The candidates the question will be about: the tied matches only, by name, with the suggestion each is.
    expect((o.data as { candidates: { id: string; text: string }[] }).candidates.map((c) => c.id).sort()).toEqual(['compound', 'molecule']);
  });

  it('is not offered on a clear lead, with one match, with none, or with nobody in the seat', () => {
    const s = createSession();
    nameIt(s, molecule(s, 0), 'molecule');
    hold(s, molecule(s, 1200));
    expect(which(s)).toEqual([]);                       // one match
    const t = createSession();
    hold(t, molecule(t, 0));
    expect(which(t)).toEqual([]);                       // none
    const u = createSession();
    nameIt(u, molecule(u, 0), 'molecule');
    nameIt(u, molecule(u, 1200), 'compound');
    hold(u, molecule(u, 2400));
    expect(which(u, {})).toEqual([]);                   // tied, but nobody in the seat
    expect(which(u, { decider: null })).toEqual([]);
  });

  it('tiedMatches keeps what is within the margin of the top, never fewer than the top, never the rest', () => {
    const m = (name: string, score: number) => ({ artifactId: name, name, score, reasoning: '' });
    expect(tiedMatches([m('a', 0.9), m('b', 0.9 - TIE_MARGIN / 2), m('c', 0.5)]).map((x) => x.name)).toEqual(['a', 'b']);
    expect(tiedMatches([m('a', 0.9), m('b', 0.5)]).map((x) => x.name)).toEqual(['a']);
    expect(tiedMatches([])).toEqual([]);
  });

  it('taking it names the host act and writes nothing itself', () => {
    const s = createSession();
    nameIt(s, molecule(s, 0), 'molecule');
    nameIt(s, molecule(s, 1200), 'compound');
    hold(s, molecule(s, 2400));
    const o = which(s)[0];
    const before = s.getEvents().length;
    const taken = takeOffer(o, toolScope(s, { host: DECIDER }), s, 5000);
    expect(taken.host).toBe('which');
    expect(s.getEvents().length).toBe(before);
    expect(WHICH.asks).toBe('model');
  });
});

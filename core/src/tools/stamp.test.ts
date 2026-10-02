// Events a tool writes carry its id (V1-PLAN B1), stamped where authorship is
// — so the log says which tool did what, and context (B2) can read what was
// just taken where. Provenance, never state: replay ignores it.

import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG, type SessionEvent } from '../session/session';
import { rectStroke } from '../test/strokes';
import type { Tool } from './tool';
import { registerTool, takeOffer, toolScope, offersFor } from './registry';

function threeBoxes(config = DEFAULT_SESSION_CONFIG) {
  const s = createSession(config);
  const ids = [
    s.addStroke(rectStroke(100, 100, 120, 80), 1000),
    s.addStroke(rectStroke(260, 110, 120, 80), 1100),
    s.addStroke(rectStroke(420, 96, 120, 80), 1200),
  ];
  return { s, ids };
}

const shape = (s: ReturnType<typeof createSession>) => {
  const st = s.getState();
  return JSON.stringify({
    content: st.contentIds,
    artifacts: st.artifacts,
    nodes: [...st.nodes.entries()].map(([id, n]) => [id, n.reps, n.edges]),
    clocks: st.clocks,
  });
};

describe('what a tool writes carries its id', () => {
  it('withTool stamps every event written inside it, and only those', () => {
    const { s, ids } = threeBoxes();
    const before = s.getEvents().length;
    s.withTool('tidy', () => s.tidy({ ids, mode: 'align', axis: 'row', at: 2000 }));
    s.tidy({ ids, mode: 'equalize', at: 2100 });
    const evs = s.getEvents().slice(before);
    expect(evs.map((e) => [e.type, e.tool])).toEqual([['tidy', 'tidy'], ['tidy', undefined]]);
    // Nothing drawn before is stamped.
    expect(s.getEvents().slice(0, before).every((e) => e.tool === undefined)).toBe(true);
  });

  it('an act that took an offer says which: the offer\'s key beside the tool', () => {
    const { s, ids } = threeBoxes();
    s.withTool('tidy', () => s.tidy({ ids, mode: 'align', axis: 'row', at: 2000 }), 'row:tidy-row');
    s.withTool('tidy', () => s.tidy({ ids, mode: 'equalize', at: 2100 }));
    const [a, b] = s.getEvents().slice(-2);
    expect(a).toMatchObject({ tool: 'tidy', offer: 'row:tidy-row' });
    expect(b.tool).toBe('tidy');
    expect('offer' in b).toBe(false);
  });

  it('nested, the innermost tool is stamped; a throw puts the one before back', () => {
    const { s, ids } = threeBoxes();
    const n = s.getEvents().length;
    s.withTool('outer', () => {
      s.withTool('inner', () => s.snap({ ids, at: 2000 }));
      s.tidy({ ids, mode: 'equalize', at: 2100 });
    });
    expect(() => s.withTool('broken', () => { throw new Error('no'); })).toThrow('no');
    s.tidy({ ids, mode: 'equalize', at: 2200 });
    expect(s.getEvents().slice(n).map((e) => e.tool)).toEqual(['inner', 'outer', undefined]);
  });

  it('an event that already names its tool keeps it; a room\'s ids and authorship are stamped as before', () => {
    const { s, ids } = threeBoxes({ ...DEFAULT_SESSION_CONFIG, logName: 'fern~f1' });
    s.withTool('tidy', () => s.tidy({ ids, mode: 'align', axis: 'row', at: 2000 }));
    const last = s.getEvents()[s.getEvents().length - 1];
    expect(last).toMatchObject({ type: 'tidy', tool: 'tidy', origin: 'fern~f1' });
    expect(typeof last.seq).toBe('number');
  });

  it('replay ignores it: the same log with and without the stamps is the same board', () => {
    const { s, ids } = threeBoxes();
    s.withTool('tidy', () => s.tidy({ ids, mode: 'align', axis: 'row', at: 2000 }));
    s.withTool('clean', () => s.snap({ ids, at: 2100 }));
    const sum = s.summonMarks(ids, 2200)!;
    s.withTool('name', () => s.bless({ summonId: sum, name: 'boxes', at: 2300 }));
    const stamped = s.getEvents();
    expect(stamped.filter((e) => e.tool).length).toBe(3);
    const bare: SessionEvent[] = stamped.map(({ tool: _tool, offer: _offer, ...e }) => e as SessionEvent);
    const a = createSession(); a.load(stamped);
    const b = createSession(); b.load(bare);
    expect(shape(a)).toBe(shape(s));
    expect(shape(b)).toBe(shape(a));
    // And undo walks back through a stamped event like any other.
    a.undo();
    b.undo();
    expect(shape(a)).toBe(shape(b));
  });

  it('takeOffer is the one door: what the tool writes is stamped with its id', () => {
    const { s, ids } = threeBoxes();
    const EQUALIZE: Tool = {
      id: 'test:equalize',
      name: 'equalize',
      describe: () => 'the same size',
      offers: (scope) => [{ key: 'test:equalize', label: 'Same size', reason: 'a test', base: 0.4, tool: 'test:equalize', data: scope.marks }],
      take: (offer, _scope, session, at) => {
        session.tidy({ ids: offer.data as string[], mode: 'equalize', at });
        return { detail: 'equalized' };
      },
    };
    const off = registerTool(EQUALIZE);
    try {
      s.summonMarks(ids, 1500);
      const scope = toolScope(s);
      const offer = offersFor(scope).find((o) => o.tool === 'test:equalize')!;
      const taken = takeOffer(offer, scope, s, 2000);
      expect(taken).toEqual({ detail: 'equalized' });
      const last = s.getEvents()[s.getEvents().length - 1];
      expect(last).toMatchObject({ type: 'tidy', mode: 'equalize', tool: 'test:equalize', offer: 'test:equalize' });
    } finally {
      off();
    }
  });
});

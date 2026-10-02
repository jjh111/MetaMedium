// Notations — readings over the diagram rung (V1-PLAN §2.3, §3, §9 D1).
//
// A notation reads a scope the way a concept does, over shapes, measures,
// relations and roles, and says what the marks are in ITS terms: a flowchart's
// processes, decisions and flows. It says which of the six roles each symbol
// plays and adds none. Every notation reads, plural and ranked, each with a
// confidence and a reason; nothing it reads enters the log. Its ports reach
// the pen through E3's hook (session/ports.ts) when a board puts the notation
// in use — offered, never silently present.

import { describe, it, expect, afterEach } from 'vitest';
import { createSession } from '../session/session';
import type { Session } from '../session/session';
import { ROLES } from '../diagram/roles';
import type { Role } from '../diagram/roles';
import { registeredPorts, unregisterPorts } from '../session/ports';
import { registerNotation, unregisterNotation, registeredNotations, notationById, notationsOf, offerPorts, describeNotation, NOTATION_FLOOR } from './notation';
import type { Notation, NotationReading } from './notation';
import { FLOWCHART, FLOWCHART_TABLE } from './flowchart';
import { handRect, handArrow, handText } from '../test/strokes';

/** A reading with nothing in it but a number and a reason. */
function reading(notation: string, confidence: number, scope: readonly string[], role: Role = 'node'): NotationReading {
  return {
    notation,
    name: notation,
    confidence,
    summary: `${scope.length} marks`,
    reason: `a test reading of ${scope.length} marks`,
    symbols: [],
    connectors: [],
    labels: [],
    roles: Object.fromEntries(scope.map((id) => [id, role])),
    unplaced: [],
    counts: {},
  };
}

function testNotation(id: string, read: Notation['read']): Notation {
  return { id, name: id, describes: `the ${id} test notation`, symbols: [{ name: 'thing', role: 'node', describes: 'a thing', ports: 'none' }], connectors: [], read };
}

/** Two boxes and an arrow from one to the other, drawn apart in time. */
function twoBoxes(): { s: Session; ids: string[] } {
  const s = createSession();
  const a = s.addStroke(handRect(100, 100, 160, 70, { seed: 1 }), 1000);
  const b = s.addStroke(handRect(100, 300, 160, 70, { seed: 2 }), 5000);
  const f = s.addStroke(handArrow({ x: 180, y: 174 }, { x: 180, y: 296 }, { wings: 2, headLen: 16, seed: 3, jitter: 1 }), 9000);
  return { s, ids: [a, b, f] };
}

const mine: string[] = [];
afterEach(() => {
  for (const id of mine.splice(0)) unregisterNotation(id);
  for (const n of registeredPorts()) unregisterPorts(n); // leave the pen as it was found
});
const add = (n: Notation) => {
  mine.push(n.id);
  return registerNotation(n);
};

describe('a notation is a reading over the diagram rung', () => {
  it('the flowchart is known from the start: six symbols and a flow, each playing one of the six roles', () => {
    expect(registeredNotations()).toContain('flowchart');
    expect(notationById('flowchart')).toBe(FLOWCHART);
    expect(FLOWCHART.symbols.map((s) => s.name)).toEqual(['process', 'decision', 'terminator', 'data', 'start', 'end']);
    expect(FLOWCHART.connectors.map((c) => c.name)).toEqual(['flow']);
    for (const s of FLOWCHART.symbols) expect(ROLES).toContain(s.role);
    for (const c of FLOWCHART.connectors) expect(ROLES).toContain(c.role);
    expect(FLOWCHART.symbols.every((s) => s.role === 'node')).toBe(true);
    expect(FLOWCHART.connectors[0].role).toBe('edge');
  });

  it('its content is a table — names, roles, ports and Mermaid — marked to move into the flowchart@1 pack', () => {
    expect(FLOWCHART_TABLE.pack).toBe('flowchart@1');
    for (const s of FLOWCHART.symbols) {
      const row = FLOWCHART_TABLE.symbols[s.name as keyof typeof FLOWCHART_TABLE.symbols];
      expect(row, s.name).toBeDefined();
      expect(row.role).toBe(s.role);
      expect(row.mermaid.open.length).toBeGreaterThan(0);
    }
    expect(FLOWCHART_TABLE.connectors.flow.mermaid).toMatchObject({ forward: '-->', none: '---', both: '<-->' });
  });

  it('a notation says which of the six roles its symbols play; it adds none', () => {
    const seventh = { ...testNotation('test-seventh', () => null), symbols: [{ name: 'widget', role: 'widget' as Role, describes: 'a seventh role', ports: 'none' }] };
    expect(() => add(seventh)).toThrow(/six roles/);
    expect(registeredNotations()).not.toContain('test-seventh');
  });
});

describe('every notation reads, plural and ranked', () => {
  it('each reading with a confidence and a reason, the likeliest first', () => {
    const { s, ids } = twoBoxes();
    add(testNotation('test-low', (_st, scope) => reading('test-low', 0.3, scope)));
    add(testNotation('test-high', (_st, scope) => reading('test-high', 0.7, scope)));
    const all = notationsOf(s.getState());
    const names = all.map((r) => r.notation);
    expect(names).toEqual(expect.arrayContaining(['test-low', 'test-high', 'flowchart']));
    for (let i = 1; i < all.length; i++) expect(all[i - 1].confidence).toBeGreaterThanOrEqual(all[i].confidence);
    for (const r of all) {
      expect(r.confidence).toBeGreaterThan(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
      expect(r.reason.length).toBeGreaterThan(5);
    }
    // The whole content plane by default; a scope narrows it.
    expect(Object.keys(all.find((r) => r.notation === 'test-low')!.roles).sort()).toEqual([...ids].sort());
    const narrow = notationsOf(s.getState(), [ids[0]]).find((r) => r.notation === 'test-low')!;
    expect(Object.keys(narrow.roles)).toEqual([ids[0]]);
  });

  it('a notation that reads nothing is left out, and so is one that throws', () => {
    const { s } = twoBoxes();
    add(testNotation('test-nothing', () => null));
    add(testNotation('test-broken', () => { throw new Error('a bug in a notation'); }));
    const names = notationsOf(s.getState()).map((r) => r.notation);
    expect(names).not.toContain('test-nothing');
    expect(names).not.toContain('test-broken');
    expect(names).toContain('flowchart');
  });

  it('a reading that names a role outside the six is left out', () => {
    const { s } = twoBoxes();
    add(testNotation('test-rogue', (_st, scope) => reading('test-rogue', 0.9, scope, 'widget' as Role)));
    expect(notationsOf(s.getState()).map((r) => r.notation)).not.toContain('test-rogue');
  });

  it('registering again replaces; unregistering takes it back', () => {
    const { s } = twoBoxes();
    add(testNotation('test-twice', (_st, scope) => reading('test-twice', 0.2, scope)));
    add(testNotation('test-twice', (_st, scope) => reading('test-twice', 0.6, scope)));
    expect(notationsOf(s.getState()).filter((r) => r.notation === 'test-twice').map((r) => r.confidence)).toEqual([0.6]);
    expect(unregisterNotation('test-twice')).toBe(true);
    expect(unregisterNotation('test-twice')).toBe(false);
    expect(notationsOf(s.getState()).map((r) => r.notation)).not.toContain('test-twice');
  });

  it('a board with nothing a notation knows reads as nothing', () => {
    const s = createSession();
    s.addStroke(handText(100, 100, 150, 28, { seed: 4 }), 1000);
    expect(notationsOf(s.getState()).filter((r) => r.notation === 'flowchart')).toEqual([]);
    expect(notationsOf(createSession().getState())).toEqual([]);
  });
});

describe('ports reach the pen through E3’s hook when the notation is put in use', () => {
  it('not before: knowing a notation changes nothing the pen feels', () => {
    expect(registeredPorts()).toEqual([]);
  });

  it('offered, then taken back', () => {
    const off = offerPorts('flowchart');
    expect(registeredPorts()).toEqual(['flowchart']);
    off();
    expect(registeredPorts()).toEqual([]);
    // A notation nobody knows offers nothing.
    offerPorts('no-such-notation')();
    expect(registeredPorts()).toEqual([]);
  });
});

describe('a reading is derived', () => {
  it('nothing enters the log, and it says itself in one line', () => {
    const { s } = twoBoxes();
    const events = s.getEvents().length;
    const nodes = s.getState().nodes.size;
    const all = notationsOf(s.getState());
    expect(s.getEvents().length).toBe(events);
    expect(s.getState().nodes.size).toBe(nodes);
    const flow = all.find((r) => r.notation === 'flowchart')!;
    expect(describeNotation(flow)).toMatch(/^a flowchart \d\.\d\d — two processes, one flow/);
    expect(NOTATION_FLOOR).toBeGreaterThan(0);
    expect(NOTATION_FLOOR).toBeLessThan(1);
  });
});

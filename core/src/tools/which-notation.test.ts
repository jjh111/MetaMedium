// Which diagram is this? (the audit's D2): John's two boxes and a line read as no notation surely — a flowchart
// 0.36, an ER diagram 0.16 — so the field offers, with a decider seated and only then, to ask which kind of
// diagram it is; the answer is held as a decision (never a reading, never a name) only at DECIDER_TAKE_AT, and a
// held decision is what lets *Make it Mermaid* write the drawing in the notation decided. Undo takes it back.

import { describe, it, expect } from 'vitest';
import { createSession, type Session } from '../session/session';
import type { Point } from '../types';
import type { ToolHost } from './tool';
import { offersFor, toolScope, takeOffer } from './registry';
import { notationQuestion, notationCandidates, decidedNotationOf, readingDecided, NOTATION_QUESTION } from './which-notation';
import { mermaidFor } from './mermaid';
import { diagramOf } from './route';
import { createDecideParticipant, createStubDecideTransport, DECIDER_TAKE_AT } from '../participants/decide';
import { interpretationsOf } from '../session/interpretations';
import { BUILTIN_TOOLS } from './builtin';

const line = (a: Point, b: Point, n = 40): Point[] => Array.from({ length: n }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / (n - 1), y: a.y + ((b.y - a.y) * i) / (n - 1) }));
const circle = (cx: number, cy: number, r: number, n = 110): Point[] => Array.from({ length: n + 1 }, (_, i) => ({ x: cx + r * Math.cos((i / n) * Math.PI * 2), y: cy + r * Math.sin((i / n) * Math.PI * 2) }));

let clock = 1000;
const draw = (s: Session, pts: Point[]) => s.addStroke(pts, (clock += 100), undefined, 1);
const box = (s: Session, x: number, y: number) => draw(s, [...line({ x, y }, { x: x + 160, y }), ...line({ x: x + 160, y }, { x: x + 160, y: y + 100 }), ...line({ x: x + 160, y: y + 100 }, { x, y: y + 100 }), ...line({ x, y: y + 100 }, { x, y })]);
/** John's two boxes and a line between them, not tied: every notation reads it under the floor. */
function boxesAndLine(s: Session) { return [box(s, 100, 100), box(s, 500, 100), draw(s, line({ x: 262, y: 150 }, { x: 498, y: 150 }))]; }
const hold = (s: Session, ids: string[]) => { s.summonMarks(ids, (clock += 100)); };

const DECIDER: Partial<ToolHost> = { decider: { name: 'Clef-flash' } };
const offered = (s: Session, host: Partial<ToolHost> = DECIDER) => offersFor(toolScope(s, { host }));
const which = (s: Session, host: Partial<ToolHost> = DECIDER) => offered(s, host).filter((o) => o.tool === 'which-notation');

/** Ask the decider the offer's question through the seat, its answer as the stub is told. */
async function decide(s: Session, ids: string[], pick: string, p: number) {
  const seat = createDecideParticipant(s, createStubDecideTransport({ [NOTATION_QUESTION + ids[0]]: { pick, p } }), (clock += 100), { name: 'Clef-flash', locality: 'hosted', takeAt: DECIDER_TAKE_AT });
  return seat.ask([notationQuestion(ids, notationCandidates(s.getState(), ids))], (clock += 100));
}

describe('Which diagram is this?', () => {
  it('is offered for boxes and a line no notation reads surely — with a decider, and only then — the notations read and a plain diagram its candidates', () => {
    const s = createSession();
    const ids = boxesAndLine(s);
    hold(s, ids);
    const offers = which(s);
    expect(offers).toHaveLength(1);
    expect(offers[0]).toMatchObject({ label: 'Which diagram is this?', asks: 'model', tool: 'which-notation' });
    expect(offers[0].reason).toMatch(/a flowchart 0\.\d\d/);
    expect(offers[0].reason).toMatch(/Clef-flash/);
    const cands = (offers[0].data as { candidates: { id: string; text: string }[] }).candidates;
    expect(cands.map((c) => c.id)).toEqual(['flowchart', 'er', 'diagram']);
    expect(which(s, {})).toEqual([]);
    expect(which(s, { decider: null })).toEqual([]);
    // Nothing else the field offers changed by its being there: it is the last offer.
    expect(offered(s).map((o) => o.tool).indexOf('which-notation')).toBe(offered(s).length - 1);
    expect(BUILTIN_TOOLS[BUILTIN_TOOLS.length - 1].id).toBe('which-notation');
  });

  it('is not offered for one mark, for an artifact, for a group a definition matches, or where a notation reads surely', () => {
    const s = createSession();
    const ids = boxesAndLine(s);
    hold(s, ids.slice(0, 1));
    expect(which(s)).toEqual([]);
    // A molecule named and drawn again: a definition matches — *Which is it?* is its question.
    const t = createSession();
    const mol = () => [draw(t, circle(300, 300, 40)), draw(t, circle(500, 300, 40)), draw(t, line({ x: 340, y: 300 }, { x: 460, y: 300 }, 30))];
    const first = mol();
    hold(t, first);
    t.bless({ summonId: t.getState().summon!.id, name: 'molecule', at: (clock += 100) });
    const again = [draw(t, circle(300, 900, 40)), draw(t, circle(500, 900, 40)), draw(t, line({ x: 340, y: 900 }, { x: 460, y: 900 }, 30))];
    hold(t, again);
    expect(t.getState().summon!.suggestions.some((x) => x.kind === 'match')).toBe(true);
    expect(which(t)).toEqual([]);
  });

  it('taking it names the host act and writes nothing itself', () => {
    const s = createSession();
    hold(s, boxesAndLine(s));
    const before = s.getEvents().length;
    const scope = toolScope(s, { host: DECIDER });
    const o = which(s)[0];
    expect(takeOffer(o, scope, s, (clock += 100)).host).toBe('which-notation');
    expect(s.getEvents().length).toBe(before);
  });

  it('a sure answer is held as a decision — no reading, no name — and Make it Mermaid is offered in that notation', async () => {
    const s = createSession();
    const ids = boxesAndLine(s);
    expect(mermaidFor(s.getState(), ids)).toBeNull();
    const run = await decide(s, ids, 'flowchart', 0.995);
    expect(run.rows[0].held).toBe(true);
    expect(decidedNotationOf(s.getState(), ids)).toMatchObject({ notation: 'flowchart', by: 'Clef-flash' });
    const st = s.getState();
    for (const id of ids) expect(interpretationsOf(st.nodes.get(id)!, st.nodes).some((r) => r.sourceName === 'Clef-flash')).toBe(false);
    const m = mermaidFor(st, ids)!;
    expect(m.reading.notation).toBe('flowchart');
    expect(m.said.text).toMatch(/^flowchart (TD|LR)/);
    hold(s, ids);
    const offers = offered(s);
    const mermaid = offers.find((o) => o.tool === 'mermaid');
    expect(mermaid?.reason).toMatch(/Clef-flash says it is one \(0\.99/);
    expect(offers.some((o) => o.tool === 'which-notation')).toBe(false);
    // The routing tool reads the decided notation too — and still routes only connectors tied at both ends.
    expect(diagramOf(st, ids)).toBeNull();
    // Undo takes the decision back (the hold first: it is this hand's last act), and the drawing is what it was.
    s.undo();
    expect(decidedNotationOf(s.getState(), ids)).not.toBeNull();
    s.undo();
    expect(decidedNotationOf(s.getState(), ids)).toBeNull();
    expect(mermaidFor(s.getState(), ids)).toBeNull();
  });

  it('a plain diagram, decided, is written as a flowchart with no direction', async () => {
    const s = createSession();
    const ids = boxesAndLine(s);
    await decide(s, ids, 'diagram', 0.995);
    const r = readingDecided(s.getState(), ids)!;
    expect(r.reading.notation).toBe('diagram');
    const m = mermaidFor(s.getState(), ids)!;
    expect(m.said.text).toMatch(/^flowchart/);
    expect(m.said.text).toMatch(/---/);
  });

  it('an answer under the floor, none of these, or a decision about other marks holds nothing that acts', async () => {
    const s = createSession();
    const ids = boxesAndLine(s);
    const under = await decide(s, ids, 'flowchart', 0.97);
    expect(under.rows[0].below).toBe(true);
    expect(mermaidFor(s.getState(), ids)).toBeNull();
    const none = await decide(s, ids, 'no-match', 0.995);
    expect(none.rows[0].none).toBe(true);
    expect(mermaidFor(s.getState(), ids)).toBeNull();
    await decide(s, ids.slice(0, 2), 'flowchart', 0.995);
    expect(decidedNotationOf(s.getState(), ids)).toBeNull();
  });
});

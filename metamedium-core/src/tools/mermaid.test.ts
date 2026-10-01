// The Mermaid tool (V1-PLAN §3, §9 D2's surface): a drawing that reads as a
// notation with a Mermaid writer is offered as text — `Make it Mermaid` — and
// taking it stands a `mermaid` artifact beside the drawing holding exactly the
// text the writer says (D2's golden), in one act. Nothing else is offered it:
// a row of boxes and one box read as no notation.

import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG, type Session } from '../session/session';
import { boundsOf, LOCAL_PARTICIPANT } from '../session/nodes';
import { rectStroke } from '../test/strokes';
import { drawFlowchart, FLOWCHART_VARIANTS } from '../notations/fixtures/flowchart';
import { drawClassDiagram, CLASS_VARIANTS } from '../notations/fixtures/uml-class';
import { drawSequence, SEQUENCE_VARIANTS } from '../notations/fixtures/sequence';
import { FLOWCHART_MERMAID_UNREAD, FLOWCHART_MERMAID_READ, FLOWCHART_WORDS } from '../notations/fixtures/flowchart.mermaid';
import { offersFor, toolScope, takeOffer, getTool, registeredTools } from './registry';
import { rankOffers } from './rank';
import { BUILTIN_TOOLS } from './builtin';
import { MERMAID, mermaidFor } from './mermaid';

const named = () => createSession(DEFAULT_SESSION_CONFIG);
const hold = (s: Session, ids: string[], at = 900_000) => { s.summonMarks(ids, at); };
const mermaidOf = (s: Session) => rankOffers(offersFor(toolScope(s))).find((o) => o.key === 'mermaid');

function flowchart() {
  const s = named();
  const e = drawFlowchart(s, FLOWCHART_VARIANTS[0]);
  hold(s, s.getState().contentIds.slice());
  return { s, e };
}

const artifactsOf = (s: Session) => s.getState().artifacts.map((id) => {
  const n = s.getState().nodes.get(id)!;
  return { id, node: n, code: n.reps.filter((r) => r.modality === 'code').map((r) => r.data as { kind: string; code: string; path: string })[0] };
});

describe('the Mermaid tool', () => {
  it('is a built-in, registered after the field’s own, so its existing order stands (routing and Which is it? follow it)', () => {
    expect(BUILTIN_TOOLS[BUILTIN_TOOLS.length - 4]).toBe(MERMAID);
    expect(getTool('mermaid')).toBe(MERMAID);
    expect(registeredTools().map((t) => t.id).indexOf('mermaid')).toBe(BUILTIN_TOOLS.length - 4);
    expect(MERMAID.describe().length).toBeGreaterThan(20);
  });

  it('a hand-drawn flowchart held is offered as Mermaid, and says what it read', () => {
    const { s } = flowchart();
    const o = mermaidOf(s)!;
    expect(o).toMatchObject({ key: 'mermaid', label: 'Make it Mermaid', tool: 'mermaid' });
    expect(o.reason).toMatch(/flowchart/);
    expect(o.asks).toBeUndefined();
  });

  it('taking it stands a mermaid artifact beside the drawing holding the golden text, in one act', () => {
    const { s } = flowchart();
    const drawing = s.getState().contentIds.map((id) => boundsOf(s.getState().nodes.get(id)!)!);
    const right = Math.max(...drawing.map((b) => b.maxX));
    const before = s.getEvents().length;
    const taken = takeOffer(mermaidOf(s)!, toolScope(s), s, 1_000_000);
    expect(taken.made).toBeTruthy();
    const made = artifactsOf(s);
    expect(made).toHaveLength(1);
    expect(made[0].id).toBe(taken.made);
    expect(made[0].code).toMatchObject({ kind: 'mermaid', code: FLOWCHART_MERMAID_UNREAD });
    expect(made[0].code.path).toMatch(/\.mmd$/);
    // Beside the drawing, never over it.
    const b = boundsOf(made[0].node)!;
    expect(b.minX).toBeGreaterThanOrEqual(right);
    expect(b.maxX - b.minX).toBeGreaterThan(200);
    // Every event it wrote is the tool's, and one undo takes them all back.
    const wrote = s.getEvents().slice(before);
    expect(wrote.length).toBeGreaterThan(0);
    expect(wrote.every((e) => e.tool === 'mermaid' && e.offer === 'mermaid')).toBe(true);
    expect(new Set(wrote.map((e) => e.act)).size).toBe(1);
    s.undo();
    expect(s.getState().artifacts).toHaveLength(0);
    expect(s.getEvents().length).toBe(before);
  });

  it('says the writing once a model has read it, from the same drawing', () => {
    const { s, e } = flowchart();
    const pid = s.join('agent', 'llm:seeing', 950_000, 2);
    e.labels.forEach((l, i) => s.propose({ participantId: pid, nodeId: l.id, edges: [], reps: [{ modality: 'transcript', data: { text: FLOWCHART_WORDS[l.of] }, confidence: 0.9 }], at: 950_100 + i }));
    hold(s, s.getState().contentIds.slice(), 960_000);
    takeOffer(mermaidOf(s)!, toolScope(s), s, 1_000_000);
    expect(artifactsOf(s)[0].code.code).toBe(FLOWCHART_MERMAID_READ);
  });

  it('a class diagram and a sequence diagram are offered too, in their own Mermaid', () => {
    const c = named();
    drawClassDiagram(c, CLASS_VARIANTS[0]);
    hold(c, c.getState().contentIds.slice());
    expect(mermaidOf(c)!.reason).toMatch(/UML class diagram/);
    takeOffer(mermaidOf(c)!, toolScope(c), c, 1_000_000);
    expect(artifactsOf(c)[0].code).toMatchObject({ kind: 'mermaid', path: 'uml-class.mmd' });
    expect(artifactsOf(c)[0].code.code).toMatch(/^classDiagram\n/);
    const q = named();
    drawSequence(q, SEQUENCE_VARIANTS[0]);
    hold(q, q.getState().contentIds.slice());
    expect(mermaidOf(q)!.reason).toMatch(/sequence diagram/);
    takeOffer(mermaidOf(q)!, toolScope(q), q, 1_000_000);
    expect(artifactsOf(q)[0].code.code).toMatch(/^sequenceDiagram\n/);
  });

  it('mermaidFor says the same text for the whole board as the tool does for the marks held — the export pane’s and the offer’s one home', () => {
    const { s } = flowchart();
    const ids = s.getState().contentIds.slice();
    const said = mermaidFor(s.getState(), ids)!;
    expect(said.said.text).toBe(FLOWCHART_MERMAID_UNREAD);
    expect(said.reading.notation).toBe('flowchart');
    // A board that reads as no diagram says nothing.
    const t = named();
    const row = [0, 1, 2].map((i) => t.addStroke(rectStroke(200 + i * 160, 200, 120, 80), 1000 + i * 100));
    expect(mermaidFor(t.getState(), row)).toBeNull();
    expect(mermaidFor(t.getState(), [])).toBeNull();
  });

  it('is not offered twice for a text already standing on the board', () => {
    const { s } = flowchart();
    takeOffer(mermaidOf(s)!, toolScope(s), s, 1_000_000);
    hold(s, s.getState().contentIds.filter((id) => !s.getState().artifacts.includes(id)), 1_100_000);
    expect(mermaidOf(s)).toBeUndefined();
  });

  it('is offered for no scope that reads as no notation: a row of boxes, one box', () => {
    const s = named();
    const row = [[200, 200], [360, 204], [520, 200]].map(([x, y], i) => s.addStroke(rectStroke(x, y, 120, 80), 1000 + i * 100));
    hold(s, row);
    expect(mermaidOf(s)).toBeUndefined();
    s.deselect(2000);
    hold(s, [row[0]], 2100);
    expect(mermaidOf(s)).toBeUndefined();
  });

  it('never offers a scope with an artifact in it', () => {
    const { s } = flowchart();
    const art = s.import({ kind: 'mermaid', path: 'x.mmd', bounds: { minX: 900, minY: 0, maxX: 1200, maxY: 200 }, code: 'flowchart TD\n a --> b\n', at: 1_200_000 })!;
    hold(s, [...s.getState().contentIds.filter((id) => id !== art), art], 1_300_000);
    expect(mermaidOf(s)).toBeUndefined();
    expect(s.getState().nodes.get(art)!.edges.some((e) => e.rel === 'made-by' && e.to === LOCAL_PARTICIPANT)).toBe(true);
  });
});

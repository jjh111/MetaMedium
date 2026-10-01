// Draw it (V1-PLAN §3, §9 D3's surface): a held `mermaid` artifact whose text a
// reader can read is offered *Draw it*, and only then. The drawing needs what
// only a surface knows — the zoom the hand works at, where the board is free
// — so taking it names the act for the host (`mermaid-draw`), which calls
// `drawMermaid` inside the same stamp. Nothing is drawn by the offer itself.

import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG, type Session } from '../session/session';
import { rectStroke } from '../test/strokes';
import { FLOWCHART_MERMAID_READ } from '../notations/fixtures/flowchart.mermaid';
import { offersFor, toolScope, takeOffer, getTool } from './registry';
import { rankOffers } from './rank';
import { BUILTIN_TOOLS } from './builtin';
import { MERMAID_DRAW } from './mermaid-draw';

const hold = (s: Session, ids: string[], at = 900_000) => { s.summonMarks(ids, at); };
const drawItOf = (s: Session) => rankOffers(offersFor(toolScope(s))).find((o) => o.key === 'mermaid-draw');
const standIn = (s: Session, code: string, kind: 'mermaid' | 'text' = 'mermaid', path = 'x.mmd') =>
  s.import({ kind, path, bounds: { minX: 0, minY: 0, maxX: 320, maxY: 240 }, code, at: 1000 })!;

describe('the Draw it tool', () => {
  it('is a built-in, registered after the exporter, then routing, then Which is it?', () => {
    const ids = BUILTIN_TOOLS.map((t) => t.id);
    expect(ids.slice(-5)).toEqual(['mermaid', 'mermaid-draw', 'route', 'which', 'trace']);
    expect(getTool('mermaid-draw')).toBe(MERMAID_DRAW);
    expect(MERMAID_DRAW.describe().length).toBeGreaterThan(20);
  });

  it('a mermaid artifact whose text reads as a flowchart is offered Draw it, first, and says what it read', () => {
    const s = createSession(DEFAULT_SESSION_CONFIG);
    const id = standIn(s, FLOWCHART_MERMAID_READ);
    hold(s, [id]);
    const offers = rankOffers(offersFor(toolScope(s)));
    expect(offers[0]).toMatchObject({ key: 'mermaid-draw', label: 'Draw it', tool: 'mermaid-draw' });
    expect(offers[0].reason).toMatch(/flowchart/);
    expect(offers[0].reason).toMatch(/8 nodes/);
    expect(offers[0].asks).toBeUndefined();
  });

  it('is not offered for a text no reader knows, an empty text, a text file, or a drawing', () => {
    const s = createSession(DEFAULT_SESSION_CONFIG);
    for (const code of ['erDiagram\n  A ||--o{ B : has\n', 'not mermaid at all', '']) {
      s.deselect(2000);
      hold(s, [standIn(s, code)], 2100);
      expect(drawItOf(s)).toBeUndefined();
    }
    s.deselect(3000);
    hold(s, [standIn(s, 'flowchart TD\n a --> b\n', 'text', 'x.txt')], 3100);
    expect(drawItOf(s)).toBeUndefined();
    const t = createSession(DEFAULT_SESSION_CONFIG);
    const boxes = [0, 1].map((i) => t.addStroke(rectStroke(100 + i * 200, 100, 120, 80), 1000 + i * 100));
    hold(t, boxes);
    expect(drawItOf(t)).toBeUndefined();
  });

  it('is offered for a class diagram and a sequence diagram too', () => {
    const s = createSession(DEFAULT_SESSION_CONFIG);
    hold(s, [standIn(s, 'classDiagram\n  class A\n  class B\n  A <|-- B\n')]);
    expect(drawItOf(s)!.reason).toMatch(/UML class diagram|class diagram/);
    s.deselect(2000);
    hold(s, [standIn(s, 'sequenceDiagram\n  participant A\n  participant B\n  A->>B: hello\n')], 2100);
    expect(drawItOf(s)!.reason).toMatch(/sequence diagram/);
  });

  it('the same artifact can be edited in words — Edit the text, after Draw it — so a person can change the diagram before drawing it', () => {
    const s = createSession(DEFAULT_SESSION_CONFIG);
    const id = standIn(s, FLOWCHART_MERMAID_READ);
    hold(s, [id]);
    const offers = rankOffers(offersFor(toolScope(s)));
    const edit = offers.find((o) => o.key === 'edit-text:' + id)!;
    expect(edit).toMatchObject({ label: 'Edit the text', tool: 'text-edit' });
    expect(edit.reason).toMatch(/Mermaid/);
    expect(offers.indexOf(edit)).toBeGreaterThan(offers.findIndex((o) => o.key === 'mermaid-draw'));
  });

  it('taking it writes nothing itself: it names the act the host performs, with the text and the artifact', () => {
    const s = createSession(DEFAULT_SESSION_CONFIG);
    const id = standIn(s, FLOWCHART_MERMAID_READ);
    hold(s, [id]);
    const before = s.getEvents().length;
    const taken = takeOffer(drawItOf(s)!, toolScope(s), s, 5000);
    expect(taken.host).toBe('mermaid-draw');
    expect(s.getEvents().length).toBe(before);
    expect(drawItOf(s)!.data).toMatchObject({ artifact: id });
  });
});

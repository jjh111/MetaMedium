// Mermaid in (V1-PLAN §3, §9 D3).
//
// The round trip is the test: a Mermaid text drawn with `drawMermaid` is real
// ink the engine reads exactly as a hand's, so the flowchart notation (D1)
// reads it and `toMermaid` (D2) says it again — and the text comes back, but
// for its ids, which are the marks' own on the way back. And the other way:
// a hand's drawing exported and drawn back reads as the same notation, with
// the same symbols and flows, in reading order.

import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG } from '../session/session';
import type { Session } from '../session/session';
import { readFlowchart } from './flowchart';
import type { NotationReading } from './notation';
import { toMermaid, inReadingOrder } from './mermaid';
import { drawMermaid } from './mermaid-in';
import type { DrawnMermaid } from './mermaid-in';
import { FLOWCHART_MERMAID_UNREAD, FLOWCHART_MERMAID_READ, FLOWCHART_WORDS } from './fixtures/flowchart.mermaid';
import { MERMAID_LR, MERMAID_LABELS, MERMAID_LABELS_WRITTEN, MERMAID_CYCLE, MERMAID_EVERY_SHAPE, MERMAID_ESCAPED } from './fixtures/flowchart.mermaid-in';
import { drawFlowchart, FLOWCHART_VARIANTS } from './fixtures/flowchart';

const named = (logName: string) => createSession({ ...DEFAULT_SESSION_CONFIG, logName });

/**
 * A Mermaid text with its ids renamed n1, n2, … in the order they first
 * appear — the one normalisation the round trip allows, because the ids that
 * come back are the new marks' own.
 */
function canonical(text: string): string {
  const names = new Map<string, string>();
  const name = (id: string) => {
    if (!names.has(id)) names.set(id, `n${names.size + 1}`);
    return names.get(id)!;
  };
  return text
    .split('\n')
    .map((line) => {
      const node = /^(\s+)([A-Za-z][A-Za-z0-9_]*)([[({].*)$/.exec(line);
      if (node) return `${node[1]}${name(node[2])}${node[3]}`;
      const link = /^(\s+)([A-Za-z][A-Za-z0-9_]*) (-->|---|<-->)(\|"[^"]*"\|)? ([A-Za-z][A-Za-z0-9_]*)$/.exec(line);
      if (link) return `${link[1]}${name(link[2])} ${link[3]}${link[4] ?? ''} ${name(link[5])}`;
      return line;
    })
    .join('\n');
}

/** What the board reads after drawing a text: the flowchart, and the text it says. */
function drawnBack(text: string, s: Session = named('importer~t1')): { drawn: DrawnMermaid; reading: NotationReading; text: string } {
  const drawn = drawMermaid(s, text, { at: 1000 });
  const reading = readFlowchart(s.getState());
  if (!reading) throw new Error(`no flowchart reading — notes: ${drawn.notes.join(' | ')}; refused: ${drawn.refused.map((r) => `${r.line}: ${r.reason}`).join(' | ')}`);
  const m = toMermaid(reading);
  if (!m) throw new Error('no Mermaid for a flowchart');
  return { drawn, reading, text: m.text };
}

describe('the round trip: a text drawn and read again comes back', () => {
  const texts: [string, string][] = [
    ['D2’s golden, before the writing is read', FLOWCHART_MERMAID_UNREAD],
    ['D2’s golden, once it is read', FLOWCHART_MERMAID_READ],
    ['across (LR)', MERMAID_LR],
    ['labelled links, both ways', MERMAID_LABELS],
    ['a cycle', MERMAID_CYCLE],
    ['every shape, every link', MERMAID_EVERY_SHAPE],
    ['labels that break Mermaid unquoted', MERMAID_ESCAPED],
  ];
  for (const [name, text] of texts) {
    it(name, () => {
      const back = drawnBack(text);
      expect(canonical(back.text)).toBe(canonical(text));
      // Drawn from what it said, it says the same again.
      expect(canonical(drawnBack(back.text).text)).toBe(canonical(text));
    });
  }

  it('a text a hand wrote — graph TB, bare labels, -- label --> — comes back as D2 writes it', () => {
    expect(canonical(drawnBack(MERMAID_LABELS_WRITTEN).text)).toBe(canonical(MERMAID_LABELS));
  });

  it('every Mermaid id is drawn as one mark, and each link names the connector drawn for it', () => {
    const { drawn, reading } = drawnBack(MERMAID_EVERY_SHAPE);
    expect(Object.keys(drawn.ids)).toEqual(['s1', 't1', 'd1', 'p1', 'q1', 'e1', 'p2']);
    const symbolOf = new Map(reading.symbols.map((s) => [s.id, s.symbol]));
    expect(Object.values(drawn.ids).map((id) => symbolOf.get(id))).toEqual(['start', 'terminator', 'data', 'process', 'decision', 'end', 'process']);
    const flows = new Map(reading.connectors.map((c) => [c.id, c]));
    for (const l of drawn.links) {
      const c = flows.get(l.id);
      expect(c, `${l.from} ${l.drawn} ${l.to}`).toBeDefined();
      expect([c!.from, c!.to]).toEqual([drawn.ids[l.from], drawn.ids[l.to]]);
    }
  });
});

describe('the other way: a hand’s drawing exported and drawn back reads as the same notation', () => {
  /** Symbols in reading order, and flows between their places in it. */
  function shapeOf(r: NotationReading) {
    const across = false;
    const order = inReadingOrder(r.symbols, (s) => s.bounds, (s) => s.id, across);
    const place = new Map(order.map((s, i) => [s.id, i]));
    return {
      notation: r.notation,
      symbols: order.map((s) => s.symbol),
      flows: r.connectors.map((c) => `${place.get(c.from)} ${c.direction} ${place.get(c.to)}`).sort(),
    };
  }

  for (const v of FLOWCHART_VARIANTS.filter((_, i) => i % 7 === 0)) {
    it(`D1’s hand, seed ${v.seed}, jitter ${v.jitter}, tilt ${v.tilt}`, () => {
      const hand = named('hand~a1');
      drawFlowchart(hand, v);
      const first = readFlowchart(hand.getState())!;
      const text = toMermaid(first)!.text;
      const back = drawnBack(text);
      expect(back.reading.notation).toBe('flowchart');
      expect(shapeOf(back.reading)).toEqual(shapeOf(first));
      expect(canonical(back.text)).toBe(canonical(text));
    });
  }

  it('its writing read, the words come back on the same symbols and flows', () => {
    const hand = named('hand~a1');
    const e = drawFlowchart(hand, FLOWCHART_VARIANTS[0]);
    const pid = hand.join('agent', 'llm:seeing', 900_000, 2);
    e.labels.forEach((l, i) =>
      hand.propose({ participantId: pid, nodeId: l.id, edges: [], reps: [{ modality: 'transcript', data: { text: FLOWCHART_WORDS[l.of] }, confidence: 0.9 }], at: 900_100 + i })
    );
    const text = toMermaid(readFlowchart(hand.getState())!)!.text;
    expect(canonical(text)).toBe(canonical(FLOWCHART_MERMAID_READ));
    expect(canonical(drawnBack(text).text)).toBe(canonical(FLOWCHART_MERMAID_READ));
  });
});

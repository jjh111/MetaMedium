// Lines for a sheet, gathered from a session's state (DIRECTOR-PLAN-W2 M2).
//
// The sheet reads lines; the board holds them as text artifacts' code and as
// writing a participant has read. Pinned here: the sample page typed as text
// artifacts reads as the same sheet as its lines, before and after the log is
// replayed; a measurement edited as text re-derives its dependents and undo
// restores them; writing on one band is one line, and a column's gap is kept;
// and gathering changes nothing in the session — no event carries a derived
// number.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import type { Session } from '../session/session';
import { LOCAL_PARTICIPANT } from '../session/nodes';
import { handText } from '../test/strokes';
import { sheetLines } from './gather';
import { readSheet, diffSheets } from './sheet';
import { APRON_LINES } from './fixtures/apron.sample';
import { TUNIC_LINES } from './fixtures/tunic.sample';

const LINE_H = 40;

/** The page typed as text artifacts, one per line, top to bottom. */
function typedPage(lines: readonly string[], at = 1000): { s: Session; ids: string[] } {
  const s = createSession();
  const ids = lines.map((text, i) =>
    s.import({ kind: 'text', path: `text/${i + 1}.txt`, name: `text ${i + 1}`, bounds: { minX: 100, minY: 100 + i * LINE_H, maxX: 500, maxY: 100 + i * LINE_H + 30 }, code: text, at: at + i })!
  );
  return { s, ids };
}

describe('sheetLines — text artifacts', () => {
  it('the page typed one line per text reads as the same sheet as its lines', () => {
    const { s } = typedPage(APRON_LINES);
    const lines = sheetLines(s.getState());
    expect(lines.map((l) => l.text)).toEqual([...APRON_LINES]);
    expect(lines.every((l) => l.from === 'text' && l.ids.length === 1)).toBe(true);
    expect(diffSheets(readSheet(APRON_LINES), readSheet(lines))).toEqual([]);
  });

  it('one text holding the whole page reads the same, a line per line of its code', () => {
    const s = createSession();
    s.import({ kind: 'text', path: 'text/page.txt', name: 'page', bounds: { minX: 0, minY: 0, maxX: 600, maxY: 400 }, code: TUNIC_LINES.join('\n'), at: 1000 });
    const lines = sheetLines(s.getState());
    expect(lines.map((l) => l.text)).toEqual([...TUNIC_LINES]);
    expect(diffSheets(readSheet(TUNIC_LINES), readSheet(lines))).toEqual([]);
  });

  it('replayed from its log, the page yields the same sheet', () => {
    const { s } = typedPage(APRON_LINES);
    const copy = createSession();
    copy.load(s.getEvents());
    expect(diffSheets(readSheet(sheetLines(s.getState())), readSheet(sheetLines(copy.getState())))).toEqual([]);
  });

  it('change the bust as text: steps 1, 2 and 5 re-derive; undo restores them', () => {
    const { s, ids } = typedPage(APRON_LINES);
    const before = readSheet(sheetLines(s.getState()));
    s.attachCode({ participantId: LOCAL_PARTICIPANT, nodeId: ids[0], kind: 'text', code: 'A. Bust 38', at: 5000 });
    const after = readSheet(sheetLines(s.getState()));
    expect(diffSheets(before, after)).toEqual(['A', '1', '2', '5']);
    s.undo();
    expect(diffSheets(before, readSheet(sheetLines(s.getState())))).toEqual([]);
  });

  it('an erased text is not read', () => {
    const { s, ids } = typedPage(APRON_LINES);
    s.erase(ids[3], 5000);
    expect(sheetLines(s.getState()).map((l) => l.text)).not.toContain('Add seam allowance');
  });

  it('reading the sheet changes nothing in the session: no event carries a derived number', () => {
    const { s } = typedPage(APRON_LINES);
    const events = JSON.stringify(s.getEvents());
    const sheet = readSheet(sheetLines(s.getState()));
    expect(sheet.entries.length).toBe(APRON_LINES.length);
    expect(JSON.stringify(s.getEvents())).toBe(events);
    // The derived numbers — 14″ from step 1's chain, 74 from step 6's second reading — are nowhere in the log but the written ones.
    expect(events).not.toMatch(/74/);
  });
});

describe('sheetLines — writing a participant has read', () => {
  /** Words written apart in time (no letters gathered into a word), each read by a participant. */
  function written(words: { text: string; x: number; y: number; w?: number }[]): Session {
    const s = createSession();
    const reader = s.join('agent', 'reader', 500, 2);
    words.forEach((word, i) => {
      const at = 1000 + i * 10000;
      const id = s.addStroke(handText(word.x, word.y, word.w ?? 60, 30, { seed: i + 1 }), at);
      s.propose({ participantId: reader, nodeId: id, edges: [], reps: [{ modality: 'transcript', data: { text: word.text }, confidence: 0.9 }], at: at + 1 });
    });
    return s;
  }

  it('words on one band are one line, in reading order', () => {
    const s = written([
      { text: 'Bust', x: 190, y: 100 },
      { text: 'A.', x: 100, y: 102, w: 40 },
      { text: '36', x: 280, y: 98, w: 40 },
      { text: 'B.', x: 100, y: 180, w: 40 },
      { text: 'Top', x: 190, y: 181 },
      { text: 'to', x: 270, y: 179, w: 30 },
      { text: 'waist', x: 320, y: 180 },
      { text: '20', x: 400, y: 182, w: 40 },
    ]);
    const lines = sheetLines(s.getState());
    expect(lines.map((l) => l.text)).toEqual(['A. Bust 36', 'B. Top to waist 20']);
    expect(lines.every((l) => l.from === 'writing')).toBe(true);
    expect(lines[0].ids).toHaveLength(3);
  });

  it('a gap wide as a column is kept, so a worked line beside a formula is read as one', () => {
    const s = written([
      { text: '5.', x: 100, y: 100, w: 30 },
      { text: 'Arm length + 2"', x: 150, y: 100, w: 200 },
      { text: '21 + 2 = 23"', x: 600, y: 100, w: 160 },
    ]);
    expect(sheetLines(s.getState()).map((l) => l.text)).toEqual(['5. Arm length + 2"   21 + 2 = 23"']);
  });

  it('writing nobody has read is not guessed at', () => {
    const s = createSession();
    s.addStroke(handText(100, 100, 60, 30, { seed: 1 }), 1000);
    expect(sheetLines(s.getState())).toEqual([]);
  });
});

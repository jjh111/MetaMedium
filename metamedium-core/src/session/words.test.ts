// Words from letters: printed strokes gather into one held mark that reads as writing.

import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import { isWord, lettersOf, topInterpretation, transcriptOf } from './nodes';
import { rectStroke, lineStroke, circleStroke, checkStroke } from '../test/strokes';
import type { Point } from '../types';

// Block capitals, each as the strokes a hand makes.
const seg = (a: Point, b: Point, n = 14) => lineStroke(a, b, n);
const N = (x: number, y: number, h = 30) => [seg({ x, y: y + h }, { x, y }).concat(seg({ x, y }, { x: x + 18, y: y + h }).slice(1), seg({ x: x + 18, y: y + h }, { x: x + 18, y }).slice(1))];
const A = (x: number, y: number, h = 30) => [seg({ x, y: y + h }, { x: x + 10, y }).concat(seg({ x: x + 10, y }, { x: x + 20, y: y + h }).slice(1)), seg({ x: x + 4, y: y + h * 0.6 }, { x: x + 16, y: y + h * 0.6 })];
const V = (x: number, y: number, h = 30) => [seg({ x, y }, { x: x + 10, y: y + h }).concat(seg({ x: x + 10, y: y + h }, { x: x + 20, y }).slice(1))];
const I = (x: number, y: number, h = 30) => [seg({ x, y }, { x, y: y + h })];

function write(s: ReturnType<typeof createSession>, strokes: Point[][], t0: number, gapMs = 400) {
  let t = t0;
  const ids: string[] = [];
  for (const pts of strokes) { ids.push(s.addStroke(pts, t)); t += gapMs; }
  return { ids, t };
}

describe('words from letters', () => {
  it('N, A, V printed beside each other become one word that reads as text', () => {
    const s = createSession();
    const { ids } = write(s, [...N(100, 100), ...A(126, 100), ...V(154, 100)], 1000);
    const st = s.getState();
    expect(st.contentIds).toHaveLength(1);
    const word = st.nodes.get(st.contentIds[0])!;
    expect(isWord(word)).toBe(true);
    expect(lettersOf(word)).toEqual(ids);
    expect(topInterpretation(word)).toBe('text');
  });

  it('two boxes side by side are not a word — they are too big to be letters', () => {
    const s = createSession();
    s.addStroke(rectStroke(100, 100, 200, 120), 1000);
    s.addStroke(rectStroke(340, 100, 200, 120), 1400);
    expect(s.getState().contentIds).toHaveLength(2);
    expect(s.getState().contentIds.some((id) => isWord(s.getState().nodes.get(id)!))).toBe(false);
  });

  it('a letter drawn far away, or long after, starts nothing', () => {
    const s = createSession();
    write(s, [...N(100, 100), ...I(400, 100)], 1000);
    expect(s.getState().contentIds).toHaveLength(2);
    const s2 = createSession();
    write(s2, [...N(100, 100)], 1000);
    s2.addStroke(I(126, 100)[0], 9000);
    expect(s2.getState().contentIds).toHaveLength(2);
  });

  it('a word beside a box is the box\'s label, and its transcript is the offer to name with', () => {
    const s = createSession();
    const box = s.addStroke(rectStroke(100, 200, 220, 140), 500);
    write(s, [...N(340, 250), ...A(366, 250), ...V(394, 250)], 1000);
    const st = s.getState();
    const word = st.contentIds.find((id) => isWord(st.nodes.get(id)!))!;
    const reading = s.read([box, word]);
    const role = reading.roles.find((r) => r.id === word)!;
    expect(role.role).toBe('label');
    expect(role.targets).toContain(box);
    const pid = s.join('agent', 'llm:seeing', 3000, 1);
    s.propose({ participantId: pid, nodeId: word, edges: [], reps: [{ modality: 'transcript', data: { text: 'NAV' }, confidence: 0.9 }], at: 3100 });
    expect(transcriptOf(s.getState().nodes.get(word)!)).toBe('NAV');
    expect(s.read([box, word]).scope.transcripts?.[word]).toBe('NAV');
  });

  it('erasing a letter shrinks the word; erasing all but one dissolves it', () => {
    const s = createSession();
    const { ids } = write(s, [...N(100, 100), ...I(126, 100), ...V(140, 100)], 1000);
    const word = s.getState().contentIds[0];
    s.erase(ids[1], 5000);
    expect(lettersOf(s.getState().nodes.get(word)!)).toEqual([ids[0], ids[2]]);
    s.erase(ids[2], 5100);
    expect(s.getState().contentIds).toEqual([ids[0]]);
  });

  it('splitting puts the letters back, and undo re-forms the word', () => {
    const s = createSession();
    const { ids } = write(s, [...N(100, 100), ...I(126, 100)], 1000);
    const word = s.getState().contentIds[0];
    s.splitWord(word, 4000);
    expect(s.getState().contentIds).toEqual(ids);
    s.undo();
    expect(s.getState().contentIds).toEqual([word]);
  });

  it('a check that acts is never a letter, and a word never swallows a held loop', () => {
    const s = createSession();
    s.addStroke(rectStroke(100, 100, 200, 120), 1000);
    s.addStroke(circleStroke(200, 160, 200), 1200);
    s.addStroke(checkStroke(420, 150), 1400);
    expect(s.getState().summon).not.toBeNull();
    expect([...s.getState().nodes.values()].some(isWord)).toBe(false);
  });
});

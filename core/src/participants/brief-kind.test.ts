// What should this brief make? (the audit's D3): a closed list — a page, a program, a Mermaid diagram only where the
// marks read as one, a text answer, none of these — about no mark, so a decision seat asked it holds nothing on the
// board, whatever it answers.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import { circleStroke } from '../test/strokes';
import { briefQuestion, BRIEF_QUESTION, BRIEF_KIND_WORDS } from './brief-kind';
import { createDecideParticipant, createStubDecideTransport, DECIDER_TAKE_AT, NO_MATCH } from './decide';

describe('what should this brief make', () => {
  it('offers a page, a program, a text answer and none of these — and a Mermaid diagram only where the marks read as one', () => {
    expect(briefQuestion().candidates.map((c) => c.id)).toEqual(['page', 'program', 'answer', NO_MATCH]);
    const q = briefQuestion({ diagram: 'a flowchart 0.84 — three processes' });
    expect(q.candidates.map((c) => c.id)).toEqual(['page', 'program', 'mermaid', 'answer', NO_MATCH]);
    expect(q.candidates.find((c) => c.id === 'mermaid')!.text).toMatch(/reads as a flowchart/);
    expect(q.id).toBe(BRIEF_QUESTION);
    expect(q.about).toBeUndefined();
    expect(q.reading).toBe(false);
    for (const c of q.candidates) if (c.id !== NO_MATCH) expect(BRIEF_KIND_WORDS[c.id]).toBeTruthy();
  });

  it('asked through the seat, a sure answer is returned and nothing is written to the board but the seat’s own join', async () => {
    const s = createSession();
    s.addStroke(circleStroke(200, 200, 60), 1000);
    const seat = createDecideParticipant(s, createStubDecideTransport({ [BRIEF_QUESTION]: { pick: 'program', p: 0.995 } }), 1100, { name: 'Clef-flash', takeAt: DECIDER_TAKE_AT });
    const before = s.getEvents().length;
    const run = await seat.ask([briefQuestion()], 1200, undefined, { text: 'The brief typed: “a timer that counts down”' });
    expect(run.rows[0].answer).toMatchObject({ pick: 'program' });
    expect(run.rows[0].below).toBeUndefined();
    expect(run.rows[0].held).toBe(false);
    expect(s.getEvents().slice(before).map((e) => e.type)).toEqual(['join']);
  });
});

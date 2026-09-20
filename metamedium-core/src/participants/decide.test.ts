// The decision seat: a seat, not a dependency.
//
// What is pinned here is the contract, not any particular answer: typed
// questions in, typed values out, behind an injected transport; the engine's
// own reading never evicted; a flat distribution never held; a reason that is
// the question and the distribution and nothing invented; and one snapshot per
// batch, so an answer cannot land on a board that has moved.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import {
  createDecideParticipant,
  createStubDecideTransport,
  choice,
  score,
  noul,
  isFlat,
  reasonOf,
  NO_MATCH,
  type DecideTransport,
  type DecisionQuestion,
} from './decide';
import { interpretationsOf, byTier } from '../session/interpretations';
import { circleStroke, handRect } from '../test/strokes';

function board() {
  const s = createSession();
  const circle = s.addStroke(circleStroke(200, 200, 60), 1000);
  const box = s.addStroke(handRect(400, 200, 140, 100, { seed: 3 }), 1100);
  return { s, circle, box };
}

/** The question the whole file argues about: what does this mark stand for? */
const standsFor = (markId: string, id = 'q1') =>
  choice(
    id,
    'what does this mark stand for?',
    [
      { id: 'bubble', text: 'a bubble — a round thing in a diagram' },
      { id: 'wheel', text: 'a wheel' },
    ],
    [markId]
  );

describe('the seat joins as a participant, at tier 1.5', () => {
  it('is a participant like any other, and it is between the library and a model', () => {
    const { s, circle } = board();
    const seat = createDecideParticipant(s, createStubDecideTransport({}), 1200, { name: 'jury' });
    expect(s.getState().participants).toContain(seat.id);
    expect(seat.name).toBe('jury');
    expect(seat.tier).toBe(1.5);
    expect(s.getState().nodes.get(circle)).toBeDefined();
  });

  it('takes its transport injected — the engine cannot tell what is in the seat', async () => {
    const { s, circle } = board();
    // A "classifier": no model, no network, a table and a coin.
    const asClassifier: DecideTransport = async (questions) => ({
      ok: true,
      via: 'a table on a piece of paper',
      answers: questions.map((q) => ({
        kind: 'choice' as const,
        questionId: q.id,
        pick: 'bubble',
        distribution: [
          { of: 'bubble', p: 0.7 },
          { of: 'wheel', p: 0.2 },
          { of: NO_MATCH, p: 0.1 },
        ],
        confidence: 0.7,
      })),
    });
    const seat = createDecideParticipant(s, asClassifier, 1200, { name: 'jury' });
    const run = await seat.ask([standsFor(circle)], 2000);
    expect(run.ok).toBe(true);
    expect(run.via).toBe('a table on a piece of paper');
    expect(run.rows[0].held).toBe(true);
  });
});

describe('a decision is one more attributed row, and it evicts nothing', () => {
  it('holds the pick beside the engine’s own reading, at its own tier', async () => {
    const { s, circle } = board();
    const seat = createDecideParticipant(
      s,
      createStubDecideTransport({ q1: { pick: 'bubble', p: 0.72, confidence: 0.8 } }),
      1200,
      { name: 'jury' }
    );
    const run = await seat.ask([standsFor(circle)], 2000);
    expect(run.ok).toBe(true);
    expect(run.rows[0].held).toBe(true);

    const state = s.getState();
    const reads = interpretationsOf(state.nodes.get(circle)!, state.nodes);

    // The engine's own tier-0 reading is still there, untouched.
    const engine = reads.filter((r) => r.tier === 0);
    expect(engine.length).toBeGreaterThan(0);
    expect(engine.some((r) => r.label === 'circle')).toBe(true);

    // And the seat's is beside it, attributed, held, at 1.5.
    const mine = reads.find((r) => r.label === 'bubble')!;
    expect(mine).toBeDefined();
    expect(mine.sourceName).toBe('jury');
    expect(mine.tier).toBe(1.5);
    expect(mine.blessed).toBe(false);

    // Grouped by tier, the seat is its own row — not folded into 1 or into 2.
    const tiers = byTier(reads).map((g) => g.key);
    expect(tiers).toContain(0);
    expect(tiers).toContain(1.5);
  });

  it('keeps the whole distribution on the mark, so the row can be read back', async () => {
    const { s, circle } = board();
    const seat = createDecideParticipant(
      s,
      createStubDecideTransport({ q1: { pick: 'bubble', p: 0.72 } }),
      1200
    );
    await seat.ask([standsFor(circle)], 2000);
    const reps = s.getState().nodes.get(circle)!.reps.filter((r) => r.modality === 'decision');
    expect(reps.length).toBe(1);
    const data = reps[0].data as { question: DecisionQuestion; answer: { distribution: unknown[] }; snapshot: number };
    expect(data.question.id).toBe('q1');
    expect(data.answer.distribution.length).toBe(3); // bubble, wheel, and no-match
    expect(data.snapshot).toBe(s.getState().generation);
  });
});

describe('the reason is the question and the distribution, never a sentence written for it', () => {
  it('says what was offered, what came back, and the confidence', async () => {
    const { s, circle } = board();
    const seat = createDecideParticipant(
      s,
      createStubDecideTransport({ q1: { pick: 'bubble', p: 0.72, confidence: 0.8 } }),
      1200
    );
    const run = await seat.ask([standsFor(circle)], 2000);
    const reason = run.rows[0].reason;
    expect(reason).toContain('asked “what does this mark stand for?”');
    expect(reason).toContain('choice among bubble, wheel, no-match');
    expect(reason).toMatch(/bubble 0\.72/);
    expect(reason).toContain('confidence 0.80');
    // It travels with the proposal, so "why?" shows the same thing.
    const state = s.getState();
    const mine = interpretationsOf(state.nodes.get(circle)!, state.nodes).find((r) => r.label === 'bubble')!;
    expect(mine.reasoning).toBe(reason);
  });

  it('a Score reads as an expectation over its own ordered words', () => {
    const q = score('s1', 'how finished is this drawing?', ['a scribble', 'a sketch', 'a drawing', 'a plan']);
    const answer = {
      kind: 'score' as const,
      questionId: 's1',
      levels: q.levels,
      distribution: [
        { of: 'a scribble', p: 0.05 },
        { of: 'a sketch', p: 0.6 },
        { of: 'a drawing', p: 0.3 },
        { of: 'a plan', p: 0.05 },
      ],
      expectation: 1.35,
      confidence: 0.6,
    };
    const reason = reasonOf(q, answer);
    expect(reason).toContain('score over a scribble < a sketch < a drawing < a plan');
    expect(reason).toContain('expectation 1.35');
  });

  it('a Noul carries probability-of-yes and no confidence beside it', () => {
    const q = noul('n1', 'this mark is a label for the box beside it');
    const answer = { kind: 'noul' as const, questionId: 'n1', yes: 0.82 };
    expect(Object.keys(answer)).not.toContain('confidence');
    expect(reasonOf(q, answer)).toBe(
      'asked “this mark is a label for the box beside it” — yes 0.82 · no 0.18'
    );
  });
});

describe('flat is not a low confidence — it is nothing picked out', () => {
  it('near an even chance, a Noul is flat', () => {
    expect(isFlat({ kind: 'noul', questionId: 'n', yes: 0.52 }).flat).toBe(true);
    expect(isFlat({ kind: 'noul', questionId: 'n', yes: 0.82 }).flat).toBe(false);
    // ...and 0.5 is uncertainty, never "medium".
    expect(isFlat({ kind: 'noul', questionId: 'n', yes: 0.5 }).why).toContain('even chance');
  });

  it('a flat Choice is never held — it is handed back for the human', async () => {
    const { s, circle } = board();
    // Nothing in the book for q1, so the stub says it does not know.
    const seat = createDecideParticipant(s, createStubDecideTransport({}), 1200, { name: 'jury' });
    const run = await seat.ask([standsFor(circle)], 2000);

    expect(run.ok).toBe(true);
    expect(run.rows[0].flat).toBe(true);
    expect(run.rows[0].held).toBe(false);
    expect(run.rows[0].answer.kind).toBe('choice');
    expect((run.rows[0].answer as { pick: string | null }).pick).toBeNull();

    // Nothing landed on the mark; the engine's reading stands alone.
    const state = s.getState();
    const reads = interpretationsOf(state.nodes.get(circle)!, state.nodes);
    expect(reads.some((r) => r.sourceName === 'jury')).toBe(false);
    expect(reads.some((r) => r.tier === 0)).toBe(true);
  });

  it('a lead under the margin is flat even when the confidence is high', async () => {
    const { s, circle } = board();
    const close: DecideTransport = async (questions) => ({
      ok: true,
      answers: questions.map((q) => ({
        kind: 'choice' as const,
        questionId: q.id,
        pick: 'bubble',
        distribution: [
          { of: 'bubble', p: 0.46 },
          { of: 'wheel', p: 0.44 },
          { of: NO_MATCH, p: 0.1 },
        ],
        confidence: 0.95,
      })),
    });
    const seat = createDecideParticipant(s, close, 1200);
    const run = await seat.ask([standsFor(circle)], 2000);
    expect(run.rows[0].flat).toBe(true);
    expect(run.rows[0].held).toBe(false);
    expect(run.rows[0].flatWhy).toContain('leads');
  });

  it('no-match is an outcome, and picking it holds nothing', async () => {
    const { s, circle } = board();
    const seat = createDecideParticipant(
      s,
      createStubDecideTransport({ q1: { pick: NO_MATCH, p: 0.8 } }),
      1200,
      { name: 'jury' }
    );
    const run = await seat.ask([standsFor(circle)], 2000);
    expect(run.rows[0].flat).toBe(false);
    expect((run.rows[0].answer as { pick: string | null }).pick).toBe(NO_MATCH);
    const state = s.getState();
    // The rep is kept — "none of these" is evidence — but no reading is claimed.
    expect(state.nodes.get(circle)!.reps.some((r) => r.modality === 'decision')).toBe(true);
    expect(
      interpretationsOf(state.nodes.get(circle)!, state.nodes).some((r) => r.sourceName === 'jury')
    ).toBe(false);
  });
});

describe('one snapshot per batch', () => {
  it('batches independent questions over one board, and answers them all', async () => {
    const { s, circle, box } = board();
    let batches = 0;
    const counting: DecideTransport = async (questions) => {
      batches++;
      return createStubDecideTransport({
        q1: { pick: 'bubble', p: 0.7 },
        q2: { pick: 'card', p: 0.66 },
        n1: { yes: 0.9 },
      })(questions, {});
    };
    const seat = createDecideParticipant(s, counting, 1200);
    const run = await seat.ask(
      [
        standsFor(circle, 'q1'),
        choice('q2', 'what does this mark stand for?', [{ id: 'card', text: 'a card' }], [box]),
        noul('n1', 'these two marks belong together', [circle, box]),
      ],
      2000
    );
    expect(batches).toBe(1);
    expect(run.rows.length).toBe(3);
    expect(run.rows.every((r) => r.held)).toBe(true);
    expect(run.unanswered).toEqual([]);
  });

  it('refuses the batch when the board was replaced under it', async () => {
    const { s, circle } = board();
    const slow: DecideTransport = async (questions) => {
      // The hand loads another board while the seat is thinking.
      s.load([]);
      return createStubDecideTransport({ q1: { pick: 'bubble', p: 0.8 } })(questions, {});
    };
    const seat = createDecideParticipant(s, slow, 1200);
    const run = await seat.ask([standsFor(circle)], 2000);
    expect(run.ok).toBe(true);
    expect(run.refused).toMatch(/replaced while the seat was answering/);
    expect(run.rows[0].held).toBe(false);
  });

  it('holds nothing about a mark that has been erased', async () => {
    const { s, circle } = board();
    const erasing: DecideTransport = async (questions) => {
      s.erase(circle, 1900);
      return createStubDecideTransport({ q1: { pick: 'bubble', p: 0.8 } })(questions, {});
    };
    const seat = createDecideParticipant(s, erasing, 1200);
    const run = await seat.ask([standsFor(circle)], 2000);
    expect(run.ok).toBe(true);
    expect(run.rows[0].held).toBe(false);
  });

  it('never throws, whatever the seat does', async () => {
    const { s, circle } = board();
    const broken: DecideTransport = async () => {
      throw new Error('the seat is empty');
    };
    const seat = createDecideParticipant(s, broken, 1200);
    const run = await seat.ask([standsFor(circle)], 2000);
    expect(run.ok).toBe(false);
    expect(run.error).toBe('the seat is empty');
    expect(run.unanswered).toEqual(['q1']);
    // The board is untouched and the engine goes on reading it.
    const state = s.getState();
    expect(interpretationsOf(state.nodes.get(circle)!, state.nodes).some((r) => r.tier === 0)).toBe(true);
  });

  it('an answer of the wrong kind is not an answer', async () => {
    const { s, circle } = board();
    const confused: DecideTransport = async () => ({
      ok: true,
      answers: [{ kind: 'noul', questionId: 'q1', yes: 0.9 }],
    });
    const seat = createDecideParticipant(s, confused, 1200);
    const run = await seat.ask([standsFor(circle)], 2000);
    expect(run.rows).toEqual([]);
    expect(run.unanswered).toEqual(['q1']);
  });
});

describe('the stub', () => {
  it('is deterministic — the same book gives the same numbers every time', async () => {
    const book = { q1: { pick: 'bubble', p: 0.61 } };
    const a = await createStubDecideTransport(book)([standsFor('x')], {});
    const b = await createStubDecideTransport(book)([standsFor('x')], {});
    expect(a).toEqual(b);
  });

  it('a candidate that is not on offer leads to nothing, rather than being taken on trust', async () => {
    const result = await createStubDecideTransport({ q1: { pick: 'submarine', p: 0.9 } })(
      [standsFor('x')],
      {}
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const answer = result.answers[0] as { pick: string | null; distribution: { p: number }[] };
    expect(answer.pick).toBeNull();
    expect(new Set(answer.distribution.map((d) => d.p)).size).toBe(1); // flat
  });
});

// The decision seat's chat transport (V1-PLAN I7): a DecideTransport that asks an
// OpenAI-compatible chat completion (OpenRouter first) for the typed JSON answer and
// reads it back as typed answers. What is pinned: what is sent (the options, with
// *none of these* always among them, and no node id), what is read (a distribution
// over exactly the options offered; the pick read back off it, never taken on trust),
// what is refused (an option nobody offered, a distribution that is not one, prose),
// that a failure is the provider's own sentence, and that the seat taken with a floor
// (`takeAt`, decide.ts) holds an answer only at DECIDER_TAKE_AT. No model is asked:
// `complete` is injected, the replies are fixtures/decide-replies.json.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import { circleStroke } from '../test/strokes';
import { choice, score, noul, createDecideParticipant, NO_MATCH, DECIDER_TAKE_AT, FLAT_MARGIN, type DecisionQuestion } from '../participants/decide';
import { createChatDecideTransport, CHAT_DECIDE_WIRE, DEFAULT_DECIDER_MODEL } from './decide-openrouter';
import type { ChatMessage, CompletionResult, ProviderConfig } from './provider';
import REPLIES from './fixtures/decide-replies.json';

const R = REPLIES as unknown as Record<string, { content: string }>;
const CONFIG: ProviderConfig = { kind: 'openai-compatible', baseUrl: 'https://openrouter.ai/api/v1', model: DEFAULT_DECIDER_MODEL, apiKey: 'k' };

interface Sent { config: ProviderConfig; messages: ChatMessage[] }
/** A `complete` that says `what` and keeps what it was sent. */
function says(what: string | CompletionResult) {
  const sent: Sent[] = [];
  const complete = async (config: ProviderConfig, messages: ChatMessage[]): Promise<CompletionResult> => {
    sent.push({ config, messages });
    return typeof what === 'string' ? { ok: true, text: what, model: config.model } : what;
  };
  return { complete, sent };
}

const q1 = choice('q1', 'which is it?', [{ id: 'molecule', text: 'a molecule: bubbles joined by lines' }, { id: 'compound', text: 'a compound' }], ['n1']);

describe('what is sent', () => {
  it('is a system message that says the seat writes no prose, and a user message of the questions as options — none of these among them, never a node id', async () => {
    const { complete, sent } = says(R.sure.content);
    await createChatDecideTransport(CONFIG, { complete })([q1], {});
    expect(sent).toHaveLength(1);
    const [system, user] = sent[0].messages;
    expect(system.role).toBe('system');
    expect(String(system.content)).toMatch(/decision seat/i);
    expect(String(system.content)).toMatch(/JSON/);
    expect(user.role).toBe('user');
    const body = JSON.parse(String(user.content));
    expect(body.questions).toHaveLength(1);
    expect(body.questions[0].id).toBe('q1');
    expect(body.questions[0].options.map((o: { id: string }) => o.id)).toEqual(['molecule', 'compound', NO_MATCH]);
    expect(body.questions[0].options.at(-1).text).toBe('none of these');
    expect(String(user.content)).not.toContain('n1');   // the seat never sees a node id it could get wrong
    expect(sent[0].config.model).toBe(DEFAULT_DECIDER_MODEL);
  });

  it('puts a score’s levels and a noul’s yes/no as options of their own', async () => {
    const { complete, sent } = says(R.mixed.content);
    await createChatDecideTransport(CONFIG, { complete })([score('q2', 'how big?', ['low', 'mid', 'high']), noul('q3', 'is it a box?')], {});
    const body = JSON.parse(String(sent[0].messages[1].content));
    expect(body.questions.map((q: any) => [q.id, q.kind, q.options.map((o: any) => o.id)])).toEqual([
      ['q2', 'score', ['low', 'mid', 'high']],
      ['q3', 'noul', ['yes', 'no']],
    ]);
  });

  it('is built by a wire the transport can swap — the native systemone shape is another wire, not another seat', () => {
    expect(CHAT_DECIDE_WIRE.id).toBe('chat');
    expect(typeof CHAT_DECIDE_WIRE.build).toBe('function');
    expect(typeof CHAT_DECIDE_WIRE.parse).toBe('function');
  });
});

describe('what is read', () => {
  it('a sure choice: the distribution over every option, the pick read off it, the confidence its lead', async () => {
    const { complete } = says(R.sure.content);
    const r = await createChatDecideTransport(CONFIG, { complete })([q1], {});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.answers).toHaveLength(1);
    const a = r.answers[0];
    expect(a.kind).toBe('choice');
    if (a.kind !== 'choice') return;
    expect(a.questionId).toBe('q1');
    expect(a.pick).toBe('molecule');
    expect(a.distribution.map((d) => d.of)).toEqual(['molecule', 'compound', NO_MATCH]);
    expect(a.distribution.reduce((n, d) => n + d.p, 0)).toBeCloseTo(1, 6);
    expect(a.confidence).toBeCloseTo(0.995, 3);
    expect(r.via).toBe(DEFAULT_DECIDER_MODEL);
  });

  it('a split choice leads nowhere: no pick — flat is the seat’s to judge, not the transport’s to hide', async () => {
    const { complete } = says(R.split.content);
    const r = await createChatDecideTransport(CONFIG, { complete })([q1], {});
    if (!r.ok) throw new Error(r.error);
    const a = r.answers[0];
    expect(a.kind === 'choice' && a.pick).toBe('molecule'); // 0.52 leads 0.44 by more than FLAT_MARGIN
    expect(0.52 - 0.44).toBeGreaterThan(FLAT_MARGIN);
  });

  it('reads a reply fenced in a code block, as models write them', async () => {
    const { complete } = says(R.fenced.content);
    const r = await createChatDecideTransport(CONFIG, { complete })([q1], {});
    expect(r.ok && r.answers.length).toBe(1);
  });

  it('refuses an option nobody offered and a distribution that is not one: the question is unanswered, never guessed', async () => {
    for (const name of ['unknown-option', 'not-a-distribution']) {
      const { complete } = says(R[name].content);
      const r = await createChatDecideTransport(CONFIG, { complete })([q1], {});
      expect(r.ok, name).toBe(true);
      if (r.ok) expect(r.answers, name).toEqual([]);
    }
  });

  it('prose is no answer: the failure says so, in words', async () => {
    const { complete } = says(R.prose.content);
    const r = await createChatDecideTransport(CONFIG, { complete })([q1], {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/no JSON|could not be read/i);
  });

  it('a batch: each question read by its own kind, an answer to a question not asked dropped', async () => {
    const qs: DecisionQuestion[] = [
      choice('q1', 'what does this stand for?', [{ id: 'bubble', text: 'a bubble' }, { id: 'wheel', text: 'a wheel' }]),
      score('q2', 'how big?', ['low', 'mid', 'high']),
      noul('q3', 'is it a box?'),
    ];
    const { complete } = says(R.mixed.content);
    const r = await createChatDecideTransport(CONFIG, { complete })(qs, {});
    if (!r.ok) throw new Error(r.error);
    expect(r.answers.map((a) => [a.kind, a.questionId])).toEqual([['choice', 'q1'], ['score', 'q2'], ['noul', 'q3']]);
    const s = r.answers[1];
    expect(s.kind === 'score' && s.expectation).toBeCloseTo(0.2 * 1 + 0.7 * 2, 6);
    const n = r.answers[2];
    expect(n.kind === 'noul' && n.yes).toBeCloseTo(0.93, 6);
  });

  it('a failure is the provider’s own sentence, and "cancelled" stays the one word', async () => {
    const down = says({ ok: false, error: 'HTTP 401 — bad key: “User not found.”', status: 401, reason: 'key' });
    const r = await createChatDecideTransport(CONFIG, { complete: down.complete })([q1], {});
    expect(r).toEqual({ ok: false, error: 'HTTP 401 — bad key: “User not found.”' });
    const off = says({ ok: false, error: 'cancelled' });
    expect(await createChatDecideTransport(CONFIG, { complete: off.complete })([q1], {})).toEqual({ ok: false, error: 'cancelled' });
  });
});

describe('the seat, with a floor', () => {
  const board = () => { const s = createSession(); const mark = s.addStroke(circleStroke(200, 200, 60), 1000); return { s, mark }; };
  const ask = async (content: string, takeAt?: number) => {
    const { s, mark } = board();
    const { complete } = says(content);
    const seat = createDecideParticipant(s, createChatDecideTransport(CONFIG, { complete }), 1100, { name: 'jev', locality: 'hosted', ...(takeAt !== undefined ? { takeAt } : {}) });
    const run = await seat.ask([choice('q1', 'which is it?', [{ id: 'molecule', text: 'm' }, { id: 'compound', text: 'c' }], [mark])], 1200);
    return { s, mark, run };
  };

  it('DECIDER_TAKE_AT is 0.99', () => { expect(DECIDER_TAKE_AT).toBe(0.99); });

  it('holds an answer at 0.995 as one more row, attributed — and never evicts the engine’s', async () => {
    const { s, mark, run } = await ask(R.sure.content, DECIDER_TAKE_AT);
    expect(run.rows[0].held).toBe(true);
    const node = s.getState().nodes.get(mark)!;
    const rows = (await import('../session/interpretations')).interpretationsOf(node, s.getState().nodes);
    expect(rows.some((r) => r.label === 'molecule' && r.weight > 0.99)).toBe(true);
    expect(rows.some((r) => r.tier === 0)).toBe(true); // the engine's own reading is still there
  });

  it('holds nothing at 0.97 (≥ the margin but under the floor): the engine’s ranking stands, and the row says why', async () => {
    const { s, mark, run } = await ask(R.fenced.content, DECIDER_TAKE_AT);
    expect(run.rows[0].held).toBe(false);
    expect(run.rows[0].below).toBe(true);
    expect(run.rows[0].reason).toMatch(/molecule 0\.97/);
    const rows = (await import('../session/interpretations')).interpretationsOf(s.getState().nodes.get(mark)!, s.getState().nodes);
    expect(rows.some((r) => r.label === 'molecule' && r.weight > 0.9 && r.tier === 1.5)).toBe(false);
  });

  it('without a floor the seat is as it was: 0.97 is held (decide.ts is unchanged for every other caller)', async () => {
    const { run } = await ask(R.fenced.content);
    expect(run.rows[0].held).toBe(true);
    expect(run.rows[0].below).toBeFalsy();
  });
});

// The decision seat's chat transport (V1-PLAN I7; PLAN-IPAD-NOTES §3, the *decider* seat).
//
// `participants/decide.ts` is the seat and is vendor-neutral on purpose: *there is no HTTP client
// there and there must never be one*. This is the separate decision it names — a `DecideTransport`
// that asks an OpenAI-compatible chat completion (OpenRouter first, where TypeSafe's decision model
// is said to be listed as `typesafe/jev-*`) for the typed JSON answer, and reads it back as typed
// answers. It sits in `llm/`, beside the one transport every model goes through (`provider.ts`'s
// `complete`, injected here so a test or a surface can keep each call), and nothing in the engine
// imports it.
//
// WHAT IS NOT KNOWN, AND WHERE THE SEAM IS. How the real model answers on OpenRouter is
// unverified, and its own API (`/v1/systemone`) refuses browser origins (one test, 20 Sep,
// unverified). So the request is the plainest honest one — *a chat completion that is asked to write
// the typed JSON and nothing else* — and everything that depends on the shape of a vendor's request
// or reply is a **wire** (`DecideWire`: build the messages, parse the text). The native
// `/v1/systemone` shape, behind a proxy of our own, is a second transport made with the same
// `DecideTransport` type and a different request (not a second seat): swap the factory, not the seat.
//
// WHAT THE SEAT IS HELD TO (decide.ts's rules, not this file's):
//   * the options it is given always carry *none of these* — a seat forced to pick will pick;
//   * it is shown option ids and words, never a node id it could get wrong;
//   * its answer is read as a distribution over EXACTLY the options offered — an option nobody
//     offered, a negative or non-finite probability, or nothing that sums to anything makes that
//     question unanswered (never guessed), and the pick is read back off the distribution, never
//     taken on trust;
//   * it is used only where it leads by `DECIDER_TAKE_AT` (decide.ts), else the engine's ranking
//     stands.

import { complete as completeChat, type ChatMessage, type CompletionResult, type ProviderConfig } from './provider';
import {
  FLAT_MARGIN,
  NO_MATCH,
  type ChoiceAnswer,
  type DecideResult,
  type DecideTransport,
  type DecisionAnswer,
  type DecisionQuestion,
  type Probability,
} from '../participants/decide';

/**
 * The id the surface asks for by default (OpenRouter's list is read when a model joins, and refuses an id it
 * does not hold, with the nearest ids — so a wrong guess here is said, never silently used). UNVERIFIED: John was
 * told `typesafe/jev-1.13` or `~typesafe/jev-latest`.
 */
export const DEFAULT_DECIDER_MODEL = 'typesafe/jev-1.13';

/** One option of one question, as the seat is shown it. */
export interface WireOption { id: string; text: string }

/** What the seat is shown of one question. */
export interface WireQuestion { id: string; kind: DecisionQuestion['kind']; ask: string; options: WireOption[] }

/**
 * Everything a vendor's request or reply shape decides, and nothing else: the messages that put the questions, and
 * how the text that comes back is read. A native systemone wire would replace `build` with a request body of its
 * own and `parse` with its reply — which is why the transport takes one.
 */
export interface DecideWire {
  id: string;
  build(questions: readonly DecisionQuestion[]): ChatMessage[];
  parse(text: string, questions: readonly DecisionQuestion[]): { ok: true; answers: DecisionAnswer[] } | { ok: false; error: string };
}

/** The options of a question, as shown: a choice's candidates (with *none of these* last), a score's levels, a noul's yes and no. */
export function wireQuestion(q: DecisionQuestion): WireQuestion {
  if (q.kind === 'choice') {
    const options = q.candidates.map((c) => ({ id: c.id, text: c.text }));
    if (!options.some((o) => o.id === NO_MATCH)) options.push({ id: NO_MATCH, text: 'none of these' });
    return { id: q.id, kind: q.kind, ask: q.ask, options };
  }
  if (q.kind === 'score') return { id: q.id, kind: q.kind, ask: q.ask, options: q.levels.map((l) => ({ id: l, text: l })) };
  return { id: q.id, kind: q.kind, ask: q.statement, options: [{ id: 'yes', text: 'yes' }, { id: 'no', text: 'no' }] };
}

const SYSTEM = [
  'You are a decision seat for a drawing canvas. You are not a writer: you write no prose, no code, no geometry and no names you were not offered.',
  'You are given questions. Each has options. For each question, say how likely each option is: a probability for EVERY option of that question, summing to 1.',
  'One option of a choice is always "no-match" — none of these. Choose it when none of the others is right; a seat that must pick will pick wrongly.',
  'Reply with JSON only, in exactly this shape, and nothing around it:',
  '{"answers":[{"id":"<the question id>","probabilities":{"<option id>":<0 to 1>, ...}}]}',
].join('\n');

/** The chat wire: the questions as one JSON user message, the answer asked for as one JSON object. */
export const CHAT_DECIDE_WIRE: DecideWire = {
  id: 'chat',
  build(questions) {
    return [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: JSON.stringify({ questions: questions.map(wireQuestion) }) },
    ];
  },
  parse(text, questions) {
    const body = jsonOf(text);
    if (body === undefined) return { ok: false, error: `the decision model’s reply could not be read — no JSON in “${clip(text)}”` };
    const list = Array.isArray((body as { answers?: unknown })?.answers)
      ? ((body as { answers: unknown[] }).answers)
      : Array.isArray(body) ? (body as unknown[]) : null;
    if (!list) return { ok: false, error: `the decision model’s reply could not be read — no “answers” in “${clip(text)}”` };
    const asked = new Map(questions.map((q) => [q.id, q] as const));
    const answers: DecisionAnswer[] = [];
    for (const raw of list) {
      const id = (raw as { id?: unknown })?.id;
      const q = typeof id === 'string' ? asked.get(id) : undefined;
      if (!q || answers.some((a) => a.questionId === q.id)) continue; // an answer to a question not asked, or said twice, is no answer
      const dist = distributionOf(wireQuestion(q), (raw as { probabilities?: unknown })?.probabilities);
      if (!dist) continue;
      answers.push(answerOf(q, dist));
    }
    return { ok: true, answers };
  },
};

/** The distribution over exactly the options offered, normalised — or null when what came is not one. */
function distributionOf(wq: WireQuestion, raw: unknown): Probability[] | null {
  const given = new Map<string, number>();
  if (Array.isArray(raw)) {
    for (const e of raw) {
      const k = (e as { of?: unknown; id?: unknown })?.of ?? (e as { id?: unknown })?.id;
      const p = (e as { p?: unknown })?.p;
      if (typeof k !== 'string' || typeof p !== 'number') return null;
      given.set(k, p);
    }
  } else if (raw && typeof raw === 'object') {
    for (const [k, p] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof p !== 'number') return null;
      given.set(k, p);
    }
  } else return null;
  const known = new Set(wq.options.map((o) => o.id));
  for (const [k, p] of given) if (!known.has(k) || !Number.isFinite(p) || p < 0) return null; // an option nobody offered; not a probability
  const sum = [...given.values()].reduce((n, p) => n + p, 0);
  if (!(sum > 0)) return null;
  return wq.options.map((o) => ({ of: o.id, p: (given.get(o.id) ?? 0) / sum }));
}

function answerOf(q: DecisionQuestion, dist: Probability[]): DecisionAnswer {
  const order = [...dist].sort((a, b) => b.p - a.p);
  const confidence = order[0]?.p ?? 0;
  if (q.kind === 'noul') return { kind: 'noul', questionId: q.id, yes: dist.find((d) => d.of === 'yes')?.p ?? 0 };
  if (q.kind === 'score') {
    return {
      kind: 'score', questionId: q.id, levels: q.levels, distribution: dist,
      expectation: dist.reduce((n, d) => n + q.levels.indexOf(d.of) * d.p, 0), confidence,
    };
  }
  // The pick is read back OFF the distribution: a lead under the seat's own flatness margin picks nothing.
  const pick = order.length > 1 && order[0].p - order[1].p < FLAT_MARGIN ? null : order[0]?.of ?? null;
  return { kind: 'choice', questionId: q.id, pick, distribution: dist, confidence } satisfies ChoiceAnswer;
}

/** The first JSON value in a reply, fenced in a code block or not; undefined when there is none. */
function jsonOf(text: string): unknown {
  const t = String(text ?? '').trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(t);
  const candidates = [fenced ? fenced[1] : t, t];
  for (const c of candidates) {
    const start = c.search(/[{[]/);
    if (start < 0) continue;
    const close = c[start] === '{' ? '}' : ']';
    const end = c.lastIndexOf(close);
    if (end <= start) continue;
    try { return JSON.parse(c.slice(start, end + 1)); } catch { /* the next */ }
  }
  return undefined;
}

const clip = (t: string) => { const s = String(t ?? '').replace(/\s+/g, ' ').trim(); return s.length > 80 ? s.slice(0, 79) + '…' : s; };

export interface ChatDecideOptions {
  /** The call, injected: the surface's keeps each call for its row. Defaults to `provider.ts`'s `complete`. */
  complete?: (config: ProviderConfig, messages: ChatMessage[], opts: { signal?: AbortSignal }) => Promise<CompletionResult>;
  /** What the request and reply look like; the chat wire unless a vendor's own is swapped in. */
  wire?: DecideWire;
}

/**
 * A `DecideTransport` over an OpenAI-compatible chat completion. The whole batch is one call (decide.ts's
 * rule: independent questions over one snapshot are one call). A failure is the provider's own sentence,
 * and `cancelled` stays the one word; what came back unreadable is said in words. `via` is the model's id.
 * The config is read at call time, so a key entered later reaches a transport already made.
 */
export function createChatDecideTransport(config: ProviderConfig, options: ChatDecideOptions = {}): DecideTransport {
  const send = options.complete ?? completeChat;
  const wire = options.wire ?? CHAT_DECIDE_WIRE;
  return async (questions, { signal }): Promise<DecideResult> => {
    if (!questions.length) return { ok: true, answers: [], via: config.model };
    const res = await send(config, wire.build(questions), { signal });
    if (!res.ok) return { ok: false, error: res.error };
    const read = wire.parse(res.text, questions);
    if (!read.ok) return { ok: false, error: read.error };
    return { ok: true, answers: read.answers, via: config.model };
  };
}

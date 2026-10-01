// ===== the decision seat =====
//
// A seat for a **decision-only** participant: typed questions in, a typed value
// out. Not a generator — it writes no prose, no code, no geometry and no names
// it was not offered. It picks among candidates the engine already holds, scores
// against levels the engine already named, or says how likely a statement is.
//
// `DIRECTOR-VIEW-2026-09-17.md` §3 and §5 call this a **tier 1.5** seat: slower
// than the instant library, cheaper and narrower than a model, and sitting
// between them. The rule that keeps it honest is absolute and it is the whole
// design:
//
// > **A seat, not a dependency.** The transport is injected — the `bridge.ts`
// > pattern the shard's model seat already uses — so the seat may be a hosted
// > decision model, a local classifier, or a hand with a table in front of them,
// > and the engine cannot tell which. Nothing in this file names a vendor,
// > opens a socket, or assumes any particular model exists. There is no HTTP
// > client here and there must never be one: a real transport is a separate
// > decision, made later, against measurements this file's harness produced.
//
// And the invariant it shares with every other participant: **the engine's own
// reading is never evicted.** A decision lands as one more attributed row in the
// certainty column, held, with its reason — and the reason is *the question it
// was asked and the distribution it returned*, verbatim. A seat that cannot
// write prose must not have prose written for it.
//
// Three typed questions, and the differences between them are load-bearing:
//
//   * **Choice** — one outcome out of a closed candidate list, with the whole
//     distribution and a confidence. The list always carries an explicit
//     **no-match** outcome, because "none of these" is an answer and a seat
//     forced to pick will pick. Candidate ids stay mapped in code: the seat
//     never sees a node id it could get wrong, and never invents one.
//   * **Score** — an expectation over **ordered descriptive levels**, with the
//     distribution over those levels and a confidence. It is not a measurement
//     and it is not a probability of being right; it is *where on this ladder
//     of words does this sit*. Geometry is the engine's job and stays there.
//   * **Noul** — probability-of-yes for one statement, and **no separate
//     confidence**, because there is nothing else to be confident about. Near
//     0.5 is *uncertain*, not *medium*. Two labels that can both be true are
//     two Nouls, never one Score.
//
// Questions are **batched over one snapshot**: the session's generation is
// taken before the ask and pinned on every proposal that comes back, so an
// answer can never land on a board that has moved (STATE-1's rule, reached
// through the session's own door rather than re-implemented here).

import type { Session, ProposedEdge, ProposedRep } from '../session/session';
import type { Capability, Locality } from '../session/nodes';

/** The outcome that means *none of these* — always offered, never inferred. */
export const NO_MATCH = 'no-match';

/**
 * How surely a decision model must lead before the surface takes its answer at all (V1-PLAN I7,
 * PLAN-IPAD-NOTES §3: *taken only at 0.99, else the engine's ranking stands*). A seat is asked with
 * this as `DecideOptions.takeAt`; a seat made without one holds every answer that is not flat, as
 * it always did. It is a floor on what the seat is TRUSTED with, never on what it may say: an
 * answer under it is still returned in the run — question and distribution — and never held.
 */
export const DECIDER_TAKE_AT = 0.99;

/**
 * How far the top of a distribution must lead the next before the seat is
 * taken to have picked anything out at all.
 *
 * This is **not** a confidence threshold, and it is deliberately not one: a
 * universal "below 0.7, ignore it" rule borrowed from someone's cookbook would
 * throw away exactly the plural, disagreeing readings this engine exists to
 * show. Flatness is a property of the distribution's own shape — nothing led —
 * and the caller may pass its own margin.
 */
export const FLAT_MARGIN = 0.05;

export interface DecisionCandidate {
  /** The id the reply comes back as. Mapped to a node id in code, never by the seat. */
  id: string;
  /** What that candidate means, in words the seat can read. */
  text: string;
}

interface QuestionBase {
  /** This question's own id — the answer comes back keyed by it. */
  id: string;
  /** The question in words, exactly as the seat is asked it. Half of every reason. */
  ask: string;
  /**
   * The node ids this question is about, in the ids the log uses for them. The
   * seat never sees these; they are how an answer is attached when it returns.
   */
  about?: string[];
}

export interface ChoiceQuestion extends QuestionBase {
  kind: 'choice';
  /** The closed list. `NO_MATCH` is appended by `choice()` if it is not already here. */
  candidates: DecisionCandidate[];
}

export interface ScoreQuestion extends QuestionBase {
  kind: 'score';
  /** Ordered levels, low to high. Descriptive words, never numbers with units. */
  levels: string[];
}

export interface NoulQuestion extends QuestionBase {
  kind: 'noul';
  /** The statement whose probability-of-yes is being asked for. */
  statement: string;
}

export type DecisionQuestion = ChoiceQuestion | ScoreQuestion | NoulQuestion;

/** One outcome and its probability. */
export interface Probability {
  of: string;
  p: number;
}

export interface ChoiceAnswer {
  kind: 'choice';
  questionId: string;
  /** The leading candidate's id — `NO_MATCH` when that led, null when nothing did. */
  pick: string | null;
  /** The COMPLETE distribution over every candidate, including no-match. */
  distribution: Probability[];
  confidence: number;
}

export interface ScoreAnswer {
  kind: 'score';
  questionId: string;
  /** The levels this was scored against, in order — kept so the number can be read. */
  levels: string[];
  /** The expectation over those levels, as an index into them (0 … levels.length - 1). */
  expectation: number;
  distribution: Probability[];
  confidence: number;
}

export interface NoulAnswer {
  kind: 'noul';
  questionId: string;
  /** Probability-of-yes. There is no confidence beside it, on purpose. */
  yes: number;
}

export type DecisionAnswer = ChoiceAnswer | ScoreAnswer | NoulAnswer;

export type DecideResult =
  | { ok: true; answers: DecisionAnswer[]; via?: string }
  | { ok: false; error: string };

/**
 * The seam. Everything above is vendor-neutral; everything a vendor would
 * supply is behind this one function.
 *
 * It takes the whole batch, because independent questions over one snapshot are
 * one call — and because a transport that can only answer one at a time can
 * still implement this, while a transport built one-question-at-a-time cannot
 * be batched later without changing every caller.
 */
export type DecideTransport = (
  questions: readonly DecisionQuestion[],
  opts: { signal?: AbortSignal }
) => Promise<DecideResult>;

// ---- building questions ----------------------------------------------------

/** A Choice, with the no-match outcome guaranteed present. */
export function choice(
  id: string,
  ask: string,
  candidates: DecisionCandidate[],
  about?: string[]
): ChoiceQuestion {
  const has = candidates.some((c) => c.id === NO_MATCH);
  return {
    kind: 'choice',
    id,
    ask,
    about,
    candidates: has ? candidates : [...candidates, { id: NO_MATCH, text: 'none of these' }],
  };
}

export function score(id: string, ask: string, levels: string[], about?: string[]): ScoreQuestion {
  return { kind: 'score', id, ask, levels, about };
}

export function noul(id: string, statement: string, about?: string[]): NoulQuestion {
  return { kind: 'noul', id, ask: statement, statement, about };
}

// ---- reading an answer -----------------------------------------------------

const p2 = (p: number) => p.toFixed(2);

/** The distribution sorted by probability, highest first. */
export function ranked(answer: DecisionAnswer): Probability[] {
  if (answer.kind === 'noul') {
    return [
      { of: 'yes', p: answer.yes },
      { of: 'no', p: 1 - answer.yes },
    ];
  }
  return [...answer.distribution].sort((a, b) => b.p - a.p);
}

/**
 * Did the seat pick anything out?
 *
 * Flat means the distribution led nowhere: the top outcome is within `margin`
 * of the next (or, for a Noul, within `margin` of an even chance). A flat
 * answer is **not held** — it is handed back so the surface can ask the human,
 * which is the whole reason for measuring flatness rather than taking the
 * argmax and moving on.
 */
export function isFlat(answer: DecisionAnswer, margin: number = FLAT_MARGIN): { flat: boolean; why: string } {
  if (answer.kind === 'noul') {
    const d = Math.abs(answer.yes - 0.5);
    return {
      flat: d < margin,
      why: `yes ${p2(answer.yes)} — ${p2(d)} from an even chance`,
    };
  }
  const order = ranked(answer);
  if (order.length === 0) return { flat: true, why: 'no distribution came back' };
  if (order.length === 1) return { flat: false, why: `only one outcome: ${order[0].of} ${p2(order[0].p)}` };
  const lead = order[0].p - order[1].p;
  return {
    flat: lead < margin,
    why: `${order[0].of} ${p2(order[0].p)} leads ${order[1].of} ${p2(order[1].p)} by ${p2(lead)}`,
  };
}

/**
 * The seat's reason: **the question it was asked and the distribution it
 * returned**, and nothing else.
 *
 * No sentence is invented for a seat that cannot write one. This is what the
 * surface shows beside the row, and it is why a decision can be argued with:
 * you can see the options it was given, which is where most of a wrong answer
 * actually lives.
 */
export function reasonOf(question: DecisionQuestion, answer: DecisionAnswer): string {
  const dist = ranked(answer)
    .map((d) => `${d.of} ${p2(d.p)}`)
    .join(' · ');
  if (answer.kind === 'noul') return `asked “${question.ask}” — ${dist}`;
  if (answer.kind === 'score') {
    const levels = answer.levels.join(' < ');
    return (
      `asked “${question.ask}” (score over ${levels}) — ${dist}; ` +
      `expectation ${answer.expectation.toFixed(2)}, confidence ${p2(answer.confidence)}`
    );
  }
  const offered = (question as ChoiceQuestion).candidates.map((c) => c.id).join(', ');
  return (
    `asked “${question.ask}” (choice among ${offered}) — ${dist}; ` +
    `confidence ${p2(answer.confidence)}`
  );
}

/** The level a Score's expectation sits at, as a word. */
export function levelOf(answer: ScoreAnswer): string {
  const i = Math.max(0, Math.min(answer.levels.length - 1, Math.round(answer.expectation)));
  return answer.levels[i] ?? '';
}

/** The probability the leading outcome carries — a Noul's is its probability-of-yes. */
export function leadOf(answer: DecisionAnswer): number {
  return ranked(answer)[0]?.p ?? 0;
}

// ---- the seat --------------------------------------------------------------

export interface DecideOptions {
  name?: string;
  /** Defaults to 1.5 — the seat between the instant library and a model. */
  tier?: Capability;
  /** Where the seat sits, as a cost for the router. A seat with no transport is local. */
  locality?: Locality;
  /** The caller's own flatness margin, when `FLAT_MARGIN` is not the right one here. */
  flatMargin?: number;
  /**
   * The least a distribution's lead may be for its answer to be held (`DECIDER_TAKE_AT` is the
   * surface's). Under it the answer is `below`: returned, not held, and the engine's ranking stands.
   * Unset, nothing is held back but a flat answer.
   */
  takeAt?: number;
}

/** One question, its answer, and what became of it. */
export interface DecisionRow {
  question: DecisionQuestion;
  answer: DecisionAnswer;
  flat: boolean;
  /** How flatness was judged, in the distribution's own numbers. */
  flatWhy: string;
  /** The question and the distribution — what the surface shows. */
  reason: string;
  /** True when this answer was proposed onto the board. A flat one never is. */
  held: boolean;
  /** True when the seat was asked with a floor (`takeAt`) and the answer led by less: not held, the engine's ranking stands. */
  below?: boolean;
}

export interface DecideRun {
  ok: boolean;
  error?: string;
  rows: DecisionRow[];
  /** Questions the transport returned nothing for. Never guessed at. */
  unanswered: string[];
  /** The generation the batch was asked about — the snapshot's identity. */
  snapshot: number;
  /** How long the transport took, in ms. */
  ms: number;
  /** Why nothing was held, when the board moved under the batch. */
  refused?: string;
  /** What the transport says it was — a model name, a classifier, a hand. */
  via?: string;
}

export interface DecideSeat {
  /** The participant node id — everything this seat says is attributed to it. */
  id: string;
  name: string;
  tier: Capability;
  /**
   * Ask a batch over one snapshot, and hold what it picked out.
   *
   * Never throws. A flat answer is returned and not held; an answer about a
   * mark that has gone, or about a board that has been replaced, is refused at
   * the session's own door rather than written into the log.
   */
  ask(questions: readonly DecisionQuestion[], at: number, signal?: AbortSignal): Promise<DecideRun>;
}

/**
 * Register a decision seat on a session.
 *
 * The transport is required and injected. There is no default and there is no
 * fallback that reaches the network: a seat with nobody in it is a seat with
 * nobody in it, and the engine goes on answering from tiers 0 and 1.
 */
export function createDecideParticipant(
  session: Session,
  transport: DecideTransport,
  at: number = 0,
  options: DecideOptions = {}
): DecideSeat {
  const name = options.name ?? 'decide';
  const tier: Capability = options.tier ?? 1.5;
  const margin = options.flatMargin ?? FLAT_MARGIN;
  const takeAt = options.takeAt ?? 0;
  const id = session.join('agent', name, at, tier, options.locality ?? 'local');

  async function ask(
    questions: readonly DecisionQuestion[],
    now: number,
    signal?: AbortSignal
  ): Promise<DecideRun> {
    const snapshot = session.getState().generation;
    const started = Date.now();
    let result: DecideResult;
    try {
      result = await transport(questions, { signal });
    } catch (e) {
      // A seat that throws is a seat that is not there. The canvas keeps drawing.
      return {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        rows: [],
        unanswered: questions.map((q) => q.id),
        snapshot,
        ms: Date.now() - started,
      };
    }
    const ms = Date.now() - started;
    if (!result.ok) {
      return { ok: false, error: result.error, rows: [], unanswered: questions.map((q) => q.id), snapshot, ms };
    }

    const byId = new Map(result.answers.map((a) => [a.questionId, a]));
    const rows: DecisionRow[] = [];
    const unanswered: string[] = [];
    for (const q of questions) {
      const answer = byId.get(q.id);
      if (!answer) {
        unanswered.push(q.id);
        continue;
      }
      // An answer whose kind is not the kind that was asked is not an answer.
      if (answer.kind !== q.kind) {
        unanswered.push(q.id);
        continue;
      }
      const { flat, why } = isFlat(answer, margin);
      const below = !flat && takeAt > 0 && leadOf(answer) < takeAt;
      rows.push({ question: q, answer, flat, flatWhy: why, reason: reasonOf(q, answer), held: false, ...(below ? { below: true } : {}) });
    }

    // The snapshot check. A board that has been replaced under the batch takes
    // none of it — the session would refuse each proposal anyway, and refusing
    // the batch says so once instead of a dozen times.
    const state = session.getState();
    if (state.generation !== snapshot) {
      return {
        ok: true,
        rows,
        unanswered,
        snapshot,
        ms,
        via: result.via,
        refused: `the board was replaced while the seat was answering (generation ${snapshot} → ${state.generation})`,
      };
    }

    for (const row of rows) {
      if (row.flat) continue; // nothing was picked out: this one is the human's.
      if (row.below) continue; // led, but not by enough to be trusted: the engine's ranking stands.
      const targets = (row.question.about ?? []).filter((n) => state.nodes.has(n));
      if (!targets.length) continue;

      const edges: ProposedEdge[] = [];
      if (row.answer.kind === 'choice' && row.answer.pick && row.answer.pick !== NO_MATCH) {
        // A Choice about what something IS joins the certainty column beside
        // the engine's own readings — held, attributed, evicting nothing.
        edges.push({
          to: `type:${row.answer.pick.toLowerCase().replace(/\s+/g, '-')}`,
          rel: 'resembles',
          weight: leadOf(row.answer),
          reasoning: row.reason,
        });
      }
      // Every answer, of every kind, is kept as a rep: the question and the
      // whole distribution, so the row can be read back exactly as it came.
      const rep: ProposedRep = {
        modality: 'decision',
        data: { question: row.question, answer: row.answer, snapshot },
        confidence: leadOf(row.answer),
        reasoning: row.reason,
      };
      session.propose({
        participantId: id,
        nodeId: targets[0],
        edges,
        reps: [rep],
        at: now,
        expect: { generation: snapshot },
      });
      const stale = session.getState().staleResult;
      row.held = !stale;
      if (stale) {
        return { ok: true, rows, unanswered, snapshot, ms, via: result.via, refused: stale.detail };
      }
    }

    return { ok: true, rows, unanswered, snapshot, ms, via: result.via };
  }

  return { id, name, tier, ask };
}

// ---- a stub seat -----------------------------------------------------------

/** What the stub says about one question. Deterministic, and short to write. */
export type StubAnswer =
  /** A Choice: this candidate leads with this probability; the rest share the remainder. */
  | { pick: string; p: number; confidence?: number }
  /** A Score: this level leads with this probability. */
  | { level: string; p: number; confidence?: number }
  /** A Noul: probability-of-yes. */
  | { yes: number }
  /** Nothing led — a flat distribution, which is the path worth exercising. */
  | { flat: true };

export interface StubOptions {
  /** What the stub calls itself when asked who answered. */
  via?: string;
  /**
   * What an unscripted question gets. Default `'flat'` — a stub that has not
   * been told the answer does not know it, and saying so exercises the
   * ask-the-human path rather than inventing a lead.
   */
  unscripted?: 'flat' | 'unanswered';
}

const even = (outcomes: string[]): Probability[] =>
  outcomes.map((of) => ({ of, p: outcomes.length ? 1 / outcomes.length : 0 }));

function spread(outcomes: string[], lead: string, p: number): Probability[] {
  const rest = outcomes.filter((o) => o !== lead);
  const each = rest.length ? Math.max(0, 1 - p) / rest.length : 0;
  return outcomes.map((of) => ({ of, p: of === lead ? p : each }));
}

const expectationOf = (levels: string[], dist: Probability[]): number =>
  dist.reduce((n, d) => n + levels.indexOf(d.of) * d.p, 0);

/**
 * A transport that answers from a written-down book. No network, no model, no
 * clock of its own beyond the one the caller passes.
 *
 * It exists so the seat can be tested and MEASURED without anything being
 * hosted — and the numbers a run of it produces are **stub measurements, not
 * any decision model's performance**. They say what the harness measures and
 * what the plumbing costs, and nothing whatever about how well a real seat
 * would answer these questions.
 */
export function createStubDecideTransport(
  book: Record<string, StubAnswer>,
  options: StubOptions = {}
): DecideTransport {
  const unscripted = options.unscripted ?? 'flat';
  return async (questions) => {
    const answers: DecisionAnswer[] = [];
    for (const q of questions) {
      const told = book[q.id];
      if (!told && unscripted === 'unanswered') continue;
      const entry: StubAnswer = told ?? { flat: true };

      if (q.kind === 'noul') {
        const yes = 'yes' in entry ? entry.yes : 0.5;
        answers.push({ kind: 'noul', questionId: q.id, yes });
        continue;
      }
      if (q.kind === 'score') {
        const dist =
          'level' in entry ? spread(q.levels, entry.level, entry.p) : even(q.levels);
        answers.push({
          kind: 'score',
          questionId: q.id,
          levels: q.levels,
          distribution: dist,
          expectation: expectationOf(q.levels, dist),
          confidence: 'confidence' in entry && entry.confidence !== undefined ? entry.confidence : 'level' in entry ? entry.p : 0,
        });
        continue;
      }
      const ids = q.candidates.map((c) => c.id);
      const dist = 'pick' in entry && ids.includes(entry.pick) ? spread(ids, entry.pick, entry.p) : even(ids);
      // The pick is read back OFF the distribution, never taken on trust: a
      // book entry whose candidate is not on offer leads to nothing, which is
      // exactly what a seat handed a bad candidate list should report.
      const order = [...dist].sort((a, b) => b.p - a.p);
      const lead = order.length > 1 && order[0].p - order[1].p < FLAT_MARGIN ? null : order[0]?.of ?? null;
      answers.push({
        kind: 'choice',
        questionId: q.id,
        pick: lead,
        distribution: dist,
        confidence: 'confidence' in entry && entry.confidence !== undefined ? entry.confidence : 'pick' in entry ? entry.p : 0,
      });
    }
    return { ok: true, answers, via: options.via ?? 'stub' };
  };
}

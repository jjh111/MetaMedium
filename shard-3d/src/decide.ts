// ===== the decision seat's questions, and the harness that measures them =====
//
// `metamedium-core/src/participants/decide.ts` is the seat: typed questions in,
// a typed value out, behind an injected transport. This file is the shard's
// half of it — **what the space would ask a decision seat**, and a harness that
// runs a batch over a fixture and prints what happened as a table.
//
// Three rules shape every question below, and they are the difference between a
// decision seat and a model:
//
//   * **The engine keeps the geometry.** Distances, extents, silhouettes, the
//     shape rung, the form rung, the part cuts — all of it is measured here and
//     handed over as a bounded description in words and numbers. A seat is never
//     shown a stroke to interpret geometrically; it is shown what the engine
//     already read and asked to pick among meanings.
//   * **Ids stay mapped in code.** A candidate is `{ id: 'rectangle' }`, never
//     `stroke:4`. The node ids travel on the question's `about`, which the seat
//     never sees, and that is how an answer is attached when it comes back.
//   * **The seat can only choose, never invent.** Every naming question is a
//     Choice among the human's own words and the names the library already
//     holds, with no-match always on offer. That is a real limit and it is the
//     point: a seat that could invent a word would be a generator, and the
//     shard already has a seat for one of those (`room.ts`, G5).
//
// Pure: no three.js, no DOM, no session. It takes a `SpaceScene` — the same
// bounded description `describeSpace` writes the brief from — and gives back
// questions, or a measurement.

import {
  choice,
  score,
  noul,
  isFlat,
  leadOf,
  levelOf,
  ranked,
  NO_MATCH,
  type DecisionQuestion,
  type DecisionCandidate,
  type DecisionAnswer,
  type DecideSeat,
  type DecideRun,
} from 'metamedium-core';
import type { BriefMark, SpaceScene } from './brief';
import { COLOUR_WORDS } from './op';
import { FORM_ROLES } from './form';

/**
 * The shape rung's closed vocabulary, as candidates.
 *
 * Eight entries, and the list is closed on purpose — it is the same one
 * `metamedium-core/src/recognition.ts` detects and the same one a model is
 * allowed to draw in. A seat asked *what shape is this* may agree with the
 * engine, disagree with it, or say none of these; it may not answer `hexagon`.
 */
export const SHAPE_CANDIDATES: DecisionCandidate[] = [
  { id: 'line', text: 'a straight line' },
  { id: 'arc', text: 'an arc — a curve that does not close' },
  { id: 'triangle', text: 'a closed three-cornered shape' },
  { id: 'rectangle', text: 'a closed four-cornered box' },
  { id: 'circle', text: 'a closed round shape' },
  { id: 'arrow', text: 'a shaft with a barb drawn back on it' },
  { id: 'text', text: 'handwriting — writing, not a shape' },
  { id: 'dot', text: 'a dot, too small to have geometry' },
];

/** The form rung's roles, as candidates — what a mark PLAYS in space. */
export const ROLE_CANDIDATES: DecisionCandidate[] = FORM_ROLES.map((role) => ({
  id: role,
  text: role,
}));

/** The closed colour list, as candidates. The same words `op.ts` can paint. */
export const COLOUR_CANDIDATES: DecisionCandidate[] = Object.keys(COLOUR_WORDS).map((word) => ({
  id: word,
  text: word,
}));

/** How much of the human's words a part answers — ordered, descriptive, not a measurement. */
export const ANSWERS_LEVELS = ['none of them', 'a little of them', 'most of them', 'all of them'];

/** Words that carry nothing a part could be called. */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'with', 'of', 'on', 'in', 'at', 'to', 'for', 'from',
  'some', 'its', 'it', 'is', 'are', 'that', 'this', 'these', 'those', 'my', 'make', 'made',
]);

/**
 * What a part may be called — **the human's own words and the library's, and
 * nothing else**.
 *
 * A decision seat picks; it does not write. So the candidate list IS the
 * vocabulary, and a drawing whose words are thin gets a thin list and a lot of
 * no-match. That is a measurement worth having rather than a fault to paper
 * over: it says exactly where a seat stops and a generator has to start.
 */
export function nameCandidates(scene: SpaceScene): DecisionCandidate[] {
  const out: DecisionCandidate[] = [];
  const seen = new Set<string>();
  const add = (id: string, text: string) => {
    const key = id.toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push({ id: key, text });
  };
  for (const raw of (scene.words ?? '').split(/[^\p{L}\p{N}'-]+/u)) {
    const word = raw.toLowerCase();
    if (!word || STOPWORDS.has(word) || word in COLOUR_WORDS) continue;
    add(word, `“${word}” — the human's own word, from what they typed`);
  }
  for (const n of scene.names ?? []) add(n.name, `“${n.name}” — already in play on ${n.solidId}`);
  for (const d of scene.definitions ?? []) add(d.name, `“${d.name}” — a definition the library holds`);
  return out;
}

/** Every mark the scene holds, with the plane it lies on. */
function marksOf(scene: SpaceScene): { plane: string; view: string; mark: BriefMark }[] {
  return (scene.planes ?? []).flatMap((p) =>
    p.marks.map((mark) => ({ plane: p.name, view: p.view, mark }))
  );
}

/** A mark as a seat is told about it: what was measured, never the points. */
function describeMark(m: BriefMark, plane: string, view: string): string {
  const xs = m.points.map((p) => p.x);
  const ys = m.points.map((p) => p.y);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  return (
    `a mark on the ${plane} plane (the ${view} view), ` +
    `${w.toFixed(2)} × ${h.toFixed(2)} in that plane's own units, ` +
    `${m.points.length} points${m.taken ? ', taken into what stands' : ''}`
  );
}

/**
 * The batch the space would ask, over one snapshot.
 *
 * Four kinds of question, and only two of them have an engine reading to be
 * measured against — which is itself the reason for asking the other two.
 */
export function spaceQuestions(scene: SpaceScene): DecisionQuestion[] {
  const out: DecisionQuestion[] = [];

  for (const { plane, view, mark } of marksOf(scene)) {
    const what = describeMark(mark, plane, view);
    out.push(
      choice('shape:' + mark.id, `what shape is ${what}?`, SHAPE_CANDIDATES, [mark.id]),
      choice('plays:' + mark.id, `what does ${what} play in the drawing?`, ROLE_CANDIDATES, [mark.id])
    );
  }

  const hull = scene.hull;
  if (hull) {
    const names = nameCandidates(scene);
    const words = scene.words ? `“${scene.words}”` : 'nothing';
    for (const part of hull.parts) {
      const about = [hull.solidId];
      if (names.length) {
        out.push(
          choice('name:' + part.id, `what is this: ${part.sentence}?`, names, about)
        );
      }
      out.push(
        choice('material:' + part.id, `what is this made of: ${part.sentence}?`, COLOUR_CANDIDATES, about),
        score(
          'answers:' + part.id,
          `how much of what the human typed (${words}) does this part answer: ${part.sentence}?`,
          ANSWERS_LEVELS,
          about
        ),
        noul('about:' + part.id, `the human's words (${words}) are about this part: ${part.sentence}`, about)
      );
    }
  }

  return out;
}

/**
 * What the ENGINE itself says about a question, where it says anything.
 *
 * This is the whole basis of the measurement, and its honesty depends on being
 * empty where the engine is empty: the shape rung and the form rung have
 * readings, and nothing in the engine has an opinion about what a part should
 * be called or painted. A harness that invented a baseline for those would be
 * measuring itself.
 */
export function engineReadings(scene: SpaceScene): Map<string, string> {
  const out = new Map<string, string>();
  for (const { mark } of marksOf(scene)) {
    if (mark.shape) out.set('shape:' + mark.id, mark.shape);
    if (mark.plays && mark.plays !== 'unread') out.set('plays:' + mark.id, mark.plays);
  }
  return out;
}

// ---- the measurement -------------------------------------------------------

export interface MeasuredRow {
  id: string;
  kind: 'choice' | 'score' | 'noul';
  /** What the seat said, in one short phrase. */
  said: string;
  /** The leading probability — for a Noul, its probability-of-yes. */
  lead: number;
  flat: boolean;
  /** The engine's own reading, or null where it has none. */
  engine: string | null;
  /** True / false against the engine, or null when there was nothing to agree with. */
  agreed: boolean | null;
  /** The question and the distribution, verbatim. */
  reason: string;
}

export interface DecisionMeasurement {
  board: string;
  words: string;
  asked: number;
  answered: number;
  /** How many questions the engine itself had a reading for. */
  comparable: number;
  agreed: number;
  flat: number;
  held: number;
  unanswered: string[];
  /** The whole batch, in ms. One call, so this is the batch and not a sum. */
  ms: number;
  rows: MeasuredRow[];
  /** What answered — `via` from the transport. */
  via?: string;
  refused?: string;
}

/** What the seat said, in as few words as it can be said in. */
function saidOf(answer: DecisionAnswer): string {
  if (answer.kind === 'noul') return `yes ${answer.yes.toFixed(2)}`;
  if (answer.kind === 'score') return `${levelOf(answer)} (${answer.expectation.toFixed(2)})`;
  return `${answer.pick ?? 'nothing led'} ${leadOf(answer).toFixed(2)}`;
}

/**
 * Run a batch through a seat over one fixture, and say what happened.
 *
 * Agreement is counted **only** where the engine has a reading of its own; a
 * question it has no opinion about is counted as comparable to nothing, which
 * is why `comparable` is reported beside `agreed` and the ratio is never taken
 * over `asked`.
 */
export async function measureDecisions(
  scene: SpaceScene,
  seat: DecideSeat,
  opts: { board: string; at?: number } = { board: 'fixture' }
): Promise<DecisionMeasurement> {
  const questions = spaceQuestions(scene);
  const engine = engineReadings(scene);
  const run: DecideRun = await seat.ask(questions, opts.at ?? Date.now());

  const rows: MeasuredRow[] = run.rows.map((row) => {
    const reading = engine.get(row.question.id) ?? null;
    const said = row.answer.kind === 'choice' ? row.answer.pick : null;
    return {
      id: row.question.id,
      kind: row.answer.kind,
      said: saidOf(row.answer),
      lead: row.answer.kind === 'noul' ? row.answer.yes : leadOf(row.answer),
      flat: row.flat,
      engine: reading,
      // Flat is not a wrong answer and it is not a right one: the seat picked
      // nothing out, and counting it either way would hide the thing the
      // measurement is for.
      agreed: reading === null || row.flat ? null : said === reading,
      reason: row.reason,
    };
  });

  return {
    board: opts.board,
    words: scene.words ?? '',
    asked: questions.length,
    answered: run.rows.length,
    comparable: rows.filter((r) => r.agreed !== null).length,
    agreed: rows.filter((r) => r.agreed === true).length,
    flat: rows.filter((r) => r.flat).length,
    held: run.rows.filter((r) => r.held).length,
    unanswered: run.unanswered,
    ms: run.ms,
    rows,
    ...(run.via ? { via: run.via } : {}),
    ...(run.refused ? { refused: run.refused } : {}),
  };
}

const pad = (s: string, n: number) => (s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length));

/**
 * The measurement as a table, one line per question and a summary under it.
 *
 * It says `via` at the top because a table of stub numbers that does not say it
 * is a table of stub numbers is the easiest way in the world to end up quoting
 * a model's performance that nobody has measured.
 */
export function decisionTable(m: DecisionMeasurement): string[] {
  const out: string[] = [];
  out.push(`board ${m.board} · words “${m.words}” · answered by ${m.via ?? 'an unnamed seat'}`);
  out.push('');
  out.push(
    `${pad('question', 22)} ${pad('kind', 6)} ${pad('the seat said', 24)} ${pad('flat', 5)} ${pad('the engine said', 16)} agreed`
  );
  for (const r of m.rows) {
    out.push(
      `${pad(r.id, 22)} ${pad(r.kind, 6)} ${pad(r.said, 24)} ${pad(r.flat ? 'flat' : '·', 5)} ` +
        `${pad(r.engine ?? '—', 16)} ${r.agreed === null ? '—' : r.agreed ? 'yes' : 'no'}`
    );
  }
  out.push('');
  out.push(
    `asked ${m.asked} · answered ${m.answered} · held ${m.held} · flat ${m.flat} ` +
      `(${m.asked ? Math.round((m.flat / m.asked) * 100) : 0}%)`
  );
  out.push(
    `the engine had a reading for ${m.comparable} of them; the seat agreed with ${m.agreed}` +
      `${m.comparable ? ` (${Math.round((m.agreed / m.comparable) * 100)}%)` : ''}`
  );
  out.push(
    `the batch took ${m.ms} ms — one call, ${m.asked} questions` +
      `${m.unanswered.length ? `, ${m.unanswered.length} unanswered` : ''}`
  );
  if (m.refused) out.push(`refused: ${m.refused}`);
  return out;
}

/** The distribution of one row, for a panel that wants to draw it. */
export function distributionOf(answer: DecisionAnswer): { of: string; p: number }[] {
  return ranked(answer);
}

/** Re-exported so a caller needs one import to read a row. */
export { isFlat, NO_MATCH };

// Which diagram is this? (the audit's D2; PLAN-FIELD-PAR §6, the decider's second job). John drew two boxes and a
// line between them, and every notation read it under the floor — a flowchart 0.36 (no head says which way it
// flows), an ER diagram 0.16 (no multiplicity, no verb) — so the tools a diagram has, *Make it Mermaid* and *Tidy
// the diagram*, never came. The engine holds every notation's reading of the marks, ranked and numbered, and
// none of them clears the floor; or two of them clear it about equally. That is a choice among what the engine
// already holds, which is exactly a decision seat's job: when one sits in the decider seat, the field offers to
// ask it — between the notations read (each said with its own description), *a plain diagram* (nodes joined by
// lines, written as a flowchart with no direction) where the marks are such a graph, and *none of these*.
//
// The rules, the seat's and CLAUDE.md's:
//   * asked only by its tap — a pill with the model's dot, never on a hold, a summon or the field opening;
//   * the answer is held on the first of the marks, attributed to the decider, as a DECISION and never a reading
//     of what the marks are (a notation decided is no name to offer: `choice(…, { reading: false })`);
//   * only an answer the seat was sure of (`DECIDER_TAKE_AT`, on the lead) is held, and only a held decision is
//     acted on: `mermaidFor` (`tools/mermaid.ts`) and the routing tool's `diagramOf` (`tools/route.ts`) then read
//     the marks as the notation decided — from among the readings the engine computed, never one it did not —
//     so *Make it Mermaid* and (where the connectors are tied) *Tidy the diagram* are offered after it;
//   * it is offered for two marks or more, none an artifact and matching no definition, when the likeliest notation is above
//     `NOTATION_OFFER_FROM` and under `NOTATION_FLOOR` and the marks are a graph of nodes joined by lines (never the
//     molecule's circles), or when the top two clear the floor within `TIE_MARGIN` of each other — and not again for
//     marks a decision already holds for. Registered last (`builtin.ts`), so the field's order before it stands.
//
// Derived: what is decided is the log's (the decision rep), and an undo takes it back.

import type { SessionState } from '../session/session';
import { wordOf } from '../session/nodes';
import { NOTATION_FLOOR, describeNotation, notationsOf } from '../notations/notation';
import type { NotationReading } from '../notations/notation';
import { DIAGRAM_NOTATION, readPlainDiagram } from '../notations/diagram';
import { choice, leadOf, DECIDER_TAKE_AT, NO_MATCH, type ChoiceQuestion, type DecisionAnswer, type DecisionCandidate, type DecisionQuestion } from '../participants/decide';
import { TIE_MARGIN } from './which';
import type { Tool } from './tool';

/** The least the likeliest notation must read for the drawing to be worth asking about: under it, nothing reads it as a diagram at all. */
export const NOTATION_OFFER_FROM = 0.15;
/** A notation decision's question id begins so; its `about` names the marks it was asked about. */
export const NOTATION_QUESTION = 'notation:';
/** What a plain diagram is, said to the seat. */
const PLAIN_WORDS = 'a plain diagram — boxes or shapes joined by lines, no notation in particular (written as a flowchart with no direction)';

/** The question asked: which of these kinds of diagram the marks are, none of these among them — a decision, never a reading. */
export function notationQuestion(ids: readonly string[], candidates: readonly DecisionCandidate[]): ChoiceQuestion {
  return choice(NOTATION_QUESTION + (ids[0] ?? ''), 'which kind of diagram is this drawing?', candidates.slice(), ids.slice(), { reading: false });
}

/**
 * The notations a held decision may name for these marks, with their words: the readings over 0 and a plain diagram
 * where it is one. `known`: the readings and the plain diagram already read, so nothing is read twice.
 */
export function notationCandidates(
  state: SessionState,
  ids: readonly string[],
  known?: { readings: readonly NotationReading[]; plain: NotationReading | null }
): DecisionCandidate[] {
  const out: DecisionCandidate[] = (known ? known.readings : notationsOf(state, ids))
    .filter((r) => r.notation !== DIAGRAM_NOTATION && r.confidence > 0)
    .map((r) => ({ id: r.notation, text: describeNotation(r) }));
  if (known ? known.plain : readPlainDiagram(state, ids)) out.push({ id: DIAGRAM_NOTATION, text: PLAIN_WORDS });
  return out;
}

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));

/**
 * The notation a decision holds for exactly these marks, and how surely, and who said it — the latest decision held
 * on any of them whose question was about this very set, that led by `DECIDER_TAKE_AT` and picked something other
 * than none of these. Null when none does.
 */
export function decidedNotationOf(state: SessionState, ids: readonly string[]): { notation: string; lead: number; by: string } | null {
  const scope = [...new Set(ids)].filter((id) => state.nodes.has(id));
  if (scope.length < 2) return null;
  let found: { notation: string; lead: number; by: string } | null = null;
  for (const id of scope) {
    for (const rep of state.nodes.get(id)!.reps) {
      if (rep.modality !== 'decision') continue;
      const data = rep.data as { question?: DecisionQuestion; answer?: DecisionAnswer } | undefined;
      const q = data?.question, a = data?.answer;
      if (!q || !a || q.kind !== 'choice' || a.kind !== 'choice' || !q.id.startsWith(NOTATION_QUESTION)) continue;
      if (!sameSet(q.about ?? [], scope)) continue;
      const lead = leadOf(a);
      if (!a.pick || a.pick === NO_MATCH || lead < DECIDER_TAKE_AT) continue;
      const who = rep.source ? state.nodes.get(rep.source) : undefined;
      found = { notation: a.pick, lead, by: (who && wordOf(who)) || 'the decider' };
    }
  }
  return found;
}

/** The engine's own reading of these marks in the notation a held decision names, with the decision — or null. */
export function readingDecided(state: SessionState, ids: readonly string[]): { reading: NotationReading; decided: { notation: string; lead: number; by: string } } | null {
  const decided = decidedNotationOf(state, ids);
  if (!decided) return null;
  const reading = decided.notation === DIAGRAM_NOTATION
    ? readPlainDiagram(state, ids)
    : notationsOf(state, ids).find((r) => r.notation === decided.notation) ?? null;
  return reading ? { reading, decided } : null;
}

/** A decision, said after a reading's reason: "— Clef-flash says it is one (0.99)". */
export function decidedWords(d: { lead: number; by: string }): string {
  return `${d.by} says it is one (${d.lead.toFixed(2)})`;
}

export const WHICH_NOTATION: Tool = {
  id: 'which-notation',
  name: 'which diagram',
  describe: () => 'when no notation reads a drawing surely, or two read it about equally, ask the decider which kind of diagram it is — held only when it is sure, and then the drawing has Mermaid and tidying',
  asks: 'model',
  offers(scope) {
    const decider = scope.host.decider;
    const s = scope.state;
    if (!decider || scope.marks.length < 2) return [];
    if (scope.marks.some((id) => s.artifacts.includes(id))) return [];
    // A group a definition matches is that thing (a molecule is its own thing): *Which is it?* is its question, not this.
    if (scope.summon.suggestions.some((x) => x.kind === 'match')) return [];
    if (decidedNotationOf(s, scope.marks)) return [];
    // The costly part, read once: the field's other diagram tools read the same marks in the same offering
    // (`keepingNotations`, so this is theirs), and the plain diagram only when nothing clears the floor.
    const readings = notationsOf(s, scope.marks);
    const top = readings[0];
    if (!top || !(top.confidence > NOTATION_OFFER_FROM)) return [];
    const under = top.confidence < NOTATION_FLOOR;
    const tie = !under && readings.length > 1 && top.confidence - readings[1].confidence <= TIE_MARGIN;
    if (!under && !tie) return [];
    // Under the floor, only a graph of nodes joined by lines is worth the question — never the molecule's circles,
    // which are their own thing (and with a decider seated by default, a question on every molecule is noise).
    const plain = readPlainDiagram(s, scope.marks);
    if (!tie && !plain) return [];
    const candidates = notationCandidates(s, scope.marks, { readings, plain });
    if (!candidates.length) return [];
    return [{
      key: 'which-notation',
      label: 'Which diagram is this?',
      reason: (under ? `no notation reads it surely (${describeNotation(top)})` : `${candidates.slice(0, 2).map((c) => c.id).join(' and ')} read it about equally`) +
        ` — asks ${decider.name} which kind of diagram it is, sending it the words of these marks; held only when it is sure, and then it has Mermaid`,
      base: 0.6,
      tool: 'which-notation',
      asks: 'model',
      verbs: ['which diagram', 'what diagram', 'which notation', 'what kind of diagram'],
      data: { ids: scope.marks.slice(), candidates },
    }];
  },
  take: () => ({ host: 'which-notation' }),
};

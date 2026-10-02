// Which is it? (V1-PLAN I7, PLAN-IPAD-NOTES §3: the *decider* seat's first job). The library's matches
// for a held group are ranked by a signature's score, and two definitions can match about equally — a
// circle with two lines is a molecule and a compound both, drawn the same. The engine holds both, in
// order, and says so; a decision model, when one sits in the decider seat, can be ASKED to choose
// between exactly those (with *none of these* among them), and its answer stands as one more held,
// attributed reading beside the engine's — never in its place, and taken only at DECIDER_TAKE_AT.
//
// It is an offer, not an automatic act: asking a model is deliberate (§6.3 — *nothing on draw, nothing
// on summon, nothing on join*), so the pill carries the dot and Enter never takes it with nothing typed
// unless the hand chose it. Offered only when a decider is seated (`host.decider`) and the top two
// matches are within `TIE_MARGIN`; the asking is the host's.

import type { Tool } from './tool';

/** How close the second match's score must come to the first's for the two to be a tie worth asking about. */
export const TIE_MARGIN = 0.05;

/** A library match as the summon's suggestions say it. */
export interface TiedMatch { artifactId: string; name: string; score: number; reasoning: string; pack?: string }

/** The matches within `TIE_MARGIN` of the top, the top first — one alone is no tie; the rest are not asked about. */
export function tiedMatches<M extends { score: number }>(matches: readonly M[], margin: number = TIE_MARGIN): M[] {
  if (!matches.length) return [];
  const top = Math.max(...matches.map((m) => m.score));
  return matches.filter((m) => top - m.score <= margin);
}

export const WHICH: Tool = {
  id: 'which',
  name: 'which is it',
  describe: () => 'when two definitions match a group about equally, ask the decider which — its answer joins the readings, held, and is taken only when it is sure',
  asks: 'model',
  offers(scope) {
    const decider = scope.host.decider;
    if (!decider || !scope.marks.length) return [];
    const matches = scope.summon.suggestions
      .filter((s) => s.kind === 'match')
      .map((s) => ({ artifactId: s.artifactId ?? s.id, name: s.label, score: s.score ?? 0, reasoning: s.reasoning ?? '', ...(s.pack ? { pack: s.pack } : {}) }));
    const tied = tiedMatches(matches);
    if (tied.length < 2) return [];
    // A name may stand for two definitions (this board's and a pack's); the seat is asked about names, so each is once.
    const seen = new Set<string>();
    const candidates = tied.filter((m) => !seen.has(m.name) && !!seen.add(m.name)).map((m) => ({ id: m.name, text: m.reasoning ? `${m.name} — ${m.reasoning}` : m.name }));
    if (candidates.length < 2) return [];
    return [{
      key: 'which',
      label: 'Which is it?',
      reason: `${candidates.map((c) => c.id).join(' and ')} match about equally — asks ${decider.name} to choose; its answer joins the readings and the engine's ranking stands unless it is sure`,
      base: 0.7,
      tool: 'which',
      asks: 'model',
      verbs: ['which', 'which is it', 'decide'],
      data: { ids: scope.marks.slice(), candidates },
    }];
  },
  take: () => ({ host: 'which' }),
};

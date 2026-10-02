// Corrections: a match the hand refuses is remembered (ARCHITECTURE-v8 §13,
// WP-12). Beside every definition a group is matched to, *Not a …*: taken,
// the group's structural signature joins the definition's rejected examples,
// so a group like it is not offered as one again. A match the engine will not
// stop making is a mode, and the correction is what teaches it.

import type { Tool } from './tool';

export const CORRECT: Tool = {
  id: 'correct',
  name: 'corrections',
  describe: () => 'a match refused — Not a molecule — is remembered, and a group like it is not offered as one again',
  offers(scope) {
    return scope.summon.suggestions
      .filter((sug) => sug.kind === 'match')
      .map((sug) => ({
        key: 'not:' + sug.id,
        label: 'Not a ' + sug.label,
        reason: 'remembered — a group like this is not offered as one again',
        base: 0.5,
        tool: 'correct',
        verbs: ['not', 'not a'],
        data: { definitionId: sug.artifactId },
      }));
  },
  take(offer, scope, session, at) {
    const { definitionId } = offer.data as { definitionId: string };
    session.correct({ ids: scope.summon.enclosedIds.slice(), definitionId, verdict: 'is-not', at });
  },
};

// Naming: a word typed at marks, taken as their name (V1-PLAN L2e).
//
// Naming BLESSES: the marks become one thing, a definition the library keeps
// and the next drawing like it is offered as. Its twin, labelling (the label
// tool), puts the word on the person's own ink and makes nothing; the field
// offers the two side by side, and each says what it does and what it does
// not. The core Name button is not this tool — it stays in its slot and puts
// `name: ` in the field; this is what the typed word completes to, and what
// Enter on `name: word` takes.

import type { Session } from '../session/session';
import type { Tool } from './tool';

/** What naming is, said wherever it stands beside labelling — and in the readings that take a word as a name. */
export const NAMING_IS = 'naming makes one thing of them, a definition the library keeps and the next drawing like it is offered as; it writes no word on the ink';

/** Bless a summon's marks under a name, as this tool's act. Returns the artifact, or null. */
export function nameMarks(session: Session, summonId: string, name: string, at: number): string | null {
  return session.withTool(NAME.id, () => session.bless({ summonId, name, at }));
}

export const NAME: Tool = {
  id: 'name',
  name: 'naming',
  describe: () => 'a word typed at marks becomes their name: one thing, a definition the next drawing like it is offered as',
  offers: () => [],
  completes(scope) {
    if (!scope.word) return [];
    const q = '“' + scope.word + '”';
    return [{
      key: 'name-word',
      label: 'Name it ' + q,
      reason: q + ' as the name — ' + NAMING_IS,
      base: 0.4,
      tool: 'name',
      verbs: [],
      place: 'head' as const,
      name: scope.word,
      line: '↵ name it ' + q + ' — one thing, a definition',
      data: { word: scope.word },
    }];
  },
  take(offer, scope, session, at) {
    const { word } = offer.data as { word: string };
    return { made: nameMarks(session, scope.summon.id, word, at) };
  },
};

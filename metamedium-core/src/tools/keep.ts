// Keep as drawing: the marks left as they are — the summon's own
// suggestion taken, or the field dismissed when it has none. Typed, not a slot.

import type { Tool } from './tool';

export const KEEP: Tool = {
  id: 'keep',
  name: 'keep as drawing',
  describe: () => 'the held marks left as they are, a drawing',
  offers(scope) {
    if (!scope.marks.length) return [];
    return [{
      key: 'keep',
      label: 'Keep as drawing',
      reason: 'leave the marks as they are',
      base: 0,
      tool: 'keep',
      hidden: true,
      verbs: ['keep', 'keep as drawing'],
    }];
  },
  take(_offer, scope, session, at) {
    const sum = scope.summon;
    const keep = sum.suggestions.find((x) => x.kind === 'keep-as-drawing');
    if (keep) return { made: session.bless({ summonId: sum.id, suggestionId: keep.id, at }) };
    session.dismiss(sum.id, at);
    return {};
  },
};

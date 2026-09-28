// Tidy: marks lined up and spaced evenly, or their sizes matched — a
// concept's conversion that needs no model (tier 1). The ink is never
// touched: each mark gains a `transform` rep, and undo springs it back.

import type { Conversion } from '../concepts/concept';
import type { Tool } from './tool';
import { conversionOffers } from './concepts';

export const TIDY: Tool = {
  id: 'tidy',
  name: 'tidy',
  describe: () => 'line marks up and space them evenly, or match their sizes; the ink untouched',
  offers: (scope) => conversionOffers(scope, 'tidy'),
  take(offer, scope, session, at) {
    const { effect } = offer.data as { effect: Conversion['effect'] };
    const ids = scope.summon.enclosedIds.slice();
    if (effect.kind === 'tidy') session.tidy({ ids, mode: 'align', axis: effect.axis, at });
    else if (effect.kind === 'equalize') session.tidy({ ids, mode: 'equalize', at });
    return { detail: { mode: effect.kind, count: ids.length } };
  },
};

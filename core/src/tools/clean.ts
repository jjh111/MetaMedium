// Clean forms: a confident, unambiguous reading, redrawn from the ink's own
// measurements (session/clean.ts). The field offers to draw the held marks
// clean at once — offline, no model — and the field stays open, so the next
// offer is taken from the cleaned marks. Ink is never replaced.

import type { Tool } from './tool';
import { baseOn } from './rank';

/** "3 rectangles, 2 lines": what some snap candidates would be drawn as. */
export function shapesSummary(cands: readonly { shape: string }[]): string {
  const counts: Record<string, number> = {};
  cands.forEach((c) => { counts[c.shape] = (counts[c.shape] || 0) + 1; });
  return Object.entries(counts).map(([k, v]) => v + ' ' + k + (v === 1 ? '' : 's')).join(', ');
}

export const CLEAN: Tool = {
  id: 'clean',
  name: 'clean forms',
  describe: () => 'a confident, unambiguous reading redrawn from the ink\'s own measurements; the ink kept beneath',
  offers(scope) {
    if (scope.host.snap === 'off') return [];
    const cands = scope.session.snapCandidates(scope.summon.enclosedIds);
    if (!cands.length) return [];
    const all = cands.length === scope.summon.enclosedIds.length;
    const grounds = { on: 'clean', confidence: cands.reduce((a, o) => a + o.weight, 0) / cands.length, why: 'each reads confidently as one shape' };
    return [{
      key: 'snap',
      label: all ? 'Draw them clean' : 'Draw ' + cands.length + ' of ' + scope.summon.enclosedIds.length + ' clean',
      reason: shapesSummary(cands) + ' · ink kept',
      base: baseOn(grounds),
      tool: 'clean',
      grounds,
      verbs: ['clean', 'snap', 'draw clean'],
      data: { ids: cands.map((c) => c.id), summary: shapesSummary(cands) },
    }];
  },
  take(offer, _scope, session, at) {
    const { ids, summary } = offer.data as { ids: string[]; summary: string };
    if (ids.length) session.snap({ ids, at });
    return { detail: { ids, summary } };
  },
};

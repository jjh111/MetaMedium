// Reading the writing: the one thing sent as pixels (v7 Stage E; v10 D3, F5).
// Writing the shape rung found, unread, is offered to a model that can see —
// a line of it as one image, so the reader has the phrase; the rest one mark
// at a time. With no writing to read, any ink can still be read as writing
// on request: the rung called John's h an arc and his o a triangle. Both ask
// a model, say so, and are never taken automatically; the asking is the
// host's.

import { isWord, strokePointsOf } from '../session/nodes';
import type { Offer, Tool } from './tool';
import { isWritingMark, writingLine } from './board';

export const READ: Tool = {
  id: 'read',
  name: 'reading the writing',
  describe: () => 'writing, or any ink, handed as one image to a model that can see, and what it says held on the marks',
  asks: 'model',
  offers(scope) {
    const s = scope.state;
    const sees = scope.host.models.some((m) => m.sees);
    const unread = scope.summon.enclosedIds.filter((id) => {
      const n = s.nodes.get(id);
      return !!n && isWritingMark(n, s.nodes) && !scope.host.isRead(id);
    });
    if (unread.length) {
      const lineIds = writingLine(scope).ids;
      const line = lineIds.length >= 2 && lineIds.some((id) => unread.includes(id)) ? lineIds : [];
      const single = unread.filter((id) => !line.includes(id));
      const what = (line.length ? 'a line of ' + line.length + ' words' : '') + (line.length && single.length ? ' and ' : '') + (single.length ? single.length + ' mark' + (single.length === 1 ? '' : 's') + ' of writing' : '');
      const offer: Offer = {
        key: 'read',
        label: 'Read the writing',
        reason: what + ', unread' + (sees ? '' : ' — needs a model that can see'),
        base: 0.52,
        tool: 'read',
        asks: 'model',
        verbs: ['read'],
        data: { line, single },
      };
      return [offer];
    }
    const ink = scope.marks.filter((id) => {
      const n = s.nodes.get(id);
      return !!n && !s.artifacts.includes(id) && (!!strokePointsOf(n) || isWord(n)) && !scope.host.isRead(id);
    });
    if (!ink.length) return [];
    return [{
      key: 'read-any',
      label: 'Read as writing',
      reason: 'the ink as one image, to a model that can see — for writing the shape rung did not spot' + (sees ? '' : ' — needs a model that can see'),
      base: 0.4,
      tool: 'read',
      asks: 'model',
      verbs: ['read', 'read as writing', 'parse', 'writing'],
      data: { line: ink, single: [] },
    }];
  },
  take: () => ({ host: 'read' }),
};

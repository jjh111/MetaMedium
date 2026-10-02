// Duplicate: copy and paste in one — a copy of the held ink beside it, the
// copies selected. Typed, not a slot (the four core buttons stay four); the
// clip is the host's.

import type { Tool } from './tool';

export const DUPLICATE: Tool = {
  id: 'duplicate',
  name: 'duplicate',
  describe: () => 'a copy of the held ink beside it, selected — copy and paste in one',
  offers(scope) {
    if (!scope.marks.length) return [];
    return [{
      key: 'duplicate',
      label: 'Duplicate ' + (scope.marks.length === 1 ? 'it' : 'these'),
      reason: 'a copy of the ink beside it, selected',
      base: 0,
      tool: 'duplicate',
      hidden: true,
      verbs: ['dup', 'duplicate', 'double'],
      data: { ids: scope.marks.slice() },
    }];
  },
  take: () => ({ host: 'duplicate' }),
};

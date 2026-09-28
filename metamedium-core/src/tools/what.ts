// What is this? Every joined model reads the group, and each reading lands
// held and attributed beside the canvas's own (ARCHITECTURE-v7 §4.1). Asked
// only by this deliberate act (SURFACE-v9-PLAN §6.3); the asking is the host's.

import type { Tool } from './tool';

export const WHAT: Tool = {
  id: 'what',
  name: 'what is this',
  describe: () => 'every joined model reads the group, and its readings join the canvas\'s own, held',
  asks: 'model',
  offers(scope) {
    if (!scope.marks.length) return [];
    return [{
      key: 'what',
      label: 'What is this?',
      reason: 'every joined model reads the group; its readings join the row above' + (scope.host.models.length ? '' : ' — needs a model'),
      base: 0.36,
      tool: 'what',
      asks: 'model',
      verbs: ['what', 'what is this', '?', 'read the group'],
      data: { ids: scope.marks.slice() },
    }];
  },
  take: () => ({ host: 'what' }),
};

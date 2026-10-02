// Clocks (v8): nothing runs unblessed. A definition that can play — a
// drawing's tank, or a program — is offered its clock: *Play* it (the
// human's event that lets it run), *Pause* it, and *Reset* it to t = 0.

import { wordOf } from '../session/nodes';
import type { Offer, Tool } from './tool';
import { playableDefinitions } from './verbs';

export const CLOCKS: Tool = {
  id: 'clocks',
  name: 'clocks',
  describe: () => 'a definition that can play is played, paused or reset to where it was drawn; time is never in the log',
  offers(scope) {
    const out: Offer[] = [];
    for (const defId of playableDefinitions(scope)) {
      const n = scope.state.nodes.get(defId);
      const name = (n && wordOf(n)) || defId;
      const c = scope.state.clocks[defId];
      const playing = !!(c && c.playing);
      out.push({
        key: 'clock:' + defId,
        label: (playing ? 'Pause ' : 'Play ') + name,
        reason: playing ? 'hold every ' + name + ' where it is' : 'let every ' + name + ' move',
        base: 0.56,
        tool: 'clocks',
        verbs: playing ? ['pause', 'stop', 'hold'] : ['play', 'run', 'start', 'go'],
        data: { nodeId: defId, op: playing ? 'pause' : 'play' },
      });
      if (c) {
        out.push({
          key: 'reset:' + defId,
          label: 'Reset ' + name,
          reason: 'back to t = 0, where they were drawn',
          base: 0.4,
          tool: 'clocks',
          verbs: ['reset', 'rewind'],
          data: { nodeId: defId, op: 'reset' },
        });
      }
    }
    return out;
  },
  take(offer, _scope, session, at) {
    const { nodeId, op } = offer.data as { nodeId: string; op: 'play' | 'pause' | 'reset' };
    session.clock({ nodeId, op, at });
  },
};

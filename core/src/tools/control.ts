// A drawn control (ARCHITECTURE-v8 §15): a line with a dot on it reads as the
// `slider` concept, and taking its conversion makes the drawing a slider —
// blessed, with `control` code whose value is where the knob sits. Dragging
// the knob is setting the value.

import { LOCAL_PARTICIPANT } from '../session/nodes';
import type { Tool } from './tool';
import { conversionOffers } from './concepts';

export const CONTROL: Tool = {
  id: 'control',
  name: 'drawn controls',
  describe: () => 'a line with a dot on it becomes a slider: its value is where the knob sits',
  offers: (scope) => conversionOffers(scope, 'control'),
  take(_offer, scope, session, at) {
    const id = session.bless({ summonId: scope.summon.id, name: 'slider', at });
    if (!id) return { made: null };
    session.attachCode({ participantId: LOCAL_PARTICIPANT, nodeId: id, kind: 'control', code: JSON.stringify({ min: 0, max: 1 }), at: at + 1 });
    return { made: id };
  },
};

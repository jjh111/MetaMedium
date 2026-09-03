// A behaviour on a definition: a human's is blessed by the act, a model's is held.

import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import { blessedBehaviourOf, behavioursOf, LOCAL_PARTICIPANT } from './nodes';
import { rectStroke, circleStroke, checkStroke } from '../test/strokes';
import { parseBehaviour } from '../behave/words';

function definition(s: ReturnType<typeof createSession>) {
  s.addStroke(rectStroke(100, 100, 200, 120), 1000);
  s.addStroke(circleStroke(200, 160, 200), 2000);
  s.addStroke(checkStroke(420, 150), 3000);
  return s.bless({ summonId: s.getState().summon!.id, name: 'A', at: 4000 })!;
}

describe('behave', () => {
  it('a human\'s behaviour is blessed by the act; a model\'s is held until a human gives it', () => {
    const s = createSession();
    const id = definition(s);
    const model = s.join('agent', 'llm:x', 4500, 1);
    const b = parseBehaviour('flees anything bigger').behaviour!;
    s.behave({ nodeId: id, behaviour: b, participantId: model, at: 5000 });
    let node = s.getState().nodes.get(id)!;
    expect(behavioursOf(node)).toHaveLength(1);
    expect(blessedBehaviourOf(node)).toBeUndefined();
    s.behave({ nodeId: id, behaviour: b, participantId: LOCAL_PARTICIPANT, at: 6000 });
    node = s.getState().nodes.get(id)!;
    expect(blessedBehaviourOf(node)?.terms).toEqual(b.terms);
    expect(behavioursOf(node)).toHaveLength(2);
    s.undo();
    expect(blessedBehaviourOf(s.getState().nodes.get(id)!)).toBeUndefined();
  });

  it('a behaviour lands only on an artifact, and an empty one lands nowhere', () => {
    const s = createSession();
    const id = definition(s);
    s.behave({ nodeId: 'stroke:1', behaviour: { terms: [{ verb: 'wander', weight: 1 }] }, at: 5000 });
    expect(behavioursOf(s.getState().nodes.get('stroke:1')!)).toHaveLength(0);
    s.behave({ nodeId: id, behaviour: { terms: [] }, at: 5100 });
    expect(behavioursOf(s.getState().nodes.get(id)!)).toHaveLength(0);
  });
});

// What a model is sent of a slice of the board (`describeSession` with `nodeIds`): in a room the board holds other
// people's things, and a question about these marks — What is this?, a question asked of them — sends what bears on
// them, to the person's own model or to dyna.ink's alike. Pinned here: the names it lists are this hand's own and those
// of what the marks asked about are part of, never another hand's thing elsewhere on the board; who is in the room is
// never said; and a relation is said only between marks asked about.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import { circleStroke, rectStroke } from '../test/strokes';
import { mergeLogs } from '../store/merge';
import { describeSession } from './serialize';

function room() {
  const alice = createSession();
  alice.setLogName('Alice Kowalski~a1');
  alice.import({ kind: 'text', path: 'acme.txt', name: 'Acme acquisition — confidential', bounds: { minX: 2000, minY: 2000, maxX: 2400, maxY: 2100 }, code: 'terms', at: 1000 });
  const theirs = alice.addStroke(rectStroke(250, 110, 120, 80), 1010);
  const bob = createSession();
  bob.setLogName('bob~b1');
  bob.import({ kind: 'text', path: 'mine.txt', name: 'my vocabulary', bounds: { minX: 3000, minY: 2000, maxX: 3400, maxY: 2100 }, code: 'mine', at: 1020 });
  const mine = bob.addStroke(circleStroke(200, 140, 40), 1030);
  bob.load(mergeLogs({ 'bob~b1': bob.getEvents(), 'Alice Kowalski~a1': alice.getEvents() }, { me: 'bob~b1' }));
  return { bob, mine, theirs };
}

describe('a slice of the board, as a model is sent it', () => {
  it('names this hand’s own things and never another hand’s elsewhere on the board — and says nobody in the room', () => {
    const { bob, mine } = room();
    const said = describeSession(bob.getState(), { nodeIds: [mine] });
    expect(said).toContain('Known names in this session: my vocabulary');
    expect(said).not.toContain('Acme');
    expect(said).not.toMatch(/Participants:/);
    expect(said).not.toContain('Alice');
  });

  it('a relation is said only between marks asked about: one to another hand’s mark beside them is not', () => {
    const { bob, mine, theirs } = room();
    const one = describeSession(bob.getState(), { nodeIds: [mine] });
    expect(one).not.toContain(theirs);
    const both = describeSession(bob.getState(), { nodeIds: [mine, theirs] });
    expect(both).toMatch(/relations: .*stroke:/);
  });

  it('the whole board, asked of with no slice, still says every name it holds', () => {
    const { bob } = room();
    expect(describeSession(bob.getState())).toMatch(/Known names in this session: .*Acme acquisition/);
  });
});

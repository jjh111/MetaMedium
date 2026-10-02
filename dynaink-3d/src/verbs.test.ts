// The verb table, with name-resolved targets (SHARD-3D-PLAN §2.6 rule 4).
//
// The three phrases the package is measured by, and — as important — the one
// it cannot read, which must come back rather than be guessed at.

import { describe, it, expect } from 'vitest';
import { readPhrase, isUnread, describePhrase, namesIn, type PhraseScope, type NameRef } from './verbs';
import { COLOUR_WORDS } from './op';

const NAMES: NameRef[] = [
  { name: 'castle', stepIds: ['step:2'], solidId: 'artifact:5' },
  { name: 'turret', stepIds: ['step:3', 'step:5'], solidId: 'artifact:5' },
  { name: 'top', stepIds: ['step:4', 'step:6'], solidId: 'artifact:5' },
];

const scope: PhraseScope = { names: NAMES, colours: Object.keys(COLOUR_WORDS) };

describe('a noun resolves against the names in play, singular or plural', () => {
  it('“the turrets” is the name “turret”', () => {
    expect(namesIn('make the turrets taller', NAMES).map((n) => n.name)).toEqual(['turret']);
  });

  it('“the tops” is the name “top”', () => {
    expect(namesIn('the tops are red', NAMES).map((n) => n.name)).toEqual(['top']);
  });

  it('a word that names nothing here resolves to nothing', () => {
    expect(namesIn('make the towers taller', NAMES)).toEqual([]);
  });
});

describe('the three phrases', () => {
  it('*make the turrets taller* is a regen scoped to the steps named turret', () => {
    const r = readPhrase('make the turrets taller', scope);
    expect(isUnread(r)).toBe(false);
    if (isUnread(r) || !r) throw new Error('unread');
    expect(r.verb).toBe('regen');
    expect(r.names).toEqual(['turret']);
    expect(r.stepIds).toEqual(['step:3', 'step:5']);
    expect(r.change).toBe('taller');
    expect(r.solidId).toBe('artifact:5');
    expect(describePhrase(r)).toBe('regen turret — taller · 2 steps');
  });

  it('*remove the turret* is a drop — tier 1, a version without those steps', () => {
    const r = readPhrase('remove the turret', scope);
    if (isUnread(r) || !r) throw new Error('unread');
    expect(r.verb).toBe('drop');
    expect(r.stepIds).toEqual(['step:3', 'step:5']);
    expect(r.reasoning).toMatch(/tier 1/);
  });

  it('*the tops are red* is a paint — tier 1, the material on those steps', () => {
    const r = readPhrase('the tops are red', scope);
    if (isUnread(r) || !r) throw new Error('unread');
    expect(r.verb).toBe('paint');
    expect(r.colour).toBe('red');
    expect(r.stepIds).toEqual(['step:4', 'step:6']);
    expect(describePhrase(r)).toBe('paint top red · 2 steps');
  });

  it('*make the tops green* is the same paint, said the other way', () => {
    const r = readPhrase('make the tops green', scope);
    if (isUnread(r) || !r) throw new Error('unread');
    expect(r.verb).toBe('paint');
    expect(r.colour).toBe('green');
  });

  it('*get rid of the castle* is the same drop, said the other way', () => {
    const r = readPhrase('get rid of the castle', scope);
    if (isUnread(r) || !r) throw new Error('unread');
    expect(r.verb).toBe('drop');
    expect(r.names).toEqual(['castle']);
  });
});

describe('what the table cannot read is RETURNED, not dropped', () => {
  it('a phrase with a name in it and no verb the table knows comes back whole', () => {
    const r = readPhrase('the turrets should feel more medieval', scope);
    expect(isUnread(r)).toBe(true);
    if (!isUnread(r)) throw new Error('read');
    expect(r.unread).toBe('the turrets should feel more medieval');
    expect(r.reasoning).toMatch(/“turret” \(2 steps\) is a name this space knows/);
    expect(r.reasoning).toMatch(/nothing in “.*” says what to do with it/);
  });

  it('a phrase with NO name in it is not a phrase over names at all — it is a brief', () => {
    expect(readPhrase('a castle with green turret tops', { names: [], colours: [] })).toBeNull();
    expect(readPhrase('a lighthouse on a rock', scope)).toBeNull();
  });

  it('nothing typed reads as nothing', () => {
    expect(readPhrase('   ', scope)).toBeNull();
  });
});

describe('a way of saying it, taught once and held in the log', () => {
  it('beats the table’s own guess, and says it was taught', () => {
    const taught: PhraseScope = {
      ...scope,
      taught: [{ phrase: 'beef up the turrets', verb: 'regen', target: 'turret' }],
    };
    const r = readPhrase('beef up the turrets', taught);
    if (isUnread(r) || !r) throw new Error('unread');
    expect(r.verb).toBe('regen');
    expect(r.stepIds).toEqual(['step:3', 'step:5']);
    expect(r.reasoning).toMatch(/a way you have already said regen — taught once, held in the log, replayed/);
  });

  it('without the teaching, that same phrase comes back unread', () => {
    expect(isUnread(readPhrase('beef up the turrets', scope))).toBe(true);
  });
});

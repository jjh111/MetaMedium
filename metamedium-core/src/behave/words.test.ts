// Words into verbs: the common phrasings need no model; what cannot be read is said.
// Targets are whatever the clause names — the table knows no name of its own.

import { describe, it, expect } from 'vitest';
import { parseBehaviour, parseClause, describeBehaviour, behaviourSource, clausesOf, singular } from './words';

describe('words into verbs', () => {
  it('three clauses become three terms, each with its words as reasoning', () => {
    const p = parseBehaviour('swims toward food, flees anything bigger, hides in coral');
    expect(p.terms.map((t) => [t.verb, t.target, t.params?.only])).toEqual([
      ['seek', 'food', undefined],
      ['flee', '*', 'bigger'],
      ['home', 'coral', undefined],
    ]);
    expect(p.terms[1].reasoning).toBe('from “flees anything bigger”');
    expect(p.unparsed).toEqual([]);
    expect(p.behaviour?.source).toBe('words');
    expect(p.reasoning).toMatch(/3 of 3 clauses/);
  });

  it('a clause the table cannot read is reported, not dropped, and the rest still parses', () => {
    const p = parseBehaviour('wanders slowly and photosynthesises at noon');
    expect(p.terms.map((t) => [t.verb, t.weight])).toEqual([['wander', 0.5]]);
    expect(p.unparsed).toEqual(['photosynthesises at noon']);
    expect(p.reasoning).toMatch(/could not read: “photosynthesises at noon”/);
    expect(parseBehaviour('glows').behaviour).toBeNull();
    expect(parseBehaviour('').reasoning).toBe('nothing written');
  });

  it('the longest phrase wins, so "swims away from" is flee, not seek', () => {
    expect(parseClause('swims away from the big ones')?.verb).toBe('flee');
    expect(parseClause('swims toward the light')?.verb).toBe('seek');
    expect(parseClause('swims around')?.verb).toBe('wander');
  });

  it('targets are singular nouns with articles stripped; pace and size are modifiers', () => {
    const t = parseClause('quickly chases the smaller fishes')!;
    expect(t.verb).toBe('seek');
    expect(t.target).toBe('fish');
    expect(t.weight).toBe(1.5);
    expect(t.params?.only).toBe('smaller');
    expect(singular('bubbles')).toBe('bubble');
    expect(singular('jellies')).toBe('jelly');
    expect(singular('grass')).toBe('grass');
    expect(parseClause('drifts upward')?.params?.direction).toBe('up');
  });

  it('clauses split on punctuation and joining words', () => {
    expect(clausesOf('Eats plankton; then rests in the weeds and drifts.')).toEqual(['eats plankton', 'rests in the weeds', 'drifts']);
  });

  it('a behaviour reads back in words and as source under the js contract', () => {
    const p = parseBehaviour('seeks food, flees anything bigger, wanders a little');
    expect(describeBehaviour(p.behaviour!)).toBe('seek food · flee anything bigger · wander (0.50)');
    const src = behaviourSource(p.behaviour!);
    expect(src).toMatch(/^\/\/ steer\(world\)/);
    expect(src).toMatch(/seek\("food", 1\)/);
    expect(src).toMatch(/flee\("\*", 1, \{"only":"bigger"\}\)/);
    expect(src).toMatch(/wander\(0\.5\)/);
    expect(src).toMatch(/\/\/ from “wanders a little”/);
  });
});

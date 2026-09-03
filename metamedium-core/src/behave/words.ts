// Words into verbs: what a label says, mapped onto the closed basis.
//
// "swims toward food, flees anything bigger, hides in coral" is three
// clauses, each a verb from the table with a target the world will supply
// by name. This is Tier 0 — a table of the ways people say each verb — so
// the common phrasing needs no model at all, and a model is asked only for
// clauses the table could not read. Every term carries the words it came
// from as its reasoning; what could not be read is returned, not dropped,
// so the surface can say so.
//
// Nothing here knows any name. A target is whatever noun the clause points
// at; whether anything on the canvas is called that is the tank's business.

import type { Behaviour, Term, Verb } from './verbs';
import { TARGETED, VERBS } from './verbs';

/** The ways each verb is said. Longer phrases are matched first. */
export const PHRASES: Record<Verb, readonly string[]> = {
  seek: ['swim toward', 'swims toward', 'swim towards', 'swims towards', 'go to', 'goes to', 'head for', 'heads for', 'move toward', 'moves toward', 'seek', 'seeks', 'chase', 'chases', 'follow', 'follows', 'hunt', 'hunts', 'approach', 'approaches', 'toward', 'towards'],
  flee: ['run from', 'runs from', 'swim away from', 'swims away from', 'run away from', 'runs away from', 'flee from', 'flees from', 'flee', 'flees', 'escape', 'escapes', 'fear', 'fears', 'afraid of', 'scared of', 'away from'],
  home: ['hide in', 'hides in', 'hide among', 'hides among', 'shelter in', 'shelters in', 'live in', 'lives in', 'rest in', 'rests in', 'return to', 'returns to', 'go home to', 'goes home to', 'home to', 'home'],
  school: ['school with', 'schools with', 'flock with', 'flocks with', 'swim with', 'swims with', 'stay with', 'stays with', 'group with', 'groups with', 'school', 'schools', 'flock', 'flocks'],
  hold: ['stay put', 'stays put', 'stay still', 'stays still', 'keep to', 'keeps to', 'hold position', 'holds position', 'stay where', 'stays where', 'hold', 'holds'],
  avoid: ['steer clear of', 'steers clear of', 'keep away from', 'keeps away from', 'avoid', 'avoids', 'dodge', 'dodges'],
  consume: ['feed on', 'feeds on', 'eat', 'eats', 'consume', 'consumes', 'devour', 'devours'],
  spawn: ['spawn', 'spawns', 'give off', 'gives off', 'release', 'releases', 'emit', 'emits'],
  drift: ['drift', 'drifts', 'float', 'floats', 'rise', 'rises', 'sink', 'sinks', 'fall', 'falls'],
  expire: ['die', 'dies', 'expire', 'expires', 'vanish', 'vanishes', 'disappear', 'disappears', 'fade', 'fades'],
  wander: ['wander', 'wanders', 'roam', 'roams', 'meander', 'meanders', 'explore', 'explores', 'swim around', 'swims around', 'swim about', 'swims about', 'mill about', 'mills about', 'move around', 'moves around'],
};

const ARTICLES = new Set(['the', 'a', 'an', 'any', 'anything', 'everything', 'all', 'other', 'others', 'every', 'some', 'its', 'their', 'nearby', 'near', 'nearest', 'closest']);
const STOP = new Set(['and', 'then', 'while', 'but', 'when', 'until', 'so', 'or']);

/** Modifiers the clause may carry: size qualifiers and pace. */
function modifiers(words: string[]): { only?: 'bigger' | 'smaller'; weight: number; direction?: string } {
  let only: 'bigger' | 'smaller' | undefined;
  let weight = 1;
  let direction: string | undefined;
  for (const w of words) {
    if (w === 'bigger' || w === 'larger' || w === 'big' || w === 'large') only = 'bigger';
    if (w === 'smaller' || w === 'little' || w === 'small' || w === 'tiny') only = 'smaller';
    if (w === 'slowly' || w === 'gently' || w === 'a' || w === 'little') weight = Math.min(weight, 0.5);
    if (w === 'quickly' || w === 'fast' || w === 'hard' || w === 'always') weight = Math.max(weight, 1.5);
    if (w === 'up' || w === 'upward' || w === 'upwards') direction = 'up';
    if (w === 'down' || w === 'downward' || w === 'downwards') direction = 'down';
  }
  return { only, weight, direction };
}

export interface ParsedBehaviour {
  behaviour: Behaviour | null;
  terms: Term[];
  /** Clauses the table could not read, verbatim. */
  unparsed: string[];
  reasoning: string;
}

/** Split into clauses on commas, semicolons, full stops and joining words. */
export function clausesOf(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[“”"']/g, '')
    .split(/[,;.\n]+|\b(?:and|then|while|but)\b/)
    .map((c) => c.trim())
    .filter(Boolean);
}

/** One clause → one term, or null. The longest matching phrase wins; the words after it are the target. */
export function parseClause(clause: string): Term | null {
  const c = ' ' + clause.replace(/\s+/g, ' ').trim() + ' ';
  let best: { verb: Verb; phrase: string; at: number } | null = null;
  for (const verb of VERBS) {
    for (const phrase of PHRASES[verb]) {
      const at = c.indexOf(' ' + phrase + ' ');
      if (at < 0) continue;
      if (!best || phrase.length > best.phrase.length || (phrase.length === best.phrase.length && at < best.at)) best = { verb, phrase, at };
    }
  }
  if (!best) return null;
  const before = c.slice(0, best.at).trim().split(' ').filter(Boolean);
  const afterWords = c.slice(best.at + best.phrase.length + 2).trim().split(' ').filter(Boolean);
  const mods = modifiers([...before, ...afterWords]);
  // The target: the words after the phrase up to a stop word, minus articles and qualifiers.
  const targetWords: string[] = [];
  for (const w of afterWords) {
    if (STOP.has(w)) break;
    if (ARTICLES.has(w) || w === 'bigger' || w === 'larger' || w === 'smaller' || w === 'big' || w === 'large' || w === 'small' || w === 'little' || w === 'tiny' || w === 'slowly' || w === 'quickly' || w === 'fast' || w === 'gently' || w === 'hard' || w === 'always' || w === 'than' || w === 'it' || w === 'itself' || w === 'them') continue;
    targetWords.push(w);
  }
  const term: Term = { verb: best.verb, weight: mods.weight, reasoning: `from “${clause.trim()}”` };
  if (TARGETED.has(best.verb)) {
    if (targetWords.length) term.target = singular(targetWords.join(' '));
    else if (mods.only) term.target = '*';
  }
  const params: Record<string, number | string> = {};
  if (mods.only && (best.verb === 'flee' || best.verb === 'seek' || best.verb === 'avoid' || best.verb === 'consume')) params.only = mods.only;
  if (mods.direction && best.verb === 'drift') params.direction = mods.direction;
  if (Object.keys(params).length) term.params = params;
  return term;
}

/** "fishes" → "fish", "bubbles" → "bubble": names are matched singular, the way a definition is named. */
export function singular(word: string): string {
  if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y';
  if (word.endsWith('shes') || word.endsWith('ches') || word.endsWith('xes') || word.endsWith('sses')) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) return word.slice(0, -1);
  return word;
}

/** The whole text: every clause the table can read becomes a term; the rest is reported. */
export function parseBehaviour(text: string): ParsedBehaviour {
  const clauses = clausesOf(text);
  const terms: Term[] = [];
  const unparsed: string[] = [];
  for (const c of clauses) {
    const t = parseClause(c);
    if (t) terms.push(t); else unparsed.push(c);
  }
  const reasoning = terms.length
    ? `${terms.length} of ${clauses.length} clause${clauses.length === 1 ? '' : 's'} read as verbs` + (unparsed.length ? `; could not read: ${unparsed.map((u) => `“${u}”`).join(', ')}` : '')
    : clauses.length ? 'no clause names a verb the tank knows' : 'nothing written';
  return {
    behaviour: terms.length ? { terms, source: 'words' } : null,
    terms,
    unparsed,
    reasoning,
  };
}

/** A behaviour in words: "seek food · flee anything bigger (0.8) · wander". */
export function describeBehaviour(b: Behaviour): string {
  return b.terms.map((t) => {
    const only = typeof t.params?.only === 'string' ? ` ${t.params.only}` : '';
    const target = t.target ? ` ${t.target === '*' ? 'anything' : t.target}${only}` : '';
    const w = Math.abs(t.weight - 1) > 1e-6 ? ` (${t.weight.toFixed(2)})` : '';
    return `${t.verb}${target}${w}`;
  }).join(' · ') || 'nothing';
}

/**
 * The behaviour as source — the ground of the ladder (words → sliders → flow
 * → code). It is the same terms written as a steer function under the js
 * contract, so a definition can be exported and run without MetaMedium.
 */
export function behaviourSource(b: Behaviour): string {
  const lines = b.terms.map((t) => {
    const args: string[] = [];
    if (t.target) args.push(JSON.stringify(t.target));
    args.push(String(+t.weight.toFixed(2)));
    if (t.params && Object.keys(t.params).length) args.push(JSON.stringify(t.params));
    return `  ${t.verb}(${args.join(', ')}),${t.reasoning ? '  // ' + t.reasoning : ''}`;
  });
  return `// steer(world): the sum of these verbs, each a force\nreturn sum(\n${lines.join('\n')}\n);`;
}

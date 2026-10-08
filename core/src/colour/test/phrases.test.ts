// The sentences a person says to make and relate kinds, read into acts (the specimen's `read`). A TEST helper:
// the field's reader belongs to KN1, which will own what a word with an article, `it's …` and `kind:` mean at the
// pen tip. These are the specimen's phrases, kept so the golden and the harmony tests can be written the way a
// person would say them. Every expectation is what the specimen's own reader said.
import { describe, it, expect } from 'vitest';
import { readPhrase } from './phrases';

const say = (a: string, word?: string) => (word === undefined ? { act: 'say', a } : { act: 'say', a, word });

describe('saying what a thing is', () => {
  it.each([
    ["it's an idea · purple", say('idea', 'purple')],
    ["It's an Idea — Purple.", say('idea', 'purple')],
    ['it is a task', say('task')],
    ['this is a note, teal', say('note', 'teal')],
    ["that's the quote and it's blue", say('quote', 'blue')],
    ["it's a box · #7b2cbf", say('box', '#7b2cbf')],
    ["it's a box - red", say('box', 'red')],
    ["it's a risk in green", say('risk', 'green')],
    ["it's a thing coloured orange", say('thing', 'orange')],
    ["“it's an idea”", say('idea')],
  ])('%s', (text, act) => {
    expect(readPhrase(text)).toEqual(act);
  });

  it.each([
    ['these are ideas', 'idea'], ['those are stories', 'story'], ["it's a fox", 'fox'], ["it's a glass", 'glass'],
    ["it's a bus", 'bus'], ["it's a church", 'church'], ["it's a wish", 'wish'],
    ["it's a lens", 'len'],            // the specimen takes an s off the end of what it does not know
  ])('takes the plural off %s → %s', (text, kind) => {
    expect(readPhrase(text)).toEqual(say(kind));
  });
});

describe('relating kinds', () => {
  it.each([
    ['insight is a kind of idea', 'sub', 'insight', 'idea'],
    ['hunches are a kind of idea', 'sub', 'hunch', 'idea'],
    ['x is a sort of y', 'sub', 'x', 'y'],
    ['x is a type of the y', 'sub', 'x', 'y'],
    ['assumption opposes evidence', 'opposes', 'assumption', 'evidence'],
    ['a contradicts b', 'opposes', 'a', 'b'],
    ['a is opposed to b', 'opposes', 'a', 'b'],
    ['risk vs opportunity', 'opposes', 'risk', 'opportunity'],
    ['risk vs. opportunity', 'opposes', 'risk', 'opportunity'],
    ['risk versus opportunity', 'opposes', 'risk', 'opportunity'],
    ['risk against opportunity', 'opposes', 'risk', 'opportunity'],
    ['ideas oppose tasks', 'opposes', 'idea', 'task'],
    ['question is kin to idea', 'kin', 'question', 'idea'],
    ['question is like idea', 'kin', 'question', 'idea'],
    ['question is related to idea', 'kin', 'question', 'idea'],
    ['question is near idea', 'kin', 'question', 'idea'],
    ['question is akin to idea', 'kin', 'question', 'idea'],
    ['method relates to note', 'kin', 'method', 'note'],
    ['method goes with note', 'kin', 'method', 'note'],
    ['questions are kin to ideas', 'kin', 'question', 'idea'],
  ])('%s', (text, act, a, b) => {
    expect(readPhrase(text)).toEqual({ act, a, b });
  });
});

describe('giving a kind a colour', () => {
  it.each([
    ['make idea yellow', 'idea', 'yellow'],
    ['colour idea teal', 'idea', 'teal'],
    ['color idea #abc', 'idea', '#abc'],
    ['idea is green', 'idea', 'green'],
    ['idea yellow', 'idea', 'yellow'],
    ['ideas are red', 'idea', 'red'],
  ])('%s', (text, a, word) => {
    expect(readPhrase(text)).toEqual(say(a, word));
  });

  it.each([
    ['kind: risk', say('risk')],
    ['kind risk', say('risk')],
    ['new kind risk · red', say('risk', 'red')],
    ['new kind risk, #ff0000', say('risk', '#ff0000')],
    ['kind: risk · nothing', say('risk', 'nothing')],     // read as a word; the space then says it is no colour
  ])('%s', (text, act) => {
    expect(readPhrase(text)).toEqual(act);
  });
});

describe('what it does not read', () => {
  it.each(['make idea banana', 'risk opportunity', 'hello', 'blue', 'draw a box', '', '   ', "it's", 'it’s an idea'])('%j', text => {
    expect(readPhrase(text)).toBeNull();
  });
});

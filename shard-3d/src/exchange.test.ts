// The transcript: what it records, what it keeps, and how an exchange ends.
//
// G0's third fault was that a model was reached and nothing said what came
// back. These tests pin the two halves of the fix: **every attempt leaves a
// row**, including the ones that never reach a model, and **the reply is kept
// verbatim** rather than summarised into a number.

import { describe, expect, it } from 'vitest';
import { createTranscript, describeExchange, KEEP } from './exchange';

describe('the transcript records an exchange', () => {
  it('a row stands the moment a model is asked, before anything comes back', () => {
    const t = createTranscript();
    t.asked({ who: 'glm', what: 'the brief', words: 'castle with green tops', brief: 'THE SPACE…', at: 1000 });
    const [ex] = t.all();
    expect(ex.who).toBe('glm');
    expect(ex.outcome).toBe('asking');
    expect(ex.ms).toBeUndefined();
    // A model still thinking is already a row — which is exactly what the first
    // board did not have.
    expect(describeExchange(ex)).toContain('asking…');
  });

  it('keeps the reply as it was RECEIVED, not as it was repaired', () => {
    const t = createTranscript();
    const raw = '```json\n{"steps":[{"id":"s1","op":"extrude"},]}\n```';
    const id = t.asked({ who: 'qwen3:8b', what: 'the brief', words: 'a mug', brief: 'B' });
    t.came(id, { reply: raw, parsed: { steps: 1, profiles: 0 }, dropped: ['the extrude s1 names no profile'] });
    t.ended(id, 'refused', 'nothing in the reply could be built here');
    const [ex] = t.all();
    // The fences and the trailing comma are still there: what a model actually
    // wrote is the evidence, and a tidied copy is the shard's account of it.
    expect(ex.reply).toBe(raw);
    expect(ex.parsed).toEqual({ steps: 1, profiles: 0 });
    expect(ex.dropped).toEqual(['the extrude s1 names no profile']);
    expect(ex.outcome).toBe('refused');
    expect(ex.reason).toContain('could be built');
  });

  it('times an exchange from asked to ended', () => {
    const t = createTranscript();
    const id = t.asked({ who: 'glm', what: 'the brief', words: 'x', brief: 'B', at: 5_000 });
    t.ended(id, 'applied', '3 steps applied', 7_400);
    expect(t.all()[0].ms).toBe(2400);
    expect(describeExchange(t.all()[0])).toContain('2.4 s');
  });

  it('records an exchange that never reached a model at all', () => {
    const t = createTranscript();
    t.refused({ who: 'nobody', what: 'the brief', words: 'a castle', reason: 'no model has joined' });
    const [ex] = t.all();
    expect(ex.outcome).toBe('refused');
    expect(ex.brief).toBe('');
    expect(ex.reply).toBeUndefined();
    expect(ex.reason).toContain('no model');
  });

  it('a reuse is what parsed, and says so', () => {
    const t = createTranscript();
    const id = t.asked({ who: 'glm', what: 'the brief', words: 'another mug', brief: 'B' });
    t.came(id, { reply: '{"reuse":"mug"}', parsed: { steps: 0, profiles: 0, reuse: 'mug' } });
    t.ended(id, 'applied', 'placed from the library, not written');
    expect(t.all()[0].parsed?.reuse).toBe('mug');
  });
});

describe('what it keeps', () => {
  it('keeps the last N and drops the oldest, newest first', () => {
    const t = createTranscript(3);
    for (const n of [1, 2, 3, 4, 5]) t.asked({ who: 'm', what: 'the brief', words: `w${n}`, brief: 'B' });
    const all = t.all();
    expect(all).toHaveLength(3);
    expect(all.map((e) => e.words)).toEqual(['w5', 'w4', 'w3']);
  });

  it('the default cap is the named constant, not a number written twice', () => {
    const t = createTranscript();
    for (let n = 0; n < KEEP + 4; n++) t.asked({ who: 'm', what: 'the brief', words: String(n), brief: 'B' });
    expect(t.all()).toHaveLength(KEEP);
  });

  it('an exchange that has fallen off the end takes no later call with it', () => {
    const t = createTranscript(2);
    const first = t.asked({ who: 'm', what: 'the brief', words: 'a', brief: 'B' });
    t.asked({ who: 'm', what: 'the brief', words: 'b', brief: 'B' });
    t.asked({ who: 'm', what: 'the brief', words: 'c', brief: 'B' });
    // A slow model answering about an exchange the cap has dropped must not
    // throw — the board knows nothing about how long a call takes.
    expect(() => t.came(first, { reply: 'late' })).not.toThrow();
    expect(() => t.ended(first, 'applied', 'late')).not.toThrow();
    expect(t.all().map((e) => e.words)).toEqual(['c', 'b']);
  });

  it('clear forgets everything', () => {
    const t = createTranscript();
    t.asked({ who: 'm', what: 'the brief', words: 'a', brief: 'B' });
    t.clear();
    expect(t.all()).toEqual([]);
  });
});

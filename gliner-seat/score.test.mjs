import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchItem, scoreItems } from './score.mjs';

const item = {
  id: 'b',
  text: 'B. Top to waist 20',
  spans: [
    { label: 'measurement name', text: 'Top to waist', start: 3, end: 15 },
    { label: 'quantity', text: '20', start: 16, end: 18 },
  ],
  ignore: [{ text: 'B', start: 0, end: 1, why: 'a letter key' }],
};
const p = (label, start, end, score = 0.9) => ({ label, text: item.text.slice(start, end), start, end, score });

test('strict: same kind, same place, exactly', () => {
  const m = matchItem(item, [p('measurement name', 3, 15), p('quantity', 16, 18)], 'strict');
  assert.equal(m.tp.length, 2);
  assert.equal(m.fp.length + m.fn.length, 0);

  const loose = matchItem(item, [p('measurement name', 7, 15)], 'strict'); // "to waist"
  assert.equal(loose.tp.length, 0);
  assert.equal(loose.fp.length, 1);
  assert.equal(loose.fn.length, 2);
});

test('overlap: the right place is enough, one prediction per label', () => {
  const m = matchItem(item, [p('measurement name', 7, 15, 0.8), p('measurement name', 3, 7, 0.7)], 'overlap');
  assert.equal(m.tp.length, 1);
  assert.equal(m.tp[0].predicted.text, 'to waist'); // the stronger claims it
  assert.equal(m.fp.length, 1); // the second overlapping guess is not a second hit
});

test('a wrong kind in the right place is a false positive and a miss', () => {
  const m = matchItem(item, [p('unit', 16, 18)], 'strict');
  assert.equal(m.fp.length, 1);
  assert.equal(m.fn.length, 2);
});

test('inside an ignore region: neither credit nor blame; an ignored span is never required', () => {
  const m = matchItem(item, [p('measurement name', 0, 1), p('quantity', 16, 18)], 'strict');
  assert.equal(m.ignored.length, 1);
  assert.equal(m.fp.length, 0);
  assert.equal(m.fn.length, 1); // "Top to waist" was not found; "B" was never required
});

test('totals, per kind, with every error listed', () => {
  const s = scoreItems([item], { b: [p('measurement name', 3, 15), p('quantity', 3, 5)] }, { types: ['measurement name', 'quantity'] });
  assert.equal(s.overall.tp, 1);
  assert.equal(s.overall.fp, 1);
  assert.equal(s.overall.fn, 1);
  assert.equal(s.overall.precision, 0.5);
  assert.equal(s.overall.recall, 0.5);
  assert.equal(s.byType['measurement name'].precision, 1);
  assert.equal(s.byType.quantity.precision, 0);
  assert.deepEqual(s.errors.map((e) => [e.kind, e.label, e.text]), [
    ['false positive', 'quantity', 'To'],
    ['missed', 'quantity', '20'],
  ]);
  assert.equal(scoreItems([item], {}).overall.precision, null); // nothing predicted: precision is undefined, not 0
});

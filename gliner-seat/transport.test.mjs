// The seat's seam, tested with the fake. No model, no network.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  askExtract,
  checkAnswer,
  createFakeExtractTransport,
  createRunnerTransport,
  extractQuestion,
  reasonOf,
} from './transport.mjs';

const KINDS = ['measurement name', 'quantity', 'unit', 'garment or part name', 'operation'];
const brief = 'an apron dress for a 36 inch bust and 20 inches top to waist';

test('a question carries the text and a closed list of kinds, deduplicated', () => {
  const q = extractQuestion('q1', brief, ['quantity', { name: 'unit', description: 'a unit' }, 'quantity']);
  assert.equal(q.kind, 'extract');
  assert.deepEqual(q.labels, [{ name: 'quantity' }, { name: 'unit', description: 'a unit' }]);
  assert.throws(() => extractQuestion('q2', brief, []), /asks for no kind/);
});

test('the fake answers from its book, with the words at their own place', async () => {
  const fake = createFakeExtractTransport({
    q1: [
      { label: 'garment or part name', text: 'apron dress', score: 0.95 },
      { label: 'quantity', text: '36', score: 0.9 },
      { label: 'unit', text: 'inch', score: 0.8 },
      { label: 'measurement name', text: 'top to waist', score: 0.7 },
    ],
  });
  const run = await askExtract(fake, [extractQuestion('q1', brief, KINDS)]);
  assert.equal(run.ok, true);
  assert.equal(run.via, 'fake');
  const [row] = run.rows;
  assert.equal(row.dropped.length, 0);
  for (const s of row.spans) assert.equal(brief.slice(s.start, s.end), s.text);
  assert.deepEqual(
    row.spans.map((s) => [s.label, s.text]),
    [
      ['garment or part name', 'apron dress'],
      ['quantity', '36'],
      ['unit', 'inch'],
      ['measurement name', 'top to waist'],
    ]
  );
});

test('the fake finds the nth occurrence, and nothing for words the text does not hold', async () => {
  const text = '1. A ÷ 3 = 12 + 2 = 14';
  const fake = createFakeExtractTransport({
    q: [
      { label: 'quantity', text: '2', nth: 1 }, // the 2 of "+ 2", not the one inside 12
      { label: 'quantity', text: '99' },
    ],
  });
  const run = await askExtract(fake, [extractQuestion('q', text, ['quantity'])]);
  assert.deepEqual(run.rows[0].spans.map((s) => [s.text, s.start]), [['2', 16]]);
});

test('an unscripted question finds nothing — or, if asked, is not answered at all', async () => {
  const q = extractQuestion('unknown', brief, KINDS);
  const empty = await askExtract(createFakeExtractTransport({}), [q]);
  assert.deepEqual(empty.rows[0].spans, []);
  assert.match(empty.rows[0].reason, /nothing of those kinds/);

  const silent = await askExtract(createFakeExtractTransport({}, { unscripted: 'unanswered' }), [q]);
  assert.deepEqual(silent.rows, []);
  assert.deepEqual(silent.unanswered, ['unknown']);
});

test('a seat never writes: words that are not the text\'s own are dropped and counted', () => {
  const q = extractQuestion('q', brief, ['quantity', 'unit']);
  const { spans, dropped } = checkAnswer(q, {
    spans: [
      { label: 'quantity', text: '36', start: 21, end: 23, score: 0.9 }, // right
      { label: 'quantity', text: '38', start: 21, end: 23, score: 0.9 }, // not what is written there
      { label: 'quantity', text: 'thirty-six', start: 21, end: 23, score: 0.9 }, // a rewording
      { label: 'unit', text: 'inch', start: 200, end: 204, score: 0.9 }, // outside the text
      { label: 'unit', text: 'inch', start: 24, end: 28, score: 1.7 }, // not a probability
      { label: 'measurement name', text: 'bust', start: 29, end: 33, score: 0.9 }, // not asked for
      { label: 'quantity', text: '36', start: 21, end: 23, score: 0.8 }, // the same span again
      null,
    ],
  });
  assert.deepEqual(spans.map((s) => s.text), ['36']);
  assert.deepEqual(
    dropped.map((d) => d.why),
    [
      "words that are not the text's own at that place",
      "words that are not the text's own at that place",
      'a place outside the text (200…204)',
      'a score that is not a probability',
      'a kind that was not asked for (measurement name)',
      'the same span, twice',
      'not a span',
    ]
  );
});

test('a seat never computes: a value riding on a span is not passed on', () => {
  const q = extractQuestion('q', brief, ['quantity']);
  const { spans } = checkAnswer(q, {
    spans: [{ label: 'quantity', text: '36', start: 21, end: 23, score: 0.9, value: 36, unit: 'in', inches: 36 }],
  });
  assert.deepEqual(Object.keys(spans[0]).sort(), ['end', 'label', 'score', 'start', 'text']);
});

test('the reason is the question and what came back, verbatim', () => {
  const q = extractQuestion('q', 'A. Bust 36', ['measurement name', 'quantity']);
  const reason = reasonOf(q, [
    { label: 'quantity', text: '36', start: 8, end: 10, score: 0.99 },
    { label: 'measurement name', text: 'Bust', start: 3, end: 7, score: 0.93 },
  ]);
  assert.equal(reason, 'asked for measurement name, quantity in “A. Bust 36” — “36” quantity 0.99 · “Bust” measurement name 0.93');
});

test('a transport that throws, or says no, is a seat that is not there — never a throw', async () => {
  const q = extractQuestion('q', brief, KINDS);
  const threw = await askExtract(async () => {
    throw new Error('the graph is not loaded');
  }, [q]);
  assert.equal(threw.ok, false);
  assert.equal(threw.error, 'the graph is not loaded');
  assert.deepEqual(threw.unanswered, ['q']);

  const refused = await askExtract(async () => ({ ok: false, error: 'busy' }), [q]);
  assert.equal(refused.ok, false);
  assert.equal(refused.error, 'busy');
});

test('an answer of another kind, or for another question, is not an answer', async () => {
  const q = extractQuestion('q', brief, KINDS);
  const run = await askExtract(async () => ({
    ok: true,
    answers: [
      { kind: 'choice', questionId: 'q', pick: 'quantity' },
      { kind: 'extract', questionId: 'elsewhere', spans: [] },
    ],
  }), [q]);
  assert.deepEqual(run.rows, []);
  assert.deepEqual(run.unanswered, ['q']);
});

test('the runner transport batches questions over any runner, and stops when told', async () => {
  const calls = [];
  const runner = {
    name: 'stub runner',
    async extract(text, labels, o) {
      calls.push({ text, labels: labels.map((l) => l.name), threshold: o.threshold });
      const at = text.indexOf('36');
      return { spans: at < 0 ? [] : [{ label: 'quantity', text: '36', start: at, end: at + 2, score: 0.97, extra: 'dropped' }] };
    },
  };
  const transport = createRunnerTransport(runner, { threshold: 0.4 });
  const qs = [
    extractQuestion('a', 'A. Bust 36', ['quantity']),
    extractQuestion('b', 'Add seam allowance', ['quantity'], { threshold: 0.7 }),
  ];
  const run = await askExtract(transport, qs);
  assert.equal(run.ok, true);
  assert.equal(run.via, 'stub runner');
  assert.deepEqual(calls.map((c) => c.threshold), [0.4, 0.7]);
  assert.deepEqual(run.rows.map((r) => r.spans.map((s) => s.text)), [['36'], []]);

  const stop = new AbortController();
  stop.abort();
  const stopped = await askExtract(transport, qs, { signal: stop.signal });
  assert.equal(stopped.ok, false);
  assert.equal(stopped.error, 'stopped');
});

// The fixtures hold together: every label is where it says it is, of one of
// the five kinds, and the pattern lines are exactly M1's sample lines.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = join(HERE, 'fixtures');
const labels = JSON.parse(readFileSync(join(DIR, 'labels.json'), 'utf8'));
const KINDS = new Set(labels.types.map((t) => t.name));
const files = readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== 'labels.json');
const load = (f) => JSON.parse(readFileSync(join(DIR, f), 'utf8'));

test('the five kinds, each described without a word from any fixture', () => {
  assert.deepEqual([...KINDS], ['measurement name', 'quantity', 'unit', 'garment or part name', 'operation']);
  const text = files.flatMap((f) => load(f).items.map((i) => i.text.toLowerCase())).join('\n');
  for (const t of labels.types) {
    for (const example of t.description.split(/,| or | such as /).map((s) => s.trim()).filter((s) => s && !/^(a|an|the)\b/.test(s))) {
      assert.ok(!new RegExp(`\\b${example}\\b`, 'i').test(text), `“${example}” (in the ${t.name} description) appears in a fixture`);
    }
  }
});

for (const f of files) {
  test(`${f}: every span is the text's own words, of a known kind`, () => {
    const fx = load(f);
    assert.ok(fx.items.length > 0);
    const ids = new Set();
    for (const item of fx.items) {
      assert.ok(!ids.has(item.id), `duplicate id ${item.id}`);
      ids.add(item.id);
      for (const s of item.spans) {
        assert.ok(KINDS.has(s.label), `${item.id}: unknown kind ${s.label}`);
        assert.equal(item.text.slice(s.start, s.end), s.text, `${item.id}: ${s.text} is not at ${s.start}`);
      }
      for (const r of item.ignore) {
        assert.equal(item.text.slice(r.start, r.end), r.text, `${item.id}: ignored ${r.text} is not at ${r.start}`);
        assert.ok(r.why && r.why.length > 10, `${item.id}: ignored ${r.text} carries no reason`);
      }
      // Two labels of one kind never overlap, and no ignore region swallows a
      // label whole (that would excuse a wrong kind at a place that has a right
      // one). An ignore NESTED in a label is deliberate: the "1" inside
      // "part 1" is excused as a quantity while "part 1" is still required.
      for (let a = 0; a < item.spans.length; a++) {
        for (let b = a + 1; b < item.spans.length; b++) {
          const x = item.spans[a];
          const y = item.spans[b];
          const clash = x.label === y.label && x.start < y.end && y.start < x.end;
          assert.ok(!clash, `${item.id}: “${x.text}” and “${y.text}” overlap`);
        }
        for (const r of item.ignore) {
          const s = item.spans[a];
          assert.ok(!(r.start <= s.start && s.end <= r.end), `${item.id}: ignored “${r.text}” swallows “${s.text}”`);
        }
      }
    }
  });
}

test('the pattern lines are M1\'s sample lines, verbatim — never the drafter\'s own', () => {
  const plan = readFileSync(join(HERE, '..', 'DIRECTOR-PLAN-W2.md'), 'utf8');
  const m1 = plan.slice(plan.indexOf('### M1'), plan.indexOf('**Red first:**', plan.indexOf('### M1')));
  const ticks = (s) => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  const apron = ticks(m1.slice(m1.indexOf('*apron.sample*'), m1.indexOf('*tunic.sample*')));
  const tunic = ticks(m1.slice(m1.indexOf('*tunic.sample*'), m1.indexOf('*triangle*')));
  assert.deepEqual(load('apron.sample.json').items.map((i) => i.text), apron);
  assert.deepEqual(load('tunic.sample.json').items.map((i) => i.text), tunic);
});

test('the castle\'s brief is the exchange\'s, verbatim', () => {
  const exchange = JSON.parse(readFileSync(join(HERE, '..', 'shard-3d', 'fixtures', 'exchanges', 'castle-sketch.ideal.json'), 'utf8'));
  assert.equal(load('castle-sketch.brief.json').items[0].text, exchange.brief);
  assert.equal(load('briefs.json').items.find((i) => i.id === 'brief/castle-words').text, exchange.words);
});

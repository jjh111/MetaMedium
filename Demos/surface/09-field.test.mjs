// The field's reader, on its own.
//
//   node --test Demos/surface/09-field.test.mjs
//
// 09-field.js is a fragment of the surface's one closure, but it is the one
// fragment that names nothing outside itself — no DOM, no session, no shared
// variable. So it can be loaded here exactly as the browser loads it (as source,
// inside a function body) and asked questions directly. That is the whole claim
// SEAM-1 makes: the field's query is decidable from a record.
//
// Note this file is NOT part of the built surface — Demos/build-surface.mjs
// concatenates `/^\d\d-.*\.js$/`, which `.test.mjs` does not match.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '09-field.js'), 'utf8');
const { readFieldCommand, verbFor, libraryMatch } = new Function(
  src + '\n  return { readFieldCommand, verbFor, libraryMatch };'
)();

/** A board with nothing on it but the four core verbs and one reading. */
const ITEMS = [
  { key: 'sug:1', certain: true, label: 'molecule 0.92', why: 'like the one you named — take it as another molecule' },
  { key: 'snap', label: 'Draw them clean', verbs: ['clean', 'snap', 'draw clean'], why: '3 shapes · ink kept' },
  { key: 'what', label: 'What is this?', verbs: ['what', 'what is this', '?'], why: 'every joined model reads the group' },
  { key: 'name', label: 'Name…', verbs: [], why: 'Name — hold it as a thing you can use again' },
  { key: 'copy', label: 'Copy', verbs: ['copy', 'cp'], why: 'Copy — hold the ink to paste' },
  { key: 'paste', label: 'Paste', verbs: ['paste'], disabled: true, why: 'Paste — nothing copied yet' },
];

const ctx = (over = {}) => ({
  text: '', open: true, revising: false, items: ITEMS,
  models: [], library: [], definition: null, behaviour: null,
  target: () => 'program',
  ...over,
});

test('with no summon there is nothing to read', () => {
  const r = readFieldCommand(ctx({ open: false, text: 'erase' }));
  assert.equal(r.kind, 'empty');
  assert.equal(r.command, null);
  assert.equal(r.line, '');
});

test('nothing typed: Enter takes the leading reading', () => {
  const r = readFieldCommand(ctx());
  assert.equal(r.kind, 'default');
  assert.deepEqual(r.command, { do: 'take', key: 'sug:1', index: 0 });
  assert.match(r.line, /^↵ molecule 0\.92 — take it as another molecule$/);
});

test('nothing typed and nothing read: the line stays quiet', () => {
  const r = readFieldCommand(ctx({ items: ITEMS.filter((i) => !i.certain) }));
  assert.equal(r.kind, 'empty');
  assert.equal(r.quiet, true);
  assert.equal(r.command, null);
});

test('a verb by its label', () => {
  const r = readFieldCommand(ctx({ text: 'Draw them' }));
  assert.equal(r.kind, 'verb');
  assert.equal(r.line, '↵ Draw them clean');
  assert.deepEqual(r.command, { do: 'take', key: 'snap', index: 1 });
});

test('a verb by an alias', () => {
  for (const typed of ['clean', 'snap', 'sn']) {
    const r = readFieldCommand(ctx({ text: typed }));
    assert.equal(r.command.key, 'snap', typed);
  }
});

test('an alias must be two characters before it matches by prefix', () => {
  // "c" is the start of clean, copy and cp; one letter is not a choice, so it
  // falls through to the brief rather than picking a verb for the hand.
  const one = readFieldCommand(ctx({ text: 'c', models: ['qwen3'] }));
  assert.equal(one.kind, 'brief');
  assert.equal(one.command.do, 'build');
  assert.equal(readFieldCommand(ctx({ text: 'cp', models: ['qwen3'] })).command.key, 'copy');
});

test('a verb the selection does not afford is said, and Enter does nothing', () => {
  const r = readFieldCommand(ctx({ text: 'paste' }));
  assert.equal(r.kind, 'verb');
  assert.equal(r.quiet, true);
  assert.equal(r.command, null);
  assert.equal(r.line, '↵ Paste — Paste — nothing copied yet');
});

test('a name the library knows is reused, and no model is asked', () => {
  const library = [{ id: 'artifact:3', name: 'bouncing ball' }];
  const r = readFieldCommand(ctx({ text: 'bouncing ball', library, models: ['qwen3'] }));
  assert.equal(r.kind, 'library');
  assert.deepEqual(r.command, { do: 'library', id: 'artifact:3' });
  assert.match(r.line, /no model asked/);
  // …and by every word of the name, in any order.
  assert.equal(readFieldCommand(ctx({ text: 'a ball that is bouncing', library })).command.id, 'artifact:3');
  // A verb still outranks it: the selection's own offers are read first.
  assert.equal(readFieldCommand(ctx({ text: 'clean', library })).command.key, 'snap');
});

test('the library is not offered while revising a live artifact', () => {
  // The adapter hands an empty library when revising; the reader also refuses it.
  const library = [{ id: 'artifact:3', name: 'bouncing ball' }];
  const r = readFieldCommand(ctx({ text: 'bouncing ball', library, revising: true, models: ['qwen3'] }));
  assert.equal(r.kind, 'brief');
  assert.match(r.line, /changes what the loop covers/);
});

test('every prefix names its act', () => {
  const m = { models: ['qwen3', 'glm'] };
  const cases = [
    ['name: molecule', 'name', { do: 'name', name: 'molecule' }, /name it “molecule”/],
    ['what:', 'what', { do: 'ask-what' }, /ask qwen3, glm what this is/],
    ['ask: why is this here', 'ask', { do: 'ask', text: 'why is this here' }, /^↵ ask qwen3, glm$/],
    ['draw: a footer', 'draw', { do: 'draw', text: 'a footer' }, /qwen3, glm draws/],
    ['page: a pricing table', 'brief', { do: 'build', text: 'page: a pricing table', revising: false }, /builds a page/],
    ['new: a clock', 'brief', { do: 'build', text: 'new: a clock', revising: false }, /writes it fresh/],
    ['run: a clock', 'brief', { do: 'build', text: 'run: a clock', revising: false }, /writes a program/],
    ['program: a clock', 'brief', { do: 'build', text: 'program: a clock', revising: false }, /writes a program/],
  ];
  for (const [text, kind, command, line] of cases) {
    const r = readFieldCommand(ctx({ text, ...m }));
    assert.equal(r.kind, kind, text);
    assert.deepEqual(r.command, command, text);
    assert.match(r.line, line, text);
  }
});

test('a prefix with nothing after it asks for the rest, quietly', () => {
  const r = readFieldCommand(ctx({ text: 'ask:', models: ['qwen3'] }));
  assert.equal(r.kind, 'ask');
  assert.equal(r.quiet, true);
  assert.equal(r.command, null);
  const n = readFieldCommand(ctx({ text: 'name:' }));
  assert.equal(n.kind, 'name');
  assert.equal(n.quiet, true);
  assert.equal(n.command, null);
});

test('a prefix that needs a model, with none joined, says so and opens the pane', () => {
  for (const [text, what] of [['ask: why', 'a question'], ['draw: a box', 'drawing'], ['run: a clock', 'building'], ['what:', 'reading the group']]) {
    const r = readFieldCommand(ctx({ text }));
    assert.equal(r.kind, 'blocked', text);
    assert.equal(r.quiet, true, text);
    assert.deepEqual(r.command, { do: 'need-model', what }, text);
    assert.match(r.line, /needs a model — controls › models/, text);
  }
  // `name:` never needs one — the engine holds the name itself.
  assert.equal(readFieldCommand(ctx({ text: 'name: bubble' })).kind, 'name');
});

test('a brief with no model joined: a page is still built, a program is not', () => {
  const page = readFieldCommand(ctx({ text: 'website with the copy in the squares', target: () => 'page' }));
  assert.equal(page.kind, 'structure');
  assert.deepEqual(page.command, { do: 'build', text: 'website with the copy in the squares', revising: false });
  assert.match(page.line, /the structure, at once \(tier 1\) — join a model for the words/);

  const program = readFieldCommand(ctx({ text: 'a bouncing ball', target: () => 'program' }));
  assert.equal(program.kind, 'blocked');
  assert.deepEqual(program.command, { do: 'need-model', what: 'writing a program' });
});

test('a brief with a model joined: tier 1 first for a page, the model for a program', () => {
  const page = readFieldCommand(ctx({ text: 'website with the copy in the squares', models: ['qwen3'], target: () => 'page' }));
  assert.equal(page.kind, 'brief');
  assert.match(page.line, /structure at once \(tier 1\), then qwen3 writes the words/);

  const program = readFieldCommand(ctx({ text: 'a bouncing ball', models: ['qwen3'], target: () => 'program' }));
  assert.equal(program.kind, 'brief');
  assert.equal(program.line, '↵ qwen3 writes a program');
  assert.deepEqual(program.command, { do: 'build', text: 'a bouncing ball', revising: false });
});

test('the genre is read at most once, and only when the brief needs it', () => {
  let asked = 0;
  const target = () => { asked++; return 'program'; };
  readFieldCommand(ctx({ text: 'clean', target }));       // a verb settles it
  readFieldCommand(ctx({ text: 'ask: why', models: ['q'], target })); // a prefix settles it
  assert.equal(asked, 0);
  readFieldCommand(ctx({ text: 'a bouncing ball', models: ['q'], target }));
  assert.equal(asked, 1);
});

test('words at a definition are what it does', () => {
  const definition = { id: 'artifact:7', name: 'fish' };
  const behaviour = { described: 'flees anything bigger', unparsed: [], value: { terms: [{ verb: 'flee' }] } };
  const r = readFieldCommand(ctx({ text: 'flees anything bigger', definition, behaviour }));
  assert.equal(r.kind, 'behaviour');
  assert.equal(r.line, '↵ fish: flees anything bigger');
  assert.deepEqual(r.command, { do: 'behave', definitionId: 'artifact:7', behaviour: behaviour.value, words: 'flees anything bigger', ask: false });
});

test('what the verb table could not read is named, and asked of a model only if one is here', () => {
  const definition = { id: 'artifact:7', name: 'fish' };
  const behaviour = { described: 'wanders', unparsed: ['shimmering'], value: { terms: [] } };
  const alone = readFieldCommand(ctx({ text: 'wanders, shimmering', definition, behaviour }));
  assert.match(alone.line, /· could not read “shimmering”/);
  assert.equal(alone.command.ask, false);

  const withModel = readFieldCommand(ctx({ text: 'wanders, shimmering', definition, behaviour, models: ['qwen3'] }));
  assert.match(withModel.line, /· qwen3 reads “shimmering”/);
  assert.equal(withModel.command.ask, true);
});

test('verbFor and libraryMatch on their own', () => {
  assert.equal(verbFor('', ITEMS), null);
  assert.equal(verbFor('copy', ITEMS).key, 'copy');
  assert.equal(verbFor('nothing like this', ITEMS), null);
  // An exact alias beats a prefix match further up the list.
  assert.equal(verbFor('what', ITEMS).key, 'what');

  assert.equal(libraryMatch('a', [{ id: '1', name: 'a' }]), null, 'one character is not a query');
  assert.equal(libraryMatch('clock', []), null);
  assert.equal(libraryMatch('CLOCK', [{ id: '1', name: 'clock' }]).id, '1');
  assert.equal(libraryMatch('the ball', [{ id: '1', name: 'bouncing ball' }]), null, 'every word of the name must be there');
});

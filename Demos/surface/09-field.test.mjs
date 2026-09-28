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
// The committed core bundle, for the one test below that composes the reader with
// core's rule the way the adapter does (V1-PLAN L2i). The reader itself still names nothing.
import * as MM from '../metamedium-core.node.mjs';

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '09-field.js'), 'utf8');
const { readFieldCommand, verbFor, libraryMatch, typedWord } = new Function(
  src + '\n  return { readFieldCommand, verbFor, libraryMatch, typedWord };'
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
  // The selection's ink: how many marks the person made, and who made the rest (V1-PLAN L2e).
  marks: { mine: 1, others: [] },
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

// ---- A word on your own ink (V1-PLAN L2e) ----
// Whoever made a mark may put a word on it. A person on the canvas does it by
// typing `label: word` at a selection: the reader says what Enter will do before
// it is pressed, and names another hand's marks in the selection, which the
// label will not go on. Labelling is not naming — it blesses nothing — so it
// never needs a model, and it is read before any verb, name or brief.

test('label: a word for the selection\'s own ink, and the line says so before Enter', () => {
  const r = readFieldCommand(ctx({ text: 'label: inlet' }));
  assert.equal(r.kind, 'label');
  assert.equal(r.line, '↵ label it “inlet”');
  assert.deepEqual(r.command, { do: 'label', text: 'inlet' });
  assert.equal(r.quiet, undefined);
});

test('label: needs no model, and the prefix outranks a verb of the same word', () => {
  // "label: clean" puts the word clean on the ink; it is not the clean verb.
  const r = readFieldCommand(ctx({ text: 'label: clean', models: ['qwen3'] }));
  assert.equal(r.kind, 'label');
  assert.deepEqual(r.command, { do: 'label', text: 'clean' });
  const spaced = readFieldCommand(ctx({ text: 'Label :  inlet valve ' }));
  assert.deepEqual(spaced.command, { do: 'label', text: 'inlet valve' });
  assert.equal(spaced.line, '↵ label it “inlet valve”');
});

test('label: on several marks says the word goes on each of them', () => {
  const r = readFieldCommand(ctx({ text: 'label: inlet', marks: { mine: 3, others: [] } }));
  assert.equal(r.line, '↵ label it “inlet” — on each of your 3 marks');
  assert.deepEqual(r.command, { do: 'label', text: 'inlet' });
});

test('label: names another hand\'s marks before Enter, and still labels yours', () => {
  const some = readFieldCommand(ctx({ text: 'label: inlet', marks: { mine: 2, others: ['fern'] } }));
  assert.equal(some.line, '↵ label it “inlet” — on your 2, not the mark fern made');
  assert.equal(some.quiet, undefined);
  assert.deepEqual(some.command, { do: 'label', text: 'inlet' });
});

test('label: on nothing of yours is said quietly, and Enter still says why in the status line', () => {
  const none = readFieldCommand(ctx({ text: 'label: inlet', marks: { mine: 0, others: ['fern', 'fern', 'qwen3'] } }));
  assert.equal(none.kind, 'label');
  assert.equal(none.quiet, true);
  assert.equal(none.line, '↵ no label — fern and qwen3 made these 3 marks; a label goes on your own ink');
  // Quiet is not silent: Enter runs the command, and the adapter says the refusal.
  assert.deepEqual(none.command, { do: 'label', text: 'inlet' });
  const one = readFieldCommand(ctx({ text: 'label: inlet', marks: { mine: 0, others: ['fern'] } }));
  assert.equal(one.line, '↵ no label — fern made this mark; a label goes on your own ink');
});

test('label: with nothing after it, or nothing held to put it on, asks quietly', () => {
  const empty = readFieldCommand(ctx({ text: 'label:' }));
  assert.equal(empty.kind, 'label');
  assert.equal(empty.quiet, true);
  assert.equal(empty.command, null);
  assert.equal(empty.line, '↵ label it… (type the word)');
  const nothing = readFieldCommand(ctx({ text: 'label: inlet', marks: { mine: 0, others: [] } }));
  assert.equal(nothing.kind, 'label');
  assert.equal(nothing.quiet, true);
  assert.equal(nothing.command, null);
  // A context that says nothing about the ink holds none: never a brief, never a guess.
  const bare = readFieldCommand({ text: 'label: inlet', open: true, items: [] });
  assert.equal(bare.kind, 'label');
  assert.equal(bare.command, null);
});

// ---- A person is the same person across sittings (V1-PLAN L2i) ----
// The reader is told how many of the held marks are the person's own; the adapter
// (`whoseInk` in 09-palette.js) asks core for each — the label door's own question,
// `session.isMine`. Composed here as the adapter composes them, with the committed
// core bundle: john draws in one sitting, the page reloads, and in the next sitting
// the marks he drew before it are still his to label. fern's are not.

test('label: after a reload the line counts the marks drawn before it as the person\'s own, and names only another person\'s', () => {
  const named = (logName) => MM.createSession({ ...MM.DEFAULT_SESSION_CONFIG, logName });
  /** A 100 × 60 box at x, as a hand draws one: twenty points a side. */
  const box = (x) => [[0, 0], [100, 0], [100, 60], [0, 60], [0, 0]].flatMap(([px, py], i, a) =>
    i ? Array.from({ length: 20 }, (_, k) => ({ x: x + a[i - 1][0] + ((px - a[i - 1][0]) * k) / 20, y: a[i - 1][1] + ((py - a[i - 1][1]) * k) / 20 })) : []);
  const a1 = named('john~a1'), fern = named('fern~x1');
  const before = [a1.addStroke(box(0), 1000, undefined, 1, { content: true }), a1.addStroke(box(200), 1100, undefined, 1, { content: true })];
  const hers = fern.addStroke(box(400), 1200, undefined, 1, { content: true });
  // The reload: a new sitting, which hears the room and draws one more box.
  const b2 = named('john~b2');
  b2.load(MM.mergeLogs({ 'john~a1': a1.getEvents().slice(), 'fern~x1': fern.getEvents().slice(), 'john~b2': [] }, { me: 'john~b2' }));
  const after = b2.addStroke(box(600), 2000, undefined, 1, { content: true });
  const s = b2.getState();
  // Who made a mark, by name — the attribution the adapter already shows.
  const makerName = (id) => MM.wordOf(s.nodes.get(MM.authorOf(s.nodes.get(id)))) || 'another hand';
  const marksOf = (ids) => {
    const out = { mine: 0, others: [] };
    for (const id of ids) {
      if (b2.isMine(id)) out.mine++;
      else out.others.push(makerName(id));
    }
    return out;
  };
  const line = (ids) => readFieldCommand(ctx({ text: 'label: inlet', marks: marksOf(ids) })).line;
  assert.equal(line([before[0]]), '↵ label it “inlet”');
  assert.equal(line([...before, after]), '↵ label it “inlet” — on each of your 3 marks');
  assert.equal(line([...before, hers]), '↵ label it “inlet” — on your 2, not the mark fern made');
  assert.equal(line([hers]), '↵ no label — fern made this mark; a label goes on your own ink');
});

// The row offers a typed word two ways, side by side: Name it (one thing, a
// definition) and Label it (a word on your own ink, nothing made). typedWord
// decides only whether there is a word to offer, and which; Enter stays the
// reader's — a bare word is still the brief.

test('typedWord: a bare word or two is offered to name the marks or to label them', () => {
  assert.deepEqual(typedWord(ctx({ text: 'inlet' })), { word: 'inlet', act: null });
  assert.deepEqual(typedWord(ctx({ text: ' inlet valve ' })), { word: 'inlet valve', act: null });
  // A single letter is a label a diagram uses all the time: point A, node x.
  assert.deepEqual(typedWord(ctx({ text: 'A' })), { word: 'A', act: null });
  // …and Enter on it is still what the reader says, not a label.
  assert.equal(readFieldCommand(ctx({ text: 'inlet', models: ['qwen3'] })).command.do, 'build');
});

test('typedWord: the prefixes say what the word is for, and nothing else is a word', () => {
  assert.deepEqual(typedWord(ctx({ text: 'label: inlet' })), { word: 'inlet', act: 'label' });
  assert.deepEqual(typedWord(ctx({ text: 'name: the long name of a thing' })), { word: 'the long name of a thing', act: 'name' });
  for (const text of ['ask: why', 'draw: a box', 'run: a clock', 'what:', 'label:', 'name:', 'label', 'name', 'Draw them', 'clean', 'cp',
    'website about dolphins', 'a: b', 'x'.repeat(41)]) {
    assert.equal(typedWord(ctx({ text })), null, text);
  }
});

test('typedWord: a library entry, words a definition is told, a revision, or no ink held — no word', () => {
  assert.equal(typedWord(ctx({ text: 'bouncing ball', library: [{ id: 'artifact:3', name: 'bouncing ball' }] })), null);
  const definition = { id: 'artifact:7', name: 'fish' };
  const behaviour = { described: 'wanders', unparsed: [], value: { terms: [{ verb: 'wander' }] } };
  assert.equal(typedWord(ctx({ text: 'wanders', definition, behaviour })), null);
  assert.equal(typedWord(ctx({ text: 'inlet', revising: true })), null);
  assert.equal(typedWord(ctx({ text: 'inlet', open: false })), null);
  assert.equal(typedWord(ctx({ text: 'inlet', marks: { mine: 0, others: [] } })), null);
  assert.equal(typedWord({ text: 'inlet', open: true, items: [] }), null);
  // Another hand's marks are still marks: the offer stands, and taking it says why it is refused.
  assert.deepEqual(typedWord(ctx({ text: 'inlet', marks: { mine: 0, others: ['fern'] } })), { word: 'inlet', act: null });
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

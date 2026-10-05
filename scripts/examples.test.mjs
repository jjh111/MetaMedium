// The example boards, asked what they are (V1-PLAN.md §9 R5).
//
//   node --test scripts/examples.test.mjs
//
// boards/examples/ holds a few boards a first-time hand can open from the boards pane: a
// flowchart with its Mermaid beside it, a class diagram, a molecule from the Basics pack, a
// pattern page with a right triangle whose sizes the maths says. Each is a LOG, one event per
// line as export writes it, made by scripts/examples.mjs from the engine — the committed
// Node bundle the MCP hand runs — and never drawn by hand, so that what the engine reads
// today is what the example shows: the test replays every file and asks the engine what it
// makes of it, and a file that is no longer what the script makes is drift (CI runs the
// script's --check too).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const MM = await import(pathToFileURL(join(root, 'Demos', 'dynaink-core.node.mjs')).href);
// Loaded on its own line, so while the script is not written every test fails on its own line.
const gen = existsSync(join(here, 'examples.mjs')) ? await import('./examples.mjs') : {};

const DIR = join(root, 'boards', 'examples');
const IDS = ['flowchart', 'class-diagram', 'molecule', 'pattern-page', 'story'];
/** The examples whose maths is meant: the pattern page, and the storyboard's maths shots (a triangle that solves itself, a page of steps). */
const MATHS = ['pattern-page', 'story'];
const readIndex = () => JSON.parse(readFileSync(join(DIR, 'index.json'), 'utf8'));
const linesOf = (id) => readFileSync(join(DIR, id + '.jsonl'), 'utf8');
/** An example replayed into a session of its own, as the page loads a board's log. */
function open(id) {
  const events = MM.decodeLog(linesOf(id)).events;
  const s = MM.createSession();
  s.load(events);
  return { s, events, state: s.getState() };
}

test('the script makes the same examples twice, byte for byte', () => {
  assert.equal(typeof gen.makeExamples, 'function', 'scripts/examples.mjs exports makeExamples(MM)');
  const a = gen.makeExamples(MM), b = gen.makeExamples(MM);
  assert.deepEqual(a, b);
  assert.deepEqual(Object.keys(a.files).sort(), IDS.map((id) => id + '.jsonl').sort());
});

test('what is committed under boards/examples is what the script makes (the drift check)', () => {
  assert.equal(typeof gen.checkExamples, 'function', 'scripts/examples.mjs exports checkExamples(root, MM)');
  assert.deepEqual(gen.checkExamples(root, MM), []);
});

test('the index names every example: an id, a name, what it shows, its file and how many marks it holds — and a starter', () => {
  const index = readIndex();
  assert.deepEqual(index.examples.map((e) => e.id), IDS);
  assert.ok(IDS.includes(index.starter), 'the starter is one of them');
  for (const e of index.examples) {
    assert.ok(e.name && e.says, `${e.id} has a name and says what it shows`);
    assert.equal(e.file, e.id + '.jsonl');
    assert.ok(existsSync(join(DIR, e.file)), `${e.file} is there`);
    assert.equal(e.marks, open(e.id).events.filter((ev) => ev.type === 'stroke').length, `${e.id}: the index counts its strokes`);
    assert.ok(e.marks > 3, `${e.id} is not empty`);
  }
});

test('each file is a log as export writes it: a version 1 header, then one event per line, every line an event, a trailing newline, nothing key-shaped', () => {
  for (const id of IDS) {
    const text = linesOf(id);
    assert.ok(text.endsWith('\n'), id);
    assert.equal(JSON.parse(text.split('\n')[0]).format, 'metamedium-log', `${id}: the first line is the log's header`);
    assert.equal(MM.decodeLog(text).version, 1, id);
    const lines = text.split('\n').slice(0, -1);
    assert.ok(lines.every((l) => l.trim()), `${id}: no blank line`);
    const events = lines.map((l) => JSON.parse(l));
    assert.ok(events.every((e) => e && typeof e.type === 'string'), `${id}: every line an event`);
    assert.equal(MM.decodeLog(text).skipped, 0, id);
    assert.ok(!/sk-[A-Za-z0-9]{16,}|Bearer |api[_-]?key/i.test(text), `${id}: no key`);
  }
});

test('every example replays whole: no pack notice, no stale line, nothing erased, the same board twice', () => {
  for (const id of IDS) {
    const a = open(id), b = open(id);
    assert.deepEqual(a.state.packNotices, [], id);
    assert.equal(a.state.staleResult ?? null, null, id);
    assert.equal(JSON.stringify([...a.state.nodes.keys()]), JSON.stringify([...b.state.nodes.keys()]), id);
    assert.equal(a.events.filter((e) => e.type === 'erase').length, 0, `${id}: nothing was scratched out`);
  }
});

test('an example opens with nothing held: no field, no selection, no loop waiting', () => {
  for (const id of IDS) {
    const { state } = open(id);
    assert.equal(state.summon, null, `${id}: no field open`);
    assert.deepEqual(state.selection, [], `${id}: nothing selected`);
    assert.equal(state.pendingLassoId, null, `${id}: no loop waiting`);
  }
});

test('the flowchart reads as a flowchart, and its Mermaid stands beside it as an artifact that says the same', () => {
  const { state, s } = open('flowchart');
  const [top] = MM.notationsOf(state).sort((x, y) => y.confidence - x.confidence);
  assert.equal(top.notation, 'flowchart');
  assert.ok(top.confidence >= MM.NOTATION_FLOOR);
  const mermaid = state.artifacts.map((id) => state.nodes.get(id)).map((n) => ({ n, rep: MM.getRep(n, 'code') })).filter((x) => x.rep && x.rep.data.kind === 'mermaid');
  assert.equal(mermaid.length, 1, 'one Mermaid text');
  const said = MM.mermaidFor(state, state.contentIds.filter((id) => !state.artifacts.includes(id)));
  assert.ok(said, 'the drawing still says itself as Mermaid');
  assert.equal(mermaid[0].rep.data.code, said.said.text, 'the text beside it is what the drawing says now');
  assert.match(mermaid[0].rep.data.code, /^flowchart TD/);
  assert.ok(s.getEvents().length > 10);
});

test('the class diagram reads as a UML class diagram', () => {
  const { state } = open('class-diagram');
  const [top] = MM.notationsOf(state).sort((x, y) => y.confidence - x.confidence);
  assert.equal(top.notation, 'uml-class');
  assert.ok(top.confidence >= MM.NOTATION_FLOOR);
});

test('the molecule uses the Basics pack: nothing taught, and the molecule is matched by the pack — a lone bubble too', () => {
  const { s, state, events } = open('molecule');
  assert.deepEqual(state.packs, ['basics@1']);
  assert.equal(events.filter((e) => e.type === 'bless').length, 0, 'nothing on this board is taught');
  const names = state.clusterCandidates.flatMap((c) => c.matches.map((m) => `${m.name}·${m.pack}`));
  assert.ok(names.length >= 2 && names.every((n) => n === 'molecule·basics@1'), JSON.stringify(names));
  // A lone circle held is the pack's bubble.
  const lone = state.contentIds.filter((id) => !state.artifacts.includes(id)).find((id) => {
    const m = s.matchesOf([id]);
    return m.length && m[0].name === 'bubble';
  });
  assert.ok(lone, 'a lone circle matches the pack’s bubble');
});

test('the pattern page says its sizes: 25.30 beside the long side of a right triangle with 24 and 8 on its legs, and each step of the page checks', () => {
  const { state } = open('pattern-page');
  const board = MM.boardMaths(state);
  assert.ok(board, 'the board has maths');
  const chips = MM.mathsChips(board);
  const side = chips.filter((c) => c.kind === 'side');
  assert.equal(side.length, 1);
  assert.match(side[0].text, /^25\.30/);
  const steps = chips.filter((c) => c.kind === 'step');
  assert.ok(steps.length >= 3 && steps.every((c) => c.text.startsWith('✓')), JSON.stringify(steps.map((c) => c.text)));
  assert.equal(chips.filter((c) => c.kind === 'conflict').length, 0, 'nothing on this page disagrees');
});

test('a note is not a measurement: no example but the pattern page and the storyboard has anything the maths says, and theirs has nothing that disagrees or is not on its sheet', () => {
  for (const id of IDS) {
    const board = MM.boardMaths(open(id).state);
    const chips = board ? MM.mathsChips(board) : [];
    if (MATHS.includes(id)) assert.ok(chips.length && chips.every((c) => !c.text.startsWith('?') && c.kind !== 'conflict'), JSON.stringify(chips.map((c) => c.text)));
    else assert.deepEqual(chips.map((c) => c.text), [], `${id}: no note reads as a step`);
  }
});

test('the story and storyboard: the story board in a place of its own beside the storyboard, every shot a region, and the live shots live', () => {
  const { s, state, events } = open('story');
  const outline = MM.regionOutline(state);
  const top = outline.filter((e) => e.depth === 0).map((e) => e.name);
  assert.match(top[0], /^The story/, 'the story board is its own place, first in reading order');
  assert.deepEqual(top.slice(1, 6).map((n) => n.split(' ')[0]), ['Read', 'Maths', 'Physics', 'Reasoning', 'Design']);
  assert.equal(outline.filter((e) => /^Shot \d+ · /.test(e.name)).length, 16, 'sixteen shots');
  // The story board's marks are Claude's hand's, as they were drawn; the storyboard's are the board's own.
  assert.ok(events.some((e) => e.by && e.type === 'stroke') && events.some((e) => !e.by && e.type === 'stroke'));
  // Live: the triangle says its long side, the molecule is the pack's.
  const chips = MM.mathsChips(MM.boardMaths(state));
  assert.ok(chips.some((c) => c.kind === 'side' && /^25\.30/.test(c.text)), JSON.stringify(chips.map((c) => c.text)));
  assert.ok(state.clusterCandidates.some((c) => c.matches.some((m) => m.name === 'molecule' && m.pack === 'basics@1')));
  // The story board stands left of the storyboard, apart from it.
  const story = outline.find((e) => /^The story/.test(e.name)), first = outline.find((e) => /^Read me/.test(e.name));
  assert.ok(story.bounds.maxX < first.bounds.minX, 'side by side, not over each other');
  assert.ok(s.getEvents().length > 200);
});

test('the service worker keeps the examples for offline: the index and every file', () => {
  const sw = readFileSync(join(root, 'Demos', 'sw.js'), 'utf8');
  assert.ok(sw.includes('../boards/examples/index.json'), 'the index');
  for (const id of IDS) assert.ok(sw.includes(`../boards/examples/${id}.jsonl`), id);
});

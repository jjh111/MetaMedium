// The colour space's golden (V1-SPEC KN3a): the specimen, run, and what it said written down.
//
//   node core/src/colour/test/make-golden.mjs [--rev <git rev>] [--page <file>] [--out <file>]
//
// brand/colour-space.html was built, on 2 October 2026, as a page John could use before any of it was in
// core, and its first script carries the whole space as one module (`Space`). This script lifts that module
// out of the page, in Node, and runs it on the seed acts John's three kinds and the spec's examples make
// (and a few dozen seeded random boards beside them), then writes down what it said: each kind's hue, depth
// and source, its colour on both grounds said and offered, the contrast, the lightness moved to read, the
// second channel, the pairs' distances under every way of seeing, and the sentences the board says about its
// colours. core/src/colour/ must say the same: hues to 1e-6, hexes equal (golden.test.ts).
//
// It reads the page from git, at the commit before KN3a (4fa1bed), because once the page draws with core's
// functions it no longer carries a copy of its own. `--page` reads a file instead, for a page that still does.
// The fixture is committed; this script is how it was made and the only way to make it again.
//
// Two things the specimen does that core does not, and the golden leaves out:
//
//   - When more kinds look alike than there are patterns for, it gives the last pattern to all of them without
//     saying so. A random board where that happens is not written, and the one named board where it does (the seed
//     with every example, fourteen kinds) is written with its `overflow` so only its colours are held to it. Core has
//     more patterns and says when they run out (access.test.ts).
//   - It reports a colour's contrast as the unrounded colour's, but draws the hex, and the hex of a deep kind on
//     paper can fall a hair under 4.5:1 (the worst 4.47). A board with such a colour is not written; core keeps
//     going until the drawn colour reads (scale.test.ts).

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../../..');
const SPECIMEN_REV = '4fa1bed';

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

/** The page's text: a file, or the page as it stood at a commit. */
function pageText() {
  const file = arg('--page');
  if (file) return readFileSync(resolve(file), 'utf8');
  return execFileSync('git', ['-C', ROOT, 'show', `${arg('--rev') || SPECIMEN_REV}:brand/colour-space.html`], { encoding: 'utf8', maxBuffer: 1 << 26 });
}

/** The specimen's `Space` module, lifted out of the page's script and run. */
function loadSpace(html) {
  const start = html.indexOf('const Space = (() => {');
  if (start < 0) throw new Error('this page carries no Space module of its own — read an earlier one with --rev');
  const end = html.indexOf('\n})();', start);
  if (end < 0) throw new Error('the Space module has no end');
  return new Function(html.slice(start, end + '\n})();'.length) + '\nreturn Space;')();
}

// The page's own text, read once; and a fresh Space for every board. The specimen keeps a cache of the colours it has
// scored (keyed by hue to a tenth of a degree) for the life of the page, so a board's placements could depend on the
// boards run before it (4 of 600 seeded boards did). Each board here is what a page just loaded says for it.
const PAGE = pageText();
let S = loadSpace(PAGE);
const fresh = () => { S = loadSpace(PAGE); };

// ---- the scenarios ---------------------------------------------------------

// The kinds John named on 2 October and the spec's examples of a family, kin and opposites; and the page's
// own examples to say after them (the page's SEED and EXAMPLES, copied, because the page keeps them in its
// UI script and not in the module).
const SEED = ["it's an idea · purple", "it's a task", "it's a note", 'insight is a kind of idea', 'hunch is a kind of idea', 'question is kin to idea', 'assumption opposes evidence'];
const EXAMPLES = ["it's a quote · teal", 'risk opposes opportunity', 'todo is a kind of task', 'method is kin to note', 'make idea yellow', "it's a feeling"];

const NAMES = ['idea', 'task', 'note', 'quote', 'risk', 'person', 'place', 'event', 'goal', 'source', 'claim', 'question', 'method', 'tool', 'theme', 'draft', 'plan', 'fact', 'story', 'link'];
const WORDS = Object.keys(S.WORDS);

/** A small seeded stream, so the random boards are the same boards every time. */
function stream(seed) {
  let x = (seed * 2654435761) >>> 0 || 1;
  const next = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  return { next, pick: xs => xs[Math.floor(next() * xs.length)], below: n => Math.floor(next() * n) };
}

/** A seeded board of acts: kinds said with and without a colour, and every relation. */
function randomActs(seed) {
  const r = stream(seed);
  const hex = () => '#' + Array.from({ length: 6 }, () => '0123456789abcdef'[r.below(16)]).join('');
  const acts = [];
  const n = 6 + r.below(9);
  for (let i = 0; i < n; i++) {
    const roll = r.next();
    const a = r.pick(NAMES);
    if (roll < 0.3) acts.push({ act: 'say', a });
    else if (roll < 0.5) acts.push({ act: 'say', a, word: r.next() < 0.7 ? r.pick(WORDS) : r.next() < 0.7 ? hex() : r.pick(['grey', 'banana', 'black']) });
    else {
      const b = r.next() < 0.03 ? a : r.pick(NAMES);
      acts.push({ act: r.pick(['sub', 'kin', 'opposes']), a, b });
    }
  }
  return acts;
}

// ---- running one ------------------------------------------------------------

/** A kind that looks alike to an earlier kind under every pattern: the specimen then repeats the last one. */
function overflowed(lens, pairs) {
  const ks = [...lens.kinds.values()].sort((x, y) => x.order - y.order);
  const ch = S.channels(lens, pairs);
  const held = new Map();
  const out = [];
  for (const k of ks) {
    const taken = new Set(pairs.filter(p => p.min < S.APART && (p.a === k.name || p.b === k.name)).map(p => (p.a === k.name ? p.b : p.a)).filter(o => held.has(o)).map(o => held.get(o)));
    if (S.CHANNELS.every(c => taken.has(c))) out.push(k.name);
    held.set(k.name, ch.get(k.name).channel);
  }
  return out;
}

/** Kinds with a colour whose drawn hex misses 4.5:1 against its ground: the specimen measured the unrounded one. */
function short(ks) {
  const lum = hex => S.luminance(S.hexToLinear(hex));
  return ks.filter(k => ['paper', 'dark'].some(g => ['said', 'offered'].some(c => S.contrast(lum(S.colourOf(k, g, c).hex), lum(S.GROUNDS[g].ground)) < S.FLOOR))).map(k => k.name);
}

function run(acts) {
  const lens = S.emptyLens();
  const answers = acts.map(a => (a.act ? S.apply(lens, a) : null));
  const pairs = S.distinctness(lens);
  const ks = [...lens.kinds.values()].sort((x, y) => x.order - y.order);
  const ch = S.channels(lens, pairs);
  return { lens, answers, pairs, ks, ch, meaning: S.meaning(lens, pairs), overflow: overflowed(lens, pairs), short: short(ks) };
}

const colourRow = c => ({ hex: c.hex, contrast: c.contrast, moved: c.moved });

/** Everything the specimen says about a board, kind by kind. */
function full(name, texts, withPairs = false) {
  fresh();
  const acts = texts.map(text => ({ text, act: S.read(text) }));
  const r = run(acts.map(a => a.act || {}));
  if (r.short.length) throw new Error(`${name}: ${r.short.join(', ')} draws under 4.5:1 in the specimen; choose another board`);
  return {
    name, overflow: r.overflow,
    acts: acts.map((a, i) => ({ text: a.text, act: a.act, answer: r.answers[i] })),
    kinds: r.ks.map(k => {
      const c = r.ch.get(k.name);
      return {
        name: k.name, hue: k.hue, depth: k.depth, source: k.source, order: k.order, parent: k.parent, anchor: k.anchor, offset: k.offset, rel: k.rel, word: k.word,
        paper: { said: colourRow(S.colourOf(k, 'paper')), offered: colourRow(S.colourOf(k, 'paper', 'offered')) },
        dark: { said: colourRow(S.colourOf(k, 'dark')), offered: colourRow(S.colourOf(k, 'dark', 'offered')) },
        channel: { channel: c.channel, alike: c.alike, who: c.who },
      };
    }),
    ...(withPairs ? { pairs: r.pairs.map(p => ({ a: p.a, b: p.b, by: p.by, min: p.min })) } : {}),
    meaning: r.meaning,
  };
}

/** The same, a row a kind: what a board of seeded acts came to. */
function compact(name, acts) {
  fresh();
  const r = run(acts);
  return {
    name, overflow: r.overflow, short: r.short.length, acts: acts.map((a, i) => ({ act: a, answer: r.answers[i] })),
    kinds: r.ks.map(k => [k.name, k.hue, k.depth, k.source, S.colourOf(k, 'paper').hex, S.colourOf(k, 'paper', 'offered').hex, S.colourOf(k, 'dark').hex, S.colourOf(k, 'dark', 'offered').hex, r.ch.get(k.name).channel]),
    meaning: r.meaning,
  };
}

const scenarios = [full('seed', SEED, true)];
for (const e of EXAMPLES) scenarios.push(full(`seed, then ${JSON.stringify(e)}`, [...SEED, e]));
scenarios.push(full('seed, then every example', [...SEED, ...EXAMPLES]));
// Deeper than the two depths that are drawn: the third and fourth step share the second's colour.
scenarios.push(full('seed, then a chain three deep', [...SEED, 'detail is a kind of insight', 'footnote is a kind of detail', 'aside is a kind of hunch']));

const RANDOM_BOARDS = 24;
for (let seed = 1, made = 0; made < RANDOM_BOARDS && seed < 400; seed++) {
  const acts = randomActs(seed);
  const s = compact(`random ${String(seed).padStart(3, '0')}`, acts);
  if (s.overflow.length || s.short) continue;
  delete s.short;
  scenarios.push(s);
  made++;
}

// ---- writing it down --------------------------------------------------------

const grounds = Object.fromEntries(Object.entries(S.GROUNDS).map(([g, v]) => [g, { ground: v.ground, ink: v.ink, L: v.L, C: v.C, toward: v.toward }]));
const golden = {
  about: 'The colour space\'s specimen (brand/colour-space.html at ' + (arg('--rev') || SPECIMEN_REV) + ', 2 October 2026) run in Node on the seed acts, the page\'s examples and seeded random boards, and what it said written down. Made by core/src/colour/test/make-golden.mjs. core/src/colour must say the same: hues to 1e-6, hexes equal. A scenario with an `overflow` is one where the specimen ran out of patterns and repeated the last; core says so instead, so only its colours are held to the golden there.',
  palette: { grounds, signals: S.SIGNALS.map(s => ({ name: s.name, hex: s.hex, hue: s.hue })) },
  constants: { OFFERED: S.OFFERED, FLOOR: S.FLOOR, APART: S.APART, DEPTHS: S.DEPTHS, CHANNELS: S.CHANNELS },
  scenarios,
};

// One line an act, a kind, a pair and a sentence, so a diff reads a kind at a time.
const line = (indent, v) => ' '.repeat(indent) + JSON.stringify(v);
const list = (indent, items) => (items.length ? '[\n' + items.map(x => line(indent + 2, x)).join(',\n') + '\n' + ' '.repeat(indent) + ']' : '[]');
const scenarioText = sc => '    {\n' + Object.entries(sc).map(([k, v]) => '      ' + JSON.stringify(k) + ': ' + (Array.isArray(v) && v.some(x => typeof x === 'object') || k === 'meaning' ? list(6, v) : JSON.stringify(v))).join(',\n') + '\n    }';
const text = '{\n' + [
  '  "about": ' + JSON.stringify(golden.about),
  '  "palette": ' + JSON.stringify(golden.palette),
  '  "constants": ' + JSON.stringify(golden.constants),
  '  "scenarios": [\n' + golden.scenarios.map(scenarioText).join(',\n') + '\n  ]',
].join(',\n') + '\n}\n';
const out = arg('--out') || join(HERE, '../fixtures/specimen.golden.json');
writeFileSync(out, text);
console.log(`${scenarios.length} boards (${scenarios.filter(s => s.overflow.length).length} with an overflow), ${(text.length / 1024).toFixed(0)} KB → ${out}`);

// The words a person sees on the surface (the UX pass, UX-08; UX-AUDIT-2026-09-28.md's principles).
//
//   node --test scripts/words.test.mjs
//
// The canvas speaks the person's words: a mark, a thing made, a board, a picture, a room — never the engine's
// or a developer's. The audit's walk found the engine's words within the first minutes ("text · annotation"
// under a mark, "(2 live)" in the status line, "LIVING TEXT" in the panel, "the session as its log" on a tile,
// "basics@1" in the packs pane, "?live=claude&relay=http://127.0.0.1:8020" in the models pane). This test reads
// every string a person sees in the surface and fails on those words:
//
//   - the fragments' strings that are words (Demos/surface/*.js, never their tests): a string with two words in
//     it once its markup is out — a sentence, a tooltip, a button — and the values of the titles, placeholders
//     and labels its markup carries; and a string of one banned word on a line that shows it (an eyebrow, a
//     tile, the status line, a pill).
//   - the page (Demos/session-engine.html): its text, and its titles, placeholders and labels — never a comment,
//     a style or a script's code.
//   - the help pane's own strings are 20-controls.js's, so they are read with the fragments. HELP.md is not read
//     here: it is a page of its own, written for a person, and the docs keep it.
//
// Banned: artifact, live and living as a state ("(2 live)", "living page"), log, session, event, tier,
// participant, notation, a pack's id (basics@1), annotation, node and edge as words for what a mark plays,
// a local server's port (:11434, :1234), 127.0.0.1, and ?live= in prose. A command line — node Demos/mcp.mjs —
// names a program, never what a mark plays, and is no "node". Where a banned word must stand, the ALLOWLIST
// below says why; an entry that matches nothing fails, so the change that makes it unneeded removes it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stringRanges } from './strings.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const PAGE = 'Demos/session-engine.html';
const FRAGMENTS = readdirSync(join(root, 'Demos/surface')).filter((f) => /^\d\d-.*\.js$/.test(f)).sort().map((f) => 'Demos/surface/' + f);

/** The engine's and a developer's words, each with what it is called when it is found. */
const BANNED = [
  { word: 'artifact', re: /\bartifacts?\b/i },
  { word: 'live, as a state', re: /\blive\b|\bliving\b/i },
  { word: 'log', re: /\blogs?\b/i },
  { word: 'session', re: /\bsessions?\b/i },
  { word: 'event', re: /\bevents?\b/i },
  { word: 'tier', re: /\btiers?\b/i },
  { word: 'participant', re: /\bparticipants?\b/i },
  { word: 'notation', re: /\bnotations?\b/i },
  { word: 'a pack’s id', re: /\b[a-z][\w-]*@\d+\b/i },
  { word: 'annotation', re: /\bannotations?\b/i },
  // Lowercase: "Edge" is a browser.
  { word: 'node or edge, as what a mark plays', re: /\b(?:nodes?|edges?)\b/ },
  { word: 'a local server’s port', re: /:11434\b|:1234\b/ },
  { word: '127.0.0.1', re: /127\.0\.0\.1/ },
  { word: '?live=', re: /\?live=/ },
];

/**
 * Where a banned word may stand in what a person sees, and why. `files` is a list of paths; `at` is tested
 * against the words found (a string, a title, a text of the page). `optional`: the entry may match nothing —
 * only for a file another lane of this cycle owns, whose words may change under it.
 */
const ALLOWLIST = [
  {
    why: 'the models pane is the house-models lane’s this cycle (04-models.js, its markup and its fragments): what it says of models on this machine and of the door is theirs to word, and may change under this test — the entries go once that lane has said it in the person’s words',
    files: ['Demos/surface/04-models.js'], at: /:11434|127\.0\.0\.1|participant/, optional: true,
  },
  {
    why: 'the door, under the models pane’s *advanced*: an MCP server of your own through a bridge you start in a terminal — a developer’s way in, and its placeholder is the address that bridge listens on',
    files: ['Demos/surface/24-seat.js'], at: /^http:\/\/127\.0\.0\.1:8030 — the door$/,
  },
];

// ---- Reading what a person sees ------------------------------------------------------------------------------

const lineOf = (text, at) => text.slice(0, at).split('\n').length;
const lineAround = (text, at) => text.slice(text.lastIndexOf('\n', at - 1) + 1, (text.indexOf('\n', at) + 1 || text.length + 1) - 1);
const ATTRS = /\b(?:title|placeholder|aria-label|alt)="([^"]*)"/g;
const decode = (t) => t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, '\'').replace(/&[a-z]+;/g, ' ');
/** A command line names a program: `node Demos/mcp.mjs`, `node server.mjs`. */
const commandsOut = (t) => t.replace(/\bnode (?=[\w./-]+\.m?js\b|Demos\/|server\b)/g, '');

/** What a string shows: its text with markup out, and the titles, placeholders and labels in it. */
function shownOf(s) {
  const pieces = [];
  for (const m of s.matchAll(ATTRS)) pieces.push(m[1]);
  let t = s;
  // A string that begins inside a tag the string before it opened: `" data-id="…">play it here</button>`.
  const close = t.indexOf('>'), open = t.indexOf('<');
  if (close >= 0 && (open < 0 || close < open) && /^[^>]*["=]/.test(t)) t = t.slice(close + 1);
  t = t.replace(/<[^>]*>/g, ' ').replace(/<[^>]*$/, ' ');
  pieces.unshift(t);
  return pieces.map((p) => commandsOut(decode(p)).replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/** A string of code, not words: a program the surface builds for a frame, a style, a selector. */
const isCode = (s) => /^\s*(?:\/\/|\/\*|var |let |const |function\b|return\b|if \(|for \(|try \{|\}|\{|#[\w-]+[ ,.{]|\.[\w-]+[ ,{])/.test(s) || /=>|\);\s*$|;\s*$|\{[^}]*:[^}]*;/.test(s);
/** Two words, as a person reads them: side by side, or either side of a number or a dot (`tier 0 · shape`). */
const WORDS = /[a-z]{2,}(?:\s+|\s*[\d·—–]+\s*)+[a-z]{2,}/i;
/** A line that puts a single word on screen: an eyebrow, a tile, a row, the status line, a pill's label. */
const SHOWS_ONE_WORD = /eyebrow|ui\.tile\(|ui\.row\(|\bsay\(|\bflash\(|textContent|label:|\.title\s*=|'<span class="k">/;

/** Every piece of words a person sees in one fragment's source, with where it stands. */
function piecesOfSource(file, src) {
  const out = [];
  {
    for (const [a, b] of stringRanges(src)) {
      const s = src.slice(a, b);
      if (!s.trim() || isCode(s)) continue;
      const line = lineOf(src, a);
      // A piece of a sentence joined round a value — `'in room ' + name`, `' events…'`, `plural(n, 'event')`, a
      // fallback `|| 'artifact'` said where the name would be — is words a person reads, however few of them it holds.
      const before = src.slice(src.lastIndexOf('\n', a - 1) + 1, a - 1);
      const inSentence = /^\s|\s$/.test(s) || /\bplural\w*\([^()]*,\s*$/.test(before) || /(?:\|\||\?\?)\s*$/.test(before);
      for (const p of shownOf(s)) {
        const words = WORDS.test(p);
        // One word compared in code (folder.how === 'live') is a mode's name, never shown.
        const compared = /[!=]==?\s*$/.test(src.slice(Math.max(0, a - 6), a - 1)) || /^\s*[!=]==?/.test(src.slice(b + 1, b + 6));
        if (!words && (compared || !(BANNED.some((x) => x.re.test(p)) && (inSentence || (/^[\w@:.?=-]+$/.test(p) && SHOWS_ONE_WORD.test(lineAround(src, a))))))) continue;
        out.push({ file, line, text: p });
      }
    }
  }
  return out;
}

/** Every piece of words a person sees in each file, with where it stands. */
function pieces() {
  const out = [];
  for (const file of FRAGMENTS) out.push(...piecesOfSource(file, read(file)));
  {
    const html = read(PAGE);
    let seen = html.replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ' '));
    seen = seen.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, (c) => c.replace(/[^\n]/g, ' '));
    for (const m of seen.matchAll(ATTRS)) out.push({ file: PAGE, line: lineOf(seen, m.index), text: commandsOut(decode(m[1])).trim() });
    for (const m of seen.matchAll(/>([^<]+)</g)) {
      const t = commandsOut(decode(m[1])).replace(/\s+/g, ' ').trim();
      if (t) out.push({ file: PAGE, line: lineOf(seen, m.index), text: t });
    }
    // The <title> is words too, and the page's text between tags is read above.
  }
  return out;
}

/** Every banned word found, each with whether and why it may stand. */
function hits() {
  const found = [];
  for (const p of pieces()) {
    for (const b of BANNED) {
      const m = p.text.match(b.re);
      if (m) found.push({ file: p.file, line: p.line, word: b.word, match: m[0], text: p.text });
    }
  }
  return found;
}

function allowedBy(hit) {
  return ALLOWLIST.find((e) => e.files.includes(hit.file) && e.at.test(hit.text));
}

// ---- The tests -----------------------------------------------------------------------------------------------

test('what a string shows is its words and its titles — never its markup, and never a program’s code', () => {
  assert.deepEqual(shownOf('<div class="eyebrow">a living page</div>'), ['a living page']);
  assert.deepEqual(shownOf('<button class="mini" title="the session as its log">save</button>'), ['save', 'the session as its log']);
  assert.deepEqual(shownOf('" data-id="x">play it here</button>'), ['play it here']);
  assert.deepEqual(shownOf('run it with node Demos/mcp.mjs'), ['run it with Demos/mcp.mjs']);
  assert.ok(isCode('  var t0 = performance.now(), last = t0;'));
  assert.ok(isCode('#out .node rect,#out .node polygon{fill:transparent}'));
  assert.ok(!isCode('the board as a picture'));
});

test('a word joined into a sentence round a value is read, and a key, a mode or a compared word is not', () => {
  const src = [
    "say('in room ' + room + ' · you are ' + me);",
    "return 'live ' + roomShort(name) + ' · you are ' + me;",
    "const said = name + ' — its ' + plural(n, 'event') + ' in one file';",
    "const what = wordOf(node) || 'artifact';",
    "html += '<span class=\"tier\">' + (tier === 0 ? 'tier 0 · shape' : 'tier ' + tier) + '</span>';",
    "if (folder.how === 'live') go();",
    "const ch = new BroadcastChannel('mm-live:' + room);",
    "params.has('live');",
  ].join('\n');
  const read = piecesOfSource('x.js', src).map((p) => p.text).filter((t) => BANNED.some((b) => b.re.test(t)));
  assert.deepEqual(read, ['live', 'event', 'artifact', 'tier 0 · shape', 'tier']);
});

test('the banned words are found where a person reads them', () => {
  const said = (t) => BANNED.filter((b) => b.re.test(t)).map((b) => b.word);
  assert.deepEqual(said('2 things made (2 live)'), ['live, as a state']);
  assert.deepEqual(said('text · annotation'), ['annotation']);
  assert.deepEqual(said('from the Basics pack (basics@1)'), ['a pack’s id']);
  assert.deepEqual(said('open this page with ?live=claude&relay=http://127.0.0.1:8020'), ['live, as a state', '127.0.0.1', '?live=']);
  assert.deepEqual(said('Chrome and Edge can'), []);
  assert.deepEqual(said('the board as a file of its own'), []);
});

test('a person reads the person’s words on the surface — never the engine’s or a developer’s, outside the allowlist', () => {
  const all = pieces();
  assert.ok(all.length > 300, `the test read only ${all.length} pieces of words — is it reading the fragments and the page?`);
  const wrong = hits().filter((h) => !allowedBy(h));
  assert.deepEqual(wrong.map((h) => `${h.file}:${h.line} [${h.word}: “${h.match}”] ${h.text.slice(0, 150)}`), [],
    `${wrong.length} place(s) a person reads the engine’s or a developer’s words — say it in the person’s (UX-AUDIT-2026-09-28 §principles)`);
});

test('every allowlist entry says why, and is still needed', () => {
  const found = hits();
  for (const e of ALLOWLIST) {
    assert.ok(e.why && e.why.length > 20, 'an allowlist entry must say why');
    if (e.optional) continue;
    assert.ok(found.some((h) => allowedBy(h) === e), `an allowlist entry matches nothing now — remove it: ${e.why}`);
  }
});

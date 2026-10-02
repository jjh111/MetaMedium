// The name a person sees (RENAME-PLAN.md §1, unit N3a).
//
//   node --test scripts/name.test.mjs
//
// The product is dyna.ink, and the 3D surface DynaInk3D (§1 is the one home of
// the spellings). This test reads every file a person sees in the product — the
// whitepaper and its 404, the app at both addresses and their manifests, the
// help, the 3D surface's page, and the strings of the surface's fragments — and
// fails on "MetaMedium", in any case, except where it is:
//
//   - inside an ADDRESS: a URL, a host and path, a path the site serves, a file
//     name. The repository and its Pages path keep the old name until H1, and an
//     address changed is a link broken.
//   - the IDEA: Alan Kay's "metamedium", lowercase, a word on its own — what the
//     whitepaper argues for, never the name of the product.
//   - the TITLE of an outside work (the Substack posts "A Day with MetaMedium").
//   - on the ALLOWLIST below, each entry with its reason, and with the unit that
//     takes it away. An entry that matches nothing fails too, so the unit that
//     makes it unneeded removes it.
//
// What a person sees is what is read: in a page, the markup — text and
// attributes — but not its comments, a style's comments, or the code of an
// inline script, only that script's strings; in a fragment, its string
// literals and nothing else. A wordmark split by markup (<span>Meta</span>Medium)
// is read as the one word it shows.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const PAGES = ['index.html', '404.html', 'Demos/session-engine.html', 'app/index.html', 'shard-3d/index.html'];
const WHOLE = ['Demos/manifest.webmanifest', 'app/manifest.webmanifest', 'HELP.md'];
// The fragments the build concatenates (Demos/build-surface.mjs), never their tests.
const FRAGMENTS = readdirSync(join(root, 'Demos/surface')).filter((f) => /^\d\d-.*\.js$/.test(f)).sort().map((f) => 'Demos/surface/' + f);

/** The titles of outside works that carry the old name. They are cited, never renamed. */
const OUTSIDE_TITLES = [/A Day with MetaMedium/i];

/**
 * Where the old name may stand in what a person sees, and why. `files` is a list of paths, or null for any;
 * `at` is tested against the text around the hit (its line); `max` caps how many hits one file may have.
 */
const ALLOWLIST = [
  {
    why: 'the one sentence a returning reader needs — "formerly MetaMedium" — at most once per page (RENAME-PLAN N3a)',
    files: null, at: /formerly MetaMedium/, max: 1,
  },
  {
    why: 'the version tag\'s name, <meta name="metamedium-version">, and every reader of it by name: N3b renames the tag and its readers together',
    until: 'N3b',
    files: ['Demos/session-engine.html', 'app/index.html', 'Demos/surface/17-folder.js', 'Demos/surface/20-controls.js'],
    at: /metamedium-version/,
  },
  {
    why: 'a key in this browser\'s storage, the paper/canvas preference — kept like the mm-* keys and metamedium_library_v1 (RENAME-PLAN §2): renaming it forgets every reader\'s choice',
    files: ['index.html'], at: /['"]metamedium-brand-theme['"]/,
  },
  {
    why: 'the whitepaper\'s license line, which N2 rewrites (AGPL-3.0-only, the prose under CC BY 4.0)',
    until: 'N2',
    files: ['index.html'], at: /License:<\/strong> GPL — the MetaMedium framework is open source/,
  },
];

// ---- Reading what a person sees --------------------------------------------------------------------------------

/** `text` with [from, to) blanked: every character a space, line breaks kept, so offsets and lines stand. */
function blank(text, from, to) {
  return text.slice(0, from) + text.slice(from, to).replace(/[^\n]/g, ' ') + text.slice(to);
}

const REGEX_AFTER_WORD = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'instanceof', 'yield', 'await']);

/**
 * The string literals of a script, as [from, to) ranges of their contents — single, double and the static parts
 * of template literals, through `${…}` however deep. Comments and regular expressions are read past, never as
 * strings. A scanner, not a parser: it knows what it needs to tell a string from everything else.
 */
export function stringRanges(src) {
  const out = [];
  let i = 0;
  const n = src.length;
  /** The last significant character or word before `at`, to tell a regex from a division. */
  const regexAllowed = (at) => {
    let j = at - 1;
    while (j >= 0 && /\s/.test(src[j])) j--;
    if (j < 0) return true;
    const c = src[j];
    if (/[(,=:[!&|?{};+\-*%<>~^]/.test(c)) return true;
    if (/[\w$]/.test(c)) {
      let k = j;
      while (k >= 0 && /[\w$]/.test(src[k])) k--;
      return REGEX_AFTER_WORD.has(src.slice(k + 1, j + 1));
    }
    return false;
  };
  const quoted = (q) => { // at the opening quote
    const start = ++i;
    while (i < n && src[i] !== q && src[i] !== '\n') i += src[i] === '\\' ? 2 : 1;
    out.push([start, i]);
    i++;
  };
  const regex = () => { // at the opening slash
    i++;
    let cls = false;
    while (i < n && src[i] !== '\n') {
      const c = src[i];
      if (c === '\\') { i += 2; continue; }
      if (cls) { if (c === ']') cls = false; } else if (c === '[') cls = true; else if (c === '/') break;
      i++;
    }
    i++;
    while (i < n && /[a-z]/i.test(src[i])) i++;
  };
  const template = () => { // at the opening backtick
    let start = ++i;
    while (i < n) {
      const c = src[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '`') { out.push([start, i]); i++; return; }
      if (c === '$' && src[i + 1] === '{') { out.push([start, i]); i += 2; code(true); start = i; continue; }
      i++;
    }
    out.push([start, i]);
  };
  const code = (inBraces) => {
    let depth = 0;
    while (i < n) {
      const c = src[i];
      if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
      if (c === '\'' || c === '"') { quoted(c); continue; }
      if (c === '`') { template(); continue; }
      if (c === '/' && regexAllowed(i)) { regex(); continue; }
      if (c === '{') depth++;
      if (c === '}') { if (inBraces && depth === 0) { i++; return; } depth--; }
      i++;
    }
  };
  code(false);
  return out;
}

/** A script with everything but its strings blanked. */
function scriptStrings(src) {
  let kept = src.replace(/[^\n]/g, ' ');
  for (const [a, b] of stringRanges(src)) kept = kept.slice(0, a) + src.slice(a, b) + kept.slice(b);
  return kept;
}

/** A page with its comments, its styles' comments and its inline scripts' code blanked; markup and strings stay. */
function pageSeen(html) {
  let seen = html;
  for (const m of html.matchAll(/<!--[\s\S]*?-->/g)) seen = blank(seen, m.index, m.index + m[0].length);
  for (const m of html.matchAll(/(<style\b[^>]*>)([\s\S]*?)<\/style>/gi)) {
    const body = m.index + m[1].length;
    for (const c of m[2].matchAll(/\/\*[\s\S]*?\*\//g)) seen = blank(seen, body + c.index, body + c.index + c[0].length);
  }
  for (const m of html.matchAll(/(<script\b[^>]*>)([\s\S]*?)<\/script>/gi)) {
    const body = m.index + m[1].length;
    seen = seen.slice(0, body) + scriptStrings(seen.slice(body, body + m[2].length)) + seen.slice(body + m[2].length);
  }
  return seen;
}

/**
 * The words a page shows, its tags taken out — so a wordmark split by markup reads as one word — with, for each
 * character, where it stood in the page.
 */
function shownText(seen) {
  let text = '';
  const at = [];
  let i = 0;
  while (i < seen.length) {
    if (seen[i] === '<') {
      const e = seen.indexOf('>', i);
      if (e > 0 && /^<\/?[a-z!]/i.test(seen.slice(i, i + 3))) { i = e + 1; continue; }
    }
    text += seen[i]; at.push(i); i++;
  }
  return { text, at };
}

// ---- Telling the cases apart -----------------------------------------------------------------------------------

const lineOf = (text, at) => text.slice(0, at).split('\n').length;
const lineAround = (text, at) => text.slice(text.lastIndexOf('\n', at - 1) + 1, (text.indexOf('\n', at) + 1 || text.length + 1) - 1);

/** The run of characters a hit stands in, up to a space, a quote or a bracket. */
function tokenAround(text, from, to) {
  const stop = /[\s"'`<>()[\]{},;]/;
  let a = from, b = to;
  while (a > 0 && !stop.test(text[a - 1])) a--;
  while (b < text.length && !stop.test(text[b])) b++;
  return text.slice(a, b);
}

/** An address: a URL, a host and path, a path the site serves, or a file's name. */
function isAddress(token) {
  const t = token.replace(/[.,:;!?…]+$/, '');
  return t.includes('://') || t.includes('/') || /\.(html?|m?js|css|png|jpe?g|gif|svg|json|webmanifest|md|zip|log|ico)$/i.test(t);
}

/** Kay's idea: "metamedium", lowercase, a word of its own (a plural too) — never part of a name, a key or a path. */
function isIdea(text, from, to) {
  if (text.slice(from, to) !== 'metamedium') return false;
  const before = text[from - 1] || ' ';
  const after = text.slice(to, to + 2);
  if (/[\w./\-]/.test(before)) return false;
  const rest = after[0] === 's' ? text.slice(to + 1, to + 3) : after;
  return !/^[\w/\-_]/.test(rest) && !/^\.\w/.test(rest);
}

function isOutsideTitle(line) {
  return OUTSIDE_TITLES.some((t) => t.test(line));
}

/** Every hit of the old name in what a person sees of each file, each with whether and why it may stand. */
function hits() {
  const found = [];
  const look = (file, seen, source, place) => {
    for (const m of seen.matchAll(/metamedium/gi)) {
      const from = m.index, to = from + m[0].length;
      const p = place ? place(from, to) : { from, to, split: false };
      const line = lineAround(source, p.from);
      found.push({
        file, line: lineOf(source, p.from), text: line.trim(), split: p.split,
        address: !p.split && isAddress(tokenAround(seen, from, to)),
        idea: isIdea(seen, from, to),
        title: isOutsideTitle(line),
      });
    }
  };
  for (const file of PAGES) {
    const html = read(file);
    const seen = pageSeen(html);
    look(file, seen, html);
    // A wordmark split by markup: the hits the page's own text holds only once its tags are out.
    const shown = shownText(seen);
    for (const m of shown.text.matchAll(/metamedium/gi)) {
      const from = shown.at[m.index], to = shown.at[m.index + m[0].length - 1] + 1;
      if (!seen.slice(from, to).includes('<')) continue; // read already, whole
      found.push({ file, line: lineOf(html, from), text: lineAround(html, from).trim(), split: true, address: false, idea: false, title: isOutsideTitle(shown.text.slice(Math.max(0, m.index - 40), m.index + 50)) });
    }
  }
  for (const file of WHOLE) { const t = read(file); look(file, t.replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ' ')), t); }
  for (const file of FRAGMENTS) { const t = read(file); look(file, scriptStrings(t), t); }
  return found;
}

function allowedBy(hit) {
  return ALLOWLIST.find((e) => (!e.files || e.files.includes(hit.file)) && e.at.test(hit.text));
}

// ---- The tests -------------------------------------------------------------------------------------------------

test('the scanner tells a string from a comment, a regular expression and code', () => {
  const src = [
    'const a = "one"; // "not this"',
    "/* 'nor this' */ const b = 'two';",
    'const r = /["\']MetaMedium/g, d = x / 2 / y;',
    'const t = `three ${ok ? "four" : `five ${"six"}`} seven`;',
    'if (z) return /re/.test("eight");',
  ].join('\n');
  const got = stringRanges(src).map(([a, b]) => src.slice(a, b)).filter(Boolean);
  assert.deepEqual(got, ['one', 'two', 'three ', 'four', 'five ', 'six', '', ' seven', 'eight'].filter(Boolean));
});

test('what a page shows is its markup and its scripts\' strings — never a comment or a script\'s code', () => {
  const page = '<title>A</title><!-- MetaMedium --><style>/* MetaMedium */ .x{}</style>'
    + '<script>const MM = window.MetaMediumCore; const k = "metamedium-key";</script><h1><span>Meta</span>Medium</h1>';
  const seen = pageSeen(page);
  assert.equal([...seen.matchAll(/metamedium/gi)].length, 1, seen);
  assert.match(seen, / metamedium-key /, "a script's strings stay, its quotes and its code do not");
  assert.match(shownText(seen).text, /MetaMedium$/);
});

test('an address, the idea and an outside title are told apart from the name', () => {
  for (const t of ['https://jjh111.github.io/MetaMedium/', 'github.com/jjh111/MetaMedium', 'Demos/metamedium-core.browser.js',
    'metamedium-core.browser.js', 'MetaMedium_Whitepaper_v4.html', 'thumb-metamedium-v5.png', '.metamedium/logs']) assert.ok(isAddress(t), t);
  for (const t of ['MetaMedium', 'MetaMedium’s', 'metamedium-version', 'METAMEDIUM']) assert.ok(!isAddress(t), t);
  const idea = (s) => { const i = s.search(/metamedium/i); return isIdea(s, i, i + 10); };
  for (const s of ['the computer is a metamedium—it', 'toward a truly metamedium.', 'Dynabook\'s metamedium concept', 'two metamediums, side by side']) assert.ok(idea(s), s);
  for (const s of ['MetaMedium is', 'The Metamedium is', 'name="metamedium-version"', 'metamedium_library_v1', 'METAMEDIUM ']) assert.ok(!idea(s), s);
  assert.ok(isOutsideTitle('read “A Day with MetaMedium” on Substack'));
});

test('a person sees dyna.ink, never MetaMedium — outside an address, the idea, an outside title and the allowlist', () => {
  const all = hits();
  const named = all.filter((h) => !h.address && !h.idea && !h.title);
  const wrong = named.filter((h) => !allowedBy(h));
  assert.ok(all.length > 0, 'the test found no addresses or ideas at all — is it reading the files?');
  assert.deepEqual(wrong.map((h) => `${h.file}:${h.line}${h.split ? ' (split by markup)' : ''} — ${h.text.slice(0, 160)}`), [],
    `${wrong.length} place(s) a person sees name the product MetaMedium — say dyna.ink (DynaInk3D for the 3D surface; RENAME-PLAN §1)`);
});

test('every allowlist entry is still needed, says why, and keeps to its count', () => {
  const named = hits().filter((h) => !h.address && !h.idea && !h.title);
  for (const e of ALLOWLIST) {
    assert.ok(e.why && e.why.length > 20, 'an allowlist entry must say why');
    const used = named.filter((h) => allowedBy(h) === e);
    assert.ok(used.length > 0, `an allowlist entry matches nothing now — remove it: ${e.why}`);
    if (e.max) {
      const per = new Map();
      for (const h of used) per.set(h.file, (per.get(h.file) || 0) + 1);
      for (const [file, count] of per) assert.ok(count <= e.max, `${file} has ${count} of “${e.at.source}”, at most ${e.max}: ${e.why}`);
    }
  }
});

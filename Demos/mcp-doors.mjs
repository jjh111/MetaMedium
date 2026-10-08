// The doors, and the formats that flow through them (V1-SPEC §3.13, CG7a).
//
// John wants a dev agent to use every door of the system first-hand, so the pipeline is understood and the
// formats are reasoned about as they actually flow. The contracts have ONE home, the code, so nothing here is
// a copy of a document: `canvas_doors` reads each door from the code that is the door —
//
//   - the engine this hand runs (the committed Node bundle): the shapes the pen draws, each probed now; every
//     brief a seat answers, its contract as core's participants send it, run against a scratch session in
//     which nothing is ever parked in the room; the log's header and version; the Mermaid writers and readers;
//   - the page's own code, read from the checkout as it stands (`Demos/surface/*.js`): the seats' rules and
//     what each is for (03-seats.js), the bundle and the SVG (17-bundle.js, loaded exactly as the unit test
//     loads it), and — taken out of their fragment by name, because the rest of that fragment needs a DOM —
//     the functions the export pane and *From a file…* run (18-out.js's `boardLayers`, 17-folder.js's
//     `readLogText`);
//   - the other hands' source: the 3D hand's tool table, the canvas's client door (Demos/mcp-client.mjs and
//     the page's mapping of what a server's tools are for), the servers `.mcp.json` registers.
//
// What it cannot read it says; what is not built it says as such. Nothing here writes into the room: an export
// is a file in the OS temp directory (or where the caller names, outside the repository), an import is read
// into a scratch session. No dependency, no network — the engine's own functions and the files on this machine.
//
// A scanner, not a parser: pulling a function out of a fragment needs only to know where a statement ends,
// which means reading past strings, templates, comments and regular expressions. If the page's code moves
// so that a name cannot be found, the door that needs it says so in a sentence (and the smoke fails): a
// loud break rather than a copy that drifts.

import { readFileSync, existsSync, statSync, realpathSync, mkdtempSync, writeFileSync, openSync, readSync, closeSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { DEFAULT_MAX_LINES, MAX_ASSET_BYTES } from './relay-protocol.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
/** The checkout this hand runs from. Nothing is ever written inside it. */
export const REPO_ROOT = path.resolve(here, '..');
const read = (rel) => readFileSync(path.join(REPO_ROOT, rel), 'utf8');

/** The version of dyna.ink this checkout is (`VERSION`), or '' when it holds none: what a log says wrote it. */
export function appVersion() {
  try { return read('VERSION').trim(); } catch { return ''; }
}

// ----- Reading the page's own code ---------------------------------------------------------------------------

/** The index of the last character of the string or template literal that begins at `i`. */
function quotedEnd(src, i) {
  const q = src[i];
  for (let j = i + 1; j < src.length; j++) {
    const c = src[j];
    if (c === '\\') { j++; continue; }
    if (c === q) return j;
    if (q === '`' && c === '$' && src[j + 1] === '{') {
      const e = statementEnd(src, j + 1, 'block');
      if (e < 0) return src.length - 1;
      j = e - 1;
    }
  }
  return src.length - 1;
}

/** The index of the last character of the regular expression that begins at `i`, or `i` when it is no regular expression. */
function regexEnd(src, i) {
  let inClass = false;
  for (let j = i + 1; j < src.length; j++) {
    const c = src[j];
    if (c === '\\') { j++; continue; }
    if (c === '\n') return i;
    if (inClass) { if (c === ']') inClass = false; continue; }
    if (c === '[') inClass = true;
    else if (c === '/') return j;
  }
  return i;
}

/**
 * The index just past the statement that begins at `start`: a block (from its `{`), a function declaration (to the brace
 * that closes its body) or a `const` (to its `;`). -1 when there is none.
 */
export function statementEnd(src, start, mode) {
  let depth = 0, prev = '';
  for (let i = start; i < src.length; i++) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { const e = src.indexOf('\n', i); if (e < 0) return -1; i = e; continue; }
    if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); if (e < 0) return -1; i = e + 1; continue; }
    if (c === '"' || c === "'" || c === '`') { i = quotedEnd(src, i); prev = c; continue; }
    if (c === '/' && (prev === '' || '(,=:[!&|?{};+-*%<>~^'.includes(prev))) { const e = regexEnd(src, i); if (e > i) { i = e; prev = '/'; continue; } }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') { depth--; if (c === '}' && depth === 0 && mode !== 'const') return i + 1; }
    else if (c === ';' && depth === 0 && mode === 'const') return i + 1;
    if (!/\s/.test(c)) prev = c;
  }
  return -1;
}

/** Where `function name(…) { … }` or `const name = …;` stands in a fragment, at its own indentation: `{ start, end }` or null. */
function declarationOf(src, name) {
  const m = new RegExp('^[ \\t]*((?:async\\s+)?function\\s+' + name + '\\s*\\(|const\\s+' + name + '\\s*=)', 'm').exec(src);
  if (!m) return null;
  const start = m.index + m[0].indexOf(m[1]);
  const end = statementEnd(src, start, /^const/.test(m[1]) ? 'const' : 'function');
  return end < 0 ? null : { start, end };
}

/**
 * Functions the page runs, taken out of its fragments by name and built here over the names they use. `from` is
 * `[{ file, names }]` (files relative to the repository); `env` the free names they need, which this hand supplies from
 * the engine and from the session it holds. Throws a sentence when a name is not where it was.
 */
export function pageCode(from, env = {}) {
  const parts = [], names = [];
  for (const { file, names: wanted } of from) {
    const src = read(file);
    for (const name of wanted) {
      const d = declarationOf(src, name);
      if (!d) throw new Error('could not find ' + name + ' in ' + file + ' — the page\'s code has moved since this hand was written');
      parts.push(src.slice(d.start, d.end));
      names.push(name);
    }
  }
  const keys = Object.keys(env);
  return new Function(...keys, parts.join('\n') + '\nreturn { ' + names.join(', ') + ' };')(...keys.map((k) => env[k]));
}

/** A pure surface fragment (one that names nothing outside itself), loaded whole as its unit test loads it. */
export function fragment(file, wanted) {
  const src = read('Demos/surface/' + file);
  return new Function(src + '\n  return { ' + wanted.map((n) => n + ': typeof ' + n + " === 'undefined' ? undefined : " + n).join(', ') + ' };')();
}

/** The names the export and import doors use from the bundle fragment (17-bundle.js) and the asset fragment (17-assets.js). */
const BUNDLE_NAMES = ['zipWrite', 'zipRead', 'isZipBytes', 'bundleBuild', 'bundleRead', 'bundleName', 'boardSvg', 'pictureDataUrl', 'BUNDLE_LOG', 'pngPlan', 'pdfPlan', 'pdfWrite'];
export const bundleFragment = () => fragment('17-bundle.js', BUNDLE_NAMES);
export const assetFragment = () => fragment('17-assets.js', ['assetsOfEvents', 'isAssetRef']);

// ----- Reading the other hands ---------------------------------------------------------------------------------

/**
 * A hand's tool table — `const TOOLS = [ … ]` in its source — as `[{ name, description, inputSchema }]`, read now. The
 * `run:` lines are left out and the constants the table names (`num`, `vec`) are the `const` lines just above it.
 * Throws a sentence when the table is not there.
 */
export function readToolTable(rel) {
  const src = read(rel);
  const at = src.search(/^const TOOLS = \[/m);
  if (at < 0) throw new Error('no tool table (const TOOLS = [ … ]) in ' + rel);
  const end = statementEnd(src, at, 'const');
  if (end < 0) throw new Error('could not find where the tool table in ' + rel + ' ends');
  const literal = src.slice(at, end).replace(/^\s*run:\s*[A-Za-z_$][\w$]*,?\s*$/gm, '');
  const before = src.slice(0, at).split('\n');
  while (before.length && !before[before.length - 1].trim()) before.pop();
  const prelude = [];
  for (let i = before.length - 1; i >= 0 && /^const /.test(before[i]); i--) prelude.unshift(before[i]);
  const tools = new Function(prelude.join('\n') + '\n' + literal + '\nreturn TOOLS;')();
  return tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }));
}

/** The first sentence of a description, cut where it would run long. */
const firstSentence = (text, max = 150) => {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  const m = /^(.+?\.)(\s|$)/.exec(t);
  const s = m && m[1].length <= max ? m[1] : t;
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const at = Math.max(cut.lastIndexOf(', '), cut.lastIndexOf(': '), cut.lastIndexOf('; '), cut.lastIndexOf(' — '));
  return (at > max * 0.5 ? cut.slice(0, at) : cut.replace(/\s+\S*$/, '')) + ' …';
};
/** `canvas_look (detail, ids)` — the properties of a tool's input, the required ones starred. */
const argsOf = (schema) => {
  const props = Object.keys((schema && schema.properties) || {});
  const req = new Set((schema && schema.required) || []);
  return props.length ? ' (' + props.map((p) => p + (req.has(p) ? '*' : '')).join(', ') + ')' : '';
};

/** The comment lines that stand from the first line matching `marker` until the first line that is not a comment. */
function commentBlock(src, marker) {
  const lines = src.split('\n');
  const at = lines.findIndex((l) => marker.test(l));
  if (at < 0) return [];
  const out = [];
  for (let i = at; i < lines.length && /^\s*\/\//.test(lines[i]); i++) out.push(lines[i].replace(/^\s*\/\/ ?/, ''));
  return out;
}

/** What the canvas's client door is, read from Demos/mcp-client.mjs and from the page's mapping of what a server's tools are for. */
function clientDoorLines() {
  const lines = [];
  try {
    const src = read('Demos/mcp-client.mjs');
    const usage = (/console\.error\('usage: ([^']+)'\)/.exec(src) || [])[1];
    const port = /process\.env\.(MM_[A-Z_]+) \|\| (\d+)/.exec(src);
    const routes = [...src.matchAll(/req\.method === '(\w+)' && req\.url === '([^']+)'/g)].map((m) => m[1] + ' ' + m[2]);
    lines.push('the canvas\'s client door (Demos/mcp-client.mjs) — the canvas calls OUT to an MCP server; the browser can spawn nothing and most servers send no CORS headers, so this small process is the door for both:');
    if (usage) lines.push('  start: ' + usage);
    if (port) lines.push('  listens on 127.0.0.1, port ' + port[2] + ' unless ' + port[1] + ' says another; CORS open, loopback only');
    if (routes.length) lines.push('  routes: ' + routes.join(' · '));
    for (const l of commentBlock(src, /^\/\/ Endpoints/)) lines.push('  ' + l);
  } catch (err) { lines.push('the canvas\'s client door (Demos/mcp-client.mjs): could not be read — ' + (err && err.message || err)); }
  try {
    const src = read('Demos/surface/04-models.js');
    const block = commentBlock(src, /^\s*\/\/ Bidirectional: Demos\/mcp\.mjs/);
    const guess = [...src.matchAll(/^\s*(read|answer|draw): guessTool\(tools, \[([^\]]*)\]\)/gm)].map((m) => m[1] + ' ← a tool whose name has ' + m[2].replace(/'/g, '').replace(/,\s*/g, ', '));
    lines.push('  the page (Demos/surface/04-models.js, models pane ▸ MCP server) maps three roles from the server\'s tools — the person picks, the page guesses by name — each with a contract:');
    const from = block.findIndex((x) => /^\s*read:/.test(x));
    if (from < 0) lines.push('    (the comment that says so is not where it was — read mcpAgent in Demos/surface/04-models.js)');
    else for (const l of block.slice(from)) lines.push('  ' + l);
    if (guess.length) lines.push('  guessed by name: ' + guess.join(' · '));
  } catch (err) { lines.push('  the page\'s mapping (Demos/surface/04-models.js): could not be read — ' + (err && err.message || err)); }
  return lines;
}

/** How a session is woken for a brief, read from the watcher's own header: an MCP server cannot speak first. */
function watcherLines() {
  try {
    const block = commentBlock(read('Demos/seat-watch.mjs'), /^\/\/ The seat's watcher/);
    const usage = block.filter((l) => /^\s{2,}(node|MM_)/.test(l)).map((l) => '    ' + l.trim());
    return ['waking a session — an MCP server cannot speak first, so a silent watcher (Demos/seat-watch.mjs) prints one line per brief parked and writes nothing to the room; put it under a session\'s Monitor tool and each line is the session woken:', ...usage];
  } catch (err) { return ['waking a session — Demos/seat-watch.mjs could not be read: ' + (err && err.message || err)]; }
}

/** The servers `.mcp.json` registers for a Claude Code session, as `name → command args`. */
function registeredServers() {
  try {
    const j = JSON.parse(read('.mcp.json'));
    return Object.entries(j.mcpServers || {}).map(([name, s]) => name + ' → ' + [s.command].concat(s.args || []).join(' '));
  } catch { return null; }
}

// ----- The pen ------------------------------------------------------------------------------------------------------

/** The shapes a pen draws, each probed now: parsed by core's `parseShapes`, drawn by `strokeFor`, and read back by the engine on a scratch session. */
function penLines(MM, tool) {
  const lines = ['== THE PEN =='];
  lines.push('canvas_draw draws as a hand\'s pen does: marks are declared content (never a gesture), drawn in this hand\'s colour, and read by the same engine as anyone\'s — the shape rung, then roles, concepts and notations.');
  const s = MM.createSession({ ...MM.DEFAULT_SESSION_CONFIG });
  const t0 = Date.now();
  const probes = [
    ['rectangle', '{shape, x, y, w, h}', { shape: 'rectangle', x: 100, y: 100, w: 160, h: 90 }],
    ['circle', '{shape, x, y, w, h}  — the box the circle fills', { shape: 'circle', x: 100, y: 100, w: 120, h: 120 }],
    ['triangle', '{shape, x, y, w, h}', { shape: 'triangle', x: 100, y: 100, w: 140, h: 120 }],
    ['line', '{shape, from: {x, y}, to: {x, y}}', { shape: 'line', from: { x: 100, y: 100 }, to: { x: 300, y: 100 } }],
    ['arrow', '{shape, from: {x, y}, to: {x, y}}  — from the tail to the tip', { shape: 'arrow', from: { x: 100, y: 100 }, to: { x: 300, y: 100 } }],
  ];
  lines.push('the shapes core\'s parser takes (parseShapes) and strokeFor draws, each drawn and read back just now on a scratch session:');
  probes.forEach(([name, form, arg], i) => {
    const shape = MM.parseShapes(JSON.stringify([arg]))[0];
    const pts = shape && MM.strokeFor(shape);
    let said = 'NOT ACCEPTED by parseShapes — a defect, the pen cannot draw it';
    if (pts) {
      const id = s.addStroke(pts, t0 + i, undefined, 1, { content: true });
      const node = id && s.getState().nodes.get(id);
      const top = node && MM.interpretationsOf(node, s.getState().nodes)[0];
      said = 'a stroke of ' + pts.length + ' points, read as ' + (top ? top.label + ' ' + top.weight.toFixed(2) : 'nothing');
    }
    lines.push('  ' + name + ' ' + form + ' → ' + said);
  });
  const alias = (spelling, as) => { const got = MM.parseShapes(JSON.stringify([{ shape: spelling, x: 0, y: 0, w: 10, h: 10 }]))[0]; return got && got.shape === as ? spelling : null; };
  const spelled = [alias('rect', 'rectangle'), alias('box', 'rectangle'), alias('ellipse', 'circle')].filter(Boolean);
  const kind = MM.parseShapes(JSON.stringify([{ type: 'circle', x: 0, y: 0, width: 10, height: 10 }])).length === 1;
  const ends = MM.parseShapes(JSON.stringify([{ shape: 'line', x1: 0, y1: 0, x2: 10, y2: 10 }])).length === 1;
  lines.push('  also taken: ' + [spelled.length ? spelled.join(', ') + ' as a shape\'s name' : '', kind ? 'type or kind for shape, width and height for w and h' : '', ends ? 'x1, y1, x2, y2 for from and to' : ''].filter(Boolean).join(' · '));
  lines.push('  a shape outside this vocabulary is dropped. Core\'s parser keeps at most ' + MM.MAX_DRAWN + ' a batch (MAX_DRAWN), so this hand sends a longer list in batches of that size and draws it whole.');
  const props = tool && tool.inputSchema && tool.inputSchema.properties;
  lines.push('raw strokes: strokes: [[{x, y}, …], …] — two points or more each, canvas units, in the order the pen moved' + (props && props.gesture ? '; gesture: true leaves them as ink the engine may read as a lasso, a mark or a scratch, instead of declared content' : '') + '.');
  if (props) lines.push('canvas_draw\'s input, from its own schema: ' + Object.keys(props).join(', ') + ' — why is placed beside the marks as an answer.');
  return lines;
}

// ----- The seats ----------------------------------------------------------------------------------------------------

/** The data URL a seat's picture stands as: the hand renders the ink itself, so what the scratch call sends is never looked at. */
const PICTURE = 'data:image/png;base64,AA';

/**
 * Every brief the seat answers, as a page parks it: core's seat participant run against a scratch session — a board of
 * two boxes, a scrawl of writing and a page made of the boxes — with every method it has. Each brief is read back off the
 * scratch session's own plane (`seatBriefs`) and taken back at once; nothing is parked anywhere else.
 * `[{ key, variant, head, asked, contract, brief }]`; a method that parked nothing is `{ key, variant, error }`.
 */
export async function seatBriefs(MM) {
  const s = MM.createSession({ ...MM.DEFAULT_SESSION_CONFIG });
  const seat = MM.createSeatParticipant(s, 0, { baseUrl: 'http://127.0.0.1:1', timeoutMs: 5000 });
  const t0 = Date.now();
  let t = t0;
  const at = () => ++t;
  const a = s.addStroke(MM.strokeFor({ shape: 'rectangle', x: 100, y: 100, w: 160, h: 100 }), at(), undefined, 1);
  const b = s.addStroke(MM.strokeFor({ shape: 'rectangle', x: 320, y: 100, w: 160, h: 100 }), at(), undefined, 1);
  const word = s.addStroke(Array.from({ length: 99 }, (_, i) => ({ x: 100 + i * 3, y: 400 - 20 * Math.abs(Math.sin(i / 4)) })), at(), undefined, 1);
  const summon = s.summonMarks([a, b], at());
  const art = summon && s.bless({ summonId: summon, name: 'cards', at: at() });
  const plan = [
    ['what', '', () => seat.interpret([a, b], at())],
    ['read', '', () => seat.read({ nodeId: word, image: PICTURE, at: at() })],
    ['read', 'lines', () => seat.readLines({ lines: [{ nodeId: word, ids: [word] }], image: PICTURE, at: at() })],
    ['ask', '', () => seat.ask('why are these one thing?', [a, b], at())],
    ['build', '', () => seat.generate({ prompt: 'a pricing page', artifactId: art, at: at() })],
    ['build', 'revise', () => {
      s.attachCode({ participantId: MM.LOCAL_PARTICIPANT, nodeId: art, kind: 'html', code: '<div data-region="r1"></div>', fill: { regions: { r1: { tag: 'div', html: 'Free' }, r2: { tag: 'div', html: 'Pro' } } }, at: at() });
      return seat.generate({ prompt: 'a bigger title', artifactId: art, at: at() });
    }],
    ['program', '', () => seat.program({ prompt: 'a spinning cube', artifactId: art, at: at() })],
    ['draw', '', () => seat.draw({ prompt: 'add a box under the first', nodeIds: [a], at: at() })],
    ['behave', '', () => seat.behave({ nodeId: art, words: 'does a slow dance when the moon is out', at: at() })],
  ];
  const out = [];
  for (const [key, variant, run] of plan) {
    const before = new Set(MM.seatBriefs(s.getState()).map((x) => x.key));
    let settled;
    try { settled = run(); } catch (err) { out.push({ key, variant, error: (err && err.message) || String(err) }); continue; }
    const parked = MM.seatBriefs(s.getState()).find((x) => !before.has(x.key) && !x.withdrawn && !x.reply);
    if (!parked) { out.push({ key, variant, error: 'it parked no brief' }); await settled.catch(() => undefined); continue; }
    out.push({ key, variant, head: 'seat ' + key + (variant ? ' (' + variant + ')' : ''), asked: parked.asked, contract: parked.contract, brief: parked.brief });
    seat.cancel(parked.key, 'a scratch brief, read for its contract');
    await settled.catch(() => undefined);
  }
  seat.leave();
  return out;
}

/** What each brief kind is, in the words a person meets it by — the seat's own first line says what was asked. */
const PERSON = {
  what: 'What is this?', read: 'Read the writing', ask: 'a question typed as ask: …', build: 'a brief at a loop that lays out as a page',
  program: 'a brief at a loop that is a program, not a layout', draw: 'the model draws: …', behave: 'words about what a thing does that the verb table could not read',
};
const VARIANT_WORDS = { lines: 'Read these — a batch of lines, one numbered sheet', revise: 'a revision of a page already filled in' };

/** Lines said of who sits where, from the merged log, and who was heard. */
function sitterLines(MM, ctx) {
  const s = ctx.state;
  const lines = ['who sits where, from the merged log of room ' + ctx.room + ' (what this hand can see; which seat each model holds is the page\'s runtime, not the log\'s):'];
  const kinds = { human: 'a hand', agent: 'a model', engine: 'the engine' };
  for (const id of s.participants) {
    const n = s.nodes.get(id);
    if (!n) continue;
    const rep = n.reps.find((r) => r.modality === 'participant');
    const kind = (rep && rep.data && rep.data.kind) || '';
    const name = id === MM.LOCAL_PARTICIPANT ? ctx.me + ' (this hand)' : (MM.wordOf(n) || id);
    const loc = MM.localityOf(n);
    lines.push('  ' + name + ' · ' + (id === MM.LOCAL_PARTICIPANT ? 'a hand' : kinds[kind] || kind || 'a participant') + ' · tier ' + (n.capability ?? 0) + (loc ? ' · ' + loc : ''));
  }
  const heard = ctx.presence.map((p) => p.who + (p.seat ? ' (answers at the seat)' : ''));
  lines.push('heard in the last minute: ' + (heard.length ? heard.join(', ') : 'no one else'));
  lines.push('this hand answers at the seat: it says so on every line it writes, so a page offers Claude Code as the model it asks.');
  const waiting = ctx.waiting;
  lines.push('briefs waiting for this hand now: ' + (waiting.length ? waiting.map((b) => b.key + ' (' + (b.asked || 'a brief') + ')').join(', ') : 'none') + ' — canvas_pending reads them, canvas_answer answers.');
  return lines;
}

async function seatLines(MM, ctx, only) {
  const lines = ['== THE SEATS =='];
  if (!only) {
    lines.push('A seat is a model, and that is the whole of it: Claude Code at the seat is asked with the prompts a model is asked with, answers in the contract below, and what it says is read by the parser a model\'s reply meets, then held and attributed to it — never blessed. The page parks each question in the room as a brief; canvas_pending lists the briefs and canvas_answer answers one (a reply the page could not read is refused here, before it is sent).');
    try {
      const F = fragment('03-seats.js', ['SEATS', 'SEAT_WORDS', 'fallbackWords']);
      lines.push('', 'the page\'s seats (Demos/surface/03-seats.js — SEATS, SEAT_WORDS, fallbackWords), each a job and not a kind of participant:');
      for (const seat of F.SEATS) {
        lines.push('  ' + seat + ' — ' + F.SEAT_WORDS[seat].job + ' · needs ' + F.SEAT_WORDS[seat].needs);
        lines.push('      left alone: ' + F.fallbackWords(seat));
      }
    } catch (err) { lines.push('the page\'s seats (Demos/surface/03-seats.js): could not be read — ' + (err && err.message || err)); }
    lines.push('', ...sitterLines(MM, ctx), '', ...watcherLines(), '');
  }
  const briefs = await seatBriefs(MM);
  let shown = 0;
  for (const b of briefs) {
    const id = b.key + (b.variant ? '-' + b.variant : '');
    const c = ctx.contracts[id] || ctx.contracts[b.key];
    if (only && only !== b.key && only !== id) continue;
    shown++;
    lines.push(b.error ? 'seat ' + b.key + (b.variant ? ' (' + b.variant + ')' : '') + ' — could not be run: ' + b.error : b.head + ' — ' + (VARIANT_WORDS[b.variant] || PERSON[b.key] || b.key));
    if (b.error) { lines.push(''); continue; }
    lines.push('  asked: ' + b.asked + '   (the first line of the parked brief — askedLine in core\'s seat.ts)');
    lines.push('  contract (the system message a model is given — verbatim):');
    for (const l of b.contract.split('\n')) lines.push(l ? '    ' + l : '');
    const question = b.brief.split('\n');
    lines.push('  question (the user message — a sample, from a scratch board' + (question.length > 8 ? '; the first 8 of ' + question.length + ' lines' : '') + '):');
    for (const l of question.slice(0, 8)) lines.push(l ? '    ' + l : '');
    if (c) {
      lines.push('  reply: ' + c.shape);
      const example = typeof c.example === 'string' ? c.example : JSON.stringify(c.example);
      lines.push('  example reply: ' + example);
      let ok = false;
      try { ok = !!c.parse(example, { brief: b.brief }); } catch { ok = false; }
      lines.push("  canvas_answer's parser: " + (ok ? 'accepts it' : 'REFUSES this example — a defect in the example or the parser'));
    } else lines.push('  reply: this hand has no table entry for this brief — read the contract above');
    lines.push('');
  }
  if (only && !shown) lines.push('no brief kind called “' + only + '” — the kinds are ' + briefs.map((b) => b.key + (b.variant ? '-' + b.variant : '')).join(', '));
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

// ----- MCP, both ways --------------------------------------------------------------------------------------------------

function mcpLines(ctx) {
  const lines = ['== MCP, BOTH WAYS =='];
  const registered = registeredServers();
  lines.push(registered
    ? 'a Claude Code session connects to what .mcp.json registers (read now): ' + registered.join(' · ')
    : 'a Claude Code session connects to what .mcp.json registers — it could not be read');
  lines.push('A server\'s tools are read when it starts: a session that began before a tool was added must reconnect the server (/mcp) to see it.');
  lines.push('', 'this hand (Demos/mcp.mjs; room ' + ctx.room + ') — ' + ctx.tools.length + ' tools, from its own table:');
  for (const t of ctx.tools) lines.push('  ' + t.name + argsOf(t.inputSchema) + ' — ' + firstSentence(t.description));
  try {
    const src = read('dynaink-3d/mcp.mjs');
    const room = (/process\.env\.MM_ROOM \|\| '([^']+)'/.exec(src) || [])[1];
    const tools = readToolTable('dynaink-3d/mcp.mjs');
    lines.push('', 'the 3D hand (dynaink-3d/mcp.mjs' + (room ? '; room ' + room + ' unless MM_ROOM says another' : '') + ') — ' + tools.length + ' tools, read from its source now:');
    for (const t of tools) lines.push('  ' + t.name + argsOf(t.inputSchema) + ' — ' + firstSentence(t.description));
  } catch (err) { lines.push('', 'the 3D hand (dynaink-3d/mcp.mjs): its tools could not be read — ' + (err && err.message || err)); }
  lines.push('', ...clientDoorLines());
  return lines;
}

// ----- The room ----------------------------------------------------------------------------------------------------------

/** An address as it may be said: no user, no password, no query — a key must never be printed. */
function sayable(address) {
  try { const u = new URL(address); return u.origin + (u.pathname === '/' ? '' : u.pathname.replace(/\/+$/, '')); } catch { return String(address).replace(/[?#].*$/, '').replace(/\/\/[^/@]*@/, '//'); }
}

function roomLines(ctx) {
  const lines = ['== THE ROOM =='];
  lines.push('relay: ' + sayable(ctx.relay) + ' — this hand reached it (Demos/relay.mjs on this machine, or the Worker at cloudflare/relay; the protocol is Demos/relay-protocol.mjs)');
  lines.push('room: ' + ctx.room + ' — the lines its hands send, each hand\'s own log; a hand that joins later is caught up by the hands still here. The relay remembers up to ' + DEFAULT_MAX_LINES + ' lines a room unless told otherwise, and says when a room is older than that.');
  lines.push('key: ' + (ctx.keySet ? 'set' : 'not set') + ' (MM_RELAY_KEY, or --key, for a relay that wants one — never printed here)');
  lines.push('you are ' + ctx.me + ' — one sitting; a restart is a new log under the same name, and the same person');
  const heard = ctx.presence.map((p) => p.who);
  lines.push('heard in the last minute: ' + (heard.length ? heard.join(', ') : 'no one else'));
  lines.push('notices: ' + (ctx.notices.length ? ctx.notices.join(' · ') : 'none'));
  lines.push('pictures: the room holds ' + ctx.picturesHeld + ' of the ' + ctx.picturesNamed + ' picture' + (ctx.picturesNamed === 1 ? '' : 's') + ' this board names — an import names a picture by its SHA-256 and the relay keeps its bytes (PUT, GET and HEAD at /rooms/<room>/assets/<sha256>, up to ' + Math.round(MAX_ASSET_BYTES / 1048576) + ' MB each); canvas_see draws the ones it holds and canvas_import puts one there.');
  lines.push('beyond the room: this hand writes files only to the OS temp directory or where canvas_export is told (never inside the repository), and reads files and web addresses only for canvas_import.');
  return lines;
}

// ----- The formats ---------------------------------------------------------------------------------------------------------

/** `name` found in `where`: `name ✓`, or `name — missing in this build`. */
const found = (where, name) => name + (typeof where[name] === 'function' ? ' ✓' : ' — missing in this build');

function formatLines(MM) {
  const lines = ['== THE FORMATS =='];
  lines.push('each with the function that writes it and the one that reads it, named from the code and checked to exist just now (✓):');
  let B = {}, A = {};
  try { B = bundleFragment(); } catch (err) { lines.push('(Demos/surface/17-bundle.js could not be loaded — ' + (err && err.message || err) + ')'); }
  try { A = assetFragment(); } catch { /* said below by what is missing */ }
  const header = (() => { try { return MM.encodeLog([], { app: appVersion() || undefined }).split('\n')[0]; } catch { return ''; } })();
  const writers = (() => { try { return MM.mermaidWriters(); } catch { return []; } })();
  const readers = (() => { try { return MM.mermaidReaders(); } catch { return []; } })();
  lines.push(
    '  log — canvas.jsonl: the board\'s events, a JSON value a line, behind a header line',
    '      written by ' + found(MM, 'encodeLog') + ' (core, src/store/format.ts) · read by ' + found(MM, 'decodeLog') + ' (and the page\'s readLogText, Demos/surface/17-folder.js — which also takes the old JSON array and refuses a file with a line that is not JSON)',
    '      version ' + MM.LOG_VERSION + ' is written; versions 0 (no header — every log kept before R2) and ' + MM.LOG_VERSION + ' are read; a newer one is refused whole (LogFormatError)',
    '      header: ' + header + '   (' + 'app is the build that wrote it; assets counts the pictures a bundle carries beside the log)',
    '      here: canvas_export { format: "log" } writes it; canvas_import { path } reads it into a scratch session',
    '  bundle — <board>.dyna.zip: board.jsonl (the log) and assets/<sha256>.<ext> (each picture the log names, once) in one zip',
    '      written by ' + found(B, 'bundleBuild') + ' over ' + found(B, 'zipWrite') + ' (Demos/surface/17-bundle.js; stored, not compressed) · read by ' + found(B, 'bundleRead') + ' over ' + found(B, 'zipRead') + ' (every picture\'s bytes checked against the hash it is named for; deflate unpacked too, for a zip the Files app made)',
    '      found by its first bytes, never its name · pictures come from the room\'s relay by their hash',
    '      here: canvas_export { format: "bundle" } writes the file and says its path, size and entries; canvas_import { path } reads it into a scratch session',
    '  svg — board.svg: pictures (as data URLs), SVG figures (as images of their text), writing and ink, in board order',
    '      written by ' + found(B, 'boardSvg') + ' (17-bundle.js) from the layers boardLayers builds (Demos/surface/18-out.js — taken out of the page by name and run here) · no reader: an SVG comes back through canvas_import as an svg artifact holding its text, not as marks',
    '      here: canvas_export { format: "svg", ids? }',
    '  mermaid — <notation>.mmd: the likeliest notation the marks read as, said as Mermaid text',
    '      written by ' + found(MM, 'toMermaid') + ' through ' + found(MM, 'mermaidFor') + ' (core; writers registered for ' + (writers.join(', ') || 'none') + ') · read by ' + found(MM, 'readMermaid') + ' and drawn as ink by ' + found(MM, 'drawMermaid') + ' (readers for ' + (readers.join(', ') || 'none') + ')',
    '      here: canvas_export { format: "mermaid", ids? }; the page\'s Draw it puts a text back as marks — this hand has no tool for that yet',
    '  truesize — true-size.svg: every figure with numbers and a unit, drawn from the numbers at its real size; its root is paper (24.5in)',
    '      written by ' + found(MM, 'trueSize') + ' over ' + found(MM, 'boardMathsOf') + ' (core, src/maths/truesize.ts); print.html is ' + found(MM, 'printTiled') + ' (the same figure tiled onto pages at 100%) · no reader',
    '      here: canvas_export { format: "truesize", ids? }; with no figure that has a number and a unit it says what it needs',
  );
  return lines;
}

/** What Node cannot make, and what is not built yet, each said as such. */
function gapLines(MM, ctx) {
  const lines = ['== NOT BY NODE, AND NOT BUILT YET =='];
  lines.push('not by Node — the page makes these and this hand cannot (it has no canvas):');
  lines.push('  board.png — the page draws the board on an offscreen canvas (renderBoard in Demos/surface/18-out.js; pngPlan sizes it) and the browser encodes it. canvas_see is this hand\'s own PNG of the ink alone (Demos/ink-png.mjs): no figures, no writing, no labels.');
  lines.push('  board.pdf — one page holding that picture; pdfPlan and pdfWrite (17-bundle.js) are pure, but they need the raster the offscreen canvas makes.');
  const seatTool = ctx.tools.some((t) => t.name === 'canvas_seat');
  lines.push('not built yet — said as such, each with the unit that builds it (V1-SPEC §6):');
  lines.push('  a lens (KN6) — a view of the board through the person\'s kinds; no format and no door yet');
  lines.push('  a notebook directory (IN5) — a folder of a notebook\'s pages in and out; no format and no door yet');
  lines.push('  Claude Code in the decider, semantic and listener seats — ' + (seatTool || typeof MM.seatDecideTransport === 'function' ? 'partly built (canvas_seat or seatDecideTransport is here)' : 'not built (CG7b): there is no canvas_seat, no seatDecideTransport and no listener seat; only the reader and writer seats above can be taken'));
  lines.push('  simulating a seat on purpose, and a seat\'s cost (paid or unpaid) — not built (CG7b)');
  return lines;
}

/**
 * The text `canvas_doors` says. `ctx`: `{ MM, tools, contracts, room, relay, keySet, me, state, presence: [{ who, seat }], waiting, notices,
 * picturesNamed, picturesHeld }` — what the running hand knows; the rest is read here. `args`: `{ door?, seat? }`.
 */
export async function doorsText(ctx, args = {}) {
  const MM = ctx.MM;
  const doors = ['pen', 'seats', 'mcp', 'room', 'formats', 'gaps'];
  const door = args.door === undefined || args.door === '' ? null : String(args.door).toLowerCase();
  const seat = args.seat === undefined || args.seat === '' ? null : String(args.seat).toLowerCase();
  if (door && !doors.includes(door)) return 'no door called “' + args.door + '” — the doors are ' + doors.join(', ');
  const want = (d) => (seat ? d === 'seats' : !door || door === d);
  const out = [];
  if (!door && !seat) {
    out.push('the doors of dyna.ink — this hand (Demos/mcp.mjs), the engine bundle it runs (Demos/dynaink-core.node.mjs) and the page\'s and the other hands\' source as it stands on disk now. Everything below is read from the running code, never from a copy in a document, and every function named was checked to exist.');
    out.push('Narrow it: door is one of ' + doors.join(' | ') + '; seat is one brief kind (what, read, read-lines, ask, build, build-revise, program, draw, behave).', '');
  }
  const sections = [];
  const add = async (d, make) => { if (want(d)) sections.push((await make()).join('\n')); };
  await add('pen', () => penLines(MM, ctx.tools.find((t) => t.name === 'canvas_draw')));
  await add('seats', () => seatLines(MM, ctx, seat));
  await add('mcp', () => mcpLines(ctx));
  await add('room', () => roomLines(ctx));
  await add('formats', () => formatLines(MM));
  await add('gaps', () => gapLines(MM, ctx));
  out.push(sections.join('\n\n'));
  return out.join('\n');
}

// ----- Out: the board as the app writes it -----------------------------------------------------------------------------------

/** The most characters an answer carries inline before an export goes to a file: an MCP client truncates what is much longer. */
export const INLINE_MAX = 80000;
export const EXPORT_FORMATS = ['log', 'bundle', 'svg', 'mermaid', 'truesize'];
const EXT = { log: '.jsonl', bundle: '.dyna.zip', svg: '.svg', mermaid: '.mmd', truesize: '.svg' };

const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's');
const inside = (child, parent) => child === parent || child.startsWith(parent + path.sep);
const realOf = (p) => { try { return realpathSync(p); } catch { return null; } };

/**
 * Where an export is written: `out` when the caller names one — a folder that exists (the file goes in it, under its own
 * name) or a file path ending in the format's extension — else a new folder in the OS temp directory. Never inside the
 * repository, and never over a file that is not the kind of file being written.
 */
export function destination(out, name, format) {
  if (out === undefined || out === null || out === '') {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'dynaink-export-'));
    return { file: path.join(dir, name), dir };
  }
  const target = path.resolve(String(out));
  const isDir = existsSync(target) && statSync(target).isDirectory();
  const dir = isDir ? target : path.dirname(target);
  const real = realOf(dir);
  if (!real) return { error: '“' + dir + '” is not a folder that exists — make it first; this hand writes only into a place it is told, and makes no folder of its own choosing there' };
  const repo = realOf(REPO_ROOT) || REPO_ROOT;
  if (inside(real, repo)) return { error: 'refused: ' + target + ' is inside the repository (' + repo + ') — an export is never written there; name a place outside it, or leave out out to have it in the OS temp directory' };
  if (!isDir && !target.toLowerCase().endsWith(EXT[format])) return { error: 'out names a file, and ' + format + ' is written as ' + EXT[format] + ' — name a file that ends so, or a folder' };
  // A file that already stands there is written over only if it is not a link into the repository.
  const file = isDir ? path.join(target, name) : target;
  const standing = existsSync(file) ? realOf(file) : null;
  if (standing && inside(standing, repo)) return { error: 'refused: ' + file + ' is a link into the repository (' + standing + ') — an export is never written there' };
  return { file };
}

/**
 * The layers the page draws its SVG from, for some marks: 18-out.js's own `boardLayers`, taken out of the page and run here
 * over the session's state. `hrefs` maps an asset to a data URL for the pictures the room holds.
 */
function layersFor(MM, state, ids, hrefs) {
  const env = { MM, session: { getState: () => state } };
  const page = pageCode([
    { file: 'Demos/surface/02-artifacts.js', names: ['isWritingArtifact', 'codeRepOf'] },
    { file: 'Demos/surface/13-kinds.js', names: ['TEXT_FITS_LINES', 'linesOf'] },
    { file: 'Demos/surface/08-render.js', names: ['union'] },
    { file: 'Demos/surface/18-out.js', names: ['boardLayers', 'plural', 'exportWords'] },
  ], env);
  return { made: page.boardLayers(ids, hrefs), exportWords: page.exportWords };
}

/** A log's text as events — the page's own `readLogText` (17-folder.js): `{ events }`, `{ refused }` or `{ notLog }`. */
function readLog(MM, text, source) {
  return pageCode([{ file: 'Demos/surface/17-folder.js', names: ['readLogText'] }], { MM }).readLogText(text, source);
}

/**
 * `canvas_export`: the board — or the marks named — in a format, as the app writes it. `ctx`: `{ MM, session, assets, room }`.
 * Returns `{ content }` for the MCP reply: a sentence, then (for a text format that fits) the file's exact text in a block of its own,
 * or, when it is a file, its path, size and what is in it.
 */
export async function exportBoard(ctx, args) {
  const { MM, session } = ctx;
  const format = String(args.format || '').toLowerCase();
  if (!EXPORT_FORMATS.includes(format)) {
    const page = /^(png|pdf)$/.test(format) ? ' — board.' + format + ' is the page\'s: it draws the board on an offscreen canvas, and this hand has none' : '';
    return { text: 'no format called “' + (args.format ?? '') + '”' + page + '. This hand writes ' + EXPORT_FORMATS.join(', ') + '; the page also makes board.png and board.pdf, drawn on an offscreen canvas, which Node cannot (canvas_doors says what each is).' };
  }
  const s = session.getState();
  const events = session.getEvents();
  const out = args.out === undefined || args.out === null || args.out === '' ? undefined : String(args.out);
  const named = Array.isArray(args.ids) ? args.ids.map(String) : [];
  const ids = named.filter((id) => s.nodes.has(id));
  const gone = named.filter((id) => !s.nodes.has(id));
  if (named.length && !ids.length) return { text: 'nothing to export: none of ' + named.join(', ') + ' is on the board' };
  const said = (words) => words + (gone.length ? ' · not on the board, left out: ' + gone.join(', ') : '');
  const app = appVersion();
  const B = bundleFragment(), A = assetFragment();

  // What a text export comes back as: inline when it fits, else — or when asked — a file.
  const text = async (name, body, sentence) => {
    if (out === undefined && body.length <= INLINE_MAX) return { content: [{ type: 'text', text: sentence }, { type: 'text', text: body }] };
    const dest = destination(out, name, format);
    if (dest.error) return { text: dest.error };
    writeFileSync(dest.file, body);
    const why = out === undefined ? ' — too big to come back inline (' + body.length + ' characters; an answer carries up to ' + INLINE_MAX + '), so it is written to a file' : '';
    return { text: sentence + why + '\npath: ' + dest.file + '\nsize: ' + Buffer.byteLength(body) + ' bytes' };
  };

  if (format === 'log') {
    const body = MM.encodeLog(events, app ? { app } : {});
    const refs = [...A.assetsOfEvents(events)];
    return text('canvas.jsonl', body, said('canvas.jsonl — the log, version ' + MM.LOG_VERSION + ': ' + plural(events.length, 'event') + ' from room ' + ctx.room + (app ? ', written by dyna.ink ' + app : '') +
      ' · the whole board' + (ids.length ? ' (a log is every event, so ids were ignored)' : '') + (refs.length ? ' · it names ' + plural(refs.length, 'picture') + ' and carries none — export a bundle to carry them' : '')));
  }

  if (format === 'bundle') {
    const refs = [...A.assetsOfEvents(events)];
    const got = [], missing = [];
    for (const ref of refs) {
      const rec = await ctx.assets.get(ref.slice('sha256:'.length));
      if (rec) got.push({ ref, mime: String(rec.mime).split(';')[0].trim(), bytes: rec.bytes }); else missing.push(ref);
    }
    const log = MM.encodeLog(events, { ...(app ? { app } : {}), ...(got.length ? { assets: got.length } : {}) });
    const z = B.bundleBuild({ log, assets: got, time: Date.now() });
    const name = B.bundleName(ctx.room);
    const dest = destination(out, name, 'bundle');
    if (dest.error) return { text: dest.error };
    writeFileSync(dest.file, Buffer.concat(z.parts.map((p) => Buffer.from(p.buffer, p.byteOffset, p.byteLength))));
    const entries = (await B.zipRead(new Uint8Array(readFileSync(dest.file)), {})).entries.map((e) => e.name + ' (' + e.data.length + ' bytes)');
    return { text: said(name + ' — the whole board, its ' + plural(events.length, 'event') + ' and ' + (got.length ? plural(got.length, 'picture') : 'no pictures') + ' in one file; canvas_import reads it here (a scratch session), and boards ▸ from a file… opens it whole in the page' +
      (ids.length ? ' · a bundle is the whole board, so ids were ignored' : '') +
      (missing.length ? ' · ' + plural(missing.length, 'picture') + ' the room does not hold could not be put in it (nobody put their bytes in the room)' : '') +
      '\npath: ' + dest.file + '\nsize: ' + z.size + ' bytes\nentries: ' + entries.join(', ')) };
  }

  const scope = ids.length ? ids : s.contentIds.slice();
  if (format === 'svg') {
    const hrefs = new Map();
    for (const id of scope) {
      const n = s.artifacts.includes(id) && s.nodes.get(id), pic = n && MM.pictureOf(n);
      if (!pic || !pic.asset || hrefs.has(pic.asset)) continue;
      const rec = await ctx.assets.get(pic.asset.slice('sha256:'.length));
      if (rec) hrefs.set(pic.asset, B.pictureDataUrl(String(rec.mime).split(';')[0].trim() || 'image/jpeg', rec.bytes));
    }
    const L = layersFor(MM, s, scope, hrefs);
    if (!L.made.box) return { text: 'nothing to draw yet — ' + (ids.length ? 'the marks named have no ink or bounds to draw' : 'the board is empty') };
    const body = B.boardSvg(L.made.layers, L.made.box, {});
    const words = L.exportWords('board.svg', { scope: ids.length ? 'held' : 'board', ids: scope }, L.made.tally).replace('held mark', 'named mark');
    return text('board.svg', body, said(words));
  }

  if (format === 'mermaid') {
    const marks = scope.filter((id) => s.nodes.has(id) && !s.artifacts.includes(id));
    const got = marks.length >= 2 ? MM.mermaidFor(s, marks, () => false) : null;
    if (!got) return { text: 'nothing here reads as a diagram the canvas can write in Mermaid — ' + (marks.length < 2 ? 'a diagram is two marks or more' : 'the likeliest notation these ' + marks.length + ' marks read as is under the floor, or has no Mermaid writer') + ' (the writers are ' + MM.mermaidWriters().join(', ') + ')' };
    const file = got.reading.notation + '.mmd';
    const notes = got.said.notes && got.said.notes.length ? ' · notes: ' + got.said.notes.join('; ') : '';
    return text(file, got.said.text, said(file + ' — ' + MM.describeNotation(got.reading) + ' · from ' + plural(marks.length, 'mark') + notes));
  }

  // truesize
  let board = MM.boardMathsOf(session);
  if (board && ids.length) board = { ...board, figures: board.figures.filter((fm) => fm.figure.ids.some((id) => ids.includes(id))) };
  const doc = board ? MM.trueSize(board) : null;
  if (!doc || !doc.figures.length) return { text: 'nothing to draw at true size — label a side, in inches or centimetres (a number and a unit beside a figure\'s side, like 24″ or 8 cm)' + (doc && doc.omitted.length ? ' · left out: ' + doc.omitted.map((o) => o.name + ': ' + o.reason).join('; ') : '') };
  return text('true-size.svg', doc.svg, said('true-size.svg — ' + plural(doc.figures.length, 'figure') + ' at real size, ' + doc.width + ' × ' + doc.height + ' ' + doc.unit + (doc.omitted.length ? ' · left out: ' + doc.omitted.map((o) => o.name + ': ' + o.reason).join('; ') : '')));
}

// ----- In: a log or a bundle, read into a scratch session ------------------------------------------------------------------------

/** Whether a file begins as a zip does, read without reading the file. */
export function fileIsZip(file) {
  try {
    const fd = openSync(file, 'r');
    try { const b = Buffer.alloc(4); readSync(fd, b, 0, 4, 0); return b[0] === 0x50 && b[1] === 0x4b && (b[2] === 3 || b[2] === 5) && (b[3] === 4 || b[3] === 6); } finally { closeSync(fd); }
  } catch { return false; }
}

/** The most a board file may be, and the most marks said of one: a bundle can carry photographs; a look is a reading. */
export const BOARD_FILE_MAX = 256 * 1024 * 1024;
export const IMPORT_LOOK_DEFAULT = 200;

/**
 * Whether some bytes are a board file this hand reads — a zip, or text that is a log. A cheap test (no replay): the zip's magic,
 * or text whose first line is a JSON value with a string `type` (a version 0 log may begin with a stroke of thousands of points,
 * so the whole first line is read), or begins as the old JSON array does.
 */
export function looksLikeBoard(bytes) {
  const B = bundleFragment();
  if (B.isZipBytes(bytes)) return true;
  let at = 0;
  while (at < bytes.length && (bytes[at] === 0x20 || bytes[at] === 0x0a || bytes[at] === 0x0d || bytes[at] === 0x09)) at++;
  if (bytes[at] === 0x5b) return true;
  let end = bytes.indexOf(0x0a, at);
  if (end < 0) end = bytes.length;
  const first = Buffer.from(bytes.subarray(at, end)).toString('utf8').replace(/^\uFEFF/, '');
  try { const v = JSON.parse(first); return !!v && typeof v === 'object' && typeof v.type === 'string'; } catch { return false; }
}

/**
 * Read a board file — a log (`.jsonl`, version 0 or 1, or the old JSON array) or a bundle (`.dyna.zip`) — into a SCRATCH session:
 * the room is never touched. `ctx`: `{ MM, session, describeBoard, thingLines, authorsOf }` — `describeBoard(state, { limit, holds })` says a
 * board in words as canvas_look does, `thingLines(state, holds, author)` says every thing on it in a line each (to compare readings), and
 * `authorsOf(state)` says who made each. Returns `{ text }`.
 */
export async function importBoard(ctx, bytes, given, opts = {}) {
  const { MM } = ctx;
  const B = bundleFragment(), A = assetFragment();
  const name = String(given || 'board file');
  const refuse = (words) => ({ text: 'nothing read: ' + words });
  let text, kind, carried = [], damaged = [], logSource = name;
  if (B.isZipBytes(bytes)) {
    const r = await B.bundleRead(bytes, { inflate: async (raw) => new Uint8Array(inflateRawSync(Buffer.from(raw))), digest: async (b) => createHash('sha256').update(b).digest('hex') });
    if (!r.ok) return refuse('“' + name + '”: ' + r.words);
    text = r.text; kind = 'a bundle'; carried = r.assets; damaged = r.damaged; logSource = 'board.jsonl in “' + name + '”';
  } else {
    text = Buffer.from(bytes).toString('utf8').replace(/^\uFEFF/, '');
    kind = 'a log';
  }
  const read = readLog(MM, text, logSource);
  if (read.refused) return refuse(read.refused);
  if (!read.events) {
    let broken = 0;
    try { broken = MM.decodeLog(text).skipped; } catch { broken = 0; }
    return refuse('“' + name + '” is not a board’s log — one event per line, as export writes it' + (broken ? ' (' + plural(broken, 'line') + ' ' + (broken === 1 ? 'is' : 'are') + ' not JSON)' : ''));
  }
  const events = read.events;
  let header = { version: 0 };
  try { const d = MM.decodeLog(text); header = { version: d.version, app: d.app, assets: d.assets }; } catch { /* read already said */ }
  const scratch = MM.createSession({ ...MM.DEFAULT_SESSION_CONFIG });
  try { scratch.load(events); } catch (err) { return refuse('the engine could not replay “' + name + '” — ' + ((err && err.message) || err)); }
  const fileState = scratch.getState();

  // The pictures it names, and which of them the file carries.
  const info = new Map();
  for (const ev of events) if (ev && ev.type === 'import' && A.isAssetRef(ev.asset) && !info.has(ev.asset)) info.set(ev.asset, ev);
  const named = [...info.keys()];
  const have = new Set(carried.filter((a) => info.has(a.ref)).map((a) => a.ref));
  const notCarried = named.filter((r) => !have.has(r) && !damaged.some((d) => d.name.includes(r.slice('sha256:'.length))));
  const lines = [];
  lines.push(kind + ' — “' + name + '”, read into a scratch session: nothing was written to the room, and nothing here changes it');
  lines.push('events: ' + plural(events.length, 'event') + ' · log version ' + header.version + (header.version === 0 ? ' (no header — a log kept before R2)' : '') + (header.app ? ' · written by dyna.ink ' + header.app : '') +
    (header.assets !== undefined ? ' · its header says ' + plural(header.assets, 'picture') + (header.assets === 1 ? ' sits' : ' sit') + ' beside it' : ''));
  const marks = fileState.contentIds.filter((id) => !fileState.artifacts.includes(id));
  const cards = fileState.explanations.filter((id) => !MM.isSeatTraffic(fileState.nodes.get(id), fileState.nodes)).length;
  lines.push('the board: ' + plural(marks.length, 'mark') + ' · ' + plural(fileState.artifacts.length, 'artifact') + ' · ' + plural(fileState.regions.length, 'region') + ' · ' + plural(cards, 'answer card'));
  if (kind === 'a bundle') {
    const bits = [];
    bits.push(plural(have.size, 'picture') + ' carried and checked against ' + (have.size === 1 ? 'its' : 'their') + ' hash' + (have.size === 1 ? '' : 'es'));
    if (damaged.length) bits.push(plural(damaged.length, 'picture') + ' damaged (' + damaged.map((d) => d.name.replace(/^.*\//, '').replace(/^([0-9a-f]{8})[0-9a-f]+/, '$1…') + ' — ' + d.why).join('; ') + ') and left out — ' + (damaged.length === 1 ? 'it stands as its name' : 'they stand as their names'));
    if (notCarried.length) bits.push(plural(notCarried.length, 'picture') + ' named in the board ' + (notCarried.length === 1 ? 'is' : 'are') + ' not in the file — ' + (notCarried.length === 1 ? 'it stands as its name' : 'they stand as their names'));
    lines.push('pictures: ' + bits.join(' · '));
  } else if (named.length) {
    lines.push('pictures: ' + plural(named.length, 'picture') + ' named in this log ' + (named.length === 1 ? 'is' : 'are') + ' not in it — a log carries none; a bundle (.dyna.zip) does');
  } else lines.push('pictures: none named');

  // Whatever reads differently from the board in the room, thing by thing, by id.
  const roomState = ctx.session.getState();
  const inFile = ctx.thingLines(fileState, () => '', false);
  const inRoom = ctx.thingLines(roomState, () => '', false);
  let both = 0, same = 0, onlyFile = 0;
  const differ = [];
  for (const [id, line] of inFile) {
    if (!inRoom.has(id)) { onlyFile++; continue; }
    both++;
    if (inRoom.get(id) === line) same++; else differ.push(id);
  }
  const onlyRoom = [...inRoom.keys()].filter((id) => !inFile.has(id)).length;
  lines.push('compared with the board in the room: ' + plural(both, 'thing') + ' in both, ' + (both === 0 ? 'none to compare' : differ.length === 0 ? 'all read the same' : same + ' read the same and ' + differ.length + ' read differently') +
    ' · ' + onlyFile + ' only in this file · ' + onlyRoom + ' only in the room' + (both === 0 && onlyFile ? ' — this is another board: none of its ids are on the room\'s' : ''));
  for (const id of differ.slice(0, 5)) lines.push('  differs: ' + id + ' — here: ' + inFile.get(id).slice(0, 160) + ' · in the room: ' + inRoom.get(id).slice(0, 160));
  if (differ.length > 5) lines.push('  and ' + (differ.length - 5) + ' more');
  // Who made a thing is the one reading a log carries from a point of view: its writer's own marks are "me", the others' are "by <name>".
  const whoFile = ctx.authorsOf(fileState), whoRoom = ctx.authorsOf(roomState);
  let flipped = 0;
  for (const [id, who] of whoFile) if (whoRoom.has(id) && whoRoom.get(id) !== who) flipped++;
  if (flipped) lines.push('  who made them reads from the writer\'s side: ' + plural(flipped, 'thing') + ' ' + (flipped === 1 ? 'has' : 'have') + ' another maker here than in the room — a log is written from one hand\'s point of view, where its own marks are “me” and the others\' are “by <name>”');
  lines.push('', 'the board, as canvas_look says it (a scratch board: canvas_look, canvas_see and the rest speak only of the room\'s):');
  const holds = (pic) => (pic.asset && have.has(pic.asset) ? ' · its pixels are in the file' : pic.asset ? ' · its pixels are not in the file — it stands as its name' : ' · no pixels were kept for it');
  lines.push(...ctx.describeBoard(fileState, { limit: opts.limit || IMPORT_LOOK_DEFAULT, holds }));
  return { text: lines.join('\n') };
}

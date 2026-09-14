#!/usr/bin/env node
// The MCP hand: MetaMedium's canvas as tools for Claude Code, or any MCP
// client (SURFACE-v10-PLAN D1).
//
//   node Demos/mcp.mjs                          # room "claude", relay http://127.0.0.1:8020, name "claude"
//   MM_ROOM=table MM_NAME=fable node Demos/mcp.mjs
//
// In the canvas: the *live* tile → *with Claude*, or open
// session-engine.html?live=claude&relay=http://127.0.0.1:8020. A relay is
// started here when none answers on this machine. The engine it runs is the
// committed Node bundle beside it (Demos/metamedium-core.node.mjs, built by
// `npm run build:node` in metamedium-core, like the browser bundle).
//
// It is a hand in a room, nothing more. It keeps a session from the merged
// logs exactly as a tab does, and every tool is a verb a hand already has —
// look, see, draw, say, propose, transcribe, write. It proposes and never
// blesses; it can write a program and cannot play it; it holds no keys and
// no truth of its own. Its events reach the tab as its own log, stamped
// `by` on arrival like any other hand's, and draw in its own colour.
//
// The protocol is MCP over stdio — newline-delimited JSON-RPC — written by
// hand so the repo takes no dependency. Logging goes to stderr; stdout
// carries the protocol and nothing else.

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { relayTransport, ensureRelay } from './live-node.mjs';
import { inkPNG } from './ink-png.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const log = (...a) => process.stderr.write(a.join(' ') + '\n');

// ----- Configuration: room, relay, name -------------------------------------
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : undefined; };
const ROOM = flag('room') || process.env.MM_ROOM || 'claude';
const RELAY = (flag('relay') || process.env.MM_RELAY || 'http://127.0.0.1:8020').replace(/\/+$/, '');
const NAME = (flag('name') || process.env.MM_NAME || 'claude').replace(/~.*$/, '');
const ME = NAME + '~mcp'; // a hand in a room is one process: the name is the caller's, the suffix says which

// ----- The engine, built --------------------------------------------------
const distPath = path.join(here, 'metamedium-core.node.mjs');
if (!existsSync(distPath)) {
  log('Demos/metamedium-core.node.mjs is missing — run `npm run build:node` in metamedium-core and copy dist/metamedium-core.node.mjs to Demos/');
  process.exit(1);
}
const MM = await import(pathToFileURL(distPath).href);

// ----- The room: a LiveStore over the relay, and a session from its logs -----
let relayServer = null;
try { relayServer = await ensureRelay(RELAY); } catch (err) { log(err.message); process.exit(1); }
if (relayServer) log(`relay started on ${RELAY} (none was answering)`);
const transport = relayTransport(RELAY, ROOM);
const store = new MM.LiveStore(transport, ME, ROOM);
const session = MM.createSession();
let sentCount = 0; // how many of my events the room has
let lastAt = 0;
const now = () => { lastAt = Math.max(Date.now(), lastAt + 1); return lastAt; };
const label = (name) => String(name || '').replace(/~[^~]*$/, '');

// My log is the session's unstamped events — sent or not — never the room's
// copy of it: a line that lands between a send and the next merge would
// otherwise count my sent events twice.
const myLog = () => session.getEvents().filter((e) => !e.by);
async function merge() {
  const logs = await store.readLogs();
  const merged = MM.mergeLogs(Object.assign({}, logs, { [ME]: myLog() }), { me: ME });
  session.load(merged);
}
let mergePending = false;
store.subscribe(() => {
  if (mergePending) return;
  mergePending = true;
  Promise.resolve().then(() => { mergePending = false; return merge(); }).catch((err) => log('merge: ' + err.message));
});
async function flush() {
  const mine = myLog();
  const delta = mine.slice(sentCount);
  if (!delta.length) return;
  await store.appendLog(ME, delta);
  sentCount = mine.length;
}
// A newcomer says hello; the room answers with its logs. Tools wait for the
// first answer, or a moment, so the first look is not at an empty board.
const ready = new Promise((resolve) => {
  const off = store.subscribe(() => { off(); resolve(); });
  setTimeout(resolve, 1500);
});
store.hello();

// ----- Reading the board --------------------------------------------------
const r = (v) => Math.round(v);
function authorOf(node, s) {
  const e = node.edges.find((x) => x.rel === 'made-by');
  const p = e && s.nodes.get(e.to);
  if (!p) return '';
  if (e.to === MM.LOCAL_PARTICIPANT) return 'me';
  return MM.wordOf(p) || label(e.to.replace(/^participant:hand:/, ''));
}
function codeRepOf(node) {
  for (let i = node.reps.length - 1; i >= 0; i--) if (node.reps[i].modality === 'code') return node.reps[i];
  return null;
}
function describeMark(node, s) {
  const b = MM.boundsOf(node);
  const reads = MM.interpretationsOf(node, s.nodes).slice(0, 3).map((x) => x.label + ' ' + x.weight.toFixed(2) + (x.tier ? ' · ' + x.sourceName : ''));
  const name = MM.wordOf(node);
  const said = MM.transcriptOf(node);
  const rep = codeRepOf(node);
  const who = authorOf(node, s);
  const parts = [node.id + (name ? ' “' + name + '”' : '')];
  if (rep) parts.push((rep.data.kind || 'html') + (rep.data.path ? ' ' + rep.data.path : ''));
  if (MM.isWord(node)) parts.push('a word of ' + MM.lettersOf(node).length + ' strokes');
  parts.push(reads.join(', ') || 'unread');
  if (said) parts.push('says “' + said + '”');
  if (b) parts.push('at ' + r(b.minX) + ',' + r(b.minY) + ' ' + r(b.maxX - b.minX) + '×' + r(b.maxY - b.minY));
  if (s.live.includes(node.id)) parts.push(s.clocks[node.id] && s.clocks[node.id].playing ? 'playing' : 'live');
  if (who && who !== 'me') parts.push('by ' + who);
  return parts.join(' · ');
}
function look(args) {
  const s = session.getState();
  const t = Date.now();
  const here = store.presence().filter((p) => t - p.at < 60000).map((p) => label(p.participant));
  const lines = ['room ' + ROOM + ' · you are ' + label(ME) + (here.length ? ' · with ' + here.join(', ') : ' · alone so far')];
  const marks = s.contentIds.filter((id) => !s.artifacts.includes(id));
  lines.push(marks.length + ' mark' + (marks.length === 1 ? '' : 's') + ' · ' + s.artifacts.length + ' artifact' + (s.artifacts.length === 1 ? '' : 's') + ' · ' + s.live.length + ' live' +
    (s.selection.length ? ' · ' + s.selection.length + ' selected' : '') + (s.summon ? ' · the field is open on ' + s.summon.enclosedIds.length : '') + (s.pendingLassoId ? ' · a loop waits' : ''));
  if (args.detail === 'full') {
    lines.push(MM.describeSession(s, { nodeIds: args.ids }));
  } else {
    const ids = args.ids && args.ids.length ? args.ids : s.contentIds;
    for (const id of ids) { const n = s.nodes.get(id); if (n) lines.push(describeMark(n, s)); }
    if (!ids.length) lines.push('(nothing on the canvas)');
  }
  for (const id of s.explanations) {
    const n = s.nodes.get(id);
    if (!n || n.reps.some((x) => x.modality === 'erased')) continue;
    const d = (n.reps.find((x) => x.modality === 'explanation') || {}).data || {};
    const about = n.edges.filter((e) => e.rel === 'about').map((e) => e.to);
    lines.push(id + ' · “' + (d.text || '') + '”' + (about.length ? ' about ' + about.join(', ') : '') + (authorOf(n, s) ? ' · by ' + authorOf(n, s) : ''));
  }
  return { text: lines.join('\n') };
}

function inkOf(s, ids) {
  const strokes = [];
  const seen = new Set();
  const add = (id) => {
    if (seen.has(id)) return;
    seen.add(id);
    const n = s.nodes.get(id);
    if (!n || n.reps.some((x) => x.modality === 'erased')) return;
    if (MM.isWord(n)) { MM.lettersOf(n).forEach(add); return; }
    const pts = MM.strokePointsOf(n);
    if (pts && pts.length > 1) { strokes.push({ id, points: pts }); return; }
    for (const e of n.edges) if (e.rel === 'has-part') add(e.to);
  };
  ids.forEach(add);
  return strokes;
}
function see(args) {
  const s = session.getState();
  const ids = args.ids && args.ids.length ? args.ids : s.contentIds;
  let strokes = inkOf(s, ids);
  if (args.region) {
    const q = args.region;
    strokes = strokes.filter((st) => { const b = MM.getBounds(st.points); return b.maxX >= q.x && b.minX <= q.x + q.w && b.maxY >= q.y && b.minY <= q.y + q.h; });
  }
  if (!strokes.length) return { text: 'no ink ' + (args.region ? 'in that region' : args.ids ? 'on those marks' : 'on the canvas') };
  const out = inkPNG(strokes.map((st) => st.points), { size: Math.min(1600, Math.max(64, args.size || 800)) });
  const b = MM.getBounds(strokes.flatMap((st) => st.points));
  return {
    text: strokes.length + ' stroke' + (strokes.length === 1 ? '' : 's') + ' from ' + r(b.minX) + ',' + r(b.minY) + ' to ' + r(b.maxX) + ',' + r(b.maxY) + ' (canvas units), ' + out.width + '×' + out.height + ' px: ' + strokes.map((st) => st.id).join(', '),
    image: out.png.toString('base64'),
  };
}

// ----- Acting on the board --------------------------------------------------
async function draw(args) {
  const s0 = session.getState();
  const made = [];
  const shapes = Array.isArray(args.shapes) ? args.shapes : [];
  for (let i = 0; i < shapes.length; i += MM.MAX_DRAWN) {
    for (const sh of MM.parseShapes(JSON.stringify(shapes.slice(i, i + MM.MAX_DRAWN)))) {
      const pts = MM.strokeFor(sh);
      if (!pts) continue;
      const id = session.addStroke(pts, now(), undefined, 1, { content: true });
      made.push(id);
      if (sh.why) session.answer({ participantId: MM.LOCAL_PARTICIPANT, question: 'why', text: sh.why, aboutIds: [id], at: now() });
    }
  }
  const raw = Array.isArray(args.strokes) ? args.strokes : [];
  for (const st of raw) {
    if (!Array.isArray(st) || st.length < 2) continue;
    const pts = st.map((p) => ({ x: Number(p.x), y: Number(p.y) })).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    if (pts.length < 2) continue;
    made.push(session.addStroke(pts, now(), undefined, 1, { content: !args.gesture }));
  }
  if (!made.length) return { text: 'nothing drawn: no shape the canvas can read (rectangle, circle, triangle with x,y,w,h; line, arrow with from/to), and no stroke of two points or more' };
  if (args.why) session.answer({ participantId: MM.LOCAL_PARTICIPANT, question: 'why', text: String(args.why), aboutIds: made, at: now() });
  await flush();
  const s = session.getState();
  void s0;
  return { text: made.map((id) => { const n = s.nodes.get(id); return id + ' → ' + (n ? (MM.topInterpretation(n) || 'unread') : '?'); }).join('\n') };
}
async function say(args) {
  const about = Array.isArray(args.about) ? args.about.map(String) : [];
  const id = session.answer({ participantId: MM.LOCAL_PARTICIPANT, question: String(args.question || 'note'), text: String(args.text || ''), aboutIds: about, at: now() });
  if (!id) return { text: 'not placed: none of ' + (about.join(', ') || '(no ids)') + ' is on the board' };
  await flush();
  return { text: id + ' placed beside ' + about.join(', ') };
}
async function propose(args) {
  const ids = Array.isArray(args.ids) ? args.ids.map(String) : [];
  const s = session.getState();
  const slug = String(args.label || '').trim().toLowerCase().replace(/\s+/g, '-');
  if (!slug) return { text: 'a reading needs a label' };
  const weight = Math.max(0, Math.min(1, Number(args.confidence ?? 0.7)));
  const done = [];
  for (const id of ids) {
    if (!s.nodes.has(id)) continue;
    session.propose({ participantId: MM.LOCAL_PARTICIPANT, nodeId: id, edges: [{ to: 'type:' + slug, rel: 'resembles', weight, reasoning: String(args.reasoning || 'proposed by ' + label(ME)) }], at: now() });
    done.push(id);
  }
  if (!done.length) return { text: 'nothing proposed: none of ' + (ids.join(', ') || '(no ids)') + ' is on the board' };
  await flush();
  return { text: '“' + args.label + '” ' + weight.toFixed(2) + ' held on ' + done.join(', ') + ' — an offer to name; the hand decides' };
}
async function transcribe(args) {
  const s = session.getState();
  const id = String(args.id || '');
  if (!s.nodes.has(id)) return { text: 'no mark ' + id };
  const reps = [{ modality: 'transcript', data: { text: String(args.text || '') }, confidence: Math.max(0, Math.min(1, Number(args.confidence ?? 0.8))) }];
  for (const alt of Array.isArray(args.alternatives) ? args.alternatives : []) reps.push({ modality: 'transcript', data: { text: String(alt) }, confidence: 0.4 });
  if (!reps[0].data.text) return { text: 'a transcript needs text' };
  session.propose({ participantId: MM.LOCAL_PARTICIPANT, nodeId: id, edges: [], reps, at: now() });
  await flush();
  return { text: id + ' read as “' + reps[0].data.text + '”' + (reps.length > 1 ? ' (or ' + reps.slice(1).map((x) => '“' + x.data.text + '”').join(', ') + ')' : '') + ' — held as a transcript; the hand may take it as the name' };
}
async function write(args) {
  const kind = String(args.kind || 'html');
  if (!MM.rowOf(kind)) return { text: 'not a kind the canvas knows: ' + kind + ' (html, run, js, json, svg, md, text)' };
  const code = String(args.code || '');
  if (!code) return { text: 'nothing to write' };
  const s = session.getState();
  if (args.artifactId) {
    const id = String(args.artifactId);
    if (!s.artifacts.includes(id)) return { text: 'no artifact ' + id };
    session.attachCode({ participantId: MM.LOCAL_PARTICIPANT, nodeId: id, kind, code, prompt: String(args.name || 'from ' + label(ME)), at: now() });
    await flush();
    return { text: id + ': a new version (' + kind + ', ' + code.length + ' chars) — the hand plays it, or looks at it, as it likes' };
  }
  const q = args.bounds || {};
  const bounds = { minX: Number(q.x ?? 0), minY: Number(q.y ?? 0), maxX: Number(q.x ?? 0) + Number(q.w ?? 360), maxY: Number(q.y ?? 0) + Number(q.h ?? 240) };
  const name = String(args.name || 'from-' + label(ME)).replace(/[^A-Za-z0-9._-]+/g, '-');
  const row = MM.rowOf(kind);
  const ext = row.extensions[0];
  const file = name.endsWith('.' + ext) ? name : name + '.' + ext;
  const id = session.import({ kind, path: label(ME) + '/' + file, name: file, bounds, code, at: now() });
  if (!id) return { text: 'could not place it' };
  await flush();
  return { text: id + ' placed at ' + r(bounds.minX) + ',' + r(bounds.minY) + ' ' + r(bounds.maxX - bounds.minX) + '×' + r(bounds.maxY - bounds.minY) + ' (' + kind + ')' + (kind === 'run' ? ' — it waits for the hand to play it' : '') };
}

// ----- The tools ------------------------------------------------------------
const num = { type: 'number' };
const TOOLS = [
  {
    name: 'canvas_look',
    description: 'What is on the MetaMedium canvas, in words: every mark with what the engine reads it as (shape and confidence), names, transcripts, artifacts and their kinds, what is playing, the selection, who else is in the room. Use ids from here in the other tools. detail "full" is the brief a model gets (relations included).',
    inputSchema: { type: 'object', properties: { detail: { type: 'string', enum: ['brief', 'full'] }, ids: { type: 'array', items: { type: 'string' } } } },
    run: look,
  },
  {
    name: 'canvas_see',
    description: 'The ink as a picture (PNG): all of it, some marks by id, or a region in canvas units. This is how to read handwriting or look at a sketch — the engine sends no pixels to anyone otherwise.',
    inputSchema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } }, region: { type: 'object', properties: { x: num, y: num, w: num, h: num } }, size: num } },
    run: see,
  },
  {
    name: 'canvas_draw',
    description: 'Draw on the canvas in the shape rung\'s vocabulary — rectangle, circle, triangle ({shape, x, y, w, h}); line, arrow ({shape, from: {x, y}, to: {x, y}}) — or raw strokes (arrays of {x, y}). Canvas units; the human\'s marks say where things are (canvas_look). Marks are declared content, drawn in your colour, and read by the engine like anyone\'s. "why" is placed beside them.',
    inputSchema: { type: 'object', properties: { shapes: { type: 'array', items: { type: 'object' } }, strokes: { type: 'array', items: { type: 'array', items: { type: 'object', properties: { x: num, y: num } } } }, why: { type: 'string' } } },
    run: draw,
  },
  {
    name: 'canvas_say',
    description: 'Place a sentence beside some marks: an answer card on the canvas, attributed to you, erasable by the hand.',
    inputSchema: { type: 'object', required: ['text', 'about'], properties: { text: { type: 'string' }, about: { type: 'array', items: { type: 'string' } }, question: { type: 'string' } } },
    run: say,
  },
  {
    name: 'canvas_propose',
    description: 'Offer a reading of some marks — what they are, as a word, with a confidence and a reason. Held and attributed, never blessed: the human sees it in the field as an offer to name the group.',
    inputSchema: { type: 'object', required: ['ids', 'label'], properties: { ids: { type: 'array', items: { type: 'string' } }, label: { type: 'string' }, confidence: num, reasoning: { type: 'string' } } },
    run: propose,
  },
  {
    name: 'canvas_transcribe',
    description: 'Say what a piece of handwriting says (after canvas_see). Held on the mark as a transcript; the human may take it as a name or make it text.',
    inputSchema: { type: 'object', required: ['id', 'text'], properties: { id: { type: 'string' }, text: { type: 'string' }, confidence: num, alternatives: { type: 'array', items: { type: 'string' } } } },
    run: transcribe,
  },
  {
    name: 'canvas_write',
    description: 'Write code onto the canvas: a new artifact in a frame (bounds in canvas units), or a new version of an existing artifact by id. Kinds: html (a page: regions carry data-region), run (a program: `mm` gives width, height, ctx, THREE/scene/camera, onFrame(fn), onPointer(fn), report(name, x, y, w, h)), js, json, svg, md, text. A program is never played by you — the hand plays it.',
    inputSchema: { type: 'object', required: ['kind', 'code'], properties: { kind: { type: 'string' }, code: { type: 'string' }, name: { type: 'string' }, artifactId: { type: 'string' }, bounds: { type: 'object', properties: { x: num, y: num, w: num, h: num } } } },
    run: write,
  },
];

// ----- MCP over stdio: newline-delimited JSON-RPC -----------------------------
const send = (msg) => process.stdout.write(JSON.stringify(msg) + '\n');
const contentOf = (out) => {
  const content = [];
  if (out.text) content.push({ type: 'text', text: out.text });
  if (out.image) content.push({ type: 'image', data: out.image, mimeType: 'image/png' });
  return content;
};
async function handle(line) {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  if (!msg || typeof msg.method !== 'string') return; // a response to something we sent; we send nothing
  const reply = (result) => { if (msg.id !== undefined) send({ jsonrpc: '2.0', id: msg.id, result }); };
  const fail = (code, message) => { if (msg.id !== undefined) send({ jsonrpc: '2.0', id: msg.id, error: { code, message } }); };
  try {
    switch (msg.method) {
      case 'initialize':
        reply({
          protocolVersion: (msg.params && msg.params.protocolVersion) || '2025-06-18',
          capabilities: { tools: {} },
          serverInfo: { name: 'metamedium', version: '0.1.0' },
          instructions: 'You are a hand on a MetaMedium canvas, in room "' + ROOM + '" as "' + label(ME) + '". The human draws; the engine reads every mark (shape, role, concept) and the human names and builds from those readings. Look first (canvas_look), see the ink when it matters (canvas_see), then act with the same verbs a hand has: draw in the shape vocabulary, say a sentence beside marks, propose a reading, transcribe writing, write code. Everything you do is held and attributed to you; the human blesses or ignores it. Never claim a reading is settled — offer it with a confidence and a reason.',
        });
        break;
      case 'notifications/initialized':
      case 'notifications/cancelled':
        break;
      case 'ping':
        reply({});
        break;
      case 'tools/list':
        reply({ tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
        break;
      case 'tools/call': {
        const tool = TOOLS.find((t) => t.name === (msg.params && msg.params.name));
        if (!tool) { fail(-32602, 'no such tool: ' + (msg.params && msg.params.name)); break; }
        await ready;
        try {
          const out = await tool.run((msg.params && msg.params.arguments) || {});
          reply({ content: contentOf(out), isError: false });
        } catch (err) {
          reply({ content: [{ type: 'text', text: String(err && err.message || err) }], isError: true });
        }
        break;
      }
      default:
        fail(-32601, 'method not found: ' + msg.method);
    }
  } catch (err) {
    fail(-32603, String(err && err.message || err));
  }
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (line) handle(line);
  }
});
const shutdown = () => { try { store.close(); } catch { /* closing */ } if (relayServer) relayServer.close(); process.exit(0); };
process.stdin.on('end', shutdown);
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
log('metamedium mcp: room ' + ROOM + ' as ' + label(ME) + ' via ' + RELAY);

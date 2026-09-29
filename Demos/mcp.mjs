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
// look, see, draw, say, propose, label, transcribe, write. It proposes and never
// blesses; it can write a program and cannot play it; it holds no keys and
// no truth of its own. Its events reach the tab as its own log, stamped
// `by` on arrival like any other hand's, and draw in its own colour.
//
// **And it is the seat** (V1-PLAN J4): a page that seats *Claude Code (MCP
// hand)* asks it as it asks any model — What is this?, Read the writing, a
// question — and every question is PARKED in the room as a brief (core's
// `participants/seat.ts`). `canvas_pending` lists the briefs waiting, each with
// the contract a model would have been given and, for a read, the ink as a
// picture; `canvas_answer` answers one by the brief's own id, checked first
// against the parser the page will read it with. Every line this hand writes
// says it answers at the seat, and a beat keeps it heard while it waits, so
// the page can offer "Claude Code — in this room". `Demos/seat-watch.mjs`
// prints one line per brief parked, which is how a session is woken for one.
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

// ----- The engine, built --------------------------------------------------
const distPath = path.join(here, 'metamedium-core.node.mjs');
if (!existsSync(distPath)) {
  log('Demos/metamedium-core.node.mjs is missing — run `npm run build:node` in metamedium-core and copy dist/metamedium-core.node.mjs to Demos/');
  process.exit(1);
}
const MM = await import(pathToFileURL(distPath).href);

// A hand in a room is ONE SITTING — this process — the way a tab's is one page
// load (`sittingName`, DIRECTOR-PLAN-W2 L1): the name is the caller's and the
// suffix is this process's, because two logs under one name are taken for one
// log, and a restart that took an old name back would number its marks from
// one under a name the room already holds. With a fixed '~mcp' suffix, a
// second mcp.mjs on this machine — a leftover from an earlier session, a
// restart — answered every newcomer's hello with ITS log under the same name,
// and the last answer to land replaced the others. Should two hands come up
// under one name all the same, the store hears it and `canvas_look` says so.
const ME = MM.sittingName(NAME);

// ----- The room: a LiveStore over the relay, and a session from its logs -----
let relayServer = null;
try { relayServer = await ensureRelay(RELAY); } catch (err) { log(err.message); process.exit(1); }
if (relayServer) log(`relay started on ${RELAY} (none was answering)`);
const transport = relayTransport(RELAY, ROOM);
// A hand that answers at the seat says so on every line of its own (V1-PLAN
// J4), so a page in the room can offer Claude Code as the model it asks.
const store = new MM.LiveStore(transport, ME, ROOM, { seat: true });
// This hand SAYS WHAT ITS LOG IS CALLED (ids per hand, SURFACE-v10-PLAN D8).
// The name is the one its lines are appended under — `ME`, the same name
// `mergeLogs` is given as `me` — because the core derives every node id it
// mints from the log that wrote the event and that event's number in it.
// Unsaid, ids would come off a counter over the MERGED replay, and this
// process merges a different set of logs from every tab in the room: the ids
// in `canvas_look` would be this hand's private numbering, and `canvas_say`,
// `canvas_propose`, `canvas_transcribe` and `canvas_write` — every tool that
// names a mark — would land on whatever mark held that number here. That is
// the defect this says one word to close.
const session = MM.createSession({ ...MM.DEFAULT_SESSION_CONFIG, logName: ME });
let lastAt = 0;
const now = () => { lastAt = Math.max(Date.now(), lastAt + 1); return lastAt; };
const label = (name) => MM.handLabel(name);

// My log is the session's unstamped events — sent or not — never the room's
// copy of it: a line that lands between a send and the next merge would
// otherwise count my sent events twice. In the order they were written
// (`ownLog`), so a send is the new tail, not the whole log again.
const myLog = () => store.ownLog(session.getEvents());
// A room merges a line, not the board (V1-PLAN R4d), here as in a tab: the
// merge stands between lines (`LiveMerge`), is brought up to the logs only
// when one another hand wrote changed (`revision`), and hands the session
// what changed — applied after everything held, or replayed from the nearest
// checkpoint when it falls before.
const merger = new MM.LiveMerge(session, ME);
let merged = -1;
async function merge() {
  const rev = store.revision();
  if (rev === merged) return;
  merged = rev;
  merger.sync(store.heldLogs());
}
let mergePending = false;
const noticed = new Set();
store.subscribe(() => {
  // What the room says about itself — a name two hands share, a history older
  // than the relay remembers — goes to the log once, and stands in every look.
  for (const n of store.notices()) if (!noticed.has(n)) { noticed.add(n); log('room: ' + n); }
  if (mergePending) return;
  mergePending = true;
  Promise.resolve().then(() => { mergePending = false; return merge(); }).catch((err) => log('merge: ' + err.message));
});
/** My log as it stands, to the room: the tail when it only grew, the whole of it when it did not. */
let lastSent = Date.now();
async function flush() {
  lastSent = Date.now();
  await store.publish(myLog());
}
// A hand waiting for a brief can be quiet for an hour; a page asks who is here
// by who was heard in the last minute. So, while nothing else has been sent, a
// beat — a line with no events, which no hand merges or paints for.
const BEAT_MS = 20000;
setInterval(() => { if (Date.now() - lastSent >= BEAT_MS) { lastSent = Date.now(); store.here(); } }, BEAT_MS / 4).unref();
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
  // The name comes off the participant NODE, never out of its id. An id is
  // opaque here — received, echoed, compared — because its shape is the
  // core's business and reading one is how a tool starts guessing at
  // identity instead of asking. A hand the core made from a log's name
  // already carries that name as its word.
  return MM.wordOf(p) || 'another hand';
}
function codeRepOf(node) {
  for (let i = node.reps.length - 1; i >= 0; i--) if (node.reps[i].modality === 'code') return node.reps[i];
  return null;
}
// Who made a reading, said after it — never for the engine's own shape rung.
// In this hand's own session its own proposals are the local participant's,
// whose word is "local"; it is named by the name it goes by in the room.
function readBy(x) {
  const who = x.source === MM.LOCAL_PARTICIPANT ? label(ME) : x.sourceName;
  return x.tier || (who && who !== 'engine') ? ' · ' + who : '';
}
function describeMark(node, s) {
  const b = MM.boundsOf(node);
  // Readings are what the engine and the models read; a label is its maker's
  // word and is said on its own, never as one of them (L2b). Whoever read it
  // is said unless it is the engine's own shape rung: another hand's proposal
  // is a tier 0 voice too, and unsaid it reads as the engine's.
  const reads = MM.interpretationsOf(node, s.nodes).filter((x) => x.basis !== 'label').slice(0, 3).map((x) => x.label + ' ' + x.weight.toFixed(2) + readBy(x));
  const name = MM.wordOf(node);
  const lab = MM.labelOf(node);
  const said = MM.transcriptOf(node);
  const rep = codeRepOf(node);
  const who = authorOf(node, s);
  const parts = [node.id + (name ? ' “' + name + '”' : '')];
  if (rep) parts.push((rep.data.kind || 'html') + (rep.data.path ? ' ' + rep.data.path : ''));
  if (MM.isWord(node)) parts.push('a word of ' + MM.lettersOf(node).length + ' strokes');
  parts.push(reads.join(', ') || 'unread');
  if (lab) parts.push('labelled “' + lab.text + '”');
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
  // Said before the marks, because it changes what they mean: two hands under
  // one name are not both on this board, and a room older than the relay
  // remembers may be missing its beginning.
  for (const n of store.notices()) lines.push('room says: ' + n);
  // The library packs the board uses (V1-PLAN §2.3, B3): what it matches groups by besides what was taught here.
  if (s.packs.length) lines.push('uses ' + s.packs.join(', ') + ' — what they ship is matched here as if taught, attributed to them');
  for (const n of s.packNotices) lines.push('board says: ' + n.detail);
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
    // The seat's own traffic is said below, in a line each — never its prompt.
    if (MM.isSeatTraffic(n, s.nodes)) continue;
    const d = (n.reps.find((x) => x.modality === 'explanation') || {}).data || {};
    const about = n.edges.filter((e) => e.rel === 'about').map((e) => e.to);
    lines.push(id + ' · “' + (d.text || '') + '”' + (about.length ? ' about ' + about.join(', ') : '') + (authorOf(n, s) ? ' · by ' + authorOf(n, s) : ''));
  }
  const briefs = MM.seatBriefs(s).filter((b) => !b.withdrawn);
  for (const b of briefs.filter((x) => !x.reply)) {
    lines.push('brief ' + b.key + ' · ' + (b.asked || 'a brief') + ' · about ' + (b.about.join(', ') || '(nothing)') + ' · from ' + b.who + ' — waiting for you at the seat: canvas_pending reads it, canvas_answer answers it');
  }
  const answered = briefs.filter((x) => x.reply).length;
  if (answered) lines.push(answered + ' brief' + (answered === 1 ? '' : 's') + ' at the seat answered');
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
// A word on MY OWN ink (V1-PLAN L2b; the notes, §B and §D). Not a bless —
// naming a mark is the human's act — and not a file: a label is a rep on the
// mark, drawn beside it in this hand's colour, so a labelled drawing does not
// fill the folder with one-word text artifacts. The engine refuses a label on
// a mark this hand did not make and says whose it is; that sentence is what
// comes back here, never a silent no-op.
async function labelMark(args) {
  const ids = Array.isArray(args.ids) ? args.ids.map(String) : args.id ? [String(args.id)] : [];
  const text = String(args.text ?? '').trim();
  if (!ids.length) return { text: 'a label needs a mark to sit on (id, or ids)' };
  const done = [], refused = [];
  for (const id of ids) {
    const at = now();
    const got = session.label({ participantId: MM.LOCAL_PARTICIPANT, nodeId: id, text, at });
    const stale = session.getState().staleResult;
    if (got) done.push(id);
    else refused.push(id + ': ' + (stale && stale.what === 'label' ? stale.detail : 'not labelled'));
  }
  if (done.length) await flush();
  const said = done.length ? (text ? '“' + text + '” on ' + done.join(', ') : 'label taken off ' + done.join(', ')) : '';
  return { text: [said, ...refused].filter(Boolean).join('\n') };
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
  let bounds, where = '';
  if (args.place && !args.bounds) {
    const placed = placeBy(args.place, s);
    if (placed.error) return { text: placed.error };
    bounds = placed.bounds;
    where = ' — ' + placed.said;
  } else {
    const q = args.bounds || {};
    bounds = { minX: Number(q.x ?? 0), minY: Number(q.y ?? 0), maxX: Number(q.x ?? 0) + Number(q.w ?? 360), maxY: Number(q.y ?? 0) + Number(q.h ?? 240) };
  }
  const name = String(args.name || 'from-' + label(ME)).replace(/[^A-Za-z0-9._-]+/g, '-');
  const row = MM.rowOf(kind);
  const ext = row.extensions[0];
  const file = name.endsWith('.' + ext) ? name : name + '.' + ext;
  const id = session.import({ kind, path: label(ME) + '/' + file, name: file, bounds, code, at: now() });
  if (!id) return { text: 'could not place it' };
  await flush();
  return { text: id + ' placed at ' + r(bounds.minX) + ',' + r(bounds.minY) + ' ' + r(bounds.maxX - bounds.minX) + '×' + r(bounds.maxY - bounds.minY) + ' (' + kind + ')' + where + (kind === 'run' ? ' — it waits for the hand to play it' : '') };
}

// Writing a figure is not arithmetic (NOTES-DRAWING-WITH-THE-HAND §F): where
// a figure goes, said relative to a mark the way a hand would say it —
// inside it, under it, above it, beside it — instead of bounds worked out by
// hand from its box. The mark's own bounds are the ground; w and h are the
// figure's size when given, else the mark's side it shares. Nothing is
// guessed: a mark that is not on the board is said.
const PLACE_GAP = 12;
function placeBy(place, s) {
  const how = ['in', 'under', 'above', 'right', 'left'].find((k) => typeof place[k] === 'string');
  if (!how) return { error: 'a placement names a mark: {in|under|above|right|left: id, w?, h?}' };
  const id = place[how];
  const node = s.nodes.get(id);
  const b = node && !node.reps.some((x) => x.modality === 'erased') ? MM.boundsOf(node) : null;
  if (!b) return { error: 'not placed: no mark ' + id + ' on the board' };
  const bw = b.maxX - b.minX, bh = b.maxY - b.minY;
  const want = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
  let x, y, w, h;
  if (how === 'in') {
    // Inside, with an inset of a tenth of the short side, centred; never larger than the room inside.
    const inset = Math.min(bw, bh) * 0.1;
    const roomW = Math.max(1, bw - inset * 2), roomH = Math.max(1, bh - inset * 2);
    w = Math.min(roomW, want(place.w, roomW)); h = Math.min(roomH, want(place.h, roomH));
    x = b.minX + (bw - w) / 2; y = b.minY + (bh - h) / 2;
  } else if (how === 'under' || how === 'above') {
    w = want(place.w, bw); h = want(place.h, 40);
    x = b.minX; y = how === 'under' ? b.maxY + PLACE_GAP : b.minY - PLACE_GAP - h;
  } else {
    w = want(place.w, 200); h = want(place.h, bh);
    x = how === 'right' ? b.maxX + PLACE_GAP : b.minX - PLACE_GAP - w; y = b.minY;
  }
  return { bounds: { minX: x, minY: y, maxX: x + w, maxY: y + h }, said: (how === 'in' ? 'inside ' : how === 'right' || how === 'left' ? how + ' of ' : how + ' ') + id };
}

// ----- The seat (V1-PLAN J4) ------------------------------------------------
// A page that seats Claude Code parks every question in the room as a brief —
// an answer on the explanation plane whose question is `brief` — and waits for
// the answer whose question is the brief's own id. Core reads the plane for
// both sides (`pendingBriefs`, `seatBriefs`), so the hand and the page cannot
// disagree about what is waiting; and the answer is checked here with the same
// parser the page will read it with, so a reply the page could not read is
// said here and never sent.

/** What the page reads from an answer to this ask, and how it is written. */
const CONTRACTS = {
  what: { parse: (t) => MM.parseReadings(t).length > 0, shape: 'a JSON array of 1 to 4 readings: [{"label": "short-name", "confidence": 0.0–1.0, "reasoning": "one sentence citing the evidence"}]' },
  read: { parse: (t) => MM.parseTranscripts(t).length > 0, shape: 'a JSON array of what the writing says, best first: [{"text": "what it says", "confidence": 0.0–1.0}]' },
  ask: { parse: (t) => !!t.trim(), shape: '1–3 short sentences of plain prose, as a string' },
  build: { parse: (t) => !!MM.parseFill(t), shape: 'a JSON object: {"theme": {…}, "regions": {"<region id>": {"tag": "…", "style": "…", "html": "…"}}}' },
  program: { parse: (t) => !!MM.parseProgram(t), shape: 'a JSON object: {"name": "…", "parts": ["…"], "code": "the function body"} — or {"reuse": "<library name>"}' },
  draw: { parse: (t) => MM.parseShapes(t).length > 0, shape: 'a JSON array of shapes: [{"shape": "rectangle"|"circle"|"triangle", "x", "y", "w", "h", "why"} or {"shape": "line"|"arrow", "from": {x, y}, "to": {x, y}, "why"}]' },
  behave: { parse: (t) => MM.parseBehaviourReply(t).terms.length > 0, shape: 'a JSON object: {"terms": [{"verb": "…", "target": "…", "weight": 1, "why": "…"}], "unread": []}' },
};

function pending() {
  const s = session.getState();
  const waiting = MM.pendingBriefs(s);
  if (!waiting.length) return { text: 'no brief is parked. A person asks at the *Claude Code (MCP hand)* seat — What is this?, Read the writing, a question typed as ask: … — and it waits here until you answer it.' };
  const content = [];
  waiting.forEach((b, i) => {
    const c = CONTRACTS[b.ask] || null;
    const lines = [
      (i ? '========\n\n' : '') + 'brief ' + b.key + ' · ' + (b.asked || 'a brief') + ' · from ' + b.who,
      'about:',
      ...b.about.map((id) => { const n = s.nodes.get(id); return '  ' + (n ? describeMark(n, s) : id + ' (no longer on the board)'); }),
    ];
    let image = null;
    if (b.ask === 'read') {
      // The page would have handed a model its own picture of the ink; the log
      // carries no pixels, so the ink is drawn here from the board, as canvas_see draws it.
      const strokes = inkOf(s, b.about);
      if (strokes.length) {
        image = inkPNG(strokes.map((st) => st.points), { size: 640 }).png.toString('base64');
        lines.push('the ink of ' + b.about.join(', ') + ' is the picture below — read what it says');
      } else lines.push('(no ink left to show)');
    }
    lines.push('', 'THE CONTRACT — what a model is told; answer in exactly this:', b.contract || '(none was carried)', '', 'THE BRIEF:', b.brief, '',
      'Answer: canvas_answer { "key": "' + b.key + '", "reply": ' + (c ? c.shape : 'what the contract asks for') + ' } — or refuse: { "key": "' + b.key + '", "refuse": "one clause saying why" }.');
    content.push({ type: 'text', text: lines.join('\n') });
    if (image) content.push({ type: 'image', data: image, mimeType: 'image/png' });
  });
  return { content };
}

async function answer(args) {
  const key = String(args.key || '');
  const waiting = MM.pendingBriefs(session.getState());
  const held = waiting.find((b) => b.key === key);
  if (!held) {
    return { text: waiting.length
      ? 'no brief “' + key + '” is waiting. Waiting now: ' + waiting.map((b) => b.key).join(', ')
      : 'no brief “' + key + '” is waiting, and none is.' };
  }
  const wire = MM.seatReplyText({ reply: args.reply, refuse: args.refuse });
  if (wire.error) return { text: wire.error + ' — nothing was sent' };
  const refused = MM.refusalOf(wire.text);
  const c = CONTRACTS[held.ask];
  // A question is answered in prose: an object would reach the page as its JSON, and be placed as the answer.
  if (refused === null && held.ask === 'ask' && typeof args.reply !== 'string') {
    return { text: 'a question is answered in prose — pass "reply" as a string; nothing was sent, and brief ' + key + ' still waits' };
  }
  if (refused === null && c && !c.parse(wire.text)) {
    return { text: 'the page would read nothing from that: for “' + held.asked + '” it reads ' + c.shape + ' — nothing was sent, and brief ' + key + ' still waits' };
  }
  const id = session.answer({
    participantId: MM.LOCAL_PARTICIPANT,
    // The answer names the brief it answers, by the brief's own id…
    question: key,
    text: wire.text,
    // …and is about the marks the brief's own edges name: the page's ids, the same here.
    aboutIds: held.about,
    at: now(),
  });
  if (!id) return { text: 'the marks brief ' + key + ' was about are gone — nothing was sent' };
  await flush();
  return { text: refused !== null
    ? 'brief ' + key + ' refused: “' + refused + '” — the page says so, and nothing lands'
    : 'brief ' + key + ' answered (' + wire.text.length + ' chars) — the page reads it with the parser a model\'s reply meets, and holds what it reads, attributed to the seat; nothing is blessed' };
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
    name: 'canvas_label',
    description: 'Put a word on ink YOU drew — a caption on your own mark, drawn beside it in your colour at the board\'s scale. Not a bless and not a file: it never appears in the folder and never becomes a name the matcher learns. Labelling a mark another hand made is refused, with the reason. An empty text takes your label off.',
    inputSchema: { type: 'object', required: ['text'], properties: { id: { type: 'string' }, ids: { type: 'array', items: { type: 'string' } }, text: { type: 'string' } } },
    run: labelMark,
  },
  {
    name: 'canvas_transcribe',
    description: 'Say what a piece of handwriting says (after canvas_see). Held on the mark as a transcript; the human may take it as a name or make it text.',
    inputSchema: { type: 'object', required: ['id', 'text'], properties: { id: { type: 'string' }, text: { type: 'string' }, confidence: num, alternatives: { type: 'array', items: { type: 'string' } } } },
    run: transcribe,
  },
  {
    name: 'canvas_write',
    description: 'Write code onto the canvas: a new artifact in a frame (bounds in canvas units, or place: a spot relative to a mark — {in: id} centred inside it, {under|above: id} as wide as it, {right|left: id} as tall as it, each with an optional w and h), or a new version of an existing artifact by id. Kinds: html (a page: regions carry data-region), run (a program: `mm` gives width, height, ctx, THREE/scene/camera, onFrame(fn), onPointer(fn), report(name, x, y, w, h)), js, json, svg, md, text. A program is never played by you — the hand plays it.',
    inputSchema: { type: 'object', required: ['kind', 'code'], properties: { kind: { type: 'string' }, code: { type: 'string' }, name: { type: 'string' }, artifactId: { type: 'string' }, bounds: { type: 'object', properties: { x: num, y: num, w: num, h: num } }, place: { type: 'object', properties: { in: { type: 'string' }, under: { type: 'string' }, above: { type: 'string' }, right: { type: 'string' }, left: { type: 'string' }, w: num, h: num } } } },
    run: write,
  },
  {
    name: 'canvas_pending',
    description: 'The briefs a person has parked at the *Claude Code (MCP hand)* seat and nobody has answered: What is this? on some marks, Read the writing, a question, or a brief at a loop. Each comes with its key (the brief\'s own id), what was asked, the marks it is about with their ids, the CONTRACT a model would have been given — answer in exactly that — and the brief itself; for a read, the ink of those marks as a PNG. This is the seat: you are the model. Answer with canvas_answer.',
    inputSchema: { type: 'object', properties: {} },
    run: pending,
  },
  {
    name: 'canvas_answer',
    description: 'Answer a brief parked at the seat, IN THE CONTRACT canvas_pending printed with it — What is this?: an array of readings [{"label","confidence","reasoning"}]; Read the writing: an array [{"text","confidence"}]; a question: a string of plain prose. Pass it as "reply" (an array or object, or its JSON as a string). Or "refuse" with one clause saying why, and nothing lands. The page reads your answer with the same parser a model\'s meets and holds what it reads, attributed to the seat — never blessed; a reply it could not read is refused here, before anything is sent.',
    inputSchema: { type: 'object', required: ['key'], properties: { key: { type: 'string', description: 'The brief\'s own id, exactly as canvas_pending printed it. Copy it; never build one.' }, reply: { description: 'What the contract asks for.' }, refuse: { type: 'string' } } },
    run: answer,
  },
];

// ----- MCP over stdio: newline-delimited JSON-RPC -----------------------------
const send = (msg) => process.stdout.write(JSON.stringify(msg) + '\n');
const contentOf = (out) => {
  if (Array.isArray(out.content)) return out.content;
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
          instructions: 'You are a hand on a MetaMedium canvas, in room "' + ROOM + '" as "' + label(ME) + '". The human draws; the engine reads every mark (shape, role, concept) and the human names and builds from those readings. Look first (canvas_look), see the ink when it matters (canvas_see), then act with the same verbs a hand has: draw in the shape vocabulary, say a sentence beside marks, propose a reading, label your own marks, transcribe writing, write code. Everything you do is held and attributed to you; the human blesses or ignores it. Never claim a reading is settled — offer it with a confidence and a reason. You are also the SEAT: when the human asks *Claude Code (MCP hand)* — What is this?, Read the writing, a question — the brief is parked here; canvas_pending gives you it, the marks and the contract (and for a read, the ink as a picture), and canvas_answer returns your answer in that contract, which the page takes exactly as it takes a model\'s.',
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

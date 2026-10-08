#!/usr/bin/env node
// The MCP hand: dyna.ink's canvas as tools for Claude Code, or any MCP
// client (SURFACE-v10-PLAN D1).
//
//   node Demos/mcp.mjs                          # room "claude", relay http://127.0.0.1:8020, name "claude"
//   MM_ROOM=table MM_NAME=fable node Demos/mcp.mjs
//
// In the canvas: the *live* tile → *with Claude*, or open
// session-engine.html?live=claude&relay=http://127.0.0.1:8020. A relay is
// started here when none answers on this machine. The engine it runs is the
// committed Node bundle beside it (Demos/dynaink-core.node.mjs, built by
// `npm run build:node` in core, like the browser bundle).
//
// It is a hand in a room, nothing more. It keeps a session from the merged
// logs exactly as a tab does, and every tool is a verb a hand already has —
// look, see, draw, say, propose, label, transcribe, write, import — and, to organise
// a page of notes (PLAN-IPAD-NOTES A2), find, region and move. It may move anything on
// the board — John's ruling of 2 Oct 2026 (A2b: "ya claude can move marks") — and says
// whose marks it moved; a label and a rename keep their rule (its own ink, its own
// region). It proposes and never
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
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { relayTransport, ensureRelay, checkRelay, roomAssets } from './live-node.mjs';
import { inkPNG, decodePNG } from './ink-png.mjs';
import { sniffImage, MAX_ASSET_BYTES, tooLargeWords } from './relay-protocol.mjs';
import { doorsText, exportBoard, importBoard, looksLikeBoard, fileIsZip, BOARD_FILE_MAX } from './mcp-doors.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const log = (...a) => process.stderr.write(a.join(' ') + '\n');

// ----- Configuration: room, relay, name -------------------------------------
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : undefined; };
const ROOM = flag('room') || process.env.MM_ROOM || 'claude';
const RELAY = (flag('relay') || process.env.MM_RELAY || 'http://127.0.0.1:8020').replace(/\/+$/, '');
// A relay on the internet (cloudflare/relay) wants a key for the room: MM_RELAY_KEY, or --key
// (an argument is in the process list; the environment, or .mcp.json's env, is better).
const KEY = flag('key') || process.env.MM_RELAY_KEY || '';
const NAME = (flag('name') || process.env.MM_NAME || 'claude').replace(/~.*$/, '');

// A picture's bytes are not in the log: an `import` event names them by their SHA-256 and the room's relay keeps
// them (PLAN-IPAD-NOTES A1) — this hand puts them there before it names them, and fetches them to see them.
// ----- The engine, built --------------------------------------------------
const distPath = path.join(here, 'dynaink-core.node.mjs');
if (!existsSync(distPath)) {
  log('Demos/dynaink-core.node.mjs is missing — run `npm run build:node` in core and copy dist/dynaink-core.node.mjs to Demos/');
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
// Ask once whether the relay lets this hand into the room, and say why not: a relay that wants a
// key and is given none or a wrong one would otherwise be a room that is silently empty.
{
  const verdict = await checkRelay(RELAY, ROOM, { key: KEY });
  if (!verdict.ok) { log('dynaink mcp: ' + verdict.words); process.exit(1); }
}
const transport = relayTransport(RELAY, ROOM, { key: KEY });
const assets = roomAssets(RELAY, ROOM, { key: KEY });
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
  // A name somebody gave (a blessing) is theirs and no reading of anyone's: it says nothing here, as it never did.
  if (x.blessed) return x.tier ? ' · ' + x.sourceName : '';
  const who = x.source === MM.LOCAL_PARTICIPANT ? label(ME) : x.sourceName;
  return x.tier || (who && who !== 'engine') ? ' · ' + who : '';
}
/** The pictures the room is known to hold the bytes of (once put, they stay): what a look may say without asking. */
const roomHolds = new Set();
/** The pictures among some marks, with where each stands — erased ones left out. */
function picturesAmong(s, ids) {
  const out = [];
  for (const id of ids) {
    const n = s.nodes.get(id);
    if (!n || n.reps.some((x) => x.modality === 'erased')) continue;
    const pic = MM.pictureOf(n), b = pic && MM.boundsOf(n);
    if (pic && b) out.push({ id, pic, bounds: b });
  }
  return out;
}
/** Ask the room which of these pictures it holds, so a look can say it (one HEAD each, in parallel, the held remembered). */
async function checkPictures(s, ids) {
  const want = new Set();
  for (const p of picturesAmong(s, ids)) if (p.pic.asset && !roomHolds.has(p.pic.asset)) want.add(p.pic.asset);
  await Promise.all([...want].slice(0, 40).map(async (a) => { if (await assets.has(a.slice('sha256:'.length))) roomHolds.add(a); }));
}
/** Which region each mark stands in — the smallest one that holds it by the one rule (`regionMembers`) — as a Map from id to the region's name. */
function regionsHolding(s) {
  const out = new Map();
  if (!s.regions.length) return out;
  const area = new Map();
  for (const reg of MM.regionsOfBoard(s)) {
    const a = (reg.bounds.maxX - reg.bounds.minX) * (reg.bounds.maxY - reg.bounds.minY);
    for (const id of MM.regionMembers(s, reg.id)) {
      if (!(area.has(id) && area.get(id) <= a)) { area.set(id, a); out.set(id, reg.name); }
    }
  }
  return out;
}
/** Where a picture's pixels are, said after its size: in the room, in the tab that imported it, or nowhere. */
const roomPictureNote = (pic) => (pic.asset && roomHolds.has(pic.asset) ? ' · its pixels are in the room — canvas_see draws it' : pic.asset ? ' · its pixels are kept in the tab that imported it — this hand has none to see' : ' · no pixels were kept for it');
/**
 * One mark in a line. `view` says what a board read from a file cannot take from the room: `regionOf` (which region each mark stands in, from
 * `regionsHolding`) and `holds(pic)` (where a picture's pixels are) — with none, the room's own (a brief a seat is asked about names no region).
 */
function describeMark(node, s, view = {}) {
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
  // A picture: its name and size. Its bytes are not in the log: the hand that imported it put them in the room by
  // their hash, and where the room holds them canvas_see draws it; where it does not, the page that imported it
  // kept them (the browser's asset store) — this hand has none, and says so.
  const pic = MM.pictureOf(node);
  if (pic) parts.push('a picture ' + pic.name + (pic.w && pic.h ? ' ' + pic.w + '×' + pic.h : '') + (view.holds || roomPictureNote)(pic));
  else if (rep) parts.push((rep.data.kind || 'html') + (rep.data.path ? ' ' + rep.data.path : ''));
  if (MM.isWord(node)) parts.push('a word of ' + MM.lettersOf(node).length + ' strokes');
  parts.push(reads.join(', ') || 'unread');
  if (lab) parts.push('labelled “' + lab.text + '”');
  if (said) parts.push('says “' + said + '”');
  if (b) parts.push('at ' + r(b.minX) + ',' + r(b.minY) + ' ' + r(b.maxX - b.minX) + '×' + r(b.maxY - b.minY));
  if (s.live.includes(node.id)) parts.push(s.clocks[node.id] && s.clocks[node.id].playing ? 'playing' : 'live');
  const inside = view.regionOf && view.regionOf.get(node.id);
  if (inside) parts.push('in “' + inside + '”');
  if (who && who !== 'me' && view.author !== false) parts.push('by ' + who);
  return parts.join(' · ');
}
/** A region's line in a look: its place in the outline, what it holds, where it stands. */
function regionLine(s, o, outline) {
  const d = MM.describeRegion(s, o.id);
  if (!d) return null;
  const parent = o.parent && outline.find((x) => x.id === o.parent);
  return o.id + ' · ' + MM.regionSaid(d) + ' · at ' + r(d.bounds.minX) + ',' + r(d.bounds.minY) + ' ' + r(d.bounds.maxX - d.bounds.minX) + '×' + r(d.bounds.maxY - d.bounds.minY) +
    (parent ? ' · inside “' + parent.name + '”' : '') +
    (d.things.length ? ' · holds ' + d.things.slice(0, 12).join(', ') + (d.things.length > 12 ? ' and ' + (d.things.length - 12) + ' more' : '') : '');
}
/**
 * Every thing on a board in a line each, by id — marks, artifacts and regions — what a board read from a file is compared with the room's by (canvas_import).
 * `author: false` leaves who made it out: a log is written from one hand's point of view, so the same board reads its maker differently from another's.
 */
function thingLines(s, holds, author) {
  const regionOf = regionsHolding(s);
  const out = new Map();
  for (const id of s.contentIds) { const n = s.nodes.get(id); if (n) out.set(id, describeMark(n, s, { regionOf, holds, author })); }
  const outline = MM.regionOutline(s);
  for (const o of outline) { const line = regionLine(s, o, outline); if (line) out.set(o.id, line); }
  return out;
}
/** Who made each thing on a board, from this board's side: its id to the name of its maker, `me` for this board's own hand. */
function authorsOf(s) {
  const out = new Map();
  for (const id of s.contentIds) { const n = s.nodes.get(id); if (n) out.set(id, authorOf(n, s) || 'me'); }
  return out;
}
/**
 * What a look says of a board, after what it says of the room: the packs it uses, how many marks, each mark, the regions in the outline's
 * reading order, the handwriting a line at a time, the answers and the briefs. Nothing here awaits, so the table of which region each mark
 * stands in is this call's alone. `view` is for a board read from a file (canvas_import): `holds` says where a picture's pixels are, `limit`
 * caps the marks listed, and `scratch` leaves the seat out — a brief parked in a file is not the room's to answer.
 */
function boardLines(s, args, view = {}) {
  const regionOf = regionsHolding(s);
  const lines = [];
  // The library packs the board uses (V1-PLAN §2.3, B3): what it matches groups by besides what was taught here.
  if (s.packs.length) lines.push('uses ' + s.packs.join(', ') + ' — what they ship is matched here as if taught, attributed to them');
  for (const n of s.packNotices) lines.push('board says: ' + n.detail);
  const marks = s.contentIds.filter((id) => !s.artifacts.includes(id));
  lines.push(marks.length + ' mark' + (marks.length === 1 ? '' : 's') + ' · ' + s.artifacts.length + ' artifact' + (s.artifacts.length === 1 ? '' : 's') + ' · ' + s.live.length + ' live' +
    (s.selection.length ? ' · ' + s.selection.length + ' selected' : '') + (s.summon ? ' · the field is open on ' + s.summon.enclosedIds.length : '') + (s.pendingLassoId ? ' · a loop waits' : '') + (s.regions.length ? ' · ' + s.regions.length + ' region' + (s.regions.length === 1 ? '' : 's') : ''));
  if (args.detail === 'full') {
    lines.push(MM.describeSession(s, { nodeIds: args.ids }));
  } else {
    const ids = args.ids && args.ids.length ? args.ids : s.contentIds;
    const shown = view.limit ? ids.slice(0, view.limit) : ids;
    for (const id of shown) { const n = s.nodes.get(id); if (n) lines.push(describeMark(n, s, { regionOf, holds: view.holds })); }
    if (shown.length < ids.length) lines.push('and ' + (ids.length - shown.length) + ' more things — a board read from a file is said up to ' + view.limit + ' (canvas_import takes a limit)');
    if (!ids.length) lines.push('(nothing on the canvas)');
  }
  // The regions (PLAN-IPAD-NOTES I5, A2): named places on the board, in the outline's reading order — top to bottom, left to right,
  // a region under the smaller one that holds it — each with what stands inside it now. What a region holds is derived from where
  // things stand, never written; canvas_region makes one and canvas_move moves what is the hand's own.
  const outline = MM.regionOutline(s);
  for (const o of outline) { const line = regionLine(s, o, outline); if (line) lines.push(line); }
  if (outline.length) {
    const loose = s.contentIds.filter((id) => !regionOf.has(id) && !s.nodes.get(id).reps.some((x) => x.modality === 'erased'));
    lines.push(loose.length ? loose.length + ' thing' + (loose.length === 1 ? '' : 's') + ' stand in no region: ' + loose.slice(0, 12).join(', ') + (loose.length > 12 ? ' and ' + (loose.length - 12) + ' more' : '') : 'every thing stands in a region');
  }
  // Handwriting, a line at a time in reading order, with what a hand has read it as — so a page of notes can be organised by what it says.
  const writing = MM.writingLinesIn(s, args.ids && args.ids.length ? args.ids : s.contentIds);
  for (const w of writing.slice(0, 60)) {
    const said = w.ids.map((id) => MM.transcriptOf(s.nodes.get(id))).filter(Boolean);
    const reads = said.length
      ? 'reads “' + said.join(' ') + '”' + (said.length < w.ids.length ? ' (' + said.length + ' of ' + w.ids.length + ' marks read)' : '')
      : 'unread — canvas_see these marks, then canvas_transcribe each';
    const at = w.ids.map((id) => regionOf.get(id)).find(Boolean);
    lines.push('writing · ' + w.ids.join(', ') + ' · ' + reads + ' · at ' + r(w.box.minX) + ',' + r(w.box.minY) + ' ' + r(w.box.maxX - w.box.minX) + '×' + r(w.box.maxY - w.box.minY) + (at ? ' · in “' + at + '”' : ''));
  }
  if (writing.length > 60) lines.push('and ' + (writing.length - 60) + ' more lines of writing');
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
  if (view.scratch) {
    if (briefs.length) lines.push(briefs.length + ' brief' + (briefs.length === 1 ? '' : 's') + ' parked in this file for a seat (' + briefs.filter((x) => !x.reply).length + ' unanswered) — they belong to the room it came from; canvas_pending reads only this room\'s');
  } else {
    for (const b of briefs.filter((x) => !x.reply)) {
      lines.push('brief ' + b.key + ' · ' + (b.asked || 'a brief') + ' · about ' + (b.about.join(', ') || '(nothing)') + ' · from ' + b.who + ' — waiting for you at the seat: canvas_pending reads it, canvas_answer answers it');
    }
    const answered = briefs.filter((x) => x.reply).length;
    if (answered) lines.push(answered + ' brief' + (answered === 1 ? '' : 's') + ' at the seat answered');
  }
  return lines;
}
async function look(args) {
  const s = session.getState();
  await checkPictures(s, args.ids && args.ids.length ? args.ids : s.contentIds);
  // From here to the return nothing awaits, so a look is one reading of the board.
  const t = Date.now();
  const here = store.presence().filter((p) => t - p.at < 60000).map((p) => label(p.participant));
  const lines = ['room ' + ROOM + ' · you are ' + label(ME) + (here.length ? ' · with ' + here.join(', ') : ' · alone so far')];
  // Said before the marks, because it changes what they mean: two hands under
  // one name are not both on this board, and a room older than the relay
  // remembers may be missing its beginning.
  for (const n of store.notices()) lines.push('room says: ' + n);
  lines.push(...boardLines(s, args));
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
/** What a picture's bytes are, for drawing: fetched from the room once, decoded where this hand can (a PNG) — or null when the room holds none. */
const seenBytes = new Map();
async function pictureBytes(asset) {
  if (seenBytes.has(asset)) return seenBytes.get(asset);
  const got = await assets.get(asset.slice('sha256:'.length));
  if (!got) return null;
  const info = sniffImage(got.bytes);
  const rec = { bytes: got.bytes, mime: info ? info.mime : got.mime, image: info && info.mime === 'image/png' ? decodePNG(got.bytes) : null };
  if (seenBytes.size >= 12) seenBytes.delete(seenBytes.keys().next().value);
  seenBytes.set(asset, rec);
  return rec;
}
/** The most a picture shown as itself may weigh, in bytes: an image a model is handed is kept to a size it takes. */
const SEE_PICTURE_MAX = 4 * 1024 * 1024;
const FORMAT_NAMES = { 'image/png': 'a PNG', 'image/jpeg': 'a JPEG', 'image/webp': 'a WebP', 'image/gif': 'a GIF' };
async function see(args) {
  const s = session.getState();
  const ids = args.ids && args.ids.length ? args.ids : s.contentIds;
  let strokes = inkOf(s, ids);
  let pics = picturesAmong(s, ids);
  if (args.region) {
    const q = args.region;
    const meets = (b) => b.maxX >= q.x && b.minX <= q.x + q.w && b.maxY >= q.y && b.minY <= q.y + q.h;
    strokes = strokes.filter((st) => meets(MM.getBounds(st.points)));
    pics = pics.filter((p) => meets(p.bounds));
  }
  if (!strokes.length && !pics.length) return { text: 'no ink ' + (args.region ? 'in that region' : args.ids ? 'on those marks' : 'on the canvas') };
  // The pictures stand UNDER the ink, as a person sees the board: the bytes fetched from the room by their hash.
  const found = [];
  for (const p of pics.slice(0, 12)) found.push({ ...p, rec: p.pic.asset ? await pictureBytes(p.pic.asset) : null });
  const out = inkPNG(strokes.map((st) => st.points), { size: Math.min(1600, Math.max(64, args.size || 800)), pictures: found.map((f) => ({ name: f.pic.name, bounds: f.bounds, image: f.rec && f.rec.image })) });
  const all = strokes.flatMap((st) => st.points).concat(found.flatMap((f) => [{ x: f.bounds.minX, y: f.bounds.minY }, { x: f.bounds.maxX, y: f.bounds.maxY }]));
  const b = MM.getBounds(all);
  const lines = [
    (strokes.length ? strokes.length + ' stroke' + (strokes.length === 1 ? '' : 's') : '') + (strokes.length && found.length ? ' and ' : '') + (found.length ? found.length + ' picture' + (found.length === 1 ? '' : 's') : '') +
      ' from ' + r(b.minX) + ',' + r(b.minY) + ' to ' + r(b.maxX) + ',' + r(b.maxY) + ' (canvas units), ' + out.width + '×' + out.height + ' px: ' + strokes.map((st) => st.id).concat(found.map((f) => f.id + ' (' + f.pic.name + ')')).join(', '),
  ];
  const content = [];
  const extra = [];
  for (const f of found) {
    if (f.rec && f.rec.image) continue;
    if (!f.rec) { lines.push(f.pic.name + ' (' + f.id + '): the room holds no bytes for it — its frame is all that can be drawn; the tab that imported it keeps them'); continue; }
    const fmt = FORMAT_NAMES[f.rec.mime] || 'a picture';
    const sent = f.rec.bytes.length <= SEE_PICTURE_MAX && extra.length < 4;
    lines.push(f.pic.name + ' (' + f.id + '): ' + fmt + ' — this hand could not decode it into the picture above, so that shows its frame only' + (sent ? '; the picture itself follows as its own image' : '; it is too large to send as well'));
    if (sent) extra.push({ type: 'image', data: Buffer.from(f.rec.bytes).toString('base64'), mimeType: f.rec.mime });
  }
  content.push({ type: 'text', text: lines.join('\n') }, { type: 'image', data: out.png.toString('base64'), mimeType: 'image/png' }, ...extra);
  return { content };
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

// ----- Organising notes: find, regions, moves (PLAN-IPAD-NOTES A2) ----------------------------------------
// An agent that tidies a page of notes needs three more verbs of a hand's. Find asks core's search (the one Find on a tab
// asks) of this room's board. A region is made round marks by where they stand and writes nothing about them, so it may
// go round anyone's. A move may be of anything on the board (core's `handMoves`; John, 2 Oct 2026: "ya claude can move
// marks"), a region the hand made included, which carries what it holds. A person's undo is their own and does not reach
// another hand's move, so the reply says WHOSE marks moved (`movedSaid`: *3 marks — 2 of john’s*), the tab says it in its
// status line, and the way back is to move them back — the person's hand, or this one. A label and a rename keep their
// rule: a hand labels only its own ink and renames only a region it made.
const FIND_MAX = 50;
async function find(args) {
  const q = String(args.query ?? '').trim();
  if (!q) return { text: 'find needs words — say what to look for (a label, a name, something a hand wrote or read, a region)' };
  const s = session.getState();
  const limit = Math.max(1, Math.min(FIND_MAX, Math.floor(Number(args.limit)) || 10));
  // This hand has one board, the room's; it asks as a tab asks every board it keeps.
  const groups = MM.searchBoards([{ id: ROOM, name: ROOM, recency: Date.now(), entries: MM.searchEntriesOf(s) }], q, { hitsPerBoard: FIND_MAX + 1 });
  const hits = groups.flatMap((g) => g.hits).filter((h) => h.kind !== 'board');
  if (!hits.length) return { text: 'nothing says “' + q + '” on this board — canvas_look lists what is on it' };
  const lines = ['find “' + q + '” — ' + hits.length + ' hit' + (hits.length === 1 ? '' : 's')];
  for (const h of hits.slice(0, limit)) {
    const b = h.box;
    lines.push(h.id + ' · ' + MM.describeHit(h) + (b ? ' · at ' + r(b.minX) + ',' + r(b.minY) + ' ' + r(b.maxX - b.minX) + '×' + r(b.maxY - b.minY) : ''));
  }
  if (hits.length > limit) lines.push('and ' + (hits.length - limit) + ' more — ask with more words, or a larger limit');
  return { text: lines.join('\n') };
}

/** Who made a thing, for a sentence: the name its hand goes by. */
function makerOf(id, s) {
  const n = s.nodes.get(id);
  return (n && authorOf(n, s)) || 'another hand';
}
async function regionTool(args) {
  const name = String(args.name ?? '').trim();
  if (!name) return { text: 'a region needs a name (name: “Monday”)' };
  const s = session.getState();
  // Rename: only a region this hand made — a person's place is theirs to name, as their ink is theirs to label.
  if (args.id !== undefined) {
    const id = String(args.id);
    const node = s.nodes.get(id);
    if (!node || node.reps.some((x) => x.modality === 'erased') || !MM.regionRepOf(node)) return { text: 'no region ' + id + ' on the board' };
    if (!session.isMine(id)) return { text: id + ': not renamed — it was made by ' + makerOf(id, s) + '; a hand renames only the regions it made (canvas_region with around: makes a place of its own round their marks)' };
    if (!session.renameRegion({ nodeId: id, name, at: now() })) return { text: id + ': not renamed' };
    await flush();
    return { text: id + ' renamed “' + name + '”' };
  }
  const at = now();
  let made = null;
  const around = Array.isArray(args.around) ? args.around.map(String) : [];
  if (around.length) {
    const here = around.filter((id) => { const n = s.nodes.get(id); return n && !n.reps.some((x) => x.modality === 'erased'); });
    if (!here.length) return { text: 'no region made: none of ' + around.join(', ') + ' is on the board' };
    made = MM.makeRegion(session, { ids: here, name, at });
    if (!made) return { text: 'no region made: nothing among ' + here.join(', ') + ' stands anywhere to go round' };
  } else if (args.bounds && typeof args.bounds === 'object') {
    const q = args.bounds;
    const x = Number(q.x), y = Number(q.y), w = Number(q.w), h = Number(q.h);
    if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) return { text: 'bounds are {x, y, w, h} in canvas units, with a width and a height over zero' };
    const box = { minX: x, minY: y, maxX: x + w, maxY: y + h };
    const id = session.withTool('region', () => session.region({ name, bounds: box, at }), 'region');
    if (id) made = { id, name, around: 'marks', bounds: box };
  } else {
    return { text: 'a region goes round marks (around: their ids) or stands where a box says (bounds: {x, y, w, h}) — it needs one of them' };
  }
  if (!made) return { text: 'no region made' };
  await flush();
  const d = MM.describeRegion(session.getState(), made.id);
  if (!d) return { text: made.id + ' made, but it is not on the board' };
  const extra = d.things.filter((id) => !around.includes(id));
  return { text: made.id + ' · ' + MM.regionSaid(d) + ' · at ' + r(d.bounds.minX) + ',' + r(d.bounds.minY) + ' ' + r(d.bounds.maxX - d.bounds.minX) + '×' + r(d.bounds.maxY - d.bounds.minY) +
    (d.things.length ? ' · holds ' + d.things.slice(0, 12).join(', ') + (d.things.length > 12 ? ' and ' + (d.things.length - 12) + ' more' : '') : '') +
    (around.length && extra.length ? ' — also holds ' + extra.length + ' other thing' + (extra.length === 1 ? '' : 's') + ' that stand in that box' : '') +
    ' — it holds by where things stand and moved nothing' + (made.around === 'frame' ? '; taken from the rectangle drawn round them' : '') };
}

/** The box a group of marks stands in, as the board reads where they stand: what a move to a place is measured from. */
function boxOfMarks(s, ids) {
  let box = null;
  for (const id of ids) {
    const n = s.nodes.get(id);
    const b = n && MM.standingBoxOf(s.nodes, n);
    if (!b) continue;
    box = box ? { minX: Math.min(box.minX, b.minX), minY: Math.min(box.minY, b.minY), maxX: Math.max(box.maxX, b.maxX), maxY: Math.max(box.maxY, b.maxY) } : { ...b };
  }
  return box;
}
async function moveTool(args) {
  const ids = Array.isArray(args.ids) ? args.ids.map(String) : args.id ? [String(args.id)] : [];
  if (!ids.length) return { text: 'a move needs marks (ids)' };
  const s = session.getState();
  const verdict = MM.handMoves(s, ids);
  const refusals = verdict.refused.map((x) => x.id + ': not moved — no mark ' + x.id + ' on the board');
  const say = (head) => ({ text: [head, ...refusals].filter(Boolean).join('\n') });
  if (!verdict.allowed.length) return say('');
  // Where to: a step, a place for the marks' top left, or a region to stand them in.
  let dx = 0, dy = 0, how = '';
  const own = boxOfMarks(s, verdict.allowed);
  if (!own) return say('nothing moved: none of ' + verdict.allowed.join(', ') + ' stands anywhere');
  if (args.into !== undefined) {
    const reg = MM.regionsOfBoard(s).find((x) => x.id === String(args.into));
    if (!reg) return say('nothing moved: no region ' + args.into + ' on the board');
    const gw = own.maxX - own.minX, gh = own.maxY - own.minY, rw = reg.bounds.maxX - reg.bounds.minX, rh = reg.bounds.maxY - reg.bounds.minY;
    // Centred in it; a group larger than the place is stood from its top left.
    dx = gw > rw ? reg.bounds.minX - own.minX : (reg.bounds.minX + rw / 2) - (own.minX + gw / 2);
    dy = gh > rh ? reg.bounds.minY - own.minY : (reg.bounds.minY + rh / 2) - (own.minY + gh / 2);
    how = ' into “' + reg.name + '”';
  } else if (args.to && typeof args.to === 'object') {
    const x = Number(args.to.x), y = Number(args.to.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return say('nothing moved: to is {x, y} in canvas units');
    dx = x - own.minX; dy = y - own.minY;
    how = ' to ' + r(x) + ',' + r(y);
  } else if (args.dx !== undefined || args.dy !== undefined) {
    dx = Number(args.dx ?? 0); dy = Number(args.dy ?? 0);
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return say('nothing moved: dx and dy are numbers in canvas units');
    how = ' by ' + r(dx) + ',' + r(dy);
  } else {
    return say('nothing moved: say where — dx, dy (a step), to {x, y} (the marks\' top left) or into (a region\'s id)');
  }
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return say('nothing moved: already there');
  session.move({ ids: verdict.allowed, dx, dy, at: now() });
  await flush();
  const st = session.getState();
  const regions = new Set(st.regions);
  const said = MM.movedSaid(st, verdict.moved, (id) => session.isMine(id), (id) => makerOf(id, st));
  return say('moved ' + said + how + ': ' + verdict.allowed.join(', ') + (verdict.allowed.some((id) => regions.has(id)) ? ' — with what the region holds' : ''));
}

// ----- A picture on the board (PLAN-IPAD-NOTES A1) -------------------------------------------
// A picture is its bytes and an `import` event that names them. The event goes in this hand's log as any
// hand's does; the bytes go to the room's relay by their SHA-256 FIRST, so no hand ever holds an event naming
// bytes the room does not — and a hand that has none (a tab opened later, in another browser) fetches them
// by that hash. PNG, JPEG and WebP are pictures, their size read from their own header by hand; an SVG is a
// thing the board already draws, an `svg` artifact holding its text, so it never touches the relay.
const PICTURE_KINDS = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
const SVG_MAX_CHARS = 1e6;
const PICTURE_WAIT_MS = 20000;
/** The bytes the arguments name — a file, a web address or base64 — or a sentence saying why not. */
async function pictureSource(args) {
  if (typeof args.path === 'string' && args.path) {
    const file = path.resolve(args.path);
    let st;
    try { st = await stat(file); } catch { return { error: 'no file at ' + file }; }
    if (!st.isFile()) return { error: file + ' is not a file' };
    // A board bundle carries photographs, so it may be bigger than any picture on the board; nothing else may.
    const zipped = fileIsZip(file);
    if (st.size > (zipped ? BOARD_FILE_MAX : MAX_ASSET_BYTES * 4)) return { error: file + ' is ' + Math.round(st.size / 1048576) + ' MB — ' + (zipped ? 'a board bundle is read up to ' + Math.round(BOARD_FILE_MAX / 1048576) + ' MB' : 'a picture on the board is up to 12 MB') };
    try { return { bytes: new Uint8Array(await readFile(file)), name: path.basename(file) }; } catch (err) { return { error: 'could not read ' + file + ' — ' + (err && err.message || err) }; }
  }
  if (typeof args.url === 'string' && args.url) {
    let u;
    try { u = new URL(args.url); } catch { return { error: args.url + ' is not an address' }; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return { error: 'only an http or https address can be fetched, not ' + u.protocol };
    try {
      const res = await fetch(u, { signal: AbortSignal.timeout(PICTURE_WAIT_MS), redirect: 'follow' });
      if (!res.ok) return { error: u.host + ' answered HTTP ' + res.status };
      const parts = [];
      let size = 0;
      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > MAX_ASSET_BYTES * 4) { await reader.cancel().catch(() => undefined); return { error: u.host + ' sent more than a picture on the board may be (12 MB)' }; }
        parts.push(value);
      }
      return { bytes: new Uint8Array(Buffer.concat(parts)), name: decodeURIComponent(u.pathname.split('/').pop() || '') };
    } catch (err) { return { error: 'could not fetch ' + args.url + ' — ' + (err && err.message || err) }; }
  }
  if (typeof args.base64 === 'string' && args.base64) {
    const text = args.base64.replace(/^data:[^,]*,/, '').replace(/\s+/g, '');
    if (!/^[A-Za-z0-9+/_-]*={0,2}$/.test(text)) return { error: 'that is not base64' };
    return { bytes: new Uint8Array(Buffer.from(text, 'base64')), name: '' };
  }
  return { error: 'a picture is named by a path, a url or base64 — pass one of them' };
}
/** The box a picture stands in: the box given (`at`, or `place` relative to a mark), else beside everything on the board; the picture fitted inside it, its own proportions, from its top left. */
function pictureBounds(args, s, w, h) {
  const ratio = w > 0 && h > 0 ? w / h : 1;
  const fit = (x, y, bw, bh) => {
    const k = Math.min(bw / ratio, bh);
    return { minX: x, minY: y, maxX: x + k * ratio, maxY: y + k };
  };
  const want = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);
  if (args.place && !args.at) {
    const placed = placeBy(args.place, s);
    if (placed.error) return { error: placed.error };
    const b = placed.bounds;
    return { bounds: fit(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY), said: ' — ' + placed.said };
  }
  if (args.at) {
    const x = Number(args.at.x ?? 0), y = Number(args.at.y ?? 0);
    let bw = want(args.at.w), bh = want(args.at.h);
    if (!bw && !bh) bw = Math.min(360, w || 360);
    if (!bw) bw = bh * ratio;
    if (!bh) bh = bw / ratio;
    return { bounds: fit(x, y, bw, bh), said: '' };
  }
  // Nowhere said: beside what is on the board, as the page lays a picture clear of the marks.
  let right = -Infinity, top = Infinity;
  for (const id of s.contentIds) { const n = s.nodes.get(id), b = n && !n.reps.some((x) => x.modality === 'erased') && MM.boundsOf(n); if (b) { right = Math.max(right, b.maxX); top = Math.min(top, b.minY); } }
  const x = Number.isFinite(right) ? right + 40 : 0, y = Number.isFinite(top) ? top : 0;
  const bw = Math.min(360, w || 360);
  return { bounds: fit(x, y, bw, bw / ratio), said: Number.isFinite(right) ? ' — beside what is on the board' : '' };
}
async function importPicture(args) {
  const src = await pictureSource(args);
  if (src.error) return { text: 'nothing placed: ' + src.error };
  const bytes = src.bytes;
  const s = session.getState();
  const stem = (name) => String(name || '').replace(/\.[A-Za-z0-9]{1,5}$/, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'picture';
  const given = args.name ? String(args.name) : src.name;
  // An SVG is a figure the board draws from its text.
  const head = Buffer.from(bytes.subarray(0, 512)).toString('utf8').replace(/^﻿/, '').trimStart();
  const isSvg = /\.svg$/i.test(given || '') || (!sniffImage(bytes) && /^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(head));
  if (isSvg) {
    const code = Buffer.from(bytes).toString('utf8');
    if (!/<svg[\s>]/i.test(code)) return { text: 'nothing placed: that is not an SVG — it has no <svg> in it' };
    if (code.length > SVG_MAX_CHARS) return { text: 'nothing placed: that SVG is ' + code.length + ' characters — the board takes up to ' + SVG_MAX_CHARS };
    const vb = /viewBox\s*=\s*"[\s,]*[-\d.eE]+[\s,]+[-\d.eE]+[\s,]+([\d.eE]+)[\s,]+([\d.eE]+)/i.exec(code);
    const placed = pictureBounds(args, s, vb ? Number(vb[1]) : 0, vb ? Number(vb[2]) : 0);
    if (placed.error) return { text: placed.error };
    const file = stem(given) + '.svg';
    const id = session.import({ kind: 'svg', path: label(ME) + '/' + file, name: file, bounds: placed.bounds, code, at: now() });
    if (!id) return { text: 'could not place it' };
    await flush();
    const b = placed.bounds;
    return { text: id + ' placed at ' + r(b.minX) + ',' + r(b.minY) + ' ' + r(b.maxX - b.minX) + '×' + r(b.maxY - b.minY) + ' (svg ' + file + ', ' + code.length + ' characters — drawn from its text, so the room carries it in the log, not as bytes)' + placed.said };
  }
  // A log or a bundle is a board, not a picture: it is read into a SCRATCH session — the room is never written — and said in words.
  if (!sniffImage(bytes) && looksLikeBoard(bytes)) {
    const limit = Math.floor(Number(args.limit)) > 0 ? Math.min(2000, Math.floor(Number(args.limit))) : undefined;
    return importBoard({ MM, session, thingLines, authorsOf, describeBoard: (st, o) => boardLines(st, {}, { holds: o.holds, limit: o.limit, scratch: true }) }, bytes, given, { limit });
  }
  if (bytes.length > MAX_ASSET_BYTES) return { text: 'nothing placed: ' + tooLargeWords(bytes.length) };
  const info = sniffImage(bytes);
  if (!info) return { text: 'nothing placed: those bytes are not a picture, a log or a bundle — the board takes a PNG, JPEG or WebP (or an SVG) onto it, and a log (.jsonl) or a bundle (.dyna.zip) into a scratch session, whatever the file is called' };
  const kind = PICTURE_KINDS[info.mime];
  if (!kind) return { text: 'nothing placed: ' + (info.mime === 'image/gif' ? 'a GIF' : info.mime) + ' is not a picture the board draws — a PNG, JPEG or WebP is' };
  if (!(info.w > 0 && info.h > 0)) return { text: 'nothing placed: could not read the size of that ' + FORMAT_NAMES[info.mime].slice(2) + ' from its header' };
  const hash = createHash('sha256').update(bytes).digest('hex');
  // The bytes first: the room holds them (already, or now) before any event names them.
  if (!(await assets.has(hash))) {
    const put = await assets.put(hash, bytes);
    if (!put.ok) return { text: 'nothing placed: the room would not take the picture — ' + put.words };
  }
  roomHolds.add('sha256:' + hash);
  const placed = pictureBounds(args, s, info.w, info.h);
  if (placed.error) return { text: placed.error };
  const file = stem(given) + '.' + kind;
  const id = session.import({ kind, path: 'imports/' + file, name: file, bounds: placed.bounds, asset: 'sha256:' + hash, mime: info.mime, w: info.w, h: info.h, at: now() });
  if (!id) return { text: 'could not place it' };
  await flush();
  const b = placed.bounds;
  return { text: id + ' placed at ' + r(b.minX) + ',' + r(b.minY) + ' ' + r(b.maxX - b.minX) + '×' + r(b.maxY - b.minY) + ' (' + FORMAT_NAMES[info.mime].slice(2) + ' ' + file + ', ' + info.w + '×' + info.h + ', ' + (bytes.length < 10240 ? bytes.length + ' bytes' : Math.round(bytes.length / 1024) + ' KB') + ') — its bytes are in the room under their hash, so every hand draws it' + placed.said };
}

// ----- The seat (V1-PLAN J4) ------------------------------------------------
// A page that seats Claude Code parks every question in the room as a brief —
// an answer on the explanation plane whose question is `brief` — and waits for
// the answer whose question is the brief's own id. Core reads the plane for
// both sides (`pendingBriefs`, `seatBriefs`), so the hand and the page cannot
// disagree about what is waiting; and the answer is checked here with the same
// parser the page will read it with, so a reply the page could not read is
// said here and never sent.

/**
 * What the page reads from an answer to a brief, and how it is written: for each kind of ask, the parser the page reads a model's reply with
 * (`parse(text, held)`, true when it reads something), the reply's shape in words, and an example the parser takes — which `canvas_doors` says
 * beside the contract it reads from core and checks against this very parser. A kind with a variant of its own has an entry of its own
 * (`read-lines`: a sheet of numbered lines; `build-revise`: a page already filled in), picked by `contractOf`.
 */
const linesAsked = (held) => Number((/sheet of (\d+) numbered line/.exec((held && held.brief) || '') || [])[1]) || 99;
const CONTRACTS = {
  what: { parse: (t) => MM.parseReadings(t).length > 0, shape: 'a JSON array of 1 to 4 readings: [{"label": "short-name", "confidence": 0.0–1.0, "reasoning": "one sentence citing the evidence"}]',
    example: [{ label: 'pair of cards', confidence: 0.82, reasoning: 'two boxes of one size, side by side on one band' }, { label: 'two windows', confidence: 0.4, reasoning: 'the same boxes, read as a facade' }] },
  read: { parse: (t) => MM.parseTranscripts(t).length > 0, shape: 'a JSON array of what the writing says, best first: [{"text": "what it says", "confidence": 0.0–1.0}]',
    example: [{ text: 'hello', confidence: 0.9 }, { text: 'hallo', confidence: 0.3 }] },
  'read-lines': { parse: (t, held) => MM.parseLineReadings(t, linesAsked(held)).some((l) => l.length > 0), shape: 'a JSON array, an object a line, numbered as the sheet is: [{"line": 1, "text": "what line 1 says", "confidence": 0.0–1.0}, …] — a line you cannot read at all: {"line": 3, "text": "", "confidence": 0}',
    example: [{ line: 1, text: 'hello world', confidence: 0.9 }, { line: 2, text: 'a second line', confidence: 0.8 }] },
  ask: { parse: (t) => !!t.trim(), shape: '1–3 short sentences of plain prose, as a string', example: 'They are one size and sit on one band, a gap apart.' },
  build: { parse: (t) => !!MM.parseFill(t), shape: 'a JSON object: {"theme": {…}, "regions": {"<region id>": {"tag": "…", "style": "…", "html": "…"}}}',
    example: { theme: { background: '#fbfaf7', color: '#14140f', accent: '#1f7a74', fontFamily: 'system-ui, sans-serif' }, regions: { r1: { tag: 'header', style: 'padding:24px', html: '<h1>Plans</h1><p>One price, everything in it.</p>' }, r2: { tag: 'section', html: '<h2>Pro</h2><p>For people who draw all day.</p>' } } } },
  'build-revise': { parse: (t) => !!MM.parseFill(t), shape: 'a JSON object holding ONLY the regions you change: {"regions": {"<region id>": {"tag": "…", "style": "…", "html": "…"}}} — and "theme" only when the request is about the whole page\'s look',
    example: { regions: { r1: { tag: 'header', style: 'padding:24px', html: '<h1 style="font-size:48px">Plans</h1>' } } } },
  program: { parse: (t) => !!MM.parseProgram(t), shape: 'a JSON object: {"name": "…", "parts": ["…"], "code": "the function body"} — or {"reuse": "<library name>"}',
    example: { name: 'dot', parts: ['dot'], code: 'mm.ctx.clearRect(0, 0, mm.width, mm.height); mm.ctx.fillStyle = "teal"; mm.ctx.fillRect(10, 10, 20, 20); mm.report("dot", 10, 10, 20, 20);' } },
  draw: { parse: (t) => MM.parseShapes(t).length > 0, shape: 'a JSON array of shapes: [{"shape": "rectangle"|"circle"|"triangle", "x", "y", "w", "h", "why"} or {"shape": "line"|"arrow", "from": {x, y}, "to": {x, y}, "why"}]',
    example: [{ shape: 'rectangle', x: 100, y: 240, w: 160, h: 100, why: 'a box under the first, the same size' }] },
  behave: { parse: (t) => MM.parseBehaviourReply(t).terms.length > 0, shape: 'a JSON object: {"terms": [{"verb": "…", "target": "…", "weight": 1, "why": "…"}], "unread": []}',
    example: { terms: [{ verb: 'wander', weight: 1, why: 'drifts about' }, { verb: 'flee', target: 'shark', weight: 1, why: 'runs from sharks' }], unread: [] } },
};
/** The entry for a held brief: its variant's when it is one — a lines read is told by its contract, which is core's `READ_LINES_PROMPT` — else its kind's. */
const contractOf = (b) => (b.ask === 'read' && b.contract === MM.READ_LINES_PROMPT ? CONTRACTS['read-lines'] : CONTRACTS[b.ask] || null);

function pending() {
  const s = session.getState();
  const waiting = MM.pendingBriefs(s);
  if (!waiting.length) return { text: 'no brief is parked. A person asks at the *Claude Code (MCP hand)* seat — What is this?, Read the writing, a question typed as ask: … — and it waits here until you answer it.' };
  const content = [];
  waiting.forEach((b, i) => {
    const c = contractOf(b);
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
  const c = contractOf(held);
  // A question is answered in prose: an object would reach the page as its JSON, and be placed as the answer.
  if (refused === null && held.ask === 'ask' && typeof args.reply !== 'string') {
    return { text: 'a question is answered in prose — pass "reply" as a string; nothing was sent, and brief ' + key + ' still waits' };
  }
  if (refused === null && c && !c.parse(wire.text, held)) {
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

// ----- The doors, and the board out (V1-SPEC §3.13, CG7a) --------------------------------------
// John wants a dev session to use every door first-hand. `canvas_doors` lists them from the running code — see mcp-doors.mjs for what is read
// from where — `canvas_export` writes the board as the app writes it, and `canvas_import` (above) reads a log or a bundle back into a scratch
// session. None of the three writes a thing to the room.
async function doors(args) {
  const s = session.getState();
  const t = Date.now();
  // The pictures the board names, and which of them the room holds: one HEAD each, the held remembered.
  await checkPictures(s, s.contentIds);
  const named = new Set(picturesAmong(s, s.contentIds).map((p) => p.pic.asset).filter(Boolean));
  const text = await doorsText({
    MM, tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })), contracts: CONTRACTS,
    room: ROOM, relay: RELAY, keySet: !!KEY, me: label(ME), state: s,
    presence: store.presence().filter((p) => t - p.at < 60000).map((p) => ({ who: label(p.participant), seat: !!p.seat })),
    waiting: MM.pendingBriefs(s), notices: store.notices(),
    picturesNamed: named.size, picturesHeld: [...named].filter((a) => roomHolds.has(a)).length,
  }, args);
  return { text };
}
async function exportTool(args) {
  return exportBoard({ MM, session, assets, room: ROOM }, args);
}

// ----- The tools ------------------------------------------------------------
const num = { type: 'number' };
const TOOLS = [
  {
    name: 'canvas_look',
    description: 'What is on the dyna.ink canvas, in words: every mark with what the engine reads it as (shape and confidence), names, transcripts, artifacts and their kinds, the regions (named places in the board\'s outline — reading order, nested ones under the one that holds them — with what each holds, and which things stand in none), each mark with the region it stands in, handwriting a line at a time in reading order with what a hand has read it as (or that it is unread), what is playing, the selection, who else is in the room. Use ids from here in the other tools. detail "full" is the brief a model gets (relations included).',
    inputSchema: { type: 'object', properties: { detail: { type: 'string', enum: ['brief', 'full'] }, ids: { type: 'array', items: { type: 'string' } } } },
    run: look,
  },
  {
    name: 'canvas_see',
    description: 'The ink as a picture (PNG): all of it, some marks by id, or a region in canvas units, with the board\'s pictures under it where the room holds their bytes (a PNG is drawn in; a JPEG or WebP is a frame in the PNG and comes as its own image after it). This is how to read handwriting or look at a sketch — the engine sends no pixels to anyone otherwise.',
    inputSchema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } }, region: { type: 'object', properties: { x: num, y: num, w: num, h: num } }, size: num } },
    run: see,
  },
  {
    name: 'canvas_draw',
    description: 'Draw on the canvas in the shape rung\'s vocabulary — rectangle, circle, triangle ({shape, x, y, w, h}); line, arrow ({shape, from: {x, y}, to: {x, y}}) — or raw strokes (arrays of {x, y}). Canvas units; the human\'s marks say where things are (canvas_look). Marks are declared content, drawn in your colour, and read by the engine like anyone\'s. "why" is placed beside them.',
    inputSchema: { type: 'object', properties: { shapes: { type: 'array', items: { type: 'object' } }, strokes: { type: 'array', items: { type: 'array', items: { type: 'object', properties: { x: num, y: num } } } }, why: { type: 'string' }, gesture: { type: 'boolean', description: 'Raw strokes only: leave them as gestures — ink the engine may read as a lasso, a command mark or a scratch — instead of declared content.' } } },
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
    name: 'canvas_import',
    description: 'Put a picture on the board: a file (path), a web address (url) or base64, a PNG, JPEG or WebP (its size is read from its header) — or an SVG, which becomes an svg artifact drawn from its text. The bytes go to the room by their SHA-256 first, then an import event in your log names them, so every hand in the room draws it (a tab fetches the bytes by that hash) — up to 12 MB. Where: at {x, y, w?, h?} in canvas units (the picture is fitted in its own proportions), or place: {in|under|above|right|left: id, w?, h?} relative to a mark as canvas_write places; neither puts it beside what is on the board. canvas_see draws it under the ink. A board file is read too: a log (.jsonl, version 0 or 1) or a bundle (.dyna.zip) is read into a SCRATCH session, never the room — nothing is written to it — and the reply is that board in words, as canvas_look says a board, with the round-trip facts: its events, marks and pictures, and whatever reads differently from the board in the room (limit: most things listed, default 200).',
    inputSchema: { type: 'object', properties: { limit: num, path: { type: 'string' }, url: { type: 'string' }, base64: { type: 'string' }, name: { type: 'string' }, at: { type: 'object', properties: { x: num, y: num, w: num, h: num } }, place: { type: 'object', properties: { in: { type: 'string' }, under: { type: 'string' }, above: { type: 'string' }, right: { type: 'string' }, left: { type: 'string' }, w: num, h: num } } } },
    run: importPicture,
  },
  {
    name: 'canvas_find',
    description: 'Find words on this board, as Find does on a tab: the labels on marks, the names of what was made, typed texts, the words in a figure or a page, what a hand read from handwriting (transcripts), a picture\'s file name and a region\'s name. Words typed are all looked for, an exact word before one that only begins with what was typed (so a half-typed word finds). Each hit comes with the id of the mark or region that holds it, what it stands on in plain words, and where it stands (canvas units) — go there with canvas_see, or put a region round it.',
    inputSchema: { type: 'object', required: ['query'], properties: { query: { type: 'string' }, limit: { type: 'number', description: 'Most hits to list (default 10, at most 50).' } } },
    run: find,
  },
  {
    name: 'canvas_region',
    description: 'Make a region — a named rectangle that holds whatever stands inside it, so Monday and Pricing are places on the board — or rename one you made. Make it round marks (around: their ids, anyone\'s: a region holds by where things stand and moves nothing, so it may go round another hand\'s notes) or at a box (bounds: {x, y, w, h}, canvas units). The reply says what it holds. Rename: id + name — only a region you made; a person\'s region is theirs to name. A region you made moves with canvas_move, and takes what it holds — another hand\'s marks too.',
    inputSchema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, around: { type: 'array', items: { type: 'string' } }, bounds: { type: 'object', properties: { x: num, y: num, w: num, h: num } }, id: { type: 'string', description: 'A region of yours to rename.' } } },
    run: regionTool,
  },
  {
    name: 'canvas_move',
    description: 'Move marks or a region, in one act: by dx, dy; or to {x, y} (the marks\' top left); or into a region (its id — centred in it). You may move ANYTHING on the board, a person\'s marks and a region of yours that holds them included (John, 2 Oct 2026: "ya claude can move marks"); a region moved takes what it holds. The reply says WHOSE marks moved — “3 marks — 2 of john’s” — and so should you: the person\'s undo is their own and cannot take back another hand\'s move, and their tab says who moved their marks; their way back is to move them themselves or ask you, and you move them back with the opposite dx, dy. To organise their notes either put a region round them (canvas_region) or move them into one. A list may be half moved: what is on the board moves in one event and each id that is not is said. Labels and renames are not moves: you label only your own ink and rename only a region you made.',
    inputSchema: { type: 'object', required: ['ids'], properties: { ids: { type: 'array', items: { type: 'string' } }, dx: num, dy: num, to: { type: 'object', properties: { x: num, y: num } }, into: { type: 'string' } } },
    run: moveTool,
  },
  {
    name: 'canvas_doors',
    description: 'List every way in and out of dyna.ink, read from the running code and never from a copy in a document: the pen (the shapes canvas_draw takes, each drawn and read back now), the seats (every brief a page parks for Claude Code — What is this?, Read the writing, ask:, build:, program, draw, behave — with its contract VERBATIM, the shape of the reply, an example this hand\'s own parser accepts, and who sits where in this room), MCP both ways (this hand\'s tools, the 3D hand\'s, the canvas\'s client door, what .mcp.json registers), the room (relay, room, who is heard, notices, the pictures it holds) and every format in and out with the function that writes it and the one that reads it — and what Node cannot make (board.png, board.pdf: the page\'s) and what is not built yet. door narrows it to one of pen, seats, mcp, room, formats, gaps; seat to one brief kind (what, read, read-lines, ask, build, build-revise, program, draw, behave). Writes nothing.',
    inputSchema: { type: 'object', properties: { door: { type: 'string', enum: ['pen', 'seats', 'mcp', 'room', 'formats', 'gaps'] }, seat: { type: 'string' } } },
    run: doors,
  },
  {
    name: 'canvas_export',
    description: 'Write the board — or the marks named by ids — as the app writes it. format: log (a version 1 .jsonl: a header line, then one event a line), bundle (a .dyna.zip: board.jsonl and assets/<sha256>.<ext>, the pictures the room holds), svg (board.svg: pictures, figures, writing and ink in board order), mermaid (the likeliest notation the marks read as, as .mmd text) or truesize (every figure with numbers, drawn at its real size from the numbers). A text format comes back inline — a sentence, then the file\'s exact text in a block of its own — unless it is too big for an answer (then it is a file); a bundle is binary and always a file, under the OS temp directory or at out (a folder, or a path ending in the format\'s extension — never inside the repository), the reply giving its path, size and entries. ids narrow svg, mermaid and truesize; a log and a bundle are the whole board. Reads the room, writes nothing to it; canvas_import reads a log or a bundle back into a scratch session.',
    inputSchema: { type: 'object', required: ['format'], properties: { format: { type: 'string', enum: ['log', 'bundle', 'svg', 'mermaid', 'truesize'] }, ids: { type: 'array', items: { type: 'string' } }, out: { type: 'string', description: 'A folder that exists, or a file path ending in the format\'s extension, outside the repository.' } } },
    run: exportTool,
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
          serverInfo: { name: 'dynaink', version: '0.1.0' },
          instructions: 'You are a hand on a dyna.ink canvas, in room "' + ROOM + '" as "' + label(ME) + '". The human draws; the engine reads every mark (shape, role, concept) and the human names and builds from those readings. Look first (canvas_look), see the ink when it matters (canvas_see), then act with the same verbs a hand has: draw in the shape vocabulary, say a sentence beside marks, propose a reading, label your own marks, transcribe writing, write code, put a picture on the board (canvas_import), find words (canvas_find), list every door from the running code (canvas_doors), write the board as the app does (canvas_export) or read a log or a bundle into a scratch session (canvas_import), make a region round marks (canvas_region) and move marks into place (canvas_move — anything on the board, John said you may; the reply says whose marks you moved, say so in your own words too: his undo does not reach your move, so offer to move them back). Everything you do is held and attributed to you; the human blesses or ignores it. Never claim a reading is settled — offer it with a confidence and a reason. You are also the SEAT: when the human asks *Claude Code (MCP hand)* — What is this?, Read the writing, a question — the brief is parked here; canvas_pending gives you it, the marks and the contract (and for a read, the ink as a picture), and canvas_answer returns your answer in that contract, which the page takes exactly as it takes a model\'s.',
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
log('dynaink mcp: room ' + ROOM + ' as ' + label(ME) + ' via ' + RELAY);

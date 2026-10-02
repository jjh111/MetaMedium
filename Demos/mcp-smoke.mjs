// A smoke test for the MCP hand: speaks MCP to Demos/mcp.mjs over stdio, in a
// room of its own on a relay of its own, with a second hand in Node standing
// in for a tab. Not part of `npm test` (it spawns processes and takes a port);
// run it by hand:
//
//   node Demos/mcp-smoke.mjs
//
// Every line it prints is a check; it exits 1 when one fails.

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { startRelay } from './relay.mjs';
import { relayTransport } from './live-node.mjs';
import { inkPNG, encodePNG, decodePNG } from './ink-png.mjs';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

const here = path.dirname(fileURLToPath(import.meta.url));
const MM = await import(pathToFileURL(path.join(here, 'dynaink-core.node.mjs')).href);
const PORT = 8031, RELAY = 'http://127.0.0.1:' + PORT, ROOM = 'mcp-test-' + Math.random().toString(36).slice(2, 6);
let failed = 0;
const check = (name, ok, detail) => { failed += ok ? 0 : 1; console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : ' — ' + JSON.stringify(detail))); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms) => { const end = Date.now() + (ms || 3000); while (Date.now() < end) { if (fn()) return true; await wait(50); } return fn(); };

const relay = await startRelay(PORT);

// A tab: a hand in the room with a session of its own, exactly as the surface does it.
const tabMe = 'tab~1';
const tab = new MM.LiveStore(relayTransport(RELAY, ROOM), tabMe, ROOM);
// A hand in a room says what its log is called, exactly as the surface does
// on joining one (Demos/surface/17-folder.js, openLive): the ids it mints are
// then derived from the events that made them and are the same mark in every
// hand's board, however each one merged.
const tabSession = MM.createSession({ ...MM.DEFAULT_SESSION_CONFIG, logName: tabMe });
const heard = [];
tab.subscribe((participant, events) => heard.push({ participant, events }));
tab.hello();

// An MCP hand: mcp.mjs as a child process, spoken to over stdio.
function spawnHand(env, tag) {
  const child = spawn(process.execPath, [path.join(here, 'mcp.mjs')], { env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
  let said = '';
  child.stderr.on('data', (d) => { said += d; process.stderr.write('  [' + tag + '] ' + d); });
  let out = '';
  const pending = new Map();
  child.stdout.on('data', (d) => {
    out += d;
    let i;
    while ((i = out.indexOf('\n')) >= 0) {
      const line = out.slice(0, i).trim(); out = out.slice(i + 1);
      if (!line) continue;
      try { const m = JSON.parse(line); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } } catch { /* not ours */ }
    }
  });
  let nextId = 1;
  const rpc = (method, params) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, resolve);
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error(method + ' timed out')); } }, 8000);
  });
  const call = async (name, args) => { const m = await rpc('tools/call', { name, arguments: args || {} }); return m.result || m.error; };
  return { child, rpc, call, stderr: () => said };
}

// The MCP hand.
const { child, rpc, call, stderr } = spawnHand({ MM_ROOM: ROOM, MM_RELAY: RELAY, MM_NAME: 'smoke' }, 'mcp');
const textOf = (res) => (res.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');

try {
  const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'smoke', version: '0' } });
  // The server is dyna.ink's (RENAME-PLAN §1, N3d): a session lists it as `dynaink`, and its tools as mcp__dynaink__canvas_*.
  check('initialize names the server dynaink', init.result && init.result.serverInfo && init.result.serverInfo.name === 'dynaink', init.result && init.result.serverInfo);
  const instructions = (init.result && init.result.instructions) || '';
  check('its instructions say it is a hand on a dyna.ink canvas, and never name MetaMedium', /^You are a hand on a dyna\.ink canvas, in room "/.test(instructions) && !/metamedium/i.test(instructions), instructions.slice(0, 120));
  check('its log says which server it is', await until(() => /^dynaink mcp: room /m.test(stderr()), 3000), stderr());
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  const list = await rpc('tools/list', {});
  const names = (list.result && list.result.tools || []).map((t) => t.name);
  const described = (list.result && list.result.tools || []).filter((t) => /metamedium/i.test(t.description || '')).map((t) => t.name);
  check('no tool\'s description names MetaMedium; canvas_look says what is on the dyna.ink canvas', described.length === 0
    && /^What is on the dyna\.ink canvas, in words/.test(((list.result && list.result.tools || []).find((t) => t.name === 'canvas_look') || {}).description || ''), described);
  check('eight tools, each a verb a hand has', ['canvas_look', 'canvas_see', 'canvas_draw', 'canvas_say', 'canvas_propose', 'canvas_label', 'canvas_transcribe', 'canvas_write'].every((n) => names.includes(n)), names);
  // …and the seat's two (V1-PLAN J4): the briefs parked for Claude Code, and the answer to one.
  // …and a ninth verb of a hand's (PLAN-IPAD-NOTES A1): putting a picture on the board.
  // …and three more for organising notes (PLAN-IPAD-NOTES A2): finding words, making a region, moving what is its own.
  check('fourteen tools: the hand\'s twelve — canvas_import, canvas_find, canvas_region and canvas_move among them — and the seat\'s two, canvas_pending and canvas_answer', names.length === 14 && ['canvas_import', 'canvas_find', 'canvas_region', 'canvas_move', 'canvas_pending', 'canvas_answer'].every((n) => names.includes(n)), names);

  // The tab draws first: a box, in its own log.
  const box = MM.strokeFor({ shape: 'rectangle', x: 100, y: 100, w: 200, h: 120 });
  const boxAt = Date.now();
  const boxId = tabSession.addStroke(box, boxAt, undefined, 1);
  await tab.appendLog(tabMe, tabSession.getEvents().slice());

  // The line takes a moment to cross the relay; a look right after it is a race the test, not the hand, should wait out.
  let t1 = '';
  for (let i = 0; i < 20 && !/1 mark/.test(t1); i++) { t1 = textOf(await call('canvas_look', {})); if (!/1 mark/.test(t1)) await wait(100); }
  check('canvas_look sees the tab\'s box, by the tab', /1 mark/.test(t1) && /rectangle/.test(t1) && /by tab/.test(t1), t1);

  // The MCP hand draws a circle beside it; the tab hears the line.
  const before = heard.length;
  const drew = await call('canvas_draw', { shapes: [{ shape: 'circle', x: 340, y: 100, w: 120, h: 120, why: 'a bubble beside the box' }] });
  const t2 = textOf(drew);
  check('canvas_draw reads back as a circle', /circle/.test(t2), t2);
  // A hand in a room is one PROCESS: the name is the caller's, the suffix says
  // which hand. Two mcp.mjs under one name are taken for one log, and the last
  // to answer a hello replaces the other — so the suffix is per process and the
  // test must not know it.
  const fromSmoke = (h) => /^smoke~/.test(h.participant);
  const got = await until(() => heard.slice(before).some((h) => fromSmoke(h) && h.events.some((e) => e.type === 'stroke')), 4000);
  check('the tab hears the circle as a line from the hand "smoke"', got, heard.slice(before).map((h) => h.participant + ':' + h.events.map((e) => e.type).join('+')));
  const handId = 'participant:hand:' + heard.filter(fromSmoke).map((h) => h.participant)[0].replace(/[^A-Za-z0-9]/g, '_');
  const logs = await tab.readLogs();
  tabSession.load(MM.mergeLogs(logs, { me: tabMe }));
  const st = tabSession.getState();
  const theirs = st.contentIds.map((id) => st.nodes.get(id)).find((n) => n.edges.some((e) => e.rel === 'made-by' && e.to === handId));
  check('merged in the tab, the circle is the hand "smoke"\'s, read as a circle', !!theirs && MM.topInterpretation(theirs) === 'circle', theirs && MM.topInterpretation(theirs));
  const why = st.explanations.map((id) => st.nodes.get(id)).find((n) => n.edges.some((e) => e.rel === 'made-by' && e.to === handId));
  check('its "why" stands beside the circle, in the hand\'s name — not the tab\'s local', !!why, st.explanations);

  // Seeing: the ink as a PNG.
  const seen = await call('canvas_see', { size: 320 });
  const img = (seen.content || []).find((c) => c.type === 'image');
  const png = img && Buffer.from(img.data, 'base64');
  check('canvas_see returns a PNG of two strokes', !!png && png.length > 100 && png[0] === 0x89 && png.toString('ascii', 1, 4) === 'PNG' && /2 strokes/.test(textOf(seen)), textOf(seen));

  // Saying, proposing, transcribing, writing — each lands in the tab.
  const ids = st.contentIds.slice();
  const said = await call('canvas_say', { text: 'a box and a bubble', about: ids });
  check('canvas_say places an answer', /placed beside/.test(textOf(said)), textOf(said));
  const prop = await call('canvas_propose', { ids: [boxId], label: 'card', confidence: 0.8, reasoning: 'a box this shape' });
  check('canvas_propose holds a reading', /“card” 0\.80 held/.test(textOf(prop)), textOf(prop));
  const tr = await call('canvas_transcribe', { id: boxId, text: 'hello', confidence: 0.9, alternatives: ['hallo'] });
  check('canvas_transcribe holds a transcript', /read as “hello”/.test(textOf(tr)), textOf(tr));
  // A hand labels its OWN ink, and only its own (V1-PLAN L2b; the notes §B, §D):
  // a word on the mark, not a bless and not a file.
  const mineId = (t2.split('\n')[0] || '').split(' ')[0];
  const lab = await call('canvas_label', { id: mineId, text: 'bubble' });
  check('canvas_label puts a word on the mark the hand drew', /“bubble” on /.test(textOf(lab)) && textOf(lab).includes(mineId), textOf(lab));
  const refused = await call('canvas_label', { id: boxId, text: 'not mine' });
  check('canvas_label is refused on the tab\'s box, with the reason in words', /was made by/.test(textOf(refused)) && /your own ink/.test(textOf(refused)) && !/“not mine” on/.test(textOf(refused)), textOf(refused));
  const looked = textOf(await call('canvas_look', {}));
  check('canvas_look says the word the hand put on its own mark', new RegExp(mineId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^\n]*labelled “bubble”').test(looked), looked);
  const wrote = await call('canvas_write', { kind: 'run', code: 'mm.ctx.fillRect(0,0,10,10);', name: 'dot', bounds: { x: 600, y: 100, w: 200, h: 120 } });
  check('canvas_write places a program that waits for play', /placed at 600,100/.test(textOf(wrote)) && /waits for the hand/.test(textOf(wrote)), textOf(wrote));
  await until(() => heard.some((h) => fromSmoke(h) && h.events.some((e) => e.type === 'import')), 4000);
  tabSession.load(MM.mergeLogs(await tab.readLogs(), { me: tabMe }));
  const st2 = tabSession.getState();
  const boxNode = st2.nodes.get(boxId);
  const reading = MM.interpretationsOf(boxNode, st2.nodes).find((x) => x.label === 'card');
  check('in the tab: the reading is held on the box, attributed to smoke', !!reading && reading.sourceName !== 'you' && /smoke/.test(reading.sourceName || ''), reading && { label: reading.label, source: reading.sourceName, weight: reading.weight });
  check('in the tab: the transcript is held on the box', MM.transcriptOf(boxNode) === 'hello', MM.transcriptsOf(boxNode));
  // The label travelled as a line of the hand's log and landed on the hand's
  // own circle, in the hand's name — and on nothing of the tab's. It is a rep
  // on the mark, not an artifact: the only artifact is the program below.
  const mineLabel = MM.labelOf(st2.nodes.get(mineId));
  check('in the tab: the hand\'s word stands on its own circle, attributed to the hand, and never on the box',
    !!mineLabel && mineLabel.text === 'bubble' && mineLabel.source === handId && MM.labelOf(boxNode) === undefined,
    { mine: mineLabel, box: MM.labelOf(boxNode) });
  check('in the tab: a label is no artifact and no file — the program is the one artifact', st2.artifacts.length === 1, st2.artifacts);
  const prog = st2.artifacts.map((id) => st2.nodes.get(id)).find((n) => n.reps.some((r) => r.modality === 'code' && r.data.kind === 'run'));
  check('in the tab: the program stands, live, and its clock is not playing', !!prog && st2.live.includes(prog.id) && !(st2.clocks[prog.id] && st2.clocks[prog.id].playing), prog && { id: prog.id, clock: st2.clocks[prog.id] });
  const answers = st2.explanations.length;
  check('in the tab: two answers stand (the why, and the sentence)', answers === 2, answers);

  // Writing a figure is not arithmetic (the notes, §F): a placement relative
  // to a mark — inside it, or under it — instead of bounds worked out by hand.
  const inside = await call('canvas_write', { kind: 'text', code: 'inlet', name: 'inlet', place: { in: boxId } });
  const under = await call('canvas_write', { kind: 'text', code: 'the box', name: 'under', place: { under: boxId, h: 30 } });
  await until(() => heard.filter((h) => fromSmoke(h)).reduce((n, h) => n + h.events.filter((e) => e.type === 'import').length, 0) >= 3, 4000);
  tabSession.load(MM.mergeLogs(await tab.readLogs(), { me: tabMe }));
  const st3 = tabSession.getState();
  const byPath = (p) => st3.artifacts.map((id) => st3.nodes.get(id)).find((n) => n.reps.some((r) => r.modality === 'code' && r.data.path && r.data.path.endsWith(p)));
  const boxB = MM.boundsOf(st3.nodes.get(boxId));
  const inB = byPath('/inlet.txt') && MM.boundsOf(byPath('/inlet.txt'));
  const underB = byPath('/under.txt') && MM.boundsOf(byPath('/under.txt'));
  check('canvas_write with place.in lands the figure inside that mark — in the tab, from the hand\'s log',
    !!inB && !!boxB && inB.minX >= boxB.minX && inB.maxX <= boxB.maxX && inB.minY >= boxB.minY && inB.maxY <= boxB.maxY && inB.maxX - inB.minX > 0 && /inside stroke:/.test(textOf(inside)),
    { said: textOf(inside), inB, boxB });
  check('canvas_write with place.under lands it below that mark, as wide as the mark',
    !!underB && !!boxB && underB.minY >= boxB.maxY && Math.abs(underB.minX - boxB.minX) < 1 && Math.abs(underB.maxX - boxB.maxX) < 1 && Math.abs(underB.maxY - underB.minY - 30) < 1,
    { said: textOf(under), underB, boxB });
  const nowhere = await call('canvas_write', { kind: 'text', code: 'x', place: { in: 'stroke:nobody:9' } });
  check('a placement relative to a mark that is not there is said, not guessed', /no mark stroke:nobody:9/.test(textOf(nowhere)), textOf(nowhere));

  // A wrong kind, a missing id: said plainly, not thrown.
  const bad = await call('canvas_write', { kind: 'exe', code: 'x' });
  check('a kind the canvas does not know is refused in words', /not a kind/.test(textOf(bad)), textOf(bad));
  const gone = await call('canvas_say', { text: 'x', about: ['stroke:999'] });
  check('a sentence about nothing is not placed', /not placed/.test(textOf(gone)), textOf(gone));

  // ===== An artifact is made by whoever blessed it (V1-PLAN L2f) =============
  // The tab takes two marks of its own up as one thing and puts a word on it.
  // A bless used to write no maker, so on the hand's board the tab's artifact
  // read as the HAND's: the tab's word on it was dropped, no "by tab" was
  // said, and the hand could label it. Now it is the tab's on every board.
  const pa = tabSession.addStroke(MM.strokeFor({ shape: 'rectangle', x: 100, y: 700, w: 120, h: 80 }), Date.now(), undefined, 1);
  const pb = tabSession.addStroke(MM.strokeFor({ shape: 'rectangle', x: 260, y: 700, w: 120, h: 80 }), Date.now() + 1, undefined, 1);
  const panelSummon = tabSession.summonMarks([pa, pb], Date.now() + 2);
  const panelId = panelSummon && tabSession.bless({ summonId: panelSummon, name: 'panel', at: Date.now() + 3 });
  const panelLabelled = panelId && tabSession.label({ nodeId: panelId, text: 'mine', at: Date.now() + 4 });
  await tab.publish(tabSession.getEvents().filter((e) => !e.by));
  const panelLine = (text) => text.split('\n').find((l) => l.startsWith(panelId + ' ')) || '';
  let t6 = '';
  for (let i = 0; i < 25 && !panelLine(t6); i++) { t6 = textOf(await call('canvas_look', {})); if (!panelLine(t6)) await wait(100); }
  check('the tab blesses two marks of its own and labels the thing: on the hand\'s board it is the tab\'s, with the tab\'s word on it',
    !!panelId && panelLabelled === panelId && /“panel”/.test(panelLine(t6)) && /by tab/.test(panelLine(t6)) && /labelled “mine”/.test(panelLine(t6)),
    { panelId, labelled: panelLabelled, line: panelLine(t6) });
  const notHis = await call('canvas_label', { id: panelId, text: 'not mine' });
  check('canvas_label is refused on the tab\'s artifact, with the reason in words', /was made by tab/.test(textOf(notHis)) && /your own ink/.test(textOf(notHis)) && !/“not mine” on/.test(textOf(notHis)), textOf(notHis));

  // ===== A word is made by whoever wrote its letters (V1-PLAN L2g) ===========
  // The tab prints N, A, V — four strokes that gather into a word — and puts a
  // word on it. The gathering wrote every word made-by the READER, so on the
  // hand's board the tab's word read as the hand's: the tab's label on it was
  // dropped, no "by tab" was said, and the hand could label it.
  const seg = (a, b) => Array.from({ length: 14 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / 13, y: a.y + ((b.y - a.y) * i) / 13 }));
  const printNAV = (x, y, h) => [
    seg({ x, y: y + h }, { x, y }).concat(seg({ x, y }, { x: x + 18, y: y + h }).slice(1), seg({ x: x + 18, y: y + h }, { x: x + 18, y }).slice(1)),
    seg({ x: x + 26, y: y + h }, { x: x + 36, y }).concat(seg({ x: x + 36, y }, { x: x + 46, y: y + h }).slice(1)),
    seg({ x: x + 30, y: y + h * 0.6 }, { x: x + 42, y: y + h * 0.6 }),
    seg({ x: x + 54, y }, { x: x + 64, y: y + h }).concat(seg({ x: x + 64, y: y + h }, { x: x + 74, y }).slice(1)),
  ];
  const navAt = Date.now() + 10;
  const navLetters = printNAV(100, 900, 30).map((pts, i) => tabSession.addStroke(pts, navAt + 400 * i, undefined, 1));
  const navState = tabSession.getState();
  const navId = navState.contentIds.find((id) => MM.isWord(navState.nodes.get(id)) && MM.lettersOf(navState.nodes.get(id)).includes(navLetters[0]));
  const navLabelled = navId && tabSession.label({ nodeId: navId, text: 'nav', at: navAt + 2000 });
  await tab.publish(tabSession.getEvents().filter((e) => !e.by));
  const navLine = (text) => (navId && text.split('\n').find((l) => l.startsWith(navId + ' '))) || '';
  let t7 = '';
  for (let i = 0; i < 25 && !navLine(t7); i++) { t7 = textOf(await call('canvas_look', {})); if (!navLine(t7)) await wait(100); }
  check('the tab prints a word and labels it: on the hand\'s board the word is the tab\'s, with the tab\'s label on it',
    !!navId && navLabelled === navId && /a word of 4 strokes/.test(navLine(t7)) && /by tab/.test(navLine(t7)) && /labelled “nav”/.test(navLine(t7)),
    { navId, labelled: navLabelled, line: navLine(t7) });
  const notHisWord = await call('canvas_label', { id: navId, text: 'not mine' });
  check('canvas_label is refused on the tab\'s word, with the reason in words', /was made by tab/.test(textOf(notHisWord)) && /your own ink/.test(textOf(notHisWord)) && !/“not mine” on/.test(textOf(notHisWord)), textOf(notHisWord));

  // A picture on the tab's board (PLAN-IPAD-NOTES I1): an event naming an asset and no bytes. The hand's look lists it as a
  // picture with its name and size, and says it has no pixels — they are kept by the tab that imported it.
  const picAt = Date.now() + 20;
  const picId = tabSession.import({ kind: 'jpg', path: 'imports/holiday.jpg', name: 'holiday.jpg', bounds: { minX: 900, minY: 100, maxX: 1300, maxY: 400 }, asset: 'sha256:' + 'ab'.repeat(32), mime: 'image/jpeg', w: 2560, h: 1920, at: picAt });
  await tab.publish(tabSession.getEvents().filter((e) => !e.by));
  const picLine = (text) => (picId && text.split('\n').find((l) => l.startsWith(picId + ' '))) || '';
  let t8 = '';
  for (let i = 0; i < 25 && !picLine(t8); i++) { t8 = textOf(await call('canvas_look', {})); if (!picLine(t8)) await wait(100); }
  check('canvas_look lists the tab\'s picture as "a picture holiday.jpg 2560×1920", says this hand has no pixels of it, and prints nothing of the bytes\' place',
    !!picId && /a picture holiday\.jpg 2560×1920/.test(picLine(t8)) && /this hand has none to see/.test(picLine(t8)) && !/sha256|imports\//.test(picLine(t8)) && /by tab/.test(picLine(t8)), { picId, line: picLine(t8) });

  // A region on the tab's board (PLAN-IPAD-NOTES I5): the hand's look lists it by its name with what it holds, derived from
  // where things stand — here the picture above — and reads it only: the hand makes none yet.
  const regId = tabSession.region({ name: 'Monday', bounds: { minX: 880, minY: 80, maxX: 1320, maxY: 420 }, at: Date.now() + 30 });
  await tab.publish(tabSession.getEvents().filter((e) => !e.by));
  const regLine = (text) => (regId && text.split('\n').find((l) => l.startsWith(regId + ' '))) || '';
  let t9 = '';
  for (let i = 0; i < 25 && !regLine(t9); i++) { t9 = textOf(await call('canvas_look', {})); if (!regLine(t9)) await wait(100); }
  check('canvas_look lists the tab\'s region by name with what it holds — a region “Monday” — holds 1 picture, at where it stands, holding the picture\'s id — and counts it in the header',
    !!regId && /a region “Monday” — holds 1 picture/.test(regLine(t9)) && /at 880,80 440×340/.test(regLine(t9)) && regLine(t9).includes(picId) && /· 1 region\b/.test(t9), { regId, line: regLine(t9) });

  // ===== Organising notes (PLAN-IPAD-NOTES A2) ==============================
  // Find, regions and moves, from the hand's side. John's ruling (2 Oct 2026, A2b): a hand may move anything on the board,
  // a region it made included — one that carries his marks too — and says whose marks moved; a label and a rename keep
  // their rule (its own ink, its own region). A block of its own: the names below are this section's.
  {
  const refresh = async () => { tabSession.load(MM.mergeLogs(await tab.readLogs(), { me: tabMe })); return tabSession.getState(); };
  const refreshUntil = async (pred) => { for (let i = 0; i < 30; i++) { await refresh(); if (pred()) return true; await wait(100); } return pred(); };
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const lineOf = (text, id) => text.split('\n').find((l) => l.startsWith(id + ' ')) || '';
  const nMoves = () => tabSession.getEvents().filter((e) => e.type === 'move').length;

  // ---- canvas_find: the words the room says, with the id and the place to go to ----
  const f1 = textOf(await call('canvas_find', { query: 'bubble' }));
  check('canvas_find names a word the hand put on its own mark: the label, what it stands on, the mark\'s id and where it stands',
    f1.includes(mineId) && /“bubble” — label on a circle/.test(f1) && /\bat \d+,\d+ \d+×\d+/.test(f1), f1);
  const f2 = textOf(await call('canvas_find', { query: 'monday' }));
  const f2b = textOf(await call('canvas_find', { query: 'holiday' }));
  check('canvas_find finds a region by its name (the tab\'s), and a picture by its file\'s name', f2.includes(regId) && /a region/.test(f2) && /at 880,80 440×340/.test(f2) && f2b.includes(picId), { f2, f2b });
  const f3 = textOf(await call('canvas_find', { query: 'hello' }));
  check('canvas_find finds what a hand read from writing, on the mark it was held on', f3.includes(boxId) && /read writing/.test(f3), f3);
  const f4 = textOf(await call('canvas_find', { query: 'zzyzx' }));
  check('canvas_find says when nothing says the words, and does not make a hit up', /nothing says “zzyzx”/.test(f4) && !/ at \d+,/.test(f4), f4);
  const f4b = textOf(await call('canvas_find', { query: '  ' }));
  check('canvas_find with no words is said, not an empty list', /needs words/.test(f4b), f4b);
  const f5 = textOf(await call('canvas_find', { query: 'mon' }));
  check('canvas_find takes the word being typed, as Find does: a prefix finds the region', f5.includes(regId), f5);

  // ---- canvas_look for notes: writing in reading order with what it says ----
  let lw = '';
  for (let i = 0; i < 25 && !/^writing · /m.test(lw); i++) { lw = textOf(await call('canvas_look', {})); if (!/^writing · /m.test(lw)) await wait(100); }
  // The letters the tab printed at y 900 stand in the hand's board as the hand's merge gathered them; the line is found by where it stands, never by an id that merge may have remade.
  const wLine = lw.split('\n').find((l) => /^writing · /.test(l) && / · at \d+,9\d\d /.test(l)) || '';
  const wId = (wLine.match(/^writing · (\S+)/) || [])[1] || '';
  check('canvas_look lists a line of writing — its marks\' ids, unread, with what to do about it — and where it stands', !!wLine && /unread/.test(wLine) && /canvas_transcribe/.test(wLine) && / · at \d+,9\d\d \d+×\d+/.test(wLine) && !!wId, { wLine, words: lw.split("\n").filter((l) => /word:/.test(l)) });
  await call('canvas_transcribe', { id: wId, text: 'navigate', confidence: 0.8 });
  let lw2 = '';
  for (let i = 0; i < 25 && !/reads “navigate”/.test(lw2); i++) { lw2 = textOf(await call('canvas_look', {})); if (!/reads “navigate”/.test(lw2)) await wait(100); }
  check('…and once a hand has read it, the line says what it reads', /^writing · .*reads “navigate”/m.test(lw2), lw2.split('\n').filter((l) => /^writing/.test(l)));

  // ---- canvas_region: a region round anyone's marks moves nothing ----
  await refresh();
  const movesBefore = nMoves();
  const boxBox = MM.boundsOf(tabSession.getState().nodes.get(boxId));
  const made = textOf(await call('canvas_region', { name: 'Shapes', around: [boxId, mineId] }));
  const shapesId = (made.match(/^(\S+) · a region “Shapes”/) || [])[1] || null;
  check('canvas_region makes a region round the tab\'s box and the hand\'s own circle, and says what it holds', !!shapesId && /a region “Shapes” — holds 2 marks/.test(made), made);
  await refreshUntil(() => !!shapesId && tabSession.getState().regions.includes(shapesId));
  const ts = tabSession.getState();
  const shapesNode = shapesId && ts.nodes.get(shapesId);
  const holdsTab = shapesId && MM.describeRegion(ts, shapesId);
  check('in the tab: the region is there, the hand\'s, named Shapes, and holds both marks by where they stand', !!shapesNode && MM.regionRepOf(shapesNode).name === 'Shapes' && !!holdsTab && holdsTab.things.includes(boxId) && holdsTab.things.includes(mineId)
    && shapesNode.edges.some((e) => e.rel === 'made-by' && e.to === handId), { shapesId, holds: holdsTab && holdsTab.things });
  check('making it moved nothing: the tab\'s box is where it was drawn and no move was written', JSON.stringify(MM.boundsOf(ts.nodes.get(boxId))) === JSON.stringify(boxBox) && nMoves() === movesBefore, { was: boxBox, now: MM.boundsOf(ts.nodes.get(boxId)) });
  const lr = textOf(await call('canvas_look', {}));
  check('canvas_look says which region each mark stands in, and the region\'s own line is kept', new RegExp(esc(boxId) + '[^\\n]* · in “Shapes”').test(lr) && new RegExp(esc(picId) + '[^\\n]* · in “Monday”').test(lr) && /a region “Shapes” — holds 2 marks/.test(lineOf(lr, shapesId)), lr.split('\n').filter((l) => /in “/.test(l) || /a region/.test(l)));
  const far = textOf(await call('canvas_region', { name: 'Far off', bounds: { x: 3000, y: 3000, w: 300, h: 200 } }));
  const farId = (far.match(/^(\S+) · a region “Far off”/) || [])[1] || null;
  check('canvas_region by bounds makes an empty place, said to hold nothing yet', !!farId && /holds nothing yet/.test(far) && /at 3000,3000 300×200/.test(far), far);
  const noWhere = textOf(await call('canvas_region', { name: 'Nowhere' }));
  check('canvas_region says it needs marks to go round or a box', /around|bounds/.test(noWhere) && !/ · a region/.test(noWhere), noWhere);
  const noName = textOf(await call('canvas_region', { around: [boxId] }));
  check('canvas_region says it needs a name', /needs a name/.test(noName), noName);
  const gone = textOf(await call('canvas_region', { name: 'Ghosts', around: ['stroke:nobody:1'] }));
  check('canvas_region says when none of the marks is on the board, and makes none', /none of/.test(gone) && !/ · a region/.test(gone), gone);
  const ren = textOf(await call('canvas_region', { id: shapesId, name: 'Shapes and more' }));
  await refreshUntil(() => MM.regionRepOf(tabSession.getState().nodes.get(shapesId)).name === 'Shapes and more');
  check('canvas_region renames a region the hand made — the tab sees the new name', /renamed/.test(ren) && MM.regionRepOf(tabSession.getState().nodes.get(shapesId)).name === 'Shapes and more', ren);
  const renHis = textOf(await call('canvas_region', { id: regId, name: 'Tuesday' }));
  await wait(250);
  await refresh();
  check('canvas_region refuses to rename the tab\'s region, saying whose it is — and the name stands', /was made by tab/.test(renHis) && /renames only/.test(renHis) && MM.regionRepOf(tabSession.getState().nodes.get(regId)).name === 'Monday', renHis);

  // ---- canvas_move: anything on the board (John, 2 Oct 2026: "ya claude can move marks"), and honest about whose ----
  const circleBox = () => MM.boundsOf(tabSession.getState().nodes.get(mineId));
  const boxNow = () => MM.boundsOf(tabSession.getState().nodes.get(boxId));
  const c0 = circleBox();
  const mv1 = textOf(await call('canvas_move', { ids: [mineId], dx: 60, dy: 25 }));
  const movedOne = await refreshUntil(() => Math.abs(circleBox().minX - (c0.minX + 60)) < 1);
  check('canvas_move moves the hand\'s own mark by dx, dy — the tab sees it there — and says it moved 1 mark, none of anyone else\'s', /^moved 1 mark\b/m.test(mv1) && !/ of tab/.test(mv1) && mv1.includes(mineId) && movedOne && Math.abs(circleBox().minY - (c0.minY + 25)) < 1, { mv1, c0, now: circleBox() });
  const b0 = boxNow();
  const m00 = nMoves();
  const mv2 = textOf(await call('canvas_move', { ids: [boxId], dx: 7, dy: 3 }));
  await refreshUntil(() => Math.abs(boxNow().minX - (b0.minX + 7)) < 1);
  const ev2 = tabSession.getEvents().filter((e) => e.type === 'move').pop();
  check('canvas_move moves the TAB\'s box — it is not refused for whose it is — and says whose it moved: "1 mark — 1 of tab’s"; the tab holds the hand\'s move event',
    /^moved 1 mark — 1 of tab’s/m.test(mv2) && mv2.includes(boxId) && Math.abs(boxNow().minX - (b0.minX + 7)) < 1 && Math.abs(boxNow().minY - (b0.minY + 3)) < 1 && nMoves() === m00 + 1 && /^smoke~/.test(ev2.by || '') && ev2.ids.join() === boxId, { mv2, now: boxNow(), b0, ev2 });
  const m0 = nMoves();
  const c1 = circleBox();
  const mv3 = textOf(await call('canvas_move', { ids: [boxId, mineId], dx: -7, dy: -3 }));
  await refreshUntil(() => nMoves() === m0 + 1);
  const lastMove = tabSession.getEvents().filter((e) => e.type === 'move').pop();
  check('a list of the tab\'s mark and its own moves in ONE event, said as "2 marks — 1 of tab’s", and the tab\'s box is back where it was drawn', /^moved 2 marks — 1 of tab’s/m.test(mv3) && nMoves() === m0 + 1 && lastMove.ids.length === 2 && lastMove.ids.includes(boxId) && lastMove.ids.includes(mineId)
    && Math.abs(circleBox().minX - (c1.minX - 7)) < 1 && Math.abs(boxNow().minX - b0.minX) < 1 && Math.abs(boxNow().minY - b0.minY) < 1, { mv3, ids: lastMove && lastMove.ids });
  const mvRegion = textOf(await call('canvas_move', { ids: [shapesId], dx: 10, dy: 10 }));
  await refreshUntil(() => Math.abs(boxNow().minX - (b0.minX + 10)) < 1);
  check('canvas_move moves a region of the hand\'s that holds the tab\'s box — it carries it — and says so: marks, "of tab’s", "with what the region holds"',
    /^moved \d+ marks — 1 of tab’s/m.test(mvRegion) && /with what the region holds/.test(mvRegion) && Math.abs(boxNow().minX - (b0.minX + 10)) < 1, mvRegion);
  await call('canvas_move', { ids: [shapesId], dx: -10, dy: -10 });
  await refreshUntil(() => Math.abs(boxNow().minX - b0.minX) < 1);
  const p0 = MM.boundsOf(tabSession.getState().nodes.get(picId));
  const mvPic = textOf(await call('canvas_move', { ids: [picId], dx: 5, dy: 5 }));
  await refreshUntil(() => Math.abs(MM.boundsOf(tabSession.getState().nodes.get(picId)).minX - (p0.minX + 5)) < 1);
  check('…and the tab\'s picture the same — moved, and said to be the tab\'s', /^moved 1 mark — 1 of tab’s/m.test(mvPic) && Math.abs(MM.boundsOf(tabSession.getState().nodes.get(picId)).minY - (p0.minY + 5)) < 1, mvPic);
  await call('canvas_move', { ids: [picId], dx: -5, dy: -5 });
  await refreshUntil(() => Math.abs(MM.boundsOf(tabSession.getState().nodes.get(picId)).minX - p0.minX) < 1);
  const mvKept = textOf(await call('canvas_label', { id: boxId, text: 'still not mine' }));
  check('labels keep their rule: a hand labels only its own ink, whatever it may now move', /was made by tab/.test(mvKept) && /your own ink/.test(mvKept) && !/“still not mine” on/.test(mvKept), mvKept);
  const mvKeptName = textOf(await call('canvas_region', { id: regId, name: 'Wednesday' }));
  check('and a region is renamed only by the hand that made it', /was made by tab/.test(mvKeptName) && /renames only/.test(mvKeptName), mvKeptName);

  // A place of its own: a region round only the hand's circle, moved, takes the circle with it in one event.
  const mine = textOf(await call('canvas_region', { name: 'Mine', around: [mineId] }));
  const mineRegion = (mine.match(/^(\S+) · a region “Mine”/) || [])[1] || null;
  await refreshUntil(() => !!mineRegion && tabSession.getState().regions.includes(mineRegion));
  const c2 = circleBox();
  const m1 = nMoves();
  const mv4 = textOf(await call('canvas_move', { ids: [mineRegion], dx: 0, dy: 300 }));
  await refreshUntil(() => nMoves() === m1 + 1);
  check('a region of the hand\'s round only its own mark moves, and takes the mark — one move event naming the region',
    /^moved/m.test(mv4) && nMoves() === m1 + 1 && tabSession.getEvents().filter((e) => e.type === 'move').pop().ids.join() === mineRegion && Math.abs(circleBox().minY - (c2.minY + 300)) < 1, { mv4, mineRegion });

  // Where: to a place, and into a region.
  const mv5 = textOf(await call('canvas_move', { ids: [mineId], to: { x: 700, y: 700 } }));
  await refreshUntil(() => Math.abs(circleBox().minX - 700) < 1);
  check('canvas_move to {x, y} puts the marks\' top left there', /^moved/m.test(mv5) && Math.abs(circleBox().minX - 700) < 1 && Math.abs(circleBox().minY - 700) < 1, { mv5, now: circleBox() });
  const mv6 = textOf(await call('canvas_move', { ids: [mineId], into: farId }));
  await refreshUntil(() => circleBox().minX > 2900);
  const farB = { minX: 3000, minY: 3000, maxX: 3300, maxY: 3200 }, cb = circleBox();
  check('canvas_move into a region puts the marks inside it, centred', /^moved/m.test(mv6) && cb.minX >= farB.minX && cb.maxX <= farB.maxX && cb.minY >= farB.minY && cb.maxY <= farB.maxY && Math.abs((cb.minX + cb.maxX) / 2 - 3150) < 1 && Math.abs((cb.minY + cb.maxY) / 2 - 3100) < 1, { mv6, cb });
  const lf = textOf(await call('canvas_look', {}));
  check('…and the look then says it stands in that region', new RegExp(esc(mineId) + '[^\\n]* · in “Far off”').test(lf), lineOf(lf, mineId));
  const mvNo = textOf(await call('canvas_move', { ids: [mineId] }));
  check('canvas_move says where to when it is not told', /dx, dy|to|into/.test(mvNo) && !/^moved/m.test(mvNo), mvNo);
  const mvStay = textOf(await call('canvas_move', { ids: [mineId], dx: 0, dy: 0 }));
  check('a move that would change nothing writes nothing and says so', /already|nothing/.test(mvStay) && !/^moved/m.test(mvStay), mvStay);
  const mvMissing = textOf(await call('canvas_move', { ids: ['stroke:nobody:9'], dx: 5, dy: 5 }));
  check('canvas_move says a mark that is not on the board is not', /no mark stroke:nobody:9|not on the board/.test(mvMissing), mvMissing);
  }

  // ===== Two hands in one room: an id crosses the boundary (T8) =============
  // The defect: a node id used to be a counter over the MERGED replay, and no
  // two hands in a room merge the same set of logs. A SECOND tab whose mark
  // is older than the first tab's box shifts every number in this hand's
  // board — so a sentence about the box, named by the id the first tab holds,
  // landed on the second tab's triangle, silently and with nothing to say so.
  // Now the id is a function of the event that made it, so it means the same
  // mark in every hand and in every merge.
  const tab2Me = 'tab2~1';
  const tab2 = new MM.LiveStore(relayTransport(RELAY, ROOM), tab2Me, ROOM);
  const tab2Session = MM.createSession({ ...MM.DEFAULT_SESSION_CONFIG, logName: tab2Me });
  tab2.hello();
  const tri = MM.strokeFor({ shape: 'triangle', x: 100, y: 400, w: 180, h: 160 });
  const triId = tab2Session.addStroke(tri, boxAt - 1000, undefined, 1);
  await tab2.appendLog(tab2Me, tab2Session.getEvents().slice());

  let t3 = '';
  for (let i = 0; i < 25 && !t3.includes(triId); i++) { t3 = textOf(await call('canvas_look', {})); if (!t3.includes(triId)) await wait(100); }
  check('canvas_look reports the ids the core derives — each hand\'s mark under the id that hand holds', t3.includes(boxId) && t3.includes(triId), { boxId, triId, look: t3 });

  // The hand says a sentence about a mark IT DID NOT DRAW, named by the id
  // the tab that drew it holds. This is the crossing that used to miss.
  const SENT = 'this one is the first tab\'s box';
  const before2 = heard.length;
  const crossed = await call('canvas_say', { text: SENT, about: [boxId] });
  check('canvas_say takes another hand\'s id as it was given — never re-parsed, never renumbered', textOf(crossed).includes('placed beside ' + boxId), textOf(crossed));
  await until(() => heard.slice(before2).some((h) => fromSmoke(h) && h.events.some((e) => e.type === 'answer')), 4000);
  const allLogs = await tab.readLogs();
  check('the room holds three logs — two tabs and the hand', Object.keys(allLogs).length === 3, Object.keys(allLogs));

  // Read back by a THIRD reader that was never in the room, in both merge
  // orders: the triangle before the box, and the triangle after it. The
  // sentence must land on the box both times.
  const boxBox = MM.getBounds(box);
  const near = (a, b) => a && b && Math.abs(a.minX - b.minX) < 1 && Math.abs(a.minY - b.minY) < 1 && Math.abs(a.maxX - b.maxX) < 1 && Math.abs(a.maxY - b.maxY) < 1;
  function saidAbout(logs) {
    const s = MM.createSession();
    s.load(MM.mergeLogs(logs, {}));
    const st = s.getState();
    for (const id of st.explanations) {
      const n = st.nodes.get(id);
      const d = (n.reps.find((x) => x.modality === 'explanation') || {}).data || {};
      if (d.text !== SENT) continue;
      return n.edges.filter((e) => e.rel === 'about').map((e) => st.nodes.get(e.to)).filter(Boolean).map((m) => MM.boundsOf(m));
    }
    return null;
  }
  const shift = (logs, at) => {
    const out = {};
    for (const [k, v] of Object.entries(logs)) out[k] = k === tab2Me ? v.map((e) => ({ ...e, at: e.at === boxAt - 1000 ? at : e.at })) : v.slice();
    return out;
  };
  for (const [order, at] of [['the triangle first', boxAt - 1000], ['the box first', boxAt + 500]]) {
    const on = saidAbout(shift(allLogs, at));
    check('with ' + order + ', the sentence stands on the box it was said about', !!on && on.length === 1 && near(on[0], boxBox), { on, boxBox });
  }
  tab2.close();

  // ===== Two hands under one name: BOTH are told (DIRECTOR-PLAN-W2 L1, D4) ====
  // A second hand comes up under the MCP hand's own log name. The hand's
  // store checks its own name before discarding any line, so the hand hears
  // it, says so in every look, and answers the newcomer's hello — which is how
  // the second hand hears it too.
  const handLog = heard.filter(fromSmoke).map((h) => h.participant)[0];
  const twin = new MM.LiveStore(relayTransport(RELAY, ROOM), handLog, ROOM);
  twin.hello();
  let t4 = '';
  for (let i = 0; i < 30 && !/two hands are both called/.test(t4); i++) { t4 = textOf(await call('canvas_look', {})); if (!/two hands are both called/.test(t4)) await wait(100); }
  check('a second hand under the hand\'s own name: canvas_look says so, before the marks', /\nroom says: two hands are both called "smoke~[^"]+" — this one/.test(t4), t4.split('\n').slice(0, 3));
  await until(() => twin.collisions().length === 1, 3000);
  check('and the second hand is told as well', twin.collisions().length === 1, twin.collisions());
  twin.close();

  // ===== A room older than the relay remembers (L1) ===========================
  // A relay that keeps ten lines, a hand that has drawn twenty and is still
  // here, and a second MCP hand that joins after: it is told the room is older
  // than the relay remembers, and still holds all twenty — the hand still in
  // the room answers its hello with its whole log.
  const small = await startRelay(0, { maxLines: 10 });
  const SMALL = 'http://127.0.0.1:' + small.address().port;
  const ada = new MM.LiveStore(relayTransport(SMALL, 'old'), 'ada~1', 'old');
  const adaSession = MM.createSession({ ...MM.DEFAULT_SESSION_CONFIG, logName: 'ada~1' });
  for (let i = 0; i < 20; i++) {
    adaSession.addStroke(MM.strokeFor({ shape: 'rectangle', x: (i % 5) * 150, y: Math.floor(i / 5) * 150, w: 100, h: 80 }), Date.now(), undefined, 1);
    await ada.publish(adaSession.getEvents().filter((e) => !e.by));
  }
  const late = spawnHand({ MM_ROOM: 'old', MM_RELAY: SMALL, MM_NAME: 'late' }, 'late');
  try {
    await late.rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'smoke', version: '0' } });
    let t5 = '';
    for (let i = 0; i < 30 && !(/older than the relay remembers/.test(t5) && /20 marks/.test(t5)); i++) { t5 = textOf(await late.call('canvas_look', {})); if (!/20 marks/.test(t5)) await wait(100); }
    check('a hand joining a room the relay has outlived: canvas_look says the room is older than the relay remembers', /\nroom says: the room is older than the relay remembers — \d+ earlier lines are gone/.test(t5), t5.split('\n').slice(0, 3));
    check('and it still holds all twenty of the hand that is still here', /20 marks/.test(t5), t5.split('\n').slice(0, 3));
  } finally {
    late.child.stdin.end();
    await wait(100);
    late.child.kill();
    ada.close();
    small.close();
  }

  // ===== A restarted hand is the same person (V1-PLAN L2i) ====================
  // A hand in a room is one process, so a restart is a new sitting — a new log
  // under the same name, `smoke~<new>`. The label rule compared the sitting, so
  // the restarted hand could not put a word on the circle it drew before; it
  // asks the person now. The tab's box is still not its to label.
  const again = spawnHand({ MM_ROOM: ROOM, MM_RELAY: RELAY, MM_NAME: 'smoke' }, 'again');
  try {
    await again.rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'smoke', version: '0' } });
    let t6 = '';
    for (let i = 0; i < 30 && !t6.includes(mineId); i++) { t6 = textOf(await again.call('canvas_look', {})); if (!t6.includes(mineId)) await wait(100); }
    const circleLine = t6.split('\n').find((l) => l.includes(mineId + ' ')) || '';
    check('a restarted hand sees the circle it drew before the restart — the earlier sitting\'s, by smoke', /by smoke/.test(circleLine) && /labelled “bubble”/.test(circleLine), circleLine || t6.split('\n').slice(0, 4));
    const heardBefore = heard.length;
    const relabel = await again.call('canvas_label', { id: mineId, text: 'sun' });
    check('and may put a word on it: a restart is the same person', /“sun” on /.test(textOf(relabel)) && textOf(relabel).includes(mineId), textOf(relabel));
    const stillNot = await again.call('canvas_label', { id: boxId, text: 'not mine' });
    check('the tab\'s box is still not its to label, with the reason in words', /was made by tab/.test(textOf(stillNot)) && /your own ink/.test(textOf(stillNot)) && !/“not mine” on/.test(textOf(stillNot)), textOf(stillNot));
    const firstLog = heard.filter(fromSmoke).map((h) => h.participant)[0];
    await until(() => heard.slice(heardBefore).some((h) => fromSmoke(h) && h.participant !== firstLog && h.events.some((e) => e.type === 'label')), 4000);
    tabSession.load(MM.mergeLogs(await tab.readLogs(), { me: tabMe }));
    const st6 = tabSession.getState();
    const sun = MM.labelOf(st6.nodes.get(mineId));
    check('in the tab: the word stands on the circle, in the restarted hand\'s name — the circle still the first sitting\'s',
      !!sun && sun.text === 'sun' && /^participant:hand:smoke_/.test(sun.source || '') && sun.source !== handId
        && MM.authorOf(st6.nodes.get(mineId)) === handId && MM.labelOf(st6.nodes.get(boxId)) === undefined,
      { label: sun, maker: MM.authorOf(st6.nodes.get(mineId)), first: handId });
  } finally {
    again.child.stdin.end();
    await wait(100);
    again.child.kill();
  }

  // ===== The seat: Claude Code is the canvas's model (V1-PLAN J4) =============
  // A page seats Claude Code — core's seat participant — and asks it what two
  // boxes are, what a word says, and something it will not answer. Every
  // question is PARKED in the room as a brief (an answer on the explanation
  // plane whose question is `brief`); the hand lists it with canvas_pending and
  // answers with canvas_answer, by the brief node's own id (L2a); and the page
  // takes each answer exactly as it takes a model's — the same prompts, the
  // same parsers, the same propose channel. Beside them the watcher, a silent
  // reader, prints one line per brief parked and nothing else, which is what
  // wakes a Claude Code session.
  await seatCases();
} catch (err) {
  check('the run finished', false, err.message);
}

async function seatCases() {
  if (typeof MM.createSeatParticipant !== 'function' || typeof MM.pendingBriefs !== 'function') {
    check('core offers the seat — createSeatParticipant, seatBriefs, pendingBriefs', false, { createSeatParticipant: typeof MM.createSeatParticipant, pendingBriefs: typeof MM.pendingBriefs });
    return;
  }
  // The watcher, started before anything is asked: it must say nothing until a brief is parked.
  const watchLines = [];
  const watch = spawn(process.execPath, [path.join(here, 'seat-watch.mjs')], { env: { ...process.env, MM_ROOM: ROOM, MM_RELAY: RELAY }, stdio: ['ignore', 'pipe', 'pipe'] });
  let watchBuf = '';
  watch.stdout.on('data', (d) => { watchBuf += d; let i; while ((i = watchBuf.indexOf('\n')) >= 0) { const line = watchBuf.slice(0, i); watchBuf = watchBuf.slice(i + 1); if (line.trim()) watchLines.push(line); } });
  watch.stderr.on('data', (d) => process.stderr.write('  [watch] ' + d));
  watch.on('error', (err) => watchLines.push('(the watcher did not start: ' + err.message + ')'));

  // A page in the room, the way the surface is one (17-folder.js, openLive): its
  // log named for its sitting, the room's lines merged as they land (LiveMerge),
  // and its own log sent whenever it changes.
  const pageMe = 'page~1';
  const store = new MM.LiveStore(relayTransport(RELAY, ROOM), pageMe, ROOM);
  const session = MM.createSession({ ...MM.DEFAULT_SESSION_CONFIG, logName: pageMe });
  const merger = new MM.LiveMerge(session, pageMe);
  let merging = false, mergeQueued = false;
  store.subscribe(() => {
    if (mergeQueued) return;
    mergeQueued = true;
    queueMicrotask(() => { mergeQueued = false; merging = true; try { merger.sync(store.heldLogs()); } finally { merging = false; } });
  });
  session.subscribe(() => { if (!merging) void store.publish(store.ownLog(session.getEvents())); });
  store.hello();
  const seat = MM.createSeatParticipant(session, Date.now(), { baseUrl: RELAY });
  try {
    const settled = (p, ms) => Promise.race([p, wait(ms || 8000).then(() => ({ ok: false, error: 'the page never heard an answer' }))]);
    const keysIn = (text) => [...String(text).matchAll(/^brief (\S+) · /gm)].map((m) => m[1]);
    const pendingText = async (want) => {
      let t = '';
      for (let i = 0; i < 40; i++) { t = textOf(await call('canvas_pending', {})); if (want(t)) break; await wait(100); }
      return t;
    };
    await wait(300);
    check('the watcher says nothing while no brief is parked', watchLines.length === 0, watchLines);

    // ---- What is this? on two boxes ----
    const t0 = Date.now();
    const boxA = session.addStroke(MM.strokeFor({ shape: 'rectangle', x: 100, y: 1300, w: 160, h: 110 }), t0, undefined, 1);
    const boxB = session.addStroke(MM.strokeFor({ shape: 'rectangle', x: 320, y: 1300, w: 160, h: 110 }), t0 + 1, undefined, 1);
    check('the seat joins the page\'s session as a model that sees, on this machine', session.getState().participants.includes(seat.id) && seat.config.vision === true && MM.providerLocality(seat.config) === 'local', seat.config);
    const asking = seat.interpret([boxA, boxB], Date.now());
    const parked = seat.waiting()[0];
    check('What is this? parks a brief in the page\'s own log, about the two boxes — nothing is posted anywhere but the room',
      !!parked && MM.pendingBriefs(session.getState()).some((b) => b.key === parked.key && b.ask === 'what' && b.about.join() === [boxA, boxB].join()),
      { waiting: seat.waiting(), pending: MM.pendingBriefs(session.getState()).map((b) => ({ key: b.key, ask: b.ask, about: b.about })) });
    const p1 = await pendingText((t) => parked && t.includes(parked.key));
    check('canvas_pending lists it: the brief\'s own id as its key, what was asked, the marks it is about with their ids, and the contract to answer in',
      !!parked && keysIn(p1)[0] === parked.key && /what is this/.test(p1) && p1.includes(boxA) && p1.includes(boxB) && /Reply with ONLY a JSON array/.test(p1), p1.slice(0, 900));
    await until(() => watchLines.length >= 1, 4000);
    check('the watcher prints one line for it — the key and what was asked', watchLines.length === 1 && !!parked && watchLines[0].includes(parked.key) && /what is this/.test(watchLines[0]), watchLines);
    const looked = textOf(await call('canvas_look', {}));
    check('canvas_look says a brief waits, and never prints its prompt', /brief[^\n]*what is this/.test(looked) && /canvas_pending/.test(looked) && !/Reply with ONLY a JSON array/.test(looked), looked.split('\n').filter((l) => /brief/.test(l)));
    const bad = await call('canvas_answer', { key: parked ? parked.key : '', reply: 'a pair, I think' });
    check('a reply the page could not read is not sent: canvas_answer says what the page reads, and the brief still waits',
      /JSON array/.test(textOf(bad)) && /nothing was sent/.test(textOf(bad)) && !!parked && keysIn(textOf(await call('canvas_pending', {}))).includes(parked.key), textOf(bad));
    const nobody = await call('canvas_answer', { key: 'explanation:nobody:1', reply: [] });
    check('an answer to a brief that is not waiting is said, not sent', /no brief “explanation:nobody:1” is waiting/.test(textOf(nobody)), textOf(nobody));
    const ans = await call('canvas_answer', { key: parked ? parked.key : '', reply: [{ label: 'pair of cards', confidence: 0.82, reasoning: 'two boxes of one size, side by side on one band' }, { label: 'two windows', confidence: 0.4, reasoning: 'the same boxes, read as a facade' }] });
    check('canvas_answer sends it, by the brief\'s own id', /answered/.test(textOf(ans)), textOf(ans));
    const got = await settled(asking);
    const st = session.getState();
    const reads = MM.interpretationsOf(st.nodes.get(boxA), st.nodes).filter((r) => r.sourceName === MM.SEAT_NAME);
    check('the page takes it exactly as a model\'s: parsed by the same parser, held on the group as readings attributed to the seat, never blessed',
      got.ok && got.readings.length === 2 && got.readings[0].label === 'pair of cards' && reads.some((r) => /pair-of-cards|pair of cards/.test(r.label) && !r.blessed),
      { got, reads: reads.map((r) => ({ label: r.label, weight: r.weight, source: r.sourceName, blessed: r.blessed })) });
    const paired = MM.seatBriefs(st).find((b) => parked && b.key === parked.key);
    check('on the page the brief stands answered, paired with the reply by the brief\'s own id', !!paired && !!paired.reply && paired.reply.refused === null && MM.pendingBriefs(st).length === 0,
      paired && { key: paired.key, reply: paired.reply && { id: paired.reply.id, refused: paired.reply.refused } });

    // ---- Read the writing on a word: the hand gets the ink as a picture ----
    const humps = 7, n = humps * 14;
    const cursive = Array.from({ length: n + 1 }, (_, i) => { const t = i / n, a = t * humps * Math.PI; return { x: 100 + 260 * t, y: 1520 + 20 - 20 * Math.abs(Math.sin(a)) * (0.7 + 0.3 * Math.cos(a * 0.37)) }; });
    const word = session.addStroke(cursive, Date.now(), undefined, 1);
    const image = 'data:image/png;base64,' + inkPNG([cursive], { size: 320 }).png.toString('base64');
    const reading = seat.read({ nodeId: word, image, at: Date.now() });
    const readParked = seat.waiting()[0];
    const p2res = await (async () => { for (let i = 0; i < 40; i++) { const r = await call('canvas_pending', {}); if (readParked && textOf(r).includes(readParked.key)) return r; await wait(100); } return call('canvas_pending', {}); })();
    const p2 = textOf(p2res);
    const pic = (p2res.content || []).find((c) => c.type === 'image');
    const picBuf = pic && Buffer.from(pic.data, 'base64');
    check('Read the writing parks a read: canvas_pending says so and hands over the word\'s ink as a PNG, as canvas_see does',
      !!readParked && readParked.ask === 'read' && /read the writing/.test(p2) && p2.includes(word) && !!picBuf && picBuf[0] === 0x89 && picBuf.toString('ascii', 1, 4) === 'PNG',
      { parked: readParked, text: p2.slice(0, 400), image: !!pic });
    // Answered once the watcher has said so — a session answers after it is woken.
    await until(() => watchLines.length >= 2, 4000);
    await call('canvas_answer', { key: readParked ? readParked.key : '', reply: [{ text: 'hello', confidence: 0.9 }, { text: 'hallo', confidence: 0.3 }] });
    const got2 = await settled(reading);
    const wordNode = session.getState().nodes.get(word);
    check('the transcript lands on the word, attributed to the seat', got2.ok && MM.transcriptOf(wordNode) === 'hello', { got: got2, transcripts: MM.transcriptsOf(wordNode) });

    // ---- A question, answered in prose, lands as the seat's own card ----
    const asked = seat.ask('why are these one thing?', [boxA, boxB], Date.now());
    const kq = seat.waiting()[0];
    const pq = await pendingText((t) => kq && t.includes(kq.key));
    await until(() => watchLines.length >= 3, 4000);
    const notProse = await call('canvas_answer', { key: kq ? kq.key : '', reply: { answer: 'they touch' } });
    await call('canvas_answer', { key: kq ? kq.key : '', reply: 'They are one size and sit on one band, a gap apart.' });
    const gotQ = await settled(asked);
    const card = gotQ.ok && session.getState().nodes.get(gotQ.explanationId);
    const cardData = card && MM.explanationOf(card);
    check('ask: is parked as a question and answered in prose — an object refused first — and lands as the seat\'s own card beside the boxes',
      !!kq && /ask: why are these one thing\?/.test(pq) && /in prose/.test(textOf(notProse)) && gotQ.ok && !!cardData && cardData.text === 'They are one size and sit on one band, a gap apart.'
        && card.edges.some((e) => e.rel === 'made-by' && e.to === seat.id) && !MM.isSeatTraffic(card, session.getState().nodes),
      { pending: pq.slice(0, 200), notProse: textOf(notProse), got: gotQ });

    // ---- A refusal is said ----
    const third = seat.interpret([boxA, boxB], Date.now());
    const k3 = seat.waiting()[0];
    await pendingText((t) => k3 && t.includes(k3.key));
    await until(() => watchLines.length >= 4, 4000);
    const edgesBefore = session.getState().nodes.get(boxA).edges.length;
    const ref = await call('canvas_answer', { key: k3 ? k3.key : '', refuse: 'two boxes are not enough to say what they are' });
    const got3 = await settled(third);
    check('a refusal is said in the page\'s words — who would not, and why — and nothing lands',
      /refused/.test(textOf(ref)) && !got3.ok && /smoke would not: two boxes are not enough to say what they are/.test(got3.error || '') && session.getState().nodes.get(boxA).edges.length === edgesBefore,
      { hand: textOf(ref), page: got3 });

    // ---- A brief nobody answers can be withdrawn ----
    const fourth = seat.interpret([boxA], Date.now());
    const k4 = seat.waiting()[0];
    await pendingText((t) => k4 && t.includes(k4.key));
    // Heard by the watcher before it is withdrawn, so its line is not a race.
    await until(() => watchLines.length >= 5, 4000);
    const cancelled = !!k4 && seat.cancel(k4.key, 'stopped');
    const got4 = await settled(fourth, 3000);
    await wait(300);
    const p4 = textOf(await call('canvas_pending', {}));
    check('a brief withdrawn is given up on at once and leaves the hand\'s list', cancelled && !got4.ok && /stopped/.test(got4.error || '') && !!k4 && !p4.includes(k4.key) && seat.waiting().length === 0,
      { cancelled, got: got4, pending: p4.slice(0, 200) });

    await wait(400);
    check('the watcher printed one line per brief parked — five — and nothing else', watchLines.length === 5 && watchLines.every((l) => /^brief \S+ · /.test(l)) && new Set(watchLines.map((l) => l.split(' ')[1])).size === 5, watchLines);
  } finally {
    seat.leave();
    store.close();
    watch.kill();
  }
}

// ===== Pictures in a room (PLAN-IPAD-NOTES A1): the hand puts one on the board, and sees one =====
{
  const sha = (b) => createHash('sha256').update(b).digest('hex');
  const solid = (n, rgba) => { const px = new Uint8Array(n * n * 4); for (let i = 0; i < n * n; i++) px.set(rgba, i * 4); return new Uint8Array(encodePNG(n, n, px)); };
  const RED = [200, 40, 40, 255], BLUE = [50, 70, 210, 255];
  const red = solid(16, RED), blue = solid(20, BLUE);
  const assetUrl = (hash) => `${RELAY}/rooms/${ROOM}/assets/${hash}`;
  const picNode = (st, id) => { const n = st.nodes.get(id); return n && MM.pictureOf(n); };
  const tabState = async () => { tabSession.load(MM.mergeLogs(await tab.readLogs(), { me: tabMe })); return tabSession.getState(); };
  const idOf = (t) => (t.match(/^(\S+) placed/) || [])[1];

  // A PNG as base64: the bytes go to the room's relay by their hash FIRST, then the event, in the hand's own log.
  const imp = await call('canvas_import', { base64: Buffer.from(red).toString('base64'), name: 'swatch.png', at: { x: 900, y: 500, w: 160 } });
  const redId = idOf(textOf(imp));
  check('canvas_import puts a PNG on the board — placed, its size read from the header, where it stands', !!redId && /16×16/.test(textOf(imp)) && /placed at 900,500 160×160/.test(textOf(imp)), textOf(imp));
  const held = await fetch(assetUrl(sha(red)));
  check('the relay holds the bytes by their hash — what the hand sent, byte for byte, as a PNG', held.status === 200 && held.headers.get('content-type') === 'image/png' && Buffer.compare(Buffer.from(await held.arrayBuffer()), Buffer.from(red)) === 0, held.status);
  let st9 = await tabState();
  for (let i = 0; i < 25 && !picNode(st9, redId); i++) { await wait(100); st9 = await tabState(); }
  const p9 = picNode(st9, redId);
  check('the tab merges it as a picture of the hand\'s: swatch.png, 16×16, the asset the SHA-256 of the bytes, image/png, standing at 900,500',
    !!p9 && p9.name === 'swatch.png' && p9.w === 16 && p9.h === 16 && p9.asset === 'sha256:' + sha(red) && p9.mime === 'image/png' && Math.round(MM.boundsOf(st9.nodes.get(redId)).minX) === 900 && Math.round(MM.boundsOf(st9.nodes.get(redId)).minY) === 500, p9);
  const author = st9.nodes.get(redId).edges.find((e) => e.rel === 'made-by');
  check('and it is the hand\'s own act: made by the hand "smoke", not the tab', !!author && /smoke/.test(author.to), author);

  // A path, and a URL.
  const dir = mkdtempSync(path.join(tmpdir(), 'mm-import-'));
  const file = path.join(dir, 'sky blue.png');
  writeFileSync(file, blue);
  const byPath = await call('canvas_import', { path: file, place: { right: redId, w: 120 } });
  const blueId = idOf(textOf(byPath));
  check('canvas_import takes a path, named for the file, and places it by a mark the way canvas_write does — right of the swatch', !!blueId && /20×20/.test(textOf(byPath)) && /right of /.test(textOf(byPath)) && textOf(byPath).includes(redId), textOf(byPath));
  const web = createServer((req, res) => { if (req.url === '/pic.png') res.writeHead(200, { 'content-type': 'image/png' }).end(Buffer.from(blue)); else if (req.url === '/page.html') res.writeHead(200, { 'content-type': 'text/html' }).end('<html>no</html>'); else res.writeHead(404).end(); });
  await new Promise((ok) => web.listen(0, '127.0.0.1', ok));
  const webUrl = (p) => 'http://127.0.0.1:' + web.address().port + p;
  const byUrl = await call('canvas_import', { url: webUrl('/pic.png'), name: 'from-the-web.png', at: { x: 900, y: 700 } });
  check('canvas_import takes a URL — fetched here, kept in the room by its hash (the same bytes as the path\'s: one asset)', /placed/.test(textOf(byUrl)) && /from-the-web\.png/.test(textOf(byUrl)), textOf(byUrl));
  const html = await call('canvas_import', { url: webUrl('/page.html') });
  check('a URL that is not a picture is said, and nothing is placed', /not a picture/.test(textOf(html)) && !/ placed at /.test(textOf(html)), textOf(html));

  // A JPEG: its size from the header by hand, kept by its hash like any picture.
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xc0, 0, 11, 8, 0x03, 0xe8, 0x07, 0xd0, 1, 1, 0x11, 0, 0xff, 0xd9]);
  const jp = await call('canvas_import', { base64: Buffer.from(jpeg).toString('base64'), name: 'holiday.jpeg', at: { x: 1200, y: 500, w: 200 } });
  const jpId = idOf(textOf(jp));
  check('a JPEG\'s size is read from its header — 2000×1000 — and it stands 200 wide, 100 high, named for the kind the board keeps it as (holiday.jpg)', !!jpId && /2000×1000/.test(textOf(jp)) && /200×100/.test(textOf(jp)) && /holiday\.jpg/.test(textOf(jp)), textOf(jp));
  st9 = await tabState();
  for (let i = 0; i < 25 && !picNode(st9, jpId); i++) { await wait(100); st9 = await tabState(); }
  check('as a jpg artifact whose mime is image/jpeg', !!picNode(st9, jpId) && picNode(st9, jpId).kind === 'jpg' && picNode(st9, jpId).mime === 'image/jpeg', picNode(st9, jpId));

  // An SVG is a thing the page already draws: an svg artifact, with its text — no asset, no relay.
  const svgText = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="red"/></svg>';
  const sv = await call('canvas_import', { base64: Buffer.from(svgText).toString('base64'), name: 'dot.svg', at: { x: 900, y: 900, w: 100, h: 100 } });
  const svId = idOf(textOf(sv));
  st9 = await tabState();
  for (let i = 0; i < 25 && !(svId && st9.nodes.get(svId)); i++) { await wait(100); st9 = await tabState(); }
  const svNode = svId && st9.nodes.get(svId);
  const svRep = svNode && svNode.reps.filter((x) => x.modality === 'code').pop();
  check('an SVG file becomes an svg artifact holding its text, with no asset', !!svRep && svRep.data.kind === 'svg' && svRep.data.code === svgText && !svRep.data.asset && !picNode(st9, svId), svRep && svRep.data);

  // What cannot be a picture is said in a sentence.
  const notPic = await call('canvas_import', { base64: Buffer.from('just words').toString('base64'), name: 'words.png' });
  check('bytes that are no picture are refused in words, whatever the name says', /not a picture/.test(textOf(notPic)) && /PNG, JPEG or WebP/.test(textOf(notPic)) && !/ placed at /.test(textOf(notPic)), textOf(notPic));
  const huge = await call('canvas_import', { base64: Buffer.concat([Buffer.from(red), Buffer.alloc(12 * 1024 * 1024)]).toString('base64'), name: 'huge.png' });
  check('a picture past 12 MB is said too large before anything is sent', /12 MB/.test(textOf(huge)) && !/ placed at /.test(textOf(huge)), textOf(huge).slice(0, 200));
  const none = await call('canvas_import', { name: 'nothing.png' });
  check('canvas_import with no path, url or base64 says what it needs', /path, a url or base64/.test(textOf(none)), textOf(none));
  const missing = await call('canvas_import', { path: path.join(dir, 'not-there.png') });
  check('a path that does not exist is said, not thrown', /not-there\.png/.test(textOf(missing)) && !/ placed at /.test(textOf(missing)), textOf(missing));

  // The hand's look says a picture whose bytes the room holds can be seen; the tab's picture with no bytes anywhere still says it has none.
  const look9 = textOf(await call('canvas_look', {}));
  const line = (id) => look9.split('\n').find((l) => l.startsWith(id + ' ')) || '';
  check('canvas_look lists the swatch as a picture the room holds — canvas_see draws it',
    /a picture swatch\.png 16×16/.test(line(redId)) && /in the room/.test(line(redId)) && !/this hand has none to see/.test(line(redId)) && !/sha256/.test(line(redId)), line(redId));
  const ghostId = tabSession.import({ kind: 'jpg', path: 'imports/ghost.jpg', name: 'ghost.jpg', bounds: { minX: 1500, minY: 400, maxX: 1700, maxY: 500 }, asset: 'sha256:' + 'cd'.repeat(32), mime: 'image/jpeg', w: 400, h: 200, at: Date.now() + 40 });
  await tab.publish(tabSession.getEvents().filter((e) => !e.by));
  let ghostLine = '';
  for (let i = 0; i < 25 && !ghostLine; i++) { ghostLine = textOf(await call('canvas_look', {})).split('\n').find((l) => l.startsWith(ghostId + ' ')) || ''; if (!ghostLine) await wait(100); }
  check('and a picture whose bytes no one put in the room still says this hand has none to see', /this hand has none to see/.test(ghostLine) && !/in the room/.test(ghostLine), ghostLine);
  const seeGhost = await call('canvas_see', { ids: [ghostId] });
  check('canvas_see of it says the room holds no bytes for it, and draws its frame', /holds no bytes for it/.test(textOf(seeGhost)) && (seeGhost.content || []).some((c) => c.type === 'image'), textOf(seeGhost));

  // Seeing: the picture is under the ink in the PNG the hand gets.
  const seen9 = await call('canvas_see', { ids: [redId], size: 200 });
  const img9 = (seen9.content || []).find((c) => c.type === 'image');
  const dec = img9 && decodePNG(Buffer.from(img9.data, 'base64'));
  const mid = dec && [...dec.rgba.slice(((dec.height >> 1) * dec.width + (dec.width >> 1)) * 4, ((dec.height >> 1) * dec.width + (dec.width >> 1)) * 4 + 3)];
  check('canvas_see of the swatch returns its pixels where it stands — the red of the bytes, not a frame', !!mid && mid.every((v, i) => Math.abs(v - RED[i]) < 6) && /swatch\.png/.test(textOf(seen9)), { mid, text: textOf(seen9) });
  const seenJpeg = await call('canvas_see', { ids: [jpId], size: 200 });
  const jpegImages = (seenJpeg.content || []).filter((c) => c.type === 'image');
  check('a JPEG is drawn as a frame in the PNG, the hand is told it could not decode it — and the picture itself follows as its own image, the bytes as they are, mime image/jpeg',
    /holiday\.jpg/.test(textOf(seenJpeg)) && /could not decode/.test(textOf(seenJpeg)) && jpegImages.length === 2 && jpegImages[0].mimeType === 'image/png' && jpegImages[1].mimeType === 'image/jpeg' && jpegImages[1].data === Buffer.from(jpeg).toString('base64'), { text: textOf(seenJpeg), mimes: jpegImages.map((c) => c.mimeType) });

  // A picture the TAB put in the room: the tab PUTs its bytes by hash, names them in an event, and the hand sees it.
  const tabPic = solid(24, [30, 160, 70, 255]);
  const put = await fetch(assetUrl(sha(tabPic)), { method: 'PUT', body: tabPic });
  tabSession.import({ kind: 'png', path: 'imports/leaf.png', name: 'leaf.png', bounds: { minX: 1500, minY: 100, maxX: 1700, maxY: 300 }, asset: 'sha256:' + sha(tabPic), mime: 'image/png', w: 24, h: 24, at: Date.now() + 50 });
  await tab.publish(tabSession.getEvents().filter((e) => !e.by));
  const leafId = tabSession.getState().artifacts.find((id) => { const p = picNode(tabSession.getState(), id); return p && p.name === 'leaf.png'; });
  let seenLeaf = null;
  for (let i = 0; i < 25 && !seenLeaf; i++) { const r = await call('canvas_see', { ids: [leafId], size: 160 }); if ((r.content || []).some((c) => c.type === 'image')) seenLeaf = r; else await wait(100); }
  const leaf = seenLeaf && decodePNG(Buffer.from(seenLeaf.content.find((c) => c.type === 'image').data, 'base64'));
  const lm = leaf && [...leaf.rgba.slice(((leaf.height >> 1) * leaf.width + (leaf.width >> 1)) * 4, ((leaf.height >> 1) * leaf.width + (leaf.width >> 1)) * 4 + 3)];
  check('a picture the tab put in the room by its hash is seen by the hand, drawn where it stands', put.status === 204 && !!lm && lm[1] > 140 && lm[0] < 60, { put: put.status, lm });
  web.close();
}

child.stdin.end();
await wait(200);
child.kill();
tab.close();
relay.close();
console.log(failed ? failed + ' check(s) failed' : 'all checks passed');
process.exit(failed ? 1 : 0);

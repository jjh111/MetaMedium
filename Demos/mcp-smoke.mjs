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

const here = path.dirname(fileURLToPath(import.meta.url));
const MM = await import(pathToFileURL(path.join(here, 'metamedium-core.node.mjs')).href);
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
  child.stderr.on('data', (d) => process.stderr.write('  [' + tag + '] ' + d));
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
  return { child, rpc, call };
}

// The MCP hand.
const { child, rpc, call } = spawnHand({ MM_ROOM: ROOM, MM_RELAY: RELAY, MM_NAME: 'smoke' }, 'mcp');
const textOf = (res) => (res.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');

try {
  const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'smoke', version: '0' } });
  check('initialize names the server', init.result && init.result.serverInfo && init.result.serverInfo.name === 'metamedium', init);
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  const list = await rpc('tools/list', {});
  const names = (list.result && list.result.tools || []).map((t) => t.name);
  check('eight tools, each a verb a hand has', names.length === 8 && ['canvas_look', 'canvas_see', 'canvas_draw', 'canvas_say', 'canvas_propose', 'canvas_label', 'canvas_transcribe', 'canvas_write'].every((n) => names.includes(n)), names);

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
} catch (err) {
  check('the run finished', false, err.message);
}
child.stdin.end();
await wait(200);
child.kill();
tab.close();
relay.close();
console.log(failed ? failed + ' check(s) failed' : 'all checks passed');
process.exit(failed ? 1 : 0);

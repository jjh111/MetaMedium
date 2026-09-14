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
const tabSession = MM.createSession();
const heard = [];
tab.subscribe((participant, events) => heard.push({ participant, events }));
tab.hello();

// The MCP hand.
const child = spawn(process.execPath, [path.join(here, 'mcp.mjs')], { env: { ...process.env, MM_ROOM: ROOM, MM_RELAY: RELAY, MM_NAME: 'smoke' }, stdio: ['pipe', 'pipe', 'pipe'] });
child.stderr.on('data', (d) => process.stderr.write('  [mcp] ' + d));
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
const textOf = (res) => (res.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');

try {
  const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'smoke', version: '0' } });
  check('initialize names the server', init.result && init.result.serverInfo && init.result.serverInfo.name === 'metamedium', init);
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  const list = await rpc('tools/list', {});
  const names = (list.result && list.result.tools || []).map((t) => t.name);
  check('seven tools, each a verb a hand has', names.length === 7 && ['canvas_look', 'canvas_see', 'canvas_draw', 'canvas_say', 'canvas_propose', 'canvas_transcribe', 'canvas_write'].every((n) => names.includes(n)), names);

  // The tab draws first: a box, in its own log.
  const box = MM.strokeFor({ shape: 'rectangle', x: 100, y: 100, w: 200, h: 120 });
  const boxId = tabSession.addStroke(box, Date.now(), undefined, 1);
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
  const got = await until(() => heard.slice(before).some((h) => h.participant === 'smoke~mcp' && h.events.some((e) => e.type === 'stroke')), 4000);
  check('the tab hears the circle as a line from smoke~mcp', got, heard.slice(before).map((h) => h.participant + ':' + h.events.map((e) => e.type).join('+')));
  const logs = await tab.readLogs();
  tabSession.load(MM.mergeLogs(logs, { me: tabMe }));
  const st = tabSession.getState();
  const theirs = st.contentIds.map((id) => st.nodes.get(id)).find((n) => n.edges.some((e) => e.rel === 'made-by' && e.to === 'participant:hand:smoke_mcp'));
  check('merged in the tab, the circle is the hand "smoke"\'s, read as a circle', !!theirs && MM.topInterpretation(theirs) === 'circle', theirs && MM.topInterpretation(theirs));
  const why = st.explanations.map((id) => st.nodes.get(id)).find((n) => n.edges.some((e) => e.rel === 'made-by' && e.to === 'participant:hand:smoke_mcp'));
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
  const wrote = await call('canvas_write', { kind: 'run', code: 'mm.ctx.fillRect(0,0,10,10);', name: 'dot', bounds: { x: 600, y: 100, w: 200, h: 120 } });
  check('canvas_write places a program that waits for play', /placed at 600,100/.test(textOf(wrote)) && /waits for the hand/.test(textOf(wrote)), textOf(wrote));
  await until(() => heard.some((h) => h.participant === 'smoke~mcp' && h.events.some((e) => e.type === 'import')), 4000);
  tabSession.load(MM.mergeLogs(await tab.readLogs(), { me: tabMe }));
  const st2 = tabSession.getState();
  const boxNode = st2.nodes.get(boxId);
  const reading = MM.interpretationsOf(boxNode, st2.nodes).find((x) => x.label === 'card');
  check('in the tab: the reading is held on the box, attributed to smoke', !!reading && reading.sourceName !== 'you' && /smoke/.test(reading.sourceName || ''), reading && { label: reading.label, source: reading.sourceName, weight: reading.weight });
  check('in the tab: the transcript is held on the box', MM.transcriptOf(boxNode) === 'hello', MM.transcriptsOf(boxNode));
  const prog = st2.artifacts.map((id) => st2.nodes.get(id)).find((n) => n.reps.some((r) => r.modality === 'code' && r.data.kind === 'run'));
  check('in the tab: the program stands, live, and its clock is not playing', !!prog && st2.live.includes(prog.id) && !(st2.clocks[prog.id] && st2.clocks[prog.id].playing), prog && { id: prog.id, clock: st2.clocks[prog.id] });
  const answers = st2.explanations.length;
  check('in the tab: two answers stand (the why, and the sentence)', answers === 2, answers);

  // A wrong kind, a missing id: said plainly, not thrown.
  const bad = await call('canvas_write', { kind: 'exe', code: 'x' });
  check('a kind the canvas does not know is refused in words', /not a kind/.test(textOf(bad)), textOf(bad));
  const gone = await call('canvas_say', { text: 'x', about: ['stroke:999'] });
  check('a sentence about nothing is not placed', /not placed/.test(textOf(gone)), textOf(gone));
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

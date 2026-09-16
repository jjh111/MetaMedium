// A smoke test for the shard's MCP hand: speaks MCP to shard-3d/mcp.mjs over
// stdio, in a room of its own on a relay of its own, with a second hand in Node
// standing in for the shard's tab. Not part of `npm test` (it spawns processes
// and takes a port); run it by hand:
//
//   node shard-3d/mcp-smoke.mjs
//
// What it proves is the whole of G5's path except the drawing: the hand joins,
// sees the tab's board, draws a claim on a named plane that the tab reads as a
// mark of ITS OWN, and — the seat — takes a brief the tab parked, answers it in
// the contract, and the answer lands back in the tab attributed to the hand.
//
// Every line it prints is a check; it exits 1 when one fails.

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { startRelay } from '../Demos/relay.mjs';
import { relayTransport } from '../Demos/live-node.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const MM = await import(pathToFileURL(path.join(here, '..', 'Demos', 'metamedium-core.node.mjs')).href);

/**
 * A port nothing is listening on, asked for rather than guessed.
 *
 * A fixed port is a fixed bug on a developer's machine: this run found 8033
 * already held by something unrelated, and because `startRelay` binds every
 * interface while the squatter held 127.0.0.1 only, the relay came up, the
 * hand's probe reached the SQUATTER, and the failure read as "no relay
 * answers" — which was true, and about the wrong server.
 */
const freePort = async () => {
  const probe = createServer();
  await new Promise((ok, fail) => {
    probe.once('error', fail);
    probe.listen(0, '127.0.0.1', ok);
  });
  const port = probe.address().port;
  await new Promise((ok) => probe.close(ok));
  return port;
};

const PORT = await freePort();
const RELAY = 'http://127.0.0.1:' + PORT;
const ROOM = 'shard-test-' + Math.random().toString(36).slice(2, 6);
let failed = 0;
const check = (name, ok, detail) => {
  failed += ok ? 0 : 1;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : ' — ' + JSON.stringify(detail)));
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms) => {
  const end = Date.now() + (ms || 3000);
  while (Date.now() < end) {
    if (fn()) return true;
    await wait(50);
  }
  return fn();
};

const relay = await startRelay(PORT);

// The tab: a hand in the room with a session of its own, exactly as the shard's
// `room.ts` does it.
const tabMe = 'john~1';
const tab = new MM.LiveStore(relayTransport(RELAY, ROOM), tabMe, ROOM);
const tabSession = MM.createSession();
const heard = [];
tab.subscribe((participant, events) => heard.push({ participant, events }));
const tabMerge = async () => {
  const logs = await tab.readLogs();
  const mine = tabSession.getEvents().filter((e) => !e.by);
  tabSession.load(MM.mergeLogs(Object.assign({}, logs, { [tabMe]: mine }), { me: tabMe }));
};
tab.hello();

/** A box in the foundation's own (u, v), as the shard logs one. */
const boxPoints = (x, y, w, h) => {
  const c = [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }];
  const out = [];
  for (let i = 0; i < c.length - 1; i++)
    for (let s = 0; s < 20; s++) {
      const t = s / 20;
      out.push({ x: c[i].x + (c[i + 1].x - c[i].x) * t, y: c[i].y + (c[i + 1].y - c[i].y) * t });
    }
  out.push(c[0]);
  return out;
};
const FOUNDATION = { origin: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, up: { x: 0, y: 0, z: 1 }, name: 'foundation', source: 'chosen', why: 'the foundation tile was held' };

// The MCP hand.
const child = spawn(process.execPath, [path.join(here, 'mcp.mjs')], {
  env: { ...process.env, MM_ROOM: ROOM, MM_RELAY: RELAY, MM_NAME: 'smoke' },
  stdio: ['pipe', 'pipe', 'pipe'],
});
child.stderr.on('data', (d) => process.stderr.write('  [mcp] ' + d));
let out = '';
const pendingRpc = new Map();
child.stdout.on('data', (d) => {
  out += d;
  let i;
  while ((i = out.indexOf('\n')) >= 0) {
    const line = out.slice(0, i).trim();
    out = out.slice(i + 1);
    if (!line) continue;
    try {
      const m = JSON.parse(line);
      if (pendingRpc.has(m.id)) {
        pendingRpc.get(m.id)(m);
        pendingRpc.delete(m.id);
      }
    } catch {
      /* not ours */
    }
  }
});
let nextId = 1;
const rpc = (method, params) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    pendingRpc.set(id, resolve);
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    setTimeout(() => {
      if (pendingRpc.has(id)) {
        pendingRpc.delete(id);
        reject(new Error(method + ' timed out'));
      }
    }, 8000);
  });
const call = async (name, args) => {
  const m = await rpc('tools/call', { name, arguments: args || {} });
  return m.result || m.error;
};
const textOf = (res) => (res.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');

try {
  const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'smoke', version: '0' } });
  check('initialize names the shard\'s server', init.result && init.result.serverInfo && init.result.serverInfo.name === 'metamedium-3d', init);
  check('it says it is the seat as well as a hand', /space_pending/.test((init.result && init.result.instructions) || ''), (init.result || {}).instructions);
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

  const list = await rpc('tools/list', {});
  const names = (list.result && list.result.tools || []).map((t) => t.name);
  check(
    'six tools: four verbs a hand has, and the two that are the seat',
    names.length === 6 && ['space_look', 'space_draw', 'space_propose', 'space_say', 'space_pending', 'space_answer'].every((n) => names.includes(n)),
    names
  );

  // ---- the tab draws a plan on the foundation, in its own log --------------
  const at = Date.now();
  const planId = tabSession.addStroke(boxPoints(-2, -1, 4, 2.6), at, undefined, 0.013);
  tabSession.propose({
    participantId: MM.LOCAL_PARTICIPANT,
    nodeId: planId,
    edges: [],
    reps: [{ modality: 'plane', data: { ...FOUNDATION, scale: 0.013 }, confidence: 1, reasoning: FOUNDATION.why }],
    at,
  });
  await tab.appendLog(tabMe, tabSession.getEvents().slice());

  let seen = '';
  for (let i = 0; i < 20 && !/1 mark/.test(seen); i++) {
    seen = textOf(await call('space_look', {}));
    if (!/1 mark/.test(seen)) await wait(100);
  }
  check('space_look sees the tab\'s plan, on the foundation, as a rectangle', /1 mark/.test(seen) && /rectangle/.test(seen) && /on foundation/.test(seen), seen);
  check('space_look names the three planes', /foundation.*height.*width/s.test(seen), seen.split('\n')[1]);
  check('space_look says no brief is waiting', /no brief is waiting/.test(seen), seen);

  // ---- the hand draws a claim of its own ----------------------------------
  const drew = await call('space_draw', {
    claims: [{ shape: 'rectangle', plane: 'height', x: -1, y: -2.4, w: 2, h: 2.4, why: 'the tower, from the front' }],
  });
  const drewText = textOf(drew);
  check('space_draw lands a rectangle on the height plane — not a dot', /rectangle/.test(drewText) && /on height/.test(drewText), drewText);

  await until(() => heard.some((h) => /^smoke~/.test(h.participant) && h.events.some((e) => e.type === 'stroke')), 4000);
  await tabMerge();
  const tabState = tabSession.getState();
  const handId = 'participant:hand:' + heard.filter((h) => /^smoke~/.test(h.participant))[0].participant.replace(/[^A-Za-z0-9]/g, '_');
  const theirs = tabState.contentIds
    .map((id) => tabState.nodes.get(id))
    .find((n) => n.edges.some((e) => e.rel === 'made-by' && e.to === handId));
  check('in the tab, the claim is the hand\'s own mark, read as a rectangle', !!theirs && MM.topInterpretation(theirs) === 'rectangle', theirs && MM.topInterpretation(theirs));
  check('it carries the plane it was drawn on, so the shard can place it', !!theirs && MM.getRep(theirs, 'plane') && MM.getRep(theirs, 'plane').data.name === 'height', theirs && MM.getRep(theirs, 'plane') && MM.getRep(theirs, 'plane').data);
  const why = tabState.explanations
    .map((id) => tabState.nodes.get(id))
    .find((n) => n.edges.some((e) => e.rel === 'made-by' && e.to === handId));
  check('its "why" stands beside it, in the hand\'s name', !!why, tabState.explanations);

  // ---- a claim with no plane is refused in words, not thrown ---------------
  const nowhere = await call('space_draw', { claims: [{ shape: 'circle', x: 0, y: 0, w: 1, h: 1 }] });
  check('a claim with no plane is refused in words', /no plane/.test(textOf(nowhere)), textOf(nowhere));

  // ---- the seat: a brief parked, listed, answered --------------------------
  const key = 'k' + Math.random().toString(36).slice(2, 6);
  const CONTRACT = 'Reply with ONLY a JSON object: {"steps":[…],"profiles":[…]}';
  const BRIEF = 'THE SPACE\nfoundation: one profile, 4 × 2.6 u';
  tabSession.answer({
    participantId: MM.LOCAL_PARTICIPANT,
    question: 'brief:' + key,
    text: `${CONTRACT}\n\n----\n\n${BRIEF}\n\nPropose the tree. The human asked for: “castle with green tops”`,
    aboutIds: [planId],
    at: Date.now(),
  });
  await tab.appendLog(tabMe, tabSession.getEvents().slice(tabSession.getEvents().length - 1));

  let listed = '';
  for (let i = 0; i < 25 && !new RegExp('brief ' + key).test(listed); i++) {
    listed = textOf(await call('space_pending', {}));
    if (!new RegExp('brief ' + key).test(listed)) await wait(100);
  }
  check('space_pending carries the key, the words, the contract and the brief',
    new RegExp('brief ' + key).test(listed) && /castle with green tops/.test(listed) && /ONLY a JSON object/.test(listed) && /foundation: one profile/.test(listed),
    listed);
  check('space_pending says who asked', /from john/.test(listed), listed.split('\n')[0]);

  const REPLY = { steps: [{ id: 's1', op: 'extrude', profile: planId, depth: 3.6, name: 'castle', why: 'the plan, grown' }] };
  const answered = await call('space_answer', { key, reply: REPLY });
  check('space_answer sends the reply', /answered/.test(textOf(answered)), textOf(answered));

  // Wait for THIS answer, by its key — not for "an answer from smoke", which
  // the `why` beside its own claim already satisfied, so the merge ran before
  // the reply had crossed the wire and the check failed on a race of its own
  // making.
  await until(
    () => heard.some((h) => /^smoke~/.test(h.participant) && h.events.some((e) => e.type === 'answer' && e.question === 'answer:' + key)),
    4000
  );
  await tabMerge();
  const after = tabSession.getState();
  const reply = after.explanations
    .map((id) => after.nodes.get(id))
    .map((n) => ({ n, rep: n.reps.find((x) => x.modality === 'explanation') }))
    .find((x) => x.rep && String(x.rep.data.question) === 'answer:' + key);
  check('the answer lands in the tab, keyed to that brief', !!reply, after.explanations.length);
  check('and it is the hand\'s, not the tab\'s own', !!reply && reply.n.edges.some((e) => e.rel === 'made-by' && e.to === handId), reply && reply.n.edges);
  check('carrying the tree verbatim, for the shard to read as it reads a model\'s', !!reply && JSON.parse(reply.rep.data.text).steps[0].name === 'castle', reply && reply.rep.data.text);

  // Answered once, it stops being pending — so the same brief is never answered twice.
  const twice = await call('space_answer', { key, reply: REPLY });
  check('the same brief cannot be answered twice', /no brief/.test(textOf(twice)), textOf(twice));
  const empty = textOf(await call('space_pending', {}));
  check('space_pending is empty again', /no brief is parked/.test(empty), empty);

  // ---- a refusal ----------------------------------------------------------
  const key2 = 'k' + Math.random().toString(36).slice(2, 6);
  tabSession.answer({ participantId: MM.LOCAL_PARTICIPANT, question: 'brief:' + key2, text: 'nothing much', aboutIds: [planId], at: Date.now() });
  await tab.appendLog(tabMe, tabSession.getEvents().slice(tabSession.getEvents().length - 1));
  await until(async () => new RegExp('brief ' + key2).test(textOf(await call('space_pending', {}))), 4000);
  let sawIt = '';
  for (let i = 0; i < 25 && !new RegExp('brief ' + key2).test(sawIt); i++) {
    sawIt = textOf(await call('space_pending', {}));
    if (!new RegExp('brief ' + key2).test(sawIt)) await wait(100);
  }
  const refused = await call('space_answer', { key: key2, refuse: 'nothing is standing for a tree to fill' });
  check('a brief can be refused, with the reason', /refused/.test(textOf(refused)) && /nothing is standing/.test(textOf(refused)), textOf(refused));

  // ---- saying, and proposing ----------------------------------------------
  const said = await call('space_say', { text: 'the plan is 4 × 2.6 — a courtyard, not a keep', about: [planId] });
  check('space_say places a sentence beside the marks', /said beside/.test(textOf(said)), textOf(said));
  const gone = await call('space_say', { text: 'x', about: ['stroke:999'] });
  check('a sentence about nothing is not placed', /not placed/.test(textOf(gone)), textOf(gone));

  const noSolid = await call('space_propose', { solid: 'keep', reply: { parts: [{ id: 'part:1', name: 'turret' }] } });
  check('proposing about a solid that is not there is said plainly', /no solid/.test(textOf(noSolid)), textOf(noSolid));

  const badKey = await call('space_answer', { key: 'nosuch', reply: {} });
  check('answering a brief nobody parked is said plainly', /no brief/.test(textOf(badKey)), textOf(badKey));
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

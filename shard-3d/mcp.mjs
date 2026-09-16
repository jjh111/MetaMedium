#!/usr/bin/env node
// The shard's MCP hand: a 3D drawing space as tools for Claude Code, or any
// MCP client (SHARD-3D-PUSH-2 G5).
//
//   node shard-3d/mcp.mjs                       # room "shard", relay http://127.0.0.1:8020, name "claude"
//   MM_ROOM=table MM_NAME=fable node shard-3d/mcp.mjs
//
// In the shard: the models pane → *a hand in the room* → seat it, or open
// shard-3d with ?live=shard&relay=http://127.0.0.1:8020. A relay is started
// here when none answers on this machine, exactly as the canvas's hand does
// it (Demos/mcp.mjs). The engine it runs is the committed Node bundle
// (Demos/metamedium-core.node.mjs) — the shard's own TypeScript is not
// importable here, and deliberately not duplicated: everything below is either
// core's, or three plane constants and one rep name, marked where they are.
//
// **It is a hand in a room, and it is also the seat.** Six tools:
//
//   look · draw · propose · say — the verbs a hand in this space has
//   pending · answer           — the SEAT: a brief John types at
//                                *Claude Code (MCP hand)* is parked in the
//                                room, `space_pending` lists it, and
//                                `space_answer` returns the reply in the same
//                                contract a model answers in.
//
// It proposes and never blesses. It writes no code that runs, holds no keys,
// and cannot play anything. Everything it does arrives in the tab as its own
// log, stamped `by`, and draws in its own colour.
//
// The protocol is MCP over stdio — newline-delimited JSON-RPC — written by
// hand so the repo takes no dependency. Logging goes to stderr; stdout carries
// the protocol and nothing else.

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { relayTransport, ensureRelay } from '../Demos/live-node.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const log = (...a) => process.stderr.write(a.join(' ') + '\n');

// ----- Configuration: room, relay, name -------------------------------------
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : undefined; };
const ROOM = flag('room') || process.env.MM_ROOM || 'shard';
const RELAY = (flag('relay') || process.env.MM_RELAY || 'http://127.0.0.1:8020').replace(/\/+$/, '');
const NAME = (flag('name') || process.env.MM_NAME || 'claude').replace(/~.*$/, '');
// A hand in a room is ONE PROCESS, the way a hand in a room is one tab: the
// name is the caller's and the suffix says which hand, because two logs under
// one name are taken for one log and the last to answer a hello replaces the
// other (the canvas's hand found this the hard way).
const ME = NAME + '~' + Math.random().toString(36).slice(2, 6);

// ----- The engine, built ----------------------------------------------------
const distPath = path.join(here, '..', 'Demos', 'metamedium-core.node.mjs');
if (!existsSync(distPath)) {
  log('Demos/metamedium-core.node.mjs is missing — run `npm run build:node` in metamedium-core and copy dist/metamedium-core.node.mjs to Demos/');
  process.exit(1);
}
const MM = await import(pathToFileURL(distPath).href);

// ----- The shard's own three constants --------------------------------------
// Duplicated from shard-3d/src/plane.ts and src/log.ts, and that is the whole
// duplication: this process cannot import the shard's TypeScript, and a build
// step for six tools would be a worse trade than four literals. They are
// FIXED — the three named planes pass through the origin by definition — so
// there is nothing here to drift with the shard's geometry.
const PLANE_REP = 'plane';
const NAMED = {
  foundation: { origin: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, up: { x: 0, y: 0, z: 1 }, name: 'foundation' },
  height: { origin: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 }, up: { x: 0, y: -1, z: 0 }, name: 'height' },
  width: { origin: { x: 0, y: 0, z: 0 }, normal: { x: 1, y: 0, z: 0 }, up: { x: 0, y: -1, z: 0 }, name: 'width' },
};
const OP_MARK = '// mm:op tree v1';
const BRIEF_PREFIX = 'brief:';
const ANSWER_PREFIX = 'answer:';

// ----- The room: a LiveStore over the relay, and a session from its logs -----
let relayServer = null;
try { relayServer = await ensureRelay(RELAY); } catch (err) { log(err.message); process.exit(1); }
if (relayServer) log(`relay started on ${RELAY} (none was answering)`);
const transport = relayTransport(RELAY, ROOM);
const store = new MM.LiveStore(transport, ME, ROOM);
const session = MM.createSession();
let sentCount = 0;
let lastAt = 0;
const now = () => { lastAt = Math.max(Date.now(), lastAt + 1); return lastAt; };
const label = (name) => String(name || '').replace(/~[^~]*$/, '');

// My log is the session's unstamped events — sent or not — never the room's
// copy of it: a line that lands between a send and the next merge would
// otherwise count my sent events twice.
const myLog = () => session.getEvents().filter((e) => !e.by);
async function merge() {
  const logs = await store.readLogs();
  session.load(MM.mergeLogs(Object.assign({}, logs, { [ME]: myLog() }), { me: ME }));
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

// ----- Reading the board ----------------------------------------------------
const r3 = (v) => Math.round(v * 1000) / 1000;
const planeOf = (node) => {
  const rep = MM.getRep(node, PLANE_REP);
  return rep ? rep.data : null;
};
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
/** The shard's own op tree, out of an artifact's newest `json` code. */
function treeOf(node) {
  const rep = codeRepOf(node);
  const code = rep && rep.data && rep.data.code;
  if (!code || !String(code).trimStart().startsWith(OP_MARK)) return null;
  const i = String(code).indexOf('\n');
  try { return JSON.parse(String(code).slice(i + 1)); } catch { return null; }
}
/** Where a plane is, said in a word. */
function planeWord(plane) {
  if (!plane) return 'no plane';
  if (plane.name) return plane.name;
  const n = plane.normal || {};
  return `a view plane facing ${r3(n.x ?? 0)},${r3(n.y ?? 0)},${r3(n.z ?? 0)}`;
}

/** Every brief parked in the room that nobody has answered yet. */
function parkedBriefs() {
  const s = session.getState();
  const answered = new Set();
  const out = [];
  const said = [];
  for (const id of s.explanations) {
    const n = s.nodes.get(id);
    if (!n || n.reps.some((x) => x.modality === 'erased')) continue;
    const rep = n.reps.find((x) => x.modality === 'explanation');
    if (!rep) continue;
    said.push({ node: n, data: rep.data || {} });
  }
  for (const x of said) {
    const q = String(x.data.question || '');
    if (q.startsWith(ANSWER_PREFIX)) answered.add(q.slice(ANSWER_PREFIX.length));
  }
  for (const x of said) {
    const q = String(x.data.question || '');
    if (!q.startsWith(BRIEF_PREFIX)) continue;
    const key = q.slice(BRIEF_PREFIX.length);
    if (answered.has(key)) continue;
    const prompt = String(x.data.text || '');
    // The prompt is the contract, a rule of dashes, then the brief itself.
    const cut = prompt.indexOf('\n\n----\n\n');
    const user = cut >= 0 ? prompt.slice(cut + 8) : prompt;
    const mark = '\n\nPropose the tree.';
    const at = user.indexOf(mark);
    const tail = at >= 0 ? user.slice(at + mark.length) : '';
    const asked = /The human asked for: [“"](.*)[”"]\s*$/.exec(tail);
    out.push({
      key,
      words: asked ? asked[1] : '',
      brief: at >= 0 ? user.slice(0, at) : user,
      contract: cut >= 0 ? prompt.slice(0, cut) : '',
      about: x.node.edges.filter((e) => e.rel === 'about').map((e) => e.to),
      from: authorOf(x.node, session.getState()),
      at: x.node.createdAt,
    });
  }
  return out.sort((a, b) => a.at - b.at);
}

function look(args) {
  const s = session.getState();
  const t = Date.now();
  const present = store.presence().filter((p) => t - p.at < 60000).map((p) => label(p.participant));
  const lines = [`room ${ROOM} · you are ${label(ME)}${present.length ? ' · with ' + present.join(', ') : ' · alone so far'}`];

  // The three named planes are the space's own furniture, always there.
  lines.push('planes: foundation (the ground, XZ), height (the wall you face, XY), width (the wall on your right, YZ) — each through the origin, in plane units (u, v)');

  const marks = [];
  const solids = [];
  // Every node carrying ink and a plane, the way the shard's own `marks()`
  // reads them — NOT `contentIds`. A mark a solid was made from leaves the
  // content plane for the artifact's, and filtering on `contentIds` reported
  // *0 marks* on a board with a box standing on two of them, which is the one
  // board the hand most needs to describe.
  for (const node of s.nodes.values()) {
    if (node.reps.some((x) => x.modality === 'erased')) continue;
    if (s.artifacts.includes(node.id)) continue;
    if (!MM.getRep(node, 'stroke') || !MM.getRep(node, PLANE_REP)) continue;
    marks.push(node);
  }
  marks.sort((a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1));
  for (const id of s.artifacts) {
    const node = s.nodes.get(id);
    if (!node || node.reps.some((x) => x.modality === 'erased')) continue;
    const tree = treeOf(node);
    if (tree) solids.push({ node, tree });
  }

  lines.push(`${marks.length} mark${marks.length === 1 ? '' : 's'} · ${solids.length} solid${solids.length === 1 ? '' : 's'}`);

  for (const node of marks) {
    const plane = planeOf(node);
    const pts = MM.strokePointsOf(node) || [];
    const b = pts.length ? MM.getBounds(pts) : null;
    const reads = MM.interpretationsOf(node, s.nodes).slice(0, 2).map((x) => `${x.label} ${x.weight.toFixed(2)}`);
    const who = authorOf(node, s);
    const parts = [node.id, reads.join(', ') || 'unread', 'on ' + planeWord(plane)];
    if (b) parts.push(`${r3(b.minX)},${r3(b.minY)} ${r3(b.maxX - b.minX)}×${r3(b.maxY - b.minY)} u`);
    if (who && who !== 'me') parts.push('by ' + who);
    lines.push(parts.join(' · '));
  }

  for (const { node, tree } of solids) {
    const name = MM.wordOf(node) || 'unnamed';
    lines.push(`${node.id} “${name}” · ${(tree.steps || []).length} step${(tree.steps || []).length === 1 ? '' : 's'}${authorOf(node, s) && authorOf(node, s) !== 'me' ? ' · by ' + authorOf(node, s) : ''}`);
    for (const st of tree.steps || []) {
      const bits = [`  ${st.id} ${st.op}`];
      if (st.name) bits.push(`“${st.name}”`);
      if (st.material && st.material.colour) bits.push(st.material.colour);
      if (st.on) bits.push('on ' + st.on);
      // The marks a step was made FROM — stroke ids, which is what the hand
      // refers to. `profile` on a step the engine built is the resolved outline
      // (points and a plane), not an id, and printing it said `[object Object]`.
      if (Array.isArray(st.from) && st.from.length) bits.push('from ' + st.from.join(', '));
      else if (typeof st.profile === 'string') bits.push('from ' + st.profile);
      if (typeof st.depth === 'number') bits.push(`depth ${r3(st.depth)}`);
      lines.push(bits.join(' · '));
    }
  }

  const waiting = parkedBriefs();
  lines.push(waiting.length
    ? `${waiting.length} brief${waiting.length === 1 ? '' : 's'} parked and waiting — space_pending reads them`
    : 'no brief is waiting');
  if (!marks.length && !solids.length) lines.push('(nothing drawn yet)');
  void args;
  return { text: lines.join('\n') };
}

function pending() {
  const waiting = parkedBriefs();
  if (!waiting.length) return { text: 'no brief is parked. A human types one at the *Claude Code (MCP hand)* seat and it appears here.' };
  const out = waiting.map((b) =>
    [
      `brief ${b.key}${b.from && b.from !== 'me' ? ' · from ' + b.from : ''} · about ${b.about.join(', ') || '(nothing)'}`,
      b.words ? `the human asked for: “${b.words}”` : '(no words — the brief alone)',
      '',
      b.contract ? b.contract : '(no contract was carried)',
      '',
      b.brief,
      '',
      `Answer it with space_answer { "key": "${b.key}", "reply": <the JSON object the contract above asks for> }, or refuse it with { "key": "${b.key}", "refuse": "why" }.`,
    ].join('\n')
  );
  return { text: out.join('\n\n========\n\n') };
}

// ----- Acting on the board --------------------------------------------------

/**
 * Points for one claim, in the plane's own (u, v).
 *
 * Built here rather than through core's `strokeFor`, for one reason that
 * matters: `strokeFor` refuses anything under a pixel across, because on the
 * canvas a unit IS a pixel. In this space a unit is a metre-ish, so a 0.8-unit
 * circle — a tower — is a perfectly ordinary claim, and routing it through that
 * gate silently refused almost everything a hand would want to draw.
 *
 * Every outline is DENSIFIED, not just cornered: the engine measures along the
 * path, and a polyline that is only its corners has nothing between them to
 * measure — a perfect box of four points reads as a circle (the same lesson
 * `image/trace.ts` learned).
 */
function outlineFor(claim) {
  const n = (v, or = 0) => (Number.isFinite(Number(v)) ? Number(v) : or);
  const seg = (a, b, per, out) => {
    for (let i = 0; i < per; i++) {
      const t = i / per;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  };
  const chain = (corners, close, per = 22) => {
    const out = [];
    const pts = close ? corners.concat([corners[0]]) : corners;
    for (let i = 0; i < pts.length - 1; i++) seg(pts[i], pts[i + 1], per, out);
    out.push(pts[pts.length - 1]);
    return out;
  };

  if (Array.isArray(claim.points) && claim.points.length >= 2) {
    const pts = claim.points
      .map((p) => ({ x: Number(p.x), y: Number(p.y) }))
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    if (pts.length < 2) return null;
    // Given as corners, they are corners: densify so the rung can read them.
    return pts.length <= 12 ? chain(pts, String(claim.shape || '').toLowerCase() === 'polygon') : pts;
  }

  const shape = String(claim.shape || '').toLowerCase();
  if (shape === 'line' || shape === 'arrow') {
    const from = claim.from || {};
    const to = claim.to || {};
    const a = { x: n(from.x), y: n(from.y) };
    const b = { x: n(to.x), y: n(to.y) };
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (!(len > 0)) return null;
    const out = chain([a, b], false, 30);
    if (shape === 'arrow') {
      // The barb, drawn back on the shaft the way a hand draws it — which is
      // what the arrow detector measures (a wing turning past ninety degrees).
      const ux = (b.x - a.x) / len;
      const uy = (b.y - a.y) / len;
      const barb = len * 0.2;
      const wing = (side) => ({
        x: b.x - barb * (ux * Math.cos(0.5) - side * uy * Math.sin(0.5)),
        y: b.y - barb * (uy * Math.cos(0.5) + side * ux * Math.sin(0.5)),
      });
      for (const p of [wing(1), b, wing(-1)]) seg(b, p, 8, out);
      out.push(wing(-1));
    }
    return out;
  }

  const x = n(claim.x);
  const y = n(claim.y);
  const w = n(claim.w ?? claim.width);
  const h = n(claim.h ?? claim.height);
  if (!(w > 0) || !(h > 0)) return null;
  if (shape === 'rectangle' || shape === 'rect' || shape === 'box') {
    return chain([{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }], true);
  }
  if (shape === 'triangle') {
    return chain([{ x: x + w / 2, y }, { x: x + w, y: y + h }, { x, y: y + h }], true);
  }
  if (shape === 'circle' || shape === 'ellipse') {
    const out = [];
    const cx = x + w / 2;
    const cy = y + h / 2;
    for (let i = 0; i <= 72; i++) {
      const t = (i / 72) * Math.PI * 2;
      out.push({ x: cx + (Math.cos(t) * w) / 2, y: cy + (Math.sin(t) * h) / 2 });
    }
    return out;
  }
  return null;
}

async function draw(args) {
  const claims = Array.isArray(args.claims) ? args.claims : [];
  if (!claims.length) return { text: 'nothing drawn: pass "claims" — {shape: rectangle|circle|triangle|line|arrow, x, y, w, h} or {from, to}, or {points: [{x, y}, …]}, each with a "plane"' };
  const made = [];
  const refused = [];
  for (const claim of claims.slice(0, MM.MAX_DRAWN)) {
    // The plane first: a claim without one is not a claim about anything, and
    // saying so beats complaining about its outline.
    let plane;
    if (claim.plane && NAMED[claim.plane]) {
      plane = { ...NAMED[claim.plane], source: 'chosen', why: `drawn by ${label(ME)} on the ${claim.plane}` };
      // The gizmo's own handle, said as a number: the plane slid along its
      // normal before the claim is laid on it.
      const at = Number(claim.at);
      if (Number.isFinite(at) && at !== 0) {
        const n = plane.normal;
        plane = { ...plane, origin: { x: n.x * at, y: n.y * at, z: n.z * at }, why: `${plane.why}, ${at} along its normal` };
      }
    } else if (claim.through && claim.facing) {
      const n = claim.facing;
      const len = Math.hypot(Number(n.x) || 0, Number(n.y) || 0, Number(n.z) || 0) || 1;
      const normal = { x: (Number(n.x) || 0) / len, y: (Number(n.y) || 0) / len, z: (Number(n.z) || 0) / len };
      // +v runs DOWN the screen, as it does on every named plane; a plane
      // whose v ran the other way would read every mark upside down. Straight
      // down in world terms, unless the plane is nearly horizontal.
      const up = Math.abs(normal.y) > 0.9 ? { x: 0, y: 0, z: 1 } : { x: 0, y: -1, z: 0 };
      plane = {
        origin: { x: Number(claim.through.x) || 0, y: Number(claim.through.y) || 0, z: Number(claim.through.z) || 0 },
        normal,
        up,
        source: 'view',
        why: `drawn by ${label(ME)} on a view plane through the point given, facing the direction given`,
      };
    } else {
      refused.push(`${claim.shape || 'a claim'}: no plane — name one of foundation, height, width, or give "through" and "facing"`);
      continue;
    }
    const pts = outlineFor(claim);
    if (!pts) { refused.push(`${claim.shape || 'a claim'}: not a shape this space reads, and no points`); continue; }
    // The scale a hand would have drawn it at. The shape rung measures in the
    // HAND's pixels, and plane units are not pixels: without this a 1.2-unit
    // box is 1.2 px, below the hand's resolution, and the only reading offered
    // is `dot`. Declared, so the claim reads at the size it was meant.
    const b = MM.getBounds(pts);
    const size = Math.max(b.maxX - b.minX, b.maxY - b.minY) || 1;
    const scale = Number.isFinite(Number(claim.scale)) && Number(claim.scale) > 0 ? Number(claim.scale) : size / 300;
    const at = now();
    const id = session.addStroke(pts, at, MM.LOCAL_PARTICIPANT, scale, { content: true });
    session.propose({
      participantId: MM.LOCAL_PARTICIPANT,
      nodeId: id,
      edges: [],
      reps: [{ modality: PLANE_REP, data: { ...plane, scale }, confidence: 1, reasoning: plane.why }],
      at,
    });
    made.push(id);
    if (claim.why) session.answer({ participantId: MM.LOCAL_PARTICIPANT, question: 'why', text: String(claim.why), aboutIds: [id], at: now() });
  }
  if (!made.length) return { text: 'nothing drawn: ' + refused.join('; ') };
  await flush();
  const s = session.getState();
  const lines = made.map((id) => {
    const n = s.nodes.get(id);
    return `${id} → ${n ? (MM.topInterpretation(n) || 'unread') : '?'} on ${planeWord(planeOf(n))}`;
  });
  if (refused.length) lines.push('refused: ' + refused.join('; '));
  return { text: lines.join('\n') };
}

async function say(args) {
  const about = Array.isArray(args.about) ? args.about.map(String) : [];
  const id = session.answer({
    participantId: MM.LOCAL_PARTICIPANT,
    question: String(args.question || 'note'),
    text: String(args.text || ''),
    aboutIds: about,
    at: now(),
  });
  if (!id) return { text: 'not placed: none of ' + (about.join(', ') || '(no ids)') + ' is on the board' };
  await flush();
  return { text: id + ' said beside ' + about.join(', ') };
}

/**
 * A reply in the proposal contract, HELD on a solid and never blessed.
 *
 * It goes in through `propose()` — the same channel every held reading uses —
 * as a rep the human's side can take up or ignore. Taking it up from the
 * surface is G3's (the parts contract); until then this is a proposal on the
 * record, attributed and undoable, and the sentence beside the solid says so.
 */
async function proposeTree(args) {
  const s = session.getState();
  const wanted = String(args.solid || '');
  let node = s.nodes.get(wanted);
  if (!node) {
    for (const id of s.artifacts) {
      const n = s.nodes.get(id);
      if (n && !n.reps.some((x) => x.modality === 'erased') && MM.wordOf(n) === wanted) { node = n; break; }
    }
  }
  if (!node) return { text: `no solid “${wanted}” — space_look lists them by id and by name` };
  const reply = args.reply;
  if (!reply || typeof reply !== 'object') return { text: 'a proposal is the contract object: { steps?, profiles?, parts?, reuse? }' };
  const at = now();
  session.propose({
    participantId: MM.LOCAL_PARTICIPANT,
    nodeId: node.id,
    edges: [],
    reps: [{
      modality: 'proposal',
      data: { contract: 'shard-3d/proposal v1', reply },
      confidence: Math.max(0, Math.min(1, Number(args.confidence ?? 0.7))),
      reasoning: String(args.reasoning || `proposed by ${label(ME)}`),
    }],
    at,
  });
  const steps = Array.isArray(reply.steps) ? reply.steps.length : 0;
  const parts = Array.isArray(reply.parts) ? reply.parts.length : 0;
  session.answer({
    participantId: MM.LOCAL_PARTICIPANT,
    question: 'proposal',
    text: `${label(ME)} proposes ${steps ? `${steps} step${steps === 1 ? '' : 's'}` : ''}${steps && parts ? ' and ' : ''}${parts ? `${parts} part name${parts === 1 ? '' : 's'}` : ''}${!steps && !parts && reply.reuse ? `reusing “${reply.reuse}”` : ''} for ${MM.wordOf(node) || node.id} — held, not blessed`,
    aboutIds: [node.id],
    at: now(),
  });
  await flush();
  return { text: `held on ${node.id}${MM.wordOf(node) ? ` “${MM.wordOf(node)}”` : ''} — ${steps} step(s), ${parts} part name(s). Never blessed: the hand decides` };
}

async function answer(args) {
  const key = String(args.key || '');
  const waiting = parkedBriefs();
  const held = waiting.find((b) => b.key === key);
  if (!held) {
    return { text: waiting.length
      ? `no brief “${key}” is waiting. Waiting now: ${waiting.map((b) => b.key).join(', ')}`
      : `no brief “${key}” is waiting, and none is.` };
  }
  const refuse = args.refuse !== undefined && args.refuse !== null ? String(args.refuse).trim() : '';
  let text;
  if (refuse) text = JSON.stringify({ refuse });
  else if (typeof args.reply === 'string') text = args.reply;
  else if (args.reply && typeof args.reply === 'object') text = JSON.stringify(args.reply);
  else return { text: 'an answer is either "reply" (the contract object, or its JSON as a string) or "refuse" (one clause saying why)' };
  const id = session.answer({
    participantId: MM.LOCAL_PARTICIPANT,
    question: ANSWER_PREFIX + key,
    text,
    // In THIS hand's ids, read off the brief's own node — never carried across
    // from the hand that asked, whose id counters are its own.
    aboutIds: held.about,
    at: now(),
  });
  if (!id) return { text: `the marks brief ${key} was about are gone — nothing was sent` };
  await flush();
  return { text: refuse
    ? `brief ${key} refused: “${refuse}” — the human's status line will say so, and nothing was written`
    : `brief ${key} answered (${text.length} chars). The shard reads it exactly as it reads a model's reply: outside the vocabulary is dropped and counted, and the version is attributed to the seat` };
}

// ----- The tools ------------------------------------------------------------
const num = { type: 'number' };
const vec = { type: 'object', properties: { x: num, y: num, z: num } };
const TOOLS = [
  {
    name: 'space_look',
    description: 'What is in the 3D space, in words: the three named planes, every mark with what the shape rung reads it as and which plane it lies on (in that plane\'s own u, v), every solid with its op tree — step ids, ops, names and materials — and whether a brief is parked and waiting. Use the ids from here in the other tools.',
    inputSchema: { type: 'object', properties: {} },
    run: look,
  },
  {
    name: 'space_pending',
    description: 'The briefs a human has parked at the *Claude Code (MCP hand)* seat, each with its key, the words they typed, the contract to answer in and the brief itself. This is the seat: you are the model. Answer with space_answer.',
    inputSchema: { type: 'object', properties: {} },
    run: pending,
  },
  {
    name: 'space_answer',
    description: 'Answer a parked brief in the contract it carries — {steps, profiles} (and {parts} where the brief asks for them), or {reuse}. Pass the object as "reply". Refuse it with "refuse" and one clause saying why, and nothing is written. The shard applies your reply exactly as it applies a model\'s: everything outside its closed vocabulary is dropped and counted, and the version is held and attributed.',
    inputSchema: {
      type: 'object',
      required: ['key'],
      properties: { key: { type: 'string' }, reply: { type: 'object' }, refuse: { type: 'string' } },
    },
    run: answer,
  },
  {
    name: 'space_draw',
    description: 'Draw claims in the space. Each claim names a plane — "foundation", "height" or "width" (optionally "at": how far to slide it along its own normal first) — or gives "through" {x,y,z} and "facing" {x,y,z} for a view plane. Its outline is a shape the rung reads ({shape: "rectangle"|"circle"|"triangle", x, y, w, h}; {shape: "line"|"arrow", from, to}) or raw "points" in that plane\'s own (u, v). Marks are declared content, drawn in your colour, and read like anyone\'s. "why" is placed beside them.',
    inputSchema: {
      type: 'object',
      required: ['claims'],
      properties: {
        claims: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              shape: { type: 'string' },
              plane: { type: 'string', enum: ['foundation', 'height', 'width'] },
              at: num,
              through: vec,
              facing: vec,
              points: { type: 'array', items: { type: 'object', properties: { x: num, y: num } } },
              x: num, y: num, w: num, h: num,
              from: { type: 'object', properties: { x: num, y: num } },
              to: { type: 'object', properties: { x: num, y: num } },
              scale: num,
              why: { type: 'string' },
            },
          },
        },
      },
    },
    run: draw,
  },
  {
    name: 'space_propose',
    description: 'Offer a reply in the proposal contract for a solid nobody asked you about — by its id or its name. Held on the solid and attributed, never blessed, with a sentence beside it saying what you offered. To answer a brief the human actually typed, use space_answer instead.',
    inputSchema: {
      type: 'object',
      required: ['solid', 'reply'],
      properties: { solid: { type: 'string' }, reply: { type: 'object' }, confidence: num, reasoning: { type: 'string' } },
    },
    run: proposeTree,
  },
  {
    name: 'space_say',
    description: 'Place a sentence beside some marks or a solid: a card in the space, attributed to you, erasable by the hand. The human sees it in their status line as it lands.',
    inputSchema: {
      type: 'object',
      required: ['text', 'about'],
      properties: { text: { type: 'string' }, about: { type: 'array', items: { type: 'string' } }, question: { type: 'string' } },
    },
    run: say,
  },
];

// ----- MCP over stdio: newline-delimited JSON-RPC ----------------------------
const send = (msg) => process.stdout.write(JSON.stringify(msg) + '\n');
const contentOf = (out) => {
  const content = [];
  if (out.text) content.push({ type: 'text', text: out.text });
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
          serverInfo: { name: 'metamedium-3d', version: '0.1.0' },
          instructions: 'You are a hand in a MetaMedium 3D space, in room "' + ROOM + '" as "' + label(ME) +
            '". The human draws profiles on three named planes and from free views; the space reads each mark (shape, form, plane) and stands solids from what the drawing shares, with no model. You are also the SEAT: when the human types a brief at *Claude Code (MCP hand)*, it is parked here — space_pending gives you the brief and the contract, space_answer returns the reply, and the shard applies it exactly as it applies a small model\'s. Look first (space_look). You propose and never bless; you write no code that runs and cannot play anything. Answer in the contract you are given, name parts from the human\'s own words, and say plainly what you could not do rather than inventing geometry.',
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
          reply({ content: [{ type: 'text', text: String((err && err.message) || err) }], isError: true });
        }
        break;
      }
      default:
        fail(-32601, 'method not found: ' + msg.method);
    }
  } catch (err) {
    fail(-32603, String((err && err.message) || err));
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
log('metamedium-3d mcp: room ' + ROOM + ' as ' + label(ME) + ' via ' + RELAY);

// The engine's side of the performance baseline (V1-PLAN.md §9 R4a; PERF.md).
//
//     node --expose-gc metamedium-core/bench/engine.mjs board --size=500 --repeat=5
//     node --expose-gc metamedium-core/bench/engine.mjs board --size=2000 --repeat=2 --profile
//     node --expose-gc --max-old-space-size=65536 metamedium-core/bench/engine.mjs board --size=5000 --repeat=0 --strokes=20
//     node --expose-gc metamedium-core/bench/engine.mjs room --size=2000
//     node --expose-gc metamedium-core/bench/engine.mjs hello --size=2000
//
// Flags: --core=source|bundle (default source; the two are byte-identical at
// this commit, which lib.mjs checks can be shown), --seed=N, --repeat=N (warm
// loads after the cold one), --strokes=N (one more stroke, N times),
// --profile (a .cpuprofile of the measured section, not of the setup:
// the same V8 sampler as `node --cpu-prof`, started and stopped around it),
// --ablate=checkpoints (core built with checkpoints off — for attribution,
// never a default).
//
// What is timed, and what is not. Generating the board is setup and is never
// in a number. The cold load is the first `load` in the process — JIT and
// all — and is reported on its own; warm loads follow on fresh sessions after a
// full collection. A per-stroke number is one `addStroke` as a host calls it:
// readings, relations, words, wires, the scratch test, the clusters, the
// checkpoint when one falls due, and the state handed to subscribers.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import v8 from 'node:v8';
import { Session as Inspector } from 'node:inspector/promises';
import { loadCore, summarize, ms, mb, gc, heapUsed, machine, writeResult, args, OUT_DIR } from './lib.mjs';
import { generateBoard, extendBoard } from './board.mjs';

const PROF_DIR = join(OUT_DIR, 'prof');
const a = args();
const what = a._[0] || 'board';
const size = Number(a.size || 500);
const seed = Number(a.seed || 1);
const which = a.core || 'source';
const ablate = a.ablate || '';
const ABLATIONS = {
  checkpoints: [{ file: 'src/session/session.ts', find: 'const CHECKPOINT_EVERY = 200;', replace: 'const CHECKPOINT_EVERY = Number.MAX_SAFE_INTEGER;' }],
};
if (ablate && !ABLATIONS[ablate]) throw new Error(`unknown ablation "${ablate}" — ${Object.keys(ABLATIONS).join(', ')}`);
const { core, path } = await loadCore(which, ablate ? { patch: ABLATIONS[ablate], tag: ablate } : {});

const say = (s) => console.log(s);
const now = () => performance.now();

/** `--profile` profiles every section; `--profile=stroke,read` only those named. */
function wantProfile(name) {
  if (!a.profile) return false;
  if (a.profile === true) return true;
  return String(a.profile).split(',').some((p) => name.startsWith(p));
}
/** `--only=replay,read` runs only those sections of `board`; the cold load always runs. */
const only = (section) => !a.only || String(a.only).split(',').includes(section);

async function profiled(name, fn) {
  if (!wantProfile(name)) return fn();
  mkdirSync(PROF_DIR, { recursive: true });
  const s = new Inspector();
  s.connect();
  await s.post('Profiler.enable');
  await s.post('Profiler.setSamplingInterval', { interval: 1000 });
  await s.post('Profiler.start');
  let value, error;
  try { value = await fn(); } catch (e) { error = e; }
  const { profile } = await s.post('Profiler.stop');
  s.disconnect();
  const file = join(PROF_DIR, `${name}.cpuprofile`);
  writeFileSync(file, JSON.stringify(profile));
  say(`  profile → ${file}`);
  if (error) throw error;
  return value;
}

/** Exactly the session's own `markOf` (session.ts:1001), from outside. */
function markOf(st, id) {
  const n = st.nodes.get(id);
  const b = n && core.boundsOf(n);
  if (!n || !b) return null;
  const fp = core.fingerprintOf(n);
  return { id, bounds: b, points: core.strokePointsOf(n) ?? undefined, closed: fp ? fp.isClosed : undefined };
}

/** What the surface's `readRungs` reads (Demos/surface/08-render.js:78): loose marks plus artifacts' members. */
function rungIds(st) {
  const ids = st.contentIds.filter((id) => !st.artifacts.includes(id));
  for (const aid of st.artifacts) for (const e of st.nodes.get(aid).edges) if (e.rel === 'has-part') ids.push(e.to);
  return ids;
}

function header() {
  return {
    at: new Date().toISOString(),
    machine: machine(),
    loadavg: os.loadavg().map((x) => +x.toFixed(2)),
    heapLimitMB: Math.round(v8.getHeapStatistics().heap_size_limit / 1048576),
    core: which,
    corePath: path.replace(/^.*\/(MetaMedium[^/]*)\//, ''),
    ablate: ablate || null,
    seed,
  };
}

function boardSummary(stats) {
  return {
    marks: stats.marks,
    events: stats.events,
    types: stats.types,
    jsonMB: +(stats.bytes / 1048576).toFixed(2),
    pointsPerStroke: +stats.pointsPerStroke.toFixed(1),
    extent: stats.extent,
    writingShare: +(stats.writing / stats.marks).toFixed(2),
    words: stats.words,
    definitions: stats.definitions.length,
    texts: stats.texts.length,
    answers: stats.answers,
  };
}

// ===========================================================================
// board: replay, memory, relations, the whole-board read, one more stroke
// ===========================================================================

async function board() {
  const out = header();
  say(`board ${size} · core ${which}${ablate ? ' · ablation ' + ablate : ''} · heap limit ${out.heapLimitMB} MB · load ${out.loadavg.join(' ')}`);
  const { events, stats } = generateBoard(core, { marks: size, seed });
  out.board = boardSummary(stats);
  say(`  ${stats.marks} marks, ${stats.events} events, ${out.board.jsonMB} MB of JSON`);

  // --- replay: the cold load, measured with nothing else alive ---
  const base = heapUsed();
  let s = core.createSession();
  const t0 = now();
  await profiled(`replay-${size}${ablate ? '-' + ablate : ''}`, () => s.load(events));
  const cold = now() - t0;
  const heldBytes = heapUsed() - base;
  say(`  cold load ${ms(cold)} · held ${mb(heldBytes)}`);

  let st = s.getState();
  let edges = 0;
  const byRel = {};
  for (const n of st.nodes.values()) {
    edges += n.edges.length;
    for (const e of n.edges) byRel[e.rel] = (byRel[e.rel] || 0) + 1;
  }
  out.memory = {
    heldMB: +(heldBytes / 1048576).toFixed(1),
    maxRssMB: Math.round(process.resourceUsage().maxRSS / 1024),
    nodes: st.nodes.size,
    edges,
    edgesByRel: Object.fromEntries(Object.entries(byRel).sort((p, q) => q[1] - p[1])),
    checkpoints: Math.floor(events.length / 200),
  };
  out.state = {
    content: st.contentIds.length,
    artifacts: st.artifacts.length,
    live: st.live.length,
    explanations: st.explanations.length,
    clusterCandidates: st.clusterCandidates.length,
  };
  out.replay = { coldMs: cold };
  // A run of some sections only writes a file of its own, never over a full run's.
  const resultName = `engine-board-${size}-${which}${ablate ? '-' + ablate : ''}${a.only ? '.only-' + String(a.only).replace(/,/g, '-') : ''}.json`;
  writeResult(resultName, out);

  // --- warm loads, each on a fresh session after a full collection ---
  const warm = [];
  for (let i = 0; i < (only('replay') ? Number(a.repeat ?? 2) : 0); i++) {
    s = null;
    st = null;
    gc();
    s = core.createSession();
    const t = now();
    s.load(events);
    warm.push(now() - t);
    say(`  warm load ${i + 1}: ${ms(warm[warm.length - 1])}`);
  }
  out.replay = { coldMs: cold, warm: summarize(warm), warmMs: warm };
  writeResult(resultName, out);
  st = s.getState();

  // --- the state a subscriber is handed, alone ---
  const gs = [];
  for (let i = 0; i < 20; i++) { const t = now(); s.getState(); gs.push(now() - t); }
  out.getState = summarize(gs);

  // --- relations alone: every content mark against every other, as recomputeClusterCandidates does ---
  if (only('relations')) {
  const marks = st.contentIds.map((id) => markOf(st, id)).filter(Boolean);
  const rel = [];
  let relations = null;
  const relRepeat = size >= 5000 ? 1 : 3;
  for (let i = 0; i < relRepeat; i++) {
    relations = null;
    gc();
    const t = now();
    relations = core.relate(marks);
    rel.push(now() - t);
  }
  const kinds = {};
  for (const r of relations) kinds[r.kind] = (kinds[r.kind] || 0) + 1;
  const tc = now();
  const groups = core.clusters(marks, relations);
  const clusterMs = now() - tc;
  out.relations = {
    marks: marks.length,
    pairs: (marks.length * (marks.length - 1)) / 2,
    relations: relations.length,
    kinds: Object.fromEntries(Object.entries(kinds).sort((p, q) => q[1] - p[1])),
    relate: summarize(rel),
    clustersMs: clusterMs,
    clusters: groups.length,
  };
  say(`  relate over ${marks.length} marks: ${ms(out.relations.relate.median)} → ${relations.length} relations; clusters ${ms(clusterMs)}`);
  relations = null;
  writeResult(resultName, out);
  }

  // --- the whole-board read the surface runs after every stroke (readRungs) ---
  if (only('read')) {
  const ids = rungIds(st);
  const reads = [];
  const readRepeat = size >= 2000 ? 1 : 3;
  let reading = null;
  for (let i = 0; i < readRepeat; i++) {
    reading = null;
    gc();
    const t = now();
    reading = i === 0 ? await profiled(`read-${size}`, () => s.read(ids)) : s.read(ids);
    reads.push(now() - t);
  }
  out.read = { ids: ids.length, relations: reading.relations.length, concepts: reading.concepts.map((c) => c.concept), genre: reading.genre.genre, ...summarize(reads) };
  say(`  session.read(${ids.length}) ${ms(out.read.median)} (${reading.relations.length} relations, genre ${reading.genre.genre})`);
  reading = null;
  writeResult(resultName, out);
  }

  // --- what a model is handed: describeSession lists every stored relation of
  //     every mark it describes (participants/serialize.ts:88) — for a small
  //     group (agent.ts, 04-models.js briefFor) and for the whole board (the
  //     MCP hand's canvas_look with no ids, mcp.mjs:164) ---
  if (only('brief')) {
    const loose = st.contentIds.filter((id) => !st.artifacts.includes(id));
    const group = loose.slice(-5);
    let t = now();
    const small = core.describeSession(st, { nodeIds: group });
    const smallMs = now() - t;
    t = now();
    const whole = core.describeSession(st);
    const wholeMs = now() - t;
    out.brief = { groupMarks: group.length, groupChars: small.length, groupMs: smallMs, wholeMarks: loose.length, wholeChars: whole.length, wholeMs };
    say(`  a model's brief: ${group.length} marks → ${(small.length / 1024).toFixed(0)} KB; the whole board → ${(whole.length / 1048576).toFixed(1)} MB in ${ms(wholeMs)}`);
    writeResult(resultName, out);
  }

  // --- one more stroke at the end ---
  if (only('stroke')) {
  const perKind = {};
  const all = [];
  const nStrokes = Number(a.strokes || (size >= 5000 ? 20 : size >= 2000 ? 40 : 60));
  await profiled(`stroke-${size}`, () => extendBoard(core, s, {
    marks: nStrokes,
    onStroke: (kind, t) => {
      all.push(t);
      (perKind[kind] ??= []).push(t);
    },
  }));
  // The shape rung alone, for the same strokes — a board-independent floor.
  const evs = s.getEvents().filter((e) => e.type === 'stroke').slice(-all.length);
  const readings = [];
  for (const e of evs) { const t = now(); core.analyzeStroke(e.points, e.scale || 1); readings.push(now() - t); }
  out.stroke = {
    ...summarize(all),
    samples: all,
    byKind: Object.fromEntries(Object.entries(perKind).map(([k, v]) => [k, summarize(v)])),
    readingsAlone: summarize(readings),
  };
  say(`  one more stroke: median ${ms(out.stroke.median)}, p95 ${ms(out.stroke.p95)} (n ${all.length}); the shape rung alone ${ms(out.stroke.readingsAlone.median)}`);
  }

  const file = writeResult(resultName, out);
  say(`  → ${file}`);
}

// ===========================================================================
// room: one incoming line in a room of three hands, as the surface merged it
// before R4d — every log read, `myLogNow`, the whole room merged and loaded.
// The surface since R4d merges a line into a merge kept standing; `room.mjs`
// measures that, beside this path (`--path=before`), against the budgets.
// ===========================================================================

/** A transport on the hub that counts what goes through it and times what arrives. */
function metered(hub, tally) {
  const inner = hub.connect();
  return {
    send(line) {
      const bytes = JSON.stringify(line).length;
      tally.sent.lines++;
      tally.sent.bytes += bytes;
      if (line.via) { tally.sent.handedOn++; }
      tally.sent.byKind[line.hello ? 'hello' : line.full ? 'full' : 'append'] = (tally.sent.byKind[line.hello ? 'hello' : line.full ? 'full' : 'append'] || 0) + 1;
      tally.sent.lastBytes = bytes;
      return inner.send(line);
    },
    onMessage(fn) {
      return inner.onMessage((line) => {
        tally.received.lines++;
        tally.received.bytes += JSON.stringify(line).length;
        const t = now();
        fn(line);
        tally.received.ms.push(now() - t);
      });
    },
  };
}
const newTally = () => ({ sent: { lines: 0, bytes: 0, handedOn: 0, byKind: {} }, received: { lines: 0, bytes: 0, ms: [] }, notified: 0, notifiedWithEvents: 0 });
const settle = async () => { for (let i = 0; i < 4; i++) await new Promise((r) => setImmediate(r)); };

/**
 * The surface's `myLogNow` (Demos/surface/17-folder.js:283–289), verbatim in
 * effect: every loaded event stringified to find which of my previous events
 * are still present. Reproduced because it runs on every incoming line.
 */
function myLogNow(evs, loadedCount, myPrevious) {
  const present = new Set(evs.slice(0, loadedCount).map((e) => JSON.stringify(e)));
  const kept = myPrevious.filter((e) => present.has(JSON.stringify(e)));
  return kept.concat(evs.slice(loadedCount));
}

async function room() {
  const out = header();
  const hands = ['ada~r4a1', 'ben~r4a2', 'cy~r4a3'];
  say(`room of ${hands.length} hands holding a ${size}-mark board · core ${which} · load ${out.loadavg.join(' ')}`);
  const { logs, stats } = generateBoard(core, { marks: size, seed, hands });
  out.board = boardSummary(stats);
  out.board.perHand = Object.fromEntries(hands.map((h) => [h, logs[h].length]));

  const hub = new core.LocalHub();
  const tallies = hands.map(() => newTally());
  const stores = hands.map((h, i) => new core.LiveStore(metered(hub, tallies[i]), h, 'r4a', { sitting: `sit-${i}` }));
  stores.forEach((st, i) => st.subscribe((_, evs) => { tallies[i].notified++; if (evs.length) tallies[i].notifiedWithEvents++; }));
  for (let i = 0; i < hands.length; i++) await stores[i].publish(logs[hands[i]]);
  await settle();
  const [A, B] = stores;

  // A's board, as the surface opens a room: my log, the room's logs, merged and loaded.
  const mine = logs[hands[0]].slice();
  const merged0 = core.mergeLogs({ ...(await A.readLogs()), [A.me]: mine }, { me: A.me });
  gc();
  const s = core.createSession();
  s.setLogName(A.me);
  const tl = now();
  await profiled(`room-replay-${size}`, () => s.load(merged0));
  const replayMs = now() - tl;
  say(`  A loads the room: ${merged0.length} events in ${ms(replayMs)} — and loads it again after every line (mergeLive → session.load)`);
  const evs = s.getEvents();
  const loadedCount = evs.length;
  const myPrevious = mine;
  A.notices(); // what is already held has been said

  // B draws one more stroke, k times; each is one incoming line at A.
  const k = Number(a.lines || 12);
  const notifiedBefore = tallies[0].notified;
  const samples = { receive: [], readLogs: [], myLogNow: [], mergeLogs: [], notices: [], withoutNotices: [], withNotices: [] };
  let bLog = logs[hands[1]].slice();
  const lastB = [...bLog].reverse().find((e) => e.type === 'stroke');
  for (let i = 0; i < k; i++) {
    const seq = bLog[bLog.length - 1].seq + 1;
    const ev = { type: 'stroke', points: lastB.points.map((p) => ({ x: p.x + 900 + i * 40, y: p.y })), at: bLog[bLog.length - 1].at + 1500, scale: 1, origin: hands[1], seq };
    bLog = bLog.concat([ev]);
    const r0 = tallies[0].received.ms.length;
    await B.publish(bLog);
    await settle();
    const receive = tallies[0].received.ms.slice(r0).reduce((x, y) => x + y, 0);
    // What mergeLive does next (17-folder.js:190–210), step by step — all but the load.
    let t = now();
    const logsNow = await A.readLogs();
    const tRead = now() - t;
    t = now();
    const mineNow = myLogNow(evs, loadedCount, myPrevious);
    const tMine = now() - t;
    t = now();
    core.mergeLogs({ ...logsNow, [A.me]: mineNow }, { me: A.me });
    const tMerge = now() - t;
    t = now();
    A.notices();
    const tNotices = now() - t;
    samples.receive.push(receive);
    samples.readLogs.push(tRead);
    samples.myLogNow.push(tMine);
    samples.mergeLogs.push(tMerge);
    samples.notices.push(tNotices);
    samples.withoutNotices.push(receive + tRead + tMine + tMerge);
    samples.withNotices.push(receive + tRead + tMine + tMerge + tNotices);
  }
  out.line = Object.fromEntries(Object.entries(samples).map(([key, v]) => [key, summarize(v)]));
  out.line.replayMs = replayMs;
  out.line.mergedEvents = merged0.length;
  out.line.notifiedPerLine = (tallies[0].notified - notifiedBefore) / k;
  say(`  one incoming line at A: receive ${ms(out.line.receive.median)} · readLogs ${ms(out.line.readLogs.median)} · myLogNow ${ms(out.line.myLogNow.median)} · mergeLogs ${ms(out.line.mergeLogs.median)} · notices() ${ms(out.line.notices.median)}`);
  say(`  merge work without notices() ${ms(out.line.withoutNotices.median)} (p95 ${ms(out.line.withoutNotices.p95)}), with ${ms(out.line.withNotices.median)} (p95 ${ms(out.line.withNotices.p95)}); then a replay of ${ms(replayMs)}`);
  const file = writeResult(`engine-room-${size}-${which}.json`, out);
  say(`  → ${file}`);
}

// ===========================================================================
// hello: what a newcomer's hello costs the room, in rooms of three and six
// ===========================================================================

async function hello() {
  const out = header();
  out.rooms = {};
  for (const k of (a.rooms ? String(a.rooms).split(',').map(Number) : [3, 6])) {
    const present = Array.from({ length: k - 1 }, (_, i) => `hand${i}~r4a`);
    const { logs, stats } = generateBoard(core, { marks: size, seed, hands: present });
    const hub = new core.LocalHub();
    const tallies = present.map(() => newTally());
    const stores = present.map((h, i) => new core.LiveStore(metered(hub, tallies[i]), h, 'r4a', { sitting: `sit-${i}` }));
    stores.forEach((st, i) => st.subscribe((_, evs) => {
      tallies[i].notified++;
      if (evs.length) tallies[i].notifiedWithEvents++;
      // Since R4d a surface merges only on a notify whose line changed a log (the store's revision moved).
      const rev = typeof st.revision === 'function' ? st.revision() : null;
      if (rev === null || rev !== tallies[i].lastRevision) tallies[i].changedALog = (tallies[i].changedALog || 0) + 1;
      tallies[i].lastRevision = rev;
    }));
    for (let i = 0; i < present.length; i++) await stores[i].publish(logs[present[i]]);
    await settle();
    // Count from here: the newcomer's arrival only.
    for (let i = 0; i < tallies.length; i++) Object.assign(tallies[i], newTally(), { changedALog: 0, lastRevision: typeof stores[i].revision === 'function' ? stores[i].revision() : null });
    const nt = newTally();
    const newcomer = new core.LiveStore(metered(hub, nt), 'newcomer~r4a', 'r4a', { sitting: 'sit-new' });
    newcomer.subscribe((_, evs) => { nt.notified++; if (evs.length) nt.notifiedWithEvents++; });
    const t0 = now();
    await newcomer.publish([]); // what openLive does first: my log (empty), whole
    newcomer.hello();
    await settle();
    const wall = now() - t0;
    const answered = tallies.reduce((acc, t) => ({ lines: acc.lines + t.sent.lines, bytes: acc.bytes + t.sent.bytes }), { lines: 0, bytes: 0 });
    const deliveredBytes = answered.bytes * (k - 1); // every line reaches every other member
    const peerNotified = tallies.map((t) => t.notified);
    const peerNotifiedWithEvents = tallies.map((t) => t.notifiedWithEvents);
    const peerChangedALog = tallies.map((t) => t.changedALog || 0);
    const newcomerLogs = await newcomer.readLogs();
    out.rooms[k] = {
      hands: k,
      boardMarks: stats.marks,
      boardJsonMB: +(stats.bytes / 1048576).toFixed(2),
      answerLines: answered.lines,
      answerMB: +(answered.bytes / 1048576).toFixed(2),
      deliveredMB: +(deliveredBytes / 1048576).toFixed(2),
      newcomerReceivedLines: nt.received.lines,
      newcomerReceiveMs: nt.received.ms.reduce((x, y) => x + y, 0),
      newcomerHolds: Object.fromEntries(Object.entries(newcomerLogs).map(([n, l]) => [n, l.length])),
      peerLinesReceived: tallies.map((t) => t.received.lines),
      // The surface's subscriber runs mergeLive — a full re-merge and replay —
      // on EVERY notify (17-folder.js, openLive), events or not. Over a
      // BroadcastChannel or a relay each line is its own task, so each is one.
      peerNotified: peerNotified,
      peerNotifiedWithEvents,
      peerChangedALog,
      newcomerNotified: nt.notified,
      wallMs: wall,
    };
    const r = out.rooms[k];
    say(`  room of ${k}: the hello is answered with ${r.answerLines} lines, ${r.answerMB} MB sent, ${r.deliveredMB} MB delivered; each peer hears ${Math.max(...r.peerLinesReceived)} lines and is notified ${Math.max(...peerNotified)} times (${Math.max(...peerNotifiedWithEvents)} with events, ${Math.max(...peerChangedALog)} that changed a log) — before R4d the surface re-merged and replayed the board on every notify, since only on one that changed a log; the newcomer is notified ${nt.notified} times`);
  }
  const file = writeResult(`engine-hello-${size}-${which}.json`, out);
  say(`  → ${file}`);
}

// ===========================================================================
// build: the board drawn event by event through the session's own API —
// the way a hand makes it — timing every event, so the cost of a stroke is
// read as the board grows, with progress, and a run that cannot finish still
// says how far it got. It must write the very log it is given: checked.
// ===========================================================================

function applyViaApi(s, ev) {
  switch (ev.type) {
    case 'join': return s.join(ev.kind, ev.name, ev.at, ev.capability, ev.locality);
    case 'stroke': return s.addStroke(ev.points, ev.at, ev.participantId, ev.scale, ev.content ? { content: true } : undefined);
    case 'summon': return ev.ids ? s.summonMarks(ev.ids, ev.at) : s.summonHeld(ev.at);
    case 'bless': return s.bless({ summonId: ev.summonId, name: ev.name, suggestionId: ev.suggestionId, at: ev.at, participantId: ev.participantId });
    case 'propose': return s.propose({ participantId: ev.participantId, nodeId: ev.nodeId, edges: ev.edges, reps: ev.reps, at: ev.at });
    case 'code': return s.attachCode({ participantId: ev.participantId, nodeId: ev.nodeId, code: ev.code, language: ev.language, kind: ev.kind, prompt: ev.prompt, fill: ev.fill, from: ev.from, at: ev.at });
    case 'deselect': return s.deselect(ev.at);
    case 'answer': return s.answer({ participantId: ev.participantId, question: ev.question, text: ev.text, aboutIds: ev.aboutIds, at: ev.at });
    case 'move': return s.move({ ids: ev.ids, dx: ev.dx, dy: ev.dy, at: ev.at });
    case 'dismiss': return s.dismiss(ev.summonId, ev.at);
    case 'snap': return s.snap({ ids: ev.ids, mode: ev.mode, at: ev.at });
    default: throw new Error(`the build cannot draw a "${ev.type}" event`);
  }
}

async function build() {
  const out = header();
  const every = Number(a.every || 250);
  say(`build ${size}, event by event · core ${which} · heap limit ${out.heapLimitMB} MB · load ${out.loadavg.join(' ')}`);
  const { events, stats } = generateBoard(core, { marks: size, seed });
  out.board = boardSummary(stats);
  const resultName = `engine-build-${size}-${which}.json`;
  const base = heapUsed();
  const s = core.createSession({ ...core.DEFAULT_SESSION_CONFIG, logName: 'local' });
  out.curve = [];
  let win = [];
  let strokes = 0, other = 0, otherMs = 0;
  const t0 = now();
  for (const ev of events) {
    const t = now();
    applyViaApi(s, ev);
    const dt = now() - t;
    if (ev.type !== 'stroke') { other++; otherMs += dt; continue; }
    strokes++;
    win.push(dt);
    if (strokes % every === 0 || strokes === stats.marks) {
      const row = { strokes, content: s.getState().contentIds.length, elapsedS: +((now() - t0) / 1000).toFixed(1), ...summarize(win) };
      delete row.n;
      out.curve.push(row);
      win = [];
      say(`  ${String(strokes).padStart(5)} strokes · ${String(row.elapsedS).padStart(7)} s so far · this stretch: median ${ms(row.median)}, p95 ${ms(row.p95)}, max ${ms(row.max)}`);
      writeResult(resultName, out);
    }
  }
  out.totalMs = now() - t0;
  out.otherEvents = { n: other, ms: otherMs };
  // The log it wrote must be the log it was given, event for event.
  // Compared as canonical JSON: a call's argument order decides an event's key
  // order (attachCode's arguments are spread into it), which is not a difference.
  const canon = (v) => (v === null || typeof v !== 'object') ? JSON.stringify(v) ?? 'null'
    : Array.isArray(v) ? '[' + v.map(canon).join(',') + ']'
    : '{' + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  const wrote = s.getEvents();
  let same = wrote.length === events.length;
  let firstDiff = -1;
  for (let i = 0; same && i < events.length; i++) {
    if (canon(wrote[i]) !== canon(events[i])) { same = false; firstDiff = i; }
  }
  if (!same) say(`  first difference at event ${firstDiff}: wrote ${canon(wrote[firstDiff]).slice(0, 200)} · given ${canon(events[firstDiff]).slice(0, 200)}`);
  out.sameLog = same;
  say(`  drawn in ${ms(out.totalMs)}; the log written ${same ? 'is' : 'is NOT'} the log given`);
  const heldBytes = heapUsed() - base;
  const st = s.getState();
  let edges = 0;
  for (const n of st.nodes.values()) edges += n.edges.length;
  out.memory = { heldMB: +(heldBytes / 1048576).toFixed(1), maxRssMB: Math.round(process.resourceUsage().maxRSS / 1024), nodes: st.nodes.size, edges, checkpoints: Math.floor(events.length / 200) };
  say(`  held ${mb(heldBytes)} · ${st.nodes.size} nodes, ${edges} edges · max RSS ${out.memory.maxRssMB} MB`);
  writeResult(resultName, out);

  // The whole board, as `board` measures it.
  const marks = st.contentIds.map((id) => markOf(st, id)).filter(Boolean);
  gc();
  let t = now();
  let relations = core.relate(marks);
  out.relations = { marks: marks.length, relations: relations.length, ms: now() - t };
  relations = null;
  say(`  relate over ${marks.length} marks: ${ms(out.relations.ms)} → ${out.relations.relations} relations`);
  writeResult(resultName, out);
  const ids = rungIds(st);
  gc();
  t = now();
  const reading = await profiled(`read-${size}`, () => s.read(ids));
  out.read = { ids: ids.length, relations: reading.relations.length, ms: now() - t };
  say(`  session.read(${ids.length}) ${ms(out.read.ms)}`);
  writeResult(resultName, out);
  const all = [], perKind = {};
  await profiled(`stroke-${size}`, () => extendBoard(core, s, {
    marks: Number(a.strokes || 20),
    onStroke: (kind, dt) => { all.push(dt); (perKind[kind] ??= []).push(dt); },
  }));
  out.stroke = { ...summarize(all), samples: all, byKind: Object.fromEntries(Object.entries(perKind).map(([k, v]) => [k, summarize(v)])) };
  say(`  one more stroke: median ${ms(out.stroke.median)}, p95 ${ms(out.stroke.p95)} (n ${all.length})`);
  const file = writeResult(resultName, out);
  say(`  → ${file}`);
}

// ===========================================================================
// relate: relations over every pair of the whole content plane, alone — what
// recomputeClusterCandidates hands relate() on every event once a definition
// exists — measured on the board's own content plane, gathered from the
// diagrams it was drawn in, so no replay is needed (board.mjs, collectMarks).
// ===========================================================================

async function relateOnly() {
  const out = header();
  const { stats, contentMarks } = generateBoard(core, { marks: size, seed, collectMarks: true });
  out.board = boardSummary(stats);
  const marks = contentMarks;
  const times = [];
  let relations = null;
  let bytes = 0;
  for (let i = 0; i < Number(a.repeat || 3); i++) {
    relations = null;
    const before = heapUsed();
    const t = now();
    relations = core.relate(marks);
    times.push(now() - t);
    bytes = heapUsed() - before;
  }
  const kinds = {};
  for (const r of relations) kinds[r.kind] = (kinds[r.kind] || 0) + 1;
  const t = now();
  const groups = core.clusters(marks, relations);
  out.relations = {
    marks: marks.length,
    pairs: (marks.length * (marks.length - 1)) / 2,
    relations: relations.length,
    heldMB: +(bytes / 1048576).toFixed(1),
    kinds: Object.fromEntries(Object.entries(kinds).sort((p, q) => q[1] - p[1])),
    relate: summarize(times),
    clustersMs: now() - t,
    clusters: groups.length,
  };
  say(`relate over the ${size}-mark board's content plane (${marks.length} marks, ${Math.round(out.relations.pairs).toLocaleString('en-GB')} pairs): median ${ms(out.relations.relate.median)} of ${times.length} → ${relations.length.toLocaleString('en-GB')} relations, ${out.relations.heldMB} MB; clusters ${ms(out.relations.clustersMs)}`);
  relations = null;
  writeResult(`engine-relate-${size}-${which}.json`, out);

  // --read: the whole-board read the surface's readRungs runs after every
  // stroke — session.read's body (session.ts:2426–2459), line for line, over
  // the same marks, from the same core functions, with no session to replay.
  if (a.read) {
    const { readInputs } = generateBoard(core, { marks: size, seed, collectMarks: true });
    gc();
    const t0 = now();
    const rmarks = readInputs.map((x) => x.mark);
    const rel = core.relate(rmarks);
    const shapes = {}, shapeConfidence = {}, names = {}, transcripts = {}, wires = {};
    for (const x of readInputs) {
      shapes[x.mark.id] = x.shape;
      shapeConfidence[x.mark.id] = x.confidence;
      if (x.name) names[x.mark.id] = x.name;
      if (x.transcript) transcripts[x.mark.id] = x.transcript;
      if (x.wire) wires[x.mark.id] = x.wire;
    }
    const scopeIds = rmarks.map((m) => m.id);
    const tr = now();
    const roles = await profiled(`read-${size}-no-replay`, () => core.assignRoles({ ids: scopeIds, shapes, shapeConfidence, relations: rel, wires }));
    const rolesMs = now() - tr;
    const genre = core.genreOf(roles);
    const scope = { ids: scopeIds, marks: rmarks, relations: rel, shapes, names, transcripts, roles };
    const concepts = core.matchConcepts(scope);
    out.read = { ids: scopeIds.length, relations: rel.length, genre: genre.genre, concepts: concepts.map((c) => c.concept), ms: now() - t0, assignRolesMs: rolesMs };
    say(`  the whole-board read (session.read's body): ${scopeIds.length} marks, ${rel.length.toLocaleString('en-GB')} relations, ${ms(out.read.ms)} (assignRoles ${ms(rolesMs)}), genre ${genre.genre}`);
  }
  const file = writeResult(`engine-relate-${size}-${which}.json`, out);
  say(`  → ${file}`);
}

const run = { board, room, hello, build, relate: relateOnly }[what];
if (!run) {
  console.error(`unknown measurement "${what}" — board, build, relate, room or hello`);
  process.exit(2);
}
await run();

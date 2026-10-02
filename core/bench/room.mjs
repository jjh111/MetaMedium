// A live room measured against PERF.md's room budgets (V1-PLAN.md §9 R4d) —
// the measuring half of `room.test.mjs`, which runs this in a process of its
// own and holds the numbers to the budgets:
//
//   - one incoming line costs ≤ 16 ms of main-thread work, with no full
//     replay, on the 2,000-mark board in a room of three hands; a line that
//     lands before events already applied replays from the nearest
//     checkpoint, not from zero — one that crosses a mark this hand drew a
//     moment before (two hands drawing at once) within the 16 ms too; and a
//     line with no events does no work;
//   - a newcomer's hello delivers at most one copy of each log, in rooms of
//     three and six — with a hand that left, and one that vanished without a
//     word — and the newcomer ends with exactly the logs the room holds.
//
//     node --expose-gc core/bench/room.mjs --size=2000
//     node --expose-gc core/bench/room.mjs --size=2000 --path=before   # the surface before R4d
//
// What "the line" is: what the surface runs when its store says a line landed
// (Demos/surface/17-folder.js, `mergeLive`), in the order it runs it — the
// store taking the line, the merge, the session applying it, what the room
// says about itself — and, reported beside it, the save the change schedules
// (`saveNow`, 300 ms later). Not the paint: drawing what changed is R4c's.
// The board is `generateBoard` split between the hands, as `engine.mjs room`
// measured it; generating it is setup and in no number.

import os from 'node:os';
import { loadCore, summarize, ms, gc, machine, writeResult, args } from './lib.mjs';
import { generateBoard } from './board.mjs';

const a = args();
const size = Number(a.size || 2000);
const seed = Number(a.seed || 1);
const which = a.core || 'source';
const nLines = Number(a.lines || 16);
const say = (s) => process.stderr.write(s + '\n');
const now = () => performance.now();
const settle = async () => { for (let i = 0; i < 4; i++) await new Promise((r) => setImmediate(r)); };
const sleep = (t) => new Promise((r) => setTimeout(r, t));

const { core, path } = await loadCore(which);

// ===========================================================================
// The paths: what a surface runs per line.
// ===========================================================================

/**
 * The surface before R4d, step for step (17-folder.js at e1f5349): every
 * notify of the store — events or not — reads every log, finds this hand's
 * own by serialising every loaded event (`myLogNow`), merges the whole room
 * and loads it: a replay from zero.
 */
const before = {
  label: 'the whole log merged and replayed on every line (before R4d)',
  join(r) {
    const logs = Object.fromEntries(Object.entries(r.store._peek()).map(([k, v]) => [k, v.slice()]));
    const merged = core.mergeLogs(logs, { me: r.me });
    r.myPrevious = (logs[r.me] || []).slice();
    r.session.load(merged);
    r.loadedCount = r.session.getEvents().length;
  },
  async line(r) {
    const logs = await r.store.readLogs();
    const mine = myLogNow(r);
    const merged = core.mergeLogs({ ...logs, [r.me]: mine }, { me: r.me });
    r.session.load(merged);
    r.myPrevious = mine;
    r.loadedCount = merged.length;
    r.store.notices();
  },
  async save(r) {
    await r.store.publish(myLogNow(r));
  },
};

function myLogNow(r) {
  const evs = r.session.getEvents();
  r.loadedCount = Math.min(r.loadedCount, evs.length);
  const present = new Set(evs.slice(0, r.loadedCount).map((e) => JSON.stringify(e)));
  const kept = r.myPrevious.filter((e) => present.has(JSON.stringify(e)));
  return kept.concat(evs.slice(r.loadedCount));
}

/**
 * The surface since R4d: the room merged and loaded once as it opens, then a
 * `LiveMerge` holds the merge between lines. On a notify the store says
 * whether a log changed (`revision`); only then is the merge brought up to the
 * logs as held (`heldLogs`), and the session is handed what changed — applied
 * when it falls after everything held, replayed from the nearest checkpoint
 * when it falls before. The save publishes `ownLog`: no event serialised.
 */
const live = {
  label: 'the merge kept standing, a line applied (R4d)',
  join(r) {
    const logs = Object.fromEntries(Object.entries(r.store.heldLogs()).map(([k, v]) => [k, v.slice()]));
    r.session.load(core.mergeLogs(logs, { me: r.me }));
    r.merge = new core.LiveMerge(r.session, r.me);
    r.merge.sync(r.store.heldLogs());
    r.revision = r.store.revision();
  },
  async line(r) {
    const rev = r.store.revision();
    r.store.notices();
    if (rev === r.revision) return;
    r.revision = rev;
    r.report = r.merge.sync(r.store.heldLogs());
  },
  async save(r) {
    await r.store.publish(r.store.ownLog(r.session.getEvents()));
  },
};

const PATHS = { before, live };
/** What the surface runs now. */
const SURFACE = 'live';
const pathName = a.path || SURFACE;
const P = PATHS[pathName];
if (!P) throw new Error(`unknown path "${pathName}" — ${Object.keys(PATHS).join(', ')}`);

// ===========================================================================
// The session, watched: what each line asked of it.
// ===========================================================================

/** Wrap the session's whole-board and part-board entry points, so a line says whether it replayed, and from where. */
function watch(session) {
  const seen = [];
  const load = session.load.bind(session);
  session.load = (events) => { seen.push({ how: 'load', from: 0, events: events.length }); return load(events); };
  if (typeof session.rebase === 'function') {
    const rebase = session.rebase.bind(session);
    session.rebase = (keep, tail) => {
      const out = rebase(keep, tail);
      seen.push({ how: 'rebase', keep, tail: tail.length, from: out && typeof out.from === 'number' ? out.from : null, replayed: out ? out.replayed : null });
      return out;
    };
  }
  let notified = 0;
  session.subscribe(() => { notified++; });
  return { seen, notified: () => notified, take: () => seen.splice(0) };
}

/** A transport on the hub that times what arrives, and counts what goes through it. */
function metered(hub, tally) {
  const inner = hub.connect();
  return {
    send(line) {
      tally.sent.push({ participant: line.participant, full: !!line.full, via: line.via || null, hello: !!line.hello, bytes: JSON.stringify(line).length, events: line.events ? line.events.length : 0 });
      return inner.send(line);
    },
    onMessage(fn) {
      return inner.onMessage((line) => {
        const t = now();
        fn(line);
        tally.receiveMs.push(now() - t);
        tally.received.push({ participant: line.participant || '', full: !!line.full, via: line.via || null, hello: !!line.hello, bye: !!line.bye, bytes: JSON.stringify(line).length, events: line.events ? line.events.length : 0 });
      });
    },
    close() {},
  };
}
const tally = () => ({ sent: [], received: [], receiveMs: [] });

// ===========================================================================
// One incoming line, in a room of three.
// ===========================================================================

async function lines() {
  const hands = ['ada~r4d1', 'ben~r4d2', 'cy~r4d3'];
  const { logs, stats } = generateBoard(core, { marks: size, seed, hands });
  const hub = new core.LocalHub();
  const tallies = hands.map(() => tally());
  const stores = hands.map((h, i) => new core.LiveStore(metered(hub, tallies[i]), h, 'r4d', { sitting: `sit-${i}` }));
  for (let i = 0; i < hands.length; i++) await stores[i].publish(logs[hands[i]]);
  await settle();
  const [A, B] = stores;

  // A's board, opened as the surface opens a room.
  const session = core.createSession({ ...core.DEFAULT_SESSION_CONFIG, logName: A.me });
  const reader = { session, store: A, me: A.me };
  const t0 = now();
  P.join(reader);
  const joinMs = now() - t0;
  const w = watch(session);
  A.notices();
  const events0 = session.getEvents().length;
  say(`  ${stats.marks} marks, ${events0} events in the room; A opens it in ${ms(joinMs)} (not a line)`);

  const bLog = logs[hands[1]].slice();
  const lastB = [...bLog].reverse().find((e) => e.type === 'stroke');
  let lastAt = Math.max(...session.getEvents().map((e) => e.at || 0));
  const strokeBy = (at, dx) => ({
    type: 'stroke',
    points: lastB.points.map((p) => ({ x: p.x + dx, y: p.y + 700 })),
    at, scale: 1, origin: hands[1], seq: bLog[bLog.length - 1].seq + 1,
  });

  /** B draws; the line reaches A; A does what its surface does. Timed from the line's arrival to the room's last word. */
  async function oneLine(at, dx) {
    bLog.push(strokeBy(at, dx));
    const r0 = tallies[0].receiveMs.length;
    await B.publish(bLog);
    await settle();
    const receive = tallies[0].receiveMs.slice(r0).reduce((x, y) => x + y, 0);
    w.take();
    const t = now();
    await P.line(reader);
    const work = now() - t;
    const asked = w.take();
    const t2 = now();
    await P.save(reader);
    const saveMs = now() - t2;
    return { ms: receive + work, receive, work, saveMs, asked };
  }

  // In order: each line's stroke comes after everything the board holds.
  const inOrder = [];
  for (let i = 0; i < nLines; i++) {
    lastAt += 1500;
    gc();
    inOrder.push(await oneLine(lastAt, 900 + i * 40));
  }
  // Crossing: A draws, and B's line arrives with a stroke B drew a moment
  // before A's — two hands drawing at once, a line in flight while the other
  // drew. The commonest line that lands before events already applied.
  const crossing = [];
  const aStroke = [...logs[hands[0]]].reverse().find((e) => e.type === 'stroke');
  for (let i = 0; i < 8; i++) {
    lastAt += 1500;
    session.addStroke(aStroke.points.map((p) => ({ x: p.x + 900 + i * 40, y: p.y + 1400 })), lastAt, undefined, 1);
    await P.save(reader);
    gc();
    crossing.push(await oneLine(lastAt - 40, 3000 + i * 40));
  }
  // Out of order among the other hands: B's clock is behind by more, so its
  // stroke belongs before lines already merged.
  const evsAt = () => session.getEvents().map((e) => e.at || 0);
  const outOfOrder = [];
  for (const back of [3, 30, 150]) {
    const ats = evsAt();
    const at = ats[ats.length - back] - 1;
    gc();
    const r = await oneLine(at, 2400 + back);
    r.back = back;
    outOfOrder.push(r);
  }
  // Lines with no events: a newcomer's hello, the relay's word that it forgot,
  // a hand leaving, and a whole log the reader already holds.
  const quiet = [];
  const probe = async (label, send) => {
    w.take();
    const n0 = w.notified();
    const r0 = tallies[0].receiveMs.length;
    await send();
    await settle();
    const receive = tallies[0].receiveMs.slice(r0).reduce((x, y) => x + y, 0);
    const t = now();
    await P.line(reader);
    const work = now() - t;
    quiet.push({ label, ms: receive + work, work, asked: w.take(), notified: w.notified() - n0 });
  };
  const late = new core.LiveStore(hub.connect(), 'dee~r4d4', 'r4d', { sitting: 'sit-late' });
  await probe('a hello', async () => { late.hello(); });
  await probe('the relay says it forgot', async () => { A._deliver({ relay: 'truncated', room: 'r4d', dropped: 3, kept: 10 }); });
  await probe('a whole log already held', async () => { A._deliver({ participant: B.me, events: bLog.slice(), at: Date.now() + 60000, full: true, sid: B.sitting }); });

  const perLine = summarize(inOrder.map((l) => l.ms));
  const out = {
    lines: {
      n: inOrder.length,
      perLine,
      receive: summarize(inOrder.map((l) => l.receive)),
      work: summarize(inOrder.map((l) => l.work)),
      save: summarize(inOrder.map((l) => l.saveMs)),
      replayedFromZero: inOrder.some((l) => l.asked.some((x) => x.how === 'load')),
      asked: inOrder.slice(0, 3).map((l) => l.asked),
    },
    crossing: {
      n: crossing.length,
      perLine: summarize(crossing.map((l) => l.ms)),
      replayedFromZero: crossing.some((l) => l.asked.some((x) => x.how === 'load' || x.from === 0)),
      asked: crossing.slice(0, 3).map((l) => l.asked),
    },
    outOfOrder: outOfOrder.map((l) => ({ back: l.back, ms: l.ms, asked: l.asked, replayedFromZero: l.asked.some((x) => x.how === 'load' || x.from === 0) })),
    quiet: quiet.map((q) => ({ label: q.label, ms: q.ms, touched: q.asked.length > 0 || q.notified > 0, asked: q.asked })),
    events: events0,
    marks: stats.marks,
  };
  say(`  one line in order (n ${out.lines.n}): median ${ms(perLine.median)}, p95 ${ms(perLine.p95)} — the store ${ms(out.lines.receive.median)}, the merge and apply ${ms(out.lines.work.median)}; ${out.lines.replayedFromZero ? 'a replay from zero every line' : 'no replay'}; the save it schedules ${ms(out.lines.save.median)}`);
  say(`  a line crossing a mark this hand just drew (n ${out.crossing.n}): median ${ms(out.crossing.perLine.median)}, p95 ${ms(out.crossing.perLine.p95)} — ${out.crossing.replayedFromZero ? 'replayed from zero' : 'from the checkpoint at ' + (out.crossing.asked[0] && out.crossing.asked[0][0] ? out.crossing.asked[0][0].from : '?') + ', …'}`);
  for (const l of out.outOfOrder) say(`  a line ${l.back} events back: ${ms(l.ms)} — ${l.replayedFromZero ? 'replayed from zero' : 'from the checkpoint at ' + (l.asked[0] ? l.asked[0].from : '?')}`);
  for (const q of out.quiet) say(`  ${q.label}: ${ms(q.ms)} — ${q.touched ? 'the board was touched' : 'no work'}`);
  for (const s of stores) s.close();
  late.close();
  return out;
}

// ===========================================================================
// A newcomer's hello.
// ===========================================================================

async function hello(k, { left = 0, vanished = 0 } = {}) {
  const present = Array.from({ length: k - 1 }, (_, i) => `hand${i}~r4d`);
  const { logs } = generateBoard(core, { marks: size, seed, hands: present });
  const hub = new core.LocalHub();
  const tallies = present.map(() => tally());
  const stores = present.map((h, i) => new core.LiveStore(metered(hub, tallies[i]), h, 'r4d', { sitting: `sit-${i}` }));
  for (let i = 0; i < present.length; i++) await stores[i].publish(logs[present[i]]);
  await settle();
  // Some go: a hand that leaves says so as it closes its store; one that
  // vanishes (a tab killed, a process gone) says nothing.
  for (let i = 0; i < left; i++) stores[i].close();
  for (let i = left; i < left + vanished; i++) stores[i]._vanish();
  await settle();
  for (const t of tallies) Object.assign(t, tally());
  const nt = tally();
  const newcomer = new core.LiveStore(metered(hub, nt), 'newcomer~r4d', 'r4d', { sitting: 'sit-new' });
  const t0 = now();
  await newcomer.publish([]);
  newcomer.hello();
  await settle();
  // A copy of a log whose writer cannot answer goes after a wait for the
  // writer's own answer; give every wait time to run out.
  const wait = (core.COVER_WAIT_MS ?? 0) + (core.COVER_STAGGER_MS ?? 0) * (k + 1) + 300;
  await sleep(wait);
  await settle();
  const answers = nt.received.filter((l) => !l.hello && l.participant && l.participant !== 'newcomer~r4d' && (l.full || l.events));
  const copies = {};
  for (const l of answers) if (l.full) copies[l.participant] = (copies[l.participant] || 0) + 1;
  const held = await newcomer.readLogs();
  const room = Object.fromEntries(present.map((h) => [h, logs[h]]));
  const holdsTheRoom = present.every((h) => JSON.stringify(held[h] || null) === JSON.stringify(room[h])) &&
    Object.keys(held).filter((n) => n !== 'newcomer~r4d').every((n) => present.includes(n));
  const sentBy = tallies.map((t) => t.sent.filter((l) => l.full));
  const out = {
    hands: k, left, vanished,
    answerLines: sentBy.reduce((x, s) => x + s.length, 0),
    answerMB: +(sentBy.flat().reduce((x, l) => x + l.bytes, 0) / 1048576).toFixed(2),
    newcomerMB: +(answers.reduce((x, l) => x + l.bytes, 0) / 1048576).toFixed(2),
    boardMB: +(JSON.stringify(Object.values(room).flat()).length / 1048576).toFixed(2),
    copies,
    maxCopies: Math.max(0, ...Object.values(copies)),
    logsInRoom: present.length,
    holdsTheRoom,
    waitedMs: Math.round(now() - t0),
  };
  say(`  room of ${k}${left ? `, ${left} left` : ''}${vanished ? `, ${vanished} vanished` : ''}: ${out.answerLines} whole logs sent in answer (${out.answerMB} MB; the board is ${out.boardMB} MB), the newcomer took ${out.newcomerMB} MB — at most ${out.maxCopies} cop${out.maxCopies === 1 ? 'y' : 'ies'} of a log; ${holdsTheRoom ? 'it holds exactly the room\'s logs' : 'it does NOT hold the room\'s logs'}`);
  for (const s of stores) s.close();
  newcomer.close();
  return out;
}

// ===========================================================================

// A test's hooks onto a store: its logs as held (no copies), a line handed
// to it as if from the wire, and a vanishing — the transport gone without a word.
const LS = core.LiveStore.prototype;
if (!LS._peek) {
  LS._peek = function () { return this.logs; };
  LS._deliver = function (line) { return this.receive(line); };
  LS._vanish = function () { if (this.off) this.off(); this.off = null; };
}

const out = {
  at: new Date().toISOString(),
  machine: machine(),
  loadavg: os.loadavg().map((x) => +x.toFixed(2)),
  core: which,
  corePath: path.replace(/^.*\/(MetaMedium[^/]*)\//, ''),
  path: pathName,
  pathLabel: P.label,
  size,
  seed,
};
say(`room ${size} · path ${pathName} (${P.label}) · core ${which} · load ${out.loadavg.join(' ')}`);
out.line = await lines();
writeResult(`room-${size}-${pathName}.json`, out);
out.hello = [];
for (const [k, o] of [[3, {}], [6, {}], [6, { left: 1 }], [6, { vanished: 1 }]]) out.hello.push(await hello(k, o));
const file = writeResult(`room-${size}-${pathName}.json`, out);
say(`  → ${file}`);
process.stdout.write(JSON.stringify(out) + '\n');
process.exit(0);

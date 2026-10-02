// Nothing reads differently (V1-PLAN.md §9 R4b): every held log, and the
// generated bench board, replayed by the OLD engine and the NEW one, and every
// reading compared — so a change to how the engine stores or computes what it
// knows is shown to change nothing a person or a model reads from it, and
// exactly what does differ is said.
//
//     node core/bench/equivalence.mjs                  # the reference commit against src/ as it stands
//     node core/bench/equivalence.mjs --ref=HEAD~2     # another reference
//     node core/bench/equivalence.mjs --old=path.mjs   # a Node bundle on disk as the reference
//     node core/bench/equivalence.mjs --size=500 --every=1 --prefix-step=50
//
// The OLD engine is the committed Node bundle at `--ref` (`git show
// <ref>:Demos/dynaink-core.node.mjs`, or by the name it had before RENAME-PLAN
// N3c, `Demos/metamedium-core.node.mjs`; R4b's starting point by default); the
// NEW one is `core/src` built now (lib.mjs). Both replay the same
// events, and the harness reads each board with each engine's own public
// functions:
//
//   - the log, and every node id in order;
//   - every node's reps (the ink, the fingerprint, the words, the readings);
//   - the state: the content plane, artifacts, participants, answers, the live
//     plane, clocks, the reader's selection, summon, waiting loop, look-back,
//     why a mark missed, the taught mark;
//   - clusters and cluster candidates, in order, with their matches;
//   - shapes: every node's readings (`interpretationsOf`, `topInterpretation`);
//   - words: every gathered word's letters and what it was read as;
//   - the whole board read as the surface reads it (`session.read` of loose
//     marks and artifacts' members): roles, genre, concepts, the relations it
//     computes, and `describeReading`;
//   - every cluster read on its own: roles, genre, concepts, the definitions
//     it matches (`matchesOf`) and its structural signature;
//   - every artifact: its regions, its members read and matched;
//   - magnets and ports (`magnetSites`, `bindingsOf`), the snap offers,
//     connector heads (`connectorHeads`), figures (`figuresOf`), and the maths
//     of every mark (`measure`);
//   - a model's brief (`describeSession`) of the whole board and of every cluster;
//   - every node's stored edges.
//
// Two of those may differ, and only in one way each, which the harness checks
// rather than assumes: a node's stored edges may lose relations the engine
// measured between two marks that were out of reach of each other (no
// engaging relation — contains, inside, crossing, touching, near — between
// them), every other edge kept in its order; and the brief, which lists stored
// edges, may lose exactly those. Anything else is a difference, printed with
// its first examples, and the run exits 1.
//
// Beside the full comparison at the end of every log: the bench board drawn
// event by event through the session's own API in both engines, compared
// after every event (the content plane, the candidates, the gestures); undo
// from the end, which replays from a checkpoint; prefixes of the log loaded
// on their own; and strokes drawn onto the loaded board.

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadCore, OUT_DIR, REPO, args } from './lib.mjs';
import { generateBoard, extendBoard } from './board.mjs';

const a = args();
const REF = a.ref || '9977158';
const SIZE = Number(a.size ?? 500);
const EVERY = Number(a.every ?? 1);
const PREFIX_STEP = Number(a['prefix-step'] ?? 50);
const UNDOS = Number(a.undos ?? 6);
const EXTEND = Number(a.extend ?? 30);
const verbose = !!a.verbose;
const say = (s) => console.log(s);

// ===== The two engines =====================================================

/** The committed Node bundle at `sha`, by the name it had there: its name since RENAME-PLAN N3c, then the one before. */
const BUNDLE_NAMES = ['Demos/dynaink-core.node.mjs', 'Demos/metamedium-core.node.mjs'];
function bundleAt(sha) {
  for (const p of BUNDLE_NAMES) {
    try {
      return execFileSync('git', ['show', `${sha}:${p}`], { cwd: REPO, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    } catch { /* not by that name at that commit */ }
  }
  throw new Error(`no committed Node bundle at ${sha} — looked for ${BUNDLE_NAMES.join(' and ')}`);
}

async function loadOld() {
  if (a.old) return { core: await import(pathToFileURL(a.old).href), label: a.old };
  mkdirSync(OUT_DIR, { recursive: true });
  const sha = execFileSync('git', ['rev-parse', '--short', REF], { cwd: REPO }).toString().trim();
  const text = bundleAt(sha);
  const file = join(OUT_DIR, `core-ref-${sha}.mjs`);
  writeFileSync(file, text);
  return { core: await import(pathToFileURL(file).href), label: `the bundle at ${sha}` };
}

const OLD = await loadOld();
const NEW = { ...(await loadCore('source', { tag: 'equiv' })), label: 'src/ built now' };
const engines = { old: OLD.core, new: NEW.core };

// ===== Canonical JSON ======================================================

const canon = (v) =>
  v === null || typeof v !== 'object'
    ? (typeof v === 'number' && !Number.isFinite(v) ? JSON.stringify(String(v)) : JSON.stringify(v) ?? 'null')
    : Array.isArray(v)
      ? '[' + v.map(canon).join(',') + ']'
      : v instanceof Map
        ? canon([...v.entries()])
        : v instanceof Set
          ? canon([...v])
          : '{' + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';

const copy = (log) => JSON.parse(JSON.stringify(log));

// ===== What a board reads as ===============================================

const RELATION_KINDS = new Set(['contains', 'inside', 'crossing', 'touching', 'near', 'above', 'below', 'left-of', 'right-of', 'same-row', 'same-column', 'same-size']);
const ENGAGING = new Set(['contains', 'inside', 'crossing', 'touching', 'near']);

/** What the surface's readRungs reads (Demos/surface/08-render.js): loose marks plus artifacts' members. */
function rungIds(st) {
  const ids = st.contentIds.filter((id) => !st.artifacts.includes(id));
  for (const aid of st.artifacts) for (const e of st.nodes.get(aid).edges) if (e.rel === 'has-part') ids.push(e.to);
  return ids;
}

function markOf(core, st, id) {
  const n = st.nodes.get(id);
  const b = n && core.boundsOf(n);
  if (!n || !b) return null;
  const fp = core.fingerprintOf(n);
  return { id, bounds: b, points: core.strokePointsOf(n) ?? undefined, closed: fp ? fp.isClosed : undefined };
}

/** The clusters of the content plane as the engine's own functions draw them, read on demand. */
function groupsOf(core, st) {
  const marks = st.contentIds.map((id) => markOf(core, st, id)).filter(Boolean);
  return core.clusters(marks, core.relate(marks));
}

const readingOf = (r) => ({ roles: r.roles, genre: r.genre, concepts: r.concepts });
/** A reading that throws is a reading too: what it threw is compared. */
const attempt = (fn) => { try { return fn(); } catch (e) { return { threw: String(e && e.message || e) }; } };

/**
 * Every reading of a board, by section: a Map from a key to its canonical
 * JSON. `edges` is kept as the edges themselves, for the dropped-relation
 * check; `briefs` as text.
 */
function readBoard(core, s) {
  const st = s.getState();
  const nodes = st.nodes;
  const sec = {};
  const put = (section, key, value) => (sec[section] ??= new Map()).set(key, typeof value === 'string' ? value : canon(value));

  put('log', 'events', s.getEvents());
  put('ids', 'order', [...nodes.keys()]);
  put('state', 'lists', {
    contentIds: st.contentIds, artifacts: st.artifacts, participants: st.participants, explanations: st.explanations,
    live: st.live, clocks: st.clocks, selection: st.selection, summon: st.summon, pendingLassoId: st.pendingLassoId,
    recentIds: st.recentIds, markMiss: st.markMiss, commandMark: st.commandMark, generation: st.generation, staleResult: st.staleResult,
  });
  put('clusterCandidates', 'list', st.clusterCandidates);

  const edges = new Map();
  for (const [id, n] of nodes) {
    put('reps', id, n.reps);
    edges.set(id, n.edges);
    put('shapes', id, { readAs: core.interpretationsOf(n, nodes), top: core.topInterpretation(n) ?? null });
    if (core.isWord(n)) put('words', id, { letters: core.lettersOf(n), transcript: core.transcriptOf(n) ?? null, word: core.wordOf(n) ?? null });
    if (core.strokePointsOf(n) && !n.reps.some((r) => r.modality === 'erased')) {
      put('magnets', id, { sites: core.magnetSites(n, nodes), bindings: core.bindingsOf(n, nodes) });
      put('maths', id, attempt(() => core.measure(n, nodes)));
    }
  }
  sec.edges = edges;

  // The whole board, as the surface reads it after every stroke.
  const board = s.read(rungIds(st));
  put('read:board', 'reading', readingOf(board));
  put('read:board', 'relations', board.relations);
  put('read:board', 'describeReading', core.describeReading(board));

  // Every cluster on its own: what it reads as, what it matches, its signature.
  const typeOf = (id) => core.topInterpretation(nodes.get(id)) ?? 'art';
  const groups = groupsOf(core, st);
  put('clusters', 'groups', groups);
  const briefs = new Map([['board', core.describeSession(st)]]);
  for (const g of groups) {
    const key = g.join('+');
    const strokeIds = g.filter((id) => !st.artifacts.includes(id));
    put('read:cluster', key, readingOf(s.read(g)));
    put('matches', key, s.matchesOf(strokeIds));
    put('signatures', key, core.structuralSignature(strokeIds, nodes, typeOf));
    briefs.set('cluster ' + key, core.describeSession(st, { nodeIds: g }));
  }
  sec.briefs = briefs;

  for (const aid of st.artifacts) {
    const members = nodes.get(aid).edges.filter((e) => e.rel === 'has-part').map((e) => e.to);
    put('artifacts', aid, { regions: s.regions(aid), read: members.length ? readingOf(s.read(members)) : null, matches: s.matchesOf(members) });
  }
  put('snap', 'candidates', s.snapCandidates());
  put('heads', 'all', attempt(() => core.connectorHeads(st)));
  put('figures', 'all', attempt(() => core.figuresOf(st)));
  return sec;
}

/** The cheap part of the state, compared after every event of a board drawn one event at a time. */
function glance(s) {
  const st = s.getState();
  return canon({
    contentIds: st.contentIds, clusterCandidates: st.clusterCandidates, summon: st.summon, pendingLassoId: st.pendingLassoId,
    selection: st.selection, markMiss: st.markMiss, artifacts: st.artifacts, live: st.live, explanations: st.explanations,
    recentIds: st.recentIds, nodes: st.nodes.size,
  });
}

// ===== Comparing two readings ==============================================

/**
 * Line a node's new edges up against its old ones. Every new edge must be the
 * next old edge still unmatched, in order; an old edge may be passed over only
 * when it is a relation the engine measured between two marks out of reach of
 * each other. A pair's relations were measured together, when the later of
 * the two marks was drawn, so a pair either has an engaging relation on each
 * end or has none: that is what "out of reach" is read as here. Returns the
 * old edges the new engine kept (what a brief over the new board should
 * list), and tallies what it dropped and what it still stores out of reach.
 */
function alignEdges(oldEdges, newEdges, tally) {
  const kept = new Map();
  const diffs = [];
  for (const id of new Set([...oldEdges.keys(), ...newEdges.keys()])) {
    const before = oldEdges.get(id) ?? [], after = newEdges.get(id) ?? [];
    tally.total += before.length;
    tally.newTotal += after.length;
    const engagedWith = new Set();
    for (const e of before) if (e.via === 'participant:tier0' && ENGAGING.has(e.rel)) engagedWith.add(e.to);
    const outOfReach = (e) => e.via === 'participant:tier0' && RELATION_KINDS.has(e.rel) && !engagedWith.has(e.to);
    const mine = [];
    let j = 0;
    let bad = null;
    for (const e of before) {
      if (j < after.length && canon(e) === canon(after[j])) {
        mine.push(e);
        if (outOfReach(e)) tally.stillStored++;
        j++;
      } else if (outOfReach(e)) {
        tally.dropped++;
        tally.byKind[e.rel] = (tally.byKind[e.rel] || 0) + 1;
      } else {
        bad = { key: id, old: `the old edge ${canon(e)} is missing or moved`, new: canon(after) };
        break;
      }
    }
    if (!bad && j < after.length) bad = { key: id, old: canon(before), new: `a new edge the old engine never stored: ${canon(after[j])}` };
    if (bad) diffs.push(bad);
    kept.set(id, mine);
  }
  return { kept, diffs };
}

/** The brief the old engine would write over the edges `kept` — same state, the out-of-reach relations taken out. */
function briefOver(core, s, kept, nodeIds) {
  const st = s.getState();
  const nodes = new Map();
  for (const [id, n] of st.nodes) nodes.set(id, { ...n, edges: kept.get(id) ?? n.edges });
  return core.describeSession({ ...st, nodes }, nodeIds ? { nodeIds } : {});
}

function compareSections(oldSec, newSec, report) {
  for (const name of new Set([...Object.keys(oldSec), ...Object.keys(newSec)])) {
    if (name === 'edges' || name === 'briefs') continue;
    const A = oldSec[name] ?? new Map(), B = newSec[name] ?? new Map();
    const diffs = [];
    for (const k of new Set([...A.keys(), ...B.keys()])) {
      const x = A.get(k), y = B.get(k);
      if (x !== y) diffs.push({ key: k, old: x === undefined ? '(none)' : x, new: y === undefined ? '(none)' : y });
    }
    if (diffs.length) report.differ(name, diffs);
  }
}

function compareBoards(label, sOld, sNew, report) {
  const oldSec = readBoard(engines.old, sOld);
  const newSec = readBoard(engines.new, sNew);
  compareSections(oldSec, newSec, report);

  // Edges: the old edges in their order, less (at most) the out-of-reach relations.
  const tally = { dropped: 0, stillStored: 0, byKind: {}, total: 0, newTotal: 0 };
  const { kept, diffs: edgeDiffs } = alignEdges(oldSec.edges, newSec.edges, tally);
  if (edgeDiffs.length) report.differ('edges (beyond the out-of-reach relations)', edgeDiffs);

  // The brief: exactly what the old engine writes over the kept edges.
  const briefDiffs = [];
  let briefShed = 0;
  for (const [key, text] of newSec.briefs) {
    const ids = key === 'board' ? undefined : key.slice('cluster '.length).split('+');
    const expected = briefOver(engines.old, sOld, kept, ids);
    if (expected !== text) briefDiffs.push({ key, old: expected, new: text });
    briefShed += (oldSec.briefs.get(key) ?? '').length - text.length;
  }
  for (const key of oldSec.briefs.keys()) if (!newSec.briefs.has(key)) briefDiffs.push({ key, old: 'a brief', new: '(none)' });
  if (briefDiffs.length) report.differ('briefs (beyond the out-of-reach relations)', briefDiffs);

  report.note(label, tally, oldSec.briefs.get('board')?.length ?? 0, newSec.briefs.get('board')?.length ?? 0, briefShed);
}

// ===== The report ==========================================================

let failures = 0;
function reporter(title) {
  const lines = [];
  let bad = 0;
  return {
    differ(section, diffs) {
      bad++;
      lines.push(`    DIFFERS — ${section}: ${diffs.length} key${diffs.length === 1 ? '' : 's'}`);
      for (const d of diffs.slice(0, verbose ? 20 : 3)) {
        lines.push(`      ${d.key}`);
        lines.push(`        old: ${String(d.old).slice(0, verbose ? 2000 : 300)}`);
        lines.push(`        new: ${String(d.new).slice(0, verbose ? 2000 : 300)}`);
      }
    },
    note(label, tally, oldBrief, newBrief, shed) {
      const kinds = Object.entries(tally.byKind).sort((p, q) => q[1] - p[1]).map(([k, v]) => `${k} ${v.toLocaleString('en-GB')}`).join(', ');
      lines.push(`    ${label}: stored edges ${tally.total.toLocaleString('en-GB')} → ${tally.newTotal.toLocaleString('en-GB')}` +
        (tally.dropped ? `; ${tally.dropped.toLocaleString('en-GB')} relations between marks out of reach no longer stored (${kinds})` : '; none dropped') +
        (tally.stillStored ? `; ${tally.stillStored.toLocaleString('en-GB')} out of reach still stored` : '') +
        (oldBrief !== newBrief ? `; the whole-board brief ${(oldBrief / 1024).toFixed(1)} KB → ${(newBrief / 1024).toFixed(1)} KB, every brief ${Math.round(shed / 1024).toLocaleString('en-GB')} KB shorter in all` : ''));
    },
    line(s) { lines.push('    ' + s); },
    done() {
      say(`${bad ? '✗' : '✓'} ${title}`);
      for (const l of lines) say(l);
      if (bad) failures++;
    },
  };
}

// ===== The held logs ========================================================

function heldLogs() {
  const out = [];
  const rec = join(REPO, 'Demos', 'recordings');
  for (const f of readdirSync(rec).filter((x) => x.endsWith('.json')).sort()) {
    const raw = JSON.parse(readFileSync(join(rec, f), 'utf8'));
    out.push([`Demos/recordings/${f}`, Array.isArray(raw) ? raw : raw.events ?? []]);
  }
  const fix = join(REPO, 'dynaink-3d', 'fixtures');
  for (const f of readdirSync(fix).filter((x) => x.endsWith('.mm.log')).sort()) {
    out.push([`dynaink-3d/fixtures/${f}`, engines.new.decodeLog(readFileSync(join(fix, f), 'utf8')).events]);
  }
  return out;
}

/** The three ways a held log is opened (session/held.test.ts): bare, as the reader's own, as another hand's. */
const VARIANTS = {
  bare: (core, log) => { const s = core.createSession(); s.load(copy(log)); return s; },
  own: (core, log) => {
    const s = core.createSession({ ...core.DEFAULT_SESSION_CONFIG, logName: 'held' });
    s.load(core.mergeLogs({ held: copy(log) }, { me: 'held' }));
    return s;
  },
  'another hand': (core, log) => {
    const s = core.createSession({ ...core.DEFAULT_SESSION_CONFIG, logName: 'reader~r1' });
    s.load(core.mergeLogs({ 'ann~a1': copy(log), 'reader~r1': [] }, { me: 'reader~r1' }));
    return s;
  },
};

say(`old: ${OLD.label} · new: ${NEW.label}`);
say('');

for (const [path, log] of heldLogs()) {
  const r = reporter(`${path} (${log.length} events)`);
  for (const [variant, open] of Object.entries(VARIANTS)) {
    compareBoards(variant, open(engines.old, log), open(engines.new, log), r);
  }
  // Every prefix, standing at that step.
  let prefixDiffs = [];
  for (let k = 1; k < log.length; k++) {
    const so = VARIANTS.bare(engines.old, log.slice(0, k)), sn = VARIANTS.bare(engines.new, log.slice(0, k));
    if (glance(so) !== glance(sn)) prefixDiffs.push({ key: `prefix ${k}`, old: glance(so), new: glance(sn) });
    else if (k % 5 === 0 || k === log.length - 1) compareBoards(`prefix ${k}`, so, sn, { differ: (s, d) => prefixDiffs.push(...d.map((x) => ({ ...x, key: `prefix ${k} ${s} ${x.key}` }))), note() {} });
  }
  if (prefixDiffs.length) r.differ('prefixes', prefixDiffs);
  else r.line(`every prefix of the log (${log.length - 1}) stands the same`);
  r.done();
}

// ===== A log of the acts the generated boards never make ===================
//
// The bench board draws, blesses, moves, snaps, proposes, answers and writes
// text. This log, made through the OLD engine's own API, does the rest: a
// loop taken by the check and by a tap, a group kept as a drawing, words
// split and rubbed out, a correction each way, tidying, scaling, turning, a
// file and a traced picture imported, a frame, a label, a binding, a taught
// mark, clocks and a behaviour — each beside marks a definition can match.

const pts = {
  line: (a, b, n = 40) => Array.from({ length: n + 1 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n })),
  circle: (cx, cy, r, n = 90) => Array.from({ length: n + 1 }, (_, i) => ({ x: cx + r * Math.cos((i / n) * 2 * Math.PI), y: cy + r * Math.sin((i / n) * 2 * Math.PI) })),
  rect(x, y, w, h, k = 24) {
    const c = [{ x: x + w / 2, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }, { x: x + w / 2, y }];
    return c.slice(1).flatMap((q, i) => pts.line(c[i], q, k).slice(i ? 1 : 0));
  },
  check: (x, y) => [...pts.line({ x, y }, { x: x + 25, y: y + 35 }, 30), ...pts.line({ x: x + 25, y: y + 35 }, { x: x + 70, y: y - 15 }, 30).slice(1)],
  scratch(x, y, w, h, passes = 3) {
    const out = [];
    for (let i = 0; i < passes; i++) {
      const yi = y + (h * i) / (passes - 1);
      const from = { x: i % 2 ? x + w : x, y: yi }, to = { x: i % 2 ? x : x + w, y: yi };
      out.push(...pts.line(from, to, 10).slice(i ? 1 : 0));
    }
    return out;
  },
  N: (x, y, h = 30) => [[...pts.line({ x, y: y + h }, { x, y }, 14), ...pts.line({ x, y }, { x: x + 18, y: y + h }, 14).slice(1), ...pts.line({ x: x + 18, y: y + h }, { x: x + 18, y }, 14).slice(1)]],
  V: (x, y, h = 30) => [[...pts.line({ x, y }, { x: x + 10, y: y + h }, 14), ...pts.line({ x: x + 10, y: y + h }, { x: x + 20, y }, 14).slice(1)]],
};

function scriptedLog(core) {
  const s = core.createSession({ ...core.DEFAULT_SESSION_CONFIG, logName: 'script' });
  let t = 1000;
  const at = (dt = 700) => (t += dt);
  const molecule = (x, y) => [
    s.addStroke(pts.circle(x, y, 30), at()), s.addStroke(pts.circle(x + 100, y, 30), at()),
    s.addStroke(pts.line({ x: x + 32, y }, { x: x + 68, y }), at()),
  ];
  const word = (x, y) => { for (const p of [...pts.N(x, y), ...pts.V(x + 26, y)]) s.addStroke(p, at(350)); };
  // A definition, taken by a loop and the check.
  const m1 = molecule(200, 200);
  s.addStroke(pts.circle(250, 200, 110), at());
  s.addStroke(pts.check(320, 180), at(400));
  if (!s.getState().summon) throw new Error(`the scripted check did not take the loop up: ${JSON.stringify(s.getState().markMiss)}`);
  const def = s.bless({ summonId: s.getState().summon.id, name: 'molecule', at: at() });
  // A loop taken by a tap, then kept as a drawing.
  const m2 = molecule(700, 200);
  s.addStroke(pts.circle(750, 200, 110), at());
  const kept = s.summonHeld(at());
  const keep = s.getState().summon.suggestions.find((x) => x.kind === 'keep-as-drawing');
  s.bless({ summonId: kept, suggestionId: keep.id, at: at() });
  // Groups the definition matches; a correction each way.
  const m3 = molecule(200, 600);
  const m4 = molecule(700, 600);
  s.correct({ ids: m3, definitionId: def, verdict: 'is-not', at: at() });
  s.correct({ ids: m4, definitionId: def, verdict: 'is', at: at() });
  s.correct({ ids: m3, definitionId: def, verdict: 'is', at: at() });
  // Words: one split, one rubbed out a letter at a time.
  word(1200, 200);
  const w1 = s.getState().contentIds.find((id) => core.isWord(s.getState().nodes.get(id)));
  s.splitWord(w1, at());
  word(1200, 400);
  const w2 = s.getState().contentIds.find((id) => core.isWord(s.getState().nodes.get(id)));
  s.erase(core.lettersOf(s.getState().nodes.get(w2))[0], at());
  // Boxes in a rough row: tidied, equalised, scaled, turned, moved.
  const row = [s.addStroke(pts.rect(100, 1000, 120, 70), at()), s.addStroke(pts.rect(260, 1012, 90, 80), at()), s.addStroke(pts.rect(400, 995, 140, 60), at())];
  s.tidy({ ids: row, mode: 'align', at: at() });
  s.tidy({ ids: row, mode: 'equalize', at: at() });
  s.scale({ ids: [row[0]], about: { x: 100, y: 1000 }, sx: 1.4, sy: 0.8, at: at() });
  s.rotate({ ids: [row[1]], about: { x: 300, y: 1040 }, radians: 0.3, at: at() });
  s.move({ ids: [row[2]], dx: 40, dy: -30, at: at() });
  s.select(row, at());
  s.deselect(at());
  // A second definition of boxes, a file and a traced picture, and a frame of them.
  const boxes = [s.addStroke(pts.rect(1200, 1000, 160, 100), at()), s.addStroke(pts.rect(1220, 1020, 60, 40), at())];
  const framed = s.bless({ summonId: s.summonMarks(boxes, at()), name: 'framed', at: at() });
  const file = s.import({ kind: 'md', path: 'notes/readme.md', name: 'readme', bounds: { minX: 1600, minY: 1000, maxX: 1900, maxY: 1200 }, code: '# notes', at: at() });
  s.import({ kind: 'png', path: 'sketch.png', bounds: { minX: 2000, minY: 1000, maxX: 2300, maxY: 1200 }, strokes: [pts.rect(2010, 1010, 100, 80), pts.line({ x: 2120, y: 1050 }, { x: 2280, y: 1050 })], at: at() });
  s.frame({ ids: [framed, file], name: 'pair', connections: [], at: at() });
  // A molecule moved as a definition's instance, with its members moved too.
  const m5 = molecule(200, 1400);
  s.bless({ summonId: s.summonMarks(m5, at()), suggestionId: undefined, name: 'molecule 2', at: at() });
  const inst = s.getState().artifacts[s.getState().artifacts.length - 1];
  s.move({ ids: [inst], dx: 300, dy: 50, at: at() });
  // A label, a binding, a proposal, code taken as text, an answer, a snap.
  s.label({ nodeId: row[0], text: 'inlet', at: at() });
  const arrow = s.addStroke(pts.line({ x: 225, y: 1035 }, { x: 255, y: 1040 }), at());
  s.bind({ strokeId: arrow, nodeId: row[1], site: { kind: 'corner', index: 0 }, end: 'end', at: at() });
  const model = s.join('agent', 'llm:script', at(), 2, 'local');
  s.propose({ participantId: model, nodeId: m4[0], edges: [{ to: 'type:bubble', rel: 'resembles', weight: 0.95, reasoning: 'scripted' }], at: at() });
  s.attachCode({ participantId: model, nodeId: framed, code: 'framed', kind: 'text', at: at() });
  s.answer({ participantId: model, question: 'what?', text: 'two molecules', aboutIds: m3, at: at() });
  s.snap({ ids: row, at: at() });
  // A taught mark, clocks and a behaviour on the definition.
  s.teachCommandMark(null, at());
  s.clock({ nodeId: def, op: 'play', at: at() });
  s.clock({ nodeId: def, op: 'pause', reason: 'scripted', at: at() });
  s.behave({ nodeId: def, behaviour: { terms: [{ verb: 'wander', weight: 1 }] }, at: at() });
  // A member rubbed out degrades its artifact; a scratch across two groups.
  s.erase(boxes[1], at());
  const b = core.boundsOf(s.getState().nodes.get(m2[0]));
  // Three passes, so it ends across from where it began: an open stroke (four
  // would end beside its start, and a closed stroke is a loop, never a scratch).
  s.addStroke(pts.scratch(b.minX - 10, (b.minY + b.maxY) / 2 - 12, b.maxX - b.minX + 20, 24, 3), at());
  molecule(1500, 600);
  return s.getEvents().slice();
}

// ===== The bench board =====================================================

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
    default: throw new Error(`cannot draw a "${ev.type}" event`);
  }
}

{
  const log = scriptedLog(engines.old);
  const r = reporter(`a scripted log of the acts the boards never make (${log.length} events: ${[...new Set(log.map((e) => e.type))].join(', ')})`);
  for (const [variant, open] of Object.entries(VARIANTS)) compareBoards(variant, open(engines.old, log), open(engines.new, log), r);
  {
    // What the board ends as — so a pass is not a comparison of two empty boards.
    const st = VARIANTS.bare(engines.new, log).getState();
    const erased = [...st.nodes.values()].filter((n) => n.reps.some((x) => x.modality === 'erased')).length;
    const broken = st.artifacts.length + [...st.nodes.values()].filter((n) => n.reps.some((x) => x.modality === 'status' && x.data === 'broken')).length;
    r.line(`it ends with ${st.contentIds.length} marks on the plane, ${st.artifacts.length} artifacts standing (${broken} ever made), ${st.clusterCandidates.length} groups matched, ${erased} marks rubbed out`);
  }
  const diffs = [];
  for (let k = 1; k < log.length; k++) {
    const so = VARIANTS.bare(engines.old, log.slice(0, k)), sn = VARIANTS.bare(engines.new, log.slice(0, k));
    if (glance(so) !== glance(sn)) diffs.push({ key: `prefix ${k} (${log[k - 1].type})`, old: glance(so), new: glance(sn) });
    else compareBoards(`prefix ${k}`, so, sn, { differ: (sec, d) => diffs.push(...d.map((x) => ({ ...x, key: `prefix ${k} ${sec} ${x.key}` }))), note() {} });
  }
  if (diffs.length) r.differ('prefixes', diffs);
  else r.line(`every prefix of the log (${log.length - 1}), read in full, stands the same`);
  // And undone from the end, one event at a time, against a replay from zero.
  const u = { old: VARIANTS.bare(engines.old, log), new: VARIANTS.bare(engines.new, log) };
  const undone = [];
  for (let i = 0; i < 12; i++) {
    u.old.undo();
    u.new.undo();
    if (glance(u.old) !== glance(u.new)) undone.push({ key: `undo ${i + 1}`, old: glance(u.old), new: glance(u.new) });
  }
  if (undone.length) r.differ('undo', undone);
  else r.line('twelve undos from the end stand the same');
  r.done();
}

if (SIZE > 0) {
  const r = reporter(`the ${SIZE}-mark bench board`);
  const genOld = generateBoard(engines.old, { marks: SIZE, seed: 1 });
  const genNew = generateBoard(engines.new, { marks: SIZE, seed: 1 });
  const events = genOld.events;
  if (canon(genOld.events) !== canon(genNew.events)) r.differ('the generated log', [{ key: 'events', old: `${genOld.events.length} events`, new: `${genNew.events.length} events` }]);
  else r.line(`${events.length} events; both engines generate the same log`);

  // Loaded whole.
  const so = engines.old.createSession(), sn = engines.new.createSession();
  so.load(copy(events));
  sn.load(copy(events));
  compareBoards('loaded', so, sn, r);

  // Drawn event by event, through the API a hand uses, compared after every event.
  {
    const dOld = engines.old.createSession({ ...engines.old.DEFAULT_SESSION_CONFIG, logName: 'local' });
    const dNew = engines.new.createSession({ ...engines.new.DEFAULT_SESSION_CONFIG, logName: 'local' });
    const diffs = [];
    events.forEach((ev, i) => {
      applyViaApi(dOld, ev);
      applyViaApi(dNew, ev);
      if (i % EVERY === 0 || i === events.length - 1) {
        const x = glance(dOld), y = glance(dNew);
        if (x !== y) diffs.push({ key: `after event ${i} (${ev.type})`, old: x, new: y });
      }
    });
    if (diffs.length) r.differ('drawn event by event', diffs);
    else r.line(`drawn event by event: the same after every ${EVERY === 1 ? '' : EVERY + 'th '}event (${events.length})`);
    compareBoards('drawn', dOld, dNew, r);
  }

  // Prefixes, loaded on their own.
  {
    const diffs = [];
    for (let k = PREFIX_STEP; k < events.length; k += PREFIX_STEP) {
      const po = engines.old.createSession(), pn = engines.new.createSession();
      po.load(copy(events.slice(0, k)));
      pn.load(copy(events.slice(0, k)));
      if (glance(po) !== glance(pn)) diffs.push({ key: `prefix ${k}`, old: glance(po), new: glance(pn) });
    }
    if (diffs.length) r.differ('prefixes', diffs);
    else r.line(`every ${PREFIX_STEP}th prefix, loaded on its own, stands the same`);
  }

  // Undo from the end: each one replays from the nearest checkpoint.
  {
    const diffs = [];
    for (let i = 0; i < UNDOS; i++) {
      so.undo();
      sn.undo();
      if (glance(so) !== glance(sn)) diffs.push({ key: `undo ${i + 1}`, old: glance(so), new: glance(sn) });
    }
    if (diffs.length) r.differ('undo', diffs);
    compareBoards(`after ${UNDOS} undos`, so, sn, r);
    // …and the same board replayed from zero, in the new engine: a checkpoint is a replay, only faster.
    const fresh = engines.new.createSession();
    fresh.load(copy(sn.getEvents()));
    const fromZero = readBoard(engines.new, fresh), fromCheckpoint = readBoard(engines.new, sn);
    let same = true;
    compareSections(fromCheckpoint, fromZero, { differ: (s, d) => { same = false; r.differ(`replayed from a checkpoint vs from zero: ${s}`, d); } });
    for (const [id, list] of fromCheckpoint.edges) if (canon(list) !== canon(fromZero.edges.get(id))) { same = false; r.differ('replayed from a checkpoint vs from zero: edges', [{ key: id, old: canon(list), new: canon(fromZero.edges.get(id)) }]); break; }
    if (same) r.line(`after ${UNDOS} undos (each from a checkpoint), the board equals the same log replayed from zero`);
  }

  // Strokes drawn onto the loaded board, one more at a time.
  {
    const eo = engines.old.createSession(), en = engines.new.createSession();
    eo.load(copy(events));
    en.load(copy(events));
    const diffs = [];
    const glances = { old: [], new: [] };
    extendBoard(engines.old, eo, { marks: EXTEND, onStroke: () => glances.old.push(glance(eo)) });
    extendBoard(engines.new, en, { marks: EXTEND, onStroke: () => glances.new.push(glance(en)) });
    glances.old.forEach((g, i) => { if (g !== glances.new[i]) diffs.push({ key: `stroke ${i + 1}`, old: g, new: glances.new[i] }); });
    if (diffs.length) r.differ('strokes drawn onto the board', diffs);
    compareBoards(`${EXTEND} more strokes drawn onto it`, eo, en, r);
  }
  r.done();
}

say('');
if (failures) {
  say(`${failures} log${failures === 1 ? '' : 's'} read differently.`);
  process.exit(1);
}
say('Nothing reads differently: every reading, every id and the log are the same in both engines' +
  ' — the stored relations between marks out of reach of each other, and the lines of a brief that listed them, are the only things said above.');

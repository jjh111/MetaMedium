// Library packs on a board (V1-PLAN §2.3, §9 B3): used by an event, carried
// by everything that carries a log, matched as taught definitions are, and
// never on the board.
//
//   - the door: `use` writes one event, and refuses a name that is no pack's
//     or one this build lacks, writing nothing;
//   - the definitions: attributed to the pack, below this board's own on a
//     tie, corrected with *Not a …*, never content, an artifact, live, erased,
//     labelled or read into;
//   - the log as source: replay, checkpoints, undo per hand (L2j), a merge of
//     two hands, a room's line (R4d), a log written out and read back — and a
//     pack the build does not have, said and never thrown;
//   - the pen: a pack naming a notation offers its ports while in use.

import { describe, it, expect, afterEach } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG, type Session, type SessionEvent } from '../session/session';
import { authorOf, getRep, isPackDefinition, packDefinitionOf, wordOf } from '../session/nodes';
import { describeStructure } from '../session/signature';
import { mergeLogs } from '../store/merge';
import { LiveMerge } from '../store/livemerge';
import { encodeLog, decodeLog } from '../store/seam';
import { registeredPorts, unregisterPorts } from '../session/ports';
import { definitionOf } from '../tools/board';
import { circleStroke, lineStroke, checkStroke, handRect } from '../test/strokes';
import { magnetSites } from '../session/magnets';
import type { Point } from '../types';
import { libraryDefinitions } from './definitions';
import { followPacks } from './follow';
import { shippedPack } from './registry';
import { BASICS } from './shipped/basics';

const named = (logName: string, extra: Partial<typeof DEFAULT_SESSION_CONFIG> = {}) => createSession({ ...DEFAULT_SESSION_CONFIG, logName, ...extra });

/** The canonical loop's molecule, moved by (dx, dy). */
function molecule(dx = 0, dy = 0): Point[][] {
  const t = (points: Point[]) => points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
  return [
    t(circleStroke(200, 200, 40)),
    t(circleStroke(380, 200, 40)),
    t(circleStroke(290, 340, 40)),
    t(lineStroke({ x: 245, y: 200 }, { x: 335, y: 200 })),
    t(lineStroke({ x: 220, y: 245 }, { x: 270, y: 320 })),
  ];
}

let clock = 1_000_000;
const next = (gap = 1000) => (clock += gap);
const draw = (s: Session, strokes: Point[][]) => strokes.map((p) => s.addStroke(p, next(), undefined, 1));
/** Circle the group and check it — the canonical loop's summon. */
function summonAround(s: Session, cx: number, cy: number, r = 170) {
  s.addStroke(circleStroke(cx, cy, r), next());
  s.addStroke(checkStroke(cx + r + 10, cy + 30), next());
  return s.getState().summon;
}
/** Everything a board shows, less how often it was replaced. */
const stateOf = (s: Session) => {
  const st = s.getState();
  return JSON.stringify({ ...st, generation: 0, nodes: [...st.nodes.values()] });
};
const topNames = (s: Session) => s.getState().clusterCandidates.map((c) => c.matches.map((m) => `${m.name}${m.pack ? '·' + m.pack : ''}`));

afterEach(() => {
  for (const n of registeredPorts()) unregisterPorts(n); // leave the pen as it was found
});

describe('the door: a board uses a pack by one event', () => {
  it('use writes one event, a second use nothing; unuse writes one, and nothing when the pack is not used', () => {
    const s = createSession();
    expect(s.use('basics@1', next())).toBeNull();
    expect(s.getEvents().map((e) => e.type)).toEqual(['use']);
    expect(s.getState().packs).toEqual(['basics@1']);
    expect(s.use('basics@1', next())).toBeNull();
    expect(s.getEvents()).toHaveLength(1);
    s.unuse('basics@1', next());
    expect(s.getEvents().map((e) => e.type)).toEqual(['use', 'unuse']);
    expect(s.getState().packs).toEqual([]);
    s.unuse('basics@1', next());
    s.unuse('flowchart@1', next());
    expect(s.getEvents()).toHaveLength(2);
  });

  it('a name that is no pack’s, or one this build does not ship, is refused at the door and never written', () => {
    const s = createSession();
    for (const [name, reason] of [['basics', 'malformed'], ['Basics@1', 'malformed'], ['', 'malformed'], ['basics@0', 'malformed'], ['basics@2', 'unknown'], ['garment@1', 'unknown']] as const) {
      const said = s.use(name, next());
      expect(said, name).toMatchObject({ pack: name, reason });
      expect(said!.detail.length).toBeGreaterThan(10);
    }
    expect(s.getEvents()).toEqual([]);
    expect(s.getState().packs).toEqual([]);
    expect(s.getState().packNotices).toEqual([]);
  });

  it('a pack’s definitions are nodes attributed to the pack, and never on the board', () => {
    const s = createSession();
    s.use('basics@1', next());
    const st = s.getState();
    const pack = st.nodes.get('library:basics@1')!;
    expect(wordOf(pack)).toBe('Basics');
    for (const name of ['bubble', 'molecule']) {
      const id = `library:basics@1:${name}`;
      const def = st.nodes.get(id)!;
      expect(isPackDefinition(def)).toBe(true);
      expect(packDefinitionOf(def)).toMatchObject({ pack: 'basics@1', definition: name });
      expect(wordOf(def)).toBe(name);
      expect(authorOf(def)).toBe('library:basics@1');
      expect(getRep(def, 'signature')).toBeDefined();
      expect(st.contentIds).not.toContain(id);
      expect(st.artifacts).not.toContain(id);
      expect(st.live).not.toContain(id);
    }
    // The molecule's other drawings are its accepted examples, as a correction would add them.
    const ex = getRep(st.nodes.get('library:basics@1:molecule')!, 'examples')!.data as { accepted: unknown[]; rejected: unknown[] };
    expect(ex.accepted.length).toBeGreaterThan(0);
    expect(ex.rejected).toEqual([]);
  });

  it('what a pack’s drawings read as is pinned: the same signature every time, from any copy of the content', () => {
    const fresh = () => createSession();
    const a = libraryDefinitions(BASICS, fresh);
    const b = libraryDefinitions(JSON.parse(JSON.stringify(BASICS)), fresh); // a copy: read again, not from the cache
    expect(b.map((d) => describeStructure(d.signature))).toEqual(a.map((d) => describeStructure(d.signature)));
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    // The golden: if the shape rung or the relations change what these drawings read as, it shows here first.
    expect(a.map((d) => [d.name, describeStructure(d.signature), d.accepted.map(describeStructure)])).toEqual([
      ['bubble', 'circle; no links', []],
      [
        'molecule',
        '3×circle + 2×line; circle-connects-line ×4, circle-near-line ×4, circle-crossing-line, circle-touching-line',
        [
          '3×circle + 2×line; circle-connects-line ×4, circle-near-line ×4, circle-crossing-line ×2, circle-touching-line ×2, line-near-line',
          '3×circle + 2×line; circle-connects-line ×4, circle-near-line ×4, circle-touching-line ×2, circle-crossing-line',
        ],
      ],
    ]);
  });
});

describe('matched as taught definitions are', () => {
  it('a molecule drawn with no teaching is the pack’s molecule; a lone circle held is its bubble', () => {
    const s = createSession();
    s.use('basics@1', next());
    draw(s, molecule());
    expect(topNames(s)).toEqual([['molecule·basics@1']]);
    const one = s.addStroke(circleStroke(900, 900, 50), next());
    s.summonMarks([one], next());
    const offered = s.getState().summon!.suggestions.filter((x) => x.kind === 'match');
    expect(offered.map((x) => [x.label, x.pack, x.artifactId])).toEqual([['bubble', 'basics@1', 'library:basics@1:bubble']]);
    expect(s.matchesOf([one])[0]).toMatchObject({ name: 'bubble', pack: 'basics@1', score: 1 });
  });

  it('a field open when the pack is used offers its match at once, and not a moment after it is stopped', () => {
    const s = createSession();
    const ids = draw(s, molecule());
    s.summonMarks(ids, next());
    const matches = () => s.getState().summon!.suggestions.filter((x) => x.kind === 'match').map((x) => `${x.label}·${x.pack}`);
    expect(matches()).toEqual([]);
    s.use('basics@1', next());
    expect(matches()).toEqual(['molecule·basics@1']);
    s.unuse('basics@1', next());
    expect(matches()).toEqual([]);
    s.undo();
    expect(matches()).toEqual(['molecule·basics@1']);
  });

  it('this board’s own definition wins a tie, and both are offered', () => {
    const s = createSession();
    s.use('test-molecule@1', next());
    draw(s, molecule());
    const sum = summonAround(s, 290, 270)!;
    const mine = s.bless({ summonId: sum.id, name: 'molecule', at: next() })!;
    draw(s, molecule(500, 0));
    const [cand] = s.getState().clusterCandidates;
    // The same shapes and links as both: a tie at the top, and this board's own leads it.
    expect(cand.matches.map((m) => [m.artifactId, m.score])).toEqual([[mine, 1], ['library:test-molecule@1:molecule', 1]]);
    const second = summonAround(s, 790, 270)!;
    expect(second.suggestions.filter((x) => x.kind === 'match').map((x) => x.artifactId)).toEqual([mine, 'library:test-molecule@1:molecule']);
  });

  it('*Not a molecule* is remembered on the pack’s definition, on this board — undo takes it back', () => {
    const s = createSession();
    s.use('basics@1', next());
    const ids = draw(s, molecule());
    expect(topNames(s)).toEqual([['molecule·basics@1']]);
    s.correct({ ids, definitionId: 'library:basics@1:molecule', verdict: 'is-not', at: next() });
    expect(topNames(s)).toEqual([]);
    expect(s.matchesOf(ids)).toEqual([]);
    const ex = getRep(s.getState().nodes.get('library:basics@1:molecule')!, 'examples')!.data as { rejected: unknown[] };
    expect(ex.rejected).toHaveLength(1);
    s.undo();
    expect(topNames(s)).toEqual([['molecule·basics@1']]);
  });

  it('taken, the match is this board’s own molecule — its own definition, the pack’s its provenance', () => {
    const s = createSession();
    s.use('basics@1', next());
    draw(s, molecule());
    const sum = summonAround(s, 290, 270)!;
    const offered = sum.suggestions.find((x) => x.kind === 'match')!;
    expect(offered.pack).toBe('basics@1');
    const made = s.bless({ summonId: sum.id, suggestionId: offered.id, at: next() })!;
    const st = s.getState();
    expect(st.nodes.get(made)!.edges.some((e) => e.rel === 'instance-of' && e.to === 'library:basics@1:molecule')).toBe(true);
    expect(definitionOf(st, made)).toBe(made);
    // It is a definition of this board now: the next molecule is matched by it too, ahead of the pack's on a tie.
    draw(s, molecule(500, 0));
    expect(s.getState().clusterCandidates[0].matches[0].artifactId).toBe(made);
  });

  it('never on the board: a pack’s definition is not erased, labelled, read into, written into, played or selected', () => {
    const s = createSession();
    s.use('basics@1', next());
    const id = 'library:basics@1:molecule';
    const before = stateOf(s);
    s.erase(id, next());
    expect(s.label({ nodeId: id, text: 'mine', at: next() })).toBeNull();
    expect(s.getState().staleResult).toMatchObject({ reason: 'not-your-ink' });
    const model = s.join('agent', 'qwen', next(), 2);
    s.propose({ participantId: model, nodeId: id, edges: [{ to: 'type:circle', rel: 'resembles', weight: 0.9 }], at: next() });
    expect(s.attachCode({ participantId: model, nodeId: id, code: '<p>hi</p>', at: next() })).toBeNull();
    s.clock({ nodeId: id, op: 'play', at: next() });
    s.select([id], next());
    expect(s.summonMarks([id], next())).toBeNull();
    const st = s.getState();
    const def = st.nodes.get(id)!;
    expect(getRep(def, 'erased')).toBeUndefined();
    expect(def.edges.filter((e) => e.via === model)).toEqual([]);
    expect(getRep(def, 'code')).toBeUndefined();
    expect(st.live).toEqual([]);
    expect(st.clocks[id]).toBeUndefined();
    expect(st.selection).toEqual([]);
    // Nothing of it changed but the participant who joined and the events that asked.
    const after = JSON.parse(stateOf(s));
    expect(JSON.stringify(after.nodes.find((n: { id: string }) => n.id === id))).toBe(JSON.stringify(JSON.parse(before).nodes.find((n: { id: string }) => n.id === id)));
  });
});

describe('the log is the source', () => {
  it('present only because a use event says so: stop using takes the definitions out, undo brings them back', () => {
    const s = createSession();
    s.use('basics@1', next());
    draw(s, molecule());
    expect(topNames(s)).toEqual([['molecule·basics@1']]);
    s.unuse('basics@1', next());
    expect(topNames(s)).toEqual([]);
    expect(s.getState().packs).toEqual([]);
    s.undo(); // the unuse
    expect(topNames(s)).toEqual([['molecule·basics@1']]);
    // Undo walks back to the use itself: five strokes, then the use.
    for (let i = 0; i < 5; i++) s.undo();
    expect(s.getState().packs).toEqual(['basics@1']);
    s.undo();
    expect(s.getState().packs).toEqual([]);
    expect(s.getEvents()).toEqual([]);
  });

  it('replays to the same board, whatever the checkpoints, and a log written out reads back to it', () => {
    const s = named('ada~a1');
    s.use('basics@1', next());
    const ids = draw(s, molecule());
    s.correct({ ids, definitionId: 'library:basics@1:molecule', verdict: 'is-not', at: next() });
    s.unuse('basics@1', next());
    draw(s, molecule(600, 0));
    s.use('basics@1', next());
    draw(s, molecule(0, 500));
    const log = s.getEvents().slice();
    for (const every of [undefined, 1, 3, 7]) {
      const t = named('ada~a1', every === undefined ? {} : { checkpointEvery: every });
      t.load(log);
      expect(stateOf(t)).toBe(stateOf(s));
    }
    // Written as the folder, the journal and export write it — one event per line — and read back.
    const back = decodeLog(encodeLog(log));
    expect(back.skipped).toBe(0);
    const u = named('ada~a1');
    u.load(back.events);
    expect(stateOf(u)).toBe(stateOf(s));
    // The correction made before the unuse holds through it and the second use: a group of the same shapes and
    // links is not offered as the pack's molecule, anywhere on the board — the human decided, the board remembers.
    expect(s.getState().packs).toEqual(['basics@1']);
    expect(topNames(s)).toEqual([]);
    const ex = getRep(s.getState().nodes.get('library:basics@1:molecule')!, 'examples')!.data as { rejected: unknown[] };
    expect(ex.rejected).toHaveLength(1);
  });

  it('a pack this build does not have is said, never thrown, and the board loads without it', () => {
    const drawn = createSession();
    const ids = draw(drawn, molecule());
    const log: SessionEvent[] = [
      { type: 'use', pack: 'garment@9', at: 10 } as SessionEvent,
      { type: 'use', pack: 42, at: 11 } as unknown as SessionEvent,
      { type: 'use', pack: 'basics@1', at: 12 } as SessionEvent,
      ...drawn.getEvents(),
    ];
    const s = createSession();
    expect(() => s.load(log)).not.toThrow();
    const st = s.getState();
    expect(st.packs).toEqual(['basics@1']);
    expect(st.packNotices.map((n) => [n.pack, n.reason])).toEqual([['garment@9', 'unknown'], ['42', 'malformed']]);
    expect(st.packNotices[0].detail).toMatch(/garment@9, which this build does not have/);
    expect(st.contentIds).toEqual(ids);
    expect(topNames(s)).toEqual([['molecule·basics@1']]);
    // Stopping a pack the board names clears what was said of it.
    s.unuse('garment@9', 99);
    expect(s.getState().packNotices.map((n) => n.pack)).toEqual(['42']);
  });

  it('undo is per hand: a hand takes back its own use, never another’s, and every board follows the logs', () => {
    const ada = named('ada~a1');
    const fern = named('fern~f1');
    ada.use('basics@1', next());
    const drawnAt = next();
    const ids = molecule().map((p, i) => fern.addStroke(p, drawnAt + i, undefined, 1));
    const logs = () => ({ 'ada~a1': ada.getEvents().filter((e) => !e.by), 'fern~f1': fern.getEvents().filter((e) => !e.by) });
    // Fern's board merges ada's log: it uses the pack, and fern's molecule is the pack's.
    fern.load(mergeLogs(logs(), { me: 'fern~f1' }));
    expect(fern.getState().packs).toEqual(['basics@1']);
    expect(fern.getState().clusterCandidates.map((c) => [c.nodeIds.slice().sort(), c.matches[0].name])).toEqual([[ids.slice().sort(), 'molecule']]);
    // Fern's undo takes back her own last stroke, not ada's use.
    fern.undo();
    expect(fern.getState().packs).toEqual(['basics@1']);
    // Ada's undo takes back her use; her log shrinks, and fern's board, merged again, uses no pack.
    ada.undo();
    expect(ada.getEvents()).toEqual([]);
    fern.load(mergeLogs(logs(), { me: 'fern~f1' }));
    expect(fern.getState().packs).toEqual([]);
    expect(fern.getState().clusterCandidates).toEqual([]);
  });

  it('a room’s line carries a use: applied as it lands, the board is the merge’s', () => {
    const ada = named('ada~a1');
    const fern = named('fern~f1');
    const at = next();
    molecule().forEach((p, i) => fern.addStroke(p, at + i, undefined, 1));
    const merge = new LiveMerge(fern, 'fern~f1');
    ada.use('basics@1', next());
    merge.sync({ 'fern~f1': fern.getEvents().filter((e) => !e.by), 'ada~a1': ada.getEvents().slice() });
    expect(fern.getState().packs).toEqual(['basics@1']);
    const oracle = named('fern~f1');
    oracle.load(mergeLogs({ 'fern~f1': fern.getEvents().filter((e) => !e.by), 'ada~a1': ada.getEvents() }, { me: 'fern~f1' }));
    expect(stateOf(fern)).toBe(stateOf(oracle));
    expect(topNames(fern)).toEqual([['molecule·basics@1']]);
  });
});

describe('the pen: a pack naming a notation offers its ports while in use', () => {
  it('flowchart@1 in use offers the flowchart’s ports; stopping takes them back; undo of the stop offers them again', () => {
    const s = createSession();
    const stop = followPacks(s);
    expect(registeredPorts()).toEqual([]);
    s.use('basics@1', next());
    expect(registeredPorts()).toEqual([]); // a pack with no notation offers none
    s.use('flowchart@1', next());
    expect(registeredPorts()).toEqual(['flowchart']);
    s.unuse('flowchart@1', next());
    expect(registeredPorts()).toEqual([]);
    s.undo();
    expect(registeredPorts()).toEqual(['flowchart']);
    // A board that never used it, loaded in its place, takes them back.
    s.load([]);
    expect(registeredPorts()).toEqual([]);
    s.load([{ type: 'use', pack: 'flowchart@1', at: 1 } as SessionEvent]);
    expect(registeredPorts()).toEqual(['flowchart']);
    stop();
    expect(registeredPorts()).toEqual([]);
  });

  it('the notation reads whether or not its pack is used — recognition is never gated on a declaration', () => {
    expect(shippedPack('flowchart@1')!.notation).toBe('flowchart');
    expect(shippedPack('flowchart@1')!.definitions).toEqual([]);
    expect(shippedPack('uml-class@1')!.notation).toBe('uml-class');
    expect(shippedPack('uml-class@1')!.definitions).toEqual([]);
    expect(shippedPack('sequence@1')!.notation).toBe('sequence');
    expect(shippedPack('sequence@1')!.definitions).toEqual([]);
    expect(shippedPack('state@1')!.notation).toBe('state');
    expect(shippedPack('state@1')!.definitions).toEqual([]);
    expect(shippedPack('er@1')!.notation).toBe('er');
    expect(shippedPack('er@1')!.definitions).toEqual([]);
  });

  it('uml-class@1 in use puts each class’s four sides on the pen — a place along a side — and stopping takes them back (D4)', () => {
    const s = createSession();
    const stop = followPacks(s);
    // A class: a box with a line across it, side to side.
    const box = s.addStroke(handRect(100, 100, 200, 140, { seed: 1 }), next());
    s.addStroke(lineStroke({ x: 101, y: 140 }, { x: 299, y: 140 }), next() + 4000);
    const sites = () => magnetSites(s.getState().nodes.get(box)!, s.getState().nodes).filter((x) => x.kind === 'along:uml-class');
    expect(sites()).toEqual([]);
    s.use('uml-class@1', next() + 8000);
    expect(registeredPorts()).toEqual(['uml-class']);
    const along = sites();
    expect(along.length).toBeGreaterThan(8);
    // Somewhere along each of its four sides.
    expect(along.some((x) => Math.abs(x.point.y - 100) < 6)).toBe(true);
    expect(along.some((x) => Math.abs(x.point.x - 300) < 6)).toBe(true);
    expect(along.some((x) => Math.abs(x.point.y - 240) < 6)).toBe(true);
    expect(along.some((x) => Math.abs(x.point.x - 100) < 6)).toBe(true);
    s.unuse('uml-class@1', next() + 12000);
    expect(registeredPorts()).toEqual([]);
    expect(sites()).toEqual([]);
    stop();
  });

  it('sequence@1 in use puts each lifeline’s whole length on the pen — one stroke, or any dash of a dashed one — and stopping takes it back (D5)', () => {
    const s = createSession();
    const stop = followPacks(s);
    // Two participants, each a box over its lifeline: one drawn as one line, one dashed; a call between them.
    s.addStroke(handRect(100, 100, 140, 56, { seed: 3 }), next(4000));
    s.addStroke(handRect(400, 100, 140, 56, { seed: 4 }), next(4000));
    const solid = s.addStroke(lineStroke({ x: 170, y: 158 }, { x: 170, y: 520 }), next(4000));
    const dashes: string[] = [];
    for (let y = 158; y + 12 <= 520; y += 20) dashes.push(s.addStroke(lineStroke({ x: 470, y }, { x: 470, y: y + 12 }, 8), next(200)));
    s.addStroke(lineStroke({ x: 172, y: 260 }, { x: 468, y: 260 }), next(4000));
    const sites = (id: string) => magnetSites(s.getState().nodes.get(id)!, s.getState().nodes).filter((x) => x.kind === 'along:sequence');
    expect(sites(solid)).toEqual([]);
    s.use('sequence@1', next(4000));
    expect(registeredPorts()).toEqual(['sequence']);
    const along = sites(solid);
    expect(along.length).toBeGreaterThan(10);
    // From the lifeline's top to its bottom.
    expect(Math.min(...along.map((x) => x.point.y))).toBeLessThan(160);
    expect(Math.max(...along.map((x) => x.point.y))).toBeGreaterThan(515);
    expect(along.every((x) => Math.abs(x.point.x - 170) < 2)).toBe(true);
    // Any dash of the dashed lifeline offers the whole of it.
    const fromDash = sites(dashes[7]);
    expect(Math.min(...fromDash.map((x) => x.point.y))).toBeLessThan(160);
    expect(Math.max(...fromDash.map((x) => x.point.y))).toBeGreaterThan(505);
    s.unuse('sequence@1', next());
    expect(registeredPorts()).toEqual([]);
    expect(sites(solid)).toEqual([]);
    stop();
  });
  it('state@1 in use puts each state’s border on the pen — a place along it — and stopping takes it back (D5)', () => {
    const s = createSession();
    const stop = followPacks(s);
    const box = s.addStroke(handRect(100, 100, 200, 90, { seed: 5 }), next(4000));
    const sites = () => magnetSites(s.getState().nodes.get(box)!, s.getState().nodes).filter((x) => x.kind === 'along:state');
    expect(sites()).toEqual([]);
    s.use('state@1', next(4000));
    expect(registeredPorts()).toEqual(['state']);
    const along = sites();
    expect(along.length).toBeGreaterThan(8);
    // Somewhere along each of its four sides, and nowhere off its border.
    expect(along.some((x) => Math.abs(x.point.y - 100) < 6)).toBe(true);
    expect(along.some((x) => Math.abs(x.point.x - 300) < 6)).toBe(true);
    expect(along.some((x) => Math.abs(x.point.y - 190) < 6)).toBe(true);
    expect(along.some((x) => Math.abs(x.point.x - 100) < 6)).toBe(true);
    expect(along.every((x) => x.point.x > 94 && x.point.x < 306 && x.point.y > 94 && x.point.y < 196)).toBe(true);
    s.unuse('state@1', next());
    expect(registeredPorts()).toEqual([]);
    expect(sites()).toEqual([]);
    stop();
  });
  it('er@1 in use puts each entity’s border on the pen — a place along it — and stopping takes it back (D6)', () => {
    const s = createSession();
    const stop = followPacks(s);
    const box = s.addStroke(handRect(100, 100, 200, 90, { seed: 5 }), next(4000));
    const sites = () => magnetSites(s.getState().nodes.get(box)!, s.getState().nodes).filter((x) => x.kind === 'along:er');
    expect(sites()).toEqual([]);
    s.use('er@1', next(4000));
    expect(registeredPorts()).toEqual(['er']);
    const along = sites();
    expect(along.length).toBeGreaterThan(8);
    // Somewhere along each of its four sides, and nowhere off its border.
    expect(along.some((x) => Math.abs(x.point.y - 100) < 6)).toBe(true);
    expect(along.some((x) => Math.abs(x.point.x - 300) < 6)).toBe(true);
    expect(along.some((x) => Math.abs(x.point.y - 190) < 6)).toBe(true);
    expect(along.some((x) => Math.abs(x.point.x - 100) < 6)).toBe(true);
    expect(along.every((x) => x.point.x > 94 && x.point.x < 306 && x.point.y > 94 && x.point.y < 196)).toBe(true);
    s.unuse('er@1', next());
    expect(registeredPorts()).toEqual([]);
    expect(sites()).toEqual([]);
    stop();
  });
});

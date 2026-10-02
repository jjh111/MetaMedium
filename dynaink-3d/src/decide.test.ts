// The decision seat, measured on **fixture 1** — John's own castle sketch.
//
// The board is not rebuilt here: `fixtures/john-2026-09-16-castle-sketch.mm.log`
// is replayed, so the questions below are asked about the very drawing
// `SHARD-3D-PUSH-2.md` §0 argues over and the part sentences are word for word
// the ones `fixtures/exchanges/castle-sketch.ideal.json` was answered about.
//
// What is pinned:
//
//   1. the questions the space asks a decision seat — a closed candidate list
//      every time, no-match always on offer, and no node id the seat could get
//      wrong;
//   2. the measurement — agreement counted only where the engine has a reading
//      of its own, flat counted separately, and the whole table held in
//      `fixtures/decisions/castle-sketch.stub.json` so it cannot drift quietly;
//   3. the invariants: the engine's own reading survives the seat, a flat
//      answer is never held, and no name the human did not type can be picked.
//
// Everything here runs against the **stub** transport. Its numbers are stub
// numbers: they measure the harness and the plumbing, and say nothing whatever
// about how well any decision model would answer these questions.

/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  createDecideParticipant,
  createStubDecideTransport,
  interpretationsOf,
  NO_MATCH,
  type StubAnswer,
} from 'metamedium-core';
import { createLog, type Log } from './log';
import { decodeBoard } from './export';
import { deriveTree } from './solid';
import { hullReadOf, partsOfHull } from './parts';
import { NAMED, v3 } from './plane';
import type { HullStep } from './op';
import {
  spaceQuestions,
  engineReadings,
  nameCandidates,
  measureDecisions,
  decisionTable,
  SHAPE_CANDIDATES,
  COLOUR_CANDIDATES,
} from './decide';

const LOGS = import.meta.glob('../fixtures/*.mm.log', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const BOOKS = import.meta.glob('../fixtures/decisions/*.json', { eager: true }) as Record<
  string,
  { default: DecisionFixture }
>;

/** What a decision fixture holds — `fixtures/decisions/README.md` says why. */
interface DecisionFixture {
  board: string;
  how: string;
  words: string;
  seat: string;
  book: Record<string, StubAnswer>;
  batchMs: number;
  table: string[];
  why: string;
}

const fixture = BOOKS['../fixtures/decisions/castle-sketch.stub.json']!.default;

const blind = { silhouettes: () => [], spanAlong: () => 0, silhouetteOn: () => null };

/**
 * Fixture 1, replayed — and then the space seam wired from the parts really
 * cut, through the same `hullReadOf` the surface wires, so the test and the
 * surface can never each decide differently (`namedparts.test.ts`'s own rule).
 */
function castleFixture(): Log {
  const log = createLog();
  log.sees(blind);
  const { events, skipped } = decodeBoard(LOGS['../fixtures/john-2026-09-16-castle-sketch.mm.log']);
  expect(skipped).toBe(0);
  log.session.load(events);
  const solidId = log.solids()[0]!.id;

  /** Re-cut on every ask, because the tree moves under it (invariant 4). */
  const read = () => {
    const solid = log.solidOf(solidId)!;
    const step = solid.tree.steps.find((s) => s.op === 'hull' && !s.on) as HullStep;
    const { geometry } = deriveTree(solid.tree, {});
    const found = partsOfHull(step, geometry);
    const box = new THREE.Box3();
    if (geometry) {
      geometry.computeBoundingBox();
      box.copy(geometry.boundingBox ?? box);
    }
    const claim = step.footprint ? step.claims.find((c) => c.id === step.footprint) ?? null : null;
    return {
      found,
      read: hullReadOf(
        found,
        claim,
        { min: v3(box.min.x, box.min.y, box.min.z), max: v3(box.max.x, box.max.y, box.max.z) },
        (name) => {
          const which = (['foundation', 'height', 'width'] as const).find((n) => n === name);
          return which ? NAMED[which]('world') : null;
        }
      ),
    };
  };
  log.sees({
    ...blind,
    partsOf: () => read().found.parts.map((p) => p.sentence),
    claimsOfPart: (_s, partId) => read().found.parts.find((p) => p.id === partId)?.from ?? [],
    hullOf: () => read().read,
  });
  return log;
}

const sceneOf = (log: Log) => log.scene(fixture.words);

/** The seat, with the fixture's own written-down book in it. */
const seatIn = (log: Log, book = fixture.book) =>
  createDecideParticipant(log.session, createStubDecideTransport(book, { via: fixture.seat }), 6000, {
    name: 'seat',
  });

/** The timing line is the one thing in the table that cannot be pinned. */
const withoutTiming = (lines: string[]) => lines.filter((l) => !l.startsWith('the batch took'));

// ---- 1 · the questions ------------------------------------------------------

describe('what the space asks a decision seat', () => {
  it('asks about every mark and every part of the standing hull', () => {
    const scene = sceneOf(castleFixture());
    const qs = spaceQuestions(scene);
    const ids = qs.map((q) => q.id);

    // Fixture 1: four marks — the footprint and three ⊓ — and two parts.
    expect(scene.planes.flatMap((p) => p.marks).length).toBe(4);
    expect(scene.hull!.parts.map((p) => p.id)).toEqual(['part:1', 'part:2']);
    expect(ids).toContain('shape:stroke:1');
    expect(ids).toContain('plays:stroke:9');
    expect(ids).toContain('name:part:2');
    expect(ids).toContain('material:part:1');
    expect(ids).toContain('answers:part:1');
    expect(ids).toContain('about:part:2');
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every Choice is a closed list with no-match on it, and no node id in it', () => {
    const qs = spaceQuestions(sceneOf(castleFixture()));
    const choices = qs.filter((q) => q.kind === 'choice');
    expect(choices.length).toBeGreaterThan(0);
    for (const q of choices) {
      if (q.kind !== 'choice') continue;
      expect(q.candidates.some((c) => c.id === NO_MATCH)).toBe(true);
      // Ids stay mapped in code: the seat is never handed one it could get wrong.
      for (const c of q.candidates) expect(c.id).not.toMatch(/^(stroke|artifact|part):/);
    }
    // And the node ids ride on `about`, which the seat never sees.
    expect(qs.find((q) => q.id === 'shape:stroke:1')!.about).toEqual(['stroke:1']);
    expect(qs.find((q) => q.id === 'name:part:1')!.about).toEqual([sceneOf(castleFixture()).hull!.solidId]);
  });

  it('the shape question is the rung’s own closed eight, and the material the closed colour list', () => {
    const qs = spaceQuestions(sceneOf(castleFixture()));
    const shape = qs.find((q) => q.id === 'shape:stroke:1')!;
    expect(shape.kind).toBe('choice');
    if (shape.kind === 'choice') {
      expect(shape.candidates.length).toBe(SHAPE_CANDIDATES.length + 1); // + no-match
      expect(shape.candidates.map((c) => c.id)).toContain('rectangle');
      expect(shape.candidates.map((c) => c.id)).not.toContain('hexagon');
    }
    const material = qs.find((q) => q.id === 'material:part:2')!;
    if (material.kind === 'choice') {
      expect(material.candidates.map((c) => c.id)).toEqual([
        ...COLOUR_CANDIDATES.map((c) => c.id),
        NO_MATCH,
      ]);
    }
  });

  it('a name can only be one of the human’s own words, or one the library holds', () => {
    const scene = sceneOf(castleFixture());
    const names = nameCandidates(scene).map((c) => c.id);
    // “castle with green tops”: the colour word and the stopword are not names.
    expect(names).toEqual(['castle', 'tops']);
    // The seat cannot say “turret” — nothing offered it. That is the limit, and
    // it is where a decision seat stops and a generator has to start.
    expect(names).not.toContain('turret');
    expect(names).not.toContain('wall');
  });

  it('the engine has a reading for the rungs and no opinion at all about names', () => {
    const scene = sceneOf(castleFixture());
    const engine = engineReadings(scene);
    expect(engine.get('shape:stroke:1')).toBe('rectangle');
    expect(engine.get('plays:stroke:1')).toBe('profile');
    expect(engine.get('plays:stroke:9')).toBe('elevation');
    // stroke:9 is the ⊓ the shape rung placed nothing for — so there is nothing
    // to agree or disagree with, and the harness must not invent one.
    expect(engine.has('shape:stroke:9')).toBe(false);
    expect(engine.has('name:part:1')).toBe(false);
    expect(engine.has('material:part:2')).toBe(false);
  });
});

// ---- 2 · the measurement ----------------------------------------------------

describe('the measurement over fixture 1', () => {
  it('is the table the fixture holds, line for line', async () => {
    const log = castleFixture();
    const m = await measureDecisions(sceneOf(log), seatIn(log), { board: fixture.board, at: 7000 });
    expect(withoutTiming(decisionTable(m))).toEqual(withoutTiming(fixture.table));
  });

  it('counts agreement only where the engine had a reading, and flat apart from both', async () => {
    const log = castleFixture();
    const m = await measureDecisions(sceneOf(log), seatIn(log), { board: fixture.board, at: 7000 });

    expect(m.asked).toBe(16);
    expect(m.answered).toBe(16);
    expect(m.unanswered).toEqual([]);
    // Seven questions the engine itself answers: three shapes it placed and
    // four roles. The eighth mark question — stroke:9's shape — it has no
    // reading for, so it is not comparable to anything.
    expect(m.comparable).toBe(7);
    expect(m.agreed).toBe(6);
    expect(m.flat).toBe(4);
    expect(m.rows.find((r) => r.id === 'shape:stroke:2')!.agreed).toBe(false);
    expect(m.rows.find((r) => r.id === 'shape:stroke:9')!.agreed).toBeNull();
    expect(m.rows.find((r) => r.id === 'name:part:1')!.agreed).toBeNull();
    expect(m.via).toBe(fixture.seat);
  });

  it('a stub batch is plumbing, and costs like plumbing', async () => {
    const log = castleFixture();
    const m = await measureDecisions(sceneOf(log), seatIn(log), { board: fixture.board, at: 7000 });
    // Not a claim about any model: one in-process call over sixteen questions.
    expect(m.ms).toBeLessThan(1000);
  });

  it('every row carries the question it was asked and the distribution it got back', async () => {
    const log = castleFixture();
    const m = await measureDecisions(sceneOf(log), seatIn(log), { board: fixture.board, at: 7000 });
    for (const row of m.rows) {
      expect(row.reason.startsWith('asked “')).toBe(true);
      expect(row.reason).toMatch(/\d\.\d\d/);
    }
    const material = m.rows.find((r) => r.id === 'material:part:2')!;
    expect(material.reason).toContain('choice among green, red, blue');
    expect(material.reason).toContain('green 0.74');
    const noul = m.rows.find((r) => r.id === 'about:part:2')!;
    expect(noul.reason).toBe(
      "asked “the human's words (“castle with green tops”) are about this part: " +
        `${sceneOf(log).hull!.parts[1].sentence}” — yes 0.88 · no 0.12`
    );
  });
});

// ---- 3 · the invariants -----------------------------------------------------

describe('the seat never takes the engine’s place', () => {
  it('the engine’s own reading of a mark is still there after the batch', async () => {
    const log = castleFixture();
    const tier0 = () => {
      const state = log.session.getState();
      return interpretationsOf(state.nodes.get('stroke:1')!, state.nodes).filter((r) => r.tier === 0);
    };
    const before = tier0().map((r) => `${r.label} ${r.weight.toFixed(2)}`);
    await measureDecisions(sceneOf(log), seatIn(log), { board: fixture.board, at: 7000 });
    // Not one of them moved, and not one of them went.
    expect(tier0().map((r) => `${r.label} ${r.weight.toFixed(2)}`)).toEqual(before);
    // The mark's readings GREW — a decision is a row beside the engine's, in
    // the same certainty column, ranked with it rather than in place of it.
    expect(log.markOf('stroke:1')!.readings.length).toBeGreaterThan(before.length);
    expect(log.markOf('stroke:1')!.readings[0].label).toBe('rectangle');

    const state = log.session.getState();
    const reads = interpretationsOf(state.nodes.get('stroke:1')!, state.nodes);
    expect(reads.find((r) => r.tier === 0 && r.label === 'rectangle')).toBeDefined();
    // ...and the seat's is beside it, held, attributed, at its own tier.
    const seat = reads.find((r) => r.sourceName === 'seat')!;
    expect(seat.tier).toBe(1.5);
    expect(seat.blessed).toBe(false);
    expect(seat.reasoning).toContain('asked “what shape is');
  });

  it('a flat answer lands nothing on the board', async () => {
    const log = castleFixture();
    const m = await measureDecisions(sceneOf(log), seatIn(log), { board: fixture.board, at: 7000 });
    // stroke:9 is the one the stub was told nothing about.
    expect(m.rows.find((r) => r.id === 'shape:stroke:9')!.flat).toBe(true);
    const state = log.session.getState();
    const reads = interpretationsOf(state.nodes.get('stroke:9')!, state.nodes);
    const fromSeat = reads.filter((r) => r.sourceName === 'seat');
    // Only the role question was answered for stroke:9; the shape one was flat.
    expect(fromSeat.map((r) => r.label)).toEqual(['elevation']);
  });

  it('the seat writes no geometry: nothing it says changes the hull', async () => {
    const log = castleFixture();
    const before = log.solidOf(log.solids()[0]!.id)!.tree.steps.length;
    await measureDecisions(sceneOf(log), seatIn(log), { board: fixture.board, at: 7000 });
    expect(log.solidOf(log.solids()[0]!.id)!.tree.steps.length).toBe(before);
    expect(log.solids().length).toBe(1);
    // No part gained a name or a colour: a decision is held beside the board,
    // and binding one is a separate, human act.
    expect(sceneOf(log).hull!.parts.every((p) => !p.name && !p.colour)).toBe(true);
  });

  it('with an empty book the whole batch is flat, and the board is untouched', async () => {
    const log = castleFixture();
    const m = await measureDecisions(sceneOf(log), seatIn(log, {}), { board: fixture.board, at: 7000 });
    expect(m.flat).toBe(m.answered);
    expect(m.held).toBe(0);
    expect(m.agreed).toBe(0);
    expect(m.comparable).toBe(0);
    const state = log.session.getState();
    expect(
      interpretationsOf(state.nodes.get('stroke:1')!, state.nodes).some((r) => r.sourceName === 'seat')
    ).toBe(false);
  });
});

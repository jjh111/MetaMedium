// Push 2, G3 — **the brief a small model can answer**, and what comes back.
//
// Three things are pinned here, and the middle one is the package:
//
//   1. the brief a standing HULL gets — its shape, and its LENGTH, because a
//      brief a small model can answer is one it does not spend its reply
//      restating;
//   2. the reply contract read — strict, repaired, and everything outside the
//      closed vocabulary dropped AND COUNTED, never coerced;
//   3. the landing — a name bound to a part, a material painted on it, a small
//      op scoped to its own prism, a regen over one part alone, and undo.
//
// And the exchanges in `fixtures/exchanges/` are read as files, so the contract
// is pinned against text models actually produced rather than against text this
// repo wrote for itself.

/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import type { Point } from 'metamedium-core';
import { createLog, type Log, type SpaceRead } from './log';
import { deriveTree } from './solid';
import { describeSpace, partIdsOf, HERE_ON_A_HULL } from './brief';
import { messagesFor, parseProposal, PART_OPS, type Proposal } from './generator';
import { hullReadOf, partsOfHull } from './parts';
import { foundation, normalize, cross, mul, sub, uAxis, vAxis, NAMED, v3, type Plane, type Vec3 } from './plane';
import type { HullStep, PlaneRef } from './op';
import * as THREE from 'three';

const SCALE = 0.012;

/**
 * The exchanges, as MODULES rather than off the disk — `export.test.ts`'s own
 * rule and the reason `resolveJsonModule` is on: the shard's tests carry no
 * node types, so a fixture travels with the bundle it is imported into and a
 * test that reads one needs no filesystem at all. `eager` so the table below
 * can be built at collection time.
 */
const EXCHANGES = import.meta.glob('../fixtures/exchanges/*.json', { eager: true }) as Record<
  string,
  { default: Exchange }
>;

/** One kept exchange, as `fixtures/exchanges/README.md` describes the shape. */
interface Exchange {
  board: string;
  contract: 'parts' | 'steps-and-profiles';
  words: string;
  partsOffered: string[];
  model: string;
  through?: string;
  ms?: number;
  system: string;
  brief: string;
  reply: string;
  repaired: boolean;
  landed?: { named?: string[]; painted?: string[]; steps?: number; dropped?: string[]; note?: string };
  why: string;
}

const exchange = (name: string): Exchange =>
  EXCHANGES[`../fixtures/exchanges/${name}`]!.default;

const blindSpace: SpaceRead = {
  silhouettes: () => [],
  spanAlong: () => 0,
  silhouetteOn: () => null,
};

// ---- the board: John's own castle sketch -----------------------------------
// The same numbers `parts.test.ts` §5 argues about — a 6 × 4 plan and three ⊓
// from two standpoints — so the two files are arguing about one drawing, and
// this one inherits its honest count: **two parts, not three**.

function loop(corners: Point[], per = 20): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    for (let s = 0; s < per; s++) {
      const t = s / per;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  out.push(corners[0]);
  return out;
}

const rect = (x: number, y: number, w: number, h: number) =>
  loop([{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }]);

function line(a: Point, b: Point, per: number): Point[] {
  const out: Point[] = [];
  for (let i = 0; i <= per; i++) {
    const t = i / per;
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
}

function viewPlane(from: Vec3, at: Vec3): Plane {
  const look = normalize(sub(at, from));
  const normal = mul(look, -1);
  const right = normalize(cross(look, { x: 0, y: 1, z: 0 }));
  const up = normalize(cross(look, right));
  return { origin: at, normal, up, source: 'view', name: 'view', why: 'a free view' };
}

/** Where the GROUND crosses a plane, at a given u — in that plane's own v. */
function groundV(plane: Plane, u: number): number {
  const U = uAxis(plane);
  const V = vAxis(plane);
  return -(plane.origin.y + u * U.y) / V.y;
}

/** A ⊓ in a plane's own (u, v), both feet on the world ground. +v runs DOWN. */
function tower(plane: Plane, u: number, w: number, tall: number, per = 10): Point[] {
  const a = groundV(plane, u);
  const b = groundV(plane, u + w);
  return [
    ...line({ x: u, y: a }, { x: u, y: a - tall }, per),
    ...line({ x: u, y: a - tall }, { x: u + w, y: b - tall }, per),
    ...line({ x: u + w, y: b - tall }, { x: u + w, y: b }, per),
  ];
}

const uOf = (plane: Plane, at: Vec3) => {
  const U = uAxis(plane);
  return (at.x - plane.origin.x) * U.x + (at.y - plane.origin.y) * U.y + (at.z - plane.origin.z) * U.z;
};

/**
 * A board with John's castle standing, and the SPACE seam filled in from the
 * parts really cut — through the same `hullReadOf` the surface wires, so the
 * tests and the surface can never each decide differently.
 */
function castleBoard() {
  const V0 = viewPlane({ x: 9, y: 4.5, z: 9 }, { x: 0, y: 1.2, z: 0 });
  const V1 = viewPlane({ x: -3, y: 4.5, z: 12 }, { x: 0, y: 1.2, z: 0 });
  const log = createLog();
  log.sees(blindSpace);
  const plan = log.add(rect(-3, -2, 6, 4), foundation(), SCALE, 1000);
  const a = log.add(tower(V0, uOf(V0, { x: -2.4, y: 0, z: -1.4 }) - 0.5, 1.0, 2.6), V0, SCALE, 2000);
  const b = log.add(tower(V0, uOf(V0, { x: 2.4, y: 0, z: -1.4 }) - 0.5, 1.0, 2.6), V0, SCALE, 3000);
  const w = log.add(tower(V1, uOf(V1, { x: 0, y: 0, z: 1.8 }) - 1.1, 2.2, 1.7), V1, SCALE, 4000);
  log.hull(log.hullable()!, 5000);
  const solidId = log.solids()[0].id;

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
      step,
      geometry,
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
    ...blindSpace,
    partsOf: () => read().found.parts.map((p) => p.sentence),
    claimsOfPart: (_s, partId) => read().found.parts.find((p) => p.id === partId)?.from ?? [],
    hullOf: () => read().read,
  });
  // A real participant: `attachCode` is the session's own door, and a version
  // written in the name of one that never joined does not land.
  const by = { id: log.joinAgent('qwen3:8b', 'local', 5500), name: 'qwen3:8b' };
  return { log, solidId, plan, a, b, w, read, by };
}

/** The whole reply, as a `Proposal`, read against the part ids on the board. */
function reply(log: Log, text: string): Proposal {
  return parseProposal(text, { parts: partIdsOf(log.scene('')) });
}

// ---- 1 · the brief a hull gets ----------------------------------------------

describe('the brief a standing hull gets', () => {
  it('leads with what stands, the footprint, the extent and the parts — and not the planes', () => {
    const { log } = castleBoard();
    const text = describeSpace(log.scene('castle with green tops'));

    expect(text.startsWith('WHAT STANDS —')).toBe(true);
    expect(text).toMatch(/a HULL the space stood from the drawing/);
    expect(text).toMatch(/it is the extent your reply must stay inside/);
    expect(text).toMatch(/^THE FOOTPRINT: [\d.]+ × [\d.]+ u, drawn on the ground as stroke:\d+\.$/m);
    expect(text).toMatch(/^THE EXTENT, in world units: x .+, y .+, z .+\./m);
    expect(text).toMatch(/THE PARTS — \d+ piece/);
    expect(text).toMatch(/Do not invent geometry for one/);
    expect(text).toMatch(/THE WORDS THE HUMAN TYPED: “castle with green tops”/);

    // The long brief's own sections are NOT here: on this path the model is not
    // being asked to read the drawing.
    expect(text).not.toMatch(/THE PLANES, AND WHAT LIES ON EACH/);
    expect(text).not.toMatch(/PARTS OF WHAT STANDS/);

    // …and the paragraph at the end is the hull's, which forbids the very thing
    // the other one offers.
    expect(text).toContain(HERE_ON_A_HULL);
    expect(text).toMatch(/You do not write geometry, and you do not add profiles/);
    expect(text).not.toMatch(/You may add PROFILES/);
  });

  it('is SHORT: John’s castle is well under 1200 characters before HERE', () => {
    const { log } = castleBoard();
    const text = describeSpace(log.scene('castle with green tops'));
    const here = text.indexOf(HERE_ON_A_HULL);
    expect(here).toBeGreaterThan(0);
    // A brief a small model can answer is one it does not spend its reply
    // restating. The measured number on John's own board is ~1050.
    expect(here).toBeLessThan(1200);
  });

  it('says every part in the engine’s own id, with its numbers and its place', () => {
    const { log, read } = castleBoard();
    const text = describeSpace(log.scene('castle'));
    for (const part of read().found.parts) {
      expect(text).toContain(part.sentence);
      expect(part.sentence).toMatch(/^part \d+/);
    }
  });

  it('a board with no hull keeps the LONG brief, and the other contract', () => {
    const log = createLog();
    log.sees(blindSpace);
    log.add(rect(0, 0, 4, 4), foundation(), SCALE, 1000);
    const scene = log.scene('a keep');
    expect(partIdsOf(scene)).toEqual([]);
    const text = describeSpace(scene);
    expect(text).toMatch(/THE PLANES, AND WHAT LIES ON EACH/);
    expect(text).toMatch(/You may add PROFILES/);
  });

  it('the prompt asks for the contract the brief is in, and only that one', () => {
    const parts = messagesFor('…', 'castle', { parts: true })[0].content;
    expect(parts).toMatch(/\{"parts":\[ … \], "steps":\[ … \]\}/);
    expect(parts).toMatch(/There is no "profiles" list on this reply/);
    for (const op of PART_OPS) expect(parts).toContain(op);
    expect(parts).not.toMatch(/"op":"extrude"/);

    const tree = messagesFor('…', 'castle', {})[0].content;
    expect(tree).toMatch(/"op":"extrude"/);
    expect(tree).not.toMatch(/"op":"remove"/);
  });

  it('a regen over a part says which parts may change, and that the rest are fixed', () => {
    const { log } = castleBoard();
    const text = describeSpace(log.scene('taller', { mutableParts: ['part:1'] }));
    expect(text).toMatch(/ONLY THESE PARTS MAY CHANGE/);
    expect(text).toMatch(/a reply about one is dropped, and their names stay exactly as they are/);
    expect(text).toMatch(/^ {2}part:1$/m);
  });
});

// ---- 2 · the reply, read -----------------------------------------------------

describe('the reply contract, read', () => {
  const KNOWN = { parts: ['part:1', 'part:2'] };

  it('strict JSON first: names and materials come back on the parts', () => {
    const p = parseProposal(
      '{"parts":[{"id":"part:1","name":"turret","material":"green","why":"the tall one"}]}',
      KNOWN
    );
    expect(p.parts).toEqual([{ id: 'part:1', name: 'turret', material: { colour: 'green' }, why: 'the tall one' }]);
    expect(p.dropped).toBe(0);
    expect(p.reasoning).toMatch(/1 part named, 1 material bound/);
  });

  it('repaired, never guessed — a trailing comma and a template literal still read', () => {
    const p = parseProposal('```json\n{"parts":[{"id":"part:2","name":`turret`,},],}\n```', KNOWN);
    expect(p.parts?.[0]).toMatchObject({ id: 'part:2', name: 'turret' });
  });

  it('a part id this hull does not have is DROPPED AND COUNTED, with the ids it does have', () => {
    const p = parseProposal('{"parts":[{"id":"part:9","name":"ghost"},{"id":"part:1","name":"wall"}]}', KNOWN);
    expect(p.parts?.map((x) => x.id)).toEqual(['part:1']);
    expect(p.dropped).toBe(1);
    expect(p.droppedWhy[0]).toMatch(/part:9, and this hull has no such part — its parts are part:1, part:2/);
  });

  it('a colour outside the closed list is dropped WITH ITS REASON, and the name stays', () => {
    const p = parseProposal('{"parts":[{"id":"part:1","name":"wall","material":"stone"}]}', KNOWN);
    expect(p.parts).toEqual([{ id: 'part:1', name: 'wall' }]);
    expect(p.droppedWhy[0]).toMatch(/the colour word “stone” on part:1 is not one the shard can paint/);
  });

  it('a material said as a bare word reads the same as the object', () => {
    const a = parseProposal('{"parts":[{"id":"part:1","material":"green"}]}', KNOWN);
    const b = parseProposal('{"parts":[{"id":"part:1","material":{"colour":"green"}}]}', KNOWN);
    expect(a.parts).toEqual(b.parts);
  });

  it('names only, and material only, both stand', () => {
    const named = parseProposal('{"parts":[{"id":"part:1","name":"wall"},{"id":"part:2","name":"turret"}]}', KNOWN);
    expect(named.parts).toHaveLength(2);
    expect(named.partSteps).toEqual([]);

    const painted = parseProposal('{"parts":[{"id":"part:2","material":"green"}]}', KNOWN);
    expect(painted.parts).toEqual([{ id: 'part:2', material: { colour: 'green' } }]);
    expect(painted.parts?.[0].name).toBeUndefined();
  });

  it('an entry that names nothing and paints nothing is dropped, and says so', () => {
    const p = parseProposal('{"parts":[{"id":"part:1"}]}', KNOWN);
    expect(p.parts).toEqual([]);
    expect(p.droppedWhy[0]).toMatch(/part:1 was named nothing and painted nothing/);
  });

  it('the small ops read by part id; anything outside the part vocabulary is dropped', () => {
    const p = parseProposal(
      JSON.stringify({
        steps: [
          { id: 's1', op: 'boss', part: 'part:1', height: 0.6 },
          { id: 's2', op: 'cut', part: 'part:2', shape: 'circle', centre: { x: 0, y: 0 }, r: 0.3, depth: 0.4 },
          { id: 's3', op: 'mirror', part: 'part:1', plane: 'height' },
          { id: 's4', op: 'remove', part: 'part:2' },
          { id: 's5', op: 'extrude', part: 'part:1', depth: 2 },
          { id: 's6', op: 'revolve', part: 'part:9' },
        ],
      }),
      KNOWN
    );
    expect(p.partSteps?.map((s) => s.op)).toEqual(['boss', 'cut', 'mirror', 'remove']);
    expect(p.droppedWhy.join(' ')).toMatch(/whose op is “extrude” — outside the part vocabulary/);
    expect(p.droppedWhy.join(' ')).toMatch(/whose op is “revolve”/);
    // …and the tree path is untouched by any of it.
    expect(p.steps).toEqual([]);
  });

  it('a boss with no height, and a cut with no size, are dropped rather than invented', () => {
    const p = parseProposal(
      JSON.stringify({
        steps: [
          { id: 's1', op: 'boss', part: 'part:1' },
          { id: 's2', op: 'cut', part: 'part:1', shape: 'circle' },
          { id: 's3', op: 'cut', part: 'part:1', shape: 'triangle', w: 1, h: 1 },
        ],
      }),
      KNOWN
    );
    expect(p.partSteps).toEqual([]);
    expect(p.droppedWhy.join(' ')).toMatch(/says no height, and nothing in the drawing says one for it/);
    expect(p.droppedWhy.join(' ')).toMatch(/has no radius/);
    expect(p.droppedWhy.join(' ')).toMatch(/a hole is a circle or a rectangle/);
  });

  it('a step with NO part is the other contract’s, and goes there', () => {
    const p = parseProposal(
      '{"steps":[{"id":"s1","op":"extrude","profile":"stroke:1","depth":2}],"profiles":[]}',
      KNOWN
    );
    expect(p.steps).toHaveLength(1);
    expect(p.partSteps).toEqual([]);
  });

  it('with no part ids handed in, nothing is checked against them', () => {
    const p = parseProposal('{"parts":[{"id":"part:77","name":"tower"}]}');
    expect(p.parts).toHaveLength(1);
    expect(p.dropped).toBe(0);
  });
});

// ---- 3 · the landing ---------------------------------------------------------

describe('a reply about the parts, landed', () => {

  it('names bind to parts, and every reader sees them', () => {
    const { log, solidId, read, by } = castleBoard();
    const p = reply(log, '{"parts":[{"id":"part:1","name":"turret","material":"green"}]}');
    const out = log.applyParts(solidId, p, by)!;
    expect(out.named).toEqual([{ partId: 'part:1', name: 'turret' }]);
    expect(out.painted).toEqual([{ partId: 'part:1', colour: 'green' }]);

    // the part itself
    const part = read().found.parts.find((x) => x.id === 'part:1')!;
    expect(part.name).toBe('turret');
    expect(part.material).toEqual({ colour: 'green' });
    expect(part.sentence).toMatch(/^part 1 “turret”, green — /);

    // namesOf
    const inPlay = log.namesInPlay();
    expect(inPlay.map((n) => n.name)).toContain('turret');
    const turret = inPlay.find((n) => n.name === 'turret')!;
    expect(turret.partId).toBe('part:1');
    expect(turret.colour).toBe('green');
    expect(turret.op).toBe('hull');

    // the brief
    expect(describeSpace(log.scene(''))).toMatch(/“turret” = artifact:\d+\/part:1, material green/);
  });

  it('the name is held on the CLAIMS, so a dropped claim cannot slide it', () => {
    const { log, solidId, read, by } = castleBoard();
    const p = reply(log, '{"parts":[{"id":"part:1","name":"turret"}]}');
    log.applyParts(solidId, p, by);
    const claims = read().found.parts.find((x) => x.id === 'part:1')!.from;
    const step = log.solidOf(solidId)!.tree.steps.find((s) => s.op === 'hull') as HullStep;
    expect(step.said?.[0].claims.slice().sort()).toEqual(claims.slice().sort());
    expect(step.said?.[0].said).toBe('part:1');
    expect(step.said?.[0].by).toBe('qwen3:8b');
    expect(step.said?.[0].reasoning).toMatch(/Held on the claims it was cut from/);
  });

  it('what it cannot name it leaves: a reply that names nothing still lands the material', () => {
    const { log, solidId, read, by } = castleBoard();
    const p = reply(log, '{"parts":[{"id":"part:1","material":"green"}]}');
    const out = log.applyParts(solidId, p, by)!;
    expect(out.named).toEqual([]);
    expect(out.painted).toEqual([{ partId: 'part:1', colour: 'green' }]);
    const part = read().found.parts.find((x) => x.id === 'part:1')!;
    expect(part.name).toBeUndefined();
    expect(part.material).toEqual({ colour: 'green' });
    // …and it keeps the engine's own id in its own sentence.
    expect(part.sentence).toMatch(/^part 1, green — /);
  });

  it('a small op by part id becomes a step scoped to that part, and is clipped to the hull', () => {
    const { log, solidId, by } = castleBoard();
    const before = log.solidOf(solidId)!.tree.steps.length;
    const p = reply(
      log,
      '{"parts":[{"id":"part:1","name":"turret"}],"steps":[{"id":"s1","op":"boss","part":"part:1","height":0.6,"why":"taller"}]}'
    );
    const out = log.applyParts(solidId, p, by)!;
    const tree = log.solidOf(solidId)!.tree;
    expect(tree.steps.length).toBe(before + 2); // the boss, and the engine's clip
    const boss = tree.steps.find((s) => s.op === 'boss')!;
    expect(boss.part).toBe('part:1');
    expect(boss.by).toBe('qwen3:8b');
    expect(boss.reasoning).toMatch(/raised 0\.60 u from its own top/);
    expect(boss.reasoning).toMatch(/taller/);
    // The clip is the ENGINE's, after the proposal, and it is the last word.
    const clip = tree.steps[tree.steps.length - 1];
    expect(clip.op).toBe('massing');
    expect(clip.reasoning).toMatch(/nothing proposed may leave it/);
    expect(out.steps.map((s) => s.op)).toEqual(['boss', 'massing']);
    // …and the body still derives.
    expect(deriveTree(tree, {}).geometry).toBeTruthy();
  });

  it('a cut by part id is measured on that part’s own top face', () => {
    const { log, solidId, read, by } = castleBoard();
    const top = read().found.parts[0].bounds.max.y;
    const p = reply(
      log,
      '{"steps":[{"id":"s1","op":"cut","part":"part:1","shape":"circle","centre":{"x":0,"y":0},"r":0.2}]}'
    );
    log.applyParts(solidId, p, by);
    const cut = log.solidOf(solidId)!.tree.steps.find((s) => s.op === 'cut')!;
    expect(cut.part).toBe('part:1');
    expect((cut as { plane: PlaneRef }).plane.origin.y).toBeCloseTo(top, 4);
    expect(cut.reasoning).toMatch(/through its top face, through — as far as the part reaches/);
  });

  it('`remove` by part id takes that part’s claim out, and is one undo', () => {
    const { log, solidId, by } = castleBoard();
    const step = () => log.solidOf(solidId)!.tree.steps.find((s) => s.op === 'hull') as HullStep;
    const before = step().claims.length;
    const parts = log.scene('').hull!.parts;
    // A part claimed by ONE stroke is the one that can be unsaid.
    const alone = parts.find((x) => x.id === 'part:1')!;
    void alone;
    const p = reply(log, '{"steps":[{"id":"s1","op":"remove","part":"part:1","why":"not that one"}]}');
    const out = log.applyParts(solidId, p, by);
    // On this board part:1 is claimed by two views, so it is not unsaid by one
    // of them — and it says so rather than silently doing nothing.
    if (out && !out.dropped.length) expect(step().claims.length).toBe(before - 1);
    else expect(out!.dropped.join(' ')).toMatch(/claimed by more than one view|fewer than two claims/);
  });

  it('a regen re-asks with only that part mutable, and drops what is about another', () => {
    const { log, solidId, by } = castleBoard();
    log.applyParts(solidId, reply(log, '{"parts":[{"id":"part:1","name":"turret"}]}'), by);

    const again = reply(
      log,
      JSON.stringify({
        parts: [{ id: 'part:1', name: 'turret' }],
        steps: [
          { id: 's1', op: 'boss', part: 'part:1', height: 0.8 },
          { id: 's2', op: 'boss', part: 'part:2', height: 0.8 },
        ],
      })
    );
    const out = log.applyParts(solidId, again, by, ['part:1'])!;
    expect(out.steps.filter((s) => s.op === 'boss')).toHaveLength(1);
    expect(out.dropped.join(' ')).toMatch(/is about part:2, and only part:1 may change — it was left alone/);

    // …and the brief said so before it was asked.
    expect(describeSpace(log.scene('taller', { mutableParts: ['part:1'] }))).toMatch(/part:1 \(“turret”\)/);
  });

  it('a regen replaces the last reply’s steps on that part, not the whole tree', () => {
    const { log, solidId, by } = castleBoard();
    log.applyParts(
      solidId,
      reply(log, '{"steps":[{"id":"s1","op":"boss","part":"part:1","height":0.4}]}'),
      by
    );
    const first = log.solidOf(solidId)!.tree.steps.find((s) => s.op === 'boss')!.id;
    const hullId = log.solidOf(solidId)!.tree.steps.find((s) => s.op === 'hull')!.id;

    const out = log.applyParts(
      solidId,
      reply(log, '{"steps":[{"id":"s1","op":"boss","part":"part:1","height":0.9}]}'),
      by,
      ['part:1']
    )!;
    expect(out.replaced).toContain(first);
    const tree = log.solidOf(solidId)!.tree;
    expect(tree.steps.filter((s) => s.op === 'boss')).toHaveLength(1);
    expect(tree.steps.find((s) => s.op === 'boss')!.reasoning).toMatch(/raised 0\.90 u/);
    // Every other step kept its own id.
    expect(tree.steps.find((s) => s.op === 'hull')!.id).toBe(hullId);
  });

  it('one undo takes the whole act, and the names go with it', () => {
    const { log, solidId, read, by } = castleBoard();
    const versions = () => log.solidOf(solidId)!.tree.steps.length;
    const before = versions();
    log.applyParts(
      solidId,
      reply(
        log,
        '{"parts":[{"id":"part:1","name":"turret","material":"green"}],"steps":[{"id":"s1","op":"boss","part":"part:1","height":0.5}]}'
      ),
      by
    );
    expect(log.namesInPlay().some((n) => n.name === 'turret')).toBe(true);
    log.undo();
    expect(versions()).toBe(before);
    expect(log.namesInPlay().some((n) => n.name === 'turret')).toBe(false);
    expect(read().found.parts.every((p) => !p.name)).toBe(true);
  });

  it('the hand’s own word is the same saying, in the hand’s name — tier 1', () => {
    const { log, solidId, read } = castleBoard();
    expect(log.nameParts(solidId, [{ partId: 'part:1', name: 'keep', colour: 'blue' }], 'the hand said so')).toEqual({
      named: 1,
      painted: 1,
    });
    const part = read().found.parts.find((x) => x.id === 'part:1')!;
    expect(part.name).toBe('keep');
    expect(part.material).toEqual({ colour: 'blue' });
    // A colour the shard cannot paint is refused rather than written.
    expect(log.nameParts(solidId, [{ partId: 'part:1', colour: 'chartreuse' }], 'no')).toBeNull();
  });

  it('`take` holds a named part as a definition BASED ON the whole', () => {
    const { log, solidId, by } = castleBoard();
    log.applyParts(solidId, reply(log, '{"parts":[{"id":"part:1","name":"turret"}]}'), by);
    log.name(solidId, 'castle');
    const taken = log.take(solidId)!;
    expect(taken.name).toBe('castle');
    expect(taken.definitions).toContain('turret');
    const def = log.definitions().find((d) => d.name === 'turret')!;
    expect(def.basedOn).toBe('castle');
    expect(def.whole).toBeFalsy();
    // A part is material, not a sub-tree of steps — so what is held is the HULL
    // of its own claims.
    expect(def.steps.map((s) => s.op)).toEqual(['hull']);
    expect(def.why).toMatch(/a part of a hull, so what is held is the hull of its own/);
    expect(def.profiles.length).toBeGreaterThan(0);
  });
});

// ---- 4 · the exchanges kept as fixtures --------------------------------------

describe('fixtures/exchanges — the contract, against text models produced', () => {
  const files = Object.keys(EXCHANGES).map((k) => k.split('/').pop()!).sort();

  it('there are exchanges here, and both contracts are among them', () => {
    expect(files.length).toBeGreaterThanOrEqual(3);
    const kinds = new Set(Object.values(EXCHANGES).map((m) => m.default.contract));
    expect(kinds.has('parts')).toBe(true);
    expect(kinds.has('steps-and-profiles')).toBe(true);
  });

  for (const file of Object.keys(EXCHANGES).map((k) => k.split('/').pop()!).sort()) {
    it(`${file} keeps the brief as sent and the reply as received, and still reads`, () => {
      const ex = exchange(file);
      expect(typeof ex.brief).toBe('string');
      // A reply is TEXT until it parses. Half the value of keeping one is the
      // text that did not.
      expect(typeof ex.reply).toBe('string');
      expect(ex.system).toContain('Reply with ONLY a JSON object');
      expect(['parts', 'steps-and-profiles']).toContain(ex.contract);

      const p = parseProposal(ex.reply, ex.partsOffered.length ? { parts: ex.partsOffered } : {});
      if (ex.contract === 'parts') {
        // The brief it answered is the short one, and the prompt forbids
        // profiles — so a reply in this contract has none.
        expect(ex.system).toMatch(/There is no "profiles" list on this reply/);
        expect(ex.brief).toMatch(/THE PARTS — \d+ piece/);
        expect(p.parts!.length + p.partSteps!.length).toBeGreaterThan(0);
        expect(p.profiles).toEqual([]);
        expect(p.steps).toEqual([]);
        for (const part of p.parts!) expect(ex.partsOffered).toContain(part.id);
        for (const step of p.partSteps!) {
          expect(ex.partsOffered).toContain(step.part);
          expect(PART_OPS as readonly string[]).toContain(step.op);
        }
        // What the file says landed is what the parser found.
        if (ex.landed?.named) expect(p.parts!.filter((x) => x.name)).toHaveLength(ex.landed.named.length);
        if (ex.landed?.painted) expect(p.parts!.filter((x) => x.material)).toHaveLength(ex.landed.painted.length);
        if (ex.landed?.dropped) expect(p.droppedWhy).toEqual(ex.landed.dropped);
      } else {
        expect(ex.system).toMatch(/A PROFILE you add is one of exactly these/);
        expect(ex.brief).toMatch(/THE PLANES, AND WHAT LIES ON EACH/);
        expect(p.steps.length + p.profiles.length).toBeGreaterThan(0);
      }
      // Whether a repair was needed is exactly what a fixture records.
      expect(typeof ex.repaired).toBe('boolean');
      if (!ex.repaired) expect(() => JSON.parse(ex.reply.trim())).not.toThrow();
    });
  }

  it('the real local model’s reply is what the contract is settled against', () => {
    const ex = exchange('castle-sketch.qwen3-8b.json');
    expect(ex.model).toBe('qwen3:8b');
    expect(ex.through).toMatch(/Ollama/);
    expect(ex.ms).toBeGreaterThan(0);
    const p = parseProposal(ex.reply, { parts: ex.partsOffered });
    expect(p.parts).toHaveLength(2);
    expect(p.dropped).toBe(0);
    expect(p.parts!.every((x) => x.name && x.material?.colour === 'green')).toBe(true);
  });

  it('the STUB’s reply is imperfect on purpose, and every fault is counted', () => {
    const ex = exchange('castle-sketch.stub.json');
    const p = parseProposal(ex.reply, { parts: ex.partsOffered });
    expect(p.dropped).toBe(3);
    expect(p.droppedWhy.join(' ')).toMatch(/not one the shard can paint/);
    expect(p.droppedWhy.join(' ')).toMatch(/this hull has no such part/);
    expect(p.droppedWhy.join(' ')).toMatch(/outside the part vocabulary/);
    // …and what could be used still stands.
    expect(p.parts!.map((x) => x.name)).toEqual(['wall', 'turret']);
    expect(p.partSteps!.map((x) => x.op)).toEqual(['boss']);
  });

  it('the IDEAL reply lands fully — names, materials and both small ops', () => {
    const { log, solidId, read, by } = castleBoard();
    const ex = exchange('castle-sketch.ideal.json');
    const p = reply(log, ex.reply);
    expect(p.dropped).toBe(0);

    const out = log.applyParts(solidId, p, by)!;
    expect(out.named.map((n) => n.name).sort()).toEqual(['turret', 'wall']);
    expect(out.painted.map((x) => x.colour).sort()).toEqual(['green', 'grey']);
    expect(out.dropped).toEqual([]);
    expect(out.steps.map((s) => s.op)).toEqual(['boss', 'cut', 'massing']);

    const parts = read().found.parts;
    expect(parts.find((x) => x.id === 'part:1')!.name).toBe('wall');
    expect(parts.find((x) => x.id === 'part:2')!.name).toBe('turret');
    expect(deriveTree(log.solidOf(solidId)!.tree, {}).broken).toBeNull();
  });
});

// ---- the seam the surface and the tests share --------------------------------

describe('the hull read is one wiring', () => {
  it('`hullReadOf` gives the footprint, the extent and a step per small op', () => {
    const { read } = castleBoard();
    const { read: hull } = read();
    expect(hull.footprint).toBeTruthy();
    expect(hull.footprint!.w).toBeGreaterThan(0);
    expect(hull.extent.max.y).toBeGreaterThan(hull.extent.min.y);
    expect(hull.parts[0].claims.length).toBeGreaterThan(0);

    const boss = hull.stepFor('part:1', { op: 'boss', height: 0.5 }, 'step:1', 'step:2', 'a model');
    expect(boss?.op).toBe('boss');
    expect(boss?.part).toBe('part:1');
    const mirror = hull.stepFor('part:1', { op: 'mirror', plane: 'height' }, 'step:1', 'step:2');
    expect(mirror?.reasoning).toMatch(/mirrored across the height plane/);
    // A part that is not there gets nothing, rather than something.
    expect(hull.stepFor('part:99', { op: 'boss', height: 1 }, 'step:1', 'step:2')).toBeNull();
  });

  it('a mirror across the height plane really reflects the part’s own footprint', () => {
    const { read } = castleBoard();
    const { read: hull, found } = read();
    const part = found.parts[0];
    const step = hull.stepFor('part:1', { op: 'mirror', plane: 'height' }, 'step:1', 'step:2')!;
    // The height plane is z = 0, so every v (which is z here) is negated.
    const here = part.bounds.getCenter(new THREE.Vector3());
    const mine = step.profile.points.reduce((a, p) => a + p.y, 0) / step.profile.points.length;
    expect(Math.sign(mine || 1)).toBe(-Math.sign(here.z || 1));
  });
});

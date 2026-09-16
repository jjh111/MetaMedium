// P5 — the massing, the extent invariant, the names, and what a failed brief
// leaves behind (SHARD-3D-PLAN §8, §2.6, §6).
//
// The massing is checked GEOMETRICALLY: three profiles whose projections
// overlap are intersected into one body, and the body's bounds are the box the
// three views jointly describe. That is a fact about arithmetic, not about a
// renderer, so the whole file runs with no WebGL — the same way `match.test.ts`
// walks a tree with an injected silhouette.

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ENGINE_PARTICIPANT, type Point } from 'metamedium-core';
import { createLog, type SpaceRead } from './log';
import { deriveTree } from './solid';
import { parseOpTree, type MassingStep, type OpStep } from './op';
import { foundation, height, width } from './plane';
import { parseProposal, propose, type Proposal } from './generator';

const SCALE = 0.012;

function loop(corners: Point[], per = 14): Point[] {
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

const rect = (x: number, y: number, w: number, h: number, per = 20) =>
  loop([{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }], per);

/**
 * The castle's three views, and the box they jointly describe.
 *
 * The plan on the foundation is x ∈ [−2, 2], z ∈ [−1.5, 1.5]; the front on the
 * height plane is x ∈ [−2, 2], y ∈ [0, 3] (+v runs DOWN, so v ∈ [−3, 0]); the
 * side on the width plane is z ∈ [−1.5, 1.5] (+u along −Z, so u ∈ [−1.5, 1.5])
 * and y ∈ [0, 3]. The three prisms share exactly that box.
 */
const PLAN = rect(-2, -1.5, 4, 3);
const FRONT = rect(-2, -3, 4, 3);
const SIDE = rect(-1.5, -3, 3, 3);

/** No renderer: the diff's seam is not what these tests are about. */
const blindSpace: SpaceRead = {
  silhouettes: () => [],
  spanAlong: () => 0,
  silhouetteOn: () => null,
};

function castleBoard() {
  const log = createLog();
  log.sees(blindSpace);
  const planId = log.add(PLAN, foundation(), SCALE, 1000);
  const frontId = log.add(FRONT, height(), SCALE, 2000);
  const sideId = log.add(SIDE, width(), SCALE, 3000);
  return { log, planId, frontId, sideId };
}

// ---- the massing -------------------------------------------------------------

describe('the massing: the drawing is the extent before it has a name', () => {
  it('a lone profile is not a massing — it still waits for an extent (P2)', () => {
    const log = createLog();
    log.sees(blindSpace);
    log.add(PLAN, foundation(), SCALE, 1000);
    expect(log.massable()).toBeNull();
    expect(log.solids()).toHaveLength(0);
  });

  it('two profiles on different world planes whose projections overlap ARE a massing', () => {
    const log = createLog();
    log.sees(blindSpace);
    log.add(PLAN, foundation(), SCALE, 1000);
    expect(log.massable()).toBeNull();
    log.add(FRONT, height(), SCALE, 2000);
    const m = log.massable();
    expect(m).toBeTruthy();
    expect(m!.planes.sort()).toEqual(['foundation', 'height']);
    expect(m!.reasoning).toMatch(/projections overlap/);
  });

  it('two profiles whose projections do NOT overlap are two drawings, not one', () => {
    const log = createLog();
    log.sees(blindSpace);
    log.add(PLAN, foundation(), SCALE, 1000);
    // A front elevation a hundred units away along +X shares no volume with it.
    log.add(rect(98, -3, 4, 3), height(), SCALE, 2000);
    expect(log.massable()).toBeNull();
  });

  it('two profiles on the SAME plane are not a massing — the union of a plane is one view', () => {
    const log = createLog();
    log.sees(blindSpace);
    log.add(PLAN, foundation(), SCALE, 1000);
    log.add(rect(-1, -0.5, 1, 1), foundation(), SCALE, 2000);
    expect(log.massable()).toBeNull();
  });

  it('three profiles stand as one solid in the ENGINE’s name, at tier 1', () => {
    const { log } = castleBoard();
    const m = log.massable()!;
    expect(m.profileIds).toHaveLength(3);
    const made = log.mass(m, 4000)!;
    expect(made.name).toBe('massing');
    expect(made.step.op).toBe('massing');

    const solids = log.solids();
    expect(solids).toHaveLength(1);
    const node = log.session.getState().nodes.get(solids[0].id)!;
    const code = node.reps.find((r) => r.modality === 'code')!;
    expect(code.source).toBe(ENGINE_PARTICIPANT);
    expect(solids[0].named).toBe('engine');
    // Every profile is still ink on the board — ink is never covered.
    expect(log.marks()).toHaveLength(3);
  });

  it('the intersected prisms are the box the three views jointly describe', () => {
    const { log } = castleBoard();
    log.mass(log.massable()!, 4000);
    const { geometry, broken } = deriveTree(log.solids()[0].tree, {});
    expect(broken).toBeNull();
    expect(geometry).toBeTruthy();
    geometry!.computeBoundingBox();
    const b = geometry!.boundingBox!;
    // Within a hair of the drawn box: the prisms are padded by TOOL_OVERLAP at
    // each end along their OWN normal, and the intersection trims that away.
    expect(b.min.x).toBeCloseTo(-2, 1);
    expect(b.max.x).toBeCloseTo(2, 1);
    expect(b.min.y).toBeCloseTo(0, 1);
    expect(b.max.y).toBeCloseTo(3, 1);
    expect(b.min.z).toBeCloseTo(-1.5, 1);
    expect(b.max.z).toBeCloseTo(1.5, 1);
  });

  it('undo takes the massing and leaves every profile where it was', () => {
    const { log } = castleBoard();
    log.mass(log.massable()!, 4000);
    expect(log.solids()).toHaveLength(1);
    log.undo();
    expect(log.solids()).toHaveLength(0);
    expect(log.marks()).toHaveLength(3);
  });

  it('a massing round-trips through its code rep and through a whole replay', () => {
    const { log } = castleBoard();
    log.mass(log.massable()!, 4000);
    const tree = log.solids()[0].tree;
    const node = log.session.getState().nodes.get(log.solids()[0].id)!;
    const code = (node.reps.find((r) => r.modality === 'code')!.data as { code: string }).code;
    expect(parseOpTree(code)).toEqual(tree);

    const fresh = createLog();
    fresh.sees(blindSpace);
    fresh.session.load(log.session.getEvents());
    expect(fresh.solids()[0].tree).toEqual(tree);
  });
});

// ---- the extent invariant ----------------------------------------------------

/** A reply whose turret reaches far outside the drawing, on purpose. */
const OVERREACHING: Proposal = {
  steps: [
    { id: 's1', op: 'extrude', profile: 'stroke:1', depth: 3, name: 'castle', why: 'the plan, grown to the height the front says' },
    { id: 's2', op: 'boss', on: 's1', profile: 'p1', depth: 40, name: 'turret', why: 'a tower' },
  ],
  profiles: [{ id: 'p1', shape: 'circle', plane: 'foundation', centre: { x: 1.4, y: 1 }, r: 0.4 }],
  dropped: 0,
  droppedWhy: [],
  reasoning: 'two steps',
};

describe('the extent invariant is literal: a proposal cannot leave the drawing', () => {
  const agent = { id: 'participant:9', name: 'e2e-stub' };

  it('the model’s tree is clipped to the massing, as a final step in the engine’s name', () => {
    const { log } = castleBoard();
    const solidId = log.mass(log.massable()!, 4000)!.id;
    const by = { id: log.joinAgent('e2e-stub', 'local', 4500), name: agent.name };
    const out = log.applyProposal(solidId, OVERREACHING, by, 5000)!;
    expect(out).toBeTruthy();

    const tree = log.solidOf(solidId)!.tree;
    const last = tree.steps[tree.steps.length - 1] as MassingStep;
    expect(last.op).toBe('massing');
    expect(last.bound).toBe('step:1'); // the massing leaf
    expect(last.on).toBeTruthy();
    expect(last.profiles).toHaveLength(0); // nothing derived is held
    expect(last.by).toBeUndefined(); // the engine's, not the model's
    expect(out.steps.some((s) => s.name === 'turret')).toBe(true);
  });

  it('a boss forty units tall comes back inside the drawing, by geometry', () => {
    const { log } = castleBoard();
    const solidId = log.mass(log.massable()!, 4000)!.id;
    const by = { id: log.joinAgent('e2e-stub', 'local', 4500), name: agent.name };
    log.applyProposal(solidId, OVERREACHING, by, 5000);
    const { geometry, broken } = deriveTree(log.solidOf(solidId)!.tree, {});
    expect(broken).toBeNull();
    geometry!.computeBoundingBox();
    // The turret asked for 40 units of height; the drawing says 3.
    expect(geometry!.boundingBox!.max.y).toBeLessThan(3.2);
    expect(geometry!.boundingBox!.max.y).toBeGreaterThan(2.5);
  });

  it('the model’s own profile is drawn into the log as declared content, in its name', () => {
    const { log } = castleBoard();
    const solidId = log.mass(log.massable()!, 4000)!.id;
    const by = { id: log.joinAgent('e2e-stub', 'local', 4500), name: agent.name };
    const out = log.applyProposal(solidId, OVERREACHING, by, 5000)!;
    expect(out.drawn).toHaveLength(1);
    const mark = log.markOf(out.drawn[0])!;
    // It went through the same door a hand's ink does, so the shape rung read it.
    expect(mark.readings[0].label).toBe('circle');
    expect(mark.plane.name).toBe('foundation');
    const node = log.session.getState().nodes.get(mark.id)!;
    expect(node.reps.find((r) => r.modality === 'stroke')!.source).toBe(by.id);
  });

  it('a profile on a plane this board does not have is dropped and counted', () => {
    const { log } = castleBoard();
    const solidId = log.mass(log.massable()!, 4000)!.id;
    const by = { id: log.joinAgent('e2e-stub', 'local', 4500), name: 'e2e-stub' };
    const out = log.applyProposal(
      solidId,
      {
        ...OVERREACHING,
        profiles: [{ id: 'p1', shape: 'circle', plane: 'ceiling', centre: { x: 0, y: 0 }, r: 0.4 }],
      },
      by,
      5000
    )!;
    expect(out.dropped.some((d) => /ceiling/.test(d))).toBe(true);
    expect(out.drawn).toHaveLength(0);
    // The castle still stood: a dropped profile is not a dropped reply.
    expect(out.steps.some((s) => s.name === 'castle')).toBe(true);
  });
});

// ---- names, and definitions ---------------------------------------------------

const CASTLE: Proposal = {
  steps: [
    { id: 's1', op: 'extrude', profile: 'stroke:1', depth: 3, name: 'castle', why: 'the plan grown to the height' },
    { id: 's2', op: 'boss', on: 's1', profile: 'p1', depth: 0.8, name: 'turret', why: 'a tower at the corner' },
    { id: 's3', op: 'boss', on: 's2', profile: 'p1', depth: 0.3, name: 'top', material: { colour: 'green' }, why: 'its cap' },
  ],
  profiles: [{ id: 'p1', shape: 'circle', plane: 'foundation', centre: { x: 1.4, y: 1 }, r: 0.4 }],
  dropped: 0,
  droppedWhy: [],
  reasoning: 'three steps',
};

function castleWithAVersion() {
  const { log } = castleBoard();
  const solidId = log.mass(log.massable()!, 4000)!.id;
  const by = { id: log.joinAgent('e2e-stub', 'local', 4500), name: 'e2e-stub' };
  log.applyProposal(solidId, CASTLE, by, 5000);
  return { log, solidId, by };
}

describe('names land on steps, and on taking become definitions', () => {
  it('the names are in the tree, in the step’s own id, with the material bound', () => {
    const { log, solidId } = castleWithAVersion();
    const names = log.namesInPlay();
    expect(names.map((n) => n.name).sort()).toEqual(['castle', 'top', 'turret']);
    const top = names.find((n) => n.name === 'top')!;
    expect(top.colour).toBe('green');
    expect(top.solidId).toBe(solidId);
    expect(top.stepId).toMatch(/^step:/);
    expect(top.definition).toBeUndefined(); // not taken yet
  });

  it('the version is HELD and attributed to the model until it is taken', () => {
    const { log, solidId, by } = castleWithAVersion();
    const v = log.versionOf(solidId)!;
    expect(v.by).toBe(by.id);
    expect(v.taken).toBe(false);
    expect(log.solidOf(solidId)!.named).toBe('engine');
  });

  it('taking it names the artifact from the root and holds every named sub-tree', () => {
    const { log, solidId } = castleWithAVersion();
    const took = log.take(solidId, 6000)!;
    expect(took.name).toBe('castle');
    // The PARTS. The whole is held too, under the root's own name — P6, so that
    // drawing the castle's own profile again offers it; `took.definitions` is
    // what was held BESIDE the thing, which is what the sentence says.
    expect(took.definitions.sort()).toEqual(['top', 'turret']);

    const solid = log.solidOf(solidId)!;
    expect(solid.name).toBe('castle');
    expect(solid.named).toBe('human');

    const defs = log.definitions();
    const turret = defs.find((d) => d.name === 'turret')!;
    expect(turret.basedOn).toBe('castle');
    expect(turret.steps.length).toBeGreaterThan(0);
    expect(turret.why).toMatch(/held as a definition/);
    expect(log.versionOf(solidId)!.taken).toBe(true);
    expect(log.namesInPlay().find((n) => n.name === 'turret')!.definition).toBe(true);
  });

  it('a definition replays with the log — it is held in it, not beside it', () => {
    const { log, solidId } = castleWithAVersion();
    log.take(solidId, 6000);
    const fresh = createLog();
    fresh.sees(blindSpace);
    fresh.session.load(log.session.getEvents());
    // P6: the whole is a definition too, under the name the root step carries.
    expect(fresh.definitions().map((d) => d.name).sort()).toEqual(['castle', 'top', 'turret']);
    expect(fresh.definitions().find((d) => d.name === 'castle')!.whole).toBe(true);
    expect(fresh.solidOf(solidId)!.name).toBe('castle');
  });
});

// ---- tier 1 on the names -------------------------------------------------------

describe('tier 1 acts on the names, with no model', () => {
  it('*remove the turret* is a new version without those steps, and nothing else moves', () => {
    const { log, solidId } = castleWithAVersion();
    const before = log.solidOf(solidId)!.tree;
    const turret = before.steps.filter((s) => s.name === 'turret').map((s) => s.id);
    const next = log.dropSteps(solidId, turret, 'the turret, taken out', 6000)!;
    expect(next.steps.some((s) => s.name === 'turret')).toBe(false);
    // The castle kept its own id, and the cap that stood on the turret now
    // stands on what the turret stood on.
    const castle = next.steps.find((s) => s.name === 'castle')!;
    expect(castle.id).toBe(before.steps.find((s) => s.name === 'castle')!.id);
    const top = next.steps.find((s) => s.name === 'top')!;
    expect(top.on).toBe(castle.id);
  });

  it('*the tops are red* binds a colour word to those steps and nothing else', () => {
    const { log, solidId } = castleWithAVersion();
    const tops = log.solidOf(solidId)!.tree.steps.filter((s) => s.name === 'top').map((s) => s.id);
    const next = log.paintSteps(solidId, tops, 'red', 'the tops, painted red', 6000)!;
    expect(next.steps.find((s) => s.name === 'top')!.material).toEqual({ colour: 'red' });
    expect(next.steps.find((s) => s.name === 'castle')!.material).toBeUndefined();
  });

  it('a colour the shard cannot paint is refused rather than passed through', () => {
    const { log, solidId } = castleWithAVersion();
    const tops = log.solidOf(solidId)!.tree.steps.filter((s) => s.name === 'top').map((s) => s.id);
    expect(log.paintSteps(solidId, tops, 'iridescent seafoam', 'why', 6000)).toBeNull();
  });

  it('a regen replaces only the named steps; every other step keeps its id', () => {
    const { log, solidId, by } = castleWithAVersion();
    const before = log.solidOf(solidId)!.tree;
    const turrets = before.steps.filter((s) => s.name === 'turret').map((s) => s.id);
    const taller: Proposal = {
      steps: [{ id: 't1', op: 'boss', profile: 'p1', depth: 2, name: 'turret', why: 'taller' }],
      profiles: [{ id: 'p1', shape: 'circle', plane: 'foundation', centre: { x: 1.4, y: 1 }, r: 0.4 }],
      dropped: 0,
      droppedWhy: [],
      reasoning: 'one step',
    };
    log.replaceSteps(solidId, turrets, taller, by, 7000);
    const after = log.solidOf(solidId)!.tree;
    for (const step of before.steps) {
      if (turrets.includes(step.id)) continue;
      expect(after.steps.some((s) => s.id === step.id)).toBe(true);
    }
    const newTurret = after.steps.find((s) => s.name === 'turret')!;
    expect(turrets).not.toContain(newTurret.id);
    expect(Math.abs((newTurret as { depth?: number }).depth ?? 0)).toBeGreaterThan(1.5);
  });
});

// ---- a failed brief leaves nothing ---------------------------------------------

describe('a failed brief leaves the log exactly as it was', () => {
  const config = { kind: 'openai-compatible' as const, baseUrl: 'http://localhost:11434/v1', model: 'stub' };

  it('a reply that will not read is reported, and nothing is written', async () => {
    const { log } = castleBoard();
    const solidId = log.mass(log.massable()!, 4000)!.id;
    const before = log.session.getEvents().length;
    const result = await propose({
      config,
      brief: 'the brief',
      words: 'a castle',
      transport: async () => ({ ok: true, text: 'I am afraid I cannot do that.', model: 'stub' }),
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/no JSON object/);
    expect(log.session.getEvents().length).toBe(before);
    expect(log.solidOf(solidId)!.tree.steps).toHaveLength(1);
  });

  it('a transport that fails is a returned value, never a throw', async () => {
    const result = await propose({
      config,
      brief: 'the brief',
      words: 'a castle',
      transport: async () => ({ ok: false, error: 'HTTP 500' }),
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('HTTP 500');
  });

  it('applying a proposal with nothing usable in it writes no version', () => {
    const { log } = castleBoard();
    const solidId = log.mass(log.massable()!, 4000)!.id;
    const by = { id: log.joinAgent('e2e-stub', 'local', 4500), name: 'e2e-stub' };
    const before = log.session.getEvents().length;
    const out = log.applyProposal(
      solidId,
      { steps: [{ id: 's1', op: 'extrude', profile: 'stroke:99', depth: 1 }], profiles: [], dropped: 0, droppedWhy: [], reasoning: '' },
      by,
      5000
    );
    expect(out).toBeNull();
    expect(log.session.getEvents().length).toBe(before);
  });
});

// ---- cancel ---------------------------------------------------------------------

describe('Esc stops it, through the transport’s own signal', () => {
  const config = { kind: 'openai-compatible' as const, baseUrl: 'http://localhost:11434/v1', model: 'stub' };

  it('a cancelled call comes back cancelled, and nothing is proposed', async () => {
    const ctl = new AbortController();
    const slow: Parameters<typeof propose>[0]['transport'] = (_c, _m, o) =>
      new Promise((resolve) => {
        const t = setTimeout(() => resolve({ ok: true, text: '{"steps":[]}', model: 'stub' }), 5000);
        o.signal?.addEventListener('abort', () => {
          clearTimeout(t);
          resolve({ ok: false, error: 'cancelled' });
        });
      });
    const pending = propose({ config, brief: 'b', words: 'w', transport: slow, signal: ctl.signal });
    ctl.abort();
    const result = await pending;
    expect(result.ok).toBe(false);
    expect(result.error).toBe('cancelled');
  });
});

// ---- the CSG seam's third verb ----------------------------------------------------

describe('intersect keeps the seam’s contract', () => {
  it('two boxes that share no volume come back as a failure, not as nothing', async () => {
    const { intersect } = await import('./csg');
    const a = new THREE.BoxGeometry(1, 1, 1);
    const b = new THREE.BoxGeometry(1, 1, 1).translate(10, 0, 0);
    const r = intersect(a, b);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/empty intersect|may not meet/);
  });
});

// ---- the reply, read -----------------------------------------------------------------

describe('a reply outside the vocabulary is dropped and counted', () => {
  it('a step whose op is not one of ours does not reach the tree', () => {
    const p = parseProposal(
      JSON.stringify({
        steps: [
          { id: 's1', op: 'extrude', profile: 'stroke:1', depth: 2 },
          { id: 's2', op: 'subdivide', profile: 'stroke:1' },
          { id: 's3', op: 'mesh', vertices: [1, 2, 3] },
        ],
      })
    );
    expect(p.steps.map((s) => s.op)).toEqual(['extrude']);
    expect(p.dropped).toBe(2);
    expect(p.droppedWhy.join(' ')).toMatch(/subdivide/);
    expect(p.droppedWhy.join(' ')).toMatch(/mesh/);
  });

  it('a massing or a match in a reply is the engine’s step, and is refused', () => {
    const p = parseProposal(JSON.stringify({ steps: [{ id: 's1', op: 'massing', profile: 'stroke:1' }] }));
    expect(p.steps).toHaveLength(0);
    expect(p.droppedWhy.join(' ')).toMatch(/massing/);
  });

  it('a step whose profile is not on the board is dropped when the tree is built', () => {
    const { log } = castleBoard();
    const solidId = log.mass(log.massable()!, 4000)!.id;
    const by = { id: log.joinAgent('e2e-stub', 'local', 4500), name: 'e2e-stub' };
    const out = log.applyProposal(
      solidId,
      {
        steps: [
          { id: 's1', op: 'extrude', profile: 'stroke:1', depth: 3, name: 'castle' },
          { id: 's2', op: 'boss', on: 's1', profile: 'stroke:404', depth: 1, name: 'turret' },
        ],
        profiles: [],
        dropped: 0,
        droppedWhy: [],
        reasoning: '',
      },
      by,
      5000
    )!;
    expect(out.dropped.some((d) => /stroke:404/.test(d))).toBe(true);
    expect((out.steps.filter((s: OpStep) => s.op !== 'massing') as OpStep[]).map((s) => s.name)).toEqual(['castle']);
  });
});

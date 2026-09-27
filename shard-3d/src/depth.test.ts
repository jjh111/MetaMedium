// L2c — **the shard asks** (DIRECTOR-PLAN-W2 L2; week 1's U3, whose checks in
// DIRECTOR-PLAN-W1.md §2–3 stand unchanged and are these tests).
//
// A hull stood on ONE standpoint's silhouette has a depth nobody drew: along
// that sightline only the plan bounds it, so it stands as deep as the plan
// runs behind the silhouette — a default, taken silently until now. The board
// asks instead: one question on the explanation plane, about the hull, naming
// the axis it lacks, with the depth it took as a candidate with its number and
// its reason. A second view closes it, or a word; the body re-derives either
// way; undo reopens it. The question is not ink, and no event type is new.
//
// Headless, like `parts.test.ts`: the rung is arithmetic and the bodies go
// through the real CSG seam. The boards are `depthboards.ts`'s, harvested from
// week 1's first attempt (`auto/w1-U3`), and John's own castle is replayed
// stroke by stroke from its fixture log.

/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ENGINE_PARTICIPANT, type MMNode, type SessionEvent } from 'metamedium-core';
import { createLog, type Log, type SpaceRead } from './log';
import { deriveTree } from './solid';
import { validateOpTree, type HullStep } from './op';
import { DEPTH_QUESTION, depthOf, readDepthWord } from './depth';
import { readField, type FieldContext } from './field';
import { decodeBoard } from './export';
import { saidInRoom } from './room';
import type { Plane } from './plane';
import {
  A_WORD,
  BOARD_SCALE,
  ONE_VIEW,
  PLAN_UNDER_IT,
  SECOND_TOWER,
  SECOND_VIEW,
  WHOLE_VIEW,
  type BoardMark,
} from './depthboards';

const LOGS = import.meta.glob('../fixtures/john-2026-09-16-castle-sketch.mm.log', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const blind: SpaceRead = { silhouettes: () => [], spanAlong: () => 0, silhouetteOn: () => null };

/**
 * Draw a board the way the surface does: each mark lands, and tier 1 stands or
 * grows the hull the moment a claim affords one (`tier1()` in `main.ts`).
 */
function draw(log: Log, marks: BoardMark[]): string[] {
  const ids: string[] = [];
  for (const m of marks) {
    const id = log.add(m.points, m.plane, BOARD_SCALE, m.at);
    ids.push(id);
    const h = log.hullable();
    if (h && h.add.includes(id)) log.hull(h, m.at + 500);
  }
  return ids;
}

function board(marks: BoardMark[]) {
  const log = createLog();
  log.sees(blind);
  const ids = draw(log, marks);
  const solid = log.solids()[0];
  return { log, ids, solidId: solid?.id ?? '' };
}

/** Every depth question on the explanation plane, erased or not, with its node. */
function questions(log: Log): { node: MMNode; text: string; erased: boolean }[] {
  const s = log.session.getState();
  const out: { node: MMNode; text: string; erased: boolean }[] = [];
  for (const id of s.explanations) {
    const node = s.nodes.get(id)!;
    const rep = node.reps.find((r) => r.modality === 'explanation');
    const data = (rep?.data ?? {}) as { question?: string; text?: string };
    if (data.question !== DEPTH_QUESTION) continue;
    out.push({ node, text: String(data.text ?? ''), erased: node.reps.some((r) => r.modality === 'erased') });
  }
  return out;
}

const about = (n: MMNode) => n.edges.filter((e) => e.rel === 'about').map((e) => e.to);
const hullOf = (log: Log, id: string) => log.solidOf(id)!.tree.steps.find((s) => s.op === 'hull' && !s.on) as HullStep;
/** What `solid.ts` signs a tree with no `match` step by: the tree itself. */
const signature = (log: Log, id: string) => JSON.stringify(log.solidOf(id)!.tree);

/** The derived body's box — the geometry actually standing, not the tree. */
function body(log: Log, id: string): THREE.Box3 {
  const { geometry } = deriveTree(log.solidOf(id)!.tree, {});
  expect(geometry).toBeTruthy();
  geometry!.computeBoundingBox();
  return geometry!.boundingBox!.clone();
}

// ---- 1 · asked once, about the axis it lacks ----------------------------------

describe('a hull stood on one standpoint asks how deep — once', () => {
  it('carries exactly one question on the explanation plane, about the hull, in the engine’s name', () => {
    const { log, solidId } = board(ONE_VIEW);
    expect(solidId).toBeTruthy();
    const qs = questions(log);
    expect(qs).toHaveLength(1);
    // About THAT solid, said by the engine — tier 1 asking, no model.
    expect(about(qs[0].node)).toContain(solidId);
    expect(qs[0].node.edges.find((e) => e.rel === 'made-by')!.to).toBe(ENGINE_PARTICIPANT);
    const q = log.depthQuestion(solidId)!;
    expect(q.open).toBe(true);
    expect(q.id).toBe(qs[0].node.id);
    expect(q.reading.state).toBe('asking');
  });

  it('names the axis it lacks — the sightline of the one standpoint — and the depth it took as a candidate', () => {
    const { log, solidId } = board(ONE_VIEW);
    const q = log.depthQuestion(solidId)!;
    const lack = q.reading.lack!;
    // Square to the world: the standpoint is along +Z, so the open axis is Z.
    expect(Math.abs(lack.along.z)).toBeCloseTo(1, 3);
    expect(lack.along.y).toBe(0);
    const text = questions(log)[0].text;
    expect(text).toMatch(/^how deep does it run along the view from \d+° · \+\d+°\?/);
    expect(text).toContain(lack.view);
    // The default it took, WITH its number and its reason: the keep is 4 u
    // deep behind the tower, and nothing else bounds it along that sightline.
    const took = lack.candidates.find((c) => c.took)!;
    expect(took.u).toBeCloseTo(4, 2);
    expect(took.reasoning).toMatch(/nothing but the plan bounds it/);
    expect(text).toContain('4.00 u');
    // Plural, not a bare prompt: the tower is 2 u across, and that is a reading too.
    expect(lack.candidates.length).toBeGreaterThanOrEqual(2);
    const wide = lack.candidates.find((c) => !c.took)!;
    expect(wide.u).toBeCloseTo(2, 2);
    expect(wide.reasoning.length).toBeGreaterThan(30);
    expect(text).toContain('2.00 u');
  });

  it('a second claim from the SAME standpoint asks nothing new — still one question, still open', () => {
    const { log, solidId } = board([...ONE_VIEW, SECOND_TOWER]);
    expect(hullOf(log, solidId).claims).toHaveLength(3);
    expect(questions(log)).toHaveLength(1);
    expect(log.depthQuestion(solidId)!.open).toBe(true);
  });

  it('a view that shows the whole plan across it asks nothing: the plan’s depth is the thing’s own', () => {
    const { log, solidId } = board(WHOLE_VIEW);
    expect(solidId).toBeTruthy();
    expect(questions(log)).toHaveLength(0);
    const r = log.depthQuestion(solidId)!.reading;
    expect(r.state).toBe('measured');
    expect(r.reasoning).toMatch(/whole plan/);
  });

  it('a plan drawn under the tower measures it: one view is enough, and nothing is asked', () => {
    const { log, solidId } = board(PLAN_UNDER_IT);
    expect(solidId).toBeTruthy();
    expect(questions(log)).toHaveLength(0);
    expect(log.depthQuestion(solidId)!.reading.state).toBe('measured');
  });
});

// ---- 2 · the question is not ink ----------------------------------------------

describe('the question is not ink', () => {
  it('is on the explanation plane and nowhere else — not content, not a mark, not a form, not the hull’s', () => {
    const { log, solidId } = board(ONE_VIEW);
    const qid = questions(log)[0].node.id;
    const s = log.session.getState();
    expect(s.explanations).toContain(qid);
    expect(s.contentIds).not.toContain(qid);
    expect(s.artifacts).not.toContain(qid);
    expect(log.marks().map((m) => m.id)).not.toContain(qid);
    expect(log.forms().map((f) => f.id)).not.toContain(qid);
    expect(log.solidOf(solidId)!.memberIds).not.toContain(qid);
  });

  it('is the board’s own question, not a sentence another hand placed in the room', () => {
    const { log } = board(ONE_VIEW);
    expect(questions(log)).toHaveLength(1);
    expect(saidInRoom(log.session)).toEqual([]);
  });

  it('joins no lasso: a summon pointed at it holds nothing', () => {
    const { log } = board(ONE_VIEW);
    const qid = questions(log)[0].node.id;
    expect(log.session.summonMarks([qid], 60_000)).toBeNull();
    expect(log.session.getState().summon).toBeNull();
  });

  it('joins no signature: the definition the hull could become is made of its claims alone', () => {
    const { log, solidId } = board(ONE_VIEW);
    const qid = questions(log)[0].node.id;
    const sig = log.session.getState().nodes.get(solidId)!.reps.find((r) => r.modality === 'signature');
    expect(JSON.stringify(sig?.data ?? {})).not.toContain(qid);
    log.name(solidId, 'keep', 69_000);
    expect(log.take(solidId, 70_000)).toBeTruthy();
    expect(log.definitions().length).toBeGreaterThan(0);
    for (const d of log.definitions()) expect(JSON.stringify(d)).not.toContain(qid);
  });

  it('is erasable — and an erased question is not asked again when the hull changes', () => {
    const { log, solidId } = board(ONE_VIEW);
    const qid = questions(log)[0].node.id;
    const before = signature(log, solidId);
    log.session.erase(qid, 80_000);
    expect(questions(log)[0].erased).toBe(true);
    expect(log.depthQuestion(solidId)!.open).toBe(false);
    // The hull is untouched by it.
    expect(signature(log, solidId)).toBe(before);
    // Another tower from the same place: still lacking, and still not asked twice.
    draw(log, [{ ...SECOND_TOWER, at: 81_000 }]);
    expect(questions(log)).toHaveLength(1);
    expect(log.depthQuestion(solidId)!.open).toBe(false);
  });
});

// ---- 3 · a second view closes it ----------------------------------------------

describe('a second view from another standpoint closes it, and the body re-derives', () => {
  it('closes it, the mesh signature changes and the body narrows; undo reopens it', () => {
    const { log, solidId } = board(ONE_VIEW);
    const sigBefore = signature(log, solidId);
    const deepBefore = body(log, solidId).getSize(new THREE.Vector3()).z;
    expect(deepBefore).toBeCloseTo(4, 1);

    draw(log, [SECOND_VIEW]);
    expect(hullOf(log, solidId).claims).toHaveLength(3);
    const q = log.depthQuestion(solidId)!;
    expect(q.open).toBe(false);
    expect(q.reading.state).toBe('measured');
    expect(q.reading.reasoning).toMatch(/2 standpoints/);
    // Closed, not replaced: the one question still stands on the plane.
    expect(questions(log)).toHaveLength(1);
    expect(signature(log, solidId)).not.toBe(sigBefore);
    const deepAfter = body(log, solidId).getSize(new THREE.Vector3()).z;
    expect(deepAfter).toBeLessThan(deepBefore - 1);

    // One undo is the claim going back out of the hull: the question is open again.
    log.undo();
    expect(hullOf(log, solidId).claims).toHaveLength(2);
    expect(log.depthQuestion(solidId)!.open).toBe(true);
    expect(signature(log, solidId)).toBe(sigBefore);
  });
});

// ---- 4 · a word closes it the same way ----------------------------------------

describe('a word closes it the same way', () => {
  it('“3 deep” closes it and the body re-derives 3 u deep, from the side it was seen from; undo reopens it', () => {
    const { log, solidId } = board(ONE_VIEW);
    const sigBefore = signature(log, solidId);
    const box = body(log, solidId);
    const said = log.sayDepth(solidId, '3 deep', 'the hand', 90_000);
    expect('refused' in said).toBe(false);
    if ('refused' in said) return;
    expect(said.u).toBe(3);

    const q = log.depthQuestion(solidId)!;
    expect(q.open).toBe(false);
    expect(q.reading.state).toBe('said');
    expect(q.reading.said!.words).toBe('3 deep');
    expect(questions(log)).toHaveLength(1);
    expect(signature(log, solidId)).not.toBe(sigBefore);
    const after = body(log, solidId);
    expect(after.getSize(new THREE.Vector3()).z).toBeCloseTo(3, 1);
    // Measured back from the side the view was drawn from (+Z faces the eye).
    expect(after.max.z).toBeCloseTo(box.max.z, 2);
    expect(after.min.z).toBeGreaterThan(box.min.z + 0.9);
    // The answer is held on the hull step with the question it answers.
    const depth = hullOf(log, solidId).depth!;
    expect(depth.u).toBe(3);
    expect(depth.by).toBe('the hand');
    expect(depth.reasoning).toMatch(/how deep does it run/);

    log.undo();
    expect(log.depthQuestion(solidId)!.open).toBe(true);
    expect(signature(log, solidId)).toBe(sigBefore);
  });

  it('its own readings are words too — “as deep as it is wide”, “as deep as the plan”', () => {
    const { log, solidId } = board(ONE_VIEW);
    const lack = log.depthQuestion(solidId)!.reading.lack!;
    const wide = readDepthWord(A_WORD, lack);
    expect(wide.read && wide.u).toBeCloseTo(2, 2);
    const plan = readDepthWord('as deep as the plan', lack);
    expect(plan.read && plan.u).toBeCloseTo(4, 2);
    for (const said of ['3', '3 u', '2.5 u deep', 'depth 3', '3 deep']) expect(readDepthWord(said, lack).read).toBe(true);
  });

  it('what it cannot read comes back with the reason, and nothing is written', () => {
    const { log, solidId } = board(ONE_VIEW);
    const events = log.session.getEvents().length;
    const r = log.sayDepth(solidId, 'quite deep really', 'the hand', 91_000);
    expect('refused' in r && r.refused).toMatch(/reads a number/);
    expect(readDepthWord('-3 deep', log.depthQuestion(solidId)!.reading.lack!).read).toBe(false);
    expect(log.session.getEvents().length).toBe(events);
    expect(log.depthQuestion(solidId)!.open).toBe(true);
  });

  it('a word where nothing is asking is refused, and says why', () => {
    const { log, solidId } = board(WHOLE_VIEW);
    const events = log.session.getEvents().length;
    const r = log.sayDepth(solidId, '3 deep', 'the hand', 92_000);
    expect('refused' in r && r.refused).toMatch(/is not asking how deep/);
    expect(log.session.getEvents().length).toBe(events);
  });

  it('a word, then another claim from the same standpoint: the word is kept, and the question stays closed', () => {
    const { log, solidId } = board(ONE_VIEW);
    log.sayDepth(solidId, '3 deep', 'the hand', 93_000);
    draw(log, [{ ...SECOND_TOWER, at: 94_000 }]);
    expect(hullOf(log, solidId).claims).toHaveLength(3);
    expect(hullOf(log, solidId).depth?.u).toBe(3);
    expect(log.depthQuestion(solidId)!.open).toBe(false);
  });
});

// ---- 5 · John's own board ---------------------------------------------------

describe('John’s own board, replayed stroke by stroke', () => {
  it('the footprint and one ⊓ ask once; the second ⊓ from there asks nothing new; the third, from 135°, closes it', () => {
    const { events } = decodeBoard(LOGS['../fixtures/john-2026-09-16-castle-sketch.mm.log']);
    // His ink as he drew it: each stroke, and the plane held on it by the
    // event that follows it — nothing the engine stood from it.
    const ink: { points: { x: number; y: number }[]; plane: Plane & { scale: number } }[] = [];
    events.forEach((e, k) => {
      if (e.type !== 'stroke') return;
      const next = events[k + 1] as Extract<SessionEvent, { type: 'propose' }>;
      const plane = next.reps!.find((r) => r.modality === 'plane')!.data as Plane & { scale: number };
      ink.push({ points: e.points, plane });
    });
    expect(ink).toHaveLength(4);
    const log = createLog();
    log.sees(blind);
    const states: { questions: number; open: boolean | null }[] = [];
    ink.forEach(({ points, plane }, i) => {
      const id = log.add(points, plane, plane.scale, 1000 * (i + 1));
      const h = log.hullable();
      if (h && h.add.includes(id)) log.hull(h, 1000 * (i + 1) + 500);
      const solid = log.solids()[0];
      states.push({ questions: questions(log).length, open: solid ? log.depthQuestion(solid.id)!.open : null });
    });
    expect(states).toEqual([
      { questions: 0, open: null }, // the footprint: nothing stands
      { questions: 1, open: true }, // and one ⊓: the hull asks how deep
      { questions: 1, open: true }, // a second ⊓ from the same standpoint: nothing new
      { questions: 1, open: false }, // a ⊓ from 135°: two standpoints, and it is closed
    ]);
    expect(questions(log)[0].text).toMatch(/along the view from 64° · \+29°/);
  });
});

// ---- 6 · no new event type, and the tree is read like any other ------------

describe('nothing new in the log but what core already has', () => {
  it('the question is an `answer`, the word a `code` version', () => {
    const { log, solidId } = board(ONE_VIEW);
    const before = log.session.getEvents().length;
    log.sayDepth(solidId, '3 deep', 'the hand', 95_000);
    const types = new Set(log.session.getEvents().map((e) => e.type));
    expect([...types].sort()).toEqual(['answer', 'bless', 'code', 'propose', 'stroke', 'summon']);
    const asked = log.session.getEvents().find((e) => e.type === 'answer') as Extract<SessionEvent, { type: 'answer' }>;
    expect(asked.question).toBe(DEPTH_QUESTION);
    expect(log.session.getEvents().slice(before).map((e) => e.type)).toEqual(['code']);
  });

  it('a tree carrying a said depth passes DATA-1, and a broken one is refused with the reason', () => {
    const { log, solidId } = board(ONE_VIEW);
    log.sayDepth(solidId, '3 deep', 'the hand', 96_000);
    const tree = JSON.parse(JSON.stringify(log.solidOf(solidId)!.tree));
    expect(validateOpTree(tree).ok).toBe(true);
    const hull = tree.steps.find((s: { op: string }) => s.op === 'hull');
    hull.depth.u = 0;
    const zero = validateOpTree(tree);
    expect(zero.ok).toBe(false);
    if (!zero.ok) expect(zero.reason).toMatch(/depth/);
    hull.depth = { u: 2, words: '2 deep', reasoning: 'x' };
    expect(validateOpTree(tree).ok).toBe(false);
  });

  it('depthOf is a pure function of the step', () => {
    const { log, solidId } = board(ONE_VIEW);
    const step = hullOf(log, solidId);
    expect(depthOf(step)).toEqual(depthOf(JSON.parse(JSON.stringify(step))));
  });
});

// ---- 7 · the field -------------------------------------------------------------

describe('the field reads a depth when the hull is asking', () => {
  const ctx = (log: Log, solidId: string, ran: string[]): FieldContext => ({
    verbs: [],
    nameable: null,
    depth: { lack: log.depthQuestion(solidId)!.reading.lack!, run: (t: string) => void ran.push(t) },
  });

  it('“3 deep” is the answer, and the reading line says so before Enter', () => {
    const { log, solidId } = board(ONE_VIEW);
    const ran: string[] = [];
    const r = readField('3 deep', ctx(log, solidId, ran));
    expect(r.kind).toBe('depth');
    expect(r.line).toMatch(/3\.00 u deep/);
    expect(r.line).toContain(log.depthQuestion(solidId)!.reading.lack!.view);
    r.run!();
    expect(ran).toEqual(['3 deep']);
  });

  it('with nothing asking, “3 deep” is not read as a depth at all', () => {
    const r = readField('3 deep', { verbs: [], nameable: null });
    expect(r.kind).not.toBe('depth');
  });
});

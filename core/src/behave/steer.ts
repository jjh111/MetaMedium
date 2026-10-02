// Steering: the verbs summed, clamped, and stepped.

import type { Behaviour, Body, Force, Intent, Term, World } from './verbs';
import { DEFAULT_MAX_FORCE, DEFAULT_SPEED, force, intents } from './verbs';
import { applyWalls, wallBoxes, type WallState } from './walls';

export interface TermResult extends Force { verb: Term['verb']; target?: string; weight: number; share: number }

export interface Steering { fx: number; fy: number; terms: TermResult[]; intents: Intent[] }

/** Every term's force, summed and clamped, with each term's share of the whole. */
export function steer(b: Behaviour, world: World): Steering {
  const speed = b.speed ?? DEFAULT_SPEED, maxForce = b.maxForce ?? DEFAULT_MAX_FORCE;
  const results: TermResult[] = [];
  const all: Intent[] = [];
  let fx = 0, fy = 0;
  for (const t of b.terms) {
    const f = force(t, world, speed);
    results.push({ ...f, verb: t.verb, target: t.target, weight: t.weight, share: 0 });
    fx += f.fx; fy += f.fy;
    all.push(...intents(t, world));
  }
  const total = results.reduce((a, r) => a + Math.hypot(r.fx, r.fy), 0) || 1;
  for (const r of results) r.share = Math.hypot(r.fx, r.fy) / total;
  const mag = Math.hypot(fx, fy);
  if (mag > maxForce) { fx *= maxForce / mag; fy *= maxForce / mag; }
  return { fx, fy, terms: results, intents: all };
}

/** One fixed step: force → velocity (capped at speed) → walls → position → heading, age. */
export function step(b: Behaviour, world: World, wallState: WallState = { contactSteps: 0 }): { body: Body; steering: Steering; wall: string; wallState: WallState } {
  const speed = b.speed ?? DEFAULT_SPEED;
  const s = steer(b, world);
  const me = world.me;
  let vx = me.vx + s.fx * world.dt, vy = me.vy + s.fy * world.dt;
  const sp = Math.hypot(vx, vy);
  if (sp > speed) { vx *= speed / sp; vy *= speed / sp; }
  const walled = applyWalls({ ...me, vx, vy }, wallBoxes(world.walls), world.dt, wallState);
  const x = walled.x + walled.vx * world.dt, y = walled.y + walled.vy * world.dt;
  const moving = Math.hypot(walled.vx, walled.vy) > 1e-6;
  return {
    body: { ...me, x, y, vx: walled.vx, vy: walled.vy, heading: moving ? Math.atan2(walled.vy, walled.vx) : me.heading, age: me.age + world.dt },
    steering: s,
    wall: walled.reasoning,
    wallState: walled.state,
  };
}

/** A deterministic stream: mulberry32. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A world over plain bodies. */
export function worldOf(me: Body, others: Body[], walls: World['walls'], t: number, dt: number, rng: () => number): World {
  return { t, dt, me, others, walls, named: (name) => others.filter((o) => o.name === name), rng };
}

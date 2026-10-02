// The fourth rung: what a mark DOES — a closed vocabulary of steering verbs.
//
// KEYFRAMES gave every mark three rungs, each a closed vocabulary with a table.
// Behaviour is the fourth and gets the same treatment: not "the model writes
// some JavaScript" but a small set of verbs, composed with weights, targeted
// by NAME. It is Reynolds' steering model, which has been the right
// abstraction for moving things in a plane for thirty years, and it is what
// a user's words map onto ("swims toward food, flees anything bigger, hides
// in coral" → seek, flee, home).
//
// Nothing here knows any particular name (BUILD-PLAN-v8 I11). A target is a
// name the WORLD supplies at run time; `bigger` and `smaller` are ratios of
// the bodies' own sizes, like every relation in the engine. Every force
// carries its reasoning, in the terms it was measured in.

export type Verb =
  | 'wander' | 'seek' | 'flee' | 'home' | 'school' | 'hold'
  | 'avoid' | 'consume' | 'spawn' | 'drift' | 'expire';

export const VERBS: readonly Verb[] = ['wander', 'seek', 'flee', 'home', 'school', 'hold', 'avoid', 'consume', 'spawn', 'drift', 'expire'];

/** Which verbs take a target name. */
export const TARGETED: ReadonlySet<Verb> = new Set(['seek', 'flee', 'home', 'school', 'consume', 'spawn', 'expire']);

export interface Term {
  verb: Verb;
  /** A name the world supplies — never known here. */
  target?: string;
  weight: number;
  /** Per-verb knobs: range, radius, every, after, direction, only ('bigger' | 'smaller'). */
  params?: Record<string, number | string>;
  reasoning?: string;
}

export interface Behaviour {
  terms: Term[];
  /** Where it came from: the words beside the mark, an acted-out path, a hand, a model. */
  source?: 'words' | 'demo' | 'hand' | 'model';
  /** The escape hatch: a `steer` module under the same contract, run in a worker. */
  language?: 'js';
  code?: string;
  /** Speed and force ceilings, in units per second. */
  speed?: number;
  maxForce?: number;
}

export interface Body {
  id: string;
  name: string;
  x: number; y: number;
  vx: number; vy: number;
  w: number; h: number;
  heading: number;
  age: number;
  /** Where it began — what `hold` keeps to. */
  origin?: { x: number; y: number };
}

export interface Wall { points: { x: number; y: number }[]; closed: boolean }

export interface World {
  t: number;
  dt: number;
  me: Body;
  others: Body[];
  walls: Wall[];
  named(name: string): Body[];
  /** The seeded stream — the only randomness a behaviour may use. */
  rng(): number;
}

export interface Force { fx: number; fy: number; reasoning: string }

export const DEFAULT_SPEED = 120;
export const DEFAULT_MAX_FORCE = 240;

export const sizeOf = (b: { w: number; h: number }) => Math.max(1, Math.sqrt(Math.max(1, b.w) * Math.max(1, b.h)));
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(b.x - a.x, b.y - a.y);
const num = (t: Term, k: string, d: number) => (typeof t.params?.[k] === 'number' ? (t.params![k] as number) : d);

/** The nearest body named `name` (optionally only those bigger / smaller than me). */
function nearest(world: World, name: string | undefined, only?: string): { body: Body; d: number } | null {
  if (!name) return null;
  const mine = sizeOf(world.me);
  let best: { body: Body; d: number } | null = null;
  for (const o of world.named(name)) {
    if (o.id === world.me.id) continue;
    const s = sizeOf(o);
    if (only === 'bigger' && s < mine * 1.25) continue;
    if (only === 'smaller' && s > mine / 1.25) continue;
    const d = dist(world.me, o);
    if (!best || d < best.d) best = { body: o, d };
  }
  return best;
}

/** Reynolds steering toward a desired velocity: the force is the correction. */
function toward(world: World, to: { x: number; y: number }, speed: number, weight: number): { fx: number; fy: number } {
  const d = dist(world.me, to);
  if (d < 1e-6) return { fx: 0, fy: 0 };
  const dx = ((to.x - world.me.x) / d) * speed, dy = ((to.y - world.me.y) / d) * speed;
  return { fx: (dx - world.me.vx) * weight, fy: (dy - world.me.vy) * weight };
}

const none = (reasoning: string): Force => ({ fx: 0, fy: 0, reasoning });

/** One verb, one force. Deterministic given the world (wander draws on the world's rng). */
export function force(term: Term, world: World, speed = DEFAULT_SPEED): Force {
  const me = world.me, w = term.weight;
  switch (term.verb) {
    case 'wander': {
      const turn = num(term, 'turn', 0.9);
      const a = me.heading + (world.rng() - 0.5) * turn;
      return { fx: Math.cos(a) * speed * 0.5 * w, fy: Math.sin(a) * speed * 0.5 * w, reasoning: 'wandering' };
    }
    case 'seek': {
      const n = nearest(world, term.target);
      if (!n) return none(`nothing named ${term.target} to seek`);
      const f = toward(world, n.body, speed, w);
      return { ...f, reasoning: `seeking ${n.body.id} (${term.target}) ${Math.round(n.d)}px away` };
    }
    case 'flee': {
      const only = typeof term.params?.only === 'string' ? (term.params.only as string) : undefined;
      const n = nearest(world, term.target, only);
      const range = num(term, 'range', sizeOf(me) * 6);
      if (!n || n.d > range) return none(`nothing${only ? ' ' + only : ''} named ${term.target} within ${Math.round(range)}px`);
      const falloff = 1 - n.d / range;
      const away = { x: me.x + (me.x - n.body.x), y: me.y + (me.y - n.body.y) };
      const f = toward(world, away, speed, w * (0.4 + 0.6 * falloff));
      return { ...f, reasoning: `fleeing ${n.body.id} (${term.target}${only ? ', ' + only : ''}) ${Math.round(n.d)}px away` };
    }
    case 'home': {
      const n = nearest(world, term.target);
      if (!n) return none(`nothing named ${term.target} to keep to`);
      const range = num(term, 'range', sizeOf(n.body) * 1.5);
      if (n.d > range) {
        const f = toward(world, n.body, speed, w);
        return { ...f, reasoning: `returning to ${n.body.id} (${term.target}), ${Math.round(n.d)}px out` };
      }
      const a = me.heading + (world.rng() - 0.5) * 1.2;
      return { fx: Math.cos(a) * speed * 0.25 * w, fy: Math.sin(a) * speed * 0.25 * w, reasoning: `at home in ${n.body.id} (${term.target})` };
    }
    case 'school': {
      const range = num(term, 'range', sizeOf(me) * 5);
      const peers = (term.target ? world.named(term.target) : world.others).filter((o) => o.id !== me.id && dist(me, o) <= range);
      if (!peers.length) return none(`no ${term.target ?? 'peers'} within ${Math.round(range)}px to school with`);
      let cx = 0, cy = 0, ax = 0, ay = 0, sx = 0, sy = 0;
      const tooClose = sizeOf(me) * 1.4;
      for (const o of peers) {
        cx += o.x; cy += o.y; ax += o.vx; ay += o.vy;
        const d = dist(me, o);
        if (d < tooClose && d > 1e-6) { sx += (me.x - o.x) / d * (1 - d / tooClose); sy += (me.y - o.y) / d * (1 - d / tooClose); }
      }
      const n = peers.length;
      const coh = toward(world, { x: cx / n, y: cy / n }, speed, 1);
      const ali = { fx: (ax / n - me.vx), fy: (ay / n - me.vy) };
      return {
        fx: (coh.fx * 0.6 + ali.fx * 0.8 + sx * speed * 1.5) * w,
        fy: (coh.fy * 0.6 + ali.fy * 0.8 + sy * speed * 1.5) * w,
        reasoning: `schooling with ${n} ${term.target ?? 'peer'}${n === 1 ? '' : 's'}`,
      };
    }
    case 'hold': {
      const o = me.origin ?? { x: me.x, y: me.y };
      const radius = num(term, 'radius', sizeOf(me) * 3);
      const d = dist(me, o);
      if (d <= radius) return none(`holding within ${Math.round(radius)}px of where it began`);
      const f = toward(world, o, speed, w * Math.min(1, (d - radius) / radius + 0.3));
      return { ...f, reasoning: `${Math.round(d - radius)}px past its ${Math.round(radius)}px hold — returning` };
    }
    case 'drift': {
      const deg = num(term, 'direction', -90);
      const a = (deg * Math.PI) / 180;
      return { fx: Math.cos(a) * speed * 0.6 * w, fy: Math.sin(a) * speed * 0.6 * w, reasoning: `drifting toward ${deg}°` };
    }
    case 'avoid':
      return none('sliding along walls');
    case 'consume':
    case 'spawn':
    case 'expire':
      return none(`${term.verb} is an intent, not a force`);
  }
}

export interface Intent { kind: 'consume' | 'spawn' | 'expire'; target?: string; body?: string }

/** The intents a term raises this step: contact, an interval, a lifetime. */
export function intents(term: Term, world: World): Intent[] {
  const me = world.me;
  switch (term.verb) {
    case 'consume': {
      const n = nearest(world, term.target);
      if (n && n.d <= (sizeOf(me) + sizeOf(n.body)) / 2) return [{ kind: 'consume', target: term.target, body: n.body.id }];
      return [];
    }
    case 'spawn': {
      const every = num(term, 'every', 4);
      const before = Math.floor((me.age - world.dt) / every), after = Math.floor(me.age / every);
      return after > before && me.age >= every ? [{ kind: 'spawn', target: term.target }] : [];
    }
    case 'expire': {
      const after = num(term, 'after', Infinity);
      if (me.age >= after) return [{ kind: 'expire' }];
      const n = nearest(world, term.target);
      if (n && n.d <= (sizeOf(me) + sizeOf(n.body)) / 2) return [{ kind: 'expire', body: n.body.id }];
      return [];
    }
    default:
      return [];
  }
}

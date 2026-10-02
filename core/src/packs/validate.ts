// A pack is read, not trusted (V1-PLAN §2.3; the DATA-1 manner of the review
// of 15 Sep 2026, `shard-3d/src/op.ts`'s `validateOpTree`).
//
// A pack arrives as data — today from a module in this bundle, tomorrow from a
// file someone hands the board — and is walked once against the types that
// build one before anything holds it. Two outcomes, and never a throw:
//
//   - **The pack cannot be read at all** — not an object, no id, a version
//     that is not a whole number: `{ ok: false, at, reason }`, and nothing of
//     it is used.
//   - **The pack reads, and some entries do not** — a definition whose sample
//     draws a hexagon, a connector whose head is a star, an affinity that
//     lifts nothing a context can name: each such entry is REFUSED, with the
//     path to what failed and why, and the rest of the pack stands. An entry
//     is refused whole: a definition missing one of its drawings is a
//     different definition than its author wrote.
//
// What comes out is a copy holding only what was checked, frozen, so the
// content under one `id@version` cannot be changed by whoever handed it in.
// Keys the format does not know are not copied.

import type { Point } from '../types';
import type { DrawnShape } from '../session/synthesize';
import type { Role } from '../diagram/roles';
import { ROLES } from '../diagram/roles';
import type { Pack, PackConnector, PackDefinition, PackHead } from './pack';
import { PACK_HEADS, PACK_ID } from './pack';

/** How much a pack may carry. The marks and points are the engine's own limits (CLAUDE.md, data limits). */
export const PACK_LIMITS = {
  definitions: 64,
  /** Drawings of one definition, of each kind. */
  samples: 16,
  /** Marks in one drawing: a composition's limit. */
  marks: 50,
  /** Points in one recorded stroke: a stroke's limit. */
  points: 500,
  connectors: 32,
  affinities: 32,
  /** What one affinity lifts. */
  targets: 16,
  /** Formats one entry is said in. */
  exports: 8,
  nameChars: 60,
  textChars: 400,
  /** How far from the origin a drawing may reach, in canvas units. */
  coordinate: 1e6,
  version: 999_999,
} as const;

/** Where in a pack something failed, and what was wrong, in the words a pane says. */
export interface PackFault {
  /** The path to what failed, in the pack's own shape: `definitions[1].samples[0][3].w`. */
  at: string;
  reason: string;
}

/** A pack read: the pack as held and every entry refused — or why it could not be read at all. */
export type PackCheck = { ok: true; pack: Pack; refused: PackFault[] } | ({ ok: false } & PackFault);

/** Thrown inside the walk and caught at its door, so every check can be one line. */
class Fault {
  constructor(readonly at: string, readonly reason: string) {}
}
const bad = (at: string, reason: string): never => {
  throw new Fault(at, reason);
};

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const kindOf = (v: unknown) => (v === undefined ? 'missing' : v === null ? 'null' : Array.isArray(v) ? 'a list' : typeof v);

function wantRecord(v: unknown, at: string, what: string): Record<string, unknown> {
  if (!isRecord(v)) bad(at, `${what} is ${kindOf(v)}, not an object`);
  return v as Record<string, unknown>;
}

function wantList(v: unknown, at: string, what: string, max: number, min = 0): unknown[] {
  if (!Array.isArray(v)) bad(at, `${what} is ${kindOf(v)}, not a list`);
  const xs = v as unknown[];
  if (xs.length > max) bad(at, `${what} holds ${xs.length}, past the ${max} a pack may carry`);
  if (xs.length < min) bad(at, `${what} holds ${xs.length}, and needs at least ${min}`);
  return xs;
}

function wantText(v: unknown, at: string, what: string, max: number = PACK_LIMITS.textChars): string {
  if (typeof v !== 'string') bad(at, `${what} is ${kindOf(v)}, not text`);
  const s = (v as string).trim();
  if (!s) bad(at, `${what} is empty`);
  if (s.length > max) bad(at, `${what} is ${s.length} characters long, past the ${max} it may be`);
  return s;
}

function wantNumber(v: unknown, at: string, what: string): number {
  if (typeof v !== 'number') bad(at, `${what} is ${kindOf(v)}, not a number`);
  if (!Number.isFinite(v as number)) bad(at, `${what} is ${String(v)} — a measurement has to be a finite number`);
  if (Math.abs(v as number) > PACK_LIMITS.coordinate) bad(at, `${what} is ${v}, further than ${PACK_LIMITS.coordinate} from the origin`);
  return v as number;
}

function wantPoint(v: unknown, at: string, what: string): Point {
  const r = wantRecord(v, at, what);
  return { x: wantNumber(r.x, `${at}.x`, `${what}'s x`), y: wantNumber(r.y, `${at}.y`, `${what}'s y`) };
}

function wantRole(v: unknown, at: string): Role {
  if (!ROLES.includes(v as Role)) bad(at, `the role “${String(v)}” is not one of the six — ${ROLES.join(', ')} — and a pack adds none`);
  return v as Role;
}

function wantExport(v: unknown, at: string): Record<string, string> {
  const r = wantRecord(v, at, 'what it is said as elsewhere');
  const keys = Object.keys(r);
  if (keys.length > PACK_LIMITS.exports) bad(at, `it is said in ${keys.length} formats, past the ${PACK_LIMITS.exports} an entry may name`);
  const out: Record<string, string> = {};
  for (const k of keys) {
    if (!/^[a-z][a-z0-9-]{0,23}$/.test(k)) bad(`${at}.${k}`, `“${k}” is no format's name`);
    out[k] = wantText(r[k], `${at}.${k}`, `how it is said in ${k}`);
  }
  return out;
}

const BOX_SHAPES = new Set(['rectangle', 'circle', 'triangle']);
const SEGMENT_SHAPES = new Set(['line', 'arrow']);

/** One mark of a drawing, in the shape rung's closed vocabulary: the pen a model holds (`DrawnShape`). */
function wantShape(v: unknown, at: string): DrawnShape {
  const r = wantRecord(v, at, 'a mark');
  const shape = r.shape;
  if (typeof shape === 'string' && BOX_SHAPES.has(shape)) {
    const w = wantNumber(r.w, `${at}.w`, 'its width');
    const h = wantNumber(r.h, `${at}.h`, 'its height');
    if (!(w > 1) || !(h > 1)) bad(at, `a ${shape} ${w} by ${h} has no size to draw`);
    return { shape: shape as 'rectangle' | 'circle' | 'triangle', x: wantNumber(r.x, `${at}.x`, 'its x'), y: wantNumber(r.y, `${at}.y`, 'its y'), w, h };
  }
  if (typeof shape === 'string' && SEGMENT_SHAPES.has(shape)) {
    const from = wantPoint(r.from, `${at}.from`, 'where it starts');
    const to = wantPoint(r.to, `${at}.to`, 'where it ends');
    if (!(Math.hypot(to.x - from.x, to.y - from.y) > 1)) bad(at, `a ${shape} that starts where it ends has no length to draw`);
    return { shape: shape as 'line' | 'arrow', from, to };
  }
  return bad(`${at}.shape`, `“${String(shape)}” is not a shape the rung reads — rectangle, circle, triangle, line or arrow`);
}

function wantStroke(v: unknown, at: string): Point[] {
  const pts = wantList(v, at, 'a recorded stroke', PACK_LIMITS.points, 2);
  return pts.map((p, i) => wantPoint(p, `${at}[${i}]`, `point ${i}`));
}

function wantDefinition(v: unknown, at: string): PackDefinition {
  const r = wantRecord(v, at, 'a definition');
  const name = wantText(r.name, `${at}.name`, 'its name', PACK_LIMITS.nameChars);
  const out: PackDefinition = { name };
  if (r.describes !== undefined) out.describes = wantText(r.describes, `${at}.describes`, 'what it looks like');
  if (r.samples !== undefined) {
    out.samples = wantList(r.samples, `${at}.samples`, 'its samples', PACK_LIMITS.samples).map((s, i) =>
      wantList(s, `${at}.samples[${i}]`, `sample ${i}`, PACK_LIMITS.marks, 1).map((m, k) => wantShape(m, `${at}.samples[${i}][${k}]`))
    );
  }
  if (r.strokes !== undefined) {
    out.strokes = wantList(r.strokes, `${at}.strokes`, 'its recorded drawings', PACK_LIMITS.samples).map((s, i) =>
      wantList(s, `${at}.strokes[${i}]`, `recorded drawing ${i}`, PACK_LIMITS.marks, 1).map((k, j) => wantStroke(k, `${at}.strokes[${i}][${j}]`))
    );
  }
  if (!(out.samples?.length || out.strokes?.length)) bad(at, `“${name}” has no drawing to be matched by — a definition needs a sample or a recorded drawing`);
  if (r.role !== undefined) out.role = wantRole(r.role, `${at}.role`);
  if (r.ports !== undefined) out.ports = wantText(r.ports, `${at}.ports`, 'where it takes a connector');
  if (r.export !== undefined) out.export = wantExport(r.export, `${at}.export`);
  return out;
}

function wantConnector(v: unknown, at: string): PackConnector {
  const r = wantRecord(v, at, 'a connector');
  const out: PackConnector = { name: wantText(r.name, `${at}.name`, 'its name', PACK_LIMITS.nameChars) };
  if (r.describes !== undefined) out.describes = wantText(r.describes, `${at}.describes`, 'what it looks like');
  if (r.head !== undefined) {
    if (!PACK_HEADS.includes(r.head as PackHead)) bad(`${at}.head`, `“${String(r.head)}” is not a head — ${PACK_HEADS.join(', ')}`);
    out.head = r.head as PackHead;
  }
  if (r.filled !== undefined) {
    if (typeof r.filled !== 'boolean') bad(`${at}.filled`, `whether its head is filled is ${kindOf(r.filled)}, not yes or no`);
    out.filled = r.filled as boolean;
  }
  if (r.role !== undefined) out.role = wantRole(r.role, `${at}.role`);
  if (r.export !== undefined) out.export = wantExport(r.export, `${at}.export`);
  return out;
}

/** What a context entry is called (context/rank.ts): a notation's id or a concept's name. */
const AFFINITY_KIND = /^(notation|concept):[a-z][a-z0-9-]{0,39}$/;
/** What it may lift: grounds, a tool, an offer. */
const AFFINITY_TARGET = /^(on|tool|key):\S{1,80}$/;

function wantAffinity(kind: string, v: unknown, at: string): string[] {
  if (!AFFINITY_KIND.test(kind)) bad(at, `“${kind}” is not a context's entry — a notation:<id> or a concept:<name>`);
  const xs = wantList(v, at, `what ${kind} lifts`, PACK_LIMITS.targets, 1);
  return xs.map((t, i) => {
    if (typeof t !== 'string' || !AFFINITY_TARGET.test(t)) bad(`${at}[${i}]`, `“${String(t)}” lifts nothing a context names — on:<grounds>, tool:<id> or key:<offer>`);
    return t as string;
  });
}

/** Freeze a copy all the way down: the content under one `id@version` never changes. */
function deepFreeze<T>(v: T): T {
  if (v && typeof v === 'object') {
    for (const x of Object.values(v as object)) deepFreeze(x);
    Object.freeze(v);
  }
  return v;
}

/**
 * A pack from outside, walked once. Returns the pack as it will be held — a
 * frozen copy of what was checked — with every entry it refused and why; or,
 * when the pack itself cannot be read, where and why. Never throws.
 */
export function validatePack(value: unknown): PackCheck {
  let head: { id: string; version: number; name: string; describes: string; notation?: string };
  let raw: Record<string, unknown>;
  try {
    raw = wantRecord(value, '', 'the pack');
    const id = wantText(raw.id, 'id', 'its id', 40);
    if (!PACK_ID.test(id)) bad('id', `“${id}” is not a pack's id — lower case, a letter first, then letters, digits and dashes`);
    const version = raw.version;
    if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 1 || version > PACK_LIMITS.version) {
      bad('version', `the version is ${String(version)} — a pack's version is a whole number from 1`);
    }
    head = { id, version: version as number, name: wantText(raw.name, 'name', 'its name', PACK_LIMITS.nameChars), describes: wantText(raw.describes, 'describes', 'what it adds') };
    if (raw.notation !== undefined) {
      const n = wantText(raw.notation, 'notation', 'the notation it carries', 40);
      if (!PACK_ID.test(n)) bad('notation', `“${n}” is not a notation's id`);
      head.notation = n;
    }
    wantList(raw.definitions, 'definitions', 'its definitions', PACK_LIMITS.definitions);
    if (raw.connectors !== undefined) wantList(raw.connectors, 'connectors', 'its connectors', PACK_LIMITS.connectors);
    if (raw.affinities !== undefined) {
      const keys = Object.keys(wantRecord(raw.affinities, 'affinities', 'its affinities'));
      if (keys.length > PACK_LIMITS.affinities) bad('affinities', `it names ${keys.length} affinities, past the ${PACK_LIMITS.affinities} a pack may carry`);
    }
  } catch (err) {
    if (err instanceof Fault) return { ok: false, at: err.at, reason: err.reason };
    throw err;
  }

  const refused: PackFault[] = [];
  const entry = <T>(read: () => T): T | null => {
    try {
      return read();
    } catch (err) {
      if (err instanceof Fault) {
        refused.push({ at: err.at, reason: err.reason });
        return null;
      }
      throw err;
    }
  };

  const definitions: PackDefinition[] = [];
  (raw.definitions as unknown[]).forEach((d, i) => {
    const at = `definitions[${i}]`;
    const got = entry(() => wantDefinition(d, at));
    if (!got) return;
    if (definitions.some((x) => x.name === got.name)) {
      refused.push({ at: `${at}.name`, reason: `“${got.name}” is already a definition of this pack — a name means one thing in it` });
      return;
    }
    definitions.push(got);
  });
  const pack: Pack = { ...head, definitions };

  if (raw.connectors !== undefined) {
    const connectors: PackConnector[] = [];
    (raw.connectors as unknown[]).forEach((c, i) => {
      const at = `connectors[${i}]`;
      const got = entry(() => wantConnector(c, at));
      if (!got) return;
      if (connectors.some((x) => x.name === got.name)) {
        refused.push({ at: `${at}.name`, reason: `“${got.name}” is already a connector of this pack` });
        return;
      }
      connectors.push(got);
    });
    pack.connectors = connectors;
  }

  if (raw.affinities !== undefined) {
    const affinities: Record<string, string[]> = {};
    for (const [kind, v] of Object.entries(raw.affinities as Record<string, unknown>)) {
      const at = `affinities.${kind}`;
      const got = entry(() => wantAffinity(kind, v, at));
      if (got) affinities[kind] = [...new Set(got)];
    }
    pack.affinities = affinities;
  }

  return { ok: true, pack: deepFreeze(pack), refused };
}

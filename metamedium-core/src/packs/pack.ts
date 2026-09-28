// A library pack: premade content, shipped pre-taught (V1-PLAN §2.3, §9 B3).
//
// The command mark is not a special case in the code: it is a signature
// learned from canonical samples, exactly the way a hand's own mark is learned
// when it is drawn five times — one mechanism, shipped pre-taught. A pack is
// the same move for a board's vocabulary. A definition in a pack is a name and
// some drawings of it; the drawings are drawn through the engine (`strokeFor`,
// with seeded jitter, `synthesize.ts`), read by the shape rung and the
// relations like any ink, and their structural signature is what the pack's
// definition is matched by — the same signature, the same floor, the same
// correction a taught definition has (`session/signature.ts`).
//
// Four rules:
//
//   - **A board says which packs it uses.** A `use { pack: 'basics@1' }` event
//     in its log, and `unuse` to stop: a pack's definitions are present only
//     because a `use` event says so, so a board replays with the same library
//     on every machine, undo takes it back, a room carries it. Recognition is
//     never gated on a declaration: a notation shipped in code reads whether
//     or not its pack is in use; a pack in use ADDS — its definitions, its
//     notation's ports on the pen, its affinities in the context.
//   - **Content is immutable per version.** `id@version` names one content
//     forever; changed content is a new version. Content is code-bundled (a
//     `.ts` module exporting the JSON-shaped object, `shipped/`), so both core
//     bundles carry it and the shard's typecheck reads it with no JSON import.
//   - **Read, not trusted** (DATA-1): a pack is validated before it is held
//     (`validate.ts`); a malformed entry is refused with where and why, never
//     thrown, and the rest of the pack stands. An unknown pack named on replay
//     is a notice on the session, and the board still loads.
//   - **What a signature cannot see is a notation.** A signature is a bag of
//     shapes and the links between them: rotation-free and shape-level. A
//     diamond is a box turned 45°, a hollow triangle at a line's end is a
//     head — anything that needs orientation or a head kind is a notation
//     (`src/notations/<id>.ts`, code), and its pack names it (`notation`).

import type { Point } from '../types';
import type { DrawnShape } from '../session/synthesize';
import type { Role } from '../diagram/roles';

/**
 * A definition a pack ships: a name, and drawings of the thing. Matched by
 * structural signature exactly as a taught definition is — its first sample's
 * signature is the definition's, and the others' are its accepted examples,
 * as a correction saying *is* would add them.
 */
export interface PackDefinition {
  /** What it is called: the name a match offers. Unique in its pack; part of its id (`library:basics@1:molecule`). */
  name: string;
  /** What it looks like, in a line: for the library pane, a brief, the bench. */
  describes?: string;
  /**
   * Drawings of it in the shape rung's closed vocabulary — the pen a model
   * holds (`DrawnShape`): each sample one drawing, each shape one mark, in
   * canvas units at zoom 1. Drawn through `strokeFor` with seeded jitter.
   */
  samples?: DrawnShape[][];
  /** Drawings of it as recorded strokes: each sample its marks, each mark its points as a hand left them. */
  strokes?: Point[][][];
  /** The role it plays on the diagram rung, when it is one mark — one of the six, never a seventh. */
  role?: Role;
  /** Where it takes a connector, in words. Ports a pen can feel are a notation's code. */
  ports?: string;
  /** How it is said elsewhere, by format: `{ mermaid: '(({label}))' }`. */
  export?: Record<string, string>;
}

/** What may sit at a connector's end (diagram/heads.ts), or nothing. */
export type PackHead = 'arrow' | 'triangle' | 'diamond' | 'circle' | 'none';
export const PACK_HEADS: readonly PackHead[] = ['arrow', 'triangle', 'diamond', 'circle', 'none'];

/** A kind of connector a pack names: what sits at its end, and how it is said elsewhere. */
export interface PackConnector {
  name: string;
  describes?: string;
  head?: PackHead;
  /** A head drawn filled — ink across its inside. */
  filled?: boolean;
  role?: Role;
  export?: Record<string, string>;
}

/** A library pack, as its module ships it. */
export interface Pack {
  /** Lower case, a letter first: 'basics', 'flowchart', 'garment'. A pack whose id begins `test-` is only for tests and never listed. */
  id: string;
  /** A whole number from 1. Content under one `id@version` never changes. */
  version: number;
  /** For people: 'Basics'. */
  name: string;
  /** One line: what using it adds to a board. */
  describes: string;
  /**
   * The notation this pack carries into use (`src/notations/<id>.ts`): its
   * ports reach the pen while the pack is in use. The notation reads whether
   * or not the pack is used; its content (symbols, roles, Mermaid) stays in
   * its own table, which the pack names and never restates.
   */
  notation?: string;
  definitions: PackDefinition[];
  connectors?: PackConnector[];
  /**
   * What a notation or a concept beside the hand makes likelier while this
   * pack is in use (context/rank.ts): keyed by the context's entry
   * (`notation:flowchart`, `concept:row`), each a list of what it lifts —
   * grounds (`on:clean`), tools (`tool:tidy`) and offers (`key:snap`).
   */
  affinities?: Record<string, string[]>;
}

/** Why a board's pack could not be used here: said, never thrown (V1-PLAN §2.3). */
export interface PackNotice {
  /** What the board named: `garment@2`, or whatever stood where a pack's name should. */
  pack: string;
  /** `unknown`: a well-formed name this build does not ship; `malformed`: no pack's name at all. */
  reason: 'unknown' | 'malformed';
  /** In a sentence, for the status line and the library pane. */
  detail: string;
  /** When the board first said it used it. */
  at: number;
}

/** A pack's id, as `id@version` names it: a letter first, then letters, digits and dashes. */
export const PACK_ID = /^[a-z][a-z0-9-]{0,39}$/;
const REF = /^([a-z][a-z0-9-]{0,39})@([1-9][0-9]{0,5})$/;

/** `basics@1`: the name a board uses a pack by. */
export function packRef(pack: Pick<Pack, 'id' | 'version'>): string {
  return `${pack.id}@${pack.version}`;
}

/** A pack's name read back into its parts, or null when it is no pack's name. */
export function parsePackRef(ref: unknown): { id: string; version: number } | null {
  if (typeof ref !== 'string') return null;
  const m = REF.exec(ref);
  return m ? { id: m[1], version: Number(m[2]) } : null;
}

/** A pack only tests use: never listed in a surface. */
export function isTestPack(pack: Pick<Pack, 'id'>): boolean {
  return pack.id.startsWith('test-');
}

/** Where the node of a pack in use stands in the graph: `library:basics@1`. */
export const libraryId = (ref: string): string => `library:${ref}`;
/** Where a pack's definition stands: `library:basics@1:molecule`. */
export const definitionId = (ref: string, name: string): string => `library:${ref}:${name}`;

/** The pack a library node belongs to, read from its id: `library:basics@1:molecule` → `basics@1`. Null for any other id. */
export function packOfId(id: string): string | null {
  if (!id.startsWith('library:')) return null;
  const rest = id.slice('library:'.length);
  const m = /^([a-z][a-z0-9-]{0,39}@[1-9][0-9]{0,5})(?::|$)/.exec(rest);
  return m ? m[1] : null;
}

/** A notice in a sentence: what a board's log names that this build cannot give it. */
export function describePackNotice(pack: string, reason: PackNotice['reason']): string {
  if (reason === 'malformed') {
    return `this board names a pack as “${pack.slice(0, 60)}”, which is no pack's name (id@version) — nothing was used, and the board is otherwise whole`;
  }
  return `this board uses ${pack}, which this build does not have — its definitions are not matched here, and the board is otherwise whole`;
}

/** Why `use` refused a pack at the door, in a sentence: nothing was written. */
export function describePackRefusal(pack: string, reason: PackNotice['reason']): string {
  if (reason === 'malformed') return `“${pack.slice(0, 60)}” is no pack's name — a pack is named id@version, as basics@1; nothing was used`;
  return `${pack} is not a pack this build ships; nothing was used`;
}

// What a board holds of a pack's definitions while the pack is in use
// (V1-PLAN §2.3, B3): each definition's structural signature, read from its
// own drawings by the engine itself.
//
// The command mark's move, for a board's vocabulary: the built-in check is a
// signature learned from canonical samples exactly the way a hand's own mark
// is learned. A pack's definition is a signature read from its drawings
// exactly the way a taught definition's is — at a bless, `signatureOf` of the
// marks a hand circled, over the relations the canvas stores between them.
// Here the marks are the pack's drawings, drawn hand-like and seeded
// (`synthesize.ts`) onto a scratch board of their own, never onto the board
// that uses the pack. The first drawing's signature is the definition's; every
// other drawing that reads differently is an accepted example, as a
// correction saying *is* would add it (`addExample`). So a pack definition is
// matched, ranked and corrected by the very code a taught one is.
//
// Content under one `id@version` never changes, so what it reads as is kept
// per pack for the life of the process: a replay, a merge and an undo read it
// once.

import type { Point } from '../types';
import type { Session } from '../session/session';
import type { StructuralSignature } from '../session/signature';
import { SAME, compareSignatures, structuralSignature } from '../session/signature';
import { topInterpretation } from '../session/nodes';
import type { Role } from '../diagram/roles';
import type { Pack } from './pack';
import { definitionId, packRef } from './pack';
import { drawingStrokes, drawingsOf, seedOf } from './synthesize';

/** A pack's definition as a board holds it while the pack is in use. */
export interface LibraryDefinition {
  /** `library:basics@1:molecule`: the same on every board, so a correction names it everywhere. */
  id: string;
  /** The pack it came from: `basics@1`. */
  pack: string;
  name: string;
  /** What its first drawing reads as. */
  signature: StructuralSignature;
  /** What its other drawings read as, where they read differently: accepted examples, as a correction would add them. */
  accepted: StructuralSignature[];
  describes?: string;
  role?: Role;
  ports?: string;
  export?: Record<string, string>;
}

/** Where a drawing is read: a scratch board of its own. */
export type ScratchBoard = Pick<Session, 'addStroke' | 'getState'>;

/**
 * A drawing's marks are this far apart in time: past the word window
 * (session/words.ts), so no two of them are ever gathered into a word, and a
 * drawing reads as the marks it draws.
 */
export const MARK_GAP_MS = 5000;

/**
 * One drawing's marks on a fresh scratch board, as declared content (never a
 * gesture — a pack's loop is not a lasso), and the structural signature they
 * read as: the same `structuralSignature` over the same stored relations, with
 * each mark's top reading as its type, that a bless reads.
 */
export function readDrawing(strokes: readonly Point[][], makeBoard: () => ScratchBoard): { ids: string[]; signature: StructuralSignature; board: ScratchBoard } {
  const board = makeBoard();
  const ids: string[] = [];
  strokes.forEach((pts, i) => ids.push(board.addStroke(pts.slice(), (i + 1) * MARK_GAP_MS, undefined, 1, { content: true })));
  const state = board.getState();
  const signature = structuralSignature(ids, state.nodes, (id) => topInterpretation(state.nodes.get(id)!) ?? 'art');
  return { ids, signature, board };
}

/** The seed a definition's drawing is read with — by what it is, so every machine draws the same ink. */
export const drawingSeed = (ref: string, name: string, drawing: { kind: string; index: number }): number =>
  seedOf(`${ref}:${name}:${drawing.kind}:${drawing.index}`);

const read = new WeakMap<Pack, LibraryDefinition[]>();

/** Every definition of a pack as a board holds it: read once per pack, from its own drawings. */
export function libraryDefinitions(pack: Pack, makeBoard: () => ScratchBoard): LibraryDefinition[] {
  const had = read.get(pack);
  if (had) return had;
  const ref = packRef(pack);
  const out: LibraryDefinition[] = [];
  for (const def of pack.definitions) {
    const sigs = drawingsOf(def).map((d) => readDrawing(drawingStrokes(def, d, drawingSeed(ref, def.name, d)), makeBoard).signature);
    if (!sigs.length) continue;
    const [signature, ...rest] = sigs;
    const accepted: StructuralSignature[] = [];
    for (const s of rest) {
      if (compareSignatures(s, signature).score >= SAME) continue;
      if (accepted.some((a) => compareSignatures(a, s).score >= SAME)) continue;
      accepted.push(s);
    }
    out.push({
      id: definitionId(ref, def.name),
      pack: ref,
      name: def.name,
      signature,
      accepted,
      ...(def.describes !== undefined ? { describes: def.describes } : {}),
      ...(def.role !== undefined ? { role: def.role } : {}),
      ...(def.ports !== undefined ? { ports: def.ports } : {}),
      ...(def.export !== undefined ? { export: { ...def.export } } : {}),
    });
  }
  read.set(pack, out);
  return out;
}

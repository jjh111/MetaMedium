// The shipped packs, by `id@version` (V1-PLAN §2.3, B3).
//
// Pack content is code-bundled: each pack is a module in `shipped/` exporting
// the JSON-shaped object, so both core bundles carry it and nothing is fetched
// or parsed at run time. Every module is read through `validatePack` before
// it is held — shipped content is still data — and an entry it refuses is
// kept with its reason (`packRefusals`), which the tests hold at none.
//
// Nothing here is a board's state. Which packs a board uses is its log's to
// say (`use` / `unuse`, session.ts); this only answers what content a name
// stands for, the same answer on every machine, for ever.

import type { Pack } from './pack';
import { isTestPack, packRef } from './pack';
import type { PackFault } from './validate';
import { validatePack } from './validate';
import { BASICS } from './shipped/basics';
import { FLOWCHART_PACK } from './shipped/flowchart';
import { UML_CLASS_PACK } from './shipped/uml-class';
import { SEQUENCE_PACK } from './shipped/sequence';
import { STATE_PACK } from './shipped/state';
import { ER_PACK } from './shipped/er';
import { MINDMAP_PACK } from './shipped/mindmap';
import { TEST_MOLECULE } from './shipped/test-molecule';

/** Where a board's packs come from: a name to its content, or undefined for a name this build does not have. */
export type PackSource = (ref: string) => Pack | undefined;

const shipped = new Map<string, Pack>();
const refusals: (PackFault & { pack: string })[] = [];

function ship(content: unknown): void {
  const check = validatePack(content);
  if (!check.ok) {
    refusals.push({ pack: String((content as { id?: unknown })?.id ?? '?'), at: check.at, reason: check.reason });
    return;
  }
  const ref = packRef(check.pack);
  if (shipped.has(ref)) {
    refusals.push({ pack: ref, at: '', reason: `${ref} is shipped twice — content under one name never changes` });
    return;
  }
  for (const r of check.refused) refusals.push({ pack: ref, ...r });
  shipped.set(ref, check.pack);
}

ship(BASICS);
ship(FLOWCHART_PACK);
ship(UML_CLASS_PACK);
ship(SEQUENCE_PACK);
ship(STATE_PACK);
ship(ER_PACK);
ship(MINDMAP_PACK);
ship(TEST_MOLECULE);

/** The content a pack's name stands for in this build, or undefined. */
export const shippedPack: PackSource = (ref) => shipped.get(ref);

/** Every pack this build ships, in the order they are shipped — test packs too. */
export function shippedPacks(): Pack[] {
  return [...shipped.values()];
}

/** The packs a surface lists: every shipped pack but the ones only tests use. */
export function listedPacks(): Pack[] {
  return shippedPacks().filter((p) => !isTestPack(p));
}

/** What shipped content the validator refused, with where and why — none, in a sound build. */
export function packRefusals(): (PackFault & { pack: string })[] {
  return refusals.map((r) => ({ ...r }));
}

/**
 * What the packs in use say a notation or concept beside the hand makes
 * likelier (context/rank.ts): each entry's targets, every pack's in the order
 * the board uses them, each once. Empty when no pack in use says anything.
 */
export function affinityOf(refs: readonly string[], source: PackSource = shippedPack): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const ref of refs) {
    const pack = source(ref);
    for (const [kind, targets] of Object.entries(pack?.affinities ?? {})) {
      const into = (out[kind] ??= []);
      for (const t of targets) if (!into.includes(t)) into.push(t);
    }
  }
  return out;
}

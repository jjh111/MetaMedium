// Which boards to index again, the key an index is kept under, and the thumbnail's fit (PLAN-IPAD-NOTES I6).
// All three are decisions of values: the surface keeps the index and the pictures where it keeps the journals,
// and asks here what is stale. Nothing here reads a log or a clock.
import type { Bounds } from '../types';
import { sourceIds } from './extract';

/** The format an index is kept in: a new version makes every kept index stale, so every board is read again. */
export const SEARCH_VERSION = 2; // 2: regions' names (I5)

/**
 * The key an index (and a board's thumbnail) is kept under: the board's own record of its change — when it last
 * changed, how many events it holds, how many characters its records take — with the format's version and the
 * sources registered (a new source, a region's, changes what is extracted). A board that changes changes its
 * key; one that did not keeps it. '' when the board's record is not known (it is then never taken as fresh).
 */
export function searchKeyOf(stat: { changed?: number; events?: number; chars?: number } | null | undefined): string {
  if (!stat) return '';
  return [SEARCH_VERSION, sourceIds().join(','), stat.changed || 0, stat.events || 0, stat.chars || 0].join('|');
}

/**
 * What to build and what to let go. `wanted` — the boards the index should hold, in the order to build them
 * (the surface gives the most recent first), each with the key it should be kept under now; `held` — the key each
 * board's kept index has. A board missing, or kept under another key, is built; a kept index for a board that is
 * not wanted (emptied from the trash, say) is dropped. An empty key is never fresh.
 */
export function stalePlan(wanted: readonly { id: string; key: string }[], held: Record<string, string> | ReadonlyMap<string, string>): { build: string[]; drop: string[] } {
  const get = (id: string): string | undefined => (held instanceof Map ? held.get(id) : (held as Record<string, string>)[id]);
  const keys = held instanceof Map ? [...held.keys()] : Object.keys(held);
  const want = new Set(wanted.map((w) => w.id));
  return {
    build: wanted.filter((w) => !w.key || get(w.id) !== w.key).map((w) => w.id),
    drop: keys.filter((k) => !want.has(k)),
  };
}

/**
 * Where a board's content stands in a thumbnail `w` by `h`: the scale and the offset that take the board's
 * content box into the picture, centred, with `pad` round it — the proportions kept, never magnified (a lone
 * dot is a dot, not a blob). No content: the identity.
 */
export function thumbFit(box: Bounds | null | undefined, w: number, h: number, pad = 8): { scale: number; x: number; y: number } {
  if (!box || !isFinite(box.minX + box.minY + box.maxX + box.maxY)) return { scale: 1, x: 0, y: 0 };
  const bw = Math.max(1, box.maxX - box.minX), bh = Math.max(1, box.maxY - box.minY);
  const scale = Math.min(Math.max(1, w - 2 * pad) / bw, Math.max(1, h - 2 * pad) / bh, 1);
  return { scale, x: w / 2 - ((box.minX + box.maxX) / 2) * scale, y: h / 2 - ((box.minY + box.maxY) / 2) * scale };
}

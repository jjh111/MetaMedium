// Regions: *Make it a region* and a typed `region: Monday` (PLAN-IPAD-NOTES I5).
//
// A region is a named rectangle that holds whatever stands inside it (`session/board-regions.ts`). It is
// made two ways from held marks:
//
//   - **A rectangle the hand drew round things** — one held mark that reads as a box and holds the rest of
//     what is held, the way a loop held with press-and-hold arrives with everything inside it. *Make it a
//     region* takes that rectangle as the region's frame: the same box, the ink kept, the name a default the
//     hand renames. Offered only where there is something to hold — `REGION_MIN_HELD` things — because every box a
//     flowchart draws with a word in it is also a rectangle round something, and a pill on each would be
//     noise; a box holding less is made a region by typing (`region: Monday`), the explicit act.
//   - **Marks with no rectangle round them** — typed only (`region: Monday`), never a pill in the row (the
//     row of boxes, the molecule and the line of writing stay as e2e 49 recorded them): the region is drawn
//     round them with a margin (`regionRound`).
//
// Taking is one act through `makeRegion`, which the field's `region:` also comes through, so every region
// a hand makes carries this tool's id: the field closes first (an event of its own, as every tool's does),
// then one `region` event. Undo takes the region away and what it held stays where it stands.

import type { Bounds } from '../types';
import type { Session, SessionState } from '../session/session';
import { boundsOf, getRep, topInterpretation } from '../session/nodes';
import { cleanOf } from '../session/clean';
import { REGION_HOLDS, regionsOfBoard, shareInside, standingBoxOf } from '../session/board-regions';
import type { Offer, Tool, ToolScope } from './tool';

/** Things a rectangle must hold before *Make it a region* is offered for it: three notes make a place; a labelled box does not. */
export const REGION_MIN_HELD = 3;
/** The margin a region drawn round marks stands off them: a share of the larger side, never under the least. */
export const REGION_MARGIN_SHARE = 0.06;
export const REGION_MARGIN_MIN = 20;

const live = (state: SessionState, id: string) => { const n = state.nodes.get(id); return !!n && !getRep(n, 'erased'); };

/** Whether a mark is a box: the shape rung's first reading, or the clean form it holds. */
function isBox(state: SessionState, id: string): boolean {
  const n = state.nodes.get(id);
  if (!n || !getRep(n, 'stroke')) return false;
  return topInterpretation(n) === 'rectangle' || cleanOf(n)?.shape === 'rectangle';
}

/**
 * The rectangle a held group stands in: the largest held box that holds every other held mark
 * (`REGION_HOLDS`, the region's own rule) — with the marks it holds — or null.
 */
export function regionFrameOf(state: SessionState, ids: readonly string[]): { frame: string; held: string[] } | null {
  const marks = ids.filter((id) => live(state, id));
  let best: { frame: string; held: string[]; area: number } | null = null;
  for (const id of marks) {
    if (!isBox(state, id)) continue;
    const b = boundsOf(state.nodes.get(id)!);
    if (!b) continue;
    const others = marks.filter((o) => o !== id);
    if (!others.length) continue;
    const inside = others.every((o) => { const ob = standingBoxOf(state.nodes, state.nodes.get(o)!); return !!ob && shareInside(ob, b) >= REGION_HOLDS; });
    if (!inside) continue;
    const area = (b.maxX - b.minX) * (b.maxY - b.minY);
    if (!best || area > best.area) best = { frame: id, held: others, area };
  }
  return best ? { frame: best.frame, held: best.held } : null;
}

/** The box round held marks, a margin out: where a region made round them stands. Null when none has a box. */
export function regionRound(state: SessionState, ids: readonly string[]): Bounds | null {
  let box: Bounds | null = null;
  for (const id of ids) {
    const n = state.nodes.get(id);
    const b = n && live(state, id) ? standingBoxOf(state.nodes, n) : undefined;
    if (!b) continue;
    box = box ? { minX: Math.min(box.minX, b.minX), minY: Math.min(box.minY, b.minY), maxX: Math.max(box.maxX, b.maxX), maxY: Math.max(box.maxY, b.maxY) } : { ...b };
  }
  if (!box) return null;
  const m = Math.max(REGION_MARGIN_MIN, REGION_MARGIN_SHARE * Math.max(box.maxX - box.minX, box.maxY - box.minY));
  return { minX: box.minX - m, minY: box.minY - m, maxX: box.maxX + m, maxY: box.maxY + m };
}

/** *Region 1*, *Region 2* …: the first name no region here has. */
export function nextRegionName(state: SessionState): string {
  const taken = new Set(regionsOfBoard(state).map((r) => r.name.toLowerCase()));
  for (let n = 1; ; n++) if (!taken.has('region ' + n)) return 'Region ' + n;
}

/** What making a region did: where it stands, what it was made from, and how many things it holds at once. */
export interface RegionMade { id: string; name: string; around: 'frame' | 'marks'; bounds: Bounds }

/**
 * Make a region of held marks, as one act stamped with this tool: a rectangle among them that holds the rest
 * is the region's frame (its box, the ink kept); otherwise the region is drawn round them. `name` is the
 * hand's word, or a default. The field `summonId` closes first, when given. Null when there is nothing to
 * stand a region round.
 */
export function makeRegion(
  session: Session,
  args: { ids: readonly string[]; name?: string; at: number; summonId?: string | null; offer?: string; frameOnly?: boolean }
): RegionMade | null {
  const state = session.getState();
  const name = (args.name ?? '').trim() || nextRegionName(state);
  const found = regionFrameOf(state, args.ids);
  let bounds: Bounds | null = null, from: string | undefined, around: 'frame' | 'marks' = 'marks';
  if (found) {
    bounds = boundsOf(state.nodes.get(found.frame)!) ?? null;
    from = found.frame;
    around = 'frame';
  } else if (!args.frameOnly) {
    bounds = regionRound(state, args.ids);
  }
  if (!bounds) return null;
  const b = bounds;
  return session.withTool(REGION.id, () => {
    if (args.summonId && state.summon && state.summon.id === args.summonId) session.dismiss(args.summonId, args.at);
    if (session.getState().selection.length) session.deselect(args.at);
    const id = session.region({ name, bounds: b, ...(from ? { from } : {}), at: args.at });
    return id ? { id, name, around, bounds: b } : null;
  }, args.offer ?? 'region');
}

export const REGION: Tool = {
  id: 'region',
  name: 'regions',
  describe: () => 'a named rectangle on the board that holds whatever stands inside it — ink, pictures, text, figures — and takes it along when it moves; made of a rectangle drawn round things, or typed (region: Monday) round the marks held',
  offers(scope: ToolScope) {
    const found = regionFrameOf(scope.state, scope.marks);
    if (!found || found.held.length < REGION_MIN_HELD) return [];
    return [{
      key: 'region',
      label: 'Make it a region',
      reason: 'the rectangle holds ' + found.held.length + ' marks — make it a place on the board, named, that takes what stands inside it when it moves; your ink stays, and type region: and a name to name it',
      base: 0.3,
      tool: 'region',
      verbs: ['make it a region', 'make a region', 'region'],
      data: { ids: scope.marks.slice() },
    } satisfies Offer];
  },
  take(offer, scope, session, at) {
    const d = offer.data as { ids: string[] };
    const made = makeRegion(session, { ids: d.ids, at, summonId: scope.summon.id, offer: offer.key });
    return made ? { made: made.id, detail: made } : { detail: null };
  },
};

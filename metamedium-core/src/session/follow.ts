// Bindings follow (V1-PLAN §4 and §9 E2; CONTROL-POINTS-PLAN P3, as amended).
//
// John, on a board worked like a diagram: *smart connecting points when it
// becomes a diagram* — a moved box carries its arrows. A connector bound to a
// site (a `bound-to` edge per end, BIND-1, magnets.ts) re-derives its end when
// the mark it is bound to moves, scales, turns, is reshaped or tidied.
//
// ===== Derived, never logged =====
//
// The amendment to P3 (V1-PLAN §4): the re-anchoring is DERIVED at replay from
// the bindings, not logged as extra events — state is a pure function of the
// log, and the bindings already are in it. So a move writes one event and the
// arrows follow in the apply path; undo of the move takes them back by itself.
//
// ===== The derived form: a map, in the connector's own space =====
//
// Today's `'transform'` is a frame (Bounds) and `'rotation'` an angle about
// its centre: neither can say "turn about this END and stretch", which is what
// a connector does when one end is held and the other follows. So a connector
// that follows holds a `'follow'` rep (FollowRep below) whose `map` is an
// affine map of its OWN space — the space its ink was drawn in — applied
// before the hand's transform and turn (`placed`, nodes.ts). Its ink, its
// clean form, its reading's tip and tail, its sites and its handles are all
// carried by it, as they are by a move: the ink is never touched.
//
// Why its own space, and not the board's: what the hand does to the connector
// afterwards — moves it, scales it, turns it — is done to its transform and
// turn, on the board, exactly as to any mark. Held on the board, a follow
// that had turned the connector would turn every later move with it.
//
// ===== What a correction is =====
//
// Whenever a mark changes where it stands (a move, a scale, a turn, a tidy, a
// reshape, a snap) and whenever a binding is made, the connectors bound to it
// — and the changed connector itself — are read again (`followed`): each
// ACTIVE bound end (`activeBindingsOf`: a tombstoned target moves nothing)
// is found where it stands (`connectorEnds`) and where its site stands now
// (`boundSiteOf`, magnets.ts), and a correction on the board carries the one
// onto the other:
//
//   - ONE bound end: the similarity that holds the free end and takes the
//     bound end to its site — the connector pivots and stretches about its
//     free end;
//   - TWO: the similarity that carries both ends to both sites; when both
//     sites moved alike (one mark moved with both ends on it) that is a
//     translation, and when the two sites meet — both ends on one site — it
//     is the translation by the mean of the two steps, so the connector never
//     collapses to a point;
//   - a connector of no length, or a site that would leave it none: a step.
//
// The correction is composed onto the map the connector already held, so a
// correction is where the connector STANDS carried to where its sites are —
// and a binding let go (an `unbind`, or its target erased) leaves the
// connector where it stood: nothing jumps back to where the ink was drawn.
// A bind carries its end onto the site at once, so the board is the same
// whether a move merged before a bind or after it.
//
// ===== A connector's ends =====
//
// A binding names a STROKE's end — its start or its end as drawn. Where that
// end stands is the connector's own: a line's or an arc's first and last
// point; an arrow's tail and its tip. For ink, an arrow's tip is the ink the
// pen first reached farthest along its shaft (`inkEndsOf`, heads.ts) — the
// rung's own tip can sit a wing's length short of it. For a connector that
// holds a clean form — drawn clean, or reshaped by a hand (E1) — the form's
// own ends: the form is where it stands.
//
// ===== The hand on the connector itself (the director's decision) =====
//
// The session's doors (session.ts) decide, and write the decision as events
// in the same act, so one undo takes it all back: a connector's own bound end
// dragged by its handle and released where a magnet holds it binds there (the
// old claim for that end replaced — BIND-1 removes by end); released anywhere
// else, that end is let go (`unbind`). A connector moved whole by the hand —
// a move, a scale or a turn of it, or its middle handle — lets go of the ends
// that no longer sit on their sites (`sitsOn`: within the magnet's reach, the
// reach the pen was held within when it bound there). A nudge the magnet
// still holds lets go of nothing, and the follow puts the end back.

import type { Point } from '../types';
import type { MMNode, Rep } from './nodes';
import { boundsOf, followMapOf, getRep, placed, placementOf, standingPointsOf } from './nodes';
import { cleanOf } from './clean';
import { activeBindingsOf, bindingsOf, boundSiteOf, magnetRadius } from './magnets';
import { type Manipulation, manipulableOf, manipulationMap } from './manipulate';
import { cleanFormOf, MIN_EXTENT_PX } from './handles';
import { inkEndsOf } from '../diagram/heads';
import { type Affine, IDENTITY, carry, compose, invert, isAffine, pivotMap, translation } from './affine';

/** The shapes whose two ends a binding names as its start and its end. */
const CONNECTORS = new Set(['line', 'arrow', 'arc']);

/** A connector's two ends where it stands now, by the end of the stroke each is, and which of them is its tail. */
export interface ConnectorEnds {
  start: Point;
  end: Point;
  /** Which stroke end is the tail — the start, unless an arrow was drawn head first. */
  tail: 'start' | 'end';
}

/** What the `'follow'` rep a connector that follows its bindings holds says. */
export interface FollowRep {
  /**
   * The map its bindings have carried it by, in its OWN space (the space its
   * ink was drawn in): applied before the hand's transform and turn.
   */
  map: Affine;
  /** Each end it carried the last time it followed, and where its site stood then. */
  ends: { end: 'start' | 'end'; nodeId: string; site: { kind: string; index: number }; at: Point }[];
  /** Why, in words. */
  reasoning: string;
}

/** A correction shorter than this carries nothing: a board unit in ten million. */
export const SITS_EXACTLY = 1e-7;

const dist = (p: Point, q: Point) => Math.hypot(p.x - q.x, p.y - q.y);
const strokeScale = (node: MMNode) => {
  const s = (getRep(node, 'stroke')?.data as { scale?: number } | undefined)?.scale;
  return s && s > 0 ? s : 1;
};

/** Which stroke end an arrow's tail is: its start, unless the rung read its head at the start. */
function tailEndOf(node: MMNode): 'start' | 'end' {
  const meta = getRep(node, 'reading:arrow')?.data as { head?: string } | undefined;
  return meta?.head === 'start' ? 'end' : 'start';
}

/**
 * Where a connector's two ends stand now: the ends of the clean form it
 * holds — drawn clean or reshaped — else of its ink (an arrow's true tip),
 * else a stroke's first and last points as they stand. Null for a mark with
 * no ink.
 */
export function connectorEnds(node: MMNode, nodes: ReadonlyMap<string, MMNode>): ConnectorEnds | null {
  const raw = (getRep(node, 'stroke')?.data as { points?: Point[] } | undefined)?.points;
  if (!raw || raw.length < 2) return null;
  const clean = cleanOf(node);
  if (clean && Array.isArray(clean.points) && clean.points.length >= 2 && CONNECTORS.has(clean.shape)) {
    const tailOwn = clean.points[0];
    const tipOwn = clean.shape === 'arrow' ? clean.points[1] : clean.points[clean.points.length - 1];
    const [tail, tip] = placed(node, [tailOwn, tipOwn]);
    const t = clean.shape === 'arrow' ? tailEndOf(node) : 'start';
    return t === 'start' ? { start: tail, end: tip, tail: t } : { start: tip, end: tail, tail: t };
  }
  const ink = inkEndsOf(node, nodes);
  if (ink) return ink;
  const pts = standingPointsOf(node);
  return pts && pts.length >= 2 ? { start: pts[0], end: pts[pts.length - 1], tail: 'start' } : null;
}

/**
 * The end of a stroke a handle drags, when it drags one: a line's, an
 * arrow's or an arc's tail or tip (E1's handles, the magnets' own sites).
 * Null for every other handle — a middle, a centre, a corner.
 */
export function endOfHandle(node: MMNode, nodes: ReadonlyMap<string, MMNode>, kind: string): 'start' | 'end' | null {
  if (kind !== 'tail' && kind !== 'tip') return null;
  const form = cleanFormOf(node, nodes);
  if (!form || !CONNECTORS.has(form.clean.shape)) return null;
  const tail = form.clean.shape === 'arrow' ? tailEndOf(node) : 'start';
  if (kind === 'tail') return tail;
  return tail === 'start' ? 'end' : 'start';
}

/** Whether a handle moves a mark's form whole rather than one point of it: a line's or an arrow's middle, a centre, a dot's point. */
export function movesWhole(shape: string, kind: string): boolean {
  return kind === 'centre' || kind === 'point' || (kind === 'middle' && (shape === 'line' || shape === 'arrow'));
}

/**
 * How near a bound end must stand to its site to still sit on it: the
 * magnet's own reach for that mark, in the hand's pixels as they were when
 * the connector was drawn — the reach within which the pen binds.
 */
export function holdReach(target: MMNode, connector: MMNode): number {
  const b = boundsOf(target);
  const size = b ? Math.max(b.maxX - b.minX, b.maxY - b.minY) : 0;
  return magnetRadius(Number.isFinite(size) ? size : 0, strokeScale(connector));
}

/** Whether a point sits on a site: within the magnet's reach of it. */
export function sitsOn(end: Point, site: Point, target: MMNode, connector: MMNode): boolean {
  return dist(end, site) <= holdReach(target, connector);
}

/**
 * The bound ends a hand's move, scale or turn of these marks walks off their
 * sites: for each connector it moves, each binding to a mark not moved with
 * it whose end, carried where the manipulation takes it, would stand beyond
 * the magnet's reach of its site (`sitsOn`). A claim the hand walked away
 * from is let go; one on a mark moved with it, or one the magnet still
 * holds, is kept — and the follow puts that end back on its site. The
 * session's door writes an `unbind` for each, first, in the manipulation's
 * own act; a surface's preview of the drag asks the same.
 */
export function releasedBy(nodes: ReadonlyMap<string, MMNode>, ids: readonly string[], m: Manipulation): { strokeId: string; end: 'start' | 'end' }[] {
  const moved = manipulableOf(nodes, ids);
  const together = new Set(moved.map((n) => n.id));
  const map = manipulationMap(m);
  const out: { strokeId: string; end: 'start' | 'end' }[] = [];
  for (const n of moved) {
    const bs = bindingsOf(n).filter((b) => b.end === 'start' || b.end === 'end');
    if (!bs.length) continue;
    const ends = connectorEnds(n, nodes);
    for (const b of bs) {
      if (together.has(b.nodeId)) continue;
      const target = nodes.get(b.nodeId);
      const site = target && boundSiteOf(target, nodes, b.site);
      const at = ends ? (b.end === 'start' ? ends.start : ends.end) : null;
      if (target && site && at && sitsOn(map(at), site.point, target, n)) continue;
      out.push({ strokeId: n.id, end: b.end as 'start' | 'end' });
    }
  }
  return out;
}

/** A binding a handle drag makes: this end, on this site of that mark. */
export interface Tie {
  end: 'start' | 'end';
  nodeId: string;
  site: { kind: string; index: number };
}

/**
 * What a handle drag does to a mark's own bindings (V1-PLAN E2, the
 * director's decision), given the mark as the drag leaves it (`reshaped`, the
 * node `reshapePreview` gives, holding its `shape`) and the site a magnet
 * holds where the hand let go, if one does: a connector's own tail or tip
 * binds there — the old claim for that end replaced — and lets go anywhere
 * else; a handle that moves it whole (its middle) lets go of the ends that no
 * longer sit on their sites. The session's `reshape` door writes the unbinds,
 * the reshape and the bind in one act; a surface's preview mirrors them.
 */
export function reshapeDecision(
  node: MMNode,
  nodes: ReadonlyMap<string, MMNode>,
  handle: { kind: string; index: number },
  reshaped: MMNode,
  shape: string,
  hold?: { nodeId: string; site: { kind: string; index: number } } | null,
): { releases: ('start' | 'end')[]; tie: Tie | null } {
  const bs = bindingsOf(node).filter((b) => b.end === 'start' || b.end === 'end');
  const releases: ('start' | 'end')[] = [];
  const end = endOfHandle(node, nodes, handle.kind);
  if (end) {
    const held =
      hold && typeof hold.nodeId === 'string' && hold.nodeId !== node.id && nodes.has(hold.nodeId) && hold.site && typeof hold.site.kind === 'string' && Number.isInteger(hold.site.index)
        ? hold
        : null;
    const current = bs.find((b) => b.end === end);
    const same = !!held && !!current && current.nodeId === held.nodeId && current.site.kind === held.site.kind && current.site.index === held.site.index;
    if (current && !same) releases.push(end);
    return { releases, tie: held && !same ? { end, nodeId: held.nodeId, site: { kind: held.site.kind, index: held.site.index } } : null };
  }
  if (bs.length && movesWhole(shape, handle.kind)) {
    const ends = connectorEnds(reshaped, nodes);
    for (const b of bs) {
      const target = nodes.get(b.nodeId);
      const site = target && boundSiteOf(target, nodes, b.site);
      const at = ends ? (b.end === 'start' ? ends.start : ends.end) : null;
      if (target && site && at && sitsOn(at, site.point, target, node)) continue;
      releases.push(b.end as 'start' | 'end');
    }
  }
  return { releases, tie: null };
}

/** A mark as it stands with these ends' bindings let go: its `bound-to` edges for them left out — what a preview draws a drag's result from. */
export function lettingGo(node: MMNode, ends: readonly ('start' | 'end')[]): MMNode {
  if (!ends.length) return node;
  return { ...node, edges: node.edges.filter((e) => !(e.rel === 'bound-to' && ends.includes(e.end as 'start' | 'end'))) };
}

/** The map a connector holds from its bindings, read from its `'follow'` rep — or nothing. */
export function followOf(node: MMNode): FollowRep | undefined {
  return followMapOf(node) ? (getRep(node, 'follow')!.data as FollowRep) : undefined;
}

interface Held {
  end: 'start' | 'end';
  nodeId: string;
  site: { kind: string; index: number };
  /** Where the site stands now. */
  point: Point;
}

/** Each active bound end of a connector with its site found where it stands now, the start first. */
function heldEnds(node: MMNode, nodes: ReadonlyMap<string, MMNode>): Held[] {
  const out: Held[] = [];
  for (const b of activeBindingsOf(node, nodes)) {
    if ((b.end !== 'start' && b.end !== 'end') || b.nodeId === node.id) continue;
    const target = nodes.get(b.nodeId);
    const site = target && boundSiteOf(target, nodes, b.site);
    if (!site || !Number.isFinite(site.point.x) || !Number.isFinite(site.point.y)) continue;
    out.push({ end: b.end, nodeId: b.nodeId, site: { kind: b.site.kind, index: b.site.index }, point: { x: site.point.x, y: site.point.y } });
  }
  return out.sort((p, q) => (p.end === q.end ? 0 : p.end === 'start' ? -1 : 1));
}

/**
 * The correction, on the board, that carries each held end onto its site —
 * null when they stand there already. See the file's header for the three
 * cases; `floor` is the least length a connector is left with.
 */
function correction(ends: ConnectorEnds, held: Held[], floor: number): Affine | null {
  const at = (e: 'start' | 'end') => (e === 'start' ? ends.start : ends.end);
  if (held.length === 1) {
    const h = held[0];
    const E = at(h.end), S = h.point, F = at(h.end === 'start' ? 'end' : 'start');
    if (dist(E, S) <= SITS_EXACTLY) return null;
    // A connector of no length, or a site that would leave it none: a step, never a collapse.
    if (dist(E, F) < floor || dist(S, F) < floor) return translation(S.x - E.x, S.y - E.y);
    return pivotMap(F, E, S);
  }
  const [h1, h2] = held;
  const E1 = at(h1.end), E2 = at(h2.end);
  const d1 = { x: h1.point.x - E1.x, y: h1.point.y - E1.y }, d2 = { x: h2.point.x - E2.x, y: h2.point.y - E2.y };
  if (Math.hypot(d1.x, d1.y) <= SITS_EXACTLY && Math.hypot(d2.x, d2.y) <= SITS_EXACTLY) return null;
  const step = translation((d1.x + d2.x) / 2, (d1.y + d2.y) / 2);
  // Both sites moved alike — one mark moved with both ends on it: a translation.
  if (Math.hypot(d1.x - d2.x, d1.y - d2.y) <= SITS_EXACTLY) return step;
  // Both ends on one site, or a connector of no length: the mean step, never a collapse.
  if (dist(E1, E2) < floor || dist(h1.point, h2.point) < floor) return step;
  return carry(E1, E2, h1.point, h2.point);
}

function said(held: Held[]): string {
  const where = (h: Held) => `${h.site.kind} ${h.site.index} of ${h.nodeId}`;
  if (held.length === 1) return `its ${held[0].end} follows ${where(held[0])}`;
  return `its ${held[0].end} follows ${where(held[0])}, and its ${held[1].end} ${where(held[1])}`;
}

/**
 * The `'follow'` rep a connector holds once its bound ends stand on their
 * sites: the correction that carries them there, composed onto the map it
 * held, in its own space — or null when they stand there already, or it has
 * no active binding whose site can be found. The one function the session's
 * apply path and the surface's preview both run.
 */
export function followed(node: MMNode, nodes: ReadonlyMap<string, MMNode>): Rep | null {
  if (!getRep(node, 'stroke') || getRep(node, 'erased')) return null;
  const held = heldEnds(node, nodes);
  if (!held.length) return null;
  const ends = connectorEnds(node, nodes);
  if (!ends) return null;
  const C = correction(ends, held, MIN_EXTENT_PX * strokeScale(node));
  if (!C) return null;
  const M = placementOf(node);
  const back = invert(M);
  if (!back) return null;
  const map = compose(back, compose(C, compose(M, followMapOf(node) ?? IDENTITY)));
  if (!isAffine(map)) return null;
  const data: FollowRep = {
    map,
    ends: held.map((h) => ({ end: h.end, nodeId: h.nodeId, site: h.site, at: h.point })),
    reasoning: said(held),
  };
  return { modality: 'follow', data, source: 'engine' };
}

/** A connector is read again at most this many times for one change: a ring of connectors bound to each other ends. */
export const FOLLOW_VISITS = 8;

/**
 * Carry everything that follows what changed: the connectors bound to a
 * changed mark, a changed mark that is itself bound, and on down the chain —
 * round by round, each round in id order, each connector at most
 * FOLLOW_VISITS times. `refollow(id)` reads one connector again and says
 * whether it now stands somewhere else. Returns how many times one did.
 */
export function followThrough(
  changed: Iterable<string>,
  followersOf: (id: string) => Iterable<string>,
  isBound: (id: string) => boolean,
  refollow: (id: string) => boolean,
): number {
  const first = new Set<string>();
  for (const id of changed) {
    for (const k of followersOf(id)) first.add(k);
    if (isBound(id)) first.add(id);
  }
  let round = [...first].sort();
  const visits = new Map<string, number>();
  let moved = 0;
  while (round.length) {
    const next = new Set<string>();
    for (const id of round) {
      const v = visits.get(id) ?? 0;
      if (v >= FOLLOW_VISITS) continue;
      visits.set(id, v + 1);
      if (!refollow(id)) continue;
      moved++;
      for (const k of followersOf(id)) next.add(k);
    }
    round = [...next].sort();
  }
  return moved;
}

/** What is bound to each mark: the connectors whose ends are bound to it, active or not, each once. */
export function boundByIndex(nodes: ReadonlyMap<string, MMNode>): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const [id, n] of nodes) {
    for (const e of n.edges) {
      if (e.rel !== 'bound-to' || typeof e.end !== 'string' || !e.site) continue;
      const list = out.get(e.to);
      if (!list) out.set(e.to, [id]);
      else if (!list.includes(id)) list.push(id);
    }
  }
  return out;
}

/**
 * What would follow if some marks stood as `changed` says — a drag's preview,
 * before the log has it: each connector that would follow, as it would stand,
 * carried by the same `followed` the replay runs, down the chain. `boundBy`
 * is `boundByIndex(nodes)`, handed in by a caller that keeps it.
 */
export function followPreview(
  nodes: ReadonlyMap<string, MMNode>,
  changed: ReadonlyMap<string, MMNode>,
  boundBy: ReadonlyMap<string, readonly string[]> = boundByIndex(nodes),
): Map<string, MMNode> {
  const board = new Map(nodes);
  for (const [id, n] of changed) board.set(id, n);
  const out = new Map<string, MMNode>();
  followThrough(
    changed.keys(),
    (id) => boundBy.get(id) ?? [],
    (id) => !!board.get(id)?.edges.some((e) => e.rel === 'bound-to'),
    (id) => {
      const n = board.get(id);
      const rep = n && followed(n, board);
      if (!n || !rep) return false;
      const moved: MMNode = { ...n, reps: [...n.reps.filter((r) => r.modality !== 'follow'), rep] };
      board.set(id, moved);
      out.set(id, moved);
      return true;
    },
  );
  return out;
}

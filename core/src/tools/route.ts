// Routing: connectors at right angles between their ports (V1-PLAN §3, §9 D7).
//
// A drawing that reads as a notation and holds connectors tied at both ends is
// offered three things, at tier 1 — no model, and the ink never touched:
//
//   - *Tidy the diagram*: tidy's alignment of the symbols (each rank of two or
//     more lined up and spaced, `session.tidy`, the writing standing inside or
//     beside a symbol moved with it) and every tied connector routed, in ONE
//     act — one undo takes the whole tidy away;
//   - *Route the connectors*: the routing alone;
//   - *Show the connectors as drawn*, once any is routed: the routing taken
//     off, the hand's ink in front again.
//
// What a route is — a `route` event, a derived polyline, the hand's ink faint
// beneath — is `diagram/route.ts`. It is offered only where a connector can be
// routed: not a row of boxes, not a molecule, not a flowchart drawn with its
// arrows loose (nothing ties them to a port, so there is no port to leave).
// A sequence diagram's messages are level by definition, and its lifelines are
// long ports the messages meet, so it is left as drawn.

import type { Bounds } from '../types';
import { boundsOf } from '../session/nodes';
import type { SessionState } from '../session/session';
import { NOTATION_FLOOR, describeNotation, notationsOf } from '../notations/notation';
import type { NotationReading } from '../notations/notation';
import { routable, routeRepOf, tidyPlanOf } from '../diagram/route';
import type { Session } from '../session/session';
import type { Tool, ToolScope } from './tool';

/** A rank whose centres stand off one line by no more than this, in board units, is lined up already. */
export const TIDY_TOLERANCE = 0.5;

/** Notations that are left as drawn: a sequence's messages run level between its lifelines. */
const LEFT_AS_DRAWN = new Set(['sequence']);

/** What a scope's marks are as a diagram with connectors to route: the reading, and what there is to do to it. */
export function diagramOf(state: SessionState, ids: readonly string[]) {
  for (const reading of notationsOf(state, ids)) {
    if (reading.confidence < NOTATION_FLOOR || LEFT_AS_DRAWN.has(reading.notation)) continue;
    const tied = reading.connectors.map((c) => c.id).filter((id) => routable(state.nodes.get(id)!, state.nodes));
    if (!tied.length) continue;
    const toRoute = tied.filter((id) => !routeRepOf(state.nodes.get(id)!));
    const routed = tied.filter((id) => !!routeRepOf(state.nodes.get(id)!));
    const plan = tidyPlanOf(state.nodes, reading);
    return { reading, toRoute, routed, plan, unaligned: plan.ranks.filter((r) => r.spread > TIDY_TOLERANCE) };
  }
  return null;
}

const reasonOf = (reading: NotationReading) => `${describeNotation(reading)} — connectors at right angles between their ports; your ink stays faint beneath`;

const centreOf = (b: Bounds) => ({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 });

/**
 * Line up the ranks of a diagram's symbols, carrying the writing that labels
 * each with it, and route every connector tied at both ends — the doing of
 * *Tidy the diagram*, inside the caller's one act. Returns how many ranks were
 * lined up and how many connectors were routed.
 */
export function tidyDiagram(session: Session, reading: NotationReading, at: number): { ranks: number; routed: number } {
  let ranks = 0;
  const plan = tidyPlanOf(session.getState().nodes, reading);
  for (const rank of plan.ranks) {
    if (rank.spread <= TIDY_TOLERANCE) continue;
    const before = new Map(rank.ids.map((id) => [id, centreOf(boundsOf(session.getState().nodes.get(id)!)!)]));
    session.tidy({ ids: rank.ids, mode: 'align', axis: rank.axis, at });
    ranks++;
    const state = session.getState();
    for (const id of rank.ids) {
      const now = boundsOf(state.nodes.get(id)!);
      const was = before.get(id)!;
      if (!now) continue;
      const c = centreOf(now), dx = c.x - was.x, dy = c.y - was.y;
      if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) continue;
      // Writing standing on a symbol is a mark of its own: it goes where the symbol went.
      const words = reading.labels.filter((l) => l.of === id && l.id !== id && state.contentIds.includes(l.id)).map((l) => l.id);
      if (words.length) session.move({ ids: words, dx, dy, at });
    }
  }
  const state = session.getState();
  const ids = reading.connectors.map((c) => c.id).filter((id) => state.nodes.get(id) && routable(state.nodes.get(id)!, state.nodes) && !routeRepOf(state.nodes.get(id)!));
  return { ranks, routed: session.route({ ids, at }) };
}

export const ROUTE: Tool = {
  id: 'route',
  name: 'routing',
  describe: () => 'connectors drawn at right angles between their ports, or the whole diagram tidied — its symbols lined up and its connectors routed; the ink kept faint beneath',
  offers(scope: ToolScope) {
    if (scope.marks.length < 2) return [];
    if (scope.marks.some((id) => scope.state.artifacts.includes(id))) return [];
    const d = diagramOf(scope.state, scope.marks);
    if (!d) return [];
    const out = [];
    const n = d.reading.notation;
    if (d.toRoute.length || d.unaligned.length) {
      out.push({
        key: 'tidy-diagram',
        label: 'Tidy the diagram',
        reason: reasonOf(d.reading),
        base: 0.32,
        tool: 'route',
        verbs: ['tidy the diagram', 'tidy diagram', 'tidy up the diagram'],
        data: { notation: n },
      });
    }
    if (d.toRoute.length) {
      out.push({
        key: 'route',
        label: 'Route the connectors',
        reason: reasonOf(d.reading),
        base: 0.28,
        tool: 'route',
        verbs: ['route', 'orthogonal', 'right angles'],
        data: { notation: n },
      });
    }
    if (d.routed.length) {
      out.push({
        key: 'unroute',
        label: 'Show the connectors as drawn',
        reason: `${d.routed.length === 1 ? 'the routed connector' : d.routed.length + ' routed connectors'} back as you drew ${d.routed.length === 1 ? 'it' : 'them'} — the routing taken off, your ink in front again`,
        base: 0.12,
        tool: 'route',
        verbs: ['unroute', 'as drawn', 'show the ink'],
        data: { notation: n },
      });
    }
    return out;
  },
  take(offer, scope, session, at) {
    const notation = (offer.data as { notation?: string } | undefined)?.notation;
    const state = session.getState();
    const d = diagramOf(state, scope.marks);
    if (!d || (notation && d.reading.notation !== notation)) return { detail: { ok: false, error: 'the marks held no longer read as a diagram with connectors to route' } };
    if (offer.key === 'unroute') return { detail: { ok: true, unrouted: session.route({ ids: d.routed, mode: 'raw', at }) } };
    if (offer.key === 'route') return { detail: { ok: true, routed: session.route({ ids: d.toRoute, at }) } };
    const done = tidyDiagram(session, d.reading, at);
    return { detail: { ok: true, ...done, notation: d.reading.notation } };
  },
};

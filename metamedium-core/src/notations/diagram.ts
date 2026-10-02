// A diagram: the class a drawing belongs to when it is nodes joined by connectors
// tied at both ends, and no notation says more (PLAN-FIELD-PAR FP2, 2 Oct 2026).
//
// John drew two squares and a line between them, tied at both ends, and the
// engine knew exactly that — two nodes joined by one edge — but every notation
// read it under the floor (a flowchart 0.36: no head says which way it flows;
// an ER diagram 0.16: no multiplicity, no verb), and every tool a diagram has —
// Make it Mermaid, Tidy the diagram, Route the connectors — keys off a notation
// clearing its floor. So the plainest graph got none of them.
//
// This notation is the FALLBACK: read last, and said only when no other
// notation clears `NOTATION_FLOOR` (`fallback` in `notationsOf`). Its reading is
// the flowchart's own — symbols, connectors, labels and roles — because a plain
// diagram is said in Mermaid as a flowchart with its symbols' own brackets and
// `---` for a line with no head; it writes the flowchart's Mermaid (mermaid.ts).
//
// What it is NOT is the rule, so a later class can claim its own drawings the
// same way: **a graph whose nodes are all circles is the molecule's** (John, 2
// Oct: *the molecule is its own thing — we will have expandable classes of
// things*). A molecule held is read by its pack, never as a diagram.
//
// Its confidence is measured, never assigned: from the floor up by how much of
// the drawing is tied (`TIED_LIFT` × the share of connectors whose ends both land
// on a symbol by a magnet's bind), held under the shape rung's own ceiling.

import type { SessionState } from '../session/session';
import { getRep } from '../session/nodes';
import { analyzeStroke } from '../recognition';
import { MAX_TIER0_CONFIDENCE } from '../recognition';
import type { Notation, NotationReading } from './notation';
import { NOTATION_FLOOR } from './notation';
import { readFlowchart, scaleOf } from './flowchart';
import { inkOf, countWord } from './graph-kit';

/** How far above the floor a drawing whose every connector is tied at both ends reads. */
export const TIED_LIFT = 0.2;

/** The notation's id, and what it is called on the surface: *a diagram 0.70*. */
export const DIAGRAM_NOTATION = 'diagram';

/** The ink of a mark the shape rung reads first as a circle — a molecule's bubble. */
function readsAsCircle(state: SessionState, ids: readonly string[]): boolean {
  if (ids.length !== 1) return false;
  const node = state.nodes.get(ids[0]);
  if (!node || !getRep(node, 'stroke')) return false;
  const pts = inkOf(node);
  if (pts.length < 3) return false;
  const top = analyzeStroke(pts, scaleOf(node)).results[0];
  return !!top && top.type === 'circle';
}

/** A diagram's reading of the scope, or null when it is no graph of tied nodes. */
export function readDiagram(state: SessionState, scopeIds?: readonly string[]): NotationReading | null {
  const r = readFlowchart(state, scopeIds);
  if (!r || r.symbols.length < 2 || !r.connectors.length) return null;
  const joined = r.connectors.filter((c) => c.from && c.to && c.from !== c.to);
  if (!joined.length) return null;
  // The molecule's: every node a circle.
  if (r.symbols.every((s) => readsAsCircle(state, s.ids))) return null;
  const tied = joined.filter((c) => c.ends.from.bound && c.ends.to.bound);
  if (!tied.length) return null;
  const share = tied.length / r.connectors.length;
  const confidence = Math.min(MAX_TIER0_CONFIDENCE, NOTATION_FLOOR + TIED_LIFT * share);
  const nodes = r.symbols.length, links = r.connectors.length;
  const summary = `${countWord(nodes)} ${nodes === 1 ? 'node' : 'nodes'}, ${countWord(links)} ${links === 1 ? 'connector' : 'connectors'}`;
  return {
    ...r,
    notation: DIAGRAM_NOTATION,
    name: 'Diagram',
    confidence,
    summary,
    reason: `${tied.length} of ${links} connectors tied at both ends to the nodes they join — no notation says more (as a flowchart: ${r.confidence.toFixed(2)})`,
  };
}

export const DIAGRAM: Notation = {
  id: DIAGRAM_NOTATION,
  name: 'Diagram',
  describes: 'nodes joined by connectors tied at both ends, when no notation says more',
  symbols: [],
  connectors: [],
  fallback: true,
  read: (state, scopeIds) => readDiagram(state, scopeIds),
};

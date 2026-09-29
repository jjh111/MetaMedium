// Mermaid: a drawing said as text (V1-PLAN §3, D2's surface).
//
// A drawing that reads as a notation the canvas can write in Mermaid — a
// flowchart, a class diagram, a sequence diagram — is offered *Make it
// Mermaid*, at tier 1: no model writes the text. Taking it stands a `mermaid`
// artifact beside the drawing holding what the notation's writer says
// (`toMermaid`, D2), in one act; the drawing stays as it was. The artifact's
// own renderer draws the diagram from the text and reports each node as a part
// named for the marks it was written from, so ink over it lands on them (the
// surface's `13-kinds.js`); the text is a file like any other, and `Draw it`
// (D3) reads it back into marks.
//
// What the tool reads is the scope's own marks — `notationsOf` over them, above
// the notations' floor — and it is offered only for a scope with no artifact in
// it: an artifact is not a drawing. A text already standing on the board, the
// same one, is not offered again.

import { boundsOf, transcriptOf } from '../session/nodes';
import type { SessionState } from '../session/session';
import { NOTATION_FLOOR, describeNotation, notationsOf } from '../notations/notation';
import type { NotationReading } from '../notations/notation';
import { toMermaid } from '../notations/mermaid';
import '../notations/uml-class-mermaid';
import '../notations/sequence-mermaid';
import type { Tool, ToolScope } from './tool';
import { codeRepOf, unionOf } from './board';

/** Roughly the drawing's own size, kept between a card and a wall, so the diagram is legible and never a poster. */
const MIN_W = 320, MIN_H = 240, MAX_W = 900, MAX_H = 900;
/** How far beside the drawing it stands, as a share of the drawing's width, never under a card's gap. */
const GAP_SHARE = 0.12, MIN_GAP = 48;

/**
 * The Mermaid some marks are written as, with the reading it is written from:
 * the likeliest notation the canvas can write, above the notations' floor, or
 * null. The export pane asks it of the whole board as the tool asks it of the
 * marks held — one home for what reads as a diagram worth saying. `isRead` is
 * the host's: writing read with its line says nothing of its own.
 */
export function mermaidFor(state: SessionState, ids: readonly string[], isRead: (id: string) => boolean = () => false) {
  const words = (id: string) => isRead(id) && !transcriptOf(state.nodes.get(id)!);
  for (const reading of notationsOf(state, ids)) {
    if (reading.confidence < NOTATION_FLOOR) continue;
    const said = toMermaid(reading, { readWith: words });
    if (said) return { reading, said };
  }
  return null;
}

const mermaidOf = (scope: ToolScope) => mermaidFor(scope.state, scope.marks, scope.host.isRead);

/** Whether an artifact on the board already holds exactly this text. */
function standing(scope: ToolScope, text: string): boolean {
  const s = scope.state;
  return s.artifacts.some((id) => {
    const n = s.nodes.get(id);
    const rep = n && codeRepOf(n);
    return !!rep && rep.data.kind === 'mermaid' && rep.data.code === text;
  });
}

const reasonOf = (reading: NotationReading) => `${describeNotation(reading)} — as Mermaid text beside it; the drawing stays`;

export const MERMAID: Tool = {
  id: 'mermaid',
  name: 'Mermaid',
  describe: () => 'a drawing that reads as a flowchart, a class diagram or a sequence diagram said as Mermaid text, an artifact beside it that draws the diagram; the drawing stays',
  offers(scope) {
    if (scope.marks.length < 2) return [];
    if (scope.marks.some((id) => scope.state.artifacts.includes(id))) return [];
    const m = mermaidOf(scope);
    if (!m || standing(scope, m.said.text)) return [];
    return [{
      key: 'mermaid',
      label: 'Make it Mermaid',
      reason: reasonOf(m.reading),
      base: 0.35,
      tool: 'mermaid',
      verbs: ['mermaid', 'mmd', 'as mermaid'],
      data: { notation: m.reading.notation },
    }];
  },
  take(_offer, scope, session, at) {
    const m = mermaidOf(scope);
    if (!m) return { made: null, detail: { ok: false, error: 'the marks held no longer read as a diagram' } };
    const box = unionOf(scope.marks.map((id) => boundsOf(scope.state.nodes.get(id)!)).filter((b): b is NonNullable<typeof b> => !!b));
    if (!box) return { made: null, detail: { ok: false, error: 'the marks held have nowhere to stand beside' } };
    const w = Math.min(MAX_W, Math.max(MIN_W, box.maxX - box.minX));
    const h = Math.min(MAX_H, Math.max(MIN_H, box.maxY - box.minY));
    const x = box.maxX + Math.max(MIN_GAP, (box.maxX - box.minX) * GAP_SHARE);
    const path = `${m.reading.notation}.mmd`;
    const made = session.import({ kind: 'mermaid', path, name: path, bounds: { minX: x, minY: box.minY, maxX: x + w, maxY: box.minY + h }, code: m.said.text, at });
    return { made, detail: { ok: !!made, notation: m.reading.notation, diagram: m.said.diagram, text: m.said.text, notes: m.said.notes, reading: describeNotation(m.reading) } };
  },
};

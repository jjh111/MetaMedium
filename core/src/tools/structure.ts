// The structure (tier1/library.ts, `buildStructure`): a page or a diagram
// from the drawing, every region in its place and no words — what the canvas
// knows and nothing it does not. It stands the moment a brief is sent, in the
// engine's name, and a model's words land as the next version; with no model
// it IS the page. The field reaches it through the brief (Enter on words at a
// loop), so it offers no pill of its own.

import type { Session } from '../session/session';
import { buildStructure, type StructureResult } from '../tier1/library';
import type { Tool } from './tool';

/**
 * Stand the structure of a blessed artifact, in the engine's name, as this
 * tool's act: built from the drawing and attached as its first version.
 */
export function standStructure(session: Session, artifactId: string, prompt: string, at: number): StructureResult {
  return session.withTool(STRUCTURE.id, () => {
    const structure = buildStructure(session, artifactId);
    if (structure.ok) session.attachCode({ participantId: structure.participantId, nodeId: artifactId, kind: 'html', code: structure.code, prompt, at });
    return structure;
  });
}

export const STRUCTURE: Tool = {
  id: 'structure',
  name: 'the structure',
  describe: () => 'a page or a diagram from the drawing — every region in place, no words — standing at once while a model writes',
  offers: () => [],
  take(offer, _scope, session, at) {
    const { artifactId, prompt } = offer.data as { artifactId: string; prompt: string };
    const built = standStructure(session, artifactId, prompt, at);
    return { made: built.ok ? artifactId : null, detail: built };
  },
};

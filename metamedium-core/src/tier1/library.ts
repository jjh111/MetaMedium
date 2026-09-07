// Tier 1: the engine's instant library.
//
// Three tiers, redressed 6 September 2026. **Tier 0** is the shape rung — a
// stroke read as line, arc, triangle, rectangle, circle, arrow, text or dot.
// **Tier 1** is everything the engine can do beyond that with no model and
// no wait: the modules listed here, each a function that returns at once,
// each already tested where it lives. **Tier 2** is a model, local or hosted
// alike — locality is a cost the router pays attention to, not a tier.
//
// The library is a registry, not a framework: a surface reads it to say what
// answers instantly and what a model would add, and the router reads it to
// know which abilities are settled here. A module that needs a network, a
// worker or a frame does not belong in it.

import type { Session } from '../session/session';
import { planFor } from '../parse/plan';
import { validateRegions, type RegionContent } from '../parse/scaffold';
import { ENGINE_PARTICIPANT } from '../session/nodes';

export type InstantAbility =
  | 'read' | 'arrange' | 'clean' | 'structure' | 'name' | 'verbs' | 'reuse' | 'trace' | 'measure' | 'fit' | 'wire' | 'words';

export interface InstantModule {
  id: string;
  name: string;
  ability: InstantAbility;
  /** What it does, in one line, for a surface to say. */
  does: string;
  /** Where it lives, relative to src/. */
  source: string;
}

export const TIER1_LIBRARY: readonly InstantModule[] = [
  { id: 'relations', name: 'relations', ability: 'read', does: 'what the canvas can see between marks — inside, near, crossing, aligned — every threshold a ratio of their size', source: 'relate/relations.ts' },
  { id: 'roles', name: 'the diagram rung', ability: 'read', does: 'what a mark plays: container, node, edge, label, annotation', source: 'diagram/roles.ts' },
  { id: 'concepts', name: 'concepts', ability: 'read', does: 'a row, a column, a frame, a flow, a grid, a label, a slider — matched plurally, ranked', source: 'concepts/concept.ts' },
  { id: 'tidy', name: 'tidy', ability: 'arrange', does: 'line marks up and space them evenly, or match their sizes; the ink untouched', source: 'session/session.ts (tidy)' },
  { id: 'clean', name: 'clean forms', ability: 'clean', does: 'a confident, unambiguous reading redrawn from the ink\'s own measurements', source: 'session/clean.ts' },
  { id: 'structure', name: 'structure', ability: 'structure', does: 'a page or a diagram from the drawing — the regions in place, no words', source: 'tier1/library.ts, parse/' },
  { id: 'signature', name: 'signatures', ability: 'name', does: 'a named group recognised again by its shapes and the links between them', source: 'session/signature.ts' },
  { id: 'verbs', name: 'words into verbs', ability: 'verbs', does: 'the common ways each verb is said, read with no model', source: 'behave/words.ts' },
  { id: 'library', name: 'the library', ability: 'reuse', does: 'a brief the library already answers reuses that program', source: 'kinds/, Demos/surface/09-palette.js' },
  { id: 'trace', name: 'tracing', ability: 'trace', does: 'a picture of a sketch becomes ink', source: 'image/trace.ts' },
  { id: 'measure', name: 'the maths', ability: 'measure', does: 'what follows from a reading, as numbers', source: 'session/measure.ts' },
  { id: 'fit', name: 'acting out', ability: 'fit', does: 'a dragged path fitted onto the verb basis, the residual named', source: 'behave/fit.ts' },
  { id: 'frames', name: 'wiring', ability: 'wire', does: 'artifacts wired by their ports, connections offered by type and ranked by name', source: 'frames/frame.ts' },
  { id: 'words', name: 'words from letters', ability: 'words', does: 'printed letters gathered into one word', source: 'session/words.ts' },
];

/** The library, one module per line, for a pane or a brief. */
export function describeTier1(): string {
  return TIER1_LIBRARY.map((m) => `${m.name} — ${m.does}`).join('\n');
}

export type StructureResult =
  | { ok: true; code: string; ids: string[]; genre: string; reasoning: string; participantId: string }
  | { ok: false; error: string };

const tagFor = (role: string | undefined): string =>
  role === 'container' ? 'section' : role === 'label' ? 'header' : 'div';

/**
 * The structure of a drawing as a page or a diagram, with no words in it:
 * every region in its place, labelled with its id and what it plays. It is
 * what the engine knows and nothing it does not — the honest thing to show
 * with no model joined, and the thing that stands at once while a model
 * writes the words. Attribute it to the engine when attaching it.
 */
export function buildStructure(session: Session, artifactId: string): StructureResult {
  const plan = planFor(session, artifactId);
  if ('error' in plan) return { ok: false, error: plan.error };
  const roleOf = new Map(plan.reading.roles.map((r) => [r.id, r.role]));
  const regionRole = new Map(plan.regions.map((r) => [r.id, roleOf.get(r.nodeId)]));
  const content: Record<string, RegionContent> = {};
  for (const id of plan.ids) {
    const role = regionRole.get(id) ?? 'region';
    content[id] = {
      tag: tagFor(role),
      html: `<span class="mm-slot">${id} · ${role}</span>`,
      style: 'display:flex;align-items:center;justify-content:center;border:1px dashed rgba(0,0,0,0.22);color:rgba(0,0,0,0.5);font:12px system-ui,sans-serif;min-height:0;',
    };
  }
  const code = plan.build(content, { background: '#fbfaf7', color: '#3a3a3a' });
  const check = validateRegions(code, plan.ids);
  if (!check.ok) return { ok: false, error: `the structure does not match the drawing (missing ${check.missing.join(', ') || 'none'})` };
  return {
    ok: true,
    code,
    ids: plan.ids,
    genre: plan.genre,
    reasoning: `${plan.genre}: ${plan.ids.length} region${plan.ids.length === 1 ? '' : 's'} from the drawing, in place, with no words — the structure only`,
    participantId: ENGINE_PARTICIPANT,
  };
}

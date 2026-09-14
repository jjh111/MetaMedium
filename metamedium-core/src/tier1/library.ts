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
import { planFor, connectionsOf } from '../parse/plan';
import { validateRegions, type RegionContent } from '../parse/scaffold';
import { ENGINE_PARTICIPANT } from '../session/nodes';
import { frameOf } from '../session/regions';

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
  { id: 'graph3d', name: 'a graph in 3D', ability: 'structure', does: 'nodes as spheres and edges as bonds, turning in the frame, each sphere named for its mark', source: 'tier1/library.ts (buildGraph3D)' },
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

// ===== A graph in 3D (SURFACE-v10-PLAN D7) ===================================
// Circles joined by lines are a graph; the graph can stand as spheres and
// bonds at once, with no model — the "replace with a 3D representation" of
// the whitepaper's molecule, from the drawing alone. Each sphere is named
// for the region it stands for, so ink over it lands on that mark, and a
// hand that presses inside the playing frame turns it (D2). Which molecule
// it is stays a question for a model (*What is this?*) or the hand.

export type Graph3DResult =
  | { ok: true; code: string; ids: string[]; atoms: number; bonds: number; reasoning: string; participantId: string }
  | { ok: false; error: string };

/**
 * The first line of every graph-in-3D program. A definition that holds one
 * is rebuilt for the next drawing rather than copied: the atoms are those
 * marks, not these.
 */
export const GRAPH3D_MARK = '// mm:structure graph3d';

const GRAPH3D_PROGRAM = `
var W = mm.width, H = mm.height, S = Math.max(W, H) / 3.6; // pixels per unit at z = 0
var byId = {};
ATOMS.forEach(function (a) { byId[a.id] = a; });
if (mm.THREE && mm.scene) {
  var group = new THREE.Group();
  var atomMat = new THREE.MeshStandardMaterial({ color: 0x2b5f8e, roughness: 0.4, metalness: 0.05 });
  var bondMat = new THREE.MeshStandardMaterial({ color: 0x9a978c, roughness: 0.7 });
  ATOMS.forEach(function (a) {
    var m = new THREE.Mesh(new THREE.SphereGeometry(a.r, 32, 24), atomMat);
    m.position.set(a.x, a.y, 0); m.name = a.id; group.add(m);
  });
  BONDS.forEach(function (b) {
    var p = byId[b[0]], q = byId[b[1]]; if (!p || !q) return;
    var from = new THREE.Vector3(p.x, p.y, 0), to = new THREE.Vector3(q.x, q.y, 0);
    var d = new THREE.Vector3().subVectors(to, from), len = d.length(); if (!(len > 0)) return;
    var c = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, len, 12), bondMat);
    c.position.copy(from).addScaledVector(d, 0.5);
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    group.add(c);
  });
  mm.scene.add(group);
  // It turns on its own; a hand inside the frame turns it by dragging (the frame takes the pointer while it plays).
  var dragging = false, lastX = 0, spin = 0;
  mm.onPointer(function (p) {
    if (p.type === 'down') { dragging = true; lastX = p.x; }
    else if (p.type === 'move' && dragging) { spin += (p.x - lastX) * 0.01; lastX = p.x; }
    else { dragging = false; }
  });
  mm.onFrame(function (t, dt) { if (!dragging) spin += dt * 0.4; group.rotation.y = spin; group.rotation.x = Math.sin(t * 0.25) * 0.2; });
} else {
  // No three.js (offline, or it never loaded): the same graph flat, and the parts reported by hand.
  var cx = W / 2, cy = H / 2;
  mm.onFrame(function () {
    var g = mm.ctx; g.clearRect(0, 0, W, H);
    g.lineWidth = 3; g.strokeStyle = '#9a978c';
    BONDS.forEach(function (b) { var p = byId[b[0]], q = byId[b[1]]; if (!p || !q) return; g.beginPath(); g.moveTo(cx + p.x * S, cy - p.y * S); g.lineTo(cx + q.x * S, cy - q.y * S); g.stroke(); });
    g.fillStyle = '#2b5f8e';
    ATOMS.forEach(function (a) { var x = cx + a.x * S, y = cy - a.y * S, r = a.r * S; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); mm.report(a.id, x - r, y - r, r * 2, r * 2); });
  });
}
`;

/** The artifact's graph as a `run` program: spheres for its nodes, bonds for its edges, from the drawing. */
export function buildGraph3D(session: Session, artifactId: string): Graph3DResult {
  const plan = planFor(session, artifactId);
  if ('error' in plan) return { ok: false, error: plan.error };
  if (plan.genre !== 'graph' && plan.genre !== 'mixed') return { ok: false, error: `a ${plan.genre} is not a graph — nothing to stand as spheres` };
  const state = session.getState();
  const artifact = state.nodes.get(artifactId)!;
  const frame = frameOf(artifact)!;
  const roleOf = new Map(plan.reading.roles.map((r) => [r.id, r.role]));
  const atoms = plan.regions.filter((r) => roleOf.get(r.nodeId) === 'node');
  if (atoms.length < 2) return { ok: false, error: 'fewer than two nodes to join' };
  const known = new Set(atoms.map((a) => a.id));
  const bonds = connectionsOf(artifact, state, plan.regions).filter((c) => known.has(c.from) && known.has(c.to));
  // The drawing's larger side spans 3.6 units, centred: the harness's camera sees about five.
  const s = 3.6 / Math.max(1, frame.w, frame.h);
  const A = atoms.map((a) => ({
    id: a.id,
    x: +((a.rect.x + a.rect.w / 2 - frame.w / 2) * s).toFixed(3),
    y: +((frame.h / 2 - (a.rect.y + a.rect.h / 2)) * s).toFixed(3),
    r: +Math.max(0.08, (Math.min(a.rect.w, a.rect.h) / 2) * s).toFixed(3),
  }));
  const code = [
    `${GRAPH3D_MARK} — ${A.length} spheres, ${bonds.length} bonds, from the drawing`,
    `var ATOMS = ${JSON.stringify(A)};`,
    `var BONDS = ${JSON.stringify(bonds.map((b) => [b.from, b.to]))};`,
    GRAPH3D_PROGRAM.trim(),
  ].join('\n');
  return {
    ok: true,
    code,
    ids: A.map((a) => a.id),
    atoms: A.length,
    bonds: bonds.length,
    reasoning: `${A.length} nodes as spheres and ${bonds.length} edge${bonds.length === 1 ? '' : 's'} as bonds, in the frame, turning — each sphere named for its mark`,
    participantId: ENGINE_PARTICIPANT,
  };
}

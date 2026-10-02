// ===== brief =====
// What a model is told about the space (SHARD-3D-PLAN §6): `describeSpace`,
// the `describeReading` of this shard.
//
// The rule the whole file exists to keep is the REGION-ID RULE, ported from
// `participants/serialize.ts`: the model is told about things **in the ids the
// log uses for them**, so what comes back can be attached to the very same
// things. On the canvas those are region ids; here they are stroke ids and step
// ids. A brief that said "the big rectangle at the left" would get back a reply
// about "the big rectangle at the left", and nothing could be done with it.
//
// Two things follow, and they are §2.6 rules 1 and 2:
//
//   * **The drawing is the extent before it has a name**, so the brief leads
//     with the massing and says it is already standing, in the engine's name.
//     A model asked to fill a volume that exists writes into it; a model asked
//     to invent one invents one.
//   * **Names come back on parts**, so every name already in play is listed in
//     its step's own id. That is what makes a regen reuse `turret` rather than
//     invent `tower`.
//
// Pure: no three.js, no session, no DOM. The surface gathers the evidence and
// this file writes the sentence — which is also what makes it testable.

import type { Point } from 'metamedium-core';
import { describeStep, type OpStep, type OpTree } from './op';
import type { Vec3 } from './plane';

/**
 * What can be made here, in one paragraph, on every prompt that proposes
 * (v10 F13's rule, rewritten for space).
 *
 * A model with no ground spins off into meshes, vertices, shaders and files —
 * and a small one most of all. This says what the vocabulary is and, just as
 * importantly, what it is not: **you do not write geometry.** That is
 * invariant 5 said to the model in its own prompt, rather than only enforced
 * on the way back in.
 */
export const HERE_IN_SPACE =
  `THE SPACE holds only these: INK lying on a plane (every stroke read as one of rectangle, circle, ` +
  `triangle, line, arrow, text, dot), the three world PLANES — foundation (the ground, you see it from the ` +
  `top), height (the wall you face, the front) and width (the wall on your right, the side) — and the FACES ` +
  `of solids; SOLIDS held as OP TREES in a closed vocabulary of steps (extrude, revolve, cut, boss, mirror), ` +
  `each step naming the profiles it was made from; NAMES bound to steps; and MATERIALS, one colour word on a ` +
  `step. You may add PROFILES: a rectangle, a circle or a polygon, given in plane units on a named world ` +
  `plane or on a face. Nothing else exists here — no meshes, no vertices, no triangles, no code, no files, ` +
  `no libraries, no textures, lights or cameras, and no units but the plane's own. **You do not write ` +
  `geometry.** You name steps over profiles and the shard derives the mesh.`;

/**
 * The same paragraph for a standing HULL (push 2, G3) — and it is shorter,
 * because less can be made here.
 *
 * `HERE_IN_SPACE` ends by offering profiles, which is exactly what the parts
 * contract forbids: with the drawing already standing there is no outline left
 * to add, and a paragraph that says *you may add profiles* over a brief that
 * says *do not invent geometry* is the prompt arguing with itself.
 */
export const HERE_ON_A_HULL =
  `THE SPACE holds only these: INK lying on a plane, the three world PLANES — foundation (the ground, seen from ` +
  `the top), height (the wall you face) and width (the wall on your right) — a standing HULL, and the PARTS it is ` +
  `cut into, each with an id of its own. What you may say about a part: a NAME (the human's own word for it), a ` +
  `MATERIAL (one colour word), and a small op BY PART ID — raise it, cut a hole through its top, mirror it, or take ` +
  `it out. Nothing else exists here — no meshes, no vertices, no triangles, no code, no files, no libraries, no ` +
  `textures, lights or cameras, and no units but the ones the parts were given in. **You do not write geometry, and ` +
  `you do not add profiles.** The drawing already said what the shape is; you say what it is.`;

/** A mark as the brief says it: its id, what the shape rung read, what it plays. */
export interface BriefMark {
  id: string;
  /** The shape rung's top reading, or '' when it placed nothing. */
  shape: string;
  confidence: number;
  /** The form rung's role — `profile`, `extent`, `axis`, `feature`, `annotation`. */
  plays: string;
  /** Which row placed it. */
  rule: number;
  /** The ink, in the plane's own (u, v). */
  points: Point[];
  /** True when a solid was made from it — it is that solid's provenance. */
  taken?: string;
}

/** One plane, and everything lying on it. */
export interface BriefPlane {
  /** `foundation` | `height` | `width`, or a face's own name. */
  name: string;
  /** What a hand calls the view down that normal: `top` / `front` / `side`. */
  view: string;
  normal: Vec3;
  marks: BriefMark[];
}

/** A solid as the brief says it: its tree, its name, and how well it honours the drawing. */
export interface BriefSolid {
  id: string;
  name: string;
  /** Whether the name is the hand's or the engine's own word for what it made. */
  named: 'human' | 'engine';
  tree: OpTree;
  /** What each version was attributed to, newest last. */
  versions?: string[];
  honours?: Honours;
}

/**
 * How much of the drawing a body actually contains (§4, re-run on a proposal).
 *
 * **The claims are separate and they say which kind they are** (GRAPH-1): an
 * outline drawn at this body, an outline of the definition it was placed from
 * carried onto it, and an outline drawn against it since are three different
 * claims, and a row that averaged them without saying so reported a placed mug
 * as dishonouring a drawing it had never been compared with. `constraints.ts`
 * does the classifying; this is what comes back out.
 */
export interface Honours {
  /** The mean coverage over every claim that was counted. */
  overall: number;
  per: {
    view: string;
    markId: string;
    coverage: number;
    /** `target` — drawn here · `source` — carried from the definition · `revision` — drawn since. */
    kind?: 'target' | 'source' | 'revision';
    /** The definition it was carried from, when it was carried. */
    of?: string;
    /** Why this claim is expected to read low — a hole cut since it was drawn. */
    note?: string;
    /** What was measured, and where it was carried from, in the terms it was measured in. */
    why?: string;
  }[];
  /** Claims kept for their provenance and deliberately not counted, each saying why. */
  aside?: string[];
  /** *honours the drawing 93% · front 96 · top 95 · side 88* */
  sentence: string;
}

/** A name in play, in the step's own id (§2.6 rule 2). */
export interface NameInPlay {
  name: string;
  solidId: string;
  stepId: string;
  op: string;
  /**
   * G3: the PART this name is on, when it names a part of a hull rather than a
   * step of a tree. `stepId` is then the hull's own step — the step the saying
   * is held on — and the part is what the name is about.
   */
  partId?: string;
  /** The material bound to it, when a word bound one. */
  colour?: string;
  /** The solid the name was said about — what a definition is based on. */
  basedOn?: string;
  /** True when the name is held as a definition (the version was taken). */
  definition?: boolean;
}

export interface SpaceScene {
  solids: BriefSolid[];
  planes: BriefPlane[];
  /** Every diff the board is reporting — §4's regions, when there are any. */
  diffs?: { markId: string; view: string; sentence: string }[];
  /**
   * G2: the parts a standing hull is made of, one sentence each, in the engine's
   * own `part:n` ids.
   *
   * This is the thing a small model is actually asked to do (G3): not to invent
   * geometry, but to put the hand's words onto pieces the engine can already
   * point at. The region-id rule again — *part 2* comes back as *part 2*.
   */
  parts?: { solidId: string; sentences: string[] }[];
  /**
   * G3: the standing HULL, when there is one with parts — and its presence is
   * what makes the brief take its second shape.
   *
   * A brief for a hull leads with what stands and is done in a dozen lines:
   * the footprint, the parts with their numbers and their words, the extent,
   * the names, the library, the words. It does not walk the planes mark by
   * mark, because on this path the model is not being asked to read the
   * drawing — the engine has already read it, and what is left to say is what
   * the pieces ARE. A small model given the long brief spent its reply
   * restating the geometry back.
   */
  hull?: {
    solidId: string;
    name: string;
    /** The footprint's size in u, and the stroke it was drawn as. */
    footprint: { w: number; h: number; markId?: string } | null;
    /** The volume the hull occupies, in world units — the extent a reply may not leave. */
    extent: { min: Vec3; max: Vec3 };
    parts: { id: string; sentence: string; name?: string; colour?: string }[];
  };
  names?: NameInPlay[];
  /**
   * What the library holds, so a model may answer `{"reuse": "turret"}` and
   * write nothing (v9 S5's rule). P6 fills it: every definition with its name,
   * what it is based on, how many steps it holds and how many profiles it
   * would be recognised by — enough for a model to say *that already exists*
   * and nothing like a tree it could copy out by hand.
   */
  definitions?: { name: string; basedOn?: string; ops: string[]; steps?: number; profiles?: number; whole?: boolean }[];
  /** The words the human typed. */
  words?: string;
  /**
   * For a regen: only these steps may be replaced. Everything else in the tree
   * is fixed, and the reply is checked against that.
   */
  mutable?: { stepId: string; name?: string }[];
  /** G3: for a regen over a hull, only these PARTS may change. */
  mutableParts?: { partId: string; name?: string }[];
}

const n2 = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : '∞');
/** One decimal: the hull brief's own precision. A tenth of a unit is a hand's accuracy. */
const n1 = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : '∞');

function bounds(points: Point[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

/** A mark's own line: the id first, because the id is what a reply refers to. */
function markLine(m: BriefMark): string {
  const b = bounds(m.points);
  const where =
    `${n2(b.maxX - b.minX)} × ${n2(b.maxY - b.minY)} u, ` +
    `u ${n2(b.minX)}…${n2(b.maxX)}, v ${n2(b.minY)}…${n2(b.maxY)}`;
  return (
    `  ${m.id} — ${m.shape || 'no shape the rung could place'}` +
    `${m.shape ? ` ${m.confidence.toFixed(2)}` : ''}, plays ${m.plays}${m.rule ? ` (row ${m.rule})` : ''}; ${where}` +
    `${m.taken ? `; taken into ${m.taken}` : ''}`
  );
}

function stepLine(step: OpStep): string {
  const name = step.name ? ` · named “${step.name}”` : '';
  const colour = step.material?.colour ? ` · ${step.material.colour}` : '';
  const by = step.by ? ` · by ${step.by}` : '';
  return `  ${step.id} — ${describeStep(step)}${name}${colour}${by}`;
}

/**
 * The brief (§6): the massing or the solids as op trees with their step ids and
 * names, the planes and what lies on each, the form rung's roles, the diff
 * regions, every name in play in its step's own id, the definitions the library
 * holds, and the words — then what can be made here.
 */
/**
 * **Which shape the brief takes, said out loud** — and it is the reply contract
 * it is really saying.
 *
 * With a hull standing and cut into parts, the model is asked to NAME what the
 * engine can already point at, and the parts contract applies. With no such
 * hull — P5's path, three profiles on the world planes and a massing — it is
 * asked for a tree of steps over profiles, and that contract applies. One
 * function answers it so the brief, the prompt, the parser and the landing can
 * never each decide differently.
 */
export function partIdsOf(scene: SpaceScene): string[] {
  return (scene.hull?.parts ?? []).map((p) => p.id);
}

/** The tail every brief ends with: the names, the library, what may move, the words, HERE. */
function tail(scene: SpaceScene, out: string[], here = HERE_IN_SPACE): void {
  // The region-id rule. Every name, in the step's own id, so a reply reuses the
  // name rather than inventing a synonym for it.
  out.push('');
  if (!scene.names?.length) {
    out.push('NAMES IN PLAY: none. Nothing here has been named yet, so every name in your reply is a new one, and it should come from the words below.');
  } else {
    out.push('NAMES IN PLAY — use these exact words for these exact things, and do not invent a synonym for one:');
    for (const n of scene.names) {
      out.push(
        `  “${n.name}” = ${n.partId ? `${n.solidId}/${n.partId}` : `${n.solidId}/${n.stepId} (${n.op})`}` +
          `${n.colour ? `, material ${n.colour}` : ''}` +
          `${n.basedOn ? `, based on ${n.basedOn}` : ''}` +
          `${n.definition ? ' — held as a definition' : ''}`
      );
    }
  }

  out.push('');
  if (!scene.definitions?.length) {
    out.push('DEFINITIONS THE LIBRARY HOLDS: none yet.');
  } else {
    out.push('DEFINITIONS THE LIBRARY HOLDS — if one of these already IS what was asked for, reply {"reuse":"<name>"} and write nothing; it is placed from the library and no tree is written:');
    for (const d of scene.definitions) {
      const based = d.whole
        ? ' (the whole of it)'
        : d.basedOn
          ? ` (a part of ${d.basedOn})`
          : '';
      const counts =
        `${d.steps ?? d.ops.length} step${(d.steps ?? d.ops.length) === 1 ? '' : 's'}` +
        (d.profiles !== undefined ? `, recognised by ${d.profiles} profile${d.profiles === 1 ? '' : 's'}` : '');
      out.push(`  “${d.name}”${based} — ${counts}: ${d.ops.join(' · ')}`);
    }
  }

  if (scene.mutable?.length) {
    out.push('');
    out.push('ONLY THESE STEPS MAY CHANGE. Every other step in the tree is fixed and must be left exactly as it is; a reply that touches one is refused:');
    for (const m of scene.mutable) out.push(`  ${m.stepId}${m.name ? ` (“${m.name}”)` : ''}`);
  }
  if (scene.mutableParts?.length) {
    out.push('');
    out.push('ONLY THESE PARTS MAY CHANGE. Every other part is fixed; a reply about one is dropped, and their names stay exactly as they are:');
    for (const m of scene.mutableParts) out.push(`  ${m.partId}${m.name ? ` (“${m.name}”)` : ''}`);
  }

  out.push('');
  out.push(scene.words ? `THE WORDS THE HUMAN TYPED: “${scene.words}”` : 'THE HUMAN TYPED NOTHING.');

  out.push('');
  out.push(here);
}

/**
 * The brief for a standing HULL (push 2, G3): the footprint, the parts, the
 * extent, the names, the library, the words.
 *
 * Short on purpose. Every line of a plane-by-plane listing is a line inviting a
 * small model to restate the drawing instead of naming it, and the drawing is
 * not in question here — it is standing, in the engine's name, and it is the
 * extent. John's castle comes to well under 1200 characters before `HERE`.
 */
function describeHull(scene: SpaceScene): string {
  const hull = scene.hull!;
  const size = {
    x: hull.extent.max.x - hull.extent.min.x,
    y: hull.extent.max.y - hull.extent.min.y,
    z: hull.extent.max.z - hull.extent.min.z,
  };
  const out: string[] = [];
  out.push(
    `WHAT STANDS — ${hull.solidId} “${hull.name}”, a HULL the space stood from the drawing, ` +
      `${n1(size.x)} × ${n1(size.z)} u on the ground and ${n1(size.y)} u tall. It is already standing, in the ` +
      `engine's name, and it is the extent your reply must stay inside.`
  );
  out.push(
    hull.footprint
      ? `THE FOOTPRINT: ${n1(hull.footprint.w)} × ${n1(hull.footprint.h)} u, drawn on the ground` +
        `${hull.footprint.markId ? ` as ${hull.footprint.markId}` : ''}.`
      : 'THE FOOTPRINT: none was drawn — the claims bound it from every side and the ground from below.'
  );
  out.push(
    `THE EXTENT, in world units: x ${n1(hull.extent.min.x)}…${n1(hull.extent.max.x)}, ` +
      `y ${n1(hull.extent.min.y)}…${n1(hull.extent.max.y)}, z ${n1(hull.extent.min.z)}…${n1(hull.extent.max.z)}. ` +
      `Nothing you propose may leave it; whatever does is cut off.`
  );
  out.push('');
  out.push(
    `THE PARTS — ${hull.parts.length} piece${hull.parts.length === 1 ? '' : 's'} the engine can point at, in its own ids. ` +
      `Say what each one IS and what it is made of, by its id. Do not invent geometry for one:`
  );
  for (const p of hull.parts) out.push(`  ${p.sentence}`);
  tail(scene, out, HERE_ON_A_HULL);
  return out.join('\n');
}

export function describeSpace(scene: SpaceScene): string {
  // G3: a hull with parts takes the short brief, and with it the parts
  // contract. `partIdsOf` is the same test everywhere.
  if (scene.hull?.parts.length) return describeHull(scene);
  const out: string[] = [];

  // ---- what stands ---------------------------------------------------------
  if (!scene.solids.length) {
    out.push('WHAT STANDS: nothing yet. The profiles below are all there is.');
  } else {
    out.push(`WHAT STANDS — ${scene.solids.length} solid${scene.solids.length === 1 ? '' : 's'}, each an op tree:`);
    for (const s of scene.solids) {
      // A HULL is the massing on any planes (push 2, G1), and it is the same
      // invariant: whatever a model proposes is clipped to it.
      const massing = s.tree.steps.some((st) => (st.op === 'massing' || st.op === 'hull') && !st.on);
      out.push(
        `${s.id} “${s.name}”${s.named === 'engine' ? " (the engine's own word for what it made — nobody has named it)" : ' (the hand named it)'}` +
          (massing
            ? ' — a MASSING: it is already standing, built from the profiles and silhouette claims below, and it is the extent your proposal must stay inside'
            : '')
      );
      for (const step of s.tree.steps) out.push(stepLine(step));
      if (s.honours) out.push(`  ${s.honours.sentence}`);
      if (s.versions?.length) out.push(`  ${s.versions.length} version${s.versions.length === 1 ? '' : 's'} held: ${s.versions.join(' → ')}`);
    }
  }

  // ---- the parts of what stands (G2) ---------------------------------------
  const withParts = (scene.parts ?? []).filter((p) => p.sentences.length);
  if (withParts.length) {
    out.push('');
    out.push(
      'PARTS OF WHAT STANDS — the pieces the engine can point at, in its own ids. ' +
        'Say what each one IS, by its id; do not invent geometry for it:'
    );
    for (const p of withParts) {
      if (withParts.length > 1) out.push(`${p.solidId}:`);
      for (const sentence of p.sentences) out.push(`  ${sentence}`);
    }
  }

  // ---- the planes, and what lies on each -----------------------------------
  out.push('');
  out.push('THE PLANES, AND WHAT LIES ON EACH (all coordinates are that plane’s own u, v):');
  if (!scene.planes.length) out.push('  nothing has been drawn.');
  for (const p of scene.planes) {
    out.push(
      `${p.name} — the ${p.view} view, normal (${n2(p.normal.x)}, ${n2(p.normal.y)}, ${n2(p.normal.z)}):`
    );
    if (!p.marks.length) out.push('  nothing on it.');
    for (const m of p.marks) out.push(markLine(m));
  }

  // ---- what the drawing does not match -------------------------------------
  if (scene.diffs?.length) {
    out.push('');
    out.push('WHERE THE BODY AND THE DRAWING DISAGREE (§4, measured, not guessed):');
    for (const d of scene.diffs) out.push(`  ${d.markId} — ${d.sentence}`);
  }

  tail(scene, out);
  return out.join('\n');
}

/**
 * The *honours the drawing* sentence, from the coverages the diff measured.
 *
 * Every claim says which kind it is when it is not simply the drawing at this
 * body, and a claim the tree expects to read low says why it does — *a bare low
 * number* was exactly the complaint: 20% against an outline lying somewhere
 * else is not a measurement of anything. Claims that were kept and not counted
 * (a hole's outline; a correspondence whose pose could not be derived) come
 * after, so nothing is dropped to make the number look better.
 */
export function honoursSentence(
  per: { view: string; coverage: number; kind?: 'target' | 'source' | 'revision'; of?: string; note?: string }[],
  aside: string[] = []
): string {
  const rest = aside.length
    ? ` · not counted: ${aside.join('; ')}`
    : '';
  if (!per.length) {
    return `honours the drawing — no profile of it has been drawn to check against${rest}`;
  }
  const overall = per.reduce((n, p) => n + p.coverage, 0) / per.length;
  const say = (p: (typeof per)[number]) => {
    const qual: string[] = [];
    if (p.kind === 'source') qual.push(`carried from ${p.of ?? 'the definition'}`);
    if (p.kind === 'revision') qual.push('drawn since');
    if (p.note) qual.push(p.note);
    return `${p.view} ${(p.coverage * 100).toFixed(0)}${qual.length ? ` (${qual.join('; ')})` : ''}`;
  };
  return `honours the drawing ${(overall * 100).toFixed(0)}% · ${per.map(say).join(' · ')}${rest}`;
}

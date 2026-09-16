// ===== log =====
// The engine's session IS the shard's log (invariant 4: the log is the source,
// everything else is derived). A stroke goes in as plane coordinates with the
// scale it was drawn at, and comes back with the shape rung's readings, its
// maths, its clean form and its undo already attached — nothing is forked.
//
// No three.js here either: this is the seam between the space and the engine.

import {
  createSession,
  getRep,
  strokePointsOf,
  fingerprintOf,
  getFingerprint,
  interpretationsOf,
  snapReading,
  idealize,
  measure,
  describeMaths,
  simplifyStroke,
  structuralSignature,
  topInterpretation,
  wordOf,
  LOCAL_PARTICIPANT,
  ENGINE_PARTICIPANT,
  type Session,
  type MMNode,
  type Point,
  type Interpretation,
  type CleanShape,
  type Maths,
} from 'metamedium-core';
import { length, NAMED, slide, sub, toWorld, type Plane, type PlaneName, type Pose, type Vec3 } from './plane';
import { honoursSentence, type BriefPlane, type Honours, type NameInPlay, type SpaceScene } from './brief';
import type { Proposal } from './generator';
import {
  addProfileExample,
  planeKindOf,
  printOf,
  rankMatches,
  structuresFor,
  type LibraryDefinition,
  type ProfileExamples,
  type ProfileMatch,
  type ProfileSignature,
  type ProfileStructure,
} from './library';
import { diffProfile, viewNameOf, type Diff } from './diff';
import type { PlaneCandidate } from './planarity';
import {
  assignForms,
  featuresFrom,
  makeableFrom,
  massableFrom,
  scratchAgainst,
  type FeatureOffer,
  type FormMark,
  type FormReading,
  type Makeable,
  type Massable,
  type Silhouette,
} from './form';
import type { PlaneSilhouette } from './silhouette';
import {
  bossStep,
  centreAndSize,
  clipStep,
  COLOUR_WORDS,
  cutStep,
  encodeOpTree,
  extrudeAt,
  extrudeStep,
  featureAt,
  massingStep,
  matchStep,
  mirrorStep,
  nextStepId,
  parseOpTree,
  placeDefinitionStep,
  placeStep,
  revolveStep,
  rootOf,
  stepsNamed,

  subTreeOf,
  treeOf,
  withStep,
  type FeatureInput,
  type LineInput,
  type MassingStep,
  type MirrorStep,
  type OpStep,
  type OpTree,
  type Profile2D,
  type ProfileInput,
} from './op';

/** A mark as the shard reads it: the engine's node, plus where it lies. */
export interface Mark {
  id: string;
  node: MMNode;
  /** Plane coordinates — what the engine measured. */
  points: Point[];
  plane: Plane;
  /** Plane units per screen pixel when it was drawn. */
  scale: number;
  readings: Interpretation[];
  /**
   * The screen path as the hand drew it, and the camera it was drawn under.
   * Kept in the log because a plane is a READING: with these two, the stroke
   * can be re-projected onto any candidate at any time — which is what the
   * runner-up chip's flip does, and what makes the re-rank at pen-up an
   * offer rather than a one-way door.
   */
  screen?: Point[];
  pose?: Pose;
  /** Every plane the stroke was read against, ranked, the winner first. */
  candidates?: PlaneCandidate[];
  /** The mark this one was flipped from, when a chip was tapped. */
  flippedFrom?: string;
}

/** What `add` holds beside the ink: the screen path, the pose, and the reading. */
export interface PlaneEvidence {
  screen?: Point[];
  pose?: Pose;
  candidates?: PlaneCandidate[];
  flippedFrom?: string;
}

/** A solid as the log holds it: an artifact whose code is one of the shard's op trees. */
export interface Solid {
  id: string;
  /** The name shown: the hand's own if it gave one, else the engine's word for what it made. */
  name: string;
  named: 'human' | 'engine';
  tree: OpTree;
  /** The marks it was made from — what ink over it addresses. */
  memberIds: string[];
}

/**
 * What the log has to ask the SPACE for, because it is about the camera and
 * the mesh rather than about the events.
 *
 * Row 1 counts a stroke's crossings against a solid's silhouette **in the view
 * the stroke was drawn in** — so the silhouettes are projected through the
 * pose held on the mark, not through wherever the camera is now. And a cut
 * with no extent goes THROUGH, which is a distance measured on the body. Both
 * are derived, both are asked for on demand, and neither is state: the log is
 * still the source.
 */
export interface SpaceRead {
  silhouettes(pose: Pose): Silhouette[];
  /** How far a solid reaches along a direction — what THROUGH means. */
  spanAlong(solidId: string, direction: Vec3): number;
  /**
   * P4: a solid seen flat on a plane, orthographically along that plane's own
   * normal — the picture the diff is run against, and the evidence the form
   * rung reads to tell a profile OF a solid from the start of a new one.
   */
  silhouetteOn(solidId: string, plane: Plane): PlaneSilhouette | null;
}

/** A closed mark read as a profile of a solid, on the plane it was drawn on (P4). */
export interface ProfileOfSolid {
  markId: string;
  solidId: string;
  /** The solid's name, as it stands. */
  name: string;
  plane: Plane;
  /** `top` / `front` / `side`, or the plane's own name. */
  view: string;
  reasoning: string;
}

export interface Log {
  session: Session;
  /** Install the space the form rung reads silhouettes and spans from. Runtime, never the log's. */
  sees(space: SpaceRead | null): void;
  add(points: Point[], plane: Plane, scale: number, at?: number, evidence?: PlaneEvidence, by?: string): string;
  /**
   * Take a mark's kept screen path and read it onto another candidate — the
   * runner-up chip. ONE act: the flipped stroke is added and the first is
   * erased, in that order, so `undo()` walks back all three events together
   * and the first plane comes back with the ink exactly where it was.
   */
  flip(id: string, to: PlaneCandidate, points: Point[], scale: number, at?: number): string | null;
  /** Why a mark cannot be flipped, or null when it can. */
  whyNotFlip(id: string): string | null;
  marks(): Mark[];
  markOf(id: string): Mark | null;
  /** Drop the last act: a solid if one stands on top of the log, else a stroke and the plane held with it. */
  undo(): void;
  clear(): void;
  subscribe(fn: () => void): () => void;
  /** The clean form the engine would offer for a mark, or null. */
  offerFor(id: string): CleanShape | null;
  /**
   * A mark's outline for the diff and for a `match` step's derivation: the
   * engine's clean form when it holds one, else the ink as it was drawn — and
   * which, and why, because a diff run against a redrawn outline is a diff
   * about a shape the hand did not make (§4, invariant 2).
   */
  inkFor(id: string): { points: Point[]; from: 'clean' | 'ink'; why: string } | null;
  /** The maths, measured in the hand's own pixels; `scale` says how to read it back into plane units. */
  mathsOf(id: string): { maths: Maths; text: string; scale: number } | null;

  // ---- the form rung, and what it affords --------------------------------
  /** Every loose mark as the form rung needs it. */
  formMarks(): FormMark[];
  /** What each mark plays in space, ranked by the table. */
  forms(): FormReading[];
  /** The form reading for one mark, or null. */
  formOf(id: string): FormReading | null;
  /** The solids the table says can stand right now — tier 1, no model, no wait. */
  makeable(): Makeable[];
  /** Make one. One act: the marks are blessed as an artifact and the tree is attached to it. */
  make(m: Makeable, at?: number): { id: string; step: OpStep; name: string } | null;

  // ---- P3: features, cuts and the rest of tier 1 --------------------------
  /**
   * Every feature standing on a face right now, with the extent beside it when
   * the hand drew one. Nothing acts on these: a hole and a boss are two
   * intentions and the drawing does not say which, so the field offers both.
   */
  features(): FeatureOffer[];
  /** The feature that is about this solid and has not been taken into its tree yet. */
  featureFor(solidId: string): FeatureOffer | null;
  /** `cut(solid, feature, depth)` — a new VERSION of the solid's tree, held with every other. */
  cut(offer: FeatureOffer, at?: number): { id: string; step: OpStep } | null;
  /** `boss(solid, feature, depth)` — the other intention, the same feature. */
  boss(offer: FeatureOffer, at?: number): { id: string; step: OpStep } | null;
  /** `mirror(solid, plane)` — the body and its reflection, as one body. A version. */
  mirror(solidId: string, plane: Plane, at?: number): { id: string; step: OpStep } | null;
  /** A second solid standing beside the first, holding a copy of its tree. A new artifact. */
  dup(solidId: string, at?: number): { id: string; name: string } | null;
  /** What a stroke scratched out, and how nearly — for the *one more pass* sentence. */
  scratchOf(markId: string): { solidId: string; name: string; crossings: number } | null;
  /**
   * Take a solid off the board with a scratch, and HOLD the reading on the
   * mark that did it — the table cannot re-derive a reading about a solid its
   * own act removed.
   */
  scratch(markId: string, reading: FormReading, at?: number): { solidId: string; name: string; crossings: number } | null;
  // ---- P4: the diff is the brief -----------------------------------------
  /** Every closed mark read as a profile OF this solid, oldest first. */
  profilesOf(solidId: string): ProfileOfSolid[];
  /** The diff between a profile's outline and its solid's silhouette on that plane. */
  diffFor(markId: string): Diff | null;
  /** The profile of this solid the field acts on: the newest one that still says something. */
  matchable(solidId: string, how: 'add' | 'remove'): { profile: ProfileOfSolid; diff: Diff } | null;
  /**
   * `match(solid, profile, { add | remove })` — a new VERSION of the solid's
   * tree that extrudes every missing region through the body, or cuts every
   * extra one out of it. Tier 1: no model, no wait.
   */
  match(markId: string, how: 'add' | 'remove', at?: number): { id: string; step: OpStep; diff: Diff } | null;

  /** Every solid on the board. */
  solids(): Solid[];
  solidOf(id: string): Solid | null;
  /** Which solid a mark belongs to, if any. */
  solidFor(markId: string): Solid | null;
  /** Give a solid the hand's own name. */
  name(id: string, name: string, at?: number): void;
  /** Take a solid off the board. Its ink stays — erasing an artifact demotes it and its members come back as ink. */
  remove(id: string, at?: number): void;

  // ===== P5: the generator seat, and names ==================================

  /** The massing the board affords right now — tier 1, no model, no wait (§2.6 rule 1). */
  massable(): Massable | null;
  /** Stand it up. One act, three events, one undo — the same shape as `make`. */
  mass(m: Massable, at?: number): { id: string; step: OpStep; name: string } | null;
  /**
   * A further view of a massing that is STILL only a massing — the third
   * elevation after the first two stood it up.
   */
  growable(): { solidId: string; add: string[]; reasoning: string } | null;
  /** Take that view into the massing: a new version of the one step, and one undo. */
  growMassing(g: { solidId: string; add: string[]; reasoning: string }, at?: number): { id: string; count: number } | null;
  /** Seat a model in the session, so everything it proposes is attributed to it. */
  joinAgent(name: string, locality: 'local' | 'hosted', at?: number): string;
  /**
   * A model's tree, landed as a new VERSION of the solid, attributed to it and
   * HELD — the human takes it or leaves it. The massing's own volume is
   * appended as a clip in the engine's name, so the proposal cannot leave the
   * drawing (§6, the extent invariant).
   */
  applyProposal(
    solidId: string,
    proposal: Proposal,
    by: { id: string; name: string },
    at?: number
  ): { id: string; steps: OpStep[]; drawn: string[]; dropped: string[] } | null;
  /** The same, scoped: only the named steps are replaced, the rest of the tree is untouched. */
  replaceSteps(
    solidId: string,
    stepIds: string[],
    proposal: Proposal,
    by: { id: string; name: string },
    at?: number
  ): { id: string; steps: OpStep[]; drawn: string[]; dropped: string[] } | null;
  /** Whether a solid's newest version is a model's, and whose. */
  versionOf(solidId: string): { by: string; taken: boolean; at: number } | null;
  /**
   * Take the version: the artifact gets the root's name, and every named
   * sub-tree is held as a definition based on the whole (§2.6 rule 3).
   */
  take(solidId: string, at?: number): { name: string; definitions: string[] } | null;
  /** Every definition the library holds, newest first. */
  definitions(): Definition[];

  // ===== P6: names, and the loop in 3D =====================================

  /**
   * Every definition this mark's outline could be, best first, above the floor
   * (§2.6 rule 3: *drawn later, its profile is offered by its signature*).
   * Plural, ranked, each with the measurements it was scored on.
   */
  definitionMatches(markId: string): ProfileMatch[];
  /**
   * *Not a mug*. The outline's own print goes onto that definition's rejected
   * examples, held in the log as a `correction` rep — core's `correct` pattern
   * — so the same profile is never offered as that again, and a replay
   * remembers it.
   */
  correct(name: string, markId: string, verdict?: 'is' | 'is-not', at?: number): Correction | null;
  /**
   * `place(definition, pose)`: the definition's tree standing where a profile
   * was drawn again, scaled so its matching profile fits the new one. A NEW
   * artifact — the placement holds no pose of its own, only the two inks it is
   * derived from. With no mark, it stands at the world origin.
   */
  place(
    name: string,
    markId: string | null,
    at?: number
  ): { id: string; name: string; step: OpStep; from: ProfileSignature; scale: number } | null;
  /** Why a definition cannot be placed at this mark, or null when it can. */
  whyNotPlace(name: string, markId: string | null): string | null;
  /** Every name in play, in its step's own id — what the brief lists. */
  namesInPlay(): NameInPlay[];
  /** How much of the drawing a body actually contains, per plane (§4, re-run). */
  honoursOf(solidId: string): Honours | null;
  /** A new version without those steps — tier 1. */
  dropSteps(solidId: string, stepIds: string[], why: string, at?: number): OpTree | null;
  /** A new version with a colour word bound to those steps — tier 1. */
  paintSteps(solidId: string, stepIds: string[], colour: string, why: string, at?: number): OpTree | null;
  /** A way of saying a verb, taught once and held in the log (§2.6 rule 4). */
  teachSaying(s: Saying, at?: number): void;
  sayings(): Saying[];
  /** The whole board as `describeSpace` needs it. */
  scene(words: string, opts?: { mutable?: string[] }): SpaceScene;
}

/**
 * A named sub-tree, held as a definition based on the whole (§2.6 rule 3).
 *
 * **Where it lives, and why.** As a `definition` rep on the ROOT artifact, not
 * as an artifact of its own. The plan asks for an artifact per named sub-tree
 * and the engine cannot give one: `bless` needs marks that are still on the
 * CONTENT plane, and a made solid's members are not — the same core gap P3's
 * `dup` ran into. A rep goes into the log through `propose()`, replays with
 * the session, carries its own reasoning and undoes like everything else, so
 * nothing is lost but the ability to point at a definition with an id. P6
 * matches them by signature and can move them the day core grows a door to
 * bless an artifact from data.
 */
export interface Definition extends LibraryDefinition {
  name: string;
  solidId: string;
  stepId: string;
  /** The solid's own name — what this definition is based on. For the whole, its own name. */
  basedOn: string;
  /** True for the definition that is the WHOLE thing rather than a named part of it. */
  whole?: boolean;
  /** The sub-tree the name covers, as it stood when it was taken. */
  steps: OpStep[];
  /**
   * P6: each profile the sub-tree was made from — the engine's own fingerprint
   * of the stroke at the scale it was drawn at, and which kind of plane it lay
   * on. Nothing here is a new measurement: it is what the shape rung already
   * read, so a replayed log derives the same numbers.
   */
  profiles: ProfileSignature[];
  /** The structural signature of the profiles that share a plane — core's own, where it applies. */
  structures?: ProfileStructure[];
  /** Filled in by `definitions()` from the corrections held beside it; never written here. */
  examples?: ProfileExamples;
  at: number;
  why: string;
}

/** *Not a mug*: one outline, on one plane, said not to be that definition. */
export interface Correction {
  definition: string;
  solidId: string;
  verdict: 'is' | 'is-not';
  profile: ProfileSignature;
  at: number;
  why: string;
}

/** A way of saying a verb, taught by the hand once and replayed ever after. */
export interface Saying {
  phrase: string;
  verb: string;
  target?: string;
  why: string;
}

/**
 * The plane is a REP on the stroke, proposed by the local participant.
 *
 * §2.1 says the plane is "a rep on the stroke with a reason", either way it
 * came to be there, and `Rep.data` is deliberately `unknown` — so the plane
 * needs no new event type and replays with the log for free. The one cost is
 * undo: `session.undo()` drops the last non-tick event, which is the propose,
 * so the shard's undo walks back until the number of strokes actually falls.
 */
const PLANE_REP = 'plane';

/**
 * A gesture that has already fired, held on the mark that made it — the same
 * modality core uses for a scratch on the canvas (`session.ts`).
 */
const GESTURE_REP = 'gesture';

/**
 * How far a point may sit off the line between its neighbours and still be
 * dropped from the outline a SOLID is built on, as a ratio of the mark's own
 * size (invariant 8 — never a pixel count). The same fraction `getFingerprint`
 * finds corners at, for the same reason: below it, what you are measuring is
 * the device's report rate rather than the hand's shape.
 */
export const PROFILE_SIMPLIFY = 0.012;

export function planeOf(node: MMNode): Plane | null {
  const rep = getRep(node, PLANE_REP);
  return rep ? (rep.data as Plane) : null;
}

export function createLog(): Log {
  const session = createSession();
  /** The space, when a surface has installed one. Null in the tests, and nothing breaks. */
  let space: SpaceRead | null = null;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((fn) => fn());
  /**
   * Bumped on every event. State is a pure function of the log, so anything
   * derived from it is valid until this moves — which is what lets the form
   * rung be re-read on demand without being re-computed on every orbit frame
   * (the chrome reports itself on every camera change, and the table is a
   * cross-product over the marks).
   */
  let version = 0;
  session.subscribe(() => {
    version++;
    notify();
  });

  function strokeCount(): number {
    return session.getEvents().filter((e) => e.type === 'stroke').length;
  }

  /**
   * How many reps of a modality the board carries. The undo walk asks twice
   * per step, so it counts rather than composing: `definitions()` folds every
   * correction into every definition, which is a lot of work to do twelve
   * times to answer "did that number fall".
   */
  function countReps(modality: string): number {
    let n = 0;
    for (const node of session.getState().nodes.values())
      for (const rep of node.reps) if (rep.modality === modality) n++;
    return n;
  }

  function add(
    points: Point[],
    plane: Plane,
    scale: number,
    at = Date.now(),
    evidence: PlaneEvidence = {},
    /**
     * Whose hand. A MODEL's profile goes in through this very door — the same
     * `addStroke`, the same fingerprint, the same readings, the same clean form
     * and the same eraser as a human's, attributed to the model and declared
     * content (the canvas's `agent.draw` rule). The flag is about what was
     * DECLARED, not about who drew it: a shard stroke is ink, never a lasso, a
     * command mark or a scratch.
     */
    by: string = LOCAL_PARTICIPANT
  ): string {
    const id = session.addStroke(points, at, by, scale, { content: true });
    session.propose({
      participantId: by,
      nodeId: id,
      edges: [],
      reps: [
        {
          modality: PLANE_REP,
          // The reading is held WHOLE: the plane that won, the evidence it won
          // on, and every candidate it beat. A plural reading that kept only
          // its winner would be a winner-take-all reading with extra words.
          data: { ...plane, scale, ...evidence, candidates: strip(evidence.candidates) },
          confidence: evidence.candidates?.[0]?.confidence ?? 1,
          reasoning: plane.why,
        },
      ],
      at,
    });
    return id;
  }

  /**
   * Candidates as the log holds them: the reading, not the geometry it was
   * scored against — except the ANCHOR, which is kept.
   *
   * The anchor of a `face` candidate IS the face's own extent in the plane's
   * own (u, v), and that is the one piece of evidence the form rung's row 3
   * cannot do without: a face plane is infinite and a face is not, so "inside
   * that face" is a question about these bounds. Keeping it costs four numbers
   * and saves the shard from re-deriving a face from a mesh that may have been
   * cut since.
   */
  function strip(candidates?: PlaneCandidate[]): PlaneCandidate[] | undefined {
    if (!candidates) return undefined;
    return candidates.map(({ plane, label, confidence, reasoning, oblique, terms, anchor }) => ({
      plane,
      label,
      confidence,
      reasoning,
      oblique,
      ...(terms ? { terms } : {}),
      ...(anchor ? { anchor } : {}),
    }));
  }

  /**
   * A mark a solid was made from is not flippable: the tree references this
   * stroke id and was measured in this plane, so moving the ink to another
   * plane would leave the solid standing on a mark that no longer says what
   * it stood on. Said out loud rather than refused silently.
   */
  function whyNotFlip(id: string): string | null {
    const mark = markOf(id);
    if (!mark) return 'that mark is not on the board';
    const solid = solidFor(id);
    if (solid) return `this ink was taken into ${solid.name} — undo the solid first, and the plane is arguable again`;
    // The most telling reason first: a chosen plane is a decision, and a
    // decision is not a reading to argue with (§2.1, "blessed by the act").
    if (mark.plane.source === 'chosen') return 'the hand chose this plane — a decision is not a reading to argue with';
    if (!mark.screen || !mark.pose) return 'this mark kept no screen path — nothing to re-project';
    return null;
  }

  function flip(id: string, to: PlaneCandidate, points: Point[], scale: number, at = Date.now()): string | null {
    const mark = markOf(id);
    if (!mark || whyNotFlip(id)) return null;
    // Ranked again with the taken candidate first, so the chip on the flipped
    // stroke offers the way back — a flip is an argument, not a verdict.
    const rest = (mark.candidates ?? []).filter((c) => c.label !== to.label);
    const plane: Plane = {
      ...to.plane,
      why: `${to.reasoning} — taken from the chip, over ${mark.plane.name ?? mark.plane.source}`,
    };
    // ADD FIRST, ERASE SECOND. `undo()` walks back from the top of the log
    // until the stroke count falls: with the erase on top it is dropped, then
    // the propose, then the stroke — and the first mark is back on its first
    // plane. The other order would leave the first mark erased.
    const next = add(points, plane, scale, at, {
      screen: mark.screen,
      pose: mark.pose,
      candidates: [to, ...rest],
      flippedFrom: id,
    });
    session.erase(id, at);
    return next;
  }

  function markOf(id: string): Mark | null {
    const s = session.getState();
    const node = s.nodes.get(id);
    if (!node) return null;
    const points = strokePointsOf(node);
    const plane = planeOf(node);
    if (!points || !plane) return null;
    const held = plane as Plane & {
      scale?: number;
      screen?: Point[];
      pose?: Pose;
      candidates?: PlaneCandidate[];
      flippedFrom?: string;
    };
    return {
      id,
      node,
      points,
      plane,
      scale: held.scale ?? 1,
      readings: interpretationsOf(node, s.nodes),
      ...(held.screen ? { screen: held.screen } : {}),
      ...(held.pose ? { pose: held.pose } : {}),
      ...(held.candidates ? { candidates: held.candidates } : {}),
      ...(held.flippedFrom ? { flippedFrom: held.flippedFrom } : {}),
    };
  }

  /**
   * Every mark on the board — INCLUDING the members of a solid.
   *
   * Blessing takes the members off the content plane, which is right for a
   * canvas (a page is one thing, not five strokes) and wrong for a shard:
   * ink is never covered (invariant 3), so a profile that became a box is
   * still ink lying on the box's face. The marks are therefore derived from
   * every node that carries ink and a plane and has not been erased.
   */
  function marks(): Mark[] {
    const s = session.getState();
    const out: Mark[] = [];
    for (const node of s.nodes.values()) {
      if (getRep(node, 'erased')) continue;
      if (!getRep(node, PLANE_REP) || !getRep(node, 'stroke')) continue;
      const m = markOf(node.id);
      if (m) out.push(m);
    }
    return out.sort((a, b) => a.node.createdAt - b.node.createdAt || (a.id < b.id ? -1 : 1));
  }

  /** The last event that is not a clock tick — what sits on top of the log. */
  function topEvent(): string | null {
    const events = session.getEvents();
    for (let i = events.length - 1; i >= 0; i--) if (events[i].type !== 'tick') return events[i].type;
    return null;
  }

  /**
   * Undo drops the last ACT, not the last event.
   *
   * A stroke is two events (the ink, then the plane proposed on it); a solid
   * is three (the marks pointed at, the bless that makes the artifact, the
   * tree attached to it); a FLIP is three besides (the re-projected stroke,
   * its plane, and the erase of the one it replaced — in that order, so the
   * erase is dropped first and the first plane comes back). `session.undo()`
   * drops one event, so the shard walks back until a whole act has gone — the
   * solid if one stands on top, else a stroke — and then stops. That is what
   * "undo removes the solid and leaves the ink" means in a log where a solid
   * IS three events, and what makes one undo restore a flipped mark's first
   * plane rather than half of it.
   */
  function undo() {
    const artifactsBefore = session.getState().artifacts.length;
    const strokesBefore = strokeCount();
    // A VERSION is an act too (P3): a cut is `code` plus the proposals that
    // take the feature's ink into the solid, and one undo has to drop exactly
    // that and stop — leaving the box standing on its earlier tree and the
    // circle still lying on its face.
    // A version is a version even when the step COUNT does not move: growing a
    // massing rewrites its one step rather than adding a second, so the tree
    // itself is what is compared. Found by undoing a third elevation.
    const treesBefore = solids().map((s) => ({ id: s.id, steps: s.tree.steps.length, json: JSON.stringify(s.tree) }));
    // P6: a CORRECTION is a whole act too — one `propose`, one thing said. It
    // goes on top of the stroke it was said about, so a walk that did not stop
    // at it would drop the mark as well and *Not a mug* would erase the mug's
    // profile. Found by undoing one.
    const saidBefore = countReps(CORRECTION_REP);
    const heldBefore = countReps(DEFINITION_REP);
    for (let i = 0; i < 12; i++) {
      const events = session.getEvents().length;
      session.undo();
      if (session.getEvents().length === events) break; // nothing left to drop
      const artifacts = session.getState().artifacts.length;
      // A dropped `erase` puts an artifact BACK: undoing a *remove* is a whole
      // act too, and walking past it would eat the stroke underneath.
      if (artifacts > artifactsBefore) break;
      if (artifacts < artifactsBefore) {
        // The bless has gone; the summon it was made against would otherwise
        // stay behind as an open selection nobody asked for.
        while (topEvent() === 'summon') {
          const n = session.getEvents().length;
          session.undo();
          if (session.getEvents().length === n) break;
        }
        break;
      }
      // A solid that is still standing and has FEWER steps than it had: a
      // version was dropped, and that is a whole act.
      const now = solids();
      if (treesBefore.some((t) => {
        const m = now.find((s) => s.id === t.id);
        return !!m && (m.tree.steps.length < t.steps || JSON.stringify(m.tree) !== t.json);
      })) break;
      if (countReps(CORRECTION_REP) < saidBefore) break;
      if (countReps(DEFINITION_REP) < heldBefore) break;
      if (strokeCount() < strokesBefore) break;
    }
  }

  function clear() {
    session.load([]);
  }

  /**
   * The outline the diff reads, and which one it is.
   *
   * §4 says the profile's ink or its clean form "when one is held — say which
   * and why". The clean form is preferred because a solid is built from clean
   * forms everywhere else in the shard and a diff between hand-wobble and an
   * exact body would report a rim of noise all round; but the engine only
   * offers one when the reading is confident AND unambiguous (`clean.ts`), so
   * an outline with a bump on it — the whole point of drawing a profile against
   * a solid — is never quietly straightened into a rectangle.
   */
  function inkFor(id: string): { points: Point[]; from: 'clean' | 'ink'; why: string } | null {
    const mark = markOf(id);
    if (!mark || mark.points.length < 3) return null;
    const clean = offerFor(id);
    if (clean && clean.closed && clean.points.length >= 3) {
      return {
        points: clean.points,
        from: 'clean',
        why: `the clean ${clean.shape} the engine draws for ${id} (${clean.reasoning})`,
      };
    }
    return {
      points: mark.points,
      from: 'ink',
      why: `the ink of ${id} as the hand drew it — the engine offers no clean form for this outline, so nothing was straightened`,
    };
  }

  function offerFor(id: string): CleanShape | null {
    const s = session.getState();
    const node = s.nodes.get(id);
    if (!node) return null;
    const reading = snapReading(node, s.nodes);
    if (!reading.ok) return null;
    return idealize(node, reading.shape);
  }

  /**
   * The maths of a mark, measured AS THE HAND DREW IT — in screen pixels.
   *
   * `measure()` rounds to whole units and labels every length `px`: it assumes
   * world units ARE screen pixels, which on a plane in space they are not. A
   * 1.2-unit circle comes back as "radius 1px" — the rounding eats the shape.
   * So the mark is measured on a copy scaled by 1/scale, where the engine's
   * own unit label is literally true, and the panel says which space it is in.
   *
   * §11, the first thing P0 found for core: `measure()` should take the
   * stroke's scale the way `analyzeStroke` does, and name its unit.
   */
  function mathsOf(id: string) {
    const s = session.getState();
    const node = s.nodes.get(id);
    const points = node ? strokePointsOf(node) : undefined;
    const plane = node ? planeOf(node) : null;
    if (!node || !points || !plane) return null;
    const scale = (plane as Plane & { scale?: number }).scale ?? 1;
    const k = 1 / scale;
    const inHand = points.map((p) => ({ x: p.x * k, y: p.y * k }));
    const handNode: MMNode = {
      ...node,
      // The transform is already composed into `points`; carrying it too
      // would apply it twice.
      reps: node.reps
        .filter((r) => r.modality !== 'transform')
        .map((r) =>
          r.modality === 'stroke'
            ? { ...r, data: { ...(r.data as object), points: inHand } }
            : r.modality === 'fingerprint'
              ? { ...r, data: getFingerprint(inHand, 1) }
              : r
        ),
    };
    const maths = measure(handNode, s.nodes);
    if (!maths || !maths.measures.length) return null;
    return { maths, text: describeMaths(maths), scale };
  }

  // ===== the form rung, and the solids it affords ==========================

  /** A mark as `form.ts` needs it: the engine's OWN shape reading, its plane, its ink. */
  function formMarkOf(mark: Mark): FormMark {
    const tier0 = mark.readings.filter((r) => r.tier === 0 && r.to.startsWith('type:'));
    const fp = fingerprintOf(mark.node);
    const closed = !!fp?.isClosed;
    // The face this mark's plane was read off, with the face's OWN extent —
    // the winner's anchor, kept in the plane rep (see `strip`).
    const won = mark.candidates?.[0];
    const anchor = mark.plane.source === 'face' ? won?.anchor : undefined;
    // Row 1 needs the screen path AND the solids as they stood in that view.
    // Only an OPEN stroke can be a scratch, so nothing else pays for a hull.
    const silhouettes = !closed && mark.pose && space ? space.silhouettes(mark.pose) : undefined;
    const taken = solids().filter((s) => s.memberIds.includes(mark.id)).map((s) => s.id);
    // P4's evidence, and ONLY for a mark row 2 could place: a closed stroke on
    // a plane the hand chose or the read named. Nothing else pays for a render.
    const onPlane =
      space && closed && (mark.plane.source === 'chosen' || mark.plane.source === 'world')
        ? solids()
            .filter((s) => !taken.includes(s.id))
            .map((s) => {
              const sil = space!.silhouetteOn(s.id, mark.plane);
              return sil && sil.outlines.length
                ? { solidId: s.id, name: s.name, outlines: sil.outlines }
                : null;
            })
            .filter((x): x is NonNullable<typeof x> => x !== null)
        : undefined;
    return {
      id: mark.id,
      shape: tier0[0]?.label ?? '',
      confidence: tier0[0]?.weight ?? 0,
      closed,
      plane: mark.plane,
      points: mark.points,
      size: fp?.size ?? 0,
      ...(anchor?.solidId
        ? { face: { solidId: anchor.solidId, label: anchor.what, bounds: anchor.bounds } }
        : {}),
      ...(mark.screen ? { screen: mark.screen } : {}),
      ...(silhouettes?.length ? { silhouettes } : {}),
      ...(taken.length ? { partOf: taken } : {}),
      ...(onPlane?.length ? { solidsOnPlane: onPlane } : {}),
    };
  }

  function formMarks(): FormMark[] {
    return marks().map(formMarkOf);
  }

  let formCache: { version: number; forms: FormReading[] } | null = null;

  function forms(): FormReading[] {
    if (formCache && formCache.version === version) return formCache.forms;
    const s = session.getState();
    const out = assignForms({
      marks: formMarks(),
      solids: solids().map((sd) => ({ id: sd.id, memberIds: sd.memberIds })),
      selection: s.selection,
    }).map((f) => heldGesture(f.id) ?? f);
    formCache = { version, forms: out };
    return out;
  }

  function formOf(id: string): FormReading | null {
    return forms().find((f) => f.id === id) ?? null;
  }

  /**
   * The clean form the solid is built from — "the clean form of the profile is
   * what is extruded, so the solid is exact; the ink stays on the face" (§2.4).
   * A mark the engine will not draw clean keeps its own outline, and the tree
   * says so rather than pretending to a shape nobody read.
   */
  function profileShape(mark: Mark): Profile2D {
    const clean = offerFor(mark.id);
    if (clean) return { shape: clean.shape, points: clean.points, closed: clean.closed, reasoning: clean.reasoning };
    // **A prism is built on the shape, not on the sampling rate.**
    //
    // A hand (or the e2e) leaves a nine-corner outline as a hundred and
    // twenty-seven samples, and `ExtrudeGeometry` then builds a hundred and
    // twenty-seven walls where nine will do. The boolean library has to split
    // every one of them against every face of the next prism, and on the
    // castle's three views it reached the BVH's own depth limit and took
    // minutes — *"Max depth of 40 reached when generating BVH"*, which is a
    // library saying it has been handed a shape made of noise.
    //
    // So the outline is simplified first, at a ratio of the mark's OWN size
    // (the same fraction `getFingerprint` measures corners at). Nothing about
    // the shape changes: what goes is the distance between samples along a
    // straight run, which was never part of the drawing. The ink is untouched,
    // as always — this is the form the SOLID is built from.
    const size = fingerprintOf(mark.node)?.size ?? 0;
    const points = simplifyStroke(mark.points, Math.max(size * PROFILE_SIMPLIFY, 1e-4));
    return {
      shape: 'polygon',
      points: points.length >= 3 ? points : mark.points,
      closed: true,
      reasoning:
        `the ink as it was drawn — the engine offered no clean form for it — simplified from ` +
        `${mark.points.length} to ${points.length} points at ${(PROFILE_SIMPLIFY * 100).toFixed(1)}% of its own size, ` +
        `which drops the sampling rate and keeps the shape`,
    };
  }

  function makeable(): Makeable[] {
    const made = solids();
    const taken = new Set(made.flatMap((s) => s.memberIds));
    return makeableFrom(forms()).filter((m) => {
      const partner = m.kind === 'extrude' ? m.extentId : m.axisId;
      return !taken.has(m.profileId) && !taken.has(partner);
    });
  }

  /**
   * Make a solid. ONE act, held as three events — the marks pointed at, the
   * bless that makes them an artifact, and the tree attached to it as code —
   * so `undo()` drops all three and the ink is exactly where it was.
   *
   * Attributed to the ENGINE: a box from a rectangle and a line is tier 1,
   * the canvas answering first (invariant 7). The word it is blessed with is
   * the engine's word for what it made, not a name anyone gave it.
   */
  function make(m: Makeable, at = Date.now()) {
    const profileMark = markOf(m.profileId);
    const partnerId = m.kind === 'extrude' ? m.extentId : m.axisId;
    const partnerMark = markOf(partnerId);
    if (!profileMark || !partnerMark) return null;
    const profile: ProfileInput = { id: m.profileId, plane: profileMark.plane, clean: profileShape(profileMark) };
    const line: LineInput = { id: partnerId, plane: partnerMark.plane, points: partnerMark.points };
    const step = m.kind === 'extrude' ? extrudeStep(profile, line) : revolveStep(profile, line);
    const name = engineWord(step);
    const summonId = session.summonMarks([m.profileId, partnerId], at);
    if (!summonId) return null;
    const id = session.bless({ summonId, name, at, participantId: ENGINE_PARTICIPANT });
    if (!id) return null;
    session.attachCode({
      participantId: ENGINE_PARTICIPANT,
      nodeId: id,
      code: encodeOpTree(treeOf(step)),
      kind: 'json',
      language: 'json',
      prompt: step.reasoning,
      at,
    });
    return { id, step, name };
  }

  // ===== P3: features, cuts, and the rest of tier 1 ========================

  /**
   * The features on the board that have not been TAKEN yet.
   *
   * A feature whose id already appears in its solid's tree has been acted on —
   * it is the hole, not an offer to make one — and offering *Cut a hole* again
   * on the ink that already cut it would be the board forgetting what it did.
   */
  function features(): FeatureOffer[] {
    return featuresFrom(forms()).filter((f) => {
      const solid = solidOf(f.solidId);
      if (!solid) return false;
      return !solid.tree.steps.some((s) => s.from.includes(f.featureId));
    });
  }

  function featureFor(solidId: string): FeatureOffer | null {
    const mine = features().filter((f) => f.solidId === solidId);
    // Newest first: the last thing drawn on the face is what the hand means.
    return mine[mine.length - 1] ?? null;
  }

  /** The feature as `op.ts` needs it: its clean form, on the FACE plane it lies on. */
  function featureInput(offer: FeatureOffer): FeatureInput | null {
    const mark = markOf(offer.featureId);
    if (!mark) return null;
    return { id: mark.id, plane: mark.plane, clean: profileShape(mark), solidId: offer.solidId };
  }

  /** The world length of the extent drawn from a feature's edge, when there is one. */
  function extentLength(id?: string): { id: string; length: number } | undefined {
    if (!id) return undefined;
    const mark = markOf(id);
    if (!mark || mark.points.length < 2) return undefined;
    const a = toWorld(mark.plane, mark.points[0]);
    const b = toWorld(mark.plane, mark.points[mark.points.length - 1]);
    return { id, length: length(sub(b, a)) };
  }

  /**
   * A new VERSION of a solid's tree, attached as another `code` rep.
   *
   * `attachCode` appends, and `solids()` reads the NEWEST code rep — so every
   * version a solid has ever had is still in the log, attributed, and undo
   * walks back to the one before. That is the version rule the canvas lives
   * by, applied to an op tree: a cut is not an edit of the box, it is the next
   * thing the box became.
   */
  function newVersion(solidId: string, next: OpTree, why: string, at: number, by = ENGINE_PARTICIPANT) {
    session.attachCode({
      participantId: by,
      nodeId: solidId,
      code: encodeOpTree(next),
      kind: 'json',
      language: 'json',
      prompt: why,
      at,
    });
  }

  /**
   * The feature's ink becomes a member of the solid it cut, so ink over the
   * solid addresses the step — and so the feature is not offered again as a
   * profile standing loose on the board.
   */
  function takeInto(solidId: string, markId: string, at: number) {
    session.propose({
      participantId: ENGINE_PARTICIPANT,
      nodeId: solidId,
      edges: [{ to: markId, rel: 'has-part', reasoning: 'the feature this step was cut from' }],
      reps: [],
      at,
    });
  }

  function featureAct(offer: FeatureOffer, kind: 'cut' | 'boss', at: number) {
    const solid = solidOf(offer.solidId);
    const input = featureInput(offer);
    if (!solid || !input) return null;
    const extent = extentLength(offer.extentId);
    // THROUGH is measured on the body, not guessed: how far the solid reaches
    // along the face's own normal. With no space installed (the tests) the
    // step falls back to the depth the drawing already contains.
    const span = space ? space.spanAlong(offer.solidId, input.plane.normal) : undefined;
    const step =
      kind === 'cut'
        ? cutStep(solid.tree, input, { ...(extent ? { extent } : {}), ...(span ? { span } : {}) }, nextStepId(solid.tree))
        : bossStep(solid.tree, input, extent ? { extent } : {}, nextStepId(solid.tree));
    newVersion(solid.id, withStep(solid.tree, step), step.reasoning, at);
    takeInto(solid.id, offer.featureId, at);
    if (offer.extentId) takeInto(solid.id, offer.extentId, at);
    return { id: solid.id, step: step as OpStep };
  }

  const cut = (offer: FeatureOffer, at = Date.now()) => featureAct(offer, 'cut', at);
  const boss = (offer: FeatureOffer, at = Date.now()) => featureAct(offer, 'boss', at);

  function mirror(solidId: string, plane: Plane, at = Date.now()) {
    const solid = solidOf(solidId);
    if (!solid) return null;
    const step = mirrorStep(solid.tree, plane, nextStepId(solid.tree));
    newVersion(solid.id, withStep(solid.tree, step), step.reasoning, at);
    return { id: solid.id, step: step as OpStep };
  }

  /**
   * `dup` — a copy of the body standing BESIDE it, by its own width.
   *
   * **What was chosen, and why.** A dup is a `place` step holding a copy of
   * the tree so far, carrying `on` so the derivation puts the copy beside the
   * body it came from: one tree, two bodies, a new version of the same solid.
   * It is not a second artifact, and that is not a preference — `bless` needs
   * marks that are still on the CONTENT plane and a made solid's members are
   * not (blessing took them off), so there is no way to stand a second
   * artifact up from a tree alone. Until a tree can be named and pointed at —
   * P6's definitions — this is the honest shape, and the README lists the core
   * gap.
   *
   * "Beside" is measured: the body's own extent along +X, plus a tenth of it,
   * so two copies never overlap and a small thing does not land a mile away.
   */
  function dup(solidId: string, at = Date.now()) {
    const solid = solidOf(solidId);
    if (!solid) return null;
    const across: Vec3 = { x: 1, y: 0, z: 0 };
    const wide = space ? space.spanAlong(solidId, across) : 0;
    const gap = wide ? wide * 1.1 : 2;
    const offset: Vec3 = { x: gap, y: 0, z: 0 };
    const why =
      `a copy of ${solid.name} standing ${gap.toFixed(2)} u along +X — its own width and a tenth, ` +
      `so the two never overlap and a small thing does not land a mile away`;
    const step = placeStep(solid.tree, offset, why, nextStepId(solid.tree));
    step.on = rootOf(solid.tree)?.id;
    newVersion(solid.id, withStep(solid.tree, step), why, at);
    return { id: solid.id, name: solid.name };
  }

  function scratchOf(markId: string) {
    const mark = marks().find((m) => m.id === markId);
    return mark ? scratchAgainst(formMarkOf(mark)) : null;
  }

  /**
   * A scratch: the solid comes off the board and the reading is HELD on the
   * mark that did it.
   *
   * Holding it is not decoration. The form rung's row 1 reads a stroke against
   * the silhouettes of the solids standing in its view — so the moment the
   * scratch has done its work there is no solid left to cross, and the table
   * re-derives the very same mark as an `annotation`. **What a mark did is not
   * derivable from the board it changed.** So the reading goes into the log as
   * a `gesture` rep the way core holds one (`session.ts`, `role: 'scratch'`),
   * and `forms()` prefers it.
   *
   * ERASE FIRST, hold SECOND. `undo()` walks back from the top of the log: the
   * held reading is dropped first, then the erase, and the solid comes back
   * with the mark reading as ordinary ink again — one act, two events, one undo.
   */
  function scratch(markId: string, reading: FormReading, at = Date.now()) {
    const solidId = reading.targets[0];
    const solid = solidId ? solidOf(solidId) : null;
    if (!solid) return null;
    // Counted BEFORE the erase: once the solid is off the board there is no
    // silhouette left to count against — the same reason the reading is held.
    const mark = markOf(markId);
    const crossings = mark ? scratchAgainst(formMarkOf(mark))?.crossings ?? 0 : 0;
    session.erase(solid.id, at);
    session.propose({
      participantId: ENGINE_PARTICIPANT,
      nodeId: markId,
      edges: [],
      reps: [
        {
          modality: GESTURE_REP,
          data: {
            role: 'scratch',
            erased: solid.id,
            name: solid.name,
            rule: reading.rule,
            confidence: reading.confidence,
            targets: reading.targets,
            why: reading.reasoning,
          },
          confidence: reading.confidence,
          reasoning: reading.reasoning,
        },
      ],
      at,
    });
    return { solidId: solid.id, name: solid.name, crossings };
  }

  /** The gesture reading held on a mark, when it has one. */
  function heldGesture(id: string): FormReading | null {
    const node = session.getState().nodes.get(id);
    const rep = node ? getRep(node, GESTURE_REP) : undefined;
    const held = rep?.data as
      | { role?: string; rule?: number; confidence?: number; targets?: string[]; why?: string }
      | undefined;
    if (!held || held.role !== 'scratch') return null;
    return {
      id,
      role: 'gesture',
      rule: held.rule ?? 1,
      confidence: held.confidence ?? 0.7,
      reasoning: held.why ?? 'a scratch',
      targets: held.targets ?? [],
    };
  }

  // ===== P4: the diff is the brief =========================================

  /** Every closed mark the form rung read as a profile OF this solid, oldest first. */
  function profilesOf(solidId: string): ProfileOfSolid[] {
    const out: ProfileOfSolid[] = [];
    for (const f of forms()) {
      if (f.role !== 'profile' || f.against?.solidId !== solidId) continue;
      const mark = markOf(f.id);
      if (!mark) continue;
      out.push({
        markId: f.id,
        solidId,
        name: f.against.name,
        plane: mark.plane,
        view: f.against.view,
        reasoning: f.reasoning,
      });
    }
    return out;
  }

  /**
   * The diff, on demand and cached per log version — the panel asks for it on
   * every hover, and it is a rasterisation and a render.
   */
  const diffCache = new Map<string, Diff | null>();

  function diffFor(markId: string): Diff | null {
    const key = `${version}|${markId}`;
    if (diffCache.has(key)) return diffCache.get(key) ?? null;
    if (diffCache.size > 64) diffCache.clear();
    const form = formOf(markId);
    const mark = markOf(markId);
    const ink = inkFor(markId);
    if (!form?.against || !mark || !ink) {
      diffCache.set(key, null);
      return null;
    }
    const sil = space?.silhouetteOn(form.against.solidId, mark.plane) ?? null;
    const out = diffProfile({
      ink: ink.points,
      from: ink.from,
      inkWhy: ink.why,
      ...(sil ? { silhouetteMask: { mask: sil.mask, grid: sil.grid } } : {}),
      view: form.against.view,
    });
    diffCache.set(key, out);
    return out;
  }

  /**
   * The profile the field acts on: the NEWEST one of this solid that still has
   * something to say. The newest, because the last thing drawn is what the hand
   * means (the same rule `featureFor` keeps); "still has something to say",
   * because a profile the body already matches affords nothing and the pill
   * should say so rather than run and do nothing.
   */
  function matchable(solidId: string, how: 'add' | 'remove') {
    const mine = profilesOf(solidId);
    for (let i = mine.length - 1; i >= 0; i--) {
      const diff = diffFor(mine[i].markId);
      if (!diff) continue;
      const regions = how === 'add' ? diff.missing : diff.extra;
      if (regions.length) return { profile: mine[i], diff };
    }
    return null;
  }

  /**
   * *Add it* / *Take it off* — the diff resolved at tier 1 (§4).
   *
   * One act, one version, one undo. The profile's ink is deliberately NOT taken
   * into the solid the way a feature's is: a feature has been consumed by the
   * cut it made, but a profile is a standing claim about the shape, and the
   * whole point of the row is that after the act it re-reads and says *matches
   * 99%*. Taking it in would make the board forget what it had been asked.
   */
  function match(markId: string, how: 'add' | 'remove', at = Date.now()) {
    const form = formOf(markId);
    const mark = markOf(markId);
    if (!form?.against || !mark) return null;
    const solid = solidOf(form.against.solidId);
    const diff = diffFor(markId);
    if (!solid || !diff) return null;
    const regions = how === 'add' ? diff.missing : diff.extra;
    if (!regions.length) return null;
    const area = regions.reduce((n, r) => n + r.area, 0);
    const why =
      `${how === 'add' ? 'added' : 'took off'} ${regions.length} region${regions.length === 1 ? '' : 's'} ` +
      `(${area.toFixed(2)} u²) ${regions[0].where}, run right through ${solid.name} along the ` +
      `${mark.plane.name ?? 'plane'}'s own normal, from the ${diff.view} profile ${markId} — ${diff.sentence}. ` +
      `The regions are re-derived from that ink and this body every time the tree is walked; ` +
      `this step holds none of them`;
    const step = matchStep(solid.tree, { id: markId, plane: mark.plane }, how, why, nextStepId(solid.tree));
    newVersion(solid.id, withStep(solid.tree, step), why, at);
    return { id: solid.id, step: step as OpStep, diff };
  }

  // ===== P5: the generator seat, and names =================================

  const DEFINITION_REP = 'definition';
  const SAYING_REP = 'saying';
  const CORRECTION_REP = 'correction';

  /**
   * The massing the board affords: profiles on different world planes whose
   * projections overlap, none of them already taken into a solid.
   */
  function massable(): Massable | null {
    const taken = new Set(solids().flatMap((sd) => sd.memberIds));
    const marks = formMarks().filter((m) => !taken.has(m.id));
    const readings = forms().filter((f) => !taken.has(f.id));
    return massableFrom(readings, marks);
  }

  /**
   * Stand the massing up. The same act as `make`: summon, bless, attach — three
   * events, one undo — and in the ENGINE's name, because this is tier 1
   * answering and no model was asked.
   */
  function mass(m: Massable, at = Date.now()) {
    const profiles = m.profileIds
      .map((id) => markOf(id))
      .filter((x): x is Mark => !!x)
      .map((mark) => ({ id: mark.id, plane: mark.plane, clean: profileShape(mark) }));
    if (profiles.length < 2) return null;
    const step = massingStep(profiles, 'step:1', m.reasoning);
    const summonId = session.summonMarks(m.profileIds, at);
    if (!summonId) return null;
    const id = session.bless({ summonId, name: 'massing', at, participantId: ENGINE_PARTICIPANT });
    if (!id) return null;
    session.attachCode({
      participantId: ENGINE_PARTICIPANT,
      nodeId: id,
      code: encodeOpTree(treeOf(step)),
      kind: 'json',
      language: 'json',
      prompt: step.reasoning,
      at,
    });
    return { id, step: step as OpStep, name: 'massing' };
  }

  /**
   * A massing GROWS while it is still only a massing.
   *
   * "The moment the second lands" is when it stands, and the third view has to
   * go INTO it rather than beside it — each profile is grown through the span
   * of the OTHERS, so a third elevation re-derives the first two's prisms as
   * well. Two things follow, and both are deliberate:
   *
   *   * **A profile of a massing is a view of it, not a claim about it.** The
   *     form rung reads a closed mark over a standing body as that body's
   *     profile (P4, `against`) and offers the diff — which is exactly right
   *     once something has been BUILT, and exactly wrong while the body is
   *     only the volume its views share. So `against` is set aside here.
   *   * **Only while the tree is one massing step.** The moment a model has
   *     filled it, or a cut has gone into it, another view is a standing claim
   *     about the shape and the diff is what it affords. One rule, one line,
   *     and the board never has to guess which of the two a mark meant.
   */
  function growable(): { solidId: string; add: string[]; reasoning: string } | null {
    const taken = new Set(solids().flatMap((sd) => sd.memberIds));
    for (const solid of solids()) {
      const only = solid.tree.steps.length === 1 ? (solid.tree.steps[0] as MassingStep) : null;
      if (!only || only.op !== 'massing' || only.on) continue;
      const have = only.from;
      const loose = forms().filter((f) => f.role === 'profile' && !taken.has(f.id) && !have.includes(f.id));
      if (!loose.length) continue;
      const ids = new Set([...have, ...loose.map((f) => f.id)]);
      const scope = formMarks().filter((m) => ids.has(m.id));
      const readings = forms()
        .filter((f) => ids.has(f.id))
        .map((f) => ({ ...f, against: undefined }));
      const m = massableFrom(readings, scope);
      if (!m) continue;
      const add = m.profileIds.filter((id) => !have.includes(id));
      if (!add.length) continue;
      return { solidId: solid.id, add, reasoning: m.reasoning };
    }
    return null;
  }

  function growMassing(g: { solidId: string; add: string[]; reasoning: string }, at = Date.now()) {
    const solid = solidOf(g.solidId);
    const only = solid?.tree.steps[0] as MassingStep | undefined;
    if (!solid || !only || only.op !== 'massing') return null;
    const ids = [...only.from, ...g.add];
    const profiles = ids
      .map((id) => markOf(id))
      .filter((x): x is Mark => !!x)
      .map((mark) => ({ id: mark.id, plane: mark.plane, clean: profileShape(mark) }));
    if (profiles.length < 2) return null;
    const step = massingStep(profiles, only.id, g.reasoning);
    newVersion(solid.id, { ...solid.tree, steps: [step] }, g.reasoning, at);
    for (const id of g.add) takeInto(solid.id, id, at);
    return { id: solid.id, count: profiles.length };
  }

  function joinAgent(name: string, locality: 'local' | 'hosted', at = Date.now()): string {
    return session.join('agent', name, at, 2, locality);
  }

  /** The scale the hand has been working at — what a model's own marks are read at. */
  function handScale(): number {
    const all = marks().map((m) => m.scale).filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
    return all.length ? all[Math.floor(all.length / 2)] : 0.01;
  }

  /** A plane a model named: one of the three world planes, or a plane some mark already lies on. */
  function planeNamed(name: string): Plane | null {
    const key = name.trim().toLowerCase();
    if (key === 'foundation' || key === 'height' || key === 'width') {
      return NAMED[key as PlaneName]('world', `the ${key} plane, named in a model's reply`);
    }
    const on = marks().find((m) => (m.plane.name ?? '').toLowerCase() === key);
    return on ? { ...on.plane, why: `the plane ${on.id} lies on, named in a model's reply` } : null;
  }

  /** A model's profile as a path a hand could have drawn — densified, so the rung can measure it. */
  function outlineFor(p: Proposal['profiles'][number]): Point[] | null {
    const dense = (corners: Point[], per = 16): Point[] => {
      const out: Point[] = [];
      for (let i = 0; i < corners.length; i++) {
        const a = corners[i];
        const b = corners[(i + 1) % corners.length];
        for (let k = 0; k < per; k++) {
          const t = k / per;
          out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        }
      }
      out.push(corners[0]);
      return out;
    };
    if (p.shape === 'circle' && p.centre && p.r) {
      const n = 72;
      return Array.from({ length: n + 1 }, (_, i) => {
        const t = (i / n) * Math.PI * 2;
        return { x: p.centre!.x + Math.cos(t) * p.r!, y: p.centre!.y + Math.sin(t) * p.r! };
      });
    }
    if (p.shape === 'rectangle' && p.centre && p.w && p.h) {
      const x = p.centre.x - p.w / 2;
      const y = p.centre.y - p.h / 2;
      return dense([
        { x, y },
        { x: x + p.w, y },
        { x: x + p.w, y: y + p.h },
        { x, y: y + p.h },
      ]);
    }
    if (p.points && p.points.length >= 3) return dense(p.points, 12);
    return null;
  }

  /**
   * A model's reply, turned into steps on a solid's tree.
   *
   * Three things happen, in this order and for these reasons:
   *
   *   1. **The model's own profiles are DRAWN INTO THE LOG** through the same
   *      `addStroke` a hand's go through, attributed to the model and declared
   *      content — the canvas's `agent.draw` rule (`synthesize.ts`). They get
   *      the same fingerprint, the same readings, the same clean form, the
   *      same eraser, and the model's steps then reference them by the ids
   *      they were given.
   *   2. **Its steps are built from the shard's own constructors**, never from
   *      anything it wrote: a step outside the vocabulary was already dropped
   *      by `parseProposal`, and one whose profile is not on the board is
   *      dropped here and counted.
   *   3. **The whole thing is CLIPPED to the drawing**, as a final step in the
   *      engine's name. That is §6's extent invariant taken literally: a
   *      proposal cannot leave the volume the profiles describe, whatever it
   *      says.
   */
  function buildSteps(
    solid: Solid,
    base: OpTree,
    proposal: Proposal,
    by: { id: string; name: string },
    at: number
  ): { tree: OpTree; steps: OpStep[]; drawn: string[]; dropped: string[] } | null {
    const dropped = [...proposal.droppedWhy];
    const drawn: string[] = [];
    const scale = handScale();

    // 1 · the profiles the model added, as declared content in its own name.
    //
    // **Only the ones a step actually uses.** A reply may carry profiles
    // nothing references — qwen3:8b's first castle came back with the three
    // views re-stated as rectangles it then never mentioned again — and ink a
    // model left behind that is part of nothing is not the tree's provenance,
    // it is litter on the board. Worse, it is litter the form rung then reads
    // as three standing claims about the solid, and every report runs a diff
    // on each of them.
    const used = new Set(proposal.steps.flatMap((s) => [s.profile, s.axis]).filter(Boolean) as string[]);
    const byModelId = new Map<string, string>();
    for (const p of proposal.profiles) {
      if (!used.has(p.id)) {
        dropped.push(`the profile ${p.id} is not used by any step in the reply — nothing was drawn for it`);
        continue;
      }
      const flat = planeNamed(p.plane);
      // The gizmo's own handle, said as a number: a named plane passes through
      // the origin, and `at` is where the hand would have slid it to.
      const plane = flat && p.at ? slide(flat, p.at) : flat;
      const points = plane ? outlineFor(p) : null;
      if (!plane || !points) {
        dropped.push(`the profile ${p.id} names the plane “${p.plane}”, which is not a plane on this board`);
        continue;
      }
      const id = add(points, plane, scale, at, {}, by.id);
      byModelId.set(p.id, id);
      drawn.push(id);
    }

    // 2 · the steps.
    let tree = base;
    const made: OpStep[] = [];
    const byStepId = new Map<string, string>();
    for (const s of proposal.steps) {
      const strokeId = s.profile ? byModelId.get(s.profile) ?? s.profile : undefined;
      const mark = strokeId ? markOf(strokeId) : null;
      const on = s.on ? byStepId.get(s.on) : undefined;
      if (s.on && !on) {
        dropped.push(`${s.id} acts on ${s.on}, and no step of that name was made`);
        continue;
      }
      const id = nextStepId(tree);
      const why =
        `${s.why ?? `a ${s.op} ${by.name} proposed`}${s.name ? ` — named “${s.name}”` : ''}` +
        `${s.depth !== undefined ? `, ${Math.abs(s.depth).toFixed(2)} u along the plane's own normal, a number ${by.name} wrote in the brief's units` : ''}`;
      let step: OpStep | null = null;

      if (s.op === 'mirror') {
        const plane = planeNamed(s.plane ?? 'height');
        const root = on ?? rootOf(tree)?.id;
        if (!plane || !root) {
          dropped.push(`the mirror ${s.id} has no plane or nothing to reflect`);
          continue;
        }
        const m = mirrorStep(tree, plane, id) as MirrorStep;
        m.on = root;
        m.reasoning = why;
        step = m;
      } else if (!mark) {
        dropped.push(`${s.id} names the profile ${s.profile}, which is not a mark on this board`);
        continue;
      } else if (s.op === 'extrude') {
        const depth = s.depth;
        if (depth === undefined || Math.abs(depth) < 1e-6) {
          dropped.push(`the extrude ${s.id} says no depth, and nothing in the drawing says one for it`);
          continue;
        }
        step = extrudeAt({ id: mark.id, plane: mark.plane, clean: profileShape(mark) }, depth, id, why);
      } else if (s.op === 'revolve') {
        const axis = s.axis ? markOf(s.axis) : null;
        if (!axis) {
          dropped.push(`the revolve ${s.id} names the axis ${s.axis ?? '(none)'}, which is not a mark on this board`);
          continue;
        }
        const rs = revolveStep(
          { id: mark.id, plane: mark.plane, clean: profileShape(mark) },
          { id: axis.id, plane: axis.plane, points: axis.points },
          s.sweep,
          id
        );
        rs.reasoning = why;
        step = rs;
      } else {
        const root = on ?? rootOf(tree)?.id;
        const depth = s.depth;
        if (!root) {
          dropped.push(`the ${s.op} ${s.id} has nothing to act on`);
          continue;
        }
        if (depth === undefined || Math.abs(depth) < 1e-6) {
          dropped.push(`the ${s.op} ${s.id} says no depth`);
          continue;
        }
        step = featureAt(
          s.op,
          { id: mark.id, plane: mark.plane, clean: profileShape(mark), solidId: solid.id },
          depth,
          root,
          id,
          why
        );
      }

      if (!step) continue;
      if (s.name) step.name = s.name;
      if (s.material) step.material = s.material;
      step.by = by.name;
      tree = withStep(tree, step);
      byStepId.set(s.id, step.id);
      made.push(step);
    }

    if (!made.length) return null;

    // 3 · the clip. The engine's own step, and the last word.
    //
    // **Only against a MASSING.** §6's extent invariant is about the volume the
    // drawing's own views describe — "the space has already stood a MASSING up
    // from them, and that massing is an INVARIANT". A solid that was BUILT (an
    // extrude, a cut) is not a massing: a proposal that adds to it is adding,
    // which is what `boss` is for, and what checks it afterwards is the diff
    // (§4). Clipping to the base extrude instead meant a model asked for a mug
    // with a handle could never put the handle outside the box — found by
    // asking for one.
    const bound = base.steps.find((st) => st.op === 'massing' && !st.on) ?? null;
    const root = rootOf(tree);
    if (bound && root && root.id !== bound.id) {
      const clip = clipStep(
        root.id,
        bound.id,
        nextStepId(tree),
        `${by.name}'s tree kept only where it lies inside ${bound.op === 'massing' ? 'the massing' : bound.id} — ` +
          `the drawing is the extent, and nothing proposed may leave it (§6). Added in the engine's name, after the proposal`
      );
      tree = withStep(tree, clip);
      made.push(clip);
    }

    return { tree, steps: made, drawn, dropped };
  }

  function applyProposal(solidId: string, proposal: Proposal, by: { id: string; name: string }, at = Date.now()) {
    const solid = solidOf(solidId);
    if (!solid) return null;
    const built = buildSteps(solid, solid.tree, proposal, by, at);
    if (!built) return null;
    newVersion(
      solid.id,
      built.tree,
      `${by.name} proposed ${built.steps.length} step${built.steps.length === 1 ? '' : 's'}: ` +
        `${proposal.reasoning}. Held, attributed, and clipped to the drawing`,
      at,
      by.id
    );
    // The ink the MODEL drew is the tree's provenance, exactly as a feature's
    // is: taken into the solid, so it is not read as a loose profile standing
    // beside the body. Found by looking at the castle — two circles the model
    // had drawn on the foundation read as the castle's own TOP profile, and
    // the panel dutifully reported eleven square units of material the drawing
    // "did not ask for". A mark a solid was made from is never a claim about it.
    for (const id of built.drawn) takeInto(solid.id, id, at);
    return { id: solid.id, steps: built.steps, drawn: built.drawn, dropped: built.dropped };
  }

  /**
   * A regen: only the named steps go, and the reply fills the hole they left.
   *
   * Every other step keeps its OWN ID, which is the thing the e2e asserts and
   * the reason the scope is expressed as ids rather than as a rebuild — a tree
   * that came back with all-new ids would be a new solid wearing the old one's
   * name, and nothing that pointed at a step would still point at it.
   */
  function replaceSteps(
    solidId: string,
    stepIds: string[],
    proposal: Proposal,
    by: { id: string; name: string },
    at = Date.now()
  ) {
    const solid = solidOf(solidId);
    if (!solid) return null;
    const gone = new Set(stepIds);
    const kept = withoutSteps(solid.tree, gone);
    const built = buildSteps(solid, kept, proposal, by, at);
    if (!built) return null;
    newVersion(
      solid.id,
      built.tree,
      `${by.name} was asked for ${stepIds.length} step${stepIds.length === 1 ? '' : 's'} again ` +
        `(${[...gone].join(', ')}); every other step in the tree kept its own id. ${proposal.reasoning}`,
      at,
      by.id
    );
    for (const id of built.drawn) takeInto(solid.id, id, at);
    return { id: solid.id, steps: built.steps, drawn: built.drawn, dropped: built.dropped };
  }

  /**
   * The tree without those steps, and without anything left standing on
   * nothing. A step whose `on` has gone is re-pointed at what that step stood
   * on, so removing a turret does not take the castle with it.
   */
  function withoutSteps(tree: OpTree, gone: Set<string>): OpTree {
    const byId = new Map(tree.steps.map((st) => [st.id, st]));
    const survivor = (id: string | undefined, guard = 0): string | undefined => {
      if (!id || guard > tree.steps.length) return undefined;
      if (!gone.has(id)) return id;
      return survivor(byId.get(id)?.on, guard + 1);
    };
    const steps = tree.steps
      .filter((st) => !gone.has(st.id))
      .map((st) => {
        const on = st.on ? survivor(st.on) : undefined;
        const bound = st.op === 'massing' && st.bound ? survivor(st.bound) : undefined;
        const next = { ...st } as OpStep;
        if (st.on) {
          if (on) next.on = on;
          else delete next.on;
        }
        if (st.op === 'massing' && st.bound) {
          const m = next as MassingStep;
          if (bound) m.bound = bound;
          else delete m.bound;
        }
        return next;
      })
      // A clip whose `on` has gone is a clip of the volume by itself.
      .filter((st) => !(st.op === 'massing' && (st as MassingStep).bound && !st.on));
    return { ...tree, steps };
  }

  /** Whose the newest version is, and whether the hand has taken it. */
  function versionOf(solidId: string) {
    const node = session.getState().nodes.get(solidId);
    if (!node) return null;
    const code = [...node.reps].reverse().find((r) => r.modality === 'code');
    if (!code) return null;
    // TAKEN means the definitions were held, not that the thing has a name.
    // The two were the same thing while only `take` could name a solid; P6's
    // hand names it first (*name: mug*, then *Take it*), and reading the name
    // rep disabled the very verb that holds the library. Found by naming one.
    const taken = node.reps.some((r) => r.modality === DEFINITION_REP);
    // A rep carries no time of its own; the node's is the closest honest thing.
    return { by: code.source ?? 'unknown', taken, at: node.createdAt };
  }

  /**
   * Taking the version (§2.6 rule 3): the artifact gets the ROOT's name, and
   * every named sub-tree is held as a definition based on the whole.
   *
   * One act — the name and the definitions go in as one `propose` — so one
   * undo puts the board back to a version standing held.
   */
  /**
   * A stroke as a definition's profile carries it (P6): the engine's OWN
   * fingerprint, at the scale the stroke was drawn at, and which kind of plane
   * it lay on. Nothing is measured here that the shape rung did not already
   * measure, so a replayed log derives the same numbers.
   *
   * **Only CLOSED marks.** A tree's `from` carries the extent that said how
   * tall, and a line is not a profile: matching one would offer a definition
   * for every straight stroke on the board.
   */
  function profileSignatureOf(markId: string, stepId?: string): ProfileSignature | null {
    const mark = markOf(markId);
    const fp = mark ? fingerprintOf(mark.node) : null;
    if (!mark || !fp || !fp.isClosed) return null;
    const tier0 = mark.readings.filter((r) => r.tier === 0 && r.to.startsWith('type:'));
    return {
      markId,
      ...(stepId ? { stepId } : {}),
      planeKind: planeKindOf(mark.plane),
      shape: tier0[0]?.label ?? '',
      print: printOf(fp),
    };
  }

  /** Every profile a set of steps was made from, oldest first, deduplicated. */
  function profilesOfSteps(steps: OpStep[]): ProfileSignature[] {
    const out: ProfileSignature[] = [];
    const seen = new Set<string>();
    for (const step of steps) {
      for (const id of step.from) {
        if (seen.has(id)) continue;
        seen.add(id);
        const sig = profileSignatureOf(id, step.id);
        if (sig) out.push(sig);
      }
    }
    return out;
  }

  /** Core's structural signature over a group of marks, as `structuresFor` wants it. */
  function signatureOfGroup(ids: string[]) {
    if (ids.length < 2) return null;
    const s = session.getState();
    return structuralSignature(ids, s.nodes, (id) => {
      const node = s.nodes.get(id);
      return (node ? topInterpretation(node) : undefined) ?? 'mark';
    });
  }

  function take(solidId: string, at = Date.now()) {
    const solid = solidOf(solidId);
    if (!solid) return null;
    const root = rootOf(solid.tree);
    /**
     * The name of the THING, in two cases.
     *
     * **The hand's own name wins.** If the artifact already carries a `name`
     * rep — the hand typed `name: mug` — then that is what the thing is, and
     * every named step is a part of it. Without this rule a solid the hand had
     * already called a mug, with one step a model had named `handle`, was
     * taken as a *handle*: the part naming the whole, again.
     *
     * **Otherwise the DEEPEST named step.** The root of a clipped tree is the
     * clip and a clip is never named, so the walk goes down the `on` chain and
     * keeps the last name it finds: `castle` is what the turret stands on and
     * the turret is what the top stands on. Taking the nearest named step
     * instead named the castle “top”.
     */
    let rootName: string | null = solid.named === 'human' ? solid.name : null;
    const fromTheHand = !!rootName;
    if (!rootName) {
      let walk: OpStep | undefined = root ?? undefined;
      const byId = new Map(solid.tree.steps.map((st) => [st.id, st]));
      for (let i = 0; walk && i <= solid.tree.steps.length; i++) {
        if (walk.name) rootName = walk.name;
        walk = walk.on ? byId.get(walk.on) : undefined;
      }
    }
    if (!rootName) return null;

    const held: string[] = [];
    const reps = [];

    /**
     * **The WHOLE is a definition too** (§2.6 rule 3: *taking the version holds
     * `castle` with its tree and `turret` with the sub-tree it named*). P5 held
     * only the parts, because only the parts were typed afterwards; P6's whole
     * point is that the thing itself is offered again when its profile is drawn
     * again, so the whole has to be in the library under its own name.
     */
    const wholeProfiles = profilesOfSteps(solid.tree.steps);
    reps.push({
      modality: DEFINITION_REP,
      data: {
        name: rootName,
        solidId: solid.id,
        stepId: root?.id ?? solid.tree.steps[0]?.id ?? '',
        basedOn: rootName,
        whole: true,
        steps: solid.tree.steps.map((st) => ({ ...st })),
        profiles: wholeProfiles,
        structures: structuresFor(wholeProfiles, signatureOfGroup),
        at,
        why:
          `“${rootName}” is the whole of ${solid.id} — its ${solid.tree.steps.length} step` +
          `${solid.tree.steps.length === 1 ? '' : 's'} and the ${wholeProfiles.length} profile` +
          `${wholeProfiles.length === 1 ? '' : 's'} they were made from, held so that drawing one of those ` +
          `outlines again offers it, and typing the name places it`,
      },
      confidence: 1,
    });

    for (const step of solid.tree.steps) {
      if (!step.name || step.name === rootName) continue;
      if (held.includes(step.name)) continue; // three turrets are one definition
      held.push(step.name);
      const steps = subTreeOf(solid.tree, step.id).filter((st) => st.name === step.name || st.id === step.id);
      const profiles = profilesOfSteps(steps);
      reps.push({
        modality: DEFINITION_REP,
        data: {
          name: step.name,
          solidId: solid.id,
          stepId: step.id,
          basedOn: rootName,
          steps,
          profiles,
          structures: structuresFor(profiles, signatureOfGroup),
          at,
          why:
            `“${step.name}” names ${stepsNamed(solid.tree, step.name).length} step` +
            `${stepsNamed(solid.tree, step.name).length === 1 ? '' : 's'} of ${rootName} — held as a definition ` +
            `based on the whole, so typing it later completes from the library before any model is asked, ` +
            `and drawing ${profiles.length === 1 ? 'its profile' : 'one of its profiles'} again offers it`,
        },
        confidence: 1,
      });
    }
    session.propose({
      participantId: LOCAL_PARTICIPANT,
      nodeId: solid.id,
      edges: [],
      reps: [
        // A thing the hand has already named is not renamed by taking it.
        ...(fromTheHand
          ? []
          : [
              {
                modality: 'name',
                data: { text: rootName, why: `taken from the version — the root step's own name` },
                confidence: 1,
              },
            ]),
        ...reps,
      ],
      at,
    });
    return { name: rootName, definitions: held };
  }

  function corrections(): Correction[] {
    const out: Correction[] = [];
    for (const node of session.getState().nodes.values()) {
      for (const rep of node.reps) {
        if (rep.modality !== CORRECTION_REP) continue;
        const c = rep.data as Correction | undefined;
        if (c?.definition && c.profile) out.push(c);
      }
    }
    return out;
  }

  /**
   * The library, with every correction folded in.
   *
   * The definition rep is written once and never edited — `propose` appends —
   * so a correction is its own rep beside it and the examples are composed
   * here, in log order. That is what makes a correction replay with the session
   * and come off with one undo, which a mutated definition could not.
   */
  function definitions(): Definition[] {
    const out: Definition[] = [];
    const s = session.getState();
    for (const node of s.nodes.values()) {
      for (const rep of node.reps) {
        if (rep.modality !== DEFINITION_REP) continue;
        const d = rep.data as Definition | undefined;
        if (d?.name) out.push({ ...d, profiles: d.profiles ?? [] });
      }
    }
    const said = corrections();
    for (const d of out) {
      for (const c of said) {
        if (c.definition !== d.name || c.solidId !== d.solidId) continue;
        d.examples = addProfileExample(d.examples, c.profile, c.verdict);
      }
    }
    return out.reverse();
  }

  // ---- P6: the profile drawn again ----------------------------------------

  const matchCache = new Map<string, ProfileMatch[]>();

  /**
   * What this outline could be, from the library, plurally (§2.6 rule 3).
   *
   * Only a mark that PLAYS a profile and has not been taken into a solid: ink a
   * solid was made from is its provenance, not a claim to be something else,
   * and a line or a gesture is not an outline to match.
   */
  function definitionMatches(markId: string): ProfileMatch[] {
    const key = `${version}|${markId}`;
    if (matchCache.has(key)) return matchCache.get(key)!;
    if (matchCache.size > 64) matchCache.clear();
    const out = measureMatches(markId);
    matchCache.set(key, out);
    return out;
  }

  function measureMatches(markId: string): ProfileMatch[] {
    const form = formOf(markId);
    if (!form || form.role !== 'profile') return [];
    if (solidFor(markId)) return [];
    const sig = profileSignatureOf(markId);
    if (!sig) return [];
    const library = definitions();
    if (!library.length) return [];
    return rankMatches(sig.print, sig.planeKind, library as LibraryDefinition[]);
  }

  function correct(name: string, markId: string, verdict: 'is' | 'is-not' = 'is-not', at = Date.now()): Correction | null {
    const def = definitions().find((d) => d.name === name);
    const sig = profileSignatureOf(markId);
    if (!def || !sig) return null;
    const correction: Correction = {
      definition: def.name,
      solidId: def.solidId,
      verdict,
      profile: sig,
      at,
      why:
        verdict === 'is-not'
          ? `the hand said this ${sig.shape || 'outline'} on the ${sig.planeKind} is not a ${def.name} — ` +
            `held on the definition, so an outline like it is never offered as one again`
          : `the hand said this ${sig.shape || 'outline'} on the ${sig.planeKind} IS a ${def.name} — ` +
            `held as an accepted example, so one like it is offered even when the first profile does not fit`,
    };
    session.propose({
      participantId: LOCAL_PARTICIPANT,
      nodeId: def.solidId,
      edges: [],
      reps: [{ modality: CORRECTION_REP, data: { ...correction }, confidence: 1, reasoning: correction.why }],
      at,
    });
    return correction;
  }

  function whyNotPlace(name: string, markId: string | null): string | null {
    const def = definitions().find((d) => d.name === name);
    if (!def) return `nothing in the library is called “${name}”`;
    if (!def.steps.length) return `“${name}” holds no steps to stand up`;
    if (!def.profiles.length) return `“${name}” carries no profile to take a size from`;
    if (!markId) return null;
    const mark = markOf(markId);
    if (!mark) return 'that mark is not on the board';
    if (solidFor(markId)) return 'that ink was already taken into a solid — draw the outline somewhere else';
    if (!profileSignatureOf(markId)) return 'that mark is not a closed outline — a placement stands where a profile was drawn';
    return null;
  }

  /**
   * Place a definition (§2.4, `place(definition, pose)`).
   *
   * A NEW ARTIFACT, and this is the door P3's `dup` could not find: `bless`
   * needs marks that are still on the content plane, but `session.import`
   * stands an artifact up from DATA — a name, bounds and a code rep — which is
   * exactly what a placement is. The placed body is therefore a thing of its
   * own that can be moved, cut and named, rather than a second body inside
   * somebody else's tree.
   *
   * The step holds the definition, its tree and the two stroke ids; the pose is
   * re-derived from those inks every time the tree is walked.
   */
  function place(name: string, markId: string | null, at = Date.now()) {
    const def = definitions().find((d) => d.name === name);
    if (!def || whyNotPlace(name, markId)) return null;
    const mark = markId ? markOf(markId) : null;

    // Which of the definition's profiles this placement is posed from: the one
    // the drawn outline actually matched, when there is one, else the first.
    const matched = markId ? definitionMatches(markId).find((m) => m.name === name) : null;
    const from = matched?.profile ?? def.profiles[0];
    const source = markOf(from.markId);
    if (!source) return null;

    const sourceInk = inkFor(from.markId);
    const targetInk = mark ? inkFor(mark.id) : null;
    const scale =
      sourceInk && targetInk
        ? centreAndSize(targetInk.points).size / centreAndSize(sourceInk.points).size
        : 1;

    const why =
      `placed from ${def.name}` +
      (mark
        ? ` where ${mark.id} was drawn on the ${mark.plane.name ?? mark.plane.source} — ` +
          `${def.steps.length} step${def.steps.length === 1 ? '' : 's'}, scaled ×${scale.toFixed(2)} so ` +
          `${from.markId}, the profile it was matched on, fits the one drawn here` +
          (matched ? ` (${matched.reasoning})` : '')
        : ` at the world origin — nothing was selected, so there is no profile to take a size from and it stands as it was drawn`) +
      `. Nothing about where it stands is held in the step: the scale, the turn and the shift are worked out ` +
      `from those two inks every time the tree is walked`;

    const step = placeDefinitionStep({
      definition: def.name,
      steps: def.steps,
      of: from.markId,
      fromPlane: source.plane,
      to: mark ? { markId: mark.id, plane: mark.plane } : { point: { x: 0, y: 0, z: 0 } },
      id: 'step:1',
      why,
    });

    const fp = mark ? fingerprintOf(mark.node) : null;
    const id = session.import({
      kind: 'json',
      path: `placed/${def.name}.op.json`,
      name: 'placed',
      bounds: fp ? { ...fp.bounds } : { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      code: encodeOpTree(treeOf(step)),
      at,
      participantId: ENGINE_PARTICIPANT,
    });
    if (!id) return null;
    // The name is the HAND's: it came out of the library, where the hand put
    // it. The engine still never learns what a definition is called.
    session.propose({
      participantId: LOCAL_PARTICIPANT,
      nodeId: id,
      edges: mark ? [{ to: mark.id, rel: 'has-part', reasoning: 'the profile this placement stands at' }] : [],
      reps: [
        {
          modality: 'name',
          data: { text: def.name, why: `placed from the definition “${def.name}” — the name came out of the log` },
          confidence: 1,
        },
      ],
      at,
    });
    return { id, name: def.name, step: step as OpStep, from, scale };
  }

  /** Every name in play, in its step's own id — the region-id rule (§2.6 rule 2). */
  function namesInPlay(): NameInPlay[] {
    const defs = definitions();
    const out: NameInPlay[] = [];
    for (const solid of solids()) {
      for (const step of solid.tree.steps) {
        if (!step.name) continue;
        const def = defs.find((d) => d.name === step.name && d.solidId === solid.id);
        out.push({
          name: step.name,
          solidId: solid.id,
          stepId: step.id,
          op: step.op,
          ...(step.material?.colour ? { colour: step.material.colour } : {}),
          ...(def ? { basedOn: def.basedOn, definition: true } : {}),
        });
      }
      // The artifact's own name is in play even when no step carries it.
      if (solid.named === 'human' && !out.some((n) => n.name === solid.name && n.solidId === solid.id)) {
        const root = rootOf(solid.tree);
        if (root) out.push({ name: solid.name, solidId: solid.id, stepId: root.id, op: root.op });
      }
    }
    return out;
  }

  /**
   * How much of the drawing a body actually contains, per plane (§4, re-run on
   * the proposal).
   *
   * The profiles a massing was made from are MEMBERS of the solid, so the form
   * rung never reads them as profiles OF it — a mark a solid was made from is
   * its provenance. So this asks the question directly: for every stroke the
   * massing references, the diff between that ink and this body's silhouette
   * on that stroke's own plane.
   */
  /**
   * Cached per log version, like the diff — and for the same reason, only more
   * so: the panel asks for this on every hover and every report, and it is
   * three offscreen renders and three rasterisations. Uncached, a board with a
   * massing on it spent whole seconds a frame re-measuring a body nobody had
   * touched.
   */
  const honoursCache = new Map<string, Honours | null>();

  function honoursOf(solidId: string): Honours | null {
    const key = `${version}|${solidId}`;
    if (honoursCache.has(key)) return honoursCache.get(key) ?? null;
    if (honoursCache.size > 32) honoursCache.clear();
    const out = measureHonours(solidId);
    honoursCache.set(key, out);
    return out;
  }

  function measureHonours(solidId: string): Honours | null {
    const solid = solidOf(solidId);
    if (!solid || !space) return null;
    const massing = solid.tree.steps.find((st) => st.op === 'massing' && !st.on) as MassingStep | undefined;
    const ids = massing ? massing.from : solid.tree.steps[0]?.from ?? [];
    const per: Honours['per'] = [];
    for (const id of ids) {
      const mark = markOf(id);
      const ink = inkFor(id);
      if (!mark || !ink) continue;
      // An extent is a line, and a line has no area to honour. A tree with no
      // massing in it references the extent that said how tall as well as the
      // profile that said what shape; rasterising a line reports a coverage
      // about the rasteriser rather than about the drawing.
      if (!fingerprintOf(mark.node)?.isClosed) continue;
      const sil = space.silhouetteOn(solid.id, mark.plane);
      if (!sil) continue;
      const diff = diffProfile({
        ink: ink.points,
        from: ink.from,
        inkWhy: ink.why,
        silhouetteMask: { mask: sil.mask, grid: sil.grid },
        view: viewNameOf(mark.plane.name),
      });
      per.push({ view: diff.view, markId: id, coverage: diff.coverage });
    }
    if (!per.length) return null;
    return {
      overall: per.reduce((n, p) => n + p.coverage, 0) / per.length,
      per,
      sentence: honoursSentence(per),
    };
  }

  function dropSteps(solidId: string, stepIds: string[], why: string, at = Date.now()) {
    const solid = solidOf(solidId);
    if (!solid || !stepIds.length) return null;
    const next = withoutSteps(solid.tree, new Set(stepIds));
    if (next.steps.length === solid.tree.steps.length) return null;
    newVersion(solid.id, next, why, at);
    return next;
  }

  function paintSteps(solidId: string, stepIds: string[], colour: string, why: string, at = Date.now()) {
    const solid = solidOf(solidId);
    const word = colour.trim().toLowerCase();
    if (!solid || !stepIds.length || !(word in COLOUR_WORDS)) return null;
    const want = new Set(stepIds);
    const next: OpTree = {
      ...solid.tree,
      steps: solid.tree.steps.map((st) => (want.has(st.id) ? { ...st, material: { colour: word } } : st)),
    };
    newVersion(solid.id, next, why, at);
    return next;
  }

  /**
   * A way of saying a verb, taught once (§2.6 rule 4).
   *
   * It hangs on the solid it was said about when there is one, and on a node of
   * its own when there is not — either way it is a `propose` in the log, so it
   * replays with the session and one undo takes it back. The hand's way of
   * saying things is learned by the log, never by the weights.
   */
  function teachSaying(saying: Saying, at = Date.now()) {
    const host = solids()[0]?.id ?? marks()[0]?.id ?? null;
    if (!host) return;
    session.propose({
      participantId: LOCAL_PARTICIPANT,
      nodeId: host,
      edges: [],
      reps: [{ modality: SAYING_REP, data: { ...saying }, confidence: 1, }],
      at,
    });
  }

  function sayings(): Saying[] {
    const out: Saying[] = [];
    for (const node of session.getState().nodes.values()) {
      for (const rep of node.reps) {
        if (rep.modality !== SAYING_REP) continue;
        const d = rep.data as Saying | undefined;
        if (d?.phrase && d.verb) out.push(d);
      }
    }
    return out;
  }

  /** The board as the brief needs it: the planes, what lies on each, the names. */
  function scene(words: string, opts: { mutable?: string[] } = {}): SpaceScene {
    const all = marks();
    const byPlane = new Map<string, BriefPlane>();
    const roles = forms();
    for (const m of all) {
      const key = m.plane.name ?? m.plane.source;
      const held =
        byPlane.get(key) ??
        { name: key, view: viewNameOf(m.plane.name), normal: m.plane.normal, marks: [] };
      const form = roles.find((f) => f.id === m.id);
      const taken = solidFor(m.id);
      held.marks.push({
        id: m.id,
        shape: m.readings[0]?.label ?? '',
        confidence: m.readings[0]?.weight ?? 0,
        plays: form?.role ?? 'unread',
        rule: form?.rule ?? 0,
        points: m.points,
        ...(taken ? { taken: taken.id } : {}),
      });
      byPlane.set(key, held);
    }
    const diffs: NonNullable<SpaceScene['diffs']> = [];
    for (const solid of solids()) {
      for (const p of profilesOf(solid.id)) {
        const d = diffFor(p.markId);
        if (d) diffs.push({ markId: p.markId, view: d.view, sentence: d.sentence });
      }
    }
    const mutable = opts.mutable?.length
      ? solids()
          .flatMap((sd) => sd.tree.steps)
          .filter((st) => opts.mutable!.includes(st.id))
          .map((st) => ({ stepId: st.id, ...(st.name ? { name: st.name } : {}) }))
      : undefined;
    return {
      solids: solids().map((sd) => {
        const node = session.getState().nodes.get(sd.id);
        const honours = honoursOf(sd.id);
        return {
          id: sd.id,
          name: sd.name,
          named: sd.named,
          tree: sd.tree,
          versions: node ? node.reps.filter((r) => r.modality === 'code').map((r) => r.source ?? 'unknown') : [],
          ...(honours ? { honours } : {}),
        };
      }),
      planes: [...byPlane.values()],
      ...(diffs.length ? { diffs } : {}),
      names: namesInPlay(),
      definitions: definitions().map((d) => ({
        name: d.name,
        ...(d.basedOn ? { basedOn: d.basedOn } : {}),
        ops: d.steps.map((st) => st.op),
        steps: d.steps.length,
        profiles: d.profiles.length,
        ...(d.whole ? { whole: true } : {}),
      })),
      words,
      ...(mutable?.length ? { mutable } : {}),
    };
  }

  let solidCache: { version: number; solids: Solid[] } | null = null;

  function solids(): Solid[] {
    if (solidCache && solidCache.version === version) return solidCache.solids;
    const s = session.getState();
    const out: Solid[] = [];
    for (const id of s.artifacts) {
      const node = s.nodes.get(id);
      if (!node) continue;
      const code = [...node.reps].reverse().find((r) => r.modality === 'code')?.data as { code?: string } | undefined;
      const tree = parseOpTree(code?.code);
      if (!tree) continue; // some other artifact — not one of the shard's trees
      const given = [...node.reps].reverse().find((r) => r.modality === 'name')?.data as { text?: string } | undefined;
      out.push({
        id,
        name: given?.text ?? wordOf(node) ?? id,
        named: given ? 'human' : 'engine',
        tree,
        memberIds: node.edges.filter((e) => e.rel === 'has-part').map((e) => e.to),
      });
    }
    solidCache = { version, solids: out };
    return out;
  }

  const solidOf = (id: string): Solid | null => solids().find((s) => s.id === id) ?? null;
  const solidFor = (markId: string): Solid | null => solids().find((s) => s.memberIds.includes(markId)) ?? null;

  /**
   * The hand's own name for a solid, held as a `name` rep proposed in the
   * hand's name.
   *
   * The engine has no rename: `bless` takes a name once and `wordOf` reads the
   * FIRST word rep, so a second word would never be seen. The shard therefore
   * keeps the hand's name in its own modality and reads the newest one — see
   * "what core would need" in the README.
   *
   * The data is an OBJECT and not the bare string on purpose: `propose()`
   * composes a rep's `reasoning` into its `data` with a spread, which turns a
   * string rep into a map of its own characters. Also in the README.
   */
  function name(id: string, text: string, at = Date.now()) {
    session.propose({
      participantId: LOCAL_PARTICIPANT,
      nodeId: id,
      edges: [],
      reps: [{ modality: 'name', data: { text, why: 'the hand typed it in the field' }, confidence: 1 }],
      at,
    });
  }

  /** Erasing an artifact demotes it and its members return to the content plane as loose ink. */
  function remove(id: string, at = Date.now()) {
    session.erase(id, at);
  }

  return {
    session,
    sees: (s) => { space = s; formCache = null; diffCache.clear(); honoursCache.clear(); matchCache.clear(); },
    add,
    flip,
    whyNotFlip,
    marks,
    markOf,
    undo,
    clear,
    offerFor,
    inkFor,
    mathsOf,
    formMarks,
    forms,
    formOf,
    makeable,
    make,
    features,
    featureFor,
    cut,
    boss,
    mirror,
    dup,
    scratchOf,
    scratch,
    profilesOf,
    diffFor,
    matchable,
    match,
    solids,
    solidOf,
    solidFor,
    name,
    remove,
    massable,
    mass,
    growable,
    growMassing,
    joinAgent,
    applyProposal,
    replaceSteps,
    versionOf,
    take,
    definitions,
    definitionMatches,
    correct,
    place,
    whyNotPlace,
    namesInPlay,
    honoursOf,
    dropSteps,
    paintSteps,
    teachSaying,
    sayings,
    scene,
    subscribe(fn) {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
  };
}

/**
 * The engine's own word for what tier 1 just made. Not a name anyone gave it:
 * the engine never learns what a thing is called (§2.6), it only says what it
 * built. The hand's name goes on through the field's `name:`.
 */
export function engineWord(step: OpStep): string {
  if (step.op === 'extrude') {
    const s = step.profile.shape;
    return s === 'rectangle' ? 'box' : s === 'circle' ? 'cylinder' : s === 'triangle' ? 'wedge' : 'extrusion';
  }
  if (step.op === 'revolve') return 'revolve';
  return step.op;
}

/** The mark's size in plane units, from the fingerprint the engine measured. */
export function sizeOf(mark: Mark): number {
  return fingerprintOf(mark.node)?.size ?? 0;
}

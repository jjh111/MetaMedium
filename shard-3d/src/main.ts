// ===== main =====
// The boot: the space, the gizmo, the ink, the panel, and the one test hook.
//
// Everything visible is derived from the log (invariant 4). The only state
// held here is what the HAND holds — which tile is chosen, how far it is slid,
// which mark the pointer is over — and the gizmo's own pointer handling, which
// must claim a tap before the pen sees it.

// The visual system, one home — the tokens first, then the shard's own rules
// on top of them. Imported rather than linked because brand/ lies outside
// this Vite root, and because the order matters.
import '../../brand/tokens.css';
import './shard.css';

import * as THREE from 'three';
import {
  complete,
  DEFAULT_SESSION_CONFIG,
  ENGINE_PARTICIPANT,
  getRep,
  LocalHub,
  LOCAL_PARTICIPANT,
  type Point,
} from 'metamedium-core';
import { createSpace } from './scene';
import { createGizmo } from './gizmo';
import { createInk } from './ink';
import { createLog, type Mark } from './log';
import { createPanel, createPanelToggle, pinnedViews } from './panel';
import { createSolids } from './solid';
import { createSelection, type Sel } from './selection';
import { createField, readField, type FieldContext, type KnownName, type VerbOffer } from './field';
import { SCRATCH_NEAR, type Makeable } from './form';
import { COLOUR_WORDS, describeStep } from './op';
import { createModels, HAND_SEAT } from './models';
import { joinRoom, otherHand, saidInRoom, type Room } from './room';
import { createWork } from './work';
import { describeSpace } from './brief';
import { meaningMessages, parseMeaning, propose, type Proposal } from './generator';
import { describePhrase, PHRASE_VERBS, type NameRef, type PhraseReading, type PhraseScope } from './verbs';
import { readColours, storedTheme, applyTheme, effectiveTheme, type ThemeName } from './theme';
import { pane, tile } from './ui';
import { createChips } from './chips';
import { placeCursor } from './cursor';
import { createNav } from './navgizmo';
import {
  axisPlaneFor,
  balls,
  boundsOf as boundsOfPoints,
  opposite,
  planeAfterLeavingAxisView,
  tooOblique,
  unionBounds,
  viewFacingPlane,
  viewForAxis,
  viewOfPose,
  type AxisView,
  type Bounds3,
} from './view';
import { describeMatch } from './library';
import {
  describePlane,
  height,
  planeForPenDown,
  rayPlane,
  toPlane,
  toWorld,
  normalize,
  sub,
  dot,
  v3,
  type PenState,
  type PlaneName,
  type Pose,
  type Vec3,
} from './plane';
import {
  chipTextFor,
  projectOnto,
  sizeOfPoints,
  type PenScope,
  type PlaneCandidate,
  type PreviousRef,
} from './planarity';

const host = document.getElementById('space')!;
const panelEl = document.getElementById('panel')!;
const fieldEl = document.getElementById('field')!;
const statusEl = document.getElementById('status')!;
const helpEl = document.getElementById('help')!;
const chipsEl = document.getElementById('chips')!;
const modelsEl = document.getElementById('models')!;
const navEl = document.getElementById('nav')!;

let theme: ThemeName = storedTheme();
applyTheme(theme);
let colours = readColours();

const space = createSpace(host, colours);
const log = createLog();
const gizmo = createGizmo(colours);
space.scene.add(gizmo.group);

// ---- the compass and the picker, coupled (16 September 2026) ---------------
// John: "in explicitly selected gizmo x, y, or z, treat that surface as
// selected automatically rather than needing the plane click; hide the plane
// click option when in a gizmo-clicked x, y, or z; only show the planes when
// in alt views." So an axis view chooses the plane it faces, and while it is
// doing the choosing the tiles are away. Two things have to be remembered for
// that to be reversible: what the HAND chose for itself, and whether the view
// is the one choosing now.
/** The plane the hand chose with a tile or a key — what comes back on leaving an axis view. */
let handChosen: PlaneName | null = gizmo.chosen;
/** True while the camera's own axis view holds the choice; the picker's tiles are then hidden. */
let viewChoosing = false;
const chips = createChips(chipsEl, space.project);
const panel = createPanel(panelEl, statusEl, log, {
  broken: (id) => solids.brokenOf(id),
  // P4: *matches the drawing* — every plane a profile of this solid was drawn
  // on, with the diff on it, and a region outlined where it lies on hover.
  diffs: (solidId) =>
    log
      .profilesOf(solidId)
      .map((profile) => {
        const diff = log.diffFor(profile.markId);
        return diff ? { profile, diff } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
  onRegion: (at) => selection.showRegion(at),
  // P5: how much of the drawing the body actually contains, whose version
  // stands, and what the library holds.
  honours: (id) => log.honoursOf(id),
  // UI-2: the panel says WHO made a version from typed provenance, never from
  // the shape of a name. The participant ids are here, so the typing is here:
  // a seated model is tier 2, the engine participant is tier 1, and the local
  // participant is the hand's own act.
  version: (id) => {
    const v = log.versionOf(id);
    if (!v) return null;
    return { ...whoIs(v.by), taken: v.taken };
  },
  // …and a definition carries the ancestry of the version it was taken out of,
  // so a placement can say whose work it is reusing without claiming that work
  // as its own.
  definitions: () =>
    log.definitions().map((d) => {
      const v = log.versionOf(d.solidId);
      return { name: d.name, basedOn: d.basedOn, why: d.why, ...(v ? whoIs(v.by) : {}) };
    }),
  // UI-2: who drew a mark. A model's profile comes in through the same door.
  author: (markId) => {
    const mark = log.markOf(markId);
    const rep = mark ? getRep(mark.node, 'stroke') : undefined;
    return rep ? whoIs(rep.source ?? LOCAL_PARTICIPANT) : null;
  },
  // UI-2: what the next deliberate act would do — the field's leading offer,
  // said in words in the panel.
  //
  // **Undo is never the next move.** It is the way back, and it is the only
  // verb always enabled, so on a board holding one profile it was the leading
  // pill and the panel dutifully said *↵ Undo* to a hand that had just drawn
  // its first mark. When nothing else is afforded the leading BLOCKED offer is
  // the honest answer, because its reason is the instruction: *nothing to grow
  // along yet — draw a line from this profile's edge, off its plane*.
  next: () => {
    const offers = verbOffers();
    const first =
      offers.find((v) => v.enabled && v.verb !== 'undo') ??
      offers.find((v) => !v.enabled) ??
      offers.find((v) => v.enabled);
    return first
      ? { label: first.label, why: first.why, enabled: first.enabled, ...(first.verb === 'regen' ? { asks: true } : {}) }
      : null;
  },
  // P6: what the library says this outline could be — under the shape
  // readings, in the engine's name, plural and ranked.
  matches: (markId) => log.definitionMatches(markId),
});

/**
 * UI-2: a participant id, TYPED — the one place the shard decides which of the
 * three kinds of author made something.
 *
 * `engine` is tier 1 and no model was asked. `hand` is the human's own act.
 * Everything else in this space is a model seat: the shard has no second hand,
 * so an id that is neither of the two knowns is a model that has since left
 * its seat, and calling it the hand's would credit the human with a proposal.
 */
function whoIs(id: string): { by: string; origin: 'engine' | 'model' | 'hand' } {
  const seat = models.seats().find((m) => m.id === id);
  if (seat) return { by: seat.name, origin: 'model' };
  if (id === ENGINE_PARTICIPANT) return { by: 'the engine', origin: 'engine' };
  if (id === LOCAL_PARTICIPANT) return { by: 'you', origin: 'hand' };
  return { by: id, origin: 'model' };
}

/** What the gizmo holds when the pen goes down. The candidates are the pen's. */
const pen = (): PenState => ({ chosen: gizmo.chosen, why: gizmo.chosenWhy, offset: gizmo.offset });

/**
 * **The cursor** — where the hand is working, as one world point, and where
 * the VIEW plane passes through (16 September 2026; SHARD-3D-PLAN §3,
 * `cursor.ts`).
 *
 * John, with two Blender screenshots: *"The mapping of drawing in non-standard
 * axes should behave like Blender does."* Blender's answer is its 3D cursor:
 * annotation placed on it lands on the plane through the cursor facing the
 * camera at that moment. So the shard has one too, and it is the plane
 * picker's own origin — the thing that already stood at the world origin and
 * could slide.
 *
 * What it replaces is a heuristic: the view plane used to sit at the depth of
 * the thing under the pen, else the last thing touched, else the origin. Three
 * rules, none of them the hand's, and the plane moved under it on every
 * stroke. One point the hand can put and can see is the whole of it.
 *
 * Runtime, not the log — a camera-side thing, like the pose. The picker's
 * origin was never a log event either, so this follows what was there.
 */
let cursor: Vec3 = v3(0, 0, 0);
/** How the cursor came to be there, for the panel and the status line. */
let cursorWhy = 'the world origin — shift + click to put it somewhere';

/**
 * Shift + click, as Blender has it: the cursor goes to the surface under the
 * pointer, else to the foundation plane under it. The picker moves with it,
 * and the status says so once.
 */
function putCursor(screen: Point) {
  const face = solids.facesAt(screen)[0];
  const got = placeCursor({
    surface: face ? face.at : null,
    ray: space.rayFor(screen),
    ...(face ? { what: face.solidId } : {}),
  });
  if (!got) {
    panel.say('nothing under the pointer to put the cursor on');
    return;
  }
  cursor = got.at;
  cursorWhy = got.why;
  gizmo.setOrigin(cursor);
  panel.say(`cursor placed · ${got.why}`);
  space.render();
  report();
}

/** The stroke drawn a moment ago, as the `previous` candidate needs it. */
function previousRef(): PreviousRef | null {
  const marks = log.marks();
  const last = marks[marks.length - 1];
  if (!last) return null;
  return {
    plane: last.plane,
    at: last.node.createdAt,
    points: last.points,
    size: Math.max(sizeOfPoints(last.points), 1e-6),
  };
}

/**
 * Everything the scorer may read where the pen came down. The surface owns the
 * solids and the log, so it gathers the evidence; `planarity.ts` does the
 * reading and knows nothing about three.js or the DOM.
 */
function scopeAt(screen: Point): PenScope {
  const faces = solids.facesAt(screen);
  // What the pen came down ON, as a world point: a face it met, or the point
  // where its ray crosses the plane of the ink it landed on. Not the mark's
  // centre — the pen touched a place, and that place is what the world planes
  // and the view plane stand through.
  const overMark = ink.pick(screen);
  const markPlane = overMark ? log.markOf(overMark)?.plane : null;
  const onInk = markPlane ? rayPlane(space.rayFor(screen), markPlane) : null;
  const touched = faces[0]?.at ?? onInk ?? null;
  return {
    chosen: gizmo.plane(),
    pen: screen,
    ray: space.rayFor,
    look: space.look(),
    cameraUp: space.up(),
    faces,
    previous: previousRef(),
    // Nothing is chosen here by definition, so there is no slide to honour —
    // but there IS a place the hand is working. A world plane standing where
    // the pen came down is a plane the stroke can lie on; one standing at the
    // world origin is a plane with nothing to do with it.
    worldOrigins: touched
      ? { foundation: touched, height: touched, width: touched, where: `through the point the pen came down on${faces[0] ? ` (${faces[0].solidId})` : overMark ? ` (${overMark})` : ''}` }
      : {},
    // THE VIEW PLANE PASSES THROUGH THE CURSOR, screen-facing, always
    // (Blender's 3D Cursor placement). Not the depth of the thing under the
    // pen and not the last thing touched: those moved the plane under the
    // hand, stroke by stroke, and gave it no way to say where it wanted it.
    // A face under the pen that passes the facing gate still wins outright —
    // that is Blender's *Surface* placement, and P2/P3 need it.
    viewAnchor: cursor,
    viewAnchorWhy: `through the cursor (${cursorWhy})`,
    at: Date.now(),
    recentWindowMs: DEFAULT_SESSION_CONFIG.recentWindowMs,
  };
}

/** A path's own box, in whatever units the path is in. */
function inkBounds(points: Point[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

/** A mark's centre in world space — where a chip stands, and how deep it is. */
function centreWorld(id: string): Vec3 | null {
  const m = log.markOf(id);
  if (!m) return null;
  const b = inkBounds(m.points);
  return toWorld(m.plane, { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 });
}

// ---- the gizmo claims a tap before the pen sees it -------------------------
// A tile is a choice, not a mark. Sliding is a drag on the handle, not ink.
let sliding: { start: Point; base: number } | null = null;

function gizmoAt(screen: Point): ReturnType<typeof gizmo.hit> {
  const rect = space.canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((screen.x - rect.left) / rect.width) * 2 - 1,
    -((screen.y - rect.top) / rect.height) * 2 + 1
  );
  const caster = new THREE.Raycaster();
  caster.setFromCamera(ndc, space.camera);
  const hits = caster.intersectObjects(gizmo.pickables(), false);
  return hits.length ? gizmo.hit(hits[0].object) : null;
}

function claimed(e: PointerEvent): boolean {
  if (e.button !== 0) return false;
  const screen = { x: e.clientX, y: e.clientY };
  // Shift + click places the CURSOR — Blender's own gesture, and it is not a
  // mark, so the pen must not see it. `home` and framing are untouched: where
  // the camera looks and where the hand works are different questions.
  if (e.shiftKey) {
    putCursor(screen);
    return true;
  }
  const hit = gizmoAt(screen);
  if (!hit) return false;
  if (hit.kind === 'tile') choose(hit.name);
  else if (hit.kind === 'centre') choose(null);
  else if (hit.kind === 'handle') {
    sliding = { start: screen, base: gizmo.offset };
    try { space.canvas.setPointerCapture(e.pointerId); } catch { /* not a live pointer */ }
  }
  return true;
}

// The slide: the drag's travel along the plane's normal, in world units,
// measured where the handle is rather than as a made-up pixels-per-unit.
space.canvas.addEventListener('pointermove', (e) => {
  if (!sliding) return;
  const plane = gizmo.plane();
  if (!plane) return;
  const n = normalize(plane.normal);
  // A ray through the pointer, met against the plane that contains the normal
  // and most faces the camera: the component along the normal is the slide.
  const axisPlane = { ...plane, normal: pickSlideNormal(n), why: 'slide' };
  const at = rayPlane(space.rayFor({ x: e.clientX, y: e.clientY }), axisPlane);
  const from = rayPlane(space.rayFor(sliding.start), axisPlane);
  if (!at || !from) return;
  gizmo.setOffset(clamp(sliding.base + dot(sub(at, from), n), -6, 6));
  space.render();
  report();
});

function pickSlideNormal(n: { x: number; y: number; z: number }) {
  // Any direction perpendicular to the slide axis and roughly facing the eye.
  const look = space.look();
  const side = normalize({ x: n.y * look.z - n.z * look.y, y: n.z * look.x - n.x * look.z, z: n.x * look.y - n.y * look.x });
  return normalize({ x: side.y * n.z - side.z * n.y, y: side.z * n.x - side.x * n.z, z: side.x * n.y - side.y * n.x });
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

space.canvas.addEventListener('pointerup', () => { sliding = null; });
space.canvas.addEventListener('pointercancel', () => { sliding = null; });

// ---- ink -------------------------------------------------------------------
/** Where the pen last went down — what a tap that drew nothing was aimed at. */
let lastPointer: Point = { x: 0, y: 0 };
space.canvas.addEventListener('pointerdown', (e) => { lastPointer = { x: e.clientX, y: e.clientY }; }, true);

const ink = createInk({
  space,
  log,
  colours,
  pen,
  scope: scopeAt,
  claimed,
  onStroke: (id) => {
    // A TAP is not a stroke: it selects what it landed on, or lets go. A
    // stroke is always ink — ink over a thing addresses the thing, and a
    // stroke that selected instead of drawing would be a mode.
    if (!id) {
      const hit = solids.pick(lastPointer);
      selection.set(hit ? { kind: 'solid', id: hit } : null);
      if (hit) {
        const s = log.solidOf(hit);
        if (s) panel.say(`${s.name} · ${s.tree.steps.map((st) => st.op).join(' · ')} · tier 1`);
      }
      panel.show(panel.subject(), selection.current());
      return report();
    }
    const mark = log.markOf(id);
    // The next stroke clears the standing offer, the way the canvas's snap
    // offer gives way: one offer at a time, about the mark just made.
    chips.clear();
    if (mark) offerRunnerUp(mark);
    // P6: the profile drawn again. What the library says this outline could be
    // stands beside it as a chip — one tap places the definition here, scaled
    // to fit (§2.6 rule 3). Tier 1: no model is asked and nothing waits.
    offerLibrary(id);
    // THE GESTURE LAYER (row 1). A stroke that crosses a solid's silhouette
    // three times is a scratch: the solid comes off the board, its ink stays
    // — ink is provenance — and one undo puts it back. Read before tier 1,
    // because a scratch is not a thing to make.
    const scratched = gesture(id);
    if (scratched === 'erased') {
      selection.set(null);
      panel.show(id, null);
      return report();
    }
    // TIER 1 FIRST (invariant 7). The moment the form rung reads a profile
    // with an extent — or with an axis — the solid stands: no field, no
    // pill, no wait, and no model. The status says the canvas answered.
    const made = tier1(id);
    // SELECTION BY DEFAULT (§7): a feature drawn on a face selects the SOLID
    // it is on, so *Cut a hole* and *Raise a boss* stand in the field with no
    // loop drawn and nothing tapped.
    const feature = log.features().find((f) => f.featureId === id);
    // P4: a closed mark whose outline overlaps a solid's silhouette on its own
    // plane is a PROFILE OF that solid, not the start of a new one — and what
    // it affords is the diff, said at once and in full.
    const against = log.formOf(id)?.against ?? null;
    if (!made && against && scratched !== 'near') {
      const diff = log.diffFor(id);
      panel.say(
        diff
          ? `the ${against.view} profile of ${against.name} · ${diff.sentence} · tier 1`
          : `the ${against.view} profile of ${against.name} — ${against.why}`
      );
    } else if (!made && mark && scratched !== 'near') {
      const top = mark.readings[0];
      const form = log.formOf(id);
      const read = mark.candidates?.[0];
      panel.say(
        (top
          ? `${top.label} ${(top.weight || 0).toFixed(2)} ${whereOn(mark.plane.name)}`
          : `a mark ${whereOn(mark.plane.name)} — the shape rung placed nothing`) +
          // A read plane says which way it decided and how sure it is; a
          // chosen one has nothing to report, because the hand decided.
          (read ? ` · ${mark.plane.source} ${read.confidence.toFixed(2)}` : '') +
          // The view plane, and where it stood. It used to say *view ·
          // pinned* — this ink only means anything from here — and that is no
          // longer true: a view stroke is world geometry, drawn the same from
          // every angle. What is worth saying is where the plane passed
          // through, because that is the thing the hand can move.
          (mark.plane.source === 'view' ? ' · view · through the cursor' : '') +
          (form ? ` · plays ${form.role}` : '')
      );
    }
    // Selection by default (§7): the solid just made, the solid a feature was
    // drawn on, or else the mark just drawn.
    selection.set(
      made
        ? { kind: 'solid', id: made.id }
        : against
          ? { kind: 'solid', id: against.solidId }
          : feature
            ? { kind: 'solid', id: feature.solidId }
            : { kind: 'mark', id }
    );
    panel.show(id, selection.current());
    report();
  },
  onHover: (id) => {
    ink.highlight(id);
    panel.show(id ?? lastStroke(), selection.current());
  },
});

const solids = createSolids({ space, log, colours });

/**
 * What the log has to ask the SPACE for: the solids' silhouettes in the view a
 * stroke was drawn in (row 1's crossings) and how far a body reaches along a
 * direction (what a cut goes THROUGH). Installed here because the surface owns
 * the camera and the meshes; the log owns neither, and asks.
 */
log.sees({
  silhouettes: (pose) =>
    log
      .solids()
      .map((s) => {
        const outline = solids.silhouetteOf(s.id, pose);
        return outline ? { solidId: s.id, name: s.name, outline } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
  spanAlong: (id, direction) => solids.spanAlong(id, direction),
  // P4: the solid rendered flat on a plane, orthographically along its normal —
  // what the diff is run against, and what tells a profile OF a solid from the
  // start of a new one.
  silhouetteOn: (id, plane) => solids.silhouetteOn(id, plane),
});

// A derivation that did not come off says so where it happened, once.
solids.onBroken((id, why) => panel.say(`${log.solidOf(id)?.name ?? id} — ${why}`));

const selection = createSelection(space, solids, colours);
const field = createField(fieldEl, () => renderField());

// ---- the camera's own compass ----------------------------------------------
// Every way of moving the camera in one corner: the compass, *home*, the
// projection, and the pinned views (which is why they left the panel). The
// plane picker at the origin is untouched — that is where a plane is CHOSEN,
// and this is where the EYE goes.

/** Everything on the board, in world space — what *home* frames. */
function boardBounds(): Bounds3 | null {
  let b: Bounds3 | null = null;
  for (const m of log.marks()) b = unionBounds(b, boundsOfPoints(m.points.map((p) => toWorld(m.plane, p))));
  const box = new THREE.Box3().setFromObject(solids.group);
  if (!box.isEmpty()) {
    b = unionBounds(b, { min: v3(box.min.x, box.min.y, box.min.z), max: v3(box.max.x, box.max.y, box.max.z) });
  }
  return b;
}

/**
 * What a camera move turns or travels AROUND.
 *
 * An ORBIT turns about the **selection** when there is one — you are working
 * on that thing — and otherwise about **nothing**, which the scene reads as
 * the target: the centre the hand last panned to. Either way the turn is
 * rigid, so a view panned off-centre stays where it was put.
 *
 * What is gone: the old fallback that orbited about whatever the pointer
 * happened to be over. It made the centre of the turn a different point on
 * every drag, and with the rigid rule it would drift the view off the place
 * the hand had panned to for no act the hand performed. A selection is asked
 * for; a pixel under the cursor is not.
 *
 * A DOLLY still asks the same question and gets a different answer on purpose:
 * it goes toward whatever is under the pointer, selected or not, because there
 * you are pointing at where you want to be rather than at what you are working
 * on. That is why the function is told *why* it is being asked.
 */
space.setPivot((screen, why) => {
  const sel = selection.current();
  if (sel && why === 'orbit') {
    if (sel.kind === 'solid') {
      const box = solids.boundsOf(sel.id);
      if (box) {
        const c = box.getCenter(new THREE.Vector3());
        return v3(c.x, c.y, c.z);
      }
    } else {
      const at = centreWorld(sel.id);
      if (at) return at;
    }
  }
  if (why === 'orbit') return null;
  const rect = space.canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((screen.x - rect.left) / rect.width) * 2 - 1,
    -((screen.y - rect.top) / rect.height) * 2 + 1
  );
  const caster = new THREE.Raycaster();
  caster.setFromCamera(ndc, space.camera);
  const hit = caster.intersectObject(solids.group, true)[0];
  if (hit) return v3(hit.point.x, hit.point.y, hit.point.z);
  const overInk = ink.pick(screen);
  return overInk ? centreWorld(overInk) : null;
});

const nav = createNav({
  host: navEl,
  space,
  colours,
  chosen: () => gizmo.chosen,
  bounds: boardBounds,
  pinned: () => pinnedViews(log),
  say: (sentence) => panel.say(sentence),
  // The axis view IS the choice. It goes through the same `choose` a tile
  // reaches, so every downstream rule — the profile and its extent, the
  // edge-on gate, the picker's slide — is looking at the plane it always was.
  enterAxisView: (view, plane) => {
    viewChoosing = true;
    choose(plane, 'view', `the ${view} view faces it — the camera chose the plane`);
  },
  leaveAxisView: () => {
    viewChoosing = false;
    choose(planeAfterLeavingAxisView(handChosen), 'view');
  },
});

// ---- P5: the generator seat ------------------------------------------------
// A model is SURFACE-side (the canvas's `agents[]`), and it joins the session
// so that everything it proposes is attributed to it. Nothing here is called on
// draw, on select or on join: `propose` is reached only from Enter on a brief
// and from a regen (invariant 6).
// ---- the room (G5) ---------------------------------------------------------
// A second hand on this board is a second log arriving live (`room.ts`). The
// shard's log IS a core session, so this is transport and nothing else: no
// event type is new, and a shard-specific rep — the plane held on a stroke,
// the op tree's `json` code — merges because it rides inside an event the
// engine already carries.
let room: Room | null = null;
const LIVE = new URLSearchParams(location.search);
/** How many sentences from other hands have already been said out loud here. */
let saidSeen = 0;

/**
 * What another hand said, in the status line as it lands. The shard draws no
 * card for an explanation, so this is where `space_say` shows: one sentence,
 * attributed, and the log holds it whether or not anyone was looking.
 */
function sayWhatLanded() {
  const said = saidInRoom(log.session);
  if (said.length > saidSeen && said.length) {
    const newest = said[said.length - 1];
    panel.say(`${newest.by}: ${newest.text}`);
  }
  saidSeen = said.length;
}

/** Join the room named in the URL, or the default one, once. */
async function enterRoom(name?: string): Promise<Room | null> {
  if (room) return room;
  const relay = LIVE.get('relay') || 'http://127.0.0.1:8020';
  const which = name || LIVE.get('live') || 'shard';
  try {
    room = joinRoom({
      session: log.session,
      room: which,
      relay,
      name: 'john',
      onMerge: () => {
        // Another hand's events are events: everything derived re-derives.
        ink.sync();
        solids.sync();
        sayWhatLanded();
        report();
      },
      onWaiting: () => report(),
    });
  } catch (err) {
    panel.say(`the room could not be joined — ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
  panel.say(`in room “${which}” as ${room.label} · relay ${relay} — another hand's ink arrives in its own colour`);
  report();
  return room;
}

const models = createModels({
  host: modelsEl,
  join: (name, locality) => log.joinAgent(name, locality),
  say: (sentence) => panel.say(sentence),
  // A parked brief stands beside what it is about; `runBrief` has already made
  // sure something is selected before a seat is asked at all.
  subject: () => {
    const solid = selectedSolid();
    if (solid) return [solid.id];
    const sel = selection.current();
    return sel ? [sel.id] : [];
  },
  room: () => room,
  enterRoom: () => enterRoom(),
});
models.onChange(() => report());

// A model at work, drawn above the solid it is about and said in the status
// line. Esc with nothing held stops every call in flight.
const work = createWork(chipsEl, space.project, () => {
  const sentence = work.sentence();
  if (sentence) panel.say(sentence);
  report();
});

selection.onChange(() => {
  panel.show(panel.subject() ?? lastStroke(), selection.current());
  renderField();
});

// ---- the runner-up, and the flip -------------------------------------------

/**
 * *top of artifact:7 0.82 · view 0.41* — the second reading, standing beside
 * the mark, one tap from being taken (§2.1: the runner-up a tap away).
 *
 * Only when there IS a second worth arguing about: a runner-up under the floor
 * is not a close call, and a chip on every mark would be wallpaper.
 */
function offerRunnerUp(mark: Mark) {
  const text = mark.candidates ? chipTextFor(mark.candidates) : null;
  const at = centreWorld(mark.id);
  const next = mark.candidates?.[1];
  if (!text || !at || !next) return;
  const blocked = log.whyNotFlip(mark.id);
  chips.show({
    id: mark.id,
    at,
    text,
    why: blocked
      ? `${next.reasoning} — but ${blocked}`
      : `tap to read this ink on ${next.label} instead: ${next.reasoning}`,
    onTap: () => flipPlane(mark.id),
  });
}

/**
 * *mug 0.82* — what the LIBRARY says this outline could be, standing beside
 * the mark it is about, one tap from being placed (§2.6 rule 3: *drawn later,
 * its profile is offered by its signature*).
 *
 * Only the top one gets a chip: the whole ranked reading is in the panel and
 * in the field's pills, and a stack of chips beside one mark would be the
 * wallpaper the runner-up chip was written to avoid.
 */
function offerLibrary(markId: string) {
  const matches = log.definitionMatches(markId);
  const top = matches[0];
  const at = centreWorld(markId);
  if (!top || !at) return;
  chips.show({
    id: `library:${markId}`,
    at,
    cls: 'libChip',
    text: describeMatch(top),
    why:
      `tap to place ${top.name} here, scaled so ${top.profile.markId} — the profile it was matched on — fits ` +
      `this outline: ${top.reasoning}. Tier 1; *Not a ${top.name}* in the field says it is not`,
    onTap: () => placeHere(top.name, markId),
  });
}

/** One tap: the definition stands where the outline was drawn. */
function placeHere(name: string, markId: string | null) {
  const why = log.whyNotPlace(name, markId);
  if (why) {
    panel.say(why);
    return null;
  }
  const made = log.place(name, markId);
  if (!made) {
    panel.say(`${name} could not be placed here`);
    return null;
  }
  chips.drop(`library:${markId}`);
  solids.sync();
  ink.sync();
  after(
    made.id,
    `${made.name} placed${markId ? ` where ${markId} was drawn` : ' at the world origin'} — ` +
      `${made.step.op === 'place' ? `${(made.step as { steps?: unknown[] }).steps?.length ?? 0} steps` : made.step.op}, ` +
      `scaled ×${made.scale.toFixed(2)} from ${made.from.markId} · tier 1`
  );
  return made;
}

/**
 * Take the runner-up: read the KEPT screen path onto the other candidate,
 * under the camera it was drawn with, and re-log the stroke there.
 *
 * One act — `log.flip` adds the flipped stroke and erases the first, in that
 * order, so one undo puts the first plane back and the ink never moves except
 * by this act. The camera may be anywhere now: the pose in the log is what the
 * re-projection is cast through, not where the eye happens to be.
 */
function flipPlane(id: string, which = 1): string | null {
  const mark = log.markOf(id);
  if (!mark) return null;
  const why = log.whyNotFlip(id);
  if (why) {
    panel.say(why);
    return null;
  }
  const to = mark.candidates?.[which];
  if (!to || !mark.screen || !mark.pose) {
    panel.say('there is no second reading of this mark to take');
    return null;
  }
  const pose = mark.pose;
  const ray = (p: Point) => space.rayForPose(pose, p);
  const points = projectOnto(to.plane, mark.screen, ray);
  if (!points) {
    panel.say(`${to.label} runs parallel to the eye it was drawn from — the ink cannot lie there`);
    return null;
  }
  const scale = scaleAtPose(to, mark.screen, ray);
  const next = log.flip(id, to, points, scale);
  if (!next) return null;
  chips.clear();
  ink.sync();
  const after = log.markOf(next);
  selection.set({ kind: 'mark', id: next });
  panel.show(next, selection.current());
  panel.say(`flipped to ${to.label} ${to.confidence.toFixed(2)} — undo puts it back on ${mark.plane.name ?? mark.plane.source}`);
  // The flip is a re-reading, so what the mark affords is re-read too: a line
  // that was flat on the ground and is now rising off a profile IS an extent,
  // and tier 1 stands the solid up as it would for any stroke.
  tier1(next);
  if (after) offerRunnerUp(after);
  report();
  return next;
}

/** The scale on a candidate, measured under the pose the stroke was drawn at. */
function scaleAtPose(c: PlaneCandidate, screen: Point[], ray: (p: Point) => ReturnType<typeof space.rayFor>): number {
  const mid = screen[Math.floor(screen.length / 2)] ?? screen[0];
  const at = rayPlane(ray(mid), c.plane);
  const dx = rayPlane(ray({ x: mid.x + 1, y: mid.y }), c.plane);
  const dy = rayPlane(ray({ x: mid.x, y: mid.y + 1 }), c.plane);
  if (!at || !dx || !dy) return 1;
  const a = toPlane(c.plane, at);
  const b = toPlane(c.plane, dx);
  const d = toPlane(c.plane, dy);
  const s = (Math.hypot(b.x - a.x, b.y - a.y) + Math.hypot(d.x - a.x, d.y - a.y)) / 2;
  return Number.isFinite(s) && s > 0 ? s : 1;
}

/**
 * The canvas answering first. One act, one event group, one undo — and the
 * status line says which tier answered, because "the canvas has this" beats a
 * spinner and the human should never have to wonder whether a model was asked.
 */
/**
 * The gesture layer, row 1: a scratch takes a solid off the board.
 *
 * Relational, not gestural — core's own rule (`session/erase.ts`), counted
 * against the solid's SILHOUETTE in the view the stroke was drawn in. Three
 * crossings erase it. **Its profile ink and its extent stay**, because ink is
 * provenance: the drawing that made the box is still the drawing that made the
 * box, and the box can stand again from it.
 *
 * One pass short, the board says so — *crossed it twice — one more pass erases
 * it* — exactly as the canvas does (`Demos/surface/07-input.js`), so the rule
 * is learned by doing rather than by reading.
 *
 * The scratch's own ink STAYS on the board and plays `gesture`. That is the
 * shard's difference from the canvas, and it is deliberate: nothing here is
 * thrown away because the canvas could read it, the panel can say what the
 * mark did, and it keeps the act at three events so one undo is one act.
 */
function gesture(strokeId: string): 'erased' | 'near' | null {
  const form = log.formOf(strokeId);
  if (form?.role !== 'gesture') {
    const near = log.scratchOf(strokeId);
    if (near && near.crossings === SCRATCH_NEAR) {
      // Said INSTEAD of the ordinary reading, not before it: a sentence the
      // next line overwrites is a sentence nobody read.
      panel.say(`crossed it twice — one more pass erases ${near.name}`);
      return 'near';
    }
    return null;
  }
  const done = log.scratch(strokeId, form);
  if (!done) return null;
  ink.sync();
  solids.sync();
  // Short here, the whole reasoning in the panel: one sentence, one place.
  panel.say(
    `${done.name} scratched out — ${done.crossings} crossings of its silhouette. ` +
    `Its ink is still here; undo brings it back`
  );
  return 'erased';
}

/**
 * What every VERSION act does afterwards: the solid it changed stands
 * selected, the sentence is said, and if the derivation did not come off the
 * sentence says so instead of the board quietly showing the old shape.
 */
function after(solidId: string, sentence: string) {
  selection.set({ kind: 'solid', id: solidId });
  const why = solids.brokenOf(solidId);
  panel.say(why ? `${sentence} — but ${why}` : sentence);
  panel.show(panel.subject() ?? lastStroke(), selection.current());
  report();
}

function tier1(strokeId: string): { id: string; name: string } | null {
  const partner = (m: Makeable) => (m.kind === 'extrude' ? m.extentId : m.axisId);
  const options = log.makeable().filter((m) => m.profileId === strokeId || partner(m) === strokeId);
  if (options.length) {
    const choice = options[0];
    const made = log.make(choice);
    if (made) {
      const shape = made.step.op === 'extrude' || made.step.op === 'revolve' ? made.step.profile.shape : 'profile';
      panel.say(`${made.name} from ${shape} + ${choice.kind === 'extrude' ? 'extent' : 'axis'} · tier 1`);
      return made;
    }
  }
  // P5, §2.6 rule 1: the drawing is the extent before it has a name. Profiles
  // on different world planes whose projections overlap ARE a solid, and tier 1
  // stands it up the moment the second one lands — no name, no model, no wait.
  const mass = log.massable();
  if (mass && mass.profileIds.includes(strokeId)) {
    const made = log.mass(mass);
    if (made) {
      panel.say(
        `massing from ${mass.profileIds.length} profiles · tier 1 — ` +
          `the drawing is the extent; type what it is and a model fills it`
      );
      return { id: made.id, name: made.name };
    }
  }
  // …and a further view goes INTO a massing that is still only a massing,
  // rather than standing beside it as a claim to check against (P4).
  const grow = log.growable();
  if (grow && grow.add.includes(strokeId)) {
    const grown = log.growMassing(grow);
    if (grown) {
      panel.say(
        `massing from ${grown.count} profiles · tier 1 — this view went into it, ` +
          `and every prism was re-derived through the others' span`
      );
      return { id: grown.id, name: log.solidOf(grown.id)?.name ?? 'massing' };
    }
  }
  return null;
}

// ---- P5: the brief, the regen, and what a phrase means ---------------------

/** The names in play, as the verb table needs them: one entry per distinct name. */
function nameRefs(): NameRef[] {
  const out = new Map<string, NameRef>();
  for (const n of log.namesInPlay()) {
    const held = out.get(n.name) ?? { name: n.name, stepIds: [], solidId: n.solidId };
    held.stepIds.push(n.stepId);
    out.set(n.name, held);
  }
  return [...out.values()];
}

function phraseScope(): PhraseScope {
  return {
    names: nameRefs(),
    colours: Object.keys(COLOUR_WORDS),
    taught: log.sayings().map((sy) => ({ phrase: sy.phrase, verb: sy.verb as PhraseScope['taught'] extends undefined ? never : 'regen' | 'drop' | 'paint', ...(sy.target ? { target: sy.target } : {}) })),
  };
}

/** Where a solid stands, for the work label and for the chips. */
function solidAt(solidId: string): Vec3 | null {
  const b = solids.boundsOf(solidId);
  if (!b || b.isEmpty()) return null;
  const c = b.getCenter(new THREE.Vector3());
  return v3(c.x, b.max.y, c.z);
}

/**
 * Enter on a brief. ONE deliberate act, and the only one on this surface that
 * asks a model at all.
 *
 * A failed brief leaves NOTHING: the version is written only when a proposal
 * comes back with something in it, so there is no bless to undo the way the
 * canvas has to — the massing was already standing in the engine's name before
 * the model was asked, and it is exactly what it was afterwards.
 */
async function runBrief(text: string, opts: { regen?: string[] } = {}) {
  const seat = models.first();
  const solid = selectedSolid();
  // P6: a brief may also be typed with an OUTLINE selected and nothing standing
  // — *another one like that* — because the answer may be `{"reuse": …}`, which
  // needs somewhere to put a definition rather than something to fill. A reply
  // that comes back as a tree with nothing to fill is refused below, in the one
  // place that knows which it was.
  const sel = selection.current();
  const atMark = sel?.kind === 'mark' ? sel.id : null;
  if (!seat) {
    models.open();
    panel.say('no model has joined — the pane is open; a brief needs one');
    return;
  }
  if (!solid && !atMark) {
    panel.say('nothing selected — draw profiles on two or three planes, and the massing is what a brief fills');
    return;
  }
  const key = `brief:${solid?.id ?? atMark}:${Date.now()}`;
  const label = `${seat.name} · ${opts.regen ? 'the regen' : 'the brief'}`;
  const signal = work.start(key, label, solid ? solidAt(solid.id) : null);
  panel.say(`${label} — ${seat.locality}; Esc stops it`);
  report();

  const brief = describeSpace(log.scene(text, opts.regen ? { mutable: opts.regen } : {}));
  const result = await propose({
    config: seat.config,
    brief,
    words: text,
    ...(seat.transport ? { transport: seat.transport } : {}),
    signal,
    ...(opts.regen ? { regen: true } : {}),
  });
  work.end(key);

  if (!result.ok || !result.proposal) {
    // Nothing was written, and the status says why rather than leaving the
    // board looking as though something had happened.
    panel.say(`${seat.name} — ${result.error ?? 'nothing usable came back'}. Nothing was written; the drawing is as it was`);
    report();
    return;
  }
  const proposal: Proposal = result.proposal;
  // **`reuse` is HONOURED, not only reported** (v9 S5's rule, P6). The brief
  // lists what the library holds; a model that answers `{"reuse":"mug"}` has
  // written nothing, and the shard places the definition instead — at the
  // profile that stands selected, else at the world origin. No tree comes back
  // and none is needed.
  if (proposal.reuse && !proposal.steps.length) {
    const why = log.whyNotPlace(proposal.reuse, atMark);
    if (why) {
      panel.say(`${seat.name} says the library already holds “${proposal.reuse}”, but ${why}`);
      report();
      return;
    }
    placeHere(proposal.reuse, atMark);
    panel.say(
      `${seat.name} says the library already holds “${proposal.reuse}” — placed from the library, not written · tier 1`
    );
    report();
    return;
  }
  // A tree came back, and there is nothing for it to fill. Said rather than
  // guessed at: a proposal built onto a solid nobody selected would be a tree
  // standing somewhere the hand did not ask for.
  if (!solid) {
    panel.say(
      `${seat.name} wrote a tree of ${proposal.steps.length} step${proposal.steps.length === 1 ? '' : 's'}, and ` +
        `nothing is selected for it to fill — draw profiles on two or three planes, or tap a solid. Nothing was written`
    );
    report();
    return;
  }
  const out = opts.regen
    ? log.replaceSteps(solid.id, opts.regen, proposal, { id: seat.id, name: seat.name })
    : log.applyProposal(solid.id, proposal, { id: seat.id, name: seat.name });
  if (!out) {
    panel.say(`${seat.name} — nothing in the reply could be built here. Nothing was written`);
    report();
    return;
  }
  solids.sync();
  ink.sync();
  selection.set({ kind: 'solid', id: solid.id });
  const honours = log.honoursOf(solid.id);
  const named = [...new Set(out.steps.map((st) => st.name).filter(Boolean))];
  panel.say(
    `${seat.name} · ${out.steps.length} step${out.steps.length === 1 ? '' : 's'}` +
      `${named.length ? ` named ${named.join(', ')}` : ''}` +
      `${out.drawn.length ? ` · ${out.drawn.length} profile${out.drawn.length === 1 ? '' : 's'} drawn` : ''}` +
      // UI-2: the status line is ONE short sentence. The whole per-claim
      // honours list — every view, what each one is carried from, what was set
      // aside and why — rode in here after a proposal and made the line longer
      // than the line is. The number belongs in a status line; its workings
      // belong in the panel, which is open, two rows away, and says all of it.
      `${honours ? ` · honours the drawing ${(honours.overall * 100).toFixed(0)}% — details in the panel` : ''}` +
      `${out.dropped.length ? ` · ${out.dropped.length} dropped` : ''} · tier 2`
  );
  // The panel has to be re-read, not only the field: the version row, the named
  // steps and the honours row are all about the solid that just changed, and
  // `selection.set` on a solid that was already selected fires nothing.
  panel.show(panel.subject() ?? lastStroke(), selection.current());
  report();
}

/** A phrase the table could not read, asked of a model once and held as a saying. */
async function askMeaning(phrase: string) {
  const seat = models.first();
  if (!seat) {
    models.open();
    return;
  }
  const names = nameRefs().map((n) => n.name);
  const key = `mean:${phrase}`;
  const signal = work.start(key, `${seat.name} · what “${phrase}” means`, null);
  report();
  const send = seat.transport ?? ((c, m, o) => complete(c, m, o));
  const reply = await send(seat.config, meaningMessages(phrase, [...PHRASE_VERBS], names), { signal });
  work.end(key);
  if (!reply.ok) {
    panel.say(`${seat.name} — ${reply.error}. Nothing was learned`);
    return report();
  }
  const meaning = parseMeaning(reply.text, [...PHRASE_VERBS], names);
  if (!meaning.ok || !meaning.verb) {
    panel.say(`${seat.name} — ${meaning.error ?? 'that is none of the verbs this space has'}`);
    return report();
  }
  log.teachSaying({
    phrase,
    verb: meaning.verb,
    ...(meaning.target ? { target: meaning.target } : {}),
    why: `${seat.name} read “${phrase}” as ${meaning.verb}${meaning.target ? ` of ${meaning.target}` : ''}${meaning.why ? ` — ${meaning.why}` : ''}`,
  });
  panel.say(
    `“${phrase}” is a way of saying ${meaning.verb}${meaning.target ? ` of ${meaning.target}` : ''} — ` +
      `held in the log, so the table reads it next time. Type it again`
  );
  report();
}

/** A phrase the table DID read: tier 1 for two of the three, a model for the regen. */
function runPhrase(r: PhraseReading) {
  if (!r.solidId) return;
  if (r.verb === 'drop') {
    const next = log.dropSteps(r.solidId, r.stepIds, `${describePhrase(r)} — ${r.reasoning}`);
    if (!next) return panel.say('nothing there to take out');
    solids.sync();
    return after(r.solidId, `${r.names.join(', ')} taken out — ${next.steps.length} steps left · tier 1`);
  }
  if (r.verb === 'paint') {
    const next = log.paintSteps(r.solidId, r.stepIds, r.colour!, `${describePhrase(r)} — ${r.reasoning}`);
    if (!next) return panel.say(`“${r.colour}” is not a colour the shard can paint`);
    solids.sync();
    return after(r.solidId, `${r.names.join(', ')} painted ${r.colour} · tier 1`);
  }
  // regen: only those steps, and the brief says so.
  selection.set({ kind: 'solid', id: r.solidId });
  void runBrief(
    `${r.change && r.change !== 'different' ? `make the ${r.names.join(' and ')} ${r.change}` : `do the ${r.names.join(' and ')} again`}`,
    { regen: r.stepIds }
  );
}

// ---- the field: the tier 1 verbs, and what this selection affords ----------
function selectedSolid() {
  const sel = selection.current();
  if (!sel) return null;
  return sel.kind === 'solid' ? log.solidOf(sel.id) : log.solidFor(sel.id);
}

function verbOffers(): VerbOffer[] {
  const sel = selection.current();
  const markId = sel?.kind === 'mark' ? sel.id : null;
  const solid = selectedSolid();
  const form = markId ? log.formOf(markId) : null;
  const opts = log.makeable();
  const mine = (m: Makeable) => !markId || m.profileId === markId || (m.kind === 'extrude' ? m.extentId : m.axisId) === markId;
  const ex = opts.find((m) => m.kind === 'extrude' && mine(m));
  const rv = opts.find((m) => m.kind === 'revolve' && mine(m));

  // A verb that needs a mark nobody has drawn yet SAYS SO. It never guesses a
  // depth: the extent is the drawing, and a number invented here would be the
  // one thing in the shard that came from nowhere.
  const noExtent = form?.role === 'profile'
    ? 'nothing to grow along yet — draw a line from this profile\'s edge, off its plane'
    : markId
      ? `a ${form?.role ?? 'mark'} is not a profile — extrude grows a profile along its plane's normal`
      : 'select a profile with an extent beside it';
  const noAxis = form?.role === 'profile'
    ? 'no axis beside it yet — draw a line in this profile\'s own plane, beside it'
    : markId
      ? `a ${form?.role ?? 'mark'} is not a profile — revolve turns a profile about a line beside it`
      : 'select a profile with an axis beside it';

  // ---- P3: what a feature on a face affords ------------------------------
  // A feature is NOT acted on: a hole and a boss are two different intentions
  // and the drawing does not say which, so both pills stand and the hand
  // decides. Both are tier 1 — no dot, no model, no wait.
  const feat = solid ? log.featureFor(solid.id) : markId ? log.features().find((f) => f.featureId === markId) ?? null : null;
  const featSolid = feat ? log.solidOf(feat.solidId) : null;
  const depthSaid = feat?.extentId
    ? `as deep as the extent ${feat.extentId} drawn from its edge`
    : 'through — no extent said how deep';
  const noFeature = solid
    ? `nothing drawn on ${solid.name} to cut — draw a closed shape on one of its faces`
    : markId
      ? `a ${form?.role ?? 'mark'} is not a feature — draw a closed shape ON a solid's face`
      : 'draw a closed shape on a solid\'s face';

  // ---- P4: what a profile of this solid affords --------------------------
  // The diff, resolved. Tier 1 and instant, like every other verb here: a
  // region is an area the drawing asked for, and running it through the body
  // needs no model and no wait.
  const addable = solid ? log.matchable(solid.id, 'add') : null;
  const removable = solid ? log.matchable(solid.id, 'remove') : null;

  /** What a region offer says when it is afforded: how many, how much, and where. */
  const matchWhy = (m: NonNullable<ReturnType<typeof log.matchable>>, how: 'add' | 'remove') => {
    const regions = how === 'add' ? m.diff.missing : m.diff.extra;
    const area = regions.reduce((n, r) => n + r.area, 0);
    return (
      `${regions.length} region${regions.length === 1 ? '' : 's'} (${area.toFixed(2)} u²) ${regions[0].where} ` +
      `the ${m.profile.view} profile ${how === 'add' ? `asks for and ${m.profile.name} lacks` : `does not, and ${m.profile.name} has`} — ` +
      `run right through the body along that plane's own normal · tier 1`
    );
  };

  /** …and what it says when it is not: never "nothing", always which of the reasons it is. */
  const noMatch = (how: 'add' | 'remove') => {
    if (!solid) return 'nothing selected — tap a solid, then draw its outline on a plane';
    const mine = log.profilesOf(solid.id);
    if (!mine.length) {
      return `no profile of ${solid.name} on the board — choose a plane, draw the outline you meant over the solid, and the diff says what it lacks`;
    }
    const last = mine[mine.length - 1];
    const d = log.diffFor(last.markId);
    return d
      ? `nothing ${how === 'add' ? 'missing' : 'extra'} — ${d.sentence}`
      : `the ${last.view} profile of ${solid.name} has not been read yet`;
  };

  /** One act: the version, then the diff re-read and said, because that is the point of it. */
  const runMatch = (m: NonNullable<ReturnType<typeof log.matchable>>, how: 'add' | 'remove') => {
    const made = log.match(m.profile.markId, how);
    if (!made) return;
    const now = log.diffFor(m.profile.markId);
    after(
      made.id,
      `${m.profile.name} — ${describeStep(made.step)} · ${now ? now.sentence : made.diff.sentence} · tier 1`
    );
  };

  // ---- P6: what the library says this outline could be ---------------------
  const matches = markId ? log.definitionMatches(markId) : [];
  const top = matches[0];
  const noLibrary = !markId
    ? 'nothing selected — draw an outline, and what the library holds is offered on it'
    : !log.definitions().length
      ? 'the library holds nothing yet — take a version and its names become definitions'
      : form?.role !== 'profile'
        ? `a ${form?.role ?? 'mark'} is not an outline the library can match — draw a closed profile`
        : `nothing in the library is like this outline (${log.definitions().length} held, none above the floor)`;

  // The plane a mirror reflects across, said out loud BEFORE Enter is pressed.
  const mirrorPlane = () => gizmo.plane() ?? height('world', 'nothing was chosen, so the height plane — the wall you face');
  const mirrorWhy = solid
    ? `${solid.name} and its reflection across the ${gizmo.chosen ?? 'height'} plane${gizmo.chosen ? ' — the tile you are holding' : ' — nothing is chosen, so the wall you face'}, as one body`
    : 'nothing selected to mirror — tap a solid';

  /**
   * DATA-1 + UI-2: a solid whose tree would not READ affords two things and no
   * others. *Extrude* and *Cut a hole* were still standing on a body with no
   * steps — verbs about a tree, offered over a tree that could not be read —
   * and taking one wrote a version onto an artifact whose code nobody had been
   * able to parse. Remove takes it off the board and Undo walks it back; every
   * other pill says the reason it is not on offer.
   */
  const unreadable = solid?.broken ?? null;
  const gate = (offers: VerbOffer[]): VerbOffer[] =>
    unreadable
      ? offers.map((v) =>
          v.verb === 'remove' || v.verb === 'undo'
            ? v
            : { ...v, enabled: false, why: `this tree could not be read — ${unreadable}`, run: () => {} }
        )
      : offers;

  return gate([
    {
      verb: 'extrude',
      label: 'Extrude',
      enabled: !!ex,
      why: ex ? ex.reasoning : noExtent,
      run: () => { if (ex) { const m = log.make(ex); if (m) { selection.set({ kind: 'solid', id: m.id }); panel.say(`${m.name} · tier 1`); report(); } } },
    },
    {
      verb: 'revolve',
      label: 'Revolve',
      enabled: !!rv,
      why: rv ? rv.reasoning : noAxis,
      run: () => { if (rv) { const m = log.make(rv); if (m) { selection.set({ kind: 'solid', id: m.id }); panel.say(`${m.name} · tier 1`); report(); } } },
    },
    {
      verb: 'cut',
      label: 'Cut a hole',
      enabled: !!feat && !!featSolid,
      why: feat && featSolid ? `take it out of ${featSolid.name}, ${depthSaid} · tier 1` : noFeature,
      run: () => {
        if (!feat) return;
        const made = log.cut(feat);
        if (!made) return;
        after(made.id, `${featSolid?.name ?? 'the solid'} — ${describeStep(made.step)} · tier 1`);
      },
    },
    {
      verb: 'boss',
      label: 'Raise a boss',
      enabled: !!feat && !!featSolid,
      why: feat && featSolid
        ? `stand it proud of ${featSolid.name}, ${feat.extentId ? depthSaid : 'by its own short side — the only depth the drawing contains'} · tier 1`
        : noFeature,
      run: () => {
        if (!feat) return;
        const made = log.boss(feat);
        if (!made) return;
        after(made.id, `${featSolid?.name ?? 'the solid'} — ${describeStep(made.step)} · tier 1`);
      },
    },
    {
      verb: 'add',
      label: 'Add it',
      enabled: !!addable,
      why: addable ? matchWhy(addable, 'add') : noMatch('add'),
      run: () => { if (addable) runMatch(addable, 'add'); },
    },
    {
      verb: 'takeoff',
      label: 'Take it off',
      enabled: !!removable,
      why: removable ? matchWhy(removable, 'remove') : noMatch('remove'),
      run: () => { if (removable) runMatch(removable, 'remove'); },
    },
    {
      verb: 'mirror',
      label: 'Mirror',
      enabled: !!solid,
      why: mirrorWhy,
      run: () => {
        if (!solid) return;
        const made = log.mirror(solid.id, mirrorPlane());
        if (!made) return;
        after(made.id, `${solid.name} mirrored across the ${gizmo.chosen ?? 'height'} plane · tier 1`);
      },
    },
    {
      verb: 'dup',
      label: 'Dup',
      enabled: !!solid,
      why: solid
        ? `a copy of ${solid.name} standing beside it by its own width — one tree, two bodies · tier 1`
        : 'nothing selected to copy — tap a solid',
      run: () => {
        if (!solid) return;
        const made = log.dup(solid.id);
        if (!made) return;
        after(made.id, `${made.name} copied beside itself · tier 1`);
      },
    },
    {
      verb: 'remove',
      label: 'Remove',
      enabled: !!solid,
      why: solid ? `take ${solid.name} off the board — its ink stays exactly where it is` : 'nothing selected to remove — tap a solid',
      run: () => { if (solid) { log.remove(solid.id); selection.clear(); panel.say(`${solid.name} removed — its ink stays`); report(); } },
    },
    {
      verb: 'regen',
      label: 'Regen',
      enabled: !!solid && !!models.first(),
      why: solid
        ? models.first()
          ? `ask ${models.first()!.name} for this tree again — the massing is the extent and the reply is clipped to it · tier 2`
          : 'no model has joined — open the model pane and seat one'
        : 'nothing selected to regen — tap a solid',
      run: () => { if (solid) void runBrief('do it again'); },
    },
    {
      verb: 'take',
      label: 'Take it',
      enabled: !!solid && !!log.versionOf(solid.id) && !log.versionOf(solid.id)!.taken && !!takeableName(solid.id),
      why: solid
        ? takeableName(solid.id)
          ? log.versionOf(solid.id)?.taken
            ? `${solid.name} has already been taken — its parts are definitions`
            : `hold “${takeableName(solid.id)}” in the library with the outlines it was made from, and every named ` +
              `sub-tree as a definition based on it — drawing one of those outlines again then offers it · tier 1`
          : 'nothing in this tree carries a name yet — a brief comes back with names on its steps'
        : 'nothing selected to take — tap a solid',
      run: () => {
        if (!solid) return;
        const took = log.take(solid.id);
        if (!took) return panel.say('nothing in this tree carries a name to take');
        after(
          solid.id,
          `taken — it is “${took.name}”${took.definitions.length ? `, and ${took.definitions.join(', ')} ${took.definitions.length === 1 ? 'is a definition' : 'are definitions'} based on it` : ''} · tier 1`
        );
      },
    },
    // ---- P6: what the library says this outline is ---------------------------
    // Tier 1, both of them: placing is arithmetic on two outlines and a
    // correction is the hand saying what a thing is not. No dot on either.
    {
      verb: 'place',
      label: top ? `Place ${top.name}` : 'Place',
      enabled: !!top && !!markId,
      why: top
        ? `stand ${top.name} where ${markId} was drawn, scaled so ${top.profile.markId} fits this outline — ` +
          `${top.reasoning} · tier 1`
        : noLibrary,
      run: () => { if (top && markId) placeHere(top.name, markId); },
    },
    {
      verb: 'reject',
      label: top ? `Not a ${top.name}` : 'Not it',
      enabled: !!top && !!markId,
      why: top
        ? `say this outline is not a ${top.name} — held on the definition as a rejected example, so an outline ` +
          `like it is never offered as one again, and a replay remembers it · tier 1`
        : noLibrary,
      run: () => {
        if (!top || !markId) return;
        const said = log.correct(top.name, markId);
        if (!said) return panel.say('nothing to correct here');
        panel.say(`not a ${top.name} — ${said.why}`);
        chips.drop(`library:${markId}`);
        offerLibrary(markId);
        panel.show(markId, selection.current());
        report();
      },
    },
    {
      verb: 'undo',
      label: 'Undo',
      enabled: true,
      why: 'drop the last act — the solid if one stands on top of the log, else the last stroke',
      run: () => undo(),
    },
  ]);
}

/** The name taking a version would give the thing: the deepest named step. */
function takeableName(solidId: string): string | null {
  const solid = log.solidOf(solidId);
  if (!solid) return null;
  // The hand's own name is the name of the thing (P6, and `log.take`'s rule):
  // a solid called *mug* with one step a model named *handle* is a mug with a
  // handle, not a handle. Reading only the steps left *Take it* refused on a
  // thing that had been named — found by naming one.
  if (solid.named === 'human') return solid.name;
  const byId = new Map(solid.tree.steps.map((st) => [st.id, st]));
  let walk = solid.tree.steps.length ? solid.tree.steps[solid.tree.steps.length - 1] : undefined;
  // Walk down the `on` chain from the newest step: the name of the WHOLE is
  // the one at the bottom, not the one nearest the top (a top naming a castle
  // is a part naming the whole).
  let found: string | null = null;
  for (let i = 0; walk && i <= solid.tree.steps.length; i++) {
    if (walk.name) found = walk.name;
    walk = walk.on ? byId.get(walk.on) : undefined;
  }
  return found;
}

/**
 * The names in play, as the field completes them (§2.6 rule 3).
 *
 * A name the LIBRARY holds does something when Enter is pressed: it PLACES the
 * definition, at the profile that stands selected or — with nothing selected —
 * at the world origin, and the reading line says which before Enter is pressed.
 * A name that is only a step of a tree still selects what carries it, and says
 * that taking the version is what makes it a definition.
 */
function knownNames(): KnownName[] {
  const defs = log.definitions();
  const sel = selection.current();
  const markId = sel?.kind === 'mark' ? sel.id : null;
  const out: KnownName[] = [];
  for (const n of log.namesInPlay()) {
    if (out.some((k) => k.name === n.name)) continue;
    const def = defs.find((d) => d.name === n.name);
    if (def) {
      const blocked = log.whyNotPlace(def.name, markId);
      const where = markId ? `at ${markId}` : 'at the world origin — nothing is selected';
      out.push({
        name: n.name,
        what:
          `a definition${def.whole ? ' · the whole of it' : `, based on ${def.basedOn}`} · ` +
          (blocked ? blocked : `place it ${where}`),
        run: () => {
          if (blocked) {
            panel.say(blocked);
            return report();
          }
          placeHere(def.name, markId);
        },
      });
      continue;
    }
    out.push({
      name: n.name,
      what: `a step of ${log.solidOf(n.solidId)?.name ?? n.solidId} — take the version and it becomes a definition`,
      run: () => {
        selection.set({ kind: 'solid', id: n.solidId });
        panel.say(`${n.name} — ${n.op} ${n.stepId} of ${log.solidOf(n.solidId)?.name ?? n.solidId}`);
        report();
      },
    });
  }
  return out;
}

function fieldContext(): FieldContext {
  const solid = selectedSolid();
  const seat = models.first();
  return {
    verbs: verbOffers(),
    nameable: solid
      ? { what: solid.name, run: (n: string) => { log.name(solid.id, n); panel.say(`named “${n}” — yours, held in the log`); report(); } }
      : null,
    names: knownNames(),
    phrases: {
      scope: phraseScope(),
      run: (r) => runPhrase(r),
      ask: (text) => void askMeaning(text),
      model: seat ? seat.name : null,
    },
    brief: {
      model: seat ? seat.name : null,
      run: (text) => void runBrief(text),
      openPane: () => { models.open(); report(); },
    },
  };
}

function renderField() {
  field.render(fieldContext());
  // The panel stops where the field starts, and the field is as tall as the
  // verbs it is offering — so it says how tall it is rather than the stylesheet
  // guessing. Found when P4's two pills pushed it over the bottom of the panel,
  // which is exactly where P4's own row stands.
  document.documentElement.style.setProperty('--field-h', `${fieldEl.offsetHeight}px`);
}

/** The ground is "the foundation"; the other two are "the … plane". */
function whereOn(name: string | undefined): string {
  if (!name) return 'on a plane';
  if (name === 'foundation') return 'on the foundation';
  // A read face already reads as a place — "on the top of artifact:7" — and
  // calling it "the top of artifact:7 plane" says plane twice.
  if (name.includes(' of ')) return `on the ${name}`;
  return `on the ${name} plane`;
}

function lastStroke(): string | null {
  const marks = log.marks();
  return marks.length ? marks[marks.length - 1].id : null;
}

// ---- the chrome ------------------------------------------------------------
const undoTile = document.getElementById('tileUndo')!;
const themeTile = document.getElementById('tileTheme')!;
const helpTile = document.getElementById('tileHelp')!;
const modelsTile = document.getElementById('tileModels')!;
// UI-3: the panel is down by default and this shows it. It owns the class, the
// label and the preference (`panel.ts`); the report is re-run because the
// panel's own standing line depends on whether it is on screen.
createPanelToggle(document.getElementById('panelToggle')!, () => report());
pane(helpEl, 'shard 3d', () => helpEl.setAttribute('hidden', ''));

modelsTile.onclick = () => {
  models.toggle();
  report();
};

undoTile.onclick = () => undo();
themeTile.onclick = () => {
  theme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
  applyTheme(theme);
  repaint();
  report();
};
helpTile.onclick = () => (helpEl.hasAttribute('hidden') ? helpEl.removeAttribute('hidden') : helpEl.setAttribute('hidden', ''));

function repaint() {
  colours = readColours();
  space.paint(colours);
  gizmo.paint(colours);
  ink.paint(colours);
  solids.paint(colours);
  selection.paint(colours);
  nav.paint(colours);
}
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
  if (theme !== 'system') return;
  applyTheme(theme); // re-stamp: the OS moved, and *system* follows it
  repaint();
  report();
});

function report() {
  const n = log.marks().length;
  const made = log.solids();
  renderField();
  chips.place();
  nav.sync();
  tile(undoTile, 'undo', n ? String(n) : '', { why: 'drop the last act · the solid if one stands, else the stroke' });
  tile(themeTile, 'theme', theme === 'system' ? `sys · ${effectiveTheme(theme)}` : theme, {
    why: 'light and dark are the same tokens inverted',
  });
  tile(helpTile, 'help', '', { on: !helpEl.hasAttribute('hidden') });
  // The seat, on the face of the tile: a model is asked only by a deliberate
  // act, and the chrome should never leave you wondering whether one is there.
  const seats = models.seats();
  const busy = work.running().length;
  tile(modelsTile, 'model', busy ? `${seats[0]?.name ?? 'model'} · working` : seats.length ? seats[0].name : 'none', {
    on: models.isOpen() || busy > 0,
    why: seats.length
      ? `${seats.map((m) => `${m.name} (tier 2 · ${m.locality})`).join(', ')} — asked only on Enter over a brief, or a regen`
      : 'no model joined · a brief in the field opens this pane',
  });
  work.place();
  // The standing line is the next move, keyed to what the board is.
  const plane = planeForPenDown(pen());
  const afford = log.makeable();
  panel.stand(
    !n
      ? gizmo.chosen
        ? `${gizmo.chosen} chosen · draw a closed shape on it`
        : 'nothing chosen · draw anywhere, the plane is read'
      : afford.length
        ? `a profile with an ${afford[0].kind === 'extrude' ? 'extent' : 'axis'} · ↵ ${afford[0].kind}`
        : log.massable()
          ? `${log.massable()!.profileIds.length} profiles on ${log.massable()!.planes.length} planes · the massing stands as you draw`
        : made.length && log.versionOf(made[0].id) && !log.versionOf(made[0].id)!.taken && log.namesInPlay().length
          ? `a version is held · ↵ Take it to name ${made[0].name === 'massing' ? 'it' : made[0].name}, its parts become definitions`
        : log.definitions().length
          // Taken: the names are the next move. *make the turrets taller*,
          // *the tops are red*, or the name on its own.
          ? `${made[0].name} · ${log.definitions().length === 1 ? 'definition' : 'definitions'}: ${log.definitions().map((d) => d.name).join(', ')} — type one, or say what to do to it`
        : made.length && models.first()
          ? `${made.length} solid${made.length === 1 ? '' : 's'} · type what this is and ${models.first()!.name} fills the massing`
        : `${n} mark${n === 1 ? '' : 's'}${made.length ? ` · ${made.length} solid${made.length === 1 ? '' : 's'}` : ''} · ${gizmo.chosen ? describePlane(plane) : 'the plane is read'}${gizmo.offset ? ` at ${gizmo.offset.toFixed(2)}` : ''} · a line off a profile's edge stands it up`
  );
  // UI-2: the panel's summary says what the next deliberate act will do, and
  // that is the same sentence the field is showing — so it has to be read at
  // the same moment. Rendering the panel only where an act happened left it a
  // beat behind: choosing a plane re-read the field and not the panel, and the
  // two then said *across the foundation* and *nothing is chosen* about one
  // verb. The panel is derived from the log and the hand's state like
  // everything else (invariant 4), so it is re-read here, last.
  panel.show(panel.subject(), selection.current());
}

/**
 * The one decision about where ink lands, whoever made it.
 *
 * `by` is which of the two said so. A hand's choice is remembered as the
 * hand's, and it **overrules the view**: choosing anything other than what the
 * camera is facing — a different tile, or nothing at all with `0` or the
 * centre — hands the picker's tiles back, because from then on the hand is
 * doing the choosing and it needs them.
 */
function choose(name: PlaneName | null, by: 'hand' | 'view' = 'hand', why?: string) {
  if (by === 'hand') {
    handChosen = name;
    const at = nav.standing();
    if (viewChoosing && (!name || !at || name !== axisPlaneFor(at))) viewChoosing = false;
  }
  gizmo.choose(name, why);
  gizmo.showTiles(!viewChoosing);
  space.render();
  nav.sync(); // the picker's tile and the compass's ball say the same thing
  // The compass says its own sentence when the view is the one choosing.
  if (by === 'view') {
    report();
    return;
  }
  panel.say(
    name
      ? tooOblique(name, lookOfCamera())
        // The warning a snap used to carry. An axis view now always faces the
        // plane it chose, so the only way left to stand somewhere the ink
        // cannot land is to choose it by hand from here — which is where it
        // has to be said, rather than letting the pen find out.
        ? `${name} chosen · it is edge-on from here — orbit, or tap the ball that faces it`
        : `${name} chosen · ink lands ${whereOn(name)}`
      : 'nothing chosen · the plane is read from the evidence, and the panel says why'
  );
  report();
}

/** Which way the camera looks, for the edge-on check. */
function lookOfCamera(): Vec3 {
  const pose = space.pose();
  return sub(pose.target, pose.position);
}

function undo() {
  const solidsBefore = log.solids().length;
  chips.clear(); // an offer about a mark the log no longer holds is a lie
  log.undo();
  ink.sync();
  solids.sync();
  // A selection pointing at something the log no longer holds is a lie.
  const sel = selection.current();
  if (sel && !(sel.kind === 'solid' ? log.solidOf(sel.id) : log.markOf(sel.id))) selection.clear();
  else selection.sync();
  panel.show(lastStroke(), selection.current());
  panel.say(log.solids().length < solidsBefore ? 'the solid is gone — its ink is still here' : 'undone');
  report();
}

/**
 * The views, on keys that do not collide with the PLANES.
 *
 * `1` `2` `3` `0` were already the plane picker's and they stay the plane
 * picker's — a plane is chosen far more often than a camera is snapped. So the
 * views take the NUMPAD, exactly where Blender has them, and `shift` + the
 * same digits for a keyboard with no numpad. `ctrl`/`cmd` with either is the
 * opposite side, and `5` toggles the projection, also as Blender has it.
 */
const VIEW_KEYS: Record<string, AxisView> = {
  Numpad1: 'front',
  Numpad3: 'right',
  Numpad7: 'top',
  Digit1: 'front',
  Digit3: 'right',
  Digit7: 'top',
};

window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
  if (e.target instanceof HTMLInputElement) return;

  // ---- the camera ----------------------------------------------------------
  const numpad = e.code.startsWith('Numpad');
  const asked = VIEW_KEYS[e.code];
  if (asked && (numpad || e.shiftKey)) {
    e.preventDefault();
    const axis = asked === 'front' ? 'z' : asked === 'right' ? 'x' : 'y';
    // ctrl / cmd is the other side of the same axis, as Blender has it — and
    // it is stated rather than toggled, so ctrl + the key always means *that*
    // side rather than *the other one from wherever I am*.
    nav.tap(e.ctrlKey || e.metaKey ? viewForAxis(axis, true) : viewForAxis(axis));
    return;
  }
  if ((e.code === 'Numpad5' || (e.code === 'Digit5' && e.shiftKey))) {
    e.preventDefault();
    nav.setProjection('toggle');
    return;
  }
  if (e.code === 'Numpad9' || (e.code === 'Digit9' && e.shiftKey)) {
    e.preventDefault();
    const at = nav.facing();
    if (at) nav.tap(at); // a tap on the ball you are already at is the flip
    else panel.say('not on an axis · tap a ball, or shift + 1 / 3 / 7');
    return;
  }
  if (e.key === 'Home' || (e.key.toLowerCase() === 'f' && !e.metaKey && !e.ctrlKey)) {
    e.preventDefault();
    nav.home();
    return;
  }

  if (e.key === '1') choose('foundation');
  else if (e.key === '2') choose('height');
  else if (e.key === '3') choose('width');
  else if (e.key === '0') choose(null);
  else if (e.key === 'Escape') {
    // Esc with nothing held stops EVERY call in flight, through the
    // transport's own signal — the canvas's rule (`cancelWork`).
    const stopped = work.cancelAll();
    if (stopped) {
      panel.say(`stopped ${stopped} call${stopped === 1 ? '' : 's'} — nothing was written, and the drawing is as it was`);
      report();
      return;
    }
    helpEl.setAttribute('hidden', '');
    models.close();
    selection.clear();
  }
});


space.onChange(report);
log.subscribe(report);
panel.show(null);
report();
space.render();

// ---- the test hook ---------------------------------------------------------
// One entry point, and it goes through the REAL pointer path: a synthesized
// hand is the same hand. `screenFor` is the honest way to draw a shape "on a
// plane" from any camera — the e2e states the shape in plane units and the
// hook projects it, which is exactly what a person aiming at the ground does.
export interface ShardHook {
  strokeScreen(points: Point[]): string | null;
  screenFor(uv: Point): Point;
  /** A WORLD point as a screen point — how the e2e aims at a face it did not choose. */
  screenForWorld(world: Vec3): Point;
  choose(name: PlaneName | null): void;
  view(which: 'free' | 'top' | 'front' | 'side'): void;
  /** Turn the camera by hand, in radians and world units — the orbit, without a drag. */
  orbit(dTheta: number, dPhi: number): void;
  /** Slide the view, in screen pixels — a middle-drag, through the real handler. */
  pan(dxPx: number, dyPx: number): void;
  /** Take a mark's runner-up (or the nth candidate). One act; one undo puts it back. */
  flipPlane(id: string, which?: number): string | null;
  /** The chip standing beside a mark right now, or null. */
  chipFor(id: string): string | null;
  /**
   * Every pinned view, and a way back to one. **Camera bookmarks**: nothing
   * about what is visible depends on them (the fade is gone).
   */
  pinned(): { label: string; count: number }[];
  goToPinned(index: number): void;
  /** Where the cursor stands, and why — the plane picker's own origin. */
  cursor(): { at: Vec3; why: string };
  /**
   * Shift + click at a screen point, through the real pointer path — the
   * gesture that places the cursor. Returns where it ended up.
   */
  shiftTap(screen: Point): { at: Vec3; why: string };
  /**
   * A mark's ink in WORLD space. The thing that must not move when the camera
   * does: a stroke's plane is picked from where the camera was, the geometry
   * it made is not.
   */
  worldPointsOf(id: string): Vec3[] | null;
  /**
   * The navigation gizmo, as a hand reaches it. `tap` snaps (and flips on a
   * second tap at the same view), `drag` turns the camera by a screen path on
   * the widget itself, and every move here is INSTANT by default — the e2e
   * cannot wait on an easing to assert what the camera is.
   */
  nav: {
    tap(which: string, ms?: number): string;
    home(ms?: number): void;
    /** A drag across the compass, in screen points — the orbit it is chrome for. */
    drag(path: Point[]): void;
    projection(p?: 'persp' | 'ortho' | 'toggle'): string;
    facing(): string | null;
    /** The six balls where they are drawn, farthest first. */
    balls(): { view: string; label: string; x: number; y: number; depth: number; chosen: boolean }[];
  };
  /** Everything on the board, in world space — what *home* frames. */
  bounds(): { min: Vec3; max: Vec3 } | null;
  /** The canvas's own rectangle, so the e2e can ask whether a point is on screen. */
  viewport(): { left: number; top: number; width: number; height: number };
  state(): {
    chosen: PlaneName | null;
    /** Why it is chosen, in the words the ink will carry. */
    chosenWhy: string;
    /** Whether the picker is showing its three tiles — away in an axis view. */
    tiles: boolean;
    /** True while the camera's own axis view is the one choosing. */
    viewChose: boolean;
    offset: number;
    marks: {
      id: string;
      /**
       * Where the plane passes through, as well as what it is called. For a
       * READ view plane this is the cursor, and that is the thing the e2e has
       * to be able to see (16 September 2026).
       */
      plane: { name?: string; source: string; why: string; origin: Vec3 };
      scale: number;
      /**
       * The ink's own box **in the plane's units** — the shape as it ended up
       * lying there. What a cast onto the view plane conserves and a cast onto
       * an oblique plane stretches is exactly this box's aspect, so the e2e can
       * measure the conservation rather than take the plane's word for it.
       */
      bounds: { minX: number; minY: number; maxX: number; maxY: number };
      readings: { label: string; weight: number; reasoning?: string }[];
      plays?: {
        role: string;
        rule: number;
        confidence: number;
        reasoning: string;
        targets: string[];
        /** P4: the solid this closed mark is a profile OF, when it is one. */
        against?: { solidId: string; name: string; view: string; iou: number };
      };
      /** The ranked plane candidates the winner beat — the plural reading. */
      candidates?: {
        label: string;
        source: string;
        confidence: number;
        reasoning: string;
        oblique: boolean;
        /** Held below the view plane: too oblique to take the stroke without stretching it. */
        gated: boolean;
        /** |n · look| — how face-on it is, the number the gate is read against. */
        facing: number;
      }[];
      /**
       * What the line is actually drawn at. View ink is world geometry (16
       * September 2026): orbiting away changes this by nothing, which is what
       * the e2e asserts where it used to assert the fade.
       */
      opacity: number | null;
      pose?: Pose;
      flippedFrom?: string;
    }[];
    solids: ReturnType<ShardHook['solids']>;
    selection: Sel | null;
    status: string;
    /** Where the camera stands, and through which lens. Runtime, never logged. */
    camera: {
      projection: 'persp' | 'ortho';
      /** Read off the projection MATRIX, not off the flag: is it really parallel? */
      parallel: boolean;
      position: Vec3;
      target: Vec3;
      forward: Vec3;
      dist: number;
      /** Degrees, so a turn is legible in a result object. */
      azimuth: number;
      elevation: number;
      /** Which of the six it is at, or null. */
      view: string | null;
    };
  };
  /** Every solid on the board, as the log holds it: the tree, not the mesh. */
  solids(): {
    id: string;
    name: string;
    named: string;
    memberIds: string[];
    author: string;
    /** How many versions of the tree the log holds — every one is kept. */
    versions: number;
    /** Why the derivation did not come off, or null. */
    broken: string | null;
    steps: {
      id: string;
      op: string;
      from: string[];
      on?: string;
      depth?: number;
      sweep?: number;
      through?: boolean;
      /** P4: which way a `match` went — `add` or `remove`. */
      how?: string;
      /** P5: the name a word bound to this step, and the colour, and who proposed it. */
      name?: string;
      colour?: string;
      by?: string;
      /** P5: for a clip, the step whose body does the clipping. */
      bound?: string;
      reasoning: string;
    }[];
  }[];
  /** The features standing on faces right now — what *Cut a hole* and *Raise a boss* are about. */
  features(): { featureId: string; solidId: string; extentId?: string }[];
  /**
   * P4: the panel's *matches the drawing* row, as data — one entry per plane a
   * profile of a solid was drawn on. With no id, every solid's.
   */
  diffs(solidId?: string): {
    markId: string;
    solidId: string;
    /** `top` / `front` / `side`. */
    view: string;
    /** Intersection over union of the ink and the silhouette. */
    coverage: number;
    /** Whether the ink was read from the engine's clean form or from the hand's own path. */
    from: string;
    sentence: string;
    dropped: number;
    missing: { area: number; where: string; points: number }[];
    extra: { area: number; where: string; points: number }[];
  }[];
  /** Fire a ray straight down the world −Y through a world point; what it hits, and where. */
  rayDown(at: { x: number; z: number }): { solidId: string; y: number } | null;
  /** What a mark crossed, and how many times — row 1's evidence, before the threshold. */
  scratchOf(markId: string): { solidId: string; name: string; crossings: number } | null;
  /** A solid's outline in the view a mark was drawn in — what those crossings were counted against. */
  silhouetteOf(solidId: string, markId?: string): { x: number; y: number }[] | null;
  /** Select a solid or a mark, as a tap would. */
  select(id: string | null): void;
  /** Type into the field and press Enter. Returns what the reading line said, and whether it ran. */
  field(text: string): { line: string; kind: string; ran: boolean };
  /** What the field WOULD do, without doing it. */
  fieldRead(text: string): { line: string; kind: string; enabled: boolean };
  undo(): void;
  clear(): void;
  panelText(): string;

  // ---- P5: the generator seat, and names -----------------------------------
  /**
   * Seat a model whose transport returns the given replies in order — the
   * bridge pattern (`participants/bridge.ts`), so the e2e never touches the
   * network and the loop it drives is the real one.
   */
  joinStub(replies: (string | { text: string; delayMs?: number })[], name?: string): string;

  // ---- G5: the hand in the room --------------------------------------------
  /**
   * Join a room over an in-memory hub, seat the MCP hand in it, and hand back
   * the OTHER hand — the one `shard-3d/mcp.mjs` is in a real room.
   *
   * No relay, no network, no MCP: the e2e drives the same `room.ts` the server
   * does, so what it proves is the path (park, merge, answer, apply), not a
   * mock of it. The stdio half is `mcp-smoke.mjs`'s to prove.
   */
  joinHand(roomName?: string): {
    seat: string;
    me: string;
    pending(): { key: string; words: string; brief: string; from: string }[];
    answer(key: string, text: string): boolean;
    refuse(key: string, why: string): boolean;
    /** `space_say` from the other side: a sentence beside some marks, in its name. */
    say(text: string, about: string[]): boolean;
  };
  /** Who is seated, and whether anything is in flight. */
  models(): { seats: { id: string; name: string; locality: string }[]; working: { label: string }[] };
  /** Every name in play, in its step's own id. */
  names(): { name: string; solidId: string; stepId: string; op: string; colour?: string; definition?: boolean }[];
  /** Every definition the library holds. */
  definitions(): {
    name: string;
    basedOn: string;
    stepId: string;
    ops: string[];
    /** P6: whether this is the whole thing or a named part of it. */
    whole: boolean;
    /** The outlines it would be recognised by, with the plane each was drawn on. */
    profiles: { markId: string; planeKind: string; shape: string; corners: number; extent: number }[];
    /** What a correction has said about it. */
    rejected: number;
    accepted: number;
  }[];
  /** P6: what the library says a mark's outline could be, ranked, with the reason. */
  matches(markId: string): { name: string; score: number; whole: boolean; reasoning: string; profile: string }[];
  /** P6: place a definition where a mark was drawn, as the chip's tap does. */
  place(name: string, markId: string | null): { id: string; name: string; scale: number; from: string } | null;
  /** P6: *Not a mug* — the correction, held in the log. */
  correct(name: string, markId: string): { definition: string; why: string } | null;
  /** How much of the drawing a body contains, per plane — the version's own row. */
  honours(solidId: string): {
    overall: number;
    /** Each claim with the kind it is: drawn here, carried from a definition, or drawn since (GRAPH-1). */
    per: { view: string; markId: string; coverage: number; kind?: string; of?: string; note?: string }[];
    aside?: string[];
    sentence: string;
  } | null;
  /** The materials the tree binds, in the step's own id. */
  materials(solidId: string): { stepId: string; name?: string; colour: string }[];
  /** Stop every call in flight, as Esc does. */
  cancel(): number;
  /** The brief `describeSpace` would build right now — what a model is actually told. */
  brief(words?: string, mutable?: string[]): string;
  /**
   * DATA-1: bless some marks and hang a `code` rep on them verbatim — the way
   * a folder, a merged log or another hand's machine puts an artifact on this
   * board. The only way to drive the LOAD boundary from outside, and the only
   * way to put a tree in front of the validator that this build did not write.
   */
  seedCode(markIds: string[], code: string, name?: string): string | null;
}

/** Where the camera stands, in the words a result object can be read in. */
/**
 * A camera drag the e2e makes, through the canvas's own pointer handlers —
 * button 2 is the orbit, button 1 the pan. Going through the events rather
 * than calling `space.turn` is what makes the pivot rule testable at all: the
 * pivot is asked for on pointerdown and nowhere else.
 */
function dragCamera(button: number, dxPx: number, dyPx: number) {
  const id = ++syntheticId;
  const start = { x: 400, y: 400 };
  const buttons = button === 1 ? 4 : 2;
  const at = (x: number, y: number, type: string, held: number) =>
    space.canvas.dispatchEvent(
      new PointerEvent(type, { pointerId: id, pointerType: 'mouse', button, buttons: held, clientX: x, clientY: y, bubbles: true, cancelable: true })
    );
  at(start.x, start.y, 'pointerdown', buttons);
  at(start.x + dxPx, start.y + dyPx, 'pointermove', buttons);
  at(start.x + dxPx, start.y + dyPx, 'pointerup', 0);
}

function cameraState() {
  const pose = space.pose();
  const f = space.look();
  const d = sub(pose.position, pose.target);
  const m = (space.camera as THREE.Camera).projectionMatrix.elements;
  return {
    projection: space.projection(),
    // A perspective matrix has −1 in m[11] and 0 in m[15]; a parallel one has
    // 1 in m[15]. Asking the MATRIX is the only assertion that cannot pass
    // because a flag was set and the camera was not swapped.
    parallel: Math.abs(m[15] - 1) < 1e-9 && Math.abs(m[11]) < 1e-9,
    position: pose.position,
    target: pose.target,
    forward: v3(+f.x.toFixed(6), +f.y.toFixed(6), +f.z.toFixed(6)),
    dist: +space.distance().toFixed(4),
    azimuth: +((Math.atan2(d.x, d.z) * 180) / Math.PI).toFixed(3),
    elevation: +((Math.asin(Math.max(-1, Math.min(1, d.y / (Math.hypot(d.x, d.y, d.z) || 1)))) * 180) / Math.PI).toFixed(3),
    view: viewOfPose(pose),
  };
}

function fire(type: string, p: Point, pointerId: number, buttons: number) {
  space.canvas.dispatchEvent(
    new PointerEvent(type, {
      pointerId,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      buttons,
      clientX: p.x,
      clientY: p.y,
      bubbles: true,
      cancelable: true,
    })
  );
}

let syntheticId = 1000;

const hook: ShardHook = {
  strokeScreen(points) {
    if (points.length < 2) return null;
    const before = new Set(log.marks().map((m) => m.id));
    const id = ++syntheticId;
    fire('pointerdown', points[0], id, 1);
    for (const p of points.slice(1)) fire('pointermove', p, id, 1);
    fire('pointerup', points[points.length - 1], id, 0);
    const made = log.marks().find((m) => !before.has(m.id));
    return made ? made.id : null;
  },
  screenFor(uv) {
    // With nothing chosen there is no plane to state a shape in until the pen
    // is down, so `screenFor` aims at the ground — the e2e uses
    // `screenForWorld` for a face it has not chosen.
    const plane = planeForPenDown(pen());
    return space.project(toWorld(plane, uv));
  },
  screenForWorld: (world) => space.project(world),
  choose,
  view: (w) => { space.view(w); report(); },
  orbit: (dTheta, dPhi) => {
    // The same drag the hand makes, in the same handler: 0.006 radians a pixel.
    dragCamera(2, -dTheta / 0.006, dPhi / 0.006);
    report();
  },
  // The middle button, which is the pan — again through the real handler, so
  // the e2e is asserting on what a hand would get and not on a method call.
  pan: (dxPx, dyPx) => {
    dragCamera(1, dxPx, dyPx);
    report();
  },
  flipPlane: (id, which = 1) => flipPlane(id, which),
  chipFor: (id) => chips.textFor(id),
  pinned: () => pinnedViews(log).map((v) => ({ label: v.label, count: v.count })),
  cursor: () => ({ at: cursor, why: cursorWhy }),
  shiftTap: (screen) => {
    // Through `claimed`, the way a real shift + click reaches it, so what the
    // e2e exercises is the gesture and not a back door onto `putCursor`.
    space.canvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 71, pointerType: 'mouse', isPrimary: true, button: 0, buttons: 1,
        clientX: screen.x, clientY: screen.y, shiftKey: true, bubbles: true, cancelable: true,
      })
    );
    return { at: cursor, why: cursorWhy };
  },
  worldPointsOf: (id) => {
    const m = log.markOf(id);
    return m ? m.points.map((pt) => toWorld(m.plane, pt)) : null;
  },
  goToPinned: (index) => {
    const v = pinnedViews(log)[index];
    if (v) space.easeTo(v.pose, 0);
    report();
  },
  nav: {
    tap: (which, ms = 0) => {
      const went = nav.tap(which as AxisView, ms);
      report();
      return went;
    },
    home: (ms = 0) => { nav.home(ms); report(); },
    drag: (path) => {
      const svg = navEl.querySelector('.compass') as SVGElement | null;
      if (!svg || path.length < 2) return;
      const id = ++syntheticId;
      const ev = (type: string, p: Point, buttons: number) =>
        svg.dispatchEvent(
          new PointerEvent(type, {
            pointerId: id, pointerType: 'mouse', isPrimary: true, button: 0, buttons,
            clientX: p.x, clientY: p.y, bubbles: true, cancelable: true,
          })
        );
      ev('pointerdown', path[0], 1);
      for (const p of path.slice(1)) ev('pointermove', p, 1);
      ev('pointerup', path[path.length - 1], 0);
      report();
    },
    projection: (p) => {
      const went = nav.setProjection(p ?? 'toggle');
      report();
      return went;
    },
    facing: () => nav.facing(),
    balls: () => {
      const chosenView = gizmo.chosen ? viewFacingPlane(gizmo.chosen) : null;
      return balls(space.pose()).map((b) => ({
        view: b.view,
        label: b.label,
        x: +b.x.toFixed(4),
        y: +b.y.toFixed(4),
        depth: +b.depth.toFixed(4),
        chosen: chosenView !== null && (b.view === chosenView || b.view === opposite(chosenView)),
      }));
    },
  },
  bounds: () => boardBounds(),
  viewport: () => {
    const r = space.canvas.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  },
  state: () => {
    const forms = log.forms();
    return {
      chosen: gizmo.chosen,
      chosenWhy: gizmo.chosenWhy,
      tiles: gizmo.tilesShown,
      viewChose: viewChoosing,
      offset: gizmo.offset,
      marks: log.marks().map((m: Mark) => {
        const f = forms.find((x) => x.id === m.id);
        return {
          id: m.id,
          plane: { name: m.plane.name, source: m.plane.source, why: m.plane.why, origin: m.plane.origin },
          scale: m.scale,
          bounds: inkBounds(m.points),
          readings: m.readings.map((r) => ({ label: r.label, weight: r.weight || 0, reasoning: r.reasoning })),
          plays: f
            ? {
                role: f.role,
                rule: f.rule,
                confidence: f.confidence,
                reasoning: f.reasoning,
                targets: f.targets,
                ...(f.against
                  ? {
                      against: {
                        solidId: f.against.solidId,
                        name: f.against.name,
                        view: f.against.view,
                        iou: f.against.iou,
                      },
                    }
                  : {}),
              }
            : undefined,
          candidates: m.candidates?.map((c) => ({
            label: c.label,
            source: c.plane.source,
            confidence: c.confidence,
            reasoning: c.reasoning,
            oblique: c.oblique,
            gated: !!c.gated,
            facing: c.terms?.facingRaw ?? 1,
          })),
          opacity: ink.opacityOf(m.id),
          ...(m.pose ? { pose: m.pose } : {}),
          ...(m.flippedFrom ? { flippedFrom: m.flippedFrom } : {}),
        };
      }),
      solids: hook.solids(),
      selection: selection.current(),
      status: statusEl.textContent || '',
      camera: cameraState(),
    };
  },
  solids: () =>
    log.solids().map((s) => {
      const node = log.session.getState().nodes.get(s.id);
      const code = node ? [...node.reps].reverse().find((r) => r.modality === 'code') : undefined;
      return {
        id: s.id,
        name: s.name,
        named: s.named,
        memberIds: s.memberIds,
        author: code?.source ?? 'unknown',
        versions: node ? node.reps.filter((r) => r.modality === 'code').length : 0,
        broken: solids.brokenOf(s.id),
        steps: s.tree.steps.map((st) => ({
          id: st.id,
          op: st.op,
          from: st.from,
          reasoning: st.reasoning,
          ...(st.on ? { on: st.on } : {}),
          ...(st.op === 'extrude' || st.op === 'cut' || st.op === 'boss' ? { depth: st.depth } : {}),
          ...(st.op === 'revolve' ? { sweep: st.sweep } : {}),
          ...(st.op === 'cut' && st.through ? { through: true } : {}),
          ...(st.op === 'match' ? { how: st.how } : {}),
          ...(st.name ? { name: st.name } : {}),
          ...(st.material?.colour ? { colour: st.material.colour } : {}),
          ...(st.by ? { by: st.by } : {}),
          ...(st.op === 'massing' && st.bound ? { bound: st.bound } : {}),
        })),
      };
    }),
  features: () =>
    log.features().map((f) => ({
      featureId: f.featureId,
      solidId: f.solidId,
      ...(f.extentId ? { extentId: f.extentId } : {}),
    })),
  diffs: (solidId) => {
    const ids = solidId ? [solidId] : log.solids().map((s) => s.id);
    const out: ReturnType<ShardHook['diffs']> = [];
    for (const id of ids) {
      for (const profile of log.profilesOf(id)) {
        const diff = log.diffFor(profile.markId);
        if (!diff) continue;
        const say = (rs: typeof diff.missing) =>
          rs.map((r) => ({ area: +r.area.toFixed(4), where: r.where, points: r.outline.length }));
        out.push({
          markId: profile.markId,
          solidId: id,
          view: diff.view,
          coverage: diff.coverage,
          from: diff.from,
          sentence: diff.sentence,
          dropped: diff.dropped,
          missing: say(diff.missing),
          extra: say(diff.extra),
        });
      }
    }
    return out;
  },
  rayDown: (at) => solids.rayDown(at),
  scratchOf: (id) => log.scratchOf(id),
  silhouetteOf: (solidId, markId) => solids.silhouetteOf(solidId, markId ? log.markOf(markId)?.pose : undefined),
  select: (id) => {
    if (!id) return selection.clear();
    selection.set(log.solidOf(id) ? { kind: 'solid', id } : { kind: 'mark', id });
  },
  field: (text) => {
    const r = readField(text, fieldContext());
    if (r.run) r.run();
    renderField();
    return { line: r.line, kind: r.kind, ran: !!r.run };
  },
  fieldRead: (text) => {
    const r = readField(text, fieldContext());
    return { line: r.line, kind: r.kind, enabled: !!r.run };
  },
  undo,
  clear: () => { log.clear(); chips.clear(); work.cancelAll(); cursor = v3(0, 0, 0); cursorWhy = 'the world origin — shift + click to put it somewhere'; gizmo.setOrigin(cursor); ink.sync(); solids.sync(); selection.clear(); panel.show(null); report(); },
  panelText: () => panelEl.textContent || '',

  joinStub: (replies, name = 'e2e-stub') => {
    // Re-seating the stub replaces it rather than standing a second one beside
    // it: `first()` is who a brief goes to, and two stubs would make which one
    // answers a question about the order they joined in.
    for (const held of models.seats().filter((m) => m.name === name)) models.leave(held.id);
    let n = 0;
    const seat = models.joinWith(name, (_config, _messages, opts) => {
      const held = replies[Math.min(n, replies.length - 1)];
      n++;
      const reply = typeof held === 'string' ? { text: held } : held;
      if (!reply) return Promise.resolve({ ok: false as const, error: 'the stub has no reply for that call' });
      return new Promise((resolve) => {
        const finish = () => resolve({ ok: true as const, text: reply.text, model: name });
        if (!reply.delayMs) return finish();
        const t = setTimeout(finish, reply.delayMs);
        opts.signal?.addEventListener('abort', () => {
          clearTimeout(t);
          resolve({ ok: false as const, error: 'cancelled' });
        });
      });
    });
    report();
    return seat.id;
  },

  joinHand: (roomName = 'e2e-room') => {
    // One hub, two hands: this page, and the hand that answers. The hub is
    // `LocalHub` — the shape a BroadcastChannel or the relay has to match — so
    // the lines that cross it are the lines that would cross a wire.
    const hub = new LocalHub();
    if (room) room.close();
    room = joinRoom({
      session: log.session,
      room: roomName,
      transport: hub.connect(),
      name: 'john',
      onMerge: () => {
        ink.sync();
        solids.sync();
        sayWhatLanded();
        report();
      },
      onWaiting: () => report(),
    });
    for (const held of models.seats().filter((m) => m.name === HAND_SEAT)) models.leave(held.id);
    const seat = models.joinHand(room);
    const hand = otherHand(hub.connect(), 'claude', roomName);
    report();
    return {
      seat: seat.id,
      me: hand.me,
      pending: () => hand.pending().map((b) => ({ key: b.key, words: b.words, brief: b.brief, from: b.from })),
      answer: (key, text) => hand.answer(key, text),
      refuse: (key, why) => hand.refuse(key, why),
      say: (text, about) =>
        !!hand.session.answer({
          participantId: LOCAL_PARTICIPANT,
          question: 'note',
          text,
          aboutIds: about,
          at: Date.now(),
        }),
    };
  },
  models: () => ({
    seats: models.seats().map((m) => ({ id: m.id, name: m.name, locality: m.locality })),
    working: work.running().map((w) => ({ label: w.label })),
  }),
  names: () =>
    log.namesInPlay().map((n) => ({
      name: n.name,
      solidId: n.solidId,
      stepId: n.stepId,
      op: n.op,
      ...(n.colour ? { colour: n.colour } : {}),
      ...(n.definition ? { definition: true } : {}),
    })),
  definitions: () =>
    log.definitions().map((d) => ({
      name: d.name,
      basedOn: d.basedOn,
      stepId: d.stepId,
      ops: d.steps.map((st) => st.op),
      whole: !!d.whole,
      profiles: d.profiles.map((p) => ({
        markId: p.markId,
        planeKind: p.planeKind,
        shape: p.shape,
        corners: p.print.corners,
        extent: +p.print.extent.toFixed(3),
      })),
      rejected: d.examples?.rejected.length ?? 0,
      accepted: d.examples?.accepted.length ?? 0,
    })),
  matches: (markId) =>
    log.definitionMatches(markId).map((m) => ({
      name: m.name,
      score: +m.score.toFixed(3),
      whole: m.whole,
      reasoning: m.reasoning,
      profile: m.profile.markId,
    })),
  place: (name, markId) => {
    const made = placeHere(name, markId);
    return made ? { id: made.id, name: made.name, scale: +made.scale.toFixed(3), from: made.from.markId } : null;
  },
  correct: (name, markId) => {
    const said = log.correct(name, markId);
    if (!said) return null;
    chips.drop(`library:${markId}`);
    report();
    return { definition: said.definition, why: said.why };
  },
  honours: (solidId) => {
    const h = log.honoursOf(solidId);
    return h
      ? {
          overall: h.overall,
          per: h.per.map((p) => ({
            view: p.view,
            markId: p.markId,
            coverage: p.coverage,
            ...(p.kind ? { kind: p.kind } : {}),
            ...(p.of ? { of: p.of } : {}),
            ...(p.note ? { note: p.note } : {}),
          })),
          ...(h.aside ? { aside: h.aside } : {}),
          sentence: h.sentence,
        }
      : null;
  },
  materials: (solidId) =>
    (log.solidOf(solidId)?.tree.steps ?? [])
      .filter((st) => st.material?.colour)
      .map((st) => ({ stepId: st.id, ...(st.name ? { name: st.name } : {}), colour: st.material!.colour })),
  cancel: () => work.cancelAll(),
  brief: (words = '', mutable) => describeSpace(log.scene(words, mutable?.length ? { mutable } : {})),
  seedCode: (markIds, code, name = 'thing') => {
    const summonId = log.session.summonMarks(markIds, Date.now());
    if (!summonId) return null;
    const id = log.session.bless({ summonId, name, at: Date.now(), participantId: ENGINE_PARTICIPANT });
    if (!id) return null;
    log.session.attachCode({
      participantId: ENGINE_PARTICIPANT,
      nodeId: id,
      code,
      kind: 'json',
      language: 'json',
      prompt: 'a code rep from somewhere else',
      at: Date.now(),
    });
    report();
    return id;
  },
};

(window as unknown as { __shard: ShardHook }).__shard = hook;

/**
 * The castle's three views (P5's done-criterion), in each plane's own units.
 *
 * The plan on the foundation is x ∈ [−2, 2], z ∈ [−1.5, 1.5]. The front on the
 * height plane is the keep x ∈ [−2, 2] up to y = 2 (+v runs DOWN, so v = −2),
 * with a narrow tower off its right-hand corner rising to y = 3 and a roof to
 * y = 3.6. The side on the width plane is the same in z (+u runs along −Z, so
 * u ∈ [−1.5, 1.5]) with its own tower at u ∈ [0.6, 1.3].
 *
 * Where the three prisms overlap IS the castle: a keep with one square tower
 * standing on a corner of it, tapering to a point. Nobody typed a word.
 */
export const CASTLE = {
  plan: [
    { x: -2, y: -1.5 },
    { x: 2, y: -1.5 },
    { x: 2, y: 1.5 },
    { x: -2, y: 1.5 },
  ] as Point[],
  front: [
    { x: -2, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: -2 },
    { x: 1.9, y: -2 },
    { x: 1.9, y: -3 },
    { x: 1.55, y: -3.6 },
    { x: 1.2, y: -3 },
    { x: 1.2, y: -2 },
    { x: -2, y: -2 },
  ] as Point[],
  side: [
    { x: -1.5, y: 0 },
    { x: 1.5, y: 0 },
    { x: 1.5, y: -2 },
    { x: 1.3, y: -2 },
    { x: 1.3, y: -3 },
    { x: 0.95, y: -3.6 },
    { x: 0.6, y: -3 },
    { x: 0.6, y: -2 },
    { x: -1.5, y: -2 },
  ] as Point[],
};
(window as unknown as { __castle: typeof CASTLE }).__castle = CASTLE;

/**
 * The two-minute demo's own numbers (SHARD-3D-PLAN §9), stated once and used
 * by both `?demo=mug` and the e2e — so the run the e2e asserts and the board
 * the demo draws are the same board.
 *
 * The mug: a 2.4 × 2.4 plan on the foundation at x ∈ [−7, −4.6], grown 2.4 up
 * by a line from its left edge, a hole cut through the top, and a handle a
 * model proposes off its +Z side. Then the same plan drawn again at
 * x ∈ [−3.4, −1.6] — smaller, and a little less square, so the match is a
 * measurement rather than a copy — and one tap places a second mug there.
 *
 * The two replies are **static**: the handle is a profile the model adds in
 * its own words, so nothing in them has to be stitched to a stroke id at
 * run time. The step it acts on is the root of the tree as it stands, which is
 * what a reply with no `on` means.
 */
export const MUG = {
  plan: { x: -7, z: -1.2, w: 2.4, d: 2.4 },
  top: 2.4,
  /** The hole, on the top face: a world circle, well inside a 2.4-square face. */
  hole: { at: { x: -5.8, y: 2.4, z: 0 }, r: 0.85 },
  /**
   * The mug's own side view, drawn on the WIDTH plane with the handle WIDER
   * than the model made it (+u runs along −Z, +v runs down): the body is
   * u ∈ [−1.2, 1.2], v ∈ [−2.4, 0], and the handle stands out of its −u edge.
   */
  side: [
    { x: 1.2, y: 0 },
    { x: 1.2, y: -2.4 },
    { x: -1.2, y: -2.4 },
    { x: -1.2, y: -2 },
    { x: -2.4, y: -2 },
    { x: -2.4, y: -0.6 },
    { x: -1.2, y: -0.6 },
    { x: -1.2, y: 0 },
  ] as Point[],
  /** The plan drawn again, elsewhere: 1.8 × 1.4, three quarters the size. */
  again: { x: -3.4, z: -1, w: 1.8, d: 1.4 },
  /** What the stub says to *a mug with a wide handle*. */
  reply: {
    steps: [
      {
        id: 's1',
        op: 'boss',
        profile: 'p1',
        depth: 0.8,
        name: 'handle',
        why: 'the handle your words asked for, standing off the mug’s side',
      },
    ],
    profiles: [
      { id: 'p1', shape: 'rectangle', plane: 'height', at: 1.2, centre: { x: -5.8, y: -1.3 }, w: 0.6, h: 1.2 },
    ],
  },
  /** …and to *make the handle wider*: the same step, asked for again. */
  wider: {
    steps: [{ id: 't1', op: 'boss', profile: 'p1', depth: 1.2, name: 'handle', why: 'wider, as asked' }],
    profiles: [
      { id: 'p1', shape: 'rectangle', plane: 'height', at: 1.2, centre: { x: -5.8, y: -1.3 }, w: 0.6, h: 1.4 },
    ],
  },
};
(window as unknown as { __mug: typeof MUG }).__mug = MUG;

// ---- ?demo — the done-criterion, drawn -------------------------------------
// P0: "draw a rectangle on the foundation and a circle on the height plane;
// both read as they would on paper; the panel says the plane and why."
// P2: "rectangle + a line up from its edge → a box, instantly, attributed to
// the engine; profile + axis → a revolve." Opening the shard with `?demo`
// draws exactly that, through the same pointer path a hand uses, so the
// criterion can be looked at rather than described. Nothing else uses it.
// `?demo=read` and `?demo=view` draw P1's: a rectangle read onto a box's top
// face with the runner-up chip standing beside it, and view ink gone faint
// from a camera that has left the pose it was drawn at.
const DEMO = new URLSearchParams(location.search).get('demo');

/**
 * Wait for a laid-out canvas — and do NOT wait on paint to do it.
 *
 * A stroke aimed at a viewport of no size lands nowhere, so the demos wait;
 * but a tab the browser is not painting gets no animation frames at all, and a
 * loop that depends on paint is a loop that stops when nobody is looking. So
 * whichever comes first, a frame or a tick, moves it on — the canvas's own
 * lesson (`nextFrame` in `Demos/surface/01-view.js`), applied to the one thing
 * here that used to sit and wait for a frame that never came.
 */
function whenSized(fn: () => void, tries = 60) {
  if (space.canvas.getBoundingClientRect().width > 0 || tries <= 0) return fn();
  let moved = false;
  const again = () => {
    if (moved) return;
    moved = true;
    whenSized(fn, tries - 1);
  };
  requestAnimationFrame(again);
  setTimeout(again, 32);
}
if (DEMO === 'read' || DEMO === 'view') {
  const box = (x: number, y: number, w: number, h: number, per = 22) => {
    const c = [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }];
    const out: Point[] = [];
    for (let i = 0; i < c.length - 1; i++)
      for (let s = 0; s < per; s++) {
        const t = s / per;
        out.push({ x: c[i].x + (c[i + 1].x - c[i].x) * t, y: c[i].y + (c[i + 1].y - c[i].y) * t });
      }
    out.push(c[0]);
    return out;
  };
  const run = (a: Point, b: Point, n = 28) =>
    Array.from({ length: n + 1 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n }));
  const worldLoop = (corners: Vec3[], per = 22) => {
    const out: Vec3[] = [];
    for (let i = 0; i < corners.length; i++) {
      const a = corners[i];
      const b = corners[(i + 1) % corners.length];
      for (let s = 0; s < per; s++) {
        const t = s / per;
        out.push(v3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t));
      }
    }
    out.push(corners[0]);
    return out;
  };
  whenSized(() => {
    const TOP = 2.4;
    choose('foundation');
    hook.strokeScreen(box(-5, -1.6, 4, 2.8).map((p) => hook.screenFor(p)));
    choose('height');
    hook.strokeScreen(run({ x: -5, y: 0 }, { x: -5, y: -TOP }).map((p) => hook.screenFor(p)));
    choose(null);
    if (DEMO === 'read') {
      const id = hook.strokeScreen(
        worldLoop([
          v3(-4.4, TOP, -1.0), v3(-1.6, TOP, -1.0), v3(-1.6, TOP, 0.6), v3(-4.4, TOP, 0.6),
        ]).map((w) => hook.screenForWorld(w))
      );
      if (id) panel.show(id, selection.current());
    } else {
      // A circle drawn in clear air beside the box: view ink, on the plane
      // through the cursor facing the camera — then the camera leaves, and it
      // is the same circle seen edge-on. This is the Blender pair John sent
      // (16 September 2026): a thin, FULLY DRAWN ellipse from away, the circle
      // again from its own view. Ordinary world geometry, opaque either way.
      const c = hook.screenForWorld(v3(2.2, 1.4, 1.6));
      const id = hook.strokeScreen(
        Array.from({ length: 65 }, (_, i) => {
          const t = (i / 64) * Math.PI * 2;
          return { x: c.x + Math.cos(t) * 78, y: c.y + Math.sin(t) * 78 };
        })
      );
      // Far enough to see it edge-on. Nothing about the ink changes; what
      // changes is only where you are standing.
      hook.orbit(0.9, 0.12);
      if (id) panel.show(id, selection.current());
    }
  });
}

// P4: "draw the box's side profile with a bump; the diff names the missing
// region; *Add it* extrudes it; the diff then reads clean." `?demo=diff` draws
// the first half of that — the box, and the side profile with the bump on it —
// and leaves the solid selected, so the panel's *matches the drawing* row is
// standing with the region named and the field offering *Add it*.
if (DEMO === 'diff') {
  const box = (x: number, y: number, w: number, h: number, per = 22) => {
    const c = [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }];
    const out: Point[] = [];
    for (let i = 0; i < c.length - 1; i++)
      for (let s = 0; s < per; s++) {
        const t = s / per;
        out.push({ x: c[i].x + (c[i + 1].x - c[i].x) * t, y: c[i].y + (c[i + 1].y - c[i].y) * t });
      }
    out.push(c[0]);
    return out;
  };
  const run = (a: Point, b: Point, n = 28) =>
    Array.from({ length: n + 1 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n }));
  /** A closed outline through corners, densified the way a hand leaves a path. */
  const loop = (corners: Point[], per = 14) => {
    const out: Point[] = [];
    for (let i = 0; i < corners.length; i++) {
      const a = corners[i];
      const b = corners[(i + 1) % corners.length];
      for (let s = 0; s < per; s++) {
        const t = s / per;
        out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }
    out.push(corners[0]);
    return out;
  };
  whenSized(() => {
    choose('foundation');
    hook.strokeScreen(box(-7, -2, 4, 2.6).map((p) => hook.screenFor(p)));
    choose('height');
    hook.strokeScreen(run({ x: -7, y: 0 }, { x: -7, y: -2.4 }).map((p) => hook.screenFor(p)));
    // The SIDE view first: the width plane is then flat on to the eye, which is
    // what makes drawing a side profile something a hand can actually do.
    // On that plane +u runs along −Z and +v runs down, so the box's own side
    // view is u ∈ [−0.6, 2], v ∈ [−2.4, 0] — and the bump stands out of its
    // right-hand edge.
    space.view('side');
    choose('width');
    const id = hook.strokeScreen(
      loop([
        { x: -0.6, y: 0 },
        { x: 2, y: 0 },
        { x: 2, y: -0.8 },
        { x: 2.7, y: -0.8 },
        { x: 2.7, y: -1.6 },
        { x: 2, y: -1.6 },
        { x: 2, y: -2.4 },
        { x: -0.6, y: -2.4 },
      ]).map((p) => hook.screenFor(p))
    );
    // …and back to a view where the box is a box, so the ink standing on its
    // own plane beside the body is visible for what it is.
    space.view('free');
    if (id) panel.show(id, selection.current());
    report();
  });
}

// P5: "draw three unnamed profiles; type *a castle with green turret tops*".
// `?demo=castle` draws the three views — the plan on the foundation, the keep's
// front with a narrow tower rising off its corner and a roof on that, and the
// side — and leaves the MASSING standing, selected, in the engine's name, with
// the field ready for the brief. No model is asked: that is the whole point of
// the package, and it is the human's next act.
if (DEMO === 'castle') {
  const loop = (corners: Point[], per = 14) => {
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
  whenSized(() => {
    choose('foundation');
    hook.strokeScreen(loop(CASTLE.plan).map((p) => hook.screenFor(p)));
    choose('height');
    space.view('front');
    hook.strokeScreen(loop(CASTLE.front).map((p) => hook.screenFor(p)));
    choose('width');
    space.view('side');
    hook.strokeScreen(loop(CASTLE.side).map((p) => hook.screenFor(p)));
    space.view('free');
    choose(null);
    report();
  });
}

// P6: "save the mug as *mug*; draw its profile elsewhere; *mug 0.8x* is
// offered and one tap places it." `?demo=mug` runs the whole two-minute demo
// (§9, steps 1–5 and the naming half of 6) and leaves the finished board
// standing: a mug with a hole and a handle, and a second mug placed from the
// library where its plan was drawn again. A stub model is seated, because
// steps 4 and 5 ask one — and nothing else here does.
if (DEMO === 'mug') {
  const loop = (corners: Point[], per = 14) => {
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
  const box = (x: number, y: number, w: number, h: number) =>
    loop([{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }], 22);
  const run = (a: Point, b: Point, n = 28) =>
    Array.from({ length: n + 1 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n }));
  const ringOnFace = (n = 56) =>
    Array.from({ length: n + 1 }, (_, i) => {
      const t = (i / n) * Math.PI * 2;
      return hook.screenForWorld(
        v3(MUG.hole.at.x + Math.cos(t) * MUG.hole.r, MUG.hole.at.y, MUG.hole.at.z + Math.sin(t) * MUG.hole.r)
      );
    });
  const settle = () => new Promise((r) => setTimeout(r, 140));
  whenSized(() => {
    void (async () => {
      // 1 · the foundation, and the plan.
      choose('foundation');
      hook.strokeScreen(box(MUG.plan.x, MUG.plan.z, MUG.plan.w, MUG.plan.d).map((p) => hook.screenFor(p)));
      // 2 · the height plane, and a line up from a corner. The box stands.
      choose('height');
      hook.strokeScreen(run({ x: MUG.plan.x, y: 0 }, { x: MUG.plan.x, y: -MUG.top }).map((p) => hook.screenFor(p)));
      // 3 · un-choose, orbit, and a circle on the top face → *Cut a hole*.
      // Round and a little up, to the three-quarter angle this demo has always
      // shown — azimuth 77.6°, elevation 59.6°: you look into the cup, then you
      // draw the hole. The numbers changed on 16 Sep 2026 and the picture did
      // not. An orbit used to move the target onto its pivot, so a pair of
      // radians meant something different in a sentence about the camera;
      // turning about the view's centre, the same pose is (0.664, 0.035). The
      // e2e's step 3 carries the same pair and says what happens off it.
      choose(null);
      hook.orbit(0.664, 0.035);
      hook.strokeScreen(ringOnFace());
      hook.field('Cut a hole');
      // 4 · the brief. A stub, so the demo is a demo and not a call.
      hook.joinStub([JSON.stringify(MUG.reply), JSON.stringify(MUG.wider)]);
      hook.field('a mug with a wide handle');
      await settle();
      // 5 · the side view, the handle profile drawn wider than the model made
      //     it, and the regen that resolves the diff by name.
      space.view('side');
      choose('width');
      hook.strokeScreen(loop(MUG.side).map((p) => hook.screenFor(p)));
      hook.field('make the handle wider');
      await settle();
      // 6 · name it, take it — and the names are yours.
      space.view('free');
      choose(null);
      hook.field('name: mug');
      hook.field('Take it');
      // …then draw its plan again, elsewhere, and place what the library offers.
      choose('foundation');
      const again = hook.strokeScreen(
        box(MUG.again.x, MUG.again.z, MUG.again.w, MUG.again.d).map((p) => hook.screenFor(p))
      );
      if (again) hook.place('mug', again);
      choose(null);
      report();
    })();
  });
}

if (new URLSearchParams(location.search).has('demo') && !DEMO) {
  const dense = (uv: Point[]) => uv.map((p) => hook.screenFor(p));
  const box = (x: number, y: number, w: number, h: number, per = 22) => {
    const c = [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }];
    const out: Point[] = [];
    for (let i = 0; i < c.length - 1; i++)
      for (let s = 0; s < per; s++) {
        const t = s / per;
        out.push({ x: c[i].x + (c[i + 1].x - c[i].x) * t, y: c[i].y + (c[i + 1].y - c[i].y) * t });
      }
    out.push(c[0]);
    return out;
  };
  const ring = (cx: number, cy: number, r: number, n = 72) =>
    Array.from({ length: n + 1 }, (_, i) => {
      const t = (i / n) * Math.PI * 2;
      return { x: cx + Math.cos(t) * r, y: cy + Math.sin(t) * r };
    });
  const run = (a: Point, b: Point, n = 30) =>
    Array.from({ length: n + 1 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n }));
  // Wait for a laid-out canvas: a tab that is not on screen yet has none, and
  // a stroke aimed at a viewport of no size lands nowhere.
  whenSized(() => {
    // 1 · a rectangle on the foundation — a profile.
    choose('foundation');
    hook.strokeScreen(dense(box(-7, -2, 4, 2.6)));
    // 2 · a line up from its near edge, on the height plane — an extent.
    //     The box stands at once: tier 1, no field, no wait.
    choose('height');
    hook.strokeScreen(dense(run({ x: -7, y: 0 }, { x: -7, y: -2.4 })));
    // 3 · a circle and a line beside it, both on the height plane — a revolve.
    hook.strokeScreen(dense(ring(2, -2, 0.8)));
    hook.strokeScreen(dense(run({ x: 4, y: -0.4 }, { x: 4, y: -3.6 })));
    // Stand back far enough to see both, through the same wheel a hand turns.
    for (let i = 0; i < 3; i++)
      space.canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true }));
  });
}

// `?live=shard&relay=http://127.0.0.1:8020` — the canvas's own way in, and the
// seat follows, because a hand that opened the page in a room meant to use it.
//
// **At the END of the file, with the demo, not beside `createModels`.** Up
// there this runs during module evaluation, and `report()` reads chrome that is
// declared further down — so it threw into a promise nobody was awaiting, the
// room joined, the seat silently did not, and nothing said why.
if (LIVE.has('live')) {
  void enterRoom().then((r) => {
    if (r) models.joinHand(r);
  });
}

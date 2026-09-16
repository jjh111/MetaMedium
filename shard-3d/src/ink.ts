// ===== ink =====
// A stroke, projected live onto the plane it lands on.
//
// Pen-down resolves the plane through the one seam (`planeForPenDown`) and
// raycasts to it; every move is projected onto that plane, so the stroke is
// flat by construction and there is no free-space ink (invariant 1). The
// points that go into the log are the PLANE's (u, v) — the engine reads a
// drawing on the ground exactly as it reads one on paper.
//
// Ink is never covered (invariant 3): the drawn line is what stays on the
// plane, and a clean form the engine offers is a dashed ghost in front of it,
// for a moment, never a replacement.

import * as THREE from 'three';
// Real line width: WebGL ignores `linewidth` on a plain THREE.Line, and a
// hairline is not ink. Line2 draws the stroke as screen-space quads.
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { Point } from 'metamedium-core';
import type { Space } from './scene';
import type { Colours } from './theme';
import type { Log, Mark } from './log';
import {
  planeForPenDown,
  poseAngle,
  rayPlane,
  scaleAt,
  toPlane,
  toWorld,
  normalize,
  mul,
  add,
  type Plane,
  type PenState,
} from './plane';
import {
  candidatesFor,
  pickAtPenDown,
  projectOnto,
  rank,
  type PenScope,
  type PlaneCandidate,
} from './planarity';

/** How far above the plane the line is drawn, so it does not fight the grid. */
const LIFT = 0.004;
/** The offer stands for a moment, not forever (v10 F4). */
const OFFER_MS = 4000;
/**
 * How far the camera may turn from a view stroke's own pose before that ink
 * goes faint, in degrees (§12: whether art is drawn faint from other angles or
 * not at all is John's — this is faint, and the two numbers are named so the
 * other choice is one edit).
 */
export const VIEW_TOLERANCE_DEG = 14;
/** What view ink drawn from another angle is worth: there, and clearly not here. */
export const VIEW_FAINT_OPACITY = 0.22;

export interface Ink {
  group: THREE.Group;
  /** Rebuild the scene's ink from the log — the mesh is derived, always. */
  sync(): void;
  paint(c: Colours): void;
  /** Which mark a screen point is over, or null. */
  pick(screen: Point): string | null;
  /** Highlight a mark (hover / the panel's subject). */
  highlight(id: string | null): void;
  drawing(): boolean;
  /** True when this mark's plane is a view the camera has left — it is drawn faint. */
  faded(id: string): boolean;
}

/** The stroke's plane points, lifted just off the plane, as a flat XYZ array. */
function worldPoints(plane: Plane, points: Point[]): number[] {
  const n = mul(normalize(plane.normal), LIFT);
  const out: number[] = [];
  for (const p of points) {
    const w = add(toWorld(plane, p), n);
    out.push(w.x, w.y, w.z);
  }
  return out;
}

export interface InkOptions {
  space: Space;
  log: Log;
  colours: Colours;
  /** What the gizmo holds when the pen goes down. */
  pen(): PenState;
  /**
   * Everything the scorer may read where the pen came down — the faces under
   * it, the stroke before, the world origins, where the view plane sits. The
   * surface owns the solids and the log, so it builds the scope; `ink.ts`
   * only asks for it, and `planarity.ts` does the reading.
   */
  scope(screen: Point): PenScope;
  /** True when the pointer landed on the gizmo, so the pen must not draw. */
  claimed(e: PointerEvent): boolean;
  onStroke(id: string, mark: Mark | null): void;
  onHover(id: string | null): void;
}

export function createInk(o: InkOptions): Ink {
  const { space, log } = o;
  let cols = o.colours;
  const group = new THREE.Group();
  group.name = 'ink';
  space.scene.add(group);

  // Committed ink, one line per mark, keyed by the node id. Derived from the
  // log on every change — so undo needs no bookkeeping of its own.
  const lines = new Map<string, Line2>();
  const ghosts = new Map<string, { line: Line2; until: number }>();

  // The stroke in progress: not in the log yet, so not a mark yet. The SCREEN
  // path is kept beside the plane points, because the plane is not settled
  // until pen-up (§3, deferred commitment) and a screen path is what every
  // candidate is read from.
  let live: {
    plane: Plane;
    scale: number;
    points: Point[];
    screen: Point[];
    candidates: PlaneCandidate[];
    /** The pen-down evidence, kept so the re-rank reads the same scope the pick did. */
    scope: PenScope | null;
    line: Line2;
    id: number;
  } | null = null;
  let hovered: string | null = null;

  const materials: LineMaterial[] = [];

  function hand(): LineMaterial {
    const m = new LineMaterial({
      color: new THREE.Color(cols.strokeHand).getHex(),
      linewidth: 2.4,
      transparent: true,
      opacity: 1,
    });
    materials.push(m);
    return m;
  }

  /** Every screen-space line needs the viewport it is measured against. */
  function resolve() {
    const size = new THREE.Vector2();
    space.renderer.getSize(size);
    for (const m of materials) m.resolution.set(size.x, size.y);
  }
  window.addEventListener('resize', () => { resolve(); space.render(); });

  function lineFor(plane: Plane, points: Point[], material: LineMaterial): Line2 {
    const geo = new LineGeometry();
    // LineGeometry needs at least a segment; a single point is a degenerate one.
    const flat = points.length > 1 ? worldPoints(plane, points) : worldPoints(plane, [points[0], points[0]]);
    geo.setPositions(flat);
    const line = new Line2(geo, material);
    line.renderOrder = 10;
    resolve();
    return line;
  }

  function reshape(line: Line2, plane: Plane, points: Point[]) {
    const flat = points.length > 1 ? worldPoints(plane, points) : worldPoints(plane, [points[0], points[0]]);
    (line.geometry as LineGeometry).setPositions(flat);
    line.computeLineDistances();
    line.geometry.computeBoundingSphere();
  }

  // ---- derived: the scene's ink is a function of the log --------------------
  function sync() {
    const marks = log.marks();
    const seen = new Set<string>();
    for (const m of marks) {
      seen.add(m.id);
      const existing = lines.get(m.id);
      if (existing) {
        reshape(existing, m.plane, m.points);
        continue;
      }
      const line = lineFor(m.plane, m.points, hand());
      line.userData = { mark: m.id };
      lines.set(m.id, line);
      group.add(line);
    }
    for (const [id, line] of [...lines]) {
      if (seen.has(id)) continue;
      group.remove(line);
      line.geometry.dispose();
      lines.delete(id);
      dropGhost(id);
    }
    highlight(hovered);
    space.render();
  }

  function dropGhost(id: string) {
    const g = ghosts.get(id);
    if (!g) return;
    group.remove(g.line);
    g.line.geometry.dispose();
    ghosts.delete(id);
  }

  /**
   * The engine's clean form, offered as a dashed ghost for a few seconds —
   * the offer, not a commitment. The hand's ink stays exactly where it is.
   */
  function offer(id: string) {
    const clean = log.offerFor(id);
    const mark = log.markOf(id);
    if (!clean || !mark) return;
    const mat = new LineMaterial({
      color: new THREE.Color(cols.strokeOffer).getHex(),
      linewidth: 1.6,
      dashed: true,
      dashSize: 0.12,
      gapSize: 0.08,
      transparent: true,
      opacity: 0.9,
    });
    materials.push(mat);
    const pts = clean.closed ? [...clean.points, clean.points[0]] : clean.points;
    const line = lineFor(mark.plane, pts, mat);
    line.computeLineDistances();
    line.renderOrder = 11;
    ghosts.set(id, { line, until: performance.now() + OFFER_MS });
    group.add(line);
    setTimeout(() => {
      dropGhost(id);
      space.render();
    }, OFFER_MS);
  }

  function paint(c: Colours) {
    cols = c;
    lines.forEach((l) => (l.material as LineMaterial).color.set(cols.strokeHand));
    ghosts.forEach((g) => (g.line.material as LineMaterial).color.set(cols.strokeOffer));
    if (live) (live.line.material as LineMaterial).color.set(cols.strokeHand);
    highlight(hovered);
  }

  /**
   * Ink is never covered (invariant 3).
   *
   * A solid grows OUT of the plane its profile lies on, so the profile's ink
   * ends up flush with a face or inside the solid, and a depth test would hide
   * the very mark the thing was made from. The marks a solid was made from are
   * therefore drawn with the depth test off — always visible from every angle —
   * and faint, because on a face the ink is subordinate to the face. The solid's
   * material carries a polygon offset besides, so a coplanar face never fights.
   */
  function faintFor(id: string): boolean {
    return !!log.solidFor(id);
  }

  /**
   * View ink is held WITH A POSE (§3): a stroke on the view plane only means
   * anything from the view it was drawn on, so it is sharp while the camera is
   * within VIEW_TOLERANCE_DEG of that pose and faint otherwise — there, and
   * clearly not here. Never hidden: nothing is thrown away because the canvas
   * could not read it, and ink is never covered.
   */
  function faded(id: string): boolean {
    const mark = log.markOf(id);
    if (!mark || mark.plane.source !== 'view' || !mark.pose) return false;
    return poseAngle(mark.pose, space.pose()) > VIEW_TOLERANCE_DEG;
  }

  function highlight(id: string | null) {
    hovered = id;
    lines.forEach((l, key) => {
      const m = l.material as LineMaterial;
      const onFace = faintFor(key);
      const away = faded(key);
      m.color.set(key === id ? cols.sigRead : cols.strokeHand);
      m.linewidth = key === id ? 3.4 : onFace || away ? 1.5 : 2.4;
      // Faint enough that the face is a face and not a pane of glass, dark
      // enough to be read from any angle: the ink is on the face, not in it.
      m.opacity = key === id ? 1 : away ? VIEW_FAINT_OPACITY : onFace ? 0.3 : 1;
      // The depth test is OFF for the ink a solid was made from, and the cost
      // — a box that reads a little like glass — is the one the README calls
      // John's to overturn. It was tried (Sept 2026) and it does not come off:
      // see *Ink is never covered, on a face*. A solid grows AWAY from the
      // plane its profile lies on, so with the test on, that ink is on the one
      // face you are never looking at, and the hand is shown nothing.
      m.depthTest = !onFace;
      l.renderOrder = onFace ? 12 : 10;
    });
    space.render();
  }

  // The camera moving changes which view ink is at home — so the pass that
  // decides sharp from faint runs on every camera change, not only on a stroke.
  space.onChange(() => highlight(hovered));

  function pick(screen: Point): string | null {
    const rect = space.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((screen.x - rect.left) / rect.width) * 2 - 1,
      -((screen.y - rect.top) / rect.height) * 2 + 1
    );
    const caster = new THREE.Raycaster();
    caster.params.Line2 = { threshold: 6 }; // screen pixels, as Line2 measures
    caster.setFromCamera(ndc, space.camera);
    const hits = caster.intersectObjects([...lines.values()], false);
    const first = hits[0]?.object as THREE.Object3D | undefined;
    return (first?.userData as { mark?: string } | undefined)?.mark ?? null;
  }

  // ---- the pen -------------------------------------------------------------
  const screenOf = (e: PointerEvent): Point => ({ x: e.clientX, y: e.clientY });

  function project(plane: Plane, screen: Point): Point | null {
    const world = rayPlane(space.rayFor(screen), plane);
    return world ? toPlane(plane, world) : null;
  }

  space.canvas.addEventListener('pointerdown', (e) => {
    if (space.orbiting() || e.button !== 0 || o.claimed(e)) return;
    const screen = screenOf(e);
    // The plane is fixed at pen-down from the PEN-DOWN evidence alone — there
    // is no stroke to read yet — and the stroke is projected live onto it so
    // it stays flat (§3). The candidates are built here and re-ranked at
    // pen-up against the whole path: deferred commitment.
    const base = o.pen();
    let candidates: PlaneCandidate[] = [];
    let scope: PenScope | null = null;
    if (!base.chosen) {
      scope = o.scope(screen);
      const all = candidatesFor(scope);
      const first = pickAtPenDown(scope, all);
      candidates = [first, ...all.filter((c) => c !== first)];
    }
    const plane = planeForPenDown({ ...base, candidates });
    const at = project(plane, screen);
    if (!at) return; // the plane runs parallel to the eye here — nothing to draw on
    // The scale the hand worked at: plane units per screen pixel AT THE PEN.
    // Under perspective this varies with depth, so it is measured here and
    // logged with the stroke (CLAUDE.md, "thresholds are about the HAND").
    const scale = scaleAt(plane, space.rayFor, screen);
    const line = lineFor(plane, [at], hand());
    group.add(line);
    live = { plane, scale, points: [at], screen: [screen], candidates, scope, line, id: e.pointerId };
    // A synthesized pointer (the test hook) has no active capture to take.
    try { space.canvas.setPointerCapture(e.pointerId); } catch { /* not a live pointer */ }
    space.render();
  });

  space.canvas.addEventListener('pointermove', (e) => {
    if (!live || e.pointerId !== live.id) {
      if (!live) {
        const id = pick(screenOf(e));
        if (id !== hovered) o.onHover(id);
      }
      return;
    }
    const screen = screenOf(e);
    const at = project(live.plane, screen);
    if (!at) return;
    const last = live.points[live.points.length - 1];
    if (Math.hypot(at.x - last.x, at.y - last.y) < live.scale * 0.5) return; // half a pixel
    live.points.push(at);
    live.screen.push(screen);
    reshape(live.line, live.plane, live.points);
    space.render();
  });

  /**
   * Pen-up: the re-rank (§3, "at pen-up the read planes are re-ranked with the
   * full fingerprint — deferred commitment").
   *
   * The plane the stroke was drawn on was picked from where the pen was; now
   * there is a stroke, and the strongest evidence there is — what it READS as
   * on each candidate — can be had. The kept screen path is cast onto every
   * candidate, every candidate is scored and says why, and the winner is the
   * plane the stroke is logged on. All of them are held in the plane rep, so
   * the panel lists them and the chip offers the runner-up.
   */
  function finish() {
    if (!live) return;
    const { plane, scale, points, screen, candidates, scope, line } = live;
    group.remove(line);
    line.geometry.dispose();
    live = null;
    if (points.length < 2) {
      space.render();
      o.onStroke('', null);
      return;
    }
    const pose = space.pose();
    let final = plane;
    let finalPoints = points;
    let finalScale = scale;
    let ranked: PlaneCandidate[] | undefined;

    if (candidates.length && scope) {
      ranked = rank({
        candidates,
        screen,
        ray: space.rayFor,
        look: space.look(),
        previous: scope.previous,
        at: scope.at,
        recentWindowMs: scope.recentWindowMs,
      });
      const win = ranked.find((c) => !c.oblique) ?? ranked[0];
      const projected = win ? projectOnto(win.plane, screen, space.rayFor) : null;
      if (win && projected) {
        final = { ...win.plane, why: win.reasoning };
        finalPoints = projected;
        finalScale = scaleAt(win.plane, space.rayFor, screen[Math.floor(screen.length / 2)]);
      }
    }

    const id = log.add(finalPoints, final, finalScale, Date.now(), { screen, pose, candidates: ranked });
    sync();
    offer(id);
    o.onStroke(id, log.markOf(id));
  }

  space.canvas.addEventListener('pointerup', (e) => {
    if (live && e.pointerId === live.id) finish();
  });
  space.canvas.addEventListener('pointercancel', (e) => {
    if (live && e.pointerId === live.id) finish();
  });

  log.subscribe(sync);

  return { group, sync, paint, pick, highlight, faded, drawing: () => live !== null };
}

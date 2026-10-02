// A circle on a box's top face is a FEATURE — from every pose you can draw on.
//
// The pen path end to end, headless: a box (the mug's own numbers), a camera at
// a pose named in degrees, the circle drawn by the screen path the demo uses,
// the candidates built and re-ranked exactly as `ink.ts` does it, and the
// stroke logged with them. What comes back is `log.formOf(id)` — row 3, read by
// the shard's own code and not by the test's.
//
// It exists because of a pose. At elevation 74.8° / azimuth 56.8° — where the
// mug demo's old orbit numbers landed — step 3 failed and its neighbours a few
// degrees either side passed:
//
//   * the pen's ray meets the box TWICE, and `solids.facesAt` offers both (the
//     near one and what is behind it). The exit face's reported normal points
//     away from the pen, so it is negated — and the underside of the box comes
//     back with the top's normal, under the top's own name;
//   * both are then scored by the same formula on parallel planes, where the
//     screen path casts to the same shape at the same facing with the same
//     continuity and (when the far face's box happens to hold the cast ink)
//     the same anchor. The two numbers agreed to fifteen significant digits
//     and the order was decided by the last bits of a float;
//   * the underside won that coin toss, the ink was re-projected 1.8 units
//     off the box, and row 3 measured it against the wrong face's bounds.
//
// So the sweep below is the real test and the pose is its first case: what a
// hand draws on the top of a box is a feature at every angle the gate lets a
// face take the stroke, and where it does not, the view plane keeps the shape
// and says so.

import { describe, it, expect } from 'vitest';
import type { Point } from 'metamedium-core';
import { createLog } from './log';
import {
  candidatesFor,
  pickAtPenDown,
  projectOnto,
  rank,
  FACING_TAKES,
  TIE,
  type FaceRef,
  type PenScope,
  type PlaneCandidate,
} from './planarity';
import {
  add,
  cross,
  dot,
  mul,
  normalize,
  scaleAt,
  sub,
  v3,
  type RayCaster,
  type Vec3,
} from './plane';

// ---- the box, in the demo's own numbers ------------------------------------
// `MUG` in `main.ts`: the plan is 2.4 square at x ∈ [−7, −4.6], z ∈ [−1.2, 1.2],
// extruded to y = 2.4, and the hole is a circle of r = 0.85 at the middle of
// the top face. Repeated here rather than imported: `main.ts` is the surface
// and touches the DOM at load.
const BOX = { minX: -7, maxX: -4.6, minY: 0, maxY: 2.4, minZ: -1.2, maxZ: 1.2 };
const HOLE = { at: v3(-5.8, 2.4, 0), r: 0.85 };
const SOLID = 'artifact:7';

/** The demo's own stroke: the hole as a world circle on the top face. */
function holeWorld(n = 56): Vec3[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    return v3(HOLE.at.x + Math.cos(t) * HOLE.r, HOLE.at.y, HOLE.at.z + Math.sin(t) * HOLE.r);
  });
}

// ---- a camera, the way `scene.ts` stands one up ----------------------------
// Spherical about a target: position = target + dist·(cos φ sin θ, sin φ,
// cos φ cos θ), which is `scene.ts`'s own line. A pinhole is all the shard ever
// asks of a camera — a ray per screen point, and a screen point per world
// point — so there is no three.js in here.

const DEFAULT_DIST = 15; // `DEFAULT_DIST` in `scene.ts`

function camera(elevationDeg: number, azimuthDeg: number, dist = DEFAULT_DIST, target = v3(0, 0, 0), focal = 800) {
  const phi = (elevationDeg * Math.PI) / 180;
  const theta = (azimuthDeg * Math.PI) / 180;
  const pos = add(target, v3(dist * Math.cos(phi) * Math.sin(theta), dist * Math.sin(phi), dist * Math.cos(phi) * Math.cos(theta)));
  const forward = normalize(sub(target, pos));
  const right = normalize(cross(forward, v3(0, 1, 0)));
  const up = normalize(cross(right, forward));
  const ray: RayCaster = (s) => ({
    origin: pos,
    direction: normalize(add(add(mul(forward, focal), mul(right, s.x)), mul(up, -s.y))),
  });
  const project = (w: Vec3): Point => {
    const d = sub(w, pos);
    const z = dot(d, forward);
    return { x: (focal * dot(d, right)) / z, y: (-focal * dot(d, up)) / z };
  };
  return { pos, ray, project, look: forward, up };
}

// ---- the faces under the pen, as `solids.facesAt` hands them over ----------

const SIDES: { normal: Vec3; at: (b: typeof BOX) => number; axis: 'x' | 'y' | 'z' }[] = [
  { normal: v3(-1, 0, 0), at: (b) => b.minX, axis: 'x' },
  { normal: v3(1, 0, 0), at: (b) => b.maxX, axis: 'x' },
  { normal: v3(0, -1, 0), at: (b) => b.minY, axis: 'y' },
  { normal: v3(0, 1, 0), at: (b) => b.maxY, axis: 'y' },
  { normal: v3(0, 0, -1), at: (b) => b.minZ, axis: 'z' },
  { normal: v3(0, 0, 1), at: (b) => b.maxZ, axis: 'z' },
];

function cornersOf(side: (typeof SIDES)[number]): Vec3[] {
  const c = side.at(BOX);
  if (side.axis === 'x') return [v3(c, BOX.minY, BOX.minZ), v3(c, BOX.minY, BOX.maxZ), v3(c, BOX.maxY, BOX.maxZ), v3(c, BOX.maxY, BOX.minZ)];
  if (side.axis === 'y') return [v3(BOX.minX, c, BOX.minZ), v3(BOX.minX, c, BOX.maxZ), v3(BOX.maxX, c, BOX.maxZ), v3(BOX.maxX, c, BOX.minZ)];
  return [v3(BOX.minX, BOX.minY, c), v3(BOX.minX, BOX.maxY, c), v3(BOX.maxX, BOX.maxY, c), v3(BOX.maxX, BOX.minY, c)];
}

/**
 * The faces the pen's ray met, nearest first — two of them, which is what
 * `FACES_OFFERED` in `solid.ts` offers ("the near one and what is behind it").
 *
 * **The reported normal is negated when it points away from the pen**, exactly
 * as `facesAt` does it (the mesh's material is double-sided, so a hit from
 * behind reports the normal pointing away). That is why the exit face arrives
 * calling itself the top: replicated here rather than tidied, because it is
 * what the scorer is handed.
 */
function facesUnderPen(ray: ReturnType<typeof camera>['ray'], pen: Point): FaceRef[] {
  const { origin, direction } = ray(pen);
  const hits: { t: number; side: (typeof SIDES)[number] }[] = [];
  for (const side of SIDES) {
    const d = dot(direction, side.normal);
    if (Math.abs(d) < 1e-9) continue;
    const t = dot(sub(mul(side.normal, side.at(BOX)), origin), side.normal) / d;
    if (t <= 0) continue;
    const p = add(origin, mul(direction, t));
    const on =
      p.x >= BOX.minX - 1e-6 && p.x <= BOX.maxX + 1e-6 &&
      p.y >= BOX.minY - 1e-6 && p.y <= BOX.maxY + 1e-6 &&
      p.z >= BOX.minZ - 1e-6 && p.z <= BOX.maxZ + 1e-6;
    if (on) hits.push({ t, side });
  }
  hits.sort((a, b) => a.t - b.t);
  return hits.slice(0, 2).map(({ t, side }) => {
    const n = dot(side.normal, direction) > 0 ? mul(side.normal, -1) : side.normal;
    return { solidId: SOLID, at: add(origin, mul(direction, t)), normal: n, corners: cornersOf(side) };
  });
}

// ---- the pen, as `ink.ts` runs it ------------------------------------------

interface Drawn {
  id: string;
  win: PlaneCandidate;
  ranked: PlaneCandidate[];
}

/**
 * Pen down, draw, pen up — the loop in `ink.ts`, with nothing chosen: the
 * candidates from the pen-down evidence, the live plane picked from them, the
 * re-rank at pen-up against the whole path, and the winner logged with every
 * candidate it beat.
 */
function drawOnBox(log: ReturnType<typeof createLog>, cam: ReturnType<typeof camera>, world: Vec3[], at = 1000): Drawn {
  const screen = world.map(cam.project);
  const pen = screen[0];
  const faces = facesUnderPen(cam.ray, pen);
  const touched = faces[0]?.at;
  const scope: PenScope = {
    chosen: null,
    pen,
    ray: cam.ray,
    look: cam.look,
    cameraUp: cam.up,
    faces,
    previous: null,
    worldOrigins: touched
      ? { foundation: touched, height: touched, width: touched, where: `through the point the pen came down on (${SOLID})` }
      : {},
    viewAnchor: touched ?? v3(0, 0, 0),
    viewAnchorWhy: touched ? `at the depth of ${SOLID} under the pen` : "at the gizmo's own origin",
    at,
    recentWindowMs: 1500,
  };
  const all = candidatesFor(scope);
  const first = pickAtPenDown(scope, all);
  const candidates = [first, ...all.filter((c) => c !== first)];
  const ranked = rank({ candidates, screen, ray: cam.ray, look: cam.look, previous: null, at, recentWindowMs: 1500 });
  const win = ranked.find((c) => !c.oblique) ?? ranked[0];
  const points = projectOnto(win.plane, screen, cam.ray)!;
  const scale = scaleAt(win.plane, cam.ray, screen[Math.floor(screen.length / 2)]);
  const id = log.add(points, { ...win.plane, why: win.reasoning }, scale, at, { screen, candidates: ranked });
  return { id, win, ranked };
}

/** How face-on the top of the box is from a pose — the number the gate reads. */
const facingTop = (cam: ReturnType<typeof camera>) => Math.abs(dot(v3(0, 1, 0), cam.look));

describe('a circle on a box’s top face', () => {
  it('plays a feature at elevation 74.8° / azimuth 56.8° — the pose the mug demo could not use', () => {
    const cam = camera(74.789, 56.789);
    const log = createLog();
    const { id, win, ranked } = drawOnBox(log, cam, holeWorld());
    const form = log.formOf(id)!;

    expect(win.plane.source).toBe('face');
    // The plane that won is the TOP of the box — y = 2.4 — and not the face
    // the ray left through.
    expect(win.plane.origin.y).toBeCloseTo(BOX.maxY, 3);
    expect(form.role).toBe('feature');
    expect(form.rule).toBe(3);
    expect(form.targets).toContain(SOLID);
    // And the argument is still there to have: the runner-up is offered.
    expect(ranked.length).toBeGreaterThan(1);
  });

  it('is decided by the table and not by a float where the two faces score the same', () => {
    // The defect, stated as the number it was. Both faces of the box come back
    // under the top's own name (the exit face's normal is negated), and the
    // screen path casts onto parallel planes as the same shape at the same
    // facing with the same continuity — so whenever the far face's own box
    // holds the cast ink and its anchor saturates too, the two confidences come
    // out EQUAL, to the last bit. Which of them a comparison of two doubles
    // puts first is evidence about nothing. The near face — the one the pen
    // came down on — has to lead by the table's own order at every one of them.
    const tied: string[] = [];
    const wrong: string[] = [];
    for (let elevation = 60; elevation <= 85; elevation += 5) {
      for (let azimuth = 0; azimuth < 360; azimuth += 15) {
        const { ranked } = drawOnBox(createLog(), camera(elevation, azimuth), holeWorld());
        const faces = ranked.filter((c) => c.plane.source === 'face');
        if (faces.length !== 2) continue;
        if (Math.abs(faces[0].confidence - faces[1].confidence) >= TIE) continue;
        tied.push(`elevation ${elevation}° · azimuth ${azimuth}°`);
        if (Math.abs(faces[0].plane.origin.y - BOX.maxY) > 1e-3) {
          wrong.push(`elevation ${elevation}° · azimuth ${azimuth}° → led with the face at y ${faces[0].plane.origin.y.toFixed(2)}`);
        }
      }
    }
    // The knife edge is real: if this ever comes back empty the test has
    // stopped covering the thing it was written for.
    expect(tied.length).toBeGreaterThan(0);
    expect(wrong).toEqual([]);
  });

  it('plays a feature a few degrees either side of it — the knife edge, not one pose', () => {
    // "Neighbours a few degrees either side are fine" is what made this a
    // fragility rather than a bad pose: nothing about 74.8° / 56.8° is special
    // except where the last bits of two doubles landed. So the whole
    // neighbourhood is the test, and a pose that misses is named.
    const missed: string[] = [];
    for (const de of [-3, -2, -1, 0, 1, 2, 3]) {
      for (const da of [-3, -2, -1, 0, 1, 2, 3]) {
        const elevation = 74.789 + de;
        const azimuth = 56.789 + da;
        const log = createLog();
        const { id, win } = drawOnBox(log, camera(elevation, azimuth), holeWorld());
        const form = log.formOf(id)!;
        if (win.plane.source !== 'face' || form.role !== 'feature') {
          missed.push(
            `elevation ${elevation.toFixed(1)}° · azimuth ${azimuth.toFixed(1)}° → ` +
              `${win.label} (${win.plane.source}) at y ${win.plane.origin.y.toFixed(2)}, plays ${form.role} by row ${form.rule}`
          );
        }
      }
    }
    expect(missed).toEqual([]);
  });

  it('is read against the face the winning plane IS, whatever order the candidates came in', () => {
    // Row 3's own regression: `formMarkOf` used to take the face's extent off
    // `candidates[0]`. Hand the log the same winner with the candidates in the
    // other order and the reading must not move.
    const cam = camera(74.789, 56.789);
    const a = createLog();
    const { id, ranked } = drawOnBox(a, cam, holeWorld());
    const mark = a.markOf(id)!;
    expect(a.formOf(id)!.role).toBe('feature');

    const b = createLog();
    const shuffled = [ranked[0], ...ranked.slice(1).reverse()];
    const other = b.add(mark.points, mark.plane, mark.scale, 1000, { screen: mark.screen, candidates: shuffled });
    expect(b.formOf(other)!.role).toBe('feature');
  });

  /**
   * The sweep. Elevation 30°–85°, azimuth every 15°: above the gate the circle
   * is a feature at every one of them; below it the view plane keeps the stroke
   * at the size it was drawn and says why. A pose that misses is NAMED here —
   * the assertion is not loosened to let one through.
   */
  it('plays a feature from every pose the gate lets a face take the stroke', () => {
    const missed: string[] = [];
    const conserved: string[] = [];
    let gated = 0;
    let taken = 0;

    for (let elevation = 30; elevation <= 85; elevation += 5) {
      for (let azimuth = 0; azimuth < 360; azimuth += 15) {
        const cam = camera(elevation, azimuth);
        const log = createLog();
        const { id, win, ranked } = drawOnBox(log, cam, holeWorld());
        const form = log.formOf(id)!;
        const where = `elevation ${elevation}° · azimuth ${azimuth}° (top face ${facingTop(cam).toFixed(2)} face-on)`;

        if (facingTop(cam) >= FACING_TAKES) {
          taken++;
          if (win.plane.source !== 'face' || form.role !== 'feature') {
            missed.push(`${where} → ${win.label} (${win.plane.source}), plays ${form.role} by row ${form.rule}`);
          }
        } else {
          gated++;
          // Below the gate the top face is held, said out loud and offered by
          // the chip — and it does not take the stroke (THE GATE, §2.1). What
          // does is the view plane, or another plane that IS face-on from here
          // (a world plane square to this camera is a reading, not a stretch);
          // what it may never be is the solid's own face, and the circle is
          // never a feature on a face too oblique to have taken it.
          // The face the pen came DOWN on — the top — not whichever face
          // sorted first among the ones the gate and the far side hold back.
          const face = ranked.find((c) => c.plane.source === 'face' && !c.behind);
          if (win.plane.source === 'face') {
            conserved.push(`${where} → took ${win.label} (face) though the gate holds it`);
          } else if (form.role === 'feature') {
            conserved.push(`${where} → plays a feature on a plane that is ${win.plane.source}`);
          } else if (!face?.gated || !/too oblique to take the stroke/.test(face.reasoning)) {
            conserved.push(`${where} → the face was not held with a reason: "${face?.reasoning ?? 'no face candidate'}"`);
          } else if (win.plane.source === 'view' && !/shape conserved/.test(win.reasoning)) {
            conserved.push(`${where} → the view plane won without saying what it conserves`);
          }
        }
      }
    }

    expect(taken).toBeGreaterThan(0);
    expect(gated).toBeGreaterThan(0);
    expect(missed).toEqual([]);
    expect(conserved).toEqual([]);
  });

  it('says, at a gated pose, that the face is too oblique to take the stroke', () => {
    // 35° above the horizon: the top face is 0.57 face-on, well under the gate.
    const cam = camera(35, 56.789);
    expect(facingTop(cam)).toBeLessThan(FACING_TAKES);
    const log = createLog();
    const { id, win, ranked } = drawOnBox(log, cam, holeWorld());
    expect(win.plane.source).toBe('view');
    const face = ranked.find((c) => c.plane.source === 'face')!;
    expect(face.gated).toBe(true);
    expect(face.reasoning).toMatch(/too oblique to take the stroke/);
    // It is not a feature — and it is not silently one either: the mark is
    // held as what the table places it as, said out loud.
    expect(log.formOf(id)!.role).not.toBe('feature');
    expect(log.formOf(id)!.reasoning).toBeTruthy();
  });
});

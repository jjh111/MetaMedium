// The form rung's table (SHARD-3D-PLAN §2.3).
//
// The table is the library, not a predicate hidden in a function, so the tests
// state a mark and read back which ROW placed it and what it said. Every input
// is a mark on a plane in plane units — the same thing the log holds — and
// every threshold under test is a ratio of the marks' own size, so nothing
// here mentions a pixel.

import { describe, it, expect } from 'vitest';
import type { Point } from 'metamedium-core';
import {
  assignForms,
  featuresFrom,
  makeableFrom,
  scratchAgainst,
  SCRATCH_CROSSINGS,
  type FormMark,
} from './form';
import { foundation, height, v3, width, type Plane } from './plane';

function rect(x: number, y: number, w: number, h: number, per = 20): Point[] {
  const c = [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }];
  const out: Point[] = [];
  for (let i = 0; i < c.length - 1; i++)
    for (let s = 0; s < per; s++) {
      const t = s / per;
      out.push({ x: c[i].x + (c[i + 1].x - c[i].x) * t, y: c[i].y + (c[i + 1].y - c[i].y) * t });
    }
  out.push(c[0]);
  return out;
}

function ring(cx: number, cy: number, r: number, n = 48): Point[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    return { x: cx + Math.cos(t) * r, y: cy + Math.sin(t) * r };
  });
}

const run = (a: Point, b: Point, n = 20): Point[] =>
  Array.from({ length: n + 1 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n }));

const size = (pts: Point[]) => {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  return Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
};

/** A rectangle on the foundation: u = world X, v = world Z. */
const profileMark = (id = 'stroke:1'): FormMark => {
  const points = rect(-7, -2, 4, 2.6);
  return { id, shape: 'rectangle', confidence: 0.88, closed: true, plane: foundation(), points, size: size(points) };
};

/**
 * A line on the HEIGHT plane (XY, normal +Z, +v down) from world (-7, 0, 0) —
 * which lies exactly on that rectangle's left edge — up to (-7, 2.4, 0).
 */
const extentMark = (id = 'stroke:2'): FormMark => {
  const points = run({ x: -7, y: 0 }, { x: -7, y: -2.4 });
  return { id, shape: 'line', confidence: 0.95, closed: false, plane: height(), points, size: size(points) };
};

describe('row 2 — profile', () => {
  it('a closed rectangle on a chosen plane, nothing inside it, is a profile', () => {
    const [r] = assignForms({ marks: [profileMark()] });
    expect(r.role).toBe('profile');
    expect(r.rule).toBe(2);
    expect(r.confidence).toBeGreaterThan(0.8);
    expect(r.reasoning).toMatch(/closed rectangle/);
    expect(r.reasoning).toMatch(/foundation/);
    expect(r.reasoning).toMatch(/the face a solid grows from/);
  });

  it('a circle on the height plane is a profile too — the row is about closure, not about which shape', () => {
    const points = ring(2, -2, 0.8);
    const [r] = assignForms({
      marks: [{ id: 'stroke:1', shape: 'circle', confidence: 0.9, closed: true, plane: height(), points, size: size(points) }],
    });
    expect(r.role).toBe('profile');
  });

  it('a closed mark with another inside it is STILL a profile — the massing unions a plane\'s profiles (P5)', () => {
    const outer = profileMark('stroke:1');
    const innerPts = rect(-6, -1.5, 1, 1);
    const inner: FormMark = {
      id: 'stroke:2', shape: 'rectangle', confidence: 0.85, closed: true,
      plane: foundation(), points: innerPts, size: size(innerPts),
    };
    const roles = assignForms({ marks: [outer, inner] });
    // Row 2's *nothing inside it* clause used to refuse BOTH marks of a nest,
    // and it threw out the commonest plan there is: a castle's footprint with
    // its turrets' footprints inside it. §2.3's clause is about a FACE (row 3),
    // so the nest is reported rather than refused.
    expect(roles[0].role).toBe('profile');
    expect(roles[0].rule).toBe(2);
    expect(roles[0].reasoning).toMatch(/1 profile inside it \(stroke:2\)/);
    expect(roles[0].reasoning).toMatch(/union of a plane's profiles/);
    expect(roles[1].role).toBe('profile');
    expect(roles[1].reasoning).toMatch(/nothing inside it/);
  });
});

describe('row 4 — extent', () => {
  it('a line starting on a profile edge and leaving its plane is an extent of it', () => {
    const roles = assignForms({ marks: [profileMark(), extentMark()] });
    expect(roles[0].role).toBe('profile');
    const e = roles[1];
    expect(e.role).toBe('extent');
    expect(e.rule).toBe(4);
    expect(e.targets).toEqual(['stroke:1']);
    expect(e.reasoning).toMatch(/lies on stroke:1's edge/);
    expect(e.reasoning).toMatch(/perpendicular|square to/);
    expect(e.reasoning).toMatch(/a dimension along the normal/);
  });

  it('a line that touches nothing is not an extent', () => {
    const far = extentMark();
    const moved: FormMark = { ...far, points: run({ x: 8, y: 0 }, { x: 8, y: -2.4 }) };
    const roles = assignForms({ marks: [profileMark(), moved] });
    expect(roles[1].role).toBe('annotation');
  });

  it('a line touching the profile but lying IN its plane is not an extent — it never leaves it', () => {
    // On the foundation, running along the rectangle's own edge.
    const points = run({ x: -7, y: -2 }, { x: -7, y: 0.6 });
    const inPlane: FormMark = {
      id: 'stroke:2', shape: 'line', confidence: 0.95, closed: false,
      plane: foundation(), points, size: size(points),
    };
    const roles = assignForms({ marks: [profileMark(), inPlane] });
    expect(roles[1].role).not.toBe('extent');
  });
});

describe('row 5 — axis', () => {
  const circle = (): FormMark => {
    const points = ring(2, -2, 0.8);
    return { id: 'stroke:1', shape: 'circle', confidence: 0.9, closed: true, plane: height(), points, size: size(points) };
  };
  const axis = (): FormMark => {
    const points = run({ x: 4, y: -0.4 }, { x: 4, y: -3.6 });
    return { id: 'stroke:2', shape: 'line', confidence: 0.95, closed: false, plane: height(), points, size: size(points) };
  };

  it('a line beside a profile, in its plane, parallel to an edge, is an axis', () => {
    const roles = assignForms({ marks: [circle(), axis()] });
    const a = roles[1];
    expect(a.role).toBe('axis');
    expect(a.rule).toBe(5);
    expect(a.targets).toEqual(['stroke:1']);
    expect(a.reasoning).toMatch(/lying in stroke:1's own plane/);
    expect(a.reasoning).toMatch(/what a profile revolves around/);
  });

  it('a line THROUGH the profile is not an axis — it crosses it', () => {
    const through: FormMark = { ...axis(), points: run({ x: 2, y: -0.4 }, { x: 2, y: -3.6 }) };
    const roles = assignForms({ marks: [circle(), through] });
    expect(roles[1].role).not.toBe('axis');
  });

  it('a line far away from the profile is not an axis — beside is a ratio of the profile\'s own size', () => {
    const far: FormMark = { ...axis(), points: run({ x: 14, y: -0.4 }, { x: 14, y: -3.6 }) };
    const roles = assignForms({ marks: [circle(), far] });
    expect(roles[1].role).toBe('annotation');
  });

  it('row 4 is read before row 5: a line that could be either is an extent', () => {
    // The extent line is also roughly parallel to the foundation rectangle's
    // v edge when projected — but it leaves the plane, and row 4 comes first.
    const roles = assignForms({ marks: [profileMark(), extentMark()] });
    expect(roles[1].role).toBe('extent');
  });
});

describe('the fallthrough — annotation, said out loud', () => {
  it('an open stroke that crosses nothing is an annotation, and says which plane it is on', () => {
    const points = run({ x: 6, y: 6 }, { x: 8, y: 7 });
    const roles = assignForms({
      marks: [{ id: 'stroke:9', shape: 'arc', confidence: 0.6, closed: false, plane: width(), points, size: size(points) }],
    });
    expect(roles[0].role).toBe('annotation');
    expect(roles[0].rule).toBe(0);
    expect(roles[0].reasoning).toMatch(/width/);
    expect(roles[0].reasoning).toMatch(/held as a comment, or as art/);
  });

  it('every mark gets exactly one reading, in the order it was given', () => {
    const marks = [profileMark(), extentMark()];
    const roles = assignForms({ marks });
    expect(roles.map((r) => r.id)).toEqual(marks.map((m) => m.id));
  });
});

// ===== P3 ===================================================================

/**
 * The top face of a box standing on the foundation: a horizontal plane at
 * y = 2.4 with the face's own extent, as the plane read gives it (`face`,
 * with the anchor that is the face's own corners).
 */
const topFace = (): Plane => ({
  origin: v3(0, 2.4, 0),
  normal: v3(0, 1, 0),
  up: v3(0, 0, 1),
  source: 'face',
  name: 'top of artifact:7',
  why: 'the pen came down on the top of artifact:7',
});

/** A circle drawn on that face, well inside it. */
const featureMark = (id = 'stroke:5', r = 0.6, cx = -5, cy = -0.7): FormMark => {
  const points = ring(cx, cy, r);
  return {
    id,
    shape: 'circle',
    confidence: 0.9,
    closed: true,
    plane: topFace(),
    points,
    size: size(points),
    face: { solidId: 'artifact:7', label: 'top of artifact:7', bounds: { minX: -7, minY: -2, maxX: -3, maxY: 0.6 } },
  };
};

describe('row 3 — feature', () => {
  it('a closed shape on a solid\'s face, inside it, plays feature and names the face', () => {
    const [r] = assignForms({ marks: [featureMark()] });
    expect(r.role).toBe('feature');
    expect(r.rule).toBe(3);
    expect(r.targets).toEqual(['artifact:7']);
    expect(r.reasoning).toMatch(/drawn on the top of artifact:7/);
    expect(r.reasoning).toMatch(/inside that face/);
    // The row says out loud that it will NOT act: two intentions, one drawing.
    expect(r.reasoning).toMatch(/a cut or a boss on it, and the drawing does not say which/);
  });

  it('a closed shape half off the edge of the face is not a feature — the plane is infinite, the face is not', () => {
    const off = featureMark('stroke:6', 0.6, -3.1, -0.7); // straddling maxX = -3
    const [r] = assignForms({ marks: [off] });
    expect(r.role).not.toBe('feature');
  });

  it('the same circle on a CHOSEN plane is a profile, not a feature — a face is not a decision', () => {
    const onChosen: FormMark = { ...featureMark(), plane: foundation(), face: undefined };
    const [r] = assignForms({ marks: [onChosen] });
    expect(r.role).toBe('profile');
    expect(r.rule).toBe(2);
  });

  it('a feature is NOT acted on: it affords nothing tier 1 will make by itself', () => {
    expect(makeableFrom(assignForms({ marks: [featureMark()] }))).toEqual([]);
  });

  it('a line off a feature\'s edge is an extent OF THE FEATURE — that is how deep the hole goes', () => {
    // From the face's own plane, straight up on the height plane at the
    // circle's edge: world (-5 + 0.6, 2.4, -0.7) rising.
    const points = run({ x: -4.4, y: -2.4 }, { x: -4.4, y: -4.0 });
    const rise: FormMark = {
      id: 'stroke:6', shape: 'line', confidence: 0.94, closed: false,
      plane: height(), points, size: size(points),
    };
    const roles = assignForms({ marks: [featureMark(), rise] });
    expect(roles[0].role).toBe('feature');
    expect(roles[1].role).toBe('extent');
    expect(roles[1].targets).toEqual(['stroke:5']);
    // …and it still stands no new solid: the extent names a feature, not a profile.
    expect(makeableFrom(roles)).toEqual([]);
    const offers = featuresFrom(roles);
    expect(offers).toEqual([{ featureId: 'stroke:5', solidId: 'artifact:7', extentId: 'stroke:6', reasoning: expect.any(String) }]);
  });
});

describe('row 1 — gesture, the scratch', () => {
  /** A box's silhouette on screen: a closed square of screen points. */
  const hull = (): Point[] => [
    { x: 100, y: 100 }, { x: 300, y: 100 }, { x: 300, y: 260 }, { x: 100, y: 260 }, { x: 100, y: 100 },
  ];

  /**
   * A zigzag across it: `passes` traversals, each one right across and out the
   * far side, starting well clear of the box. One traversal is two crossings —
   * a line drawn THROUGH a thing is safe, which is the rule's whole point.
   */
  const zigzag = (passes: number): Point[] => {
    const corner = (i: number) => ({ x: i % 2 === 0 ? 40 : 360, y: 110 + i * 25 });
    const out: Point[] = [corner(0)];
    for (let i = 0; i < passes; i++) {
      const a = corner(i);
      const b = corner(i + 1);
      for (let s = 1; s <= 8; s++) {
        const t = s / 8;
        out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }
    return out;
  };

  const scratchMark = (screen: Point[], id = 'stroke:9'): FormMark => {
    const points = screen.map((p) => ({ x: p.x / 40, y: p.y / 40 }));
    return {
      id,
      shape: '',
      confidence: 0,
      closed: false,
      plane: { origin: v3(0, 0, 0), normal: v3(0, 0, 1), up: v3(0, -1, 0), source: 'view', name: 'view', why: 'the view plane' },
      points,
      size: size(points),
      screen,
      silhouettes: [{ solidId: 'artifact:7', name: 'box', outline: hull() }],
    };
  };

  it('counts crossings of the silhouette, and three erase it', () => {
    const one = scratchAgainst(scratchMark(zigzag(1)));
    expect(one!.crossings).toBe(2); // in and out: a line THROUGH is safe
    const two = scratchAgainst(scratchMark(zigzag(2)));
    expect(two!.crossings).toBeGreaterThanOrEqual(SCRATCH_CROSSINGS);
  });

  it('a stroke that crosses three times plays gesture and names the solid', () => {
    const [r] = assignForms({ marks: [scratchMark(zigzag(2))] });
    expect(r.role).toBe('gesture');
    expect(r.rule).toBe(1);
    expect(r.targets).toEqual(['artifact:7']);
    expect(r.reasoning).toMatch(/crosses box's silhouette/);
    expect(r.reasoning).toMatch(/3 erases it/);
  });

  it('a single pass through is not a scratch — it crosses twice, and two is safe', () => {
    const [r] = assignForms({ marks: [scratchMark(zigzag(1))] });
    expect(r.role).not.toBe('gesture');
    expect(scratchAgainst(scratchMark(zigzag(1)))!.crossings).toBe(SCRATCH_CROSSINGS - 1);
  });

  it('a CLOSED stroke is never a scratch — it is a lasso', () => {
    const loop = { ...scratchMark(zigzag(3)), closed: true };
    expect(scratchAgainst(loop)).toBeNull();
    expect(assignForms({ marks: [loop] })[0].role).not.toBe('gesture');
  });

  it('ink on that solid\'s own face is never a scratch — it is a feature', () => {
    const onFace: FormMark = {
      ...scratchMark(zigzag(3)),
      face: { solidId: 'artifact:7', label: 'top of artifact:7', bounds: { minX: -9, minY: -9, maxX: 9, maxY: 9 } },
    };
    expect(scratchAgainst(onFace)).toBeNull();
  });

  it('the ink a solid was MADE from is provenance, never a scratch at it', () => {
    const member: FormMark = { ...scratchMark(zigzag(3)), partOf: ['artifact:7'] };
    expect(scratchAgainst(member)).toBeNull();
  });

  it('a stroke with no silhouettes to cross is not a gesture — it is ordinary ink', () => {
    const alone: FormMark = { ...scratchMark(zigzag(3)), silhouettes: undefined };
    expect(scratchAgainst(alone)).toBeNull();
    expect(assignForms({ marks: [alone] })[0].role).toBe('annotation');
  });
});

describe('what the table affords', () => {
  it('a profile with an extent affords an extrude, naming both marks', () => {
    const made = makeableFrom(assignForms({ marks: [profileMark(), extentMark()] }));
    expect(made).toHaveLength(1);
    expect(made[0]).toMatchObject({ kind: 'extrude', profileId: 'stroke:1', extentId: 'stroke:2' });
  });

  it('a profile with an axis affords a revolve', () => {
    const pts = ring(2, -2, 0.8);
    const ax = run({ x: 4, y: -0.4 }, { x: 4, y: -3.6 });
    const made = makeableFrom(
      assignForms({
        marks: [
          { id: 'p', shape: 'circle', confidence: 0.9, closed: true, plane: height(), points: pts, size: size(pts) },
          { id: 'a', shape: 'line', confidence: 0.95, closed: false, plane: height(), points: ax, size: size(ax) },
        ],
      })
    );
    expect(made).toEqual([expect.objectContaining({ kind: 'revolve', profileId: 'p', axisId: 'a' })]);
  });

  it('a profile on its own affords nothing — no depth is ever guessed', () => {
    expect(makeableFrom(assignForms({ marks: [profileMark()] }))).toEqual([]);
  });
});

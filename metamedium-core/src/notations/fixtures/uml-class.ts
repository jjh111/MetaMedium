// The class-diagram boards (V1-PLAN §9 D4, acceptance A2): drawn the way a
// hand draws them — jittered strokes, each class a box with its compartment
// lines drawn as separate strokes, writing inside, heads drawn apart from
// their lines — and what each board should read as.
//
// A2, the acceptance scenario — two classes with compartments and an
// inheritance arrow:
//
//                 +--------------+
//                 |   (Animal)   |      the name's compartment
//                 +--------------+      a compartment line
//                 | (+name ...)  |      two attributes
//                 | (+age ...)   |
//                 +--------------+      a compartment line
//                 | (+eat())     |      one method
//                 +--------------+
//                        /_\            a hollow triangle, drawn apart
//                         |             the line, from the child up
//                 +--------------+
//                 |    (Dog)     |      the child, turned by the variant's tilt
//                 +--------------+
//                 | (+breed ...) |
//                 +--------------+
//                 | (+bark())    |
//                 +--------------+
//
// The bench's board — six classes, five relations, three multiplicities:
//
//                      [ Canvas ]                    two compartment lines
//                          ◆  1                      a filled diamond (outline and a hatch)
//                          |
//                          |  *
//                      [ Shape  ] ◇————— [ Layer ]   aggregation, the hollow diamond at Layer; "0..1" there
//                       /_\   /_\                    Layer is turned by the variant's tilt, one line across it
//                      /         \
//                [ Circle ]    [ Square ]            Square ruled in four strokes, one line across it
//                     |
//                     v                              an open arrow: an association
//                 [ Point ]                          a plain box: a class with only a name
//
// Strokes are drawn four seconds apart, so the letter rules gather none of
// them into a word — except where a variant draws the diamond's hatch within
// the word window on purpose. Everything is deterministic: a variant is a
// seed, a wobble and a tilt.

import type { Point } from '../../types';
import type { Session } from '../../session/session';
import { handLine, handText, handArrow, handPolygon, rng } from '../../test/strokes';
import { handShape, boxCorners, boxInFour } from './hand';

export interface ClassVariant {
  seed: number;
  /** Wobble in px. */
  jitter: number;
  /** How far the turned class is drawn off square, in degrees. */
  tilt: number;
  /** Draw the filled diamond's hatch this soon after its outline, in ms (the word window is 3 s); four seconds when unset. */
  fillAfter?: number;
}

export const CLASS_VARIANTS: ClassVariant[] = [];
for (const seed of [1, 2, 3, 4, 5, 6]) {
  for (const jitter of [1.5, 3]) {
    for (const tilt of [0, 6, 10]) CLASS_VARIANTS.push({ seed: seed * 10 + CLASS_VARIANTS.length, jitter, tilt: seed % 2 ? tilt : -tilt });
  }
}

/** What a class-diagram board should read as — classes and relations by name, each with the marks it is drawn with. */
export interface ClassExpected {
  classes: Record<string, {
    /** The box: its stroke, or the strokes it is ruled with. */
    box: string[];
    /** Its compartment lines, top to bottom. */
    lines: string[];
    /** The writing in its top compartment. */
    name: string[];
    /** The writing below, each line of it one member: the compartment it stands in (2 or 3) and its marks. */
    members: { compartment: number; ids: string[] }[];
  }>;
  relations: {
    name: string;
    /** The line's own stroke. */
    id: string;
    /** It and its heads. */
    ids: string[];
    kind: 'inheritance' | 'composition' | 'aggregation' | 'association' | 'link';
    /** The class at the marked end — the parent, the whole, what is pointed at. */
    to: string;
    from: string;
  }[];
  /** Short writing at a relation's end: its mark, the relation, and the class at that end. */
  multiplicities: { id: string; of: string; at: string }[];
}

// ===== Drawing in a class's own frame =====

const DEG = Math.PI / 180;

/** Points given about a box's centre, turned `tilt` degrees about it, placed at (cx, cy). */
function turned(cx: number, cy: number, tilt: number) {
  const c = Math.cos(tilt * DEG), s = Math.sin(tilt * DEG);
  return (p: Point): Point => ({ x: cx + p.x * c - p.y * s, y: cy + p.x * s + p.y * c });
}

/** A hollow triangle drawn apart: its apex at `apex`, pointing along `dir`, `len` long — a closed stroke. */
export function triangleHead(apex: Point, dir: Point, len: number, o: { seed: number; jitter?: number }): Point[] {
  const l = Math.hypot(dir.x, dir.y) || 1;
  const u = { x: dir.x / l, y: dir.y / l };
  const base = { x: apex.x - u.x * len, y: apex.y - u.y * len };
  const half = len * 0.6;
  const v = { x: -u.y * half, y: u.x * half };
  return handPolygon([apex, { x: base.x + v.x, y: base.y + v.y }, { x: base.x - v.x, y: base.y - v.y }], { seed: o.seed, jitter: o.jitter ?? 1, round: 0.08, density: 0.6, startAt: 0.15 });
}

/** A diamond drawn apart: its far tip at `tip`, pointing along `dir`, `len` long and `0.64 len` wide — a closed stroke. */
export function diamondHead(tip: Point, dir: Point, len: number, o: { seed: number; jitter?: number }): Point[] {
  const l = Math.hypot(dir.x, dir.y) || 1;
  const u = { x: dir.x / l, y: dir.y / l };
  const back = { x: tip.x - u.x * len, y: tip.y - u.y * len };
  const m = { x: (tip.x + back.x) / 2, y: (tip.y + back.y) / 2 };
  const half = len * 0.32;
  const v = { x: -u.y * half, y: u.x * half };
  return handPolygon([tip, { x: m.x + v.x, y: m.y + v.y }, back, { x: m.x - v.x, y: m.y - v.y }], { seed: o.seed, jitter: o.jitter ?? 1, round: 0.08, density: 0.6, startAt: 0.1 });
}

/** A hatch filling a diamond drawn by `diamondHead` with the same tip, direction and length: a zigzag across its inside. */
export function hatchIn(tip: Point, dir: Point, len: number, o: { seed: number }): Point[] {
  const l = Math.hypot(dir.x, dir.y) || 1;
  const u = { x: dir.x / l, y: dir.y / l };
  const v = { x: -u.y, y: u.x };
  const r = rng(o.seed);
  const pts: Point[] = [];
  const n = 7;
  for (let i = 0; i <= n; i++) {
    const a = 0.12 + (0.76 * i) / n;
    const along = { x: tip.x - u.x * len * a, y: tip.y - u.y * len * a };
    // Inside its outline, as a careful hand fills it: a hatch crossing a wobbly outline three times is a scratch, and erases it (session.ts).
    const w = len * 0.32 * (1 - Math.abs(a - 0.5) * 2) * 0.6;
    const side = i % 2 ? 1 : -1;
    pts.push({ x: along.x + v.x * w * side + (r() - 0.5), y: along.y + v.y * w * side + (r() - 0.5) });
  }
  return pts;
}

interface ClassDrawn {
  box: string[];
  lines: string[];
  /** A place in the class's own frame — about its centre, before its tilt — on the board. */
  at: (p: Point) => Point;
}

/**
 * A class: its box (one stroke, or ruled in four), and a compartment line at
 * each of `lines` — shares of its height from the top — drawn across it from
 * side to side, a few pixels short or past each side as a hand draws them.
 */
function drawClass(
  draw: (pts: Point[]) => string,
  c: { cx: number; cy: number; w: number; h: number; lines: number[]; tilt?: number; ruled?: boolean },
  o: { seed: number; jitter: number; startAt: number }
): ClassDrawn {
  const tilt = c.tilt ?? 0;
  const at = turned(c.cx, c.cy, tilt);
  const r = rng(o.seed * 17 + 5);
  const corners = boxCorners(c.cx, c.cy, c.w, c.h, tilt);
  const box = c.ruled ? boxInFour(corners, { seed: o.seed, jitter: o.jitter * 0.6 }).map((pts) => draw(pts)) : [draw(handShape(corners, { seed: o.seed, jitter: o.jitter, startAt: o.startAt }))];
  const lines = c.lines.map((share, k) => {
    const y = -c.h / 2 + share * c.h;
    const miss = () => (r() - 0.45) * 8; // a few pixels short of the side, or past it
    return draw(handLine(at({ x: -c.w / 2 + miss(), y }), at({ x: c.w / 2 - miss(), y: y + (r() - 0.5) * 3 }), { seed: o.seed * 7 + k, jitter: o.jitter * 0.6 }));
  });
  return { box, lines, at };
}

/** A scribble of writing in a class's own frame: `w` × `h`, its top-left at (x, y) from the class's centre. */
function writingIn(k: ClassDrawn, x: number, y: number, w: number, h: number, seed: number): Point[] {
  return handText(x, y, w, h, { seed, humps: Math.max(2, Math.round(w / 20)), jitter: 1 }).map((p) => k.at(p));
}

// ===== A2: two classes and an inheritance arrow =====

/** What a model that can see reads A2's writing as, by what it is. */
export const A2_WORDS = {
  Animal: { name: 'Animal', members: ['+name: String', '+age: int', '+eat()'] },
  Dog: { name: 'Dog', members: ['+breed: String', '+bark()'] },
};

/** Draw A2 on a session: Animal above, Dog below it, a hollow triangle at Animal. Returns what it should read as. */
export function drawClassPair(s: Session, v: ClassVariant, t0 = 1000): ClassExpected {
  let t = t0;
  const draw = (pts: Point[]) => s.addStroke(pts, (t += 4000));
  const j = v.jitter;
  const seed = (k: number) => v.seed * 100 + k;
  const start = (k: number) => (v.seed * 0.37 + k * 0.23) % 1;

  const A = drawClass(draw, { cx: 300, cy: 150, w: 220, h: 170, lines: [40 / 170, 110 / 170] }, { seed: seed(1), jitter: j, startAt: start(1) });
  const B = drawClass(draw, { cx: 300, cy: 470, w: 220, h: 150, lines: [40 / 150, 95 / 150], tilt: v.tilt }, { seed: seed(2), jitter: j, startAt: start(2) });
  // The line from Dog's top up to the triangle's base; the triangle's apex on Animal's bottom.
  const apex = { x: 300, y: 236 };
  const from = B.at({ x: 0, y: -75 });
  const dir = { x: apex.x - from.x, y: apex.y - from.y };
  const l = Math.hypot(dir.x, dir.y);
  const base = { x: apex.x - (dir.x / l) * 24, y: apex.y - (dir.y / l) * 24 };
  const line = draw(handLine({ x: from.x - (dir.x / l) * 2, y: from.y - (dir.y / l) * 2 }, base, { seed: seed(3), jitter: j * 0.6 }));
  const head = draw(triangleHead(apex, dir, 24, { seed: seed(4), jitter: Math.min(1.5, j * 0.5) }));

  const aName = draw(writingIn(A, -40, -80, 80, 22, seed(11)));
  const aAttr1 = draw(writingIn(A, -96, -38, 118, 18, seed(12)));
  const aAttr2 = draw(writingIn(A, -96, -10, 92, 18, seed(13)));
  const aMethod = draw(writingIn(A, -96, 42, 76, 18, seed(14)));
  const bName = draw(writingIn(B, -26, -66, 52, 22, seed(15)));
  const bAttr = draw(writingIn(B, -96, -26, 124, 18, seed(16)));
  const bMethod = draw(writingIn(B, -96, 34, 72, 18, seed(17)));

  return {
    classes: {
      Animal: { box: A.box, lines: A.lines, name: [aName], members: [{ compartment: 2, ids: [aAttr1] }, { compartment: 2, ids: [aAttr2] }, { compartment: 3, ids: [aMethod] }] },
      Dog: { box: B.box, lines: B.lines, name: [bName], members: [{ compartment: 2, ids: [bAttr] }, { compartment: 3, ids: [bMethod] }] },
    },
    relations: [{ name: 'extends', id: line, ids: [line, head], kind: 'inheritance', to: 'Animal', from: 'Dog' }],
    multiplicities: [],
  };
}

// ===== The bench's board =====

/** What a model that can see reads the bench board's writing as, by class and by multiplicity. */
export const DIAGRAM_WORDS = {
  Canvas: { name: 'Canvas', members: ['-shapes: Shape[]', '+draw()'] },
  Shape: { name: 'Shape', members: ['#x: int', '#y: int', '+area() double', '+move(dx, dy)'] },
  Layer: { name: 'Layer', members: ['+visible: bool'] },
  Circle: { name: 'Circle', members: ['-r: double', '+area() double'] },
  Square: { name: 'Square', members: ['-side: double'] },
  Point: { name: 'Point', members: [] as string[] },
};

/** …and its multiplicities, in the order `drawClassDiagram` lists them: "1" and "*" on the composition, "0..1" on the aggregation. */
export const DIAGRAM_MULTIPLICITIES = ['1', '*', '0..1'];

/** Draw the bench's class diagram on a session. Returns what it should read as. */
export function drawClassDiagram(s: Session, v: ClassVariant, t0 = 1000): ClassExpected {
  let t = t0;
  const draw = (pts: Point[], gap = 4000) => s.addStroke(pts, (t += gap));
  const j = v.jitter;
  const seed = (k: number) => v.seed * 100 + k;
  const start = (k: number) => (v.seed * 0.37 + k * 0.23) % 1;

  const Canvas = drawClass(draw, { cx: 450, cy: 90, w: 200, h: 130, lines: [34 / 130, 84 / 130] }, { seed: seed(1), jitter: j, startAt: start(1) });
  const Shape = drawClass(draw, { cx: 450, cy: 360, w: 220, h: 170, lines: [40 / 170, 104 / 170] }, { seed: seed(2), jitter: j, startAt: start(2) });
  const Layer = drawClass(draw, { cx: 860, cy: 360, w: 180, h: 120, lines: [42 / 120], tilt: v.tilt }, { seed: seed(3), jitter: j, startAt: start(3) });
  const Circle = drawClass(draw, { cx: 250, cy: 700, w: 200, h: 150, lines: [40 / 150, 94 / 150] }, { seed: seed(4), jitter: j, startAt: start(4) });
  const Square = drawClass(draw, { cx: 650, cy: 700, w: 180, h: 110, lines: [42 / 110], ruled: true }, { seed: seed(5), jitter: j, startAt: start(5) });
  const Point = drawClass(draw, { cx: 250, cy: 960, w: 160, h: 60, lines: [] }, { seed: seed(6), jitter: j, startAt: start(6) });

  const lineTo = (a: Point, b: Point, k: number) => draw(handLine(a, b, { seed: seed(k), jitter: j * 0.6 }));
  const toward = (a: Point, b: Point, len: number) => {
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    return { x: b.x - ((b.x - a.x) / l) * len, y: b.y - ((b.y - a.y) / l) * len };
  };
  const small = Math.min(1.5, j * 0.5);

  // Circle and Square each inherit from Shape: a line from the child's top, a hollow triangle at Shape's bottom.
  const apex1 = { x: 400, y: 446 }, from1 = Circle.at({ x: 0, y: -75 });
  const inh1 = lineTo(from1, toward(from1, apex1, 24), 21);
  const tri1 = draw(triangleHead(apex1, { x: apex1.x - from1.x, y: apex1.y - from1.y }, 24, { seed: seed(22), jitter: small }));
  const apex2 = { x: 505, y: 446 }, from2 = Square.at({ x: 0, y: -55 });
  const inh2 = lineTo(from2, toward(from2, apex2, 24), 23);
  const tri2 = draw(triangleHead(apex2, { x: apex2.x - from2.x, y: apex2.y - from2.y }, 24, { seed: seed(24), jitter: small }));
  // Canvas is composed of Shapes: a filled diamond at Canvas's bottom, its line down to Shape's top.
  const tip = { x: 450, y: 156 }, up = { x: 0, y: -1 };
  const comp = lineTo({ x: 450, y: 272 }, { x: 450, y: 184 }, 25);
  const dia1 = draw(diamondHead(tip, up, 28, { seed: seed(26), jitter: small }));
  const fill = draw(hatchIn(tip, up, 28, { seed: seed(27) }), v.fillAfter ?? 4000);
  // A Layer holds Shapes: a hollow diamond at Layer's left side, its line from Shape's right.
  const tip2 = Layer.at({ x: -91, y: 0 });
  const agg = lineTo({ x: 562, y: 360 }, toward({ x: 562, y: 360 }, tip2, 28), 28);
  const dia2 = draw(diamondHead(tip2, { x: tip2.x - 562, y: tip2.y - 360 }, 28, { seed: seed(29), jitter: small }));
  // A Circle has a Point: an open arrow down from Circle to Point.
  const assoc = draw(handArrow({ x: 250, y: 778 }, { x: 250, y: 927 }, { wings: 2, headLen: 16, seed: seed(30), jitter: j * 0.6 }));

  const w = (k: ClassDrawn, x: number, y: number, ww: number, h: number, n: number) => draw(writingIn(k, x, y, ww, h, seed(n)));
  const cName = w(Canvas, -34, -61, 68, 22, 41), cAttr = w(Canvas, -90, -26, 116, 18, 42), cMethod = w(Canvas, -90, 24, 64, 18, 43);
  const sName = w(Shape, -32, -80, 64, 22, 44), sAttr1 = w(Shape, -96, -38, 60, 18, 45), sAttr2 = w(Shape, -96, -12, 60, 18, 46), sMethod1 = w(Shape, -96, 26, 110, 18, 47), sMethod2 = w(Shape, -96, 52, 104, 18, 48);
  const lName = w(Layer, -30, -54, 60, 22, 49), lAttr = w(Layer, -80, -2, 112, 18, 50);
  const ciName = w(Circle, -32, -67, 64, 22, 51), ciAttr = w(Circle, -86, -26, 84, 18, 52), ciMethod = w(Circle, -86, 28, 110, 18, 53);
  const sqName = w(Square, -34, -48, 68, 22, 54), sqAttr = w(Square, -76, 0, 106, 18, 55);
  const pName = w(Point, -30, -11, 60, 22, 56);

  // Multiplicities: "1" at Canvas's end of the composition and "*" at Shape's, "0..1" at Layer's end of the aggregation.
  const one = draw(handText(464, 162, 12, 16, { seed: seed(61), humps: 2, jitter: 1 }));
  const many = draw(handText(462, 244, 14, 14, { seed: seed(62), humps: 2, jitter: 1 }));
  const zero = draw(handText(tip2.x - 58, tip2.y - 30, 28, 16, { seed: seed(63), humps: 3, jitter: 1 }));

  return {
    classes: {
      Canvas: { box: Canvas.box, lines: Canvas.lines, name: [cName], members: [{ compartment: 2, ids: [cAttr] }, { compartment: 3, ids: [cMethod] }] },
      Shape: { box: Shape.box, lines: Shape.lines, name: [sName], members: [{ compartment: 2, ids: [sAttr1] }, { compartment: 2, ids: [sAttr2] }, { compartment: 3, ids: [sMethod1] }, { compartment: 3, ids: [sMethod2] }] },
      Layer: { box: Layer.box, lines: Layer.lines, name: [lName], members: [{ compartment: 2, ids: [lAttr] }] },
      Circle: { box: Circle.box, lines: Circle.lines, name: [ciName], members: [{ compartment: 2, ids: [ciAttr] }, { compartment: 3, ids: [ciMethod] }] },
      Square: { box: Square.box, lines: Square.lines, name: [sqName], members: [{ compartment: 2, ids: [sqAttr] }] },
      Point: { box: Point.box, lines: Point.lines, name: [pName], members: [] },
    },
    relations: [
      { name: 'Circle extends Shape', id: inh1, ids: [inh1, tri1], kind: 'inheritance', to: 'Shape', from: 'Circle' },
      { name: 'Square extends Shape', id: inh2, ids: [inh2, tri2], kind: 'inheritance', to: 'Shape', from: 'Square' },
      { name: 'Canvas is made of Shapes', id: comp, ids: [comp, dia1, fill], kind: 'composition', to: 'Canvas', from: 'Shape' },
      { name: 'a Layer holds Shapes', id: agg, ids: [agg, dia2], kind: 'aggregation', to: 'Layer', from: 'Shape' },
      { name: 'a Circle has a Point', id: assoc, ids: [assoc], kind: 'association', to: 'Point', from: 'Circle' },
    ],
    multiplicities: [
      { id: one, of: 'Canvas is made of Shapes', at: 'Canvas' },
      { id: many, of: 'Canvas is made of Shapes', at: 'Shape' },
      { id: zero, of: 'a Layer holds Shapes', at: 'Layer' },
    ],
  };
}

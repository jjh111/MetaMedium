// The maths of a mark.
//
// A circle has a centre and a radius; a line has a length and a heading; a
// triangle has three angles that add to 180°. The shape rung says WHAT a mark
// is; this says what follows from that, measured from the ink — the part of a
// drawing a child can be shown and an engineer can check. It was the most
// loved thing about the 2025 prototype and the thing the engine had dropped.
//
// Measured from the clean form where one is held, else from the ink's own
// fingerprint, in world units. Nothing here is a reading: no confidence, no
// competing candidates. It is arithmetic on a reading that already exists.
//
// **In units, when numbers are written on the mark** (MATHS-PLAN.md §4, M4).
// Handed the board's maths (`solveBoard`, maths/solve.ts), a mark that
// carries labels also says its measures in the drawing's unit — what was
// labelled, what was derived and by which formula, the labels that cannot
// hold and by how much, the other consistent readings, what the ink says at
// the drawing's scale — and `describeMaths` speaks them. A mark that carries
// no labels measures exactly as it always has.

import type { Point } from '../types';
import type { MMNode } from './nodes';
import { boundsOf, fingerprintOf, getRep, placed, strokePointsOf } from './nodes';
import { cleanPointsOf, idealize, snapReading } from './clean';
import { getBounds, tightestBox } from '../geometry';
import type { LengthUnit } from '../maths/quantity';
import type { BoardMaths, Conflict, SolvedValue } from '../maths/solve';

export interface Measure {
  /** e.g. 'radius', 'length' — stable keys a surface can pick from. */
  key: string;
  /** For people: 'radius'. */
  label: string;
  /** The number, in world units or degrees. */
  value: number;
  unit: 'px' | 'px²' | '°' | '';
  /** Where it sits on the canvas, when it belongs to a place (a vertex angle, a centre). */
  at?: Point;
}

export interface Maths {
  shape: string;
  measures: Measure[];
  // ----- Only when numbers are written on the mark (M4) -----
  /** The unit its drawing speaks. */
  unit?: LengthUnit | null;
  /** Every measure the first reading fixes, in that unit: labelled, declared, derived (with its formula). */
  values?: SolvedValue[];
  /** The labels that cannot hold in the first reading, and by how much. */
  conflicts?: Conflict[];
  /** The other consistent readings, a sentence each. */
  readings?: string[];
  /** What the first reading rests on that is not a fact: a corner that measures right. */
  assumes?: string[];
  /** Parts that make their whole: '21″ and 22″ make 43″ ✓'. */
  checks?: string[];
  /** What the labels leave open, at the drawing's scale — the ink's, never the thing's. */
  ink?: SolvedValue[];
  /** The drawing's scale, and how consistently its labels agree with the ink. */
  scale?: string;
  notes?: string[];
}

/**
 * A measured corner within this many degrees of 90 reads as right — as a
 * READING of the ink, never a fact: a sketched right angle is rarely 90°, so
 * the solver takes a corner as right only when a square declares it or a
 * label says so, and offers a measured one only as *if the corner is right*
 * (maths/solve.ts cites this; nothing restates it).
 */
export const RIGHT_ANGLE_TOLERANCE = 4;

const deg = (rad: number) => (rad * 180) / Math.PI;
const r0 = (v: number) => Math.round(v);
const r1 = (v: number) => Math.round(v * 10) / 10;

/**
 * A box's four corners where the mark stands now — its own top-left,
 * top-right, bottom-right and bottom-left: the clean form it holds, else the
 * one it would be offered (turned, leaning or upright, clean.ts), else the
 * tightest box around its ink.
 */
function boxCorners(node: MMNode, held: Point[] | undefined): Point[] | null {
  if (held?.length === 4) return held;
  const offered = idealize(node, 'rectangle');
  if (offered?.points.length === 4) return placed(node, offered.points);
  const ink = strokePointsOf(node);
  const box = ink && tightestBox(ink);
  if (!box) return null;
  const { centre: c, axis: u, width: w, height: h } = box;
  const at = (su: number, sv: number): Point => ({ x: c.x + (u.x * su * w - u.y * sv * h) / 2, y: c.y + (u.y * su * w + u.x * sv * h) / 2 });
  return [at(-1, -1), at(1, -1), at(1, 1), at(-1, 1)];
}

function angleAt(prev: Point, v: Point, next: Point): number {
  const a = Math.atan2(prev.y - v.y, prev.x - v.x);
  const b = Math.atan2(next.y - v.y, next.x - v.x);
  let d = Math.abs(a - b);
  if (d > Math.PI) d = 2 * Math.PI - d;
  return deg(d);
}

/** A corner's class as the ink measures it: right within `RIGHT_ANGLE_TOLERANCE`, else acute or obtuse. */
export function angleClass(degrees: number): 'right' | 'acute' | 'obtuse' {
  if (Math.abs(degrees - 90) < RIGHT_ANGLE_TOLERANCE) return 'right';
  return degrees < 90 ? 'acute' : 'obtuse';
}

/**
 * What the shape rung's top reading implies, as numbers.
 *
 * Uses the clean form the mark carries or would be offered — so the maths is
 * of the SHAPE, not of the wobble — and falls back to the ink's own bounds
 * and ends for shapes with no clean form. Returns null for marks whose reading
 * is not one geometry can measure (writing, unread ink).
 *
 * With the board's maths (`solveBoard(state)`, computed once for a render and
 * shared by every mark), a mark that carries labels also speaks its drawing's
 * unit; one that carries none is returned exactly as without it.
 */
export function measure(node: MMNode, nodes: ReadonlyMap<string, MMNode>, board?: BoardMaths): Maths | null {
  const plain = measureInk(node, nodes);
  return plain && board ? inUnits(plain, node.id, board) : plain;
}

/** The labels on this mark's figure, solved: merged into its maths, or the maths untouched when it carries none. */
function inUnits(plain: Maths, id: string, board: BoardMaths): Maths {
  const fm = board.figures.find((f) => f.figure.ids.includes(id) && f.labels.some((l) => !l.declared));
  if (!fm) return plain;
  const sol = fm.solution;
  const [top, ...rest] = sol.readings;
  return {
    ...plain,
    unit: sol.unit,
    values: top?.values ?? [],
    conflicts: sol.conflicts,
    readings: rest.map((r) => r.sentence),
    ...(top?.assumes ? { assumes: top.assumes } : {}),
    checks: sol.checks,
    ink: sol.ink,
    ...(fm.drawing?.scale ? { scale: fm.drawing.scale.reason } : {}),
    notes: sol.notes,
  };
}

function measureInk(node: MMNode, nodes: ReadonlyMap<string, MMNode>): Maths | null {
  const fp = fingerprintOf(node);
  if (!fp) return null;
  const reading = snapReading(node, nodes);
  const shape = reading.shape;
  const held = getRep(node, 'clean') ? cleanPointsOf(node) : undefined;
  const ideal = held ?? idealize(node, shape)?.points ?? strokePointsOf(node);
  if (!ideal || ideal.length < 2) return null;
  const b = held ? getBounds(held) : boundsOf(node) ?? getBounds(ideal);
  const w = b.maxX - b.minX, h = b.maxY - b.minY;
  const centre = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
  const m: Measure[] = [];

  switch (shape) {
    case 'circle': {
      const round = Math.min(w, h) / Math.max(1e-6, w, h) > 0.85;
      const r = (w + h) / 4;
      m.push({ key: 'centre', label: 'centre', value: r0(centre.x), unit: '', at: centre });
      m.push({ key: 'centreY', label: 'centre y', value: r0(centre.y), unit: '' });
      if (round) {
        m.push({ key: 'radius', label: 'radius', value: r0(r), unit: 'px' });
        m.push({ key: 'circumference', label: 'circumference', value: r0(2 * Math.PI * r), unit: 'px' });
        m.push({ key: 'area', label: 'area', value: r0(Math.PI * r * r), unit: 'px²' });
      } else {
        m.push({ key: 'rx', label: 'radius x', value: r0(w / 2), unit: 'px' });
        m.push({ key: 'ry', label: 'radius y', value: r0(h / 2), unit: 'px' });
        m.push({ key: 'area', label: 'area', value: r0(Math.PI * (w / 2) * (h / 2)), unit: 'px²' });
      }
      return { shape, measures: m };
    }
    case 'rectangle': {
      // By its sides, at whatever angle it stands — not the upright box around
      // it, which grows as the box turns (a 200×120 box turned 30° has bounds
      // 233×204). Its width is its first side, the one nearer level; its
      // height the distance across to the side opposite; a box drawn leaning
      // (a data symbol) says its lean too.
      const v = boxCorners(node, held);
      if (!v) return null;
      const top = { x: v[1].x - v[0].x, y: v[1].y - v[0].y }, left = { x: v[3].x - v[0].x, y: v[3].y - v[0].y };
      const width = Math.hypot(top.x, top.y), side = Math.hypot(left.x, left.y);
      const area = Math.abs(top.x * left.y - top.y * left.x);
      const height = area / Math.max(1e-6, width);
      const lean = width > 0 && side > 0 ? 90 - deg(Math.acos(Math.min(1, Math.abs(top.x * left.x + top.y * left.y) / (width * side)))) : 0;
      m.push({ key: 'width', label: 'width', value: r0(width), unit: 'px' });
      m.push({ key: 'height', label: 'height', value: r0(height), unit: 'px' });
      m.push({ key: 'perimeter', label: 'perimeter', value: r0(2 * (width + side)), unit: 'px' });
      m.push({ key: 'area', label: 'area', value: r0(area), unit: 'px²' });
      m.push({ key: 'aspect', label: 'aspect', value: r1(width / Math.max(1e-6, height)), unit: '' });
      if (r0(lean) >= 1) m.push({ key: 'lean', label: 'lean', value: r0(lean), unit: '°' });
      return { shape, measures: m };
    }
    case 'triangle': {
      const v = ideal.slice(0, 3);
      if (v.length < 3) return null;
      const sides = [0, 1, 2].map((i) => Math.hypot(v[(i + 1) % 3].x - v[i].x, v[(i + 1) % 3].y - v[i].y));
      const angles = [0, 1, 2].map((i) => angleAt(v[(i + 2) % 3], v[i], v[(i + 1) % 3]));
      angles.forEach((a, i) => m.push({ key: `angle${i}`, label: `angle ${'ABC'[i]} (${angleClass(a)})`, value: r0(a), unit: '°', at: v[i] }));
      sides.forEach((s, i) => m.push({ key: `side${i}`, label: `side ${'ABC'[i]}${'ABC'[(i + 1) % 3]}`, value: r0(s), unit: 'px' }));
      const s = sides.reduce((a, c) => a + c, 0) / 2;
      m.push({ key: 'area', label: 'area', value: r0(Math.sqrt(Math.max(0, s * (s - sides[0]) * (s - sides[1]) * (s - sides[2])))), unit: 'px²' });
      return { shape, measures: m };
    }
    case 'line':
    case 'arrow': {
      const arrow = getRep(node, 'reading:arrow')?.data as { tip?: Point; tail?: Point } | undefined;
      const from = shape === 'arrow' && arrow?.tail ? arrow.tail : fp.start;
      const to = shape === 'arrow' && arrow?.tip ? arrow.tip : fp.end;
      const len = Math.hypot(to.x - from.x, to.y - from.y);
      // Heading as a compass reads it: 0° is to the right, 90° is up (y grows down on a canvas).
      const heading = ((deg(Math.atan2(-(to.y - from.y), to.x - from.x)) % 360) + 360) % 360;
      m.push({ key: 'length', label: 'length', value: r0(len), unit: 'px' });
      m.push({ key: 'heading', label: shape === 'arrow' ? 'points' : 'heading', value: r0(heading), unit: '°' });
      m.push({ key: 'slope', label: 'slope', value: Math.abs(to.x - from.x) < 1e-6 ? Infinity : r1((to.y - from.y) / (to.x - from.x)), unit: '' });
      return { shape, measures: m };
    }
    case 'arc': {
      const pts = ideal;
      const a = pts[0], c = pts[pts.length - 1];
      const chord = Math.hypot(c.x - a.x, c.y - a.y);
      let arcLen = 0;
      for (let i = 1; i < pts.length; i++) arcLen += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      m.push({ key: 'arcLength', label: 'arc length', value: r0(arcLen), unit: 'px' });
      m.push({ key: 'chord', label: 'chord', value: r0(chord), unit: 'px' });
      // Radius from the sagitta: the deepest point off the chord.
      let sag = 0;
      for (const p of pts) {
        const d = Math.abs((c.x - a.x) * (p.y - a.y) - (c.y - a.y) * (p.x - a.x)) / Math.max(1e-6, chord);
        if (d > sag) sag = d;
      }
      if (sag > 1e-6) {
        const r = (chord * chord) / (8 * sag) + sag / 2;
        m.push({ key: 'radius', label: 'radius', value: r0(r), unit: 'px' });
        m.push({ key: 'sweep', label: 'sweep', value: r0(deg(2 * Math.asin(Math.min(1, chord / (2 * r))))), unit: '°' });
      }
      return { shape, measures: m };
    }
    case 'dot': {
      m.push({ key: 'centre', label: 'at', value: r0(centre.x), unit: '', at: centre });
      m.push({ key: 'centreY', label: 'at y', value: r0(centre.y), unit: '' });
      return { shape, measures: m };
    }
    default:
      return null;
  }
}

/**
 * One line per measure, for a status line or a brief: "radius 62px · area
 * 12,076px²". With numbers written on the mark it first says what they make
 * — each derived value with its formula, what cannot hold, the other
 * readings, the parts that check, the ink's offers and the scale — then the
 * ink's measures as before.
 */
export function describeMaths(maths: Maths): string {
  const ink = maths.measures
    .filter((x) => x.key !== 'centreY')
    .map((x) => {
      if (x.key === 'centre' && x.at) return `${x.label} (${r0(x.at.x)}, ${r0(x.at.y)})`;
      const v = Number.isFinite(x.value) ? x.value.toLocaleString('en-US') : '∞';
      return `${x.label} ${v}${x.unit}`;
    })
    .join(' · ');
  if (!maths.values) return ink;
  const said: string[] = [];
  for (const a of maths.assumes ?? []) said.push(a);
  for (const v of maths.values) if (v.from === 'derived') said.push(`${v.label} ${v.text}${v.formula ? ` = ${v.formula}` : ''}`);
  for (const c of maths.conflicts ?? []) said.push(c.reason);
  for (const r of maths.readings ?? []) said.push(`or ${r}`);
  said.push(...(maths.checks ?? []));
  for (const v of maths.ink ?? []) said.push(`${v.label} ${v.text} (the ink’s)`);
  if (maths.scale) said.push(maths.scale);
  said.push(...(maths.notes ?? []));
  return [...said, ink].filter(Boolean).join(' · ');
}

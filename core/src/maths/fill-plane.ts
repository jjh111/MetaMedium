// The plane's fill-ins (MATHS-SPEC §4, §8 Lane C, M19–M21): what a coordinate plane implies, drawn faint where it
// would be written, and taken by a tap as the hand's own act.
//
//   - **A curve drawn on the plane** — Jake's rough parabola — gives two. Its *equation* (`y = x²`, the rounded form
//     when the drawing's own wobble allows it, else the fitted one) stands beside its end as a value a tap writes as
//     text; and *the clean curve* lies dashed beneath the ink — Jake's *renders it properly underneath his sketch* — and
//     a tap along it draws it as ink in the taker's name, declared content. A curve already clean (drawn from this
//     very offer) is not offered itself again, and once its equation is written beside it that offer is gone.
//   - **A function written near the plane** — `y = (x²−4)/(x−2)` as a one-line text — gives its curve, plotted by
//     `plotOn` from what `compileFunction` and `analyseRational` say of it: the line in pieces, a ring where it has a
//     hole, a dashed line where it has an asymptote. Each piece is a fill-in of its own, so the hole is something a
//     tap can reach (M22 plays the approach from it). A curve the hand has already drawn through the same points is
//     not offered a second time.
//   - **A point drawn on the plane** gives its coordinates, *(2, 3)*, as text beside it — except a hole's ring, which a
//     function's curve already names.
//
// One quantity, one colour: a curve's quantity is `fn:<mark or text>`, so the curve, its equation and its hole share a
// hue wherever they stand (`hues.ts` places it for the board like any other). Derived, never logged; no model is
// asked. The plane is read once for the board (`planesIn`), its curves fitted once (`fit.ts`).

import type { Bounds, Point } from '../types';
import type { SessionState } from '../session/session';
import type { FillIn, FillSource } from './fill';
import { planesIn, PLANE_OFFER_FLOOR, axisNameOf } from '../notations/plane';
import type { PlaneCurve, PlanePart } from '../notations/plane';
import { canvasToPlane, planeExtent, planeToCanvas, plotOn } from './plot';
import type { PlaneGeometry, Plot } from './plot';
import { FIT_OFFER_FLOOR } from './fit';
import type { FitReading } from './fit';
import { compileFunction } from './fn';
import { analyseRational } from './poly';
import { sheetLines } from './gather';
import { textBoxOf, FILL_TEXT_PX } from './fill-figure';
import { MAX_TIER0_CONFIDENCE } from '../recognition';

export const PLANE_FILL_ID = 'plane';

/** How strong each kind of fill-in is, 0–1: an equation outranks the clean curve it names; a hole and the written function's curve stand between; a point's coordinates are least. */
export const PLANE_RANK = Object.freeze({ equation: 0.78, curve: 0.62, written: 0.7, hole: 0.66, asymptote: 0.4, point: 0.45 });

/** A stroke is already clean when its rms distance from the curve it was read as is under this many hand pixels (a hand's steadiest tremor is several times it; a curve drawn by a tap, a fraction). */
export const CLEAN_PX = 0.35;
/** Ink a tap draws has a point about this many hand pixels apart, as a hand's has: a polyline of two corners has nothing between them to measure. */
export const INK_STEP_PX = 4;
/** A written function is near a plane when its line stands within this share of the plane's size (and `NEAR_PX` hand pixels) of the drawn extent. */
export const NEAR_OF_PLANE = 0.35;
export const NEAR_PX = 60;
/** A written function and a drawn curve are the same curve when their median distance is under this share of the curve's height, or `SAME_PX` hand pixels. */
export const SAME_OF_HEIGHT = 0.03;
export const SAME_PX = 4;
/** A text of coordinates already beside a point is within this many hand pixels of it. */
export const COORD_NEAR_PX = 50;

const MAX = MAX_TIER0_CONFIDENCE;
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const centreOf = (b: Bounds): Point => ({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 });
const boxAround = (c: Point, w: number, h: number): Bounds => ({ minX: c.x - w / 2, maxX: c.x + w / 2, minY: c.y - h / 2, maxY: c.y + h / 2 });

/** A line written on the page that could be a function of the plane's x. */
interface Written {
  key: string;
  ids: string[];
  text: string;
  bounds: Bounds;
  /** How it compiled: the function, its printed right side, its variable. */
  f: (x: number) => number | null;
  expr: string;
  variable: string;
}

const LEFT_SIDE = /^\s*[A-Za-zÀ-ɏͰ-Ͽ][A-Za-z0-9_₀-₉]*\s*(?:\(\s*[A-Za-zÀ-ɏͰ-Ͽ][A-Za-z0-9_₀-₉]*\s*\))?\s*[=＝]/;

/** The lines written near a plane that are functions of its x: fully given, one variable, a left side or the variable in them. */
function functionsNear(state: SessionState, plane: PlanePart): Written[] {
  const out: Written[] = [];
  const names = [plane.xAxis.name, 'x'].filter((v, i, a): v is string => !!v && a.indexOf(v) === i);
  const ext = planeExtent(plane);
  const reach = Math.max(NEAR_OF_PLANE * Math.max(ext.maxX - ext.minX, ext.maxY - ext.minY), NEAR_PX * plane.scale);
  const claimed = new Set(plane.words);
  for (const line of sheetLines(state, { except: [] })) {
    if (line.ids.some((id) => claimed.has(id))) continue;
    const c = centreOf(line.bounds);
    if (c.x < ext.minX - reach || c.x > ext.maxX + reach || c.y < ext.minY - reach || c.y > ext.maxY + reach) continue;
    const text = line.text.trim();
    if (!text || text.length > 80 || axisNameOf(text) !== null) continue;
    for (const v of [...names, undefined]) {
      const comp = compileFunction(text, v);
      if (!comp.ok || comp.unbound.length) continue;
      const hasLeft = LEFT_SIDE.test(text);
      if (!comp.variables.includes(comp.variable) && !hasLeft) continue;
      if (comp.variables.some((n) => n !== comp.variable)) continue;
      out.push({ key: `${line.ids[0]}@${Math.round(line.bounds.minY)}`, ids: line.ids, text, bounds: line.bounds, f: comp.f, expr: comp.text, variable: comp.variable });
      break;
    }
  }
  return out;
}

/** The median distance, in canvas units, from a stroke's points to a function standing on the plane (the points where it is defined). */
function medianGap(plane: PlaneGeometry, points: readonly Point[], f: (x: number) => number | null): number {
  const gaps: number[] = [];
  for (const p of points) {
    const q = canvasToPlane(plane, p);
    const y = f(q.x);
    if (y === null || !Number.isFinite(y)) continue;
    gaps.push(Math.abs(planeToCanvas(plane, { x: q.x, y }).y - p.y));
  }
  if (gaps.length < points.length * 0.6) return Infinity;
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)];
}

/** A polyline with points about `step` apart along it (corners kept): ink, not a skeleton. */
function densify(pts: readonly Point[], step: number): Point[] {
  const out: Point[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const n = Math.max(1, Math.ceil(dist(a, b) / step));
    for (let k = 1; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  return out;
}

const heightOf = (pts: readonly Point[]) => Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y));

/** Whether a curve is already clean: as near the curve it was read as as a tap leaves it, nearer than any hand's tremor. */
function isClean(c: PlaneCurve): boolean {
  const best = c.fit.ok ? c.fit.fits[0]?.best : undefined;
  return !!best && best.rms * Math.max(heightOf(c.points), 1) <= CLEAN_PX * c.scale;
}

/** The curve a plane's curve is the clean copy of — a stroke the hand drew, the same curve through the same points — or null. */
function sketchOf(plane: PlanePart, c: PlaneCurve): PlaneCurve | null {
  const mine = c.fit.ok ? c.fit.fits[0]?.best : undefined;
  if (!mine || mine.rms * Math.max(heightOf(c.points), 1) > CLEAN_PX * c.scale) return null;
  for (const d of plane.curves) {
    if (d.id === c.id || !d.fit.ok) continue;
    const theirs = d.fit.fits[0]?.best;
    if (!theirs || theirs.rms * Math.max(heightOf(d.points), 1) <= CLEAN_PX * d.scale) continue;
    if (medianGap(plane, c.points, (x) => theirs.fn(x)) <= Math.max(SAME_OF_HEIGHT * heightOf(c.points), SAME_PX * c.scale)) return d;
  }
  return null;
}

function curveFillIns(plane: PlanePart, c: PlaneCurve, written: readonly Written[]): FillIn[] {
  if (!c.fit.ok) return [];
  const top: FitReading | undefined = c.fit.fits[0];
  if (!top || top.confidence < FIT_OFFER_FLOOR) return [];
  // The clean copy of a sketch speaks through the sketch.
  if (sketchOf(plane, c)) return [];
  const best = top.best;
  const out: FillIn[] = [];
  const quantity = `fn:${c.id}`;
  const planeNorm = 0.6 + 0.4 * Math.min(1, plane.confidence / 0.8);
  const norm = (top.confidence / MAX) * planeNorm;
  const xs = c.points.map((p) => canvasToPlane(plane, p).x);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const note = (plane.x.how === 'assumed' || plane.y.how === 'assumed' ? ' — the plane’s scale was assumed, so these are numbers in units the drawing never said' : '') + (best === top.rounded ? `; fitted, it is ${top.fitted.text}` : '');
  const reason = `${top.say}${note}`;

  // The curve the hand drew, already the clean one, needs no clean curve beneath it.
  const clean = best.rms * Math.max(heightOf(c.points), 1) <= CLEAN_PX * c.scale;
  const isWritten = written.some((w) => medianGap(plane, c.points, w.f) <= Math.max(SAME_OF_HEIGHT * heightOf(c.points), SAME_PX * c.scale));

  if (!isWritten) {
    const fs = FILL_TEXT_PX * c.scale;
    const { w, h } = textBoxOf(best.text, fs);
    const end = c.points.reduce((a, p) => (p.x > a.x ? p : a), c.points[0]);
    const at: Point = { x: end.x + w / 2 + 0.8 * fs, y: end.y - h / 2 - 0.3 * fs };
    out.push({
      key: `${PLANE_FILL_ID}:${c.id}:equation`,
      kind: 'expression',
      source: PLANE_FILL_ID,
      text: best.text,
      at,
      about: [c.id],
      quantity,
      reason,
      answer: true,
      rank: PLANE_RANK.equation * norm,
      take: { kind: 'text', text: best.text, bounds: boxAround(at, w, h) },
    });
  }

  // A clean copy of it is on the plane already (this very offer, taken): nothing to draw.
  const copied = plane.curves.some((d) => d.id !== c.id && isClean(d) && medianGap(plane, d.points, (x) => best.fn(x)) <= Math.max(SAME_OF_HEIGHT * heightOf(c.points), SAME_PX * c.scale));

  if (!clean && !copied) {
    const plot = plotOn(plane, (x) => best.fn(x), { from: x0, to: x1 });
    plot.curves.forEach((piece, i) => {
      out.push({
        key: `${PLANE_FILL_ID}:${c.id}:curve${plot.curves.length > 1 ? `:${i}` : ''}`,
        kind: 'mark',
        source: PLANE_FILL_ID,
        text: best.text,
        points: piece.points,
        closed: false,
        at: piece.points[Math.floor(piece.points.length / 2)],
        about: [c.id],
        quantity,
        reason: `${reason} — drawn clean beneath the ink; a tap along it draws it`,
        answer: false,
        rank: PLANE_RANK.curve * norm,
        take: { kind: 'strokes', strokes: [densify(piece.points, INK_STEP_PX * c.scale)] },
      });
    });
  }
  return out;
}

/** Whether ink already lies along these points: the median of their distances to a stroke, the least over the strokes, is a hair. */
function laidAlong(points: readonly Point[], strokes: readonly (readonly Point[])[], tol: number): boolean {
  for (const st of strokes) {
    const ds: number[] = [];
    for (const p of points) {
      let best = Infinity;
      for (let i = 1; i < st.length; i++) {
        const a = st[i - 1], b = st[i];
        const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
        const t = l2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
        best = Math.min(best, Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)));
      }
      ds.push(best);
    }
    ds.sort((a, b) => a - b);
    if (ds.length && ds[Math.floor(ds.length / 2)] <= tol) return true;
  }
  return false;
}

function writtenFillIns(plane: PlanePart, w: Written, plot: Plot, holeCentres: Point[]): FillIn[] {
  const out: FillIn[] = [];
  const tol = SAME_PX * plane.scale * 0.5;
  const drawn = plane.curves.map((c) => c.points);
  const rings = plane.points.map((p) => p.at);
  const quantity = `fn:${w.key}`;
  const about = [...w.ids, plane.xAxis.id, plane.yAxis.id];
  const norm = 0.6 + 0.4 * Math.min(1, plane.confidence / 0.8);
  const said = `${w.text} on the plane (${plot.reason})`;
  plot.curves.forEach((piece, i) => {
    if (laidAlong(piece.points, drawn, tol)) return;
    out.push({
      key: `${PLANE_FILL_ID}:${w.key}:curve:${i}`,
      kind: 'mark',
      source: PLANE_FILL_ID,
      text: w.text,
      points: piece.points,
      closed: false,
      at: piece.points[Math.floor(piece.points.length / 2)],
      about,
      quantity,
      reason: `${said} — a tap along it draws it`,
      answer: false,
      rank: PLANE_RANK.written * norm,
      take: { kind: 'strokes', strokes: [densify(piece.points, INK_STEP_PX * plane.scale)] },
    });
  });
  plot.holes.forEach((h, i) => {
    holeCentres.push(h.at);
    // A ring already drawn there is the hole, taken.
    if (rings.some((r) => dist(r, h.at) <= 3 * plane.scale + 1.5)) return;
    out.push({
      key: `${PLANE_FILL_ID}:${w.key}:hole:${i}`,
      kind: 'mark',
      source: PLANE_FILL_ID,
      text: `(${num(h.x)}, ${num(h.y)})`,
      points: h.ring,
      closed: true,
      dashed: false,
      at: h.at,
      about,
      quantity,
      reason: `a hole at (${num(h.x)}, ${num(h.y)}): ${w.text} is undefined at ${num(h.x)} and has the limit ${num(h.y)} from both sides — a ring, not a point on the line`,
      answer: false,
      rank: PLANE_RANK.hole * norm,
      take: { kind: 'strokes', strokes: [h.ring] },
    });
  });
  plot.asymptotes.forEach((a, i) => {
    out.push({
      key: `${PLANE_FILL_ID}:${w.key}:asymptote:${i}`,
      kind: 'mark',
      source: PLANE_FILL_ID,
      text: a.kind === 'vertical' ? `x = ${num(a.value)}` : `y = ${num(a.value)}`,
      points: [a.points[0], a.points[1]],
      closed: false,
      dashed: true,
      at: { x: (a.points[0].x + a.points[1].x) / 2, y: (a.points[0].y + a.points[1].y) / 2 },
      about,
      quantity,
      reason: `${a.kind === 'vertical' ? `the curve runs off to infinity at x = ${num(a.value)}` : `the curve runs along y = ${num(a.value)} far out`} — a guide, not a line you draw`,
      answer: false,
      rank: PLANE_RANK.asymptote * norm,
      take: { kind: 'none', why: 'an asymptote is a guide the maths draws; the curve and its hole are what you can take' },
    });
  });
  return out;
}

/** A number as it reads in a reason: whole, or to three places with the zeros trimmed. */
function num(v: number): string {
  if (Math.abs(v - Math.round(v)) < 5e-4) return String(Math.round(v));
  return String(Number(v.toFixed(3))).replace('-', '−');
}

function pointFillIns(plane: PlanePart, holeCentres: readonly Point[], texts: readonly { c: Point; text: string }[]): FillIn[] {
  const out: FillIn[] = [];
  for (const p of plane.points) {
    if (holeCentres.some((h) => dist(h, p.at) <= 6 * plane.scale + 5)) continue;
    if (texts.some((t) => dist(t.c, p.at) <= COORD_NEAR_PX * plane.scale && /^\(\s*[−-]?\d/.test(t.text.trim()))) continue;
    const fs = FILL_TEXT_PX * plane.scale;
    const { w, h } = textBoxOf(p.text, fs);
    const at: Point = { x: p.at.x + w / 2 + 0.9 * fs, y: p.at.y - h / 2 - 0.2 * fs };
    out.push({
      key: `${PLANE_FILL_ID}:${p.id}:coordinates`,
      kind: 'value',
      source: PLANE_FILL_ID,
      text: p.text,
      at,
      about: [p.id],
      quantity: `pt:${p.id}`,
      reason: `the point stands at x = ${num(p.x)}, y = ${num(p.y)} on the plane`,
      answer: true,
      rank: PLANE_RANK.point,
      take: { kind: 'text', text: p.text, bounds: boxAround(at, w, h) },
    });
  }
  return out;
}

/** The fill-ins a board's coordinate planes give. */
export function planeFillIns(state: SessionState): FillIn[] {
  const planes = planesIn(state).filter((p) => p.confidence >= PLANE_OFFER_FLOOR);
  if (!planes.length) return [];
  const out: FillIn[] = [];
  const texts = sheetLines(state, { except: [] }).map((l) => ({ c: centreOf(l.bounds), text: l.text }));
  for (const plane of planes) {
    const written = functionsNear(state, plane);
    const holeCentres: Point[] = [];
    for (const c of plane.curves) out.push(...curveFillIns(plane, c, written));
    for (const w of written) {
      // A sketch the hand has drawn through the same points is the function drawn already. (A clean piece taken from an
      // offer is not a sketch: it is one piece of the function, and the others are still to take.)
      if (plane.curves.some((c) => !isClean(c) && medianGap(plane, c.points, w.f) <= Math.max(SAME_OF_HEIGHT * heightOf(c.points), SAME_PX * c.scale))) continue;
      const a = analyseRational(w.expr, w.variable);
      const plot = plotOn(plane, w.f, a.ok ? { holes: a.holes.map((h) => ({ x: h.x, y: h.y })), poles: a.poles.map((q) => q.x), levels: a.end.kind === 'horizontal' ? [a.end.y] : [] } : {});
      if (!plot.curves.length && !plot.holes.length) continue;
      out.push(...writtenFillIns(plane, w, plot, holeCentres));
    }
    out.push(...pointFillIns(plane, holeCentres, texts));
  }
  return out;
}

/** The plane's fill source: registered in `fill-builtin.ts`, asked by `fillInsOf`. */
export const PLANE_FILL: FillSource = {
  id: PLANE_FILL_ID,
  fillIns(state: SessionState): FillIn[] {
    return planeFillIns(state);
  },
};

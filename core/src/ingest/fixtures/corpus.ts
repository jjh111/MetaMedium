// A synthetic corpus of ink in every outline style found (V1-SPEC IN1, the fixtures; V1-SPEC §12: no real ink).
//
// Every source of John's ink stores a pen stroke as a filled outline; they differ in how they write the outline
// down. Each style here draws the engine's own shapes (`strokeFor`, given a hand's tremor by `handLike`, the seeded
// hand the packs use) so that what each stroke should read as is known — the engine's reading of the line the pen
// followed — and sweeps a pen along it, then writes the ring out the way the source does:
//
//   onenote     a ring of constant width with round or flat caps, as polygon points in a PDF's space: points, y up,
//               under a flip, one path to a stroke
//   inkspace    a ring written as cubic Béziers fitted through its points, in millimetres, pressure making the width
//               shiver
//   whiteboard  even-odd polylines, defined once and used again and again as clones; a closed shape is the ring and
//               the hole inside it; masks that hide nothing here, and pictures
//   illustrator a brush: a width that swells and tapers, in relative commands, under a stylesheet of classes, a
//               doctype with entities and a generator comment
//   stroked     plain stroked paths, no outline at all, under nested transforms and in inches
//
// Nothing is a copy of anyone’s ink. The same call is the same file on every machine.

import type { Point } from '../../types';
import { analyzeStroke } from '../../recognition';
import { strokeFor } from '../../session/synthesize';
import { handLike, mulberry32 } from '../../packs/synthesize';
import { penOutline, restart, brushWidth, pressureWidth, type PenWidth } from './pen';
import { unionRings } from './union';
import { makePng, toBase64 } from './png';

export type Style = 'onenote' | 'inkspace' | 'whiteboard' | 'illustrator' | 'stroked';
export const STYLES: Style[] = ['onenote', 'inkspace', 'whiteboard', 'illustrator', 'stroked'];
export type Shape = 'line' | 'rectangle' | 'circle' | 'triangle' | 'arrow' | 'arc';
export const SHAPES: Shape[] = ['line', 'rectangle', 'circle', 'triangle', 'arrow', 'arc'];

/** What a stroke of the file should come back as. */
export interface Truth {
  shape: Shape;
  /** What the shape rung reads the source line as. */
  reads: string;
  /** The line the pen followed, in page pixels. */
  source: Point[];
  color: string;
  /** The pen's mean width in page pixels; 0 for a stroked path, whose width is what it says. */
  width: number;
  /** The width a stroked path says, in page pixels. */
  strokeWidth?: number;
}

export interface Sample {
  style: Style;
  name: string;
  svg: string;
  /** One entry for each outline in the file, in the order they are painted. */
  truth: Truth[];
  /** The page in pixels. */
  page: { width: number; height: number };
}

export const PALETTE = ['#1d1d1b', '#e6007e', '#0057b8', '#008a3e', '#f39200', '#6f2c91'];

const CELL = 150;

function arcStroke(cx: number, cy: number, r: number, a0: number, sweep: number): Point[] {
  const n = 70;
  return Array.from({ length: n }, (_, i) => {
    const a = a0 + (sweep * i) / (n - 1);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
}

/** One shape, drawn the way a hand draws it, filling about `size` pixels round (cx, cy). */
export function drawShape(shape: Shape, rnd: () => number, cx: number, cy: number, size: number, seed: number): Point[] {
  const w = size * (0.85 + 0.3 * rnd());
  const h = size * (0.5 + 0.3 * rnd());
  const turn = rnd() * Math.PI;
  const drawn = (() => {
    switch (shape) {
      case 'line': {
        const dx = (Math.cos(turn) * size) / 2, dy = (Math.sin(turn) * size) / 2;
        return strokeFor({ shape: 'line', from: { x: cx - dx, y: cy - dy }, to: { x: cx + dx, y: cy + dy } });
      }
      case 'rectangle': return strokeFor({ shape: 'rectangle', x: cx - w / 2, y: cy - h / 2, w, h });
      case 'circle': return strokeFor({ shape: 'circle', x: cx - size * 0.45, y: cy - size * 0.45, w: size * 0.9, h: size * 0.9 });
      case 'triangle': return strokeFor({ shape: 'triangle', x: cx - w / 2, y: cy - size * 0.45, w, h: size * 0.9 });
      case 'arrow': {
        const dx = (Math.cos(turn * 0.5) * size * 1.1) / 2, dy = (Math.sin(turn * 0.5) * size * 1.1) / 2;
        return strokeFor({ shape: 'arrow', from: { x: cx - dx, y: cy - dy }, to: { x: cx + dx, y: cy + dy } });
      }
      case 'arc': return arcStroke(cx, cy, size * 0.42, turn, 3.5);
    }
  })();
  return handLike(drawn ?? [], seed);
}

const f2 = (n: number) => n.toFixed(2);
const f3 = (n: number) => n.toFixed(3);
const polygonD = (ring: Point[], fmt = f2, map: (p: Point) => Point = (p) => p) =>
  'M' + ring.map((p) => { const q = map(p); return `${fmt(q.x)} ${fmt(q.y)}`; }).join(' L') + ' Z';

/** A closed Catmull-Rom spline through every `step`th point of a ring, as cubic Béziers. */
function bezierD(ring: Point[], step: number, fmt = f3, map: (p: Point) => Point = (p) => p): string {
  const pts = ring.filter((_, i) => i % step === 0).map(map);
  const n = pts.length;
  const at = (i: number) => pts[((i % n) + n) % n];
  let d = `M${fmt(pts[0].x)} ${fmt(pts[0].y)}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    d += `C${fmt(p1.x + (p2.x - p0.x) / 6)} ${fmt(p1.y + (p2.y - p0.y) / 6)} ${fmt(p2.x - (p3.x - p1.x) / 6)} ${fmt(p2.y - (p3.y - p1.y) / 6)} ${fmt(p2.x)} ${fmt(p2.y)}`;
  }
  return d + 'Z';
}

/** A ring as Illustrator writes one: a move, then relative lines. */
function relativeD(ring: Point[]): string {
  let d = `M${f2(ring[0].x)},${f2(ring[0].y)}`;
  let px = Number(f2(ring[0].x)), py = Number(f2(ring[0].y));
  for (let i = 1; i < ring.length; i++) {
    const x = Number(f2(ring[i].x)), y = Number(f2(ring[i].y));
    d += `l${f2(x - px)},${f2(y - py)}`;
    px = x; py = y;
  }
  return d + 'z';
}

interface Plan {
  shape: Shape;
  source: Point[];
  color: string;
  reads: string;
}

function plan(count: number, seed: number, cols: number, only?: Shape[]): { plans: Plan[]; rnd: () => number } {
  const rnd = mulberry32(seed);
  const plans: Plan[] = [];
  for (let i = 0; i < count; i++) {
    const shape = (only ?? SHAPES)[i % (only ?? SHAPES).length];
    const col = i % cols, row = Math.floor(i / cols);
    const cx = 80 + col * CELL + (rnd() - 0.5) * 20, cy = 80 + row * CELL + (rnd() - 0.5) * 20;
    const source = drawShape(shape, rnd, cx, cy, 70 + rnd() * 40, (seed * 131 + i * 7919) >>> 0);
    plans.push({ shape, source, color: PALETTE[(i + seed) % PALETTE.length], reads: analyzeStroke(source).results[0]?.type ?? 'none' });
  }
  return { plans, rnd };
}

const HEAD = 'xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"';

function onenote(seed: number, count: number): Sample {
  const { plans, rnd } = plan(count, seed, 5);
  const W = 816, H = 1056;
  const flip = (p: Point): Point => ({ x: p.x * 0.75, y: 792 - p.y * 0.75 });
  const truth: Truth[] = [];
  const paths = plans.map((p, i) => {
    const width = 1.8 + rnd() * 1.4;
    const ring = restart(penOutline(p.source, { width, cap: i % 2 ? 'round' : 'flat' }), Math.floor(rnd() * 50), rnd() < 0.5);
    truth.push({ shape: p.shape, reads: p.reads, source: p.source, color: p.color, width });
    return `<path d="${polygonD(ring, f2, flip)}" fill="${p.color}"/>`;
  });
  const svg = `<svg ${HEAD} width="612pt" height="792pt" viewBox="0 0 612 792"><g transform="matrix(1 0 0 -1 0 792)">${paths.join('')}</g></svg>`;
  return { style: 'onenote', name: `onenote-${seed}.svg`, svg, truth, page: { width: W, height: H } };
}

function inkspace(seed: number, count: number): Sample {
  const { plans, rnd } = plan(count, seed, 5);
  const MM = 25.4 / 96;
  const toMm = (p: Point): Point => ({ x: p.x * MM, y: p.y * MM });
  const truth: Truth[] = [];
  const groups = plans.map((p, i) => {
    const mean = 2 + rnd() * 1.2;
    const width: PenWidth = pressureWidth(mean, seed * 31 + i, 0.25);
    const ring = penOutline(p.source, { width, cap: 'round', capSteps: 8 });
    truth.push({ shape: p.shape, reads: p.reads, source: p.source, color: p.color, width: mean });
    return `<g><path d="${bezierD(restart(ring, Math.floor(rnd() * 20)), 2, f3, toMm)}" fill="${p.color}"/></g>`;
  });
  const svg = `<?xml version="1.0" encoding="UTF-8"?><svg ${HEAD} width="210mm" height="297mm" viewBox="0 0 210 297">${groups.join('')}</svg>`;
  return { style: 'inkspace', name: `inkspace-${seed}.svg`, svg, truth, page: { width: 210 / MM, height: 297 / MM } };
}

function whiteboard(seed: number, count: number): Sample {
  const { plans, rnd } = plan(count, seed, 6);
  const truth: Truth[] = [];
  const defs: string[] = [];
  const body: string[] = [];
  // Closed shapes are the ring and the hole inside it, as a merged outline is; open ones are one ring.
  plans.forEach((p, i) => {
    const width = 2.4 + rnd() * 1.2;
    const closed = p.shape === 'rectangle' || p.shape === 'circle' || p.shape === 'triangle';
    const ring = penOutline(p.source, { width, cap: 'flat' });
    const rings = closed ? unionRings([ring]) : [restart(ring, Math.floor(rnd() * 30), rnd() < 0.5)];
    const id = `s${i}`;
    // Even-odd is what a merged outline (a ring and its hole) is written with; a stroke's own polygon overlaps itself
    // where the pen doubled back, and even-odd would leave that empty.
    defs.push(`<path id="${id}"${closed ? ' fill-rule="evenodd"' : ''} d="${rings.map((r) => polygonD(r, f2)).join(' ')}"/>`);
    body.push(`<use xlink:href="#${id}" fill="${p.color}"/>`);
    truth.push({ shape: p.shape, reads: p.reads, source: p.source, color: p.color, width });
  });
  // The same marks again, moved: a whiteboard stamps its clones.
  const cloned = Math.max(2, Math.floor(count / 4));
  for (let k = 0; k < cloned; k++) {
    const i = k * 3 % count;
    const dx = 430 + (k % 3) * 10, dy = 20 + Math.floor(k / 3) * 12;
    body.push(`<use xlink:href="#s${i}" x="${dx}" y="${dy}" fill="${truth[i].color}"/>`);
    truth.push({ ...truth[i], source: truth[i].source.map((q) => ({ x: q.x + dx, y: q.y + dy })) });
  }
  const mask = '<mask id="m1"><rect width="40" height="40" fill="#fff"/></mask>';
  const pic = (x: number) => `<image x="${x}" y="760" width="30" height="20" xlink:href="data:image/png;base64,${toBase64(makePng(6, 4))}"/>`;
  const svg = `<svg ${HEAD} width="1000" height="800" viewBox="0 0 1000 800"><defs>${mask}${defs.join('')}</defs><g mask="url(#m1)">${body.join('')}</g>${pic(10)}${pic(60)}</svg>`;
  return { style: 'whiteboard', name: `whiteboard-${seed}.svg`, svg, truth, page: { width: 1000, height: 800 } };
}

function illustrator(seed: number, count: number): Sample {
  const { plans, rnd } = plan(count, seed, 4);
  const truth: Truth[] = [];
  const classes = PALETTE.map((c, i) => `.st${i}{fill:${c};}`).join('');
  const paths = plans.map((p) => {
    const max = 3.2 + rnd() * 1.6;
    const width = brushWidth(max, 0.4);
    const ring = restart(penOutline(p.source, { width, cap: 'round' }), Math.floor(rnd() * 40), rnd() < 0.5);
    // The width swells and tapers, so the mean is what the area says.
    let area = 0, len = 0;
    for (let k = 1; k < p.source.length; k++) len += Math.hypot(p.source[k].x - p.source[k - 1].x, p.source[k].y - p.source[k - 1].y);
    for (let k = 0; k < 40; k++) area += width(k / 39);
    truth.push({ shape: p.shape, reads: p.reads, source: p.source, color: p.color, width: area / 40 });
    return `<path class="st${PALETTE.indexOf(p.color)}" d="${relativeD(ring)}"/>`;
  });
  const svg = `<?xml version="1.0" encoding="utf-8"?>\n<!-- Generator: Adobe Illustrator 25.2.3, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->\n`
    + '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [\n\t<!ENTITY ns_extend "http://ns.adobe.com/Extensibility/1.0/">\n]>\n'
    + `<svg version="1.1" id="Layer_1" xmlns:x="&ns_extend;" ${HEAD} x="0px" y="0px" viewBox="0 0 612 792" style="enable-background:new 0 0 612 792;" xml:space="preserve">`
    + `<style type="text/css">\n\t${classes}\n</style><g id="Layer_1_1_">${paths.join('')}</g></svg>`;
  return { style: 'illustrator', name: `illustrator-${seed}.svg`, svg, truth, page: { width: 612, height: 792 } };
}

function stroked(seed: number, count: number): Sample {
  const { plans, rnd } = plan(count, seed, 5);
  const truth: Truth[] = [];
  const IN = 1 / 96;
  const paths = plans.map((p, i) => {
    const sw = Number(f2(1.5 + rnd() * 2));
    truth.push({ shape: p.shape, reads: p.reads, source: p.source, color: p.color, width: 0, strokeWidth: sw });
    const d = p.source.map((q, k) => `${k ? 'L' : 'M'}${f3(q.x)} ${f3(q.y)}`).join('');
    // Some as a polyline element, some as a path inside a group that moves it.
    return i % 3 === 1
      ? `<polyline fill="none" stroke="${p.color}" stroke-width="${f2(sw)}" points="${p.source.map((q) => `${f3(q.x)},${f3(q.y)}`).join(' ')}"/>`
      : `<path fill="none" stroke="${p.color}" stroke-width="${f2(sw)}" stroke-linecap="round" d="${d}"/>`;
  });
  const svg = `<svg ${HEAD} width="8.5in" height="11in" viewBox="0 0 8.5 11"><g transform="scale(${IN})"><g transform="translate(0 0)">${paths.join('')}</g></g></svg>`;
  return { style: 'stroked', name: `stroked-${seed}.svg`, svg, truth, page: { width: 816, height: 1056 } };
}

/** One page of ink in a style: `count` strokes, in the shapes in turn, from a seed. */
export function sample(style: Style, seed = 1, count = 24): Sample {
  switch (style) {
    case 'onenote': return onenote(seed, count);
    case 'inkspace': return inkspace(seed, count);
    case 'whiteboard': return whiteboard(seed, count);
    case 'illustrator': return illustrator(seed, count);
    case 'stroked': return stroked(seed, count);
  }
}

/** Every style, several seeds each. */
export function corpus(seeds = [1, 2, 3, 4], count = 24): Sample[] {
  return STYLES.flatMap((style) => seeds.map((seed) => sample(style, seed, count)));
}

/** A figure drawn of several strokes that touch, written as ONE merged outline: what a merging exporter writes. */
export interface Merged {
  name: string;
  /** The strokes the figure was made of, as lines. */
  strokes: Point[][];
  /** The merged outline: an outer ring and a ring for every hole, to be filled nonzero. */
  rings: Point[][];
  width: number;
}

const seg = (a: Point, b: Point, n = 24): Point[] => Array.from({ length: n }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / (n - 1), y: a.y + ((b.y - a.y) * i) / (n - 1) }));
const poly = (...pts: Point[]): Point[] => pts.slice(1).reduce<Point[]>((acc, p, i) => acc.concat(seg(pts[i], p).slice(i ? 1 : 0)), []);
const circle = (cx: number, cy: number, r: number, a0 = 0, a1 = Math.PI * 2, n = 60): Point[] => Array.from({ length: n + 1 }, (_, i) => ({ x: cx + r * Math.cos(a0 + ((a1 - a0) * i) / n), y: cy + r * Math.sin(a0 + ((a1 - a0) * i) / n) }));

/**
 * The hard material: letters and figures whose strokes cross or fork. Where a stroke crosses itself the outline is
 * still a ring; where several strokes are merged there are not two sides to pair, and the skeleton reads them.
 * The angles are the ones a hand draws, not the 45° that thinning is worst at.
 */
export function hardFigures(seed = 1): Merged[] {
  const rnd = mulberry32(seed);
  const jit = () => (rnd() - 0.5) * 6;
  const p = (x: number, y: number): Point => ({ x: x + jit(), y: y + jit() });
  const figures: [string, Point[][]][] = [
    ['T', [poly(p(60, 60), p(180, 64)), poly(p(118, 60), p(122, 190))]],
    ['X', [poly(p(60, 60), p(176, 196)), poly(p(184, 58), p(66, 190))]],
    ['plus', [poly(p(60, 124), p(180, 120)), poly(p(120, 60), p(118, 190))]],
    ['H', [poly(p(60, 60), p(62, 190)), poly(p(160, 58), p(158, 192)), poly(p(62, 125), p(160, 128))]],
    ['A', [poly(p(60, 190), p(112, 60), p(162, 190)), poly(p(80, 142), p(142, 138))]],
    ['arrow', [poly(p(40, 100), p(200, 104)), poly(p(166, 72), p(202, 104), p(170, 134))]],
    ['8', [[...circle(120, 80, 30, Math.PI / 2, Math.PI * 2.5, 50), ...circle(120, 140, 30, -Math.PI / 2, Math.PI * 1.5, 50).reverse()]]],
    ['e', [[...poly(p(90, 120), p(150, 122)), ...circle(120, 120, 30, 0, Math.PI * 1.8, 50).slice(1)]]],
    ['B', [poly(p(80, 60), p(82, 200)), circle(80, 95, 35, -Math.PI / 2, Math.PI / 2, 30), circle(80, 165, 35, -Math.PI / 2, Math.PI / 2, 30)]],
    ['key', [circle(120, 90, 30), poly(p(120, 120), p(122, 210))]],
  ];
  return figures.map(([name, strokes]) => {
    const width = 3 + rnd() * 2;
    return { name, strokes, width, rings: unionRings(strokes.map((s) => penOutline(s, { width, cap: 'round' }))) };
  });
}

/** A hard figure as a one-path SVG, in a colour. */
export function mergedSvg(m: Merged, color = PALETTE[2]): string {
  return `<svg ${HEAD} width="260" height="260" viewBox="0 0 260 260"><path fill-rule="nonzero" fill="${color}" d="${m.rings.map((r) => polygonD(r, f2)).join(' ')}"/></svg>`;
}

// The SVG adapter: a drawing's bytes become an ink document (V1-SPEC IN1).
//
// An SVG is what the pen's sources write ink as — Wacom Inkspace, an Illustrator brush, a whiteboard export,
// OneNote's pages once they are vector — and also what a person writes a diagram as. So what is read out of it
// is both, and the document says which it took the file to be.
//
//   - A STROKED path (or rect, circle, line, polyline, polygon) is a stroke exactly as drawn: its own vertices,
//     given the density of ink, in its stroke colour, as wide as its `stroke-width` comes to.
//   - A FILLED path is a fill, and a fill that is pen-shaped is a pen stroke stored as the shape its tip swept:
//     `ink-outline.ts` reads it back to the line it followed, in the fill's colour. A solid shape that no pen
//     made keeps its edge as drawn. `inkscape:original-d`, where a path effect kept its source line, is that line.
//   - Everything is carried through the transforms it stands under, `<use>` and `<symbol>` expanded where they
//     stand (a clone of a pen stroke is read once, and moved), and the units become CSS pixels, the hand's scale:
//     millimetres, inches and points by the viewBox, width and height the file gives.
//   - `<text>` becomes a text run, `<image>` a picture (its bytes, if the file holds them), `<a href>` a link.
//   - A mask and a clip path are not applied, and are said; so are gradients, patterns, dashes, markers and
//     whatever else a pen's file does not need.
//
// DRAWN OR DESIGNED: a document of mostly pen-shaped fills and strokes is *ink*; one of mostly shapes and words is
// a *figure*. The document says which with the counts it stands on. Both readings stay available: the strokes
// are in the document either way, and the file itself is the figure.
//
// A whiteboard's export carries thousands of clones and masks. The work on one file is capped (`IngestLimits`)
// — clones, outlines, vertices, points, raster pixels and time — and a file that passes a cap is read as far as it
// was and says so. Nothing here throws: a file that is not an SVG is refused with the reason.

import type { Point } from '../types';
import { compose, translation, IDENTITY, type Affine } from '../session/affine';
import { densify } from '../image/trace';
import {
  type IngestResult, type IngestLimits, type IngestOptions, type InkDocument, type InkPage, type InkStroke, type Recovery, type Reading,
  ADAPTER_VERSIONS, DEFAULT_LIMITS, accept, blankPage, refuse,
} from './source';
import { parseXml, textOf, type XNode } from './xml';
import { parsePath, flatten, rectCmds, ellipseCmds, lineCmds, pointsCmds, type Cmd, type Poly } from './path';
import {
  type Paint, type Sheet, parseColor, parsePaint, parseLength, parseNumber, numberList, parseDeclarations, parseSheet, declarationsFor, emptySheet, MAX_RULES,
} from './svg-style';
import { recoverFill, stepFor, type OutlineRecovery, type FillRule } from './ink-outline';
import { sniffImage, shownSize } from './raster';

// ---- the state of a reading ------------------------------------------------------------------------------

interface Style {
  fill: Paint;
  stroke: Paint;
  strokeWidth: number;
  fillRule: FillRule;
  fillOpacity: number;
  strokeOpacity: number;
  opacity: number;
  color: string;
  fontSize: number;
  visible: boolean;
}

const BLACK: Paint = { kind: 'color', hex: '#000000', alpha: 1 };
const ROOT_STYLE: Style = {
  fill: BLACK, stroke: { kind: 'none' }, strokeWidth: 1, fillRule: 'nonzero', fillOpacity: 1, strokeOpacity: 1, opacity: 1, color: '#000000', fontSize: 16, visible: true,
};

/** How a stroked path is called pen work rather than a figure's line: it has this many nodes, or more. */
export const FREEFORM_NODES = 6;
/** A solid shape this much of the page across, both ways, is the page's ground, not a mark. */
const GROUND_SHARE = 0.9;
/** The tolerance, in pixels, curves are walked to. */
const FLATTEN_TOL = 0.05;

interface Counters {
  masked: number; clipped: number; gradients: number; patterns: number; dashed: number; markers: number; foreign: number; filters: number;
  rotatedText: number; externalPictures: number; badPictures: number; svgPictures: number; brokenPaths: number; firstPathError: string;
  badShapes: number; badTransforms: number; cycles: number; missingUses: number; externalUses: number; grounds: number; failed: number; unfaithful: number;
  pathsStopped: number; unsupportedCss: number; droppedCss: number; zeroLength: number;
}
const newCounters = (): Counters => ({
  masked: 0, clipped: 0, gradients: 0, patterns: 0, dashed: 0, markers: 0, foreign: 0, filters: 0, rotatedText: 0, externalPictures: 0, badPictures: 0,
  svgPictures: 0, brokenPaths: 0, firstPathError: '', badShapes: 0, badTransforms: 0, cycles: 0, missingUses: 0, externalUses: 0, grounds: 0, failed: 0, unfaithful: 0,
  pathsStopped: 0, unsupportedCss: 0, droppedCss: 0, zeroLength: 0,
});

interface Evidence {
  penFills: number;
  penStrokes: number;
  shapes: number;
  texts: number;
  images: number;
}

interface Cached {
  results: OutlineRecovery[];
  e: number;
  f: number;
}

interface Walk {
  limits: IngestLimits;
  deadline: number;
  byId: Map<string, XNode>;
  sheet: Sheet;
  page: InkPage;
  known: boolean;
  order: number;
  outline: number;
  visited: number;
  clones: number;
  outlines: number;
  points: number;
  vertices: { left: number };
  work: { rasterPx: number };
  stopped: string | null;
  c: Counters;
  ev: Evidence;
  cache: Map<string, Cached>;
  cloning: number;
}

const plural = (n: number, one: string, many = one + 's') => `${n.toLocaleString('en')} ${n === 1 ? one : many}`;

function stopWith(w: Walk, sentence: string): void {
  if (!w.stopped) w.stopped = sentence;
}

/** One step of the walk: false when a cap has been passed. */
function tick(w: Walk): boolean {
  if (w.stopped) return false;
  if (++w.visited > w.limits.visited) {
    stopWith(w, `stopped after ${plural(w.limits.visited, 'element')} — the file has more than is read, and the rest is left`);
    return false;
  }
  if ((w.visited & 15) === 0 && Date.now() >= w.deadline) return timeUp(w);
  return true;
}
function timeUp(w: Walk): boolean {
  stopWith(w, `stopped after ${Math.max(0, Math.round(w.limits.ms / 100) / 10)} seconds of reading — the file takes too long, and what was read is here`);
  return false;
}

// ---- transforms and the page's frame ---------------------------------------------------------------------

function parseTransform(value: string | undefined): Affine | null | undefined {
  if (value === undefined || !value.trim()) return undefined;
  const re = /\s*(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)\s*,?/y;
  let m: Affine = IDENTITY;
  let pos = 0;
  while (pos < value.length) {
    re.lastIndex = pos;
    const t = re.exec(value);
    if (!t) return /^\s*$/.test(value.slice(pos)) ? m : null;
    pos = re.lastIndex;
    const a = numberList(t[2]);
    if (!a) return null;
    let T: Affine;
    switch (t[1]) {
      case 'matrix':
        if (a.length !== 6) return null;
        T = { a: a[0], b: a[1], c: a[2], d: a[3], e: a[4], f: a[5] };
        break;
      case 'translate':
        if (a.length < 1 || a.length > 2) return null;
        T = translation(a[0], a[1] ?? 0);
        break;
      case 'scale':
        if (a.length < 1 || a.length > 2) return null;
        T = { a: a[0], b: 0, c: 0, d: a[1] ?? a[0], e: 0, f: 0 };
        break;
      case 'rotate': {
        if (a.length !== 1 && a.length !== 3) return null;
        const r = (a[0] * Math.PI) / 180;
        const cos = Math.cos(r), sin = Math.sin(r);
        const cx = a[1] ?? 0, cy = a[2] ?? 0;
        T = { a: cos, b: sin, c: -sin, d: cos, e: cx - cos * cx + sin * cy, f: cy - sin * cx - cos * cy };
        break;
      }
      case 'skewX':
        if (a.length !== 1) return null;
        T = { a: 1, b: 0, c: Math.tan((a[0] * Math.PI) / 180), d: 1, e: 0, f: 0 };
        break;
      default:
        if (a.length !== 1) return null;
        T = { a: 1, b: Math.tan((a[0] * Math.PI) / 180), c: 0, d: 1, e: 0, f: 0 };
    }
    m = compose(m, T);
  }
  return m;
}

const scaleOf = (m: Affine) => Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
const finiteAffine = (m: Affine) => [m.a, m.b, m.c, m.d, m.e, m.f].every(Number.isFinite);

/** Where a viewBox goes in a viewport of `W` × `H`: the default `xMidYMid meet`, or whatever preserveAspectRatio says. */
function viewBoxMap(vb: number[], W: number, H: number, par: string | undefined): Affine {
  const [vx, vy, vw, vh] = vb;
  const words = (par ?? '').trim().split(/\s+/).filter((s) => s !== 'defer');
  const align = words[0] ?? 'xMidYMid';
  if (align === 'none') return { a: W / vw, b: 0, c: 0, d: H / vh, e: -vx * (W / vw), f: -vy * (H / vh) };
  const slice = words[1] === 'slice';
  const s = slice ? Math.max(W / vw, H / vh) : Math.min(W / vw, H / vh);
  const fx = /xMin/.test(align) ? 0 : /xMax/.test(align) ? 1 : 0.5;
  const fy = /YMin/.test(align) ? 0 : /YMax/.test(align) ? 1 : 0.5;
  return { a: s, b: 0, c: 0, d: s, e: -vx * s + (W - vw * s) * fx, f: -vy * s + (H - vh * s) * fy };
}

interface Frame {
  width: number;
  height: number;
  m: Affine;
  known: boolean;
}

function frameOf(root: XNode): Frame | string {
  const vbAttr = root.attrs.viewBox;
  let vb: number[] | null = null;
  if (vbAttr !== undefined) {
    vb = numberList(vbAttr);
    if (!vb || vb.length !== 4) return 'the viewBox is not four numbers, so the drawing has no scale';
    if (!(vb[2] > 0) || !(vb[3] > 0)) return `the viewBox is ${vb[2]} × ${vb[3]} — a drawing needs a size`;
  }
  const wAttr = root.attrs.width, hAttr = root.attrs.height;
  let W = parseLength(wAttr), H = parseLength(hAttr);
  if (wAttr !== undefined && W !== null && !(W > 0)) return `the width is ${wAttr} — a drawing needs a size`;
  if (hAttr !== undefined && H !== null && !(H > 0)) return `the height is ${hAttr} — a drawing needs a size`;
  if (vb) {
    if (W === null && H === null) { W = vb[2]; H = vb[3]; }
    else if (W === null) W = (H as number) * (vb[2] / vb[3]);
    else if (H === null) H = W * (vb[3] / vb[2]);
    return { width: W as number, height: H as number, m: viewBoxMap(vb, W as number, H as number, root.attrs.preserveAspectRatio), known: true };
  }
  if (W !== null && H !== null) return { width: W, height: H, m: IDENTITY, known: true };
  return { width: W ?? 0, height: H ?? 0, m: IDENTITY, known: false };
}

// ---- style -----------------------------------------------------------------------------------------------

const opacityOf = (v: string | undefined): number | null => {
  if (v === undefined) return null;
  const t = v.trim();
  const n = t.endsWith('%') ? parseNumber(t.slice(0, -1)) : parseNumber(t);
  if (n === null) return null;
  return Math.max(0, Math.min(1, t.endsWith('%') ? n / 100 : n));
};

function styleOf(node: XNode, parent: Style, w: Walk): { st: Style; shown: boolean } {
  const css = declarationsFor(w.sheet, node.name, node.attrs.id, node.attrs.class);
  const inline = node.attrs.style ? parseDeclarations(node.attrs.style) : null;
  const get = (p: string): string | undefined => (inline && inline[p]) ?? css[p] ?? node.attrs[p];
  let color = parent.color;
  const cv = get('color');
  if (cv !== undefined) { const c = parseColor(cv); if (c) color = c.hex; }
  const fontSize = parseLength(get('font-size'), parent.fontSize) ?? parent.fontSize;
  const paint = (name: 'fill' | 'stroke', inherited: Paint): Paint => {
    const v = get(name);
    if (v === undefined) return inherited;
    const p = parsePaint(v, color);
    return p === null || p === 'inherit' ? inherited : p;
  };
  const vis = get('visibility');
  const fr = get('fill-rule');
  const own = opacityOf(get('opacity'));
  const st: Style = {
    fill: paint('fill', parent.fill),
    stroke: paint('stroke', parent.stroke),
    strokeWidth: parseLength(get('stroke-width'), fontSize) ?? parent.strokeWidth,
    fillRule: fr === 'evenodd' ? 'evenodd' : fr === 'nonzero' ? 'nonzero' : parent.fillRule,
    fillOpacity: opacityOf(get('fill-opacity')) ?? parent.fillOpacity,
    strokeOpacity: opacityOf(get('stroke-opacity')) ?? parent.strokeOpacity,
    opacity: parent.opacity * (own ?? 1),
    color,
    fontSize,
    visible: vis === 'hidden' || vis === 'collapse' ? false : vis === 'visible' ? true : parent.visible,
  };
  if (get('stroke-dasharray') && get('stroke-dasharray') !== 'none') w.c.dashed++;
  return { st, shown: (get('display') ?? '').trim().toLowerCase() !== 'none' };
}

/** A paint as a colour and an alpha, a gradient by its first stop; null when nothing is painted. */
function resolve(p: Paint, w: Walk, depth = 0): { hex: string; alpha: number } | null {
  if (p.kind === 'none') return null;
  if (p.kind === 'color') return { hex: p.hex, alpha: p.alpha };
  const target = w.byId.get(p.id);
  if (target && (target.name === 'linearGradient' || target.name === 'radialGradient')) {
    const stop = firstStop(target, w, 0);
    if (stop) { w.c.gradients++; return stop; }
  } else if (target && target.name === 'pattern') {
    w.c.patterns++;
  }
  return p.fallback && depth < 2 ? resolve(p.fallback, w, depth + 1) : null;
}

function firstStop(g: XNode, w: Walk, depth: number): { hex: string; alpha: number } | null {
  for (const k of g.kids) {
    if (typeof k === 'string' || k.name !== 'stop') continue;
    const decl = k.attrs.style ? parseDeclarations(k.attrs.style) : {};
    const c = parseColor(decl['stop-color'] ?? k.attrs['stop-color'] ?? '#000000');
    const o = opacityOf(decl['stop-opacity'] ?? k.attrs['stop-opacity']);
    if (c) return { hex: c.hex, alpha: c.alpha * (o ?? 1) };
  }
  const href = g.attrs['xlink:href'] ?? g.attrs.href;
  if (href && href[0] === '#' && depth < 4) {
    const next = w.byId.get(href.slice(1));
    if (next && next !== g) return firstStop(next, w, depth + 1);
  }
  return null;
}

// ---- painting a shape ------------------------------------------------------------------------------------

const roundOpacity = (v: number) => Math.round(v * 1000) / 1000;

function pushStroke(w: Walk, s: Omit<InkStroke, 'order'>): boolean {
  if (w.points + s.points.length > w.limits.points) {
    stopWith(w, `stopped after ${plural(w.limits.points, 'point')} — the drawing has more ink than is read, and the rest is left`);
    return false;
  }
  w.points += s.points.length;
  w.page.strokes.push({ ...s, order: w.order++ });
  return true;
}

/** Coordinates beyond this are not a drawing; a line through one is left out rather than walked. */
const COORD_LIMIT = 1e7;

/** The points of a line given the density of ink: a vertex stays where it is, and no gap is more than a couple of pixels (more only on a line too long for that to be a sensible number of points). */
function inkPoints(pts: Point[], closed: boolean): Point[] | null {
  const line = closed && pts.length > 1 ? [...pts, pts[0]] : pts;
  let len = 0;
  for (const p of line) if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || Math.abs(p.x) > COORD_LIMIT || Math.abs(p.y) > COORD_LIMIT) return null;
  for (let i = 1; i < line.length; i++) len += Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y);
  return densify(line, stepFor(len, Math.max(0.5, Math.min(2, len / 24))));
}

function shifted(rec: OutlineRecovery, dx: number, dy: number): OutlineRecovery {
  return { ...rec, strokes: rec.strokes.map((s) => ({ ...s, points: s.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) })) };
}

interface Geometry {
  cmds: Cmd[];
  /** The element is a basic shape, not a path. */
  basic: boolean;
  /** A path with this many nodes; for telling a doodle from a ruled line. */
  nodes: number;
  curved: boolean;
}

function geometryOf(node: XNode, w: Walk, fontPx: number): Geometry | null {
  const a = node.attrs;
  const len = (v: string | undefined, dflt = 0): number | null => (v === undefined ? dflt : parseLength(v, fontPx));
  const bad = () => { w.c.badShapes++; return null; };
  switch (node.name) {
    case 'path': {
      const d = a.d ?? '';
      const p = parsePath(d, Math.max(1, w.vertices.left));
      if (p.capped) stopWith(w, `stopped after ${plural(w.limits.vertices, 'point')} of outline — the drawing is more detailed than is read, and the rest is left`);
      else if (p.error) {
        w.c.pathsStopped++;
        if (!w.c.firstPathError) w.c.firstPathError = p.error;
      }
      if (p.cmds.length === 0) { if (d.trim() && !p.error) w.c.brokenPaths++; return null; }
      return { cmds: p.cmds, basic: false, nodes: p.cmds.filter((c) => c.c !== 'Z').length, curved: p.curved };
    }
    case 'rect': {
      const x = len(a.x), y = len(a.y), width = len(a.width), height = len(a.height);
      if (x === null || y === null || width === null || height === null || !(width > 0) || !(height > 0)) return bad();
      let rx = a.rx !== undefined ? len(a.rx) : null, ry = a.ry !== undefined ? len(a.ry) : null;
      if (a.rx !== undefined && rx === null) return bad();
      if (a.ry !== undefined && ry === null) return bad();
      if (rx === null) rx = ry ?? 0;
      if (ry === null) ry = rx;
      return { cmds: rectCmds(x, y, width, height, rx, ry), basic: true, nodes: 4, curved: rx > 0 && ry > 0 };
    }
    case 'circle': {
      const cx = len(a.cx), cy = len(a.cy), r = len(a.r);
      if (cx === null || cy === null || r === null || !(r > 0)) return bad();
      return { cmds: ellipseCmds(cx, cy, r, r), basic: true, nodes: 4, curved: true };
    }
    case 'ellipse': {
      const cx = len(a.cx), cy = len(a.cy);
      let rx = len(a.rx), ry = len(a.ry);
      if (cx === null || cy === null || rx === null || ry === null) return bad();
      if (a.rx === undefined) rx = ry;
      if (a.ry === undefined) ry = rx;
      if (!(rx > 0) || !(ry > 0)) return bad();
      return { cmds: ellipseCmds(cx, cy, rx, ry), basic: true, nodes: 4, curved: true };
    }
    case 'line': {
      const x1 = len(a.x1), y1 = len(a.y1), x2 = len(a.x2), y2 = len(a.y2);
      if (x1 === null || y1 === null || x2 === null || y2 === null) return bad();
      return { cmds: lineCmds(x1, y1, x2, y2), basic: true, nodes: 2, curved: false };
    }
    case 'polyline':
    case 'polygon': {
      const cmds = pointsCmds(a.points ?? '', node.name === 'polygon');
      if (!cmds) return bad();
      return { cmds, basic: node.name === 'polygon', nodes: cmds.filter((c) => c.c !== 'Z').length, curved: false };
    }
  }
  return null;
}

function paintShape(node: XNode, st: Style, m: Affine, w: Walk): void {
  const geo = geometryOf(node, w, st.fontSize);
  if (!geo) return;
  if (!finiteAffine(m)) return;
  const fill = st.visible && st.opacity > 0 ? resolve(st.fill, w) : null;
  const strokeP = st.visible && st.opacity > 0 && st.strokeWidth > 0 ? resolve(st.stroke, w) : null;
  const fillAlpha = fill ? fill.alpha * st.fillOpacity * st.opacity : 0;
  const strokeAlpha = strokeP ? strokeP.alpha * st.strokeOpacity * st.opacity : 0;
  const doFill = !!fill && fillAlpha > 0 && node.name !== 'line';
  const doStroke = !!strokeP && strokeAlpha > 0;
  if (!doFill && !doStroke) return;

  const s = scaleOf(m);
  const cacheKey = w.cloning > 0 && doFill ? `${node.uid}|${st.fillRule}|${m.a.toFixed(5)}|${m.b.toFixed(5)}|${m.c.toFixed(5)}|${m.d.toFixed(5)}` : '';
  let recs: OutlineRecovery[] | null = null;
  let polys: Poly[] | null = null;
  const flat = (): Poly[] => {
    if (!polys) {
      polys = flatten(geo.cmds, m, FLATTEN_TOL, w.vertices);
      if (w.vertices.left <= 0) stopWith(w, `stopped after ${plural(w.limits.vertices, 'point')} of outline — the drawing is more detailed than is read, and the rest is left`);
    }
    return polys;
  };

  let penOutlines = 0, solids = 0;
  let penColor = '', penWidth = 0;
  if (doFill) {
    if (cacheKey) {
      const hit = w.cache.get(cacheKey);
      if (hit) { recs = hit.results.map((r) => shifted(r, m.e - hit.e, m.f - hit.f)); }
    }
    if (!recs) {
      const rings = flat().filter((p) => p.pts.length >= 3).map((p) => p.pts);
      if (rings.length) {
        if (Date.now() >= w.deadline) { timeUp(w); return; }
        if (w.outlines >= w.limits.outlines) {
          stopWith(w, `stopped after ${plural(w.limits.outlines, 'outline')} read back to lines — the file has more, and the rest is left`);
          return;
        }
        recs = recoverFill({ rings, rule: st.fillRule }, { work: w.work });
        w.outlines += recs.length;
        if (cacheKey) w.cache.set(cacheKey, { results: recs, e: m.e, f: m.f });
      }
    }
    for (const rec of recs ?? []) {
      if (rec.kind === 'failed') { w.c.failed++; continue; }
      const outline = w.outline++;
      if (rec.kind === 'blob') {
        solids++;
        const ground = w.known && isGround(rec, w);
        if (ground) { w.c.grounds++; continue; }
        if (doStroke) continue; // its edge is the stroke's, drawn once below
        for (const e of rec.strokes) if (!pushStroke(w, { points: e.points, color: fill!.hex, width: 0, recovery: e.recovery, closed: e.closed, outline, ...(fillAlpha < 1 ? { opacity: roundOpacity(fillAlpha) } : {}) })) return;
        continue;
      }
      penOutlines++;
      penColor = fill!.hex;
      penWidth = rec.width;
      if (rec.fidelity && !rec.fidelity.faithful) w.c.unfaithful++;
      // Where a path effect kept the line the outline was made from, that line is the stroke.
      const kept = node.attrs['inkscape:original-d'];
      if (kept && node.attrs['inkscape:path-effect'] && rec.kind === 'pen') {
        const orig = parsePath(kept);
        const lines = flatten(orig.cmds, m, FLATTEN_TOL, w.vertices);
        if (lines.length) {
          for (const l of lines) {
            const pts = inkPoints(l.pts, l.closed);
            if (!pts) { w.c.badShapes++; continue; }
            if (!pushStroke(w, { points: pts, color: fill!.hex, width: rec.width, recovery: 'stroke', closed: l.closed, outline, ...(fillAlpha < 1 ? { opacity: roundOpacity(fillAlpha) } : {}) })) return;
          }
          continue;
        }
      }
      for (const e of rec.strokes) {
        const fid = rec.kind === 'pen' ? rec.fidelity : undefined;
        if (!pushStroke(w, { points: e.points, color: fill!.hex, width: rec.width, recovery: e.recovery as Recovery, closed: e.closed, outline, ...(fid ? { fidelity: fid } : {}), ...(fillAlpha < 1 ? { opacity: roundOpacity(fillAlpha) } : {}) })) return;
      }
    }
  }

  let counted = false;
  if (penOutlines > 0) { w.ev.penFills += penOutlines; counted = true; }
  if (doStroke) {
    const width = st.strokeWidth * s;
    // A hairline round a pen's fill, in the fill's colour, is an edge, not another stroke.
    const edge = penOutlines > 0 && (strokeP!.hex === penColor || width <= 0.35 * penWidth);
    const lines = flat();
    const freeform = !geo.basic && (geo.curved ? geo.nodes >= FREEFORM_NODES - 1 : geo.nodes >= FREEFORM_NODES);
    if (!edge) {
      for (const l of lines) {
        if (l.pts.length < 2) continue;
        const outline = w.outline++;
        let len = 0;
        for (let i = 1; i < l.pts.length; i++) len += Math.hypot(l.pts[i].x - l.pts[i - 1].x, l.pts[i].y - l.pts[i - 1].y);
        if (!(len > 1e-9)) { w.c.zeroLength++; continue; }
        const pts = inkPoints(l.pts, l.closed);
        if (!pts) { w.c.badShapes++; continue; }
        if (!pushStroke(w, { points: pts, color: strokeP!.hex, width, recovery: 'stroke', closed: l.closed, outline, ...(strokeAlpha < 1 ? { opacity: roundOpacity(strokeAlpha) } : {}) })) return;
      }
      if (lines.length) {
        if (freeform) { w.ev.penStrokes += lines.length; counted = true; }
        else if (!counted) { w.ev.shapes++; counted = true; }
      }
    }
  }
  if (!counted && solids > 0) w.ev.shapes++;
}

/** A solid that spans the page both ways, as a page's ground does. */
function isGround(rec: OutlineRecovery, w: Walk): boolean {
  if (!(w.page.width > 0) || !(w.page.height > 0)) return false;
  const pts = rec.strokes[0]?.points;
  if (!pts || !pts.length) return false;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) { if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x; if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y; }
  return maxX - minX >= GROUND_SHARE * w.page.width && maxY - minY >= GROUND_SHARE * w.page.height;
}

// ---- words and pictures ----------------------------------------------------------------------------------

function firstNumberAttr(node: XNode, name: string, fontPx: number): number | null {
  const find = (n: XNode): string | undefined => {
    if (n.attrs[name] !== undefined) return n.attrs[name];
    for (const k of n.kids) if (typeof k !== 'string') { const v = find(k); if (v !== undefined) return v; }
    return undefined;
  };
  const v = find(node);
  if (v === undefined) return 0;
  return parseLength(v.trim().split(/[\s,]+/)[0], fontPx);
}

function paintText(node: XNode, st: Style, m: Affine, w: Walk): void {
  if (!st.visible || st.opacity <= 0) return;
  const text = textOf(node);
  if (!text) return;
  const x = firstNumberAttr(node, 'x', st.fontSize), y = firstNumberAttr(node, 'y', st.fontSize);
  if (x === null || y === null || !finiteAffine(m)) { w.c.badShapes++; return; }
  if (Math.abs(m.b) > 1e-6 || Math.abs(m.c) > 1e-6) w.c.rotatedText++;
  const fill = resolve(st.fill, w);
  const run = { order: w.order++, text, x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f, size: st.fontSize * scaleOf(m), format: 'plain' as const, ...(fill ? { color: fill.hex } : {}) };
  w.page.texts.push(run);
  w.ev.texts++;
}

const B64 = (() => {
  const t = new Int16Array(128).fill(-1);
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  for (let i = 0; i < A.length; i++) t[A.charCodeAt(i)] = i;
  t[45] = 62; t[95] = 63; // the address-safe - and _
  return t;
})();

/** Bytes from base64; null when the text is not. */
export function fromBase64(s: string): Uint8Array | null {
  const out = new Uint8Array(Math.floor((s.length * 3) / 4));
  let o = 0, acc = 0, bits = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 61) break;
    if (c === 32 || (c >= 9 && c <= 13)) continue;
    const v = c < 128 ? B64[c] : -1;
    if (v < 0) return null;
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) { bits -= 8; out[o++] = (acc >> bits) & 255; acc &= (1 << bits) - 1; }
  }
  return out.subarray(0, o);
}

function paintImage(node: XNode, st: Style, m: Affine, w: Walk): void {
  if (!st.visible || st.opacity <= 0) return;
  const a = node.attrs;
  const href = a['xlink:href'] ?? a.href;
  if (!href) return;
  const x = parseLength(a.x ?? '0'), y = parseLength(a.y ?? '0'), width = parseLength(a.width), height = parseLength(a.height);
  if (x === null || y === null || width === null || height === null || !(width > 0) || !(height > 0) || !finiteAffine(m)) { w.c.badPictures++; return; }
  const corners = [[x, y], [x + width, y], [x, y + height], [x + width, y + height]].map(([px, py]) => ({ x: m.a * px + m.c * py + m.e, y: m.b * px + m.d * py + m.f }));
  const box = {
    x: Math.min(...corners.map((c) => c.x)), y: Math.min(...corners.map((c) => c.y)),
    w: Math.max(...corners.map((c) => c.x)) - Math.min(...corners.map((c) => c.x)), h: Math.max(...corners.map((c) => c.y)) - Math.min(...corners.map((c) => c.y)),
  };
  const data = /^data:([^;,]*)((?:;[^;,]*)*),(.*)$/s.exec(href.trim());
  if (data) {
    if (!/;base64/i.test(data[2])) { w.c.svgPictures++; return; }
    const bytes = fromBase64(data[3]);
    const info = bytes ? sniffImage(bytes) : null;
    if (!bytes || !info || info.format === 'gif') { if (/svg/i.test(data[1])) w.c.svgPictures++; else w.c.badPictures++; return; }
    const shown = shownSize(info);
    w.page.pictures.push({ order: w.order++, box, bytes, mime: info.mime, w: shown.w || undefined, h: shown.h || undefined });
  } else {
    w.c.externalPictures++;
    w.page.pictures.push({ order: w.order++, box, ref: href, name: href.split(/[\\/]/).pop() });
  }
  w.ev.images++;
}

// ---- the walk --------------------------------------------------------------------------------------------

/** Elements that are never painted where they stand: their content is for something else to use. */
const NOT_PAINTED = new Set(['defs', 'symbol', 'clipPath', 'mask', 'marker', 'pattern', 'filter', 'linearGradient', 'radialGradient', 'style', 'metadata', 'title', 'desc', 'script', 'foreignObject']);
const SHAPES = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon']);
const GROUPS = new Set(['g', 'a', 'switch', 'svg']);

function walk(node: XNode, parent: Style, m: Affine, w: Walk, chain: string[]): void {
  if (!tick(w)) return;
  const name = node.name;
  if (NOT_PAINTED.has(name)) {
    if (name === 'foreignObject') w.c.foreign++;
    return;
  }
  if (!SHAPES.has(name) && !GROUPS.has(name) && name !== 'use' && name !== 'text' && name !== 'image') return;
  const { st, shown } = styleOf(node, parent, w);
  if (!shown) return;
  const t = parseTransform(node.attrs.transform);
  if (t === null) w.c.badTransforms++;
  const here = t ? compose(m, t) : m;
  if (node.attrs['clip-path'] || /clip-path\s*:/.test(node.attrs.style ?? '')) w.c.clipped++;
  if (node.attrs.mask || /mask\s*:/.test(node.attrs.style ?? '')) w.c.masked++;
  if (node.attrs.filter) w.c.filters++;
  if (node.attrs['marker-end'] || node.attrs['marker-start'] || node.attrs['marker-mid']) w.c.markers++;

  if (SHAPES.has(name)) { paintShape(node, st, here, w); return; }
  if (name === 'text') { paintText(node, st, here, w); return; }
  if (name === 'image') { paintImage(node, st, here, w); return; }
  if (name === 'use') { expandUse(node, st, here, w, chain); return; }
  // A group, a link, a switch or a nested svg: its children, in order.
  let inner = here;
  if (name === 'svg') {
    const x = parseLength(node.attrs.x ?? '0') ?? 0, y = parseLength(node.attrs.y ?? '0') ?? 0;
    const vb = node.attrs.viewBox ? numberList(node.attrs.viewBox) : null;
    const W = parseLength(node.attrs.width), H = parseLength(node.attrs.height);
    inner = compose(here, translation(x, y));
    if (vb && vb.length === 4 && vb[2] > 0 && vb[3] > 0 && W !== null && H !== null && W > 0 && H > 0) inner = compose(inner, viewBoxMap(vb, W, H, node.attrs.preserveAspectRatio));
  }
  if (name === 'a') {
    const href = node.attrs['xlink:href'] ?? node.attrs.href;
    if (href && href[0] !== '#') w.page.links.push({ kind: 'href', target: href });
  }
  for (const k of node.kids) {
    if (typeof k === 'string') continue;
    walk(k, st, inner, w, chain);
    if (w.stopped) return;
  }
}

function expandUse(node: XNode, st: Style, m: Affine, w: Walk, chain: string[]): void {
  const href = node.attrs['xlink:href'] ?? node.attrs.href;
  if (!href || href[0] !== '#') { if (href) w.c.externalUses++; return; }
  const id = href.slice(1);
  const target = w.byId.get(id);
  if (!target) { w.c.missingUses++; return; }
  if (chain.includes(id) || target === node) { w.c.cycles++; return; }
  if (++w.clones > w.limits.clones) {
    stopWith(w, `stopped expanding <use> after ${plural(w.limits.clones, 'clone')} — the file has more, and the rest is left`);
    return;
  }
  if (chain.length >= 64) { w.c.cycles++; return; }
  const x = parseLength(node.attrs.x ?? '0') ?? 0, y = parseLength(node.attrs.y ?? '0') ?? 0;
  const at = compose(m, translation(x, y));
  w.cloning++;
  try {
    if (target.name === 'symbol') {
      const vb = target.attrs.viewBox ? numberList(target.attrs.viewBox) : null;
      const W = parseLength(node.attrs.width ?? target.attrs.width), H = parseLength(node.attrs.height ?? target.attrs.height);
      let inner = at;
      if (vb && vb.length === 4 && vb[2] > 0 && vb[3] > 0) {
        const sw = W !== null && W > 0 ? W : vb[2], sh = H !== null && H > 0 ? H : vb[3];
        inner = compose(at, viewBoxMap(vb, sw, sh, target.attrs.preserveAspectRatio ?? node.attrs.preserveAspectRatio));
      }
      const { st: sst, shown } = styleOf(target, st, w);
      if (!shown) return;
      for (const k of target.kids) {
        if (typeof k === 'string') continue;
        walk(k, sst, inner, w, [...chain, id]);
        if (w.stopped) return;
      }
    } else {
      walk(target, st, at, w, [...chain, id]);
    }
  } finally {
    w.cloning--;
  }
}

// ---- the file --------------------------------------------------------------------------------------------

const fmtBytes = (n: number) => (n < 1024 ? `${n} bytes` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);

function decodeText(bytes: Uint8Array): string | null {
  let enc = 'utf-8';
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) enc = 'utf-16le';
  else if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) enc = 'utf-16be';
  let text: string;
  try { text = new TextDecoder(enc).decode(bytes); } catch { return null; }
  // Text that is mostly replacement characters or NULs is a binary file.
  let bad = 0;
  const probe = Math.min(text.length, 20000);
  for (let i = 0; i < probe; i++) { const c = text.charCodeAt(i); if (c === 0xfffd || c === 0) bad++; }
  return probe > 0 && bad / probe > 0.02 ? null : text;
}

function toolOf(comments: string[], root: XNode): string | undefined {
  for (const c of comments) {
    const g = /Generator:\s*([^,\n]+)/i.exec(c);
    if (g) return g[1].trim().replace(/\s+/g, ' ');
  }
  const inkscape = root.attrs['inkscape:version'];
  if (inkscape) return 'Inkscape ' + inkscape.trim().split(/\s+/)[0];
  for (const c of comments) {
    const k = /(Illustrator|Inkscape|Sketch|Figma|Wacom|Inkspace|OneNote|Affinity|CorelDRAW|Canva)/i.exec(c);
    if (k) return k[1];
  }
  return undefined;
}

function findAll(node: XNode, name: string, out: XNode[] = []): XNode[] {
  if (node.name === name) out.push(node);
  for (const k of node.kids) if (typeof k !== 'string') findAll(k, name, out);
  return out;
}

function sentencesOf(c: Counters): string[] {
  const out: string[] = [];
  const say = (n: number, one: string, many: string) => { if (n > 0) out.push((n === 1 ? one : many).replace('{n}', n.toLocaleString('en'))); };
  say(c.clipped, 'one element uses a clip path, which was not applied — ink it hid may show', '{n} elements use clip paths, which were not applied — ink they hid may show');
  say(c.masked, 'one element uses a mask, which was not applied — ink it hid may show', '{n} elements use masks, which were not applied — ink they hid may show');
  say(c.gradients, 'one mark is painted with a gradient; its first colour was used', '{n} marks are painted with gradients; their first colours were used');
  say(c.patterns, 'one mark is painted with a pattern, which is not read', '{n} marks are painted with patterns, which are not read');
  say(c.dashed, 'one element is dashed; it is drawn solid', '{n} elements are dashed; they are drawn solid');
  say(c.markers, 'one element has a marker (an arrowhead, a dot), which is not drawn', '{n} elements have markers (arrowheads, dots), which are not drawn');
  say(c.filters, 'one element has a filter (a blur, a shadow), which is not applied', '{n} elements have filters (blurs, shadows), which are not applied');
  say(c.foreign, 'one embedded page (foreignObject) was left out', '{n} embedded pages (foreignObject) were left out');
  say(c.rotatedText, 'one piece of text is turned or skewed; its words are kept, upright', '{n} pieces of text are turned or skewed; their words are kept, upright');
  say(c.externalPictures, 'one picture lives in another file, which is not part of this one; it is kept as a reference', '{n} pictures live in other files, which are not part of this one; they are kept as references');
  say(c.svgPictures, 'one picture is an SVG inside this SVG, which is not read', '{n} pictures are SVGs inside this SVG, which are not read');
  say(c.badPictures, 'one picture could not be read', '{n} pictures could not be read');
  say(c.pathsStopped, `one path stopped where its data stops making sense (${c.firstPathError}); what came before is kept`, `{n} paths stopped where their data stops making sense (the first: ${c.firstPathError}); what came before is kept`);
  say(c.brokenPaths, 'one path had nothing to draw', '{n} paths had nothing to draw');
  say(c.badShapes, 'one shape had a size or a number that is not one, and was left out', '{n} shapes had a size or a number that is not one, and were left out');
  say(c.badTransforms, 'one transform could not be read and was ignored', '{n} transforms could not be read and were ignored');
  say(c.cycles, 'one <use> refers to itself or nests too deeply, and was not expanded', '{n} <use> elements refer to themselves or nest too deeply, and were not expanded');
  say(c.missingUses, 'one <use> refers to something that is not in the file', '{n} <use> elements refer to something that is not in the file');
  say(c.externalUses, 'one <use> refers to another file, which is not read', '{n} <use> elements refer to other files, which are not read');
  say(c.grounds, 'a solid shape fills the page — a background, not a mark — and was left out', '{n} solid shapes fill the page — backgrounds, not marks — and were left out');
  say(c.zeroLength, 'one stroked line has no length, and was left out', '{n} stroked lines have no length, and were left out');
  say(c.failed, 'one outline could not be read back to a line', '{n} outlines could not be read back to lines');
  say(c.unfaithful, 'one outline comes back only roughly as its pen stroke (the line covers or stays on under 90% of it)', '{n} outlines come back only roughly as their pen strokes (the lines cover or stay on under 90% of them)');
  say(c.droppedCss, `one style rule past the first ${MAX_RULES.toLocaleString('en')} was not read`, `{n} style rules past the first ${MAX_RULES.toLocaleString('en')} were not read`);
  say(c.unsupportedCss, 'one style rule needs a selector that is not read (a descendant, an attribute, a pseudo-class)', '{n} style rules need selectors that are not read (descendants, attributes, pseudo-classes)');
  return out;
}

function readingOf(ev: Evidence, work: { clones: number; outlines: number }): Reading {
  const ink = ev.penFills + ev.penStrokes;
  const design = ev.shapes + ev.texts + ev.images;
  const total = ink + design;
  const as: 'ink' | 'figure' = total > 0 && ink / total >= 0.5 ? 'ink' : 'figure';
  const parts = (...xs: [number, string][]) => xs.filter(([n]) => n > 0).map(([n, s]) => `${n.toLocaleString('en')} ${s}`).join(', ');
  const words = total === 0
    ? 'a figure with nothing painted in it'
    : as === 'ink'
      ? `drawn: ${ink.toLocaleString('en')} of ${total.toLocaleString('en')} painted things are pen-shaped (${parts([ev.penFills, ev.penFills === 1 ? 'filled outline' : 'filled outlines'], [ev.penStrokes, ev.penStrokes === 1 ? 'stroked line' : 'stroked lines'])})${design ? `, beside ${parts([ev.shapes, ev.shapes === 1 ? 'shape' : 'shapes'], [ev.texts, ev.texts === 1 ? 'word' : 'words'], [ev.images, ev.images === 1 ? 'picture' : 'pictures'])}` : ''}`
      : `designed: ${design.toLocaleString('en')} of ${total.toLocaleString('en')} painted things are shapes and words (${parts([ev.shapes, ev.shapes === 1 ? 'shape' : 'shapes'], [ev.texts, ev.texts === 1 ? 'piece of text' : 'pieces of text'], [ev.images, ev.images === 1 ? 'picture' : 'pictures'])})${ink ? `, beside ${ink.toLocaleString('en')} pen-shaped` : ''}`;
  return { as, evidence: { ...ev, clones: work.clones, outlinesRead: work.outlines }, words };
}

export function ingestSvg(bytes: Uint8Array, name: string, hash: string, opts: IngestOptions = {}): IngestResult {
  try {
    return read(bytes, name, hash, opts);
  } catch (err) {
    return refuse('this SVG could not be read: ' + (err instanceof Error ? err.message : String(err)));
  }
}

function read(bytes: Uint8Array, name: string, hash: string, opts: IngestOptions): IngestResult {
  const limits: IngestLimits = { ...DEFAULT_LIMITS, ...opts.limits };
  if (bytes.length > limits.bytes) return refuse(`that file is ${fmtBytes(bytes.length)} — over the ${fmtBytes(limits.bytes)} limit on what is read`);
  const text = decodeText(bytes);
  if (text === null) return refuse('that file is not text, so it is not an SVG');
  const parsed = parseXml(text, { maxNodes: limits.elements, maxDepth: limits.depth });
  if (!parsed.ok) return refuse(`this is not a readable SVG: ${parsed.reason}`);
  const root = parsed.root;
  if (root.name !== 'svg') return refuse(`that is not an SVG — its first element is <${root.name}>`);
  const frame = frameOf(root);
  if (typeof frame === 'string') return refuse(`this SVG cannot be placed: ${frame}`);

  let sheet: Sheet = emptySheet();
  const css = findAll(root, 'style').map((s) => textOf(s)).join('\n');
  if (css.trim()) sheet = parseSheet(css);

  const page = blankPage(0, frame.width, frame.height);
  const w: Walk = {
    limits, deadline: Date.now() + limits.ms, byId: parsed.byId, sheet, page, known: frame.known, order: 0, outline: 0, visited: 0, clones: 0, outlines: 0, points: 0,
    vertices: { left: limits.vertices }, work: { rasterPx: limits.rasterPx }, stopped: null, c: newCounters(), ev: { penFills: 0, penStrokes: 0, shapes: 0, texts: 0, images: 0 },
    cache: new Map(), cloning: 0,
  };
  w.c.unsupportedCss = sheet.unsupported;
  w.c.droppedCss = sheet.dropped;

  // The root is walked as a group under the frame's map; its own style and transform apply to it.
  const rootStyle = styleOf(root, ROOT_STYLE, w);
  const rt = parseTransform(root.attrs.transform);
  const base = rt ? compose(frame.m, rt) : frame.m;
  if (rootStyle.shown) {
    for (const k of root.kids) {
      if (typeof k === 'string') continue;
      walk(k, rootStyle.st, base, w, []);
      if (w.stopped) break;
    }
  }

  // A file that gives no size is as big as what is drawn.
  const notes = sentencesOf(w.c);
  if (!frame.known) {
    let maxX = 0, maxY = 0;
    for (const s of page.strokes) for (const p of s.points) { if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y; }
    for (const p of page.pictures) { maxX = Math.max(maxX, p.box.x + p.box.w); maxY = Math.max(maxY, p.box.y + p.box.h); }
    for (const t of page.texts) { maxX = Math.max(maxX, t.x); maxY = Math.max(maxY, t.y); }
    page.width = frame.width > 0 ? frame.width : Math.max(1, Math.ceil(maxX));
    page.height = frame.height > 0 ? frame.height : Math.max(1, Math.ceil(maxY));
    notes.unshift('the file gives no size, so the page is as big as what is drawn on it');
  }
  if (w.stopped) notes.unshift(w.stopped);

  const title = findAll(root, 'title').find((t) => t.parent === root);
  const date = findAll(root, 'dc:date')[0];
  const created = date ? textOf(date) : '';
  const tool = toolOf(parsed.comments, root);
  const doc: InkDocument = {
    source: { hash, name, format: 'svg', ...(tool ? { tool } : {}), ...(created ? { created } : {}) },
    adapter: `svg@${ADAPTER_VERSIONS.svg}`,
    pages: [page],
    reading: readingOf(w.ev, { clones: w.clones, outlines: w.outlines }),
    ...(title && textOf(title) ? { title: textOf(title) } : {}),
    ...(w.stopped ? { truncated: w.stopped } : {}),
  };
  return accept(doc, notes);
}

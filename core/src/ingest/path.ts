// SVG path data and shapes as lines (V1-SPEC IN1, the SVG adapter's geometry).
//
// A path's `d` is read into absolute moves, lines and cubic curves: every command (M L H V C S Q T A Z) in
// capitals and small letters, numbers written compactly (`1.5.5`, `-1-2`, arc flags with no space after them), a
// command's arguments repeated without repeating the letter, a quadratic raised to a cubic, an arc cut into
// cubics. The basic shapes (`rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`) become the same commands.
// `flatten` carries them through a transform and walks the curves into polylines, finely enough that no point is
// farther than a tolerance from the curve.
//
// Read, not trusted (DATA-1): the path ends where it stops making sense, as an SVG renderer's does, and says
// where and why; a number that is not finite is the same as a number that is not there. Nothing throws.

import type { Point } from '../types';
import type { Affine } from '../session/affine';

export type Cmd =
  | { c: 'M'; x: number; y: number }
  | { c: 'L'; x: number; y: number }
  | { c: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { c: 'Z' };

export interface PathParse {
  cmds: Cmd[];
  /** Why reading stopped before the end, in words; null when it reached it. */
  error: string | null;
  /** Whether the path has any curve in it. */
  curved: boolean;
}

const ARGS: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
const NUMBER = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;

/** The cubics (as `[x1, y1, x2, y2, x, y]`) that follow an elliptical arc (SVG 1.1 F.6.5): at most a quarter turn each. */
export function arcCubics(x0: number, y0: number, rxIn: number, ryIn: number, phiDeg: number, fa: boolean, fs: boolean, x: number, y: number): number[][] | null {
  if (x0 === x && y0 === y) return [];
  let rx = Math.abs(rxIn), ry = Math.abs(ryIn);
  if (!(rx > 0) || !(ry > 0)) return null;
  const phi = (phiDeg * Math.PI) / 180;
  const cos = Math.cos(phi), sin = Math.sin(phi);
  const dx2 = (x0 - x) / 2, dy2 = (y0 - y) / 2;
  const x1p = cos * dx2 + sin * dy2, y1p = -sin * dx2 + cos * dy2;
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) { const s = Math.sqrt(lambda); rx *= s; ry *= s; }
  const sign = fa === fs ? -1 : 1;
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  if (!(den > 0)) return null;
  const coef = sign * Math.sqrt(Math.max(0, num / den));
  const cxp = (coef * rx * y1p) / ry, cyp = (-coef * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (x0 + x) / 2, cy = sin * cxp + cos * cyp + (y0 + y) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const ux = (x1p - cxp) / rx, uy = (y1p - cyp) / ry;
  const vx = (-x1p - cxp) / rx, vy = (-y1p - cyp) / ry;
  const theta = ang(1, 0, ux, uy);
  let dtheta = ang(ux, uy, vx, vy);
  if (!fs && dtheta > 0) dtheta -= 2 * Math.PI;
  else if (fs && dtheta < 0) dtheta += 2 * Math.PI;
  const segs = Math.max(1, Math.ceil(Math.abs(dtheta) / (Math.PI / 2) - 1e-9));
  const t = dtheta / segs;
  const k = (4 / 3) * Math.tan(t / 4);
  const out: number[][] = [];
  const at = (a: number, dxa: number, dya: number): [number, number] => {
    // A point at angle a (plus a tangent offset) on the ellipse, turned by phi and moved to the centre.
    const px = Math.cos(a) + dxa, py = Math.sin(a) + dya;
    return [cos * rx * px - sin * ry * py + cx, sin * rx * px + cos * ry * py + cy];
  };
  for (let s = 0; s < segs; s++) {
    const a1 = theta + s * t, a2 = a1 + t;
    const c1 = at(a1, -k * Math.sin(a1), k * Math.cos(a1));
    const c2 = at(a2, k * Math.sin(a2), -k * Math.cos(a2));
    const e = s === segs - 1 ? [x, y] : at(a2, 0, 0);
    out.push([c1[0], c1[1], c2[0], c2[1], e[0], e[1]]);
  }
  for (const seg of out) for (const v of seg) if (!Number.isFinite(v)) return null;
  return out;
}

/** The path data `d` as absolute commands, up to `maxCmds` of them. */
export function parsePath(d: string, maxCmds = 2_000_000): PathParse {
  const cmds: Cmd[] = [];
  const n = d.length;
  let i = 0;
  let curved = false;
  let cx = 0, cy = 0, sx = 0, sy = 0;
  // The last control point, for a smooth curve to reflect: of a cubic after C or S, of a quadratic after Q or T.
  let lcx = 0, lcy = 0;
  let last = '';
  let cmd = '';
  let error: string | null = null;

  const skip = () => {
    while (i < n) {
      const c = d.charCodeAt(i);
      if (c === 32 || c === 44 || (c >= 9 && c <= 13)) i++;
      else break;
    }
  };
  const num = (): number | null => {
    skip();
    NUMBER.lastIndex = i;
    const m = NUMBER.exec(d);
    if (!m) return null;
    const v = Number(m[0]);
    if (!Number.isFinite(v)) return null;
    i += m[0].length;
    return v;
  };
  const flag = (): boolean | null => {
    skip();
    const c = d[i];
    if (c === '0' || c === '1') { i++; return c === '1'; }
    return null;
  };

  skip();
  if (i >= n) return { cmds, error: null, curved };
  while (i < n && !error) {
    skip();
    if (i >= n) break;
    const ch = d[i];
    const up = ch.toUpperCase();
    if (/[A-Za-z]/.test(ch)) {
      if (!(up in ARGS)) { error = `path data has an unknown command “${ch}”`; break; }
      cmd = ch;
      i++;
      if (cmds.length === 0 && up !== 'M') { error = 'path data does not begin with a move'; break; }
    } else if (cmd === '') {
      error = 'path data does not begin with a command';
      break;
    } else if (cmd === 'Z' || cmd === 'z') {
      error = 'path data has numbers after a close';
      break;
    } else if (cmd === 'M') cmd = 'L';
    else if (cmd === 'm') cmd = 'l';
    if (cmds.length >= maxCmds) { error = 'path data is longer than is read'; break; }

    const rel = cmd === cmd.toLowerCase();
    const U = cmd.toUpperCase();
    if (U === 'Z') {
      cmds.push({ c: 'Z' });
      cx = sx; cy = sy;
      last = 'Z';
      continue;
    }
    const a: number[] = [];
    let ok = true;
    for (let k = 0; k < ARGS[U] && ok; k++) {
      let v: number | null;
      if (U === 'A' && (k === 3 || k === 4)) { const f = flag(); v = f === null ? null : f ? 1 : 0; }
      else v = num();
      if (v === null) ok = false; else a.push(v);
    }
    if (!ok) { error = `path data has a “${cmd}” with a missing or unreadable number`; break; }

    const ox = rel ? cx : 0, oy = rel ? cy : 0;
    switch (U) {
      case 'M':
        cx = a[0] + ox; cy = a[1] + oy; sx = cx; sy = cy;
        cmds.push({ c: 'M', x: cx, y: cy });
        break;
      case 'L':
        cx = a[0] + ox; cy = a[1] + oy;
        cmds.push({ c: 'L', x: cx, y: cy });
        break;
      case 'H':
        cx = a[0] + ox;
        cmds.push({ c: 'L', x: cx, y: cy });
        break;
      case 'V':
        cy = a[0] + (rel ? cy : 0);
        cmds.push({ c: 'L', x: cx, y: cy });
        break;
      case 'C': {
        const x1 = a[0] + ox, y1 = a[1] + oy, x2 = a[2] + ox, y2 = a[3] + oy, x = a[4] + ox, y = a[5] + oy;
        cmds.push({ c: 'C', x1, y1, x2, y2, x, y });
        lcx = x2; lcy = y2; cx = x; cy = y; curved = true;
        break;
      }
      case 'S': {
        const x1 = last === 'C' || last === 'S' ? 2 * cx - lcx : cx, y1 = last === 'C' || last === 'S' ? 2 * cy - lcy : cy;
        const x2 = a[0] + ox, y2 = a[1] + oy, x = a[2] + ox, y = a[3] + oy;
        cmds.push({ c: 'C', x1, y1, x2, y2, x, y });
        lcx = x2; lcy = y2; cx = x; cy = y; curved = true;
        break;
      }
      case 'Q': {
        const qx = a[0] + ox, qy = a[1] + oy, x = a[2] + ox, y = a[3] + oy;
        cmds.push({ c: 'C', x1: cx + (2 / 3) * (qx - cx), y1: cy + (2 / 3) * (qy - cy), x2: x + (2 / 3) * (qx - x), y2: y + (2 / 3) * (qy - y), x, y });
        lcx = qx; lcy = qy; cx = x; cy = y; curved = true;
        break;
      }
      case 'T': {
        const qx = last === 'Q' || last === 'T' ? 2 * cx - lcx : cx, qy = last === 'Q' || last === 'T' ? 2 * cy - lcy : cy;
        const x = a[0] + ox, y = a[1] + oy;
        cmds.push({ c: 'C', x1: cx + (2 / 3) * (qx - cx), y1: cy + (2 / 3) * (qy - cy), x2: x + (2 / 3) * (qx - x), y2: y + (2 / 3) * (qy - y), x, y });
        lcx = qx; lcy = qy; cx = x; cy = y; curved = true;
        break;
      }
      case 'A': {
        const x = a[5] + ox, y = a[6] + oy;
        const arcs = arcCubics(cx, cy, a[0], a[1], a[2], a[3] === 1, a[4] === 1, x, y);
        if (arcs === null) cmds.push({ c: 'L', x, y });
        else { for (const s of arcs) cmds.push({ c: 'C', x1: s[0], y1: s[1], x2: s[2], y2: s[3], x: s[4], y: s[5] }); curved = true; }
        cx = x; cy = y;
        break;
      }
    }
    // The smooth-curve memory is only good for the command right after: a cubic's for S, a quadratic's for T.
    last = U === 'H' || U === 'V' ? 'L' : U === 'A' ? 'A' : U;
  }
  return { cmds, error, curved };
}

// ---- shapes as commands ---------------------------------------------------------------------------------

const KAPPA = 0.5522847498307936;

export function ellipseCmds(cx: number, cy: number, rx: number, ry: number): Cmd[] {
  const ox = rx * KAPPA, oy = ry * KAPPA;
  return [
    { c: 'M', x: cx + rx, y: cy },
    { c: 'C', x1: cx + rx, y1: cy + oy, x2: cx + ox, y2: cy + ry, x: cx, y: cy + ry },
    { c: 'C', x1: cx - ox, y1: cy + ry, x2: cx - rx, y2: cy + oy, x: cx - rx, y: cy },
    { c: 'C', x1: cx - rx, y1: cy - oy, x2: cx - ox, y2: cy - ry, x: cx, y: cy - ry },
    { c: 'C', x1: cx + ox, y1: cy - ry, x2: cx + rx, y2: cy - oy, x: cx + rx, y: cy },
    { c: 'Z' },
  ];
}

export function rectCmds(x: number, y: number, w: number, h: number, rxIn = 0, ryIn = 0): Cmd[] {
  const rx = Math.min(Math.max(0, rxIn), w / 2), ry = Math.min(Math.max(0, ryIn), h / 2);
  if (!(rx > 0) || !(ry > 0)) {
    return [{ c: 'M', x, y }, { c: 'L', x: x + w, y }, { c: 'L', x: x + w, y: y + h }, { c: 'L', x, y: y + h }, { c: 'Z' }];
  }
  const corner = (x0: number, y0: number, x1: number, y1: number): Cmd[] => (arcCubics(x0, y0, rx, ry, 0, false, true, x1, y1) ?? []).map((s) => ({ c: 'C' as const, x1: s[0], y1: s[1], x2: s[2], y2: s[3], x: s[4], y: s[5] }));
  return [
    { c: 'M', x: x + rx, y },
    { c: 'L', x: x + w - rx, y },
    ...corner(x + w - rx, y, x + w, y + ry),
    { c: 'L', x: x + w, y: y + h - ry },
    ...corner(x + w, y + h - ry, x + w - rx, y + h),
    { c: 'L', x: x + rx, y: y + h },
    ...corner(x + rx, y + h, x, y + h - ry),
    { c: 'L', x, y: y + ry },
    ...corner(x, y + ry, x + rx, y),
    { c: 'Z' },
  ];
}

export function lineCmds(x1: number, y1: number, x2: number, y2: number): Cmd[] {
  return [{ c: 'M', x: x1, y: y1 }, { c: 'L', x: x2, y: y2 }];
}

/** The numbers of a `points` attribute as polyline commands; null when it has an odd number of them or none. */
export function pointsCmds(points: string, close: boolean): Cmd[] | null {
  const nums = points.match(/[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g);
  if (!nums || nums.length < 4) return null;
  const out: Cmd[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = Number(nums[i]), y = Number(nums[i + 1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    out.push({ c: i === 0 ? 'M' : 'L', x, y });
  }
  if (close) out.push({ c: 'Z' });
  return out;
}

// ---- flattening -----------------------------------------------------------------------------------------

export interface Poly {
  pts: Point[];
  /** Ended with a close: the last point returns to the first, which is not repeated. */
  closed: boolean;
}

/** The segments a cubic needs for no point of it to be farther than `tol` from the chord it is walked by. */
function segmentsFor(p0: Point, p1: Point, p2: Point, p3: Point, tol: number): number {
  const d1 = Math.hypot(p0.x - 2 * p1.x + p2.x, p0.y - 2 * p1.y + p2.y);
  const d2 = Math.hypot(p1.x - 2 * p2.x + p3.x, p1.y - 2 * p2.y + p3.y);
  const n = Math.ceil(Math.sqrt((0.75 * Math.max(d1, d2)) / Math.max(tol, 1e-9)));
  return Math.max(1, Math.min(200, Number.isFinite(n) ? n : 1));
}

/**
 * The commands, moved by `m`, as polylines. Curves are cut so that no point of the curve is more than `tol` from
 * the line; `budget.left` is the number of vertices still to spend, and the walk stops when it is gone.
 */
export function flatten(cmds: readonly Cmd[], m: Affine, tol: number, budget: { left: number }): Poly[] {
  const out: Poly[] = [];
  const at = (x: number, y: number): Point => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f });
  let cur: Point[] | null = null;
  let start: Point | null = null;
  let pos: Point | null = null;
  const flush = (closed: boolean) => {
    if (cur && cur.length >= 2) out.push({ pts: cur, closed });
    cur = null;
  };
  for (const c of cmds) {
    if (budget.left <= 0) break;
    switch (c.c) {
      case 'M':
        flush(false);
        pos = at(c.x, c.y);
        start = pos;
        cur = [pos];
        budget.left--;
        break;
      case 'L': {
        if (!cur) { if (!start) break; cur = [start]; pos = start; }
        pos = at(c.x, c.y);
        cur.push(pos);
        budget.left--;
        break;
      }
      case 'C': {
        if (!cur) { if (!start) break; cur = [start]; pos = start; }
        const p0 = pos!;
        const p1 = at(c.x1, c.y1), p2 = at(c.x2, c.y2), p3 = at(c.x, c.y);
        const k = segmentsFor(p0, p1, p2, p3, tol);
        for (let s = 1; s <= k; s++) {
          const t = s / k, u = 1 - t;
          const w0 = u * u * u, w1 = 3 * u * u * t, w2 = 3 * u * t * t, w3 = t * t * t;
          cur.push(s === k ? p3 : { x: w0 * p0.x + w1 * p1.x + w2 * p2.x + w3 * p3.x, y: w0 * p0.y + w1 * p1.y + w2 * p2.y + w3 * p3.y });
        }
        budget.left -= k;
        pos = p3;
        break;
      }
      case 'Z':
        if (cur) {
          // The close returns to the start; a last point that is already there is not repeated.
          const first = cur[0], last = cur[cur.length - 1];
          if (cur.length > 1 && Math.abs(first.x - last.x) < 1e-9 && Math.abs(first.y - last.y) < 1e-9) cur.pop();
          flush(true);
        }
        pos = start;
        break;
    }
  }
  flush(false);
  return out;
}

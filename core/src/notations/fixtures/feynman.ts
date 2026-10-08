// Feynman diagrams drawn the way a hand draws them (MATHS-SPEC §8, M27):
// jittered strokes, fermion lines with their arrow drawn as a chevron on the
// middle of the line or as a barb at an end, photons wavy or zigzag, gluons
// curly — a coil of loops — and the particles' names written beside the lines,
// each a scribble a model that can see would read. And what each board should
// read as.
//
// The four boards (time runs left to right):
//
//   s — e⁻ e⁺ → μ⁻ μ⁺, the s-channel       t — Møller, e⁻ e⁻ → e⁻ e⁻, the t-channel
//
//     e⁻ \             / μ⁻                  e⁻ ──>──a──>── e⁻
//         a ~~~~γ~~~~ b                              ~
//     e⁺ /             \ μ⁺                          ~ γ
//                                            e⁻ ──>──b──>── e⁻
//
//   compton — e⁻ γ → e⁻ γ, the s-channel   gluon — u d → u d, the t-channel
//
//     e⁻ \             / e⁻                  u ──>──a──>── u
//         a ────>──── b                              @
//     γ  ~             ~ γ                           @ g
//                                            d ──>──b──>── d
//
// The ids each board's expectation names are the strokes as drawn. Strokes are
// drawn four seconds apart, so the letter rules gather none into a word.
// Everything is deterministic: a variant is a seed, a wobble, a tilt of the
// page, how the fermions' arrows are drawn, how a photon is drawn, and whether
// the boson's own name is written.

import type { Point } from '../../types';
import type { Session } from '../../session/session';
import { handArrow, handLine, handText, rng } from '../../test/strokes';
import { chevron, dashesAlong } from './sequence';

// ===== Lines that oscillate =====

export interface WaveOptions {
  /** How far the crests stand off the axis, px. */
  amplitude?: number;
  /** How far along the axis from one node to the next, px — a coil's advance a loop, halved. */
  halfPeriod?: number;
  /** A hand's wobble, px: low-frequency, along the stroke. */
  jitter?: number;
  seed?: number;
  /** How far the axis bows off the straight line from `a` to `b`, as a share of its length (0 straight, ½ a half circle); signed. */
  bow?: number;
  /** How much each crest and half-period varies from the next, as a share (0.1 is ±10%). */
  vary?: number;
}

/** Low-frequency wobble along a stroke — a hand's tremor, not a sensor's noise. */
function tremor(seed: number, amplitude: number): (t: number) => Point {
  const r = rng(seed * 7919 + 17);
  const waves = [1.3, 2.9, 5.3].map((freq) => ({ freq, px: r() * Math.PI * 2, py: r() * Math.PI * 2, w: 1 / freq }));
  const norm = waves.reduce((a, w) => a + w.w, 0);
  return (t: number) => {
    let dx = 0, dy = 0;
    for (const w of waves) {
      dx += Math.sin(t * Math.PI * 2 * w.freq + w.px) * w.w;
      dy += Math.cos(t * Math.PI * 2 * w.freq + w.py) * w.w;
    }
    return { x: (dx / norm) * amplitude, y: (dy / norm) * amplitude };
  };
}

/** The axis from `a` to `b` — straight, or an arc bowed by `bow` of its length — by length along it, carried on straight past either end. */
function axisOf(a: Point, b: Point, bow = 0): { length: number; at: (s: number) => { p: Point; t: Point; n: Point } } {
  const chord = Math.hypot(b.x - a.x, b.y - a.y);
  const u = { x: (b.x - a.x) / chord, y: (b.y - a.y) / chord };
  const nrm = { x: -u.y, y: u.x };
  if (Math.abs(bow) < 1e-6) {
    return { length: chord, at: (s) => ({ p: { x: a.x + u.x * s, y: a.y + u.y * s }, t: u, n: nrm }) };
  }
  const sag = bow * chord;
  const R = (chord * chord) / 4 / (2 * Math.abs(sag)) + Math.abs(sag) / 2;
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const side = Math.sign(sag);
  const c = { x: mid.x - nrm.x * side * (R - Math.abs(sag)), y: mid.y - nrm.y * side * (R - Math.abs(sag)) };
  const a0 = Math.atan2(a.y - c.y, a.x - c.x);
  let a1 = Math.atan2(b.y - c.y, b.x - c.x);
  // The arc on the bowed side: the way round that passes the point `sag` off the chord's middle.
  const top = { x: mid.x + nrm.x * sag, y: mid.y + nrm.y * sag };
  const am = Math.atan2(top.y - c.y, top.x - c.x);
  const within = (x: number, lo: number, hi: number) => {
    const span = ((hi - lo) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const off = ((x - lo) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    return off <= span;
  };
  let dir = 1;
  if (!within(am, a0, a1)) dir = -1;
  let sweep = ((a1 - a0) * dir % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  a1 = a0 + dir * sweep;
  const length = R * sweep;
  return {
    length,
    at: (s) => {
      const k = Math.max(0, Math.min(length, s));
      const ang = a0 + (dir * k) / R;
      const p0 = { x: c.x + R * Math.cos(ang), y: c.y + R * Math.sin(ang) };
      const t = { x: -Math.sin(ang) * dir, y: Math.cos(ang) * dir };
      const n = { x: -t.y, y: t.x };
      const over = s - k;
      return { p: { x: p0.x + t.x * over, y: p0.y + t.y * over }, t, n };
    },
  };
}

/** Half-periods along a length: how many, and each one's share and crest, varied a little as a hand varies them. */
function halves(length: number, o: WaveOptions, r: () => number): { lens: number[]; amps: number[] } {
  const hp = o.halfPeriod ?? 15, A = o.amplitude ?? 7, vary = o.vary ?? 0.1;
  const m = Math.max(3, Math.round(length / hp));
  const raw = Array.from({ length: m }, () => 1 + vary * 2 * (r() - 0.5));
  const k = length / raw.reduce((x, y) => x + y, 0);
  return { lens: raw.map((x) => x * k), amps: Array.from({ length: m }, () => A * (1 + vary * 2 * (r() - 0.5))) };
}

/** Points along the axis at an even step, each pushed off it by `off(s)`, with a hand's wobble. */
function alongAxis(ax: ReturnType<typeof axisOf>, off: (s: number) => number, o: WaveOptions, density = 1.2): Point[] {
  const wob = tremor(o.seed ?? 1, (o.jitter ?? 1.5) * 0.5);
  const n = Math.max(24, Math.round(ax.length * density));
  const out: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const s = (i / n) * ax.length;
    const { p, n: nn } = ax.at(s);
    const d = off(s), w = wob(i / n);
    out.push({ x: p.x + nn.x * d + w.x, y: p.y + nn.y * d + w.y });
  }
  return out;
}

/** A wavy line from `a` to `b`: a sine about its axis, beginning and ending on it — a photon, a W or a Z. */
export function wavyLine(a: Point, b: Point, o: WaveOptions = {}): Point[] {
  const ax = axisOf(a, b, o.bow);
  const { lens, amps } = halves(ax.length, o, rng((o.seed ?? 1) * 37 + 11));
  const starts = lens.map((_, i) => lens.slice(0, i).reduce((x, y) => x + y, 0));
  return alongAxis(ax, (s) => {
    let j = starts.findIndex((st, i) => s >= st && s <= st + lens[i]);
    if (j < 0) j = s <= 0 ? 0 : lens.length - 1;
    const u = Math.max(0, Math.min(1, (s - starts[j]) / lens[j]));
    return (j % 2 ? -1 : 1) * amps[j] * Math.sin(Math.PI * u);
  }, o);
}

/** A zigzag from `a` to `b`: straight runs between crests, a hand's corners a little round. */
export function zigzagLine(a: Point, b: Point, o: WaveOptions = {}): Point[] {
  const ax = axisOf(a, b, o.bow);
  const { lens, amps } = halves(ax.length, o, rng((o.seed ?? 1) * 37 + 11));
  const starts = lens.map((_, i) => lens.slice(0, i).reduce((x, y) => x + y, 0));
  const round = 0.08;
  return alongAxis(ax, (s) => {
    let j = starts.findIndex((st, i) => s >= st && s <= st + lens[i]);
    if (j < 0) j = s <= 0 ? 0 : lens.length - 1;
    const u = Math.max(0, Math.min(1, (s - starts[j]) / lens[j]));
    // A triangle up to the crest and down, its peak rounded over `round` of the half-period: the slope eases to level there.
    const tri = 1 - Math.abs(2 * u - 1);
    const e = tri - (1 - round);
    const v = e <= 0 ? tri : 1 - round + e - (e * e) / (2 * round);
    return (j % 2 ? -1 : 1) * amps[j] * v;
  }, o, 1.6);
}

/** A curly line from `a` to `b`: a coil of loops, beginning and ending on its axis — a gluon. `amplitude` is a loop's radius, `halfPeriod` half its advance. */
export function curlyLine(a: Point, b: Point, o: WaveOptions = {}): Point[] {
  const ax = axisOf(a, b, o.bow);
  const R = o.amplitude ?? 9;
  const pitch = 2 * (o.halfPeriod ?? 8);
  const m = Math.max(2, Math.round(ax.length / pitch));
  const v = ax.length / (2 * Math.PI * m);
  const r = rng((o.seed ?? 1) * 41 + 3);
  const radii = Array.from({ length: m + 1 }, () => R * (1 + (o.vary ?? 0.08) * 2 * (r() - 0.5)));
  const wob = tremor(o.seed ?? 1, (o.jitter ?? 1.5) * 0.5);
  const t0 = Math.PI / 2;
  const n = Math.round(m * 60);
  const out: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const t = t0 + (i / n) * 2 * Math.PI * m;
    const loop = (t - t0) / (2 * Math.PI);
    const k = Math.min(m - 1, Math.floor(loop)), f = loop - k;
    const rr = radii[k] * (1 - f) + radii[k + 1] * f;
    const along = v * (t - t0) - rr * (Math.sin(t) - Math.sin(t0));
    const across = -rr * Math.cos(t);
    const { p, n: nn } = ax.at(along);
    const w = wob(i / n);
    out.push({ x: p.x + nn.x * across + w.x, y: p.y + nn.y * across + w.y });
  }
  return out;
}

// ===== The boards =====

export type FeynmanBoardName = 's' | 't' | 'compton' | 'gluon';
export const FEYNMAN_BOARDS: readonly FeynmanBoardName[] = ['s', 't', 'compton', 'gluon'];

export interface FeynmanVariant {
  seed: number;
  /** Wobble in px. */
  jitter: number;
  /** How far the whole page is turned, in degrees. */
  tilt: number;
  /** How a fermion's arrow is drawn: a chevron on the middle of the line, or a barb at its end. */
  arrows: 'chevron' | 'barb';
  /** How a photon is drawn. */
  photon: 'wavy' | 'zigzag';
  /** Whether the internal boson's name (γ, g) is written beside it. */
  named: boolean;
}

export const FEYNMAN_VARIANTS: FeynmanVariant[] = [];
for (const seed of [1, 2, 3, 4, 5, 6]) {
  for (const jitter of [1.2, 2.4]) {
    for (const tilt of [0, 4, -4]) {
      const k = FEYNMAN_VARIANTS.length;
      FEYNMAN_VARIANTS.push({ seed: seed * 10 + k, jitter, tilt, arrows: k % 2 ? 'barb' : 'chevron', photon: k % 3 === 2 ? 'zigzag' : 'wavy', named: k % 4 === 1 });
    }
  }
}

/** One line as drawn, and what it should read as. */
export interface FeynmanLineExpected {
  /** Its name in the drawing: 'e⁻ in', 'γ'. */
  name: string;
  /** The stroke that draws it (a dashed line's first dash). */
  id: string;
  /** Every mark it is drawn with: the stroke, and its chevron when it has one. */
  ids: string[];
  kind: 'fermion' | 'boson' | 'gluon' | 'scalar';
  /** The vertex at each end, or 'free' — `from` is the end the particle comes from. */
  from: string;
  to: string;
  /** The writing beside it. */
  label: string[];
}

export interface FeynmanExpected {
  board: string;
  /** Vertex name → the lines whose ends meet there. */
  vertices: Record<string, string[]>;
  lines: FeynmanLineExpected[];
  /** What a model that can see reads each piece of writing as. */
  words: Record<string, string>;
  /** Once the writing is read. */
  process: string;
  channel: 's' | 't' | 'u' | null;
  order: string;
  /** Every mark on the board. */
  all: string[];
}

export interface LineSpec {
  name: string;
  kind: 'fermion' | 'boson' | 'gluon' | 'scalar';
  /** From → to, as the particle flows (a fermion's arrow points from → to). */
  from: [number, number] | string;
  to: [number, number] | string;
  /** The vertex or 'free' at each end. */
  ends: [string, string];
  /** What is written beside it, and where: beyond its free end, or beside its middle. */
  word?: string;
  wordAt?: 'free' | 'middle';
  /** How far a boson's or a gluon's axis bows off the straight line, as a share of its length: a photon in a loop is an arc. */
  bow?: number;
}

/** A board: where its vertices stand, its lines, and what it should read as once its writing is read. */
export interface BoardSpec {
  vertices: Record<string, [number, number]>;
  lines: LineSpec[];
  process: string;
  channel: 's' | 't' | 'u' | null;
  order: string;
}

export const BOARD: Record<FeynmanBoardName, BoardSpec> = {
  s: {
    vertices: { a: [300, 300], b: [560, 300] },
    lines: [
      { name: 'e⁻ in', kind: 'fermion', from: [110, 150], to: 'a', ends: ['free', 'a'], word: 'e⁻', wordAt: 'free' },
      { name: 'e⁺ in', kind: 'fermion', from: 'a', to: [110, 450], ends: ['a', 'free'], word: 'e⁺', wordAt: 'free' },
      { name: 'γ', kind: 'boson', from: 'a', to: 'b', ends: ['a', 'b'], word: 'γ', wordAt: 'middle' },
      { name: 'μ⁻ out', kind: 'fermion', from: 'b', to: [750, 150], ends: ['b', 'free'], word: 'μ⁻', wordAt: 'free' },
      { name: 'μ⁺ out', kind: 'fermion', from: [750, 450], to: 'b', ends: ['free', 'b'], word: 'μ⁺', wordAt: 'free' },
    ],
    process: 'e⁻ e⁺ → μ⁻ μ⁺',
    channel: 's',
    order: 'α²',
  },
  t: {
    vertices: { a: [430, 200], b: [430, 420] },
    lines: [
      { name: 'e⁻ in, top', kind: 'fermion', from: [170, 110], to: 'a', ends: ['free', 'a'], word: 'e⁻', wordAt: 'free' },
      { name: 'e⁻ out, top', kind: 'fermion', from: 'a', to: [690, 110], ends: ['a', 'free'], word: 'e⁻', wordAt: 'free' },
      { name: 'γ', kind: 'boson', from: 'a', to: 'b', ends: ['a', 'b'], word: 'γ', wordAt: 'middle' },
      { name: 'e⁻ in, bottom', kind: 'fermion', from: [170, 510], to: 'b', ends: ['free', 'b'], word: 'e⁻', wordAt: 'free' },
      { name: 'e⁻ out, bottom', kind: 'fermion', from: 'b', to: [690, 510], ends: ['b', 'free'], word: 'e⁻', wordAt: 'free' },
    ],
    process: 'e⁻ e⁻ → e⁻ e⁻',
    channel: 't',
    order: 'α²',
  },
  compton: {
    vertices: { a: [320, 320], b: [560, 320] },
    lines: [
      { name: 'e⁻ in', kind: 'fermion', from: [120, 170], to: 'a', ends: ['free', 'a'], word: 'e⁻', wordAt: 'free' },
      { name: 'γ in', kind: 'boson', from: [120, 470], to: 'a', ends: ['free', 'a'], word: 'γ', wordAt: 'free' },
      { name: 'e⁻ between', kind: 'fermion', from: 'a', to: 'b', ends: ['a', 'b'] },
      { name: 'e⁻ out', kind: 'fermion', from: 'b', to: [760, 170], ends: ['b', 'free'], word: 'e⁻', wordAt: 'free' },
      { name: 'γ out', kind: 'boson', from: 'b', to: [760, 470], ends: ['b', 'free'], word: 'γ', wordAt: 'free' },
    ],
    process: 'e⁻ γ → e⁻ γ',
    channel: 's',
    order: 'α²',
  },
  gluon: {
    vertices: { a: [430, 200], b: [430, 420] },
    lines: [
      { name: 'u in', kind: 'fermion', from: [170, 110], to: 'a', ends: ['free', 'a'], word: 'u', wordAt: 'free' },
      { name: 'u out', kind: 'fermion', from: 'a', to: [690, 110], ends: ['a', 'free'], word: 'u', wordAt: 'free' },
      { name: 'g', kind: 'gluon', from: 'a', to: 'b', ends: ['a', 'b'], word: 'g', wordAt: 'middle' },
      { name: 'd in', kind: 'fermion', from: [170, 510], to: 'b', ends: ['free', 'b'], word: 'd', wordAt: 'free' },
      { name: 'd out', kind: 'fermion', from: 'b', to: [690, 510], ends: ['b', 'free'], word: 'd', wordAt: 'free' },
    ],
    process: 'u d → u d',
    channel: 't',
    order: 'αₛ²',
  },
};

/** The page turns about this point, and is placed so it stands at `at`. */
const PIVOT = { x: 430, y: 310 };

export interface DrawOptions {
  /** How big, against the size it is written at. */
  k?: number;
  /** Where the page's middle stands. */
  at?: Point;
  /** Words to write instead of a board's own — to label a line otherwise (a vertex that breaks charge). */
  words?: Partial<Record<string, string>>;
  /** Write the boson's name, or leave it unwritten, whatever the variant says. */
  named?: boolean;
}

/** Draw one of the four boards on a session. Returns what it should read as. */
export function drawFeynman(s: Session, board: FeynmanBoardName, v: FeynmanVariant, t0 = 1000, o: DrawOptions = {}): FeynmanExpected {
  return drawBoard(s, BOARD[board], board, v, t0, o);
}

/** Draw any board by its spec. */
export function drawBoard(s: Session, spec: BoardSpec, board: string, v: FeynmanVariant, t0 = 1000, o: DrawOptions = {}): FeynmanExpected {
  let t = t0;
  const k = o.k ?? 1;
  const at = o.at ?? PIVOT;
  const cs = Math.cos((v.tilt * Math.PI) / 180), sn = Math.sin((v.tilt * Math.PI) / 180);
  const turn = (p: Point): Point => {
    const x = (p.x - PIVOT.x) * k, y = (p.y - PIVOT.y) * k;
    return { x: at.x + x * cs - y * sn, y: at.y + x * sn + y * cs };
  };
  const draw = (pts: Point[]) => s.addStroke(pts.map(turn), (t += 4000));
  const j = v.jitter / k;
  const seed = (n: number) => v.seed * 100 + n;
  const pt = (x: [number, number] | string): Point => {
    const q = typeof x === 'string' ? spec.vertices[x] : x;
    return { x: q[0], y: q[1] };
  };
  // A line's ink stops a little short of its vertex, or a little past, as a hand's does.
  const r = rng(v.seed * 53 + board.length);
  const nudge = (p: Point, toward: Point, end: string): Point => {
    if (end === 'free') return p;
    const d = Math.hypot(toward.x - p.x, toward.y - p.y) || 1;
    const off = (r() - 0.6) * 10;
    return { x: p.x - ((toward.x - p.x) / d) * off + (r() - 0.5) * 4, y: p.y - ((toward.y - p.y) / d) * off + (r() - 0.5) * 4 };
  };

  const lines: FeynmanLineExpected[] = [];
  const words: Record<string, string> = {};
  const all: string[] = [];
  const later: { word: string; box: [number, number, number, number]; line: FeynmanLineExpected }[] = [];
  spec.lines.forEach((l, n) => {
    const a0 = pt(l.from), b0 = pt(l.to);
    const a = nudge(a0, b0, l.ends[0]), b = nudge(b0, a0, l.ends[1]);
    const ids: string[] = [];
    if (l.kind === 'fermion') {
      if (v.arrows === 'barb') ids.push(draw(handArrow(a, b, { wings: 2, headLen: 14, seed: seed(n), jitter: j * 0.6 })));
      else {
        ids.push(draw(handLine(a, b, { seed: seed(n), jitter: j * 0.6 })));
        const d = { x: b.x - a.x, y: b.y - a.y };
        const mid = { x: (a.x + b.x) / 2 + d.x * 0.06, y: (a.y + b.y) / 2 + d.y * 0.06 };
        ids.push(draw(chevron(mid, d, 13, { seed: seed(n + 40), jitter: 0.5 })));
      }
    } else if (l.kind === 'boson') {
      const opts = { seed: seed(n), jitter: j * 0.6, amplitude: 7, halfPeriod: 15, bow: l.bow };
      ids.push(draw(v.photon === 'zigzag' ? zigzagLine(a, b, opts) : wavyLine(a, b, opts)));
    } else if (l.kind === 'gluon') {
      ids.push(draw(curlyLine(a, b, { seed: seed(n), jitter: j * 0.5, amplitude: 9, halfPeriod: 7, bow: l.bow })));
    } else {
      for (const d of dashesAlong(a, b, { seed: seed(n), jitter: j * 0.3 })) ids.push(draw(d));
    }
    const line: FeynmanLineExpected = { name: l.name, id: ids[0], ids, kind: l.kind, from: l.ends[0], to: l.ends[1], label: [] };
    lines.push(line);
    all.push(...ids);
    const word = o.words?.[l.name] ?? l.word;
    const isBosonName = l.wordAt === 'middle';
    if (!word || (isBosonName && !(o.named ?? v.named))) return;
    // Beyond the free end, or beside the middle, on the side away from the page's middle.
    let c: Point;
    if (l.wordAt === 'free') {
      const free = l.ends[0] === 'free' ? a0 : b0, other = l.ends[0] === 'free' ? b0 : a0;
      const d = Math.hypot(free.x - other.x, free.y - other.y);
      c = { x: free.x + ((free.x - other.x) / d) * 30, y: free.y + ((free.y - other.y) / d) * 30 };
    } else {
      const m = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 };
      const d = { x: b0.x - a0.x, y: b0.y - a0.y };
      const level = Math.abs(d.x) >= Math.abs(d.y);
      // Above a level line, right of a plumb one.
      const off = l.kind === 'gluon' ? 34 : 30;
      c = level ? { x: m.x, y: m.y - off } : { x: m.x + off, y: m.y };
    }
    const w = 14 + 9 * [...word].length;
    later.push({ word, box: [c.x - w / 2, c.y - 10, w, 20], line });
  });
  // The words, written after the lines.
  later.forEach(({ word, box, line }, n) => {
    const id = draw(handText(box[0], box[1], box[2], box[3], { seed: seed(70 + n), humps: Math.max(2, [...word].length + 1), jitter: 0.8 }));
    words[id] = word;
    line.label.push(id);
    all.push(id);
  });

  const vertices: Record<string, string[]> = {};
  for (const name of Object.keys(spec.vertices)) vertices[name] = lines.filter((l) => l.from === name || l.to === name).map((l) => l.id);
  return { board, vertices, lines, words, process: spec.process, channel: spec.channel, order: spec.order, all };
}

/** Read every piece of writing on a board as a model that can see would. */
export function readFeynmanWords(s: Session, e: FeynmanExpected, at = 900_000): void {
  const pid = s.join('agent', 'llm:seeing', at, 2);
  let t = at + 100;
  for (const [id, text] of Object.entries(e.words)) s.propose({ participantId: pid, nodeId: id, edges: [], reps: [{ modality: 'transcript', data: { text }, confidence: 0.9 }], at: t++ });
}

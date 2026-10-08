// The Feynman diagram (MATHS-SPEC §8, M27).
//
// Particles as lines, read from ink:
//
//   - **fermion** — a solid line with an arrow on it: a chevron drawn on the
//     line's middle (a new read: a small V whose point lies on the line and
//     whose arms run back along it on either side), or the line's own barb at
//     an end (the shape rung's arrow). The arrow is the fermion's flow: along
//     it on a particle, against it on an antiparticle. A solid line with no
//     arrow is a fermion whose flow is not drawn, said.
//   - **boson** — a wavy line or a zigzag (diagram/waves.ts): a photon until a
//     label says W or Z, said.
//   - **gluon** — a curly line, a coil of loops (diagram/waves.ts).
//   - **scalar** — a dashed line (notations/dashes.ts): the Higgs until a label
//     says otherwise, said.
//   - **vertex** — where three or four line ends meet, each end read where its
//     ink stops (an arrow's tip being the ink the pen reached farthest), a
//     magnet's bind first; a dot drawn there is the vertex's own mark. A line
//     with one end free is external: a particle coming in or going out.
//
// **Time runs left to right** unless the lines say otherwise — when the free
// lines run more up and down than across, their ends standing above and below
// rather than to either side, it runs bottom to top — and which way was taken
// is said. A free end before its vertex in time
// is a particle coming in; after it, going out.
//
// **What it says**: the process (*e⁻ e⁺ → μ⁻ μ⁺*, the incoming in the order
// they stand across time, then the outgoing); for two in and two out at tree
// level, the channel — *s* when both incoming meet at one vertex, *t* when each
// vertex takes one in and the out that stands on its side, *u* when the lines
// cross to the other side; the order from the vertices — each vertex's
// coupling once (a four-line vertex twice), α for a photon, αₛ for a gluon, α_W
// for a W or Z, y for the Higgs — as the rate's order (*α²* for two QED
// vertices); tree or how many loops (internal lines less vertices plus one).
//
// **Conservation, once particles are labelled**: at each vertex the charge,
// the lepton number of each family and the baryon number of everything
// meeting there must come to nothing — a line counted as what flows into the
// vertex (a fermion by its flow, a W by its sign and the way time runs). **A
// label rules the particle; the ink rules the topology** (MATHS-PLAN rule 2): a
// label that says e⁺ where the arrow says an electron is taken, and the
// disagreement said. A break is said with its vertex and its sum.
//
// The particles — their charges, lepton and baryon numbers, the line each is
// drawn with and how each is written — are FEYNMAN_TABLE, their single home;
// the `feynman@1` pack names the notation and restates none of it. Derived:
// nothing here enters the log; the six roles hold (vertices are nodes — a dot
// drawn there plays it — lines are edges, their chevrons and dashes with them,
// the names labels).

import type { Bounds, Point } from '../types';
import type { SessionState } from '../session/session';
import type { MMNode } from '../session/nodes';
import { boundsOf, getRep, isWord, labelOf, resemblances, strokePointsOf, transcriptOf } from '../session/nodes';
import { activeBindingsOf, magnetRadius } from '../session/magnets';
import { connectorEndsOf, inkEndsOf } from '../diagram/heads';
import type { WaveReading } from '../diagram/waves';
import { waveOfNode } from '../diagram/waves';
import type { Role } from '../diagram/roles';
import { MAX_TIER0_CONFIDENCE, HAND_RESOLUTION_PX } from '../recognition';
import { dashedLines } from './dashes';
import type { Notation, NotationConnector, NotationLabel, NotationReading, NotationSymbol, NotationSymbolDef, NotationConnectorDef } from './notation';
import { marksOf } from './graph-kit';
import { textCodeOf } from '../maths/writing';

const MAX = MAX_TIER0_CONFIDENCE;

// ===== The table =====

export type FeynmanLineKind = 'fermion' | 'boson' | 'gluon' | 'scalar';
export type FeynmanDrawn = 'solid' | 'wavy' | 'zigzag' | 'curly' | 'dashed';
/** A vertex's coupling, as its rate's order is written. */
export type FeynmanCoupling = 'α' | 'αₛ' | 'α_W' | 'y';
export type LeptonFamily = 'e' | 'mu' | 'tau';

export interface FeynmanParticle {
  id: string;
  /** In words. */
  name: string;
  /** The line it is drawn with. */
  line: FeynmanLineKind;
  /** How it is written: the particle, then its antiparticle (the same for a particle that is its own). */
  said: readonly [string, string];
  /** …and in TeX, for TikZ-Feynman. */
  tex: readonly [string, string];
  /** In thirds of a proton's charge: the electron −3, the up quark +2. The particle's; its antiparticle's is the opposite. */
  charge3: number;
  /** Lepton number, by family: the electron and its neutrino 1 in the e family. A neutrino of no family said has `any`. */
  lepton: Partial<Record<LeptonFamily | 'any', number>>;
  /** In thirds: a quark 1. */
  baryon3: number;
  /** A boson's coupling at a vertex. */
  coupling?: FeynmanCoupling;
  /** It is its own antiparticle. */
  self: boolean;
  /**
   * The words a hand writes for it, besides its symbol — read after folding case, never one letter — each
   * with `:particle` or `:anti` when it says which one (*electron*, *positron*); *anti* before any of them
   * names the antiparticle (*antimuon*).
   */
  aliases: readonly string[];
}

export const FEYNMAN_TABLE = {
  symbols: [
    { name: 'vertex', role: 'node', describes: 'where three or four line ends meet — a dot drawn there, or nothing', ports: 'none: a line meets it at its end' },
    { name: 'external', role: 'node', describes: 'the free end of a line: a particle coming in or going out', ports: 'none' },
  ] as const satisfies readonly NotationSymbolDef[],
  connectors: [
    { name: 'fermion', role: 'edge', describes: 'a solid line with an arrow on it — a chevron on its middle, or a barb at an end' },
    { name: 'boson', role: 'edge', describes: 'a wavy line or a zigzag: a photon, a W or a Z' },
    { name: 'gluon', role: 'edge', describes: 'a curly line, a coil of loops' },
    { name: 'scalar', role: 'edge', describes: 'a dashed line: the Higgs' },
  ] as const satisfies readonly NotationConnectorDef[],
  /** How each kind of line is drawn, and its TikZ-Feynman style. */
  lines: {
    fermion: { drawn: ['solid'], tikz: 'fermion' },
    boson: { drawn: ['wavy', 'zigzag'], tikz: 'boson' },
    gluon: { drawn: ['curly'], tikz: 'gluon' },
    scalar: { drawn: ['dashed'], tikz: 'scalar' },
  } as const satisfies Record<FeynmanLineKind, { drawn: readonly FeynmanDrawn[]; tikz: string }>,
  /** What an unlabelled line of each kind is taken as, said whenever it is. */
  assumed: { boson: 'photon', gluon: 'gluon', scalar: 'higgs' } as const satisfies Partial<Record<FeynmanLineKind, string>>,
  couplings: {
    'α': 'the electromagnetic coupling',
    'αₛ': 'the strong coupling',
    'α_W': 'the weak coupling',
    'y': 'a Yukawa coupling',
  } as const satisfies Record<FeynmanCoupling, string>,
  particles: [
    { id: 'electron', name: 'electron', line: 'fermion', said: ['e⁻', 'e⁺'], tex: ['e^{-}', 'e^{+}'], charge3: -3, lepton: { e: 1 }, baryon3: 0, self: false, aliases: ['electron:particle', 'positron:anti'] },
    { id: 'muon', name: 'muon', line: 'fermion', said: ['μ⁻', 'μ⁺'], tex: ['\\mu^{-}', '\\mu^{+}'], charge3: -3, lepton: { mu: 1 }, baryon3: 0, self: false, aliases: ['muon', 'mu'] },
    { id: 'tau', name: 'tau', line: 'fermion', said: ['τ⁻', 'τ⁺'], tex: ['\\tau^{-}', '\\tau^{+}'], charge3: -3, lepton: { tau: 1 }, baryon3: 0, self: false, aliases: ['tau'] },
    { id: 'nu-e', name: 'electron neutrino', line: 'fermion', said: ['ν_e', 'ν̄_e'], tex: ['\\nu_{e}', '\\bar{\\nu}_{e}'], charge3: 0, lepton: { e: 1 }, baryon3: 0, self: false, aliases: ['nue'] },
    { id: 'nu-mu', name: 'muon neutrino', line: 'fermion', said: ['ν_μ', 'ν̄_μ'], tex: ['\\nu_{\\mu}', '\\bar{\\nu}_{\\mu}'], charge3: 0, lepton: { mu: 1 }, baryon3: 0, self: false, aliases: ['numu'] },
    { id: 'nu-tau', name: 'tau neutrino', line: 'fermion', said: ['ν_τ', 'ν̄_τ'], tex: ['\\nu_{\\tau}', '\\bar{\\nu}_{\\tau}'], charge3: 0, lepton: { tau: 1 }, baryon3: 0, self: false, aliases: ['nutau'] },
    { id: 'nu', name: 'neutrino', line: 'fermion', said: ['ν', 'ν̄'], tex: ['\\nu', '\\bar{\\nu}'], charge3: 0, lepton: { any: 1 }, baryon3: 0, self: false, aliases: ['neutrino', 'nu'] },
    { id: 'up', name: 'up quark', line: 'fermion', said: ['u', 'ū'], tex: ['u', '\\bar{u}'], charge3: 2, lepton: {}, baryon3: 1, self: false, aliases: [] },
    { id: 'down', name: 'down quark', line: 'fermion', said: ['d', 'd̄'], tex: ['d', '\\bar{d}'], charge3: -1, lepton: {}, baryon3: 1, self: false, aliases: [] },
    { id: 'strange', name: 'strange quark', line: 'fermion', said: ['s', 's̄'], tex: ['s', '\\bar{s}'], charge3: -1, lepton: {}, baryon3: 1, self: false, aliases: [] },
    { id: 'charm', name: 'charm quark', line: 'fermion', said: ['c', 'c̄'], tex: ['c', '\\bar{c}'], charge3: 2, lepton: {}, baryon3: 1, self: false, aliases: [] },
    { id: 'bottom', name: 'bottom quark', line: 'fermion', said: ['b', 'b̄'], tex: ['b', '\\bar{b}'], charge3: -1, lepton: {}, baryon3: 1, self: false, aliases: [] },
    { id: 'top', name: 'top quark', line: 'fermion', said: ['t', 't̄'], tex: ['t', '\\bar{t}'], charge3: 2, lepton: {}, baryon3: 1, self: false, aliases: [] },
    { id: 'photon', name: 'photon', line: 'boson', said: ['γ', 'γ'], tex: ['\\gamma', '\\gamma'], charge3: 0, lepton: {}, baryon3: 0, coupling: 'α', self: true, aliases: ['photon', 'gamma'] },
    { id: 'gluon', name: 'gluon', line: 'gluon', said: ['g', 'g'], tex: ['g', 'g'], charge3: 0, lepton: {}, baryon3: 0, coupling: 'αₛ', self: true, aliases: ['gluon'] },
    { id: 'w', name: 'W boson', line: 'boson', said: ['W⁺', 'W⁻'], tex: ['W^{+}', 'W^{-}'], charge3: 3, lepton: {}, baryon3: 0, coupling: 'α_W', self: false, aliases: [] },
    { id: 'z', name: 'Z boson', line: 'boson', said: ['Z', 'Z'], tex: ['Z', 'Z'], charge3: 0, lepton: {}, baryon3: 0, coupling: 'α_W', self: true, aliases: [] },
    { id: 'higgs', name: 'Higgs boson', line: 'scalar', said: ['H', 'H'], tex: ['H', 'H'], charge3: 0, lepton: {}, baryon3: 0, coupling: 'y', self: true, aliases: ['higgs'] },
  ] as const satisfies readonly FeynmanParticle[],
};

const PARTICLES: readonly FeynmanParticle[] = FEYNMAN_TABLE.particles;
const particleById = (id: string) => PARTICLES.find((p) => p.id === id);

// ===== Reading a label =====

/** A particle a label names, and whether it names the antiparticle — null when it says neither (an unsigned *e*). */
export interface ParticleLabel {
  particle: FeynmanParticle;
  anti: boolean | null;
  /** What was written. */
  text: string;
}

/** The core symbols a label is read to, after its sign, bar and subscript are taken off. */
const SYMBOL: Record<string, string> = {
  e: 'electron', 'μ': 'muon', 'τ': 'tau', 'ν': 'nu', 'νe': 'nu-e', 'νμ': 'nu-mu', 'ντ': 'nu-tau',
  u: 'up', d: 'down', s: 'strange', c: 'charm', b: 'bottom', t: 'top',
  'γ': 'photon', g: 'gluon', W: 'w', Z: 'z', H: 'higgs', h: 'higgs',
};

/**
 * What a written label names, or null when it names no particle in the table
 * (or names one in a way that cannot be: a sign on a quark, a photon with a
 * charge). Reads `e⁻`, `e-`, `e^-`, `e^{-}`, `ē`, `μ+`, `mu-`, `µ` (the micro
 * sign), `ν_e`, `νe`, `\bar{u}`, `ubar`, `W+`, `Z0`, `γ`, `gamma`, `H`, and the
 * names (electron, positron, photon …).
 */
export function parseParticle(written: string): ParticleLabel | null {
  const text = String(written ?? '').normalize('NFC').trim();
  if (!text || text.length > 24) return null;
  let t = text.normalize('NFD').replace(/µ/g, 'μ').replace(/\$|\\\(|\\\)/g, '').replace(/\s+/g, '');
  let bar = false;
  let sign: '+' | '-' | '0' | null = null;
  // TeX first: \bar{x}, \overline{x}, \mu …
  t = t.replace(/\\(?:bar|overline)\{([^}]*)\}/g, (_, x: string) => {
    bar = true;
    return x;
  });
  t = t.replace(/\\(mu|nu|tau|gamma)/g, (_, x: string) => ({ mu: 'μ', nu: 'ν', tau: 'τ', gamma: 'γ' })[x as 'mu'] ?? x);
  // A bar over a letter: the combining macron or overline.
  if (/[\u0304\u0305]/.test(t)) {
    bar = true;
    t = t.replace(/[\u0304\u0305]/g, '');
  }
  // The sign: a superscript or a trailing one.
  const signed = /(?:\^\{?([+\-−0])\}?|([⁺⁻⁰])|([+\-−]))$/.exec(t);
  if (signed) {
    const c = signed[1] ?? signed[2] ?? signed[3];
    sign = c === '+' || c === '⁺' ? '+' : c === '0' || c === '⁰' ? '0' : '-';
    t = t.slice(0, signed.index);
  }
  t = t.replace(/^(Z)0$/, '$1');
  if (/bar$/i.test(t) && t.length > 3) {
    bar = true;
    t = t.slice(0, -3).replace(/[-_]$/, '');
  }
  // A subscript: ν_e, ν_{μ}, νₑ.
  t = t.replace(/_\{?([^}]*)\}?$/, '$1').replace(/ₑ/g, 'e');
  // Names, folded for case.
  const low = t.toLowerCase();
  let id: string | undefined;
  let named: boolean | null = null;
  for (const p of PARTICLES) {
    for (const a of p.aliases) {
      const [word, which] = a.split(':');
      if (low === word) {
        id = p.id;
        named = which === 'anti' ? true : which === 'particle' ? false : null;
      } else if (low === `anti${word}`) {
        id = p.id;
        named = true;
      }
    }
  }
  if (!id) {
    const greek = t.replace(/^mu/, 'μ').replace(/^nu/, 'ν').replace(/^tau$/, 'τ').replace(/^gamma$/, 'γ');
    id = SYMBOL[greek];
  }
  if (!id) return null;
  const particle = particleById(id)!;
  let anti: boolean | null = named;
  if (bar) anti = true;
  if (sign === '0') {
    if (particle.charge3 !== 0 || particle.line === 'fermion') return null;
  } else if (sign) {
    if (particle.line !== 'fermion' && particle.id !== 'w') return null;
    if (particle.charge3 === 0 || Math.abs(particle.charge3) !== 3) return null; // a sign on a quark or a neutrino is not a charge it has
    const plus = sign === '+';
    // The particle's own charge says which sign it is: e⁻ the electron, W⁺ the W⁺.
    const isAnti = plus ? particle.charge3 < 0 : particle.charge3 > 0;
    if (bar && !isAnti) return null;
    anti = isAnti;
  }
  if (particle.self) anti = false;
  return { particle, anti, text };
}

// ===== Thresholds — ratios of the drawing's own lines, or the hand's on screen =====

/** A solid line is at least this long on screen: shorter is a letter's stroke, a dash or a chevron. */
export const LINE_MIN_PX = 30;
/** …and at least this share of the median line among those read: a label's stroke beside a diagram is not one of its lines. */
export const LINE_SHARE = 0.3;
/** Two line ends meet within this share of the shorter line, or a magnet's reach on screen, whichever is more. */
export const VERTEX_SHARE = 0.12;
/** A chevron is at most this share of its line's length. */
export const CHEVRON_SHARE = 0.35;
/** …its point stands on the line within this share of the line's own length from either end: on its middle, not at an end. */
export const CHEVRON_MID = [0.15, 0.85] as const;
/** …its arms open at an angle between these, in degrees. */
export const CHEVRON_OPEN = [20, 130] as const;
/** …and it points along the line within this many degrees. */
export const CHEVRON_ALONG = 35;
/** A dashed line is looked for within this many of the longest line meeting there, round each place two line ends meet. */
export const SCALAR_REACH = 1.5;
/** Writing labels the line it is nearest within this many of its own size, or the line's magnet reach twice over. */
export const LABEL_REACH = 2.5;
/** Two vertices closer in time than this share of the diagram's typical line stand at the same time, and are named across it. */
export const SAME_TIME = 0.15;

const DEG = 180 / Math.PI;
const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;
const crossV = (a: Point, b: Point) => a.x * b.y - a.y * b.x;
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const unit = (v: Point): Point => {
  const l = Math.hypot(v.x, v.y);
  return l > 1e-12 ? { x: v.x / l, y: v.y / l } : { x: 1, y: 0 };
};
const median = (xs: readonly number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};
const scaleOf = (node: MMNode) => (getRep(node, 'stroke')?.data as { scale?: number } | undefined)?.scale ?? 1;
const COUNT = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const count = (n: number) => COUNT[n] ?? String(n);
const SUPER: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
const power = (n: number) => (n === 1 ? '' : String(n).replace(/\d/g, (d) => SUPER[d]));

function distToSegment(p: Point, a: Point, b: Point): number {
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  const t = l2 > 0 ? Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2)) : 0;
  return Math.hypot(p.x - (a.x + ab.x * t), p.y - (a.y + ab.y * t));
}
function distToPath(p: Point, path: readonly Point[]): number {
  if (path.length === 1) return dist(p, path[0]);
  let best = Infinity;
  for (let i = 1; i < path.length; i++) best = Math.min(best, distToSegment(p, path[i - 1], path[i]));
  return best;
}
function pathLength(pts: readonly Point[]): number {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += dist(pts[i], pts[i - 1]);
  return s;
}
/** The part of a path from `lo` to `hi` of its length. */
function slicePath(pts: readonly Point[], lo: number, hi: number): Point[] {
  const L = pathLength(pts);
  const out: Point[] = [];
  let at = 0;
  for (let i = 0; i < pts.length; i++) {
    if (i > 0) at += dist(pts[i], pts[i - 1]);
    if (at >= lo * L && at <= hi * L) out.push(pts[i]);
  }
  return out.length ? out : [pts[Math.floor(pts.length / 2)]];
}
/** Where along a path a point stands nearest, as a share of its length. */
function shareAlong(p: Point, path: readonly Point[]): number {
  const L = pathLength(path);
  if (!(L > 0)) return 0;
  let best = Infinity, at = 0, run = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const ab = sub(b, a);
    const l2 = dot(ab, ab);
    const t = l2 > 0 ? Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2)) : 0;
    const d = Math.hypot(p.x - (a.x + ab.x * t), p.y - (a.y + ab.y * t));
    if (d < best) {
      best = d;
      at = run + t * Math.sqrt(l2);
    }
    run += Math.sqrt(l2);
  }
  return at / L;
}
const boxCentre = (b: Bounds): Point => ({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 });
const boxSize = (b: Bounds) => Math.max(b.maxX - b.minX, b.maxY - b.minY);

// ===== What the reading holds =====

export type FeynmanEndName = 'start' | 'end';

/** One end of a line where it stands. */
export interface FeynmanEnd {
  end: FeynmanEndName;
  point: Point;
  /** The vertex it meets, or none when it is free. */
  vertex?: string;
  /** Tied there by a magnet. */
  bound?: boolean;
}

/** A line, read: what it is drawn as, which particle, which way it flows. */
export interface FeynmanLine extends NotationConnector {
  kind: FeynmanLineKind;
  drawn: FeynmanDrawn;
  /** Its two ends, by the stroke's own names (a dashed line's `start` is its first dash). */
  lineEnds: [FeynmanEnd, FeynmanEnd];
  length: number;
  /** A fermion's arrow: the end it points to, and how it was drawn. */
  arrow?: { to: FeynmanEndName; how: 'barb' | 'chevron'; ids: string[] };
  /** The way the particle flows along it — a fermion's from its arrow or its label, a W's from its sign and time. */
  flow?: { to: FeynmanEndName; from: 'arrow' | 'label' | 'time' };
  /** The particle: from its label, assumed from how it is drawn, or not known. */
  particle?: { id: string; anti: boolean | null; said: string; from: 'label' | 'assumed' };
  /** What its label says, when one is read; `unread` when writing stands beside it that nobody has read. */
  written?: string;
  unread?: boolean;
  /** In or out, for an external line. */
  external?: 'in' | 'out';
  /** The wave, for a boson or a gluon. */
  wave?: Pick<WaveReading, 'kind' | 'amplitude' | 'halfPeriods' | 'confidence' | 'reason'>;
  /** Its ink, where it stands — its axis for a wave. */
  path: Point[];
  /** Said about it: the label disagreeing with the arrow, a fermion with no arrow. */
  notes: string[];
}

export interface FeynmanVertex extends NotationSymbol {
  symbol: 'vertex';
  at: Point;
  /** How many line ends meet there. */
  degree: number;
  /** The lines meeting there, each end once (a loop's twice). */
  lines: { line: string; end: FeynmanEndName }[];
  /** Its coupling, and how many times it counts. */
  coupling?: FeynmanCoupling;
  powers: number;
  /** Two fermions and a boson, or three or four bosons. */
  valid: boolean;
  /** Its name in its diagram: a, b, c … in time. */
  name: string;
}

export interface FeynmanExternal extends NotationSymbol {
  symbol: 'external';
  at: Point;
  line: string;
  /** i1, i2 … coming in; f1, f2 … going out. */
  name: string;
  /** The particle coming in or going out, as written (*e⁻*, *f̄* while it is not known), and in the table when it is. */
  said?: string;
  particle?: { id: string; anti: boolean | null };
}

/** What is kept, or broken, at one vertex. */
export interface FeynmanCheck {
  vertex: string;
  name: string;
  quantity: 'charge' | 'lepton number' | 'baryon number';
  family?: LeptonFamily;
  /** `kept`, `broken`, or `unknown` — a line there has no particle, or a fermion no flow. */
  status: 'kept' | 'broken' | 'unknown';
  /** What meets there comes to this (charge in units of e, baryon number as a fraction). */
  sum?: number;
  reason: string;
}

/** One connected diagram on the board. */
export interface FeynmanDiagram {
  vertices: string[];
  externals: string[];
  lines: string[];
  /** Vertex and external ids → their names: a, b … in time; i1 … in; f1 … out. */
  names: Record<string, string>;
  time: 'left to right' | 'bottom to top';
  initial: string[];
  final: string[];
  /** *e⁻ e⁺ → μ⁻ μ⁺* — null until every external particle is known. */
  process: string | null;
  /** The same with what is not known yet written f, f̄ or ?. */
  processSaid: string;
  channel: 's' | 't' | 'u' | null;
  order: { couplings: Partial<Record<FeynmanCoupling, number>>; said: string };
  loops: number;
  checks: FeynmanCheck[];
  /** A conservation broken, in a sentence each, with its vertex. */
  breaks: string[];
  /** What was assumed — time's direction, a photon for a wavy line — in a sentence each. */
  assumed: string[];
  summary: string;
  confidence: number;
}

export interface FeynmanReading extends NotationReading {
  notation: 'feynman';
  diagrams: FeynmanDiagram[];
  lines: FeynmanLine[];
  vertices: FeynmanVertex[];
  externals: FeynmanExternal[];
}

// ===== Reading =====

interface Draft {
  id: string;
  ids: string[];
  kind: FeynmanLineKind;
  drawn: FeynmanDrawn;
  ends: [{ end: FeynmanEndName; point: Point; out: Point }, { end: FeynmanEndName; point: Point; out: Point }];
  length: number;
  scale: number;
  path: Point[];
  wave?: WaveReading;
  arrow?: FeynmanLine['arrow'];
  /** Its marks' nodes, for binding and own words. */
  marks: string[];
}

/** Whether a mark is writing: a word, read, or a scribble the shape rung reads as text. */
function isWriting(node: MMNode): boolean {
  if (isWord(node) || transcriptOf(node)) return true;
  return resemblances(node)[0]?.to === 'type:text';
}

/** A chevron on a line's middle: its point on the line, its arms back along it on either side. */
function chevronOn(ink: readonly Point[], line: Draft, scale: number): { to: FeynmanEndName; score: number } | null {
  if (ink.length < 3 || line.kind !== 'fermion') return null;
  const a = ink[0], b = ink[ink.length - 1];
  const chord = dist(a, b);
  // The point: farthest from the chord between the arms' ends.
  let apex = ink[0], far = -1;
  for (const p of ink) {
    const d = chord > 1e-9 ? Math.abs(crossV(sub(b, a), sub(p, a))) / chord : dist(p, a);
    if (d > far) {
      far = d;
      apex = p;
    }
  }
  const size = Math.max(dist(apex, a), dist(apex, b));
  if (size / scale < HAND_RESOLUTION_PX * 0.75 || size > CHEVRON_SHARE * line.length) return null;
  // The arms: straight from the point to each end, and open between the bounds.
  const ia = ink.indexOf(apex);
  const armA = ink.slice(0, ia + 1), armB = ink.slice(ia);
  const straight = (arm: readonly Point[]) => arm.length < 2 || dist(arm[0], arm[arm.length - 1]) >= 0.8 * pathLength(arm);
  if (!straight(armA) || !straight(armB)) return null;
  const ua = unit(sub(a, apex)), ub = unit(sub(b, apex));
  const open = Math.acos(Math.max(-1, Math.min(1, dot(ua, ub)))) * DEG;
  if (open < CHEVRON_OPEN[0] || open > CHEVRON_OPEN[1]) return null;
  // On the line, on its middle.
  const reach = Math.max(0.5 * size, magnetRadius(size, scale) * 0.5);
  if (distToPath(apex, line.path) > reach) return null;
  const along = shareAlong(apex, line.path);
  if (along < CHEVRON_MID[0] || along > CHEVRON_MID[1]) return null;
  // Pointing along the line: from the arms' ends to the point.
  const back = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const points = unit(sub(apex, back));
  const dir = unit(sub(line.ends[1].point, line.ends[0].point));
  const cos = dot(points, dir);
  const off = Math.acos(Math.min(1, Math.abs(cos))) * DEG;
  if (off > CHEVRON_ALONG) return null;
  return { to: cos > 0 ? 'end' : 'start', score: 1 - off / CHEVRON_ALONG };
}

/** Union–find over line ends. */
class Joins {
  private up: number[] = [];
  add(): number {
    this.up.push(this.up.length);
    return this.up.length - 1;
  }
  find(i: number): number {
    while (this.up[i] !== i) i = this.up[i] = this.up[this.up[i]];
    return i;
  }
  join(a: number, b: number): void {
    const x = this.find(a), y = this.find(b);
    if (x !== y) this.up[Math.max(x, y)] = Math.min(x, y);
  }
}

/** The lines a scope draws: waves, dashed rows and solid lines, each with its ends; the marks they took. */
function linesOf(state: SessionState, marks: { id: string; node: MMNode }[]): { lines: Draft[]; taken: Set<string> } | null {
  const nodes = state.nodes;
  const taken = new Set<string>();
  const drafts: Draft[] = [];
  const waved = new Set<string>();
  // 1. Waves: a boson's or a gluon's line.
  for (const m of marks) {
    if (isWord(m.node) || transcriptOf(m.node)) continue;
    const w = waveOfNode(m.node);
    if (!w) continue;
    const ink = strokePointsOf(m.node);
    if (!ink || ink.length < 2) continue;
    const a = ink[0], b = ink[ink.length - 1];
    const ax = w.axis;
    waved.add(m.id);
    drafts.push({
      id: m.id,
      ids: [m.id],
      kind: w.kind === 'curly' ? 'gluon' : 'boson',
      drawn: w.kind,
      ends: [
        { end: 'start', point: a, out: unit(sub(ax[0], ax[Math.min(1, ax.length - 1)])) },
        { end: 'end', point: b, out: unit(sub(ax[ax.length - 1], ax[Math.max(0, ax.length - 2)])) },
      ],
      length: w.length,
      scale: scaleOf(m.node),
      path: ax,
      wave: w,
      marks: [m.id],
    });
  }
  // 2. Solid lines: what the rung reads as a line, an arrow or an arc, long enough to be one — the cheap
  // questions first (how big on screen, whether it closes, whether the rung reads such a shape at all).
  const solid: Draft[] = [];
  for (const m of marks) {
    if (waved.has(m.id)) continue;
    const f = solidOf(m.node, nodes);
    // A fresh copy of what is kept: a reading adds a chevron's arrow to its own.
    if (f) solid.push({ ...f, ends: [{ ...f.ends[0] }, { ...f.ends[1] }], ...(f.arrow ? { arrow: { ...f.arrow, ids: [...f.arrow.ids] } } : {}), id: m.id, ids: [m.id], marks: [m.id] });
  }
  // 3. Dashed rows: a scalar's line, read only round the places two or more line ends already meet — a
  // scalar's end meets a vertex there — so a board of notes pays nothing for it. Their dashes leave the solid lines.
  const known = [...drafts, ...solid];
  const meeting = meetingEnds(known).filter((g) => g.length >= 2);
  if (!drafts.length && !meeting.length) return null;
  const places = meeting.map((g) => {
    const pts = g.map((i) => known[i >> 1].ends[i & 1].point);
    const at = { x: pts.reduce((t, p) => t + p.x, 0) / pts.length, y: pts.reduce((t, p) => t + p.y, 0) / pts.length };
    return { at, reach: SCALAR_REACH * Math.max(...g.map((i) => known[i >> 1].length)) };
  });
  const near = marks
    .filter((m) => {
      if (waved.has(m.id)) return false;
      const box = boundsOf(m.node);
      return !!box && places.some((p) => p.at.x >= box.minX - p.reach && p.at.x <= box.maxX + p.reach && p.at.y >= box.minY - p.reach && p.at.y <= box.maxY + p.reach);
    })
    .map((m) => m.id);
  const rows = near.length >= 3 ? dashedLines(state, near) : [];
  const dashOf = new Set(rows.flatMap((r) => r.ids));
  for (const r of rows) {
    const n0 = nodes.get(r.ids[0]);
    const scale = n0 ? scaleOf(n0) : 1;
    drafts.push({
      id: r.id,
      ids: [...r.marks],
      kind: 'scalar',
      drawn: 'dashed',
      ends: [
        { end: 'start', point: r.from, out: { x: -r.axis.x, y: -r.axis.y } },
        { end: 'end', point: r.to, out: r.axis },
      ],
      length: r.length,
      scale,
      path: [r.from, r.to],
      marks: [...r.marks],
    });
  }
  // A Feynman diagram has a boson, a gluon or a scalar in it: with no line oscillating and no line dashed, none.
  if (!drafts.length) return null;
  for (const d of solid) if (!dashOf.has(d.id)) drafts.push(d);
  // 4. A line is as long as a share of the median line: a stroke of a label's size is no line of the diagram.
  const typical = median(drafts.map((d) => d.length));
  const lines = drafts.filter((d) => d.length >= LINE_SHARE * typical);
  for (const d of lines) d.ids.forEach((id) => taken.add(id));
  return { lines, taken };
}

/** What a mark is as a solid line — its ends, its ink, its arrow — or null; kept while its reps and edges are the same objects (none is ever changed in place). */
const solidFacts = new WeakMap<MMNode, { reps: readonly unknown[]; edges: readonly unknown[]; facts: Omit<Draft, 'id' | 'ids' | 'marks'> | null }>();
function solidOf(node: MMNode, nodes: ReadonlyMap<string, MMNode>): Omit<Draft, 'id' | 'ids' | 'marks'> | null {
  const held = solidFacts.get(node);
  if (held && held.reps.length === node.reps.length && held.edges.length === node.edges.length && held.reps.every((r, i) => r === node.reps[i]) && held.edges.every((e, i) => e === node.edges[i])) return held.facts;
  const facts = readSolid(node, nodes);
  solidFacts.set(node, { reps: node.reps.slice(), edges: node.edges.slice(), facts });
  return facts;
}
function readSolid(node: MMNode, nodes: ReadonlyMap<string, MMNode>): Omit<Draft, 'id' | 'ids' | 'marks'> | null {
  const box = boundsOf(node);
  const scale = scaleOf(node);
  if (!box || Math.hypot(box.maxX - box.minX, box.maxY - box.minY) / scale < LINE_MIN_PX) return null;
  if ((getRep(node, 'fingerprint')?.data as { isClosed?: boolean } | undefined)?.isClosed) return null;
  if (!resemblances(node).some((e) => e.to === 'type:line' || e.to === 'type:arrow' || e.to === 'type:arc')) return null;
  if (isWriting(node)) return null;
  const ends = connectorEndsOf(node, nodes);
  const ink = strokePointsOf(node);
  if (!ends || !ink) return null;
  const length = dist(ends[0].point, ends[1].point);
  if (length / scale < LINE_MIN_PX) return null;
  const tip = resemblances(node)[0]?.to === 'type:arrow' ? inkEndsOf(node, nodes) : null;
  return {
    kind: 'fermion',
    drawn: 'solid',
    ends: [
      { end: ends[0].end, point: ends[0].point, out: ends[0].out },
      { end: ends[1].end, point: ends[1].point, out: ends[1].out },
    ],
    length,
    scale,
    path: ink,
    ...(tip ? { arrow: { to: tip.tail === 'start' ? 'end' : 'start', how: 'barb' as const, ids: [node.id] } } : {}),
  };
}

/** Chevrons on the fermion lines that meet a vertex: small open strokes, their point on a line's middle — each line's arrow. */
function chevronsOn(marks: readonly { id: string; node: MMNode }[], lines: readonly Draft[], taken: Set<string>): void {
  const open = lines.filter((l) => l.kind === 'fermion' && !l.arrow);
  if (!open.length) return;
  const boxes = open.map((l) => {
    const xs = l.path.map((p) => p.x), ys = l.path.map((p) => p.y);
    const pad = CHEVRON_SHARE * l.length;
    return { minX: Math.min(...xs) - pad, maxX: Math.max(...xs) + pad, minY: Math.min(...ys) - pad, maxY: Math.max(...ys) + pad };
  });
  for (const m of marks) {
    if (taken.has(m.id) || isWord(m.node) || transcriptOf(m.node)) continue;
    const b = boundsOf(m.node);
    if (!b) continue;
    const fp = getRep(m.node, 'fingerprint')?.data as { isClosed?: boolean } | undefined;
    if (fp?.isClosed) continue;
    const cand = open.filter((l, i) => !l.arrow && b.minX <= boxes[i].maxX && b.maxX >= boxes[i].minX && b.minY <= boxes[i].maxY && b.maxY >= boxes[i].minY && boxSize(b) <= CHEVRON_SHARE * l.length);
    if (!cand.length) continue;
    const ink = strokePointsOf(m.node);
    if (!ink || ink.length < 3) continue;
    const scale = scaleOf(m.node);
    let best: { line: Draft; to: FeynmanEndName; score: number } | null = null;
    for (const l of cand) {
      const c = chevronOn(ink, l, scale);
      if (c && (!best || c.score > best.score)) best = { line: l, ...c };
    }
    if (!best) continue;
    best.line.arrow = { to: best.to, how: 'chevron', ids: [m.id] };
    best.line.ids.push(m.id);
    taken.add(m.id);
  }
}

/** The farthest any end of this line reaches to meet another's (`reachOf` with it as the shorter). */
const reachOne = (p: Pick<Draft, 'length' | 'scale'>) => Math.max(VERTEX_SHARE * p.length, magnetRadius(p.length, p.scale));

/**
 * The lines' ends that meet, as groups of indices — each line's two ends in
 * turn — found through a grid as wide as the farthest reach, so a board of a
 * thousand lines pays for the ends near each other, never every pair; `tied`
 * pairs (a magnet's bind) meet whatever the distance.
 */
function meetingEnds(lines: readonly Draft[], tied: readonly (readonly [number, number])[] = []): number[][] {
  const pts = lines.flatMap((l) => l.ends.map((e) => e.point));
  const owner = lines.flatMap((l) => [l, l]);
  const up = pts.map((_, i) => i);
  const find = (i: number): number => (up[i] === i ? i : (up[i] = find(up[i])));
  const join = (a: number, b: number) => {
    const x = find(a), y = find(b);
    if (x !== y) up[Math.max(x, y)] = Math.min(x, y);
  };
  const cell = Math.max(1e-6, ...lines.map(reachOne));
  const grid = new Map<string, number[]>();
  const key = (cx: number, cy: number) => `${cx},${cy}`;
  pts.forEach((p, i) => {
    const k = key(Math.floor(p.x / cell), Math.floor(p.y / cell));
    const at = grid.get(k);
    if (at) at.push(i);
    else grid.set(k, [i]);
  });
  pts.forEach((p, i) => {
    const cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const j of grid.get(key(cx + dx, cy + dy)) ?? []) {
          if (j <= i || (owner[i] === owner[j] && lines.length > 1)) continue;
          if (dist(p, pts[j]) <= reachOf(owner[i], owner[j])) join(i, j);
        }
      }
    }
  });
  for (const [a, b] of tied) join(a, b);
  const groups = new Map<number, number[]>();
  pts.forEach((_, i) => {
    const r = find(i);
    const g = groups.get(r);
    if (g) g.push(i);
    else groups.set(r, [i]);
  });
  return [...groups.values()];
}

/** How near two line ends must be to meet: a share of the shorter line, or a magnet's reach for it on screen. */
function reachOf(p: Pick<Draft, 'length' | 'scale'>, q: Pick<Draft, 'length' | 'scale'>): number {
  const short = Math.min(p.length, q.length);
  return Math.max(VERTEX_SHARE * short, magnetRadius(short, Math.max(p.scale, q.scale)));
}

/**
 * What the marks in `scopeIds` are as a Feynman diagram (the board's content
 * plane when none is given), or null when they are none. Reads the session and
 * changes nothing in it.
 */
export function readFeynman(state: SessionState, scopeIds?: readonly string[]): FeynmanReading | null {
  const { scope, marks } = marksOf(state, scopeIds);
  if (marks.length < 3) return null;
  const nodes = state.nodes;
  const got = linesOf(state, marks);
  if (!got) return null;
  const { lines: drafts, taken } = got;

  // ===== Vertices: line ends that meet =====
  const ends: { line: Draft; e: Draft['ends'][number]; k: number }[] = [];
  for (const l of drafts) for (const e of l.ends) ends.push({ line: l, e, k: ends.length });
  // A magnet's bind first: an end tied to another line meets that line's nearer end.
  const boundEnds = new Set<number>();
  const lineOfMark = new Map<string, Draft>();
  for (const l of drafts) for (const id of l.marks) lineOfMark.set(id, l);
  const bound: [number, number][] = [];
  for (const x of ends) {
    const node = nodes.get(x.line.marks[0]);
    if (!node || x.line.drawn === 'dashed' || !node.edges.some((e) => e.rel === 'bound-to')) continue;
    for (const bnd of activeBindingsOf(node, nodes)) {
      if (bnd.end !== x.e.end) continue;
      const other = lineOfMark.get(bnd.nodeId);
      if (!other || other === x.line) continue;
      const near = ends.filter((y) => y.line === other).sort((p, q) => dist(p.e.point, x.e.point) - dist(q.e.point, x.e.point))[0];
      if (near && dist(near.e.point, x.e.point) <= 2 * reachOf(x.line, other)) {
        bound.push([x.k, near.k]);
        boundEnds.add(x.k);
      }
    }
  }
  const groups = meetingEnds(drafts, bound).map((g) => g.map((i) => ends[i]));
  const vertexOfEnd = new Map<number, string>();
  const vertexDrafts: { id: string; at: Point; members: typeof ends }[] = [];
  for (const g of groups) {
    if (g.length < 2) continue;
    const id = `vertex:${g.map((x) => `${x.line.id}@${x.e.end}`).sort().join('+')}`;
    const at = { x: g.reduce((s, x) => s + x.e.point.x, 0) / g.length, y: g.reduce((s, x) => s + x.e.point.y, 0) / g.length };
    vertexDrafts.push({ id, at, members: g });
    for (const x of g) vertexOfEnd.set(x.k, id);
  }
  if (!vertexDrafts.some((v) => v.members.length >= 3)) return null;
  // Only lines that meet a vertex can be in a diagram; only they are read on (labels, particles).
  const meets = new Set(ends.filter((x) => vertexOfEnd.has(x.k)).map((x) => x.line));
  const live = drafts.filter((d) => meets.has(d));
  const endOf = new Map(ends.map((x) => [x.e, x]));
  chevronsOn(marks, live, taken);

  // A dot drawn at a vertex is its mark.
  const dotsAt = new Map<string, string[]>();
  const real = vertexDrafts.filter((v) => v.members.length >= 3).map((v) => ({ v, short: Math.min(...v.members.map((x) => x.line.length)) }));
  for (const m of marks) {
    if (taken.has(m.id) || isWord(m.node) || transcriptOf(m.node)) continue;
    const b = boundsOf(m.node);
    if (!b) continue;
    const size = boxSize(b);
    const c = boxCentre(b);
    const v = real.find(({ v, short }) => size <= 0.25 * short && dist(c, v.at) <= VERTEX_SHARE * short + size / 2)?.v;
    if (!v) continue;
    const top = resemblances(m.node)[0]?.to;
    if (top !== 'type:dot' && top !== 'type:circle' && !isFilledScribble(m.node)) continue;
    dotsAt.set(v.id, [...(dotsAt.get(v.id) ?? []), m.id]);
    taken.add(m.id);
  }

  // ===== Labels: writing beside a line, a text standing beside it, a word on its own ink =====
  const labelOf2 = new Map<string, { ids: string[]; texts: string[]; unread: boolean }>();
  const labelsOut: NotationLabel[] = [];
  const near = live.map((l) => {
    const xs = l.path.map((p) => p.x), ys = l.path.map((p) => p.y);
    return {
      line: l,
      middle: slicePath(l.path, 0.1, 0.9),
      free: l.ends.filter((e) => !vertexOfEnd.has(endOf.get(e)!.k)).map((e) => e.point),
      box: { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) },
      reach: 2 * magnetRadius(l.length, l.scale),
    };
  });
  const nearest = (c: Point, size: number) => {
    let best: { line: Draft; d: number } | null = null;
    for (const n of near) {
      const reach = Math.max(LABEL_REACH * size, n.reach);
      if (c.x < n.box.minX - reach || c.x > n.box.maxX + reach || c.y < n.box.minY - reach || c.y > n.box.maxY + reach) continue;
      const d = Math.min(distToPath(c, n.middle), ...n.free.map((p) => dist(c, p)));
      if (d <= reach && (!best || d < best.d)) best = { line: n.line, d };
    }
    return best;
  };
  const hold = (line: Draft, id: string, text: string | undefined) => {
    const h = labelOf2.get(line.id) ?? { ids: [], texts: [], unread: false };
    h.ids.push(id);
    if (text) h.texts.push(text);
    else h.unread = true;
    labelOf2.set(line.id, h);
  };
  const span = near.length
    ? near.reduce((u, n) => ({ minX: Math.min(u.minX, n.box.minX - n.reach), maxX: Math.max(u.maxX, n.box.maxX + n.reach), minY: Math.min(u.minY, n.box.minY - n.reach), maxY: Math.max(u.maxY, n.box.maxY + n.reach) }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity })
    : null;
  for (const m of marks) {
    if (taken.has(m.id)) continue;
    const b = boundsOf(m.node);
    if (!b || !span) continue;
    // Far from every line of the diagram — farther than writing its size reaches — it labels none of them: a note elsewhere on the board.
    const pad = LABEL_REACH * boxSize(b);
    if (b.maxX < span.minX - pad || b.minX > span.maxX + pad || b.maxY < span.minY - pad || b.minY > span.maxY + pad) continue;
    if (!isWriting(m.node)) continue;
    const text = transcriptOf(m.node)?.trim() || labelOf(m.node)?.text.trim() || undefined;
    const at = nearest(boxCentre(b), boxSize(b));
    if (at) {
      hold(at.line, m.id, text);
      labelsOut.push({ id: m.id, of: at.line.id, where: 'beside', ...(text ? { text } : {}), bounds: { ...b }, role: 'label', confidence: MAX * 0.8, reason: `writing ${Math.round(at.d)} from ${at.line.kind} line ${at.line.id}` });
    } else {
      labelsOut.push({ id: m.id, where: 'alone', ...(text ? { text } : {}), bounds: { ...b }, role: 'annotation', confidence: MAX * 0.5, reason: 'writing beside no line of the diagram — a note' });
    }
    taken.add(m.id);
  }
  // A one-line text standing beside a line — a name taken from a fill-in, or typed — labels it too.
  for (const id of state.artifacts) {
    const node = nodes.get(id);
    if (!node || getRep(node, 'erased')) continue;
    const code = textCodeOf(node)?.trim();
    const b = boundsOf(node);
    if (!code || !b || code.includes('\n') || code.length > 16) continue;
    const at = nearest(boxCentre(b), boxSize(b));
    if (at) {
      hold(at.line, id, code);
      labelsOut.push({ id, of: at.line.id, where: 'beside', text: code, bounds: { ...b }, role: 'label', confidence: MAX * 0.8, reason: `a text beside ${at.line.kind} line ${at.line.id}` });
    }
  }
  // A word a hand put on a line's own ink.
  for (const l of live) {
    for (const id of l.marks) {
      const own = nodes.get(id) && labelOf(nodes.get(id)!)?.text.trim();
      if (own) hold(l, id, own);
    }
  }

  // ===== The lines, read =====
  const lines: FeynmanLine[] = live.map((d) => {
    const e0 = endOf.get(d.ends[0])!, e1 = endOf.get(d.ends[1])!;
    const lab = labelOf2.get(d.id);
    const written = lab?.texts.length ? lab.texts.join(' ') : undefined;
    const said = written ? parseParticle(written) : null;
    const notes: string[] = [];
    let particle: FeynmanLine['particle'];
    if (said) {
      particle = { id: said.particle.id, anti: said.anti, said: said.particle.said[said.anti ? 1 : 0], from: 'label' };
      if (said.particle.line !== d.kind) notes.push(`labelled ${said.text}, drawn as ${d.drawn === 'solid' ? 'a solid line' : `a ${d.drawn} line`} — a ${said.particle.name} is drawn ${FEYNMAN_TABLE.lines[said.particle.line].drawn[0]}; the label is taken`);
    } else if (written) {
      notes.push(`“${written}” names no particle in the table`);
    } else if (d.kind !== 'fermion' && !lab?.unread) {
      const id = FEYNMAN_TABLE.assumed[d.kind as 'boson'];
      const p = particleById(id)!;
      particle = { id, anti: false, said: p.said[0], from: 'assumed' };
    }
    if (d.kind === 'fermion' && !d.arrow) notes.push('a fermion line with no arrow drawn on it');
    const vfrom = vertexOfEnd.get(e0.k), vto = vertexOfEnd.get(e1.k);
    return {
      id: d.id,
      ids: d.ids,
      kind: d.kind,
      role: 'edge',
      direction: 'none',
      directed: false,
      from: vfrom ?? `external:${d.id}`,
      to: vto ?? `external:${d.id}`,
      ends: {
        from: { end: d.ends[0].end, point: d.ends[0].point, ...(vfrom ? { symbol: vfrom } : { symbol: `external:${d.id}` }), ...(boundEnds.has(e0.k) ? { bound: true } : {}), reason: vfrom ? 'meets a vertex' : 'free' },
        to: { end: d.ends[1].end, point: d.ends[1].point, ...(vto ? { symbol: vto } : { symbol: `external:${d.id}` }), ...(boundEnds.has(e1.k) ? { bound: true } : {}), reason: vto ? 'meets a vertex' : 'free' },
      },
      confidence: d.wave ? d.wave.confidence : MAX * 0.85,
      reason: d.wave ? d.wave.reason : d.drawn === 'dashed' ? 'a dashed line' : d.arrow ? `a solid line, its arrow a ${d.arrow.how}` : 'a solid line',
      labels: lab?.ids.filter((id) => !d.marks.includes(id)) ?? [],
      ...(written ? { text: written } : {}),
      drawn: d.drawn,
      lineEnds: [
        { end: d.ends[0].end, point: d.ends[0].point, ...(vfrom ? { vertex: vfrom } : {}), ...(boundEnds.has(e0.k) ? { bound: true } : {}) },
        { end: d.ends[1].end, point: d.ends[1].point, ...(vto ? { vertex: vto } : {}), ...(boundEnds.has(e1.k) ? { bound: true } : {}) },
      ],
      length: d.length,
      ...(d.arrow ? { arrow: d.arrow } : {}),
      ...(particle ? { particle } : {}),
      ...(written ? { written } : {}),
      ...(lab?.unread && !written ? { unread: true } : {}),
      ...(d.wave ? { wave: { kind: d.wave.kind, amplitude: d.wave.amplitude, halfPeriods: d.wave.halfPeriods, confidence: d.wave.confidence, reason: d.wave.reason } } : {}),
      path: d.path,
      notes,
    };
  });
  const lineById = new Map(lines.map((l) => [l.id, l]));

  // ===== Vertices and externals as symbols =====
  const vertices: FeynmanVertex[] = vertexDrafts.map((v) => {
    const lens = v.members.map((x) => x.line.length);
    const r = Math.max(4, VERTEX_SHARE * Math.min(...lens) * 0.5);
    const at = v.at;
    const kinds = v.members.map((x) => x.line.kind);
    const fermions = kinds.filter((k) => k === 'fermion').length;
    const valid = (fermions === 2 && v.members.length >= 3 && v.members.length <= 4) || (fermions === 0 && v.members.length >= 3 && v.members.length <= 4);
    const ids = dotsAt.get(v.id) ?? [];
    return {
      id: v.id,
      ids,
      symbol: 'vertex',
      role: 'node' as Role,
      confidence: MAX * (v.members.length >= 3 ? 0.85 : 0.5),
      reason: `${count(v.members.length)} line ends meet here: ${v.members.map((x) => `${x.line.kind} ${x.line.id}`).join(', ')}`,
      readings: [],
      outline: [
        { x: at.x - r, y: at.y - r },
        { x: at.x + r, y: at.y - r },
        { x: at.x + r, y: at.y + r },
        { x: at.x - r, y: at.y + r },
      ],
      bounds: { minX: at.x - r, maxX: at.x + r, minY: at.y - r, maxY: at.y + r },
      ports: [],
      labels: [],
      at,
      degree: v.members.length,
      lines: v.members.map((x) => ({ line: x.line.id, end: x.e.end })),
      powers: 0,
      valid,
      name: '',
    };
  });
  for (const v of vertices) v.readings = [{ symbol: 'vertex', role: 'node', confidence: v.confidence, reason: v.reason }];
  const vertexById = new Map(vertices.map((v) => [v.id, v]));
  const externals: FeynmanExternal[] = [];
  for (const l of lines) {
    const free = l.lineEnds.filter((e) => !e.vertex);
    if (free.length !== 1) continue;
    const at = free[0].point;
    const r = 4;
    externals.push({
      id: `external:${l.id}`,
      ids: [],
      symbol: 'external',
      role: 'node',
      confidence: MAX * 0.8,
      reason: `the free end of ${l.kind} line ${l.id}`,
      readings: [{ symbol: 'external', role: 'node', confidence: MAX * 0.8, reason: `the free end of ${l.kind} line ${l.id}` }],
      outline: [
        { x: at.x - r, y: at.y - r },
        { x: at.x + r, y: at.y - r },
        { x: at.x + r, y: at.y + r },
        { x: at.x - r, y: at.y + r },
      ],
      bounds: { minX: at.x - r, maxX: at.x + r, minY: at.y - r, maxY: at.y + r },
      ports: [],
      labels: [],
      at,
      line: l.id,
      name: '',
    });
  }

  // ===== Diagrams: the vertices joined by internal lines =====
  const comp = new Joins();
  const vIndex = new Map(vertices.map((v) => [v.id, comp.add()]));
  for (const l of lines) {
    const [a, b] = l.lineEnds;
    if (a.vertex && b.vertex) comp.join(vIndex.get(a.vertex)!, vIndex.get(b.vertex)!);
  }
  const byComp = new Map<number, FeynmanVertex[]>();
  for (const v of vertices) {
    const r = comp.find(vIndex.get(v.id)!);
    if (!byComp.has(r)) byComp.set(r, []);
    byComp.get(r)!.push(v);
  }
  const diagrams: FeynmanDiagram[] = [];
  for (const vs of byComp.values()) {
    if (!vs.some((v) => v.degree >= 3)) continue;
    const d = readDiagram(vs, lines, lineById, vertexById, externals);
    if (d) diagrams.push(d);
  }
  if (!diagrams.length) return null;
  diagrams.sort((a, b) => b.confidence - a.confidence);

  // ===== Roles: vertices' dots are nodes, lines and their chevrons and dashes edges, names labels =====
  const roles: Record<string, Role> = {};
  const inDiagram = new Set(diagrams.flatMap((d) => d.lines));
  for (const l of lines) for (const id of l.ids) if (scope.includes(id) && inDiagram.has(l.id)) roles[id] = 'edge';
  for (const v of vertices) for (const id of v.ids) if (scope.includes(id)) roles[id] ??= 'node';
  for (const lb of labelsOut) if (scope.includes(lb.id)) roles[lb.id] ??= lb.role;
  const unplaced: string[] = [];
  for (const id of scope) {
    if (!roles[id]) {
      roles[id] = 'unclassified';
      unplaced.push(id);
    }
  }

  const said = diagrams.length === 1 ? diagrams[0].summary : `${count(diagrams.length)} diagrams: ${diagrams.map((d) => d.summary).join('; ')}`;
  const used = lines.filter((l) => inDiagram.has(l.id));
  const counts: Record<string, number> = {
    vertex: vertices.filter((v) => v.degree >= 3).length,
    external: externals.filter((x) => inDiagram.has(x.line)).length,
    fermion: used.filter((l) => l.kind === 'fermion').length,
    boson: used.filter((l) => l.kind === 'boson').length,
    gluon: used.filter((l) => l.kind === 'gluon').length,
    scalar: used.filter((l) => l.kind === 'scalar').length,
    label: labelsOut.filter((l) => l.of).length,
  };
  const confidence = diagrams[0].confidence;
  return {
    notation: 'feynman',
    name: 'Feynman diagram',
    confidence,
    summary: said,
    reason: [
      `${count(counts.vertex)} ${counts.vertex === 1 ? 'vertex' : 'vertices'} where lines meet; ${[
        counts.fermion && `${count(counts.fermion)} fermion line${counts.fermion === 1 ? '' : 's'}`,
        counts.boson && `${count(counts.boson)} wavy line${counts.boson === 1 ? '' : 's'}`,
        counts.gluon && `${count(counts.gluon)} curly line${counts.gluon === 1 ? '' : 's'}`,
        counts.scalar && `${count(counts.scalar)} dashed line${counts.scalar === 1 ? '' : 's'}`,
      ]
        .filter(Boolean)
        .join(', ')}`,
      ...diagrams.flatMap((d) => [...d.assumed, ...d.breaks]),
    ].join('; '),
    symbols: [...vertices.filter((v) => diagrams.some((d) => d.vertices.includes(v.id))), ...externals.filter((x) => inDiagram.has(x.line))],
    connectors: used,
    labels: labelsOut,
    roles,
    unplaced,
    counts,
    diagrams,
    lines: used,
    vertices: vertices.filter((v) => diagrams.some((d) => d.vertices.includes(v.id))),
    externals: externals.filter((x) => inDiagram.has(x.line)),
  };
}

/** A compact scribble covering its own box: a dot filled by hand, whatever the rung reads it as. */
function isFilledScribble(node: MMNode): boolean {
  const ink = strokePointsOf(node);
  const b = boundsOf(node);
  if (!ink || !b) return false;
  const w = b.maxX - b.minX, h = b.maxY - b.minY;
  if (Math.max(w, h) > 2.2 * Math.max(1e-6, Math.min(w, h))) return false;
  return pathLength(ink) >= 2 * Math.PI * (Math.max(w, h) / 2) * 1.5;
}

// ===== One diagram =====

function readDiagram(vs: FeynmanVertex[], lines: FeynmanLine[], lineById: Map<string, FeynmanLine>, vertexById: Map<string, FeynmanVertex>, externals: FeynmanExternal[]): FeynmanDiagram | null {
  const vIds = new Set(vs.map((v) => v.id));
  const mine = lines.filter((l) => l.lineEnds.some((e) => e.vertex && vIds.has(e.vertex)));
  const exts = externals.filter((x) => mine.some((l) => l.id === x.line));
  const internal = mine.filter((l) => l.lineEnds.every((e) => e.vertex));
  const assumed: string[] = [];

  // Time: left to right, unless the lines say otherwise — the free lines run more up and down than across,
  // and their free ends spread more up and down than across.
  const free = exts.map((x) => x.at);
  const spread = (k: 'x' | 'y') => (free.length ? Math.max(...free.map((p) => p[k])) - Math.min(...free.map((p) => p[k])) : 0);
  let across0 = 0, upDown = 0;
  for (const x of exts) {
    const l = lineById.get(x.line)!;
    const v = vertexById.get(l.lineEnds.find((e) => e.vertex)!.vertex!)!;
    across0 += Math.abs(x.at.x - v.at.x);
    upDown += Math.abs(x.at.y - v.at.y);
  }
  const time: FeynmanDiagram['time'] = free.length >= 2 && upDown > across0 && spread('y') > spread('x') ? 'bottom to top' : 'left to right';
  assumed.push(time === 'left to right' ? 'time is read left to right, as it is drawn unless the lines say otherwise' : 'time is read bottom to top: the free lines stand below and above, not to either side');
  const tc = (p: Point) => (time === 'left to right' ? p.x : -p.y);
  const across = (p: Point) => (time === 'left to right' ? p.y : p.x);

  // Names: the vertices a, b … in time; the externals in and out.
  // Vertices at the same time — within SAME_TIME of the diagram's typical line — are taken across it, top to bottom.
  const typical = median(mine.map((l) => l.length));
  const ordered = [...vs].sort((a, b) => tc(a.at) - tc(b.at));
  for (let swapped = true; swapped; ) {
    swapped = false;
    for (let i = 0; i + 1 < ordered.length; i++) {
      const a = ordered[i], b = ordered[i + 1];
      if (Math.abs(tc(a.at) - tc(b.at)) < SAME_TIME * typical && across(b.at) < across(a.at)) {
        ordered[i] = b;
        ordered[i + 1] = a;
        swapped = true;
      }
    }
  }
  const names: Record<string, string> = {};
  ordered.forEach((v, i) => {
    v.name = i < 26 ? String.fromCharCode(97 + i) : `v${i + 1}`;
    names[v.id] = v.name;
  });
  const inOut = new Map<string, 'in' | 'out'>();
  for (const x of exts) {
    const l = lineById.get(x.line)!;
    const v = vertexById.get(l.lineEnds.find((e) => e.vertex)!.vertex!)!;
    const way = tc(x.at) < tc(v.at) ? 'in' : 'out';
    inOut.set(x.id, way);
    l.external = way;
  }
  const initial = exts.filter((x) => inOut.get(x.id) === 'in').sort((a, b) => across(a.at) - across(b.at));
  const final = exts.filter((x) => inOut.get(x.id) === 'out').sort((a, b) => across(a.at) - across(b.at));
  initial.forEach((x, i) => ((x.name = `i${i + 1}`), (names[x.id] = x.name)));
  final.forEach((x, i) => ((x.name = `f${i + 1}`), (names[x.id] = x.name)));

  // Flow: a fermion's from its arrow, or the label of an external one; the label rules.
  for (const l of mine) {
    if (l.kind !== 'fermion') continue;
    let flow: FeynmanLine['flow'] | undefined = l.arrow ? { to: l.arrow.to, from: 'arrow' } : undefined;
    if (l.external && l.particle?.from === 'label' && l.particle.anti !== null) {
      const vEnd = l.lineEnds.find((e) => e.vertex)!.end;
      const freeEnd = vEnd === 'start' ? 'end' : 'start';
      // A particle coming in flows into its vertex; an antiparticle coming in flows out of it, as its arrow is drawn.
      const into = (l.external === 'in') !== l.particle.anti;
      const byLabel: FeynmanLine['flow'] = { to: into ? vEnd : freeEnd, from: 'label' };
      if (flow && flow.to !== byLabel.to) l.notes.push(`its arrow points as ${l.particle.anti ? 'a particle' : 'an antiparticle'}’s would, and its label says ${l.particle.said} — the label is taken`);
      flow = byLabel;
    }
    if (flow) {
      l.flow = flow;
      // Connector direction: from the end it flows from.
      const fromEnd = flow.to === 'end' ? 'start' : 'end';
      l.direction = 'forward';
      l.directed = true;
      const fromSym = l.lineEnds.find((e) => e.end === fromEnd)!.vertex ?? `external:${l.id}`;
      const toSym = l.lineEnds.find((e) => e.end === flow!.to)!.vertex ?? `external:${l.id}`;
      l.from = fromSym;
      l.to = toSym;
    }
  }
  // A W's flow: along its sign, the way time runs.
  for (const l of mine) {
    if (l.particle?.id !== 'w') continue;
    const [a, b] = l.lineEnds;
    const pa = a.vertex ? vertexById.get(a.vertex)!.at : a.point, pb = b.vertex ? vertexById.get(b.vertex)!.at : b.point;
    if (Math.abs(tc(pb) - tc(pa)) < 0.2 * l.length) continue;
    l.flow = { to: tc(pb) > tc(pa) ? 'end' : 'start', from: 'time' };
  }
  for (const l of mine) if (l.kind === 'boson' && l.particle?.from === 'assumed') assumed.push(`the wavy line ${l.id} is taken as a photon until a label says W or Z`);
  for (const l of mine) if (l.kind === 'scalar' && l.particle?.from === 'assumed') assumed.push(`the dashed line ${l.id} is taken as the Higgs until a label says otherwise`);

  // ===== What each external particle is =====
  const sayOf = (x: FeynmanExternal): string => {
    const l = lineById.get(x.line)!;
    const p = l.particle && particleById(l.particle.id);
    if (l.kind !== 'fermion') return p ? p.said[l.particle!.anti ? 1 : 0] : '?';
    const vEnd = l.lineEnds.find((e) => e.vertex)!.end;
    let anti: boolean | null = l.particle?.anti ?? null;
    if (anti === null && l.flow) {
      const into = l.flow.to === vEnd;
      anti = (l.external === 'in') !== into;
    }
    if (p) return anti === null ? p.said[0].replace(/[⁺⁻]$/, '') : p.said[anti ? 1 : 0];
    return anti === null ? 'f' : anti ? 'f̄' : 'f';
  };
  const known = (x: FeynmanExternal) => {
    const l = lineById.get(x.line)!;
    if (!l.particle) return false;
    if (l.kind !== 'fermion') return l.particle.id !== 'w' || l.particle.anti !== null;
    return l.particle.anti !== null || !!l.flow;
  };
  for (const x of exts) {
    x.said = sayOf(x);
    const l = lineById.get(x.line)!;
    if (l.particle) {
      const p = particleById(l.particle.id)!;
      const anti = p.self ? false : x.said === p.said[1] ? true : x.said === p.said[0] ? false : null;
      x.particle = { id: p.id, anti };
    }
  }
  const processSaid = `${initial.map(sayOf).join(' ')} → ${final.map(sayOf).join(' ')}`;
  const process = exts.every(known) && initial.length && final.length ? processSaid : null;

  // ===== Order: each vertex's coupling =====
  const couplings: Partial<Record<FeynmanCoupling, number>> = {};
  for (const v of vs) {
    if (v.degree < 3) continue;
    const here = v.lines.map((x) => lineById.get(x.line)!);
    const bosons = here.filter((l) => l.kind !== 'fermion');
    const kinds = bosons.map((l) => (l.particle ? particleById(l.particle.id)?.coupling : undefined));
    const c: FeynmanCoupling | undefined = kinds.includes('αₛ') ? 'αₛ' : kinds.includes('α') ? 'α' : kinds.includes('α_W') ? 'α_W' : kinds.includes('y') ? 'y' : bosons.some((l) => l.kind === 'gluon') ? 'αₛ' : bosons.length ? 'α' : undefined;
    if (!c) continue;
    v.coupling = c;
    v.powers = v.degree >= 4 ? 2 : 1;
    couplings[c] = (couplings[c] ?? 0) + v.powers;
  }
  const orderSaid = (['α', 'αₛ', 'α_W', 'y'] as FeynmanCoupling[])
    .filter((c) => couplings[c])
    .map((c) => (c === 'α_W' ? `α_W${power(couplings[c]!) ? power(couplings[c]!) : ''}` : `${c}${power(couplings[c]!)}`))
    .join(' ');

  // ===== Loops, and the channel =====
  const loops = internal.length - vs.length + 1;
  let channel: FeynmanDiagram['channel'] = null;
  const real = vs.filter((v) => v.degree >= 3);
  if (initial.length === 2 && final.length === 2 && loops === 0 && real.length === 2 && internal.length === 1) {
    const at = (x: FeynmanExternal) => lineById.get(x.line)!.lineEnds.find((e) => e.vertex)!.vertex;
    if (at(initial[0]) === at(initial[1])) channel = 's';
    else channel = at(initial[0]) === at(final[0]) ? 't' : 'u';
  }

  // ===== Conservation at each vertex =====
  const checks: FeynmanCheck[] = [];
  const breaks: string[] = [];
  for (const v of ordered) {
    if (v.degree < 3) continue;
    const here = v.lines.map((x) => ({ line: lineById.get(x.line)!, end: x.end }));
    // What each line brings into the vertex, as a particle's quantum numbers times +1 or −1 — or why it cannot be said.
    const into = here.map(({ line, end }) => ({ line, ...intoVertex(line, end) }));
    const unknown = into.find((x) => x.sign === null);
    const label = `vertex ${v.name}`;
    const sumOf = (q: (p: FeynmanParticle) => number) => into.reduce((s, x) => s + (x.sign ?? 0) * (x.p ? q(x.p) : 0), 0);
    const eitherWay = into.some((x) => x.either);
    const judge = (quantity: FeynmanCheck['quantity'], q: (p: FeynmanParticle) => number, unitWord: (n: number) => string, family?: LeptonFamily) => {
      if (unknown) {
        checks.push({ vertex: v.id, name: v.name, quantity, ...(family ? { family } : {}), status: 'unknown', reason: `${quantity}${family ? ` (${family} family)` : ''} at ${label} not checked: ${unknown.why}` });
        return;
      }
      let sum = sumOf(q);
      if (sum !== 0 && eitherWay) {
        // A W standing across time carries its charge whichever way balances.
        const flipped = into.reduce((s, x) => s + (x.either ? -1 : 1) * (x.sign ?? 0) * (x.p ? q(x.p) : 0), 0);
        if (flipped === 0) sum = 0;
      }
      const kept = sum === 0;
      const what = `${quantity}${family ? ` (${family === 'mu' ? 'μ' : family === 'tau' ? 'τ' : 'e'} family)` : ''}`;
      const parts = into.map((x) => `${x.line.particle!.said} ${x.line.external ?? (x.sign === 1 ? 'in' : x.sign === -1 ? 'out' : '')}`.trim()).join(', ');
      checks.push({
        vertex: v.id,
        name: v.name,
        quantity,
        ...(family ? { family } : {}),
        status: kept ? 'kept' : 'broken',
        sum: q === chargeOf || q === baryonOf ? sum / 3 : sum,
        reason: kept ? `${what} is kept at ${label}` : `${what} is not kept at ${label}: ${parts} come to ${unitWord(sum)}, not 0`,
      });
      if (!kept) breaks.push(`${what} is not kept at ${label}: what meets there comes to ${unitWord(sum)}, not 0`);
    };
    judge('charge', chargeOf, (n) => thirds(n));
    for (const fam of ['e', 'mu', 'tau'] as const) {
      if (here.some(({ line }) => line.particle && particleById(line.particle.id)?.lepton[fam])) judge('lepton number', (p) => p.lepton[fam] ?? 0, (n) => signed(n), fam);
    }
    if (here.some(({ line }) => line.particle && particleById(line.particle.id)?.lepton.any)) {
      checks.push({ vertex: v.id, name: v.name, quantity: 'lepton number', status: 'unknown', reason: `lepton number by family at ${label} not checked: a neutrino there has no family written` });
    }
    if (here.some(({ line }) => line.particle && particleById(line.particle.id)?.baryon3)) judge('baryon number', baryonOf, (n) => thirds(n));
  }

  // ===== How sure =====
  const fermionLines = mine.filter((l) => l.kind === 'fermion');
  const waves = mine.filter((l) => l.kind === 'boson' || l.kind === 'gluon').length;
  const dashed = mine.filter((l) => l.kind === 'scalar').length;
  if (!waves && !dashed) return null;
  const valid = real.length ? real.filter((v) => v.valid).length / real.length : 0;
  const arrows = fermionLines.length ? fermionLines.filter((l) => l.arrow).length / fermionLines.length : 1;
  const evidence = waves ? 1 : 0.6;
  const confidence = MAX * (0.4 + 0.3 * valid + 0.2 * evidence + 0.1 * arrows);

  const parts: string[] = [];
  if (channel) parts.push(`${channel}-channel`);
  else if (initial.length && final.length) parts.push(`${initial.length} → ${final.length}`);
  if (loops > 0) parts.push(loops === 1 ? 'one loop' : `${count(loops)} loops`);
  parts.push(`${count(real.length)} ${real.length === 1 ? 'vertex' : 'vertices'}`);
  if (orderSaid) parts.push(`order ${orderSaid}`);
  let summary = parts.join(', ');
  if (process) summary += ` — ${process}`;
  if (breaks.length) summary += `; ${breaks[0].replace(/: what meets there.*$/, '')}`;
  return {
    vertices: ordered.map((v) => v.id),
    externals: [...initial, ...final].map((x) => x.id),
    lines: mine.map((l) => l.id),
    names,
    time,
    initial: initial.map((x) => x.line),
    final: final.map((x) => x.line),
    process,
    processSaid,
    channel,
    order: { couplings, said: orderSaid },
    loops: Math.max(0, loops),
    checks,
    breaks,
    assumed,
    summary,
    confidence,
  };
}

/**
 * What a line brings into the vertex at its end `end`: its particle's quantum
 * numbers times +1 (it flows in) or −1 (it flows out) — 0 for a particle that
 * carries none (a photon, a gluon, a Z, the Higgs) — or null and why when that
 * cannot be said: no particle yet, a fermion with no flow, a W with no sign. A
 * W standing across time (`either`) carries its charge whichever way balances.
 */
export function intoVertex(line: FeynmanLine, end: FeynmanEndName): { sign: number | null; p?: FeynmanParticle; why?: string; either?: boolean } {
  const p = line.particle ? particleById(line.particle.id) : undefined;
  if (!p) return { sign: null, why: line.unread ? `the writing beside ${line.id} has not been read` : `${line.id} has no particle yet` };
  if (line.kind !== 'fermion' && p.id !== 'w') return { sign: 0, p };
  if (p.id === 'w') {
    if (line.particle!.anti === null) return { sign: null, p, why: `the W on ${line.id} has no sign` };
    const q = line.particle!.anti ? -1 : 1;
    if (line.external) return { sign: line.external === 'in' ? q : -q, p };
    if (!line.flow) return { sign: q, p, either: true };
    return { sign: line.flow.to === end ? q : -q, p };
  }
  if (!line.flow) return { sign: null, p, why: `the fermion ${line.id} has no arrow` };
  return { sign: line.flow.to === end ? 1 : -1, p };
}

/** A particle in the table, by its id. */
export function feynmanParticle(id: string): FeynmanParticle | undefined {
  return particleById(id);
}

const chargeOf = (p: FeynmanParticle) => p.charge3;
const baryonOf = (p: FeynmanParticle) => p.baryon3;
/** A number of thirds in words a person reads: −2, +1, ⅓, −⅔. */
function thirds(n: number): string {
  if (n % 3 === 0) return signed(n / 3);
  const whole = Math.trunc(n / 3), rest = Math.abs(n % 3);
  const frac = rest === 1 ? '⅓' : '⅔';
  return `${n < 0 ? '−' : '+'}${whole ? Math.abs(whole) : ''}${frac}`;
}
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

export const FEYNMAN: Notation = {
  id: 'feynman',
  name: 'Feynman diagram',
  describes: 'particles as lines: fermions solid with an arrow, photons wavy, gluons curly, the Higgs dashed, meeting at vertices',
  symbols: FEYNMAN_TABLE.symbols,
  connectors: FEYNMAN_TABLE.connectors,
  read: (state, scope) => readFeynman(state, scope),
  proper: true,
};


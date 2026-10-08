// Numerals read at tier 1 (MATHS-SPEC §8, Lane F — M8; MATHS-PLAN §5, the
// `read` seat).
//
// Digits and the signs of school arithmetic, read from strokes with no model,
// in a few milliseconds, the same on every machine. Four steps:
//
//   1. WHICH STROKES COULD BE GLYPHS. A stroke larger than a letter on screen
//      is a drawing (the words' own ceilings, session/words.ts, without their
//      rule that a long flat stroke is an underline: in maths it is a minus or
//      a bar), and so is one the shape rung reads, very sure of it, as a box or
//      a triangle.
//   2. STROKES INTO GLYPHS. Four, five, plus, equals, times, divided-by and pi
//      are several strokes each. Strokes that CROSS are one glyph (+, ×, a
//      four's stem through its bar); a flat stroke stacked over or under a
//      flat stroke or a dot is one glyph (=, ÷). Whatever else stands within
//      reach of another — strokes that touch, or stand over one another
//      without touching (a five's flag, the rings of %, a root's sign over its
//      radicand), or only stand close — is in doubt, and is settled by
//      reading: the group is cut, left to right, every way into glyphs of a
//      few strokes, and the cut that reads best, stroke for stroke, is kept;
//      a cut that leaves two glyphs standing over one another pays for it.
//      Measured, not assigned.
//   3. EACH GLYPH READ. Its strokes as a point cloud (pointcloud.ts) against
//      every style's samples (samples.ts): the nearer the cloud, the better
//      the fit. Then two checks learned from the samples the way the command
//      mark learns its band (commandmark.ts): a few scale-free features of
//      its ink — how wide, how much it turns, how straight, how closed — and,
//      when the line it stands on is known, where it stands on it: a point on
//      the baseline, a degree at the top, a minus at the middle, x at the
//      height of a small letter, × in the middle. Every glyph that fits is a
//      candidate, ranked; a reading is plural, and a glyph its twin cannot be
//      told from is said as a tie.
//   4. GLYPHS INTO A LINE, AND NUMBERS. Glyphs on one band, a space apart, are
//      a run; the line it stands on (its baseline and a digit's height) is
//      measured from it — the line that reads it best of a few, then again
//      from the digits read surely on it; digits on that baseline, with at
//      most one point among them, are a number, with its unit (° ′ ″ %) after
//      it.
//
// A lone circle or line is a shape first (the trap): a run whose every glyph
// read is a stroke the shape rung reads, sure of it, as a circle, a line, a
// dot or an arc — three bubbles and two bonds — is a drawing, and is read as
// numerals only when it reads as one number written close (10, 100) or when
// the caller says it is a label beside a figure (`asLabel`). A lone stroke the
// rung reads as any shape is that shape unless it is a label; a box or a
// triangle the rung is surer of than of any glyph is that shape anywhere (a
// box left for a missing number); and a word that reads mostly as nothing is
// letters — a printed h is very like a six. Their glyph readings are kept and
// said as ties, never hidden.
//
// The arithmetic grounds the reader (MATHS-PLAN §5): a run's readings are
// plural, and `runReadings` / `consistentReading` give the next-best whole
// readings, so a later unit can find that 13 + 2 = 15 reads one glyph less
// surely than 13 + 2 = 16 before it says the sum is wrong.
//
// Tier 1: no model, nothing logged, derived only from the strokes handed in.
// Confidence is measured, and capped below certainty as the shape rung's is.

import type { Bounds, Point } from '../types';
import { analyzeStroke, MAX_TIER0_CONFIDENCE, HAND_RESOLUTION_PX } from '../recognition';
import { simplifyStroke } from '../geometry';
import { LETTER_MAX_HEIGHT_PX, LETTER_MAX_WIDTH_PX } from '../session/words';
import { seedOf } from '../packs/synthesize';
import { GLYPHS, GLYPH_TABLE, isDigit, type Glyph } from './glyphs';
import { cloudOf, matchClouds, DOT_OF_GLYPH, type Cloud } from './pointcloud';
import { GLYPH_STYLES, SAMPLE_SIZE, drawGlyph, type GlyphStyle } from './samples';

// ===== Thresholds (one home: here) =====

/** Samples drawn for each style, each from its own seed. */
export const SAMPLES_PER_STYLE = 10;
/** A cloud this far from a style's nearest sample (a mean, in units of the glyph's size) fits it not at all. */
export const FIT_ZERO = 0.16;
/** A glyph read below this is no glyph: its ink is said, its readings kept, and nothing is read from it. */
export const NUMERAL_FLOOR = 0.5;
/** Candidates within this of the top are ties: the ink alone does not tell them apart. */
export const TIE_MARGIN = 0.04;
/** A glyph whose runner-up is within this of it is a doubtful reading: the arithmetic may settle it. */
export const DOUBT_MARGIN = 0.12;
/** How much where a glyph stands on its line can take from its reading, at most. */
export const FRAME_WEIGHT = 0.5;
/** A feature's band is its samples' spread widened this much … */
const SPREAD_K = 2.5;
/** … and never narrower than its floor: the designed generosity, in each feature's own units. */
const FEATURE_FLOOR = { aspect: 0.12, turning: 0.5, straightness: 0.14, closure: 0.25 } as const;
/** Where a glyph stands on its line, in a digit's heights: never a narrower band than these. */
const FRAME_FLOOR = { top: 0.18, bottom: 0.15, width: 0.3 } as const;
/** A stroke is simplified at this share of its glyph's size before it is measured for turning and straightness … */
const SIMPLIFY_SHARE = 0.05;
/**
 * … and never finer than a digitizer's noise, in screen pixels: a pen reports
 * a pixel either way of where it is (the corpus's pen, src/test/cases.ts), and
 * on a glyph a few pixels high that is most of its shape. Ink is smoothed over
 * the same before it is read. A rule about the hand, so it takes the scale.
 */
export const INK_NOISE_PX = 1;
/** A glyph this small against its line's digit is a dot: a point has no shape to read, only a place. */
export const DOT_OF_LINE = 0.14;
/** Candidates scored under this are not worth matching: nothing is kept below it. */
const LOWEST = 0.1;

/** A stroke the shape rung reads at least this sure of is a shape first: the words' measure (session.ts keeps a sure shape out of a word at the same). */
export const SHAPE_FIRST = 0.72;
/**
 * A box or a triangle the rung is this sure of is a drawing, never a glyph. Surer than a shape first: a small ring
 * a hand wobbles reads as a box 0.73 (the rings of a % sign did), and a shape first may still be read in a run.
 */
export const NEVER_GLYPH = 0.8;
/** A lone stroke the rung reads as a shape at least this sure of is that shape first, unless it is a label. */
const LONE_SHAPE = 0.5;
/** Glyphs whose boxes come within this share of the taller's height stand within reach of each other: in doubt. */
const TOUCH_SHARE = 0.15;
/** A split that leaves two glyphs standing over one another costs this share of the less sure one's reading. */
const OVERLAP_COST = 0.5;
/** Strokes overlap across when their spans share this much of the narrower's (its width taken as at least a fifth of its height). */
const OVERLAP_SHARE = 0.5;
/** A flat stroke: its height under this share of its width. */
const FLAT_SHARE = 0.3;
/** A dot: its extent under this share of its neighbour's. */
const DOT_SHARE = 0.25;
/** Stacked strokes are at most this far apart, in the wider one's widths. */
const STACK_GAP = 0.8;
/** No glyph of the set takes more strokes than this (÷, % and π take three; a hand may add one). */
export const MAX_GLYPH_STROKES = 4;

/** Before anything is read, a run's line is the median of its tallest glyphs — those at least this share of the tallest. */
const TALL_SHARE = 0.75;
/** A digit read at least this surely says where its line stands. */
const LINE_SURE = 0.7;
/** Glyphs a run holds are at most this far apart, in its digit's heights. */
export const RUN_GAP = 1.5;
/** …share this much of the smaller one's height … */
const RUN_BAND = 0.3;
/** …or stand, if smaller, with its middle within this share of the band's height of it. */
const RUN_REACH = 0.25;
/** …and none is more than this many times the run's size, or it is a drawing beside the writing. */
const RUN_MAX_SIZE = 4;
/** Glyphs further apart than this, in a digit's heights, are in two words. */
const WORD_SPACE = 0.45;
/** A word is numerals when at least this share of it reads as glyphs (a lone shape counting half); else letters. */
const NUMERAL_SHARE = 0.5;
/** Digits of a number stand at most this far apart, in its digit's heights, when the run is all shapes. */
export const NUMBER_GAP = 0.6;
/** A digit stands on the baseline when its foot is within this of it, in a digit's heights. */
export const BASELINE_TOLERANCE = 0.22;
/** Two primes this close, in a digit's heights, are a double prime. */
const PRIME_GAP = 0.32;
/** Candidates kept for each glyph. */
const KEEP_CANDIDATES = 4;
/** Styles' glyphs matched before the bar is set, more than are kept: the line may reorder them. */
const KEEP_MATCHED = KEEP_CANDIDATES + 2;
/** Whole readings kept for each run. */
const KEEP_READINGS = 8;

// ===== What is read =====

/** The line glyphs stand on: its baseline, and a digit's height on it. */
export interface LineFrame {
  baseline: number;
  height: number;
}

export interface GlyphCandidate {
  glyph: Glyph;
  /** 0 … MAX_TIER0_CONFIDENCE: the fit, its ink's features and where it stands, together. */
  score: number;
  /** The style it is nearest. */
  style: string;
  /** The cloud's mean distance from that style's nearest sample, in units of the glyph's size. */
  distance: number;
  /** 0–1: how its ink's features sit in the style's band. */
  ink: number;
  /** 0–1: how it stands on the line (1 when the line is not known). */
  place: number;
}

export interface GlyphRead {
  /** The strokes it is made of, by their index in what was read. */
  strokes: number[];
  bounds: Bounds;
  /** Every glyph it could be, best first. */
  candidates: GlyphCandidate[];
  /** What it reads as: the top candidate, when it is at or above the floor and it is read at all. */
  glyph: Glyph | null;
  confidence: number;
  /** What it is as likely to be: glyphs within the tie margin, then the top's twins outside the set (a letter, a shape). */
  ties: string[];
  /** Its runner-up is close: a doubtful reading the arithmetic may settle. */
  doubtful: boolean;
  /** For a single stroke: what the shape rung reads it as, and how sure. */
  shape?: { type: string; confidence: number };
  /**
   * A shape first: a stroke the rung is sure of in no run of writing, a lone stroke the rung reads as a shape, or a
   * box the rung is surer of than of any glyph — read as the shape, its glyph a tie beside it.
   */
  shapeFirst: boolean;
  /** In a word that reads as letters, not numerals: not read, what it would be kept as a tie. */
  letters: boolean;
  reasoning: string;
}

export interface NumberRead {
  /** As written, the number's own characters: `24`, `3.5`. */
  text: string;
  value: number;
  /** A unit written after it: ° ′ ″ %. */
  unit?: Glyph;
  /** Its glyphs, by their place in the run. */
  glyphs: number[];
  confidence: number;
  /** One of its glyphs reads nearly as well as something else. */
  doubtful: boolean;
}

export interface RunReading {
  /** The run's text, a glyph a character; a glyph read as none is `?`. */
  text: string;
  /** The geometric mean of its glyphs' scores. */
  score: number;
  /** Which candidate each glyph took. */
  picks: Glyph[];
}

export interface RunRead {
  glyphs: GlyphRead[];
  /** The line it stands on: measured from the run, or given; none for one glyph alone. */
  line: LineFrame | null;
  /** Writing: read as numerals. A run of shapes alone is not (the trap). */
  writing: boolean;
  /** The top reading. */
  text: string;
  confidence: number;
  numbers: NumberRead[];
  /** The best whole readings, best first; the first is `text`. */
  readings: RunReading[];
  bounds: Bounds;
  reasoning: string;
}

export interface NumeralReading {
  runs: RunRead[];
  /** Every glyph, run by run, left to right. */
  glyphs: GlyphRead[];
  numbers: NumberRead[];
  /** Strokes that are no glyph at all: drawings larger than a letter, sure boxes and triangles. */
  drawings: number[];
}

export interface ReadOptions {
  /** World units per screen pixel (1/zoom): letters are letter-sized on screen. */
  scale?: number;
  /** Read a lone glyph, or a run of shapes, as numerals: the strokes are a candidate label beside a figure. */
  asLabel?: boolean;
  /** The line the glyphs stand on, when the caller knows it. Measured from the run otherwise. */
  line?: LineFrame;
}

// ===== Measuring ink =====

export interface InkFeatures {
  aspect: number;
  turning: number;
  straightness: number;
  closure: number;
}
const INK_KEYS = ['aspect', 'turning', 'straightness', 'closure'] as const;

interface Place {
  top: number;
  bottom: number;
  width: number;
}
const PLACE_KEYS = ['top', 'bottom', 'width'] as const;

function boundsOfStrokes(strokes: readonly (readonly Point[])[]): Bounds {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of strokes) for (const p of s) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

const pathOf = (s: readonly Point[]) => {
  let d = 0;
  for (let i = 1; i < s.length; i++) d += Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y);
  return d;
};

/**
 * A stroke with the digitizer's noise taken out: walked at a quarter of the
 * noise and averaged over the noise either way. A glyph's corners are many
 * noises wide, so they stay.
 */
export function smoothInk(s: readonly Point[], scale = 1): Point[] {
  if (s.length < 3) return s.map((p) => ({ x: p.x, y: p.y }));
  const step = (INK_NOISE_PX * scale) / 4;
  const walked: Point[] = [{ x: s[0].x, y: s[0].y }];
  let carry = 0;
  for (let i = 1; i < s.length; i++) {
    const a = s[i - 1], b = s[i];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    let at = step - carry;
    while (at <= d) {
      walked.push({ x: a.x + ((b.x - a.x) * at) / d, y: a.y + ((b.y - a.y) * at) / d });
      at += step;
    }
    carry = d - (at - step);
  }
  walked.push({ x: s[s.length - 1].x, y: s[s.length - 1].y });
  if (walked.length > 4000) return s.map((p) => ({ x: p.x, y: p.y }));
  const k = 4; // a noise either way, at a quarter-noise step
  const out: Point[] = [];
  for (let i = 0; i < walked.length; i++) {
    const lo = Math.max(0, i - k), hi = Math.min(walked.length - 1, i + k);
    // Ends are averaged over a window that stays symmetric, so an end does not pull in.
    const r = Math.min(i - lo, hi - i);
    let x = 0, y = 0;
    for (let j = i - r; j <= i + r; j++) {
      x += walked[j].x;
      y += walked[j].y;
    }
    out.push({ x: x / (2 * r + 1), y: y / (2 * r + 1) });
  }
  return out;
}

/** A glyph's ink, scale-free: how wide, how much it turns, how straight, how closed. */
export function inkFeatures(strokes: readonly (readonly Point[])[], scale: number): InkFeatures {
  const b = boundsOfStrokes(strokes);
  const w = b.maxX - b.minX, h = b.maxY - b.minY;
  const size = Math.hypot(w, h) || 1;
  const tol = Math.max(SIMPLIFY_SHARE * size, INK_NOISE_PX * scale);
  let turning = 0, chord = 0, path = 0, longest = -1, closure = 1;
  const whole = Math.max(w, h);
  for (const s of strokes) {
    if (s.length < 2) continue;
    // A dot among other strokes has no shape of its own — only its place, which the cloud keeps.
    if (strokes.length > 1) {
      const sb = boundsOfStrokes([s]);
      if (Math.max(sb.maxX - sb.minX, sb.maxY - sb.minY) <= DOT_OF_GLYPH * whole) continue;
    }
    const simple = simplifyStroke(s as Point[], tol);
    const len = pathOf(simple);
    for (let i = 1; i < simple.length - 1; i++) {
      const a = Math.atan2(simple[i].y - simple[i - 1].y, simple[i].x - simple[i - 1].x);
      const c = Math.atan2(simple[i + 1].y - simple[i].y, simple[i + 1].x - simple[i].x);
      let d = c - a;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      turning += Math.abs(d);
    }
    if (len > tol) {
      path += len;
      chord += Math.hypot(simple[simple.length - 1].x - simple[0].x, simple[simple.length - 1].y - simple[0].y);
    }
    if (len > longest) {
      longest = len;
      const sb = boundsOfStrokes([s]);
      const ss = Math.max(sb.maxX - sb.minX, sb.maxY - sb.minY) || 1;
      closure = Math.min(1, Math.hypot(s[s.length - 1].x - s[0].x, s[s.length - 1].y - s[0].y) / ss);
    }
  }
  return {
    aspect: w + h > 0 ? w / (w + h) : 0.5,
    turning: turning / (2 * Math.PI),
    straightness: path > 0 ? chord / path : 1,
    closure,
  };
}

function placeOn(b: Bounds, line: LineFrame): Place {
  const H = line.height || 1;
  return { top: (b.minY - line.baseline) / H, bottom: (b.maxY - line.baseline) / H, width: (b.maxX - b.minX) / H };
}

interface Band<K extends string> {
  mean: Record<K, number>;
  tol: Record<K, number>;
}

function bandOf<K extends string>(rows: Record<K, number>[], keys: readonly K[], floor: Record<K, number>): Band<K> {
  const mean = {} as Record<K, number>, tol = {} as Record<K, number>;
  for (const k of keys) {
    const xs = rows.map((r) => r[k]);
    const m = xs.reduce((a, x) => a + x, 0) / xs.length;
    const sd = Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length);
    mean[k] = m;
    tol[k] = Math.max(sd * SPREAD_K, floor[k]);
  }
  return { mean, tol };
}

/** 1 inside the band; past it, falling off as a bell over one more band's width. */
function within<K extends string>(row: Record<K, number>, band: Band<K>, keys: readonly K[]): number {
  let f = 1;
  for (const k of keys) {
    const z = Math.abs(row[k] - band.mean[k]) / band.tol[k];
    if (z > 1) f *= Math.exp(-0.5 * (z - 1) * (z - 1) * 4);
  }
  return f;
}

// ===== The model: every style's samples, read once =====

/** One style as the reader holds it: its samples' clouds, and the bands of its ink and of where it stands. */
export interface StyleModel {
  style: GlyphStyle;
  clouds: Cloud[];
  ink: Band<keyof InkFeatures>;
  place: Band<keyof Place>;
}

let MODEL: StyleModel[] | null = null;

/** The reader's samples, drawn and measured once for the life of the process: the same on every machine. */
export function numeralModel(): readonly StyleModel[] {
  if (MODEL) return MODEL;
  MODEL = GLYPH_STYLES.map((style) => {
    const drawn = Array.from({ length: SAMPLES_PER_STYLE }, (_, k) => {
      const d = drawGlyph(style, { seed: seedOf(`numeral:${style.glyph}:${style.style}:${k}`), size: SAMPLE_SIZE });
      return { ...d, strokes: d.strokes.map((s) => smoothInk(s, 1)) };
    });
    return {
      style,
      clouds: drawn.map((d) => cloudOf(d.strokes)!),
      ink: bandOf(drawn.map((d) => inkFeatures(d.strokes, 1)), INK_KEYS, FEATURE_FLOOR),
      place: bandOf(drawn.map((d) => placeOn(boundsOfStrokes(d.strokes), d.line)), PLACE_KEYS, FRAME_FLOOR),
    };
  });
  return MODEL;
}

// ===== One glyph =====

/**
 * What a glyph's ink is, whatever line it stands on: its point cloud matched
 * against every style whose ink it could be. Kept by the strokes it is made
 * of, so reading it again on another line costs no match.
 */
interface Matched {
  bounds: Bounds;
  /** Each style that could reach the bar, with its nearest sample's distance and how its ink sits in the style's band. */
  rows: { m: StyleModel; d: number; inkFit: number }[];
}

function matchStyles(strokes: readonly (readonly Point[])[], scale: number): Matched {
  const bounds = boundsOfStrokes(strokes);
  const none: Matched = { bounds, rows: [] };
  if (!Number.isFinite(bounds.minX) || strokes.length > MAX_GLYPH_STROKES) return none;
  const cloud = cloudOf(strokes);
  if (!cloud) return none;
  const ink = inkFeatures(strokes, scale);
  // What the ink allows each style before any cloud is matched — the cheap part first — and where it stands on
  // the line at best: a place fits at most one, so the bar below is a bound every line keeps.
  const styles = numeralModel()
    // A point has no shape to match: it is read by its size and place alone.
    .filter((m) => m.style.glyph !== '.')
    .map((m) => ({ m, inkFit: within(ink, m.ink, INK_KEYS) }))
    .sort((x, y) => y.inkFit - x.inkFit);
  const rows: Matched['rows'] = [];
  const bestOf = new Map<Glyph, number>();
  const bar = () => {
    const tops = [...bestOf.values()].sort((x, y) => y - x);
    return tops.length < KEEP_MATCHED ? LOWEST : Math.max(LOWEST, tops[KEEP_MATCHED - 1]);
  };
  for (const { m, inkFit } of styles) {
    const most = MAX_TIER0_CONFIDENCE * inkFit;
    const need = Math.max(bar(), (bestOf.get(m.style.glyph) ?? 0) * (1 - FRAME_WEIGHT));
    if (most <= need) continue;
    // The farthest a cloud may lie and still beat what is held, on the line that suits it best.
    const reach = FIT_ZERO * (1 - need / most);
    let d = Infinity;
    for (const t of m.clouds) d = Math.min(d, matchClouds(cloud, t, Math.min(d, reach)));
    if (!Number.isFinite(d)) continue;
    rows.push({ m, d, inkFit });
    const upper = most * Math.max(0, 1 - d / FIT_ZERO);
    if (upper > (bestOf.get(m.style.glyph) ?? 0)) bestOf.set(m.style.glyph, upper);
  }
  return { bounds, rows };
}

/** A glyph's candidates on a line (or none known): what the ink matched, with where it stands. */
function candidatesOf(matched: () => Matched, bounds: Bounds, line: LineFrame | null, scale: number): GlyphCandidate[] {
  if (!Number.isFinite(bounds.minX)) return [];
  const place = line ? placeOn(bounds, line) : null;
  const size = Math.max(widthOf(bounds), heightOf(bounds));
  // A dot has no shape to read below the hand's resolution, or against its line: only where it stands.
  if (line ? size <= DOT_OF_LINE * line.height : size <= HAND_RESOLUTION_PX * scale) {
    let best: GlyphCandidate | null = null;
    for (const m of numeralModel()) {
      if (m.style.glyph !== '.') continue;
      const pf = place ? within(place, m.place, PLACE_KEYS) : 1;
      const score = MAX_TIER0_CONFIDENCE * (place ? 1 - FRAME_WEIGHT + FRAME_WEIGHT * pf : 1 - FRAME_WEIGHT);
      if (!best || score > best.score) best = { glyph: '.', score, style: m.style.style, distance: 0, ink: 1, place: place ? pf : 1 };
    }
    return best ? [best] : [];
  }
  const best = new Map<Glyph, GlyphCandidate>();
  for (const { m, d, inkFit } of matched().rows) {
    const placeFit = place ? within(place, m.place, PLACE_KEYS) : 1;
    const score = MAX_TIER0_CONFIDENCE * Math.max(0, 1 - d / FIT_ZERO) * inkFit * (1 - FRAME_WEIGHT + FRAME_WEIGHT * placeFit);
    if (score < LOWEST) continue;
    const had = best.get(m.style.glyph);
    if (!had || score > had.score) best.set(m.style.glyph, { glyph: m.style.glyph, score, style: m.style.style, distance: d, ink: inkFit, place: placeFit });
  }
  return [...best.values()].sort((x, y) => y.score - x.score || GLYPHS.indexOf(x.glyph) - GLYPHS.indexOf(y.glyph));
}

const r2 = (v: number) => v.toFixed(2);

function styleWords(c: GlyphCandidate): string {
  return GLYPH_STYLES.find((s) => s.glyph === c.glyph && s.style === c.style)?.words ?? GLYPH_TABLE[c.glyph].words;
}

function glyphOf(strokes: readonly (readonly Point[])[], ids: number[], line: LineFrame | null, scale: number, matched?: () => Matched): GlyphRead {
  const bounds = boundsOfStrokes(strokes);
  let held: Matched | null = null;
  const all = candidatesOf(matched ?? (() => (held ??= matchStyles(strokes, scale))), bounds, line, scale);
  const top = all[0];
  const glyph = top && top.score >= NUMERAL_FLOOR ? top.glyph : null;
  const ties: string[] = [];
  if (top) {
    for (const c of all.slice(1)) if (top.score - c.score <= TIE_MARGIN && c.score >= NUMERAL_FLOOR) ties.push(c.glyph);
    for (const t of GLYPH_TABLE[top.glyph].twins) ties.push(t);
  }
  const second = all[1];
  const doubtful = !!top && !!second && top.score - second.score <= DOUBT_MARGIN && second.score >= NUMERAL_FLOOR;
  let reasoning: string;
  if (!top) reasoning = 'its ink is like no glyph of the set';
  else if (!glyph) reasoning = `nearest ${GLYPH_TABLE[top.glyph].words} at ${r2(top.score)} — under the floor of ${NUMERAL_FLOOR}, so no glyph`;
  else {
    reasoning = `${GLYPH_TABLE[top.glyph].words} ${r2(top.score)} — its ink lies ${r2(top.distance)} of its size from ${styleWords(top)}`;
    if (top.place < 0.999 && line) reasoning += `; where it stands on the line fits ${r2(top.place)}`;
    if (second && second.score >= NUMERAL_FLOOR) reasoning += `; or ${GLYPH_TABLE[second.glyph].words} ${r2(second.score)}`;
  }
  return {
    strokes: ids,
    bounds,
    candidates: all.slice(0, KEEP_CANDIDATES),
    glyph,
    confidence: glyph ? top.score : 0,
    ties,
    doubtful,
    shapeFirst: false,
    letters: false,
    reasoning,
  };
}

/**
 * Read strokes as ONE glyph: its candidates, ranked, with the line it stands
 * on if it is known. Pure; nothing grouped, nothing gated — what a later unit
 * asks of a mark it already knows is one glyph.
 */
export function readGlyph(strokes: readonly (readonly Point[])[], opts: { line?: LineFrame; scale?: number } = {}): GlyphRead {
  const scale = opts.scale ?? 1;
  return glyphOf(strokes.map((s) => smoothInk(s, scale)), strokes.map((_, i) => i), opts.line ?? null, scale);
}

// ===== Strokes into glyphs =====

interface Cluster {
  ids: number[];
  bounds: Bounds;
}

const widthOf = (b: Bounds) => b.maxX - b.minX;
const heightOf = (b: Bounds) => b.maxY - b.minY;
const union = (a: Bounds, b: Bounds): Bounds => ({ minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY), maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY) });

function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const o = (p: Point, q: Point, r: Point) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = o(c, d, a), d2 = o(c, d, b), d3 = o(a, b, c), d4 = o(a, b, d);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Whether two strokes cross each other: a segment of one through a segment of the other. */
function strokesCross(a: readonly Point[], b: readonly Point[]): boolean {
  for (let i = 1; i < a.length; i++) {
    for (let j = 1; j < b.length; j++) {
      if (segmentsCross(a[i - 1], a[i], b[j - 1], b[j])) return true;
    }
  }
  return false;
}

/** How much two spans across share, as a share of the narrower (its width at least a fifth of its height). */
function overlapAcross(a: Bounds, b: Bounds): number {
  const o = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
  const wa = Math.max(widthOf(a), heightOf(a) / 5), wb = Math.max(widthOf(b), heightOf(b) / 5);
  return o / Math.max(1e-9, Math.min(wa, wb));
}

const flat = (b: Bounds) => heightOf(b) <= FLAT_SHARE * widthOf(b);

/** A flat stroke and a flat stroke or a dot, one over the other, the narrower centred on the wider: = and ÷. */
function stacked(a: Bounds, b: Bounds): boolean {
  const [wide, narrow] = widthOf(a) >= widthOf(b) ? [a, b] : [b, a];
  if (!flat(wide)) return false;
  const dotLike = Math.max(widthOf(narrow), heightOf(narrow)) <= DOT_SHARE * widthOf(wide);
  if (!flat(narrow) && !dotLike) return false;
  if (flat(narrow) && !dotLike && widthOf(narrow) < 0.5 * widthOf(wide)) return false;
  const gap = Math.max(a.minY - b.maxY, b.minY - a.maxY);
  if (gap <= 0 || gap > STACK_GAP * widthOf(wide)) return false;
  const cx = (narrow.minX + narrow.maxX) / 2;
  return cx >= wide.minX && cx <= wide.maxX;
}

// ===== Glyphs into a line =====

/** The line a run stands on, measured from its glyphs before they are read: the tall ones' height and feet. */
function lineHypotheses(clusters: readonly Cluster[]): LineFrame[] {
  const hs = clusters.map((c) => heightOf(c.bounds));
  const tallest = Math.max(...hs);
  const tall = clusters.filter((c) => heightOf(c.bounds) >= TALL_SHARE * tallest);
  const median = (xs: number[]) => {
    const s = xs.slice().sort((a, b) => a - b);
    return s[Math.floor((s.length - 1) / 2)];
  };
  const baseline = median(tall.map((c) => c.bounds.maxY));
  const mid = Math.max(1e-6, median(tall.map((c) => heightOf(c.bounds))));
  const top = tall.reduce((a, c) => (heightOf(c.bounds) > heightOf(a.bounds) ? c : a));
  const out: LineFrame[] = [{ height: mid, baseline }];
  if (heightOf(top.bounds) > mid * 1.05) out.push({ height: heightOf(top.bounds), baseline: top.bounds.maxY });
  return out;
}

/**
 * The line measured again from what the glyphs read as: a digit read surely
 * says where a digit's top and the baseline stand. Only digits, and only sure
 * ones — a letter's bowl read half-surely as a six would otherwise set the
 * line to its own height and confirm itself.
 */
function lineFromReadings(glyphs: readonly GlyphRead[]): LineFrame | null {
  const model = numeralModel();
  const hs: number[] = [], bs: number[] = [];
  for (const g of glyphs) {
    if (!isDigit(g.glyph) || g.confidence < LINE_SURE) continue;
    const top = g.candidates[0];
    const m = model.find((x) => x.style.glyph === top.glyph && x.style.style === top.style);
    if (!m) continue;
    const span = m.place.mean.bottom - m.place.mean.top;
    const H = heightOf(g.bounds) / span;
    hs.push(H);
    bs.push(g.bounds.maxY - m.place.mean.bottom * H);
  }
  if (!hs.length) return null;
  const median = (xs: number[]) => {
    const s = xs.slice().sort((a, b) => a - b);
    return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  };
  return { height: median(hs), baseline: median(bs) };
}

const sizeOf = (b: Bounds) => Math.max(heightOf(b), widthOf(b) / 2);

/** Clusters on one band, left to right, a space apart: the runs. */
function runsOf(clusters: readonly Cluster[]): Cluster[][] {
  const sorted = clusters.slice().sort((a, b) => a.bounds.minX - b.bounds.minX || a.bounds.minY - b.bounds.minY);
  const runs: { members: Cluster[]; bounds: Bounds; size: number }[] = [];
  for (const c of sorted) {
    let home: (typeof runs)[number] | null = null;
    let nearest = Infinity;
    for (const r of runs) {
      // On the band: sharing a good part of the smaller one's height — a minus or a point stands within it whole.
      // Or, a small mark — a five's flag, a degree, a prime — standing at the band's edge, its middle within reach of it.
      const overlap = Math.min(r.bounds.maxY, c.bounds.maxY) - Math.max(r.bounds.minY, c.bounds.minY);
      const mid = (c.bounds.minY + c.bounds.maxY) / 2, reach = RUN_REACH * heightOf(r.bounds);
      const atEdge = heightOf(c.bounds) <= heightOf(r.bounds) && mid >= r.bounds.minY - reach && mid <= r.bounds.maxY + reach;
      if (overlap < RUN_BAND * Math.max(1e-6, Math.min(heightOf(r.bounds), heightOf(c.bounds))) && !atEdge) continue;
      const size = Math.max(r.size, 1e-6);
      // A run of a mark or two much smaller than this — a one's base, a minus before a number — takes it as its body.
      const onlySmall = r.members.length <= 2 && r.members.every((m) => flat(m.bounds) || sizeOf(m.bounds) * RUN_MAX_SIZE < sizeOf(c.bounds));
      if (sizeOf(c.bounds) > RUN_MAX_SIZE * size && !onlySmall) continue;
      const gap = c.bounds.minX - r.bounds.maxX;
      if (gap > RUN_GAP * Math.max(size, sizeOf(c.bounds))) continue;
      if (gap < nearest) {
        nearest = gap;
        home = r;
      }
    }
    if (home) {
      home.members.push(c);
      home.bounds = union(home.bounds, c.bounds);
      home.size = Math.max(home.size, sizeOf(c.bounds));
    } else runs.push({ members: [c], bounds: c.bounds, size: sizeOf(c.bounds) });
  }
  return runs.map((r) => r.members);
}

/** What a cut costs that leaves two glyphs standing over one another: the less sure one's reading, by a share. */
function overlapCost(a: GlyphRead, b: GlyphRead): number {
  if (a.glyph === '√' || b.glyph === '√') return 0;
  const H = Math.max(heightOf(a.bounds), heightOf(b.bounds));
  const vertical = Math.min(a.bounds.maxY, b.bounds.maxY) - Math.max(a.bounds.minY, b.bounds.minY);
  if (vertical <= -TOUCH_SHARE * H || overlapAcross(a.bounds, b.bounds) < OVERLAP_SHARE) return 0;
  return OVERLAP_COST * Math.min(a.confidence * a.strokes.length, b.confidence * b.strokes.length);
}

// ===== Reading strokes =====

/**
 * Read strokes as numerals: grouped into glyphs, the glyphs into runs on a
 * line, each glyph read with its candidates, each run with its numbers and its
 * next-best readings. Pure and deterministic; nothing is logged.
 */
export function readNumerals(given: readonly (readonly Point[])[], opts: ReadOptions = {}): NumeralReading {
  const scale = opts.scale ?? 1;
  // The ink as read: the digitizer's noise taken out. The shape rung reads the strokes as they were given.
  const strokes = given.map((s) => smoothInk(s, scale));
  const shapes = new Map<number, { type: string; confidence: number } | undefined>();
  const shapeOf = (i: number) => {
    if (!shapes.has(i)) {
      const top = given[i].length >= 2 ? analyzeStroke(given[i] as Point[], scale).results[0] : undefined;
      shapes.set(i, top ? { type: top.type, confidence: top.confidence } : undefined);
    }
    return shapes.get(i);
  };

  // 1. Which strokes could be glyphs.
  const drawings: number[] = [];
  const candidates: number[] = [];
  strokes.forEach((s, i) => {
    if (!s.length) return;
    const b = boundsOfStrokes([s]);
    // Letter-sized on screen: the words' own ceilings, without their rule that a long flat stroke is an underline —
    // in maths a long flat stroke is a minus, a bar of an equals or of a pi, a fraction's bar. The shape rung is
    // asked only of a stroke that size: a board's drawings cost nothing.
    const letterSized = (b.maxY - b.minY) / scale <= LETTER_MAX_HEIGHT_PX && (b.maxX - b.minX) / scale <= LETTER_MAX_WIDTH_PX;
    const sure = letterSized ? shapeOf(i) : undefined;
    if (!letterSized || (sure && (sure.type === 'rectangle' || sure.type === 'triangle') && sure.confidence >= NEVER_GLYPH)) drawings.push(i);
    else candidates.push(i);
  });

  // 2. Strokes that cross, or stack flat over flat or a dot, are one glyph for certain.
  const parent = new Map<number, number>(candidates.map((i) => [i, i]));
  const find = (i: number): number => (parent.get(i) === i ? i : find(parent.get(i)!));
  const join = (a: number, b: number) => parent.set(find(a), find(b));
  const boxes = new Map(candidates.map((i) => [i, boundsOfStrokes([strokes[i]])]));
  const simple = new Map(candidates.map((i) => {
    const b = boxes.get(i)!;
    return [i, simplifyStroke(strokes[i] as Point[], Math.max(widthOf(b), heightOf(b), 1e-6) * 0.02)];
  }));
  const near = (a: Bounds, b: Bounds, by: number) => a.minX - by <= b.maxX && b.minX - by <= a.maxX && a.minY - by <= b.maxY && b.minY - by <= a.maxY;
  for (let x = 0; x < candidates.length; x++) {
    for (let y = x + 1; y < candidates.length; y++) {
      const i = candidates[x], j = candidates[y];
      const a = boxes.get(i)!, b = boxes.get(j)!;
      if (stacked(a, b)) {
        join(i, j);
        continue;
      }
      if (near(a, b, 0) && overlapAcross(a, b) > 0 && strokesCross(simple.get(i)!, simple.get(j)!)) join(i, j);
    }
  }
  const byRoot = new Map<number, number[]>();
  for (const i of candidates) {
    const r = find(i);
    if (!byRoot.has(r)) byRoot.set(r, []);
    byRoot.get(r)!.push(i);
  }
  const clusters: Cluster[] = [...byRoot.values()].map((ids) => ({ ids, bounds: boundsOfStrokes(ids.map((i) => strokes[i])) }));

  // 3. What is in doubt — clusters that touch, or stand over one another without touching — is found before the
  // runs are, so a one's base or a five's flag goes into the run with its glyph; it is settled by reading, below.
  const doubt = new Map<Cluster, Set<Cluster>>(clusters.map((c) => [c, new Set<Cluster>()]));
  const byX = clusters.slice().sort((a, b) => a.bounds.minX - b.bounds.minX);
  // Sorted by their left edges, so once one stands further right of a than any reach, every one after it does.
  const farthest = TOUCH_SHARE * Math.max(0, ...clusters.map((c) => heightOf(c.bounds)));
  for (let x = 0; x < byX.length; x++) {
    const a = byX[x];
    for (let y = x + 1; y < byX.length; y++) {
      const b = byX[y];
      if (b.bounds.minX - a.bounds.maxX > farthest) break;
      const H = Math.max(heightOf(a.bounds), heightOf(b.bounds));
      if (!near(a.bounds, b.bounds, TOUCH_SHARE * H)) continue;
      doubt.get(a)!.add(b);
      doubt.get(b)!.add(a);
    }
  }
  const blobs: Cluster[][] = [];
  const seen = new Set<Cluster>();
  for (const c of clusters) {
    if (seen.has(c)) continue;
    const comp: Cluster[] = [];
    const stack = [c];
    seen.add(c);
    while (stack.length) {
      const k = stack.pop()!;
      comp.push(k);
      for (const n of doubt.get(k)!) if (!seen.has(n)) {
        seen.add(n);
        stack.push(n);
      }
    }
    blobs.push(comp.sort((a, b) => a.bounds.minX + a.bounds.maxX - (b.bounds.minX + b.bounds.maxX) || a.bounds.minY - b.bounds.minY));
  }
  const blobOf = new Map<Cluster, Cluster[]>();
  const asCluster = blobs.map((comp) => {
    const whole: Cluster = { ids: comp.flatMap((c) => c.ids), bounds: comp.map((c) => c.bounds).reduce(union) };
    blobOf.set(whole, comp);
    return whole;
  });

  const runs: RunRead[] = [];
  // What each group of strokes matched, whatever line it is read on.
  const matches = new Map<string, Matched>();
  for (const wholes of runsOf(asCluster)) {
    const cache = new Map<string, GlyphRead>();
    const read = (ids: number[], at: LineFrame | null): GlyphRead => {
      const inks = ids.slice().sort((a, b) => a - b).join(',');
      const key = inks + (at ? `@${at.baseline.toFixed(2)},${at.height.toFixed(2)}` : '');
      const hit = cache.get(key);
      if (hit) return hit;
      const g = glyphOf(ids.map((i) => strokes[i]), ids, at, scale, () => {
        let m = matches.get(inks);
        if (!m) matches.set(inks, (m = matchStyles(ids.map((i) => strokes[i]), scale)));
        return m;
      });
      cache.set(key, g);
      return g;
    };
    const settle = (line: LineFrame | null): { glyphs: GlyphRead[]; total: number } => {
      // Each blob is read every way its clusters can be cut, left to right, into glyphs of a few strokes, and the cut
      // that reads best, stroke for stroke, is kept. Two glyphs a cut leaves standing over one another cost the less
      // sure of them: glyphs of a line stand side by side, all but a root over what it holds.
      const settled: Cluster[] = [];
      for (const whole of wholes) {
        const comp = blobOf.get(whole)!;
        if (comp.length === 1) {
          settled.push(...comp);
          continue;
        }
        const n = comp.length;
        const segment = (j: number, i: number) => comp.slice(j, i).flatMap((c) => c.ids);
        const fits = (j: number, i: number) => i - j === 1 || segment(j, i).length <= MAX_GLYPH_STROKES;
        // best[i][j]: the best reading of the first i clusters whose last glyph is clusters j … i−1.
        const best: { total: number; glyphs: number; from: number }[][] = Array.from({ length: n + 1 }, () => []);
        for (let i = 1; i <= n; i++) {
          for (let j = 0; j < i; j++) {
            if (!fits(j, i)) continue;
            const g = read(segment(j, i), line);
            const own = g.confidence * g.strokes.length;
            if (j === 0) {
              best[i][j] = { total: own, glyphs: 1, from: -1 };
              continue;
            }
            let pick: { total: number; glyphs: number; from: number } | null = null;
            for (let k = 0; k < j; k++) {
              const before = best[j][k];
              if (!before) continue;
              const total = before.total + own - overlapCost(read(segment(k, j), line), g);
              const glyphs = before.glyphs + 1;
              if (!pick || total > pick.total + 1e-9 || (Math.abs(total - pick.total) <= 1e-9 && glyphs < pick.glyphs)) pick = { total, glyphs, from: k };
            }
            if (pick) best[i][j] = pick;
          }
        }
        let last = -1;
        for (let j = 0; j < n; j++) {
          const b = best[n][j];
          if (!b) continue;
          const cur = last < 0 ? null : best[n][last];
          if (!cur || b.total > cur.total + 1e-9 || (Math.abs(b.total - cur.total) <= 1e-9 && b.glyphs < cur.glyphs)) last = j;
        }
        const cuts: [number, number][] = [];
        for (let i = n, j = last; j >= 0; ) {
          cuts.unshift([j, i]);
          const from = best[i][j].from;
          i = j;
          j = from;
        }
        for (const [j, i] of cuts) {
          const ids = segment(j, i);
          settled.push({ ids, bounds: boundsOfStrokes(ids.map((k) => strokes[k])) });
        }
      }
      settled.sort((a, b) => a.bounds.minX - b.bounds.minX);
      const glyphs = settled.map((c) => read(c.ids, line));
      return { glyphs, total: glyphs.reduce((t, g) => t + g.confidence * g.strokes.length, 0) };
    };

    // 4. The line: given, or measured from the run — its tallest glyphs' median height, or the tallest, whichever
    // reads better — then measured again from the digits read surely on it, and kept if that reads better still.
    // One glyph alone has no line but the one it is given.
    let line: LineFrame | null = opts.line ?? null;
    let best = settle(line);
    if (!opts.line && wholes.length > 1) {
      best = { glyphs: [], total: -1 };
      for (const at of lineHypotheses(wholes)) {
        const tried = settle(at);
        if (tried.total > best.total + 1e-9) {
          best = tried;
          line = at;
        }
      }
      const again = lineFromReadings(best.glyphs);
      if (again) {
        const tried = settle(again);
        if (tried.total >= best.total - 1e-9) {
          best = tried;
          line = again;
        }
      }
    }
    let glyphs = best.glyphs;
    glyphs = mergePrimes(glyphs, strokes, line, scale);
    for (const g of glyphs) {
      if (g.strokes.length !== 1) continue;
      g.shape = shapeOf(g.strokes[0]);
      // A box or a triangle the rung reads surer than this reads as any glyph is that shape — a box left for a
      // missing number, a diamond — and what it would be as a glyph is kept as a tie.
      const sh = g.shape;
      if (g.glyph && sh && (sh.type === 'rectangle' || sh.type === 'triangle') && sh.confidence >= SHAPE_FIRST && sh.confidence >= g.confidence) {
        const was = g.candidates[0];
        g.ties = [...new Set([shapeWords(sh.type), was.glyph, ...g.ties])];
        g.reasoning = `${shapeWords(sh.type)} first — the shape rung reads it ${sh.type} ${r2(sh.confidence)}, surer than ${GLYPH_TABLE[was.glyph].words} ${r2(was.score)}`;
        g.glyph = null;
        g.confidence = 0;
        g.shapeFirst = true;
      }
    }
    runs.push(runOf(glyphs, line, opts));
  }
  runs.sort((a, b) => a.bounds.minY - b.bounds.minY || a.bounds.minX - b.bounds.minX);
  return {
    runs,
    glyphs: runs.flatMap((r) => r.glyphs),
    numbers: runs.flatMap((r) => r.numbers),
    drawings,
  };
}

/** Two primes side by side, close, are one double prime. */
function mergePrimes(glyphs: GlyphRead[], strokes: readonly (readonly Point[])[], line: LineFrame | null, scale: number): GlyphRead[] {
  const out: GlyphRead[] = [];
  for (const g of glyphs) {
    const last = out[out.length - 1];
    if (line && last && last.glyph === '′' && g.glyph === '′' && g.bounds.minX - last.bounds.maxX <= PRIME_GAP * line.height) {
      const ids = [...last.strokes, ...g.strokes];
      const both = glyphOf(ids.map((i) => strokes[i]), ids, line, scale);
      if (both.glyph === '″') {
        out[out.length - 1] = both;
        continue;
      }
    }
    out.push(g);
  }
  return out;
}

const isShapeAlone = (g: GlyphRead) => g.strokes.length === 1 && !!g.shape && g.shape.type !== 'text' && g.shape.confidence >= SHAPE_FIRST;
/** Alone on the page, one stroke the rung reads as a shape at all is that shape: a lone glyph is read as a label, when asked. */
const isLoneShape = (g: GlyphRead) => g.strokes.length === 1 && !!g.shape && g.shape.type !== 'text' && g.shape.confidence >= LONE_SHAPE;

function geometricMean(xs: number[]): number {
  if (!xs.length) return 0;
  return Math.exp(xs.reduce((a, x) => a + Math.log(Math.max(1e-6, x)), 0) / xs.length);
}

/** The best whole readings of a run: a beam over each glyph's candidates. */
function readingsOf(glyphs: readonly GlyphRead[], keep = KEEP_READINGS): RunReading[] {
  let beam: { picks: Glyph[]; logs: number }[] = [{ picks: [], logs: 0 }];
  const unread: Glyph[] = [];
  for (const g of glyphs) {
    const options = g.glyph ? g.candidates.filter((c) => c.score >= NUMERAL_FLOOR) : [];
    if (!options.length) {
      beam = beam.map((b) => ({ picks: [...b.picks, '?' as Glyph], logs: b.logs + Math.log(1e-6) }));
      unread.push('?' as Glyph);
      continue;
    }
    const next: typeof beam = [];
    for (const b of beam) for (const o of options) next.push({ picks: [...b.picks, o.glyph], logs: b.logs + Math.log(o.score) });
    next.sort((a, b) => b.logs - a.logs);
    beam = next.slice(0, keep);
  }
  return beam.map((b) => ({
    picks: b.picks,
    text: b.picks.map((p) => (p === ('?' as Glyph) ? '?' : GLYPH_TABLE[p].text)).join(''),
    score: glyphs.length ? Math.exp(b.logs / glyphs.length) : 0,
  }));
}

/** The numbers in a read line: digits on the baseline with at most one point among them, and a unit after. */
function numbersOf(glyphs: readonly GlyphRead[], line: LineFrame | null): NumberRead[] {
  const out: NumberRead[] = [];
  const onBase = (g: GlyphRead) => !line || Math.abs(g.bounds.maxY - line.baseline) <= BASELINE_TOLERANCE * line.height;
  let i = 0;
  while (i < glyphs.length) {
    const g = glyphs[i];
    const digitStart = isDigit(g.glyph) && onBase(g);
    const pointStart = g.glyph === '.' && i + 1 < glyphs.length && isDigit(glyphs[i + 1].glyph) && onBase(glyphs[i + 1]);
    if (!digitStart && !pointStart) {
      i++;
      continue;
    }
    const at: number[] = [];
    let text = '';
    let points = 0;
    while (i < glyphs.length) {
      const h = glyphs[i];
      if (isDigit(h.glyph) && onBase(h)) text += h.glyph;
      else if (h.glyph === '.' && points === 0 && i + 1 < glyphs.length && isDigit(glyphs[i + 1].glyph) && onBase(glyphs[i + 1])) {
        text += '.';
        points++;
      } else break;
      at.push(i);
      i++;
    }
    let unit: Glyph | undefined;
    if (i < glyphs.length && glyphs[i].glyph && GLYPH_TABLE[glyphs[i].glyph!].kind === 'unit') {
      unit = glyphs[i].glyph!;
      at.push(i);
      i++;
    }
    const used = at.map((k) => glyphs[k]);
    out.push({
      text,
      value: Number(text),
      unit,
      glyphs: at,
      confidence: geometricMean(used.map((u) => u.confidence)),
      doubtful: used.some((u) => u.doubtful),
    });
  }
  return out;
}

/** A run's glyphs split into words at a space, left to right. */
function wordsOf(glyphs: readonly GlyphRead[], line: LineFrame | null): GlyphRead[][] {
  if (!line) return [glyphs.slice()];
  const out: GlyphRead[][] = [];
  for (const g of glyphs) {
    const last = out[out.length - 1];
    if (last && g.bounds.minX - Math.max(...last.map((x) => x.bounds.maxX)) <= WORD_SPACE * line.height) last.push(g);
    else out.push([g]);
  }
  return out;
}

/** How much a word's glyphs read as numerals: a glyph read counts one, a lone shape read as one half. */
function numeralShare(word: readonly GlyphRead[]): number {
  let n = 0;
  for (const g of word) if (g.glyph) n += isShapeAlone(g) ? 0.5 : 1;
  return n / word.length;
}

function runOf(glyphs: GlyphRead[], line: LineFrame | null, opts: ReadOptions): RunRead {
  const bounds = glyphs.map((g) => g.bounds).reduce(union);
  // A word that reads mostly as nothing is letters: printed words, not numerals. Its glyphs are not read — a printed
  // h is very like a six — and what they would be is kept as a tie.
  let letters = 0;
  if (!opts.asLabel) {
    for (const word of wordsOf(glyphs, line)) {
      if (numeralShare(word) >= NUMERAL_SHARE) continue;
      letters++;
      for (const g of word) {
        g.letters = true;
        if (!g.glyph) continue;
        const was = g.candidates[0];
        g.glyph = null;
        g.confidence = 0;
        g.ties = [...new Set([was.glyph, ...g.ties])];
        g.reasoning = `in a word that reads as letters, not numerals; as a glyph it would be ${GLYPH_TABLE[was.glyph].words} ${r2(was.score)}`;
      }
    }
  }
  // Writing, in numerals: a glyph read that is no lone shape. A run of shapes alone — or of shapes and ink that
  // reads as no glyph, a connector beside a label in words — is a drawing, unless it reads as one number written
  // close (10, 100), or it is a label.
  const lone = glyphs.length === 1;
  const shapeFirst = (g: GlyphRead) => isShapeAlone(g) || (lone && isLoneShape(g));
  const evidence = glyphs.some((g) => g.glyph && !shapeFirst(g));
  let tightNumber = false;
  if (!evidence && line && glyphs.length >= 2) {
    const at = line;
    tightNumber = glyphs.every((g) => isDigit(g.glyph)) &&
      glyphs.every((g, k) => k === 0 || g.bounds.minX - glyphs[k - 1].bounds.maxX <= NUMBER_GAP * at.height) &&
      glyphs.every((g) => Math.abs(g.bounds.maxY - at.baseline) <= BASELINE_TOLERANCE * at.height);
  }
  const writing = !!opts.asLabel || evidence || tightNumber;
  if (!writing) {
    for (const g of glyphs) {
      if (!shapeFirst(g) || !g.glyph) continue;
      const as = g.candidates[0];
      g.shapeFirst = true;
      g.glyph = null;
      g.confidence = 0;
      g.ties = [...new Set([shapeWords(g.shape!.type), as.glyph, ...g.ties])];
      g.reasoning = `${shapeWords(g.shape!.type)} first — the shape rung reads it ${g.shape!.type} ${r2(g.shape!.confidence)}, in no run of writing; as a glyph it would be ${GLYPH_TABLE[as.glyph].words} ${r2(as.score)}`;
    }
  } else {
    // A shape read as a glyph keeps the shape as its tie.
    for (const g of glyphs) if (g.glyph && isShapeAlone(g)) g.ties = [...new Set([...g.ties, shapeWords(g.shape!.type)])];
  }
  const readings = writing ? readingsOf(glyphs) : [];
  const numbers = writing ? numbersOf(glyphs, line) : [];
  const text = readings[0]?.text ?? '';
  const confidence = readings[0]?.score ?? 0;
  const reasoning = !writing
    ? letters
      ? `${glyphs.length === 1 ? 'one mark' : `${glyphs.length} marks`} in ${letters === 1 ? 'a word' : `${letters} words`} that read as letters, not numerals`
      : `${glyphs.length === 1 ? 'a lone shape' : `${glyphs.length} shapes in a row`} — a drawing, not writing`
    : `${glyphs.length === 1 ? 'one glyph' : `${glyphs.length} glyphs`}${line ? ` on a line ${r2(line.height)} high` : ', its line not known'}: “${text}”` + (numbers.length ? `, ${numbers.length} number${numbers.length === 1 ? '' : 's'}` : '');
  return { glyphs, line, writing, text, confidence, numbers, readings, bounds, reasoning };
}

function shapeWords(type: string): string {
  return type === 'arrow' ? 'an arrow' : type === 'arc' ? 'an arc' : `a ${type}`;
}

// ===== The arithmetic grounds the reader =====

/** A run's whole readings, best first, at most `k`: what a later unit hands its arithmetic. */
export function runReadings(run: RunRead, k = KEEP_READINGS): RunReading[] {
  return run.writing ? readingsOf(run.glyphs, k) : [];
}

/**
 * The best reading of a run that `accept` takes — `13 + 2 = 15` where the top
 * read `13 + 2 = 16` — with how far down the list it stood and how much less
 * sure it is than the top. Null when no reading among the `k` best is taken.
 */
export function consistentReading(run: RunRead, accept: (text: string, reading: RunReading) => boolean, k = 32): { reading: RunReading; rank: number; drop: number } | null {
  const all = runReadings(run, k);
  for (let rank = 0; rank < all.length; rank++) {
    if (accept(all[rank].text, all[rank])) return { reading: all[rank], rank, drop: all[0].score - all[rank].score };
  }
  return null;
}

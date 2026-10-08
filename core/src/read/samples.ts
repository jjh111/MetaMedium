// The numerals' built-in samples (MATHS-SPEC §8, Lane F — M8).
//
// The reader is taught the way the command mark is: from drawings of each
// glyph, through the same mechanism a person's own samples will go through
// (wave 2). There are no recordings of a hand here — John's notebooks are
// private and never enter the repository — so each glyph is DEFINED: one or
// more styles (a one with a flag and without, a four open and closed, a seven
// with a bar and without), each a few strokes of control points in the glyph's
// own frame, with ranges for what a hand varies (how wide, how far the flag
// reaches, where the pen starts). A drawing is that definition with its ranges
// drawn from a seed, smoothed through its control points as a pen rounds a
// turn, and given a hand's tremor (`handLike`, seeded): the same ink on every
// machine and in every replay.
//
// Two ways to draw:
//   - `drawGlyph(style, { seed })`: what the reader is TAUGHT from — the style
//     as defined, ranges drawn from the seed, the corpus's tremor.
//   - `handGlyph(style, { seed })`: what the bench READS — the same definition
//     drawn the way a careless hand would: its control points pushed about,
//     the glyph slanted, turned and stretched, its strokes in another order and
//     direction, sampled sparsely or densely, with a digitizer's noise. Never
//     the reader's own samples: other seeds, other tremor, other sizes.
//
// The frame: the line a glyph stands on. y grows downward; the baseline is
// y = 0 and a digit's top is y = −1, so one unit is a digit's height. Where a
// glyph stands in this frame — a point on the baseline, a degree at the top,
// a minus at the middle — is part of its definition, and the reader measures
// it from these samples.

import type { Point } from '../types';
import type { Glyph } from './glyphs';
import { handLike, mulberry32, seedOf } from '../packs/synthesize';

/** A control point; `c` marks a corner, where the pen turns sharply instead of rounding. */
export interface Control {
  x: number;
  y: number;
  c?: boolean;
}

/** Draws a range: the reader's samples from one seed, the bench's from another. */
export type Range = (lo: number, hi: number) => number;

export interface GlyphStyle {
  glyph: Glyph;
  /** Its name among the glyph's styles: `plain`, `flag`, `open`, `closed` … */
  style: string;
  /** In words, for the bench's report. */
  words: string;
  /** Its strokes as control points in the line's frame, in the order a hand draws them. */
  draw(q: Range): Control[][];
}

// ===== Building control points =====

const p = (x: number, y: number): Control => ({ x, y });
const c = (x: number, y: number): Control => ({ x, y, c: true });

/** Points along an ellipse from angle `a0` through `sweep` radians (y down: −π/2 is the top). */
function ellipse(cx: number, cy: number, rx: number, ry: number, a0: number, sweep: number, n = 16): Control[] {
  const out: Control[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (sweep * i) / n;
    out.push(p(cx + rx * Math.cos(a), cy + ry * Math.sin(a)));
  }
  return out;
}

/** A dot as a pen leaves it: a tiny spiral, or a touch with almost no length. */
function dot(cx: number, cy: number, r: number, tap: boolean): Control[] {
  if (tap) return [p(cx, cy), p(cx + r * 0.3, cy + r * 0.2)];
  const out: Control[] = [];
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 3;
    const k = r * (0.35 + 0.65 * (i / 10));
    out.push(p(cx + k * Math.cos(a), cy + k * Math.sin(a)));
  }
  return out;
}

const mirror = (s: Control[][], about: number): Control[][] => s.map((st) => st.map((q) => ({ ...q, x: about - q.x })));

// ===== The styles =====

export const GLYPH_STYLES: readonly GlyphStyle[] = [
  // --- digits ---
  {
    glyph: '0', style: 'oval', words: 'a nought, an oval round and closed',
    draw: (q) => {
      const w = q(0.5, 0.72), dir = q(0, 1) < 0.75 ? -1 : 1;
      return [ellipse(w / 2, -0.5, w / 2, 0.5, -Math.PI / 2 + q(-0.35, 0.35), dir * (Math.PI * 2 + q(0.03, 0.3)), 20)];
    },
  },
  {
    glyph: '0', style: 'narrow', words: 'a nought, narrow, its ends not quite meeting',
    draw: (q) => {
      const w = q(0.32, 0.48), dir = q(0, 1) < 0.6 ? -1 : 1;
      return [ellipse(w / 2, -0.5, w / 2, 0.5, -Math.PI / 2 + q(-0.2, 0.2), dir * (Math.PI * 2 - q(0.05, 0.22)), 20)];
    },
  },
  {
    glyph: '1', style: 'plain', words: 'a one, a stroke down',
    draw: (q) => [[p(q(0, 0.08), -1), p(q(-0.03, 0.03), 0)]],
  },
  {
    glyph: '1', style: 'flag', words: 'a one with a flag',
    draw: (q) => {
      const x = q(0.18, 0.26);
      return [[p(x - q(0.16, 0.26), -1 + q(0.18, 0.32)), c(x, -1), p(x + q(-0.04, 0.02), 0)]];
    },
  },
  {
    glyph: '1', style: 'base', words: 'a one with a flag and a base',
    draw: (q) => {
      const x = q(0.2, 0.26), base = q(0.18, 0.26);
      return [[p(x - q(0.16, 0.24), -1 + q(0.18, 0.3)), c(x, -1), p(x, 0)], [p(x - base, q(-0.02, 0.01)), p(x + base, q(-0.02, 0.01))]];
    },
  },
  {
    glyph: '2', style: 'round', words: 'a two, a round top and a flat base',
    draw: (q) => {
      const w = q(0.52, 0.66);
      return [[p(0.04, -0.72 + q(-0.06, 0.06)), p(w * 0.3, -0.97), p(w * 0.68, -0.99), p(w * 0.96, -0.82), p(w * 0.92, -0.6), p(w * 0.6, -0.36), c(q(0, 0.05), 0), p(w + q(-0.02, 0.08), q(-0.03, 0.02))]];
    },
  },
  {
    glyph: '2', style: 'angular', words: 'a two, a hook and a straight diagonal',
    draw: (q) => {
      const w = q(0.5, 0.64);
      return [[p(0.02, -0.76 + q(-0.05, 0.05)), p(w * 0.3, -0.98), p(w * 0.7, -0.98), c(w * 0.92, q(-0.78, -0.68)), c(q(0, 0.05), 0), p(w + q(0, 0.08), q(-0.03, 0.02))]];
    },
  },
  {
    glyph: '3', style: 'round', words: 'a three, two bowls',
    draw: (q) => {
      const w = q(0.5, 0.62), mid = q(-0.58, -0.48);
      return [[p(0.03, -0.84), p(w * 0.4, -1.0), p(w * 0.85, -0.94), p(w * 0.9, -0.76), c(w * 0.42, mid), p(w * 0.92, mid + 0.14), p(w, -0.2), p(w * 0.62, 0), p(w * 0.2, -0.02), p(0, -0.14)]];
    },
  },
  {
    glyph: '3', style: 'flat', words: 'a three with a flat top',
    draw: (q) => {
      const w = q(0.5, 0.62);
      return [[p(0.02, -1.0), c(w, -0.98), c(w * 0.38, q(-0.6, -0.5)), p(w * 0.86, -0.46), p(w, -0.22), p(w * 0.64, 0), p(w * 0.2, -0.02), p(0, -0.14)]];
    },
  },
  {
    glyph: '4', style: 'closed', words: 'a four, closed at the top',
    draw: (q) => {
      const x = q(0.44, 0.54), bar = q(-0.4, -0.3);
      return [[p(x, -1), c(0, bar), p(x + q(0.14, 0.24), bar + q(-0.02, 0.02))], [p(x + q(-0.02, 0.02), -1), p(x + q(-0.04, 0.02), 0)]];
    },
  },
  {
    glyph: '4', style: 'open', words: 'a four, open at the top',
    draw: (q) => {
      const x = q(0.46, 0.56), bar = q(-0.42, -0.32);
      return [[p(q(0.04, 0.14), -1), c(0, bar), p(x + q(0.14, 0.24), bar + q(-0.02, 0.02))], [p(x, q(-0.9, -0.74)), p(x + q(-0.03, 0.02), 0)]];
    },
  },
  {
    glyph: '5', style: 'two', words: 'a five, its flag drawn after',
    draw: (q) => {
      const w = q(0.5, 0.62), knee = q(-0.6, -0.5);
      return [
        [p(0.08, -0.98), c(0.04, knee), p(w * 0.5, knee - 0.06), p(w * 0.92, knee + 0.12), p(w, -0.22), p(w * 0.66, -0.01), p(w * 0.22, -0.02), p(0, -0.14)],
        [p(0.08, -1.0 + q(-0.02, 0.02)), p(w + q(-0.04, 0.06), -1.0 + q(-0.03, 0.03))],
      ];
    },
  },
  {
    glyph: '5', style: 'one', words: 'a five in one stroke, the flag first',
    draw: (q) => {
      const w = q(0.5, 0.62), knee = q(-0.6, -0.5);
      return [[p(w + q(-0.04, 0.06), -1.0), c(0.08, -1.0), c(0.04, knee), p(w * 0.5, knee - 0.06), p(w * 0.92, knee + 0.12), p(w, -0.22), p(w * 0.66, -0.01), p(w * 0.22, -0.02), p(0, -0.14)]];
    },
  },
  {
    glyph: '6', style: 'round', words: 'a six, a curve down into a bowl',
    draw: (q) => {
      const w = q(0.5, 0.62);
      return [[p(w * 0.92, -0.94), p(w * 0.5, -0.99), p(w * 0.15, -0.75), p(0.02, -0.4), p(w * 0.15, -0.07), p(w * 0.52, 0), p(w * 0.92, -0.14), p(w, -0.38), p(w * 0.68, -0.54), p(w * 0.3, -0.5), p(0.05, q(-0.36, -0.26))]];
    },
  },
  {
    glyph: '6', style: 'straight', words: 'a six with a straight back',
    draw: (q) => {
      const w = q(0.5, 0.6);
      return [[p(w * 0.8, -1.0), p(w * 0.22, -0.5), p(0.06, -0.2), p(w * 0.3, -0.01), p(w * 0.74, -0.04), p(w, -0.24), p(w * 0.74, -0.47), p(w * 0.32, -0.45), p(0.1, q(-0.32, -0.24))]];
    },
  },
  {
    glyph: '7', style: 'plain', words: 'a seven',
    draw: (q) => {
      const w = q(0.52, 0.66);
      return [[p(0, -1 + q(-0.02, 0.04)), c(w, -1), p(q(0.12, 0.26), 0)]];
    },
  },
  {
    glyph: '7', style: 'barred', words: 'a seven with a bar across',
    draw: (q) => {
      const w = q(0.52, 0.66), foot = q(0.12, 0.24), bar = q(-0.56, -0.44);
      const at = foot + (w - foot) * (-bar); // where the stroke crosses the bar's height
      return [[p(0, -1 + q(-0.02, 0.04)), c(w, -1), p(foot, 0)], [p(at - q(0.18, 0.26), bar), p(at + q(0.16, 0.24), bar + q(-0.03, 0.03))]];
    },
  },
  {
    glyph: '8', style: 'one', words: 'an eight in one stroke',
    draw: (q) => {
      const w = q(0.46, 0.58), mid = q(-0.56, -0.46);
      return [[p(w * 0.92, -0.86), p(w * 0.66, -1.0), p(w * 0.24, -0.96), p(w * 0.1, -0.8), p(w * 0.3, mid - 0.12), p(w * 0.75, mid + 0.08), p(w, -0.22), p(w * 0.74, -0.01), p(w * 0.28, -0.02), p(0, -0.22), p(w * 0.22, mid + 0.1), p(w * 0.7, mid - 0.1), p(w * 0.92, -0.78), p(w * 0.84, -0.92)]];
    },
  },
  {
    glyph: '8', style: 'two', words: 'an eight as two rings',
    draw: (q) => {
      const w = q(0.46, 0.58), mid = q(-0.54, -0.46);
      return [
        ellipse(w / 2, (-1 + mid) / 2, w * 0.4, (1 + mid) / 2, -Math.PI / 2, -(Math.PI * 2 + 0.15)),
        ellipse(w / 2, mid / 2, w / 2, -mid / 2, -Math.PI / 2, Math.PI * 2 + 0.15),
      ];
    },
  },
  {
    glyph: '9', style: 'straight', words: 'a nine, a ring and a straight stem',
    draw: (q) => {
      const w = q(0.48, 0.6), ry = q(0.24, 0.3);
      const ring = ellipse(w / 2, -1 + ry, w / 2, ry, 0, -Math.PI * 2 - q(0, 0.15));
      ring[ring.length - 1] = c(w, -1 + ry);
      return [[...ring, p(w + q(-0.06, 0), 0)]];
    },
  },
  {
    glyph: '9', style: 'curved', words: 'a nine with a curved tail',
    draw: (q) => {
      const w = q(0.48, 0.6), ry = q(0.24, 0.3);
      const ring = ellipse(w / 2, -1 + ry, w / 2, ry, 0, -Math.PI * 2 - q(0, 0.15));
      ring[ring.length - 1] = c(w, -1 + ry);
      return [[...ring, p(w * 0.98, -0.4), p(w * 0.8, -0.08), p(w * 0.42, 0), p(0.04, -0.08)]];
    },
  },
  // --- signs ---
  {
    glyph: '.', style: 'dot', words: 'a point, a small dot',
    draw: (q) => [dot(q(0.03, 0.06), -0.05, q(0.025, 0.05), false)],
  },
  {
    glyph: '.', style: 'tap', words: 'a point, a touch of the pen',
    draw: (q) => [dot(q(0.02, 0.05), q(-0.04, -0.02), 0.02, true)],
  },
  {
    glyph: '+', style: 'plain', words: 'a plus',
    draw: (q) => {
      const w = q(0.5, 0.7), h = q(0.5, 0.7), at = q(-0.55, -0.45);
      return [[p(0, at), p(w, at + q(-0.03, 0.03))], [p(w / 2 + q(-0.03, 0.03), at - h / 2), p(w / 2, at + h / 2)]];
    },
  },
  {
    glyph: '−', style: 'plain', words: 'a minus',
    draw: (q) => {
      const at = q(-0.56, -0.44);
      return [[p(0, at), p(q(0.4, 0.68), at + q(-0.03, 0.03))]];
    },
  },
  {
    glyph: '×', style: 'plain', words: 'a times sign',
    draw: (q) => {
      const s = q(0.38, 0.54), at = q(-0.54, -0.46);
      return [[p(0, at - s / 2), p(s, at + s / 2)], [p(s, at - s / 2), p(0, at + s / 2)]];
    },
  },
  {
    glyph: '÷', style: 'plain', words: 'a division sign',
    draw: (q) => {
      const w = q(0.5, 0.68), at = q(-0.54, -0.46), d = q(0.18, 0.26), tap = q(0, 1) < 0.5;
      return [[p(0, at), p(w, at)], dot(w / 2, at - d, 0.035, tap), dot(w / 2, at + d, 0.035, tap)];
    },
  },
  {
    glyph: '=', style: 'plain', words: 'an equals sign',
    draw: (q) => {
      const w = q(0.5, 0.7), g = q(0.2, 0.32), at = q(-0.54, -0.46);
      return [[p(0, at - g / 2), p(w, at - g / 2)], [p(q(0, 0.04), at + g / 2), p(w + q(-0.06, 0.04), at + g / 2)]];
    },
  },
  {
    glyph: '(', style: 'plain', words: 'an opening bracket',
    draw: (q) => {
      const b = q(0.22, 0.34), over = q(0.08, 0.16);
      return [[p(b, -1 - over), p(b * 0.3, -0.75), p(0, -0.45), p(b * 0.2, -0.12), p(b, over)]];
    },
  },
  {
    glyph: ')', style: 'plain', words: 'a closing bracket',
    draw: (q) => {
      const b = q(0.22, 0.34), over = q(0.08, 0.16);
      return mirror([[p(b, -1 - over), p(b * 0.3, -0.75), p(0, -0.45), p(b * 0.2, -0.12), p(b, over)]], b);
    },
  },
  {
    glyph: '/', style: 'plain', words: 'a slash',
    draw: (q) => [[p(q(0.5, 0.74), -1 - q(0.02, 0.12)), p(0, q(0.02, 0.1))]],
  },
  {
    glyph: '√', style: 'tick', words: 'a root sign with its tick',
    draw: (q) => {
      const bar = q(0.5, 1.2);
      return [[p(0, -0.42), c(0.1, -0.5), c(0.26, 0.04), c(0.52, -1.1), p(0.52 + bar, -1.1 + q(-0.03, 0.03))]];
    },
  },
  {
    glyph: '√', style: 'plain', words: 'a root sign',
    draw: (q) => {
      const bar = q(0.5, 1.2);
      return [[p(0.02, -0.52), c(0.22, 0.04), c(0.46, -1.1), p(0.46 + bar, -1.1 + q(-0.03, 0.03))]];
    },
  },
  {
    glyph: 'π', style: 'three', words: 'pi in three strokes',
    draw: (q) => {
      const w = q(0.66, 0.82), top = q(-0.7, -0.6);
      return [[p(0, top), p(w, top - 0.04)], [p(w * 0.3, top), p(w * 0.24, 0)], [p(w * 0.7, top), p(w * 0.7, -0.16), p(w * 0.78, 0), p(w * 0.92, -0.05)]];
    },
  },
  {
    glyph: 'π', style: 'two', words: 'pi in two strokes, a leg and the bar together',
    draw: (q) => {
      const w = q(0.66, 0.82), top = q(-0.7, -0.6);
      return [[p(w * 0.2, 0), c(w * 0.28, top), p(w, top - 0.04)], [p(w * 0.7, top), p(w * 0.72, 0)]];
    },
  },
  {
    glyph: 'θ', style: 'barred', words: 'theta, an oval and a bar',
    draw: (q) => {
      const w = q(0.46, 0.62), over = q(0, 0.08);
      return [ellipse(w / 2, -0.5, w / 2, 0.5, -Math.PI / 2 + q(-0.2, 0.2), -(Math.PI * 2 + 0.15), 20), [p(-over, -0.5 + q(-0.04, 0.04)), p(w + over, -0.5)]];
    },
  },
  {
    glyph: 'x', style: 'curly', words: 'x as two curves back to back',
    draw: (q) => {
      const h = q(0.55, 0.68), w = q(0.5, 0.62);
      return [
        [p(0, -h), p(w * 0.3, -h * 0.92), p(w * 0.46, -h / 2), p(w * 0.3, -h * 0.08), p(0, 0)],
        [p(w, -h), p(w * 0.7, -h * 0.92), p(w * 0.54, -h / 2), p(w * 0.7, -h * 0.08), p(w, 0)],
      ];
    },
  },
  {
    glyph: 'x', style: 'crossed', words: 'x as two crossed strokes',
    draw: (q) => {
      const h = q(0.55, 0.68), w = q(0.46, 0.6);
      return [[p(0, -h), p(w, 0)], [p(w, -h), p(0, 0)]];
    },
  },
  {
    glyph: 'y', style: 'straight', words: 'y in two strokes',
    draw: (q) => {
      const h = q(0.55, 0.66), w = q(0.5, 0.62), down = q(0.3, 0.45);
      const meet = { x: w * 0.48, y: -0.04 };
      return [[p(0, -h), p(meet.x, meet.y)], [p(w, -h), p(meet.x - (w - meet.x) * (down + 0.04) / (h - 0.04), down)]];
    },
  },
  {
    glyph: 'y', style: 'curly', words: 'y in one stroke, a cup and a tail',
    draw: (q) => {
      const h = q(0.55, 0.66), w = q(0.5, 0.6), down = q(0.3, 0.42);
      return [[p(0, -h), p(0.04, -h * 0.3), p(w * 0.4, -0.02), p(w * 0.84, -h * 0.25), c(w, -h), p(w * 0.98, down * 0.4), p(w * 0.7, down), p(w * 0.3, down * 0.98), p(0.04, down * 0.7)]];
    },
  },
  {
    glyph: '°', style: 'ring', words: 'a degree sign, a small ring at the top',
    draw: (q) => {
      // A small ring is drawn quickly: rounder or flatter, a little open or over-closed.
      const r = q(0.11, 0.16), squash = q(0.75, 1.25);
      return [ellipse(r, -1 + r * squash, r, r * squash, -Math.PI / 2 + q(-0.4, 0.4), (q(0, 1) < 0.7 ? -1 : 1) * (Math.PI * 2 + q(-0.35, 0.4)), 14)];
    },
  },
  {
    glyph: '′', style: 'tick', words: 'a prime, a tick at the top',
    draw: (q) => [[p(q(0.08, 0.14), -1 - q(0, 0.06)), p(q(0, 0.04), -1 + q(0.24, 0.34))]],
  },
  {
    glyph: '″', style: 'ticks', words: 'a double prime, two ticks at the top',
    draw: (q) => {
      const gap = q(0.1, 0.16), len = q(0.24, 0.34);
      const tick = (x: number): Control[] => [p(x + 0.08, -1 - q(0, 0.04)), p(x + q(0, 0.03), -1 + len)];
      return [tick(0), tick(0.08 + gap)];
    },
  },
  {
    glyph: '%', style: 'plain', words: 'a per cent sign',
    draw: (q) => {
      const w = q(0.56, 0.7), r = q(0.11, 0.15), squash = q(0.85, 1.3);
      return [
        ellipse(r + 0.01, -1 + r * squash + 0.04, r, r * squash, -Math.PI / 2, -(Math.PI * 2 + q(-0.3, 0.3)), 12),
        [p(w, -1.02), p(0, 0.02)],
        ellipse(w - r - 0.01, -r * squash - 0.04, r, r * squash, -Math.PI / 2, -(Math.PI * 2 + q(-0.3, 0.3)), 12),
      ];
    },
  },
];

/** A glyph's styles. */
export function stylesOf(glyph: Glyph): GlyphStyle[] {
  return GLYPH_STYLES.filter((s) => s.glyph === glyph);
}

// ===== Drawing =====

/** A glyph drawn: its strokes in canvas units, and where it stands. */
export interface DrawnGlyph {
  glyph: Glyph;
  style: string;
  strokes: Point[][];
  /** Where the line it was written on stands: its baseline and a digit's height. */
  line: { baseline: number; height: number };
}

const hundredth = (v: number) => Math.round(v * 100) / 100;

/** A smooth pen through control points, broken at corners: a Catmull-Rom walk at `step` units. */
export function penThrough(ctrl: readonly Control[], step: number): Point[] {
  if (ctrl.length === 0) return [];
  if (ctrl.length === 1) return [{ x: ctrl[0].x, y: ctrl[0].y }];
  // Split at corners: each run is smoothed on its own, and a corner is the end of one and the start of the next.
  const runs: Control[][] = [];
  let run: Control[] = [ctrl[0]];
  for (let i = 1; i < ctrl.length; i++) {
    run.push(ctrl[i]);
    if (ctrl[i].c && i < ctrl.length - 1) {
      runs.push(run);
      run = [ctrl[i]];
    }
  }
  runs.push(run);
  const out: Point[] = [];
  for (const r of runs) {
    for (let i = 0; i < r.length - 1; i++) {
      const p0 = r[Math.max(0, i - 1)], p1 = r[i], p2 = r[i + 1], p3 = r[Math.min(r.length - 1, i + 2)];
      const n = Math.max(1, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / step));
      for (let k = out.length === 0 ? 0 : 1; k <= n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        out.push({
          x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
          y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
        });
      }
    }
  }
  return out;
}

export interface DrawOptions {
  seed: number;
  /** A digit's height on the canvas, in canvas units. */
  size?: number;
  /** Where the glyph's left edge stands. */
  x?: number;
  /** The line's baseline. */
  baseline?: number;
}

/** The reader's own samples are drawn at this size: the size drops out of the cloud, the tremor does not. */
export const SAMPLE_SIZE = 40;
/** How far the reader's samples lean, left and right, as a share of the height their top moves across. */
export const SAMPLE_LEAN = [0.06, 0.18] as const;

function place(strokes: Point[][], size: number, x: number, baseline: number): Point[][] {
  return strokes.map((s) => s.map((q) => ({ x: x + q.x * size, y: baseline + q.y * size })));
}

/** A glyph as the reader is taught it: the style's ranges drawn from `seed`, the corpus's tremor. */
export function drawGlyph(style: GlyphStyle, opts: DrawOptions): DrawnGlyph {
  const size = opts.size ?? SAMPLE_SIZE, x = opts.x ?? 0, baseline = opts.baseline ?? 0;
  const r = mulberry32(opts.seed);
  const q: Range = (lo, hi) => lo + (hi - lo) * r();
  const ctrl = style.draw(q);
  // A hand slants, more often to the right: the top leans by up to a fifth of the height.
  const lean = q(-SAMPLE_LEAN[0], SAMPLE_LEAN[1]);
  const strokes = place(ctrl.map((s) => penThrough(s, 1 / 40).map((pt) => ({ x: pt.x - pt.y * lean, y: pt.y }))), size, x, baseline);
  return {
    glyph: style.glyph,
    style: style.style,
    strokes: strokes.map((s, k) => handLike(s, (opts.seed ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0)),
    line: { baseline, height: size },
  };
}

export interface HandOptions extends DrawOptions {
  /** How far a hand pushes each control point, as a share of a digit's height. */
  wobble?: number;
  /** The most it slants (shear) and turns (radians) a glyph, either way. */
  slant?: number;
  turn?: number;
  /** How much wider or narrower than defined, at most, as a share. */
  stretch?: number;
  /** A digitizer's noise, in canvas units, applied to every sample. */
  noise?: number;
  /** Points per canvas unit of path: low is drawn fast, high slowly. */
  density?: number;
}

/** What a hand varies when the bench draws, unless told otherwise. */
export const HAND_DEFAULTS: Required<Omit<HandOptions, keyof DrawOptions>> = {
  wobble: 0.035,
  slant: 0.22,
  turn: 0.1,
  stretch: 0.15,
  noise: 0.6,
  density: 0.8,
};

function resampleBy(points: Point[], spacing: number): Point[] {
  if (points.length < 2) return points.slice();
  const out: Point[] = [points[0]];
  let carry = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    let at = spacing - carry;
    while (at <= d) {
      const t = at / d;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      at += spacing;
    }
    carry = d - (at - spacing);
  }
  const last = points[points.length - 1];
  if (Math.hypot(last.x - out[out.length - 1].x, last.y - out[out.length - 1].y) > spacing * 0.25 || out.length < 2) out.push(last);
  return out;
}

/**
 * A glyph as a careless hand writes it — what the bench reads. The style's
 * ranges from `seed` (never a sample's seed), then every control point pushed
 * about, the glyph slanted, turned and stretched about its foot, its strokes
 * in a shuffled order and some drawn backwards, sampled at the hand's density
 * with the digitizer's noise, and a tremor of its own.
 */
export function handGlyph(style: GlyphStyle, opts: HandOptions): DrawnGlyph {
  const o = { ...HAND_DEFAULTS, ...opts };
  const size = o.size ?? SAMPLE_SIZE, x0 = o.x ?? 0, baseline = o.baseline ?? 0;
  const r = mulberry32(seedOf(`hand:${opts.seed}`));
  const q: Range = (lo, hi) => lo + (hi - lo) * r();
  // Every control point pushed about — a small stroke, a dot, the less: a dot stays a dot.
  const ctrl = style.draw(q).map((s) => {
    const xs = s.map((cp) => cp.x), ys = s.map((cp) => cp.y);
    const k = Math.min(1, Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 0.3);
    return s.map((cp) => ({ ...cp, x: cp.x + (r() - 0.5) * 2 * o.wobble * k, y: cp.y + (r() - 0.5) * 2 * o.wobble * k }));
  });
  const shear = (r() - 0.35) * 2 * o.slant * 0.75; // a hand slants right more often than left
  const turn = (r() - 0.5) * 2 * o.turn;
  const sx = 1 + (r() - 0.5) * 2 * o.stretch;
  const cos = Math.cos(turn), sin = Math.sin(turn);
  const map = (q0: Point): Point => {
    const sxd = q0.x * sx - q0.y * shear; // a positive shear leans the top to the right (y is up the page as it goes negative)
    return { x: sxd * cos - q0.y * sin, y: sxd * sin + q0.y * cos };
  };
  let strokes = ctrl.map((s) => penThrough(s, 1 / 60).map(map));
  // The order and direction a hand happens to use.
  if (strokes.length > 1 && r() < 0.5) strokes = strokes.slice().reverse();
  strokes = strokes.map((s) => (r() < 0.25 ? s.slice().reverse() : s));
  const noise = mulberry32(seedOf(`noise:${opts.seed}`));
  const placed = place(strokes, size, x0, baseline).map((s, k) => {
    const sampled = resampleBy(s, 1 / o.density);
    const shaken = handLike(sampled, seedOf(`tremor:${opts.seed}:${k}`), 1.5 + r() * 1.5);
    return shaken.map((pt) => ({ x: hundredth(pt.x + (noise() - 0.5) * 2 * o.noise), y: hundredth(pt.y + (noise() - 0.5) * 2 * o.noise) }));
  });
  return { glyph: style.glyph, style: style.style, strokes: placed, line: { baseline, height: size } };
}

/** A line of glyphs as a hand writes it, left to right on one baseline. */
export interface HandLine {
  strokes: Point[][];
  /** Which glyph (by its place in the text) each stroke belongs to. */
  glyphOf: number[];
  glyphs: Glyph[];
  line: { baseline: number; height: number };
  /** Where the pen ended: the next glyph's left edge. */
  end: number;
}

/**
 * Write `text` — glyphs of the set, spaces between words — as a hand would, a
 * style chosen per glyph from the seed. `gap` is the room between glyphs as a
 * share of a digit's height.
 */
export function handLine(text: string, opts: HandOptions & { gap?: number; space?: number; styles?: Partial<Record<Glyph, string>> }): HandLine {
  const size = opts.size ?? SAMPLE_SIZE, baseline = opts.baseline ?? 0;
  const gap = (opts.gap ?? 0.26) * size, space = (opts.space ?? 0.7) * size;
  const r = mulberry32(seedOf(`line:${opts.seed}`));
  let x = opts.x ?? 0;
  const out: HandLine = { strokes: [], glyphOf: [], glyphs: [], line: { baseline, height: size }, end: x };
  let k = 0;
  for (const ch of Array.from(text)) {
    if (ch === ' ') {
      x += space;
      continue;
    }
    const styles = stylesOf(ch as Glyph);
    if (!styles.length) throw new Error(`handLine has no glyph ${JSON.stringify(ch)}`);
    const want = opts.styles?.[ch as Glyph];
    const style = (want && styles.find((s) => s.style === want)) || styles[Math.floor(r() * styles.length)];
    const g = handGlyph(style, { ...opts, seed: seedOf(`${opts.seed}:${k}:${ch}`), x: 0, baseline, size });
    let minX = Infinity, maxX = -Infinity;
    for (const s of g.strokes) for (const pt of s) { if (pt.x < minX) minX = pt.x; if (pt.x > maxX) maxX = pt.x; }
    const dx = x - minX;
    for (const s of g.strokes) {
      out.strokes.push(s.map((pt) => ({ x: hundredth(pt.x + dx), y: pt.y })));
      out.glyphOf.push(out.glyphs.length);
    }
    out.glyphs.push(style.glyph);
    x += maxX - minX + gap;
    k++;
  }
  out.end = x;
  return out;
}

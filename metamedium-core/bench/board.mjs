// Synthetic boards for the performance baseline (V1-PLAN.md §9 R4a; PERF.md).
//
//     node metamedium-core/bench/board.mjs 2000            # stats for a 2,000-mark board
//     node metamedium-core/bench/board.mjs 2000 --hands=3  # the same board drawn by three hands
//     node metamedium-core/bench/board.mjs 500 --replay    # …and replay it once, reading the result
//
// A board is built from a SEED, deterministically: same seed, same log, byte
// for byte. The generator is saved, never the boards (a 5,000-mark log is
// ~20 MB of JSON, and a committed one would drift from the engine that reads it).
//
// What a board is. A "mark" is one stroke of ink in the log — what replay
// applies, what the hand made. The strokes are the shape rung's own
// vocabulary drawn by `strokeFor` (the same function a model draws with),
// then made hand-like: started anywhere on a closed shape, overshot or left a
// little short, tilted a few degrees, resampled to a hand's density (a point
// every 2–5 px, which is what a pointer at 60–120 Hz leaves; John's recorded
// strokes carry 80–140 points each at full double precision), wobbled along
// the normal, and given sensor noise. Writing is printed capitals, one to
// three strokes a letter, at John's size (x-height 31–40 px, at zoom 1), a
// few hundred milliseconds apart, so the session gathers them into words the
// way it gathers his.
//
// The board is small diagrams laid out over a large canvas, the way a board
// fills up in use: flowcharts (boxes joined by arrows, some labelled),
// molecules (circles joined by lines), notes (lines of writing), page
// wireframes (a container with regions inside), hubs (a centre joined to
// satellites) and doodles (a triangle, a stray line, an arrow at something,
// now and then scratched out). A few groups are blessed as definitions (so
// later ones like them are matched and chipped), a few written words become
// text artifacts the way `writingToText` makes them (a model's transcript,
// then bless and `code` of kind text), a model answers about a few groups,
// and now and then a group is moved or drawn clean.
//
// How it is built. Each diagram is drawn in a small session of its own that
// already knows the log's name and the number to continue from, so every
// event carries the same authorship — and so mints the same ids — that it
// would carry drawn on the full board (ids per hand, SURFACE-v10-PLAN D8).
// Diagrams are far apart in space and at least three seconds apart in time,
// so nothing one does can reach another: a word never gathers across two, a
// scratch never crosses into the next. That is what lets a 5,000-mark board be
// written in seconds, and the replay that reads it be the thing measured.

import { args } from './lib.mjs';

export const SIZES = [500, 2000, 5000];
/** 26 Sep 2026, 09:00 UTC — the board's first event. */
export const T0 = Date.UTC(2026, 8, 26, 9, 0, 0);
/** The share of strokes that are writing, which the region mix steers toward. */
export const WRITING_SHARE = 0.38;

/** mulberry32 — the same tiny PRNG as `src/test/strokes.ts`. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ===== Making a clean stroke hand-like =====================================

function boundsOf(pts) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

/** Resample along the path, a point every `spacing(u)` px (u is 0..1 along it). */
function resampleAlong(pts, spacing) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const L = cum[cum.length - 1];
  if (!(L > 0)) return pts.map((p) => ({ x: p.x, y: p.y }));
  const out = [{ x: pts[0].x, y: pts[0].y }];
  let d = spacing(0);
  let j = 1;
  while (d < L) {
    while (j < cum.length - 1 && cum[j] < d) j++;
    const seg = cum[j] - cum[j - 1];
    const t = seg > 0 ? (d - cum[j - 1]) / seg : 0;
    out.push({ x: pts[j - 1].x + (pts[j].x - pts[j - 1].x) * t, y: pts[j - 1].y + (pts[j].y - pts[j - 1].y) * t });
    d += spacing(d / L);
  }
  const last = pts[pts.length - 1];
  out.push({ x: last.x, y: last.y });
  return out;
}

/**
 * A clean stroke, drawn by a hand: where it starts, whether it quite closes,
 * how it leans, how densely it samples, how it wobbles.
 */
export function handify(points, rand, { closed = false, tilt = 3, spacing = [2.5, 4.5], wobble } = {}) {
  let pts = points.map((p) => ({ x: p.x, y: p.y }));
  const b0 = boundsOf(pts);
  const size = Math.max(b0.maxX - b0.minX, b0.maxY - b0.minY, 1);
  if (closed && pts.length > 8) {
    const first = pts[0], last = pts[pts.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y) < 1e-6) pts.pop();
    // A hand starts a loop anywhere.
    const k = Math.floor(rand() * pts.length);
    pts = pts.slice(k).concat(pts.slice(0, k));
    const r = rand();
    // Distances along the loop, never point counts: the clean polyline is not
    // evenly spaced (a box's long sides carry the same count as its short ones).
    const along = (list, px) => {
      const out = [list[0]];
      let d = 0;
      for (let i = 1; i < list.length && d < px; i++) {
        d += Math.hypot(list[i].x - list[i - 1].x, list[i].y - list[i - 1].y);
        out.push(list[i]);
      }
      return out;
    };
    if (r < 0.5) {
      // …and carries on a little past where it began (a few to 25 px),
      const past = Math.min(size * (0.02 + 0.04 * rand()), 25);
      pts = pts.concat(along(pts.concat([pts[0]]), past));
    } else if (r < 0.85) {
      // …or lifts a little short of it, well inside what the engine calls closed,
      const gapPx = Math.min(size * (0.015 + 0.035 * rand()), 25);
      const back = along(pts.slice().reverse(), gapPx).length - 1;
      pts = pts.slice(0, Math.max(6, pts.length - back));
    } else {
      pts.push({ x: pts[0].x, y: pts[0].y }); // …or meets it exactly.
    }
  }
  // A hand leans.
  const th = ((rand() * 2 - 1) * tilt * Math.PI) / 180;
  const cx = (b0.minX + b0.maxX) / 2, cy = (b0.minY + b0.maxY) / 2;
  const c = Math.cos(th), s = Math.sin(th);
  pts = pts.map((p) => ({ x: cx + (p.x - cx) * c - (p.y - cy) * s, y: cy + (p.x - cx) * s + (p.y - cy) * c }));
  // A pointer samples at 60–120 Hz, and the hand's speed varies along a stroke.
  const [lo, hi] = spacing;
  const base = lo + (hi - lo) * rand();
  const f = 1 + 2 * rand(), ph = rand() * 6.283;
  pts = resampleAlong(pts, (u) => base * (1 + 0.3 * Math.sin(6.283 * f * u + ph)));
  // It wobbles along the normal, a little, and the sensor adds noise.
  const A = wobble ?? Math.min(2.2, Math.max(0.35, size * 0.011));
  const f1 = 1 + 2.5 * rand(), f2 = 3 + 4 * rand(), p1 = rand() * 6.283, p2 = rand() * 6.283;
  const n = pts.length;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], z = pts[Math.min(n - 1, i + 1)];
    let nx = -(z.y - a.y), ny = z.x - a.x;
    const len = Math.hypot(nx, ny) || 1;
    nx /= len; ny /= len;
    const u = i / Math.max(1, n - 1);
    const d = A * (0.7 * Math.sin(6.283 * f1 * u + p1) + 0.3 * Math.sin(6.283 * f2 * u + p2));
    out[i] = { x: pts[i].x + nx * d + (rand() - 0.5) * 0.9, y: pts[i].y + ny * d + (rand() - 0.5) * 0.9 };
  }
  return out;
}

// ===== Printed capitals =====================================================
// Each letter is its strokes in a unit box (u across, v down), drawn the way a
// hand prints them. `w` is the letter's width as a fraction of its height.

const LETTERS = {
  A: { w: 0.7, s: [[[0, 1], [0.5, 0], [1, 1]], [[0.22, 0.62], [0.78, 0.62]]] },
  C: { w: 0.65, arc: [0.14, 0.86] },
  D: { w: 0.65, s: [[[0, 0], [0, 1]], [[0, 0], [0.55, 0], [1, 0.3], [1, 0.7], [0.55, 1], [0, 1]]] },
  E: { w: 0.6, s: [[[1, 0], [0, 0], [0, 1], [1, 1]], [[0, 0.5], [0.8, 0.5]]] },
  H: { w: 0.7, s: [[[0, 0], [0, 1]], [[1, 0], [1, 1]], [[0, 0.5], [1, 0.5]]] },
  I: { w: 0.08, s: [[[0.5, 0], [0.5, 1]]] },
  K: { w: 0.65, s: [[[0, 0], [0, 1]], [[1, 0], [0, 0.55], [1, 1]]] },
  L: { w: 0.55, s: [[[0, 0], [0, 1], [1, 1]]] },
  M: { w: 0.85, s: [[[0, 1], [0, 0], [0.5, 0.65], [1, 0], [1, 1]]] },
  N: { w: 0.7, s: [[[0, 1], [0, 0], [1, 1], [1, 0]]] },
  O: { w: 0.8, circle: true },
  P: { w: 0.6, s: [[[0, 1], [0, 0], [0.75, 0], [1, 0.25], [0.75, 0.5], [0, 0.5]]] },
  R: { w: 0.65, s: [[[0, 1], [0, 0], [0.75, 0], [1, 0.25], [0.75, 0.5], [0, 0.5]], [[0.35, 0.5], [1, 1]]] },
  S: { w: 0.6, s: [[[1, 0.12], [0.6, 0], [0.15, 0.08], [0.05, 0.3], [0.5, 0.5], [0.95, 0.7], [0.85, 0.93], [0.4, 1], [0, 0.88]]] },
  T: { w: 0.7, s: [[[0, 0], [1, 0]], [[0.5, 0], [0.5, 1]]] },
  U: { w: 0.65, s: [[[0, 0], [0, 0.75], [0.2, 1], [0.8, 1], [1, 0.75], [1, 0]]] },
  V: { w: 0.7, s: [[[0, 0], [0.5, 1], [1, 0]]] },
  W: { w: 0.95, s: [[[0, 0], [0.25, 1], [0.5, 0.35], [0.75, 1], [1, 0]]] },
  X: { w: 0.65, s: [[[0, 0], [1, 1]], [[1, 0], [0, 1]]] },
  Z: { w: 0.65, s: [[[0, 0], [1, 0], [0, 1], [1, 1]]] },
};

const WORDS = [
  'NAME', 'MAIN', 'LINK', 'TIME', 'HELLO', 'LINE', 'MENU', 'TEXT', 'NOTE', 'DATA', 'LOAD', 'SAVE',
  'VIEW', 'ZOOM', 'NODE', 'HOME', 'UNDO', 'REDO', 'PRICE', 'SIZE', 'AREA', 'UNIT', 'PLAN', 'IDEA',
  'TASK', 'DONE', 'MODEL', 'INK', 'DRAW', 'WORD', 'ROW', 'SUM', 'TOTAL', 'START', 'END', 'INPUT',
  'OUTPUT', 'USER', 'LIST', 'ITEM', 'CART', 'SEARCH', 'WIDTH', 'STORE', 'CODE', 'MAP', 'ZONE', 'RATE',
  'COST', 'CLICK', 'MOTOR', 'TRAIN', 'NEXT', 'MORE', 'EDIT', 'SEND', 'READ', 'WRITE', 'SPACE', 'TIDE',
];

// ===== The pen: one diagram's session, and the clock =======================

class Pen {
  constructor(core, session, rand, at, budget) {
    this.core = core;
    this.s = session;
    this.rand = rand;
    this.at = at;
    this.budget = budget;
    this.count = 0;
    this.writing = 0;
    /** What each stroke was meant to be, for the reading check. */
    this.intended = new Map();
    /** Every word written here that the session gathered: { wordId, text }. */
    this.wordsMade = [];
  }
  get left() { return this.budget - this.count; }
  r(lo, hi) { return lo + (hi - lo) * this.rand(); }
  ri(lo, hi) { return Math.floor(this.r(lo, hi + 1)); }
  pick(list) { return list[Math.floor(this.rand() * list.length)]; }
  wait(lo, hi) { this.at += Math.round(this.r(lo, hi)); }

  stroke(points, kind) {
    if (this.count >= this.budget || !points || points.length < 2) return null;
    const id = this.s.addStroke(points, this.at, undefined, 1);
    this.count++;
    if (kind === 'letter') this.writing++;
    this.intended.set(id, kind);
    return id;
  }

  /** A shape from the rung's vocabulary, drawn by hand. */
  shape(kind, spec) {
    this.wait(650, 1500);
    const { strokeFor } = this.core;
    const clean = strokeFor({ shape: kind, ...spec });
    if (!clean) return null;
    const closed = kind === 'rectangle' || kind === 'circle' || kind === 'triangle';
    const opts = kind === 'arrow'
      ? { tilt: 1.5, spacing: [2, 3.5], wobble: 0.6 }
      : { closed, tilt: closed ? 3 : 2, spacing: [2.2, 4.5] };
    return this.stroke(handify(clean, this.rand, opts), kind);
  }
  box(x, y, w, h) { return this.shape('rectangle', { x, y, w, h }); }
  circle(cx, cy, r) { return this.shape('circle', { x: cx - r, y: cy - r, w: r * 2, h: r * 2 }); }
  triangle(x, y, w, h) { return this.shape('triangle', { x, y, w, h }); }
  line(a, b) { return this.shape('line', { from: a, to: b }); }
  arrow(a, b) { return this.shape('arrow', { from: a, to: b }); }

  /** One printed letter at (x, y), cap height h. Returns its width. */
  letter(ch, x, y, h) {
    const L = LETTERS[ch];
    if (!L) return h * 0.5;
    const w = h * L.w;
    const { strokeFor } = this.core;
    const strokes = [];
    if (L.circle) {
      strokes.push({ pts: strokeFor({ shape: 'circle', x, y, w, h }), closed: true });
    } else if (L.arc) {
      const full = strokeFor({ shape: 'circle', x, y, w: w * 1.2, h });
      const n = full.length - 1;
      strokes.push({ pts: full.slice(Math.round(n * L.arc[0]), Math.round(n * L.arc[1]) + 1), closed: false });
    } else {
      for (const poly of L.s) {
        const pts = [];
        for (let i = 1; i < poly.length; i++) {
          const a = { x: x + poly[i - 1][0] * w, y: y + poly[i - 1][1] * h };
          const b = { x: x + poly[i][0] * w, y: y + poly[i][1] * h };
          const seg = strokeFor({ shape: 'line', from: a, to: b });
          if (seg) pts.push(...(i > 1 ? seg.slice(1) : seg));
        }
        if (pts.length >= 2) strokes.push({ pts, closed: false });
      }
    }
    for (const st of strokes) {
      this.wait(170, 380);
      this.stroke(handify(st.pts, this.rand, { closed: st.closed, tilt: 4, spacing: [1.6, 2.8], wobble: 0.35 }), 'letter');
    }
    return w;
  }

  /** A printed word at (x, y). Returns its width and the word node the session gathered, if it did. */
  word(text, x, y, h) {
    this.wait(350, 800);
    let cx = x;
    const before = this.count;
    let firstId = null;
    for (const ch of text) {
      const w = this.letter(ch, cx, y + this.r(-1.5, 1.5), h * this.r(0.94, 1.06));
      if (firstId === null && this.count > before) firstId = this.lastId();
      cx += w + h * this.r(0.18, 0.32);
    }
    let wordId = null;
    if (firstId) {
      const n = this.s.getState().nodes.get(firstId);
      const e = n && n.edges.find((x) => x.rel === 'part-of' && !x.blessed);
      if (e && this.core.isWord(this.s.getState().nodes.get(e.to))) wordId = e.to;
    }
    if (wordId) this.wordsMade.push({ wordId, text });
    return { width: cx - x, wordId, text };
  }

  /** Words in a line, left to right. */
  words(list, x, y, h) {
    let cx = x;
    const out = [];
    for (const t of list) {
      const w = this.word(t, cx, y, h);
      out.push(w);
      cx += w.width + h * this.r(0.95, 1.35);
    }
    return { width: cx - x, words: out };
  }

  lastId() {
    const evs = this.s.getEvents();
    for (let i = evs.length - 1; i >= 0; i--) {
      if (evs[i].type === 'stroke') return `stroke:${evs[i].origin}:${evs[i].seq}`;
    }
    return null;
  }

  // --- the acts that are not ink ---

  bless(ids, name) {
    const live = ids.filter(Boolean);
    if (live.length < 2) return null;
    this.wait(900, 2000);
    const sid = this.s.summonMarks(live, this.at);
    if (!sid) return null;
    this.wait(1200, 3000);
    return this.s.bless({ summonId: sid, name, at: this.at });
  }

  /** Writing taken as text, the way `writingToText` does it, after a model read it. */
  text(wordId, text, modelId) {
    if (!wordId) return null;
    if (modelId) {
      this.wait(800, 2000);
      this.s.propose({
        participantId: modelId,
        nodeId: wordId,
        edges: [],
        reps: [{ modality: 'transcript', data: { text }, confidence: 0.91 }],
        at: this.at,
      });
    }
    this.wait(900, 2200);
    const sid = this.s.summonMarks([wordId], this.at);
    if (!sid) return null;
    this.wait(800, 1600);
    const id = this.s.bless({ summonId: sid, name: text, at: this.at });
    if (!id) return null;
    this.s.attachCode({ participantId: this.core.LOCAL_PARTICIPANT, nodeId: id, kind: 'text', code: text, from: 'writing', at: this.at + 1 });
    this.s.deselect(this.at + 2);
    this.at += 3;
    return id;
  }

  answer(aboutIds, modelId, text) {
    const about = aboutIds.filter(Boolean);
    if (!modelId || !about.length) return null;
    this.wait(1500, 4000);
    return this.s.answer({ participantId: modelId, question: 'what is this?', text, aboutIds: about, at: this.at });
  }

  move(ids, dx, dy) {
    const live = ids.filter(Boolean);
    if (!live.length) return;
    this.wait(800, 1600);
    const sid = this.s.summonMarks(live, this.at);
    if (!sid) return;
    this.wait(600, 1400);
    this.s.move({ ids: live, dx, dy, at: this.at });
    this.wait(300, 900);
    this.s.dismiss(sid, this.at);
  }

  snap(ids) {
    const live = ids.filter(Boolean);
    if (!live.length) return;
    this.wait(700, 1500);
    this.s.snap({ ids: live, at: this.at });
  }
}

// ===== The diagrams =========================================================
// Each is drawn inside a cell about 720 × 520 at (x, y). `act` says which of
// the rarer acts this diagram should also carry; each returns the ids an act
// could be about.

const REGIONS = {
  flow(p, x, y, act, label) {
    const n = p.ri(3, 5);
    const vertical = p.rand() < 0.3;
    const w = p.r(100, 150), h = p.r(58, 86), gap = p.r(55, 95);
    const boxes = [];
    const at = [];
    for (let i = 0; i < n; i++) {
      const bx = vertical ? x + p.r(-6, 6) : x + i * (w + gap) * (vertical ? 0 : 1) + p.r(-4, 4);
      const by = vertical ? y + i * (h + gap) + p.r(-4, 4) : y + p.r(-8, 8);
      const bw = w * p.r(0.9, 1.1), bh = h * p.r(0.9, 1.1);
      if (vertical && by + bh > y + 520) break;
      if (!vertical && bx + bw > x + 720) break;
      boxes.push(p.box(bx, by, bw, bh));
      at.push({ x: bx, y: by, w: bw, h: bh });
      if (label(0.3)) p.word(p.pick(WORDS).slice(0, p.ri(3, 5)), bx + 12, by + bh / 2 - 17, p.r(30, 38));
    }
    // The hand stops writing and starts connecting — a pause longer than the
    // words window, or the first arrow is read as one more letter of the last label.
    p.wait(3200, 5500);
    const arrows = [];
    for (let i = 1; i < at.length; i++) {
      const a = at[i - 1], b = at[i];
      const from = vertical ? { x: a.x + a.w / 2, y: a.y + a.h + 3 } : { x: a.x + a.w + 3, y: a.y + a.h / 2 };
      const to = vertical ? { x: b.x + b.w / 2, y: b.y - 3 } : { x: b.x - 3, y: b.y + b.h / 2 };
      arrows.push(p.arrow(from, to));
    }
    if (act.move) p.move(boxes.slice(0, 2), p.r(-20, 20), p.r(-15, 15));
    if (act.snap) p.snap(boxes);
    return { group: boxes.concat(arrows), shapes: boxes };
  },

  molecule(p, x, y, act, label) {
    const r = p.r(22, 34), step = r * p.r(2.6, 3.4);
    const cy = y + p.r(80, 200);
    const c = [];
    for (let i = 0; i < 3; i++) c.push(p.circle(x + 60 + i * step, cy + p.r(-4, 4), r * p.r(0.92, 1.08)));
    const bonds = [];
    for (let i = 1; i < 3; i++) bonds.push(p.line({ x: x + 60 + (i - 1) * step + r + 2, y: cy }, { x: x + 60 + i * step - r - 2, y: cy + p.r(-3, 3) }));
    if (label(0.25)) p.word(p.pick(WORDS).slice(0, p.ri(3, 5)), x + 40, cy + r + 40, p.r(30, 38));
    if (act.snap) p.snap(c);
    return { group: c.concat(bonds), shapes: c };
  },

  note(p, x, y, act) {
    const lines = p.ri(2, 3);
    const h = p.r(31, 40);
    const words = [];
    for (let i = 0; i < lines; i++) {
      p.wait(600, 1400);
      const ws = [];
      const k = p.ri(2, 3);
      for (let j = 0; j < k; j++) ws.push(p.pick(WORDS));
      words.push(...p.words(ws, x + 20 + p.r(-6, 6), y + 40 + i * h * p.r(1.9, 2.3), h).words);
    }
    return { group: [], shapes: [], words };
  },

  page(p, x, y, act, label) {
    const W = p.r(320, 420), H = p.r(240, 320);
    const outer = p.box(x, y, W, H);
    const pad = 16;
    const header = p.box(x + pad, y + pad, W - 2 * pad, H * 0.18);
    const colW = (W - 3 * pad) / 2, colY = y + pad * 2 + H * 0.18, colH = H * 0.5;
    const left = p.box(x + pad, colY, colW * p.r(0.85, 1), colH);
    const right = p.box(x + pad * 2 + colW, colY, colW * p.r(0.85, 1), colH);
    const footer = p.rand() < 0.7 ? p.box(x + pad, colY + colH + pad, W - 2 * pad, H - (colY - y) - colH - 2 * pad) : null;
    if (label(0.35)) p.word(p.pick(WORDS).slice(0, 4), x + pad + 14, y + pad + 8, p.r(28, 34));
    if (label(0.2)) p.word(p.pick(WORDS).slice(0, 4), x + pad + 10, colY + 14, p.r(28, 34));
    const inner = [header, left, right, footer].filter(Boolean);
    if (act.move) p.move([outer, ...inner], p.r(-24, 24), p.r(-18, 18));
    if (act.snap) p.snap([outer, ...inner]);
    return { group: [outer, ...inner], shapes: [outer, ...inner] };
  },

  hub(p, x, y, act, label) {
    const cx = x + p.r(300, 380), cy = y + p.r(220, 280);
    const centre = p.circle(cx, cy, p.r(36, 48));
    const k = p.ri(3, 5);
    const sats = [], spokes = [];
    for (let i = 0; i < k; i++) {
      const a = (i / k) * 6.283 + p.r(-0.25, 0.25);
      const R = p.r(160, 210);
      const sx = cx + Math.cos(a) * R, sy = cy + Math.sin(a) * R * 0.8;
      const round = p.rand() < 0.6;
      const r = p.r(22, 32);
      sats.push(round ? p.circle(sx, sy, r) : p.box(sx - r * 1.4, sy - r, r * 2.8, r * 2));
      spokes.push(p.line({ x: cx + Math.cos(a) * 48, y: cy + Math.sin(a) * 40 }, { x: sx - Math.cos(a) * (r + 4), y: sy - Math.sin(a) * (r + 4) }));
      if (label(0.2)) p.word(p.pick(WORDS).slice(0, 3), sx - 30, sy + r + 12, p.r(28, 34));
    }
    return { group: [centre, ...sats, ...spokes], shapes: [centre, ...sats] };
  },

  doodle(p, x, y, act) {
    const out = [];
    const k = p.ri(3, 6);
    let lastLine = null, lastLineAt = null;
    for (let i = 0; i < k; i++) {
      const px = x + p.r(0, 560), py = y + p.r(0, 380);
      const kind = p.pick(['triangle', 'triangle', 'line', 'circle', 'arrow', 'box']);
      if (kind === 'triangle') out.push(p.triangle(px, py, p.r(50, 110), p.r(45, 95)));
      else if (kind === 'circle') out.push(p.circle(px + 40, py + 40, p.r(18, 50)));
      else if (kind === 'box') out.push(p.box(px, py, p.r(60, 140), p.r(40, 100)));
      else if (kind === 'arrow') out.push(p.arrow({ x: px, y: py }, { x: px + p.r(80, 170), y: py + p.r(-60, 60) }));
      else {
        const a = { x: px, y: py }, b = { x: px + p.r(90, 200), y: py + p.r(-30, 30) };
        lastLine = p.line(a, b);
        lastLineAt = { a, b };
        out.push(lastLine);
      }
    }
    if (act.scratch && lastLine && lastLineAt) {
      // Rubbed out: a zigzag back and forth across the line, four passes.
      p.wait(900, 1800);
      const { a, b } = lastLineAt;
      const pts = [];
      const passes = 5;
      for (let i = 0; i <= passes; i++) {
        const t = 0.2 + (0.6 * i) / passes;
        const side = i % 2 === 0 ? -1 : 1;
        pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t + side * p.r(14, 22) });
      }
      const { strokeFor } = p.core;
      const dense = [];
      for (let i = 1; i < pts.length; i++) {
        const seg = strokeFor({ shape: 'line', from: pts[i - 1], to: pts[i] });
        if (seg) dense.push(...(i > 1 ? seg.slice(1) : seg));
      }
      p.stroke(handify(dense, p.rand, { tilt: 1, spacing: [4, 7], wobble: 0.5 }), 'scratch');
    }
    return { group: out, shapes: out };
  },
};

const DEFINITION_NAMES = { molecule: 'molecule', hub: 'hub', page: 'wireframe', flow: 'pipeline', doodle: 'sketch' };

/**
 * A board of `marks` strokes, from `seed`, written by `hands` (each a log
 * name). Returns the merged log (`events`, as a reader with no log of its own
 * would merge it), each hand's own log, and what was made.
 */
export function generateBoard(core, { marks, seed = 1, hands = ['local'], model = true, collectMarks = false } = {}) {
  const { createSession, DEFAULT_SESSION_CONFIG, mergeLogs } = core;
  const rand = rng(seed * 7919 + marks);
  const seqs = new Map(hands.map((h) => [h, 0]));
  const logs = Object.fromEntries(hands.map((h) => [h, []]));
  let t = T0;

  // The first hand has a model joined — it reads writing and answers.
  let preamble = [];
  let modelId = null;
  if (model) {
    const s = createSession({ ...DEFAULT_SESSION_CONFIG, logName: hands[0] });
    modelId = s.join('agent', 'qwen3:8b', t, 2, 'local');
    preamble = s.getEvents().slice();
    logs[hands[0]].push(...preamble);
    seqs.set(hands[0], preamble[preamble.length - 1].seq);
    t += 4000;
  }

  const perDiagram = 16;
  const estimate = Math.max(4, Math.round(marks / perDiagram));
  const cols = Math.max(2, Math.ceil(Math.sqrt(estimate * 1.35)));
  const CELL = { w: 820, h: 620 };
  const quota = (per) => Math.max(2, Math.round(marks / per));
  const want = { definitions: quota(400), texts: quota(400), answers: Math.max(1, Math.round(marks / 500)) };
  const done = { definitions: 0, texts: 0, answers: 0, moves: 0, snaps: 0, scratches: 0 };
  const stats = {
    marks: 0, writing: 0, diagrams: {}, intended: {}, confusion: {}, words: 0, lettersInWords: 0,
    definitions: [], texts: [], answers: 0,
  };
  // The content plane, diagram by diagram: nothing one diagram does reaches
  // another, so their final content planes together ARE the whole board's —
  // what `relate` is handed on every event (session.ts markOf), with no replay.
  const contentMarks = [];

  let r = 0;
  let strokes = 0;
  while (strokes < marks) {
    const hand = hands[r % hands.length];
    const left = marks - strokes;
    const share = strokes ? stats.writing / strokes : 0;
    const wantWriting = share < WRITING_SHARE;
    // The mix leans toward writing or toward shapes to hold the share near
    // WRITING_SHARE, and a small remainder is filled with doodles.
    let kind;
    if (left < 12) kind = 'doodle';
    else {
      const weights = wantWriting
        ? { flow: 3, molecule: 1.5, note: 1.4, page: 1.5, hub: 1.5, doodle: 0.8 }
        : { flow: 3, molecule: 2.2, note: 0.1, page: 1.5, hub: 1.5, doodle: 1.6 };
      let total = 0;
      for (const w of Object.values(weights)) total += w;
      let pick = rand() * total;
      for (const [k, w] of Object.entries(weights)) { pick -= w; if (pick <= 0) { kind = k; break; } }
      kind = kind || 'flow';
    }

    const col = r % cols, row = Math.floor(r / cols);
    const x = col * CELL.w + rand() * 60, y = row * CELL.h + rand() * 50;

    // The rarer acts, spread evenly over the board by where it has got to.
    const due = (what, per) => done[what] < want[what] && strokes >= ((done[what] + 0.5) * marks) / want[what];
    const act = {
      bless: (kind === 'molecule' || kind === 'hub' || kind === 'page' || kind === 'flow') && due('definitions'),
      text: kind !== 'doodle' && due('texts'),
      answer: hand === hands[0] && due('answers'),
      move: (kind === 'flow' || kind === 'page') && rand() < 1 / 10,
      snap: rand() < 1 / 8,
      scratch: kind === 'doodle' && rand() < 1 / 5,
    };

    const s = createSession({ ...DEFAULT_SESSION_CONFIG, logName: hand });
    const before = seqs.get(hand);
    s.load([...preamble, { type: 'tick', at: t - 1, origin: hand, seq: before }]);
    const skip = preamble.length + 1;
    const pen = new Pen(core, s, rand, t, left);
    const label = (p) => rand() < (wantWriting ? p * 1.25 : p * 0.35);
    const made = REGIONS[kind](pen, x, y, act, label);

    if (act.bless && made.group.filter(Boolean).length >= 2) {
      const base = DEFINITION_NAMES[kind];
      const same = stats.definitions.filter((d) => d.startsWith(base)).length;
      const name = same ? `${base} ${same + 1}` : base;
      const id = pen.bless(made.group, name);
      if (id) { done.definitions++; stats.definitions.push(name); }
    }
    if (act.text && pen.wordsMade.length) {
      const w = pen.wordsMade[0];
      {
        const id = pen.text(w.wordId, w.text, hand === hands[0] ? modelId : null);
        if (id) { done.texts++; stats.texts.push(w.text); }
      }
    }
    if (act.answer && made.group.filter(Boolean).length) {
      const id = pen.answer(made.group.slice(0, 4), modelId, `This reads as a ${kind}: ${made.group.filter(Boolean).length} marks that hang together.`);
      if (id) { done.answers++; stats.answers++; }
    }
    if (act.move) done.moves++;
    if (act.snap) done.snaps++;
    if (act.scratch) done.scratches++;

    // What the diagram's session made, and how its strokes read.
    const st = s.getState();
    for (const [id, want] of pen.intended) {
      const n = st.nodes.get(id);
      const top = n ? core.resemblances(n)[0] : null;
      const got = n && core.getRep(n, 'gesture') ? 'gesture' : top ? top.to.replace(/^type:/, '') : 'none';
      stats.intended[want] = (stats.intended[want] || 0) + 1;
      const key = `${want}→${got}`;
      stats.confusion[key] = (stats.confusion[key] || 0) + 1;
    }
    for (const n of st.nodes.values()) {
      if (core.isWord(n) && !n.reps.some((x) => x.modality === 'status')) {
        stats.words++;
        stats.lettersInWords += core.lettersOf(n).length;
      }
    }

    if (collectMarks) {
      for (const id of st.contentIds) {
        const n = st.nodes.get(id);
        const b = n && core.boundsOf(n);
        if (!b) continue;
        const fp = core.fingerprintOf(n);
        contentMarks.push({ id, bounds: b, points: core.strokePointsOf(n) ?? undefined, closed: fp ? fp.isClosed : undefined });
      }
    }
    const evs = s.getEvents().slice(skip);
    logs[hand].push(...evs);
    if (evs.length) seqs.set(hand, evs[evs.length - 1].seq);
    strokes += pen.count;
    stats.writing += pen.writing;
    stats.diagrams[kind] = (stats.diagrams[kind] || 0) + 1;
    t = pen.at + Math.round(4000 + rand() * 40000);
    r++;
  }

  stats.marks = strokes;
  stats.acts = done;
  const events = hands.length === 1 ? logs[hands[0]].slice() : mergeLogs(logs);
  const types = {};
  for (const ev of events) types[ev.type] = (types[ev.type] || 0) + 1;
  stats.events = events.length;
  stats.types = types;
  stats.bytes = JSON.stringify(events).length;
  const bb = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  let points = 0;
  for (const ev of events) {
    if (ev.type !== 'stroke') continue;
    points += ev.points.length;
    for (const q of ev.points) {
      if (q.x < bb.minX) bb.minX = q.x;
      if (q.x > bb.maxX) bb.maxX = q.x;
      if (q.y < bb.minY) bb.minY = q.y;
      if (q.y > bb.maxY) bb.maxY = q.y;
    }
  }
  stats.pointsPerStroke = points / Math.max(1, strokes);
  stats.extent = { w: Math.round(bb.maxX - bb.minX), h: Math.round(bb.maxY - bb.minY) };
  stats.spanMinutes = Math.round((t - T0) / 60000);
  return { events, logs, stats, contentMarks: collectMarks ? contentMarks : null };
}

/** How the strokes read, as one line per intended kind: `rectangle 96% rectangle, 3% circle`. */
export function describeReadings(stats) {
  const out = [];
  for (const [want, n] of Object.entries(stats.intended).sort((a, b) => b[1] - a[1])) {
    const got = Object.entries(stats.confusion)
      .filter(([k]) => k.startsWith(want + '→'))
      .map(([k, c]) => [k.split('→')[1], c])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([g, c]) => `${Math.round((100 * c) / n)}% ${g}`)
      .join(', ');
    out.push(`${want} ×${n}: ${got}`);
  }
  return out;
}

/**
 * Draw `marks` more strokes on a session that already holds a board: the next
 * diagrams, in a fresh column beside it, by the board's own hand, a few
 * seconds after its last event — "one more stroke at the end". No rarer acts
 * (nothing is blessed, moved or rubbed out), so every event timed is a stroke.
 * `onStroke(kind, ms)` hears what each `addStroke` cost, as the host sees it:
 * readings, relations, words, wires, the scratch test, the clusters and the
 * state handed to subscribers.
 */
export function extendBoard(core, session, { marks, seed = 99, onStroke } = {}) {
  const rand = rng(seed);
  const st = session.getState();
  let maxX = -Infinity, minY = Infinity;
  for (const id of st.contentIds) {
    const b = core.boundsOf(st.nodes.get(id));
    if (!b) continue;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.minY < minY) minY = b.minY;
  }
  const evs = session.getEvents();
  let at = (evs.length ? evs[evs.length - 1].at || T0 : T0) + 5000;
  // Timed at the door the surface calls: the same call, the same state handed back.
  const timed = {
    ...session,
    addStroke: (...a) => {
      const t = performance.now();
      const id = session.addStroke(...a);
      last = { id, ms: performance.now() - t };
      return id;
    },
  };
  let last = null;
  const kinds = ['flow', 'molecule', 'note', 'hub', 'doodle', 'page'];
  let drawn = 0, i = 0;
  const x0 = (Number.isFinite(maxX) ? maxX : 0) + 400, y0 = Number.isFinite(minY) ? minY : 0;
  while (drawn < marks) {
    const pen = new Pen(core, timed, rand, at, marks - drawn);
    const wrap = pen.stroke.bind(pen);
    pen.stroke = (points, kind) => {
      const id = wrap(points, kind);
      if (id && last && last.id === id && onStroke) onStroke(kind, last.ms);
      return id;
    };
    const kind = kinds[i % kinds.length];
    REGIONS[kind](pen, x0 + (i % 2) * 820, y0 + Math.floor(i / 2) * 620, {}, (p) => rand() < p);
    drawn += pen.count;
    at = pen.at + 6000;
    i++;
  }
  return drawn;
}

// ===== CLI ==================================================================

if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  const a = args();
  const marks = Number(a._[0] || 500);
  const hands = a.hands ? Array.from({ length: Number(a.hands) }, (_, i) => `hand${String.fromCharCode(97 + i)}~bench`) : ['local'];
  const { loadCore } = await import('./lib.mjs');
  const { core } = await loadCore(a.core || 'bundle');
  const t0 = performance.now();
  const { events, stats } = generateBoard(core, { marks, seed: Number(a.seed || 1), hands });
  const genMs = performance.now() - t0;
  console.log(`board: ${stats.marks} marks, ${stats.events} events, ${(stats.bytes / 1048576).toFixed(1)} MB of JSON, ${stats.pointsPerStroke.toFixed(0)} points a stroke, ${stats.extent.w} × ${stats.extent.h} px, ${stats.spanMinutes} min of drawing — generated in ${Math.round(genMs)} ms`);
  console.log(`  writing ${(100 * stats.writing / stats.marks).toFixed(0)}% of strokes · ${stats.words} words from ${stats.lettersInWords} letters (${(100 * stats.lettersInWords / Math.max(1, stats.writing)).toFixed(0)}% of letter strokes)`);
  console.log(`  diagrams ${JSON.stringify(stats.diagrams)}`);
  console.log(`  events ${JSON.stringify(stats.types)}`);
  console.log(`  definitions ${stats.definitions.join(', ')} · texts ${stats.texts.join(', ')} · answers ${stats.answers} · acts ${JSON.stringify(stats.acts)}`);
  for (const l of describeReadings(stats)) console.log('  ' + l);
  if (a.replay) {
    const s = core.createSession();
    const t1 = performance.now();
    s.load(events);
    const st = s.getState();
    console.log(`replayed in ${Math.round(performance.now() - t1)} ms: ${st.contentIds.length} on the content plane, ${st.artifacts.length} artifacts, ${st.live.length} live, ${st.explanations.length} answers, ${st.clusterCandidates.length} matched groups`);
  }
}

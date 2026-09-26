// MetaMedium, explained — a program on the canvas.
//
// This file is the body of a function of `mm` (kind `run`; the harness is in
// Demos/surface/13-kinds.js). It draws into mm.ctx, steps on mm.onFrame,
// takes the hand through mm.onPointer, and reports its parts with mm.report,
// so ink drawn over this frame lands on what the frame is showing.
//
// It is an ILLUSTRATION of the loop, not the engine: the sandbox a program
// runs in cannot reach the engine, so the readings in the story are the kind
// the engine gives, set by hand. The last scene measures the viewer's own
// stroke for real, and says plainly that the canvas outside this frame is
// where a mark is read.
//
// Every scene is a pure function of its own clock, so scrubbing is exact.
// Tap to step on; drag along the bar to scrub.

const W = mm.width, H = mm.height, ctx = mm.ctx;

// The harness sizes its canvas in frame pixels; hold it at the screen's density.
const DPR = Math.min(2, window.devicePixelRatio || 1);
const cv = ctx.canvas;
cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
cv.style.width = W + 'px'; cv.style.height = H + 'px';

// Authored at 960 × 540 and fitted to whatever frame the hand drew.
const DW = 960, DH = 540;
const S = Math.min(W / DW, H / DH), OX = (W - DW * S) / 2, OY = (H - DH * S) / 2;

// The dark set of brand/tokens.css — the canvas ground. A program's frame is
// clear, and this one is a screen on the board, so it carries its own ground.
const C = {
  ground: '#131315', plate: '#1a1a1d', well: '#0d0d0f', edge: '#2b2b2f',
  ink: '#e7e5e0', ink2: '#b5b3ad', ink3: '#86847e', ink4: '#5d5b56',
  teal: '#6fb3b8', tealDeep: '#93cbcf',
  read: '#8aa7c9', held: '#86847e', mid: '#c2a86a', model: '#a99bc4',
  hand: '#e3edf1', ghost: '#55686f', clean: '#5b9bea', offer: '#4fb3bf',
};
const FONT = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

// ---------------------------------------------------------------------------
// Small arithmetic
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (u, a, b) => clamp((u - a) / (b - a), 0, 1);
const eOut = (t) => 1 - Math.pow(1 - t, 3);
const eInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const eBack = (t) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
/** In over a..b, out over c..d. */
const fade = (u, a, b, c, d) => Math.min(prog(u, a, b), 1 - prog(u, c, d));
function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}

// ---------------------------------------------------------------------------
// Ink as a hand leaves it. Seeded, so the same drawing every time.
function rng(seed) {
  let s = (Math.imul(seed | 0, 2654435761) >>> 0) || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}
function wob(seed) {
  const r = rng(seed), a = [r() * 6.283, r() * 6.283, r() * 6.283], f = [1.3 + r(), 3 + r() * 2, 7 + r() * 3];
  return (t) => Math.sin(t * f[0] + a[0]) * 0.6 + Math.sin(t * f[1] + a[1]) * 0.3 + Math.sin(t * f[2] + a[2]) * 0.12;
}
function stroke(pts) {
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return { pts, L, len: L[L.length - 1] };
}
/** Round, a little uneven, and passing its own start — as circles are drawn. */
function handCircle(cx, cy, r, seed, start, over) {
  const w = wob(seed), pts = [], N = 96, a0 = start == null ? -2.2 : start, sweep = Math.PI * 2 + (over == null ? 0.2 : over);
  for (let i = 0; i <= N; i++) {
    const t = i / N, a = a0 + sweep * t, rr = r * (1 + 0.045 * w(t * 6.283));
    pts.push({ x: cx + Math.cos(a) * rr * 1.02, y: cy + Math.sin(a) * rr * 0.98 });
  }
  return stroke(pts);
}
function handLine(x0, y0, x1, y1, seed, bow) {
  const w = wob(seed), pts = [], N = 36, dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l, ny = dx / l, b = bow == null ? 0.03 : bow;
  for (let i = 0; i <= N; i++) {
    const t = i / N, off = Math.sin(Math.PI * t) * l * b + w(t * 5) * 1.3;
    pts.push({ x: x0 + dx * t + nx * off, y: y0 + dy * t + ny * off });
  }
  return stroke(pts);
}
/** Any polygon in one stroke — a box drawn from a corner, or the command mark. */
function handPoly(corners, seed, closed) {
  const w = wob(seed), pts = [], seq = corners.slice();
  if (closed) seq.push({ x: corners[0].x + 3, y: corners[0].y + 2 });
  for (let k = 1; k < seq.length; k++) {
    const a = seq[k - 1], b = seq[k], N = 18, dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
    for (let i = k === 1 ? 0 : 1; i <= N; i++) {
      const t = i / N, off = w(k * 3 + t * 4) * 1.5;
      pts.push({ x: a.x + dx * t - (dy / l) * off, y: a.y + dy * t + (dx / l) * off });
    }
  }
  return stroke(pts);
}
function handBox(x0, y0, x1, y1, seed) {
  return handPoly([{ x: x0, y: y0 }, { x: x1, y: y0 + 1 }, { x: x1 - 1, y: y1 }, { x: x0 + 1, y: y1 - 1 }], seed, true);
}
/** A lasso: looser than a circle, and it overshoots more. */
function handLoop(cx, cy, rx, ry, seed) {
  const w = wob(seed), pts = [], N = 110, a0 = -2.6, sweep = Math.PI * 2 + 0.45;
  for (let i = 0; i <= N; i++) {
    const t = i / N, a = a0 + sweep * t, k = 1 + 0.06 * w(t * 6.283);
    pts.push({ x: cx + Math.cos(a) * rx * k, y: cy + Math.sin(a) * ry * k });
  }
  return stroke(pts);
}
/** The command mark: down to a sharp elbow, then a longer flick up. */
function handCheck(x, y, s, seed) {
  return handPoly([{ x: x - s * 0.42, y: y - s * 0.12 }, { x: x - s * 0.1, y: y + s * 0.3 }, { x: x + s * 0.5, y: y - s * 0.55 }], seed, false);
}

/** Draw the first `frac` of a stroke by length; a pen dot rides the tip while it is drawn. */
function ink(st, frac, color, width, alpha, dash) {
  if (frac <= 0 || alpha <= 0) return null;
  const target = st.len * clamp(frac, 0, 1), p = st.pts, L = st.L;
  ctx.save();
  ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y);
  let tip = p[0];
  for (let i = 1; i < p.length; i++) {
    if (L[i] <= target) { ctx.lineTo(p[i].x, p[i].y); tip = p[i]; continue; }
    const k = (target - L[i - 1]) / (L[i] - L[i - 1] || 1);
    tip = { x: lerp(p[i - 1].x, p[i].x, k), y: lerp(p[i - 1].y, p[i].y, k) };
    ctx.lineTo(tip.x, tip.y);
    break;
  }
  ctx.stroke();
  ctx.restore();
  if (frac < 1) pen(tip.x, tip.y, alpha);
  return tip;
}
function pen(x, y, a) {
  ctx.save();
  const g = ctx.createRadialGradient(x, y, 0, x, y, 22);
  g.addColorStop(0, rgba(C.teal, 0.28 * a)); g.addColorStop(1, rgba(C.teal, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 22, 0, 7); ctx.fill();
  ctx.fillStyle = rgba(C.hand, a); ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Type and furniture
function font(s, w) { return (w || 400) + ' ' + s + 'px ' + FONT; }
function txt(s, x, y, o) {
  o = o || {};
  if ((o.a == null ? 1 : o.a) <= 0) return 0;
  ctx.save();
  ctx.globalAlpha = o.a == null ? 1 : o.a;
  ctx.fillStyle = o.c || C.ink; ctx.font = font(o.s || 14, o.w);
  ctx.textAlign = o.al || 'left'; ctx.textBaseline = o.bl || 'alphabetic';
  ctx.fillText(s, x, y);
  const m = ctx.measureText(s).width;
  ctx.restore();
  return m;
}
function measure(s, size, w) { ctx.save(); ctx.font = font(size, w); const m = ctx.measureText(s).width; ctx.restore(); return m; }
function wrap(s, size, maxW) {
  const words = s.split(' '), lines = [];
  let line = '';
  for (const wd of words) {
    const next = line ? line + ' ' + wd : wd;
    if (measure(next, size) > maxW && line) { lines.push(line); line = wd; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}
function rrect(x, y, w, h, r) {
  r = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
/**
 * A reading as the canvas shows one: a label and its number. `held` is a
 * proposal nobody has taken (dashed, quiet); `blessed` is one a hand took.
 */
function chip(label, num, x, y, o) {
  o = o || {};
  const a = o.a == null ? 1 : o.a;
  if (a <= 0) return 0;
  const col = o.c || C.read, size = o.s || 12;
  const lw = measure(label, size, 500), nw = num ? measure(num, size) + 8 : 0;
  const w = lw + nw + 20, h = size + 12, x0 = o.al === 'center' ? x - w / 2 : o.al === 'right' ? x - w : x;
  ctx.save();
  ctx.globalAlpha = a;
  rrect(x0, y - h / 2, w, h, h / 2);
  ctx.fillStyle = o.held ? rgba(C.ground, 0.9) : rgba(col, o.blessed ? 0.26 : 0.14); ctx.fill();
  ctx.strokeStyle = rgba(col, o.held ? 0.7 : 0.75); ctx.lineWidth = 1;
  if (o.held) ctx.setLineDash([3, 3]);
  ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = col; ctx.font = font(size, 500); ctx.textBaseline = 'middle';
  ctx.fillText(label, x0 + 10, y + 0.5);
  if (num) { ctx.fillStyle = rgba(col, 0.75); ctx.font = font(size); ctx.fillText(num, x0 + 10 + lw + 8, y + 0.5); }
  ctx.restore();
  return w;
}
/** The selection a loop dissolves into: a dashed outline, corner handles, a knob. */
function selection(x0, y0, x1, y1, a) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a; ctx.strokeStyle = C.teal; ctx.lineWidth = 1; ctx.setLineDash([5, 4]);
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0); ctx.setLineDash([]);
  ctx.fillStyle = C.ground;
  for (const [hx, hy] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) { ctx.fillRect(hx - 4, hy - 4, 8, 8); ctx.strokeRect(hx - 4, hy - 4, 8, 8); }
  const mx = (x0 + x1) / 2;
  ctx.beginPath(); ctx.moveTo(mx, y0); ctx.lineTo(mx, y0 - 16); ctx.stroke();
  ctx.beginPath(); ctx.arc(mx, y0 - 20, 4, 0, 7); ctx.fill(); ctx.stroke();
  ctx.restore();
}
/** The field that opens at the pen tip: what you type, and what Enter will do. */
function field(x, y, typed, u, reading, pills, a) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  rrect(x, y, 250, 34, 8); ctx.fillStyle = C.plate; ctx.fill();
  ctx.strokeStyle = rgba(C.teal, 0.6); ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
  const tw = txt(typed, x + 12, y + 22, { s: 14, c: C.ink, a });
  if (Math.floor(u * 2.2) % 2 === 0) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = C.teal; ctx.fillRect(x + 14 + tw, y + 9, 1.5, 17); ctx.restore(); }
  if (reading) txt(reading, x + 4, y + 52, { s: 11, c: C.ink3, a });
  let px = x + 4;
  for (const p of pills || []) px += chip(p[0], p[1], px, y + 74, { s: 11, c: p[2] || C.read, a, held: p[3] }) + 6;
  part('field', x, y, 250, 86);
}
/** A pointer that comes to a place and presses it. */
function press(x, y, u, at) {
  const inA = prog(u, at - 0.6, at - 0.1), out = 1 - prog(u, at + 0.5, at + 0.9);
  const a = Math.min(inA, out);
  if (a <= 0) return;
  const px = lerp(x + 60, x, eOut(inA)), py = lerp(y + 50, y, eOut(inA));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(px, py, 9, 0, 7); ctx.stroke();
  const r = prog(u, at, at + 0.5);
  if (r > 0 && r < 1) { ctx.globalAlpha = a * (1 - r); ctx.strokeStyle = C.teal; ctx.beginPath(); ctx.arc(x, y, 9 + r * 22, 0, 7); ctx.stroke(); }
  ctx.restore();
}
/** A dashed leader between a mark and what is said about it. */
function leader(x0, y0, x1, y1, col, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.restore();
}
function swatch(x, y, col, w, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 22, y); ctx.stroke(); ctx.restore();
}
function smallcaps(s, x, y, a, c) { return txt(s.toUpperCase(), x, y, { s: 10, c: c || C.ink3, a, w: 500 }); }

// ---------------------------------------------------------------------------
// Parts: named places, reported to the canvas so ink over the frame lands on
// them. The harness keeps every part it was ever told about and has no way to
// withdraw one, so a part not on screen this frame is moved far off instead.
// Not to an empty rect at the origin: the canvas hit-tests by overlap, and a
// loop drawn round the whole frame starts left of and above that corner — it
// would have claimed every scene's parts at once.
const seen = new Set(), now = new Map(), GONE = -1e6;
function part(name, x, y, w, h) { now.set(name, [OX + x * S, OY + y * S, w * S, h * S]); }
function reportParts() {
  for (const [name, r] of now) { mm.report(name, r[0], r[1], r[2], r[3]); seen.add(name); }
  for (const name of seen) if (!now.has(name)) mm.report(name, GONE, GONE, 0, 0);
  now.clear();
}

// ---------------------------------------------------------------------------
// The drawing the story is told with. Built once, the same every time.
const CX = 280, CY = 250, R = 105;
const MARK = handCircle(CX, CY, R, 7, -2.3, 0.14);
const CLEAN = (() => { const p = []; for (let i = 0; i <= 120; i++) { const a = -Math.PI / 2 + (i / 120) * Math.PI * 2; p.push({ x: CX + Math.cos(a) * R, y: CY + Math.sin(a) * R }); } return stroke(p); })();

function molecule(cx, cy, sc, rot, seed) {
  const base = [{ x: -140, y: -55 }, { x: 0, y: 55 }, { x: 140, y: -55 }], r0 = 38;
  const cs = Math.cos(rot), sn = Math.sin(rot), r = r0 * sc;
  const c = base.map((p) => ({ x: cx + (p.x * cs - p.y * sn) * sc, y: cy + (p.x * sn + p.y * cs) * sc }));
  const circles = c.map((p, i) => handCircle(p.x, p.y, r, seed + i * 11, -2 + i * 0.7));
  const edge = (a, b, s) => {
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l;
    return handLine(a.x + ux * (r + 7), a.y + uy * (r + 7), b.x - ux * (r + 7), b.y - uy * (r + 7), s, 0.02);
  };
  const lines = [edge(c[0], c[1], seed + 50), edge(c[1], c[2], seed + 60)];
  const xs = c.map((p) => p.x), ys = c.map((p) => p.y);
  return { c, r, circles, lines, box: [Math.min(...xs) - r, Math.min(...ys) - r, Math.max(...xs) + r, Math.max(...ys) + r] };
}
const MA = molecule(290, 250, 1, 0, 101);
const MB = molecule(575, 262, 1.18, -0.36, 202);
const LOOP = handLoop(290, 250, 222, 128, 303);
const CHECK = handCheck(488, 338, 62, 404);

/** Draw a molecule's strokes up to a point in its own drawing order. */
function drawMolecule(m, parts, col, alpha, width) {
  const order = [m.circles[0], m.circles[1], m.circles[2], m.lines[0], m.lines[1]];
  for (let i = 0; i < order.length; i++) ink(order[i], parts[i] == null ? 1 : parts[i], col, width || 2.4, alpha);
}

// The page the last drawing becomes.
const BOX = {
  header: [92, 118, 470, 164],
  left: [92, 178, 252, 330],
  right: [266, 178, 470, 330],
  footer: [92, 344, 470, 380],
};
const BOXES = Object.keys(BOX).map((k, i) => handBox(BOX[k][0], BOX[k][1], BOX[k][2], BOX[k][3], 600 + i * 17));
const LOOP2 = handLoop(281, 249, 222, 162, 707);
const CHECK2 = handCheck(492, 372, 56, 808);
const REGION_LOOP = handLoop(178, 141, 78, 20, 909);

// ---------------------------------------------------------------------------
// The scenes. Each is a pure function of its own clock `u`, in seconds.
function sTitle(u) {
  const a = fade(u, 0, 0.8, 3.4, 4);
  ctx.save(); ctx.font = font(64, 500);
  const mw = ctx.measureText('Meta').width, dw = ctx.measureText('Medium').width;
  ctx.restore();
  const x0 = 480 - (mw + dw) / 2;
  txt('Meta', x0, 238, { s: 64, w: 500, c: C.teal, a });
  txt('Medium', x0 + mw, 238, { s: 64, w: 500, c: C.ink, a });
  const tag = 'drawing as the interface to AI';
  txt(tag.slice(0, Math.round(tag.length * prog(u, 0.6, 1.8))), 480, 282, { s: 16, c: C.ink3, al: 'center', a });
  ink(handLine(x0 + 4, 262, x0 + mw + dw - 6, 258, 11, 0.015), eInOut(prog(u, 1.0, 2.1)), C.teal, 2.2, a * 0.8);
  txt('tap to step on  ·  drag the bar to scrub', 480, 356, { s: 12, c: C.ink4, al: 'center', a: Math.min(a, prog(u, 1.8, 2.4)) });
  part('title', x0, 180, mw + dw, 110);
}

function sInk(u) {
  const f = eInOut(prog(u, 0.3, 2.5));
  ink(MARK, f, C.hand, 2.6, 1);
  // The points the machine is given — every one of them, as they arrive.
  const shown = Math.round(MARK.pts.length * prog(u, 1.9, 3.3));
  ctx.save(); ctx.fillStyle = C.teal;
  for (let i = 0; i < shown; i++) { const p = MARK.pts[i]; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0, 7); ctx.fill(); }
  ctx.restore();
  const a = prog(u, 1.9, 2.4);
  smallcaps('what the machine is given', 600, 150, a);
  txt(String(shown), 600, 210, { s: 44, w: 500, c: C.teal, a });
  txt('points', 600 + measure(String(shown), 44, 500) + 10, 210, { s: 14, c: C.ink3, a });
  for (let i = 0; i < 6; i++) {
    const p = MARK.pts[i * 3];
    txt('(' + Math.round(p.x) + ', ' + Math.round(p.y) + ')', 600, 248 + i * 20, { s: 12, c: C.ink4, a: Math.min(a, prog(u, 2.2 + i * 0.15, 2.5 + i * 0.15)) });
  }
  txt('…', 600, 248 + 6 * 20, { s: 12, c: C.ink4, a: prog(u, 3.2, 3.5) });
  part('mark', CX - R, CY - R, R * 2, R * 2);
  part('points', 590, 130, 260, 260);
  cap(u, [[0.2, 99, 'You draw. To a machine, a mark is only points.']]);
}

const PRINT = [
  ['closure', 0.97, 'closed — gap 3% of its size'],
  ['straightness', 0.05, 'curves the whole way'],
  ['corners', 0, 'no sharp turns'],
  ['extent', 0.79, 'fills 79% of its box'],
  ['aspect', 0.51, 'as wide as it is tall', '1.02'],
];
function fingerprint(u, a, dim) {
  smallcaps('fingerprint', 600, 130, a);
  for (let i = 0; i < PRINT.length; i++) {
    const [k, v, why, shown] = PRINT[i], t = prog(u, 0.5 + i * 0.7, 1.1 + i * 0.7), y = 162 + i * 50;
    const ra = Math.min(a, t) * (dim || 1);
    txt(k, 600, y, { s: 13, c: C.ink2, a: ra, w: 500 });
    ctx.save(); ctx.globalAlpha = ra;
    ctx.fillStyle = C.edge; ctx.fillRect(600, y + 9, 200, 4);
    ctx.fillStyle = C.teal; ctx.fillRect(600, y + 9, 200 * (k === 'corners' ? 0 : v) * eOut(t), 4);
    ctx.restore();
    txt(k === 'corners' ? '0' : shown ? (parseFloat(shown) * eOut(t)).toFixed(2) : (v * eOut(t)).toFixed(2), 812, y + 14, { s: 12, c: C.teal, a: ra });
    txt(why, 600, y + 31, { s: 11, c: C.ink4, a: ra });
  }
  part('fingerprint', 590, 115, 320, 260);
}
function sMeasure(u) {
  ink(MARK, 1, C.hand, 2.6, 1);
  // The box it is measured against: the tightest at any angle.
  const bx = prog(u, 0.3, 0.9);
  if (bx > 0) { ctx.save(); ctx.globalAlpha = bx * 0.8; ctx.strokeStyle = C.ink4; ctx.setLineDash([4, 5]); ctx.strokeRect(CX - R - 6, CY - R - 6, R * 2 + 12, R * 2 + 12); ctx.restore(); }
  // Where it starts and where it ends: the gap closure is measured from.
  const g = fade(u, 0.5, 1.0, 5.5, 6.5), s = MARK.pts[0], e = MARK.pts[MARK.pts.length - 1];
  if (g > 0) {
    ctx.save(); ctx.globalAlpha = g; ctx.strokeStyle = C.teal; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(s.x, s.y, 6, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(e.x, e.y, 6, 0, 7); ctx.stroke();
    ctx.restore();
    txt('start · end', s.x - 14, s.y - 14, { s: 11, c: C.teal, a: g, al: 'right' });
  }
  // Extent, shown as what it is: the share of the box the mark encloses.
  const ex = fade(u, 3.2, 3.8, 5.2, 6);
  if (ex > 0) {
    ctx.save(); ctx.globalAlpha = ex * 0.14; ctx.fillStyle = C.teal; ctx.beginPath();
    MARK.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  fingerprint(u, 1);
  part('mark', CX - R, CY - R, R * 2, R * 2);
  cap(u, [[0.2, 99, 'It is measured along its path, not its pixels — so how fast you drew, or how far you zoomed, does not change what it is.']]);
}

const READINGS = [
  ['circle', 0.86, 'closed, round, fills 79% of its box'],
  ['arc', 0.34, 'curves evenly — but it closes'],
  ['rectangle', 0.12, 'fills too little of its box'],
];
function readings(u, a, only) {
  smallcaps('read as', 600, 130, a);
  const n = only || READINGS.length;
  for (let i = 0; i < n; i++) {
    const [k, v, why] = READINGS[i], t = only ? 1 : prog(u, 0.4 + i * 0.8, 1.0 + i * 0.8), y = 166 + i * 58, ra = Math.min(a, t);
    const col = i === 0 ? C.read : C.held;
    txt(k, 600, y, { s: 15, w: 500, c: col, a: ra });
    ctx.save(); ctx.globalAlpha = ra; ctx.fillStyle = C.edge; ctx.fillRect(600, y + 9, 220, 5);
    ctx.fillStyle = col; ctx.fillRect(600, y + 9, 220 * v * eOut(t), 5); ctx.restore();
    txt((v * eOut(t)).toFixed(2), 832, y + 15, { s: 13, c: col, a: ra });
    txt(why, 600, y + 34, { s: 11, c: C.ink4, a: ra });
  }
  part('readings', 590, 115, 320, 60 + n * 58);
}
function sRead(u) {
  ink(MARK, 1, C.hand, 2.6, 1);
  readings(u, 1);
  // All of them kept: a bracket down the side of the ranking.
  const b = prog(u, 2.9, 3.4);
  if (b > 0) {
    ctx.save(); ctx.globalAlpha = b; ctx.strokeStyle = C.ink4; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(588, 152); ctx.lineTo(582, 152); ctx.lineTo(582, 152 + 250 * eOut(b) * 0.75); ctx.lineTo(588, 152 + 250 * eOut(b) * 0.75); ctx.stroke(); ctx.restore();
  }
  txt('all kept, ranked', 600, 346, { s: 11, c: C.ink3, a: prog(u, 3.1, 3.6) });
  txt('never 1.0 — a flawless circle is also the letter O', 600, 368, { s: 11, c: C.ink4, a: prog(u, 4.2, 4.8) });
  chip('circle', '0.86', CX, CY + R + 26, { al: 'center', a: prog(u, 1.2, 1.6) });
  part('mark', CX - R, CY - R, R * 2, R * 2);
  cap(u, [[0.2, 99, 'Every reading that fits is kept, ranked by what was measured. Nothing wins by silencing the rest.']]);
}

function sClean(u) {
  // The ink stays; it is simply no longer in front.
  const g = prog(u, 1.9, 2.8);
  ink(MARK, 1, g > 0 ? C.ghost : C.hand, lerp(2.6, 2, g), lerp(1, 0.9, g));
  const offer = fade(u, 0.3, 0.9, 1.9, 2.3);
  ink(CLEAN, 1, C.offer, 1.6, offer * 0.9, [6, 6]);
  chip('draw it clean', '', CX + R + 20, CY + 40, { c: C.offer, a: fade(u, 0.6, 1.0, 2.0, 2.4) });
  press(CX + R + 70, CY + 40, u, 1.6);
  ink(CLEAN, eInOut(prog(u, 1.9, 2.8)), C.clean, 2.6, 1);
  readings(u, fade(u, 0, 0.3, 99, 100), 1);
  swatch(600, 245, C.clean, 2.6, prog(u, 2.8, 3.2));
  txt('clean form, in front', 632, 250, { s: 13, c: C.ink2, a: prog(u, 2.8, 3.2) });
  swatch(600, 271, C.ghost, 2, prog(u, 3.0, 3.4));
  txt('your ink, beneath it', 632, 276, { s: 13, c: C.ink2, a: prog(u, 3.0, 3.4) });
  txt('undo springs it back exactly', 600, 310, { s: 11, c: C.ink4, a: prog(u, 3.4, 3.9) });
  part('mark', CX - R, CY - R, R * 2, R * 2);
  part('clean-form', CX - R, CY - R, R * 2, R * 2);
  cap(u, [[0.2, 99, 'A confident reading can be redrawn in front of your ink. Your ink is never replaced.']]);
}

// Where "bubble" is kept once it is named, and the vocabulary shelf it joins.
const SHELF = { x: 600, y: 420 };
function shelf(words, a) {
  const any = Math.max(0, ...words.map((w) => w[2]));
  if (a <= 0 || any <= 0) return;
  smallcaps('your vocabulary', SHELF.x, SHELF.y - 12, Math.min(a, any));
  let x = SHELF.x;
  for (const [w, sub, t] of words) {
    const ra = Math.min(a, t);
    if (ra <= 0) continue;
    x += chip(w, sub, x, SHELF.y + 12, { c: C.teal, blessed: true, a: ra }) + 8;
  }
  part('vocabulary', SHELF.x - 6, SHELF.y - 26, x - SHELF.x + 12, 52);
}
function sName(u) {
  // Held: press, and the mark is taken up with a selection around it.
  const fly = eInOut(prog(u, 3.6, 5.0));
  const scale = lerp(1, 0.16, fly), tx = lerp(CX, SHELF.x + 18, fly), ty = lerp(CY, SHELF.y + 12, fly);
  const ringP = prog(u, 0.2, 0.8);
  if (ringP > 0 && ringP < 1) { ctx.save(); ctx.globalAlpha = 1 - ringP; ctx.strokeStyle = C.teal; ctx.beginPath(); ctx.arc(CX + R * 0.72, CY + R * 0.7, 6 + ringP * 26, 0, 7); ctx.stroke(); ctx.restore(); }
  ctx.save();
  ctx.translate(tx, ty); ctx.scale(scale, scale); ctx.translate(-CX, -CY);
  ink(MARK, 1, C.ghost, 2, 0.9 * (1 - prog(u, 3.6, 4.2)));
  ink(CLEAN, 1, C.clean, 2.6 / Math.max(scale, 0.4), 1 - prog(u, 4.7, 5.0));
  ctx.restore();
  selection(CX - R - 14, CY - R - 14, CX + R + 14, CY + R + 14, fade(u, 0.5, 0.8, 2.6, 2.9));
  const typed = 'bubble'.slice(0, Math.round(6 * prog(u, 1.2, 2.0)));
  field(CX + R + 30, CY + 30, typed, u, typed.length === 6 ? 'Enter names it' : 'type a name, or tap a reading', [['circle', '0.86'], ['draw it clean', '', C.offer]], fade(u, 0.9, 1.2, 2.6, 2.9));
  // The name, on the mark and then on the shelf.
  const tagA = fade(u, 2.7, 3.0, 3.6, 4.0);
  chip('bubble', '', CX, CY - R - 26, { c: C.teal, blessed: true, al: 'center', a: tagA, s: 13 });
  shelf([['bubble', '', prog(u, 4.8, 5.2)]], 1);
  if (fly < 1) part('mark', tx - R * scale, ty - R * scale, R * 2 * scale, R * 2 * scale);
  cap(u, [
    [0.2, 3.4, 'You name it — in the field that opens where your pen is.'],
    [3.4, 99, 'Your word is now the canvas’s word.'],
  ]);
}

function sCompose(u) {
  const m = MA;
  const t = [prog(u, 0.2, 0.9), prog(u, 1.0, 1.7), prog(u, 1.8, 2.5), prog(u, 2.7, 3.2), prog(u, 3.3, 3.8)].map(eInOut);
  const lassoGone = prog(u, 7.1, 7.4);
  drawMolecule(m, t, C.hand, 1);
  // Each circle is already a word the canvas holds.
  for (let i = 0; i < 3; i++) {
    const a = fade(u, 0.95 + i * 0.8, 1.25 + i * 0.8, 3.9, 4.3);
    chip('bubble', '0.91', m.c[i].x, m.c[i].y + m.r + 20, { al: 'center', a, s: 11 });
  }
  // What joins them: measured, and said where it holds.
  for (let i = 0; i < 2; i++) {
    const ln = m.lines[i].pts, mid = ln[Math.floor(ln.length / 2)], a0 = ln[0], b0 = ln[ln.length - 1];
    const l = Math.hypot(b0.x - a0.x, b0.y - a0.y) || 1;
    // The normal that points away from the circles the line joins (out of the V).
    let nx = -(b0.y - a0.y) / l, ny = (b0.x - a0.x) / l;
    if (ny < 0) { nx = -nx; ny = -ny; }
    const a = fade(u, 3.9 + i * 0.25, 4.3 + i * 0.25, 9.6, 10);
    txt('connects', mid.x + nx * 20, mid.y + ny * 20 + 4, { s: 11, c: C.mid, a, al: 'center' });
    txt('edge', mid.x + nx * 36, mid.y + ny * 36 + 4, { s: 10, c: C.ink4, a: Math.min(a, prog(u, 4.5, 4.9)), al: 'center' });
  }
  for (let i = 0; i < 3; i++) txt('node', m.c[i].x, m.c[i].y + m.r + 24, { s: 10, c: C.ink4, al: 'center', a: fade(u, 4.5, 4.9, 9.6, 10) });
  chip('flow', '0.90', 290, m.box[1] - 34, { al: 'center', c: C.read, a: fade(u, 4.9, 5.3, 5.8, 6.2) });
  txt('3 nodes joined by 2 edges', 290, m.box[1] - 10, { s: 11, c: C.ink3, al: 'center', a: fade(u, 5.0, 5.4, 5.8, 6.2) });
  // Circle them, and cross the loop with the command mark.
  ink(LOOP, eInOut(prog(u, 5.8, 6.7)), C.hand, 1.8, 1 - lassoGone);
  ink(CHECK, eInOut(prog(u, 6.75, 7.1)), C.hand, 2.4, 1 - lassoGone);
  selection(m.box[0] - 16, m.box[1] - 16, m.box[2] + 16, m.box[3] + 30, fade(u, 7.2, 7.5, 8.6, 8.9));
  const typed = 'molecule'.slice(0, Math.round(8 * prog(u, 7.5, 8.2)));
  field(505, 250, typed, u, typed.length === 8 ? 'Enter names it' : 'a name, a verb, or a brief', [['flow', '0.90'], ['line up', '', C.offer]], fade(u, 7.35, 7.6, 8.6, 8.9));
  chip('molecule', '', 290, m.box[1] - 34, { c: C.teal, blessed: true, al: 'center', a: prog(u, 8.7, 9.0), s: 13 });
  shelf([['bubble', '', 1], ['molecule', '3 bubble · 2 line', prog(u, 9.0, 9.4)]], 1);
  part('molecule', m.box[0], m.box[1], m.box[2] - m.box[0], m.box[3] - m.box[1]);
  cap(u, [
    [0.2, 3.9, 'Names compose. Each circle is already a bubble.'],
    [3.9, 5.8, 'What joins them is measured, never declared.'],
    [5.8, 99, 'Circle them, cross the loop with a check, and name the group.'],
  ]);
}

/** Molecule A, shrunk into the corner with its name: what the canvas now knows. */
function knownA(k, a) {
  const s = lerp(1, 0.5, k), cx = lerp(290, 150, k), cy = lerp(250, 196, k);
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-290, -250);
  drawMolecule(MA, [], C.hand, a, 2.4 / Math.max(s, 0.6));
  ctx.restore();
  chip('molecule', '', cx, cy - 62 * s - 26, { c: C.teal, blessed: true, al: 'center', a, s: 11 });
  return [cx - 180 * s, cy - 95 * s, 360 * s, 190 * s];
}
function sKnow(u) {
  const k = eInOut(prog(u, 0, 1.0));
  const ra = knownA(k, 1);
  part('molecule', ra[0], ra[1], ra[2], ra[3]);
  const t = [prog(u, 1.2, 1.7), prog(u, 1.8, 2.3), prog(u, 2.4, 2.9), prog(u, 3.1, 3.5), prog(u, 3.6, 4.0)].map(eInOut);
  drawMolecule(MB, t, C.hand, 1);
  const pop = prog(u, 4.1, 4.5);
  if (pop > 0) {
    const r = prog(u, 4.1, 5.0);
    ctx.save(); ctx.globalAlpha = (1 - r) * 0.6; ctx.strokeStyle = C.read; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(575, 262, 200 + r * 30, 120 + r * 20, -0.36, 0, 7); ctx.stroke(); ctx.restore();
  }
  chip('molecule', '0.92', 575, 150, { al: 'center', a: eBack(pop) > 0 ? Math.min(1, pop * 2) : 0, s: 13 });
  const sa = prog(u, 4.8, 5.3);
  txt('3 bubbles · 2 links · bubble–bubble', 575, 404, { s: 12, c: C.ink2, al: 'center', a: sa });
  txt('the same structure as yours — at another size and angle', 575, 424, { s: 11, c: C.ink4, al: 'center', a: prog(u, 5.2, 5.7) });
  part('match', 505, 138, 140, 26);
  part('new-drawing', 400, 150, 350, 240);
  cap(u, [[0.2, 99, 'Draw it again — at any size, at any angle — and the canvas knows it.']]);
}

const LADDER = [
  ['ink', '5 strokes, as you drew them', C.hand],
  ['shape', '3 × circle 0.86 · 2 × line 0.93', C.read],
  ['plays', '3 nodes · 2 edges', C.ink2],
  ['concept', 'flow 0.90 — nodes joined by edges', C.read],
  ['name', 'molecule 0.92 — same shapes, same links', C.teal],
];
/** Molecule B moved left to make room; returns the offset. */
function placedB(u, from, to) { return lerp(from, to, eInOut(u)); }
function sWhy(u) {
  const dx = placedB(prog(u, 0, 0.8), 0, -200);
  ctx.save(); ctx.translate(dx, 0);
  drawMolecule(MB, [], C.hand, 1);
  const step = (i) => prog(u, 1.4 + i * 0.9, 1.8 + i * 0.9);
  // Each rung, lit on the marks it is about.
  if (step(1) > 0) for (const c of MB.circles) ink(c, 1, C.read, 2.4, step(1) * 0.55 * (1 - step(2)));
  if (step(2) > 0) for (let i = 0; i < 3; i++) txt('node', MB.c[i].x, MB.c[i].y + MB.r + 20, { s: 10, c: C.ink3, al: 'center', a: step(2) });
  chip('molecule', '0.92', 575, 150, { al: 'center', s: 13, c: step(4) > 0 ? C.teal : C.read, blessed: step(4) > 0 });
  chip('why?', '', 575 + 70, 150, { al: 'left', s: 11, c: C.ink3, a: fade(u, 0.6, 0.9, 1.4, 1.8) });
  ctx.restore();
  press(575 + dx + 92, 150, u, 1.2);
  smallcaps('why — read from the bottom up', 612, 112, prog(u, 1.3, 1.7));
  ctx.save(); ctx.globalAlpha = prog(u, 1.3, 1.7); ctx.strokeStyle = C.edge; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(620, 380); ctx.lineTo(620, 380 - 220 * eOut(prog(u, 1.3, 5.4))); ctx.stroke(); ctx.restore();
  for (let i = 0; i < LADDER.length; i++) {
    const [rung, what, col] = LADDER[i], a = step(i), y = 380 - i * 55;
    if (a <= 0) continue;
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(620, y, 4, 0, 7); ctx.fill(); ctx.restore();
    smallcaps(rung, 636, y - 6, a);
    txt(what, 636, y + 12, { s: 12, c: col, a: a });
  }
  part('ladder', 600, 100, 320, 300);
  part('molecule', MB.box[0] + dx, MB.box[1], MB.box[2] - MB.box[0], MB.box[3] - MB.box[1]);
  cap(u, [[0.2, 99, 'Ask why, and the answer is grounded: every rung is something the canvas saw.']]);
}

function seat(name, sub, x, y, col, a, busy, u) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  const r = busy ? 5 + Math.sin(u * 5) * 1.5 : 5;
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.restore();
  txt(name, x + 14, y + 5, { s: 13, w: 500, c: col, a });
  txt(sub, x + 14, y + 23, { s: 11, c: C.ink4, a });
}
function sHands(u) {
  const dx = -200;
  ctx.save(); ctx.translate(dx, 0);
  drawMolecule(MB, [], C.hand, 1);
  ctx.restore();
  const cx = 575 + dx;
  seat('engine', 'tiers 0–1 · instant, no model', 610, 150, C.teal, prog(u, 0.3, 0.7));
  const thinking = u > 1.2 && u < 3.6;
  seat('qwen', thinking ? 'tier 2 · a model · thinking… ' + Math.max(1, Math.floor(u - 1.2)) + 's' : 'tier 2 · a model, local', 610, 214, C.model, prog(u, 0.6, 1.0), thinking, u);
  seat('you', 'the hand — the only one who blesses', 610, 278, C.ink, prog(u, 0.9, 1.3));
  // Both readings stand: the engine's and the model's.
  const blessed = prog(u, 5.2, 5.5) > 0;
  chip(blessed ? '✓ molecule' : 'molecule', blessed ? 'yours' : '0.92 · engine', cx, 150, { al: 'center', s: 13, c: blessed ? C.teal : C.read, blessed });
  const land = prog(u, 3.6, 4.0);
  chip('water', '0.41 · qwen', cx, 186, { al: 'center', s: 12, c: C.model, held: true, a: land });
  txt('3 atoms, 2 bonds — “water?”', cx, 212, { s: 11, c: C.ink4, al: 'center', a: prog(u, 4.0, 4.5) });
  press(cx - 40, 150, u, 5.0);
  txt('both stand — disagreement is information', 610, 334, { s: 11, c: C.ink3, a: prog(u, 4.3, 4.8) });
  txt('nothing a model says is kept until you take it', 610, 354, { s: 11, c: C.ink3, a: prog(u, 5.8, 6.3) });
  part('molecule', MB.box[0] + dx, MB.box[1], MB.box[2] - MB.box[0], MB.box[3] - MB.box[1]);
  part('model-reading', cx - 70, 174, 140, 24);
  part('participants', 600, 136, 320, 160);
  cap(u, [
    [0.2, 4.6, 'A model joins as one more hand, reading the same measurements you can see.'],
    [4.6, 99, 'Everyone proposes. Only you bless.'],
  ]);
}

function pageInside(k) {
  // What the brief filled, standing inside the ink that framed it.
  const [hx0, hy0, hx1, hy1] = BOX.header, [lx0, ly0, lx1, ly1] = BOX.left, [rx0, ry0, rx1, ry1] = BOX.right, [fx0, fy0, fx1, fy1] = BOX.footer;
  const inset = 5;
  const reg = (b, i) => prog(k, i * 0.18, i * 0.18 + 0.4);
  const a0 = reg(BOX.header, 0), a1 = reg(BOX.left, 1), a2 = reg(BOX.right, 2), a3 = reg(BOX.footer, 3);
  ctx.save();
  ctx.globalAlpha = a0; ctx.fillStyle = C.plate; ctx.fillRect(hx0 + inset, hy0 + inset, hx1 - hx0 - inset * 2, hy1 - hy0 - inset * 2);
  ctx.restore();
  txt('Tide Pools', hx0 + 18, hy0 + 30, { s: 17, w: 500, c: C.ink, a: a0 });
  txt('what lives between the tides', hx1 - 16, hy0 + 29, { s: 10, c: C.ink3, a: a0, al: 'right' });
  ctx.save(); ctx.globalAlpha = a1; ctx.fillStyle = rgba(C.teal, 0.13); ctx.fillRect(lx0 + inset, ly0 + inset, lx1 - lx0 - inset * 2, ly1 - ly0 - inset * 2);
  ctx.strokeStyle = rgba(C.teal, 0.55); ctx.lineWidth = 1.5;
  for (let j = 0; j < 4; j++) { ctx.beginPath(); for (let x = lx0 + 14; x <= lx1 - 14; x += 4) { const y = ly0 + 60 + j * 18 + Math.sin(x / 11 + j) * 4; x === lx0 + 14 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }
  ctx.fillStyle = rgba(C.mid, 0.7); ctx.beginPath(); ctx.arc(lx1 - 34, ly0 + 32, 10, 0, 7); ctx.fill();
  ctx.restore();
  txt('Anemones', rx0 + 16, ry0 + 30, { s: 14, w: 500, c: C.ink, a: a2 });
  ctx.save(); ctx.globalAlpha = a2; ctx.fillStyle = C.ink4;
  for (let j = 0; j < 5; j++) ctx.fillRect(rx0 + 16, ry0 + 48 + j * 17, (rx1 - rx0 - 32) * (j === 4 ? 0.55 : 0.9 - (j % 2) * 0.12), 5);
  ctx.restore();
  txt('made from a drawing', fx0 + 16, fy0 + 23, { s: 10, c: C.ink3, a: a3 });
  txt('the ink is still on it', fx1 - 16, fy0 + 23, { s: 10, c: C.ink4, a: a3, al: 'right' });
}
function sCode(u) {
  const t = [prog(u, 0.5, 1.1), prog(u, 1.2, 1.7), prog(u, 1.8, 2.3), prog(u, 2.4, 2.8)].map(eInOut);
  const page = prog(u, 6.2, 7.6);
  if (page > 0) pageInside(page);
  for (let i = 0; i < 4; i++) ink(BOXES[i], t[i], C.hand, 2.2, page > 0 ? lerp(1, 0.85, page) : 1);
  chip('page layout', '0.84', 281, 402, { al: 'center', a: fade(u, 3.0, 3.4, 5.2, 5.6) });
  // The structure the canvas knows before any model is asked: a real XY-cut.
  smallcaps('the structure, read from the drawing', 600, 130, prog(u, 3.1, 3.5));
  const tree = ['column(', '  header,', '  row( left, right ),', '  footer', ')'];
  tree.forEach((line, i) => txt(line, 600, 160 + i * 20, { s: 13, c: C.teal, a: prog(u, 3.3 + i * 0.2, 3.6 + i * 0.2) }));
  txt('flexbox that reflows —', 600, 278, { s: 11, c: C.ink3, a: prog(u, 4.4, 4.8) });
  txt('exact at the size you drew it', 600, 296, { s: 11, c: C.ink3, a: prog(u, 4.5, 4.9) });
  const lassoOut = prog(u, 5.4, 5.7);
  ink(LOOP2, eInOut(prog(u, 4.3, 5.0)), C.hand, 1.8, 1 - lassoOut);
  ink(CHECK2, eInOut(prog(u, 5.0, 5.3)), C.hand, 2.4, 1 - lassoOut);
  const typed = 'a page about tide pools'.slice(0, Math.round(23 * prog(u, 5.5, 6.1)));
  field(600, 322, typed, u, typed.length === 23 ? 'Enter asks a model for the words' : 'a brief', [['page layout', '0.84']], fade(u, 5.4, 5.6, 6.3, 6.6));
  // Ink over what it made addresses the region under it.
  const rl = eInOut(prog(u, 8.0, 8.7));
  ink(REGION_LOOP, rl, C.hand, 1.8, 1 - prog(u, 9.6, 10.2));
  const hit = fade(u, 8.7, 9.0, 99, 100);
  if (hit > 0) {
    const [x0, y0, x1, y1] = BOX.header;
    ctx.save(); ctx.globalAlpha = hit; ctx.strokeStyle = C.teal; ctx.lineWidth = 2; ctx.strokeRect(x0 + 3, y0 + 3, x1 - x0 - 6, y1 - y0 - 6); ctx.restore();
    txt('addresses  header', 600, 360, { s: 13, w: 500, c: C.teal, a: hit });
    txt('ink over the page lands on the region under it', 600, 380, { s: 11, c: C.ink3, a: hit });
  }
  part('page', 92, 118, 378, 262);
  if (page > 0) { part('page-header', 92, 118, 378, 46); part('page-left', 92, 178, 160, 152); part('page-right', 266, 178, 204, 152); part('page-footer', 92, 344, 378, 36); }
  part('structure', 590, 115, 320, 200);
  cap(u, [
    [0.2, 4.3, 'Boxes laid out are read as a page — a structure the canvas knows with no model at all.'],
    [4.3, 8.0, 'Brief it, and a model writes the words. The layout stays the one you drew.'],
    [8.0, 99, 'And your ink still addresses what it made.'],
  ]);
}

// ---------------------------------------------------------------------------
// Your turn: the one scene that measures something real — your own stroke.
let yours = [], live = null;
function measureStroke(pts) {
  if (!pts || pts.length < 3) return null;
  let len = 0, minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (i) len += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y);
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  }
  const w = maxX - minX, h = maxY - minY, size = Math.max(w, h, 1), a = pts[0], b = pts[pts.length - 1];
  const gap = Math.hypot(b.x - a.x, b.y - a.y);
  // Turning, measured along the path: resample by length first, so a slow
  // hand and a fast one turn the same number of degrees.
  const step = Math.max(3, len / 80), even = [a];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    acc += d;
    if (acc >= step) { even.push(pts[i]); acc = 0; }
  }
  // and smoothed a little, so the jitter a device adds is not counted as turning.
  const sm = even.map((p, i) => {
    let x = 0, y = 0, n = 0;
    for (let j = Math.max(0, i - 2); j <= Math.min(even.length - 1, i + 2); j++) { x += even[j].x; y += even[j].y; n++; }
    return { x: x / n, y: y / n };
  });
  let turn = 0;
  for (let i = 2; i < sm.length; i++) {
    const h1 = Math.atan2(sm[i - 1].y - sm[i - 2].y, sm[i - 1].x - sm[i - 2].x);
    const h2 = Math.atan2(sm[i].y - sm[i - 1].y, sm[i].x - sm[i - 1].x);
    let d = h2 - h1;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    turn += Math.abs(d);
  }
  return { n: pts.length, len, w, h, gap: gap / size, straight: len ? Math.hypot(b.x - a.x, b.y - a.y) / len : 0, turn: (turn * 180) / Math.PI };
}
const REPLAY = [806, 432, 118, 30];
function sYou(u) {
  txt('Your turn.', 60, 120, { s: 34, w: 500, c: C.ink, a: prog(u, 0, 0.6) });
  txt('Draw anything in here.', 60, 152, { s: 14, c: C.ink3, a: prog(u, 0.3, 0.9) });
  // The board inside the frame.
  ctx.save(); ctx.globalAlpha = prog(u, 0.2, 0.7); ctx.strokeStyle = C.edge; ctx.setLineDash([4, 6]); ctx.strokeRect(46, 176, 500, 250); ctx.restore();
  for (let i = 0; i < yours.length; i++) ink(stroke(yours[i]), 1, C.hand, 2.4, i === yours.length - 1 ? 1 : 0.4);
  if (live && live.length > 1) ink(stroke(live), 1, C.hand, 2.4, 1);
  const m = measureStroke(live && live.length > 2 ? live : yours[yours.length - 1]);
  smallcaps(m ? 'measured, from your stroke' : 'what will be measured', 600, 130, prog(u, 0.4, 0.8));
  const rows = m ? [
    ['points', String(m.n)],
    ['length', Math.round(m.len) + ' px'],
    ['box', Math.round(m.w) + ' × ' + Math.round(m.h)],
    ['end to start', Math.round(m.gap * 100) + '% of its size'],
    ['straightness', m.straight.toFixed(2)],
    ['turning', Math.round(m.turn) + '°'],
  ] : [['points', '—'], ['length', '—'], ['box', '—'], ['end to start', '—'], ['straightness', '—'], ['turning', '—']];
  rows.forEach(([k, v], i) => {
    const a = prog(u, 0.5 + i * 0.08, 0.9 + i * 0.08);
    txt(k, 600, 164 + i * 30, { s: 12, c: C.ink3, a });
    txt(v, 900, 164 + i * 30, { s: 13, w: 500, c: m ? C.teal : C.ink4, a, al: 'right' });
  });
  const note = wrap('These are only measurements. The reading — shape, role, concept, name — happens on the canvas. Draw outside this frame and the engine reads it.', 11, 300);
  note.forEach((l, i) => txt(l, 600, 356 + i * 17, { s: 11, c: C.ink4, a: prog(u, 1.0, 1.5) }));
  // Watch again.
  const [bx, by, bw, bh] = REPLAY, ba = prog(u, 1.2, 1.6);
  ctx.save(); ctx.globalAlpha = ba; rrect(bx, by, bw, bh, bh / 2); ctx.fillStyle = C.plate; ctx.fill(); ctx.strokeStyle = C.edge; ctx.stroke(); ctx.restore();
  txt('↺ watch again', bx + bw / 2, by + 20, { s: 12, c: C.ink2, al: 'center', a: ba });
  part('your-drawing', 46, 176, 500, 250);
  part('measurements', 590, 115, 320, 200);
  part('replay', bx, by, bw, bh);
  cap(u, [[0.2, 1e9, 'Draw inside the frame to see what is measured — then draw on the canvas itself.']]);
}

// ---------------------------------------------------------------------------
// The timeline
const SCENES = [
  { name: 'MetaMedium', dur: 4.0, draw: sTitle },
  { name: 'a mark is points', dur: 5.5, draw: sInk },
  { name: 'measured', dur: 7.0, draw: sMeasure },
  { name: 'read many ways', dur: 6.5, draw: sRead },
  { name: 'redrawn in front', dur: 5.0, draw: sClean },
  { name: 'you name it', dur: 6.0, draw: sName },
  { name: 'names compose', dur: 10.0, draw: sCompose },
  { name: 'known again', dur: 7.5, draw: sKnow },
  { name: 'why?', dur: 8.5, draw: sWhy },
  { name: 'every hand proposes', dur: 9.0, draw: sHands },
  { name: 'drawing becomes code', dur: 10.5, draw: sCode },
  { name: 'your turn', dur: Infinity, draw: sYou },
];
let acc = 0;
for (const s of SCENES) { s.start = acc; if (isFinite(s.dur)) acc += s.dur; }
const LAST = SCENES.length - 1, STORY = SCENES[LAST].start;
function sceneAt(T) { for (let i = LAST; i >= 0; i--) if (T >= SCENES[i].start) return i; return 0; }

// The bar: the story's scenes in proportion, then a short segment for yours.
const BAR = { x0: 36, x1: 924, y: 514, yourW: 34, gap: 3 };
function barSpan(i) {
  const storyW = BAR.x1 - BAR.x0 - BAR.yourW - BAR.gap;
  if (i === LAST) return [BAR.x1 - BAR.yourW, BAR.x1];
  const a = BAR.x0 + (SCENES[i].start / STORY) * storyW, b = BAR.x0 + ((SCENES[i].start + SCENES[i].dur) / STORY) * storyW;
  return [a, b - BAR.gap];
}
function drawBar(i, T) {
  for (let k = 0; k < SCENES.length; k++) {
    const [a, b] = barSpan(k);
    ctx.fillStyle = k < i ? rgba(C.teal, 0.55) : C.edge;
    ctx.fillRect(a, BAR.y, b - a, 3);
    if (k === i) {
      const f = k === LAST ? 1 : clamp((T - SCENES[k].start) / SCENES[k].dur, 0, 1);
      ctx.fillStyle = C.teal; ctx.fillRect(a, BAR.y, (b - a) * f, 3);
    }
  }
  part('timeline', BAR.x0, BAR.y - 14, BAR.x1 - BAR.x0, 30);
}
function barTime(x) {
  if (x >= BAR.x1 - BAR.yourW) return STORY;
  const storyW = BAR.x1 - BAR.x0 - BAR.yourW - BAR.gap;
  return clamp(((x - BAR.x0) / storyW) * STORY, 0, STORY - 0.01);
}

function cap(u, list) {
  for (const [a, b, s] of list) {
    if (u < a || u >= b) continue;
    const al = Math.min(prog(u, a, a + 0.35), 1 - prog(u, b - 0.3, b));
    const lines = wrap(s, 16, 888);
    lines.slice(0, 2).forEach((l, i) => txt(l, 36, 470 + i * 22, { s: 16, c: C.ink, a: al }));
    part('caption', 36, 452, 888, 44);
  }
}
function chrome(i) {
  txt(String(i + 1).padStart(2, '0') + ' / ' + String(SCENES.length).padStart(2, '0'), 36, 46, { s: 11, c: C.ink4 });
  txt(SCENES[i].name, 104, 46, { s: 11, c: C.ink2, w: 500 });
  const mw = measure('Medium', 12, 500);
  txt('Medium', 924, 46, { s: 12, w: 500, c: C.ink3, al: 'right' });
  txt('Meta', 924 - mw, 46, { s: 12, w: 500, c: C.teal, al: 'right' });
}
function ground() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  rrect(0, 0, W, H, 14); ctx.fillStyle = C.ground; ctx.fill();
  ctx.setTransform(DPR * S, 0, 0, DPR * S, DPR * OX, DPR * OY);
  // The canvas's faint grid, so the story happens on the board it is about.
  ctx.save(); ctx.strokeStyle = 'rgba(231,229,224,0.035)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = 26; x < DW; x += 26) { ctx.moveTo(x, 64); ctx.lineTo(x, 440); }
  for (let y = 64 + 12; y < 440; y += 26) { ctx.moveTo(10, y); ctx.lineTo(DW - 10, y); }
  ctx.stroke(); ctx.restore();
}

// ---------------------------------------------------------------------------
// Time and the hand
let T = 0, scrubbing = false, down = null;
function toDesign(p) { return { x: (p.x - OX) / S, y: (p.y - OY) / S }; }
function onBar(d) { return d.y > BAR.y - 18 && d.y < BAR.y + 22 && d.x > BAR.x0 - 8 && d.x < BAR.x1 + 8; }
function inside(d, r) { return d.x >= r[0] && d.x <= r[0] + r[2] && d.y >= r[1] && d.y <= r[1] + r[3]; }

mm.onPointer((e) => {
  const d = toDesign(e), i = sceneAt(T);
  if (e.type === 'down') {
    down = d;
    if (onBar(d)) { scrubbing = true; T = barTime(d.x); return; }
    if (i === LAST && !inside(d, REPLAY)) { live = [d]; return; }
    return;
  }
  if (e.type === 'move') {
    if (scrubbing) { T = barTime(d.x); return; }
    if (live) live.push(d);
    return;
  }
  // up or cancel
  if (scrubbing) { scrubbing = false; down = null; return; }
  if (live) {
    if (live.length > 2) { yours.push(live); if (yours.length > 4) yours.shift(); }
    live = null; down = null;
    return;
  }
  const tap = down && Math.hypot(d.x - down.x, d.y - down.y) < 8;
  down = null;
  if (!tap || e.type === 'cancel') return;
  if (i === LAST) { if (inside(d, REPLAY)) { T = 0; yours = []; } return; }
  T = SCENES[i + 1].start; // a tap steps on to the next scene
});

mm.onFrame((t, dt) => {
  if (!scrubbing) T += dt;
  const i = sceneAt(T), u = T - SCENES[i].start;
  ground();
  chrome(i);
  SCENES[i].draw(u);
  drawBar(i, T);
  reportParts();
});

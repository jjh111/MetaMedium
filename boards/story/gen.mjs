// Generates the SVG panels of the "story" board. Every panel is one figure;
// every part a hand might point at is a top-level <g id>, so ink over it
// addresses it (kinds/address.ts elementsOf). Text is coloured by inline style
// (the figure stylesheet sets text{fill:currentColor}, which beats attributes).
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.dirname(new URL(import.meta.url).pathname);
const code = JSON.parse(fs.readFileSync(path.join(OUT, 'code.json'), 'utf8'));

// Mid-tones of the brand's signals, legible on paper and on the dark ground.
export const C = {
  done: '#3d9ca4',   // teal  — on master and in the app
  core: '#5f86bd',   // blue  — built in the engine, not yet on the surface
  next: '#b89a4a',   // amber — next
  gap: '#c0736a',    // coral — a gap
  model: '#8f7bb8',  // violet — models and seats
  grey: '#8a9095',
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export function T(x, y, s, o = {}) {
  const st = (o.color ? 'fill:' + o.color + ';' : '') + (o.op != null ? 'opacity:' + o.op + ';' : '');
  return `<text x="${x}" y="${y}" font-size="${o.size || 24}"` + (o.weight ? ` font-weight="${o.weight}"` : '') +
    (o.anchor ? ` text-anchor="${o.anchor}"` : '') + (st ? ` style="${st}"` : '') + `>${esc(s)}</text>`;
}
export function R(x, y, w, h, o = {}) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx ?? 10}" fill="${o.fill || 'none'}"` +
    (o.fop != null ? ` fill-opacity="${o.fop}"` : '') + ` stroke="${o.stroke || 'currentColor'}" stroke-width="${o.sw ?? 2}"` +
    (o.sop != null ? ` stroke-opacity="${o.sop}"` : '') + (o.dash ? ` stroke-dasharray="${o.dash}"` : '') + '/>';
}
export function L(x1, y1, x2, y2, o = {}) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.stroke || 'currentColor'}" stroke-width="${o.sw ?? 2}"` +
    (o.sop != null ? ` stroke-opacity="${o.sop}"` : '') + (o.dash ? ` stroke-dasharray="${o.dash}"` : '') + '/>';
}
export function arrow(x1, y1, x2, y2, o = {}) {
  const a = Math.atan2(y2 - y1, x2 - x1), s = o.head ?? 14;
  const p1 = [x2 - s * Math.cos(a - 0.45), y2 - s * Math.sin(a - 0.45)], p2 = [x2 - s * Math.cos(a + 0.45), y2 - s * Math.sin(a + 0.45)];
  return L(x1, y1, x2, y2, o) + `<path d="M${p1[0].toFixed(1)},${p1[1].toFixed(1)} L${x2},${y2} L${p2[0].toFixed(1)},${p2[1].toFixed(1)}" fill="none" stroke="${o.stroke || 'currentColor'}" stroke-width="${o.sw ?? 2}"` + (o.sop != null ? ` stroke-opacity="${o.sop}"` : '') + '/>';
}
export const dot = (x, y, r, color, o = {}) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${o.hollow ? 'none' : color}" stroke="${color}" stroke-width="${o.sw ?? 2}"/>`;
/** Words wrapped to a width in px, at a monospace advance of 0.6em. */
export function wrap(s, width, size) {
  const n = Math.max(4, Math.floor(width / (0.6 * size)));
  const out = [];
  let line = '';
  for (const w of String(s).split(/\s+/)) {
    if (!line) line = w;
    else if ((line + ' ' + w).length <= n) line += ' ' + w;
    else { out.push(line); line = w; }
  }
  if (line) out.push(line);
  return out;
}
export function para(x, y, s, width, o = {}) {
  const size = o.size || 24, lh = o.lh || size * 1.35;
  return wrap(s, width, size).map((l, i) => T(x, y + i * lh, l, o)).join('');
}
const g = (id, body) => `<g id="${id}">${body}</g>`;
export const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="IBM Plex Mono, Menlo, monospace">${body}</svg>`;
const fmt = (n) => n.toLocaleString('en-US');

/** A box with a title and a body, in a status colour. */
function card(x, y, w, h, title, body, color, o = {}) {
  const ts = o.ts || 26, bs = o.bs || 20;
  return R(x, y, w, h, { fill: color, fop: o.fop ?? 0.12, stroke: color, sw: 2.5, rx: 12 }) +
    T(x + 18, y + ts + 14, title, { size: ts, weight: 700 }) +
    (body ? para(x + 18, y + ts + 14 + bs * 1.6, body, w - 36, { size: bs, op: 0.85 }) : '');
}

// ===== A1 · the title, how to read and how to comment, and a map of the board =====
function a1() {
  const W = 1500, H = 1420;
  let b = '';
  b += g('title', T(0, 118, 'dyna.ink', { size: 132, weight: 700 }) +
    T(6, 172, 'formerly MetaMedium · the platform on 28 September 2026', { size: 30, op: 0.7 }));
  b += g('what-it-is', para(6, 236, 'A shared canvas that reads ink — its shape, the part it plays, the pattern it makes, the code it can become — and turns it into diagrams, pages, programs and maths, with models as optional helpers and never as gatekeepers.', W - 20, { size: 30, lh: 42 }));
  const legend = [[C.done, 'on master and in the app'], [C.core, 'built in the engine, not yet on the surface'], [C.next, 'next'], [C.gap, 'a gap this board found']];
  b += g('legend', T(6, 420, 'Read the colours', { size: 30, weight: 700 }) + legend.map(([c, s], i) => {
    const x = 6 + (i % 2) * 740, y = 470 + Math.floor(i / 2) * 50;
    return dot(x + 14, y - 9, 14, c) + T(x + 44, y, s, { size: 26 });
  }).join(''));
  b += g('how-to-comment', T(6, 620, 'Comment on anything', { size: 30, weight: 700 }) +
    para(6, 664, 'Draw on the board: circle a part, write beside it, point an arrow at it. Every box in every panel is a region — your ink lands on the part under it. I read the board with canvas_look and canvas_see and answer beside your marks, and what we agree goes into the plan.', W - 20, { size: 25, lh: 36, op: 0.9 }));
  // The map of this board: its regions at 1/9 scale, numbered in reading order.
  const s = 1 / 5.4, ox = 6, oy = 880;
  const regions = [
    ['0', 'this panel', 0, 0, 1500, 1420, C.grey],
    ['1', 'architecture', 1700, 0, 2600, 1420, C.done],
    ['2', 'a stroke’s life', 4500, 0, 2900, 1420, C.done],
    ['3', 'the plan', 0, 1700, 3000, 1400, C.done],
    ['4', 'true use', 3200, 1700, 2000, 1400, C.done],
    ['5', 'numbers', 5400, 1700, 2000, 1400, C.done],
    ['6', 'the code', 0, 3400, 3000, 1400, C.done],
    ['7', 'notations, live', 3200, 3400, 4200, 1400, C.core],
    ['8', 'gaps', 0, 5100, 4200, 1300, C.gap],
    ['9', 'your turn', 4400, 5100, 3000, 1300, C.next],
  ];
  b += g('board-map', T(6, oy - 24, 'The board, in reading order', { size: 30, weight: 700 }) + regions.map(([n, name, x, y, w, h, c]) =>
    R(ox + x * s, oy + y * s, w * s, h * s, { fill: c, fop: 0.12, stroke: c, sw: 1.5, rx: 4 }) +
    T(ox + x * s + 8, oy + y * s + 24, n + ' ' + name, { size: 19, weight: 600 })).join(''));
  return svg(W, H, b);
}

// ===== A3 · architecture =====
function a3() {
  const W = 2600, H = 1420;
  let b = '';
  b += g('heading', T(0, 56, '1 · Architecture — what the parts are and how they lean on each other', { size: 50, weight: 700 }) +
    T(2, 98, 'one engine, three surfaces, doors between them · teal: on master and in the app · blue: in the engine, not yet on the surface', { size: 23, op: 0.7 }));
  const band = (id, y, h, label) => g(id, R(0, y, W, h, { fill: 'currentColor', fop: 0.035, stroke: 'currentColor', sop: 0.18, sw: 1.5, rx: 16 }) +
    T(24, y + 34, label, { size: 22, weight: 700, op: 0.65 }));
  b += band('band-surfaces', 124, 212, 'SURFACES — where hands draw');
  const sx = [24, 664, 1304, 1944], sw = 620;
  b += g('surface-canvas', card(sx[0], 170, sw, 150, 'Canvas · the web app', '29 surface fragments: the field, the panel, boards, pen and palm; installs and opens offline at /app/', C.done));
  b += g('surface-shard', card(sx[1], 170, sw, 150, 'Shard 3D', 'ink on planes stands solids, as op trees in the log; its own hand and model seat', C.done));
  b += g('surface-hands', card(sx[2], 170, sw, 150, 'MCP hands', 'Claude on the board as a hand: look, see, draw, say, label, write — this board was drawn that way', C.done));
  b += g('surface-paper', card(sx[3], 170, sw, 150, 'Whitepaper', 'index.html: the argument, with live figures from the engine', C.done));
  b += band('band-doors', 364, 196, 'DOORS — how a board travels');
  b += g('door-rooms', card(sx[0], 408, sw, 136, 'Live rooms', 'a relay carries each hand’s log; a line is merged, never the whole board', C.done));
  b += g('door-browser', card(sx[1], 408, sw, 136, 'This browser', 'an append-only journal in IndexedDB — nothing lost — named boards, a trash', C.done));
  b += g('door-folder', card(sx[2], 408, sw, 136, 'Folder and repository', 'one log file per hand under .metamedium/, merged into one board', C.done));
  b += g('door-out', card(sx[3], 408, sw, 136, 'Out', 'SVG · PNG · the log from the app; Mermaid from the engine, not yet from the app', C.core));
  b += band('band-engine', 588, 600, 'ENGINE — metamedium-core · ' + fmt(Object.values(code.modules).reduce((a, m) => a + m.total, 0)) + ' lines, zero dependencies');
  // The log, then three columns that lean on it.
  b += g('engine-log', card(24, 674, 470, 494, 'The log', null, C.done) +
    ['every mark is an event, and the board is a pure function of the log', 'ids per hand; one event is applied once', 'undo takes back your own act, never another hand’s', 'checkpoints: a live room rebases, it never replays']
      .map((l, i) => T(42, 770 + i * 96, '•', { size: 23 }) + para(66, 770 + i * 96, l, 410, { size: 22, lh: 30, op: 0.9 })).join(''));
  const col = (id, x, w, heading, chips) => g(id, T(x, 662, heading, { size: 22, weight: 700, op: 0.75 }) + chips.map(([t, d, c], i) => {
    const y = 676 + i * 82;
    return R(x, y, w, 74, { fill: c, fop: 0.13, stroke: c, sw: 2, rx: 10 }) + T(x + 14, y + 30, t, { size: 22, weight: 700 }) + T(x + 14, y + 58, d, { size: 17, op: 0.85 });
  }).join(''));
  b += arrow(496, 920, 548, 920, { sw: 3 });
  b += col('engine-read', 552, 640, 'READ — what a mark is', [
    ['shape rung', '8 closed shapes, each scored from the ink', C.done],
    ['relations', 'within reach, found through a grid index', C.done],
    ['roles', '6 closed: container, node, edge, label, …', C.done],
    ['concepts', 'row, column, frame, flow, grid, writing', C.done],
    ['notations', 'flowchart · UML class · sequence · dashes', C.core],
    ['maths', 'the sheet · dimensions · solving · true size', C.core],
  ]);
  b += arrow(1196, 920, 1248, 920, { sw: 3 });
  b += col('engine-do', 1252, 640, 'DO — what a hand can make of it', [
    ['tools', '17 in one registry: every affordance', C.done],
    ['context', 'lifts what is near, holds the top steady', C.done],
    ['packs', 'basics · flowchart · uml-class · sequence', C.done],
    ['editing', 'magnets · handles · bound arrows follow', C.done],
    ['Mermaid', 'out and in, with a layered layout', C.core],
    ['structure', 'clean forms, tidy, pages and programs', C.done],
  ]);
  b += arrow(1896, 920, 1948, 920, { sw: 3 });
  b += col('engine-ask', 1952, 624, 'ASK — who else reads', [
    ['models', 'tier 2; asked only by a deliberate act', C.model],
    ['decision seat', 'tier 1½: typed questions, any model', C.core],
    ['router', 'the canvas answers first', C.done],
    ['bridge and MCP', 'a model as a hand, or answered by hand', C.done],
    ['the brief', 'the drawing, in the scope’s own ids', C.done],
    ['never commits', 'every tier proposes; the hand blesses', C.done],
  ]);
  b += band('band-quality', 1214, 196, 'QUALITY — how we know it holds');
  b += g('quality-tests', card(sx[0], 1256, sw, 136, '1,650 core tests', 'every unit begins with a test that fails; 23,472 lines of tests', C.done));
  b += g('quality-gate', card(sx[1], 1256, sw, 136, 'The browser gate', '558 records in 9 scenarios on Chromium, 41 on WebKit, on every push', C.done));
  b += g('quality-budgets', card(sx[2], 1256, sw, 136, 'Budgets as tests', 'a 2,000-mark board opens in 0.49 s and reads a stroke in 16 ms', C.done));
  b += g('quality-ci', card(sx[3], 1256, sw, 136, 'CI and Pages', 'bundles, the app and the site checked on every push to master', C.done));
  // The bands lean down.
  for (const x of [334, 974, 1614, 2254]) b += arrow(x, 336, x, 362, { sw: 2.5, sop: 0.6 }) + arrow(x, 560, x, 586, { sw: 2.5, sop: 0.6 });
  return svg(W, H, b);
}

// ===== B1 · the plan =====
const PHASES = [
  ['0 · week 1, whole', [
    ['L1', 'ids that hold', 'done'], ['L1b', 'one event, once', 'done'], ['L2a', 'the shard pairs by id', 'done'], ['L2b', 'labels on the board', 'done'],
    ['L2c', 'the shard asks how deep', 'done'], ['L2d', 'one Enter, one act', 'done'], ['L2e', 'a person labels ink', 'done'], ['L2f', 'made by who blessed it', 'done'],
    ['L2g', 'a word is its writer’s', 'done'], ['L2h', 'gestures per hand', 'done'], ['L2i', 'one person, many sittings', 'done'], ['L2j', 'undo is per hand', 'done'],
    ['L3', 'CI, bundles, docs', 'done']]],
  ['0b · a board that holds', [
    ['R3', 'no lost work', 'done'], ['R4a', 'measured first', 'done'], ['R4b', 'the engine holds 2,000', 'done'], ['R4c', 'draw only what changed', 'done'],
    ['R4d', 'a room merges a line', 'done'], ['R4e', 'a brief carries its scope', 'done']]],
  ['1 · the backbone', [['B1', 'tools', 'done'], ['B2', 'context', 'done'], ['B3', 'library packs', 'done']]],
  ['2 · editing', [['E1', 'handles', 'done'], ['E2', 'bound arrows follow', 'done'], ['E3', 'ports, heads, figures', 'done']]],
  ['3 · diagrams', [
    ['S1', 'the rung holds a diamond', 'done'], ['W1', 'drawing never destroys', 'done'], ['D1', 'flowchart', 'core'], ['D2', 'Mermaid out', 'core'],
    ['D3', 'Mermaid in', 'core'], ['D4', 'UML class', 'core'], ['D5', 'sequence', 'core'], ['D5', 'state', 'next'],
    ['S2', 'arrows read true', 'next'], ['D6', 'ER and mind map', 'next'], ['D7', 'routing', 'next'], ['D8', 'the repair demo', 'next']]],
  ['4 · maths', [
    ['M1', 'quantities', 'core'], ['M2', 'the sheet', 'core'], ['M3', 'dimensions', 'core'], ['M4', 'solving', 'core'],
    ['M7', 'true size, print', 'core'], ['M5', 'maths on the board', 'next'], ['M6', 'the garment pack', 'next']]],
  ['5 · seats', [['J2', 'extraction: not yet', 'done'], ['J1', 'decide on the canvas', 'core'], ['J3', 'numerals', 'next']]],
  ['6 · ready for use', [
    ['R1', 'boards', 'done'], ['R6', 'pencil and tablet', 'done'], ['R7', 'deploy and release', 'done'], ['R2', 'the log format', 'next'],
    ['R5', 'first run', 'next'], ['R8', 'one platform', 'next'], ['R9', 'the shard alongside', 'next']]],
  ['7 · review and release', [['H1', 'the hand in the gate', 'next'], ['V1', 'a review of use', 'next'], ['V2', 'its fixes', 'next'], ['V3', 'the paper’s figures', 'next'], ['V4', 'v1.0.0', 'next']]],
];
function b1() {
  const W = 3000, H = 1400, cw = 318, gap = 12;
  const all = PHASES.flatMap((p) => p[1]);
  const n = (s) => all.filter((u) => u[2] === s).length;
  let b = g('heading', T(0, 56, '3 · The plan — V1-PLAN.md, phase by phase', { size: 50, weight: 700 }) +
    T(2, 98, `${all.length} units: ${n('done')} done · ${n('core')} built in the engine, not yet on the surface · ${n('next')} next — each began with a test that failed`, { size: 23, op: 0.7 }));
  const col = { done: C.done, core: C.core, next: C.next };
  PHASES.forEach(([name, units], i) => {
    const x = i * (cw + gap);
    const done = units.filter((u) => u[2] === 'done').length;
    let body = R(x, 124, cw, 1262, { fill: 'currentColor', fop: 0.03, stroke: 'currentColor', sop: 0.15, sw: 1.5, rx: 14 }) +
      T(x + 16, 164, name, { size: 21, weight: 700 }) + T(x + 16, 194, `${done} of ${units.length} done`, { size: 19, op: 0.7 });
    b += g('phase-' + name.split(' ')[0], body);
    units.forEach(([id, label, st], j) => {
      const y = 212 + j * 88;
      b += g('unit-' + id + (id === 'D5' ? '-' + label : ''), R(x + 10, y, cw - 20, 78, { fill: col[st], fop: 0.16, stroke: col[st], sw: 2, rx: 10 }) +
        T(x + 24, y + 31, id, { size: 22, weight: 700 }) + T(x + 24, y + 61, label, { size: 18, op: 0.9 }));
    });
  });
  return svg(W, H, b);
}

// ===== B2 · the ten scenarios =====
const SCEN = [
  ['A1', 'Flowchart', ['done', 'core', 'core', 'next'], 'the field saying “a flowchart”; the Mermaid standing on the board; Draw it from Mermaid'],
  ['A2', 'UML class', ['done', 'next', 'next', 'next'], 'the reading and the export on the surface'],
  ['A3', 'Sequence', ['done', 'next', 'next', 'next'], 'the reading and the export on the surface'],
  ['A4', 'Pattern', ['done', 'next', 'next', 'next'], 'maths on the board (M5), the garment pack (M6), the print pane'],
  ['A5', 'Page and program', ['done', 'done', 'done', 'next'], 'a walk by hand'],
  ['A6', 'Notes', ['done', 'done', 'done', 'next'], 'a walk by hand; reading needs a model that can see'],
  ['A7', 'Two hands', ['done', 'done', 'done', 'next'], 'a walk with you and the MCP hand in one room'],
  ['A8', 'Boards', ['done', 'done', 'done', 'next'], 'a walk by hand'],
  ['A9', 'No model', ['done', 'done', 'core', 'next'], 'saying what a model would add, everywhere it could'],
  ['A10', 'Pencil', ['done', 'done', 'done', 'next'], 'the iPad walk (QA-v1 §A10)'],
];
function b2() {
  const W = 2000, H = 1400;
  const col = { done: C.done, core: C.core, next: C.next };
  let b = g('heading', T(0, 56, '4 · True use — the ten scenarios v1 must pass', { size: 50, weight: 700 }) +
    T(2, 98, 'each is scripted in the browser gate and walked by hand before v1 ships', { size: 23, op: 0.7 }));
  const cx = [0, 90, 470, 600, 730, 860, 990];
  b += g('columns', ['', 'scenario', 'engine', 'surface', 'gate', 'by hand', 'what is missing'].map((h, i) => T(cx[i] + (i >= 2 && i <= 5 ? 50 : 0), 150, h, { size: 22, weight: 700, op: 0.75, anchor: i >= 2 && i <= 5 ? 'middle' : undefined })).join('') + L(0, 166, W, 166, { sop: 0.3 }));
  SCEN.forEach(([id, name, st, miss], i) => {
    const y = 180 + i * 120;
    b += g(id, R(0, y, W, 110, { fill: 'currentColor', fop: i % 2 ? 0.0 : 0.035, stroke: 'none', sw: 0, rx: 8 }) +
      T(14, y + 64, id, { size: 26, weight: 700 }) + T(cx[1], y + 64, name, { size: 28, weight: 600 }) +
      st.map((s, k) => dot(cx[2 + k] + 50, y + 55, 20, col[s], { hollow: s === 'next' })).join('') +
      para(cx[6], y + 46, miss, W - cx[6] - 10, { size: 21, lh: 28, op: 0.9 }));
  });
  b += g('key', dot(20, 1386, 12, C.done) + T(42, 1394, 'done', { size: 20 }) + dot(160, 1386, 12, C.core) + T(182, 1394, 'partly, or in the engine only', { size: 20 }) +
    dot(560, 1386, 12, C.next, { hollow: true }) + T(582, 1394, 'not yet', { size: 20 }));
  return svg(W, H, b);
}

// ===== B3 · numbers =====
function b3() {
  const W = 2000, H = 1400;
  let b = g('heading', T(0, 56, '5 · Numbers — what this push changed', { size: 50, weight: 700 }) +
    T(2, 98, '303 commits since 24 September; 64 of them a test committed failing first', { size: 23, op: 0.7 }));
  // Core tests at each landing on master, and the browser gate's records.
  const land = [['0b', 1042, 443], ['L2j R6', 1114, 534], ['B2 D2', 1162, 538], ['B3', 1194, 546], ['E1 D3', 1318, 553], ['E2 D4', 1450, 558], ['W1 D5', 1650, 558]];
  const x0 = 70, y0 = 1180, hmax = 900, bw = 90, step = 124, max = 1800;
  let c = T(0, 170, 'Tests at each landing on master', { size: 28, weight: 700 }) +
    T(0, 204, 'bars: core tests · dots: browser gate records', { size: 20, op: 0.7 }) + L(x0 - 10, y0, x0 + step * land.length, y0, { sop: 0.4 });
  land.forEach(([lab, t, gt], i) => {
    const x = x0 + i * step, h = (t / max) * hmax, gy = y0 - (gt / max) * hmax;
    c += R(x, y0 - h, bw, h, { fill: C.done, fop: 0.35, stroke: C.done, sw: 2, rx: 4 }) + T(x + bw / 2, y0 - h - 12, fmt(t), { size: 20, weight: 700, anchor: 'middle' }) +
      dot(x + bw / 2, gy, 9, C.next) + T(x + bw / 2, y0 + 34, lab, { size: 18, anchor: 'middle', op: 0.85 });
    if (i) { const px = x0 + (i - 1) * step + bw / 2, pg = y0 - (land[i - 1][2] / max) * hmax; c += L(px, pg, x + bw / 2, gy, { stroke: C.next, sw: 2 }); }
  });
  c += T(x0 + step * 6 + bw + 12, y0 - (558 / max) * hmax + 7, '558', { size: 20, color: C.next, weight: 700 });
  b += g('tests-chart', c);
  // Before → after on the 2,000-mark board, on a log scale of seconds.
  const rows = [
    ['open the board', 100, 0.49], ['a stroke’s reading', 7.6, 0.016], ['replay the log', 167, 0.24],
    ['one more stroke', 0.256, 0.00015], ['a room’s line', 173, 0.00165],
  ];
  const lx = 1030, lw = 820, lo = Math.log10(0.0001), hi = Math.log10(200);
  const at = (s) => lx + ((Math.log10(s) - lo) / (hi - lo)) * lw;
  const sec = (s) => s >= 1 ? s + ' s' : s >= 0.01 ? Math.round(s * 1000) + ' ms' : (s * 1000).toFixed(s < 0.001 ? 2 : 1) + ' ms';
  let d = T(lx, 170, 'The 2,000-mark board, before → after', { size: 28, weight: 700 }) +
    T(lx, 204, 'seconds, on a log scale · coral before phase 0b · teal now', { size: 20, op: 0.7 });
  for (const [s, lab] of [[0.0001, '0.1 ms'], [0.001, '1 ms'], [0.01, '10 ms'], [0.1, '0.1 s'], [1, '1 s'], [10, '10 s'], [100, '100 s']]) {
    d += L(at(s), 236, at(s), 1150, { sop: 0.15 }) + T(at(s), 1180, lab, { size: 16, anchor: 'middle', op: 0.6 });
  }
  rows.forEach(([name, before, after], i) => {
    const y = 260 + i * 176;
    d += T(lx, y + 18, name, { size: 23, weight: 700 }) +
      R(lx, y + 32, at(before) - lx, 34, { fill: C.gap, fop: 0.45, stroke: C.gap, sw: 1.5, rx: 3 }) + T(at(before) + 10, y + 58, sec(before), { size: 20 }) +
      R(lx, y + 76, Math.max(4, at(after) - lx), 34, { fill: C.done, fop: 0.55, stroke: C.done, sw: 1.5, rx: 3 }) + T(Math.max(lx + 4, at(after)) + 10, y + 102, sec(after) + '   ×' + fmt(Math.round(before / after)), { size: 20, weight: 700 });
  });
  b += g('perf-chart', d);
  b += g('perf-notes', T(lx, 1236, '5,000 marks: crashed after 13 minutes → opens in 1.09 s', { size: 22, weight: 600 }) +
    T(lx, 1272, 'memory held at 2,000 marks: 1,058 MB → 12.4 MB', { size: 22, weight: 600 }) +
    T(lx, 1308, 'a live room’s newcomer: every log sent five times → once', { size: 22, weight: 600 }));
  return svg(W, H, b);
}

// ===== C1 · the code, as a treemap =====
function squarify(items, x, y, w, h) {
  // items: [{v, ...}] sorted descending; returns [{...item, x, y, w, h}]
  const out = [];
  const total = items.reduce((a, it) => a + it.v, 0);
  let rest = items.slice(), rx = x, ry = y, rw = w, rh = h;
  const scale = (w * h) / total;
  while (rest.length) {
    const short = Math.min(rw, rh);
    let row = [rest[0]], best = worst(row, short);
    let i = 1;
    for (; i < rest.length; i++) {
      const next = row.concat(rest[i]), wv = worst(next, short);
      if (wv > best) break;
      row = next; best = wv;
    }
    const area = row.reduce((a, it) => a + it.v * scale, 0);
    if (rw >= rh) { // lay the row down the left side
      const cw = area / rh; let cy = ry;
      for (const it of row) { const ch = (it.v * scale) / cw; out.push({ ...it, x: rx, y: cy, w: cw, h: ch }); cy += ch; }
      rx += cw; rw -= cw;
    } else {
      const ch = area / rw; let cx = rx;
      for (const it of row) { const cw2 = (it.v * scale) / ch; out.push({ ...it, x: cx, y: ry, w: cw2, h: ch }); cx += cw2; }
      ry += ch; rh -= ch;
    }
    rest = rest.slice(row.length);
  }
  return out;
  function worst(row, short) {
    const s = row.reduce((a, it) => a + it.v * scale, 0);
    const mx = Math.max(...row.map((it) => it.v * scale)), mn = Math.min(...row.map((it) => it.v * scale));
    return Math.max((short * short * mx) / (s * s), (s * s) / (short * short * mn));
  }
}
function c1() {
  const W = 3000, H = 1400;
  const layer = {
    session: ['the log', C.grey], store: ['the log', C.grey], 'index & types': ['the log', C.grey],
    'shape rung': ['read', C.done], relate: ['read', C.done], diagram: ['read', C.done], concepts: ['read', C.done], notations: ['read', C.done],
    maths: ['read', C.done], parse: ['read', C.done], kinds: ['read', C.done], image: ['read', C.done],
    tools: ['do', C.core], context: ['do', C.core], packs: ['do', C.core], behave: ['do', C.core], frames: ['do', C.core], tier1: ['do', C.core],
    participants: ['ask', C.model], llm: ['ask', C.model],
  };
  const mods = Object.entries(code.modules).map(([k, m]) => ({ k, v: m.total, n: m.new, files: m.files })).sort((a, b) => b.v - a.v);
  const total = mods.reduce((a, m) => a + m.v, 0), fresh = mods.reduce((a, m) => a + m.n, 0);
  let b = g('heading', T(0, 56, '6 · The code — the engine by module, sized by its lines', { size: 50, weight: 700 }) +
    T(2, 98, `${fmt(total)} lines in ${mods.length} modules, tests not counted · the darker part of a tile is new since 24 September: ${fmt(fresh)} lines, ${Math.round((fresh / total) * 100)}%`, { size: 23, op: 0.7 }));
  const tiles = squarify(mods, 0, 124, 2440, 1270);
  for (const t of tiles) {
    const [lay, col] = layer[t.k] || ['', C.grey];
    const pad = 3, x = t.x + pad, y = t.y + pad, w = t.w - 2 * pad, h = t.h - 2 * pad;
    const nh = h * (t.n / t.v);
    const big = Math.min(w, h) > 150 ? 30 : Math.min(w, h) > 90 ? 22 : 16;
    let body = R(x, y, w, h, { fill: col, fop: 0.16, stroke: col, sw: 2, rx: 6 });
    if (t.n) body += `<rect x="${x}" y="${y + h - nh}" width="${w}" height="${nh}" rx="6" fill="${col}" fill-opacity="0.38" stroke="none"/>`;
    if (w > 70 && h > 44) {
      body += T(x + 12, y + big + 10, t.k, { size: big, weight: 700 });
      if (h > big * 2.6) body += T(x + 12, y + big * 2 + 18, fmt(t.v) + ' lines' + (t.n ? (t.n === t.v ? ', all new' : ', ' + fmt(t.n) + ' new') : ''), { size: Math.max(14, big * 0.62), op: 0.85 });
      if (h > big * 4 && w > 260) body += T(x + 12, y + big * 3 + 22, lay + ' · ' + t.files + ' files', { size: Math.max(13, big * 0.55), op: 0.6 });
    }
    b += g('code-' + t.k.replace(/[^a-z0-9]+/gi, '-'), body);
  }
  // Beside the engine.
  const side = [['the surface', 10580, '29 fragments, one closure', C.done], ['the shard (3D)', 24585, 'its own rungs over the engine', C.done],
    ['engine tests', code.engineTests, 'beside every module', C.grey], ['the browser gate', 7838, 'harnesses and scenarios', C.grey]];
  const sx = 2480, smax = 24585;
  let s = T(sx, 150, 'Beside the engine', { size: 28, weight: 700 });
  side.forEach(([name, v, why, col], i) => {
    const y = 190 + i * 150, w = (v / smax) * 360;
    s += T(sx, y + 24, name, { size: 24, weight: 700 }) + R(sx, y + 38, w, 36, { fill: col, fop: 0.3, stroke: col, sw: 1.5, rx: 4 }) +
      T(sx + w + 10, y + 64, fmt(v), { size: 20, weight: 700 }) + T(sx, y + 104, why, { size: 18, op: 0.7 });
  });
  s += T(sx, 820, 'Colour is the layer:', { size: 22, weight: 700 }) +
    [[C.grey, 'the log and the stores'], [C.done, 'read: rungs, notations, maths'], [C.core, 'do: tools, context, packs'], [C.model, 'ask: participants, models']]
      .map(([c, t], i) => dot(sx + 14, 856 + i * 40, 12, c) + T(sx + 36, 864 + i * 40, t, { size: 19 })).join('');
  b += g('beside-the-engine', s);
  return svg(W, H, b);
}

const files = { 'a1.svg': a1(), 'a3.svg': a3(), 'b1.svg': b1(), 'b2.svg': b2(), 'b3.svg': b3(), 'c1.svg': c1() };
for (const [f, s] of Object.entries(files)) fs.writeFileSync(path.join(OUT, f), s);
console.log(Object.entries(files).map(([f, s]) => f + ' ' + s.length).join('\n'));

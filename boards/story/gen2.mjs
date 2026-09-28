// The panels that stand beside the ink (what the engine said about it), the
// gaps this board found, and the invitation. Reads the engine's own output
// from engine.json (captured from the page's engine, never typed by hand).
import fs from 'node:fs';
import path from 'node:path';
import { C, T, R, L, dot, para, svg, wrap } from './gen.mjs';

const OUT = path.dirname(new URL(import.meta.url).pathname);
const E = JSON.parse(fs.readFileSync(path.join(OUT, 'engine.json'), 'utf8'));
const g = (id, body) => `<g id="${id}">${body}</g>`;
const mono = (x, y, lines, size, o = {}) => lines.map((l, i) => T(x, y + i * size * 1.45, l.replace(/ /g, ' '), { size, ...o })).join('');

function panel(W, H, id, title, sub, reading, alsoReading, mermaidTitle, mermaid, notes) {
  let b = g(id + '-heading', T(0, 56, title, { size: 48, weight: 700 }) + para(2, 104, sub, W - 10, { size: 24, lh: 34, op: 0.8 }));
  let y = 104 + wrap(sub, W - 10, 24).length * 34 + 40;
  b += g(id + '-reading', T(2, y, 'The engine reads', { size: 26, weight: 700 }) +
    para(2, y + 44, reading, W - 10, { size: 30, lh: 40, weight: 700, color: C.core }) +
    (alsoReading ? para(2, y + 44 + wrap(reading, W - 10, 30).length * 40 + 8, alsoReading, W - 10, { size: 22, lh: 30, op: 0.8 }) : ''));
  y += 44 + wrap(reading, W - 10, 30).length * 40 + (alsoReading ? wrap(alsoReading, W - 10, 22).length * 30 + 16 : 0) + 40;
  const lines = mermaid.replace(/\n$/, '').split('\n');
  const size = Math.min(20, Math.floor((W - 30) / (0.6 * Math.max(...lines.map((l) => l.length)))));
  b += g(id + '-mermaid', T(2, y, mermaidTitle, { size: 26, weight: 700 }) +
    R(0, y + 16, W, lines.length * size * 1.45 + 34, { fill: 'currentColor', fop: 0.05, stroke: C.core, sop: 0.6, sw: 1.5, rx: 8 }) +
    mono(16, y + 16 + 30, lines, size, { op: 0.95 }));
  y += 16 + lines.length * size * 1.45 + 34 + 50;
  if (notes) b += g(id + '-notes', notes.map(([head, text, color], i) => '').join('') + notes.reduce((acc, [head, text, color]) => {
    const h = T(2, acc.y, head, { size: 24, weight: 700, color }) + para(2, acc.y + 36, text, W - 10, { size: 21, lh: 29, op: 0.9 });
    return { s: acc.s + h, y: acc.y + 36 + wrap(text, W - 10, 21).length * 29 + 26 };
  }, { s: '', y }).s);
  return svg(W, H, b);
}

// ===== 2 · a stroke's life =====
const seq = panel(1450, 1420, 'stroke-life', '2 · The life of a stroke',
  'Drawn by the MCP hand as ink — five boxes over five lifelines, six arrows, two dashed returns — and read back by the engine. The words are labels the hand put on its own marks.',
  E.seq.readings[0], null, 'and writes this Mermaid, from the ink alone', E.seq.mermaid,
  [['Not read yet — two gaps', 'The dashed returns (“readings, plural, each with a reason”; “the top offer, and why”) are left out: the dash reader finds their runs, but a run broken where it crosses a lifeline counts as three lines, and a chevron drawn at a dashed line’s end is taken for a letter.', C.gap],
   ['Zoom in to read the ink', 'Each label sits above its mark at the hand’s own scale, 13 units — small beside these panels. Names and messages are the engine’s to read; the panel is mine.', C.grey]]);

// ===== 7 · notations, live: a flowchart =====
const flow = panel(900, 1400, 'flowchart-live', '7 · Notations, live',
  'A flowchart, drawn in ink by the hand: the loop a mark goes round.',
  E.flow.readings[0], null, 'Its Mermaid', E.flow.mermaid,
  [['Next: stand it on the board', 'The engine writes this; the board cannot yet show it as a live diagram — the mermaid kind, D2’s surface half.', C.next]]);

// ===== 7 · notations, live: a class diagram =====
const uml = panel(1200, 1400, 'uml-live', 'a UML class diagram',
  'Two of the engine’s own classes, drawn in ink: a flowchart is a notation — the hollow triangle says so.',
  E.uml.readings[0], 'and, less sure, ' + E.uml.readings[1] + ' — readings stay plural, each with its number', 'Its Mermaid', E.uml.mermaid,
  [['Read it', '#59; is how Mermaid spells a semicolon inside a label; the members are the labels on each compartment line.', C.grey]]);

// ===== 8 · gaps =====
const GAPS = [
  ['mermaid-on-board', 'No Mermaid on the board', 'The engine writes Mermaid for all three notations (panels 2 and 7), but the board cannot stand it up as a live diagram.', 'the mermaid kind — D2’s surface half'],
  ['notation-in-field', 'The field does not say “a flowchart”', 'Hold these marks and the field offers shapes and concepts; the notation reading exists only inside the engine.', 'D1’s surface leftover, with D2'],
  ['labels', 'A label is a caption above, at the hand’s scale', 'A box’s name floats above its top-left at 13 units; neither a hand nor a model can put a word inside a symbol or say how big.', 'label placement and size'],
  ['dashes', 'Dashed returns are not read', 'A run broken where it crosses a lifeline splits into three; a chevron at a dashed line’s end is taken for a letter.', 'S2, with D5'],
  ['text-is-not-label', 'Words beside ink do not name it', 'A text artifact inside a box does not name the box — the first portrait’s boxes exported blank.', 'a caption binds to what it sits in'],
  ['frames', 'No sections', 'These regions are loose figures; nothing groups a panel with the ink around it, titles it and moves them together.', 'a frame primitive: group, title, move'],
  ['data-kinds', 'No table, chart or plan kinds', 'Every panel here is SVG the hand wrote from numbers; nothing redraws when the numbers change, and the plan board is typed, not read from V1-PLAN.md.', 'table and chart kinds fed by data'],
  ['live-budget', 'Twelve live figures at a time', 'The nearest twelve artifacts render and the rest park as cards; this board holds eleven on purpose.', 'a budget that scales with zoom'],
  ['comments', 'Comments are not threads', 'My replies are cards that cover a drawing on a small screen, cannot fold and cannot move; nothing ties an answer to the mark it answers.', 'a comment thread on a region'],
  ['semantic-zoom', 'No level of detail', 'From afar every panel is a grey block; near, it is dense. A figure could say its title large when far and its detail when near.', 'zoom-dependent rendering'],
  ['hands', 'Hands do not say their version', 'The hand this session loaded predated canvas_label; a stale hand from 13 days ago held the relay port and collided by name.', 'MCP hand versioning'],
  ['code-links', 'Nothing links a box to its code', 'The architecture’s boxes cannot open the files they describe.', 'a region → file:line link'],
  ['tours', 'No way to show a place', 'To bring a panel to you I moved the camera in the console; there are no named views, no tour, no “look here”.', 'named views and a tour'],
];
function gaps() {
  const W = 4200, H = 1300, cw = 1024, ch = 250, gx = 34, gy = 26;
  let b = g('gaps-heading', T(0, 56, '8 · Gaps this board found — what dyna.ink still needs to be our tool', { size: 48, weight: 700 }) +
    T(2, 100, 'each found by building the board above; the last line of each is the unit that would close it', { size: 23, op: 0.75 }));
  GAPS.forEach(([id, title, why, unit], i) => {
    const x = (i % 4) * (cw + gx), y = 130 + Math.floor(i / 4) * (ch + gy);
    b += g('gap-' + id, R(x, y, cw, ch, { fill: C.gap, fop: 0.1, stroke: C.gap, sw: 2, rx: 12 }) +
      T(x + 18, y + 40, (i + 1) + '. ' + title, { size: 26, weight: 700 }) +
      para(x + 18, y + 84, why, cw - 36, { size: 20, lh: 27, op: 0.9 }) +
      T(x + 18, y + ch - 20, '→ ' + unit, { size: 20, weight: 700, color: C.next }));
  });
  // What the board wanted from the library.
  const lib = ['kinds: mermaid · table · chart · frame (a section) · comment', 'packs: architecture@1 (systems, containers, components, dependencies) · status@1 (columns, cards, states) · state@1 · er@1 · mindmap@1 · timeline@1', 'primitives: a legend · a callout · a named view'];
  const y = 130 + 3 * (ch + gy), lx = cw + gx, lw = 3 * cw + 2 * gx;
  b += g('library-wanted', R(lx, y, lw, ch, { fill: C.next, fop: 0.08, stroke: C.next, sw: 2, rx: 12 }) +
    T(lx + 18, y + 40, 'The library this board wanted', { size: 26, weight: 700 }) +
    lib.map((l, i) => T(lx + 18, y + 90 + i * 52, '•', { size: 22 }) + para(lx + 44, y + 90 + i * 52, l, lw - 70, { size: 22, lh: 28, op: 0.92 })).join(''));
  return svg(W, H, b);
}

// ===== 9 · your turn =====
function yourTurn() {
  const W = 3000, H = 200;
  return svg(W, H, g('your-turn', T(0, 64, '9 · Your turn', { size: 56, weight: 700 }) +
    T(4, 118, 'Draw or write anywhere on the board — here, or right on a panel. Circle what you mean; arrows welcome.', { size: 26, op: 0.9 }) +
    T(4, 160, 'I read the board with canvas_look and canvas_see, answer beside your marks, and what we agree goes into V1-PLAN.md.', { size: 26, op: 0.9 })));
}

const files = { 'a4p.svg': seq, 'c2p.svg': flow, 'c3p.svg': uml, 'd1.svg': gaps(), 'd2.svg': yourTurn() };
for (const [f, s] of Object.entries(files)) fs.writeFileSync(path.join(OUT, f), s);
console.log(Object.keys(files).join(' '));

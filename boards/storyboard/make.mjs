// The storyboard board: a shot list for what dyna.ink is FOR — maths, physics, reasoning and
// design — laid out as a board you open in the app and comment on with your own pen.
//
//   node boards/storyboard/make.mjs          # writes boards/storyboard/board.jsonl
//
// Made the way scripts/examples.mjs makes the examples: from the engine (the committed Node
// bundle), on a fixed clock with seeded tremor, so the same engine makes the same bytes. Every
// shot is a REGION (I5) — a named place that holds its frame, its sketch and its notes — and each
// row of four is a region holding them, so the board's outline in the panel is the shot list.
//
// The sketches are real ink, not pictures: where a shot shows something the app does today, the
// sketch IS that thing, so the board demonstrates itself — the triangle in shot 1 says its long
// side when the hand points at it, the page in shot 2 checks its own steps, the molecule in shot 8
// is matched by the Basics pack, the flowchart in shot 11 reads as a flowchart and offers its
// Mermaid, the wireframe in shot 13 reads as a layout. Shots marked SPECCED or PROPOSED are drawn as
// the idea and say so.
//
// Notes carry no digits (a number beside a drawing is a measurement to the maths); only the maths
// shots' labels and page do, on purpose.

import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const MM = await import(pathToFileURL(join(root, 'Demos', 'dynaink-core.node.mjs')).href);

/** 4 Oct 2026, 09:00 UTC. */
const T0 = Date.UTC(2026, 9, 4, 9, 0, 0);
const GAP = 1000;

const s = MM.createSession();
let at = T0, texts = 0, seed = 1;
const tick = () => (at += GAP);
const draw = (shape) => s.addStroke(MM.handLike(MM.strokeFor(shape), seed++), tick(), undefined, 1);
const ink = (pts) => {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], n = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4)); for (let j = i ? 1 : 0; j <= n; j++) out.push({ x: a.x + (b.x - a.x) * j / n, y: a.y + (b.y - a.y) * j / n }); }
  return s.addStroke(MM.handLike(out, seed++), tick(), undefined, 1);
};
const text = (x, y, w, h, code) => {
  if (Array.isArray(code)) code = code.join('\n');
  if (typeof code !== 'string') throw new Error('a text is a string');
  texts++;
  return s.import({ kind: 'text', path: `text/${texts}.txt`, name: `text ${texts}`, bounds: { minX: x, minY: y, maxX: x + w, maxY: y + h }, code, at: tick() });
};
// A note as an svg figure: its lines left-aligned at one size in board units, so it scales with the
// board and follows the theme (figure type is the board's ink, `currentColor`). A text artifact is
// fitted line by line to its frame — every line stretched to the full width — which made short lines
// letter-spaced; an svg says exactly what it is drawn as. Lines wrap at the width, hanging under
// their label. Returns the height it took.
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const wrap = (line, cols) => {
  const out = []; let rest = line; const hang = /^[A-Z]{2,4}\s+/.test(line) ? ' '.repeat(5) : '';
  while (rest.length > cols) { let cut = rest.lastIndexOf(' ', cols); if (cut <= hang.length) cut = cols; out.push(rest.slice(0, cut)); rest = hang + rest.slice(cut).trimStart(); }
  out.push(rest); return out;
};
let notes = 0;
const note = (x, y, w, lines, { size = 17, bold = 0 } = {}) => {
  const cols = Math.floor(w / (size * 0.6));
  const rows = []; lines.forEach((l, i) => wrap(l, cols).forEach((r) => rows.push({ r, b: i < bold })));
  const lh = size * 1.45, h = Math.ceil(rows.length * lh + size * 0.5);
  const body = rows.map((o, i) => `<text x="0" y="${(size + i * lh).toFixed(1)}" font-size="${size}"${o.b ? ' font-weight="600"' : ''} xml:space="preserve">${esc(o.r)}</text>`).join('');
  const code = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%" preserveAspectRatio="xMinYMin meet" font-family="IBM Plex Mono, monospace">${body}</svg>`;
  notes++;
  s.import({ kind: 'svg', path: `notes/${notes}.svg`, name: `notes ${notes}`, bounds: { minX: x, minY: y, maxX: x + w, maxY: y + h }, code, at: tick() });
  return h;
};
// A word on a sketch, its box sized to the word: a fitted text spreads its letters to fill the width,
// so the box is as wide as the word set at its height (`writingDocument`: the font is 0.78 of the line,
// a character 0.62 of the font).
const word = (x, y, w0, h, t) => text(x, y, Math.round(t.length * 0.62 * 0.78 * h), h, t);
const region = (name, minX, minY, maxX, maxY) => s.region({ name, bounds: { minX, minY, maxX, maxY }, at: tick() });

const rect = (x, y, w, h) => ({ shape: 'rectangle', x, y, w, h });
const circ = (cx, cy, r) => ({ shape: 'circle', x: cx - r, y: cy - r, w: 2 * r, h: 2 * r });
const tri = (x, y, w, h) => ({ shape: 'triangle', x, y, w, h });
const line = (x1, y1, x2, y2) => ({ shape: 'line', from: { x: x1, y: y1 }, to: { x: x2, y: y2 } });
const arrow = (x1, y1, x2, y2) => ({ shape: 'arrow', from: { x: x1, y: y1 }, to: { x: x2, y: y2 } });

// ---- the shots ---------------------------------------------------------------------------------
// Each: a title, a status, notes (DO what the hand does · SEE what the screen shows · SAY the line on
// screen · WHY what it proves), and a sketch drawn in the frame F = { x, y, w, h } (800 × 450). The frame
// is not drawn: a stroke round each sketch would join it, and the molecule inside a box is no molecule —
// the shot's region is the frame.

const BUILT = 'BUILT — in the app today', SPECCED = 'SPECCED — in V1-SPEC, not built yet', PROPOSED = 'PROPOSED — a new idea, nothing built';

const ROWS = [
  { name: 'Maths', says: 'Maths — the numbers a drawing implies', shots: [
    { title: 'The triangle solves itself', status: BUILT,
      notes: ['DO   rule three lines, a small square in the corner, write the two legs', 'SEE  the long side appears beside the drawing, worked out', 'SAY  it does the arithmetic the drawing implies', 'WHY  maths on the page, read from the ink — no model asked', 'TRY  point at the triangle in this frame'],
      sketch(F) {
        const A = { x: F.x + 200, y: F.y + 380 }, B = { x: F.x + 680, y: F.y + 380 }, C = { x: F.x + 200, y: F.y + 220 };
        draw(line(A.x, A.y, B.x, B.y)); draw(line(C.x, C.y, A.x, A.y)); draw(line(B.x, B.y, C.x, C.y));
        draw(rect(A.x + 2, A.y - 17, 15, 15));
        text(A.x + 200, A.y + 12, 60, 30, '24″');
        text(A.x - 54, A.y - 98, 44, 30, '8″');
      } },
    { title: 'Change one number, only what depends on it moves', status: BUILT,
      notes: ['DO   change the waist on the page', 'SEE  only the steps that use it change, each with its check', 'SAY  change flows, the ink stays', 'WHY  the page is a pure function of its lines — undo springs it back', 'TRY  double-click the page and change the waist'],
      sketch(F) {
        // eight lines of near one length: eight or fewer are fitted to the frame as a caption, line by line,
        // and scale with the board (more would flow at a size the screen holds, and clip here)
        text(F.x + 60, F.y + 30, 330, 390, ['A. Waist 30', 'B. Hips 40', 'C. Long 24', '1. A ÷ 4 = 7.5', '2. B ÷ 4 = 10', '3. C + 2 = 26', '4. A + B = 70', '5. B − A = 10'].join('\n'));
        draw(arrow(F.x + 520, F.y + 120, F.x + 700, F.y + 120));
        draw(arrow(F.x + 520, F.y + 260, F.x + 700, F.y + 260));
      } },
    { title: 'A pattern piece, printed at true size', status: BUILT,
      notes: ['DO   draw a piece with its grain line, notches and a seam allowance', 'SEE  cut and sewn sizes beside it, then the print — a test square on every page', 'SAY  from a sketch to scissors', 'WHY  the drawing has a real size, and a printer cannot fake it', 'TRY  hold the piece here and read what it says it is'],
      sketch(F) {
        // As core's garment fixture draws one, at 0.7: the piece and its cutting line, a grain line with a
        // chevron at each end (each chevron one stroke), two notches across the left edge, a dart from the top.
        const k = 0.7, ox = F.x + 260, oy = F.y + 225;
        const P = (x, y) => ({ x: ox + (x - 300) * k, y: oy + (y - 340) * k });
        const box = (minX, minY, maxX, maxY) => { const a = P(minX, minY), b = P(maxX, maxY); draw(rect(a.x, a.y, b.x - a.x, b.y - a.y)); };
        box(120, 80, 480, 600);
        box(92, 52, 508, 628);
        const g0 = P(300, 150), g1 = P(300, 530);
        draw(line(g0.x, g0.y, g1.x, g1.y));
        const w = 22 * k * 0.87, h = 22 * k * 0.5;
        ink([{ x: g0.x - h, y: g0.y + w }, g0, { x: g0.x + h, y: g0.y + w }]);
        ink([{ x: g1.x - h, y: g1.y - w }, g1, { x: g1.x + h, y: g1.y - w }]);
        for (const y of [250, 420]) { const a = P(108, y), b = P(134, y); draw(line(a.x, a.y, b.x, b.y)); }
        const d0 = P(190, 80), d1 = P(240, 80), dA = P(215, 250);
        ink([d0, dA, d1]);
        // the printed sheet, and its test square
        draw(rect(F.x + 540, F.y + 70, 200, 260));
        draw(rect(F.x + 560, F.y + 270, 40, 40));
      } },
    { title: 'Ask a sum, in the field', status: BUILT,
      notes: ['DO   type an equals sign and a sum, with the page’s own names', 'SEE  the answer before Enter, then the words stand on the board', 'SAY  the canvas is a calculator that reads your page', 'WHY  tier one does the arithmetic, never a model', 'TRY  hold a mark, type = and a sum'],
      sketch(F) {
        draw(rect(F.x + 160, F.y + 110, 480, 230));
        draw(rect(F.x + 190, F.y + 140, 420, 60));
        draw(circ(F.x + 220, F.y + 270, 22)); draw(circ(F.x + 280, F.y + 270, 22));
        draw(rect(F.x + 340, F.y + 250, 120, 40)); draw(rect(F.x + 480, F.y + 250, 120, 40));
      } },
  ] },
  { name: 'Physics', says: 'Physics — drawings that move by rules', shots: [
    { title: 'Draw a pendulum, it swings', status: PROPOSED,
      notes: ['DO   draw a pivot, a rod and a weight', 'SEE  it is read as a pendulum and starts to swing; its length sets the period', 'SAY  Chalktalk’s road — the drawing is the simulation', 'WHY  a reading becomes a model you can poke', 'NEED a physics notation and a step in the clock — not in the engine yet'],
      sketch(F) {
        const px = F.x + 400, py = F.y + 60;
        draw(line(px - 120, py, px + 120, py));
        draw(line(px, py, px + 4, py + 260));
        draw(circ(px + 4, py + 310, 48));
        draw(arrow(px - 80, py + 330, px - 200, py + 280));
        draw(arrow(px + 90, py + 330, px + 210, py + 280));
      } },
    { title: 'A tank of drawn creatures, told what to do in words', status: BUILT,
      notes: ['DO   draw a fish, name it, write what it does in a few words', 'SEE  every fish like it swims by those words — wander, flee what is bigger', 'SAY  verbs from words, no code', 'WHY  the words are read into a closed set of verbs, and undo re-runs the tank', 'TRY  drag a body while it plays to act a behaviour out'],
      sketch(F) {
        draw(rect(F.x + 40, F.y + 40, 720, 370));
        draw(circ(F.x + 260, F.y + 200, 60)); draw(tri(F.x + 140, F.y + 150, 70, 100));
        draw(circ(F.x + 560, F.y + 300, 30)); draw(tri(F.x + 600, F.y + 275, 40, 50));
        draw(arrow(F.x + 520, F.y + 320, F.x + 420, F.y + 370));
      } },
    { title: 'Forces as arrows, added up', status: PROPOSED,
      notes: ['DO   draw a block on a ramp and an arrow for each force', 'SEE  the arrows read as vectors, summed tip to tail; the block slides the way the sum points', 'SAY  a free-body diagram that runs', 'WHY  an arrow’s length and heading are already measured — the sum is not built', 'NEED a vector notation and a run'],
      sketch(F) {
        draw(tri(F.x + 80, F.y + 180, 640, 230));
        draw(rect(F.x + 360, F.y + 200, 90, 70));
        draw(arrow(F.x + 405, F.y + 235, F.x + 405, F.y + 400));
        draw(arrow(F.x + 405, F.y + 235, F.x + 340, F.y + 110));
        draw(arrow(F.x + 405, F.y + 235, F.x + 560, F.y + 290));
      } },
    { title: 'A molecule stands up in space', status: BUILT,
      notes: ['DO   draw atoms and bonds, hold them', 'SEE  the molecule is recognised, then Show it in three dimensions — spheres you can turn', 'SAY  a sketch becomes a model', 'WHY  the Basics pack is in use: nothing was taught, the match is grounded', 'TRY  hold the molecule here — it says molecule'],
      sketch(F) {
        const cx = F.x + 400, cy = F.y + 230;
        for (const sh of [circ(cx - 150, cy + 60, 40), circ(cx, cy - 60, 40), circ(cx + 150, cy + 60, 40), line(cx - 115, cy + 35, cx - 35, cy - 35), line(cx + 35, cy - 35, cx + 115, cy + 35)]) draw(sh);
      } },
  ] },
  { name: 'Reasoning', says: 'Reasoning — readings that say why', shots: [
    { title: 'Ask why, and get the evidence', status: BUILT,
      notes: ['DO   draw a box, point at it, open details', 'SEE  what it is read as, how sure, and why — its corners, how much of its box it fills', 'SAY  every reading carries its evidence', 'WHY  confidence is measured, never assigned; several readings stand at once', 'TRY  point at any mark on this board and open details in the panel'],
      sketch(F) {
        draw(rect(F.x + 80, F.y + 120, 260, 200));
        draw(rect(F.x + 420, F.y + 90, 320, 260));
        draw(line(F.x + 340, F.y + 220, F.x + 420, F.y + 220));
        note(F.x + 440, F.y + 110, 280, ['rectangle', 'four corners, closed', 'fills its own box', 'or: a frame', 'or: a page'], { size: 22, bold: 1 });
      } },
    { title: 'Two readings tie — ask the decider', status: BUILT,
      notes: ['DO   draw something two of your definitions both match', 'SEE  Which is it? is offered; one tap asks a decision model, its answer held beside the engine’s', 'SAY  a second opinion, only when you ask', 'WHY  a model is asked by a deliberate act, and its answer never evicts the engine’s', 'NEED a decider seat joined in the models pane'],
      sketch(F) {
        draw(circ(F.x + 400, F.y + 230, 70));
        draw(line(F.x + 360, F.y + 200, F.x + 440, F.y + 260));
        draw(arrow(F.x + 320, F.y + 200, F.x + 160, F.y + 120));
        draw(arrow(F.x + 480, F.y + 200, F.x + 640, F.y + 120));
        word(F.x + 60, F.y + 60, 200, 50, 'bubble?');
        word(F.x + 560, F.y + 60, 200, 50, 'molecule?');
      } },
    { title: 'The flowchart runs', status: SPECCED,
      notes: ['DO   draw a flowchart by hand, hold it, choose Make it Mermaid — built', 'SEE  then a token walks it, a decision asks, the path is kept as a trace — specced', 'SAY  draw the logic, then run it', 'WHY  the reading is a structure, so it can be executed', 'TRY  hold this flowchart — it reads as one and offers its Mermaid'],
      sketch(F) {
        const d = MM.drawMermaid(s, 'flowchart LR\n  a(["sign up"]) --> b{"paid?"}\n  b -->|"yes"| c["welcome"]\n  b -->|"no"| e["remind"]', { at: tick(), origin: { x: F.x + 40, y: F.y + 120 }, scale: 1.55 });
        at = Math.max(at, d.lastAt);
      } },
    { title: 'Claude as a second hand on the board', status: BUILT,
      notes: ['DO   ask What is this? with Claude Code in the seat', 'SEE  the question parked in the room, Claude’s answer held and attributed — never blessed', 'SAY  it proposes, you keep', 'WHY  a model gets the drawing’s structure, not a screenshot', 'TRY  live tile, with Claude, then the models pane'],
      sketch(F) {
        draw(rect(F.x + 80, F.y + 140, 220, 160));
        draw(rect(F.x + 440, F.y + 100, 300, 140));
        draw(arrow(F.x + 440, F.y + 200, F.x + 310, F.y + 220));
        note(F.x + 460, F.y + 120, 260, ['claude', 'a sign-up flow?', 'held for you'], { size: 22, bold: 1 });
        draw(circ(F.x + 600, F.y + 330, 30));
      } },
  ] },
  { name: 'Design', says: 'Design — sketches that become the thing', shots: [
    { title: 'A sketch becomes a living page', status: BUILT,
      notes: ['DO   draw the boxes of a page, hold them, type what the page is about', 'SEE  a real page renders in place, your ink still outlining its parts', 'SAY  draw the layout, get the code', 'WHY  the engine owns the structure, a model only the words', 'TRY  hold this wireframe — it reads as a layout'],
      sketch(F) {
        const x = F.x + 180, y = F.y + 30;
        draw(rect(x, y, 440, 70));
        draw(rect(x, y + 90, 140, 220)); draw(rect(x + 160, y + 90, 280, 220));
        draw(rect(x, y + 330, 440, 60));
      } },
    { title: 'Tidy the diagram', status: BUILT,
      notes: ['DO   draw boxes and tied arrows anyhow, hold them, choose Tidy the diagram', 'SEE  ranks line up, connectors route at right angles round what is in the way', 'SAY  messy in, clean out — in one undo', 'WHY  the route is derived from where the boxes stand, so it follows every move', 'TRY  tie arrows to boxes, then hold them'],
      sketch(F) {
        draw(rect(F.x + 80, F.y + 60, 150, 90)); draw(rect(F.x + 330, F.y + 200, 150, 90)); draw(rect(F.x + 560, F.y + 90, 150, 90));
        draw(arrow(F.x + 230, F.y + 120, F.x + 330, F.y + 230));
        draw(arrow(F.x + 480, F.y + 230, F.x + 560, F.y + 150));
        draw(arrow(F.x + 400, F.y + 300, F.x + 400, F.y + 400));
      } },
    { title: 'Colour follows meaning', status: SPECCED,
      notes: ['DO   say what a few notes are — an idea, evidence, an assumption', 'SEE  each takes its kind’s colour; kin share a hue, opposites sit across the wheel', 'SAY  colour is never picked, it is meant', 'WHY  hue is the kind, lightness the depth, how vivid is how sure', 'SEE  brand, colour space specimen'],
      sketch(F) {
        draw(circ(F.x + 160, F.y + 140, 60)); draw(circ(F.x + 330, F.y + 300, 60)); draw(circ(F.x + 500, F.y + 150, 60));
        draw(circ(F.x + 660, F.y + 230, 90));
        word(F.x + 110, F.y + 210, 120, 40, 'idea'); word(F.x + 270, F.y + 370, 140, 40, 'evidence'); word(F.x + 430, F.y + 220, 160, 40, 'assumption');
      } },
    { title: 'Notes into places', status: BUILT,
      notes: ['DO   circle a cluster of notes and type region and a name', 'SEE  a named place that holds what stands in it; find any word across every board', 'SAY  a notebook that organises itself — orbits are specced next', 'WHY  what a region holds is derived, never copied, so a note dragged out is let go', 'TRY  this board — every shot is a region; the outline is in the panel'],
      sketch(F) {
        draw(rect(F.x + 60, F.y + 60, 330, 330));
        for (let i = 0; i < 4; i++) draw(line(F.x + 100, F.y + 120 + i * 60, F.x + 340 - i * 30, F.y + 120 + i * 60));
        for (let i = 0; i < 3; i++) draw(line(F.x + 470, F.y + 140 + i * 70, F.x + 700 - i * 40, F.y + 150 + i * 70));
        word(F.x + 80, F.y + 70, 200, 40, 'Monday');
      } },
  ] },
];

// ---- the layout --------------------------------------------------------------------------------
const CELL_W = 880, CELL_H = 1180, GAP_X = 80, PAD = 40, HEAD = 90, ROW_GAP = 140;
const ROW_W = 4 * CELL_W + 3 * GAP_X + 2 * PAD;
const ROW_H = HEAD + CELL_H + PAD;

// read me first
const TOP = -760;
note(0, TOP + 40, 1760, ['dyna.ink — a shot list, drawn on dyna.ink', 'Sixteen shots for what the canvas is for: maths, physics, reasoning and design.', 'Each shot is a region — its sketch, what it shows, and room under it for you.', 'BUILT shots are live: point at or hold their sketches and the canvas answers.', 'SPECCED is in the spec, PROPOSED is new — neither is built yet.'], { size: 30, bold: 1 });
note(1960, TOP + 40, 1760, ['How to comment', 'Draw or write anywhere: circle a shot you love, scratch one out, arrow a new order.', 'Double-click empty ground to type a note; drag a shot by its title to reorder.', 'The outline in the panel lists every shot, and Find looks for any word.', 'Then export board + pictures and send the file back — I read your marks with the engine.'], { size: 30, bold: 1 });
region('Read me first', -40, TOP, ROW_W + 40, TOP + 400);

let n = 0;
ROWS.forEach((row, r) => {
  const y0 = r * (ROW_H + ROW_GAP);
  row.shots.forEach((shot, c) => {
    n++;
    const x = PAD + c * (CELL_W + GAP_X), y = y0 + HEAD;
    const F = { x: x + 40, y: y + 70, w: 800, h: 450 };
    shot.sketch(F);
    note(x + 40, y + 555, 800, [shot.status, ...shot.notes], { size: 23, bold: 1 });
    region(`Shot ${n} · ${shot.title}`, x, y, x + CELL_W, y + CELL_H);
  });
  region(row.says, 0, y0, ROW_W, y0 + ROW_H);
});

// your turn: an empty place for new shots
const yEnd = ROWS.length * (ROW_H + ROW_GAP);
region('YOUR SHOTS — draw the ones I missed here', 0, yEnd, ROW_W, yEnd + 1000);

s.use('basics@1', tick());
s.deselect(tick());

const events = s.getEvents();
writeFileSync(join(here, 'board.jsonl'), MM.encodeLog(events));

// What the engine reads of it, said back — the proof that the live shots are live.
const st = s.getState();
const regions = MM.regionOutline ? MM.regionOutline(st) : [];
console.log(`${events.length} events, ${events.filter((e) => e.type === 'stroke').length} strokes, ${st.regions?.length ?? 0} regions`);
console.log('outline:', regions.map((e) => '  '.repeat(e.depth ?? 0) + (e.name ?? e.id)).join('\n'));

// Make the example boards a first-time hand can open (V1-PLAN.md §9 R5).
//
//   node scripts/examples.mjs            # writes what changed under boards/examples/
//   node scripts/examples.mjs --check    # exits 1 naming every file that is no longer what this makes (CI)
//
// An example is a LOG — one event per line, as the app's export writes it and the boards pane
// opens it — made here from the engine and never drawn by hand: a Mermaid text drawn with
// `drawMermaid`, strokes from `strokeFor` given a seeded tremor (`handLike`, the way the
// library packs' own drawings are), a pack used by `use`, texts as a hand types them. So an
// example shows what the engine reads TODAY: when the engine changes what a drawing reads as,
// the committed file is no longer what this makes and CI says so, and the remedy is to run this
// and commit the result. Everything is deterministic — a fixed clock, fixed seeds, no
// randomness — so the same engine makes the same bytes on every machine.
//
// It imports the committed Node bundle the MCP hand runs (`Demos/metamedium-core.node.mjs`), so
// the engine it asks is the one that is drift-checked against `metamedium-core/src`.
//
//   flowchart.jsonl      boxes and arrows read as a flowchart, its Mermaid beside it (D1, D2)
//   class-diagram.jsonl  three classes, a composition and an association (D4)
//   molecule.jsonl       the Basics pack in use: two molecules and a bubble, nothing taught (B3)
//   pattern-page.jsonl   a right triangle with 24 and 8 on its legs, a page of steps (M5)
//   index.json           what the boards pane lists: name, what it shows, file, marks; the starter
//
// Every note on a board says what to do with it in the person's words and carries no digit: a
// number written near a drawing is a measurement to the maths, and a note is not one. (A colon or a
// dash is no longer a worry: a line of words is not read as maths, F2, and says nothing.)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const EXAMPLES_DIR = 'boards/examples';
/** 29 Sep 2026, 09:00 UTC — the first event of every example. */
export const T0 = Date.UTC(2026, 8, 29, 9, 0, 0);
/** The gap between two strokes, as a hand leaves it: no two are close enough to gather into a word. */
const GAP = 1000;
/** The example a first run starts from: the Basics pack, which is the canonical loop's vocabulary. */
export const STARTER = 'molecule';

const FLOWCHART = `flowchart TD
    a(["Start"]) --> b["Draw a box"]
    b --> c{"Hold it?"}
    c -->|"yes"| d["Choose what it becomes"]
    c -->|"no"| f["Draw more marks"]
    d --> e(["Done"])
    f --> e
`;

const CLASSES = `classDiagram
    direction LR
    class c1["Customer"] {
        +name: String
    }
    class c2["Order"] {
        +date: Date
        +total() Money
    }
    class c3["Item"]
    c1 "1" --> "*" c2 : places
    c2 "1" *-- "1..*" c3
`;

// A page of steps as garment drafting writes them (MATHS-PLAN's apron): three measures, an allowance, and six steps that each check
// themselves — some read two ways (an allowance either added or not), and the check says the other reading. Nine lines and more flow
// as a page at a size the screen holds; fewer would be fitted to their frame like a caption (`TEXT_FITS_LINES`).
const PATTERN_PAGE = ['A. Bust 36', 'B. Top to waist 20', 'C. Top to bottom 46', 'Add seam allowance', '1. A ÷ 3 = 12 + 2 = 14', '2. ① ÷ 2 = 14 ÷ 2 = 7', '3. B 20 + 2 = 22', '4. C 48', '5. A 38"', '6. (C × 2) − B 72"'].join('\n');

/** A session that writes text artifacts the way the surface's `typeText` does, and strokes the way a hand's pen does. */
function hand(MM) {
  const s = MM.createSession();
  let at = T0, texts = 0, seed = 1;
  const tick = () => (at += GAP);
  return {
    s,
    tick,
    now: () => at,
    /** A clean shape drawn as a hand draws it: a seeded tremor, one stroke. */
    draw(shape) { return s.addStroke(MM.handLike(MM.strokeFor(shape), seed++), tick(), undefined, 1); },
    /** A text at a point, its words as its code — `typeText`, in 19-text.js. */
    text(x, y, w, h, code) {
      texts++;
      return s.import({ kind: 'text', path: `text/${texts}.txt`, name: `text ${texts}`, bounds: { minX: x, minY: y, maxX: x + w, maxY: y + h }, code, at: tick() });
    },
    after(t) { at = Math.max(at, t); },
  };
}
const circle = (cx, cy, r) => ({ shape: 'circle', x: cx - r, y: cy - r, w: 2 * r, h: 2 * r });
const box = (x, y, w, h) => ({ shape: 'rectangle', x, y, w, h });
const bond = (x1, y1, x2, y2) => ({ shape: 'line', from: { x: x1, y: y1 }, to: { x: x2, y: y2 } });

function flowchart(MM) {
  const h = hand(MM);
  const drawn = MM.drawMermaid(h.s, FLOWCHART, { at: h.now() + GAP, origin: { x: 120, y: 120 } });
  h.after(drawn.lastAt);
  // The Mermaid beside it: the tool's own act, taken as the field would take it.
  const marks = Object.values(drawn.ids).concat(drawn.links.flatMap((l) => l.ids));
  const held = h.s.summonMarks(marks, h.tick());
  if (!held) throw new Error('the flowchart could not be held');
  const scope = MM.toolScope(h.s);
  const offer = MM.offersFor(scope).find((o) => o.key === 'mermaid');
  if (!offer) throw new Error('the flowchart is not offered as Mermaid');
  MM.takeOffer(offer, scope, h.s, h.tick());
  // Nothing is left held: the field closed, the marks let go — the board opens as a hand left it, at rest.
  h.s.dismiss(held, h.tick());
  h.s.deselect(h.tick());
  h.text(120, 700, 560, 90, 'Hold the drawing to see what the canvas reads it as.\nThe Mermaid beside it is that reading, written out.\nEdit it, hold it, choose Draw it to put it back.');
  return h.s;
}

function classDiagram(MM) {
  const h = hand(MM);
  const drawn = MM.drawMermaid(h.s, CLASSES, { at: h.now() + GAP, origin: { x: 120, y: 120 } });
  h.after(drawn.lastAt);
  h.text(120, 300, 560, 90, 'Three classes, a composition and an association,\nread as a UML class diagram. Hold it and choose\nMake it Mermaid to have it written as text.');
  return h.s;
}

function molecule(MM) {
  const h = hand(MM);
  h.s.use('basics@1', h.tick());
  // The canonical loop's molecule: three bubbles, two bonds that stop a little short of them …
  for (const shape of [circle(200, 200, 40), circle(380, 200, 40), circle(290, 340, 40), bond(245, 200, 335, 200), bond(220, 245, 270, 320)]) h.draw(shape);
  // … another, three in a row …
  for (const shape of [circle(620, 200, 40), circle(780, 200, 40), circle(940, 200, 40), bond(660, 200, 740, 200), bond(820, 200, 900, 200)]) h.draw(shape);
  // … and one bubble on its own.
  h.draw(circle(620, 400, 40));
  h.text(120, 470, 560, 120, 'The Basics pack is in use and nothing here was taught.\nHold a molecule and the field says what it reads as.\nHold the lone bubble and it says bubble. Draw more\nmolecules anywhere and they are read the same way.');
  return h.s;
}

function patternPage(MM) {
  const h = hand(MM);
  // The page of steps, left; each step checks itself at the end of its line.
  h.text(100, 120, 360, 300, PATTERN_PAGE);
  // A right triangle ruled in three lines with a small square in its corner: legs of 24 and 8 (480 and 160 units), the long side between.
  const dx = 560;
  const A = { x: 420 + dx, y: 420 }, B = { x: 900 + dx, y: 420 }, C = { x: 420 + dx, y: 260 };
  h.draw(bond(A.x, A.y, B.x, B.y));
  h.draw(bond(C.x, C.y, A.x, A.y));
  h.draw(bond(B.x, B.y, C.x, C.y));
  h.draw(box(A.x + 2, A.y - 17, 15, 15));
  h.text(620 + dx, 432, 60, 30, '24″');
  h.text(366 + dx, 322, 44, 30, '8″');
  h.text(100, 500, 620, 120, 'Hold the triangle and the canvas says its long side\nfrom the two legs written beside it. Change a number\non the page and only the steps that use it change.\nUndo puts them back. Print at true size is in the field.');
  return h.s;
}

/** The examples, in the order the pane lists them. `says` is the pane's one line. */
export const EXAMPLES = [
  { id: 'flowchart', name: 'Flowchart', says: 'boxes and arrows read as a flowchart, with the Mermaid it says beside them', make: flowchart },
  { id: 'class-diagram', name: 'Class diagram', says: 'three classes, a composition and an association, read as a UML class diagram', make: classDiagram },
  { id: 'molecule', name: 'Molecule', says: 'the Basics pack in use: two molecules and a bubble, read with nothing taught', make: molecule },
  { id: 'pattern-page', name: 'Pattern page', says: 'a right triangle with 24 and 8 on its legs says its long side, and a page of steps checks itself', make: patternPage },
];

/**
 * The examples as files: `files` maps a file name to its text (a log, one event per line, a trailing
 * newline — `encodeLog`), `index` is what the boards pane reads. Pure, and the same twice.
 */
export function makeExamples(MM) {
  const files = {};
  const list = [];
  for (const ex of EXAMPLES) {
    const s = ex.make(MM);
    const events = s.getEvents();
    files[`${ex.id}.jsonl`] = MM.encodeLog(events);
    list.push({ id: ex.id, name: ex.name, says: ex.says, file: `${ex.id}.jsonl`, marks: events.filter((e) => e.type === 'stroke').length });
  }
  return { index: { starter: STARTER, examples: list }, files };
}

const indexText = (index) => JSON.stringify(index, null, 2) + '\n';
/** Every file of the examples, by its path under the folder: the logs, then the index. */
function fileTexts(made) {
  return { ...made.files, 'index.json': indexText(made.index) };
}

/** The files under `root`'s boards/examples that are not what `makeExamples` makes — missing, or different. */
export function checkExamples(root, MM) {
  const dir = join(root, EXAMPLES_DIR);
  const drifted = [];
  for (const [name, text] of Object.entries(fileTexts(makeExamples(MM)))) {
    const at = join(dir, name);
    if (!existsSync(at) || readFileSync(at, 'utf8') !== text) drifted.push(`${EXAMPLES_DIR}/${name}`);
  }
  return drifted;
}

/** Write what changed; the names of the files written. */
export function writeExamples(root, MM) {
  const dir = join(root, EXAMPLES_DIR);
  mkdirSync(dir, { recursive: true });
  const wrote = [];
  for (const [name, text] of Object.entries(fileTexts(makeExamples(MM)))) {
    const at = join(dir, name);
    if (existsSync(at) && readFileSync(at, 'utf8') === text) continue;
    writeFileSync(at, text);
    wrote.push(`${EXAMPLES_DIR}/${name}`);
  }
  return wrote;
}

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const MM = await import(pathToFileURL(join(root, 'Demos', 'metamedium-core.node.mjs')).href);
  if (process.argv.includes('--check')) {
    const drifted = checkExamples(root, MM);
    if (drifted.length) {
      console.error('The examples are not what scripts/examples.mjs makes — run `node scripts/examples.mjs` and commit the result:\n  ' + drifted.join('\n  '));
      process.exit(1);
    }
    console.log('the examples are what scripts/examples.mjs makes');
  } else {
    const wrote = writeExamples(root, MM);
    console.log(wrote.length ? 'wrote ' + wrote.join(', ') : 'nothing changed');
  }
}

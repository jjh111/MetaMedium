// Builds the board in the room the running hand is in: the six panels, then the
// three ink diagrams with their labels. No `why` on a draw — a why is an answer
// card, and cards cover the drawing. Ids are read from each draw's reply.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const hand = (tool, args) => {
  const f = path.join(DIR, '.b-' + tool + '.json');
  fs.writeFileSync(f, JSON.stringify(args));
  return execFileSync('node', [path.join(DIR, 'hand.mjs'), 'call', tool, f], { encoding: 'utf8' });
};
const put = (file, name, x, y, w, h) => hand('canvas_write', { kind: 'svg', code: fs.readFileSync(path.join(DIR, file), 'utf8'), name, bounds: { x, y, w, h } }).trim();
const ids = {};

// Panels whose content does not depend on the ink.
for (const [f, n, x, y, w, h] of [
  ['a1.svg', '0 · dyna.ink — read me first', 0, 0, 1500, 1420], ['a3.svg', '1 · architecture', 1700, 0, 2600, 1420],
  ['b1.svg', '3 · the plan', 0, 1700, 3000, 1400], ['b2.svg', '4 · true use', 3200, 1700, 2000, 1400],
  ['b3.svg', '5 · numbers', 5400, 1700, 2000, 1400], ['c1.svg', '6 · the code', 0, 3400, 3000, 1400],
]) ids[f] = put(f, n, x, y, w, h).split(' ')[0];

function draw(file) {
  const args = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
  delete args.why;
  return hand('canvas_draw', args).trim().split('\n').map((l) => l.split(' → ')[0]);
}
function label(id, text) { return hand('canvas_label', { id, text }).trim(); }

// 2 · the life of a stroke
const s = draw('seq-draw.json');
const lay = JSON.parse(fs.readFileSync(path.join(DIR, 'seq-layout.json'), 'utf8'));
const seqLabels = [[0, 'Hand'], [1, 'Surface'], [2, 'Session'], [3, 'Readers'], [4, 'Field'],
  [10, 'a stroke — pen, finger or mouse'], [11, 'addStroke: one event in this hand’s log'], [12, 'read it: shape, relations, roles'],
  [lay.nShapes + lay.returnsAt, 'readings, plural, each with a reason'], [13, 'offers from the tools, ranked by context'],
  [lay.nShapes + lay.secondReturn, 'the top offer, and why'], [14, 'take it'], [15, 'one act: events stamped with the tool']];
for (const [i, t] of seqLabels) console.log(label(s[i], t));

// 7 · a flowchart and a class diagram
const f = draw('flow-draw.json');
for (const [i, t] of [[0, 'start'], [2, 'Draw a mark'], [10, 'Does the engine read it?'], [5, 'Take an offer'], [11, 'an artifact'],
  [8, 'Name it, or teach it'], [4, 'yes'], [7, 'no'], [9, 'try again']]) console.log(label(f[i], t));
const u = draw('uml-draw.json');
for (const [i, t] of [[0, 'Notation'], [1, 'id; roles'], [2, 'read(scope); ports()'], [3, 'Flowchart'], [4, 'table'], [5, 'toMermaid()']]) console.log(label(u[i], t));

fs.writeFileSync(path.join(DIR, 'ids.json'), JSON.stringify({ panels: ids, seq: s, flow: f, uml: u }, null, 1));
console.log('panels', JSON.stringify(ids));

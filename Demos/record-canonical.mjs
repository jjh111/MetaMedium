// Record the canonical loop as a session log — a FIGURE for the whitepaper.
//
//   node Demos/record-canonical.mjs
//
// Runs the executable spec (metamedium-core/src/session/session.scenario.test.ts)
// through the built engine with hand-drawn strokes, and writes every event
// plus a caption per step to Demos/recordings/canonical-loop.json. The
// reference surface replays it with ?replay=recordings/canonical-loop.json;
// no model is needed, because none was involved. State is a pure function of
// the log, so what the reader steps through is exactly what happened here.

import { readFileSync, writeFileSync } from 'node:fs';

// The committed browser bundle is an IIFE that defines a global; evaluate it
// and take the global. Same code the surface runs, so the recording replays
// there byte for byte.
const bundle = readFileSync(new URL('./metamedium-core.browser.js', import.meta.url), 'utf8');
const { createSession } = new Function(bundle + '\nreturn MetaMediumCore;')();

// Hand-ish generators: the same idea as metamedium-core/src/test/strokes.ts,
// kept tiny here so the recording script has no test-only import.
let seed = 7;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const jit = (a) => (rnd() - 0.5) * a;
function circle(cx, cy, r, n = 100) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2 - 0.3;
    out.push({ x: cx + (r + jit(2)) * Math.cos(t), y: cy + (r + jit(2)) * Math.sin(t) });
  }
  return out;
}
function line(a, b, n = 50) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    out.push({ x: a.x + (b.x - a.x) * t + jit(1.5), y: a.y + (b.y - a.y) * t + jit(1.5) });
  }
  return out;
}
function check(x, y, k = 1) {
  return line({ x, y }, { x: x + 25 * k, y: y + 35 * k }, 30).concat(line({ x: x + 25 * k, y: y + 35 * k }, { x: x + 70 * k, y: y - 15 * k }, 30).slice(1));
}
const molecule = (dx, dy) => [
  circle(200 + dx, 200 + dy, 40), circle(380 + dx, 200 + dy, 40), circle(290 + dx, 340 + dy, 40),
  line({ x: 245 + dx, y: 200 + dy }, { x: 335 + dx, y: 200 + dy }),
  line({ x: 220 + dx, y: 245 + dy }, { x: 270 + dx, y: 320 + dy }),
];

const s = createSession();
let t = 1000;
const at = () => (t += 900);
const steps = []; // { after: eventCount, caption }
const mark = (caption) => steps.push({ after: s.getEvents().length, caption });

// 1. A circle, named "bubble".
const c1 = s.addStroke(circle(200, 200, 40), at());
mark('Draw a circle. The engine reads it — circle, with a measured reason — and holds the reading. Nothing is committed.');
s.addStroke(circle(200, 200, 75), at());
s.addStroke(check(255, 170, 1), at()); // across the lasso's edge
if (!s.getState().summon) throw new Error('no summon: ' + JSON.stringify(s.getState().markMiss));
mark('Circle it and cross it with the check: the group is summoned, and the palette offers what it could become.');
s.bless({ summonId: s.getState().summon.id, name: 'bubble', at: at() });
mark('Name it "bubble". The name is a sign you made: the circle is now a held artifact, with a signature the engine can match again.');

// 2. Three bubbles and two lines, named "molecule".
const m1 = molecule(400, 0).map((p) => s.addStroke(p, at()));
mark('Draw three circles and two lines joining them. The engine reads each mark — circle, line — and the relations between them: three peers, two edges.');
s.addStroke(circle(690, 270, 190), at());
s.addStroke(check(860, 240, 1), at());
if (!s.getState().summon) throw new Error('no summon 2: ' + JSON.stringify(s.getState().markMiss));
mark('Circle the group and cross it. The palette reads the arrangement — three nodes joined by two edges, a flow — and offers what it could become.');
s.bless({ summonId: s.getState().summon.id, name: 'molecule', at: at() });
mark('Name it "molecule". A composition: bubbles and lines, in this arrangement, as one thing.');

// 3. The same arrangement elsewhere is recognised.
const m2 = molecule(0, 420).map((p) => s.addStroke(p, at()));
mark('Draw the same arrangement again, elsewhere. Before you circle anything, the engine has matched its signature to the one you named: molecule?');
s.addStroke(circle(290, 690, 190), at());
s.addStroke(check(460, 660, 1), at());
if (!s.getState().summon) throw new Error('no summon 3: ' + JSON.stringify(s.getState().markMiss));
mark('Circle it and cross it: the palette leads with "It\'s a molecule" — the composition you named, recognised by its signature.');
const sum = s.getState().summon;
const match = sum.suggestions.find((x) => x.kind === 'match');
s.bless({ summonId: sum.id, suggestionId: match ? match.id : undefined, name: match ? undefined : 'molecule', at: at() });
mark('Accept it. Two molecules are held; the vocabulary is yours, and the engine reads with it. Draw on to continue.');

const state = s.getState();
const out = {
  title: 'The canonical loop',
  recordedAt: new Date().toISOString(),
  engine: 'metamedium-core',
  steps,
  events: s.getEvents(),
};
writeFileSync(new URL('./recordings/canonical-loop.json', import.meta.url), JSON.stringify(out));
console.log('events', out.events.length, 'steps', steps.length, 'artifacts', state.artifacts.length, 'matched', !!match, 'names', state.artifacts.map((id) => (state.nodes.get(id).reps.find((r) => r.modality === 'word') || {}).data));

#!/usr/bin/env node
//
// A user's walk (PLAN-FIELD-PAR.md §1): the canvas driven as a person drives it —
// real pointer input through `page.mouse`, never the session's own doors — and
// what the field offers recorded at each step, nothing typed and then each word
// a person might type.
//
//     node e2e/walk.mjs              # every scene, Chromium; JSON and screenshots in e2e/results/walk/
//     node e2e/walk.mjs john         # the scenes whose name holds "john"
//
// Beside the gate, like `perf.mjs`, on its static server and model guard, and
// never run by it or by CI: its product is a map of what a hand meets, not a
// verdict. What it finds becomes a unit with a record in the gate.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startStatic } from './servers.mjs';
import { isModelRequest } from './guards.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'e2e', 'results', 'walk');
mkdirSync(out, { recursive: true });
const only = process.argv[2] || '';

// --- the hand: strokes as a person draws them, in screen pixels ---
const lerp = (a, b, n = 24) => Array.from({ length: n }, (_, i) => ({ x: a.x + (b.x - a.x) * i / (n - 1), y: a.y + (b.y - a.y) * i / (n - 1) }));
const join2 = (...parts) => parts.reduce((p, q) => p.concat(p.length ? q.slice(1) : q), []);
function box(x, y, w, h) {
  const v = [{ x: x + w / 2, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }, { x: x + w / 2 + 2, y: y + 1 }];
  return join2(...v.slice(1).map((p, i) => lerp(v[i], p, 20)));
}
function diamond(cx, cy, rx, ry) {
  const v = [{ x: cx, y: cy - ry }, { x: cx + rx, y: cy }, { x: cx, y: cy + ry }, { x: cx - rx, y: cy }, { x: cx + 2, y: cy - ry + 1 }];
  return join2(...v.slice(1).map((p, i) => lerp(v[i], p, 20)));
}
const ring = (cx, cy, rx, ry, n = 90) => Array.from({ length: n + 1 }, (_, i) => { const a = i / n * Math.PI * 2 * 1.04; return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) }; });
const check = (x, y) => join2(lerp({ x, y }, { x: x + 25, y: y + 35 }, 20), lerp({ x: x + 25, y: y + 35 }, { x: x + 70, y: y - 15 }, 20));
/** One stroke: the shaft tail to tip, then the barb drawn back from the tip — the pen lifts off at a wing, as a hand's does. */
function arrow(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  const w1 = { x: b.x - 22 * ux + 12 * uy, y: b.y - 22 * uy - 12 * ux }, w2 = { x: b.x - 22 * ux - 12 * uy, y: b.y - 22 * uy + 12 * ux };
  return join2(lerp(a, b, 40), lerp(b, w1, 8), lerp(w1, b, 8), lerp(b, w2, 8));
}
const writing = (x, y, w, h, humps = 7) => Array.from({ length: humps * 14 + 1 }, (_, i) => { const t = i / (humps * 14), a = t * humps * Math.PI; return { x: x + w * t, y: y + h / 2 - (h / 2) * Math.abs(Math.sin(a)) * (0.7 + 0.3 * Math.cos(a * 0.37)) }; });

async function draw(page, pts) {
  await page.mouse.move(pts[0].x, pts[0].y);
  await page.mouse.down();
  for (const p of pts.slice(1)) await page.mouse.move(p.x, p.y);
  await page.mouse.up();
  await page.waitForTimeout(250);
}
async function hold(page, x, y) {
  await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(900); await page.mouse.up(); await page.waitForTimeout(400);
}

// --- what the hand sees ---
const fieldNow = (page) => page.evaluate(() => {
  const f = document.querySelector('#summon');
  if (!f || f.style.display === 'none') return null;
  const said = (b) => (b.querySelector('span') || b).textContent.trim();
  return {
    line: (f.querySelector('.reading') || {}).textContent || '',
    is: [...f.querySelectorAll('.row.certain .pill.item')].map(said),
    affords: [...f.querySelectorAll('.row.afford .pill.item')].map(said),
  };
});
const facts = (page) => page.evaluate(() => {
  const MM = window.MetaMediumCore, s = window.__mm.session, st = s.getState();
  const ids = st.summon ? st.summon.enclosedIds : st.contentIds;
  return {
    status: document.getElementById('status').textContent,
    panel: ((document.querySelector('#inspector') || {}).innerText || '').split('\n').slice(0, 6).join(' / '),
    binds: s.getEvents().filter((e) => e.type === 'bind').map((e) => e.end),
    genre: ids.length ? s.read(ids).genre.reasoning : null,
    notations: ids.length ? MM.notationsOf(st, ids).map((r) => MM.describeNotation(r)) : [],
    floor: MM.NOTATION_FLOOR,
  };
});
async function typed(page, text) {
  const input = page.locator('#summon input.filter');
  await input.fill('');
  await input.pressSequentially(text, { delay: 5 });
  await page.waitForTimeout(150);
  return fieldNow(page);
}

const WORDS = ['diagram', 'flowchart', 'mermaid', 'tidy', 'line up', 'connect', 'route', 'export', 'clean', 'what is this'];
const SCENES = {
  // John's own walk, 2 Oct 2026: two squares, a line between them, circled, the command mark, then "diagram".
  'john-line-lasso': async (p) => { await draw(p, box(400, 380, 160, 110)); await draw(p, box(760, 380, 160, 110)); await draw(p, lerp({ x: 562, y: 435 }, { x: 758, y: 435 }, 30)); await draw(p, ring(660, 435, 330, 150)); await draw(p, check(960, 360)); },
  'john-arrow-lasso': async (p) => { await draw(p, box(400, 380, 160, 110)); await draw(p, box(760, 380, 160, 110)); await draw(p, arrow({ x: 562, y: 435 }, { x: 758, y: 435 })); await draw(p, ring(660, 435, 330, 150)); await draw(p, check(960, 360)); },
  'john-line-hold': async (p) => { await draw(p, box(400, 380, 160, 110)); await draw(p, box(760, 380, 160, 110)); await draw(p, lerp({ x: 562, y: 435 }, { x: 758, y: 435 }, 30)); await hold(p, 400, 430); },
  'head-apart-hold': async (p) => { await draw(p, box(400, 380, 160, 110)); await draw(p, box(760, 380, 160, 110)); await draw(p, lerp({ x: 562, y: 435 }, { x: 758, y: 435 }, 30)); await draw(p, join2(lerp({ x: 738, y: 423 }, { x: 758, y: 435 }, 8), lerp({ x: 758, y: 435 }, { x: 738, y: 447 }, 8))); await hold(p, 400, 430); },
  'flowchart-hold': async (p) => {
    await draw(p, box(300, 200, 160, 80)); await draw(p, diamond(380, 400, 80, 60)); await draw(p, box(300, 540, 160, 80)); await draw(p, box(600, 360, 160, 80));
    await draw(p, arrow({ x: 380, y: 282 }, { x: 380, y: 338 })); await draw(p, arrow({ x: 380, y: 462 }, { x: 380, y: 538 })); await draw(p, arrow({ x: 462, y: 400 }, { x: 598, y: 400 }));
    await hold(p, 300, 240);
  },
  'molecule-lasso': async (p) => { for (const x of [400, 560, 720]) await draw(p, ring(x, 400, 40, 40)); await draw(p, lerp({ x: 442, y: 400 }, { x: 518, y: 400 }, 20)); await draw(p, lerp({ x: 602, y: 400 }, { x: 678, y: 400 }, 20)); await draw(p, ring(560, 400, 260, 110)); await draw(p, check(840, 330)); },
  'writing-hold': async (p) => { await draw(p, writing(400, 400, 260, 40)); await hold(p, 420, 410); },
  'one-box-hold': async (p) => { await draw(p, box(500, 380, 200, 120)); await hold(p, 500, 440); },
};

const server = await startStatic(root);
const browser = await chromium.launch();
const report = {};
try {
  for (const [name, act] of Object.entries(SCENES)) {
    if (only && !name.includes(only)) continue;
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    await ctx.route((u) => isModelRequest(String(u)), (r) => r.abort());
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(server.origin + '/app/?fresh=1&nosw=1');
    await page.waitForFunction(() => window.__mm && window.__mm.session);
    await page.waitForTimeout(300);
    await act(page);
    await page.waitForTimeout(300);
    const r = { facts: await facts(page), field: await fieldNow(page), typed: {}, errors };
    await page.screenshot({ path: join(out, name + '.png') });
    if (r.field) for (const w of WORDS) r.typed[w] = await typed(page, w);
    report[name] = r;
    await ctx.close();
  }
} finally {
  await browser.close();
  await server.stop();
}
writeFileSync(join(out, 'walk.json'), JSON.stringify(report, null, 1));
for (const [name, r] of Object.entries(report)) {
  console.log('\n## ' + name);
  console.log('  status:    ' + r.facts.status);
  console.log('  genre:     ' + r.facts.genre + ' · binds ' + (r.facts.binds.join(', ') || 'none'));
  console.log('  notations: ' + (r.facts.notations.join(' · ') || 'none') + ' (floor ' + r.facts.floor + ')');
  if (!r.field) { console.log('  (no field)'); continue; }
  console.log('  is:        ' + (r.field.is.join(' | ') || '—'));
  console.log('  affords:   ' + (r.field.affords.join(' | ') || '—') + '   ' + r.field.line);
  for (const [w, f] of Object.entries(r.typed)) console.log('  “' + w + '”'.padEnd(16 - w.length) + (f ? (f.is.concat(f.affords).join(' | ') || '—') + '   ' + f.line : '(field gone)'));
  if (r.errors.length) console.log('  page errors: ' + r.errors.join('; '));
}
console.log('\n' + out);

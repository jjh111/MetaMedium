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
// Two uses. Run directly, it is a MAP, beside the gate: what a hand meets,
// printed, never a verdict. Run by the gate (`node e2e/run.mjs walk`, in the
// default run — PLAN-FIELD-PAR FP9), `runWalk` holds the push's records W1–W8
// against the same scenes, drawn the same way:
//   W1   a one-stroke arrow drawn into a box is tied at its tip as well as its tail (FP3)
//   W2   John's two boxes and a line, circled and checked, read as a diagram and are
//        offered Make it Mermaid and Tidy the diagram (FP2); the arrow's the same (W2b);
//        the molecule is its own thing — none of these (W2c)
//   W3   the words a person says find the acts: tidy, line up, connect, route, diagram (FP1)
//   W3b  an act one change away says what is missing, and Enter does nothing
//   W3c  the board's own acts from the field: export opens the export pane (FP8)
//   W3d  ? lists what the held marks can do
//   W4   a lone word that matches nothing waits for a pick: Enter writes nothing (FP4)
//   W5   name and label: two pills only when they differ, each saying how; one when they
//        would do the same
//   W6   Read as writing is not offered on a head drawn apart (FP7)
//   W7   no developer's words on the field's line or the panel (FP6)
//   W8   with a semantic seat held, a word no table knows finds its act by meaning while
//        typing, the seat asked once per rest (D1)

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startStatic } from './servers.mjs';
import { waitReady } from './keep.mjs';
import { isModelRequest } from './guards.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

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
  // A pill's label, and its note after a middle dot when it has one (Name it “…” · finds more like it).
  const said = (b) => { const n = b.querySelector('.note'); return (b.querySelector('span') || b).textContent.trim() + (n ? ' · ' + n.textContent.trim() : ''); };
  return {
    line: (f.querySelector('.reading') || {}).textContent || '',
    is: [...f.querySelectorAll('.row.certain .pill.item')].map(said),
    affords: [...f.querySelectorAll('.row.afford .pill.item')].map(said),
  };
});
const facts = (page) => page.evaluate(() => {
  const MM = window.DynaInkCore, s = window.__mm.session, st = s.getState();
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
  'arrow-into-box': async (p) => { await draw(p, box(400, 380, 160, 110)); await draw(p, box(760, 380, 160, 110)); await draw(p, arrow({ x: 562, y: 435 }, { x: 758, y: 435 })); },
  'named-thing-hold': async (p) => {
    await draw(p, box(400, 380, 160, 110)); await draw(p, box(760, 380, 160, 110)); await draw(p, lerp({ x: 562, y: 435 }, { x: 758, y: 435 }, 30));
    await draw(p, ring(660, 435, 330, 150)); await draw(p, check(960, 360)); await p.waitForTimeout(300);
    const input = p.locator('#summon input.filter'); await input.fill('name: banana'); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
    await p.mouse.click(1200, 800); await p.waitForTimeout(300);
    await hold(p, 400, 430);
  },
  'molecule-lasso': async (p) => { for (const x of [400, 560, 720]) await draw(p, ring(x, 400, 40, 40)); await draw(p, lerp({ x: 442, y: 400 }, { x: 518, y: 400 }, 20)); await draw(p, lerp({ x: 602, y: 400 }, { x: 678, y: 400 }, 20)); await draw(p, ring(560, 400, 260, 110)); await draw(p, check(840, 330)); },
  'writing-hold': async (p) => { await draw(p, writing(400, 400, 260, 40)); await hold(p, 420, 410); },
  'one-box-hold': async (p) => { await draw(p, box(500, 380, 200, 120)); await hold(p, 500, 440); },
};

async function openScene(context, origin, act) {
  const page = await context.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(origin + '/app/?fresh=1&nosw=1', { waitUntil: 'load', timeout: 60000 });
  await waitReady(page);
  await page.waitForTimeout(200);
  if (act) await act(page);
  await page.waitForTimeout(300);
  return page;
}
const events = (page) => page.evaluate(() => window.__mm.session.getEvents().length);
const lineOf = (page) => page.evaluate(() => ((document.querySelector('#summon .reading') || {}).textContent || ''));
const allPills = (f) => (f ? f.is.concat(f.affords) : []);
const DEV_WORDS = /tier 1|tier 2|r\d+ · node|controls › models|the structure, at once|structure at once|llm:/;

/**
 * The push's records (PLAN-FIELD-PAR FP9), each scene in a page of its own within one
 * guarded context. Every stroke is the pointer's own (`page.mouse`).
 */
export async function runWalk(browser, servers, { freshContext }) {
  const steps = [];
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const guards = await freshContext(browser, { origins: [servers.staticOrigin], label: 'walk' });
  const origin = servers.staticOrigin;
  const record = async (name, fn) => {
    try { await fn(); } catch (err) { check(`${name} — threw: ${String(err && err.message ? err.message : err).split('\n')[0]}`, false, { stack: String(err && err.stack) }); }
  };
  const scene = async (name, fn) => { const page = await openScene(guards.context, origin, SCENES[name]); try { await fn(page); } finally { await page.close(); } };

  await record('W1', async () => {
    await scene('arrow-into-box', async (page) => {
      const f = await facts(page);
      check(`W1. a one-stroke arrow drawn into a box is tied at its tail and at its tip, where its ink points (binds: ${f.binds.join(', ') || 'none'}; the pen lifted at a barb's wing)`,
        f.binds.includes('start') && f.binds.includes('end'), f);
    });
  });
  await record('W2', async () => {
    await scene('john-line-lasso', async (page) => {
      const f = await fieldNow(page);
      check(`W2. John's two boxes and a line, circled and checked: the field reads a diagram and offers Make it Mermaid and Tidy the diagram (is: ${f && f.is.join(' | ')}; affords: ${f && f.affords.join(' | ')})`,
        f && f.is.some((l) => /^a diagram\b/.test(l)) && f.affords.includes('Make it Mermaid') && f.affords.includes('Tidy the diagram'), f);
    });
    await scene('john-arrow-lasso', async (page) => {
      const f = await fieldNow(page);
      check(`W2b. the same with a one-stroke arrow: Make it Mermaid and Tidy the diagram (affords: ${f && f.affords.join(' | ')})`,
        f && f.affords.includes('Make it Mermaid') && f.affords.includes('Tidy the diagram'), f);
    });
    await scene('molecule-lasso', async (page) => {
      const f = await fieldNow(page);
      check(`W2c. the molecule is its own thing: no diagram read, no Make it Mermaid, no Tidy the diagram (is: ${f && f.is.join(' | ')}; affords: ${f && f.affords.join(' | ')})`,
        f && !f.is.some((l) => /^a diagram\b/.test(l)) && !f.affords.includes('Make it Mermaid') && !f.affords.includes('Tidy the diagram'), f);
    });
  });
  await record('W3', async () => {
    await scene('john-line-lasso', async (page) => {
      const got = {};
      for (const w of ['tidy', 'line up', 'connect', 'route', 'diagram']) got[w] = await typed(page, w);
      const shows = (w, label) => allPills(got[w]).includes(label);
      check(`W3. the words a person says find the acts — tidy → ${got.tidy && got.tidy.line}; line up → ${got['line up'] && got['line up'].line}; connect → ${got.connect && got.connect.line}; route → ${got.route && got.route.line}; diagram → ${got.diagram && got.diagram.line}`,
        shows('tidy', 'Tidy the diagram') && /Tidy the diagram/.test(got.tidy.line) && shows('line up', 'Tidy the diagram') && shows('connect', 'Route the connectors')
          && shows('route', 'Route the connectors') && shows('diagram', 'Make it Mermaid') && /Make it Mermaid|Tidy the diagram/.test(got.diagram.line), got);
      const all = await typed(page, '?');
      check(`W3d. ? lists what the held marks can do (${allPills(all).length} shown; line: ${all && all.line})`,
        all && allPills(all).includes('Make it Mermaid') && allPills(all).includes('Tidy the diagram') && allPills(all).includes('Draw them clean') && allPills(all).length >= 5, all);
      const ex = await typed(page, 'export');
      const before = await events(page);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      const pane = await page.evaluate(() => { const p = document.getElementById('exportPanel'); return !!p && !p.hidden && getComputedStyle(p).display !== 'none'; });
      check(`W3c. the board's own acts from the field: "export" says ${ex && ex.line}, and Enter opens the export pane (${pane ? 'open' : 'not open'}) and writes nothing to the board`,
        ex && /export/i.test(ex.line) && pane && (await events(page)) === before, { ex, pane });
    });
    await scene('one-box-hold', async (page) => {
      const t = await typed(page, 'mermaid');
      const before = await events(page);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      check(`W3b. an act one change away says what is missing — one box, "mermaid": ${t && t.line} — and Enter writes nothing`,
        t && /Make it Mermaid/.test(t.line) && /—/.test(t.line) && (await events(page)) === before, t);
    });
  });
  await record('W4', async () => {
    await scene('john-line-lasso', async (page) => {
      const t = await typed(page, 'banana');
      const before = await events(page);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(400);
      const after = await events(page);
      const art = await page.evaluate(() => window.__mm.session.getState().artifacts.length);
      check(`W4. a lone word that matches nothing waits for a pick: "banana" says ${t && t.line}, and Enter writes nothing and makes no page (events ${before} → ${after}, things made ${art})`,
        t && after === before && art === 0 && !DEV_WORDS.test(t.line), t);
    });
  });
  await record('W5', async () => {
    await scene('john-line-lasso', async (page) => {
      const t = await typed(page, 'banana');
      const pills = allPills(t);
      check(`W5. a word on marks you made: naming and writing it are different acts, and each pill says how (${pills.join(' | ')})`,
        pills.length === 2 && pills.some((l) => /^Name it “banana”/.test(l) && /like it/.test(l)) && pills.some((l) => /^Write “banana” on/.test(l)) && !pills.some((l) => /^Label it/.test(l)), t);
      // Name it, then type a new word at the thing it made: naming it again and writing on it would do the same — one pill.
      await page.locator('#summon .pill.item', { hasText: 'Name it “banana”' }).first().click();
      await page.waitForTimeout(400);
    });
    await scene('named-thing-hold', async (page) => {
      const t = await typed(page, 'pear');
      const pills = allPills(t);
      check(`W5b. held, a thing already named: naming it and writing on it would do the same — one pill (${pills.join(' | ')})`, pills.length === 1, t);
    });
  });
  await record('W6', async () => {
    await scene('head-apart-hold', async (page) => {
      const f = await fieldNow(page);
      check(`W6. Read as writing is not offered on a head drawn apart (affords: ${f && f.affords.join(' | ')})`, f && !f.affords.includes('Read as writing'), f);
    });
  });
  await record('W7', async () => {
    const said = [];
    for (const name of ['john-line-lasso', 'one-box-hold', 'writing-hold']) {
      await scene(name, async (page) => {
        said.push((await lineOf(page)));
        for (const w of ['website about dolphins', 'banana', 'page']) said.push((await typed(page, w)).line);
        said.push(await page.evaluate(() => ((document.querySelector('#inspector') || {}).innerText || '')));
      });
    }
    const bad = said.filter((x) => DEV_WORDS.test(x));
    check(`W7. no developer's words on the field's line or the panel (${bad.length} found${bad.length ? ': ' + bad.map((b) => b.slice(0, 60)).join(' / ') : ''})`, bad.length === 0, { bad });
  });
  await record('W8', async () => {
    await scene('john-line-lasso', async (page) => {
      const seated = await page.evaluate(() => {
        const mm = window.__mm;
        if (!mm.joinSemanticTransport) return false;
        const stub = mm.MM.createStubEmbedTransport({ groups: [['flowchart', 'mermaid', 'chart', 'schematic']], dimension: 256 });
        let calls = 0;
        mm.joinSemanticTransport({ name: stub.name, dimension: stub.dimension, embed: (texts, o) => { calls++; return stub.embed(texts, o); } });
        window.__walkEmbedCalls = () => calls;
        return true;
      });
      const input = page.locator('#summon input.filter');
      await input.fill('');
      await page.evaluate(() => { window.__walkEmbedStart = window.__walkEmbedCalls(); });
      await input.pressSequentially('schematic', { delay: 15 });
      await page.waitForTimeout(1400);
      const f = await fieldNow(page);
      const calls = await page.evaluate(() => window.__walkEmbedCalls() - window.__walkEmbedStart);
      check(`W8. with a semantic seat held, "schematic" — in no word table — finds Make it Mermaid by meaning while typing (${f && allPills(f).join(' | ')}; line ${f && f.line}), the seat asked ${calls} time(s) for nine keystrokes`,
        seated && f && allPills(f).includes('Make it Mermaid') && calls >= 1 && calls <= 2, { f, calls });
    });
  });
  return { steps, guards: [guards] };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = join(root, 'e2e', 'results', 'walk');
  mkdirSync(out, { recursive: true });
  const only = process.argv[2] || '';
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
}

#!/usr/bin/env node
//
// The maths implies, faint where it would be written (MATHS-SPEC §8 Lane A, M16–M18; scenes T1 and T8's first
// half): a right triangle drawn with the pointer, its legs typed, and what the canvas says back — as ghosts on the
// page, beneath the ink, in colours that relate — taken by a tap, as the hand's own text the maths then checks.
//
//     node e2e/run.mjs fill                 # in the gate, Chromium
//
//   F1   with the selection, 5 stands beside the hypotenuse in its colour, and 36.87° and 53.13° inside their corners
//   F1b  nothing derived is in the log; the written legs have no ghost; the ghosts are on the canvas, in their hues
//   F2   a tap on the 5 — inside the selection's own outline — writes one text and drags nothing; the maths reads it
//        as the hypotenuse and a check holds; the ghost is gone
//   F3   one undo takes it back, and the ghost with it comes back
//   F4   the 4 changed to a 5: the written 5 cannot hold, 5.83 stands beside it, and a tap writes nothing and says why
//   F5   the answer waits (typed in the field): a setting in the log; the ghost says ?; the first tap shows the value
//        and writes nothing; the second writes it; undo takes the writing back and the ? returns; a second undo, the setting
//   F6   one quantity, one colour: the hypotenuse is its fixed hue, every other quantity differs, the same after a replay
//   F7   colour the maths (typed): the quantities' halos stand at rest on the board; put back, they go
//   F8   the panel's board line sets the same two settings when nothing is held — one tap, one undo
//   F9   a small triangle: every number a tap writes lands on the side or corner it was offered for, and undo takes each back
//   F10  the hand's paint of the board with ghosts showing is what the whole-board read draws (paintCheck)
//   F11  a tap on a ghost with nothing held writes it and leaves no dot
//   F12  a mark fill-in (a stand-in source) is dashed, tapped along its line, writes its ink in the tool's name, one undo

import { waitReady } from './keep.mjs';

// --- the hand: strokes as a person draws them, in screen pixels ---
const lerp = (a, b, n = 24) => Array.from({ length: n }, (_, i) => ({ x: a.x + (b.x - a.x) * i / (n - 1), y: a.y + (b.y - a.y) * i / (n - 1) }));
const join2 = (...parts) => parts.reduce((p, q) => p.concat(p.length ? q.slice(1) : q), []);
function box(x, y, w, h) {
  const v = [{ x: x + w / 2, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }, { x: x + w / 2 + 2, y: y + 1 }];
  return join2(...v.slice(1).map((p, i) => lerp(v[i], p, 20)));
}
async function draw(page, pts) {
  await page.mouse.move(pts[0].x, pts[0].y);
  await page.mouse.down();
  for (const p of pts.slice(1)) await page.mouse.move(p.x, p.y);
  await page.mouse.up();
  await page.waitForTimeout(200);
}
async function hold(page, x, y) {
  await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(900); await page.mouse.up(); await page.waitForTimeout(400);
}

/** A right triangle ruled with the pointer — right angle at `r`, legs `la` along x and `lb` up — its square drawn in the corner. */
async function rightTriangle(page, r, la, lb) {
  const L = { x: r.x + la, y: r.y }, T = { x: r.x, y: r.y - lb };
  await draw(page, lerp(r, L, 30));
  await draw(page, lerp(T, r, 30));
  await draw(page, lerp(L, T, 30));
  await draw(page, box(r.x, r.y - 15, 15, 15));
  return { r, L, T };
}
/** A text standing centred at a world point — the legs written by the figure (the harness's own doorway, as e2e 64 uses). */
const written = (page, code, c, w = 40, h = 17) => page.evaluate(([code, c, w, h]) => window.__mm.typeText({ x: c.x - w / 2, y: c.y - h / 2 }, code, { w, h }), [code, c, w, h]);

const state = (page) => page.evaluate(() => {
  const mm = window.__mm, s = mm.session.getState(), evs = mm.session.getEvents();
  return {
    events: evs.length,
    types: evs.map((e) => e.type),
    settings: s.settings,
    summon: !!s.summon,
    status: document.getElementById('status').textContent,
    last: evs.length ? { type: evs[evs.length - 1].type, tool: evs[evs.length - 1].tool, offer: evs[evs.length - 1].offer, code: evs[evs.length - 1].code } : null,
  };
});
const ghosts = (page) => page.evaluate(() => window.__mmGhosts.drawn().map((g) => ({ mark: !!g.mark, key: g.key, quantity: g.quantity, text: g.text, cx: g.cx, cy: g.cy, w: g.w, h: g.h, hue: g.hue, waiting: g.waiting, why: g.why })));
const board = (page) => page.evaluate(() => {
  const MM = window.__mm.MM, b = MM.boardMathsOf(window.__mm.session);
  if (!b) return null;
  const roles = [...MM.roleQuantities(b).keys()];
  const hypKey = roles.length ? roles[0].split(':').pop() : null;
  return b.figures.map((fm) => ({
    labels: fm.labels.map((l) => ({ key: l.key, text: l.text, number: l.number })),
    conflicts: (fm.solution.readings[0] ? fm.solution.readings[0].conflicts.map((c) => c.key + ' ' + c.reason) : []),
    keeps: fm.solution.readings[0] ? fm.solution.readings[0].keeps : [],
    hypKey,
  }));
});
/** Undo, by the bar's own button: the field's input keeps the keys while it is open. */
const undo = async (page) => { await page.click('#undoBtn'); await page.waitForTimeout(250); };
const byText = (gs, t) => gs.find((g) => g.text === t);
const screenOf = (page, w) => page.evaluate((w) => window.__mm.worldToScreen(w.x, w.y), w);
async function tapGhost(page, g) {
  const p = await screenOf(page, { x: g.cx, y: g.cy });
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(350);
}
const inTriangle = (p, a, b, c) => {
  const s = (p1, p2, p3) => (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  const d1 = s(p, a, b), d2 = s(p, b, c), d3 = s(p, c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
};
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
/** A ghost as a point: where its words are centred. */
const at = (g) => ({ x: g.cx, y: g.cy });

/** Hue of the dominant coloured pixels on the canvas inside a world rect: how many pixels are of this hue (±22°) with some chroma. */
const pixelsOfHue = (page, rect, hue) => page.evaluate(([rect, hue]) => {
  const mm = window.__mm, canvas = document.getElementById('board') || document.querySelector('canvas');
  const a = mm.worldToScreen(rect.minX, rect.minY), b = mm.worldToScreen(rect.maxX, rect.maxY);
  const dpr = window.devicePixelRatio || 1;
  const x = Math.max(0, Math.floor(a.x * dpr)), y = Math.max(0, Math.floor(a.y * dpr));
  const w = Math.max(1, Math.floor((b.x - a.x) * dpr)), h = Math.max(1, Math.floor((b.y - a.y) * dpr));
  const data = canvas.getContext('2d').getImageData(x, y, w, h).data;
  // sRGB → OKLab → hue, as core's colour space does.
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  let hits = 0, tinted = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 40) continue;
    const r = lin(data[i]), g = lin(data[i + 1]), bl = lin(data[i + 2]);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * bl);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * bl);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * bl);
    const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
    const C = Math.hypot(A, B);
    if (C < 0.04) continue;
    tinted++;
    let hh = (Math.atan2(B, A) * 180) / Math.PI; if (hh < 0) hh += 360;
    const d = Math.abs(((hh - hue + 540) % 360) - 180);
    if (d <= 22) hits++;
  }
  return { hits, tinted };
}, [rect, hue]);

export async function runFill(browser, servers, { freshContext }) {
  const steps = [];
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const guards = await freshContext(browser, { origins: [servers.staticOrigin], label: 'fill' });
  const record = async (name, fn) => {
    try { await fn(); } catch (err) { check(`${name} — threw: ${String(err && err.message ? err.message : err).split('\n')[0]}`, false, { stack: String(err && err.stack) }); }
  };
  const open = async () => {
    const page = await guards.context.newPage();
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(servers.staticOrigin + '/app/?fresh=1&nosw=1', { waitUntil: 'load', timeout: 60000 });
    await waitReady(page);
    await page.evaluate(() => window.__mm.setView(1, 0, 0));
    await page.waitForTimeout(150);
    return page;
  };
  /** The 3-4-5: legs of 240 and 180 drawn with the pointer, 4 and 3 typed beside them. */
  const scene = async (page) => {
    const R = { x: 400, y: 520 };
    const t = await rightTriangle(page, R, 240, 180);
    await written(page, '4', { x: 520, y: 542 });
    await written(page, '3', { x: 376, y: 430 });
    await page.waitForTimeout(300);
    return t;
  };
  const typedInField = async (page, text) => {
    const input = page.locator('#summon input.filter');
    await input.fill('');
    await input.pressSequentially(text, { delay: 5 });
    await page.waitForTimeout(150);
  };

  let page = await open();
  let tri = null;
  try {
    await record('F1', async () => {
      tri = await scene(page);
      await hold(page, 450, 520);
      const st = await state(page);
      const gs = await ghosts(page);
      const five = byText(gs, '5'), a1 = byText(gs, '36.87°'), a2 = byText(gs, '53.13°');
      const mid = { x: (tri.L.x + tri.T.x) / 2, y: (tri.L.y + tri.T.y) / 2 };
      const roleHue = await page.evaluate(() => window.__mm.MM.ROLE_HUES.hypotenuse);
      check(`F1. with the selection held (${st.summon ? 'field open' : 'no field'}), 5 stands beside the hypotenuse, outside the figure, in the hypotenuse's colour, and 36.87° and 53.13° inside their corners (ghosts: ${gs.map((g) => g.text).join(' · ')})`,
        st.summon && !!five && !!a1 && !!a2 && dist(at(five), mid) < 70 && !inTriangle(at(five), tri.r, tri.L, tri.T) && five.hue === roleHue
          && inTriangle(at(a1), tri.r, tri.L, tri.T) && inTriangle(at(a2), tri.r, tri.L, tri.T) && dist(at(a1), tri.L) < dist(at(a1), tri.T) && dist(at(a2), tri.T) < dist(at(a2), tri.L),
        { five, a1, a2, mid, roleHue });
    });
    await record('F1b', async () => {
      const gs = await ghosts(page);
      const ev = await page.evaluate(() => JSON.stringify(window.__mm.session.getEvents()));
      const fills = await page.evaluate(() => window.__mmGhosts.fills());
      const five = byText(gs, '5');
      // The ghost is drawn on the canvas, in its hue: pixels of the quantity's colour stand in its box.
      const px = five ? await pixelsOfHue(page, { minX: five.cx - five.w / 2 - 2, maxX: five.cx + five.w / 2 + 2, minY: five.cy - five.h / 2 - 2, maxY: five.cy + five.h / 2 + 2 }, five.hue) : { hits: 0, tinted: 0 };
      check(`F1b. nothing derived is in the log (no 5, no 36.87°), the legs that were written have no ghost (${fills.map((f) => f.text).join(' · ')}), and the 5 is on the canvas in its hue (${px.hits} of ${px.tinted} coloured pixels)`,
        !/"code":"5"|36\.87|53\.13|√/.test(ev) && !fills.some((f) => f.text === '3' || f.text === '4') && px.hits >= 6, { fills: fills.map((f) => f.text), px });
    });
    await record('F2', async () => {
      const before = await state(page);
      const five = byText(await ghosts(page), '5');
      await tapGhost(page, five);
      const after = await state(page);
      const wrote = after.types.slice(before.events);
      const b = await board(page);
      const fm = b && b[0];
      const label = fm && fm.labels.find((l) => l.text === '5');
      const now = await ghosts(page);
      check(`F2. a tap on the 5 — inside the selection's own outline — writes one text and drags nothing (${wrote.join(', ') || 'nothing'}), stamped with the tool (${JSON.stringify(after.last)}); the maths reads it as the hypotenuse (${label && label.key}, the long side ${fm && fm.hypKey}), no label conflicts (${fm && fm.conflicts.length}) and the ghost is gone`,
        wrote.includes('import') && !wrote.includes('move') && !wrote.includes('stroke') && after.last && after.last.tool === 'fill' && after.last.code === '5'
          && !!label && label.key === fm.hypKey && fm.conflicts.length === 0 && fm.keeps.includes('5') && !byText(now, '5'),
        { wrote, last: after.last, label, fm, ghosts: now.map((g) => g.text) });
    });
    await record('F3', async () => {
      const before = await state(page);
      await undo(page);
      const after = await state(page);
      const gs = await ghosts(page);
      check(`F3. one undo takes it back (events ${before.events} → ${after.events}) and the ghost comes back (${gs.map((g) => g.text).join(' · ')})`,
        after.events === before.events - 1 && !!byText(gs, '5'), { before: before.events, after: after.events, ghosts: gs.map((g) => g.text) });
    });
    await record('F4', async () => {
      // Write the 5 again, then change the 4 to a 5 the way a hand does: let go, double-click it, type, Enter.
      await tapGhost(page, byText(await ghosts(page), '5'));
      await page.mouse.click(1100, 200);
      await page.waitForTimeout(250);
      await page.mouse.dblclick(520, 542);
      await page.waitForTimeout(200);
      await page.keyboard.press('Control+a');
      await page.keyboard.type('5');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(400);
      // Hold again: the figure's marks.
      await hold(page, 450, 520);
      const gs = await ghosts(page);
      const fix = byText(gs, '5.83');
      const b = await board(page);
      const chips = await page.evaluate(() => window.__mmMaths.chipsDrawn().filter((c) => c.kind === 'conflict').map((c) => c.text));
      const before = await state(page);
      if (fix) await tapGhost(page, fix);
      const after = await state(page);
      check(`F4. the 4 changed to a 5: the written 5 cannot hold (${b && b[0].conflicts[0]}), 5.83 stands beside it, and a tap on it writes nothing (events ${before.events} → ${after.events}) and says why (“${after.status.slice(0, 90)}”)`,
        !!fix && b && b[0].conflicts.length === 1 && chips.length === 1 && after.events === before.events && /5\.83/.test(after.status),
        { ghosts: gs.map((g) => g.text), conflicts: b && b[0].conflicts, chips, status: after.status });
      // Put the board back as it was: take the 5 written and the 4 changed back, whatever else the hand did between.
      for (let i = 0; i < 8; i++) {
        const b2 = await board(page);
        if (b2 && !b2[0].labels.some((l) => l.text === '5') && b2[0].labels.some((l) => l.text === '4')) break;
        await undo(page);
      }
    });
    await record('F5', async () => {
      await hold(page, 450, 520);
      await typedInField(page, 'the answer waits');
      const line = await page.evaluate(() => ((document.querySelector('#summon .reading') || {}).textContent || ''));
      await page.keyboard.press('Enter');
      await page.waitForTimeout(400);
      const st = await state(page);
      const setting = await page.evaluate(() => { const e = window.__mm.session.getEvents().filter((x) => x.type === 'setting'); return e.map((x) => ({ key: x.key, value: x.value, tool: x.tool, offer: x.offer })); });
      // The field closed; hold again to see the ghosts of a board that waits.
      await hold(page, 450, 520);
      const gs = await ghosts(page);
      const waiting = gs.filter((g) => g.waiting);
      const shape = gs.every((g) => g.text === '?' || !g.waiting) && waiting.length >= 3 && !gs.some((g) => g.text === '5');
      const hyp = gs.find((g) => g.waiting && g.hue === 8);
      const px = hyp ? await pixelsOfHue(page, { minX: hyp.cx - 14, maxX: hyp.cx + 14, minY: hyp.cy - 12, maxY: hyp.cy + 12 }, hyp.hue) : { hits: 0 };
      check(`F5. the answer waits, typed in the field (“${line}”): a setting event in the log (${JSON.stringify(setting)}), answers ${st.settings.answers}; each ghost says ? in its colour (${gs.map((g) => g.text).join(' ')}; ${px.hits} pixels of the hypotenuse's hue)`,
        /answer waits/i.test(line) && setting.length === 1 && setting[0].key === 'answers' && setting[0].value === 'wait' && setting[0].tool === 'fill' && st.settings.answers === 'wait' && shape && !!hyp && px.hits >= 4,
        { line, setting, ghosts: gs.map((g) => g.text + (g.waiting ? ' ?' : '')), px });
      const before = await state(page);
      await tapGhost(page, hyp);
      const first = await state(page);
      const shown = byText(await ghosts(page), '5');
      check(`F5b. the first tap shows the value and writes nothing (events ${before.events} → ${first.events}; ghosts now: ${(await ghosts(page)).map((g) => g.text).join(' ')}) — the reveal is the page's, never logged`,
        first.events === before.events && !!shown && !shown.waiting, { before: before.events, first: first.events });
      await tapGhost(page, shown);
      const second = await state(page);
      const b = await board(page);
      check(`F5c. the second tap writes it (${second.types.slice(first.events).join(', ')}; ${JSON.stringify(second.last)}) and the maths reads it`,
        second.types.slice(first.events).join() === 'import' && second.last.code === '5' && !!b[0].labels.find((l) => l.text === '5' && l.key === b[0].hypKey), { second: second.last, labels: b[0].labels });
      await undo(page);
      const back = await ghosts(page);
      const afterUndo = await state(page);
      check(`F5d. undo takes the writing back and the ? returns (${back.map((g) => g.text).join(' ')}); the board still waits (${afterUndo.settings.answers}); a second undo takes the setting back`,
        afterUndo.events === second.events - 1 && afterUndo.settings.answers === 'wait' && back.some((g) => g.waiting && g.hue === 8), { back: back.map((g) => g.text + (g.waiting ? ' ?' : '')) });
    });
    await record('F5e', async () => {
      // The panel does not say the answer either, while the board waits.
      const panel = await page.evaluate(() => (document.getElementById('inspector') || {}).innerText || '');
      check(`F5e. on a board that waits the panel does not give the answer away (“${panel.replace(/\s+/g, ' ').slice(0, 140)}”)`,
        /answers wait/i.test(panel) && !/long\s+side\s+5/.test(panel.replace(/\s+/g, ' ')), { panel: panel.slice(0, 300) });
      // The chip's answer is not on the board as a pill either: nothing drawn says the 5 but the ghost.
      const chips = await page.evaluate(() => window.__mmMaths.chipsDrawn().map((c) => c.kind + ' ' + c.text));
      check(`F5f. no pill on the board says the answer while it waits (${chips.join(' | ') || 'none'})`, !chips.some((c) => /^side 5|^side 5$/.test(c)), chips);
    });
    await record('F6', async () => {
      // Back to a board that shows its answers: undo the setting.
      await undo(page);
      const st = await state(page);
      const hues = await page.evaluate(() => window.__mmGhosts.hues());
      const ROLE = await page.evaluate(() => window.__mm.MM.ROLE_HUES.hypotenuse);
      const distinct = hues.every((a, i) => hues.every((b, j) => i === j || a.hue !== b.hue || (a.role && b.role)));
      const hyp = hues.find((h) => h.role === 'hypotenuse');
      // A replay of the log on a fresh board puts every quantity at the hue it had.
      const same = await page.evaluate(() => {
        const mm = window.__mm, evs = mm.session.getEvents().slice(), before = JSON.stringify(window.__mmGhosts.hues());
        mm.session.load(evs);
        return JSON.stringify(window.__mmGhosts.hues()) === before;
      });
      check(`F6. one quantity, one colour: the hypotenuse is its fixed hue (${hyp && hyp.hue} of ${ROLE}), no other quantity shares a hue (${hues.length} of them), and a replay of the log gives every one the same hue again`,
        st.settings.answers === 'show' && !!hyp && hyp.hue === ROLE && hues.length >= 6 && distinct && same, { hues: hues.map((h) => h.quantity.split(':').pop() + '=' + h.hue), same });
    });
    await record('F7', async () => {
      await hold(page, 450, 520);
      await typedInField(page, 'colour the maths');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(400);
      const st = await state(page);
      // Nothing held: the board still wears its colours.
      const s0 = await page.evaluate(() => window.__mm.session.getState());
      await page.mouse.click(1100, 200);
      await page.waitForTimeout(400);
      const atRest = await page.evaluate(() => ({ held: !!window.__mm.session.getState().summon, halos: window.__mmGhosts.halos().length }));
      const px = await pixelsOfHue(page, { minX: tri.r.x - 6, maxX: tri.L.x + 6, minY: tri.r.y - 8, maxY: tri.r.y + 8 }, (await page.evaluate(() => window.__mmGhosts.halos()))[0].hue);
      check(`F7. colour the maths, typed: the board's colour setting is ${st.settings.colour}, and with nothing held ${atRest.halos} quantities' halos stand on the figure (${px.tinted} tinted pixels along its bottom leg)`,
        st.settings.colour === 'always' && !atRest.held && atRest.halos >= 4 && px.tinted > 20, { st: st.settings, atRest, px });
      // The hand let go of the field between (a dismiss, a deselect — acts of its own): undo walks back to the setting, which is one event.
      const settings = await page.evaluate(() => window.__mm.session.getEvents().filter((e) => e.type === 'setting').length);
      let undos = 0;
      while (undos < 4 && (await page.evaluate(() => window.__mm.session.getState().settings.colour)) !== 'pointed') {
        await undo(page);
        undos++;
      }
      // Undoing the let-go held the marks again; let go once more: nothing held, and the board wears no colour at rest.
      await page.mouse.click(1100, 200);
      await page.waitForTimeout(350);
      const off = await page.evaluate(() => ({ colour: window.__mm.session.getState().settings.colour, halos: window.__mmGhosts.halos().length, settings: window.__mm.session.getEvents().filter((e) => e.type === 'setting').length }));
      check(`F7b. the setting is one event (${settings}), and undo puts it back: the colour shows only while the marks are held or pointed at (${off.colour}, ${off.halos} halos at rest)`, settings === 1 && off.colour === 'pointed' && off.halos === 0 && off.settings === 0, { off, undos });
    });
    await record('F8', async () => {
      await page.mouse.click(1100, 200);
      await page.mouse.move(1100, 300);
      await page.waitForTimeout(350);
      const panel = await page.evaluate(() => (document.getElementById('inspector') || {}).innerText || '');
      const btn = page.locator('#inspector button[data-board-setting="answers:wait"]');
      const there = await btn.count();
      const before = await state(page);
      if (there) await btn.click();
      await page.waitForTimeout(300);
      const after = await state(page);
      check(`F8. nothing held, the panel's board line offers the setting (“${panel.replace(/\s+/g, ' ').slice(0, 120)}”): one tap sets it (answers ${after.settings.answers}, one setting event), one undo puts it back`,
        there === 1 && /this board/i.test(panel) && after.settings.answers === 'wait' && after.events === before.events + 1 && after.last.type === 'setting', { there, after: after.last });
      await undo(page);
      check('F8b. …and one undo puts it back', (await state(page)).settings.answers === 'show', null);
    });
    await record('F10', async () => {
      await hold(page, 450, 520);
      const r = await page.evaluate(() => window.__mm.paintCheck());
      check(`F10. with ghosts and halos showing, a hand's paint of the board is what the whole-board read draws (${r.ops} of ${r.of} things)`, r.ok, { diffs: (r.diffs || []).slice(0, 3) });
    });
  } finally {
    await page.close().catch(() => {});
  }

  // A tap on a ghost with nothing held writes it, and leaves no dot: the moment after a change is when it shows.
  await record('F11', async () => {
    const p = await open();
    try {
      await rightTriangle(p, { x: 400, y: 520 }, 240, 180);
      await written(p, '4', { x: 520, y: 542 });
      await written(p, '3', { x: 376, y: 430 });
      await p.waitForTimeout(300);
      const before = await state(p);
      const five = byText(await ghosts(p), '5');
      // Pen-like: a tap with a few pixels of wobble.
      const s = await screenOf(p, { x: five.cx, y: five.cy });
      await p.mouse.move(s.x, s.y);
      await p.mouse.down();
      await p.mouse.move(s.x + 1, s.y + 1);
      await p.mouse.move(s.x + 2, s.y);
      await p.mouse.up();
      await p.waitForTimeout(350);
      const after = await state(p);
      const wrote = after.types.slice(before.events);
      check(`F11. with nothing held, a tap on the ghost that shows for a moment after the change writes it (${wrote.join(', ')}) and leaves no dot`,
        !!five && !before.summon && wrote.join() === 'import' && !wrote.includes('stroke') && after.last.code === '5', { wrote, last: after.last });
    } finally { await p.close().catch(() => {}); }
  });

  // The trap: a small figure, where two sides' middles are close. Every number a tap writes lands on what it was offered for.
  await record('F9', async () => {
    const p = await open();
    try {
      const R = { x: 600, y: 480 };
      await rightTriangle(p, R, 96, 72);
      await written(p, '1.6', { x: 648, y: 502 }, 30, 14);
      await written(p, '1.2', { x: 580, y: 444 }, 30, 14);
      await p.waitForTimeout(300);
      await hold(p, 640, 480);
      const gs = (await ghosts(p)).filter((g) => g.waiting === false);
      const results = [];
      for (const g of gs) {
        const hits = await p.evaluate((key) => { const h = window.__mmGhosts.hits().find((x) => x.key === key); return h ? { cx: h.cx, cy: h.cy } : null; }, g.key);
        if (!hits) { results.push({ text: g.text, skipped: 'not on screen' }); continue; }
        const before = await state(p);
        const fill = await p.evaluate((key) => window.__mmGhosts.fills().find((f) => f.key === key), g.key);
        if (fill.take !== 'text') { results.push({ text: g.text, take: fill.take }); continue; }
        await tapGhost(p, { cx: hits.cx, cy: hits.cy });
        const after = await state(p);
        const landed = await p.evaluate((key) => {
          const MM = window.__mm.MM, b = MM.boardMathsOf(window.__mm.session);
          const want = key.split(':').pop();
          const ids = window.__mm.session.getState().artifacts;
          const last = ids[ids.length - 1];
          const label = b.figures.flatMap((fm) => fm.labels).find((l) => l.number === last);
          return { want, got: label ? label.key : null };
        }, g.key);
        results.push({ text: g.text, wrote: after.types.slice(before.events).join(), want: landed.want, got: landed.got });
        await undo(p);
        // Hold again if the undo let go of the field.
        if (!(await state(p)).summon) await hold(p, 640, 480);
      }
      const wrote = results.filter((r) => r.wrote);
      const wrong = wrote.filter((r) => r.got !== r.want);
      check(`F9. a small triangle: every number a tap writes lands on the side or corner it was offered for (${wrote.map((r) => r.text + '→' + r.got).join(', ')}), and the figure has the sides and angles to write (${wrote.length} written, ${wrong.length} wrong)`,
        wrote.length >= 3 && wrong.length === 0, { results });
    } finally { await p.close().catch(() => {}); }
  });

  // A fill-in that is a mark — a source other than the figure's gives one — is dashed where it lies, beneath the ink,
  // and taken by a tap along its line: it writes the ink it is, in the tool's name, as one act. (A stand-in source
  // registered in the page; Lane C's curves and Lane E's lines are the real ones.)
  await record('F12', async () => {
    const p = await open();
    try {
      await p.evaluate(() => {
        const MM = window.__mm.MM;
        MM.registerFillSource({
          id: 'e2e-mark',
          fillIns: (state) => {
            const id = state.contentIds[0];
            if (!id) return [];
            return [{
              key: 'e2e-mark:' + id + ':rule', kind: 'mark', source: 'e2e-mark', text: 'a rule',
              points: [{ x: 420, y: 380 }, { x: 680, y: 380 }], closed: false, dashed: true, at: { x: 550, y: 370 },
              about: [id], quantity: 'e2e-mark:' + id + ':rule', reason: 'a stand-in line above the box', answer: false, rank: 0.8,
              take: { kind: 'strokes', strokes: [[{ x: 420, y: 380 }, { x: 550, y: 380 }, { x: 680, y: 380 }]] },
            }];
          },
        });
      });
      await draw(p, box(400, 420, 300, 180));
      await hold(p, 400, 520);
      const before = await state(p);
      const gs = (await ghosts(p)).filter((g) => g.mark);
      const hit = await p.evaluate(() => window.__mmGhosts.hits().find((h) => h.pts) || null);
      const onLine = await p.evaluate(() => window.__mmGhosts.at(550, 381));
      const offLine = await p.evaluate(() => window.__mmGhosts.at(550, 409));
      const ok = await p.evaluate(() => window.__mm.paintCheck());
      check(`F12. a mark fill-in stands held and dashed (${gs.length} drawn), is a target along its line and not 28 units off it, and the paint of it is what the whole-board read draws`,
        gs.length === 1 && !!hit && hit.pts.length === 2 && !!onLine && offLine === null && ok.ok, { gs, hit: !!hit, onLine: !!onLine, offLine, diffs: (ok.diffs || []).slice(0, 3) });
      const s = await screenOf(p, { x: 550, y: 381 });
      await p.mouse.click(s.x, s.y);
      await p.waitForTimeout(350);
      const after = await state(p);
      const wrote = after.types.slice(before.events).filter((t) => t !== 'dismiss' && t !== 'deselect');
      const stroke = await p.evaluate(() => { const ev = window.__mm.session.getEvents().filter((e) => e.type === 'stroke'); const e = ev[ev.length - 1]; return e ? { tool: e.tool, offer: e.offer, n: (e.points || []).length } : null; });
      check(`F12b. a tap along it draws the ink it is, as one act stamped with the tool and the offer (${wrote.join(', ')})`,
        wrote.join() === 'stroke' && stroke && stroke.tool === 'fill' && /^e2e-mark:/.test(stroke.offer) && stroke.n >= 3, { wrote, stroke });
      await undo(p);
      const undone = await state(p);
      check('F12c. …and one undo takes the ink away', undone.types.filter((t) => t === 'stroke').length === before.types.filter((t) => t === 'stroke').length, { before: before.types.length, undone: undone.types.length });
    } finally { await p.close().catch(() => {}); }
  });

  return { steps, guards: [guards] };
}

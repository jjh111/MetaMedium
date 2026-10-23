// The first hour, on a desktop and a phone (the UX pass), as a scenario of the gate.
//
//     node e2e/run.mjs ux
//
// The audit walked the app as a first-time person would (scratchpad audit ux.json, UX-02 … UX-16, and the
// critic's C4) and found what still made it "not yet a proper UX". Each record here is one of those, driven
// through the real surface with the pointer and the keyboard — and each would fail on the surface before the pass:
//   X1   every pane fits under the bar at 1280×800 and at 390×844: its last control is reached by scrolling the
//        pane with the wheel, and Escape closes it (UX-02; the models pane ran to 1,200 px, its Join below the fold)
//   X2   one Escape ladder: the field (even with a pill focused), then the open pane, then the grid, then the
//        selection — one thing a press (UX-09)
//   X3   the first run on a phone: the three steps and *start from an example* stand as a sheet at the foot of the
//        screen, the line says "double-tap" — and "double-click" once a mouse is used; the sheet leaves on the first
//        stroke and stays gone after an undo (UX-03)
//   X4   an example opens fitted to the free ground — every mark clear of the panel — with nothing inspected until
//        the hand points at a mark (UX-11), on the desktop and on the phone
//   X5   reduced motion (C4): with the preference, the working dot and the find ring hold still between frames,
//        and the film's program waits for the person's own play; without it, they move and it plays
//   X6   polish: Make it Mermaid's card is brought into view (UX-13); the export pane's buttons fit it, with plain
//        labels and the file's name in each tooltip (UX-12); over the grid the panel stands aside, the View group's
//        tile is "layout", and at 390 px the zoom tile keeps *fit* (UX-14); a new text and its editor stand clear of
//        the minimap (UX-15); a sentence said for a while lets go when the hand draws again (UX-16)
//
// It opens its own contexts (a desktop, a phone with touch, and one that asks for reduced motion), each with the
// gate's guards, so it runs like keep and boards.

import { waitReady } from './keep.mjs';

const APP = 'app/?fresh=1&nosw=1';
const DESKTOP = { viewport: { width: 1280, height: 800 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };

// --- the hand: strokes as a person draws them, in screen pixels (walk.mjs's) ---
const lerp = (a, b, n = 24) => Array.from({ length: n }, (_, i) => ({ x: a.x + (b.x - a.x) * i / (n - 1), y: a.y + (b.y - a.y) * i / (n - 1) }));
const join2 = (...parts) => parts.reduce((p, q) => p.concat(p.length ? q.slice(1) : q), []);
function box(x, y, w, h) {
  const v = [{ x: x + w / 2, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }, { x: x + w / 2 + 2, y: y + 1 }];
  return join2(...v.slice(1).map((p, i) => lerp(v[i], p, 20)));
}
function arrow(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  const w1 = { x: b.x - 22 * ux + 12 * uy, y: b.y - 22 * uy - 12 * ux }, w2 = { x: b.x - 22 * ux - 12 * uy, y: b.y - 22 * uy + 12 * ux };
  return join2(lerp(a, b, 40), lerp(b, w1, 8), lerp(w1, b, 8), lerp(b, w2, 8));
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

/** The panes, each with the control that opens it: the bar's find, else a tile of the control centre. */
const PANES = [
  ['boardsPanel', '#boardsBtn'], ['importPanel', '#importBtn'], ['exportPanel', '#exportBtn'], ['modelPanel', '#modelBtn'],
  ['livePanel', '#liveBtn'], ['packsPanel', '#packsBtn'], ['teachPanel', '#teachBtn'], ['helpPanel', '#helpBtn'], ['findPanel', '#findBtn'],
];

/** What a pane is now: whether it shows, its box, and its last control a person can reach (never an input kept out of sight). */
const paneNow = (page, id) => page.evaluate((id) => {
  const el = document.getElementById(id);
  if (!el || el.hidden || getComputedStyle(el).display === 'none') return { shown: false };
  const r = el.getBoundingClientRect();
  // Inside a closed <details> only its summary stands: the rest has boxes a script can measure but nothing a person sees.
  const folded = (c) => { for (let d = c.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) if (!d.open && !(c.tagName === 'SUMMARY' && c.parentElement === d)) return true; return false; };
  const controls = [...el.querySelectorAll('button, input, select, textarea, a, summary')]
    .filter((c) => !c.classList.contains('fileIn') && c.getAttribute('aria-hidden') !== 'true' && c.getClientRects().length > 0 && getComputedStyle(c).visibility !== 'hidden' && !folded(c));
  const last = controls[controls.length - 1];
  const lr = last ? last.getBoundingClientRect() : null;
  const join = document.getElementById('mpAdd');
  const jr = id === 'modelPanel' && join && join.getClientRects().length && !folded(join) ? join.getBoundingClientRect() : null;
  const box = (b) => b && { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right) };
  // Where a control stands in what the pane scrolls: within it, the wheel can bring it into view.
  const inContent = (b) => !!b && b.top - r.top + el.scrollTop >= -1 && b.bottom - r.top + el.scrollTop <= el.scrollHeight + 1 && b.left >= r.left - 1 && b.right <= r.right + 1;
  return {
    shown: true, pane: box(r), last: box(lr), lastWhat: last ? (last.id || last.textContent || last.tagName).trim().slice(0, 30) : null,
    lastInContent: inContent(lr), join: box(jr), joinInContent: jr ? inContent(jr) : null,
    scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, atEnd: el.scrollTop + el.clientHeight >= el.scrollHeight - 1,
    vh: innerHeight, vw: innerWidth, overflowY: getComputedStyle(el).overflowY,
  };
}, id);
/** A box inside another (and inside the window), give or take a pixel. */
const inside = (a, b) => !!a && !!b && a.top >= b.top - 1 && a.bottom <= b.bottom + 1 && a.left >= b.left - 1 && a.right <= b.right + 1;

export async function runUx(browser, servers, { freshContext }) {
  const origin = servers.staticOrigin;
  const steps = [];
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const guardsList = [];
  const record = async (name, fn) => {
    try { await fn(); } catch (err) { check(`${name} — threw: ${String(err && err.message ? err.message : err).split('\n')[0]}`, false, { stack: String(err && err.stack) }); }
  };
  const open = async (options, address = APP, label = 'ux') => {
    const guards = await freshContext(browser, { origins: [origin], label, options });
    guardsList.push(guards);
    // The models pane looks for models on this machine when it opens; the page is told nothing answered there (as
    // models.mjs does), so no request leaves for a local model server.
    await guards.context.addInitScript(() => {
      const real = window.fetch;
      window.fetch = function (input, init) {
        let u = null;
        try { u = new URL(typeof input === 'string' ? input : (input && input.url) || String(input), location.href); } catch (e) { return real.call(this, input, init); }
        if (['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) && (u.port === '11434' || u.port === '1234')) return Promise.reject(new TypeError('Failed to fetch'));
        return real.call(this, input, init);
      };
    });
    const page = await guards.context.newPage();
    await page.goto(origin + '/' + address, { waitUntil: 'load', timeout: 60000 });
    await waitReady(page);
    await page.waitForTimeout(300);
    return { page, guards };
  };
  const press = async (page, sel, phone) => { if (phone) await page.tap(sel); else await page.click(sel); await page.waitForTimeout(150); };
  const openPaneBy = async (page, id, sel, phone) => {
    if (sel !== '#findBtn') {
      const ccOpen = await page.evaluate(() => !document.getElementById('cc').hasAttribute('hidden'));
      if (!ccOpen) await press(page, '#ccBtn', phone);
    }
    await press(page, sel, phone);
    if (id === 'helpPanel') await page.waitForFunction(() => !/loading/.test(document.querySelector('#helpPanel .helpBody').textContent), null, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(150);
  };

  // ---- X1. every pane fits, scrolls to its last control, and Escape closes it -------------------------------------
  for (const [label, options, phone] of [['1280×800', DESKTOP, false], ['390×844', PHONE, true]]) {
    await record(`X1 ${label}`, async () => {
      const { page, guards } = await open(options, APP, 'ux-panes-' + label);
      const seen = [];
      for (const [id, sel] of PANES) {
        await openPaneBy(page, id, sel, phone);
        const before = await paneNow(page, id);
        if (!before.shown) { seen.push({ id, shown: false }); continue; }
        // A person's wheel over the pane, until it stops scrolling.
        const at = { x: (before.pane.left + before.pane.right) / 2, y: Math.min(before.vh - 20, (before.pane.top + before.pane.bottom) / 2) };
        await page.mouse.move(at.x, at.y);
        let last = -1;
        for (let i = 0; i < 40; i++) {
          await page.mouse.wheel(0, 400);
          await page.waitForTimeout(40);
          const top = await page.evaluate((id) => document.getElementById(id).scrollTop, id);
          if (top === last) break;
          last = top;
        }
        const after = await paneNow(page, id);
        const screen = { top: 0, bottom: after.vh, left: 0, right: after.vw };
        // It fits the window; the wheel took it to its end; and its last control — the models pane's Join too — stands
        // in what it scrolls, so scrolling brings it into view.
        const fits = after.pane.bottom <= after.vh + 1 && inside(after.pane, screen);
        const reached = !!after.last && after.atEnd && after.lastInContent;
        const joinOk = id !== 'modelPanel' || !after.join || after.joinInContent;
        // Escape closes it (its input may own Escape first: find's closes the pane itself).
        await page.keyboard.press('Escape');
        await page.waitForTimeout(150);
        const closed = !(await paneNow(page, id)).shown;
        seen.push({ id, shown: true, fits, reached, joinOk, closed, scrolled: after.scrollTop, tall: before.scrollHeight, room: before.clientHeight, last: after.lastWhat, pane: after.pane, lastBox: after.last, join: after.join });
      }
      const bad = seen.filter((p) => !p.shown || !p.fits || !p.reached || !p.joinOk || !p.closed);
      check(`X1. at ${label} every pane fits under the bar and the window, its last control is reached by scrolling it with the wheel — the models pane's Join too — and Escape closes it (${seen.length} panes${bad.length ? '; not: ' + bad.map((p) => p.id + (p.shown === false ? ' (did not open)' : (!p.fits ? ' runs off the window' : '') + (!p.reached ? ' last control out of reach (' + p.last + ')' : '') + (!p.joinOk ? ' Join out of reach' : '') + (!p.closed ? ' Escape left it open' : ''))).join(', ') : ''})`,
        bad.length === 0, { seen });
      await guards.context.close();
    });
  }

  // ---- X2. one Escape ladder ---------------------------------------------------------------------------------------
  await record('X2', async () => {
    const { page, guards } = await open(DESKTOP, APP, 'ux-escape');
    await draw(page, box(420, 380, 160, 110));
    await draw(page, box(760, 380, 160, 110));
    await hold(page, 420, 430);
    // The selection, the boards pane and the grid as well as the field, so each Escape has something to take back.
    await page.evaluate(() => { const mm = window.__mm, s = mm.session.getState(); mm.session.select(s.summon.enclosedIds.slice(), Date.now()); });
    await openPaneBy(page, 'boardsPanel', '#boardsBtn', false);
    await page.evaluate(() => { window.__mm.closeCC(); window.__mm.setViewMode('grid'); });
    // A pill holds the focus — Escape used to stop at it.
    const focused = await page.evaluate(() => { const p = document.querySelector('#summon .pill.item') || document.querySelector('#summon button'); if (p) p.focus(); return !!p && document.activeElement === p; });
    const state = () => page.evaluate(() => {
      const s = window.__mm.session.getState();
      return { field: !!s.summon, pane: !document.getElementById('boardsPanel').hasAttribute('hidden'), grid: window.__mm.viewMode() === 'grid', selection: s.selection.length };
    });
    const start = await state();
    const ladder = [];
    for (let i = 0; i < 4; i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(120); ladder.push(await state()); }
    const want = [
      { field: false, pane: true, grid: true }, { field: false, pane: false, grid: true },
      { field: false, pane: false, grid: false }, { field: false, pane: false, grid: false, selection: 0 },
    ];
    const ok = start.field && start.pane && start.grid && start.selection > 0 && focused &&
      want.every((w, i) => Object.keys(w).every((k) => ladder[i][k] === w[k])) && ladder[2].selection > 0;
    check(`X2. one Escape ladder, one thing a press: with a pill focused, the boards pane open, the grid on and marks selected — the field closes, then the pane, then the grid, then the selection (${ladder.map((l) => [l.field && 'field', l.pane && 'pane', l.grid && 'grid', l.selection && 'selection'].filter(Boolean).join('+') || 'nothing').join(' → ')})`,
      ok, { start, focused, ladder });
    await guards.context.close();
  });

  // ---- X3. the first run on a phone --------------------------------------------------------------------------------
  await record('X3', async () => {
    const { page, guards } = await open(PHONE, APP, 'ux-first');
    const first = await page.evaluate(() => {
      const el = document.getElementById('firstRun');
      const r = el && !el.hidden ? el.getBoundingClientRect() : null;
      const start = el && el.querySelector('button[data-example-start]');
      const sr = start ? start.getBoundingClientRect() : null;
      return {
        panelHidden: document.body.classList.contains('panelHidden'), sheet: !!r, steps: el ? el.querySelectorAll('.firstLoop li').length : 0,
        startShown: !!sr && sr.width > 0 && sr.top >= 0 && sr.bottom <= innerHeight && sr.left >= 0 && sr.right <= innerWidth,
        status: document.getElementById('status').textContent, state: window.__mm.firstRun(),
      };
    });
    check(`X3. a phone at 390 px opens with the panel closed, and the three steps and “start from an example” stand as a sheet at the foot of the screen, whole on it; the line says “double-tap” (${first.status})`,
      first.panelHidden && first.sheet && first.steps === 3 && first.startShown && /double-tap empty ground/.test(first.status) && !/double-click/.test(first.status), first);
    // The first stroke: the sheet leaves; the mouse drew it, so the line says double-click now — by the pointer, not the device.
    await draw(page, box(100, 300, 120, 80));
    const drawn = await page.evaluate(() => ({ state: window.__mm.firstRun(), hidden: document.getElementById('firstRun').hidden, words: window.__mm.tapWords() }));
    await page.evaluate(() => window.__mm.session.undo());
    await page.waitForTimeout(200);
    const undone = await page.evaluate(() => ({ state: window.__mm.firstRun(), hidden: document.getElementById('firstRun').hidden, empty: !window.__mm.session.getState().contentIds.length, status: document.getElementById('status').textContent }));
    check(`X3b. the sheet leaves on the first stroke and stays gone once the stroke is undone (${drawn.state.why}, then ${undone.state.why}); drawn with a mouse, the line's word is “${drawn.words}” (${undone.status})`,
      drawn.hidden && undone.hidden && undone.empty && drawn.words === 'double-click' && /double-click empty ground/.test(undone.status), { drawn, undone });
    // A finger's tap after the mouse: the word follows the pointer again.
    await page.tap('#undoBtn');
    const tapped = await page.evaluate(() => window.__mm.tapWords());
    check(`X3c. a finger's tap makes the word “${tapped}” again — read from the pointer's own type`, tapped === 'double-tap', { tapped });
    await guards.context.close();
  });

  // ---- X4. an example opens fitted, nothing inspected -------------------------------------------------------------
  for (const [label, options, phone] of [['1280×800', DESKTOP, false], ['390×844', PHONE, true]]) {
    await record(`X4 ${label}`, async () => {
      const { page, guards } = await open(options, APP, 'ux-example-' + label);
      const sel = phone ? '#firstRun button[data-example-start]' : '#inspector button[data-example-start]';
      await press(page, sel, phone);
      await page.waitForFunction(() => window.__mm.session.getState().contentIds.length > 0, null, { timeout: 15000 });
      await page.waitForTimeout(500);
      const got = await page.evaluate(() => {
        const mm = window.__mm, s = mm.session.getState(), free = mm.usableViewport();
        const out = [];
        for (const id of s.contentIds) {
          const b = mm.MM.boundsOf(s.nodes.get(id));
          if (!b) continue;
          const a = mm.worldToScreen(b.minX, b.minY), z = mm.worldToScreen(b.maxX, b.maxY);
          out.push({ id, left: a.x, top: a.y, right: z.x, bottom: z.y });
        }
        const panel = document.getElementById('inspector');
        const pr = panel && getComputedStyle(panel).display !== 'none' ? panel.getBoundingClientRect() : null;
        const under = pr ? out.filter((m) => m.left < pr.right && m.right > pr.left && m.top < pr.bottom && m.bottom > pr.top).map((m) => m.id) : [];
        const off = out.filter((m) => m.left < free.left - 1 || m.right > free.right + 1 || m.top < free.top - 1 || m.bottom > free.bottom + 1).map((m) => m.id);
        return { marks: out.length, under, off, resting: mm.resting(), reading: mm.readingDrawn(), panel: panel ? panel.innerText.replace(/\s+/g, ' ').slice(0, 160) : '', sheet: !document.getElementById('firstRun').hidden };
      });
      check(`X4. at ${label} “start from an example” opens the board fitted to the free ground — no mark under the panel or off it (${got.marks} marks; under ${got.under.length}, off ${got.off.length}) — and nothing is inspected: no reading under a mark, the panel says what the board holds (${got.panel.slice(0, 90)})`,
        got.marks > 0 && got.under.length === 0 && got.off.length === 0 && got.resting && !got.reading && (phone || /this board/i.test(got.panel)) && !got.sheet, got);
      if (!phone) {
        // The hand points at a mark: it is inspected, as ever.
        const pointAt = await page.evaluate(() => { const mm = window.__mm, s = mm.session.getState(); const id = s.contentIds.find((x) => !s.artifacts.includes(x)); const b = mm.MM.boundsOf(s.nodes.get(id)); const p = mm.worldToScreen((b.minX + b.maxX) / 2, b.minY); return { id, x: p.x, y: p.y + 1 }; });
        await page.mouse.move(pointAt.x, pointAt.y);
        await page.waitForTimeout(250);
        const pointed = await page.evaluate(() => ({ reading: window.__mm.readingDrawn(), panel: document.getElementById('inspector').innerText.replace(/\s+/g, ' ').slice(0, 80) }));
        check(`X4b. pointed at, a mark is inspected as ever (${pointed.reading && pointed.reading.text}; ${pointed.panel.slice(0, 50)})`, !!pointed.reading && !/this board/i.test(pointed.panel), pointed);
      }
      await guards.context.close();
    });
  }

  // ---- X5. reduced motion -----------------------------------------------------------------------------------------
  await record('X5', async () => {
    const motion = {};
    for (const [label, options] of [['reduced', Object.assign({ reducedMotion: 'reduce' }, DESKTOP)], ['normal', Object.assign({ reducedMotion: 'no-preference' }, DESKTOP)]]) {
      const { page, guards } = await open(options, APP, 'ux-motion-' + label);
      await draw(page, box(420, 400, 160, 110));
      // A model at work, with no model asked: the dot above the box, painted every 400 ms.
      const dot = await page.evaluate(() => {
        const mm = window.__mm, s = mm.session.getState(), id = s.contentIds[0];
        mm.beginWork('ux-motion', [id], 'stub · reading');
        const b = mm.MM.boundsOf(s.nodes.get(id)), p = mm.worldToScreen(b.minX, b.minY);
        return { x: Math.round(p.x - 4), y: Math.round(p.y - 46), reduced: mm.motionReduced() };
      });
      const clip = { x: dot.x, y: dot.y, width: 20, height: 22 };
      const frames = [];
      for (let i = 0; i < 4; i++) { await page.waitForTimeout(430); frames.push((await page.screenshot({ clip })).toString('base64')); }
      await page.evaluate(() => window.__mm.endWork('ux-motion'));
      const dotStill = frames.every((f) => f === frames[0]);
      // The find ring round a word found.
      await page.evaluate(() => { const s = window.__mm.session, id = s.getState().contentIds[0]; s.label({ nodeId: id, text: 'Pricing', at: Date.now() }); });
      await page.waitForTimeout(1300); // the board's index is kept a moment after its last change
      await page.click('#findBtn');
      await page.fill('#findInput', 'Pricing');
      await page.waitForSelector('#findPanel .fdHit', { timeout: 10000 });
      await page.click('#findPanel .fdHit');
      await page.waitForTimeout(250);
      const ringBox = await page.evaluate(() => { const st = window.__mm.findFlashState(); if (!st.active) return null; const a = window.__mm.worldToScreen(st.box.minX, st.box.minY), z = window.__mm.worldToScreen(st.box.maxX, st.box.maxY); return { x: Math.round(a.x - 20), y: Math.round(a.y - 20), w: Math.round(z.x - a.x + 40), h: Math.round(z.y - a.y + 40) }; });
      const ring = [];
      if (ringBox) for (let i = 0; i < 3; i++) { ring.push((await page.screenshot({ clip: { x: ringBox.x, y: ringBox.y, width: ringBox.w, height: ringBox.h } })).toString('base64')); await page.waitForTimeout(110); }
      const ringStill = ring.length === 3 && ring.every((f) => f === ring[0]);
      motion[label] = { reduced: dot.reduced, dotStill, ringStill, ring: !!ringBox };
      await guards.context.close();
    }
    check(`X5. with prefers-reduced-motion the working dot and the find ring hold still between frames (dot ${motion.reduced.dotStill ? 'still' : 'moves'}, ring ${motion.reduced.ringStill ? 'still' : 'moves'}); without it, both move (dot ${motion.normal.dotStill ? 'still' : 'moves'}, ring ${motion.normal.ringStill ? 'still' : 'moves'})`,
      motion.reduced.reduced && motion.reduced.dotStill && motion.reduced.ringStill && !motion.normal.reduced && !motion.normal.dotStill && !motion.normal.ringStill && motion.normal.ring, motion);
    // The film: an example's program plays on its own — unless the person asked for less motion.
    const film = {};
    for (const [label, options] of [['reduced', Object.assign({ reducedMotion: 'reduce' }, DESKTOP)], ['normal', Object.assign({ reducedMotion: 'no-preference' }, DESKTOP)]]) {
      const { page, guards } = await open(options, 'app/?nosw=1&example=story', 'ux-film-' + label);
      await page.waitForFunction(() => window.__mm.session.getState().live.some((id) => { const c = window.__mm.session.getState().clocks[id]; return c && c.playing; }), null, { timeout: 20000 });
      await page.waitForTimeout(400);
      film[label] = await page.evaluate(() => {
        const mm = window.__mm, s = mm.session.getState();
        const playing = s.live.filter((id) => s.clocks[id] && s.clocks[id].playing);
        return { programs: playing.length, runsHere: playing.filter((id) => mm.playedHere(id)).length, status: document.getElementById('status').textContent };
      });
      await guards.context.close();
    }
    check(`X5b. the film's example under reduced motion waits for the person's own play — ${film.reduced.runsHere} of ${film.reduced.programs} running, said: “${film.reduced.status.slice(0, 80)}” — and without the preference it plays (${film.normal.runsHere} of ${film.normal.programs})`,
      film.reduced.programs > 0 && film.reduced.runsHere === 0 && /less motion/.test(film.reduced.status) && film.normal.runsHere === film.normal.programs && film.normal.programs > 0, film);
  });

  // ---- X6. polish ---------------------------------------------------------------------------------------------------
  await record('X6', async () => {
    const { page, guards } = await open(DESKTOP, APP, 'ux-polish');
    // Make it Mermaid on a drawing near the right edge: its card stands right of it, off the window — and is brought in.
    await draw(page, box(820, 360, 140, 90));
    await draw(page, box(1080, 360, 140, 90));
    await draw(page, arrow({ x: 962, y: 405 }, { x: 1078, y: 405 }));
    await hold(page, 822, 400);
    const pill = page.locator('#summon .pill.item', { hasText: 'Make it Mermaid' }).first();
    await pill.click();
    await page.waitForTimeout(500);
    const card = await page.evaluate(() => {
      const mm = window.__mm, s = mm.session.getState();
      const id = s.artifacts.find((a) => { const n = s.nodes.get(a); return n && n.reps.some((r) => r.modality === 'code' && r.data.kind === 'mermaid'); });
      if (!id) return null;
      const b = mm.MM.boundsOf(s.nodes.get(id)), a = mm.worldToScreen(b.minX, b.minY), z = mm.worldToScreen(b.maxX, b.maxY);
      return { left: a.x, top: a.y, right: z.x, bottom: z.y, vw: innerWidth, vh: innerHeight };
    });
    check(`X6. Make it Mermaid's card, standing right of a drawing at the window's edge, is brought into view (${card ? Math.round(card.left) + '–' + Math.round(card.right) + ' of ' + card.vw : 'no card'})`,
      !!card && card.left >= 0 && card.right <= card.vw && card.top >= 0 && card.bottom <= card.vh, card);
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.waitForTimeout(150);

    // The export pane: every button inside it, plain labels, the file's name in the tooltip.
    await openPaneBy(page, 'exportPanel', '#exportBtn', false);
    const ex = await page.evaluate(() => {
      const p = document.getElementById('exportPanel'), pr = p.getBoundingClientRect();
      return [...p.querySelectorAll('button[data-export], button[data-mathsout]')].filter((b) => b.getClientRects().length).map((b) => {
        const r = b.getBoundingClientRect();
        return { label: b.textContent.trim(), title: b.title, fits: r.left >= pr.left && r.right <= pr.right - 4 && b.scrollWidth <= b.clientWidth + 1 };
      });
    });
    const plain = ex.every((b) => !/\.(svg|png|pdf|jsonl|mmd|html|zip)$/i.test(b.label));
    const named = ex.filter((b) => b.label !== 'board + pictures' && !/print|true size/.test(b.label)).every((b) => /\.(svg|png|pdf|jsonl|mmd|zip)\b/.test(b.title));
    check(`X6b. the export pane's buttons fit it, with plain labels and each file's name in its tooltip (${ex.map((b) => b.label + (b.fits ? '' : ' — spills')).join(' · ')})`,
      ex.length >= 5 && ex.every((b) => b.fits) && plain && named, ex);
    await page.keyboard.press('Escape'); await page.waitForTimeout(100);

    // A double-click just above and left of the minimap: the editor would run over it, and the text it keeps under it.
    const mini = await page.evaluate(() => { const r = document.getElementById('minimap').getBoundingClientRect(); return { left: r.left, top: r.top }; });
    await page.mouse.dblclick(mini.left - 90, mini.top - 30);
    await page.waitForTimeout(250);
    const ed = await page.evaluate(() => {
      const e = document.getElementById('textEditor'), m = document.getElementById('minimap');
      const er = e.getBoundingClientRect(), mr = m && !m.hidden ? m.getBoundingClientRect() : null;
      return { open: !e.hidden, editor: { left: er.left, top: er.top, right: er.right, bottom: er.bottom }, minimap: mr && { left: mr.left, top: mr.top, right: mr.right, bottom: mr.bottom }, vw: innerWidth, vh: innerHeight };
    });
    await page.keyboard.type('a note');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    const txt = await page.evaluate(() => {
      const mm = window.__mm, s = mm.session.getState(), id = s.artifacts[s.artifacts.length - 1];
      const b = mm.MM.boundsOf(s.nodes.get(id)), a = mm.worldToScreen(b.minX, b.minY), z = mm.worldToScreen(b.maxX, b.maxY);
      return { left: a.x, top: a.y, right: z.x, bottom: z.y };
    });
    const clear = (r, m) => !m || r.right <= m.left || r.left >= m.right || r.bottom <= m.top || r.top >= m.bottom;
    const within = (r) => r.left >= 0 && r.top >= 0 && r.right <= ed.vw && r.bottom <= ed.vh;
    check(`X6c. a double-click by the minimap opens the editor clear of it and inside the window, and the text it keeps stands clear of it too`,
      ed.open && !!ed.minimap && clear(ed.editor, ed.minimap) && within(ed.editor) && clear(txt, ed.minimap) && within(txt), { ed, txt });

    // Over the grid, the panel stands aside; the View group's tile is "layout".
    await page.evaluate(() => window.__mm.setViewMode('grid'));
    await page.waitForTimeout(150);
    const grid = await page.evaluate(() => {
      window.__mm.openCC();
      const head = document.querySelector('#cc .ccGroup[data-group="view"] .ccHead').textContent.trim();
      const tile = (document.querySelector('#gridBtn .k') || {}).textContent;
      const face = (document.querySelector('#gridBtn .v') || {}).textContent;
      window.__mm.closeCC();
      return { panel: getComputedStyle(document.getElementById('inspector')).display, head, tile, face };
    });
    await page.evaluate(() => window.__mm.setViewMode('canvas'));
    check(`X6d. over the grid the panel stands aside (${grid.panel}); the View group's tile is “${grid.tile}: ${grid.face}”, not a second “View”`,
      grid.panel === 'none' && grid.tile === 'layout' && grid.face === 'cards' && grid.head.toLowerCase() !== grid.tile.toLowerCase(), grid);

    // A sentence said for a while lets go once the hand draws again.
    await openPaneBy(page, 'packsPanel', '#packsBtn', false);
    await page.click('#packsPanel .pkItem[data-pack="basics@1"] button[data-use]');
    await page.keyboard.press('Escape');
    const said = await page.evaluate(() => document.getElementById('status').textContent);
    await page.waitForTimeout(1900);
    await draw(page, box(200, 600, 80, 60));
    const after = await page.evaluate(() => document.getElementById('status').textContent);
    check(`X6e. a sentence said for a while (“${said.slice(0, 50)}”) lets go once the hand draws again (now: ${after.slice(0, 70)})`,
      /using the Basics pack/.test(said) && !/using the Basics pack/.test(after), { said, after });
    await guards.context.close();
  });

  await record('X6 390', async () => {
    const { page, guards } = await open(PHONE, APP, 'ux-polish-phone');
    await press(page, '#ccBtn', true);
    const fit = await page.evaluate(() => {
      const b = document.getElementById('fitBtn'), cc = document.getElementById('cc').getBoundingClientRect();
      const r = b.getBoundingClientRect();
      return { shown: b.getClientRects().length > 0 && getComputedStyle(b).display !== 'none', inside: r.left >= cc.left && r.right <= cc.right && r.top >= cc.top && r.bottom <= cc.bottom };
    });
    check(`X6f. at 390 px the zoom tile keeps “fit” (pinch zooms; the buttons for − and + are gone)`, fit.shown && fit.inside, fit);
    await guards.context.close();
  });

  return { steps, guards: guardsList };
}

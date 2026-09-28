// Pencil and tablet (V1-PLAN.md §7 and §9 R6; acceptance scenario A10), as a
// scenario of the gate.
//
//     node e2e/run.mjs pencil                    # on Chromium, in the default run
//     node e2e/run.mjs --browser webkit pencil   # on WebKit — CI's `webkit` job
//
// A desktop engine has no pencil and no finger to give, so both are SYNTHESISED
// IN THE PAGE: `PointerEvent`s with `pointerType: 'pen'` (and a pressure, a
// tilt) and `pointerType: 'touch'` (a finger; a palm is a touch that is wider),
// dispatched at the canvas the way iPadOS delivers them — a pencil as `pen`, a
// finger as `touch`, each with its own pointer id. The surface decides by
// `pointerType`, never by the user agent, so the same events mean the same
// thing here and on the glass. What only the glass can say — the Pencil's
// real hover height, the keyboard, a real palm — is QA-v1.md §A10, by hand.
//
// The records:
//   P1   the pen draws, and every point of its stroke carries its pressure
//   P1b  the switch to the pen is said once, and the hand tile says so
//   P2   a finger pans while a pen is present, and draws nothing
//   P2b  two fingers pinch, and leave nothing in the log
//   P3   a palm that lands while the pen draws is ignored — the stroke is the pen's
//   P3b  a palm just after the pen lifts is ignored; one just before it lands has its pan undone
//   P4   the pen's hover is a hover: the reading of the mark under it, and the magnet ghost

import { sleep, waitReady } from './keep.mjs';

/** The page's own hand: a pen and fingers, synthesised as iPadOS delivers them. Installed after every load. */
function installHand() {
  const c = document.getElementById('canvas');
  const PEN = 2;
  const base = { bubbles: true, cancelable: true, composed: true, width: 1, height: 1, pressure: 0, button: -1, buttons: 0 };
  const fire = (el, type, o) => el.dispatchEvent(new PointerEvent(type, Object.assign({}, base, o)));
  const pen = (o) => Object.assign({ pointerId: PEN, pointerType: 'pen', isPrimary: true, tiltX: 28, tiltY: 16 }, o);
  const finger = (id, size, o) => Object.assign({ pointerId: id, pointerType: 'touch', isPrimary: id === 11, width: size || 18, height: size || 18 }, o);
  window.__hand = {
    penDown: (x, y, p, el) => fire(el || c, 'pointerdown', pen({ clientX: x, clientY: y, pressure: p === undefined ? 0.5 : p, button: 0, buttons: 1 })),
    penMove: (x, y, p, el) => fire(el || c, 'pointermove', pen({ clientX: x, clientY: y, pressure: p === undefined ? 0.5 : p, button: -1, buttons: 1 })),
    penUp: (x, y, el) => fire(el || c, 'pointerup', pen({ clientX: x, clientY: y, pressure: 0, button: 0, buttons: 0 })),
    // A pencil near the glass, touching nothing: a move with no button and no pressure.
    penHover: (x, y) => fire(c, 'pointermove', pen({ clientX: x, clientY: y, pressure: 0, button: -1, buttons: 0 })),
    penLeave: () => c.dispatchEvent(new PointerEvent('pointerleave', pen({ bubbles: false, cancelable: false }))),
    /** A pen stroke through `pts`, each point pressed as `ps[i]` says. */
    penStroke(pts, ps) {
      this.penDown(pts[0].x, pts[0].y, ps ? ps[0] : 0.5);
      for (let i = 1; i < pts.length; i++) this.penMove(pts[i].x, pts[i].y, ps ? ps[i] : 0.5);
      this.penUp(pts[pts.length - 1].x, pts[pts.length - 1].y);
    },
    /** A pen's tap on an element — a pill, a button: down, up, and the click the browser makes of them. */
    penTap(el) {
      const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      this.penDown(x, y, 0.4, el); this.penUp(x, y, el);
      el.dispatchEvent(new PointerEvent('click', pen({ bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 })));
    },
    touchDown: (id, x, y, size) => fire(c, 'pointerdown', finger(id, size, { clientX: x, clientY: y, pressure: 0.5, button: 0, buttons: 1 })),
    touchMove: (id, x, y, size) => fire(c, 'pointermove', finger(id, size, { clientX: x, clientY: y, pressure: 0.5, button: -1, buttons: 1 })),
    touchUp: (id, x, y, size) => fire(c, 'pointerup', finger(id, size, { clientX: x, clientY: y, pressure: 0, button: 0, buttons: 0 })),
    /** A finger (or a palm) from one point to another in `n` moves. */
    touchDrag(id, a, b, n, size, lift) {
      this.touchDown(id, a.x, a.y, size);
      for (let i = 1; i <= n; i++) this.touchMove(id, a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n, size);
      if (lift !== false) this.touchUp(id, b.x, b.y, size);
    },
  };
}

/** What the page holds now, for comparing before and after an act. */
function boardNow() {
  const mm = window.__mm, s = mm.session.getState();
  const ev = mm.session.getEvents();
  const strokes = ev.filter((e) => e.type === 'stroke');
  return {
    events: ev.length,
    strokes: strokes.length,
    nulls: strokes.filter((e) => !e.points).length,
    view: { zoom: +mm.view.zoom.toFixed(4), panX: +mm.view.panX.toFixed(2), panY: +mm.view.panY.toFixed(2) },
    content: s.contentIds.length,
    summon: !!s.summon,
    status: (document.getElementById('status').textContent || '').trim(),
  };
}

/** The last stroke event: its points, and what its mark reads as. */
function lastStroke() {
  const mm = window.__mm, MM = mm.MM, s = mm.session.getState();
  const ev = mm.session.getEvents().filter((e) => e.type === 'stroke');
  const e = ev[ev.length - 1];
  const id = s.contentIds[s.contentIds.length - 1];
  const n = id && s.nodes.get(id);
  const r = n && MM.interpretationsOf(n, s.nodes).filter((x) => x.tier === 0)[0];
  return e ? {
    id: id || null,
    n: e.points ? e.points.length : null,
    withP: e.points ? e.points.filter((p) => typeof p.p === 'number' && p.p >= 0 && p.p <= 1).length : 0,
    ps: e.points ? e.points.map((p) => p.p) : null,
    x0: e.points ? e.points[0].x : null, y0: e.points ? e.points[0].y : null,
    x1: e.points ? e.points[e.points.length - 1].x : null, y1: e.points ? e.points[e.points.length - 1].y : null,
    reads: r ? r.label : null,
  } : null;
}

/** Is anything drawn on the pen's own layer within `r` pixels of a screen point? */
function liveInkNear({ pt, r }) {
  const live = document.getElementById('liveInk');
  if (!live) return false;
  const dpr = window.devicePixelRatio || 1;
  const g = live.getContext('2d');
  const x = Math.max(0, Math.round((pt.x - r) * dpr)), y = Math.max(0, Math.round((pt.y - r) * dpr));
  const d = g.getImageData(x, y, Math.round(2 * r * dpr), Math.round(2 * r * dpr)).data;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return true;
  return false;
}

// The pen's box, drawn where the panel, the bar and the minimap leave the board clear.
const BOX = { x: 560, y: 200, w: 200, h: 130 };
function boxPath(b, k) {
  const c = [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h], [b.x + 2, b.y + 4]];
  const pts = [{ x: b.x, y: b.y }];
  for (let i = 1; i < c.length; i++) for (let j = 1; j <= k; j++) pts.push({ x: c[i - 1][0] + ((c[i][0] - c[i - 1][0]) * j) / k, y: c[i - 1][1] + ((c[i][1] - c[i - 1][1]) * j) / k });
  return pts;
}
/** How hard the pen presses along a stroke: light at the ends, heavier in the middle — as a hand does. */
const pressures = (n) => Array.from({ length: n }, (_, i) => +(0.25 + 0.5 * Math.sin((Math.PI * i) / Math.max(1, n - 1))).toFixed(3));
/** The palm window the surface keeps after the pen's last event, and a margin past it. */
const PAST_PALM_MS = 800;

export async function runPencil(browser, servers, { freshContext, screenshot }) {
  const steps = [];
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const measured = {};
  const guards = await freshContext(browser, { origins: [servers.staticOrigin], label: 'pencil' });
  const page = await guards.context.newPage();
  // An iPad's screen in landscape, not a desktop's: the panel docks where it would there.
  await page.setViewportSize({ width: 1180, height: 820 });
  const url = `${servers.staticOrigin}/Demos/session-engine.html?nosw=1`;
  const record = async (name, fn) => {
    try { await fn(); } catch (err) { check(`${name} — threw: ${String(err && err.message ? err.message : err).split('\n')[0]}`, false, { stack: String(err && err.stack) }); }
  };
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await waitReady(page);
    await page.evaluate(installHand);
    check('P0. the board opens, empty, at an iPad\'s size (1180 × 820)', (await page.evaluate(boardNow)).events === 0);

    // ---- P1. The pen draws, and its pressure is on every point ----
    let box = null;
    await record('P1', async () => {
      const before = await page.evaluate(boardNow);
      const pts = boxPath(BOX, 8), ps = pressures(pts.length);
      await page.evaluate(({ pts, ps }) => window.__hand.penStroke(pts, ps), { pts, ps });
      await sleep(60);
      const after = await page.evaluate(boardNow);
      box = await page.evaluate(lastStroke);
      const same = box && box.ps && box.ps.every((p, i) => Math.abs(p - ps[i]) < 0.002);
      check(`P1. the pen draws: a box drawn with pointerType pen is one stroke, read as ${box && box.reads}, and every one of its ${box && box.n} points carries the pen's pressure as it was pressed (${box && box.withP} do)`,
        after.strokes === before.strokes + 1 && box && box.reads === 'rectangle' && box.n === pts.length && box.withP === pts.length && same,
        { before, after, box: box && { n: box.n, withP: box.withP, reads: box.reads, ps: (box.ps || []).slice(0, 6) }, pressed: ps.slice(0, 6) });
    });

    // ---- P1b. The switch, said once; the tile's face ----
    await record('P1b', async () => {
      const said = await page.evaluate(() => (document.getElementById('status').textContent || '').trim());
      const face = await page.evaluate(() => {
        const t = document.getElementById('handBtn');
        window.__mm.syncTiles();
        return (t.querySelector('.v') || {}).textContent || '';
      });
      const draws = await page.evaluate(() => (typeof window.__mm.draws === 'function' ? window.__mm.draws() : null));
      check(`P1b. the switch is said once — the status line says the pen draws now and a finger pans ("${said.slice(0, 90)}") — and the hand tile's face says "${face}"`,
        /pen/.test(said) && /finger pans/.test(said) && face === 'right · pen' && draws === 'pen',
        { said, face, draws });
    });

    // ---- P2. A finger pans while a pen is present, and draws nothing ----
    await record('P2', async () => {
      await sleep(PAST_PALM_MS); // past the palm window: this finger is a finger
      const before = await page.evaluate(boardNow);
      await page.evaluate(() => window.__hand.touchDrag(11, { x: 900, y: 520 }, { x: 780, y: 460 }, 12));
      await sleep(80);
      const after = await page.evaluate(boardNow);
      const dx = +(after.view.panX - before.view.panX).toFixed(2), dy = +(after.view.panY - before.view.panY).toFixed(2);
      check(`P2. a finger pans while a pen is present: one finger dragged 120 px left and 60 px up moves the view ${dx}, ${dy} and adds nothing to the log (${after.events - before.events} events)`,
        dx === -120 && dy === -60 && after.events === before.events && after.view.zoom === before.view.zoom,
        { before, after });
      await page.evaluate(() => window.__mm.setView(1, 0, 0));
    });

    // ---- P3. A palm that lands while the pen draws is ignored ----
    await record('P3', async () => {
      await sleep(PAST_PALM_MS);
      const before = await page.evaluate(boardNow);
      // The pen draws a line; five moves in, a palm lands below-right of the tip and drifts with the hand.
      const r = await page.evaluate(() => {
        const h = window.__hand, pts = [];
        for (let i = 0; i <= 24; i++) pts.push({ x: 560 + i * 12.5, y: 440 });
        h.penDown(pts[0].x, pts[0].y, 0.4);
        for (let i = 1; i < pts.length; i++) {
          h.penMove(pts[i].x, pts[i].y, 0.5);
          if (i === 5) h.touchDown(21, 760, 560, 64);
          if (i > 5) h.touchMove(21, 760 + i * 2, 560 + (i % 3), 64);
        }
        h.penUp(pts[pts.length - 1].x, pts[pts.length - 1].y);
        h.touchMove(21, 820, 590, 64);
        h.touchUp(21, 820, 590, 64);
        return { pts: pts.length };
      });
      await sleep(80);
      const after = await page.evaluate(boardNow);
      const line = await page.evaluate(lastStroke);
      check(`P3. a palm is ignored: a touch that lands while the pen draws, and moves with the hand, adds no point to the pen's stroke (${line && line.n} points, ${line && line.withP} of them the pen's, from x ${line && line.x0} to ${line && line.x1}), no stroke of its own (${after.strokes - before.strokes} added), and moves nothing`,
        after.strokes === before.strokes + 1 && line && line.n === r.pts && line.withP === r.pts && line.x0 === 560 && line.x1 === 860 && line.y0 === 440 && line.y1 === 440
          && after.view.panX === before.view.panX && after.view.panY === before.view.panY && after.view.zoom === before.view.zoom,
        { before, after, line: line && { n: line.n, withP: line.withP, x0: line.x0, x1: line.x1, y0: line.y0, y1: line.y1, reads: line.reads } });
    });

    // ---- P3b. A palm just after the pen, and one just before it ----
    await record('P3b', async () => {
      // Just after: the pen lifts, and 100 ms later the hand's heel comes down and slides.
      const a0 = await page.evaluate(boardNow);
      await page.evaluate(() => { const h = window.__hand; h.penDown(600, 520, 0.4); h.penMove(640, 520, 0.5); h.penMove(680, 520, 0.5); h.penUp(680, 520); });
      await sleep(100);
      await page.evaluate(() => window.__hand.touchDrag(22, { x: 900, y: 600 }, { x: 800, y: 560 }, 10, 64));
      await sleep(60);
      const a1 = await page.evaluate(boardNow);
      const after = a1.strokes === a0.strokes + 1 && a1.view.panX === a0.view.panX && a1.view.panY === a0.view.panY && a1.events === a0.events + 1;
      // Just before: past the window, the heel lands first and slides 40 px (a pan), and 150 ms later the pen comes down.
      await sleep(PAST_PALM_MS);
      const b0 = await page.evaluate(boardNow);
      await page.evaluate(() => { const h = window.__hand; h.touchDown(23, 950, 620, 64); for (let i = 1; i <= 8; i++) h.touchMove(23, 950 - i * 5, 620, 64); });
      const panned = await page.evaluate(boardNow);
      await sleep(150);
      await page.evaluate(() => { const h = window.__hand; h.penDown(600, 580, 0.4); for (let i = 1; i <= 10; i++) { h.penMove(600 + i * 10, 580, 0.5); h.touchMove(23, 910 - i * 3, 620, 64); } h.penUp(700, 580); h.touchUp(23, 880, 620, 64); });
      await sleep(80);
      const b1 = await page.evaluate(boardNow);
      const drawn = await page.evaluate(lastStroke);
      const before = panned.view.panX !== b0.view.panX && b1.view.panX === b0.view.panX && b1.view.panY === b0.view.panY && b1.strokes === b0.strokes + 1
        && drawn && drawn.x0 === 600 && drawn.x1 === 700 && drawn.withP === drawn.n;
      check(`P3b. a palm that lands just after the pen lifts does nothing (the view ${a1.view.panX === a0.view.panX ? 'unmoved' : 'moved'}, ${a1.events - a0.events - 1} events of its own); one that landed a moment before the pen had its pan undone when the pen came down (the view moved ${panned.view.panX - b0.view.panX} px and came back to ${b1.view.panX}), and the pen's stroke stands where it was drawn (x ${drawn && drawn.x0}–${drawn && drawn.x1})`,
        after && before, { a0, a1, b0, panned, b1, drawn: drawn && { x0: drawn.x0, x1: drawn.x1, n: drawn.n, withP: drawn.withP } });
      await page.evaluate(() => window.__mm.setView(1, 0, 0));
    });

    // ---- P4. The pen's hover is a hover: the reading under it, and the magnet ghost ----
    await record('P4', async () => {
      await sleep(40);
      const target = await page.evaluate((id) => {
        const mm = window.__mm, s = mm.session.getState(), n = s.nodes.get(id);
        const sites = mm.MM.magnetSites(n, s.nodes).filter((x) => x.kind === 'corner');
        const tr = sites.sort((a, b) => (b.point.x - b.point.y) - (a.point.x - a.point.y))[0]; // the top-right corner
        const at = mm.worldToScreen(tr.point.x, tr.point.y);
        return { at: at, kind: tr.kind, nodeId: tr.nodeId };
      }, box.id);
      const before = await page.evaluate(boardNow);
      await page.evaluate(({ x, y }) => window.__hand.penHover(x + 2, y + 2), target.at);
      await sleep(60);
      const over = await page.evaluate(() => ({ reading: window.__mm.readingDrawn(), hook: typeof window.__mm.penHover === 'function' ? window.__mm.penHover() : null }));
      const ghost = await page.evaluate(liveInkNear, { pt: target.at, r: 5 }).catch(() => false);
      await page.evaluate(() => window.__hand.penHover(1000, 640));
      await sleep(60);
      const off = await page.evaluate(liveInkNear, { pt: target.at, r: 5 }).catch(() => true);
      const offHook = await page.evaluate(() => (typeof window.__mm.penHover === 'function' ? window.__mm.penHover() : 'no hook'));
      await page.evaluate(() => window.__hand.penLeave());
      const after = await page.evaluate(boardNow);
      check(`P4. pen hover: the pen held over the box's top-right corner, touching nothing, shows the box's reading under it ("${over.reading && over.reading.text}") and the magnet ghost at the corner (${over.hook ? over.hook.kind + ' of ' + over.hook.nodeId : 'no site said'}; ${ghost ? 'drawn' : 'nothing drawn'} on the pen's layer); moved off, the ghost goes (${off ? 'still drawn' : 'gone'}); nothing is logged`,
        over.reading && over.reading.id === box.id && /rectangle/.test(over.reading.text) && ghost && over.hook && over.hook.kind === 'corner' && over.hook.nodeId === box.id
          && !off && offHook === null && after.events === before.events,
        { target, over, ghost, off, offHook, before: before.events, after: after.events });
    });

    // ---- P2b. Two fingers pinch, and leave nothing in the log ----
    await record('P2b', async () => {
      await sleep(PAST_PALM_MS);
      await page.evaluate(() => window.__mm.setView(1, 0, 0));
      const before = await page.evaluate(boardNow);
      await page.evaluate(() => {
        const h = window.__hand;
        h.touchDown(11, 700, 560); h.touchDown(12, 900, 560);
        for (let i = 1; i <= 10; i++) { h.touchMove(11, 700 - i * 5, 560); h.touchMove(12, 900 + i * 5, 560); }
        h.touchUp(11, 650, 560); h.touchUp(12, 950, 560);
      });
      await sleep(80);
      const after = await page.evaluate(boardNow);
      check(`P2b. two fingers pinch: the view zooms ${after.view.zoom}× (1.5 from 1), nothing is added to the log (${after.events - before.events} events, ${after.nulls} strokes with no points) — a pinch's last finger used to commit a stroke with no points, and throw`,
        Math.abs(after.view.zoom - 1.5) < 1e-3 && after.events === before.events && after.nulls === 0,
        { before, after });
      await page.evaluate(() => window.__mm.setView(1, 0, 0));
    });
  } catch (err) {
    check(`the scenario itself fell over: ${String(err && err.message ? err.message : err).split('\n')[0]}`, false, { stack: String(err && err.stack) });
    await screenshot(page, 'pencil');
  }
  if (steps.some((s) => !s.ok)) await screenshot(page, 'pencil');
  return { steps, guards: [guards], measured };
}

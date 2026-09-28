// Pencil and tablet (V1-PLAN.md §7 and §9 R6; acceptance scenario A10), as a
// scenario of the gate.
//
//     node e2e/run.mjs pencil                    # on Chromium, in the default run
//     node e2e/run.mjs --browser webkit pencil   # on WebKit — CI's `webkit` job
//
// A desktop engine has no pencil and no finger to give, so both are SYNTHESISED
// IN THE PAGE: `PointerEvent`s with `pointerType: 'pen'` (and a pressure, a
// tilt) and `pointerType: 'touch'` (a finger, or a palm — given a wider contact,
// though the surface knows a palm by when it lands, never by its size),
// dispatched at the canvas the way iPadOS delivers them — a pencil as `pen`, a
// finger as `touch`, each with its own pointer id. The surface decides by
// `pointerType`, never by the user agent, so the same events mean the same
// thing here and on the glass. What only the glass can say — the Pencil's
// real hover height, the keyboard, a real palm — is QA-v1.md §A10, by hand.
//
// The on-screen keyboard is told to the page the way iPadOS tells it: the
// layout viewport stays as it was and the VISUAL viewport shrinks. A desktop
// engine has no such keyboard, so `window.visualViewport` is stood in for by
// an init script before the page loads (`keyboardInit`) — the page's own
// listeners hear its resize, and `viewportRect` reads it, exactly as they
// would on the glass. Nothing else in the page is touched.
//
// The records:
//   P1   the pen draws, and every point of its stroke carries its pressure
//   P1b  the switch to the pen is said once, and the hand tile says so
//   P2   a finger pans while a pen is present, and draws nothing
//   P2b  two fingers pinch, and leave nothing in the log
//   P3   a palm that lands while the pen draws is ignored — the stroke is the pen's
//   P3b  a palm just after the pen lifts is ignored; one just before it lands has its pan undone
//   P4   the pen's hover is a hover: the reading of the mark under it, and the magnet ghost
//   P5   the pen holds a mark, the field opens, and a pill the pen taps is taken — a clean
//   P6   the pen taps undo, and the clean form goes
//   P7   the keyboard up: the field stays in the visible viewport, every pill in reach, one taken
//   P8   the hand tile gives a finger its ink back — a palm still draws nothing, a field a
//        finger opened does not take the focus — and four taps come round to the pen
//   P9   the mouse is untouched: it draws, its points carry no pressure, its hover no ghost
//   P10  the board saved, the page reloaded: every stroke back with its pressure, the
//        preference kept, the switch not said again
//   P11  the pen drags a handle of the one selected mark (V1-PLAN E1): one reshape, no
//        stroke and no summon; a finger on a handle, with a pen present, pans and takes none
//   P12  a tap off the open field with a few pixels of wobble closes it and leaves no dot — the
//        pen's, and a finger's that draws (PLAN-USER-SURFACE W3)

import { sleep, waitReady } from './keep.mjs';

/** The iPad's keyboard, as the page hears of it: a visual viewport that shrinks. Runs before the page's own scripts. */
function keyboardInit() {
  const vv = new EventTarget();
  const kb = { height: 0, offsetTop: 0 };
  const props = [['width', () => innerWidth], ['height', () => innerHeight - kb.height], ['offsetLeft', () => 0], ['offsetTop', () => kb.offsetTop],
    ['pageLeft', () => scrollX], ['pageTop', () => scrollY + kb.offsetTop], ['scale', () => 1]];
  for (const [k, get] of props) Object.defineProperty(vv, k, { get, enumerable: true });
  Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => vv });
  /** Raise the keyboard `height` px (0 puts it away), the visual viewport scrolled `offsetTop` px. */
  window.__keyboard = (height, offsetTop) => {
    kb.height = height; kb.offsetTop = offsetTop || 0;
    vv.dispatchEvent(new Event('resize'));
    vv.dispatchEvent(new Event('scroll'));
  };
}

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

/** Two frames and a moment: a layout change is re-placed on the next frame (01-view.js, relayoutChrome). */
async function frames(page) {
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await sleep(60);
}

/** Where the open field stands against the visible viewport — the keyboard's space, not the window's. */
function fieldGeometry() {
  const el = document.getElementById('summon');
  const vv = window.visualViewport;
  const v = { top: vv.offsetTop, bottom: vv.offsetTop + vv.height, left: vv.offsetLeft, right: vv.offsetLeft + vv.width };
  const box = (r) => ({ top: r.top, bottom: r.bottom, left: r.left, right: r.right });
  const inside = (r) => r.top >= v.top - 0.5 && r.bottom <= v.bottom + 0.5 && r.left >= v.left - 0.5 && r.right <= v.right + 0.5;
  const r = el.getBoundingClientRect();
  const input = el.querySelector('input.filter');
  const list = el.querySelector('.list');
  return {
    open: el.classList.contains('field') && el.style.display !== 'none',
    v, field: box(r), inView: inside(r),
    inputInView: !!input && inside(input.getBoundingClientRect()),
    held: !!list && list.classList.contains('held'),
    listH: list ? list.clientHeight : 0, listScroll: list ? list.scrollHeight : 0,
    pills: el.querySelectorAll('.list .pill').length,
  };
}

/** Every pill of the open field's list, scrolled to — the list alone, never the page — and hit where it then stands. */
function pillsInReach() {
  const list = document.querySelector('#summon .list');
  const vv = window.visualViewport;
  const out = [];
  for (const pill of list ? list.querySelectorAll('.pill') : []) {
    const lr = list.getBoundingClientRect();
    let pr = pill.getBoundingClientRect();
    if (pr.top < lr.top) list.scrollTop -= lr.top - pr.top;
    else if (pr.bottom > lr.bottom) list.scrollTop += pr.bottom - lr.bottom;
    pr = pill.getBoundingClientRect();
    const hit = document.elementFromPoint(pr.left + pr.width / 2, pr.top + pr.height / 2);
    out.push({
      text: pill.textContent.trim(),
      inView: pr.top >= vv.offsetTop - 0.5 && pr.bottom <= vv.offsetTop + vv.height + 0.5,
      hit: !!hit && (hit === pill || pill.contains(hit)),
    });
  }
  if (list) list.scrollTop = 0;
  return out;
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
  await guards.context.addInitScript(keyboardInit);
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
    measured.palmMs = await page.evaluate(() => window.__mm.palmMs);

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

    // ---- P5. The pen holds a mark; the field opens; a pill the pen taps is taken ----
    const cleanOf = (id) => page.evaluate((id) => { const mm = window.__mm, n = mm.session.getState().nodes.get(id), c = n && mm.MM.cleanOf(n); return c ? c.shape : null; }, id);
    const holdWithPen = async (x, y) => {
      await page.evaluate(({ x, y }) => window.__hand.penDown(x, y, 0.45), { x, y });
      const opened = await page.waitForFunction(() => !!window.__mm.session.getState().summon, null, { timeout: 3000 }).then(() => true).catch(() => false);
      await page.evaluate(({ x, y }) => window.__hand.penUp(x, y), { x, y });
      return opened;
    };
    // A tap on empty ground lets go of the field: the pen's, a tap never a dot.
    const penTapGround = () => page.evaluate(() => { const h = window.__hand; h.penDown(1040, 150, 0.3); h.penUp(1040, 150); });
    await record('P5', async () => {
      await sleep(40);
      const before = await cleanOf(box.id);
      const e0 = (await page.evaluate(boardNow)).strokes;
      const opened = await holdWithPen(BOX.x + BOX.w / 2, BOX.y);
      const held = await page.evaluate(() => { const s = window.__mm.session.getState(); return s.summon ? s.summon.enclosedIds.slice() : []; });
      const pill = await page.evaluate(() => {
        const b = [...document.querySelectorAll('#summon .pill.item')].find((x) => /Draw them clean/.test(x.textContent));
        if (b) window.__hand.penTap(b);
        return !!b;
      });
      await sleep(60);
      const after = await cleanOf(box.id);
      const e1 = (await page.evaluate(boardNow)).strokes;
      check(`P5. the pen holds the box still and the field opens on it (${held.length} mark${held.length === 1 ? '' : 's'} held, no stroke drawn); the pill it taps, Draw them clean, is taken — the box carries its clean form (${after}), the ink under it`,
        opened && held.includes(box.id) && e1 === e0 && pill && !before && after === 'rectangle', { opened, held, pill, before, after, strokes: [e0, e1] });
    });

    // ---- P6. The pen taps undo ----
    await record('P6', async () => {
      const before = await cleanOf(box.id);
      const b0 = await page.evaluate(boardNow);
      await page.evaluate(() => window.__hand.penTap(document.getElementById('undoBtn')));
      await sleep(60);
      const after = await cleanOf(box.id);
      const b1 = await page.evaluate(boardNow);
      check(`P6. the pen taps undo, and the clean form goes (${before} → ${after}); the ink stays (${b1.content} marks, as before)`,
        before === 'rectangle' && after === null && b1.content === b0.content && b1.strokes === b0.strokes, { before, after, b0, b1 });
    });

    // ---- P7. The keyboard up: the field stays in the visible viewport, every pill in reach ----
    await record('P7', async () => {
      await penTapGround();
      await sleep(40);
      // A row of three boxes, drawn by the pen: held, it offers a reading and five pills — a tall field.
      const row = [{ x: 820, y: 200, w: 70, h: 60 }, { x: 920, y: 204, w: 70, h: 60 }, { x: 1020, y: 198, w: 70, h: 60 }];
      for (const b of row) await page.evaluate(({ pts, ps }) => window.__hand.penStroke(pts, ps), { pts: boxPath(b, 8), ps: pressures(33) });
      await sleep(40);
      const opened = await holdWithPen(955, 204);
      // A finger taps the input: the keyboard's cue. Then the keyboard rises — an 11-inch iPad in
      // landscape with the keyboard and its bar up leaves about 360 of its 820 px.
      const focused = await page.evaluate(() => { const f = document.querySelector('#summon input.filter'); if (!f) return false; f.focus(); return document.activeElement === f; });
      await page.evaluate(() => window.__keyboard(460));
      await frames(page);
      const at360 = await page.evaluate(fieldGeometry);
      // A smaller iPad, or the keyboard's bar taller: 260 px left, less than the field is tall.
      await page.evaluate(() => window.__keyboard(560));
      await frames(page);
      const at260 = await page.evaluate(fieldGeometry);
      const reach = await page.evaluate(pillsInReach);
      // The keyboard goes: the list is let go, the field where it was.
      await page.evaluate(() => window.__keyboard(0));
      await frames(page);
      const away = await page.evaluate(fieldGeometry);
      // It comes back, and a word is typed: two pills, which fit — the list is let go again.
      await page.evaluate(() => window.__keyboard(560));
      await frames(page);
      await page.evaluate(() => { const f = document.querySelector('#summon input.filter'); f.value = 'pump'; f.dispatchEvent(new Event('input', { bubbles: true })); });
      await frames(page);
      const typed = await page.evaluate(fieldGeometry);
      // The pill that labels the person's own ink with the word, taken by the pen.
      const took = await page.evaluate(() => {
        const pill = [...document.querySelectorAll('#summon .list .pill')].find((b) => /^Label it/.test(b.textContent.trim()));
        if (!pill) return null;
        const r = pill.getBoundingClientRect(), vv = window.visualViewport;
        const inView = r.top >= vv.offsetTop - 0.5 && r.bottom <= vv.offsetTop + vv.height + 0.5;
        window.__hand.penTap(pill);
        return { text: pill.textContent.trim(), inView };
      });
      await sleep(80);
      const ids = await page.evaluate(() => { const s = window.__mm.session.getState(); return s.contentIds.slice(-3); });
      const labelled = await page.evaluate((ids) => window.__mm.session.getEvents().some((e) => e.type === 'label' && JSON.stringify(e).includes('pump') && ids.some((id) => JSON.stringify(e).includes('"' + id + '"'))), ids);
      await page.evaluate(() => window.__keyboard(0));
      await frames(page);
      await penTapGround();
      measured.fieldAt260 = { top: Math.round(at260.field.top), bottom: Math.round(at260.field.bottom), pillsPx: at260.listH + ' of ' + at260.listScroll };
      const allReach = reach.length >= 5 && reach.every((p) => p.inView && p.hit);
      const span = (g) => Math.round(g.field.top) + '–' + Math.round(g.field.bottom);
      check(`P7. the keyboard up, the field stays in the visible viewport — with 360 px left ${at360.inView ? 'inside' : 'OUTSIDE'} (${span(at360)}), with 260 ${at260.inView ? 'inside' : 'OUTSIDE'} (${span(at260)}; its ${at260.pills} pills ${at260.held ? 'scrolling in ' + at260.listH + ' of ' + at260.listScroll + ' px' : 'NOT HELD'}), its input in view each time — every pill in reach, scrolled to and hit where it stands (${reach.filter((p) => p.inView && p.hit).length} of ${reach.length}); the keyboard away, the list is ${away.held ? 'STILL HELD' : 'let go'}; back up with a word typed, the two pills fit (${typed.held ? 'STILL HELD' : 'let go'}) and ${took ? took.text : 'no Label it pill'}, taken by the pen, ${labelled ? 'labels the row' : 'labelled nothing'}`,
        opened && focused && at360.inView && at360.inputInView && !at360.held && at260.inView && at260.inputInView && at260.held
          && allReach && away.open && away.inView && !away.held && typed.open && typed.inView && !typed.held && took && took.inView && labelled,
        { opened, focused, at360, at260, reach, away, typed, took, labelled });
    });

    // ---- P8. The hand tile gives a finger its ink back; four taps come round ----
    await record('P8', async () => {
      await penTapGround();
      const face = () => page.evaluate(() => { window.__mm.syncTiles(); return (document.querySelector('#handBtn .v') || {}).textContent || ''; });
      const faces = [];
      await page.evaluate(() => window.__hand.penTap(document.getElementById('ccBtn')));
      await page.evaluate(() => window.__hand.penTap(document.getElementById('handBtn')));
      faces.push(await face());
      await page.evaluate(() => window.__hand.penTap(document.getElementById('ccBtn'))); // the centre closes
      await sleep(PAST_PALM_MS);
      // A finger draws.
      const f0 = await page.evaluate(boardNow);
      await page.evaluate(() => window.__hand.touchDrag(11, { x: 600, y: 660 }, { x: 800, y: 660 }, 16));
      await sleep(60);
      const fline = await page.evaluate(lastStroke);
      const f1 = await page.evaluate(boardNow);
      // A palm while the pen draws still draws nothing: one stroke, the pen's.
      await page.evaluate(() => {
        const h = window.__hand;
        h.penDown(600, 700, 0.4);
        for (let i = 1; i <= 16; i++) { h.penMove(600 + i * 12.5, 700, 0.5); if (i === 4) h.touchDown(24, 820, 760, 64); if (i > 4) h.touchMove(24, 820 + i, 760, 64); }
        h.penUp(800, 700); h.touchUp(24, 840, 760, 64);
      });
      await sleep(60);
      const pline = await page.evaluate(lastStroke);
      const f2 = await page.evaluate(boardNow);
      // A finger holds its line: the field opens, and waits for the finger to tap its input.
      await sleep(PAST_PALM_MS);
      await page.evaluate(() => window.__hand.touchDown(12, 700, 660));
      const opened = await page.waitForFunction(() => !!window.__mm.session.getState().summon, null, { timeout: 3000 }).then(() => true).catch(() => false);
      await page.evaluate(() => window.__hand.touchUp(12, 700, 660));
      await sleep(60);
      const focus = await page.evaluate(() => { const f = document.querySelector('#summon input.filter'); return { input: !!f, focused: !!f && document.activeElement === f, by: window.__mm.hands().downType }; });
      await page.evaluate(() => { const h = window.__hand; h.touchDown(13, 1040, 150); h.touchUp(13, 1040, 150); }); // a finger's tap on the ground lets go
      const closed = await page.evaluate(() => !window.__mm.session.getState().summon);
      // Three more taps come round to the pen.
      await page.evaluate(() => window.__hand.penTap(document.getElementById('ccBtn')));
      for (let i = 0; i < 3; i++) { await page.evaluate(() => window.__hand.penTap(document.getElementById('handBtn'))); faces.push(await face()); }
      await page.evaluate(() => window.__hand.penTap(document.getElementById('ccBtn')));
      const draws = await page.evaluate(() => window.__mm.draws());
      check(`P8. the hand tile, tapped by the pen, says ${faces[0]} and a finger draws (a ${fline && fline.reads}, ${fline && fline.n} points, none with pressure); a palm while the pen draws still draws nothing (${f2.strokes - f1.strokes} stroke added, ${pline && pline.withP} of ${pline && pline.n} points the pen's); a field a finger opened ${focus.focused ? 'TOOK' : 'did not take'} the focus, and a finger's tap let it go; three more taps say ${faces.slice(1).join(', ')}`,
        faces.join(' | ') === 'right · finger | left · finger | left · pen | right · pen' && draws === 'pen'
          && f1.strokes === f0.strokes + 1 && fline && fline.reads === 'line' && fline.withP === 0 && fline.n === 17
          && f2.strokes === f1.strokes + 1 && pline && pline.n === 17 && pline.withP === 17 && pline.x0 === 600 && pline.x1 === 800
          && opened && focus.input && !focus.focused && focus.by === 'touch' && closed,
        { faces, draws, f0, f1, f2, fline: fline && { reads: fline.reads, n: fline.n, withP: fline.withP }, pline: pline && { n: pline.n, withP: pline.withP, x0: pline.x0, x1: pline.x1 }, opened, focus, closed });
    });

    // ---- P9. The mouse is untouched ----
    await record('P9', async () => {
      await sleep(40);
      const b0 = await page.evaluate(boardNow);
      await page.mouse.move(600, 740);
      await page.mouse.down();
      for (let i = 1; i <= 20; i++) await page.mouse.move(600 + i * 10, 740);
      await page.mouse.up();
      await sleep(60);
      const line = await page.evaluate(lastStroke);
      const b1 = await page.evaluate(boardNow);
      const corner = await page.evaluate((id) => {
        const mm = window.__mm, s = mm.session.getState(), n = s.nodes.get(id);
        const tr = mm.MM.magnetSites(n, s.nodes).filter((x) => x.kind === 'corner').sort((a, b) => (b.point.x - b.point.y) - (a.point.x - a.point.y))[0];
        return mm.worldToScreen(tr.point.x, tr.point.y);
      }, box.id);
      await page.mouse.move(corner.x + 2, corner.y + 2);
      await sleep(60);
      const over = await page.evaluate(() => ({ reading: window.__mm.readingDrawn(), hook: window.__mm.penHover(), type: window.__mm.hands().downType }));
      const ghost = await page.evaluate(liveInkNear, { pt: corner, r: 5 });
      await page.mouse.move(1040, 150);
      check(`P9. the mouse is untouched: it draws a ${line && line.reads} (${line && line.n} points, ${line && line.withP} with pressure), and its hover over the box's corner shows the reading ("${over.reading && over.reading.text}") and, as it never did, no magnet ghost (${ghost ? 'drawn' : 'none'})`,
        b1.strokes === b0.strokes + 1 && line && line.reads === 'line' && line.n === 21 && line.withP === 0
          && over.reading && over.reading.id === box.id && over.hook === null && !ghost,
        { line: line && { reads: line.reads, n: line.n, withP: line.withP }, over, ghost });
    });

    // ---- P10. Saved, reloaded ----
    await record('P10', async () => {
      await page.evaluate(() => window.__mm.boardIdle());
      const saved = await page.evaluate(() => {
        const ev = window.__mm.session.getEvents();
        return { n: ev.length, strokes: ev.filter((e) => e.type === 'stroke').map((e) => ({ n: e.points.length, p: e.points.map((q) => (typeof q.p === 'number' ? q.p : null)) })) };
      });
      await page.reload({ waitUntil: 'load' });
      await waitReady(page);
      await page.evaluate(installHand);
      await sleep(100);
      const back = await page.evaluate(() => {
        const ev = window.__mm.session.getEvents();
        return { n: ev.length, strokes: ev.filter((e) => e.type === 'stroke').map((e) => ({ n: e.points.length, p: e.points.map((q) => (typeof q.p === 'number' ? q.p : null)) })) };
      });
      // A pencil comes near again: nothing is said about it this time.
      await page.evaluate(() => window.__hand.penHover(1040, 150));
      await sleep(40);
      const said = await page.evaluate(() => (document.getElementById('status').textContent || '').trim());
      const face = await page.evaluate(() => { window.__mm.syncTiles(); return (document.querySelector('#handBtn .v') || {}).textContent || ''; });
      const pens = back.strokes.filter((s) => s.p.every((p) => p !== null)).length;
      check(`P10. saved and reloaded: all ${back.n} events back (${saved.n} saved), every stroke with the pressure it was drawn with (${pens} pen strokes); the hand tile still says ${face}, and a pencil near the glass again is not announced twice`,
        back.n === saved.n && JSON.stringify(back.strokes) === JSON.stringify(saved.strokes) && pens >= 5 && face === 'right · pen' && !/it draws now/.test(said),
        { saved: saved.n, back: back.n, pens, face, said });
    });

    // ---- P11. The pen drags a handle; a finger never does ----
    await record('P11', async () => {
      await page.evaluate(() => { window.__mm.session.load([]); window.__mm.setView(1, 0, 0); });
      await sleep(PAST_PALM_MS);
      const HB = { x: 500, y: 260, w: 240, h: 160 };
      const pts = boxPath(HB, 8);
      await page.evaluate(({ pts, ps }) => window.__hand.penStroke(pts, ps), { pts, ps: pressures(pts.length) });
      await sleep(60);
      // Held alone: its own points are drawn on the selection.
      const held = await page.evaluate(() => {
        const mm = window.__mm, s = mm.session.getState();
        const id = s.contentIds[s.contentIds.length - 1];
        mm.session.select([id], Date.now());
        const n = mm.session.getState().nodes.get(id);
        const hs = mm.MM.handlesOf(n, mm.session.getState().nodes);
        const at = (k, i) => { const h = hs.find((x) => x.kind === k && x.index === i); return h ? mm.worldToScreen(h.point.x, h.point.y) : null; };
        return { id, corner2: at('corner', 2), corner0: at('corner', 0), drawn: mm.handlesDrawn().length, ink: JSON.stringify(mm.MM.strokePointsOf(n)) };
      });
      await sleep(PAST_PALM_MS);
      const before = await page.evaluate(boardNow);
      await page.evaluate(({ from }) => {
        const h = window.__hand;
        h.penDown(from.x, from.y, 0.5);
        for (let i = 1; i <= 8; i++) h.penMove(from.x + (50 * i) / 8, from.y + (40 * i) / 8, 0.5);
        h.penUp(from.x + 50, from.y + 40);
      }, { from: held.corner2 });
      await sleep(80);
      const after = await page.evaluate(boardNow);
      const pen = await page.evaluate(({ id, n }) => {
        const mm = window.__mm, node = mm.session.getState().nodes.get(id);
        const clean = mm.MM.cleanPointsOf(node);
        return { events: mm.session.getEvents().slice(n).map((e) => e.type), corner2: clean ? mm.worldToScreen(clean[2].x, clean[2].y) : null, ink: JSON.stringify(mm.MM.strokePointsOf(node)), selection: mm.session.getState().selection.length };
      }, { id: held.id, n: before.events });
      const landed = !!pen.corner2 && Math.hypot(pen.corner2.x - (held.corner2.x + 50), pen.corner2.y - (held.corner2.y + 40)) < 0.5;
      // A finger, with the pen present and past the palm's window, laid on the box's other corner: it pans.
      await sleep(PAST_PALM_MS);
      const f0 = await page.evaluate(boardNow);
      await page.evaluate(({ from }) => window.__hand.touchDrag(11, from, { x: from.x - 60, y: from.y - 30 }, 10), { from: held.corner0 });
      await sleep(80);
      const f1 = await page.evaluate(boardNow);
      const dx = +(f1.view.panX - f0.view.panX).toFixed(2), dy = +(f1.view.panY - f0.view.panY).toFixed(2);
      check(`P11. the pen takes a handle: the box held alone shows its ${held.drawn} points, and the pen dragging its corner writes ${pen.events.join(', ') || 'nothing'} — the clean corner where the pen let go, the ink as drawn, no stroke, no summon; a finger laid on the other corner pans the view ${dx}, ${dy} and writes ${f1.events - f0.events} events`,
        held.drawn === 9 && JSON.stringify(pen.events) === '["reshape"]' && landed && pen.ink === held.ink && after.strokes === before.strokes && !after.summon && pen.selection === 1
          && dx === -60 && dy === -30 && f1.events === f0.events,
        { held: { drawn: held.drawn }, pen, before: before.events, after: after.events, finger: { dx, dy, events: f1.events - f0.events } });
      await page.evaluate(() => window.__mm.setView(1, 0, 0));
    });

    // ---- P12. A tap off the field never leaves a dot: the pen's, and a finger's that draws (W3) ----
    await record('P12', async () => {
      await page.evaluate(() => { window.__mm.session.load([]); window.__mm.setView(1, 0, 0); });
      await sleep(PAST_PALM_MS);
      const pts = boxPath({ x: 500, y: 260, w: 200, h: 130 }, 8);
      await page.evaluate(({ pts, ps }) => window.__hand.penStroke(pts, ps), { pts, ps: pressures(pts.length) });
      await sleep(40);
      const open = () => page.evaluate(() => { const mm = window.__mm, s = mm.session.getState(); mm.session.summonMarks(s.contentIds.slice(), Date.now()); return !!mm.session.getState().summon; });
      const now = () => page.evaluate(() => { const mm = window.__mm, s = mm.session.getState(); return { summon: !!s.summon, strokes: mm.session.getEvents().filter((e) => e.type === 'stroke').length }; });
      const tries = [];
      for (const who of ['pen', 'finger']) {
        if (who === 'finger') await page.evaluate(() => window.__mm.setDraws('finger'));
        for (const px of [3, 6]) {
          await sleep(PAST_PALM_MS);
          const opened = await open();
          const b = await now();
          // Each try clicks off at a place of its own, so one that failed leaves nothing in the next one's way.
          await page.evaluate(({ who, px, k }) => {
            const h = window.__hand, x = 880 + 60 * k, y = 600;
            if (who === 'pen') { h.penDown(x, y, 0.3); for (let i = 1; i <= 3; i++) h.penMove(x + (px * i) / 3, y + (px * i) / 6, 0.3); h.penUp(x + px, y + px / 2); }
            else { h.touchDown(11, x, y); for (let i = 1; i <= 3; i++) h.touchMove(11, x + (px * i) / 3, y + (px * i) / 6); h.touchUp(11, x + px, y + px / 2); }
          }, { who, px, k: tries.length });
          await sleep(60);
          const a = await now();
          tries.push({ who, px, opened, closed: !a.summon, strokes: a.strokes - b.strokes });
        }
      }
      await page.evaluate(() => window.__mm.setDraws('pen'));
      check(`P12. a tap off the open field only closes it: the pen and a finger that draws, each with 3 and 6 px of wobble — ${tries.map((x) => x.who + ' ' + x.px + ' px ' + (x.closed ? 'closed' : 'LEFT OPEN') + (x.strokes ? ', a dot' : '')).join('; ')}`,
        tries.length === 4 && tries.every((x) => x.opened && x.closed && x.strokes === 0), { tries });
    });
  } catch (err) {
    check(`the scenario itself fell over: ${String(err && err.message ? err.message : err).split('\n')[0]}`, false, { stack: String(err && err.stack) });
    await screenshot(page, 'pencil');
  }
  if (steps.some((s) => !s.ok)) await screenshot(page, 'pencil');
  return { steps, guards: [guards], measured };
}

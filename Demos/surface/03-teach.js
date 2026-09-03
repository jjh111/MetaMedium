// ===== teach =====
// Provides: teaching the command mark: the pad, samples, the held mark on this device, the rail chip; togglePanel/closePanel.
// Uses: core, view (render).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () Ellipsis)();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Teaching the command mark ========================================
  // Five samples become a signature, through the same fingerprint machinery
  // that learns any shape you name. Taught in a dedicated pad rather than on
  // the canvas, so the canvas itself never enters a mode (MVP.md §5.2).
  const teachPanel = document.getElementById('teachPanel');
  const teachBtn = document.getElementById('teachBtn');
  const pad = document.getElementById('teachPad');
  const padCtx = pad.getContext('2d');
  const teachStatus = document.getElementById('teachStatus');
  const teachUse = document.getElementById('teachUse');
  const teachDots = [...document.querySelectorAll('#teachDots i')];
  let samples = [];
  let padStroke = null;
  // True while the pad shows the five a HELD mark learned from. Drawing on a
  // full pad then starts a fresh set rather than being ignored: a pad that
  // swallows strokes until you find Clear is a mode with extra steps.
  let samplesHeld = false;

  function sizePad() {
    const dpr = window.devicePixelRatio || 1;
    const r = pad.getBoundingClientRect();
    if (!r.width) return;
    pad.width = r.width * dpr; pad.height = r.height * dpr;
    padCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPad();
  }

  function drawPad() {
    const r = pad.getBoundingClientRect();
    padCtx.clearRect(0, 0, r.width || pad.width, r.height || pad.height);
    padCtx.lineCap = 'round'; padCtx.lineJoin = 'round';
    // Earlier samples ghost behind, so you can see whether your hand is steady.
    samples.forEach((pts, i) => {
      padCtx.beginPath();
      pts.forEach((p, k) => (k ? padCtx.lineTo(p.x, p.y) : padCtx.moveTo(p.x, p.y)));
      padCtx.strokeStyle = 'rgba(201,168,76,' + (0.16 + 0.1 * i) + ')';
      padCtx.lineWidth = 2; padCtx.stroke();
    });
    if (padStroke) {
      padCtx.beginPath();
      padStroke.forEach((p, k) => (k ? padCtx.lineTo(p.x, p.y) : padCtx.moveTo(p.x, p.y)));
      padCtx.strokeStyle = C.ink; padCtx.lineWidth = 2; padCtx.stroke();
    }
    teachDots.forEach((d, i) => d.classList.toggle('on', i < samples.length));
  }

  pad.addEventListener('pointerdown', (e) => {
    capture(pad, e);
    if (samplesHeld || samples.length >= MM.COMMAND_MARK_SAMPLES) {
      samples = []; samplesHeld = false; teachUse.disabled = true;
      teachStatus.className = ''; teachStatus.textContent = '';
    }
    const r = pad.getBoundingClientRect();
    padStroke = [{ x: e.clientX - r.left, y: e.clientY - r.top }];
  });
  pad.addEventListener('pointermove', (e) => {
    if (!padStroke) return;
    const r = pad.getBoundingClientRect();
    padStroke.push({ x: e.clientX - r.left, y: e.clientY - r.top });
    drawPad();
  });
  function endPadStroke() {
    const pts = padStroke; padStroke = null;
    if (!pts) return;
    if (pts.length < 8) { drawPad(); return; }
    if (samples.length < MM.COMMAND_MARK_SAMPLES) samples.push(pts);
    drawPad();
    evaluateSamples();
  }
  pad.addEventListener('pointerup', endPadStroke);
  pad.addEventListener('pointercancel', endPadStroke);
  // A release that lands anywhere else — capture not taken, the pen lifted
  // off the pad — still ends the stroke. Otherwise the pad keeps drawing
  // wherever the pointer goes next, which is the "held pointer" that broke
  // the first use of the pad.
  addEventListener('pointerup', () => { if (padStroke) endPadStroke(); }, true);
  addEventListener('pointercancel', () => { if (padStroke) endPadStroke(); }, true);

  function evaluateSamples() {
    const need = MM.COMMAND_MARK_SAMPLES - samples.length;
    if (need > 0) {
      teachUse.disabled = true;
      teachStatus.className = '';
      teachStatus.textContent = need + ' more to go.';
      return;
    }
    let mark;
    try { mark = MM.learnCommandMark(samples, 'your mark'); }
    catch (err) { teachStatus.textContent = String(err.message || err); return; }

    // Rejection matters more than recognition: a mark that also fires while you
    // draw reads as broken, not eager. So the signature is tested against the
    // vocabulary the canvas already knows before it is offered.
    const drawn = state.contentIds
      .map((id) => MM.fingerprintOf(state.nodes.get(id)))
      .filter(Boolean);
    const collides = MM.collidesWith(mark, drawn);

    teachUse.disabled = false;
    if (collides) {
      teachStatus.className = 'warn';
      teachStatus.textContent =
        'Careful — this mark also matches something already on the canvas. It would fire while you draw.';
    } else if (mark.consistency < 0.35) {
      teachStatus.className = 'warn';
      teachStatus.textContent =
        'Those five were quite different from each other, so the band is wide and it may over-trigger. Clear and try again for a tighter mark.';
    } else {
      teachStatus.className = '';
      teachStatus.textContent =
        'Consistent (' + Math.round(mark.consistency * 100) + '%). Cross a circled group with this to summon.';
    }
    teachUse.dataset.ready = '1';
  }

  let taughtGlyph = null; // the sample we show in the rail once a mark is taught

  // The taught mark is HELD: on this device, across reloads. Teaching is a
  // session event (it replays with the log), and the device remembers it too,
  // so opening the canvas tomorrow finds your mark waiting rather than the
  // check. The five samples are kept with it, so the pad can show you what
  // it learned when you come back to it.
  const MARK_KEY = 'mm-command-mark';
  const teachHint = document.getElementById('teachHint');
  const teachForget = document.getElementById('teachForget');
  function savedMark() {
    try { return JSON.parse(localStorage.getItem(MARK_KEY) || 'null'); } catch (err) { return null; }
  }
  function rememberMark(mark, pts) {
    try { localStorage.setItem(MARK_KEY, JSON.stringify({ mark: mark, samples: pts, at: Date.now() })); } catch (err) { /* private mode */ }
  }
  function forgetMark() {
    try { localStorage.removeItem(MARK_KEY); } catch (err) { /* nothing to forget */ }
    session.teachCommandMark(null, Date.now());
    samples = []; samplesHeld = false; taughtGlyph = null;
    teachUse.disabled = true;
    drawPad();
    showPadState();
    render(session.getState());
  }
  function restoreMark() {
    const saved = savedMark();
    if (!saved || !saved.mark) return false;
    // The glyph before the event: teaching re-renders at once, and the rail
    // chip is drawn in that render — from whatever glyph is held at the time.
    samples = Array.isArray(saved.samples) ? saved.samples : [];
    samplesHeld = samples.length > 0;
    taughtGlyph = samples.length ? samples[samples.length - 1] : null;
    session.teachCommandMark(saved.mark, Date.now());
    return true;
  }

  // What the pane says depends on whether a mark is already held.
  function showPadState() {
    const held = !!session.getState().commandMark;
    teachForget.hidden = !held;
    if (held) {
      teachHint.innerHTML = 'This is <b>your mark</b> — the canvas watches for it instead of the check. ' +
        'To replace it, <b>Clear</b> and draw a new one five times. <b>Forget</b> goes back to ✓.';
      teachStatus.className = '';
      teachStatus.textContent = samples.length
        ? 'Held on this device. These are the five it learned from — draw here to start a new one.'
        : 'Held on this device.';
    } else {
      teachHint.innerHTML = 'The canvas watches for a <b>check ✓</b> until you replace it. Draw your own mark ' +
        '<b>five times</b>: it learns your hand\'s spread, so the sixth one it has never seen still counts. ' +
        'It will refuse a mark that looks like something you draw.';
      evaluateSamples();
    }
  }

  teachUse.onclick = () => {
    if (samples.length < MM.COMMAND_MARK_SAMPLES) return;
    const mark = MM.learnCommandMark(samples, 'your mark');
    taughtGlyph = samples[samples.length - 1];
    samplesHeld = true;
    session.teachCommandMark(mark, Date.now());
    rememberMark(mark, samples);
    showPadState();
    teachStatus.textContent = 'Learned, and held on this device. The check ✓ no longer summons — your mark does.';
    render(session.getState());
  };
  document.getElementById('teachClear').onclick = () => {
    samples = []; samplesHeld = false; teachUse.disabled = true; teachStatus.textContent = ''; drawPad();
    if (session.getState().commandMark) {
      teachStatus.textContent = 'Draw the new mark five times. Your held mark stays until you use the new one.';
    }
  };
  teachForget.onclick = forgetMark;
  document.getElementById('teachClose').onclick = () => closePanel(teachPanel, teachBtn);
  teachBtn.onclick = () => {
    togglePanel(teachPanel, teachBtn);
    if (!teachPanel.hasAttribute('hidden')) { sizePad(); showPadState(); }
  };
  document.getElementById('markChip').onclick = () => teachBtn.click();

  // The ACTIVE mark, echoed in the rail. Shown from the start, not only once you
  // have taught one — a gesture you cannot see is a gesture you have to be told
  // about, and the built-in check deserves the same visibility as yours.
  //
  // Driven from session state rather than from the teach button, so undoing the
  // teach event puts the check back in the rail. A chip that disagrees with the
  // grammar is worse than no chip.
  let shownMark = undefined, shownGlyph = undefined;
  function syncMarkChip(s) {
    const name = s.commandMark ? s.commandMark.name : 'check';
    const glyph = s.commandMark && taughtGlyph ? taughtGlyph : MM.canonicalCheckSamples()[0];
    if (shownMark === name && shownGlyph === glyph) return;
    shownMark = name; shownGlyph = glyph;
    drawMarkChip(glyph, name);
  }

  function drawMarkChip(pts, name) {
    const chip = document.getElementById('markChip');
    const g = document.getElementById('markGlyph');
    const gc = g.getContext('2d');
    const b = MM.getBounds(pts);
    const w = Math.max(1, b.maxX - b.minX), h = Math.max(1, b.maxY - b.minY);
    const k = Math.min((g.width - 6) / w, (g.height - 6) / h);
    gc.clearRect(0, 0, g.width, g.height);
    gc.beginPath();
    pts.forEach((p, i) => {
      const x = (p.x - b.minX) * k + 3, y = (p.y - b.minY) * k + 3;
      i ? gc.lineTo(x, y) : gc.moveTo(x, y);
    });
    gc.strokeStyle = C.gold; gc.lineWidth = 1.6; gc.lineCap = 'round'; gc.stroke();
    document.getElementById('markName').textContent = name || 'your mark';
    chip.hidden = false;
  }

  function togglePanel(el, btn) {
    const open = el.hasAttribute('hidden');
    if (open) el.removeAttribute('hidden'); else el.setAttribute('hidden', '');
    btn.setAttribute('aria-pressed', String(open));
  }
  function closePanel(el, btn) {
    el.setAttribute('hidden', ''); btn.setAttribute('aria-pressed', 'false');
  }

// ===== replay =====
// Provides: replay: a recorded session stepped through (rpGoTo, rpStart, startReplay).
// Uses: core, view, render, input.
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Replay: a recorded session as a figure =============================
  //
  // State is a pure function of the log, so a session recorded once — every
  // model reply captured as the event it was — replays here with no model
  // attached, at any step, inspectable. Load a prefix to stand at a step;
  // draw afterwards and the recording continues with your marks.
  const rp = { rec: null, step: -1, timer: null };
  const rpEl = document.getElementById('replay');
  const rpCaption = document.getElementById('rpCaption'), rpStep = document.getElementById('rpStep');
  const rpScrub = document.getElementById('rpScrub'), rpPlay = document.getElementById('rpPlay');

  function rpGoTo(i) {
    if (!rp.rec) return;
    const steps = rp.rec.steps;
    i = Math.max(0, Math.min(steps.length - 1, i));
    rp.step = i;
    session.load(rp.rec.events.slice(0, steps[i].after));
    rpScrub.value = String(i);
    rpStep.textContent = (i + 1) + ' / ' + steps.length;
    rpCaption.innerHTML = '<b>' + (i + 1) + '.</b> ' + esc(steps[i].caption);
    if (i === steps.length - 1) rpStop();
  }
  function rpStop() { if (rp.timer) { clearInterval(rp.timer); rp.timer = null; } rpPlay.textContent = '▶'; }
  function rpStart() {
    if (!rp.rec) return;
    if (rp.step >= rp.rec.steps.length - 1) rpGoTo(0);
    rpStop();
    rp.timer = setInterval(() => rpGoTo(rp.step + 1), Number(params.get('every') || 3200));
    rpPlay.textContent = '❚❚';
  }
  async function startReplay(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      rp.rec = await res.json();
    } catch (err) {
      flash('could not load the recording (' + err.message + ')');
      return;
    }
    rpScrub.max = String(rp.rec.steps.length - 1);
    rpEl.hidden = false;
    // Fit the whole recording once, so stepping never moves the view.
    session.load(rp.rec.events);
    fitAll();
    rpGoTo(0);
    if (params.has('autoplay')) rpStart();
  }
  rpScrub.oninput = () => { rpStop(); rpGoTo(Number(rpScrub.value)); };
  document.getElementById('rpPrev').onclick = () => { rpStop(); rpGoTo(rp.step - 1); };
  document.getElementById('rpNext').onclick = () => { rpStop(); rpGoTo(rp.step + 1); };
  rpPlay.onclick = () => (rp.timer ? rpStop() : rpStart());
  addEventListener('keydown', (e) => {
    if (!rp.rec || e.target !== document.body) return;
    if (e.key === 'ArrowRight') { rpStop(); rpGoTo(rp.step + 1); }
    else if (e.key === 'ArrowLeft') { rpStop(); rpGoTo(rp.step - 1); }
    else if (e.key === ' ') { e.preventDefault(); rpPlay.onclick(); }
  });
  // A stroke of the reader's own continues the recording from where it stands.
  canvas.addEventListener('pointerdown', () => { if (rp.rec && rp.timer) { rpStop(); rpCaption.innerHTML = '<b>' + (rp.step + 1) + '.</b> ' + esc(rp.rec.steps[rp.step].caption) + ' <span style="color:var(--dim)">— continuing from here with your marks</span>'; } });

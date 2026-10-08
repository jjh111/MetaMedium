// ===== maths =====
// Provides: the maths on the board (DIRECTOR-PLAN-W2 M5; V1-PLAN A4) — mathsFor (the board's maths and what is
//   said of it, kept while the log stands), renderMaths (the chips beside a figure and a page, called by render),
//   mathsPanel (the panel's words and what stands behind details), mathsShow / mathsWrite / mathsPrint (the acts
//   only the surface does: leave the sizes showing, stand a sum on the board as text, print at true size), the
//   export pane's row (true-size.svg, print.html), and window.__mmMaths, the handle the e2e drives.
// Uses: core (MM.boardMathsOf, mathsChips, mathsSaid, evaluateTyped, trueSize, printTiled), render (logKey,
//   chipRect, roundRect, boxMeets, recordOp, paintReference, paintOps, nowMs, hoverId), text (typeText),
//   images (downloadText, exportPanel), input (say, flash), view (wpx).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== What the board's numbers say ========================================
  // Core derives the numbers (`maths/`) and decides what is said and where
  // (`maths/board.ts`, in Node-tested data); this only draws it. The rules it
  // keeps are the plan's, and each is a place:
  //   - beside the figure, never on a card: a chip on each derived side, on a
  //     label that cannot hold, on each step's check;
  //   - for a moment after a change, while the hand points at the marks, and
  //     while the hand asked to see them (*Show the sizes*) — the ghost rule
  //     (v10 F4): a derived side does not stay forever. A chip that is a
  //     PROBLEM — a label that cannot hold, a written result that is off —
  //     stands, because it is worth a look at rest;
  //   - always in the panel, in units, with every value's formula behind details.
  // Everything is derived from the log: nothing here writes, and an undo takes
  // the chips back with the marks.
  const MATHS_MS = 6000;      // how long a changed chip shows: GHOST_MS's sibling
  const MATHS_PIN_MS = 60000; // how long *Show the sizes* keeps them, unless what they say changes
  let mathsGen = -1;          // the board generation the chips below were read under
  let mathsRead = { key: null, board: null, chips: [], sig: '' };
  const mathsSeen = new Map();      // chip key → its text as the log before this one said it
  const mathsChangedAt = new Map(); // chip key → when its text last changed
  let mathsPin = null;        // { ids, until, sig } — the marks whose chips *Show the sizes* left showing
  let mathsTimer = null;
  let mathsDrawn = [];        // this paint's chips, for tests: { key, kind, text, x, y, w, standing, ids }
  let mathsTrue = { board: null, doc: null };

  /** What the chips say, as one string: a change in it is a change in what is said. */
  const mathsSigOf = (chips) => chips.map((c) => c.key + '|' + c.text).join('\n');

  /**
   * The board's maths and the chips it says, for this log. Kept while the log
   * stands — the key every paint keeps what it derives by (`logKey`) — and what
   * changed since the log before is noted with the time, so a chip whose text
   * is new shows for a moment. The whole-board read (`paintReference`) keeps
   * nothing: it reads the board again, and must say what the kept one says.
   */
  function mathsFor(s) {
    if (paintReference) {
      const board = MM.boardMaths(s);
      const chips = board ? MM.mathsChips(board) : [];
      return { key: null, board: board, chips: chips, sig: mathsSigOf(chips) };
    }
    const key = logKey();
    if (mathsRead.key === key) return mathsRead;
    const board = MM.boardMathsOf(session);
    const chips = board ? MM.mathsChips(board) : [];
    const now = nowMs();
    let fresh = false;
    if (s.generation !== mathsGen) {
      // A board opened or replaced: nothing on it is new.
      mathsGen = s.generation;
      mathsChangedAt.clear();
      mathsPin = null;
    } else {
      for (const c of chips) if (mathsSeen.get(c.key) !== c.text) { mathsChangedAt.set(c.key, now); fresh = true; }
    }
    mathsSeen.clear();
    for (const c of chips) mathsSeen.set(c.key, c.text);
    mathsRead = { key: key, board: board, chips: chips, sig: mathsSigOf(chips) };
    // The moment ends by itself: paint again when it is over, or the chip would stay until the next stroke.
    if (fresh) { clearTimeout(mathsTimer); mathsTimer = setTimeout(() => render(session.getState()), MATHS_MS + 50); }
    return mathsRead;
  }

  /** Whether a chip shows now: a problem always; else for a moment after it changed, while the hand is on its marks, or while it was asked for. */
  function mathsShown(c, held, sig) {
    if (c.standing) return true;
    const at = mathsChangedAt.get(c.key);
    if (at !== undefined && nowMs() - at < MATHS_MS) return true;
    if (mathsPin && mathsPin.sig === sig && nowMs() < mathsPin.until && c.ids.some((id) => mathsPin.ids.has(id))) return true;
    return c.ids.some((id) => held.has(id));
  }

  /** A chip in the canvas, in the chrome's own size: quiet for an answer, gold for a problem. */
  function mathsPill(str, left, base, problem) {
    ctx.font = wpx(10.5).toFixed(2) + 'px ui-monospace, SFMono-Regular, Menlo, monospace';
    const w = ctx.measureText(str).width + wpx(14), h = wpx(17);
    roundRect(left, base - h, w, h, h / 2);
    ctx.fillStyle = `rgba(${C.panelRGB},0.92)`;
    ctx.fill();
    ctx.strokeStyle = problem ? C.gold : `rgba(${C.labelRGB},0.55)`;
    ctx.lineWidth = wpx(problem ? 1.6 : 1);
    ctx.stroke();
    ctx.fillStyle = problem ? C.gold : `rgba(${C.labelRGB},0.95)`;
    ctx.fillText(str, left + wpx(7), base - wpx(5));
  }

  /**
   * Where a step's line stands in its text, when the text FLOWS (a page of more than a few lines is set as
   * prose at a size the screen holds, its lines wherever the frame's own layout put them — not evenly down
   * the frame, which is all core knows): the middle of the line and the right end of its words, from the
   * frame's own document, in world units. Null when the text is fitted to its frame (its lines are evenly
   * spaced, as core says), or when the frame has not loaded yet — `pending` says so, and a paint follows.
   */
  function mathsLineBox(s, c, pending) {
    if (c.kind !== 'step' || c.ids.length !== 1) return null;
    const node = s.nodes.get(c.ids[0]);
    const rep = node && codeRepOf(node);
    if (!rep || rep.data.kind !== 'text' || rep.data.from === 'writing' || linesOf(rep.data.code) <= TEXT_FITS_LINES) return null;
    const b = MM.boundsOf(node), fr = MM.frameOf(node), f = frames.get(c.ids[0]);
    let pre = null;
    try { pre = f && f.iframe && f.iframe.contentDocument ? f.iframe.contentDocument.querySelector('pre.src') : null; } catch (err) { pre = null; }
    if (!b || !fr || !pre) { pending.now = true; return null; }
    // The row core put the chip beside: it divided the frame evenly among the text's rows.
    const rows = String(rep.data.code).replace(/\r\n/g, '\n').split('\n');
    const row = Math.min(rows.length - 1, Math.max(0, Math.floor((c.at.y - b.minY) / ((b.maxY - b.minY) / rows.length))));
    if (!rows[row].length) return null;
    let start = 0;
    for (let i = 0; i < row; i++) start += rows[i].length + 1;
    const end = start + rows[row].length;
    // The text nodes of the page, in order: the source is exactly what they say.
    const walk = pre.ownerDocument.createTreeWalker(pre, NodeFilter.SHOW_TEXT);
    const range = pre.ownerDocument.createRange();
    let acc = 0, from = false, to = false;
    for (let n = walk.nextNode(); n && !to; n = walk.nextNode()) {
      const len = n.nodeValue.length;
      if (!from && start < acc + len) { range.setStart(n, start - acc); from = true; }
      if (from && end <= acc + len) { range.setEnd(n, end - acc); to = true; }
      acc += len;
    }
    if (!from || !to) return null;
    const rects = [...range.getClientRects()].filter((r) => r.width > 0);
    if (!rects.length) return null;
    const first = rects[0];
    const right = Math.max(...rects.filter((r) => Math.abs(r.top - first.top) < 2).map((r) => r.right));
    return { x: fr.x + right + c.at.x - b.maxX, y: fr.y + (first.top + first.bottom) / 2 };
  }

  let mathsRetries = 0;
  /** The chips beside the figures and the page: those that show now, and reach the screen. */
  function renderMaths(s, ix, vb) {
    mathsDrawn = [];
    const m = mathsFor(s);
    syncMathsRow(m.board);
    if (!m.chips.length) return;
    const pending = { now: false };
    const held = new Set(s.selection);
    if (s.summon) for (const id of s.summon.enclosedIds) held.add(id);
    if (hoverId) held.add(hoverId);
    for (const c of m.chips) {
      if (!mathsShown(c, held, m.sig)) continue;
      // An answer chip gives way to the fill-in that says the same thing (M16, 25-ghosts.js): the ghost stands in
      // its place, in its quantity's colour, and a tap on it writes it — what is recorded here is what stands
      // beside the figure, whichever it is drawn as. On a board that waits an answer is never a pill.
      const gh = fgCovers(s, c);
      if (gh) {
        if (gh.drawn) {
          mathsDrawn.push({ key: c.key, kind: c.kind, text: gh.drawn.text, x: gh.drawn.cx, y: gh.drawn.cy, w: gh.drawn.w, standing: c.standing, ids: c.ids.slice(), as: 'ghost' });
          continue;
        }
        if (s.settings.answers === 'wait') continue;
      }
      // Where it stands is measured in the chrome's size; it is drawn when it reaches the screen.
      const size = chipRect(c.text, 0, 0);
      // Beside a side, just clear of it: off the point on the figure by as much as the chip reaches that way, and a little more.
      const reach = c.from && c.away ? Math.abs(c.away.x) * size.w / 2 + Math.abs(c.away.y) * size.h / 2 + wpx(9) : 0;
      const p = c.from && c.away ? { x: c.from.x + c.away.x * reach, y: c.from.y + c.away.y * reach } : mathsLineBox(s, c, pending) || c.at;
      const left = c.align === 'left' ? p.x : p.x - size.w / 2;
      const base = p.y + size.h / 2;
      const box = { minX: left, minY: base - size.h, maxX: left + size.w, maxY: base };
      if (vb && !boxMeets(box, vb)) continue;
      mathsPill(c.text, left, base, c.standing);
      mathsDrawn.push({ key: c.key, kind: c.kind, text: c.text, x: p.x, y: p.y, w: size.w, standing: c.standing, ids: c.ids.slice() });
      if (paintOps) recordOp({ kind: 'maths', id: c.key, text: c.text, box: boxOfRect(box.minX, box.minY, size.w, size.h), moved: false });
    }
    // A page whose frame has not loaded is measured when it has: a paint again, a few times, and no more.
    if (pending.now && mathsRetries < 12) { mathsRetries++; setTimeout(() => render(session.getState()), 150); } else if (!pending.now) mathsRetries = 0;
  }

  // ===== The panel: the answer in plain lines, every value's formula behind details =====
  /** What the panel says of some marks — the figure they belong to, the page a text is a line of — or null. */
  function mathsPanel(s, ids) {
    const m = mathsFor(s);
    const said = m.board ? MM.mathsSaid(m.board, ids) : null;
    if (!said) return null;
    // A board set so lets its answers wait (M18): the panel does not say them either — the lines are the answer — until the board shows its answers.
    if (s.settings.answers === 'wait' && fgHasAnswers(s, ids)) {
      return { top: '<div class="row"><span class="k">maths</span><span class="v">the answers wait — tap a ghost to see one, or show the answers</span></div>', details: '' };
    }
    let top = '';
    said.lines.forEach((l, i) => { top += '<div class="row"><span class="k">' + (i ? '' : 'maths') + '</span><span class="v">' + esc(l) + '</span></div>'; });
    let details = '';
    if (said.rows.length) {
      details += '<div class="sep"></div><div class="eyebrow">worked out</div>';
      said.rows.forEach((r) => {
        details += '<div class="row"><span class="k">' + esc(r.k) + '</span><span class="v">' + esc(r.v) + '</span></div>';
        if (r.why) details += '<div class="why">' + esc(r.why) + '</div>';
      });
    }
    return { top: top, details: details };
  }

  // ===== The acts only the surface does =====================================
  /** *Show the sizes*, *Check the steps*: say the answer, and leave the chips of those marks showing until what they say changes. */
  function mathsShow(d) {
    const m = mathsFor(session.getState());
    mathsPin = { ids: new Set(d.ids || []), until: nowMs() + MATHS_PIN_MS, sig: m.sig };
    say(d.say || 'the sizes are beside the figure');
  }

  /** `= 24 ÷ 3` and Enter: the words, result and all, stand on the board as text beside the marks held — one act, one undo. */
  function mathsWrite(sum, words) {
    const s = session.getState();
    const boxes = sum.enclosedIds.map((id) => MM.boundsOf(s.nodes.get(id))).filter(Boolean);
    const b = boxes.length ? union(boxes) : null;
    const at = b ? { x: b.maxX + wpx(24), y: b.minY } : screenToWorld(innerWidth / 2, innerHeight / 2);
    session.withTool('maths', () => typeText(at, words, { w: Math.max(150, words.length * 12), h: 34 }), 'sum');
    flash('put on the board as text: ' + words);
  }

  /** The figures on the board at their real size, as a new SVG built from the numbers — null when no figure has a unit. */
  function mathsTrueSize() {
    const board = mathsFor(session.getState()).board;
    if (!board) return null;
    if (mathsTrue.board !== board) mathsTrue = { board: board, doc: MM.trueSize(board) };
    return mathsTrue.doc.figures.length ? mathsTrue.doc : null;
  }

  /** The same, tiled onto pages at 100% with a measured test square on each: Letter, or A4 for a metric drawing. */
  function mathsPrintJob() {
    const doc = mathsTrueSize();
    if (!doc) return null;
    return MM.printTiled(doc, { paper: doc.unit === 'in' || doc.unit === 'ft' ? 'letter' : 'a4' });
  }

  function mathsPrint() {
    const job = mathsPrintJob();
    if (!job) { flash('nothing to print at true size — label a side, in inches or centimetres'); return; }
    if (job.error) { flash(job.error); return; }
    downloadText('print-true-size.html', job.html, 'text/html');
    flash('print-true-size.html — ' + job.pages.length + ' page' + (job.pages.length === 1 ? '' : 's') + ' at 100%; measure the ' + job.testSquare.text + ' square on each');
  }

  // ===== The export pane's row: the figure at its real size =================
  const mathsRow = document.createElement('div');
  mathsRow.className = 'exRow exMaths';
  mathsRow.innerHTML = '<button data-mathsout="svg">true-size.svg</button><button data-mathsout="print">print.html</button>';
  exportPanel.appendChild(mathsRow);
  const MATHS_WAITS = 'the figures at their real size — label a side, in inches or centimetres, and this draws it';
  const MATHS_SVG_TITLE = 'Every labelled figure drawn from its numbers at its real size: the root in paper inches or centimetres';
  const MATHS_PRINT_TITLE = 'The same tiled onto pages at 100%, a test square on each — a printer scales without saying so';
  let mathsRowState = null;
  /** The row is always there; it waits, and says why, until a figure has numbers and a unit. */
  function syncMathsRow(board) {
    const ok = !!board && board.figures.some((fm) => fm.drawing && fm.drawing.unit && fm.solution.readings.length);
    if (ok === mathsRowState) return;
    mathsRowState = ok;
    const [svgBtn, printBtn] = mathsRow.querySelectorAll('button');
    svgBtn.disabled = printBtn.disabled = !ok;
    svgBtn.title = ok ? MATHS_SVG_TITLE : MATHS_WAITS;
    printBtn.title = ok ? MATHS_PRINT_TITLE : MATHS_WAITS;
  }
  mathsRow.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('button[data-mathsout]');
    if (!b || b.disabled) return;
    if (b.dataset.mathsout === 'svg') {
      const doc = mathsTrueSize();
      if (!doc) { flash('nothing to draw at true size — label a side, in inches or centimetres'); return; }
      downloadText('true-size.svg', doc.svg, 'image/svg+xml');
      flash('true-size.svg — ' + doc.figures.length + ' figure' + (doc.figures.length === 1 ? '' : 's') + ' at real size, ' + doc.width + ' × ' + doc.height + ' ' + doc.unit);
    } else mathsPrint();
    closePanel(exportPanel, exportBtn);
  });

  // ===== For the e2e ========================================================
  window.__mmMaths = {
    // What the last paint drew: each chip, where it stands (its anchor in world units), whether it stands at rest.
    chipsDrawn: () => mathsDrawn.map((c) => Object.assign({}, c, { ids: c.ids.slice() })),
    // The moment is over: only what stands, what the hand is on and what was asked for shows.
    settle: () => { mathsChangedAt.clear(); mathsPin = null; fgSettle(); render(session.getState()); },
    board: () => mathsFor(session.getState()).board,
    trueSizeSvg: () => { const d = mathsTrueSize(); return d ? d.svg : null; },
    printJob: () => { const j = mathsPrintJob(); return j ? { pages: j.pages.length, paper: j.paper, testSquare: j.testSquare.text, error: j.error || null } : null; },
  };

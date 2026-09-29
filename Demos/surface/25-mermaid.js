// ===== mermaid =====
// Provides: the surface's half of Mermaid (V1-PLAN §3, D2 and D3): mermaidPartNames (ink over a rendered diagram
//   lands on the marks it was written from), drawMermaidFrom (the host act of Draw it: a text drawn as ink beside
//   everything, selected and fitted, said in one sentence), the export pane's Mermaid row, mermaidImported (a
//   dropped .mmd held, so Draw it is at hand), and what a test asks (mermaidLast).
// Uses: core (MM.mermaidFor, MM.readMermaid, MM.drawMermaid), view (fitTo, view), render (say, flash, logKey),
//   handwriting (isRead), images (downloadText, exportPanel, exportBtn), artifacts (codeRepOf).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Ink over a rendered diagram =========================================
  // The frame reports each node as a part named for its MERMAID id (`stroke_7`);
  // which marks that node was written from is what the writer said of the board's
  // own marks when it wrote this text (`ids`, and `marks` for a symbol drawn with
  // several strokes). It is derived where it is asked — from the marks the tool
  // wrote it from, when this page knows them, else from the board — and only when
  // that reading says exactly this text: an edited text has no marks to name, and
  // its parts keep their Mermaid ids. Runtime, never the log.
  const mermaidMadeFrom = new Map(); // artifactId -> the marks it was made from, this sitting
  let mermaidNamed = { key: null, names: null };

  const boardMarksOf = (s) => s.contentIds.filter((id) => !s.artifacts.includes(id));
  const isReadMark = (s) => (id) => { const n = s.nodes.get(id); return !!n && isRead(n); };

  /** Mermaid id → the marks it stands for on this board, for one artifact's text; null when the text is no reading of the board's. */
  function mermaidNamesFor(artifactId) {
    const s = session.getState();
    const key = logKey() + '|' + artifactId;
    if (mermaidNamed.key === key) return mermaidNamed.names;
    const n = s.nodes.get(artifactId);
    const rep = n && codeRepOf(n);
    let names = null;
    if (rep && rep.data.kind === 'mermaid') {
      const made = (mermaidMadeFrom.get(artifactId) || []).filter((id) => s.nodes.has(id) && !s.artifacts.includes(id));
      for (const scope of [made, boardMarksOf(s)]) {
        if (scope.length < 2) continue;
        const said = MM.mermaidFor(s, scope, isReadMark(s));
        if (said && said.said.text === rep.data.code) { names = { ids: said.said.ids, marks: said.said.marks }; break; }
      }
    }
    mermaidNamed = { key: key, names: names };
    return names;
  }

  /** The names ink over one node of a diagram addresses: its marks — a symbol's stroke, a figure's strokes — or, with no marks to say, the Mermaid id. */
  function mermaidPartNames(artifactId, partId) {
    const names = mermaidNamesFor(artifactId);
    if (!names || !names.ids[partId]) return [partId];
    const id = names.ids[partId];
    return id.indexOf('figure:') === 0 ? (names.marks[partId] || [id]) : [id];
  }

  // ===== Draw it: a text drawn as ink ========================================
  const MERMAID_THINGS = { sequence: ['participant', 'participants'], 'uml-class': ['class', 'classes'] };
  const MERMAID_LINKS = { sequence: ['message', 'messages'] };
  const mermaidCount = (n, [one, many]) => n + ' ' + (n === 1 ? one : many);
  let mermaidDrawn = null;

  /** Where a drawing stands so it lands beside everything on the board and off the hand's way: right of every mark, at the board's top. */
  function mermaidOrigin(s, scale) {
    const boxes = s.contentIds.map((id) => MM.boundsOf(s.nodes.get(id))).filter(Boolean);
    if (!boxes.length) { const c = screenToWorld(innerWidth / 2, innerHeight / 2); return { x: c.x, y: c.y }; }
    const b = union(boxes);
    return { x: b.maxX + 80 * scale, y: b.minY };
  }

  /** What was drawn, in one sentence — and what was not: the lines a reader could not read, and what is drawn otherwise than written. */
  function mermaidSaid(name, drawn) {
    const notation = MM.notationById(drawn.notation);
    const called = notation ? notation.name : drawn.notation;
    const article = /^[A-Z]{2,}\b/.test(called) ? 'a ' + called : (/^[aeio]/i.test(called) ? 'an ' : 'a ') + called.toLowerCase();
    const nodes = Object.keys(drawn.ids).length;
    let out = drawn.bounds
      ? 'drew ' + article + ' from ' + name + ': ' + mermaidCount(nodes, MERMAID_THINGS[drawn.notation] || ['node', 'nodes']) + ' and ' + mermaidCount(drawn.links.length, MERMAID_LINKS[drawn.notation] || ['link', 'links'])
      : 'nothing was drawn from ' + name;
    const parts = [];
    if (drawn.refused.length) {
      const lines = drawn.refused.slice(0, 3).map((r) => 'line ' + r.line + (r.text ? ' “' + r.text.trim().slice(0, 40) + '”' : '') + ' (' + r.reason + ')');
      parts.push('not read: ' + lines.join(', ') + (drawn.refused.length > 3 ? ' and ' + (drawn.refused.length - 3) + ' more' : ''));
    }
    for (const note of drawn.notes) parts.push(note);
    if (parts.length) out += ' — ' + parts.join('; ');
    return out;
  }

  /**
   * The host act of *Draw it* (tools/mermaid-draw.ts names it): the artifact's text drawn as ink the engine reads
   * as the notation it was written in, at the zoom the hand works at, beside everything on the board — inside
   * the tool's stamp, so it is one act and one undo takes it all away. The drawn marks are selected and the view
   * fitted to them; what was left out or drawn otherwise is said, never thrown.
   */
  function drawMermaidFrom(artifactId) {
    const s = session.getState();
    const n = s.nodes.get(artifactId);
    const rep = n && codeRepOf(n);
    if (!rep || rep.data.kind !== 'mermaid') { flash('that is not a Mermaid text'); return null; }
    const scale = 1 / view.zoom;
    const origin = mermaidOrigin(s, scale);
    // Hundreds of events, one paint: the board is drawn when the diagram is all there.
    const drawn = holdPaint(() => MM.drawMermaid(session, rep.data.code, { at: Date.now(), scale: scale, origin: origin }));
    const marks = Object.values(drawn.ids).concat(drawn.links.flatMap((l) => l.ids));
    const name = (MM.wordOf(n) || 'the text').replace(/^.*\//, '');
    if (drawn.bounds) {
      // The text has done its part: its field closes, and what was drawn is what is held.
      const sum = session.getState().summon;
      if (sum) session.dismiss(sum.id, drawn.lastAt + 1);
      session.select(marks, drawn.lastAt + 2);
      fitTo(drawn.bounds);
    }
    const said = mermaidSaid(name, drawn);
    mermaidDrawn = { notation: drawn.notation, ids: Object.assign({}, drawn.ids), links: drawn.links.map((l) => ({ index: l.index, from: l.from, to: l.to, ids: l.ids.slice() })), marks: marks, notes: drawn.notes.slice(), refused: drawn.refused.map((r) => Object.assign({}, r)), bounds: drawn.bounds, said: said };
    say(said);
    return drawn;
  }

  /** What the last Draw it drew and said, for tests. */
  const mermaidLast = () => (mermaidDrawn ? Object.assign({}, mermaidDrawn) : null);

  /** A dropped or pasted .mmd is held where it landed, so Draw it is in the field at once — when a reader reads it; else it stands as text and says so. */
  function mermaidImported(artifactId, name) {
    const n = session.getState().nodes.get(artifactId);
    const rep = n && codeRepOf(n);
    if (!rep) return;
    const read = MM.readMermaid(rep.data.code);
    if (read.notation) {
      session.summonMarks([artifactId], Date.now());
      say(name + ': ' + mermaidCount(read.nodes.length, MERMAID_THINGS[read.notation] || ['node', 'nodes']) + ' of Mermaid — Draw it puts it on the board as marks');
    } else {
      const why = read.refused.length ? read.refused[0].reason : 'it is not a diagram the canvas reads';
      say(name + ' stands as text: the canvas cannot draw it yet — ' + why);
    }
  }

  // ===== The export pane's Mermaid row =======================================
  // Beside the board's three files, a fourth when what is held — or, holding
  // nothing, the board — reads as a notation the canvas can write in Mermaid:
  // the file it would write, named for the notation. The pane reads the board
  // again each time it opens; a board that reads as none has no such row.
  const exMermaid = document.getElementById('exMermaid');

  /** What the pane would write: the held marks' Mermaid when they read as a diagram, else the whole board's. */
  function mermaidToExport() {
    const s = session.getState();
    const board = boardMarksOf(s);
    const held = new Set(s.summon ? s.summon.enclosedIds : s.selection);
    const heldMarks = board.filter((id) => held.has(id));
    for (const [scope, marks] of [['held', heldMarks], ['board', board]]) {
      if (marks.length < 2) continue;
      const said = MM.mermaidFor(s, marks, isReadMark(s));
      if (said) return { scope: scope, said: said };
    }
    return null;
  }

  function refreshMermaidRow() {
    const got = mermaidToExport();
    exMermaid.hidden = !got;
    if (!got) return;
    const b = exMermaid.querySelector('button');
    b.textContent = got.said.reading.notation + '.mmd';
    b.title = (got.scope === 'held' ? 'The marks held' : 'The board') + ' as Mermaid text — ' + MM.describeNotation(got.said.reading);
  }
  exportBtn.addEventListener('click', refreshMermaidRow);
  exportPanel.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('button[data-export="mermaid"]');
    if (!b) return;
    const got = mermaidToExport();
    if (!got) { flash('nothing here reads as a diagram the canvas can write in Mermaid'); return; }
    const file = got.said.reading.notation + '.mmd';
    downloadText(file, got.said.said.text, 'text/plain');
    flash(file + ' — ' + MM.describeNotation(got.said.reading));
  });

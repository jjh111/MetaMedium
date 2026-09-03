// ===== text =====
// Provides: text as an element — typeText (a text artifact at a point), editText (a new version of one),
//   beginTextEdit/commitTextEdit (the editor on the canvas, opened by a double-click on empty ground or
//   from the panel), wordToText (a written word becomes a text artifact, on request).
// Uses: core, view, artifacts (frames), render.
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Text as an element ==================================================
  // A `text` artifact is a file of words: it renders as prose ink can address
  // (its paragraphs), it offers its words to any slot a frame wires it to,
  // and it is edited in place — a new version of its code, every version
  // kept, undo dropping the last. Handwriting stays handwriting; a written
  // word becomes text only when asked (ARCHITECTURE-v8 §19 S3).
  const TEXT_DIR = 'text';
  const TEXT_W = 320, TEXT_H = 120;
  let textCount = 0;
  let editing = null; // { id, el, bounds } while the editor is open

  /** A text artifact at a point, its words as its code. */
  function typeText(at, text, size) {
    const w = size && size.w || TEXT_W, h = size && size.h || TEXT_H;
    textCount++;
    const name = 'text ' + textCount;
    return session.import({
      kind: 'text', path: TEXT_DIR + '/' + textCount + '.txt', name: name,
      bounds: { minX: at.x, minY: at.y, maxX: at.x + w, maxY: at.y + h }, code: text, at: Date.now(),
    });
  }

  /** A new version of a text artifact's words. */
  function editText(id, text) {
    return session.attachCode({ participantId: MM.LOCAL_PARTICIPANT, nodeId: id, kind: 'text', code: text, at: Date.now() });
  }

  /** A written word (its transcript) becomes a text artifact where the writing is; the ink stays. */
  function wordToText(wordId) {
    const s = session.getState();
    const n = s.nodes.get(wordId);
    const said = n && MM.transcriptOf(n);
    const b = n && MM.boundsOf(n);
    if (!said || !b) return null;
    const w = Math.max(TEXT_W, b.maxX - b.minX), h = Math.max(48, b.maxY - b.minY);
    textCount++;
    return session.import({
      kind: 'text', path: TEXT_DIR + '/' + textCount + '.txt', name: said,
      bounds: { minX: b.minX, minY: b.minY, maxX: b.minX + w, maxY: b.minY + h }, code: said, at: Date.now(),
    });
  }

  // ===== The editor: on the canvas, in world space =========================
  const editorEl = document.getElementById('textEditor');

  function placeEditor(b) {
    const p = worldToScreen(b.minX, b.minY), q = worldToScreen(b.maxX, b.maxY);
    editorEl.style.left = p.x + 'px'; editorEl.style.top = p.y + 'px';
    editorEl.style.width = Math.max(120, q.x - p.x) + 'px'; editorEl.style.height = Math.max(40, q.y - p.y) + 'px';
    editorEl.style.fontSize = Math.max(11, 13 * view.zoom) + 'px';
  }

  /** Open the editor on a text artifact, or on empty ground at a world point. */
  function beginTextEdit(id, at) {
    const s = session.getState();
    let bounds, text = '';
    if (id) {
      const n = s.nodes.get(id);
      const rep = n && codeRepOf(n);
      if (!rep || rep.data.kind !== 'text') return false;
      bounds = MM.boundsOf(n); text = rep.data.code;
    } else {
      bounds = { minX: at.x, minY: at.y, maxX: at.x + TEXT_W, maxY: at.y + TEXT_H };
    }
    editing = { id: id || null, bounds: bounds };
    editorEl.value = text;
    editorEl.hidden = false;
    placeEditor(bounds);
    setTimeout(() => editorEl.focus(), 0);
    return true;
  }

  /** Commit: a new version of the artifact, or a new artifact; nothing when nothing was typed. */
  function commitTextEdit() {
    if (!editing) return null;
    const e = editing; editing = null;
    editorEl.hidden = true;
    const text = editorEl.value;
    if (e.id) {
      const n = session.getState().nodes.get(e.id);
      const rep = n && codeRepOf(n);
      if (rep && rep.data.code === text) return e.id; // unchanged: no event
      editText(e.id, text);
      flash('text revised — every version is kept; undo drops this one');
      return e.id;
    }
    if (!text.trim()) return null;
    const id = typeText({ x: e.bounds.minX, y: e.bounds.minY }, text);
    flash('text: a file of words — circle it with a page to wire it into a slot');
    return id;
  }
  function cancelTextEdit() {
    editing = null;
    editorEl.hidden = true;
  }

  editorEl.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') { cancelTextEdit(); return; }
    // Enter commits; Shift+Enter is a new line — a heading is one line, prose is many.
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitTextEdit(); }
  });
  editorEl.addEventListener('blur', () => { if (editing) commitTextEdit(); });

  // Double-click on empty ground: type here. A double-click on ink is nothing —
  // a dot is drawn, not tapped, and a tap is the dead state.
  canvas.addEventListener('dblclick', (e) => {
    const w = screenToWorld(e.clientX, e.clientY);
    if (nodeAt(w.x, w.y)) return;
    beginTextEdit(null, w);
  });

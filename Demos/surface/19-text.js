// ===== text =====
// Provides: text as an element — typeText (a text artifact at a point), editText (a new version of one),
//   beginTextEdit/commitTextEdit (the editor on the canvas, opened by a double-click on empty ground or
//   from the panel), wordToText (a written word becomes a text artifact, on request), strikeOnText/foldIntoText/textNear (text folds back from ink).
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

  /** A new version of a text artifact's words. Where the text came from (writing) travels with every version. */
  function editText(id, text) {
    const n = session.getState().nodes.get(id);
    const rep = n && codeRepOf(n);
    return session.attachCode({ participantId: MM.LOCAL_PARTICIPANT, nodeId: id, kind: 'text', code: text, from: rep && rep.data.from, at: Date.now() });
  }

  /** A written word (its transcript) becomes a text artifact where the writing is; the ink stays. */
  /** A line of writing as one text artifact, standing where the line is. */
  function lineToText(ids, text) {
    const s = session.getState();
    const pts = ids.map((id) => s.nodes.get(id)).filter(Boolean).map((n) => MM.boundsOf(n)).filter(Boolean).flatMap((b) => [{ x: b.minX, y: b.minY }, { x: b.maxX, y: b.maxY }]);
    if (!text || !pts.length) return null;
    const b = MM.getBounds(pts);
    const w = Math.max(TEXT_W, b.maxX - b.minX), h = Math.max(48, b.maxY - b.minY);
    textCount++;
    return session.import({
      kind: 'text', path: TEXT_DIR + '/' + textCount + '.txt', name: text,
      bounds: { minX: b.minX, minY: b.minY, maxX: b.minX + w, maxY: b.minY + h }, code: text, at: Date.now(),
    });
  }

  // ===== Text folds back from ink (v10 F12) ===================================
  // Text is first class and it came from the hand: scratch a word of a text
  // made from writing and the word is struck — a gap stands where it was;
  // write beside the gap, read it, and *Fold “…” into the text* puts the new
  // word in its place. Every step is a new version of the text; undo walks
  // them back.
  const GAP = '…';

  /** The words of a text with their positions on the canvas, from the frame's own document. */
  function textWords(s, aid) {
    const an = s.nodes.get(aid);
    const fr = an && MM.frameOf(an);
    const f = frames.get(aid);
    let doc = null;
    try { doc = f && f.iframe ? f.iframe.contentDocument : null; } catch (err) { doc = null; }
    if (!fr || !doc) return [];
    const out = [];
    for (const el of doc.querySelectorAll('text[data-region]')) {
      const r = el.getBoundingClientRect();
      out.push({ index: Number(el.dataset.region.slice(1)) - 1, word: el.textContent, box: { minX: fr.x + r.left, minY: fr.y + r.top, maxX: fr.x + r.right, maxY: fr.y + r.bottom } });
    }
    return out;
  }
  /** A text's code with word k replaced, or a word inserted after k — lines kept. */
  function withWord(code, k, word, insertAfter) {
    let i = 0;
    return String(code).split(/\r?\n/).map((l) => l.split(/\s+/).filter(Boolean).flatMap((wd) => {
      const j = i++;
      if (j !== k) return [wd];
      return insertAfter ? [wd, word] : [word];
    }).join(' ')).join('\n');
  }
  /** A scratch over a word of a text strikes it: a gap where it was, the scratch gone, one version. Returns the word struck. */
  function strikeOnText(s, strokeId, points) {
    const node = s.nodes.get(strokeId);
    const fp = node && MM.fingerprintOf(node);
    if (!fp || fp.isClosed || fp.corners < 2) return null;
    const b = fp.bounds;
    for (const aid of s.live) {
      const an = s.nodes.get(aid);
      if (!isWritingArtifact(an) || flipped.has(aid)) continue;
      const fr = MM.frameOf(an);
      if (!fr || b.maxX < fr.x || b.minX > fr.x + fr.w || b.maxY < fr.y || b.minY > fr.y + fr.h) continue;
      for (const wd of textWords(s, aid)) {
        if (wd.word === GAP) continue;
        const outline = MM.outlineOf({ bounds: wd.box, closed: true });
        if (!outline || MM.countCrossings(points, outline, 3) < 3) continue;
        editText(aid, withWord(codeRepOf(an).data.code, wd.index, GAP, false));
        session.erase(strokeId, Date.now());
        return wd.word;
      }
    }
    return null;
  }
  /** The text made from writing that this writing sits on or just beside (above a gap, say), if any. */
  function textNear(s, b) {
    const h = Math.max(1, b.maxY - b.minY);
    for (const aid of s.live) {
      const an = s.nodes.get(aid);
      if (!isWritingArtifact(an)) continue;
      const fr = MM.frameOf(an);
      if (!fr) continue;
      // Beside: within four lines of the text, or four heights of the writing, whichever is the taller — a hand writes the replacement a line or two above.
      const lines = Math.max(1, String(codeRepOf(an).data.code).split(/\r?\n/).length);
      const tol = 4 * Math.max(h, fr.h / lines);
      if (b.maxX >= fr.x - tol && b.minX <= fr.x + fr.w + tol && b.maxY >= fr.y - tol && b.minY <= fr.y + fr.h + tol) return aid;
    }
    return null;
  }
  /** Written words fold into a text: in place of the nearest gap, else after the nearest word. The writing leaves; the text is a version richer. */
  function foldIntoText(aid, text, markIds) {
    const s = session.getState();
    const an = s.nodes.get(aid);
    const rep = an && codeRepOf(an);
    if (!rep) return null;
    const boxes = markIds.map((id) => MM.boundsOf(s.nodes.get(id))).filter(Boolean);
    const cx = boxes.length ? (Math.min(...boxes.map((x) => x.minX)) + Math.max(...boxes.map((x) => x.maxX))) / 2 : 0;
    const words = textWords(s, aid);
    const dist = (wd) => Math.abs((wd.box.minX + wd.box.maxX) / 2 - cx);
    const gaps = words.filter((wd) => wd.word === GAP).sort((p, q) => dist(p) - dist(q));
    const at = Date.now();
    let next;
    if (gaps.length) next = withWord(rep.data.code, gaps[0].index, text, false);
    else if (words.length) { const near = words.slice().sort((p, q) => dist(p) - dist(q))[0]; next = withWord(rep.data.code, near.index, text, true); }
    else next = text;
    editText(aid, next);
    markIds.forEach((id, i) => session.erase(id, at + 1 + i));
    return next;
  }

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
    const under = nodeAt(w.x, w.y);
    // A double-click on a text — typed, or writing taken as text — edits it in place.
    if (under) { if (beginTextEdit(under)) { const s0 = session.getState(); if (s0.summon) session.dismiss(s0.summon.id, Date.now()); if (s0.selection.length) session.deselect(Date.now()); } return; }
    beginTextEdit(null, w);
  });

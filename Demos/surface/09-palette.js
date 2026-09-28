// ===== palette =====
// Provides: the field — one text input at the pen tip, its geometry (fieldBox/placeField), and the
//   ADAPTER around the reader (fieldContext → readFieldCommand → runFieldCommand, exposed as readField);
//   the ADAPTER around core's tools (V1-PLAN B1): conversionsFor — what this is (readings, read here) and
//   what it affords (MM.offersFor over the scope fieldScope gathers, toolHost the surface's facts), ranked
//   by MM.rankOffers with this device's uses; takeOffer — the tool's act (stamped with its id) and what
//   only the surface can do for it (HOST_ACTS, TOOL_ACTS); the core verbs (name, copy, paste, erase;
//   copyMarks/pasteClip/duplicateMarks, the clip); the label act's words (labelMarks, labelSentence); the
//   prompts (runPrompt → a page or a program, runAsk, runDraw); the library (libraryEntries/reuseEntry/
//   applyLibrary, targetOf); renderSummon/refreshPalette/paintField.
// Uses: core (hand, lastPen), ui, field (readFieldCommand, verbFor, libraryMatch, typedWord — pure,
//   09-field.js), view (usableViewport, viewportRect), models (agents, withWork, cancelReading,
//   askModelsAbout, offerModel), snap (snapMode), render (nameOfParticipant), artifacts (flipped), frames,
//   clocks (definitionOf), handwriting (isWriting, isRead, readLine, readOne), images (svgOf), text
//   (wordToText, lineToText, foldIntoText, textNear, beginTextEdit), input (say, flash, downType — which
//   hand opened the field), hand (handOfPointer).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== The field (SURFACE-v9-PLAN §6) ======================================
  //
  // One text input, at the pen tip. What is typed is read as it is typed — a
  // verb the selection has, a name the library knows, words the verb table
  // reads, a prefix, or else the brief — and the reading is shown under the
  // field before Enter is pressed. Under it, three rows in a fixed order:
  // the core verbs (the same four, in the same slots, every time), what this
  // IS (readings with their numbers; tapping one takes it as the name), and
  // what it AFFORDS (what the reading lets the engine do, ranked). The
  // palette never decides what the marks mean; it renders what the engine
  // read. Nothing here asks a model except the acts that say so.
  let shownSummonId = null;
  let paletteItems = [];     // every offer for the open selection, ranked
  let paletteScope = null;   // the scope the open field's offers were read from (V1-PLAN B1)
  let paletteIndex = -1;     // the pill the arrows chose among the visible ones; -1 is none
  let paletteNavigated = false;
  let clip = null;           // what Copy held: { strokes: [{ points }], bounds, from }
  const MAX_AFFORD = 5;      // pills shown in the affordance column before "+N more"

  // ===== What the field holds: readings, and what the tools afford (V1-PLAN B1) =====
  // What this IS is read here: a name you gave a shape like it, the words you
  // wrote, what a model read it as, the concepts it reads as — each a reading
  // with its number, and tapping one takes it. What it AFFORDS is every
  // registered tool's offer for this scope (`MM.offersFor`, core's `tools/`):
  // a new tool is a file and a line in core, and it is offered here with no
  // change to this file. Both are ranked by one pure function in core
  // (`MM.rankOffers`), with this device's use counts handed in. This file is
  // the adapter: it gathers the scope, maps offers to pills, and performs
  // what only the surface can — ask a model, open the editor, flip a text.

  /** What only this surface knows, for the tools: the snap preference, the models, what is read or flipped, where texts stand. */
  function toolHost() {
    return {
      snap: snapMode,
      models: agents.map((a) => ({ name: a.name, sees: !!(a.config && a.config.vision) })),
      isRead: (id) => { const n = session.getState().nodes.get(id); return !!n && isRead(n); },
      isFlipped: (id) => flipped.has(id),
      nameOf: nameOfParticipant,
      textNear: (b) => textNear(session.getState(), b),
    };
  }

  /** The scope the field's tools read: the open summon, what is typed, and this surface's facts. */
  function fieldScope(s, text, word) {
    return MM.toolScope(session, { summon: s.summon, text: text || '', word: word || null, host: toolHost() });
  }

  /** A reading, for the top row: what it stands on ranks it, exactly as it ranks an offer. */
  function readingItem(o) {
    return Object.assign({ certain: true, tier: 1, group: o.grounds.on, groupConf: o.grounds.confidence, groupWhy: o.grounds.why, base: MM.baseOn(o.grounds) }, o);
  }

  /** An offer as a pill: its reason the tooltip, what it stands on after that, a dot when it asks a model. */
  function offerItem(o) {
    const item = {
      key: o.key, label: o.label, why: o.reason, verbs: o.verbs || [], tier: o.asks === 'model' ? 2 : 1,
      group: o.hidden ? 'hidden' : o.grounds ? o.grounds.on : 'always',
      groupConf: o.grounds ? o.grounds.confidence : 0, groupWhy: o.grounds ? o.grounds.why : '',
      base: o.base, grounds: o.grounds, asks: o.asks, offer: o,
      run: () => takeOffer(o),
    };
    if (o.lead) item.certain = true;
    if (o.name !== undefined) item.name = o.name;
    if (o.line !== undefined) item.line = o.line;
    return item;
  }

  function conversionsFor(s) {
    const sum = s.summon;
    const scope = paletteScope = fieldScope(s, '', null);
    const reading = scope.reading;
    const marks = scope.marks;
    const known = [], lined = [], worded = [], proposed = [], conceived = [];

    // --- What this IS: readings with their numbers. Tapping one takes it as the name. ---
    for (const sug of sum.suggestions) {
      if (sug.kind !== 'match') continue;
      known.push(readingItem({
        key: 'sug:' + sug.id, grounds: { on: 'known', confidence: sug.score || 1, why: 'you named this shape before' },
        label: sug.label + ' ' + (sug.score || 1).toFixed(2), name: sug.label,
        why: (sug.reasoning || 'like the one you named') + ' — take it as another ' + sug.label,
        run: () => {
          const made = session.bless({ summonId: sum.id, suggestionId: sug.id, at: Date.now() });
          // A definition that holds a program hands it to its instance: a
          // drawing that matches the library IS a reuse, with no words typed.
          const entry = made && libraryEntries(session.getState()).find((e) => e.id === sug.artifactId);
          if (entry) reuseEntry(made, entry);
        },
      }));
    }
    // A line of writing — words gathered by nearness (v10 D3) — is one thing to
    // name and one thing to make text, once every word on it has been read.
    const line = MM.writingLine(scope);
    // Writing alone, taken, becomes TEXT where it is — fitted to the ink, the
    // ink underneath, editable — never a definition (v10 F8). Writing beside
    // a shape names the shape, as before.
    const allWriting = marks.length > 0 && marks.every((id) => { const n = s.nodes.get(id); return n && (isWriting(n) || MM.isWord(n)); });
    if (line.read) {
      lined.push(readingItem({
        key: 'line:' + line.ids.join(','), grounds: { on: 'written', confidence: line.confidence, why: 'read from your handwriting by ' + nameOfParticipant(line.said[0].source) },
        label: '“' + line.text + '” ' + line.confidence.toFixed(2), name: line.text,
        why: allWriting ? 'the line you wrote — take it as text, here; the ink stays underneath' : 'the line you wrote — ' + MM.NAMING_IS + ' — take it as the name',
        run: () => { if (allWriting) writingToText(sum, line.text); else session.bless({ summonId: sum.id, name: line.text, at: Date.now() }); },
      }));
    }
    // What the writing says: write a word beside a shape and it is the shape's name.
    {
      const labels = reading.roles.filter((r) => r.role === 'label' && sum.enclosedIds.includes(r.id) && !(line.read && line.ids.includes(r.id)));
      const said = labels.map((r) => ({ r, t: MM.transcriptsOf(s.nodes.get(r.id))[0] })).filter((x) => x.t);
      for (const { r, t } of said) {
        worded.push(readingItem({
          key: 'said:' + r.id, grounds: { on: 'written', confidence: t.confidence, why: 'read from your handwriting by ' + nameOfParticipant(t.source) },
          label: '“' + t.text + '” ' + t.confidence.toFixed(2), name: t.text,
          why: r.targets.length ? 'the word beside it — ' + MM.NAMING_IS + ' — take it as the name' : allWriting ? 'the word you wrote — take it as text, here; the ink stays underneath' : 'the word you wrote — ' + MM.NAMING_IS + ' — take it as the name',
          run: () => { if (allWriting && !r.targets.length) writingToText(sum, t.text); else session.bless({ summonId: sum.id, name: t.text, at: Date.now() }); },
        }));
      }
    }
    // What a model read this group as — held, attributed, and an offer to name it.
    {
      const seen = new Set();
      const heard = [];
      for (const id of sum.enclosedIds) {
        const n = s.nodes.get(id);
        if (!n) continue;
        for (const r of MM.interpretationsOf(n, s.nodes)) {
          if (r.tier === 0 || r.blessed) continue;
          const key = r.label.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          heard.push(r);
        }
      }
      heard.sort((a, b) => b.weight - a.weight).slice(0, 3).forEach((r) => {
        proposed.push(readingItem({
          key: 'proposed:' + r.label, grounds: { on: 'proposed', confidence: r.weight, why: 'read this way by ' + r.sourceName },
          label: r.label + ' ' + r.weight.toFixed(2) + ' · ' + r.sourceName, name: r.label,
          why: r.sourceName + (r.reasoning ? ' — ' + r.reasoning.slice(0, 80) : '') + ' — take it as the name',
          run: () => session.bless({ summonId: sum.id, name: r.label, at: Date.now() }),
        }));
      });
    }
    // The concepts these marks read as (Tier 0): a row, a frame, a flow — each
    // a reading with a number; what each lets the engine do is its tools' offer.
    reading.concepts.slice(0, 3).forEach((concept) => {
      conceived.push(readingItem({
        key: 'concept:' + concept.concept, grounds: { on: 'concept', confidence: concept.confidence, why: concept.reasoning },
        label: concept.concept + ' ' + concept.confidence.toFixed(2), name: concept.concept,
        why: concept.reasoning + ' — take it as the name',
        run: () => session.bless({ summonId: sum.id, name: concept.concept, at: Date.now() }),
      }));
    });

    // --- What it AFFORDS: every tool's offer for this scope, in the registry's order. ---
    const offers = MM.offersFor(scope).map(offerItem);
    // An act as particular to these marks as a reading (Fold “…” into the text)
    // stands with the readings, where it always stood: after the line it takes.
    const lead = offers.filter((i) => i.certain);
    return known.concat(lined, lead, worded, proposed, conceived, offers.filter((i) => !i.certain));
  }

  // ===== Taking an offer: the tool writes, the surface does the rest =========
  // Core's `takeOffer` stamps what the tool writes with its id; what only this
  // surface can do — ask a model, open the editor, flip a text, hold a clip,
  // put words in a text's places — it does here, inside the same stamp, so
  // whatever that writes carries the tool's id too. Then it says what happened.
  const HOST_ACTS = {
    // Writing becomes text where it stands: fitted to the ink when it was all writing, else a file of words.
    text: (o, scope) => { const d = o.data; if (d.act === 'writing') writingToText(scope.summon, d.text); else if (d.act === 'line') lineToText(d.ids, d.text); else wordToText(d.ids[0]); },
    fold: (o) => { const d = o.data; foldIntoText(d.text, d.words, d.ids); say('folded “' + d.words + '” into the text'); },
    'edit-text': (o) => beginTextEdit(o.data.id),
    flip: (o) => { const id = o.data.id; if (flipped.has(id)) flipped.delete(id); else flipped.add(id); render(session.getState()); refreshPalette(); },
    read: (o) => {
      const d = o.data, s = session.getState();
      let any = false;
      if (d.line.length) any = readLine(d.line, true) || any;
      d.single.forEach((id) => { any = readOne(s.nodes.get(id), true) || any; });
      if (!any) offerModel('Reading writing needs a model that can see — one marked “sees”.');
    },
    what: (o) => askModelsAbout(o.data.ids.slice()),
    duplicate: (o, scope) => duplicateMarks(scope.summon, o.data.ids),
    'behave-model': (o) => { const d = o.data; agents.forEach((a) => withWork('behave:' + a.id + ':' + d.nodeId, [d.nodeId], a.name + ' · reading the words', a.behave({ nodeId: d.nodeId, words: d.words, at: Date.now() })).then(() => render(session.getState()))); },
  };
  /** What the surface does around a tool's act: before it (the field rebuilt from what it leaves), and after (what to say). */
  const TOOL_ACTS = {
    // The summon stays open; the refused offer is gone from it.
    correct: { after: () => refreshPalette() },
    // The field stays open: a button click never closes it (the hand chains
    // commands — line up, then match sizes, then name).
    tidy: { after: (o, scope, t) => { flash((t.detail.mode === 'tidy' ? 'lined up ' : 'matched ') + t.detail.count + (t.detail.mode === 'tidy' ? ' marks' : ' sizes')); refreshPalette(); } },
    control: { after: (o, scope, t) => { if (t.made) flash('a slider — drag the knob to set it'); } },
    // Drawing them clean leaves the summon open, and the next offer is taken from the cleaned marks.
    clean: { before: () => { shownSummonId = null; }, after: (o, scope, t) => { if (t.detail.ids.length) flash('drew ' + t.detail.ids.length + ' clean' + (t.detail.summary ? ' — ' + t.detail.summary : '')); } },
    graph3d: { after: (o, scope, t) => say(!t.made ? 'could not hold that group' : t.detail.ok ? 'in 3D (tier 1): ' + t.detail.reasoning : 'could not stand it in 3D: ' + t.detail.error) },
    frames: { after: (o, scope, t) => { if (o.data.act !== 'frame' || !t.made) return; const st = session.getState(); flash('framed ' + t.detail.members + ' — ' + MM.describeFrame(MM.frameOfNode(st.nodes.get(t.made)), st.nodes)); } },
    label: { after: (o, scope, t) => { const d = t.detail; if (d.done.length || d.saying.length || d.refused.length) say(labelSentence(String(o.data.word).trim(), d.done, d.saying, d.refused)); } },
  };

  /** Take an offer: the tool's act, stamped with its id, and whatever only this surface can do for it. */
  function takeOffer(o) {
    const f = fieldInput();
    // What is typed as the pill is taken: `frame: rig` names the frame.
    const scope = Object.assign({}, paletteScope, { text: f ? f.value.trim() : '' });
    const acts = TOOL_ACTS[o.tool] || {};
    if (acts.before) acts.before(o, scope);
    session.withTool(o.tool, () => {
      const taken = MM.takeOffer(o, scope, session, Date.now());
      if (taken.host && HOST_ACTS[taken.host]) HOST_ACTS[taken.host](o, scope, taken);
      if (acts.after) acts.after(o, scope, taken);
    }, o.key);
  }

  // A tool registered or unregistered changes what the field offers with no
  // change to the log (R4c keys what a paint derives by the log): the
  // registry says so, and an open field offers again.
  MM.onToolsChange(() => refreshPalette());

  // ===== Ranking: the reading first, then learned use ========================
  // The order itself is core's (`MM.rankOffers`, tools/rank.ts): pure, and
  // asked in Node. Learned use is this device's, kept here and handed in.
  const USES_KEY = 'mm-palette-uses';
  const uses = store.get(USES_KEY) || {};

  function rankItems(items) {
    return MM.rankOffers(items, uses);
  }
  function noteUse(item) {
    uses[item.key] = (uses[item.key] || 0) + 1;
    store.set(USES_KEY, uses);
  }

  // ===== The core verbs: the same four, in the same slots (D2, I12) ==========
  function selectionMarks(s) {
    const sum = s.summon;
    return sum ? sum.enclosedIds.filter((id) => s.contentIds.includes(id)) : s.selection.filter((id) => s.contentIds.includes(id));
  }
  // The glyphs on the round buttons: the sketch drew them as circles with a mark inside.
  const GLYPH = {
    name: '<span class="g">Aa</span>',
    copy: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 4.5V3.5A1 1 0 0 0 9.5 2.5h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h1"/></svg>',
    paste: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="3.5" width="9" height="10.5" rx="1.5"/><path d="M6 3.5V2.5h4v1M6 8h4M6 10.5h4"/></svg>',
    erase: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
  };
  function coreItems(s) {
    const marks = selectionMarks(s);
    const sum = s.summon;
    return [
      { key: 'name', core: true, label: 'Name…', verbs: [], why: 'Name — hold it as a thing you can use again; type the name', disabled: !marks.length && !(sum && sum.onArtifact), tier: 1,
        run: () => { const f = fieldInput(); if (f) { f.value = 'name: '; paintField(f.value); f.focus(); f.setSelectionRange(f.value.length, f.value.length); } } },
      { key: 'copy', core: true, label: 'Copy', verbs: ['copy', 'cp'], why: 'Copy — hold the ink to paste; it is on the clipboard as SVG too', disabled: !marks.length, tier: 1,
        run: () => copyMarks(marks) },
      { key: 'paste', core: true, label: 'Paste', verbs: ['paste'], why: clip ? 'Paste — the copied ink, beside these' : 'Paste — nothing copied yet', disabled: !clip, tier: 1,
        run: () => { if (!clip) return; const b = selectionBounds(s) || (marks.length ? union(marks.map((id) => MM.boundsOf(s.nodes.get(id))).filter(Boolean)) : null); pasteClip(b ? { x: b.maxX + wpx(40), y: b.minY } : screenToWorld(innerWidth / 2, innerHeight / 2)); refreshPalette(); } },
      { key: 'erase', core: true, label: 'Erase', verbs: ['erase', 'delete', 'del', 'remove', 'rm'], why: 'Erase — the ink stays in the log; undo brings it back', disabled: !marks.length, tier: 1,
        run: () => { const at = Date.now(); if (sum) session.dismiss(sum.id, at); marks.forEach((id) => session.erase(id, at)); flash('erased ' + marks.length + ' mark' + (marks.length === 1 ? '' : 's')); } },
    ];
  }

  /** Copy holds some marks' ink (clean forms where held) and puts it on the clipboard as SVG. */
  function copyMarks(ids) {
    const s = session.getState();
    const strokes = [];
    const walk = (node) => {
      const pts = MM.strokePointsOf(node);
      // A pen's pressure goes with its ink (V1-PLAN R6); a clean form has none to carry.
      if (pts) { const clean = MM.cleanPointsOf(node); strokes.push({ points: (clean || pts).map((p) => (typeof p.p === 'number' ? { x: p.x, y: p.y, p: p.p } : { x: p.x, y: p.y })) }); return; }
      for (const e of node.edges) if (e.rel === 'has-part') { const p = s.nodes.get(e.to); if (p && !p.reps.some((r) => r.modality === 'erased')) walk(p); }
    };
    ids.forEach((id) => { const n = s.nodes.get(id); if (n) walk(n); });
    if (!strokes.length) { flash('nothing to copy'); return null; }
    const b = union(ids.map((id) => MM.boundsOf(s.nodes.get(id))).filter(Boolean));
    clip = { strokes: strokes, bounds: b, from: ids.slice() };
    try { const svg = svgOf(ids); if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(svg).catch(() => {}); } catch (err) { /* no clipboard here */ }
    flash('copied ' + ids.length + ' mark' + (ids.length === 1 ? '' : 's'));
    refreshPalette();
    return clip;
  }

  /** The clip's ink again, its top-left at a world point; the copies become the selection. */
  function pasteClip(at, select) {
    if (!clip) return [];
    const dx = at.x - clip.bounds.minX, dy = at.y - clip.bounds.minY;
    let t = Date.now();
    const made = [];
    for (const st of clip.strokes) made.push(session.addStroke(st.points.map((p) => (typeof p.p === 'number' ? { x: p.x + dx, y: p.y + dy, p: p.p } : { x: p.x + dx, y: p.y + dy })), t++, undefined, 1 / view.zoom, { content: true }));
    if (made.length && select !== false) session.select(made, t);
    flash('pasted ' + made.length + ' stroke' + (made.length === 1 ? '' : 's'));
    return made;
  }

  /** The ink of some marks, again, beside them; the copies become the selection. Copy and paste in one. */
  function duplicateMarks(sum, ids) {
    const s = session.getState();
    const boxes = ids.map((id) => MM.boundsOf(s.nodes.get(id))).filter(Boolean);
    if (!boxes.length) return;
    const b = union(boxes);
    const held = clip;
    if (!copyMarks(ids)) return;
    // The field stays open — the copies land selected beside the group, and
    // the hand can go straight to the next verb.
    const made = pasteClip({ x: b.maxX + wpx(40), y: b.minY });
    clip = held || clip; // a duplicate does not overwrite what Copy held
    flash('duplicated ' + ids.length + ' as ' + made.length + ' stroke' + (made.length === 1 ? '' : 's'));
    refreshPalette();
  }

  // ===== Name it, Label it: one word, two acts (V1-PLAN L2e) ==================
  // (`makersOf`, `theirMarks` and `madeThese` — the words for another hand's marks —
  // are the reader's, in 09-field.js, so the line before Enter and the status after it
  // say the same thing; core's label tool says them the same way, and the field's test
  // holds the two to it.)
  // Naming BLESSES: the marks become one thing, a definition the library keeps and
  // the next drawing like it is offered as. Labelling puts a word on your own ink and
  // MAKES NOTHING — no definition, no file, nothing the matcher learns (the notes, §B,
  // §D). Side by side, "Name it “inlet”" and "Label it “inlet”" look like one thing
  // twice, so the difference is said in the words the field already has — each pill's
  // tooltip says what it does and what it does not, and the reading line says what a
  // pill will do while it is pointed at or chosen by the arrows — never a new badge,
  // row or button. Label is an offer in the row, from core's label tool, and Name it
  // from its name tool (`MM.NAMING_IS`, `MM.LABELLING_IS`); the four core buttons stay four.

  /**
   * The held marks' ink, for the reader: how many the person made, and who made each of
   * the rest. "Is this mine?" is core's question (`session.isMine`), the one the label
   * door asks — the person's, in this sitting or another, so the marks drawn before a
   * reload are still theirs (V1-PLAN L2i). Who made the rest is said as it is shown.
   */
  function whoseInk(s, ids) {
    return MM.whoseInk({ session: session, state: s, host: { nameOf: nameOfParticipant } }, ids);
  }

  /**
   * A word on the person's own ink (V1-PLAN L2e): core's label act (`MM.labelInk`, stamped
   * as the label tool's) — one `label` event per mark they made, the field closed first, a
   * mark already saying the word left alone — and every mark accounted for in the status
   * line: labelled, already saying it, or refused with the reason, never silently skipped.
   */
  function labelMarks(sum, ids, word) {
    const r = MM.labelInk(session, { summonId: sum.id, ids: ids, word: word, at: Date.now(), nameOf: nameOfParticipant });
    if (r.done.length || r.saying.length || r.refused.length) say(labelSentence(String(word || '').trim(), r.done, r.saying, r.refused));
    return r;
  }

  /** What a label act did, in one sentence for the status line. */
  function labelSentence(text, done, saying, refused) {
    const q = '“' + text + '”';
    const parts = [];
    if (done.length) parts.push(done.length === 1 ? 'labelled it ' + q : 'labelled ' + done.length + ' marks ' + q);
    if (saying.length) parts.push(done.length ? saying.length + ' already said it' : saying.length === 1 ? 'it already says ' + q : 'these ' + saying.length + ' already say ' + q);
    const theirs = refused.filter((r) => r.reason === 'not-your-ink');
    if (theirs.length) parts.push((parts.length ? 'not on ' : 'no label on ') + theirMarks(theirs.map((r) => r.maker)) + ' — a label goes on your own ink');
    for (const r of refused) if (r.reason !== 'not-your-ink') parts.push(r.detail || 'not labelled');
    return parts.join(' · ');
  }

  // ===== The reader: what Enter will do, from what was typed ================
  // The decision itself is `readFieldCommand` in 09-field.js, which knows nothing
  // about the session, the DOM or this closure (SEAM-1). What is left here is the
  // adapter: build the context it reads, then perform the command it names.

  /** What the reader is allowed to know about the board, gathered from the closure. */
  function fieldContext(q, s, items) {
    const sum = s.summon;
    const text = (q || '').trim();
    const revising = !!(sum && sum.onArtifact);
    // A definition in the loop can be TOLD things; the verb table reads the words.
    // Both guards are the reader's own, applied here so the table is not walked on
    // every keystroke of a board that holds no definition.
    const defs = sum ? [...new Set(sum.enclosedIds.filter((id) => s.artifacts.includes(id)).map((id) => definitionOf(s, id)))] : [];
    const defId = defs.length ? defs[0] : null;
    const parsed = defId && text.length > 3 ? MM.parseBehaviour(text) : null;
    return {
      text: text,
      open: !!sum,
      revising: revising,
      items: items,
      models: agents.map((a) => a.name),
      library: revising ? [] : libraryEntries(s),
      definition: defId ? { id: defId, name: MM.wordOf(s.nodes.get(defId)) || defId } : null,
      // Whose ink is held: a label goes on the person's own marks only (V1-PLAN L2e).
      marks: sum ? whoseInk(s, selectionMarks(s)) : { mine: 0, others: [] },
      behaviour: parsed && parsed.behaviour
        ? { described: MM.describeBehaviour(parsed.behaviour), unparsed: parsed.unparsed, value: parsed.behaviour }
        : null,
      // A thunk: reading the drawing's genre costs a pass over the marks, and most
      // keystrokes settle on a verb or a name long before the brief.
      target: () => targetOf(sum, text).target,
    };
  }

  /** The named command the reader returned, as the thing this surface actually does. */
  function runFieldCommand(cmd, sum, items) {
    if (!cmd) return;
    const at = Date.now();
    if (cmd.do === 'take') {
      const item = (items[cmd.index] && items[cmd.index].key === cmd.key) ? items[cmd.index] : items.find((i) => i.key === cmd.key);
      if (item) { noteUse(item); item.run(); }
      return;
    }
    // Naming is the name tool's act, whether a pill or `name: word` took it.
    if (cmd.do === 'name') { MM.nameMarks(session, sum.id, cmd.name, at); return; }
    // The marks this summon held when Enter was read — not whatever is held when a stale
    // closure runs again, so a second run finds them already saying the word (L2e).
    if (cmd.do === 'label') { const s = session.getState(); labelMarks(sum, sum.enclosedIds.filter((id) => s.contentIds.includes(id)), cmd.text); return; }
    if (cmd.do === 'ask-what') { askModelsAbout(selectionMarks(session.getState())); return; }
    if (cmd.do === 'ask') { runAsk(sum, cmd.text); return; }
    if (cmd.do === 'draw') { runDraw(sum, cmd.text); return; }
    if (cmd.do === 'build') { runPrompt(sum, cmd.text, cmd.revising); return; }
    if (cmd.do === 'library') {
      const entry = libraryEntries(session.getState()).find((e) => e.id === cmd.id);
      if (entry) applyLibrary(sum, entry);
      return;
    }
    if (cmd.do === 'behave') {
      session.behave({ nodeId: cmd.definitionId, behaviour: cmd.behaviour, participantId: MM.LOCAL_PARTICIPANT, at: at });
      if (cmd.ask) agents.forEach((a) => withWork('behave:' + a.id + ':' + cmd.definitionId, [cmd.definitionId], a.name + ' · reading the words', a.behave({ nodeId: cmd.definitionId, words: cmd.words, at: Date.now() })).then(() => render(session.getState())));
      return;
    }
    if (cmd.do === 'need-model') { offerModel(cmd.what[0].toUpperCase() + cmd.what.slice(1) + ' needs a model.'); return; }
  }

  /**
   * One reader for the field. Returns { kind, line, run, quiet } — the line is shown
   * under the field as it is typed; run is what Enter does. The shape is unchanged;
   * what decides it is now pure.
   */
  function readField(q) {
    const s = session.getState();
    const sum = s.summon;
    if (!sum) return { kind: 'empty', line: '', run: null };
    const items = paletteItems.concat(coreItems(s));
    const r = readFieldCommand(fieldContext(q, s, items));
    const cmd = r.command;
    const out = { kind: r.kind, line: r.line, run: cmd ? () => runFieldCommand(cmd, sum, items) : null };
    if (r.quiet) out.quiet = true;
    // The pill the reading points at, for the row to mark as chosen.
    if (cmd && cmd.do === 'take') out.item = (items[cmd.index] && items[cmd.index].key === cmd.key) ? items[cmd.index] : items.find((i) => i.key === cmd.key);
    if (cmd && cmd.do === 'library') out.entry = libraryEntries(s).find((e) => e.id === cmd.id) || null;
    // `label:` and `name:` choose one of the pair the row offers for a typed word.
    if (cmd && cmd.do === 'label') out.item = { key: 'label-word' };
    if (cmd && cmd.do === 'name') out.item = { key: 'name-word' };
    return out;
  }

  // ===== The field on screen ===================================================
  function fieldInput() { return summonEl.querySelector('input.filter'); }

  // ===== The field's geometry, apart from its content =====================
  // The field opens at the pen tip and stays put while the window turns, the
  // panel docks at the bottom or a keyboard rises. Placement is therefore a
  // function of the space actually visible (01-view's `usableRect`) and of the
  // field's MEASURED size — a fixed 230px guess put its foot under the panel
  // the moment the pills wrapped to three rows (UI-1).
  const FIELD_W = 380;       // the design width; narrower when the space is
  const FIELD_MIN_W = 200;   // …but never so narrow the input is unusable
  const FIELD_H_GUESS = 230; // only until the content has been laid out once
  const FIELD_M = 8;         // the margin the field keeps off every edge
  const FIELD_TOP = 52;      // under the bar, when the usable rect cannot hold it
  let fieldAnchor = null;    // where the hand was when this field opened, on screen

  /** Pure: fit `size` at `want` inside `soft` if it fits there, inside `hard` otherwise. */
  function fitSpan(want, size, soft, hard) {
    const box = (soft.hi - soft.lo) >= size ? soft : hard;
    const hi = Math.max(box.lo, box.hi - size);
    return Math.max(box.lo, Math.min(hi, want));
  }

  /**
   * Pure: where the field stands, given where the hand is and what is visible.
   * @param {{x:number,y:number}} anchor the pen tip, on screen
   * @param {{viewport:object,usable:object,height:number,hand:string,panel:object|null}} o
   * @returns {{x:number,y:number,w:number}} in the viewport's own space
   */
  function fieldBox(anchor, o) {
    const v = o.viewport, u = o.usable || v;
    const w = Math.max(FIELD_MIN_W, Math.min(FIELD_W, u.width - FIELD_M * 2, v.width - FIELD_M * 2));
    const h = o.height > 0 ? o.height : FIELD_H_GUESS;
    const at = anchor || { x: v.left + v.width / 2, y: v.top + v.height / 2 };
    let x = o.hand === 'left' ? at.x - 14 - w : at.x + 14;
    let y = at.y - 22;
    // Off a panel that is neither a wall nor a sheet but a card in the way:
    // slide past it when there is room, never when that would push the field
    // off the screen (which is what an unconditional nudge did on a phone).
    const p = o.panel;
    if (p && o.hand !== 'left' && x < p.right + FIELD_M && x + w > p.left && y < p.bottom && y + h > p.top
        && p.right + FIELD_M + w <= u.right - FIELD_M) x = p.right + FIELD_M;
    x = fitSpan(x, w, { lo: u.left + FIELD_M, hi: u.right - FIELD_M }, { lo: v.left + FIELD_M, hi: v.right - FIELD_M });
    y = fitSpan(y, h, { lo: u.top + FIELD_M, hi: u.bottom - FIELD_M }, { lo: v.top + FIELD_TOP, hi: v.bottom - FIELD_M });
    return { x: x, y: y, w: w };
  }

  /** The panel's rect while it stands, else null — a hidden panel is in nobody's way. */
  function panelRect() {
    if (document.body.classList.contains('panelHidden') || inspectorEl.hidden) return null;
    const r = inspectorEl.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? r : null;
  }

  const FIELD_LIST_MIN = 64; // the pills' list is never held shorter than about two rows

  /**
   * The pills scroll rather than fall under a keyboard (V1-PLAN R6). When the
   * field is taller than the room the visible viewport leaves it — an on-screen
   * keyboard takes half an iPad's height and the layout viewport does not
   * change, only the visual one — its list of pills is held to what fits and
   * scrolls, and the input, its reading line and the four core buttons stay in
   * view. The room is the box `fieldBox` will place the field in. Measured from
   * the list's own scroll height, so a list already scrolled keeps its place;
   * when the field fits, nothing is set and the stylesheet's rule stands.
   */
  function fitFieldHeight(v, u) {
    const list = summonEl.querySelector('.list');
    if (!list) return;
    const room = Math.max(u.height - FIELD_M * 2, v.height - FIELD_TOP - FIELD_M);
    const natural = summonEl.offsetHeight - list.offsetHeight + list.scrollHeight;
    if (natural <= room) {
      if (list.classList.contains('held')) { list.classList.remove('held'); list.style.maxHeight = ''; }
      return;
    }
    const cap = Math.max(FIELD_LIST_MIN, Math.floor(list.scrollHeight - (natural - room))) + 'px';
    if (list.style.maxHeight !== cap) list.style.maxHeight = cap;
    list.classList.add('held');
  }

  /** Place the field where it stands now. Touches left/top/width, and the list's height when it must scroll — NOTHING else. */
  function placeField() {
    const v = viewportRect(), u = usableViewport();
    // Width first: the height below is whatever the content comes to at that
    // width, measured rather than assumed.
    const first = fieldBox(fieldAnchor, { viewport: v, usable: u, height: 0, hand: hand, panel: panelRect() });
    summonEl.style.width = first.w + 'px';
    fitFieldHeight(v, u);
    const box = fieldBox(fieldAnchor, { viewport: v, usable: u, height: summonEl.offsetHeight, hand: hand, panel: panelRect() });
    summonEl.style.left = box.x + 'px';
    summonEl.style.top = box.y + 'px';
    summonEl.style.width = box.w + 'px';
    return box;
  }

  /** A layout change: re-place the open field, keeping every character and the caret. */
  function replaceOpenField() {
    if (!summonEl.classList.contains('field') || summonEl.style.display === 'none') return;
    placeField();
  }

  function renderSummon(s) {
    document.body.classList.toggle('summoning', !!s.summon);
    if (!s.summon) { summonEl.style.display = 'none'; summonEl.className = ''; shownSummonId = null; fieldAnchor = null; return; }
    const sum = s.summon;
    // The same field, rendered again: its content already stands and rebuilding
    // it would throw away the caret — but the space it stands in may have
    // changed since, so geometry is re-run and content is not (UI-1).
    if (shownSummonId === sum.id) { placeField(); return; }
    shownSummonId = sum.id;
    fieldAnchor = lastPen ? { x: lastPen.x, y: lastPen.y } : null;
    paletteItems = rankItems(conversionsFor(s));
    paletteIndex = -1;
    paletteNavigated = false;
    summonEl.className = 'field' + (hand === 'left' ? ' left' : '');
    summonEl.style.display = 'block';
    summonEl.innerHTML = '';
    placeField();

    const top = document.createElement('div');
    top.className = 'fieldTop';
    const filter = document.createElement('input');
    filter.className = 'filter';
    filter.setAttribute('autocomplete', 'off');
    filter.setAttribute('spellcheck', 'false');
    const onArt = sum.onArtifact ? (MM.wordOf(s.nodes.get(sum.onArtifact.artifactId)) || 'artifact') : null;
    filter.placeholder = onArt ? 'on ' + onArt + ' — type what to change…' : sum.enclosedIds.length + ' mark' + (sum.enclosedIds.length === 1 ? '' : 's') + ' — a verb, a name, or what to make…';
    filter.onkeydown = onPaletteKey;
    filter.oninput = () => { paletteNavigated = false; paletteIndex = -1; paintField(filter.value); };
    top.appendChild(filter);
    const reading = document.createElement('div');
    reading.className = 'reading';
    top.appendChild(reading);
    summonEl.appendChild(top);
    // The body, as the sketch has it: the round buttons at the left, the
    // pills stacked to their right — what this is, then what it affords.
    const body = document.createElement('div');
    body.className = 'fieldBody';
    const core = document.createElement('div');
    core.className = 'row core';
    body.appendChild(core);
    const list = document.createElement('div');
    list.className = 'list';
    for (const cls of ['certain', 'afford items']) {
      const row = document.createElement('div');
      row.className = 'row ' + cls;
      list.appendChild(row);
    }
    body.appendChild(list);
    summonEl.appendChild(body);
    paintField('');
    // A keyboard that pops up on every selection covers the pills on a phone;
    // a finger taps the input when it wants to type. A pointer gets the focus.
    // Which hand opened it is read from its pointerType, never the user agent
    // (V1-PLAN R6): a field a finger opened waits for the finger, whatever the
    // screen says of itself; a pen's waits where the screen is a touch screen.
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (!coarse && handOfPointer(downType) !== 'finger') setTimeout(() => filter.focus(), 0);
  }

  /** Recompute the offers for the open summon and repaint, keeping what was typed. */
  function refreshPalette() {
    const s = session.getState();
    if (!s.summon || shownSummonId !== s.summon.id) return;
    const filter = fieldInput();
    if (!filter) return;
    paletteItems = rankItems(conversionsFor(s));
    paintField(filter.value);
  }

  /** The pills the typed text leaves visible, in display order: what this is, then what it affords. */
  function visibleItems(query) {
    const q = query.trim().toLowerCase();
    const s = session.getState();
    const sum = s.summon;
    const certain = paletteItems.filter((i) => i.certain).sort((a, b) => b.groupConf - a.groupConf);
    const afford = paletteItems.filter((i) => !i.certain && i.group !== 'hidden');
    const hit = (i) => !q || (i.label + ' ' + (i.verbs || []).join(' ') + ' ' + i.group).toLowerCase().includes(q);
    let shown = certain.filter(hit).concat(afford.filter(hit));
    // Typing the name of something the library holds completes to it: Enter
    // reuses the entry on this loop, and no model is asked.
    if (sum && q.length >= 2 && !sum.onArtifact) {
      for (const e of libraryEntries(s)) {
        const name = e.name.toLowerCase();
        if (name.startsWith(q) || name.includes(q) || q.includes(name)) {
          shown.unshift({ key: 'lib:' + e.id, certain: true, group: 'known', groupConf: 1, groupWhy: 'in the library', label: e.name + ' · library', why: 'from the library — the same program, here; no model asked', tier: 0, run: () => applyLibrary(sum, e) });
        }
      }
    }
    // What is typed completes (V1-PLAN B1), from the tools that complete it, each
    // where the field puts it: words a definition can be told first (the verb table
    // read them), the model last (for what the table could not), and a word typed at
    // marks two ways at the head of what it affords — Name it, one thing, a
    // definition; Label it, the word on your own ink, nothing made (V1-PLAN L2e).
    // `typedWord` (pure, 09-field.js) decides whether there is a word at all. An offer
    // already standing for the same word — a reading that takes it as the name, a
    // label from the writing — is not repeated.
    if (sum) {
      const tw = typedWord(fieldContext(query, s, paletteItems.concat(coreItems(s))));
      if (!paletteScope || paletteScope.summon.id !== sum.id) paletteScope = fieldScope(s, '', null);
      const typed = Object.assign({}, paletteScope, { text: query.trim(), word: tw ? tw.word : null });
      const head = [];
      for (const it of MM.completionsFor(typed).map(offerItem)) {
        if (it.offer.place === 'first') { shown = shown.filter((i) => i.key !== it.key); shown.unshift(it); }
        else if (it.offer.place === 'last') shown.push(it);
        else head.push(it);
      }
      const pair = head.filter((p) => !shown.some((i) => i.label === p.label || (typeof p.name === 'string' && i.certain && typeof i.name === 'string' && i.name.toLowerCase() === p.name.toLowerCase())));
      const at = shown.findIndex((i) => !i.certain);
      shown.splice(at < 0 ? shown.length : at, 0, ...pair);
    }
    return shown;
  }

  function pillFor(item, i, selected) {
    const b = ui.pill(item.label, { cls: (item.certain ? 'certain ' : '') + 'item', why: item.why + (item.groupWhy ? ' — ' + item.groupWhy : ''), model: item.tier === 2, onclick: () => { noteUse(item); item.run(); } });
    b.setAttribute('aria-selected', String(selected));
    b.dataset.index = String(i);
    b.dataset.key = item.key; // what the reader and learned use call it: for tests, and for B2's context
    return b;
  }

  function paintField(query) {
    const s = session.getState();
    if (!s.summon) return;
    const core = summonEl.querySelector('.row.core');
    const certainRow = summonEl.querySelector('.row.certain');
    const affordRow = summonEl.querySelector('.row.afford');
    const readingEl = summonEl.querySelector('.reading');
    if (!core || !certainRow || !affordRow) return;
    // The core: the same four round buttons, in the same slots. The name is
    // the tooltip and the reading line while the pointer rests on one.
    core.innerHTML = '';
    for (const c of coreItems(s)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pill core';
      b.dataset.verb = c.key;
      b.setAttribute('aria-label', c.label);
      b.title = c.why;
      b.innerHTML = GLYPH[c.key] || '<span class="g">' + esc(c.label) + '</span>';
      if (c.disabled) b.disabled = true;
      b.onclick = () => { noteUse(c); c.run(); };
      b.onmouseenter = () => { if (readingEl && !query.trim()) readingEl.textContent = '↵ ' + c.label + (c.disabled ? ' — ' + c.why.split(' — ')[1] : ''); };
      b.onmouseleave = () => { if (readingEl && !query.trim()) readingEl.textContent = readField(query).line || ''; };
      core.appendChild(b);
    }
    // What this is, and what it affords.
    const shown = visibleItems(query);
    const r = readField(query);
    const selectedKey = paletteNavigated && shown[paletteIndex] ? shown[paletteIndex].key : (r.item ? r.item.key : null);
    certainRow.innerHTML = '';
    affordRow.innerHTML = '';
    // The line under the field says what Enter will do — or, for a pill that carries its
    // own line (Name it, Label it: one word, two acts), what THAT pill will do while it is
    // pointed at or chosen by the arrows. The difference said where the hand is looking.
    const chosen = paletteNavigated && shown[paletteIndex] && shown[paletteIndex].line ? shown[paletteIndex] : null;
    const sayLine = (line, quiet) => { if (readingEl) { readingEl.textContent = line || ''; readingEl.classList.toggle('quiet', !!quiet); } };
    const standingLine = () => (chosen ? sayLine(chosen.line, false) : sayLine(r.line, r.quiet));
    let i = 0, shownAfford = 0;
    for (const item of shown) {
      const pill = pillFor(item, i, item.key === selectedKey);
      if (item.line) { pill.onmouseenter = () => sayLine(item.line, false); pill.onmouseleave = standingLine; }
      if (item.certain) certainRow.appendChild(pill);
      else if (shownAfford < MAX_AFFORD || query.trim()) { affordRow.appendChild(pill); shownAfford++; }
      i++;
    }
    const hidden = shown.filter((x) => !x.certain).length - shownAfford;
    if (hidden > 0) { const more = document.createElement('span'); more.className = 'more'; more.textContent = '+' + hidden + ' more — type to find'; affordRow.appendChild(more); }
    standingLine();
    keepFieldOnScreen();
  }

  /**
   * The pills just rewrapped and the field grew: re-place it only if its foot
   * has gone off the bottom. Re-placing on every keystroke would walk the
   * field up the screen under the hand.
   */
  function keepFieldOnScreen() {
    if (!summonEl.classList.contains('field')) return;
    const v = viewportRect();
    // The pills' list held to the room a keyboard leaves, or let go once they fit again (R6).
    fitFieldHeight(v, usableViewport());
    const r = summonEl.getBoundingClientRect();
    if (r.bottom <= v.bottom - 2 && r.right <= v.right - 2 && r.top >= v.top - 2 && r.left >= v.left - 2) return;
    placeField();
  }

  function onPaletteKey(e) {
    e.stopPropagation();
    const q = e.target.value;
    const shown = visibleItems(q);
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); paletteNavigated = true; paletteIndex = Math.min(shown.length - 1, paletteIndex + 1); paintField(q); return; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); paletteNavigated = true; paletteIndex = Math.max(0, paletteIndex - 1); paintField(q); return; }
    if (e.key === 'Escape') { e.preventDefault(); session.dismiss(shownSummonId, Date.now()); return; }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    // The arrows chose a pill: Enter takes it. Otherwise Enter does what the
    // reading line said it would.
    const chosen = paletteNavigated ? shown[paletteIndex] : null;
    if (chosen) { noteUse(chosen); chosen.run(); return; }
    const r = readField(q);
    if (!r.run) return;
    if (r.kind === 'brief' || r.kind === 'ask' || r.kind === 'draw') {
      e.target.disabled = true;
      e.target.placeholder = r.line.replace(/^↵\s*/, '') + '…';
    }
    r.run();
  }

  /**
   * Which regions this summon addresses. The engine's geometric answer, merged
   * with what the artifact's own DOM reports under the ink — two independent
   * reads of the same question, and the union is what the model is told.
   */
  function addressedRegions(sum) {
    if (!sum.onArtifact) return [];
    const lasso = state.nodes.get(sum.gestureIds[0]);
    const b = lasso && MM.boundsOf(lasso);
    const fromDom = b ? regionsUnderInk(sum.onArtifact.artifactId, b) : [];
    return [...new Set((sum.onArtifact.regionIds || []).concat(fromDom))];
  }

  // ===== The library ==========================================================
  /** The library: every artifact holding a program, by name. */
  function libraryEntries(s) {
    const out = [];
    for (const id of s.artifacts) {
      const n = s.nodes.get(id);
      const rep = n && codeRepOf(n);
      if (!rep || rep.data.kind !== 'run' || n.reps.some((r) => r.modality === 'erased')) continue;
      out.push({ id: id, name: MM.wordOf(n) || id, code: rep.data.code });
    }
    return out;
  }

  /** An entry's program on a new artifact: reused, not rewritten, and running because the human asked. */
  function reuseEntry(artifactId, entry) {
    const at = Date.now();
    if (entry.code.startsWith(MM.GRAPH3D_MARK)) {
      // A structure the engine built from one drawing is rebuilt from this one: the atoms are these marks, not those.
      const built = MM.buildGraph3D(session, artifactId);
      if (!built.ok) { say('could not stand it in 3D: ' + built.error); return; }
      session.attachCode({ participantId: built.participantId, nodeId: artifactId, kind: 'run', code: built.code, prompt: 'show it in 3D', from: entry.id, at: at });
      session.clock({ nodeId: artifactId, op: 'play', at: at + 1 });
      say('in 3D again, from this drawing (tier 1) — ' + built.reasoning);
      return;
    }
    session.attachCode({ participantId: MM.LOCAL_PARTICIPANT, nodeId: artifactId, kind: 'run', code: entry.code, prompt: 'reused from ' + entry.name, from: entry.id, at: at });
    session.clock({ nodeId: artifactId, op: 'play', at: at + 1 });
    say('reused ' + entry.name + ' from the library — nothing was written');
  }

  /** The loop becomes an artifact carrying an entry's program. */
  function applyLibrary(sum, entry) {
    const at = Date.now();
    const id = session.bless({ summonId: sum.id, name: entry.name, at: at });
    if (id) reuseEntry(id, entry);
    return id;
  }

  /** What a brief asks for: a page (a layout of regions) or a program (anything else), unless it says. */
  function targetOf(sum, prompt) {
    const m = /^(page|run|program|new)\s*:\s*/i.exec(prompt);
    const brief = m ? prompt.slice(m[0].length).trim() : prompt;
    if (m) return { target: m[1].toLowerCase() === 'page' ? 'page' : 'program', brief: brief, fresh: m[1].toLowerCase() === 'new' };
    const s = session.getState();
    const marks = sum.enclosedIds.filter((id) => s.contentIds.includes(id));
    const reading = marks.length ? session.read(marks) : null;
    const boxes = marks.filter((id) => { const n = s.nodes.get(id); return n && MM.topInterpretation(n) === 'rectangle'; }).length;
    // A drawing the diagram rung compiles — boxes tiling a space, nodes joined
    // by edges, or both — is a page or a diagram. Anything else (one shape,
    // nested circles, a figure) is a program that renders itself.
    const genre = reading ? reading.genre.genre : 'empty';
    const page = (genre === 'graph' || genre === 'mixed') || (genre === 'layout' && boxes >= 2);
    return { target: page ? 'page' : 'program', brief: brief, fresh: false };
  }

  /**
   * Writing, taken: the group becomes a text artifact where the writing is —
   * the words fitted to the ink's width, the ink held underneath (flip to see
   * it), editable — and never a definition (v10 F8). The selection ends with
   * the act, so the next stroke draws.
   */
  function writingToText(sum, text) {
    const at = Date.now();
    const id = session.bless({ summonId: sum.id, name: text, at: at });
    if (!id) { say('could not hold the writing'); return null; }
    session.attachCode({ participantId: MM.LOCAL_PARTICIPANT, nodeId: id, kind: 'text', code: text, from: 'writing', at: at + 1 });
    session.deselect(at + 2);
    say('“' + text + '” — text now, the writing underneath; flip it to see the ink, double-click it to edit');
    return id;
  }

  /** A brief that failed leaves no artifact named after it: the bless is undone when nothing has happened since. */
  function dropFailedBless(artifactId) {
    const evs = session.getEvents();
    const last = evs[evs.length - 1];
    const s = session.getState();
    if (last && last.type === 'bless' && s.artifacts[s.artifacts.length - 1] === artifactId) { session.undo(); releasePrompted(); return true; }
    return false;
  }

  // ===== The prompts: what a model is asked, and only when asked =============

  /**
   * One Enter, one act (V1-PLAN L2d; week 1's U5). A brief is a deliberate act
   * on ONE summon, and a summon is acted on once: a second Enter on a loop
   * already building blessed a second artifact — or, on a revision, where there
   * is no bless to fail at, asked every model again: two builds in flight for
   * one drawing, the later refused as superseded when it landed, minutes after
   * the hand had stopped watching. Disabling the input covers the key, not the
   * act: the reading's `run` is a closure over the summon, and a pill, a touch
   * or a second key still holds it after the first act consumed the summon. So
   * the guard is here, at the door every brief comes through — the adapter,
   * not the reader (`09-field.js` decides what Enter will do; it is not asked
   * whether it already did). `runProgram` and the library are reached only
   * through `runPrompt`, so they need no door of their own.
   *
   * It holds ONE key, so it cannot grow, and the key is not the summon's id
   * alone: an id from a log with no name is a counter derived on replay, so a
   * fresh board can hand out one this memory still holds (the `pruneRuntime`
   * rule in `08-render.js`). The summon's own time and the marks it holds go
   * into the key, so a later summon that reuses an id is a different act.
   *
   * It is released when the act is given up on — a bless that failed, a brief
   * whose model failed and whose bless was undone — not on the next render:
   * the revising path dismisses its summon and renders at once, and clearing
   * there would open the door again in the same tick.
   */
  let promptedKey = null;

  function summonKey(sum) { return sum.id + '@' + sum.at + '#' + sum.enclosedIds.join(','); }

  /** True when this summon has already been acted on — and says so. */
  function alreadyUnderWay(sum) {
    const key = summonKey(sum);
    if (promptedKey === key) { say('that brief is already under way — one Enter, one act'); return true; }
    promptedKey = key;
    return false;
  }

  /** The act was given up on: the same summon may be tried again. */
  function releasePrompted() { promptedKey = null; }

  function runPrompt(sum, prompt, revising) {
    if (alreadyUnderWay(sum)) return;
    const at = Date.now();
    let artifactId, addressed;

    // A brief the library already answers is not sent anywhere: the entry is
    // reused. The model is asked only for what nothing here does (the
    // conservation John asked for — the library grows, the bloat does not).
    const want = revising ? null : targetOf(sum, prompt);
    if (want && want.target === 'program') {
      const entry = want.fresh ? null : libraryMatch(want.brief, libraryEntries(session.getState()));
      if (entry) { applyLibrary(sum, entry); return; }
      runProgram(sum, want.brief);
      return;
    }
    const brief = want ? want.brief : prompt;

    if (revising) {
      artifactId = sum.onArtifact.artifactId;
      addressed = addressedRegions(sum);
      session.dismiss(sum.id, at); // the addressing mark has done its work
    } else {
      // Blessing first gives the code somewhere to live, and gives the region
      // frame its origin. The name is the brief, so the artifact says what it
      // was asked to be.
      const name = brief.length > 30 ? brief.slice(0, 30) + '…' : brief;
      artifactId = session.bless({ summonId: sum.id, name: name, at: at });
      addressed = undefined;
      if (!artifactId) { releasePrompted(); say('could not hold that group'); return; }
      // Tier 1 first: the structure stands at once, in the engine's name —
      // every region in place, no words. It is what the canvas knows. A model
      // then writes the words into it; with none joined, this is the page.
      // (The structure tool's act, `MM.standStructure`: stamped with its id.)
      const structure = MM.standStructure(session, artifactId, brief, at + 1);
      if (structure.ok) {
        if (!agents.length) { say('the structure (tier 1): ' + structure.ids.join(', ') + ' — join a model for the words'); return; }
      } else if (!agents.length) { say('could not build the structure: ' + structure.error); return; }
    }

    // What the human typed outranks a reading nobody asked for.
    cancelReading();
    const aboutIds = session.getState().nodes.get(artifactId) ? [artifactId] : sum.enclosedIds;
    agents.forEach((agent) => {
      const key = 'build:' + agent.id + ':' + artifactId;
      withWork(key, aboutIds, agent.name + (revising ? ' · changing “' : ' · building “') + brief.slice(0, 32) + (brief.length > 32 ? '…' : '') + '”',
        agent.generate({ prompt: brief, artifactId: artifactId, at: Date.now(), addressed: addressed, signal: workSignal(key) }))
        .then((res) => {
          if (res.ok) {
            const short = res.unfilled && res.unfilled.length ? ' — left ' + res.unfilled.join(', ') + ' empty' : '';
            say(agent.name + ' ' + (res.revised ? 'changed' : 'built') + ' ' + (res.revised ? (res.changed || res.filled) : res.filled).join(', ') + short);
          } else {
            say(agent.name + ' could not build (' + res.error + ') — the drawing is untouched');
            // A model that answered unusably is a thing you need to SEE to fix.
            if (res.raw) window.__mm.lastRaw = res.raw;
          }
          render(session.getState());
        });
    });
  }

  /** A program from a brief: the loop is blessed, every model is asked with the library in its brief, and what comes back runs. */
  function runProgram(sum, brief) {
    const at = Date.now();
    const name = brief.length > 30 ? brief.slice(0, 30) + '…' : brief;
    const artifactId = session.bless({ summonId: sum.id, name: name, at: at });
    if (!artifactId) { releasePrompted(); say('could not hold that group'); return; }
    cancelReading();
    const library = libraryEntries(session.getState()).map((e) => ({ id: e.id, name: e.name }));
    agents.forEach((agent) => {
      const key = 'program:' + agent.id + ':' + artifactId;
      withWork(key, [artifactId], agent.name + ' · writing “' + brief.slice(0, 32) + (brief.length > 32 ? '…' : '') + '”',
        agent.program({ prompt: brief, artifactId: artifactId, library: library, at: Date.now(), signal: workSignal(key) }))
        .then((res) => {
          if (res.ok && res.reuse) {
            const entry = libraryEntries(session.getState()).find((e) => e.name.toLowerCase() === res.reuse.toLowerCase());
            if (entry) { reuseEntry(artifactId, entry); say(agent.name + ' pointed at ' + entry.name + ' in the library — reused'); }
            else say(agent.name + ' pointed at “' + res.reuse + '”, which the library does not hold');
          } else if (res.ok) {
            // The human asked for it: it runs on arrival. A program that
            // arrived any other way waits for play (I9).
            session.clock({ nodeId: artifactId, op: 'play', at: Date.now() });
            say(agent.name + ' wrote ' + (res.name || 'a program') + (res.parts && res.parts.length ? ' — parts: ' + res.parts.join(', ') : ''));
          } else {
            const dropped = dropFailedBless(artifactId);
            say(agent.name + ' could not write it (' + res.error + ')' + (dropped ? ' — nothing was made; the drawing is as it was' : ' — the drawing is untouched'));
            if (res.raw) window.__mm.lastRaw = res.raw;
          }
          render(session.getState());
        });
    });
  }

  /** `draw: …` — the model holds a pen: marks in the shape rung's vocabulary, in its own name, beside these. */
  function runDraw(sum, q) {
    const ids = sum.enclosedIds.slice();
    session.dismiss(sum.id, Date.now());
    cancelReading();
    agents.forEach((agent) => {
      withWork('draw:' + agent.id, ids, agent.name + ' · drawing', agent.draw({ prompt: q, nodeIds: ids, at: Date.now() })).then((res) => {
        if (res.ok) say(agent.name + ' drew ' + res.ids.length + ' mark' + (res.ids.length === 1 ? '' : 's') + ': ' + res.shapes.map((x) => x.shape).join(', '));
        else { say(agent.name + ' drew nothing (' + res.error + ')'); if (res.raw) window.__mm.lastRaw = res.raw; }
        render(session.getState());
      });
    });
  }

  /** `ask: …` — a question about these, answered into the canvas beside them. */
  function runAsk(sum, q) {
    const ids = sum.enclosedIds.slice();
    cancelReading();
    agents.forEach((agent) => {
      withWork('ask:' + agent.id, ids, agent.name + ' · answering', agent.ask(q, ids, Date.now())).then((res) => {
        if (!res.ok) say(agent.name + ' could not answer (' + res.error + ')');
        render(session.getState());
      });
    });
  }

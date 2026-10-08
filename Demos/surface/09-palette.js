// ===== palette =====
// Provides: the field — one text input at the pen tip, its geometry (fieldBox/placeField), and the
//   ADAPTER around the reader (fieldContext → readFieldCommand → runFieldCommand, exposed as readField);
//   the ADAPTER around core's tools (V1-PLAN B1): conversionsFor — what this is (readings, read here) and
//   what it affords (MM.offersFor over the scope fieldScope gathers, toolHost the surface's facts), ranked
//   by MM.rank (V1-PLAN §2.2, B2) with this device's uses, globally and per kind of context (usesHere), in
//   the context beside the marks (contextFor, paletteContext — kept by the log) and held steady per
//   context (steadyTops, runtime; afforded says what the top is among); takeOffer — the tool's act
//   (stamped with its id) and what only the surface can do for it (HOST_ACTS, TOOL_ACTS); the core
//   verbs (name, copy, paste, erase;
//   copyMarks/pasteClip/duplicateMarks, the clip); the label act's words (labelMarks, labelSentence); the
//   prompts (runPrompt → a page or a program, runAsk, runDraw); the library (libraryEntries/reuseEntry/
//   applyLibrary, targetOf); renderSummon/refreshPalette/paintField.
// Uses: core (hand, lastPen), ui, field (readFieldCommand, verbFor, libraryMatch, typedWord — pure,
//   09-field.js), view (usableViewport, viewportRect), models (agents, withWork, cancelReading,
//   askModelsAbout, offerModel), seatpane (writers, readers, deciderHost, askDecider — who is asked, by seat), snap (snapMode), render (nameOfParticipant, logKey, paintReference),
//   artifacts (flipped), frames, packs (packShort, packSaid — how a match says its pack),
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
      // `sees`: who READS, by seat (I7) — a model that sees but sits elsewhere does not answer a read; `decider`: the decision model seated, if one is (*Which is it?*).
      models: agents.map((a) => ({ name: a.name, sees: readers().includes(a) })),
      decider: deciderHost(),
      // The semantic seat held here, if one is (I9; 03-semantic.js): with it *Notes like this* is typed on marks that have words; without, the field offers what it always did.
      semantic: semanticHost(),
      isRead: (id) => { const n = session.getState().nodes.get(id); return !!n && isRead(n); },
      // The board's lines of writing and how many are unread (I8): *Read the board* stands only where there is some.
      writing: () => boardWriting(),
      isFlipped: (id) => flipped.has(id),
      // Whether the run keyed by this mark runs in THIS sitting: a play already in the log when the board opened is an earlier one's (M23, 14-run.js).
      running: (key) => aliveIsRunning(key),
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
      // Its verbs, and the words a person says for its act (core's intent table, PLAN-FIELD-PAR FP1): *tidy*, *line up* and *connect* find Tidy the diagram.
      key: o.key, label: o.label, why: o.reason, verbs: (o.verbs || []).concat(MM.intentWordsFor(o.key).filter((w) => !(o.verbs || []).includes(w))), tier: o.asks === 'model' ? 2 : 1,
      group: o.hidden ? 'hidden' : o.grounds ? o.grounds.on : 'always',
      groupConf: o.grounds ? o.grounds.confidence : 0, groupWhy: o.grounds ? o.grounds.why : '',
      base: o.base, grounds: o.grounds, asks: o.asks, tool: o.tool, offer: o,
      run: () => takeOffer(o),
    };
    if (o.lead) item.certain = true;
    // An act Enter may take with nothing typed (U1e): what the row shows — never a typed-only offer.
    if (!o.hidden) item.act = true;
    if (o.name !== undefined) item.name = o.name;
    if (o.line !== undefined) item.line = o.line;
    if (o.note !== undefined) item.note = o.note;
    return item;
  }

  // ===== What the marks are as a diagram: the notations' readings (V1-PLAN §3 Reading, N1) =====
  // Each notation that reads the held marks above its floor — a flowchart, a class diagram, a sequence
  // diagram, a state diagram, an ER diagram, a mind map — plural and ranked, read ONCE while the log stands
  // (R4c: `logKey`, so an undo leaves no stale reading) and shared by the field's row and the panel. A
  // reading is what the marks ARE, never a name for a definition: Enter does not take it (09-field.js), and
  // a tap on the one Mermaid can be written from is Make it Mermaid, in that notation.
  let notationKept = { key: null, read: null };
  let notationReadCount = 0; // reads that were not the kept one, for a test
  function notationsHeld(marks) {
    const key = logKey() + '|' + marks.join(',');
    if (!paintReference && notationKept.key === key) return notationKept.read;
    const st = session.getState();
    // A drawing is two marks or more and no artifact: a page or a text is not read as one (the Mermaid tool's own rule).
    const noDrawing = marks.length < 2 || marks.some((id) => st.artifacts.includes(id));
    if (!noDrawing) notationReadCount++;
    const read = noDrawing ? [] : MM.notationsOf(st, marks).filter((r) => r.confidence >= MM.NOTATION_FLOOR);
    if (!paintReference) notationKept = { key: key, read: read };
    return read;
  }

  /** A notation's reading as a row of the field: its short name and number, the sentence its tooltip, a tap that writes its Mermaid where it can and otherwise says it. */
  function notationItem(r, offers) {
    const w = notationWords(MM.describeNotation(r));
    const mer = offers.find((i) => i.key === 'mermaid');
    const writes = !!mer && !!mer.offer.data && mer.offer.data.notation === r.notation;
    return readingItem({
      key: 'notation:' + r.notation, notation: r.notation,
      grounds: { on: 'notation', confidence: r.confidence, why: r.reason },
      label: w.label,
      why: w.label + (w.said ? ' — ' + w.said : '') + ' — ' + (writes ? 'tap to write it as Mermaid text beside it; the drawing stays' : 'tap to say it in the status line'),
      run: () => { if (writes) takeOffer(mer.offer); else say(w.label + (w.said ? ' — ' + w.said : '')); },
    });
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
      // A library pack's definition says its pack (V1-PLAN §2.3, B3): known because this board uses it, not because you named it.
      const from = sug.pack ? packSaid(sug.pack) : null;
      known.push(readingItem({
        key: 'sug:' + sug.id, grounds: { on: 'known', confidence: sug.score || 1, why: from ? 'from ' + from + ', which this board uses' : 'you named this shape before' },
        label: sug.label + ' ' + (sug.score || 1).toFixed(2) + (sug.pack ? ' · ' + packShort(sug.pack) : ''), name: sug.label,
        why: (sug.reasoning || 'like the one you named') + (from ? ' — from ' + from : '') + ' — take it as another ' + sug.label,
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
        act: allWriting, // text where it is is an act; a name is a tap (U1e)
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
          act: allWriting && !r.targets.length,
          run: () => { if (allWriting && !r.targets.length) writingToText(sum, t.text); else session.bless({ summonId: sum.id, name: t.text, at: Date.now() }); },
        }));
      }
    }
    // What another voice read this group as — a model, or a hand such as Claude's (a tier 0 voice too, so it is told by its author, not its tier: F1) — held, attributed, and an offer to name it.
    {
      const seen = new Set();
      const heard = [];
      for (const id of sum.enclosedIds) {
        const n = s.nodes.get(id);
        if (!n) continue;
        for (const r of MM.interpretationsOf(n, s.nodes)) {
          if (!MM.isHeardReading(r)) continue;
          const key = r.label.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          heard.push(r);
        }
      }
      // In words, by a name in words (J5): "state transformation 0.82 · GLM 5.3 Flash" — taking it names the thing by its label.
      heard.sort((a, b) => b.weight - a.weight).slice(0, 3).forEach((r) => {
        const who = modelWords(r.sourceName);
        proposed.push(readingItem({
          key: 'proposed:' + r.label, grounds: { on: 'proposed', confidence: r.weight, why: 'read this way by ' + who },
          label: readingWords(r.label) + ' ' + r.weight.toFixed(2) + ' · ' + who, name: r.label,
          why: who + (r.reasoning ? ' — ' + r.reasoning.slice(0, 80) : '') + ' — take it as the name',
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
    // What the marks are as a diagram: each notation above the floor, ranked with the rest of the readings (N1).
    const notated = notationsHeld(marks).map((r) => notationItem(r, offers));
    // An act as particular to these marks as a reading (Fold “…” into the text)
    // stands with the readings, where it always stood: after the line it takes.
    const lead = offers.filter((i) => i.certain);
    // Writing reads when it is writing (PLAN-USER-SURFACE W2): held writing that nobody has
    // read is ONE option — its reading, taken by reading it (the read tool's own act, so a
    // model that sees, Claude's seat, or the ask kept for one), never by naming it "writing".
    // Read the writing and What is this? stay typeable and leave the row. Once the words land
    // the reading names again, and the words lead, as they always did.
    const readOffer = allWriting ? offers.find((i) => (i.key === 'read' || i.key === 'read-lines') && i.group !== 'hidden') : null;
    if (readOffer) {
      const at = conceived.findIndex((i) => i.key === 'concept:writing');
      const concept = at >= 0 ? conceived[at] : null;
      const conf = concept ? concept.groupConf : writingConfidence(s, marks);
      const need = needFor('read');
      const reads = readingItem({
        key: concept ? concept.key : 'writing', grounds: { on: 'concept', confidence: conf, why: concept ? concept.groupWhy : 'writing, unread' },
        label: 'writing' + (conf ? ' ' + conf.toFixed(2) : ''), name: 'writing',
        why: readOffer.why + ' — read it',
        tier: 2, asks: 'model', tool: 'read', verbs: ['writing'], act: true,
        enter: (readOffer.key === 'read-lines' ? 'read these' : 'read it') + (need ? ' — ' + need + ': it is kept, and runs when one joins' : ''),
        run: () => readOffer.run(),
      });
      if (concept) conceived.splice(at, 1, reads); else conceived.unshift(reads);
      for (const i of offers) if (i.key === 'read' || i.key === 'read-lines' || i.key === 'what') i.group = 'hidden';
    }
    const items = known.concat(lined, lead, worded, proposed, notated, conceived, offers.filter((i) => !i.certain));
    // A pill that asks a model none here can answer says what it needs, inline, while it is pointed at (J5).
    for (const it of items) {
      if (it.asks !== 'model' || it.line) continue;
      const need = needFor(it.tool);
      if (need) it.line = '↵ ' + it.label + ' — ' + need + ': it is kept, and runs when one joins';
    }
    return items;
  }

  /** How surely held marks read as writing, when no concept says: the shape rung's `text` reading, the least sure of them. */
  function writingConfidence(s, ids) {
    let least = null;
    for (const id of ids) {
      const n = s.nodes.get(id);
      const r = n && MM.interpretationsOf(n, s.nodes).find((x) => MM.isShapeRungReading(x) && x.label === 'text');
      if (!r) return 0;
      least = least === null ? r.weight : Math.min(least, r.weight);
    }
    return least || 0;
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
      // No model that can see: which joined ones cannot and why, said once, the read kept for one that can (J5) — no pane.
      if (!readers().length) { keepRead(d); return; }
      let any = false;
      if (d.line.length) any = readLine(d.line, true) || any;
      d.single.forEach((id) => { any = readOne(s.nodes.get(id), true) || any; });
      if (!any) say('nothing there to read — the marks held have no ink an image can be made of');
    },
    // Reading my notes (I8, 06-handwriting.js): every line of the marks held, or of the board, in one batch; a picture's text beside it.
    'read-lines': (o) => { readLines(o.data.ids.slice(), { force: !!o.data.force }); },
    'read-board': (o) => { readLines(boardWritingIds(), { force: !!o.data.force }); },
    'read-picture': (o) => { readPictureFrom(o.data.artifact, o.data.asset, o.data.name); },
    what: (o) => askModelsAbout(o.data.ids.slice()),
    // *Which is it?* asks the decider — only by this tap (I7; 04-seatpane.js), never on a hold.
    which: (o) => askDecider(o.data),
    // *Notes like this* lists the notes nearest these marks' words across every board — in Find's pane, only by this tap (I9; 26-find.js).
    like: (o) => { likeNotes(o.data); },
    // The maths tool's acts (M5): the sizes said and left showing beside their figure, the drawing printed at its real size.
    'maths-show': (o) => mathsShow(o.data),
    'maths-print': () => mathsPrint(),
    duplicate: (o, scope) => duplicateMarks(scope.summon, o.data.ids),
    // A Mermaid text drawn as ink, at this zoom and beside everything (25-mermaid.js).
    'mermaid-draw': (o) => drawMermaidFrom(o.data.artifact),
    // A held picture traced into ink over itself (18-images.js): its pixels are read again from the asset store, so it lands a moment after the tap.
    trace: (o) => { traceFrom(o.data.artifact, o.data.asset); },
    'behave-model': (o) => { const d = o.data; writers().forEach((a) => withWork('behave:' + agentKey(a) + ':' + d.nodeId, [d.nodeId], modelWords(a) + ' · reading the words', a.behave({ nodeId: d.nodeId, words: d.words, at: Date.now() })).then(() => render(session.getState()))); },
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
    graph3d: { after: (o, scope, t) => say(!t.made ? 'could not hold that group' : t.detail.ok ? 'in 3D: ' + t.detail.reasoning : 'could not stand it in 3D: ' + t.detail.error) },
    frames: { after: (o, scope, t) => { if (o.data.act !== 'frame' || !t.made) return; const st = session.getState(); flash('framed ' + t.detail.members + ' — ' + MM.describeFrame(MM.frameOfNode(st.nodes.get(t.made)), st.nodes)); } },
    // The drawing said as Mermaid stands beside it: say so, remember which marks it was written from, and keep the field.
    mermaid: { after: (o, scope, t) => { if (!t.made) { say(t.detail.error); return; } mermaidMadeFrom.set(t.made, scope.marks.slice()); flash('the drawing as Mermaid, beside it — ' + t.detail.reading + '; Draw it puts it back as marks'); refreshPalette(); } },
    // A rectangle taken as a region: said, with what it holds (12-regions.js).
    region: { after: (o, scope, t) => { regionMadeSaid(t.detail); } },
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

  // ===== Ranking: the reading first, then learned use, then what is beside ===
  // The order itself is core's (`MM.rank`, context/rank.ts — B1's
  // `rankOffers` with the context applied): pure, and asked in Node. What this
  // surface keeps and hands in is the device's: learned use, globally and per
  // kind of context (V1-PLAN §2.2 rule 4), and the top each context led with a
  // moment ago (rule 3) — runtime, never the log.
  const USES_KEY = 'mm-palette-uses';
  const USES_HERE_KEY = 'mm-palette-uses-here';
  const uses = store.get(USES_KEY) || {};
  /** Learned use per kind of context: { 'notation:flowchart': { snap: 3 }, 'concept:row': { … } }. */
  const usesHere = store.get(USES_HERE_KEY) || {};
  /** The top offer each context led with, by the context's key and the board's generation: { key, at }. */
  const steadyTops = new Map();
  /** The context the open field was ranked in (V1-PLAN §2.2); NO_CONTEXT with nothing beside it. */
  let paletteContext = MM.NO_CONTEXT;

  /** What the steady top is among: the affordances the row shows, never a reading or a typed-only offer. */
  const afforded = (i) => !i.certain && i.group !== 'hidden';

  /**
   * What stands beside some marks (`MM.contextAt`): kept while the log stands
   * (R4c — `logKey`), so an undo can never leave a stale lift behind.
   */
  let contextKept = { key: null, ctx: null };
  function contextFor(ids) {
    const key = logKey() + '|' + ids.join(',');
    if (paintReference) return MM.contextAt(session, ids);
    if (contextKept.key !== key) contextKept = { key: key, ctx: MM.contextAt(session, ids) };
    return contextKept.ctx;
  }

  /**
   * The field's order: `MM.rank` with this device's use and the context, and
   * then the steady top — within one context the offer that led a moment ago
   * keeps the lead until another beats it by the margin. Far from any context
   * there is no key, nothing is held, and the order is B1's.
   */
  function rankItems(items, ctx) {
    const c = ctx || MM.NO_CONTEXT;
    const ranked = MM.rank(items, c, { uses: uses, usesHere: c.kind ? usesHere[c.kind] : undefined });
    if (!c.key) return ranked;
    const now = Date.now();
    const memo = c.key + '#' + session.getState().generation; // a board replaced is a new context, whatever its ids
    const steady = MM.steadyTop(ranked, steadyTops.get(memo), { eligible: afforded, now: now });
    const top = MM.topOf(steady, afforded);
    for (const [k, v] of steadyTops) if (now - v.at > MM.STEADY_MS) steadyTops.delete(k);
    if (top) steadyTops.set(memo, { key: top.key, at: now });
    return steady;
  }
  function noteUse(item) {
    uses[item.key] = (uses[item.key] || 0) + 1;
    store.set(USES_KEY, uses);
    const kind = paletteContext && paletteContext.kind;
    if (kind) {
      const here = usesHere[kind] || (usesHere[kind] = {});
      here[item.key] = (here[item.key] || 0) + 1;
      store.set(USES_HERE_KEY, usesHere);
    }
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
    if (done.length) parts.push(done.length === 1 ? 'wrote ' + q + ' on it' : 'wrote ' + q + ' on ' + done.length + ' marks');
    if (saying.length) parts.push(done.length ? saying.length + ' already said it' : saying.length === 1 ? 'it already says ' + q : 'these ' + saying.length + ' already say ' + q);
    const theirs = refused.filter((r) => r.reason === 'not-your-ink');
    if (theirs.length) parts.push((parts.length ? 'not on ' : 'no words written on ') + theirMarks(theirs.map((r) => r.maker)) + ' — words go on your own ink');
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
      // The models as the board says them: what their provider calls them, never an `llm:` id (FP6).
      models: agents.map((a) => modelWords(a)),
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
      // A thunk too: `= 24 ÷ 3` is read by core against the board's own page (M5), and only when a sum is typed.
      maths: (body) => MM.evaluateTyped(body, mathsFor(s).board),
      // A thunk as well: what typed words name that no offer here answers to — a board act, or an act these marks lack and what it lacks (FP1, FP8).
      // Already worked out, never asked here: the act nearest the typed words in meaning (D1).
      meaning: (t) => meaningFor(t),
      intent: (t) => ({
        host: MM.hostIntentOf(t),
        missing: sum && !revising ? MM.missingFor(t, fieldScope(s, t, null), items.filter((i) => i.offer).map((i) => i.key)) : null,
      }),
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
    // A sum typed after `=`: its words, result and all, stand on the board as text beside the marks held (M5).
    if (cmd.do === 'maths') { mathsWrite(sum, cmd.words); return; }
    // Naming is the name tool's act, whether a pill or `name: word` took it.
    if (cmd.do === 'name') { MM.nameMarks(session, sum.id, cmd.name, at); return; }
    // The marks this summon held when Enter was read — not whatever is held when a stale
    // closure runs again, so a second run finds them already saying the word (L2e).
    if (cmd.do === 'label') { const s = session.getState(); labelMarks(sum, sum.enclosedIds.filter((id) => s.contentIds.includes(id)), cmd.text); return; }
    // A region round what is held, or of the rectangle that holds the rest: the region tool's act, as its pill takes it (I5).
    if (cmd.do === 'region') { const s = session.getState(); regionMadeSaid(MM.makeRegion(session, { ids: sum.enclosedIds.filter((id) => s.contentIds.includes(id)), name: cmd.name, at: at, summonId: sum.id, offer: 'region-named' })); return; }
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
      if (cmd.ask) writers().forEach((a) => withWork('behave:' + agentKey(a) + ':' + cmd.definitionId, [cmd.definitionId], modelWords(a) + ' · reading the words', a.behave({ nodeId: cmd.definitionId, words: cmd.words, at: Date.now() })).then(() => render(session.getState())));
      return;
    }
    // The board's own acts, from the field (PLAN-FIELD-PAR FP8): the pane that does it, opened where the hand is.
    if (cmd.do === 'host') { hostAct(cmd.act, cmd.rest || ''); return; }
    // With no model here, what was typed is kept, said once, and run when one joins — never the pane popped over the field (J5).
    if (cmd.do === 'need-model') {
      const f = fieldInput(), text = f ? f.value : '', sumId = sum.id;
      const what = cmd.what[0].toUpperCase() + cmd.what.slice(1);
      keepAsk({ what: what, needs: 'model', need: 'needs a model', ids: sum.enclosedIds.slice(),
        sentence: what + ' needs a model — kept: it runs when one joins · choose one under models',
        run: () => {
          const st = session.getState();
          if (!st.summon || st.summon.id !== sumId) { say('the field that asked for ' + cmd.what + ' has closed — ask again'); return; }
          const r = readField(text);
          if (r.run) r.run();
        } });
      return;
    }
  }

  // ===== Typed words by meaning: the semantic seat, while typing (PLAN-FIELD-PAR D1) =====
  // John, 2 Oct 2026: *match while typing, but careful to rate limit so it doesn't get spammy.* So: only
  // with a seat held (nothing loads for this); only once the typing has rested (`MEANING_REST_MS`), never
  // a key at a time; only for words the field's own reading could not place (it said *a word*); every
  // text an act is known by embedded once and kept (the seat's own cache, which Find shares); the typed
  // text once per rest; nothing sent anywhere — the seat runs here. The field is drawn again only when
  // what the words are nearest changed. The decider, a network call, is never asked while typing.
  const MEANING_REST_MS = 240;
  let meaningKept = { text: null, seat: null, result: null };
  let meaningTimer = 0;
  /** The act typed words are nearest, if that was worked out for exactly these words with the seat held now. */
  function meaningFor(text) {
    if (!semanticSeat) return null;
    const t = MM.intentText(text);
    return meaningKept.seat === semanticSeat.name && meaningKept.text === t ? meaningKept.result : null;
  }
  /** Called on every keystroke; asks the seat at most once the typing rests, and only when it is worth asking. */
  function meaningSoon(text) {
    clearTimeout(meaningTimer);
    if (!semanticSeat) return;
    const t = MM.intentText(text);
    if (t.length < 3 || (meaningKept.seat === semanticSeat.name && meaningKept.text === t)) return;
    meaningTimer = setTimeout(() => { if (readField(text).kind === 'word') meaningNow(t); }, MEANING_REST_MS);
  }
  async function meaningNow(t) {
    const seat = semanticSeat;
    if (!seat) return;
    let result = null;
    try {
      const texts = [t].concat(MM.intentTexts());
      const vecs = await MM.embedAll(seat.transport, texts, semanticVectors, { batch: 512 });
      const offered = paletteItems.filter((i) => i.offer && !i.disabled).map((i) => i.key);
      const best = MM.nearestIntent((x) => vecs.get(x), vecs.get(t), (intent) => offered.some((k) => intent.is(k)));
      if (best) result = { key: offered.find((k) => best.intent.is(k)), score: best.score };
    } catch (_) { result = null; }
    if (semanticSeat !== seat) return;
    const changed = !meaningKept.result !== !result || (result && meaningKept.result && result.key !== meaningKept.result.key);
    meaningKept = { text: t, seat: seat.name, result: result };
    const f = fieldInput();
    if (f && MM.intentText(f.value) === t && (changed || result)) paintField(f.value);
  }

  /**
   * A board act typed at the field (FP8): export opens the export pane — on its true-size row
   * for *print* — *find …* opens Find with the words, *examples* the boards pane at its
   * examples, *help* the help. Nothing is written to the board, and the field stays: what
   * is held is what the export pane writes.
   */
  function hostAct(act, rest) {
    if (act === 'export' || act === 'print') {
      if (exportPanel.hasAttribute('hidden')) togglePanel(exportPanel, exportBtn);
      const row = act === 'print' ? exportPanel.querySelector('.exMaths') : null;
      if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest' });
      say(act === 'print' ? 'the export pane — a figure at its true size is its last row' : 'the export pane' + (rest ? ' — ' + rest + ' is one of its rows' : ''));
      return;
    }
    if (act === 'find') { openFind(); if (rest) { findInput.value = rest; findInput.dispatchEvent(new Event('input', { bubbles: true })); } return; }
    if (act === 'examples') { openBoardsList(); return; }
    if (act === 'help') { if (tiles.help) tiles.help.click(); return; }
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
    if (r.model) out.model = true;
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
    const fit = (x, y) => ({
      x: fitSpan(x, w, { lo: u.left + FIELD_M, hi: u.right - FIELD_M }, { lo: v.left + FIELD_M, hi: v.right - FIELD_M }),
      y: fitSpan(y, h, { lo: u.top + FIELD_M, hi: u.bottom - FIELD_M }, { lo: v.top + FIELD_TOP, hi: v.bottom - FIELD_M }),
      w: w,
    });
    const want = fit(o.hand === 'left' ? at.x - 14 - w : at.x + 14, at.y - 22);
    // Off every card in the way — the panel, the minimap (U1c; the panel alone was
    // slid past before, and the field opened over the minimap). The field is placed
    // where it was wanted when nothing is in the way; else at the nearest place,
    // to the hand, beside or above or below each card that is clear of all of them
    // and still whole on screen. Nothing clear: where it was wanted, as before.
    const cards = (o.avoid || (o.panel ? [o.panel] : [])).filter(Boolean);
    // The press itself is kept clear: fitted into the screen at its edge, the field used to slide
    // back under the hand and open beneath the pointer (U2's walk). The other side of the hand is
    // among the places tried below.
    if (anchor) cards.push({ left: at.x - FIELD_M, right: at.x + FIELD_M, top: at.y - FIELD_M, bottom: at.y + FIELD_M });
    const clear = (b) => !cards.some((r) => b.x < r.right + FIELD_M - 0.5 && b.x + w > r.left - FIELD_M + 0.5 && b.y < r.bottom + FIELD_M - 0.5 && b.y + h > r.top - FIELD_M + 0.5);
    if (clear(want)) return want;
    const tries = [fit(o.hand === 'left' ? at.x + 14 : at.x - 14 - w, at.y - 22)];
    for (const r of cards) tries.push(fit(r.right + FIELD_M, want.y), fit(r.left - FIELD_M - w, want.y), fit(want.x, r.top - FIELD_M - h), fit(want.x, r.bottom + FIELD_M));
    const far = (b) => Math.hypot(Math.max(b.x - at.x, 0, at.x - (b.x + w)), Math.max(b.y - at.y, 0, at.y - (b.y + h)));
    const ok = tries.filter(clear).sort((a, b) => far(a) - far(b) || Math.hypot(a.x - want.x, a.y - want.y) - Math.hypot(b.x - want.x, b.y - want.y));
    return ok[0] || want;
  }

  /** The panel's rect while it stands, else null — a hidden panel is in nobody's way. */
  function panelRect() {
    if (document.body.classList.contains('panelHidden') || inspectorEl.hidden) return null;
    const r = inspectorEl.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? r : null;
  }
  /** The minimap's rect while it shows, else null. */
  function minimapRect() {
    const el = document.getElementById('minimap');
    if (!el || el.hidden || getComputedStyle(el).display === 'none') return null;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? r : null;
  }
  /**
   * What the field keeps off (U1c): the panel and the minimap — and the marks it holds, when there
   * is room beside them (U2's walk: held writing opened a field over itself). A group too big to
   * stand beside is not kept off: fieldBox falls back to where it was wanted.
   */
  function fieldAvoids() {
    const s = session.getState();
    const held = s.summon ? heldBoxOf(s.summon) : null;
    return [panelRect(), minimapRect(), held].filter(Boolean);
  }

  /**
   * Where the field opens: by the hand's last press when that was on or beside the held
   * marks, else beside the marks themselves on the hand's side (U1c). The last press used
   * to be taken whatever it was — after a hold it was the stroke before, and the field
   * opened a screen away from what it holds.
   */
  /** The held marks' box on screen, or null. */
  function heldBoxOf(sum) {
    const s = session.getState();
    let box = null;
    for (const id of sum.enclosedIds) {
      const b = s.nodes.get(id) && MM.boundsOf(s.nodes.get(id));
      if (!b) continue;
      const a = worldToScreen(b.minX, b.minY), z = worldToScreen(b.maxX, b.maxY);
      box = box ? { left: Math.min(box.left, a.x), top: Math.min(box.top, a.y), right: Math.max(box.right, z.x), bottom: Math.max(box.bottom, z.y) } : { left: a.x, top: a.y, right: z.x, bottom: z.y };
    }
    return box;
  }
  function fieldAnchorFor(sum) {
    const box = heldBoxOf(sum);
    const NEAR = 80;
    if (lastPen && (!box || (lastPen.x >= box.left - NEAR && lastPen.x <= box.right + NEAR && lastPen.y >= box.top - NEAR && lastPen.y <= box.bottom + NEAR))) return { x: lastPen.x, y: lastPen.y };
    if (!box) return null;
    return { x: hand === 'left' ? box.left : box.right, y: Math.max(box.top, Math.min(box.bottom, box.top + 22)) };
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
    const avoid = fieldAvoids();
    const first = fieldBox(fieldAnchor, { viewport: v, usable: u, height: 0, hand: hand, avoid: avoid });
    summonEl.style.width = first.w + 'px';
    fitFieldHeight(v, u);
    const box = fieldBox(fieldAnchor, { viewport: v, usable: u, height: summonEl.offsetHeight, hand: hand, avoid: avoid });
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
    fieldAnchor = fieldAnchorFor(sum);
    paletteContext = contextFor(sum.enclosedIds);
    paletteItems = rankItems(conversionsFor(s), paletteContext);
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
    filter.oninput = () => { paletteNavigated = false; paletteIndex = -1; paintField(filter.value); meaningSoon(filter.value); };
    top.appendChild(filter);
    const reading = document.createElement('div');
    reading.className = 'reading';
    top.appendChild(reading);
    // An ask kept for a model says what it needs here, where it was asked, with the way to choose one (J5).
    const need = document.createElement('div');
    need.className = 'need';
    need.hidden = true;
    top.appendChild(need);
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
    paletteContext = contextFor(s.summon.enclosedIds);
    paletteItems = rankItems(conversionsFor(s), paletteContext);
    paintField(filter.value);
  }

  /** The pills the typed text leaves visible, in display order: what this is, then what it affords. */
  function visibleItems(query) {
    const q = query.trim().toLowerCase();
    const s = session.getState();
    const sum = s.summon;
    // Both rows in the ranked order — the order the reader walks, so the first
    // reading shown is the one Enter takes (V1-PLAN §2.2: one `rank`, no disagreeing).
    const certain = paletteItems.filter((i) => i.certain);
    const afford = paletteItems.filter(afforded);
    const hit = (i) => !q || (i.label + ' ' + (i.verbs || []).join(' ') + ' ' + i.group).toLowerCase().includes(q);
    // `?`: everything these marks can do, the typed-only offers too (PLAN-FIELD-PAR FP1).
    if (q === '?') return certain.concat(paletteItems.filter((i) => !i.certain));
    let shown = certain.filter(hit).concat(afford.filter(hit));
    // The act the words are nearest in meaning stands first among what they afford (D1).
    const near = q ? meaningFor(q) : null;
    const nearItem = near ? paletteItems.find((i) => i.key === near.key) : null;
    if (nearItem && !shown.includes(nearItem)) { const at = shown.findIndex((i) => !i.certain); shown.splice(at < 0 ? shown.length : at, 0, nearItem); }
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
    // What the words are nearest in meaning leads what they afford: it is what Enter takes (D1).
    if (nearItem) { shown = shown.filter((i) => i !== nearItem); const at = shown.findIndex((i) => !i.certain); shown.splice(at < 0 ? shown.length : at, 0, nearItem); }
    return shown;
  }

  /**
   * Why a pill stands where it does, when what is beside the hand moved it
   * (V1-PLAN §2.2 rule 2): "first because it sits beside a flowchart: three
   * processes, one decision". Nothing, when nothing lifted or held it.
   */
  function becauseOf(item, leads) {
    return item.because && item.because.length ? (leads ? 'first because ' : 'raised because ') + item.because.join('; ') : '';
  }

  function pillFor(item, i, selected, leads) {
    const because = becauseOf(item, leads);
    const b = ui.pill(item.label, { note: item.note, cls: (item.certain ? 'certain ' : '') + 'item', why: item.why + (item.groupWhy ? ' — ' + item.groupWhy : '') + (because ? ' — ' + because : ''), model: item.tier === 2, onclick: () => { noteUse(item); item.run(); } });
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
    const sayLine = (line, quiet, model) => { if (readingEl) { readingEl.textContent = line || ''; readingEl.classList.toggle('quiet', !!quiet); readingEl.classList.toggle('model', !!model); } };
    const standingLine = () => (chosen ? sayLine(chosen.line, false) : sayLine(r.line, r.quiet, r.model));
    let i = 0, shownAfford = 0, shownCertain = 0;
    for (const item of shown) {
      // Which pill leads its row: the one a "first because" belongs to.
      const leads = item.certain ? shownCertain++ === 0 : shownAfford === 0;
      const pill = pillFor(item, i, item.key === selectedKey, leads);
      if (item.line) { pill.onmouseenter = () => sayLine(item.line, false); pill.onmouseleave = standingLine; }
      if (item.certain) certainRow.appendChild(pill);
      else if (shownAfford < MAX_AFFORD || query.trim()) { affordRow.appendChild(pill); shownAfford++; }
      i++;
    }
    const hidden = shown.filter((x) => !x.certain).length - shownAfford;
    if (hidden > 0) { const more = document.createElement('span'); more.className = 'more'; more.textContent = '+' + hidden + ' more — type to find'; affordRow.appendChild(more); }
    standingLine();
    paintNeed(s);
    keepFieldOnScreen();
  }

  /**
   * The ask this field kept for a model, said where it was asked (J5, the pure-user walkthrough):
   * what it needs, and "choose one" — the one way the models pane opens for it. Nothing when none waits.
   */
  function paintNeed(s) {
    const el = summonEl.querySelector('.need');
    if (!el) return;
    const k = keptFor(s.summon);
    el.hidden = !k;
    if (!k) { el.innerHTML = ''; return; }
    el.innerHTML = '<span>' + esc(k.what + ' ' + k.need) + ' — kept, it runs when one joins</span> <button type="button" class="choose">choose one</button>';
    el.querySelector('.choose').onclick = () => offerModel(k.sentence);
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
    // …or has grown over a card it keeps off — a model's readings landing make it taller (U1c).
    const over = fieldAvoids().some((c) => r.left < c.right && r.right > c.left && r.top < c.bottom && r.bottom > c.top);
    if (!over && r.bottom <= v.bottom - 2 && r.right <= v.right - 2 && r.top >= v.top - 2 && r.left >= v.left - 2) return;
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
      say('in 3D again, from this drawing — ' + built.reasoning);
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

  /**
   * A brief that failed leaves no artifact named after it: the bless is undone when this hand
   * has done nothing since — it is still this hand's last act (`session.lastAct`, V1-PLAN L2j),
   * whatever another hand in the room drew meanwhile. It was the last event on the BOARD, which
   * in a room is whoever acted last by the clocks, and undo takes back this hand's act.
   */
  function dropFailedBless(artifactId) {
    const act = session.lastAct();
    const s = session.getState();
    if (act.length === 1 && act[0].type === 'bless' && s.artifacts[s.artifacts.length - 1] === artifactId) { session.undo(); releasePrompted(); return true; }
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
      seatWriters(at);
      artifactId = session.bless({ summonId: sum.id, name: name, at: at });
      addressed = undefined;
      if (!artifactId) { releasePrompted(); say('could not hold that group'); return; }
      // Tier 1 first: the structure stands at once, in the engine's name —
      // every region in place, no words. It is what the canvas knows. A model
      // then writes the words into it; with none joined, this is the page.
      // (The structure tool's act, `MM.standStructure`: stamped with its id.)
      const structure = MM.standStructure(session, artifactId, brief, at + 1);
      if (structure.ok) {
        if (!writers().length) { say('the page’s ' + structure.ids.length + ' box' + (structure.ids.length === 1 ? '' : 'es') + ' stand — a model writes the words when one joins'); return; }
      } else if (!writers().length) { say('could not build the structure: ' + structure.error); return; }
    }

    // What the human typed outranks a reading nobody asked for.
    cancelReading();
    const aboutIds = session.getState().nodes.get(artifactId) ? [artifactId] : sum.enclosedIds;
    writers().forEach((agent) => {
      const key = 'build:' + agent.id + ':' + artifactId;
      withWork(key, aboutIds, modelWords(agent) + (revising ? ' · changing “' : ' · building “') + brief.slice(0, 32) + (brief.length > 32 ? '…' : '') + '”',
        agent.generate({ prompt: brief, artifactId: artifactId, at: Date.now(), addressed: addressed, signal: workSignal(key) }))
        .then((res) => {
          noteOutcome(agent, res.ok, res.ok ? (res.revised ? 'changed ' : 'built ') + (res.revised ? (res.changed || res.filled) : res.filled).join(', ') : res.error);
          if (res.ok) {
            const short = res.unfilled && res.unfilled.length ? ' — left ' + res.unfilled.join(', ') + ' empty' : '';
            say(modelWords(agent) + ' ' + (res.revised ? 'changed' : 'built') + ' ' + (res.revised ? (res.changed || res.filled) : res.filled).join(', ') + short);
          } else {
            say(modelWords(agent) + ' could not build (' + res.error + ') — the drawing is untouched');
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
    seatWriters(at);
    const artifactId = session.bless({ summonId: sum.id, name: name, at: at });
    if (!artifactId) { releasePrompted(); say('could not hold that group'); return; }
    cancelReading();
    const library = libraryEntries(session.getState()).map((e) => ({ id: e.id, name: e.name }));
    writers().forEach((agent) => {
      const key = 'program:' + agent.id + ':' + artifactId;
      withWork(key, [artifactId], modelWords(agent) + ' · writing “' + brief.slice(0, 32) + (brief.length > 32 ? '…' : '') + '”',
        agent.program({ prompt: brief, artifactId: artifactId, library: library, at: Date.now(), signal: workSignal(key) }))
        .then((res) => {
          noteOutcome(agent, res.ok, res.ok ? (res.reuse ? 'pointed at ' + res.reuse + ' in the library' : 'wrote ' + (res.name || 'a program')) : res.error);
          if (res.ok && res.reuse) {
            const entry = libraryEntries(session.getState()).find((e) => e.name.toLowerCase() === res.reuse.toLowerCase());
            if (entry) { reuseEntry(artifactId, entry); say(modelWords(agent) + ' pointed at ' + entry.name + ' in the library — reused'); }
            else say(modelWords(agent) + ' pointed at “' + res.reuse + '”, which the library does not hold');
          } else if (res.ok) {
            // The human asked for it: it runs on arrival. A program that
            // arrived any other way waits for play (I9).
            session.clock({ nodeId: artifactId, op: 'play', at: Date.now() });
            say(modelWords(agent) + ' wrote ' + (res.name || 'a program') + (res.parts && res.parts.length ? ' — parts: ' + res.parts.join(', ') : ''));
          } else {
            const dropped = dropFailedBless(artifactId);
            say(modelWords(agent) + ' could not write it (' + res.error + ')' + (dropped ? ' — nothing was made; the drawing is as it was' : ' — the drawing is untouched'));
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
    writers().forEach((agent) => {
      withWork('draw:' + agentKey(agent), ids, modelWords(agent) + ' · drawing', agent.draw({ prompt: q, nodeIds: ids, at: Date.now() })).then((res) => {
        noteOutcome(agent, res.ok, res.ok ? 'drew ' + res.ids.length + ' mark' + (res.ids.length === 1 ? '' : 's') : res.error);
        if (res.ok) say(modelWords(agent) + ' drew ' + res.ids.length + ' mark' + (res.ids.length === 1 ? '' : 's') + ': ' + res.shapes.map((x) => x.shape).join(', '));
        else { say(modelWords(agent) + ' drew nothing (' + res.error + ')'); if (res.raw) window.__mm.lastRaw = res.raw; }
        render(session.getState());
      });
    });
  }

  /** `ask: …` — a question about these, answered into the canvas beside them. */
  function runAsk(sum, q) {
    const ids = sum.enclosedIds.slice();
    cancelReading();
    writers().forEach((agent) => {
      withWork('ask:' + agentKey(agent), ids, modelWords(agent) + ' · answering', agent.ask(q, ids, Date.now())).then((res) => {
        noteOutcome(agent, res.ok, res.ok ? 'answered beside the marks' : res.error);
        if (!res.ok) say(modelWords(agent) + ' could not answer (' + res.error + ')');
        render(session.getState());
      });
    });
  }

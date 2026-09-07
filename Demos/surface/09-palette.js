// ===== palette =====
// Provides: the field — one text input at the pen tip, and everything typed at a selection read by one
//   reader (readField); the offers (conversionsFor: what this is, what it affords); the core verbs
//   (name, copy, paste, erase; copyMarks/pasteClip/duplicateMarks, the clip); the prompts (runPrompt →
//   a page or a program, runAsk, runDraw); the library (libraryEntries/reuseEntry/applyLibrary, targetOf);
//   renderSummon/refreshPalette/paintField.
// Uses: core (hand, lastPen), ui, models (agents, withWork, cancelReading, askModelsAbout, offerModel),
//   snap, render, artifacts, frames, clocks, images (svgOf), text (wordToText), input (say, flash).
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
  let paletteIndex = -1;     // the pill the arrows chose among the visible ones; -1 is none
  let paletteNavigated = false;
  let clip = null;           // what Copy held: { strokes: [{ points }], bounds, from }
  const MAX_AFFORD = 5;      // pills shown in the affordance column before "+N more"

  function conversionsFor(s) {
    const sum = s.summon;
    const reading = session.read(sum.enclosedIds);
    const items = [];
    const marks = sum.enclosedIds.filter((id) => s.contentIds.includes(id));

    // --- What this IS: readings with their numbers. Tapping one takes it as the name. ---
    for (const sug of sum.suggestions) {
      if (sug.kind !== 'match') continue;
      items.push({
        key: 'sug:' + sug.id, certain: true, group: 'known', groupConf: sug.score || 1,
        groupWhy: 'you named this shape before',
        label: sug.label + ' ' + (sug.score || 1).toFixed(2), name: sug.label,
        why: (sug.reasoning || 'like the one you named') + ' — take it as another ' + sug.label, tier: 0,
        run: () => {
          const made = session.bless({ summonId: sum.id, suggestionId: sug.id, at: Date.now() });
          // A definition that holds a program hands it to its instance: a
          // drawing that matches the library IS a reuse, with no words typed.
          const entry = made && libraryEntries(session.getState()).find((e) => e.id === sug.artifactId);
          if (entry) reuseEntry(made, entry);
        },
      });
      // The refusal sits beside the offer: a match the engine will not stop
      // making is a mode, and the correction is what teaches it (WP-12).
      items.push({
        key: 'not:' + sug.id, group: 'always', groupConf: 0, groupWhy: '', verbs: ['not', 'not a'],
        label: 'Not a ' + sug.label, why: 'remembered — a group like this is not offered as one again', tier: 0,
        run: () => {
          session.correct({ ids: sum.enclosedIds.slice(), definitionId: sug.artifactId, verdict: 'is-not', at: Date.now() });
          refreshPalette(); // the summon stays open; the refused offer is gone from it
        },
      });
    }
    // What the writing says: write a word beside a shape and it is the shape's name.
    {
      const labels = reading.roles.filter((r) => r.role === 'label' && sum.enclosedIds.includes(r.id));
      const said = labels.map((r) => ({ r, t: MM.transcriptsOf(s.nodes.get(r.id))[0] })).filter((x) => x.t);
      for (const { r, t } of said) {
        items.push({
          key: 'said:' + r.id, certain: true, group: 'written', groupConf: t.confidence,
          groupWhy: 'read from your handwriting by ' + nameOfParticipant(t.source),
          label: '“' + t.text + '” ' + t.confidence.toFixed(2), name: t.text,
          why: (r.targets.length ? 'the word beside it' : 'the word you wrote') + ' — take it as the name', tier: 0,
          run: () => session.bless({ summonId: sum.id, name: t.text, at: Date.now() }),
        });
      }
    }
    // What a model read this group as — held, attributed, and an offer to name it.
    {
      const seen = new Set();
      const proposed = [];
      for (const id of sum.enclosedIds) {
        const n = s.nodes.get(id);
        if (!n) continue;
        for (const r of MM.interpretationsOf(n, s.nodes)) {
          if (r.tier === 0 || r.blessed) continue;
          const key = r.label.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          proposed.push(r);
        }
      }
      proposed.sort((a, b) => b.weight - a.weight).slice(0, 3).forEach((r) => {
        items.push({
          key: 'proposed:' + r.label, certain: true, group: 'proposed', groupConf: r.weight,
          groupWhy: 'read this way by ' + r.sourceName,
          label: r.label + ' ' + r.weight.toFixed(2) + ' · ' + r.sourceName, name: r.label,
          why: r.sourceName + (r.reasoning ? ' — ' + r.reasoning.slice(0, 80) : '') + ' — take it as the name', tier: 0,
          run: () => session.bless({ summonId: sum.id, name: r.label, at: Date.now() }),
        });
      });
    }
    // The concepts these marks read as (Tier 0): a row, a frame, a flow — each
    // a reading with a number, and each with what it lets the engine do.
    reading.concepts.slice(0, 3).forEach((concept) => {
      items.push({
        key: 'concept:' + concept.concept, certain: true, group: 'concept', groupConf: concept.confidence,
        groupWhy: concept.reasoning, label: concept.concept + ' ' + concept.confidence.toFixed(2), name: concept.concept,
        why: concept.reasoning + ' — take it as the name', tier: 0,
        run: () => session.bless({ summonId: sum.id, name: concept.concept, at: Date.now() }),
      });
    });

    // --- What it AFFORDS ---
    for (const concept of reading.concepts) {
      for (const conv of concept.conversions) {
        if (conv.effect.kind === 'name') continue; // the reading's own pill does this
        // A seeded brief ("Make a button…") is the field with words in it: four
        // of them crowded the column and said nothing the reading's pill does not.
        if (conv.effect.kind === 'prompt') continue;
        const seen = items.find((i) => i.key === concept.concept + ':' + conv.id);
        if (seen) continue;
        items.push({
          key: concept.concept + ':' + conv.id, group: concept.concept, groupConf: concept.confidence, groupWhy: concept.reasoning,
          label: conv.label, why: conv.hint || '', tier: conv.tier,
          verbs: conv.effect.kind === 'tidy' ? ['line up', 'align', 'tidy'] : conv.effect.kind === 'equalize' ? ['match sizes', 'same size', 'equalize', 'equal']
            : conv.effect.kind === 'control' ? ['slider', 'control'] : [],
          run: () => runConversion(sum, conv, concept),
        });
      }
    }
    // Drawing them clean: instant, offline, and the summon stays open so the
    // next offer is taken from the cleaned-up marks.
    const offers = snapMode === 'off' ? [] : session.snapCandidates(sum.enclosedIds);
    if (offers.length) {
      const all = offers.length === sum.enclosedIds.length;
      items.push({
        key: 'snap', group: 'clean', groupConf: offers.reduce((a, o) => a + o.weight, 0) / offers.length,
        groupWhy: 'each reads confidently as one shape', verbs: ['clean', 'snap', 'draw clean'],
        label: all ? 'Draw them clean' : 'Draw ' + offers.length + ' of ' + sum.enclosedIds.length + ' clean',
        why: shapesSummary(offers) + ' · ink kept', tier: 0,
        run: () => { shownSummonId = null; snapAll(offers.map((o) => o.id), shapesSummary(offers)); },
      });
    }
    // Writing a model has read can become text — a file of words a frame wires into a slot. Only on request.
    for (const lid of sum.enclosedIds) {
      const ln = s.nodes.get(lid);
      const said = ln && !s.artifacts.includes(lid) && MM.transcriptOf(ln);
      if (!said) continue;
      items.push({
        key: 'word-text:' + lid, group: 'always', groupConf: 0, groupWhy: '', verbs: ['text'],
        label: 'Make it text “' + said + '”', why: 'a file of words where the writing is; the ink stays', tier: 0,
        run: () => { session.dismiss(sum.id, Date.now()); wordToText(lid); },
      });
    }
    // Artifacts in the loop can be wired into a frame — and a frame built
    // once is offered again, by the name written beside them or by resemblance.
    {
      const arts = artifactsIn(s, sum.enclosedIds);
      if (arts.length) {
        const wiring = bestWiring(arts, s.nodes);
        if (arts.length >= 2 || wiring.length) {
          items.push({
            key: 'frame', group: 'always', groupConf: 0, groupWhy: '', verbs: ['frame', 'wire'],
            label: 'Frame these', why: wiring.length ? wiring.length + ' connection' + (wiring.length === 1 ? '' : 's') + ': ' + wiring.map((c) => c.from.port + ' → ' + c.to.port).join(', ') : arts.length + ' artifacts, nothing to wire yet', tier: 0,
            run: () => { const f = fieldInput(); const v = f ? f.value.trim().replace(/^frame\s*:?\s*/i, '') : ''; makeFrame(sum, v); },
          });
        }
        for (const tpl of frameTemplatesFor(s, sum.enclosedIds)) {
          const name = MM.wordOf(tpl.frame) || tpl.frame.id;
          items.push({
            key: 'frame-like:' + tpl.frame.id, group: tpl.how === 'name' ? 'written' : 'known', groupConf: tpl.how === 'name' ? 0.95 : 0.8,
            groupWhy: tpl.why, label: 'Frame these like “' + name + '”', why: 'the same wiring, on these', tier: 0,
            run: () => frameLike(sum, tpl.frame),
          });
        }
      }
    }
    // A definition in the loop: what it has been offered to do, what the words
    // beside it say it does, and its clock.
    const defs = [...new Set(sum.enclosedIds.filter((id) => s.artifacts.includes(id)).map((id) => definitionOf(s, id)))];
    for (const defId of defs) {
      const dn = s.nodes.get(defId);
      const name = MM.wordOf(dn) || defId;
      MM.behavioursOf(dn).forEach((r, i) => {
        if (r.data.blessed) return;
        items.push({
          key: 'use-behaviour:' + defId + ':' + i, group: 'proposed', groupConf: typeof r.data.residual === 'number' ? 1 - r.data.residual : 0.7,
          groupWhy: (r.data.source === 'demo' ? 'acted out' : 'read by ' + nameOfParticipant(r.source)),
          label: name + ': ' + MM.describeBehaviour(r.data), why: 'give it in your name', tier: 0,
          run: () => session.behave({ nodeId: defId, behaviour: { terms: r.data.terms, source: r.data.source, speed: r.data.speed }, participantId: MM.LOCAL_PARTICIPANT, at: Date.now() }),
        });
      });
      for (const lid of sum.enclosedIds) {
        const ln = s.nodes.get(lid);
        const said = ln && MM.transcriptOf(ln);
        if (!said) continue;
        const parsed = MM.parseBehaviour(said);
        if (!parsed.behaviour) continue;
        items.push({
          key: 'behave-said:' + defId + ':' + lid, group: 'written', groupConf: 0.9, groupWhy: 'read from your handwriting',
          label: name + ': ' + MM.describeBehaviour(parsed.behaviour), why: 'the words beside it, as what it does', tier: 0,
          run: () => session.behave({ nodeId: defId, behaviour: parsed.behaviour, participantId: MM.LOCAL_PARTICIPANT, at: Date.now() }),
        });
      }
      const c = s.clocks[defId];
      items.push({
        key: 'clock:' + defId, group: 'always', groupConf: 0, groupWhy: '',
        verbs: c && c.playing ? ['pause', 'stop', 'hold'] : ['play', 'run', 'start', 'go'],
        label: (c && c.playing ? 'Pause ' : 'Play ') + name,
        why: c && c.playing ? 'hold every ' + name + ' where it is' : 'let every ' + name + ' move', tier: 0,
        run: () => session.clock({ nodeId: defId, op: c && c.playing ? 'pause' : 'play', at: Date.now() }),
      });
      if (c) items.push({
        key: 'reset:' + defId, group: 'always', groupConf: 0, groupWhy: '', verbs: ['reset', 'rewind'],
        label: 'Reset ' + name, why: 'back to t = 0, where they were drawn', tier: 0,
        run: () => session.clock({ nodeId: defId, op: 'reset', at: Date.now() }),
      });
    }
    // The acts that ask a model, and say so with a dot.
    const unread = sum.enclosedIds.filter((id) => { const n = s.nodes.get(id); return n && isWriting(n) && !MM.transcriptOf(n); });
    if (unread.length) {
      items.push({
        key: 'read', group: 'always', groupConf: 0, groupWhy: '', verbs: ['read'],
        label: 'Read the writing', why: unread.length + ' mark' + (unread.length === 1 ? '' : 's') + ' of writing, unread' + (seeing().length ? '' : ' — needs a model that can see'), tier: 2,
        run: () => { let any = false; unread.forEach((id) => { any = readOne(s.nodes.get(id), true) || any; }); if (!any) offerModel('Reading writing needs a model that can see — one marked “sees”.'); },
      });
    }
    if (marks.length) {
      items.push({
        key: 'what', group: 'always', groupConf: 0, groupWhy: '', verbs: ['what', 'what is this', '?', 'read the group'],
        label: 'What is this?', why: 'every joined model reads the group; its readings join the row above' + (agents.length ? '' : ' — needs a model'), tier: 2,
        run: () => askModelsAbout(marks.slice()),
      });
    }
    // A duplicate is copy and paste in one; it is typed, not a slot.
    if (marks.length) {
      items.push({
        key: 'duplicate', group: 'hidden', groupConf: 0, groupWhy: '', verbs: ['dup', 'duplicate', 'double'],
        label: 'Duplicate ' + (marks.length === 1 ? 'it' : 'these'), why: 'a copy of the ink beside it, selected', tier: 0,
        run: () => duplicateMarks(sum, marks),
      });
      items.push({
        key: 'keep', group: 'hidden', groupConf: 0, groupWhy: '', verbs: ['keep', 'keep as drawing'],
        label: 'Keep as drawing', why: 'leave the marks as they are', tier: 0,
        run: () => {
          const keep = sum.suggestions.find((x) => x.kind === 'keep-as-drawing');
          if (keep) session.bless({ summonId: sum.id, suggestionId: keep.id, at: Date.now() });
          else session.dismiss(sum.id, Date.now());
        },
      });
    }
    return items;
  }

  function runConversion(sum, conv, concept) {
    const at = Date.now();
    const ids = sum.enclosedIds.slice();
    if (conv.effect.kind === 'tidy') {
      session.dismiss(sum.id, at);
      session.tidy({ ids: ids, mode: 'align', axis: conv.effect.axis, at: at });
      flash('lined up ' + ids.length + ' marks');
    } else if (conv.effect.kind === 'equalize') {
      session.dismiss(sum.id, at);
      session.tidy({ ids: ids, mode: 'equalize', at: at });
      flash('matched ' + ids.length + ' sizes');
    } else if (conv.effect.kind === 'name') {
      session.bless({ summonId: sum.id, name: concept.concept, at: at });
    } else if (conv.effect.kind === 'prompt') {
      // A seeded brief: it lands in the field, read like anything typed, and Enter sends it.
      const f = fieldInput();
      if (f) { f.value = conv.effect.seed; paintField(f.value); f.focus(); }
    } else if (conv.effect.kind === 'control') {
      makeControl(sum);
    }
  }

  // ===== Ranking: the reading first, then learned use ========================
  const USES_KEY = 'mm-palette-uses';
  const uses = store.get(USES_KEY) || {};

  function baseLikelihood(item) {
    const g = item.group, c = item.groupConf || 0;
    let l;
    if (g === 'known') l = 1.4;
    else if (g === 'written') l = 1.35;
    else if (g === 'proposed') l = 1.2 + 0.1 * c;
    else if (g === 'clean') l = 0.6 + 0.35 * c;
    else if (g === 'always') l = { read: 0.52, frame: 0.5, what: 0.36 }[item.key] || (item.key.startsWith('clock:') ? 0.56 : item.key.startsWith('not:') ? 0.5 : 0.4);
    else if (g === 'hidden') l = 0;
    else l = 0.5 + 0.45 * c; // a concept's conversions
    if (item.tier === 2) l *= 0.85;
    // Learned use lifts the GENERIC verbs toward the hand that uses them; an
    // offer specific to these marks is not generic, and nothing learned outranks it.
    const specific = g === 'known' || g === 'written' || g === 'proposed';
    return specific ? l : l * Math.min(1.25, 1 + 0.2 * Math.log1p(uses[item.key] || 0));
  }
  function rankItems(items) {
    return items.map((i) => Object.assign(i, { likelihood: baseLikelihood(i) })).sort((a, b) => b.likelihood - a.likelihood);
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
      { key: 'name', core: true, label: 'Name…', verbs: [], why: 'Name — hold it as a thing you can use again; type the name', disabled: !marks.length && !(sum && sum.onArtifact), tier: 0,
        run: () => { const f = fieldInput(); if (f) { f.value = 'name: '; paintField(f.value); f.focus(); f.setSelectionRange(f.value.length, f.value.length); } } },
      { key: 'copy', core: true, label: 'Copy', verbs: ['copy', 'cp'], why: 'Copy — hold the ink to paste; it is on the clipboard as SVG too', disabled: !marks.length, tier: 0,
        run: () => copyMarks(marks) },
      { key: 'paste', core: true, label: 'Paste', verbs: ['paste'], why: clip ? 'Paste — the copied ink, beside these' : 'Paste — nothing copied yet', disabled: !clip, tier: 0,
        run: () => { if (!clip) return; const b = selectionBounds(s) || (marks.length ? union(marks.map((id) => MM.boundsOf(s.nodes.get(id))).filter(Boolean)) : null); if (sum) session.dismiss(sum.id, Date.now()); pasteClip(b ? { x: b.maxX + wpx(40), y: b.minY } : screenToWorld(innerWidth / 2, innerHeight / 2)); } },
      { key: 'erase', core: true, label: 'Erase', verbs: ['erase', 'delete', 'del', 'remove', 'rm'], why: 'Erase — the ink stays in the log; undo brings it back', disabled: !marks.length, tier: 0,
        run: () => { const at = Date.now(); if (sum) session.dismiss(sum.id, at); marks.forEach((id) => session.erase(id, at)); flash('erased ' + marks.length + ' mark' + (marks.length === 1 ? '' : 's')); } },
    ];
  }

  /** Copy holds some marks' ink (clean forms where held) and puts it on the clipboard as SVG. */
  function copyMarks(ids) {
    const s = session.getState();
    const strokes = [];
    const walk = (node) => {
      const pts = MM.strokePointsOf(node);
      if (pts) { const clean = MM.cleanPointsOf(node); strokes.push({ points: (clean || pts).map((p) => ({ x: p.x, y: p.y })) }); return; }
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
    for (const st of clip.strokes) made.push(session.addStroke(st.points.map((p) => ({ x: p.x + dx, y: p.y + dy })), t++, undefined, 1 / view.zoom, { content: true }));
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
    if (sum) session.dismiss(sum.id, Date.now());
    const made = pasteClip({ x: b.maxX + wpx(40), y: b.minY });
    clip = held || clip; // a duplicate does not overwrite what Copy held
    flash('duplicated ' + ids.length + ' as ' + made.length + ' stroke' + (made.length === 1 ? '' : 's'));
  }

  // ===== The reader: what Enter will do, from what was typed ================
  const PREFIXES = /^(ask|draw|page|run|program|new|name|what)\s*:\s*([\s\S]*)$/i;
  const who = () => agents.map((a) => a.name).join(', ');

  /** The library entry a brief already answers, if any: by name, or by every word of the name. */
  function libraryFor(brief, s) {
    const q = brief.toLowerCase().trim();
    if (q.length < 2) return null;
    const words = q.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
    for (const e of libraryEntries(s || session.getState())) {
      const name = e.name.toLowerCase();
      if (name === q) return e;
      const nw = name.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
      if (nw.length && nw.every((w) => words.includes(w))) return e;
    }
    return null;
  }

  /** Every offer, visible or hidden, that the typed text names — by an alias or by the start of its label. */
  function verbFor(q, items) {
    const ql = q.toLowerCase().trim();
    if (!ql) return null;
    const all = items;
    let hit = all.find((i) => (i.verbs || []).some((v) => v === ql));
    if (hit) return hit;
    hit = all.find((i) => (i.verbs || []).some((v) => v.startsWith(ql) && ql.length >= 2)) || all.find((i) => i.label.toLowerCase().startsWith(ql) && ql.length >= 2);
    return hit || null;
  }

  /**
   * One reader for the field. Returns { kind, line, run, quiet } — the line
   * is shown under the field as it is typed; run is what Enter does.
   */
  function readField(q) {
    const s = session.getState();
    const sum = s.summon;
    const text = (q || '').trim();
    const items = paletteItems.concat(coreItems(s));
    const revising = !!(sum && sum.onArtifact);
    const none = { kind: 'empty', line: '', run: null };
    if (!sum) return none;
    if (!text) {
      const first = paletteItems.find((i) => i.certain);
      if (first) return { kind: 'default', item: first, line: '↵ ' + first.label + ' — ' + first.why.split(' — ').pop(), run: () => { noteUse(first); first.run(); } };
      return { kind: 'empty', line: sum.enclosedIds.length ? '' : '', run: null, quiet: true };
    }
    const m = PREFIXES.exec(text);
    if (m) {
      const act = m[1].toLowerCase(), rest = m[2].trim();
      if (act === 'name') return rest ? { kind: 'name', line: '↵ name it “' + rest + '”', run: () => session.bless({ summonId: sum.id, name: rest, at: Date.now() }) } : { kind: 'name', line: '↵ name it… (type the name)', quiet: true, run: null };
      if (act === 'what') return agents.length ? { kind: 'what', line: '↵ ask ' + who() + ' what this is', run: () => askModelsAbout(selectionMarks(s)) } : needsModel('reading the group');
      if (!agents.length) return needsModel(act === 'ask' ? 'a question' : act === 'draw' ? 'drawing' : 'building');
      if (!rest) return { kind: act, line: '↵ ' + act + ':… (say what)', quiet: true, run: null };
      if (act === 'ask') return { kind: 'ask', line: '↵ ask ' + who(), run: () => runAsk(sum, rest) };
      if (act === 'draw') return { kind: 'draw', line: '↵ ' + who() + ' draws', run: () => runDraw(sum, rest) };
      if (act === 'page') return { kind: 'brief', line: '↵ ' + who() + ' builds a page', run: () => runPrompt(sum, text, revising) };
      if (act === 'new') return { kind: 'brief', line: '↵ ' + who() + ' writes it fresh', run: () => runPrompt(sum, text, revising) };
      return { kind: 'brief', line: '↵ ' + who() + ' writes a program', run: () => runPrompt(sum, text, revising) };
    }
    // A verb this selection has.
    const verb = verbFor(text, items);
    if (verb && !verb.disabled) return { kind: 'verb', item: verb, line: '↵ ' + verb.label, run: () => { noteUse(verb); verb.run(); } };
    if (verb && verb.disabled) return { kind: 'verb', item: verb, line: '↵ ' + verb.label + ' — ' + verb.why, quiet: true, run: null };
    // A name the library knows.
    const entry = !revising ? libraryFor(text, s) : null;
    if (entry) return { kind: 'library', entry: entry, line: '↵ ' + entry.name + ' — from the library, no model asked', run: () => applyLibrary(sum, entry) };
    // Words a definition can be told, by the verb table.
    const defs = [...new Set(sum.enclosedIds.filter((id) => s.artifacts.includes(id)).map((id) => definitionOf(s, id)))];
    if (defs.length && text.length > 3) {
      const parsed = MM.parseBehaviour(text);
      if (parsed.behaviour) {
        const defId = defs[0];
        const name = MM.wordOf(s.nodes.get(defId)) || defId;
        const tail = parsed.unparsed.length ? (agents.length ? ' · ' + who() + ' reads “' + parsed.unparsed.join(', ') + '”' : ' · could not read “' + parsed.unparsed.join(', ') + '”') : '';
        return { kind: 'behaviour', line: '↵ ' + name + ': ' + MM.describeBehaviour(parsed.behaviour) + tail, run: () => {
          session.behave({ nodeId: defId, behaviour: parsed.behaviour, participantId: MM.LOCAL_PARTICIPANT, at: Date.now() });
          if (parsed.unparsed.length && agents.length) agents.forEach((a) => withWork('behave:' + a.id + ':' + defId, [defId], a.name + ' · reading the words', a.behave({ nodeId: defId, words: text, at: Date.now() })).then(() => render(session.getState())));
        } };
      }
    }
    // The brief.
    if (!agents.length) return needsModel('building');
    if (revising) return { kind: 'brief', line: '↵ ' + who() + ' changes what the loop covers', run: () => runPrompt(sum, text, true) };
    const want = targetOf(sum, text);
    return { kind: 'brief', line: '↵ ' + who() + (want.target === 'page' ? ' builds a page' : ' writes a program'), run: () => runPrompt(sum, text, false) };

    function needsModel(what) {
      return { kind: 'blocked', line: '↵ ' + what + ' needs a model — controls › models', quiet: true, run: () => offerModel(what[0].toUpperCase() + what.slice(1) + ' needs a model.') };
    }
  }

  // ===== The field on screen ===================================================
  function fieldInput() { return summonEl.querySelector('input.filter'); }

  /** Where the field opens: at the pen tip, fanning to the hand's side, on screen, off the panel. */
  function placeField() {
    const w = Math.min(380, innerWidth - 16);
    let x = lastPen ? lastPen.x : innerWidth / 2, y = lastPen ? lastPen.y : innerHeight / 2;
    x = hand === 'left' ? x - 14 - w : x + 14;
    y = y - 22;
    const panel = inspectorEl.getBoundingClientRect();
    if (!document.body.classList.contains('panelHidden') && panel.width && x < panel.right + 8 && y < panel.bottom && hand !== 'left') x = panel.right + 8;
    x = Math.max(8, Math.min(innerWidth - w - 8, x));
    y = Math.max(52, Math.min(innerHeight - 230, y));
    summonEl.style.left = x + 'px';
    summonEl.style.top = y + 'px';
    summonEl.style.width = w + 'px';
  }

  function renderSummon(s) {
    document.body.classList.toggle('summoning', !!s.summon);
    if (!s.summon) { summonEl.style.display = 'none'; summonEl.className = ''; shownSummonId = null; return; }
    const sum = s.summon;
    if (shownSummonId === sum.id) return;
    shownSummonId = sum.id;
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
    setTimeout(() => filter.focus(), 0);
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
    // Words typed at a definition are its behaviour, when the table can read them.
    const defs = sum ? [...new Set(sum.enclosedIds.filter((id) => s.artifacts.includes(id)).map((id) => definitionOf(s, id)))] : [];
    if (defs.length && q.length > 3) {
      const parsed = MM.parseBehaviour(query);
      for (const defId of defs) {
        const name = MM.wordOf(s.nodes.get(defId)) || defId;
        if (parsed.behaviour) {
          shown = shown.filter((i) => i.key !== 'behave:' + defId);
          shown.unshift({ key: 'behave:' + defId, group: 'written', groupConf: 1, groupWhy: parsed.reasoning, label: name + ': ' + MM.describeBehaviour(parsed.behaviour), why: parsed.unparsed.length ? 'could not read: ' + parsed.unparsed.join(', ') : 'from your words — every ' + name + ' will', tier: 0,
            run: () => { session.behave({ nodeId: defId, behaviour: parsed.behaviour, participantId: MM.LOCAL_PARTICIPANT, at: Date.now() }); } });
        }
        if (parsed.unparsed.length && agents.length) {
          shown.push({ key: 'behave-model:' + defId, group: 'always', groupConf: 0, groupWhy: '', label: 'Read it with the model', why: 'for what the table could not: ' + parsed.unparsed.join(', '), tier: 2,
            run: () => { agents.forEach((a) => withWork('behave:' + a.id + ':' + defId, [defId], a.name + ' · reading the words', a.behave({ nodeId: defId, words: query, at: Date.now() })).then(() => render(session.getState()))); } });
        }
      }
    }
    return shown;
  }

  function pillFor(item, i, selected) {
    const b = ui.pill(item.label, { cls: (item.certain ? 'certain ' : '') + 'item', why: item.why + (item.groupWhy ? ' — ' + item.groupWhy : ''), model: item.tier === 2, onclick: () => { noteUse(item); item.run(); } });
    b.setAttribute('aria-selected', String(selected));
    b.dataset.index = String(i);
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
    let i = 0, shownAfford = 0;
    for (const item of shown) {
      const pill = pillFor(item, i, item.key === selectedKey);
      if (item.certain) certainRow.appendChild(pill);
      else if (shownAfford < MAX_AFFORD || query.trim()) { affordRow.appendChild(pill); shownAfford++; }
      i++;
    }
    const hidden = shown.filter((x) => !x.certain).length - shownAfford;
    if (hidden > 0) { const more = document.createElement('span'); more.className = 'more'; more.textContent = '+' + hidden + ' more — type to find'; affordRow.appendChild(more); }
    if (readingEl) { readingEl.textContent = r.line || ''; readingEl.classList.toggle('quiet', !!r.quiet); }
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

  // ===== The prompts: what a model is asked, and only when asked =============
  function runPrompt(sum, prompt, revising) {
    const at = Date.now();
    let artifactId, addressed;

    // A brief the library already answers is not sent anywhere: the entry is
    // reused. The model is asked only for what nothing here does (the
    // conservation John asked for — the library grows, the bloat does not).
    const want = revising ? null : targetOf(sum, prompt);
    if (want && want.target === 'program') {
      const entry = want.fresh ? null : libraryFor(want.brief);
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
      if (!artifactId) { say('could not hold that group'); return; }
    }

    // What the human typed outranks a reading nobody asked for.
    cancelReading();
    const aboutIds = session.getState().nodes.get(artifactId) ? [artifactId] : sum.enclosedIds;
    agents.forEach((agent) => {
      withWork('build:' + agent.id + ':' + artifactId, aboutIds, agent.name + (revising ? ' · changing “' : ' · building “') + brief.slice(0, 32) + (brief.length > 32 ? '…' : '') + '”',
        agent.generate({ prompt: brief, artifactId: artifactId, at: Date.now(), addressed: addressed }))
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
    if (!artifactId) { say('could not hold that group'); return; }
    cancelReading();
    const library = libraryEntries(session.getState()).map((e) => ({ id: e.id, name: e.name }));
    agents.forEach((agent) => {
      withWork('program:' + agent.id + ':' + artifactId, [artifactId], agent.name + ' · writing “' + brief.slice(0, 32) + (brief.length > 32 ? '…' : '') + '”',
        agent.program({ prompt: brief, artifactId: artifactId, library: library, at: Date.now() }))
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
            say(agent.name + ' could not write it (' + res.error + ') — the drawing is untouched');
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

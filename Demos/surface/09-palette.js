// ===== palette =====
// Provides: the field — one text input at the pen tip, its geometry (fieldBox/placeField), and the
//   ADAPTER around the reader (fieldContext → readFieldCommand → runFieldCommand, exposed as readField);
//   the offers (conversionsFor: what this is, what it affords); the core verbs
//   (name, copy, paste, erase; copyMarks/pasteClip/duplicateMarks, the clip); the prompts (runPrompt →
//   a page or a program, runAsk, runDraw); the library (libraryEntries/reuseEntry/applyLibrary, targetOf);
//   renderSummon/refreshPalette/paintField.
// Uses: core (hand, lastPen), ui, field (readFieldCommand, verbFor, libraryMatch — pure, 09-field.js),
//   view (usableViewport, viewportRect), models (agents, withWork, cancelReading, askModelsAbout,
//   offerModel), snap, render, artifacts, frames, clocks, images (svgOf), text (wordToText),
//   input (say, flash).
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
        why: (sug.reasoning || 'like the one you named') + ' — take it as another ' + sug.label, tier: 1,
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
        label: 'Not a ' + sug.label, why: 'remembered — a group like this is not offered as one again', tier: 1,
        run: () => {
          session.correct({ ids: sum.enclosedIds.slice(), definitionId: sug.artifactId, verdict: 'is-not', at: Date.now() });
          refreshPalette(); // the summon stays open; the refused offer is gone from it
        },
      });
    }
    // A line of writing — words gathered by nearness (v10 D3) — is one thing to
    // name and one thing to make text, once every word on it has been read.
    const writing = reading.concepts.find((c) => c.concept === 'writing');
    const lineIds = writing && writing.roles && writing.roles.words ? writing.roles.words.slice() : [];
    const lineSaid = lineIds.map((id) => MM.transcriptsOf(s.nodes.get(id))[0]);
    const lineRead = lineIds.length >= 2 && lineSaid.every((t) => t && t.text);
    const lineText = lineRead ? lineSaid.map((t) => t.text).join(' ') : '';
    // Writing alone, taken, becomes TEXT where it is — fitted to the ink, the
    // ink underneath, editable — never a definition (v10 F8). Writing beside
    // a shape names the shape, as before.
    const allWriting = marks.length > 0 && marks.every((id) => { const n = s.nodes.get(id); return n && (isWriting(n) || MM.isWord(n)); });
    if (lineRead) {
      const conf = Math.min(...lineSaid.map((t) => t.confidence));
      items.push({
        key: 'line:' + lineIds.join(','), certain: true, group: 'written', groupConf: conf,
        groupWhy: 'read from your handwriting by ' + nameOfParticipant(lineSaid[0].source),
        label: '“' + lineText + '” ' + conf.toFixed(2), name: lineText,
        why: allWriting ? 'the line you wrote — take it as text, here; the ink stays underneath' : 'the line you wrote — take it as the name', tier: 1,
        run: () => { if (allWriting) writingToText(sum, lineText); else session.bless({ summonId: sum.id, name: lineText, at: Date.now() }); },
      });
    }
    // Written words on or beside a text made from writing fold into it (v10 F12):
    // in place of a struck word's gap, else after the nearest word.
    {
      const saidAll = allWriting ? marks.map((id) => MM.transcriptOf(s.nodes.get(id))).filter(Boolean) : [];
      const folding = lineRead ? lineText : (saidAll.length === marks.length && marks.length ? saidAll.join(' ') : '');
      const boxes = marks.map((id) => MM.boundsOf(s.nodes.get(id))).filter(Boolean);
      const nearText = folding && boxes.length ? textNear(s, union(boxes)) : null;
      if (nearText) items.push({
        key: 'fold:' + nearText, certain: true, group: 'written', groupConf: 0.95, groupWhy: 'the text it sits beside',
        label: 'Fold “' + folding + '” into the text', name: folding,
        why: 'in place of the struck word, or after the nearest one; the writing leaves, the text keeps every version', tier: 1,
        run: () => { const ids = marks.slice(); session.dismiss(sum.id, Date.now()); session.deselect(Date.now()); foldIntoText(nearText, folding, ids); say('folded “' + folding + '” into the text'); },
      });
    }
    // What the writing says: write a word beside a shape and it is the shape's name.
    {
      const labels = reading.roles.filter((r) => r.role === 'label' && sum.enclosedIds.includes(r.id) && !(lineRead && lineIds.includes(r.id)));
      const said = labels.map((r) => ({ r, t: MM.transcriptsOf(s.nodes.get(r.id))[0] })).filter((x) => x.t);
      for (const { r, t } of said) {
        items.push({
          key: 'said:' + r.id, certain: true, group: 'written', groupConf: t.confidence,
          groupWhy: 'read from your handwriting by ' + nameOfParticipant(t.source),
          label: '“' + t.text + '” ' + t.confidence.toFixed(2), name: t.text,
          why: r.targets.length ? 'the word beside it — take it as the name' : allWriting ? 'the word you wrote — take it as text, here; the ink stays underneath' : 'the word you wrote — take it as the name', tier: 1,
          run: () => { if (allWriting && !r.targets.length) writingToText(sum, t.text); else session.bless({ summonId: sum.id, name: t.text, at: Date.now() }); },
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
          why: r.sourceName + (r.reasoning ? ' — ' + r.reasoning.slice(0, 80) : '') + ' — take it as the name', tier: 1,
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
        why: concept.reasoning + ' — take it as the name', tier: 1,
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
        why: shapesSummary(offers) + ' · ink kept', tier: 1,
        run: () => { shownSummonId = null; snapAll(offers.map((o) => o.id), shapesSummary(offers)); },
      });
    }
    // Writing a model has read can become text — a file of words a frame wires into a slot. Only on request.
    if (lineRead) {
      items.push({
        key: 'line-text:' + lineIds.join(','), group: 'always', groupConf: 0, groupWhy: '', verbs: ['text'],
        label: 'Make it text “' + lineText + '”', why: allWriting ? 'text where the line is, fitted to the ink; flip it to see the writing' : 'a file of words where the line is; the ink stays', tier: 1,
        run: () => { if (allWriting) writingToText(sum, lineText); else { session.dismiss(sum.id, Date.now()); lineToText(lineIds, lineText); } },
      });
    }
    for (const lid of sum.enclosedIds) {
      const ln = s.nodes.get(lid);
      const said = ln && !s.artifacts.includes(lid) && !(lineRead && lineIds.includes(lid)) && MM.transcriptOf(ln);
      if (!said) continue;
      items.push({
        key: 'word-text:' + lid, group: 'always', groupConf: 0, groupWhy: '', verbs: ['text'],
        label: 'Make it text “' + said + '”', why: 'a file of words where the writing is; the ink stays', tier: 1,
        run: () => { session.dismiss(sum.id, Date.now()); wordToText(lid); },
      });
    }
    // A graph — nodes joined by edges — can stand in 3D at once: spheres and
    // bonds in the loop's frame, from the drawing, no model (v10 D7, tier 1).
    if ((reading.genre.genre === 'graph' || reading.genre.genre === 'mixed') && marks.length >= 2 && !artifactsIn(s, sum.enclosedIds).length) {
      const nodesN = reading.roles.filter((r) => r.role === 'node').length, edgesN = reading.roles.filter((r) => r.role === 'edge').length;
      if (nodesN >= 2 && edgesN >= 1) items.push({
        key: '3d', group: 'always', groupConf: 0, groupWhy: '', verbs: ['3d', 'show in 3d', 'in 3d', 'spheres'],
        label: 'Show it in 3D', why: nodesN + ' spheres and ' + edgesN + ' bond' + (edgesN === 1 ? '' : 's') + ' in the frame, turning — press inside to turn it; ink over a sphere lands on its mark → then: What is this? asks which molecule', tier: 1,
        run: () => showIn3D(sum),
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
            label: 'Frame these', why: wiring.length ? wiring.length + ' connection' + (wiring.length === 1 ? '' : 's') + ': ' + wiring.map((c) => c.from.port + ' → ' + c.to.port).join(', ') : arts.length + ' artifacts, nothing to wire yet', tier: 1,
            run: () => { const f = fieldInput(); const v = f ? f.value.trim().replace(/^frame\s*:?\s*/i, '') : ''; makeFrame(sum, v); },
          });
        }
        for (const tpl of frameTemplatesFor(s, sum.enclosedIds)) {
          const name = MM.wordOf(tpl.frame) || tpl.frame.id;
          items.push({
            key: 'frame-like:' + tpl.frame.id, group: tpl.how === 'name' ? 'written' : 'known', groupConf: tpl.how === 'name' ? 0.95 : 0.8,
            groupWhy: tpl.why, label: 'Frame these like “' + name + '”', why: 'the same wiring, on these', tier: 1,
            run: () => frameLike(sum, tpl.frame),
          });
        }
      }
    }
    // A definition in the loop: what it has been offered to do, what the words
    // beside it say it does, and its clock.
    // A text artifact is edited, and one made from writing can be flipped to the ink (v10 F8).
    for (const aid of sum.enclosedIds.filter((id) => s.artifacts.includes(id))) {
      const an = s.nodes.get(aid);
      const arep = an && codeRepOf(an);
      if (!arep || arep.data.kind !== 'text') continue;
      items.push({
        key: 'edit-text:' + aid, group: 'always', groupConf: 0, groupWhy: '', verbs: ['edit', 'edit the text', 'retype'],
        label: 'Edit the text', why: 'a new version of the words; every version kept', tier: 1,
        run: () => { session.dismiss(sum.id, Date.now()); session.deselect(Date.now()); beginTextEdit(aid); },
      });
      if (arep.data.from === 'writing') items.push({
        key: 'flip:' + aid, group: 'always', groupConf: 0, groupWhy: '', verbs: ['flip', 'ink', 'show the ink', 'show the text'],
        label: flipped.has(aid) ? 'Show the text' : 'Show the ink', why: flipped.has(aid) ? 'the text in front again' : 'flip it over: the writing it came from', tier: 1,
        run: () => { if (flipped.has(aid)) flipped.delete(aid); else flipped.add(aid); render(session.getState()); refreshPalette(); },
      });
    }
    const defs = [...new Set(sum.enclosedIds.filter((id) => s.artifacts.includes(id)).map((id) => definitionOf(s, id)))];
    for (const defId of defs) {
      const dn = s.nodes.get(defId);
      const name = MM.wordOf(dn) || defId;
      // Only what can play plays: a drawing's tank, or a program. A page, a text, a picture has no clock to offer.
      const drep = codeRepOf(dn);
      if (drep && drep.data.kind !== 'run' && drep.data.kind !== 'js') continue;
      MM.behavioursOf(dn).forEach((r, i) => {
        if (r.data.blessed) return;
        items.push({
          key: 'use-behaviour:' + defId + ':' + i, group: 'proposed', groupConf: typeof r.data.residual === 'number' ? 1 - r.data.residual : 0.7,
          groupWhy: (r.data.source === 'demo' ? 'acted out' : 'read by ' + nameOfParticipant(r.source)),
          label: name + ': ' + MM.describeBehaviour(r.data), why: 'give it in your name', tier: 1,
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
          label: name + ': ' + MM.describeBehaviour(parsed.behaviour), why: 'the words beside it, as what it does', tier: 1,
          run: () => session.behave({ nodeId: defId, behaviour: parsed.behaviour, participantId: MM.LOCAL_PARTICIPANT, at: Date.now() }),
        });
      }
      const c = s.clocks[defId];
      items.push({
        key: 'clock:' + defId, group: 'always', groupConf: 0, groupWhy: '',
        verbs: c && c.playing ? ['pause', 'stop', 'hold'] : ['play', 'run', 'start', 'go'],
        label: (c && c.playing ? 'Pause ' : 'Play ') + name,
        why: c && c.playing ? 'hold every ' + name + ' where it is' : 'let every ' + name + ' move', tier: 1,
        run: () => session.clock({ nodeId: defId, op: c && c.playing ? 'pause' : 'play', at: Date.now() }),
      });
      if (c) items.push({
        key: 'reset:' + defId, group: 'always', groupConf: 0, groupWhy: '', verbs: ['reset', 'rewind'],
        label: 'Reset ' + name, why: 'back to t = 0, where they were drawn', tier: 1,
        run: () => session.clock({ nodeId: defId, op: 'reset', at: Date.now() }),
      });
    }
    // The acts that ask a model, and say so with a dot.
    const unread = sum.enclosedIds.filter((id) => { const n = s.nodes.get(id); return n && isWriting(n) && !isRead(n); });
    if (unread.length) {
      // A line of writing is read as one image, so the reader has the phrase; the rest one by one.
      const line = lineIds.length >= 2 && lineIds.some((id) => unread.includes(id)) ? lineIds : [];
      const single = unread.filter((id) => !line.includes(id));
      const what = (line.length ? 'a line of ' + line.length + ' words' : '') + (line.length && single.length ? ' and ' : '') + (single.length ? single.length + ' mark' + (single.length === 1 ? '' : 's') + ' of writing' : '');
      items.push({
        key: 'read', group: 'always', groupConf: 0, groupWhy: '', verbs: ['read'],
        label: 'Read the writing', why: what + ', unread' + (seeing().length ? '' : ' — needs a model that can see'), tier: 2,
        run: () => {
          let any = false;
          if (line.length) any = readLine(line, true) || any;
          single.forEach((id) => { any = readOne(s.nodes.get(id), true) || any; });
          if (!any) offerModel('Reading writing needs a model that can see — one marked “sees”.');
        },
      });
    }
    // Writing the rung did not spot — big letters, a scrawl — can still be
    // read: any ink, as one image, on request (v10 F5). The rung called
    // John's h an arc and his o a triangle; the field must still offer to read them.
    if (!unread.length) {
      const ink = marks.filter((id) => { const n = s.nodes.get(id); return n && !s.artifacts.includes(id) && (MM.strokePointsOf(n) || MM.isWord(n)) && !isRead(n); });
      if (ink.length) items.push({
        key: 'read-any', group: 'always', groupConf: 0, groupWhy: '', verbs: ['read', 'read as writing', 'parse', 'writing'],
        label: 'Read as writing', why: 'the ink as one image, to a model that can see — for writing the shape rung did not spot' + (seeing().length ? '' : ' — needs a model that can see'), tier: 2,
        run: () => { if (!readLine(ink, true)) offerModel('Reading writing needs a model that can see — one marked “sees”.'); },
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
        label: 'Duplicate ' + (marks.length === 1 ? 'it' : 'these'), why: 'a copy of the ink beside it, selected', tier: 1,
        run: () => duplicateMarks(sum, marks),
      });
      items.push({
        key: 'keep', group: 'hidden', groupConf: 0, groupWhy: '', verbs: ['keep', 'keep as drawing'],
        label: 'Keep as drawing', why: 'leave the marks as they are', tier: 1,
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
      // The field stays open: a button click never closes it (the hand chains
      // commands — line up, then match sizes, then name). Clicking off, Esc,
      // naming, or erasing the marks themselves ends it.
      session.tidy({ ids: ids, mode: 'align', axis: conv.effect.axis, at: at });
      flash('lined up ' + ids.length + ' marks');
      refreshPalette();
    } else if (conv.effect.kind === 'equalize') {
      session.tidy({ ids: ids, mode: 'equalize', at: at });
      flash('matched ' + ids.length + ' sizes');
      refreshPalette();
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
    // The field stays open — the copies land selected beside the group, and
    // the hand can go straight to the next verb.
    const made = pasteClip({ x: b.maxX + wpx(40), y: b.minY });
    clip = held || clip; // a duplicate does not overwrite what Copy held
    flash('duplicated ' + ids.length + ' as ' + made.length + ' stroke' + (made.length === 1 ? '' : 's'));
    refreshPalette();
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
    if (cmd.do === 'name') { session.bless({ summonId: sum.id, name: cmd.name, at: at }); return; }
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
    if (p && hand !== 'left' && x < p.right + FIELD_M && x + w > p.left && y < p.bottom && y + h > p.top
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

  /** Place the field where it stands now. Touches left/top/width and NOTHING else. */
  function placeField() {
    const v = viewportRect(), u = usableViewport();
    // Width first: the height below is whatever the content comes to at that
    // width, measured rather than assumed.
    const first = fieldBox(fieldAnchor, { viewport: v, usable: u, height: 0, hand: hand, panel: panelRect() });
    summonEl.style.width = first.w + 'px';
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
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (!coarse) setTimeout(() => filter.focus(), 0);
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
    keepFieldOnScreen();
  }

  /**
   * The pills just rewrapped and the field grew: re-place it only if its foot
   * has gone off the bottom. Re-placing on every keystroke would walk the
   * field up the screen under the hand.
   */
  function keepFieldOnScreen() {
    if (!summonEl.classList.contains('field')) return;
    const r = summonEl.getBoundingClientRect(), v = viewportRect();
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

  /** The graph as spheres and bonds (tier 1): the loop is blessed, the program built from the drawing, played because the hand asked. */
  function showIn3D(sum) {
    const at = Date.now();
    const match = sum.suggestions.find((x) => x.kind === 'match');
    const artifactId = match ? session.bless({ summonId: sum.id, suggestionId: match.id, at: at }) : session.bless({ summonId: sum.id, name: 'graph in 3d', at: at });
    if (!artifactId) { say('could not hold that group'); return; }
    const built = MM.buildGraph3D(session, artifactId);
    if (!built.ok) { say('could not stand it in 3D: ' + built.error); return; }
    session.attachCode({ participantId: built.participantId, nodeId: artifactId, kind: 'run', code: built.code, prompt: 'show it in 3D', at: at + 1 });
    session.clock({ nodeId: artifactId, op: 'play', at: at + 2 });
    say('in 3D (tier 1): ' + built.reasoning);
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
    if (last && last.type === 'bless' && s.artifacts[s.artifacts.length - 1] === artifactId) { session.undo(); return true; }
    return false;
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
      if (!artifactId) { say('could not hold that group'); return; }
      // Tier 1 first: the structure stands at once, in the engine's name —
      // every region in place, no words. It is what the canvas knows. A model
      // then writes the words into it; with none joined, this is the page.
      const structure = MM.buildStructure(session, artifactId);
      if (structure.ok) {
        session.attachCode({ participantId: structure.participantId, nodeId: artifactId, kind: 'html', code: structure.code, prompt: brief, at: at + 1 });
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
    if (!artifactId) { say('could not hold that group'); return; }
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

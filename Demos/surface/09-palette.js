// ===== palette =====
// Provides: the command palette: conversions, painting, prompts (build/revise/ask/draw).
// Uses: core, models, snap, render, artifacts.
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () Ellipsis)();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== The command palette ==============================================
  //
  // What the marks could BECOME, offered as one list. The order is the argument:
  // conversions the engine can do by itself come first, because they are instant
  // and work with nothing attached, and the ones that need a model come after,
  // marked. A canvas whose every offer is "ask a model" is a chat box with a
  // drawing area; a canvas that can tidy your boxes before anything is
  // configured is a tool.
  //
  // Concepts come from `session.read()` — Tier 0 relations (insideness,
  // nearness, alignment, peerhood) matched against the concept library. The
  // palette never decides what the marks mean; it renders what the engine read.
  let shownSummonId = null;
  let paletteItems = [];
  let paletteIndex = 0;

  function conversionsFor(s) {
    const sum = s.summon;
    const reading = session.read(sum.enclosedIds);
    const items = [];

    for (const concept of reading.concepts) {
      for (const conv of concept.conversions) {
        // The same conversion can be offered by two concepts; keep the stronger.
        const seen = items.find((i) => i.key === concept.concept + ':' + conv.id);
        if (seen) continue;
        items.push({
          key: concept.concept + ':' + conv.id,
          group: concept.concept,
          groupConf: concept.confidence,
          groupWhy: concept.reasoning,
          label: conv.label,
          why: conv.hint || '',
          tier: conv.tier,
          run: () => runConversion(sum, conv, concept),
        });
      }
    }

    // The engine's own offers: an artifact this matches, and the plain ways out.
    for (const sug of sum.suggestions) {
      if (sug.kind === 'match') {
        items.unshift({
          key: 'sug:' + sug.id, group: 'known', groupConf: sug.score || 1,
          groupWhy: 'you have named this shape before',
          label: 'It’s a ' + sug.label, why: 'hold it as another one', tier: 0,
          run: () => session.bless({ summonId: sum.id, suggestionId: sug.id, at: Date.now() }),
        });
      }
    }
    // What the writing says becomes the offer to NAME with — the ship criterion
    // for handwriting: write a word next to a shape and it becomes its name.
    {
      const labels = reading.roles.filter((r) => r.role === 'label' && sum.enclosedIds.includes(r.id));
      const said = labels.map((r) => ({ r, t: MM.transcriptsOf(s.nodes.get(r.id))[0] })).filter((x) => x.t);
      for (const { r, t } of said) {
        items.unshift({
          key: 'said:' + r.id, group: 'written', groupConf: t.confidence,
          groupWhy: 'read from your handwriting by ' + nameOfParticipant(t.source),
          label: 'Name it “' + t.text + '”', why: r.targets.length ? 'the word beside it, as its name' : 'the word you wrote, as its name', tier: 0,
          run: () => session.bless({ summonId: sum.id, name: t.text, at: Date.now() }),
        });
      }
      const unread = sum.enclosedIds.filter((id) => { const n = s.nodes.get(id); return n && isWriting(n) && !MM.transcriptOf(n); });
      if (unread.length && agents.length) {
        items.push({
          key: 'read', group: 'always', groupConf: 0, groupWhy: '',
          label: 'Read the writing', why: seeing().length ? unread.length + ' mark' + (unread.length === 1 ? '' : 's') + ' of writing, unread' : 'needs a model that can see', tier: 2,
          run: () => { let any = false; unread.forEach((id) => { any = readOne(s.nodes.get(id), true) || any; }); if (!any) offerModel('Reading writing needs a model that can see — one marked “sees”.'); },
        });
      }
    }

    // What a model read this group as becomes an offer to NAME it — the
    // benchmark's last clause. The model proposed; the human blesses; the
    // engine then recognises the next one by its signature like any entry
    // the human named. Readings arrive after the palette opens, so the list
    // is repainted when they do (see askModels).
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
          key: 'proposed:' + r.label, group: 'proposed', groupConf: r.weight,
          groupWhy: 'read this way by ' + r.sourceName,
          label: 'Name it “' + r.label + '”', why: r.sourceName + (r.reasoning ? ' — ' + r.reasoning.slice(0, 60) : ''), tier: 0,
          run: () => session.bless({ summonId: sum.id, name: r.label, at: Date.now() }),
        });
      });
    }

    // Drawing them clean: instant, offline, and the summon stays open so the
    // next offer is taken from the cleaned-up marks.
    const offers = snapMode === 'off' ? [] : session.snapCandidates(sum.enclosedIds);
    if (offers.length) {
      const all = offers.length === sum.enclosedIds.length;
      items.unshift({
        key: 'snap', group: 'clean',
        groupConf: offers.reduce((a, o) => a + o.weight, 0) / offers.length,
        groupWhy: 'each reads confidently as one shape',
        label: all ? 'Draw them clean' : 'Draw ' + offers.length + ' of ' + sum.enclosedIds.length + ' clean',
        why: shapesSummary(offers) + ' · ink kept', tier: 0,
        run: () => { shownSummonId = null; snapAll(offers.map((o) => o.id), shapesSummary(offers)); },
      });
    }
    if (!items.some((i) => i.label === 'Name this…')) {
      items.push({
        key: 'name', group: 'always', groupConf: 0, groupWhy: '',
        label: 'Name this…', why: 'hold it as a thing you can use again', tier: 0,
        run: (btn) => swapToInput(sum.id, btn),
      });
    }
    items.push({
      key: 'make', group: 'always', groupConf: 0, groupWhy: '',
      // One gesture, one box; whether it builds or changes is context, not a mode.
      label: sum.onArtifact ? 'Change it…' : 'Describe it…',
      why: agents.length === 0 ? 'needs a model — tap to add one'
        : sum.onArtifact ? 'change what this ink covers'
        : (reading.genre && reading.genre.genre === 'graph' ? 'build it as a running diagram'
          : reading.genre && reading.genre.genre === 'mixed' ? 'build it — a diagram inside a page'
          : 'say what it should become'),
      tier: 2,
      run: (btn) => swapToPrompt(sum, btn),
    });
    if (agents.length > 0 && sum.enclosedIds.length > 0) {
      items.push({
        key: 'ask', group: 'always', groupConf: 0, groupWhy: '',
        label: 'Ask about it…', why: 'answered into the canvas', tier: 2,
        run: (btn) => swapToQuestion(sum.enclosedIds.slice(), btn),
      });
    }
    if (agents.length > 0 && !sum.onArtifact) {
      // The model holds a pen too: it says what it would add, in the shapes
      // the canvas can read, and the engine draws it in its name.
      items.push({
        key: 'draw', group: 'always', groupConf: 0, groupWhy: '',
        label: 'Ask it to draw…', why: 'marks added in the model’s name, beside these', tier: 2,
        run: (btn) => swapToDraw(sum, btn),
      });
    }
    items.push({
      key: 'keep', group: 'always', groupConf: 0, groupWhy: '',
      label: 'Keep as drawing', why: 'leave the marks as they are', tier: 0,
      run: () => {
        const keep = sum.suggestions.find((x) => x.kind === 'keep-as-drawing');
        if (keep) session.bless({ summonId: sum.id, suggestionId: keep.id, at: Date.now() });
        else session.dismiss(sum.id, Date.now());
      },
    });

    // Groups stay whole — a reading split across the list reads as two readings.
    // Within a group, what the engine can do alone comes first: instant,
    // offline, and true regardless of what is plugged in. Between groups, the
    // strongest reading leads and the always-available actions sit at the end.
    const order = new Map();
    for (const i of items) {
      const best = order.get(i.group);
      const rank = i.group === 'always' ? -1 : i.groupConf;
      if (best === undefined || rank > best) order.set(i.group, rank);
    }
    return items.sort((a, b) => {
      if (a.group !== b.group) return order.get(b.group) - order.get(a.group);
      return a.tier - b.tier;
    });
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
      const input = document.querySelector('#summon input.filter');
      if (input) { input.value = conv.effect.seed; }
      swapToPrompt(sum, input, conv.effect.seed);
    }
  }

  function renderSummon(s) {
    document.body.classList.toggle('summoning', !!s.summon);
    if (!s.summon) { summonEl.style.display = 'none'; summonEl.className = ''; shownSummonId = null; return; }
    const sum = s.summon;
    if (shownSummonId !== sum.id) {
      shownSummonId = sum.id;
      paletteItems = conversionsFor(s);
      paletteIndex = 0;
      summonEl.className = 'palette';
      summonEl.style.display = 'block';
      summonEl.innerHTML = '';

      // Say what it is acting on, and how it decided — a wrong guess should be
      // visible before you act on it, not after.
      const scope = document.createElement('div');
      scope.className = 'scope';
      const onArt = sum.onArtifact
        ? ' on <b>' + esc(MM.wordOf(s.nodes.get(sum.onArtifact.artifactId)) || 'artifact') + '</b>' +
          (sum.onArtifact.regionIds.length ? ' · ' + esc(sum.onArtifact.regionIds.join(' ')) : '')
        : '';
      const genre = session.read(sum.enclosedIds).genre;
      scope.innerHTML = '<b>' + sum.enclosedIds.length + ' mark' +
        (sum.enclosedIds.length === 1 ? '' : 's') + '</b>' + onArt + ' — ' + esc(sum.scopeReasoning) +
        (genre && genre.genre !== 'empty' ? ' · <b>' + esc(genre.genre) + '</b>' : '');
      summonEl.appendChild(scope);

      const filter = document.createElement('input');
      filter.className = 'filter';
      filter.placeholder = 'what should this become?';
      filter.onkeydown = onPaletteKey;
      filter.oninput = () => paintPalette(filter.value);
      summonEl.appendChild(filter);

      const list = document.createElement('div');
      list.className = 'items';
      summonEl.appendChild(list);
      paintPalette('');
      setTimeout(() => filter.focus(), 0);
    }

    // Beside what is selected — which is what the loop became — else beside the mark.
    const b = selectionBounds(s) || MM.boundsOf(s.nodes.get(sum.gestureIds[sum.gestureIds.length - 1]));
    const p = worldToScreen(b.minX - wpx(10), b.maxY + wpx(10));
    let left = Math.max(8, Math.min(p.x, innerWidth - summonEl.offsetWidth - 8));
    const top = Math.max(8, Math.min(p.y + 14, innerHeight - summonEl.offsetHeight - 52));
    // Keep clear of the panel: two things to read should not sit on each other.
    const panel = inspectorEl.getBoundingClientRect();
    if (!document.body.classList.contains('panelHidden') && panel.width && left < panel.right + 10 &&
        top < panel.bottom && top + summonEl.offsetHeight > panel.top) {
      left = Math.min(panel.right + 10, innerWidth - summonEl.offsetWidth - 8);
    }
    summonEl.style.left = left + 'px';
    summonEl.style.top = top + 'px';
  }

  /** Recompute the offers for the open summon and repaint, keeping what was typed. */
  function refreshPalette() {
    const s = session.getState();
    if (!s.summon || shownSummonId !== s.summon.id) return;
    const filter = summonEl.querySelector('input.filter');
    if (!filter || !summonEl.querySelector('.items')) return; // a prompt or name field has replaced the list
    paletteItems = conversionsFor(s);
    paintPalette(filter.value);
  }

  function visibleItems(query) {
    const q = query.trim().toLowerCase();
    if (!q) return paletteItems;
    return paletteItems.filter((i) =>
      (i.label + ' ' + i.group + ' ' + i.why).toLowerCase().includes(q));
  }

  function paintPalette(query) {
    const list = summonEl.querySelector('.items');
    if (!list) return;
    const shown = visibleItems(query);
    if (paletteIndex >= shown.length) paletteIndex = Math.max(0, shown.length - 1);
    list.innerHTML = '';
    if (shown.length === 0) {
      list.innerHTML = '<div class="empty2">Nothing matches. Keep drawing to dismiss.</div>';
      return;
    }
    let lastGroup = null;
    shown.forEach((item, i) => {
      if (item.group !== lastGroup) {
        lastGroup = item.group;
        const g = document.createElement('div');
        g.className = 'group';
        g.innerHTML = '<span>' + esc(item.group) + '</span>' +
          (item.groupConf ? '<span class="conf" title="' + esc(item.groupWhy) + '">' +
            item.groupConf.toFixed(2) + '</span>' : '');
        list.appendChild(g);
      }
      const btn = document.createElement('button');
      btn.className = 'item';
      btn.setAttribute('aria-selected', String(i === paletteIndex));
      btn.innerHTML = '<span>' + esc(item.label) + '</span>' +
        (item.tier === 0 ? '<span class="tier0">·now</span>' : '') +
        '<span class="why">' + esc(item.why) + '</span>';
      btn.onclick = () => item.run(btn);
      list.appendChild(btn);
    });
    const sel = list.querySelector('[aria-selected="true"]');
    if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest' });
  }

  function onPaletteKey(e) {
    e.stopPropagation();
    const shown = visibleItems(e.target.value);
    if (e.key === 'ArrowDown') { e.preventDefault(); paletteIndex = Math.min(shown.length - 1, paletteIndex + 1); paintPalette(e.target.value); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); paletteIndex = Math.max(0, paletteIndex - 1); paintPalette(e.target.value); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const item = shown[paletteIndex];
      if (item) item.run(summonEl.querySelectorAll('.item')[paletteIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      session.dismiss(shownSummonId, Date.now());
    }
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

  function swapToInput(summonId, btn) {
    const input = document.createElement('input');
    input.placeholder = 'name it…';
    input.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' && input.value.trim()) {
        session.bless({ summonId: summonId, name: input.value.trim(), at: Date.now() });
      }
    };
    replaceWithField(btn, input);
  }

  // The freeform prompt — MVP.md §2 step 6. One box for building and for
  // changing, because it is one gesture; whether the artifact already carries
  // code is what decides, not a mode the human has to pick.
  function swapToPrompt(sum, btn, seed) {
    const revising = !!sum.onArtifact;
    const input = document.createElement('input');
    input.className = 'make filter';
    input.value = seed || '';
    input.placeholder = revising
      ? 'change what this covers…'
      : 'website with the copy in the squares…';
    input.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key !== 'Enter') return;
      const prompt = input.value.trim();
      if (!prompt) return;
      if (agents.length === 0) {
        // The escalation, made visible: the engine did all it could, and this
        // is the step that needs a model. Open the pane instead of a dead box.
        offerModel('“' + prompt.slice(0, 40) + '” needs a model to build. Tap one to join it, then describe it again.');
        return;
      }
      input.disabled = true;
      input.placeholder = 'building with ' + agents.length + ' model(s)…';
      runPrompt(sum, prompt, revising);
    };
    replaceWithField(btn, input);
  }

  /**
   * Swap the palette for a single field. The list is removed rather than left
   * behind: once you are typing, the options are stale.
   */
  function replaceWithField(btn, input) {
    const list = summonEl.querySelector('.items');
    if (list) list.remove();
    const filter = summonEl.querySelector('input.filter');
    if (filter && filter !== input) filter.replaceWith(input);
    else if (btn && btn.replaceWith) btn.replaceWith(input);
    else summonEl.appendChild(input);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  function runPrompt(sum, prompt, revising) {
    const at = Date.now();
    let artifactId, addressed;

    if (revising) {
      artifactId = sum.onArtifact.artifactId;
      addressed = addressedRegions(sum);
      session.dismiss(sum.id, at); // the addressing mark has done its work
    } else {
      // Blessing first gives the code somewhere to live, and gives the region
      // frame its origin. The name is the prompt, so the artifact says what it
      // was asked to be.
      const name = prompt.length > 30 ? prompt.slice(0, 30) + '…' : prompt;
      artifactId = session.bless({ summonId: sum.id, name: name, at: at });
      addressed = undefined;
      if (!artifactId) { mpStatus.textContent = 'Could not hold that group.'; return; }
    }

    // What the human typed outranks a reading nobody asked for.
    cancelReading();
    mpStatus.textContent = (revising ? 'revising' : 'building') + ' with ' + agents.length + ' model(s)…';
    agents.forEach((agent) => {
      agent.generate({ prompt: prompt, artifactId: artifactId, at: Date.now(), addressed: addressed })
        .then((res) => {
          if (res.ok) {
            const short = res.unfilled && res.unfilled.length
              ? ' — left ' + res.unfilled.join(', ') + ' empty'
              : '';
            mpStatus.textContent =
              agent.name + ' ' + (res.revised ? 'revised' : 'built') + ' ' + (res.revised ? (res.changed || res.filled) : res.filled).join(', ') + short;
          } else {
            mpStatus.textContent = agent.name + ' could not build (' + res.error + ') — the drawing is untouched.';
            // A model that answered unusably is a thing you need to SEE to fix.
            if (res.raw) window.__mm.lastRaw = res.raw;
          }
          render(session.getState());
        });
    });
  }

  function swapToDraw(sum, btn) {
    const input = document.createElement('input');
    input.placeholder = 'add a footer under these…';
    input.className = 'ask';
    input.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key !== 'Enter') return;
      const q = input.value.trim();
      if (!q) return;
      const ids = sum.enclosedIds.slice();
      session.dismiss(sum.id, Date.now());
      cancelReading();
      mpStatus.textContent = 'drawing with ' + agents.length + ' model(s)…';
      agents.forEach((agent) => {
        agent.draw({ prompt: q, nodeIds: ids, at: Date.now() }).then((res) => {
          if (res.ok) {
            mpStatus.textContent = agent.name + ' drew ' + res.ids.length + ' mark' + (res.ids.length === 1 ? '' : 's') +
              ': ' + res.shapes.map((s) => s.shape).join(', ');
            flash(agent.name + ' drew ' + res.ids.length);
          } else {
            mpStatus.textContent = agent.name + ' drew nothing (' + res.error + ').';
            if (res.raw) window.__mm.lastRaw = res.raw;
          }
          render(session.getState());
        });
      });
    };
    replaceWithField(btn, input);
  }

  function swapToQuestion(nodeIds, btn) {
    const input = document.createElement('input');
    input.placeholder = 'ask about these…';
    input.className = 'ask';
    input.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key !== 'Enter') return;
      const q = input.value.trim();
      if (!q) return;
      input.disabled = true;
      input.placeholder = 'asking ' + agents.length + ' model(s)…';
      cancelReading();
      agents.forEach((agent) => {
        agent.ask(q, nodeIds, Date.now()).then((res) => {
          if (!res.ok) mpStatus.textContent = agent.name + ' could not answer (' + res.error + ').';
          render(session.getState());
        });
      });
    };
    replaceWithField(btn, input);
  }

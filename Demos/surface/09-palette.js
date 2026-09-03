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
        // The refusal sits beside the offer: a match the engine will not stop
        // making is a mode, and the correction is what teaches it (WP-12).
        items.push({
          key: 'not:' + sug.id, group: 'always', groupConf: 0, groupWhy: '',
          label: 'Not a ' + sug.label, why: 'remembered — a group like this is not offered as one again', tier: 0,
          run: () => {
            session.correct({ ids: sum.enclosedIds.slice(), definitionId: sug.artifactId, verdict: 'is-not', at: Date.now() });
            refreshPalette(); // the summon stays open; the refused offer is gone from it
          },
        });
        items.unshift({
          key: 'sug:' + sug.id, group: 'known', groupConf: sug.score || 1,
          groupWhy: 'you have named this shape before',
          label: 'It’s a ' + sug.label, why: sug.reasoning || 'hold it as another one', tier: 0,
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
      // A definition in the loop: what it has been offered to do, and what
      // the words beside it say it does.
      for (const defId of [...new Set(sum.enclosedIds.filter((id) => s.artifacts.includes(id)).map((id) => definitionOf(s, id)))]) {
        const dn = s.nodes.get(defId);
        const name = MM.wordOf(dn) || defId;
        MM.behavioursOf(dn).forEach((r, i) => {
          if (r.data.blessed) return;
          items.unshift({
            key: 'use-behaviour:' + defId + ':' + i, group: 'proposed', groupConf: typeof r.data.residual === 'number' ? 1 - r.data.residual : 0.7,
            groupWhy: (r.data.source === 'demo' ? 'acted out' : 'read by ' + nameOfParticipant(r.source)),
            label: name + ': ' + MM.describeBehaviour(r.data), why: 'give it in your name', tier: 0,
            run: () => session.behave({ nodeId: defId, behaviour: { terms: r.data.terms, source: r.data.source, speed: r.data.speed }, participantId: MM.LOCAL_PARTICIPANT, at: Date.now() }),
          });
        });
        // Writing in the loop that reads as verbs: the label's words as the behaviour.
        for (const lid of sum.enclosedIds) {
          const ln = s.nodes.get(lid);
          const said = ln && MM.transcriptOf(ln);
          if (!said) continue;
          const parsed = MM.parseBehaviour(said);
          if (!parsed.behaviour) continue;
          items.unshift({
            key: 'behave-said:' + defId + ':' + lid, group: 'written', groupConf: 0.9, groupWhy: 'read from your handwriting',
            label: name + ': ' + MM.describeBehaviour(parsed.behaviour), why: 'the words beside it, as what it does', tier: 0,
            run: () => session.behave({ nodeId: defId, behaviour: parsed.behaviour, participantId: MM.LOCAL_PARTICIPANT, at: Date.now() }),
          });
        }
      }
      // A definition in the loop: its clock. Play is the bless that lets it run (I9).
      const defs = [...new Set(sum.enclosedIds.filter((id) => s.artifacts.includes(id)).map((id) => definitionOf(s, id)))];
      for (const defId of defs) {
        const c = s.clocks[defId];
        const name = MM.wordOf(s.nodes.get(defId)) || defId;
        items.push({
          key: 'clock:' + defId, group: 'always', groupConf: 0, groupWhy: '',
          label: (c && c.playing ? 'Pause ' : 'Play ') + name,
          why: c && c.playing ? 'hold every ' + name + ' where it is' : 'let every ' + name + ' move — nothing runs until you play it', tier: 0,
          run: () => session.clock({ nodeId: defId, op: c && c.playing ? 'pause' : 'play', at: Date.now() }),
        });
        if (c) items.push({
          key: 'reset:' + defId, group: 'always', groupConf: 0, groupWhy: '',
          label: 'Reset ' + name, why: 'back to t = 0, where they were drawn', tier: 0,
          run: () => session.clock({ nodeId: defId, op: 'reset', at: Date.now() }),
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

  // ===== The blob: verbs packed in rings from the pen tip ====================
  //
  // A palette is a list for artists. This is packing: the two most likely
  // verbs nearest where the hand let go, then four around them, then eight,
  // then twelve — each ring further out — with the text filter at the
  // centre. Likelihood comes from the same reading the engine made (a known
  // name, a written word, a clean form, a concept, always-there verbs), times
  // learned use, so the rings settle toward the hand that uses them. No
  // drill-down: everything is in the rings, and typing filters all of it.
  const USES_KEY = 'mm-palette-uses';
  const uses = store.get(USES_KEY) || {};
  const RINGS = [2, 4, 8, 12];
  const RADII = [56, 122, 196, 268];
  let paletteOrigin = null;

  function baseLikelihood(item) {
    const g = item.group, c = item.groupConf || 0;
    let l;
    // Offers specific to THESE marks sit above every generic verb, whatever
    // the hand has learned to reach for: a match to something you named, the
    // word you just wrote, a model's reading of this group.
    if (g === 'known') l = 1.4;
    else if (g === 'written') l = 1.35;
    else if (g === 'proposed') l = 1.2 + 0.1 * c;
    else if (g === 'clean') l = 0.6 + 0.35 * c;
    else if (g === 'always') l = { name: 0.58, keep: 0.5, make: 0.56, ask: 0.42, draw: 0.38, read: 0.52 }[item.key] || 0.4;
    else l = 0.5 + 0.45 * c; // a concept's conversions
    if (item.tier === 2) l *= 0.85;
    // Learned use lifts the GENERIC verbs toward the hand that uses them. An
    // offer specific to these marks — a known match, the word just written, a
    // model's reading of this group — is not generic, and nothing learned
    // outranks it.
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

  /** Where the rings sit: at the pen, pulled in so the outer ring stays on screen and off the panel. */
  function ringsShown() { return Math.min(innerWidth, innerHeight) < 600 ? 2 : RINGS.length; }
  function placeOrigin() {
    // On a small screen the rings shrink, but never so far that pills collide;
    // the outer rings may run off the edge, and typing still finds them.
    const scale = Math.max(0.72, Math.min(1, (Math.min(innerWidth, innerHeight) - 24) / (2 * RADII[RADII.length - 1] + 120)));
    const rMax = RADII[ringsShown() - 1] * scale + 70;
    let x = lastPen ? lastPen.x : innerWidth / 2, y = lastPen ? lastPen.y : innerHeight / 2;
    x = Math.max(rMax, Math.min(innerWidth - rMax, x));
    y = Math.max(rMax, Math.min(innerHeight - rMax - 30, y));
    const panel = inspectorEl.getBoundingClientRect();
    if (!document.body.classList.contains('panelHidden') && panel.width && x - rMax < panel.right && y < panel.bottom + rMax && y > panel.top - rMax) {
      x = Math.min(innerWidth - rMax, panel.right + rMax);
    }
    return { x, y, scale };
  }

  function renderSummon(s) {
    document.body.classList.toggle('summoning', !!s.summon);
    if (!s.summon) { summonEl.style.display = 'none'; summonEl.className = ''; shownSummonId = null; paletteOrigin = null; return; }
    const sum = s.summon;
    if (shownSummonId !== sum.id) {
      shownSummonId = sum.id;
      paletteItems = rankItems(conversionsFor(s));
      paletteIndex = 0;
      paletteOrigin = placeOrigin();
      summonEl.className = 'blob';
      summonEl.style.display = 'block';
      summonEl.innerHTML = '';
      summonEl.style.left = paletteOrigin.x + 'px';
      summonEl.style.top = paletteOrigin.y + 'px';

      // The centre: the filter, and under it what this acts on and how it
      // decided — a wrong guess should be visible before you act on it.
      const centre = document.createElement('div');
      centre.className = 'centre';
      const filter = document.createElement('input');
      filter.className = 'filter';
      filter.placeholder = 'type to find, or to ask…';
      filter.onkeydown = onPaletteKey;
      filter.oninput = () => paintPalette(filter.value);
      centre.appendChild(filter);
      const scope = document.createElement('div');
      scope.className = 'scope';
      const onArt = sum.onArtifact
        ? ' on <b>' + esc(MM.wordOf(s.nodes.get(sum.onArtifact.artifactId)) || 'artifact') + '</b>' +
          (sum.onArtifact.regionIds.length ? ' · ' + esc(sum.onArtifact.regionIds.join(' ')) : '')
        : '';
      const genre = session.read(sum.enclosedIds).genre;
      scope.innerHTML = '<b>' + sum.enclosedIds.length + ' mark' + (sum.enclosedIds.length === 1 ? '' : 's') + '</b>' + onArt +
        (genre && genre.genre !== 'empty' ? ' · ' + esc(genre.genre) : '') + '<span class="how">' + esc(sum.scopeReasoning) + '</span>';
      centre.appendChild(scope);
      summonEl.appendChild(centre);

      const list = document.createElement('div');
      list.className = 'items';
      summonEl.appendChild(list);
      paintPalette('');
      setTimeout(() => filter.focus(), 0);
    }
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
    const matching = paletteItems.filter((i) =>
      (i.label + ' ' + i.group + ' ' + i.why).toLowerCase().includes(q));
    // Words typed at a definition are its behaviour, when the table can read
    // them: Tier 0, blessed by the act. What it cannot read goes to a model.
    const s = session.getState();
    const sum = s.summon;
    const defs = sum ? [...new Set(sum.enclosedIds.filter((id) => s.artifacts.includes(id)).map((id) => definitionOf(s, id)))] : [];
    if (defs.length && q.length > 3) {
      const parsed = MM.parseBehaviour(query);
      for (const defId of defs) {
        const name = MM.wordOf(s.nodes.get(defId)) || defId;
        if (parsed.behaviour) {
          matching.unshift({
            key: 'behave:' + defId, group: 'written', groupConf: 1, groupWhy: parsed.reasoning,
            label: name + ': ' + MM.describeBehaviour(parsed.behaviour), why: parsed.unparsed.length ? 'could not read: ' + parsed.unparsed.join(', ') : 'from your words — every ' + name + ' will', tier: 0,
            run: () => { session.behave({ nodeId: defId, behaviour: parsed.behaviour, participantId: MM.LOCAL_PARTICIPANT, at: Date.now() }); },
          });
        }
        if (parsed.unparsed.length && agents.length) {
          matching.push({
            key: 'behave-model:' + defId, group: 'always', groupConf: 0, groupWhy: '',
            label: 'Read it with the model', why: 'for what the table could not: ' + parsed.unparsed.join(', '), tier: 2,
            run: () => { agents.forEach((a) => a.behave({ nodeId: defId, words: query, at: Date.now() }).then(() => render(session.getState()))); },
          });
        }
      }
    }
    return matching;
  }

  /**
   * Slots on a ring. Pills are wide and low, so the first ring sits above and
   * below the field and the second on the diagonals — no pill over another —
   * and only the outer rings spread evenly, turned so the most stay on screen.
   */
  function ringSlots(ring, n, r, o) {
    const fixed = ring === 0 ? [-90, 90] : ring === 1 ? [-45, 45, 135, -135] : null;
    if (fixed) {
      return fixed.slice(0, n).map((deg) => ({ x: o.x + r * Math.cos(deg * Math.PI / 180), y: o.y + r * Math.sin(deg * Math.PI / 180) }));
    }
    let best = null;
    for (let k = 0; k < 24; k++) {
      const a0 = (ring === 2 ? 0 : Math.PI / 12) + (k / 24) * Math.PI * 2;
      const pts = [];
      let score = 0;
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * Math.PI * 2;
        const x = o.x + r * Math.cos(a), y = o.y + r * Math.sin(a);
        pts.push({ x, y });
        score += Math.min(x - 70, innerWidth - 70 - x, y - 30, innerHeight - 60 - y);
      }
      if (!best || score > best.score) best = { score, pts };
    }
    return best.pts;
  }

  function paintPalette(query) {
    const list = summonEl.querySelector('.items');
    if (!list) return;
    const shown = visibleItems(query);
    if (paletteIndex >= shown.length) paletteIndex = Math.max(0, shown.length - 1);
    list.innerHTML = '';
    if (shown.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty2';
      empty.textContent = query.trim() && agents.length ? 'nothing matches — Enter asks the model' : 'nothing matches';
      empty.style.left = '0px'; empty.style.top = (RADII[0] * (paletteOrigin ? paletteOrigin.scale : 1)) + 'px';
      list.appendChild(empty);
      return;
    }
    const o = { x: 0, y: 0 }, scale = paletteOrigin ? paletteOrigin.scale : 1;
    const origin = paletteOrigin || { x: innerWidth / 2, y: innerHeight / 2 };
    let i = 0;
    // A phone has room for the two inner rings; the rest is a keystroke away.
    const maxRings = ringsShown();
    for (let ring = 0; ring < maxRings && i < shown.length; ring++) {
      const n = Math.min(RINGS[ring], shown.length - i);
      const slots = ringSlots(ring, n, RADII[ring] * scale, origin);
      for (let k = 0; k < n; k++, i++) {
        const item = shown[i];
        const btn = document.createElement('button');
        btn.className = 'item ring' + ring;
        btn.setAttribute('aria-selected', String(i === paletteIndex));
        btn.title = item.why + (item.groupWhy ? ' — ' + item.groupWhy : '');
        btn.innerHTML = '<span>' + esc(item.label) + '</span>' +
          (item.tier === 0 ? '<span class="tier0">·now</span>' : '') +
          (ring === 0 ? '<span class="why">' + esc(item.why) + '</span>' : '');
        btn.style.left = (slots[k].x - origin.x) + 'px';
        btn.style.top = (slots[k].y - origin.y) + 'px';
        btn.onclick = () => { noteUse(item); item.run(btn); };
        list.appendChild(btn);
      }
    }
    if (i < shown.length) {
      const more = document.createElement('div');
      more.className = 'empty2';
      more.textContent = '+' + (shown.length - i) + ' more — type to find';
      more.style.left = '0px'; more.style.top = (RADII[maxRings - 1] * scale + 34) + 'px';
      list.appendChild(more);
    }
    relax(list, origin);
  }

  /**
   * Packing, not placing. Slots put pills roughly where they belong; this
   * lets them settle: each pill is pulled toward its slot by a spring and
   * pushed off any pill (or the centre field) it overlaps, a few dozen times,
   * until nothing overlaps. Wide pills make room for themselves; the rings
   * bulge where the labels are long. Cheap — a dozen pills, forty steps.
   */
  function relax(list, origin) {
    const pills = [...list.querySelectorAll('.item')].map((el) => {
      const r = el.getBoundingClientRect();
      return { el, w: r.width + 10, h: r.height + 8, x: parseFloat(el.style.left), y: parseFloat(el.style.top), tx: parseFloat(el.style.left), ty: parseFloat(el.style.top) };
    });
    const centre = summonEl.querySelector('.centre');
    const cr = centre ? centre.getBoundingClientRect() : null;
    const field = cr ? { w: cr.width + 16, h: cr.height + 12, x: cr.left + cr.width / 2 - origin.x, y: cr.top + cr.height / 2 - origin.y } : null;
    const bodies = field ? [Object.assign({ fixed: true }, field)] : [];
    const all = bodies.concat(pills);
    for (let step = 0; step < 48; step++) {
      for (const p of pills) { p.x += (p.tx - p.x) * 0.08; p.y += (p.ty - p.y) * 0.08; }
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          const a = all[i], b = all[j];
          const ox = (a.w + b.w) / 2 - Math.abs(a.x - b.x);
          const oy = (a.h + b.h) / 2 - Math.abs(a.y - b.y);
          if (ox <= 0 || oy <= 0) continue;
          // Push apart along the shorter escape; a fixed body (the field) does not move.
          const sx = a.x < b.x ? -1 : 1, sy = a.y < b.y ? -1 : 1;
          const along = ox < oy ? { x: ox, y: 0 } : { x: 0, y: oy };
          const share = a.fixed || b.fixed ? 1 : 0.5;
          if (!a.fixed) { a.x += sx * along.x * share; a.y += sy * along.y * share; }
          if (!b.fixed) { b.x -= sx * along.x * share; b.y -= sy * along.y * share; }
        }
      }
    }
    for (const p of pills) { p.el.style.left = p.x + 'px'; p.el.style.top = p.y + 'px'; }
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
    // The rings fold away; the field takes the centre, where the filter was.
    const list = summonEl.querySelector('.items');
    if (list) list.remove();
    const scope = summonEl.querySelector('.scope');
    if (scope) scope.remove();
    const filter = summonEl.querySelector('input.filter');
    if (filter && filter !== input) filter.replaceWith(input);
    else if (btn && btn.replaceWith) btn.replaceWith(input);
    else (summonEl.querySelector('.centre') || summonEl).appendChild(input);
    input.classList.add('field');
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

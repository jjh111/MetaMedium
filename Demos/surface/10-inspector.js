// ===== inspector =====
// Provides: the panel: a mark, an artifact, a word, the selection.
// Uses: core, render (readRungs), snap, handwriting, models.
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Inspector: what the machine currently holds, and why ==============
  /**
   * THE LADDER of a behaviour: words → sliders → what each verb is doing now →
   * source. The blessed one is what runs; held ones are offers with a reason.
   */
  function behaviourRows(s, node, id) {
    const reps = MM.behavioursOf(node);
    if (!reps.length) {
      return '<div class="row"><span class="k">behaves</span><span class="v">wander, and keep to its spot — the built-in</span></div>' +
        '<div class="why">write what it does beside it, type it in the loop\'s palette, or drag it while the clock runs to act it out</div>';
    }
    let html = '';
    const blessedRep = reps.find((r) => r.data.blessed);
    if (blessedRep) {
      const b = blessedRep.data;
      html += '<div class="row"><span class="k">behaves</span><span class="v">' + esc(MM.describeBehaviour(b)) + '</span></div>';
      html += '<div class="why">' + esc(b.source === 'words' ? 'from the words' : b.source === 'demo' ? 'acted out' : b.source === 'model' ? 'read by a model, given by you' : 'set by hand') + ' · given by ' + esc(nameOfParticipant(blessedRep.source)) + '</div>';
      const shares = liveShares(id);
      b.terms.forEach((t, i) => {
        const share = shares && shares[i] ? Math.round(shares[i].share * 100) : null;
        html += '<div class="slider"><label>' + esc(t.verb + (t.target ? ' ' + (t.target === '*' ? 'anything' : t.target) : '') + (t.params && t.params.only ? ' ' + t.params.only : '')) + '</label>' +
          '<input type="range" min="0" max="2" step="0.05" value="' + (+t.weight).toFixed(2) + '" data-id="' + esc(id) + '" data-term="' + i + '">' +
          '<span class="v">' + (+t.weight).toFixed(2) + (share !== null ? ' · ' + share + '% now' : '') + '</span>' +
          (t.reasoning ? '<div class="why">' + esc(t.reasoning) + '</div>' : '') + '</div>';
      });
      html += '<details class="src"><summary>source</summary><pre>' + esc(MM.behaviourSource(b)) + '</pre></details>';
      html += '<button class="mini" data-act="behave-drop" data-id="' + esc(id) + '">back to the built-in</button>';
    }
    reps.forEach((r, i) => {
      if (r.data.blessed) return;
      const b = r.data;
      const who = nameOfParticipant(r.source);
      const how = b.source === 'demo' ? 'acted out' : b.source === 'model' ? 'read by ' + who : 'from the words, by ' + who;
      html += '<div class="row"><span class="k">offered</span><span class="v">' + esc(MM.describeBehaviour(b)) + '</span></div>';
      html += '<div class="why">' + esc(how) + (typeof b.residual === 'number' ? ' · ' + Math.round((1 - b.residual) * 100) + '% of the path explained' : '') + (b.reasoning ? ' — ' + esc(b.reasoning) : '') + '</div>';
      html += '<div class="acts"><button class="mini" data-act="behave-use" data-id="' + esc(id) + '" data-index="' + i + '">use it</button></div>';
    });
    return html;
  }

  /** The clock's state and its buttons, for any artifact that can run. */
  function clockRows(s, id) {
    const c = s.clocks[id];
    const err = runtimeBroken(id);
    const stateText = !c ? 'not played — nothing of it runs until you play it'
      : c.playing ? 'playing · t = ' + tankTime(id).toFixed(1) + 's' : 'paused' + (c.reason ? ' — ' + c.reason : '') + ' · t = ' + tankTime(id).toFixed(1) + 's';
    return '<div class="row"><span class="k">clock</span><span class="v' + (err ? ' warn' : '') + '">' + esc(stateText) + '</span></div>' +
      '<div class="acts">' +
      (c && c.playing
        ? '<button class="mini" data-act="clock-pause" data-id="' + esc(id) + '">pause</button>'
        : '<button class="mini" data-act="clock-play" data-id="' + esc(id) + '">' + (c ? 'play' : 'play — let it run') + '</button>') +
      '<button class="mini" data-act="clock-reset" data-id="' + esc(id) + '">reset</button></div>';
  }

  /** The kind of an artifact's newest code rep, html by default. */
  function codeKindOf(node) { const r = node && codeRepOf(node); return (r && r.data.kind) || 'html'; }

  function renderInspector(s, id) {
    if (s.summon) return renderSummonScope(s);

    const node = id && s.nodes.get(id);
    if (!node) {
      inspectorEl.innerHTML = '<div class="eyebrow">mark</div>' +
        '<div class="empty">Draw something. Each mark keeps every reading it has; ' +
        'nothing is committed until you bless it.</div>';
      return;
    }

    const isArtifact = s.artifacts.includes(id);
    const isLive = s.live.includes(id);
    const isWordNode = MM.isWord(node);
    const author = MM.strokePointsOf(node)
      ? authorOf(node)
      : ((node.reps.find((r) => r.modality === 'word') || {}).source || MM.LOCAL_PARTICIPANT);
    const authorName = nameOfParticipant(author);
    let html = '<div class="eyebrow">' +
      (isLive ? (codeKindOf(node) === 'html' ? 'living page' : 'living ' + codeKindOf(node)) : isArtifact ? 'artifact' : isWordNode ? 'word' : 'mark') + '</div>';

    html += '<div class="row"><span class="k">id</span><span class="v">' + esc(id) + '</span></div>';
    html += '<div class="row"><span class="k">by</span><span class="v ' +
      (author !== MM.LOCAL_PARTICIPANT ? 'by-agent' : 'by-human') + '">' + esc(authorName) + '</span></div>';

    if (isWordNode) {
      const letters = MM.lettersOf(node);
      html += '<div class="row"><span class="k">letters</span><span class="v">' + letters.length + ' strokes, gathered as one word</span></div>' +
        '<button class="mini" data-act="split" data-id="' + esc(id) + '">not a word — split it</button>';
    }
    if (isArtifact) {
      const members = node.edges.filter((e) => e.rel === 'has-part');
      html += '<div class="row"><span class="k">name</span><span class="v">' + esc(MM.wordOf(node)) + '</span></div>';
      html += '<div class="row"><span class="k">holds</span><span class="v">' + members.length + ' marks</span></div>';
      const sig = (node.reps.find((r) => r.modality === 'signature') || {}).data;
      if (sig) {
        html += '<div class="row"><span class="k">sig</span><span class="v">' +
          esc(sig.shapes ? MM.describeStructure(sig) : Object.entries(sig).map(([k, v]) => v + '×' + k).join(' + ')) + '</span></div>';
      }
      const ex = (node.reps.find((r) => r.modality === 'examples') || {}).data;
      if (ex && (ex.accepted.length || ex.rejected.length)) {
        html += '<div class="row"><span class="k">corrected</span><span class="v">' +
          ex.accepted.length + ' is, ' + ex.rejected.length + ' is not</span></div>';
      }
      const inst = node.edges.find((e) => e.rel === 'instance-of');
      if (inst) html += '<div class="row"><span class="k">same as</span><span class="v">' + esc(inst.to) + '</span></div>';
    }

    // The code plane. Every attempt is kept and attributed; the newest is what
    // renders. Generation is a proposal like any other reading (MVP.md §7).
    const codes = node.reps.filter((r) => r.modality === 'code');
    if (codes.length) {
      const newest = codes[codes.length - 1];
      html += '<div class="sep"></div><div class="eyebrow">code' +
        (codes.length > 1 ? ' <span class="srccount">' + codes.length + ' versions</span>' : '') + '</div>';
      html += '<div class="row"><span class="k">built by</span><span class="v by-agent">' +
        esc(nameOfParticipant(newest.source)) + '</span></div>';
      html += '<div class="row"><span class="k">size</span><span class="v">' +
        newest.data.code.length + ' chars</span></div>';
      if (newest.data.prompt) html += '<div class="why">“' + esc(newest.data.prompt) + '”</div>';

      const kind = newest.data.kind || 'html';
      html += '<div class="row"><span class="k">kind</span><span class="v">' + esc(kind) + '</span></div>';
      if (kind === 'html') {
        const regions = MM.regionsOf(node, s.nodes);
        html += '<div class="row"><span class="k">regions</span><span class="v">' +
          regions.map((r) => r.id).join(' ') + '</span></div>';
      } else {
        const parts = MM.addressablesOf(kind, newest.data.code).filter((r) => r.depth === 0);
        html += '<div class="row"><span class="k">addresses</span><span class="v">' +
          esc(parts.map((r) => r.id).join(' ') || 'nothing yet') + '</span></div>';
      }
      if (codes.length > 1) html += '<div class="why">Earlier versions are kept.</div>';
      // The clock: nothing runs until a hand plays it, and a stop says why.
      if (kind === 'js') {
        html += clockRows(s, id);
      }
    }
    // A frame: what it holds and how it is wired, each connection with its reason and what it carries now.
    if (isArtifact && MM.isFrame(node)) {
      const f = MM.frameOfNode(node);
      const r = MM.resolveFrame(f, s.nodes);
      html += '<div class="sep"></div><div class="eyebrow">frame</div>';
      html += '<div class="row"><span class="k">members</span><span class="v">' + esc(f.members.map((m) => MM.wordOf(s.nodes.get(m)) || m).join(', ')) + '</span></div>';
      if (!f.connections.length) html += '<div class="why">no connections — nothing among them offers a value another accepts</div>';
      r.carried.forEach((c) => {
        html += '<div class="row"><span class="k">wire</span><span class="v">' + esc((MM.wordOf(s.nodes.get(c.connection.from.id)) || c.connection.from.id) + '.' + c.connection.from.port + ' → ' + (MM.wordOf(s.nodes.get(c.connection.to.id)) || c.connection.to.id) + '.' + c.connection.to.port) +
          (c.value !== undefined ? ' = ' + esc(typeof c.value === 'number' ? (+c.value.toFixed(3)).toString() : String(c.value)) : '') + '</span></div>';
        if (c.connection.reasoning) html += '<div class="why">' + esc(c.connection.reasoning) + '</div>';
      });
      const files = exportFrameFiles(id);
      if (files) html += '<div class="row"><span class="k">exports as</span><span class="v">' + esc(Object.keys(files).join(', ')) + '</span></div>';
    }
    // A control: its value is where the knob sits.
    if (isArtifact && codes.length && (codes[codes.length - 1].data.kind === 'control')) {
      const c = MM.controlOf(node, s.nodes);
      html += '<div class="row"><span class="k">value</span><span class="v">' + (c ? esc((+c.value.toFixed(3)).toString() + ' of ' + c.min + '–' + c.max) : 'no knob on the track') + '</span></div>';
      if (c) html += '<div class="why">' + esc(c.reasoning) + ' — drag the knob to set it</div>';
    }
    // A definition without code has a clock too: play, and its instances move
    // by the built-in behaviour until words or a hand give it another.
    if (isArtifact && !codes.length && !MM.isFrame(node)) {
      html += '<div class="sep"></div><div class="eyebrow">tank</div>';
      const inst = tankCount(s, id);
      html += '<div class="row"><span class="k">bodies</span><span class="v">' + inst.total + (inst.held ? ' (' + inst.held + ' held, unblessed)' : '') + '</span></div>';
      html += clockRows(s, id);
      html += behaviourRows(s, node, id);
    }

    // THE LADDER. Every rung a mark has climbed, with why at each one — ink,
    // shape, what it plays, what it became. Each rung keeps the one below it,
    // so a wrong reading at the top never destroys the bottom (KEYFRAMES.md §3).
    {
      const rung = readRungs(s);
      const role = rung.roles.get(id);
      const shapeRead = MM.interpretationsOf(node, s.nodes).filter((r) => r.tier === 0)[0];
      const rows = [];
      const fpx = MM.fingerprintOf(node);
      if (fpx) {
        const scaleRep = (node.reps.find((r) => r.modality === 'stroke') || {}).data || {};
        rows.push(['ink', fpx.pointCount + ' points' + (scaleRep.scale ? ' at ' + (1 / scaleRep.scale).toFixed(1) + '×' : ''), '']);
      } else if (isArtifact) {
        rows.push(['ink', node.edges.filter((e) => e.rel === 'has-part').length + ' marks held', '']);
      }
      if (shapeRead) rows.push(['shape', shapeRead.label + ' ' + shapeRead.weight.toFixed(2), shapeRead.reasoning || '']);
      // Clean form: held, offered, or neither — and the one-mark way to take it up.
      const clean = MM.cleanOf(node);
      const offer = snapOffers.get(id);
      if (clean) {
        rows.push(['clean', 'drawn as a ' + clean.shape, clean.reasoning,
          '<button class="mini" data-act="raw" data-id="' + esc(id) + '">show the ink</button>']);
      } else if (offer) {
        rows.push(['clean?', 'could be a ' + offer.shape, offer.reasoning,
          '<button class="mini" data-act="snap" data-id="' + esc(id) + '">draw it clean</button>']);
      } else if (shapeRead && !isArtifact && snapMode !== 'off' && s.pendingLassoId !== id) {
        // Not offered — and the reason is the useful part: a reading that is
        // too weak or too close to another is exactly what a redraw would hide.
        const why = MM.snapReading(node, s.nodes);
        if (why.shape !== 'text') rows.push(['clean?', 'not offered', why.reasoning]);
      }
      if (role) {
        const dir = role.direction ? ' ' + role.direction.from + ' → ' + role.direction.to : '';
        rows.push(['plays', role.role + dir, role.reasoning]);
      }
      // The code rung: the element this mark became, if it is inside a live artifact.
      const owner = s.live.map((aid) => s.nodes.get(aid)).find((a) => a && a.edges.some((e) => e.rel === 'has-part' && e.to === id));
      const ownCode = isLive ? codes[codes.length - 1] : (owner ? owner.reps.filter((r) => r.modality === 'code').pop() : null);
      if (ownCode) {
        const regs = (ownCode.data.regions || []);
        const mine = isLive ? null : regs.find((r) => r.nodeId === id);
        const m = mine && String(ownCode.data.code).match(new RegExp('<([a-z]+)[^>]*data-region="' + mine.id + '"'));
        rows.push(['code', isLive
          ? (codeKindOf(node) !== 'html' ? 'a running ' + codeKindOf(node) + (codeKindOf(node) === 'js' ? ' — code that runs when played' : '') : rung.genre && (rung.genre.genre === 'graph' || rung.genre.genre === 'mixed') ? 'a running diagram' : 'a running page')
          : (m ? '<' + m[1] + ' data-region="' + mine.id + '">' : 'part of ' + (MM.wordOf(owner) || 'an artifact')),
          isLive && rung.genre ? rung.genre.reasoning : '']);
      }
      if (rows.length) {
        html += '<div class="sep"></div><div class="eyebrow">reading</div><div class="ladder">';
        rows.forEach(([k, v, why, action]) => {
          html += '<div class="row"><span class="k">' + esc(k) + '</span><span class="v">' + esc(v) + '</span></div>';
          if (why) html += '<div class="why">' + esc(why) + '</div>';
          if (action) html += action;
        });
        html += '</div>';
      }
    }

    // Held interpretations — EVERY reading, from EVERY source, grouped by who
    // said it. Tiers are simultaneous, not an escalation ladder.
    const reads = MM.interpretationsOf(node, s.nodes);
    if (reads.length) {
      const groups = MM.bySource(reads);
      const gap = MM.disagreement(reads);

      html += '<div class="sep"></div><div class="eyebrow">read as' +
        (groups.length > 1 ? ' <span class="srccount">' + groups.length + ' sources</span>' : '') + '</div>';

      if (gap && gap.crossSource) {
        html += '<div class="gap">sources differ: ' +
          gap.labels.slice(0, 3).map((l) => esc(l.label)).join(' vs ') + '</div>';
      }

      html += '<div class="reads">';
      groups.forEach((g) => {
        const tier = g.interpretations[0].tier;
        html += '<div class="srchead"><span class="by">' + esc(g.label) + '</span>' +
          '<span class="tier">tier ' + tier + '</span></div>';
        g.interpretations.forEach((r, i) => {
          html += '<div class="read' + (i === 0 ? ' top' : '') + (r.blessed ? ' blessed' : '') + '">' +
            '<span class="type">' + esc(r.label) + '</span>' +
            '<span class="w">' + r.weight.toFixed(2) + '</span></div>';
          if (r.reasoning) html += '<div class="why">' + esc(r.reasoning) + '</div>';
        });
      });
      html += '</div>';
    }

    // What the writing says — every transcript, attributed. The one reading
    // that came in as pixels, and the model that gave it is named.
    if ((MM.strokePointsOf(node) || MM.isWord(node)) && !isArtifact && isWriting(node)) {
      const said = MM.transcriptsOf(node);
      html += '<div class="sep"></div><div class="eyebrow">handwriting</div>';
      if (said.length) {
        html += '<div class="reads">';
        said.forEach((t, i) => {
          html += '<div class="read' + (i === 0 ? ' top' : '') + '"><span class="type">“' + esc(t.text) + '”</span>' +
            '<span class="w">' + t.confidence.toFixed(2) + '</span></div>' +
            '<div class="why">by ' + esc(nameOfParticipant(t.source)) + '</div>';
        });
        html += '</div>';
        if (seeing().length) html += '<button class="mini" data-act="read" data-id="' + esc(id) + '">read it again</button>';
      } else if (seeing().length) {
        html += '<div class="why">not read yet</div><button class="mini" data-act="read" data-id="' + esc(id) + '">read it</button>';
      } else {
        html += '<div class="why">writing, unread — needs a model that can see (add one that says “sees”)</div>';
      }
    }

    // The engaging relations and the wires — not the peer/alignment ones,
    // which are true of nearly everything and would drown the list.
    const rels = node.edges.filter((e) =>
      ['near', 'touching', 'crossing', 'contains', 'inside', 'connects', 'connected-by', 'points-to', 'points-from', 'part-of'].includes(e.rel));
    if (rels.length) {
      html += '<div class="sep"></div><div class="eyebrow">relations</div>';
      const seen = new Set();
      rels.forEach((e) => {
        const key = e.rel + e.to;
        if (seen.has(key)) return;
        seen.add(key);
        const label = e.rel === 'part-of' ? 'part of ' + (MM.wordOf(s.nodes.get(e.to)) || e.to) : e.rel + ' ' + e.to;
        html += '<div class="row"><span class="k">' + (e.blessed ? 'blessed' : 'held') + '</span>' +
          '<span class="v">' + esc(label) + '</span></div>';
      });
    }

    // The maths: what follows from the reading, measured from the ink. A
    // circle has a radius; a triangle's angles add to 180°. Arithmetic on a
    // reading, not a reading — no confidence, nothing to argue with.
    const maths = !isArtifact && MM.strokePointsOf(node) ? MM.measure(node, s.nodes) : null;
    if (maths && maths.measures.length) {
      html += '<div class="sep"></div><div class="eyebrow">maths <span class="srccount">' + esc(maths.shape) + '</span></div>';
      const shown = maths.measures.filter((x) => x.key !== 'centreY');
      shown.forEach((x) => {
        const v = x.key === 'centre' && x.at ? '(' + Math.round(x.at.x) + ', ' + Math.round(x.at.y) + ')'
          : (Number.isFinite(x.value) ? x.value.toLocaleString('en-US') : '∞') + esc(x.unit);
        html += '<div class="row"><span class="k">' + esc(x.label) + '</span><span class="v">' + v + '</span></div>';
      });
    }

    const fp = MM.fingerprintOf(node);
    if (fp) {
      html += '<div class="sep"></div><div class="eyebrow">measured</div>' +
        '<div class="row"><span class="k">straight</span><span class="v">' + fp.straightness.toFixed(3) + '</span></div>' +
        '<div class="row"><span class="k">corners</span><span class="v">' + fp.corners + '</span></div>' +
        '<div class="row"><span class="k">closed</span><span class="v">' + (fp.isClosed ? 'yes' : 'no') + '</span></div>' +
        '<div class="row"><span class="k">size</span><span class="v">' + Math.round(fp.size) + 'px</span></div>';
    }

    inspectorEl.innerHTML = html;
  }

  function renderSummonScope(s) {
    const sum = s.summon;
    const reading = session.read(sum.enclosedIds);
    let html = '<div class="eyebrow">selection</div>';

    html += '<div class="row"><span class="k">holds</span><span class="v">' +
      sum.enclosedIds.length + ' mark' + (sum.enclosedIds.length === 1 ? '' : 's') + '</span></div>';
    html += '<div class="row"><span class="k">scope</span><span class="v">' + esc(sum.scopeSource) + '</span></div>';
    html += '<div class="why">' + esc(sum.scopeReasoning) + '</div>';
    // Which way this will compile — a page or a diagram — and what each mark plays.
    if (reading.genre) {
      html += '<div class="row"><span class="k">genre</span><span class="v">' + esc(reading.genre.genre) + '</span></div>';
      html += '<div class="why">' + esc(reading.genre.reasoning) + '</div>';
    }
    if (reading.roles && reading.roles.length) {
      html += '<div class="sep"></div><div class="eyebrow">roles</div>';
      reading.roles.forEach((r) => {
        const dir = r.direction ? ' ' + r.direction.from + ' → ' + r.direction.to : '';
        html += '<div class="row"><span class="k">' + esc(r.role) + '</span><span class="v">' + esc(r.id + dir) + '</span></div>';
      });
    }

    if (sum.onArtifact) {
      const art = s.nodes.get(sum.onArtifact.artifactId);
      html += '<div class="row"><span class="k">on</span><span class="v">' +
        esc(MM.wordOf(art) || sum.onArtifact.artifactId) + '</span></div>';
      html += '<div class="row"><span class="k">covers</span><span class="v">' +
        (sum.onArtifact.regionIds.length ? esc(sum.onArtifact.regionIds.join(', ')) : 'the whole page') + '</span></div>';
    }

    // The concepts these marks read as. Tier 0, from measured relations — this
    // is what the palette is offering from, so it is what the inspector must
    // explain. Several at once, ranked, like every other reading in the engine.
    if (reading.concepts.length) {
      html += '<div class="sep"></div><div class="eyebrow">read as' +
        (reading.concepts.length > 1 ? ' <span class="srccount">' + reading.concepts.length + ' concepts</span>' : '') +
        '</div><div class="reads">';
      reading.concepts.forEach((c, i) => {
        html += '<div class="read' + (i === 0 ? ' top' : '') + '">' +
          '<span class="type">' + esc(c.concept) + '</span>' +
          '<span class="w">' + c.confidence.toFixed(2) + '</span></div>';
        html += '<div class="why">' + esc(c.reasoning) + '</div>';
        if (c.roles) {
          for (const role of Object.keys(c.roles)) {
            html += '<div class="row"><span class="k">' + esc(role) + '</span>' +
              '<span class="v">' + esc(c.roles[role].join(', ')) + '</span></div>';
          }
        }
      });
      html += '</div>';
    } else {
      html += '<div class="sep"></div><div class="why">No concept matched yet.</div>';
    }

    // The relations underneath, which is where those readings came from.
    const rels = reading.relations.filter((r, i, all) =>
      all.findIndex((x) => x.kind === r.kind && x.from === r.from && x.to === r.to) === i);
    if (rels.length) {
      const byKind = {};
      rels.forEach((r) => { byKind[r.kind] = (byKind[r.kind] || 0) + 1; });
      html += '<div class="sep"></div><div class="eyebrow">relations</div>';
      Object.keys(byKind).sort().forEach((kind) => {
        html += '<div class="row"><span class="k">' + esc(kind) + '</span>' +
          '<span class="v">' + byKind[kind] + '</span></div>';
      });
      const strongest = rels.slice().sort((a, b) => b.strength - a.strength)[0];
      if (strongest) html += '<div class="why">' + esc(strongest.kind + ': ' + strongest.reasoning) + '</div>';
    }

    inspectorEl.innerHTML = html;
  }

  // Debug handle. This is a reference surface for the engine, so reading the
  // graph from the console is a feature, not a leak.

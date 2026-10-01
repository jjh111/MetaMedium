// ===== handwriting =====
// Provides: handwriting: inkImage, isWriting, isRead, readOne, readLine (a line of writing as one image), readWriting; the auto-read preference (off by default);
//   (V1-PLAN J5) whyNoReader — which joined models cannot read writing, and why — and keepRead, a read kept for a model that can see.
// Uses: core (prefs), models (agents, withWork, factsOf, keepAsk, noteOutcome, modelWords), render, input (say), seat (isSeatAgent: the seat reads while seated),
//   seats (03-seats.js: resolveReaders — who reads, by seat; seatModels in 04-seatpane.js).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () Ellipsis)();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Handwriting: the one thing sent as pixels =========================
  //
  // A mark that reads as writing is rendered on its own — dark ink on a light
  // ground, nothing else on the board — and handed to every model that can
  // SEE, once. What comes back is held on the mark as transcripts, attributed
  // and ranked, never blessed (v7 Stage E). A model that cannot see is never
  // asked; with none present the mark simply stays "text".
  /**
   * Who READS: the reader seat when the hand chose one (I7) — a model that sees, quick and exact, asked for
   * reading alone — else, as before, Claude Code while it is seated (V1-PLAN J4: sitting down there is a
   * deliberate act that says *ask me*), else the writer if it sees, else the smallest model that sees, not
   * every one. Reading a word is a small job, and a 27B model takes minutes at it while a 0.8B answers in
   * seconds. The order is 03-seats.js's `resolveReaders`, tested in Node.
   */
  function readers() {
    return resolveReaders(seatModels()).who.map((id) => agents.find((a) => a.id === id)).filter(Boolean);
  }
  /** The models that read now — for the panel's *read it* and the like: who can answer a read, by seat. */
  const seeing = () => readers();
  // Reading as you write is a preference, off by default: a model is asked
  // when you say *read* (§6.3). On, every mark that reads as writing is handed
  // to the models that can see as it lands.
  let autoRead = prefs.get('autoRead', false) === true;
  function setAutoRead(on) {
    autoRead = !!on;
    prefs.set('autoRead', autoRead);
    if (autoRead) readWriting(session.getState());
    syncTiles();
  }
  const askedToRead = new Set(); // node ids handed out already (per model join, see below)
  // A mark read as part of a line whose words did not split cleanly: the line's
  // text is held on the first mark, and this one was read with it. Runtime only.
  const readWith = new Map();
  const isRead = (node) => !!MM.transcriptOf(node) || readWith.has(node.id);

  /** The ink of a mark, as runs of points: a word is several strokes, a cursive word is one. */
  function runsOf(node) {
    return MM.isWord(node)
      ? MM.lettersOf(node).map((id) => state.nodes.get(id)).filter(Boolean).map((n) => MM.strokePointsOf(n)).filter((p) => p && p.length > 1)
      : [MM.strokePointsOf(node)].filter((p) => p && p.length > 1);
  }
  function inkImage(node, size) { return inkImageOf(runsOf(node), size); }
  function inkImageOf(runs, size) {
    if (!runs.length) return null;
    const pts = runs.flat();
    const b = MM.getBounds(pts);
    const w = Math.max(1, b.maxX - b.minX), h = Math.max(1, b.maxY - b.minY);
    const S = size || 320, pad = 16;
    const k = Math.min((S - pad * 2) / w, (S / 2 - pad * 2) / h);
    const cw = Math.round(w * k + pad * 2), ch = Math.round(h * k + pad * 2);
    const off = document.createElement('canvas');
    off.width = cw; off.height = ch;
    const c = off.getContext('2d');
    c.fillStyle = '#fff'; c.fillRect(0, 0, cw, ch);
    c.strokeStyle = '#111'; c.lineWidth = Math.max(2, 3 * k); c.lineCap = 'round'; c.lineJoin = 'round';
    for (const run of runs) {
      c.beginPath();
      run.forEach((p, i) => { const x = pad + (p.x - b.minX) * k, y = pad + (p.y - b.minY) * k; i ? c.lineTo(x, y) : c.moveTo(x, y); });
      c.stroke();
    }
    return off.toDataURL('image/png');
  }

  /** Writing: the shape rung's own reading of the mark is `text` — core's one test (`MM.isWritingMark`), the tools' too. */
  function isWriting(node) { return MM.isWritingMark(node, state.nodes); }

  function readOne(node, force) {
    const who = readers();
    if (!who.length) return false;
    const key = node.id;
    if (!force && askedToRead.has(key)) return false;
    askedToRead.add(key);
    const image = inkImage(node);
    if (!image) return false;
    who.forEach((agent) => {
      withWork('write:' + agent.id + ':' + node.id, [node.id], modelWords(agent) + ' · reading the writing', agent.read({ nodeId: node.id, image: image, at: Date.now() })).then((res) => {
        // The row keeps what the read came to; the status line says it once (J5).
        noteOutcome(agent, res.ok, res.ok ? 'read “' + res.transcripts[0].text + '”' : res.error);
        say(res.ok
          ? modelWords(agent) + ' read “' + res.transcripts[0].text + '”' + (res.transcripts.length > 1 ? ' (or ' + res.transcripts.slice(1).map((t) => '“' + t.text + '”').join(', ') + ')' : '')
          : modelWords(agent) + ' could not read it — ' + res.error);
        if (!res.ok && res.raw) window.__mm.lastRaw = res.raw;
        render(session.getState());
        refreshPalette();
      });
    });
    return true;
  }

  /**
   * A line of writing, read as one image (SURFACE-v10-PLAN D3): words gathered
   * by nearness are handed over together, so the reader has the phrase. When
   * the reply has one word per mark, each lands on its own mark; otherwise
   * the whole line is held on the first mark and the rest were read with it.
   */
  function readLine(ids, force) {
    const who = readers();
    if (!who.length) return false;
    const s = session.getState();
    const nodes = ids.map((id) => s.nodes.get(id)).filter(Boolean);
    if (nodes.length < 2) return nodes.length === 1 ? readOne(nodes[0], force) : false;
    const key = 'line:' + ids.join(',');
    if (!force && askedToRead.has(key)) return false;
    askedToRead.add(key);
    const image = inkImageOf(nodes.flatMap(runsOf));
    if (!image) return false;
    const first = nodes[0];
    who.forEach((agent) => {
      withWork('write:' + agent.id + ':' + first.id, ids, modelWords(agent) + ' · reading the line', agent.read({ nodeId: first.id, about: nodes.map((n) => n.id), image: image, at: Date.now(), hold: false })).then((res) => {
        noteOutcome(agent, res.ok, res.ok ? 'read “' + res.transcripts[0].text + '”' : res.error);
        if (res.ok) {
          const top = res.transcripts[0];
          const words = top.text.trim().split(/\s+/);
          const at = Date.now();
          if (words.length === nodes.length) {
            nodes.forEach((n, i) => session.propose({ participantId: agent.id, nodeId: n.id, edges: [], reps: [{ modality: 'transcript', data: { text: words[i], line: top.text }, confidence: top.confidence }], at: at }));
          } else {
            session.propose({ participantId: agent.id, nodeId: first.id, edges: [], reps: res.transcripts.map((t) => ({ modality: 'transcript', data: { text: t.text }, confidence: t.confidence })), at: at });
            nodes.slice(1).forEach((n) => readWith.set(n.id, first.id));
          }
          say(modelWords(agent) + ' read “' + top.text + '”' + (res.transcripts.length > 1 ? ' (or ' + res.transcripts.slice(1).map((t) => '“' + t.text + '”').join(', ') + ')' : ''));
        } else {
          say(modelWords(agent) + ' could not read it — ' + res.error);
          if (res.raw) window.__mm.lastRaw = res.raw;
        }
        render(session.getState());
        refreshPalette();
      });
    });
    return true;
  }

  function readWriting(s) {
    if (!readers().length) return;
    const ids = s.contentIds.filter((id) => !s.artifacts.includes(id));
    for (const aid of s.artifacts) for (const e of s.nodes.get(aid).edges) if (e.rel === 'has-part') ids.push(e.to);
    for (const id of ids) {
      const node = s.nodes.get(id);
      if (!node || s.pendingLassoId === id || MM.transcriptOf(node) || !(MM.strokePointsOf(node) || MM.isWord(node))) continue;
      if (isWriting(node)) readOne(node, false);
    }
  }

  // ===== Writing with no model that can see (V1-PLAN J5) =====================
  // *Read the writing* used to open the models pane and nothing else, which
  // looked exactly like "it won't send": the model joined could not see, and
  // nothing said so. Now it says which joined models cannot, and why — what
  // each one's provider said it takes, or that its id was all there was — and
  // the read is kept: the moment a model that can see joins, it runs.
  /** Why no joined model reads writing: each one, and what its provider said it takes (or why that is a guess). */
  function whyNoReader() {
    const models = agents.filter((a) => a.config && (a.config.kind === 'openai-compatible' || a.config.kind === 'anthropic'));
    const others = agents.filter((a) => !models.includes(a));
    if (!agents.length) return 'Read the writing needs a model that can see — none is joined';
    const said = models.map((a) => { const f = factsOf.get(a.id); return modelWords(a) + ' reads text only' + (f && f.because ? ' (' + f.because + ')' : ''); })
      .concat(others.map((a) => modelWords(a) + ' is not asked to read writing'));
    return 'Read the writing needs a model that can see — ' + said.join('; ');
  }
  /** Keep a read of these marks for a model that can see (a line as one image, the rest one by one); said once, run when one joins. */
  function keepRead(d) {
    const line = (d.line || []).slice(), single = (d.single || []).slice();
    return keepAsk({
      what: 'Read the writing', needs: 'sees', need: 'needs a model that can see', ids: line.concat(single),
      sentence: whyNoReader() + ' — kept: it runs when one that sees joins',
      run: (live) => {
        const s = session.getState();
        const l = line.filter((id) => live.includes(id));
        if (l.length) readLine(l, true);
        single.filter((id) => live.includes(id)).forEach((id) => readOne(s.nodes.get(id), true));
      },
    });
  }

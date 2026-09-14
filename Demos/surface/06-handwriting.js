// ===== handwriting =====
// Provides: handwriting: inkImage, isWriting, isRead, readOne, readLine (a line of writing as one image), readWriting; the auto-read preference (off by default).
// Uses: core (prefs), models (agents, withWork), render, input (say).
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
  const seeing = () => agents.filter((a) => a.config.vision);
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

  function isWriting(node) {
    const shape = MM.interpretationsOf(node, state.nodes).filter((r) => r.tier === 0)[0];
    return !!shape && shape.label === 'text';
  }

  function readOne(node, force) {
    const readers = seeing();
    if (!readers.length) return false;
    const key = node.id;
    if (!force && askedToRead.has(key)) return false;
    askedToRead.add(key);
    const image = inkImage(node);
    if (!image) return false;
    readers.forEach((agent) => {
      withWork('write:' + agent.id + ':' + node.id, [node.id], agent.name + ' · reading the writing', agent.read({ nodeId: node.id, image: image, at: Date.now() })).then((res) => {
        say(res.ok
          ? agent.name + ' read “' + res.transcripts[0].text + '”' + (res.transcripts.length > 1 ? ' (or ' + res.transcripts.slice(1).map((t) => '“' + t.text + '”').join(', ') + ')' : '')
          : agent.name + ' could not read it (' + res.error + ')');
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
    const readers = seeing();
    if (!readers.length) return false;
    const s = session.getState();
    const nodes = ids.map((id) => s.nodes.get(id)).filter(Boolean);
    if (nodes.length < 2) return nodes.length === 1 ? readOne(nodes[0], force) : false;
    const key = 'line:' + ids.join(',');
    if (!force && askedToRead.has(key)) return false;
    askedToRead.add(key);
    const image = inkImageOf(nodes.flatMap(runsOf));
    if (!image) return false;
    const first = nodes[0];
    readers.forEach((agent) => {
      withWork('write:' + agent.id + ':' + first.id, ids, agent.name + ' · reading the line', agent.read({ nodeId: first.id, image: image, at: Date.now(), hold: false })).then((res) => {
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
          say(agent.name + ' read “' + top.text + '”' + (res.transcripts.length > 1 ? ' (or ' + res.transcripts.slice(1).map((t) => '“' + t.text + '”').join(', ') + ')' : ''));
        } else {
          say(agent.name + ' could not read it (' + res.error + ')');
          if (res.raw) window.__mm.lastRaw = res.raw;
        }
        render(session.getState());
        refreshPalette();
      });
    });
    return true;
  }

  function readWriting(s) {
    if (!seeing().length) return;
    const ids = s.contentIds.filter((id) => !s.artifacts.includes(id));
    for (const aid of s.artifacts) for (const e of s.nodes.get(aid).edges) if (e.rel === 'has-part') ids.push(e.to);
    for (const id of ids) {
      const node = s.nodes.get(id);
      if (!node || s.pendingLassoId === id || MM.transcriptOf(node) || !(MM.strokePointsOf(node) || MM.isWord(node))) continue;
      if (isWriting(node)) readOne(node, false);
    }
  }

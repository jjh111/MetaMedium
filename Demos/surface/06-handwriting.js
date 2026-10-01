// ===== handwriting =====
// Provides: handwriting: inkImage, isWriting, isRead, readOne, readLine (a line of writing as one image), readWriting; the auto-read preference (off by default);
//   (V1-PLAN J5) whyNoReader — which joined models cannot read writing, and why — and keepRead, a read kept for a model that can see.
//   (PLAN-IPAD-NOTES I8) reading my notes: readLines (every line of the marks given, drawn from its own strokes on one numbered
//   sheet, asked in batches of a sheet's lines, progress on the marks, Esc stops), readPictureFrom (a picture's text, beside it),
//   boardWriting (the board's lines, for *Read the board*), linesPanel (what each line said, for the panel), readScopeHooks
//   (where a region's marks join a read), readStats (what each call cost).
// Uses: core (prefs), models (agents, withWork, workSignal, factsOf, keepAsk, noteOutcome, modelWords), render (logKey), input (say, flash), seat (isSeatAgent: the seat reads while seated),
//   seats (03-seats.js: resolveReaders — who reads, by seat; seatModels, agentById in 04-seatpane.js), images (assetGet), text (TEXT_DIR, TEXT_W, TEXT_H, textCount).
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
    return resolveReaders(seatModels()).who.map((key) => agents.find((a) => agentKey(a) === key)).filter(Boolean);
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
      withWork('write:' + agentKey(agent) + ':' + node.id, [node.id], modelWords(agent) + ' · reading the writing', agent.read({ nodeId: node.id, image: image, at: Date.now() })).then((res) => {
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
      withWork('write:' + agentKey(agent) + ':' + first.id, ids, modelWords(agent) + ' · reading the line', agent.read({ nodeId: first.id, about: nodes.map((n) => n.id), image: image, at: Date.now(), hold: false })).then((res) => {
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
  /** Why no joined model reads writing: each one, and what its provider said it takes (or why that is a guess). `what`: the act that asked. */
  function whyNoReader(what) {
    const models = agents.filter((a) => a.config && (a.config.kind === 'openai-compatible' || a.config.kind === 'anthropic'));
    const others = agents.filter((a) => !models.includes(a));
    what = what || 'Read the writing';
    if (!agents.length) return what + ' needs a model that can see — none is joined';
    const said = models.map((a) => { const f = factsOf.get(agentKey(a)); return modelWords(a) + ' reads text only' + (f && f.because ? ' (' + f.because + ')' : ''); })
      .concat(others.map((a) => modelWords(a) + ' is not asked to read writing'));
    return what + ' needs a model that can see — ' + said.join('; ');
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


  // ===== Reading my notes (PLAN-IPAD-NOTES I8) =================================
  // *Read these* / *Read the board*: every LINE of handwriting among the marks held (or on the board) is drawn
  // cleanly from its own strokes — core's `sheetOf` says where every point goes, this draws it — onto ONE sheet
  // of numbered rows at one line height, and the sheet goes to the reader seat in a batch: a call asks at most a
  // sheet's lines (`MM.LINES_PER_CALL`), the calls one after another (a local server answers one at a time, and
  // Esc stops the rest), each with its dots on its own marks and its label in the status line. One deliberate
  // act is one batch; nothing on draw. Lines already read are skipped unless asked again. What each call
  // cost — the lines, the payload, the time a line — is kept for the reader's row (`noteOutcome`) and for
  // `window.__mm.lastReads()`; what each line came to is kept for the panel (`linesSaid`).
  const readStats = [];                 // runtime: { kind, lines, ok, bytes, ms, perLine, w, h, said: [{ n, ok, error }] }
  const linesSaid = new Map();          // mark id → { n, of, ok, error, at } — the first mark of a line it was said of
  /** Where a region's marks join a read (I5 puts one here): each `(ids) => ids` may widen what is held to what the region holds. */
  const readScopeHooks = [];
  const readMark = (id) => { const n = session.getState().nodes.get(id); return !!n && isRead(n); };
  /** What a read of these marks reads: the marks, and what any region held among them stands for. */
  function readScopeOf(ids) {
    let out = ids.slice();
    for (const hook of readScopeHooks) { try { out = hook(out) || out; } catch (err) { /* a region's hook never stops a read */ } }
    return [...new Set(out)];
  }
  const dataBytes = (url) => Math.round((url.length - url.indexOf(',') - 1) * 3 / 4);
  const kb = (n) => (n < 1024 * 10 ? (n / 1024).toFixed(1) : String(Math.round(n / 1024))) + ' KB';

  /** The sheet, drawn exactly as core said: white ground, a rule between rows, the numerals, the ink at one width. */
  function sheetImage(sheet) {
    const off = document.createElement('canvas');
    off.width = sheet.width; off.height = sheet.height;
    const c = off.getContext('2d');
    c.fillStyle = '#fff'; c.fillRect(0, 0, off.width, off.height);
    c.strokeStyle = '#d6d6d6'; c.lineWidth = 1;
    for (const r of sheet.rows.slice(1)) { c.beginPath(); c.moveTo(0, r.y + 0.5); c.lineTo(sheet.width, r.y + 0.5); c.stroke(); }
    c.fillStyle = '#555'; c.font = '600 26px sans-serif'; c.textBaseline = 'middle';
    for (const r of sheet.rows) c.fillText(r.n + '.', r.label.x, r.label.y);
    c.strokeStyle = '#111'; c.lineWidth = sheet.lineWidth; c.lineCap = 'round'; c.lineJoin = 'round';
    for (const r of sheet.rows) for (const run of r.strokes) {
      c.beginPath();
      run.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
      c.stroke();
    }
    return off.toDataURL('image/png');
  }

  /** The lines of these marks that a read would ask for: all of them when asked again, else the ones nobody has read. */
  function linesToRead(ids, force) {
    const lines = MM.writingLinesIn(session.getState(), readScopeOf(ids));
    return { lines: lines, todo: force ? lines : lines.filter((l) => !MM.lineIsRead(l, readMark)) };
  }

  /** The board's writing: its lines and how many are unread — kept while the log stands, for *Read the board* to be offered only where there is some. */
  let boardWritingAt = { key: null, val: null };
  function boardWritingIds() { const s = session.getState(); return s.contentIds.filter((id) => !s.artifacts.includes(id)); }
  function boardWriting() {
    const key = logKey() + '|' + readWith.size;
    if (boardWritingAt.key === key && boardWritingAt.val) return boardWritingAt.val;
    const lines = MM.writingLinesIn(session.getState(), boardWritingIds());
    const val = { lines: lines.length, unread: lines.filter((l) => !MM.lineIsRead(l, readMark)).length };
    boardWritingAt = { key: key, val: val };
    return val;
  }

  /**
   * Read the lines of these marks, as one batch. `force` reads the lines already read again. With no model that
   * sees, the ask is kept (J5) and runs when one joins. Returns whether something was asked.
   */
  function readLines(ids, opts) {
    opts = opts || {};
    const asked = readScopeOf(ids || []);
    const { lines, todo } = linesToRead(asked, !!opts.force);
    if (!lines.length) { say('no handwriting there to read'); return false; }
    if (!todo.length) { say('every line there is read already — Read these again asks the reader again'); return false; }
    const who = readers();
    if (!who.length) {
      keepAsk({
        what: 'Read these', needs: 'sees', need: 'needs a model that can see', ids: asked,
        sentence: whyNoReader('Read these') + ' — kept: it runs when one that sees joins',
        run: (live) => readLines(live, opts),
      });
      return false;
    }
    const agent = who[0];
    if (typeof agent.readLines !== 'function') { say(modelWords(agent) + ' cannot read a batch of lines'); return false; }
    readBatches(agent, todo);
    return true;
  }

  /** The batches, one call after another; each its own sheet, its own dots and label, its own outcome. Esc ends them. */
  async function readBatches(agent, todo) {
    const batches = MM.batchesOf(todo);
    const total = todo.length;
    const generation = session.getState().generation;
    let asked = 0, read = 0, stopped = false;
    const failures = [];
    let cost = null;
    for (const batch of batches) {
      if (session.getState().generation !== generation) { say('the board changed under the read — stopped'); return; }
      const first = asked + 1, last = asked + batch.length;
      const sheet = MM.sheetOf(batch);
      const image = sheetImage(sheet);
      const bytes = dataBytes(image);
      const key = 'read:' + agentKey(agent) + ':' + batch[0].ids[0];
      const label = modelWords(agent) + ' · reading ' + (batch.length === total ? total + ' line' + (total === 1 ? '' : 's') : 'lines ' + first + '–' + last + ' of ' + total);
      const t0 = performance.now();
      const res = await withWork(key, batch.flatMap((l) => l.ids), label,
        agent.readLines({ lines: batch.map((l) => ({ nodeId: l.ids[0], ids: l.ids })), image: image, at: Date.now(), signal: workSignal(key) }));
      const ms = Math.max(1, Math.round(performance.now() - t0));
      const said = batch.map((l, i) => {
        const r = (res.lines && res.lines[i]) || { ok: false, error: res.error || 'no answer' };
        if (r.ok) {
          read++;
          if (r.how === 'first') l.ids.slice(1).forEach((id) => readWith.set(id, l.ids[0]));
        } else failures.push({ n: first + i, error: r.error });
        linesSaid.set(l.ids[0], { n: first + i, of: total, ok: !!r.ok, error: r.ok ? null : r.error, at: Date.now() });
        return { n: first + i, ok: !!r.ok, error: r.ok ? null : r.error };
      });
      const okCount = said.filter((x) => x.ok).length;
      const perLine = +(ms / batch.length).toFixed(1);
      readStats.push({ kind: 'lines', lines: batch.length, ok: okCount, bytes: bytes, ms: ms, perLine: perLine, w: sheet.width, h: sheet.height, said: said });
      cost = { lines: okCount, bytes: bytes, perLine: perLine };
      noteOutcome(agent, !!res.ok, res.ok ? 'read ' + okCount + ' line' + (okCount === 1 ? '' : 's') + ' · ' + kb(bytes) + ' · ' + (perLine / 1000).toFixed(1) + ' s a line' : res.error);
      if (!res.ok && res.raw) window.__mm.lastRaw = res.raw;
      asked = last;
      render(session.getState());
      refreshPalette();
      if (res.error === 'cancelled' || (res.lines && res.lines.every((l) => l.error === 'cancelled'))) { stopped = true; break; }
      if (asked < total) say('read ' + read + ' of ' + total + ' lines — ' + (total - asked) + ' to go · Esc stops it');
    }
    const who = modelWords(agent);
    const why = failures.slice(0, 3).map((f) => 'line ' + f.n + ': ' + f.error).join('; ') + (failures.length > 3 ? '; …' : '');
    if (stopped) say('stopped — ' + who + ' read ' + read + ' of ' + total + ' lines');
    else if (read === total) say(who + ' read ' + (total === 1 ? '1 line' : total + ' lines') + (cost && batches.length === 1 ? ' — ' + kb(cost.bytes) + ', ' + (cost.perLine / 1000).toFixed(1) + ' s a line' : ''));
    else if (!read) say(who + ' could not read ' + (total === 1 ? 'the line' : total + ' lines') + ' — ' + why);
    else say(who + ' read ' + read + ' of ' + total + ' lines — ' + why);
  }

  /** What each line of these marks said, for the panel: "1 “hello world” · by GLM", "2 not read — no reading came back for line 2". */
  function linesPanel(ids) {
    const s = session.getState();
    const lines = MM.writingLinesIn(s, ids);
    if (lines.length < 2) return '';
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    let html = '<div class="sep"></div><div class="eyebrow">handwriting · ' + lines.length + ' lines</div><div class="reads">';
    lines.forEach((l, i) => {
      const top = l.ids.map((id) => s.nodes.get(id)).filter(Boolean).map((n) => MM.transcriptsOf(n)[0]).filter(Boolean);
      const first = s.nodes.get(l.ids[0]);
      const held = first && MM.transcriptsOf(first)[0];
      const text = top.length === l.ids.length ? top.map((t) => t.text).join(' ') : held ? held.text : '';
      const said = linesSaid.get(l.ids[0]);
      if (text) html += '<div class="read' + (i === 0 ? ' top' : '') + '"><span class="type">' + (i + 1) + ' “' + esc(text) + '”</span><span class="w">' + (held ? held.confidence.toFixed(2) : '') + '</span></div><div class="why">by ' + esc(nameOfParticipant((held || top[0]).source)) + '</div>';
      else html += '<div class="read"><span class="type">' + (i + 1) + ' not read yet</span></div>' + (said && said.error ? '<div class="why">' + esc(said.error) + '</div>' : '');
    });
    return html + '</div>';
  }

  // ===== A picture, read (PLAN-IPAD-NOTES I8) ================================
  // *Read the picture*: the picture's pixels come from the asset store, are downscaled to what a reader takes (a
  // long side of `READ_PICTURE_PX`, JPEG), and go to the reader seat with the question *what does this page say*.
  // The text lands as a text artifact BESIDE the picture — never over it — made by the reader (an import in its
  // name, so it is held as the reader's), editable like any text, named for the picture it came from. Claude Code
  // at the desk cannot read a picture yet: a picture's pixels are not in the room (the log carries none), so the
  // seat is left out of who reads one, and the pane's reader or a joined model that sees is asked.
  const READ_PICTURE_PX = 1568;
  function pictureReaders() { return resolveReaders(seatModels().filter((m) => !m.claude)).who.map((k) => agents.find((a) => agentKey(a) === k)).filter(Boolean); }

  async function readPictureFrom(artifactId, asset, name) {
    const s0 = session.getState();
    const node = s0.nodes.get(artifactId);
    const box = node && MM.boundsOf(node);
    if (!box) { say('that picture is no longer there'); return false; }
    const who = pictureReaders();
    if (!who.length) {
      const seated = readers().some(isSeatAgent);
      keepAsk({
        what: 'Read the picture', needs: 'sees', need: 'needs a model that can see', ids: [artifactId],
        sentence: (seated ? 'Read the picture needs a model that can see the picture — Claude Code at the desk cannot yet (its pixels are not in the room), choose a model' : whyNoReader('Read the picture')) + ' — kept: it runs when one that sees joins',
        run: () => { readPictureFrom(artifactId, asset, name); },
      });
      return false;
    }
    const agent = who[0];
    let image, w = 0, h = 0;
    try {
      const rec = await assetGet(asset);
      if (!rec) { say('the pixels of that picture are not on this device, so it cannot be read'); return false; }
      const bmp = await createImageBitmap(new Blob([rec.bytes], { type: rec.mime || 'image/jpeg' }));
      try {
        const k = Math.min(1, READ_PICTURE_PX / Math.max(bmp.width, bmp.height));
        w = Math.max(1, Math.round(bmp.width * k)); h = Math.max(1, Math.round(bmp.height * k));
        const off = document.createElement('canvas');
        off.width = w; off.height = h;
        const c = off.getContext('2d');
        c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
        c.drawImage(bmp, 0, 0, w, h);
        image = off.toDataURL('image/jpeg', 0.85);
      } finally { bmp.close(); }
    } catch (err) { say('could not read that picture: ' + ((err && err.message) || err)); return false; }
    const generation = session.getState().generation;
    const key = 'read-picture:' + agentKey(agent) + ':' + artifactId;
    const t0 = performance.now();
    const res = await withWork(key, [artifactId], modelWords(agent) + ' · reading the picture',
      agent.readPicture({ nodeId: artifactId, image: image, at: Date.now(), signal: workSignal(key) }));
    const ms = Math.max(1, Math.round(performance.now() - t0));
    const bytes = dataBytes(image);
    const n = res.ok ? res.lines.length : 0;
    readStats.push({ kind: 'picture', lines: n, ok: n, bytes: bytes, ms: ms, perLine: n ? +(ms / n).toFixed(1) : ms, w: w, h: h, said: [] });
    noteOutcome(agent, !!res.ok, res.ok ? 'read the picture · ' + n + ' line' + (n === 1 ? '' : 's') + ' · ' + kb(bytes) + ' · ' + (ms / 1000).toFixed(1) + ' s' : res.error);
    if (!res.ok) {
      if (res.raw) window.__mm.lastRaw = res.raw;
      if (res.error !== 'cancelled') say(modelWords(agent) + ' could not read the picture — ' + res.error);
      return false;
    }
    const s1 = session.getState();
    const picture = s1.nodes.get(artifactId);
    if (s1.generation !== generation || !picture) { say('the picture left the board before its text arrived — nothing was written'); return false; }
    // Beside it, never over it: right of the picture, as wide as a text is, as tall as its lines.
    const pb = MM.boundsOf(picture) || box;
    const gap = Math.max(24, (pb.maxX - pb.minX) * 0.04);
    const tw = Math.max(TEXT_W, Math.min(pb.maxX - pb.minX, 720)), th = Math.max(TEXT_H, Math.min(res.lines.length * 26 + 24, Math.max(TEXT_H, pb.maxY - pb.minY)));
    textCount++;
    const label = name || (MM.pictureOf(picture) || {}).name || 'the picture';
    const made = session.withTool('read', () => session.import({
      kind: 'text', path: TEXT_DIR + '/' + textCount + '.txt', name: label + ', read',
      bounds: { minX: pb.maxX + gap, minY: pb.minY, maxX: pb.maxX + gap + tw, maxY: pb.minY + th },
      code: res.text, participantId: agent.id, at: Date.now(),
    }), 'read-picture');
    flash(modelWords(agent) + ' read ' + n + ' line' + (n === 1 ? '' : 's') + ' of “' + label + '” — the text stands beside it, a text of its own you can edit');
    render(session.getState());
    refreshPalette();
    return made;
  }

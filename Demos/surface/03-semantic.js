// ===== the semantic seat (the adapter) =====
// Provides: the semantic seat on the page (PLAN-IPAD-NOTES I9) — a small model that runs on THIS device and turns words
//   into numbers, so Find can let in what no word typed matched and *Notes like this* can list the others nearest in
//   meaning. semanticSeat (null, or who holds it), semanticHost (what the tools are told), joinSemantic (load a model
//   from its address, lazily, by the seat's own control — never at boot, never on draw), leaveSemantic, trySemantic (one
//   tiny ask), semanticRowParts / bindSemanticRow (the seat row in the models pane), findSemantic (Find's scorer for a
//   query, made when asked and read from memory), semanticNotesLike (the notes nearest one thing), semanticNow (for tests).
// Uses: core (MM.createStaticTransport, createStubEmbedTransport, createEmbedCache, semanticScorer, notesLike, groupLikes,
//   embedAll, StaticModelError), seats' rules (03-seats.js: SEMANTIC_SOURCE, SEMANTIC_MAX_BYTES, semanticSourceOf,
//   semanticNameOf, semanticWords, semanticFailed, fallbackWords), store (00-core), say / flash (07-input), esc, the seat
//   pane (renderSeats) and the field (refreshPalette), the kept index (findBoards, 17-find.js), the find pane (renderFind).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the closure's; no imports, no exports.
// It sits at 03- so that its state is declared before 04-seatpane.js draws the seats at load.
//
// A SEAT, NOT A DEPENDENCY. With nobody in this seat Find is exactly the lexical Find and the field offers exactly what it
// offered; nothing here runs. The seat holds NO KEY — the model is a file on this device once loaded — and asks nothing
// of anyone: a model's files are fetched once, by a tap, from an address the hand can read and change, then kept in
// the browser's cache (`mm-semantic`); what is embedded is held in memory by text and lost with the page.
//
// ONLY A DELIBERATE ACT ASKS. Nothing is loaded at boot and nothing is embedded on draw, on a hold or on opening the
// field: the model is loaded by *load it here*, Find embeds when a query is typed in it while the seat is held, and
// *Notes like this* embeds when it is taken.
//
// UNRUN WHERE IT WAS WRITTEN. The container this was built in cannot reach the model's host (the proxy answers 403), so
// `loadSemantic` has never fetched the real `potion-base-8M`: it has run, in the gate, against a model BUILT for the
// test and served from the gate's own origin (e2e `models` M29–M36), and its failures — a refusal, a missing file, bytes
// that are no model, a file too big — in words. The real files are what `scripts/check-semantic-model.mjs` asks.

  const SEMANTIC_KEY = 'mm-semantic';     // { source } — which address the hand last loaded from; never a key
  const SEMANTIC_CACHE = 'mm-semantic';   // the Cache API's name for the model's files, beside no other
  const semanticVectors = MM.createEmbedCache();
  /** { name, base, transport, dimension, words, bytes, loadMs } once a model is loaded here; null when nobody holds the seat. */
  let semanticSeat = null;
  /** What the seat is doing or last did, for its row: { loading: 'text' } | { failed: 'text' } | { call: { ok, ms, text } } | null. */
  let semanticSaid = null;
  let semanticLoad = null;                // the load in flight (a promise), so a second tap joins it
  let semanticTyped = null;               // the address as typed and not yet loaded, so a redraw of the row does not lose it
  let semanticAsked = 0;                  // texts handed to the model since the page opened (for tests: a text is embedded once)

  function semanticStored() { const v = store.get(SEMANTIC_KEY); return v && typeof v.source === 'string' ? v : { source: '' }; }
  /** What the tools are told: the seat's name when held, else null (and so no *Notes like this* is offered). */
  function semanticHost() { return semanticSeat ? { name: semanticSeat.name } : null; }
  /** The seat changed: the row, the field's offers and Find read it again. */
  function semanticChanged() {
    renderSeats();
    refreshPalette();
    if (typeof renderFind === 'function') renderFind();
  }

  /** A transport that counts what it was asked: nothing more. */
  function countedTransport(inner) {
    return { name: inner.name, dimension: inner.dimension, embed: (texts, opts) => { semanticAsked += texts.length; return inner.embed(texts, opts); } };
  }

  // ----- loading a model from an address ---------------------------------------------------------------------------
  /** One file of the model's: from the browser's cache when held, else fetched (with the bytes counted as they come) and kept. */
  async function semanticFile(base, name, progress) {
    const url = base + name;
    let cache = null;
    try { cache = typeof caches !== 'undefined' ? await caches.open(SEMANTIC_CACHE) : null; } catch (e) { cache = null; }
    if (cache) {
      try { const hit = await cache.match(url); if (hit) { const b = new Uint8Array(await hit.arrayBuffer()); progress(b.length, b.length); return { bytes: b, kept: true }; } } catch (e) { /* fetched below */ }
    }
    let res;
    try { res = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-cache' }); } catch (e) { throw { network: true, what: name }; }
    if (!res.ok) throw { status: res.status, what: name };
    const declared = Number(res.headers.get('content-length')) || 0;
    if (declared > SEMANTIC_MAX_BYTES) throw { bytes: declared, what: name };
    let bytes;
    if (res.body && res.body.getReader) {
      const reader = res.body.getReader();
      const parts = [];
      let got = 0;
      for (;;) {
        const r = await reader.read();
        if (r.done) break;
        parts.push(r.value);
        got += r.value.length;
        if (got > SEMANTIC_MAX_BYTES) { try { reader.cancel(); } catch (e) { /* too big already */ } throw { bytes: got, what: name }; }
        progress(got, declared);
      }
      bytes = new Uint8Array(got);
      let at = 0;
      for (const p of parts) { bytes.set(p, at); at += p.length; }
    } else {
      bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.length > SEMANTIC_MAX_BYTES) throw { bytes: bytes.length, what: name };
    }
    if (cache) { try { await cache.put(url, new Response(bytes, { headers: { 'content-type': 'application/octet-stream' } })); } catch (e) { /* kept for this page only */ } }
    return { bytes: bytes, kept: false };
  }

  /**
   * Load the model at an address and seat it: its tokenizer and its table of vectors, fetched once (or read from the
   * browser's cache), read by core, and held as the seat. Nothing is asked of anyone but the host of the files; a failure
   * is said in words in the seat's row and in the status line, and the seat stays empty. The address is the hand's
   * (`semanticSourceOf`: https, or this machine; no key can ride in it); the one used is kept for the next time.
   */
  function joinSemantic(sourceText) {
    if (semanticLoad) return semanticLoad;
    const src = semanticSourceOf(sourceText);
    if (!src.ok) { semanticSaid = { failed: src.why }; semanticChanged(); say(src.why); return Promise.resolve(false); }
    const name = semanticNameOf(src.base);
    const t0 = performance.now();
    const sizes = { 'tokenizer.json': 0, 'model.safetensors': 0 };
    const progress = (file) => (got, of) => {
      sizes[file] = got;
      const total = sizes['tokenizer.json'] + sizes['model.safetensors'];
      semanticSaid = { loading: name + ' — ' + (total / 1048576).toFixed(1) + ' MB' + (of && file === 'model.safetensors' ? ' of ' + (of / 1048576).toFixed(1) : '') };
      semanticRowSoon();
    };
    semanticSaid = { loading: name + ' — asking for it' };
    renderSeats();
    semanticLoad = (async () => {
      try {
        const tok = await semanticFile(src.base, 'tokenizer.json', progress('tokenizer.json'));
        const wts = await semanticFile(src.base, 'model.safetensors', progress('model.safetensors'));
        let inner;
        try { inner = MM.createStaticTransport({ name: name, tokenizer: new TextDecoder().decode(tok.bytes), weights: wts.bytes }); }
        catch (e) { throw { reason: String((e && e.message) || e), what: 'the files at ' + src.base }; }
        semanticSeat = { name: name, base: src.base, transport: countedTransport(inner), dimension: inner.dimension, bytes: tok.bytes.length + wts.bytes.length, loadMs: Math.round(performance.now() - t0), kept: tok.kept && wts.kept };
        semanticSaid = null;
        store.set(SEMANTIC_KEY, { source: src.base === SEMANTIC_SOURCE ? '' : src.base });
        semanticChanged();
        say(name + ' sits in the semantic seat — on this device, no key; Find now looks by meaning too, and “Notes like this” is typed on marks with words');
        return true;
      } catch (f) {
        const words = semanticFailed(f && typeof f === 'object' ? f : { reason: String(f) });
        semanticSaid = { failed: words };
        semanticChanged();
        say('the semantic seat: ' + words);
        return false;
      } finally { semanticLoad = null; }
    })();
    return semanticLoad;
  }

  /** The seat let go: its model is dropped from memory (the browser's cache keeps the files for the next load). */
  function leaveSemantic() {
    if (!semanticSeat) return;
    const name = semanticSeat.name;
    semanticSeat = null;
    semanticSaid = null;
    semanticChanged();
    say(name + ' left the semantic seat — Find is by the words typed again');
  }

  /** For tests (the gate's own transport): seat a stand-in, as a loaded model would be, with no files. */
  function joinSemanticTransport(transport, extra) {
    semanticSeat = Object.assign({ name: transport.name, base: '', transport: countedTransport(transport), dimension: transport.dimension, bytes: 0, loadMs: 0, kept: false }, extra || {});
    semanticSaid = null;
    semanticChanged();
    return semanticHost();
  }

  /** *Try it*: three tiny texts through the transport, timed — a deliberate act, the result in the row. */
  async function trySemantic() {
    if (!semanticSeat) return;
    const s = semanticSeat;
    const t0 = performance.now();
    try {
      const v = await s.transport.embed(['pricing', 'what it costs', 'a garden hose']);
      const cos = (a, b) => MM.semanticCosine(a, b).toFixed(2);
      semanticSaid = { call: { ok: true, ms: Math.round(performance.now() - t0), text: 'ok · 3 texts · pricing ~ “what it costs” ' + cos(v[0], v[1]) + ', ~ “a garden hose” ' + cos(v[0], v[2]) } };
    } catch (e) { semanticSaid = { call: { ok: false, ms: Math.round(performance.now() - t0), text: String((e && e.message) || e) } }; }
    renderSeats();
  }

  // ----- the seat's row --------------------------------------------------------------------------------------------
  let semanticRowTimer = 0;
  /** A load reports many times a second; the row is drawn a few times. */
  function semanticRowSoon() { if (semanticRowTimer) return; semanticRowTimer = setTimeout(() => { semanticRowTimer = 0; renderSeats(); }, 120); }

  /** The row's parts: `{ who, body, call, note }` as HTML-safe strings (the pane puts them in its own row). */
  function semanticRowParts() {
    const input = '<input class="seatSource" data-semantic-source type="text" spellcheck="false" autocapitalize="off" autocomplete="off" value="' + esc(semanticTyped !== null ? semanticTyped : semanticStored().source) + '" placeholder="' + esc(SEMANTIC_SOURCE) + '" aria-label="where the model is: a folder holding tokenizer.json and model.safetensors" title="a folder holding tokenizer.json and model.safetensors — https, or this machine. Left empty it is ' + esc(semanticNameOf(SEMANTIC_SOURCE)) + ' (about 30 MB, fetched once and kept on this device)">';
    if (semanticSeat) {
      const s = semanticSeat;
      const words = semanticWords({ name: s.name, dimension: s.dimension, bytes: s.bytes || 0 });
      const call = semanticSaid && semanticSaid.call ? '<div class="seatCall mpCall ' + (semanticSaid.call.ok ? 'ok' : 'bad') + '">' + esc(semanticSaid.call.text + (semanticSaid.call.ok ? ' · ' + semanticSaid.call.ms + ' ms' : '')) + '</div>' : (s.loadMs ? '<div class="seatCall mpCall ok">' + esc('loaded in ' + (s.loadMs / 1000).toFixed(1) + ' s' + (s.kept ? ' · from this device’s cache' : '')) + '</div>' : '');
      return {
        who: words.who,
        body: '<button class="ghost" data-semantic-try title="three tiny texts through it, timed: is it there, and does it put related words near?">try it</button><button class="ghost" data-semantic-leave>leave</button>',
        call: call, note: '',
      };
    }
    if (semanticSaid && semanticSaid.loading) return { who: 'loading ' + semanticSaid.loading, body: '', call: '', note: 'a model is a file: fetched once, then kept on this device' };
    const failed = semanticSaid && semanticSaid.failed ? '<div class="seatCall mpCall bad">' + esc(semanticSaid.failed) + '</div>' : '';
    return {
      who: 'nothing chosen',
      body: input + '<button class="ghost" data-semantic-load title="fetches the model once (about 30 MB) — nothing is loaded until you tap">load it here</button>',
      call: failed, note: fallbackWords('semantic'),
    };
  }
  /** The row's buttons, wired by the pane after it draws. */
  function bindSemanticRow(root) {
    const src = root.querySelector('[data-semantic-source]');
    const load = root.querySelector('[data-semantic-load]');
    if (load) load.onclick = () => { joinSemantic(src ? src.value : ''); };
    if (src) src.addEventListener('input', () => { semanticTyped = src.value; });
    if (src) src.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); joinSemantic(src.value); } });
    const tr = root.querySelector('[data-semantic-try]');
    if (tr) tr.onclick = () => { trySemantic(); };
    const lv = root.querySelector('[data-semantic-leave]');
    if (lv) lv.onclick = () => leaveSemantic();
  }

  // ----- what Find and *Notes like this* ask of it -------------------------------------------------------------------
  /**
   * Find's score for a query over the boards' entries: the query and every entry text not yet held are embedded (each
   * once, by text), and the function that comes back answers from memory. A failure is said and the search stands
   * without meaning. Null with nobody in the seat.
   */
  async function findSemantic(query, boards) {
    const s = semanticSeat;
    if (!s) return null;
    const entries = [];
    for (const b of boards) for (const e of b.entries) entries.push(e);
    try { return await MM.semanticScorer(s.transport, query, entries, { cache: semanticVectors }); }
    catch (e) { semanticSaid = { call: { ok: false, ms: 0, text: 'could not read by meaning — ' + String((e && e.message) || e) } }; renderSeats(); say(semanticSaid.call.text); return null; }
  }

  /** The notes nearest one thing's words across the boards, as groups the pane lists; `{ groups, likes, name }` or `{ error }`. */
  async function semanticNotesLike(data, boards) {
    const s = semanticSeat;
    if (!s) return { error: 'no semantic seat is held — load one under models' };
    try {
      const likes = await MM.notesLike(s.transport, boards, { text: data.text, board: boards.some((b) => b.id === data.board) ? data.board : undefined, ids: data.ids || [] }, { cache: semanticVectors });
      return { groups: MM.groupLikes(likes, boards), likes: likes, name: s.name };
    } catch (e) { return { error: 'could not read by meaning — ' + String((e && e.message) || e) }; }
  }

  /** For tests: who holds the seat, what it has been asked, how many vectors are held — never a key (there is none). */
  function semanticNow() {
    return {
      held: semanticSeat ? { name: semanticSeat.name, base: semanticSeat.base, dimension: semanticSeat.dimension, bytes: semanticSeat.bytes, kept: semanticSeat.kept } : null,
      said: semanticSaid ? JSON.parse(JSON.stringify(semanticSaid)) : null,
      asked: semanticAsked, held_vectors: semanticVectors.size, stored: semanticStored(), loading: !!semanticLoad,
    };
  }

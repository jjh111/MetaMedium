// ===== seatpane =====
// Provides: seats, on the page (V1-PLAN I7) — what each model holds (seatsOfAgent, assignSeat, forgetSeats, refreshPicks),
//   who is asked (writers; readers is 06-handwriting.js's, both by 03-seats.js's rules), one key a provider (keyFor,
//   holdKey, commitKey), the decider (joinDecider, askDecider, deciderHost), what a reload brings back
//   (rejoinRemembered: the old pick and key become the writer seat, once), the pane's seats section (renderSeats; the
//   form's For: forSeat) and seatsNow for tests. (The semantic seat's row is 03-semantic.js's; this pane only draws it.)
// Uses: core (MM, store), seats (03-seats.js — every rule), models (agents, join, joinHosted, factsFor, applyFacts,
//   recording, lastCall, noteOutcome, callLine, isModel, modelWords, withWork, workSignal, factsOf, tryModel, renderAgents,
//   probeLocal, the pane's elements), input (say), render (render), palette (refreshPalette).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Seats (V1-PLAN I7; PLAN-IPAD-NOTES §3) ===============================
  // John has one OpenRouter key and wants on it a writer (GLM 5.3 Flash), a decision model (Jev) and a fast
  // reader. So the models pane is seats — reader, writer, decider, semantic — each holding the model the hand
  // chose for that job, the key a provider's, entered once. Nothing here asks a model: who is asked, by what
  // act, is unchanged (§6.3), and a seat chosen only NARROWS who is asked (03-seats.js has the rules, tested
  // in Node). The decider is not in the pool of models at all: it is asked one thing, on a deliberate tap.
  const SEATS_KEY = 'mm-seats';        // { reader?, writer?, decider?, any? } — picks (where, which, what the provider said), never a key
  const KEYS_KEY = 'mm-model-keys';    // { <provider's address>: key } — only for a provider whose key the hand asked to remember
  const seatsOfAgent = new Map();      // agent id → Set of seats it holds ('reader' | 'writer')
  const metaOfAgent = new Map();       // agent id → { provider, endpoint } — what a rejoin needs
  const heldKeys = new Map();          // keyId → key: entered on this page, or restored from this device
  const rememberedKeys = new Set();    // keyIds whose key the hand asked to keep on this device
  let seatPicks = {};
  let decider = null;                  // { config, seat: DecideSeat, pseudo: { id, config }, name, meta, transport }
  let pendingPicks = [];               // picks that wait for a key: { pick, seats }

  // ---- what an older device kept, and what this one keeps ----
  (function loadSeats() {
    const m = migrateStored({ pick: store.get('mm-model-pick'), key: store.get('mm-model-key'), seats: store.get(SEATS_KEY), keys: store.get(KEYS_KEY) });
    seatPicks = m.seats || {};
    for (const id of Object.keys(m.keys || {})) { heldKeys.set(id, m.keys[id]); rememberedKeys.add(id); }
    if (!m.migrated) return;
    // The old pick and key became the writer seat (and the reader, if it sees) and the provider's key; the old entries
    // go only once the new ones are read back — nothing is lost on a device that will not keep them.
    store.set(SEATS_KEY, seatPicks);
    store.set(KEYS_KEY, m.keys);
    const back = store.get(SEATS_KEY), backKeys = store.get(KEYS_KEY);
    if (back && back.writer && (!Object.keys(m.keys).length || (backKeys && Object.keys(backKeys).length))) { store.del('mm-model-pick'); store.del('mm-model-key'); }
  })();
  function saveSeats() { if (Object.keys(seatPicks).length) store.set(SEATS_KEY, seatPicks); else store.del(SEATS_KEY); }
  function saveKeys() {
    const keep = keysToKeep(heldKeys, rememberedKeys);
    if (Object.keys(keep).length) store.set(KEYS_KEY, keep); else store.del(KEYS_KEY);
  }
  const samePick = (pick, config) => !!pick && !!config && keyId(pick.baseUrl) === keyId(config.baseUrl) && pick.model === config.model;

  // ---- keys: one a provider ----
  function keyFor(baseUrl) { return heldKeys.get(keyId(baseUrl)) || ''; }
  /**
   * A key typed for a provider is held now and is its seats' key: every joined model on that provider that waits for one
   * has it at once (a seat joined later needs none typed), and a pick that waited for one rejoins.
   */
  function holdKey(baseUrl, key) {
    const id = keyId(baseUrl);
    heldKeys.set(id, key);
    for (const a of agents) if (a.config && !a.config.apiKey && keyId(a.config.baseUrl) === id) a.config.apiKey = key;
    if (decider && !decider.config.apiKey && keyId(decider.config.baseUrl) === id) decider.config.apiKey = key;
    renderSeats();
    rejoinPending(baseUrl);
  }
  /** The join worked: the key is kept on this device only when the hand asked, and a key typed without asking forgets the one kept. */
  function commitKey(baseUrl, remember) {
    const id = keyId(baseUrl);
    if (remember) rememberedKeys.add(id); else rememberedKeys.delete(id);
    saveKeys();
  }
  /** A provider no joined model uses any more has no key to hold. */
  function forgetKeyIfUnused(baseUrl) {
    const id = keyId(baseUrl);
    if (agents.some((a) => a.config && keyId(a.config.baseUrl) === id) || (decider && keyId(decider.config.baseUrl) === id)) return;
    heldKeys.delete(id);
    if (rememberedKeys.delete(id)) saveKeys();
  }

  // ---- what each model holds ----
  function sizeOf(a) { const m = /(\d+(?:\.\d+)?)\s*b\b/i.exec((a.config && a.config.model) || ''); return m ? parseFloat(m[1]) : Infinity; }
  /** The joined models as the rules read them. */
  function seatModels() {
    return agents.map((a) => ({
      id: agentKey(a), vision: !!(a.config && a.config.vision), seats: [...(seatsOfAgent.get(agentKey(a)) || [])], size: sizeOf(a),
      claude: isSeatAgent(a), local: !!a.config && a.config.kind !== 'mcp' && MM.providerLocality(a.config) === 'local',
    }));
  }
  const agentById = (key) => agents.find((a) => agentKey(a) === key) || null;
  /** Who is asked a brief, a page, a program, a question, *What is this?* — Claude Code first while it is seated. */
  function writers() { return resolveWriters(seatModels()).who.map(agentById).filter(Boolean); }
  /**
   * The writers, seated on this board before an act that blesses a loop for them. A board loaded in place took
   * their joins with it, and core's ask joins one again — which, after the bless, would stand between the bless
   * and what takes a failed brief back (`dropFailedBless`: the bless must still be this hand's last act).
   */
  function seatWriters(at) { for (const a of writers()) if (a.seat) a.seat(at); }
  /** The seat a model holds, if any: the first agent that holds it. */
  const holderOf = (seat) => agents.find((a) => (seatsOfAgent.get(agentKey(a)) || new Set()).has(seat)) || null;

  /** Put a model in a seat — one holder a seat — and keep what is needed to bring it back. `any` is a model with no seat: remembered as the one last joined, as the single pick always was. */
  function assignSeat(seat, agent) {
    if (!agent || !isModel(agent)) return;
    const pick = pickOf(agent.config, metaOfAgent.get(agentKey(agent)));
    if (seat === 'reader' || seat === 'writer') {
      const was = holderOf(seat);
      if (was && was !== agent) letGoOf(was, seat);
      const set = seatsOfAgent.get(agentKey(agent)) || new Set();
      set.add(seat);
      seatsOfAgent.set(agentKey(agent), set);
      seatPicks[seat] = pick;
      if (samePick(seatPicks.any, agent.config)) delete seatPicks.any; // it has a seat now: kept under it
    } else if (!(seatsOfAgent.get(agentKey(agent)) || new Set()).size) {
      seatPicks.any = pick;
    }
    saveSeats();
    renderSeats();
  }
  /** A model lets go of a seat (another took it, or the hand chose nothing): with no seat left it is "any job" again, and kept so. */
  function letGoOf(agent, seat) {
    const set = seatsOfAgent.get(agentKey(agent));
    if (set) { set.delete(seat); if (!set.size) seatsOfAgent.delete(agentKey(agent)); }
    if (samePick(seatPicks[seat], agent.config)) delete seatPicks[seat];
    if (!(seatsOfAgent.get(agentKey(agent)) || new Set()).size && !seatPicks.any) seatPicks.any = pickOf(agent.config, metaOfAgent.get(agentKey(agent)));
  }
  /** The hand chose nothing for a seat: whoever held it is "any job" again. */
  function unseat(seat) {
    if (seat === 'decider') { leaveDecider(); return; }
    const a = holderOf(seat);
    if (a) letGoOf(a, seat); else delete seatPicks[seat];
    saveSeats();
    renderAgents();
    syncTiles();
  }
  /** A model left: its seats, its kept picks and, if none joined uses its provider, its key. */
  function forgetSeats(agent) {
    const held = seatsOfAgent.get(agentKey(agent)) || new Set();
    seatsOfAgent.delete(agentKey(agent));
    metaOfAgent.delete(agentKey(agent));
    for (const s of held) if (samePick(seatPicks[s], agent.config)) delete seatPicks[s];
    if (samePick(seatPicks.any, agent.config)) delete seatPicks.any;
    saveSeats();
    forgetKeyIfUnused(agent.config.baseUrl);
  }
  /** What the provider said of a model, kept with every pick that names it. */
  function refreshPicks(config) {
    let changed = false;
    for (const k of Object.keys(seatPicks)) {
      if (!samePick(seatPicks[k], config)) continue;
      seatPicks[k] = Object.assign({}, seatPicks[k], { vision: !!config.vision }, config.title ? { title: config.title } : {});
      changed = true;
    }
    if (changed) saveSeats();
  }

  // ===== The decider (V1-PLAN I7; PLAN-IPAD-NOTES §3) ==========================
  // A decision model is asked one thing: which of the definitions the library says match a group about equally —
  // *Which is it?*, a pill with the dot, offered only when two tie and a decider sits here (core's `tools/which.ts`).
  // It is asked only when the hand taps that. NOT on summon, NOT on a hold: CLAUDE.md is plain that a model is asked
  // only by a deliberate act, and opening the field is not one — so the tie is offered and the hand decides to ask.
  // Its answer is one more held, attributed reading beside the engine's (`jev 0.99`, never evicting) and is taken
  // only where it leads by DECIDER_TAKE_AT; under that, the status line says what it said and why it was not used.
  /** The seat as a participant: core seats it on whichever board it is asked on (`participants/seated.ts`), so a board loaded in place needs nothing here. */
  function makeDeciderSeat(transport, name, config) {
    return MM.createDecideParticipant(session, transport, Date.now(), { name: name, locality: MM.providerLocality(config), takeAt: MM.DECIDER_TAKE_AT });
  }
  function deciderHost() { return decider ? { name: decider.name } : null; }

  /** Join a decision model: its provider's list says it exists (an id it does not hold is refused, with the nearest), the seat is made over a transport that keeps each call for its row. */
  async function joinDecider(config, meta, remembered) {
    const k = config.baseUrl + ' ' + config.model;
    if (decider && samePick(pickOf(decider.config), config)) { mpStatus.textContent = MM.modelWords(config) + ' is already the decider' + (config.apiKey ? ' — its key is set.' : '.'); return null; }
    if (joining.has(k)) return null;
    joining.add(k);
    try {
      const where = MM.whereOf(config.baseUrl);
      mpStatus.textContent = 'asking ' + where.name + ' what ' + config.model + ' can do…';
      const got = await factsFor(config, remembered);
      if (!got.first.ok) { mpStatus.textContent = got.first.error; return null; }
      applyFacts(config, got.first.facts);
      if (decider) leaveDecider(true);
      const pseudo = { id: 'decider:' + k, config: config };
      const holder = { agent: pseudo };
      const transport = MM.createChatDecideTransport(config, { complete: recording(holder) });
      const name = MM.modelWords(config);
      const seat = makeDeciderSeat(transport, name, config);
      decider = { config: config, seat: seat, pseudo: pseudo, name: name, meta: meta || {}, transport: transport };
      factsOf.set(agentKey(pseudo), got.first.facts);
      seatPicks.decider = pickOf(config, meta ? { provider: meta.provider, endpoint: meta.endpoint } : undefined);
      saveSeats();
      mpStatus.textContent = name + ' joined as the decider — ' + got.first.facts.said + '.';
      // The choice the unit asked to be said: why the decider is never asked on its own.
      say(name + ' is the decider — asked only when you tap “Which is it?” on a tie between two definitions, never on its own; its answer is taken only when it is ' + MM.DECIDER_TAKE_AT + ' sure');
      if (got.later) got.later.then((catalog) => { if (decider && decider.seat === seat && catalog && catalog.ok) { const f = MM.modelFacts(config.model, catalog, got.where); if (f.ok) { applyFacts(config, f.facts); factsOf.set(agentKey(pseudo), f.facts); refreshPicks(config); renderSeats(); } } });
      renderSeats();
      syncTiles();
      refreshPalette();
      return pseudo;
    } finally {
      joining.delete(k);
    }
  }
  function leaveDecider(quiet) {
    if (!decider) return;
    const d = decider;
    decider = null;
    factsOf.delete(agentKey(d.pseudo)); lastCall.delete(agentKey(d.pseudo)); asking.delete(agentKey(d.pseudo));
    delete seatPicks.decider;
    saveSeats();
    forgetKeyIfUnused(d.config.baseUrl);
    if (!quiet) { mpStatus.textContent = d.name + ' left the decider seat.'; renderSeats(); syncTiles(); refreshPalette(); }
  }

  /**
   * *Which is it?* — one question over one snapshot: which of the tied definitions the group is, with *none of these*
   * among them. The decider's answer lands as a held reading in its own name when it leads by DECIDER_TAKE_AT, and is
   * said in the status line either way — what it chose, how surely, and that the engine's ranking stands when it was not sure.
   */
  function askDecider(data) {
    if (!decider) { say('no decider is seated — choose one under models'); return false; }
    const d = decider;
    const ids = (data.ids || []).filter((id) => session.getState().nodes.has(id));
    if (!ids.length || !data.candidates || data.candidates.length < 2) { say('nothing to decide'); return false; }
    const q = MM.choice('which:' + ids[0], 'which of these is the group of marks?', data.candidates.map((c) => ({ id: c.id, text: c.text })), ids);
    const key = 'decide:' + agentKey(d.pseudo) + ':' + ids.join('+');
    const ctl = new AbortController();
    workControllers.set(key, ctl);
    say(d.name + ' is choosing between ' + data.candidates.map((c) => c.id).join(' and ') + '…');
    withWork(key, ids, d.name + ' · choosing', d.seat.ask([q], Date.now(), ctl.signal)).then((run) => {
      if (ctl.signal.aborted) return;
      const t = (x) => Number(x).toFixed(2);
      let ok = false, said;
      if (!run.ok) said = d.name + ' could not decide — ' + run.error;
      else if (run.refused) said = d.name + ' answered, but ' + run.refused + ' — nothing was held';
      else if (!run.rows.length) said = d.name + ' gave no answer it could be asked about — the engine’s ranking stands';
      else {
        const row = run.rows[0], a = row.answer;
        const lead = a.kind === 'choice' ? (a.distribution.slice().sort((x, y) => y.p - x.p)[0] || { of: '?', p: 0 }) : { of: '?', p: 0 };
        const word = lead.of === MM.NO_MATCH ? 'none of these' : '“' + readingWords(lead.of) + '”';
        if (row.held) { ok = true; said = d.name + ' says ' + word + ' (' + t(lead.p) + ') — held beside the engine’s readings, which stand'; }
        else if (row.below) said = d.name + ' is only ' + t(lead.p) + ' sure of ' + word + ' — under ' + MM.DECIDER_TAKE_AT + ', so the engine’s ranking stands';
        else if (row.flat) said = d.name + ' could not tell them apart — the engine’s ranking stands';
        else { ok = lead.of === MM.NO_MATCH; said = d.name + ' says ' + word + ' (' + t(lead.p) + ')' + (ok ? ' — nothing held, the engine’s ranking stands' : ''); }
      }
      // The row keeps what the CALL came to — a seat that answered under the floor answered — and the status line says what that meant.
      noteOutcome(d.pseudo, !!run.ok, run.ok ? said : run.error);
      say(said);
      render(session.getState());
      refreshPalette();
      renderSeats();
    }).finally(() => workControllers.delete(key));
    return true;
  }

  /** *Try it* on the decider: one tiny question through the same transport, a deliberate act; the reply — or the failure in full — in its row. */
  async function tryDecider() {
    if (!decider) return;
    const d = decider;
    const q = MM.choice('try', 'which of these is a fruit?', [{ id: 'apple', text: 'an apple' }, { id: 'chair', text: 'a chair' }]);
    const res = await d.transport([q], {});
    if (res.ok && res.answers.length) noteOutcome(d.pseudo, true, 'answered a test question');
    else noteOutcome(d.pseudo, false, res.ok ? 'it answered, but not in the shape asked' : res.error);
    mpStatus.textContent = d.name + (res.ok && res.answers.length ? ' answered.' : ' did not answer — ' + (res.ok ? 'not in the shape asked' : res.error));
  }

  // ===== Coming back (V1-PLAN I7) ============================================
  // Every seat kept comes back as it was. A model rejoins the way it joined: its provider asked again what it can do, a
  // remembered Ollama or LM Studio pick asked for where it runs, a hosted pick with the provider's key from this device —
  // and with no key kept, a hosted preset says so in the form (a custom endpoint rejoins keyless, as it always did), the
  // seat waiting for the key the hand types once.
  async function rejoinRemembered() {
    const jobs = new Map();
    for (const k of ['writer', 'reader', 'decider', 'any']) {
      const p = seatPicks[k];
      if (!p || !p.baseUrl || !p.model) continue;
      const id = keyId(p.baseUrl) + ' ' + p.model + (k === 'decider' ? ' decider' : '');
      if (!jobs.has(id)) jobs.set(id, { pick: p, seats: [] });
      jobs.get(id).seats.push(k);
    }
    await Promise.all([...jobs.values()].map(rejoinOne));
  }
  async function rejoinOne(job) {
    const pick = job.pick, seats = job.seats;
    const isDecider = seats.includes('decider');
    const asSeats = seats.filter((s) => s !== 'decider');
    // A local server's model is asked for again where it runs. (This asked `providerTier(…) === 1`, which has been 2 for
    // every model since 6 Sep — so a remembered Ollama pick asked for a key.)
    if (pick.provider === 'ollama' || pick.provider === 'lmStudio') {
      const servers = await probeLocal();
      const sv = servers.find((x) => x.baseUrl === pick.baseUrl);
      if (sv && sv.models.includes(pick.model)) {
        const sees = sv.vision.includes(pick.model);
        const because = sv.source + (sees ? ' lists vision among what it takes' : ' lists no vision for it');
        const config = Object.assign({}, MM.PRESETS[sv.preset], { model: pick.model, vision: sees });
        if (isDecider) { joinDecider(config, { provider: pick.provider, seat: 'decider' }); return; }
        const agent = join(config, { provider: pick.provider, seat: asSeats[0] || 'any' }, { vision: sees, from: 'provider', said: because, because: because });
        if (agent) for (const s of asSeats.slice(1)) assignSeat(s, agent);
      } else mpStatus.textContent = 'Remembered ' + pick.model + ', but ' + pick.baseUrl + ' is not offering it right now.';
      return;
    }
    const key = keyFor(pick.baseUrl);
    const config = pick.provider === 'custom'
      ? { kind: 'openai-compatible', baseUrl: pick.baseUrl, model: pick.model }
      : Object.assign({}, MM.PRESETS[pick.provider] || { kind: pick.kind, baseUrl: pick.baseUrl }, { model: pick.model });
    // What the provider said when it last joined stands until its list says otherwise (J5).
    const remembered = typeof pick.vision === 'boolean' ? { vision: pick.vision, title: pick.title } : undefined;
    const meta = (seat) => ({ provider: pick.provider, endpoint: pick.provider === 'custom' ? pick.baseUrl : undefined, seat: seat });
    // A pick that does not rejoin says why where the hand is looking, not only in a pane that is closed at boot.
    const rejoin = () => {
      const done = (a) => { if (!a && mpStatus.textContent) say('the remembered model did not rejoin — ' + mpStatus.textContent); return a; };
      if (isDecider) return joinDecider(config, meta('decider'), remembered).then(done);
      return joinHosted(config, meta(asSeats[0] || 'any'), remembered).then((a) => { if (a) for (const s of asSeats.slice(1)) assignSeat(s, a); return done(a); });
    };
    if (key) { config.apiKey = key; rejoin(); return; }
    if (pick.provider !== 'custom') {
      pendingPicks.push({ pick: pick, seats: seats, rejoin: () => { const k2 = keyFor(pick.baseUrl); if (k2) config.apiKey = k2; return rejoin(); } });
      mpProvider.value = pick.provider; syncProviderFields(); mpModel.value = pick.model;
      const f = document.getElementById('mpFor'); if (f) f.value = isDecider ? 'decider' : (asSeats[0] || 'any');
      mpStatus.textContent = 'Remembered ' + pick.model + ' for the ' + (isDecider ? 'decider' : asSeats[0] || 'models') + ' seat — enter its key to rejoin' + (pendingPicks.length > 1 ? ' (it serves every seat that waits)' : '') + '.';
    } else {
      mpProvider.value = 'custom'; syncProviderFields(); mpEndpoint.value = pick.baseUrl; mpModel.value = pick.model;
      rejoin();
    }
  }
  /** A key was typed for a provider some seats waited for: they rejoin with it. */
  function rejoinPending(baseUrl) {
    const id = keyId(baseUrl);
    const now = pendingPicks.filter((p) => keyId(p.pick.baseUrl) === id);
    if (!now.length) return;
    pendingPicks = pendingPicks.filter((p) => !now.includes(p));
    for (const p of now) p.rejoin();
  }

  // ===== The pane's seats section ===============================================
  const seatsPane = document.createElement('div');
  seatsPane.id = 'mpSeats';
  seatsPane.className = 'mpSection mpSeats';
  panel.insertBefore(seatsPane, panel.querySelector(':scope > .mpSection'));

  // What a join is FOR: any job as before, or a seat of its own. One field in the form, so every seat has its own provider, model and key.
  const mpFor = document.createElement('select');
  mpFor.id = 'mpFor';
  mpFor.title = 'which seat this model sits in — a seat chosen narrows who is asked; “any job” is as models always were';
  mpFor.innerHTML = '<option value="any">for any job</option><option value="reader">for the reader seat</option><option value="writer">for the writer seat</option><option value="decider">for the decider seat</option>';
  mpProvider.parentNode.insertBefore(mpFor, mpProvider);
  mpFor.onchange = () => syncProviderFields();
  function forSeat() { return mpFor.value || 'any'; }

  function agentWords(a) {
    const tags = [a.config.kind === 'mcp' ? 'mcp' : MM.providerLocality(a.config), a.config.vision ? 'sees' : 'text only'];
    return modelWords(a) + ' · ' + tags.join(' · ');
  }
  function callOf(id) {
    const c = lastCall.get(id), busy = (asking.get(id) || 0) > 0;
    const line = busy ? 'asking now' + (c ? ' · last: ' + callLine(c) : '') : callLine(c);
    return line ? '<div class="seatCall mpCall ' + (busy ? 'busy' : c.ok ? 'ok' : 'bad') + '">' + esc(line) + '</div>' : '';
  }

  function renderSeats() {
    if (!seatsPane) return;
    const readerNow = resolveReaders(seatModels()), writerNow = resolveWriters(seatModels());
    const names = (r) => r.who.map(agentById).filter(Boolean).map((a) => modelWords(a)).join(', ');
    let html = '<div class="mpHead"><span>seats</span><span class="seatKeys" title="one key a provider, entered once, used by every seat on it">' +
      (heldKeys.size ? heldKeys.size + ' key' + (heldKeys.size === 1 ? '' : 's') + ' held' : 'no key held') + '</span></div>';
    for (const seat of SEATS) {
      const w = SEAT_WORDS[seat];
      let who = '', body = '', call = '', note = '';
      if (seat === 'semantic') {
        // The semantic seat is on this device (I9, 03-semantic.js): a model loaded by a tap, no key, nothing sent.
        const p = semanticRowParts();
        who = p.who; body = p.body; call = p.call; note = p.note;
      } else if (seat === 'decider') {
        if (decider) {
          who = decider.name + ' · ' + MM.providerLocality(decider.config) + ' · taken only at ' + MM.DECIDER_TAKE_AT;
          body = '<button class="ghost" data-seat-try="decider" title="one tiny question: is it there, and does it answer in the shape asked?">try it</button><button class="ghost" data-seat-leave="decider">leave</button>';
          call = callOf(agentKey(decider.pseudo));
        } else { who = 'nothing chosen'; note = fallbackWords('decider'); body = '<button class="ghost" data-seat-set="decider">choose a model</button>'; }
      } else {
        const held = holderOf(seat);
        const pool = agents.filter((a) => isModel(a) && !isSeatAgent(a) && (seat === 'writer' || a.config.vision));
        const rows = orderedPool(pool);
        body = '<select class="seatPick" data-seat-pick="' + seat + '"><option value="">' + (held ? '— nothing (let go of it)' : '— nothing chosen') + '</option>' +
          rows.map((r) => '<option value="' + esc(r.id) + '"' + (held && agentKey(held) === r.id ? ' selected' : '') + '>' + esc(r.name) + (r.local ? ' · local' : ' · hosted') + '</option>').join('') + '</select>' +
          '<button class="ghost" data-seat-set="' + seat + '" title="join a model for this seat — the key already entered is used">another…</button>' +
          (held ? '<button class="ghost" data-seat-try="' + seat + '">try it</button>' : '');
        if (held) { who = agentWords(held); call = callOf(agentKey(held)); }
        else { who = 'nothing chosen'; note = fallbackWords(seat) + (names(seat === 'reader' ? readerNow : writerNow) ? ' — now: ' + names(seat === 'reader' ? readerNow : writerNow) : ''); }
      }
      html += '<div class="seatRow" data-seat="' + seat + '"><div class="seatHead"><b>' + seat + '</b><span class="seatJob">' + esc(w.job) + '</span></div>' +
        (body ? '<div class="seatBody">' + body + '</div>' : '') +
        '<div class="seatWho t">' + esc(who) + '</div>' + call + (note ? '<div class="seatFallback note">' + esc(note) + '</div>' : '') + '</div>';
    }
    seatsPane.innerHTML = html;
    bindSemanticRow(seatsPane);
    seatsPane.querySelectorAll('[data-seat-pick]').forEach((sel) => {
      sel.onchange = () => {
        const seat = sel.dataset.seatPick;
        if (!sel.value) { unseat(seat); mpStatus.textContent = 'The ' + seat + ' seat is let go — ' + fallbackWords(seat) + '.'; return; }
        const a = agentById(sel.value);
        if (!a) return;
        assignSeat(seat, a);
        renderAgents(); syncTiles();
        mpStatus.textContent = modelWords(a) + ' sits in the ' + seat + ' seat.';
      };
    });
    seatsPane.querySelectorAll('[data-seat-set]').forEach((b) => {
      b.onclick = () => { mpFor.value = b.dataset.seatSet; syncProviderFields(); mpModel.focus(); mpStatus.textContent = 'Name the model for the ' + b.dataset.seatSet + ' seat below — a key already entered is used.'; };
    });
    seatsPane.querySelectorAll('[data-seat-try]').forEach((b) => {
      b.onclick = () => { const seat = b.dataset.seatTry; if (seat === 'decider') tryDecider(); else tryModel(holderOf(seat)); };
    });
    seatsPane.querySelectorAll('[data-seat-leave]').forEach((b) => { b.onclick = () => unseat(b.dataset.seatLeave); });
  }
  /** Choices for a seat's select: local before hosted, the quickest last call first (03-seats.js). */
  function orderedPool(pool) {
    return orderChoices(pool.map((a) => { const c = lastCall.get(agentKey(a)); return { id: agentKey(a), name: modelWords(a), local: MM.providerLocality(a.config) === 'local', ms: c && c.ok ? c.ms : null }; }));
  }
  // The pane opens on the seats as they are now.
  new MutationObserver(() => { if (!panel.hasAttribute('hidden')) renderSeats(); }).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  renderSeats();

  /** The seats as the page holds them, for tests — never a key. */
  function seatsNow() {
    const who = (a) => (a ? { model: a.config.model, name: modelWords(a), local: MM.providerLocality(a.config) === 'local', sees: !!a.config.vision } : null);
    return {
      reader: who(holderOf('reader')),
      writer: who(holderOf('writer')),
      decider: decider ? { model: decider.config.model, name: decider.name, local: MM.providerLocality(decider.config) === 'local' } : null,
      any: agents.filter((a) => isModel(a) && !isSeatAgent(a) && !(seatsOfAgent.get(agentKey(a)) || new Set()).size).map(who),
      keys: [...heldKeys.keys()],
      remembered: [...rememberedKeys],
      pending: pendingPicks.map((p) => ({ model: p.pick.model, seats: p.seats.slice() })),
      readers: resolveReaders(seatModels()).who.map(agentById).filter(Boolean).map((a) => a.config.model),
      writers: resolveWriters(seatModels()).who.map(agentById).filter(Boolean).map((a) => a.config.model),
      kept: JSON.parse(JSON.stringify(seatPicks)),
      semantic: semanticNow().held,
    };
  }

// ===== models =====
// Provides: the model pane: probing local servers, joining by key, remembering the pick, offerModel,
//   and what the canvas does with no model (the tools registry's own, renderTools);
//   the work-in-progress register (withWork); askModelsAbout/cancelReading — a model is asked only by a deliberate act;
//   (V1-PLAN J5) what a provider says a model can do (factsOf), each model's last call and try it (noteOutcome),
//   an ask kept until a model that can answer it is here (keepAsk, keptFor, needFor), one local model suggested a job,
//   and a model's name and a reading in words (modelWords, readingWords).
// Uses: core, ui, teach (togglePanel), render, palette (refreshPalette), input (say).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () Ellipsis)();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Model participants (Tier 1–2) ====================================
  // A model joins through the SAME channel a human uses — session.join() then
  // session.propose(). Every reading it offers is held as an attributed,
  // unblessed edge beside Tier 0's, never instead of it.
  //
  // The picker, following what the site's search bar learned the hard way:
  //   - BOTH local servers are probed, in parallel. Returning on the first one
  //     that answered meant a running LM Studio hid Ollama entirely.
  //   - Embedding-only models are hidden AND explained. An Ollama holding only
  //     nomic-embed-text used to show nothing and say nothing.
  //   - The pick is remembered as a PREFERENCE: honoured when that server still
  //     offers that model, quietly ignored otherwise. A remembered pointer at
  //     something no longer running is worse than no memory at all.
  const modelBtn = document.getElementById('modelBtn');
  const panel = document.getElementById('modelPanel');
  ui.pane(panel, 'models', () => closePanel(panel, modelBtn));
  const mpProvider = document.getElementById('mpProvider');
  const mpEndpoint = document.getElementById('mpEndpoint');
  const mpModel = document.getElementById('mpModel');
  const mpKey = document.getElementById('mpKey');
  const mpRememberKey = document.getElementById('mpRememberKey');
  const mpStatus = document.getElementById('mpStatus');
  const mpList = document.getElementById('mpList');
  const mpLocal = document.getElementById('mpLocal');

  const PICK_KEY = 'mm-model-pick';
  const KEY_KEY = 'mm-model-key';
  const DEFAULT_MODEL = { openRouter: 'anthropic/claude-opus-5', anthropic: 'claude-opus-5', custom: '' };
  const agents = [];       // AgentParticipant[] — several models can coexist
  let localServers = [];   // [{ source, host, baseUrl, models, skipped }]

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (err) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (err) { /* private mode */ } },
    del(k) { try { localStorage.removeItem(k); } catch (err) { /* nothing */ } },
  };

  // ===== What a provider says a model can do, and each model's last call (V1-PLAN J5) =====
  // John joined GLM Flash from OpenRouter and could not get the canvas to send
  // it anything: whether a model could see was guessed from its id, and "glm"
  // was not in the guess, so *Read the writing* never asked it — it opened this
  // pane instead, which looked exactly like "it won't send". Now a join asks
  // the provider's own list (read once a page, lazily, never waited on past
  // LIST_WAIT_MS — a list that lands later still corrects the join), and each
  // model's row keeps its last call — ok, how long, what it came to — or the
  // failure in full, until the next.
  const LIST_WAIT_MS = 3000;
  const catalogs = new Map(); // baseUrl → Promise<ModelCatalog>, read once a page; a failure is not kept
  const factsOf = new Map();  // agent id → ModelFacts: what its provider said it can do, or why that is a guess
  const lastCall = new Map(); // agent id → { ok, ms, at, reply, error, truncated, what } — kept until the next
  const asking = new Map();   // agent id → calls in flight
  const sendOf = new Map();   // agent id → the transport that keeps its last call

  /** A model's name as the board says it: no `llm:`, what its provider calls it, else its id with colons as spaces — "qwen3.5 9b". */
  function modelWords(who) {
    if (!who) return '';
    if (typeof who === 'string') {
      const a = agents.find((x) => x.name === who || x.id === who);
      if (a) return modelWords(a);
      return /^llm:/.test(who) ? MM.modelWords({ model: who.slice(4) }) : who;
    }
    const c = who.config || {};
    return c.kind === 'openai-compatible' || c.kind === 'anthropic' ? MM.modelWords(c) : (who.name || '');
  }
  /** A reading in words, not a slug: "state-transformation" → "state transformation". Display only — the held reading keeps its label. */
  function readingWords(label) { return String(label || '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  /** A reply, short enough for a row. */
  function clipWords(text, n) { const t = String(text || '').replace(/\s+/g, ' ').trim(); return t.length > (n || 60) ? t.slice(0, (n || 60) - 1) + '…' : t; }
  const isModel = (a) => !!a && !!a.config && (a.config.kind === 'openai-compatible' || a.config.kind === 'anthropic');

  /** The provider's list, read once a page and kept; a list that could not be read is asked again next time. */
  function catalogOf(config) {
    const key = config.baseUrl.replace(/\/+$/, '');
    let p = catalogs.get(key);
    if (!p) {
      p = MM.readModels(config).then((c) => { if (!c.ok) catalogs.delete(key); return c; });
      catalogs.set(key, p);
    }
    return p;
  }

  /**
   * What a join is told of a model: what its provider's list says, if the list answers within
   * LIST_WAIT_MS; else what it said when the model last joined, else its id's guess — and the list,
   * still coming, corrects the join when it lands (`later`). Anthropic is not asked: its list wants
   * the key and says nothing of images, and every Claude model takes them.
   */
  async function factsFor(config, remembered) {
    const where = MM.whereOf(config.baseUrl);
    if (config.kind === 'anthropic') {
      const vision = MM.guessVision(config.model);
      return { first: { ok: true, facts: { vision: vision, from: 'id', said: 'Anthropic is not asked — every Claude model takes images', because: 'Anthropic is not asked; every Claude model takes images' } }, later: null, where: where };
    }
    const list = catalogOf(config);
    let timer = 0;
    const late = new Promise((r) => { timer = setTimeout(() => r(null), LIST_WAIT_MS); });
    const catalog = await Promise.race([list, late]);
    clearTimeout(timer);
    if (catalog) return { first: MM.modelFacts(config.model, catalog, where, remembered), later: null, where: where };
    const waiting = { ok: false, models: [], describes: false, error: 'it did not answer in ' + LIST_WAIT_MS / 1000 + ' s' };
    return { first: MM.modelFacts(config.model, waiting, where, remembered), later: list, where: where };
  }

  /** What the facts say, on the config the transport reads: whether it sees, what it is called, what it may read and write. */
  function applyFacts(config, facts) {
    config.vision = !!facts.vision;
    if (facts.title) config.title = facts.title;
    if (facts.contextLength) config.contextLength = facts.contextLength;
    if (facts.maxOutput) config.maxOutput = facts.maxOutput;
  }

  /** The remembered pick keeps what the provider said, so a list that cannot be read at the next visit still knows. */
  function rememberFacts(config) {
    const pick = store.get(PICK_KEY);
    if (pick && pick.baseUrl === config.baseUrl && pick.model === config.model) store.set(PICK_KEY, Object.assign(pick, { vision: !!config.vision }, config.title ? { title: config.title } : {}));
  }

  /** The transport a joined model is asked through: core's, with each call kept for its row. */
  function recording(holder) {
    return (config, messages, opts) => {
      const t0 = performance.now();
      if (holder.agent) { asking.set(holder.agent.id, (asking.get(holder.agent.id) || 0) + 1); renderAgents(); }
      return MM.complete(config, messages, opts).then((res) => {
        if (holder.agent) noteCall(holder.agent, res, performance.now() - t0);
        return res;
      });
    };
  }
  function sendFor(agent) {
    if (!sendOf.has(agent.id)) sendOf.set(agent.id, recording({ agent: agent }));
    return sendOf.get(agent.id);
  }
  /** A call ended: kept for the row, whatever it came to — except a cancel, which is no outcome. */
  function noteCall(agent, res, ms) {
    asking.set(agent.id, Math.max(0, (asking.get(agent.id) || 1) - 1));
    if (!(res && !res.ok && res.error === 'cancelled')) {
      lastCall.set(agent.id, { ok: !!res.ok, ms: ms, at: Date.now(), reply: res.ok ? res.text : null, error: res.ok ? null : res.error, truncated: !!(res.ok && res.truncated), what: null });
    }
    renderAgents();
  }
  /** What the call came to in the canvas's terms — read “hello”, reads it as molecule — or why its answer was no use. */
  function noteOutcome(agent, ok, what) {
    if (!agent || (!ok && what === 'cancelled')) return;
    const c = lastCall.get(agent.id) || { ok: ok, ms: null, at: Date.now(), reply: null, error: null, truncated: false, what: null };
    const next = Object.assign({}, c);
    if (ok) { next.ok = true; next.what = what; }
    else if (c.ok !== false) { next.ok = false; next.error = what + (c.truncated ? ' — the answer was cut off at the token limit' : ''); next.what = null; }
    lastCall.set(agent.id, next);
    renderAgents();
  }
  /** A row's last call, in a line: "ok · 1.8 s · read “hello”", or "failed · 0.4 s · HTTP 401 — bad key: …". */
  function callLine(c) {
    if (!c) return '';
    const secs = c.ms == null ? '' : ' · ' + (c.ms / 1000).toFixed(1) + ' s';
    if (c.ok) return 'ok' + secs + ' · ' + (c.what || 'replied “' + clipWords(c.reply) + '”') + (c.truncated && !c.what ? ' · cut off at the token limit' : '');
    return 'failed' + secs + ' · ' + c.error;
  }
  /** Tokens, short: 202752 → "203k". */
  const tokensShort = (n) => (n >= 1000 ? Math.round(n / 1000) + 'k' : String(n));

  // ===== An ask kept until a model that can answer it is here (J5, the pure-user walkthrough) =====
  // Asking never opens this pane as a side effect. An ask that needs a model —
  // What is this?, Read the writing, a brief — with none here that can answer
  // it is KEPT: the status line says so once, the field says what it needs
  // with a way to choose one, and the moment a model that can answer it joins,
  // it runs. The pane opens only when the hand asks for it ("choose one").
  let keptAsk = null; // { what, needs: 'model'|'sees', need, sentence, ids, summonId, generation, run(ids) }
  /** What a tool's ask needs that no joined model gives — "needs a model that can see" — or null. */
  function needFor(tool) {
    if (tool === 'read') return agents.some((a) => a.config && a.config.vision) ? null : 'needs a model that can see';
    return agents.length ? null : 'needs a model';
  }
  function keepAsk(ask) {
    const s = session.getState();
    keptAsk = Object.assign({ at: Date.now(), generation: s.generation, summonId: s.summon ? s.summon.id : null }, ask);
    say(ask.sentence);
    mpStatus.textContent = ask.sentence;
    refreshPalette();
    return false;
  }
  /** The ask kept for this field, if one waits there. */
  function keptFor(summon) { return keptAsk && summon && keptAsk.summonId === summon.id ? keptAsk : null; }
  /** A model joined (or learned it can see): the kept ask runs if it can answer it. */
  function runKeptAsk(agent) {
    if (!keptAsk || !agent) return false;
    if (keptAsk.needs === 'sees' ? !(agent.config && agent.config.vision) : !agents.includes(agent)) return false;
    const ask = keptAsk;
    keptAsk = null;
    const s = session.getState();
    const ids = (ask.ids || []).filter((id) => s.nodes.has(id));
    if (s.generation !== ask.generation || (ask.ids && ask.ids.length && !ids.length)) {
      say('the ask kept for a model was about marks no longer here — nothing asked');
      refreshPalette();
      return false;
    }
    say('asking ' + modelWords(agent) + ' what you asked before a model was here: ' + ask.what);
    ask.run(ids);
    refreshPalette();
    return true;
  }

  function syncProviderFields() {
    const p = mpProvider.value;
    mpEndpoint.hidden = p !== 'custom' && p !== 'mcp';
    mpKey.hidden = p === 'mcp';
    mpEndpoint.placeholder = p === 'mcp' ? 'http://127.0.0.1:8030 — the door (Demos/mcp-client.mjs)' : 'http://host:port/v1';
    mpModel.placeholder = p === 'mcp' ? 'a name for it (optional)' : (DEFAULT_MODEL[p] || 'model id');
    mpKey.placeholder = p === 'custom' ? 'API key (if the endpoint needs one)' : 'API key';
  }
  mpProvider.onchange = syncProviderFields;
  syncProviderFields();

  // --- Local servers, both at once ---
  async function probeLocal() {
    // Each server says what its models can do; the pane only relays it. A
    // model that can SEE is the one that gets asked to read handwriting —
    // Ollama lists `vision` among capabilities, LM Studio types the model `vlm`.
    // How big a model is, in billions of parameters, for suggesting one a job (J5): what the
    // server says ("9.7B", "137M"), else what its name says ("qwen3:8b"); unknown is Infinity.
    const billions = (said, name) => {
      const m = /^(\d+(?:\.\d+)?)\s*([BM])/i.exec(String(said || '')) || /(\d+(?:\.\d+)?)\s*(b)\b/i.exec(String(name || ''));
      return m ? parseFloat(m[1]) / (m[2].toUpperCase() === 'M' ? 1000 : 1) : Infinity;
    };
    const probes = [
      { source: 'Ollama', preset: 'ollama', list: ['http://localhost:11434/api/tags'],
        pick: (d) => (d.models || []).map((m) => ({ name: m.name,
          chat: !(m.capabilities && m.capabilities.length && !m.capabilities.includes('completion')) && !/embed/i.test(m.name),
          vision: !!(m.capabilities && m.capabilities.includes('vision')),
          size: billions(m.details && m.details.parameter_size, m.name) })) },
      { source: 'LM Studio', preset: 'lmStudio', list: ['http://localhost:1234/api/v0/models', 'http://localhost:1234/v1/models'],
        pick: (d) => (d.data || []).map((m) => ({ name: m.id, chat: !/embed/i.test(m.id) && m.type !== 'embeddings',
          vision: m.type === 'vlm', size: billions(null, m.id) })) },
    ];
    const settled = await Promise.allSettled(probes.map(async (pr) => {
      let all = null, err = null;
      for (const url of pr.list) {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
          if (!res.ok) { err = new Error('HTTP ' + res.status); continue; }
          all = pr.pick(await res.json());
          break;
        } catch (e) { err = e; }
      }
      if (!all) throw err || new Error('no answer');
      return {
        source: pr.source, preset: pr.preset, baseUrl: MM.PRESETS[pr.preset].baseUrl,
        host: MM.PRESETS[pr.preset].baseUrl.replace(/^https?:\/\//, '').replace(/\/v1$/, ''),
        models: all.filter((m) => m.chat).map((m) => m.name).sort(),
        vision: all.filter((m) => m.chat && m.vision).map((m) => m.name),
        sizes: Object.fromEntries(all.map((m) => [m.name, m.size])),
        skipped: all.filter((m) => !m.chat).map((m) => m.name),
      };
    }));
    localServers = settled.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    renderLocal();
    return localServers;
  }

  const isJoined = (baseUrl, model) => agents.some((a) => a.config.baseUrl === baseUrl && a.config.model === model);

  // One model a job (J5, the pure-user walkthrough): with a long list on this
  // machine the pane suggests the smallest model that sees, for reading
  // writing (a word is a small job, and a 27B model takes minutes at it), and
  // a mid-size one for What is this? — and keeps the rest behind "all N
  // models". A flat list of thirteen asked the hand to know them all.
  let showAllLocal = false;
  const SUGGEST_FROM = 4; // fewer models than this are simply listed
  const MID_SIZE_B = 8;   // What is this?: the model nearest this many billions — enough to read a brief, quick enough on a laptop
  function suggestLocal(servers) {
    const all = [];
    for (const sv of servers) for (const name of sv.models) all.push({ sv: sv, name: name, sees: sv.vision.includes(name), size: (sv.sizes && sv.sizes[name]) || Infinity });
    if (all.length < SUGGEST_FROM) return null;
    const seers = all.filter((m) => m.sees).sort((a, b) => a.size - b.size || a.name.localeCompare(b.name));
    const near = (m) => Math.abs(Math.log(m.size / MID_SIZE_B));
    const sized = all.filter((m) => Number.isFinite(m.size)).sort((a, b) => near(a) - near(b) || a.name.localeCompare(b.name));
    return { read: seers[0] || null, what: sized[0] || all[Math.floor(all.length / 2)] };
  }
  function modelButton(sv, m, job) {
    const on = isJoined(sv.baseUrl, m);
    const why = (job ? job + ' · ' : '') + (on ? 'joined' : 'local' + (sv.vision.includes(m) ? ' · sees' : '') + ' · tap to join');
    return '<button class="model' + (job ? ' suggested' : '') + (on ? ' on' : '') + '" data-base="' + esc(sv.baseUrl) + '" data-model="' + esc(m) + '">' +
      '<span>' + esc(m) + '</span><span class="why">' + esc(why) + '</span></button>';
  }

  function renderLocal() {
    if (!localServers.length) {
      mpLocal.innerHTML = '<div class="note">nothing answered on :11434 or :1234</div>';
      return;
    }
    let html = '';
    const sug = suggestLocal(localServers);
    if (sug) {
      const count = localServers.reduce((n, sv) => n + sv.models.length, 0);
      const jobs = new Map();
      const add = (m, job) => { if (!m) return; const k = m.sv.baseUrl + ' ' + m.name; if (jobs.has(k)) jobs.get(k).jobs.push(job); else jobs.set(k, { m: m, jobs: [job] }); };
      add(sug.read, 'reads writing');
      add(sug.what, 'what is this?');
      html += '<div class="server"><b>suggested</b><span>one model a job</span></div>';
      for (const j of jobs.values()) html += modelButton(j.m.sv, j.m.name, j.jobs.join(' · '));
      html += '<button class="ghost mpAll" type="button">' + (showAllLocal ? 'fewer ▴' : 'all ' + count + ' models ▾') + '</button>';
    }
    if (!sug || showAllLocal) {
      for (const sv of localServers) {
        html += '<div class="server"><b>' + esc(sv.source) + '</b><span>' + esc(sv.host) + '</span></div>';
        for (const m of sv.models) html += modelButton(sv, m, null);
        if (!sv.models.length && sv.skipped.length) {
          html += '<div class="note">only embedding models here — they cannot chat</div>';
        } else if (sv.skipped.length) {
          html += '<div class="note">' + sv.skipped.length + ' embedding model' + (sv.skipped.length === 1 ? '' : 's') + ' hidden</div>';
        }
      }
    }
    mpLocal.innerHTML = html;
    mpLocal.querySelectorAll('.model').forEach((btn) => {
      btn.onclick = () => {
        const sv = localServers.find((x) => x.baseUrl === btn.dataset.base);
        const name = btn.dataset.model, sees = sv.vision.includes(name);
        const because = sv.source + (sees ? ' lists vision among what it takes' : ' lists no vision for it');
        join(Object.assign({}, MM.PRESETS[sv.preset], { model: name, vision: sees }), { provider: sv.preset }, { vision: sees, from: 'provider', said: because, because: because });
      };
    });
    const all = mpLocal.querySelector('.mpAll');
    if (all) all.onclick = () => { showAllLocal = !showAllLocal; renderLocal(); };
  }

  // --- Joining, and remembering ---
  // `facts`: what its provider said it can do, or why that is a guess (J5) — the row's tooltip, and the
  // reason a model that reads text only gives when writing is to be read.
  function join(config, pick, facts) {
    if (isJoined(config.baseUrl, config.model)) {
      mpStatus.textContent = MM.modelWords(config) + ' is already here.';
      return null;
    }
    // Several models may run at once — that is the point. Every model is
    // tier 2; local or hosted is a cost the router pays attention to. Each is
    // asked through a transport that keeps its last call for its row (J5).
    const holder = {};
    const send = recording(holder);
    const agent = MM.createAgentParticipant(session, config, Date.now(), { transport: send });
    holder.agent = agent;
    sendOf.set(agent.id, send);
    if (facts) factsOf.set(agent.id, facts);
    agents.push(agent);
    // The pick remembers what the provider said (whether it sees, what it is called) — never the key, which is its own entry.
    if (pick) store.set(PICK_KEY, Object.assign({ baseUrl: config.baseUrl, model: config.model, kind: config.kind, vision: !!config.vision }, config.title ? { title: config.title } : {}, pick));
    mpStatus.textContent = modelWords(agent) + ' joined (' + MM.providerLocality(config) + (config.vision ? ', sees' : '') + ').';
    renderAgents();
    renderLocal();
    syncTiles();
    render(session.getState());
    // Nothing is read on join: a model is asked when you ask (§6.3). Auto-read is the one exception, and it is a tile —
    // and an ask the hand made before any model was here, kept for one that can answer it (J5).
    if (autoRead) readWriting(session.getState());
    runKeptAsk(agent);
    return agent;
  }

  /**
   * Join a hosted model, or one at a custom endpoint, the way its provider says it can be (J5): its
   * list is asked what the model is — refused, with the nearest ids, when the list holds no such id;
   * joined with whether it sees and what it reads when it does; joined on its id's guess, said to be,
   * when the list does not answer within LIST_WAIT_MS, and corrected when it lands.
   */
  const joining = new Set();
  async function joinHosted(config, pick, remembered) {
    const k = config.baseUrl + ' ' + config.model;
    if (isJoined(config.baseUrl, config.model)) { mpStatus.textContent = MM.modelWords(config) + ' is already here.'; return null; }
    if (joining.has(k)) return null;
    joining.add(k);
    try {
      const where = MM.whereOf(config.baseUrl);
      mpStatus.textContent = 'asking ' + where.name + ' what ' + config.model + ' can do…';
      const got = await factsFor(config, remembered);
      if (!got.first.ok) { mpStatus.textContent = got.first.error; return null; }
      applyFacts(config, got.first.facts);
      const agent = join(config, pick, got.first.facts);
      if (!agent) return null;
      rememberFacts(config);
      mpStatus.textContent = modelWords(agent) + ' joined — ' + got.first.facts.said + '.';
      if (got.later) got.later.then((catalog) => refineFacts(agent, catalog, got.where));
      return agent;
    } finally {
      joining.delete(k);
    }
  }
  /** The provider's list landed after the join: what it says now stands — or, where it holds no such id, the row says so. */
  function refineFacts(agent, catalog, where) {
    if (!agents.includes(agent) || !catalog || !catalog.ok) return;
    const f = MM.modelFacts(agent.config.model, catalog, where);
    if (!f.ok) { noteOutcome(agent, false, f.error); mpStatus.textContent = f.error; return; }
    applyFacts(agent.config, f.facts);
    factsOf.set(agent.id, f.facts);
    rememberFacts(agent.config);
    renderAgents();
    syncTiles();
    runKeptAsk(agent);
  }

  function leave(agent) {
    const i = agents.indexOf(agent);
    if (i >= 0) agents.splice(i, 1);
    factsOf.delete(agent.id); lastCall.delete(agent.id); asking.delete(agent.id); sendOf.delete(agent.id);
    // The session keeps the join in its history; it simply stops being asked.
    const pick = store.get(PICK_KEY);
    if (pick && pick.baseUrl === agent.config.baseUrl && pick.model === agent.config.model) { store.del(PICK_KEY); store.del(KEY_KEY); }
    mpStatus.textContent = modelWords(agent) + ' left.';
    renderAgents();
    renderLocal();
    syncTiles();
    render(session.getState());
  }

  // What the canvas does itself, with no model (V1-PLAN B1): the registered tools that
  // ask none, each with what it does as its tooltip — so what a model ADDS is what is
  // not on this line. Read from the registry, and again whenever it changes.
  const mpTools = document.getElementById('mpTools');
  function renderTools() {
    if (!mpTools) return;
    mpTools.innerHTML = MM.registeredTools().filter((t) => !t.asks)
      .map((t) => '<span title="' + esc(t.describe()) + '">' + esc(t.name) + '</span>').join(' · ');
  }
  renderTools();
  MM.onToolsChange(renderTools);

  // Each joined model, in words (J5): what it is, where, whether it sees and how much it reads — the tooltip says
  // what its provider said, or why that is a guess — its last call, kept until the next, and *try it*.
  function renderAgents() {
    mpList.innerHTML = agents.map((a, i) => {
      const f = factsOf.get(a.id);
      const tags = [a.config.kind === 'mcp' ? 'mcp' : MM.providerLocality(a.config)];
      if (isModel(a)) tags.push(a.config.vision ? 'sees' : 'text only');
      if (a.config.contextLength) tags.push(tokensShort(a.config.contextLength));
      const c = lastCall.get(a.id), busy = (asking.get(a.id) || 0) > 0;
      const line = busy ? 'asking now' + (c ? ' · last: ' + callLine(c) : '') : callLine(c);
      return '<div class="mpItem">' +
        '<div class="mpItemHead"><span class="n" title="' + esc(a.name) + '">' + esc(modelWords(a)) + '</span>' +
        (isModel(a) ? '<button class="ghost" data-try="' + i + '" title="one tiny prompt: is it there, and does it answer?">try it</button>' : '') +
        '<button class="ghost" data-leave="' + i + '">leave</button></div>' +
        '<div class="t"' + (f ? ' title="' + esc(f.said) + '"' : '') + '>' + esc(tags.join(' · ')) + '</div>' +
        (line ? '<div class="mpCall ' + (busy ? 'busy' : c.ok ? 'ok' : 'bad') + '">' + esc(line) + '</div>' : '') +
        '</div>';
    }).join('');
    mpList.querySelectorAll('[data-leave]').forEach((b) => { b.onclick = () => leave(agents[Number(b.dataset.leave)]); });
    mpList.querySelectorAll('[data-try]').forEach((b) => { b.onclick = () => tryModel(agents[Number(b.dataset.try)]); });
  }

  // *Try it* (J5): one tiny prompt, a deliberate act, and the reply — or the failure, in full — in the row.
  const TRY_MESSAGES = [
    { role: 'system', content: 'This is a connection check from a drawing canvas. Reply with the single word ok and nothing else.' },
    { role: 'user', content: 'Are you there?' },
  ];
  async function tryModel(agent) {
    if (!agent || !isModel(agent)) return;
    const res = await sendFor(agent)(agent.config, TRY_MESSAGES, {});
    if (res.ok) noteOutcome(agent, true, 'replied “' + clipWords(res.text) + '”');
    mpStatus.textContent = modelWords(agent) + (res.ok ? ' answered.' : ' did not answer — ' + res.error);
  }

  document.getElementById('mpAdd').onclick = () => {
    const p = mpProvider.value;
    if (p === 'mcp') { addMcp(); return; }
    const model = (mpModel.value || DEFAULT_MODEL[p] || '').trim();
    const key = mpKey.value.trim();
    if (!model) { mpStatus.textContent = 'Which model? Type its id.'; return; }
    let config;
    if (p === 'custom') {
      const base = mpEndpoint.value.trim().replace(/\/+$/, '');
      if (!base) { mpStatus.textContent = 'Where is it? Enter the endpoint, e.g. http://localhost:8080/v1'; return; }
      config = { kind: 'openai-compatible', baseUrl: /\/v1$/.test(base) ? base : base + '/v1', model: model };
    } else {
      if (!key) { mpStatus.textContent = p + ' needs a key.'; return; }
      config = Object.assign({}, MM.PRESETS[p], { model: model });
    }
    if (key) config.apiKey = key;
    // What it can do is the provider's to say (J5): its list, read once a page; the id's guess only when the list cannot be read.
    joinHosted(config, { provider: p, endpoint: p === 'custom' ? config.baseUrl : undefined }).then((agent) => {
      if (!agent) return;
      // The key is remembered only when asked, and only on this device.
      if (key && mpRememberKey.checked) store.set(KEY_KEY, key); else store.del(KEY_KEY);
      mpKey.value = '';
    });
  };

  // --- Coming back: the remembered pick rejoins if it can ---
  async function rejoinRemembered() {
    const pick = store.get(PICK_KEY);
    if (!pick) return;
    // A local server's model is asked for again where it runs. (This asked `providerTier(…) === 1`,
    // which has been 2 for every model since 6 Sep — so a remembered Ollama pick asked for a key.)
    if (pick.provider === 'ollama' || pick.provider === 'lmStudio') {
      const servers = await probeLocal();
      const sv = servers.find((x) => x.baseUrl === pick.baseUrl);
      if (sv && sv.models.includes(pick.model)) {
        const sees = sv.vision.includes(pick.model);
        const because = sv.source + (sees ? ' lists vision among what it takes' : ' lists no vision for it');
        join(Object.assign({}, MM.PRESETS[sv.preset], { model: pick.model, vision: sees }), null, { vision: sees, from: 'provider', said: because, because: because });
      } else mpStatus.textContent = 'Remembered ' + pick.model + ', but ' + pick.baseUrl + ' is not offering it right now.';
      return;
    }
    const key = store.get(KEY_KEY);
    const config = pick.provider === 'custom'
      ? { kind: 'openai-compatible', baseUrl: pick.baseUrl, model: pick.model }
      : Object.assign({}, MM.PRESETS[pick.provider] || { kind: pick.kind, baseUrl: pick.baseUrl }, { model: pick.model });
    // What the provider said when it last joined stands until its list says otherwise (J5).
    const remembered = typeof pick.vision === 'boolean' ? { vision: pick.vision, title: pick.title } : undefined;
    // A pick that does not rejoin says why where the hand is looking, not only in a pane that is closed at boot.
    const rejoin = () => joinHosted(config, null, remembered).then((a) => { if (!a && mpStatus.textContent) say('the remembered model did not rejoin — ' + mpStatus.textContent); });
    if (key) { config.apiKey = key; rejoin(); return; }
    if (pick.provider !== 'custom') {
      mpProvider.value = pick.provider; syncProviderFields(); mpModel.value = pick.model;
      mpStatus.textContent = 'Remembered ' + pick.model + ' — enter its key to rejoin.';
    } else {
      mpProvider.value = 'custom'; syncProviderFields(); mpEndpoint.value = pick.baseUrl; mpModel.value = pick.model;
      rejoin();
    }
  }

  document.getElementById('mpDetect').onclick = () => { mpStatus.textContent = 'looking…'; probeLocal().then((s) => { mpStatus.textContent = s.length ? '' : 'Nothing answered.'; }); };

  // ===== MCP: the door — an MCP server joins as a participant =================
  // Bidirectional: Demos/mcp.mjs lets a client write to the board; this lets
  // the board ask a server — a parsing method beside the local and hosted
  // models. The bridge is Demos/mcp-client.mjs (the browser can spawn nothing,
  // and most servers send no CORS headers). Three roles are mapped from the
  // server's tools, and the contract each is called with:
  //   read:   { brief, ids } — or { image, nodeId, brief } for handwriting —
  //           answers JSON [{label, confidence, reasoning}] / [{text, confidence}]
  //   answer: { question, ids, brief } → text, placed IN the canvas
  //   draw:   { prompt, ids } → JSON { shapes, strokes, why? }
  // A role with no tool answers gracefully that this participant does not do
  // that — the field keeps working through the others.
  function mcpAgent(endpoint, serverName, roles) {
    const name = 'mcp:' + serverName;
    const id = session.join('agent', name, Date.now(), 2, MM.providerLocality({ baseUrl: endpoint }));
    const briefFor = (ids) => MM.describeSession(session.getState(), { nodeIds: ids });
    const call = async (tool, args) => {
      const res = await fetch(endpoint + '/call', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: tool, arguments: args }) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || out.error) throw new Error(out.error || 'HTTP ' + res.status);
      if (out.isError) throw new Error(out.text || 'the tool said no');
      return out;
    };
    // The first JSON value in the text, array or object — tolerant of a word around it.
    const jsonBlock = (text) => {
      const m = /(\[[\s\S]*\]|\{[\s\S]*\})/.exec(text || '');
      if (!m) throw new Error('no JSON in the answer');
      return JSON.parse(m[0]);
    };
    const slug = (s) => String(s).toLowerCase().replace(/\s+/g, '-');
    return {
      id: id, name: name, config: { kind: 'mcp', baseUrl: endpoint, model: serverName },
      async interpret(ids, at) {
        if (!roles.read) return { ok: false, readings: [], error: 'no read tool mapped' };
        try {
          const out = await call(roles.read, { brief: briefFor(ids), ids: ids });
          const readings = jsonBlock(out.text).map((r) => ({ label: String(r.label || r.type || '?'), confidence: Math.max(0, Math.min(1, Number(r.confidence ?? 0.7))), reasoning: String(r.reasoning || 'read by ' + name) }));
          const s = session.getState();
          for (const nid of ids) {
            if (!s.nodes.has(nid)) continue;
            session.propose({ participantId: id, nodeId: nid, edges: readings.map((r) => ({ to: 'type:' + slug(r.label), rel: 'resembles', weight: r.confidence, reasoning: r.reasoning })), at: at });
          }
          return { ok: true, readings: readings };
        } catch (err) { return { ok: false, readings: [], error: err.message }; }
      },
      async ask(question, ids, at) {
        if (!roles.answer) return { ok: false, error: 'no answer tool mapped' };
        try {
          const out = await call(roles.answer, { question: question, ids: ids, brief: briefFor(ids) });
          session.answer({ participantId: id, question: question, text: out.text, aboutIds: ids, at: at });
          return { ok: true };
        } catch (err) { return { ok: false, error: err.message }; }
      },
      async generate() { return { ok: false, error: 'an MCP participant reads, answers and draws; it does not write pages (yet)' }; },
      async read(args) {
        if (!roles.read) return { ok: false, transcripts: [], error: 'no read tool mapped' };
        try {
          const out = await call(roles.read, { image: args.image, nodeId: args.nodeId, brief: 'Read the handwriting in this ink.' });
          const ts = jsonBlock(out.text).map((t) => ({ text: String(t.text || t), confidence: Number(t.confidence ?? 0.7) }));
          if (args.hold !== false) session.propose({ participantId: id, nodeId: args.nodeId, edges: [], reps: ts.map((t) => ({ modality: 'transcript', data: { text: t.text }, confidence: t.confidence })), at: args.at });
          return { ok: true, transcripts: ts };
        } catch (err) { return { ok: false, transcripts: [], error: err.message }; }
      },
      async draw({ prompt, nodeIds, at }) {
        if (!roles.draw) return { ok: false, ids: [], shapes: [], error: 'no draw tool mapped' };
        try {
          const out = await call(roles.draw, { prompt: prompt, ids: nodeIds });
          const data = jsonBlock(out.text);
          const made = [];
          const shapes = Array.isArray(data.shapes) ? data.shapes : [];
          for (const sh of MM.parseShapes(JSON.stringify(shapes))) { const pts = MM.strokeFor(sh); if (pts) made.push(session.addStroke(pts, at, id, 1, { content: true })); }
          for (const st of (Array.isArray(data.strokes) ? data.strokes : [])) {
            const pts = (Array.isArray(st) ? st : []).map((p) => ({ x: Number(p.x), y: Number(p.y) })).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
            if (pts.length > 1) made.push(session.addStroke(pts, at, id, 1, { content: true }));
          }
          if (data.why && made.length) session.answer({ participantId: id, question: 'why', text: String(data.why), aboutIds: made, at: at });
          return made.length
            ? { ok: true, ids: made, shapes: shapes.map((s) => s.shape || '?') }
            : { ok: false, ids: [], shapes: [], error: 'it drew nothing the canvas can read' };
        } catch (err) { return { ok: false, ids: [], shapes: [], error: err.message }; }
      },
      async behave() { return { ok: false, error: 'no behaviour tool mapped' }; },
    };
  }

  /** The likely tool for a role, by name — the hand's own verbs guess themselves. */
  function guessTool(tools, words) {
    const t = tools.find((t) => words.some((w) => t.name.toLowerCase().includes(w)));
    return t ? t.name : '';
  }

  /** Connect to a door, show its tools with the three role pickers, and join on the hand's word. */
  async function addMcp() {
    const endpoint = mpEndpoint.value.trim().replace(/\/+$/, '');
    if (!endpoint) { mpStatus.textContent = 'Where is the door? e.g. http://127.0.0.1:8030 — node Demos/mcp-client.mjs -- node server.mjs'; return; }
    mpStatus.textContent = 'knocking…';
    let server, tools;
    try {
      const res = await fetch(endpoint + '/tools', { signal: AbortSignal.timeout(8000) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || out.error) throw new Error(out.error || 'HTTP ' + res.status);
      server = out.server || {}; tools = out.tools || [];
    } catch (err) {
      mpStatus.textContent = 'No answer — is the door running? (node Demos/mcp-client.mjs -- node server.mjs) ' + err.message;
      return;
    }
    const name = (mpModel.value.trim() || server.name || 'server').replace(/\s+/g, '-');
    const guess = {
      read: guessTool(tools, ['propose', 'interpret', 'read', 'parse', 'transcribe']),
      answer: guessTool(tools, ['say', 'answer', 'ask']),
      draw: guessTool(tools, ['draw']),
    };
    let html = '<div class="server"><b>' + esc(server.name || name) + '</b><span>' + tools.length + ' tool' + (tools.length === 1 ? '' : 's') + '</span></div>';
    if (!tools.length) { mpLocal.innerHTML = html + '<div class="note">no tools here — nothing to map</div>'; mpStatus.textContent = ''; return; }
    for (const role of ['read', 'answer', 'draw']) {
      html += '<div class="mpRow"><span class="k">' + role + '</span><select data-role="' + role + '"><option value="">— not offered</option>' +
        tools.map((t) => '<option value="' + esc(t.name) + '"' + (guess[role] === t.name ? ' selected' : '') + '>' + esc(t.name) + '</option>').join('') + '</select></div>';
    }
    html += '<div class="mpRow"><button id="mcpJoin">join as mcp:' + esc(name) + '</button></div>';
    html += '<div class="note">' + tools.map((t) => esc(t.name)).join(' · ') + '</div>';
    mpLocal.innerHTML = html;
    mpStatus.textContent = (server.name || 'The server') + ' answered — map its tools, then join.';
    mpLocal.querySelector('#mcpJoin').onclick = () => {
      const roles = {};
      mpLocal.querySelectorAll('select[data-role]').forEach((sel) => { roles[sel.dataset.role] = sel.value || null; });
      const agent = mcpAgent(endpoint, name, roles);
      agents.push(agent);
      mpStatus.textContent = agent.name + ' joined (' + Object.values(roles).filter(Boolean).length + ' of 3 roles mapped).';
      renderAgents();
      syncTiles();
      render(session.getState());
    };
  }
  modelBtn.onclick = () => {
    togglePanel(panel, modelBtn);
    if (!panel.hasAttribute('hidden')) probeLocal();
  };
  document.getElementById('mpClose').onclick = () => closePanel(panel, modelBtn);

  /** Open the models pane because something needed one — says why. */
  // ===== Work in progress: a model is thinking, and the board says so =====
  // Every call to a model is registered here while it runs, with the marks it
  // is about, so the canvas can show the thinking NEAR what it is thinking
  // about — not only in a pane the hand may have closed. A call that ends,
  // succeeds or fails, leaves the list.
  const working = new Map(); // key -> { ids, label, since }
  const workControllers = new Map(); // key -> AbortController, for a call the hand can stop
  let workingPulse = 0;
  function beginWork(key, ids, label) {
    working.set(key, { ids: (ids || []).slice(), label: label, since: performance.now() });
    if (!workingPulse) workingPulse = setInterval(() => { if (working.size) render(session.getState()); else { clearInterval(workingPulse); workingPulse = 0; } }, 400);
    render(session.getState());
    return key;
  }
  function endWork(key) {
    working.delete(key);
    workControllers.delete(key);
    render(session.getState());
  }
  /** Run a model call with the thinking shown; the promise is passed through untouched. */
  function withWork(key, ids, label, promise) {
    beginWork(key, ids, label);
    return promise.finally(() => endWork(key));
  }
  /** A signal for a call registered under this key, so Esc can stop it. */
  function workSignal(key) {
    const ctl = new AbortController();
    workControllers.set(key, ctl);
    return ctl.signal;
  }
  /** How long a call has been running, said after a few seconds — a model that takes a minute is not a hang. */
  function workingLabel(w) {
    const secs = Math.round((performance.now() - w.since) / 1000);
    return w.label + (secs >= 3 ? ' · ' + secs + ' s' : '') + (secs >= 30 ? ' · Esc stops it' : '');
  }
  function workingSummary() {
    return [...working.values()].map(workingLabel).join(' · ');
  }
  /** Stop every model call in flight: the hand's Esc. Nothing that landed is undone. */
  function cancelWork() {
    let n = 0;
    for (const ctl of workControllers.values()) { ctl.abort(); n++; }
    workControllers.clear();
    if (reading) { cancelReading('stopped'); n++; }
    if (n) say('stopped ' + n + ' model call' + (n === 1 ? '' : 's'));
    return n;
  }

  function offerModel(why) {
    if (panel.hasAttribute('hidden')) openPane(panel, modelBtn);
    probeLocal();
    mpStatus.textContent = why || 'That needs a model.';
  }

  // A model is asked what a group IS only when the human asks (§6.3): the
  // field's *What is this?*, or `what:` typed at a selection. Every joined
  // model is asked at once and each reading lands independently, held and
  // attributed, so the certainty row can show them beside Tier 0's.
  //
  // A reading is worth having, but it is NOT worth making the human wait for.
  // A local server answers one request at a time, so it is cancellable, and
  // committing to a prompt cancels it.
  let reading = null; // AbortController for interpretations in flight

  function cancelReading(why) {
    if (!reading) return;
    reading.abort();
    reading = null;
    if (why) say(why);
  }

  // Which marks a reading was asked about: a model's readings are held on the
  // group's first member, and the chip beside the group needs the group.
  const readGroups = new Map();
  function askModelsAbout(ids) {
    if (!ids || !ids.length) { say('nothing to read'); return false; }
    // No model here: the ask is kept, said once, and runs when one joins — never the pane popped over the field (J5).
    if (agents.length === 0) {
      return keepAsk({ what: 'What is this?', needs: 'model', need: 'needs a model', ids: ids.slice(), run: (live) => askModelsAbout(live),
        sentence: 'What is this? needs a model — kept: it runs when one joins · choose one under models' });
    }
    cancelReading();
    readGroups.set(ids[0], ids.slice());
    const ctl = new AbortController();
    reading = ctl;
    let left = agents.length;
    agents.forEach((agent) => {
      withWork('read:' + agent.id + ':' + ids.join('+'), ids, modelWords(agent) + ' · reading the group', agent.interpret(ids, Date.now(), ctl.signal)).then((res) => {
        if (ctl.signal.aborted) return;
        if (--left === 0 && reading === ctl) reading = null;
        // The row keeps what it came to; the status line says it once — a reading in words, a failure in full (J5).
        const words = res.ok ? res.readings.map((r) => readingWords(r.label)).join(', ') : '';
        noteOutcome(agent, res.ok, res.ok ? 'reads it as ' + words : res.error);
        say(res.ok
          ? modelWords(agent) + ' reads it as ' + words
          : modelWords(agent) + ' could not read it — ' + res.error);
        render(session.getState());
        refreshPalette();
      });
    });
    return true;
  }

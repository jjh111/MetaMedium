// ===== models =====
// Provides: the model pane: probing local servers, joining by key, remembering the pick, offerModel;
//   the work-in-progress register (withWork); askModelsAbout/cancelReading — a model is asked only by a deliberate act.
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
    const probes = [
      { source: 'Ollama', preset: 'ollama', list: ['http://localhost:11434/api/tags'],
        pick: (d) => (d.models || []).map((m) => ({ name: m.name,
          chat: !(m.capabilities && m.capabilities.length && !m.capabilities.includes('completion')) && !/embed/i.test(m.name),
          vision: !!(m.capabilities && m.capabilities.includes('vision')) })) },
      { source: 'LM Studio', preset: 'lmStudio', list: ['http://localhost:1234/api/v0/models', 'http://localhost:1234/v1/models'],
        pick: (d) => (d.data || []).map((m) => ({ name: m.id, chat: !/embed/i.test(m.id) && m.type !== 'embeddings',
          vision: m.type === 'vlm' })) },
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
        skipped: all.filter((m) => !m.chat).map((m) => m.name),
      };
    }));
    localServers = settled.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    renderLocal();
    return localServers;
  }

  const isJoined = (baseUrl, model) => agents.some((a) => a.config.baseUrl === baseUrl && a.config.model === model);

  function renderLocal() {
    if (!localServers.length) {
      mpLocal.innerHTML = '<div class="note">nothing answered on :11434 or :1234</div>';
      return;
    }
    let html = '';
    for (const sv of localServers) {
      html += '<div class="server"><b>' + esc(sv.source) + '</b><span>' + esc(sv.host) + '</span></div>';
      for (const m of sv.models) {
        const on = isJoined(sv.baseUrl, m);
        html += '<button class="model' + (on ? ' on' : '') + '" data-base="' + esc(sv.baseUrl) + '" data-model="' + esc(m) + '">' +
          '<span>' + esc(m) + '</span><span class="why">' + (on ? 'joined' : 'local' + (sv.vision.includes(m) ? ' · sees' : '') + ' · tap to join') + '</span></button>';
      }
      if (!sv.models.length && sv.skipped.length) {
        html += '<div class="note">only embedding models here — they cannot chat</div>';
      } else if (sv.skipped.length) {
        html += '<div class="note">' + sv.skipped.length + ' embedding model' + (sv.skipped.length === 1 ? '' : 's') + ' hidden</div>';
      }
    }
    mpLocal.innerHTML = html;
    mpLocal.querySelectorAll('.model').forEach((btn) => {
      btn.onclick = () => {
        const sv = localServers.find((x) => x.baseUrl === btn.dataset.base);
        join(Object.assign({}, MM.PRESETS[sv.preset], { model: btn.dataset.model, vision: sv.vision.includes(btn.dataset.model) }), { provider: sv.preset });
      };
    });
  }

  // --- Joining, and remembering ---
  function join(config, pick) {
    if (isJoined(config.baseUrl, config.model)) {
      mpStatus.textContent = config.model + ' is already here.';
      return null;
    }
    // Several models may run at once — that is the point. Every model is
    // tier 2; local or hosted is a cost the router pays attention to.
    const agent = MM.createAgentParticipant(session, config, Date.now());
    agents.push(agent);
    if (pick) store.set(PICK_KEY, Object.assign({ baseUrl: config.baseUrl, model: config.model, kind: config.kind }, pick));
    mpStatus.textContent = agent.name + ' joined (' + MM.providerLocality(config) + (config.vision ? ', sees' : '') + ').';
    renderAgents();
    renderLocal();
    syncTiles();
    render(session.getState());
    // Nothing is read on join: a model is asked when you ask (§6.3). Auto-read is the one exception, and it is a tile.
    if (autoRead) readWriting(session.getState());
    return agent;
  }

  function leave(agent) {
    const i = agents.indexOf(agent);
    if (i >= 0) agents.splice(i, 1);
    // The session keeps the join in its history; it simply stops being asked.
    const pick = store.get(PICK_KEY);
    if (pick && pick.baseUrl === agent.config.baseUrl && pick.model === agent.config.model) { store.del(PICK_KEY); store.del(KEY_KEY); }
    mpStatus.textContent = agent.name + ' left.';
    renderAgents();
    renderLocal();
    syncTiles();
    render(session.getState());
  }

  function renderAgents() {
    mpList.innerHTML = agents.map((a, i) =>
      '<div class="mpItem"><span>' + esc(a.name) + '</span>' +
      '<span class="t">' + MM.providerLocality(a.config) + (a.config.vision ? ' · sees' : '') + '</span>' +
      '<button class="ghost" data-leave="' + i + '">leave</button></div>'
    ).join('');
    mpList.querySelectorAll('[data-leave]').forEach((b) => { b.onclick = () => leave(agents[Number(b.dataset.leave)]); });
  }

  document.getElementById('mpAdd').onclick = () => {
    const p = mpProvider.value;
    if (p === 'mcp') { addMcp(); return; }
    const model = (mpModel.value || DEFAULT_MODEL[p] || '').trim();
    const key = mpKey.value.trim();
    if (!model) { mpStatus.textContent = 'Which model? Type its id.'; return; }
    // Hosted servers do not say what a model can do; the id is the only clue.
    const vision = /claude|gpt-4o|gpt-5|gemini|qwen3\.5|qwen.*vl|vision|pixtral|llava/i.test(model);
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
    const agent = join(config, { provider: p, endpoint: p === 'custom' ? config.baseUrl : undefined });
    if (!agent) return;
    // The key is remembered only when asked, and only on this device.
    if (key && mpRememberKey.checked) store.set(KEY_KEY, key); else store.del(KEY_KEY);
    mpKey.value = '';
  };

  // --- Coming back: the remembered pick rejoins if it can ---
  async function rejoinRemembered() {
    const pick = store.get(PICK_KEY);
    if (!pick) return;
    if (MM.providerTier({ baseUrl: pick.baseUrl }) === 1) {
      const servers = await probeLocal();
      const sv = servers.find((x) => x.baseUrl === pick.baseUrl);
      if (sv && sv.models.includes(pick.model)) join(Object.assign({}, MM.PRESETS[sv.preset], { model: pick.model, vision: sv.vision.includes(pick.model) }), null);
      else mpStatus.textContent = 'Remembered ' + pick.model + ', but ' + pick.baseUrl + ' is not offering it right now.';
      return;
    }
    const key = store.get(KEY_KEY);
    const config = pick.provider === 'custom'
      ? { kind: 'openai-compatible', baseUrl: pick.baseUrl, model: pick.model }
      : Object.assign({}, MM.PRESETS[pick.provider] || { kind: pick.kind, baseUrl: pick.baseUrl }, { model: pick.model });
    if (key) { config.apiKey = key; join(config, null); return; }
    if (pick.provider !== 'custom') {
      mpProvider.value = pick.provider; syncProviderFields(); mpModel.value = pick.model;
      mpStatus.textContent = 'Remembered ' + pick.model + ' — enter its key to rejoin.';
    } else {
      mpProvider.value = 'custom'; syncProviderFields(); mpEndpoint.value = pick.baseUrl; mpModel.value = pick.model;
      join(config, null);
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
    if (agents.length === 0) { offerModel('Reading a group needs a model.'); return false; }
    cancelReading();
    readGroups.set(ids[0], ids.slice());
    const ctl = new AbortController();
    reading = ctl;
    let left = agents.length;
    agents.forEach((agent) => {
      withWork('read:' + agent.id + ':' + ids.join('+'), ids, agent.name + ' · reading the group', agent.interpret(ids, Date.now(), ctl.signal)).then((res) => {
        if (ctl.signal.aborted) return;
        if (--left === 0 && reading === ctl) reading = null;
        say(res.ok
          ? agent.name + ' reads it as ' + res.readings.map((r) => r.label).join(', ')
          : agent.name + ' unavailable (' + res.error + ')');
        render(session.getState());
        refreshPalette();
      });
    });
    return true;
  }

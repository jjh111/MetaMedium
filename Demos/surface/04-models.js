// ===== models =====
// Provides: the model pane: probing local servers, joining by key, remembering the pick, offerModel, askModels/cancelReading.
// Uses: core, teach (togglePanel), render, palette (refreshPalette).
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
    mpEndpoint.hidden = p !== 'custom';
    mpModel.placeholder = DEFAULT_MODEL[p] || 'model id';
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
      mpLocal.innerHTML = '<div class="note">No local server answered on :11434 or :1234. ' +
        'Start Ollama or LM Studio, then Detect.</div>';
      return;
    }
    let html = '';
    for (const sv of localServers) {
      html += '<div class="server"><b>' + esc(sv.source) + '</b><span>' + esc(sv.host) + '</span></div>';
      for (const m of sv.models) {
        const on = isJoined(sv.baseUrl, m);
        html += '<button class="model' + (on ? ' on' : '') + '" data-base="' + esc(sv.baseUrl) + '" data-model="' + esc(m) + '">' +
          '<span>' + esc(m) + '</span><span class="why">' + (on ? 'joined' : 'tier 1' + (sv.vision.includes(m) ? ' · sees' : '') + ' · tap to join') + '</span></button>';
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
    // Several models may run in the same tier — that is the point.
    const agent = MM.createAgentParticipant(session, config, Date.now());
    agents.push(agent);
    if (pick) store.set(PICK_KEY, Object.assign({ baseUrl: config.baseUrl, model: config.model, kind: config.kind }, pick));
    mpStatus.textContent = agent.name + ' joined (tier ' + MM.providerTier(config) + '). It reads what you summon' +
      (config.vision ? ', reads your writing,' : '') + ' and builds what you describe.';
    readWriting(session.getState());
    renderAgents();
    renderLocal();
    render(session.getState());
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
    render(session.getState());
  }

  function renderAgents() {
    mpList.innerHTML = agents.map((a, i) =>
      '<div class="mpItem"><span>' + esc(a.name) + '</span>' +
      '<span class="t">tier ' + MM.providerTier(a.config) + (a.config.vision ? ' · sees' : '') + '</span>' +
      '<button class="ghost" data-leave="' + i + '">leave</button></div>'
    ).join('');
    mpList.querySelectorAll('[data-leave]').forEach((b) => { b.onclick = () => leave(agents[Number(b.dataset.leave)]); });
  }

  document.getElementById('mpAdd').onclick = () => {
    const p = mpProvider.value;
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
  modelBtn.onclick = () => {
    togglePanel(panel, modelBtn);
    if (!panel.hasAttribute('hidden')) probeLocal();
  };
  document.getElementById('mpClose').onclick = () => closePanel(panel, modelBtn);

  /** Open the models pane because something needed one — says why. */
  function offerModel(why) {
    if (panel.hasAttribute('hidden')) togglePanel(panel, modelBtn);
    probeLocal();
    mpStatus.textContent = why || 'That needs a model. Tap one to join it.';
  }

  // When a group is summoned, ask EVERY model at once. They answer in parallel
  // and each proposal lands independently — no escalation, no waiting for a
  // cheaper tier to fail first.
  //
  // A reading is worth having, but it is NOT worth making the human wait for.
  // A local server answers one request at a time, so an unasked-for
  // interpretation sits in front of whatever they type next — 35 seconds of a
  // model describing a drawing they were about to replace. So it is cancellable,
  // and committing to a prompt cancels it.
  let lastAskedSummon = null;
  let reading = null; // AbortController for interpretations in flight

  function cancelReading(why) {
    if (!reading) return;
    reading.abort();
    reading = null;
    if (why) mpStatus.textContent = why;
  }

  function askModels(s) {
    if (!s.summon || agents.length === 0) return;
    if (s.summon.id === lastAskedSummon) return;
    lastAskedSummon = s.summon.id;
    if (s.summon.enclosedIds.length === 0) return; // nothing to read (ink on a page)

    cancelReading();
    const ctl = new AbortController();
    reading = ctl;
    const ids = s.summon.enclosedIds.slice();
    mpStatus.textContent = 'reading with ' + agents.length + ' model(s)…';
    let left = agents.length;
    agents.forEach((agent) => {
      agent.interpret(ids, Date.now(), ctl.signal).then((res) => {
        if (ctl.signal.aborted) return;
        if (--left === 0 && reading === ctl) reading = null;
        mpStatus.textContent = res.ok
          ? agent.name + ': ' + res.readings.map((r) => r.label).join(', ')
          : agent.name + ' unavailable (' + res.error + ') — tier 0 still holds.';
        render(session.getState());
        refreshPalette();
      });
    });
  }

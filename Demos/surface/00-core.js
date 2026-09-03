// ===== core =====
// Provides: the engine handle, URL params, the palette (instrument or paper), the session, DOM handles, the panel toggle, shared state (state, live, hoverId), esc().
// Uses: nothing — every other fragment reads from here.
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () Ellipsis)();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  const MM = window.MetaMediumCore;

  // The page decides the look: ?theme=paper puts ink on the whitepaper's
  // ground, ?embed hides what a figure does not need, ?replay=<url> steps a
  // recorded session. The default is the instrument, for working in.
  const params = new URLSearchParams(location.search);
  const THEME = params.get('theme') === 'paper' ? 'paper' : 'instrument';
  const EMBED = params.has('embed');
  if (THEME === 'paper') document.body.classList.add('paper');
  if (EMBED) document.body.classList.add('embed');
  const C = THEME === 'paper'
    ? { ink: '#1a1a2e', inkFaint: 'rgba(26,26,46,0.16)', halo: 'rgba(248,246,241,0.75)', haloText: 'rgba(248,246,241,0.9)',
        agent: '#2f6f8f', gold: '#8a6d1f', goldRGB: '138,109,31', labelRGB: '90,90,110' }
    : { ink: '#e8e4d9', inkFaint: 'rgba(232,228,217,0.14)', halo: 'rgba(10,10,15,0.55)', haloText: 'rgba(10,10,15,0.7)',
        agent: '#8ab4c8', gold: '#c9a84c', goldRGB: '201,168,76', labelRGB: '160,152,128' };
  const session = MM.createSession();

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const stage = document.getElementById('stage');
  const summonEl = document.getElementById('summon');
  const statusEl = document.getElementById('status');
  const inspectorEl = document.getElementById('inspector');
  const PANEL_KEY = 'mm-panel';
  const panelToggle = document.getElementById('panelToggle');
  let panelOpen = (() => { try { const v = localStorage.getItem(PANEL_KEY); return v === null ? innerWidth > 820 : v === 'open'; } catch (err) { return true; } })();
  function syncPanel() {
    document.body.classList.toggle('panelHidden', !panelOpen);
    panelToggle.textContent = panelOpen ? 'details ▾' : 'details ▸';
    panelToggle.setAttribute('aria-expanded', String(panelOpen));
  }
  panelToggle.onclick = () => { panelOpen = !panelOpen; try { localStorage.setItem(PANEL_KEY, panelOpen ? 'open' : 'closed'); } catch (err) { /* private mode */ } syncPanel(); };
  syncPanel();

  let state = session.getState();
  let live = null;      // stroke under the pointer, in WORLD coordinates
  let hoverId = null;   // inspected node (hover), else most recent

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

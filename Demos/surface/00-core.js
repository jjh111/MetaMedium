// ===== core =====
// Provides: the engine handle, URL params, the theme (light · dark · system) and the colours the canvas
//   draws with (read from the stylesheet, so ink and chrome agree), device preferences (prefs), the
//   session, DOM handles, the panel toggle, shared state (state, live, hoverId, lastPen), esc().
// Uses: nothing — every other fragment reads from here.
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () Ellipsis)();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  const MM = window.MetaMediumCore;

  // The page decides the look: ?theme=light|dark|paper pins a theme, ?embed
  // hides what a figure does not need, ?replay=<url> steps a recorded session.
  const params = new URLSearchParams(location.search);
  const EMBED = params.has('embed');
  if (EMBED) document.body.classList.add('embed');

  // ===== Device preferences: small, named, held on this device ==============
  const prefs = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem('mm-' + k) || 'null'); return v === null ? d : v; } catch (err) { return d; } },
    set(k, v) { try { localStorage.setItem('mm-' + k, JSON.stringify(v)); } catch (err) { /* private mode */ } },
    del(k) { try { localStorage.removeItem('mm-' + k); } catch (err) { /* nothing */ } },
  };

  // ===== Theme: light and dark are the same tokens inverted =================
  // The stylesheet defines the light set on :root and the dark set on
  // [data-theme="dark"]; the page always stamps one of the two, so no rule
  // below the token layer branches on theme. `system` follows the OS until a
  // tile says otherwise (brand/README.md, law 1).
  const THEME_MODES = ['system', 'light', 'dark'];
  const urlTheme = params.get('theme');
  let themeMode = urlTheme === 'paper' || urlTheme === 'light' ? 'light' : urlTheme === 'dark' ? 'dark' : prefs.get('theme', 'system');
  if (!THEME_MODES.includes(themeMode)) themeMode = 'system';
  const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function resolvedTheme() {
    if (themeMode !== 'system') return themeMode;
    return darkQuery && darkQuery.matches ? 'dark' : 'light';
  }
  /** Read the colours the canvas draws with from the stylesheet, once per theme. */
  function readColours() {
    const cs = getComputedStyle(document.documentElement);
    const v = (name) => cs.getPropertyValue(name).trim();
    // No stylesheet (a broken link, a build that inlined nothing): ink must
    // still be visible, so the instrument's own values stand in.
    if (!v('--ink')) {
      return { ink: '#e8e4d9', inkFaint: 'rgba(232,228,217,0.14)', halo: 'rgba(10,10,15,0.55)', haloText: 'rgba(10,10,15,0.7)',
        agent: '#8ab4c8', agentRGB: '138,180,200', gold: '#c9a84c', goldRGB: '201,168,76', labelRGB: '160,152,128', panelRGB: '18,18,26', dim: '#a09880' };
    }
    return {
      ink: v('--ink'), inkFaint: v('--ink-faint'), halo: v('--halo'), haloText: v('--halo-text'),
      agent: v('--agent'), agentRGB: v('--agent-rgb'), gold: v('--gold'), goldRGB: v('--gold-rgb'),
      labelRGB: v('--label-rgb'), panelRGB: v('--panel-rgb'), dim: v('--dim'),
    };
  }
  let C = null;
  function applyTheme() {
    const t = resolvedTheme();
    document.documentElement.setAttribute('data-theme', t);
    document.body.classList.toggle('paper', t === 'light');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = t === 'light' ? '#f8f6f1' : '#0a0a0f';
    C = readColours();
    redrawMarkChip();
    render(state);
    syncTiles();
  }
  function setThemeMode(mode) {
    themeMode = THEME_MODES.includes(mode) ? mode : 'system';
    prefs.set('theme', themeMode);
    applyTheme();
  }
  if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener('change', () => { if (themeMode === 'system') applyTheme(); });
  document.documentElement.setAttribute('data-theme', resolvedTheme());
  document.body.classList.toggle('paper', resolvedTheme() === 'light');
  C = readColours();
  const THEME = resolvedTheme() === 'light' ? 'paper' : 'instrument';

  // The hand: the field fans to the right of the pen tip, or to the left.
  let hand = prefs.get('hand', 'right') === 'left' ? 'left' : 'right';
  function setHand(h) { hand = h === 'left' ? 'left' : 'right'; prefs.set('hand', hand); if (typeof syncTiles === 'function') syncTiles(); }

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
  let lastPen = null;   // where the hand last let go, on screen — the field opens there

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

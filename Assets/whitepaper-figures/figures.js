/* Progressive enhancement for authored plates. No API, model, timer or canvas.
   Native click semantics give keyboard, pointer and touch the same action;
   unlike pointerdown/preventDefault, they do not steal a scrolling gesture.
   
   Desktop/tablet: all states visible, selection highlights without hiding.
   Phone: focus on one state; "Show all states" toggle reveals all. */
(() => {
  'use strict';
  function enhance(root = document) {
  const figures = root.matches?.('[data-plate]') ? [root] : [...root.querySelectorAll('[data-plate]')];
  for (const figure of figures) {
    if (figure.dataset.enhanced) continue;
    const isComparison = figure.classList.contains('fp-comparison');
    const isOverview = figure.classList.contains('fp-overview');
    const buttons = [...figure.querySelectorAll('button[data-select]')];
    const readings = [...figure.querySelectorAll('[data-reading]')];
    const scenes = [...figure.querySelectorAll('.fp-scene')];
    const layers = [...figure.querySelectorAll('[data-layer]')];
    const announcer = figure.querySelector('[data-announcement]');
    const overviewToggle = figure.querySelector('[data-overview]');

    function select(value, announce = true) {
      const selected = buttons.find(button => button.dataset.select === value);
      if (!selected) return;
      figure.dataset.active = value;
      figure.querySelector('[data-current-view]').textContent = selected.textContent.replace(/^\s*\d{2}\s*/, '').trim();
      const sharedField = figure.querySelector('.fp-share-link');
      if (sharedField) sharedField.hidden = true;
      buttons.forEach(button => button.setAttribute('aria-pressed', String(button === selected)));
      // Highlight instead of hide: toggle is-current class
      readings.forEach(panel => {
        const isCurrent = panel.dataset.reading === value;
        panel.classList.toggle('is-current', isCurrent);
        // Do NOT set panel.hidden — CSS handles phone focus mode
      });
      // Comparison: highlight scene articles
      if (isComparison) {
        scenes.forEach(scene => scene.classList.toggle('is-current', scene.dataset.scene === value));
      }
      // Shared-map layers
      layers.forEach(layer => layer.classList.toggle('is-selected', layer.dataset.layer === value));
      // Triad inspect buttons
      figure.querySelectorAll('[data-inspect]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.inspect === value)));
      if (announce) {
        const panel = readings.find(item => item.dataset.reading === value);
        const title = panel.querySelector('h4').textContent.replace(/^\d{2}\s*\/\s*/, '');
        announcer.textContent = `${title}. ${panel.querySelector('p').textContent}`;
      }
    }

    // Initialize all dependencies before exposing the controls.
    select(figure.dataset.active, false);
    buttons.forEach(button => button.addEventListener('click', () => select(button.dataset.select)));
    figure.querySelectorAll('[data-inspect]').forEach(button => button.addEventListener('click', () => select(button.dataset.inspect)));
    figure.querySelectorAll('.fp-controls,.fp-instruction,[data-inspect]').forEach(el => { el.hidden = false; });
    figure.dataset.enhanced = 'true';

    // Overview toggle: phone focus mode ↔ show all
    if (overviewToggle) {
      function updateOverviewToggle() {
        const isPhone = matchMedia('(max-width: 560px)').matches;
        overviewToggle.hidden = !isPhone;
        // When switching from phone to desktop, reset overview mode
        if (!isPhone) figure.dataset.overview = '';
      }
      const mql = matchMedia('(max-width: 560px)');
      mql.addEventListener('change', updateOverviewToggle);
      updateOverviewToggle();
      overviewToggle.addEventListener('click', () => {
        const isOn = figure.dataset.overview === 'true';
        figure.dataset.overview = String(!isOn);
        overviewToggle.setAttribute('aria-pressed', String(!isOn));
        overviewToggle.textContent = isOn ? 'Show all states' : 'Focus on one';
        announcer.textContent = isOn
          ? 'Showing the selected state.'
          : 'Showing all states. Select one to highlight it.';
      });
    }

    const loop = figure.querySelector('[data-loop]');
    if (loop) {
      loop.addEventListener('change', () => {
        figure.dataset.loopOpen = String(!loop.checked);
        announcer.textContent = loop.checked
          ? 'Shared meaning included. Interpretation and revision paths are visible.'
          : 'Command and output path only. Shared interpretation and revision paths are hidden.';
      });
    }

    const share = figure.querySelector('[data-share]');
    if (share) {
      const field = figure.querySelector('.fp-share-link');
      const initial = new URL(location.href).searchParams.get('lens');
      if (initial) select(initial, false);
      share.addEventListener('click', async () => {
        const url = new URL(location.href);
        url.search = '';
        url.searchParams.set('lens', figure.dataset.active);
        url.searchParams.set('theme', document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
        url.hash = figure.id;
        field.value = url.href;
        field.hidden = false;
        try {
          if (!navigator.clipboard || !window.isSecureContext) throw new Error('manual copy');
          await navigator.clipboard.writeText(url.href);
          announcer.textContent = 'Lens-view link copied.';
        } catch {
          field.focus();
          field.select();
          announcer.textContent = 'Link selected. Copy it to share this lens view.';
        }
      });
    }
  }
  }
  window.enhanceWhitepaperFigures = enhance;
  enhance();
})();

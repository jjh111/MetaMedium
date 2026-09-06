// ===== ui =====
// Provides: the components the chrome is built from — pill, chip, tile, row, pane — each a function
//   that returns an element (row returns markup, for the panel's innerHTML), and nothing else.
// Uses: core (esc).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Components, not markup (SURFACE-v9-PLAN D5) =========================
  // Six small things, one stylesheet section each. A surface is built from
  // these or it is not built; a panel that hand-writes its own markup is how
  // three palettes and nine status lines happened.
  const ui = {
    /** A verb or a reading: a label, its reason as the tooltip, a dot when it asks a model. */
    pill(label, o) {
      o = o || {};
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pill' + (o.cls ? ' ' + o.cls : '');
      b.innerHTML = '<span>' + esc(label) + '</span>' + (o.model ? '<i class="dot" title="asks a model"></i>' : '');
      if (o.why) b.title = o.why;
      if (o.disabled) b.disabled = true;
      if (o.onclick) b.onclick = o.onclick;
      return b;
    },
    /** A small standing label: the mark, the folder, a model, a match. */
    chip(text, o) {
      o = o || {};
      const s = document.createElement(o.onclick ? 'button' : 'span');
      if (o.onclick) { s.type = 'button'; s.onclick = o.onclick; }
      s.className = 'chip' + (o.cls ? ' ' + o.cls : '');
      s.textContent = text;
      if (o.why) s.title = o.why;
      return s;
    },
    /** A control-centre tile's face: what it is, and its state. */
    tile(el, label, value, o) {
      if (!el) return el;
      o = o || {};
      el.classList.add('tile');
      el.innerHTML = '<span class="k">' + esc(label) + '</span>' + (value !== undefined && value !== null && value !== '' ? '<span class="v">' + esc(value) + '</span>' : '');
      if (o.on !== undefined) el.classList.toggle('on', !!o.on);
      if (o.why) el.title = o.why;
      return el;
    },
    /** A label/value line in the panel, with an optional reason and an optional action. */
    row(k, v, why, action) {
      return '<div class="row"><span class="k">' + esc(k) + '</span><span class="v">' + esc(v) + '</span></div>' +
        (why ? '<div class="why">' + esc(why) + '</div>' : '') + (action || '');
    },
    /** A titled, closable box. Wraps an existing element once; the close button calls `onClose`. */
    pane(el, title, onClose) {
      if (!el || el.querySelector(':scope > .paneHead')) return el;
      el.classList.add('pane');
      const head = document.createElement('div');
      head.className = 'paneHead';
      head.innerHTML = '<span class="paneTitle">' + esc(title) + '</span>';
      const x = document.createElement('button');
      x.type = 'button'; x.className = 'paneClose'; x.setAttribute('aria-label', 'Close'); x.textContent = '×';
      x.onclick = () => { if (onClose) onClose(); else el.setAttribute('hidden', ''); };
      head.appendChild(x);
      el.insertBefore(head, el.firstChild);
      return el;
    },
  };

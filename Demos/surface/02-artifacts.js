// ===== artifacts =====
// Provides: the live plane: frames of iframes for artifacts with code, syncStage, regionsUnderInk.
// Uses: core, view.
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () Ellipsis)();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== The live plane: artifacts that render and run ====================
  // Generated code becomes real DOM in an iframe, positioned in world space
  // inside the shared transform. The ink canvas sits ON TOP of it, so the boxes
  // you drew stay visible as the outlines of what they produced (MVP.md §3.3).
  //
  // SANDBOX POSTURE, deliberate (MVP.md risk #5): `allow-same-origin` WITHOUT
  // `allow-scripts`. Same-origin is what lets ink hit-test into the artifact's
  // own DOM, which is the novel capability here. Granting both together is the
  // known sandbox escape, and running arbitrary generated JS is not needed to
  // prove the loop — so scripts stay off, and this is a choice to revisit
  // explicitly rather than a default that drifted.
  const frames = new Map(); // artifactId -> { wrap, iframe, codeAt }

  function codeRepOf(node) {
    for (let i = node.reps.length - 1; i >= 0; i--) {
      if (node.reps[i].modality === 'code') return node.reps[i];
    }
    return null;
  }

  function documentFor(code, w, h) {
    return '<!doctype html><html><head><meta charset="utf-8">' +
      '<style>' +
      'html,body{margin:0;padding:0;background:#fbfaf7;color:#14140f;' +
      "font-family:'Space Grotesk',system-ui,-apple-system,sans-serif;}" +
      '#mmroot{position:relative;width:' + Math.round(w) + 'px;height:' + Math.round(h) + 'px;overflow:hidden;}' +
      '*{box-sizing:border-box;}' +
      '</style></head><body><div id="mmroot">' + code + '</div></body></html>';
  }

  function syncStage(s) {
    // Drop frames for artifacts that are gone or erased.
    for (const [id, f] of frames) {
      if (!s.live.includes(id)) { f.wrap.remove(); frames.delete(id); }
    }
    for (const id of s.live) {
      const node = s.nodes.get(id);
      const rep = node && codeRepOf(node);
      const fr = node && MM.frameOf(node);
      if (!rep || !fr) continue;

      let f = frames.get(id);
      if (!f) {
        const wrap = document.createElement('div');
        wrap.className = 'artifactFrame';
        const iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', 'allow-same-origin');
        iframe.setAttribute('scrolling', 'no');
        iframe.title = MM.wordOf(node) || id;
        wrap.appendChild(iframe);
        stage.appendChild(wrap);
        f = { wrap: wrap, iframe: iframe, codeAt: null };
        frames.set(id, f);
      }
      f.wrap.style.left = fr.x + 'px';
      f.wrap.style.top = fr.y + 'px';
      f.wrap.style.width = fr.w + 'px';
      f.wrap.style.height = fr.h + 'px';

      const stamp = rep.data.at + ':' + Math.round(fr.w) + 'x' + Math.round(fr.h);
      if (f.codeAt !== stamp) {
        f.codeAt = stamp;
        f.iframe.srcdoc = documentFor(rep.data.code, fr.w, fr.h);
      }
    }
  }

  /**
   * Which regions the ink actually lands on, read from the artifact's own DOM.
   *
   * This is "formal coordinate intersections with code aspects": the mark's
   * world bounds become artifact-local pixels, `elementFromPoint` resolves them
   * to real elements, and each element carries the `data-region` the generator
   * was required to emit. The engine's geometric answer is the fallback, so
   * addressing still works if the document is unreadable for any reason.
   */
  function regionsUnderInk(artifactId, bounds) {
    const f = frames.get(artifactId);
    const node = state.nodes.get(artifactId);
    const fr = node && MM.frameOf(node);
    const found = new Set();
    if (!f || !fr) return [];
    let doc = null;
    try { doc = f.iframe.contentDocument; } catch (err) { doc = null; }
    if (!doc || !doc.elementFromPoint) return [];

    const N = 4;
    for (let i = 0; i <= N; i++) {
      for (let j = 0; j <= N; j++) {
        const x = bounds.minX + ((bounds.maxX - bounds.minX) * i) / N - fr.x;
        const y = bounds.minY + ((bounds.maxY - bounds.minY) * j) / N - fr.y;
        let el = null;
        try { el = doc.elementFromPoint(x, y); } catch (err) { el = null; }
        while (el && !(el.dataset && el.dataset.region)) el = el.parentElement;
        if (el && el.dataset.region) found.add(el.dataset.region);
      }
    }
    return [...found];
  }

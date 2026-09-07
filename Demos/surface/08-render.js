// ===== render =====
// Provides: queries over state, the rungs cache, render(), ink, the label under the inspected mark, match chips,
//   the working dot, explanations, the status line (one sentence).
// Uses: core, view, artifacts, snap, models, palette, inspector, teach (syncMarkChip), folder (folderStatus, liveSet).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () Ellipsis)();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Queries over engine state ========================================
  const authorOf = (node) => {
    const e = node.edges.find((x) => x.rel === 'made-by');
    return e ? e.to : MM.LOCAL_PARTICIPANT;
  };
  const isAgentNode = (node) => authorOf(node) !== MM.LOCAL_PARTICIPANT;
  /** The colour a mark is drawn in: yours, a model's, or another hand's — a hue from its name. */
  function colourOf(node) {
    const pid = authorOf(node);
    if (pid === MM.LOCAL_PARTICIPANT) return C.ink;
    const p = state.nodes.get(pid);
    const kind = p && (p.reps.find((r) => r.modality === 'participant') || {}).data;
    if (!p || !kind || kind.kind === 'agent' || kind.kind === 'engine') return C.agent;
    return handColour(handLabel(MM.wordOf(p) || pid));
  }
  const handHues = new Map();
  function handColour(name) {
    let h = handHues.get(name);
    if (h === undefined) { let x = 0; for (const c of name) x = (x * 31 + c.charCodeAt(0)) >>> 0; h = x % 360; handHues.set(name, h); }
    return 'hsl(' + h + ' 55% ' + (document.documentElement.getAttribute('data-theme') === 'dark' ? '68%' : '42%') + ')';
  }
  const nameOfParticipant = (pid) =>
    pid === MM.LOCAL_PARTICIPANT ? 'you' : handLabel(MM.wordOf(state.nodes.get(pid)) || pid);

  function nodeAt(x, y) {
    const slack = wpx(8);
    for (let i = state.contentIds.length - 1; i >= 0; i--) {
      const b = MM.boundsOf(state.nodes.get(state.contentIds[i]));
      if (b && x >= b.minX - slack && x <= b.maxX + slack &&
               y >= b.minY - slack && y <= b.maxY + slack) {
        return state.contentIds[i];
      }
    }
    return null;
  }

  const union = (list) => list.reduce((a, b) => ({
    minX: Math.min(a.minX, b.minX), maxX: Math.max(a.maxX, b.maxX),
    minY: Math.min(a.minY, b.minY), maxY: Math.max(a.maxY, b.maxY),
  }));

  function lastContentId(s) {
    return s.contentIds.length ? s.contentIds[s.contentIds.length - 1] : null;
  }

  // ===== The rungs, read once per frame ====================================
  // Shape → role → genre for everything on the board, from session.read().
  // Labels under marks, the inspector's ladder and the palette all read from
  // the same reading, so they cannot disagree with each other. Cached on the
  // set of ids, because hover re-renders and relate() is O(n²).
  let rungs = { key: null, roles: new Map(), genre: null, reading: null };
  function readRungs(s) {
    const ids = s.contentIds.filter((id) => !s.artifacts.includes(id));
    // Members of artifacts keep their roles — a box inside a live page is
    // still a node, and the ladder should say so.
    for (const aid of s.artifacts) {
      for (const e of s.nodes.get(aid).edges) if (e.rel === 'has-part') ids.push(e.to);
    }
    const key = ids.join('|');
    if (rungs.key === key) return rungs;
    const reading = ids.length
      ? session.read(ids)
      : { roles: [], genre: { genre: 'empty', reasoning: 'nothing drawn yet' }, concepts: [], relations: [] };
    rungs = { key, roles: new Map(reading.roles.map((r) => [r.id, r])), genre: reading.genre, reading };
    return rungs;
  }

  // ===== Rendering: ink is ground truth ===================================
  function path(points, closed) {
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    if (closed) ctx.closePath();
  }
  function inkStroke(points, closed, style) {
    path(points, closed);
    // A dark halo under every mark. On the ground it is invisible; over a
    // live artifact it is the difference between ink you can see and ink that
    // disappears into whatever colour the model happened to choose. One rule,
    // no special case for "is this stroke over a page".
    ctx.strokeStyle = C.halo;
    ctx.lineWidth = style.width + wpx(2.5);
    ctx.stroke();
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.width;
    ctx.stroke();
  }

  function inkOf(node, style) {
    const points = MM.strokePointsOf(node);
    if (points) {
      const clean = MM.cleanPointsOf(node);
      if (clean) {
        // Snapped: the clean form in front, the hand's ink faint beneath it.
        // What was drawn is still there — that is the whole promise.
        path(points, false);
        ctx.strokeStyle = C.inkFaint;
        ctx.lineWidth = Math.max(1, style.width * 0.7);
        ctx.stroke();
        inkStroke(clean, MM.cleanOf(node).closed, style);
        return;
      }
      inkStroke(points, false, style);
      // The offer: a ghost of what this mark would be, drawn clean. Dashed and
      // faint so it reads as a question, not a change already made.
      const offer = snapOffers.get(node.id);
      if (offer && !style.gesture) {
        const ideal = idealOf(node, offer.shape);
        if (ideal) {
          // The ghost follows the ink: same placement (transform, rotation).
          path(MM.placed(node, ideal.points), ideal.closed);
          ctx.setLineDash([wpx(3), wpx(4)]);
          ctx.strokeStyle = `rgba(${C.goldRGB},0.7)`;
          ctx.lineWidth = wpx(1.2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      return;
    }
    for (const e of node.edges) { // artifact: draw its members (transparent within)
      if (e.rel !== 'has-part') continue;
      const m = state.nodes.get(e.to);
      if (m && !m.reps.some((r) => r.modality === 'erased')) inkOf(m, style);
    }
  }

  let chipHits = []; // the match chips drawn this frame, in world coordinates: { ids, x, y, w, h }
  /** The match chip under a world point, if any. */
  function chipAt(w) {
    for (const c of chipHits) if (w.x >= c.x && w.x <= c.x + c.w && w.y >= c.y && w.y <= c.y + c.h) return c;
    return null;
  }

  function render(s) {
    state = s;
    chipHits = [];
    // No model is asked from here: a paint is not a request (§6.3).
    syncStage(s);
    refreshOffers();

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    // World space from here down. Ink scales with the drawing; chrome that must
    // stay legible uses wpx() to hold a constant size on screen.
    ctx.setTransform(dpr * view.zoom, 0, 0, dpr * view.zoom, dpr * view.panX, dpr * view.panY);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Ink thins as you zoom out; hold a visible floor so a wide board still reads.
    const inkW = Math.max(2, wpx(1.3));

    for (const c of s.clusterCandidates) {
      const b0 = union(c.nodeIds.map((id) => MM.boundsOf(s.nodes.get(id))));
      const cp = bodyPlacement(c.nodeIds[0]);
      const b = cp ? { minX: b0.minX + cp.dx, maxX: b0.maxX + cp.dx, minY: b0.minY + cp.dy, maxY: b0.maxY + cp.dy } : b0;
      const pad = wpx(14);
      ctx.setLineDash([wpx(4), wpx(6)]);
      ctx.strokeStyle = `rgba(${C.goldRGB},0.38)`;
      ctx.lineWidth = wpx(1);
      ctx.strokeRect(b.minX - pad, b.minY - pad, b.maxX - b.minX + pad * 2, b.maxY - b.minY + pad * 2);
      ctx.setLineDash([]);
      // A match is a chip beside the group, with its number (D8); a tap on it
      // opens the field with the match leading. Plural, like every reading:
      // two definitions with the same shapes are both named.
      const hit = chipText(c.matches.slice(0, 2).map((m) => m.name + ' ' + m.score.toFixed(2)).join('  ·  '), b.minX - pad, b.minY - pad - wpx(8));
      chipHits.push({ ids: c.nodeIds.slice(), x: hit.x, y: hit.y, w: hit.w, h: hit.h });
    }

    const inspectedId = hoverId || lastContentId(s);

    for (const id of s.contentIds) {
      const node = s.nodes.get(id);
      const isArtifact = s.artifacts.includes(id);
      const isLive = s.live.includes(id);
      const pending = s.pendingLassoId === id;
      // A closed stroke around marks is plain ink until the mark takes it: nothing
      // lights up on its own. The command mark is what makes it a selection.
      const color = colourOf(node);

      // A live artifact keeps its ink: the boxes you drew ARE the outlines of
      // what got built, and that promise is only kept by drawing them on top.
      // While a hand holds the selection, the held marks follow it before the
      // log has the move — one event lands when the hand lets go.
      const pv = dragPreview();
      const held = pv && pv.ids.includes(id);
      if (held) { ctx.save(); applyPreview(pv); }
      // A body in a running tank is drawn where its behaviour has taken it:
      // the DRAWING moves, translated and turned, never a sprite in its place.
      const pl = bodyPlacement(id);
      if (pl) { ctx.save(); ctx.translate(pl.cx + pl.dx, pl.cy + pl.dy); ctx.rotate(pl.angle); ctx.translate(-pl.cx, -pl.cy); }
      inkOf(node, {
        color: isLive ? `rgba(${C.goldRGB},0.85)` : color,
        width: id === inspectedId ? inkW * 1.3 : inkW,
      });
      if (pl) ctx.restore();
      if (held) ctx.restore();

      const b0 = MM.boundsOf(node);
      const b = b0 && pl ? { minX: b0.minX + pl.dx, maxX: b0.maxX + pl.dx, minY: b0.minY + pl.dy, maxY: b0.maxY + pl.dy } : b0;
      if (isArtifact && b) {
        brackets(b, isLive ? C.gold : `rgba(${C.goldRGB},0.7)`);
        text((MM.wordOf(node) || '') + (isLive ? '  ·  live' : ''), b.minX, b.minY - wpx(10), C.gold);
      } else if (b && !pending && id === inspectedId && !s.selection.length) {
        // The reading of the mark the hand just made (or is over), and only
        // that one: what it is, and what it plays. Under every mark it was a
        // board of fragments; the panel has the rest.
        const said = MM.transcriptOf(node);
        const shape = MM.interpretationsOf(node, s.nodes).filter((r) => r.tier === 0)[0];
        const top = MM.wordOf(node) || (said ? '“' + said + '”' : shape ? shape.label : MM.topInterpretation(node));
        const role = readRungs(s).roles.get(id);
        const played = role && role.role !== 'unclassified' && role.role !== top ? ' · ' + role.role : '';
        if (top) text(top + played, b.minX, b.maxY + wpx(15), `rgba(${C.labelRGB},0.85)`);
      }
    }

    if (s.summon) {
      for (const gid of s.summon.gestureIds) {
        const g = s.nodes.get(gid);
        const role = (MM.getRep(g, 'gesture') || {}).data;
        // The loop and the mark that took it dissolved into the selection: the
        // command has become the outline and its handles, and showing the
        // stroke that was the command on top of them says two things at once.
        if (s.selection.length && role && (role.role === 'lasso' || role.role === 'command' || role.role === 'check')) continue;
        inkOf(g, { color: `rgba(${C.goldRGB},0.55)`, width: inkW * 1.5, gesture: true });
      }
    }

    if (live) {
      ctx.beginPath();
      live.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = inkW;
      ctx.stroke();
    }

    renderFrames(s);
    renderWorking(s);
    if (editing) placeEditor(editing.bounds);
    renderExplanations(s);
    renderSelection(s);
    syncTank(s);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // back to screen space for the chrome
    syncMarkChip(s);
    renderSummon(s);
    renderInspector(s, inspectedId);

    // The status line: what just happened, else the standing state, in a few
    // words — and a model at work is always in it, whichever it shows.
    const fresh = flashText && Date.now() - flashAt < flashFor;
    const ws = workingSummary();
    const hint = s.pendingLassoId ? 'cross the loop with ' + (s.commandMark ? 'your mark' : '✓') + ' to select what it holds' : '';
    const strokes = s.contentIds.length - s.artifacts.length;
    const parts = [strokes + ' loose'];
    if (s.artifacts.length) {
      const running = liveSet(s).size;
      parts.push(s.artifacts.length + ' artifact' + (s.artifacts.length === 1 ? '' : 's') + (s.live.length ? ' (' + (running < s.live.length ? running + ' of ' + s.live.length + ' live, the rest parked' : s.live.length + ' live') + ')' : ''));
    }
    const fs = folderStatus();
    if (fs) parts.push(fs);
    if (agents.length) parts.push(agents.map((a) => a.config.model).join(', '));
    if (ws) parts.push('⋯ ' + ws);
    if (hint) parts.push(hint);
    const standing = parts.join('  ·  ');
    // A fresh message takes the line; the one hint a waiting loop needs, and
    // a model at work, stay beside it. The standing state is kept on the
    // element for anything that needs to read it while a message shows.
    statusEl.textContent = fresh ? flashText + (ws ? '  ·  ⋯ ' + ws : '') + (hint ? '  ·  ' + hint : '') : standing;
    statusEl.dataset.standing = standing;
    statusEl.classList.toggle('said', !!fresh);
  }

  /** A model at work: a breathing dot and its words, above the marks it is working on. */
  function renderWorking(s) {
    if (!working.size) return;
    const t = performance.now() / 1000;
    for (const w of working.values()) {
      // The marks may have been undone while the model was still thinking.
      const boxes = w.ids.map((id) => s.nodes.get(id)).filter(Boolean).map((n) => MM.boundsOf(n)).filter(Boolean);
      let x, y;
      if (boxes.length) { const b = union(boxes); x = b.minX; y = b.minY - wpx(28); }
      else { const c = screenToWorld(innerWidth / 2, 70); x = c.x; y = c.y; }
      const r = wpx(4 + 2 * Math.sin(t * 4));
      ctx.beginPath(); ctx.arc(x + wpx(5), y - wpx(4), r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${C.goldRGB},0.85)`; ctx.fill();
      text(w.label, x + wpx(16), y, C.gold);
    }
  }

  function text(str, x, y, color) {
    ctx.font = wpx(11).toFixed(2) + "px 'Space Grotesk', system-ui, sans-serif";
    ctx.lineWidth = wpx(3);
    ctx.strokeStyle = C.haloText;
    ctx.strokeText(str, x, y);
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  /** A chip in the canvas: a small pill with a reading and its number, in the chrome's own size. */
  function chipText(str, x, y) {
    ctx.font = wpx(10.5).toFixed(2) + 'px ui-monospace, SFMono-Regular, Menlo, monospace';
    const w = ctx.measureText(str).width + wpx(14), h = wpx(17);
    roundRect(x, y - h, w, h, h / 2);
    ctx.fillStyle = `rgba(${C.panelRGB},0.92)`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${C.goldRGB},0.45)`;
    ctx.lineWidth = wpx(1);
    ctx.stroke();
    ctx.fillStyle = C.gold;
    ctx.fillText(str, x + wpx(7), y - wpx(5));
    return { x: x, y: y - h, w: w, h: h };
  }

  function brackets(b, color) {
    const L = wpx(12), p = wpx(9);
    ctx.strokeStyle = color;
    ctx.lineWidth = wpx(1.5);
    const corners = [
      [b.minX - p, b.minY - p, L, 0, 0, L], [b.maxX + p, b.minY - p, -L, 0, 0, L],
      [b.minX - p, b.maxY + p, L, 0, 0, -L], [b.maxX + p, b.maxY + p, -L, 0, 0, -L],
    ];
    for (const [x, y, dx1, dy1, dx2, dy2] of corners) {
      ctx.beginPath();
      ctx.moveTo(x + dx1, y + dy1); ctx.lineTo(x, y); ctx.lineTo(x + dx2, y + dy2);
      ctx.stroke();
    }
  }

  // ===== Explanations: answers live IN the canvas ==========================
  /**
   * The world rectangle a canvas object can occupy and still be READ — the
   * viewport minus the chrome that floats over it. Fitting to the raw viewport
   * is not enough: an answer card placed at the right edge lands underneath the
   * inspector, which is the one place it is guaranteed to be unreadable.
   */
  function viewportWorld() {
    const rail = document.querySelector('.bar');
    const insp = document.getElementById('inspector');
    const railH = rail ? rail.getBoundingClientRect().height : 0;
    const inspRect = insp && insp.offsetParent !== null ? insp.getBoundingClientRect() : null;
    const right = inspRect ? Math.min(innerWidth, inspRect.left) - 16 : innerWidth - 8;
    const a = screenToWorld(8, railH + 8);
    const b = screenToWorld(Math.max(120, right), innerHeight - 46);
    return { minX: a.x, minY: a.y, maxX: b.x, maxY: b.y };
  }

  function renderExplanations(s) {
    if (!s.explanations.length) return;
    const vw = viewportWorld();
    const stacked = new Map(); // subject key -> how many answers already drawn

    for (const id of s.explanations) {
      const node = s.nodes.get(id);
      if (!node || MM.getRep(node, 'erased')) continue;
      const data = MM.explanationOf(node);
      const b = MM.boundsOf(node);
      if (!data || !b) continue;

      const about = MM.aboutIdsOf(node);
      const key = about.join(',');
      const slot = stacked.get(key) || 0;

      const pad = 9, w = b.maxX - b.minX;
      ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      const lines = wrapText(data.text, w - pad * 2);
      const madeBy = node.edges.find((e) => e.rel === 'made-by');
      const who = (madeBy && MM.wordOf(s.nodes.get(madeBy.to))) || 'agent';
      const headH = 15, lineH = 15;
      const h = pad * 2 + headH + lines.length * lineH;

      // Core anchors the answer beside its subject; only the surface knows the
      // viewport, so fitting it on screen is the surface's job. Stack later
      // answers below earlier ones rather than overlapping them.
      let x = b.minX, y = b.minY + slot * (h + 10);
      const subjectBounds = about
        .map((a) => (s.nodes.get(a) ? MM.boundsOf(s.nodes.get(a)) : null))
        .filter(Boolean);
      const subject = subjectBounds.length ? union(subjectBounds) : null;
      // No room to the right of the subject — tuck the card under it instead.
      if (x + w > vw.maxX && subject) {
        x = Math.min(subject.minX, vw.maxX - w);
        y = subject.maxY + wpx(16) + slot * (h + 10);
      }
      x = Math.max(vw.minX, Math.min(x, vw.maxX - w));
      y = Math.max(vw.minY, Math.min(y, vw.maxY - h));
      stacked.set(key, slot + 1);

      if (subject) {
        ctx.beginPath();
        ctx.moveTo(subject.maxX, (subject.minY + subject.maxY) / 2);
        ctx.lineTo(x, y + h / 2);
        ctx.strokeStyle = `rgba(${C.agentRGB},0.32)`;
        ctx.lineWidth = wpx(1);
        ctx.setLineDash([wpx(3), wpx(4)]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = `rgba(${C.panelRGB},0.92)`;
      ctx.strokeStyle = `rgba(${C.agentRGB},0.38)`;
      ctx.lineWidth = wpx(1);
      roundRect(x, y, w, h, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = C.agent;
      ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(who, x + pad, y + pad + 8);

      ctx.fillStyle = C.ink;
      ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      lines.forEach((ln, i) => ctx.fillText(ln, x + pad, y + pad + headH + 8 + i * lineH));
    }
  }

  function wrapText(text, maxWidth) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let line = '';
    for (const word of words) {
      const next = line ? line + ' ' + word : word;
      if (ctx.measureText(next).width > maxWidth && line) { lines.push(line); line = word; }
      else line = next;
    }
    if (line) lines.push(line);
    return lines.slice(0, 6);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

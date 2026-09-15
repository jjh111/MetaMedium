// ===== render =====
// Provides: queries over state, the rungs cache, render(), ink, the label under the inspected mark, match chips,
//   the working dot, the explanation plane and its layout, the status line (one sentence).
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

  /** The next move, for the standing line: one rung of the ladder, by what stands. */
  function nextMove(s, strokes) {
    if (s.summon) return 'type in the field, or tap a pill · a tap on the ground lets go';
    if (s.selection.length) return 'drag inside to move, a corner to scale, the knob to turn · Esc lets go';
    if (s.pendingLassoId) return 'or double-tap inside the loop';
    if (!strokes && !s.artifacts.length) return 'draw anything · double-click empty ground to type';
    return 'press and hold a mark to hold it · or circle marks and double-tap inside';
  }

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
      // faint so it reads as a question, not a change already made — and for
      // a moment, not forever (v10 F4): the mark just drawn, what is hovered,
      // what is held. The offer itself stands; the dashes do not.
      const offer = snapOffers.get(node.id);
      if (offer && !style.gesture && ghostShown(state, node.id)) {
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
    // Text made from writing stands in place of the ink: the writing shows only when flipped over (v10 F8).
    if (isWritingArtifact(node) && !flipped.has(node.id)) return;
    for (const e of node.edges) { // artifact: draw its members (transparent within)
      if (e.rel !== 'has-part') continue;
      const m = state.nodes.get(e.to);
      if (m && !m.reps.some((r) => r.modality === 'erased')) inkOf(m, style);
    }
  }

  // The clean-form ghost is an offer for a moment, not a fixture.
  const GHOST_MS = 6000;
  let lastDrawAt = 0, ghostTimer = null;
  function ghostShown(s, id) {
    if (hoverId === id || s.selection.includes(id)) return true;
    if (s.summon && s.summon.enclosedIds.includes(id)) return true;
    if (heldCandidates.includes(id)) return true;
    return id === lastContentId(s) && Date.now() - lastDrawAt < GHOST_MS;
  }

  let chipHits = []; // the match chips drawn this frame, in world coordinates: { ids, x, y, w, h }
  /** The match chip under a world point, if any. */
  function chipAt(w) {
    for (const c of chipHits) if (w.x >= c.x && w.x <= c.x + c.w && w.y >= c.y && w.y <= c.y + c.h) return c;
    return null;
  }

  /**
   * Runtime memory keyed by node id — what is flipped, which marks a reading
   * was asked about, what was read with what, what was already handed to a
   * reader — forgets a node the log no longer holds. Ids are a counter
   * derived on replay, so a fresh board reuses them: a text flipped before
   * a `load([])` kept the next text with the same id flipped, and a scratch
   * over it struck nothing (found by e2e 35).
   */
  function pruneRuntime(s) {
    for (const id of [...flipped]) if (!s.live.includes(id)) flipped.delete(id);
    for (const id of [...readGroups.keys()]) if (!s.contentIds.includes(id)) readGroups.delete(id);
    for (const id of [...readWith.keys()]) if (!s.nodes.has(id)) readWith.delete(id);
    for (const key of [...askedToRead]) { const first = String(key).replace(/^line:/, '').split(',')[0]; if (!s.nodes.has(first)) askedToRead.delete(key); }
  }

  function render(s) {
    state = s;
    chipHits = [];
    pruneRuntime(s);
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
    // What a model read a group as stays beside it (v10 F6): a chip with the
    // number and the reader, whether or not the field is still open, and a
    // tap on it opens the field on those marks again. A reading held on a
    // group's first member speaks for the group it was asked about.
    for (const id of s.contentIds) {
      const n = s.nodes.get(id);
      if (!n || n.reps.some((r) => r.modality === 'erased')) continue;
      const reads = MM.interpretationsOf(n, s.nodes).filter((r) => r.tier === 2 && !r.blessed).sort((a, b) => b.weight - a.weight);
      if (!reads.length) continue;
      const group = (readGroups.get(id) || [id]).filter((g) => s.contentIds.includes(g));
      const boxes = (group.length ? group : [id]).map((g) => MM.boundsOf(s.nodes.get(g))).filter(Boolean);
      if (!boxes.length) continue;
      const b = union(boxes);
      const pad = wpx(14);
      const text = reads.slice(0, 2).map((r) => r.label + ' ' + r.weight.toFixed(2)).join('  ·  ') + '  ·  ' + reads[0].sourceName;
      const hit = chipText(text, b.minX - pad, b.maxY + pad + wpx(17));
      chipHits.push({ ids: group.length ? group : [id], x: hit.x, y: hit.y, w: hit.w, h: hit.h });
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
    renderMinimap(s);

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
    // The standing line is a ladder (SURFACE-v10-PLAN D5): the next move, in a
    // few words, keyed to what the board holds — so what the board can do is
    // said before anything is asked, and never as a sentence of philosophy.
    const next = nextMove(s, strokes);
    if (next) parts.push(next);
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
   * is not enough: an answer card placed under the panel lands in the one place
   * it is guaranteed to be unreadable. The panel tucks under the bar on ONE
   * side, so the free ground is whichever side it leaves — reading its left
   * edge as the right margin (it stands on the left) left a 120px sliver of
   * world, and every answer was clamped into it, on top of the last.
   */
  function viewportWorld() {
    const rail = document.querySelector('.bar');
    const insp = document.getElementById('inspector');
    const railH = rail ? rail.getBoundingClientRect().height : 0;
    const r = insp && insp.offsetParent !== null ? insp.getBoundingClientRect() : null;
    let left = 8, right = innerWidth - 8;
    if (r && r.width > 0) {
      if (r.left + r.width / 2 < innerWidth / 2) left = Math.max(left, r.right + 16);
      else right = Math.min(right, r.left - 16);
    }
    // A window narrower than the panel leaves no free side; the whole of it is
    // better than a sliver nothing fits in.
    if (right - left < 120) { left = 8; right = Math.max(128, innerWidth - 8); }
    const a = screenToWorld(left, railH + 8);
    const b = screenToWorld(right, innerHeight - 46);
    return { minX: a.x, minY: a.y, maxX: b.x, maxY: b.y };
  }

  // The explanation plane has a LAYOUT of its own — runtime, never in the log.
  // Core anchors every answer beside the marks it is about, which is right;
  // but six marks stacked in a column each given a sentence — what the MCP
  // hand does with canvas_say — anchor six cards to the same edge, and they
  // land on each other and on the ink they are about. Ink is never covered,
  // and an answer nobody can read is not an answer. So the placing is the
  // surface's: each card keeps its anchor (a short dashed leader to the marks
  // it speaks for), and cards are pushed off each other and off the marks by a
  // greedy search — right of the anchor, then left, then below, then above,
  // shifting along the free side until it is clear. A card's place is a
  // consequence of the view, so it is found again on every zoom and pan:
  // positions in canvas units, every size in screen ones.
  const CARD_W = 260, CARD_PAD = 9, CARD_HEAD = 15, CARD_LINE = 15, CARD_GAP = 14;
  const CARD_STEPS = 8;        // half-card shifts either way along the free side
  const MAX_OBSTACLES = 200;   // the ink the search reads: bounded, so a busy board still paints
  const CARD_FONT = 'px ui-monospace, SFMono-Regular, Menlo, monospace';
  /** Where the last paint put each answer card, in world units. For tests. */
  let cardRects = [];

  const rectOf = (b) => ({ x: b.minX, y: b.minY, w: b.maxX - b.minX, h: b.maxY - b.minY });
  function overlapArea(a, b) {
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return ox > 0 && oy > 0 ? ox * oy : 0;
  }
  const meets = (a, b) =>
    a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;
  /** The point of `box` nearest the given one — on its border when that one is outside. */
  const edgePoint = (box, toward) => ({
    x: Math.max(box.x, Math.min(toward.x, box.x + box.w)),
    y: Math.max(box.y, Math.min(toward.y, box.y + box.h)),
  });

  /** Measure one card: its lines at the chrome's own size, and the box they need. */
  function measureCard(s, id) {
    const node = s.nodes.get(id);
    if (!node || MM.getRep(node, 'erased')) return null;
    const data = MM.explanationOf(node);
    const anchor = MM.boundsOf(node);
    if (!data || !anchor) return null;
    const about = MM.aboutIdsOf(node);
    const boxes = about.map((a) => (s.nodes.get(a) ? MM.boundsOf(s.nodes.get(a)) : null)).filter(Boolean);
    const w = wpx(CARD_W), pad = wpx(CARD_PAD);
    ctx.font = wpx(11).toFixed(2) + CARD_FONT;
    const lines = wrapText(data.text, w - pad * 2);
    const madeBy = node.edges.find((e) => e.rel === 'made-by');
    return {
      id: id, lines: lines, about: about,
      who: (madeBy && MM.wordOf(s.nodes.get(madeBy.to))) || 'agent',
      subject: boxes.length ? union(boxes) : anchor,
      own: new Set(about),
      w: w, h: pad * 2 + wpx(CARD_HEAD) + lines.length * wpx(CARD_LINE),
    };
  }

  /**
   * The ink a card must stay off: what the content plane holds near the
   * viewport, bounded. A mark with no thickness — a level line, a dot — is
   * given the hand's own, or an overlap with it measures zero and a card sits
   * straight on top of it.
   */
  function inkObstacles(s, vw) {
    const m = wpx(600), thin = wpx(3);
    const win = { x: vw.minX - m, y: vw.minY - m, w: (vw.maxX - vw.minX) + m * 2, h: (vw.maxY - vw.minY) + m * 2 };
    const out = [];
    for (const id of s.contentIds) {
      const b = MM.boundsOf(s.nodes.get(id));
      if (!b) continue;
      const r = rectOf(b);
      if (r.w < thin) { r.x -= (thin - r.w) / 2; r.w = thin; }
      if (r.h < thin) { r.y -= (thin - r.h) / 2; r.h = thin; }
      if (!meets(r, win)) continue;
      out.push({ id: id, rect: r });
      if (out.length >= MAX_OBSTACLES) break;
    }
    return out;
  }

  /**
   * The free place for one card: right, left, below, above the anchor, each
   * shifted along its own free side. The first candidate that hits nothing
   * wins; when the board is too full for any of them the least-bad one does.
   *
   * The weights are an order of what may be given up. A card UNDER another
   * card is lost — nobody can read either — so that is the last thing sacrificed
   * and it outweighs every other cost put together; next comes covering the very
   * marks the card speaks for; then standing off screen, which costs the reader
   * only a pan; and cheapest, lying over other ink. Found on a board of two
   * dozen answers: with card-on-card merely dear, a small overlap kept beating
   * a whole card's worth of off-screen, and three pairs stacked.
   */
  function placeCard(card, placed, obstacles, vw, gap) {
    const s = card.subject, w = card.w, h = card.h;
    const vstep = (h + gap) / 2, hstep = (w + gap) / 2;
    const sides = [
      { x: s.maxX + gap, y: s.minY, dx: 0, dy: vstep },
      { x: s.minX - gap - w, y: s.minY, dx: 0, dy: vstep },
      { x: s.minX, y: s.maxY + gap, dx: hstep, dy: 0 },
      { x: s.minX, y: s.minY - gap - h, dx: hstep, dy: 0 },
    ];
    // Only the ink the search could reach, so a busy board costs no more.
    const reachW = w + hstep * CARD_STEPS + gap, reachH = h + vstep * CARD_STEPS + gap;
    const reach = { x: s.minX - reachW, y: s.minY - reachH,
                    w: (s.maxX - s.minX) + reachW * 2, h: (s.maxY - s.minY) + reachH * 2 };
    const near = obstacles.filter((o) => meets(o.rect, reach));
    // Staying on screen is a preference among places beside the anchor, never a
    // reason to leave it: when the marks themselves are off screen the card
    // belongs with them. Without this a card anchored a screenful away walked
    // its shifts back toward the viewport and crowded the cards that live there.
    const onScreen = meets(rectOf(s), rectOf(vw));
    const area = w * h;
    let best = null;
    for (const side of sides) {
      for (let k = 0; k <= CARD_STEPS; k++) {
        for (const sign of k === 0 ? [1] : [1, -1]) {
          const r = { x: side.x + side.dx * k * sign, y: side.y + side.dy * k * sign, w: w, h: h };
          let score = 0;
          for (const p of placed) score += overlapArea(r, p) * 24;
          for (const o of near) score += overlapArea(r, o.rect) * (card.own.has(o.id) ? 4 : 1);
          if (onScreen) {
            const iw = Math.max(0, Math.min(r.x + w, vw.maxX) - Math.max(r.x, vw.minX));
            const ih = Math.max(0, Math.min(r.y + h, vw.maxY) - Math.max(r.y, vw.minY));
            score += (area - iw * ih) * 2; // off screen: a pan away, so cheaper than a card lost under one
          }
          if (score <= 0) return r;
          // Among places that all cost something, the nearest the anchor wins:
          // the leader is short and the card is plainly that mark's.
          if (!best || score + k * area * 0.05 < best.score) best = { x: r.x, y: r.y, w: w, h: h, score: score + k * area * 0.05 };
        }
      }
    }
    return { x: best.x, y: best.y, w: w, h: h };
  }

  function renderExplanations(s) {
    cardRects = [];
    if (!s.explanations.length) return;
    const vw = viewportWorld();
    const gap = wpx(CARD_GAP), pad = wpx(CARD_PAD);

    const cards = s.explanations.map((id) => measureCard(s, id)).filter(Boolean);
    if (!cards.length) return;
    // A stable order — top-left first — so a card keeps its place when another
    // answer lands below it, and the plane does not reshuffle as it is read.
    cards.sort((a, b) => a.subject.minY - b.subject.minY || a.subject.minX - b.subject.minX || (a.id < b.id ? -1 : 1));
    const obstacles = inkObstacles(s, vw);
    const placed = [];
    for (const card of cards) {
      card.rect = placeCard(card, placed, obstacles, vw, gap);
      placed.push(card.rect);
      cardRects.push({ id: card.id, about: card.about.slice(), x: card.rect.x, y: card.rect.y, w: card.rect.w, h: card.rect.h });
    }

    for (const card of cards) {
      const r = card.rect, sub = rectOf(card.subject);
      // The leader keeps the anchor the placing moved: marks to card, by the
      // nearest edges, so a card always says which ink it speaks for.
      const from = edgePoint(sub, { x: r.x + r.w / 2, y: r.y + r.h / 2 });
      const to = edgePoint(r, { x: sub.x + sub.w / 2, y: sub.y + sub.h / 2 });
      if (Math.hypot(to.x - from.x, to.y - from.y) > wpx(2)) {
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = `rgba(${C.agentRGB},0.32)`;
        ctx.lineWidth = wpx(1);
        ctx.setLineDash([wpx(3), wpx(4)]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = `rgba(${C.panelRGB},0.92)`;
      ctx.strokeStyle = `rgba(${C.agentRGB},0.38)`;
      ctx.lineWidth = wpx(1);
      roundRect(r.x, r.y, r.w, r.h, wpx(6));
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = C.agent;
      ctx.font = wpx(10).toFixed(2) + CARD_FONT;
      ctx.fillText(card.who, r.x + pad, r.y + pad + wpx(8));

      ctx.fillStyle = C.ink;
      ctx.font = wpx(11).toFixed(2) + CARD_FONT;
      card.lines.forEach((ln, i) =>
        ctx.fillText(ln, r.x + pad, r.y + pad + wpx(CARD_HEAD) + wpx(8) + i * wpx(CARD_LINE)));
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

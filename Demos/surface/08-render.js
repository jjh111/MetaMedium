// ===== render =====
// Provides: queries over state, the rungs cache, render(), ink, the reading under the inspected mark,
//   a hand's label on its own mark (labelsDrawn), match chips,
//   the working dot, the explanation plane and its layout, the status line (one sentence).
// Uses: core, view, artifacts, snap, models, palette, inspector, teach (syncMarkChip), folder (folderStatus, liveSet),
//   input (live, magnetHold, penHover — the pen's layer draws the stroke in progress and a hovering pencil's magnet).
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

  /** The last mark on the board whose box, with a little slack, holds the point — found among the few the paint's index says could. */
  function nodeAt(x, y) {
    const slack = wpx(8);
    const ix = boardIndex();
    let best = null, bestAt = -1;
    const consider = (id) => {
      const at = ix.contentAt.get(id);
      if (at === undefined || at <= bestAt) return;
      const b = MM.boundsOf(state.nodes.get(id));
      if (b && x >= b.minX - slack && x <= b.maxX + slack && y >= b.minY - slack && y <= b.maxY + slack) { best = id; bestAt = at; }
    };
    for (const id of ix.paint.query({ minX: x - slack, minY: y - slack, maxX: x + slack, maxY: y + slack })) consider(id);
    for (const id of ix.unboxed) consider(id);
    return best;
  }

  /** An artifact that renders as a figure on the board rather than on a page. */
  function isFigureArtifact(node) {
    for (let i = node.reps.length - 1; i >= 0; i--) {
      if (node.reps[i].modality === 'code') return FIGURE_KINDS.has(node.reps[i].data.kind || 'html');
    }
    return false;
  }

  const union = (list) => list.reduce((a, b) => ({
    minX: Math.min(a.minX, b.minX), maxX: Math.max(a.maxX, b.maxX),
    minY: Math.min(a.minY, b.minY), maxY: Math.max(a.maxY, b.maxY),
  }));

  function lastContentId(s) {
    return s.contentIds.length ? s.contentIds[s.contentIds.length - 1] : null;
  }

  // ===== What a paint drew and said, for the equivalence check (R4c) ========
  // Off unless a test asks. `paintCheck` paints the board twice — once as the
  // surface paints it, once as the whole-board read would — records what each
  // drew (every mark's ink, a ghost, a chip, the reading under a mark, an
  // artifact's name, a label, a card, the minimap) and what each said (the
  // status line, the panel), and compares: what a hand's paint drew must be
  // what the whole-board read draws, and everything the whole-board read
  // draws on screen must be drawn. Nothing here runs in a hand's paint.
  let paintOps = null;        // while recording: what this paint drew, one op a thing
  let paintReference = false; // while painting as the whole-board read would
  let paintMoved = false;     // the ink being drawn is where a drag or a tank has taken it
  let paintNow = 0;           // a clock held still for the two paints a check compares
  const nowMs = () => paintNow || Date.now();
  /** The reading under the inspected mark, as the last paint drew it: { id, text }, or null. */
  let readingDrawn = null;
  const round2 = (v) => Math.round(v * 100) / 100;
  function boxOfPoints(points) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    }
    return { minX: round2(minX), minY: round2(minY), maxX: round2(maxX), maxY: round2(maxY) };
  }
  const boxOfRect = (x, y, w, h) => ({ minX: round2(x), minY: round2(y), maxX: round2(x + w), maxY: round2(y + h) });
  function recordOp(op) { if (paintOps) paintOps.push(op); }

  // ===== What the log says, kept while the log stands (R4c) =================
  // A paint reads what the log derives — what each mark plays, where every
  // mark is, who read what, which labels stand — and keeps each only while
  // the log it came from stands. The key is the log itself: which array the
  // session holds (undo and load replace it), how long it is, and which event
  // ends it. Nothing else can say the board changed, so nothing else keys a
  // cache here: a stale cache is worse than a slow one.
  const serials = new WeakMap();
  let serialNext = 0;
  const serialOf = (o) => { let n = serials.get(o); if (n === undefined) { n = ++serialNext; serials.set(o, n); } return n; };
  function logKey() {
    const evs = session.getEvents();
    return serialOf(evs) + ':' + evs.length + ':' + (evs.length ? serialOf(evs[evs.length - 1]) : 0);
  }

  const growBox = (a, b) => (!a ? { minX: b.minX, minY: b.minY, maxX: b.maxX, maxY: b.maxY }
    : { minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY), maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY) });
  const boxMeets = (a, b) => a.maxX >= b.minX && a.minX <= b.maxX && a.maxY >= b.minY && a.minY <= b.maxY;
  function pointsBox(points) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) { if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x; if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y; }
    return points.length ? { minX, minY, maxX, maxY } : null;
  }

  /**
   * The board as the paint reads it, for one log: built once when the log
   * changes, a few milliseconds on a board of thousands of marks.
   *
   * - `scope` is the ink the rungs read, in their order: every loose mark,
   *   then each artifact's members (a box inside a live page is still a node,
   *   and the ladder says so); `at` is where each id stands in it.
   * - `reach` files those marks by their own boxes (`MM.MarkGrid`, cells sized
   *   from the marks), to find the marks within one's reach; `stray` are the
   *   marks whose boxes are not finite, which the grid does not hold and
   *   every neighbourhood carries; `wiredBy` is each mark's connectors.
   * - `paint` files each content mark by what it DRAWS — its own box, its
   *   clean form's and every part's, an artifact by its members' however far
   *   they have moved from where it was blessed — and `boxes` holds that box
   *   for the parts too; `unboxed` are the marks it has no finite box for,
   *   drawn always.
   * - `roles` and `genre` fill in as the paint asks.
   */
  let paintIndex = null;
  function boardIndex() {
    const key = logKey();
    // Built from the session's own state, which is the log's, whatever state
    // a caller holds: a cache kept by the log must be made from that log.
    if (!paintIndex || paintIndex.key !== key) {
      const before = paintIndex;
      paintIndex = buildIndex(session.getState(), key);
      // The last log's roles, and what each was read over, for roleOf to carry
      // forward — one log back, never a chain.
      if (before) { before.prev = null; paintIndex.prev = before; }
    }
    return paintIndex;
  }
  function buildIndex(s, key) {
    const artifactSet = new Set(s.artifacts);
    const scope = s.contentIds.filter((id) => !artifactSet.has(id));
    for (const aid of s.artifacts) for (const e of s.nodes.get(aid).edges) if (e.rel === 'has-part') scope.push(e.to);
    const at = new Map();
    scope.forEach((id, i) => { const p = at.get(id); if (p) p.push(i); else at.set(id, [i]); });
    const reach = new MM.MarkGrid(), stray = [], wiredBy = new Map();
    for (const id of at.keys()) {
      const n = s.nodes.get(id);
      const b = n && MM.boundsOf(n);
      if (b) { if (MM.finiteBounds(b)) reach.set(id, b); else stray.push(id); }
      if (n) for (const e of n.edges) if (e.rel === 'connects') { const w = wiredBy.get(e.to); if (w) w.push(id); else wiredBy.set(e.to, [id]); }
    }
    const boxes = new Map(), topOf = new Map();
    const boxOf = (id, top, depth) => {
      if (boxes.has(id)) return boxes.get(id);
      boxes.set(id, null);
      const n = s.nodes.get(id);
      if (!n) return null;
      let b = null;
      const own = MM.boundsOf(n);
      if (own) b = growBox(b, own);
      const points = MM.strokePointsOf(n);
      if (points) {
        const pb = pointsBox(points);
        if (pb) b = growBox(b, pb);
        const clean = MM.cleanPointsOf(n);
        const cb = clean && pointsBox(clean);
        if (cb) b = growBox(b, cb);
      }
      if (depth < 12) {
        for (const e of n.edges) {
          if (e.rel !== 'has-part') continue;
          if (!topOf.has(e.to)) topOf.set(e.to, top);
          const pb = boxOf(e.to, top, depth + 1);
          if (pb) b = growBox(b, pb);
        }
      }
      boxes.set(id, b);
      return b;
    };
    const paint = new MM.MarkGrid(), contentAt = new Map(), unboxed = [];
    s.contentIds.forEach((id, i) => {
      contentAt.set(id, i);
      const b = boxOf(id, id, 0);
      if (b && MM.finiteBounds(b)) paint.set(id, b); else unboxed.push(id);
    });
    return {
      key, s, scope, at, reach, stray, wiredBy, paint, boxes, topOf, contentAt, unboxed,
      artifactsInOrder: s.contentIds.filter((id) => artifactSet.has(id)),
      roles: new Map(), roleSig: new Map(), prev: null, genre: null, readChips: null, labelled: null, candidates: null,
    };
  }

  // ===== The rungs: what a mark plays ======================================
  // Shape → role → genre. The reading under a mark and the panel's ladder
  // read one mark's role; the panel's code row for a live artifact reads the
  // board's genre. The role is placed by the table in `diagram/roles.ts` from
  // the mark's own shape, the ENGAGING relations it has (contains, inside,
  // near, touching, crossing) and the wires, and an engaging relation holds
  // only between marks within reach of each other (`MM.withinReach`, R4b) —
  // so the role the whole board would give a mark is the role its
  // neighbourhood gives it: the mark, the marks within its reach, the ends of
  // its wires and the connectors wired to it, read in the whole board's own
  // order so that ties in strength fall the same way. That is what a stroke
  // costs the surface now: the marks it touched and their neighbours, read
  // when the paint shows them, never the whole board. `paintCheck` holds a
  // hand's paint to the whole-board read (`wholeBoardRungs`, what this was on
  // every stroke until R4c).
  function readRungs(s) {
    if (paintReference) return wholeBoardRungs(s);
    return { roles: { get: (id) => roleOf(s, id) }, get genre() { return boardGenre(s); } };
  }

  /** The ids a mark's role is read over: its neighbourhood, in the board's order. */
  function neighbourhoodOf(ix, s, id) {
    if (ix.stray.includes(id)) return ix.scope.slice();
    const near = new Set([id]);
    const b = ix.reach.boundsOf(id);
    if (b) {
      const r = MM.reachAround(b);
      for (const x of ix.reach.query({ minX: b.minX - r, minY: b.minY - r, maxX: b.maxX + r, maxY: b.maxY + r })) {
        if (MM.withinReach(b, ix.reach.boundsOf(x))) near.add(x);
      }
    }
    for (const x of ix.stray) near.add(x);
    const n = s.nodes.get(id);
    if (n) for (const e of n.edges) if (e.rel === 'connects') near.add(e.to);
    for (const w of ix.wiredBy.get(id) || []) near.add(w);
    const pos = [];
    for (const x of near) { const p = ix.at.get(x); if (p) for (const i of p) pos.push(i); }
    pos.sort((a, b2) => a - b2);
    return pos.map((i) => ix.scope[i]);
  }

  /**
   * What a mark's role was read from: each mark of its neighbourhood, in the
   * board's order, and that mark's own content — the node, its reps and its
   * edges, which change only by being pushed to or replaced (and a rep or an
   * edge is never changed in place, R4b), so their identities and lengths say
   * whether anything a role is read from has changed.
   */
  const nodeSig = (n) => (n ? serialOf(n) + '.' + serialOf(n.reps) + '.' + n.reps.length + '.' + serialOf(n.edges) + '.' + n.edges.length : '-');

  /**
   * The role the whole board gives a mark, read over its neighbourhood;
   * undefined for what the rungs do not read. A role the last log read over
   * exactly the same neighbourhood — the same marks, in the same order, each
   * the same — is carried forward rather than read again: that is what keeps
   * the board's genre, every mark's role, a few milliseconds after a stroke
   * rather than a read of every neighbourhood on the board.
   */
  function roleOf(s, id) {
    const ix = boardIndex();
    if (!ix.at.has(id)) return undefined;
    if (ix.roles.has(id)) return ix.roles.get(id);
    const ids = neighbourhoodOf(ix, ix.s, id);
    let sig = '';
    for (const x of ids) sig += x + ':' + nodeSig(ix.s.nodes.get(x)) + '|';
    let role;
    if (ix.prev && ix.prev.roleSig.get(id) === sig) role = ix.prev.roles.get(id);
    else for (const r of session.read(ids).roles) if (r.id === id) role = r;
    ix.roles.set(id, role);
    ix.roleSig.set(id, sig);
    return role;
  }

  /** The board's genre: every mark's role, each read over its neighbourhood. Asked only by a live artifact's panel. */
  function boardGenre(s) {
    const ix = boardIndex();
    if (!ix.genre) {
      if (!ix.scope.length) ix.genre = { genre: 'empty', reasoning: 'nothing drawn yet' };
      else {
        const roles = [];
        for (const id of ix.scope) { const r = roleOf(s, id); if (r) roles.push(r); }
        ix.genre = MM.genreOf(roles);
      }
    }
    return ix.genre;
  }

  // The whole-board read: every mark's role, related over the whole board at
  // once — O(n·R), 7.9 s on 2,000 marks. What the reference paint reads. It
  // was kept on the set of ids alone, so a move that changed a role — a
  // circle dragged out of the box that held it — left the old role standing
  // until a mark was added or taken away; it is kept by the log now, like
  // everything else a paint reads.
  let rungs = { key: null, roles: new Map(), genre: null, reading: null };
  function wholeBoardRungs(s) {
    const ids = s.contentIds.filter((id) => !s.artifacts.includes(id));
    // Members of artifacts keep their roles — a box inside a live page is
    // still a node, and the ladder should say so.
    for (const aid of s.artifacts) {
      for (const e of s.nodes.get(aid).edges) if (e.rel === 'has-part') ids.push(e.to);
    }
    const key = logKey() + '|' + ids.join('|');
    if (rungs.key === key) return rungs;
    const reading = ids.length
      ? session.read(ids)
      : { roles: [], genre: { genre: 'empty', reasoning: 'nothing drawn yet' }, concepts: [], relations: [] };
    rungs = { key, roles: new Map(reading.roles.map((r) => [r.id, r])), genre: reading.genre, reading };
    return rungs;
  }

  // ===== Rendering: ink is ground truth ===================================
  // Below a pixel, a hand's points crowd one another: at the zoom that shows a
  // whole board a stroke of seventy points spans a few pixels, and stroking
  // every one of them — twice, with its halo — was most of the frame. So a
  // point nearer than THIN_PX on screen to the last one drawn is passed over
  // (the last point is always drawn): nothing drawn moves by as much as that,
  // and at working zoom a hand's points stand further apart than it and every
  // one is drawn. The reference paint draws every point.
  const THIN_PX = 1;
  function path(points, closed) {
    ctx.beginPath();
    const n = points.length;
    if (!n) return;
    const tol = paintReference ? 0 : THIN_PX / view.zoom, tol2 = tol * tol;
    let lx = points[0].x, ly = points[0].y;
    ctx.moveTo(lx, ly);
    for (let i = 1; i < n; i++) {
      const p = points[i];
      if (i < n - 1 && tol2 > 0) { const dx = p.x - lx, dy = p.y - ly; if (dx * dx + dy * dy < tol2) continue; }
      ctx.lineTo(p.x, p.y);
      lx = p.x; ly = p.y;
    }
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

  /** The colour each mark's ink was stroked in by the last paint, by node id. For tests. */
  const inkDrawn = new Map();
  /**
   * The colour a mark's ink WOULD be stroked in, for a mark the last paint
   * passed over because it was off screen: its maker's, or the gold of a live
   * artifact it is part of — as `inkOf` would choose. For tests.
   */
  function inkWouldBe(id) {
    const s = state, ix = boardIndex();
    const top = ix.contentAt.has(id) ? id : ix.topOf.get(id);
    const n = s.nodes.get(id), t = top && s.nodes.get(top);
    if (!n || !t || !MM.strokePointsOf(n)) return null;
    if (id !== top && (n.reps.some((r) => r.modality === 'erased') || (isWritingArtifact(t) && !flipped.has(top)))) return null;
    return s.live.includes(top) ? `rgba(${C.goldRGB},0.85)` : colourOf(n);
  }

  function inkOf(node, style) {
    const points = MM.strokePointsOf(node);
    if (points) {
      inkDrawn.set(node.id, style.color);
      const clean = MM.cleanPointsOf(node);
      if (paintOps) recordOp({ kind: 'ink', id: node.id, colour: style.color, width: round2(style.width), box: boxOfPoints(points), clean: clean ? boxOfPoints(clean) : null, moved: paintMoved, gesture: !!style.gesture });
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
          const ghost = MM.placed(node, ideal.points);
          if (paintOps) recordOp({ kind: 'ghost', id: node.id, box: boxOfPoints(ghost), moved: paintMoved });
          path(ghost, ideal.closed);
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
      if (!m || m.reps.some((r) => r.modality === 'erased')) continue;
      // Off screen, a member is passed over — unless a drag or a tank has moved it, when its box is not where it is drawn.
      if (paintView && !paintMoved && paintIndex) { const mb = paintIndex.boxes.get(m.id); if (mb && MM.finiteBounds(mb) && !boxMeets(mb, paintView)) continue; }
      // Each mark in the colour of the hand that DREW it, not of the one that made the
      // whole: an artifact is made by whoever blessed it, and a hand may bless a group
      // several hands drew (V1-PLAN L2f). A colour the style imposes — a live page's
      // gold, the outline of what was built — holds for every mark in it.
      inkOf(m, style.byMaker ? Object.assign({}, style, { color: colourOf(m) }) : style);
    }
  }

  // The clean-form ghost is an offer for a moment, not a fixture.
  const GHOST_MS = 6000;
  let lastDrawAt = 0, ghostTimer = null;
  function ghostShown(s, id) {
    if (hoverId === id || s.selection.includes(id)) return true;
    if (s.summon && s.summon.enclosedIds.includes(id)) return true;
    if (heldCandidates.includes(id)) return true;
    return id === lastContentId(s) && nowMs() - lastDrawAt < GHOST_MS;
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
   * reader — forgets a node the log no longer holds. An id is the core's to
   * mint and opaque here; what matters is that it is NOT unique for all
   * time, so a fresh board may hand out one this memory still holds: a text
   * flipped before a `load([])` kept the next text with the same id flipped,
   * and a scratch over it struck nothing (found by e2e 35). Keying runtime
   * memory to what the log holds is right whatever the rule.
   */
  function pruneRuntime(s) {
    for (const id of [...flipped]) if (!s.live.includes(id)) flipped.delete(id);
    if (readGroups.size) {
      const inPlane = paintReference ? (id) => s.contentIds.includes(id) : ((ix) => (id) => ix.contentAt.has(id))(boardIndex());
      for (const id of [...readGroups.keys()]) if (!inPlane(id)) readGroups.delete(id);
    }
    for (const id of [...readWith.keys()]) if (!s.nodes.has(id)) readWith.delete(id);
    for (const key of [...askedToRead]) { const first = String(key).replace(/^line:/, '').split(',')[0]; if (!s.nodes.has(first)) askedToRead.delete(key); }
  }

  // ===== The stroke in progress, on a layer of its own (R4c) ================
  // A pointer move while drawing repaints the pen — the stroke so far, and the
  // magnet it is in reach of — on a canvas laid over the board's, and never
  // the board: a paint of everything on every move, on a big board, was the
  // ink lagging the pen. The layer takes no pointer; the board's canvas under
  // it takes every one, as before. Every paint of the board repaints it too,
  // so a pan or a zoom mid-stroke keeps the pen where the hand is. A pencil
  // hovering over the glass, touching nothing, has its magnet drawn here too
  // (V1-PLAN R6): the site a stroke begun there would start on.
  const liveCanvas = document.createElement('canvas');
  liveCanvas.id = 'liveInk';
  liveCanvas.setAttribute('aria-hidden', 'true');
  liveCanvas.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:2;';
  canvas.insertAdjacentElement('afterend', liveCanvas);
  const liveCtx = liveCanvas.getContext('2d');
  let liveShown = false;
  function drawLive() {
    const dpr = window.devicePixelRatio || 1;
    if (liveCanvas.width !== Math.round(innerWidth * dpr) || liveCanvas.height !== Math.round(innerHeight * dpr)) {
      liveCanvas.width = Math.round(innerWidth * dpr);
      liveCanvas.height = Math.round(innerHeight * dpr);
      liveCanvas.style.width = innerWidth + 'px';
      liveCanvas.style.height = innerHeight + 'px';
      liveShown = true;
    }
    liveCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (liveShown) liveCtx.clearRect(0, 0, innerWidth, innerHeight);
    liveShown = !!live || !!penHover;
    if (!liveShown) return;
    liveCtx.setTransform(dpr * view.zoom, 0, 0, dpr * view.zoom, dpr * view.panX, dpr * view.panY);
    // A pencil hovering over the glass: the magnet it is in reach of, where a stroke begun
    // there would start (V1-PLAN R6) — the same ring, drawn before the pen comes down.
    if (!live) { magnetRing(penHover); return; }
    liveCtx.lineCap = 'round';
    liveCtx.lineJoin = 'round';
    liveCtx.beginPath();
    live.forEach((p, i) => (i ? liveCtx.lineTo(p.x, p.y) : liveCtx.moveTo(p.x, p.y)));
    liveCtx.strokeStyle = C.ink;
    liveCtx.lineWidth = Math.max(2, wpx(1.3));
    liveCtx.stroke();
    // The hold, while the pen is in a site's reach: a ring and the site's
    // name, in the participant colour — an offer, never a trap (P1).
    if (magnetHold) magnetRing(magnetHold);
  }
  /** A magnet the pen is in reach of: a ring, a dot, and the site's name — in world space, on the pen's layer. */
  function magnetRing(hit) {
    const p = hit.site.point;
    liveCtx.beginPath();
    liveCtx.arc(p.x, p.y, wpx(8), 0, Math.PI * 2);
    liveCtx.strokeStyle = C.agent;
    liveCtx.lineWidth = wpx(1.5);
    liveCtx.stroke();
    liveCtx.beginPath();
    liveCtx.arc(p.x, p.y, wpx(2.2), 0, Math.PI * 2);
    liveCtx.fillStyle = C.agent;
    liveCtx.fill();
    liveCtx.font = wpx(11).toFixed(2) + "px 'Space Grotesk', system-ui, sans-serif";
    liveCtx.lineWidth = wpx(3);
    liveCtx.strokeStyle = C.haloText;
    liveCtx.strokeText(hit.site.kind, p.x + wpx(13), p.y - wpx(9));
    liveCtx.fillStyle = C.agent;
    liveCtx.fillText(hit.site.kind, p.x + wpx(13), p.y - wpx(9));
  }

  /** The canvas in world units, grown by `m` world units on every side. */
  function screenWorld(m) {
    const a = screenToWorld(0, 0), b = screenToWorld(innerWidth, innerHeight);
    return { minX: Math.min(a.x, b.x) - m, minY: Math.min(a.y, b.y) - m, maxX: Math.max(a.x, b.x) + m, maxY: Math.max(a.y, b.y) + m };
  }

  /** Where a match chip sits and how big it is, measured in the chrome's own size — drawn or not. */
  function chipRect(str, x, y) {
    ctx.font = wpx(10.5).toFixed(2) + 'px ui-monospace, SFMono-Regular, Menlo, monospace';
    const w = ctx.measureText(str).width + wpx(14), h = wpx(17);
    return { x: x, y: y - h, w: w, h: h };
  }

  /** The box each cluster candidate's marks fill, for this log. */
  function candidateBoxes(ix) {
    if (!ix.candidates) ix.candidates = ix.s.clusterCandidates.map((c) => union(c.nodeIds.map((id) => MM.boundsOf(ix.s.nodes.get(id)))));
    return ix.candidates;
  }

  /** What each model read a group as, for this log: the marks that hold a reading of the second tier, and what the chip says. */
  function readChipsOf(s, ix) {
    if (ix && ix.readChips) return ix.readChips;
    if (ix) s = ix.s;
    const out = [];
    for (const id of s.contentIds) {
      const n = s.nodes.get(id);
      if (!n || n.reps.some((r) => r.modality === 'erased')) continue;
      const reads = MM.interpretationsOf(n, s.nodes).filter((r) => r.tier === 2 && !r.blessed).sort((a, b) => b.weight - a.weight);
      if (!reads.length) continue;
      out.push({ id: id, text: reads.slice(0, 2).map((r) => r.label + ' ' + r.weight.toFixed(2)).join('  ·  ') + '  ·  ' + reads[0].sourceName });
    }
    if (ix) ix.readChips = out;
    return out;
  }

  /** Whether an artifact wears its brackets and name: a FIGURE only while the hand is on it. */
  function chromeShown(s, id, inspectedId) {
    const node = s.nodes.get(id);
    if (!node || !MM.boundsOf(node)) return false;
    return !(isFigureArtifact(node) && id !== inspectedId && !s.selection.includes(id));
  }

  /**
   * The content marks this paint draws, in the board's order: those whose
   * box meets the screen, and — wherever they are — what the hand is on or
   * holds, what a drag or a tank has moved, and the artifacts whose name or
   * brackets reach the screen.
   */
  function paintOrder(s, ix, vb, inspectedId, pv) {
    const out = new Set(ix.paint.query(vb));
    for (const id of ix.unboxed) out.add(id);
    if (inspectedId) out.add(inspectedId);
    const last = lastContentId(s);
    if (last) out.add(last);
    for (const id of s.selection) out.add(id);
    if (s.summon) for (const id of s.summon.enclosedIds) out.add(id);
    for (const id of heldCandidates) out.add(id);
    if (pv) for (const id of pv.ids) out.add(id);
    for (const id of tank.place.keys()) out.add(id);
    for (const id of ix.artifactsInOrder) {
      if (out.has(id) || !chromeShown(s, id, inspectedId)) continue;
      const node = s.nodes.get(id), b0 = MM.boundsOf(node), pl = bodyPlacement(id);
      const b = pl ? { minX: b0.minX + pl.dx, maxX: b0.maxX + pl.dx, minY: b0.minY + pl.dy, maxY: b0.maxY + pl.dy } : b0;
      ctx.font = wpx(11).toFixed(2) + "px 'Space Grotesk', system-ui, sans-serif";
      const w = ctx.measureText((MM.wordOf(node) || '') + '  ·  live').width;
      const chrome = { minX: b.minX - wpx(24), minY: b.minY - wpx(40), maxX: Math.max(b.maxX, b.minX + w) + wpx(24), maxY: b.maxY + wpx(24) };
      if (boxMeets(chrome, vb)) out.add(id);
    }
    return [...out].filter((id) => ix.contentAt.has(id)).sort((a, b) => ix.contentAt.get(a) - ix.contentAt.get(b));
  }

  /** While a paint culls, the world box it draws within; null when it draws everything. */
  let paintView = null;

  /** How many times the board has been painted, for tests: a pointer move while drawing must not paint it. */
  let paints = 0;
  function render(s) {
    paints++;
    state = s;
    chipHits = [];
    chromeDrawn = [];
    readingDrawn = null;
    inkDrawn.clear();
    pruneRuntime(s);
    // No model is asked from here: a paint is not a request (§6.3).
    syncStage(s);
    refreshOffers();
    // The reference paint (paintCheck) reads the whole board and draws all of
    // it, as every paint did before R4c; a hand's paint reads what the log
    // keeps and draws what is on screen.
    const ix = paintReference ? null : boardIndex();

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
    // What is on screen: the canvas, with room for what a mark draws past its
    // own box — a stroke's width and its halo, a chip, a few words beside it.
    const vb = ix ? screenWorld(Math.max(wpx(48), inkW * 2)) : null;

    const cands = ix ? candidateBoxes(ix) : null;
    (ix ? ix.s : s).clusterCandidates.forEach((c, ci) => {
      const b0 = cands ? cands[ci] : union(c.nodeIds.map((id) => MM.boundsOf(s.nodes.get(id))));
      const cp = bodyPlacement(c.nodeIds[0]);
      const b = cp ? { minX: b0.minX + cp.dx, maxX: b0.maxX + cp.dx, minY: b0.minY + cp.dy, maxY: b0.maxY + cp.dy } : b0;
      const pad = wpx(14);
      // A match is a chip beside the group, with its number (D8); a tap on it
      // opens the field with the match leading. Plural, like every reading:
      // two definitions with the same shapes are both named.
      const said = c.matches.slice(0, 2).map((m) => m.name + ' ' + m.score.toFixed(2)).join('  ·  ');
      const at = chipRect(said, b.minX - pad, b.minY - pad - wpx(8));
      const whole = { minX: b.minX - pad, minY: at.y, maxX: Math.max(b.minX - pad + at.w, b.maxX + pad), maxY: b.maxY + pad };
      if (!vb || cp || boxMeets(whole, vb)) {
        ctx.setLineDash([wpx(4), wpx(6)]);
        ctx.strokeStyle = `rgba(${C.goldRGB},0.38)`;
        ctx.lineWidth = wpx(1);
        ctx.strokeRect(b.minX - pad, b.minY - pad, b.maxX - b.minX + pad * 2, b.maxY - b.minY + pad * 2);
        ctx.setLineDash([]);
        chipText(said, b.minX - pad, b.minY - pad - wpx(8));
        if (paintOps) recordOp({ kind: 'match', id: c.nodeIds.join(','), text: said, box: boxOfRect(whole.minX, whole.minY, whole.maxX - whole.minX, whole.maxY - whole.minY), moved: !!cp });
      }
      // Measured wherever it is, so a tap and a test find it whether it was drawn or not.
      chipHits.push({ ids: c.nodeIds.slice(), x: at.x, y: at.y, w: at.w, h: at.h });
    });
    // What a model read a group as stays beside it (v10 F6): a chip with the
    // number and the reader, whether or not the field is still open, and a
    // tap on it opens the field on those marks again. A reading held on a
    // group's first member speaks for the group it was asked about.
    const inPlane = ix ? (g) => ix.contentAt.has(g) : (g) => s.contentIds.includes(g);
    for (const rc of readChipsOf(s, ix)) {
      const id = rc.id;
      const group = (readGroups.get(id) || [id]).filter(inPlane);
      const boxes = (group.length ? group : [id]).map((g) => MM.boundsOf(s.nodes.get(g))).filter(Boolean);
      if (!boxes.length) continue;
      const b = union(boxes);
      const pad = wpx(14);
      const at = chipRect(rc.text, b.minX - pad, b.maxY + pad + wpx(17));
      if (!vb || boxMeets({ minX: at.x, minY: at.y, maxX: at.x + at.w, maxY: at.y + at.h }, vb)) {
        chipText(rc.text, b.minX - pad, b.maxY + pad + wpx(17));
        if (paintOps) recordOp({ kind: 'read', id: id, text: rc.text, box: boxOfRect(at.x, at.y, at.w, at.h), moved: false });
      }
      chipHits.push({ ids: group.length ? group : [id], x: at.x, y: at.y, w: at.w, h: at.h });
    }

    const inspectedId = hoverId || lastContentId(s);
    const pv = dragPreview();
    // Which artifacts wear their brackets and name — for every artifact on the
    // board, in its order, drawn or not: a label rises above the name, and the
    // name is the same whether the artifact is on screen or not.
    for (const id of ix ? ix.artifactsInOrder : s.contentIds.filter((x) => s.artifacts.includes(x))) if (chromeShown(s, id, inspectedId)) chromeDrawn.push(id);
    const artifactSet = new Set(s.artifacts), liveSetNow = new Set(s.live);
    // Members of an artifact are culled one by one — a big drawing is mostly
    // off screen at working zoom — except while a tank moves bodies about.
    paintView = vb && !tank.place.size ? vb : null;

    for (const id of ix ? paintOrder(s, ix, vb, inspectedId, pv) : s.contentIds) {
      const node = s.nodes.get(id);
      const isArtifact = artifactSet.has(id);
      const isLive = liveSetNow.has(id);
      const pending = s.pendingLassoId === id;
      // A closed stroke around marks is plain ink until the mark takes it: nothing
      // lights up on its own. The command mark is what makes it a selection.
      const color = colourOf(node);

      // A live artifact keeps its ink: the boxes you drew ARE the outlines of
      // what got built, and that promise is only kept by drawing them on top.
      // While a hand holds the selection, the held marks follow it before the
      // log has the move — one event lands when the hand lets go.
      const held = pv && pv.ids.includes(id);
      if (held) { ctx.save(); applyPreview(pv); }
      // A body in a running tank is drawn where its behaviour has taken it:
      // the DRAWING moves, translated and turned, never a sprite in its place.
      const pl = bodyPlacement(id);
      if (pl) { ctx.save(); ctx.translate(pl.cx + pl.dx, pl.cy + pl.dy); ctx.rotate(pl.angle); ctx.translate(-pl.cx, -pl.cy); }
      paintMoved = !!(held || pl);
      inkOf(node, {
        color: isLive ? `rgba(${C.goldRGB},0.85)` : color,
        width: id === inspectedId ? inkW * 1.3 : inkW,
        byMaker: !isLive,
      });
      paintMoved = false;
      if (pl) ctx.restore();
      if (held) ctx.restore();

      const b0 = MM.boundsOf(node);
      const b = b0 && pl ? { minX: b0.minX + pl.dx, maxX: b0.maxX + pl.dx, minY: b0.minY + pl.dy, maxY: b0.maxY + pl.dy } : b0;
      if (isArtifact && b) {
        // A FIGURE wears its chrome only while you point at it. The brackets
        // and the filename say "a thing with an identity you can grab", which
        // is what you want over a page or a program; over a title, a label
        // inside a drawn box, or a note, they are a second drawing on top of
        // the first, and a figure made of eight of them is unreadable. Same
        // rule the reading under a mark already follows: shown for the one the
        // hand is on, not for every mark on the board.
        if (chromeShown(s, id, inspectedId)) {
          const name = (MM.wordOf(node) || '') + (isLive ? '  ·  live' : '');
          if (paintOps) recordOp({ kind: 'chrome', id: id, text: name, box: boxOfRect(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY), moved: !!pl });
          brackets(b, isLive ? C.gold : `rgba(${C.goldRGB},0.7)`);
          text(name, b.minX, b.minY - wpx(10), C.gold);
        }
      } else if (b && !pending && id === inspectedId && !s.selection.length) {
        // The reading of the mark the hand just made (or is over), and only
        // that one: what it is, and what it plays. Under every mark it was a
        // board of fragments; the panel has the rest.
        const said = MM.transcriptOf(node);
        // A label is its maker's word, not what the shape rung measured (L2b).
        const shape = MM.interpretationsOf(node, s.nodes).filter((r) => r.tier === 0 && r.basis !== 'label')[0];
        const top = MM.wordOf(node) || (said ? '“' + said + '”' : shape ? shape.label : MM.topInterpretation(node));
        const role = readRungs(s).roles.get(id);
        const played = role && role.role !== 'unclassified' && role.role !== top ? ' · ' + role.role : '';
        if (top) {
          readingDrawn = { id: id, text: top + played };
          if (paintOps) recordOp({ kind: 'reading', id: id, text: top + played, box: boxOfRect(b.minX, b.maxY, 0, wpx(15)), moved: !!pl });
          text(top + played, b.minX, b.maxY + wpx(15), `rgba(${C.labelRGB},0.85)`);
        }
      }
    }
    paintView = null;

    renderLabels(s, inspectedId, ix, vb);

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

    // The stroke in progress lives on a layer of its own (drawLive), so a
    // pointer move repaints the pen and nothing else.
    drawLive();

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
    const fresh = flashText && nowMs() - flashAt < flashFor;
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
    // A save that fails LEADS the line, fresh message or not, with its way
    // out, until a save succeeds (V1-PLAN R3: never silent).
    const warn = boardWarning();
    paintStatus(warn, fresh ? flashText + (ws ? '  ·  ⋯ ' + ws : '') + (hint ? '  ·  ' + hint : '') : standing);
    statusEl.dataset.standing = (warn ? warn.lead + '  ·  ' : '') + standing;
    statusEl.classList.toggle('said', !!fresh);
    statusEl.classList.toggle('warn', !!warn);
  }

  /**
   * The status line's text, and — while the board is not being kept — the
   * sentence that says so and its ways out as buttons in the line: *export
   * the log*, and *open a folder* where the browser can. Touched only when
   * what it says changes.
   */
  let statusSaid = '';
  function paintStatus(warn, text) {
    const canFolder = !!window.showDirectoryPicker;
    const ways = warn ? warn.ways.filter((w) => w !== 'folder' || canFolder) : [];
    const key = (warn ? warn.lead + '|' + ways.join(',') : '') + '\u0000' + text;
    if (key === statusSaid) return;
    statusSaid = key;
    if (!warn) { statusEl.textContent = text; return; }
    const label = { export: 'export the log', folder: 'open a folder' };
    statusEl.innerHTML = '<span class="lead">' + esc(warn.lead) + '</span>' +
      (ways.length ? ': ' + ways.map((w) => '<button type="button" data-way="' + w + '">' + label[w] + '</button>').join(', or ') : '') +
      (text ? '<span class="rest">  ·  ' + esc(text) + '</span>' : '');
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

  // ===== A hand's word on its own ink (V1-PLAN L2b; the notes, §B and §D) ====
  // A label is a word a mark's maker put on it: not a blessed name and not a
  // text artifact with a filename, so it makes no file and no card. It is
  // drawn here, on the canvas, beside the mark — in the ink's own colour,
  // which is its maker's, from the same tokens in either theme — and at a
  // size in the BOARD's units: the caption rule of 13-kinds.js, where a few
  // words written onto a drawing scale with the drawing. Held at screen size
  // they float off the thing they name the moment the board zooms (the notes,
  // fault 3). The size is the hand's: LABEL_PX on the screen the mark was
  // drawn on (its stroke's scale), so a label reads at the size its mark was
  // made at. Its chrome — who put it there — keeps quiet until the hand
  // points at the mark, like every other reading.
  const LABEL_PX = 13;
  let labelsDrawn = []; // this paint's labels, in world units, for tests: { id, text, x, y, w, size, px, colour, who, whoShown }

  /** A label's size in world units: LABEL_PX in the hand's space when its mark was made. */
  function labelSizeOf(node) {
    const scaleOf = (n) => { const st = n && MM.getRep(n, 'stroke'); return st && st.data && st.data.scale > 0 ? st.data.scale : null; };
    let scale = scaleOf(node);
    for (const e of node.edges) {
      if (scale !== null) break;
      if (e.rel === 'has-part') scale = scaleOf(state.nodes.get(e.to));
    }
    return LABEL_PX * (scale || 1);
  }

  /** Every label on a mark whose ink is on the board: loose marks, and the marks an artifact holds. */
  function renderLabels(s, inspectedId, ix, vb) {
    labelsDrawn = [];
    const pv = dragPreview();
    for (const { id, placedBy } of labelledOf(s, ix)) {
      const node = s.nodes.get(id);
      drawLabel(s, node, MM.labelOf(node), placedBy, inspectedId, pv, vb);
    }
  }

  /** The marks that carry a label, and the content mark each is drawn under, in the board's order — for this log. */
  function labelledOf(s, ix) {
    if (ix && ix.labelled) return ix.labelled;
    if (ix) s = ix.s;
    const out = [];
    const seen = new Set();
    const visit = (id, placedBy) => {
      if (seen.has(id)) return;
      seen.add(id);
      const node = s.nodes.get(id);
      if (!node || node.reps.some((r) => r.modality === 'erased')) return;
      if (MM.labelOf(node)) out.push({ id: id, placedBy: placedBy });
      for (const e of node.edges) if (e.rel === 'has-part') visit(e.to, placedBy);
    };
    for (const id of s.contentIds) visit(id, id);
    if (ix) ix.labelled = out;
    return out;
  }

  function drawLabel(s, node, lab, placedBy, inspectedId, pv, vb) {
    const b0 = MM.boundsOf(node);
    if (!b0) return;
    // A body in a running tank, and a held selection mid-drag, carry their words with them.
    const pl = bodyPlacement(placedBy);
    const b = pl ? { minX: b0.minX + pl.dx, maxX: b0.maxX + pl.dx, minY: b0.minY + pl.dy, maxY: b0.maxY + pl.dy } : b0;
    const held = pv && (pv.ids.includes(node.id) || pv.ids.includes(placedBy));
    const size = labelSizeOf(node);
    // Above the artifact's own name when that chrome is showing, else just above the mark.
    const raised = chromeDrawn.includes(node.id) ? wpx(24) : 0;
    const x = b.minX, y = b.minY - size * 0.45 - raised;
    const colour = colourOf(node);
    const who = nameOfParticipant(lab.source || authorOf(node));
    const whoShown = node.id === inspectedId || placedBy === inspectedId;
    ctx.font = size.toFixed(3) + "px 'Space Grotesk', system-ui, sans-serif";
    const w = ctx.measureText(lab.text).width;
    // Where it stands is said wherever it is; it is drawn when it reaches the screen.
    labelsDrawn.push({ id: node.id, text: lab.text, x: x, y: y, w: w, size: size, px: size * view.zoom, colour: colour, who: who, whoShown: whoShown });
    const reach = { minX: x, minY: y - size * 1.2, maxX: x + w + (whoShown ? size + wpx(11) * (who.length + 3) : 0), maxY: y + size * 0.5 };
    if (vb && !held && !pl && !boxMeets(reach, vb)) return;
    if (held) { ctx.save(); applyPreview(pv); }
    ctx.lineWidth = size * 0.24;
    ctx.strokeStyle = C.haloText;
    ctx.strokeText(lab.text, x, y);
    ctx.fillStyle = colour;
    ctx.fillText(lab.text, x, y);
    if (whoShown) text('· ' + who, x + w + size * 0.4, y, `rgba(${C.labelRGB},0.85)`);
    if (held) ctx.restore();
    if (paintOps) recordOp({ kind: 'label', id: node.id, text: lab.text, box: boxOfRect(x, y - size, w, size * 1.45), moved: !!(held || pl) });
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
  /** Which artifacts wore their brackets and name in the last paint. For tests. */
  let chromeDrawn = [];

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

  /**
   * WHAT a card is about, as a few words: the names its marks carry, else the
   * one mark's reading, else how many there are. A card is a sentence in a
   * live layer, not a caption someone will read cold, so the subject belongs in
   * its chrome — writing "Box 3 of six" into the prose is the writer doing by
   * hand, badly, what the card already knows.
   */
  function subjectOf(s, about) {
    const names = about.map((id) => { const n = s.nodes.get(id); return n && MM.wordOf(n); }).filter(Boolean);
    if (names.length) return names.slice(0, 2).join(', ') + (names.length > 2 ? ' +' + (names.length - 2) : '');
    if (about.length === 1) {
      const n = s.nodes.get(about[0]);
      if (!n) return 'a mark';
      const said = MM.transcriptOf(n);
      if (said) return '\u201c' + said + '\u201d';
      return MM.topInterpretation(n) || 'a mark';
    }
    return about.length + ' marks';
  }

  /**
   * How long ago, in a word. The explanation plane is the live layer — what
   * someone is saying now, not what the board holds — and a card that never
   * says its age reads as permanent, which is how it came to be used for
   * labels that belong in the drawing.
   */
  function agoOf(at) {
    const ms = nowMs() - (at || 0);
    if (!(ms > 0) || ms < 45000) return 'just now';
    const m = Math.round(ms / 60000);
    if (m < 60) return m + 'm ago';
    const h = Math.round(m / 60);
    return h < 24 ? h + 'h ago' : Math.round(h / 24) + 'd ago';
  }

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
      what: subjectOf(s, about),
      ago: agoOf(node.createdAt),
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
    // The marks near the window, in the board's order: the paint's index finds them, the test below is the same.
    let ids = s.contentIds;
    if (!paintReference) {
      const ix = boardIndex();
      const near = new Set(ix.paint.query({ minX: win.x - thin, minY: win.y - thin, maxX: win.x + win.w + thin, maxY: win.y + win.h + thin }));
      for (const id of ix.unboxed) near.add(id);
      ids = [...near].filter((id) => ix.contentAt.has(id)).sort((a, b) => ix.contentAt.get(a) - ix.contentAt.get(b));
    }
    for (const id of ids) {
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
      cardRects.push({ id: card.id, about: card.about.slice(), what: card.what, who: card.who, ago: card.ago, x: card.rect.x, y: card.rect.y, w: card.rect.w, h: card.rect.h });
    }

    // Every card is placed, on screen or not — a card off screen still keeps
    // its place from the ones that are — and drawn when it, its leader or the
    // marks it speaks for reach the screen.
    const vb = paintReference ? null : screenWorld(wpx(48));
    for (const card of cards) {
      const r = card.rect, sub = rectOf(card.subject);
      const reach = { minX: Math.min(r.x, sub.x), minY: Math.min(r.y, sub.y), maxX: Math.max(r.x + r.w, sub.x + sub.w), maxY: Math.max(r.y + r.h, sub.y + sub.h) };
      if (vb && !boxMeets(reach, vb)) continue;
      if (paintOps) recordOp({ kind: 'card', id: card.id, text: card.who + ' · ' + card.what + ' · ' + card.ago + ' · ' + card.lines.join(' '), box: boxOfRect(reach.minX, reach.minY, reach.maxX - reach.minX, reach.maxY - reach.minY), moved: false });
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

      // The header carries who said it, what it is about, and how long ago —
      // the three things that used to be smuggled into the sentence.
      ctx.font = wpx(10).toFixed(2) + CARD_FONT;
      const agoW = ctx.measureText(card.ago).width;
      ctx.fillStyle = `rgba(${C.labelRGB},0.7)`;
      ctx.fillText(card.ago, r.x + r.w - pad - agoW, r.y + pad + wpx(8));
      ctx.fillStyle = C.agent;
      const whoW = ctx.measureText(card.who).width;
      ctx.fillText(card.who, r.x + pad, r.y + pad + wpx(8));
      const room = r.w - pad * 2 - whoW - agoW - wpx(16);
      if (card.what && room > wpx(30)) {
        ctx.fillStyle = `rgba(${C.labelRGB},0.95)`;
        ctx.fillText(clipText(card.what, room), r.x + pad + whoW + wpx(8), r.y + pad + wpx(8));
      }

      ctx.fillStyle = C.ink;
      ctx.font = wpx(11).toFixed(2) + CARD_FONT;
      card.lines.forEach((ln, i) =>
        ctx.fillText(ln, r.x + pad, r.y + pad + wpx(CARD_HEAD) + wpx(8) + i * wpx(CARD_LINE)));
    }
  }

  /** As much of a word as fits, with an ellipsis when it does not. */
  function clipText(str, maxWidth) {
    if (ctx.measureText(str).width <= maxWidth) return str;
    let out = String(str);
    while (out.length > 1 && ctx.measureText(out + '\u2026').width > maxWidth) out = out.slice(0, -1);
    return out + '\u2026';
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

  /**
   * Every mark's role as a hand's paint reads it (over its neighbourhood)
   * against the whole-board read, and the board's genre both ways: the table
   * the reading under a mark and the panel say from. For tests.
   */
  function rolesCheck() {
    const s = session.getState();
    const whole = wholeBoardRungs(s);
    const ix = boardIndex();
    const differ = [];
    for (const id of ix.at.keys()) {
      const mine = roleOf(s, id), theirs = whole.roles.get(id);
      if (JSON.stringify(mine) !== JSON.stringify(theirs)) differ.push({ id: id, neighbourhood: mine || null, whole: theirs || null });
    }
    const genre = boardGenre(s);
    const genreSame = JSON.stringify(genre) === JSON.stringify(whole.genre);
    return { ok: !differ.length && genreSame, marks: ix.at.size, differ: differ.slice(0, 5), differing: differ.length, genre: genre.genre, genreSame: genreSame };
  }

  // ===== The equivalence check (R4c) ========================================
  /**
   * Paint the board as a hand's paint does, then as the whole-board read
   * would, and say where the two differ: everything the first drew, the second
   * drew the same; everything the second drew on screen, the first drew; and
   * both said the same thing — the reading under the mark, the status line,
   * the panel, the chips, the labels, the cards, the minimap, the offers.
   * A test's tool: it paints three times, with the clock held still, and
   * leaves the board as a hand's paint left it. `ops` is how many things a
   * hand's paint drew, `of` how many the whole-board read drew.
   */
  function paintCheck() {
    const s = session.getState();
    const take = (reference) => {
      paintOps = [];
      paintReference = reference;
      try { render(s); } finally { paintReference = false; }
      const ops = paintOps;
      paintOps = null;
      return {
        ops: ops,
        reading: readingDrawn,
        // A model at work says how long it has worked; that is the clock, not the board.
        status: statusEl.textContent.replace(/\d+s\b/g, '#s'),
        standing: (statusEl.dataset.standing || '').replace(/\d+s\b/g, '#s'),
        // A running tank's clock is said in the panel; that too is the clock.
        panel: inspectorEl.innerHTML.replace(/t = [\d.]+s/g, 't = #s'),
        chips: chipHits.map((c) => ({ ids: c.ids.slice(), x: round2(c.x), y: round2(c.y), w: round2(c.w), h: round2(c.h) })),
        labels: labelsDrawn.map((l) => ({ id: l.id, text: l.text, x: round2(l.x), y: round2(l.y), w: round2(l.w), colour: l.colour, who: l.who, whoShown: l.whoShown })),
        cards: cardRects.map((c) => ({ id: c.id, what: c.what, who: c.who, ago: c.ago, x: round2(c.x), y: round2(c.y), w: round2(c.w), h: round2(c.h) })),
        chrome: chromeDrawn.slice(),
        mini: typeof mini !== 'undefined' && mini ? { scale: mini.scale, ox: round2(mini.ox), oy: round2(mini.oy) } : null,
        offers: [...snapOffers.keys()],
        held: heldCandidates.slice(),
      };
    };
    let got, want;
    paintNow = Date.now();
    try { got = take(false); want = take(true); } finally { paintNow = 0; render(s); }
    const diffs = [];
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    for (const k of ['reading', 'status', 'standing', 'panel', 'chips', 'labels', 'cards', 'chrome', 'mini', 'offers', 'held']) {
      if (!same(got[k], want[k])) diffs.push({ what: 'said differently: ' + k, got: got[k], want: want[k] });
    }
    // On screen: what an op draws — its box, and what it carries past the box
    // it was given (a stroke's width and halo, the words beside a mark or
    // above an artifact) — meets the canvas. Generous on purpose: a hand's
    // paint must draw everything this calls on screen.
    const vp = screenWorld(0);
    const carry = { ink: wpx(8) + 4, ghost: wpx(8) + 4, match: wpx(4), read: wpx(4), card: wpx(4), label: wpx(24), chrome: wpx(40), reading: wpx(24) };
    const reach = (bx, op) => {
      const m = carry[op.kind] || wpx(8), words = op.text && (op.kind === 'reading' || op.kind === 'chrome' || op.kind === 'label') ? op.text.length * wpx(9) : 0;
      return { minX: bx.minX - m, minY: bx.minY - m, maxX: bx.maxX + m + words, maxY: bx.maxY + m };
    };
    const onScreen = (op) => op.moved || !op.box || boxMeets(reach(op.box, op), vp) || (op.clean && boxMeets(reach(op.clean, op), vp));
    const key = (op) => JSON.stringify(op);
    const wantKeys = new Set(want.ops.map(key)), gotKeys = new Set(got.ops.map(key));
    for (const op of got.ops) if (!wantKeys.has(key(op))) diffs.push({ what: 'drawn, and the whole-board read draws it otherwise or not at all', op: op });
    for (const op of want.ops) if (!gotKeys.has(key(op)) && onScreen(op)) diffs.push({ what: 'on screen, and not drawn', op: op });
    const count = (ops, kind) => ops.filter((op) => op.kind === kind).length;
    return {
      ok: diffs.length === 0, diffs: diffs, ops: got.ops.length, of: want.ops.length, marks: s.contentIds.length,
      // How much less a hand's paint stroked than the whole-board read, and that the minimap still shows everything.
      ink: { drawn: count(got.ops, 'ink'), of: count(want.ops, 'ink') }, minimap: { drawn: count(got.ops, 'mini'), of: count(want.ops, 'mini') },
    };
  }

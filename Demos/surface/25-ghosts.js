// ===== fill-ins as ghosts =====
// Provides: what the maths implies, drawn faint where it would be written (MATHS-SPEC §4–§5, M16–M18) —
//   fgFor (the fill-ins and the quantities' hues, kept while the log stands), renderFillGhosts (called by render,
//   BENEATH the ink: the halos of the quantities and the ghosts), fgAt and fgTake (the tap that shows an answer that
//   waits and the tap that writes it), fgSettle, boardSettingsHtml (the panel's board line, when nothing is held),
//   and window.__mmGhosts, the handle the e2e drives.
// Uses: core (MM.fillInsOfSession, fillInsOf, boardMathsOf, boardMaths, figureQuantities, quantityHuesOfSession,
//   quantityColour, fillFontSize, textBoxOf, fillLandsOnBoard, writeFillIn, makePalette), render (logKey, nowMs,
//   recordOp, boxOfRect, boxMeets, boardIndex, dragPreview, hoverId, roundRect, chipRect, paintReference), maths
//   (mathsFor, mathsPin), view (wpx, view, screenToWorld), input (say, flash), text (typeText is not used: core writes).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== What this draws, and the rules it keeps ==============================
  // A fill-in is a value or a mark the maths implies (`maths/fill.ts`): core derives it, says where its words stand
  // and what a tap writes, and this only draws it. The rules are the spec's:
  //   - ON THE CANVAS, where the eye already is: written in the board's text face at the size it will be written at,
  //     muted, in its quantity's colour — never a pill. A mark is dashed. Both are drawn BEFORE the ink, so the ink is
  //     never covered or recoloured.
  //   - WITH THE SELECTION (every fill-in about the marks held), while pointed at, for a moment after it changes,
  //     while *Show the sizes* has pinned it — and, at rest, only the strongest one, quietly, until the hand moves on
  //     (a stroke elsewhere, a pan, a few seconds): CS1's rules, in the one case this lane has.
  //   - PLACED the way the explanation plane places its cards: core's place first, then the nearest place clear of the
  //     ink (the strokes themselves, not their boxes — a diagonal's box is the whole figure) and of the ghosts placed
  //     before it, and clear of a number written there — and a written text must still be READ as the value it is
  //     offered for where it ends up (`fillLandsOnBoard`), or the place is not taken.
  //   - A TAP WRITES IT: one act, one undo, as the hand's own text — which the maths reads back and checks from then on.
  //     On a board set so (`settings.answers === 'wait'`, an event in the log) the ghost shows ? in its colour: the first
  //     tap shows the value (the page's, never logged), the second writes it.
  //   - COLOUR FOR RELATIONS: a soft halo in the quantity's hue lies under the marks it measures while they are held or
  //     pointed at — always on a board set to colour the maths — and behind the number written for it.
  // Everything here is derived from the log: nothing is written but the one text a tap writes, and an undo takes it.

  const FG_MOMENT_MS = 6000;     // how long a changed fill-in shows: the maths chips' moment (MATHS_MS)
  const FG_REST_MS = 20000;      // how long the strongest one keeps showing at rest, unless the hand moves on
  const FG_REST_RANK = 0.75;     // …and how strong a fill-in must be to earn that (a side, a problem; not an area)
  const FG_RINGS = 4;            // how many rings of places round core's the placing tries
  const FG_DIRECTIONS = 12;
  const FG_FACE = '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
  const FG_BASELINE = 0.72;      // where a fitted text's baseline stands in its frame (13-kinds.js writingDocument)

  let fgRead = { key: null, fills: [], byKey: new Map(), board: null, quantities: [], hues: new Map() };
  let fgGen = -1;                          // the board generation the maps below were read under
  let fgSeen = new Map();                  // fill-in key → its text as the log before this one said it
  const fgChangedAt = new Map();           // fill-in key → when its text last changed
  const fgRevealed = new Set();            // keys whose answer a tap has shown (runtime — never logged)
  let fgRest = null;                       // { key, since, view } the strongest fill-in at rest
  let fgHits = [];                         // this paint's ghosts as tap targets, in world units: { key, x, y, w, h, cx, cy, text, waiting }
  let fgDrawn = [];                        // this paint's ghosts, for tests and for the chips that give way: { key, rest, text, cx, cy, w, h, quantity, waiting, hue }
  let fgHalos = [];                        // this paint's halos, for tests: { quantity, kind, hue }
  let fgPlaced = { key: null, map: new Map() };
  let fgTimer = null;
  let fgPaletteKey = null, fgPaletteValue = null; // the palette the canvas is painted on, and its key
  const fgColours = new Map();                    // hue|ground|certainty|palette → the colour, drawn

  // ----- The fill-ins, kept while the log stands -----
  function fgPack(key, s, fills, board) {
    const byKey = new Map(fills.map((f) => [f.key, f]));
    return { key: key, fills: fills, byKey: byKey, board: board, quantities: MM.figureQuantities(board), hues: MM.quantityHuesOfSession(session) };
  }

  function fgFor(s) {
    if (paintReference) return fgPack(null, s, MM.fillInsOf(s), MM.boardMaths(s));
    const key = logKey();
    if (fgRead.key === key) return fgRead;
    const fills = MM.fillInsOfSession(session);
    const rd = fgPack(key, s, fills, MM.boardMathsOf(session));
    const now = nowMs();
    if (s.generation !== fgGen) {
      // A board opened or replaced: nothing on it is new, and nothing revealed on the last one stays so.
      fgGen = s.generation;
      fgChangedAt.clear();
      fgRevealed.clear();
      fgRest = null;
    } else {
      const changed = [];
      for (const f of fills) if (fgSeen.get(f.key) !== f.text) { fgChangedAt.set(f.key, now); changed.push(f); }
      // The strongest of what just changed is the one that stays at rest; a log that changed none of them is the hand moving on.
      const strongest = changed.filter((f) => f.rank >= FG_REST_RANK).sort((a, b) => b.rank - a.rank)[0];
      fgRest = strongest ? { key: strongest.key, since: now, view: { z: view.zoom, x: view.panX, y: view.panY } } : null;
      for (const k of [...fgRevealed]) if (!rd.byKey.has(k)) fgRevealed.delete(k);
      // The moment ends by itself: paint again when it is over, or the ghost would stay until the next stroke.
      if (changed.length) { clearTimeout(fgTimer); fgTimer = setTimeout(() => render(session.getState()), FG_MOMENT_MS + 50); }
    }
    fgSeen = new Map(fills.map((f) => [f.key, f.text]));
    fgRead = rd;
    return rd;
  }

  // ----- Colour -----
  /** A palette whose ground is the one this canvas is painted on, so what is drawn reads on it. */
  function fgPalette() {
    const dark = resolvedTheme() === 'dark';
    const ground = (getComputedStyle(document.documentElement).getPropertyValue('--ground') || '').trim();
    const key = (dark ? 'dark' : 'paper') + ground;
    if (key !== fgPaletteKey) {
      const hex = /^#[0-9a-f]{6}$/i.test(ground) ? ground : null;
      fgPaletteKey = key;
      fgPaletteValue = hex ? MM.makePalette({ grounds: { [dark ? 'dark' : 'paper']: { ground: hex } } }) : MM.DEFAULT_PALETTE;
      fgColours.clear();
    }
    return fgPaletteValue;
  }
  /** The colour of a quantity: `said` (a written value, a halo) or `offered` (a ghost, muted). */
  function fgColour(rd, quantity, certainty) {
    const h = rd.hues.get(quantity);
    const hue = h ? h : { hue: 200, depth: 0 };
    const palette = fgPalette();
    const ground = resolvedTheme() === 'dark' ? 'dark' : 'paper';
    const k = [hue.hue, hue.depth, ground, certainty].join('|');
    let c = fgColours.get(k);
    if (!c) { c = MM.quantityColour(hue, ground, certainty, palette); fgColours.set(k, c); }
    return c;
  }
  const fgRgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; };

  // ----- What is held, pointed at, changed, pinned, at rest -----
  function fgActiveIds(s) {
    const held = new Set(s.selection);
    if (s.summon) for (const id of s.summon.enclosedIds) held.add(id);
    if (hoverId) held.add(hoverId);
    return held;
  }
  const fgSameView = (v) => !!v && v.z === view.zoom && v.x === view.panX && v.y === view.panY;

  /** Whether a fill-in shows now, and why. */
  function fgShownBecause(f, held) {
    if (f.about.some((id) => held.has(id))) return 'held';
    const at = fgChangedAt.get(f.key);
    if (at !== undefined && nowMs() - at < FG_MOMENT_MS) return 'moment';
    if (mathsPin && nowMs() < mathsPin.until && f.about.some((id) => mathsPin.ids.has(id))) return 'pinned';
    if (fgRest && fgRest.key === f.key && nowMs() - fgRest.since < FG_REST_MS && fgSameView(fgRest.view)) return 'rest';
    return null;
  }

  // ----- Placing: clear of the ink, of each other, and where the words would still be read as this value -----
  function fgSegHitsRect(a, b, r) {
    if (Math.max(a.x, b.x) < r.minX || Math.min(a.x, b.x) > r.maxX || Math.max(a.y, b.y) < r.minY || Math.min(a.y, b.y) > r.maxY) return false;
    const inside = (p) => p.x >= r.minX && p.x <= r.maxX && p.y >= r.minY && p.y <= r.maxY;
    if (inside(a) || inside(b)) return true;
    const cross = (p, q, u, v) => {
      const d = (q.x - p.x) * (v.y - u.y) - (q.y - p.y) * (v.x - u.x);
      if (Math.abs(d) < 1e-12) return false;
      const t = ((u.x - p.x) * (v.y - u.y) - (u.y - p.y) * (v.x - u.x)) / d;
      const w = ((u.x - p.x) * (q.y - p.y) - (u.y - p.y) * (q.x - p.x)) / d;
      return t >= 0 && t <= 1 && w >= 0 && w <= 1;
    };
    const A = { x: r.minX, y: r.minY }, B = { x: r.maxX, y: r.minY }, Cc = { x: r.maxX, y: r.maxY }, D = { x: r.minX, y: r.maxY };
    return cross(a, b, A, B) || cross(a, b, B, Cc) || cross(a, b, Cc, D) || cross(a, b, D, A);
  }
  function fgPolyHitsRect(pts, r) {
    for (let i = 1; i < pts.length; i++) if (fgSegHitsRect(pts[i - 1], pts[i], r)) return true;
    return false;
  }

  /** The ink and the things near a window that a ghost must not lie on: strokes as their lines, artifacts as their boxes. */
  function fgObstaclesNear(s, ix, win) {
    const ids = ix && !paintReference
      ? ix.paint.query(win).filter((id) => ix.contentAt.has(id))
      : s.contentIds;
    const out = [];
    for (const id of ids) {
      const n = s.nodes.get(id);
      if (!n) continue;
      if (s.artifacts.includes(id)) {
        if (MM.pictureOf(n)) continue; // a picture is the ground the figure stands on
        const b = MM.boundsOf(n);
        if (b && boxMeets(b, win)) out.push({ id: id, box: b });
        continue;
      }
      const pts = MM.standingPointsOf(n);
      if (pts && pts.length >= 2) { const b = pointsBox(pts); if (b && boxMeets(b, win)) out.push({ id: id, pts: pts, box: b }); }
      else { const b = MM.boundsOf(n); if (b && boxMeets(b, win)) out.push({ id: id, box: b }); }
    }
    return out;
  }

  /** The standing chips (a label that cannot hold, a step that is off), as boxes: a ghost stays off them. */
  function fgChipBoxes() {
    const out = [];
    for (const c of mathsFor(session.getState()).chips) {
      if (!c.standing || c.from) continue;
      const size = chipRect(c.text, 0, 0);
      const left = c.align === 'left' ? c.at.x : c.at.x - size.w / 2;
      out.push({ minX: left, minY: c.at.y - size.h / 2, maxX: left + size.w, maxY: c.at.y + size.h / 2 });
    }
    return out;
  }

  /**
   * Where each shown fill-in stands: core's place, else the nearest ring of places round it that lies on no ink, no
   * written number, no ghost placed before it, and — for words that will be written — where they would still be read
   * as the value they are offered for. Strongest first, as the explanation plane places its cards. Kept while the
   * log and the set of ghosts stand.
   */
  function fgPlaceAll(s, ix, rd, shown) {
    const key = logKey() + '|' + view.zoom + '|' + shown.map((g) => g.f.key + ':' + g.f.text).join(',');
    if (!paintReference && fgPlaced.key === key) return fgPlaced.map;
    const chips = fgChipBoxes();
    const taken = [];
    const map = new Map();
    const order = shown.slice().sort((a, b) => b.f.rank - a.f.rank || (a.f.key < b.f.key ? -1 : 1));
    for (const g of order) {
      const f = g.f;
      const fs = MM.fillFontSize(s, f);
      const box = MM.textBoxOf(f.text, fs);
      const A = box.w * box.h;
      const step = box.h * 1.1;
      const reach = FG_RINGS * step * 1.3 + box.w;
      const win = { minX: f.at.x - reach, minY: f.at.y - reach, maxX: f.at.x + reach, maxY: f.at.y + reach };
      const near = fgObstaclesNear(s, ix, win);
      const cands = [{ x: f.at.x, y: f.at.y, k: 0 }];
      for (let ring = 1; ring <= FG_RINGS; ring++) {
        for (let d = 0; d < FG_DIRECTIONS; d++) {
          const a = (d / FG_DIRECTIONS) * Math.PI * 2;
          cands.push({ x: f.at.x + Math.cos(a) * ring * step * 1.3, y: f.at.y + Math.sin(a) * ring * step, k: ring });
        }
      }
      const costOf = (c) => {
        const r = { minX: c.x - box.w / 2, maxX: c.x + box.w / 2, minY: c.y - box.h / 2, maxY: c.y + box.h / 2 };
        const pad = { minX: r.minX - 1, maxX: r.maxX + 1, minY: r.minY - 1, maxY: r.maxY + 1 };
        let cost = 0;
        for (const t of taken) cost += overlapArea(rectOf(pad), rectOf(t)) * 24;
        for (const o of near) {
          if (!boxMeets(o.box, pad)) continue;
          if (o.pts) { if (fgPolyHitsRect(o.pts, pad)) cost += A; }
          else cost += overlapArea(rectOf(pad), rectOf(o.box));
        }
        for (const cb of chips) cost += overlapArea(rectOf(pad), rectOf(cb));
        return cost + c.k * A * 0.02;
      };
      const ranked = cands.map((c) => ({ c: c, cost: costOf(c) })).sort((a, b) => a.cost - b.cost || a.c.k - b.c.k);
      let pick = null;
      for (const r of ranked) {
        // The words that will be written must still be read as this value there; core's own place always is.
        if (f.take.kind === 'text' && r.c.k > 0 && !MM.fillLandsOnBoard(rd.board, f, { x: r.c.x, y: r.c.y })) continue;
        pick = r;
        break;
      }
      if (!pick) pick = { c: cands[0], cost: 0 };
      const spot = { cx: pick.c.x, cy: pick.c.y, w: box.w, h: box.h, fs: fs };
      map.set(f.key, spot);
      taken.push({ minX: spot.cx - spot.w / 2, maxX: spot.cx + spot.w / 2, minY: spot.cy - spot.h / 2, maxY: spot.cy + spot.h / 2 });
    }
    if (!paintReference) fgPlaced = { key: key, map: map };
    return map;
  }

  // ----- Drawing -----
  /** A soft halo along what a quantity measures, in its colour: a side's line, an angle's wedge. Whole outlines are not haloed (they lie on every side). */
  function fgHalo(rd, q, strong) {
    const pts = q.points;
    if (!pts || (pts.length !== 2 && pts.length !== 3) || q.closed) return false;
    const c = fgColour(rd, q.quantity, q.from === 'derived' || q.from === 'ink' ? 'offered' : 'said');
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (pts.length === 2) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.lineWidth = wpx(strong ? 9 : 7);
      ctx.strokeStyle = fgRgba(c.hex, strong ? 0.26 : 0.2);
      ctx.stroke();
    } else {
      const v = pts[1], a1 = Math.atan2(pts[0].y - v.y, pts[0].x - v.x), a2 = Math.atan2(pts[2].y - v.y, pts[2].x - v.x);
      let d = a2 - a1;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      const r = Math.min(wpx(36), 0.3 * Math.min(Math.hypot(pts[0].x - v.x, pts[0].y - v.y), Math.hypot(pts[2].x - v.x, pts[2].y - v.y)));
      ctx.beginPath();
      ctx.moveTo(v.x, v.y);
      ctx.arc(v.x, v.y, r, a1, a1 + d, d < 0);
      ctx.closePath();
      ctx.fillStyle = fgRgba(c.hex, strong ? 0.26 : 0.2);
      ctx.fill();
      ctx.lineWidth = wpx(1.5);
      ctx.strokeStyle = fgRgba(c.hex, 0.55);
      ctx.stroke();
    }
    ctx.restore();
    return true;
  }

  /** A soft box behind a number the quantity is written as: the colour of the value, under words that are not ink. */
  function fgNumberHalo(rd, s, q) {
    const c = fgColour(rd, q.quantity, 'said');
    let any = false;
    for (const id of q.numberIds) {
      const n = s.nodes.get(id);
      const b = n && MM.boundsOf(n);
      if (!b) continue;
      const p = wpx(3);
      roundRect(b.minX - p, b.minY - p, b.maxX - b.minX + p * 2, b.maxY - b.minY + p * 2, wpx(5));
      ctx.fillStyle = fgRgba(c.hex, 0.16);
      ctx.fill();
      any = true;
    }
    return any;
  }

  /** A fill-in that is a mark: its points, dashed and muted, beneath the ink. */
  function fgMark(rd, f) {
    if (f.kind !== 'mark' || !f.points || f.points.length < 2) return;
    const c = fgColour(rd, f.quantity, 'offered');
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(f.points[0].x, f.points[0].y);
    for (let i = 1; i < f.points.length; i++) ctx.lineTo(f.points[i].x, f.points[i].y);
    if (f.closed) ctx.closePath();
    ctx.setLineDash(f.dashed === false ? [] : [wpx(5), wpx(5)]);
    ctx.lineWidth = wpx(1.8);
    ctx.lineCap = 'round';
    ctx.strokeStyle = fgRgba(c.hex, 0.85);
    ctx.stroke();
    ctx.restore();
    if (paintOps) { const b = pointsBox(f.points); recordOp({ kind: 'ghost', id: f.key, text: 'mark', box: boxOfRect(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY), moved: false }); }
  }

  function renderFillGhosts(s, ix, vb) {
    fgDrawn = [];
    fgHits = [];
    fgHalos = [];
    const rd = fgFor(s);
    if (!rd.fills.length && !rd.quantities.length) return;
    // A held selection mid-drag moves before the log has it: its ghosts would stay behind, so they wait for the drop.
    if (dragPreview()) return;
    const held = fgActiveIds(s);
    const always = s.settings.colour === 'always';
    const waits = s.settings.answers === 'wait';

    // The quantities' halos: under the marks they measure while those are held or pointed at — always on a board set to colour the maths.
    for (const q of rd.quantities) {
      if (!always && !q.about.some((id) => held.has(id))) continue;
      const drew = fgHalo(rd, q, q.about.some((id) => held.has(id)));
      const drewNumber = fgNumberHalo(rd, s, q);
      if (drew || drewNumber) {
        fgHalos.push({ quantity: q.quantity, key: q.key, from: q.from, hue: (rd.hues.get(q.quantity) || {}).hue });
        if (paintOps) {
          const b = q.points.length ? pointsBox(q.points) : null;
          if (b) recordOp({ kind: 'halo', id: q.quantity, text: q.key, box: boxOfRect(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY), moved: false });
        }
      }
    }

    // The ghosts.
    const shown = [];
    for (const f of rd.fills) {
      const why = fgShownBecause(f, held);
      if (why) shown.push({ f: f, why: why });
    }
    if (!shown.length) return;
    const place = fgPlaceAll(s, ix, rd, shown);
    for (const g of shown) {
      const f = g.f;
      if (f.kind === 'mark') { fgMark(rd, f); continue; }
      const spot = place.get(f.key);
      if (!spot) continue;
      const waiting = waits && f.answer && !fgRevealed.has(f.key) && !(mathsPin && nowMs() < mathsPin.until && f.about.some((id) => mathsPin.ids.has(id)));
      const text = waiting ? '?' : f.text;
      const left = spot.cx - spot.w / 2, top = spot.cy - spot.h / 2;
      const reachBox = { minX: left, minY: top, maxX: left + spot.w, maxY: top + spot.h };
      fgDrawn.push({ key: f.key, rest: f.key.slice('figure:'.length), why: g.why, text: text, cx: spot.cx, cy: spot.cy, w: spot.w, h: spot.h, quantity: f.quantity, waiting: waiting, hue: (rd.hues.get(f.quantity) || {}).hue });
      // A tap target at least as big as a fingertip.
      const hw = Math.max(spot.w + wpx(10), wpx(34)), hh = Math.max(spot.h + wpx(8), wpx(28));
      fgHits.push({ key: f.key, x: spot.cx - hw / 2, y: spot.cy - hh / 2, w: hw, h: hh, cx: spot.cx, cy: spot.cy, text: text, waiting: waiting });
      if (vb && !boxMeets(reachBox, vb)) continue;
      const c = fgColour(rd, f.quantity, 'offered');
      ctx.save();
      ctx.font = spot.fs.toFixed(3) + 'px ' + FG_FACE;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      const w1 = ctx.measureText(text).width;
      const x = waiting ? spot.cx - w1 / 2 : left, base = top + spot.h * FG_BASELINE;
      ctx.lineJoin = 'round';
      ctx.lineWidth = spot.fs * 0.22;
      ctx.strokeStyle = C.haloText;
      ctx.strokeText(text, x, base);
      ctx.fillStyle = fgRgba(c.hex, 0.92);
      ctx.fillText(text, x, base);
      ctx.restore();
      if (paintOps) recordOp({ kind: 'ghost', id: f.key, text: text, box: boxOfRect(left, top, spot.w, spot.h), moved: false });
    }
  }

  // ----- The tap -----
  /** The ghost under a world point, else null. */
  function fgAt(w) {
    for (let i = fgHits.length - 1; i >= 0; i--) {
      const h = fgHits[i];
      if (w.x >= h.x && w.x <= h.x + h.w && w.y >= h.y && w.y <= h.y + h.h) return h;
    }
    return null;
  }

  /**
   * A tap on a ghost. An answer that waits is shown first (the page's, never logged); the next tap — or the first, on
   * a board that shows its answers — writes it: one act stamped with the tool and the offer, so one undo takes it
   * back, the text centred where the ghost stood so the maths reads it as the value it was offered for. A fill-in
   * that writes nothing says why.
   */
  function fgTake(hit) {
    const s = session.getState();
    const rd = fgFor(s);
    const f = rd.byKey.get(hit.key);
    if (!f) return false;
    if (s.settings.answers === 'wait' && f.answer && !fgRevealed.has(f.key)) {
      fgRevealed.add(f.key);
      fgPlaced = { key: null, map: new Map() };
      say(f.text + ' — ' + f.reason + ' · tap it again to write it');
      render(s);
      return true;
    }
    if (f.take.kind === 'none') { flash(f.take.why); return true; }
    const centre = { x: hit.cx, y: hit.cy };
    if (f.take.kind === 'text' && !MM.fillLandsOnBoard(rd.board, f, centre)) {
      // Where the ghost was nudged to it would not be read as this value: write it where core stood it.
      centre.x = f.at.x; centre.y = f.at.y;
    }
    const n0 = session.getEvents().length;
    session.withTool(MM.FILL_TOOL, () => MM.writeFillIn(session, f, Date.now(), centre), f.key);
    if (session.getEvents().length > n0) flash('wrote ' + (f.take.kind === 'text' ? '“' + f.take.text + '”' : 'it') + ' — the maths reads it from now on; undo takes it back');
    return true;
  }

  /**
   * The fill-in that says what an M5 answer chip says (25-maths.js): a derived side or a measure below its figure is
   * `side:<figure>:<key>` or `measure:<figure>:<key>` to the chip and `figure:<figure>:<key>` to the fill-in. Null for
   * a chip that is a problem, a step or a scale; else the fill-in and the ghost drawn for it this paint, if any.
   */
  function fgCovers(s, chip) {
    const m = /^(side|measure):(.*)$/.exec(chip.key);
    if (!m) return null;
    const f = fgFor(s).byKey.get('figure:' + m[2]);
    if (!f) return null;
    return { fill: f, drawn: fgDrawn.find((g) => g.rest === m[2]) || null };
  }

  /** Whether any of these marks has an answer a ghost would give — the panel keeps those back on a board that waits. */
  function fgHasAnswers(s, ids) {
    const held = new Set(ids);
    return fgFor(s).fills.some((f) => f.answer && f.about.some((id) => held.has(id)));
  }

  /** The moment is over: only what is held, pointed at, pinned or strongest at rest shows. For tests. */
  function fgSettle() { fgChangedAt.clear(); fgRest = null; fgPlaced = { key: null, map: new Map() }; }

  // ===== The board's line: its settings, when nothing is held =====
  // The same two settings the field types (tools/fill.ts), for the hand with nothing held: where a board has maths, or
  // a setting that is not the default, the foot of the panel says what this board does and offers to change it. A
  // setting is an event: one tap, one undo.
  function boardSettingsHtml(s) {
    if (s.summon) return '';
    const st = s.settings;
    const maths = !!MM.boardMathsOf(session);
    if (!maths && st.answers === 'show' && st.colour === 'pointed') return '';
    let html = '<div class="sep"></div><div class="eyebrow">this board</div>';
    html += '<div class="row"><span class="k">answers</span><span class="v">' + (st.answers === 'wait' ? 'wait — a ghost shows ? until it is tapped' : 'show') + '</span></div>' +
      '<div class="acts"><button class="mini" type="button" data-board-setting="answers:' + (st.answers === 'wait' ? 'show' : 'wait') + '" title="' +
      (st.answers === 'wait' ? 'show each answer a ghost would give' : 'each answer a ghost would give stands as a ? until it is tapped — the first tap shows it, the second writes it') + '">' +
      (st.answers === 'wait' ? 'show the answers' : 'the answer waits') + '</button></div>';
    html += '<div class="row"><span class="k">colour</span><span class="v">' + (st.colour === 'always' ? 'the maths is coloured at rest' : 'the maths is coloured when pointed at') + '</span></div>' +
      '<div class="acts"><button class="mini" type="button" data-board-setting="colour:' + (st.colour === 'always' ? 'pointed' : 'always') + '" title="a quantity’s colour shows on its figure ' +
      (st.colour === 'always' ? 'only while its marks are held or pointed at' : 'at rest, not only while its marks are held or pointed at') + '">' +
      (st.colour === 'always' ? 'colour only when pointed at' : 'colour the maths') + '</button></div>';
    return html;
  }
  inspectorEl.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('button[data-board-setting]');
    if (!b) return;
    const [key, value] = b.dataset.boardSetting.split(':');
    const refused = session.setting(key, value, Date.now());
    if (refused) { flash(refused); return; }
    flash(key === 'answers' ? (value === 'wait' ? 'this board is set to teach — each answer shows ? until it is tapped; undo takes it back' : 'this board shows its answers again; undo takes it back')
      : (value === 'always' ? 'this board colours the maths at rest; undo takes it back' : 'this board colours the maths when pointed at; undo takes it back'));
  });

  // ===== For the e2e ========================================================
  window.__mmGhosts = {
    // What the last paint drew: each ghost, where it stands (its centre in world units), what it says, and whether it waits.
    drawn: () => fgDrawn.map((g) => Object.assign({}, g)),
    hits: () => fgHits.map((h) => Object.assign({}, h)),
    halos: () => fgHalos.map((h) => Object.assign({}, h)),
    // The fill-ins the log gives, as the page reads them: their key, words, quantity, strength and what a tap writes.
    fills: () => fgFor(session.getState()).fills.map((f) => ({ key: f.key, text: f.text, quantity: f.quantity, rank: f.rank, kind: f.kind, take: f.take.kind, answer: f.answer, reason: f.reason, at: f.at })),
    hues: () => [...MM.quantityHuesOfSession(session)].map(([quantity, h]) => ({ quantity: quantity, hue: h.hue, source: h.source, role: h.role || null, channel: h.channel })),
    revealed: () => [...fgRevealed],
    // The moment is over: only what stands, what the hand is on and what was asked for shows.
    settle: () => { fgSettle(); render(session.getState()); },
    at: (x, y) => { const h = fgAt({ x: x, y: y }); return h ? Object.assign({}, h) : null; },
  };

// ===== hand (the rules) =====
// Provides: the hand's rules for pen, finger and palm, pure (V1-PLAN R6) — handOfPointer (which
//   hand a pointer is, by its pointerType), fingerRole (what a finger that lands on the board
//   does), palmNow (whether a touch now is a palm), whenPenLands (what the fingers already down
//   become when a pen comes down, and which pan is put back), handFace and nextHand (the hand
//   tile's face and its cycle), and the two numbers they stand on (PALM_MS, PAN_SLOP_PX).
// Uses: NOTHING. Like 09-field.js, this fragment names no closure variable, touches no DOM and
//   asks the session nothing; 07-input.js is the adapter that gathers a record, asks, and acts.
//   So it loads on its own in Node, which is how it is tested:
//     node --test Demos/surface/07-hand.test.mjs
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.
//
// THE RULES (CLAUDE.md, "Pen, finger and palm")
//   - Decide by pointerType, never by the user agent: iPadOS reports a pencil as `pen` and a
//     finger as `touch`; a desktop test synthesises both, and a mouse is anything else — a
//     `mouse`, or the empty type a synthesised event carries — and is never touched by these.
//   - Before any pen has been seen on this device, today's rule stands: one finger draws, two
//     pinch and pan.
//   - Once a pen has been seen (said once, and held as a preference the hand tile shows), the
//     pen draws and a finger pans; two fingers pinch. The tile can give the finger its ink back.
//   - A palm: a touch that lands while a pen is on the glass, or within PALM_MS of the pen's
//     last event anywhere on the page — down, moving, hovering, lifted — does nothing for its
//     whole life, whichever the preference. And a pen coming down makes every finger already
//     down a palm; one that landed within PALM_MS before it was the palm arriving first, so the
//     pan it made is put back.

  /** A touch within this long of the pen's last event is a palm. Long enough for a heel that comes down as the pencil lifts between words; short enough that a finger meant to pan, once the pencil is put down, is a finger. */
  const PALM_MS = 500;
  /** A finger that pans must first move this far, in screen pixels; short of it, it is a tap. */
  const PAN_SLOP_PX = 6;

  /** Which hand a pointer is: 'pen', 'finger', or 'mouse' — the last is anything that is not the first two. */
  function handOfPointer(pointerType) {
    return pointerType === 'pen' ? 'pen' : pointerType === 'touch' ? 'finger' : 'mouse';
  }

  /**
   * Is a touch now a palm?
   * @param {{penDown:boolean, sincePen:number}} h  a pen on the glass; ms since the pen's last event (Infinity if never)
   */
  function palmNow(h) {
    return !!h.penDown || h.sincePen < PALM_MS;
  }

  /**
   * What a finger that lands on the board does.
   * @param {{draws:('pen'|'finger'|null), penDown:boolean, sincePen:number, fingers:number}} h
   *   draws — the preference: null until a pen has been seen on this device;
   *   penDown, sincePen — as palmNow;
   *   fingers — the fingers already down that are drawing, panning or pinching (not palms, not resting).
   * @returns {{role:('palm'|'extra'|'pinch'|'pan'|'draw'), why:string}}
   *   palm — nothing, for its whole life; extra — a third finger, nothing; pinch — with the
   *   finger already down, the view zooms and pans; pan — one finger moves the view (short of
   *   PAN_SLOP_PX it is a tap); draw — today's rule, the ink path.
   */
  function fingerRole(h) {
    if (h.penDown) return { role: 'palm', why: 'a pen is on the glass' };
    if (h.sincePen < PALM_MS) return { role: 'palm', why: 'the pen was here ' + Math.max(0, Math.round(h.sincePen)) + ' ms ago' };
    if (h.fingers >= 2) return { role: 'extra', why: 'two fingers are already down' };
    if (h.fingers === 1) return { role: 'pinch', why: 'a second finger: the two pinch and pan' };
    if (h.draws === 'pen') return { role: 'pan', why: 'the pen draws; a finger moves the view' };
    return { role: 'draw', why: h.draws === 'finger' ? 'a finger draws, by the hand tile' : 'no pen seen here yet: a finger draws' };
  }

  /**
   * A pen comes down: every finger down is a palm from now on, and the one that landed a moment
   * before the pen — the heel arriving first — has what it moved put back.
   * @param {Array<{id:*, role:string, at:number, moved:boolean}>} fingers  the fingers down, in the order they landed
   * @param {number} now  when the pen came down, on the same clock as `at`
   * @returns {{palms:Array<*>, putBack:(*|null)}}  the ids that become palms, and whose view to restore (the earliest such finger's), or null
   */
  function whenPenLands(fingers, now) {
    const palms = [];
    let putBack = null, at = Infinity;
    for (const f of fingers) {
      if (f.role === 'palm') continue;
      palms.push(f.id);
      if (now - f.at < PALM_MS && f.moved && (f.role === 'pan' || f.role === 'pinch') && f.at < at) { putBack = f.id; at = f.at; }
    }
    return { palms: palms, putBack: putBack };
  }

  /** The hand tile's face: the side the field opens on, and — once a pen has been seen — what draws. */
  function handFace(side, draws) {
    return draws ? side + ' · ' + draws : side;
  }

  /**
   * The hand tile's next state. Until a pen has been seen it flips the side, as it always did.
   * After, one word of the face changes a tap — right · pen, right · finger, left · finger,
   * left · pen — so the pen and the finger are one tap apart from where most hands start.
   */
  function nextHand(side, draws) {
    if (!draws) return { side: side === 'left' ? 'right' : 'left', draws: null };
    const ring = [['right', 'pen'], ['right', 'finger'], ['left', 'finger'], ['left', 'pen']];
    const i = ring.findIndex((r) => r[0] === side && r[1] === draws);
    const next = ring[(i + 1) % ring.length];
    return { side: next[0], draws: next[1] };
  }

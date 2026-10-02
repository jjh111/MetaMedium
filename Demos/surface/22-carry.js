// ===== carry (the window, the messages) =====
// Provides: carrying every board this browser keeps from the old address to the new home (RENAME-PLAN N1) — the
//   adapter over 17-carry.js's rules: carryHere (what this page may do: its target, the offer, the notice), carryOut
//   (the tap — a window opened inside it, before anything is awaited — and carrySend: the boards sent once the window
//   says it is ready, its answer said in the boards pane), everyOut (every board out in one file, downloaded),
//   carryReceive (a page opened with ?carry: it says it is ready to the origins it takes boards from, takes them in,
//   says what came and answers with the counts; a message from anywhere else is refused, once, out loud), carryTake (one
//   carry taken in — from a window or from a file — and noted), homeNoticeOnce (the notice said once in the status
//   line), carryAtBoot, and `carry` (what the page has carried and heard, for the boards pane and the tests).
// Uses: core (params, prefs), carry's rules (17-carry.js), folder (carryIn, boardsListed, onBoardHere), the board out
//   (everyBoardsOut, downloadBlob, plural; 18-out.js), the boards pane (paneSay, renderBoardsPane, boardsPanel), input (say).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.
//
// THE TWO WINDOWS. The old address's page opens the new home's app with `?carry` in a window of its own — inside the
// tap's own handler, or the browser refuses the window — and listens for that window, and only it, at the target's
// origin. The new page, once its boards are open, says it is ready to the origins it takes boards from (a fixed list;
// postMessage always with a target origin, never '*'), and to a ping from one of them. The old page then sends ONE
// message: every board in one file as bytes, transferred, not copied. The new page takes it in (17-folder.js's
// carryIn), says what came in its status line, and answers with three counts — never a name it holds. A window the
// browser would not open, one that never answers, one closed half way: each is a sentence in the boards pane, with the
// way that always works — *Every board out*, then *From a file…* there.

  /** How long the old page waits for the new one to say it is ready, and for it to say what it kept. */
  const CARRY_READY_MS = 45000, CARRY_DONE_MS = 600000;
  const carry = {
    // The receiving side: whom it takes boards from, its opener, carries taken in, what it said, origins refused.
    allowed: [], opener: null, readyFor: false, busy: false, carried: 0, words: '', last: null, refused: [],
    // The sending side: a carry under way, carries answered, what was said.
    job: null, sending: false, sent: 0, sentWords: '',
    // For tests: the notice shown as N4 will show it, on a page that is not the old address.
    noticeForced: false,
  };

  /** What this page may do: where it carries to, whether the pane offers it, whether the notice shows. */
  function carryHere() {
    const self = location.origin;
    const target = carryTarget(self, params.get('carryTo'));
    const notice = homeNoticeShown(self, NEW_HOME_NOTICE) || carry.noticeForced;
    return { self: self, target: target, notice: notice, offered: carryOffered({ target: target, notice: notice, asked: params.has('carryTo') }) };
  }
  /** A sentence about a carry begun in the boards pane: in the pane while it stands open, else in the status line. */
  function carrySay(words) {
    if (boardsPanel && !boardsPanel.hasAttribute('hidden')) paneSay(words);
    else say(words, 12000);
  }

  // ----- The sending side: the old address ---------------------------------------------------------------
  /**
   * The tap. The window is opened here, synchronously, inside the click that asked for it — a window opened after an
   * await is a popup the browser blocks — and everything else follows it.
   */
  function carryOut() {
    const h = carryHere();
    if (!h.target) return;
    const where = carryWhere(h.target);
    if (carry.sending) { carrySay('the boards are already on their way to ' + where + ' — its window says what it kept'); return; }
    let w = null;
    try { w = window.open(carryOpenUrl(h.self, h.target), '_blank'); } catch (err) { w = null; }
    if (!w) {
      carrySay('the browser would not open a window for ' + where + ' — nothing was carried. Every board out makes one file of them all, and From a file… on ' + where + ' opens it');
      return;
    }
    carrySend(w, h.target);
  }
  /** Gather every board while the window opens; send them once it says it is ready; say what it answered. */
  async function carrySend(w, target) {
    const where = carryWhere(target);
    const job = { ready: false, file: null, posted: false, count: 0 };
    carry.job = job;
    carry.sending = true;
    carrySay('opening ' + where + ' and gathering the boards…');
    let settle;
    const finished = new Promise((r) => { settle = r; });
    const post = () => {
      if (!job.ready || !job.file || job.posted) return;
      job.posted = true;
      const buf = job.file.buffer;
      try { w.postMessage({ type: CARRY_TYPES.boards, v: CARRY_V, file: buf }, target, [buf]); }
      catch (err) { settle({ failed: 'the boards could not be sent — ' + ((err && err.message) || err) }); return; }
      carrySay('sending ' + plural(job.count, 'board') + ' to ' + where + '…');
      clearTimeout(readyBy);
      doneBy = setTimeout(() => settle({ late: true }), CARRY_DONE_MS);
    };
    const heard = (e) => {
      if (e.source !== w || e.origin !== target) return;
      const m = carryMessage(e.data);
      if (!m) return;
      if (m.type === CARRY_TYPES.ready) { job.ready = true; post(); }
      else if (m.type === CARRY_TYPES.done && job.posted) settle({ done: m });
    };
    // Listening from the tap on, so the window's first word cannot come before it. A window closed by hand is noticed.
    addEventListener('message', heard);
    const watch = setInterval(() => { if (w.closed) settle({ closed: true }); }, 400);
    const readyBy = setTimeout(() => { if (!job.ready) settle({ silent: true }); }, CARRY_READY_MS);
    let doneBy = 0;
    everyBoardsOut().then((out) => {
      if (!out.count) { settle({ nothing: true }); return; }
      job.file = out.bytes;
      job.count = out.count;
      post();
    }, (err) => settle({ failed: 'the boards could not be gathered — ' + ((err && err.message) || err) }));
    const r = await finished;
    removeEventListener('message', heard);
    clearInterval(watch);
    clearTimeout(readyBy);
    clearTimeout(doneBy);
    let words;
    if (r.done) {
      carry.sent++;
      words = carrySentWords({ target: target, brought: r.done.brought, held: r.done.held, failed: r.done.failed }) + (r.done.brought ? ' — they are open there' : '');
    } else if (r.closed) words = job.posted ? 'the window on ' + where + ' was closed before it said what it kept — open boards there to see' : 'the window on ' + where + ' was closed before the boards were sent — nothing was carried';
    else if (r.silent) words = where + ' did not answer — nothing was carried. Every board out makes one file of them all, and From a file… on ' + where + ' opens it';
    else if (r.late) words = where + ' has not said what it kept — open boards there to see';
    else if (r.nothing) words = 'there is nothing to carry — no board here has anything on it';
    else words = r.failed;
    carry.sentWords = words;
    carry.job = null;
    carry.sending = false;
    carrySay(words);
  }

  /** *Every board out*: every board in one file, downloaded — the way that works offline, between devices, and where a window is refused. */
  async function everyOut() {
    carrySay('gathering every board…');
    try {
      const out = await everyBoardsOut();
      if (!out.count) { carrySay('there is nothing to take out — no board here has anything on it'); return; }
      downloadBlob(out.name, new Blob([out.bytes], { type: 'application/zip' }));
      const also = [out.pictures ? plural(out.pictures, 'picture') : '', out.mark ? 'your mark' : '', out.prefs ? plural(out.prefs, 'preference') : ''].filter(Boolean);
      const left = [];
      if (out.empty) left.push(plural(out.empty, 'empty board') + ' left out');
      if (out.trash) left.push('the trash stays here');
      if (out.missing) left.push(plural(out.missing, 'picture') + ' this device does not hold could not be put in');
      for (const f of out.failed) left.push('“' + f.name + '” could not be read (' + f.why + ')');
      carrySay(out.name + ' — ' + plural(out.count, 'board') + (also.length ? ' with ' + (also.length > 1 ? also.slice(0, -1).join(', ') + ' and ' + also[also.length - 1] : also[0]) : '') +
        ' in one file; From a file… opens it on any address' + (left.length ? ' · ' + left.join(' · ') : ''));
    } catch (err) {
      carrySay('the boards could not be taken out — ' + ((err && err.message) || err));
    }
  }

  // ----- The receiving side: the new home ------------------------------------------------------------------
  /** One carry taken in — from the window (`from` its origin) or a file ('file') — noted, and its sentence made. */
  async function carryTake(bytes, from, o) {
    carry.busy = true;
    let r;
    try { r = await carryIn(bytes, o); } catch (err) { r = { ok: false, words: 'the boards could not be taken in — ' + ((err && err.message) || err) }; }
    finally { carry.busy = false; }
    if (r.ok) r.words = carryWords({ from: from, brought: r.brought, held: r.held, failed: r.failed, damaged: r.damaged, mark: r.mark, prefs: r.prefs, emptied: r.emptied });
    carry.carried++;
    carry.words = r.words;
    carry.last = r.ok ? { brought: r.brought.length, held: r.held.length, failed: r.failed.length } : { brought: 0, held: 0, failed: 1 };
    return r;
  }
  /** A page opened with ?carry: listen for the old address, say it is ready once the boards are open. */
  function carryReceive() {
    carry.allowed = carrySources(location.origin, params.get('carry'));
    carry.opener = window.opener || null;
    addEventListener('message', carryHeard);
    if (!carry.allowed.length) { say('this is the old address — it carries boards to the new home, and takes none'); return; }
    if (!carry.opener) {
      say('this page takes the boards when the old address opens it — tap Carry my boards to dyna.ink in its boards pane, or bring them in a file: Every board out there, From a file… here', 20000);
      return;
    }
    // Ready is said to the one origin this page expects its boards from — the one its address names on this machine,
    // else the old address — so it is never posted to a window at another; a ping from any it takes them from is answered.
    const expected = carry.allowed[carry.allowed.length - 1];
    carryWhenOpen().then(() => {
      carryReady(expected);
      // Said once the board is back (after its own "is back"), unless the boards have come already.
      if (!carry.carried && !carry.busy) say('waiting for your boards from ' + carryWhere(expected) + '…', 20000);
    });
  }
  /** The boards this browser keeps, open — a carry is written into the list. */
  function carryWhenOpen() { return (boardsListed || Promise.resolve()).catch(() => {}); }
  /** Tell the opener, at one origin, that this page is ready: an explicit target origin, never '*'. */
  function carryReady(origin) {
    try { carry.opener.postMessage({ type: CARRY_TYPES.ready, v: CARRY_V }, origin); } catch (err) { /* the opener is gone */ }
    carry.readyFor = true;
  }
  /** A message: ours, from the opener, at an origin this page takes boards from — or refused, and said once. */
  async function carryHeard(e) {
    const m = carryMessage(e.data);
    if (!m || (m.type !== CARRY_TYPES.boards && m.type !== CARRY_TYPES.ping)) return;
    if (!carry.opener || e.source !== carry.opener || !carryAccepts(carry.allowed, e.origin)) {
      if (!carry.refused.includes(e.origin)) {
        carry.refused.push(e.origin);
        say('boards offered from ' + carryWhere(e.origin) + ' were refused — this page takes them only from the old address', 20000);
      }
      return;
    }
    await carryWhenOpen();
    if (m.type === CARRY_TYPES.ping) { carryReady(e.origin); return; }
    if (carry.busy) return;
    const r = await carryTake(new Uint8Array(m.file), e.origin, {});
    say(r.words, 60000);
    try { e.source.postMessage({ type: CARRY_TYPES.done, v: CARRY_V, brought: carry.last.brought, held: carry.last.held, failed: carry.last.failed }, e.origin); } catch (err) { /* the old page is gone; its boards are here */ }
  }

  // ----- The notice: dyna.ink is the new home (off until RENAME-PLAN N4) -------------------------------------
  const HOME_SAID_KEY = 'home-said';
  /** The status line says it once on this device, after the board has come back and said so. */
  function homeNoticeOnce() {
    if (!carryHere().notice || prefs.get(HOME_SAID_KEY, null)) return;
    carryWhenOpen().then(() => setTimeout(() => {
      if (prefs.get(HOME_SAID_KEY, null)) return;
      prefs.set(HOME_SAID_KEY, Date.now());
      say('dyna.ink is this app’s new home — boards ▸ Carry my boards to dyna.ink takes everything kept here with you', 20000);
    }, 1800));
  }
  /** At boot: a page asked to take boards listens for them; the old address says it is not the home any more, once. */
  function carryAtBoot() {
    if (EMBED) return;
    if (params.has('carry')) carryReceive();
    homeNoticeOnce();
  }

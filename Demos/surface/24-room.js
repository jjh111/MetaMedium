// ===== room =====
// Provides: a room anyone opens and shares, on the surface (the rooms lane: MU-1 to MU-4, MU-9, UX-01, UX-05) —
//   renderLivePane (the Live pane's first rows: "Share this board", or, in a room, who is here, "Copy invite link",
//   "Save a copy to my boards" and "Leave"), shareBoard (a room opened on the relay, the board on screen carried in),
//   copyInvite, leaveLiveRoom, saveRoomCopy, joinFromAddress (a page opened on a room's address: a guest who came by an
//   invite with no name kept is asked one, then joins; an old link's ?key= is moved into the fragment as it joins),
//   joinTyped (the pane's Join: a room's name, or an invite link pasted), syncRoomChip (the chip in the bar: the room
//   and one dot per hand heard, in its colour), liveRoomOpened (who is here followed; this hand said to be here every
//   ROOM_BEAT_MS while the page is seen, and a goodbye when it goes), BOOT_ROOM (what the page's address said of a
//   room as it loaded), roomKeyFor (the key this page knows for a room), roomNotices (what the room says, as this page
//   says it — a key refused on a page that came by an invite is the link's), roomNotSent (what this hand drew that the
//   room has not taken yet: leaving now would lose it), roomState (for tests).
// Uses: relay (24-relay.js: roomRelayFor, relayFromAddress, onThisMachine, inviteLink, inviteOf, leaveSearch, roomShort,
//   carryVerdict, idleWords), core (prefs, params, esc, session, EMBED), ui (00-ui.js: ui.pane), folder (folder, openLive, roomAddress,
//   saveNow, handLabel, boards, boardsListed, openBoardsList, writeNewBoard, mintBoardId; 17-boards.js: newBoardEntry),
//   render (handColour), input (say, flash), teach (closePanel), controls (livePanel, syncTiles, openPane).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.
//
// Sharing is one tap: *Share this board* asks the relay to open a room (POST /rooms — an unguessable name and, on a
// relay that keeps keys, that room's key), joins it carrying the board on screen in, and the page's address becomes
// the room's. *Copy invite link* hands the link on — the share sheet on a touch screen, else the clipboard — with the
// key after `#`, which no browser sends to a server. A guest who opens it is asked a name (so two guests are never the
// same "hand"), joins, and sees the board; joining never carries the guest's own board in. The bar shows the room and
// a dot per hand heard in the last minute; every hand says it is here every 20 s while its page is seen, and says
// goodbye when the page goes. *Save a copy to my boards* keeps the room's board, as it stands, as a board of this
// browser's own — a room is kept by the relay only while it is used (`idleWords`), never on a device by itself.

  /** How often a hand in a room says it is here while its page is seen: well inside the minute presence is judged by. */
  const ROOM_BEAT_MS = 20000;
  /** How recently a hand must have been heard to be in the room — the status line's own minute. */
  const ROOM_HEARD_MS = 60000;
  /** What the page's address said of a room as it loaded — read before anything rewrites it. */
  const BOOT_ROOM = inviteOf(location.search, location.hash);
  let roomBeat = 0;
  let roomLeftOnHide = false;
  /** How long a guest who came by an invite waits to hear the room before an empty one is said to be empty. */
  const ROOM_EMPTY_MS = 6000;
  /** How long Leave waits for what this hand drew to reach the room before it says it has not. */
  const ROOM_LEAVE_WAIT_MS = 2500;
  const liveEls = {
    leaveRow: document.getElementById('liveLeaveRow'), leaveAnyway: document.getElementById('liveLeaveAnyway'),
    here: document.getElementById('liveHere'), away: document.getElementById('liveAway'), name: document.getElementById('liveRoomName'),
    who: document.getElementById('liveWho'), kept: document.getElementById('liveKept'), invite: document.getElementById('liveInvite'),
    save: document.getElementById('liveSaveCopy'), leave: document.getElementById('liveLeave'), link: document.getElementById('liveLink'),
    share: document.getElementById('liveShare'), empty: document.getElementById('liveEmptyRow'), shareEmpty: document.getElementById('liveShareEmpty'),
    more: document.getElementById('liveMore'), status: document.getElementById('liveStatus'), chip: document.getElementById('roomChip'),
  };
  /** A sentence in the Live pane, and — when it is a refusal or what just happened — in the status line too. */
  function liveSay(words, alsoLine) {
    if (liveEls.status) liveEls.status.textContent = words || '';
    if (words && alsoLine) say(words);
  }

  /** The relay this page opens rooms through: one typed in the pane, else one its address names where it may (24-relay.js), else this address's own. */
  function shareRelay() {
    const typed = document.getElementById('liveRelay');
    const t = typed && typed.value.trim();
    if (t) return t.replace(/\/+$/, '');
    return relayFromAddress(location.hostname, params.get('relay') || '') || roomRelayFor(location.hostname);
  }
  /** The key this page knows for a room: the one it is in, else the one its address came with. Held in memory, never said. */
  function roomKeyFor(room) {
    if (folder.how === 'live' && folder.name === room && folder.key) return folder.key;
    return BOOT_ROOM && BOOT_ROOM.room === room ? BOOT_ROOM.key : '';
  }

  /**
   * Who is in the room, as a person sees them: this hand first, then every person heard in the last minute, each in its
   * colour — a person once however many sittings of theirs were heard (a tab reloaded is a new sitting, and the old one's
   * goodbye may not have made it out of the page as it went).
   */
  function whoIsHere() {
    const mine = handLabel(folder.me);
    const out = [{ name: folder.me, label: mine, colour: handColour(mine), you: true, seat: false }];
    if (!folder.store || !folder.store.presence) return out;
    const now = Date.now();
    const seen = new Set([mine]);
    for (const p of folder.store.presence()) {
      const label = handLabel(p.participant);
      if (p.participant === folder.me || seen.has(label) || now - p.at >= ROOM_HEARD_MS) continue;
      seen.add(label);
      out.push({ name: p.participant, label, colour: handColour(label), you: false, seat: !!p.seat });
    }
    return out;
  }
  const inLiveRoom = () => folder.how === 'live' && !!folder.store;

  /** The chip in the bar while in a room: its name, and one dot per hand heard, in its colour. */
  function syncRoomChip() {
    const chip = liveEls.chip;
    if (!chip) return;
    const on = inLiveRoom() && !EMBED;
    chip.hidden = !on;
    if (!on) return;
    const hands = whoIsHere();
    const shown = hands.slice(0, 6);
    chip.innerHTML = '<span class="rcName">' + esc(roomShort(folder.name)) + '</span><span class="rcDots">' +
      shown.map((h) => '<i class="hueDot" style="background:' + h.colour + '"></i>').join('') + '</span>' +
      (hands.length > shown.length ? '<span class="rcMore">+' + (hands.length - shown.length) + '</span>' : '');
    chip.title = (hands.length === 1 ? 'only you so far' : hands.map((h) => h.label + (h.you ? ' (you)' : '')).join(', ')) + ' — tap for the invite link, a copy of the board, or to leave';
    chip.setAttribute('aria-label', 'room ' + roomShort(folder.name) + ': ' + hands.length + ' here');
  }

  /** The Live pane's first rows: out of a room, Share; in one, who is here, the invite, a copy, Leave. */
  function renderLivePane() {
    const inRoom = inLiveRoom();
    if (liveEls.here) liveEls.here.hidden = !inRoom;
    if (liveEls.away) liveEls.away.hidden = inRoom;
    // "Leave anyway" stands only while what this hand drew has not reached the room.
    if (liveEls.leaveRow && !(inRoom && folder.store.unsent && folder.store.unsent())) liveEls.leaveRow.hidden = true;
    if (!inRoom) return;
    liveEls.name.textContent = (folder.relay ? 'a shared board' : 'a board between tabs on this machine') + ' · ' + roomShort(folder.name);
    liveEls.who.innerHTML = whoIsHere().map((h) => '<li><i class="hueDot" style="background:' + h.colour + '"></i>' + esc(h.label) +
      (h.you ? ' <span class="lvYou">you</span>' : h.seat ? ' <span class="lvYou">answers what you ask</span>' : '') + '</li>').join('');
    liveEls.kept.textContent = folder.relay ? idleWords(folder.idleDays) : 'other tabs in this browser can join it — share a board to send a link';
    liveEls.invite.disabled = !folder.relay;
  }

  /** How long a room a relay opened is kept, asked of the relay by a hand that joined by a link (the opener was told as it opened it). */
  function learnRoomKept() {
    if (!folder.relay || folder.idleDays !== null || !/^r-[A-Za-z0-9_-]{22}$/.test(folder.name)) return;
    const at = folder.name;
    fetch(folder.relay.replace(/\/+$/, '') + '/rooms', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => {
      if (!j || folder.name !== at || folder.how !== 'live') return;
      folder.idleDays = Number(j.idleDays) > 0 ? Number(j.idleDays) : null;
      if (livePanel && !livePanel.hasAttribute('hidden')) renderLivePane();
    }, () => { /* said nothing: the pane says nothing of how long */ });
  }

  /**
   * What the room says about itself, as this page says it: a key the relay will not take, on a page that came by an
   * invite, is the link's — the person clicked a link and knows of no relay or key.
   */
  function roomNotices() {
    const all = folder.store && folder.store.notices ? folder.store.notices() : [];
    if (!folder.invited) return all;
    return all.map((n) => (/relay (does not take this key|wants a key)/.test(n) ? 'this invite link does not open the room — ask whoever sent it for a new link' : n));
  }

  /**
   * What this hand drew that the room has not taken yet, given a moment to go: null when the room holds it all, else
   * the sentence — it is on this page alone, and leaving the page loses it.
   */
  async function roomNotSent() {
    const st = folder.store;
    if (!st || folder.how !== 'live' || !st.unsent || !st.unsent()) return null;
    if (st.resend) st.resend();
    const until = Date.now() + ROOM_LEAVE_WAIT_MS;
    while (st.unsent() && Date.now() < until) await new Promise((ok) => setTimeout(ok, 100));
    if (!st.unsent()) return null;
    return { words: 'what you drew since the room last answered has not reached it — it is on this page alone, and leaving now loses it; save a copy to your boards first, or leave anyway' };
  }

  /** A guest who came by an invite into a room the relay opened, and hears nothing in it: said — rooms are forgotten after a while unused. */
  function sayIfEmpty(store) {
    if (!folder.invited || !/^r-[A-Za-z0-9_-]{22}$/.test(folder.name)) return;
    setTimeout(() => {
      if (folder.store !== store || folder.how !== 'live') return;
      const held = store.heldLogs();
      const any = Object.keys(held).some((n) => n !== folder.me && held[n].length);
      const someone = store.presence().some((p) => Date.now() - p.at < ROOM_HEARD_MS);
      if (any || someone || session.getState().contentIds.length) return;
      const d = Number(folder.idleDays);
      const after = d >= 1 ? Math.round(d) + ' day' + (Math.round(d) === 1 ? '' : 's') : 'a short while';
      say('nothing is in this room yet' + (d > 0 ? ' — a room is forgotten ' + after + ' after it was last used, so if this one held a board, ask whoever sent the link for a new one' : ''));
    }, ROOM_EMPTY_MS);
  }

  /** Every room this page joins: who is here followed, in the bar and the pane, and this hand said to be here while it is seen. */
  function liveRoomOpened(store) {
    learnRoomKept();
    sayIfEmpty(store);
    store.subscribe(() => {
      syncRoomChip();
      if (livePanel && !livePanel.hasAttribute('hidden')) renderLivePane();
    });
    clearInterval(roomBeat);
    roomBeat = setInterval(() => {
      if (folder.store !== store) { clearInterval(roomBeat); return; }
      if (document.visibilityState === 'visible') store.here();
      syncRoomChip();
    }, ROOM_BEAT_MS);
    roomLeftOnHide = false;
    syncRoomChip();
    if (livePanel && !livePanel.hasAttribute('hidden')) renderLivePane();
  }
  // Back in view: said at once, so the others see this hand again without waiting for the beat.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && inLiveRoom()) folder.store.here(); });
  // The page going: a goodbye after what it has not sent (flushBoard runs first, on the same event), so the hands that
  // hold this hand's log hand it on to the next newcomer at once. A page the browser kept and shows again joins again.
  addEventListener('pagehide', () => { if (inLiveRoom()) { roomLeftOnHide = true; folder.store.close(); } });
  addEventListener('pageshow', (e) => { if (e.persisted && roomLeftOnHide) location.reload(); });

  /** The board on screen, as the text a room carries — every mark on it, the other hands' too: how big it is. */
  function boardCarryChars() {
    try { return JSON.stringify(session.getEvents()).length; } catch (err) { return Infinity; }
  }
  /** What a relay that would not open a room said, in words. `relay`: where it was asked. */
  function mintRefusal(status, words, relay) {
    const said = String(words || '').trim();
    const plain = said && said.length < 200 && !/[<>]/.test(said) ? said : '';
    // Asked of the relay on this machine from a page that is not on it: there is none to share through from here.
    let local = false;
    try { local = onThisMachine(new URL(relay).hostname); } catch (err) { local = false; }
    if (status === 0 && local && !onThisMachine(location.hostname)) return 'sharing from this address goes through a relay on this machine, and none answered — run one there, or share from the app’s own address';
    if (status === 0) return 'the relay did not answer — check the connection, and try again';
    if (status === 403 && /origin/i.test(said)) return 'this site may not use that relay to open a room';
    if (status === 404 || status === 405 || status === 501) return 'that relay does not open rooms — it is older than this page';
    if (status === 429 || status === 503) return plain || 'the relay is not opening rooms just now — try again in a while';
    return 'the relay would not open a room (HTTP ' + status + ')' + (plain ? ' — ' + plain : '');
  }

  /**
   * Share this board: a room opened on the relay, joined, the board on screen carried in. A board too big to carry is
   * said first, with the way to share an empty board instead (`o.empty`). Resolves true once the page is in the room.
   */
  async function shareBoard(o) {
    o = o || {};
    if (liveEls.empty) liveEls.empty.hidden = true;
    if (!o.empty) {
      const v = carryVerdict(boardCarryChars());
      if (!v.ok) {
        liveSay(v.words + ' — share an empty board instead, or keep this one to yourself', true);
        if (liveEls.empty) liveEls.empty.hidden = false;
        return false;
      }
    }
    // A person with no name kept is asked one first, as a guest is — or the others would see "hand".
    if (!prefs.get('hand-name', '') && !o.named) return new Promise((done) => askRoomName(() => { shareBoard(Object.assign({}, o, { named: true })).then(done); }, 'share this board'));
    const relay = shareRelay();
    liveSay('opening a room…');
    if (liveEls.share) liveEls.share.disabled = true;
    try {
      let res, words;
      try {
        res = await fetch(relay.replace(/\/+$/, '') + '/rooms', { method: 'POST', cache: 'no-store' });
        words = await res.text();
      } catch (err) { liveSay(mintRefusal(0, '', relay), true); return false; }
      let made = null;
      if (res.status === 201) { try { made = JSON.parse(words); } catch (err) { made = null; } }
      if (!made || typeof made.room !== 'string' || !made.room) { liveSay(res.status === 201 ? 'the relay opened a room but did not say which' : mintRefusal(res.status, words), true); return false; }
      try {
        await openLive(made.room, { relay, key: typeof made.key === 'string' ? made.key : '', carry: !o.empty, idleDays: made.idleDays });
      } catch (err) { liveSay('could not open the room — ' + (err.message || err), true); return false; }
      syncTiles();
      renderLivePane();
      liveSay('');
      // What went in, counted from the room's board as it now stands — less the marks of any hand a room would not
      // carry, which stand on this page only and are said.
      const left = folder.copiesLeft || [];
      const marks = Math.max(0, session.getState().contentIds.length - left.reduce((n, c) => n + c.marks, 0));
      const notCarried = left.length ? ' · ' + left.map((c) => handLabel(c.name)).join(', ') + '’s marks are too big to carry in one piece and did not go in — they stay on this page only' : '';
      say((o.empty ? 'an empty board is shared' : marks ? 'this board is shared — ' + marks + ' mark' + (marks === 1 ? '' : 's') + ' went into the room with you' : 'this board is shared') + '; copy the invite link to bring someone in' + notCarried);
      return true;
    } finally {
      if (liveEls.share) liveEls.share.disabled = false;
    }
  }

  /** The link that brings someone into this room, or null where there is none to send (no room, or a room between tabs). */
  function currentInvite() {
    if (!inLiveRoom() || !folder.relay) return null;
    return inviteLink({ page: location.origin + location.pathname, room: folder.name, key: folder.key || null, relay: folder.relay, defaultRelay: roomRelayFor(location.hostname) });
  }
  /** Copy invite link: the share sheet on a touch screen that has one, else the clipboard, else the link shown to copy by hand. */
  async function copyInvite() {
    const link = currentInvite();
    if (!link) { liveSay('this room is between tabs on this machine — share the board to have a link to send', true); return false; }
    const sent = 'the invite link is copied — send it to whoever you want drawing here; anyone who has it can join';
    const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    if (touch && navigator.share) {
      try { await navigator.share({ title: 'Draw with me on dyna.ink', url: link }); liveSay('the invite link is on its way'); return true; }
      catch (err) { if (err && err.name === 'AbortError') return false; }
    }
    try {
      await navigator.clipboard.writeText(link);
      if (liveEls.link) { liveEls.link.hidden = true; liveEls.link.value = ''; }
      liveSay(sent);
      flash(sent);
      return true;
    } catch (err) {
      if (navigator.share) { try { await navigator.share({ url: link }); return true; } catch (e) { if (e && e.name === 'AbortError') return false; } }
      // Nothing could take it: the link stands in the pane, selected, to copy by hand — and goes when the pane closes.
      if (liveEls.link) { liveEls.link.hidden = false; liveEls.link.value = link; liveEls.link.select(); }
      liveSay('this browser would not copy the link — it is selected below: copy it from there');
      return false;
    }
  }

  /**
   * Leave: what this hand has not sent goes, a goodbye, and the board opened last comes back. What the room has not
   * taken yet is said first, and Leave waits for a second tap (`o.force`): leaving would lose it.
   */
  async function leaveLiveRoom(o) {
    o = o || {};
    if (!inLiveRoom()) return false;
    try { await saveNow(); } catch (err) { /* said in the line already */ }
    if (liveEls.leaveRow) liveEls.leaveRow.hidden = true;
    if (!o.force) {
      const v = await roomNotSent();
      if (v) {
        liveSay(v.words, true);
        if (liveEls.leaveRow) liveEls.leaveRow.hidden = false;
        return false;
      }
    }
    roomLeftOnHide = true;
    folder.store.close();
    location.assign(location.pathname + leaveSearch(location.search));
  }

  /** A room's board, as it stands, kept as a board of this browser's own — the others' marks still theirs. */
  async function saveRoomCopy() {
    if (!inLiveRoom()) return null;
    if (!boards.ready) await (boardsListed || openBoardsList());
    if (boards.how !== 'indexeddb') { liveSay('this browser keeps one board here — export the board instead', true); return null; }
    const events = session.getEvents().map((ev) => Object.assign({}, ev));
    const when = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    const entry = newBoardEntry([...boards.entries.values()], mintBoardId(), Date.now(), 'Shared board ' + when);
    try { await writeNewBoard(entry, events, null); }
    catch (err) { liveSay('could not keep a copy — ' + ((err && err.message) || err), true); return null; }
    const marks = session.getState().contentIds.length;
    liveSay('kept as “' + entry.name + '” in your boards — ' + marks + ' mark' + (marks === 1 ? '' : 's') + '; the room goes on as it was', true);
    return entry;
  }

  /**
   * A guest who came by an invite and has no name kept here — or a person sharing a board, with none — is asked one: one
   * field, Enter goes on, the colour the name will draw in beside it. `title` says what it is for: joining, or sharing.
   */
  function askRoomName(then, title) {
    const el = document.getElementById('namePanel');
    const input = document.getElementById('nameInput');
    const swatch = document.getElementById('nameSwatch');
    const status = document.getElementById('nameStatus');
    if (!el || !input) { then(); return; }
    const sharing = title === 'share this board';
    ui.pane(el, 'your name', () => { closePanel(el); say(sharing ? 'not shared — the board is as it was' : 'not joined — open the link again to join'); });
    const head = el.querySelector('.paneTitle');
    if (head) head.textContent = sharing ? 'share this board' : 'join a shared board';
    const lead = el.querySelector('.hint');
    if (lead) lead.textContent = sharing ? 'The others see your marks under this name, in its colour.' : 'You were invited to draw on a shared board.';
    document.getElementById('nameJoin').textContent = sharing ? 'Share' : 'Join';
    const paint = () => { const v = input.value.trim(); swatch.style.background = v ? handColour(v) : ''; };
    const join = () => {
      const v = input.value.trim().replace(/~/g, '').slice(0, 40);
      if (!v) { status.textContent = 'a name, so the others can tell your marks from theirs'; input.focus(); return; }
      prefs.set('hand-name', v);
      closePanel(el);
      then();
    };
    input.oninput = paint;
    input.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); join(); } };
    document.getElementById('nameJoin').onclick = join;
    openPane(el, null);
    paint();
    setTimeout(() => input.focus(), 0);
  }

  /** Join a room with what the page is told: say where, and that joining brought nothing in. `opts.invited`: it came by an invite. */
  function joinRoom(room, opts, how) {
    return openLive(room, opts).then(() => {
      syncTiles();
      say('in the room as ' + handLabel(folder.me) + (opts.relay ? ' — what you draw is shared as you draw it' : ' — other tabs on this machine can join') + (how ? ' · ' + how : ''));
      return true;
    }, (err) => { say('could not join the room — ' + (err.message || err)); return false; });
  }

  /**
   * A page opened on a room's address (`?live=`): its relay — the one the address names where this page may take it,
   * else this address's own when the link came with a key or as an invite, else tabs on this machine — and its key.
   * A guest who came by an invite and has no name kept is asked one first.
   */
  function joinFromAddress() {
    const inv = BOOT_ROOM;
    if (!inv) return;
    let relay = '';
    if (inv.relay) {
      relay = relayFromAddress(location.hostname, inv.relay) || '';
      if (!relay) { say('this link names a relay this page does not use, so the room was not joined — ask for a link made on this site'); return; }
    } else if (inv.key || inv.invited) relay = roomRelayFor(location.hostname);
    // An old link's ?key= leaves the address at once — before a name is asked — for the fragment.
    if (inv.keyInQuery) roomAddress(inv.room, relay, inv.key);
    const go = () => joinRoom(inv.room, relay ? { relay, key: inv.key, invited: inv.invited } : {});
    // A guest who came by an invite with no name kept is asked one — on a reload too, after a prompt put away, or the
    // others would see "hand". A person who has joined has a name kept, so a page reloaded in its room is not asked.
    if (inv.invited && !prefs.get('hand-name', '')) askRoomName(go);
    else go();
  }

  /** The pane's Join: a room's name typed — or an invite link pasted, which carries its room, its relay and its key. */
  function joinTyped(text, name, typedRelay) {
    const t = String(text || '').trim();
    if (!t) { liveSay('a room needs a name — or paste an invite link'); return Promise.resolve(false); }
    if (name) prefs.set('hand-name', name);
    let inv = null;
    if (/^https?:\/\//i.test(t)) { try { const u = new URL(t); inv = inviteOf(u.search, u.hash); } catch (err) { inv = null; } }
    if (/^https?:\/\//i.test(t) && !inv) { liveSay('that link names no room'); return Promise.resolve(false); }
    let relay = typedRelay || '';
    let key = '';
    let room = t;
    if (inv) {
      room = inv.room;
      key = inv.key;
      if (!relay) relay = inv.relay ? relayFromAddress(location.hostname, inv.relay) || '' : (inv.key || inv.invited) ? roomRelayFor(location.hostname) : '';
      if (inv.relay && !relay) { liveSay('that link names a relay this page does not use'); return Promise.resolve(false); }
    } else key = roomKeyFor(room);
    return joinRoom(room, relay ? { relay, key, invited: !!(inv && inv.invited) } : {});
  }

  if (liveEls.share) liveEls.share.onclick = () => { shareBoard(); };
  if (liveEls.shareEmpty) liveEls.shareEmpty.onclick = () => { shareBoard({ empty: true }); };
  if (liveEls.invite) liveEls.invite.onclick = () => { copyInvite(); };
  if (liveEls.save) liveEls.save.onclick = () => { saveRoomCopy(); };
  if (liveEls.leave) liveEls.leave.onclick = () => { leaveLiveRoom(); };
  if (liveEls.leaveAnyway) liveEls.leaveAnyway.onclick = () => { leaveLiveRoom({ force: true }); };
  if (liveEls.chip) liveEls.chip.onclick = () => {
    if (livePanel.hasAttribute('hidden')) { openPane(livePanel, liveEls.chip); renderLivePane(); } else closePanel(livePanel, liveEls.chip);
  };

  /** For tests: the room as this page holds it — never its key, only whether it has one. */
  function roomState() {
    return {
      inRoom: inLiveRoom(), room: folder.how === 'live' ? folder.name : null, relay: folder.relay || '', keyed: !!folder.key, idleDays: folder.idleDays,
      me: folder.me, here: inLiveRoom() ? whoIsHere().map((h) => ({ label: h.label, you: h.you })) : [],
      unsent: inLiveRoom() && folder.store.unsent ? folder.store.unsent() : 0,
      notices: inLiveRoom() && folder.store.notices ? folder.store.notices() : [],
      stream: inLiveRoom() && folder.store && folder.transport && folder.transport.state ? folder.transport.state() : null,
      chip: liveEls.chip && !liveEls.chip.hidden ? liveEls.chip.textContent : null,
    };
  }

// ===== seat =====
// Provides: the seat — Claude Code, over MCP, as a model the field asks (V1-PLAN J4): the models
//   pane's first section (seatSection: "Claude Code — in this room", one tap; or what to do, in a
//   sentence), joinSeat/leaveSeat, withClaude (the Live pane's "with Claude": the room and the seat
//   in one act), isSeatAgent (the reader's preference), seatRoomOpened (a room's presence followed),
//   seatState (for tests), and the door moved under "advanced".
// Uses: core (MM, prefs, esc), models (agents, join, leave, renderAgents, workControllers, addMcp,
//   syncProviderFields, the pane's elements), input (say), folder (folder, openLive, saveNow),
//   teach (closePanel), controls (livePanel, tiles, syncTiles).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== The seat (V1-PLAN J4) ===============================================
  // John's question: can *Read the writing* and *What is this?* come straight
  // back to the Claude Code session he is talking to, over MCP, instead of
  // going out to an HTTP endpoint? The shard answered it for 3D (SHARD-3D-
  // PUSH-2 G5), and core now has it for the canvas (`participants/seat.ts`):
  // the seat is a model — the same prompts, the same parsers, the same propose
  // channel — whose questions are PARKED in the live room as briefs, answered
  // by the MCP hand (`Demos/mcp.mjs`: canvas_pending, canvas_answer) and paired
  // by the brief node's own id. Nothing is posted anywhere but the room, and the
  // seat holds no key.
  //
  // What is here is the surface's half: the seat is offered where a person
  // looks for Claude — first in the models pane, "Claude Code — in this room",
  // one tap, while a hand that answers at the seat is heard in the room; and
  // the Live pane's "with Claude" joins the room and takes the seat in one act.
  // A room with no such hand gets a sentence saying what to do. The door (an
  // MCP server of your own, through a bridge you start) stops posing as the way
  // to reach Claude: it stands under "advanced".
  //
  // Seated, it is a model like any other: it joins through `join` (so whatever
  // waits for a model to join runs for it too), takes the front of `agents`
  // (sitting down is a deliberate act that says *ask me*), and is the reader
  // while seated. A brief is sent to the room the moment it is parked, shown
  // working beside its marks, stopped by Esc like any model's call, and taken
  // back when given up on; its card is never drawn — the answer is.

  const CLAUDE_ROOM = 'claude';
  const CLAUDE_RELAY = 'http://127.0.0.1:8020';
  /** How recently a hand must have been heard to be in the room — the status line's own minute. */
  const HEARD_MS = 60000;
  /** What the status line says when the seat is taken. */
  const SEATED_SAID = 'Claude is here and will read for you — what you ask waits in this room until it answers';
  let seatAgent = null;   // the SeatParticipant, once made; seated while it is in `agents`
  let seatWanted = false; // "with Claude" asked for it: taken the moment Claude's hand is heard

  /** The seat, when it sits among the models. */
  function isSeatAgent(a) { return !!a && a === seatAgent; }
  function seated() { return !!seatAgent && agents.includes(seatAgent); }

  /** Why the seat cannot take a question on this page now, in one sentence — or null. */
  function whyNoSeat() {
    if (folder.how !== 'live' || !folder.store) {
      return 'Claude answers here once this page is in its room — tap “with Claude” in the live tile, or open this page with ?live=' + CLAUDE_ROOM + '&relay=' + CLAUDE_RELAY + '.';
    }
    if (!folder.relay) return 'This room is between tabs on this machine, and Claude’s hand reaches a room only through a relay — tap “with Claude” in the live tile.';
    if (MM.providerLocality({ baseUrl: folder.relay }) !== 'local') return 'This room’s relay is on another machine, and the seat asks only through a relay on this one — tap “with Claude” in the live tile.';
    return null;
  }

  /** The hand in this room that answers at the seat, heard in the last minute, as a person sees it — or null. */
  function claudeHere() {
    if (folder.how !== 'live' || !folder.store || !folder.store.presence) return null;
    const now = Date.now();
    const p = folder.store.presence().find((x) => x.seat && now - x.at < HEARD_MS);
    return p ? MM.handLabel(p.participant) : null;
  }

  /** Take the seat: a model that parks its questions in this room. Null, with the reason in the pane, where it cannot. */
  function joinSeat() {
    if (seated()) return seatAgent;
    const why = whyNoSeat();
    if (why) { mpStatus.textContent = why; renderSeat(); return null; }
    // The same seat while its join still stands on this board; a board left and come back to seats it anew.
    if (!seatAgent || !session.getState().participants.includes(seatAgent.id)) {
      seatAgent = MM.createSeatParticipant(session, Date.now(), { baseUrl: folder.relay, canPark: whyNoSeat, onChange: seatChanged });
    }
    if (!join(seatAgent.config, null, null, seatAgent)) return null;
    // The front: `agents` is who is asked, and sitting down here says *ask me*.
    agents.splice(agents.indexOf(seatAgent), 1);
    agents.unshift(seatAgent);
    renderAgents();
    renderSeat();
    return seatAgent;
  }

  /** Leave the seat: it stops being asked. What it is waiting on still settles, or is withdrawn from the pane. */
  function leaveSeat() {
    seatWanted = false;
    if (seated()) leave(seatAgent);
    renderSeat();
  }

  /** What happened to a brief: sent to the room the moment it is parked, and Esc reaches it. */
  function seatChanged(c) {
    const key = 'seat:' + c.brief.key;
    if (c.kind === 'parked') {
      // Sent now, not on the save's next beat: the hand is waiting for it.
      saveNow();
      // A call that came without a signal of its own is stopped by Esc all the same.
      if (!c.signalled) {
        const ctl = new AbortController();
        ctl.signal.addEventListener('abort', () => { if (seatAgent) seatAgent.cancel(c.brief.key, 'stopped'); });
        workControllers.set(key, ctl);
      }
    } else workControllers.delete(key);
    renderSeat();
  }

  /**
   * The Live pane's "with Claude": room "claude" through the relay on this
   * machine (or the one typed), and the seat — one act. Taken at once when
   * Claude's hand is heard; otherwise taken the moment it is, and said.
   */
  async function withClaude() {
    const relayEl = document.getElementById('liveRelay');
    const nameEl = document.getElementById('liveName');
    const statusEl = document.getElementById('liveStatus');
    const relay = (relayEl && relayEl.value.trim()) || CLAUDE_RELAY;
    if (relayEl) relayEl.value = relay;
    document.getElementById('liveRoom').value = CLAUDE_ROOM;
    const name = nameEl ? nameEl.value.trim() : '';
    if (name) prefs.set('hand-name', name);
    seatWanted = true;
    try {
      await openLive(CLAUDE_ROOM, { relay: relay });
    } catch (err) {
      seatWanted = false;
      if (statusEl) statusEl.textContent = 'could not join: ' + (err.message || err);
      return;
    }
    closePanel(livePanel, tiles.live);
    syncTiles();
    // Claude's hand is heard as the room answers the hello — a moment.
    for (let i = 0; i < 30 && !claudeHere(); i++) await new Promise((r) => setTimeout(r, 100));
    claimSeat();
    if (!seated()) say('in room “' + CLAUDE_ROOM + '” — Claude isn’t here yet: open Claude Code in this project and its hand joins this room; Claude takes the seat the moment it does');
  }

  /** "with Claude" asked for the seat: take it once Claude's hand is heard, and say so. */
  function claimSeat() {
    if (!seatWanted || seated() || !claudeHere()) return;
    if (joinSeat()) say(SEATED_SAID);
  }

  /** A room was joined (openLive): follow who is heard in it, for the pane and for a seat asked for. */
  function seatRoomOpened(store) {
    store.subscribe(() => {
      claimSeat();
      if (!panel.hasAttribute('hidden')) renderSeat();
    });
  }

  // ===== The models pane's first section ======================================
  const seatSection = document.createElement('div');
  seatSection.id = 'mpSeat';
  seatSection.className = 'mpSection mpLocal mpSeat';
  panel.insertBefore(seatSection, panel.querySelector(':scope > .mpSection'));

  function renderSeat() {
    const why = whyNoSeat();
    const here = claudeHere();
    let html = '<div class="mpHead"><span>Claude Code</span></div>';
    if (seated()) {
      const waiting = seatAgent.waiting();
      html += '<button class="model on" id="mpSeatLeave" title="it reads and answers for you here — tap to leave the seat"><span>Claude Code — seated</span><span class="why">tap to leave</span></button>';
      html += '<div class="note">' + esc(why ? why
        : here ? here + ' is in room “' + folder.name + '” — What is this?, Read the writing and ask: are parked here until it answers'
          : 'Claude’s hand is not in room “' + folder.name + '” just now — what you ask waits here until it comes back') + '</div>';
      for (const w of waiting) {
        html += '<div class="mpItem"><span>waiting: ' + esc(w.asked) + ' · ' + w.about.length + ' mark' + (w.about.length === 1 ? '' : 's') + '</span>' +
          '<button class="ghost" data-withdraw="' + esc(w.key) + '" title="take the question back — the hand will not be asked it">withdraw</button></div>';
      }
    } else if (why) {
      html += '<div class="note">' + esc(why) + '</div>';
    } else if (here) {
      html += '<button class="model" id="mpSeatJoin" title="one tap, and it reads the writing, says what things are and answers questions for you — every question parked in this room until it answers"><span>Claude Code — in this room</span><span class="why">tap to seat</span></button>';
      html += '<div class="note">' + esc(here + ' is here, and sees: seated, What is this?, Read the writing and ask: go to it') + '</div>';
    } else {
      html += '<div class="note">' + esc(folder.name === CLAUDE_ROOM
        ? 'Claude isn’t in this room yet — it joins whenever Claude Code is open in this project (its hand is node Demos/mcp.mjs), and is offered here the moment it is heard.'
        : 'Claude isn’t in room “' + folder.name + '” — its hand joins room “' + CLAUDE_ROOM + '”: tap “with Claude” in the live tile.') + '</div>';
    }
    seatSection.innerHTML = html;
    const join1 = seatSection.querySelector('#mpSeatJoin');
    if (join1) join1.onclick = () => { if (joinSeat()) say(SEATED_SAID); };
    const leave1 = seatSection.querySelector('#mpSeatLeave');
    if (leave1) leave1.onclick = () => leaveSeat();
    seatSection.querySelectorAll('[data-withdraw]').forEach((b) => {
      b.onclick = () => { if (seatAgent && seatAgent.cancel(b.dataset.withdraw, 'withdrawn from the models pane')) say('withdrawn — the hand will not be asked it'); };
    });
  }
  // Drawn whenever the pane opens, and whenever the list of models changes (a leave there leaves the seat too).
  new MutationObserver(() => { if (!panel.hasAttribute('hidden')) renderSeat(); }).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  let wasSeated = false;
  new MutationObserver(() => {
    const now = seated();
    if (wasSeated && !now) seatWanted = false;
    wasSeated = now;
    renderSeat();
  }).observe(mpList, { childList: true });
  renderSeat();

  // ===== The door, under "advanced" ===========================================
  // An MCP server of your own, reached through a bridge started in a terminal
  // (Demos/mcp-client.mjs) — a parsing method, not the way Claude answers here.
  // It left the key form, where it asked for a key it never needed.
  (function moveTheDoor() {
    const opt = mpProvider.querySelector('option[value="mcp"]');
    if (opt) { opt.remove(); syncProviderFields(); }
    const adv = document.createElement('details');
    adv.id = 'mpAdvanced';
    adv.className = 'mpSection mpLocal mpAdvanced';
    adv.innerHTML = '<summary>advanced</summary>' +
      '<div class="note">An MCP server (the door): a server of your own, through a bridge started in a terminal — node Demos/mcp-client.mjs -- node server.mjs. Not how Claude answers here: for Claude, see the top of this pane.</div>' +
      '<input id="mpDoorEndpoint" placeholder="http://127.0.0.1:8030 — the door" autocomplete="off" spellcheck="false" />' +
      '<input id="mpDoorName" placeholder="a name for it (optional)" autocomplete="off" spellcheck="false" />' +
      '<div class="mpRow"><button id="mpDoorKnock">Knock</button></div>';
    panel.appendChild(adv);
    adv.querySelector('#mpDoorKnock').onclick = () => {
      // The door reads the key form's two fields; it is handed them for the knock and they are put back after.
      const was = { endpoint: mpEndpoint.value, model: mpModel.value };
      mpEndpoint.value = adv.querySelector('#mpDoorEndpoint').value;
      mpModel.value = adv.querySelector('#mpDoorName').value;
      Promise.resolve(addMcp()).finally(() => { mpEndpoint.value = was.endpoint; mpModel.value = was.model; });
    };
  })();

  /** The seat as the page holds it, for tests. */
  function seatState() {
    return {
      seated: seated(),
      id: seatAgent ? seatAgent.id : null,
      name: MM.SEAT_NAME,
      here: claudeHere(),
      wanted: seatWanted,
      room: folder.how === 'live' ? folder.name : null,
      why: whyNoSeat(),
      waiting: seatAgent ? seatAgent.waiting() : [],
    };
  }

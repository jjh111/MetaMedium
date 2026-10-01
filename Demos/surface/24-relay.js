// ===== relay =====
// Provides: where *with Claude* looks for the room's relay (PLAN-IPAD-NOTES A2) — the pure half: CLAUDE_RELAY_LOCAL
//   and CLAUDE_RELAY_HOSTED (the two addresses), claudeRelayFor (which one a page defaults to, from the hostname it
//   is served from) and ownRelay (whether an address is the product's own relay, the one hosted relay the seat
//   accepts besides one on this machine).
// Uses: NOTHING. No closure variable, no DOM, no storage, no session — so it is tested on its own in Node:
//   node --test Demos/surface/24-relay.test.mjs
//   24-seat.js is the adapter (it reads `location.hostname` and puts the answer in the Live pane).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.
//
// On the dyna.ink origin the Live pane's *with Claude* defaults to the hosted relay, https://relay.dyna.ink
// (cloudflare/README.md): a person on an iPad has no relay on the device, and the one on the machine Claude Code
// runs on is not reachable from there. Everywhere else — this machine, the GitHub Pages address, a file — it is the
// relay on this machine, as it always was. A relay typed into the pane always wins over either.
//
// THE KEY IS NOT HERE. A hosted room wants a key (a key per room, the HMAC of its name under a secret only the relay
// holds); a tab takes it from the page address's `?key=` where the room is opened (17-folder.js, `openLive`), and a
// key never enters the log, a board, an export, a cache or a sentence of the page's. This fragment says where the
// relay is and never holds, reads or repeats a key — an address that carries one in it is not judged the relay's own.

  const CLAUDE_RELAY_LOCAL = 'http://127.0.0.1:8020';
  const CLAUDE_RELAY_HOSTED = 'https://relay.dyna.ink';

  /** The relay *with Claude* defaults to for a page served from `hostname`: the hosted one on dyna.ink and its subdomains, else the one on this machine. */
  function claudeRelayFor(hostname) {
    if (typeof hostname !== 'string') return CLAUDE_RELAY_LOCAL;
    const host = hostname.trim().toLowerCase().replace(/\.$/, '');
    return host === 'dyna.ink' || host.endsWith('.dyna.ink') ? CLAUDE_RELAY_HOSTED : CLAUDE_RELAY_LOCAL;
  }

  /**
   * Whether an address is the product's own relay: `https://relay.dyna.ink`, the origin and nothing more — the seat
   * accepts it as it accepts a relay on this machine, because it is the one hosted relay this build's page is made
   * to reach (its content-security policy names it) and it keeps a room only for a key. Anything else, and an
   * address with a key or a login in it, is not.
   */
  function ownRelay(url) {
    if (typeof url !== 'string' || !url) return false;
    let u;
    try { u = new URL(url); } catch (err) { return false; }
    return u.protocol + '//' + u.host === CLAUDE_RELAY_HOSTED && (u.pathname === '/' || u.pathname === '') && !u.search && !u.hash && !u.username && !u.password;
  }

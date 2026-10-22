// ===== relay =====
// Provides: where a room's relay is and what a room's address carries — the pure half: CLAUDE_RELAY_LOCAL and
//   CLAUDE_RELAY_HOSTED (the two addresses), roomRelayFor (the relay a page shares a board through, from the
//   hostname it is served from — the hosted one on dyna.ink, else the one on this machine), claudeRelayFor (the
//   same, for *with Claude*; PLAN-IPAD-NOTES A2), ownRelay (whether an address is the product's own relay),
//   onThisMachine, relayFromAddress (whether a page may take the relay its address names); and an invite
//   (the rooms lane, MU-1/MU-2): inviteLink (the link a person sends), inviteOf (what a page's address says
//   of a room — the room, the relay, the key from the fragment or an old link's query, whether it came by an
//   invite), roomSearch / roomHash (the address a page in a room keeps, so a reload rejoins), withoutKey (a
//   fragment with no key in it), leaveSearch (the address a page goes to when it leaves a room), roomShort (a
//   room's name as a person reads it), CARRY_MAX_CHARS / carryVerdict (whether the board on screen
//   can be carried into a room), idleWords (how long a room is kept, in words).
// Uses: NOTHING. No closure variable, no DOM, no storage, no session — so it is tested on its own in Node:
//   node --test Demos/surface/24-relay.test.mjs
//   24-seat.js and 24-room.js are its adapters (they read `location` and put the answers in the Live pane).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.
//
// On the dyna.ink origin a room's relay — the one *Share this board* opens a room on, and the one *with
// Claude* looks for — is the hosted relay, https://relay.dyna.ink (cloudflare/README.md): a person on an iPad
// has no relay on the device. Everywhere else — this machine, the GitHub Pages address, a file — it is the
// relay on this machine, as it always was. A relay typed into the pane always wins; one named in a page's
// address (`?relay=`) is taken only where it cannot send the page's ink somewhere unasked: the page is on this
// machine, the relay is, or it is the product's own.
//
// THE KEY TRAVELS ONLY IN THE FRAGMENT. A room on a relay that keeps keys has one (the HMAC of its name under a
// secret only the relay holds); an invite carries it after `#key=`, which no browser sends to any server and no
// Referer carries. A page that opens one keeps it in memory and in its own fragment (so a reload rejoins), and
// drops it from every other address it makes. An old link's `?key=` is read once and moved to the fragment.
// Nothing here holds a key: it is handed in and handed back, never kept, and a key is never put in a sentence.
  const CLAUDE_RELAY_LOCAL = 'http://127.0.0.1:8020';
  const CLAUDE_RELAY_HOSTED = 'https://relay.dyna.ink';

  /** The relay a page served from `hostname` opens and joins rooms through: the hosted one on dyna.ink and its subdomains, else the one on this machine. */
  function roomRelayFor(hostname) {
    if (typeof hostname !== 'string') return CLAUDE_RELAY_LOCAL;
    const host = hostname.trim().toLowerCase().replace(/\.$/, '');
    return host === 'dyna.ink' || host.endsWith('.dyna.ink') ? CLAUDE_RELAY_HOSTED : CLAUDE_RELAY_LOCAL;
  }
  /** The relay *with Claude* defaults to: the room's relay, by the same rule. */
  function claudeRelayFor(hostname) { return roomRelayFor(hostname); }

  /** Whether a hostname is this machine: localhost, 127.x.x.x, [::1]. */
  function onThisMachine(hostname) {
    if (typeof hostname !== 'string') return false;
    const h = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
    return h === 'localhost' || h === '::1' || /^127(\.\d{1,3}){3}$/.test(h);
  }

  /**
   * The relay a page's address names (`?relay=`), when the page may take it: the page is on this machine (a person
   * developing, the gate), the relay is (a room on this machine, as `?live=claude&relay=http://127.0.0.1:8020`), or
   * it is the product's own. Else null — an invite cannot send a page on dyna.ink to a relay of someone's choosing.
   */
  function relayFromAddress(pageHost, given) {
    if (typeof given !== 'string' || !given.trim()) return null;
    let u;
    try { u = new URL(given.trim()); } catch (err) { return null; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (u.username || u.password || u.search || u.hash) return null;
    const relay = (u.protocol + '//' + u.host + u.pathname).replace(/\/+$/, '');
    if (onThisMachine(pageHost) || onThisMachine(u.hostname) || ownRelay(relay)) return relay;
    return null;
  }

  const addressEnc = (v) => encodeURIComponent(v);
  /** The parts of a query or a fragment, as [name, raw part]; a part that will not decode keeps its raw name. */
  function addressParts(text) {
    return String(text || '').replace(/^[?#]/, '').split('&').filter(Boolean).map((p) => {
      let k;
      try { k = decodeURIComponent(p.split('=')[0]); } catch (err) { k = p.split('=')[0]; }
      return [k, p];
    });
  }
  function addressValue(part) {
    const i = part.indexOf('=');
    if (i < 0) return '';
    try { return decodeURIComponent(part.slice(i + 1).replace(/\+/g, ' ')); } catch (err) { return ''; }
  }

  /**
   * The link a person sends to bring someone into a room: this app's address, `?live=<room>`, `&relay=` only when the
   * relay is not the one this address opens rooms through anyway, and the key after `#key=` — or `#join` for a room
   * on a relay that keeps no keys, so the page it opens still knows it came by an invite.
   */
  function inviteLink(o) {
    const at = String(o && o.page || '').replace(/[?#].*$/, '');
    let q = '?live=' + addressEnc(o.room);
    if (o.relay && o.relay !== o.defaultRelay) q += '&relay=' + addressEnc(o.relay);
    return at + q + (o.key ? '#key=' + addressEnc(o.key) : '#join');
  }

  /**
   * What a page's address says of a room: `{ room, relay, key, invited, keyInQuery }` — the room (`?live=`), the relay
   * it names (`?relay=`, as given: relayFromAddress judges it), the key from the fragment's `key=` or, for an old
   * link, the query's (`keyInQuery`: to be moved out of it), and whether it came by an invite (a key in the fragment,
   * or `#join`). Null when the address names no room.
   */
  function inviteOf(search, hash) {
    let room = '', relay = '', qkey = '', fkey = '', join = false;
    for (const [k, p] of addressParts(search)) {
      if (k === 'live') room = addressValue(p);
      else if (k === 'relay') relay = addressValue(p);
      else if (k === 'key') qkey = addressValue(p);
    }
    for (const [k, p] of addressParts(hash)) {
      if (k === 'key') fkey = addressValue(p);
      else if (k === 'join') join = true;
    }
    if (!room.trim()) return null;
    return { room: room.trim(), relay, key: fkey || qkey, invited: !!fkey || join, keyInQuery: !!qkey };
  }

  /** The query a page in a room keeps: its own parts, the room's name, a relay that is not the default, and never a key. */
  function roomSearch(search, room, relay, defaultRelay) {
    const out = [];
    for (const [k, p] of addressParts(search)) {
      if (k === 'live' || k === 'relay' || k === 'key' || k === 'board' || k === 'fresh' || k === 'example') continue;
      out.push(p);
    }
    out.unshift('live=' + addressEnc(room));
    if (relay && relay !== defaultRelay) out.splice(1, 0, 'relay=' + addressEnc(relay));
    return '?' + out.join('&');
  }
  /** The fragment a page in a room keeps, so a reload rejoins: the key, and nothing else of the room. */
  function roomHash(key) { return key ? '#key=' + addressEnc(key) : ''; }
  /** A fragment with the room's key (and an invite's mark) taken out — for every address a page makes that is not its room's. */
  function withoutKey(hash) {
    const rest = addressParts(hash).filter(([k]) => k !== 'key' && k !== 'join').map(([, p]) => p);
    return rest.length ? '#' + rest.join('&') : '';
  }
  /** Where a page goes when it leaves a room: its own address with the room, the relay and any key let go of — the board opened last comes back. */
  function leaveSearch(search) {
    const out = addressParts(search).filter(([k]) => !['live', 'relay', 'key', 'fresh', 'board'].includes(k)).map(([, p]) => p);
    return out.length ? '?' + out.join('&') : '';
  }

  /** A room's name as a person reads it: a room a relay opened (128 random bits) by four of its letters, any other as it was named. */
  function roomShort(name) {
    const n = String(name || '');
    return /^r-[A-Za-z0-9_-]{22}$/.test(n) ? 'room ' + n.slice(2, 6) : n;
  }

  /** The most of a board, as text, that Share carries into a room: well under what a room keeps (32 MB), and four minutes of what one hand may send. */
  const CARRY_MAX_CHARS = 12_000_000;
  /** Whether a board of `chars` characters (its log as text) can be carried into a room: `{ ok, words }`. */
  function carryVerdict(chars) {
    const n = Number(chars) || 0;
    if (n <= CARRY_MAX_CHARS) return { ok: true, words: '' };
    return { ok: false, words: 'this board is ' + (n / 1e6).toFixed(1) + ' MB — a shared room carries boards up to ' + CARRY_MAX_CHARS / 1e6 + ' MB' };
  }

  /** How long a room is kept, in words, from what the relay said when it opened it — or '' when it said nothing (a relay on this machine keeps a room while it runs). */
  function idleWords(idleDays) {
    const d = Number(idleDays);
    if (!(d > 0)) return '';
    if (d >= 1) { const n = Math.round(d); return 'the room is kept ' + n + ' day' + (n === 1 ? '' : 's') + ' after it was last used, then forgotten'; }
    return 'the room is kept a short while after it was last used, then forgotten';
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

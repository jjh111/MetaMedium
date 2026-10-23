// ===== seats (the rules) =====
// Provides: the seats' rules, pure (V1-PLAN I7) — SEATS and SEAT_WORDS (what each seat is for), resolveReaders
//   and resolveWriters (who is asked to read and who to write, with the fallback said), fallbackWords (what a seat
//   does when nothing is chosen for it), keyId, keysToKeep and migrateStored (one key a provider; what is kept on
//   the device; an old pick and key become the writer seat), orderChoices (local before hosted, quickest first),
//   seatsOfPick and pickOf (what a kept pick holds, and never a key), and the semantic seat's (I9): SEMANTIC_SOURCE
//   (where its model is asked for), semanticSourceOf (an address read, never a key), semanticNameOf, semanticWords (what
//   its row says), semanticFailed (a load that did not work, in words); and the house decider's (the audit's S3):
//   HOUSE_DECIDE and HOUSE_MODELS (dyna.ink's own decision model, through its relay, no key), houseDeciderFor (whether
//   a page may use it, and where), deciderAtBoot (what a page seats at boot, and whether the hand chose it),
//   deciderWords (what its row says), deciderAsks (when a decider is asked and what it is sent, in words); and dyna.ink's
//   own writer and reader (the audit's UX-04): HOUSE_AI, HOUSE_SEATS and HOUSE_WAIT_MS (where they are asked and how long
//   for), houseAiFor (whether a page may use them, and where), houseAtBoot (whether one is seated once the house answers),
//   houseWords, houseSends, houseWaits and houseLead (what their rows and the pane's lead say, in words), and probesOnOpen (whether the
//   pane looks for models on this machine as it opens, or waits for the person to ask — UX-DEP-1).
// Uses: NOTHING. Like 07-hand.js and 09-field.js, this fragment names no closure variable, touches no DOM and asks
//   the session nothing; 04-models.js is the adapter that gathers the joined models, asks, and acts. So it loads on
//   its own in Node, which is how it is tested:
//     node --test Demos/surface/03-seats.test.mjs
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.
//
// THE RULES (PLAN-IPAD-NOTES §3; CLAUDE.md, "Tiered LLM Interpretation")
//   - A seat is a JOB, not a kind of participant: reader (handwriting to text — a model that sees), writer (briefs,
//     pages, programs, *What is this?*), decider (a decision model: the engine's own ranking stands unless it is
//     sure) and semantic (on this device: a small model that runs here, no key — I9). A model holds the seats the hand gave it; one that holds none
//     is "any job", asked as every model was before seats.
//   - A seat chosen NARROWS who is asked; a seat left alone changes nothing. That is the whole of the migration:
//     with no seat chosen every rule here returns what the surface did before.
//   - Fallbacks are stated, in order. Reader: the one chosen, else Claude Code while it is seated, else the writer if
//     it sees, else the smallest model that sees, else dyna.ink's own reader. Writer: the one chosen, else every model
//     with no other seat — and Claude Code, while it is seated, stands first of all (J4) — else dyna.ink's own writer.
//     dyna.ink's own (`house` on a model) is always the LAST resort: a person's own choice always wins, and a model of
//     theirs, or Claude Code seated, is asked instead of it. Decider: dyna.ink's own where the page may use it and the
//     hand did not let it go; else none, and the engine's ranking is the answer.
//   - A decider is never a reader or a writer. It is not in the pool of models at all.
//   - One key a provider, entered once, used by every seat on it; kept on the device only for a provider whose key
//     the hand asked to remember; never in a pick, never in the log.

  /** The seats, in the order the pane shows them. */
  const SEATS = ['reader', 'writer', 'decider', 'semantic'];

  /** What each seat is for, in the person's words, and what is asked of it. */
  const SEAT_WORDS = {
    reader: { job: 'reads handwriting into text — a model that can see, quick and exact (OCR)', needs: 'a model that sees' },
    writer: { job: 'writes — briefs, pages, programs, and says what a group is (What is this?)', needs: 'a model' },
    decider: { job: 'chooses between what the engine already holds — which of two matching definitions, which kind of diagram, what a brief should make — and only when it is sure', needs: 'a decision model' },
    semantic: { job: 'notes like this, and search beyond the word typed — on this device, nothing sent anywhere', needs: 'a small model that runs here' },
  };

  /** What a seat does when nothing is chosen for it, in one sentence. `o.house`: dyna.ink's own decider may be seated here. */
  function fallbackWords(seat, o) {
    // `o.house`: dyna.ink's own writer or reader is seated here (the house answered), and was not let go.
    if (o && o.house && seat === 'reader') return 'nothing of yours chosen — dyna.ink’s own reader reads, with no key; Claude Code seated, or a model of yours that sees, reads instead';
    if (o && o.house && seat === 'writer') return 'nothing of yours chosen — dyna.ink’s own writer writes, with no key; a model you join, or Claude Code seated, writes instead';
    switch (seat) {
      case 'reader': return 'nothing chosen — Claude Code reads while it is seated, else the writer if it sees, else the smallest joined model that sees';
      case 'writer': return 'nothing chosen — every joined model that holds no other seat is asked, and Claude Code first while it is seated';
      case 'decider': return 'nothing chosen — the engine’s ranking stands, and nothing offers to ask a decision model' + (o && o.house ? '; dyna.ink’s own, with no key, is one tap away' : '');
      case 'semantic': return 'nothing chosen — search stays by the words typed and nothing offers notes like this; a small model that runs on this device, with no key and no call, would add both';
      default: return '';
    }
  }

  /**
   * Who is asked to READ writing, from the joined models: `{ id, vision, seats[], size, claude, house? }` each. Returns
   * the ids and why, in a clause. A model that cannot see never reads; a decider never reads. dyna.ink's own (`house`)
   * reads only when nothing of the person's would.
   */
  function resolveReaders(models) {
    const seers = models.filter((m) => m.vision && !m.seats.includes('decider'));
    const own = seers.filter((m) => !m.house);
    const chosen = own.filter((m) => !m.claude && m.seats.includes('reader'));
    if (chosen.length) return { who: [chosen[0].id], why: 'the reader seat' };
    const claude = own.find((m) => m.claude);
    if (claude) return { who: [claude.id], why: 'Claude Code, seated' };
    const writer = own.find((m) => m.seats.includes('writer'));
    if (writer) return { who: [writer.id], why: 'no reader seat — the writer sees' };
    const any = own.filter((m) => m.seats.length === 0).sort((a, b) => (a.size === b.size ? 0 : a.size < b.size ? -1 : 1));
    if (any.length) return { who: [any[0].id], why: 'no reader seat — the smallest model that sees' };
    const house = seers.filter((m) => m.house);
    const reader = house.find((m) => m.seats.includes('reader')) || house[0];
    if (reader) return { who: [reader.id], why: 'nothing of yours chosen — dyna.ink’s own reader' };
    return { who: [], why: 'no model that sees' };
  }

  /**
   * Who is asked to WRITE — a brief, a page, a program, *What is this?* — from the joined models. The writer seat
   * when one is chosen; else every model that holds no seat. Claude Code, while seated, stands first (J4). A model
   * that holds only the reader or decider seat is not asked. dyna.ink's own writer (`house`) writes only when none
   * of these would.
   */
  function resolveWriters(models) {
    const own = models.filter((m) => !m.house);
    const claude = own.filter((m) => m.claude);
    const chosen = own.filter((m) => !m.claude && m.seats.includes('writer'));
    const pool = chosen.length ? chosen : own.filter((m) => !m.claude && m.seats.length === 0);
    if (!claude.length && !pool.length) {
      const house = models.find((m) => m.house && m.seats.includes('writer'));
      if (house) return { who: [house.id], why: 'nothing of yours chosen — dyna.ink’s own writer' };
    }
    return { who: claude.concat(pool).map((m) => m.id), why: chosen.length ? 'the writer seat' : 'every joined model with no seat' };
  }

  // ---- the semantic seat (I9): a small model on this device, asked for by an address, no key ----

  /**
   * Where the seat's model is asked for unless the hand says otherwise: a folder holding `tokenizer.json` and
   * `model.safetensors` — Model2Vec's `potion-base-8M` (about 30 MB, no GPU; PLAN-IPAD-NOTES §3). UNVERIFIED where this
   * was written (the container cannot reach the host: the proxy answers 403), and on `main`, not pinned to a revision
   * — pin it to the commit John checks (the questions at the foot of the unit's status line).
   */
  const SEMANTIC_SOURCE = 'https://huggingface.co/minishlab/potion-base-8M/resolve/main/';
  /** The most a model's file may be before the seat will not take it: the plan's budget is under 32 MB, and a page holds it in memory. */
  const SEMANTIC_MAX_BYTES = 48 * 1024 * 1024;

  /**
   * An address the hand typed (or none: the default), read: https, or plain http on this machine only; no user, no
   * password, no query and no fragment — a key must never ride in an address, and the seat holds none. `{ ok, base }`
   * with a trailing slash, or `{ ok: false, why }` in words.
   */
  function semanticSourceOf(text) {
    const t = String(text == null ? '' : text).trim();
    if (!t) return { ok: true, base: SEMANTIC_SOURCE };
    let u;
    try { u = new URL(t); } catch (e) { return { ok: false, why: 'that is not an address — give the folder that holds tokenizer.json and model.safetensors, as https://…' }; }
    const here = u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '[::1]';
    if (u.protocol !== 'https:' && !(u.protocol === 'http:' && here)) return { ok: false, why: 'a model is fetched over https, or from this machine — “' + u.protocol + '” is neither' };
    if (u.username || u.password) return { ok: false, why: 'an address with a user or a password in it is refused — the seat holds no key' };
    if (u.search || u.hash) return { ok: false, why: 'an address with a query or a fragment in it is refused — a key must never ride in an address' };
    return { ok: true, base: u.origin + (u.pathname.endsWith('/') ? u.pathname : u.pathname + '/') };
  }

  /** A model named for its folder: the part before `resolve/main`, else the last part, else the host. */
  function semanticNameOf(base) {
    let u;
    try { u = new URL(base); } catch (e) { return String(base || 'model'); }
    const parts = u.pathname.split('/').filter(Boolean);
    const at = parts.indexOf('resolve');
    if (at > 0) return parts[at - 1];
    return parts.length ? parts[parts.length - 1] : u.host;
  }

  /** What the seat's row says: who holds it, where it runs, what it came to and that it holds no key. `held` is `{ name, dimension, words?, bytes? }` or null. */
  function semanticWords(held) {
    if (!held) return { who: 'nothing chosen' };
    const bits = [held.name, 'on this device', held.dimension + ' numbers a text'];
    if (held.words) bits.push(held.words + ' words');
    if (held.bytes) bits.push(held.bytes < 1048576 ? Math.max(1, Math.round(held.bytes / 1024)) + ' KB' : Math.round(held.bytes / 1048576) + ' MB');
    bits.push('no key, nothing sent');
    return { who: bits.join(' · ') };
  }

  /** A load that did not work, in the person's words. `f`: `{ status?, network?, what?, bytes?, reason? }`. */
  function semanticFailed(f) {
    const what = f && f.what ? f.what : 'the model';
    if (f && f.bytes && f.bytes > SEMANTIC_MAX_BYTES) return what + ' is too big — ' + Math.round(f.bytes / 1048576) + ' MB, more than the ' + Math.round(SEMANTIC_MAX_BYTES / 1048576) + ' MB the seat takes';
    if (f && f.status === 403) return 'could not load ' + what + ' — the host refused it (HTTP 403): it will not hand that file to this page';
    if (f && f.status === 404) return 'could not load ' + what + ' — no such file there (HTTP 404)';
    if (f && f.status) return 'could not load ' + what + ' — the host answered HTTP ' + f.status;
    if (f && f.network) return 'could not reach ' + what + ' — offline, or the host does not let this page read it';
    if (f && f.reason) return 'could not use ' + what + ' — it came, but it is not a model this device can read: ' + f.reason;
    return 'could not load ' + what;
  }

  // ---- the house decider (the audit's S3): dyna.ink's own, no key ----
  // On dyna.ink (and its old address) the decider seat is not empty: dyna.ink's relay asks Cloudflare's Clef-flash
  // through its own Workers AI binding (cloudflare/relay/src/ai.mjs), so the page sends no key and holds none. It is
  // seated silently at boot when the hand chose no decider — which writes nothing to any board (the seat joins at its
  // first ask) — and a hand that lets it go (`none`) is remembered, so a reload does not seat it again. Seated so, it
  // is asked only by a deliberate tap on a pill that names it (Which is it?, Which diagram is this?): a brief's Enter
  // asks only a decider the hand CHOSE (`chosen` — kept as its pick, or joined), so a brief's words never go anywhere
  // the hand did not send them. Anywhere else there is none, except a page on this machine that names one
  // (`?decide=http://127.0.0.1:<port>`, the carry's rule for an address on this machine — the gate's stub).

  /** Where dyna.ink's own decider is asked: its relay's model route. (A constant here, not 24-relay.js's: fragments load in name order.) */
  const HOUSE_DECIDE = 'https://relay.dyna.ink/decide';
  /** The models the relay offers, by the short name it is asked with; `sees`: takes pictures. */
  const HOUSE_MODELS = { 'clef-flash': { name: 'Clef-flash', sees: false }, 'clef-omni': { name: 'Clef-omni', sees: true } };
  /** The one seated by default: the quickest and the cheapest. */
  const HOUSE_DECIDER_MODEL = 'clef-flash';
  /** The hosts whose pages may use dyna.ink's decider: the relay lets their origins in (cloudflare/relay/src/http.mjs). */
  const HOUSE_HOSTS = ['dyna.ink', 'jjh111.github.io'];

  /** An origin on this machine: http, 127.0.0.1 or localhost, a port — the origin and nothing more (17-carry.js's rule). */
  function localOriginOf(o) {
    if (typeof o !== 'string') return null;
    const m = /^http:\/\/(127\.0\.0\.1|localhost):(\d{1,5})\/?$/.exec(o.trim());
    return m && +m[2] > 0 && +m[2] < 65536 ? 'http://' + m[1] + ':' + m[2] : null;
  }

  /**
   * Where a page served from `hostname` asks one of dyna.ink's own models — `own`, dyna.ink's relay's address for it,
   * on dyna.ink, a subdomain of it and the old address; on a page on this machine, `path` on a relay on this machine it
   * names (`asked`: its `?decide=` or `?ai=`); anywhere else, null — a page another site serves never reaches it.
   */
  function houseFor(hostname, asked, own, path) {
    const host = typeof hostname === 'string' ? hostname.trim().toLowerCase().replace(/\.$/, '') : '';
    if (HOUSE_HOSTS.includes(host) || host.endsWith('.dyna.ink')) return own;
    if (host === '127.0.0.1' || host === 'localhost') {
      const o = localOriginOf(asked);
      return o ? o + path : null;
    }
    return null;
  }

  /** Where a page served from `hostname` asks dyna.ink's decider, or null (`asked`: its `?decide=`, honoured on this machine only). */
  function houseDeciderFor(hostname, asked) { return houseFor(hostname, asked, HOUSE_DECIDE, '/decide'); }

  /**
   * What a page seats in the decider seat at boot, from what the device kept (`kept`: `mm-seats`' decider) and
   * whether dyna.ink's own may be used here (`house`, an address or null): `{ seat: 'house', model, chosen }` —
   * `chosen` when the hand kept it as its pick, else seated silently — `{ seat: 'pick' }` (a decision model the hand
   * joined, rejoined as before), or `{ seat: null }` — the hand chose none, or there is none here.
   */
  function deciderAtBoot(kept, house) {
    if (kept && kept.none) return { seat: null, why: 'none' };
    if (kept && kept.baseUrl && kept.model) return { seat: 'pick' };
    if (!house) return { seat: null, why: 'no house decider here' };
    const chosen = !!(kept && kept.provider === 'dyna');
    const model = chosen && HOUSE_MODELS[kept.model] ? kept.model : HOUSE_DECIDER_MODEL;
    return { seat: 'house', model: model, chosen: chosen };
  }

  /**
   * When a decider is asked and what it is sent, in one sentence for its row and its joining (the audit's S10):
   * the taps that ask it, and — for a decider the hand chose (`o.chosen`) — a brief's Enter too, when a model is here
   * to write what it decides; the words of the marks (and, chosen, the brief) and where they go — dyna.ink's relay
   * (`o.house`, `o.name` the model it asks) or the provider (`o.where`), with the hand's key. Never "nothing is kept":
   * nobody here can say what the provider keeps.
   */
  function deciderAsks(o) {
    const asks = o.chosen
      ? 'asked when you tap Which is it? or Which diagram is this?, and on a brief’s Enter, when a model will write it, to say what it should make (page:, run: or new: say it instead)'
      : 'asked only when you tap Which is it? or Which diagram is this?';
    const sent = o.chosen ? 'the words of the marks you ask about and the brief you typed' : 'the words of the marks you ask about';
    const to = o.house ? 'dyna.ink’s relay, which asks Cloudflare’s ' + (o.name || 'decision model') : (o.where || 'its provider') + ', with your key';
    return asks + ' — it is sent ' + sent + ', to ' + to + (o.house && !o.chosen ? ' · choose it to have it say what a brief should make too' : '');
  }

  /** What the house decider's row says: who, that it needs no key, and how sure it must be before it is taken. */
  function deciderWords(model, takeAt) {
    const m = HOUSE_MODELS[model] || HOUSE_MODELS[HOUSE_DECIDER_MODEL];
    return 'dyna.ink · ' + m.name + ' — no key needed · used only when ' + Math.round((takeAt || 0.99) * 100) + '% sure';
  }

  // ---- dyna.ink's own writer and reader (the audit's UX-04): no key ----
  // On dyna.ink (and its old address) the writer and reader seats are not empty either: dyna.ink's relay asks a Workers
  // AI model through its own binding (cloudflare/relay/src/ai.mjs, Demos/ai-protocol.mjs), at an OpenAI-compatible route
  // core's transport speaks unchanged — so the page sends no key and holds none. They are seated silently, and only once
  // the house answers: the page asks the relay's list of them once (which calls no model) and seats nothing until it
  // answers, and nothing at all when it never does — the person meets the page as it was, not a failure on every tap.
  // Seated, each is the LAST resort: a model of the person's, or Claude Code seated, is asked instead (the resolve rules
  // above). A seat the person let go (`none`) is remembered, so a reload does not seat it again; a model the person kept
  // for that seat means it is not seated at all. Anywhere else there is none, except a page on this machine that names
  // one (`?ai=http://127.0.0.1:<port>` — the gate's stub, or the relay run in Node with MM_AI_FAKE=1).

  /** Where dyna.ink's own writer and reader are asked: its relay's chat route, OpenAI's shape. (A constant, as HOUSE_DECIDE is.) */
  const HOUSE_AI = 'https://relay.dyna.ink/ai/v1';
  /** The house's seats: the short name the relay knows each by, what the person reads, and the name it joins a board under. */
  const HOUSE_SEATS = {
    writer: { model: 'writer', name: 'dyna.ink’s writer', join: 'dyna.ink writer' },
    reader: { model: 'reader', name: 'dyna.ink’s reader', join: 'dyna.ink reader' },
  };
  /** How long the page waits for a house model: longer than the relay's own 60 s, so the relay's sentence is the one heard. */
  const HOUSE_WAIT_MS = 75000;
  /** How long the page waits for the relay's list at boot before it seats nothing (it calls no model). */
  const HOUSE_PROBE_MS = 8000;

  /** Where a page served from `hostname` asks dyna.ink's own writer and reader, or null (`asked`: its `?ai=`, honoured on this machine only). */
  function houseAiFor(hostname, asked) { return houseFor(hostname, asked, HOUSE_AI, '/ai/v1'); }

  /**
   * Whether dyna.ink's own model is seated in `seat` ('writer' | 'reader') once the house answers, from what the device
   * kept (`kept`: `mm-seats`) and whether the page may use it (`house`, an address or null): not where the person let it
   * go (`{ none: true }`), not where they kept a model of their own for that seat — nor, for the writer, a model they
   * joined for any job — else yes. `{ seat, why }`.
   */
  function houseAtBoot(kept, seat, house) {
    if (!house) return { seat: false, why: 'no house here' };
    const k = kept || {};
    const mine = (p) => !!p && !!p.baseUrl && !!p.model;
    if (k[seat] && k[seat].none) return { seat: false, why: 'none' };
    if (mine(k[seat]) || (seat === 'writer' && mine(k.any))) return { seat: false, why: 'pick' };
    return { seat: true, why: 'nothing of yours chosen' };
  }

  /** What a house seat's row says it is: whose, and that it needs no key. */
  function houseWords(seat) { return (HOUSE_SEATS[seat] || HOUSE_SEATS.writer).name + ' — no key needed'; }

  /** What a house model is sent and where, in one line — "keeps none" said of dyna.ink only: nobody here can say what Cloudflare keeps. */
  function houseSends(seat) {
    const what = seat === 'reader' ? 'a picture of the ink you ask it to read' : 'the brief you typed and the words of the marks you ask about';
    return 'asked only when you ask — it is sent ' + what + ', to dyna.ink’s relay, which asks Cloudflare’s models; dyna.ink keeps none of it';
  }

  /** What a house seat's row says while a model of the person's is the one asked: it waits, and when it would be asked. */
  function houseWaits(seat) { return (HOUSE_SEATS[seat] || HOUSE_SEATS.writer).name + ' stands by — asked only when nothing of yours would ' + (seat === 'reader' ? 'read' : 'write'); }

  /** The models pane's lead, when dyna.ink's own writer or reader is seated: what the person has, and what is sent where. */
  function houseLead() {
    return {
      head: 'Using dyna.ink’s own models — no key needed',
      line: 'What you ask — a brief and the words of the marks, or a picture of the ink to read — goes to dyna.ink’s relay, which asks Cloudflare’s models; dyna.ink keeps none of it.',
      more: 'more — bring your own model',
    };
  }

  /**
   * Whether the models pane looks for models on this machine (Ollama on :11434, LM Studio on :1234) the moment it opens:
   * on a page served from this machine (or a file), yes, as ever; on a public origin, only when the person taps *Find
   * models on this machine* — a phone has none, and three failed requests a page are noise (UX-DEP-1).
   */
  function probesOnOpen(hostname) {
    const host = typeof hostname === 'string' ? hostname.trim().toLowerCase() : '';
    return host === '' || host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1';
  }

  // ---- keys: one a provider ----

  /** A provider's key is held under its address, without a trailing slash or its case. */
  function keyId(baseUrl) { return String(baseUrl || '').trim().replace(/\/+$/, '').toLowerCase(); }

  /** What is kept on the device of the keys held: only a provider whose key the hand asked to remember. */
  function keysToKeep(held, remembered) {
    const out = {};
    for (const [id, key] of held) if (remembered.has(id) && typeof key === 'string' && key) out[id] = key;
    return out;
  }

  /**
   * What an older device kept — one pick and one key (`mm-model-pick`, `mm-model-key`) — becomes the writer seat, and
   * the reader seat too for a model that sees; the key becomes its provider's. A device whose seats are already kept is
   * never migrated again. Never lost: nothing here deletes, the adapter lets the old entries go once these are written.
   */
  function migrateStored(stored) {
    const seats = stored && stored.seats && typeof stored.seats === 'object' ? stored.seats : null;
    const keys = stored && stored.keys && typeof stored.keys === 'object' ? stored.keys : {};
    // A pick is a model kept for a seat — or dyna.ink's own decider; the decider let go (`{ none: true }`) is a choice, not a pick, and is kept as it is.
    const had = seats && ['reader', 'writer', 'decider', 'any'].some((k) => seats[k] && ((seats[k].baseUrl && seats[k].model) || seats[k].provider === 'dyna'));
    const pick = stored && stored.pick;
    if (had || !pick || !pick.baseUrl || !pick.model) return { seats: seats || {}, keys: Object.assign({}, keys), migrated: false };
    // A seat let go (`{ none: true }` — dyna.ink's own decider, writer or reader) stays let go, unless the old pick takes it.
    const next = {};
    for (const k of ['decider', 'reader', 'writer']) if (seats && seats[k] && seats[k].none) next[k] = { none: true };
    next.writer = pick;
    if (pick.vision) next.reader = pick;
    const kept = Object.assign({}, keys);
    if (typeof stored.key === 'string' && stored.key) kept[keyId(pick.baseUrl)] = stored.key;
    return { seats: next, keys: kept, migrated: true };
  }

  // ---- the pane ----

  /** Choices in the order the pane offers them: local before hosted (latency first), then the quickest last call, never-called last, then name. */
  function orderChoices(rows) {
    const ms = (r) => (r.ms == null ? Infinity : r.ms);
    return rows.slice().sort((a, b) => (a.local === b.local ? 0 : a.local ? -1 : 1) || (ms(a) === ms(b) ? 0 : ms(a) < ms(b) ? -1 : 1) || String(a.name).localeCompare(String(b.name)));
  }

  /** The seats a model holds, read from the picks kept — the reader, writer and decider, never "any job". */
  function seatsOfPick(seats, pick) {
    if (!seats || !pick) return [];
    return ['reader', 'writer', 'decider'].filter((k) => seats[k] && seats[k].baseUrl && keyId(seats[k].baseUrl) === keyId(pick.baseUrl) && seats[k].model === pick.model);
  }

  /** What is kept of a model: where it is, which it is, what its provider said it can do — never a key. */
  function pickOf(config, extra) {
    const out = { baseUrl: config.baseUrl, model: config.model, kind: config.kind, vision: !!config.vision };
    if (config.title) out.title = config.title;
    // `seat` is what a join was for, not what is kept of the model; a key is never kept.
    if (extra) for (const k of Object.keys(extra)) if (extra[k] !== undefined && k !== 'apiKey' && k !== 'seat') out[k] = extra[k];
    return out;
  }

// ===== seats (the rules) =====
// Provides: the seats' rules, pure (V1-PLAN I7) — SEATS and SEAT_WORDS (what each seat is for), resolveReaders
//   and resolveWriters (who is asked to read and who to write, with the fallback said), fallbackWords (what a seat
//   does when nothing is chosen for it), keyId, keysToKeep and migrateStored (one key a provider; what is kept on
//   the device; an old pick and key become the writer seat), orderChoices (local before hosted, quickest first),
//   seatsOfPick and pickOf (what a kept pick holds, and never a key), and the semantic seat's (I9): SEMANTIC_SOURCE
//   (where its model is asked for), semanticSourceOf (an address read, never a key), semanticNameOf, semanticWords (what
//   its row says), semanticFailed (a load that did not work, in words).
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
//     it sees, else the smallest model that sees. Writer: the one chosen, else every model with no other seat — and
//     Claude Code, while it is seated, stands first of all (J4). Decider: none; the engine's ranking is the answer.
//   - A decider is never a reader or a writer. It is not in the pool of models at all.
//   - One key a provider, entered once, used by every seat on it; kept on the device only for a provider whose key
//     the hand asked to remember; never in a pick, never in the log.

  /** The seats, in the order the pane shows them. */
  const SEATS = ['reader', 'writer', 'decider', 'semantic'];

  /** What each seat is for, in the person's words, and what is asked of it. */
  const SEAT_WORDS = {
    reader: { job: 'reads handwriting into text — a model that can see, quick and exact (OCR)', needs: 'a model that sees' },
    writer: { job: 'writes — briefs, pages, programs, and says what a group is (What is this?)', needs: 'a model' },
    decider: { job: 'chooses between what the engine already holds — which of two matching definitions — and only when it is sure', needs: 'a decision model' },
    semantic: { job: 'notes like this, and search beyond the word typed — on this device, nothing sent anywhere', needs: 'a small model that runs here' },
  };

  /** What a seat does when nothing is chosen for it, in one sentence. */
  function fallbackWords(seat) {
    switch (seat) {
      case 'reader': return 'nothing chosen — Claude Code reads while it is seated, else the writer if it sees, else the smallest joined model that sees';
      case 'writer': return 'nothing chosen — every joined model that holds no other seat is asked, and Claude Code first while it is seated';
      case 'decider': return 'nothing chosen — the engine’s ranking stands, and nothing offers to ask a decision model';
      case 'semantic': return 'nothing chosen — search stays by the words typed and nothing offers notes like this; a small model that runs on this device, with no key and no call, would add both';
      default: return '';
    }
  }

  /**
   * Who is asked to READ writing, from the joined models: `{ id, vision, seats[], size, claude }` each. Returns the ids
   * and why, in a clause. A model that cannot see never reads; a decider never reads.
   */
  function resolveReaders(models) {
    const seers = models.filter((m) => m.vision && !m.seats.includes('decider'));
    const chosen = seers.filter((m) => !m.claude && m.seats.includes('reader'));
    if (chosen.length) return { who: [chosen[0].id], why: 'the reader seat' };
    const claude = seers.find((m) => m.claude);
    if (claude) return { who: [claude.id], why: 'Claude Code, seated' };
    const writer = seers.find((m) => m.seats.includes('writer'));
    if (writer) return { who: [writer.id], why: 'no reader seat — the writer sees' };
    const any = seers.filter((m) => m.seats.length === 0).sort((a, b) => (a.size === b.size ? 0 : a.size < b.size ? -1 : 1));
    if (any.length) return { who: [any[0].id], why: 'no reader seat — the smallest model that sees' };
    return { who: [], why: 'no model that sees' };
  }

  /**
   * Who is asked to WRITE — a brief, a page, a program, *What is this?* — from the joined models. The writer seat
   * when one is chosen; else every model that holds no seat. Claude Code, while seated, stands first (J4). A model
   * that holds only the reader or decider seat is not asked.
   */
  function resolveWriters(models) {
    const claude = models.filter((m) => m.claude);
    const chosen = models.filter((m) => !m.claude && m.seats.includes('writer'));
    const pool = chosen.length ? chosen : models.filter((m) => !m.claude && m.seats.length === 0);
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
    const had = seats && ['reader', 'writer', 'decider', 'any'].some((k) => seats[k]);
    const pick = stored && stored.pick;
    if (had || !pick || !pick.baseUrl || !pick.model) return { seats: seats || {}, keys: Object.assign({}, keys), migrated: false };
    const next = { writer: pick };
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
    return ['reader', 'writer', 'decider'].filter((k) => seats[k] && keyId(seats[k].baseUrl) === keyId(pick.baseUrl) && seats[k].model === pick.model);
  }

  /** What is kept of a model: where it is, which it is, what its provider said it can do — never a key. */
  function pickOf(config, extra) {
    const out = { baseUrl: config.baseUrl, model: config.model, kind: config.kind, vision: !!config.vision };
    if (config.title) out.title = config.title;
    // `seat` is what a join was for, not what is kept of the model; a key is never kept.
    if (extra) for (const k of Object.keys(extra)) if (extra[k] !== undefined && k !== 'apiKey' && k !== 'seat') out[k] = extra[k];
    return out;
  }

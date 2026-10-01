// ===== seats (the rules) =====
// Provides: the seats' rules, pure (V1-PLAN I7) — SEATS and SEAT_WORDS (what each seat is for), resolveReaders
//   and resolveWriters (who is asked to read and who to write, with the fallback said), fallbackWords (what a seat
//   does when nothing is chosen for it), keyId, keysToKeep and migrateStored (one key a provider; what is kept on
//   the device; an old pick and key become the writer seat), orderChoices (local before hosted, quickest first),
//   seatsOfPick and pickOf (what a kept pick holds, and never a key).
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
//     sure) and semantic (on this device — coming). A model holds the seats the hand gave it; one that holds none
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
      case 'semantic': return 'on this device — coming: a small model that runs here, never a key and never a call';
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

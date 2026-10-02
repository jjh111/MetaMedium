// ===== carry (your boards, from the old address to the new home) =====
// Provides: the pure half of RENAME-PLAN N1 — CARRY_OLD_ORIGIN / CARRY_HOME_ORIGIN (the two addresses, fixed),
//   NEW_HOME_NOTICE (the old address's notice that dyna.ink is the new home: OFF until N4 turns it on),
//   isLocalOrigin, carryTarget / carryOpenUrl (where a page carries to, and the address it opens there),
//   carrySources / carryAccepts (whom a page takes boards from), carryOffered / homeNoticeShown (what the boards
//   pane shows), CARRY_TYPES / carryMessage (the messages, read and never trusted), CARRY_PREFS / CARRY_NEVER /
//   keyShaped / carryPrefs / takePrefs (the preferences, by an allowlist of names — never a key), carryMark (the
//   taught mark as its five samples), carryView (a board's zoom and pan), carryEmpty / carryPlan (what a carry
//   brings in: a new entry each, a suffix for a name already here, a log already held said and skipped, the
//   empty first board giving its name up), EVERY_MANIFEST / everyName / everyBuild / everyRead (one file holding
//   every board's .dyna.zip — the fallback, and what the window is sent) and carryWhere / carryWords /
//   carrySentWords (the sentences).
// Uses: NOTHING outside the pure fragments: boardName and BOARD_NAME_MAX (17-boards.js), zipWrite / zipRead /
//   bundleName (17-bundle.js) — called, never at load, so it loads after them and with them in Node:
//   node --test Demos/surface/17-carry.test.mjs
//   22-carry.js is the adapter (the window, the messages, the pane's acts), 17-folder.js writes the boards in and
//   reads them out, 18-out.js makes each board's bundle.
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.
//
// WHY THIS EXISTS. What a person keeps in a browser belongs to the address: boards in IndexedDB (`mm-boards`), the
// pictures beside them (`mm-assets`), the taught mark and every preference in `mm-*` keys. A page at dyna.ink cannot
// read what jjh111.github.io kept, so the old address carries it across: one tap opens dyna.ink in a window of its own,
// the new page says it is ready, and the old one sends it one file — every board as I4's bundle, each board's name,
// the mark's five samples and the preferences. The same file, downloaded, is the fallback: it works offline, between
// devices, and where a window is refused.
//
// THE ORIGINS ARE FIXED, BOTH WAYS. The receiving page takes boards from the old address's origin and from nothing a
// message or an address claims; the sending page posts only to dyna.ink's origin, by name, never to '*'. The one
// exception is for this machine — the gate, and development — and it cannot open a hole on either real address: a
// page served from 127.0.0.1 or localhost may name ANOTHER such origin in its own address (`?carryTo=` on the sender,
// `?carry=` on the receiver, which the sender writes), and a page anywhere else reads neither.
//
// NEVER A KEY. Preferences are gathered by an allowlist of names (CARRY_PREFS), never "every mm- key": the remembered
// model keys, a repository's token, the model picks and a room's key live beside the preferences, and are named in
// CARRY_NEVER so a test can see that they are not carried. A value that looks like a key is left out even under an
// allowed name, and the receiving page reads what arrives through the same allowlist again.
//
// THE LOG IS THE BOARD. Each log goes out as its journal holds it and comes in event for event: nothing here, or in
// the adapters, rewrites an event. A log already held — or carried here before and drawn on since — is not brought in
// twice: it is said to be held and skipped.

  /** The old address: where boards are carried FROM. */
  const CARRY_OLD_ORIGIN = 'https://jjh111.github.io';
  /** The new home: where boards are carried TO. */
  const CARRY_HOME_ORIGIN = 'https://dyna.ink';
  /** The app's path on either: the window opens there. */
  const CARRY_APP_PATH = '/app/';
  /**
   * The notice on the old address — a lasting line in the boards pane, and the status line once — that dyna.ink is the
   * new home, with the tap that carries the boards there. OFF until RENAME-PLAN N4 turns it on, once dyna.ink answers;
   * that unit flips this one constant and nothing else. (The offer itself can be reached before that with `?carryTo`
   * in the old address: carryOffered.)
   */
  const NEW_HOME_NOTICE = false;
  /** The messages between the two windows, and their version; anything else is not ours. */
  const CARRY_V = 1;
  const CARRY_TYPES = { ready: 'mm-carry-ready', ping: 'mm-carry-ping', boards: 'mm-carry', done: 'mm-carry-done' };
  /** The device preferences carried, by name — the localStorage keys, as the surface writes them. Nothing else is. */
  const CARRY_PREFS = [
    'mm-theme', 'mm-hand', 'mm-draws', 'mm-autoRead', 'mm-hand-name',
    'mm-snap', 'mm-panel', 'mm-inspect', 'mm-palette-uses', 'mm-palette-uses-here',
  ];
  /**
   * What a browser keeps beside the preferences and NEVER carries, named so a test can see it is not: a provider's key
   * (`mm-model-key`, `mm-model-keys`), a repository's token, the model picks and the semantic seat's address (a model
   * is joined again at the new home), the folder log's name and the persist ask (this device's, per address), the old
   * board in browser storage, the taught mark (carried as its samples, learned again where it lands) and the help's
   * notice said once. A room's key is never kept at all: it lives in a room's address, which no carry reads.
   */
  const CARRY_NEVER = [
    'mm-model-key', 'mm-model-keys', 'mm-git-token', 'mm-model-pick', 'mm-seats', 'mm-semantic',
    'mm-participant', 'mm-persist-asked', 'mm-log', 'mm-command-mark', 'mm-home-said',
  ];
  /** How long one preference may be, and all of them together, in characters. */
  const CARRY_PREF_MAX = 65536, CARRY_PREFS_MAX = 262144;
  /** The samples a taught mark is learned from (MM.COMMAND_MARK_SAMPLES), and the points one may have. */
  const CARRY_MARK_SAMPLES = 5, CARRY_MARK_POINTS = 4000;
  /** The one file: its manifest, its format and the version this build writes and reads. */
  const EVERY_MANIFEST = 'boards.json';
  const EVERY_FORMAT = 'dyna-boards';
  const EVERY_VERSION = 1;

  // ----- who sends, who takes ---------------------------------------------------------------------------

  /** An origin on this machine: http, 127.0.0.1 or localhost, a port — the origin and nothing more. */
  function isLocalOrigin(o) {
    if (typeof o !== 'string') return false;
    const m = /^http:\/\/(127\.0\.0\.1|localhost):(\d{1,5})$/.exec(o);
    return !!m && +m[2] > 0 && +m[2] < 65536;
  }
  /**
   * Where a page served from `self` carries boards to: dyna.ink from the old address, whatever its address says; from a
   * page on this machine, the other local origin its address names (`asked`); from anywhere else, nowhere (null).
   */
  function carryTarget(self, asked) {
    if (self === CARRY_OLD_ORIGIN) return CARRY_HOME_ORIGIN;
    if (isLocalOrigin(self) && isLocalOrigin(asked) && asked !== self) return asked;
    return null;
  }
  /** The address the window opens: the app at the target, told it is being carried to — and, on this machine, from where. */
  function carryOpenUrl(self, target) {
    return target + CARRY_APP_PATH + (isLocalOrigin(target) ? '?carry=' + encodeURIComponent(self) : '?carry');
  }
  /**
   * The origins a page served from `self` takes boards from: the old address — never itself — and, when the page is on
   * this machine, the other local origin its own address names (`named`). The old address takes from no one.
   */
  function carrySources(self, named) {
    if (self === CARRY_OLD_ORIGIN) return [];
    const out = [CARRY_OLD_ORIGIN];
    if (isLocalOrigin(self) && isLocalOrigin(named) && named !== self) out.push(named);
    return out;
  }
  /** Whether a message's origin is one of them — exactly, as the browser says it. */
  function carryAccepts(allowed, origin) {
    return typeof origin === 'string' && Array.isArray(allowed) && allowed.includes(origin);
  }
  /**
   * Whether the boards pane offers *Carry my boards to dyna.ink*: where the page can carry, once the notice is on — or
   * before, when the address asks (`?carryTo`), so the carry can be tried by hand ahead of N4.
   */
  function carryOffered(o) {
    const q = o || {};
    return !!q.target && (q.notice === true || !!q.asked);
  }
  /** Whether the old address's notice shows: on the old address only, and only once it is on. */
  function homeNoticeShown(self, notice) {
    return notice === true && self === CARRY_OLD_ORIGIN;
  }
  /**
   * A message read: `{ type, … }` with only what that type carries, or null for anything that is not one of ours, of
   * this version, in its shape. `mm-carry` must carry the file as bytes; `mm-carry-done` carries three counts.
   */
  function carryMessage(data) {
    if (!data || typeof data !== 'object' || data.v !== CARRY_V || typeof data.type !== 'string') return null;
    const count = (n) => (Number.isInteger(n) && n >= 0 && n < 1e6 ? n : 0);
    switch (data.type) {
      case CARRY_TYPES.ready: case CARRY_TYPES.ping: return { type: data.type };
      case CARRY_TYPES.boards: return data.file instanceof ArrayBuffer ? { type: data.type, file: data.file } : null;
      case CARRY_TYPES.done: return { type: data.type, brought: count(data.brought), held: count(data.held), failed: count(data.failed) };
      default: return null;
    }
  }

  // ----- what is carried: never a key ----------------------------------------------------------------------
  /** Shapes a key or token takes (scripts/release.mjs keeps the same list for what a release may hold). */
  const KEY_SHAPES = [
    /sk-ant-[A-Za-z0-9_-]{20,}/, /sk-or-v1-[A-Za-z0-9]{20,}/, /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}/,
    /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}/, /\bgithub_pat_[A-Za-z0-9_]{30,}/, /\bAKIA[0-9A-Z]{16}\b/,
    /\bxox[abprs]-[A-Za-z0-9-]{10,}/, /\bAIza[0-9A-Za-z_-]{35}/,
  ];
  /** Whether some text holds something shaped like a key. */
  function keyShaped(s) {
    const t = String(s == null ? '' : s);
    return KEY_SHAPES.some((re) => re.test(t));
  }
  /** Whether a preference may travel: a carried name, a string, not too long, nothing key-shaped in it. */
  function prefTravels(k, v) {
    return CARRY_PREFS.includes(k) && !CARRY_NEVER.includes(k) && typeof v === 'string' && v.length <= CARRY_PREF_MAX && !keyShaped(v);
  }
  /**
   * The preferences carried, read through `read(key)` (localStorage.getItem's shape: the raw string, or null): every
   * name of CARRY_PREFS that holds a value that may travel, as it is held. Nothing else is ever read.
   */
  function carryPrefs(read) {
    const out = {};
    let total = 0;
    for (const k of CARRY_PREFS) {
      let v = null;
      try { v = read(k); } catch (err) { v = null; }
      if (v === null || v === undefined || !prefTravels(k, v)) continue;
      if (total + v.length > CARRY_PREFS_MAX) break;
      total += v.length;
      out[k] = v;
    }
    return out;
  }
  /**
   * The preferences that arrived, taken: only a carried name, a value that may travel, and only where this page holds
   * none — what it already holds stands (`kept`). `read` is as for carryPrefs.
   */
  function takePrefs(incoming, read) {
    const set = {}, kept = [];
    if (!incoming || typeof incoming !== 'object') return { set, kept };
    for (const k of CARRY_PREFS) {
      if (!Object.prototype.hasOwnProperty.call(incoming, k) || !prefTravels(k, incoming[k])) continue;
      let here = null;
      try { here = read(k); } catch (err) { here = null; }
      if (here !== null && here !== undefined) kept.push(k); else set[k] = incoming[k];
    }
    return { set, kept };
  }
  /** One sample's points, x and y only, or null when it is not a stroke. */
  function markStroke(pts) {
    if (!Array.isArray(pts) || pts.length < 2 || pts.length > CARRY_MARK_POINTS) return null;
    const out = [];
    for (const p of pts) {
      if (!p || typeof p !== 'object' || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
      out.push({ x: p.x, y: p.y });
    }
    return out;
  }
  /**
   * The taught mark as it is carried: its five samples (x and y) and when it was taught — never the learned signature,
   * which the page it lands on learns again from the samples. `saved` is the device's record ({ mark, samples, at });
   * anything else, or a mark not taught from five strokes, is null.
   */
  function carryMark(saved) {
    if (!saved || typeof saved !== 'object' || !saved.mark || !Array.isArray(saved.samples) || saved.samples.length !== CARRY_MARK_SAMPLES) return null;
    const samples = saved.samples.map(markStroke);
    if (samples.some((s) => !s)) return null;
    return { samples, at: Number.isFinite(saved.at) ? saved.at : 0 };
  }
  /** A board's view as it travels: zoom, panX, panY, finite, the zoom above nothing — or null. */
  function carryView(v) {
    if (!v || typeof v !== 'object') return null;
    const { zoom, panX, panY } = v;
    return Number.isFinite(zoom) && zoom > 0 && Number.isFinite(panX) && Number.isFinite(panY) ? { zoom, panX, panY } : null;
  }

  // ----- what a carry brings in --------------------------------------------------------------------------------
  /** A board with nothing in its log but the device's mark taught again on opening (17-folder.js's markAfterOpen). */
  function carryEmpty(events) {
    return !(events || []).some((e) => !e || e.type !== 'teach');
  }
  /** A name with a number after it, room left within the limit. */
  function carryNumbered(stem, n) {
    const tail = ' ' + n;
    return stem.slice(0, BOARD_NAME_MAX - tail.length).trim() + tail;
  }
  /**
   * What a carry brings in. `held`: the boards this page keeps — `{ id, name, trashed, empty, hash, carried? }`, `hash`
   * the digest of the log as its journal holds it, `carried` what it was carried as — and `incoming`: `{ key, name, hash }`.
   * Returns `bring` (a new entry each: `{ key, name, hash, from }`, the name its own or with a suffix where a board here
   * has it), `held` (`{ key, name, as }`: a log this page holds already — as it is now, or as it was carried in — said and
   * skipped; the same log twice in one carry comes once) and `empty` (the ids of empty boards on the list whose name a
   * carried board takes: the board a new page opens with, which held nothing, gives its name up to the trash).
   */
  function carryPlan(o) {
    const held = (o && o.held) || [];
    const incoming = (o && o.incoming) || [];
    const asOf = new Map();
    for (const h of held) {
      if (h.hash && !asOf.has(h.hash)) asOf.set(h.hash, h.name);
      if (h.carried && !asOf.has(h.carried)) asOf.set(h.carried, h.name);
    }
    const yielding = held.filter((h) => h.empty && !h.trashed);
    const taken = new Set(held.filter((h) => !(h.empty && !h.trashed)).map((h) => h.name));
    const bring = [], skip = [], empty = [];
    for (const x of incoming) {
      if (x.hash && asOf.has(x.hash)) { skip.push({ key: x.key, name: x.name, as: asOf.get(x.hash) }); continue; }
      const stem = boardName(x.name) || 'Board';
      let name = stem;
      for (let n = 2; taken.has(name); n++) name = carryNumbered(stem, n);
      taken.add(name);
      if (x.hash) asOf.set(x.hash, name);
      for (const e of yielding) if (e.name === name && !empty.includes(e.id)) empty.push(e.id);
      bring.push({ key: x.key, name, hash: x.hash, from: x.name });
    }
    return { bring, held: skip, empty };
  }

  // ----- the one file every board goes out in ----------------------------------------------------------------
  const everyUtf8 = (s) => new TextEncoder().encode(s);
  /** What the file is called: `every-board-<the day>.zip`. */
  function everyName(time) {
    const d = new Date(Number.isFinite(time) ? time : 0);
    const p = (n) => String(n).padStart(2, '0');
    return 'every-board-' + d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()) + '.zip';
  }
  /**
   * Every board in one zip (stored, as the bundles in it are): `boards.json` first — the format, where it came from,
   * each board's file, name and view, the mark's samples and the preferences — then `boards/<nn>-<name>.dyna.zip`, each
   * board's bundle untouched. `boards`: `[{ name, view?, bytes }]`. Returns zipWrite's `{ parts, size }`.
   */
  function everyBuild(o) {
    const files = [], list = [];
    (o.boards || []).forEach((b, i) => {
      const file = 'boards/' + String(i + 1).padStart(2, '0') + '-' + bundleName(b.name);
      files.push({ name: file, data: b.bytes });
      list.push({ file, name: String(b.name || ''), view: carryView(b.view) });
    });
    const prefs = {};
    for (const k of Object.keys(o.prefs || {})) if (prefTravels(k, o.prefs[k])) prefs[k] = o.prefs[k];
    const manifest = { format: EVERY_FORMAT, version: EVERY_VERSION, from: String(o.from || ''), at: Number.isFinite(o.time) ? o.time : 0, boards: list, mark: o.mark || null, prefs };
    return zipWrite([{ name: EVERY_MANIFEST, data: everyUtf8(JSON.stringify(manifest)) }].concat(files), { time: o.time });
  }
  /**
   * Every board read back, never trusted: `{ ok: true, from, at, boards: [{ name, view, bytes } | { name, view, bad }],
   * mark, prefs }` — each board's bundle as it stands in the file (its own reader checks its log and its pictures), a
   * board whose entry is damaged or missing said in `bad`, the mark only as five strokes, the preferences only by the
   * allowlist. `{ ok: false, notEvery: true, words }` for a zip with no manifest (a single board's bundle, say),
   * `{ ok: false, unread: true, words }` for bytes that are no zip that can be read, and `{ ok: false, words }` for a
   * manifest that cannot be. Never throws. `o.inflate` as zipRead's.
   */
  async function everyRead(bytes, o) {
    try {
      const z = await zipRead(bytes, o);
      if (!z.ok) return { ok: false, unread: true, words: z.words };
      const base = (n) => n.slice(n.lastIndexOf('/') + 1);
      const man = z.entries.filter((e) => base(e.name) === EVERY_MANIFEST).sort((a, b) => a.name.split('/').length - b.name.split('/').length)[0];
      if (!man) return { ok: false, notEvery: true, words: 'this zip holds no ' + EVERY_MANIFEST + ', so it is not every board in one file' };
      if (man.bad) return { ok: false, words: 'the list of boards in this file is damaged (' + man.bad + ') — nothing was opened' };
      let m = null;
      try { m = JSON.parse(new TextDecoder().decode(man.data)); } catch (err) { m = null; }
      if (!m || typeof m !== 'object' || m.format !== EVERY_FORMAT) return { ok: false, words: 'the list of boards in this file could not be read — nothing was opened' };
      if (!Number.isInteger(m.version) || m.version < 1) return { ok: false, words: 'the list of boards in this file names no version this build reads — nothing was opened' };
      if (m.version > EVERY_VERSION) return { ok: false, words: 'this file is version ' + m.version + ' of every board in one file, and this build reads version ' + EVERY_VERSION + ' — nothing was opened; open it with a newer dyna.ink' };
      const dir = man.name.slice(0, man.name.length - EVERY_MANIFEST.length);
      const byName = new Map(z.entries.map((e) => [e.name, e]));
      const boards = [];
      for (const b of Array.isArray(m.boards) ? m.boards : []) {
        if (!b || typeof b !== 'object') continue;
        const name = typeof b.name === 'string' ? b.name : '';
        const view = carryView(b.view);
        const file = typeof b.file === 'string' && /^boards\/[^/]+\.zip$/.test(b.file) ? dir + b.file : null;
        const e = file ? byName.get(file) : null;
        if (!e) { boards.push({ name, view, bad: 'it is not in the file' }); continue; }
        if (e.bad) { boards.push({ name, view, bad: e.bad }); continue; }
        boards.push({ name, view, bytes: e.data });
      }
      const mark = m.mark && typeof m.mark === 'object' ? carryMark({ mark: true, samples: m.mark.samples, at: m.mark.at }) : null;
      const prefs = {};
      if (m.prefs && typeof m.prefs === 'object') for (const k of Object.keys(m.prefs)) if (prefTravels(k, m.prefs[k])) prefs[k] = m.prefs[k];
      return { ok: true, from: typeof m.from === 'string' ? m.from : '', at: Number.isFinite(m.at) ? m.at : 0, boards, mark, prefs };
    } catch (err) {
      return { ok: false, words: 'this file could not be read (' + ((err && err.message) || err) + ') — nothing was opened' };
    }
  }

  // ----- the sentences ------------------------------------------------------------------------------------------
  const carryCount = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's');
  const carryList = (xs) => (xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]);
  /** Where boards came from or went, in a few words: the old address, dyna.ink, the file — or a host on this machine. */
  function carryWhere(origin) {
    if (origin === CARRY_OLD_ORIGIN) return 'the old address';
    if (origin === CARRY_HOME_ORIGIN) return 'dyna.ink';
    if (origin === 'file') return 'the file';
    return String(origin || '').replace(/^https?:\/\//, '') || 'elsewhere';
  }
  /**
   * What a carry did, said where it landed: `{ from, brought: [{ name, pictures }], held: [{ name, as }], failed:
   * [{ name, why }], damaged, mark: 'taught' | 'same' | 'kept' | null, prefs, emptied: [name] }`.
   */
  function carryWords(r) {
    const from = carryWhere(r.from);
    const brought = r.brought || [], held = r.held || [], failed = r.failed || [];
    const parts = [];
    if (brought.length) {
      const pics = brought.reduce((a, b) => a + (b.pictures || 0), 0);
      parts.push(carryCount(brought.length, 'board') + ' came from ' + from + ' — ' + carryList(brought.map((b) => '“' + b.name + '”')) + (pics ? ', with ' + carryCount(pics, 'picture') : ''));
      if (held.length) parts.push(held.length === 1 ? '“' + held[0].name + '” was here already' : held.length + ' were here already');
    } else if (held.length) {
      parts.push('nothing new from ' + from + ' — ' + (held.length === 1 ? '“' + held[0].name + '” is' : held.length === 2 ? 'both boards are' : 'all ' + held.length + ' boards are') + ' here already');
    } else if (!failed.length) parts.push('no boards came from ' + from + ' — it had none with anything on them');
    for (const f of failed) parts.push('“' + (f.name || 'a board') + '” could not be read (' + f.why + ') and stayed behind');
    if (r.damaged) parts.push(carryCount(r.damaged, 'picture') + (r.damaged === 1 ? ' was' : ' were') + ' damaged and ' + (r.damaged === 1 ? 'stands as its name' : 'stand as their names'));
    if (r.mark === 'taught') parts.push('your mark came too');
    else if (r.mark === 'kept') parts.push('the mark taught here was kept — the one from ' + from + ' was not');
    if (r.prefs) parts.push(carryCount(r.prefs, 'preference') + ' came too');
    for (const n of r.emptied || []) parts.push('the empty “' + n + '” this page began with is in the trash');
    return parts.join(' · ');
  }
  /** What a carry did, said where it began: `{ target, brought, held, failed }` — the counts the new page sent back. */
  function carrySentWords(r) {
    const to = carryWhere(r.target);
    if (!r.brought && r.held && !r.failed) return 'nothing new to carry — ' + (r.held === 1 ? 'the board is' : r.held === 2 ? 'both boards are' : 'all ' + r.held + ' boards are') + ' on ' + to + ' already';
    const tail = [];
    if (r.held) tail.push(r.held + (r.held === 1 ? ' was' : ' were') + ' there already');
    if (r.failed) tail.push(r.failed + ' could not be read there');
    return carryCount(r.brought || 0, 'board') + ' carried to ' + to + (tail.length ? ' — ' + tail.join(', ') : '');
  }

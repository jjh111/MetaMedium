// ===== boards (the list) =====
// Provides: several named boards this browser keeps (V1-PLAN §9 R1) — the pure half: boardName (a
//   name as typed), boardShelves (the boards, the trash, the recent places), listPlan (R3's board as
//   the first entry), nextBoardName / newBoardEntry / copyName / copyEntry / renamed / trashed /
//   restored (the entries), pickBoard (which board a page opens), nextAfter (where the page goes when
//   the board on screen goes to the trash), emptyTrashPlan (what emptying the trash will take, said
//   plainly), agoWords / sizeWords / kindWords / boardRows (what the pane shows), countMarks / statsOf
//   / statsAfter (what a board holds, kept up as records land), placeEntry / placesPlan (folders,
//   repositories and sites as recent places), leaveVerdict (whether the board on screen may be left),
//   switchPlan (what opening an entry does), boardTitle / boardSearch (the page's title and address),
//   and the examples (R5) — EXAMPLES_BASE / exampleUrl (where boards/examples stands from the page),
//   exampleRows (the pane's Examples, read from the index and never trusted), exampleName (what a board
//   made from one is called), starterOf (which one a first run's tap opens).
// Uses: NOTHING. Like 17-board.js (R3's journal: ONE board's log) this fragment names no closure
//   variable and touches no DOM, no storage and no session; 17-folder.js is the adapter (IndexedDB,
//   the lock, the switch) and 22-boards.js the pane. Tested on its own in Node:
//   node --test Demos/surface/17-boards.test.mjs
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.
//
// A BOARD IS ITS LOG. Each board is its own R3 journal, keyed by the board's id; its entry in the
// list says what it is called, when it was made, opened, and put in the trash — and nothing of what
// it holds. The NAME IS SHOWN, NEVER USED AS THE KEY: a rename changes one field of one entry, so it
// can never orphan a journal, and two boards may share a name. The board R3 kept is the first entry,
// under the key R3 kept it under ("default"), unchanged.
//
// NOTHING IS ONE TAP FROM LOST. Deleting moves a board to the trash, from which it comes back whole;
// only emptying the trash deletes, it is its own act, and what it will take is said — by name, with
// what each holds, "for good" — before it happens. A board open in another tab is never emptied.

  const FIRST_BOARD = 'default';
  const FIRST_BOARD_NAME = 'My board';
  const BOARD_NAME_MAX = 80;
  /** How many recent places (folders, repositories, sites) the list remembers. */
  const RECENT_MAX = 12;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /** A name as typed: its runs of space collapsed, trimmed, not too long. Nothing is not a name (null). */
  function boardName(raw) {
    if (typeof raw !== 'string') return null;
    const t = raw.replace(/\s+/g, ' ').trim();
    return t ? t.slice(0, BOARD_NAME_MAX).trim() : null;
  }
  /** A board this browser keeps — as against a place (a folder, a repository, a site) it only remembers. */
  function isKept(e) { return !!e && e.kind === 'board'; }

  const idOrder = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const byMade = (a, b) => (a.created || 0) - (b.created || 0) || idOrder(a, b);
  const byOpened = (a, b) => (b.opened || 0) - (a.opened || 0) || byMade(a, b);

  /**
   * The list, shelved: the boards in the order they were made (a list whose rows keep their
   * places), the trash newest first, the recent places most recently opened first.
   */
  function boardShelves(entries) {
    const all = (entries || []).filter(Boolean);
    const kept = all.filter(isKept);
    return {
      boards: kept.filter((e) => !e.trashed).sort(byMade),
      trash: kept.filter((e) => e.trashed).sort((a, b) => b.trashed - a.trashed || byMade(a, b)),
      places: all.filter((e) => !isKept(e)).sort(byOpened),
    };
  }

  /**
   * The list as read, and what to write so it holds a board: a list with no board at all — the
   * first read of a browser that kept one board under R3, or none — gets R3's board as its first
   * entry, "My board", under R3's own key (its journal is not moved, renamed or rewritten). A list
   * whose every board is in the trash is left alone: which board opens is pickBoard's to say.
   * `meta` is R3's meta record for that key, when there is one (its `created` is kept).
   */
  function listPlan(entries, now, meta) {
    entries = entries || [];
    if (entries.some(isKept)) return { entries, put: [] };
    const first = { id: FIRST_BOARD, kind: 'board', name: FIRST_BOARD_NAME, created: (meta && meta.created) || now, opened: 0, trashed: 0 };
    return { entries: entries.concat([first]), put: [first] };
  }

  /** A name for a new board: "My board" when there is no other on the list, else "Board 2", "Board 3" … (a name in the trash is taken). */
  function nextBoardName(entries) {
    const kept = (entries || []).filter(isKept);
    if (!kept.some((e) => !e.trashed)) return FIRST_BOARD_NAME;
    const taken = new Set(kept.map((e) => e.name));
    for (let n = 2; ; n++) if (!taken.has('Board ' + n)) return 'Board ' + n;
  }
  /** A new board's entry. `id` is minted by the adapter; `name`, as typed, or the next free one. */
  function newBoardEntry(entries, id, now, name) {
    return { id, kind: 'board', name: boardName(name) || nextBoardName(entries), created: now, opened: 0, trashed: 0 };
  }
  /** "Sketch copy", then "Sketch copy 2" … — room is left for the suffix, so a long name still gets one. */
  function copyName(entries, name) {
    const stem = (boardName(name) || FIRST_BOARD_NAME).slice(0, BOARD_NAME_MAX - 16).trim() + ' copy';
    const taken = new Set((entries || []).filter(isKept).map((e) => e.name));
    if (!taken.has(stem)) return stem;
    for (let n = 2; ; n++) if (!taken.has(stem + ' ' + n)) return stem + ' ' + n;
  }
  /** A copy's entry: its own id — so its own journal — and where it came from. */
  function copyEntry(entries, src, id, now) {
    return { id, kind: 'board', name: copyName(entries, src && src.name), created: now, opened: 0, trashed: 0, from: src ? src.id : null };
  }
  /** The same entry — the same id, so the same journal — under a new name; null when there is nothing to change. */
  function renamed(entry, raw) {
    const name = boardName(raw);
    if (!entry || !name || name === entry.name) return null;
    return Object.assign({}, entry, { name });
  }
  function trashed(entry, now) { return Object.assign({}, entry, { trashed: now || 1 }); }
  function restored(entry) { return Object.assign({}, entry, { trashed: 0 }); }

  /**
   * Which board a page opens: the one the address names — out of the trash, if it was there (it is
   * being used) — else the one opened most recently (never opened: the first made), else a new one.
   * An id this browser does not hold is `missing`, and said; a place is not a board.
   */
  function pickBoard(entries, requested) {
    const kept = (entries || []).filter(isKept);
    if (requested) {
      const e = kept.find((x) => x.id === requested);
      if (e) return { id: e.id, restore: !!e.trashed, missing: null, make: false };
    }
    const missing = requested || null;
    const live = kept.filter((e) => !e.trashed).sort(byOpened);
    if (!live.length) return { id: null, restore: false, missing, make: true };
    return { id: live[0].id, restore: false, missing, make: false };
  }
  /** Where the page goes when the board on screen goes to the trash: the board opened most recently among the rest, or null (a new one). */
  function nextAfter(entries, leavingId) {
    const live = (entries || []).filter((e) => isKept(e) && !e.trashed && e.id !== leavingId).sort(byOpened);
    return live.length ? live[0].id : null;
  }

  const listWords = (xs) => (xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]);
  /** What a board holds, in marks: "42 marks", "1 mark", "empty". */
  function marksWords(stat) {
    if (!stat) return 'size not known yet';
    if (!stat.events && !stat.marks) return 'empty';
    return stat.marks + ' mark' + (stat.marks === 1 ? '' : 's');
  }
  function bytesWords(chars) {
    const c = chars || 0;
    if (c < 1024) return 'under 1 KB';
    if (c < 1024 * 1024) return Math.round(c / 1024) + ' KB';
    return (c / (1024 * 1024)).toFixed(1) + ' MB';
  }
  /** Roughly how big a board is: its marks and what its records take in the browser's store. */
  function sizeWords(stat) {
    if (!stat) return 'size not known yet';
    if (!stat.events && !stat.marks) return 'empty';
    return marksWords(stat) + ' · ' + bytesWords(stat.chars);
  }

  /**
   * What emptying the trash will take, said before it happens. `held` — the ids whose lock another
   * tab holds: a board open there is never emptied out from under it, and the sentence says so.
   * @returns {{ gone: Array, kept: Array, words: string }}
   */
  function emptyTrashPlan(entries, stats, held) {
    const bin = boardShelves(entries).trash;
    const heldSet = new Set(held || []);
    const gone = bin.filter((e) => !heldSet.has(e.id));
    const kept = bin.filter((e) => heldSet.has(e.id));
    if (!bin.length) return { gone, kept, words: 'the trash is empty' };
    const stat = (e) => (stats && stats[e.id]) || null;
    let words = gone.length
      ? gone.length + ' board' + (gone.length === 1 ? '' : 's') + ' will be deleted for good — ' +
        listWords(gone.map((e) => '“' + e.name + '” (' + marksWords(stat(e)) + ')')) + '. This cannot be undone.'
      : 'nothing in the trash can be deleted now.';
    if (kept.length) {
      const one = kept.length === 1;
      words += ' ' + listWords(kept.map((e) => '“' + e.name + '”')) + (one ? ' is' : ' are') + ' open in another tab — ' +
        (one ? 'it stays' : 'they stay') + ' in the trash until that tab lets ' + (one ? 'it' : 'them') + ' go.';
    }
    return { gone, kept, words };
  }

  /** When, in a few words: "just now", "4 min ago", "3 h ago", "yesterday", "4 days ago", "2 Aug", "2 Aug 2025". */
  function agoWords(ms, now) {
    if (!ms) return '';
    const d = Math.max(0, now - ms);
    if (d < 60000) return 'just now';
    if (d < 3600000) return Math.floor(d / 60000) + ' min ago';
    if (d < 86400000) return Math.floor(d / 3600000) + ' h ago';
    if (d < 2 * 86400000) return 'yesterday';
    if (d < 7 * 86400000) return Math.floor(d / 86400000) + ' days ago';
    const t = new Date(ms);
    return t.getDate() + ' ' + MONTHS[t.getMonth()] + (t.getFullYear() !== new Date(now).getFullYear() ? ' ' + t.getFullYear() : '');
  }

  /** The strokes in a log: a board's marks, drawn (an erase is a reading of the log, not a removal from it). */
  function countMarks(events) {
    let n = 0;
    for (const ev of events || []) if (ev && ev.type === 'stroke') n++;
    return n;
  }
  /** What a board holds: when it last changed, its events, its marks, and the characters its records take. */
  function statsOf(events, chars, now) {
    return { changed: now, events: (events || []).length, marks: countMarks(events), chars: chars || 0 };
  }
  /**
   * The same, after a record lands (written in the record's own transaction by the adapter).
   * `events` is the log the record brings the store to. A whole log compacts the store, so its
   * characters are the store's; anything else adds its own (an undo's cut record included).
   */
  function statsAfter(stats, rec, events, now) {
    const chars = rec.base === 0 ? rec.text.length : ((stats && stats.chars) || 0) + rec.text.length;
    return { changed: now, events: rec.base + rec.n, marks: countMarks(events), chars };
  }

  /** What kind an entry is, as the list says it. */
  function kindWords(kind) {
    return { board: 'kept in this browser', folder: 'folder', git: 'repository', static: 'site', live: 'room' }[kind] || String(kind || '');
  }
  /**
   * A place opened on the page — a folder, a repository, a site — as a recent entry. `spec` is how it
   * is opened again: a repository's owner/repo[@branch][/dir], a site's base; never a token (a key
   * never enters this list). A folder's handle, where the browser keeps one, the adapter adds.
   */
  function placeEntry(kind, spec, name, now) {
    return { id: kind + ':' + spec, kind, name: name || spec, spec, opened: now };
  }
  /** Remembering a place: it goes (or moves) to the top; past RECENT_MAX the oldest are dropped. Boards never are. */
  function placesPlan(entries, entry) {
    const others = (entries || []).filter((e) => e && !isKept(e) && e.id !== entry.id).sort(byOpened);
    return { put: entry, drop: others.slice(RECENT_MAX - 1).map((e) => e.id) };
  }

  /** The rows the pane shows, in the shelves' order: the board here marked, when and how big, places by kind, the trash with its date. */
  function boardRows(entries, stats, now, currentId) {
    const sh = boardShelves(entries);
    const st = (id) => (stats && stats[id]) || null;
    const when = (verb, ms) => (ms ? verb + ' ' + agoWords(ms, now) : '');
    return {
      boards: sh.boards.map((e) => ({ id: e.id, name: e.name, here: e.id === currentId, when: when('changed', st(e.id) && st(e.id).changed), size: sizeWords(st(e.id)) })),
      places: sh.places.map((e) => ({ id: e.id, k: e.kind, kind: kindWords(e.kind), name: e.name, here: e.id === currentId, when: when('opened', e.opened) })),
      trash: sh.trash.map((e) => ({ id: e.id, name: e.name, when: when('deleted', e.trashed), size: sizeWords(st(e.id)) })),
    };
  }

  /**
   * Whether the board on screen may be left (a switch, a folder opened over it). `s`: the journal's
   * snapshot, and the board's name. null — the store holds all of it; 'busy' — a record is on its way
   * (the adapter waits, then asks again); 'unsaved' / 'not-kept' — said, with the ways out: the log
   * as a file, or leaving it anyway, which is the person's call and a second, deliberate tap.
   */
  function leaveVerdict(s) {
    if (!s || s.state === 'off') return null;
    const name = '“' + (s.name || 'this board') + '”';
    const ways = ['export', 'leave'];
    if (s.state === 'readonly' || (s.state === 'armed' && s.trouble)) {
      if (s.state === 'readonly' && !s.dirty) return null; // nothing drawn here, nothing to keep
      const tab = s.trouble && (s.trouble.kind === 'tab' || s.trouble.kind === 'elsewhere');
      if (tab) return { kind: 'not-kept', words: name + ' is open in another tab, and what was drawn on it here was not kept — export the log to keep it, or leave it as that tab has it', ways };
      return { kind: 'unsaved', words: name + ' is not saved' + (s.trouble && s.trouble.kind === 'full' ? ' (the browser\'s storage is full)' : '') + ' — export the log to keep it, or leave it and lose what was not saved', ways };
    }
    if (s.state === 'armed') return s.inFlight || s.dirty || s.needWhole ? { kind: 'busy' } : null;
    return { kind: 'busy' }; // 'waiting': the store is still being opened
  }

  /**
   * What opening an entry of the list does. 'here' — it is on screen; 'switch' — in place, the board
   * on screen flushed first; 'navigate' — a folder, a repository or a room is on screen, and the board
   * opens in a page of its own; 'place' — a folder, a repository or a site, opened the way its tile
   * opens it; 'missing' — not on the list (emptied from the trash in another tab, say).
   */
  function switchPlan(o) {
    const e = (o.entries || []).find((x) => x && x.id === o.target);
    if (!e) return { go: 'missing', id: o.target };
    if (!isKept(e)) return { go: 'place', id: e.id };
    if (o.onBoard && o.current === e.id) return { go: 'here', id: e.id };
    return { go: o.onBoard ? 'switch' : 'navigate', id: e.id, restore: !!e.trashed };
  }

  // ----- The examples (V1-PLAN R5) ---------------------------------------------------------------
  // boards/examples/ is a folder of logs and an index (scripts/examples.mjs makes them). Opening one is
  // opening a COPY: the adapter reads the file and makes a board of its own from its events, so the example
  // is never written, and what a hand draws on the copy is the hand's. The index is read, not trusted.

  /** Where the examples stand, from the app (/app/) and the old address alike: both sit one folder below the site's root, as Demos/ does. */
  const EXAMPLES_BASE = '../boards/examples/';
  const exampleUrl = (file) => EXAMPLES_BASE + file;
  /** A log's file name as the examples folder holds one: a name and .jsonl, never a path and never another site's. */
  const EXAMPLE_FILE = /^[a-z0-9][a-z0-9-]*\.jsonl$/;

  /**
   * The rows the pane shows for the examples, in the index's order: an id, a name, what it shows, the file,
   * and what it holds in words. A list that cannot be read is no rows; a row with no name, an id seen
   * before, or a file that is not one of the folder's logs is left out — nothing throws.
   */
  function exampleRows(index) {
    const list = index && typeof index === 'object' && Array.isArray(index.examples) ? index.examples : [];
    const seen = new Set();
    const rows = [];
    for (const e of list) {
      if (!e || typeof e !== 'object' || typeof e.id !== 'string' || !e.id || seen.has(e.id)) continue;
      const name = boardName(e.name);
      if (!name || typeof e.file !== 'string' || !EXAMPLE_FILE.test(e.file)) continue;
      seen.add(e.id);
      const n = e.marks;
      rows.push({ id: e.id, name, says: typeof e.says === 'string' ? e.says : '', file: e.file, words: Number.isInteger(n) && n >= 0 ? marksWords({ events: n, marks: n }) : '' });
    }
    return rows;
  }
  /** What a board made from an example is called: "Flowchart example", then "Flowchart example 2" … (a name in the trash is taken). */
  function exampleName(entries, row) {
    const stem = (boardName(row && row.name) || 'Board').slice(0, BOARD_NAME_MAX - 20).trim() + ' example';
    const taken = new Set((entries || []).filter(isKept).map((e) => e.name));
    if (!taken.has(stem)) return stem;
    for (let n = 2; ; n++) if (!taken.has(stem + ' ' + n)) return stem + ' ' + n;
  }
  /** The example a first run's tap opens: the index's own choice when it can be opened, else the first one, else none. */
  function starterOf(index) {
    const rows = exampleRows(index);
    if (!rows.length) return null;
    const want = index && index.starter;
    return rows.some((r) => r.id === want) ? want : rows[0].id;
  }

  /** The page's title: the board's name first. */
  function boardTitle(name) { return name ? name + ' — MetaMedium' : 'MetaMedium'; }
  /**
   * The page's address on board `id`: `board=` set (in the place it had, or last), everything else
   * kept — except what would make the board not this board on a reload: `fresh` (a fresh start
   * replaces the board at its first change), and a folder, a repository, a room or a figure.
   */
  function boardSearch(search, id) {
    const drop = { fresh: 1, folder: 1, git: 1, live: 1, relay: 1, replay: 1, embed: 1 };
    const out = [];
    let said = false;
    for (const p of String(search || '').replace(/^\?/, '').split('&')) {
      if (!p) continue;
      let k;
      try { k = decodeURIComponent(p.split('=')[0]); } catch (err) { k = p.split('=')[0]; }
      if (drop[k]) continue;
      if (k === 'board') { if (!said) { out.push('board=' + encodeURIComponent(id)); said = true; } continue; }
      out.push(p);
    }
    if (!said) out.push('board=' + encodeURIComponent(id));
    return '?' + out.join('&');
  }

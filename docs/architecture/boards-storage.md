# Boards, storage, the app address, the log format, pictures and exports

> Part of the engineering reference that `CLAUDE.md` indexes. The code is the truth; this says why it is shaped so.

## The folder is the canvas (v8, WP-11)

> `core/src/store/` (the seam and three backends);
> `Demos/surface/17-folder.js`.

Nothing is invented: a canvas is a folder. *Open a folder…* walks it for
every file of a known kind (skipping `node_modules` and its kin, stopping
at 400 files and saying so) and each becomes an artifact of its kind
through an `import` event **in this participant's log**, laid out as
cards; a second machine that pulls sees the same board and discovers
nothing twice. Logs are one file per participant under
`.metamedium/logs/` (the folder format keeps the old name, RENAME-PLAN §2), one event per line — **a header line first, since R2
(*The log format*, below)** — and the canvas is `mergeLogs` of
them; **autosave** rewrites only this participant's file. A static site is opened read-only through
`.metamedium/manifest.json` (`?folder=<base>`), so a published canvas can be
drawn on and the ink stays the reader's. **The live budget**: the nearest
twelve live artifacts render; the rest stand as parked cards — except that
**a playing artifact is never parked** (its clock is running, and a card in
its place would silence it; found when a program past the budget never
started). A cross-origin frame that is off-screen is throttled by the
browser itself, so a playing program out of view reports late until it is
back. Grid and
focus are lenses over the same log. **A repository is a folder too**
(`store/git.ts`, `?git=owner/repo`): the tree in one request, files by
path, this participant's log committed as one file; reads need no token,
writes need one the user pasted. **The page is installable**, at the app's
address and at its old one: a manifest and a service worker cache the shell
for offline; every request is network-first with the cache as the fallback
(*One app address, versioned*, below). **Loops do not depend on paint**: a tab
the browser stops painting gets no animation frames, so the tank and the
worker take a timer's tick when no frame comes (`nextFrame` in
`01-view.js`) — time is state, not a movie.

**With no folder, the board is kept in this browser** (V1-PLAN R3;
`Demos/surface/17-board.js` decides, `17-folder.js` acts): in IndexedDB
(`mm-boards`), as an **append-only journal**. A record is `{ base, text }` —
keep the first `base` events, then append these — so a stroke is one event
written and an undo is a cut, never a rewrite; a record with base 0 is the
whole log, starts a chain, and its transaction deletes every record before it.
**A change is written in the task that made it**: the journal is the session's
*first* listener, ahead of the paint (a release on a big board paints for
seconds), and the transaction is begun and committed before `append` returns —
so a tab that dies right after a release keeps the stroke. That is claimed by
the kill test alone (`node e2e/run.mjs keep`: the renderer crashed or the tab
closed at random points — after a release, during one, mid-stroke, after an
undo — and every completed stroke is on the reopened board, in order).
`pagehide` and `visibilitychange` flush what is not yet written (a folder's or
a room's pending save too); a reload brings the board back. **The old way** — the whole log as one string in
browser storage (`mm-log`), rewritten 900 ms after the last change — stopped
saving at about 1,500 marks and swallowed the error (PERF.md); that board is
**imported once, unchanged**, the first time the store opens, and the key is
removed only when the write has landed. **One tab writes a board** (a Web Lock per
board, held while the page is on it): a second tab shows it and writes nothing,
and when the first lets go it takes over — unless the board was written since
it opened.
**A save that fails is never silent**: the status line LEADS with it, whatever
else it says, until a save succeeds — *not saved — the browser's storage for
this page is full* (or: this browser will not let the page keep anything, a
private window or blocked site data; this board is open in another tab; the
folder refused the write) — with its ways out as buttons in the sentence:
*export the log*, and *open a folder* where the browser can, which carries this
board into the folder (`keepBoardIn`) rather than letting the folder's replace
it. A failed write is retried as the whole log after a pause and on a timer.
With no IndexedDB, browser storage is the store as before, and fails out loud
the same way. **Whose board a page is** (`boardMode`): a live room keeps no
local log (L1); a replay and an embed are figures and never read or write the
reader's board (the whitepaper embeds both, on the canvas's origin); a folder
or repository named in the URL is its own; `?fresh=1` starts empty and replaces
what is kept at its first change, as it always did (a test's page, never an
address the surface writes).

**Several boards** (V1-PLAN R1, acceptance A8; `17-boards.js` decides — pure,
tested in Node — `17-folder.js` acts, `22-boards.js` is the pane). **A board is
its log**: each is its own journal, keyed by the board's id (records under
`[id, seq]`, meta under `id`), and the list — IndexedDB version 2 adds the
`boards` store — holds one entry a board: its name, when it was made, opened and
put in the trash, and nothing of what it holds. **The name is shown, never the
key**, so a rename is one field of one entry, never orphans a journal, and two
boards may share a name. R3's board is the first entry, **"My board"**, under
the key R3 kept it under (`default`), untouched. A board's meta also says what
it holds — when it last changed, its events, marks and characters — written in
the same transaction as each record, so the list is right after a kill.
**Where it lives in the chrome**: the control centre's *boards* tile, in a fixed
slot after *help*, its face the name of what is on screen; it opens a pane
under the bar (one pane at a time), built from the pane and chip components:
*New board*, *from a file…* (a log as *export* writes it becomes a board), each
board with when it changed and roughly how big it is (*42 marks · 12 KB*), the
board on screen marked *here*, and *rename*, *duplicate*, *delete*; the folders,
repositories and sites opened lately as **recent places**, each saying its kind,
opened again the way their tile opens them (a folder's handle kept where the
browser can; never a room, never a key); and **the trash**. **Delete moves a
board to the trash** with one tap and loses nothing — *restore* brings it back
whole; **emptying the trash is its own act, said plainly before it happens**
(*1 board will be deleted for good — “Sketches” (42 marks). This cannot be
undone.*), a second, deliberate tap; and a board another tab holds is never
emptied out from under it (its lock is taken for the delete, and the pane says
why it stayed). **Reset** is a fresh board under the same name, what the old
one held in the trash — never one tap from losing it (`20-controls.js`; the
old handler in `07-input.js`, which emptied the board, is gone). **`?board=<id>`**
opens a board; with none, the board opened last; an id this browser does not
hold is said. The title carries the name, the address the id, and **the view
comes back per board** (zoom and pan: a device preference per board id, not the
log; the minimap follows). **Switching is in place and flushes the board being
left**: the next board's lock and records are read while the one on screen goes
on being written; then it is flushed and waited on until its store holds all of
it — or the switch is refused and said in the pane, with *export the log* and
*leave it anyway* (a second tap) — and only then, in one task with nothing
awaited, is it left and the next loaded, so no stroke can land between. From a
folder, a repository or a room a board opens in a page of its own, after the
folder's save; opening a folder or joining a room from a board waits the same
way, and a board that is not saved stops it (the line's *open a folder* carries
that board in instead). The kill test runs across switches (two boards, switched mid-session,
killed right after a switch and in the middle of one; both whole). The list
never stands between a board and its journal: an entry the store refuses (full)
is held and written once a record lands. With no IndexedDB there is one board
and the pane says so.
**A picture's bytes are not in a board's journal** (PLAN-IPAD-NOTES I1): the events name an asset kept in
`mm-assets` beside it (*Pictures: kept, drawn and traced on request*, below) — a duplicate names the same assets, the
trash keeps them, and emptying the trash is when the ones no board uses are collected.

**Carried to the new home** (RENAME-PLAN N1; `17-carry.js` decides — pure, tested in Node with `17-boards.js` and
`17-bundle.js` — `22-carry.js` is the window and the messages, `17-folder.js` writes the boards in (`carryIn`) and
`18-out.js` takes them out (`everyBoardsOut`); `22-boards.js` shows it; e2e `carry`). What a browser keeps belongs to
the address, so a person moving from `jjh111.github.io` to dyna.ink carries it: **Carry my boards to dyna.ink** in the
boards pane opens `https://dyna.ink/app/?carry` in a window **inside the tap's own handler**, before anything is
awaited (or the browser blocks it); the new page, once its boards are open, says it is ready; the old one sends ONE
message — every board in one file as transferred bytes, the same file **Every board out** downloads (the fallback,
offline, between devices, where a window is refused): `boards.json` (each board's name and view, the mark's five
samples, the preferences) and each board's I4 bundle, untouched — and the new page answers with three counts, never a
name it holds. **The origins are fixed both ways**: the receiver takes boards only from `https://jjh111.github.io`
(`carrySources`), from the window that opened it; the sender posts only to `https://dyna.ink` by name, never `'*'`
(`carryTarget`). A page on this machine (`127.0.0.1` or `localhost`, any port) — the gate, development — may name
another such origin in its own address (`?carryTo=` on the sender, `?carry=<origin>` on the receiver, which the sender
writes), and a page anywhere else reads neither, so production has no hole. **Never a key**: preferences go by an
allowlist of names (`CARRY_PREFS`), never "every `mm-` key"; the remembered model keys, a repository's token, the model
picks and the semantic seat's address are named in `CARRY_NEVER`, a value shaped like a key is left out even under an
allowed name, and the receiver reads what arrives through the allowlist again; a room's key lives only in a room's
address, which no carry reads. **The log is the board**: each board comes in as a new entry, its pictures stored first
(hashes checked), then its log event for event; a name a board here has takes a number; a log already held — or
carried here before (`entry.carried`, the digest it came as) and drawn on since — is said and skipped, so carrying twice
brings nothing twice; the mark is learned again from its samples where none is held; a preference is set only where
none is; the empty board the new page opened with gives its name up to the trash, and the page goes to the board that
came. The trash and empty boards stay behind. *From a file…* takes the same file on any address. **The notice** — a
lasting line at the head of the old address's boards pane, and the status line once a device — says dyna.ink is the
new home, with the tap; it is **off** until N4 flips `NEW_HOME_NOTICE` in `17-carry.js`. Before then the offer is
reachable by hand with `?carryTo` in the old address (the target is dyna.ink whatever it says), and *Every board out*
stands in every boards pane. Unverified: a carry from the app installed to an iPad's Home Screen, whose window may lose
its opener — it then says dyna.ink did not answer and points to the file.

**Kept on the iPad** (PLAN-IPAD-NOTES I3; `spaceWords`, `storageWords`,
`persistPlan`, `PERSIST_KEY` in `17-boards.js`, tested in Node; `askPersist` in
`17-folder.js`; `loadRoom`, `roomChanged` in `22-boards.js`; e2e boards N20–N20f).
Safari clears a site's storage after seven days without a visit unless it is
installed or the browser agreed to keep it (unverified on a device — §6 of the
plan). So once a board the device keeps holds something the page asks
`navigator.storage.persist()`, **once per device** (the preference is written
before the answer, whatever it is) and **never** for `?fresh=1`, a replay, an
embed, a room, a folder or a repository (`persistPlan`: only boardMode's
`restore` is the device's own board). The boards pane's foot says in plain
words what `estimate()` and `persisted()` answer: *kept on this device — 12 MB of
about 40 GB*, *kept with the app on this device* when it runs from the Home
Screen (`navigator.standalone`, else `display-mode: standalone`), or *this browser
may clear it after a week unused — add to Home Screen*; a browser that says
neither is said to. The size of each board in its row is still marks and the
journal's KB.

**Find, and a picture of each board** (PLAN-IPAD-NOTES I6, 1 Oct 2026;
`core/src/search/`, `Demos/surface/17-find.js`, `26-find.js`,
`22-boards.js`; e2e boards N23–N23i, `search.test.ts`). **A word is looked for on
EVERY board this browser keeps, as it is typed.** The *find* button in the bar, `/`,
⌘K and ⌘F open one field under it; results are grouped by board, each hit as the
words in context (*“Pricing” — label on a box · Board “Q4 notes”*, core's
`describeHit`), a board listed by its best hit and then by use; a tap opens the board
in place (the switch the boards pane makes) and takes the view to what was found,
ringed for a moment on a layer of its own (`findRing`, never the paint, never the log).
**Searching is reading**: nothing is written to any log, and a board a hand only looked
at stays unwritten. **The index is derived and lost harmlessly.** Core says what a
board says (`searchEntriesOf(state)`: the newest label on each mark and what it stands
on — *label on a box* — artifacts' names (a default `text 3` says nothing), typed text,
a figure's `<text>`/`<title>`/`<desc>`, Mermaid, the words of a page, a picture's name,
read transcripts — each with its mark's id and box), ranks a query (`searchBoards`: words
folded for case and diacritics and cut at anything that is no letter or digit, no
stemming; every word typed must be there; an exact word above a prefix, a short saying
above a long one, a word that follows the one before a little more, a label or a name a
little above prose, then the board used most recently), and says which boards to read
again (`stalePlan`, `searchKeyOf`: the board's own record of its change — when, events,
characters — with the format's version and the sources registered). The surface keeps it
in its own IndexedDB, **`mm-find`** (`index` and `thumbs`, each keyed by board; its own
database so the journals' `mm-boards` version is no one's to bump): the board on screen is
indexed a moment after its last change (`FIND_DEBOUNCE_MS`, a timer restarted by the
journal's own append — a stroke pays a `clearTimeout`; idle, and never while the pointer
is down), a board left is indexed and drawn from the live state in the task that leaves
it (`findLeaving`, in `switchBoard`), and every other board whose kept index is missing
or stale is read from its own records, replayed in a **scratch session** and indexed, one
at a time with a pause, a few seconds after the page opens and when the find or boards pane opens
(`findSync`). A board emptied from the trash lets its index go (`findDrop`); a trashed one
is not searched. Works offline: the query is asked of memory. **Hooks for what comes
next:** a region's name is found as itself (*a region*, at its own box; `SEARCH_VERSION` 2
read every board again), and `registerSearchSource({ id, entries(state) })` adds entries for
what core does not know yet (its id is part of the key, a source that throws is left out);
`searchBoards(boards, query, { semantic })` takes a seat's score for an entry (0..1, added
to the lexical score, and what no word matched is let in at `SEMANTIC_FLOOR`) — where the
semantic seat joined (I9: *The semantic seat*, above; a hit it added says `meaning`); and the logic is core's, so the MCP hand searches with it too (`canvas_find`,
by words; *The hand organises notes*). **Thumbnails**:
each row of the boards pane shows a 240×160 picture of its board — the pictures as the
canvas holds them decoded (a board read from its records: from the asset store, small),
a plate where anything else stands, the ink in its clean form and its maker's colour —
made in the same task as the index (on leaving, and for any board that has none), kept
in `mm-find` under the same key, and refreshed for the board on screen when the pane
opens. It is a picture of its own (`findPaintThumb`), never a repaint of the canvas.
Not yet: a mark found inside an artifact is opened at the artifact; stemming; a hit in a
board another tab holds is found from what was kept.

**Examples, and the first run** (V1-PLAN R5; `boards/examples/`,
`scripts/examples.mjs`, `17-boards.js`, `22-boards.js`; e2e 65–65f and the boards
scenario's N18–N18e). A hand who has never used the app needs something to hold
that the engine already reads. **An example is a log** — one event per line, as
*export* writes it — **made by `scripts/examples.mjs` from the engine and never
drawn**: `drawMermaid` for the flowchart (its Mermaid then taken through the
tool's own act, `takeOffer`, so it stands beside the drawing as an artifact) and
the class diagram, `strokeFor` with `handLike`'s seeded tremor for the molecule
(`use basics@1`, nothing taught) and the pattern page (a right triangle ruled in
three lines with a square in its corner, 24″ and 8″ written beside the legs, a
page of ten lines of steps), texts as the surface's `typeText` writes them, on a
fixed clock (`T0`) and with no randomness — so the same engine makes the same
bytes, `--check` names a file that no longer is what the script makes (CI's
`core` job), and `examples.test.mjs` replays each and asks the engine what it
reads (the flowchart as a flowchart, the class diagram as a UML class diagram,
the molecule matched by `basics@1`, the pattern page saying 25.30″ and a check on
each step). Each opens with nothing held (the summon dismissed and the marks let
go) and carries a note in the person's words with no digit — a number near a
drawing is a measurement to the maths, and a note must not be one. (It also carried
no colon or dash, which read as a step; F2 made prose say nothing, so those are
free now — found making the first two.)
**The boards pane lists them** under *examples*, from `index.json` (`exampleRows`,
in `17-boards.js`: read, not trusted — a row with no name, a repeated id or a file
that is not one of the folder's own `name.jsonl` is left out, nothing throws), and
**opening one makes a new board of your own**: the log is fetched (`exampleUrl`,
`../boards/examples/…` from `/app/` and the old address alike), read the way *from
a file…* reads one, and made a board through `newBoard` — a copy under an id of
its own, named for the example (`exampleName`: *Flowchart example*, then
*Flowchart example 2*), so the example is never written and the hand draws on it at
once. An ask for an example that cannot be read (offline, and not visited before)
is said in the pane or the status line and makes no board. The service worker keeps
the index and each log for offline (`EXTRA` in `Demos/sw.js`; the test checks that
every example is named there).
**An address can name one** (`?example=<id>`, `exampleFromAddress` in `22-boards.js`, 7 Oct 2026): in an embed — a figure, which keeps no board — the example's log is put on the canvas in place and nothing is written, so the whitepaper's *reference surface* embeds `?embed=1&theme=paper&example=story` and shows the app open on its own storyboard with the launch film on it; on a page that keeps boards it makes a board of your own as the pane's tap does, the address letting go of the name first so a reload makes no second copy (the whitepaper's *Open it →* names it too); anywhere else it is said and left alone. **The film plays only from a server that is not plain HTTP on this machine**: a program runs in an opaque-origin frame, and Chromium refuses that frame the video from `http://127.0.0.1` or `localhost` (both sources fail, with or without range requests), while from `https://jjh111.github.io` it loads — so locally the board says *the film could not be loaded here*.
**The first run stays an empty board**, on purpose: a hand who only looked is never
handed a board with marks on it, nothing is written for that hand, a returning hand
is never surprised, `?fresh=1` (the harness's start) is unchanged, and no other
scenario's first board changes. What a first-time hand is given is the panel's
*start from an example* (*The surface's chrome*, above): one tap, a board of its
own from the starter (`starterOf`: the index's `starter`, the molecule), the board
it was tapped on left as it was — an empty *My board* stays on the list. A board
opened from a room, a folder or a repository opens in a page of its own, as any
board does, so e2e 65 stands before the canvas run's rooms.

## One app address, versioned (V1-PLAN R7)

> `app/` (made, never edited), `Demos/sw.js`, `scripts/build-app.mjs`,
> `scripts/release.mjs`, `VERSION`, `CHANGELOG.md`; the gate's `app`
> scenario, `e2e/app.mjs`.

**The app is `/app/` on the Pages site — `https://jjh111.github.io/MetaMedium/app/`
— a page, not a redirect.** `app/index.html` is `Demos/session-engine.html`
with each file it asks for asked for from `/app/` (`../Demos/…`), so the
surface is one set of files at two addresses and the query is the page's own
(`?board=`, `?live=`, `?fresh=`, `?folder=` …; Pages sends `/app?…` to
`/app/?…` with its query, and so does the gate's static server). A redirect
could not install there: the offline shell must be served by a worker whose
scope covers the page, and a worker's scope is its own folder at most. **The
old address stays**: `Demos/session-engine.html` is the same page with its
own manifest and worker, and the whitepaper's links and embeds are untouched
— the `app` scenario asks every address the whitepaper, `404.html` and the
README link into the site, and both addresses open the same boards (one
origin, one IndexedDB).

**One worker, two addresses.** `Demos/sw.js` is the source and `app/sw.js`
its copy; where a copy stands decides its shell (the page, its manifest, the
surface's script and style, the engine bundle; the help's text when it
answers, never the reason a shell is not kept) and its caches
(`mm-app-<version>`, `mm-shell-<version>`). Network-first, the cache the
fallback, as before — and five rules, each one a failure a test can show:
**the scope is tested, not the registration** (a worker registered at a
narrower scope than its page registers without a word and controls nothing,
while Chromium still calls the page installable — so the gate asks that the
page be *controlled*, and a mutation that narrows the scope fails it);
**the cache is named for the release** (a release changes the worker's
bytes, so the browser installs the new one at its first network fetch; it
keeps the new shell whole, then drops the old release's cache — with a fixed
name, a file the page does not fetch on every load, the help's text, came
back offline from the release before beside the new page, which the gate
keeps as a control); **only its own caches** (caches belong to the origin,
which both addresses share with every project on the `github.io` host — the
old worker deleted every cache but its own — and a miss is answered from
this worker's cache only, never another release's copy of the same file);
**a page is kept once, whatever its query**, so an address never visited
online opens offline; and **a key never enters a cache** — a request
carrying `Authorization`, and a relay's stream that never ends, are the
network's alone. The shell is installed with `cache: 'reload'`, never the
HTTP cache's older copy (Pages sends `max-age=600`).

**Installed on an iPad** (PLAN-IPAD-NOTES I3; `Demos/icons/`,
`scripts/make-icons.mjs`; e2e app A12–A15): iOS takes the Home Screen icon from
the page, as a PNG, so `Demos/session-engine.html`'s head names an
`apple-touch-icon` (180 × 180, full bleed), the iOS web-app meta
(`apple-mobile-web-app-capable`, `-status-bar-style`, `-title`,
`mobile-web-app-capable`) and a `theme-color` per colour scheme — the surface's
own `--ground` in each, which the test reads from `surface.css`; the manifest's
icons are PNGs (192, 512, a maskable 512) that `scripts/make-icons.mjs` draws
from the old SVG glyph with Playwright's Chromium (committed; no image library),
and `build-app.mjs` asks for them from `/app/` (`../Demos/icons/…`, as the page's
files are); both workers keep them for offline (`EXTRA` in `sw.js`). The page also asks
`navigator.storage.persist()` once per device — *Several boards*, below.

**The version** is `VERSION` at the root: one line, semver without build
metadata, `0.0.0` until the first release. `node scripts/build-app.mjs`
stamps it into the page's `<meta name="dynaink-version">` — which the
help pane leads with, offline and in the standalone file alike — and into
the worker's `const VERSION`, and makes `app/` again (the tag was
`metamedium-version` until 0.1.0; the surface's one reader of it,
`pageVersionOf` in `17-boards.js`, falls back to that name, so a page an older
worker kept still says its version — RENAME-PLAN N3b); CI's `--check` names
the file when either has drifted from `VERSION` and `Demos/`. Pages
publishes `master` as it stands, so between releases the app runs master's
code under the last release's number.

**A release** is one command, cut by the director on John's instruction
(*Working with the Codebase*): it refuses a dirty tree and a version not
greater than the last — `VERSION`'s or any `v<version>` tag's (`v1.0-day1`
is not one) — writes `CHANGELOG.md` a section from the commit subjects since
the previous release tag, merges left out, **grouped by the unit each names**
(the first unit before the subject's colon, else the first anywhere; "V1
plan" names the plan), bumps and stamps, builds the standalone file,
`dist/release/dynaink-<version>.html` (ignored), and refuses anything
key-shaped in it or in the section without saying the thing back, commits
`Release <version>`, and makes the annotated tag `v<version>` with
"dyna.ink <version>" and the section as its message
(`--cleanup=whitespace`: by default git strips every `###` line from a tag).
**It never pushes**; it prints the pushes, to the fetch URL — the push URL is
a lock the week-1 automation left, on purpose. `--dry-run` prints all of it
and writes nothing, exiting 1 where the real run would refuse.

**What dyna.ink serves, and when it changes** (the multiuser milestone, 23 Oct 2026;
`.github/workflows/deploy-cloudflare.yml`, `cloudflare/build-site.mjs`; the gate's `prod` scenario, `e2e/prod.mjs`
and `e2e/pages.mjs`). **The deploy waits for CI**: it runs after CI passes on a push to `master` (`workflow_run`),
deploys the very commit CI passed, and only while that commit is still `master`'s tip — CI runs finish in any order,
and an older commit's finishing last would otherwise put dyna.ink back on it; the run says so and stays green. A
pull request, a failed CI and a fork's branch called `master` deploy nothing; by hand, only from `master`, and held to
its tip too — GitHub re-runs a run with the commit it was first dispatched at, so a run dispatched at a commit
`master` has moved past deploys nothing and fails, saying to run the workflow again (`site.test.mjs` holds the step,
and the step was run against a stub `gh` for both events). **The
site** is the repository less what cannot run or is never asked for, each with its reason (`whyLeftOut`); every page
gets a floor policy and HSTS (six months, no subdomains, no preload), and the app's pages their own policy,
`csp.txt`, as a header and again in the page itself. **The `prod` scenario** serves that very build as Pages does and
runs the app under it, listening for a policy violation in every frame (the `e2e/` row has what it walks). **The
worker's sixth rule**: a navigation that misses on a path with no extension and no slash is answered with the page
kept as `<path>.html`, as itself (`kept`, `asPage` in `Demos/sw.js`) — Pages leaves a person on
`/Demos/session-engine` after its 308, and a browser refuses a redirected response for a navigation. **A release**
refuses a clone that cannot see the last release's tag (`unseenRelease`) and says the fetch to run. Unverified: the
workflow as changed has not run (nothing here reaches GitHub Actions or Cloudflare); Pages' edge was checked only
against `wrangler pages dev`; `prod` runs on Chromium only.

## The log format: a header, version 0 and 1 (V1-PLAN R2)

> `core/src/store/format.ts` (the one definition; `seam.ts`
> re-exports `encodeLog` / `decodeLog`), `format.test.ts`,
> `format.files.test.mjs`; the surface's `readLogText`, `logWrite` and
> `logFileNote` in `Demos/surface/17-folder.js`; e2e N19–N19f.

**A log kept as a file is versioned.** Version 1 begins with a header line,
`{"type":"format","format":"metamedium-log","version":1,"app":"<VERSION>"}`
(the format id keeps the old name: every saved board carries it — RENAME-PLAN §2;
`app` when the writer knows it — the page's own version; the generated
examples leave it out so their drift check holds across releases), then one
event per line as ever; **version 0 is a log with no header** — every log kept
before R2, and every one still under `boards/story/` and
`dynaink-3d/fixtures/`. Every writer writes 1 (`encodeLog`; `appendToLogText`
for an append: nothing yet gets the header, a version 1 file only the tail, a
version 0 file is brought to 1 with its events as they were); every reader
accepts 0 and 1 (`decodeLog` returns `version`, and the header is never among
its events). **A version newer than this build reads is refused whole**
(`LogFormatError`, before one event is returned): *“canvas.jsonl” is a version
2 log, written by dyna.ink 0.9.0 — this build reads versions 0 and 1, so
nothing of it was read; open it with a newer dyna.ink*. A header naming no
usable version is refused the same way, never guessed at, and nothing appends
to a file this build cannot read. The surface says the sentence where the file
was met: in the boards pane for *from a file…* and the examples, in the status
line for a folder — which is **not opened at all**, so nothing writes over it
— and in the shard's panel. The journal a browser keeps a board in (R3) is
records of events, not a file, and has no header; the file the board leaves as
is one.
A picture's `import` event (I1) carries an `asset`, a `mime` and a size and no bytes, in a version 1 log as
in any other: a reader that does not know an asset draws the picture's name, as a version 0 or 1 picture
always was — and a log taken out as a file names assets this browser holds and a file carries none of (the
board bundle that does is I4).

**The trap, and how it is answered.** A surface from before R2 takes every
line that parses for an event and its boards pane refuses a file whose lines
have no string `type`; a header of some other shape would have broken it. So
the header carries **`type: 'format'`**, a type the session has no case for
and ignores: a version 1 file opens in a week-old surface, its header one
event that does nothing (the board reads one event long). What that surface
cannot do is refuse a version 2 — the reason the number is written now.
`format.files.test.mjs` proves it against the committed Node bundle of the
day before (`src/store/fixtures/core-before-r2.node.mjs.gz`, kept as a
witness, never rebuilt): that bundle's `decodeLog`, `mergeLogs` and session
load a version 1 file, and every board under `boards/` written as version 1,
to the same board as version 0. The export says it in the status line (*log
version 1 — an older dyna.ink opens it too*). A folder this hand wrote as
version 0 opens as ever and its next save is version 1.

## Pictures: kept, drawn and traced on request (v8 WP-9a; PLAN-IPAD-NOTES I1, 1 Oct 2026)

> `core/src/kinds/picture.ts` (`isPictureKind`, `pictureOf`, `isAssetRef`),
> `tools/trace.ts`, `image/trace.ts` — `trace(bitmap)`; the surface's
> `Demos/surface/17-assets.js` (pure, `node --test Demos/surface/17-assets.test.mjs`)
> and `18-images.js` (the board out is `18-out.js`'s); e2e 69–69k, `keep`'s P and `boards`' N20.

**A picture is kept and drawn.** Its pixels used to be a blob URL in memory — gone on
reload, in no log, never painted on the board (an image artifact is not live). Now:

- **The asset store** (`mm-assets`, IndexedDB beside the board journal, `18-images.js`):
  `assets` (the bytes, `ArrayBuffer`) and `info` (hash, time, size, mime, w, h) keyed by
  **`sha256:` and 64 hex** of the bytes kept — `crypto.subtle`, or plain code
  (`sha256Hex`, 17-assets.js) where the page is not a secure context — so the same photo
  brought in twice is one asset. **Order is the safety**: the bytes are committed (their
  own transaction, strict durability) *before* the event exists, and the event goes to the
  board's journal in the task that makes it, so a kill leaves no event naming bytes that
  were not kept (`assets.pending` is what is stored and not yet named; `keep`'s P records
  kill right after and during an import). With no IndexedDB the bytes are held by the page
  and the line says so.
- **The event** names, never carries: `import { kind: 'jpg' | 'png' | 'webp', asset,
  mime, w, h, name, path, bounds }` (`SessionEvent`'s `import`, `session.ts`). A picture has
  **no code** — an `import` with an `asset` and no `code` is held; the code rep carries
  `asset`, `mime`, `w`, `h` (read, never trusted: an asset that is not `sha256:…`, a size
  that is not a positive number and a mime that is not an image are left out), and
  `pictureOf(node)` reads them. **A version-1 log's picture** (a path and an empty code,
  no asset) replays as it always did, an artifact that draws its name. `webp` joins `png`
  and `jpg` in the closed kinds table; a picture is never live (`isPictureKind`).
  The identity of a picture is its asset; its **path** (`imports/<name>.<kept
  extension>`, `-2`, `-3` … for a name already on the board — cameras call every file
  `image.jpg`) is a label.
- **On the way in** (`importPictures(files, { view?, at? })`): decoded in a **Worker**
  where the browser has `OffscreenCanvas` (its source is a string, taking `fitLongSide`
  from the closure by its own source), the main thread otherwise; **EXIF orientation
  honoured** (`createImageBitmap`'s `imageOrientation: 'from-image'`, tried without where
  a browser refuses the option); the **long side held to 2,560 px** (`ASSET_LONG_SIDE`, the
  original not kept — an option for later); kept as **JPEG, WebP where clearly smaller,
  PNG where it has transparency** (`pictureFormat`); every `ImageBitmap` closed. **One
  file at a time**, picks queued; a pick is **laid out in a grid in the view**
  (`pictureCells`, `fitInCell`: cells depend on the count and the view, never on the
  pictures, so each is placed the moment it is kept; `clearShift` moves a grid clear of
  what is on the board — a second picture never lands on the first — and the view goes to
  it when it left the screen), the status line saying *importing 3 of 10 pictures*. A
  picture is **not traced on import**.
- **Drawn on the board, under the ink** (`08-render.js`, `drawPicture`): a picture artifact
  with an asset is painted on the canvas — not an iframe, so the live budget of twelve is
  none of its business — **first**, before any stroke, culled to the screen with the rest
  of the paint (R4c), a held one drawn where a drag takes it, turned by its `rotation`. A
  figure wears its chrome only while pointed at. Decoded bitmaps are cached **by asset**
  (`pictureBitmap`): a **thumbnail** while the screen shows the picture small, whole once
  shown large (`pictureTier`), read from the store and decoded off the paint (a repaint when
  one lands), **closed** when the decoded pictures cost more than `DECODED_BUDGET_PX`
  (`evictPlan`: least recently drawn first, never one in the paint just made) or have not
  been drawn for twenty seconds. An asset this browser does not hold (a log from elsewhere)
  draws its plate and is `missing` in `mm.pictureState()`. **Pictures are moved, scaled and
  turned as themselves**: a picture has no ink of its own, so `manipulableOf` and
  `markFrameOf` (`session/manipulate.ts`) take it as a mark (an artifact's members move with
  it as before). A loop round ink on a picture takes the picture too — it is content inside
  the loop (e2e 24b moves it aside first); whether that should differ is open.
- **Kept with the board**: a duplicate's events name the same assets (nothing copied); the
  trash keeps them while a board can be restored; **emptying the trash collects the assets
  no board uses** (`collectAssets`, called by `emptyTrash`, 17-folder.js; every board the
  browser keeps is read, the trash's included, and a board that cannot be read stops the
  whole collection — never on a guess) — except an asset stored in the last
  `ASSET_GRACE_MS` (another tab may be between its bytes and its event) or in flight. An
  import undone leaves its bytes until then.
- **Inputs** (`session-engine.html`): the *import* tile opens a pane — *photos*
  (`accept="image/*,.svg"`, `multiple`, no `capture`), *camera* (`capture="environment"`,
  one) and *other files* — because one input asking for both may open the camera alone. A
  drop lands at the drop point; **a paste anywhere on the page** is taken unless it is
  meant for a text field.
- **In a room, and the MCP hand** (A1; *A picture in a room*, under *The MCP hand*): the bytes
  go to the room's relay by their hash before the event naming them is sent, and a hand that merges
  the event fetches them into its own asset store; `canvas_look` says *a picture holiday.jpg
  2560×1920* and whether the room holds its pixels, `canvas_see` draws them under the ink, and
  `canvas_import` puts one on the board.

**Out and back whole** (PLAN-IPAD-NOTES I4; `Demos/surface/17-bundle.js` — pure, `node --test
Demos/surface/17-bundle.test.mjs`, in CI — and `18-out.js`, the adapter; e2e 70–70i, `boards`' N22–N22d;
`format.ts`'s optional header field). **The bundle is a ZIP**, `<board>.dyna.zip`, written by hand with its CRC
(store-only) and read the same way, deflate included: a zip is what the iPad's Files app, Mail and AirDrop know,
one tap in Files shows `board.jsonl` and the pictures as files, anything can unzip it with no dyna.ink, and a
single JSONL with base64 pictures is a third larger and opens in nothing. It holds `board.jsonl` — the version 1
log, its header saying `assets: n` when pictures are carried (`LogHeader.assets`, read not trusted; a version 1
reader without it is unchanged) — and `assets/<sha256>.<ext>`. **Found by its first bytes, never its name**, so a
file renamed, or unzipped and zipped again by hand (a log one folder down, a Mac's `__MACOSX`), still opens. *From
a file…* (`boardFromFile`, `bundleLoad`) stores every picture — its hash checked against its name — BEFORE the
board's events land, then makes the board as for a log; a picture whose bytes do not match, or whose own checksum
is off, is left out and said by name while the board and the sound pictures open; a file that is cut off, smashed or
no zip, or a `board.jsonl` that is damaged, is a sentence through the pane and no board (`zipRead` never throws).
**A bare `.jsonl` still opens**, and says once, in the pane and the status line, which pictures it names that this
device does not hold (*2 pictures are named in this log but are not in it — they stand as their names; export
“board + pictures”, a .zip, to carry them*); the log export says the same of its own pictures. **board.svg**
(`boardSvg`, in layers) draws under the ink, in board order: each picture an `<image>` data URL at its bounds
(turned as the board turns it; a picture this device lacks is a dashed plate with its name), each SVG figure as an
`<image>` of its own text — an image never runs a script, so a figure's script cannot run from the file — and
writing as `<text>` (a caption fitted to its box, a document clipped), `xlink:href` for every renderer. **board.png**
and **board.pdf** are drawn on an offscreen canvas from the same layers (`renderBoard`): the pictures from their own
bytes, the rest as one SVG over them, on paper — never the viewport, so the view never changes them. The png is
twice the marks' size held to 8,192 a side and 16 million pixels (an iPad's canvas stops near there; said when
scaled, `pngPlan`); the pdf is one page, Letter or A4 by language, turned the way the board lies, the board at no
more than its drawn size (`pdfPlan`, said as a percentage), the picture at 200 dpi and ≤ 3,000 px, embedded as a
Flate image of its RGB (a `JPEG` where the browser cannot compress), the xref exact (`pdfWrite`, read back with
pypdf strict). **What is exported is what is held, else the board**, said in the status line; pages and programs are
counted as not drawn. Moved here from `18-images.js`: the export pane, `svgOf`, `downloadBlob`.

**Tracing is an offer** (`tools/trace.ts`: *Trace into ink*, tool `trace`, host act `trace`,
appended last in `builtin.ts`): on a picture held alone with an asset, `traceFrom`
(18-images.js) reads the pixels again from the store, traces them as below at a long side of
`IMPORT_MAX_PX` and writes **one `import` event of strokes** over the picture's own box inside
the tool's stamp — one act, one undo — and the picture stays. A photo is no longer ink on
arrival (a camera photo was ~3,900 strokes). *To do*: filter to what the shape rung reads with
confidence and offer it by default for a scan of a drawing (PLAN-IPAD-NOTES §5.5); folder
discovery still imports a folder's pictures without an asset (they draw their name).

**The trace itself** (`image/trace.ts`): a photographed sketch is pixels, not marks. `trace`
takes an RGBA bitmap
(the shape of `ImageData`; no canvas API in core) and returns strokes in
pixel coordinates: Otsu's threshold on luminance (inverted when most of the
picture reads as ink, so a chalkboard photo works), Zhang–Suen thinning to the
one-pixel centreline, the skeleton walked into paths — free ends first, then
junctions taking the straightest branch so a shaft continues through a barb,
then loops — Douglas–Peucker at a pixel and a half, and **densified back to
ink spacing**: the engine measures along the path, and a polyline that is
only its corners has nothing between them to measure, so a perfect traced box
read as a circle until it was given the density a hand leaves. Every result
carries its reasoning (the threshold, the ink fraction, how many flecks were
dropped). An SVG or any file of a known kind becomes an artifact of its kind
(an SVG in a pick takes its cell). *Export…* writes the board as SVG or PNG
or the session as its log (pictures are not in them yet — I4), and the panel saves any
artifact's code.

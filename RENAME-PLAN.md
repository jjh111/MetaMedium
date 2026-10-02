# The rename: MetaMedium becomes dyna.ink

*Written 2 October 2026 and revised the same day on `master` at `6b396ef`. That
revision follows 257 commits the lanes pushed while the plan was being written,
among them the Cloudflare home (CF1) and `GUIDE-2026-10-02.md`, the hand-over
that describes this `master`. John's decisions are in §3, dated. The form is
`DIRECTOR-PLAN-W2.md`'s: a ladder, then for each unit what it owns, the test
written red first, the checks a machine runs, the invariant it is most likely to
bend and the trap; then how the agents run. Licensing strategy beyond the
license itself, pricing and vendor terms stay out of this repository.*

---

## 0. Where things stand

- **The name is in 257 files, 1,209 times** (`git grep -il metamedium | wc -l`,
  `git grep -io metamedium | wc -l`). Most of it is prose in dated documents.
- **The new name is already public.** `CLAUDE.md`, `GUIDE-2026-10-02.md`, the
  Cloudflare home and `boards/story/` have said dyna.ink on `origin/master` since
  28 Sep. The relay already answers to `relay.dyna.ink`, and the Files format is
  `<board>.dyna.zip`.
- **The domains are held**: `dyna.ink`, `dynamedium.com`, `dynamedium.ink`.
- **dyna.ink has a home, built and not deployed** (`cloudflare/README.md`):
  - `cloudflare/build-site.mjs` makes a Cloudflare Pages site of what GitHub
    Pages publishes, with security headers. The Pages project is `dyna-ink`,
    the app is at `/app/`, and `/app` → `/app/` keeps its query.
  - The room relay is a Worker, `dyna-relay`, at `relay.dyna.ink`.
  - `.github/workflows/deploy-cloudflare.yml` deploys both on every push to
    `master`, once John's eight browser steps are done.
- **GitHub Pages keeps publishing.** `jjh111.github.io/MetaMedium/` and every
  old address stay live; dyna.ink is a second home, not a redirect. Both
  addresses are live at once, so nothing forces a switch on a date.
- **What a person keeps in a browser belongs to the address.**
  - Boards live in IndexedDB `mm-boards` (`Demos/surface/17-folder.js`), and
    pictures live in the assets store beside them (`17-assets.js`).
  - The taught mark, model picks and every preference live in `mm-*` keys in
    `localStorage`.
  - A page at `dyna.ink` cannot read what `jjh111.github.io` kept, so a person
    who moves to dyna.ink finds an empty board list until they carry their
    boards across.
  - The site sends no `Cross-Origin-Opener-Policy`
    (`cloudflare/pages/headers.template`), so a page on one address can open
    the other and talk to it.
- **The engine bundle is named in the offline shell** (`Demos/sw.js`) and
  loaded by the whitepaper itself (`index.html`, which also reads the
  `MetaMediumCore` global), the app, the standalone build, the release test and
  the bench.
- **The numbers** (`GUIDE-2026-10-02.md` §1.3):
  - the engine: 2,668 tests in 147 files;
  - the Node tests: 244;
  - the gate: 885 records in 13 scenarios, 873 passing, 12 skipped by name.
- **No release has been cut.** `VERSION` is `0.0.0`. `origin`'s push URL is a
  lock; pushes go to the fetch URL on John's word.

## 1. The names, one home

This table is the only place the spellings are defined. Everything else
follows it.

| Where | Spelling |
|---|---|
| The product, on screen and in prose | **dyna.ink** |
| The 3D surface (today "MetaMedium · shard 3d") | **DynaInk3D** |
| A name in code, CamelCase | `DynaInk` (the global is `DynaInkCore`) |
| A lowercase name: packages, MCP servers, files, meta tags | `dynaink` (`dynaink`, `dynaink-3d`, `dynaink-<version>.html`, `<meta name="dynaink-version">`) |
| The engine's folder | `core/`, brand-neutral so it never moves again |
| The 3D surface's folder | `dynaink-3d/` (today `shard-3d/`) |
| The engine's package name | `@dynaink/core` (not published) |
| Cloudflare's names, as CF1 set them | the Pages project `dyna-ink`, the Worker `dyna-relay` |
| A board as one file | `<board>.dyna.zip` (I4) |
| The site | `https://dyna.ink/`, the whitepaper; `https://dyna.ink/app/`, the app; `https://relay.dyna.ink`, the relay |
| The idea, in the essay | "a metamedium": lowercase, never styled, never the name of the product |
| Held, not used yet | `dynamedium.com`, `dynamedium.ink` |

`dyna.ink`, with its dot, is never an identifier: not a file name, a package
name, a CSS class or a key. In code it is `dynaink` or `DynaInk`.

## 2. What keeps the old name, and why

What makes a name a trademark use is using it **as a brand**: to say whose
product something is. Copyright does not reach names at all (US Copyright
Office, Circular 33: words and short phrases are not protected). So the old
name may stay wherever it is plumbing or history, and must go wherever it
names the product. This is the plan's reading, to be confirmed with the
trademark attorney, not legal advice.

**Kept:**
- the `mm-*` storage keys, the `mm-boards` database, the `mm-` channels, and
  the service worker's `mm-app-` and `mm-shell-` cache names. They are
  invisible, and changing them would strand what people kept.
- the `mm` contract programs are written against (`mm.onPointer` and the rest).
  Programs that models have already written call it.
- the `.metamedium/` folder format: logs, the manifest, `?folder=` sites. It is
  a file format inside people's folders and hidden by default. Writing a new
  folder name while reading the old one forever is a later choice, not part of
  this plan.
- `metamedium_library_v1` and the other keys of the same kind.
- **the log's format id, `metamedium-log`** (`LOG_FORMAT` in `core/src/store/format.ts`). Every exported log,
  every `.dyna.zip` and every carried board carries it in its header, and `decodeLog` matches it exactly, so
  renaming it would stop every saved board from opening. Found by N1.
- **the carry's protocol**, from N1: the message types `mm-carry`, `mm-carry-ready`, `mm-carry-ping` and
  `mm-carry-done`, the key `mm-home-said`, `boards.json` with `format: "dyna-boards"`, the `carried` field on
  a board's entry, and the parameters `?carry` and `?carryTo`. The two addresses must keep speaking the same
  protocol across a service worker's cache.
- the dated documents (`ARCHITECTURE-*`, `DIRECTOR-*`, `SURFACE-*`, `QA-*`,
  `SHARD-3D-*`, `NOTES-*`, `GUIDE-*`, and the `PLAN-*` written before this one),
  `archive/`, and git history. They are records, and each keeps the name it had
  when written.
- `MetaMediumCore`, as an alias for one release, for anything outside this
  repository that loads the bundle.
- the old address, `jjh111.github.io/MetaMedium/`, which stays live: never
  break a link.
- the repository `jjh111/MetaMedium`, **until H1**.

**Renamed:** everything a person sees, installs, downloads or connects to.
That means the wordmark, titles, manifests, the help pane, the whitepaper's
title, the social card, release titles and files, the packages and both
folders, the MCP servers, the skills, and the living documents.

## 3. John's decisions

- **2 Oct 2026**:
  - `dyna.ink/` is the whitepaper and `dyna.ink/app/` the app.
  - The engine's folder becomes `core/`.
  - Internals keep their names (§2).
  - The 3D surface is **DynaInk3D**, and **its folder is renamed to match**
    (`dynaink-3d/`).
  - The repository stays on John's own GitHub for now and moves to an
    organisation before a hard launch (H1, flagged).
  - **The license is AGPL-3.0-only for everything**: the engine, the app, the
    relay and its Worker, both MCP hands, the 3D surface and the experiments.
    It comes with a contributor agreement, the trademark reserved, and the
    whitepaper's prose and figures under CC BY 4.0.
  - **The freeze begins**: nothing else lands from N0 to N3e.
- **Waiting:** the IP assignment from John to JHDesign LLC. N2 waits for it to
  be signed, so the copyright line can name the LLC.

## 4. The ladder

| Unit | What | Waits for |
|---|---|---|
| **N0** | Checkpoint: release `0.1.0`, the last MetaMedium | the gate green on `master` |
| **N1** | Carry your boards: one tap from the old address to dyna.ink, with a file as the fallback | N0 |
| **N2** | The rights: license, trademark policy, contributors, notices | N0; the IP assignment |
| **N3a–e** | The rename, one layer per unit | N1, N2 |
| — | Push, on John's word | N3e |
| **N4** | dyna.ink becomes the address: canonical links, the notice on the old address | John's Cloudflare steps; dyna.ink bound |
| **N5** | Release `0.2.0`, the first dyna.ink | N4 |
| **H1** | The repository moves to an organisation | before a hard launch |

**Nothing else lands from N0 to N3e.** The rename touches about 250 files and
two folders, and would conflict with every open branch. Lanes restart from the
renamed `master`, in fresh worktrees (§6).

## 5. Per unit

### N0: checkpoint

**Owns:** `VERSION`, `CHANGELOG.md`, the tag, through `scripts/release.mjs` only.

**Steps:** run the whole suite (§6) on `master`. Then
`node scripts/release.mjs 0.1.0 --dry-run`, read it, and run it. It makes one
commit, the annotated tag `v0.1.0` and `dist/release/metamedium-0.1.0.html`.
The push and `gh release create` go as the script prints, on John's word.

This is the restore point: whatever the rename does, `v0.1.0` is the whole of
MetaMedium, runnable from one file.

**Trap:** the first release's changelog section is the whole history unless
`--since` says where to start. Choose it on purpose.

### N1: carry your boards

**Owns:**
- `Demos/surface/22-boards.js` (the pane), `17-boards.js` and `17-bundle.js`
  (pure: what is carried and how it is read back), and `17-folder.js` and
  `18-images.js` (reading every journal and its pictures, writing them in).
- `e2e/boards.mjs`, or a scenario of its own.

**What:**
- **Carry, one tap.** On the old address, *Carry my boards to dyna.ink* opens
  `https://dyna.ink/app/?carry` in a new window. That page says it is ready, and
  the old one sends it every board as I4's bundle: the log and its pictures,
  with each picture's hash verified on the way in. It also sends the board's
  name, the taught command mark with its five samples, and the preferences.
  - **Never a key**: remembered model keys are left out by name, and so is the
    room key.
  - Messages are checked by origin both ways: the new page takes boards only
    from the old address's origin, and the old page sends only to dyna.ink's.
  - Each carried board becomes a new entry, and a board of the same name takes
    a suffix. Carrying twice brings nothing in twice: a board whose log is
    already held is said to be held and skipped.
- **The fallback.** *Every board out* writes one file holding every board's
  `.dyna.zip`, and *From a file…* on dyna.ink accepts it. This works offline,
  between devices, and anywhere a popup is refused.
- **The notice.** The old address's boards pane, and its standing line once,
  say that dyna.ink is the new home, with the tap. It is off until N4 turns it
  on.

**Red first:** a scenario on two origins (the gate's static server on two ports
is two origins). Make two boards on the first origin, one with a picture, and
teach a mark. Carry them. On the second origin both boards are there, whole,
with their names and the picture, and the mark is taught. Then carry again: no
board doubles. Also check that a key planted in the first origin's storage is
in none of the messages or the file, and that a message from a third origin is
refused.

**Checks:** `node --test Demos/surface/17-boards.test.mjs Demos/surface/17-bundle.test.mjs`;
`node e2e/run.mjs boards keep` plus the new scenario; the whole suite.

**Invariant:** the log is the board. Each log is carried exactly as its journal
holds it, and no event is rewritten on the way in or out.

**Traps:**
- Remembered keys live beside the preferences. Gather preferences by an
  allowlist, never "every `mm-` key".
- A window opened by script needs the tap that asked for it. Open it inside the
  click handler, before anything is awaited, or the browser blocks it.

**N1 status, 2 Oct 2026: done on `rename`** — `51248ca` (red), `26bdcfa`, and the docs after it: `17-carry.js` (pure, 20 Node tests in CI) and `22-carry.js` carry every board — one file, `boards.json` and each board's `.dyna.zip`, sent as transferred bytes — from `https://jjh111.github.io` to `https://dyna.ink` only (a page on 127.0.0.1 or localhost may name another local origin with `?carryTo=` / `?carry=`, nowhere else), preferences by an allowlist of names and never a key, each log in event for event, a name taken suffixed, a log held skipped; *Every board out* is the same file, and *From a file…* opens it; the notice is `NEW_HOME_NOTICE` in `17-carry.js`, off, for N4 to flip (until then `?carryTo` on the old address shows the offer); `node e2e/run.mjs carry` (18 records, three origins) passes on Chromium and WebKit and is in CI's WebKit job.

### N2: the rights

**Owns:**
- `LICENSE`, and the `license` field in all seven `package.json` files
  (`metamedium-core`, `shard-3d`, `e2e`, `gliner-seat`, `lens-canvas`,
  `v2-poc`, `Web App Skeleton`) plus `cloudflare/relay`'s.
- `TRADEMARKS.md`, `CONTRIBUTING.md` and `NOTICE`.
- The whitepaper's license line and footer.

N2 runs before N3c, so it names the folders as they still are.

**What:**
- `LICENSE` becomes the AGPL-3.0 text, and every `license` field
  `AGPL-3.0-only`. This includes the engine's, which says MIT today, and
  `v2-poc`'s, which says ISC.
- `TRADEMARKS.md`:
  - dyna.ink and DynaInk3D are JHDesign LLC's.
  - Forks are welcome under another name; "works with dyna.ink" is fine; the
    logo and wordmark are reserved.
- `CONTRIBUTING.md`:
  - The contributor agreement, whose text comes from the attorney (admin).
  - A pull request is not merged until it is signed.
- `NOTICE`:
  - Every third-party piece a page loads or a build bundles, each with its
    license: three.js, IBM Plex Mono, Model2Vec and the GLiNER2 weights (both
    fetched, never committed), the relay's dependencies, and whatever else a
    search finds. Find them by search; don't recall them.
  - The whitepaper's prose and figures under CC BY 4.0.
- The footer reads `© 2015–2026 JHDesign LLC`.

**Checks:** the whole suite. Also, by search: no `MIT`, `ISC` or `GPL-3.0`
left in a `license` field, and the whitepaper says the license it is under.

**Invariant:** one definition, one home. The license is stated once in
`LICENSE` and named by SPDX id everywhere else, never paraphrased.

**Trap:** an SPDX header in every source file is a diff over hundreds of files.
If John wants headers, they go in this unit, inside the freeze, never later
beside live lanes.

### N3a: the words a person sees

**Owns:**
- `Demos/session-engine.html` (title, wordmark) and `Demos/manifest.webmanifest`.
- Every surface string that names the product: `17-boards.js` (`boardTitle`),
  `20-controls.js` (the help pane's version line), and whatever a search finds
  since.
- `HELP.md`, if the help pane reads it.
- `404.html`, the head of `README.md`, and `index.html` (title, hero, meta and
  og tags).
- `shard-3d/index.html` (title, wordmark → DynaInk3D).
- A new social card through `node Assets/make-card.mjs`, under a **new
  filename**, with the four og/twitter tags in `index.html` and `404.html`
  changed together (scrapers cache by URL).
- `app/` through `node scripts/build-app.mjs`; `cloudflare/build-site.mjs` and
  its test where they say the name; the e2e assertions on these strings.

**Red first:** a name test, `scripts/name.test.mjs`, run in CI's `core` job. It
reads every file a person sees: the pages, the manifests, the surface's
strings, the help, and the 3D surface's page. It fails on "MetaMedium" except
where an allowlist entry says why, such as "formerly MetaMedium" or "a
metamedium" lowercase. Written first, it lists everything this unit must change.

**Checks:** the name test; `node scripts/build-app.mjs --check`;
`node --test cloudflare/site.test.mjs`; `node e2e/run.mjs app canvas`; the
whole suite.

**Invariant:** the whitepaper's honesty. Its claims about Kay's metamedium stay
as written, in lowercase, as the idea it argues for.

**Trap:** `index.html` is the whitepaper and the hero, and the hero runs the
engine. Its words change here; the bundle it loads changes in N3c.

**N3a status, 2 Oct 2026: done on `rename`** — `46a3c60` (red: `scripts/name.test.mjs`, in CI's `core` job, 57 places), `104178c`, and the docs after it: what a person sees says dyna.ink — the app's title, home-screen title and wordmark at both addresses, both manifests, a board's title, the help pane's version line and the log's note; the whitepaper's titles, tags, prose, plates (through `build.py`), timeline and wordmarks (*dyna* in the accent, *.ink* in the ink, as *Meta* was), with "dyna.ink (formerly MetaMedium)" once in the overview and Kay's *metamedium* left as written, lowercase; the 404; DynaInk3D on the 3D surface's page and help pane; README's head. The social card is `Assets/thumb-dynaink.png` (`node Assets/make-card.mjs`), named by `og:image` and `twitter:image` in `index.html` and `404.html`; `thumb-metamedium-v5.png` stays published. The name test reads markup and inline scripts' strings, never comments or code, and lets the old name stand only in an address, Kay's idea, an outside work's title, and four reasoned allowlist entries — the history line, the `metamedium-version` tag and its readers (N3b removes it), the `metamedium-brand-theme` key (kept, §2), the license line (N2 removes it). The gate 892 passed, 11 skipped; WebKit 69 and 3.

### N3b: releases and the build

**Owns:**
- `scripts/build-app.mjs` (the `<meta name>` it stamps and checks), every reader of that tag by name
  (`17-folder.js`'s `logWrite` and `20-controls.js`, found by N1), and
  `scripts/release.mjs` (`dynaink-<version>.html`, the release title "dyna.ink
  <version>", its first line).
- Their tests, and the help pane's reader of the meta tag in `20-controls.js`.
- `e2e/app.mjs`'s version check, and anything in `cloudflare/` that reads the
  stamp.

**Red first:** `release.test.mjs` and `build-app.test.mjs` assert the new names
and fail.

**Checks:** `node --test scripts/build-app.test.mjs scripts/release.test.mjs`;
`node scripts/release.mjs 0.2.0 --dry-run`; `node e2e/run.mjs app`.

**Trap:** the help pane reads the meta tag by name. Rename the stamp and the
reader together, or the pane says "this page carries no version".

### N3c: the two folders

**Owns, the engine:**
- `git mv metamedium-core core` and `core/package.json`: the name, the
  description, `--global-name=DynaInkCore`, both banners, both outfiles
  (`dynaink-core.browser.js`, `dynaink-core.node.mjs`).
- The committed bundles in `Demos/`.
- Every file that loads them: `Demos/session-engine.html`, `Demos/sw.js` (the
  shell), `index.html`, `Demos/build-standalone.mjs`,
  `Demos/record-canonical.mjs`, the bench, `scripts/release.test.mjs`,
  `e2e/app.mjs` and `cloudflare/build-site.mjs`.
- `Demos/surface/00-core.js`: `window.DynaInkCore`, with `window.MetaMediumCore`
  assigned the same object for one release.
- Every `import` of the Node bundle (`Demos/mcp.mjs`, the smokes, the relay's
  tests, `seat-watch.mjs`).

**Owns, the 3D surface:**
- `git mv shard-3d dynaink-3d`, its `package.json` name, its `tsconfig.json`
  path and `vite.config.ts` alias to `core/`, and its 45 files importing
  `'metamedium-core'`, which become `'@dynaink/core'`.
- `.mcp.json`'s path to its MCP server, `e2e/run.mjs` and `e2e/servers.mjs`
  (vite over it), `.claude/launch.json`, `.gitignore`, and the fixtures that
  name the folder (`gliner-seat/fixtures/`, `core/src/store/format.files.test.mjs`,
  `core/src/session/held.test.ts`, the bench).

**Owns, both:** `.github/workflows/ci.yml` and `deploy-cloudflare.yml`, and
`app/` through the build.

Find every file by search; the lists here are from 2 Oct.

**Red first:** the gate's `app` scenario, run with the old bundle name still in
the shell and the new one on the page: "opens with no network" must fail. Then
fix the shell.

**Checks:** the whole suite with the new paths (§6), and `cmp` of both bundles
against a fresh build.

**Invariant:** one core, many surfaces. Nothing is copied while moving; the 3D
surface still imports the engine from source.

**Traps:**
- The offline shell. The service worker caches by the names it lists, so a
  bundle renamed on the page and not in `sw.js` loads fine online and breaks
  offline. Only the `app` scenario's offline step sees it.
- `node_modules` move with a folder. Make them again in the moved folders
  (`npm ci`, or copy-on-write clones) and never symlink: memory says a
  symlinked one makes vite hang.

### N3d: the MCP hands

**Owns:**
- `.mcp.json`: `dynaink`, `dynaink-3d`.
- `Demos/mcp.mjs` and `dynaink-3d/mcp.mjs`: `serverInfo.name`, the
  `instructions` ("You are a hand on a dyna.ink canvas", "…in a DynaInk3D
  space"), and the tool descriptions.
- `Demos/mcp-client.mjs` (`clientInfo` `dynaink-door`) and `seat-watch.mjs`'s
  words.
- Both smokes, and the `seat` and `hand` scenarios' strings.

The rooms keep their names (`claude`, `shard`), and the tools keep theirs
(`canvas_*`, `space_*`).

**Checks:** `node Demos/mcp-smoke.mjs`; `cd dynaink-3d && node mcp-smoke.mjs`;
`node e2e/run.mjs seat hand`.

**Trap:** a running Claude Code session holds the old server names. After the
merge, every session reconnects (`/mcp`), and tool ids change from
`mcp__metamedium__…` to `mcp__dynaink__…`. Any note, skill or memory that names
a tool by id changes with them, and the director says so to John at the merge.

### N3e: what Claude Code reads

**Owns:**
- `skills/metamedium-code/` → `skills/dynaink-code/` and
  `skills/metamedium-design/` → `skills/dynaink-design/`, including the names
  inside them.
- The living documents: `CLAUDE.md`, `README.md`, `ROADMAP.md`,
  `EXPERIMENTS.md`, `HELP.md`, `brand/README.md` and the header comment of
  `brand/tokens.css`, `e2e/README.md`, `cloudflare/README.md`,
  `dynaink-3d/README.md` and `core/README.md`.
- Each document's paths changed for the two folders.

The dated documents stay as written (§2). Memory notes are the director's to
change after the merge.

**Checks:** the name test; every path a living document names exists (search
the living documents for `metamedium-core/` and `shard-3d/` and find none).

**Invariant:** one definition, one home. `CLAUDE.md` points to §1 of this plan
for the spellings and does not restate them.

### N4: dyna.ink becomes the address

**Preconditions:**
- John's eight steps in `cloudflare/README.md` are done: the workflow is green,
  `dyna.ink` and `relay.dyna.ink` are bound, and the site answers.
- N1 is on both addresses.

**Steps:**
- **Canonical links name dyna.ink**: `og:url`, `og:image`, the README's links,
  `CLAUDE.md`'s "published at", and `e2e/app.mjs`'s `SITE_URL`. The app scenario
  still asks every old address the documents link, which GitHub Pages goes on
  answering.
- **The old address says so**: N1's notice is turned on there, and nowhere
  else, with the tap.
- **Not done here**: the old address is not turned into a redirect. It stays
  the same app, so a board kept there can always be carried. Retiring it, if
  ever, is a later unit, after a long window.

**Checks:**
- The deploy workflow is green, and both the GitHub Pages build and the
  Cloudflare deploy finish (memory: a silent Liquid failure once stopped Pages
  for a day).
- `https://dyna.ink/app/` installs and opens offline.
- A carry from the old address to dyna.ink works by hand, on an iPad and on a
  desktop.
- Every address the whitepaper, `404.html` and the README link to answers on
  both homes.

**Trap:** the whitepaper's absolute links and embeds. A link that names
`jjh111.github.io` sends a reader of dyna.ink back to the old home. Links within
the site are relative, and the address search in the app scenario is how to
know.

### N5: release 0.2.0

`node scripts/release.mjs 0.2.0` cuts the first dyna.ink release, titled
"dyna.ink 0.2.0", with `dist/release/dynaink-0.2.0.html`.

### H1: the organisation (before a hard launch)

Create the organisation and transfer the repository into it (for example
`dynaink/dyna.ink`).
- **dyna.ink does not move**, because Cloudflare serves it. The GitHub Pages
  address would change with the owner's name, so the old address needs care at
  this step: either keep a repository at the old name serving the old address,
  or let N4's window have done its work first.
- GitHub redirects the repository's own URLs after a transfer, as long as
  nobody creates a new repository at the old name.
- The following change with it: the deploy workflow's secrets (they move with
  the repository; check), the fetch URL in every checkout and worktree, the URL
  `release.mjs` prints, `CLAUDE.md`'s push instruction, and the README's GitHub
  links.
- The private repository for the paid layer lives beside it. Reserving the
  organisation's name costs nothing and is in the admin list now.

## 6. How the agents run

**The freeze.** From N0 to N3e nothing else lands on `master`, and every lane
is closed. The old lane worktrees (`~/MetaMedium-w2`, `-mathslane`,
`-shardlane`) stand at `36eb339`, 257 commits behind, and are made again after
N3e.

**Where.**
- N0 runs on `master` in the main checkout.
- Every other unit runs in a fresh worktree on branch `rename`, outside
  `~/Documents` (memory: fresh binaries block on their first read inside it),
  for example `~/dynaink-rename`.
- Dependencies are copy-on-write clones (`cp -Rc`) of `master`'s, or `npm ci`;
  never symlinks.

**Who.** One Opus subagent per unit, in ladder order. Between units the
director reads the diff against the unit's checks, invariant and trap, and runs
the whole suite.

**The whole suite** is what `.github/workflows/ci.yml` runs, run here. After
N3c, `metamedium-core` reads `core`, `shard-3d` reads `dynaink-3d`, and the
bundles are named as §1 says:
```
cd core && npm run typecheck && npm test && npm run build:browser && npm run build:node \
  && cmp dist/dynaink-core.browser.js ../Demos/dynaink-core.browser.js \
  && cmp dist/dynaink-core.node.mjs ../Demos/dynaink-core.node.mjs
node Demos/mcp-smoke.mjs
node --test Demos/surface/*.test.mjs Demos/relay.test.mjs Demos/ink-png.test.mjs Demos/build-surface.test.mjs \
  scripts/*.test.mjs cloudflare/relay/relay.worker.test.mjs cloudflare/relay/relay.parity.test.mjs \
  cloudflare/relay/relay.hands.test.mjs cloudflare/site.test.mjs
node Demos/build-surface.mjs --check && node scripts/build-app.mjs --check && node scripts/examples.mjs --check
cd dynaink-3d && npm run typecheck && npm test && node mcp-smoke.mjs
node e2e/run.mjs && node e2e/run.mjs --browser webkit smoke pencil keep
```
Where this list and `ci.yml` disagree, `ci.yml` is right and this list is
stale.

**Never:**
- a push or a merge to `master` (both are John's);
- the e2e on John's own origin;
- a rename inside a dated document;
- a key in any file;
- a change to `mm-*` keys, `mm-boards` or the `mm` contract;
- a deploy (the workflow deploys on John's push).

**The brief**, with the unit filled in:

> You are implementing unit **‹X›** of `RENAME-PLAN.md` in the worktree
> ‹path› on branch `rename`. First check the worktree is clean and at the tip
> of `rename`. Read `CLAUDE.md`, `GUIDE-2026-10-02.md` §4.2, then §0–§3, §5 ‹X›
> and §6 of the plan. Write the red-first test and show it failing. Make the
> change. Run the unit's checks, then the whole suite in §6, and cap any single
> command at 15 minutes: if one runs past that, stop it and report what was
> running. Commit on `rename` with the unit's id in the subject. Do not push,
> merge or deploy. Report what changed, each check's result with its numbers,
> and anything §2 should keep that you found named.

## Beside it: the admin track (John)

The list is in the conversation that wrote this plan, and in John's own notes.
In short: file the trademark application, sign the IP assignment, do the eight
Cloudflare steps, lock down the domains, reserve the organisation and the npm
scope, get the contributor agreement's text, and rotate the Jev key
(`GUIDE-2026-10-02.md` §6.4).

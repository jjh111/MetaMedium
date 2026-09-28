# The browser gate

The two browser scenarios this repo already has were only ever run by a human
pasting into a console, so nothing stopped a regression in either from reaching
`master` (`DIRECTOR-REVIEW-2026-09-15.md`, QA-1). This is the thing that runs
them without a console.

It does not reimplement them. `Demos/session-engine.e2e.js` and
`shard-3d/e2e.js` remain the tests; `run.mjs` starts servers, opens a fresh
browser, loads each harness, awaits the result object the harness returns, and
exits nonzero if anything in it failed.

## Running it

```bash
cd e2e && npm ci && npx playwright install chromium   # once
node run.mjs            # from anywhere: the default nine (canvas, keep, boards, app, pencil, budgets, shard, demo, demo2)
cd e2e && npm run e2e   # the same thing

npx playwright install webkit                   # once, for WebKit
node run.mjs --browser webkit smoke             # the WebKit smoke, ~2 s
cd e2e && npm run smoke:webkit                  # the same thing
node run.mjs --browser webkit smoke pencil keep # what CI's webkit job runs, ~30 s
cd e2e && npm run webkit                        # the same thing
```

`shard-3d` needs its own `npm ci` first — the runner says so rather than
guessing. Pick scenarios by name to run one: `node e2e/run.mjs canvas`,
`node e2e/run.mjs shard demo`.

| scenario | what runs | where |
|---|---|---|
| `canvas` | `__setup(); __scenario()` | `Demos/session-engine.html?fresh=1&nosw=1` over a static server on the repo root |
| `shard` | `__scenario()` | `shard-3d/` over vite |
| `demo` | `__demo()` | `shard-3d/` over vite, in its own context |
| `demo2` | `__demo2()` | `shard-3d/` over vite, in its own context |
| `smoke` | four checks written in `run.mjs` itself | `Demos/session-engine.html?fresh=1&nosw=1`, usually with `--browser webkit` |
| `keep` | no lost work — `keep.mjs`, written here, not a page harness | `Demos/session-engine.html?nosw=1`, in several contexts of its own |
| `boards` | several named boards — `boards.mjs`, written here, the boards pane driven with the real pointer | `Demos/session-engine.html?nosw=1`, in one context, with a second and third tab |
| `big` | a 2,000-mark board saved and opened again (opt-in, minutes) | the same page, with the board from `metamedium-core/bench/board.mjs` |
| `app` | one app address — `app.mjs`, written here: `/app/` installs, opens with the server gone, and is versioned per release | `app/` over the static server, then a server of its own it can take away, then a copy of the site it releases again |
| `pencil` | pencil and tablet — `pencil.mjs`, written here: the pen and fingers synthesised in the page as iPadOS delivers them, and the keyboard as it tells the page | `Demos/session-engine.html?nosw=1` at 1180 × 820, in one context, reloaded once |
| `budgets` | the surface's budgets and the equivalence check — `budgets.mjs`, written here, not a page harness | `Demos/session-engine.html?folder=…`, the bench's boards served from memory, a context each |

`--browser chromium` (the default) or `--browser webkit` picks the engine, and
the run's `e2e.json` records which as `browser` / `browserVersion`. `smoke` is
**opt-in**: a bare `node run.mjs` runs the nine Chromium scenarios (`canvas`,
`keep`, `boards`, `app`, `pencil`, `budgets`, `shard`, `demo`, `demo2`) and
nothing else, so the default gate needs no second engine installed. CI's
`webkit` job runs `smoke`, `pencil` and `keep` on WebKit.

### The WebKit smoke, and what it is not

**It is a WebKit smoke, not an iPhone test.** It is desktop WebKit, headless, at
1440×900 — the engine Safari is built on, not a phone, not a touch screen, and
not a viewport pretending to be either. What it checks is the short list the
review asked for, and the pill week 1's plan added: the board loads, a hand
draws ink with real pointer input, the engine reads that ink back (a line, with
a weight), press-and-hold opens the field, and one pill in it is taken with a
click — *Draw them clean*, the held line's one pill that asks no model — after
which the line carries its clean form. It takes about two seconds.

It deliberately does **not** load `Demos/session-engine.e2e.js`. That harness is
over two hundred records and its own stub model; running it on a second engine would
be a second full gate wearing the word "smoke", and a gate that costs two
minutes is one whoever waits on it turns off.

A full run of the six is about 200 s headless (27 Sep 2026, on a shared
machine). `E2E_HEADED=1` watches it;
`E2E_RESULTS=<dir>` moves the output; `E2E_TIMEOUT_MS` raises the per-scenario
ceiling.

### No lost work: `keep` and `big`

The board a browser keeps when there is no folder (V1-PLAN R3) cannot be tested
inside one page: its claim is about the page going away. So `keep.mjs` drives the
surface from outside, with Playwright's real pointer, and opens and closes pages
itself — several contexts, each with the gate's own guards.

- **The kill test** (K). Two boards — the first, and one made through the boards
  pane in the first cycle (R1) — ten cycles. Each opens the page in a new tab
  (which opens the board opened last), checks that every stroke whose release the
  page had taken is on it, in order, with nothing undone, switches to the other
  board through the pane and checks that one too; draws boxes (undoing now and
  then, and switching boards between two strokes in half the cycles); and kills
  the page at a random point — right after a release, *during* one (the release
  sent and the kill sent behind it: the stroke must then be there whole or not at
  all), mid-stroke, right after an undo, a moment later, right after a switch, or
  in the middle of one. A kill is Chromium's
  `Page.crash` (the renderer dies: no pagehide, nothing flushed) or `page.close()`
  (WebKit's only kind). The seed is printed; `E2E_KEEP_SEED` runs one again and
  `E2E_KEEP_CYCLES` changes the count.
- **A save forced to fail** (Q, B). Browser storage filled to its limit and the
  origin's quota taken to nothing through the DevTools protocol, so IndexedDB
  refuses with a real `QuotaExceededError` (Chromium; the quota must be down
  before the page first opens its store, or Chromium never looks at it again) —
  and, on both engines, every storage door made to throw `SecurityError` (a
  private window, blocked site data). The status line must say it at once, keep
  saying it, offer the ways out, and let it go when a save succeeds; both ways
  out are taken.
- **Flush on the way out** (F, Chromium). A write waiting for its retry —
  refused, then room made, the next try not yet due — must go when the page
  does: the tab closed (pagehide), or hidden and then crashed
  (visibilitychange). Take the two listeners out and both checks fail.
- **The import** (I), **two tabs** (T), and **pages that must not write** (L: a
  live room, an embed, a replay).

`big` puts a 2,000-mark board from the engine benchmark's generator on the page
(6.6 M characters of log — past the ~5 M browser storage refused), draws one more
stroke with the real pointer, reloads, and checks every event is back. Each open
replays the board, which at that size is R4's problem: a run takes minutes.

### The surface's budgets: `budgets`

`PERF.md`'s budgets are the 2,000-mark board's, and v1 ships when they hold
(V1-PLAN R4c, §11.3). `budgets` opens boards from the engine benchmark's
generator (`metamedium-core/bench/board.mjs`, the same seed, served from
memory as a published folder) and does two things.

- **The equivalence check**, on the 500-mark board: every mark pointed at in
  turn at zoom 1, three boxes drawn with the real pointer and undone, every
  loose mark held — and after each, the board painted twice (`paintCheck` in
  `08-render.js`: once as a hand's paint does, once as the whole-board read
  would, uncached and unculled), what each drew and said compared, and every
  mark's role and held group compared with the whole board's (`rolesCheck`,
  `heldCheck`). It is not a speed, so it runs on any machine and any engine.
- **The budgets**, on the 2,000-mark board in Chromium: open, release →
  reading drawn, a pointer move, a pan at working zoom and zoomed out to the
  whole board, each a step with its number against its budget. A machine
  too loaded to measure (a one-minute load past three quarters of the cores)
  or slower than the one the budgets were set on (a fixed calibration run in
  the page, 1.4× its time there) says so in each step's name and skips it:
  never a silent pass, never a failure that is the machine's.

The same measuring is `perf.mjs`'s, beside the gate, for any board size and
WebKit; it prints each budget within or over. About 30 s.

### Several boards: `boards`

`boards.mjs` (V1-PLAN R1, acceptance A8) drives the control centre's *boards*
tile and its pane the way a hand does, in one context that starts from a board
written the way R3's surface wrote it (IndexedDB version 1, one whole record
under `default`, made by the committed Node bundle): **N1** it comes back byte
for byte as the first entry, "My board", named on the tile and in the title;
**N2** new; **N3** switch, the board left whole in the store the moment the
switch completes; **N4** reload, `?board=`, an id not held said; **N5** rename
(the same id, so the same journal; two boards named alike); **N6** duplicate;
**N7** delete to the trash; **N8** restore; **N9** emptying the trash said
plainly first, then done — entry, meta and every record gone, nothing else;
**N10** a board open in another tab kept in the trash; **N11** one tab writes a
board, per board; **N12** the view per board (and **N12b**: a board that opened
fitted and was never moved comes back there, not refitted); **N13** folders and sites as
recent places of their kind; **N14** Reset no longer one tap from losing a
board; **N15** a board out as a log file from the export pane and back in from
the boards pane; **N16** a board that is not saved (every record refused: the
page's `IDBObjectStore.add` throws a real `QuotaExceededError`, both engines) is
never left without a word — the switch refused in the pane with its ways out,
nothing the store held lost while writes fail, and the switch going once a save
lands. About 15 s, on Chromium and WebKit.

### One app address: `app`

`app.mjs` (V1-PLAN R7) is the app at `/app/` — made from the old address by
`scripts/build-app.mjs` — asked what a person installing it would find, with
the real pointer where it draws. Fourteen records, about ten seconds, the same
on Chromium and WebKit (`--browser webkit app`):

- **On the gate's own static server** (A1–A11): every file `/app/` asks for
  answers and its stylesheet applies; the manifest it links starts and is
  scoped at `/app/`, and Chromium's own installability check (the DevTools
  protocol's `Page.getInstallabilityErrors`) finds nothing in the way; the
  worker's scope is `/app/` **and the page is controlled by it** — a worker
  registered at a narrower scope registers without a word and controls
  nothing, while Chromium still calls the page installable, so the scope is
  what is tested (narrow it, and A3, A5 and B1 fail); a box drawn is kept,
  and comes back on a reload the worker served; `?fresh=1` and `?board=` are
  read there, and `/app?board=` lands on `/app/?board=` (the static server
  sends a folder asked for without its slash to it, query and all, as Pages
  does); the help pane says `VERSION`; a same-origin request carrying
  `Authorization` — or asking for an event stream — is never kept, while the
  same request without one is; the old address opens as it did, with its own
  worker at `/Demos/`, on the same board; that worker keeps to its own caches;
  and every address the whitepaper, `404.html` and the README give into the
  site still answers — each link, the social card's image, the root, a
  replay's recording with the page that plays it, and the v4 whitepaper's
  redirect stub.
- **With the server gone** (B1): a server of its own over the repository,
  one visit, a box drawn, the server stopped — connection refused — and
  `/app/` reloads from its worker's cache with the box on the board, and an
  address it never saw online opens too. Not Playwright's offline switch: in
  WebKit that fails a request before the worker can answer it.
- **A release** (C1, C2): a copy of the site, visited once; then the next
  version made over the copy as the release script makes it (`VERSION`
  bumped, `scripts/build-app.mjs` run) with the help's text changed; one
  online reload; the server gone. The page, its version line and its help
  are the new release's, and the old release's cache is gone. **C2 is the
  control**: the same release with the worker put back as it was, so its
  cache keeps its name — and offline the new page comes back beside the
  **old** help, the stale shell a cache named for the release prevents.

### Pencil and tablet: `pencil`

`pencil.mjs` (V1-PLAN R6, acceptance A10) is the canvas by pen and finger.
A desktop engine has neither, so both are **synthesised in the page**:
`PointerEvent`s with `pointerType: 'pen'` (a pressure and a tilt on each) and
`pointerType: 'touch'` (a finger; a palm is a wider one), dispatched at the
canvas with their own pointer ids, the way iPadOS delivers a pencil and a
finger — the surface decides by `pointerType`, never by the user agent, so the
events mean here what they mean on the glass. The on-screen keyboard is told
to the page as iPadOS tells it: the layout viewport stays and the **visual**
viewport shrinks — `window.visualViewport` stood in for by an init script
before the page's own scripts run, whose `resize` the page's listeners hear.
The mouse is Playwright's real pointer. Fourteen records, about ten seconds,
the same on Chromium (in the default run) and WebKit (CI's `webkit` job):
**P1** the pen draws and every point of its stroke carries its pressure;
**P1b** the switch to the pen said once, the hand tile saying `right · pen`;
**P2** a finger pans while a pen is present and draws nothing; **P2b** two
fingers pinch and leave nothing in the log (a pinch's last finger used to
commit a stroke with no points, and throw); **P3** a palm that lands while the
pen draws adds nothing to its stroke; **P3b** a palm just after the pen lifts
is nothing, and one just before it lands has its pan put back; **P4** the
pencil's hover shows the reading under it and the magnet ghost, nothing
logged; **P5** the pen holds a box, the field opens, a pen tap on *Draw them
clean* takes it; **P6** the pen taps undo; **P7** the keyboard up — at 360 and
260 px left the field stays in the visible viewport, its pills scrolling in
what fits and every one scrolled to and hit, let go when the keyboard goes or
the pills fit again, and *Label it* taken with a word typed; **P8** the hand
tile gives a finger its ink back, a palm still draws nothing, a field a finger
opened does not take the focus, four taps come round; **P9** the mouse
untouched — it draws, with no pressure, and its hover draws no ghost; **P10**
saved and reloaded, every stroke back with its pressure, the preference kept
and the pen not announced again. What only the glass can say — a real
Pencil's hover height, a real palm, the real keyboard, Scribble — is
`QA-v1.md` §A10, by hand on an iPad.

## What it refuses to do

**Carry anything between scenarios.** One browser context each — its own
storage, its own cache, its own board — so a stub or a saved log from the run
before cannot make the next one pass. The static server answers `no-store` for
the same reason: after a rebuild, a context that kept the old bundle would be
testing yesterday's engine and saying nothing.

**Open a demo URL.** The shard is only ever loaded bare. `?demo=…` draws a
board at boot and seats its own stub, which is what made a review run fail for
a reason that had nothing to do with the app.

**Reach a model.** Every request is routed; anything aimed at Ollama, LM Studio,
OpenRouter, Anthropic, OpenAI and their kin is aborted and **fails the run**.
The canvas harness replaces `fetch` itself, but that is the page's promise to
itself — this one covers the shard, which has no stub, and everything that runs
before `__setup()`. The run's own origins are exempt, in case the OS hands vite
port 1234.

## Counting

Pass, fail and **skip** are counted separately: a record whose name says it
skipped is a skip, not a pass. Today exactly one is — the canvas's `25d`, which
says so in its own name. A failed assertion, a harness exception, an attempted
model request, or a page error that is not on the allowlist all fail the run.

The allowlist lives in `guards.mjs`, and each entry names the source that throws
and why it is thrown on purpose. There is one: the canvas scenario's step 27d2
imports a program that throws *later*, because that is precisely what the step
asserts the surface survives. Anything else is a failure.

## Output

`e2e/results/` (untracked): `e2e.json` for the run, one file per scenario with
every record and its detail, and `<scenario>-failure.png` when one fails. CI
uploads the directory as an artifact when the job is red.

## Beside the gate

Two more runners live here, on the gate's static server (`servers.mjs`), and
neither is the gate — `node e2e/run.mjs` never starts them and CI does not run
them. `perf.mjs` times the surface on generated boards, behind the gate's model
guard, and asserts nothing; its numbers are `PERF.md`'s. `whitepaper-figures.mjs`
audits the whitepaper's graphic plates in Chromium and WebKit at several widths
and in both themes (`Assets/whitepaper-figures/README.md`).

## What is not here yet

The canvas harness and the shard's three are still Chromium only. WebKit
gets the smoke, `pencil` and `keep` in a job of their own (`webkit` in
`.github/workflows/ci.yml`: `npx playwright install --with-deps webkit`, then
`node e2e/run.mjs --browser webkit smoke pencil keep`, with `e2e/results`
uploaded as `e2e-webkit-results` when it fails); `boards` and `app` pass on
WebKit on macOS but are not in that job. None of it is an iPad: that is
`QA-v1.md` §A10, by hand. Real-model evaluation stays a separate opt-in lane; nothing here is
evidence about model quality. The two large scenarios are still one case each;
splitting them is meant to be incremental and must not discard the full-loop
acceptance run.

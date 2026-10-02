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
node run.mjs            # from anywhere: the default twelve (canvas, keep, boards, app, pencil, models, seat, hand, budgets, shard, demo, demo2)
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
| `models` | a hosted model is asked, and says why when it cannot be (V1-PLAN J5) — `models.mjs`, written here: the models pane and the field driven with the real pointer against `startModelStub` (`servers.mjs`), an OpenAI-compatible endpoint on 127.0.0.1 answering in OpenRouter's recorded shapes (`metamedium-core/src/llm/fixtures/`); nothing on this machine is probed — Ollama's list is a stand-in in the page, LM Studio does not answer | `app/`, in one context, reloaded once |
| `seat` | the canvas's seat — `seat.mjs`, written here: Claude Code over MCP as the model the field asks, with a relay of its own, `Demos/mcp.mjs` as the answerer over stdio and `Demos/seat-watch.mjs` beside it | `Demos/session-engine.html?live=claude&relay=…&nosw=1`, in one context, reloaded once, and a second page for *with Claude* |
| `hand` | the hand in the gate (V1-PLAN H1) — `hand.mjs`, written here: QA-v10's machine rows with `Demos/mcp.mjs` as a hand over stdio in room `mcp-test`, a relay of its own, a tab as *john*, and a counting model of the gate's own | `Demos/session-engine.html?live=mcp-test&relay=…&nosw=1`, in one context, reloaded once |
| `budgets` | the surface's budgets and the equivalence check — `budgets.mjs`, written here, not a page harness | `Demos/session-engine.html?folder=…`, the bench's boards served from memory, a context each |

`--browser chromium` (the default) or `--browser webkit` picks the engine, and
the run's `e2e.json` records which as `browser` / `browserVersion`. `smoke` is
**opt-in**: a bare `node run.mjs` runs the twelve Chromium scenarios (`canvas`,
`keep`, `boards`, `app`, `pencil`, `models`, `seat`, `hand`, `budgets`, `shard`, `demo`, `demo2`) and
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
  the page, 1.4× its time there), or one whose page draws with a software
  renderer (SwiftShader, llvmpipe — WebGL names it; a container's paint is
  several times slower while its calibration reads as that machine's), says
  so in each step's name and skips it:
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
lands; **N17** a library pack used from the packs pane with the pointer is kept
with the board — its `use` in the journal, the board reopened after a reload
using it — and so is its `unuse` (V1-PLAN B3). About 18 s, on Chromium and
WebKit.

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
The mouse is Playwright's real pointer. Fifteen records, about twelve seconds,
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
and the pen not announced again; **P11** the pen drags a handle of the one
selected box — one reshape, no stroke, no summon, the ink as drawn — and a
finger laid on another of its handles pans (V1-PLAN E1). What only the glass can say — a real
Pencil's hover height, a real palm, the real keyboard, Scribble — is
`QA-v1.md` §A10, by hand on an iPad.

### The canvas's seat: `seat`

`seat.mjs` (V1-PLAN J4) is Claude Code as the model the field asks, with no
model anywhere. It starts a relay of its own on a free port of 127.0.0.1 —
never `:8020`, the default, where a room of John's may be; any request a page
of the scenario makes there is refused before it leaves and counted (J4.8) —
and on it `Demos/mcp.mjs` as the seat's answerer, spoken to over stdio from the
script the way Claude Code speaks to it, and `Demos/seat-watch.mjs`, whose
lines are collected. The models pane probes :11434 and :1234 as it opens;
there that probe is refused in the page before it leaves, as on a machine with
neither server, and the gate's guard stands behind it for everything else.
Twelve records, about thirteen seconds: **J4.0** no room — the pane leads with
Claude Code and says in one sentence how to reach it, nothing to join; the key
form no longer offers the door, which stands under *advanced*; **J4.1** in the
room with Claude's hand present, one tap on *Claude Code — in this room* takes
the seat, at the front of the models, seeing, local; **J4.2** *What is this?*
on two boxes parks one brief about them, shown working beside them, the
watcher prints one line, and `canvas_pending` lists it by the brief's own id
with the marks and the contract; **J4.2b** `canvas_answer` lands the readings
as a model's — held, attributed to the seat — and no card is drawn for the
brief or its reply; **J4.3** *Read the writing* on a word parks a read and the
hand is handed the word's ink as a PNG; **J4.3b** the transcript lands on the
word; **J4.4** a refusal is said, *claude would not: …*, and nothing lands;
**J4.5** a brief nobody answers: Esc with nothing held withdraws it and the
hand no longer lists it; **J4.5b** the watcher printed one line per brief,
four, and nothing else; **J4.6** a reload — a new sitting — finds the answered
brief still paired by its own id, the seat's readings still on the boxes;
**J4.7** *with Claude* in the Live pane joins the room and takes the seat in
one act, *Claude is here and will read for you*; **J4.8** nothing reached
`:8020`.

### The hand in the gate: `hand`

`hand.mjs` (V1-PLAN H1, acceptance A7; week 1's U7) is the use-review's
machine half: `QA-v10.md`'s rows that a machine can walk, with the MCP hand in
the room. A relay of its own on a free port — never `:8020`; a request there is
refused and counted (H1.Z) — `Demos/mcp.mjs` as a hand called *claude* in room
`mcp-test`, spoken to over stdio the way Claude Code speaks to it, and a tab on
the static server named *john* (the name the *live* pane would give it), its
pointer the harness's. **A model of the gate's own** joins the tab — an
OpenAI-compatible endpoint on a free port that counts what reaches it and waits
a moment before it answers — so the invariant is measurable: *Tier 1 before a
model* (DIRECTOR-PLAN-W1 U7). Nothing a hand or a person does short of asking
may reach it; it is asked once, by *What is this?* (H1.19), and H1.Y holds the
count to that one, the working registry empty, no brief parked, the seat not
taken, no real model reached. (Mutation checked: with auto-read switched on in
the tab, H1.19 and H1.Y fail.) Every stroke a record draws is generated and
says `synthetic` in its name; the rows that need John's own handwriting are
**skips by name** (H1.S1–S3, the writing of §1–§3; H1.S4, a small model that
fails on its own terms) and so is the ghost's timing (H1.5b, a drawn frame).
Thirty records, twenty-four passing and six skipped, about a minute:
**H1.0** the hand and the tab meet; **H1.1** the model joins and the hand's
arrival and looks ask it nothing; **H1.2–H1.6** §4 — a mark beside a box that
crosses nothing opens nothing, across it the field opens on the box and is his
alone (the hand's look never says *selected* or *the field is open*), one tap
lets go and the next stroke draws, the snap tile counts the circle, a box drawn
below a held text (which the hand wrote) is a box; **H1.7–H1.18** §6 and A7 —
the hand's circle lands in its own colour with its card, a sentence lands on his
box alone under the id his own tab gave it, a transcript lands on his word with
no model asked, a proposed reading is held and attributed, one undo takes only
his last mark and his next number is new, the hand labels its own circle and is
refused on his box, his `label:` says before Enter what it will not go on, a
field left open stays open under the hand's line and `name: pair` makes the
thing his, a loop that waits waits under the hand's stroke, a reload is a new
sitting and the same person (the board back under its old ids, a label on a
mark drawn before it, the hand's own refused), and after undo and reload a
sentence and a reading land on the marks they were about; **H1.19** the one
deliberate ask; **H1.20–H1.21** §7 — the minimap and a tap on it, three circles
and two lines shown in 3D and the hand's look saying one running program;
**H1.Y** the invariant; **H1.Z** nothing reached `:8020`.

**What it found**, for the owners: the hand's own `canvas_look` printed a
reading it or another hand proposed as though the engine had read it (fixed in
`Demos/mcp.mjs`, H1.10); a reading the hand proposes was held and attributed on
the tab but **the field's *what this is* row never showed it**, because a hand is
a tier 0 voice and `conversionsFor` in `09-palette.js` left tier 0 out — a
skip by name (H1.10b, *known*) until F1 made it a pass (`isHeardReading`, core);
and `QA-v10.md` §4's *1 selected* predates per-hand gestures (L2h): a hand's
look says neither *selected* nor *the field is open* for another hand's field,
which is what H1.3 holds and `QA-v1.md` says.

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

More runners live here, on the gate's static server (`servers.mjs`), and
neither is the gate — `node e2e/run.mjs` never starts them and CI does not run
them. `perf.mjs` times the surface on generated boards, behind the gate's model
guard, and asserts nothing; its numbers are `PERF.md`'s. `whitepaper-figures.mjs`
audits the whitepaper's graphic plates in Chromium and WebKit at several widths
and in both themes (`Assets/whitepaper-figures/README.md`).
`walk.mjs` is a user's walk (`PLAN-FIELD-PAR.md` §1): eight scenes drawn with
real pointer input, the field opened by a loop and the check or by a hold, and
what it offers recorded with nothing typed and with ten words typed — a map,
printed and kept in `results/walk/`, never a verdict (`node e2e/walk.mjs [name]`).

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

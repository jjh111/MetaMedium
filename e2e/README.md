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
node run.mjs            # from anywhere: the default six (canvas, keep, boards, shard, demo, demo2)
cd e2e && npm run e2e   # the same thing

npx playwright install webkit                   # once, for the smoke
node run.mjs --browser webkit smoke             # the WebKit smoke, ~2 s
cd e2e && npm run smoke:webkit                  # the same thing
```

`shard-3d` needs its own `npm ci` first — the runner says so rather than
guessing. Pick scenarios by name to run one: `node e2e/run.mjs canvas`,
`node e2e/run.mjs shard demo`.

| scenario | what runs | where |
|---|---|---|
| `canvas` | `__setup(); __scenario()` | `Demos/session-engine.html?fresh=1&nosw=1` over a static server on the repo root |
| `shard` | `__scenario()` | `shard-3d/` over vite |
| `demo` | `__demo()` | `shard-3d/` over vite, in its own context |
| `smoke` | three checks written in `run.mjs` itself | `Demos/session-engine.html?fresh=1&nosw=1`, usually with `--browser webkit` |
| `keep` | no lost work — `keep.mjs`, written here, not a page harness | `Demos/session-engine.html?nosw=1`, in several contexts of its own |
| `boards` | several named boards — `boards.mjs`, written here, the boards pane driven with the real pointer | `Demos/session-engine.html?nosw=1`, in one context, with a second and third tab |
| `big` | a 2,000-mark board saved and opened again (opt-in, minutes) | the same page, with the board from `metamedium-core/bench/board.mjs` |

`--browser chromium` (the default) or `--browser webkit` picks the engine, and
the run's `e2e.json` records which as `browser` / `browserVersion`. `smoke` is
**opt-in**: a bare `node run.mjs` still runs the six Chromium scenarios and
nothing else, so the default gate needs no second engine installed.

### The WebKit smoke, and what it is not

**It is a WebKit smoke, not an iPhone test.** It is desktop WebKit, headless, at
1440×900 — the engine Safari is built on, not a phone, not a touch screen, and
not a viewport pretending to be either. What it checks is the short list the
review asked for: the board loads, a hand draws ink with real pointer input, the
engine reads that ink back (a line, with a weight), and press-and-hold opens the
field. It takes about two seconds.

It deliberately does **not** load `Demos/session-engine.e2e.js`. That harness is
two hundred records and its own stub model; running it on a second engine would
be a second full gate wearing the word "smoke", and a gate that costs two
minutes is one whoever waits on it turns off.

A full run is about 70 s headless. `E2E_HEADED=1` watches it;
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

## What is not here yet

The four large scenarios are still Chromium only — WebKit gets the smoke above
and nothing more, which is the honest version of the review's ask and is all it
claims to be. **The CI job is still owed**: `.github/workflows/ci.yml` needs
`npx playwright install --with-deps webkit` and a step running
`node e2e/run.mjs --browser webkit smoke`; until it does, the smoke is something
a human runs. Real-model evaluation stays a separate opt-in lane; nothing here is
evidence about model quality. The two large scenarios are still one case each;
splitting them is meant to be incremental and must not discard the full-loop
acceptance run.

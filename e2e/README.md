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
node run.mjs            # from anywhere: all three scenarios
cd e2e && npm run e2e   # the same thing
```

`shard-3d` needs its own `npm ci` first — the runner says so rather than
guessing. Pick scenarios by name to run one: `node e2e/run.mjs canvas`,
`node e2e/run.mjs shard demo`.

| scenario | what runs | where |
|---|---|---|
| `canvas` | `__setup(); __scenario()` | `Demos/session-engine.html?fresh=1&nosw=1` over a static server on the repo root |
| `shard` | `__scenario()` | `shard-3d/` over vite |
| `demo` | `__demo()` | `shard-3d/` over vite, in its own context |

A full run is about 70 s headless. `E2E_HEADED=1` watches it;
`E2E_RESULTS=<dir>` moves the output; `E2E_TIMEOUT_MS` raises the per-scenario
ceiling.

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

Chromium only. The review asks for a short WebKit interaction smoke rather than
a Chromium viewport test pretending to be an iPhone — that is a separate, honest
addition. Real-model evaluation stays a separate opt-in lane; nothing here is
evidence about model quality. The two large scenarios are still one case each;
splitting them is meant to be incremental and must not discard the full-loop
acceptance run.

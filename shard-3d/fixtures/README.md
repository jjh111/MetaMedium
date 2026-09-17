# fixtures — the boards this plan is settled on

John's own boards, so that `SHARD-3D-PUSH-2.md`'s claims are argued about
against a real drawing rather than a synthetic one. Load one at boot:

```
http://localhost:5174/?fixture=john-2026-09-16-massing
```

`__shard.loadFixture(name)` is the same path, for the e2e, and the bar's
*Open…* takes the same file from disk. Both doors read the same bytes.

## Two kinds of file, and which one supersedes which

**A log (`.mm.log`, `.log`, `.jsonl`) is the board.** One JSON event per line —
core's own `encodeLog` (`metamedium-core/src/store/seam.ts`), the format the
canvas writes too — replayed straight into the session. State is a pure function
of the log, so a log fixture stands up *exactly* the drawing it came from,
readings, planes, solids, names and all. **This is the kind to add**; `?fixture=`
probes for it first, so a log always wins over a view of the same name.

**A view (`.json`) is a picture of a board, and a reconstruction of it.** The
`.json` files here were captured through `__shard.state()` **before there was an
export**, so they hold each mark's plane, bounds and readings and **no stroke
points at all**. `boardFromFixture` (`src/export.ts`) rebuilds circles and
rectangles from the boxes they filled, on their own planes, and the status line
says so every time: *a reconstruction, not a replay: an exported log supersedes
it*. Marks on a **view plane are not rebuilt** — a view holds the camera pose a
stroke was drawn from but not the (u, v) frame the shard built from it, and
guessing at that frame would be calling the guess John's drawing. They are
dropped and counted.

**Both of John's boards are logs now** (G4). The `.json` capture stays where it
is: it is the provenance of the massing board and the only record of the six
view-plane strokes the rebuild could not take, and `src/export.test.ts` still
reads it as a module to pin what the reconstruction does. Nothing loads it any
more.

## What is here

| File | What it is |
|---|---|
| `john-2026-09-16-castle-sketch.mm.log` | **John's FIRST board, 16 Sep 2026** (`SHARD-3D-PUSH-2.md` §0): a rough 6 × 4 footprint on the foundation and three ⊓ drawn from two free standpoints, each with its feet on the ground. Four marks. Before G1 it stood **nothing** — every ⊓ was an `annotation` on a view plane — and it now stands a **hull** with two parts at tier 1, with no model asked. This is the board `?demo=castle` and `__demo2()` drive, and the board `exchanges/castle-sketch.*.json` were answers about |
| `john-2026-09-16-massing.mm.log` | **John's SECOND board, 16 Sep 2026**: three profiles on the three named tiles and a **massing** standing on them, plus one line on the foundation. Four marks. Its claim is the Y fault of §0: the massing stands at **y ∈ [0.97, 3.09]** — floating where the profiles are, not on the floor — which is what `hull.test.ts` pins |
| `john-2026-09-16-massing.json` | The capture the massing log was reconstructed from: ten marks, of which four rebuild (the three profiles and one line) and six were view-plane ink. Its `note` and `reading` fields are the capture's own analysis of the fault, written on the day. **Provenance, not a board** |

## How the logs were made — `make.mjs`

```
node fixtures/make.mjs                    # both boards
node fixtures/make.mjs massing            # just the second
node fixtures/make.mjs castle-sketch      # just the first
```

Two boards, two doors, and the difference is honest rather than hidden:

- **The massing is stood up in Node, through the real session.** `createLog()`
  from `src/log.ts` (which carries no three.js — it is the seam between the space
  and the engine), the three profiles `boardFromFixture` rebuilds from the
  capture, and then `massable()` / `mass()` — the same door `tier1()` reaches
  when a hand draws the third profile. Vite's own SSR loader gives Node the
  TypeScript and the `metamedium-core` alias, so there is no build step and no
  second copy of anything.
- **The castle sketch is exported from the surface itself.** Its three ⊓ lie on
  **view planes** — planes built from where the camera stood and where the cursor
  was placed — and a camera is three.js. Standing them in Node would mean
  reimplementing `view.ts`, and a reimplementation would be writing a different
  drawing. So a browser opens `?demo=castle-sketch`, the demo draws the board
  through the same pointer path a hand uses, and the script takes
  `__shard.logText()`. That is not a simulation of an export; it is one.
  (Playwright comes from `e2e/`'s own `node_modules` — the shard depends on no
  browser.)

Both files are then **stamped**: each distinct `at` in the log, in order, is
rewritten to a fixed base plus a second. Nothing about the board changes — `at`
is what undo groups an act by, and equal stays equal — but the file stops
churning on every regeneration, so a diff shows a change in the **drawing**.

**When one of these boards can be captured again from a live tab, export the log
from the bar and let it replace the file.** A hand's own export is always better
evidence than a script's reconstruction of one, and the format is identical.

## `exchanges/` — the briefs and the replies

`exchanges/` is the other kind of fixture: not a board, but **what was sent to a
model about one and what came back**, verbatim and unrepaired. Its own README
says what is in it and how to add another. A board fixture stands a drawing up;
an exchange fixture pins the contract a model is asked to answer in.

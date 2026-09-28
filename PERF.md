# PERF.md — the performance baseline

*R4a, the measuring half of `V1-PLAN.md` §9 R4 ("measure before indexing").
27 Sep 2026, on `w2-shard`, measuring the engine and the surface exactly as
they stand at `ff330a9` — nothing in them was changed to measure them. What
this unit makes is numbers, the commands that made them, the hotspots ranked
with their evidence, and budgets R4b can hold itself to. It fixes nothing.*

*After R4b (27 Sep 2026, `08a1aef` on `w2`): the engine holds all three
boards. The 2,000-mark board replays in 0.24 s (was 167 s), takes one more
stroke in 0.15 ms (was 256 ms) and holds 12.4 MB (was 1,058 MB); the 5,000
board replays in 0.65 s and holds 45.5 MB. Why lines 1 and 3 below no longer
hold, and what still does, is in the "after R4b" column of the engine's table,
the budgets' table and the three hotspots it fixed (2, 4 and 5). Every number
a hand feels in a browser is still the surface's, which R4c takes next: the
whole-board read below is unchanged, 7.9 s at 2,000.*

*After R4d (27 Sep 2026, on `w2-shard`): a room merges a line, not the
board. On the 2,000-mark board a line another hand sends costs 1.65 ms
median and 2.03 ms p95 (was 312 / 317 ms on R4b's engine, 173 s before
it), applied with no replay; one that crosses a mark this hand drew a moment
before goes back to the checkpoint the last line left, 4.2 / 5.0 ms; a line
with no events does no work; and a newcomer's hello brings each log once —
6.5 MB to it in a room of six, not 32.6 MB. The "after R4d" columns of the
two room tables, and of the budgets' table, say the rest (hotspot 3).*

---

## The answer

| Board | Fit for daily use today? | What a hand feels (Chromium, this machine) |
|---|---|---|
| **500 marks** | **Yes, with one pause** | Opening freezes the tab for 2.2 s while the log replays (2.3 s opened as a folder). After that, drawing keeps the frame rate (a pointer move costs 3.3 ms) and a stroke's reading lands 147 ms after the pen lifts. Panning holds 60 fps at zoom 1, and 30 fps at fit-all, where this headless build paints on the CPU. |
| **2,000 marks** | **No** | Opening as a folder takes 100 s with the tab frozen throughout (Node replays the log in 167–174 s). It cannot reopen from browser storage at all: storage refuses its 6.6 M characters, so autosave has silently stopped saving it. Every stroke freezes the page for 7.6 s when the pen lifts, 7.1 s of it the surface re-reading every mark's role. Each pointer move costs 39 ms, so the ink lags the pen, and panning runs at 20 fps. In a live room every line another hand sends replays the whole board again: about 3 minutes. |
| **5,000 marks** | **No — it does not open** | Chromium's tab crashed 13 minutes (786 s) into opening it as a folder. The renderer's JavaScript heap is capped at 3.5 GB (`jsHeapSizeLimit`, 3,586 MB); the renderer had grown to 3.9 GB of memory, busy on six cores, before it crashed. Browser storage refuses its 16 M characters. Node's default heap limit (4 GB) is far too small for it — by 4,250 marks the process held 31 GB — so it ran with the limit raised to 64 GB. Drawn event by event, the board took 55 minutes to reach 4,250 marks, where I stopped it. By then a stroke cost 2.6 s (p95 4.0 s), and most of the process's time went to the garbage collector. Were the board open, each release would freeze the page for 106 s: the whole-board read, measured on the board's own content plane without a replay. |

WebKit 26.6 tells the same story with different weights: it opens the 2,000
board faster (76.5 s) and paints slower (56–64 ms a paint), and a release
takes 6.0 s.

**Why, in three lines.**

1. **The replay is cubic.** Once a single definition exists, every stroke
   re-relates the whole board to find cluster candidates. That is 61% of the
   replay at 2,000 marks, plus most of the 24% spent collecting the garbage
   those relations leave.
2. **The surface re-reads the whole board's roles after every stroke.** Its
   role table scans every relation for every mark: O(n·R), 8 s at 2,000.
   The same stored relations make every paint walk every mark's edges,
   several times over.
3. **Relations with no distance limit are stored on every mark and cloned
   into a checkpoint every 200 events.** 88% of stored edges are `same-size`.
   That is 1.06 GB held at 2,000 marks, 90% of it in checkpoints. The 5,000
   board's process held 31 GB by 4,250 marks — far past the 3.5 GB a
   Chromium tab may hold.

At 500 marks all three are already there, just small.

---

## How it was measured

**Machine.** Apple M2 Max (8 performance and 4 efficiency cores), 96 GB,
macOS 26.6.2 (25G83). Node v22.23.0 (V8 12.4.254.21-node.56). Chromium
153.0.8010.12 and WebKit 26.6 through Playwright 1.63.0, headless, 1440×900 at
device scale 1: the gate's viewport. Headless Chromium rasterises on the CPU,
so a frame's paint here is not a GPU's.

**The machine was shared.** Other agents worked in other worktrees throughout.
The load average (recorded at the start of every result file) ran 4–11.
The 5,000-mark build ran alongside the 2,000-mark and browser measurements.
At the load most runs saw (4–8), the same measurement repeated moved by about
10%: five cold and warm replays of the 2,000 board took 151–174 s. Under the
heaviest load, with a crashing Chromium tab alongside, it took 223 s; that run
is used only for the size of a model's brief, which does not depend on time.
Read every number here as ±10%.

**The boards** (`metamedium-core/bench/board.mjs`) come from a seed,
deterministically; the generator is saved, never the boards. A *mark* is one
stroke of ink in the log.

- **The strokes.** Each is the shape rung's own vocabulary drawn by
  `strokeFor`, then made hand-like: started anywhere on a loop, overshot or
  left a little short, tilted a few degrees, resampled to a pointer's density
  (a point every 2–5 px, 67–74 points a stroke), wobbled along the normal and
  given sensor noise.
- **The mix.** Small diagrams over a large canvas: flowcharts, molecules,
  notes, page wireframes, hubs and doodles. 38% of strokes are printed
  letters, 97–99% of which the session gathers into words.
- **The acts that are not ink.** 2 / 5 / 13 blessed definitions, the same
  number of text artifacts made the way `writingToText` makes them, a model's
  answers, moves, snaps and scratch-outs.
- **The readings.** Every shape reads as what was drawn: boxes, circles,
  lines and triangles 99–100%. Arrows are 96–100% arrow; the rest crossed a
  box as the command mark, which the engine documents.
- **The sizes.** Logs are 1.5 / 6.6 / 16.1 MB of JSON, and the boards are
  about 5.7 k, 10.5 k and 17.2 k px across.

**What a number includes.** Generating a board is setup and is in no number.
A **cold** load is the first in its process, JIT and all; **warm** loads each
run on a fresh session after a full collection (`--expose-gc`). Medians and
p95 are nearest-rank. A **one more stroke** number is one `addStroke` as a host
calls it: readings, relations, words, wires, the scratch test, the cluster
candidates, a checkpoint when one falls due, and the state handed to
subscribers.

**One engine, measured two ways.** A fresh build of `metamedium-core/src` is
byte-identical to the committed `Demos/metamedium-core.node.mjs` (`lib.mjs`
builds it with the same banner and working directory), and likewise the
browser build. The committed bundle and the source build replay the 2,000
board in 174 s and 170 s — the same engine, inside the noise. Numbers
labelled *source* come from that build, so a profile reads back to
`src/…:line`.

**Profiles** come from the same V8 sampler as `node --cpu-prof`, started and
stopped around the measured section only (`--profile`), and from the Chrome
DevTools Protocol around the pan and one stroke. `bench/profile.mjs` maps
each frame to `src/<file>:<line>` or `Demos/surface/<fragment>:<line>`.

---

## The numbers

Printed from the result files by `node metamedium-core/bench/report.mjs` — a number here is the number a run wrote. Each table ends with the command that made it. Where a cell reads *median / p95*, the percentiles are nearest-rank over the samples named.

### Engine (Node) — replay, memory, relations, the whole-board read, one more stroke

| | 500 | 2,000 | 5,000 | **after R4b**: 500; 2,000; 5,000 |
|---|---|---|---|---|
| log: events · JSON | 530 · 1.53 MB | 2079 · 6.56 MB | 5208 · 16.13 MB | 530 · 1.53 MB; 2079 · 6.56 MB; 5208 · 16.13 MB |
| content plane after replay (marks, words, artifacts) | 336 (4 artifacts) | 1377 (10 artifacts) | 2859 (after 4250 strokes) | 336 (4 artifacts); 1377 (10 artifacts); 3364 (26 artifacts) |
| **replay (`load`), cold** | 2.64 s | 169.7 s | — | 76.2 ms; 273 ms; 706 ms |
| replay, warm (median of n) | 2.58 s (n 5) | 166.9 s (n 2) | — | 56.6 ms (n 5); 241 ms (n 2); 650 ms (n 2) |
| replay, committed bundle (cold · warm) | 2.61 s · 2.57 s | 174.3 s | — | 76.2 ms · 60.3 ms; 282 ms · 247 ms; — |
| drawn event by event (`build`) | 2.65 s | — | stopped at 4,250 marks after 55 min | 80.9 ms; 356 ms; 1.20 s |
| **memory held after replay** | 24.7 MB | 1058.1 MB | — | 2.3 MB; 12.4 MB; 45.5 MB |
| …of which checkpoints (held with them off) | 8.8 MB held, replay 2.55 s | 108.5 MB held, replay 157.7 s | — | 2.1 MB held, replay 76.2 ms; 8.5 MB held, replay 270 ms; 20.7 MB held, replay 689 ms |
| edges stored in the graph | 65,336 | 909,566 | — | 4,398; 18,146; 43,826 |
| max RSS of the process | 261 MB | 3039 MB | — | 103 MB; 139 MB; 227 MB |
| `relate` over the content plane (pairs → relations) | 6.09 ms (56,280 → 64,734) | 183 ms (947,376 → 939,380) | 1.20 s (5,656,566 → 5,375,998) † | 20.2 ms (56,280 → 64,734); 159 ms (947,376 → 939,380); 1.08 s (5,656,566 → 5,375,998) |
| …the relation list it builds, held | 7.5 MB (336 marks) | 109.7 MB (1,377 marks) | 619.1 MB (3,364 marks) | 7.5 MB (336 marks); 114.4 MB (1,377 marks); 631.6 MB (3,364 marks) |
| `session.read` of the whole board (the surface's readRungs) | 139 ms (344 marks) | 8.07 s (1403 marks) | 106.1 s (3423 marks) † | 142 ms (344 marks); 7.94 s (1403 marks); 105.0 s (3423 marks) |
| **one more stroke: median / p95** | 17.5 ms / 26.9 ms (n 60) | 256 ms / 749 ms (n 40) | 2.62 s / 4.04 s (the build's last 250 strokes, to 4,250 marks) | 0.11 ms / 0.27 ms (n 60); 0.16 ms / 0.37 ms (n 40); 0.38 ms / 1.02 ms (n 20) |
| …the shape rung alone for those strokes | 0.07 ms / 0.26 ms | 0.03 ms / 0.10 ms | — | 0.02 ms / 0.06 ms; 0.03 ms / 0.05 ms; 0.04 ms / 0.11 ms |
| `getState()` (handed to subscribers on every event) | 0.02 ms / 0.03 ms | 0.10 ms / 0.21 ms | — | 0.03 ms / 0.04 ms; 0.08 ms / 0.09 ms; 0.21 ms / 0.24 ms |
| a model's brief (`describeSession`): five marks · the whole board | 16 KB · 1.7 MB | 113 KB · 23.6 MB | — | 2 KB · 0.1 MB; 2 KB · 0.6 MB; 2 KB · 1.5 MB |

Commands: `node --expose-gc metamedium-core/bench/engine.mjs board --size=N --repeat=K` (500: K=5; 2,000: K=2); 5,000: `node --expose-gc --max-old-space-size=65536 metamedium-core/bench/engine.mjs build --size=5000 --strokes=20`; bundle: add `--core=bundle`; checkpoints off: add `--ablate=checkpoints --only=replay`; the relation list and † (the content plane gathered from the diagrams the board was drawn in, so no replay — the same 336 and 1,377 marks and the same relations the replayed boards hold, and a read within 4% of the session's own): `node --expose-gc metamedium-core/bench/engine.mjs relate --size=N --read`.

The **after R4b** column: `08a1aef` on `w2`, 27 Sep 2026, load 2–4 — the same commands, with the 5,000 board now run by `board --size=5000 --repeat=2 --strokes=20` (a heap of 8 GB for the whole-board read, which still builds 5.4 million relations) and drawn by `build --size=5000 --every=250`; checkpoints off with `--ablate=checkpoints --only=replay` at every size, the relation list with `relate --size=N`; printed by `node metamedium-core/bench/report.mjs --column="after R4b"`. What changed is the replay, what is held and stored, the stroke and the brief. `relate` is the same function — the engine no longer runs it over the whole plane on every event (`recomputeClusterCandidates` did), which is also why it measures colder at 500 — and `session.read` of the whole board is unchanged: the surface still runs it on every release (R4c).

### One stroke's cost as the board grows (the 5000-mark board drawn event by event)

| strokes drawn | content marks | median | p95 | max | elapsed | **after R4b**: median / p95 · elapsed |
|---|---|---|---|---|---|---|
| 250 | 160 | 0.70 ms | 4.56 ms | 14.2 ms | 0.4 s | 0.14 ms / 0.47 ms · 0 s |
| 500 | 330 | 7.44 ms | 18.5 ms | 46.7 ms | 2.6 s | 0.12 ms / 0.23 ms · 0.1 s |
| 750 | 496 | 19.1 ms | 40.4 ms | 90.9 ms | 8.2 s | 0.13 ms / 0.27 ms · 0.1 s |
| 1000 | 673 | 42.9 ms | 75.4 ms | 261 ms | 20.2 s | 0.13 ms / 0.32 ms · 0.2 s |
| 1250 | 849 | 68.7 ms | 130 ms | 358 ms | 40.2 s | 0.15 ms / 0.32 ms · 0.2 s |
| 1500 | 1014 | 101 ms | 237 ms | 650 ms | 69.9 s | 0.15 ms / 0.32 ms · 0.2 s |
| 1750 | 1171 | 151 ms | 220 ms | 1.11 s | 112.9 s | 0.15 ms / 0.29 ms · 0.3 s |
| 2000 | 1347 | 209 ms | 288 ms | 1.08 s | 170.2 s | 0.16 ms / 0.28 ms · 0.3 s |
| 2250 | 1510 | 288 ms | 401 ms | 1.79 s | 250.5 s | 0.16 ms / 0.30 ms · 0.4 s |
| 2500 | 1675 | 406 ms | 578 ms | 2.04 s | 362.5 s | 0.17 ms / 0.25 ms · 0.4 s |
| 2750 | 1843 | 542 ms | 781 ms | 2.41 s | 512.8 s | 0.20 ms / 0.36 ms · 0.5 s |
| 3000 | 2018 | 723 ms | 964 ms | 2.78 s | 713.3 s | 0.21 ms / 0.38 ms · 0.6 s |
| 3250 | 2192 | 960 ms | 1.41 s | 3.88 s | 973.1 s | 0.23 ms / 0.42 ms · 0.6 s |
| 3500 | 2333 | 1.29 s | 1.85 s | 4.36 s | 1326.7 s | 0.24 ms / 0.41 ms · 0.7 s |
| 3750 | 2519 | 1.70 s | 2.58 s | 7.29 s | 1789.7 s | 0.26 ms / 0.71 ms · 0.8 s |
| 4000 | 2692 | 2.71 s | 5.18 s | 9.14 s | 2537.7 s | 0.25 ms / 0.38 ms · 0.9 s |
| 4250 | 2859 | 2.62 s | 4.04 s | 11.8 s | 3274.3 s | 0.25 ms / 0.46 ms · 0.9 s |
| 4500 | 3031 | — | — | — | — | 0.28 ms / 0.45 ms · 1 s |
| 4750 | 3205 | — | — | — | — | 0.31 ms / 0.59 ms · 1.1 s |
| 5000 | 3364 | — | — | — | — | 0.30 ms / 0.52 ms · 1.2 s |

Command: `node --expose-gc --max-old-space-size=65536 metamedium-core/bench/engine.mjs build --size=5000 --every=250`. Each row is the 250 strokes ending at that count; a stroke is one `addStroke`, with every event before it applied. After R4b (`node --expose-gc metamedium-core/bench/engine.mjs build --size=5000 --every=250 --strokes=20`, default heap) the whole board is drawn in 1.20 s, holding 45.7 MB, and the log it writes is the log it was given.

### A live room — one incoming line at one hand, in a room of three

| step (what `mergeLive` runs, 17-folder.js) | 500-mark board | 2,000-mark board | **after R4d**: 500 | **after R4d**: 2,000 |
|---|---|---|---|---|
| `receive` the line (LiveStore) | 0.01 ms / 0.01 ms | 0.01 ms / 0.11 ms | 0.01 ms | 0.01 ms |
| `readLogs()` | 0.01 ms / 0.08 ms | 0.01 ms / 0.09 ms | gone — `heldLogs()`, the arrays as held | gone |
| `myLogNow()` — every loaded event stringified | 13.2 ms / 13.6 ms | 64.1 ms / 65.2 ms | gone — a room's log is `ownLog`, read on the save | gone |
| `mergeLogs` | 0.28 ms / 0.89 ms | 0.99 ms / 4.85 ms | gone — `LiveMerge.sync` finds where the line's events fall | gone |
| `notices()` — a second `mergeLogs` | 0.24 ms / 0.70 ms | 1.03 ms / 4.59 ms | a read: misnumbering is found as each event lands | a read |
| **merge work without `notices()`** | 13.6 ms / 13.9 ms | 65.4 ms / 69.0 ms | | |
| **merge work with `notices()`** | 13.9 ms / 14.2 ms | 67.3 ms / 70.1 ms | | |
| **then `session.load(merged)` — a full replay, every line** | 2.56 s | 172.6 s | none — `session.rebase` applies the line | none |
| *after R4b*: the merge work with `notices()` · then the replay | 13.7 ms / 14.1 ms · 84.7 ms | 63.7 ms / 64.9 ms · 271 ms | | |
| **the line, all of it** — receive, merge, apply, what the room says | 2.6 s (R4b: 71.9 ms / 74.8 ms) | 173 s (R4b: 312 ms / 317 ms) | **0.94 ms / 1.10 ms** | **1.65 ms / 2.03 ms** |
| a line crossing a mark this hand just drew (two hands at once) | the same full replay (R4b: 74.4 ms / 75.5 ms) | the same | 1.27 ms / 1.40 ms, from the checkpoint the last line left | 4.23 ms / 4.96 ms, the same |
| a line 3 · 30 · 150 events back (a clock seconds behind) | the same full replay (R4b: 75–77 ms) | the same (R4b: 312–314 ms) | 1.9 · 25.9 · 25.0 ms, from the nearest checkpoint | 6.6 · 38.9 · 63.8 ms, from the nearest checkpoint |
| a line with no events — a hello, the relay's word, a whole log already held | a full replay (R4b: 83 · 74 ms) | a full replay (R4b: 422 · 309 · 311 ms) | no work | no work |
| the save a line schedules (300 ms later: `publish` of this hand's log) | 13.7 ms (`myLogNow`, R4b) | 62.9 ms (`myLogNow`, R4b) | 0.09 ms | 0.26 ms |

Command: `node --expose-gc metamedium-core/bench/engine.mjs room --size=N` (median / p95 over 12 lines). After R4b the line still replays the whole board — only the replay is cheap now; taking it off the line is R4d's.

After R4d: `node --expose-gc metamedium-core/bench/room.mjs --size=N` (N 500, 2000; median / p95 over 16 lines in order and 8 crossing; `--path=before` runs the surface before R4d for the same board, the 312 / 317 ms above), held to the budgets by `node --test metamedium-core/bench/room.test.mjs`. What the line costs now is the checkpoint it leaves where it ended (about 1 ms of the 1.65) — the one a line crossing a mark just drawn goes back to. A line 30 or 150 events back replays from the last regular checkpoint, every 200 events: those are over the 16 ms at 2,000.

### A newcomer's hello — the 2,000-mark board held by the hands already there

| | room of 3 | room of 6 | **after R4d**: room of 3 | **after R4d**: room of 6 |
|---|---|---|---|---|
| lines sent in answer | 6 | 30 | 2 | 5 |
| bytes sent in answer | 12.14 MB | 32.56 MB | 6.07 MB — the board, once | 6.51 MB — the board, once |
| bytes delivered (every line reaches every other hand) | 24.28 MB | 162.81 MB | 12.14 MB | 32.56 MB |
| bytes the newcomer takes, and the most copies of one log | 12.14 MB, 2 copies | 32.56 MB, 5 copies | 6.07 MB, 1 copy | 6.51 MB, 1 copy |
| … with a hand that left (said goodbye) · one that vanished (said nothing) | — | 26.05 MB, 4 copies · the same | — | 6.51 MB, 1 copy · the same, after a 1.5 s wait |
| lines each hand already there hears | 5 | 26 | 3 | 6 |
| times each is notified (in the surface before R4d: a full re-merge and replay each) | 4 (1 carry events) | 16 (10 carry events) | 3 (0 change a log) | 6 (0 change a log) |
| times the newcomer is notified | 3 | 15 | 2 | 5 |

Command: `node --expose-gc metamedium-core/bench/engine.mjs hello --size=2000` (LocalHub; the board split between the hands already there; the newcomer publishes its empty log and says hello, as `openLive` does). After R4d the same command, and `node --expose-gc metamedium-core/bench/room.mjs --size=2000` for the copies a newcomer takes — with a hand that left and one that vanished — and whether it ends holding exactly the room's logs (it does, in all four). "Delivered" is what a broadcast wire carries: every line reaches every hand, and each log now goes on it once.

### Surface — chromium 153.0.8010.12 (1440x900 @1x, headless)

| | 500 | 2,000 |
|---|---|---|
| **open, restored from browser storage** (navigation → board drawn) | 2.21 s (longest task 2.17 s) | did not open: browser storage refused the log (QuotaExceededError) |
| **open as a folder** (`?folder=`) | 2.32 s (longest task 2.21 s) | 100.4 s (longest task 100.1 s) |
| renderer heap after open (used of limit) | 98 of 3586 MB | 853 of 3586 MB |
| one paint alone: fit-all / zoom 1 | 3.40 ms / 2.30 ms | 32.0 ms / 36.3 ms |
| **pan at fit-all**: handler · frame (median / p95) | 3.30 ms / 3.70 ms · 33.3 ms / 33.4 ms | 38.4 ms / 41.2 ms · 117 ms / 133 ms |
| **pan at zoom 1**: handler · frame | 2.70 ms / 3.60 ms · 16.7 ms / 16.7 ms | 39.5 ms / 42.9 ms · 49.9 ms / 50.1 ms |
| **drawing**: pointer-move handler · frame | 3.30 ms / 3.70 ms · 16.7 ms / 16.8 ms | 38.8 ms / 41.2 ms · 16.8 ms / 33.4 ms |
| **release → reading drawn** (median / p95, n 5) | 147 ms / 148 ms | 7.59 s / 7.65 s |
| the release handler alone | 143 ms / 144 ms | 7.59 s / 7.65 s |
| what the strokes read as | rectangle 0.91, rectangle 0.91, rectangle 0.91, rectangle 0.91, rectangle 0.91 | rectangle 0.91, rectangle 0.91, rectangle 0.91, rectangle 0.91, rectangle 0.91 |
| autosave: stringify · into browser storage | 6.20 ms · 1.30 ms | 29.9 ms · refused (QuotaExceededError) |

Command: `node e2e/perf.mjs --browser=chromium --sizes=500,2000`

### Surface — chromium 153.0.8010.12 (1440x900 @1x, headless)

| | 5,000 |
|---|---|
| **open, restored from browser storage** (navigation → board drawn) | did not open: browser storage refused the log (QuotaExceededError) |
| **open as a folder** (`?folder=`) | did not open: the tab crashed (2026-09-27T23:16:04.449Z) after 786.5 s |

Browser storage takes at most **5.00 M characters** under one key (found by halving); these boards' logs run 3.3 K characters a mark, so autosave into browser storage stops saving at about **1,549 marks** — and says nothing (17-folder.js:328 swallows the error).

Command: `node e2e/perf.mjs --browser=chromium --sizes=5000`

### Surface — webkit 26.6 (1440x900 @1x, headless)

| | 500 | 2,000 |
|---|---|---|
| **open, restored from browser storage** (navigation → board drawn) | 2.55 s | did not open: browser storage refused the log (QuotaExceededError) |
| **open as a folder** (`?folder=`) | 2.13 s | 76.5 s |
| one paint alone: fit-all / zoom 1 | 7.00 ms / 8.00 ms | 59.0 ms / 56.0 ms |
| **pan at fit-all**: handler · frame (median / p95) | 8.00 ms / 9.00 ms · 17.0 ms / 17.0 ms | 64.0 ms / 76.0 ms · 66.0 ms / 79.0 ms |
| **pan at zoom 1**: handler · frame | 7.00 ms / 9.00 ms · 17.0 ms / 18.0 ms | 64.0 ms / 80.0 ms · 66.0 ms / 82.0 ms |
| **drawing**: pointer-move handler · frame | 7.00 ms / 9.00 ms · 17.0 ms / 27.0 ms | 63.0 ms / 78.0 ms · 66.0 ms / 85.0 ms |
| **release → reading drawn** (median / p95, n 5) | 91.0 ms / 103 ms | 5.95 s / 6.24 s |
| the release handler alone | 90.0 ms / 101 ms | 5.95 s / 6.24 s |
| what the strokes read as | rectangle 0.92, rectangle 0.92, rectangle 0.92, rectangle 0.92, rectangle 0.92 | rectangle 0.92, rectangle 0.92, rectangle 0.92, rectangle 0.92, rectangle 0.92 |
| autosave: stringify · into browser storage | 3.00 ms · 0.00 ms | 10.0 ms · refused (QuotaExceededError) |

Browser storage takes at most **5.00 M characters** under one key (found by halving); these boards' logs run 3.2 K characters a mark, so autosave into browser storage stops saving at about **1,576 marks** — and says nothing (17-folder.js:328 swallows the error).

Command: `node e2e/perf.mjs --browser=webkit --sizes=500,2000`

---

## Hotspots, ranked

Ranked by what they cost a hand on the 2,000-mark board, the size v1 must
hold (`V1-PLAN.md` §11.3). Each gives the evidence and where it lives.
Paths under `src/` are `metamedium-core/src/`.

**1. The surface re-reads the whole board's roles after every stroke — 7.6 s
of every release at 2,000.**

- **Mechanism.** `readRungs` (`Demos/surface/08-render.js:78`) caches on
  the set of ids. A new stroke changes that set, so the paint the release
  triggers (`08-render.js:300`, for the mark just made) runs `session.read`
  over every loose mark and every artifact's members
  (`src/session/session.ts:2426`). That relates them all (986,120
  relations at 2,000) and hands them to `assignRoles`
  (`src/diagram/roles.ts:215`).
- **Why it is O(n·R).** `place()` asks `contents`, `enclosingMark`,
  `nearestMark` and `relatesToAnything` (`roles.ts:64`, `:71`, `:79`,
  `:92`). Each is a filter over the whole relation list, for every mark,
  with `inScope` an `Array.includes` over every id (`roles.ts:61`). With R
  itself O(n²), this is O(n·R).
- **Evidence.** `session.read` of the board: 139 ms at 500, 8.07 s at
  2,000, and 106 s at 5,000 (run on the board's own content plane without a
  replay; checked against the session's own read at 500 and 2,000). The profile at 2,000 puts 90% of it in `place` and 64% in
  `contents` alone, and 0.8% in `relate`. In Chromium, 7.13 s of the
  7.24 s release handler is this read (`e2e/results/perf/stroke-2000.cpuprofile`).
  Release → reading drawn: 147 ms at 500, **7.59 s** at 2,000.

**2. Every event re-relates the whole board once one definition exists —
the replay is cubic, and it is most of the engine's per-stroke cost.**

- **Mechanism.** `recomputeClusterCandidates` (`session.ts:823`) relates
  every content mark to every other (`relate`, `src/relate/relations.ts:113`)
  and clusters them. It matches each cluster against every definition's
  structural signature (`matchesFor`, `session.ts:804`); `structuralSignature`
  walks every stored edge of every member (`src/session/signature.ts:88`).
- **When it runs.** At the end of every content stroke (`session.ts:1266`)
  and from fifteen other reducers. It returns at once while no artifact
  exists (`:825`), which is why a board's first strokes are cheap and the
  cost jumps after the first bless.
- **Evidence, the replay at 2,000.** 60.2% of samples are under
  `recomputeClusterCandidates ← applyStroke` (91 of 151 s): `relate` 36.5%
  and `matchesFor` 19.6%. Most of the 23.5% the collector takes is its
  garbage: about a million relation objects, each with a reasoning string,
  per call.
- **Evidence, one more stroke at 2,000.** 56.5% is in it.
- **Evidence, at 5,000.** The content plane is 3,364 marks. `relate` over it
  takes 1.2 s and returns 5.4 million relations holding 619 MB, and this
  happens on every stroke. That is why, past 3,500 marks, the collector is
  most of what the process does.
- **Scale.** The replay goes 2.6 s → 170 s for 4× the marks (×65). The
  stroke's own cost, as the 5,000-mark board is drawn, climbs from 0.7 ms
  (the first 250 strokes) to 209 ms at 2,000 and 2.6 s at 4,250.
- **After R4b — fixed.** The components of the within-reach links are kept
  with their candidates (`session.ts`, `settle`): a mark added, taken away or
  moved finds only its own component again, and a changed definition is
  scored against every component. The 5,000 board is drawn event by event
  in 1.2 s, a stroke costing 0.14 ms in its first 250 and 0.30 ms in its
  last (the curve's "after R4b" column).

**3. A live room replays the whole board on every line — about 3 minutes a
line at 2,000.**

- **Mechanism.** The surface runs `mergeLive` on every notify of the store
  (`Demos/surface/17-folder.js:172`). `mergeLive` ends in
  `session.load(merged)` (`:194`), which drops every checkpoint
  (`session.ts:2481`) and so replays from zero. Before that, `myLogNow`
  stringifies every loaded event to find which of this hand's own survive
  (`17-folder.js:283`).
- **Evidence, one line at 2,000.** Merge work of 65 ms (64 ms of it
  `myLogNow`), then a 173 s replay.
- **After R4b** the replay a line ends in is the board's replay: 0.27 s at
  2,000 (85 ms at 500), after 63 ms of merge work (`engine.mjs room`). The
  merge work and the replay per line are still there (R4d's).
- **`notices()`.** It does double the merge, as W2's follow-up says: it runs
  `mergeLogs` again (`src/store/live.ts:229–240`, 0.99 → 2.0 ms). That is
  true, but it is 1.5% of the merge work and under a thousandth of a
  percent of the line.
- **A hello.** Every hand already in the room answers with every log it
  holds (`live.ts:315`), so a room of k hands sends k(k−1) whole logs:
  30 lines for a room of six on the 2,000 board, 32.6 MB sent and 163 MB
  delivered. Each hand already there is notified 16 times. The surface
  turns each into a full replay, because over a BroadcastChannel or a relay
  every line is a task of its own.
- **After R4d — fixed.** The merge stands between lines
  (`store/livemerge.ts`): a line's events find their places in it and the
  session is handed only what changed (`Session.rebase`) — applied, with no
  replay, when they fall after everything held (1.65 ms a line at 2,000);
  replayed from the nearest checkpoint when one falls before. A merge leaves
  a checkpoint where it ended, and a checkpoint keeps the index as it stood,
  so a line crossing a mark this hand just drew costs 4.2 ms, not the 10 ms a
  restore spent rebuilding the index before one event was replayed. The store
  says whether a line changed a log (`revision`): a hello, a goodbye, the
  relay's word and a whole log already held change none and cost the reader
  nothing. A room's log is read in the order it was written, by identity and
  authorship (`ownLog`) — no event serialised. A hello is answered once per
  log: each hand for its own; a copy only for a writer that said goodbye or
  stayed silent, by the first of the hands holding one.

**4. Relations with no distance limit are stored on every mark, and a
checkpoint clones them every 200 events — 1.06 GB held at 2,000 marks,
and a 31 GB process by 4,250 marks of the 5,000 board.**

- **Mechanism.** `relate` states direction, alignment and peerhood for any
  two marks that share a band or a size, however far apart
  (`relations.ts:170–203`). `addSpatialEdges` stores each relation of each
  new mark as an edge on both marks (`session.ts:863`).
- **What is stored.** 88% of the edges stored at 2,000 are `same-size`
  (802,478 of 909,566), and peer and alignment relations together are 98.6%.
- **Who reads them.** I found no reader in core or the surface except one:
  - the signature counts only engaging links (`signature.ts:51–52`);
  - the inspector filters them out as "true of nearly everything"
    (`Demos/surface/10-inspector.js:306`);
  - concepts compute their own per scope (`src/concepts/concept.ts:210, 328`);
  - the exception is `describeSession`, which lists every stored relation of
    every mark it describes to a model (`src/participants/serialize.ts:88`).
    A five-mark brief is 16 KB at 500 marks and 113 KB at 2,000. The whole
    board is 23.6 MB at 2,000, and that is what the MCP hand's `canvas_look`
    hands over when it is given no ids (`Demos/mcp.mjs:164`).
- **Two costs.**
  - *Every lookup that walks a mark's edges becomes O(n) a mark.* The paint
    does three of them for every mark: `interpretationsOf` for the chips
    (`08-render.js:235`), the snap offers (`05-snap.js:41` →
    `src/session/clean.ts:64`), and the labels' walk
    (`08-render.js:440`). That makes the paint quadratic (hotspot 6).
  - *The checkpoints.* Every 200 events a checkpoint `structuredClone`s the
    whole graph (`session.ts:676–701`), so memory held grows with the
    cube: 24.7 MB at 500 (8.8 MB with checkpoints off) and 1,058 MB at 2,000
    (108.5 MB off). By 4,250 marks of the 5,000 board the process held
    31 GB, and its time went mostly to young-generation collections that walk
    the whole old generation (`ScavengerCollector::CollectGarbage` and
    `OldGenerationMemoryChunkIterator::next` top a macOS `sample` of the
    process).
- **Where it hurts.** Not time: the clone is 1.9% of the 2,000 replay.
  Memory: a Chromium tab may hold 3,586 MB of JavaScript heap.
- **After R4b — fixed.** A pair within reach stores every relation `relate`
  finds (`withinReach`, the test `relate` makes for `near`); a pair out of
  reach stores none, and a scope computes those on demand (`session.read`).
  Stored edges at 2,000: 909,566 → 18,146. A checkpoint copies each node and
  its two arrays and shares the reps and edges, which nothing changes in
  place: 12.4 MB held at 2,000 (8.5 MB with checkpoints off), 45.5 MB at
  5,000. The brief lists what is stored, so it lost exactly the relations
  between marks out of reach: five marks at 2,000 are 2 KB, the whole board
  0.6 MB (R4e still owns what a brief should carry).

**5. The scratch test tests every mark on the board — 11% of the replay.**

- **Mechanism.** For every open stroke drawn by hand (`session.ts:1205–1207`),
  `scratchedOut` (`src/session/erase.ts:83`) counts crossings segment by
  segment against the outline of every mark on the board
  (`scratchTargets`, `session.ts:935`). No bounding box is tested first;
  `relate` has one (`relations.ts:150`).
- **Evidence.** 11.2% of the replay at 2,000, and 7.7% of a stroke.
- **After R4b — fixed.** An index of the ink gives the strokes whose boxes
  meet the scratch's, and only those are counted; the targets are walked,
  for their order, only when something was crossed. `scratchedOut` itself
  passes over a target whose box stands clear of the stroke's (`mayCross`).

**6. The surface paints everything, at once, on every input event —
39 ms a pointer move and 50 ms a pan frame at 2,000.**

- **Mechanism.** A wheel event (`Demos/surface/01-view.js:224–226`) and a
  pointer move while drawing (`07-input.js:146`) each run a full `render()`
  there and then, not on the next frame. There is no viewport culling:
  every content mark is drawn (`08-render.js:249`). Each paint also
  recomputes the snap offers for every mark (`05-snap.js:41`) and every
  mark's readings for the chips — O(n) edges a mark (hotspot 4).
- **Evidence, at 500.** A paint is 2.3–3.4 ms, and pan and drawing hold
  60 fps at zoom 1.
- **Evidence, at 2,000.**
  - A paint is 32–36 ms: 9–16× the 500 board's for 4× the marks.
  - Panning runs at 20 fps at zoom 1 (50 ms frames) and 8.5 fps at fit-all
    (117 ms). At fit-all the frames are dominated by painting, which this
    headless build does on the CPU.
  - Each pointer move costs 39 ms, where the budget for one frame is
    16.7 ms.
  - The pan profile at 2,000 (`e2e/results/perf/pan-2000.cpuprofile`):
    `render` is 68% of samples. Inside it, as shares of all samples,
    `snapCandidates` is 19%, `interpretationsOf` 11%, `renderLabels` 11%
    and the loop itself 21%. Native painting is another 31%.

**7. Autosave rewrites the whole log into browser storage, and fails
silently at about 1,500 marks.**

- **Mechanism.** Every change schedules a stringify of every event into one
  key of `localStorage` (`17-folder.js:325–329`), and the error is
  swallowed.
- **Evidence.** Browser storage takes at most 5.00 M characters under one
  key in Chromium, found by halving. These boards' logs run 3.3 K
  characters a mark, and John's recorded strokes run 3.8–4.9 K. So a board
  kept in browser storage stops being saved at 1,100–1,600 marks, and a
  reload loses what was drawn after that. The 2,000 board's 6.6 M
  characters are refused (the stringify alone is 30 ms). That is R3's
  subject; it is here because it is where size first breaks something.

Also O(n²), but not ranked, because it is one act rather than every stroke:
press-and-hold relates the whole content plane (`07-input.js:93`; `relate`
takes 183 ms at 2,000) and then summons, which runs hotspot 2 again.

---

## Proposed budgets for R4b

*Not enforced.* On this machine, in Chromium with the gate's viewport. Each is
meant to become a test that records its number (R4's own wording), and each
is set where an index and incremental work could plausibly put it — not where
today's code is.

**How the budget column was reached.** A stroke's shape reading costs 0.03 ms,
and the first 250 strokes of a board, before any definition exists, cost
0.7 ms each. Nothing a stroke must know lies more than a few neighbours away,
except the matches, and those need only the cluster the new mark joined.
v1 ships when the budgets hold on the 2,000-mark board (`V1-PLAN.md` §11.3);
the 5,000 column is the headroom to aim for.

| Measure | 500 today | 2,000 today | **Budget, 2,000** | **Budget, 5,000** | **After R4b**: 2,000; 5,000 | **After R4d**: 2,000 |
|---|---|---|---|---|---|---|
| Open: navigation → board drawn (Chromium) | 2.2 s | 100 s, and only as a folder: storage refuses it | **≤ 1.5 s** | ≤ 3 s | not measured (R4c and R3 own the open) | — (not R4d's) |
| Replay, `load` (Node, warm median) | 2.58 s | 167 s | **≤ 0.5 s** | ≤ 1.5 s | **244 ms**; 648 ms | 264 ms; 713 ms — a checkpoint keeps the index now (the last four of them) |
| Memory held after replay (Node) | 25 MB | 1,058 MB | **≤ 150 MB** | ≤ 400 MB, so a tab opens it | **12.4 MB**; 45.5 MB | 16.8 MB; 57.5 MB — those four copies of the index |
| One more stroke, engine: median / p95 | 18 / 27 ms | 256 / 749 ms | **≤ 4 / 16 ms** | ≤ 4 / 16 ms | **0.15 / 0.23 ms**; 0.31 / 0.39 ms | 0.16 / 0.34 ms |
| Release → reading drawn, p95 | 148 ms | 7.65 s | **≤ 100 ms** | ≤ 100 ms | the surface's (R4c) | — (not R4d's) |
| A pointer move while drawing: handler, p95 | 3.7 ms | 41 ms | **≤ 4 ms** | ≤ 6 ms | the surface's (R4c) | — (not R4d's) |
| Pan at zoom 1: frame, p95 | 16.7 ms | 50 ms | **≤ 16.7 ms** | ≤ 16.7 ms | the surface's (R4c) | — (not R4d's) |
| Pan at fit-all: frame, p95 | 33 ms | 133 ms | **≤ 33 ms** | ≤ 50 ms | the surface's (R4c) | — (not R4d's) |
| The whole-board read on the stroke path | 139 ms | 8.07 s | **off the stroke path, or ≤ 16 ms** | same | unchanged, 7.94 s; 105 s (R4c) | — (not R4d's) |
| A live room: main-thread work per incoming line | 2.6 s | 173 s | **≤ 16 ms, and no full replay** | ≤ 16 ms | 63 ms of merge work, then a 0.27 s replay (R4d's) | **1.65 / 2.03 ms, no replay**; crossing a mark just drawn 4.2 / 5.0 ms; 30 and 150 events back 39 and 64 ms, from a checkpoint; a line with no events, no work |
| A hello in a room of six: bytes delivered | 34 MB | 163 MB | **each log once, to the newcomer (≈ 6.6 MB)** | ≈ 16 MB | unchanged (R4d) | **each log once: 6.51 MB to the newcomer**, one copy of each — with a hand that left or vanished too; 32.6 MB on a broadcast wire |
| Autosave: main-thread work per change, and does it hold | 7 ms, holds | 30 ms, refused | **≤ 8 ms, and never refused in silence** | same | unchanged (R3) | — (not R4d's) |
| A model's brief for five marks | 16 KB | 113 KB | **≤ 4 KB, whatever the board's size** | same | 2 KB; 2 KB — what it lists shrank with what is stored (R4e's still) | — (not R4d's) |

The "after R4b" engine rows are `node --test metamedium-core/bench/budgets.test.mjs`
(27 Sep 2026, load 2–4; the 2,000 board's own result file,
`dist/bench/budgets-2000-source.json`, and a line in
`dist/bench/budgets-history.jsonl` every run), which holds the 2,000 budgets
as assertions and asks the 5,000 board only to replay; the read, the room and
the brief are `engine.mjs board`, as in the engine's table.

Two notes on the table:

- The pan budget at fit-all asks for simplified ink at low zoom. Headless
  Chromium spends most of that frame painting on the CPU, so R4b should
  confirm it in a real window before paying for it.
- The replay budget and the open budget are not the same machine: Chromium
  replayed the 2,000 board in 100 s where Node took 167 s.

---

## What was not measured, and why

- **The surface at 5,000 marks, beyond whether it opens.** It does not
  open, so there is no pan, draw or release to time. The engine's numbers
  at 5,000 stand for it.
- **WebKit's heap, profiles and long tasks.** The DevTools Protocol (CPU
  profiles) and `performance.memory` (heap) are Chromium's, and WebKit has no
  long-task API. WebKit ran 500 and 2,000, not 5,000, which Chromium could not
  open. Its clock is coarsened to whole milliseconds, so its numbers under
  10 ms are ±1 ms.
- **A real window.** Headless Chromium paints on the CPU, so the fit-all pan
  frames here are paint-bound in a way a GPU may not be. The viewport is
  the gate's, at device scale 1; John's screen is at 2.
- **A pen or a finger.** Strokes were drawn with Playwright's mouse, one
  awaited move at a time. The pointer-move handler time is the number to
  trust. The frame interval while drawing depends on that pacing: a real
  pointer at 60–120 Hz, meeting a 39 ms handler, would queue.
- **A relay between machines.** The room and the hello ran on the core's
  in-memory hub (`LocalHub`), which has no network and no relay. The bytes
  counted are what would cross one; the relay's own buffering
  (`Demos/relay.mjs`) was not measured.
- **A real board of this size.** None exists yet. The boards are synthetic,
  their letters sized to John's hand and their strokes to a pointer's
  density, but they are not his drawings.
- **The shard** (`shard-3d/`) was out of scope.
- **The 5,000 board's replay, its memory held, and one more stroke on it.**
  - *The build.* The board was drawn once, event by event (`build`, which
    writes the very log it is given). I stopped it by hand at 4,250 marks
    after 55 minutes. It held 31 GB, its time was going to the collector,
    and the rest would have taken about another hour of a shared machine
    for numbers that only say "unusable".
  - *What stands for them.* The curve to 4,250 stands for "one more stroke".
    The Chromium crash stands for "does it open". And the two whole-board
    measures were taken directly on the board's own content plane,
    gathered from the diagrams it was drawn in and checked at 500 and 2,000
    against the replayed boards: `relate` at 1.2 s and 619 MB, and the read
    at 106 s.
  - *Not replayed.* The 5,000 board was never replayed with `load` in one
    piece. After R4b it is, in 0.65 s, holding 45.5 MB (the engine's
    "after R4b" column).

---

## Reproduce

```
cd metamedium-core && npm ci                    # esbuild comes with it
cd ../e2e && npm ci && npx playwright install chromium webkit
cd ..
node metamedium-core/bench/board.mjs 2000                                           # what a board is
node --expose-gc metamedium-core/bench/engine.mjs board --size=500 --repeat=5
node --expose-gc metamedium-core/bench/engine.mjs board --size=2000 --repeat=2
node --expose-gc --max-old-space-size=65536 metamedium-core/bench/engine.mjs build --size=5000 --strokes=20
node --expose-gc metamedium-core/bench/engine.mjs room --size=2000
node --expose-gc metamedium-core/bench/engine.mjs hello --size=2000
node --expose-gc metamedium-core/bench/engine.mjs board --size=2000 --repeat=0 --only=replay --core=bundle
node --expose-gc metamedium-core/bench/engine.mjs board --size=2000 --repeat=0 --only=replay --ablate=checkpoints
node --expose-gc metamedium-core/bench/engine.mjs board --size=2000 --repeat=0 --only=brief
node --expose-gc metamedium-core/bench/engine.mjs board --size=2000 --repeat=0 --only=read,stroke --profile=replay,read,stroke
node metamedium-core/bench/profile.mjs metamedium-core/dist/bench/prof/replay-2000.cpuprofile
node e2e/perf.mjs --sizes=500,2000                                                   # Chromium
node e2e/perf.mjs --sizes=5000 --cap-min=25                                          # Chromium, 5,000: it crashes
node e2e/perf.mjs --browser=webkit --sizes=500,2000
node metamedium-core/bench/report.mjs                                                # the tables above
```

After R4b — the engine's column, the budgets as tests, and what reads
differently between the engine the baseline measured and this one:

```
node --test metamedium-core/bench/budgets.test.mjs                                  # the 2,000 budgets, and the 5,000 board replays
node --expose-gc metamedium-core/bench/engine.mjs board --size=500 --repeat=5
node --expose-gc metamedium-core/bench/engine.mjs board --size=2000 --repeat=2
node --expose-gc --max-old-space-size=8192 metamedium-core/bench/engine.mjs board --size=5000 --repeat=2 --strokes=20
node --expose-gc metamedium-core/bench/engine.mjs board --size=N --repeat=K --only=replay --core=bundle      # N 500, 2000
node --expose-gc metamedium-core/bench/engine.mjs board --size=N --repeat=0 --only=replay --ablate=checkpoints # N 500, 2000, 5000
node --expose-gc metamedium-core/bench/engine.mjs build --size=5000 --every=250 --strokes=20                 # the curve
node --expose-gc metamedium-core/bench/engine.mjs build --size=N --every=1000 --strokes=20                   # N 500, 2000
node --expose-gc metamedium-core/bench/engine.mjs relate --size=N                                            # N 500, 2000, 5000
node --expose-gc metamedium-core/bench/engine.mjs room --size=N                                              # N 500, 2000
node metamedium-core/bench/report.mjs --column="after R4b"                           # the engine's column, from those runs
node metamedium-core/bench/equivalence.mjs                                           # old engine (9977158) against src/: what reads differently
node --max-old-space-size=24576 metamedium-core/bench/equivalence.mjs --size=2000 --prefix-step=100000 --undos=2 --extend=10   # the same on the 2,000 board: ~15 min, the old engine holding GBs
```

After R4d — a room's line, and a newcomer's hello:

```
node --test metamedium-core/bench/room.test.mjs                                     # the room's budgets on the 2,000 board: a line, a crossing line, lines with no events, the hello
node --expose-gc metamedium-core/bench/room.mjs --size=N                             # N 500, 2000: the surface's path now
node --expose-gc metamedium-core/bench/room.mjs --size=2000 --path=before            # the surface before R4d, on the same board
node --expose-gc metamedium-core/bench/engine.mjs hello --size=2000                  # the hello's lines, bytes and notifies
node --test metamedium-core/bench/budgets.test.mjs                                  # R4b's budgets still hold: 264 ms, 0.16 / 0.34 ms, 16.8 MB at 2,000; 713 ms, 57.5 MB at 5,000
node metamedium-core/bench/equivalence.mjs --ref=0bca5ca                             # the engine before R4d against src/: nothing reads differently
MM_ROOM_SEEDS=500 npx vitest run src/store/room.oracle.test.ts                       # (in metamedium-core) the oracle, 500 seeded rooms: ~45 s
```

Results land in `metamedium-core/dist/bench/` and `e2e/results/perf/`, both
ignored. Nothing here is in `npm test` or the gate.

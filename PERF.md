# PERF.md — the performance baseline

*R4a, the measuring half of `V1-PLAN.md` §9 R4 ("measure before indexing").
27 Sep 2026, on `w2-shard`, measuring the engine and the surface exactly as
they stand at `ff330a9` — nothing in them was changed to measure them. What
this unit makes is numbers, the commands that made them, the hotspots ranked
with their evidence, and budgets R4b can hold itself to. It fixes nothing.*

---

## The answer

| Board | Fit for daily use today? | What a hand feels (Chromium, this machine) |
|---|---|---|
| **500 marks** | **Yes, with one pause** | Opening freezes the tab for ⟨2.2⟩ s while the log replays. After that, drawing keeps the frame rate, a stroke's reading lands ⟨150⟩ ms after the pen lifts, and panning holds 60 fps at working zoom. |
| **2,000 marks** | **No** | Opening takes ⟨…⟩ with the tab frozen throughout (Node replays the log in 167–174 s). Every stroke freezes the page for ⟨…⟩ s when the pen lifts, 8 s of it the surface re-reading every mark's role. A live room replays the whole board, about 3 minutes, on every line another hand sends. Browser storage refuses the log, so autosave silently stops saving it. |
| **5,000 marks** | **No — it does not open** | ⟨…⟩ |

**Why, in three lines.**

1. **The replay is cubic.** Once a single definition exists, every stroke
   re-relates the whole board to find cluster candidates. That is 61% of the
   replay at 2,000 marks, plus most of the 24% spent collecting the garbage
   those relations leave.
2. **The surface re-reads the whole board's roles after every stroke.** Its
   role table scans every relation for every mark: O(n·R), 8 s at 2,000.
3. **Relations with no distance limit are stored on every mark and cloned
   into a checkpoint every 200 events.** 88% of stored edges are `same-size`.
   That is 1.06 GB held at 2,000 marks, 90% of it in checkpoints, and ⟨…⟩ at
   5,000 — past the 3.5 GB a Chromium tab may hold.

At 500 marks all three are already there, just small.

---

## How it was measured

**Machine.** Apple M2 Max (8 performance and 4 efficiency cores), 96 GB,
macOS 26.6.2 (25G83). Node v22.23.0 (V8 12.4.254.21-node.56). Chromium
153.0.8010.12 and WebKit ⟨…⟩ through Playwright 1.63.0, headless, 1440×900 at
device scale 1: the gate's viewport. Headless Chromium rasterises on the CPU,
so a frame's paint here is not a GPU's.

**The machine was shared.** Other agents worked in other worktrees throughout.
The load average (recorded at the start of every result file) ran 3.4–11.4.
The 5,000-mark build ran alongside the 2,000-mark and browser measurements.
The same measurement repeated moved by about 10%: five cold and warm replays
of the 2,000 board took 151–174 s. Read every number here as ±10%.

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
- **The sizes.** Logs are 1.5 / 6.6 / 16.1 MB of JSON, over 5.7k / 10.5k /
  17.2k px square.

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

⟨TABLES⟩

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
- **Evidence.** `session.read` of the board: 146 ms at 500, 8.07 s at
  2,000. The profile at 2,000 puts 90% of it in `place` and 64% in
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
- **Scale.** The replay goes 2.6 s → 170 s for 4× the marks (×65). The
  stroke's own cost, as the 5,000-mark board is drawn, climbs from 0.7 ms
  (the first 250 strokes) to 209 ms at 2,000 and ⟨…⟩ at 5,000.

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
- **`notices()`.** It does double the merge, as W2's follow-up says: it runs
  `mergeLogs` again (`src/store/live.ts:229–240`, 0.99 → 2.0 ms). That is
  true, but it is 1.5% of the merge work and a thousandth of a percent of
  the line.
- **A hello.** Every hand already in the room answers with every log it
  holds (`live.ts:315`), so a room of k hands sends k(k−1) whole logs:
  30 lines for a room of six on the 2,000 board, 32.6 MB sent and 163 MB
  delivered. Each hand already there is notified 16 times. The surface
  turns each into a full replay, because over a BroadcastChannel or a relay
  every line is a task of its own.

**4. Relations with no distance limit are stored on every mark, and a
checkpoint clones them every 200 events — 1.06 GB held at 2,000 marks,
⟨…⟩ at 5,000.**

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
    A five-mark brief is 16 KB at 500 marks and ⟨…⟩ at 2,000.
- **Two costs.**
  - *Every lookup that walks a mark's edges becomes O(n) a mark.* The paint
    does three of them for every mark: `interpretationsOf` for the chips
    (`08-render.js:235`), the snap offers (`05-snap.js:41` →
    `src/session/clean.ts:64`), and the labels' walk
    (`08-render.js:440`). That makes the paint quadratic (hotspot 6).
  - *The checkpoints.* Every 200 events a checkpoint `structuredClone`s the
    whole graph (`session.ts:676–701`), so memory held grows with the
    cube: 24.6 MB at 500 (8.8 MB with checkpoints off), 1,058 MB at 2,000
    (108.5 MB off), ⟨…⟩ at 5,000.
- **Where it hurts.** Not time: the clone is 1.9% of the 2,000 replay.
  Memory: a Chromium tab may hold 3,586 MB of JavaScript heap.

**5. The scratch test tests every mark on the board — 11% of the replay.**

- **Mechanism.** For every open stroke drawn by hand (`session.ts:1205–1207`),
  `scratchedOut` (`src/session/erase.ts:83`) counts crossings segment by
  segment against the outline of every mark on the board
  (`scratchTargets`, `session.ts:935`). No bounding box is tested first;
  `relate` has one (`relations.ts:150`).
- **Evidence.** 11.2% of the replay at 2,000, and 7.7% of a stroke.

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
  - A paint is 32–36 ms: 14× for 4× the marks.
  - Panning runs at 20 fps at zoom 1 (50 ms frames) and 8.5 fps at fit-all
    (117 ms). At fit-all the frames are dominated by painting, which this
    headless build does on the CPU.
  - Each pointer move costs 39 ms, where the budget for one frame is
    16.7 ms.
  - The pan profile at 2,000: `render` 68% of samples, of which
    `snapCandidates` 19%, `interpretationsOf` 11%, `renderLabels` 11% and
    the loop itself 21%; native painting 31%.

**7. Autosave rewrites the whole log into browser storage, and fails
silently at about 1,500 marks.**

- **Mechanism.** Every change schedules a stringify of every event into one
  key of `localStorage` (`17-folder.js:325–329`), and the error is
  swallowed.
- **Evidence.** Browser storage takes at most 5.00 M characters under one
  key in Chromium, found by halving. These boards' logs run 3.3 K
  characters a mark, and John's recorded strokes run 3.8–4.9 K. So a board
  kept in browser storage stops being saved at 1,100–1,550 marks, and a
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

| Measure | 500 today | 2,000 today | **Budget, 2,000** | **Budget, 5,000** |
|---|---|---|---|---|
| Open: navigation → board drawn (Chromium) | 2.2 s | 100 s, and only as a folder: storage refuses it | **≤ 1.5 s** | ≤ 3 s |
| Replay, `load` (Node, warm median) | 2.57 s | 167 s | **≤ 0.5 s** | ≤ 1.5 s |
| Memory held after replay (Node) | 25 MB | 1,058 MB | **≤ 150 MB** | ≤ 400 MB, so a tab opens it |
| One more stroke, engine: median / p95 | 15 / 25 ms | 256 / 749 ms | **≤ 4 / 16 ms** | ≤ 4 / 16 ms |
| Release → reading drawn, p95 | 148 ms | 7.65 s | **≤ 100 ms** | ≤ 100 ms |
| A pointer move while drawing: handler, p95 | 3.7 ms | 41 ms | **≤ 4 ms** | ≤ 6 ms |
| Pan at zoom 1: frame, p95 | 16.7 ms | 50 ms | **≤ 16.7 ms** | ≤ 16.7 ms |
| Pan at fit-all: frame, p95 | 33 ms | 133 ms | **≤ 33 ms** | ≤ 50 ms |
| The whole-board read on the stroke path | 146 ms | 8.07 s | **off the stroke path, or ≤ 16 ms** | same |
| A live room: main-thread work per incoming line | 2.6 s | 173 s | **≤ 16 ms, and no full replay** | ≤ 16 ms |
| A hello in a room of six: bytes delivered | 34 MB | 163 MB | **each log once, to the newcomer (≈ 6.6 MB)** | ≈ 16 MB |
| Autosave: main-thread work per change, and does it hold | 7 ms, holds | 30 ms, refused | **≤ 8 ms, and never refused in silence** | same |
| A model's brief for five marks | 16 KB | ⟨…⟩ | **≤ 4 KB, whatever the board's size** | same |

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
- **WebKit below 2,000 was measured, but not everything.** The DevTools
  Protocol (CPU profiles) and `performance.memory` (heap) are Chromium's, and
  WebKit has no long-task API. ⟨WEBKIT-SCOPE⟩
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
- **Repeats at 5,000.** The replay and build there ran once, with the
  collector dominating the late strokes (see the 5,000 row). A second run
  would have cost another hour for a number that is only ever
  "unusable".

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
node --expose-gc metamedium-core/bench/engine.mjs board --size=2000 --repeat=0 --only=read,stroke --profile=replay,read,stroke
node metamedium-core/bench/profile.mjs metamedium-core/dist/bench/prof/replay-2000.cpuprofile
node e2e/perf.mjs --sizes=500,2000                                                   # Chromium
node e2e/perf.mjs --browser=webkit --sizes=500
node metamedium-core/bench/report.mjs                                                # the tables above
```

Results land in `metamedium-core/dist/bench/` and `e2e/results/perf/`, both
ignored. Nothing here is in `npm test` or the gate.

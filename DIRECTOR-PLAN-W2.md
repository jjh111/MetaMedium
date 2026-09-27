# Director's plan — week 2: make week 1 whole, then maths and the middle layer

*Written 26 September 2026 on `master` at `e41878b`, with week 1's
integration branch `auto/w1` at `0ed0440` test-merged into it in a scratch
worktree (a commit object, not a branch; the merge is conflict-free). Every
number in §0 was produced in that session by the command beside it. The
design this plan builds is `MATHS-PLAN.md`; the plan it follows is
`DIRECTOR-PLAN-W1.md`, whose form it keeps: a ladder, then per unit what it
owns, the test written red first, the checks a machine runs, the invariant it
is most likely to bend and the trap found by reading the code; then the
risks, what to cut, and how the agents run.*

---

## 0. Where week 1 left things

An automated run on 20 September worked `DIRECTOR-PLAN-W1.md` from 06:15 to
13:17 and stopped after U5. Nothing records why. Its branch never reached
`master`.

| Unit | On `auto/w1`? | State |
|---|---|---|
| U1a ids per hand, core | yes | Built: an event stamped with its log's name and a sequence number mints `prefix:log:seq`; old logs keep counter ids. **Two defects reproduced** (below) |
| U1b surfaces use the new ids | yes | Canvas only. The shard never names its log |
| U1c the relay's catch-up | yes | Stale `full`s dropped; collision by divergence; truncation line. `MAX_LINES` still a constant, undo still never sent, no three-party test |
| U1d the shard's pairing | **no** | Two attempts on `auto/w1-U1d*`, unmerged |
| U2 a hand labels its own ink | half | The `label` event and rep in core, well tested. The board's drawing of it and `canvas_label` are on `auto/w1-U2-r0920112732`, unmerged |
| U3 the shard asks | **no** | Two attempts on `auto/w1-U3*`, unmerged |
| U4 the decision seat | yes | In core (`participants/decide.ts`), vendor-neutral, stub transport, a `1.5` capability. Not in any pane; no real transport |
| U5 housekeeping | a quarter | The WebKit smoke only, not in CI. Duplicate Enter and `fitAll` on `auto/w1-U5-r0920130243`, unmerged; the cache never measured. The merge message claims all four |
| U6–U8 | no | Never started |

**Measured on the merged tree.**

| Command | Result |
|---|---|
| `cd metamedium-core && npx tsc --noEmit && npx vitest run` | typecheck clean; 661 tests in 57 files pass |
| `node --test Demos/surface/09-field.test.mjs` / `Demos/relay.test.mjs` | 18 / 8 pass |
| `node Demos/build-surface.mjs --check` | surface in sync |
| `npm run build:browser && npm run build:node`, then `cmp` against `Demos/` | **both bundles drift** — U2 and U4 changed core after the last rebuild; CI's drift check fails |
| `node Demos/mcp-smoke.mjs`; `cd shard-3d && npm test && node mcp-smoke.mjs` | all pass; 568 shard tests in 30 files |
| `node e2e/run.mjs` | canvas 202 passed, 1 honest skip; shard 120 + 11 + 9 passed |
| `node e2e/run.mjs --browser webkit smoke` | 3 passed on WebKit 26.6 |

**Two id defects, reproduced** with the engine built from the merged source:

- **D1 — an undone mark's id is reissued.** Draw X (`stroke:john~a1:1`),
  undo, let one peer line arrive (the tab reloads its merge on every line),
  draw Y: Y is `stroke:john~a1:1` too. `load()` recomputes the sequence from
  the events still present (`session.ts` ≈2473 on `auto/w1`), and the undo
  was never sent, so peers hold X under the id the tab now gives Y. A
  sentence about X lands on Y.
- **D2 — a reloaded tab starts again at one.** The tab's suffix survives a
  reload, a live tab keeps no local log, and the store discards lines under
  its own name, so the first mark after a reload is `…:1`, a number the room
  already holds for another mark.

Two more from reading (the audit's, not reproduced): the collision check runs
after the store has already discarded lines under its own name, so the two
hands that collide never learn it (D4); and only the canvas reports a
collision or a truncation — the MCP hand and the shard ignore both.

**Also on the board.** `master` is one commit ahead of `origin` (a
recording). The whitepaper's plates exist twice: the newer, committed on
`diagrams-visible-states` (`a449540`, which also commits an `e2e/node_modules`
link it should not), and an older, uncommitted copy in `master`'s working
tree. Two old worktrees remain (`_mm-week1-worktrees/_integration`,
`U1a-repair`), and seventeen unit and attempt branches beside `auto/w1`.

## 1. The constitution, and this week's rules

Log as source. Plural readings with reasons. Tier 1 before a model. One field
with stable slots. Tokens and URLs. Drift checks.

- **Nothing new lands until week 1 is whole.** Phase L comes first and is
  never cut.
- **No model computes a number.** Tier 1 does arithmetic; a model or seat may
  read a digit or choose an attachment.
- **A seat behind a transport, or nothing.** No dependency in core or the
  shard for any seat; the gate cannot reach a vendor.
- **The drafter's measurements never enter the repository.** Fixtures use the
  pages' formulas with sample numbers.
- **A merge says what it carries.** A merge message that claims work its diff
  does not hold is a defect.

## 2. The ladder

| # | Unit | Done means |
|---|---|---|
| L1 | ids that hold | No number is issued twice under one log name — not after an undo, not after a peer's line, not after a reload — and an undo reaches every peer |
| L2 | week 1's missing halves | Every unit week 1 claimed is on the branch whole, or named as dropped with the reason |
| L3 | CI, bundles, docs | CI runs everything that exists and would have caught week 1's misses; the docs say what the code does |
| L4 | John's decisions, and landing | The seat's home decided, the plates reconciled, `w2` merged to `master` and pushed, the attempt branches gone |
| M1 | quantities and expressions | Every line of the two sample pages parses to what the drafter meant, plural where it reads two ways, with no model and no `eval` |
| M2 | the sheet | Lines on the board become definitions, steps and checks; a changed value re-derives every step |
| M3 | figures and dimensions | Lines meeting read as one figure; a number beside a side is offered as its length, ranked, with its reason; each drawing has a scale |
| M4 | solving | The right triangle says 25.30″ with its formula, and its conflict when a third label says 24 |
| M5 | maths on the board | The triangle, a step's check and a changed value work end to end in the browser gate |
| J1 | the decision seat on the canvas | Asked only when the engine's ranking is flat, by a deliberate act; measured on fixtures; one adapter |
| J2 | the extraction seat, a spike | A measured answer to whether GLiNER2 runs where MetaMedium runs, fast enough, under a licence we can ship |
| J3 | numerals from the hand, an experiment | Digits and arithmetic signs read with no model, from John's own samples — or a benchmark that says why not |
| H1 | the hand in the gate | Week 1's U7, plus maths across hands |
| R1 | the review of use | John and the drafter on the real pages; the faults written up; that is week 3 |

Deferred, with the reason: week 1's **U6** (the whitepaper's next figures)
until R1 says which figure earns its place — the pattern may be it; **ranges
as sliders** and **to scale and print** until R1.

## 3. Per unit

### L1 — ids that hold

**Status, 26 Sep 2026: done on `w2`** — `3f1f4f2` (the regressions, red),
`65f5870` (core), `b4c4be7` (relay), `6191f87` (canvas and its MCP hand),
`87f80c0` (shard and its MCP hand), `a1f0fa9` (a send that never settles),
and the docs commit after them. The recommended design, because the
regressions asked for exactly it: a live hand's log is one sitting
(`sittingName`, `session/hands.ts` — a new suffix per page load or process,
nothing kept where a reload finds it, the shown name and colour from
`handLabel`), the session's high-water mark only rises, `LiveStore.publish`
sends a `full` when the log did not only grow, every line carries its
sitting, a hello is answered with every log held (`via`), and
`notices()` is said by all three hands. Numbers: core 673 in 57 files (661);
`relay.test.mjs` 13 (8) and the field's 18; shard 573 in 30 files (568); both
MCP smokes pass with a doubled name and a truncated room; the gate 347 passed
and the one honest skip (canvas 207, shard 120 + 11 + 9); WebKit smoke 3.
Left, and why: the shard's log is still unnamed (U1d, L2 — its name is
already per sitting, so naming it inherits all of this); two tabs on one
folder under one device name still share a file (a folder's concurrency, not
a room's); and one event carried in two logs — a tab that joins again under
a different person's name in one page load, or two hands that opened the same
folder and joined one room — is applied twice (one node, its id listed twice
on the board, attributed to whichever log merged last), because the merge does
not collapse one event by its authorship. Pre-existing; none of it reissues a
number.

**Owns:** `metamedium-core/src/session/session.ts` (the sequence),
`store/live.ts`, `Demos/surface/17-folder.js` (flush, join), `Demos/relay.mjs`,
`shard-3d/src/room.ts` (the same flush), `Demos/mcp.mjs`, `shard-3d/mcp.mjs`.

**Red first:** D1 and D2 as tests in `ids.test.ts`, exactly as reproduced
above; and in `live.test.ts`, three parties, one departed: A appends three
lines, answers a hello with `full`, appends two, undoes one and closes; B
stays; C joins. C's copy of A must equal A's final log of four events.

**Design, recommended:** a live tab's log is **one sitting** — a new suffix
per page load, the shown name unchanged — so a reload can never reuse a
number and D2 goes by construction; within a sitting the high-water mark
never falls, whatever `load()` sees, so D1 goes. The alternative is to
recover the number from the room's copy of the tab's own log before the first
mark, which needs the store to stop discarding its own lines on catch-up and a
wait before drawing. The regression decides; the director reviews the choice.
Then: a flush sends the whole log when it has shrunk or diverged from what was
sent, so an undo reaches peers; the collision check runs before any line is
discarded and all three hands report it; `MAX_LINES` is settable.

**Checks:**
```
cd metamedium-core && npm test -- ids live
node --test Demos/relay.test.mjs      # with a cap of 10 and 20 lines, the newcomer is told
node Demos/mcp-smoke.mjs && (cd shard-3d && node mcp-smoke.mjs)
node e2e/run.mjs
```

**Invariant:** Log as source. The number is derived from the log — the
sitting's own events — never from a counter kept outside them.

**Trap:** keeping `mySeq` monotonic in memory fixes D1 and not D2, because a
reload has no memory. And every existing room harness is two parties, both
alive; a fix proven only there is the fix that failed last week.

### L2 — week 1's missing halves

**Owns:** whatever the chosen attempts touch. For each of U1d, U2's surface,
U3 and U5's duplicate Enter and `fitAll`: take the better of the attempt
branches, rebase it onto `w2` after L1 (never merge blind — they were cut
from older tips, and L1 changes ids), and verify it against the checks for
that unit in `DIRECTOR-PLAN-W1.md` §2–3, which stand unchanged. The silhouette
cache is measured with a number and bounded only if the number says so.

**Red first:** each attempt's own regression, cherry-picked alone and shown
red on `w2` before its code lands.

**Checks:** week 1's commands for each unit, then the whole suite (§6).

**Invariant:** one mechanism per job. The losing attempt is deleted, not left.

**Trap:** U1d must pair a brief and its answer by L1's ids, not by the key it
replaces, and it must name the shard's log — until it does, `space_say` still
lands on the wrong marks in a room of three.

### L3 — CI, bundles, docs

**Owns:** `.github/workflows/ci.yml`, both committed bundles, `CLAUDE.md`,
`ROADMAP.md`, `SURFACE-v10-PLAN.md` (T8's status), `QA-v10.md`,
`metamedium-core/README.md`.

**Done means, concretely:** both bundles rebuilt and in sync;
`node --test Demos/relay.test.mjs` in CI's core job; a WebKit job that
installs WebKit and runs the smoke, and the smoke takes one pill as week 1's
plan asked; `CLAUDE.md` describes ids per hand, the `label` event, the relay's
catch-up and its collision line, the decision seat and its tier, the shard's
question, and the repository map lists `relay.test.mjs`, `decide.ts` and the
`smoke` scenario; the sentence that says the merge "does not translate yet"
is removed or restated truthfully.

**Checks:**
```
node Demos/build-surface.mjs --check
rg -n "webkit" .github/workflows/ci.yml
rg -n "does not translate yet" CLAUDE.md
```

**Invariant:** one definition, one home — thresholds cited, never restated.

**Trap:** documentation written from the plan rather than the code. Every new
sentence names the file that makes it true.

### L4 — John's decisions, and landing

Three things only John does. **The seat's home:** recommended, it stays in
core as a participant kind at tier 1½, because the maths push is its second
consumer — the promotion rule's own condition — with `noul` renamed to a
vendor-neutral `yesNo` and the vendor's HTTP shape confined to one adapter
outside core. **The plates:** merge `diagrams-visible-states` without its
committed `e2e/node_modules` link, and drop the older uncommitted copy in
`master`'s working tree. **Landing:** merge `w2` into `master`, push, delete
the attempt branches and the two old worktrees.

### M1 — quantities and expressions

**Owns:** `metamedium-core/src/maths/quantity.ts`, `expr.ts`, their tests,
and `metamedium-core/src/maths/fixtures/`.

**The fixtures,** the pages' formulas with sample numbers:

- *apron.sample* — `A. Bust 36` · `B. Top to waist 20` · `C. Top to bottom 46`
  · `Add seam allowance` · `1. A ÷ 3 = 12 + 2 = 14` · `2. ① ÷ 2 = 14 ÷ 2 = 7`
  · `3. B 20 + 2 = 22` · `4. C 48` · `5. A 38"` · `6. (C × 2) − B 72"`, and the
  brace's `72–74"`.
- *tunic.sample* — `1. Chest + 6" ÷ 2   (36 + 6)/2 = 21"` ·
  `2. Shoulder to length desired + 2   54 + 2 = 56"` ·
  `3. Top shoulder to under armpit × 2 + 3–6"   (9 × 2) + 4 = 22"` ·
  `4. Fist + 2–4"   3.5 + 4 = 7.5"` · `5. Arm length + 2"   21 + 2 = 23"`.
- *triangle* — legs labelled `24` and `8`, the long side labelled `24`.

**Red first:** each line with its expected reading or readings.

**Checks:** `cd metamedium-core && npm test -- maths`. Every `=` chain
checks. Three lines return two readings each, ranked, each with its reason:
`Chest + 6" ÷ 2` (by precedence, three more than the chest; as worked, the
chest plus six, halved — and the worked line beside it settles it);
`3–6"` (a range, not three minus six — a length is not negative);
`(C × 2) − B` (72 from the measurements, 74 with seam allowance on both).

**Invariant:** tier 1 does the arithmetic — pure functions, zero
dependencies, no `eval`.

**Trap:** a handwritten `=` chain is a **running total**, not an equation.
`A ÷ 3 = 12 + 2 = 14` means A ÷ 3 is 12, and 12 + 2 is 14; read as algebra it
is false. And a reader returns `-` for minus, a range dash and an en dash
alike, and `x` for a letter and for times.

### M2 — the sheet

**Owns:** `maths/sheet.ts` and its tests. It reads lines from the `writing`
concept's transcripts (`concepts/concept.ts`, `transcriptsOf` in
`session/nodes.ts`) and from text artifacts' code.

**Red first:** over the M1 fixtures, change A from 36 to 38: steps 1, 2 and 5
re-derive and nothing else moves; undo restores them.

**Checks:** `npm test -- maths`; the sample page typed as text artifacts into a
session, replayed from its log, yields the same sheet.

**Invariant:** log as source. The sheet is derived state; no event carries a
derived number.

**Trap:** what belongs to one sheet. A column of lines read as writing is one
sheet; the drawing's own labels (`1. 15″`) are not steps but references to
one, each with a written value to check.

### M3 — figures and dimensions

**Owns:** `maths/figure.ts`, `maths/dimension.ts` and their tests; reads
`session/magnets.ts` (`bindingsOf`) and `relate/relations.ts`.

**Red first:** a triangle drawn as three lines with `24`, `8` and `24` beside
its sides (text artifacts standing in for handwriting): each number attached
to the right side, with a reason and a runner-up; the same triangle as one
closed stroke gives the same sides.

**Checks:** `npm test -- maths`, then the whole core suite.

**Invariant:** plural readings with reasons. Every attachment carries the
distance to that side's middle relative to the side's length, its alignment,
and the next candidate.

**Trap:** the underline. A drafter underlines each value, and the underline
is a line — at once a candidate edge and a candidate dimension line. A number
on a short line that belongs to no figure labels that line only if the line
spans something; otherwise it is an underline and belongs to the number.

### M4 — solving

**Owns:** `maths/solve.ts`, `session/measure.ts` (units, what was derived,
conflicts) and `describeMaths`.

**Red first:** legs 24 and 8 → long side 25.30″ with the formula; a third
label of 24 → a conflict of 1.30″ (5%) and the other consistent reading (24 on
the long side makes the other leg 22.63″); a circle labelled with its
circumference gives its radius; a 43″ width from parts of 21″ and 22″ checks;
an unlabelled measure is offered from the scale and marked as the ink's.

**Checks:** the whole core suite, with `clean.bench.test.ts` and
`commandmark.bench.test.ts` untouched.

**Invariant:** figure by figure, closed form. No iteration, no residual, no
two figures solved together.

**Trap:** a sketched right angle is rarely 90°. A declared square in the
corner or a labelled angle rules; a measured angle near 90° is offered as
right only as a reading, with the tolerance cited from `measure.ts`, never
restated.

### M5 — maths on the board

**Owns:** `Demos/surface/08-render.js` (chips), `10-inspector.js` (the panel in
units), `09-field.js` (an `=` prefix, with its Node test extended),
`09-palette.js` (the adapter), `19-text.js` (live text), a new fragment
`22-maths.js` if one is needed (before `90-boot`), `Demos/session-engine.e2e.js`,
the built `Demos/session-engine.js`.

**Red first:** e2e records: the three-line triangle with typed `24` and `8`
shows `25.3″` on its long side; a third `24` shows the conflict chip; the
sample page's steps show their checks; changing A changes the dependent
chips; undo restores them.

**Checks:**
```
node --test Demos/surface/09-field.test.mjs
node Demos/build-surface.mjs --check
node e2e/run.mjs
```

**Invariant:** every sentence has one place; ghosts go (v10 F4). A derived
side shows for a moment and on hover, and always in the panel.

**Trap:** the answer card is not a place for a number (the 15 Sep notes, §6).
Derived values live beside their figure.

### J1 — the decision seat on the canvas

**Owns:** one adapter in the surface for the hosted transport (a provider in
`Demos/surface/04-models.js`, or its own fragment), the seat's questions for
the maths in `maths/dimension.ts`, `e2e/guards.mjs` (the vendor's host), tests.

**Done means, concretely:** asked only by a deliberate act (the field opening
on a figure, or *what is this*), never on a stroke — the v9 rule holds for a
seat because it spends the user's key; asked only when the engine's own
ranking is flat; two questions to start — *which side does this number label*
and *what is this number* — each a Choice over the engine's candidates plus
`no-match`; its answer one more attributed row whose reason is the question
and the distribution; whether the browser may call the vendor directly
established (if it is refused, a local endpoint beside the relay, the key
still never written to a file).

**Red first:** with the stub transport, a flat attachment asks one question
and a clear one asks none.

**Checks:** `rg -n -i "typesafe|systemone" Demos metamedium-core/src shard-3d/src --glob '!*.md'`
hits one adapter only; the gate passes with the host guarded. **Measured**
(latency, agreement with hand-labelled answers on the sample board) only when
John runs it with a real key; until then every number is the vendor's.

**Invariant:** a seat behind a transport, or nothing. The engine's reading is
never evicted.

**Trap:** asking on every number. A seat that is fast is still a call with a
key, a cost and a privacy boundary.

### J2 — the extraction seat, a spike

**Owns:** a new experiment folder, `gliner-seat/`, listed in `EXPERIMENTS.md`.
Nothing lands in `metamedium-core` or `shard-3d`.

**Done means:** a README carrying the answer and the commands that produced
it: which GLiNER2 checkpoint and the licence of its weights; where it runs
(the browser via an ONNX export on WebGPU or wasm, or a Node process) with its
load time, memory and per-call latency on this machine; its spans on the
sample page's lines, three briefs typed in words and the castle's brief,
against hand-labelled expectations; a transport shaped like the decision
seat's, with a fake in its tests.

**Invariant:** experiments feed the platform; they do not become it.

**Trap:** checkpoints differ in licence, and the ONNX ports call themselves
experimental. The answer may be *not yet*, and that is a result.

### J3 — numerals from the hand, an experiment

**Owns:** `metamedium-core/src/maths/glyphs.ts` behind a benchmark, or an
experiment folder until the benchmark passes.

**Done means:** a point-cloud recognizer over the digits and the signs of
arithmetic, taught from John's own samples the way the command mark is
taught; glyphs of several strokes grouped before they are read; a benchmark
on a recorded set of John's writing with the bar set before the build — 95%
on John's glyphs and no false fires across the drawing corpus — and it ships only
if the bar is met.

**Needs John:** one short recording session, each glyph written several
times.

**Trap:** *1*, *7* and *l*; *0* and *o*; *5* and *s*; *×* and *x* and *+*
turned; *=* is two strokes, *÷* three, and *4* often two.

### H1 — the hand in the gate

Week 1's U7 as written (`DIRECTOR-PLAN-W1.md`, U7), plus one record: the hand
draws the triangle and writes `24` and `8` as text, and the tab shows `25.3″`
— maths across two hands, which only holds after L1.

### R1 — the review of use

John and the drafter on the real pages, on John's own machine; the pages
never enter the repository. The MCP hand in the room. The faults written up
the way `NOTES-DRAWING-WITH-THE-HAND.md` did it, and that is week 3's plan.

## 4. Risks

1. **An id fix that holds for one sitting.** Signal: a test with no load
   between the undo and the next mark; no reload test; fewer than three
   parties; a departed hand nowhere.
2. **A number computed by a model.** Signal: a model's reply parsed as a value
   anywhere outside a reader; the HERE clause missing; a prompt asking for a
   total.
3. **Maths in the log.** Signal: an event or rep that carries a derived
   number.
4. **A constraint solver by stealth.** Signal: iteration, a residual, two
   figures solved together.
5. **A seat as a dependency.** Signal: a package added to core or the shard
   for a seat; the vendor's host outside one adapter; a test that needs the
   network.
6. **Integration theatre**, week 1's own. Signal: a merge message listing what
   its diff does not hold. The director diffs every merge against its claims.
7. **The drafter's measurements in the repository.** Signal: the pages'
   numbers in a committed file. The samples in M1 differ from them by
   construction; the director holds the pages.

## 5. What to cut

Cut J3 first, J2 second, and M5's field extras third. Never cut L1–L3, and
never the red-first tests of M1–M4.

## 6. How the agents run

**Where.** One worktree, `../MetaMedium-w2`, on branch `w2`, made from
`git merge master auto/w1` (conflict-free, checked). Not the main checkout,
which holds the uncommitted plates. Dependencies by `npm ci` in
`metamedium-core`, `shard-3d` and `e2e`, or by copy-on-write clones of
`master`'s (`cp -Rc`) — **never symlinks**: with a symlinked `node_modules`
the shard's vite never finishes a page load, and all three shard scenarios
time out at 90 s. Seen in this session; they passed once the links were
clones.

**Who.** One Opus subagent per unit, one at a time. Between units the
director reads the diff against the unit's checks, invariant and trap, runs
the whole suite, and only then starts the next. A unit that fails review is
redone on the branch; no attempt branch is left behind.

**Every unit ends with the whole suite:**
```
cd metamedium-core && npm run typecheck && npm test && npm run build:browser && npm run build:node \
  && cmp dist/metamedium-core.browser.js ../Demos/metamedium-core.browser.js \
  && cmp dist/metamedium-core.node.mjs ../Demos/metamedium-core.node.mjs
node --test Demos/surface/09-field.test.mjs Demos/relay.test.mjs
node Demos/build-surface.mjs --check
node Demos/mcp-smoke.mjs
cd shard-3d && npm run typecheck && npm test && node mcp-smoke.mjs
node e2e/run.mjs && node e2e/run.mjs --browser webkit smoke
```
When a unit changed core, it copies the rebuilt bundles into `Demos/` and
commits them with the change.

**Never:** a real model or vendor called from a test or the gate; a key in
any file; the e2e on John's own origin (it runs on `127.0.0.1` only); a push;
a merge to `master`.

**The brief** each agent receives, with the unit filled in:

> You are implementing unit **‹X›** of `DIRECTOR-PLAN-W2.md` in the worktree
> `/Users/johnhanacek/Documents/GitHub/MetaMedium-w2` on branch `w2`. First
> check the worktree is clean and at the tip of `w2`. Read `CLAUDE.md`,
> `MATHS-PLAN.md`, and §1, §3 ‹X› and §6 of the plan; for L2 also read
> `DIRECTOR-PLAN-W1.md` §2–3. Commit the regression alone and show it failing
> (paste the failing line into the commit message). Implement until the
> unit's *done means* holds. Run the unit's checks, then the whole suite in
> §6, and commit with the numbers in the message. Change only the files the
> unit owns, plus tests and docs that describe them. Do not push, merge to
> `master`, create branches, call any real model or vendor, or write any key
> to a file. Report: a status line (done, partial or not done); the commits;
> each check's command and its last line of output; anything not done and
> why; what the next unit must know.

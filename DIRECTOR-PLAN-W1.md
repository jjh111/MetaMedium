# Director's plan — week 1, pre-flight

*Written 20 September 2026 on `auto/w1-W0` at `d1a65e8`, by the expert seat,
before the week starts. Read-only: no source was run or edited for this
document. The unit list, its order and the merge policy are the director's
(`.lane/HANDOFF.md`) and are not re-planned here. What this document adds is
the check for each unit — a command and what it must print — the invariant
each unit is most likely to bend, the five ways the week could look finished
without being finished, and what to cut. Every count below that I did not
produce myself is marked with whose it is; where I have not run something it
says **not measured**.*

Read with `DIRECTOR-VIEW-2026-09-17.md` §4 (the order), `NOTES-DRAWING-WITH-THE-HAND.md`
(defects A–F), `DIRECTOR-REVIEW-2026-09-15.md` (the implementation contract:
one owner, one failing regression first, exact verification output).

---

## The constitution

Log as source. Plural readings with reasons. Tier 1 before a model. One field
with stable slots. Tokens and URLs. Drift checks.

And the four standing rules for this week:
- **No new rung until ids per hand land.**
- **No third surface.**
- **Nothing promotes from the shard to core until it has been reused and replayed.**
- **A decision seat behind a transport, or nothing.**

---

## 1. The ladder

One line per unit, in the week's order. "Done" is the sentence; §2 is how a
machine tells.

| # | Unit | Done means |
|---|---|---|
| U1a | ids per hand, core | The same event yields the same node id in every session that replays it, whatever else is in the merge, and every held log still loads. |
| U1b | both surfaces consume the event-derived id | A hand's `canvas_say` / `canvas_propose` / `space_say` about an id it read lands on that mark in every other hand's tab, with no id translated anywhere. |
| U1c | the relay's catch-up | A newcomer to a room ends with exactly the logs the room's hands hold, is told when the room is older than the relay remembers, and two logs under one name are announced instead of eaten. |
| U1d | the shard drops its pairing workaround | A brief and its answer reference each other by node id, `brief:<key>` / `answer:<key>` are gone from the write path, and the shard's smoke and gate still pass. |
| U2 | a hand may label its own ink | Whoever made a mark can put a word on it that shows beside it in every tab, is attributed, replays, undoes, and makes no artifact, no file and no definition. |
| U3 | the shard asks | A hull stood on a single silhouette carries a visible question about the axis it lacks, and a second view or a word closes it and re-derives the body. |
| U4 | the decision seat, bounded | A `decide` seat names the castle's parts from John's words through an injectable transport, with a fake transport in the tests and the vendor reachable only through one adapter, measured on fixture 1. |
| U5 | housekeeping | Two Enters on one loop ask once; the silhouette cache has a number beside its bound; `fitAll` fits content and the cards place themselves; a WebKit smoke runs in the gate and says what it is. |
| U6 | the whitepaper's next figures | Two replays (the molecule to 3D; the castle) recorded after U1, loading with nothing skipped, reading in both themes, on unchanged URLs. |
| U7 | the use-review, automated half | QA-v10's machine-checkable rows run headless with `mcp.mjs` in the room, and the rows only John's hand can do are counted as skips by name. |
| U8 | closing expert seat | A director's view whose every number was produced by a command shown beside it, and next week's plan in the same form as this one. |

---

## 2–3. Per unit: what a machine checks, and the invariant it must not break

For each unit: **Check** is a command and what it must print, or a statement
that no command can check it and what a human looks at instead. **Invariant**
is the line of the constitution this unit is most likely to bend, and how.
**Trap** is what I found by reading the code that the owner should know
before writing the regression.

### U1a — ids per hand, core

**What is true today** (by reading, not reproduced): `nextId` is
`` `${prefix}:${++counter}` `` over the merged replay (`metamedium-core/src/session/session.ts:634`),
`counter` is checkpointed with the state (line 592), and eight id families
come off it — `stroke`, `artifact`, `participant`, `explanation`, `word`,
`frame`, `summon`, `sug`. Events reference ids through **eight field
names** — `nodeId` (7 arms of the union), `ids` (10), `participantId` (16),
`summonId` (2), `suggestionId`, `strokeId`, `definitionId`, `aboutIds`
(counted with `grep` over `session.ts:150–338`). Every one of them is a
cross-hand reference that can land wrong today, not only `aboutIds`. In
particular a `bless` from hand B carries B's `summon:N`; in A's merged replay
that summon may be numbered differently, so B's artifact may never form on
A's board. Not reproduced; it follows from the counter.

**Check, in order of cheapness:**

1. The regression is written first and shown red on master, per the
   15 Sep contract. A test in `metamedium-core/src/store/merge.test.ts` (or a
   new `ids.test.ts`) that builds the **same two logs** into **three
   sessions** — A alone, B alone, and a third holding both — and asserts
   that every node made by a given event has the same id in all three, for
   every id family, and that every id-bearing field of every event resolves
   to a node with the same ink in all three. Command:
   ```
   cd metamedium-core && npm test -- ids
   ```
   Expected: red before U1a, green after, and the test enumerates the eight
   field names above by name so a ninth cannot be added to the union
   unnoticed (a `grep` of the union in the test, or a type-level
   exhaustiveness check).
2. **A reloaded board keeps its ids.** The tab's log name is
   `person~tab`, and the suffix lives in `sessionStorage` (`17-folder.js:129`);
   the MCP hand's suffix is per process (`mcp.mjs:47`). A new tab, a reload
   in a new tab, or a restarted hand is a **new log name for the same
   events**, and the autosaved log in `localStorage` is unstamped. So an id
   that is a function of *the log name at replay time* changes across tabs.
   The check: load the same unstamped log under two different `me` names and
   assert identical ids. Whatever the design — a per-writer sequence written
   into the event at creation, or a stamp the migration writes once — this
   test decides it. Command: the same `npm test -- ids`.
3. **Every held log still loads, unchanged on disk.** The corpora in the
   repo are `Demos/recordings/canonical-loop.json`,
   `Demos/recordings/mvp-page.json`, `shard-3d/fixtures/john-2026-09-16-castle-sketch.mm.log`,
   `shard-3d/fixtures/john-2026-09-16-massing.mm.log`. Plus, outside the
   repo, John's `.metamedium/logs/` folders and his tabs' `localStorage`.
   Command:
   ```
   cd metamedium-core && npm test -- replay          # canonical-loop pinned to identical state already
   cd shard-3d && npm test -- export hull demo        # the two .mm.log fixtures
   git status --short Demos/recordings shard-3d/fixtures
   ```
   Expected: green, and **an empty `git status`** — the fixtures are not
   regenerated to fit. If a migration rewrites a fixture, that is a separate
   commit whose message says what changed in the drawing (nothing) and why the
   bytes did.
4. The bundles and the surface build are re-cut and match:
   ```
   cd metamedium-core && npm run build:browser && npm run build:node
   cp dist/metamedium-core.browser.js ../Demos/ && cp dist/metamedium-core.node.mjs ../Demos/
   git diff --exit-code -- Demos/metamedium-core.browser.js Demos/metamedium-core.node.mjs
   ```
5. The literal-id count is **read, not chased**. Today there are
   182 literals of the form `'stroke:N'` (and siblings) across 25 files —
   9 in core tests, 1 each in the canvas e2e, both smoke tests and the shard
   e2e, and the rest in shard unit tests (`constraints.test.ts` 34,
   `form.test.ts` 24, `op.test.ts` 21, `hull.test.ts` 17). Command I ran:
   ```
   rg -c "'(stroke|artifact|explanation|word|frame|participant|summon):[0-9]+'" metamedium-core/src Demos shard-3d/src shard-3d/e2e.js shard-3d/mcp*.mjs e2e
   ```
   After U1a, re-run it. The number is allowed to change; what is not allowed
   is a test whose *assertion* was weakened to make it change (see risk 1).

**Invariant: Log as source.** The id must be derivable from the log alone —
never from the order lines arrived, never from `Date.now()` at replay, never
from a lookup table held outside the events. Checkpoints stay derived
(`snapshot()` must not become a place ids are kept).

**Trap:** `participant:N` for joined models is the gap CLAUDE.md already
names ("a model's proposals in another hand's log reference that hand's
participant ids, which the merge does not translate yet"). If U1a fixes
strokes and leaves participants on the counter, `canvas_propose` from a
model in B's log still lands under the wrong voice in A's tab. The
regression in check 1 must include a `join` + `propose` pair.

### U1b — both surfaces consume the event-derived id

**Check:**

1. The canvas smoke, extended, then run:
   ```
   node Demos/mcp-smoke.mjs
   ```
   Add to it: the tab draws a mark; the hand `canvas_look`s and reads the id;
   the hand `canvas_say`s about that id and `canvas_propose`s a reading on it;
   the tab asserts the explanation's `about` edge and the `resembles` edge
   point at **its own node with the same id**, whose ink is the mark the tab
   drew. Expected: the check count rises from 20 and every check prints `ok`.
2. The shard smoke, the same shape, for `space_say` / `space_propose`:
   ```
   cd shard-3d && node mcp-smoke.mjs
   ```
3. The canvas e2e's two-hand records (`28`–`28d`, `Demos/session-engine.e2e.js:1294–1317`)
   gain one: hand B's `say` about A's mark is attached to that mark in A's
   tab. Then the whole gate:
   ```
   node e2e/run.mjs
   ```
   Expected: pass count up by the new records, `fail: 0`, the one honest
   skip still a skip.
4. Runtime memory keyed by id no longer needs the fresh-board workaround
   (`pruneRuntime` in `08-render.js` exists because "ids are a counter derived
   on replay, so a fresh board reuses them"). It may stay; it must not be
   *relied on* to hide an id that changed. Check: `grep -n pruneRuntime Demos/surface/*.js`
   and read whether any new call was added to paper over a churned id.

**Invariant: Drift checks.** Edit the fragments, run `node Demos/build-surface.mjs`,
commit `Demos/session-engine.js` with them; `node Demos/build-surface.mjs --check`
prints `surface in sync`. And **One field with stable slots**: nothing about
ids reaches the field's rows; `node --test Demos/surface/09-field.test.mjs`
stays green untouched.

### U1c — the relay's catch-up

**What is true today** (by reading): the relay replays its whole buffer to a
connection with no `Last-Event-ID`, old `full` answers included
(`Demos/relay.mjs:41–42`); `LiveStore.receive` **replaces** a held log on
`full` (`store/live.ts:106`) and **drops any line under its own name**
(`live.ts:97`), so a name collision is invisible by construction; the buffer
is capped at `MAX_LINES = 5000` and the loss is silent. And one more, which
is not in the notes: **an undo is never sent.** Both `flush`es send
`mine.slice(sentCount)`; after an undo `mine` is shorter than `sentCount`, the
delta is empty, and the next new stroke lands exactly at `sentCount` and is
skipped too (`17-folder.js:232`, `shard-3d/src/room.ts:305–306` clamps `sent`
but still sends only the delta). Peers hold the erased mark until the next
hello. e2e `28d` checks A's own board after undo, not B's. **Not reproduced.**

**Check:**

1. A Node test against the real relay on a free port
   (`startRelay(0)` from `Demos/relay.mjs`, `relayTransport` from
   `Demos/live-node.mjs`), **three parties, one departed**: A appends 3
   lines, answers a hello with `full`, appends 2 more, undoes 1, then closes;
   B stays; C connects. Expected: C's copy of A's log equals A's final log
   (4 events, the undone one gone) and C's copy of B's equals B's. Command:
   ```
   cd metamedium-core && npm test -- live
   ```
   (`live.test.ts` has four cases today, all on `LocalHub`, none with a
   departed hand or a third party.)
2. **Collision says so.** Two stores share `me` in one hub; each appends a
   different event; after one hello round each has a `collision` (or
   equivalent) it can report, keyed by divergence and not by length (a reset
   legitimately shortens a log — the notes' own rule). The canvas shows it in
   the status line; the e2e records the text.
3. **The cap is spoken.** `MAX_LINES` made settable (env or option); run the
   relay with a cap of 10, post 20 lines, connect a newcomer: the stream's
   first line (or an SSE comment the transport surfaces) says the room is
   older than what follows, `LiveStore` exposes it, the status line says
   *the room is older than the relay remembers*. Check: the Node test above
   with the small cap; the e2e asserts the status text.
4. The smoke tests still pass (they are two-party and prove nothing about
   this, but they must not regress): `node Demos/mcp-smoke.mjs`,
   `cd shard-3d && node mcp-smoke.mjs`.

**Invariant: Log as source.** The relay keeps **no truth of its own**. A fix
that makes the relay compact, dedupe or re-order lines has crossed the line;
a fix that adds a *marker* (truncation, collision) has not. The merge stays
`mergeLogs`; `LiveStore` decides what to hold, the relay only carries.

**Trap:** the two smoke tests, the canvas e2e's room records and the shard's
gate are all **exactly two parties, both present**. Every failure in the
notes (§1, §C) needed three logs or a hand that had gone. A fix tested only
in those harnesses is the "works with one hand" fix of risk 2.

### U1d — the shard drops its pairing workaround

**Check:**

```
rg -n "BRIEF_PREFIX|ANSWER_PREFIX|brief:|answer:" shard-3d/src shard-3d/mcp.mjs
```
Expected: no hit on a **write** path. A hit is allowed only in a reader that
accepts logs written before U1a, and that reader has a test loading such a
log (`john-2026-09-16-castle-sketch.mm.log` carries no brief; one would have
to be recorded — say so if it is not). Then:
```
cd shard-3d && npm run typecheck && npm test && node mcp-smoke.mjs
node e2e/run.mjs shard demo demo2
```
Expected: `space_pending` / `space_answer` pass every check they pass today
(26 in the smoke), with the answer's `aboutIds` equal to the brief node's
`about` edges read in the **other** party's session.

**Invariant: Nothing promotes from the shard to core until it has been reused
and replayed.** U1d *removes* a shard mechanism; it must not be the moment a
`pairing` or `question` primitive quietly enters `session.ts`. If U1a needs
an event-level change to make this possible (it should not — an `answer`
already carries `aboutIds`), that change is U1a's and is tested there.

### U2 — a hand may label its own ink

The director's sentence: *a label is a word placed on a mark by whoever made
the mark — not a bless, not a file.* Closes B and D of the notes; may give
`canvas_write` placement relative to a mark (F) if the owner reaches it.

**Check:**

1. Core test: participant P adds a stroke and labels it `sun`. Expected:
   the label is readable from the node and attributed to P; `state.artifacts`
   is unchanged; the matcher offers nothing new for the next circle
   (`matchesFor` sees no new definition); `libraryEntries` (surface) has no
   new entry; the folder/grid view has no new card. A label by Q on P's mark
   is held (attributed to Q) and is **not** shown as the mark's word — or is
   refused; either is a decision, but the test states which.
2. Log as source: `session.undo()` after a label removes it; a replay of the
   log yields the same label; a merged log from another hand shows the label
   in that hand's tab attributed to the labeller (extend `mcp-smoke.mjs`: the
   hand draws and labels; the tab reads the word on the merged node).
3. Erasing the mark takes the label with it; undo of the erase brings both.
4. The surface: the label is drawn beside the mark in the ink's own colour
   and **scales with the board** (the caption rule of `13-kinds.js`, not
   screen-size type), in both themes. **No command checks this.** A human
   opens the board at two zooms and in `?theme=paper` and `?theme=dark` and
   looks; the e2e can only assert the label element exists.
5. If (F) is done: `canvas_write` with a placement relative to a mark
   produces bounds inside that mark's bounds, asserted in the smoke.
6. The canonical-loop spec is untouched: `git diff --stat metamedium-core/src/session/session.scenario.test.ts`
   is empty. Naming by bless still works exactly as before.

**Invariant: Plural readings with reasons** — and the one it most tempts:
**Tier 1 before a model** in reverse. A label is an event with an author; it
never evicts a reading, never becomes the name the matcher learns, never asks
a model. If `wordOf` is changed so a label *is* the name, the field's *Name*
slot and the label are two doors to one bless, and the constitution's "one
field with stable slots" has been bent by adding a second mechanism. Signal:
`wordOf` semantics change; any `*.scenario.test.ts` edit.

### U3 — the shard asks

T7's first case, in 3D, **built in the shard**. `solid.ts:657` today: *one
silhouette on its own: nothing else says how far it runs*, so the hull takes
a default depth silently.

**Check:**

1. Shard vitest: stand a footprint and **one** ⊓ from one standpoint.
   Expected: exactly one question on the explanation plane about that
   solid, naming the axis it lacks, with the default it took as a candidate
   *with its number and reason* (plural, not a bare prompt). Add the second
   ⊓ from another standpoint: the question is closed and the mesh signature
   (`signatureOf(s)`) differs from before — the body actually re-derived.
   Undo the second ⊓: the question is open again.
2. The same, closed by a word (`3 deep`, or the verb table's phrasing), with
   the same re-derivation check.
3. The question is **not ink**: it joins no lasso, no signature, no
   `contentIds`; it is erasable. A test asserts `contentIds` unchanged.
4. On John's own board: `?fixture=john-2026-09-16-castle-sketch` truncated to
   the footprint and one ⊓ shows one question; the full fixture (two
   standpoints) shows none. The e2e `demo2` gains the records; then
   `node e2e/run.mjs shard demo demo2`.
5. Where it lives: `rg -n "question|accept" metamedium-core/src/session/session.ts`
   shows **no new event type** this week.

**Invariant: Nothing promotes from the shard to core until it has been reused
and replayed** — T7 as designed owns `session.ts`; this week it does not.
And **Plural readings with reasons**: the question carries the candidates
and the reason the engine is unsure, or it is a modal wearing a different hat.

### U4 — the decision seat, bounded

Fixture 1 is *which name, from the human's words*: the castle's part-naming
brief and its exchanges in `shard-3d/fixtures/exchanges/` (`castle-sketch.ideal.json`
the hand-written perfect answer; `castle-sketch.qwen3-8b.json` the real thing
in 42 s, the shard's own number; `castle-sketch.stub.json`).

**Check:**

1. **The seat is a `Seat` and nothing else knows.** It is created through
   `joinWith(name, transport)` (`shard-3d/src/models.ts:51`) with a
   `SpaceTransport`; `runBrief` has no case for it. Command:
   ```
   rg -n -i "decide|jev|typesafe|systemone" shard-3d/src --glob '!*.test.ts'
   ```
   Expected: hits in **one** adapter module and the model pane only. A hit in
   `main.ts`, `log.ts`, `generator.ts` or `room.ts` fails the unit.
2. **A fake transport is the test.** A `castle-sketch.decide-fake.json`
   exchange whose `through` names the fake; `namedparts.test.ts` reads every
   file in the directory already, so the reply must parse in the parts
   contract with `steps: 0` and both parts named from the words. Command:
   `cd shard-3d && npm test -- namedparts`.
3. **The reason is the question and the distribution**, shown as such:
   the exchange file's `reply` carries the options and their probabilities;
   the panel's model section prints them; no sentence is generated for the
   seat. Check: `rg -n "reasoning" <adapter>` produces the question text,
   not prose.
4. **The gate cannot reach the vendor.** `e2e/guards.mjs` `MODEL_HOSTS`
   gains the vendor's host; `node e2e/run.mjs` still passes (so nothing in
   the shard's boot or demo calls it).
5. **Keys never leave the device**: the seat's key joins through the pane's
   existing path; `rg -n "key" shard-3d/src/<adapter>` shows it read from
   `config`, never written into a `join` event. The smoke's log lines carry
   no key.
6. **Measurement, on fixture 1 only.** Two parts is a smoke, not a
   benchmark; say so. If John runs it with his own key, record `ms`, the
   distribution and the agreement with `ideal.json` in the exchange file.
   Until then every latency and agreement number is **the vendor's**
   (`DIRECTOR-VIEW-2026-09-17.md` §3) and **not measured** here.

**Invariant: A decision seat behind a transport, or nothing.** No dependency
in `shard-3d/package.json` (`git diff shard-3d/package.json` empty); no
vendor response shape (`probabilities`, `choice`, `confidence` fields) parsed
outside the adapter; the seat replaceable by the fake with no other file
changed.

### U5 — housekeeping

Four items, one regression each.

**Duplicate Enter.** `09-palette.js:806` → `runFieldCommand` → `runPrompt`
(`:928`), which blesses then asks every agent; `runProgram` the same. By
reading: a second Enter on a fresh loop fails at `bless` (the summon is
consumed) and says *could not hold that group*; a second Enter on a
**revision** dismisses again and asks every agent **again** — two builds in
flight for one artifact, the later refused as superseded when it lands. Not
reproduced. Check: an e2e record with the stub delayed — two Enters within
200 ms on one loop → `artifacts.length` grows by exactly one, one
`build:`/`program:` work key for that artifact, the status says the second
was already under way. `node e2e/run.mjs canvas`.

**The silhouette cache, measured.** `solid.ts:1017` — a `Map` keyed
`id|sigLen:hash|planeKey`, cleared only when a solid is rebuilt or dropped.
"Measured" means a number from a run: entries and approximate bytes after
`?demo=castle` and after N hovers across planes, printed by a probe
(`__shard.stats()` or equivalent) and recorded in the e2e result JSON.
Check: `node e2e/run.mjs demo` prints the number; a bound is added **only if**
the number says so, and the commit message and `shard-3d/README.md` carry the
number and the run. A bound with no number is risk 4.

**`fitAll`.** `01-view.js:137` unions `contentIds` with the explanations'
**logged** bounds, which are no longer where cards are drawn (notes §E).
Check: e2e — six answers on a column, `fitAll()`; every content mark is
inside `usableViewport()`, every card's **placed** rect (the runtime
placement's) is inside or the placement chose off-screen by its own scoring,
and `view.zoom` is above `MIN_ZOOM` on any board of a few dozen marks. The
slam to minimum zoom John saw once is recorded, not diagnosed; if the fix
reproduces it, say so in the record's name.

**A WebKit smoke.** `npx playwright install --with-deps webkit` in
`ci.yml`; `node e2e/run.mjs --browser webkit smoke` runs a **short**
interaction (draw, hold, the field opens, one pill taken) — not the 342
records. The result JSON carries `browser: "webkit"`. `e2e/README.md` says,
in the review's words, that this is a WebKit smoke and not an iPhone test.
Check: CI green with the new job; `results/*.json` shows the browser field.

**Invariant: Drift checks** for the first three (fragments edited, surface
rebuilt, `--check` prints in sync); **One field with stable slots** for the
first — the fix is a guard in the adapter, not a change to `09-field.js`'s
reading (its Node test stays untouched: `node --test Demos/surface/09-field.test.mjs`).

### U6 — the whitepaper's next figures

Gated behind U1: the paper must never show what breaks with two hands, and a
recording made before U1a is a log in the old id form.

**Check:**

1. Recordings are logs the engine replays. Extend `replay.test.ts` (which
   pins the canonical loop to an identical state) to **every** file in
   `Demos/recordings/`: `decodeLog` reports `skipped: 0`, the final step's
   counts match the recording's own caption. `cd metamedium-core && npm test -- replay`.
2. A two-hand recording (John and the hand) replays identically in a fresh
   session — the same test, on the molecule-to-3D recording, if it has two
   hands in it.
3. Every `src="Demos/…"` and every `href` the figures add resolves to a file
   in the tree. Command:
   ```
   rg -o 'src="(Demos/[^"?]+)' index.html -r '$1' | sort -u | while read f; do test -f "$f" || echo "missing $f"; done
   ```
   Expected: no output.
4. **Both themes.** The embeds pin `theme=paper` today (`index.html:2023, 3110, 3124`)
   and the paper-around-a-dark-demo seam is deliberate (CLAUDE.md). The new
   figures follow the same rule or the rule is changed for all three. **No
   command checks that a figure reads.** A human loads `index.html` in the
   light theme and with `data-theme="dark"`, at desktop and phone widths,
   and looks at the two new figures and the two old ones. Screenshot both
   into `e2e/results/` by hand and name them.
5. The castle figure: the shard is a vite app and GitHub Pages serves no
   build of it, so the figure is a **recording replayed by the engine** or a
   **still with a caption**, not an embed. Which one is John's decision; the
   check is that whichever it is, the page's HTML references only files the
   tree holds (check 3).
6. Published URLs unchanged: `git diff --stat -- 404.html MetaMedium_Whitepaper_v4.html archive/` is empty, and the
   social-card filename and its four `og:`/`twitter:` tags are untouched
   unless the picture changed (`Assets/make-card.mjs` rule).

**Invariant: Tokens and URLs.** Colours through `brand/tokens.css`; a figure
that carries a hex has left the token layer. `rg -n "#[0-9a-fA-F]{6}" index.html` before and after: the count does not
rise.

### U7 — the use-review, automated half

`QA-v10.md` has seven sections; its *Claude checks* column is the machine
half. The human half — John's own hand, his own letters, the castle through
his own key — cannot be automated and is not this unit.

**Check:**

1. A new gate scenario `hand`: `e2e/run.mjs` spawns the relay and
   `Demos/mcp.mjs` the way `Demos/mcp-smoke.mjs` does, opens a tab on
   `127.0.0.1` in room `mcp-test`, and drives QA-v10 §4, §6 and §7 through
   the tab harness while calling the hand's tools over stdio. §1–§3 need
   John's handwriting: they are recorded as **skips whose name says so** and
   tallied as skips (the runner already counts them separately). Command:
   `node e2e/run.mjs hand`. Expected: `fail: 0`, skips listed by name.
2. Strokes that stand in for a hand are **John's real strokes** where any
   exist (the memory of his hand: x-height 31–40 px, ascenders 72–88 px at
   zoom 1) — a recording, not a synthetic generator — or the record says
   `synthetic` in its name.
3. Nothing reaches a real model: the runner's guard (`modelAttempts`) stays
   at zero; the hand's process runs with `MM_RELAY` on a free port.
4. The human half's deliverable is a notes file in the form of
   `NOTES-DRAWING-WITH-THE-HAND.md`. No command checks it; U8 reads it.

**Invariant: Tier 1 before a model.** The hand is not a model the board asks:
its arrival triggers no reading; `render()` calls nothing. The scenario
asserts no call to the stub model happened that a deliberate act did not
cause (count `withWork` keys against the acts the script performed).

### U8 — closing expert seat

**Check:** the document is checkable the way this one tries to be. Every
count in it has the command that produced it beside it, run in that session
(a `git rev-parse HEAD` at the top); every unit's status line names the
regression that proves it and its result; no threshold is restated (cite the
file); numbers taken from another document are attributed to it. No command
checks judgement; the reader checks that the numbers reproduce.

---

## 4. Risk register

The five most plausible ways this week produces something that looks
finished and is not, specific to this repository, each with the cheapest
early signal.

**1. Id churn that passes because the tests moved.** 182 literal ids across
25 files, most in shard unit tests, some in `bind.test.ts`, `clock.test.ts`,
`behave.test.ts`. The tempting path is to change `'stroke:1'` to whatever
the new scheme prints and call the suite green — which proves that ids
changed, not that they are stable across hands. **Signal:** U1a's diff
touches `*.test.ts` before it touches `session.ts` with no new test that
builds one event into three differently-merged sessions and asserts one id;
or the new test is green on master (it must be red first). Cheapest check:
`git log --stat` on the branch — the first commit is a red test or the
package has skipped the contract.

**2. A relay fix that only works with one hand present.** Every existing
harness that touches the room is two parties, both alive: the two smokes,
e2e 28–28d, the shard gate. Both defects in the notes needed a third log or a
departed hand, and the unsent undo needs a peer to look at. **Signal:** U1c's
tests construct exactly two `LiveStore`s and never close one; `MAX_LINES` is
still a constant; the collision test compares lengths. Cheapest check:
`rg -n "new (MM\.)?LiveStore" metamedium-core/src/store/live.test.ts Demos/mcp-smoke.mjs` — count the parties.

**3. The label becomes a second way to name.** A word on a mark is one
`wordOf` away from being the name the matcher learns, and then the field's
*Name* slot and the label are two doors to one bless, the label creates a
definition, and the folder view fills with files again (defect D, reversed).
**Signal:** `state.artifacts.length` moves when a label lands;
`session.scenario.test.ts` is edited; `wordOf` changes its rule ("first
`word` rep"). Cheapest check: `git diff --stat -- '*scenario*'` in U2's
branch is non-empty.

**4. Housekeeping done as prose.** A cache "measured" by adding an LRU with a
round number; a WebKit "smoke" that is Chromium with a user-agent, or a
Linux WebKit described as an iPhone; a `fitAll` that hides the fiction by
padding. **Signal:** a bound constant appears in `solid.ts` with no number in
the commit message or README; `ci.yml` has no `webkit` install line;
`e2e/results/*.json` has no `browser` field. Cheapest check: `rg -n "webkit" .github/workflows/ci.yml e2e/run.mjs`
and `git log -1 --format=%B -- shard-3d/src/solid.ts | rg -n "[0-9]+ (entries|bytes|KB|MB)"`.

**5. A seat that quietly depends on the vendor's endpoint shape.** The
decision model's reply — options, probabilities, confidence — is exactly the
kind of typed value one is tempted to pass straight into the certainty row,
and then the seat cannot be a hand, a fake or a local classifier. **Signal:**
vendor field names parsed outside one adapter; the vendor host in more than
one file; a dependency added; no fake-transport exchange fixture beside the
real one; `e2e/guards.mjs` not extended with the host. Cheapest check:
`rg -n -i "typesafe|systemone|probabilit" shard-3d/src --glob '!*.test.ts' | cut -d: -f1 | sort -u | wc -l` — the answer is one or two.

A sixth, named because it is public rather than because it is likely: **a
figure that reads in one theme** — five days ago a figure vanished when the
light came on (notes §4), and the new figures embed a surface into a page
with its own theme switch. The signal is the missing screenshot pair in
U6's check 4.

---

## 5. What to cut if the week runs short

Cut **U6** first and **U4** second, and cut nothing from U1. U6 is gated on
U1 by the director's own rule and shows the public what is already proven,
so a week without it costs no visitor anything they can see breaking; a week
that ships it recorded before U1 lands costs a figure that breaks with two
hands on a page that promises the opposite. U4 is an experiment whose entire
value is a measurement on two parts of one castle through a vendor in early
access with no independent numbers; the transport pattern it would prove is
already proven by the shard's hand seat, so nothing structural is lost by
waiting, and an unmeasured seat is worse than no seat. Of U5, keep duplicate
Enter (cheap, real in a slow-model world) and `fitAll`, let the WebKit smoke
slip, and measure the cache only if the probe is already there. Never cut
**U1c** to save U1a: ids per hand without a catch-up that holds leaves the
two-hand demo failing in the same visible way it fails today, and the notes
will be written again. Never cut **U7**'s automated half: it is the only
check on U1 that runs with the hand actually in the room.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MetaMedium** is a recombinatorial drawing system: interfaces that learn user
vocabularies, recognize compositional patterns in real-time, and evolve through
use. Strokes are grounded geometrically (fingerprints, spatial graphs), users
name what they draw, names compose recursively, and LLMs interpret over that
grounded substrate ("AI as meta-word" — see the interactive whitepaper at
`index.html`, published at https://jjh111.github.io/MetaMedium/).

The canonical loop that proves the thesis: draw circle → save as "bubble" →
draw 3 bubbles + 2 lines → save as "molecule" → system recognizes "molecule"
automatically → ask "why?" and get grounded reasoning.

## Current Status & Plan

**See `MVP.md`** for the product being built — *ink over living artifacts*.
**See `KEYFRAMES.md`** for the three rungs every mark climbs
(shape → diagram-shape → code), each with a closed vocabulary — **built**.
**See `ROADMAP.md`** for status and the August 2026 accounting.
`ARCHITECTURE-v7-PARTICIPANTS-AND-TIERS.md` is the active engine plan; MVP.md
absorbs and raises its Stage D.

**27 Sep 2026: phase 0 of `V1-PLAN.md` is done on `w2` — week 1 is whole**
(each unit's dated status line is in the plan's §9). **Ids hold** (L1): a
live hand's log is one sitting, a page load or an MCP process
(`sittingName`, `session/hands.ts`), whose high-water mark only rises
(`session.ts`), so no number is issued twice under one name — not after an
undo, which now reaches every peer (`LiveStore.publish` sends the whole log
when it did not only grow), nor after a peer's line or a reload; one event
is applied once however many logs carry it (L1b, `store/merge.ts`). The
shard pairs a brief and its answer by the brief's node id
(L2a, `shard-3d/src/room.ts`) and asks how deep a hull seen from one
standpoint is (L2c, `shard-3d/src/depth.ts`). A hand puts a word on its own
ink and never on another's — the MCP hand's `canvas_label` (`Demos/mcp.mjs`),
a person's `label:` in the field (`09-field.js`; L2b, L2e); an artifact is
made by whoever blessed it and a word by whoever wrote its letters, on every
board (`applyBless`, `absorbIntoWord`; L2f, L2g); a hand's gestures are its
own (`handOf`; L2h), and a person is the same person across sittings — a
reload is a new hand, and the rules still ask the person "is this mine?"
(`Session.isMine`; L2i, the phase's follow-up); one Enter is one act
(`09-palette.js`) and `fitAll` fits the content (`01-view.js`; L2d). CI runs what exists
(`.github/workflows/ci.yml`) — the relay's test, the surface build's guard
against a function declared in two fragments, and a WebKit smoke that takes
a pill — and both bundles equal a fresh build (L3). Beside them: the maths core (`src/maths/`), the
extraction spike's *not yet* (`gliner-seat/`) and the performance baseline
(`PERF.md`). **Phase 0b, a board that holds, is next, ahead of the
backbone**, because `PERF.md` measured that 500 marks are usable once open,
2,000 take 100 s to open and freeze the page for 7.6 s on every stroke,
5,000 do not open, and autosave stops saving, in silence, at 1,100–1,600
marks.
**`V1-PLAN.md` is the plan**: the whole platform as layers (tools, context,
library packs, seats), diagrams with Mermaid out and in, handles and
bindings that follow, maths as a tool, and what "ready for true use" takes
— ten acceptance scenarios, a ladder of units, and when v1.0.0 ships. The
headline below is the 17 Sep state it builds on.

Headline (17 Sep 2026, everything on `master`; `DIRECTOR-VIEW-2026-09-17.md`
is the director's view of where it all stands, the 15 Sep review reviewed,
where a decision-only model such as Jev would fit, and the next steps in
order — ids per hand first): **the board is worked like a diagram, the
door opens both ways, a shard makes things in space, and the review's nine
packages are in.** Magnets P0–P1 (`CONTROL-POINTS-PLAN.md`): the pen feels where a mark
offers attachment and a connector released on a site binds to it, one
`bound-to` edge per endpoint (BIND-1). The MCP door (`Demos/mcp-client.mjs`):
the canvas is an MCP client too — a server's tools map to read, answer and
draw, and it joins as `mcp:<name>`. The 3D shard (`SHARD-3D-PLAN.md`,
`shard-3d/`): P0–P6 to the MVP line plus a navigation compass. And
`DIRECTOR-REVIEW-2026-09-15.md`, every package landed: a late result never
resurrects an erased target (STATE-1), the browser scenarios run headless
in CI (QA-1, `node e2e/run.mjs`), the shard undoes whole acts (ACT-1) and
validates every op tree it reads (DATA-1), the field stays in the visible
viewport (UI-1), a placed instance is scored against its own constraints
(GRAPH-1), the field's reader is a pure fragment (SEAM-1, `09-field.js`),
and the shard's panel leads with what is selected and where it came from
(UI-2). Before that (v10 T1–T6 and F1–F7, 14 Sep 2026, on `next-phases`):
**the canvas reaches out** — an MCP hand (`Demos/mcp.mjs`, registered in
`.mcp.json`) lets Claude Code look, see, draw, say, propose, transcribe and
write on the board as a participant in a live room; a playing program
takes the pointer while ink begun outside goes over it; words gather by
nearness into a line of writing read as one; press-and-hold holds a mark
with what it hangs together with, and the standing line is a ladder of the
next move; circles joined by lines stand in 3D at once, each sphere named
for its mark; and the foundations John's own hand exposed — letters at any
size, an arrow that draws back on itself, a mark that fires only on what it
crosses, assessments that do not stick, every option in the field, readings
that stay on the canvas, a minimap (`SURFACE-v10-PLAN.md` §0). Before that
(v9 S1/S2/S7, 6 Sep):
**the surface is a system** — a model is asked only by a deliberate act;
one field at the pen tip reads what is typed and says what Enter will do;
core verbs in slots that never move; one bar with a control centre; light
and dark from one token set; every sentence in one of four places
(`SURFACE-v9-PLAN.md` §5–§6). Before that (v8, 3 Sep): **every package of
the v8 build plan has landed** — the canvas as a program with clocks, a
tank, verbs from words or from acting out, frames with a drawn slider, the
folder as the canvas with three backends, pictures in and the board out,
text as an element, and an installable shell — 550 core tests and a
144-step browser e2e. `ROADMAP.md` carries the honest gaps. Before v8:
**the MVP loop runs end to end.** Draw boxes on an infinite canvas,
circle them, cross with a command mark *you taught the system*, prompt them into
a living page that renders in the canvas with your ink still outlining its
divs — then draw on that page and the ink addresses the regions underneath it.
Scratch anything out to erase. `Demos/session-engine.html` is the surface;
`Demos/session-engine.e2e.js` drives 267 records through the real UI (266 checks and one honest skip, 25d, on 27 Sep; headless with the shard's three scenarios via `node e2e/run.mjs`, which CI runs): page, flowchart, handwriting (read only when asked; a line read as one), the model drawing, the user-side loop, selection and the field, corrections, the worker, the tank, words into verbs and acting out, frames and the drawn slider, the folder, pictures, text, the moment, a live room (and ids that hold in it: an undo sent, one sitting per page load, a doubled name and a truncated room said), a playing frame that takes the pointer, hold by long-press, the graph in 3D, and the foundations (letters at any size, a mark that crosses, readings that stay, the minimap), the explanation plane's layout, one Enter one act and what `fitAll` fits, labels (a hand's and a person's, on their own ink only), who made what, gestures per hand in a room, and a person the same across a reload. A run takes about 100 s; run it **in its own tab on its own origin** (`http://127.0.0.1:8010/…?fresh=1&nosw=1` — `__setup` refuses any other URL: it replaces `fetch` with a stub, joins a stub model named `e2e-stub`, and wipes the origin's saved board), start it with `__setup(); __scenario().then(r => window.__R = r)` and read `__R` when it lands.
v7 Stage E (handwriting) shipped 1 Sep 2026: a word written beside a shape is read by a
model that can see and offered as that shape's name. Whitepaper v5.1 stays parked until the
conversation benchmark passes end to end.

Architecture documents (chronological; **read MVP.md, then v7, then v6**):
- `MVP.md` — **the product definition**: infinite canvas, a learned command mark,
  drawings prompted into living code, and ink that addresses what's under it
- `KEYFRAMES.md` — **the three keyframes, built**: shape → diagram-shape →
  code, each a closed vocabulary; the mappings between them are tables
- `ARCHITECTURE-v7-PARTICIPANTS-AND-TIERS.md` — **active plan**: putting a model in the loop through the `propose` channel; the conversation benchmark; one OpenAI-compatible transport for Ollama/LM Studio/OpenRouter
- `ARCHITECTURE-v8-CANVAS-AS-CODE.md` — **the next paradigm, proposed**: the canvas as a program (the log is its source, simulation state is derived), a fourth rung of closed steering verbs, definitions and instances, time as events, nested artifacts with `js`/`json` code that ink can address, export as a folder. Worked example: the fish canvas rebuilt from primitives. Part II: the folder as the canvas (per-participant logs merged, the review canvas's storage seam and loading budget absorbed as ideas), three views, selection as the lasso that finished, frames literal and virtual, the blob palette, images and pastiche, deployment
- `SURFACE-v9-PLAN.md` — **the surface as a system, proposed 6 Sep 2026**: one field everything funnels through, a fixed palette geometry the hand can learn, a control centre instead of a rail, six components, code legible at every zoom, a scripts-that-run sandbox for a three.js frame, keys and secrets (D9), and multiplayer as a transport over the per-participant logs (D10)
- `SURFACE-v10-PLAN.md` — **the canvas reaches out, 14 Sep 2026**: an MCP
  server as a hand in a live room (D1), the frame that takes the pointer
  while it plays (D2), writing gathered by nearness (D3), questions as
  drawn candidates (D4), affordances at rest (D5), the map of what a
  drawing becomes (D6), the molecule chain as the demo (D7), ids per hand
  as a debt (D8); packages T1–T8 with status
- `SHARD-3D-PLAN.md` — **a bounded shard for 3D, proposed 15 Sep 2026**:
  ink on planes chosen by a gizmo or read; a form rung; solids as op
  trees; the diff as the brief; wrap and turn-into from your own
  definitions; packages P0–P11 with the MVP line after P6
- `NOTES-DRAWING-WITH-THE-HAND.md` — **what using it taught, 15 Sep 2026**:
  one figure drawn on a live board with the MCP hand — what the medium already
  does well, the six faults it cost (two logs under one name eating each other,
  a figure rendered as a page, a caption held at screen size, a figure that
  vanished on paper, eight filenames over one drawing, the answer card doing the
  caption's job) and the six still open, biggest first: **node ids do not
  survive the merge**, so `canvas_say` and `canvas_propose` land on the wrong
  marks in any room holding another hand's work
- `CONTROL-POINTS-PLAN.md` — **magnets and handles, 15 Sep 2026**: snap
  points the pen feels (P0–P1, built), control points that reshape (P2),
  bindings that follow (P3), the diagram-repair demo (P4); the binding
  contract is BIND-1's, one `bound-to` edge per endpoint
- `DIRECTOR-REVIEW-2026-09-15.md` — **the review, all nine packages landed
  16 Sep 2026**: QA-1, STATE-1, ACT-1, DATA-1, UI-1, GRAPH-1, BIND-1,
  SEAM-1, UI-2, each with its regression, its owner and its evidence
- `DIRECTOR-VIEW-2026-09-17.md` — **the director's view, 17 Sep 2026**:
  one engine, two surfaces, three doors, with the numbers on `master`; the
  15 Sep review reviewed (right on direction and discipline; it never
  reached ids per hand, audited with stubs only, left three items
  unpromoted); Jev as a *decision seat* behind an injectable transport, never
  a dependency, with five places it would fit in order of value; next steps
  — ids per hand (T8) first, then a review of use, a label primitive, the
  shard asking, the seat experiment, the paper's next figures
- `DIRECTOR-PLAN-W1.md` — **week 1's pre-flight, 20 Sep 2026**: units
  U1a–U8 (ids per hand, the relay's catch-up, the shard's pairing, a label,
  the shard asking, the decision seat, housekeeping, the next figures, the
  hand in the gate, a closing view), each with the command a machine runs to
  check it, the invariant it is most likely to bend and the trap; its checks
  are the ones week 2's L2 units were held to
- `DIAGRAM-REVISION-PLAN.md` — **the whitepaper plates' visible states, 17
  Sep 2026**: the handoff asking for every state of the seven plates at once
  on a desktop and one state in focus on a phone; built in
  `Assets/whitepaper-figures/` (`a449540`, on `master` since 26 Sep) though
  its header still says *proposed*
- `DIRECTOR-PLAN-W2.md` — **week 2, 26 Sep 2026**: what week 1's automated
  run left on `auto/w1` (not on `master`: U1a–U1c, U4 and half of U2 and U5
  integrated, the rest on attempt branches, the bundles drifted, two id
  defects reproduced), then the ladder — make week 1 whole (L1–L4), maths
  (M1–M5), the middle layer (J1–J3), the hand in the gate, a review of use —
  each unit with what it owns, its red-first test, its checks, invariant and
  trap, and the protocol and brief the Opus subagents run under
- `MATHS-PLAN.md` — **the canvas does maths, 26 Sep 2026**: what two pages
  of garment drafting and a right-triangle question ask of the medium;
  six rules (a number is a reading, labels rule the thing and the ink the
  topology, plural with the disagreement said, tier 1 does the arithmetic,
  units are the hand's, change flows and the ink stays); `src/maths/`
  (quantities, expressions, the sheet, figures, dimensions, solving); the
  middle layer as seats that judge — `decide` (Jev), `extract` (GLiNER2),
  `read` (numerals) — and the demo, *change the bust*
- `V1-PLAN.md` — **v1, the whole platform ready for true use, 26 Sep
  2026**: ten acceptance scenarios (flowchart, UML class, sequence, pattern,
  page and program, notes, two hands, boards, no model, pencil); the
  platform as layers — ink and the log, readings, the instant library,
  **tools** (one contract, a registry), **seats**, writers, and across them
  **context** (conceptual adjacency lifts, never hides; the top offer holds
  steady) and **library packs** (shipped pre-taught, used by an event,
  benched); diagrams as notations over the diagram rung with Mermaid out and
  in; handles, bindings that follow and ports by notation; maths as a tool;
  what daily use needs (boards, a versioned log, no lost work, budgets,
  first run, pencil, deploy); the ladder in eight phases, the units, how the
  agents run, and the release criteria
- `PERF.md` — **the performance baseline, 27 Sep 2026** (V1-PLAN R4a):
  the engine and the surface measured on generated boards of 500, 2,000 and
  5,000 marks, every number with its command, the hotspots ranked with
  file:line, and the budgets phase 0b holds itself to — with R4b's "after"
  column: the engine holds all three boards (2,000 replay in 0.24 s, a
  stroke in 0.15 ms, 12 MB), the surface is still as measured
- `SHARD-3D-PUSH-2.md` — **geometry from the drawing, G0–G5 all landed
  16 Sep 2026**: what John's first real use showed (a footprint and elevations
  from free views stood nothing, and a brief with nothing to fill was refused
  in one invisible sentence); every free stroke as a silhouette claim; the
  sketch hull as the massing generalised to any plane, in the volume its claims
  define; parts said in words; the brief a small model can answer; the shard's
  own MCP hand and Claude Code as the model seat; and the demo re-cut on John's
  own drawing. Each package carries a dated status line with the one finding it
  produced; §5 is what is still John's
- `BUILD-PLAN-v8.md` — **the executable plan for v8**: invariants no package may break, fixed contracts (events, reps, kinds, the verb basis, the storage seam, the palette item), fourteen work packages with owned files and done-criteria, the parallel threads and the surface weave, and self-contained briefs for sub-contracting models
- `WHITEPAPER-v5.1-PLAN.md` — **the package**: what the whitepaper shows vs. what the engine does, replays-as-figures, the demos as the paper's spine, the prose pass, and the palette decision John owns
- `ARCHITECTURE-v6-SESSION-ENGINE.md` — **active design**: the no-modes session engine (deferred commitment, summoning, promotion ladder, capability tiers), implemented in `metamedium-core/`
- `metamedium-core-schema.md` — graph data model ("everything is a node; type emerges from connections") — load-bearing via v6
- `ARCHITECTURE-v5-UNIFIED-ENGINE.md` — partly superseded by v6; still the reference for the deferred MoE-routing and embedding-space work
- `archive/PRD-v4-LLM-Grounded.md` — **archived**; still the spec for the tiered escalation (Tier 0 heuristics / Tier 1 light LLM / Tier 2 Claude) and the unbuilt MCP server

`EXPERIMENTS.md` covers the side tier (lens-canvas, v2-poc, vision/LLM PoCs,
the explainer video) and what each one feeds back into the platform.

## Repository Map

This table is the **single inventory of the repo** — README.md and ROADMAP.md
link here rather than keeping their own lists. Update it in the same commit as
any structural change.

### Platform (the project proper)

| Path | What it is |
|---|---|
| `metamedium-core/` | **The canonical engine** (TypeScript, zero deps, tested): geometry, recognition (the shape rung), relations, the diagram rung (`src/diagram/`), notations over it (`src/notations/`: the flowchart), concepts, the no-modes session engine, the layout and graph parsers, maths (`src/maths/`: quantities, expressions, the sheet, dimensions, solving figure by figure, true size and tiled print), the participants — a model's prompts and parsing, the router, the bridge, and **the decision seat** (`src/participants/decide.ts`, tier 1½; under *Tiered LLM Interpretation*) — and the LLM transport. New recognition/engine work lands HERE |
| `index.html` | **Interactive whitepaper v5** "MetaMedium: AI Beyond Chat" (live on GitHub Pages). Fully on the `brand/` system as of 3 Sept 2026 — its `:root` is `brand/tokens.css` under the names this page already used, so change a value THERE first |
| `brand/` | **The visual system, one home**: `tokens.css` holds every MetaMedium colour, face, size and figure/diagram token; `styleguide.html` is the living specimen (light paper first, IBM Plex Mono throughout, teal keyword, colour as signal, §11 figures and diagrams, §12 long-form furniture). v1 draft — the whitepaper's **figures** have migrated, the page around them has not; `brand/README.md` carries the four laws, the convergence order, and what applying it to the whitepaper taught the system |
| `doodle2-canvas.html` | **Flagship demo**: heuristic recognition, spatial graph, library, undo/redo, touch. No LLM. Single-file (~500KB) |
| `metadoodle1.html` | Fork of flagship + tiered LLM recognition (WebLLM in-browser, LM Studio local API) + voice. Single-file (~600KB) |
| `Web App Skeleton/` | React + Vite + TypeScript + Zustand rebuild; Claude API interpreter skeleton in `src/llm/`; recognition/spatial/matching in `src/core/` |
| `Demos/surface/` | **The reference surface's source**: `surface.css` and twenty-four script fragments (`00-core`, `00-ui` … `20-controls`, `21-minimap`, then `90-boot`, which must stay last), one concern each, concatenated in name order into one closure by `Demos/build-surface.mjs` → the committed `Demos/session-engine.js` (CI checks it has not drifted). Because they are one closure, the build and its `--check` refuse a name declared at the top of two fragments — the last would silently replace the first everywhere, which broke rendering once — reading the fragments as one strict block, so they must also compile as strict code (`Demos/build-surface.test.mjs`, in CI's `core` job). Fragments share the closure's variables — no imports; each fragment's header says what it provides and uses. Edit a fragment, run the build, commit both. **`09-field.js` is the exception that proves the rule** (SEAM-1): it names nothing outside itself, so the field's query is a pure function of a record and is unit-tested in Node with no browser — `node --test Demos/surface/09-field.test.mjs`, in CI's `core` job. A fragment's `.test.mjs` is not concatenated into the build |
| `Demos/` | **`session-engine.html` is the MVP surface** (it links `surface/surface.css` and loads `session-engine.js`) — infinite canvas, the taught command mark, living artifacts in a DOM overlay, ink-over-artifact addressing, "why" inspector, model participants, canvas answers. Uses the committed `metamedium-core.browser.js` bundle. **`session-engine.e2e.js`** drives the whole loop through the real UI with a stubbed model (browser console; not part of `npm test`). `build-standalone.mjs` inlines the bundle into a single shareable file. **`mcp.mjs`** is the MCP hand (Claude Code's way onto the board; `.mcp.json` at the root registers it), over `relay.mjs` and `live-node.mjs`, with `ink-png.mjs` for the ink as a picture and `mcp-smoke.mjs` as its stdio test; `metamedium-core.node.mjs` is the committed Node bundle it runs (`npm run build:node`, drift-checked in CI like the browser bundle). **`relay.test.mjs`** is the relay's own test (`node --test Demos/relay.test.mjs`, in CI's `core` job): the catch-up as a pure function, and, over a real relay on a free port, the truncation line and three hands with one departed. `Demos/programs/` holds `run` programs written for the canvas (`metamedium-explained.run.js`: the loop told as a program, ending on a real measurement of the viewer's own stroke). Plus fish, composition diagrams, no-modes graph, etc. |
| `skills/` | Claude Code skills: `metamedium-code` (code patterns), `metamedium-design` (design principles) |
| `Assets/` | Figures and design rationale (recognition strategy, point-primitive proposal), and the social card. `make-card.mjs` regenerates that card from index.html's own hero — synthetic pointer input, so the picture shows the engine really reading a mark; `node Assets/make-card.mjs`. Change the picture and you must change the FILENAME and the four og:/twitter: tags in `index.html` and `404.html`, because scrapers cache by URL. **`Assets/whitepaper-figures/`** is the whitepaper's seven graphic plates: `build.py` holds their content and geometry and emits the static blocks `index.html` carries between `whitepaper-plate:KEY` markers (`--check` says they are in sync), `figures.css` and `figures.js` style and enhance them with no build, and `e2e/whitepaper-figures.mjs` audits the real page; its README is the workflow |
| `archive/` | Retired versions and superseded plans, incl. whitepaper v4 (root `MetaMedium_Whitepaper_v4.html` is a redirect stub — keep it) and PRDs v3.2/v4 |
| `e2e/` | **The browser gate** (`DIRECTOR-REVIEW-2026-09-15.md`, QA-1): `node e2e/run.mjs` starts its own servers on free ports (a static one over the repo root, vite over `shard-3d`), opens a **fresh browser context per scenario**, loads the harnesses that already exist — `Demos/session-engine.e2e.js` (`__setup` + `__scenario`) and `shard-3d/e2e.js` (`__scenario`, `__demo`, `__demo2`) — and awaits the result object each one returns. It does not reimplement them. **Four scenarios** on Chromium (`canvas`, `shard`, `demo`, `demo2`): 406 passing records and the one honest skip as of 27 Sep 2026 (canvas 260, shard 123 + 11 + 12), in about 135 s. A fifth, **`smoke`**, is opt-in and runs on WebKit (`node e2e/run.mjs --browser webkit smoke`, CI's `webkit` job): the board loads, ink drawn with real pointer input is read back, press-and-hold opens the field and one pill is taken — four checks in `run.mjs` itself, a WebKit smoke and not an iPhone test. Pass, fail and **skip** are counted separately (a record whose name says it skipped is a skip); a failed assertion, a harness exception, an attempted request to a real model, or a page error not on the named allowlist in `guards.mjs` each exit nonzero, with structured JSON and a screenshot in `e2e/results/`. Beside the gate, on its static server and never run by it or by CI: `e2e/perf.mjs` (the surface's half of `PERF.md`, numbers only) and `e2e/whitepaper-figures.mjs` (the plates' audit, Chromium and WebKit). `e2e/README.md` has the rest |
| `PERF.md`, `metamedium-core/bench/`, `e2e/perf.mjs` | **The performance baseline** (V1-PLAN §9 R4a, 27 Sep 2026): `bench/board.mjs` draws deterministic boards of 500, 2,000 and 5,000 marks from a seed (the generator is kept, never the boards); `bench/engine.mjs` times replay, memory, relations, the whole-board read, one more stroke, a live room's incoming line and a newcomer's hello; `e2e/perf.mjs`, beside the gate and on its servers and model guard, times the surface — open, pan, draw, release → reading drawn — in Chromium and WebKit; `bench/profile.mjs` reads a CPU profile back to `src/…:line` and the surface's fragments; `bench/report.mjs` prints `PERF.md`'s tables from the results. `PERF.md` has the answer (500 marks usable, 2,000 not, 5,000 does not open), every number with its command, the hotspots ranked with file:line, and budgets for R4b — and, after R4b, the engine's numbers beside them. **R4b added** `bench/budgets.test.mjs` (`node --test`: the engine's budgets on the generated 2,000-mark board — replay ≤ 0.5 s, a stroke ≤ 4 / 16 ms, ≤ 150 MB — and the 5,000 board replays; each size in a process of its own, every run's numbers recorded in `dist/bench`) and `bench/equivalence.mjs` (every held log, a scripted log of the rarer acts and the 500-mark board replayed by the old engine — a committed bundle at `--ref` — and by `src/`, every reading and id compared, and what differs said). Not in `npm test` (`vitest.config.mjs` keeps `bench/` out) or the gate |
| `.github/workflows/ci.yml` | CI, on every push/PR: typecheck + test + build for `metamedium-core` — with the drift check for both committed bundles, the MCP hand's smoke, the surface's drift check and its build's test, and the field reader's and the relay's Node tests — `shard-3d` (with its MCP hand's smoke) and `Web App Skeleton` (with lint); the **browser gate** (`e2e/run.mjs` on Chromium); and the **WebKit smoke** in a job of its own. Both browser jobs upload `e2e/results` when they fail |

### Experiments (subordinate tier — see `EXPERIMENTS.md`)

Cheap, forked, allowed to re-implement. They de-risk platform bets; they are
not the product. Each entry's rationale and what it feeds back lives in
`EXPERIMENTS.md`.

| Path | What it probes |
|---|---|
| `lens-canvas/` | Infinite canvas, `LensNode` graph, confidence-scored lens routing — a running prototype of the deferred MoE router and the "type emerges from connections" model. Vite + vitest (19 tests). **Not in CI** |
| `v2-poc/` | Drawing-responsive text reflow (chenglou/pretext) — the figure Whitepaper v5.1 is built around. `src/main.ts` + committed `bundle.js` |
| `test-vision.html` | VLM path (Qwen3.5): image-in instead of structured-geometry-in. The control case for the grounded-not-pixels commitment |
| `test-llm.html` | Standalone LLM harness |
| `manim-explainer/` | ~50s explainer video. Source + stills tracked; renders and `media/` cache gitignored (regenerate from the scripts) |
| `playground.html` | Personal sandbox on the personal-site design language |
| `shard-3d/` | **Live · the plan's MVP line (P0–P6) + the compass + the review's four shard packages + push 2 (G0–G5)** — a bounded MetaMedium for making things in space: ink on a plane read by the shape rung in that plane's own units, a form rung, solids as **op trees in the log** (the tree is the source, the mesh is derived), the diff as the brief, definitions and placements. **Push 2 is geometry from the drawing** (`SHARD-3D-PUSH-2.md`): the board goes out and comes back as its own core-format log; every free stroke is a **silhouette claim**, so a footprint plus ⊓ drawn from wherever the hand stood stands a **hull** at tier 1, in the volume its claims define; the hull is cut into **parts** with ids and a sentence each; the brief a small model can answer is 1048 characters and its reply names parts by id and never writes geometry; and `shard-3d/mcp.mjs` is the shard's own MCP hand **and the model seat** — Claude Code answers the parked brief and the shard applies it as it would a model's (`.mcp.json`, `metamedium-3d`). **`shard-3d/README.md` is the single source** for how it works, what it does not do, what core would need, and the fixtures; don't restate it here. `npm install && npm run dev` in `shard-3d/` (vite on :5174); `?demo=castle` runs the whole loop on John's own drawing at boot and `?fixture=<name>` loads a board from `shard-3d/fixtures/`; `npm test` is vitest on the pure rungs (605 in 31 files on 27 Sep); the engine is imported from source, so there is no bundle to drift |
| `gliner-seat/` | **Parked with its answer, *not yet* (J2, 26 Sep 2026)** — can GLiNER2 be the middle layer's `extract` seat? It runs where MetaMedium runs: the one-graph ONNX export of `fastino/gliner2-multi-v1` (Apache-2.0) with a JS port of the library's processor, token-identical to the Python original; a line of a pattern page in 24 ms in a Chromium page on WebGPU, 55 ms in WebKit, 23 ms in a Node process. But it misses the names a seat would add (measurement names 7/11 at best, part names 6/9, operators 8/26), and a page pays 614 MB and ~2.2 GB of memory. `transport.mjs` is the seat's seam, shaped like `DecideTransport`, with a fake; `node --test gliner-seat/*.test.mjs` needs no model. `gliner-seat/README.md` has the numbers, the commands and what a later unit would need. Weights, venv and caches are never committed (`node fetch.mjs`). **Not in CI** |

**Known duplication:** recognition logic still exists independently in
`doodle2-canvas.html`, `metadoodle1.html`, `Web App Skeleton/src/core/`, and
`v2-poc/bundle.js`. As of June 2026, **`metamedium-core/` is the canonical
source** (geometry/recognition ported from the Web App Skeleton with
behavior-identical tests). Land improvements in core; the legacy copies
converge onto it per ROADMAP.md and should not receive new logic.

## Architecture

### Core Data Model

Strokes are arrays of points; a parallel `context` array records what each
stroke is recognized as. Unnamed strokes use placeholder `'art[n]'`.

```javascript
strokes = [[{x, y}, ...], ...]   // raw input (some demos add t, pressure)
context = ['circle', 'line']     // 1:1 with strokes
```

The library stores named items: user primitives (with fingerprints), and
compositions (with components + spatial graph). `basedOn` references make the
library hierarchical.

### Recognition Engine

> **Source of truth: `metamedium-core/src/recognition.ts` and
> `src/geometry.ts`, with `*.test.ts` beside them.** Exact thresholds are
> deliberately *not* restated here — they used to be, in ten documents, and
> they drifted. Read the code for values; read this for shape. The reasoning
> behind the rules is in `Assets/recognition-strategy.md`.

A stroke is reduced to a **fingerprint** — aspect ratio, straightness, closure,
corner count and angles, **extent**, bounds, size — and detectors read that
fingerprint.

Two properties matter more than any individual number:

**Multi-parse, not winner-take-all.** Every detector that qualifies contributes
a candidate; results are returned ranked by confidence, and nothing wins by
silencing the others (ARCHITECTURE-v6 principle 2). A pentagon is legitimately
*rectangle* and *circle* at once — the caller decides. Detectors today: line,
arc, triangle, rectangle, circle. Each result carries a grounded `reasoning`
string, which is what the "why" inspector surfaces.

**Confidence is measured, never assigned.** Each detector scores continuously
from the evidence, and results rank by that score. The detectors used to carry
fixed confidences with overlapping corner bands, so a 3-corner shape matched
both triangle (0.85) and rectangle (0.80) and the triangle won because 85 > 80.
A tie broken by a constant is not a ranking. **Tier 0 is also capped below
certainty** (`MAX_TIER0_CONFIDENCE`): a flawless circle is exactly what a
letter O looks like, and the cap leaves headroom for a participant with more
context to outrank the engine.

**`extent` — the fraction of its own bounding box a stroke's outline encloses —
is the strongest single discriminator.** Rectangle ~1.0, circle ~0.79, triangle
~0.5. Corner count is fragile (miss one corner and a box becomes a triangle);
extent holds regardless. This is what fixed "rectangles read as triangles".
**The box is the tightest one at any angle** (rotating calipers over the
hull, `tightestBox`), not the axis-aligned bounds: against those, a box tilted ten degrees
filled ~80% and lost its snap offer, and at fifteen read half as a triangle.
A hand rarely draws square to the screen. The same box is a rectangle's clean
form (below), so a diamond — a square turned 45° — is read and redrawn as one.

**An arc is known by its bow, not its straightness** (S1, `bowOf` in
geometry.ts, `evenBowOf` in recognition.ts). Straightness — chord over path
— is nearly blind to a bow: a 90° arc still scores 0.90 and a 30° one 0.99,
so every arc under a half circle read as a line (a 140° arc was *line 0.63*).
The bulge off the chord is not: it means a sweep (4·atan(2·bulge/chord)). A
stroke **bows evenly** when it sweeps like an arc, its bulge is past what a
hand's straight line bows **on screen** (a fixed-pixel rule about the hand,
so it takes the scale), each half bows off its own chord as an arc's halves
do (a bend's straight arms do not), it stays near the circle through its
ends and bulge (a hook, a J, an S do not), and it turns no corners. That
evidence lifts the arc and **the line gives way exactly as far**; measured
on the denoised path, so a slow, wobbly straight line stays a line. The
constants are `ARC_SWEEP`, `ARC_BULGE_PX`, `ARC_EVEN`, `ARC_RESIDUAL`.

**The shape rung is closed: eight entries.** `line`, `arc`, `triangle`,
`rectangle`, `circle`, and — because the rung above cannot do without them —
`arrow` (a straight shaft with a barb that **draws back on it** — a wing
turning past ninety degrees and at least a sixteenth of the stroke long;
the hook a pen leaves at liftoff is neither, and used to make every tall
*l* an arrow 0.6 — v10 F2 — and a barb **short against its shaft**, its
reach from the tip over the shaft's length, or a flick in the hand's space
whatever the shaft: an L is two arms, and each L of a box drawn in two
strokes used to be *arrow 0.59*. Its length, never its angle, is the
discriminator — S1, `BARB_OF_SHAFT`, `BARB_FLICK_PX` — and the reading says
it: *the barb 0.13 of the shaft*),
`text` (writing, *without reading it*: open, turns many times, low and wide,
mostly-empty box — enough to make a mark a `label`), and `dot`. **Below the
hand's resolution (`HAND_RESOLUTION_PX`) only `dot` is offered**: a 5px blob has
no measurable geometry, and reporting "circle 0.85" for it would be sensor noise
dressed as evidence. A detector may return `meta` beyond its label — an arrow's
tip, tail and barb — which the session keeps as a `reading:<type>` rep so the rungs
above can read direction as a fact.

**Size-relative closure** (key innovation): a stroke closes if the start–end
gap is under a fixed pixel threshold **or** under a fraction of the stroke's
size — small shapes need tight closure, large shapes tolerate bigger gaps. The
same size-relative logic guards overshoot detection, so short strokes don't all
read as circles. Both live in `isStrokeClosed` / `checkOvershoot`.

**The fixed term is bounded by the stroke's own size**, or it inverts the rule
above at the small end: an unbounded `gap < 50px` called a 45px-wide caret with
45px between its ends *closed*, which is what broke the learned command mark.

**Everything is measured along the PATH, not along the point array.** Corner
detection resamples to uniform arc length, wraps closed strokes so the seam is
scanned, and suppresses neighbours in arc-length space. In index space the same
rectangle returned 1, 2 or 3 corners purely as a function of drawing speed, and
never 4 — a corner where the stroke starts and ends was structurally invisible,
which is exactly what you get drawing a box from a corner. Same principle in
`calculateStraightness`, which measures on a **denoised, simplified** path:
raw path length grows with the device's report rate, so a straight line with
realistic ±1px sensor noise scored 0.99 slowly and 0.30 quickly, and read as an
arc. `denoise()` sizes its filter in arc length, so it removes the same physical
wobble at any sample rate.

**Fixed pixel thresholds are about the HAND, not the world.** On an infinite
canvas the surface feeds world coordinates (so the grammar survives zoom), and
that silently makes every fixed-pixel rule zoom-dependent — the same check reads
open at 1× and closed at 1.7×. `getFingerprint(points, scale)` and
`analyzeStroke(points, scale)` take world-units-per-screen-pixel (1/zoom), and
the scale is logged with each stroke so replay is deterministic. **Surfaces with
a viewport must pass it.** See MVP.md §7.

**Corner suppression is bounded by the stroke's short side.** Non-maximum
suppression along the path uses a fixed fraction of its length, and on a 5:1
banner each short side is 8% of the perimeter — a wider window ate one corner
at each end, and the most common box in any interface came back with two
corners and a rectangle score in the 0.6s. `countCorners` caps the window at a
fraction of the short side, so it can never straddle a whole one.

**Library matching** is a weighted fingerprint comparison (straightness,
aspect, corners, closure, size) with a straightness veto — see
`matchPrimitiveFromLibrary`.

**A named group's signature is structural** (`session/signature.ts`): the
bag of shapes *and* the bag of links between them — every engaging relation
the canvas can see, keyed by the shapes at each end — so a circle with two
lines inside it and a circle with two lines crossing it are different things
to name, which a histogram could not tell apart. Matches rank plurally above
a floor with their reasoning; the `correct` event (*Not a …* in the palette)
adds a group's signature to the definition's rejected or accepted examples, so
a wrong match is corrected once and stays corrected. The engine never learns
what a definition is called.

### The maths of a mark

> `metamedium-core/src/session/measure.ts` — `measure(node, nodes, board?)`, `describeMaths`.

What follows from a reading, as numbers: a circle's centre, radius,
circumference and area; a rectangle's sides, perimeter and area; a line's
length and heading; an arrow's direction; a triangle's angles (acute / right /
obtuse) and sides; an arc's radius and sweep. Measured from the clean form the
mark carries or would be offered, so it is the maths of the *shape*, not of the
wobble. It is arithmetic on a reading, not a reading — no confidence and no
candidates — and writing has none. The inspector shows it as *the maths*; it is
the one thing the 2025 prototype did that the engine had dropped.

**Maths on a page** (`metamedium-core/src/maths/`; `MATHS-PLAN.md`, units M1
and M2 of `DIRECTOR-PLAN-W2.md`). `quantity.ts` holds a number as the hand
writes it — a value or a range, a unit or none, exact or approximate — with
interval arithmetic that converts units and says so. `expr.ts` is a grammar
written by hand, no `eval`, in which **a handwritten `=` chain is a running
total, not an equation** (`A ÷ 3 = 12 + 2 = 14`: A ÷ 3 is 12, then 12 + 2 is
14), a chain may restate its formula with the numbers put in (`① ÷ 2 = 14 ÷
2 = 7`), and a line that reads two ways returns both, ranked with reasons — a
dash between numbers as a range or a minus, precedence or left to right —
settled by a worked line that has one's form. `sheet.ts` reads plain lines as
definitions, steps, headings (an *Add …* heading is an allowance, read both
ways), labels and checks; it is a pure function of its lines, so a changed
measurement re-derives exactly what depends on it (`diffSheets`), and
`gather.ts` collects the lines from text artifacts and read writing without
touching the session. Tier 1: no model computes a number.

**Dimensions and solving** (M3a, M4). `maths/dimension.ts` offers a number
beside a mark as one of its measures, ranked by its distance to a side's
middle *relative to the side's length* and by how squarely it sits across,
with the reason and the runner-up; a number inside a closed mark is a piece
label, a small square in a corner declares it right, a short line under a
number that reaches nothing is its underline, and `sheetLines` leaves every
number on a mark out of the page (`maths/writing.ts` reads the board's words
once for both). The **figure** the solver works on — corners, sides and the
marks that drew them — is filled by one closed stroke (`figureOfMark`) and,
for lines meeting, by `polygonFigure`. Each drawing gets a unit (its labels',
else the page's) and a scale that says how consistently its labels agree
with the ink (`TO_SCALE_WITHIN`). `maths/solve.ts` works **one figure at a
time, in closed form** — triangle, rectangle, circle, arc, parts summing to
their whole — every derived value with its formula, and **an
over-determined figure keeps every consistent reading and says what cannot
hold and by how much** (*labelled 24; legs of 24 and 8 make it 25.30, 1.30
longer (5%)*). A declared square is never dropped; a corner the ink measures
right is only a reading (`RIGHT_ANGLE_TOLERANCE` in `measure.ts`); what the
labels leave open is offered at the scale as the ink's. `solveBoard(state)`
does the board (and checks a step's value on an edge with `checkWritten`);
`measure(node, nodes, board)` speaks the drawing's unit for a mark with
labels and is unchanged for one without.

**True size and print** (M7). `maths/truesize.ts` draws solved figures at
their real size as **a new SVG built from the numbers, never from the ink**
— the root in paper units (`width="24.5in"`), the viewBox in the drawing's
unit, each figure from the solver's first reading squared to the page,
labels as written and a derived length a place finer than they were
written — and `maths/print.ts` tiles it onto Letter or A4 at 100%, with
overlap and ⊕ marks both neighbours print, grid labels, a map, and **a
measured test square (1 in, or 2 cm) on every page**, because a printer
scales without saying so.

### Clean forms: a confident reading, redrawn

> `metamedium-core/src/session/clean.ts` — `snapReading`, `idealize`,
> `session.snap()`, `session.snapCandidates()`.

The shape rung says "rectangle 0.86"; the canvas can draw that rectangle. A
snapped mark gains a `'clean'` rep beside its ink — the same shape as tidy's
`'transform'` — and the surface draws the clean form in front with the hand's
ink faint beneath it. **Ink is never replaced**; undo drops the rep. Three rules:

- **Confident AND unambiguous.** `SNAP_CONFIDENCE` floors the top Tier 0
  reading and `SNAP_MARGIN` requires it to lead the next; a pentagon that is
  rectangle 0.44 / circle 0.43 is never redrawn as either, because that would
  silently settle an argument the engine deliberately holds open. Only the
  engine's own reading counts — a model calling a box "a card" is a claim about
  meaning, not geometry.
- **Built from the ink's own measurements**, never a template: the three
  sharpest corners, the arrow's tip, tail and barb, the arc's bulge. A slight
  oval stays an oval. `text` has no clean form — handwriting redrawn as a box
  is a lie about what was written.
- **A box keeps its angle** (S1): its clean form is its tightest box at any
  angle, so a diamond is redrawn as a diamond — as its upright bounds it was
  a flowchart's decision turned into a process. Square to the screen within
  the hand's wobble (`SQUARE_UP_DEG`) it is squared up to the bounds the ink
  fills, exactly as before, when those hold it tightly (`BOUNDS_SLACK`), and
  at its own size when they would grow it. **A bend is not a line**: a line
  is offered only when its ink stands off the straight line through its ends
  no further than a hand's line bows — half of a two-stroke diamond,
  straightened, made the decision a triangle. **An arrow keeps its barb**,
  at most a fifth of its shaft, so its clean form reads back as an arrow.
- **Zero wrong snaps over the whole corpus** is pinned in `clean.bench.test.ts`,
  alongside ≥95% offered for every drawable shape and 0% for writing — and,
  since S1, turned boxes (every one drawn clean at its own angle), arcs of
  30°–300°, and **every clean form, drawn again as ink, reads as the shape it
  cleans**. The flowchart bench draws every board clean and reads it again:
  every decision stays a decision.

In the surface the offer is a dashed ghost under a qualifying mark **for a
moment, not forever** (v10 F4): the mark just drawn, for a few seconds,
and whatever is hovered or held — the offer itself stands in the snap tile
and the panel, the dashes do not stick to every mark that reads clean. The
rail's *Snap N* button, the palette's *Draw them clean* (Tier 0, and the
summon stays open so the next offer is taken from the cleaned marks) and
the inspector's *draw it clean* take it up. `snap · offer / auto / off` is a device preference;
*auto* takes the offer as you draw, never for a stroke the grammar is still
deciding about. A held lasso is never offered.

### Gestures: taught, and relational

**The command mark is a check ✓** — down to a sharp elbow, then a longer flick
up — drawn across a circled group. It is *defined*, by eight scale-free
measurements, and `BUILTIN_COMMAND_MARK` is **not a special case in the code**:
it is a signature learned from canonical samples by `learnCommandMark`, exactly
the way your own mark is learned when you draw it five times. One mechanism,
shipped pre-taught. `session.teachCommandMark(mark, at)` replaces it as an
event, so it replays with the session.

Why a check: it already means "yes, do this"; its elbow is sharp and its arms
are asymmetric (~1:1.6), unlike anything in the canvas's vocabulary; and it is
**oriented** — the elbow sits low and the stroke ends high.

**A taught mark is held on the device** (`localStorage`, with the five samples
it learned from) and re-taught into the session at boot as a `teach` event, so
it replays like any other. Opening the pane with a mark held shows those five
samples and offers *Forget*; teaching a new one means *Clear* first. **A mark
is its hand's** (V1-PLAN L2h): a `teach` sets the mark of the hand that
taught it, and judges only that hand's strokes. Opening a board re-teaches
the device's mark unless this hand's own log (the events with no `by`)
already teaches one — another hand's teach says nothing about it — and the
re-taught mark is this hand's, sent with its log (`openStore` in
`17-folder.js`; a room's first merge used to drop it, e2e 46).

- Features are **scale-free** (ratios, counts, and positions within the stroke's
  own box), so a mark works at any size and any zoom. Three are oriented.
- **Rejection is tested harder than recognition.** The earlier rule (open, 1–2
  corners, smaller than the lasso) fired on an L, a backwards L, a V, a caret,
  and a check drawn backwards. `commandmark.bench.test.ts` pins 100% acceptance
  of hand-drawn checks and **zero** false fires across the drawing corpus.
- Tolerance floors are the *designed* generosity; a learned spread only widens
  them. The straightness floor is the widest and was measured, not guessed.
- One engagement rule for every mark: it must **cross the selection, overlap it,
  or come close relative to the selection's own size** (`checkProximityRatio`).
  No fixed pixel term remains in the gesture grammar.

**The field: one input, one reader, three rows in fixed slots** (v9 S2,
`SURFACE-v9-PLAN.md` §6). Taking a loop up dissolves it into a selection — a
dashed outline with corner handles and a knob; drag inside moves, a corner
scales, the knob turns, one event per drag, the ink untouched — and **the
field** opens at the pen tip, fanning to the hand's side (a tile flips it).
Everything typed there goes through one reader, `readField`, which returns
*what Enter will do* and shows it under the text as it is typed: a verb the
selection has (`erase`, `dup`, `clean`, `line up`, `play`, `frame`, `read`,
`what` …, by label or alias), a name the library knows (reused, no model
asked), words the verb table reads at a definition, a prefix (`name:`,
`label:`, `ask:`, `draw:`, `page:`, `run:`, `new:`, `what:`), or else the
brief. Under
the field, laid out as John sketched it (6 Sep): the **core** — four round
buttons at the left, Name · Copy · Paste · Erase, always the same four in
the same slots (a circle with a mark in it; the name is the tooltip and the
reading line while the pointer rests on one); then, stacked to their right,
**what this is** — readings with their numbers (*molecule 0.92*, *“Pricing”
0.92*, *page-layout 0.78 · GLM*, *row 0.81*), and tapping one takes it as
the name; and **what it affords** — Draw them clean, Line up, Frame these,
Play A, Not a molecule …, ranked by the reading and by use, the rest a
keystroke away. A word typed, or writing read, is offered two ways side by
side — *Name it* and *Label it* (see *A label*, below). A pill carries a
label; its reason is the tooltip; a pill that asks a model carries a dot.
Copy holds the
ink (and puts it on the clipboard as SVG); Paste puts it beside the selection
or, from the keyboard, at the pen. A tap while the field or a selection is up
dismisses it and is never a dot. `Demos/surface/05-selection.js`,
`09-palette.js`.

**The reader decides; it no longer acts** (SEAM-1, `Demos/surface/09-field.js`).
What Enter will do is a pure function — `readFieldCommand(ctx)` — of a
**`FieldContext`** record (the text, whether a summon stands and whether it is
over a live artifact, the offers as labels and aliases, the joined models by
name, what the library holds, the definition in the loop and what the verb table
read in the words, whose ink is held — `marks`, how many of the held marks the
person made and who made each of the rest — and a thunk for the drawing's genre)
returning a **`FieldReading`** (`kind`, the `line` shown under the field,
`quiet`, and a **named command** — `take` · `name` · `label` · `ask-what` ·
`ask` · `draw` · `build` · `library` · `behave` · `need-model`). Beside it,
`typedWord(ctx)` is as pure: the word a typed text offers to name or label with,
or null. `09-palette.js` is the adapter on both
sides: `fieldContext` gathers, `runFieldCommand` performs, and `readField` keeps
its old shape so nothing else changed. The point is that the field's query can
now be asked questions in Node with no browser, no DOM and no session —
`node --test Demos/surface/09-field.test.mjs`, in CI's `core` job. The genre is
a thunk because reading it costs a pass over the marks and most keystrokes
settle on a verb or a name long before the brief.

**One Enter, one act** (V1-PLAN L2d; `alreadyUnderWay` in `09-palette.js`). A
brief is a deliberate act on one summon, and a summon is acted on once: the
reading's `run` is a closure over the summon, so a pill, a touch or a second
key still held it after the first act had consumed it — on a fresh loop the
second failed at the bless and said *could not hold that group*; on a
revision, with no bless to fail at, it asked every model again. So `runPrompt`
— the one door every brief, program and library reuse comes through — refuses
a second act on the same summon and says *that brief is already under way*. A
guard in the adapter, not the reader: `09-field.js` decides what Enter will
do and is never asked whether it already did. It holds one key (the summon's
id, time and marks, so a counter id reused by a fresh board is a new act) and
lets go when the act is given up on — a failed bless, a failed brief whose
bless was undone. e2e 40 sends two Enters 80 ms apart with the stub delayed.

**A loop that waits is plain ink.** Circle some marks and nothing lights
up: the loop stays ink until the command mark crosses it — **or a
double-tap lands inside it** (`summonHeld`; the way in that needs no mark,
for a hand that finds the check hard to draw apart from an arrow) — and
then it is a gesture: its ink leaves in favour of the selection outline and
handles, and the offers open. (It used to raise a chip beside itself the moment it was
drawn, *N circled · Draw them clean / What could these be?* — an affordance
that fired on every circle whether or not one was meant, and John called it
what it was: a leftover.) The control centre's *snap* tile quietly scopes to
the circled marks while a loop waits, and in `auto` every open offer is taken
after each stroke — including a closed stroke that was a loop-in-waiting
until the next stroke settled it, which the per-stroke version silently
skipped. `session.summonHeld` remains for surfaces that need a button.

**The mark reads BACKWARDS.** Requiring a lasso before the mark can act is a
mode wearing a different hat. The command mark looks back over
`recentWindowMs`: the marks it crossed are what you pointed at, and anything
drawn alongside them just now comes with it. An explicit circle still wins, and
`Summon.scopeSource` (`lasso` / `crossed` / `recent`) plus `scopeReasoning` say
which way it decided, so a wrong guess is visible before you act on it.
**What the mark engages, with no loop** (v10 F3): a mark it crosses; a
*closed* mark — a box, a loop, an artifact's frame, a thing you point at —
it lands inside or close beside, relative to that mark's size; never an
open stroke it merely sits near, because that is every letter of a word
being written, and a letter shaped like the mark summoned the word
mid-sentence. **A taught mark's band widens at most two-and-a-half
floors** (`MAX_WIDEN`): five samples that disagree learned a band so wide
the mark fired on ordinary writing; the teach pane warns below a
consistency of 0.5.

**Gestures are per hand** (V1-PLAN L2h; `handOf` and `Gestures` in
`session.ts`, `session/gesture-hands.test.ts`, e2e 45–46). A loop that
waits, a summon, the selection, why the last stroke missed, the taught
mark and the look-back are each **one hand's**, held under the key its
acts carry — `handOf`, the attribution a bless's maker gets: a person's
act is theirs ("local" in another hand's log already reads as that hand),
and a model's or the engine's is the act of the hand whose log holds it,
so the shard's bless in the engine's name takes up its hand's summon and
a model's loop waits for its hand. Every board keys one hand alike. So a
hand's own next stroke dissolves its summon, and another hand's never
does; its loop waits for its own check or double-tap whatever another
hand draws meanwhile; the look-back grows the scope through its own
recent marks only (what the mark *crosses* may be anyone's); another
hand's loop, summon, selection or dismissal never opens, closes or
changes the reader's. A mark that is erased leaves every hand's gestures,
whoever erased it. The board's `summon`, `selection`, `pendingLassoId`,
`markMiss`, `commandMark` and `recentIds` are its reader's own. **A hand is
a sitting, not a person** (L2i): two tabs of one person draw independently,
so his stroke in one never dissolves his field in the other, and a loop
waiting in one waits for that tab's own check — though either may label
what the other drew (*Live logs*). Two hands
may now hold the same marks at once, and when both bless, each thing
takes them — a mark can be part of two (the same on every board; which
should win is not yet decided).

**Erasing is relational, not gestural** (`src/session/erase.ts`): count
crossings between the stroke and the target's own outline; three erases it. No
speed, density, or size constant to tune, zoom-invariant, and it degrades
honestly — a line drawn *through* a shape crosses twice and is safe. Two rules
keep it safe: a **closed** stroke is never a scratch (it is a lasso), and
scratch targets are **ink**, never artifacts. The surface says when a
scratch was one pass short (*crossed it twice — one more pass erases it*),
so the rule is learned by doing.

### Magnets and bindings: the pen feels where a mark offers attachment

> `metamedium-core/src/session/magnets.ts` (sites, `magnetRadius`, the
> binding queries), `bind.test.ts`; `Demos/surface/05-snap.js`, `07-input.js`.

**Sites are derived, never stored**: a line's ends and middle, a box's
corners, edge-middles and centre, a circle's centre and cardinals, a
triangle's corners and centroid, an arrow's tip and tail — arithmetic on
the clean form a mark carries or would be offered, so replay is
deterministic; unread ink offers its bounds, never a pretended shape.
Radii are about the hand (`magnetRadius(sizePx, scale)`). While a
connector is drawn its end shows the nearest site in reach as a ghost
ring; releasing inside lands the endpoint on the site and logs `bind`.
**A magnet is an offer, not a trap**: the hand can push through it, and
drawing past dissolves it. Binding is for connectors (line, arrow, arc); a
stroke matching the active command mark is never pulled, and a
letter-sized stroke is writing.

**One `bound-to` edge per endpoint** (BIND-1): an edge is one claim with
one reason, and two endpoints are two claims — a single edge could only
state one of them, which was the bug. The edge carries `end` and `site`,
the `bound` rep beside it carries the same, removal is keyed by `end`, and
`bindingsOf` / `boundRepsOf` agree. **Erasing a target keeps the claim**:
the edge and rep stay, `active: false`; `activeBindingsOf` never returns a
tombstoned target, and undo of the erase makes it an anchor again, because
state is a pure function of the log. P1-era logs replay into this
representation unchanged. P3, bindings that follow, builds on it.

**Ports by notation, heads, and figures of several strokes** (V1-PLAN E3;
`session/ports.ts`, `diagram/heads.ts`, `diagram/figures.ts`). A notation that
reads a mark as one of its symbols registers (`registerPorts`) and offers that
symbol's ports — a point, or a segment or outline where the nearest point is
the port — after the mark's own sites, through the same `magnetSites` /
`nearestMagnet` / `magnetsNear` the pen asks, so the surface feels them
unchanged. A place along a port binds as `along:<notation>`, its index its
share of the port, and `siteOf` finds any bound site again where it stands
now; with no notation registered every query equals a golden captured before
the hook (`src/test/magnets.golden.ts`). `headsOf` reads what sits at each end
of a line, an arrow or an arc — the arrow's own barb, a small triangle, diamond
or circle touching the end on its axis, a separate chevron, a fill — hollow or
filled, filled measured as ink coverage of the head's own inside, so a fast
hatch and a head three times the size read alike; writing at an end is a
label, not a head. `figuresOf` reads ruled strokes whose ends meet — tied by a
magnet, or touching within the magnet radius — as one figure: a triangle, a
quadrilateral (a diamond, said as one turned about 45°; a rectangle when its
corners read right), a polygon. Each side keeps the marks it was drawn with,
and each figure is the maths lane's own (`polygonFigure`), so
`solveBoard(state, { figures: figuresOf(state) })` solves a triangle ruled in
three strokes as it solves one drawn in one. All three are derived: nothing
enters the log.

### Parsing: the drawing as a layout

> `metamedium-core/src/parse/` — `layout.ts` reads it, `scaffold.ts` builds from it.

Regions alone are a bag of rects, and a model handed pixel rects writes
absolutely-positioned divs: a faithful tracing of the ink that is not real code.
`parseLayout` runs a **recursive XY-cut** (the document-layout algorithm) over
the regions — find a gap that runs clean across the group, split there, recurse
with the axis flipped — turning four boxes into
`column(header, row(left, right), footer)` with the proportions that were drawn.
Containment the human drew is honoured first; marks that overlap in both
directions fall back to `stack`.

`buildScaffold` renders that tree as **flexbox with proportional growth**: exact
at the size it was drawn, and still code that reflows. Two rules earned the hard
way, both by running a real model:

- **The element carrying `data-region` is pure geometry.** Everything the model
  styles lives one level inside it. With `box-sizing: border-box` a
  `flex-basis: 0` item cannot be smaller than its own padding and border, so a
  padded region starts ahead of its siblings and the whole column shifts.
- **`min-width`/`min-height` are zeroed on every flex ITEM**, not just
  containers — their default is `auto`, so a region with a long list in it
  refuses to shrink and pushes everything else out of place.

`validateRegions` checks the result still matches the drawing. A promise nobody
checks is one you find out about from a screenshot.

**A figure wears its chrome only while you point at it.** The gold brackets
and the filename say *a thing with an identity you can grab*, which is what you
want over a page or a program; over a title, a label inside a drawn box, or a
note, they are a second drawing on top of the first, and a figure made of eight
of them is unreadable. Same rule the reading under a mark already follows —
shown for the one the hand is on, not for every mark on the board. A page keeps
its brackets, because it has a plate under it anyway.

**A figure follows the theme.** Its document carries the board's own ink colour
baked in (an iframe inherits no token), so the theme is part of what the
document is *made of* and belongs in the frame's stamp. Without it, switching to
paper left every label in the dark theme's near-white ink on a light ground — a
figure that vanished when the light came on.

**A few words are a caption and fill their frame** (`TEXT_FITS_LINES` in
`13-kinds.js`); a file of text flows at a size the screen holds. Writing turned
to text was the first caption and the rule was written as *did it come from
ink* — but a label written onto a drawing is a caption however it arrived, and
held at screen size it floated free of the drawing it labels the moment the
board zoomed.

**A figure is not a page** (`FIGURE_KINDS` in `Demos/surface/02-artifacts.js`,
`figureCSS` in `13-kinds.js`). A page, a script, a table or a tree is something
you read *on a page*, and the white plate under it is that page. A program, a
drawing and a line of words are marks among the ink, and a plate behind them
fights what they stand in. `run` had the rule alone; `svg` and `text` have it
now — clear ground, no plate, no shadow, type in the board's own ink token, so
a figure written onto the canvas reads in either theme. And **a text sets its
words once**: a text run's addressable label *is* its own first forty
characters, so printing every region's label over it, which is right for a
function or a key, set every line of a text twice. Found by writing a label
with the MCP hand and getting a white card with the words on it twice.

### Living artifacts

An artifact may carry a `'code'` rep, which puts it on `SessionState.live` and
makes it render as real DOM in the canvas. The rules:

- **The engine owns structure; the model owns content.** Generation asks for
  per-region `html`/`tag`/`style` plus a theme, and says the layout is already
  decided. Asked instead for a positioned page, a real local model returned good
  copy and *no positioning at all* — so the geometry is an invariant now, not a
  request (MVP.md §6.2).
- **The drawing is the brief.** Beside the layout tree the model gets
  `describeReading()` (`participants/serialize.ts`) — genre, what each region
  *plays*, the engaging relations between regions, the concepts they read as,
  and any names the human gave — **in region ids**, the same names the layout,
  the reply and the DOM use. Concepts are matched per scope and a container is
  not a peer of its contents, so each container's contents are read on their
  own too (`WITHIN CONTAINERS:`), or the row inside a frame is invisible. A
  label is handed over as handwriting the model cannot read and must title;
  "a page" is told to infer a subject from the structure rather than write
  placeholders. `ask` and `interpret` get the same brief for a group.
- `regionsOf(artifact, nodes)` returns member marks in **reading order**
  (top-to-bottom, left-to-right, containers before contents), because region ids
  are how the human, the model and the DOM refer to the same thing.
- A closed stroke drawn **on** a live artifact is lasso-like even enclosing no
  mark — it encloses a *region*. `Summon.onArtifact` reports which artifact and
  which regions, so ink over a running page addresses real elements.
- `agent.generate()` is **one method for build and revise**, because it is one
  gesture; whether the artifact already carries code decides which.
- Every version is held and attributed. Rendering the newest is a display
  choice, not a commitment.
- **A frame whose document changes gets a new iframe element**
  (`syncStage`). Assigning `srcdoc` twice in one tick — the source card at
  import, the harness at play — lost the second navigation on a board with
  a dozen frames loading: the program never started and nothing said so.
  A fresh element always navigates, and the message listener ignores the
  old window by identity.
- A **broken** artifact leaves the live plane: code is a contract with the marks
  that framed it, and a page rendering over erased ink is the silent phantom
  degradation exists to prevent.
- **A late result never resurrects a deleted target** (STATE-1,
  `src/session/stale.ts`). A model thinks for minutes while the hand keeps
  drawing, so every deferred result says which board it was asked about, and
  `attachCode` / `propose` / `answer` refuse it at the session's own door when
  that board is gone: the target `erased` or `missing`, the board `replaced`
  (a `load`, which bumps `state.generation`), or the version `superseded`.
  Three rules, each a failure that was live: **never a throw** — the hand knows
  nothing about the call; **never a silent drop** — the refusal lands on
  `state.staleResult` (`MarkMiss`'s sibling: nonfatal, transient, cleared by
  the next event) and the agent returns its sentence, so the surface says *the
  target was erased before qwen3's code arrived*; and **never into the log** —
  a refused event is rejected *before* it is appended, because an event in the
  log is replayed, and one parked there came back to life the moment the human
  undid the erase that discarded it. The pin is scoped by generation and
  target/version, never a global busy flag: a second model must still answer
  about unrelated marks while the first one thinks. A **build** is unpinned, so
  several participants may each offer code (no tier commits); only a
  **revision** pins `codeVersion`, and the conflict policy is that **the
  standing newer version wins** — a revision written from a version the
  artifact has moved past is refused, not silently overwritten. The erased
  check also lives in the apply path, so a merged log that arrives
  erase-before-code reads the same way: state stays a pure function of the log.
- **A playing program takes the pointer; ink begun outside goes over it**
  (v10 D2, `pointerFrameAt` / `postPointer`). The canvas keeps every
  pointer — the stage stays under the ink — and a pointer-down inside a
  *playing* `run` frame is forwarded to it: the harness dispatches it inside
  as real pointer and mouse events (a click after a still release) and
  hands it to `mm.onPointer`; every move and the release follow, nothing
  drawn. A stroke begun anywhere else is ink across any frame it crosses,
  which is how the 3D thing is doodled on. A page and a still program take
  ink from anywhere (nothing in them to press); a loop that waits is the
  hand's wherever it lies, so the tap or mark that takes it up lands in
  the loop, not the frame. The cursor changes over a playing frame.

### Relations and concepts (Tier 1)

> `metamedium-core/src/relate/relations.ts` and `src/concepts/concept.ts`.

**Relations** are what the canvas can SEE between marks: `contains`/`inside`,
`crossing`, `touching`, `near`, `above`/`below`/`left-of`/`right-of`,
`same-row`, `same-column`, `same-size`. Two rules:

- **Every threshold is a ratio of the marks' own size**, never a pixel count.
  Nearness is judged against the *smaller* mark, so a dot two hundred pixels
  from a large box is not near it.
- **Relations carry strength**, so a crisp row can be told from a rough one.

**What is stored is what is read; the rest is computed for a scope** (R4b,
27 Sep 2026). The five **engaging** relations — `contains`, `inside`,
`crossing`, `touching`, `near` (`ENGAGING_KINDS`) — hold only between marks
**within reach** of each other (`withinReach`: their boxes meet, or the gap is
under `near`'s own limit, a ratio of the smaller mark); the other seven hold at
any distance. So a new mark is related, as held edges, only to the marks
within its reach, and for each such pair **every** relation `relate` finds is
stored, how they sit included — the same edges in the same order as before. A
pair out of reach stores nothing: above, left-of, same-row, same-column and
same-size between marks a board apart (88% of a 2,000-mark board's edges, read
by nothing but the brief) are computed **on demand for the scope that asks** —
`session.read(ids)` relates its scope, and concepts, roles, notations, figures
and the field read that. A signature reads only the engaging edges, which are
all still stored. The marks within reach are found through a spatial index,
`relate/grid.ts` (`MarkGrid`, exported, so a surface culls by the same
index): a hierarchical grid whose cells are **sized from the marks** — each mark filed at the smallest power of two its own size
fits in — asked for the boxes that meet a mark's box grown by `reachAround`;
the index decides what is looked at, never what is true. The session keeps
the content plane filed, and the **components** of the within-reach links with
their cluster candidates: a mark added, taken away or moved finds only its own
component again, a changed definition is scored against every component, and
the list is rebuilt exactly where `recomputeClusterCandidates` ran before.
Checkpoints share the rep and edge objects the live graph holds (none is ever
changed in place). `metamedium-core/bench/equivalence.mjs` replays every held
log, a scripted log of the acts the boards never make and the 500-mark board
with the old and the new engine and says what reads differently (nothing; the stored out-of-reach relations and the brief's
lines listing them are what changed), and `bench/budgets.test.mjs` holds
PERF.md's engine budgets on the generated 2,000-mark board (`node --test`,
this machine's, not CI).

**Concepts** are the meaning-mappings, kept as a library rather than as code
paths: `row`, `column`, `frame`, `flow`, `grid`, `labelled`. Each is a name, a
predicate over relations, and a list of `conversions` it affords. They match
plurally and rank by confidence, like every other reading in the engine.

**Alignment is a concept's confidence, not its gate.** A `row` that required
marks to already sit on a clean line would only fire on drawings that need no
tidying — exactly backwards, since offering to line them up is the most useful
thing it can do. What makes a row is peers sitting beside each other sharing a
band; how straight they are is how sure the reading is, and it says so
("roughly lined up", "not lined up yet"). Adjacency must hold between
*neighbours*, not on average.

**Tier 1 conversions need no model**: `session.tidy()` lines marks up and spaces
them evenly across the span already used, or matches sizes to the largest. Ink
is never destroyed — the original stroke is untouched and the mark gains a
`'transform'` rep, so undo springs it back exactly.

### The diagram rung: what a mark PLAYS

> `metamedium-core/src/diagram/roles.ts` — KEYFRAMES.md §2–3.

Shape says *rectangle*; this rung says *container*. It is the link between
seeing a shape and writing a div, and it is a **closed vocabulary of six**:
`container`, `node`, `edge`, `label`, `annotation`, `unclassified`. Roles are
placed by a nine-row **table** over shape + relations + wires, read top to
bottom, first match wins — and a mark no row places is `unclassified`, *said out
loud*. Two decisions the table forced: a lone closed box is a `node`, not a note
(you draw boxes before you connect them); and "relates to nothing" means no
*engaging* relation (`near`/`touching`/`crossing`/`contains`) — a note in the
margin can be the same size as a box on the page and still be in the margin.

**A drawing has a genre** (`genreOf`): boxes tiling a space are a `layout`,
nodes joined by edges are a `graph`, a graph inside a container is `mixed`.
The genre picks the code target: `parse/layout.ts` (flexbox that reflows) or
`parse/graph.ts` (nodes at their drawn positions, edges as SVG paths following
the drawn ink, cut at the tip so the head sits where the arrow pointed).

**Concepts are built on roles**, not shapes: a `row` is a run of `node`s, a
`frame` is a `container` and what it holds, a `flow` is `node`s joined by
`edge`s — and gets its direction for free. `session.read(ids)` returns the
relations, roles, genre and concepts together; the inspector's **ladder**
(ink → shape → plays → code) is that reading, per mark.

**Notations read over the roles** (V1-PLAN §3, D1; `notations/notation.ts`,
`notations/flowchart.ts`, `notations/shape.ts`). A notation says what a
scope's marks are in its own terms — the flowchart's process, decision,
terminator, data, start and end, its flows and labels — and which of the six
roles each symbol plays; it adds none (registering one that names a seventh
throws). `notationsOf(state, scope?)` asks every registered notation, plural
and ranked, and `describeNotation` says *a flowchart 0.78 — three processes,
two decisions, …, eight flows*. Symbols are read by their **corners**,
because the shape rung is blind to rotation by design (a rectangle's clean
form keeps its angle since S1, but the rung's reading carries none): the four corners on the ink's hull and the share
they hold, how upright its sides, how turned its diagonals (a decision's
stand one plumb and one level), how its sides lean (data) — so a box drawn a
little tilted stays a process. A diamond in two strokes is `figuresAmong`'s;
one drawn as left and right halves quickly, which the letter rules gather
into a word, is read from the word's own strokes. A flow's ends are read
**past its heads** (`headsOf`'s `tip`), a magnet's bind first, and a small
start dot that `headsOf` reads as a circle head is the start. Ports — a
decision's vertices, a process's edge middles, a terminator's ends and sides
— reach the pen through E3's hook only once `offerPorts('flowchart')` puts
them in use. The content (names, roles, ports, Mermaid) is `FLOWCHART_TABLE`,
bound for the `flowchart@1` pack (B3); `flowchart.bench.test.ts` is the
bench. Derived: nothing enters the log.

### Spatial Graph — retired

The old spatial graph (`spatial.ts`, with its fixed 50px "touching") is gone.
`src/relate/relations.ts` is the one relation system: the session records the
measured, scale-free relations of marks within reach of each other on the node
graph (found through `relate/grid.ts`), clusters over them, and infers
wires (`connects`, plus `points-from`/`points-to` for arrows) with a tolerance
relative to the target's own size. Legacy copies still exist for reference in
`Web App Skeleton/src/core/spatial.ts` and `doodle2-canvas.html`.

### Tiered LLM Interpretation

> **Status (redressed 6 Sep 2026): three tiers, and a tier is a kind of
> knowing, not a place.** **Tier 0** is the shape rung — a stroke read as one
> of eight shapes. **Tier 1** is the engine's instant library
> (`src/tier1/library.ts`, a registry of fourteen modules: relations, the
> diagram rung, concepts, tidy, clean forms, the structure, signatures, words
> into verbs, the program library, tracing, the maths, acting out, wiring,
> words from letters) — everything that answers with no model and no wait.
> **Tier 2** is a model, local or hosted alike; *locality* is a cost the
> router pays attention to (local before hosted), never a tier. Before this
> a local model was "tier 1" and every instant conversion said "tier 0",
> which made a tier a place rather than a kind of knowing. A model joins via
> `createAgentParticipant()` and proposes through the same channel a human
> uses. Design: `ARCHITECTURE-v7-PARTICIPANTS-AND-TIERS.md`.
>
> **Multi-interpretation is a hard rule, not a nicety.** Models are asked for
> *several* readings, several models can answer in the same tier, and **all
> tiers show at once** — a confident Tier 2 reading never evicts Tier 0's. The
> old "escalate only on low confidence" policy is withdrawn: escalation means
> suppression, and disagreement between sources is exactly what the human wants
> to see. Read with `interpretationsOf()` / `byTier()` / `bySource()` /
> `disagreement()`; `topInterpretation()` is a headline helper, not the truth.

- **Tier 0:** the shape rung (`recognition.ts`) — always available, offline — **built**
- **Tier 1:** the instant library (`tier1/library.ts`): relations, roles,
  concepts, tidy, clean forms, **the structure** (`buildStructure`: a page or
  a diagram from the drawing with every region in place and no words —
  what the canvas knows and nothing it does not), signatures, verbs, the
  program library, tracing, the maths, acting out, wiring, words, and **a
  graph in 3D** (`buildGraph3D`, v10 D7: circles joined by lines stand as
  spheres and bonds in a `run` program built from the drawing, each sphere
  named for its region so ink over it lands on that mark, turning on its
  own and by a hand pressed inside; the field's *Show it in 3D*, and a
  definition that holds one is rebuilt for the next drawing, never copied
  — `GRAPH3D_MARK`) — **built**
- **Tier 1½:** the decision seat (`participants/decide.ts`; `1.5` in
  `Capability`, `session/nodes.ts`, so every ordering over tiers keeps
  working) — **built in core, on no surface yet**. Typed questions in — a
  *choice* among candidates the engine already holds, `no-match` always
  among them; a *score* on levels the engine named; the probability of *yes*
  for one statement — and a typed value with its whole distribution out,
  held as one attributed row beside the engine's readings, never evicting
  them, with the question and the distribution as its reason. A flat answer
  is not held (`isFlat`). A batch is asked over one snapshot: what it says
  about a board since replaced, or a mark since erased, is refused the
  STATE-1 way, never written into the log. It sits
  **behind an injectable transport** (`DecideTransport`;
  `createStubDecideTransport` in its tests) — a seat, never a dependency:
  nothing in `decide.ts` names a vendor or opens a socket, and with nobody in
  the seat the engine answers from tiers 0 and 1
- **Tier 2:** a model — local via Ollama (`localhost:11434/v1`) or LM Studio
  (`localhost:1234/v1`), hosted via OpenRouter or Anthropic with your own key
  — **built**. `providerLocality()` says which; the router asks local first
  because it is cheaper, not higher
- **Tier 3:** structural proposals (growing what the board can know) — reserved

Every model joins at tier 2 (`providerTier()`), with its locality carried on
the `join` event and the participant node (`localityOf`). The engine is one
participant, named `engine`, whose readings are tier 0 and whose library is
tier 1. **A brief builds the structure first**: `runPrompt` attaches the tier
1 structure in the engine's name the moment Enter is pressed, so the page
stands at once; a joined model's words then land as the next version. With
no model, that structure *is* the page, and the status says so. Nothing
fakes words.

**A model's reading of a group is an offer to name it.** When a circled group
is summoned, every joined model is asked for readings (`interpret`); each
lands as a held `resembles` edge, and the palette lists the top ones as *Name
it "…"*, attributed, repainting when they arrive. **The reading stays on the
canvas** (v10 F6): a chip beside the group — *greeting 0.80 · qwen* — drawn
the moment it lands whether or not the field is still open (a slow model
answers minutes later), said once in the status line, and a tap on the chip
opens the field on those marks again (`readGroups` remembers which marks a
reading was asked about; the reading itself is held on the group's first
member). Blessing one holds an
artifact with the group's signature, so the next group like it is matched —
the model proposed, the human decided, the engine remembers. This closed the
conversation benchmark's last clause.

**Answers are nodes, not chat.** `session.answer()` places an explanation in the
canvas, anchored to the marks it is about and attributed to whoever said it.
Explanations are a **third plane** (`SessionState.explanations`) beside content
and gesture: visible and erasable, but not ink — they never join a lasso, a
cluster, or a signature. Several participants may answer the same question and
every answer is held.

**A card says what it is about, and how long ago** (`subjectOf` / `agoOf` in
`08-render.js`). The header carries the speaker, the subject — the names its
marks hold, else the one mark's reading, else how many there are — and the age.
The plane is the *live* layer, what someone is saying now; a card that never
says its age reads as permanent, and a card that never says its subject makes
the writer put the label in the prose. Both were true, and answer cards were
being used as the caption layer of drawings. The permanent words of a drawing
are a `text` or `svg` artifact, which is a figure on the board.

**The explanation plane has a layout, and it is the surface's**
(`renderExplanations` in `Demos/surface/08-render.js`). Core anchors an answer
beside the marks it is about; six marks stacked in a column each given a
sentence — what the MCP hand does with `canvas_say` — anchor six cards to the
same edge, and they land on each other and on the ink they are about. So each
card keeps its anchor (a dashed leader to its marks, by the nearest edges) and
the cards are pushed apart by a greedy search: right of the anchor, then left,
then below, then above, shifted along the free side until nothing is hit,
scored so a card would rather sit off screen than over the marks it speaks for.
The placing is **runtime, never in the log** — a card's place follows the view,
so it is found again on every zoom and pan: positions in canvas units, every
size in screen ones. The search is bounded (four sides, eight half-card shifts
either way, the ink near the viewport capped), for a few dozen cards at most.

**The weights are an order of what may be given up.** A card *under another
card* is lost — nobody can read either — so it outweighs everything else put
together; then covering the very marks the card speaks for; then standing off
screen, which costs the reader only a pan; and cheapest, lying over other ink.
Found on a board of two dozen answers: with card-on-card merely dear, a hair of
overlap kept beating a whole card's worth of off-screen and three pairs stacked.
**And staying on screen is a preference among the places beside a mark, never a
reason to leave it**: the term is dropped when the marks themselves are off
screen, or a card anchored a screenful away walks its shifts back toward the
viewport and crowds the cards that live there. Among places that all cost
something, the nearest the anchor wins.
Found with it: **the readable viewport was a sliver.** The panel stands on the
LEFT and `viewportWorld` read its left edge as the right margin, so in a
1400px window the world an answer could occupy was 112px wide and every card
was clamped into it, on top of the last.

**`fitAll` fits the content, and the cards place themselves in it** (V1-PLAN
L2d, `01-view.js`). It used to union the content with the explanation nodes'
*logged* bounds — which, since the placing became runtime, are not where any
card is drawn. A card logged beside a mark that has since moved twenty
thousand units away made the old union fit that much nothing and slammed the
zoom to `MIN_ZOOM` with every mark off the free ground (e2e 41d — one way to
the slam once seen on a live board). Now the content is fitted, the render
places the cards, and only when a card landed outside the free ground is the
fit widened **once** to the rects the cards were drawn at (`cardRects`). One
correction pass, never a chase: fitting again settles.

**Routing** (`src/participants/router.ts`): the canvas answers first — tiers
0 and 1 — and a model is asked only for what they cannot do.
`route(ability, state, {concepts})` reports `settledLocally` when the engine
already has the answer, names the tier-1 module that answers at once
(`instant`: concepts for *read*, tidy for *arrange*, the structure for
*build*, signatures for *name*), and ranks every candidate cheapest-first
(local before hosted) — "the canvas has this" beats a spinner, and "nobody
here can do that" beats silence. It is not a fallback chain: every candidate
is returned, because several participants answering at once is the point.

**A participant can be answered by hand** (`src/participants/bridge.ts`). The
transport is injectable, so a bridge is not a new kind of participant — same
prompts, same parsing, same `propose()` channel, with the question parked
instead of posted. Any model can take part, including one with no HTTP API. It
is also the honest test of the serializer: if a capable reader cannot make sense
of `describeSession`, that is worth knowing before blaming a small local model.

**One transport covers every model:** Ollama, LM Studio, and
OpenRouter all speak the OpenAI-compatible `/v1/chat/completions` shape and
differ only by base URL and key. Anthropic needs its own client.

**Running against a real local model taught four things** (all in the transport):

- **Local gets a 300s timeout, hosted 60s.** A cold 14GB model takes past 30s to
  answer at all; abandoning it wastes the load and reports failure to a user
  whose machine is fine.
- **Calls are cancellable, and the human's request outranks a speculative one.**
  A local server answers one at a time, so an automatic reading sat in front of
  whatever the user typed next.
- **Model replies need repair before parsing.** Strict JSON first, always — but
  devstral writes JavaScript template literals when the values are HTML full of
  quotes. `parseFill`/`parseReadings` repair, never guess.
- **`listModels` reports whether it could ask**, separately from what came back.
  Ollama serves the browser directly; no CORS configuration is needed.
- **Reasoning is stripped in the transport** (`stripThink`): qwen3 and its
  relatives think inside `<think>…</think>`, and a brace in there is exactly what
  the tolerant JSON readers downstream would latch onto.

**The surface's chrome** (`Demos/session-engine.html`, v9 S1): **one bar**
— the wordmark and the panel toggle on the left, the mark chip, undo and the
**control centre** on the right — and nothing in it explains the system
(D3). The centre is a grid of tiles in fixed slots (zoom · snap · view ·
theme · hand · auto-read · folder · import · export · models · mark · reset ·
help), each saying its state on its face, closing on the next stroke, Esc, or
a tap outside. The panes (models, your mark) open under the bar, one at a
time. The chrome is built from six components in `surface/00-ui.js` — pill,
chip, tile, row, pane — one stylesheet section each. **Light and dark are
the same tokens inverted**: the stylesheet defines the light set on `:root`
and the dark set on `[data-theme="dark"]`, the page stamps one of the two
(*system* follows the OS until the tile says otherwise), and the canvas reads
its colours from the same tokens (`readColours`), so ink and chrome never
disagree. The panel that reports on the last or hovered mark tucks under the
bar, scrolls, and collapses as a whole (*details ▾*, remembered per device;
closed by default on narrow screens). Its labels are plain — *mark*,
*reading*, *read as*, *maths*, *measured*, *selection*, *roles*,
*relations*. **On an empty board it shows the loop instead of "nothing here
yet"** (UI-2): *draw a few marks → press and hold one → choose what it
becomes*, three lines in the panel's own plain voice, replaced by the first
mark's reading the moment one is drawn — the actionable start used to live
only in the status line, where a first-time hand was not looking. No modal, no
tour, no fixed palette: the standing line's ladder is unchanged. Scrolling
**pans**; a pinch or ctrl/cmd + wheel **zooms**; the
zoom tile and keyboard still zoom for a mouse. Touch: one finger draws, two
fingers pinch and pan. **The grid is under the same bar**: the view's own
controls (the count and sort; focus's ← →) join the bar rather than a second
bar over the cards.

**Every sentence has one place** (§6.2 of the v9 plan): the field (while a
selection stands), the canvas beside a mark (a name, a match chip with its
number, a working model, an answer card — and the reading of the mark the
hand just made, under that mark only), the panel (rows), and the status line
(one sentence: what just happened, via `say`/`flash`, else the standing state
in a few words). The model pane's status stays in the pane. **A match chip
is a button** (D8): a tap on it summons the group it stands beside —
`session.summonMarks(ids, at)`, the same summon a loop and a mark reach,
with `scopeSource: 'pointed'` — so the second molecule is one tap from being
held. Export is a pane of three files (SVG, PNG, the log); help is the hand
QA plan read into a pane. On a touch screen the field does not take the
focus until the input is tapped, or the keyboard would cover the pills.

**Read as writing** (v10 F5): the field offers to read any ink as one image
— not only what the shape rung called `text` — because the rung called
John's *h* an arc and his *o* a triangle, and the offer to read them was
missing. **The minimap** (v10 F7, `21-minimap.js`): the whole board in the
bottom-right corner with the viewport drawn on it, hidden while the board is
empty; a tap or a drag there pans.

**Affordances at rest** (v10 D5): **press and hold a mark** and it is held
with everything it hangs together with — the cluster over the relations
the canvas sees (`holdAround` in `07-input.js`, `MM.relate` +
`MM.clusters`) — and the field opens with no loop drawn; a tap stays a tap
and a stroke a stroke. The **standing line is a ladder**: the next move in
a few words, keyed to the board (empty → *draw anything*; marks → *press
and hold a mark, or circle marks and double-tap inside*; a loop → *or
double-tap inside the loop*; a selection → the handles; the field →
*type, or tap a pill*). **The map of becoming** (v10 D6, the plan's §4):
the panel's *becomes* row says the selection's rung — shapes, writing, a
concept, a structure (a layout or a graph), a definition, an artifact —
and the rung after it, in one line; a pill whose verb leads somewhere says
so in its tooltip (*→ then: What is this? asks which molecule*).

**A model is asked only by a deliberate act** (v9 S7, §6.3 of the plan):
Enter on a brief, `ask:`, `draw:`, *Read the writing* (or the panel's *read
it*), *What is this?* (every joined model reads the group and its readings
join the certainty row), and a behaviour the verb table could not read.
Nothing on draw, nothing on summon, nothing on join — `render()` never calls
a model. The *auto-read* tile restores reading handwriting as it is written,
off by default. Found the hard way: every stroke the shape rung could not
place read as `text` and was handed to every model that can see, and every
check asked every model to interpret the group before a word was typed — a
doodle session was a stream of calls nobody made.

**Every making prompt says what can be made here** (v10 F13, `HERE` in
`participants/agent.ts`): one paragraph on the interpret, ask, make,
program and draw prompts naming ink and its readings, names, pages,
programs (the `mm` contract, with `onPointer`), text, SVG and answers, and
nothing else. A model with no ground spins off into files, servers and
frameworks; a small one most of all.

**A model at work is shown where it works.** Every call to a model is
registered while it runs (`withWork` in `04-models.js`) and drawn as a
breathing gold dot with the model's name and its task **above the marks it
is about**, and in the status line; it leaves when the call ends, however it
ends. After a few seconds the label carries the elapsed time, after thirty
it says *Esc stops it*, and **Esc with nothing held stops every call in
flight** (`cancelWork`; builds and programs carry a signal from
`workSignal`). **A brief that fails leaves nothing behind** (v10 F10,
`dropFailedBless`): the loop is blessed before the model is asked so the
code has somewhere to live, and when the model fails and nothing has
happened since, that bless is undone and the status says so. **Typed text at a loop is a brief unless it names a verb**: the reading
line says which before Enter is pressed; "website about dolphins" goes to
the model as the prompt. With no model joined, the reading line says so and
Enter opens the pane.

**Keys never leave the device.** A hosted provider's key lives in
`agents[].config` in memory and, only when *remember* is ticked, in
`localStorage`; the `join` event in the log carries a kind and a name and
nothing else, so the log, the folder, autosave and export are clean of it.

**The model pane** (`Demos/session-engine.html`) follows what the personal
site's search bar learned (`johnhanacek/scripts/search-core.js`): it probes
**both** local servers in parallel (returning on the first that answered hid a
running Ollama behind LM Studio), lists models per server, **hides
embedding-only models and says so** (an Ollama holding only `nomic-embed-text`
used to show nothing and explain nothing), and **remembers the pick as a
preference** — honoured when that server still offers that model, quietly
ignored otherwise. Hosted providers and a custom OpenAI-compatible endpoint
join by key; the key is remembered only when asked. A brief typed with no
model present opens this pane: the escalation, made visible.
Model participants are surface-side (`agents[]`); the session keeps every
`join` in its history, so leaving only stops a model being asked.

⚠️ `Web App Skeleton/src/llm/claudeInterpreter.ts` pins `claude-3-haiku-20240307`
and `claude-sonnet-4-20250514` — **both are past retirement and return 404**.
Retarget to `claude-opus-5` before trusting that file (thinking is on by
default there, so leave `max_tokens` headroom).

### Handwriting: the one thing sent as pixels (v7 Stage E)

> `agent.read()` in `participants/agent.ts`; `transcriptsOf` / `transcriptOf` in
> `session/nodes.ts`; `inkImage` / `readWriting` in `Demos/session-engine.html`.

A mark the shape rung reads as `text` is rendered **on its own** — its ink,
dark on a light ground, nothing else on the board — and handed to every joined
model that can **see** (`ProviderConfig.vision`). The reply is held on the mark
as `transcript` reps: several when the writing is ambiguous, each attributed
and ranked, none blessed. This is the deliberate exception to "grounded, not
screenshots": the ink *is* the ground truth of what was written and no
fingerprint carries it, so the model is asked to *read*, not to interpret.

- **A model that cannot see is never asked.** The pane relays what each server
  says: Ollama lists `vision` among a model's capabilities, LM Studio types the
  model `vlm` on `/api/v0/models`. Joined models marked *sees* read
  automatically; with none present, writing stays `text` and the inspector says
  what it would take.
- **The word becomes the offer to name with.** A label with a transcript puts
  *Name it "Pricing"* at the top of the palette (Tier 0, since the reading is
  already held) — write a word beside a shape and it becomes that shape's name,
  which was Stage E's ship criterion. **Writing alone, taken, becomes text
  where it is** (v10 F8, `writingToText`): the group is blessed with the words
  as its parts and carries `text` code marked `from: 'writing'`, rendered as
  SVG text fitted to the ink's width and height on a clear ground in the
  ink's colour (`writingDocument`), the ink held underneath — *Show the ink*
  flips it over (`flipped`, runtime) — editable by double-click or *Edit the
  text*, and **never a definition**: the matcher skips artifacts with `text`
  code, so more writing is not offered as "another hello world". *Play* is
  offered only for what plays: a drawing's tank or a program.
- **Reading asks the smallest model that can see** (`readers()` in
  `06-handwriting.js`, the size read from the model's name), not every one:
  a 27B model takes minutes at a word a 0.8B reads in seconds. A dedicated
  handwriting model in the browser is the next step (the v10 plan, §6).
- **Text folds back from ink** (v10 F12, `19-text.js`): every word of a
  text made from writing is its own region (`w1`, `w2` …; `writingDocument`
  fits each line to the frame), so ink over a word addresses it. A scratch
  across a word **strikes** it (`strikeOnText`): a gap `…` stands where it
  was, the scratch leaves, and the strokes underneath are never scratch
  targets (`scratchTargets` skips a text's members — they are provenance).
  Writing beside the gap, read, is offered as *Fold “…” into the text*
  (`foldIntoText`): the word goes into the nearest gap, or after the nearest
  word, and the writing leaves. Every step is a version; undo walks back.
  **Runtime memory keyed by node id forgets what the log no longer holds**
  (`pruneRuntime` in `08-render.js`): ids are a counter derived on replay,
  so a fresh board reuses them, and a text flipped before a `load([])` kept
  the next text with the same id flipped.
- **The words reach the brief.** `describeReading` says *the human wrote
  "Pricing" there — use those words* instead of *handwriting you cannot read*.
- **Printed letters gather into a word** (`session/words.ts`). Small strokes
  drawn in quick succession, side by side on a shared band, become a held
  `word` node — the letters are its parts, it stands in the content plane in
  their place, and it reads as `text`, so it can be a label, be read as one
  image, and become a name. Every rule is in the hand's space (a letter is
  small *on screen*), a crossbar or a dot counts by its centre, and the
  grouping is inferred: erasing a letter shrinks the word, one letter left
  dissolves it, and the inspector's *not a word — split it* undoes it.
  **A word starts from a stroke the shape rung could not place.** Two
  confident shapes side by side never start one (a confident rectangle or
  triangle never joins one at all); an O or an l may *join* a word being
  written, and the word gathers back the letter-like strokes written just
  before it. **Letters are letters by their run, not by an absolute size**
  (v10 F1): the cap (`LETTER_MAX_HEIGHT_PX`, 150) is a ceiling, and a
  letter may stand up to `LETTER_HEIGHT_RATIO` x-heights over its
  neighbours — the old cap of 44 px threw out every ascender a real hand
  makes (John's h, l and d were 72–88 px tall), so *hello* was five
  shapes and *world* gathered only its x-height letters. Found the hard way: at hand size, three bubbles and two lines
  drawn quickly are exactly a run of small strokes on one line, and the
  earlier rule folded the whole canonical loop into one word — after which
  the lasso and the mark had nothing to act on. **A word is one hand's
  run** (V1-PLAN L2g, `absorbIntoWord`): the run is read over the marks
  the new stroke's maker made, never the board's last mark whoever made
  it, so the letters of two hands — or of a hand and a model — never
  gather into one word, and the word is made by the hand that wrote its
  letters, on every board (under *Live logs*).
- `propose()` carries `reps` as well as edges, so a transcript is held through
  the same channel as every other reading and undo drops it.
- **Writing gathers by nearness into a line** (v10 D3; the `writing`
  concept in `concepts/concept.ts`): text marks — cursive words, gathered
  words — on one band, a word's gap apart, read as *writing 0.8x* with the
  words in reading order, and no clock: letters gather by succession, words
  by nearness. *Read the writing* on a line renders the whole line as one
  image and asks once (`readLine`, `agent.read({ hold: false })`), so the
  reader has the phrase; one word per mark lands on each mark, otherwise
  the line is held on the first and the rest were read with it. The field
  then leads with the line as one name and offers *Make it text* once.

### Time: clocks, tanks, and code that runs (v8)

> `session.clock()`, `state.clocks`; `Demos/surface/13-kinds.js` (the worker),
> `14-clocks.js` (the tank).

**Nothing runs unblessed.** An artifact's clock is log state — playing, seed,
why it last stopped — and *play* is the human's event; time itself is
runtime, derived by the surface and never in the log. Two things run:

- **A `js` artifact's code**, in a worker built from a string, loaded and
  stepped only while its clock plays. A throw pauses the clock with the
  reason; a step past its budget terminates the worker and pauses with the
  budget named; the frame is marked broken and the board goes on drawing.
  Every textual kind renders into the same script-less iframe carrying
  `data-region` — a script's functions, data's keys, prose's headings — so
  ink over a script lands on a function the way it lands on a div.
- **A definition's tank.** A blessed artifact's own ink is its first body;
  blessed matches and the held candidates the engine recognises are the
  rest. Bodies step by the verb basis (`behave/`) — `wander` plus a little
  `hold` until words or a hand say otherwise — at a fixed step, one seeded
  stream per definition, in creation order, and are **re-derived from
  t = 0 whenever the log changes**, so undo re-derives the tank. The
  drawing is what moves; render translates and turns the ink.

**Words into verbs** (`behave/words.ts`): a table of the ways each verb is
said reads the common phrasing with no model ("flees anything bigger" →
`flee *`, only bigger); what it cannot read is returned, not dropped, and
`agent.behave` asks a model only for that, against the closed verb list. A
**`behave` event** from a human is blessed by the act; from a model or the
fit it is held until a human gives it in their name. **Acting it out**: drag
a body while its clock runs and the path is a demonstration, fitted onto
the basis at the pace it was shown, with the residual named. The fit takes
the body's own size — modelled at thumbnail size, every range-relative verb
saw nothing in reach. The panel's ladder is words → sliders → what each
verb is doing now → source.

### The folder is the canvas (v8, WP-11)

> `metamedium-core/src/store/` (the seam and three backends);
> `Demos/surface/17-folder.js`.

Nothing is invented: a canvas is a folder. *Open a folder…* walks it for
every file of a known kind (skipping `node_modules` and its kin, stopping
at 400 files and saying so) and each becomes an artifact of its kind
through an `import` event **in this participant's log**, laid out as
cards; a second machine that pulls sees the same board and discovers
nothing twice. Logs are one file per participant under
`.metamedium/logs/`, one event per line, and the canvas is `mergeLogs` of
them; **autosave** rewrites only this participant's file, or holds the
whole log in browser storage when there is no folder — a reload brings the
board back and *Reset* forgets it. A static site is opened read-only through
`.metamedium/manifest.json` (`?folder=<base>`), so a published canvas can be
drawn on and the ink stays the reader's. **The live budget**: the nearest
twelve live artifacts render; the rest stand as parked cards — except that
**a playing artifact is never parked** (its clock is running, and a card in
its place would silence it; found when a program past the budget never
started). A cross-origin frame that is off-screen is throttled by the
browser itself, so a playing program out of view reports late until it is
back. Grid and
focus are lenses over the same log. **A repository is a folder too**
(`store/git.ts`, `?git=owner/repo`): the tree in one request, files by
path, this participant's log committed as one file; reads need no token,
writes need one the user pasted. **The page is installable**: a manifest
and a service worker cache the shell for offline; every request is
network-first with the cache as the fallback. **Loops do not depend on paint**: a tab
the browser stops painting gets no animation frames, so the tank and the
worker take a timer's tick when no frame comes (`nextFrame` in
`01-view.js`) — time is state, not a movie.

### Live logs: multiplayer as a transport (v9 S6)

> `metamedium-core/src/store/live.ts` (`LiveStore`, `LocalHub`),
> `session/hands.ts` (`sittingName`, `handLabel`), `store/merge.ts`
> (`mergeLogs(logs, { me })`), `Demos/surface/17-folder.js` (`openLive`),
> `Demos/relay.mjs`, `shard-3d/src/room.ts`.

Nothing in the engine changes: a second person on the canvas is a second
log arriving live instead of after a pull. `LiveStore` is a `Store` with
`watch: true` whose transport carries lines — a participant's appended
events — between hands: a `BroadcastChannel` between tabs on one machine
(`?live=<room>`, or the *live* tile), or a relay between machines
(`?live=<room>&relay=http://host:8020`; `node Demos/relay.mjs` is a page
of Server-Sent Events in and POST out, with no truth of its own). A
newcomer says hello and every peer answers with **every log it holds** —
its own, and each other hand's it has heard, marked `via` itself — so
history is caught up the way a pull would, even for a hand that has left
the room; presence is the sender's, never the absent writer's. **Whose
hand:** `mergeLogs(logs, { me })` stamps every event from another log with
`by: <log name>`, and the session attributes such an event to a
participant of that name — made on first sight, id
`participant:hand:<name>`, no join event anyone had to write — so another
hand's ink draws in its own colour (a hue from the name) and is never
yours. The merge runs as each line lands (on a microtask — a hidden tab
throttles timers), my unsent events kept. Presence is who was heard in the
last minute, in the status line.

**A log name is reused only when its whole history was loaded first**
(`session/hands.ts`; DIRECTOR-PLAN-W2 L1). Every id an event mints comes
from its log's name and its number there, so this rule is what keeps a
number from being issued twice. A folder's history is its file, loaded
before anything is minted, so a folder board keeps one name (the device's,
`mm-participant`); a board in browser storage restores its whole log
first. A live hand has no history to load — a tab keeps no log of its own
in a room and never hears its own lines back — so **a live hand's log is
one sitting**: a tab's page load, an MCP process. `sittingName(person,
suffix)` mints `john~a1b2` once per sitting, and nothing keeps the suffix
where a reload would find it; the name shown, and the colour, come from
`handLabel` — the name without its suffix — so a reload is a new log and
the same hand (*john*, in john's hue). Within a sitting the session's
high-water mark (`session.ts`) only rises: an undo, a merge that no longer
carries a dropped event, and `load([])` never lower it. A tab opened on
`?live=` does not restore the device's board into the room, since every
reload would carry it in again under a new name; the *live* tile brings
the board you are on.

**A person is the same person across sittings** (V1-PLAN L2i; `personOf`,
`samePerson` and `Session.isMine` in `session.ts`, `session/label.test.ts`,
e2e 47). A sitting is still a participant of its own
(`participant:hand:<log name>`), so what a person drew before a reload is
the earlier sitting's, as the panel and the card say. But **the rules that
ask "is this mine?" compare the person** — the log name without its
sitting's suffix (`handLabel`) — so every sitting of one person may label
that person's marks, on every board: the reloaded tab labels what it drew
before the reload, the earlier tab (still open) what the later one drew, a
restarted MCP hand its own circle. Another person's marks are refused as
before, with the reason. Before this, the rule compared the exact log name,
and after a reload core told john *that mark was made by john*. This
board's own hand is the person its log is written under (`logName`) — the
same fact every other board reads off that log's name when it merges it —
so every board agrees; a board never told its log's name is no sitting of
anyone and compares hands exactly, as it always did. A model or the engine
is no person and only ever itself. **What stays per sitting:** log names,
ids and numbering (L1 — never reuse a number), gestures (L2h — two tabs of
one person are two hands drawing independently) and a word's run of
letters (L2g); the logs are never merged into one participant, or
numbering could collide. **The trust
model, plainly:** a name is self-asserted — there are no accounts — so
treating one person's name as one person is the same trust the name and
the colour already carry. It is not authentication: anyone who types
*john* is john to the rules, as they already are in name and colour, and
two hands that never gave a name are both *hand*.

**A hand sends its log as it stands** (`LiveStore.publish`): the new tail
as an append when the log only grew, the whole of it as a `full` when it
did not — an undo, a reset — so **an undo reaches every peer**. A store's
first send is whole, so joining the same room again within a sitting
replaces what the room holds of you instead of doubling it. An event
already held by its authorship is held once, and lines leave in the order
they were written (an asynchronous transport's POST is waited for before
the next).

**Two hands under one name are said — to the room and to both of them.**
Every line carries its store's sitting id (`sid`, never shown); a second
sitting under a name already heard is a collision: what was heard first is
kept and the other's lines are refused. A store checks its OWN name before
discarding any line, so the two hands that share it are told too (a hello
from a hand under my name is still answered, which is how that hand
learns). A line from before sittings is judged by the old rule: a `full`
that diverges from what is held. **A room older than the relay remembers
says so:** the relay keeps `maxLines` lines a room (`startRelay(port, {
maxLines })`, else `MM_RELAY_MAX_LINES`, else 5000) and tells a client
that connects after it forgot some, and the store makes that a sentence.
Both land in `LiveStore.notices()`, which all three hands say: the
canvas's status line (`folderStatus`), the MCP hand's `canvas_look`, and
the shard's status line (`Room.notices`) and `space_look`.

**One event, applied once** (`mergeLogs`, V1-PLAN L1b). An event's authorship
— `origin` and `seq` — is its identity, and the same stamped event does reach
a reader in two logs: a tab that joins again under another person's name
hands its log on under the new name while the room still holds the old; two
hands that opened one folder carry the same file into one room. Merged as
two, the one mark was applied twice — one node, its id listed twice on the
board. So the merge keeps **one event per `(origin, seq)`**: the first
occurrence in merge order, except that the reader's own log (`me`) always
keeps its own copy (an event of mine dropped there would drop out of what I
send next). Copies compare as written — `by` and key order aside — and an
event with no authorship has no identity and is never folded. **Two
different events under one authorship** are two writers under one name: the
first is kept and `onCollision` is told; a room says it through
`LiveStore.misnumberings()`, one sentence per name, which `notices()`
carries to all three hands, and a folder says it in its own status line.

**"Local" in another hand's log means that hand**: an event stamped `by`
whose `participantId` is the local participant, or none, is attributed to
the hand — its answers, proposals and code arrive in its name, never in
the reader's. **My log is the session's own unstamped events**, sent or
not, never the room's copy of it: a line landing between a send and the
next merge would otherwise count every sent mark twice (found by the MCP
smoke test; e2e 28c2). **A model joined in another hand's log is that
log's participant**: when the hand says its log's name, the model's `join`
mints `participant:<log>:<n>` from that log, so its proposals name the
same participant in every reader however the logs were merged
(`ids.test.ts`). A log written with no name — one from before ids per
hand, or what a shard tab drew before it joined a room (the shard names its
log as it joins, `shard-3d/src/room.ts`) — keeps counter ids
(`participant:N`), which a merge can renumber; nothing translates them.

**An artifact is made by whoever blessed it** (V1-PLAN L2f; `applyBless`
and `authorOf` in core, `session/label.test.ts` and `held.test.ts`, e2e 43).
A bless used to write no maker, so every board read an artifact as its own
reader's: the maker's label on her artifact was dropped on every other
hand's replay, and any other hand could label it at its own door. Now a
`bless` gets the attribution a stroke gets — "local" in another hand's log
means that hand — so the label rule holds for things as it does for ink, on
every board; the MCP hand's look says *by tab*; the panel's *by* row reads
`authorOf` for every node. **Not who drew its marks**: a hand may bless a
group several hands drew — the thing is the blesser's, and each mark stays
its drawer's, drawn inside it in its drawer's colour (`inkOf`'s `byMaker`;
a live page's gold is the one colour laid over all of them). **A bless is a
person's act**: one in the engine's name — the shard stands a hull at tier
1 inside its hand's act — is the hand's whose log holds it, and the engine
keeps its name on the word. The `made-by` edge is written only for a maker
other than the board's own hand, which `authorOf` reads from no edge at
all, so a board's own blesses — every held log — replay node for node.

**A word is made by whoever wrote its letters** (V1-PLAN L2g;
`absorbIntoWord` in core, `session/label.test.ts`, e2e 44). The gathering
wrote every word `made-by` the local participant, whoever wrote its
letters, so on another hand's board her word read as the reader's: her
label on it was dropped on every replay but her own, and that board could
label it — while its letters were hers. Now a word names the maker its
letters already carry, so the label rule holds for words as for ink, and
the MCP hand's look says *by tab*. **A word is one hand's run**: the merge
interleaves the hands' events by time, so the mark just before her next
letter on the board may be his — taken for the last letter of her run, it
joined her word (his letter printed beside hers) or broke it in two (his
mark set between two of hers). The run is read over the marks the new
stroke's maker made, so her letters gather into her word whoever drew in
between, and the letters of two hands — or of a hand and a model — never
gather into one. A board's own words name its own hand as they always did,
so every held log replays node for node.

**Gestures are per hand** (V1-PLAN L2h; under *Gestures*, e2e 45–46). The
gesture state was one for the board while the merge interleaves the hands'
events by time: another hand's stroke landing between a hand's summon and
its bless dissolved the summon at the next merge, and the bless made
nothing on any board — the blesser's own included, once her live board
merged the room; set between a loop and its check, the loop was left
untaken and the check read backwards, holding the loop's own ink; and one
hand's loop and check opened every other board's field. Now each hand's
gestures are keyed as authorship is, so the same hand keys alike from its
own board (the local participant) and from every other
(`participant:hand:<name>`). **A folder opened with no reader** stamps no
`by`, so every log in it is the reader's own there — one hand's gestures,
as its authorship already was.

### The MCP hand: Claude Code on the board (v10 T2)

> `Demos/mcp.mjs` (the server), `Demos/live-node.mjs` (the relay as a
> transport in Node, reconnecting from its last id), `Demos/ink-png.mjs`
> (ink to PNG with no canvas API), `Demos/mcp-smoke.mjs` (the stdio test,
> run in CI), `.mcp.json` (registers it for Claude Code).

An MCP server is **a hand in a room** (SURFACE-v10-PLAN D1): it joins the
live room `claude` through the relay on this machine (starting one when
none answers), keeps a session from the merged logs exactly as a tab does,
and its eight tools are verbs a hand already has — `canvas_look` (the
board in words, with ids), `canvas_see` (the ink as a PNG: how the caller
reads handwriting or looks at a sketch — the tier 2 seat, taken by whoever
is in the conversation), `canvas_draw` (the shape rung's vocabulary or raw
strokes, declared content), `canvas_say` (a sentence beside marks),
`canvas_propose` (a reading, held), `canvas_label` (a word on its OWN ink —
below — refused on anyone else's, with the reason), `canvas_transcribe`
(what writing says, held), `canvas_write` (code for a new artifact or a new
version; where it goes is `bounds`, or `place` — `{in | under | above |
right | left: id, w?, h?}`, relative to a mark, so a caption inside a box is
not arithmetic; the notes' §F).
It **proposes and never blesses**; it can write a program and **cannot
play it**; it holds no keys. MCP over stdio is newline-delimited JSON-RPC
written by hand, so the repo takes no dependency; it imports the committed
Node bundle `Demos/metamedium-core.node.mjs`. In the canvas: the *live*
tile → *with Claude*, or `?live=claude&relay=http://127.0.0.1:8020`. Its
ink arrives as its own log, stamped `by` on arrival, in its own colour. It
is one sitting, named per process (`sittingName`) — a restart is a new hand
and the same person, so it may label what it drew before (L2i, the smoke) —
and `canvas_look` leads with what the room says about itself — a name two
hands share, a history older than the relay remembers (`LiveStore.notices`).
**In a session without the tools loaded** (the `.mcp.json` was added after
the session began), the hand still works from the shell: run `mcp.mjs` with
its stdin fed by `tail -f` on a command file and its stdout to an output
file, append one JSON-RPC line per call, read the reply — the same eight
tools, one process kept alive across turns. `QA-v10.md` is the hand test
run that way, with the hand in the room checking each step.

### The shard's hand, and the model seat (SHARD-3D-PUSH-2 G5)

> `shard-3d/mcp.mjs` (the server), `shard-3d/src/room.ts` (the transport and
> the parked brief), `src/models.ts` (`joinHand`), `shard-3d/mcp-smoke.mjs`
> (the stdio test, in CI), `.mcp.json` (`metamedium-3d`).

The shard joins a live room exactly as the canvas does — nothing in the engine
changes, because the shard's log IS a core session. The same process is both
halves: **a hand** in the room (`space_look`, `space_draw`, `space_propose`,
`space_say`) and **the model seat** (`space_pending`, `space_answer`). John
types a brief in his tab; Claude Code, in a conversation, reads it and answers
in the proposal contract; the shard applies that answer exactly as it applies a
small model's. The contract gets argued about first hand before anything is
tuned against it.

**A brief is a log event, not a side channel** — an answer on the explanation
plane, where this engine has always put questions (`session.answer`). It changes
no mark and writes no version; it replays, undoes and exports; and `LiveStore`
already carries log lines, so the relay learns nothing. **The pairing is the
brief's own node id** (DIRECTOR-PLAN-W2 L2a): every hand names its log as it
joins (`joinRoom` says `setLogName(me)`, one sitting; `mcp.mjs` and `otherHand`
open their sessions named), so the id the tab gets back from `session.answer`
is the id every hand derives for the brief. A brief is an answer whose question
is `brief`; its reply is an answer whose question IS that id, about the ids the
brief node's own `about` edges name — the same ids in both sessions. Nothing is
minted. The old `brief:<key>` / `answer:<key>` spelling is only read, by
`legacySeatTraffic`, tested against a log the old pairing wrote
(`shard-3d/fixtures/seat-before-ids.mm.log`).

**A hull seen from one standpoint asks how deep** (L2c, `shard-3d/src/depth.ts`).
A plan and one other standpoint whose silhouette covers less than four fifths
of the plan across the view: along that sightline only the plan bounds the
hull, so the act that stands it also puts one question on the explanation
plane — `session.answer`, question `how deep?`, the engine's, about the hull —
naming the axis and carrying the depth it took (the plan's reach behind the
silhouette) and *as deep as it is wide*, each with its number and reason.
Whether it still stands is derived from the hull step on every read: a view
from another standpoint closes it by measuring, a word (*3 deep*, typed at the
hull) by saying — held as `HullStep.depth`, which `solid.ts` cuts the body to
— and undo reopens either. No new event type; the question is not ink.

**The seat is a model, and that is the whole of it.** A seat carries an
injectable `transport` (the `bridge.ts` pattern, which is also what the e2e's
stub is); the hand's parks the question instead of posting it and returns the
same `CompletionResult`. So the prompts, the parsing, the dropped-and-counted
rule, the work indicator and Esc are all unchanged, and `runBrief` has no case
for it. **The hand takes the front seat** — `first()` is who a brief goes to,
and sitting down in it is a deliberate act that says *ask me*.

Two things real use found at once: `space_look` must read every node carrying
ink and a plane, not `contentIds` — a mark a solid was made from leaves the
content plane, so a board with a box standing on two marks reported *0 marks*;
and a step's provenance is its `from` (stroke ids), because `profile` on a step
the engine built is the resolved outline and printed as `[object Object]`. A
third: **the `?live=` boot block must run at the END of `main.ts`**, with the
demo — up beside `createModels` it runs during module evaluation, where
`report()` reads chrome declared further down, so it threw into a promise nobody
awaited and the seat silently never took while the room joined fine.

### A label: a hand's word on its own ink (V1-PLAN L2b, L2e)

> `session.label` / `session.isMine` / `labelOf` / `labelsOf` in core
> (`session/label.test.ts`); `renderLabels` in `Demos/surface/08-render.js`;
> `canvas_label` in `Demos/mcp.mjs`; the person's door — `readLabel` and
> `typedWord` in `Demos/surface/09-field.js`, `labelMarks`, `labelItem` and
> `whoseInk` in `09-palette.js` (e2e 42, 47).

**Whoever made a mark may put a word on it; nobody else may.** Naming a mark
someone else made is blessing it, the human's act; labelling your own ink is
not (the notes, §B). A `label` event holds the word as a rep on the mark,
attributed; it replays and undoes; an empty word takes it off; another
person's label on my mark is refused at the door (`not-your-ink`) and dropped
on replay. A mark's maker is the hand that drew it; an artifact's is whoever
blessed it, and a word's the hand that wrote its letters, on every board (L2f
and L2g, under *Live logs*). **"Whoever" is the person, not the sitting**
(L2i): a reload is a new hand and the same person, so the marks drawn before
it are still the person's to label — `session.isMine(id)` is the door's
question, and the field asks it too, so the line before Enter and the door
never disagree.
**It is not a bless and not a file** (§D): no `word` rep, no artifact, no
library entry, no card in the grid, never a name the matcher learns.

**On the board it is a caption.** The word is drawn beside its mark — above
the top edge, above an artifact's name when that shows — in the ink's own
colour (the maker's, from the same tokens in either theme), at a size in the
board's units: the caption rule of `13-kinds.js`, so it scales with the
drawing it names, never held at screen size (`LABEL_PX` on the screen the mark
was drawn on — its stroke's scale). Who put it there shows only while the hand
points at the mark; erasing the mark takes the label, and undo brings both.

**A person labels from the field** (V1-PLAN L2e). With marks held, `label:
word` is a prefix of the pure reader, and the line says before Enter what the
word will go on — `↵ label it “inlet”`, *on each of your 3 marks*, *on
yours, not the mark fern made*, or, quietly, *no label — fern made this
mark*. The row offers it too, as *Label it “…”* beside the naming offer:
under writing that has been read (the reading that takes the word as the name
stands above it; the label goes on the marks held with the writing, or, with
nothing else held, on the writing itself as a caption), and for a word typed
(`typedWord`: *Name it “…”* and *Label it “…”*, the pair together; `label:`
and `name:` mark one). Taking it is `labelMarks`: one `label` event per held
mark the person made, each through the session's door, and every mark said in
the status line — labelled, already saying the word, or refused with whose it
is (*not on the mark fern made — a label goes on your own ink*) — never passed
over in silence. The field closes **before** the word is written, so the
labels are the last events and one undo takes one off; a mark already saying
the word writes nothing, so a second Enter or a held pill is not a second
event. Naming and labelling one word side by side read as one thing twice,
so the difference is said in words the field already has — each pill's
tooltip says what it does and what it does not (naming makes one thing, a
definition the library keeps, and writes no word on the ink; labelling makes
nothing), and the reading line says what a pill of the pair will do while it
is pointed at or chosen by the arrows — never a badge, a row, or a fifth core
button. No model is asked.

**Every reading says what it is based on** (`Interpretation.basis`: `name`,
`label` or `resemblance`). A label is one named reading among the engine's,
at its maker's tier and weight 1 — so it led every "the tier-0 reading" list
and the panel's shape row read the label. Anything asking what the shape rung
measured asks for a reading that is not a label; the panel shows a `label` row
beside the shape.

### Text as an element (v8, WP-13)

> `Demos/surface/19-text.js`.

A `text` artifact is a file of words: rendered as prose ink can address, its
words offered to any slot a frame wires it to. Double-click on empty ground
opens an editor on the canvas where the text will stand; Enter keeps it,
Shift+Enter is a new line, Esc drops it; editing an existing text is a new
version of its code with every version held. Handwriting stays handwriting
until asked: *Make it text “…”* turns a read word into a text artifact where
the writing is, the ink staying.

### Frames: artifacts wired by reference, and the drawn slider (v8, WP-10)

> `metamedium-core/src/frames/frame.ts`; `Demos/surface/16-frames.js`.

A **frame** is an artifact that *refers* to other artifacts and carries the
**connections** between their ports; nothing is copied or moved. Interfaces
are read, not declared: a script's tunables are its top-level numeric
constants, a page's slots its regions, a control's port its value, a word's
its text, a behaviour's its speed and weights. Connections are offered by
type and ranked by name, each with its reasoning; resolving a frame
substitutes the wired values wherever a member renders, runs or steps. The
**drawn slider** is the first drawn control: a line with a dot on it reads
as the `slider` concept, and the control's value is where the knob sits
along the track, read from the ink where it stands — dragging the knob is
setting the value, and the `move` that records the drag is the only event.
A frame built once is offered again by the name written beside a loop or by
resemblance, and export writes it as a folder of wired files.

### Pictures become ink (v8, WP-9a)

> `metamedium-core/src/image/trace.ts` — `trace(bitmap)`.

A photographed sketch is pixels, not marks. `trace` takes an RGBA bitmap
(the shape of `ImageData`; no canvas API in core) and returns strokes in
pixel coordinates: Otsu's threshold on luminance (inverted when most of the
picture reads as ink, so a chalkboard photo works), Zhang–Suen thinning to the
one-pixel centreline, the skeleton walked into paths — free ends first, then
junctions taking the straightest branch so a shaft continues through a barb,
then loops — Douglas–Peucker at a pixel and a half, and **densified back to
ink spacing**: the engine measures along the path, and a polyline that is
only its corners has nothing between them to measure, so a perfect traced box
read as a circle until it was given the density a hand leaves. Every result
carries its reasoning (the threshold, the ink fraction, how many flecks were
dropped). On the surface (`18-images.js`) a picture arrives by drop, paste,
*Import…* or a phone's camera, lands as declared ink at the drop point with
the raster kept beside it as an image artifact, and can then be circled and
prompted into a page inside its own ink; an SVG or any file of a known kind
becomes an artifact of its kind. *Export…* writes the board as SVG or PNG
or the session as its log, and the panel saves any artifact's code.

### Programs, and the library first (v9 S5)

> `kind: 'run'` in `src/kinds/kinds.ts`; `agent.program` in
> `participants/agent.ts`; the harness in `Demos/surface/13-kinds.js`;
> `targetOf` / `runProgram` / `libraryEntries` in `09-palette.js`.

A brief at a loop is a **page** when the reading is a layout of boxes and
a **program** otherwise (`page:` / `run:` / `new:` override). A program is
`run` code: it renders itself in the other sandbox — `allow-scripts`
without `allow-same-origin`, an opaque origin that can draw and cannot
reach the page or its keys — on a **clear background**, sized to the ink's
frame, with three.js when it loads and a 2D context always, and it
**reports its parts** (named rectangles) back over `postMessage`, so ink
over a running torus lands on `torus`. An error thrown at any time — while
the code loads, in a frame, later in a timer or a promise — is posted back
and pauses the clock with the reason, the frame marked broken. **The library first:** before any
model is asked, a brief the library already answers reuses that entry
(typing an entry's name completes to it; a drawing that matches a coded
definition carries its program), and the model's brief lists what the
library holds so it may answer `{"reuse": name}` instead of writing.
Reused code says where it came from (`from`). A program the human asked
for runs on arrival; one that arrived any other way waits for play.

### The model holds a pen (the conversation benchmark's other half)

> `agent.draw()` in `participants/agent.ts`; `strokeFor` / `parseShapes` in
> `session/synthesize.ts`; *Ask it to draw…* in the palette.

A model contributes **marks**, not only words. It says what it would add in
the shape rung's closed vocabulary — rectangle, circle, triangle, line, arrow,
with coordinates in canvas units — and the engine draws each one through
`addStroke` **attributed to the model**, so the mark gets the same fingerprint,
readings, snap offer and eraser as a human's, and the surface colours it as the
model's. Its `why` for each mark is placed beside it with `session.answer()`,
so the reason is visible and erasable too. **A drawn shape is declared
content** (`addStroke(…, { content: true })`): it is never read as a lasso, a
command mark or a scratch, because those are commitments and no tier commits —
the first real run had a model's arrow cross a box three times and erase it.
The rule is about what was declared, not who drew it; an agent driving
`addStroke` without the flag can still gesture (v6 same-class citizenship).
The vocabulary is closed on purpose:
a model that can only draw what the canvas can read makes marks the human can
argue with on the same terms as their own. `parseShapes` drops anything outside
it and caps the count (`MAX_DRAWN`). The brief it draws from is the same one
generation gets, plus the measured span of what the human pointed at.

**The rules that make tiers safe:** LLMs receive structured geometric data
(fingerprints, spatial graph, library context) — **not screenshots**. Every
tier *proposes*; no tier commits — a model's output is an unblessed, attributed
edge that the human blesses or ignores. LLM calls must never block drawing;
degrade to Tier 0, never gate on a tier.

## Working with the Codebase

### metamedium-core (the engine — start here for recognition/engine work)

```bash
cd metamedium-core
npm install
npm test         # full suite incl. the canonical-loop scenario (keep green)
npm run typecheck
npm run build    # ESM + d.ts → dist/
npm run build:browser  # IIFE bundle; a copy is committed at Demos/metamedium-core.browser.js
npm run build:node     # ESM bundle for Node; a copy is committed at Demos/metamedium-core.node.mjs
```

After engine changes, rebuild both bundles and re-copy them to `Demos/`
(`Demos/session-engine.html` runs the browser one; the MCP hand, the relay's
test and the smokes run the Node one) — CI fails if either committed copy
drifts from source. After surface changes, run
`node Demos/build-surface.mjs` and commit `Demos/session-engine.js` with the
fragments — CI checks that too, and the build refuses a name declared at the
top of two fragments.

`src/session/session.scenario.test.ts` is the executable spec for the
no-modes flow (lasso → check → summon → bless → artifact). Change it knowingly
or not at all. Design rationale: `ARCHITECTURE-v6-SESSION-ENGINE.md`.

### Standalone HTML demos

Self-contained single files (inline CSS + JS). Edit directly; test with
`python -m http.server 8000`. They are large — read selectively (search for
function names / UI strings) rather than loading whole files.

### Web App Skeleton (React/TypeScript)

```bash
cd "Web App Skeleton"
npm install
npm run dev      # development server
npm test         # vitest (geometry, recognition, spatial — keep green)
npm run lint     # 0 errors required; `any` warnings allowed until core extraction
npm run build    # typecheck + production build
```

Structure: `src/components/` (Canvas, SuggestionPanel, LibraryPanel, …),
`src/core/` (recognition, spatial, matching), `src/llm/` (heuristic + Claude
interpreters), `src/types/`, `src/test/` (synthetic stroke generators for
tests). Recognition changes must keep the vitest suite green — it encodes the
thresholds, which is why no document restates them.

### Experiments

See `EXPERIMENTS.md` for what each one is for. Two have real toolchains:

```bash
cd lens-canvas && npm run dev   # Vite on :5173; npm test → 19 vitest tests
cd v2-poc                       # esbuild; src/main.ts → bundle.js (committed)
```

`v2-poc/src/main.ts` was recovered and committed in August 2026 — an old
`.gitignore` rule had hidden it, leaving only the built `bundle.js`. Both are
in the repo now.

## Technical Specifications

**Performance targets:** drawing latency <16ms (60fps); heuristic recognition
<50ms per stroke; LLM tiers asynchronous and non-blocking.

**Data limits:** max 500 points/stroke, 50 strokes/composition, composition
depth 5, library 100 items.

**Artifact sandbox:** live artifacts render with `sandbox="allow-same-origin"`
and deliberately **not** `allow-scripts` — same-origin is what lets ink
hit-test into the artifact's DOM, and granting both is the known escape. See
MVP.md risk #5.

**Browser support:** Chrome 100+, Safari 15+, Firefox 100+. Touch + mouse.
WebLLM features require WebGPU.

## Design System

> **Source of truth: `brand/tokens.css`.** Every MetaMedium colour, face, size
> and spacing value is defined there and nowhere else; `brand/styleguide.html`
> is the living specimen, and `brand/README.md` has the four laws and how to
> adopt them on a surface. Don't restate a hex here — that is how three
> palettes happened.

The four laws, in short: **paper first** (light is the design — a *warm* ground
under cool sea ink; dark is the same tokens inverted and deliberately the less
colourful of the two, a neutral grey room; no rule below the token layer may
branch on theme); **one face** (IBM Plex Mono carries display, prose, UI and
code); **colour is signal, not decoration** (never an accent bar, and exactly
one categorical scale — `--thread-*`, for the timeline's lineages); **ink is
never covered** (a derived form draws in front with the hand's ink beneath).

**Status: v1 draft, 3 Sept 2026. `index.html` is fully migrated** — tokens,
typeface, figures, diagrams, timeline, hero and footer. The demos have not moved:

| Surface | Carries today | Moves to |
|---|---|---|
| `index.html` (whitepaper v5) | **migrated.** Warm paper · sea ink · teal keyword · IBM Plex Mono throughout · signal colours · `--thread-*` badges · one plate/padding/caption per figure · the hero and footer on the canvas ground · paper/canvas switch in the bar (`?theme=` shares a surface) · the sketchbook gallery as one stage + a thumbnail strip (the lightbox feeds off the same strip) · set grids for rungs/roadmap/scenarios (`.grid-band`, cols 2–3 on desktop, one column on a phone) | — |
| `Demos/`, flagship demos | `#0a0a0f` · `#e8e4d9` · gold `#c9a84c` · Space Grotesk | the canvas ground; the gold retires |
| `lens-canvas/`, `manim-explainer/`, `playground.html` | `#020a12` sea-deep · cyan `#7dd8f7` · gold `#d4af37` · JetBrains Mono | **left alone** — this is johnhanacek.com's language, not MetaMedium's |

Recognition feedback in the unmigrated surfaces (accepted `#0066ff`, pending
`#666666`, green/orange confidence) maps onto `--sig-read`, `--sig-held`,
`--sig-high` and `--sig-mid`. Green becomes teal deliberately: green reads as
*pass*, and a confident reading is still only a reading.

**Figures are a component, not a per-figure decision** (`brand/styleguide.html`
§11). A figure is a plate and a caption sharing one padding behind one hairline;
the caption's first child names the figure. A diagram is drawn in the diagram
rung's own roles — container, node, edge, label, annotation, plus keyword and
machine — so its CSS classes are the only place its colours live. Diagram type
is one scale in viewBox units (title 26, node 20, label 17, micro 14, tiny 12),
which only works because every diagram is authored 1000 units wide.

> 📌 **Pinned, still John's:** whether the wordmark keeps its two-tone split,
> how far the canvas ground travels into `Demos/` before the gold goes, and
> whether the whitepaper's prose moves to IBM Plex Mono — mono at that length
> changes how a published page reads, so it is a decision, not a refactor. The
> whitepaper stays on paper even when it embeds a dark demo — that seam is
> deliberate (see `WHITEPAPER-v5.1-PLAN.md`).

## Development Philosophy

- **Ship something visible weekly** — no infrastructure-only weeks
- **Simple first** — build the simplest thing that works; refactor when patterns emerge
- **One core, many surfaces** — recognition logic belongs in `metamedium-core`; demos consume builds
- **Progressive enhancement** — heuristics always work offline; LLM tiers enhance, never gate
- **Experiments feed the platform** — they may fork and re-implement to move fast, but a proven idea lands in core with tests, and experiments never become the focus (`EXPERIMENTS.md`)
- **One definition, one home** — a threshold, a palette, or an inventory lives in exactly one place; everything else links to it
- **Keep CLAUDE.md current** — update it in the same PR as any structural change

## What to Preserve When Evolving

- Fingerprinting system and geometric utilities (expanded, not replaced)
- The `context` array (kept for compatibility as `components`/`basedOn` grow)
- Published URLs — retire old demos to `archive/` with redirects, never break links
- The whitepaper's claim-to-demo honesty: only link demos that actually show what the text claims

## Common Pitfalls

1. Don't fork the monolithic demos again — converge on the core (ROADMAP.md)
2. Don't let LLM calls block the drawing loop
3. Don't over-engineer ahead of a shippable demo (MoE/embeddings are deferred — see ROADMAP.md)
4. **Don't restate thresholds in prose.** They lived in ten documents and
   drifted; this file's own copy went stale twice. Cite
   `metamedium-core/src/*.ts` instead. The one intentional mirror is
   `skills/metamedium-code/skill.md`, which Claude Code loads standalone —
   re-verify it against the engine when recognition changes
5. The legacy monoliths (`doodle2-canvas.html`, `metadoodle1.html`,
   `Web App Skeleton/src/core/`) still carry their own diverged recognition
   copies. Read the file you're editing; land new logic in core

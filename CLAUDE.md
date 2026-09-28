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
(`Session.isMine`; L2i, the phase's follow-up); undo takes back this
hand's own last act — one event, or a tool's whole act — never another
hand's, whatever the merge put last (`Session.lastAct`; L2j, R4d's
finding); one Enter is one act
(`09-palette.js`) and `fitAll` fits the content (`01-view.js`; L2d). CI runs what exists
(`.github/workflows/ci.yml`) — the relay's test, the surface build's guard
against a function declared in two fragments, and a WebKit smoke that takes
a pill — and both bundles equal a fresh build (L3). Beside them: the maths core (`src/maths/`), the
extraction spike's *not yet* (`gliner-seat/`) and the performance baseline
(`PERF.md`). **Phase 1, the backbone, is done on `w2`: B1** — every affordance
the field shows is an offer from a registered tool, one file and one
registration line each (`src/tools/`; *Tools*, below) — **B2**: what
stands beside the hand lifts what it makes likelier, says why, and the top
offer holds steady in one context (`src/context/`; *Context*, below) — **and
B3**: a board uses a library pack by one event in its log, and what the pack
ships is matched there as if taught, attributed to the pack
(`src/packs/`; *Library packs*, below). **Phase 0b, a board
that holds, came first, ahead of the backbone**, because `PERF.md` measured that 500 marks are usable once open,
2,000 take 100 s to open and freeze the page for 7.6 s on every stroke,
5,000 do not open, and autosave stops saving, in silence, at 1,100–1,600
marks. On `w2`, R3 keeps the board, R4b holds 2,000 marks in the engine and
R4c in the surface: the 2,000-mark board opens in 0.49 s and draws a
stroke's reading 16 ms after the release, its budgets a gate scenario.
**R6 made the pencil work** (A10, by hand on an iPad, is `QA-v1.md` §A10):
the pen draws with its pressure kept, a finger pans, a palm is nothing, a
pencil's hover is a hover, and the field stays above an on-screen keyboard
(*Pen, finger and palm*, below); WebKit runs a scenario of fourteen records,
not only the smoke (`pencil`, in the gate and CI).
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
`Demos/session-engine.e2e.js` drives 315 records through the real UI (314 checks and one honest skip, 25d, on 28 Sep; headless with the shard's three scenarios via `node e2e/run.mjs`, which CI runs): page, flowchart, handwriting (read only when asked; a line read as one), the model drawing, the user-side loop, selection and the field, corrections, the worker, the tank, words into verbs and acting out, frames and the drawn slider, the folder, pictures, text, the moment, a live room (and ids that hold in it: an undo sent, one sitting per page load, a doubled name and a truncated room said), a playing frame that takes the pointer, hold by long-press, the graph in 3D, and the foundations (letters at any size, a mark that crosses, readings that stay, the minimap), the explanation plane's layout, one Enter one act and what `fitAll` fits, labels (a hand's and a person's, on their own ink only), who made what, gestures per hand in a room, a person the same across a reload, and what a paint reads (R4c: at eighteen points the board painted both ways and every mark's role compared with the whole-board read; the reading under a mark, a neighbour's panel, a chip and a card following the log the moment it changes, undo, a move and another hand's line included; a pointer move that paints no board, a wheel that paints once a frame), and the field's offers (B1: e2e 49, the golden record of what the field offers three scopes — a row of boxes, a molecule, a line of writing — captured before tools; a tool registered in one line, offered at once), the steady top beside a flowchart (B2: e2e 50), and library packs (B3: e2e 51 — basics@1 used from the packs pane, the canonical molecule named with nothing taught and its pack said, stopped, undone, the golden unchanged on boards with no pack, a pack the build lacks said, the flowchart's ports on the pen). A run takes about 100 s; run it **in its own tab on its own origin** (`http://127.0.0.1:8010/…?fresh=1&nosw=1` — `__setup` refuses any other URL: it replaces `fetch` with a stub, joins a stub model named `e2e-stub`, and wipes the origin's saved board), start it with `__setup(); __scenario().then(r => window.__R = r)` and read `__R` when it lands.
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
  column (the engine holds all three boards: 2,000 replay in 0.24 s, a
  stroke in 0.15 ms, 12 MB) and R4c's (the surface holds 2,000: open 0.49 s,
  a reading 16 ms after the release, a pointer move 0.2 ms, a pan one frame
  at zoom 1 and two at fit-all; 5,000 opens in 1.09 s)
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
| `metamedium-core/` | **The canonical engine** (TypeScript, zero deps, tested): geometry, recognition (the shape rung), relations, the diagram rung (`src/diagram/`), notations over it (`src/notations/`: the flowchart, Mermaid out and in, and a layered layout), concepts, the no-modes session engine, the layout and graph parsers, maths (`src/maths/`: quantities, expressions, the sheet, dimensions, solving figure by figure, true size and tiled print), the participants — a model's prompts and parsing, the router, the bridge, and **the decision seat** (`src/participants/decide.ts`, tier 1½; under *Tiered LLM Interpretation*) — **the tools** (`src/tools/`: what the field affords, one contract and one registry; under *Tools*), **the context** (`src/context/`; under *Context*), **the library packs** (`src/packs/`: the format, the validator, the shipped packs by `id@version`, `use`/`unuse`, the bench; under *Library packs*) and the LLM transport. New recognition/engine work lands HERE |
| `index.html` | **Interactive whitepaper v5** "MetaMedium: AI Beyond Chat" (live on GitHub Pages). Fully on the `brand/` system as of 3 Sept 2026 — its `:root` is `brand/tokens.css` under the names this page already used, so change a value THERE first |
| `brand/` | **The visual system, one home**: `tokens.css` holds every MetaMedium colour, face, size and figure/diagram token; `styleguide.html` is the living specimen (light paper first, IBM Plex Mono throughout, teal keyword, colour as signal, §11 figures and diagrams, §12 long-form furniture). v1 draft — the whitepaper's **figures** have migrated, the page around them has not; `brand/README.md` carries the four laws, the convergence order, and what applying it to the whitepaper taught the system |
| `doodle2-canvas.html` | **Flagship demo**: heuristic recognition, spatial graph, library, undo/redo, touch. No LLM. Single-file (~500KB) |
| `metadoodle1.html` | Fork of flagship + tiered LLM recognition (WebLLM in-browser, LM Studio local API) + voice. Single-file (~600KB) |
| `Web App Skeleton/` | React + Vite + TypeScript + Zustand rebuild; Claude API interpreter skeleton in `src/llm/`; recognition/spatial/matching in `src/core/` |
| `Demos/surface/` | **The reference surface's source**: `surface.css` and twenty-nine script fragments (`00-core`, `00-ui` … `20-controls`, `21-minimap`, `22-boards`, `23-packs`, then `90-boot`, which must stay last), one concern each, concatenated in name order into one closure by `Demos/build-surface.mjs` → the committed `Demos/session-engine.js` (CI checks it has not drifted). Because they are one closure, the build and its `--check` refuse a name declared at the top of two fragments — the last would silently replace the first everywhere, which broke rendering once — reading the fragments as one strict block, so they must also compile as strict code (`Demos/build-surface.test.mjs`, in CI's `core` job). Fragments share the closure's variables — no imports; each fragment's header says what it provides and uses. Edit a fragment, run the build, commit both. **`09-field.js` is the exception that proves the rule** (SEAM-1): it names nothing outside itself, so the field's query is a pure function of a record and is unit-tested in Node with no browser — `node --test Demos/surface/09-field.test.mjs`, in CI's `core` job. **`17-board.js` is the second** (V1-PLAN R3): the journal the board this browser keeps is written through, driven in Node by a store held in memory — `node --test Demos/surface/17-board.test.mjs`, in CI's `core` job too. **`17-boards.js` is the third** (R1): the list of boards — names, the trash, which board a page opens, whether the one on screen may be left — `node --test Demos/surface/17-boards.test.mjs`, also in CI. **`07-hand.js` is the fourth** (R6): the hand's rules — what a pen, a finger and a palm do, and the hand tile's face and cycle — `node --test Demos/surface/07-hand.test.mjs`, also in CI; `07-input.js` is its adapter. A fragment's `.test.mjs` is not concatenated into the build. `09-palette.js` is the adapter over core's tools (B1): it reads the readings, maps `MM.offersFor` to pills and performs what only the surface can, and builds no affordance by hand |
| `Demos/` | **`session-engine.html` is the MVP surface** (it links `surface/surface.css` and loads `session-engine.js`) — infinite canvas, the taught command mark, living artifacts in a DOM overlay, ink-over-artifact addressing, "why" inspector, model participants, canvas answers. Uses the committed `metamedium-core.browser.js` bundle. **`session-engine.e2e.js`** drives the whole loop through the real UI with a stubbed model (browser console; not part of `npm test`). `build-standalone.mjs` inlines the bundle into a single shareable file (and exports the same build as `standalone(dir)`, which the release script attaches to a release). **`sw.js` is the service worker for both addresses** — this one and `/app/` — copied to `app/sw.js` by `scripts/build-app.mjs`, which stamps `VERSION` into it and into the page's `<meta name="metamedium-version">` (*One app address*, below). **`mcp.mjs`** is the MCP hand (Claude Code's way onto the board; `.mcp.json` at the root registers it), over `relay.mjs` and `live-node.mjs`, with `ink-png.mjs` for the ink as a picture and `mcp-smoke.mjs` as its stdio test; `metamedium-core.node.mjs` is the committed Node bundle it runs (`npm run build:node`, drift-checked in CI like the browser bundle). **`relay.test.mjs`** is the relay's own test (`node --test Demos/relay.test.mjs`, in CI's `core` job): the catch-up as a pure function, and, over a real relay on a free port, the truncation line and three hands with one departed. `Demos/programs/` holds `run` programs written for the canvas (`metamedium-explained.run.js`: the loop told as a program, ending on a real measurement of the viewer's own stroke). Plus fish, composition diagrams, no-modes graph, etc. |
| `app/` | **The app — v1's one address, `https://jjh111.github.io/MetaMedium/app/`** (V1-PLAN R7). Made, never edited: `index.html` is `Demos/session-engine.html` with each file it asks for asked for from `/app/` (`../Demos/…`), `sw.js` is `Demos/sw.js` byte for byte, `manifest.webmanifest` is the old address's starting and scoped at `./` — all three written by `node scripts/build-app.mjs` and drift-checked in CI (`--check`). Installable there, and it opens with no network after one visit. `Demos/session-engine.html` stays where it was and works as it always has |
| `VERSION`, `CHANGELOG.md` | **The version, one line** (`MAJOR.MINOR.PATCH`, an optional pre-release; `0.0.0` until the first release) — stamped into the page and both service workers' cache names by `scripts/build-app.mjs`, said at the head of the help pane. **The changelog**, newest first, one section a release, written only by `scripts/release.mjs` |
| `scripts/` | **The app's build and the release** (V1-PLAN R7): `build-app.mjs` (stamps `VERSION`, makes `app/`; `--check` in CI) and `release.mjs` (`node scripts/release.mjs <version> [--dry-run] [--since <ref>]`: refuses a dirty tree and a version not greater than the last, writes the changelog's section by unit, bumps and stamps, builds the standalone file into `dist/release/`, commits, tags `v<version>` annotated — and never pushes). `build-app.test.mjs` and `release.test.mjs` are theirs (`node --test`, in CI's `core` job) |
| `skills/` | Claude Code skills: `metamedium-code` (code patterns), `metamedium-design` (design principles) |
| `Assets/` | Figures and design rationale (recognition strategy, point-primitive proposal), and the social card. `make-card.mjs` regenerates that card from index.html's own hero — synthetic pointer input, so the picture shows the engine really reading a mark; `node Assets/make-card.mjs`. Change the picture and you must change the FILENAME and the four og:/twitter: tags in `index.html` and `404.html`, because scrapers cache by URL. **`Assets/whitepaper-figures/`** is the whitepaper's seven graphic plates: `build.py` holds their content and geometry and emits the static blocks `index.html` carries between `whitepaper-plate:KEY` markers (`--check` says they are in sync), `figures.css` and `figures.js` style and enhance them with no build, and `e2e/whitepaper-figures.mjs` audits the real page; its README is the workflow |
| `archive/` | Retired versions and superseded plans, incl. whitepaper v4 (root `MetaMedium_Whitepaper_v4.html` is a redirect stub — keep it) and PRDs v3.2/v4 |
| `e2e/` | **The browser gate** (`DIRECTOR-REVIEW-2026-09-15.md`, QA-1): `node e2e/run.mjs` starts its own servers on free ports (a static one over the repo root, vite over `shard-3d`), opens a **fresh browser context per scenario**, loads the harnesses that already exist — `Demos/session-engine.e2e.js` (`__setup` + `__scenario`) and `shard-3d/e2e.js` (`__scenario`, `__demo`, `__demo2`) — and awaits the result object each one returns. It does not reimplement them. **Nine scenarios** on Chromium by default (`canvas`, `keep`, `boards`, `app`, `pencil`, `budgets`, `shard`, `demo`, `demo2`): 546 passing records and the one honest skip as of 28 Sep 2026 (canvas 314, keep 31, boards 20, app 14, pencil 14, budgets 7, shard 123 + 11 + 12), in about 230 s. **`budgets`** (`e2e/budgets.mjs`, V1-PLAN R4c) paints the bench's 500-mark board both ways, every mark pointed at, boxes drawn and undone, and every mark held (`paintCheck`, `rolesCheck`, `heldCheck`: a hand's paint must draw and say what the whole-board read would), then measures PERF.md's budgets on the 2,000-mark board — open, release → reading drawn, a pointer move, a pan at zoom 1 and at fit-all — each a step with its number, **skipped by name** on a machine too loaded to measure or slower than the one they were set on (a calibration in the page). Beside them, **`smoke`** is opt-in and runs on WebKit (`node e2e/run.mjs --browser webkit smoke`): the board loads, ink drawn with real pointer input is read back, press-and-hold opens the field and one pill is taken — four checks in `run.mjs` itself, a WebKit smoke and not an iPhone test. CI's `webkit` job runs it with `pencil` and `keep` (`--browser webkit smoke pencil keep`, `npm run webkit` in `e2e/`, about 30 s). **`pencil`** (`e2e/pencil.mjs`, V1-PLAN R6, in the default run and on WebKit; 14 records, about 10 s) is the canvas by pen and finger at an iPad's size: a pen and fingers synthesised in the page as iPadOS delivers them (`pointerType` `pen` with a pressure and a tilt, `touch`), and the on-screen keyboard as iPadOS tells the page (a stand-in `visualViewport`, installed before the page's scripts, that shrinks) — the pen draws with its pressure on every point, the switch said once, a finger pans, two pinch and leave nothing in the log, a palm during, just after and just before the pen is nothing, the pencil's hover shows the reading and the magnet, the field by the pen's hold and a pill, a clean, an undo, the field above the keyboard with every pill scrolled to and hit, the hand tile round, the mouse untouched, a save and a reload; `QA-v1.md` §A10 is what only an iPad can say. Pass, fail and **skip** are counted separately (a record whose name says it skipped is a skip); a failed assertion, a harness exception, an attempted request to a real model, or a page error not on the named allowlist in `guards.mjs` each exit nonzero, with structured JSON and a screenshot in `e2e/results/`. Beside the gate, on its static server and never run by it or by CI: `e2e/perf.mjs` (the surface's half of `PERF.md`, numbers, each budget said within or over — measured with the gate's own `budgets.mjs`) and `e2e/whitepaper-figures.mjs` (the plates' audit, Chromium and WebKit). **`keep`** (`e2e/keep.mjs`, V1-PLAN R3) loads no harness: the kill test (the page crashed or closed at random points, reopened, every completed stroke there), a save forced to fail, the one import of browser storage's old board, two tabs, and the pages that must not write — in the default run, and on WebKit where it can (`--browser webkit keep`, in CI's `webkit` job since R6: 22 records and 3 skipped by name — the quota is Chromium's to force); **`big`** (opt-in, minutes) saves and reopens a 2,000-mark board. Since R1 the kill test keeps two boards and switches between them through the boards pane mid-session, killing right after a switch and in the middle of one. **`boards`** (`e2e/boards.mjs`, R1, in the default run) drives the boards pane with the real pointer: the old board as the first entry, new, switch, reload and `?board=`, rename, duplicate, delete, restore, emptying the trash said first, a board open in another tab, one tab per board, the view per board, recent places, Reset, a board out as a file and back, a board that is not saved never left without a word, and a library pack kept with its board through a reload (B3). **`app`** (`e2e/app.mjs`, R7, in the default run; 14 records on Chromium and WebKit, about 10 s) opens `/app/` on the gate's static server: every file it asks for answers, the manifest starts and is scoped there (and Chromium finds it installable), the worker's scope covers the page and the page is *controlled* by it, a box drawn comes back on a reload the worker served and with the server gone, the help pane says `VERSION`, a request carrying a key is never kept, the old address and every address the whitepaper, `404.html` and the README link still answer — and a release renames the cache, beside a control that shows the stale shell a cache that kept its name serves. `e2e/README.md` has the rest |
| `PERF.md`, `metamedium-core/bench/`, `e2e/perf.mjs` | **The performance baseline** (V1-PLAN §9 R4a, 27 Sep 2026): `bench/board.mjs` draws deterministic boards of 500, 2,000 and 5,000 marks from a seed (the generator is kept, never the boards); `bench/engine.mjs` times replay, memory, relations, the whole-board read, one more stroke, a live room's incoming line and a newcomer's hello; `e2e/perf.mjs`, beside the gate and on its servers and model guard, times the surface — open, pan, draw, release → reading drawn — in Chromium and WebKit; `bench/profile.mjs` reads a CPU profile back to `src/…:line` and the surface's fragments; `bench/report.mjs` prints `PERF.md`'s tables from the results. `PERF.md` has the answer (500 marks usable, 2,000 not, 5,000 does not open), every number with its command, the hotspots ranked with file:line, and budgets for R4b — and, after R4b, the engine's numbers beside them. **R4b added** `bench/budgets.test.mjs` (`node --test`: the engine's budgets on the generated 2,000-mark board — replay ≤ 0.5 s, a stroke ≤ 4 / 16 ms, ≤ 150 MB — and the 5,000 board replays; each size in a process of its own, every run's numbers recorded in `dist/bench`) and `bench/equivalence.mjs` (every held log, a scripted log of the rarer acts and the 500-mark board replayed by the old engine — a committed bundle at `--ref` — and by `src/`, every reading and id compared, and what differs said). Not in `npm test` (`vitest.config.mjs` keeps `bench/` out) or the gate. **R4c added** the surface's column, and its budgets to the gate: `e2e/budgets.mjs` (what `perf.mjs` and the gate's `budgets` scenario both measure with) **R4d added** `bench/room.test.mjs` (`node --test`: a live room's budgets on the 2,000-mark board — a line ≤ 16 ms at p95 with no full replay, one crossing a mark just drawn too, a line that lands earlier from a checkpoint, a line with no events no work, a newcomer's hello one copy of each log in rooms of three and six with a hand gone — measured by `bench/room.mjs`, whose `--path=before` is the surface before R4d). |
| `.github/workflows/ci.yml` | CI, on every push/PR: typecheck + test + build for `metamedium-core` — with the drift check for both committed bundles, the MCP hand's smoke, the surface's drift check and its build's test, the field reader's, the hand's rules', the relay's, the board journal's and the board list's Node tests, the app's drift check (`scripts/build-app.mjs --check`) and the app build's and release script's Node tests — `shard-3d` (with its MCP hand's smoke) and `Web App Skeleton` (with lint); the **browser gate** (`e2e/run.mjs` on Chromium); and **WebKit** — the smoke, `pencil` and `keep` (`--browser webkit smoke pencil keep`) — in a job of its own. Both browser jobs upload `e2e/results` when they fail |

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
| `shard-3d/` | **Live · the plan's MVP line (P0–P6) + the compass + the review's four shard packages + push 2 (G0–G5)** — a bounded MetaMedium for making things in space: ink on a plane read by the shape rung in that plane's own units, a form rung, solids as **op trees in the log** (the tree is the source, the mesh is derived), the diff as the brief, definitions and placements. **Push 2 is geometry from the drawing** (`SHARD-3D-PUSH-2.md`): the board goes out and comes back as its own core-format log; every free stroke is a **silhouette claim**, so a footprint plus ⊓ drawn from wherever the hand stood stands a **hull** at tier 1, in the volume its claims define; the hull is cut into **parts** with ids and a sentence each; the brief a small model can answer is 1048 characters and its reply names parts by id and never writes geometry; and `shard-3d/mcp.mjs` is the shard's own MCP hand **and the model seat** — Claude Code answers the parked brief and the shard applies it as it would a model's (`.mcp.json`, `metamedium-3d`). **`shard-3d/README.md` is the single source** for how it works, what it does not do, what core would need, and the fixtures; don't restate it here. `npm install && npm run dev` in `shard-3d/` (vite on :5174); `?demo=castle` runs the whole loop on John's own drawing at boot and `?fixture=<name>` loads a board from `shard-3d/fixtures/`; `npm test` is vitest on the pure rungs (606 in 31 files on 27 Sep); the engine is imported from source, so there is no bundle to drift |
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
circumference and area; a rectangle's sides — at whatever angle it stands,
never its upright bounds, width the side nearer level — perimeter and area,
and a leaning box's lean (D2); a line's
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
marks that drew them — is filled by one closed stroke (`figureOfMark`; a
box drawn leaning, whose clean form keeps its `lean`, is a quadrilateral,
never a rectangle, whose rules assume right corners) and, for lines
meeting, by `polygonFigure`. Each drawing gets a unit (its labels',
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
  at its own size when they would grow it. **And its lean** (D2): a box
  whose sides lean past `LEAN_KEPT_DEG`, parallel in pairs
  (`LEAN_PARALLEL_DEG`), is redrawn as the parallelogram it was drawn as —
  each side fitted along the ink (`leaningBox`), the tightest such
  parallelogram holding the ink — so a flowchart's data symbol stays data;
  as its upright box it was a process. **A bend is not a line**: a line
  is offered only when its ink stands off the straight line through its ends
  no further than a hand's line bows — half of a two-stroke diamond,
  straightened, made the decision a triangle. **An arrow keeps its barb**,
  at most a fifth of its shaft, so its clean form reads back as an arrow.
- **Zero wrong snaps over the whole corpus** is pinned in `clean.bench.test.ts`,
  alongside ≥95% offered for every drawable shape and 0% for writing — and,
  since S1, turned boxes (every one drawn clean at its own angle), arcs of
  30°–300°, and **every clean form, drawn again as ink, reads as the shape it
  cleans**. The flowchart bench draws every board clean and reads it again:
  every decision stays a decision, and every data symbol stays data.

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
Play A, Not a molecule …, ranked by the reading, by use and by what stands
beside them, the rest a keystroke away: each an offer from a registered tool
(see *Tools* and *Context*, below). A word typed, or writing read, is offered two ways side by
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

### Tools: what the field affords, one contract (V1-PLAN §2.1, B1)

> `metamedium-core/src/tools/` — `tool.ts` (the contract), `registry.ts`,
> `rank.ts`, one file per built-in tool, `builtin.ts` (the registration lines).

**Every affordance the field shows is an offer from a registered tool.** A
tool is `{ id, name, describe(), reads?, offers(scope, ctx), completes?,
take(offer, scope, session, at) }`; an offer is data — a `key` (unique in a
field, and what a device's learned use is counted under), a `label`, a
`reason` (the tooltip), a `base` likelihood, its `tool`, `asks: 'model'`
(the dot; never taken automatically, and never leading), the `grounds` it
stands on (`known`, `written`, `proposed`, `clean` or a concept's name —
said after the reason, and what makes it specific to these marks),
`verbs`, `hidden` (typed, never a slot), `lead` (stands with the readings:
*Fold “…” into the text*), and `data` for its take. `offersFor(scope, ctx)`
asks every tool in **registry order** — `builtin.ts` registers the
seventeen built-ins in the order the field always built its pills, which is
the tie-break between equal offers — each key once; `completionsFor` is
what typed text completes to (*Name it*, *Label it*, words told to a
definition), each `place`d rather than ranked. `rankOffers(items, uses)` is
the palette's old `baseLikelihood` as a pure function — `baseOn(grounds)`,
a model's 0.85, learned use lifting a generic item up to 1.25 and never a
specific one — with the device's counts handed in: core reads no storage.
**Readings are not offers**: what the marks ARE (a name given, the words
written, a model's reading, the concepts) is read in the surface, ranked by
the same function, and stays the top row. A **scope** (`toolScope`) is the
summon, its marks, `session.read` of them, what is typed, and a `ToolHost`
— what only the host knows: the snap preference, the models, what is read
or flipped, where texts stand. **Taking** an offer goes through
`takeOffer`, which stamps every event the tool writes with `tool` and
`offer` (its key) — `session.withTool`, beside authorship in `dispatch`;
replay ignores both, and context (B2) reads them as what the hand just took
where. An act only a host can do — ask a model, open the editor, flip a
text, hold a clip — comes back named (`Taken.host`) and the surface
performs it inside the same stamp. **What the outermost `withTool` writes is
one act** (L2j): its events carry one `act` number and one undo takes them
all back, the field the tool closed first excepted (*Live logs*, *Undo is
per hand*). `Demos/surface/09-palette.js` is the
adapter: `conversionsFor` reads the readings and maps `offersFor` to pills,
`takeOffer` performs (`HOST_ACTS`, `TOOL_ACTS`); nothing in it builds an
affordance by hand. The registry changes offers with no event in the log,
so it says so (`toolsVersion`, `onToolsChange`) and an open field offers
again. `describeTools()` lists the tools, `here()` is `HERE` with the
canvas's own tools named on every prompt that carries it, and the models
pane lists them as what the canvas does with no model. **A new tool is one
file and one registration line**: e2e 49b registers one while the field is
open and it is offered at once; e2e 49 is the golden record of the field's
offers for three scopes, captured before tools and unchanged since.

### Context: what stands beside the hand lifts, and the top holds (V1-PLAN §2.2, B2)

> `metamedium-core/src/context/` — `context.ts` (`contextAt`, `nearnessOf`,
> `describeContext`), `rank.ts` (`rank`, `liftOf`, `liftTargets`, `steadyTop`,
> `canLift`); the surface's side in `Demos/surface/09-palette.js`
> (`contextFor`, `rankItems`, `steadyTops`, the per-context use counts),
> `08-render.js` (`readingUnder`) and `10-inspector.js` (*beside*, *first*).

John asked for it directly: *keep the suggested top offer in that context
when near — conceptual adjacency can bias the top suggestion.* Two boxes
held beside a flowchart lead with *Draw them clean*; the same two beside a
row lead with *Line up across*; a board away from both, the order is B1's.

**`contextAt(board, ids | point)`** reads what a scope sits **beside**, never
its own marks (those already set every item's base, so a scope with nothing
beside it reads an empty context — which is why e2e 49's golden is
untouched). Every mark within the fade of the scope is found through a
`MarkGrid` of the content plane, and each is walked outwards by
within-reach links (`withinReach`, the links the session clusters by; the
scope left out; `NEIGHBOURHOOD_MAX` marks, nearest first) into **the thing it
hangs together with** — a box beside a flowchart is within reach of one
process at most, and the flowchart is what that process hangs with. Each
neighbourhood is read on its own: `notationsOf` above `NOTATION_FLOOR`
(*it sits beside a flowchart: three processes, one decision, three flows*)
and `session.read`'s concepts (*it sits beside a row: 3 comparable marks
sitting side by side*), each weighted confidence × **nearness** — 1 inside
`near`'s own limit (a ratio of the smaller mark), fading to 0 at
`CONTEXT_FADE` times it, so the same board at any scale reads the same.
`recent` is this hand's stamped acts (B1's `tool`, `offer`, `act`) whose
marks lie beside the scope or in a neighbourhood it touches, fading over
`RECENT_MS`; an act on the scope itself is not beside it, and another hand's
is not this hand's. `kind` is the strongest notation, else concept; `key`
adds its neighbourhood's first mark. `now` is the log's own latest time, so
a context is a pure function of the log. About 1–2 ms on the 2,000-mark
bench board.

**The five rules, and where each lives:**

1. **A lift, never a filter** (`rank.ts`). `rank(items, ctx, { uses,
   usesHere })` is `rankOffers` × a lift of at most a quarter again
   (`CONTEXT_LIFT_MAX`); nothing is removed. An item lifts when it stands
   on an entry's own name — `grounds.on` (a conversion's concept), a
   `concept:` reading, a `notation:` tool — or on what the library packs
   the board uses say the entry makes likelier (`ctx.affinity`, handed in by
   `contextAt` from `state.packs`: content, carried by the packs since B3 —
   `flowchart@1` says a flowchart makes clean forms and flows likelier; a
   board with no pack lifts only what stands on an entry's own name, and the
   notation is read whether or not its pack is in use — *Library packs*,
   below); an offer just taken beside the hand lifts,
   its tool's other offers half as much. **What the hand named, wrote or a
   model read here is never lifted, and no lift carries a generic item past
   it.** With no context, `rank` is `rankOffers` key for key.
2. **Every lift says why** (`because[]`, strongest first): the pill's
   tooltip ends *first because it sits beside a flowchart: three processes,
   one decision, three flows* (or *raised because …*), and the selection's
   panel adds **beside** (`describeContext`) and **first** (the top offer
   and its because). Far from any context neither appears.
3. **The steady top** (`steadyTop`; the memory in `09-palette.js`). Within
   one context the top affordance changes only when another beats it by
   `STEADY_MARGIN` (a tenth), and the held one says *it led here a moment
   ago*. The memory is runtime, never the log: per context key and board
   generation, lapsing after `STEADY_MS`. It never holds a generic item
   over a specific one. e2e 50–50c: three boxes drawn one after another
   beside a flowchart keep *Draw them clean* first (with no context the top
   flipped to *Line up across* at the second); a rival a little ahead does
   not take it, one past the margin does.
4. **Use is learned per context**: the device's counts (`mm-palette-uses`)
   gain `mm-palette-uses-here`, by kind (`notation:flowchart`,
   `concept:row`); `rank` takes this kind's count for an item first, the
   global as the fallback. Core keeps no counts.
5. **Derived only.** Context writes nothing; the surface keeps it by
   `logKey()` (R4c), so an undo can leave no stale lift.

**One `rank` for everything that orders readings**: the field's two rows
(both now in the ranked order, so the first reading shown is the one Enter
takes — the top row used to be re-sorted by its number) and the reading
drawn under a new mark (`readingUnder`: its name, its words, the shape
rung's readings, ranked). `canLift` says whether any context could lift any
of a list; nothing under a mark can today, so a stroke reads no
neighbourhood — the day a pack's reading of a mark can be lifted, the
context is read for it. The seats (J1) are to be asked their candidates in
the same order.

### Library packs: premade content, used by an event (V1-PLAN §2.3, B3)

> `metamedium-core/src/packs/` — `pack.ts` (the format, `id@version`),
> `validate.ts`, `registry.ts` (the shipped packs), `shipped/` (one module a
> pack), `synthesize.ts` and `definitions.ts` (a definition's signature from
> its drawings), `follow.ts` (a pack's notation on the pen), `bench.ts`;
> `use` / `unuse` in `session/session.ts`; the pane in
> `Demos/surface/23-packs.js`.

John asked for premade library content and concepts. **It arrives the way
the command mark does — shipped pre-taught, by the mechanism a hand's own
teaching uses — and is on a board only because the board says so.** A pack is
`{ id, version, name, describes, notation?, definitions, connectors?,
affinities? }`. A **definition** is a name and drawings of the thing —
`samples` in the shape rung's vocabulary (`DrawnShape[][]`, the pen a model
holds) and/or recorded `strokes` (`Point[][][]`) — with an optional `role`
(one of the six), `ports` (in words; ports a pen feels are a notation's code)
and `export` (`{ mermaid: '…' }`). A **connector** names a head. **Affinities**
say what an entry beside the hand makes likelier (`notation:flowchart` →
`on:flow`, `on:clean`).

**Content is code-bundled and immutable per `id@version`**: one `.ts` module a
pack under `shipped/`, exporting the JSON-shaped object, so both bundles
carry it and the shard typechecks it with no JSON import; changed content is
a new version. **Read, not trusted** (DATA-1): `validatePack` walks it once; a
pack that cannot be read says where and why and nothing of it is used; a
malformed entry is refused with its path and reason while the rest stands; a
frozen copy of what was checked is held; nothing any input is makes it throw
(`packRefusals()` is none in a sound build). Shipped: **`basics@1`** (bubble;
molecule, drawn three ways — bonds short of the circles, to their edges, three
in a row), **`flowchart@1`** (names the notation and restates none of it:
`FLOWCHART_TABLE` stays the single home of the flowchart's symbols, which
D2's writer reads; its affinities) and **`test-molecule@1`** (tests only — a
`test-` pack is never listed).

**A board uses a pack by an event**: `use { pack: 'basics@1' }` and `unuse`,
through `session.use` / `unuse`; `SessionState.packs` in the order used. They
are acts of their own, so replay, undo per hand, a room's merge and line, the
journal and the export carry them as they carry a stroke (a pack is the
board's: whichever hand used it, every merged board uses it). The door
refuses a name that is no pack's, or one this build lacks, and writes nothing
(`use` returns the sentence). On replay such a name is a **standing notice**,
`SessionState.packNotices` — derived from the log, because a notice cleared
by the next event, as `staleResult` is, would be gone before the replay
ended — never thrown: the board loads, the standing line, the *packs* tile and
pane and the MCP hand's look say it, and `unuse` lets it go.

**A definition is matched exactly as a taught one.** Its drawings are drawn
through `strokeFor` with **seeded** tremor (`handLike`: the corpus's slow
waves, FNV-seeded mulberry32, points rounded to a hundredth — the same ink on
every machine) on a scratch board of their own, and the signature the first
reads as is the definition's, the others' its accepted examples — what a
bless and a correction would make; read once per pack for the life of the
process. On the board it is a node `library:<id>@<v>:<name>`, `made-by` the
pack's own node `library:<id>@<v>` (its word the pack's name), matched by the
same `matchDefinition` and floor as the board's artifacts, after them: the
summon's suggestions, the cluster candidates and `matchesOf` carry `pack`, and
**on a tie this board's own definition leads**. *Not a …* lands on it and
outlasts an `unuse`. It is never content, an artifact, live, erased,
labelled, proposed on or written into. An instance taken from it is its own
definition (`definitionOf`) — the first molecule taken from a pack is this
board's molecule — and the pack's stays its provenance (*same as* in the
panel). A field open when the packs change reads its matches again, as a
correction's does.

**Recognition is never gated on a declaration.** A notation shipped in code
reads on every board, and `contextAt` reads every registered notation. A
pack in use ADDS: its definitions; its notation's ports on the pen
(`followPacks(board)` — the ports hook is one registry for the page, so the
page follows the board on screen: `offerPorts` on `use`, taken back on
`unuse`, its undo, or a board loaded in place); and its affinities, moved out
of `context/rank.ts` into the packs (`ctx.affinity`). **What a signature
cannot see is a notation** (the trap): a signature is rotation-free and
shape-level, so anything that needs orientation or a head kind is code in
`src/notations/<id>.ts`, and its pack names it.

**Every pack has a bench**, the command mark's pattern
(`packBench(pack, { corpus })`, `bench.test.ts`): its drawings drawn again
with other seeds, elsewhere, at 0.6× and 1.8×, must be the field's first
match; a corpus of 3,900 drawings the other benches use (the recognition
corpus, turned boxes and arcs, the flowchart bench's flowcharts, wireframes
and writing, rows of boxes, hubs, canonical molecules labelled as such; laid
out once, `benchCorpus`) must read as nothing of the pack's above the floor
unless labelled so (`is`) or of its very structure — a lone circle IS a
bubble to a signature, said as `same`, never counted. basics@1 reads 96/96 of
its own and test-molecule@1 48/48, and no pack falsely reads anything. With
basics@1 and flowchart@1 in use the 2,000-mark bench board replays in 263 ms
(257 with none) and takes a stroke in 0.16 ms (`bench/budgets.test.mjs`'s
third test).

**On the surface**: the control centre's last tile, *packs*, its face the
packs in use; its pane lists what the build ships with what each adds and
holds, *use* / *stop using* (events: undo takes them back), and any pack the
board names that the build lacks. A match from a pack says so — the field's
reading and the chip beside the group read `molecule 0.91 · basics`, the
tooltip *from the Basics pack (basics@1), which this board uses* — and the
selection's *becomes* row says it. e2e 51–51f, and the boards scenario's N17
for the journal through a reload.

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

**What the surface reads after a stroke, and what it paints** (R4c, 27 Sep
2026; `Demos/surface/08-render.js`). A paint asks one mark's role — the
reading under the mark the hand just made or is over, the panel's ladder —
and `roleOf` reads it over that mark's **neighbourhood**: the marks within
its reach (`MM.MarkGrid`, `MM.withinReach`), the ends of its wires and the
connectors wired to it, in the whole board's own order so ties in strength
fall the same way. The role table reads nothing else (its rows ask only the
engaging relations and the wires), so that is the role the whole board would
give it — never a second index with a pixel-sized cell, never a peer relation
read off `node.edges`. The board's genre, which only a live artifact's panel
asks, is every mark's role read that way; a role read over the same
neighbourhood as the last log's (the same marks in the same order, each
node's reps and edges the same by identity and length — a rep or an edge is
never changed in place) is carried forward. **Everything a paint derives from
the log is kept while that log stands, keyed by the log itself** (`logKey`:
which events array the session holds — undo and load replace it — its
length, and the event that ends it; a stale cache is worse than a slow one):
the paint's index (`boardIndex`: the rungs' scope, a reach grid, and a grid of
what each content mark *draws* — its box, its clean form's, every part's, so
an artifact is filed by its members however far they moved from where it was
blessed), the roles, the snap offers, the models' reading chips, the labels,
the candidates' boxes, the minimap's reading, the selection's reading, and
the magnet sites (read ahead while the page is idle). **Painting is culled to
the screen**: marks whose box meets it, an artifact's members one by one, an
artifact's chrome where its name reaches, chips, labels and cards that reach
it — while every chip, label and card is still measured and placed (a card
off screen still keeps its place from the ones on it; a tap and a test find a
chip wherever it is) and the minimap still shows the whole board. What the
hand is on or holds, and what a drag or a tank has moved, is drawn wherever it
is. Points under a screen pixel apart are thinned (`THIN_PX`). **A pointer
move while drawing paints the pen and not the board** — the stroke in
progress and the magnet in reach are on a canvas of their own over the
board's (`drawLive`) — and **a wheel, a pinch, a pan or a minimap drag moves
the view at once and paints once a frame** (`viewChanged`); the panel is
rewritten only when what it says changed. `paintCheck` paints the board as a
hand's paint does and as the whole-board read would (`wholeBoardRungs`, no
cache, no culling), records what each drew and said, and compares;
`rolesCheck` compares every mark's role and the genre; `heldCheck` every held
group (press-and-hold's cluster is the component the index walks to, not a
relate of every loose mark). The gate's `budgets` scenario runs them on the
bench's 500-mark board and holds PERF.md's budgets on the 2,000: open 0.49 s,
release → reading drawn 16 ms (40 at p95), a pointer move 0.2 ms, a pan one
frame at zoom 1 and two at fit-all.

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

**Mermaid out** (V1-PLAN §3, D2; `notations/mermaid.ts`). `toMermaid(reading)`
says a notation reading as Mermaid text, at tier 1, by the writer its
notation registered (`registerMermaidWriter`: the flowchart's ships, D4–D6
add theirs; a notation with none gives null). The flowchart's is `flowchart
TD`, or `LR` when the flows run across — measured between the centres of the
symbols each flow joins, with the reason — each symbol in `FLOWCHART_TABLE`'s
brackets, each flow `-->`, `---` or `<-->` with `|"…"|` for the writing
beside it. Three rules hold it: **the ids are the marks' own, said safely**
(`stroke:ada:7` → `stroke_ada_7`, a figure → `figure_6_7`; never a keyword,
and ids that would say the same take a suffix hashed from their own id, so
`qwen3:8b` and `qwen3-8b` never meet); **every label is quoted and escaped**
(`mermaidString`; `unescapeMermaid` is its inverse) — unquoted, `"`, `|`,
brackets or `(` break the parse, and Mermaid's own preprocessing reads `#…;`,
`%%` and a backtick; **writing nobody has read is written "(unread
writing)"**, never invented, its marks listed in `unread` and said in the
notes. Nodes come in the drawing's reading order and links by the nodes they
join — never the log's order — so the same drawing says the same text in any
merge order; `fixtures/flowchart.mermaid.ts` holds the golden every hand of
D1's bench must export. `ids`/`marks`/`links` map the text back to the marks
for the surface that renders it (the `mermaid` kind, still to come).

**Mermaid in** (V1-PLAN §3, D3; `notations/mermaid-in.ts`,
`notations/layered.ts`). `drawMermaid(session, text, { at, scale?,
participantId?, origin? })` draws a Mermaid text as ink the engine reads
exactly as a hand's, so D1 reads it and D2 says it back — **the round trip
is the test** (`mermaid-in.test.ts`: D2's goldens, the fixtures in
`fixtures/flowchart.mermaid-in.ts`, D1's 36 hands and seeded random charts).
A reader per diagram keyword (`registerMermaidReader`; the flowchart's reads
`flowchart`, `graph`, `flowchart-elk`), `readMermaid(text)` to parse alone;
what it cannot read — styles, a subgraph's frame, a flow to itself, a line it
cannot parse — is **refused with its line, never thrown**, and what is drawn
otherwise than written (a shape with no symbol of its own, a dotted link, RL)
is said in `notes`. `layoutLayered` is deterministic and **keeps the text's
order as the reading order** — a node never ranks above the one written
before it, a rank keeps the written order (barycentre passes move places,
never the order), ranks are the longest forward path, links back break
cycles and are said, and the ranks stretch until the flows run the header's
way as D2 measures it. Each symbol is a clean form D1 reads as itself —
`strokeFor`'s rectangle and circle, a square turned 45°, a box leaning 22°, a
stadium within 2.6:1 — sized from its words within a factor of two (D1 takes
a symbol under 0.4 of the median for a head), in the hand's space at the
scale given, declared content; each connector runs port to port (straight,
or an arc with closed triangle heads), bound at both ends at a site the mark
offers itself (`DrawnEnd.of` says `mark`, or `notation` for a flowchart
port); every word is a `label` on its own ink, by the importing hand. heads.ts
reads any mark small, touching and on a connector's line as its head, so a
way that brings one past those gates is read first on a scratch session and
taken only if every end reads as drawn. Only strokes, binds and labels enter
the log; for one undo, wrap the call in `session.withTool` (L2j).

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
  — `GRAPH3D_MARK`) — **built**. What a module lets the hand DO is a
  **tool** (see *Tools*): the field's affordances are the tools registry's
  offers, not this list; a module that acts names its tool
  (`InstantModule.tool`), and a route names the tool that takes its
  ability's act (`Route.tool`: arrange → tidy, build → the structure)
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
theme · hand · auto-read · folder · import · export · models · mark · live ·
reset · help · boards), each saying its state on its face, closing on the next
stroke, Esc, or a tap outside. The panes (models, your mark, boards) open under
the bar, one at a time. The chrome is built from six components in `surface/00-ui.js` — pill,
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
zoom tile and keyboard still zoom for a mouse. Touch: until a pen has been
seen, one finger draws and two fingers pinch and pan; after, the pen draws
and a finger pans (*Pen, finger and palm*, below). **The grid is under the same bar**: the view's own
controls (the count and sort; focus's ← →) join the bar rather than a second
bar over the cards.

**Pen, finger and palm** (V1-PLAN R6, acceptance A10; `Demos/surface/07-hand.js`
holds the rules, pure — `node --test Demos/surface/07-hand.test.mjs` — and
`07-input.js` is the adapter). **Decided by `pointerType`, never by the user
agent**: iPadOS reports a pencil as `pen` and a finger as `touch`, a desktop
test synthesises both, and anything else — `mouse`, or the empty type a
synthesised event carries — is the mouse, which nothing here changes.
**Before a pen has been seen on this device, today's rule stands**: one
finger draws, two pinch and pan. **The first pen switches it**, said once in
the status line and kept as a device preference (`draws`, beside `hand` in
`00-core.js`) that the *hand* tile shows on its face — `right · pen` — and
changes: once a pen has been seen the tile steps one word a tap (right · pen
→ right · finger → left · finger → left · pen), so a finger can have its ink
back; with no pen ever seen it flips the side, as it always did. With the
pen, **one finger pans** (past `PAN_SLOP_PX`; short of it the lift is a tap,
the dead state's tap, never a dot), two pinch, a third is nothing; a finger
does not draw, hold, drag a handle or reach a playing program — the pen does
all four. **A palm is a touch that lands while a
pen is on the glass, or within `PALM_MS` (500 ms) of the pen's last event
anywhere on the page** — down, moving, hovering, lifted — and it does
nothing for its whole life, whichever the preference; the minimap, the teach
pad and the control centre's close-on-outside ignore palms too. **A pen
landing makes every finger down a palm**: a finger's stroke is dropped, a
pinch stops, and a pan a heel began within `PALM_MS` before the pen is put
back. Contact size is not read (Safari's width and height for a touch are
unverified). **The board follows one pointer** (`owner`: the pointer whose
press began what is under way — a stroke, a drag, a knob, a demonstration, a
program's pointer, a pan): another pointer's moves and release are not its
own — a palm's points used to land in the pen's stroke, and its release ended
it — and **a release the board began nothing for ends nothing**: a pinch's
last finger, a palm lifting, and a mouse pressed on the chrome and let go
over the board each used to commit a stroke with no points, which threw after
the event was already in the log (and the board then failed to save). A page
hidden with a hand on the glass forgets the pens and the palms it never heard
lift. **Pressure is recorded, not drawn**: every point a pen draws carries
`p` (0–1, three places) in the log — kept through a magnet's snap and through
copy and paste; core's `Point.p`, which no reading uses — and the drawn width
is one width for all ink, the mouse's and the finger's too; ink is never
covered. **A pencil's hover is a hover**: the reading of the mark under it,
as a mouse's gives, and the magnet in reach drawn on the pen's own layer —
the site a stroke begun there would start on (`penHover`, `magnetRing` in
`drawLive`); a mouse's hover draws no ghost, as it never did. Safari's
gesture events are left to the touch pointers while fingers are down (both
zoomed one view about two points); the canvas refuses a moving stylus's
`touchmove` default (Scribble, a scroll) and text selection or a callout
under a held pencil. The keyboard is in the next paragraph. The gate's
`pencil` scenario drives all of it on Chromium and WebKit with a pen and
fingers synthesised in the page; `QA-v1.md` §A10 is what only an iPad can
say.

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
QA plan read into a pane. On a touch screen — or wherever a finger opened it,
read from its `pointerType` and never the user agent — the field does not
take the focus until the input is tapped, or the keyboard would cover the
pills. **With the keyboard up the field stays in the visible viewport**
(V1-PLAN R6; `fitFieldHeight` in `09-palette.js`): the keyboard shrinks the
*visual* viewport and leaves the layout one as it was, so the room is read
from `visualViewport`, and a field taller than that room has its pills' list
held to what fits, scrolling, the input, its reading line and the four core
buttons in view — measured from the list's own scroll height, so a list
scrolled keeps its place — and let go on the next keystroke or layout change
once the pills fit. When the field fits, nothing is set.

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
code has somewhere to live, and when the model fails and this hand has done
nothing since — the bless is still its last act (`session.lastAct`, L2j),
whatever another hand drew — that bless is undone and the status says so. **Typed text at a loop is a brief unless it names a verb**: the reading
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
them; **autosave** rewrites only this participant's file. A static site is opened read-only through
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
writes need one the user pasted. **The page is installable**, at the app's
address and at its old one: a manifest and a service worker cache the shell
for offline; every request is network-first with the cache as the fallback
(*One app address, versioned*, below). **Loops do not depend on paint**: a tab
the browser stops painting gets no animation frames, so the tank and the
worker take a timer's tick when no frame comes (`nextFrame` in
`01-view.js`) — time is state, not a movie.

**With no folder, the board is kept in this browser** (V1-PLAN R3;
`Demos/surface/17-board.js` decides, `17-folder.js` acts): in IndexedDB
(`mm-boards`), as an **append-only journal**. A record is `{ base, text }` —
keep the first `base` events, then append these — so a stroke is one event
written and an undo is a cut, never a rewrite; a record with base 0 is the
whole log, starts a chain, and its transaction deletes every record before it.
**A change is written in the task that made it**: the journal is the session's
*first* listener, ahead of the paint (a release on a big board paints for
seconds), and the transaction is begun and committed before `append` returns —
so a tab that dies right after a release keeps the stroke. That is claimed by
the kill test alone (`node e2e/run.mjs keep`: the renderer crashed or the tab
closed at random points — after a release, during one, mid-stroke, after an
undo — and every completed stroke is on the reopened board, in order).
`pagehide` and `visibilitychange` flush what is not yet written (a folder's or
a room's pending save too); a reload brings the board back. **The old way** — the whole log as one string in
browser storage (`mm-log`), rewritten 900 ms after the last change — stopped
saving at about 1,500 marks and swallowed the error (PERF.md); that board is
**imported once, unchanged**, the first time the store opens, and the key is
removed only when the write has landed. **One tab writes a board** (a Web Lock per
board, held while the page is on it): a second tab shows it and writes nothing,
and when the first lets go it takes over — unless the board was written since
it opened.
**A save that fails is never silent**: the status line LEADS with it, whatever
else it says, until a save succeeds — *not saved — the browser's storage for
this page is full* (or: this browser will not let the page keep anything, a
private window or blocked site data; this board is open in another tab; the
folder refused the write) — with its ways out as buttons in the sentence:
*export the log*, and *open a folder* where the browser can, which carries this
board into the folder (`keepBoardIn`) rather than letting the folder's replace
it. A failed write is retried as the whole log after a pause and on a timer.
With no IndexedDB, browser storage is the store as before, and fails out loud
the same way. **Whose board a page is** (`boardMode`): a live room keeps no
local log (L1); a replay and an embed are figures and never read or write the
reader's board (the whitepaper embeds both, on the canvas's origin); a folder
or repository named in the URL is its own; `?fresh=1` starts empty and replaces
what is kept at its first change, as it always did (a test's page, never an
address the surface writes).

**Several boards** (V1-PLAN R1, acceptance A8; `17-boards.js` decides — pure,
tested in Node — `17-folder.js` acts, `22-boards.js` is the pane). **A board is
its log**: each is its own journal, keyed by the board's id (records under
`[id, seq]`, meta under `id`), and the list — IndexedDB version 2 adds the
`boards` store — holds one entry a board: its name, when it was made, opened and
put in the trash, and nothing of what it holds. **The name is shown, never the
key**, so a rename is one field of one entry, never orphans a journal, and two
boards may share a name. R3's board is the first entry, **"My board"**, under
the key R3 kept it under (`default`), untouched. A board's meta also says what
it holds — when it last changed, its events, marks and characters — written in
the same transaction as each record, so the list is right after a kill.
**Where it lives in the chrome**: the control centre's *boards* tile, in a fixed
slot after *help*, its face the name of what is on screen; it opens a pane
under the bar (one pane at a time), built from the pane and chip components:
*New board*, *from a file…* (a log as *export* writes it becomes a board), each
board with when it changed and roughly how big it is (*42 marks · 12 KB*), the
board on screen marked *here*, and *rename*, *duplicate*, *delete*; the folders,
repositories and sites opened lately as **recent places**, each saying its kind,
opened again the way their tile opens them (a folder's handle kept where the
browser can; never a room, never a key); and **the trash**. **Delete moves a
board to the trash** with one tap and loses nothing — *restore* brings it back
whole; **emptying the trash is its own act, said plainly before it happens**
(*1 board will be deleted for good — “Sketches” (42 marks). This cannot be
undone.*), a second, deliberate tap; and a board another tab holds is never
emptied out from under it (its lock is taken for the delete, and the pane says
why it stayed). **Reset** is a fresh board under the same name, what the old
one held in the trash — never one tap from losing it (`20-controls.js`; the
old handler in `07-input.js`, which emptied the board, is gone). **`?board=<id>`**
opens a board; with none, the board opened last; an id this browser does not
hold is said. The title carries the name, the address the id, and **the view
comes back per board** (zoom and pan: a device preference per board id, not the
log; the minimap follows). **Switching is in place and flushes the board being
left**: the next board's lock and records are read while the one on screen goes
on being written; then it is flushed and waited on until its store holds all of
it — or the switch is refused and said in the pane, with *export the log* and
*leave it anyway* (a second tap) — and only then, in one task with nothing
awaited, is it left and the next loaded, so no stroke can land between. From a
folder, a repository or a room a board opens in a page of its own, after the
folder's save; opening a folder or joining a room from a board waits the same
way, and a board that is not saved stops it (the line's *open a folder* carries
that board in instead). The kill test runs across switches (two boards, switched mid-session,
killed right after a switch and in the middle of one; both whole). The list
never stands between a board and its journal: an entry the store refuses (full)
is held and written once a record lands. With no IndexedDB there is one board
and the pane says so.

### One app address, versioned (V1-PLAN R7)

> `app/` (made, never edited), `Demos/sw.js`, `scripts/build-app.mjs`,
> `scripts/release.mjs`, `VERSION`, `CHANGELOG.md`; the gate's `app`
> scenario, `e2e/app.mjs`.

**The app is `/app/` on the Pages site — `https://jjh111.github.io/MetaMedium/app/`
— a page, not a redirect.** `app/index.html` is `Demos/session-engine.html`
with each file it asks for asked for from `/app/` (`../Demos/…`), so the
surface is one set of files at two addresses and the query is the page's own
(`?board=`, `?live=`, `?fresh=`, `?folder=` …; Pages sends `/app?…` to
`/app/?…` with its query, and so does the gate's static server). A redirect
could not install there: the offline shell must be served by a worker whose
scope covers the page, and a worker's scope is its own folder at most. **The
old address stays**: `Demos/session-engine.html` is the same page with its
own manifest and worker, and the whitepaper's links and embeds are untouched
— the `app` scenario asks every address the whitepaper, `404.html` and the
README link into the site, and both addresses open the same boards (one
origin, one IndexedDB).

**One worker, two addresses.** `Demos/sw.js` is the source and `app/sw.js`
its copy; where a copy stands decides its shell (the page, its manifest, the
surface's script and style, the engine bundle; the help's text when it
answers, never the reason a shell is not kept) and its caches
(`mm-app-<version>`, `mm-shell-<version>`). Network-first, the cache the
fallback, as before — and five rules, each one a failure a test can show:
**the scope is tested, not the registration** (a worker registered at a
narrower scope than its page registers without a word and controls nothing,
while Chromium still calls the page installable — so the gate asks that the
page be *controlled*, and a mutation that narrows the scope fails it);
**the cache is named for the release** (a release changes the worker's
bytes, so the browser installs the new one at its first network fetch; it
keeps the new shell whole, then drops the old release's cache — with a fixed
name, a file the page does not fetch on every load, the help's text, came
back offline from the release before beside the new page, which the gate
keeps as a control); **only its own caches** (caches belong to the origin,
which both addresses share with every project on the `github.io` host — the
old worker deleted every cache but its own — and a miss is answered from
this worker's cache only, never another release's copy of the same file);
**a page is kept once, whatever its query**, so an address never visited
online opens offline; and **a key never enters a cache** — a request
carrying `Authorization`, and a relay's stream that never ends, are the
network's alone. The shell is installed with `cache: 'reload'`, never the
HTTP cache's older copy (Pages sends `max-age=600`).

**The version** is `VERSION` at the root: one line, semver without build
metadata, `0.0.0` until the first release. `node scripts/build-app.mjs`
stamps it into the page's `<meta name="metamedium-version">` — which the
help pane leads with, offline and in the standalone file alike — and into
the worker's `const VERSION`, and makes `app/` again; CI's `--check` names
the file when either has drifted from `VERSION` and `Demos/`. Pages
publishes `master` as it stands, so between releases the app runs master's
code under the last release's number.

**A release** is one command, cut by the director on John's instruction
(*Working with the Codebase*): it refuses a dirty tree and a version not
greater than the last — `VERSION`'s or any `v<version>` tag's (`v1.0-day1`
is not one) — writes `CHANGELOG.md` a section from the commit subjects since
the previous release tag, merges left out, **grouped by the unit each names**
(the first unit before the subject's colon, else the first anywhere; "V1
plan" names the plan), bumps and stamps, builds the standalone file into
`dist/release/` (ignored) and refuses anything key-shaped in it or in the
section without saying the thing back, commits `Release <version>`, and
makes the annotated tag `v<version>` with the section as its message
(`--cleanup=whitespace`: by default git strips every `###` line from a tag).
**It never pushes**; it prints the pushes, to the fetch URL — the push URL is
a lock the week-1 automation left, on purpose. `--dry-run` prints all of it
and writes nothing, exiting 1 where the real run would refuse.

### Live logs: multiplayer as a transport (v9 S6)

> `metamedium-core/src/store/live.ts` (`LiveStore`, `LocalHub`),
> `session/hands.ts` (`sittingName`, `handLabel`), `store/merge.ts`
> (`mergeLogs(logs, { me })`), `store/livemerge.ts` (`LiveMerge`, R4d),
> `Demos/surface/17-folder.js` (`openLive`, `mergeLive`), `Demos/relay.mjs`,
> `shard-3d/src/room.ts`.

Nothing in the engine changes: a second person on the canvas is a second
log arriving live instead of after a pull. `LiveStore` is a `Store` with
`watch: true` whose transport carries lines — a participant's appended
events — between hands: a `BroadcastChannel` between tabs on one machine
(`?live=<room>`, or the *live* tile), or a relay between machines
(`?live=<room>&relay=http://host:8020`; `node Demos/relay.mjs` is a page
of Server-Sent Events in and POST out, with no truth of its own). A
newcomer says hello and is answered **once per log** (V1-PLAN R4d): every
hand answers for its own log, at once; a copy of another hand's — marked
`via` the hand that holds it — goes only when its writer cannot answer:
at once when it said goodbye (`LiveStore.close()` sends a `bye`), after
`COVER_WAIT_MS` (1.5 s) when it stayed silent, and only from the first of
the hands holding one, by name, `COVER_STAGGER_MS` apart, each skipping a
log its writer or another hand has answered for since the hello. So
history is caught up the way a pull would, even for a hand that has left
the room, and a room of six sends the newcomer each log once, not five
times; presence is the sender's, never the absent writer's. **Whose
hand:** `mergeLogs(logs, { me })` stamps every event from another log with
`by: <log name>`, and the session attributes such an event to a
participant of that name — made on first sight, id
`participant:hand:<name>`, no join event anyone had to write — so another
hand's ink draws in its own colour (a hue from the name) and is never
yours. The merge runs as each line lands (on a microtask — a hidden tab
throttles timers), my unsent events kept. Presence is who was heard in the
last minute, in the status line.

**A room merges a line, not the board** (V1-PLAN R4d; `LiveMerge`,
`Session.rebase`). The merge stands between lines — every log's events in
`mergeLogs`' order, one event per authorship, the reader's own copy
standing — and a line's events find their places in it: when they fall
after everything the board holds they are **applied**, as a stroke is, with
no replay; when one falls before events already applied the board goes back
to the nearest checkpoint at or before it and replays from there, never from
zero. `rebase` leaves a checkpoint where it ended, and a checkpoint keeps the
index as it stood (where the marks are, what is within reach of what, the
components and what they match — the last four do), so the commonest such
line, one crossing a mark this hand drew a moment before, goes back a few
events. It does not replace the board — `generation` stands, so a model's
answer about a mark still lands after another hand's line — unless the
stretch replayed holds an event with no authorship, whose counter ids may
now name other marks. The store tells a reader when to merge
(`revision()`, which moves only when a log another hand wrote changes, read
through `heldLogs()`, the arrays as held): **a line that changes no log — a
hello, a goodbye, the relay's word, a whole log already held — does no
work**, no merge, no replay, no paint. Between lines the board holds this
hand's marks where they were drawn, and the next line that changes a log
puts them in the merge's order. A room's log is `store.ownLog(events)` —
what was sent less what the session no longer holds, then what it never
sent, in the order written — found by identity and authorship, with no
event serialised. On the 2,000-mark board a line costs 1.65 ms (it was
0.3 s after R4b, 3 minutes before); `PERF.md` has the rest. **The full merge
is the oracle**: `src/store/room.oracle.test.ts` generates rooms — clocks
seconds apart, lines interleaved and heard again, undos, leavers, newcomers
with unnamed marks, hands renamed — and holds the path to `mergeLogs` and a
replay from zero after every merge, and to a reference that merges the whole
log whenever one changed; `MM_ROOM_SEEDS=500` for a deep run. The canvas, the
MCP hand and the oracle's reference share the path; the shard still merges
its (small) room whole on every notify.

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

**Undo is per hand** (V1-PLAN L2j; `undo` / `lastAct` in `session.ts`,
`session/undo-hands.test.ts`). The board is every log merged by time, so its
last event is whoever acted last by the clocks, and undo used to drop it —
another hand's as readily as this one's, nothing sent (this hand's log had
not changed), the mark back at the next line. **Undo takes back this hand's
own last act**, wherever the merge put it, and every other hand's event
stays. This hand's events are its own log's — the ones no merge stamped
`by`, whoever they name (a model's reading in its log is its act, as
`handOf` reads it) — and the last is the one it WROTE last, never the last
on the board: the highest `seq` under the name this sitting writes (a
number only rises in a sitting, and a merge that interleaves by time changes
none); with none, the highest under the name of its last named event in the
log; with no names at all, the last of its own in the log — a board of one
hand undoes exactly as it always did, one event at a time, ticks never taken
back. A mark with no authorship has no number, so among those the log's
order stands for the order written. **An act is one dispatched event, or
everything written inside one outermost `withTool`**: those events carry
`act`, one number per act, one past the highest this sitting has seen (it
only rises; provenance like `tool`, which replay ignores), so a tool's act —
two labels, a text and its code, the duplicates — is one undo. **The field a
tool closes before it writes anything** (a `dismiss` or `deselect` first,
L2e's order) is an event of its own, not the act: one undo takes a label's
words off and the field stays closed (e2e 42b). The act is dropped where it
stands, the replay goes back to the nearest checkpoint before its first event
(none taken with it), and `generation` moves only when an event left after it
mints ids off the counter. Nothing else is new: the log shrank, so `publish`
sends it whole, and every other hand's `LiveMerge` cuts the act out. The
shard reads its acts off its own events too (`undo` in `shard-3d/src/log.ts`),
and a failed brief's bless is dropped when it is still this hand's last act
(`dropFailedBless`). There is no redo. The room's oracle holds every undo —
the reader's and every other hand's, tool acts among them — to a record of
each hand's writing kept beside it (`Writing` in `src/test/room.ts`), and
follows it to every board that holds the log.

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
over in silence. The field closes **before** the word is written, as an
event of its own, and the labels are one act (L2j): one undo takes every
label it wrote off and the field stays closed; a mark already saying
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
top of two fragments. After editing `Demos/session-engine.html`,
`Demos/sw.js` or `Demos/manifest.webmanifest`, run `node scripts/build-app.mjs`
and commit `app/` with them — CI checks that the app is their build and
`VERSION`'s.

`src/session/session.scenario.test.ts` is the executable spec for the
no-modes flow (lasso → check → summon → bless → artifact). Change it knowingly
or not at all. Design rationale: `ARCHITECTURE-v6-SESSION-ENGINE.md`.

### The app, the version and a release (V1-PLAN R7)

```bash
node scripts/build-app.mjs                 # stamp VERSION, make app/ from Demos/ (after editing the page, sw.js or the manifest)
node scripts/build-app.mjs --check         # CI's: app/ and the stamps are the build of VERSION and Demos/
node scripts/release.mjs 0.1.0 --dry-run   # the whole release printed; nothing written
node scripts/release.mjs 0.1.0             # one commit, one annotated tag, dist/release/metamedium-0.1.0.html — never a push
node --test scripts/build-app.test.mjs scripts/release.test.mjs
node e2e/run.mjs app                       # /app/ in a browser: installable, offline, versioned (also --browser webkit)
```

Cut a release on `master`, with the suite and the gate green; the script
refuses a dirty tree and a version not greater than the last. The first
release has no previous tag, so its section is the whole history unless
`--since <ref>` says where to start. Then, on John's instruction, what the
script prints: push the branch and the tag to
`https://github.com/jjh111/MetaMedium.git` (the fetch URL; `origin`'s push URL
is deliberately a lock), and
`gh release create v<version> dist/release/metamedium-<version>.html --title "MetaMedium <version>" --notes-from-tag`.
Pages serves the app at `/app/` with the new version in its help pane; a
browser that had the last release takes the new shell at its first visit.

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
- Published URLs — retire old demos to `archive/` with redirects, never break links (the gate's `app`
  scenario asks every address the whitepaper, `404.html` and the README link into the site)
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

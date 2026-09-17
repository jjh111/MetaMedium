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

Headline (16 Sep 2026, on the local branch `control-points`, ready to merge
to `master`): **the board is worked like a diagram, the door opens both
ways, a shard makes things in space, and the review's nine packages are
in.** Magnets P0–P1 (`CONTROL-POINTS-PLAN.md`): the pen feels where a mark
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
`Demos/session-engine.e2e.js` drives 203 records through the real UI (202 checks and one honest skip, 25d; headless with the shard's two scenarios via `node e2e/run.mjs` from `e2e/`, which CI runs): page, flowchart, handwriting (read only when asked; a line read as one), the model drawing, the user-side loop, selection and the field, corrections, the worker, the tank, words into verbs and acting out, frames and the drawn slider, the folder, pictures, text, the moment, a live room, a playing frame that takes the pointer, hold by long-press, the graph in 3D, and the foundations (letters at any size, a mark that crosses, readings that stay, the minimap), and the explanation plane's layout. A run takes about 100 s; run it **in its own tab on its own origin** (`http://127.0.0.1:8010/…?fresh=1&nosw=1` — `__setup` refuses any other URL: it replaces `fetch` with a stub, joins a stub model named `e2e-stub`, and wipes the origin's saved board), start it with `__setup(); __scenario().then(r => window.__R = r)` and read `__R` when it lands.
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
- `SHARD-3D-PUSH-2.md` — **geometry from the drawing, proposed 16 Sep 2026**:
  what John's first real use showed (a footprint and elevations from free
  views stood nothing, and a brief with nothing to fill was refused in one
  invisible sentence); every free stroke as a silhouette claim; the sketch
  hull as the massing generalised to any plane; parts said in words; the
  brief a small model can answer (G3, built: the hull brief and the parts
  contract); the hull in the volume its claims define (the Y fault); the shard's
  own MCP hand and Claude Code as the model seat (G5); packages G0–G5
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
| `metamedium-core/` | **The canonical engine** (TypeScript, zero deps, tested): geometry, recognition (the shape rung), relations, the diagram rung (`src/diagram/`), concepts, the no-modes session engine, the layout and graph parsers, and the LLM transport. New recognition/engine work lands HERE |
| `index.html` | **Interactive whitepaper v5** "MetaMedium: AI Beyond Chat" (live on GitHub Pages). Fully on the `brand/` system as of 3 Sept 2026 — its `:root` is `brand/tokens.css` under the names this page already used, so change a value THERE first |
| `brand/` | **The visual system, one home**: `tokens.css` holds every MetaMedium colour, face, size and figure/diagram token; `styleguide.html` is the living specimen (light paper first, IBM Plex Mono throughout, teal keyword, colour as signal, §11 figures and diagrams, §12 long-form furniture). v1 draft — the whitepaper's **figures** have migrated, the page around them has not; `brand/README.md` carries the four laws, the convergence order, and what applying it to the whitepaper taught the system |
| `doodle2-canvas.html` | **Flagship demo**: heuristic recognition, spatial graph, library, undo/redo, touch. No LLM. Single-file (~500KB) |
| `metadoodle1.html` | Fork of flagship + tiered LLM recognition (WebLLM in-browser, LM Studio local API) + voice. Single-file (~600KB) |
| `Web App Skeleton/` | React + Vite + TypeScript + Zustand rebuild; Claude API interpreter skeleton in `src/llm/`; recognition/spatial/matching in `src/core/` |
| `Demos/surface/` | **The reference surface's source**: `surface.css` and twenty-four script fragments (`00-core`, `00-ui` … `20-controls`, `21-minimap`, then `90-boot`, which must stay last), one concern each, concatenated in name order into one closure by `Demos/build-surface.mjs` → the committed `Demos/session-engine.js` (CI checks it has not drifted). Fragments share the closure's variables — no imports; each fragment's header says what it provides and uses. Edit a fragment, run the build, commit both. **`09-field.js` is the exception that proves the rule** (SEAM-1): it names nothing outside itself, so the field's query is a pure function of a record and is unit-tested in Node with no browser — `node --test Demos/surface/09-field.test.mjs`, in CI's `core` job. A fragment's `.test.mjs` is not concatenated into the build |
| `Demos/` | **`session-engine.html` is the MVP surface** (it links `surface/surface.css` and loads `session-engine.js`) — infinite canvas, the taught command mark, living artifacts in a DOM overlay, ink-over-artifact addressing, "why" inspector, model participants, canvas answers. Uses the committed `metamedium-core.browser.js` bundle. **`session-engine.e2e.js`** drives the whole loop through the real UI with a stubbed model (browser console; not part of `npm test`). `build-standalone.mjs` inlines the bundle into a single shareable file. **`mcp.mjs`** is the MCP hand (Claude Code's way onto the board; `.mcp.json` at the root registers it), over `relay.mjs` and `live-node.mjs`, with `ink-png.mjs` for the ink as a picture and `mcp-smoke.mjs` as its stdio test; `metamedium-core.node.mjs` is the committed Node bundle it runs (`npm run build:node`, drift-checked in CI like the browser bundle). Plus fish, composition diagrams, no-modes graph, etc. |
| `skills/` | Claude Code skills: `metamedium-code` (code patterns), `metamedium-design` (design principles) |
| `Assets/` | Figures and design rationale (recognition strategy, point-primitive proposal), and the social card. `make-card.mjs` regenerates that card from index.html's own hero — synthetic pointer input, so the picture shows the engine really reading a mark; `node Assets/make-card.mjs`. Change the picture and you must change the FILENAME and the four og:/twitter: tags in `index.html` and `404.html`, because scrapers cache by URL |
| `archive/` | Retired versions and superseded plans, incl. whitepaper v4 (root `MetaMedium_Whitepaper_v4.html` is a redirect stub — keep it) and PRDs v3.2/v4 |
| `e2e/` | **The browser gate** (`DIRECTOR-REVIEW-2026-09-15.md`, QA-1): `node e2e/run.mjs` starts its own servers on free ports (a static one over the repo root, vite over `shard-3d`), opens a **fresh Chromium context per scenario**, loads the harnesses that already exist — `Demos/session-engine.e2e.js` (`__setup` + `__scenario`) and `shard-3d/e2e.js` (`__scenario`, `__demo`) — and awaits the result object each one returns. It does not reimplement them. Pass, fail and **skip** are counted separately (a record whose name says it skipped is a skip); a failed assertion, a harness exception, an attempted request to a real model, or a page error not on the named allowlist in `guards.mjs` each exit nonzero, with structured JSON and a screenshot in `e2e/results/`. Chromium only so far — a WebKit smoke is still owed. `e2e/README.md` has the rest |
| `.github/workflows/ci.yml` | CI: typecheck + test + build for `metamedium-core` (incl. a bundle-drift check), `shard-3d` and `Web App Skeleton`, plus the **browser gate** (`e2e/run.mjs`, results uploaded on failure), on every push/PR |

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
| `shard-3d/` | **Live · P0–P6, the MVP line, the navigation compass, and the review's four shard packages** (undo reverts one whole act grouped by the act's own `at`, ACT-1; every op tree read from the log or a reply is validated with a structured reason and a malformed one stands isolated, DATA-1; a placed instance is scored against its own target sketch, its carried source correspondences and later revisions, never a zero-percent source view, GRAPH-1; the panel leads with what is selected, what it could be, where it came from and the next act, with the evidence behind a disclosure, UI-2) (`SHARD-3D-PLAN.md`, `shard-3d/README.md`): a bounded MetaMedium for making 3D things — ink on planes, a form rung, op trees, the diff as the brief, wrap and turn-into. **P0**: the gizmo's three plane tiles, a stroke projected live onto the chosen plane and read by the shape rung in that plane's own coordinates at the pen's scale, the plane held as a rep on the stroke. **P2**: the form rung (`src/form.ts`, a closed vocabulary of seven placed by a table read top to bottom, the diagram rung's sibling, every threshold a ratio of the marks' own size measured in world space), the op tree (`src/op.ts`, §2.4's vocabulary whole with `extrude` and `revolve` built), a solid held in the log as a blessed artifact whose `json` code is that tree marked `// mm:op tree v1` and attributed to the engine, the mesh derived from the tree on every change, ink kept visible on the face, selection by default, and one field with one reader for the tier 1 verbs. A rectangle plus a line off its edge stands a box at once, tier 1, and one undo removes the solid and leaves the ink. **P1–P6** followed (the plane read from the evidence — it needed faces, so it came after P2 — features and cuts, the diff as the brief, the generator seat, the library); **the compass** (`src/navgizmo.ts`, `src/view.ts`) is the camera's own corner — a Blender-style navigation gizmo as an SVG overlay, the six axis views a tap away, home, persp/ortho and the pinned views beside it, the ball that faces the chosen plane in the same teal as that plane's tile. **The axis view IS the choice** (16 Sep 2026): tapping a ball, or the numpad key for that view, chooses the plane it faces (front → height, top → foundation, right → width, `axisPlaneFor`), the picker's tiles hide while it does — only the cursor mark stays, so shift + click still reads — and leaving the axis view gives the plane back to whatever the hand had chosen for itself, nothing if it never did (`planeAfterLeavingAxisView`, one line so the rule can be flipped). The picker and the compass still answer different questions: it says where ink LANDS, the compass where the EYE is. **The panel leads with the thing, not its telemetry** (UI-2, `src/panel.ts`): five rows above everything — *what* this is, *could be* (the library's ranked names), *from* (typed provenance: made by the engine at tier 1 · proposed by a model, held · taken by you · **placed from mug, a definition qwen3:8b proposed and you took**, which tells this operation's author from the definition's ancestry), *next* (the field's leading offer, in the same words the field is showing, and never *Undo*), and *becomes* — with every measurement it used to open on kept behind *why / measurements ▾*, remembered per device. A version the hand has not taken no longer claims a model proposed it; the honours row is one line per claim carrying GRAPH-1's own `why` and `aside`, and the status line after a proposal says the number and sends you to the panel for the workings. **G0 · the transcript, the export, and a brief that always answers** (`SHARD-3D-PUSH-2.md`): the board goes out and comes back as **its own log** — `encodeLog`, one JSON event per line, the canvas's format unchanged, so a board from either surface is a log (`src/export.ts`, the bar's *export* and *open*; opening replaces the board and says so, because a `load` is not undoable); `?fixture=<name>` loads one of `shard-3d/fixtures/` at boot, a log replayed or a **captured view rebuilt from its marks' bounds** — John's own boards, so this plan's claims are settled on a real drawing (`?fixture=john-2026-09-16-massing` stands his three profiles and their massing at y ∈ [0.97, 3.09], floating where the profiles are rather than on the floor); the panel's ***model*** section is **the transcript** (`src/exchange.ts`) — the last eight exchanges, each opening on the brief as **sent** and the reply as **received**, verbatim and unrepaired, with what parsed and what was dropped — **runtime, never the log**, because what a reply did is already in the log; and a brief is no longer refused for want of a selection: `briefTarget()` fills what you pointed at, else the one solid standing, else **stands the drawing up first** (`log.standFor()`, the one seam G1 widens to the sketch hull), else names what is **missing** as the next mark to draw — and the field's reading line says which of the three Enter will be before it is pressed. **`?demo=castle-sketch`** draws John's first board — a footprint and three ⊓ from free views — which was G1's target and now stands a hull with parts (G2 re-aimed its ⊓: each one shift + clicks clear ground first, so the view plane passes through the floor and the feet reach it). **Push 2, G1 — the sketch hull, in the volume its claims define** (`SHARD-3D-PUSH-2.md` §1): every free stroke is a silhouette claim, so the drawing a hand actually makes stands. A new form role `elevation` (row 8) reads an open ⊓ whose two feet reach the ground — the ground is its fourth side — and a floating one stays an `annotation` that says its feet do not reach; row 2 reads a closed stroke on any plane whose prism meets the footprint's as *a claim from 34° · +24°* (`prismsMeet`: two prisms are convex and unbounded along their own normals, so one axis, `nA × nB`, decides it exactly). The `hull` step stands at tier 1 the moment the second claim lands and re-derives as claims land, one version per claim, so one undo takes back one claim; `massing` and `hull` are two doors on **one** derivation (`hullBody`), so every tree ever written still reads. **The volume**: a claim's prism runs through the span of the OTHER claims, never its own — a footprint's points all sit at y = 0 — so a hull occupies the volume its claims define and the ground bounds it only where a claim's feet reach it. And **the view plane passes through the volume the hand is working in**: the centre of the view, which pans and orbits with the hand, until a shift + click places a cursor (which sticks until `0`, a clear, or a shift + click on it). That was John's second board's real fault — the cursor had never left the world origin while he looked one to four units up, so every free stroke landed in the floor; the massing itself was never in the floor, which `hull.test.ts` pins from his own exported fixture. `npm install && npm run dev` in `shard-3d/` (vite on :5174; `?demo` draws both done-criteria); `npm test` is vitest on the pure rungs; the engine is imported from source, so there is no bundle to drift ; the honours row is one line per claim carrying GRAPH-1's own `why` and `aside`, and the status line after a proposal says the number and sends you to the panel for the workings. **The hand, and the seat** (`SHARD-3D-PUSH-2.md` G5): `shard-3d/mcp.mjs` is the shard's own MCP hand, registered in `.mcp.json` as `metamedium-3d` beside the canvas's `metamedium` — six tools (`space_look`, `space_pending`, `space_answer`, `space_draw`, `space_propose`, `space_say`) over `src/room.ts`, which joins a live room the way `17-folder.js` does. It is also **the model seat**: the models pane's *Claude Code (MCP hand)* parks a brief in the room instead of posting it, and `runBrief` needs no special case because the seat carries an injectable `transport` and looks exactly like a model to `propose()`. `mcp-smoke.mjs` is the stdio test, in CI's `shard` job. **Push 2, G2 — the parts of a hull, said** (`src/parts.ts`): a hull is one body and a hand that drew a castle did not draw one thing, so the engine gets **parts** it can point at. A part claim is a **run** — an elevation closed on the ground finishes one thing and starts the next where it touches the floor, so a ⊓ is one run, a stroke touching three times is two, and a closed silhouette is one by its own ink — and a part is the hull's material inside that run's prism, through the CSG seam, cut once per version and cached on the build's own signature. Two rules keep the count honest: **the same material seen twice is one part** (bodies overlapping by more than `PART_OVERLAP` of the smaller merge, carrying both runs as provenance), and **a part's place is said in the footprint's own frame** — the frame's long axis is the long side of the *tightest* box, never the direction of furthest reach, which for any rectangle is its diagonal and turned a 6 × 4 plan by 34°; the plan is cut in thirds each way and **north is −Z**, said out loud in every sentence that uses it. Ids are `part:1 … part:n` in reading order, and the sentence — *part 2 — 1.2 × 1.0 u on the footprint, 3.1 u tall, at the north-west corner; from stroke:4 (drawn from 34° · +24°)* — reaches the brief's `PARTS OF WHAT STANDS` section (G3's door), the panel's *parts* row as one hoverable chip each (hovering cages the part in dashed teal, a second cage so pointing never reads as the selection moving), and `__shard.parts()`. **Ink over a part addresses it**: a closed mark lying wholly within one part is a feature *of that part* and the rung's own reason says so, so *Cut a hole* reads *take it out of part 2 of hull*; a scratch across a single part, or *Remove* with a part held, **takes that part's claim out** rather than the hull off the board — one version of the one step, so one undo puts the claim back — with two guards said rather than silent (a part two views agree on is not unsaid by one of them, and a hull is never left with fewer than two claims). Standing John's own castle found the hull fault it fixes: **one standpoint is one silhouette**, so claims sharing a plane direction are gathered before anything is intersected (apart → unioned, overlapping → intersected), because two towers drawn from one place are one outline with two pieces and intersecting them gave the empty set. The honest limit is written down rather than worked around: his board gives **two parts, not three**, because three *partial* silhouettes from two standpoints do not determine three masses — a tower seen once has no depth, and bounding a run by the footprint instead invents one (a 2.8 u slab across a 6 × 4 plan), so a part stays the hull's own material. `parts.test.ts` pins it; the README says what would close it. **Push 2, G3 — the brief a small model can answer** (`src/brief.ts`, `src/generator.ts`, `src/parts.ts`, `src/log.ts`): with a hull standing and cut into parts there is nothing left for a model to invent, so **the brief takes a second shape and the reply a second contract** — and one function, `partIdsOf(scene)`, decides which, so the brief, the prompt, the parser and the landing can never each decide differently. The hull brief leads with what stands, the footprint, the extent and the parts with their numbers and their words, and it does NOT walk the planes mark by mark: every such line invites a small model to restate the drawing instead of naming it. John's castle comes to **1048 characters** before `HERE_ON_A_HULL`, which forbids the profiles the other paragraph offers. The contract is `{parts:[{id,name,material}], steps?:[{op,part,…}], reuse?}` — **never raw geometry and never a profile it invents**: a small op names a part and gives a number, and the geometry comes from the part the engine already cut (`boss` raises it from its own top, `cut` sinks a hole through its own top face in that face's units, `mirror` reflects its own prism, `remove` unsays its claim), landing as ordinary `cut`/`boss` steps carrying `part` so the derivation, the clip, undo and the export take them without knowing parts exist. Everything outside the closed vocabulary is **dropped AND COUNTED** — a part id the hull does not have, with the ids it does; a colour outside `COLOUR_WORDS`, with the name kept; an op outside `PART_OPS` — and the transcript carries the landing's drops as well as the parser's. **What it cannot name, it leaves**: an unnamed part keeps `part:n`, and a reply that names nothing but binds a material still lands the material. **Where a part's name lives**: on the hull step's `said`, keyed by **the claims the part was cut from**, never by the part id — `part:1 … part:n` is a reading order, so a dropped claim renumbers everything after it and a name keyed on the number would slide onto another body. `partsOfHull` re-attaches each saying by containment (exact first, then the part whose claims contain it — a small op regrows the body and a part can come back merged), and the panel, the brief, `namesInPlay`, the verb table, `take` and the render all read that one place: a named part's chip reads *turret · green*, `take` holds it as a definition **based on the whole** whose tree is the hull of its own claims (a part is material, not a sub-tree of steps), and *make the turrets taller* is a regen over that PART alone — the brief gains `ONLY THESE PARTS MAY CHANGE`, a reply about another is dropped saying so, and the steps the last reply left on that part come off before the new ones go on, every other id untouched. Tested against text models actually produced: `fixtures/exchanges/` keeps the brief as sent and the reply as received for the stub, an *ideal* written by hand, and **qwen3:8b through Ollama** (42 s, strict JSON first time, both parts named and painted, nothing repaired — and two honest faults written down in the file). Found on the way: `newVersion` returned nothing, so a version the session refused was reported as a success — it returns `attachCode`'s answer now, and `applyParts` says nothing was written rather than claiming two parts were named. `npm install && npm run dev` in `shard-3d/` (vite on :5174; `?demo` draws both done-criteria; `?live=shard&relay=http://127.0.0.1:8020` joins the room and seats the hand); `npm test` is vitest on the pure rungs (548); `node e2e/run.mjs` is the headless gate (333 records, one honest skip); the engine is imported from source, so there is no bundle to drift |

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
hull), not the axis-aligned bounds: against those, a box tilted ten degrees
filled ~80% and lost its snap offer, and at fifteen read half as a triangle.
A hand rarely draws square to the screen.

**The shape rung is closed: eight entries.** `line`, `arc`, `triangle`,
`rectangle`, `circle`, and — because the rung above cannot do without them —
`arrow` (a straight shaft with a barb that **draws back on it** — a wing
turning past ninety degrees and at least a sixteenth of the stroke long;
the hook a pen leaves at liftoff is neither, and used to make every tall
*l* an arrow 0.6 — v10 F2),
`text` (writing, *without reading it*: open, turns many times, low and wide,
mostly-empty box — enough to make a mark a `label`), and `dot`. **Below the
hand's resolution (`HAND_RESOLUTION_PX`) only `dot` is offered**: a 5px blob has
no measurable geometry, and reporting "circle 0.85" for it would be sensor noise
dressed as evidence. A detector may return `meta` beyond its label — an arrow's
tip and tail — which the session keeps as a `reading:<type>` rep so the rungs
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

> `metamedium-core/src/session/measure.ts` — `measure(node, nodes)`, `describeMaths`.

What follows from a reading, as numbers: a circle's centre, radius,
circumference and area; a rectangle's sides, perimeter and area; a line's
length and heading; an arrow's direction; a triangle's angles (acute / right /
obtuse) and sides; an arc's radius and sweep. Measured from the clean form the
mark carries or would be offered, so it is the maths of the *shape*, not of the
wobble. It is arithmetic on a reading, not a reading — no confidence and no
candidates — and writing has none. The inspector shows it as *the maths*; it is
the one thing the 2025 prototype did that the engine had dropped.

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
- **Built from the ink's own measurements**, never a template: bounds, the
  three sharpest corners, the arrow's tip and tail, the arc's bulge. A slight
  oval stays an oval. `text` has no clean form — handwriting redrawn as a box
  is a lie about what was written.
- **Zero wrong snaps over the whole corpus** is pinned in `clean.bench.test.ts`,
  alongside ≥95% offered for every drawable shape and 0% for writing.

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
samples and offers *Forget*; teaching a new one means *Clear* first.

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
`ask:`, `draw:`, `page:`, `run:`, `new:`, `what:`), or else the brief. Under
the field, laid out as John sketched it (6 Sep): the **core** — four round
buttons at the left, Name · Copy · Paste · Erase, always the same four in
the same slots (a circle with a mark in it; the name is the tooltip and the
reading line while the pointer rests on one); then, stacked to their right,
**what this is** — readings with their numbers (*molecule 0.92*, *“Pricing”
0.92*, *page-layout 0.78 · GLM*, *row 0.81*), and tapping one takes it as
the name; and **what it affords** — Draw them clean, Line up, Frame these,
Play A, Not a molecule …, ranked by the reading and by use, the rest a
keystroke away. A pill carries a label; its reason is the tooltip; a pill
that asks a model carries a dot. Copy holds the
ink (and puts it on the clipboard as SVG); Paste puts it beside the selection
or, from the keyboard, at the pen. A tap while the field or a selection is up
dismisses it and is never a dot. `Demos/surface/05-selection.js`,
`09-palette.js`.

**The reader decides; it no longer acts** (SEAM-1, `Demos/surface/09-field.js`).
What Enter will do is a pure function — `readFieldCommand(ctx)` — of a
**`FieldContext`** record (the text, whether a summon stands and whether it is
over a live artifact, the offers as labels and aliases, the joined models by
name, what the library holds, the definition in the loop and what the verb table
read in the words, and a thunk for the drawing's genre) returning a
**`FieldReading`** (`kind`, the `line` shown under the field, `quiet`, and a
**named command** — `take` · `name` · `ask-what` · `ask` · `draw` · `build` ·
`library` · `behave` · `need-model`). `09-palette.js` is the adapter on both
sides: `fieldContext` gathers, `runFieldCommand` performs, and `readField` keeps
its old shape so nothing else changed. The point is that the field's query can
now be asked questions in Node with no browser, no DOM and no session —
`node --test Demos/surface/09-field.test.mjs`, in CI's `core` job. The genre is
a thunk because reading it costs a pass over the marks and most keystrokes
settle on a verb or a name long before the brief.

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

### Spatial Graph — retired

The old spatial graph (`spatial.ts`, with its fixed 50px "touching") is gone.
`src/relate/relations.ts` is the one relation system: the session records its
measured, scale-free relations on the node graph, clusters over them, and infers
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
  letter may stand up to `LETTER_HEIGHT_RATIO` (3.2) x-heights over its
  neighbours — the old cap of 44 px threw out every ascender a real hand
  makes (John's h, l and d were 72–88 px tall), so *hello* was five
  shapes and *world* gathered only its x-height letters. Found the hard way: at hand size, three bubbles and two lines
  drawn quickly are exactly a run of small strokes on one line, and the
  earlier rule folded the whole canonical loop into one word — after which
  the lasso and the mark had nothing to act on.
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
> `store/merge.ts` (`mergeLogs(logs, { me })`), `Demos/surface/17-folder.js`
> (`openLive`), `Demos/relay.mjs`.

Nothing in the engine changes: a second person on the canvas is a second
log arriving live instead of after a pull. `LiveStore` is a `Store` with
`watch: true` whose transport carries lines — a participant's appended
events — between hands: a `BroadcastChannel` between tabs on one machine
(`?live=<room>`, or the *live* tile), or a relay between machines
(`?live=<room>&relay=http://host:8020`; `node Demos/relay.mjs` is sixty
lines of Server-Sent Events in and POST out, with no truth of its own). A
newcomer says hello and every peer answers with its whole log, so history
is caught up the way a pull would. **Whose hand:** `mergeLogs(logs, { me })`
stamps every event from another log with `by: <log name>`, and the session
attributes such an event to a participant of that name — made on first
sight, id `participant:hand:<name>`, no join event anyone had to write — so
another hand's ink draws in its own colour (a hue from the name) and is
never yours. The merge runs as each line lands (on a microtask — a hidden tab throttles
timers), my unsent events kept; autosave sends the delta. Presence is who
was heard in the last minute, in the status line. **A hand in a room is one
tab**: the name is the person's (a preference) and a suffix is the tab's
(`john~a1b2`, shown as *john*), because a second tab of the same person is
a second log — under one name its lines would be taken for its own and
dropped. **"Local" in another hand's log means that hand**: an event stamped `by`
whose `participantId` is the local participant, or none, is attributed to
the hand — its answers, proposals and code arrive in its name, never in the
reader's. **My log is the session's own unstamped events**, sent or not,
never the room's copy of it: a line landing between a send and the next
merge would otherwise count every sent mark twice (found by the MCP smoke
test; e2e 28c2). Known gap: a model's proposals in another hand's log
reference that hand's participant ids (`participant:N`), which the merge
does not translate yet.

### The MCP hand: Claude Code on the board (v10 T2)

> `Demos/mcp.mjs` (the server), `Demos/live-node.mjs` (the relay as a
> transport in Node, reconnecting from its last id), `Demos/ink-png.mjs`
> (ink to PNG with no canvas API), `Demos/mcp-smoke.mjs` (the stdio test,
> run in CI), `.mcp.json` (registers it for Claude Code).

An MCP server is **a hand in a room** (SURFACE-v10-PLAN D1): it joins the
live room `claude` through the relay on this machine (starting one when
none answers), keeps a session from the merged logs exactly as a tab does,
and its seven tools are verbs a hand already has — `canvas_look` (the
board in words, with ids), `canvas_see` (the ink as a PNG: how the caller
reads handwriting or looks at a sketch — the tier 2 seat, taken by whoever
is in the conversation), `canvas_draw` (the shape rung's vocabulary or raw
strokes, declared content), `canvas_say` (a sentence beside marks),
`canvas_propose` (a reading, held), `canvas_transcribe` (what writing
says, held), `canvas_write` (code for a new artifact or a new version).
It **proposes and never blesses**; it can write a program and **cannot
play it**; it holds no keys. MCP over stdio is newline-delimited JSON-RPC
written by hand, so the repo takes no dependency; it imports the committed
Node bundle `Demos/metamedium-core.node.mjs`. In the canvas: the *live*
tile → *with Claude*, or `?live=claude&relay=http://127.0.0.1:8020`. Its
ink arrives as its own log, stamped `by` on arrival, in its own colour.
**In a session without the tools loaded** (the `.mcp.json` was added after
the session began), the hand still works from the shell: run `mcp.mjs` with
its stdin fed by `tail -f` on a command file and its stdout to an output
file, append one JSON-RPC line per call, read the reply — the same seven
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
already carries log lines, so the relay learns nothing. The one thing the log
cannot carry is the **pairing**, because node ids are per hand (D8, still a
debt), so it rides in the event's own payload: `brief:<key>` out, `answer:<key>`
back, and the hand answers about the ids it read off the brief's own node in its
own session. No id is matched across hands.

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
```

After engine changes, rebuild the browser bundle and re-copy it to `Demos/`
(`Demos/session-engine.html` is the live reference surface) — CI fails if the
committed copy drifts from source. After surface changes, run
`node Demos/build-surface.mjs` and commit `Demos/session-engine.js` with the
fragments — CI checks that too.

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

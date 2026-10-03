# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**The product is dyna.ink** (formerly MetaMedium; renamed 2 Oct 2026, `RENAME-PLAN.md` — §1 holds the
spellings). The repository, its GitHub Pages address and what the plan's §2 lists keep the old name.
**The freeze is over** (2 Oct 2026):
the rename's N0, N1 and N3a–N3e are on `master`. N2 (the license), N4 (dyna.ink as the address, after John's
Cloudflare steps), N5 and H1 remain, each with its place in the plan's ladder. Lanes start again from this
`master`, in fresh worktrees.

**dyna.ink** is a recombinatorial drawing system: interfaces that learn user
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
**See `V1-SPEC.md`** for v1 as re-specced on 2 Oct 2026 — *the diagrammatic
notebook that runs*. It supersedes `V1-PLAN.md` §0 and §11; its units (§6) and
ladder (§7) are what is built next, each phase ending in a release on John's word.
`ARCHITECTURE-v7-PARTICIPANTS-AND-TIERS.md` is the active engine plan; MVP.md
absorbs and raises its Stage D.

**28 Sep 2026: phases 1 and 2 of `V1-PLAN.md` are done and phase 3's cores
are built, all on `master`.** The backbone: every affordance is an offer from
a registered tool (B1), ranked by what stands beside it with the reason said
and the top offer held steady (B2, *Context*), and premade content arrives as
library packs a board uses by an event (B3, *Library packs*). Editing: one
selected mark's own points reshape its clean form (E1, *Handles*), and bound
arrows follow what they are bound to, derived from the bindings, never logged
(E2). Diagrams, in core: the flowchart (D1), the UML class diagram (D4) and
the sequence diagram with the dashed lines it reads and the state diagram (D5), the ER
diagram and the mind map (D6), each a
notation with its pack, its bench and its Mermaid out (D2) and in (D3,
with a layered layout); and W1 keeps a diagram's own strokes from erasing or
being swallowed. **29 Sep 2026: S2, M5 and D2's and D3's surfaces** — an
arrow is read where its ink points (S2); maths on the board, sizes and checks
beside the figure and the page, `=` in the field, true size out (M5, *Maths on
a page*, below; e2e 64); and a drawing that reads as a diagram is offered
*Make it Mermaid*, the Mermaid stands beside it as an artifact drawn in the
board's ink, the export pane writes the file, and *Draw it* puts a Mermaid
text back on the board as marks that read as the same diagram (*Mermaid on
the surface*, below; e2e 62–63). **D7, routing** (*Routing*, below; e2e 66): a diagram's connectors are drawn at
right angles between their ports, round what stands between, by a `route`
event whose polyline is derived from where the sites stand — and *Tidy the
diagram* lines up the ranks and routes every tied connector in one act. **And the hand is in the gate** (H1, `node e2e/run.mjs hand`, *The MCP hand*, below): QA-v10's machine rows walked headless with
`Demos/mcp.mjs` in a room of its own, and `QA-v1.md` is the hand checklist for A1–A10. **And the state diagram, the ER diagram and the mind map** (D5's second half, D6) read, each with its pack and its Mermaid out and in; **and every notation reads on the surface** (N1: the field's *what this is* row and the panel's *is* / *becomes* say *a flowchart 0.92*, *a class diagram*, *an ER diagram* …, e2e 67); **and a first run** (R5): example boards in the boards pane and *start from an example* on an empty board. **And the garment pattern piece** (M6, 29 Sep 2026; *The garment pattern piece*, below; e2e 68): a piece drawn with its grain line, notches, dart and seam allowance or fold reads as *a garment pattern piece*, says what it is cut at and sewn at beside itself, and prints those marks at true size. What is next is a review
of use, and v1.0.0 (`V1-PLAN.md`
§8–§9, every unit with its dated status line).

**1 Oct 2026, I7 (PLAN-IPAD-NOTES §3–§4): seats per job, on `unit/i7-seats`.** The models pane
is four seats — *reader*, *writer*, *decider*, *semantic* — each holding the model the
hand chose for that job, and the key is the provider's, entered once and used by every
seat on it (*The model pane*, below; `Demos/surface/03-seats.js`, `04-seatpane.js`;
e2e `models` M13–M19). *Read the writing* asks the reader seat alone; briefs, pages,
programs, `ask:` and *What is this?* ask the writer (Claude Code first while seated, as
J4); a seat left alone changes nothing. **The decider** is wired: the decision seat
(`participants/decide.ts`) over a chat completion (`llm/decide-openrouter.ts`), and
its first job, *Which is it?* — offered when two definitions match a group about
equally (`tools/which.ts`), asked only by that tap, its answer one more held, attributed
reading (*molecule 0.99 · jev*), taken only at `DECIDER_TAKE_AT` (0.99).

**1 Oct 2026, I9 (PLAN-IPAD-NOTES §3–§4): the semantic seat, and *notes like this*, on `unit/i9-semantic`.**
A small model that runs on THIS device, no key and nothing sent, turns words into numbers: Find lets in what no
word typed matched, and a typed *Notes like this* on held marks (or a region's panel button) lists the others nearest in
meaning across every board, each with its number and reason (*Semantic seat*, below; core `src/semantic/`,
`Demos/surface/03-semantic.js`; e2e `boards` N24–N24l). **Built and proved against a stand-in and a model BUILT for the gate
(its own writer, served from the gate's origin); the real Model2Vec files are UNRUN** — this container cannot reach their
host — and `scripts/check-semantic-model.mjs` is the one command that asks them the same questions.

**28 Sep 2026, J5 (phase 5, seats): a hosted model is asked, and says why
when it cannot be.** John joined GLM Flash from OpenRouter and the canvas
sent it nothing: whether a model sees was guessed from its id (no "glm" in
the guess), a reasoning model's answer outside `content` read as none, and
every failure was one fleeting sentence. Now a join asks the provider's own
list what a model can do; a reply is read the way the provider sends it,
with every call budgeted; a failure is said in full, with the provider's
words; each model's row keeps its last call and has *try it*; and an ask
that needs a model none here can answer is kept and runs when one joins —
asking never opens the models pane (*Tiered LLM Interpretation*, below;
`node e2e/run.mjs models`, against a stub provider).

**28 Sep 2026, phase 5 (seats): J4 — Claude Code is the canvas's seat**, on
`w2-shard`. *What is this?*, *Read the writing* and `ask:` go straight back to
the Claude Code session over MCP instead of out to an HTTP endpoint: the page
parks each question in the live room as a brief (core's
`participants/seat.ts`), the MCP hand lists it with `canvas_pending` and
answers it with `canvas_answer`, paired by the brief node's own id, and
`Demos/seat-watch.mjs` prints the line that wakes the session. The models pane
leads with *Claude Code — in this room*, one tap, and the Live pane's *with
Claude* is the room and the seat in one act (*The canvas's seat*, below).

**27 Sep 2026: phase 0 of `V1-PLAN.md` is done on `w2` — week 1 is whole**
(each unit's dated status line is in the plan's §9). **Ids hold** (L1): a
live hand's log is one sitting, a page load or an MCP process
(`sittingName`, `session/hands.ts`), whose high-water mark only rises
(`session.ts`), so no number is issued twice under one name — not after an
undo, which now reaches every peer (`LiveStore.publish` sends the whole log
when it did not only grow), nor after a peer's line or a reload; one event
is applied once however many logs carry it (L1b, `store/merge.ts`). The
shard pairs a brief and its answer by the brief's node id
(L2a, `dynaink-3d/src/room.ts`) and asks how deep a hull seen from one
standpoint is (L2c, `dynaink-3d/src/depth.ts`). A hand puts a word on its own
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
(`src/packs/`; *Library packs*, below). **Phase 2, editing, has begun: E1**
— one mark selected alone shows its own points, and dragging one reshapes
its clean form by one `reshape` event, the ink untouched
(`session/handles.ts`; *Handles*, below) — **and E2**: a connector bound to a
site follows the mark it is bound to wherever it moves or is reshaped,
derived at replay and never logged, and a drag draws what follows it before
the hand lets go (`session/follow.ts`; *Magnets and bindings*, below). **Phase 0b, a board
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
`dynaink-3d/`): P0–P6 to the MVP line plus a navigation compass. And
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
`Demos/session-engine.e2e.js` drives 470 records through the real UI (468 checks and two honest skips, 25d and 62d, on 1 Oct after S2, M5, M6, D2–D7, N1, R5, I1, I4 and I5; headless with the shard's three scenarios via `node e2e/run.mjs`, which CI runs): page, flowchart, handwriting (read only when asked; a line read as one), the model drawing, the user-side loop, selection and the field, corrections, the worker, the tank, words into verbs and acting out, frames and the drawn slider, the folder, pictures, text, the moment, a live room (and ids that hold in it: an undo sent, one sitting per page load, a doubled name and a truncated room said), a playing frame that takes the pointer, hold by long-press, the graph in 3D, and the foundations (letters at any size, a mark that crosses, readings that stay, the minimap), the explanation plane's layout, one Enter one act and what `fitAll` fits, labels (a hand's and a person's, on their own ink only), who made what, gestures per hand in a room, a person the same across a reload, and what a paint reads (R4c: at eighteen points the board painted both ways and every mark's role compared with the whole-board read; the reading under a mark, a neighbour's panel, a chip and a card following the log the moment it changes, undo, a move and another hand's line included; a pointer move that paints no board, a wheel that paints once a frame), and the field's offers (B1: e2e 49, the golden record of what the field offers three scopes — a row of boxes, a molecule, a line of writing — captured before tools; a tool registered in one line, offered at once), the steady top beside a flowchart (B2: e2e 50), and library packs (B3: e2e 51 — basics@1 used from the packs pane, the canonical molecule named with nothing taught and its pack said, stopped, undone, the golden unchanged on boards with no pack, a pack the build lacks said, the flowchart's ports on the pen), and handles (E1: e2e 52 — a box selected alone shows its nine points and its corner dragged reshapes the clean form while the ink stays; the magnets follow, one undo, the zone rule on both sides of a corner, the knob and the move zone on a reshaped box, none on writing), and bindings that follow (E2: e2e 53 — two arrows tied to a box follow it when the pointer drags it and still read as pointing at it, one move event; one undo; drawn following before the hand lets go; an arrow's tip handle dragged onto another box's corner binds there, the old claim let go, in one act, and one undo takes it back), and the garment pattern piece (M6: e2e 68 — a piece drawn with the pointer read in the field, cut and sewn beside it, its marks at true size, a fold cut on the fold), and the user surface (`PLAN-USER-SURFACE.md`: a tap off the field with a wobble leaves no dot, e2e 54; writing is read, not named, 55; the panel in the user's words with the inspector behind *details*, 56; the status line in words, 57; the field by the hand, off the minimap and the held marks, whole, 58; Enter does the likely act, 59; the control centre grouped, 60; help and your mark, 61). A run takes about 50 s headless; run it **in its own tab on its own origin** (`http://127.0.0.1:8010/…?fresh=1&nosw=1` — `__setup` refuses any other URL: it replaces `fetch` with a stub, joins a stub model named `e2e-stub`, and wipes the origin's saved board), start it with `__setup(); __scenario().then(r => window.__R = r)` and read `__R` when it lands.
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
- `PLAN-USER-SURFACE.md` — **the user surface, a plan for the next dev agent, 28 Sep
  2026**: self-contained (setup, the suite, how to work, what is in flight and who
  owns which files); W3 a tap never leaves a dot, W2 writing reads when it is
  writing, U1a–U1g the surface speaks the user's language (the panel, the status
  line, the field by the hand, relevant offers, Enter as the likely act, the control
  centre grouped, help as a user guide), U2 the audit walked again; the J5 and J4
  briefs in case the local lanes stop
- `PLAN-IPAD-NOTES.md` — **dyna.ink on the iPad, 1 Oct 2026**: is the canvas ready for
  hand notes, many pictures and SVGs on an iPad Pro with a Pencil? Not yet — a picture's
  pixels are never kept or drawn, every picture is traced into ink (a camera photo is
  ~3,900 strokes), many traced marks beside an artifact are very slow, exports drop what
  came in, nothing asks for persistent storage, there is no search or region; the seats
  per job (reader, parser, semantic, decider — Jev — and writer), each with its own key;
  the MVP units I1–I10, John's decisions, and what to check on the real iPad
- `PLAN-FIELD-PAR.md` — **the field, up to par, built 2 Oct 2026**: John's two boxes and a
  line, circled, *diagram* typed, met only *Name it* / *Label it* — walked again with real pointer
  input (`node e2e/walk.mjs`); the diagram tools gated on a notation's floor, a one-stroke arrow's
  tip never tied, typing that finds only what is offered, a word taken as a brief, a concept as a
  name; the push FP1–FP9 (intent words, a graph is a diagram, the tip binds …) and what a decision
  model adds after it (D1–D3), with how to set one up and compare Jev, the semantic seat and GLiNER2;
  John's decisions (§7), and Name and Label folded into one pill where they do the same
- `GUIDE-2026-10-02.md` — **the hand-over, 2 Oct 2026**: where it all stands on `master`, every affordance
  with where it lives, the user's tasks end to end, the agent guide (Claude as a hand and the seat; a dev agent's
  commands, invariants and traps), the QA guide (the gate by scenario, the field push by hand, what is known) and
  the director's view (against v1.0.0, risks, next pushes, John's open decisions in one table). A snapshot: the
  files it points to are the truth
- `V1-SPEC.md` — **v1, the diagrammatic notebook that runs, 2 Oct 2026** (supersedes `V1-PLAN.md` §0 and
  §11; what V1-PLAN built, and A1–A11, stay the floor): John's directions of 2 Oct, kept in its §13 — the
  2016 thesis (dynaPlane), Sketchpad and Put-That-There, his notebooks' ink brought back from vector
  outlines — as seven promises and 54 units (IN bring it all in, KN kinds and colour with meaning, CS offers
  at rest and the field, AR arrange and locate, MP maps and morphisms, RN run the diagram, CG together, TH
  two homes, VO voice; RP in v1.1), acceptance A12–A29, eight phases each ending in a release on John's
  word, and 23 decisions; the colour space's specimen is `brand/colour-space.html`
- `RENAME-PLAN.md` — **the rename, 2 Oct 2026**: MetaMedium becomes dyna.ink. §1 is the one home of the
  spellings — read it there, never from a copy; §2 what keeps
  the old name and why (the `mm-*` keys, `mm-boards`, the `mm` contract, `.metamedium/`, the dated documents,
  the old address); §3 John's decisions (AGPL-3.0-only, an organisation before a hard launch). Units: N0 a
  checkpoint release `0.1.0`; N1 carry boards from the old address to dyna.ink in one tap, since browser-kept
  boards belong to the address; N2 the rights; N3a–e the rename by layer; N4 dyna.ink as the address, the
  old one kept live; N5; H1. **A freeze from N0 to N3e**: nothing else lands
- `UX-AUDIT-2026-09-28.md` — **the canvas as a user meets it**: sixteen findings
  from a walk of `/app/` using only what the screen gives (the models pane that
  pops and drops the question, no way to reach Claude, the inspector as the panel,
  the status line as a log, the field off by the minimap, Enter as a rename,
  irrelevant offers, slugs, a stale help), and seven principles
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
- `ARCHITECTURE-v6-SESSION-ENGINE.md` — **active design**: the no-modes session engine (deferred commitment, summoning, promotion ladder, capability tiers), implemented in `core/`
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
| `core/` | **The canonical engine** (`@dynaink/core`, not published; TypeScript, zero deps, tested): geometry, recognition (the shape rung), relations, the diagram rung (`src/diagram/`), notations over it (`src/notations/`: the flowchart, the UML class diagram, the sequence diagram and the dashed lines it reads, the state diagram, the ER diagram, the mind map, the garment pattern piece, Mermaid out and in, and a layered layout), **routing** (`src/diagram/route.ts`: orthogonal routes between bound ports, derived, and the tidy plan; `src/tools/route.ts`; under *Routing*), concepts, the no-modes session engine, the layout and graph parsers, maths (`src/maths/`: quantities, expressions, the sheet, dimensions, solving figure by figure, true size and tiled print, what is said of it on the board — `board.ts` — and what a pattern piece's marks come to, `garment.ts`), the participants — a model's prompts and parsing, the router, the bridge, and **the decision seat** (`src/participants/decide.ts`, tier 1½; under *Tiered LLM Interpretation*) — **the tools** (`src/tools/`: what the field affords, one contract and one registry; under *Tools*), **the context** (`src/context/`; under *Context*), **find** (`src/search/`: words folded and cut, what a board says extracted from its state, a query ranked across boards with a hook for a meaning seat, which boards to read again, a thumbnail's fit; under *Find*, in *Several boards*), **the semantic seat** (`src/semantic/`: an injectable embedding transport, cosine, a stub, the score function Find takes, *notes like this*, a static-embedding model read from its own files; `src/tools/like.ts`; under *The semantic seat*), **the library packs** (`src/packs/`: the format, the validator, the shipped packs by `id@version`, `use`/`unuse`, the bench; under *Library packs*), **magnets, handles and bindings that follow** (`src/session/magnets.ts`, `handles.ts`, `follow.ts` with `affine.ts` and `manipulate.ts`; under *Magnets and bindings* and *Handles*), **regions** (`src/session/board-regions.ts`, `src/tools/region.ts`: named places that hold what stands inside them; under *Regions*) and the LLM transport. New recognition/engine work lands HERE |
| `index.html` | **Interactive whitepaper v5** "dyna.ink: AI Beyond Chat" (live on GitHub Pages). Fully on the `brand/` system as of 3 Sept 2026 — its `:root` is `brand/tokens.css` under the names this page already used, so change a value THERE first |
| `brand/` | **The visual system, one home**: `tokens.css` holds every dyna.ink colour, face, size and figure/diagram token; `styleguide.html` is the living specimen (light paper first, IBM Plex Mono throughout, teal keyword, colour as signal, §11 figures and diagrams, §12 long-form furniture); **`colour-space.html`** is the colour space's specimen (V1-SPEC KN3, 2 Oct 2026): kinds said in a field, hue as the kind and its kin, lightness as depth, chroma as how sure, on both grounds and under three colour-blind simulations, its grounds and signal colours read from `tokens.css` and its functions KN3's starting point. v1 draft — the whitepaper's **figures** have migrated, the page around them has not; `brand/README.md` carries the four laws, the convergence order, and what applying it to the whitepaper taught the system |
| `doodle2-canvas.html` | **Flagship demo**: heuristic recognition, spatial graph, library, undo/redo, touch. No LLM. Single-file (~500KB) |
| `metadoodle1.html` | Fork of flagship + tiered LLM recognition (WebLLM in-browser, LM Studio local API) + voice. Single-file (~600KB) |
| `Web App Skeleton/` | React + Vite + TypeScript + Zustand rebuild; Claude API interpreter skeleton in `src/llm/`; recognition/spatial/matching in `src/core/` |
| `Demos/surface/` | **The reference surface's source**: `surface.css` and forty-four script fragments (incl. `17-find` and `26-find`, I6, under *Several boards*: Find, `17-carry` and `22-carry`, RENAME-PLAN N1, under *Several boards*: carried to the new home, `24-relay`, A2, under *The hand organises notes*, and `03-semantic`, I9, the semantic seat's adapter) (`00-core`, `00-ui` … `12-regions` (regions: the frame, the title as a handle, the outline; I5), … `17-assets`, `17-bundle`, … `20-controls`, `21-minimap`, `22-boards`, `23-packs`, `24-seat`, `25-maths`, `25-mermaid`, then `90-boot`, which must stay last), one concern each, concatenated in name order into one closure by `Demos/build-surface.mjs` → the committed `Demos/session-engine.js` (CI checks it has not drifted). Because they are one closure, the build and its `--check` refuse a name declared at the top of two fragments — the last would silently replace the first everywhere, which broke rendering once — reading the fragments as one strict block, so they must also compile as strict code (`Demos/build-surface.test.mjs`, in CI's `core` job). Fragments share the closure's variables — no imports; each fragment's header says what it provides and uses. Edit a fragment, run the build, commit both. **`09-field.js` is the exception that proves the rule** (SEAM-1): it names nothing outside itself, so the field's query is a pure function of a record and is unit-tested in Node with no browser — `node --test Demos/surface/09-field.test.mjs`, in CI's `core` job. **`17-board.js` is the second** (V1-PLAN R3): the journal the board this browser keeps is written through, driven in Node by a store held in memory — `node --test Demos/surface/17-board.test.mjs`, in CI's `core` job too. **`17-boards.js` is the third** (R1): the list of boards — names, the trash, which board a page opens, whether the one on screen may be left — `node --test Demos/surface/17-boards.test.mjs`, also in CI. **`07-hand.js` is the fourth** (R6): the hand's rules — what a pen, a finger and a palm do, and the hand tile's face and cycle — `node --test Demos/surface/07-hand.test.mjs`, also in CI; `07-input.js` is its adapter. **`17-assets.js` is the sixth** (I1): what a picture is kept as, its name, where a pick stands, which assets nothing uses and what the decoded pictures cost — `node --test Demos/surface/17-assets.test.mjs`, also in CI (`18-images.js` is its adapter: IndexedDB, workers, canvas). **`17-bundle.js` is the seventh** (I4): the zip written and read by hand, the board bundle, the board as one SVG, the PNG's size and the PDF writer — `node --test Demos/surface/17-bundle.test.mjs`, also in CI (`18-out.js` is its adapter: the export pane, the offscreen canvas, the file opened). **`17-carry.js` is the eighth** (RENAME-PLAN N1): who may send boards and who may take them (two fixed origins, and an address read only on a page on this machine), the preferences carried by name and never a key, what a carry brings in, and every board out in one file — `node --test Demos/surface/17-carry.test.mjs`, also in CI, loaded with `17-boards.js` and `17-bundle.js`, whose `boardName` and zip it calls (`22-carry.js` is its adapter: the window, the messages, the pane's acts).
**`03-seats.js` is the fifth** (I7): the seats' rules — who reads, who writes, whose key is whose, what an older device's pick becomes — `node --test Demos/surface/03-seats.test.mjs`; `04-models.js` and `04-seatpane.js` are its adapters. **`24-relay.js` is the eighth** (A2): which relay *with Claude* defaults to for the page's hostname, and the one hosted relay the seat accepts — `node --test Demos/surface/24-relay.test.mjs`, also in CI (`24-seat.js` is its adapter). A fragment's `.test.mjs` is not concatenated into the build. `09-palette.js` is the adapter over core's tools (B1): it reads the readings, maps `MM.offersFor` to pills and performs what only the surface can, and builds no affordance by hand |
| `Demos/` | **`session-engine.html` is the MVP surface** (it links `surface/surface.css` and loads `session-engine.js`) — infinite canvas, the taught command mark, living artifacts in a DOM overlay, ink-over-artifact addressing, "why" inspector, model participants, canvas answers. Uses the committed `dynaink-core.browser.js` bundle, whose global is `DynaInkCore` — with `MetaMediumCore` assigned the same object for one release, for anything outside the repository that reads the old one (RENAME-PLAN N3c; `core-bundle.test.mjs` runs the bundle as a page does and asks that both are one, in CI's `core` job). **`session-engine.e2e.js`** drives the whole loop through the real UI with a stubbed model (browser console; not part of `npm test`). `build-standalone.mjs` inlines the bundle into a single shareable file (and exports the same build as `standalone(dir)`, which the release script attaches to a release). **`sw.js` is the service worker for both addresses** — this one and `/app/` — copied to `app/sw.js` by `scripts/build-app.mjs`, which stamps `VERSION` into it and into the page's `<meta name="dynaink-version">` (*One app address*, below). **`mcp.mjs`** is the MCP hand (Claude Code's way onto the board; `.mcp.json` at the root registers it), over `relay.mjs` and `live-node.mjs`, with `ink-png.mjs` for the ink as a picture (and, since A1, the PNG reader and the pictures under it) and `mcp-smoke.mjs` as its stdio test; it is also the canvas's seat's answerer, and **`seat-watch.mjs`** is the silent reader that prints one line per brief parked there — what wakes a Claude Code session (*The canvas's seat*, below); `dynaink-core.node.mjs` is the committed Node bundle it runs (`npm run build:node`, drift-checked in CI like the browser bundle). **`relay-protocol.mjs`** is the relay's protocol with no server in it (what a client is replayed, the truncation word, the cap — and, since A1, a room's pictures: the asset address, `sniffImage`, the verdicts and their sentences), read by `relay.mjs` and by the Cloudflare Worker (`cloudflare/relay`); `relay-assets.conformance.mjs` is the one definition of the asset cases, run against both servers; `ink-png.test.mjs` is the PNG reader's. **`relay.test.mjs`** is the relay's own test (`node --test Demos/relay.test.mjs`, in CI's `core` job): the catch-up as a pure function, and, over a real relay on a free port, the truncation line and three hands with one departed. `Demos/programs/` holds `run` programs written for the canvas (`dynaink-explained.run.js`: the loop told as a program, ending on a real measurement of the viewer's own stroke). Plus fish, composition diagrams, no-modes graph, etc. |
| `app/` | **The app — v1's one address, `https://jjh111.github.io/MetaMedium/app/`** (V1-PLAN R7). Made, never edited: `index.html` is `Demos/session-engine.html` with each file it asks for asked for from `/app/` (`../Demos/…`), `sw.js` is `Demos/sw.js` byte for byte, `manifest.webmanifest` is the old address's starting and scoped at `./` — all three written by `node scripts/build-app.mjs` and drift-checked in CI (`--check`). Installable there, and it opens with no network after one visit. `Demos/session-engine.html` stays where it was and works as it always has |
| `HELP.md` | **The help pane's page**, for a person using the canvas (PLAN-USER-SURFACE U1g): the loop, the field, handling marks, models and Claude, boards, rooms, your mark, undo, *On an iPad* (the Home Screen and why, the pencil, pictures), the shortcuts. The help tile reads it (`20-controls.js`), both service workers keep it for offline, and the gate's `app` scenario asks for it. Keep it true to the surface — it names controls and keys |
| `VERSION`, `CHANGELOG.md` | **The version, one line** (`MAJOR.MINOR.PATCH`, an optional pre-release; `0.0.0` until the first release) — stamped into the page and both service workers' cache names by `scripts/build-app.mjs`, said at the head of the help pane. **The changelog**, newest first, one section a release, written only by `scripts/release.mjs` |
| `LICENSE`, `NOTICE`, `TRADEMARKS.md`, `CONTRIBUTING.md` | **The rights** (RENAME-PLAN N2): `LICENSE` is the GNU AGPL-3.0 verbatim, named `AGPL-3.0-only` everywhere else; `NOTICE` is **the one home of who holds the copyright** (the whitepaper's footer and `TRADEMARKS.md` must agree with it — `scripts/rights.test.mjs`), the essay's CC BY 4.0, and every third-party piece a page loads or a build bundles; `TRADEMARKS.md` how the names may be used; `CONTRIBUTING.md` issues now, outside code once the contributor agreement is published |
| `scripts/` | **The app's build and the release** (V1-PLAN R7): `build-app.mjs` (stamps `VERSION`, makes `app/`; `--check` in CI) and `release.mjs` (`node scripts/release.mjs <version> [--dry-run] [--since <ref>]`: refuses a dirty tree and a version not greater than the last, writes the changelog's section by unit, bumps and stamps, builds the standalone file into `dist/release/`, commits, tags `v<version>` annotated — and never pushes). `build-app.test.mjs` and `release.test.mjs` are theirs (`node --test`, in CI's `core` job). **`name.test.mjs`** (RENAME-PLAN N3a, N3d, N3e; in CI's `core` job) reads everything a person sees — the pages and their manifests, the help, the 3D surface's page, the brand's styleguide and colour space, the surface's fragments' strings, the MCP hands' and `.mcp.json`, the engine's strings and the programs under `Demos/programs/` — and fails on the old name outside an address, Kay's lowercase idea, an outside work's title and an allowlist whose every entry says why. **`make-icons.mjs`** (PLAN-IPAD-NOTES I3) draws the app's PNG icons into `Demos/icons/` (committed) with Playwright's Chromium, from the old SVG glyph and the surface's dark ground. **`examples.mjs`** (V1-PLAN R5) makes the example boards under `boards/examples/` from the engine — `--check` in CI, `examples.test.mjs` its Node test (*Several boards*, below). **`check-semantic-model.mjs`** (PLAN-IPAD-NOTES I9, not in CI: it needs the real model's files) reads a static-embedding model's folder or address with the same code the page runs and asks whether related words are nearer than unrelated — the one command that closes the semantic seat's *unrun* (*The semantic seat*, above) |
| `boards/` | **Boards kept as logs.** A board worth keeping is its log, one event per line (a version 1 header first, R2 — `boards/story/board.jsonl` stays version 0 as it was kept), as the app's export writes it and the boards pane opens (*from a file…*). `boards/story/` is the first (28 Sep 2026): dyna.ink explained in its own medium — the architecture, a stroke's life drawn in ink and read back by the engine as a sequence diagram, the plan's 59 units, the ten scenarios, the numbers, a treemap of the code, a flowchart and a class diagram read live beside the Mermaid the engine wrote, and the thirteen gaps building it found — with the scripts that drew it through an MCP hand run from the shell (its README says how, and how to make the next). **`boards/examples/`** (R5, 29 Sep 2026) is the app's own examples — a flowchart with its Mermaid beside it, a class diagram, a molecule from the Basics pack, a pattern page with a right triangle — each a log **made by `scripts/examples.mjs`**, never drawn, listed by `index.json` in the boards pane's *Examples* and opened as a new board of your own (its README) |
| `skills/` | Claude Code skills: `dynaink-code` (code patterns), `dynaink-design` (design principles) |
| `Assets/` | Figures and design rationale (recognition strategy, point-primitive proposal), and the social card. `Assets/ux-audit-2026-09-28/` holds the screenshots of the audit walked again (U2), which `UX-AUDIT-2026-09-28.md` cites. `make-card.mjs` regenerates that card from index.html's own hero — synthetic pointer input, so the picture shows the engine really reading a mark; `node Assets/make-card.mjs`. Change the picture and you must change the FILENAME and the four og:/twitter: tags in `index.html` and `404.html`, because scrapers cache by URL. **`Assets/whitepaper-figures/`** is the whitepaper's seven graphic plates: `build.py` holds their content and geometry and emits the static blocks `index.html` carries between `whitepaper-plate:KEY` markers (`--check` says they are in sync), `figures.css` and `figures.js` style and enhance them with no build, and `e2e/whitepaper-figures.mjs` audits the real page; its README is the workflow |
| `archive/` | Retired versions and superseded plans, incl. whitepaper v4 (root `MetaMedium_Whitepaper_v4.html` is a redirect stub — keep it) and PRDs v3.2/v4 |
| `e2e/` | **The browser gate** (`DIRECTOR-REVIEW-2026-09-15.md`, QA-1): `node e2e/run.mjs` starts its own servers on free ports (a static one over the repo root, vite over `dynaink-3d`), opens a **fresh browser context per scenario**, loads the harnesses that already exist — `Demos/session-engine.e2e.js` (`__setup` + `__scenario`) and `dynaink-3d/e2e.js` (`__scenario`, `__demo`, `__demo2`) — and awaits the result object each one returns. It does not reimplement them. **Fourteen scenarios** on Chromium by default (`canvas`, `keep`, `boards`, `carry`, `app`, `pencil`, `models`, `seat`, `hand`, `walk`, `budgets`, `shard`, `demo`, `demo2`) — **`walk`** (`e2e/walk.mjs`, PLAN-FIELD-PAR FP9; 14 records, about two minutes) holds the field push with the pointer's own strokes: an arrow tied at its tip, John's two boxes and a line read as a diagram and offered Mermaid and tidy, the molecule its own thing, the words that find acts, what is missing said, `?`, *export* from the field, a lone word that waits, Name and Write folded, no *Read as writing* on a head, no developer's words, and a word found by meaning with the seat asked once: 885 records as of 2 Oct 2026, after the iPad units (I1–I9, CF1, A1, A2, A2b, P1 and the rejoin fix) and the field push (PLAN-FIELD-PAR) — canvas 470 (468 and two honest skips, 25d and 62d, the real Mermaid library a CDN this machine may not reach), keep 38, boards 68, app 18, pencil 18, models 47, seat 12, walk 14, hand 37 (32 and five skipped by name: John's handwriting, a small model that fails, a ghost's timing), budgets 17 (P1's structural records of the ink raster among them), shard 123 + 11 + 12; on a machine too loaded or too slow to measure, or one whose page draws in software, the budgets' timing records are skipped by name (a cloud container on SwiftShader ran 873 passing and twelve skips in 687 s). **`carry`** (`e2e/carry.mjs`, RENAME-PLAN N1, in the default run and CI's WebKit job; 18 records, about 12 s, on Chromium and WebKit) starts two static servers of its own beside the gate's, so three origins play the old address (A, whose address names B with `?carryTo=`), dyna.ink (B) and a stranger (C): one tap in A's boards pane opens B in a window, which takes both boards whole — each log as A's journal held it, the picture painted, the mark taught, the preferences set, a name B already had suffixed, the empty board B opened with in the trash; a second carry brings nothing twice; keys planted in A's storage and a room key in its address are in no message, in nothing B keeps and not in the file; C's carry is refused and C is never told B is ready; *Every board out* round-trips through *From a file…* on a browser that never saw the boards and doubles nothing on B; and the notice, shown as N4 will turn it on, leads the pane and is said once. **`models`** (`e2e/models.mjs`, V1-PLAN J5 and I7, in the default run; 38 records, about 30 s; M0–M12 are J5's and passed on WebKit too, M13–M19 are the seats' and run on Chromium) runs the real transport through the models pane and the field against `startModelStub` (`e2e/servers.mjs`) — an OpenAI-compatible endpoint on 127.0.0.1 answering `/v1/models` and `/v1/chat/completions` in OpenRouter's recorded shapes (`core/src/llm/fixtures/`, the core tests' too): the guard still stops a real model host, one local model suggested a job (Ollama's list a stand-in in the page, nothing on the machine probed), *What is this?* with no model kept and run on join, a wrong id refused with the nearest ids, text only and *sees* from the list, *Read the writing* saying which model cannot and why and running when one that sees joins, a 401 and a reasoning-only reply said in the row, *try it*, a reload rejoining with the vision flag right, and the key nowhere but where *remember* put it — then **seats** (I7, M13–M19, each in a clean context of its own): one key typed once serving a writer, a reader and a decider on the stub; *Read the writing* asking the reader alone and *What is this?* the writer alone, and nobody asking the decider or a model with no seat; *Which is it?* offered on a tie and not otherwise, asking the stub's decision model once and its answer standing at 0.99 beside the engine's, an answer at 0.97 said and held for nobody; a reload keeping the seats; the key nowhere but `mm-model-keys` across every seat; a device that did not remember the key, whose seats come back and are served by the key typed once; and an old pick and key becoming the writer seat. The stub answers the decision model's call shape too (`fixtures/decide-replies.json`, its shapes written by hand — nothing says what the real model returns). **`seat`** (`e2e/seat.mjs`, V1-PLAN J4; 12 records, about 13 s) is Claude Code as the canvas's seat with no model anywhere: a relay of its own on a free port — never `:8020`, where a room of John's may be; a request there is refused and counted — `Demos/mcp.mjs` as the answerer over stdio and `Demos/seat-watch.mjs` beside it; the pane leading with Claude Code, one tap, *What is this?* and *Read the writing* parked, listed, answered and landing as a model's, a refusal said, a brief withdrawn by Esc, a reload that finds the pairing, and *with Claude* as the room and the seat in one act (*The canvas's seat*). **`hand`** (`e2e/hand.mjs`, V1-PLAN H1 and PLAN-IPAD-NOTES A1, in the default run; 34 records — 29 passing and five skipped by name — about a minute) is the MCP hand in the gate: a relay of its own on a free port (never `:8020`; refused and counted), `Demos/mcp.mjs` over stdio in room `mcp-test`, a tab as *john* and a counting model of the gate's own, walking QA-v10 §4, §6 and §7 and acceptance A7 — a sentence, a reading, a transcript and a label landing on the right marks after an undo and a reload, a field left open and a loop that waits under the hand's stroke, the minimap, *Show it in 3D*, and pictures in a room (H1.22–25: the hand imports a PNG and a tab that holds none of it fetches it by hash and draws it; a picture a tab imports is put on the relay and a second tab, a context of its own, fetches and draws it, and the hand sees it; the same on the Worker's logic with a room key, by Bearer after a CORS preflight) — with the rows that need John's own handwriting as skips by name and every generated stroke said `synthetic`; its invariant is *Tier 1 before a model* (the gate's model is asked once, by *What is this?*, and never by the hand's arrival or any of its tools). **`budgets`** (`e2e/budgets.mjs`, V1-PLAN R4c) paints the bench's 500-mark board both ways, every mark pointed at, boxes drawn and undone, and every mark held (`paintCheck`, `rolesCheck`, `heldCheck`: a hand's paint must draw and say what the whole-board read would), then measures PERF.md's budgets on the 2,000-mark board — open, release → reading drawn, a pointer move, a pan at zoom 1 and at fit-all — each a step with its number, **skipped by name** on a machine too loaded to measure or slower than the one they were set on (a calibration in the page), or whose page draws with a software renderer (SwiftShader: a container's paint is slower than its calibration says); and, last (V1-PLAN I2), a board of five artifacts and 5,000 strokes traced from pictures (3 pictures of 1,667 beside 2 SVGs) opened as a folder, held to PERF.md's 3 s at 5,000 marks (it took 96 s) — a record that it opens whole, and one for its open, skipped by name like the others. **P1 added** (1 Oct 2026) a fourth block, structural so it never skips: a board of 2 pictures of 1,000 traced strokes beside a figure, its paint's `stroke()` calls counted (`countCanvasCalls`), the ink's raster held, blitted over twenty pans and never stale across a zoom, a stroke, an undo and a drag, the blit equal to the same strokes laid on the canvas (`pictureFacts`, 9 records; *A big still group is drawn once*). Beside them, **`smoke`** is opt-in and runs on WebKit (`node e2e/run.mjs --browser webkit smoke`): the board loads, ink drawn with real pointer input is read back, press-and-hold opens the field and one pill is taken — four checks in `run.mjs` itself, a WebKit smoke and not an iPhone test. CI's `webkit` job runs it with `pencil` and `keep` (`--browser webkit smoke pencil keep`, `npm run webkit` in `e2e/`, about 30 s). **`pencil`** (`e2e/pencil.mjs`, V1-PLAN R6, in the default run and on WebKit; 16 records, about 17 s) is the canvas by pen and finger at an iPad's size: a pen and fingers synthesised in the page as iPadOS delivers them (`pointerType` `pen` with a pressure and a tilt, `touch`), and the on-screen keyboard as iPadOS tells the page (a stand-in `visualViewport`, installed before the page's scripts, that shrinks) — the pen draws with its pressure on every point, the switch said once, a finger pans, two pinch and leave nothing in the log, a palm during, just after and just before the pen is nothing, the pencil's hover shows the reading and the magnet, the field by the pen's hold and a pill, a clean, an undo, the field above the keyboard with every pill scrolled to and hit, the hand tile round, the mouse untouched, a save and a reload, a handle of the one selected mark dragged by the pen while a finger laid on another pans (E1), and a tap off the open field with a few pixels of wobble that closes it and leaves no dot, by the pen and by a finger that draws (P12, W3); the pencil's coalesced samples all recorded, in order, and a time on every point (I3, P13–P13b); `QA-v1.md` §A10 is what only an iPad can say. Pass, fail and **skip** are counted separately (a record whose name says it skipped is a skip); a failed assertion, a harness exception, an attempted request to a real model, or a page error not on the named allowlist in `guards.mjs` each exit nonzero, with structured JSON and a screenshot in `e2e/results/`. Beside the gate, on its static server and never run by it or by CI: `e2e/walk.mjs` (a user's walk: real pointer input, what the field offers with nothing typed and with ten words typed, per scene — PLAN-FIELD-PAR §1), `e2e/perf.mjs` (the surface's half of `PERF.md`, numbers, each budget said within or over — measured with the gate's own `budgets.mjs`), `e2e/pictures.mjs` (P1: a board of traced pictures panned, each view with the ink's raster and without it, the paint's JavaScript, the frame interval and the `stroke()` calls a paint makes) and `e2e/whitepaper-figures.mjs` (the plates' audit, Chromium and WebKit). **`keep`** (`e2e/keep.mjs`, V1-PLAN R3) loads no harness: the kill test (the page crashed or closed at random points, reopened, every completed stroke there), a save forced to fail, the one import of browser storage's old board, two tabs, and the pages that must not write — in the default run, and on WebKit where it can (`--browser webkit keep`, in CI's `webkit` job since R6: 22 records and 3 skipped by name — the quota is Chromium's to force); **`big`** (opt-in, minutes) saves and reopens a 2,000-mark board. Since R1 the kill test keeps two boards and switches between them through the boards pane mid-session, killing right after a switch and in the middle of one. **`boards`** (`e2e/boards.mjs`, R1, in the default run) drives the boards pane with the real pointer: the old board as the first entry, new, switch, reload and `?board=`, rename, duplicate, delete, restore, emptying the trash said first, a board open in another tab, one tab per board, the view per board, recent places, Reset, a board out as a file and back, a board that is not saved never left without a word, a library pack kept with its board through a reload (B3), and the ask that the browser keep the device's storage and the pane's foot saying how much room is left (I3, N20–N20f, against a stand-in for the storage API), and the semantic seat's records (I9, N24–N24l, `e2e/semantic.mjs`: Find by meaning, *Notes like this* and a region's button with a stand-in transport seated, then the page's own loader against a model the gate BUILDS and serves from an origin of its own — its two files fetched once with no key, kept in the browser's cache, nothing loaded at boot, and a refusal, a missing file, a page of HTML and a file too big each said in words). **`app`** (`e2e/app.mjs`, R7, in the default run; 14 records on Chromium and WebKit, about 10 s) opens `/app/` on the gate's static server: every file it asks for answers, the manifest starts and is scoped there (and Chromium finds it installable), the worker's scope covers the page and the page is *controlled* by it, a box drawn comes back on a reload the worker served and with the server gone, the help pane says `VERSION`, a request carrying a key is never kept, the old address and every address the whitepaper, `404.html` and the README link still answer, the PNG apple-touch-icon and manifest icons answering at their sizes, the iOS meta and a theme colour from the tokens, and both workers keeping the icons (I3, A12–A15) — and a release renames the cache, beside a control that shows the stale shell a cache that kept its name serves. `e2e/README.md` has the rest |
| `PERF.md`, `core/bench/`, `e2e/perf.mjs` | **The performance baseline** (V1-PLAN §9 R4a, 27 Sep 2026): `bench/board.mjs` draws deterministic boards of 500, 2,000 and 5,000 marks from a seed (the generator is kept, never the boards); `bench/engine.mjs` times replay, memory, relations, the whole-board read, one more stroke, a live room's incoming line and a newcomer's hello; `e2e/perf.mjs`, beside the gate and on its servers and model guard, times the surface — open, pan, draw, release → reading drawn — in Chromium and WebKit; `bench/profile.mjs` reads a CPU profile back to `src/…:line` and the surface's fragments; `bench/report.mjs` prints `PERF.md`'s tables from the results. `PERF.md` has the answer (500 marks usable, 2,000 not, 5,000 does not open), every number with its command, the hotspots ranked with file:line, and budgets for R4b — and, after R4b, the engine's numbers beside them. **R4b added** `bench/budgets.test.mjs` (`node --test`: the engine's budgets on the generated 2,000-mark board — replay ≤ 0.5 s, a stroke ≤ 4 / 16 ms, ≤ 150 MB — and the 5,000 board replays; each size in a process of its own, every run's numbers recorded in `dist/bench`) and `bench/equivalence.mjs` (every held log, a scripted log of the rarer acts and the 500-mark board replayed by the old engine — a committed bundle at `--ref` — and by `src/`, every reading and id compared, and what differs said). Not in `npm test` (`vitest.config.mjs` keeps `bench/` out) or the gate. **R4c added** the surface's column, and its budgets to the gate: `e2e/budgets.mjs` (what `perf.mjs` and the gate's `budgets` scenario both measure with) **I2 added** (V1-PLAN I2, 1 Oct 2026) pictures traced into ink beside artifacts: `bench/board.mjs`'s `tracedStrokes` and `importedBoard` (what `trace` leaves of a photograph, and a board of SVG figures and pictures as the surface brings them in — the traced ink, then the picture beside it), `bench/imports.mjs` (apply per import, cold and warm replay, a stroke drawn on a picture's ink; `--bundle=` for an older engine) and two tests in `bench/budgets.test.mjs` (an import of 2,000 traced strokes beside an SVG applies in ≤ 4 ms a stroke on average and replays in ≤ 0.25 ms a mark, a stroke on its ink ≤ 4 / 16 ms; 5 pictures beside 5 SVGs the same, replay ≤ 1.25 s) — a minute and a half to apply and replay before, under a second after. **R4d added** `bench/room.test.mjs` (`node --test`: a live room's budgets on the 2,000-mark board — a line ≤ 16 ms at p95 with no full replay, one crossing a mark just drawn too, a line that lands earlier from a checkpoint, a line with no events no work, a newcomer's hello one copy of each log in rooms of three and six with a hand gone — measured by `bench/room.mjs`, whose `--path=before` is the surface before R4d). |
| `cloudflare/` | **dyna.ink on Cloudflare** (CF1, 1 Oct 2026; `cloudflare/README.md` is what John does, once): **the site** — `build-site.mjs` makes what GitHub Pages publishes (git's tracked files less the tests, CI and this folder) plus `_headers` (`pages/headers.template` + `pages/csp.txt`: the app's CSP held to what its source loads — `'unsafe-eval'` stays because a program's frame inherits it and runs `new Function`; no COOP/COEP, the reason written) and `_redirects` (`/app` → `/app/`), for Cloudflare Pages; `site.test.mjs` holds it. **The room relay** — `relay/`: `Demos/relay.mjs`'s protocol as a Worker + one Durable Object per room (`src/worker.mjs`; lines kept in SQLite-backed storage in pieces, bounded in lines and characters), **a key per room** (`src/auth.mjs`: HMAC-SHA256 of the room's name under a secret; `room-key.mjs` makes one; `*` opens every room), CORS for the app's origins, fail closed with no secret. Since A1 it also keeps a room's pictures by their hash, in the Durable Object's storage (`PUT|GET|HEAD /rooms/<room>/assets/<sha256>`; *A picture in a room*, under *The MCP hand*). `dev-server.mjs` runs the Worker's logic in Node; `relay.worker.test.mjs` (24 protocol cases over a fake storage, and the picture cases), `relay.parity.test.mjs` and `relay.hands.test.mjs` (`live-node.mjs`, `mcp.mjs`, `seat-watch.mjs` over a socket, with a key) and `relay.workerd.test.mjs` (the real runtime via `wrangler dev --local`, skipped by name without `npm ci`) are `cd cloudflare/relay && npm test`. `.github/workflows/deploy-cloudflare.yml` deploys both on a push to master and skips cleanly without `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`; it makes the Pages project `dyna-ink` the first time and puts the relay's secret from a GitHub secret `MM_RELAY_SECRET` when one is set (from stdin, never logged), so the README's setup can be done from a browser alone (2 Oct 2026) |
| `.github/workflows/ci.yml` | CI, on every push/PR: typecheck + test + build for `core` — with the drift check for both committed bundles and the test of the browser bundle's two globals (`Demos/core-bundle.test.mjs`), the MCP hand's smoke, the surface's drift check and its build's test, the field reader's, the hand's rules', the relay's, the board journal's and the board list's Node tests, the carry's (`17-carry.test.mjs`, RENAME-PLAN N1), the app's drift check (`scripts/build-app.mjs --check`), the app build's and release script's Node tests, the name test (`scripts/name.test.mjs`, RENAME-PLAN N3a: what a person sees says dyna.ink), and the example boards' drift check and test (`scripts/examples.mjs --check`, `examples.test.mjs`) — `dynaink-3d` (with its MCP hand's smoke) and `Web App Skeleton` (with lint); the **browser gate** (`e2e/run.mjs` on Chromium); and **WebKit** — the smoke, `pencil`, `keep` and `carry` (`--browser webkit smoke pencil keep carry`) — in a job of its own. Both browser jobs upload `e2e/results` when they fail |

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
| `launch-video/` | **The soft-launch film** (170 s, 1080p30, with synthesised sound — `sound.mjs` makes a WAV from the page's `window.CUES`, no samples, no dependencies): a teaser for a semi-technical audience on the brand's tokens, one infinite canvas cut punch-then-pause (shots that cut in 0.65 s and hold still — text moved by a fraction of a pixel shimmers) — the history first (Bush, Sketchpad, Kay and Goldberg's metamedium, Put-That-There, SILK, Chalktalk, *As We May Sketch*, tools that imitate paper, AI as a meta-word), then inside (the three rungs, the tiers), then the demo: read (a pentagon measured — corners, sides, angles — and a scribble held as nothing), name (*molecule* typed, a model's proposed structure taken and drawn as water, H₂O), a flowchart as Mermaid then tidied and run, colour that follows meaning (V1-SPEC §3.2–3.3, OKLCH), orbits, Claude as a second hand on the desk and the pad. `index.html` is a pure `render(t)` you scrub in a browser; `node launch-video/render.mjs` renders it to `launch-video/out/` (gitignored) with Playwright and ffmpeg; `check.mjs` samples every frame for text clipped, spilling out of its box, covered or overlapping. Fonts vendored. Its README has the beats and the options |
| `playground.html` | Personal sandbox on the personal-site design language |
| `dynaink-3d/` | **Live · the plan's MVP line (P0–P6) + the compass + the review's four shard packages + push 2 (G0–G5)** — **DynaInk3D**, a bounded dyna.ink for making things in space: ink on a plane read by the shape rung in that plane's own units, a form rung, solids as **op trees in the log** (the tree is the source, the mesh is derived), the diff as the brief, definitions and placements. **Push 2 is geometry from the drawing** (`SHARD-3D-PUSH-2.md`): the board goes out and comes back as its own core-format log; every free stroke is a **silhouette claim**, so a footprint plus ⊓ drawn from wherever the hand stood stands a **hull** at tier 1, in the volume its claims define; the hull is cut into **parts** with ids and a sentence each; the brief a small model can answer is 1048 characters and its reply names parts by id and never writes geometry; and `dynaink-3d/mcp.mjs` is the shard's own MCP hand **and the model seat** — Claude Code answers the parked brief and the shard applies it as it would a model's (`.mcp.json`, `dynaink-3d`). **`dynaink-3d/README.md` is the single source** for how it works, what it does not do, what core would need, and the fixtures; don't restate it here. `npm install && npm run dev` in `dynaink-3d/` (vite on :5174); `?demo=castle` runs the whole loop on John's own drawing at boot and `?fixture=<name>` loads a board from `dynaink-3d/fixtures/`; `npm test` is vitest on the pure rungs (606 in 31 files on 27 Sep); the engine is imported from source (`'@dynaink/core'`, aliased to `../core/src`), so there is no bundle to drift |
| `gliner-seat/` | **Parked with its answer, *not yet* (J2, 26 Sep 2026)** — can GLiNER2 be the middle layer's `extract` seat? It runs where dyna.ink runs: the one-graph ONNX export of `fastino/gliner2-multi-v1` (Apache-2.0) with a JS port of the library's processor, token-identical to the Python original; a line of a pattern page in 24 ms in a Chromium page on WebGPU, 55 ms in WebKit, 23 ms in a Node process. But it misses the names a seat would add (measurement names 7/11 at best, part names 6/9, operators 8/26), and a page pays 614 MB and ~2.2 GB of memory. `transport.mjs` is the seat's seam, shaped like `DecideTransport`, with a fake; `node --test gliner-seat/*.test.mjs` needs no model. `gliner-seat/README.md` has the numbers, the commands and what a later unit would need. Weights, venv and caches are never committed (`node fetch.mjs`). **Not in CI** |

**Known duplication:** recognition logic still exists independently in
`doodle2-canvas.html`, `metadoodle1.html`, `Web App Skeleton/src/core/`, and
`v2-poc/bundle.js`. As of June 2026, **`core/` is the canonical
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

> **Source of truth: `core/src/recognition.ts` and
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
it: *the barb 0.13 of the shaft*. **Where its ink points** (S2): the tip
the rung keeps is the stroke's own point the pen first reached farthest
along the shaft, coming from the tail (`inkTipIndex` / `arrowTipIndex` in
`geometry.ts`, the one home — `diagram/heads.ts` and `session/erase.ts` find
that same point again), not the corner where the head first turned, which
sat a wing's length short. And **a head that is a sliver of a long stroke**
is read at the hand's own scale (`readHead`, `headSeenOf`): the corner
detector's window is a fraction of the path, so a hand-sized head on a
shaft of a thousand pixels turned no corner and the stroke was a line
alone. There the barb is a flick of at least `BARB_MIN_PX` that turns past
`BARB_TURN` on a straight shaft — a liftoff hook, which bends on ahead or
aside, and an L are neither — and the line gives way exactly as far. An
arrow the corners see (its head at least `HEAD_SHARE_SEEN` of the path)
keeps their reading to the digit),
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

> `core/src/session/measure.ts` — `measure(node, nodes, board?)`, `describeMaths`.

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

**Maths on a page** (`core/src/maths/`; `MATHS-PLAN.md`, units M1
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
touching the session. Tier 1: no model computes a number. **Prose is not maths**
(F2, `proseToNotes` in `sheet.ts`): the grammar reads a colon as `=`, a dash as a
minus and a run of words as a name, so a note (*Draw a box: then an arrow - and it
reads*, a numbered list of steps in words) parsed as a check or a step whose operands
were words, and stood a `?` at rest. A line is maths only when it looks like it — no
operator has two words for its operands, a line with no label needs an operator and
every name in it defined on the page, a labelled one (`1. Waist ÷ 4`, the person's
word that this is a step) may name what the page lacks, and a line typed after `=`
(`{ text, maths: true }`) is read whatever it says, so *Waist is not on this sheet*
is still said. What fails is a `note`, in no step, check or chip (e2e 64h).

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

**The maths on the board** (M5, 29 Sep 2026; `maths/board.ts`,
`tools/maths.ts`, `Demos/surface/25-maths.js`; e2e 64–64g). Core decides what
is said of the numbers and where, as data a surface only draws: `boardMaths`
(`boardMathsOf` keeps it while the log stands), `mathsChips`, `mathsSaid` for
the panel, `evaluateTyped` for `=`. **Beside their figure, never on an answer
card** (the 15 Sep notes, §6): a derived side is a chip outside the figure
where a label would stand (`25.30″` beside the long side, standing just clear
of the line by the chip's own size — `from`/`away`), a label that cannot hold
says the solver's own sentence right of the number it is about, a step's
check stands at the right of its own line (*✓ 14″*, *✗ 14.67″ · written 12*,
*✓ 48″ · or 46″* — plural, with the other reading said). **The ghost rule
holds** (v10 F4): an answer shows for a moment after it changes
(`MATHS_MS`), while the hand points at its marks or holds them, and while
*Show the sizes* was asked (until what it says changes); **a problem stands
at rest** — a label that cannot hold, a written result that is off, a step
with no value — because colour is signal and a disagreement is worth a look.
The panel says it always: plain lines (*legs of 24 and 8 make the long side
25.30*), every value's formula and the drawing's scale behind **details**, and
`measure` speaks the drawing's unit. **Change flows, the ink stays:** a
measurement edited as text re-derives exactly the chips that depend on it
(`diffSheets` is the oracle) and undo takes them back. On a page that flows
(more than `TEXT_FITS_LINES` lines) a step's chip is placed from the frame's own
document, on its line just past its words (`mathsLineBox`); a fitted text is
evenly spaced, as `sheetLines` divides it. **Only the ink beside a number is
read for figures** (`drawingsBeside`): the dimensions and the solver walk every
figure against every other, and on PERF.md's 2,000-mark board with one number
that was 2.1 s a stroke; a number's figure stands beside it (within
`ATTACH_REACH` of the mark's own size, then the drawings it hangs with by
within-reach links), which took it to 4–10 ms — and means what the maths says
of a drawing never depends on what else is on the board. `=` in the field is a
sum read against the page's own definitions (`= A ÷ 3`; `ctx.maths`, a thunk, so
`09-field.js` still names nothing outside itself) with its result said before
Enter, and Enter stands the words on the board as text beside the marks held —
one act, one undo (`mathsWrite`). The export pane has a row of its own,
*true-size.svg* and *print.html* (Letter, or A4 for a metric drawing), waiting
with its reason until a figure has numbers and a unit.

### Clean forms: a confident reading, redrawn

> `core/src/session/clean.ts` — `snapReading`, `idealize`,
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
*what Enter will do* and shows it under the text as it is typed. **With
nothing typed, Enter does the likely act** (PLAN-USER-SURFACE U1e; an item's
`act` in `09-field.js`): the first act in the ranked order — the top the
context holds steady — *Draw them clean*, *Line up across*, *read it* for
writing; never a reading as a name, which is a tap on it or `name:`. With
only readings the line says so and Enter names nothing. Typed, it reads a verb the
selection has (`erase`, `dup`, `clean`, `line up`, `play`, `frame`, `read`,
`what` …, by label or alias), a name the library knows (reused, no model
asked), words the verb table reads at a definition, a prefix (`name:`,
`label:`, `ask:`, `draw:`, `page:`, `run:`, `new:`, `what:`), a sum after `=` (*= 24 ÷ 3*, read by core against the page: the line says *24 ÷ 3 = 8* before Enter, and Enter puts it on the board as text — M5), **the words a person says for an act**
(PLAN-FIELD-PAR FP1; core `tools/intents.ts`, one home: *tidy*, *line up*, *connect*, *diagram* find their acts, an act these
marks lack says what it is missing — quietly, Enter does nothing — `?` lists everything, and the board's own acts are reached:
*export*, *find pricing*, *print*, *examples*, *help* — FP8; only from three words or fewer that are or lead with the act's word,
so a sentence stays a brief), **a word or two that names nothing waits** for a pick (FP4, John's decision: no brief, no page),
**by meaning** when the semantic seat is held (D1: once the typing rests, only for words nothing matched, each act's words
embedded once, nothing sent; `nearestIntent`; the line says *by meaning 0.71*), or else, from a sentence, the
brief. Under
the field, laid out as John sketched it (6 Sep): the **core** — four round
buttons at the left, Name · Copy · Paste · Erase, always the same four in
the same slots (a circle with a mark in it; the name is the tooltip and the
reading line while the pointer rests on one); then, stacked to their right,
**what this is** — readings with their numbers (*molecule 0.92*, *“Pricing”
0.92*, *page-layout 0.78 · GLM*, *a pump 0.80 · claude*, *row 0.81*), and tapping one takes it as
the name (another voice's reading is told by its author, never its tier: an MCP
hand joins at tier 0, so `isHeardReading` — not `tier > 0` — lets its `canvas_propose`
in, and `isShapeRungReading` is what the rung itself measured; F1, `session/interpretations.ts`); and **what it affords** — Draw them clean, Line up, Frame these,
Play A, Not a molecule …, ranked by the reading, by use and by what stands
beside them, the rest a keystroke away: each an offer from a registered tool
(see *Tools* and *Context*, below). **A drawing that reads as a diagram says so in *what this is***
(V1-PLAN §3 *Reading*, N1; `notationItem` and `notationsHeld` in `09-palette.js`, `notationWords`
in `09-field.js`): each notation that reads the held marks above `NOTATION_FLOOR`, plural and ranked, in
the person's words — *a flowchart 0.92*, *a class diagram 0.49*, never "UML" — with core's whole sentence
(*three processes, one decision, three flows*) as the tooltip. **A notation is what the marks ARE, not a name**:
it has no `act`, so Enter never takes it (with only such readings held the line says *tap a reading to use it*,
never *as the name*; the item carries `notation`), and a tap on the reading Mermaid can be written from — the
one *Make it Mermaid* is offered for — takes that offer, in that notation; a tap on another says its sentence in the
status line and writes nothing (`mermaidFor` writes the likeliest). It ranks with the other readings by `baseOn`'s
`notation` (0.75 + 0.4c: from the floor up with the firmest concept it is made of, so *a flowchart* leads *flow*,
and under what a model read). The held scope is read **once while the log stands** (`notationsHeld`, keyed by
`logKey()`, shared by the field and the panel; `mm.notationReads()` counts the reads, e2e 67k), only for two marks or
more and no artifact — the Mermaid tool's own rule; a row of boxes, a molecule and writing read as none above the floor, so e2e
49's golden stands. A word typed, or writing read, is offered two ways side by
side — *Name it* and *Write “…” on it* (see *A label*, below), each with a note saying how it differs (*finds more like
it*, *only the words*), and one alone where only one acts or the two would do the same (`wordActs` in `tools/label.ts`;
John, 2 Oct 2026: *if those are the same just show one, if different signal how*). A pill carries a
label; its reason is the tooltip; a pill that asks a model carries a dot.
**The field opens by
the hand and stays whole** (PLAN-USER-SURFACE U1c; `fieldAnchorFor`,
`fieldBox`, `fieldAvoids` in `09-palette.js`): at the last press when it was
on or beside the held marks — a hold now records its press; it used to open
where the stroke before ended, a screen away — else beside the marks on the
hand's side; off the panel and the minimap, at the nearest clear place, and
placed again when a model's readings make it grow over one; a long pill is
cut with an ellipsis inside the field, its tooltip whole. Copy holds the
ink (and puts it on the clipboard as SVG); Paste puts it beside the selection
or, from the keyboard, at the pen. A tap while the field or a selection is up
dismisses it and is never a dot — judged by how far the pointer went **on
screen**, not by how many moves it reported (PLAN-USER-SURFACE W3; `releaseIs`
and `TAP_SLOP_PX` in `07-hand.js`): a click that wobbled a few pixels used to
leave a dot and the field open. The mouse, the pen and a finger that draws
alike; with nothing to dismiss, a dot drawn is a dot, and the dot on an *i*
drawn while the field is open dismisses first. `Demos/surface/05-selection.js`,
`09-palette.js`.

**The reader decides; it no longer acts** (SEAM-1, `Demos/surface/09-field.js`).
What Enter will do is a pure function — `readFieldCommand(ctx)` — of a
**`FieldContext`** record (the text, whether a summon stands and whether it is
over a live artifact, the offers as labels and aliases, the joined models by
name, what the library holds, the definition in the loop and what the verb table
read in the words, whose ink is held — `marks`, how many of the held marks the
person made and who made each of the rest — a thunk for the drawing's genre and one for what a sum comes to)
returning a **`FieldReading`** (`kind`, the `line` shown under the field,
`quiet`, and a **named command** — `take` · `name` · `label` · `ask-what` ·
`ask` · `draw` · `build` · `library` · `behave` · `need-model` · `maths`). Beside it,
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
so the rule is learned by doing. **A head is not a scratch** (V1-PLAN W1,
`erase.ts`'s header, `scratchHits` in `session.ts`): when every crossing of a
mark falls where the stroke *meets* it — within the barb at one of its ends
(measured on the stroke), at an end that lands on the mark's ink or on a site
the magnet binds, or over an end of that mark — the stroke is arriving, not
rubbing out, and the mark stands. An arrow drawn into a box, or across a
sequence lifeline, used to cross it three times with its two wings and erase
it; every real scratch in the controls still erases exactly what it did.

### Tools: what the field affords, one contract (V1-PLAN §2.1, B1)

> `core/src/tools/` — `tool.ts` (the contract), `registry.ts`,
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
twenty-five built-ins (the last four *Which is it?*, I7, *Trace into ink*, I1, *Make it a region*, I5, and *Notes like this*, I9 — typed, only with a semantic seat held)
in the order the field always built its pills (the maths
tool, M5 — *Show the sizes*, *Check the steps*, *Print at true size*, host
acts that write nothing — then *Mermaid*, *drawing from Mermaid*, *routing*
(D7) and *Which is it?* (I7, offered only with a decider seated), appended at the end, so the order and e2e 49's golden stand), which is
the tie-break between equal offers — each key once; `completionsFor` is
what typed text completes to (*Name it*, *Write “…” on it*, words told to a
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

> `core/src/context/` — `context.ts` (`contextAt`, `nearnessOf`,
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

> `core/src/packs/` — `pack.ts` (the format, `id@version`),
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
D2's writer reads; its affinities), **`uml-class@1`** (names the class
notation, restating none of `UML_CLASS_TABLE`; its affinities),
**`sequence@1`** (names the sequence notation, restating none of
`SEQUENCE_TABLE`; its affinities), **`state@1`** (names the state notation,
restating none of `STATE_TABLE`; its affinities), **`er@1`** (names the ER
notation, restating none of `ER_TABLE`; its affinities), **`mindmap@1`** (names
the mind-map notation, restating none of `MINDMAP_TABLE`; its affinities),
**`garment@1`** (names the pattern-piece notation, restating none of
`GARMENT_TABLE`; no definitions, no ports; its affinities lift clean forms and
the maths) and **`test-molecule@1`** (tests only — a `test-` pack is never listed).

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

> `core/src/session/magnets.ts` (sites, `magnetRadius`, the
> binding queries), `bind.test.ts`; `Demos/surface/05-snap.js`, `07-input.js`.

**Sites are derived, never stored**: a line's ends and middle, a box's
corners, edge-middles and centre, a circle's centre and cardinals, a
triangle's corners and centroid, an arrow's tip and tail — arithmetic on
the clean form a mark carries or would be offered, so replay is
deterministic; unread ink offers its bounds, never a pretended shape — save
a closed outline whose best four corners hold it (`INK_CORNERED`,
`INK_NOT_THREE`, the flowchart's own measure), which a flat diamond is and
the rung reads unsure: its four corners are then the sites, clockwise from
the top (S2; an oval, a pentagon, a flat triangle and writing keep their
bounds), and a mark's own site leads a tie with a notation's port at the same
point. Radii are about the hand (`magnetRadius(sizePx, scale)`). While a
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
label, not a head; a closed mark that reads as no head — the class's own box
at the end of a long relation — is nobody's head and takes no fill (S2). `figuresOf` reads ruled strokes whose ends meet — tied by a
magnet, or touching within the magnet radius — as one figure: a triangle, a
quadrilateral (a diamond, said as one turned about 45°; a rectangle when its
corners read right), a polygon. Each side keeps the marks it was drawn with,
and each figure is the maths lane's own (`polygonFigure`), so
`solveBoard(state, { figures: figuresOf(state) })` solves a triangle ruled in
three strokes as it solves one drawn in one. All three are derived: nothing
enters the log.

**A held form's sites are its own** (E1): a snapped or reshaped mark's ends,
centre and cardinals are read off its clean form where it stands (a circle's
from its own ellipse, placed), so they follow a reshape as the drawn form
does; an offered form is placed as the ink is, so a moved or tidied mark
offers its sites where it stands — they stood where it was drawn.

**Bindings follow** (V1-PLAN E2, CONTROL-POINTS-PLAN P3 as amended;
`session/follow.ts`, `follow.test.ts`). A connector bound to a site
re-derives its end when the mark it is bound to moves, scales, turns, is
reshaped, tidied or snapped — **derived in the apply path, never logged**:
a move is the one event, and undo of it takes the connectors back by itself.
**The derived form is a `'follow'` rep** (`FollowRep`: `map`, `ends`,
`reasoning`, source `engine`) — an affine `map` in the connector's OWN space
(`session/affine.ts`), applied by `placed` before the hand's transform and
turn (`nodes.ts`; `unplaced` undoes it last, `boundsOf` reads it), so its
ink, its clean form, its reading's tip and tail, its sites and its handles
are all carried and the ink is never touched; held in its own space, a
later move, scale or turn of the connector by the hand acts on the board as
on any mark. A `'transform'` is a frame and a turn about its centre, and
cannot say *turn about this end and stretch*. **The correction** (`followed`)
reads each ACTIVE bound end — `activeBindingsOf`, so an erased target moves
nothing — where it stands (`connectorEnds`: a held clean form's ends, else
the ink's, an arrow's tip being the ink the pen first reached farthest along
its shaft, `inkEndsOf` in `diagram/heads.ts`; the rung's tip is that same
ink since S2) and where its site stands now (`boundSiteOf`), and
composes onto the map it held the similarity that carries one onto the
other: **one bound end** pivots and stretches the connector about its free
end; **two** are carried by the one similarity that takes both; sites that
moved alike (both ends on one moved mark) translate it; two ends on ONE site
take the mean step — **never a collapse** (nor a length under the hand's
floor). Composed onto where it STANDS, a binding let go (an `unbind`, a
target erased) leaves the connector where it stood, and a bind carries its
end onto its site at once, so a move merged before a bind or after it gives
the same board. **Triggers**: the reducer follows after `move`, `scale`,
`rotate` (one pure function of a mark, `session/manipulate.ts`), `tidy`,
`reshape`, `snap`, `propose` (which can never propose a `'follow'`) and
`bind`, carrying the chain on — a connector bound to a connector — round by
round in id order, each at most `FOLLOW_VISITS` times (`followThrough`); a
board with no binding pays nothing. `boundBy` (who follows each mark) is kept
with the index and in checkpoints. Nothing else moves a mark: a text's new
version is code, not ink, and a word has no sites of its own (it has no
ink) — a connector bound to one of its letters follows when the word is
moved, as a move takes a word's letters. **What reads it**: a follower is filed
where it stands (`boundsMoved`), so the reach index, the components and a
scope's relations see it there, and its wire is inferred again from its ends
(`rewire`: `connects`, `points-from`, `points-to`), so a moved box's arrow
still points at it; its heads and maths read it where it stands. Stored
relation edges are not recomputed for a follower, as they never were for a
moved mark. Not followed: a head drawn as a separate mark (it is bound to
nothing — Mermaid in's arcs and `<-->` starts); a notation's reading that
changes with its context (a figure's ports appear with a stroke drawn beside
it) is found again only at the next trigger.

**The hand on a connector's own ends** (the director's decision; the
session's doors, `reshapeDecision` and `releasedBy`). A connector's own tail
or tip dragged by its handle and let go where a magnet holds it binds there —
`reshape`'s `bind`, the site the pen's magnet holds, the old claim for that
end replaced — and let go anywhere else, that end's binding is released: a new
event, **`unbind { strokeId, end }`**, keyed by the end as BIND-1 removes.
Moved whole by the hand — a `move`, `scale` or `rotate` of it, an artifact
it is in, or its middle handle — it lets go of the ends that no longer sit
on their sites (`sitsOn`: within the magnet's reach, `holdReach`, in the
hand's pixels the connector was drawn at); an end on a mark moved with it,
or one a nudge left in reach (the follow puts it back), is kept. The door
writes the unbinds first, then the reshape or the move, then any bind — **in
one act** (L2j), so one undo takes it all back. A free end dragged onto a
magnet binds too. **The surface** (`05-selection.js`): while a hand moves,
scales, turns or reshapes marks, the connectors bound to them are drawn
following as they will stand (`dragFollowers`, by `manipulatedReps`,
`releasedBy`, `reshapeDecision` and `followPreview` — the functions the
replay runs, so the preview is the act); a connector's end handle feels
every other mark's sites as the pen does (`magnetQuery(w, except)`), with the
pen's ring; the status line says a bind, a let-go and what a move walked off.
e2e 53–53d; `mm.followDrawn()` and `mm.dragHold()` for tests.

**Ports follow too.** A notation's ports are read from the clean form a lone
symbol holds (`portOutline` in `notations/flowchart.ts`) — the form is where
it stands — so a binding at a decision's vertex follows the decision
reshaped or moved; what the symbol IS is still read from its ink. And a bound
port is found by the notation the ENGINE knows (`knowPorts`, every
registered notation's; `portSiteOf`, `boundSiteOf`), whether or not the page
offers its ports to the pen — the pen's offer is the page's, the log's claim
is the board's, and state stays a pure function of the log.

### Routing: connectors at right angles between their ports (V1-PLAN §3, D7)

> `core/src/diagram/route.ts` (`routeBetween`, `outwardOf`,
> `deriveRoute`, `tidyPlanOf`), `route.test.ts`; the `route` event and
> `applyRoute` / `reroute` in `session/session.ts`; `tools/route.ts`;
> `Demos/surface/08-render.js`, `05-selection.js`; e2e 66.

A diagram's connectors are drawn by a hand, and a hand draws a diagonal.
**A `route` event** (`session.route({ ids, mode? })`; `mode: 'raw'` takes it
off, as `snap` has its `raw`) marks connectors that have both ends tied as
routed — a **`'route'` rep** on each — and **the polyline is derived, never
logged and never carried**: it is a pure function of the sites the ends are
bound to where they stand now (`boundSiteOf`) and of the boxes standing in
the way, found again in the apply path at the follow's own triggers
(`followFrom` → `reroute`: a move, scale, turn, tidy, reshape, snap or bind
of a mark it is tied to, an `unbind`, a stroke drawn, an erase), and only
when a change can reach it — the connector or its targets changed, a mark it
was routed among changed (`seen`), or one stands in the window it was read in
(`routeAffectedBy`). The follow of a connector is a similarity of the WHOLE
connector, and a route is not a similarity of anything, so it is never
stretched from one place to the next: a box moved is one `move` event, the
ink follows as it always did (E2), the route is found again from the ports,
and undo of the move springs it back. The room oracle runs it (`route` among
its acts, `src/test/room.ts`), and the polyline agrees with a replay from zero
and from a checkpoint after every merge.

**What reads a connector still reads its ink.** The `'route'` rep is a form
drawn in front, as a snapped form is, and `boundsOf`, `standingPointsOf`, the
sites, the wires (`connects`, `points-to`), the heads and the notation's
reading are of the ink the follow carries onto the sites — so a routed
flowchart reads as the same flowchart and says the same Mermaid (both tested).
Not, as a clean rep would be, where the connector "stands": a route stands
over TWO other marks, and reading it as the connector's own would change what
the drawing reads as. While an end is tied to nothing there is nothing to
route between: the rep stays (the log says routed), holds no points, the ink
is drawn, and the route stands again when the end is tied.

**The route** (`routeBetween`, pure and deterministic). Each end leaves along
its port's outward normal (`outwardOf`: a box's edge middle straight out; a
corner along one of the two sides it belongs to, the one that faces the other
end; a decision's vertex outward — the site read against the box of the mark
it belongs to; a site in the middle of a mark, which has no outward, toward the
other end), by a stub of the hand's own size (`STUB_PX`, `STUB_SHARE`); then a
search over the lines the marks in the way leave open (their edges a stub off,
the stubs' ends), with the fewest turns first and the shortest next, never
more than `ROUTE_MAX_TURNS`. The marks in the way are the closed marks in a
window round the two ports that are big enough to go round (`MIN_OBSTACLE_PX`:
a letter is not one), not a mark that holds or sits inside a symbol the
connector joins, at most `MAX_BLOCKS` of them, nearest first. **It never fails
to draw one, and it says when it could not go round**: shorter stubs are
tried, then the two symbols alone, then a direct elbow, and a route through
marks says `avoided: false`, the marks in `blocked` and *could not avoid …*
in its reasoning. An arrow's head is kept at the tip along the last segment
(`head`: the barb as drawn, never more than a share of the segment). A
separate head drawn apart — Mermaid in's arcs — is bound to nothing and
stays where it was (a known gap).

**Tidy the diagram** (`tools/route.ts`, `tidyPlanOf`): the tool offers, at
tier 1 and for a notation reading with connectors tied at both ends — never a
row of boxes, a molecule, a flowchart with its arrows loose, or a sequence
diagram, whose messages are level by definition — *Tidy the diagram*, *Route
the connectors* and, once any is routed, *Show the connectors as drawn*. Tidy
is tidy's alignment plus routing **in one act**: the symbols are ranked by the
longest way from where the flows begin (a flow round to a symbol already on the
way is a loop and left out), each rank of two or more standing within reach
of each other is lined up as a row (flows down) or a column (flows across) by
`session.tidy`, the writing standing on a symbol carried with it by a `move`,
then every tied connector routed. A symbol drawn in several strokes is left
where it stands (tidy places whole marks). The surface draws the route in
front with the hand's ink — and the clean form it held — faint beneath
(`08-render.js`, `mm.routesDrawn()`), files the mark by the box its route runs
in, and draws a routed connector routed from where a drag is taking what it
is tied to (`dragFollowers`): the preview is the act.

### Handles: the one selected mark's own points (V1-PLAN E1)

> `core/src/session/handles.ts` (`handlesOf`, `reshapePreview`,
> `reshapedClean`, `reshapeClean`, `MIN_EXTENT_PX`), `handles.test.ts`; the
> `reshape` event in `session.ts`; `standingPointsOf`, `unplaced` and
> `boundsOf` in `nodes.ts`; `Demos/surface/05-selection.js`, `08-render.js`.

**One mark selected alone, with a clean form, shows its handles** — held,
or the one it would be offered (the magnets' rule). They are its own magnet
sites made draggable, never a notation's port: a box's four corners, four
edge middles and centre; a circle's centre and cardinals; a line's or an
arrow's tail, tip and middle; a triangle's corners and centroid; a dot's
point; and for an arc its two ends and its **bulge**, the third point an arc
is drawn through (the magnet at the middle of its span lies on nothing, so
it is no handle). A mark with no clean form — writing, ink the rung cannot
place — shows none, and nothing is pretended; a loop waiting to be taken up
is a gesture in waiting and is never reshaped, as it is never snapped.

**Dragging one writes one event**, `reshape { id, handle, to, at }` — one
act, one undo (L2j). `handle` is `{ kind, index }`; `to` is where the hand
let go **in the mark's own space** (`unplaced`: the space its ink was drawn
in), so a move, scale or turn merged before or after it carries it as it
carries the ink, and the reducer places nothing. The door takes `to` on the
board and runs the function the replay runs (`reshapePreview` →
`reshapedClean`), so the preview is the act, and it writes nothing when the
drag makes nothing. The `'clean'` rep is replaced (with `reshaped`, the
handle last dragged), never changed in place; **the ink is never touched**;
a mark not yet snapped is snapped by the same act — born reshaped.

**Per shape** (the header of `handles.ts` has it all): a box keeps its own
frame, turned or leaning — a corner is taken in the frame of the two sides
that meet at the corner across, which stays; an edge middle moves its side
across only; the centre moves the form whole; dragged past the side across it
flips, each corner keeping its number. A circle's cardinal sets its radius
(an oval's, the axis it stands on), its centre moves it. A line's end moves
that end. An arrow's too, the head kept at the tip along the new shaft — the
barb as drawn, at most a fifth and at least a fortieth of the shaft, so it
reads back as an arrow. A triangle's corner moves freely. An arc's end turns
and scales it about the other end, keeping its sweep; its bulge bends it
through its ends and the point on the chord's perpendicular. No extent under
`MIN_EXTENT_PX` of the hand.

**Where it stands is read from the form; what it was read as is not.** A
reshaped form is the hand's own geometry, so `boundsOf` and
`standingPointsOf` return it — the relations, the reach index, the scratch,
tidy (which fits the ink's frame so the form lands where it placed it) and
every hit read it — and so do its sites and its maths (`measure`: a held
line's and arrow's ends, a held form's shape). The shape rung's readings are
**not** recomputed: they measure the ink, which is as drawn, so a box
dragged into a thin bar is still a rectangle. A notation's symbols, heads
and figures are readings of the ink too, and still read it. A form only
snapped is the ink's measurements redrawn, and the ink still stands for it.
*Show the ink* (`snap` raw) puts a reshaped form away and files the mark on
its ink again. `placed` carries an axis the ink has no extent on (a ruled
line's height) instead of fitting it by a factor of nothing, so a flat
line's end dragged up survives a move.

**The zone rule** (05-selection.js): every handle — the selection's scale
corners and knob, and the mark's own points — owns the ground nearer to it
than to any other, within a handle's reach; on an exact tie the selection's
own wins; the rest of the outline is the move zone. A box's corner carries
both — its own on the ink, the scale corner on the outline a little way out
— and is split by nearness (e2e 52c). The mark's points are rings, with a
dot in the ones that move the form whole; a mark under `HANDLES_MIN_PX` on
screen shows none until zoomed in, so the move zone keeps room; the dragged
ring grows, the form previews in front with the ink faint beneath, and the
standing line adds *a ring to reshape*. **Whatever may move the selection
may drag a handle** — the mouse, the pen, a finger while fingers draw — and
**a finger that pans while a pen is present never reaches one** (pencil
P11). A handle drag is never a stroke: no ink, no summon.

**What E2 made of it** (*Magnets and bindings*, above): a `reshape` changes
exactly one thing, the mark's `'clean'` rep, and every site is derived from
it, so a connector bound to one follows it there (corner 2 stays corner 2,
even through a flip) — and a follower stands where `standingPointsOf` says,
carried by its `'follow'` map. A notation's ports are read from the clean
form. A connector's own bound end dragged by its handle binds where a magnet
holds it and lets go anywhere else, in the reshape's act.

### Regions: named places on a board (PLAN-IPAD-NOTES I5)

> `core/src/session/board-regions.ts` (the rule, nesting, what a move carries, the sentence, the outline),
> `board-regions.test.ts`; the `region` and `rename` events in `session.ts`; `tools/region.ts`;
> `Demos/surface/12-regions.js`, `05-selection.js`, `08-render.js`, `10-inspector.js`, `21-minimap.js`; e2e 71–71m.
> (Not `session/regions.ts`, which is an artifact's layout — the drawn boxes a page is read from.)

John organises hand notes on an iPad: **a region is a named rectangle that holds whatever stands inside it** — ink, pictures,
texts, figures, other regions — so *Monday* and *Pricing* are places on a board. It is a node of its own with a `region` rep
(its name, and the drawn rectangle it was taken from) and a `bounds` rep: **not ink, not content, not an artifact**, so it joins
no cluster, signature, lasso or scratch, and the marks inside it read exactly as they did without it. It is made by a
`region { name, bounds, from? }` event and renamed by `rename { nodeId, name }`; `SessionState.regions` lists the live ones in the
order made. **What it holds is derived, never copied into the log**: the things on the content plane whose box is mostly inside its
box — `REGION_HOLDS`, the one rule, a share of the thing's area with each axis taken alone so a line is held by where it lies — read
where they stand now (an artifact made of marks stands where its marks do). A mark drawn in is held, one dragged out is let go,
and nothing is written for either. A region is held by a larger one by the same rule (two of a size never hold each other), so
regions nest; `from`, the rectangle the hand drew, is the region's own frame — never counted as held, carried when it moves.

**Moving or scaling a region is ONE `move` / `scale` event naming the region**; the session carries what it holds when it applies
the event (`regionCarries`, the function the surface's drag preview asks too, so the preview is the act), through the same
`manipulate.ts` and follow machinery as any move — one act, one undo. A connector the region holds only by where it stands, tied to
something it does not carry, is **not carried**: it follows what it is tied to (its other end where it was) rather than walking off
its site; a connector tied inside, at both ends, travels with it. A turn leaves a region be (a turned rectangle is not a rectangle):
the marks named turn, the surface shows no knob for a selected region. **Erasing a region keeps everything it held** (the status
line says so); undo brings it back. `manipulableOf` now also moves an artifact made of marks (its frame with its marks) and a file
brought in with no marks (a text, a figure), and `frameOf` follows a `transform`, so a page or a text made from writing no longer
leaves its frame behind when moved.

**The tool** (`tools/region.ts`, the twenty-fourth built-in, registered after *Trace into ink*; I9's *Notes like this* follows it): *Make it a region* is offered when a held rectangle
holds the rest of what is held and at least `REGION_MIN_HELD` things (three notes make a place; a labelled box does not) — a loop
held by press-and-hold arrives with everything inside it — so e2e 49's three golden scopes are untouched; a rectangle with less, and
marks with no rectangle round them, are made a region by typing `region: Monday` (the reader's prefix in `09-field.js`, the line
saying *make a region “Monday” — round what is held* before Enter), the region drawn round them with a margin. One act stamped
`region`: the field closes, then one `region` event. An untyped region is named *Region 1* and renamed in the panel.

**On the surface** (`12-regions.js`): a quiet frame in the board's label colour under the pictures and the ink, its name at the top
left in board units (never under a legible size on screen); a press on the title selects the region and drags it (a selected region
moves by its title and the band along its edge, never its inside — the inside is where the hand writes); the panel's *is* says
*a region “Monday” — holds 12 marks, 2 pictures* with its name to change (a `rename` event); **the board's outline** — the regions as
a tree in reading order with what each holds — stands at the foot of the panel and a tap fits the view to one; Delete erases the
region alone; the minimap outlines regions; a text or figure in a dragged region follows the drag (`dragFrameOffset`). The MCP hand's
`canvas_look` lists regions with what they hold — read only: a hand does not make a region yet.

### Parsing: the drawing as a layout

> `core/src/parse/` — `layout.ts` reads it, `scaffold.ts` builds from it.

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

> `core/src/relate/relations.ts` and `src/concepts/concept.ts`.

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
**The groups are settled when something reads them** (V1-PLAN I2, 1 Oct 2026;
`settledCandidates` in `session.ts`): an event files what it changes at once
(the links, the groups to find again) but `recomputeClusterCandidates` only marks
the candidates stale, and `getState` and a checkpoint's snapshot settle them — so
an event that makes a thousand marks (an import of a traced picture) settles
once, not once a stroke, and a replay settles at the end of the load and at each
checkpoint. A photograph traced into ink is one connected group of thousands, and
it was gathered, walked in `clusters`' order and signed again whole for every
stroke of its import, once any artifact stood on the board (63% of the time was
`structuralSignature`; 72 s to import 2,000 strokes beside one SVG, 84 s to
replay them). **A group is signed only when it could match**: `mayMatchBySize`
(`signature.ts`) says, from the number of marks alone, whether a group can reach
`MATCH_FLOOR` against a signature of that many — the floor needs the shapes
(floor − link weight) / shape weight alike, and two bags share at most the lesser
count and span at least the greater — and `definitionSizes` holds what each
definition, and each example one was taught, stands for; a group no size reaches
is not signed or walked in order (`Component.ordered`), and is read the moment a
definition it could match is made (`signedComponent`). **A mark that lands in such
a group joins it where it stands** (`joinsBigGroup`): every mark it is within reach
of in that one unsigned, unscored group, too big for every definition, so the group
is replaced by one with the mark in it (new lists, a checkpoint holds the old)
instead of being taken apart and gathered again. A group a hand holds is read for
its roles and notations through tables made once for the scope (`roles.ts`'s
`indexOf`: the ids as a set, each mark's relations out and in, the wires' ends) and
the content plane filed once for the reading (`heads.ts`'s `withBoardIndex`, which
`notationsOf` and `connectorHeads` open: a connector's end asks the index for the
marks within a head's length, put back in the plane's order and put to the same
test) — a thousand strokes read in 0.3 s and 1.0 s that took 3.4 s and 6.3 s. All
derived, none logged; `bench/equivalence.mjs` says nothing reads differently, and
`src/session/settle.test.ts` and `src/diagram/index.test.ts` hold each to the
walk. Checkpoints share the rep and edge objects the live graph holds (none is ever
changed in place). `core/bench/equivalence.mjs` replays every held
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

**A big still group is drawn once** (P1, 1 Oct 2026; `inkCacheFor` and `buildInkCache` in
`08-render.js`, the *After P1* section of `PERF.md`; e2e `budgets`, record 4). A page of notes
traced into ink is thousands of short strokes, and the paint stroked every one of them again each
frame — 10,014 `stroke()` calls and a 133 ms pan frame on the 5,000-stroke board of pictures,
where the paint's own JavaScript was 16–20 ms: **the browser's raster is bound by the geometry,
not by the number of calls** (the same strokes as 18 paths took as long), so the fix is to stroke
them once. The plain ink of the marks on and about the screen (`plainInk`: a top-level mark with
ink and no clean form, no route and no handle drag on it) is drawn onto a canvas of its own — the
screen and `INK_CACHE_MARGIN` past each edge, in device pixels, laid out as the main canvas lays
them out, capped at `INK_CACHE_MAX_PX` — and a paint blits it shifted by how far the view has
panned and strokes only what is not in it. A pan inside the margin strokes no ink; a pan out of
it draws the raster again, centred. **Held by the log and the view, never stale**: its key is
`logKey()`, the zoom, the pixel ratio, the screen's size, the theme, the ink's colours and width
and the marks a drag, a follow or a tank is moving — those are exempt, left out of the raster
while they move so a moved mark leaves nothing behind (`INK_CACHE_EXEMPT_MAX`) — and a raster
that does not match is **never blitted**: the paint is live, as before P1, and a new one is
drawn once the paint has asked for the same for `INK_CACHE_SETTLE_MS`, so a pinch (a new zoom
every frame) and a stroke (a new log) never pay for a raster the next paint would discard (a
timer paints again to make it). Only where it pays: under `INK_CACHE_MIN` plain marks about the
screen nothing is cached, so every ordinary board paints as it did. What a paint still draws
live goes over the raster: the mark inspected (wider, over its own thin ink), a ghost, clean
forms, routes, artifacts and their members, words. **The one visible change**: cached ink stands
under what is drawn live, where each mark used to stand in the board's order, so a word's letter
or a clean form over a plain mark's ink is over it whichever was drawn later. The paint still says
what it drew (`recordOp`, so `paintCheck` holds the hand's paint to the whole-board read through
the raster) and `mm.inkCache()` / `mm.setInkCache(on | 'direct' | 'bypass')` are the tests': the gate
compares the blit with the same strokes laid on the canvas in the raster's order (`'direct'`),
and the live paint with the raster kept out of it (`'bypass'`). `node e2e/pictures.mjs` measures
each view with the raster and without it on this machine, 133 ms → 16.7 ms a pan frame (software
raster; an iPad is `QA-v1.md` §A10's).

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

> `core/src/diagram/roles.ts` — KEYFRAMES.md §2–3.

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

**A diagram, when nothing says more** (PLAN-FIELD-PAR FP2; `notations/diagram.ts`): nodes joined by connectors tied at both
ends read as *a diagram* — the flowchart's reading under the name of a class, `fallback` on its notation, read last and said
only when no other notation clears `NOTATION_FLOOR` (`sayable`, one home in `notation.ts`), its confidence the floor plus
`TIED_LIFT` × the share tied, its Mermaid the flowchart's. So John's two boxes and a line get *Make it Mermaid*, *Tidy the
diagram* and *Route the connectors*. **A graph of circles only is the molecule's** (John: *the molecule is its own thing —
we will have expandable classes of things*). And **an arrow drawn in one stroke ties at its tip** (FP3, `arrowTipMagnet` in
`07-input.js`): the pen lifts at a barb's wing, past the magnet, so the end its ink points with (`inkEndsOf`) is offered the
magnet there.

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
for the surface that renders it (the `mermaid` kind, *Mermaid on the surface*, below).

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

**Mermaid on the surface** (V1-PLAN §3, D2 and D3's surfaces, 29 Sep 2026;
`kinds/kinds.ts`, `tools/mermaid.ts`, `tools/mermaid-draw.ts`,
`Demos/surface/13-kinds.js`, `25-mermaid.js`; e2e 62–63, with
`e2e/fixtures/mermaid-standin.js`). **A `mermaid` kind** (`.mmd`, `.mermaid`;
renderer `mermaid`, addressing `parts`, like `run`) holds a text. **The
exporter is a tool**: `mermaidFor(state, ids, isRead)` (one home — the tool, the
export pane and the frame's part names ask it) reads the marks as the likeliest
notation above `NOTATION_FLOOR` with a writer, and *Make it Mermaid* is offered
for two or more held marks that read as one and are no artifact's, unless an
artifact already holds that very text; taking it `import`s a `mermaid` artifact
(named `<notation>.mmd`) beside the drawing — right of it, the drawing's size
between a card and a wall — holding `toMermaid`'s text, in one act. The frame
(`mermaidDocument` in `13-kinds.js`) is the run sandbox's twin — scripts, opaque
origin, clear ground — and loads mermaid.js the way three.js is loaded, from a
pinned CDN beside the text (`MERMAID_CDNS`: cdnjs, then jsdelivr; 11.4.0),
`securityLevel: 'strict'`, nothing played. **The text always stands**: shown at
once, kept when the library cannot load (`unavailable`) or cannot read it
(`refused`, said in the status line with the library's first line) with a note in
the frame, and hidden only behind a diagram that was drawn — whose fills and
strokes are the board's ink, whatever theme mermaid drew in. Each node is
reported as a part named for its Mermaid id (a flowchart's and a class's by the id
mermaid gives its group, a participant by the name on its box and lifeline), and
ink over a part lands on the marks the text was written from — `mermaidPartNames`,
derived where asked from the marks the tool wrote it from this sitting, else from
the board, and only when that reading says exactly this text; an edited text keeps
its Mermaid ids. What a frame says of itself is runtime (`mermaidStates`); a test
points the frames at a stand-in library (`mm.mermaidFrom`) and the gate skips its
real-library record by name when the CDN cannot be reached. **The export pane**
gains a row of its own, written from the held marks or the board, named for the
notation, hidden for a board that reads as none. **Draw it** is the second tool's
offer, first on one `mermaid` artifact held alone whose text `readMermaid` reads
(not for an unknown diagram, an empty text or a text file); taking it names the
host act, and `drawMermaidFrom` calls `drawMermaid` inside the tool's stamp at the
hand's zoom (`scale` 1/zoom), its `origin` right of every mark on the board, with
the paint held until the diagram is all written (`holdPaint` in `08-render.js`: a
45-node diagram took seven seconds of per-event paints and takes half a second),
closes the field, selects what was drawn and fits the view to it, and says in one
sentence what was drawn and what was not — each line a reader could not read, each
note, the caps of 60 nodes and 120 links. A `.mmd` dropped or pasted is held where
it lands (`mermaidImported`), so *Draw it* is in the field at once; a text no
reader reads says it stands as text. **Edit the text** (the `text-edit` tool, the
editor of `19-text.js`, a double-click) works on a mermaid artifact and a new
version keeps its kind, so the round trip is by hand: draw, *Make it Mermaid*,
edit, *Draw it*, one undo to take the drawing away.

**The UML class diagram** (V1-PLAN §3, D4; `notations/uml-class.ts`,
`notations/uml-class-mermaid.ts`, the `uml-class@1` pack). A class is a box
with one or two lines across it, side to side — its compartments — **read in
the box's own frame** (the tightest box at any angle, each axis tried as the
one its lines run along), never from the relation or role tables, which call
a compartment line `inside` and a box holding boxes a frame (the trap). A box
holding a mark that is no writing, or three lines across, is no class. The
name is the writing in the top compartment, each line below a member — a
method only when read words say so (`METHOD_WORDS`), never invented. A plain
box is a class with only a name, read lower, and only where a compartment or
a UML head says UML. Relations by `headsOf` past their heads, a bind first:
hollow triangle inheritance, filled diamond composition, hollow aggregation,
open arrow association, none a link; a head read first as a circle degrades,
said; short writing near an end is its multiplicity, credited to the line it
stands beside. It reads solid lines only: a dependency's dashes are read
as a dashed line by `notations/dashes.ts` (D5) but not yet by this notation.
Each class's four sides are continuous ports (`along:uml-class`). Mermaid:
`class id["name"] { … }`, an attribute's parentheses as entities so Mermaid
never takes it for a method, relations from the marked end, cardinalities
quoted — and a reader for `classDiagram` that draws every mark as a confident
shape (a class a box with two lines, its name and members labels on the box
and lines, a multiplicity a dash) so the letter rules gather none, the round
trip the test (`uml-class-mermaid.test.ts`). `uml-class.test.ts` is A2;
`uml-class.bench.test.ts` the rates; `uml-class.read.test.ts` the rules.

**The sequence diagram** (V1-PLAN §3, D5; `notations/sequence.ts`,
`notations/sequence-mermaid.ts`, `notations/dashes.ts`, the `sequence@1`
pack). A participant is a box — or a stick figure, read as an actor: a
circle, a body down from under it and at least one more short line — at the
top of its lifeline, a long line near plumb (one stroke, or dashed; pieces
one under the next are one lifeline), its top under the box's bottom middle.
**Read from the geometry, never the relation or role tables** (the trap: the
relation table has the lifeline touch its box and be an edge from it): a
line with a head, one landing on another box, or one with a head drawn at
its top is no lifeline. A message is a roughly level connector whose ends,
past their heads, land on two lifelines — only its ends say where it goes,
whatever it crosses: solid with a head a call (`->>`), dashed a return
(`-->>`), no head `->`/`-->`; a loop both of whose ends land on one lifeline
is a self-message, its barb measured where it comes back. Messages are
ordered by height, each labelled by the writing just above it (writing
includes a stroke that zigzags across its own line). **Dashed lines are
derived** (`dashedLines`): short straight strokes in a row, both ends of
each in the row's corridor, a gap from the next — and a mark a letter's size
may touch a dash only at the row's ends and stand in no gap, so printed
capitals, whose bars join their stems, never read as one; a word's letters
are strokes like any other. Each lifeline is a continuous port
(`along:sequence`). Mermaid: participants left to right as `participant`/
`actor <id> as <name>`, messages down the page, words as raw text with
Mermaid's entities; a reader for `sequenceDiagram` draws boxes or stick
figures over straight lifelines, calls as arrows bound along them, returns
as dashes with a triangle apart — the round trip the test
(`sequence-mermaid.test.ts`). `sequence.test.ts` is A3;
`sequence.bench.test.ts` the rates; `sequence.read.test.ts` the rules;
`dashes.test.ts` the dash bench.

### The state diagram (V1-PLAN D5, the state half)

> `core/src/notations/state.ts` (the reading, `STATE_TABLE`),
> `state-mermaid.ts` (the writer, the reader, the drawing), `graph-kit.ts`
> (what the graph notations share), `box-routing.ts` (sides, arcs and spread
> ends), `packs/shipped/state.ts`, `fixtures/state.ts` and `state.mermaid.ts`,
> `state.test.ts` (the board, A4), `state.read.test.ts`, `state.bench.test.ts`,
> `state-mermaid.test.ts`.

A **state** is a round-cornered box — one closed stroke the rung reads as a
box (a hand's rounded box is a rectangle to it), a stadium, or a circle not
small beside the others, known also by how fully it fills its tightest box
(`stateShape`) — its name the writing in it; a box holding a state is a
composite's frame and is left out. The **initial state** is a small dot
scribbled solid and the **final state** a ring with a mark inside it — a
scribbled dot, a tap, a second ring — read from the ink alone: the rung calls
a scribbled dot an arc, writing, a rectangle or nothing, so a mark is a spot
by being compact and dense (its path runs a good many times its hull's
perimeter, `FILLED_PATH`) and a ring holding one a bullseye; a ring and its
dot drawn quickly are gathered into a **word** by the letter rules and are
read from the word's letters (`bullseyeWord`). A **transition** is an arrow
between two of these, each end read past its head — a small mark heads.ts
calls a circle head at an end is the dot or ring it lands on — and a
**self-transition** is a loop out of a state and back, one open stroke both of
whose ends land on one state, its barb measured where it comes back (the
rung finds an arc and heads.ts no head on it, as for a sequence diagram's
self-message); a line with no head is none. **What makes it a state diagram,
and not the flowchart every box-and-arrow drawing is:** the reading's
confidence is its structure (every symbol joined, every transition pointing)
scaled by the evidence a flowchart has no symbol for — the solid initial dot,
the final ring, a loop, round corners (`EVIDENCE`) — so plain boxes and arrows
are the flowchart's and read here as nothing, a drawing with only round
corners is held under the floor, and one with a dot, a ring or a loop reads
above it; a decision or a data symbol on the board counts against it
(`FOREIGN_PENALTY`). The reading returns before its costly part when none of
that is there, which is also what keeps a fourth notation from slowing every
other bench. Read from the geometry, never the relation or role tables (the
trap: they call a dot beside an arrow's tail its head). A state offers its
border as one closed continuous port (`along:state`), a dot scribbled solid
its four cardinals (`port:state`). Mermaid: `stateDiagram-v2`, `direction LR`
when the transitions run across, `state "name" as id`, `a --> b: words`, the
dot and the ring both `[*]` (said in the notes where several fold into one or
a transition runs the other way); the reader takes a hand's forms (`state X`,
`X : words`) and refuses with its line a composite's frame (its contents read
flat), a choice, a fork, a join, a note, concurrent regions and styles; it
draws rounded boxes, the dot as one solid spiral, the final as a ring round a
second spiral, arrows bound at both ends (a box's own site, else a place along
its border), a loop out of a state's side bound at both ends — the ink ends
exactly on its site, because a bound end is carried onto its site and an end
left a wing's length off distorts the loop — and reads it all back. The state@1
pack names the notation and restates none of its table.

### The ER diagram (V1-PLAN D6)

> `core/src/notations/er.ts` (the reading, `ER_TABLE`),
> `er-mermaid.ts` (the writer, the reader, the drawing), `graph-kit.ts`,
> `packs/shipped/er.ts`, `fixtures/er.ts`, `er.mermaid.ts` and
> `er.mermaid-in.ts`, `er.test.ts` (the board, A5), `er.read.test.ts`,
> `er.bench.test.ts`, `er-mermaid.test.ts`.

An **entity** is a box with its name written in it — one closed stroke the
rung reads as a box, or strokes ruled into one — and a **relationship** a plain
line from one entity to another, its ends read past any head and a magnet's bind
first (`graph-kit.ts`, the flowchart's joining), no head, its **verb** the writing
beside its middle and a **multiplicity** the short writing near each end (`1`,
`*`, `0..1`, `1..*`; the pieces of one end are read together). A relationship has
no direction of its own: it stands from the entity first in reading order. Where
a multiplicity has been read it says how many, as one of four **cardinalities**
(`ER_TABLE.cardinalities`: exactly one, zero or one, zero or more, one or more —
Mermaid's crow's-foot tokens, `cardinalityOf` reads the words); a crow's foot
drawn as ink is not read, the writing is what says how many. **What makes it an
ER diagram, and not the flowchart, class diagram or mind map every box-and-line
drawing is:** boxes with nothing in them but a name, joined by lines with no head,
a multiplicity at their ends and a verb beside them. The reading's confidence is
its structure scaled by that evidence (`EVIDENCE`), so boxes and plain lines
alone are held under the floor; a box with a line across it holds compartments
(a class's, `lineAcross`: a line that lies inside the box — one that crosses it
or bows round it does not), and a connector with a head or an arrow drawn
between boxes counts against it or never reaches the joining (a board of arrows
returns before the costly part). A stroke as small as a letter that joins two
different symbols, each end within reach of one, is a relationship however short
(`joinsTwo`) — a 40 px branch between two close shapes was written off as
writing. An entity offers its border as one closed continuous port
(`along:er`). Mermaid: `erDiagram`, `direction LR` when the relationships run
across, `id["name"]`, each relationship `<from> <left>--<right> <to> : "verb"`
with the crow's-foot tokens the writing at each end says — written as zero or
more where nothing says how many, said in the notes, and `""` for a relationship
with no verb, which Mermaid wants; entities in reading order of the page as it
was meant to stand (a hand's page leans, so the entities' centres are turned
back by the median lean of the lines that run across) — **by columns when it runs
across and by rows when it runs down**, because a layered layout keeps a rank in
a column, which is what makes a text drawn and written again keep its order; the
reader takes `NAME`, `NAME["alias"]`, quoted names, the symbol tokens and the
words Mermaid has for each cardinality, and a `..` or `optionally to` line as a
plain one (said), and refuses with their lines an entity's attributes (a box
carries a name), a title and styles. The drawing: a box with its name on its own
ink, the layered layout, each relationship a plain line (an arc round an entity
in the way) bound at both ends at a place along the border, its verb a label on
its own ink and a dash beside each end labelled with the words that say how many
— each entity tall enough for the ends that share a side — read back. Not read:
Chen's relationship diamonds (V1-PLAN §3 named them; the notation is the
crow's-foot one), attributes, a dashed line. The bench (`er.bench.test.ts`, 36
hands of the board): read 36/36, first 36/36 (0.65–0.67); entities 144/144, names
144/144, relationships 108/108, multiplicities 108/108, verbs 108/108, at three
corner roundnesses; the flowchart bench, the class bench, the sequence and state
boards, a wireframe, the molecule and a line of writing: highest 0.08, none above
the floor.

### The mind map (V1-PLAN D6)

> `core/src/notations/mindmap.ts` (the reading, `MINDMAP_TABLE`),
> `mindmap-mermaid.ts` (the writer, the reader, the drawing), `graph-kit.ts`,
> `packs/shipped/mindmap.ts`, `fixtures/mindmap.ts`, `mindmap.mermaid.ts` and
> `mindmap.mermaid-in.ts`, `mindmap.test.ts` (the board, A6),
> `mindmap.read.test.ts`, `mindmap.bench.test.ts`, `mindmap-mermaid.test.ts`.

A **node** is a closed shape with its word written in it — a circle or an oval,
which Mermaid brackets `((…))`, or a box, corners square or round, `[…]` — and a
**branch** a plain line from one node to another, read as an ER diagram's
relationship is. The **root** is the most central node of the tree (the least
total distance to the others; then most branches, a circle, the larger), and every
other node hangs from the one nearer it; a node's branches are taken in the order
a hand reads round it — clockwise from the top round the root, clockwise from the
way it faces (away from its parent) round any other (`children`). **What makes it
a mind map, and not the ER diagram's boxes or the molecule's bubbles:** a word in
every node (a molecule has none), a hub with three branches and branches that go
on past it, and lines with nothing beside them — a multiplicity or a verb on a
line counts against it (`WRITTEN_PENALTY`), as do a head, a compartment and a line
that closes a loop so the shapes are a graph and no tree. Bare words on a branch —
a hand's other kind of mind map — are not read; the nodes are shapes. A node
offers its border as one closed continuous port (`along:mindmap`). Mermaid:
`mindmap`, the tree as indentation, each node `id((“words”))` or `id["words"]`,
quoted and escaped, D2's ids; the reader takes the shapes Mermaid takes (a
rounded box, a bang, a cloud, a hexagon and words with no shape are drawn as a
circle or a box, said) and refuses with their lines an icon, a class, a title and
a second root with what is under it; the drawing fans the tree round the root in
rings — a subtree a share of its parent's wedge in proportion to its leaves,
capped, its children over the wedge in the order written, so read back the order is
the text's — each node its words on its own ink, each branch a line bound at both
ends at a place along the border. A text rooted away from its centre reads back
re-rooted, said. The bench (`mindmap.bench.test.ts`, 36 hands of the board): read
36/36, first 36/36 (0.68–0.69); nodes 252/252, root, words, shapes, depths 252/252,
branches 216/216, the order round every node 252/252, at three corner roundnesses;
the flowchart, class, sequence, state and ER boards, a wireframe and a line of
writing: highest 0.05, the molecule 0.24, none above the floor.

### The garment pattern piece (V1-PLAN M6)

> `core/src/notations/garment.ts` (the reading, `GARMENT_TABLE`),
> `maths/garment.ts` (what the marks come to, what true size prints),
> `packs/shipped/garment.ts`, `fixtures/garment.ts`, `garment.test.ts`,
> `garment.bench.test.ts`, `maths/garment.test.ts`; e2e 68.

A pattern piece is a **piece** (any closed outline of some size, at its sewing
line) with the marks a drafter puts on it, read from the geometry — never a
pack definition, because **each of the six is a relation to the outline** (inside
it, along it, across it, standing on it, off it the same distance all round) and
two need a head kind or an orientation: a signature is a bag of shapes and the
links between them, and a box with an arrow in it, a piece with a grain line, is
one signature (`garment@1` has no definitions; the trap, under *Library packs*).
A **grain line** is a straight line with a head at each end inside the piece and
a good part of its length — heads read past the line's own ink, as a chevron drawn
at each end (`headsOf`) or a hook at each end of one stroke (`hooksOf`, on the
stroke's own points: the shape rung and `headsOf` see only the far end of the
second). A **fold** is the same line standing along an edge, parallel and close:
that edge is cut on the fold. A **notch** is a short tick across the outline (or
ending on it), square to it, or a small wedge on it — as small as a letter, and
told from one by where it stands. A **dart** is a narrow wedge from an edge, its
point inside: a closed triangle or a V of one stroke, its two ends on the outline.
A **seam allowance** is a second outline standing off the piece the same distance
all round, *measured* (`SEAM_OFF`, `SEAM_EVEN`), so a card in a panel — offset
unevenly — is no allowance; the piece is the inner outline, the finished size, and
the outer one the cutting line. The reading is plural and derived like every
notation (nothing enters the log), and **its confidence is its evidence**
(`EVIDENCE`): a grain line settles it alone, a fold half as surely, and two
notches, a dart or a seam allowance alone are held under the floor, so a box with
an arrow in it, a card in a panel and a row of ticks read as no pattern piece
(`garment.bench.test.ts`: its own board, 24 hands, read 144/144 at 1×, 0.6× and
1.8× elsewhere on the page; the recognition corpus, the flowchart bench and the
class, sequence, state, ER and mind-map boards, wireframes, molecules, writing, a
row and a hub read none above the floor). It surfaces in the field's *what this
is* row and the panel as *a garment pattern piece 0.83 — one piece: one grain line,
two notches, one dart, a seam allowance* (N1 reads every registered notation) and
puts nothing on the pen.

**What the maths does with it** (`maths/garment.ts`; `boardMaths(state).garment`,
`mathsChips`, `mathsSaid`, `trueSize`). *The numbers rule the outline they are
written on* (MATHS-PLAN rule 2): a number in the piece is its sewing size and the
cutting line stands the allowance out from it; a number written outside the cutting
line is the cutting size, the piece sewn smaller, and the other reading said (rule
3: *or, if 18 × 26″ is the finished size, cut at 19 × 27″*). **The allowance is the
page's** when it says one — the sheet's `Add ½″ seam allowance` — else the ink's own
offset at the drawing's scale, said to be the ink's (*as the ink draws it*); where
both stand the page rules and the ink's is said beside it. A chip below the piece
says *cut 19 × 27″ · sewn 18 × 26″*, shown for a moment and while the hand points
(the ghost rule, M5), the panel always saying it in plain lines. **A fold halves the
piece**: cut on the fold, opened it is twice as wide across it (*36″ across, 18″ as
drawn*). What each mark comes to is measured on the piece's true sides by an affine
map of the ink's corners onto the solved ones, never in pixels: the grain along the
26″ sides, each notch how far in from its nearer corner, each dart how wide and how
long. **True size prints them** (`garmentDecor`, drawn by `truesize.ts`): the other
outline dashed exactly the allowance out (or in), the grain line at its length with
a head at each end, the notches and darts where the ink's stand, the fold edge marked
and *cut on the fold, opened 36″ across* said in the title and the notes — in the SVG
and in what a print covers — and a piece's own marks are never listed as figures it
could not draw. Rectangles and triangles: the figures the solver can fix and true size
can draw; a bodice of curved edges says its marks and no sizes.
**A notch is no line that divides an edge**: `withParts` divides a side wherever
another mark ends on it, so a tick across an edge made a 26″ written beside the
middle of that side the length of a part between two notches, and the side was fixed
by nothing — found drawing the piece with the pointer for e2e 68. `garmentNotFigures`
leaves a notch, a dart, a fold and a grain line's drawn-apart heads out of what the
solver is handed.

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
  working) — **built in core, and on the surface since I7 as the *decider* seat**
  (below). Typed questions in — a
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
  the seat the engine answers from tiers 0 and 1. **I7 (1 Oct 2026) put a
  transport in the seat and a job on the surface**: `llm/decide-openrouter.ts`
  (`createChatDecideTransport`) is a `DecideTransport` over `provider.ts`'s
  `complete` — the questions as one JSON user message of options (*none of
  these* always among them, never a node id), the answer asked for as typed
  JSON and read as a distribution over **exactly the options offered**: an
  option nobody offered, a negative or non-finite probability or nothing that
  sums to anything leaves that question unanswered, never guessed, and the pick
  is read back off the distribution. How Jev answers on OpenRouter
  (`typesafe/jev-1.13`, as John was told, `DEFAULT_DECIDER_MODEL`) is
  **unverified**, so everything a vendor's shape decides is a `DecideWire`
  (`build` the messages, `parse` the reply), the seam where the native
  `/v1/systemone` shape — which refuses browser origins, behind a proxy of our
  own — swaps in as another transport, not another seat. `DECIDER_TAKE_AT`
  (0.99) with `DecideOptions.takeAt`: an answer that leads by less is
  returned (`row.below`) and never held, and the engine's ranking stands; a
  seat made without it is as it was. **The first job is *Which is it?***
  (`tools/which.ts`, a tool with the dot): when a decider is seated
  (`ToolHost.decider`) and the field's top two definition matches are within
  `TIE_MARGIN`, the field offers to ask it between exactly those (by name),
  and **only that tap asks** — not a hold, not the field opening: CLAUDE.md's
  rule is that a model is asked only by a deliberate act, and opening the
  field is not one — so the tie is offered and the hand decides. The answer
  is one more held reading in its own name (*molecule 0.99 · Jev*, never
  evicting the engine's), and under the floor the status line says what it
  said and that the engine's ranking stands (`askDecider`,
  `Demos/surface/04-seatpane.js`; e2e M15).
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

**A hosted model is asked, and says why when it cannot be** (V1-PLAN J5,
`llm/provider.ts`, its recorded shapes in `llm/fixtures/`, shared with the
e2e stub). What John's GLM Flash on OpenRouter taught:

- **A reply is read the way the provider sends it.** The answer is
  `content` only — a string, or the text parts of a list (a thinking part
  is left out) — with `<think>` dropped. A reasoning model's `reasoning`
  (OpenRouter), `reasoning_content` (Z.AI's own API, vLLM, DeepSeek, LM
  Studio) or reasoning details are never read as its answer; with no answer
  the failure says exactly why — *GLM 5.3 Flash spent its whole budget
  thinking — no answer came back (it stopped at the token limit, 8,192
  tokens)*, it thought and stopped, it hit the limit before writing, a
  filter withheld it, it declined, it said nothing. An answer cut off at the
  limit is kept and marked `truncated`; an error OpenRouter puts inside a
  200 is a failure, with the upstream provider's own words.
- **A failure is said in full**: `HTTP 401 — bad key: “User not found.”`,
  `402 — no credit`, `404 — no such model, or no such endpoint`, `429 — rate
  limited`, each with the provider's message, and `status` and a `reason`
  beside the sentence for a surface to act on. A network or CORS failure is
  said as one — the browser does not say which; a timeout says the host and
  the wait; a key a provider echoes back is never repeated; `'cancelled'`
  stays the one word callers test for.
- **Every call is budgeted**: `max_tokens` 8,192 (`DEFAULT_MAX_TOKENS`),
  under what the provider said the model may write and read
  (`maxTokensFor`). Unsent, the budget was the provider's default, and a
  model that thinks first could spend a small one thinking. **A call to
  OpenRouter adds `reasoning: { effort: 'low' }`** (`OPENROUTER_REASONING`):
  every ask the canvas makes is a reading or a fill whose structure the
  engine decided, so deep thinking buys little and costs a wait; low, not
  off, because some models cannot turn it off; OpenRouter maps an effort
  onto whatever the model takes and leaves a model that does not reason
  alone. It also gets OpenRouter's optional `HTTP-Referer` and `X-Title`
  (`OPENROUTER_APP`); no other endpoint is sent either, since its CORS may
  not allow a header it does not know.
- **A provider's list says what a model can do** (`readModels`,
  `parseModelList`, `modelFacts`): OpenRouter's rows (inputs, context,
  output limit, parameters — read without the key, the list is public), LM
  Studio's `vlm`/`llm`, a capabilities list, a plain OpenAI list that names
  ids only (`describes: false`). A join is given what the list says — an id
  it does not hold is refused with the nearest ids (`nearestModelIds`) — and,
  when it cannot be read, what it said when the model last joined, else the
  id's guess (`guessVision`), and the sentence says which. `listModels` is
  its ids, sorted, as before. `whereOf` and `modelWords` say where and who in
  words (*on OpenRouter*, *GLM 5.3 Flash*, *qwen3.5 9b*).

**The surface's chrome** (`Demos/session-engine.html`, v9 S1): **one bar**
— the wordmark and the panel toggle on the left, the mark chip, undo and the
**control centre** on the right — and nothing in it explains the system
(D3). The centre is tiles in fixed slots in **three labelled groups**
(PLAN-USER-SURFACE U1f; the markup is `Demos/session-engine.html`'s):
**Board** (boards · folder · import · export · reset), **View** (zoom · view
· theme · hand · snap · snap now) and **Helpers** (models · live · auto-read
· packs · mark · help) — *Reset* with the board, far from *Help* — each tile
saying its state on its face, closing on the next
stroke, Esc, or a tap outside. The panes (models, your mark, boards) open under
the bar, one at a time. The chrome is built from six components in `surface/00-ui.js` — pill,
chip, tile, row, pane — one stylesheet section each. **Light and dark are
the same tokens inverted**: the stylesheet defines the light set on `:root`
and the dark set on `[data-theme="dark"]`, the page stamps one of the two
(*system* follows the OS until the tile says otherwise), and the canvas reads
its colours from the same tokens (`readColours`), so ink and chrome never
disagree. The panel that reports on the last or hovered mark tucks under the
bar, scrolls, and collapses as a whole (*panel ▾*, remembered per device;
closed by default on narrow screens). **It speaks to the person first**
(PLAN-USER-SURFACE U1a; `markSummary` in `10-inspector.js`): what the mark,
the thing or the selection *is* and what it *becomes*, in two or three plain
lines — no id, no tier, no coordinate — with the act at hand (*draw it
clean*, *read it*, a clock's *play*). **A selection that reads as a diagram says *is* and *becomes*** (N1; `becomesOf` in
`10-inspector.js`): *is — a flowchart: three processes, one decision, three flows · or a class diagram 0.35*,
*becomes — Make it Mermaid · draw them clean · a name*, the acts named only when the field offers them. The inspector — ids, tiers, the
ladder, *read as*, relations, *maths*, *measured*, roles — is behind
**details**, closed by default and remembered on this device
(`mm-inspect`). Its room is its own however little it says: the free ground
measures the panel at the height it may grow to (`chromeRects` in
`01-view.js`), or a short panel floated and the fit put marks under it. **On an empty board it shows the loop instead of "nothing here
yet"** (UI-2): *draw a few marks → press and hold one → choose what it
becomes*, three lines in the panel's own plain voice, replaced by the first
mark's reading the moment one is drawn — the actionable start used to live
only in the status line, where a first-time hand was not looking. No modal, no
tour, no fixed palette: the standing line's ladder is unchanged. **It also holds
the first run's one tap** (V1-PLAN R5): *start from an example* opens the
starter example — the molecule, the Basics pack in use — as a board of your own,
and *more examples* opens the boards pane (*Examples*, under *Several boards*,
below); both are buttons of their own (`data-example-start`, `data-example-more`,
never a `data-act`, which is a mark's) taken in `22-boards.js`. Scrolling
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
covered. **And so is time** (PLAN-IPAD-NOTES I3; `samplePoint`, `samplesOf`,
`pushSample` in `07-input.js`): every point of a stroke — mouse, finger, pen —
carries `t`, whole milliseconds since the press (core's `Point.t`, which no
reading uses; never before the point it follows), and a pencil's moves are read
through `getCoalescedEvents()`, so the 240 Hz samples the browser folds into one
move are all points, in order, the event itself added only when a browser leaves
it out of its own list, a sample no different from the one before it not twice.
`point-time.test.ts` (core) holds that the same marks read the same with and
without `t` and `p` on every point; e2e pencil P13–P13b. **A pencil's hover is a hover**: the reading of the mark under it,
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
in a few words). **The status line speaks the person's words**
(PLAN-USER-SURFACE U1b): counts as *3 marks* and *2 things made*, never
*loose* or *artifact*; a bind as *the line is tied to the circle*
(`tiedSentence` in `05-selection.js`), never a site's coordinates; and work
in flight as one phrase — one call its label, several *qwen is working on 3
things · Esc stops it* (`workingSummary` in `04-models.js`) — the detail on
the marks' own dots. The model pane's status stays in the pane. **A match chip
is a button** (D8): a tap on it summons the group it stands beside —
`session.summonMarks(ids, at)`, the same summon a loop and a mark reach,
with `scopeSource: 'pointed'` — so the second molecule is one tap from being
held. Export is a pane of five files — the bundle (*board + pictures*, a `.dyna.zip`), SVG, PNG, PDF
and the log (*Out and back whole*, below) — and a row for a figure at its real size (M5: the maths); help is
**`HELP.md`**, one page for a person — draw, hold, choose; the four round
buttons; what a model adds and how to ask one, Claude too; boards; rooms;
your mark; undo; the shortcuts (PLAN-USER-SURFACE U1g) — read into a pane,
and kept by the service worker for offline. It used to be the hand QA plan,
`QA-v8.md`, a developer's test plan; that stays in the repository, named at
the help's foot. *Your mark*'s pane and the bar's chip say what a mark is for
before asking for five. On a touch screen — or wherever a finger opened it,
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

**Read as writing** (v10 F5): the field offers to read ink as one image —
not only what the shape rung called `text` — because the rung called John's
*h* an arc and his *o* a triangle, and the offer to read them was missing.
**Only when some of the held ink the rung could not place for sure**
(PLAN-USER-SURFACE U1d, `tools/read.ts`: the clean form's own rule,
`snapReading` — confident and unambiguous — or a word); offered on a box, a
line and a circle it was noise. Likewise *Show it in 3D* is offered only for
what it builds, every node a circle and every edge a line or an arc
(`tools/graph3d.ts`). **The minimap** (v10 F7, `21-minimap.js`): the whole board in the
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
doodle session was a stream of calls nobody made. **An ask with no model
here that can answer it is kept, not dropped, and never opens the pane**
(J5, `keepAsk` in `04-models.js`): *What is this?*, *Read the writing* or a
typed brief with no model (or none that sees) is said once in the status
line and in the field where it was asked — *Read the writing needs a model
that can see — kept, it runs when one joins* and **choose one**, the one way
the models pane opens for it — and the moment a model that can answer it
joins, it runs. The ask was the deliberate act; the join is the second.
*Read the writing* says which joined models cannot, and why (*GLM 4.7 Flash
reads text only (OpenRouter says it takes text)*, `whyNoReader`). A pill
that asks a model none here can answer says so on the reading line while it
is pointed at.

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
Enter keeps the brief for a model (J5): it runs when one joins.

**Keys never leave the device.** A hosted provider's key lives in
`agents[].config` in memory and, only when *remember* is ticked, in
`localStorage`; the `join` event in the log carries a kind and a name and
nothing else, so the log, the folder, autosave and export are clean of it.
**Since I7 a key is the provider's, not a model's**: entered once (`holdKey`,
`04-seatpane.js`), it is every joined model's on that provider that waits for
one and every seat joined after with the field empty, and kept on the device
only for a provider whose key the hand asked to remember (`mm-model-keys`,
`{ <address>: key }`; `keysToKeep` in `03-seats.js`) — a key typed without
the tick forgets the one kept. The remembered picks (`mm-seats`) keep what
the provider said (whether it sees, what it is called), never the key; OpenRouter's public list of models is read without
it; and a key a provider echoes in an error is never repeated (J5). The gate's
`models` scenario looks for the key in the log, the board's journal, every
cache, the DOM and the address, and finds it only where *remember* put it.

**The model pane** (`Demos/session-engine.html`) follows what the personal
site's search bar learned (`johnhanacek/scripts/search-core.js`): it probes
**both** local servers in parallel (returning on the first that answered hid a
running Ollama behind LM Studio), lists models per server, **hides
embedding-only models and says so** (an Ollama holding only `nomic-embed-text`
used to show nothing and explain nothing), and **remembers the pick as a
preference** — honoured when that server still offers that model, quietly
ignored otherwise. Hosted providers and a custom OpenAI-compatible endpoint
join by key; the key is remembered only when asked. **A join asks the
provider what the model can do** (J5, `joinHosted`): its list, read once a
page and waited on at most three seconds — a list that lands later still
corrects the join — refuses an id it does not hold (*no model called
z-ai/glm-flash on OpenRouter — did you mean ~z-ai/glm-flash-latest,
z-ai/glm-5.3-flash or z-ai/glm-4.7-flash?*) and says whether the model sees
and how much it reads; the id's guess stands only when the list cannot be
read, and says so. A remembered pick rejoins after a reload the same way
(and a remembered Ollama or LM Studio pick is asked for where it runs, as it
was before the 6 Sep tier redress made it ask for a key). **Each joined
model's row** says its name in words, where it runs, *sees* or *text only*,
its context (the tooltip: what its provider said, or why that is a guess),
**its last call, kept until the next** — *ok · 1.8 s · read “hello”*, or the
failure in full — recorded by the transport every call goes through, and
**try it**, one tiny prompt. With a long list on this machine the pane
**suggests one model a job** — the smallest that sees for reading writing,
the one nearest 8B for *What is this?* — and the rest wait behind *all N
models*. On the board a model is named in words, with no `llm:` (chips,
working dots, the status line, the tile), and a reading is words, not a
slug (*state transformation*; taking it still names by the label). **It leads with Claude Code** — the seat, one tap while Claude's hand is in the
room (*The canvas's seat*, below) — and an MCP server of your own through the door
(`Demos/mcp-client.mjs`) waits under *advanced*, out of the key form.
Model participants are surface-side (`agents[]`); the session keeps every
`join` in its history, so leaving only stops a model being asked.

**Seats: a model per job** (V1-PLAN I7; PLAN-IPAD-NOTES §3; the rules are
`Demos/surface/03-seats.js` — pure, `node --test Demos/surface/03-seats.test.mjs` —
and the adapter `04-seatpane.js`). The pane's *seats* section is four rows, each
saying who holds it, what its last call came to (J5's rows, kept) and what it
falls back to: **reader** (handwriting to text — a model that can see; the
quickest you have), **writer** (briefs, pages, programs, *What is this?*),
**decider** (a decision model, above) and **semantic** (on this device, no key — *Semantic seat*,
below). The form's *for* field says which seat a model joins for, so every seat
has its own provider and model, the key the provider's (above); a joined model's seat
is also a select in its row, **local before hosted, then the quickest last call**
(`orderChoices`). **A seat chosen NARROWS who is asked; one left alone changes
nothing** — a model that holds no seat is *any job*, asked as every model was
before seats. `resolveWriters`: the writer seat when chosen, else every model with
no seat, **Claude Code first while it is seated (J4)**; a model that holds only the
reader or decider seat is not asked a brief. `resolveReaders` (`readers()` in
`06-handwriting.js`): the reader seat, else Claude Code while it is seated, else the
writer if it sees, else the smallest model that sees — and the fallback is said in
the row (`fallbackWords`). The decider is not in `agents[]` at all (it has its own
participant). **A model stays joined across boards** (the I7 finding, 1 Oct 2026;
`participants/seated.ts`, e2e M20–M23): a board loaded in place — a switch through the
boards pane, *from a file…*, an example, Reset — takes every `join` with it, because
joins are events in the old board's log, so every seat's model (the agent, the decider,
the MCP door's, Claude Code) is **seated on the board it is asked on, lazily and once**:
`agent.seat(at)`, which every ask calls first, finds the join the board already holds
(by kind, name and tier — never by an id alone, which is the board's counter) or writes
one `join`, so a board only looked at is never written and a board reopened that holds
its join gets no second. A participant's id therefore moves, and the surface keys every
map by `agentKey` (04-models.js), never by `agent.id`. **What is
kept, `mm-seats`, is a pick a seat** (`{ reader, writer, decider, any }`: where, which,
what the provider said — `pickOf`, never a key); `any` is the one model last joined
with no seat, as the single pick always was. An older device's `mm-model-pick` and
`mm-model-key` become the writer seat (and the reader, for a model that sees) and the
provider's key, once, the old entries let go only after the new are read back
(`migrateStored`; e2e M19). A reload rejoins every seat the way it joined (the
provider asked again what it can do); with no key kept a hosted preset says so in the
form and the seats wait for the key typed once (`rejoinPending`), a custom endpoint
rejoins keyless as it always did. **Nothing here asks a model**: who is asked, by
what act, is §6.3's, unchanged.

**The semantic seat: meaning, on this device** (PLAN-IPAD-NOTES I9, 1 Oct 2026; core `core/src/semantic/`, the
surface's `03-seats.js` rules and `03-semantic.js` adapter, `26-find.js`, `12-regions.js`; core tests `semantic/*.test.ts` and
`tools/like.test.ts`, `node --test Demos/surface/03-seats.test.mjs`, e2e `boards` N24–N24l in `e2e/semantic.mjs`). **A seat, not a
dependency**, the rule `decide.ts` set: an injectable **`EmbedTransport`** (`{ name, dimension, embed(texts, { signal }) }`,
texts in, one vector each out) with nothing in core that names a vendor, opens a socket or reads a file; the vectors are held
in memory by (transport, text) (`createEmbedCache`) and never in a log. Core holds `cosine`, a deterministic **stub**
(`createStubEmbedTransport`: each word hashed to a place, a named group's words to the SAME place, so related words score higher
with no letter in common — it measures nothing of any real model), **`semanticScorer(transport, query, entries)`** (the
function `searchBoards` takes at `options.semantic`: async, because a transport is, it embeds the query and each entry text
ONCE and then answers from memory in 0..1; a transport that answers the wrong number or size of vectors fails in words and keeps
nothing of that batch; a cancel rejects as `cancelled`), **`notesLike(transport, boards, { text, board, ids })`** (the others
ranked by cosine, the thing's own ids left out and a copy of it on another board not, under `SEMANTIC_FLOOR` not listed; each note
carries `meaning`, its score, and a `reason` that is arithmetic and says nothing the numbers do not — *is about the same thing —
0.71 by <the model>; no word in common* or *shares “pricing”*) with `groupLikes` (the shape Find's pane already shows), and
`wordsOfMarks(state, ids)` (what held marks carry: a label, read writing, a text's words, an artifact's name, a region's name
and then what it holds, through `searchEntriesOf(state, only)`). A `SearchHit` gains optional `meaning` (what the seat added,
only when a seat scored it above nothing) and `reason`. **The first real candidate is a static-embedding model**
(`semantic/static.ts`, Model2Vec's `potion` family): `parseSafetensors` (F32, F16, BF16), `wordPieceOf` (the tokenizer.json's
WordPiece with the Bert normaliser: lower case, accents off, split on space and punctuation, longest known start, `##` for the
rest), `createStaticTransport` (a text is its tokens' rows, unknown tokens left out, averaged, scaled to length 1; no known
token is the zero vector, never NaN) and `buildStaticModel` (the same format WRITTEN — a small seeded model whose groups of
words are near — for tests and the gate). It refuses in words what it cannot read: a `mapping` (a quantised vocabulary), a
vocabulary that is not the table's, a dtype it does not take, a file cut off or that is a page of HTML. **UNVERIFIED: the reading
of the real `potion-base-8M` as laid out here** (one `embeddings` F32 tensor, a Bert WordPiece tokenizer, mean with unknowns left
out, unit length) — the container cannot reach the host (the proxy answers 403), so it is the author's reading of the format,
proved against a model built by the writer; `node scripts/check-semantic-model.mjs <folder|https://…>` reads the real files with
the same code and asks whether related is nearer than unrelated. **The tool** (`tools/like.ts`, the twenty-fifth built-in,
registered last): *Notes like this* is offered only when `ToolHost.semantic` (the seat's name) says a seat is held, only when the
held marks carry words, and `hidden` — typed (*notes like this*, *like*, *similar*), never a pill and never what Enter does with
nothing typed — so e2e 49's golden offers are unchanged by construction; it carries the model's dot, writes nothing and names the
host act `like`. A region reaches the field by the selection, never the summon, so its offer is **a button in its panel**
(`regionLikeHtml`, shown only with the seat held and words in the region). **On the surface** (`03-semantic.js`): the seat's row
in the models pane holds the address of a folder with `tokenizer.json` and `model.safetensors` (default `SEMANTIC_SOURCE`, the
`potion-base-8M` folder on `main` — **not pinned**) and *load it here*; **nothing loads at boot, on draw, on a hold or on opening
the field** — the model is fetched by that tap, once (the browser's Cache API, `mm-semantic`, so a later load needs no request and
the row says *from this device’s cache*), with `credentials: 'omit'` and no referrer, refused above `SEMANTIC_MAX_BYTES` before
or while it comes, read by core, and seated; a reload leaves the seat empty (the address typed last time is kept, in
`mm-semantic` = `{ source }`, and a key never — the seat holds none). An address is `https`, or `http` on this machine only, with
no user, no password and no query (`semanticSourceOf`, tested in Node). Every failure is said in words, in the row and the status
line, and the seat stays empty: a refusal (`HTTP 403`, naming the file), a missing file, a network failure, bytes that are no
model, a file too big. *Try it* embeds three tiny texts and says the milliseconds. **Find, seated**: a query typed in the pane is,
once it has rested (`FIND_SEM_MS`), also asked by meaning — the query and every entry text not yet held are embedded, the list is
drawn again, a hit nothing typed matched is said *by meaning 0.71*, the status ends *by meaning too* (*reading by meaning…*
while it waits); with nobody in the seat none of this exists and Find is exactly the lexical Find. *Notes like this*, taken, opens
the same pane on *notes like “…”*: the boards read first, the near notes grouped by board each with its reason (a tap opens the
board at the note, as a found word does), *search instead*, or typing a word, leaves it. The gate seats a **page-side stand-in**
(`mm.joinSemanticTransport`, for Find, the offer and the region's button) and then runs the page's own **loader** against a
model built by core's writer and served from `startEmbedStub` (`e2e/servers.mjs`), with failures served too; `huggingface.co` is
on the gate's guard, and the Cloudflare CSP's `connect-src` names `huggingface.co`, `*.huggingface.co` and `*.hf.co` (a redirect
to a file host counts). What it does NOT do: group notes (clustering), use the seat for the decider's choices or the field's
readings, search a board's picture, or run anything on the Claude Code seat — a *what is near* is the page's alone, and the MCP
hand does not search yet.

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
- **Writing reads when it is writing** (PLAN-USER-SURFACE W2; `conversionsFor`
  in `09-palette.js`, an item's `enter` in `09-field.js`). Held marks that are
  all writing, unread, are ONE option: their reading (*writing 0.75*, or
  *writing 0.65* for a word alone), with the model dot, taken by the read
  tool's own act — whichever reader is here, or the ask kept for one — and
  the line says `↵ read it`. Enter used to name the group "writing". *Read the
  writing* and *What is this?* leave the row and stay typeable; once the words
  land they lead as below. *Read as writing* on other ink (F5) is U1d's, below.
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
  letters, on every board (under *Live logs*). **Drawing is not writing**
  (V1-PLAN W1; `words.ts` holds the pure parts, `connectorNotLetter`,
  `closesFigure` and `oneDrawing` in `session.ts` read a stroke's ends against
  its neighbours, `headApartAt` in `diagram/heads.ts`): a connector that meets
  what it connects — bound, or arriving at a mark that is not writing — or that
  is long against the run's own x-height is no letter (a hand's ascender stands
  under three x-heights, John's included); two strokes whose ends pair up into
  a figure `figuresAmong` reads are halves, not letters (a diamond in two
  quick strokes); and a head drawn apart right after its connector is that
  connector's. A flowchart's *yes* written beside a vertical flow, a class
  relation's “1” and “*”, and a sequence's self-message head used to be
  gathered into words with the line they label.
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
- **Reading my notes: every line, in a batch** (PLAN-IPAD-NOTES I8; core
  `participants/readlines.ts`, `agent.readLines`, the read tool's offers in
  `tools/read.ts`; the surface's side in `06-handwriting.js`, `09-palette.js`'s
  host acts; e2e `models` M24–M28). **Several lines held are ONE offer, *Read
  these*** (key `read-lines`; while the marks held are all unread writing it
  stands as the one *writing* reading, W2's, whose Enter is *read these*), a
  batch of every line of handwriting among the marks — `writingLinesIn` finds
  them with `writingLines`, **the `writing` concept's own bands and gap, one
  home** (`concepts/concept.ts`: the concept reads the fullest line, a read of
  a page reads every one, top to bottom, left to right; a word alone is a line
  of one). Each line is drawn **from its own strokes** — never a crop of the
  board — by `sheetOf`, which says where every point and numeral go: **one
  sheet of numbered rows, ink black on white at one line height** (`LINE_PX`),
  one stroke width, **the pen's pressure ignored**, the sheet capped inside
  what readers take (`SHEET_MAX_PX`); `06-handwriting.js` draws it exactly as
  said. **One image with numbered lines, not one image a line:** a small vision
  model reads one picture far better than several (many take one image a
  message, a provider may cap them, each image is tokens and a place to lose
  track of which is which), the number in the margin is a key the reply cannot
  slip, one line height gives every line the same size however it was
  written, and one image is one round trip. The reply is a JSON array, an
  object a line (`{"line":2,"text":"…","confidence":0.8}`, a second object for
  the same line a lower reading), read back line by line by `parseLineReadings`
  — tolerant of an object with `lines`, plain strings by position and numbered
  plain lines; **a line the reply leaves out has no reading, said, never
  invented**. A call asks at most `LINES_PER_CALL` lines; more are further calls
  **one after another** (a local server answers one at a time, and Esc stops
  the rest), each with its dots on its own marks and its label in the status
  line (*GLM 4.5V · reading lines 1–8 of 12*, `withWork`), a sentence between
  (*read 8 of 12 lines — 4 to go*) and one at the end (*read 2 of 3 lines —
  line 2: no reading came back for line 2*). Lines already read — a transcript
  held, or read with their line — **are skipped** unless asked again (*Read
  these again*, typed); *Read the board* is the same for the whole board, typed
  (`read the board`, offered only where the host says there is writing:
  `ToolHost.writing`, kept while the log stands); `readScopeHooks` is where a
  region's marks join what is held (I5). **`agent.readLines` holds each line
  where it was written**, attributed and never blessed: a line of several marks
  whose reading has as many words gets a word on each, any other line is held
  whole on its first mark (the rest *read with* it); a line fails by itself with
  its reason (no reading came back for it; its mark was erased while the model
  thought, STATE-1's refusal); a failed call fails every line with the
  provider's words. **One deliberate act is one batch, nothing on draw**, and a
  read with no model that sees is kept (J5) and runs when one joins. Through
  Claude Code's seat the brief is one, naming every mark of the sheet, and the
  hand that answers draws their ink. **Latency is measured**: the reader's row
  keeps the last call as *ok · 1.2 s · read 3 lines · 12 KB · 0.4 s a line*, and
  `window.__mm.lastReads()` the lines, payload bytes, ms and ms a line of each
  call; a sheet of eight lines is tens of KB. The panel says what each line
  said (`linesPanel`, *handwriting · 3 lines*) or why it was not read.
- **A picture, read** (I8; `tools/read.ts`'s *Read the picture*,
  `agent.readPicture`, `readPictureFrom` in `06-handwriting.js`): a picture held
  alone with its pixels kept is offered *Read the picture*; the pixels are read
  from the asset store, **downscaled to a long side of 1,568 px and sent as
  JPEG** to the reader seat with *what does this page say*, and the answer —
  `{"lines":[…]}`, text one line each — lands as **a text artifact BESIDE the
  picture, never over it**, made by the reader (an `import` in its name, so it
  is held as the reader's), editable like any text, named for the picture it
  came from (*notes-page.jpg, read*); the picture is untouched, and a picture
  gone before the answer lands writes nothing. **Claude Code at the desk cannot
  yet read a picture** — the log carries no pixels, so the seat's hand has
  nothing to see — and is left out of who reads one (`pictureReaders`); the
  ask is kept for a model that sees. **A spike, not the product**: `?spike=trocr`
  opens `Demos/spike-trocr.html` — TrOCR-small-handwritten through
  transformers.js loaded lazily from jsDelivr on a tap, a pad to write a line
  on, and what it measures (load time, memory where the browser says, ms a line,
  the text, the error rate against what was typed). **It is unrun**: the
  container it was written in cannot reach jsDelivr or Hugging Face (403), so
  the model id, the CDN path and every number are unseen; it fails in words.

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

> `core/src/store/` (the seam and three backends);
> `Demos/surface/17-folder.js`.

Nothing is invented: a canvas is a folder. *Open a folder…* walks it for
every file of a known kind (skipping `node_modules` and its kin, stopping
at 400 files and saying so) and each becomes an artifact of its kind
through an `import` event **in this participant's log**, laid out as
cards; a second machine that pulls sees the same board and discovers
nothing twice. Logs are one file per participant under
`.metamedium/logs/` (the folder format keeps the old name, RENAME-PLAN §2), one event per line — **a header line first, since R2
(*The log format*, below)** — and the canvas is `mergeLogs` of
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
**A picture's bytes are not in a board's journal** (PLAN-IPAD-NOTES I1): the events name an asset kept in
`mm-assets` beside it (*Pictures: kept, drawn and traced on request*, below) — a duplicate names the same assets, the
trash keeps them, and emptying the trash is when the ones no board uses are collected.

**Carried to the new home** (RENAME-PLAN N1; `17-carry.js` decides — pure, tested in Node with `17-boards.js` and
`17-bundle.js` — `22-carry.js` is the window and the messages, `17-folder.js` writes the boards in (`carryIn`) and
`18-out.js` takes them out (`everyBoardsOut`); `22-boards.js` shows it; e2e `carry`). What a browser keeps belongs to
the address, so a person moving from `jjh111.github.io` to dyna.ink carries it: **Carry my boards to dyna.ink** in the
boards pane opens `https://dyna.ink/app/?carry` in a window **inside the tap's own handler**, before anything is
awaited (or the browser blocks it); the new page, once its boards are open, says it is ready; the old one sends ONE
message — every board in one file as transferred bytes, the same file **Every board out** downloads (the fallback,
offline, between devices, where a window is refused): `boards.json` (each board's name and view, the mark's five
samples, the preferences) and each board's I4 bundle, untouched — and the new page answers with three counts, never a
name it holds. **The origins are fixed both ways**: the receiver takes boards only from `https://jjh111.github.io`
(`carrySources`), from the window that opened it; the sender posts only to `https://dyna.ink` by name, never `'*'`
(`carryTarget`). A page on this machine (`127.0.0.1` or `localhost`, any port) — the gate, development — may name
another such origin in its own address (`?carryTo=` on the sender, `?carry=<origin>` on the receiver, which the sender
writes), and a page anywhere else reads neither, so production has no hole. **Never a key**: preferences go by an
allowlist of names (`CARRY_PREFS`), never "every `mm-` key"; the remembered model keys, a repository's token, the model
picks and the semantic seat's address are named in `CARRY_NEVER`, a value shaped like a key is left out even under an
allowed name, and the receiver reads what arrives through the allowlist again; a room's key lives only in a room's
address, which no carry reads. **The log is the board**: each board comes in as a new entry, its pictures stored first
(hashes checked), then its log event for event; a name a board here has takes a number; a log already held — or
carried here before (`entry.carried`, the digest it came as) and drawn on since — is said and skipped, so carrying twice
brings nothing twice; the mark is learned again from its samples where none is held; a preference is set only where
none is; the empty board the new page opened with gives its name up to the trash, and the page goes to the board that
came. The trash and empty boards stay behind. *From a file…* takes the same file on any address. **The notice** — a
lasting line at the head of the old address's boards pane, and the status line once a device — says dyna.ink is the
new home, with the tap; it is **off** until N4 flips `NEW_HOME_NOTICE` in `17-carry.js`. Before then the offer is
reachable by hand with `?carryTo` in the old address (the target is dyna.ink whatever it says), and *Every board out*
stands in every boards pane. Unverified: a carry from the app installed to an iPad's Home Screen, whose window may lose
its opener — it then says dyna.ink did not answer and points to the file.

**Kept on the iPad** (PLAN-IPAD-NOTES I3; `spaceWords`, `storageWords`,
`persistPlan`, `PERSIST_KEY` in `17-boards.js`, tested in Node; `askPersist` in
`17-folder.js`; `loadRoom`, `roomChanged` in `22-boards.js`; e2e boards N20–N20f).
Safari clears a site's storage after seven days without a visit unless it is
installed or the browser agreed to keep it (unverified on a device — §6 of the
plan). So once a board the device keeps holds something the page asks
`navigator.storage.persist()`, **once per device** (the preference is written
before the answer, whatever it is) and **never** for `?fresh=1`, a replay, an
embed, a room, a folder or a repository (`persistPlan`: only boardMode's
`restore` is the device's own board). The boards pane's foot says in plain
words what `estimate()` and `persisted()` answer: *kept on this device — 12 MB of
about 40 GB*, *kept with the app on this device* when it runs from the Home
Screen (`navigator.standalone`, else `display-mode: standalone`), or *this browser
may clear it after a week unused — add to Home Screen*; a browser that says
neither is said to. The size of each board in its row is still marks and the
journal's KB.

**Find, and a picture of each board** (PLAN-IPAD-NOTES I6, 1 Oct 2026;
`core/src/search/`, `Demos/surface/17-find.js`, `26-find.js`,
`22-boards.js`; e2e boards N23–N23i, `search.test.ts`). **A word is looked for on
EVERY board this browser keeps, as it is typed.** The *find* button in the bar, `/`,
⌘K and ⌘F open one field under it; results are grouped by board, each hit as the
words in context (*“Pricing” — label on a box · Board “Q4 notes”*, core's
`describeHit`), a board listed by its best hit and then by use; a tap opens the board
in place (the switch the boards pane makes) and takes the view to what was found,
ringed for a moment on a layer of its own (`findRing`, never the paint, never the log).
**Searching is reading**: nothing is written to any log, and a board a hand only looked
at stays unwritten. **The index is derived and lost harmlessly.** Core says what a
board says (`searchEntriesOf(state)`: the newest label on each mark and what it stands
on — *label on a box* — artifacts' names (a default `text 3` says nothing), typed text,
a figure's `<text>`/`<title>`/`<desc>`, Mermaid, the words of a page, a picture's name,
read transcripts — each with its mark's id and box), ranks a query (`searchBoards`: words
folded for case and diacritics and cut at anything that is no letter or digit, no
stemming; every word typed must be there; an exact word above a prefix, a short saying
above a long one, a word that follows the one before a little more, a label or a name a
little above prose, then the board used most recently), and says which boards to read
again (`stalePlan`, `searchKeyOf`: the board's own record of its change — when, events,
characters — with the format's version and the sources registered). The surface keeps it
in its own IndexedDB, **`mm-find`** (`index` and `thumbs`, each keyed by board; its own
database so the journals' `mm-boards` version is no one's to bump): the board on screen is
indexed a moment after its last change (`FIND_DEBOUNCE_MS`, a timer restarted by the
journal's own append — a stroke pays a `clearTimeout`; idle, and never while the pointer
is down), a board left is indexed and drawn from the live state in the task that leaves
it (`findLeaving`, in `switchBoard`), and every other board whose kept index is missing
or stale is read from its own records, replayed in a **scratch session** and indexed, one
at a time with a pause, a few seconds after the page opens and when the find or boards pane opens
(`findSync`). A board emptied from the trash lets its index go (`findDrop`); a trashed one
is not searched. Works offline: the query is asked of memory. **Hooks for what comes
next:** a region's name is found as itself (*a region*, at its own box; `SEARCH_VERSION` 2
read every board again), and `registerSearchSource({ id, entries(state) })` adds entries for
what core does not know yet (its id is part of the key, a source that throws is left out);
`searchBoards(boards, query, { semantic })` takes a seat's score for an entry (0..1, added
to the lexical score, and what no word matched is let in at `SEMANTIC_FLOOR`) — where the
semantic seat joined (I9: *The semantic seat*, above; a hit it added says `meaning`); and the logic is core's, so the MCP hand can search too (a
`canvas_find` is not added yet — `mcp.mjs` is another unit's this cycle). **Thumbnails**:
each row of the boards pane shows a 240×160 picture of its board — the pictures as the
canvas holds them decoded (a board read from its records: from the asset store, small),
a plate where anything else stands, the ink in its clean form and its maker's colour —
made in the same task as the index (on leaving, and for any board that has none), kept
in `mm-find` under the same key, and refreshed for the board on screen when the pane
opens. It is a picture of its own (`findPaintThumb`), never a repaint of the canvas.
Not yet: a mark found inside an artifact is opened at the artifact; stemming; a hit in a
board another tab holds is found from what was kept.

**Examples, and the first run** (V1-PLAN R5; `boards/examples/`,
`scripts/examples.mjs`, `17-boards.js`, `22-boards.js`; e2e 65–65f and the boards
scenario's N18–N18e). A hand who has never used the app needs something to hold
that the engine already reads. **An example is a log** — one event per line, as
*export* writes it — **made by `scripts/examples.mjs` from the engine and never
drawn**: `drawMermaid` for the flowchart (its Mermaid then taken through the
tool's own act, `takeOffer`, so it stands beside the drawing as an artifact) and
the class diagram, `strokeFor` with `handLike`'s seeded tremor for the molecule
(`use basics@1`, nothing taught) and the pattern page (a right triangle ruled in
three lines with a square in its corner, 24″ and 8″ written beside the legs, a
page of ten lines of steps), texts as the surface's `typeText` writes them, on a
fixed clock (`T0`) and with no randomness — so the same engine makes the same
bytes, `--check` names a file that no longer is what the script makes (CI's
`core` job), and `examples.test.mjs` replays each and asks the engine what it
reads (the flowchart as a flowchart, the class diagram as a UML class diagram,
the molecule matched by `basics@1`, the pattern page saying 25.30″ and a check on
each step). Each opens with nothing held (the summon dismissed and the marks let
go) and carries a note in the person's words with no digit — a number near a
drawing is a measurement to the maths, and a note must not be one. (It also carried
no colon or dash, which read as a step; F2 made prose say nothing, so those are
free now — found making the first two.)
**The boards pane lists them** under *examples*, from `index.json` (`exampleRows`,
in `17-boards.js`: read, not trusted — a row with no name, a repeated id or a file
that is not one of the folder's own `name.jsonl` is left out, nothing throws), and
**opening one makes a new board of your own**: the log is fetched (`exampleUrl`,
`../boards/examples/…` from `/app/` and the old address alike), read the way *from
a file…* reads one, and made a board through `newBoard` — a copy under an id of
its own, named for the example (`exampleName`: *Flowchart example*, then
*Flowchart example 2*), so the example is never written and the hand draws on it at
once. An ask for an example that cannot be read (offline, and not visited before)
is said in the pane or the status line and makes no board. The service worker keeps
the index and each log for offline (`EXTRA` in `Demos/sw.js`; the test checks that
every example is named there).
**The first run stays an empty board**, on purpose: a hand who only looked is never
handed a board with marks on it, nothing is written for that hand, a returning hand
is never surprised, `?fresh=1` (the harness's start) is unchanged, and no other
scenario's first board changes. What a first-time hand is given is the panel's
*start from an example* (*The surface's chrome*, above): one tap, a board of its
own from the starter (`starterOf`: the index's `starter`, the molecule), the board
it was tapped on left as it was — an empty *My board* stays on the list. A board
opened from a room, a folder or a repository opens in a page of its own, as any
board does, so e2e 65 stands before the canvas run's rooms.

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

**Installed on an iPad** (PLAN-IPAD-NOTES I3; `Demos/icons/`,
`scripts/make-icons.mjs`; e2e app A12–A15): iOS takes the Home Screen icon from
the page, as a PNG, so `Demos/session-engine.html`'s head names an
`apple-touch-icon` (180 × 180, full bleed), the iOS web-app meta
(`apple-mobile-web-app-capable`, `-status-bar-style`, `-title`,
`mobile-web-app-capable`) and a `theme-color` per colour scheme — the surface's
own `--ground` in each, which the test reads from `surface.css`; the manifest's
icons are PNGs (192, 512, a maskable 512) that `scripts/make-icons.mjs` draws
from the old SVG glyph with Playwright's Chromium (committed; no image library),
and `build-app.mjs` asks for them from `/app/` (`../Demos/icons/…`, as the page's
files are); both workers keep them for offline (`EXTRA` in `sw.js`). The page also asks
`navigator.storage.persist()` once per device — *Several boards*, below.

**The version** is `VERSION` at the root: one line, semver without build
metadata, `0.0.0` until the first release. `node scripts/build-app.mjs`
stamps it into the page's `<meta name="dynaink-version">` — which the
help pane leads with, offline and in the standalone file alike — and into
the worker's `const VERSION`, and makes `app/` again (the tag was
`metamedium-version` until 0.1.0; the surface's one reader of it,
`pageVersionOf` in `17-boards.js`, falls back to that name, so a page an older
worker kept still says its version — RENAME-PLAN N3b); CI's `--check` names
the file when either has drifted from `VERSION` and `Demos/`. Pages
publishes `master` as it stands, so between releases the app runs master's
code under the last release's number.

**A release** is one command, cut by the director on John's instruction
(*Working with the Codebase*): it refuses a dirty tree and a version not
greater than the last — `VERSION`'s or any `v<version>` tag's (`v1.0-day1`
is not one) — writes `CHANGELOG.md` a section from the commit subjects since
the previous release tag, merges left out, **grouped by the unit each names**
(the first unit before the subject's colon, else the first anywhere; "V1
plan" names the plan), bumps and stamps, builds the standalone file,
`dist/release/dynaink-<version>.html` (ignored), and refuses anything
key-shaped in it or in the section without saying the thing back, commits
`Release <version>`, and makes the annotated tag `v<version>` with
"dyna.ink <version>" and the section as its message
(`--cleanup=whitespace`: by default git strips every `###` line from a tag).
**It never pushes**; it prints the pushes, to the fetch URL — the push URL is
a lock the week-1 automation left, on purpose. `--dry-run` prints all of it
and writes nothing, exiting 1 where the real run would refuse.

### The log format: a header, version 0 and 1 (V1-PLAN R2)

> `core/src/store/format.ts` (the one definition; `seam.ts`
> re-exports `encodeLog` / `decodeLog`), `format.test.ts`,
> `format.files.test.mjs`; the surface's `readLogText`, `logWrite` and
> `logFileNote` in `Demos/surface/17-folder.js`; e2e N19–N19f.

**A log kept as a file is versioned.** Version 1 begins with a header line,
`{"type":"format","format":"metamedium-log","version":1,"app":"<VERSION>"}`
(the format id keeps the old name: every saved board carries it — RENAME-PLAN §2;
`app` when the writer knows it — the page's own version; the generated
examples leave it out so their drift check holds across releases), then one
event per line as ever; **version 0 is a log with no header** — every log kept
before R2, and every one still under `boards/story/` and
`dynaink-3d/fixtures/`. Every writer writes 1 (`encodeLog`; `appendToLogText`
for an append: nothing yet gets the header, a version 1 file only the tail, a
version 0 file is brought to 1 with its events as they were); every reader
accepts 0 and 1 (`decodeLog` returns `version`, and the header is never among
its events). **A version newer than this build reads is refused whole**
(`LogFormatError`, before one event is returned): *“canvas.jsonl” is a version
2 log, written by dyna.ink 0.9.0 — this build reads versions 0 and 1, so
nothing of it was read; open it with a newer dyna.ink*. A header naming no
usable version is refused the same way, never guessed at, and nothing appends
to a file this build cannot read. The surface says the sentence where the file
was met: in the boards pane for *from a file…* and the examples, in the status
line for a folder — which is **not opened at all**, so nothing writes over it
— and in the shard's panel. The journal a browser keeps a board in (R3) is
records of events, not a file, and has no header; the file the board leaves as
is one.
A picture's `import` event (I1) carries an `asset`, a `mime` and a size and no bytes, in a version 1 log as
in any other: a reader that does not know an asset draws the picture's name, as a version 0 or 1 picture
always was — and a log taken out as a file names assets this browser holds and a file carries none of (the
board bundle that does is I4).

**The trap, and how it is answered.** A surface from before R2 takes every
line that parses for an event and its boards pane refuses a file whose lines
have no string `type`; a header of some other shape would have broken it. So
the header carries **`type: 'format'`**, a type the session has no case for
and ignores: a version 1 file opens in a week-old surface, its header one
event that does nothing (the board reads one event long). What that surface
cannot do is refuse a version 2 — the reason the number is written now.
`format.files.test.mjs` proves it against the committed Node bundle of the
day before (`src/store/fixtures/core-before-r2.node.mjs.gz`, kept as a
witness, never rebuilt): that bundle's `decodeLog`, `mergeLogs` and session
load a version 1 file, and every board under `boards/` written as version 1,
to the same board as version 0. The export says it in the status line (*log
version 1 — an older dyna.ink opens it too*). A folder this hand wrote as
version 0 opens as ever and its next save is version 1.

### Live logs: multiplayer as a transport (v9 S6)

> `core/src/store/live.ts` (`LiveStore`, `LocalHub`),
> `session/hands.ts` (`sittingName`, `handLabel`), `store/merge.ts`
> (`mergeLogs(logs, { me })`), `store/livemerge.ts` (`LiveMerge`, R4d),
> `Demos/surface/17-folder.js` (`openLive`, `mergeLive`), `Demos/relay.mjs`,
> `dynaink-3d/src/room.ts`.

Nothing in the engine changes: a second person on the canvas is a second
log arriving live instead of after a pull. `LiveStore` is a `Store` with
`watch: true` whose transport carries lines — a participant's appended
events — between hands: a `BroadcastChannel` between tabs on one machine
(`?live=<room>`, or the *live* tile), or a relay between machines
(`?live=<room>&relay=http://host:8020`; `node Demos/relay.mjs` is a page
of Server-Sent Events in and POST out, with no truth of its own). **Across the internet the relay is a Worker** (CF1, `cloudflare/relay`; `cloudflare/README.md`): the same protocol over https (`Demos/relay-protocol.mjs` is the one definition of it), a Durable Object a room, and **a key per room** — the HMAC of the room's name under a secret only the relay holds, sent by a Node hand as `Authorization: Bearer` (`MM_RELAY_KEY`, or `--key`, on `Demos/mcp.mjs` and `seat-watch.mjs`; `live-node.mjs`' `relayTransport(url, room, { key })`) and by a tab as `?key=` on the page's address (an EventSource sets no header; `17-folder.js`), never in the log, the board, an export, a cache (`sw.js` keeps no request with a key in its address) or another board's address (`boardSearch`). A relay that refuses a hand says so once as `{ relay: 'refused', status }`, which `LiveStore.refusal()` turns into a sentence in every hand's `notices()` — *the relay does not take this key for this room* — and the hand stops asking; `mcp.mjs` and `seat-watch.mjs` ask the relay once at start (`checkRelay`) and exit 1 with the reason. **A room also keeps the bytes of its pictures** (A1: `PUT|GET|HEAD /rooms/<room>/assets/<sha256>` under the same key, kept per room by their hash; *A picture in a room*, under *The MCP hand*) — the lines stay the only log, and an `import` still names a picture and carries none. A
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
shard reads its acts off its own events too (`undo` in `dynaink-3d/src/log.ts`),
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
log as it joins, `dynaink-3d/src/room.ts`) — keeps counter ids
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
and twelve of its fourteen tools are verbs a hand already has — `canvas_look` (the
board in words, with ids, and for notes the board's outline, the region each mark
stands in and the handwriting a line at a time with what it reads as; *The hand
organises notes*, below), `canvas_see` (the ink as a PNG: how the caller
reads handwriting or looks at a sketch — the tier 2 seat, taken by whoever
is in the conversation), `canvas_draw` (the shape rung's vocabulary or raw
strokes, declared content), `canvas_say` (a sentence beside marks),
`canvas_propose` (a reading, held), `canvas_label` (a word on its OWN ink —
below — refused on anyone else's, with the reason), `canvas_transcribe`
(what writing says, held), `canvas_write` (code for a new artifact or a new
version; where it goes is `bounds`, or `place` — `{in | under | above |
right | left: id, w?, h?}`, relative to a mark, so a caption inside a box is
not arithmetic; the notes' §F), **`canvas_import`** (a picture on the board;
*A picture in a room*, below), and **`canvas_find`**, **`canvas_region`** and
**`canvas_move`** (A2, *The hand organises notes*, below). The other two are **the canvas's seat**
(`canvas_pending`, `canvas_answer`; below).
It **proposes and never blesses**; it can write a program and **cannot
play it**; it holds no keys. MCP over stdio is newline-delimited JSON-RPC
written by hand, so the repo takes no dependency; it imports the committed
Node bundle `Demos/dynaink-core.node.mjs`. In the canvas: the *live*
tile → *with Claude*, or `?live=claude&relay=http://127.0.0.1:8020` (on dyna.ink the tile defaults to `https://relay.dyna.ink`). Its
ink arrives as its own log, stamped `by` on arrival, in its own colour. It
is one sitting, named per process (`sittingName`) — a restart is a new hand
and the same person, so it may label what it drew before (L2i, the smoke) —
and `canvas_look` leads with what the room says about itself — a name two
hands share, a history older than the relay remembers (`LiveStore.notices`).
**In a session without the tools loaded** (the `.mcp.json` was added after
the session began), the hand still works from the shell: run `mcp.mjs` with
its stdin fed by `tail -f` on a command file and its stdout to an output
file, append one JSON-RPC line per call, read the reply — the same fourteen
tools, one process kept alive across turns. `QA-v10.md` is the hand test
run that way, with the hand in the room checking each step. **The gate walks its machine half** (`node e2e/run.mjs hand`, H1: the hand over stdio in a room of its own, QA-v10 §4, §6, §7, acceptance A7), and `QA-v1.md` is the hand checklist for all ten scenarios. Its `canvas_look` says who read a mark — a reading another hand proposed, or its own, is said after the number (*gate 0.70 · claude*), never the engine's own shape rung, and never a name someone gave (H1.10). A reading a hand proposes is held on the tab and attributed, and **the field's *what this is* row shows it with its author** (*gate 0.70 · claude*, `hand` H1.10b; F1): a hand is a tier 0 voice, so the row asks `isHeardReading` (by who said it) and not the tier, and the rung's own readings stay the engine's (`isShapeRungReading`).

**A picture in a room, and the agent's hand on it** (PLAN-IPAD-NOTES A1, 1 Oct 2026;
`Demos/relay-protocol.mjs`, `relay.mjs`, `cloudflare/relay/src/worker.mjs`,
`Demos/relay-assets.conformance.mjs`, `Demos/live-node.mjs`' `roomAssets`, `canvas_import` and
`canvas_see` in `Demos/mcp.mjs`, `Demos/ink-png.mjs`' `decodePNG`, the tab's side in
`17-folder.js`' relay transport and `17-assets.js`/`18-images.js`; `node e2e/run.mjs hand`, H1.22–25).
A room carries LOG LINES, and an `import` event names a picture's bytes by their SHA-256 and carries
none — so before this, another hand in a room drew only a plate with the picture's name, and an agent
could neither put a picture on the board nor see one. **The relay keeps the bytes, by their hash, per
room** — `PUT|GET|HEAD /rooms/<room>/assets/<sha256>`, under the room's own key like its lines
(`Authorization: Bearer`; a tab sends the same header, never `?key=` in an asset address). The rules
are **one file's** (`relay-protocol.mjs`, read by both servers; their cases are one file too,
`relay-assets.conformance.mjs`, run against the Node relay and the Worker): the hash is **verified on
arrival** (the bytes are the ones the address names, or nothing is kept — 422), the bytes must be **a
picture by their own header** (`sniffImage`: PNG, JPEG, WebP or GIF, the size read by hand, no image
library; the type served is the bytes', never the sender's — 415), **up to 12 MB** (`MAX_ASSET_BYTES`,
413 before the body is read where the length is declared) and a room's pictures are **capped**
(`MM_RELAY_ASSET_BYTES`, 64 MiB by default; past it a put is refused in a sentence — 507 — and no picture
is ever dropped, because an event may still name it). Every refusal is a status and a sentence
(`assetCheck`); a get is `private, max-age=31536000, immutable` with `nosniff` and a sandboxing
`content-security-policy`. **Where it is kept**: the Node relay in memory, or as files under
`MM_RELAY_ASSET_DIR` a restart finds again; the Worker **in the Durable Object's own storage**, in 96 KiB
pieces with the record written last — not R2, which is a second product to enable (it asks for a payment
method even on its free tier), a second binding and a second place a room's data could outlive the room.
**The tab** puts a picture on the relay before it names it: its relay transport's `send` holds a line that names
a picture this tab kept until the bytes are there (a HEAD first, a PUT, three at a time) — or eight seconds,
so a slow link never wedges the room — and says a refusal that will not change once in the status line, in
the relay's own words (`roomAssetWords`); a line handed on for another hand is left to its writer. It
**fetches** the bytes of an `import` it holds none of when the picture is first drawn (`roomAssetFetch`,
called by `decodeAsset`): by hash, verified against it, kept in `mm-assets`, and a picture the room did not
hold yet is asked for again, later each time (`roomAssetRetryMs`), then left as the plate it was. A folder, or
a room between tabs (a BroadcastChannel, where the asset store is shared already): nothing changes —
`folder.roomAssets` is null. **The hand**: `canvas_import { path | url | base64, name?, at? | place? }` puts a PNG,
JPEG or WebP on the board as the hand's own act — the size read from the header, the bytes PUT to the room's
relay by hash first (skipped when it holds them), then the `import` event in its log; `at {x, y, w?, h?}` fits the
picture in its own proportions, `place` is `canvas_write`'s, neither puts it beside what is on the board; an SVG
becomes an `svg` artifact holding its text and never touches the relay; every refusal (not a picture whatever the
file is called, a GIF, past 12 MB — said before anything is sent, an unreadable path or address, a room that would
not take it) is a sentence and places nothing. `canvas_see` draws the board's pictures **under the ink** where the
room holds their bytes: a PNG decoded in (`decodePNG`: zlib, the five filters, every colour type and depth; null
for interlaced), a JPEG or WebP — which would take a decoder this repository does not carry — as a frame in the
composite **and the picture itself as an image of its own after it, the bytes as they are with their mime**, so
the caller really sees it (a tab's photo is a JPEG or a WebP). `canvas_look` says a picture is *in the room —
canvas_see draws it*, and one whose bytes nobody put there still says this hand has none to see. EXIF
orientation is not read for a picture the hand imports (the tab turns a photo as it keeps it).

**The hand organises notes** (PLAN-IPAD-NOTES A2, 1 Oct 2026; `canvas_find`, `canvas_region`, `canvas_move` and
`canvas_look`'s outline in `Demos/mcp.mjs`, core's `session/hand-moves.ts` (`handMoves`),
`Demos/surface/24-relay.js`; `node e2e/run.mjs hand`, H1.26–28, and `Demos/mcp-smoke.mjs`). John organises hand notes
on an iPad, and an agent beside him should be able to help the way he does: find, put a place round things, put things
in place. **`canvas_find { query, limit? }`** asks core's search (`searchEntriesOf`, `searchBoards`, `describeHit` —
the same Find a tab runs) of the room's board, the hand's one board: every word typed, a half-typed word finding as
it does there, each hit with the id that holds it, what it stands on and where it stands. **`canvas_region { name,
around | bounds }`** makes a region (`makeRegion`, the field's own act — a rectangle among the marks that holds the rest
is the frame, else the box round them with a margin — or `session.region` at a box), and says what it holds; with `id`
it renames (only a region it made). **`canvas_move { ids, dx, dy | to | into }`** moves in one event anything on the board that is there.

*The ruling — John's, 2 Oct 2026 (A2b)* (asked: may Claude's hand move John's marks? *"ya claude can move marks"*).
**A hand may move anything on the board — another hand's marks, John's included — and a region it made, including one that
carries his marks; it still makes a region round anyone's marks; but it labels only its own ink and renames only a region it
made.** Moving is the only rule John changed; labelling and renaming keep the L2b/L2i rule (a label is about whose ink it is;
nothing in the docs ties renaming to moving). A2 (1 Oct) had ruled the other way — a hand moves only what it made — for the
reason that decides what has to replace it: **undo is per hand** (L2j), so a person's own undo cannot take back another
hand's move of their marks. **A2b did not touch undo.** What stands in the refusal's place is honesty and a way back:
**the hand says whose marks it moved** (`movedSaid`: *moved 3 marks — 2 of john’s by 40,30: …*, *— with what the region
holds* for a region), **the tab says it too** (below), and **the way back is not undo**: John moves them back himself, or
asks Claude, which moves them back with the opposite `dx, dy` (the MCP hand has no undo tool of its own, and its session's
undo would reach only its own log). `handMoves(board, ids)` is the rule as a pure function and still its one home: each id
stands on its own, what is on the board is allowed and what is not is *missing* (the only refusal left), and `moved` is every
thing the move moves — the ids named, a region's contents (`regionCarries`), an artifact's marks (`manipulableOf`) — each
once, for saying whose. **It is the hand's door's rule, not the board's:** the board applies a `move` from anyone, as it
always has, and a log carrying another hand's move is not dropped on replay the way another's label is. Connectors tied to a
moved mark follow it (E2), derived — including a person's arrow tied to a mark the hand moved; that follow is not counted as
a move of the person's marks.

**What John sees when Claude moves his marks** (`otherHandMoves` in core, `tellOtherMoves` in `17-folder.js`'s `mergeLive`;
`hand` H1.28). The marks move on his board — before A2b that was all, with nothing said — and **the status line says it,
once, attributed**: *claude moved 2 of your marks — your undo does not reach another hand’s move: move them back yourself, or
ask Claude* (a merge's moves summed per hand; the hand's own marks are not counted, and a move of marks that are somebody
else's says nothing to him). A merge that begins the board again — the tab's first sync after a join or reload, a load, his own
undo — says nothing of moves the room already held; their keys are kept so a later replay does not say them either. The
hand's own `canvas_look` does not mark a move of another's marks; it said whose in its reply to the move.

**`canvas_look` for notes.** The regions are listed in **the outline's reading order** (`regionOutline`: top to
bottom, left to right, a region under the smaller one that holds it — *inside “Monday”*), each with what it holds, then
a line saying how many things stand in no region; **each mark says the region it stands in** (the smallest that holds
it); and **handwriting is listed a line at a time in reading order** (`writingLinesIn`, the line `Read the board`
reads) — `writing · <ids> · reads “…” · at x,y w×h · in “Monday”`, or *unread — canvas_see these marks, then
canvas_transcribe each*, a line partly read said *(2 of 3 marks read)*. Derived each look, nothing logged.

**"With Claude" on dyna.ink** (`24-relay.js`, pure, `node --test Demos/surface/24-relay.test.mjs`): the Live pane's
*with Claude* defaults to `https://relay.dyna.ink` when the page's hostname is `dyna.ink` or ends `.dyna.ink`
(`claudeRelayFor`; `notdyna.ink` and `dyna.ink.evil.com` are not), and to `http://127.0.0.1:8020` everywhere else; a
relay typed in the pane wins. The room's key stays the page address's `?key=` (`openLive`, unchanged) and is never
held, read or said by the fragment. **A hosted relay would have refused the seat** — `whyNoSeat` accepted only a relay
on this machine — so the product's own relay, exactly `https://relay.dyna.ink` and nothing a key or a login is in,
is accepted too (`ownRelay`); the seat's locality is then `hosted`, as `providerLocality` says, and any other relay
on another machine is refused as before. **John's decision, 2 Oct 2026: *"accept the hosted"*** — the briefs a seat parks are log lines of the room the
relay already carries, so this sends nothing the room did not.

### The shard's hand, and the model seat (SHARD-3D-PUSH-2 G5)

> `dynaink-3d/mcp.mjs` (the server), `dynaink-3d/src/room.ts` (the transport and
> the parked brief), `src/models.ts` (`joinHand`), `dynaink-3d/mcp-smoke.mjs`
> (the stdio test, in CI), `.mcp.json` (`dynaink-3d`).

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
(`dynaink-3d/fixtures/seat-before-ids.mm.log`).

**A hull seen from one standpoint asks how deep** (L2c, `dynaink-3d/src/depth.ts`).
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

### The canvas's seat: Claude Code as the model (V1-PLAN J4)

> `core/src/participants/seat.ts` (the seat, the brief, the plane
> read for both sides), `Demos/surface/24-seat.js` (the pane, *with Claude*),
> `canvas_pending` and `canvas_answer` in `Demos/mcp.mjs`,
> `Demos/seat-watch.mjs` (the watcher), `e2e/seat.mjs` (the gate's `seat`
> scenario), and the seat's cases in `Demos/mcp-smoke.mjs`.

John asked whether *Read the writing* and *What is this?* could come straight
back to the Claude Code session he is talking to, over MCP, instead of going
out to an HTTP endpoint. The shard answered that for 3D (above); this is the
canvas's answer, in core so the page, the hand, the watcher and the tests read
one definition of it. **The seat is a model, and that is the whole of it**
(`createSeatParticipant`): an agent participant with an injected transport, so
the same prompts, the same parsers and the same `propose` channel — held,
attributed, never blessed. The transport **parks** the question in the live
room as a brief: an answer on the explanation plane whose question is `brief`,
about the marks the call names, carrying what was asked in one line (*what is
this*, *read the writing*, *ask: …*, *build: …*), the contract (the system
message, verbatim) and the question (the user message; a picture is said to be
there and never put in the log — the hand draws the ink of the brief's marks).
**The pairing is the brief node's own id** (L2a): the reply is an answer whose
question IS that id, about the ids the brief's own `about` edges name. Every
hand derives the same id, and the hand that answers — another sitting — names
nothing it did not read off the brief. A reply settles its caller the moment
the session holds it, a merged line included; a refusal (`{"refuse": …}`) is
said, *claude would not: …*; a brief given up on — Esc, *withdraw* in the pane,
ten minutes unanswered (`SEAT_WAIT_MS`) — is taken back, undone while it is
still this hand's last act and erased after, so no hand answers a question
nobody waits on; one undone by the hand, or on a board left, settles with the
reason. `seatBriefs` and `pendingBriefs` read the plane for the page, the hand
and the watcher alike, and `isSeatTraffic` is what a surface leaves off its
cards and its minimap: the brief is a model at work, shown working beside its
marks, and the reply becomes the readings, the transcript or the answer card.
Nothing is sent to any host but the room's relay, and the seat holds no key.

**On the page** (`24-seat.js`) the models pane leads with *Claude Code*. In a
room where a hand that answers at the seat is heard — within the minute, by
the store's presence: `LiveStoreOptions.seat` puts a flag on every line such a
hand writes about itself, never on a copy it hands on, and `LiveStore.here()`
is the beat a quiet hand sends — it is *Claude Code — in this room*, one tap.
With no room, a room between tabs, or a relay on another machine, one sentence
says what to do instead. The Live pane's *with Claude* is the room and the seat
in one act — room `claude` through the relay typed there, else `:8020` — and
says *Claude is here and will read for you*; when Claude's hand is not there
yet it says so, and takes the seat the moment the hand is heard. Seated, it
joins through `join` like any model (`join(config, pick, made)`), stands at the
front of `agents`, and is the reader while seated (`readers`, 06); a brief is
sent the moment it is parked, and Esc reaches it. The door moved under
*advanced*.

**The hand** (`Demos/mcp.mjs`): `canvas_pending` lists the briefs waiting —
each with its key, what was asked, the marks with their ids, the contract, the
brief, how to answer, and for a read the ink as a PNG, drawn as `canvas_see`
draws it; `canvas_answer {key, reply}` — the contract's JSON, an array or an
object, or prose for a question — or `{key, refuse}` answers one, by the key
exactly as printed. The reply is checked first with the parser the page will
read it with (`parseReadings`, `parseTranscripts`, `parseFill` …), and one the
page could not read is said and never sent. `canvas_look` says each waiting
brief in a line and never prints its prompt.

**Straight back to this session.** An MCP server cannot speak first: a session
learns a brief is waiting only when it asks. So `node Demos/seat-watch.mjs`
(room `claude`, relay `http://127.0.0.1:8020`; `MM_ROOM`/`MM_RELAY` or
`--room`/`--relay`) is a silent reader — no hello, no log, no presence — that
prints one line per brief parked, and nothing else — `brief <key> · what is
this · about … · from john · room claude — canvas_pending reads it,
canvas_answer answers it`. To take the seat from a Claude Code session:

1. The session's `dynaink` MCP server must be the `Demos/mcp.mjs` that has
   `canvas_pending` and `canvas_answer`. A server's tools are read when it
   starts, so after pulling this, restart it — `/mcp` → `dynaink` →
   reconnect, or a new session. Its tools are `mcp__dynaink__canvas_*` (and the
   3D hand's `mcp__dynaink-3d__space_*`); a session begun before the rename
   (RENAME-PLAN N3d) holds them under the old server names until it reconnects. Until then, run `mcp.mjs` from the shell as
   *The MCP hand* says (its stdin a `tail -f` on a command file): the same eleven
   tools, and the page sees that process as the seat's hand.
2. Put the watcher under the Monitor tool: `node Demos/seat-watch.mjs`. Each
   line it prints is a brief waiting — the session is woken by it.
3. On each line: `canvas_pending`, then `canvas_answer` in the contract it
   printed (What is this?: `[{"label","confidence","reasoning"}]`; Read the
   writing: `[{"text","confidence"}]`; a question: prose). Or refuse.

John, meanwhile: the canvas at `?live=claude&relay=http://127.0.0.1:8020` (or
the live tile → *with Claude*), and *Claude Code — in this room* in the models
pane. The gate's `seat` scenario drives all of it with no model: a relay of its
own on a free port — never `:8020`, where a room of John's may be; a request
there is refused and counted — `mcp.mjs` as the answerer over stdio, and the
watcher beside it.

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

**On the board it is a caption** — inside the mark when the mark is a closed
form the words fit in (D3, words inside symbols, 29 Sep 2026; `labelInside` in
`08-render.js`: centred, the whole box the words fill inside the clean form the
mark holds or its own closed ink, so a diamond and a circle take fewer words
than a box), else beside it. Beside: the word is drawn above
the top edge, above an artifact's name when that shows — in the ink's own
colour (the maker's, from the same tokens in either theme), at a size in the
board's units: the caption rule of `13-kinds.js`, so it scales with the
drawing it names, never held at screen size (`LABEL_PX` on the screen the mark
was drawn on — its stroke's scale). Who put it there shows only while the hand
points at the mark; erasing the mark takes the label, and undo brings both.

**A person labels from the field** (V1-PLAN L2e). With marks held, `label:
word` is a prefix of the pure reader, and the line says before Enter what the
word will go on — `↵ write “inlet” on it`, *on each of your 3 marks*, *on
yours, not the mark fern made*, or, quietly, *no words written — fern made this
mark*. The row offers it too, as *Write “…” on it* beside the naming offer:
under writing that has been read (the reading that takes the word as the name
stands above it; the label goes on the marks held with the writing, or, with
nothing else held, on the writing itself as a caption), and for a word typed
(`typedWord`: *Name it “…”* and *Write “…” on it*, the pair together where both act and differ; `label:`
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

> `core/src/frames/frame.ts`; `Demos/surface/16-frames.js`.

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

### Pictures: kept, drawn and traced on request (v8 WP-9a; PLAN-IPAD-NOTES I1, 1 Oct 2026)

> `core/src/kinds/picture.ts` (`isPictureKind`, `pictureOf`, `isAssetRef`),
> `tools/trace.ts`, `image/trace.ts` — `trace(bitmap)`; the surface's
> `Demos/surface/17-assets.js` (pure, `node --test Demos/surface/17-assets.test.mjs`)
> and `18-images.js` (the board out is `18-out.js`'s); e2e 69–69k, `keep`'s P and `boards`' N20.

**A picture is kept and drawn.** Its pixels used to be a blob URL in memory — gone on
reload, in no log, never painted on the board (an image artifact is not live). Now:

- **The asset store** (`mm-assets`, IndexedDB beside the board journal, `18-images.js`):
  `assets` (the bytes, `ArrayBuffer`) and `info` (hash, time, size, mime, w, h) keyed by
  **`sha256:` and 64 hex** of the bytes kept — `crypto.subtle`, or plain code
  (`sha256Hex`, 17-assets.js) where the page is not a secure context — so the same photo
  brought in twice is one asset. **Order is the safety**: the bytes are committed (their
  own transaction, strict durability) *before* the event exists, and the event goes to the
  board's journal in the task that makes it, so a kill leaves no event naming bytes that
  were not kept (`assets.pending` is what is stored and not yet named; `keep`'s P records
  kill right after and during an import). With no IndexedDB the bytes are held by the page
  and the line says so.
- **The event** names, never carries: `import { kind: 'jpg' | 'png' | 'webp', asset,
  mime, w, h, name, path, bounds }` (`SessionEvent`'s `import`, `session.ts`). A picture has
  **no code** — an `import` with an `asset` and no `code` is held; the code rep carries
  `asset`, `mime`, `w`, `h` (read, never trusted: an asset that is not `sha256:…`, a size
  that is not a positive number and a mime that is not an image are left out), and
  `pictureOf(node)` reads them. **A version-1 log's picture** (a path and an empty code,
  no asset) replays as it always did, an artifact that draws its name. `webp` joins `png`
  and `jpg` in the closed kinds table; a picture is never live (`isPictureKind`).
  The identity of a picture is its asset; its **path** (`imports/<name>.<kept
  extension>`, `-2`, `-3` … for a name already on the board — cameras call every file
  `image.jpg`) is a label.
- **On the way in** (`importPictures(files, { view?, at? })`): decoded in a **Worker**
  where the browser has `OffscreenCanvas` (its source is a string, taking `fitLongSide`
  from the closure by its own source), the main thread otherwise; **EXIF orientation
  honoured** (`createImageBitmap`'s `imageOrientation: 'from-image'`, tried without where
  a browser refuses the option); the **long side held to 2,560 px** (`ASSET_LONG_SIDE`, the
  original not kept — an option for later); kept as **JPEG, WebP where clearly smaller,
  PNG where it has transparency** (`pictureFormat`); every `ImageBitmap` closed. **One
  file at a time**, picks queued; a pick is **laid out in a grid in the view**
  (`pictureCells`, `fitInCell`: cells depend on the count and the view, never on the
  pictures, so each is placed the moment it is kept; `clearShift` moves a grid clear of
  what is on the board — a second picture never lands on the first — and the view goes to
  it when it left the screen), the status line saying *importing 3 of 10 pictures*. A
  picture is **not traced on import**.
- **Drawn on the board, under the ink** (`08-render.js`, `drawPicture`): a picture artifact
  with an asset is painted on the canvas — not an iframe, so the live budget of twelve is
  none of its business — **first**, before any stroke, culled to the screen with the rest
  of the paint (R4c), a held one drawn where a drag takes it, turned by its `rotation`. A
  figure wears its chrome only while pointed at. Decoded bitmaps are cached **by asset**
  (`pictureBitmap`): a **thumbnail** while the screen shows the picture small, whole once
  shown large (`pictureTier`), read from the store and decoded off the paint (a repaint when
  one lands), **closed** when the decoded pictures cost more than `DECODED_BUDGET_PX`
  (`evictPlan`: least recently drawn first, never one in the paint just made) or have not
  been drawn for twenty seconds. An asset this browser does not hold (a log from elsewhere)
  draws its plate and is `missing` in `mm.pictureState()`. **Pictures are moved, scaled and
  turned as themselves**: a picture has no ink of its own, so `manipulableOf` and
  `markFrameOf` (`session/manipulate.ts`) take it as a mark (an artifact's members move with
  it as before). A loop round ink on a picture takes the picture too — it is content inside
  the loop (e2e 24b moves it aside first); whether that should differ is open.
- **Kept with the board**: a duplicate's events name the same assets (nothing copied); the
  trash keeps them while a board can be restored; **emptying the trash collects the assets
  no board uses** (`collectAssets`, called by `emptyTrash`, 17-folder.js; every board the
  browser keeps is read, the trash's included, and a board that cannot be read stops the
  whole collection — never on a guess) — except an asset stored in the last
  `ASSET_GRACE_MS` (another tab may be between its bytes and its event) or in flight. An
  import undone leaves its bytes until then.
- **Inputs** (`session-engine.html`): the *import* tile opens a pane — *photos*
  (`accept="image/*,.svg"`, `multiple`, no `capture`), *camera* (`capture="environment"`,
  one) and *other files* — because one input asking for both may open the camera alone. A
  drop lands at the drop point; **a paste anywhere on the page** is taken unless it is
  meant for a text field.
- **In a room, and the MCP hand** (A1; *A picture in a room*, under *The MCP hand*): the bytes
  go to the room's relay by their hash before the event naming them is sent, and a hand that merges
  the event fetches them into its own asset store; `canvas_look` says *a picture holiday.jpg
  2560×1920* and whether the room holds its pixels, `canvas_see` draws them under the ink, and
  `canvas_import` puts one on the board.

**Out and back whole** (PLAN-IPAD-NOTES I4; `Demos/surface/17-bundle.js` — pure, `node --test
Demos/surface/17-bundle.test.mjs`, in CI — and `18-out.js`, the adapter; e2e 70–70i, `boards`' N22–N22d;
`format.ts`'s optional header field). **The bundle is a ZIP**, `<board>.dyna.zip`, written by hand with its CRC
(store-only) and read the same way, deflate included: a zip is what the iPad's Files app, Mail and AirDrop know,
one tap in Files shows `board.jsonl` and the pictures as files, anything can unzip it with no dyna.ink, and a
single JSONL with base64 pictures is a third larger and opens in nothing. It holds `board.jsonl` — the version 1
log, its header saying `assets: n` when pictures are carried (`LogHeader.assets`, read not trusted; a version 1
reader without it is unchanged) — and `assets/<sha256>.<ext>`. **Found by its first bytes, never its name**, so a
file renamed, or unzipped and zipped again by hand (a log one folder down, a Mac's `__MACOSX`), still opens. *From
a file…* (`boardFromFile`, `bundleLoad`) stores every picture — its hash checked against its name — BEFORE the
board's events land, then makes the board as for a log; a picture whose bytes do not match, or whose own checksum
is off, is left out and said by name while the board and the sound pictures open; a file that is cut off, smashed or
no zip, or a `board.jsonl` that is damaged, is a sentence through the pane and no board (`zipRead` never throws).
**A bare `.jsonl` still opens**, and says once, in the pane and the status line, which pictures it names that this
device does not hold (*2 pictures are named in this log but are not in it — they stand as their names; export
“board + pictures”, a .zip, to carry them*); the log export says the same of its own pictures. **board.svg**
(`boardSvg`, in layers) draws under the ink, in board order: each picture an `<image>` data URL at its bounds
(turned as the board turns it; a picture this device lacks is a dashed plate with its name), each SVG figure as an
`<image>` of its own text — an image never runs a script, so a figure's script cannot run from the file — and
writing as `<text>` (a caption fitted to its box, a document clipped), `xlink:href` for every renderer. **board.png**
and **board.pdf** are drawn on an offscreen canvas from the same layers (`renderBoard`): the pictures from their own
bytes, the rest as one SVG over them, on paper — never the viewport, so the view never changes them. The png is
twice the marks' size held to 8,192 a side and 16 million pixels (an iPad's canvas stops near there; said when
scaled, `pngPlan`); the pdf is one page, Letter or A4 by language, turned the way the board lies, the board at no
more than its drawn size (`pdfPlan`, said as a percentage), the picture at 200 dpi and ≤ 3,000 px, embedded as a
Flate image of its RGB (a `JPEG` where the browser cannot compress), the xref exact (`pdfWrite`, read back with
pypdf strict). **What is exported is what is held, else the board**, said in the status line; pages and programs are
counted as not drawn. Moved here from `18-images.js`: the export pane, `svgOf`, `downloadBlob`.

**Tracing is an offer** (`tools/trace.ts`: *Trace into ink*, tool `trace`, host act `trace`,
appended last in `builtin.ts`): on a picture held alone with an asset, `traceFrom`
(18-images.js) reads the pixels again from the store, traces them as below at a long side of
`IMPORT_MAX_PX` and writes **one `import` event of strokes** over the picture's own box inside
the tool's stamp — one act, one undo — and the picture stays. A photo is no longer ink on
arrival (a camera photo was ~3,900 strokes). *To do*: filter to what the shape rung reads with
confidence and offer it by default for a scan of a drawing (PLAN-IPAD-NOTES §5.5); folder
discovery still imports a folder's pictures without an asset (they draw their name).

**The trace itself** (`image/trace.ts`): a photographed sketch is pixels, not marks. `trace`
takes an RGBA bitmap
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
dropped). An SVG or any file of a known kind becomes an artifact of its kind
(an SVG in a pick takes its cell). *Export…* writes the board as SVG or PNG
or the session as its log (pictures are not in them yet — I4), and the panel saves any
artifact's code.

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
`strokeFor` sizes an arrow's barb from its shaft (S2): about 40 units to a
shaft of 1,200, then a thirtieth of it — inside the fortieth to a fifth a
clean arrow keeps — so a long arrow is not a sliver of a head. The vocabulary
is closed on purpose:
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

### core (the engine, `@dynaink/core` — start here for recognition/engine work)

```bash
cd core
npm install
npm test         # full suite incl. the canonical-loop scenario (keep green)
npm run typecheck
npm run build    # ESM + d.ts → dist/
npm run build:browser  # IIFE bundle; a copy is committed at Demos/dynaink-core.browser.js
npm run build:node     # ESM bundle for Node; a copy is committed at Demos/dynaink-core.node.mjs
cp dist/dynaink-core.browser.js dist/dynaink-core.node.mjs ../Demos/
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
node scripts/release.mjs 0.2.0 --dry-run   # the whole release printed; nothing written
node scripts/release.mjs 0.2.0             # one commit, one annotated tag, dist/release/dynaink-0.2.0.html — never a push
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
`gh release create v<version> dist/release/dynaink-<version>.html --title "dyna.ink <version>" --notes-from-tag`
(0.1.0, the last MetaMedium, was `metamedium-0.1.0.html`, titled "MetaMedium 0.1.0").
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

> **Source of truth: `brand/tokens.css`.** Every dyna.ink colour, face, size
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
| `lens-canvas/`, `manim-explainer/`, `playground.html` | `#020a12` sea-deep · cyan `#7dd8f7` · gold `#d4af37` · JetBrains Mono | **left alone** — this is johnhanacek.com's language, not dyna.ink's |

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
- **One core, many surfaces** — recognition logic belongs in `core`; demos consume builds
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
   `core/src/*.ts` instead. The one intentional mirror is
   `skills/dynaink-code/skill.md`, which Claude Code loads standalone —
   re-verify it against the engine when recognition changes
5. The legacy monoliths (`doodle2-canvas.html`, `metadoodle1.html`,
   `Web App Skeleton/src/core/`) still carry their own diverged recognition
   copies. Read the file you're editing; land new logic in core

# Status, history and the plans

> Moved whole from `CLAUDE.md` (10 Nov 2026), which keeps a short summary. Newest first; each paragraph is dated.

**See `MVP.md`** for the product being built — *ink over living artifacts*.
**See `KEYFRAMES.md`** for the three rungs every mark climbs
(shape → diagram-shape → code), each with a closed vocabulary — **built**.
**See `ROADMAP.md`** for status and the August 2026 accounting.
**See `V1-SPEC.md`** for v1 as re-specced on 2 Oct 2026 — *the diagrammatic
notebook that runs*. It supersedes `V1-PLAN.md` §0 and §11; its units (§6) and
ladder (§7) are what is built next, each phase ending in a release on John's word.
`ARCHITECTURE-v7-PARTICIPANTS-AND-TIERS.md` is the active engine plan; MVP.md
absorbs and raises its Stage D.

**23 Oct 2026: the multiuser milestone** (the branch `claude/loving-maxwell-zagdqy`, from `master` at 6f541ef) — the
demo tied up as a web app several people use at once, from any browser. **Rooms anyone can open**: *Share this board*
opens a room on the relay (`POST /rooms`, `cloudflare/relay/src/mint.mjs`), *Copy invite link* carries its key after
`#`, a name is claimed by its hand, and what a hand sends is sent again until the room takes it
(`core/src/store/live.ts`, `Demos/surface/24-room.js`; *Rooms anyone can open*, under *Live logs*). **dyna.ink's own
models, no key in any browser**: Cloudflare's Clef-flash decides through the relay's `/decide`, and a writer and a
reader answer through its `/ai/v1`, each asked last (`cloudflare/relay/src/ai.mjs`, `core/src/llm/decide-systemone.ts`;
*dyna.ink's own models*, under *Tiered LLM Interpretation*). **Code from another hand** plays only after *Play it
here*, its worker sealed in an opaque-origin frame (*Living artifacts*). **The deploy waits for CI** on `master`'s tip,
and the gate's `prod` scenario runs the app as production serves it (*One app address*). And a UX pass: panes that
fit, one Escape ladder, a first run on every screen (`Demos/surface/27-first.js`), the person's words held by
`scripts/words.test.mjs`. CI's core and shard jobs and the browser gate on Chromium pass at ca89381; nothing has
reached Cloudflare, dyna.ink or relay.dyna.ink, and WebKit has not run it — each paragraph says what is unverified.
**24 Oct 2026: a review of the whole change found seventeen defects, three of them blockers, and a fix pass settled
all seventeen** (merged at 834c09a; the browser gate's default run passing at 1f8b1ff, and its `canvas`, `room`, `ux`,
`security` and `models` scenarios again at 774e228): what the relay keeps is
counted across rooms, a program's frame reads no room's key and is stopped when it loads another page, and another
hand's new version of a program played here waits for *Play it here* — each under the paragraph it changed.
**Then a storage pass** (merged at 91e8442): what the relay keeps is counted in what keeping
it costs — UTF-8 bytes and the storage rows it is kept in — an IPv6 caller by the /56 that holds it as well as its
/64, a caller's share of the models' day is a thirty-second of each route's budget, and a frame another hand made
that wires a program played here waits for *Play it here* too (*Rooms anyone can open*, *dyna.ink's own models*,
*Living artifacts*). What comes next is `NEW-REPO-PLAN.md`: a new repository, `dyna.ink`, seeded from this milestone.

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
(*Pen, finger and palm*, below); WebKit runs a scenario of its own,
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
text as an element, and an installable shell, each with its tests in core and
the browser e2e. `ROADMAP.md` carries the honest gaps. Before v8:
**the MVP loop runs end to end.** Draw boxes on an infinite canvas,
circle them, cross with a command mark *you taught the system*, prompt them into
a living page that renders in the canvas with your ink still outlining its
divs — then draw on that page and the ink addresses the regions underneath it.
Scratch anything out to erase. `Demos/session-engine.html` is the surface;
`Demos/session-engine.e2e.js` drives the loop through the real UI — e2e 1 to 71: a page and a flowchart, handwriting, the model drawing, the field and its corrections, the worker and the tank, frames, the folder, pictures, text, a live room and its ids, hold by long-press, labels, gestures per hand, what a paint reads, the field's offers (B1's golden record, e2e 49), context (50), library packs (51), handles (52), bindings that follow (53), the user surface (54–61), Mermaid out and in (62–63), maths on a page (64), examples (65), routing (66), notations on the surface (67), the garment piece (68), pictures kept (69), out and back whole (70) and regions (71) — headless as the gate's `canvas` scenario (`node e2e/run.mjs`, which CI runs). By hand, run it **in its own tab on its own origin** (`http://127.0.0.1:8010/…?fresh=1&nosw=1` — `__setup` refuses any other URL: it replaces `fetch` with a stub, joins a stub model named `e2e-stub`, and wipes the origin's saved board), start it with `__setup(); __scenario().then(r => window.__R = r)` and read `__R` when it lands.
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
- `NEW-REPO-PLAN.md` — **starting the dyna.ink repository from this milestone, 23 Oct 2026**: the multiuser
  milestone (§1), John's decisions (§2), what is carried and what stays, the history (`master`'s, and one commit
  that prunes), the procedure, John's Cloudflare steps, the cutover and the first units there. It replaces
  RENAME-PLAN H1's transfer: the old repository stays where it is and keeps serving the old address
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

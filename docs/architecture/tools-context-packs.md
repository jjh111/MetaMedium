# Tools, context and library packs

> Part of the engineering reference that `CLAUDE.md` indexes. The code is the truth; this says why it is shaped so.

## Tools: what the field affords, one contract (V1-PLAN §2.1, B1)

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
built-ins (the last five *Which is it?*, I7, *Trace into ink*, I1, *Make it a region*, I5, *Notes like this*, I9 — typed, only with a semantic seat held — and *Which diagram is this?*, offered only with a decider seated)
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

## Context: what stands beside the hand lifts, and the top holds (V1-PLAN §2.2, B2)

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

## Library packs: premade content, used by an event (V1-PLAN §2.3, B3)

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

## Why? — the canvas says why, with no model (10 Nov 2026)

> `core/src/tools/why.ts` (`WHY`, `whyOf`, `shapesInWords`, `linksInWords`), `why.test.ts`; the card in
> `Demos/surface/08-render.js`; the after-act in `09-palette.js`.

The headline loop ends *ask why and get grounded reasoning*, and the only door was *What is this?*, which asks a
model: with none joined, *why* was kept for one. The engine already held the answer. *Why?* is a tier 1 tool,
registered last: `whyOf(scope)` writes sentences a person can check against the drawing — what the marks matched
and how the match was measured (the signature comparison's own reasoning, in words, and whose definition it was:
*the molecule you named*, *the Basics pack's molecule*, *a drawing you said was one*); what is there (*three
circles and two lines — a line joins a circle, four times*: the group's own structural signature, each pair of
kinds said the one way that says most, *near* only when nothing stronger holds); the diagram it reads as, above
`NOTATION_FLOOR`; the firmest concept with its reasoning; for one mark alone, every reading the shape rung
holds with its reason, plural; and what another voice read, attributed. No id, no tier, no threshold.

It is a pill where there is a reading to explain (a match, a diagram, a concept, another voice) and typed
(*why*) for bare shapes; never for held marks that are all unread writing, which keep their one option (W2).
Taking it is `session.answer` in the engine's name — one act, one undo — so the answer is a card beside the
marks like any other, erasable, and never a reading: nothing is named, blessed or changed. The card says *the
canvas*, not *engine*. Found with it: a card stopped after six lines with nothing to show for the rest; it now
keeps the writer's line breaks, holds `CARD_MAX_LINES`, and ends a cut line with an ellipsis.

And *molecule* is no longer a word for *Show it in 3D* (`tools/intents.ts`): a word that starts an act's word
takes Enter, so typing the headline loop's own name built a 3D model and called the definition *graph in 3d*.
`why.test.ts` holds that neither *bubble* nor *molecule* names any act.

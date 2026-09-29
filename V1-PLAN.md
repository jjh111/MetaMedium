# MetaMedium v1 — the whole platform, ready for true use

*26 September 2026. The plan that brings every part of the platform together
into one product two people can use every day for real work, and the order
the agents build it in. It absorbs `DIRECTOR-PLAN-W2.md` (whose units L, M
and J keep their detail there), builds on `MATHS-PLAN.md` for maths, and on
`CONTROL-POINTS-PLAN.md` for handles and bindings. Read §0 and §1 for what
v1 is; §2–§7 for the design of each part; §8 for the ladder; §9 for the
units; §10 for how the agents run; §11 for when it ships.*

---

## 0. What v1 is

**A drawing surface that reads what you draw, lets you name and reuse it,
and turns it into diagrams, pages, programs and maths — with models as
optional helpers, never as gatekeepers — ready for daily work without a
developer at hand.** It is for two people first: John (diagrams, interfaces,
research figures, sketches in space) and a family member drafting garment
patterns (measurements, formulas, pieces cut to size).

"True use" is ten scenarios. Each one is scripted in the browser gate and
walked by hand before v1 ships.

| # | Scenario | What must happen |
|---|---|---|
| A1 | **Flowchart** | Draw process boxes, a decision and arrows by hand. It reads as a flowchart; clean it; connectors bind and follow a moved box; export Mermaid; the Mermaid stands on the board as a live diagram; edit its text and import it back as drawn marks |
| A2 | **UML class** | Two classes with compartments and an inheritance arrow read as a class diagram and export as Mermaid |
| A3 | **Sequence** | Three lifelines and four messages export as a sequence diagram, in order |
| A4 | **Pattern** | A pattern page's steps are checked, the right triangle answered, a measurement changed and everything re-derived, the piece exported at true size |
| A5 | **Page and program** | Circled boxes become a page; circles joined by lines stand in 3D |
| A6 | **Notes** | Handwriting becomes text, folds back when struck and rewritten, and labels what it sits beside |
| A7 | **Two hands** | John and the MCP hand in one room: sentences and readings land on the right marks after undos and reloads |
| A8 | **Boards** | Several named boards; switch, reload, export, import; nothing lost |
| A9 | **No model** | Everything above except the model's own words works with no model joined, and says what a model would add |
| A10 | **Pencil** | A1 and A4 by hand on an iPad with a pencil |

**What v1 is not.** No new rung. No third surface. No general CAD solver.
No accounts or cloud sync (a folder, a repository and a live room are the
ways to share). No phone-first layout (a tablet, yes). No model does
arithmetic, and no model commits anything.

## 1. The platform as layers

Maths is a tool; so are layout, 3D, tracing and Mermaid. Models come in
layers by the kind of judgment they give. v1 makes that explicit:

| Layer | What it is | Kind of knowing | Where |
|---|---|---|---|
| **Ink and the log** | events per hand, ids per hand, merge, four stores (browser, folder, repository, live room) | the source | `store/`, `session/` |
| **Readings** (tier 0) | the shape rung, words, writing | measured, closed vocabularies | `recognition.ts`, `session/words.ts` |
| **The instant library** (tier 1) | relations, roles, concepts, clean forms, magnets, signatures and definitions, the structure | computed, no wait | `relate/`, `diagram/`, `concepts/`, `session/` |
| **Tools** (tier 1, modular) | one contract each: what it reads, what it offers, what taking an offer writes — tidy, clean, structure, 3D, trace, frames, text, **maths**, **notations**, **Mermaid**, **routing**, **to scale** | computed, no wait | new `tools/` registry (B1) |
| **Seats** (tier 1½) | decide, extract, read, resemble — typed answers with probabilities, asked when the engine's own ranking is flat or a deliberate act asks | learned judgment, fast | `participants/decide.ts` and siblings |
| **Writers** (tier 2) | models, local or hosted: pages, programs, briefs, drawings, answers | generation | `participants/agent.ts` |
| **Context** (across all) | which notations, concepts and tools are active near the hand, and what was just taken there | derived | new `context/` (B2) |
| **Library packs** (across all) | shipped definitions, notations, concepts, programs — pre-taught by the command mark's own mechanism | content | new `packs/` (B3) |
| **Surfaces and doors** | the canvas and the shard; the pen, the field, MCP (hand and seat), live rooms | — | `Demos/`, `shard-3d/` |

**The rules between layers.** A layer proposes to the one above and never
commits for it. Tools are *adjacent*: any tool may read another's readings
(maths reads the dimensions a notation's labels carry), but a tool never
performs another's act — composition happens through the log and through
readings. Context lifts; it never hides. A seat selects among candidates it
was given; a writer writes; only a human blesses. Everything derived stays
out of the log.

## 2. The three new contracts

### 2.1 A tool

```ts
interface Tool {
  id: string;                 // 'maths', 'notation:flowchart', 'mermaid', 'tidy' …
  name: string;               // for people
  describe(): string;         // one line: for HERE, the pane and a brief
  reads?(scope: ToolScope): ToolReading[];               // derived, plural, each with a confidence and a reason
  offers(scope: ToolScope, ctx: Context): Offer[];       // what it affords here, each with a base likelihood and a reason
  take(offer: Offer, scope: ToolScope, session: Session, at: number): void;  // writes events; undoable
}
interface Offer { key: string; label: string; reason: string; base: number; tool: string; asks?: 'seat' | 'model' }
```

A registry (`registerTool`, `toolsFor(scope, ctx)`) replaces the scattered
lists: the tier-1 library entries, the concepts' conversions and the
palette's hand-built pills all become offers from tools. The field's
affordance row is `offersFor(scope, ctx)` ranked by §2.2. A new tool is one
file and one registration line. Events a tool writes carry its id, so the
log says which tool did what, and context can read what was just taken.

### 2.2 Context — conceptual adjacency and the steady top offer

```ts
interface Context {
  scopeIds: string[];
  notations: { id: string; weight: number; reason: string }[]; // 'flowchart' 0.8 — "4 of the 6 marks nearby read as flowchart symbols"
  concepts:  { name: string; weight: number }[];
  recent:    { tool: string; offer: string; at: number }[];     // what the hand just took here, read from the log
}
contextAt(state, ids | point): Context
rank(items, ctx): items with score and because[]
```

Five rules:
1. **A lift, never a filter.** Context multiplies a score by a bounded
   factor; nothing is removed and no reading is silenced. Far from any
   context there is no lift at all.
2. **Every lift says why**: *first because it sits beside a flowchart*.
3. **The steady top.** In one context the top offer changes only when
   another beats it by a margin — hysteresis — so the suggestion John
   reaches for stays where the hand expects it while the hand works nearby.
4. **Use is learned per context.** The palette already lifts offers by how
   often they are used (`uses` in `09-palette.js`, one global count per
   device); v1 keys that count by context too, with the global count as the
   fallback.
5. **Derived only.** Context is computed from the board and the log; it
   writes nothing.

The same `rank` orders the reading under a new mark, the field's rows and
the candidates a seat is asked about, so the three never disagree.

### 2.3 A library pack

Premade content arrives the way the command mark does: *shipped
pre-taught*, by the same mechanism a user's own teaching uses.

```jsonc
{ "id": "flowchart", "version": 1, "name": "Flowchart", "notation": "flowchart",
  "describes": "processes, decisions and the flows between them",
  "definitions": [ { "name": "decision", "shapes": [ /* DrawnShape samples */ ], "role": "node",
                     "ports": "vertices", "export": { "mermaid": "{label}" } } ],
  "connectors":  [ { "name": "flow", "head": "arrow", "export": { "mermaid": "-->" } } ] }
```

- **A board says which packs it uses**: a `use { pack: 'flowchart@1' }`
  event, so a board replays with the same library everywhere. Pack content
  is immutable per version; an unknown pack on replay is said plainly and
  the board still loads.
- **Pack definitions are attributed** to `library:<pack>`, rank below the
  user's own definitions on a tie, can be corrected with *Not a …* like any
  other, and are never written onto the board as files.
- **Two kinds of entry.** A *definition* is matched by structural signature,
  exactly as taught ones are. A *notation* needs what signatures cannot
  see — a diamond is a rectangle turned 45°, and the shape rung is
  deliberately blind to rotation; a hollow triangle at a line's end is an
  arrowhead of a kind — so notations are code (`src/notations/<id>.ts`,
  predicates over shapes, measures, relations and roles, like concepts)
  with their content in the pack.
- **Every pack has a bench**: its own samples read as its definitions, and
  nothing in the drawing corpus falsely reads as them — the
  `commandmark.bench.test.ts` pattern.

## 3. Diagrams

A notation sits **on top of the diagram rung**, the way concepts do: the six
roles stay closed, and a notation says which roles its symbols play.

- **Reading.** *This reads as a flowchart 0.84 — three processes, one
  decision, five flows*, beside *a UML class diagram 0.31*, plural, in the
  field's "what this is" row and the panel's *becomes* row.
- **Symbols.** Flowchart: process, decision (a diamond, from the clean
  form's angle), terminator, data, start and end. UML class: a box with one
  or two lines across it (compartments), the name in the top one. Sequence:
  a lifeline (a box or stick figure over a vertical line), messages as
  horizontal arrows ordered by height. State: rounded states, transitions,
  initial and final dots. ER: entities, relationship diamonds, multiplicities
  written at the ends. Mind map: a central node and branches.
- **Connector kinds**, read from what sits at a line's end (E3): an open
  arrow, a hollow or filled triangle, a hollow or filled diamond. Filled
  means dense ink inside, measured.
- **Mermaid out** (D2): a tool turns the graph (`parse/graph.ts` already
  yields nodes, edges, direction and labels) plus the notation's readings
  into Mermaid text — `flowchart`, `classDiagram`, `sequenceDiagram`,
  `stateDiagram-v2`, `erDiagram`, `mindmap` — and a new `mermaid` kind
  stands it on the board, rendered by mermaid.js inside the `run` sandbox
  (loaded the way three.js is), reporting each node as a part so ink over
  the diagram lands on the node.
- **Mermaid in** (D3): a parser for the subsets v1 exports, a small
  deterministic layered layout, and the result drawn as clean forms bound at
  their ports, so the imported diagram is real ink that reads back as the
  same notation. The round trip is the test.
- **Routing** (D7): connectors re-drawn orthogonally between ports, and
  *tidy the diagram* (tidy's alignment plus routing), the hand's ink faint
  beneath.
- **Export**: SVG (exists), Mermaid, and PlantUML only if John asks.

## 4. Point control and connections

- **Handles on the selected mark** (E1, `CONTROL-POINTS-PLAN.md` P2): one
  selected mark with a clean form shows its handles — the same sites the
  magnets offer. Dragging one writes `reshape { id, handle, to }`; the clean
  form moves, the ink stays beneath, undo drops it. A mark without a clean
  form shows none; nothing is pretended.
- **Bindings follow** (E2, P3): a connector bound to a site re-derives its
  end when the mark it is bound to moves or is reshaped. **Amendment to
  P3:** the re-anchoring is *derived at replay from the bindings*, not
  logged as extra events, because state is a pure function of the log and
  the bindings already are in it; undo of the move restores the arrows by
  itself. The regression decides if a reason to log them appears.
- **Smart connection points** (E3): once a scope reads as a notation, its
  symbols offer that notation's ports — a decision's four vertices, a
  class's sides, a lifeline's whole length, a state's border — through one
  hook beside `magnetSites`. A connector released on a port binds there and
  takes the connector kind its head says.
- **Figures of several strokes** (E3): lines whose ends meet read as one
  figure — three as a triangle, four as a quadrilateral — so a diamond drawn
  in two strokes, or a triangle ruled in three, is one symbol. Maths (M3)
  and notations (D1) share it.

## 5. Maths is a tool

`MATHS-PLAN.md` is the design; its units M1–M5 are in `DIRECTOR-PLAN-W2.md`
§3. In v1 the maths is one tool in the registry: its readings are the sheet's
checks, the dimensions and the solved figures; its offers are `=`, *solve*,
*make it a slider* and *draw it to scale*. Two units join it: **M6**, the
garment pack (pattern piece, grain line, fold line, notch, dart, seam
allowance), and **M7**, true size and printing tiled onto pages.

## 6. The middle layer

Units J1–J3 in `DIRECTOR-PLAN-W2.md` §3, with one addition: every question
a seat is asked carries the Context (§2.2), and the seat's candidates arrive
already ranked by `rank`, so a seat sees what the hand is working in. Seats
are asked by a deliberate act or when the engine's own ranking is flat —
never on a stroke — because a fast call is still a call with a key, a cost
and a privacy boundary.

## 7. Ready for true use

| Need | Today | v1 |
|---|---|---|
| Several boards | one board per browser, or a folder | named boards in a list; new, open, rename, duplicate, delete with undo; folder and repository boards in the same list (R1) |
| A log that lasts | events with no format version | a versioned container for files and a migration path; counter-id logs stay readable (R2) |
| No lost work | the whole log rewritten into browser storage, which has a small quota | an append-only store per board in IndexedDB, flushed on hide; a full quota said out loud with export offered; a test that closes the page mid-stroke and finds every completed stroke (R3) |
| Big boards | budgets for live artifacts only | measured budgets on boards of 500, 2,000 and 5,000 marks — open, replay, draw, read — and whatever index relations need to meet them (R4) |
| A first run | three lines in an empty panel | a starter board built from packs, help as a one-page guide, a shortcut sheet, examples in the boards list (R5) |
| Pencil and tablet | touch draws and pinches | pen draws, fingers pan and zoom, palm ignored while a pen is down, hover from a pencil, the field usable with an on-screen keyboard; a WebKit scenario in the gate, not only a smoke (R6) |
| Deploy and release | the whitepaper on Pages; the surface reachable by path | a stable app address, the offline shell versioned per release, a release script with a changelog, the standalone file attached (R7) |
| One platform | legacy monoliths and a React skeleton beside the core | the monoliths and the skeleton archived behind their old addresses, a docs index of live and historical plans, a README that is a front page (R8) |
| The shard | its own dev server | a build published beside the canvas and opened from it in the same room (R9) |

## 8. The ladder

One main lane runs in order; a second lane is opened only for units that
share no files with the main one (marked ∥). Each phase ends with the whole
suite and the gate green, `master` fast-forwarded and pushed.

| Phase | Units | Done when |
|---|---|---|
| **0. Make week 1 whole** — ✅ done on `w2`, 27 Sep (on `master` when John lands it, L4) | L1 ids that hold · L1b one event, applied once · L2a the shard pairs by id · L2b labels on the board · L2c the shard asks · L2d duplicate Enter, fitAll, the cache measured · L2e a person labels their own ink · L2f an artifact is made by whoever blessed it · L2g a word is made by whoever wrote its letters · L2h gestures are per hand · L3 CI, bundles, docs · and L3's finding, L2i a person is the same person across sittings (27 Sep) · and R4d's, L2j undo is per hand (27 Sep) | every unit week 1 claimed is whole, CI runs what exists (WebKit included), docs say what the code does |
| **0b. A board that holds** (pulled forward by `PERF.md`, 27 Sep) | R3 no lost work · R4b the engine holds 2,000 marks · R4c the surface draws only what changed · R4d a room merges a line, not the board · R4e a brief carries what it is about | nothing is ever lost silently; a 2,000-mark board opens in under 1.5 s, answers a stroke in 16 ms at p95 and draws its reading within 100 ms; a room line costs under 16 ms; the budgets are tests |
| **1. The backbone** — ✅ done on `w2`, 28 Sep | B1 tools · B2 context · B3 packs | a tool is one file; the field ranks by context with reasons; a pack is used by an event and benched |
| **2. Editing** — ✅ done, 28 Sep | E1 handles · E2 bindings follow · E3 ports, heads and figures | a selected mark reshapes by its points; bound arrows follow; notations can declare ports |
| **3. Diagrams** — core of D1–D4, D5 and D6 built, 28–29 Sep; the surfaces next | D1 flowchart · S1 the shape rung holds a diamond, an L and a wide arc · W1 drawing never destroys what it connects · S2 an arrow read where its ink points · D2 Mermaid out · D3 Mermaid in · D4 UML class · D5 sequence and state · D6 ER and mind map · D7 routing · D8 the repair demo | A1–A3 pass in the gate |
| **4. Maths** ∥ after B1 | M1 quantities and expressions · M2 the sheet · M3 figures and dimensions · M4 solving · M5 maths on the board · M6 the garment pack · M7 true size and print | A4 passes in the gate |
| **5. Seats** ∥ | J1 decide on the canvas · J2 extraction, a spike · J3 numerals, an experiment · J4 Claude Code is the canvas's seat (28 Sep) | the seat is measured on fixtures; the spike and the experiment say yes or not yet, with numbers; What is this? and Read the writing reach the Claude Code session and come back |
| **6. Ready for use** | R1 boards · R2 the log format · R3 no lost work · R4 performance · R5 first run · R6 pencil and WebKit · R7 deploy and release · R8 one platform · R9 the shard alongside | A8–A10 pass; budgets met |
| **7. Review and release** | H1 the hand in the gate and QA-v1 · V1 the review of use · V2 its fixes · V3 the whitepaper's v1 figures · V4 v1.0.0 | §11 |

**Dependencies that shape the order.** B1 before anything that offers
(maths, notations, routing). B2 after B1. B3 before D1. E3 before D1 and M3.
D2 before D3. E2 before D7 and D8. M3 before J1. R1–R3 after L1, because they
share the folder and store code L1 changes. H1 after L1. V1 after phases 3,
4 and 6.

## 9. The units

Units L, M and J are specified in `DIRECTOR-PLAN-W2.md` §3; the form below is
the same — what it owns, done means, the test written red first, the
checks, the invariant it is most likely to bend, and the trap.

### Phase 0 — the rest of week 1
**L2a the shard pairs by id** (week 1's U1d). Take the better of the two
attempt branches `auto/w1-U1d*`, rebase onto `w2` after L1, and pass week
1's own checks for U1d (`DIRECTOR-PLAN-W1.md`, on `auto/w1`): the shard names
its log, a brief and its answer pair by node id, `brief:`/`answer:` gone from
every write path, a reader kept for old logs with a test. **L2b labels on the
board** (U2's surface half, `auto/w1-U2-r0920112732`): the label drawn beside
the mark in its ink colour, scaling with the board, in both themes;
`canvas_label`; the smoke extended; erase then undo brings mark and label
back. **L2c the shard asks** (U3, `auto/w1-U3*`): a hull stood on one
silhouette carries a question about the depth it lacks, closed by a second
view or a word, the body re-derived. **L2d** (`auto/w1-U5-r0920130243` and
new work): two Enters on one loop ask once; `fitAll` fits content and lets
cards place themselves; the silhouette cache measured with a number, bounded
only if the number says so. For all four: cherry-pick the attempt's test
first and show it red; delete the losing attempt branch.

**L1b one event, applied once — status, 26 Sep 2026: done on `w2`** —
`7d79018` (red), `ad8f17b`. `mergeLogs` keeps one event per `(origin, seq)`:
the first in merge order, the reader's own log keeping its own copy; events
with no authorship are never folded; two different events under one
authorship keep the first and are said (`onCollision`;
`LiveStore.misnumberings()` in `notices()`, so the canvas, the MCP hand and
the shard all say it with no change of their own; a folder in its own status
line). Every held log (`Demos/recordings/*.json`, `shard-3d/fixtures/*.mm.log`)
replays node for node against the `38daf37` bundle, bare, named and merged,
and mints the same next id (25 of 25). Gate records 28j and 28k fail on the
old bundle (the id listed twice) and pass.

**L2b status, 26 Sep 2026: done on `w2`** — `2d6fc90` (red), `edfc841`,
`15658e3` (red), `894601d`. Harvested from `auto/w1-U2-r0920112732`
(b9b9de1: `canvas_label` and its smoke), adapted to the core half already
here; the drawing redone, because the attempt drew the word in screen-size
type. The label is drawn above its mark in the ink's own colour at 13 units
of the hand's space when the mark was made, so it scales with the board
(13 px at zoom 1, 26 at zoom 2), in both themes; no artifact, file, card or
name; erase takes it and undo brings both. Every reading now says its basis
(`Interpretation.basis`) — the label had been reading as the panel's shape.
The notes' §F too: `canvas_write` takes `place: {in|under|above|right|left:
id}`, and the smoke checks a figure placed `in` the tab's box lies inside it.
Human UI for labelling is not built: the core event takes any participant's
label on its own ink, and the MCP hand is the only door so far.

**L2d, the canvas's half — status, 26 Sep 2026: done on `w2`** —
`295ce6d` (red), `29224d4`. Harvested from `auto/w1-U5-r0920130243`
(e2dea38 and 30b25f4; the WebKit smoke there was already here). Two Enters
80 ms apart on one loop, the stub delayed, bless one artifact and ask once
— the second is refused at the door in `09-palette.js` and says *already
under way*, a revision included (it had asked twice); `09-field.js` and its
test untouched. `fitAll` fits the content and widens once only for cards
drawn outside it; on 36 marks with a card logged twenty thousand units from
where it is drawn, the old union slammed the zoom to 0.08 with every mark off
the free ground, and the new fit is 1.098 with every mark and card inside.
The silhouette cache is the shard's and is not measured here.
Whole suite at the last commit: core 684 in 57 files, typecheck clean, both
bundles equal to a fresh build; relay and field 31; surface in sync; the
canvas MCP smoke and the shard's (573 in 30 files, typecheck clean) all pass;
the gate 367 passed and the one honest skip (canvas 227; shard 120 + 11 + 9);
WebKit smoke 3. The attempt branches are left for the director to delete.

**L2e a person labels their own ink.** Week 1's U2 says *whoever made a
mark can put a word on it*; the event and the MCP hand do, a person on the
canvas cannot. The field reads `label: word` (a new prefix in the pure
reader, with its Node test), the affordance row offers *Label it “…”* beside
*Name it* with tooltips that keep them apart (naming blesses a definition;
labelling creates nothing), and taking it labels each selected mark the
person made, refusing another hand's marks in words. *Red first:* the
reader's test for the prefix and an e2e record labelling from the field.

**L2e status, 26 Sep 2026: done on `w2`** — `fea5e3b` (red), `7fa7f7e`,
`284df79`, `8aa5797`, `765c190`, `626ee58` (CLAUDE.md). `label: word` is a
prefix of the pure reader (`readLabel` in `09-field.js`), and the line says
before Enter what the word will go on — `↵ label it “inlet”`, *on each of
your 3 marks*, *on yours, not the mark fern made*, or quietly *no label —
fern made this mark*, Enter still saying it; the context gains `marks`
(whose ink is held). The row offers *Label it “…”* beside the naming offer:
under read writing, at the head of what it affords (on the marks held with
the writing, or on the writing itself as a caption), and for a typed word as
a pair with *Name it “…”* (`typedWord`, pure; `label:`/`name:` mark one).
Taking it (`labelMarks`, `09-palette.js`) writes one `label` event per mark
the person made, each through the core door; another hand's (or a model's)
are refused in the status line with whose they are. The field closes before
the word is written, so one undo takes one label off; a mark already saying
the word writes nothing. The difference from naming is said in the tooltips
(what each does and does not) and in the reading line while a pill of the
pair is pointed at — no badge, no row, the four core buttons unchanged. No
model is asked; `mcp-smoke.mjs` unchanged. e2e 42–42p. *Found, not changed
(core):* a bless writes no `made-by` edge, so every board reads an artifact
as its own reader's — a label on an artifact is dropped on every other
hand's replay, and another hand may label it at its own door. *Not built:*
taking a label off from the canvas (undo does; the core's empty word has no
door here). Whole suite at the last commit: core 684 in 57 files, typecheck
clean, both bundles equal to a fresh build; relay and field 40; surface in
sync; the canvas MCP smoke and the shard's (573 in 30 files, typecheck
clean) all pass; the gate 384 passed and the one honest skip (canvas 244;
shard 120 + 11 + 9); WebKit smoke 3.

**L2f an artifact is made by whoever blessed it.** Found by L2e: a bless
writes no `made-by` edge, so every board reads an artifact as its own
reader's — in a room the maker's label on her own artifact is dropped when
another hand's board replays her log, and another hand may label it at its
own door. An artifact blessed by a hand is made by that hand on every board
that replays the log, the attribution a stroke gets: its labels follow the
label rule everywhere, the surface says whose it is, and a single-hand board
and every held log replay as before. *Red first:* two hands — A blesses a
group and labels it, B's board replays A's log, B tries to label it — and
the replay-unchanged check for every held log. *Trap:* the maker is who
blessed it, not who drew its marks.

**L2f status, 27 Sep 2026: done on `w2`** — `c004c8e` (red), `34358ac`
(red, revised before the fix), `6da3554`, `de471c0`, `2358bfb` (CLAUDE.md).
`applyBless` writes `made-by` for whoever blessed: the participant the bless
names, "local" in another hand's log meaning that hand. So the maker's word
on her artifact survives every replay, attributed to her, and another hand's
is refused at the door (`not-your-ink`, with her name) and dropped on replay.
Not who drew its marks: a hand may bless a group two hands drew — the thing
is the blesser's and each mark stays its drawer's, drawn inside it in its
drawer's colour (`inkOf`'s `byMaker`; it had been drawn in the artifact's).
A bless is a person's act: the shard blesses its hulls in the engine's name
inside its hand's act, and those are the hand's, the engine keeping its name
on the word — the first red asked for the engine's, which would have moved
the shard's two boards by an edge each and let no person label a hull, and
was revised before the fix. The edge is written only for a maker other than
the board's own hand, so every held log (`Demos/recordings/*.json`,
`shard-3d/fixtures/*.mm.log`) replays against the `ff330a9` bundle node for
node — the same ids, nodes, state and next id — bare, named, merged as the
reader's own and merged with no reader: 24 of 24; merged as another hand's,
the four logs with a bless differ only by the new edge to that hand on their
six artifacts. `held.test.ts` reads every held log in core. The panel's *by*
row reads `authorOf` for every node; the MCP hand's look says *by tab* and
`canvas_label` on the tab's artifact is refused (the smoke, two checks); e2e
43–43c. *Found, not changed:* a word gathered from another hand's letters is
still made by the reader (`made-by` the local participant in the word's
gathering), so her label on her own word is dropped on another board and
that board may label it; its letters now draw in her colour. Whole suite at
the last commit: core 797 in 62 files, typecheck clean, both bundles equal
to a fresh build; relay and field 40; surface in sync; the canvas MCP smoke
and the shard's (605 in 31 files, typecheck clean) all pass; the gate 394
passed and the one honest skip (canvas 248; shard 123 + 11 + 12); WebKit
smoke 3.

**L2g a word is made by whoever wrote its letters.** Found by L2f: the
gathering writes every word `made-by` the local participant, whoever wrote
its letters, so on another hand's board her word reads as the reader's —
her label on it is dropped there, and that board may label it — while its
letters draw in her colour. A word is made by the hand that wrote its
letters on every board: a hand's label on its own word survives every
replay, another hand's is refused at the door, the letters of two hands
never gather into one word, and every held log replays as before. *Red
first:* two hands — A writes a word and labels it, B's board replays A's
log, B tries to label it — and A's and B's letters interleaved on one band.
*Trap:* a merge interleaves two hands' events by time, so gathering must
never see another hand's letter as the next letter of this word.

**L2g status, 27 Sep 2026: done on `w2`** — `9ae7ba9` (red), `a313935`
(red: the smoke and the gate), `d6d1a37`, `14f28ad` (CLAUDE.md).
`absorbIntoWord` reads the run over the marks the new stroke's maker made
and writes the word `made-by` that maker — the attribution each letter
already carries, "local" in another hand's log meaning that hand. So her
label on her word survives every replay, attributed to her, and another
hand's is refused at the door (`not-your-ink`, with her name) and dropped on
replay, his own board's included; the label rule needed no change. The trap
was live, not only possible: in the merge's time order the mark before her
next letter may be his, and taken for her run's last letter it joined her
word (e2e 44c: this hand's I printed beside fern's word made it five
letters) or broke it (44: her word split in two where the merge set this
hand's I between her letters; two hands printing at once on two lines
gathered no word at all). Read over her own marks, her letters gather into
her word whoever drew in between, and the letters of two hands — or of a
hand and a model — never gather into one. A board's own words name its own
hand as they always did: every held log (none holds a word) replays against
the `c1aa0ec` bundle node for node — the same ids, nodes, state and next id
— bare, named, merged as the reader's own, merged with no reader and merged
as another hand's: 30 of 30; so does single-hand writing, six logs with and
without a log name in the four ways a reader opens its own log: 48 of 48,
56 word nodes. `held.test.ts` is unchanged. The MCP hand's look says *by
tab* on the tab's word and `canvas_label` on it is refused (the smoke, two
checks); e2e 44–44c (the panel says *by fern*, her label drawn in her hue,
held it is not this hand's to label, a letter printed beside her word never
joins it); no surface change — every door reads `authorOf`. *Found, not
changed:* the session's gesture state — a loop that waits, a summon, a
selection — is one for the board, not one per hand, so the trap has a
sibling there. Another hand's stroke that the merge sets between a hand's
summon and its bless dissolves the summon on replay and the bless is lost on
every board, the blesser's own included once the room's logs merge (a probe:
her artifact stands on her live board, and on none of three replays); set
between a loop and its check, the loop is not taken up and the check reads
backwards, holding the loop's own ink as a member. Whole suite at the last
commit: core 804 in 62 files, typecheck clean, both bundles equal to a fresh
build; relay and field 40; surface in sync; the canvas MCP smoke and the
shard's (605 in 31 files, typecheck clean) all pass; the gate 398 passed and
the one honest skip (canvas 252; shard 123 + 11 + 12); WebKit smoke 3.

**L2h gestures are per hand.** Found by L2g, with a probe: the gesture
state — a loop waiting to be taken up, a summon, the selection, the command
mark's look-back over recent marks — is shared by the whole board, while a
merged log interleaves hands' events by time. Another hand's stroke between
a hand's summon and its bless dissolves the summon on replay, and the bless
is lost on every board, the blesser's own included once the room's logs
merge; between a loop and its check, the loop is not taken up and the check
gathers recent marks, holding the loop's own ink. Two hands in one room (A7)
cannot work until each hand's gesture state is its own, keyed by the hand
exactly as authorship is keyed: a hand's summon survives any other hand's
events and its bless applies to it, on every board and replay, in both merge
orders; its loop is taken up by its own check; the look-back counts its own
marks; the selection and the field on a board are the reader's own; a
single-hand board is exactly as before. *Red first:* two-hand core tests in
both merge orders, and gate records that drive two tabs in one room through
a summon with the other drawing in between. *Trap:* a gesture keyed by a
participant id that differs between boards (the local participant on one,
`participant:hand:<name>` on another) splits one hand's gesture in two; key
by the attribution `authorOf` uses, and test from both boards.

**L2h status, 27 Sep 2026: done on `w2`** — `e9ec56d` (red), `b2a5568`
(red: the gate), `1f377ec`, `345be9f` (the canvas's half), and CLAUDE.md
with this entry. Each hand's gestures — its waiting loop, its summon, its
selection, why its last stroke missed, the mark it taught, and the look-back
— are held under `handOf`, the rule L2f's maker already was: a person's act
is theirs ("local" in another hand's log reads as that hand), and a model's
or the engine's is the act of the hand whose log holds it. So one hand keys
alike from its own board and from every other: the shard's bless in the
engine's name takes up its hand's summon, and a model's loop waits for its
hand (the trap's test, from three boards). Her summon survives his strokes
and her bless makes her thing on her board, his and a third's, in both merge
orders (his stroke at the moment of her check falls before it or after it as
the names break the tie); her loop is taken up by her check whatever he drew
between; her look-back gathers her own marks, never his box drawn beside her
row in the same breath; his loop, summon, selection and dismissal never
touch hers; what is erased leaves every hand's gestures. The board's
`summon`, `selection`, `pendingLassoId`, `markMiss`, `commandMark` and
`recentIds` are its reader's own. **A taught mark is its hand's**, and two
faults in `17-folder.js` kept a hand from its own in a room, found by the
gate: the device's mark was re-taught only when no log taught one, so a room
whose other hand taught hers left this hand judged by hers; and `openLive`
counted the loaded events again after the re-teach, so the room's first
merge took the teach for the room's and dropped it — from the first line
another hand sent, the board judged this hand by the built-in check. Now it
is re-taught unless this hand's own log teaches one, and it stays this
hand's; either fix alone leaves e2e 46 red. A single-hand board is exactly
as before: `session.scenario.test.ts` and `held.test.ts` unchanged and
green; every held log replays against the `a4bccfa` bundle node for node —
the same ids, nodes, state and next id — bare, named, merged as the
reader's own, merged with no reader and merged as another hand's (the
reader's own gesture fields set apart there: the reader drew nothing): 30 of
30, and at every one of their 515 prefixes; nine single-hand gesture logs
(the canonical loop, the look-back over an artifact, pointed summons with a
correction and a dismissal, a double-tap and keep-as-drawing, a taught caret
forgotten, scratches and erases against gestures, a model's gestures, the
engine's bless and imports, a word taken up) are written live as the same
events by either bundle, 18 of 18 with and without a log name, and replay
the same in all five ways: 90 of 90, and 940 of 940 prefixes. e2e 45–45e
(fern draws while this hand's field stands open and it stays open; the name
given in the field makes the thing here, on fern's board and on a third
reader's replay; fern's own loop and check never open this hand's field;
fern's stroke between this hand's loop and its check leaves the loop waiting
for this hand) and 46–46a (the device's caret is this hand's in a room whose
other hand taught her own check, and takes its loop up while her check takes
hers). *Found, not changed:* two hands may now hold the same marks at once,
and when both bless, each thing takes them — a mark part of two things, the
same on every board; which should win is a decision. A folder opened with
no reader stamps no `by`, so every log in it is the reader's own: one hand's
gestures there, as its authorship already was. The MCP hand's look says what
its own gestures are, so it no longer reports the tab's open field as the
room's. Whole suite at the last commit: core 860 in 65 files, typecheck
clean, both bundles equal to a fresh build; relay and field 40; surface in
sync; the canvas MCP smoke and the shard's (605 in 31 files, typecheck clean)
all pass; the gate 406 passed and the one honest skip (canvas 260; shard 123
+ 11 + 12); WebKit smoke 3.

*L2a status, 26 Sep 2026: done on `w2-shard`* — `0540c1c` (red), `092f747`.
Taken from `auto/w1-U1d` (6893f53), which takes both prefixes off the write
path and keeps a reader; `auto/w1-U1d-r0920105222` still wrote `answer:<id>`
and contributed two tests. The shard names its log as it joins (one sitting);
a brief is an answer whose question is `brief`, its reply names the brief's
node id and is about the brief node's `about` edges as the asker reads them;
`legacySeatTraffic` is the one reader of the old spelling, tested against
`shard-3d/fixtures/seat-before-ids.mm.log`, recorded by the code it replaced.
Found on the way and fixed (`f78522e` red, `c26f850`): `space_pending` lost
the human's words on every parts brief. Shard smoke 31 checks (28 before).

*L2c status, 26 Sep 2026: done on `w2-shard`* — `1a285fa` (red), `ac2e069`,
records in `22641f9`, and a plan read as the form rung reads one
(`4cbe983` red, `30634a2`). Base `auto/w1-U3` (1acaff7), the attempt that asks on
the explanation plane; neither attempt passed the week-1 checks (asked only
by a deliberate call or not on the plane at all, per part, a word that left
the body as deep as it was), so the regression is those checks. The hull asks
at the hull level, in the act that stood it; a second view or a word closes
it, derived; the word cuts the body (`HullStep.depth`); no core change.
Per-part asking is left to John (`shard-3d/README.md`, *Still John's*).

*L2d status, the cache, 26 Sep 2026: measured on `w2-shard`, no bound* —
`22641f9`. `node e2e/run.mjs shard demo demo2`: the castle leaves 3 entries,
171 KB, and 80 hovers from eight standpoints add nothing; the largest held on
any gate board is 6 entries, 336 KB (the mug). The cache clears whenever a
solid rebuilds, so no bound. The losing attempt branches (`auto/w1-U1d-r0920105222`,
`auto/w1-U3-r0920120035`) are left for the director to delete: this lane
creates and deletes no branch.

**L3 CI, bundles, docs — status, 27 Sep 2026: done on `w2`** — `bf4b533`
(CI; its message carries the red-first `rg`, which printed nothing),
`426f547` (the smoke's pill), `8b2493b` (red), `5487395` (the guard),
`51194de` (CLAUDE.md), `7bdb2f2` (the other docs), and the commit carrying
this line. CI's core job runs `Demos/relay.test.mjs` beside the field
reader's test and `Demos/build-surface.test.mjs` beside `--check`; a
`webkit` job installs WebKit (`npx playwright install --with-deps webkit`
in `e2e/`) and runs `node e2e/run.mjs --browser webkit smoke`, uploading
`e2e-webkit-results` when it fails. The YAML parses (Python's
`yaml.safe_load`); Actions were not run here. The smoke takes one pill:
*Draw them clean*, clicked on the held line, which then carries its clean
form — four checks, shown able to fail with the click sent elsewhere.
`node Demos/build-surface.mjs`, and its `--check`, refuse a name declared
at the top of two fragments: the fragments read as one strict block are
the engine's own early error, and the fragments that declare it are named
(a scratch copy with a second `renderLabels`: exit 1, `08-render.js,
21-minimap.js`). Both bundles already equalled a fresh build and still do.
The docs: CLAUDE.md's headline (phase 0 done, 0b next with `PERF.md`'s
numbers), documents, map, tier 1½ and working notes, the paragraphs the
units wrote checked against the code and true as they stand, the finding
below added to the sitting's; ROADMAP.md's
entry; T8 done in `SURFACE-v10-PLAN.md` with its commits; QA-v10's two
hands; the core README's map (it named `spatial`, long gone), both bundles
and the sitting; `e2e/README.md`. *Found, not changed:* a sitting is its
own participant, so after a reload a person may not label what they drew
before it — core refuses (`not-your-ink`) and the field says *no label —
john made this mark* (shown with the Node bundle: john's second sitting
labelling his first sitting's box). Whether a sitting inherits its person's
marks is a decision. Whole suite at the last commit: core 889 in 67 files,
typecheck clean, both bundles equal to a fresh build; relay and field 40,
the build's test 4; surface in sync; the canvas MCP smoke and the shard's
(605 in 31 files, typecheck clean) all pass; the gate 406 passed and the one
honest skip (canvas 260; shard 123 + 11 + 12); WebKit smoke 4.

**L2i a person is the same person across sittings** (L3's finding, a
phase-0 follow-up). Since L1 a live hand's log is one sitting — a new
suffix per page load or process (`sittingName`) — shown under the person's
name and colour (`handLabel`); but the rules that ask "is this mine?"
compare the exact log name, so after a reload a person may not label what
they drew before it: core refuses `not-your-ink` and the field says *no
label — john made this mark*. Those rules compare the person — the log name
without its sitting's suffix — so every sitting of one person may label that
person's marks, and the field counts them as the person's own; another
person's are refused, with the reason. What stays per sitting: log names,
ids and numbering (L1), and gesture state (L2h). Folder and browser-storage
boards keep one stable name and are unchanged, and so are `held.test.ts`
and `session.scenario.test.ts`. The trust model is said plainly in
CLAUDE.md: a name is self-asserted — there are no accounts — so one name is
one person on the trust the name and the colour already carry; it is not
authentication. *Red first:* marks written by `john~a1`, a label by
`john~b2` accepted, one by `fern~x1` refused, the field's line across two
sittings; and a gate record — draw in a room, reload, label a mark drawn
before the reload. *Invariant:* state is a pure function of the log.
*Trap:* changing the attribution (whose colour, whose name on a card)
instead of the rule; or merging sittings into one participant — the logs
stay separate, or numbering could collide.

**L2i status, 27 Sep 2026: done on `w2`** — `4f9c113` (red), `22b0c9b`,
`564a058` (the canvas's half), `039f353` (the MCP hand), `7987ef0` (a
guard), and the commit carrying this line. The label rule, at the door
(`staleFor`) and on replay (`applyLabel`), asks `samePerson(maker, writer)`:
the same hand, or two sittings of one person, the person being `handLabel`
of the log's name. This board's own hand is the person its log is written
under (`logName`) — the same fact every other board reads off that log's
name when it merges it, so every board agrees; another hand is shown by its
person already; a model or the engine is no person and only ever itself; a
board never told its log's name compares hands exactly, as before.
`Session.isMine(id, participant?)` asks the same question for the field:
`whoseInk` and `labelMarks` (`09-palette.js`) asked `authorOf ===
LOCAL_PARTICIPANT` — the sitting — and now ask core, so the line before
Enter and the door never disagree (a test checks them mark by mark).
Attribution is unchanged: the panel, the card and `canvas_look` still say
a mark drawn before the reload is the earlier sitting's, *by john*, in
john's hue. Pinned: after a reload john labels what he drew before it, and
the word stands on every board — the earlier tab's (still open), the later
one's, fern's, in both merge orders; the earlier tab labels what the later
one drew; a thing he blessed and a word he wrote in one sitting are his in
the next; fern, and johnny — whose name only begins like his — are refused
at the door with whose it is, and a label in fern's log is dropped on every
replay; the field's line says *on each of your 3 marks* across two sittings
and names only fern's. Still per sitting, and said so in the tests: two
logs, two participants, each its own numbering; his field in one tab
survives his strokes in the other, his loop waits for its own tab's check,
the look-back is the tab's own; his letters from two tabs never gather into
one word (the gesture and word guards shown failing with another sitting of
the person keyed as the same hand, the change then taken out).
e2e 47–47e (the harness cannot reload its own page, so the sitting before
the reload is a hand of this person's name under another suffix — what a
reload leaves in the room): the box drawn before comes back the earlier
sitting's; the line says `↵ label it “inlet”` where it said *no label —
hand made this mark*; Enter writes one label event of this sitting's; the
word stands on the earlier sitting's board, fern's and a third reader's;
held with fern's circle it goes on the box and not on hers; and a box this
tab drew is labelled by the person's next sitting, the word landing here.
The canvas MCP smoke restarts the hand, which labels the circle it drew
before the restart and is still refused the tab's box (its two new checks
red on the old bundle). Every held log replays against the `e1f5349` bundle
node for node — the same state and next id — bare, named, merged as the
reader's own, merged with no reader and merged as another hand's: 30 of 30
(none holds a label). *Found, not changed:* a hand that never gave a name
is *hand*, so two unnamed people are one person to the rules — as they are
already one name and one colour on the board. `7987ef0`'s message says
core 900; it is 899. Whole suite at the last commit: core 899 in 67 files,
typecheck clean, both bundles equal to a fresh build; relay and field 41,
the build's test 4; surface in sync; the canvas MCP smoke and the shard's
(605 in 31 files, typecheck clean) all pass; the gate 412 passed and the one
honest skip (canvas 266; shard 123 + 11 + 12); WebKit smoke 4.

**L2j undo is per hand** (R4d's finding, a phase-0 follow-up). In a room,
undo removes whatever event is last on the BOARD — the merge's order, every
hand's log interleaved by time — which is another hand's whenever that hand
drew after this one by the clocks; nothing is sent, since this hand's log
did not change, and the mark comes back at the next line that changes a log.
Undo takes back the reader's own last ACT, never another hand's: the events
this hand wrote at once, found among its own log's events by authorship and
the order they were written, never by where the merge put them. In a room
the log shrinks, so L1's `publish` sends it whole and every other hand's
`LiveMerge` (R4d) cuts the act out: the other boards lose exactly that act.
Say what an act is — one `dispatch`, or everything written inside one
`withTool` — and test it; redo, if it exists, redoes this hand's act; a
single-hand board undoes as it did, one event at a time, save that a tool's
act of several events undoes as one, with what changed said;
`session.scenario.test.ts` untouched and `held.test.ts` green; R4d's oracle
extended with per-hand undos, green at its default seeds and at
`MM_ROOM_SEEDS=500`. *Red first:* two hands — A draws, B draws after, A
undoes: A's mark gone and B's standing on both boards, in both merge orders;
a tool act of several events undone in one step. *Invariant:* state is a
pure function of the log. *Trap:* "the last event in my log" is not "the
last event on the board"; find this hand's events by authorship and sitting
(`handOf`), never by position — and a room's own-log view (`ownLog`) must
shrink in the order it was written.

**L2j status, 27 Sep 2026: done on `w2`** — `34885ff` (red: two hands in
four merge orders, a hand with nothing of its own, the order written, tool
acts through `withTool`, the one door and a host's stamp, the label act, a
log read back in, another hand's tool act; 9 of 12 red), `e046c90` (red: the
oracle holds every undo to its hand's writing), `a534e33`, `063c3ac`,
`700da7d` (the shard), `4434d44` (the surface), and the commit carrying this
line. `session.undo()` takes back what `session.lastAct()` names: this
hand's own last act. Its events are its own log's — the ones no merge
stamped `by`, whoever they name (a model's reading in its log is its act, as
`handOf` reads it) — and the last is the one it wrote last: the highest `seq`
under the name this sitting writes (a number only rises in a sitting, and
the merge changes none); with none, the highest under the name of its last
named event; with no names at all, the last of its own in the log. **An act
is one dispatched event, or everything written inside one outermost
`withTool`**: those events carry `act`, one number per act, one past the
highest this sitting has seen — like the high-water mark it only rises
through an undo, a load and a load of nothing — provenance that replay
ignores, like `tool`. **The field a tool closes before it writes anything
else is not the act**: a `dismiss` or `deselect` first is an event of its
own, as L2e ordered it so that undo takes back the words and not the close
— one undo takes every label a label act wrote off and the field stays
closed (e2e 42b unchanged); a close after the act has begun is part of it.
The act is dropped where it stands; every checkpoint past its first event is
dropped (which mends R4d's latent finding: undo past ticks kept a checkpoint
taken with the undone event, and a filter by length alone keeps checkpoints
taken with an act in the middle of a room's board); the replay starts at the
nearest one before it; `generation` moves only when an event left standing
after it mints ids off the counter. Nothing else was needed in a room: the
log shrank, `publish` sends it whole, `LiveMerge` cuts. There is no redo.
**What changed on a board of one hand:** a tool's act of several events —
labels on three marks, *Make it text* (the bless, its code and the
deselect), a duplicate's copies — is one undo where it was one per event;
everything else undoes as before, one event at a time
(`bench/equivalence.mjs --ref=a6a66e8`: nothing reads
differently, twelve undos from the end of the scripted log and six on the
500-mark board included), and ticks are still never taken back.
`session.scenario.test.ts` untouched; `held.test.ts` unchanged and green.
`livemerge.test.ts` pinned the defect (*an undo took another hand's mark …
and the mark comes back*); it now undoes this hand's mark from the middle of
the board, ada's standing, and the sync has nothing to hand over. **The
shard** reads its act — the run sharing the top event's `at` (ACT-1) — off
its own events, not the board's top, which in a room may be the other
hand's (its room test: red before, the tab's stroke stood with its plane
gone). **The surface's** `dropFailedBless` asks `lastAct()` (the bless is
still this hand's last act) instead of the board's last event; 07-input's
undo needs no change. The oracle keeps each hand's writing beside its
session (`Writing`, `src/test/room.ts`), independently of the engine, holds
every undo to it — exactly that hand's last act gone, nothing else moved,
the reader's `ownLog` always its writing in the order written — and follows
it to every board that holds the log; hands now also take tool acts. At
`MM_ROOM_SEEDS=500` (50 s): 8,989 checks, 1,974 undos (724 here, 1,250 by
other hands), 491 of them with another hand's event last on the board (what
the old undo took), 142 tool acts undone whole, 2,999 followed to another
board and gone there. *Found, not changed:* a mark with no authorship has
no number, so among those the log's order stands for the order written —
a hand that wrote before it had a name, its clock set back between two
marks, has them taken back in the clock's order once a merge has put them
there (the room's newcomers now draw their unnamed marks a second apart);
and a hand that came back under another name in its sitting leaves a copy
of what it wrote before under the old name, so undoing one of those events
leaves that copy standing on every board, the old name's (43 in the 500
rooms). *Not built:* a gate record — the e2e files are the pencil lane's
this week; the core's two-hand tests drive `LiveStore` and `LiveMerge` as
the canvas does, and the gate's own undos (28d–e, 42b, 48) pass unchanged.
Whole suite before the last commit: core 1,114 in 83 files,
typecheck clean, both bundles equal to a fresh build; relay, field, build,
board and scripts tests 93; surface and app in sync; the canvas MCP smoke
and the shard's (606 in 31 files, typecheck clean) pass; the gate 520 passed
and the one honest skip (canvas 303, keep 31, boards 19, app 14, budgets 7;
shard 123 + 11 + 12); WebKit smoke 4.

### Phase 0b — a board that holds (pulled forward, 27 September)
The performance baseline (`PERF.md`, R4a) measured what daily use would meet
and found the medium does not hold a working board: **500 marks are usable
once open; 2,000 take 100 s to open and freeze the page 7.6 s on every
stroke; 5,000 do not open; and autosave stops saving, in silence, near
1,100–1,600 marks.** A page of handwritten formulas passes 500 marks — every
letter is a stroke. So this phase comes before the backbone: tools, context,
notations and the maths on the board all read the board on every stroke, and
would inherit the cost. The budgets are `PERF.md`'s, enforced as tests.

**R3 no lost work** — as in phase 6 below, run first: never silent, an
append-only store per board in IndexedDB, flush on the way out, the kill test.
**R4b the engine holds 2,000 marks** — relations stored only within reach
(distance-limited, relative to the marks' size; `same-size` across the whole
board is 88% of what is held), computed for the new mark's neighbourhood
through a spatial index instead of the whole board on every stroke
(`recomputeClusterCandidates`, `session.ts`), checkpoints that do not clone
every relation, and the scratch test's bounding-box check (`erase.ts`);
replay of every held log node for node, and the budgets as tests on the
generated boards (`metamedium-core/bench/`). **R4c the surface draws only what
changed** — the reading of roles for the marks a stroke touched, not the whole
board (`readRungs` in `08-render.js`, `assignRoles` in `diagram/roles.ts`),
culling to the viewport, and a pointer move that repaints the stroke in
progress, not everything. **R4d a room merges a line, not the board** — an
arriving line appended without a full replay (`17-folder.js`), hellos not
answered with every log by every hand, and the re-serialisation of every event
per line gone. **R4e a brief carries what it is about** — `describeSession`
lists the relations near the scope, not every stored one (113 KB for five
marks at 2,000).

**R4b the engine holds 2,000 marks — status, 27 Sep 2026: done on `w2`** —
`d16fdab` (red: the budgets as tests, the equivalence harness), `08a1aef`,
`1fbd868` (PERF.md's "after R4b" column), `8f45ac2` (the harness's scripted
log), `bd843b7` (the grid and the reach test exported, for R4c). A content
mark is filed in `relate/grid.ts`, a hierarchical grid whose cells are sized
from the marks (each at the smallest power of two its own size fits in), and
linked to the marks within its reach: `withinReach` is exactly "`relate` finds
an engaging relation" (pinned on 4,000 pairs at four scales), and
`reachAround` — `nearRatio` of the mark's own size — grows the box the index
is asked about. A pair within reach stores every relation `relate` finds, in
the old order; a pair out of reach stores none, and a scope computes those on
demand (`session.read`). The components of the links are kept with their
candidates and found again only where a mark joined, left or moved; a changed
definition is scored against every component; checkpoints share the reps and
edges nothing changes in place; the scratch test asks an index of the ink, and
`scratchedOut` passes over a target whose box stands clear (`mayCross`). On
the generated boards (`node --test metamedium-core/bench/budgets.test.mjs`):
**2,000 marks replay in 0.24 s (was 159.5 s), take one more stroke in 0.15 ms
median and 0.23 ms p95 (was 237 / 535 ms) and hold 12.4 MB (was 1,059 MB;
stored edges 909,566 → 18,146); 5,000 marks replay in 0.65 s (killed at 300 s
before), 0.31 / 0.39 ms a stroke, 45.5 MB** — inside PERF.md's 5,000 budgets
too. `bench/equivalence.mjs` (the `9977158` bundle against `src/`) finds
nothing that reads differently in any held log — bare, as the reader's own, as
another hand's, at every prefix — in a scripted log of the acts the boards
never make (tidy, scale, turn, import, frame, correct, split, label, bind, a
loop kept as a drawing, clocks; every prefix, twelve undos), or on the
500-mark board loaded, drawn event by event and compared after all 530 events,
by prefixes, undone six times from a checkpoint (equal to a replay from zero),
and drawn on: ids, reps, the state, clusters and candidates, shapes, words,
reads, matches, signatures, regions, magnets, snap offers, heads, figures and
the maths are identical — and so they are on the 2,000-mark board
(`--size=2000`, the old engine given a 24 GB heap), loaded, drawn event by
event and compared after all 2,079 events, undone from a checkpoint and drawn
on. What changed is the stored edges, less exactly the relations between marks
out of reach (500 board: 65,336 → 4,398; 2,000: 909,566 → 18,146, 800,948 of
the dropped same-size), and the brief's lines that listed them — five marks'
brief at 2,000 is 2 KB, not 113 KB, so R4e's number is met as a side effect
and its scoping is still its own. `session.scenario.test.ts` untouched,
`held.test.ts` green.
*Found, not changed:* the whole-board read the surface runs per stroke is
still 7.9 s at 2,000 (R4c's); a room's line is 63 ms of merge work and a 0.27
s replay (R4d's); moving an artifact moves its members but not its own bounds,
so the plane reads the artifact where it was blessed — as it always did, and
kept, because changing it changes a reading. `vitest.config.mjs` keeps
`bench/` out of `npm test`, which had collected `budgets.test.mjs` since the
red commit. Whole suite before the last commit: core 967 in 72 files,
typecheck clean, both bundles equal to a fresh build; relay, field and build
tests 45; surface in sync; the canvas MCP smoke and the shard's (605 in 31
files, typecheck clean) pass; the gate 412 passed and the one honest skip
(canvas 266; shard 123 + 11 + 12); WebKit smoke 4.

**R4c the surface draws only what changed — status, 27 Sep 2026: done on
`w2`** — `a24677f` (red: PERF.md's budgets measured by `e2e/perf.mjs` and a
gate scenario, `budgets`, failing on the 2,000-mark board — open 8.04 s,
release 7.51 s, a pointer move 7.5 ms, a pan at fit-all 117 ms — and the
equivalence check passing against the whole-board read it was), `79971d0`,
`f11ecec`, `7e1a4b5`, `c6d0dc1`, `30c879d`, `317f514`, and the docs. After a
stroke the surface reads the marks the stroke touched and their
neighbourhood: the reading under a mark and the panel ask one mark's role,
and `roleOf` (`08-render.js`) reads it over the marks within its reach
(`MM.MarkGrid`, `MM.withinReach`), the ends of its wires and the connectors
wired to it, in the whole board's order — the role table reads only engaging
relations and wires, so that is the whole board's role for it; the board's
genre (a live artifact's panel) is every role read that way, one read over an
unchanged neighbourhood carried from the last log. Everything a paint derives
from the log is kept while that log stands, keyed by the log itself (which
array, its length, the event that ends it): the paint's index, roles, offers,
reading chips, labels, candidate boxes, the minimap's and the selection's
readings, the magnet sites (read ahead while idle). Painting is culled to the
screen — ink by what each mark draws, an artifact's members one by one, its
chrome where its name reaches, chips, labels and cards that reach the screen,
each still measured and placed — with the minimap still the whole board; what
the hand is on or holds and what a drag or a tank moved is always drawn;
points under a screen pixel apart are thinned. A pointer move paints the pen
on a layer of its own and not the board; a wheel, pinch, pan or minimap drag
paints once a frame. On the 2,000-mark board (the gate, Chromium, load
1.6–3.7): **open 0.49 s, release → reading drawn 15.5 ms median and 40 ms p95
(the first release after a pan; the rest 15–16), a pointer move 0.2 ms, a pan
frame 16.7 ms at zoom 1 and 33.4 ms (two frames) at fit-all — every budget**;
5,000 marks open in 1.09 s (a crashed tab before), 20 / 49 ms a release, 0.4
ms a move, 16.7 ms a pan at zoom 1, and 50 / 67 ms at fit-all, over the 50
aimed for. The equivalence check — `paintCheck` paints both ways and compares
what each drew (every mark's ink, ghost, chip, reading, name, label, card,
the minimap) and said (the status line, the panel); `rolesCheck` every mark's
role and the genre; `heldCheck` every held group — finds nothing that differs:
the 500-mark board with all 336 marks pointed at at zoom 1, three boxes drawn
and undone and the role table after each (351 paints and tables; a hand's
paint strokes 5% of the ink, the minimap every mark), the 2,000 board's role
table (1,403 marks) and held groups (1,367), and the gate's own boards
through eighteen records (eleven through the scenario, seven in section 48,
each a paint and a role table) — and section 48 pins the reading under a mark, a
neighbour's panel after an undo and after a move, a match chip, an answer card
and another hand's arrow changing the moment the log does, and a pointer move
that paints no board and ten wheel events that paint it once. *Found and
fixed:* the whole-board read was kept on the set of ids, so a move that changed
a role left the old one standing (48a2 fails on the red commit's surface: the
box stayed a container after its circle left it); the magnet sites were kept
on the node object, which a move or a snap changes in place; the mark chip was
redrawn and its name rewritten into the page on every paint; press-and-hold
related every loose mark (183 ms at 2,000) — now the component the index walks
to, the same group. *Found, not changed:* with that per-paint write gone, the
first release after a pan waits 22 ms on the browser's own frame work
(`BeginMainFrame`, no script; put the write back and it is 17 ms); at fit-all
headless Chromium rasterises every stroke on the CPU, and two-pixel thinning
would make 2,000 one frame at a visible cost, not taken; a room's line still
reloads the whole log, so every cache is read again after it (R4d's).
Whole suite before the last commit: core 1,042 in 75 files, typecheck clean,
both bundles equal to a fresh build (core untouched); relay, field, build and
board tests 58; surface in sync; the canvas MCP smoke and the shard's (605 in
31 files, typecheck clean) pass; the gate 475 passed and the one honest skip
(canvas 291, keep 31, budgets 7, shard 123 + 11 + 12); WebKit smoke 4.

**R4d a room merges a line, not the board — status, 27 Sep 2026: done on
`w2-shard`** (on R4b's engine, merged in as `0bca5ca`) — `f3d3357` (red: the
room's budgets as tests, and the oracle passing against the full replay),
`0b8bee2` (core), `6e99380` (the canvas), `46f67fd` (the MCP hand),
`a1158bc` (checkpoints) and the commit carrying this line. `LiveMerge`
(`store/livemerge.ts`) keeps the merge standing between lines — `mergeLogs`'
order and fold, the reader's own copy standing — and hands the session only
what changed through the new `Session.rebase`: applied with no replay when a
line's events fall after everything held, replayed from the nearest
checkpoint when one falls before. The store says when to merge (`revision`,
read through `heldLogs`): a hello, a goodbye, the relay's word and a whole log
already held change no log and do no work. A room's log is `ownLog`, in the
order written, with no event serialised. A hello is answered once per log:
each hand for its own, a copy only for a writer that said goodbye (`close()`
sends `bye`) or stayed silent 1.5 s, by the first holder. A merge leaves a
checkpoint where it ended, and the last four checkpoints keep the index, so
the commonest early line — one crossing a mark this hand just drew — goes back
a few events. On the 2,000-mark board (`node --test
metamedium-core/bench/room.test.mjs`, all four pass): **a line 1.65 ms median,
2.03 ms p95, no replay** (was 312 / 317 ms on R4b's engine, 173 s before it);
crossing a mark just drawn 4.2 / 5.0 ms; lines with no events, no work; the
save a line schedules 0.26 ms (was 62.9); **a newcomer's hello one copy of each
log** in rooms of three and six, with a hand that left or vanished — 6.51 MB to
it in a room of six (was 32.56 MB, five copies) — and it holds exactly the
room's logs. At 500: 0.94 / 1.10 ms (was 71.9 / 74.8). The oracle
(`src/store/room.oracle.test.ts`, 16 seeded rooms in `npm test`) holds the path
to `mergeLogs` and a replay from zero after every merge, and to a reference
merging the whole log when one changed; 500 rooms (`MM_ROOM_SEEDS=500`, 45 s)
pass with 8,857 checks, 10,250 lines that changed no log, 4,426 replays from a
checkpoint (the path under test snapshots every 3–14 events), 1,974 appends,
1,437 cuts before the first checkpoint, 410 merges read again whole, 443 undos
here and 784 by other hands, 504 leavers, 921 goodbyes, 464 newcomers (236
with marks drawn before they had a log name), 417 renames and 390 clocks that
jumped. What it found: the path published its own log in the merge's order —
a whole log where the reference sent an append, 6 rooms of 500 — so `ownLog`
reads it in the order written. e2e 28l (a line after everything is applied:
the same log, one event longer, `generation` unchanged) and 28m (a hello, the
relay's word, a whole log already held leave the board and the paint
untouched). R4b's budgets hold — 2,000 marks replay in 264 ms, a stroke 0.16 /
0.34 ms, 16.8 MB held (was 12.4: the kept index); 5,000 in 713 ms, 57.5 MB (was
45.5) — and `bench/equivalence.mjs --ref=0bca5ca` finds nothing that reads
differently. *Found, not changed:* a line 30 or 150 events back — a clock
seconds behind other hands' lines — replays from the regular checkpoints, 39
and 64 ms at 2,000; undo in a room takes the last event on the board, which
may be another hand's (it comes back at the next line that changes a log —
before, at the next line of any kind); undo past ticks keeps a checkpoint
taken after the undone event (latent: nothing dispatches ticks); answering a
hello costs the answering hand the serialisation of its own log on the wire
(40 ms at 2,000 through the test hub); the shard (`shard-3d/src/room.ts`)
still merges its room whole on every notify. Whole suite before the last
commit: core 1,063 in 77 files, typecheck clean, both bundles equal to a fresh
build; relay, field, build and board tests 75; surface in sync; the canvas MCP
smoke and the shard's (605 in 31 files, typecheck clean) pass; the gate 464
passed and the one honest skip (canvas 268, keep 31, boards 19; shard 123 + 11
+ 12); WebKit smoke 4.

**R4e a brief carries what it is about — status, 27 Sep 2026: met by R4b.**
The budget (a model brief for five marks on the 2,000-mark board ≤ 4 KB) holds
at 2 KB since R4b stored only the relations within reach — what a brief lists
shrank with what is stored (`PERF.md`, the budgets' table). No separate
scoping was needed; revisit only if a larger brief shows otherwise.

**Phase 0b — status, 27 Sep 2026: done** (R3, R4b, R4c, R4d; R4e met by R4b;
R1 and R7 landed with it). Gate on the merged tip `d75cc6f`: 520 records and
the one honest skip across eight scenarios; core 1,091; shard 605; WebKit 4.

### Phase 1 — the backbone
**B1 Tools.** *Owns* `metamedium-core/src/tools/` (the contract, the
registry, adapters for today's tier-1 modules and concept conversions),
`tier1/library.ts`, `participants/router.ts`, the palette adapter in
`Demos/surface/09-palette.js`. *Done:* every affordance the field shows today
comes from a registered tool, in the same order, with the same labels — the
canvas gate unchanged and green; `HERE` and the models pane list tools from
the registry; a test tool added in one file appears in the field.
*Red first:* a golden test of today's offers for three fixture scopes (a
row of boxes, a molecule, a line of writing), and a test that a registered
tool's offer appears. *Invariant:* one field with stable slots — the four
core buttons never move. *Trap:* the field mixes readings (*what this is*)
and affordances (*what it affords*); only affordances become offers.

**B1 Tools — status, 27 Sep 2026: done on `w2`** — `f16a720` (red: e2e 49,
the golden record, captured from the surface before any refactor — a row of
three boxes, with "row" and "nav" typed at it; a molecule, and the second
one drawn after naming the first; a line of writing unread, read, and taken
as text: the four core slots, the line under the field, every pill's key,
label, reason and dot in the order shown, and every item the field holds in
the order the reader walks, ids said by their part in the fixture),
`7714594` (red: a registered tool's offer in `offersFor`), `e388c55`,
`223c5c1`, `12dada2`, `b303a43`, `a4c260a`, `b9b4ecb`, and the docs.
`metamedium-core/src/tools/` holds the contract (§2.1, with `Grounds` — what
an offer stands on — `ToolHost` — what only a host knows — `Taken`, and
`Context` as B2's placeholder, read everywhere as `NO_CONTEXT`), the
registry (`registerTool` returning the way out, `getTool`, `offersFor` and
`toolsFor` in registry order, each key once and no asking offer leading,
`completionsFor` for what is typed, `takeOffer`, `describeTools`,
`toolScope`, `toolsVersion` and `onToolsChange`), the ranking
(`rankOffers(items, uses)`: the palette's `baseLikelihood`, pure, the
device's counts handed in) and seventeen built-ins, one file and one
registration line each, in the order the field always built its pills:
correct, text, name, label, tidy, control, clean, graph3d, frames,
text-edit, verbs, clocks, read, what, duplicate, keep, structure. A concept's
conversion names its tool (`Conversion.tool`). `09-palette.js` is the
adapter: the readings are read there and ranked by the same function; the
affordances are `MM.offersFor`; a pill is taken through `MM.takeOffer`, and
what only the surface can do (ask a model, open the editor, flip a text,
hold a clip, put words in a text's places) it does in the same stamp. Every
event a tool writes carries `tool` and `offer` (`session.withTool`, stamped
in `dispatch` beside authorship; the same log with and without them replays
to the same board). `here()` names the canvas's own tools on every prompt
that carries `HERE`; the tier-1 library's acting modules and the router
name their tools; the models pane lists what the canvas does with no model.
e2e 49b–c register a tool in one line while the field is open: offered at
once, the core slots unmoved, its answer stamped with its id and key, absent
where no box is held, gone when unregistered. *Found:* ties fall by
insertion order, and the field's old order put *Make it text* before *Show
it in 3D* but *Edit the text* after *Frame these* — so editing a text is a
tool of its own, registered after frames; learned use at its cap makes 0.4
exactly 0.5, a tie the registry order has to keep; and *Fold “…” into the
text* was a pill in the top row, so an offer may lead, and leads after the
line it takes. *Not changed:* taking a reading (a name, the words written)
is not a tool's act and is not stamped; the library's typed completion stays
a reading. Whole suite before the last commit: core 1,070 in 80 files,
typecheck clean, both bundles equal to a fresh build; relay, field, build
and board tests 76; surface in sync; the canvas MCP smoke and the shard's
(605 in 31 files, typecheck clean) pass; the gate 504 passed and the one
honest skip (canvas 301, keep 31, boards 19, budgets 7, shard 123 + 11 +
12); WebKit smoke 4.

**B2 Context.** *Owns* `metamedium-core/src/context/` (`contextAt`, `rank`,
hysteresis), the use counts in `09-palette.js`, the reading under a new mark
in `08-render.js`. *Done:* the same scope ranks differently beside a flow
and beside a row, each lift with its reason; small score changes never flip
the top offer in one context; far from any context the order is exactly
today's. *Red first:* those three as Node tests, and an e2e record of the
steady top while three marks are drawn beside a flow. *Invariant:* plural
readings with reasons — a lift never removes. *Trap:* a context that sticks
after the hand has left is a mode; the lift decays with distance, relative
to the marks' size.

**B2 Context — status, 28 Sep 2026: done on `w2`** — `20e11e9` (red: 17
Node tests in `src/context/` and e2e 50, 50b and 50c, against the contract with every
context empty — 15 tests and 50, 50b failing, the two invariants and 50c
passing), `06a04ee` (core), `1b78c59` (the surface), and the docs.
`contextAt(board, ids | point)` reads what a scope sits **beside**, never its
own marks: every mark within the fade (full inside `near`'s own limit, gone
at 2.5 times it — scale-free), each walked by within-reach links into the
thing it hangs together with, each thing read on its own (`notationsOf`
above the floor, `session.read`'s concepts) and weighted confidence ×
nearness, and this hand's stamped acts beside it, fading over two minutes;
`kind` is the strongest notation, else concept, and `key` adds its
neighbourhood's first mark. `rank(items, ctx, { uses, usesHere })` is
`rankOffers` × a lift of at most a quarter again, with `because[]`; what the
hand named, wrote or a model read here is never lifted and nothing lifted
passes it; `AFFINITY` says what a notation beside the hand makes likelier
(a flowchart: clean forms, flows). `steadyTop` holds the top affordance in
one context until another beats it by a tenth. The surface keeps the context
by the log, counts use per kind (`mm-palette-uses-here`), holds the tops per
context key and board generation (runtime, two minutes), shows both rows in
the ranked order, ends a lifted pill's tooltip *first because it sits beside
a flowchart: three processes, one decision, three flows*, adds *beside* and
*first* to the selection's panel, and draws the reading under a mark through
the same `rank`. e2e 50: three boxes drawn one after another beside a
flowchart keep *Draw them clean* first — with no context the top flipped to
*Line up across* at the second; 50a the panel; 50b a rival a little ahead
does not take the top, one past the margin does; 50c a board away, B1's
order. A context costs 1–2 ms (9 at most) on the 2,000-mark bench board.
*Found:* the field's top row was sorted by its number while Enter took the
first reading in ranked order, so the two could disagree — a model's
reading at 0.95 shown before a match at 0.62, which is what Enter took;
both rows are in the ranked order now, as e2e 49's golden already was. *Not changed:* nothing drawn under a mark can
be lifted yet (a name and the words are the hand's own; a shape is no
concept), so a stroke reads no neighbourhood (`canLift`); `AFFINITY` is a
table in core until packs carry it; a blessed artifact beside the scope is
read as itself, not as its members. Whole suite before the last commit:
core 1,131 in 85 files, typecheck clean, both bundles equal to a fresh
build; relay, field, build and board tests 107; surface and app in sync; the
canvas MCP smoke and the shard's (606 in 31 files, typecheck clean) pass;
the gate 538 passed and the one honest skip (canvas 307, keep 31, boards 19,
app 14, pencil 14, budgets 7 — release p95 38 ms on 2,000 marks, the
500-mark paint equivalence differing in 0 — shard 123 + 11 + 12); WebKit
smoke 4 and pencil 14.

**B3 Packs.** *Owns* `metamedium-core/src/packs/` (format, validation in the
DATA-1 manner, the shipped registry, the `use`/`unuse` events),
`metamedium-core/packs/*.json`, a pack bench helper, a library pane in the
surface. *Done:* a test pack used by an event makes a drawn group match with
no teaching; replay, undo, merge and export carry it; an unknown pack is
said, not thrown; a user's own definition wins a tie. *Red first:* a
scenario test with the test pack. *Invariant:* log as source — the `use`
event, never a pack silently present. *Trap:* a pack that needs orientation
or arrowheads cannot be a signature; that is a notation (D1).

**B3 Packs — status, 28 Sep 2026: done on `w2`** — `f092948` (red: a new
scenario, `src/packs/pack.scenario.test.ts` — the test pack used by one event
makes the canonical molecule match with no teaching; 2 of its 3 failing, the
control passing), `c5aa363` (core), `2aee962` (the bench), `16ad04b` (the
budgets), `0949360`, `2b149b3` (the surface), `6f04823`, `4a7b059`, and the
docs. `metamedium-core/src/packs/`: the format (`pack.ts` — id, version,
name, describes, notation?, definitions with samples as `DrawnShape[][]`
and/or recorded strokes, role, ports, export; connectors; affinities), the
validator in the DATA-1 manner (`validate.ts` — a pack that cannot be read
says where and why; a malformed entry refused with its path and reason, the
rest standing; a frozen copy held; never a throw), the shipped registry by
`id@version` (`registry.ts`; content code-bundled, one `.ts` module a pack
under `shipped/`, so both bundles carry it and the shard typechecks it with
no JSON import): `basics@1` (bubble; molecule drawn three ways),
`flowchart@1` (names the notation, restates none of `FLOWCHART_TABLE`, which
stays its symbols' single home; its affinities), `test-molecule@1` (tests
only, never listed). Events `use { pack }` / `unuse { pack }`
(`session.use`/`unuse`, `SessionState.packs`): replay, undo per hand, a
room's merge and line, the journal and the export carry them; the door
refuses a name that is no pack's or one the build lacks and writes nothing;
on replay such a name is a standing notice (`SessionState.packNotices` —
derived from the log, because one cleared by the next event would be gone
before the replay ended), said, never thrown, and the board loads. A
definition's drawings are drawn through `strokeFor` with seeded tremor on a
scratch board of their own (`synthesize.ts`, `definitions.ts`); the first
one's signature is the definition's and the others' its accepted examples; it
is a node `library:<id>@<v>:<name>` made by `library:<id>@<v>`, matched by
`matchDefinition` after the board's own (the summon's suggestions, the
cluster candidates and `matchesOf` carry `pack`; on a tie the board's own
leads), corrected by *Not a …* (kept through an `unuse`), never content, an
artifact, live, erased, labelled, proposed on or written into; an instance
taken from it is its own definition (`definitionOf`). **The director's three
decisions held**: recognition is never gated — the flowchart reads on every
board and `contextAt` reads every notation, a pack in use adding its
definitions, its notation's ports (`followPacks`: `offerPorts` on use, taken
back on unuse, its undo, or a board loaded in place) and its affinities
(`AFFINITY` left `context/rank.ts`; `contextAt` hands the board's packs' in
as `ctx.affinity`, and a board with no pack keeps B1's order — e2e 49
unchanged); `FLOWCHART_TABLE` stays one home; content is code-bundled and
immutable per `id@version`. `packBench(pack, { corpus })`: its own drawings
redrawn with other seeds, elsewhere, at 0.6× and 1.8× — basics@1 96/96
(bubble 24/24, molecule 72/72), test-molecule@1 48/48 — and 3,900 corpus
drawings (the recognition corpus, turned boxes, arcs, 36 flowcharts,
wireframes, writing, rows of boxes, hubs, 6 canonical molecules labelled as
such) with 0 false reads for every pack, 12 labelled reads, 216 corpus
circles said as the bubble's very structure. The 2,000-mark board with
basics@1 and flowchart@1 in use: replay 263 ms (257 with none), cold 306
(295), a stroke 0.16 / p95 0.22 ms (0.16 / 0.21), 16.9 MB (16.8), 39 groups
chipped by a pack — `bench/budgets.test.mjs`, now three tests, green. The
surface: the control centre's last tile, *packs*, and its pane
(`23-packs.js`) with *use* / *stop using*; a match's pill and chip say its
pack (`molecule 0.91 · basics`); the standing line, the tile, the pane and
the MCP hand's look say a pack the build lacks. e2e 50 now uses flowchart@1
(the affinity is the pack's); e2e 51–51f and the boards scenario's N17 (the
journal through a reload). *Found:* a summon's matches were read once, when
it opened, so a field standing while a pack was used went on offering what
it had — `use`/`unuse` now re-read every hand's open summon, as a correction
re-reads its corrector's; and the canvas scenario cannot test the journal at
its end (a room or folder opened earlier stops the browser's own board), so
the journal's record is the boards scenario's. *Not changed:* a pack's
reading of a single mark does not join the reading under a mark (`canLift`
stays false there): a definition matches groups, and a lone circle's bubble
is offered when it is held. Whole suite before the last commit: core 1,194
in 90 files, typecheck clean, both bundles equal to a fresh build; relay,
field, build, board and release tests 107; surface and app in sync; the
canvas MCP smoke and the shard's (606 in 31 files, typecheck clean) pass; the
gate 546 passed and the one honest skip (canvas 314, keep 31, boards 20, app
14, pencil 14, budgets 7 — open 504 ms, release 40 ms on 2,000 marks, the
500-mark paint equivalence differing in 0 — shard 123 + 11 + 12); WebKit
smoke 4 and pencil 14.

### Phase 2 — editing
**E1 Handles** — `CONTROL-POINTS-PLAN.md` P2 as written, with the rule that
handles show when exactly one mark with a clean form is selected. *Red
first:* `reshape` replay and undo in core; an e2e record that drags a
rectangle's corner. **E2 Bindings follow** — P3 with the amendment in §4.
*Red first:* move a box, its bound arrows follow; undo the move, they
return; merge order does not change the result. **E3 Ports, heads and
figures** — the ports hook beside `magnetSites`, connector heads read at a
line's end, lines meeting read as one figure. *Red first:* synthetic
connectors with each head kind; a two-stroke diamond and a three-line
triangle read as one figure each. *Trap:* *filled* is ink coverage, and a
fast hatch leaves gaps; measure coverage relative to the head's own area.
*Status, 27 Sep 2026:* E3 built in core on `w2-maths` —
`session/ports.ts` (a notation registers and its point and continuous ports
come back through `magnetSites`, `nearestMagnet` and `magnetsNear`; a place
along a port is `along:<notation>` with its share of the port in the index,
found again by `siteOf`; with none registered every query equals a golden
captured before the hook), `diagram/heads.ts` (the arrow's own barb, a small
triangle, diamond or circle on the axis, a separate chevron, a fill; filled as
coverage of the head's own inside — 804 of 810 hand-drawn heads right, the
misses a shaky, heavily rounded triangle read as a circle 0.37; writing at an
end is a label) and `diagram/figures.ts` (ruled strokes whose ends meet, bound
or touching, as a triangle, a quadrilateral, a diamond said as one turned
about 45°, a rectangle when its corners read right; sides keep their marks;
`solveBoard(state, { figures: figuresOf(state) })` gives the three-line
triangle 25.30″ with the single stroke's conflict and other reading) — 48
tests, core 892. Left for D1: a diamond drawn as left and right halves inside
the word window is gathered as a word (`session.ts`) and so is no figure; a
fill that crosses a head's outline three times is a scratch and erases it; the
session's inferred wire lands on a head, not the node beyond its `tip`.

**E1 Handles — status, 28 Sep 2026: done on `w2`** — `f6e7c3a` (red: 26 of 27
core tests in `session/handles.test.ts` against the contract with nothing
behind it, and e2e 52, which found a press on a box's corner in the move zone
moving the ink), `2fe798c` (core), `207e1ca` (the surface), `7eb87f3` and
`6f72a2e` (red, then green: a loop that waits is never reshaped, at the door
or on replay, as snapping never offers it), and the docs.
`session/handles.ts`: `handlesOf` — the magnets' own sites of the clean form
held or offered, never a notation's port, and for an arc its ends and its
bulge; none without a clean form. The event is `reshape { id, handle, to, at
}`, `handle` `{ kind, index }`, `to` in the mark's own space (`unplaced`,
nodes.ts), so a move merged either side of it carries it and the reducer
places nothing; the door, the preview and the replay run one function
(`reshapePreview` → `reshapedClean`), one event is one act, the `'clean'` rep
is replaced (with `reshaped`) and the ink never touched, and a mark not yet
snapped is born reshaped. Per shape: a box keeps its frame, turned or leaning
(a corner taken in the frame of the sides meeting at the corner across, which
stays; an edge middle moves its side across only; the centre moves the form
whole; past the side across it flips, each corner keeping its number); a
circle's cardinal sets its radius, its centre moves it; a line's end moves
that end; an arrow's too, the head kept at the tip, its barb between a
fortieth and a fifth of the shaft so the form reads back as an arrow; a
triangle's corner moves freely; an arc's end turns and scales it about the
other end (its sweep kept), its bulge bends it through the chord's
perpendicular; a dot moves; nothing under `MIN_EXTENT_PX` of the hand.
**Readings:** the clean form is authoritative for where the mark stands —
`boundsOf` and `standingPointsOf` return it, and the relations, the index,
the scratch, tidy and every hit read them, as do its sites and its maths —
and the shape rung's readings are not recomputed, because they measure the
ink and the ink is as drawn: a box dragged into a thin bar is still a
rectangle, and its maths says 400×6. **The zone rule** (`05-selection.js`):
each handle — the selection's scale corners and knob, the mark's own points —
owns the ground nearer to it than to any other, within a handle's reach, the
selection's winning an exact tie; the rest of the outline is the move zone.
The surface draws rings (a dot in those that move the form whole), none under
48 px on screen, the form previewed in front with the ink faint beneath, the
standing line adding *a ring to reshape*; a pen reaches a handle by the
mouse's path, and a finger that pans while a pen is present never reaches
one. e2e 52–52e (a box's nine points and its corner dragged; the magnets
following; one undo; both sides of the corner's overlap; the knob and the
move zone on a reshaped box; none on writing or two marks) and pencil P11.
Core 1,226 in 91 files (handles 32; the room oracle now draws reshapes — 200
seeded rooms, 281 reshapes, every board the full merge). *Found:* a moved or
tidied mark offered its magnet sites where it was drawn (and a held circle's
cardinals sat on its ink's box, not its clean circle); `placed` fitted an
axis the ink has no extent on by a factor of nothing, so a flat line moved
and its end dragged up collapsed — both fixed; `bench/equivalence.mjs`
against `b353adc` reads every held log the same but for exactly those sites
(a moved line and a tidied row in the scripted log; 17 snapped circles'
cardinals on the 500-mark board, under a pixel). *Not changed:* a notation's
symbols, ports, heads and figures still read the ink, a reading (E2 and
D-units: `standingPointsOf` is where a mark stands); a reshape has no owner
rule, as a move has none. *For E2:* a `reshape` changes only the `'clean'`
rep, and `siteOf` of a binding's `{ kind, index }` answers where the site
stands after it; a connector's own bound end dragged by its handle moves its
form and leaves its `bound-to` claim as it stood — whether that lets the end
go, or binds it where it lands, is E2's. Whole suite before the last commit:
core 1,226 in 91 files, typecheck clean, both bundles equal to a fresh build;
relay, field, build, board and release tests 107; surface and app in sync;
the canvas MCP smoke and the shard's (606 in 31 files, typecheck clean) pass;
the gate 553 passed and the one honest skip (canvas 320, keep 31, boards 20,
app 14, pencil 15, budgets 7 — open 504 ms, release 35 ms on 2,000 marks, the
500-mark paint equivalence differing in 0 — shard 123 + 11 + 12); WebKit
smoke 4 and pencil 15.

**E2 Bindings follow — status, 28 Sep 2026: done on `w2`** — `2c73eff` (red:
22 of 25 core tests in `session/follow.test.ts` and e2e 53/53a against the
contract with nothing behind it), `b9167c0` (core), `f6ba5bc` (a manipulation
and the hand's decisions as pure functions), `221db7b` (the surface),
`c2c8735` (the budget), `e1cfa88` (the trap's tests), and the docs. **The
derived form** is a `'follow'` rep: an affine map in the connector's OWN
space, applied before the hand's transform and turn (`placed`, nodes.ts) —
a `'transform'` is a frame and a turn about its centre and cannot say *turn
about this end and stretch* — computed in the apply path (`followed`,
`session/follow.ts`) after every move, scale, turn, tidy, reshape, snap,
proposal and bind, down the chain of connectors bound to connectors, and
never logged. One bound end pivots and stretches the connector about its free
end; two are carried by the one similarity that takes both; both on one moved
mark translate it; both on one site take the mean step — never a collapse.
Composed onto where the connector stands, an erased target moves nothing and
a binding let go leaves it where it stood; a bind carries its end onto its
site at once, so a move merged before the bind or after it gives the same
board. A follower is filed where it stands and its wire read again, so a
moved box's arrow still points at it. **The director's decision, as built:**
a connector's own tail or tip dragged by its handle binds where the pen's
magnet holds it (the old claim for that end replaced) and lets go anywhere
else — a new event, `unbind`, keyed by the end as BIND-1 removes — and moved
whole (a move, scale or turn of it, or its middle handle) it lets go of the
ends no longer within the magnet's reach of their sites; the door writes the
unbinds, the reshape or move and any bind in one act. No case proved it
wrong; two refinements: a nudge the magnet still holds lets go of nothing
(the follow puts the end back), and a free end dragged onto a magnet binds
too. **Ports follow:** the flowchart reads a lone symbol's ports from the
clean form it holds, and a bound port is found by the notations the engine
knows (`knowPorts`, `boundSiteOf`), offered on the pen or not — state stays a
pure function of the log. **The surface** draws what follows a drag before
the hand lets go, by the functions the replay runs (the preview is the act),
and a connector's end handle feels the magnets with the pen's ring; e2e
53–53d. **Budget:** a move carrying ten bound arrows costs 1.02 / 1.50 ms on
the 2,000-mark board (0.09 ms with none; 1.20 / 1.90 ms at 5,000), held to a
stroke's budget in `bench/budgets.test.mjs`, whose R4b budgets still hold.
**Equivalence** against `deab00d`: every held log and the 500-mark board read
the same; the scripted log reads differently in its one bound connector
alone — a line tied to a box tidied, scaled and turned before the bind — from
the bind on: where it stands, its sites and heads, its wire, the board's and
its cluster's reading (now a flow), that cluster's signature, the briefs.
**Found:** a two-wing arrowhead whose tip lands on an outline crosses it three
times and rubs the box out, so an arrow drawn to a box stops short and the
bind carries its tip on; the rung's arrow tip, which a clean arrow and its tip
handle are built from, can sit a wing's length short of the ink's (the follow
reads the ink's tip, the pen's first reach farthest along the shaft); a head
drawn apart is bound to nothing and does not follow (Mermaid in's arcs and
`<-->` starts); `relate`'s touching is overlapping boxes, so a tip landing on
an edge touches by a float's last bit, and the tests measure the gap instead.
**Not changed:** a follower's stored relation edges (as for any moved mark);
a notation's ports that change with their context are found again at the next
trigger. **For D7:** the follow is a similarity of the whole connector, so an
orthogonal route must be derived again from its bound ports, never carried —
`boundSiteOf` says where each stands, `followed` is the seam to replace for a
routed connector, and `unbind` and the doors' rules apply to its ends.
**For D3's surface:** an imported diagram's connectors follow with no work
(their tips are ink on the ports, so nothing moves at import), its port
bindings resolve without the pack in use, and its heads drawn apart stay
behind. Whole suite before the last commit: core 1,348 in 94 files
(follow 30), typecheck clean, both bundles equal to a fresh build; relay,
field, build, board and release tests 107; surface and app in sync; the
canvas MCP smoke and the shard's (606 in 31 files, typecheck clean) pass; the
gate 558 passed and the one honest skip (canvas 325, keep 31, boards 20, app
14, pencil 15, budgets 7 — open 504 ms, release 34 ms on 2,000 marks, the
500-mark paint equivalence differing in 0 — shard 123 + 11 + 12); WebKit
smoke 4 and pencil 15; `bench/budgets.test.mjs` three of three; the room
oracle at 200 seeds.

### Phase 3 — diagrams
**D1 Flowchart** — `src/notations/flowchart.ts`, the `flowchart@1` pack,
the notation reading in the field and the panel, the ports. *Red first:* a
hand-drawn flowchart fixture (jittered, several strokes per symbol) reads as
a flowchart; a wireframe fixture does not. *Trap:* rotation — the diamond is
known only by its clean form's angle.
*Status, 27 Sep 2026:* D1's core built on `w2-maths`; the surface's display
(the field's *what this is* row, the panel's *becomes* row), the
`flowchart@1` pack (B3) and a board's `use` offering the ports are still to
come. `notations/notation.ts` — a notation's symbols and connectors each play
one of the six roles and add none; `notationsOf(state, scope?)` asks every
registered notation, plural and ranked, leaving out one that throws or names
a seventh role; a reading gives each symbol with its readings and ports, each
flow with its direction and its ends read past its heads, each label, and
every mark's role; `offerPorts` puts a notation's ports through E3's hook,
never by default. `notations/shape.ts` reads an outline by its corners (the
four on its hull and the share they hold, how upright, how turned, how it
leans). `notations/flowchart.ts`: process, decision (one stroke; two; two a
word gathered), terminator, data, start and end; flows directed by their
heads, a magnet's bind first; labels inside a symbol or beside a flow; the
content is `FLOWCHART_TABLE`, each symbol's Mermaid included, bound for the
pack. The bench: 36/36 hand-drawn flowcharts read (0.76–0.80), 288/288
symbols, 288/288 flows, 216/216 labels; boxes tilted to 12° 72/72
processes; diamonds 48/48 in one stroke and 48/48 in two; the wireframe, the
molecule and a line of writing 0/8 each above the floor (0.5) — 51 tests,
core 943. The trap's answer: a rectangle's clean form is its upright bounds
and carries no angle, so the diamond is read from the corners on the ink's
own hull. Found, for their owners: a diamond drawn as left and right halves
inside the word window is still gathered as a word, because `absorbIntoWord`
(`session.ts`) hands `words.ts` bounds only and bounds cannot tell `< >` from
`( )` — the fix needs the strokes' ends in `session.ts`; the notation reads
the word's two strokes as the figure they make, so D1 does not wait on it.
A box drawn as two L-shaped strokes is two *arrow 0.59* readings, so
`figuresOf`, which skips arrows, never sees it (ruled in four, it reads). A
square diamond, which the rung reads as *rectangle 0.82*, is offered *Draw it
clean* as its upright bounding box (`clean.ts`) — a decision redrawn as a
process. (Both fixed by S1, below.)
**S1 The shape rung holds a diamond, an L and a wide arc** — a correctness
unit, found by D1 and the maths lane, before diagrams reach the surface:
*Draw them clean* redrew a diamond as its upright box, an L read as an
arrow (so a box drawn as two Ls was two arrows and no figure), and a wide
arc read as a line. *Owns* `recognition.ts`, `geometry.ts`,
`session/clean.ts`, their tests and benches. *Red first:* boxes turned
0°–45° drawn clean at their angle, Ls with no arrow reading, arcs by sweep,
a flowchart drawn clean and read again. *Trap:* the barb's length, not its
angle (raising the angle loses real arrows); the arc measured on the
denoised path, or a slow wobbly line becomes one.
*Status, 27 Sep 2026:* built on `w2-maths`. A rectangle's clean form is its
tightest box at any angle (`tightestBox`), squared up only within the
hand's wobble; an arrow's barb must be short against its shaft or a flick in
the hand's space, and says its ratio; a stroke that bows evenly — swept,
shown past a straight line's bow on screen, spread, round — reads as an arc
and the line gives way (`bowOf`); a line that bends is not offered clean;
an arrow's clean form keeps its barb and reads back as an arrow. Benches:
the recognition corpus unchanged (1674, 99.9%, every row); arcs 30°–300°
1295/1296 read as arcs, every steady one (0 of 864 under 180° before); no
L of the red test carries an arrow reading (they were 0.53–0.60), and of
1008 swept arrows every one with a barb under 0.4 of its shaft or 16px
still reads first; the clean bench's corpus rows unchanged, turned boxes
864/864 at their own angle (864 off before), arcs offered 1293/1296 (288,
with 709 offered as lines), every clean form reading back as its shape;
figures: a box drawn as two Ls is one rectangle; the flowchart bench drawn
clean keeps every decision — 72/72 on the boards (43 before), 48/48 in one
stroke (32) and 48/48 in two (12) — core 967. Found, for their owners: a
data symbol drawn clean reads as a process (36/36) — the rung reads a
parallelogram as a rectangle and its tightest box is upright, so that offer
needs the hull's corners (D1) or a rung that sees a lean; `measure.ts`
gives a turned box's width and height from its bounds, not its sides (the
maths lane); `inferWire` (`session.ts`) wires only a top *line* or *arrow*,
so a curved connector that now reads as an arc gets no wire (the main
lane); and John's own arrows are not in the repo — the barb rule was
checked on synthetic hands and D1's arrows, and wants his strokes (R1).
*Status of two of those, 28 Sep 2026 (fixed in D2's lane, `w2-maths`):*
**the data symbol after clean** — a box drawn leaning keeps its lean
(`clean.ts`, `leaningBox`): the four corners on the ink's hull (D1's
`shape.ts`) place its sides, each side's direction is fitted to the ink
along its middle run (a hand rounds an acute corner more, so the chord
leaned with the rounding, up to 5.5°; fitted, 3.1°), and past
`LEAN_KEPT_DEG` with its sides parallel in pairs within
`LEAN_PARALLEL_DEG` (which refuses a trapezoid) its clean form is the
tightest parallelogram with those sides that holds the ink, top and bottom
laid level within the hand's wobble. 1,548 hand boxes lean 4.4° at most by
this measure, data symbols 22°–27°. The flowchart bench after *Draw them
clean*: data 36/36 (0 before), every other row unchanged; the clean bench's
rows unchanged, and a new row of 108 boxes drawn leaning 12°–24° either way
offered 107/108, wrong 0, read back wrong 0, off its lean 0 (107 before).
**A turned box's sides** — `measure.ts` measures a rectangle from the four
corners of its clean form where the mark stands (held, else offered, else
the tightest box around the ink): width the side nearer level, height
across to the opposite side, and a `lean` for a leaning box. Unchanged for
every box whose clean form is its bounds (the corpus's 540 of 540, the
flowchart's upright processes); changed for the 864 turned boxes (e.g.
216×167 → 200×140), processes tilted 6° and 10°, a box within 5° whose
bounds are looser than its own box by more than `BOUNDS_SLACK` (a 400×20
bar 2° off level measured 400×33, now 400×21 — as its clean form is drawn),
and a leaning box (its base, not its bounds). Found, for its owner:
`maths/dimension.ts` makes any rectangle-read mark a figure of kind
`rectangle`, whose rules assume right corners; a clean form that carries a
`lean` is a parallelogram and wants `quadrilateral` there (the maths lane).
*Status of that, 28 Sep 2026 (fixed in D3's lane, `w2-maths`, item 0):*
`figureOfMark` reads the clean form it measures — held, else offered — and
one that carries a `lean` is a quadrilateral, each side standing alone, its
lean said in the reason; an upright or turned box is a rectangle as before.
Red first: a data symbol ruled and by hand, and held clean, was `rectangle`;
labelled 30 and 10, solved as one it was given a diagonal of 31.62 and an
area of 300. Every other maths test unchanged (170 in `src/maths`).
**W1 Drawing a diagram never destroys or swallows what it connects** — a
correctness unit, found by E2, D4, D5 and D1: an arrow whose two-wing head
landed on a box's outline crossed it three times and erased it; a short
vertical flow with *yes* written beside it was gathered into the word; a
diamond drawn as two quick halves was a word. *Owns* `session/erase.ts`,
`session/words.ts`, the word and scratch paths of `session/session.ts`.
*Status, 28 Sep 2026: built on `w2`* — `38c09f0` and `205c8fb` (red: 24
core tests, then the sequence lane's two — an open target, a head drawn
apart), `d163d44` (a head is not a scratch: every crossing where the stroke
meets the mark — the barb at an end, an end on the mark's ink or a bindable
site, an end of the mark drawn over — rubs nothing out; 30 of 30, and 324
real scratches across a box, a circle, a triangle and a line erase exactly
what they did), `612043a` (a connector that meets what it connects, or is
long against the run's x-height, is no letter; halves whose ends pair into a
figure are no letters; a head drawn apart is its connector's — 20 of 20),
`3de4936` (the cheap run check first). Every bench prints what it printed at
`b6bee71`, line for line (recognition 1,674 at 99.9%, clean, command mark,
flowchart, class, packs); budgets on 2,000 marks: replay 324 ms, a stroke
0.18 ms. *Left, said plainly:* the unit was stopped before its e2e records
(an arrow drawn into a box and *yes* beside a flow, with real pointer input)
and before it had itemised why the generated 2,000-mark board reads 62 edges
differently (strokes that no longer gather into words, most likely);
both are the first things the next session owes it.
**S2 An arrow is read where its ink points** — the rung's arrow tip a wing
short of the ink (E2), a long arrow's small head lost while *line* leads
(D5), `strokeFor`'s barb too small past ~1,200 px (D3), a head's fill given
to the box beside it (D4), a flat diamond's sites at its box's corners
(D3). *Status, 28 Sep 2026:* briefed; stopped while surveying, before any
commit. The five findings stand.
*Status, 29 Sep 2026: built, all five, in core* — each red first, alone, then
its fix: `1926890`/`e661cdf` (the rung's arrow tip is the stroke's own point
the pen first reached farthest along the shaft: `inkTipIndex` /
`arrowTipIndex` in `geometry.ts`, the one home, which `diagram/heads.ts` and
`session/erase.ts` now ask instead of each working it out; the tail was
already the stroke's own end), `555be74`/`05c2a2f` (a head that is a sliver of
a long stroke is read at the hand's own scale — `readHead`, `headSeenOf`:
the corners' reading stands where the head takes `HEAD_SHARE_SEEN` of the
path, else the surer of the two, and the line gives way exactly as far only
where the hand-scale read found the head; every arrow the corners read keeps
their reading to the digit; a liftoff hook and an L stay lines), `57567a2`/
`12cf569` (`strokeFor`'s barb is a thirtieth of the shaft past 1,200, inside
the fortieth to a fifth a clean arrow keeps), `fb27088`/`b77d1f3` (a closed
mark that reads as no head takes no fill: the class's box at a long
relation's end no longer takes the diamond hatched against it),
`f194b77`/`fad9847` (a closed outline the rung read unsure whose best four
corners hold it offers those four as its sites, `INK_CORNERED`; an oval, a
pentagon, a hexagon, a flat triangle and writing keep their bounds). Two
goldens changed by design, each in its own commit: `6fd5d55` (the magnets
golden: the board's arrow's tip site is (599.90, 119.72), was (578.97,
103.85), its middle with it, a nearest-site query that answered null now
answers the tip) and `8127ee9` (`flowchart.test.ts`: the nearest site at a
flat decision's left vertex is now its own corner, the port `left` on the
same point; a mark's own site leads a tie, as D3's Mermaid in relies on).
`follow.test.ts`'s precondition (the rung's tip stands short of the ink) was
the finding itself and now says the tip is the ink's. Core 1,724 in 106 files
(13 new); shard 606; every bench as it was (recognition 1,674 at 99.9%,
clean: zero wrong snaps, command mark, flowchart, class, sequence, packs);
`bench/equivalence.mjs` against `ef460f5`: no shape reading, weight or reason
of any held log differs, only where an arrow's tip stands (its rep, sites,
maths, the wires and briefs that follow from it); one stroke now costs 0.245
ms against 0.228; gate `canvas` 350 passed, 1 skipped, `pencil` 16 (e2e 49's
golden unchanged). *Found, for other owners:* `notations/uml-class.ts`'s
`headApart` and `mermaid-in.ts`'s scaling of long arrows are workarounds for
what this fixed and may go; `notations/sequence.ts`'s `heldBarb` (`HELD_ARROW`)
now holds only what the corners and the hand-scale read both leave below a
line.
**D2 Mermaid out** — the exporter tool,
the `mermaid` kind in `kinds/kinds.ts` and its renderer in the `run`
sandbox, the export pane. *Red first:* the fixture's Mermaid equals a golden
text; the render is asserted when the library loads and skipped by name when
it cannot.
*Status, 28 Sep 2026:* D2's core built on `w2-maths`; the tool, the
`mermaid` kind, its render in the `run` sandbox and the export pane are
still to come. `notations/mermaid.ts`: `toMermaid(reading, opts)` finds
the writer its notation registered (`registerMermaidWriter` — D4–D6 add
theirs; none gives null) and returns `{ text, notation, diagram, direction,
ids, marks, links, unread, notes }`, at tier 1, nothing in the log. The
flowchart's: `flowchart TD`, or `LR` when the flows run across — measured
between the centres of the symbols each flow joins, the reason said, or
asked for; each symbol in `FLOWCHART_TABLE`'s brackets, each flow `-->`,
`---` or `<-->`, writing beside it as `|"…"|`; nodes in the drawing's
reading order and links by the nodes they join — never the log's order.
Ids are the marks' own said safely (`stroke:ada:7` → `stroke_ada_7`, a
figure → `figure_6_7`): a letter first, no keyword Mermaid's lexer reads
first, and ids that would say the same each take a suffix hashed from their
own id, so a name is a function of the set. Every label quoted and escaped
(`"`, `#`, `%`, backtick, `<`, `>`, `&` as Mermaid's entities, a break as
`<br>`, `:` too on a line its preprocessing would take for `style` or
`classDef`; `unescapeMermaid` is the exact inverse). Writing nobody has
read is written "(unread writing)", its marks in `unread`, and said in
`notes` beside the symbols with no writing and marks left out; a word a
hand put on its own ink (`label`) is its symbol's or flow's text. The
golden (`fixtures/flowchart.mermaid.ts`, by hand): all 36 of D1's hands
export one text before the writing is read and one after; the same text
after a replay, with the reading's lists shuffled, and for two hands merged
by any reader, in either key order or end to end either way. Mermaid 21
tests, core 1145. The surface's half must know: ink over the rendered
diagram maps back through `ids` (the symbol's id — a figure's is
`figure:a+b`, not a node) and `marks` (its real strokes); `links[i]` is
Mermaid's link `i`; `unread` is what *Read the writing* would read first;
pass `readWith` for words read with their line; the text ends in a newline.
*Status, 29 Sep 2026 (D2's surface, `worktree-agent-a35e1c2ccf0ea1cb6`):* the
tool, the `mermaid` kind, its frame in the `run` sandbox and the export pane
are built. Red first (`1db61f7`: `kindOf('flow.mmd')` undefined and the tool's
module missing; `73c0cb5`: e2e 62–63, `mm.mermaidFrom is not a function`), then
`4af4c79` (the kind, `tools/mermaid.ts`, one registration line appended at the
end so e2e 49's golden and the field's order stand — the canvas scenario's 49,
50 and 51 pass unchanged), `b44a293` (`mermaidFor`, the one home for what reads
as a diagram worth saying, shared by the tool, the export row and the frame's
part names) and `16e3102` (the surface). The frame loads mermaid.js as three.js
is loaded — pinned 11.4.0, cdnjs then jsdelivr — beside its text, `strict`,
nothing played; **the text always stands** (shown at once, kept with a note when
the library cannot load or read it, hidden only behind a drawn diagram, whose
strokes are the board's ink); each node is a part named for its Mermaid id and
ink over it is read back to the marks (`mermaidPartNames`, `25-mermaid.js`). The
render is asserted when the library loads and skipped by name when it cannot:
62c runs the plumbing against a stand-in the gate serves
(`e2e/fixtures/mermaid-standin.js`, a test double of the library's contract),
62d the real library — **skipped here: this container cannot reach either CDN**;
it was run once by hand with the real mermaid 11.4.0 (from the npm tarball)
answering the CDN's URL, and passes — 62e the text standing with no library,
62f a refused text, 62g the export row's file equal to the golden. e2e 62–62g2:
ten records. Core: `tools/mermaid.test.ts` 9, `kinds.test.ts` +1. Found, for
their owners: the MCP hand's `canvas_write` already places kind `mermaid`
(`MM.rowOf`) but its error message does not name it (`Demos/mcp.mjs`); a figure
symbol (a decision drawn in two strokes) is one part naming its strokes; and a
board of two diagrams names parts only for the diagram the tool made this
sitting (the whole-board reading says one text, not two).
**D3 Mermaid in** — the parser, the layered layout, drawing
through `strokeFor` with bindings. *Red first:* export of import is the
original text, normalised; import of export reads as the same notation.
*Status, 28 Sep 2026:* D3's core built on `w2-maths`; *Draw it* from a
`mermaid` artifact and a pasted or dropped `.mmd` are the surface's, still to
come. `notations/mermaid-in.ts`: a reader per diagram keyword
(`registerMermaidReader`, symmetric to D2's writers; the flowchart's reads
`flowchart`, `graph`, `flowchart-elk`); `readMermaid(text)` → `{ keyword,
notation, direction, nodes, links, notes, refused }` and `drawMermaid(session,
text, { at, scale?, participantId?, origin? })` → `{ notation, direction,
ids, links, notes, refused, bounds, lastAt }`. Read: TD, TB, LR, RL, BT; the
six shapes `FLOWCHART_TABLE` writes, and eight more drawn as the nearest and
said; `-->`, `---`, `<-->`, `--->`, `-.->`, `==>`, `--o`, `--x`; labels
`|…|` and `-- … -->`, quoted and bare, decoded with `unescapeMermaid`;
chains and `&` groups; `%%`. Refused with its line, never thrown: styles,
a subgraph's frame (its contents are read), interactions, directives, front
matter, a flow to itself, `~~~`, `@{ }`, a line it cannot parse, an unknown
diagram. `notations/layered.ts`: ranks by the longest forward path, never
above the node written before, so **the text's order is the reading
order** — the choice the round trip rests on, where barycentre ordering
would have reordered a D2 text that has a crossing; barycentre passes set
places only; links back break cycles, each said; the ranks stretch until the
flows run the header's way as D2 measures it; when every link would run
within a rank, every link crosses one. Drawn: a clean form D1 reads as each
symbol — a process and a start or end through `strokeFor`, a decision a
square turned 45° (a flat one reads as a triangle or a box unsure), data a
box leaning 22°, a terminator a stadium within 2.6:1 — sized from its words
within a factor of two, in the hand's space at the scale given, declared
content by the importing hand; each connector port to port, straight or an
arc with closed triangle heads, bound at both ends at a site the mark offers
itself (every end in the tests; `DrawnEnd.of` says so); every word a `label`
on its own ink. heads.ts reads at a connector's end any mark small beside
it, touching the end and on its line — another connector, a head drawn
apart, the symbol itself — so ends sharing a port lie 45° apart, and a way
that brings any mark past those gates is read first on a scratch session and
taken only when every end reads as drawn; what cannot be made to read is
said. Only strokes, binds and labels enter the log; wrapped in
`session.withTool` it is one act. The round trip: D2's two goldens, five
fixtures (`fixtures/flowchart.mermaid-in.ts`: LR, labelled links both ways,
a cycle, every shape and link, escapes) and a text a hand wrote come back,
all 36 of D1's hands exported and drawn back read as the same notation, and
60 seeded random charts plus 15 at 0.25× and 4× (`randomFlowchartText`) —
Mermaid-in 74 tests, layout 16, core 1237. Run once beyond the suite: 1,000
random charts of up to 12 nodes, 300 at each of 0.25× and 4×, 150 of up to
30 all come back; of 60 of up to 60 nodes (≈90 links) two dense ones keep a
misread and say so; a 45-node, 59-link chart draws in 0.36 s. Found, for
their owners: `strokeFor`'s arrow caps its barb at 40 units, so past about
1,200 px an arrow drawn by it reads as a line (D3 scales long ones; a model's
`agent.draw()` does not); heads.ts reads the symbol a connector ends on as a
head too, and a triangle drawn apart at a decision's vertex can be swallowed
as the diamond's fill, so a curved connector a hand draws into a decision
may lose its direction; a short connector along a longer one's line where
they meet is read as its head (the flowchart and heads.ts); and a flat
diamond offers its bounds' corners as sites, not its vertices (magnets).
The surface's half must know: call it inside `session.withTool` with `at`
now, `scale` 1/zoom and an `origin` (beside everything on the board when
none), off the pointer's path (synchronous, ~0.4 s at 45 nodes); preview
with `readMermaid` and offer *Draw it* only when `notation` is set; say
`notes` and each `refused` line; `ids` and each link's `ids` are the marks
to select or fit (`bounds`); words are labels, which the surface draws
above a mark's top-left, not inside a symbol; declared content leaves an
open field standing; at most 60 nodes and 120 links, the rest said.
*Status, 29 Sep 2026 (D3's surface, `worktree-agent-a35e1c2ccf0ea1cb6`):* *Draw
it* is built. Red first (`60ca34d`: `tools/mermaid-draw.ts` missing; e2e 63 in
`73c0cb5`), then `2ce0955` (the tool: one `mermaid` artifact held alone whose
text `readMermaid` reads, first among what it affords; taking it names the host
act), `16e3102` (the host act, `drawMermaidFrom` in `25-mermaid.js`: `drawMermaid`
inside the tool's stamp, `at` now, `scale` 1/zoom, `origin` right of every mark
on the board, the field closed, the drawn marks selected and the view fitted,
one sentence in the status line — *drew a flowchart from a.mmd: 60 nodes and 59
links — the text holds 64 nodes and the board draws 60 at most…*, each refused
line with its number and words — never thrown; a dropped or pasted `.mmd` held
where it lands, *Edit the text* on a mermaid artifact so the round trip is by
hand) and `b6f529b` (words inside symbols). **The paint is held while the
diagram is written** (`holdPaint`, `08-render.js`): 300 events painted one by
one took 7.6 s at 45 nodes on the surface, and one paint takes 0.5 s — the plan's
"synchronous, ~0.4 s at 45 nodes" was the engine's, not the page's. **Words
inside symbols is a real change of the label rule, made narrowly and by design**
(`labelInside`, `08-render.js`): a label on a closed mark — the clean form it
holds, else its own closed ink — is drawn centred inside when the whole box the
words fill is inside the outline (a diamond and a circle hold fewer than a box);
an open mark, an artifact, a body in a running tank and a word too long are
captions above the mark as before. Golden changed by design: e2e 39 asserted the
old place for a word that fits (above the top edge, at the box's left) and now
asserts it inside and centred; 39g keeps the old rule covered; no other label
record asserts a place. e2e 63–63h: ten records — the editor opened on the
artifact and a new version keeping its kind, Draw it first with what the text
reads as, five symbols and four flows read back as a flowchart with the new
node's word inside its symbol, beside everything and selected and fitted, the
sentence, one act and one undo, a style line refused with its line and the rest
drawn, no offer for an unknown text or a text file, and the caps said. The whole gate:
629 passed, 0 failed, 7 skipped in 603 s — canvas 370 and two skips (25d, 62d), keep 31,
boards 20, app 14, pencil 16, models 19, seat 12, budgets 1 and its five measures
skipped by name (load 5.0 on 4 cores), shard 123 + 11 + 12; core 1,727 in 108
files (a first run under that load timed out two of the notations' heaviest,
mermaid-in's caps and a seeded chart, at five seconds; alone and on the rerun all
pass); typecheck clean in core and the shard; relay, field, build, board and
release tests 117; surface and app in sync, both bundles equal a fresh build; the
canvas MCP smoke passes; WebKit not run (unavailable here). Found, for their owners: the first arrow of e2e 50's flowchart — a
20-unit wing on a 62-unit shaft — is written `---` by D2 (no head read), the
other two `-->`; `62` and `63` draw a 14-unit wing so all three flows read, and
record 50 is unchanged. Probably the barb's share of a short shaft
(`BARB_OF_SHAFT`); not investigated.
**D4 UML class**, **D5 sequence and state**, **D6 ER and mind map** — one
notation module and pack each, each with its golden Mermaid and its bench.
*D4 status, 28 Sep 2026:* D4's core built on `w2-maths` (`27e5ac0` red —
A2 as a core test, 38 failing — then `abc6605`, `b98889b`, `fd16b6f`,
`d87a1f4`); the field's and the panel's display, the `mermaid` kind's render
of a `classDiagram` and *Draw it* are the surface's, still to come.
`notations/uml-class.ts`: a **class** is a box with one or two lines across
it, side to side — its compartments — read in the box's OWN frame (the
tightest box at any angle, each axis tried as the one its lines run along; a
compartment line lies level in it, runs straight, reaches both sides within a
hand's miss or overshoot and stands inside), never from the relation or role
tables (the trap: they call a compartment line `inside` and a box holding
boxes a frame); a compartment line is ruled — a line of writing across a
class from side to side zigzags across its own line at every letter
(`zigzagOf`), and is a member (only writing flatter than a hand's wobble,
which the rung too reads as a line, is taken for a compartment line); a box
holding a mark that is no writing is a sketch, three lines across a table, a
box holding boxes a frame — none a class, each said.
The name is the writing in the top compartment (or a word on the box); each
line of writing below is a member — attributes above methods, a **method only
when read words say so** (`METHOD_WORDS`: a name straight into its
parentheses), never invented; unread, a member whose words are not known. A
**plain box** is a class with only a name, read lower, and only where a
compartment or a UML head says UML — boxes and lines are what every diagram
has. **Relations** by `headsOf` at each end, past the head, a bind first:
hollow triangle inheritance (`<|--`, at the parent), filled diamond
composition (`*--`), hollow aggregation (`o--`), open arrow (or a filled
triangle) association (`-->`), none a link (`--`); **a head read first as a
circle degrades** — to the first head a class relation has, less surely, a
plain link its other reading — and a mark that reads as no head is said
(90 small shaky triangles: 80 inheritance, 9 a plain link saying so, 1 read
first as a hollow diamond with the inheritance among its readings; none lost
silently). **Multiplicities** are short writing near an end — a "1" as one
stroke counts — credited to the line they stand beside. **Dashed lines are not
read**: a dashed line is several strokes, and gathering them into one
connector is a perception of its own that D5's sequence messages need too, so
D4 reads solid lines and the reader draws `..>` and `..|>` solid and says so.
Ports: each class's four sides, continuous (`along:uml-class`). Plural with
the flowchart: A2 reads *a UML class diagram 0.91* above *a flowchart 0.62*;
a compartment box beside flowchart symbols reads both ways, the flowchart
first. `notations/uml-class-mermaid.ts`: the writer — `class id["name"]
{ … }` (attributes, then methods; an attribute's parentheses written as
entities, so Mermaid never takes one for a method — unread writing in a member
is `#40;unread writing#41;`), relations from the marked end (`P <|-- C`,
`W *-- P`, `W o-- P`, `F --> T`, a link in reading order), cardinalities
quoted, a label after a colon, `direction LR` when the relations run across;
D2's ids, quoting, placeholder and order. The reader — the writer's subset and
a hand's forms (member statements, generics, dashed drawn solid, a namespace's
contents; notes, styles, lollipops and annotations refused with their lines)
— drawn by D3's layered layout: each class a box with two lines across it, its
name a label on the box and each compartment's members a label on the line
that opens it; each relation side to side (an arc around a class in the way),
ends sharing a side spread along it and bound there (`along:uml-class`) or at
the box's own edge middle; heads apart as confident shapes (a triangle, a
square turned 45°, a hatch right after its outline) and a multiplicity a dash
beside its own line carrying its words — every mark a confident shape, so the
letter rules gather none; read back, what does not read as written is said.
`uml-class@1` (`packs/shipped/uml-class.ts`) names the notation and restates
none of `UML_CLASS_TABLE`; its affinities lift clean forms and lining up;
its ports follow it on the pen. The bench (`uml-class.bench.test.ts`, 36 hands
of each board): the six-class board and A2 read as class diagrams 36/36 and
36/36, first among the readings both (the board 0.75–0.79); classes 216/216 +
72/72, compartment lines, names and members all right; inheritance 72/72 +
36/36, composition, aggregation and association 36/36 each; multiplicities
108/108; classes turned −30° to 30° 78/78; a filled diamond hatched within the
word window, gathered into a word by the letter rules, still a composition
12/12 (read apart on a scratch board); the flowchart bench, a wireframe, the
molecule and a line of writing 0 above the floor (highest 0.00). The round
trip (`uml-class-mermaid.test.ts`): the goldens (`fixtures/uml-class.mermaid.ts`,
by hand) and six texts come back exactly, every hand of the board exports its
golden before and after its writing is read, 50 seeded random diagrams at 1×,
0.25× and 4×, the board's hands exported and drawn back read the same;
beyond the suite, 400 random diagrams of up to 8 classes at the three scales
all come back, and 7 of 100 of up to 14 keep a misread (a multiplicity
credited to a neighbouring line, or no way around), 5 of the 7 said in the
notes. packBench: uml-class@1 has no definitions (the notation reads it), the
corpus — now 3,912 drawings with the class boards — 0 false reads; basics@1
96/96 and test-molecule@1 48/48 unchanged. A context on the 2,000-mark bench
board: 1.70 → 2.28 ms mean (max 4.6 → 8.5); a whole 2,000-mark board read
in 189 ms (the flowchart's 333). The flowchart, clean, command-mark and
recognition benches unchanged. Core 1,388 in 96 files. Found, for their
owners: **the letter rules gather a vertical relation with a multiplicity
written beside it** within the word window — a line under 150 px reads as a
letter — and the relation is lost 3 of 6 times (`session.ts`, `words.ts`; a
flowchart's "yes" beside a vertical flow is the same case); **heads.ts gives a
fill to the first closed mark at an end it lies within**, which on a relation
long beside its class is the class's own box, so the diamond beside it reads
hollow (the notation reads such a head apart; heads.ts's owner); a hatch
crossing a wobbly outline three times is still a scratch that erases it (E3's
finding). The surface's half must know: `notationsOf(state, scope)` gives a
`UmlClassReading` (each class's `name`, `members` with kind and compartment,
`compartments`, `turn`; each relation's `kind`, `readings`, ends with
`marker` and `multiplicity`); `toMermaid` maps each Mermaid class id to the
box (`ids`) and its box and lines (`marks`), `links[i]` to relation i;
mermaid.js decodes the entities itself; `drawMermaid` inside
`session.withTool`, as D3; a compartment line's label is its compartment's
members and belongs below the line, a box's label its name, a dash's label a
multiplicity; a bind at `along:uml-class` is found again only while the
notation's ports are offered (the pack in use); and e2e 51's golden list of
packs (`["basics@1","flowchart@1"]`) must add `uml-class@1` when the bundles
are rebuilt.
*D5 status (the sequence half), 28 Sep 2026:* D5's sequence core built on
`w2-maths` (`0aec805` red — A3 as a core test, 74 of 79 failing — then
`5ad9d77`, `67509de`, `dd419b3`, `a22129b`, `7889203`, `aacbb58`,
`3eec7ec`); the state diagram, the field's and the panel's display, the
`mermaid` kind's render of a `sequenceDiagram` and *Draw it* are still to
come. `notations/sequence.ts`: a **participant** is a box (one stroke the
rung reads as a rectangle, square and upright within a hand's tilt, or ruled
— figures.ts) or a **stick figure**, read as an actor — a circle, a body
running down from under it and at least one more short line beside the body
(arms or legs), all close under the head, its name the writing under it — at
the top of its **lifeline**: a long line within 20° of plumb, one stroke or
dashed, its top under the box's bottom middle, running down at least 1.5
times the box's height; pieces one under the next in one column are one
lifeline (a hand lifts the pen). Read from the geometry, never the relation
or role tables (the trap: the relation table has the lifeline touch its box):
a line with a head is no lifeline, nor one landing on another box or with a
head drawn at its top — a flowchart's flow, a class diagram's relation. A
**message** is a roughly level connector (within 25°) whose ends, past their
heads (heads.ts, a magnet's bind first), land on two lifelines — only its
ends say where it goes, whatever lifelines it crosses (A → C passing B is A →
C): solid with a head a call (`->>`), dashed a return (`-->>`), no head `->`
/ `-->` from the lifeline it was drawn from, a head at each end `<<->>` /
`<<-->>`. A **self-message** is a loop both of whose ends land on one
lifeline, bulging to one side; its head is its own barb (the pen folding
back out where it arrives, measured — the rung reads a short leg with a
two-wing barb as writing) or a head drawn apart. Messages are ordered by
height; a message's **label** is the writing just above it (a loop's above
or beside it) — writing includes a stroke that zigzags across its own line
(uml-class's `zigzagOf`), which a flat scribble the rung calls a line does;
a name is the writing in the box. Each lifeline is a continuous port
(`along:sequence`). **Dashes, built**: `notations/dashes.ts` reads short
straight strokes in a row as one dashed line — both ends of each in the
row's corridor (a corridor in the hand's pixels, not an angle: an 8 px dash
has no direction a hand meant), each running along the row, a gap from the
next; writing is kept out because a mark a letter's size may touch a dash
only at the row's ends and stand in no gap (a printed letter's bars join its
stems, digits stand between minus signs), while long marks, the dashes of a
row crossing steeply, and a head drawn at another line's end cross freely;
the letters of a word are strokes like any other (a chevron drawn right
after a dashed line's last dash is gathered with it into a word, and the
dash is still a dash); `dashedHeads` asks heads.ts what sits at each end on
a scratch board where the row is one stroke. Its bench: 504/504 dashed lines
drawn by hand (7 headings, 4 spacings, 2 hands, 3 seeds, zoom 1, 0.5 and 2)
read whole with their ends; printed capitals, 408 words (FEE, EFFETE,
TEETH, serifed III, + + +, 1 - 2 - 3 - 4 …), 0; the flowchart and class
benches, wireframes, molecules, writing, 0; the 2,000-mark bench board (38%
printed capitals), 0 in 5 ms. `notations/sequence-mermaid.ts`: the writer
(`participant`/`actor <id> as <name>` left to right, `<a><arrow><b>: <words>`
down the page; words as raw text with `#`, `;` and markup as Mermaid's
entities, a leading `wrap:` escaped, blank as `#32;`; D2's ids, placeholder
and order) and a reader for its subset and a hand's forms (undeclared
participants, the ten arrows — a cross and an async head drawn as a head
and said — activations, notes, frames, numbering refused with their lines,
their messages read), drawn as boxes or stick figures over straight
lifelines, calls as arrows bound along the lifelines, returns as dashes with
a closed triangle apart, loops with their barb; read back, what does not read
as written is said. `sequence@1` (`packs/shipped/sequence.ts`) names the
notation and restates none of `SEQUENCE_TABLE`; its affinities lift clean
forms and lining up; in use, each lifeline's whole length is on the pen
(any dash of a dashed one offers all of it). The bench
(`sequence.bench.test.ts`, 36 hands: boxes over solid lifelines, over dashed
ones, a stick figure; the page turned 0 or ±3°; the return's chevron
gathered with its last dash or not): read 36/36, first 36/36 (0.78–0.85);
participants 108/108, lifelines 108/108, names 108/108; calls 72/72,
self-messages 36/36, returns 36/36; in order 144/144; labels 144/144; a
message crossing one or two lifelines, solid and dashed, either way 72/72;
the page turned −8° to 8° 18/18; a loop's head drawn apart 6/6; a lifeline
in two goes read as one 12/12; the flowchart bench, the class bench, a
wireframe, the molecule and a line of writing 0 above the floor (highest
0.00). The round trip (`sequence-mermaid.test.ts`): the goldens
(`fixtures/sequence.mermaid.ts`, by hand) and every hand of the board before
and after its writing is read; every arrow, actors, escapes and a hand's text
come back; 40 seeded random diagrams at 1× and 10 at 0.25× and 4×; twelve
hands exported and drawn back read the same. packBench: `sequence@1` has no
definitions; the corpus, now 3,921 drawings with the sequence boards, 0 false
reads for every pack. A context on the 2,000-mark bench board, base and this
side by side: mean 3.00 → 3.07 ms (p95 6.36 → 6.45); the whole board read
for a sequence in 10 ms. The flowchart, class, clean, command-mark and
recognition benches print unchanged. Core 1,536 in 101 files. Found, for
their owners: **an arrow whose tip crosses a lifeline and whose barb comes
back across it crosses it three times, and the session reads a scratch that
erases the lifeline** (`session/erase.ts`; the fixture stops tips a few
pixels short, and the reader's drawing is declared content) — a hazard of
hand-drawn sequence diagrams; **heads.ts reads an arrow's own barb only when
the arrow leads** — a 742 px message with a 14 px head reads *line 0.83,
arrow 0.60* (at 900 px, line alone), and the notation takes the barb the
rung holds (`HELD_ARROW`); **the letter rules gather a loop and the head
drawn right after it, and a dashed line's last dash and its chevron, into a
word** — read through (a message may be a word's main stroke when the rest
of the word is small beside it; heads near a word are read on a scratch
board). The surface's half must know: `notationsOf(state, scope)` gives a
`SequenceReading` (each participant's `symbol`, `figure`, `lifeline`,
`dashed`, `top`/`bottom`, `name`; each message's `kind`, `line`, `arrow`,
`order`, `labels`); `toMermaid` maps each participant id to its box or its
figure's head (`ids`) and its box and lifeline strokes (`marks`),
`links[i]` to message i — a dashed one's id `dashes:…`, its `ids` the
dashes and head; `drawMermaid` inside `session.withTool`, as D3; a
participant's name is a label on its box (or the figure's head), a message's
words a label on its stroke (a dashed one's first dash); a bind at
`along:sequence` is found again only while the pack is in use; e2e 51's
golden list of packs must add `sequence@1` (and `uml-class@1`) when the
bundles are rebuilt; the bundles are not committed here. The state half can
reuse the loop reading (a state's self-transition), `headsApart` and the
held barb; its transitions are solid, so dashes are not needed there.
*D5 status (the state half), 29 Sep 2026:* D5's state core built on
`worktree-agent-a078449d3d735bcd9` (`6f0480c` red — the state board as a core
test, 109 of 116 failing — then `2ce9367`, `037463b`, `c5334d0`, `37a9288`,
`2cc2b81`); the field's and the panel's display, the `mermaid` kind's render
of a `stateDiagram-v2` and *Draw it* are the surface's, still to come.
`notations/state.ts`: a **state** is a round-cornered box — a closed stroke the
rung reads as a rectangle, a stadium, or a circle not small beside the others,
known also by how fully it fills its own tightest box (a hand's rounded box is
between the flowchart's box and stadium measures and reads as either,
unsurely) — its name the writing in it; a box holding a state is a composite's
frame (a container). The **initial state** is a small dot scribbled solid and
the **final** a ring with a mark inside it — read from the ink alone: the rung
calls a scribbled dot an arc, writing, a rectangle or nothing (never a dot),
so a mark is a spot by being compact and dense (its path runs 1.6–2.4 times its
hull's perimeter, `FILLED_PATH`) and a ring holding one, a tap or a second ring
a bullseye; a ring and its dot drawn within the word window are gathered into
a word by the letter rules and are read from the word's letters; a hollow small
ring is an initial or a final by which way its transition runs, less surely. A
**transition** is an arrow between two of these, each end read past its head
(a small mark heads.ts calls a circle head at an end is the dot or the ring it
lands on, `landed`), a bind first; a **self-transition** is a loop out of a
state and back — one open stroke both of whose ends land on one state,
standing out `LOOP_OUT` of its size, its barb measured where it folds back out
(heads.ts finds no head on it and the rung reads an arc, or nothing); a line
with no head is no transition. **The trap, and the rule:** boxes and arrows
are what a flowchart is, so the reading's confidence is its structure scaled by
what a flowchart has no symbol for (`EVIDENCE`: a solid initial dot, a final
ring, a loop, round corners), plain boxes and arrows are the flowchart's and
read here as nothing, round corners alone are held under the floor, and a
decision or a data symbol counts against it; the reading returns before the
costly joining when none of that stands. A state offers its border as one
closed continuous port (`along:state`), a dot its four cardinals (`port:state`).
`notations/state-mermaid.ts`: the writer (`stateDiagram-v2`, `direction LR`
when the transitions run across, `state "name" as id`, transitions by the
states they join, the dot and the ring both `[*]`, D2's ids, escapes and
placeholder; several initials or finals fold into one `[*]` and a transition
into an initial or out of a final runs the other way in Mermaid, each said);
the reader (a hand's forms; a composite's frame, a choice, a fork, a join, a
note, concurrent regions and styles refused with their lines, a composite's
contents read flat) drawn by D3's layered layout — rounded boxes, the dot as
one solid spiral, the final as a ring round a second spiral, arrows bound at
both ends (a box's own site, else a place along its border; arcs around a state
in the way with closed-triangle heads), a loop out of a state's side bound at
both ends — read back, what does not read as written is said. `state@1`
(`packs/shipped/state.ts`) names the notation and restates none of
`STATE_TABLE`; its affinities lift clean forms and lining up; its ports follow
it on the pen. `graph-kit.ts` (the joining of symbols by connectors, the label
pass, roles, a writer's words — flowchart.ts only exports what it reuses) and
`box-routing.ts` (a copy of the class reader's sides, arcs and spread ends,
shared with D6) are new. The bench (`state.bench.test.ts`, 36 hands of the
board): read 36/36, first 36/36 (0.83–0.85); states 108/108, names 108/108,
initial 36/36, final 36/36, arrows 180/180, loops 36/36, labels 216/216; the
ring and its dot drawn quickly (gathered into a word) the same; **states with
square corners read 36/36 above the floor with every symbol right but first
only 12/36** — a flowchart reads a square box better than anything and says
0.82–0.87 to the state diagram's 0.77–0.80; both are said. The flowchart
bench, the class bench, the sequence board, a wireframe, the molecule and a
line of writing: highest 0.12, none above the floor. The round trip
(`state-mermaid.test.ts`): the goldens (`fixtures/state.mermaid.ts`, by hand)
and six texts come back exactly, every hand of the board exported before and
after its writing is read, 50 seeded random diagrams at 1× (40) and 0.25× and
4× (10), twelve hands exported and drawn back read the same. packBench:
`state@1` has no definitions; the corpus, now 3,930 drawings with the state
boards, 0 false reads for every pack; basics@1 96/96 and test-molecule@1 48/48
unchanged. Found, for their owners: **a loop whose ends cross its own state's
outline three times is a scratch that erases the state** (`session/erase.ts`;
the fixture stops the loop 5 px short, the reader's drawing is bound at both
ends) — the same hazard D5's sequence half found for a self-message; **a bound
end is carried onto its site (`follow`), so a connector's ink that ends off
its site is drawn back distorted** — a loop's last wing tip, three pixels
of ink, bent a whole loop (`session/follow.ts`; the drawing now ends its ink on
the site); **the letter rules gather a ring and the dot drawn in it into a
word** (`session/words.ts`; read through here, as the flowchart reads a
gathered diamond); **the shape rung never calls a scribbled dot a dot** — an arc
0.55, writing 0.5–0.8, a rectangle or nothing — so anything that must know a
dot reads its ink; **a fourth registered notation is a few per cent on every
test that draws and reads** (`mermaid-in.test.ts`'s caps and 60-chart cases sit
at 3.7–4.3 s against vitest's 5 s here, and fail on master too under load).
The surface's half must know: `notationsOf(state, scope)` gives a `StateReading`
(each symbol's `symbol` — `state`, `initial`, `final` — `rounded`, `labels`;
each transition's `self`, `from`, `to`, `labels`; `evidence`, `foreign`);
`toMermaid` maps each Mermaid state id to its box (`ids`, `marks`) and
`links[i]` to transition i — the initial and final have no id, they are `[*]`;
`drawMermaid` inside `session.withTool`, as D3; a state's name and a
transition's words are labels on their own ink; a bind at `along:state` or
`port:state` is found again while the notation is known (always) and offered to
the pen only while the pack is in use; and e2e 51's golden list of packs must
add `state@1` when the bundles are rebuilt.
*D6 status, 29 Sep 2026:* D6 built on `worktree-agent-a078449d3d735bcd9`, ER
first and the mind map after it — `e17327a` red (the ER board as a core test,
109 of 116 failing), `47dacc3` (the notation reads it and writes `erDiagram`),
`f672fb2` (the round trip, the rules, the bench, `er@1`), `59c011e`; `f9fd80b`
red (the mind-map board, 109 of 116 failing), `512eb42` (the notation, its
writer, reader and drawing, `mindmap@1`), `f833f55` (the round trip, the rules,
the bench); `0a91d10` (three older round-trip tests carry the timeout the heavy
ones do), `fe222e7` (both bundles rebuilt — the state half's too), `2b675ca`
(e2e 51's golden). The field's and the panel's display, the `mermaid` kind's
render of an `erDiagram` or a `mindmap` and *Draw it* are the surface's, still to
come. **ER** (`notations/er.ts`, `er-mermaid.ts`, `er@1`): an **entity** is a box
with its name in it (a box with a line across it is a class's compartments, a
box holding a box a frame), a **relationship** a plain line between two, no head,
its **verb** the writing beside its middle and a **multiplicity** the short
writing near each end — the pieces of one end read together — said as one of four
cardinalities (`ER_TABLE`: exactly one, zero or one, zero or more, one or more;
Mermaid's crow's-foot tokens); a crow's foot drawn as ink is not read, and neither
are Chen's relationship diamonds (§3 named them) — the notation is the
crow's-foot one. **The trap, and the rule:** boxes and lines are what a flowchart
and a class diagram are, so the confidence is the structure scaled by what they
lack (`EVIDENCE`: a multiplicity at the ends, a verb beside the middle), with a
head or a compartment counting against it; a board of arrows returns before the
costly joining. Mermaid: `erDiagram`, `direction LR`, `id["name"]`,
`from ||--o{ to : "verb"`, entities in the reading order of the page as it was
meant to stand (a hand's page leans — the centres are turned back by the lines'
median lean) **by columns when it runs across, by rows when it runs down**; a
relationship with no verb is `""` (Mermaid wants one), nothing said of how many is
written as zero or more and said; the reader takes the word aliases for a
cardinality and refuses attributes, a title and styles with their lines; the
drawing puts a dash beside each end labelled with the words. The bench
(`er.bench.test.ts`, 36 hands): read 36/36, first 36/36 (0.65–0.67); entities
144/144, names, relationships 108/108, multiplicities 108/108, verbs 108/108, at
three corner roundnesses; every other board (flowchart, class, sequence, state,
wireframe, molecule, writing) highest 0.08, none above the floor. **Mind map**
(`notations/mindmap.ts`, `mindmap-mermaid.ts`, `mindmap@1`): a **node** is a
circle, an oval or a box with its word in it, a **branch** a plain line between
two, the **root** the most central node of the tree (least total distance), each
node's branches in the order a hand reads round it — clockwise from the top round
the root, from the way it faces round any other. What makes it a mind map and not
the ER diagram's boxes or the molecule's bubbles: a word in every node, a hub with
three branches and branches that go on past it, and lines with nothing beside them
(a multiplicity or a verb, a head, a compartment or a loop counts against it).
Bare words on a branch are not read. Mermaid: `mindmap`, the tree as indentation,
`id(("words"))` and `id["words"]`; the drawing fans the tree round the root in
rings, a subtree a share of its parent's wedge by its leaves, so the order read
back is the text's; a text rooted away from its centre reads back re-rooted, said.
The bench (`mindmap.bench.test.ts`): read 36/36, first 36/36 (0.68–0.69); nodes
252/252, words, shapes, depths, order 252/252, branches 216/216; others highest
0.05, the molecule 0.24. The round trips: the goldens, six texts for ER and
five for the mind map, and 30 + 6 seeded random diagrams each (1×, 0.25×, 4×)
come back; nine hands each, exported and drawn back, read the same. packBench: `er@1` and `mindmap@1` have no
definitions; the corpus, now 3,942 drawings, 0 false reads for every pack.
**A golden changed by design:** the red commit's ER entity order (rows) was
against its own comment (columns); a layered layout keeps a rank in a column, so
the writer reads columns when it runs across and rows when it runs down, and the
golden now says Customer, Order, Invoice, Line item. **And e2e 51's list of packs**
(`Demos/session-engine.e2e.js`) is now state@1, er@1 and mindmap@1 after
sequence@1, in its own commit (`2b675ca`), after the bundles'. Found, for their
owners: **`notationsOf` swallows an exception a notation's reading throws** and
the notation simply reads as none — a ruled box's figure id was looked up in a
map keyed by its strokes and the ER reading of it was silently missing until a
test read it directly (`notations/notation.ts`); **a word written across a line is a
scratch that erases the line** (its zigzag crosses the line three times —
`session/erase.ts` — so a test's compartment line goes below the word); **a line as small as a letter between two
close shapes was written off as writing** (a branch 40 px long; fixed in both
notations: a stroke whose ends land on two different symbols joins them,
`joinsTwo`, `graph-kit.ts`); **three older tests sit at 4.4–7 s against vitest's
5 s** with five notations registered (`mermaid-in.test.ts`'s caps and 60-chart
cases, `uml-class-mermaid.test.ts`'s random diagrams) and timed out in the suite
and passed alone — they carry `SLOW` now; **the packs pane says "the er diagram
notation"** (`23-packs.js` lowers a notation's name — an acronym's case is
lost, as the UML class diagram's already is). The surface's half must know:
`notationsOf(state, scope)` gives an `ErReading` (each entity's `name`, each
relationship's `sides.from` and `sides.to` — `entity`, `multiplicity`,
`cardinality` — and `verb`) or a `MindMapReading` (each node's `symbol`
`root` or `node`, `shape`, `depth`, `parent`, `children`, `name`; each branch's
`tree`); `toMermaid` maps each Mermaid id to its shape's marks (`ids`, `marks`)
and `links[i]` to relationship or branch i; `drawMermaid` inside
`session.withTool`, as D3; the names and the verbs are labels on their own ink,
and each end's multiplicity a labelled dash beside it; a bind at `along:er` or
`along:mindmap` is found again while the notation is known (always) and offered
to the pen only while the pack is in use. On this branch the surface reads no
notation at all (`notationsOf` is asked by no fragment; `23-packs.js` only
names a pack's notation): *Make it Mermaid* (`tools/mermaid.ts`, which CLAUDE.md
on the director's branch describes and this branch does not have) reads the marks
as the likeliest registered notation with a writer, so it should offer the three
new ones with no surface change — unverified here; the field's *what this is* row and the panel's
*becomes* row saying *an ER diagram 0.66* are the surface unit still to come.
*N1 status, 29 Sep 2026:* **the six notations read on the surface** (§3 *Reading*;
A1–A3's *it reads as a …*). *Red first:* `b023fab` — e2e 67 (a Mermaid text drawn
for each notation and held: the field's row leads with it, the panel says it,
plural and ranked, a tap, Enter, the read count) 10 of 12 failing, and
`notationWords` in Node; then `8c7084d` (core: `baseOn` knows a notation, its
test) and `eaa9abe` (the surface). **Built:** `notationsHeld` (`09-palette.js`)
reads `notationsOf` over the held marks only — two or more, no artifact, the
Mermaid tool's own rule — above `NOTATION_FLOOR`, **once per log** (`logKey`,
shared by the field and the panel; e2e 67k counts it: one read for a hold, a pan
and a repaint read nothing); `notationItem` puts each reading in the field's
*what this is* row in the person's words (*a flowchart 0.92*, *a class diagram
0.92*, *an ER diagram 0.67* — `notationWords`, pure, in `09-field.js`: no "UML"),
core's whole sentence the tooltip; the panel (`becomesOf`, `10-inspector.js`)
says *is — a flowchart: three processes, one decision, three flows · or a class
diagram 0.35* and *becomes — Make it Mermaid · draw them clean · a name*.
**What a tap does — the choice:** it is a reading of what the marks ARE and not a
name for a definition, so it has no `act` and Enter never takes it (with only
such readings held the line says *tap a reading to use it*, never *as the name*);
a tap on the reading the Mermaid tool writes from takes *Make it Mermaid*, in that
notation, through the tool's own stamp — the honest act a notation has — and a tap
on a runner-up (a flowchart beside a class diagram reads as both, the class first)
says its sentence in the status line and writes nothing, since `mermaidFor`
writes the likeliest reading; extending the tool to write a chosen one is a small
later unit if John wants it. **Ranking:** `baseOn` gained `notation` (0.75 + 0.4c),
so from the floor up a notation stands with the firmest concept it is made of —
*a flowchart 0.92* leads *flow 0.90*, and an ER diagram at 0.67 does too — and
under what a model read (the first cut, 0.6 + 0.45c, let *flow* lead an ER
diagram; e2e 67d found it). **e2e 49's golden is unchanged**: a row of boxes and a
molecule read as no notation above the floor (the molecule is *a mind map 0.23*),
writing as none; e2e 50 stands (three boxes beside a flowchart read as none).
Counts: e2e 67–67k, 12 records (`canvas` 406 passed, 0 failed, 2 skipped on the
merged tree), core `rank.test.ts` one more, `09-field.test.mjs` two more. *Found,
for other owners:* a drawing's readings are cheap for the six drawn by
`drawMermaid` (12–78 ms for 7–27 marks) but the Mermaid tool's own `offers()` reads
`notationsOf` again for the same marks — twice per held scope, once by the tool
and once by the surface; handing the tool the surface's reading through the
`ToolHost` would halve it, and matters only for a held scope of hundreds of marks.
A class diagram alone also reads as *a flowchart 0.35* (its boxes and lines) — below
the floor, said nowhere, as intended.
**D7 Routing** — orthogonal connectors between ports and *tidy the diagram*.
*Status, 29 Sep 2026 (branch `unit/d7-routing`):* **D7 built.** Red `3874a08`
(`diagram/route.test.ts`, `tools/route.test.ts` and e2e 66 alone: *Cannot find
module './route'*), core `659d1b0`, the surface `3ff61f0`, the room oracle
`852c5ac`, then docs. **The choice the plan left open:** a `route` event marks
connectors as routed (a `'route'` rep; `mode: 'raw'` takes it off, as `snap`
has its `raw`), and the polyline is **derived on every replay, never logged and
never carried** — from the sites the ends are bound to where they stand and the
marks in the way, in the apply path at the follow's own triggers (`followFrom`,
and a stroke drawn, an unbind, an erase), only when a change can reach the
route (the connector or its targets changed, a mark it was routed among, or one
stands in the window it was read in). E2's status line said it: the follow is a
similarity of the whole connector and a route is not, so the ink follows as it
always did and the route is found again from `boundSiteOf`, never stretched.
**What reads a connector still reads its ink** (its ends, wires, heads and the
notation's reading), so a routed flowchart reads and says the same Mermaid — the
route is a form drawn in front, the ink faint beneath, never replaced.
`diagram/route.ts`: `outwardOf` (a box's edge middle straight out, a corner
along the side that faces the other end, a decision's vertex outward, a site
in a mark's middle toward the other end), `routeBetween` (pure, deterministic;
a stub, then a search over the lines the marks in the way leave open — fewest
turns, then shortest, at most `ROUTE_MAX_TURNS`; shorter stubs, then the
symbols alone, then a direct elbow, and *could not avoid …* said with the marks
named — it never fails to draw), `deriveRoute` (the arrow's head kept at the
tip), `tidyPlanOf` (the symbols by rank — the longest way from where the flows
begin, a loop's back flow left out — each rank of two or more within reach a
row or column). `tools/route.ts`, appended last in `builtin.ts`: *Tidy the
diagram* (tidy's alignment, the writing on a symbol carried with it, every tied
connector routed — one act, one undo), *Route the connectors*, *Show the
connectors as drawn*; offered only for a notation reading with connectors tied
at both ends, not for e2e 49's three scopes, a molecule, a loose-arrow
flowchart or a sequence diagram (its messages are level by definition).
The surface (`08-render.js`, `05-selection.js`): route in front, ink and clean
form faint beneath, the mark filed by the box its route runs in, a drag drawn
routed from where it takes what the connector is tied to. **Tests:** core
1,790 in 112 files (`route` 19, the tool 5, the room oracle runs `route` among
its acts — 250 seeds hold, 161 routes made, agreeing with a replay from zero
and from a checkpoint), typecheck clean, both bundles equal to a fresh build;
relay, field, build, board and release tests 140; surface, app and examples in
sync (the example logs are unchanged: nothing they hold routes); the canvas
MCP smoke passes; the shard typechecks; **e2e 66–66f** (canvas 399 passed and
the two honest skips): held flowchart offered *Tidy the diagram*; one act of
`tidy` and `route` events, every one the tool's; every route orthogonal in at
most four turns; the flowchart and its Mermaid and the ink as they were; the
paint's routes with the ink faint; two boxes dragged re-route in one `move`;
one undo, then one more, takes it all away. **The whole gate** with it: 687 passed, 0 failed, 13 skipped across 12 scenarios in 448 s (the budgets' five skipped by name — another gate was running on the machine; the canvas and pencil scenarios rerun after the last change to the bundle). **By design** the three tests that
pinned *Mermaid* / *Draw it* as the last tools and `describe.test.ts`'s tool
list moved by one place (routing is last; the field's order and e2e 49's golden
stand). **Found:** (1) a separate head drawn apart — Mermaid in's arcs, `<-->`
starts — is bound to nothing and does not follow, so a routed arc keeps its
triangle where it was: a routed connector's head is drawn only for an arrow
the rung reads; (2) writing beside a connector (`of` a connector) stays where it
was written, and a route may pass through it — tidy carries only what labels a
symbol; (3) what hits, scratches and relates a routed connector is still its
ink (the route is in front, not where it stands); the day a hand must point at
the route, `standingPointsOf` is the seam; (4) a multi-stroke symbol is left
where it stands by *Tidy* (`session.tidy` places whole marks); (5) the marks in
the way are the closed marks in a window, at most `MAX_BLOCKS`, so a route can
cross a mark outside it; (6) for the state, ER and mind-map notations: routing
is generic over `NotationReading.connectors`, so they get it with no work
once their connectors are bound at ports (`along:` and `port:` ports read their
outward from the box of the mark).
**D8 The repair demo** — `CONTROL-POINTS-PLAN.md` P4; *needs John:* one
photograph of a hand-drawn flowchart.

### Phase 4 — maths
M1–M5 as `DIRECTOR-PLAN-W2.md` §3, as the `maths` tool. **M6 the garment
pack** — pattern piece, grain line, fold line, notch, dart, seam allowance,
each with its samples and bench. **M7 true size and print** — an `svg`
artifact at true size and a print export tiled onto pages with alignment
marks. *Trap:* a printer scales; the tile carries a measured test square.
*Status, 26 Sep 2026:* M1 (quantities, expressions with running totals) and
M2 (the sheet, `sheetLines`) built in `metamedium-core/src/maths/` on
`w2-maths` — 94 tests; changing the bust re-derives exactly A, 1, 2 and 5
(`MATHS-PLAN.md` §4).
*Status, 27 Sep 2026:* M3a (dimensions — a number beside a mark offered as
one of its measures, ranked with its reason and runner-up; a piece label
inside a closed mark; a square declaring a corner right; the underline;
each drawing's unit and scale) and M4 (solving, figure by figure in closed
form — the triangle says 25.30″ with `√(24² + 8²)`, its conflict and the
other reading; `measure.ts` in units, unchanged for a mark with no labels;
a step's value on an edge checked against its step) built in
`metamedium-core/src/maths/` on `w2-maths` — 139 maths tests, core 815
(`MATHS-PLAN.md` §4). M3's figures of several strokes are E3's, which fill
the same figure through `polygonFigure`.
*Status, 27 Sep 2026:* M7 (core) built on `w2-maths` — `maths/truesize.ts`
draws solved figures at true size as a new SVG (the root in paper units,
the viewBox in the drawing's; each figure from the solver's first reading,
never from the ink; labels as written, a derived length a place finer; the
title says when labels conflict, and what was left out), and
`maths/print.ts` tiles it onto Letter or A4 at 100% with overlap, ⊕
alignment marks both neighbours print, grid labels, a map, a measured test
square (1 in, or 2 cm) on every page and one HTML that prints a page per
sheet; the 22″ × 56″ piece is 28 Letter pages; 29 tests, core 844
(`MATHS-PLAN.md` §4). The offers and the export pane are M5's.
*Status, 29 Sep 2026:* **M5 built** (branch `worktree-agent-a6a9ff4be236c9f76`; red
`04acc73`, built `4a1418b`, `b83d6ec`, `2a991b3`, `9eb4450`, `b8e83d2`). **Core:**
`maths/board.ts` decides what is said beside a figure and a page, as data a
surface draws — a chip on each derived side (outside, where a label stands), a
label that cannot hold said in the solver's own sentence right of its number,
each step's check at the right of its own line (*✓ 14″*, *✗ 14.67″ · written
12*, *✓ 48″ · or 46″*), `mathsSaid` for the panel, `evaluateTyped` for `=` —
and the `maths` tool offers *Show the sizes*, *Check the steps* and *Print at
true size* (host acts, nothing written; they stand on `written` so they lead;
none for e2e 49's three scopes, whose golden is unchanged; `describe.test.ts`
names the tool by design, `b83d6ec`). **Surface:** `25-maths.js` draws the
chips — for a moment after a change, while the hand points at the marks, while
*Show the sizes* was asked (the ghost rule, v10 F4); **a problem stands at
rest**, an answer does not — the panel says the answer in plain lines with
every formula behind *details* and speaks the drawing's unit, `=` in the field
says its result before Enter and Enter puts the words on the board as text
(one act), and the export pane has a row for *true-size.svg* and *print.html*.
Never an answer card. **Tests:** core `board.test.ts` 19 and `tools/maths.test.ts`
8 (core 1,737 in 108 files — six heavy notation tests time out at 5 s under a
load of 11 and pass at a longer timeout); `09-field.test.mjs` 39 (6 new); e2e
64–64g, 10 records (canvas alone 365 passed, 1 skipped; in the whole gate 370
passed, 2 skipped, and the gate 624 passed, 0 failed, 6 skipped — five of them
the budgets, skipped by name on a machine at load 7; WebKit not run here). **Found
for other owners:** (1) **`dimensionsOf` and `solveBoard` are quadratic in the
figures** — right angles, the parts a side is cut into and the relations of every
marked figure walk each figure against every other — so ONE number on PERF.md's
2,000-mark board cost 2.1 s a stroke (150–450 ms at 500); M5 keeps it off by
reading only the ink beside a number (`drawingsBeside`: 4 ms with the number in
an empty place, 10 ms beside a dense drawing), but a single connected drawing of
thousands of marks would still pay — grid those walks in M3/M4's code before a
board like that is real. (2) A number typed by double-click is a 320 × 120 frame
whose *centre* is what attaches; a typed number wants a frame sized to its
words. (3) Not built, and named: *Draw it to scale* (an `svg` artifact at true
size), *make it a slider* from a range, *24in* typed with a side selected making
it that side's length, *hypotenuse?* answering, and the `HERE` clause that numbers
are computed by the canvas, never a model. (4) A text that is parked (past the
live budget) has no frame to measure, so its step chips stand at core's even
division of the frame.

*F2, 29 Sep 2026 (branch `unit/fixes-1`; red `437f625`, fix `f03f0fd`):* **prose on the
board is no longer read as maths** — the finding above (2) and R5's. The grammar
reads a colon as `=`, a dash as a minus and words as a name, so *Draw a box: then
an arrow - and it reads* was a check and *1. Draw a box* a step, each standing a
`?` at rest. `proseToNotes` in `sheet.ts` is the smallest rule: an operator never
joins two words the page does not define; a line with no label needs an operator
and only names the page defines; a labelled one may name what the page lacks
(*1. Waist ÷ 4* still says *Waist is not on this sheet*); a line typed after `=`
is read whatever it says (`maths: true`, so `evaluateTyped` still says what is
missing). What fails is a `note`. Every existing sheet, apron, tunic and board test
passes unchanged; new: `sheet.test.ts` 4, `board.test.ts` 1, e2e 64h and 64h2
(canvas 394 passed, 2 skipped). R5's caution on colons and dashes in the examples'
notes is lifted (their logs are unchanged); the one on digits stays, since a number
beside a drawing is a dimension. **Found:** the examples' guard was a comment, a
README line and CLAUDE.md, not a test — the test that holds is *a note is not a
measurement* (`examples.test.mjs`), which passes with prose; `dimension.ts` and
`solve.ts` still read numbers in a note beside a figure by design.

*Status, 29 Sep 2026 (branch `unit/m6-garment`):* **M6 built** — the garment pack. Red
`2c402a7` (the pattern board as a fixture, 24 hands; the notation's test and bench; the
packs' tests naming `garment@1` — 112 failing), built `55b1433`; red `3fb236b` (the
maths — 8 of 10 failing), built `3170ea4`; red `17569ae` (a notch divides an edge),
fix `c971c83`; e2e 51's golden `857d3c7`, e2e 68 and HELP `e6a2642`; two measured
cuts in the reading's cost, `c0f3cc5` and `3bf33bf`. **Which of the six is a pack
definition and which is code: all six are code** — each is a relation to the piece's
outline (a grain line inside it, a fold along it, a notch across it, a dart standing
on it, a seam allowance off it the same distance all round) and two need a head kind
or an orientation; a signature is a bag of shapes and links, and *a box with an arrow
in it* is the same signature as *a piece with a grain line* (the trap). So `garment@1`
names the notation (`GARMENT_TABLE`, its single home), has no definitions and no
ports (a piece's marks are not places a line is tied), and its affinity lifts clean
forms and the maths beside a piece. **The notation** (`notations/garment.ts`; the
sixth reading beside the flowchart, class, sequence, state, ER and mind map, so N1
shows it in the field's *what this is* row and the panel with no surface change:
*a garment pattern piece 0.83 — one piece: one grain line, two notches, one dart, a
seam allowance*): a **piece** is a closed outline of some size; a **grain line** a
straight line with a head at each end inside it (a chevron at each end, or a hook at
each end of one stroke — `hooksOf`, on the stroke's own points, because the shape
rung and `headsOf` see only the far end of the second); a **fold** the same line
along an edge; a **notch** a short tick across the outline, square to it, or a small
wedge on it; a **dart** a narrow wedge from an edge, closed or a V of one stroke; a
**seam allowance** an outline the same distance off all round, *measured*. Its
confidence is its evidence: the grain line alone settles it, two notches, a dart or a
seam allowance alone do not. **The maths** (`maths/garment.ts`; `boardMaths(…).garment`,
a chip, the panel, `trueSize`): the numbers rule the outline they are written on (in
the piece: sewing size; outside the cutting line: cutting size, the other reading said
as *or, if 18 × 26″ is the finished size, cut at 19 × 27″*); the allowance is the
page's `Add ½″ seam allowance` when there is one, else the ink's own offset at the
drawing's scale said to be the ink's, and where both stand the page rules and the
ink's is said beside it; a fold halves the piece (*cut on the fold, opened 36″
across, 18″ as drawn*); the grain, each notch and each dart are measured on the
piece's true sides by an affine map of the ink's corners; and true size prints the
other outline dashed exactly the allowance out (or in), the grain line with a head at
each end, the notches, the darts, the fold marked and said, in the SVG and in what a
print covers. **Tests:** core `garment.test.ts` 104 (24 hands × read, marks, roles, a
name from writing, four negatives, the board reads as no other diagram),
`garment.bench.test.ts` 5 (its own drawings read 144/144 at 1×, 0.6× and 1.8×
elsewhere on the page; the recognition corpus, 36 flowcharts, the class, sequence,
state, ER and mind-map boards, wireframes, molecules, writing, rows and hubs read none
above the floor), `maths/garment.test.ts` 11, the packs' three (`validate.test.ts`,
`pack.test.ts`, and the garment board joins `bench.test.ts`'s corpus, which
`garment@1` and every other pack read as nothing) — core 2,442 in 127 files; e2e
68–68h, 9 records (canvas 423 passed, 2 skipped; the whole gate 712 passed, 12 skipped,
the budgets' five by name on a machine at calibration 70 ms; shard typecheck and
`scripts/examples.mjs --check` green; WebKit not run here). **By design:** e2e 51's
expected list of packs gained `garment@1`, and `pack.test.ts` used `garment@1` as its
example of a pack this build lacks (now `garment@2`). **Found for other owners:** (1)
**a tick across an edge divides it into parts** (`withParts` in `dimension.ts`: the
parts a whole is made of), so a 26″ written beside the middle of a side with two
notches on it was the length of the part between them and the side fixed by nothing —
found drawing the piece with the pointer; M6 leaves a notch, a dart, a fold and a grain
line's drawn-apart heads out of what the solver is handed (`garmentNotFigures`), but a
*dimension line* drawn across an edge is still a divider, which is right for a cutting
layout and wrong for anything else that ticks an edge. (2) **A number in the gap
between two outlines is a piece label** (M3a: a number inside a closed mark), not a
side's length, unless it stands near a side's middle — a `26″` written in the gap a
hundred pixels off the middle of the left side scored 0.50 as the outline's identity
against 0.43 as the side's length, so the maths says the figure is unlabelled and true
size waits. Worth a look before John writes his own. (3)
**Not built:** a quadrilateral is not fixed by its sides (M4), so a trapezoid panel or
a bodice with a curved neckline says its marks and no sizes and is not printed — the
pattern pieces true size can print are rectangles and triangles; a dashed cutting line
(short strokes in a row, `dashedLines`) is not read as an outline; a dart made of two
loose lines meeting at a point is not read (a closed wedge or a V of one stroke is); a
double notch reads as two; the cutting line offsets a convex polygon (miter joins) and
a circle's is not drawn; a piece labelled on both outlines takes the inner. (4)
`scripts/examples.mjs`'s pattern page is a right triangle and a page of steps, not a
garment piece, and was left alone; a fifth example (a pattern piece with its
allowance) would be the way to show the pack, and needs `boards/examples/index.json`
and e2e 65's list to grow with it.

### Phase 5 — seats
J1–J3 as `DIRECTOR-PLAN-W2.md` §3, with §6's addition.

**J2 status, 26 Sep 2026: done — the answer is *not yet*** (`gliner-seat/`,
merged at `aa6c2e3`). GLiNER2 `multi-v1` (Apache-2.0, a 614 MB fp16 ONNX
export, its processor ported to JavaScript and matched to the Python
library's token ids) runs where MetaMedium runs — about 23 ms a line on
WebGPU in a Node process or a Chromium page, a second to first answer — but
on our own text it misses most of the spans a seat would be there for
(measurement names 7 of 11 at 35% precision, operators 8 of 26), while the
units and quantities it does find are what M1's parser already reads
exactly. So: notation is parsed at tier 1; `decide` stays the judging seat;
extraction waits for a better model or a fine-tune. Unported and worth a
look: the export's classification head, a possible *local* answer to
decide's Choice questions. `gliner-seat/README.md` has every number and the
command that produced it.

**J5 status, 28 Sep 2026: built on `w2` — a hosted model is asked, and says
why when it cannot be** (`cb26c51`, red first: 34 of 42 transport tests and
14 of 16 e2e records; `cb1a4c4` core; `abfe4c7`, `b1968a5`, `6f8a327`
surface; `5892a70` and the commit carrying this line, docs). What was wrong for John's GLM Flash on
OpenRouter: whether a model sees was guessed from its id and "glm" was not in
the guess, so *Read the writing* never asked it and opened the models pane
instead — which looked exactly like "it won't send"; a reasoning model that
spent its budget thinking came back with empty `content`, read as *no
completion text*, and no budget was sent; and every failure was one sentence
in the status line, gone in seconds. **Core** (`llm/provider.ts`): a reply is
read the way the provider sends it — content as a string or as parts, a
model's `reasoning` or `reasoning_content` never taken for its answer, and
with none the failure says why (*GLM 5.3 Flash spent its whole budget
thinking — no answer came back*); a failure carries its HTTP status, a reason
and the provider's own words (*HTTP 401 — bad key: “User not found.”*), a
network or CORS failure said as one, the key never repeated; every call sends
`max_tokens` 8,192 under what the provider said the model may write and
read, and a call to OpenRouter `reasoning: { effort: 'low' }` and its
`HTTP-Referer` and `X-Title`; `readModels` and `modelFacts` read what a
provider's list says a model can do, refuse an id it does not hold with the
nearest ids, and fall back to what it said last time, then to the id's guess,
saying which. **Surface** (`04-models.js`): a join asks the list (once a page,
waited on at most 3 s, correcting the join when it lands late); each model's
row keeps its last call until the next and has *try it*; *Read the writing*
with no model that sees says which cannot and why. Folded in from the pure-
user walkthrough (John: "it opens the model panel whenever sending to llm"):
asking never opens the pane — an ask with no model that can answer it is
kept, said once and in the field with *choose one*, and runs when one joins;
a model is named in words with no `llm:` and a reading is words, not a slug,
on the board; with a long local list one model is suggested a job. The
gate's `models` scenario (19 records, about 6 s) runs the real transport
against a stub provider on 127.0.0.1 answering in OpenRouter's recorded
shapes: the guard still stops a real model host, a wrong id refused, the
kept *What is this?* and *Read the writing* run on join, a 401 and a
reasoning-only reply said in the row, try it, a reload rejoining with the
vision flag right, and the key nowhere but where *remember* put it. Core
1,688 in 105 files (the transport's 42). **Not done:** OpenRouter itself is
never called by a test — the guard forbids it — so its CORS for the two
headers and its handling of the reasoning setting are John's first real
join to confirm (a CORS failure there would now be said as one, and the
headers are one block in `completeOpenAICompatible`); the field's reading
line and tooltips still name a model `llm:…` (e2e 49's golden holds them); a
kept ask waits until it runs or another replaces it, with no expiry; the
shard's model seats (`shard-3d/src/models.ts`) keep their own join.

**J4 status, 28 Sep 2026: built on `w2-shard` — Claude Code is the canvas's
seat** (`663c887`, red first: the gate's `seat` scenario and the smoke's seat
cases, committed failing; then the core, the hand, the surface, and the
commits carrying this line). John asked whether *Read the writing* and *What
is this?* could come straight back to the Claude Code session over MCP instead
of going out to an HTTP endpoint; the shard's G5 had answered it for 3D, and
this is the canvas's answer, in core (`participants/seat.ts`).
`createSeatParticipant` is an agent participant whose injected transport parks
each question in the live room as a brief — an answer whose question is
`brief`, carrying what was asked, the contract and the question, never a
picture — and settles it with the reply whose question is the brief node's own
id (L2a): the same prompts, the same parsers, the same propose channel; a
refusal said, *claude would not: …*; a brief given up on (Esc, *withdraw*, ten
minutes) taken back, undone while it is still this hand's last act, erased
after. A hand that answers at the seat says so on every line of its own and
beats while it waits (`LiveStore`: `seat`, `here()`), so the page knows Claude
is in the room. The page (`24-seat.js`; one hook in `04-models.js`, `join`
taking a made participant): the models pane leads with *Claude Code — in this
room*, one tap, or a sentence saying what to do; the Live pane's *with Claude*
is the room and the seat in one act and says *Claude is here and will read for
you*; the seat is the reader while seated; the door moved under *advanced*.
The hand (`Demos/mcp.mjs`): `canvas_pending` — the brief, its marks with their
ids, the contract, and for a read the ink as a PNG — and `canvas_answer`,
checked with the page's own parser before anything is sent;
`Demos/seat-watch.mjs`, a silent reader, prints one line per brief parked, the
line a session's Monitor wakes on. `node e2e/run.mjs seat`: 12 records
(J4.0–J4.8), in the default run; the smoke 61 checks, *What is this?*, *Read
the writing* and `ask:` among them; core 1668 tests. Found on the way: the
old *with Claude* overwrote a relay typed in the Live pane with `:8020` — the
first red run joined the room a relay of this machine carries there — so the
scenario refuses and counts any request to `:8020` (J4.8). Owed: the shard's seat still keeps its own copy of the brief's rules
(`shard-3d/src/room.ts`). At the merge with J5 the reader's choice
(`readers()` in `06-handwriting.js`) kept both: the seat reads while it is taken,
else the smallest joined model that sees.

### Phase 6 — ready for use
**R1 Boards.** A boards list in browser storage; `?board=`; the existing
single board becomes the first entry, unchanged. *Red first:* three boards
created, switched, reloaded, each intact. **R2 The log format.** A versioned
container for exported and folder logs; readers accept version 0 (today's).
*Trap:* a folder written by v1 must still open in the week-old surface or say
why. **R3 No lost work.** IndexedDB append-only per board, flush on hide,
quota said. *Red first:* close the page at random points in a scripted
session; every completed stroke is there on reopening. **R4 Performance.**
Synthetic boards of 500, 2,000 and 5,000 marks; budgets for open, replay,
drawing and reading as tests that record their numbers. *Trap:* relations
over every pair are quadratic; measure before indexing.

*R1 status, 27 Sep 2026: built on `w2-shard`, on R3* — `6ff6779` (red first:
no tile, no list, the kill test unable to make a second board) … `0ab77b7`
and the commits carrying this line. Each board is its own R3 journal keyed by
its id; IndexedDB version 2 adds the list (`boards`: a name and when it was
made, opened and put in the trash — nothing of what it holds), and a board's
meta says what it holds (changed, events, marks, characters) in each record's
own transaction. `Demos/surface/17-boards.js` is the pure half (17 tests in
Node, in CI), `17-folder.js` the adapter, `22-boards.js` the pane, opened by a
*boards* tile in a fixed slot after *help* whose face is the name on screen.
`node e2e/run.mjs boards` (19 records, in the gate, Chromium and WebKit): R3's
board comes back byte for byte as the first entry, "My board" (N1); the name
is never the key — a rename orphans nothing and two boards share a name (N5);
delete is to the trash, restore brings a board back whole, emptying the trash
is its own act said first by name and size, and never takes a board another
tab holds (N7–N10); Reset is a fresh board under the same name with the old
one in the trash — it was one tap from losing the board (N14); `?board=`, the
title, the view per board, a board left unmoved coming back unmoved (N4, N12, N12b); folders and sites as recent places of
their kind (N13); a board out as a log and back in (N15, A8's export and
import); a board that is not saved is never left without a word (N16, which
found that a whole log's delete could commit without its add — the store held
0 of 9 strokes while writes failed; now 9 of 9). Switching is in place and
flushes the board left. The kill test now keeps two boards and switches
between them through the pane mid-session, killing right after a switch and
in the middle of one: both boards whole in every run — 80 kills over 8 seeds
on Chromium (53 crashed, 27 closed; 154 switches, 12 kills mid-switch) and 30
on WebKit over 4 (closed; 64 switches, 5 mid-switch). Not done: reopening a
folder or a repository from the list is not in the gate (the picker and
GitHub's API; a site is); a new tab opens the board opened last even when
another tab holds it (read-only, and said); `07-input.js` still sets the old
Reset handler, superseded by `20-controls.js` — the main lane owns that file.

*R3 status, 27 Sep 2026: built on `w2-shard`, pulled forward by R4a* —
`13bd6f1` (red first: every stroke of every cycle lost, the failures silent)
…`5695f79` and the commit carrying this line. With no folder the board is kept
in IndexedDB as an append-only journal (`Demos/surface/17-board.js`, pure, 13
tests in Node; `17-folder.js` the adapter): a record a change, begun and
committed in the task that made it by the session's first listener, ahead of
the paint; the whole log only when the log is replaced (a first open, a load),
every thousand records, and after a failure. The kill test (`node e2e/run.mjs
keep`, in the gate) crashes or closes the page at random points — after a
release, during one, mid-stroke, after an undo — and in every run every
completed stroke came back: 108 kills on Chromium over nine seeds (53 crashed,
55 closed) and 58 on WebKit over four (closed: WebKit has no crash to send),
besides a fresh random seed in every gate run. A save that fails leads the
status line in plain words, with *export the log* and *open a folder* (which
carries the board in) as buttons, until one succeeds — forced for real by a
full quota (Chromium) and by a store that refuses (both engines); the flush on
`pagehide` and `visibilitychange` is tested by taking it out (both checks
fail). Browser storage's old board is imported once, byte for byte, and its key
goes only when that has landed. One tab writes a board (a Web Lock). A live
room, a replay and an embed never read or write the device's board — a change:
the whitepaper's embedded figures used to overwrite a reader's board. A
2,000-mark board (2,079 events, 6.9 M characters, past the ~5 M browser storage
refused) is kept in one record, a stroke on it is one record of 876 characters,
and it reopens with every event (`node e2e/run.mjs big`, opt-in: 100 s to load,
101 s to reopen — the replay, R4's). Not done: a private window that keeps the
board only for its own life is not detected, and says nothing.

*R4a status, 27 Sep 2026: measured on `w2-shard`, nothing changed* —
`c456ac1`…`06b3ea8` and the commit carrying this line; `PERF.md` has every
number with its command, the hotspots ranked with file:line, and budgets for
R4b. 500 marks is fit for daily use once open (opening freezes the tab for 2.2
s). 2,000 is not: Chromium opens it in 100 s, every stroke's release freezes
the page for 7.6 s, each line in a live room is a full replay, and browser
storage refuses its log. 5,000 does not open: the Chromium tab crashes 13
minutes in, and Node had drawn only 4,250 of its marks after 55 minutes,
holding 31 GB. To blame: every stroke re-relates the whole board once a
definition exists (60% of the 2,000 replay); the surface re-reads every mark's
role after every stroke (O(n·R)); and relations with no distance limit, 88% of
them `same-size`, are stored on every mark and cloned into every checkpoint
(90% of the 1.06 GB held at 2,000).

**R5 First run.** A
starter board from the packs; help as a one-page guide; a shortcut sheet;
examples. **R6 Pencil and WebKit.** Pen, touch and palm; hover from a
pencil; a WebKit scenario of the canvas's core records in the gate and in CI.
**R7 Deploy and release.** An app address on Pages that leaves every old
address working; the offline cache versioned; a release script with a
changelog and the standalone file. **R8 One platform.** The monoliths and
`Web App Skeleton/` archived behind their addresses (and out of CI), a docs
index, a README that is a front page. **R9 The shard alongside.** A built
shard published beside the canvas and opened from it into the same room.

*R5 status, 29 Sep 2026: built on `unit/r5-first-run`* — `f46d555` (red first:
the examples' Node test 10 of 10 failing with `scripts/examples.mjs` unwritten,
five new cases in `17-boards.test.mjs`, e2e 65–65f in the canvas scenario and
N18–N18e in `boards`, the panel with no *start from an example*, the pane with
no *examples*), `a4b4e9b`, `d39068d`, then the docs.
**Examples:** four boards a first-time hand can open — a flowchart with its
Mermaid beside it, a class diagram, a molecule from `basics@1` (two molecules
and a lone bubble, nothing taught) and a pattern page (a right triangle with 24
and 8 on its legs, a page of ten steps) — each a **log made by
`scripts/examples.mjs` from the engine and never drawn** (`drawMermaid`,
`strokeFor` with `handLike`'s seeded tremor, `use`, the surface's own texts, the
Mermaid taken through the tool's `takeOffer`; a fixed clock, no randomness), so
they show what the engine reads today: `--check` is in CI's `core` job beside the
other drift checks and `scripts/examples.test.mjs` (12) replays each and asks the
engine — a flowchart reads as one and says the same Mermaid, the class diagram
as UML, the molecule matched by the pack, the pattern page 25.30″ with a check
on every step, each opening with nothing held. The boards pane lists them under
*examples* (`exampleRows`, `exampleName`, `starterOf`, `EXAMPLES_BASE` in
`17-boards.js`, five more Node cases, 22 in all; the pane in `22-boards.js`), and
**opening one makes a new board of your own** — a copy under its own id, named
*Flowchart example* then *Flowchart example 2*, through the adapter's `newBoard`,
so the example is never written; the service worker keeps the index and each log
for offline (`EXTRA` in `Demos/sw.js`).
**The decision, and why: the first run stays an empty board.** The panel keeps
its three lines and gains one tap, *start from an example* (the starter, the
molecule, using the Basics pack), and *more examples* (the pane). The other
choice — the starter as the first board — would have kept "nothing is ever lost"
too, but a hand who only looked would find marks on a board they did not make and
be one undo from the empty board every acceptance scenario and every gate
scenario (`keep`, `boards`, `app`, the kill test) starts from; a first board with
events is also a board with something to lose. An empty first board writes
nothing, surprises no returning hand (a board with marks is what comes back, and
its panel offers no start), leaves `?fresh=1` as the harness needs it, and costs a
first-time hand one tap on a panel they are already reading; the board it was
tapped on stays on the list, empty. **HELP.md checked against the surface** as it
stands: it named no packs at all, said the models' *live* tile under the wrong
group, and did not say the examples — fixed, not rewritten; the shortcuts are as
`07-input.js` and `09-palette.js` have them. e2e 65 stands before the canvas
run's rooms (the run has one page and a board opened from a room opens in a page
of its own; the log is empty there by record 12, so nothing is lost by it).
**Found for other owners:** (1) a board opened in a page where the device has a
taught mark gets a `teach` event beside its log, so e2e 65d asks for *nothing
drawn* and not *no events*; (2) prose in a text artifact is read by the maths —
a colon made a line a definition and a dash a minus, both showing as a standing
`?` at rest — so a note on a drawing must be written without them (`examples.mjs`
says so; M5's owner may want prose lines told from steps by more than their
shape); (3) core's vitest suite has a 5 s default timeout that the notation
benches overrun on a loaded machine (two to seven of them, a different set each
run; every one passes with `--testTimeout=60000`) — nothing changed in core here.
Tests: `examples.test.mjs` 12, `17-boards.test.mjs` 22 (17 before), canvas e2e
392 passed and 2 skipped (7 new, 65–65f), `boards` 25 (5 new, N18–N18e); the
whole gate on Chromium 656 passed, 0 failed, 7 skipped in 392 s (the 2 honest
ones, and the budgets' five, skipped by name — load 5.1 on 4 cores).

*R6 status, 28 Sep 2026: built on `w2-shard`* — `a11a5ed` (red first: the
gate's `pencil` scenario, seven of its eight records failing on WebKit and
Chromium — the pen's pressure on none of its 33 points, the switch unsaid and
the tile saying `right`, a finger drawing where it should pan, a palm's touch
taken into the pen's stroke, no magnet under a hovering pencil, a pinch
leaving strokes with no points — and three page errors), `3ce9876`,
`767842e`, `4c99036`, `4e44707`, `e31fba3`, `47816cf` and the commit carrying
this line.
**Decided by `pointerType`, never the user agent**: the rules are a pure
fragment, `Demos/surface/07-hand.js` (14 tests in Node, in CI), and
`07-input.js` their adapter; a mouse, or the empty type a synthesised event
carries, is untouched. Before a pen is seen a finger draws, as it did; the
first pen switches it, said once in the status line and kept as a preference
the *hand* tile shows (`right · pen`) and steps one word a tap, so a finger
can have its ink back. With the pen a finger pans past a 6 px slop (short of
it, a tap), two pinch, a third is nothing. A palm — a touch while a pen is on
the glass or within 500 ms of its last event anywhere on the page — is
nothing for its whole life; a pen landing makes the fingers down palms and
puts back a pan a heel began just before it; the minimap, the teach pad and
the control centre's close ignore palms. Every point a pen draws carries its
pressure in the log (`p`, core's `Point.p`, read by nothing; the drawn width
is one width for all ink). A pencil's hover is a hover — the reading under it
and the magnet in reach, drawn on the pen's own layer; a mouse's hover draws
no ghost, as before. A field a finger opened does not take the focus, and
with an on-screen keyboard up the field stays in the visible viewport, its
pills' list held to what fits and scrolling (`fitFieldHeight`). **Found and
fixed:** a release the board began nothing for committed a stroke with no
points — a pinch's last finger, a palm lifting, a mouse pressed on the undo
button and let go over the board — which threw after the event was already
in the log, so the board then refused to save (*not saved — the browser
refused to keep the board (TypeError …)*): on the surface as it was, an
iPad's first pinch broke saving; a palm's points went into the pen's
stroke, its release ending it — the board now follows one pointer; and a hold
the system cancelled ate the next stroke's release. `node
e2e/run.mjs pencil` (14 records, in the default run on Chromium and in CI's
`webkit` job, which now runs `smoke pencil keep`): the pen draws with its
pressure; the switch said once; a finger pans; two pinch and leave nothing; a
palm during, just after and just before the pen; hover; the field by the
pen's hold and a pill; a clean; an undo; the keyboard, told to the page as
iPadOS tells it (a stand-in visual viewport that shrinks) — with 360 and 260
px left the field inside, six pills scrolling in 142 of 190 px and every one
scrolled to and hit (take the fit out and at 260 the field stands 52–300,
two pills out of reach); the tile round, a finger drawing, a palm still
nothing, a finger's field with no focus; the mouse untouched; a save and a
reload with every pressure back. `QA-v1.md` §A10 is the iPad's part. Not
done: nothing here has touched an iPad — every pencil, palm, hover and
keyboard row is synthesised, and A10 by hand is John's; contact size is not
read; the drawn width does not use pressure; the canvas refuses only a moving
stylus's default, so if Scribble still cuts a stroke on the glass, a pencil's
`touchstart` is next (at the cost of its double-tap); no `apple-touch-icon`
for the Home Screen yet (R7's note); `keep` in CI's `webkit` job runs on
Linux, which was not run here (on macOS, 22 and 3 named skips). Whole suite
before the last commit: core 1,091 in 82 files, typecheck clean, both bundles
equal to a fresh build (core's one change is `Point.p`, a type); the relay,
field, build, board, boards and scripts tests 93 and the hand's rules 14;
surface and app in sync; the canvas MCP smoke and the shard's (605 in 31
files, typecheck clean) pass; the gate 534 passed and the one honest skip
across nine scenarios (canvas 303, keep 31, boards 19, app 14, pencil 14,
budgets 7; shard 123 + 11 + 12); WebKit smoke 4, pencil 14, keep 22 and 3
skipped by name (boards 19 and app 14 too, not in the job).

*R7 status, 27 Sep 2026: built on `w2-shard`, on R4d* — `0cc9805` (red
first: the gate's `app` scenario and the release script's tests, failing: no
`app/`, no `VERSION`, no script) … and the commits carrying this line. **The
app's address is `/app/`, a page and not a redirect** (§12's default):
`scripts/build-app.mjs` makes `app/index.html` from
`Demos/session-engine.html` with each file it asks for asked for from `/app/`,
`app/sw.js` a copy of `Demos/sw.js`, `app/manifest.webmanifest` the old
address's starting and scoped at `./`; nothing in `app/` is edited, and CI's
`--check` names what drifted. A redirect could not install there — the shell
must come from a worker whose scope covers the page, and a worker's scope is
its own folder at most. The old address is untouched and opens the same
boards. **One worker, two addresses**: where a copy stands decides its shell
and its caches; network-first as before, installed past the HTTP cache,
**its cache named for the release**, dropping only its own old caches (the
old worker deleted every cache on the origin — both addresses', and every
project's on the `github.io` host), answering a miss from its own cache only,
keeping a page once whatever its query, and never keeping a request that
carries a key. **`VERSION`** (0.0.0: no release yet) is stamped into the
page's meta, which the help pane leads with, and into the workers' cache
names. **`scripts/release.mjs <version>`** refuses a dirty tree and a version
not greater than `VERSION` or any `v<version>` tag (`v1.0-day1` is not one),
writes `CHANGELOG.md` a section by unit, bumps and stamps, builds the
standalone file into `dist/release/`, refuses anything key-shaped, commits,
tags annotated — and never pushes; `--dry-run` writes nothing. `node e2e/run.mjs
app` (in the gate's default run): 14 records on Chromium and on WebKit — every
file answering, installable (Chromium's own check), the page *controlled*
(narrow the scope and A3, A5, B1 fail while Chromium still calls it
installable), a box kept across a reload the worker served and with the
server gone, the version in the help pane, no key kept, the old address and
all 30 published addresses answering (every link and social-card image
the whitepaper, `404.html` and the README give, and the v4 stub), and a release's first network fetch
dropping the old shell — beside a control where the cache kept its name and
the old help came back offline beside the new page. `node --test
scripts/build-app.test.mjs scripts/release.test.mjs` (17, in CI): semver's
order, the day-one tag, the unit rule on the real history, a release cut on a
small repository (one commit, one annotated tag, nothing pushed), its
refusals, and a dry run on a scratch clone of this repository that changes
nothing — also in a shallow, detached, tagless checkout like CI's. Not done:
**nothing is published** — the first release is the director's, on John's
instruction; its section is the whole history (today 442 commits: 191 under 66
units, 251 naming none) unless `--since` starts it later. Pages publishes `master` as it stands, so
between releases the app runs master's code under the last release's number.
The app's icon is the old address's SVG (Chromium installs with it; no
`apple-touch-icon` for an iPad's home screen yet — R6's). The WebKit run of
`app` is not in CI's `webkit` job, which runs the smoke on Linux; it passes
here on macOS.

### The user surface (`PLAN-USER-SURFACE.md`, from `UX-AUDIT-2026-09-28.md`)

*W3 status, 28 Sep 2026: built on `claude/friendly-galileo-g1z8wo`* — `faab5ef`
(red first: e2e 54 and 54b, a click off the open field or a selection with 1, 3
and 6 px of wobble left a dot; pencil P12, the pen's and a drawing finger's; the
rule's Node cases) and the commit carrying this line. A release is a tap or a
stroke by `releaseIs` in `Demos/surface/07-hand.js`: under three points a tap,
as before; while a field, a selection or a waiting loop stands, a press that
went no further than `TAP_SLOP_PX` on screen is the dismissal; with nothing to
dismiss a dot drawn is a dot (e2e 54c). `07-input.js` measures the farthest the
pointer went from where it landed. One record's setup (15d) drew its dot with a
selection still standing — now a dismissal by design — and lets go of the
selection first; its assertion is unchanged. Not done: WebKit's run of P12
(this machine has no WebKit build; CI's `webkit` job runs `pencil`).

*W2 status, 28 Sep 2026: built on `claude/friendly-galileo-g1z8wo`* — `3124cb7`
(red first: e2e 55–55d and the reader's case — a word and a line of writing
held offered three options, Enter named the line "writing" and made an
artifact of it), `f29da44` (the fix) and `17235d8` (e2e 49's golden for *line
of writing* recorded again, by design; the other seven scopes unchanged).
Held writing nobody has read is one option — its reading, with the model dot,
taken by the read tool's act (`09-palette.js`), the line `↵ read it` (an
item's `enter`, `09-field.js`); with no reader the line says what would read
it and Enter keeps the ask (J5's), said in the field, no pane (55d). The
records that took *Read the writing* on writing alone (e2e 30, 34, 35; models
M5; seat J4.3) take the one option; their assertions are unchanged.

*U1a status, 28 Sep 2026: built on `claude/friendly-galileo-g1z8wo`* — the red
commit (e2e 56–56c: after a stroke the panel said `id stroke:…`, `tier 0 ·
shape`; after a hold, the roles by id; no details) and the commit carrying this
line. `10-inspector.js` leads with `markSummary` — *is* and *becomes* in plain
words, and the act at hand — and puts the inspector behind *details*
(`inspectDetails`), closed and remembered per device; the tank's and a
script's clock stay above it, being acts. The bar's toggle says *panel ▾*.
Found on the way: a short panel no longer docked as a wall, so `fitAll` put a
mark under it (e2e 41e) — `chromeRects` (`01-view.js`) now measures the panel
at the height it may grow to.

*U1b status, 28 Sep 2026: built on `claude/friendly-galileo-g1z8wo`* — the red
commit (e2e 57–57c: `3 loose`; `bound — the west of the circle at (550,
250)`; three calls of one model a run-on) and the commit carrying this line.
The standing line counts *marks* and *things made* (`08-render.js`); a bind
is `tiedSentence` (`05-selection.js`, used by the pen and by a handle); work
in flight is one phrase per model with *Esc stops it* (`workingSummary`,
`04-models.js`; `mm.beginWork`/`endWork` register a call for tests). Not
changed: the room's and folder's own words (*live claude · you are john ·
with fern*, *folder … · saved*), which already speak plainly, and the
models' names, which J5 put in words.

*U1c status, 28 Sep 2026: built on `claude/friendly-galileo-g1z8wo`* — the red
commit (e2e 58–58b: a box held at each corner opened the field 637–902 px from
the press and over the minimap; a model's long readings ran pills to x 1794)
and the commit carrying this line. A hold records its press as the field's
anchor (`holdAround`, `07-input.js`), and `fieldAnchorFor` takes the last
press only when it is on or beside the held marks, else the marks' own edge on
the hand's side; `fieldBox` keeps off every card (`fieldAvoids`: the panel and
the minimap), trying the other side of the hand and each side of each card,
nearest the hand first; `keepFieldOnScreen` places it again when it grows over
one; a pill in the list is at most the list's width, its label cut with an
ellipsis. The stub answers *What is this?* with `window.__whatReply` when a
test sets it.

*U1d status, 28 Sep 2026: built on `claude/friendly-galileo-g1z8wo`* — the red
commit (three core cases: a box, a line and a circle, and a molecule, offered
*Read as writing*; a graph with one atom drawn as a box offered *Show it in
3D*), the fix, and the goldens recorded again in a commit of their own
(`read-any` leaves the boxes' and the molecules' offers in `builtin.test.ts`,
`context.test.ts` and e2e 49, and nothing else changes). `tools/read.ts`
offers *Read as writing* only when some held ink fails `snapReading` (or is a
word) — F5's *h* still gets it (e2e 33b, re-pinned: it pinned three
confident circles, which U1d withdraws; 33b2 pins them not offered);
`tools/graph3d.ts` only when every node is a circle and every edge a line or
an arc.

*U1e status, 28 Sep 2026: built on `claude/friendly-galileo-g1z8wo`* —
`17e701c` (red first: the reader's cases, and e2e 59–59b — Enter on a row of
boxes and on a molecule named them *row* and *flow*), `7bc32e8` (the fix) and
`e7f15b4` (e2e 49's lines recorded again by design: the row's, both
molecules' and the text's, nothing else). `readFieldCommand` takes, with
nothing typed, the first item marked `act` — every offer the row shows, and
the readings whose taking acts (writing read, W2; writing taken as text) —
and with only readings says *tap a reading to take it as the name*; a tap
still names (59c). e2e 42h pinned Enter's line as a rename and now pins that
the line is Enter's again when the pointer leaves.

*U1f status, 28 Sep 2026: built on `claude/friendly-galileo-g1z8wo`* — the red
commit (e2e 60: no groups) and the commit carrying this line. The control
centre (`Demos/session-engine.html`, `surface.css`, `20-controls.js`'s
header) is three labelled groups — Board (boards, folder, import, export,
reset), View (zoom, view, theme, hand, snap, snap now), Helpers (models,
live, auto-read, packs, your mark, help) — every tile keeping its id, Reset
with the board and far from Help; it scrolls when the window is short. e2e
51 pinned the packs tile as the grid's last; it now pins it among the
Helpers, as the plan says to, deliberately.

*U1g status, 28 Sep 2026: built on `claude/friendly-galileo-g1z8wo`* — the red
commit (e2e 61–61b: the help pane was *QA for v8 and v9*, branch `next-phases`,
with server commands; *your mark* said only *Draw your mark five times*) and
the commit carrying this line. `HELP.md` at the root is one page for a person
— the loop, the field's four round buttons, handling marks, what a model adds
and how to ask one (Claude in the room first), boards, live rooms, your mark,
undo, the shortcuts — read by the help tile and kept offline by both service
workers (`Demos/sw.js`'s `EXTRA`; the gate's `app` scenario and the release
test ask for `HELP.md` now); `QA-v8.md` stays, named at its foot. *Your mark*
says what a mark is for in its pane (`03-teach.js`, `MARK_SAYS`) and on the
chip. R5's first run is still its own unit. The harness's fetch stub lets a
request with no body through to the page's origin, so the help loads in the
canvas scenario.

*U2 status, 28 Sep 2026: walked on `claude/friendly-galileo-g1z8wo`* — the
sixteen rows of `UX-AUDIT-2026-09-28.md` walked again in headless Chromium at
`/app/`, real mouse input, no model (the model rows by the `models` and `seat`
scenarios): fourteen **resolved**, row 10 (*Read the writing*'s speed) left to
John's hand with real local models, row 16 the rename's. The table and its
screenshots (`Assets/ux-audit-2026-09-28/`) are the acceptance; John walks it
by hand next. The walk found four more, each fixed red-first before the table
was written: the field slid back over the press at the right edge (e2e 58),
held writing opened a field over itself (58c), and the panel's *becomes*
named *Show it in 3D* the field no longer offered (56d) and said writing
*becomes a name* where Enter reads it (56e).

### Phase 7 — review and release
**H1** — week 1's U7 (the `hand` gate scenario) plus `QA-v1.md`, a hand
checklist for A1–A10 with the MCP hand in the room checking each step.
*Status, 29 Sep 2026 (branch `unit/h1-hand`):* **H1 built.** Red `48d1cae`
(`e2e/hand.mjs` alone; the runner: *nothing to run — pick from …*), then the
runner `a0d3df0`, §4 `7f8731d`, §6 and A7 `8afdee2`…`094fda0`, the one
deliberate ask, the minimap and the 3D `1344291`, the invariant and the skips
`9a71007`, `QA-v1.md` and the README `63cac30`. **`hand`** is a gate
scenario in the default run: a relay of its own on a free port (`:8020`
refused and counted), `Demos/mcp.mjs` over stdio in room `mcp-test`, a tab as
*john*, and a counting model of the gate's own; 30 records, 24 passing and 6
skipped by name, about a minute. It walks QA-v10 §4, §6 and §7 and acceptance
A7 (a sentence, a reading, a transcript and a label landing on the right marks
after an undo and a reload; a field left open and a loop that waits under the
hand's stroke; a reload as a new sitting and the same person), with every
generated stroke said `synthetic` and John's own handwriting (§1–§3) and a
small model that fails (§5 row 2) as skips by name. **The invariant** (*Tier 1
before a model*): the gate's model is asked once, by *What is this?* (H1.19,
with the working dot up while the call is out), and H1.Y holds the count to
that one, with no brief parked, the seat not taken and no real model
attempted; mutation checked (auto-read on in the tab fails H1.19 and H1.Y). **The whole gate** with it: 668 passed, 0 failed, 13 skipped across 12 scenarios in 448 s (the budgets' five skipped by name — load 3.1 on 4 cores).
**`QA-v1.md`** is the hand checklist for A1–A10: each scenario's steps a
person walks, and a column for which tool the hand uses and what it should
say. **Found:** (1) the hand's own `canvas_look` printed a reading another
hand proposed — or its own — as though the engine had read it: fixed in
`Demos/mcp.mjs` (`467759b`, then `9dacd98` for the first fix's own fault, a
name John gave read as the hand's), each red first (`8afdee2`, `1344291`);
(2) **for the surface's owner: a reading the hand proposes is held and
attributed on the tab but never shown in the field's *what this is* row** — a
hand is a tier 0 voice and `conversionsFor` (`09-palette.js`) leaves tier 0
out, so it lands and shows nowhere (`QA-v10` §6 row 4 says it joins as
*· claude*); a skip by name, *known* (H1.10b), that turns into a pass the day
it shows; (3) `QA-v10` §4's *1 selected* predates per-hand gestures — the
hand's look never says *selected* or *the field is open* about John's field
(H1.3). Not run: WebKit (unavailable here); the scenario is Chromium's.
*F1, 29 Sep 2026 (branch `unit/fixes-1`; red `40ebe28`, fix `d51d474`):* **the H1.10b
skip is a pass** — a reading another hand proposes joins the field's *what this is*
row as *gate 0.70 · claude*. Tier 0 is a capability, not an author: the hand joins
at tier 0, and `conversionsFor` left tier 0 out because tier 0 is the shape rung's.
`interpretations.ts` now says who: `isShapeRungReading` (the engine's own
measurement) and `isHeardReading` (another voice's, held and attributed; a name and
a label are not readings to hear). The field's row, `readingsOfMark` (the reading
under a mark) and the panel's shape row (`10-inspector.js`, twice) ask them instead
of `tier === 0`, so a hand's proposal is also never taken for what the rung
measured. `canvas_look` already agreed (H1.10) and is unchanged; e2e 49's golden is
unchanged. Tests: `interpretations.test.ts` 2, `hand` 25 passed, 5 skipped (was 24
and 6). **Found:** a hand's reading has no chip on the board after the field closes
(`08-render.js` draws chips for tier 2 only) — a model's stays, the hand's shows
only in the field and the panel.
**V1** — the review of use: John and the drafter on real work, on John's
machine; the faults written up as `NOTES-V1-REVIEW.md`. **V2** — its fixes,
each with its regression. **V3** — the whitepaper's v1 figures (week 1's
U6): the molecule in 3D, a flowchart's round trip, the pattern; only what
the demos show. **V4** — v1.0.0 (§11).

## 10. How the agents run

`DIRECTOR-PLAN-W2.md` §6 is the protocol, with four additions learned since:

1. **The worktree lives outside `~/Documents`** —
   `/Users/johnhanacek/MetaMedium-w2`, branch `w2` — with dependencies
   cloned (`cp -Rc`), never symlinked. A native binary at a new path blocks
   silently on its first read inside Documents; a symlinked
   `shard-3d/node_modules` makes vite hang.
2. **Commit early, in small steps.** The session that runs the agents has
   been restarted three times in a day, and a restart stops every agent;
   committed work survives.
3. **A second lane only when no file is shared**, in its own worktree
   outside Documents, rebased onto `w2` by the director before it merges.
4. **Each phase lands on `master`** when the whole suite, the gate and the
   WebKit run are green: fast-forward, push. The repository's push address is
   deliberately pointed at a lock by the week-1 automation; pushes go to the
   GitHub address explicitly, on John's instruction, and the lock stays for
   the automation.

The director reviews every unit before the next starts: the diff against
its done-means, invariant and trap; the whole suite; the ancestry of what
was claimed. A unit that fails review is redone on the branch.

## 11. v1.0.0 ships when

1. A1–A9 pass in the gate on Chromium, A1 and A4 on WebKit, and A10 by hand.
2. The no-lost-work test passes.
3. The budgets hold on the 2,000-mark board.
4. The review of use has no open fault that loses work or blocks a scenario.
5. The user guide, the README, `CLAUDE.md` and the whitepaper say only what
   the product does.
6. It is published at its app address, installable and versioned.

## 12. Cut order, and John's decisions

**If time runs short, cut in this order:** J3, then J2, then D8, then D6,
then M7's tiled printing (true-size SVG stays), then R9. Never cut phase 0,
the backbone, R1–R3, or A1 and A4.

**John's to decide** (defaults in brackets; none blocks the ladder):
1. The app's public address [`/app/` on the existing Pages site].
2. Retiring `Web App Skeleton/` and the two monoliths to `archive/` [yes].
3. The real pattern pages as fixtures [no — sample numbers].
4. Which UML diagrams first [class, then sequence, then state].
5. One photograph of a hand-drawn flowchart for D8.
6. The decision seat stays in core as a participant at tier 1½ [yes, as
   landed; maths is its second user].
7. When two hands both bless the same marks, which artifact holds them
   [today both do; proposed: the first bless in merge order holds them and
   the second is refused at the door with its reason, the STATE-1 way].
8. Who makes a hull the shard blesses in the engine's name [the hand whose
   log holds it, so a person can label it — as landed in L2f].
9. The precision a derived length is written to [one place finer than the
   labels it came from: 24 and 8 give 25.3 — as landed in M7].
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
                     "ports": "vertices", "export": { "mermaid": "{%label%}" } } ],
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
| **0. Make week 1 whole** | L1 ids that hold · L1b one event, applied once · L2a the shard pairs by id · L2b labels on the board · L2c the shard asks · L2d duplicate Enter, fitAll, the cache measured · L2e a person labels their own ink · L2f an artifact is made by whoever blessed it · L2g a word is made by whoever wrote its letters · L2h gestures are per hand · L3 CI, bundles, docs | every unit week 1 claimed is whole, CI runs what exists (WebKit included), docs say what the code does |
| **1. The backbone** | B1 tools · B2 context · B3 packs | a tool is one file; the field ranks by context with reasons; a pack is used by an event and benched |
| **2. Editing** | E1 handles · E2 bindings follow · E3 ports, heads and figures | a selected mark reshapes by its points; bound arrows follow; notations can declare ports |
| **3. Diagrams** | D1 flowchart · D2 Mermaid out · D3 Mermaid in · D4 UML class · D5 sequence and state · D6 ER and mind map · D7 routing · D8 the repair demo | A1–A3 pass in the gate |
| **4. Maths** ∥ after B1 | M1 quantities and expressions · M2 the sheet · M3 figures and dimensions · M4 solving · M5 maths on the board · M6 the garment pack · M7 true size and print | A4 passes in the gate |
| **5. Seats** ∥ | J1 decide on the canvas · J2 extraction, a spike · J3 numerals, an experiment | the seat is measured on fixtures; the spike and the experiment say yes or not yet, with numbers |
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

**B3 Packs.** *Owns* `metamedium-core/src/packs/` (format, validation in the
DATA-1 manner, the shipped registry, the `use`/`unuse` events),
`metamedium-core/packs/*.json`, a pack bench helper, a library pane in the
surface. *Done:* a test pack used by an event makes a drawn group match with
no teaching; replay, undo, merge and export carry it; an unknown pack is
said, not thrown; a user's own definition wins a tie. *Red first:* a
scenario test with the test pack. *Invariant:* log as source — the `use`
event, never a pack silently present. *Trap:* a pack that needs orientation
or arrowheads cannot be a signature; that is a notation (D1).

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

### Phase 3 — diagrams
**D1 Flowchart** — `src/notations/flowchart.ts`, the `flowchart@1` pack,
the notation reading in the field and the panel, the ports. *Red first:* a
hand-drawn flowchart fixture (jittered, several strokes per symbol) reads as
a flowchart; a wireframe fixture does not. *Trap:* rotation — the diamond is
known only by its clean form's angle. **D2 Mermaid out** — the exporter tool,
the `mermaid` kind in `kinds/kinds.ts` and its renderer in the `run`
sandbox, the export pane. *Red first:* the fixture's Mermaid equals a golden
text; the render is asserted when the library loads and skipped by name when
it cannot. **D3 Mermaid in** — the parser, the layered layout, drawing
through `strokeFor` with bindings. *Red first:* export of import is the
original text, normalised; import of export reads as the same notation.
**D4 UML class**, **D5 sequence and state**, **D6 ER and mind map** — one
notation module and pack each, each with its golden Mermaid and its bench.
**D7 Routing** — orthogonal connectors between ports and *tidy the diagram*.
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
over every pair are quadratic; measure before indexing. **R5 First run.** A
starter board from the packs; help as a one-page guide; a shortcut sheet;
examples. **R6 Pencil and WebKit.** Pen, touch and palm; hover from a
pencil; a WebKit scenario of the canvas's core records in the gate and in CI.
**R7 Deploy and release.** An app address on Pages that leaves every old
address working; the offline cache versioned; a release script with a
changelog and the standalone file. **R8 One platform.** The monoliths and
`Web App Skeleton/` archived behind their addresses (and out of CI), a docs
index, a README that is a front page. **R9 The shard alongside.** A built
shard published beside the canvas and opened from it into the same room.

### Phase 7 — review and release
**H1** — week 1's U7 (the `hand` gate scenario) plus `QA-v1.md`, a hand
checklist for A1–A10 with the MCP hand in the room checking each step.
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

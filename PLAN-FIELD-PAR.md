# The field, up to par — a plan (2 Oct 2026)

> What John met on 2 Oct, walking the app locally: *I drew two squares with a
> connecting line, then circled the whole thing, did the command and typed
> "diagram", which gave me only two useless options.* He asked to use the
> tool through the front end as a user would, map the gaps, surface every
> affordance the canvas already has, and say what is left that a decision
> model could fix and how to set one up. This is that map and the next push.

**Status: proposed.** Nothing below is built. Section 7 lists the decisions
that are John's.

## 1. How it was walked

`node e2e/walk.mjs` is the walk. It sits beside the gate and is never run by
it or by CI.

- It opens `/app/?fresh=1&nosw=1` and draws with real pointer input
  (`page.mouse`), never through the session's own doors.
- It opens the field the two ways a person does: a loop and the check, or
  press-and-hold.
- It records what the field shows: the *what this is* row, the *what it
  affords* row, and the reading line that says what Enter will do. It does
  this first with nothing typed, then once for each of ten words a person
  might type.
- It writes `e2e/results/walk/walk.json` and a screenshot per scene.

No model is joined, which is a first run as John had it. The walk drew eight
scenes:

1. John's drawing, two ways: a plain line, taken with a loop and the check.
2. The same with an arrow drawn in one stroke.
3. The same, taken by press-and-hold.
4. The same with the arrow's head drawn as a second stroke.
5. A small flowchart: three boxes, a diamond and arrows.
6. The canonical molecule.
7. A line of writing.
8. One box.

The ten words typed in each scene:

> diagram, flowchart, mermaid, tidy, line up, connect, route, export, clean, what is this

## 2. John's case, reproduced

Two boxes, a line between them, circled, then the check:

| | what the walk recorded |
|---|---|
| what the engine knows | *2 nodes joined by 1 edge* (genre `graph`); the line is **tied at both ends** (two `bind` events) |
| what the notations say | *a flowchart 0.36 — two processes, one flow*, *an ER diagram 0.16*; both **under `NOTATION_FLOOR` (0.5)** |
| *what this is* | `flow 0.90` — a concept's name, and a tap on it blesses a thing named "flow" |
| *what it affords* | *Draw them clean*, *What is this?* |
| typed "diagram" | **Name it "diagram"**, **Label it "diagram"** — the two John found useless |
| Enter on "diagram" | builds *the structure (tier 1)*: a live page whose two regions say **"r1 · node"** and **"r2 · node"**; the status line says *the structure (tier 1): r1, r2 — join a model for the words* |
| typed "flowchart", "mermaid", "tidy", "line up", "connect", "route", "export" | each: *Name it …* / *Label it …*, and Enter builds the same page |

The engine knows exactly what John drew: a graph of two nodes, with the line
tied to both. Every diagram tool keys off a *notation* clearing its floor, and
a plain line between boxes clears none. So the field holds *Make it Mermaid*,
*Tidy the diagram* and *Route the connectors* back. A word typed then reaches
only the two completions that every word gets, and Enter treats the word as a
brief.

## 3. What the walk found, worst first

Every row below was reproduced by `node e2e/walk.mjs`. The *cause* column
names where it lives.

| | finding | evidence (scene) | cause |
|---|---|---|---|
| **G1** | **The diagram tools are gated on a notation clearing its floor.** A graph that reads as no notation gets no Mermaid, no tidy and no routing, though the engine knows it is a graph with tied ends. | john-line-*: graph, both ends tied, flowchart 0.36 → no *Make it Mermaid*, no *Tidy the diagram* | `mermaidFor` (`tools/mermaid.ts`) and `diagramOf` (`tools/route.ts`) skip every reading under `NOTATION_FLOOR` |
| **G2** | **A one-stroke arrow's tip never binds.** The pen lifts at a barb's wing, off the site, so only the tail is tied. *Tidy the diagram* and *Route* need both ends tied, so they never appear for the arrow most hands draw. They appear only when the head is drawn as a second stroke. | john-arrow-lasso: binds `start` only; head-apart-hold: binds both, *Tidy the diagram* and *Route the connectors* offered | `07-input.js`: the end binds through `magnetHold`, the magnet at the pen's last point ("drawing past dissolves it"), never at the ink tip the engine reads (`inkTipIndex`) |
| **G3** | **Typing finds only what is offered right now, by its label's first letters or a verb.** Several words find nothing: *tidy*, *line up* and *connect* where *Tidy* is not offered; *line up* even where *Tidy the diagram* stands; *export* anywhere; *diagram* (except the one place *Tidy the diagram* stands). An act that one change would offer never says what is missing. | every scene's typed rows | `visibleItems` (`09-palette.js`) is a substring over offered labels; `verbFor` (`09-field.js`) matches only offered items' verbs |
| **G4** | **A single word that matches nothing is a brief.** With no model, Enter on *diagram* builds a page of empty regions labelled `r1 · node`. On one box or on writing, the line says *writing a program needs a model*. | john-line-lasso Enter; one-box-hold, writing-hold typed rows | `readFieldCommand`'s fallthrough (`09-field.js`: *the brief*) |
| **G5** | **A concept is offered as a name.** `flow 0.90` leads the readings on two boxes, on the molecule and on the flowchart; a tap blesses a definition named "flow". | john-*, molecule-lasso, flowchart-hold | `conversionsFor` (`09-palette.js`) makes each concept a `readingItem` whose `run` is a bless |
| **G6** | **Developer words on the surface.** *the structure, at once (tier 1)*, *join a model for the words*, *r1 · node*, *controls › models*, and in the panel: *becomes a structure, a graph (flow) → a brief builds the diagram, then a model writes the words*. | screenshots in `e2e/results/walk/` | `09-field.js`, `10-inspector.js`, the structure's region captions |
| **G7** | ***Read as writing* is offered on a head drawn apart**: a two-segment chevron the shape rung does not place. | head-apart-hold | `tools/read.ts`, F5's rule, which `headApartAt` (`diagram/heads.ts`) already knows to except |
| **G8** | **The field does not reach the board's own acts.** Export, print, find, examples, packs and help sit only in the control centre. The field is *the one input* (v9 S2), but it is one input for the marks only. | *export* typed: nothing | `conversionsFor` / the tools registry hold only scope acts |
| G9 | Of the flowchart's three arrows, the reading counted *one flow*, and no end was tied. **This may be the walk's own geometry**: shafts of 56 px against a 22 px head. Check it with John's hand before acting. | flowchart-hold: *4 nodes joined by 1 edge*, binds none | not diagnosed |

What already works: the empty board's panel (*draw a few marks → press and
hold one → choose what it becomes*, *start from an example*); *clean*, *what
is this*, *mermaid* (where offered) and *3d* typed; and press-and-hold holding
the whole drawing.

## 4. What the canvas has, and how a person reaches it today

"Typed" means the word reaches it in the field.

| affordance | where it lives | reached today |
|---|---|---|
| Draw them clean | tool `clean` | pill; *clean* typed |
| Line up across / down, match sizes | tool `tidy` (concepts) | pill for a row or column only; *line up* finds nothing |
| Make it Mermaid | tool `mermaid` | pill, only above a notation's floor; *mermaid* typed |
| Draw it (Mermaid → ink) | tool `mermaid-draw` | pill on a held `.mmd` |
| Tidy the diagram, Route the connectors, Show as drawn | tool `route` | pill, only when a notation clears its floor **and** both ends are tied — **never for a one-stroke arrow (G2)** |
| Show it in 3D | tool `graph3d` | pill on circles joined by lines; *3d* typed |
| What is this?, Read the writing, Read these, Read the board, Read the picture | tools `what`, `read` | pill, or typed (*read the board* typed only) |
| Which is it? | tool `which` | pill on a definition tie, with a decider seated |
| Name it, Label it, Not a … | tools `name`, `label`, `correct` | completions of a typed word; `name:` / `label:` |
| Make it a region | tool `region` | pill when a held rectangle holds three or more; `region:` |
| Show the sizes, Check the steps, Print at true size | tool `maths` | pill where the maths has something to say |
| Frame these, Play / Pause / Reset, behaviours | `frames`, `clocks`, `verbs` | pill in their scope |
| Duplicate, Keep as drawing, Notes like this | `duplicate`, `keep`, `like` | typed only (hidden by design) |
| Trace into ink, Edit the text, Show the ink, Fold into the text, Make it text | `trace`, `text-edit`, `text` | pill in their scope |
| `=` a sum, `ask:`, `draw:`, `page:`, `run:`, `new:`, `what:` | the field's prefixes | typed only; nothing on the surface names them |
| Export (bundle, SVG, PNG, PDF, log, Mermaid, true size) | `18-out.js` | the control centre's *export* tile only |
| Find, Notes like this across boards | `26-find.js` | *find*, `/`, ⌘K, ⌘F |
| Boards, examples, packs, models and seats, live with Claude, help | panes | the control centre only |

## 5. The push: tier 1 first, no model

Each unit starts red, as every unit has: a record in the gate that fails on
`master`, then the change. The walk becomes the gate's record (FP9). e2e 49's
golden changes only where a unit says it does, in a commit of its own.

**FP1 — Intent words, one home** (core `tools/intents.ts`; the field reader;
the filter).

- Every tool says the words a person uses for each act it can do. Some are its
  `verbs` today, but the table goes wider:
  - *diagram, mermaid, code, text of it* → Make it Mermaid
  - *tidy, straighten, connect, route, neaten, line up* → Tidy the diagram, Route the connectors, Line up
  - *export, save as, svg, png, pdf* → the export pane's rows
- The board's host acts say theirs too (G8): *export*, *print*, *find …*,
  *examples*, *help*.
- `intentsFor(text, scope)` returns every act the words name, in two kinds:
  - **offered now**: the act itself;
  - **not offered**: the act with **what it is missing**. For example, *Tidy
    the diagram — the arrow's tip is not tied to the box; draw it onto the box*,
    or *Make it Mermaid — these read as no diagram yet*.
- The pure reader asks it before the brief, and the filter shows its results.
  A missing act is a quiet line, never a pill that does nothing.
- Typing `?` lists every intent the held marks have. This is how *surface what
  we already made* is answered at the point of use.
- Hidden offers stay hidden as pills, so e2e 49's golden is unchanged.
- **Red first:** the walk's *tidy*, *line up* and *export* rows.

**FP2 — A graph is a diagram** (core: a registered notation `graph`, read last,
from the roles and the ties).

- Nodes joined by connectors tied at both ends read as *a diagram* when no
  other notation clears its floor.
- That makes Mermaid available: `flowchart` with plain boxes, `---` or `-->`
  by the heads.
- So *Make it Mermaid*, *Tidy the diagram* and *Route* are offered for John's
  drawing.
- **The decision is John's (§7a):** the canonical molecule is also a graph with
  tied ends. Read as a diagram it would gain *Make it Mermaid* and *Tidy*, and
  e2e 49's golden would change by design. The alternative is to leave
  all-circle graphs to the molecule's reading.
- **Red first:** john-line-lasso offers *Make it Mermaid*.

**FP3 — An arrow's tip binds where its ink points** (surface `07-input.js`,
with core's `inkTipIndex`).

- After release, for a stroke the rung reads as an arrow, the end binds to the
  magnet at the ink tip, the point the engine already treats as where the arrow
  points. It no longer binds at the lift-off point.
- *Drawing past dissolves a magnet* still holds for a stroke that is no arrow.
- **Red first:** a one-stroke arrow into a box binds `end`, and *Tidy the
  diagram* is offered on john-arrow-lasso.

**FP4 — A word is not a brief** (`09-field.js`).

- One or two words that match no intent, no name in the library and no verb
  say what they could be: *Name it*, *Label it*, quietly, last.
- Enter on such a word does **nothing until a completion is chosen**. A brief
  is a sentence, or `page:` / `run:`.
- The structure built with no model stays reachable by `page:`. Its regions
  lose `r1 · node`: blank, or the role in words.
- **Red first:** Enter on *diagram* adds no artifact.

**FP5 — A concept is a reading, not a name** (`09-palette.js`).

- `flow 0.90` becomes the person's words, *joined by lines*. Tapping it says
  what it affords, and blesses nothing.
- A name comes from a word: typed, written or read.
- **This changes e2e 49's golden** (the molecule's readings row), by design and
  in its own commit.

**FP6 — The person's words** (`09-field.js`, `10-inspector.js`).

- G6's sentences are rewritten in the voice of PLAN-USER-SURFACE U1a and U1b:
  - *makes the boxes at once — a model can write the words*;
  - *choose a model in the models pane*;
  - the panel's *becomes — Make it Mermaid · tidy it · a page*, the acts named
    only when the field offers them, as N1's rows already do.

**FP7 — Read as writing is not offered on a head** (`tools/read.ts`).

- Ink that `headApartAt` reads as a connector's head, or a connector, is not
  unplaced writing.

**FP8 — The field reaches the board.** FP1's host intents:

- *export svg* opens the export pane on that row;
- *find pricing* opens Find with the word;
- *print* goes to the true-size row;
- *examples*, *help*.

None is a pill.

**FP9 — The walk in the gate** (`e2e/walk.mjs` grows a `walk` scenario of
records, in the default run). The records:

- John's drawing offers Mermaid and tidy;
- a one-stroke arrow binds both ends;
- *tidy*, *line up* and *export* find their acts;
- Enter on one word builds nothing;
- `?` lists the intents.

The prose report stays as the opt-in map.

**Order:** FP3 → FP2 → FP1 → FP4 → FP7 → FP5 → FP6 → FP8 → FP9, each red
first. FP3 and FP2 alone give John his drawing back. FP1 is the largest.

## 6. What a decision model can fix after that

Once FP1–FP8 are in, tier 1 answers the words it knows and says what is
missing. What is left is a choice the engine cannot make from geometry or a
word table, among candidates it already holds. That is the decision seat's
contract (`participants/decide.ts`: a *choice* among candidates with
`no-match` always among them, a *score*, or the probability of *yes*). It is
built, behind an injectable transport, with *Which is it?* as its one job. The
jobs it would add, in order of value:

| | the question | candidates the engine holds | asked when | the answer |
|---|---|---|---|---|
| **D1** | **What did the person mean by these words?** For example *make it a process diagram*, *turn into an ER*, *org chart*, *straighten*. | every intent the scope has (FP1), offered or not, plus *name it*, *label it*, *a brief*, and `no-match` | **Enter**, a deliberate act, when FP1 found nothing | shown as the top pill with its reason (*Make it Mermaid 0.93 · Jev*); a second Enter takes it. A choice never acts on its own |
| **D2** | **Which diagram is this?** It reads under every floor, or as two notations near each other. | the notations read (*a flowchart 0.36*, *an ER diagram 0.16*, *a plain diagram*) and `no-match` | a tap on *Which is it?*, generalised from definitions to notations | one held reading in the decider's name. Above `DECIDER_TAKE_AT` that notation's Mermaid and routing are offered |
| **D3** | **What should this brief make?** | a page, a program, a diagram, an answer | Enter on a brief, before any writer is asked | picks the writer's prompt, or *Draw it* from Mermaid. Saves a wrong page |
| D4 | **Which definition?** | the field's top two matches | the tap (built: `tools/which.ts`) | built |

Not a decision model's job: whether ink is writing. A decider reads text and
does not see; that job stays the reader seat's.

**Which model.** Three candidates are within reach. They are compared on one
bench, and the shipped one is the one that earns it.

- **Jev (OpenRouter `typesafe/jev-1.13`, as John was told; unverified).**
  - It is built for exactly this shape: typed choices in, a distribution out.
  - The seam is ready: `llm/decide-openrouter.ts` with a `DecideWire` that
    a native shape can replace.
  - If the bench says it leads, *decisions by Jev* is honest marketing.
  - **Unverified:** the endpoint, the model id, the reply's shape, and whether
    the native `/v1/systemone` takes a browser's origin. It is recorded as
    refusing one.
- **Model2Vec on the device: the semantic seat, I9, already built.**
  - It runs D1 as a cosine between the typed words and each intent's words.
  - It needs no key, sends nothing and costs about 8 MB.
  - It is not a decider: no `no-match`, and no calibrated probability. It is
    the right **tier 1¼**: live while typing, once seated, the way Find uses it.
  - Its weights are still **unrun** here (I9).
- **GLiNER2 (`gliner-seat/`, parked at *not yet*, J2).**
  - It extracts spans, which fits *extract*: the measurement names on a
    pattern page, or entity names in a brief for an ER.
  - Its graph also carries a classification head, which this repository has
    not ported (`gliner-seat/README.md`). Once ported, it could answer D1 on
    the device, but with no `no-match` and no calibrated distribution.
  - At 614 MB and about 2.2 GB of memory in a page, it is not an iPad seat.
    The J2 verdict stands.

**Setting it up**, in order. Steps 1, 2, 5 and 6 are John's; 3 and 4 are a unit.

1. **The Jev details.** John gets Jev's API document and a key. A script he
   runs (the key in his shell, never in the repository) records one real reply
   per question shape into `llm/fixtures/decide-replies.json`. That replaces
   the shapes written by hand.
2. **If the native endpoint refuses a browser:** one stateless route on the
   relay Worker, `/decide`, that forwards the user's own key header and keeps
   nothing. Keys still never enter a log, a cache or a board. A server seeing
   the key in transit is **John's decision (§7c)**. Through OpenRouter's
   chat-completions shape it needs no proxy.
3. **The bench** (`decide.bench`, a unit of its own): about 200 decisions with
   ground truth John signs off:
   - the walk's words and more, each mapped to the act meant;
   - drawings under the floor, each with the notation meant;
   - briefs, each with the target meant.

   The bench runs the tier-1 table alone, the semantic seat, Jev, a small chat
   model through the existing transport, and GLiNER2's classifier once ported. It records
   accuracy, latency and cost per question. No real vendor in CI: the bench is
   beside the gate, like `gliner-seat/`.
4. **D1 behind the seat**, then D2 and D3, each a tool with the dot, and each
   asked only by its deliberate act (§6.3 of the v9 plan, unchanged).
5. Ship the winner as the default decider. Market it if it is Jev.
6. **Set it up on the iPad:**
   - models pane → *seats* → *decider* → Jev (or the winner);
   - the key, entered once for its provider;
   - *try it*.

## 7. What is John's

a. **FP2:** is the molecule a diagram? Reading every graph with tied ends as
   *a diagram* gives the molecule *Make it Mermaid* and *Tidy* too (e2e 49's
   golden changes by design). The alternative is to keep all-circle graphs out.
b. **FP4:** should Enter on a lone unmatched word do nothing until a completion
   is chosen, and a brief need a sentence or `page:`?
c. **Jev:**
   - the API document, the endpoint and a key, for recording real replies;
   - if Jev refuses a browser, is a forwarding route on our relay acceptable?
     It would see the key in transit and keep nothing.
d. **D1:** on Enter only, or also live while typing through the on-device
   semantic seat (nothing sent)?
e. **FP5:** concept readings in words (*joined by lines*), with or without
   their number?

## 8. Commands

```bash
node e2e/walk.mjs            # the map, every scene (Chromium, ~1 min); e2e/results/walk/
node e2e/walk.mjs john       # John's drawing only
```

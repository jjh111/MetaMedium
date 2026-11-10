# Relations, concepts, the diagram rung and every notation

> Part of the engineering reference that `CLAUDE.md` indexes. The code is the truth; this says why it is shaped so.

## Relations and concepts (Tier 1)

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

## The diagram rung: what a mark PLAYS

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
magnet there. One the rung reads as an arrow at `ARROW_TIES_AT` or more, its tail and tip on two different closed marks, is a
connector however short (`arrowBetweenClosed`; the UX pass): the letter rule used to take a short one for writing.

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

## The state diagram (V1-PLAN D5, the state half)

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

## The ER diagram (V1-PLAN D6)

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

## The mind map (V1-PLAN D6)

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

## The garment pattern piece (V1-PLAN M6)

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

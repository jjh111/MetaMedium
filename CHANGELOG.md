# Changelog

Every release of dyna.ink — MetaMedium until 0.1.0 — the app at
https://jjh111.github.io/MetaMedium/app/ — newest first: its version, the day
it was cut, and the subjects of the commits since the release before it,
grouped by the unit each commit names (`V1-PLAN.md` §9).
`node scripts/release.mjs <version>` writes each section from the history;
nothing here is written by hand. `VERSION` holds the current version, and a
release's tag is `v` and that version.

## 0.1.0 — 2026-10-02

From the beginning: 801 commits, merges left out, grouped by the unit each names (`V1-PLAN.md` §9).

### A1

- A1 red: pictures in a room — the relays' asset endpoints, the hand's canvas_import and canvas_see, the tab's room hooks (`3c681d7`)
- A1: both relays keep a room's pictures by their hash — one protocol, two servers; and the PNG decoder under the ink (`f974c87`)
- A1: the MCP hand puts a picture on the board (canvas_import) and sees one under the ink (canvas_see) (`141d979`)
- A1: the tab puts a picture on the room's relay before it names it, and fetches one it is named but has none of (`ed0f66d`)
- A1: the surface fragments' headers say what the room's pictures add (`cc78c42`)
- A1: CI runs the PNG reader's test (`0c2c093`)
- A1: docs — pictures in a room and the agent's hand on them (`e4709e6`)

### A2

- A2 red: what a hand may move, where with Claude looks for a relay, and the hand's find, region and move — in core's tests, the surface's Node test, the MCP smoke and the gate's hand scenario (`651f378`)
- A2: the hand finds, makes a region round anyone's marks and moves what it made; with Claude defaults to the hosted relay on dyna.ink (`e525471`)
- A2: docs — CLAUDE.md's MCP hand (fourteen tools) and The hand organises notes, HELP, PLAN-IPAD-NOTES' status line, the Cloudflare README's with Claude (`3ba86f9`)
- CLAUDE.md: the gate's counts after wave 3 (A2, A2b, P1, I9) — 871 records, 858 passing and thirteen skips by name (`c6f6aee`)

### A2b

- A2b red: a hand moves anything on the board, John's marks and a region that carries them included, and says whose — core's handMoves, movedSaid and otherHandMoves, the MCP smoke and the gate's H1.28 flipped from the refusal to the new rule (`816556c`)
- A2b: a hand moves anything on the board and says whose; the tab says when another hand moved marks of its own (`c068a6d`)
- A2b: docs — CLAUDE.md's ruling (John's, 2 Oct 2026), what John sees and his way back, HELP, PLAN-IPAD-NOTES' status line and John's decisions 6 and 7 (`50b80e1`)

### A10

- QA-v1.md §A10: what only an iPad and a pencil can check (`4e44707`)

### ACT-1

- Undo is one whole act, and the act says so in the log (ACT-1) (`82cf494`)

### AGPL-3

- RENAME-PLAN: MetaMedium becomes dyna.ink — the spellings, what keeps the old name, John's decisions (AGPL-3.0-only, DynaInk3D in dynaink-3d/), units N0–N5 and H1, and the freeze (`c3f5a4a`)

### B1

- B1 golden: today's field offers for three scopes, captured before tools (`f16a720`)
- B1 red: a tool registered in one line offers in the field — and there is no registry (`7714594`)
- B1: the tool registry, the field's order in core, and the tool's id on what it writes (`e388c55`)
- B1: every affordance the field shows, as a registered tool (`223c5c1`)
- B1: the palette is the adapter — readings read here, affordances from the tools (`12dada2`)
- B1 e2e 49b–c: a tool registered in one line is offered in the open field (`b303a43`)
- B1: HERE, the router, the tier-1 library and the models pane read the tools (`a4c260a`)
- B1: what a tool writes says which offer it took; an offer that asks never leads (`b9b4ecb`)
- Docs for B1: Tools in CLAUDE.md, the status line in V1-PLAN §9 (`f748268`)

### B2

- B2 red: context lifts beside a flowchart and a row, the steady top, far is B1's (`20e11e9`)
- B2: context in core — contextAt reads what stands beside a scope; rank lifts and holds (`06a04ee`)
- B2: the field ranks in context — lifts said, the top held, the reading under a mark by the same rank (`1b78c59`)
- B2: the open field's context handle is paletteContext, not fieldContext (`ab629ff`)
- Docs for B2: Context beside Tools in CLAUDE.md, the status line in V1-PLAN §9 (`e29bc45`)
- V1-PLAN §9 B2: the red commit held 50, 50b and 50c; 50a came with the surface (`2f565e0`)

### B3

- B3 red: a library pack used by one event makes a drawn molecule match with no teaching (`f092948`)
- B3 core: library packs — the format, the validator, the shipped registry, use/unuse (`c5aa363`)
- B3 bench: every pack reads its own drawings and nothing in the corpus falsely (`2aee962`)
- B3 budgets: the 2,000-mark board holds PERF.md's budgets with two packs in use (`16ad04b`)
- B3 core: a field open when a board uses or stops a pack offers what it now knows (`0949360`)
- B3 surface: the packs pane, a match that says its pack, and the pen that follows the board's (`2b149b3`)
- B3: the MCP hand's look says the packs the board uses, and a pack it lacks (`6f04823`)
- B3: FLOWCHART_TABLE stays the single home of the flowchart's symbols — the comments say so (`4a7b059`)
- Docs for B3: Library packs beside Tools and Context in CLAUDE.md, the status line in V1-PLAN §9 (`b353adc`)

### CF1

- CF1: the room relay as a Worker — its protocol tests, red (`65e8c2d`)
- CF1: the room relay as a Worker and Durable Object, keys per room, Node transport with a key (`50ae929`)
- CF1: the MCP hand and the seat's watcher join a relay with a key (`69efeba`)
- CF1: a room's key is never carried into a board's address — test, red (`2a47486`)
- CF1: a tab joins a keyed relay with ?key= — said when refused, never kept (`eb6fcee`)
- CF1: the Worker runs in workerd — wrangler.toml, and a test against the real runtime (`c9e77ae`)
- CF1: dyna.ink on Cloudflare Pages — the site, its headers, its redirect, the deploy workflow (`466cd85`)
- CF1: cloudflare/README.md — what John does, once (`2e4770e`)
- CF1: CLAUDE.md (repository map, Live logs), PLAN-IPAD-NOTES status line, CI runs the relay and site tests (`62a55b4`)
- CF1: Cloudflare set up from a browser — the workflow makes the Pages project and puts the relay's secret (`faa5e66`)

### D1

- D1 red: the flowchart notation — its bench, its symbols, flows, labels and ports (`8a249eb`)
- D1: the flowchart notation — symbols by their corners' angle, flows past their heads (`ba179d1`)
- D1: notations in the public API; the pen's hook walks ends, not every node's edges (`291f9cb`)
- D1: held both ways where the hand is ambiguous, and the same at any zoom (`f15de31`)
- D1 docs: the status in V1-PLAN §9, notations over the roles in CLAUDE.md (`d5b86ec`)

### D2

- D2 red: Mermaid out, the data symbol after clean, a turned box's sides (`f4cdbc8`)
- D2: Mermaid out — the flowchart said as Mermaid text, at tier 1 (`e73228b`)
- D2 item: a box drawn leaning is drawn clean at its lean — data stays data (`4bdacc6`)
- D2 item: a rectangle measures its sides, at whatever angle it stands (`3cf1ae7`)
- D2: export Mermaid out from core (`9eeb726`)
- Docs for D2's core: status lines in V1-PLAN §9, Mermaid out in CLAUDE.md (`6c958a4`)
- D2: a row holds a small dot beside a tall box — reading order made symmetric (`3d284c4`)
- V1-PLAN: D2's status line counts the reading-order test (Mermaid 21, core 1145) (`a7180c4`)
- D2 surface red: the mermaid kind and the Mermaid tool as core tests (`1db61f7`)
- D2 surface: the mermaid kind and the Mermaid tool (`4af4c79`)
- D2 surface: mermaidFor, the one home for what reads as a diagram worth saying (`b44a293`)
- D2/D3 surface red: e2e 62 and 63, and the stand-in library the gate serves (`73c0cb5`)
- D2/D3 surface: the mermaid frame, Draw it, the export row, the editor (`16e3102`)
- D2/D3 surface: HELP, CLAUDE.md and V1-PLAN §9 say what a person can now do (`95aaa69`)

### D3

- D3 red: Mermaid in — the round trip; a leaning box is no rectangle (`406f966`)
- D3: Mermaid in — a text drawn as ink that reads back as the same text (`e5535df`)
- D3: connectors that read as drawn — routed, and checked by reading them (`3d0c4e8`)
- D3 tests: the reader, the layout, the drawing, and random charts (`1e8da6b`)
- D3: the module's account of its connectors, and a few names tidied (`960eec5`)
- Docs for D3's core and item 0: status lines in V1-PLAN §9, Mermaid in in CLAUDE.md (`8de43ff`)
- D3 surface red: Draw it as a core tool test (`60ca34d`)
- D3 surface: Draw it, a tool for a held mermaid artifact (`2ce0955`)
- D3 surface: a label on a closed mark stands inside it when the words fit (`b6f529b`)
- D3 surface: V1-PLAN's status line carries the gate's numbers (`0b6dc8b`)

### D4

- D4 red: A2 as a core test — two classes with compartments and an inheritance arrow read as a class diagram and export the golden classDiagram text (`27e5ac0`)
- D4 core: the UML class notation — classes read in their own frame, relations by their heads, multiplicities at their ends; classDiagram out and in (`abc6605`)
- D4 Mermaid in: the round trip holds for class diagrams — arcs around a class in the way, dashes beside their own line, heads read apart (`b98889b`)
- D4 bench and pack: every class, relation and multiplicity right across 36 hands; uml-class@1 ships, naming the notation (`fd16b6f`)
- D4: the class reading asks only what could say UML — boxes the rung reads as rectangles, heads only at lines between boxes (`d87a1f4`)
- Docs for D4: the class diagram under the diagram rung in CLAUDE.md, the dated status line under D4 in V1-PLAN §9 (`306d49a`)
- D4: a compartment line is ruled — writing across a class from side to side zigzags, and is a member (`3a637dd`)
- D4: the class Mermaid module's header says how the drawer draws now — arcs, square diamonds with a hatch after, dashes (`5b552c8`)

### D5

- D5 red: A3 as a core test — three lifelines and four messages read as a sequence diagram and export the golden, in order (`0aec805`)
- D5: dashed lines — short strokes in a row read as one line, derived; printed capitals never one (`5ad9d77`)
- D5: the sequence notation and its Mermaid — A3 reads and exports its golden, in order (`67509de`)
- D5: the sequence round trip — every text the writer writes comes back, drawn and read again (`dd419b3`)
- D5: the sequence@1 pack — names the notation, restates none of it; its lifelines on the pen while in use (`a22129b`)
- D5: the sequence bench — every participant, lifeline, name, message, order and label, 36 hands (`7889203`)
- D5: the sequence notation, rule by rule — and a long message's small head held (`aacbb58`)
- D5: the sequence read measures a box only over a lifeline's top — 60 ms to 10 ms on the 2,000-mark board (`3eec7ec`)
- Docs for D5 (the sequence half): the status line in V1-PLAN §9, the sequence diagram beside the class diagram in CLAUDE.md (`424f563`)
- D5 state red: the state board as a core test — 109 of 116 fail (`6f0480c`)
- D5 state: the reading — states, an initial dot, a final ring, transitions and loops (`2ce9367`)
- D5 state: Mermaid out and in — writer, reader, and a drawing the notation reads back (`037463b`)
- D5 state: the round trip holds — a text drawn is read back and said again (`c5334d0`)
- D5 state: the rules and the bench, with their rates (`37a9288`)
- D5 state: the state@1 pack, and the packs bench with the state board in its corpus (`2cc2b81`)
- D5 state: docs — CLAUDE.md's state section, V1-PLAN's status line (`af78dd0`)
- D5/D6: both engine bundles rebuilt from source (`fe222e7`)

### D6

- D6 ER red: the ER board as a core test — 109 of 116 fail (`e17327a`)
- D6 ER: the notation reads the ER board and says it as erDiagram (`47dacc3`)
- D6 ER: the round trip holds; the rules, the bench and the er@1 pack (`f672fb2`)
- D6 mind map red: the mind-map board as a core test — 109 of 116 fail (`f9fd80b`)
- D6 mind map: the notation reads the board and says it as mindmap (`512eb42`)
- D6 mind map: the round trip holds; the rules, the bench and the mindmap@1 pack (`f833f55`)
- D6 ER: a relationship as short as a letter is pinned (`59c011e`)
- D6: tidy — an unused constant and a duplicate import out; the bundles rebuilt (`006fb5f`)
- D6: docs — CLAUDE.md's ER and mind-map sections, V1-PLAN's status line (`80f8edd`)

### D7

- D7: red — routing tests: the geometry, a routed connector on a board, the tool, and e2e 66 (`3874a08`)
- D7: routing in core — a route event, a derived orthogonal polyline, the tool, and tidy the diagram (`659d1b0`)
- D7: the surface draws the route in front, the ink faint beneath; e2e 66 passes (`3ff61f0`)
- D7: the room oracle routes — a connector tied at both ends, routed, and now and then its box moved or its routing taken off (`852c5ac`)
- D7: docs — CLAUDE.md's Routing section, HELP.md's Tidy a diagram, V1-PLAN §9's status line (`a262e2f`)
- D7: a route whose connector lets go of its last tie is found again where it is let go, not by way of what is tied to what (`74fd5e6`)

### DATA-1

- A tree that arrives as text is validated, never cast (DATA-1) (`76fb89b`)

### E1

- E1 red: handles and reshape, against the contract with nothing behind it (`f6e7c3a`)
- E1 core: a handle dragged reshapes the clean form — one event, the ink untouched (`2fe798c`)
- E1 surface: the one selected mark's own points, dragged — and the zone rule (`207e1ca`)
- E1 red: a loop that waits is a gesture in waiting — no reshape of it (`7eb87f3`)
- E1: a loop that waits is never reshaped — at the door and on replay (`6f72a2e`)
- Docs for E1: Handles beside Magnets in CLAUDE.md, P2 landed, the status line in V1-PLAN §9 (`a5a9d1e`)

### E2

- E2 red: bindings follow — 22 of 25 core tests and e2e 53/53a against the contract with nothing behind it (`2c73eff`)
- E2: bindings follow — a derived map in the connector's own space, the hand's own rules for its ends (`b9167c0`)
- E2 core: a manipulation and the hand's decisions as pure functions — what a drag's preview asks (`f6ba5bc`)
- E2 surface: a drag carries what is bound to it before the hand lets go; a connector's own end feels the magnets (`221db7b`)
- E2 budgets: a move that carries ten bound arrows, held to a stroke's budget (`c2c8735`)
- Docs for E2: bindings follow in CLAUDE.md, P3 landed in CONTROL-POINTS-PLAN.md (`c117e79`)
- E2 tests: the trap — a connector's own form changes and it follows again; what a log can hold (`e1cfa88`)
- Docs for E2: the dated status line in V1-PLAN §9, the move budget in PERF.md, the gate's counts (`5dff6f2`)

### E3

- E3 red: ports by notation, connector heads, figures of several strokes (`443727d`)
- E3: ports by notation — one hook beside magnetSites (`c434a0d`)
- E3: figures of several strokes — lines whose ends meet read as one figure (`528a060`)
- E3: connector heads — what sits at each end of a line or arrow (`bf64945`)
- E3 docs: the status in V1-PLAN §9, ports, heads and figures in CLAUDE.md (`4427130`)
- E3: finding a port again asks only its own notation; an end a mark touches says so (`694faf7`)

### F1

- Foundations first (v10 F1–F7): letters at any size, an arrow that draws back on itself, a mark that fires on what it crosses, ghosts that go, Read as writing, readings that stay as chips, a minimap (`d087c92`)
- F1 red: another hand's proposed reading joins the field's row with its author (`40ebe28`)
- F1: a reading another voice proposed shows in the field's row, told by its author and not its tier (`d51d474`)
- F1, F2: docs — CLAUDE.md, e2e README and QA-v1 say the field shows a hand's reading and prose says nothing (`587f0a6`)
- F1, F2: V1-PLAN §9 — dated status lines under H1 and M5 (`52edd44`)

### F2

- F2 red: prose on the board is not read as maths (`437f625`)
- F2: a line counts as maths only when it looks like it — prose says nothing (`f03f0fd`)

### F8

- Taking writing makes text, not vocabulary (v10 F8–F11): fitted text in place with the ink underneath, one tap lets go, a failed brief leaves nothing, Esc stops a model, reading by the smallest model that sees (`99ad98f`)

### F12

- Text folds back from ink (v10 F12), every making prompt says what can be made here (F13), and QA-v10 with the MCP hand in the room (`ec18da0`)

### FP6

- tier1: the structure's slots say what each region plays — the test follows FP6 (`06c5a2e`)

### G0

- G0: the board leaves the tab, and a brief always answers (`55befa1`)

### G1

- G1: the sketch hull, in the volume its claims define (`59acbf1`)

### G2

- G2: the parts of a hull, said (`abe1be4`)

### G3

- G3: the brief a small model can answer (`d2ddf0a`)

### G4

- G4: the loop on John's own drawing (`a64c83a`)
- G4: the README as one document, and push 2's status (`bb1575b`)

### GRAPH-1

- A body answers about itself, not about where its definition was drawn (GRAPH-1) (`af5e105`)

### H1

- H1: the hand scenario's first records, red until the runner knows it (`48d1cae`)
- H1: the hand scenario is registered in the gate's list (`a0d3df0`)
- H1: §4 rows of QA-v10 through the tab with the hand looking on (`7f8731d`)
- H1: §6's first rows, and one red — the hand's own look does not say who read a mark (`8afdee2`)
- H1: the hand's look says who read a mark, its own proposals included (`467759b`)
- H1: §6's undo, labels, a field left open and a loop that waits, with the hand in the room (`facb6c2`)
- H1: a reload, a label after it, and a sentence and a reading after undo and reload (A7) (`094fda0`)
- H1: What is this? as the one deliberate ask, the minimap, Show it in 3D — and a red: the hand's look says a name of John's is the hand's reading (`1344291`)
- H1: a name somebody gave says nothing of who read it in the hand's look (`9dacd98`)
- H1: the invariant record, and the rows only John's hand can walk as skips by name (`9a71007`)
- H1: QA-v1's hand checklist for A1–A9 with the MCP hand's column, and the hand scenario in e2e/README (`63cac30`)
- H1: docs — the hand in the gate in CLAUDE.md, V1-PLAN §9's status line (`a0525c0`)
- H1: V1-PLAN's status line carries the whole gate's numbers (`54644c4`)

### I1

- I1 red: a picture is kept and drawn — the tests, failing (`d32146f`)
- I1: a picture is an asset — the import event names it, core reads it, Trace into ink is a tool (`1255145`)
- I1: pictures kept in the asset store and drawn on the board under the ink; Trace into ink; a pick laid out (`0bed21f`)
- I1: a pick stands clear of what is on the board; the hand's look says a picture; CI runs the asset rules; help and CLAUDE.md (`6fcc216`)
- I1: record 69k0 (press and hold on a picture); V1-PLAN status line (`1120703`)
- CLAUDE.md: the gate's counts after I1, I3, I7, CF1 and the rejoin fix (`18fe396`)

### I2

- I2: red — an import of 2,000 traced strokes beside an SVG takes 96 s to apply and 91 s to replay (`6433deb`)
- I2: a group is settled when it is read, signed when it could match, joined where it stands (`57dc380`)
- I2: a scope of thousands is read through tables and a filed plane, not by walking both (`d7eacac`)
- I2: the gate's budgets scenario opens a board of 5 artifacts and 5,000 traced strokes (`a719b72`)
- I2: docs — CLAUDE.md's settled groups and scopes, PERF.md's After I2, V1-PLAN's status line (`80d1484`)
- I2: the pictures board's "opens whole" counts the ink, not the content plane (`ce9c110`)

### I3

- I3 red: kept on the iPad — the tests, failing alone (`eaf16d1`)
- I3: the pencil's coalesced samples are read, every point has a time t (`3e933a1`)
- I3: installable on the iPad — PNG icons, the iOS meta, a theme colour from the tokens (`5d8f3f0`)
- I3: the app asks the browser to keep its storage, and the boards pane says how much room there is (`6944726`)
- I3: HELP.md On an iPad; CLAUDE.md and V1-PLAN.md say what was built (`e008ad4`)

### I4

- I4, red: the board bundle's zip, PDF and SVG writers and readers, and the log header's asset count — tests alone (`1e1d676`)
- I4: the pure half — a zip by hand with its CRC, the board bundle, the board as one SVG, the PDF writer, the sizes; the log header says how many pictures sit beside it (`767cc5b`)
- I4, red: e2e 70 (out and back whole) and the boards scenario's N22 — tests alone (`20c65e7`)
- I4: Export carries the board whole — a .dyna.zip bundle, board.svg with its pictures and figures, board.png of the whole board, board.pdf; from a file… opens a bundle (`f2e1d11`)
- I4: docs — CLAUDE.md (out and back whole, the fragments), HELP.md, V1-PLAN §9 and PLAN-IPAD-NOTES status lines (`d55ffba`)
- CLAUDE.md: the gate's counts after wave 2 (I4, I5, I6, I8, A1) — 846 records, 834 passing and twelve skips by name (`b43f43f`)

### I5

- I5 red: regions — membership by one rule, nesting, one-act move and scale with a bound arrow following, rename, erase keeps contents, replay (`f801279`)
- I5: regions in core — a region event and rename, membership derived by one rule, a move or scale carries what it holds in one act (`41b9ba6`)
- I5: the Make it a region tool, the board's outline, and the MCP hand's look lists regions (`c9c94af`)
- I5: regions on the surface — the titled frame under the ink, its title a handle, the panel's words and the board's outline, the minimap; a moved artifact carries its own frame (`e4f16dd`)
- I5: docs — CLAUDE.md Regions, HELP.md, PLAN-IPAD-NOTES and V1-PLAN status; the MCP smoke lists a tab's region (`87e70b0`)

### I6

- I6 red: core search tests — words, what a board says, a query across boards, which to index again, a thumbnail's fit (`5557e83`)
- I6: core search — words, what a board says, a query across boards, which to index again, a thumbnail's fit (`fb2db0a`)
- I6 red: e2e boards N23 — find across two boards, a hit opened in place, a changed board found with no reload, the kept index not built again, thumbnails, the keys, a trashed board (`d5d9a5e`)
- I6: Find across every board, and a picture of each board in the list (`a3f8059`)
- I6: docs — Find under Several boards, HELP, the plan's status lines (`f5c6bd4`)
- I6 with I5: a region's name is found by Find (`9e1b702`)

### I7

- I7: seats per job — red first: the decider's transport, Which is it?, the seats' rules and the gate's seats records (`87decad`)
- I7: the decision seat over a chat completion, and Which is it? (`622da4f`)
- I7: seats on the surface — a reader, a writer, a decider and one key a provider (`75bd710`)
- I7: docs and small follow-ups — CLAUDE.md (the model pane's seats, the decider, keys the provider's), V1-PLAN §9 and PLAN-IPAD-NOTES status lines (`54d434d`)
- I7 finding, red: a model joined on one board is not in the next — core test and e2e M20–M23 (`bf86cf8`)
- I7 finding: a participant is seated on the board it is asked on — lazily, once (core) (`4e957aa`)
- I7 finding: every joined model is seated on the next board — the surface, and the decider's special case goes (`4926188`)
- I7 finding: docs (CLAUDE.md seats, PLAN-IPAD-NOTES I7) and a core test for Claude Code's seat (`de3ae26`)

### I8

- I8 red: reading my notes — core tests for the lines, the sheet, the batch reply, readLines, readPicture and the offers; e2e M24-M28 (`26c8953`)
- I8: reading my notes in core — every line from its own strokes on one numbered sheet, a batch reply read line by line, readLines and readPicture, Read these / Read the board / Read the picture (`60c5e8f`)
- I8: reading my notes on the surface — the batch, progress on the marks, Esc, the picture's text beside it; the stub's reader; the TrOCR spike page (unrun) (`44848bb`)
- I8: the seat takes a batch (one brief, every mark named); e2e M26b, read the board typed (`c02e74f`)
- I8: docs — CLAUDE.md Handwriting, HELP.md, PLAN-IPAD-NOTES §4, V1-PLAN §9 (`57a2f66`)
- I8: Read the board is offered only where the board holds lines beyond those held (`816de48`)

### I9

- I9 red: the semantic seat's seam — the transport, cosine, the scorer Find takes, notes like this, a static-embedding reader, the offer, the seat's rules (`1637420`)
- I9: core — the semantic seam: EmbedTransport, cosine, a stub, the scorer Find takes, notes like this, a static-embedding reader, the Notes like this tool (`40a731b`)
- I9: surface — the semantic seat's row, Find by meaning, Notes like this, and the gate's records N24–N24l (`a2905be`)
- I9: docs — CLAUDE.md's semantic seat and the counts, HELP.md's find by meaning and notes like this, PLAN-IPAD-NOTES's dated status line (`991edba`)

### J2

- gliner-seat: the J2 spike's folder, ignoring every dependency, weight and cache (`0085721`)
- V1 plan: J2's answer (not yet, with the numbers), and L2e — a person labels their own ink (`d7e1f25`)

### J4

- J4 red: the canvas's seat — Claude Code over MCP as a model the field asks (`663c887`)
- J4 core: the seat — a model that parks its questions in the room (`0fd79c8`)
- J4 hand: canvas_pending and canvas_answer, and the watcher that wakes a session (`55be417`)
- J4 surface: Claude Code leads the models pane, and "with Claude" takes the seat (`dfae88b`)
- J4 surface: the seat's entry fits its line — the side note short, the rest a sentence under it (`814d63a`)
- J4 docs: the canvas's seat beside the shard's, and J4's line in V1-PLAN §9 (`14f593d`)
- CLAUDE.md: the gate's count after J4 and J5 — 589 records and the one honest skip across eleven scenarios (`36eb339`)
- e2e seat J4.2: the working entry is a read about the two marks — its key no longer carries the participant id (`de4c8dc`)

### J5

- J5 red: a hosted model is asked, and says why when it cannot be (`cb26c51`)
- J5 core: a reply read the way the provider sends it; a failure said in full; what a provider's list says a model can do (`cb1a4c4`)
- J5 surface: a join asks the provider what a model can do; each model's last call and try it; asking never opens the pane (`abfe4c7`)
- J5 surface: a model's row gives its name the width, and what it is and can do a line of its own (`b1968a5`)
- J5 surface: a remembered model that does not rejoin says why in the status line (`6f8a327`)
- Docs for J5: the transport and the models pane in CLAUDE.md, the dated status line in V1-PLAN §9, the models scenario in e2e/README.md (`5892a70`)
- V1-PLAN §9: J5's status line names every commit of the unit (`3497920`)

### L1

- L1 red: ids that hold — the regressions alone, failing (`3f1f4f2`)
- L1: ids that hold, in core — the sitting's high-water mark, and a store that says what it hears (`65f5870`)
- L1: the relay's memory is settable, and a log handed on never supersedes the writer's own (`b4c4be7`)
- L1: the canvas and its MCP hand — one sitting per page load, the log as it stands, and the room's word said (`6191f87`)
- L1: the shard and its MCP hand — one sitting per page load, the log as it stands, the room's word said (`87f80c0`)
- L1: a send that never settles does not wedge a hand (`a1f0fa9`)
- L1 docs: the log-name rule, the collision and truncation lines, an undo sent whole (`f8d1960`)
- L1: a log a hand handed on, echoed back by the relay, is its own copy (`09927fb`)
- L1 status: the last commit, the held logs replayed as before, the two real tabs (`2373277`)

### L1b

- L1b red: one stamped event in two logs is applied twice, and a collision is never said (`7d79018`)
- L1b: one event, applied once — the merge keeps one event per authorship (`ad8f17b`)
- L1b, L2b, L2d docs: one event applied once, the label on the board, one Enter, what fitAll fits (`df5d108`)

### L2a

- L2a regression: the shard's brief and answer pair by the brief's node id (red) (`0540c1c`)
- L2a: the shard names its log, and a brief and its answer pair by the brief's node id (`092f747`)
- L2a, L2c, L2d docs: the pairing by id, the question, and the cache's number (`af7f353`)

### L2b

- L2b red: the label on the board, canvas_label, and a label standing in for the shape (`2d6fc90`)
- L2b: the label on the board, and canvas_label — a hand's own word on its own ink (`edfc841`)
- L2b red: canvas_write cannot place a figure relative to a mark (the notes, §F) (`15658e3`)
- L2b: canvas_write places a figure relative to a mark (the notes, §F) (`894601d`)

### L2c

- L2c regression: a hull stood on one standpoint asks how deep (red) (`1a285fa`)
- L2c: a hull stood on one standpoint asks how deep, and a view or a word closes it (`ac2e069`)
- L2c and L2d in the gate: the question through the real UI, and the silhouette cache measured (`22641f9`)
- L2c regression: a loop from nearly overhead is a plan, not a standpoint (red) (`4cbe983`)
- L2c: a plan is what the form rung calls one — past PLAN_NORMAL, not only straight down (`30634a2`)
- V1-PLAN §9: the L2c status names the plan fix too (`2f3b7f7`)

### L2d

- L2d red: two Enters on one loop act twice, and fitAll fits fiction (`295ce6d`)
- L2d: one Enter, one act — and fitAll fits the content, the cards placed in it (`29224d4`)

### L2e

- L2e (red): the field reads `label: word`, and Enter labels a mark from it (`fea5e3b`)
- L2e: the reader reads `label: word`, and says whose marks it will not go on (`7fa7f7e`)
- L2e: a person labels their own ink from the field — Label it beside Name it (`284df79`)
- L2e: the gate's records for a person's label — undo, erase, both themes, the pair, another hand (`8aa5797`)
- L2e: one wording for another hand's marks, in the reader; tooltips tightened (`765c190`)
- V1 plan: L2e's status — a person labels their own ink (`b63f693`)

### L2f

- L2f red: a bless writes no maker, so every board reads an artifact as its reader's own (`c004c8e`)
- L2f red, revised before the fix: a bless in the engine's name is its hand's act (`34358ac`)
- L2f: an artifact is made by whoever blessed it, on every board (`6da3554`)
- L2f: on the canvas, each mark inside an artifact keeps its drawer's colour (`de471c0`)
- CLAUDE.md: an artifact is made by whoever blessed it (L2f) (`2358bfb`)
- V1 plan: L2f — an artifact is made by whoever blessed it, with its status (`c1aa0ec`)

### L2g

- L2g red: a word is made-by the reader, and gathering never asks whose letter it is (`9ae7ba9`)
- L2g red, on the hand and the canvas: another hand's word reads as the reader's (`a313935`)
- L2g: a word is made by whoever wrote its letters, and is one hand's run (`d6d1a37`)
- CLAUDE.md: a word is made by whoever wrote its letters, and is one hand's run (L2g) (`14f28ad`)
- V1 plan: L2g — a word is made by whoever wrote its letters, with its status (`429d300`)

### L2h

- L2h red: gestures are one for the whole board, and a merge interleaves hands (`e9ec56d`)
- L2h red, on the canvas: two hands in one room share one set of gestures (`b2a5568`)
- L2h: gestures are per hand, keyed as authorship is (`1f377ec`)
- L2h, the canvas's half: a hand's own mark in a room (`345be9f`)
- Docs for L2h: gestures are per hand — CLAUDE.md and the V1 plan (`651ae06`)

### L2i

- L2i red: after a reload a person is a stranger to their own ink (`4f9c113`)
- L2i: the rules that ask "is this mine?" compare the person (`22b0c9b`)
- L2i, the canvas's half: the field asks core whose ink is held (`564a058`)
- L2i, the MCP hand: a restarted hand is the same person (`039f353`)
- L2i: a word stays one sitting's run — the guard (`7987ef0`)
- Docs for L2i: a person is the same person across sittings (`3510ab1`)

### L2j

- L2j red: undo is per hand — two hands, both merge orders, and tool acts (`34885ff`)
- L2j red: the room's oracle holds every undo to its hand's writing (`e046c90`)
- L2j: undo takes back this hand's last act, never another hand's (`a534e33`)
- L2j: what an act is, pinned — lastAct, nesting, the close, checkpoints (`063c3ac`)
- L2j: the shard's undo reads its act off its own events (`700da7d`)
- L2j: a failed brief's bless is dropped when it is still this hand's last act (`4434d44`)
- Docs for L2j: undo is per hand, and what an act is (`828837c`)

### L3

- CI runs the relay's test and the WebKit smoke (L3) (`bf4b533`)
- The WebKit smoke takes one pill (L3) (`426f547`)
- L3 red: two fragments may declare one function, and the build says nothing (`8b2493b`)
- L3: the surface's build refuses a function declared in two fragments (`5487395`)
- CLAUDE.md: phase 0 done, 0b next and why, the map and the tiers current (L3) (`51194de`)
- Docs for L3: the roadmap, T8 done, QA's two hands, the core README (`7bdb2f2`)
- V1 plan: L3's status, and phase 0 done on w2 (`e1f5349`)

### M1

- M1 red: the sample pages' lines, each with the reading the drafter meant (`cf10608`)
- M1: quantities and expressions — every line of both sample pages, plural where it reads two ways (`2bd9426`)
- M1: a full stop after a result is punctuation, not an unreadable line (`6bc8ba1`)
- M1–M2 docs: the status in MATHS-PLAN §4 and V1-PLAN phase 4; maths on a page in CLAUDE.md (`e41bdba`)

### M2

- M2 red: the sheet — change the bust and only its steps move (`07b6efc`)
- M2: the sheet — lines become definitions, steps and checks; change the bust and only its steps move (`f3fe88e`)

### M3a

- M3a red: dimensions — a number beside a mark, offered as one of its measures (`084f8de`)
- M3a: dimensions — each number offered as a measure of the mark it sits beside (`b41a302`)
- M3a red: a number read two ways counts once for the scale (`e2d4fc4`)
- M3a: a number read two ways counts once for the scale (`3b66234`)
- M3a–M4 docs: the status in MATHS-PLAN §4 and V1-PLAN phase 4; dimensions and solving in CLAUDE.md (`3f96ef3`)

### M4

- M4 red: solving — figure by figure, in closed form, with the conflicts said (`a165ba1`)
- M4: solving — figure by figure, in closed form; measure.ts speaks units (`b350704`)
- M4 red: SSA keeps both of its triangles (`4b8181d`)
- M4: SSA keeps both of its triangles, and says the angle that tells them apart (`496f677`)
- M4 red: how it is said — a range in brackets, an area, a side against its own label (`7f2c812`)
- M4: how it is said — ranges bracketed in formulas, an area, each side against its own label (`374860a`)
- M4 red: the page beside the drawing — its unit, and a step's value on an edge (`9d572dc`)
- M4: the board's maths carries its page, and checks a step's value on an edge (`2050132`)

### M5

- M5 red: maths on the board — chips beside the figure and the page, the maths tool, = in the field, true size out (`04acc73`)
- M5: the maths on the board in core — chips, the panel's words, = as a sum, the maths tool (`4a1418b`)
- M5: HERE names the maths tool — the golden changes by design (`b83d6ec`)
- M5: a chip stands clear of its side, beside its number; the browser and Node bundles carry the maths (`2a991b3`)
- M5: the maths on the surface — chips beside the figure and the page, the panel, = in the field, the export row (`9eb4450`)
- M5: the maths reads only the ink beside a number — two seconds a stroke, on a crowded board, become four milliseconds (`b8e83d2`)
- M5: docs — the maths on the board in CLAUDE.md, HELP.md for a person, QA-v1's A4 rows by hand, V1-PLAN's status line (`5017718`)

### M6

- M6 red: the garment pattern piece — the notation's reading and bench, and garment@1 in the packs (`2c402a7`)
- M6: the garment notation reads a pattern piece, and garment@1 names it (`55b1433`)
- M6 red: the garment maths — cut against sewn, a fold's half, and what true size prints (`3fb236b`)
- M6: the garment maths — cut against sewn, a fold's half, the marks' numbers, and true size prints them (`3170ea4`)
- M6 red: a notch is no line that divides an edge — a number beside the middle of a side is the side's (`17569ae`)
- M6: a pattern piece's notches, darts and fold are not figures the solver divides an edge by (`c971c83`)
- M6: the garment reading measures boxes before outlines — a board with no outline of a piece's size pays nothing (`c0f3cc5`)
- M6: the garment reading looks only at what stands by an outline of a piece's size (`3bf33bf`)
- M6: docs — CLAUDE.md's garment pattern piece, V1-PLAN's status line, MATHS-PLAN's, QA-v1's rows for John's hand (`7a668df`)

### M7

- M7 red: true size and print — the triangle at its real size, the piece tiled onto pages (`cb00056`)
- M7: true size — a solved figure drawn at its real size, by its numbers (`b805358`)
- M7: print at full size — the true-size drawing tiled onto pages at 100% (`f4a9bcf`)
- M7 docs: true size and print in MATHS-PLAN §4, V1-PLAN phase 4 and CLAUDE.md (`d511465`)

### M15

- e2e models M15 names with `name:` — a lone word waits now; the gate's counts after the field push (`bbae4cb`)

### N1

- N1 red: e2e 67 — the six notations read on the surface; notationWords and a reading that is not a name, in Node (`b023fab`)
- N1: baseOn knows a notation — the whole drawing's reading stands with the firmest concept it is made of, under what a model read (`8c7084d`)
- N1: every notation reads on the surface — the field's what-this-is row and the panel's is / becomes (`eaa9abe`)
- N1: docs — CLAUDE.md's field and panel, HELP.md's field, V1-PLAN's status line; e2e 67k pans with the pointer (`3830ac8`)

### N19d

- e2e boards N19d: compare boards with boards — the list before held recent places too (`291da13`)
- e2e boards N19d: the same boards before and after, in any order — the list is by recency and the board just switched to is stamped a moment later (`5b757bd`)

### P0

- magnets (P0): the places a mark offers attachment (`a4096d7`)
- Shard 3D: a bounded MetaMedium for making things in space — P0–P6 and the compass (`db068d9`)

### P1

- magnets (P1): the pen feels where a mark offers attachment (`1dd5e08`)
- P1 red: a paint of a board of traced pictures hands the canvas a few paths, not one a stroke (`4b52572`)
- P1: the ink of a big still group is drawn once and blitted while the view pans (`94d1919`)
- P1: docs — the ink's raster, its numbers and what is open (`11d7cd0`)

### R1

- R1 red first: several named boards, and the kill test across switches, failing (`6ff6779`)
- R1: the boards list — pure, and tested in Node (`f02b19e`)
- R1: boards — the adapter, the pane, the tile; each board its own journal (`c059993`)
- R1: a lock let go while a board opens is taken up once it is open, and renames reach entries held (`0c9ccf8`)
- R1: a board that is not saved is never left without a word — and a failed whole write loses nothing (`a8f638d`)
- R1: status in V1-PLAN §9, and the docs — boards, where they live, the trash, the tile (`8b2a4b1`)
- R1: a board left where it opened comes back there, not fitted again (`0ab77b7`)
- R1: the plan's status line and the README count N12b (`b3276d3`)
- R1: the status line names the whole range of its commits (`b6f6143`)

### R2

- R2 red: the log format — header, version 0 and 1 readers, refusal, every kept log, the week-old reader (`f9fe06e`)
- R2: the log format in core — a header line, versions 0 and 1 read, a newer version refused (`28b6c60`)
- R2: every reader and writer of a log takes the format — surface, examples, shard, e2e N19–N19f (`a176898`)
- R2: docs — CLAUDE.md's log format, V1-PLAN's status line, the export button's title; the old-reader board test reads bare events whatever the file's version (`d857e37`)
- R2: the shard's export tests count the header, read version 0, and refuse a newer version (`8ac7931`)
- CLAUDE.md: the gate's counts after R2 and M6 (`bef800f`)

### R3

- R3 red first: the kill test and the forced failures, failing (`13bd6f1`)
- R3: the board's journal — pure, and tested in Node (`74f5ea7`)
- R3: the journal's line helpers renamed, and the surface built with it (`da9fd12`)
- R3: the board this browser keeps, in IndexedDB — a record a change, never silent (`d714edf`)
- R3: the import, two tabs, pages that are not the board, and a 2,000-mark board (`d9bac05`)
- R3: flush on the way out, tested; a page that stops keeping the board lets it go (`5695f79`)
- R3: status in V1-PLAN §9, the docs, and a damaged board said only where it is rewritten (`e5b0c27`)

### R4a

- R4a: synthetic boards of 500, 2,000 and 5,000 marks, from a seed (`c456ac1`)
- R4a: read a CPU profile back to src/file:line (`1323df9`)
- R4a: the engine's measurements — replay, memory, relations, one more stroke, a room, a hello (`ab90a08`)
- R4a: the surface's measurements, and the tables printed from the results (`3ee0231`)
- R4a: PERF.md, a draft with the 500 and 2,000 numbers in and the 5,000 still running (`81dae2b`)
- R4a: the repository map lists the performance baseline (`4ab1928`)
- R4a: relations over the whole content plane, measured at 5,000 with no replay (`d5b5a75`)
- R4a: the whole-board read at 5,000, with no replay (`06b3ea8`)
- R4a: PERF.md whole — the answer, every number, the hotspots, budgets for R4b (`c9ed68e`)
- R4a: the 5,000 column's one more stroke, from the build's last stretch (`9b85895`)

### R4b

- R4b red: the engine's budgets as tests, and the equivalence harness (`d16fdab`)
- R4b: the engine holds 2,000 marks — relations within reach, groups kept, checkpoints shared (`08a1aef`)
- PERF.md: the engine after R4b, beside the baseline (`1fbd868`)
- Docs for R4b: what is stored and what a scope computes, the status line (`82e527c`)

### R4c

- Core exports the grid and the reach test, for the surface (R4c) (`bd843b7`)
- R4c red: the surface's budgets as measurements, and the equivalence check (`a24677f`)
- R4c: the surface draws only what changed (`79971d0`)
- R4c: the role table checked whole, and a move that changes a role (`f11ecec`)
- R4c: a held mark's group through the index; the index made from the log's own state (`7e1a4b5`)
- R4c: the pen and the wheel pinned; how much less is stroked, said (`c6d0dc1`)
- R4c: the magnet sites read ahead while the page is idle (`30c879d`)
- R4c: a role read over an unchanged neighbourhood is carried forward (`317f514`)
- Docs for R4c: PERF.md's "after R4c" column, the status line, the surface in CLAUDE.md (`e986cbf`)

### R4d

- R4d red: a room's line as budgets, and the oracle for every order of arrival (`f3d3357`)
- R4d: a room merges a line, not the board — core (`0b8bee2`)
- R4d: the canvas merges a line into the board, and a line that changes no log does no work (`6e99380`)
- R4d: the MCP hand merges a line as a tab does (`46f67fd`)
- R4d: a line that crosses a mark just drawn goes back a few events, not a whole index (`a1158bc`)
- R4d docs: PERF.md's "after R4d" columns, the status in V1-PLAN §9, Live logs in CLAUDE.md (`d5bf61f`)

### R4e

- Phase 0b done: the gate's counts, and R4e met by R4b (`a6a66e8`)

### R5

- R5 red: examples in the boards list and a start for the first run — tests alone (`f46d555`)
- R5: the example boards, made from the engine and checked for drift (`a4b4e9b`)
- R5: Examples in the boards pane, and the empty panel's one tap to start from one (`d39068d`)
- R5: HELP says the examples, the first run's start and the packs; CLAUDE.md says how they are made (`7fc4857`)
- R5: V1-PLAN §9 says what was built, why the first run stays an empty board, and what was found (`5bd43a8`)

### R6

- R6 red: pen, finger and palm as a scenario of the gate, failing (`a11a5ed`)
- R6: the pen draws, a finger pans, a palm is nothing, a pencil hovers (`3ce9876`)
- R6: the keyboard, the tile, the mouse and a reload, as records (`767842e`)
- R6: WebKit runs pencil and keep in CI, not only the smoke (`4c99036`)
- R6: a hand the page never heard lift is forgotten when the page hides (`e31fba3`)
- R6: a cancelled hold ends; a finger scrolls the held pills (`47816cf`)
- Docs for R6: pen, finger and palm in CLAUDE.md, the status line in V1-PLAN §9 (`c407f04`)

### R7

- R7 red: one app address and a release, as tests that fail (`0cc9805`)
- R7: one app address — /app/ made from the old one, one worker for both, the version stamped (`d29a822`)
- R7: the release script — a changelog by unit, the standalone file, a commit and an annotated tag, never a push (`2faea0b`)
- R7: CI checks the app is the build of VERSION and Demos/, and runs the release tests (`5190500`)
- R7 docs: the app's address, the version and how to release — CLAUDE.md, the gate's README, V1-PLAN §9 (`ba23451`)
- R7: the published-addresses check reads every site address the three pages give (`c7af673`)

### S1

- S1 red: a turned box cleans to itself, an L is no arrow, a wide arc is an arc (`6a9397c`)
- S1: an L is two arms, not a barb; a wide arc bows evenly and reads as an arc (`bb958eb`)
- S1: a turned box is drawn clean at its own angle; a bend is not a line (`f6f0bfd`)
- S1: a barb is short against its shaft, or a flick in the hand's space (`6991016`)
- S1: say why, plainly — the barb's length not its angle; a capped barb says so (`3881d0f`)
- S1 docs: the status in V1-PLAN §9, the rung's bow and barb and the clean box's angle in CLAUDE.md (`ff89196`)

### S2

- S2 red (1/5): the rung's arrow tip is a wing's length short of the ink (`1926890`)
- S2 (1/5): the rung's arrow tip is the ink the pen reached farthest along the shaft (`e661cdf`)
- S2: the magnets golden, by design — the arrow's tip site is where the ink points (`6fd5d55`)
- S2 red (2/5): a long arrow's small head is lost while line leads (`555be74`)
- S2 (2/5): a head that draws back on a long shaft reads as an arrow at any length (`05c2a2f`)
- S2 red (3/5): strokeFor's arrow barb stops at 40 units (`57567a2`)
- S2 (3/5): strokeFor sizes an arrow's barb from its shaft (`12cf569`)
- S2 red (4/5): a head's fill is given to the box beside it (`fb27088`)
- S2 (4/5): a closed mark that reads as no head takes no fill (`b77d1f3`)
- S2 red (5/5): a flat diamond offers its bounds' corners, not its vertices (`f194b77`)
- S2 (5/5): a flat diamond offers its own four corners, not its bounds' (`fad9847`)
- S2: flowchart.test.ts, by design — a flat decision's vertex is its own corner first (`8127ee9`)
- S2: the corners' reading of a head stands wherever it sees the head (`b7cb1b9`)
- S2: the two engine bundles, rebuilt (`cf4582f`)
- S2: CLAUDE.md, the code skill and V1-PLAN say what was built (`e156696`)
- CLAUDE.md: the gate's counts after S2, M5, D2–D7, N1, R5 and H1 (`5040b2e`)

### S4

- Tiers redressed: tier 0 the shape rung, tier 1 the engine's instant library (a registry of fourteen modules), tier 2 every model with locality as a cost; a brief stands as its structure at once and the words follow; code legible at every zoom (S4); the e2e stub named and guarded (`337b680`)

### S6

- Live logs (v9 S6, first cut): a room over a BroadcastChannel between tabs or a relay between machines; another hand's log merged as it lands, its ink in its own colour (`0fa65bc`)

### SEAM-1

- The field's reader decides from a record, and is tested with no browser (SEAM-1) (`77b9815`)

### T1

- The canvas reaches out (v10 T1–T6): an MCP hand, a playing frame takes the pointer, writing by nearness, hold by long-press, the map of becoming, the graph in 3D (`bb127f8`)

### U1a

- U1a (T8): a node id is a function of the event, not of its place in the merge (`6c3314d`)
- U1a: the seam in the README, and the one event that mints a whole family (`45f838e`)
- U1a red: the panel is an inspector — ids, tiers and coordinates by default (`fc9385e`)
- U1a: the panel speaks to the person; the inspector waits behind details (`d4bb8d6`)

### U1b

- U1b (T8): the surfaces say what their logs are called (`51e7f1c`)
- U1b (T8): the test that proves it — two hands, one room, both merge orders (`9d11d9b`)
- U1b red: the status line speaks the engine's words (`4572137`)
- U1b: the status line in the person's words (`d19b95b`)

### U1c

- U1c: a `full` is only applied when it is the present, and a collision says so (`2d081e8`)
- U1c: what is held is a SUFFIX — the collision test is containment, not index (`46e362c`)
- U1c: the relay brings a client up to the present, and says when it cannot (`eae9fcc`)
- U1c: the built bundles and the surface script, rebuilt from the fragments (`e4cd35e`)
- U1c red: the field opens far from the hand, over the minimap, its pills cut off (`5dac7ac`)
- U1c: the field opens by the hand, off the minimap, and stays whole (`38302b2`)
- U1c red, again: at the right edge the field slides back over the press (`d124e1e`)
- U1c: the field never opens over the press (`f34c629`)
- U1c/U1a red, again: the field opens over held writing; the panel says it becomes a name (`8fd2605`)
- U1c/U1a: the field stands beside what it holds; the panel says writing is read (`8d17518`)

### U1d

- U1d red: Read as writing on every shape; Show it in 3D on a graph of boxes (`50b7994`)
- U1d: offers relevant or absent (`6a15fd3`)
- U1d: the goldens that listed Read as writing on shapes, recorded again by design (`0a7aaf3`)
- U1d docs: offers relevant or absent, in CLAUDE.md and V1-PLAN §9 (`603e956`)
- U1d red, again: the panel's becomes still names Show it in 3D (`c982efe`)
- U1d: the panel's becomes names Show it in 3D only when the field offers it (`1932b39`)

### U1e

- U1e red: Enter takes a reading as a name (`17e701c`)
- U1e: Enter does the likely act (`7bc32e8`)
- U1e: e2e 49's reading lines, recorded again by design (`e7f15b4`)
- U1e docs: Enter does the likely act, in CLAUDE.md and V1-PLAN §9; the golden's comment says so (`337738f`)

### U1f

- U1f red: the control centre is sixteen tiles of equal weight (`b09120d`)
- U1f: the control centre in three labelled groups (`033dd33`)

### U1g

- U1g red: help is a developer's test plan; your mark never says what it does (`8fb5d1d`)
- U1g: help teaches the loop; your mark says what it is (`7e1937a`)

### U2

- U2: a hand may label its own ink — a word on the mark, not a bless and not a file (`3acc7b3`)
- U2: the audit walked again — fourteen rows resolved, two left to John (`debc160`)

### U4

- U4: the decision seat — typed questions in, a typed value out, behind a transport (`911dfe4`)
- U4: what the space asks a decision seat, measured on fixture 1 (`c6e7500`)

### U5

- U5: a WebKit smoke in the browser gate (`7f6e379`)

### UI-2

- The panel says what the thing is before it says what it measures (UI-2) (`a59ff85`)

### W0

- W0: lane output (`e3e21fa`)

### W1

- W1 red: drawing a diagram destroys or swallows what it connects — 24 core tests against today's engine (`38c09f0`)
- W1 red, the sequence lane's two cases: an open target, and a head drawn apart (`205c8fb`)
- W1 core, rule 1: a head is not a scratch — crossings where a stroke meets a mark rub nothing out (`d163d44`)
- W1 core, rules 2 and 3: a connector is not a letter, halves are not letters, and a head drawn apart is its connector's (`612043a`)
- W1: the cheap checks first — a stroke joins a run before its figure or head is asked (`3de4936`)
- Docs for the tie-off: W1 and S2 in V1-PLAN §9, phase 2 done, CLAUDE.md headed with 28 Sep (`936686f`)

### W2

- W2 red: Enter on writing names it "writing"; three options where one reads (`3124cb7`)
- W2: writing reads when it is writing (`f29da44`)
- W2: e2e 49's golden for a line of writing, recorded again by design (`17235d8`)
- W2 docs: writing reads when it is writing, in CLAUDE.md and V1-PLAN §9 (`956cd18`)

### W3

- W3 red: a tap off the field leaves a dot (`faab5ef`)
- W3: a tap never leaves a dot (`3a7c8f6`)

### WP-0

- WP-0: the surface split into fragments — the threshold for parallel work (`e0c4106`)

### WP-1

- WP-1: checkpoints, the log merge — and a cubic cost found and removed (`64afd24`)

### WP-2

- WP-2: selection and direct manipulation in the engine (`9ea7e2e`)

### WP-4

- WP-4: the verb basis — forces, walls, and the fit that turns a path into a behaviour (`e34fc3b`)

### WP-5

- WP-5: a definition's clock moves its instances — the tank, fixed-step, seeded, re-derived from the log (`1a43c79`)

### WP-6

- WP-6: words into verbs, and acting it out (`78c77e0`)

### WP-7

- WP-7: kinds as a closed table, and what ink lands on per kind (`9f8ed59`)

### WP-8

- WP-8: every kind renders as a document ink can address, and blessed js runs in a worker with a budget (`628c5bb`)

### WP-10

- WP-10: frames — artifacts wired by reference, and the drawn slider (`c2adbac`)

### WP-11

- WP-11, engine half: the storage seam — a folder of known kinds, per-participant logs, three backends (`da3cc76`)
- WP-11: the folder as the canvas — discovery, per-participant logs, autosave, the live budget, three views (`73f9370`)

### WP-12

- WP-12: structural signatures — the shapes and the links between them, matched plurally, corrected by example (`038cae1`)

### WP-13

- WP-13: text as an element — typed on the canvas, wired into a page, revised in place (`9d5e449`)

### WP-14

- WP-14: deploy — installable, offline shell, and a repository as the folder (`987f02c`)

### Other

- Day 1 MVP: Primitive recognition with 4-component weighted scoring (`500f80a`)
- Initializing (`4ff9285`)
- Initializing Main Assets (`88abaf0`)
- Adding Demo (`a804065`)
- Update MetaMedium_Whitepaper_v4.html (`7aefec6`)
- Update MetaMedium_Whitepaper_v4.html (`13a3f59`)
- Adding images (`4579a66`)
- Adding Interactive Conclusion Demo (`0d3cbee`)
- Create README.md (`fc95e56`)
- Added scenarios links and figure 1 (`412c32d`)
- Adding assets (`0a95460`)
- Adding figures (draft1) (`291bec0`)
- Updating figure legibility (`b0e84e5`)
- Updating styles (`ec6f014`)
- Adding triadic loop figure (`6dbf3f6`)
- Styling updates (`5592dd5`)
- Updating problem section structure and diagram asset tweak (`861d13d`)
- Tweaking figure triadic closure visual (`7a0b262`)
- Updating diagram elements style for legibility (`cd608fb`)
- Updating semiotic triad diagram legibility (`20203b0`)
- updating order of the future section (`d33ecf5`)
- styling communication diagram (`db7710d`)
- Improving communication bottleneck diagram (`3cd6c47`)
- Updating order of development section (`c4e6acc`)
- Updating social share assets and fixing mobile menu spacing (`9ec74e3`)
- Update README.md (`69629ce`)
- Adding expanded timeline to lineage section (`194419c`)
- Timeline alignment tweaks & initializing improved demo (`382ab2a`)
- Improving new demo styling, using as iframe embed in whitepaper (`98f44fc`)
- updating demo styling (`46f2d92`)
- Updating canvas demo styling (`476d31d`)
- Update README.md (`3466f64`)
- Update README.md (`2273443`)
- Update README.md (`75b3038`)
- Update README.md (`f7e3b27`)
- Updating whitepaper links to improved canvas demo (`4353517`)
- fixing mobile nav bar styling (`1adbb3f`)
- Clarifying timeline layout (`f22973c`)
- updating timeline spacing final lol (`821b85e`)
- Udpating dead drawing graphic (`27ea71d`)
- Update fig-digidraw.svg (`25ce500`)
- Update doodle2-canvas.html (`b25f966`)
- Update doodle2-canvas.html (`794cfac`)
- Update doodle2-canvas.html (`994ba46`)
- Update doodle2-canvas.html (`c200262`)
- Update MetaMedium_Whitepaper_v4.html (`670cee4`)
- Update MetaMedium_Whitepaper_v4.html (`996aefc`)
- Update MetaMedium_Whitepaper_v4.html (`0e90187`)
- Update MetaMedium_Whitepaper_v4.html (`ce2739f`)
- Update doodle2-canvas.html (`2d62878`)
- Update MetaMedium_Whitepaper_v4.html (`61deb32`)
- Update doodle2-canvas.html (`1f62fd2`)
- Update MetaMedium_Whitepaper_v4.html (`c37b123`)
- Update doodle2-canvas.html (`d721186`)
- Update doodle2-canvas.html (`0184521`)
- Update doodle2-canvas.html (`59ce816`)
- Update MetaMedium_Whitepaper_v4.html (`1f6ac14`)
- Adding Demo Folder & First Demo (`0bc442b`)
- Social Network Analysis Mapping Demo (`594732d`)
- Update sna-drawing-demo.html (`449832e`)
- Update doodle2-canvas.html (`02349a3`)
- Adding experimental demos (`32abda3`)
- Update MetaMedium_Whitepaper_v4.html (`db89803`)
- Update MetaMedium_Whitepaper_v4.html (`7aca895`)
- Update MetaMedium_Whitepaper_v4.html (`af2d90c`)
- Update README.md (`baa9d29`)
- Update README.md (`32cc938`)
- Update README.md (`9b90cd8`)
- Create CNAME (`6babbd8`)
- Delete CNAME (`3d87316`)
- Update MetaMedium_Whitepaper_v4.html (`a7501d0`)
- Update MetaMedium_Whitepaper_v4.html (`d4ae5f6`)
- Create CNAME (`b56fe18`)
- Delete CNAME (`2822ddb`)
- Update MetaMedium_Whitepaper_v4.html (`ed0553c`)
- Update MetaMedium_Whitepaper_v4.html (`dfb28c4`)
- Organizing repo (`ab12835`)
- Create index.html (`0280554`)
- v5: Restructure index page for front-loaded engagement (`4510452`)
- Breakout layout, figure legibility, and spacing tightening (`6db88b8`)
- Towards a proper demo (`e666eba`)
- Updating thumbnail and archiving older link (`72de3b2`)
- Create metadoodle1.html (`9259918`)
- Create test-llm.html (`7c06545`)
- Adding skills (`ea918ff`)
- Add v5 unified engine architecture document (`bfc6162`)
- Add unified doodle interface with voice + in-browser AI (`da701f1`)
- v2-poc: drawing-responsive text reflow using pretext (`6fbcf0d`)
- Setup autonomous dev: pretext integration, real system data, implementation plan, dev loop (`4fe1fa6`)
- Phase 1: Card layout redesign + pretext everywhere (`140a61b`)
- Update DEV_LOG.md with Phase 1 completion (`9aa8126`)
- Phase 2: Front/Back Node Flip (`128639f`)
- Update DEV_LOG.md with Phase 2 completion (`f260d4d`)
- Phase 4: Lens Switcher HUD + critical MoE/UX fixes (`3a5b542`)
- Phase 3: Resize handles + auto-height + UX fixes (`4cf853e`)
- Update DEV_LOG.md with Phase 3 completion (`8966813`)
- Add 2026 roadmap; refresh CLAUDE.md to current repo state (`09e7811`)
- Cleanup pass: repo hygiene, lint baseline, test suite, CI (`c7fa827`)
- v6: crystallize the no-modes design; build metamedium-core with the session engine (`6fab428`)
- core v0.2: undo, erase + degradation, wire inference, browser bundle, reference surface (`750fd08`)
- core v0.3a: one class of citizen — participants, attribution, and the propose channel (`25d9232`)
- Demo: usable reference surface with a 'why' inspector; carry reasoning on claims (`17f0d00`)
- Update DEV_LOG.md with Phase 3 details (`a66df4b`)
- Commit v2-poc source (main.ts) that gitignore had been hiding (`3e9e58c`)
- Track manim-explainer source; ignore renders and manim cache (`ec28490`)
- Docs: one definition one home; fold experiments in as a subordinate tier (`834772e`)
- v7: plan the model into the loop; account for what's actually built (`f0cd6db`)
- v7 Stage A: a model joins the canvas, and every reading is held (`3c0bb9f`)
- v7 Stage C: ask on the canvas, and the answer lands in it (`9b68c62`)
- MVP core: command mark, scratch erase, regions, living code (`61077cd`)
- MVP: ink over living artifacts — the loop runs end to end (`ed1822a`)
- Fit canvas cards to the chrome-safe area, not the raw viewport (`61f32c1`)
- Recognition refresh: measure along the path, rank by evidence (`6e18275`)
- Define the command gesture, and stop it firing on anything bent (`bd360ee`)
- The rail follows the grammar, not the button (`1208ff9`)
- Parse the drawing as a layout, and let the model write only the words (`455fbbb`)
- Document the parse, and what real models taught (`9ea7ccc`)
- The canvas on its own: relations, concepts, and a command palette (`e7a718d`)
- Route explicitly, and let a participant be answered by hand (`db8db30`)
- Sprint plan: three keyframes with closed vocabularies (`0428ef4`)
- The three keyframes: shape, diagram-shape, code (`989068e`)
- Document the three rungs (`3272ee3`)
- The miss names the mark the way a person would (`c1e2be7`)
- Browser e2e: a flowchart compiles as a diagram, in the same run as the page (`43d953d`)
- Coherence pass: ink where the pointer is, a wheel that zooms, a rail that is a rail (`468d130`)
- The model pane, and a mark that is held (`2617325`)
- A mixed drawing compiled through the graph target is a running diagram (`6dee7e6`)
- A confident reading, redrawn — and the drawing as the brief (`8b1a182`)
- A thin box keeps its corners: both corner windows bounded by the short side (`3e8a4d9`)
- Handwriting read, and a model that holds a pen — v7 Stages E and F (`a2f488b`)
- The whitepaper catches up, the maths comes back, and a plan for v5.1 (`377f701`)
- Whitepaper: the non-interactive pass (`c83e396`)
- session.load: a recording replays as itself (`5afed22`)
- parseFill salvages whole regions from a reply cut off mid-object (`5fafe65`)
- GenerateResult.changed: which regions a revision actually wrote (`2202b70`)
- Whitepaper: no coloured bars, fewer words, a clearer order (`d1523e6`)
- A tilted box is still a box; a long-tailed check is still a check; a held loop can be summoned (`ad6bf3e`)
- Whitepaper hero on the engine (local, for testing) (`869e9d0`)
- Replays as figures (local, for testing) (`23f5c70`)
- The MVP loop, recorded against a real model (local, for testing) (`e13fdab`)
- The demo from the user's side: circle things, draw them clean, find the offer (local, for testing) (`fa7874f`)
- The panel under the title, scrolling that pans, and a phone that works (local, for testing) (`93b8cb1`)
- Words from letters (local, for testing) (`43813aa`)
- The model builds the library (local, for testing) (`c864373`)
- A mark is labelled by its shape; the palette keeps clear of the panel (local) (`288e627`)
- Architecture v8, proposed: the canvas as code (`b895faf`)
- Architecture v8, Part II: the folder, the views, frames, selection, the palette (`edecc24`)
- Architecture v8 §21: the four decisions, taken (`57a72e7`)
- BUILD-PLAN-v8: the executable plan, with briefs for sub-contractors (`fa6fad2`)
- WP-3a: the selection on the surface — the loop that finished (`0b7d05f`)
- The snap ghost follows a moved mark (local) (`3e9bf64`)
- WP-3b: the blob palette — verbs packed in rings from the pen tip (`66d7852`)
- The blob on a phone: the origin keeps the rings that are shown on screen (`ef2b6e9`)
- fit: coordinate descent on the Gram matrix, and a relaxed refit (`db4c34d`)
- A word starts from a stroke the rung could not place; the pad and the rail chip follow the held mark (`eacc800`)
- WP-9a: image tracing — a bitmap of a sketch becomes strokes the rungs can read (`54fd500`)
- Brief Q: a hand-sized QA pass, report only (`f538446`)
- A loop that waits is plain ink: the command mark is what turns it into a selection (`8876e3e`)
- WP-9b: pictures in, the board out (`6fec5d9`)
- The v8 accounting: every package landed, the gaps said plainly (`27bd205`)
- The whitepaper on the system: warm paper, one face, colour as signal — and the prose without the tics (`75fc5f4`)
- Embedded replays stay in their frame: fit to the free area, the wheel belongs to the page, plain arrows (`d95c03e`)
- A release anywhere ends a stroke; the mark leaves with the loop; erase, duplicate and copy (`6609991`)
- Typed text at a loop is a brief; a model at work is shown where it works; the hand QA plan (`3ad7a05`)
- The surface control is one icon in the header (`73d0a25`)
- Surface v9 plan; secrets never enter git; the chrome stops explaining itself (`5c07b8f`)
- The moment: a brief becomes a program that renders in the drawing's frame, and the library answers first (`3aa6cf7`)
- The run harness starts without waiting on three.js; a 2D program draws at once, a 3D one waits at most four seconds (`fc656f0`)
- The surface as a system: a model is asked only by a deliberate act; one field reads what is typed and says what Enter will do; core verbs in slots that never move; one bar with a control centre; light and dark from one token set (`3fbc7b6`)
- The field as John sketched it: round buttons at the left, the pills stacked to their right; a double-tap inside a waiting loop takes it up; a scratch one pass short says so (`6ef64a8`)
- Hardening and quality of life: a tap on a match chip summons the group; export and help as panes; a frame whose document changes gets a new iframe; playing frames are never parked; late errors in a program are reported; no keyboard pops on touch (`a963a50`)
- The help pane joins a paragraph's wrapped lines (`1744cd1`)
- A hand in a room is one tab: the person's name with a suffix the tab keeps, shown without it (`3ae09f5`)
- The alignment figure keeps its border and clears its quote; pull quotes are inset from their hairlines; the blending gif reads at half width; a tick list's coda rows under its own columns (`a1a65ec`)
- A social card that shows the engine reading a mark (`2852ccd`)
- The checkpoint tests get a clock that fits the work they do (`403b2ec`)
- The social card has a generator (`4443127`)
- The lede first: the loop runs at the top of the paper; the 2025 fish canvas and its ~490 lines retire; the conclusion says it once; README names the reference surface the demo — with the refresh and sprint plans (`9fcf741`)
- On touch the inline demos are watch-only viewers: the paper's scroll comes first, and Open it → opens the surface (`8695946`)
- The footer is two lines — first published v1, last updated, and who built it; the lede section is Running the Loop (`97139d8`)
- A hand in a room is shown by the person's name: the engine drops the tab's suffix when it makes the participant, so cards and readings say claude, not claude~mcp (`b77d727`)
- The metadoodle preview attaches to the static server already running on 8010; metadoodle-start starts one when nothing is (`8bdaa78`)
- The hero reads relations the way the surface does: a mark is kept by what relates to it, near is told from overlaps, a line is a wire, and a row, a frame or a flow is said once above the marks (`5ba2143`)
- A dot is a mark the hero can contain, and everything on it holds twice as long (`ec1cd57`)
- A scribble the hero cannot place is a drawing, and the page's two emoji are drawn (`b28a016`)
- The explanation plane has a layout: cards off each other, off the ink they speak for (`fdf799c`)
- An order of what a card may give up, found by drawing the rules on the board (`d3348a1`)
- A figure is not a page, and a card says what it is about (`cbd20ea`)
- A hand in a room is one process, and a figure is quiet until you point at it (`b8475cc`)
- Notes from drawing a figure with the hand: what worked, what cost a round, what is still open (`2a6eebe`)
- Two lines drawn near each other offer the way down, and the embeds let go of a touch they did not need (`de0dcd2`)
- A view-only embed keeps its play: the paper's button presses the embed's own (`6e53901`)
- Two lines are a swipe only when they were drawn like one (`f97c4ef`)
- the field chains: a button click never closes it (`27f4704`)
- the door: the canvas as an MCP client — bidirectional MCP (`32deec3`)
- The code-patterns skill re-verified against the engine as shipped (`2007fe3`)
- Director review, 15 September 2026 (`a87124a`)
- A late result never resurrects a deleted target (`b9f94bb`)
- The two browser scenarios run without a human console, and a red one is red (`3248047`)
- The field and the fit respect the space actually visible (`73214a8`)
- An endpoint is what a binding is, not its target (`09bc93b`)
- fieldBox reads the hand it was given (`15c87b7`)
- The stroke shows while it is drawn (`084e151`)
- CLAUDE.md: the headline for control-points, magnets and bindings, the gate (`6545c6b`)
- Ink drawn off the main axes keeps the shape it was drawn (`2142f55`)
- The rotation respects the translation of the view (`01b94c2`)
- The controls copy, in the fewest words (`30c7186`)
- A reading is not settled by the last bit of a float (`c8cb2d7`)
- Off-axis ink lands where Blender puts it (`ff0e562`)
- The description card is down until you ask for it (`a007840`)
- A swipe turns the view, and two fingers are not a map (`74718ed`)
- The axis view is the choice, and the tiles step aside (`7131c61`)
- Nothing is chosen at boot: free ink lies on the camera plane (`0f08d51`)
- Shard 3D, push 2: geometry from the drawing (`79bd20a`)
- Push 2 folds in the volume and the seat (`177de87`)
- A fixture: John's second board, captured from the live tab (`7eabc41`)
- The shard reaches out: a hand in the room, and Claude Code in the seat (`dfc6af6`)
- Push 2: the tower seen once is John's decision (`49459c3`)
- Director's view, 17 September 2026: where it all stands on master, the 15 Sep review reviewed, Jev as a decision seat behind a transport, and the next steps with ids per hand first (`6c0b4a7`)
- Redraw alignment diagram at house scale (1000u, --u:1) (`82f808a`)
- Diagram audit: house-scale all figures, text halos, heavier type, rebuilt arrowheads (`d1a65e8`)
- Visible-state diagram revision: comparison grid on desktop, focus mode on phone (`a449540`)
- recording: how johnhanacek.com's search and canvas systems work (`e41878b`)
- A program for the canvas: MetaMedium, explained (`018a2de`)
- Plans: maths on the canvas, and week 2 (make week 1 whole first) (`12bbb3b`)
- Untrack a committed node_modules link, and ignore one however it is made (`a9774c8`)
- The engine bundles, rebuilt: week 1's labels and decision seat were never in them (`88223e7`)
- CLAUDE.md: week 1 is on master now, with its gaps named (`c6a9c9b`)
- V1-PLAN.md: the whole platform, ready for true use (`4de2e4c`)
- gliner-seat: fetch the one-graph ONNX export, pinned and sha256-checked (`3e25aaf`)
- gliner-seat: GLiNER2's processor in JavaScript, identical to the library's (`ace74a4`)
- gliner-seat: fixtures, hand-labelled — the sample pattern lines, four briefs, the castle's brief (`1a3cb2b`)
- gliner-seat: the seat's transport, a fake, the scorer, and tests that need no model (`2f551bc`)
- gliner-seat: Node measured — CPU, CPU on four threads, and WebGPU over Metal (`2dd6531`)
- gliner-seat: the browser measured — WebGPU and wasm in a Chromium page (`e13bcad`)
- gliner-seat: the same fixtures asked in other words (`aa4bf10`)
- gliner-seat: GLiNER2.5-small through the Python package — faster, and worse on our words (`5b18322`)
- gliner-seat: WebKit runs it on WebGPU; a page in front changes nothing for wasm (`f9ef05e`)
- gliner-seat: the README's tables, generated from results/ (`106666b`)
- gliner-seat: the answer — not yet, and why (`972c917`)
- EXPERIMENTS.md, CLAUDE.md: the extraction seat spike, parked with its answer (`94668a9`)
- Seat regression: space_pending loses the human's words on a parts brief (red) (`f78522e`)
- Seat: space_pending reads the human's words after either ask (`c26f850`)
- CLAUDE.md: `label:` in the field, the reader's `marks` and `typedWord`, and the person's door (`626ee58`)
- The engine bundles, rebuilt with the maths core (quantities, expressions, the sheet) (`ff330a9`)
- The engine bundles, rebuilt with dimensions and solving (`a4bccfa`)
- V1 plan: phase 0b, a board that holds — pulled forward by the performance baseline (`5862a83`)
- The engine bundles, rebuilt with true size and tiled print (`7ce26d7`)
- The engine bundles, rebuilt with ports, heads and figures (`9977158`)
- Equivalence harness: a scripted log of the acts the boards never make (`8f45ac2`)
- CLAUDE.md: the gate's five scenarios and their counts after the merges (`d288093`)
- CLAUDE.md: the gate's seven scenarios and their counts (`d76389c`)
- CLAUDE.md: the gate's seven scenarios and their counts, app among them (`1c298aa`)
- Pages builds again: no Jekyll, and no Liquid tag in the v1 plan (`e19e54c`)
- Reset has one handler: the old one in 07-input.js is gone (`e17fd00`)
- Item 0: a box drawn leaning is a quadrilateral, never a rectangle (`ebf7cec`)
- boards/story: dyna.ink explained in its own medium, kept as a log (`41b93b2`)
- The user surface: a plan for the next dev agent, and the audit it answers (`9979802`)
- CLAUDE.md: the gate's counts after the user-surface units, and what e2e 54–61 hold; PLAN-USER-SURFACE says where it stands (`ef460f5`)
- tests: three round-trip tests carry the timeout the other heavy ones do (`0a91d10`)
- Core tests: a sixty-second ceiling, so a loaded machine's slow bench is not a failure (`d4742c1`)
- e2e 51: the packs golden lists state@1, er@1 and mindmap@1 — a golden changed by design (`2b675ca`)
- tests: the sequence and class negatives carry the timeout too (`5c99103`)
- e2e 51: the packs golden lists garment@1 — a golden changed by design (`857d3c7`)
- e2e 68: a pattern piece drawn with the pointer — read in the field, cut and sewn beside it, its marks at true size (`e6a2642`)
- PLAN-IPAD-NOTES: the iPad notes workflow — the gaps measured, seats per job, and the MVP (`f503e04`)
- PLAN-IPAD-NOTES: John's direction — one OpenRouter key, local and fast first, dyna.ink on Cloudflare, both sides (`a9f9338`)
- e2e 24 recorded again BY DESIGN: a picture is not traced on import, Trace into ink is the offer (`362c1dd`)
- e2e: record 69c2 (a picture dragged like any mark) and the paint check over pictures (`c03d1cc`)
- Gate: the surface's budgets are skipped by name on a page that draws in software (`4bca5db`)
- PLAN-FIELD-PAR: the field walked as a user, and the push to bring it up to par (`c09d337`)
- PLAN-FIELD-PAR: John's decisions — the molecule its own thing, a word waits for a pick, meaning live and rate-limited (`01ed10b`)
- PLAN-FIELD-PAR: the field up to par — a diagram from tied boxes, the arrow's tip tied, words that find acts, a word that waits, Name and Write folded (`0776fa6`)
- e2e 49: the field's golden, changed by design — a typed word waits, and Label it is Write “…” on it (`7db7e08`)
- The field: a pill's note stands under its label, and the waiting word's line fits (`65ad412`)
- e2e 49: the waiting word's line, shortened to fit the field — the golden by design (`8c822a1`)
- e2e 42j: a pill of the pair is still a plain pill — with its note under the label (`noted`) (`c44f032`)
- GUIDE-2026-10-02: the hand-over — affordances, the user, the agent, QA and the director (`41241bf`)
- GUIDE-2026-10-02: names the master it describes, 06c5a2e (`6b396ef`)

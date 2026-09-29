# QA v1 — the ten scenarios, by hand, with the MCP hand in the room

*29 September 2026. The hand checklist `V1-PLAN.md` §9 asks for (H1: A1–A10,
each walked by hand before v1 ships, with the MCP hand in the room checking
what landed). **A10** was written first, by R6, the unit that made the pencil
work; **A1–A9** are written by H1, which also put the machine half in the gate
(`node e2e/run.mjs hand`, `e2e/hand.mjs`: QA-v10's rows, walked headless with
`Demos/mcp.mjs` in a room of its own). Each row says what John does, what he
should see, and — in the last column — what the hand in the room checks: which
tool, and what it should say. A row that fails is a fault to write down as it
happened: what was drawn, where the hand was, what the status line said.*

## The hand in the room

1. **Run the hand.** In a Claude Code session with the repo's `.mcp.json`
   approved, the ten `metamedium` tools are simply there. Otherwise, from the
   shell: `node Demos/mcp.mjs` with its stdin fed by `tail -f` on a command
   file and its stdout to an output file (*The MCP hand* in CLAUDE.md), one
   JSON-RPC line per call. It starts the relay on `:8020` when none answers.
2. **John opens the canvas in the room:** `http://localhost:8010/Demos/session-engine.html`
   (or `/app/` once it is published), the *live* tile → **with Claude**; or by
   address, which a reload keeps — `…/session-engine.html?live=claude&relay=http://127.0.0.1:8020`.
   Give the hand a name in the pane first: it is what the hand sees. The status
   line says *live claude · you are <name> · with claude*.
3. **`canvas_look` is the hand's first check, every time.** It leads with
   `room claude · you are claude · with <name>`, then the count line
   (`N marks · M artifacts · K live`), then one line per mark — id, name, kind,
   readings with their numbers, `labelled “…”`, `says “…”`, where it is, and
   *by whom*. Two things it will **not** say, on purpose: it never says
   *selected* or *the field is open* about John's field (a field is its hand's —
   L2h; `QA-v10.md` §4's *1 selected* is older than that), and it cannot read
   an artifact's code or say which notation a drawing reads as. Those rows have
   a dash in the last column: John's panel, field and frame are the check.
   `canvas_see` gives the ink as a picture, for reading handwriting and for
   *does it look like what he drew*.
4. **The hand never blesses and never plays.** Everything it does is held,
   attributed to it, in its own colour. It is **not a model the board asks**:
   with no model joined and the seat not taken, `canvas_pending` says *no brief
   is parked* the whole way through, and nothing here (the hand arriving, its
   looking, drawing, saying, labelling) may make a model work — no gold dot,
   nothing in the status line about a call. That is A9, and the gate holds it
   (`e2e/hand.mjs` H1.Y).
5. **What the gate already walks** with a synthetic hand and a hand of stdio
   (so John need not repeat it, only the parts that need him): QA-v10 §4, §6
   and §7 and A7 (`hand`, H1.0–H1.21). What it skips, by name, is John's own
   handwriting — QA-v10 §1–§3 — and that stays here, in A6.

---

## A1 — A flowchart

| John | Should see | The hand checks |
|---|---|---|
| Draw a start (a rounded box), two process boxes, a decision diamond and arrows between them; write *yes* and *no* beside the arrows and a word in each box | boxes read *rectangle*, the diamond as a turned box; each arrow reads *arrow* and, as it lands, binds to the box it meets (the ring while drawing, *the line is tied to the box* after); letters gather into words | `canvas_look`: one line per mark, `rectangle 0.8x–0.9x` for boxes and the diamond, `arrow` for arrows, each *by <name>*; the words `a word of N strokes`. `canvas_see`: the figure is legible |
| Press and hold a box | the field opens on the figure it hangs with; *Draw them clean* and, for two or more marks that read as a flowchart, **Make it Mermaid** are offered | — (the field is John's) |
| Take *Draw them clean* | every shape redrawn clean; **the diamond stays a diamond** | `canvas_look` unchanged: clean forms are a rep beside the ink, the marks and their readings are the same lines |
| Drag a box | the arrows tied to it follow, still pointing at it; one undo puts it all back | `canvas_look`: the box's `at x,y` moved and the arrows' `at` with it; after undo, the first positions again |
| Take *Make it Mermaid* | a Mermaid text stands beside the drawing as a card, and draws as a diagram in the board's ink (with the network; the text stands without) | `canvas_look`: one new artifact, kind `mermaid`, named for the notation (`flowchart.mmd`), *by <name>*, and the count line says `1 artifact`. The hand cannot read its text |
| Double-click the card, change a label, Enter | a new version of the text; the diagram redraws | — (`canvas_look` shows the same artifact; a version is not a new one) |
| With the text held alone, take **Draw it** | marks that read as the same diagram stand on the board, right of everything, selected; the status says what was drawn and what was not | `canvas_look`: N new marks and M `labelled “…”` marks, *by <name>*, in the count line; one undo takes them all away and the hand's count returns |
| **The hand draws the same chart:** `canvas_draw` three `rectangle`s and three `arrow`s (from, to) in a row | John sees the hand's shapes in its own colour; he holds them and **Make it Mermaid** is offered for the hand's marks too | `canvas_draw` replies `id → rectangle 0.9x`, `id → arrow 0.9x` per mark; `canvas_look` lists them with no *by* — a hand's own marks are unstamped in its own look — and John's still say *by <name>* |

## A2 — A UML class diagram

| John | Should see | The hand checks |
|---|---|---|
| Draw two boxes, each with a line or two across it side to side (name above, members below), and an arrow with a hollow triangle head from one to the other; write a name in each top compartment | the compartment lines read as lines, the boxes as boxes; the head reads *arrow* or a small triangle; nothing is called a flowchart's process | `canvas_look`: two `rectangle`, the lines `line 0.9x`, the arrow, words gathered — *by <name>* |
| Hold the figure | **Make it Mermaid** is offered; the panel says it reads as a class diagram, not a flowchart | — |
| Take *Make it Mermaid* | a card named `uml-class.mmd` (or the notation's name) stands beside it; the text says `classDiagram` with both classes and the inheritance | `canvas_look`: one artifact, kind `mermaid`, *by <name>*. (Not readable by the hand; John reads it) |
| Take *Draw it* on that card | the class diagram is drawn again as marks, each class a box with its compartments | `canvas_look`: the new marks appear, *by <name>*; count rises |

## A3 — A sequence diagram

| John | Should see | The hand checks |
|---|---|---|
| Draw three boxes in a row, a long line down from each (dashed is fine), and four level arrows between the lifelines top to bottom, the returns dashed; write the names in the boxes and a word above each arrow | the lifelines read as lines under their boxes; messages ordered by height | `canvas_look`: three `rectangle`, three long `line` (or dashes), four `arrow`, *by <name>*; `canvas_see` shows the lifelines plumb and the arrows level |
| Hold the figure and take *Make it Mermaid* | a card named for the notation stands beside it; the text says `sequenceDiagram`, participants left to right, messages in the order drawn | `canvas_look`: one new artifact, kind `mermaid`, *by <name>* |
| Take *Draw it* on the card | the diagram is drawn again: boxes, lifelines, the calls as arrows bound along them, the returns dashed | `canvas_look`: the count line rises by the marks drawn |

## A4 — A pattern page

The rows are §5 of A10 below, done with a mouse or a pen; the hand's
part is the marks and the words, since the numbers and the chips are John's.

| John | Should see | The hand checks |
|---|---|---|
| Type a page of steps as text (`A. Bust 36`, `1. A ÷ 3 = 12 + 2 = 14`, …) with double-click, and write the measurements as words | each step shows its check at the end of its own line; change A and only the steps that depend on it change; undo puts them back | `canvas_look`: one artifact, kind `text`, *by <name>*; the same artifact after an edit (a new version, not a new artifact) |
| Draw a right triangle; write `24` beside the long leg and `8` beside the short one; a small square in the right-angle corner | the long side says `25.30` beside it for a moment; the panel says *legs of 24 and 8 make the long side 25.30* | `canvas_look`: the triangle reads `triangle 0.9x`; the numbers are `a word of N strokes` (`says “24”` once read). The chips are not marks: the hand does not see them |
| Write a third `24` beside the long side | *labelled 24; legs of 24 and 8 make it 25.30, 1.30 longer (5%)* stands beside that number, and stays | `canvas_look`: one more word; nothing else changes — the disagreement is said on John's screen only |
| **The hand transcribes** a number it can read in `canvas_see`: `canvas_transcribe {id, text: "24"}` on a written numeral | the transcript is held on the word as a reading, and the chip follows the new number | `canvas_transcribe` replies *read as “24” … held as a transcript*; `canvas_look`: the word `says “24”` |
| Open *export*; take *true-size.svg* and *print.html* | ready once a figure has numbers and a unit; print the pages at 100% and measure the test square on each | — |

## A5 — A page and a program

| John | Should see | The hand checks |
|---|---|---|
| Draw four boxes as a page (header, two columns, footer), circle them, cross with the check, type *a landing page for a bakery* and Enter (no model: the structure stands at once; with one, its words follow as the next version) | a living page of the drawn layout, the ink outlining its regions; a card says what was made | `canvas_look`: one artifact, kind `html`, `live`, *by <name>*; the four boxes are still marks. With no model, `canvas_pending` says none parked |
| Draw three circles and two lines joining them; circle them; **Show it in 3D** | spheres and bonds turning, each sphere named for its mark; press inside to turn them; a stroke begun outside goes over it | `canvas_look`: one artifact, kind `run`, `playing` (the gate's H1.21 holds this line) and named *graph in 3d* — *by <name>*. **The hand cannot play**: it may `canvas_write` a `run` program, which stands `live` and waits for John's play |
| Ink a small circle over a sphere | the ink addresses that sphere's mark | — |

## A6 — Notes: handwriting, text, folding back

John's own hand is the point (`QA-v10.md` §1–§3 are these rows in full and the
gate skips them by name); the hand's column is those tables', with the tools
named. The hand cannot read handwriting from a look — it looks at the picture.

| John | Should see | The hand checks |
|---|---|---|
| Write *hello* and *world* in his own hand, big, then a tall *l* with a flick apart, then three bubbles and two lines quickly | the letters gather; the panel says *a word of 5 strokes*; the *l* reads *line*, no arrow above 0.3; five marks and not a word | `canvas_look`: `a word of 5 strokes` ×2 (`text 0.7x`), the *l* `line 0.9x` with no `arrow`, five marks. `canvas_see`: the words legible |
| Circle *hello world*, take the check, *Read the writing* (a model that sees) — or, with none, **the hand reads it:** `canvas_see`, then `canvas_transcribe` each word | the words land on their own marks; the field leads with *“hello world”*, the same pills whichever read it | `canvas_look`: each mark `says “hello”`, `says “world”`; when the hand read it, `canvas_transcribe` replies *read as “…”* |
| Take *“hello world”* | clean text where the writing was, fitted to the ink; nothing selected; *Play* is not offered | `canvas_look`: one artifact, kind `text`, named *hello world*, *by <name>* |
| Scratch across *world* in the text; write *there* above the gap, circle it, read it, take *Fold “there” into the text* | *struck “world”*; a `…` stands where it was; then the text reads *hello there* and the writing leaves; two undos walk it back | `canvas_look`: the text's words step *hello …* → *hello there*; the written mark erased; after two undos, *hello world* |
| Label what the writing sits beside: type `label: inlet` at a held box | the word stands on the box, in his colour | `canvas_look`: the box `labelled “inlet”`, *by <name>*. **`canvas_label` on his box is refused, naming whose ink it is** |

## A7 — Two hands

This is `QA-v10.md` §6 in full, and the gate walks its machine half — `node
e2e/run.mjs hand`, H1.7–H1.18 — with a synthetic hand of strokes. By hand,
John's own strokes, the same table:

| John | Should see | The hand does and checks |
|---|---|---|
| Draw a box | — | `canvas_draw` a circle beside it with a `why`: the circle lands in the hand's colour with a card beside it, *with claude* in the status. `canvas_look`: John's box is `stroke:<his name>~<sitting>:N`, the id his own tab gave it |
| — | — | `canvas_say` about that id: the card lands beside **his box**, and on no other mark |
| Write a word | — | `canvas_see`, `canvas_transcribe` it: the transcript pill is on the word with **no model joined** |
| Circle both hands' marks, take the loop | the readings row | `canvas_propose` a reading with a confidence: it is held on his box and `canvas_look` says *gate 0.70 · claude*. The field's *what this is* row shows it too, as *gate 0.70 · claude* (`e2e/hand.mjs` H1.10b) |
| Undo once | only John's last mark goes; the hand's stay | `canvas_look` no longer lists it, still lists the hand's; the next mark he draws has a **new** number, never the undone one's |
| — | *sun* above the hand's circle, in its colour, scaling as the board zooms | `canvas_label` its own circle *sun*; then `canvas_label` his box: **refused, the reply naming whose ink it is** |
| Hold his box and the hand's circle, type `label: inlet` | the line says *↵ label it “inlet” — on yours, not the mark claude made*; Enter puts it on his box alone | `canvas_look`: the box `labelled “inlet”`, by him; the circle with only its own *sun* |
| Hold two of his marks, leave the field open | the hand's line lands and **the field stays open on his two marks**; `name: pair` and Enter make the thing, holding his two and nothing of the hand's | `canvas_draw` a line near it, then `canvas_look`: an artifact *pair*, *by <his name>*; the count line never says *the field is open* |
| Draw a loop round a mark and, before his check… | …the hand's stroke lands; his check still takes **his** loop up | `canvas_draw` a line between his loop and his check |
| Reload the tab (by its address) | the board comes back from the room, his marks in his colour, *you are* his name | `canvas_look` lists his earlier marks under their **old** ids; the next mark he draws carries a new sitting in its id |
| After the reload, hold a mark drawn **before** it, type `label: outlet` | the line says *↵ label it “outlet”*, and Enter puts it on the mark — a reload is a new sitting and the same person | `canvas_look`: the mark `labelled “outlet”`, *by <his name>*; `canvas_label` on his mark is refused |
| — | — | **After all of it,** `canvas_say` about his box and `canvas_propose` on his word: the card is on his box alone and the reading on his word alone (A7's sentence: land on the right marks after undos and reloads) |

## A8 — Boards

The hand is in a room, and a room keeps no local log (L1), so its part is to
be shown what a board holds: join it to the board you are on with the *live*
tile → **with Claude** (which carries the board in), and `canvas_look`.

| John | Should see | The hand checks |
|---|---|---|
| Open *boards*; note the one on screen (*My board*); draw three marks; *New board*, name it, draw two marks | the list holds both, each with when it changed and *N marks · K KB*; the one on screen marked *here* | — |
| Switch between them | each comes back whole; the title and the address (`?board=`) follow | with the tab in the room after each switch, `canvas_look` count line equals the panel's *N marks* |
| Reload, and reload by `?board=<id>` | the board opened last, then the named one | `canvas_look`: the same count and the same ids |
| *rename*, *duplicate*, *delete* one; look at the trash; *restore* | delete loses nothing; restore brings it back whole | — |
| *export* a board as a file, *from a file…* to import it | a new board with the same marks | `canvas_look` on the imported one: the same count; the ids are the file's, unchanged |
| Try to empty the trash | a plain sentence says what will be deleted for good, then a second, deliberate tap | — |

## A9 — With no model

Everything above except the model's own words works with none joined, and the
canvas says what a model would add. **The hand in the room is not a model.**

| John | Should see | The hand checks |
|---|---|---|
| Open *models* with nothing joined | the pane says what the canvas does with no model, and leads with *Claude Code* (one sentence, or *in this room* when the hand is here — he does **not** tap it) | `canvas_pending`: *no brief is parked* |
| Draw, hold, take *Draw them clean*, *Line up across*, *Make it Mermaid*, `= 24 ÷ 3`, *Show it in 3D*; type a brief at a loop | each does its work at once; the brief is *kept for a model* with one sentence, **and no pane opens** | `canvas_pending` says none parked after every step; `canvas_look` has no `brief …` line and no gold dot; the status line never says a call is being made |
| Take *What is this?* or *Read the writing* with no model | one sentence says it needs a model that can see or answer, and the ask is kept | `canvas_pending`: still none — the seat was not taken |
| Tap *Claude Code — in this room*, then *What is this?* | the brief is parked, a gold dot beside the marks | `canvas_pending` lists it by key with what was asked; `canvas_answer` answers it in the contract, and the page reads it as a model's — **the one deliberate act** that makes the hand a model, and it says so on the page |

---

## A10 — Pencil: A1 and A4 by hand, on an iPad with a pencil

The gate already drives most of this with a pen and fingers **synthesised**
on desktop engines — `node e2e/run.mjs --browser webkit pencil`, fourteen
records (e2e/README.md, *Pencil and tablet*): the pen draws with its pressure
on every point, a finger pans once a pen has been seen, two fingers pinch and
leave nothing in the log, a palm while the pen writes or a moment after it is
nothing, the pencil's hover shows the reading and the magnet, the field by
pen, a pill, a clean, an undo, the keyboard (as a visual viewport that
shrinks), the hand tile, the mouse untouched, a save and a reload. What only
the glass can say is below: a real palm, a real Pencil's hover, the real
keyboard, Scribble, rotation, and drawing a whole figure by hand.

### Setup

1. **The address.** Once this is on `master`, Pages publishes it:
   `https://jjh111.github.io/MetaMedium/app/`. Before then, from the Mac at
   the repository root: `python3 -m http.server 8010 --bind 0.0.0.0`, and on
   the iPad (the same Wi-Fi) Safari at
   `http://<the Mac's name>.local:8010/Demos/session-engine.html`. Over plain
   `http` on the network there is no offline shell and no one-tab lock; the
   board is still kept.
2. **A fresh board:** the control centre's *reset* tile, or a new board from
   the *boards* tile. Landscape first; portrait at the end (§6).
3. The **hover** rows (§2) need a Pencil and iPad that report hover to the
   page; skip them where nothing hovers. Leave **Scribble** on (Settings →
   Apple Pencil), as most iPads have it.

### 1. Pen, finger, palm

| John | Should see |
|---|---|
| Touch the pencil to the fresh board for the first time and draw a box, pressing lightly, then hard | the status line says, once: *a pen — it draws now; a finger pans and pinches, and a palm on the glass is ignored · the hand tile switches it*; one mark, read *rectangle*; the line is one width however hard he pressed (pressure is kept in the log, not drawn) |
| Open the control centre | the *hand* tile says **right · pen** |
| Drag one finger across empty ground | the board follows the finger; no ink |
| Tap empty ground once with a finger | nothing drawn — no dot; an open field or selection is let go |
| Pinch with two fingers, then lift them in either order | the board zooms and pans about the fingers, smoothly (no jump or jitter); nothing is added — the panel's mark count is unchanged, and no *not saved* appears in the status line |
| Write a word with the palm resting on the glass, as on paper | only the pencil's strokes; the board does not move under the palm; no stray dot or line where the palm was |
| Rest the heel of the hand first, then bring the pencil down and write | the board may slide a little under the heel, and comes back the moment the pencil lands; the writing is where it was written |
| Lift the pencil between words, hand still down, and go on | nothing from the palm between words |
| Put the pencil down, wait a second, pan with a finger | the finger pans at once |
| Rest the palm on the minimap (the bottom-right corner) while writing | the board does not jump |
| Draw one long, fast stroke right across the board | the stroke is whole — never cut short, never turned into text by Scribble. *If it is cut:* note it, turn Scribble off, and tell Claude (the surface refuses only a moving pencil's default today; a pencil's touchstart would be next) |
| Press and hold the pencil still on empty ground, then on a mark | no magnifier, no text selection, no callout; on a mark the field opens with no loop drawn |
| Double-tap empty ground with the pencil, then with a finger | the text editor opens where he tapped, each time |
| Control centre → tap *hand* | **right · finger**: a finger draws again; write with the pencil, palm down — the palm still draws nothing |
| Tap *hand* three more times | **left · finger**, **left · pen**, **right · pen** — one word changes a tap |

### 2. Hover (a Pencil that hovers)

| John | Should see |
|---|---|
| Hold the pencil just above a box, not touching | the box's reading under it (*rectangle · node*), and the panel reports it, as a mouse's hover does |
| Hover near one of its corners | a ring and the word *corner* at the corner — the magnet; away from it, the ring goes; lift the pencil out of reach, it goes |
| Bring the pencil down inside the ring and draw an arrow to a second box | the arrow starts exactly on the corner and ends on the second box's site; the status says *bound — …* |

### 3. The field and the keyboard

| John | Should see |
|---|---|
| Press and hold a box with the pencil | the field opens at the pencil tip, on the side away from the hand; **the keyboard does not come up by itself** |
| Tap *Draw them clean* with the pencil | the box redrawn clean, the ink faint beneath it |
| Tap the undo button with the pencil | the clean form goes; the ink stays |
| Hold a row of three boxes; tap the field's input | the keyboard rises and **the field moves to stay above it**: the input, its reading line and the four round buttons in view; if the pills do not all fit, they scroll inside the field — drag them with a finger — and every one can be reached and tapped |
| Type a word | *Name it* and *Label it* in view above the keyboard; tap *Label it* — the word stands beside the row |
| Hide the keyboard with the field open | the field stays where it is; the pills no longer scroll |
| Write a word over the field's input with the pencil (Scribble) | the word arrives as text, and the reading line says what Enter will do |
| Turn the iPad with the field open and the keyboard up | the field stays on screen, above the keyboard |

### 4. A1 by hand — a flowchart

| John | Should see |
|---|---|
| With the pencil, draw a start (a rounded box), two process boxes, a decision diamond and arrows between them, and write a word in each | boxes read *rectangle*; the diamond reads as a turned box; each arrow reads *arrow* and, as it lands, binds to the box it meets (the ring while drawing, *bound — …* after); the letters of each word gather into a word as he writes; the palm adds nothing |
| Circle it all and draw the check across the loop (or press and hold a box) | the field opens on the figure; *Draw them clean* is offered |
| Take *Draw them clean* | every shape redrawn clean; **the diamond stays a diamond** |
| Undo with the pencil; then hold the figure and take *Draw them clean* again | the clean forms go, and come back |
| Reload the page | every mark back, clean as it was left; the hand tile still says *right · pen*; nothing is said about the pen again |
| *When D1–D3 land* | it also reads as a flowchart in the field, exports as Mermaid, and a Mermaid text imports back as drawn marks — A1's other rows, by hand |

### 5. A4 by hand — a pattern page

| John | Should see |
|---|---|
| Write the measurements in a column with the pencil (*bust 92*, *waist 74*, …), palm down | each gathers into a word or a line; nothing from the palm |
| Circle a line and take *Read the writing* (with a model that can see) | the words it reads land on the marks, as with a mouse |
| Draw a right triangle | read *triangle*; the panel's *maths* gives its angles (one right) and its sides |
| Write `24` beside the long leg and `8` beside the short one (read, or typed as text), and draw a small square in the right-angle corner | the long side says `25.30` beside it for a moment; point at the triangle and it is back; the panel says *legs of 24 and 8 make the long side 25.30*, and its working is behind *details* (M5) |
| Write a third `24` beside the long side | *labelled 24; legs of 24 and 8 make it 25.30, 1.30 longer (5%)* stands beside that number, and stays |
| Type a page of steps as text (`A. Bust 36`, `1. A ÷ 3 = 12 + 2 = 14`, …) | each step shows its check at the end of its own line; change A and only the steps that depend on it change; undo puts them back |
| Hold the marks and type `= 24 ÷ 3` in the field | the line says *24 ÷ 3 = 8* before Enter; Enter puts it on the board as text |
| Write the unit (`24″`) and open *export* | *true-size.svg* and *print.html* are ready: print the pages at 100% and measure the test square on each (M5–M7) |
| Draw a panel with the pencil, a second outline all round it a finger's width out, a line down the middle with an arrowhead at each end, two ticks across the left edge and a narrow wedge standing on the top edge; hold it | the field leads with *a garment pattern piece* and its tooltip says *one grain line, two notches, one dart, a seam allowance*; nothing of it is read as a flowchart (M6) |
| Write `18″` and `26″` in the gap between the outlines and `Add ½″ seam allowance` on a page beside it | a chip below the piece says *cut 19 × 27″ · sewn 18 × 26″*, for a moment and while you point at it; the panel says it, the ink's own offset beside the page's, the grain, the notches and the dart with their sizes; **the ticks divide nothing** — the side still says 26″ |
| Open *export* → *true-size.svg*, then *print.html* | the cutting line dashed exactly ½″ out, the grain line with a head at each end, the notches and the dart where you drew them; print at 100% and measure the test square (M6, M7) |
| Draw an arrow along an edge instead of the outline round it | the piece is *cut on the fold*: the chip says how wide it opens, and true size prints the half you drew and says so |

### 6. Portrait, and the end

| John | Should see |
|---|---|
| Turn to portrait | the panel lies along the bottom; drawing, panning, pinching and the palm behave as in landscape |
| Hold a mark and tap the input in portrait | the field above the keyboard, as in §3 |
| Add the page to the Home Screen and open it from there | it opens on the same board (the icon may be a picture of the page: there is no `apple-touch-icon` yet) |

# Notes: drawing a figure with the MCP hand

*15 September 2026. Written while making one diagram — "where an answer card
goes" — on a live board, first badly and then properly. Every fault below cost
a real debugging round; every fix is in the tree with a test. What is left
undone is listed as such, with what it would take.*

Read with `SURFACE-v10-PLAN.md` (D1, the hand; D8, ids per hand) and
`CLAUDE.md` (the explanation plane, figures, the live room).

---

## What the exercise was

Add a layout to the explanation plane, then draw the rules of that layout as a
figure on the canvas, using the canvas — ink from `canvas_draw`, words from
`canvas_write`, the board itself as the medium. The first attempt used answer
cards as the caption layer and produced an unreadable board. The second
attempt, after the fixes below, produced a figure that reads in both themes and
at any zoom.

---

## Good — what the medium already did well

**The shape vocabulary is enough to draw with.** Five rectangles and four
arrows, in canvas units, is a diagram. The engine read every one of them back
(`rectangle 0.92`, `arrow 0.54`) so the drawing is not a picture of a diagram,
it *is* one — the boxes can be circled, named, lassoed and built from like any
hand's.

**`canvas_look` is a real reading, not a dump.** Ids, shapes, confidences,
names, bounds, who made each mark. Everything needed to place the next mark
relative to the last, without a screenshot.

**Placement in canvas units is the right interface.** No pixels, no viewport, no
DPI. The figure was authored at one scale and framed afterwards at another, and
nothing had to move.

**The per-participant log held up under a third hand.** Ink arrived stamped,
coloured by name, attributed. The model is sound; what broke (below) was one
line of naming, not the design.

**Ink over ink.** After the figure was made, drawing across it still worked —
the labels are artifacts, the boxes are ink, and a stroke over both addresses
both. Nothing about making a figure took the board out of play.

---

## Hard — what was fixed

### 1. Two logs under one name silently ate each other
`Demos/mcp.mjs` took a fixed `~mcp` suffix, so **every** `mcp.mjs` process on
the machine was the same log name. Three were running. Each answered every
newcomer's hello with its own log under that one name, and the last answer to
land replaced the rest. A tab joining the room saw one hand's drawing and never
the other's — with nothing at all to say so. The drawing was "lost" twice
before the relay buffer showed two `full` answers from the same name with
different contents.

The surface already states the rule: *a hand in a room is one tab*, and the
suffix is per tab because two logs under one name are taken for one log. The
hand broke its own rule. **Fixed**: the suffix is per process.

**Still open**: nothing detects the collision. A `full` that is shorter than
what is held and *diverges* from it is evidence of a name collision, because an
append-only log cannot shrink — except that a reset legitimately shortens one,
so the test has to be divergence, not length. Worth adding to `LiveStore` with a
line in the status bar. Until then, two hands that pick the same name still lose
each other's work quietly.

### 2. A figure came out as a page
`canvas_write({kind:'text'})` put the words on a white card with a scrollbar and
set them **twice** — once as a small-caps heading and once as themselves. The
heading is the region's label, which for a function or a key is a name worth
printing and for a text run is the run's own first forty characters.

And both `svg` and `text` rendered as white plates on a dark board. A page, a
script, a table or a tree is read *on a page* and the plate is that page; a
program, a drawing and a line of words are marks among the ink. The program's
frame had known this since v9; svg and text had not.

**Fixed**: `FIGURE_KINDS` — clear ground, no plate, no shadow, type in the
board's own ink token. A text sets its words once; source keeps its labels.

### 3. A label held at screen size floats off the drawing it labels
Type inside a frame is held at a constant screen size so code stays legible at
every zoom (v9 S4). That is right for source and wrong for a caption: zoom out
and the boxes shrink while the words do not, and the label detaches from the
thing it names.

**Fixed**: a few words are a caption and fill their frame, so they scale with
the board; a file of text still flows. The rule used to be *did it come from
ink*, which is a fact about provenance standing in for a fact about kind.

### 4. A figure vanished when the light came on
A figure's document carries the board's ink colour baked in, because an iframe
inherits no CSS token from the page. The frame only rebuilds when its code or
size changes, so switching to paper left every label in the dark theme's
near-white ink on a light ground.

**Fixed**: the theme is part of what the document is made of, so it is part of
the frame's stamp.

### 5. Eight artifacts, eight filenames, one unreadable figure
Every artifact wears gold corner brackets and its filename. Over a page or a
program that is the canvas saying *a thing with an identity you can grab*. Over
a title, a label inside a box and two notes, it is a second drawing on top of
the first.

**Fixed**: a figure wears its chrome only while pointed at — the same rule the
reading under a mark already follows. A page keeps its brackets.

### 6. The answer card was doing a job it should not have
The first figure put its labels in answer cards, because answer cards were the
only way to get words onto the board. So the prose carried the label — *"Box 3
of six, each given a sentence…"* — which is the writer doing by hand, badly,
what the card already knows.

**Fixed**, in two halves. The card now carries its **subject** and its **age** in
the header: who said it, what it is about, how long ago. And the permanent word
layer — `text` and `svg` figures — became usable, so labels have somewhere
proper to live. The plane is what someone is *saying now*; the drawing is what
the board *holds*.

---

## Needs improvement — known, not fixed here

### A. Node ids do not survive the merge (v10 D8) — the biggest one
A node's id is `stroke:N`, where N counts node-creating events in the **merged**
log. Two participants merge different sets of logs, so the same event gets
different ids in different sessions. Every tool that references a mark by id —
`canvas_say`, `canvas_propose`, `canvas_transcribe`, `canvas_write` with
`artifactId` — therefore lands on the wrong mark whenever another hand's log is
also in the room. This happened immediately: five sentences about five boxes
attached themselves to five unrelated marks in the other hand's sketch.

It is not a small fix. The id has to become a function of the *event*, not of
replay position — the writing log's name plus a sequence number in that log —
so that every replay everywhere derives the same id. That changes the log
format, the merge, and every test that expects `stroke:1`.

**Until then**: a hand can draw and write reliably (neither needs an id), and
should not use `canvas_say` or `canvas_propose` in a room that holds another
hand's work. That is a severe limit on the whole point of the hand, and it
should be the next thing done.

### B. The hand cannot name what it draws
`canvas_propose` offers a reading, held, visible only in the field. There is no
way for the hand to put a *name* on a mark, because naming is blessing and the
hand deliberately never blesses. Reasonable — but it means a hand cannot label
its own drawing the way a person would, and has to reach for a text artifact
laid over the mark instead. Worth deciding: naming a mark **you just made** may
not be blessing at all. It is labelling your own ink, which any hand may do.

### C. A new tab does not reliably catch up
Three times a freshly loaded tab showed part of the room. Some of that was the
name collision (§1), but not all: the relay replays its whole buffer on connect,
including *old* `full` answers, and a `full` replaces what is held. Replaying a
snapshot out of its moment is not obviously safe. The buffer is capped at 5000
lines, so a long-lived room also silently loses its beginning.

### D. There is no lightweight label primitive
The ways to get a word onto the board are: handwriting (needs a model that can
see), a text or svg artifact (a file, with a path and a name), a name on a group
(which creates an artifact), and an answer card (transient). None of them is
*just a word here*. The text figure is now close enough to serve, but it is
still a file with a filename, and every label in a figure is a file on the
folder view.

### E. `fitAll` fits where the cards *were*, not where they are
It fits the union of content bounds and the explanation nodes' **logged** bounds.
Since the placing became runtime those are no longer where the cards are drawn,
so the fit is approximate by construction — near enough in the cases tested
(six cards fitted cleanly, none off screen), but the two numbers have quietly
come apart and one of them is now fiction. Fit content, then let the cards place
themselves inside the result.

I also saw `fitAll` slam to minimum zoom once on a busy live board and could not
reproduce it afterwards. Recorded rather than diagnosed.

### F. Writing a figure is arithmetic
Every bound is typed by hand in canvas units, and a label inside a box means
working out the box's inset yourself. A `canvas_write` that could say *centred
in stroke:4* or *under stroke:7* — placement relative to a mark, which is what
relations already compute — would remove nearly all of it.

---

## For the next hand

1. `canvas_draw` and `canvas_write` are safe in any room; they reference no ids.
2. Use `text` and `svg` figures for the words of a drawing. They scale with the
   board, read in both themes, and keep quiet until pointed at.
3. `canvas_say` is for a live remark about marks *you* just made, in a room
   where you are the only hand, until §A is fixed.
4. Look before every act and after every act. Ids shift.
5. Draw somewhere empty. Another hand's board is theirs.

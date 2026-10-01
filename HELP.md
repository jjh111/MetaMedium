# How to use the canvas

The canvas reads every mark as you draw it. Nothing asks a model until you do.

## The loop: draw, hold, choose

1. **Draw** — a box, a circle, a line, an arrow, a word. Under the mark you
   just made, the canvas says what it reads it as.
2. **Press and hold** a mark. It is held together with what it sits with, and
   **the field** opens beside your hand. (Or circle some marks and double-tap
   inside the circle, or draw your mark across them — see *Your mark*.)
3. **Choose** what it becomes: tap a pill, or type in the field. The line
   under the field always says what **Enter** will do — with nothing typed,
   the likely act (*Draw them clean*, *Line up across*, *read it* for
   writing).

A tap on empty ground lets go of whatever is held.

New here? On an empty board the panel offers **start from an example**: a
board of your own opens with a molecule already drawn — hold it and see what
the canvas reads it as. **More examples** opens the boards pane, where a
flowchart, a class diagram and a pattern page wait too.

## The field

- **The four round buttons**, always in the same place: **Name** (make the
  held marks one thing the canvas remembers, and offers again when you draw
  one like it), **Copy**, **Paste**, **Erase**.
- **What this is** — the readings, each with how sure it is (*row 0.83*,
  *molecule 0.92*). Tap one to take it as the name. A drawing that reads as a
  diagram says so too — *a flowchart 0.84*, *a class diagram 0.49*, beside each
  other when it reads two ways; point at one for what it saw (*three processes,
  one decision, five flows*). A diagram is not a name, so Enter never takes it
  as one; tap it and the canvas says it, or, for the one it can write, makes the
  Mermaid text (below). The panel says the same under **is**.
- **What it can become** — the acts: *Draw them clean*, *Line up across*,
  *Match sizes*, *Show it in 3D*, *Frame these*, … A pill with a dot asks a
  model.
- **Type** a verb (*clean*, *erase*, *line up*), a name the canvas knows, or
  what to make (*a pricing page*). `name:` names, `label:` puts a word on your
  own ink, `ask:` asks a question, `draw:` asks a model to draw.

## Handling marks

- **Move, scale, turn**: with marks held, drag inside the outline, a corner,
  or the knob. One mark held alone shows rings on its own points — drag one to
  reshape its clean form. The ink you drew stays underneath.
- **Draw it clean**: a confident shape is offered redrawn clean; the *snap*
  tile says *offer*, *auto* or *off*.
- **Tie a line to a mark**: end a line or an arrow on a mark's edge, corner or
  centre — the pen feels it — and it follows when the mark moves.
- **Tidy a diagram**: when lines and arrows are tied to the marks of a flowchart
  or a class diagram, hold the drawing and choose **Tidy the diagram**: the
  marks in a row line up, and every tied line runs at right angles between the
  marks it joins, round what stands between. Your own lines stay faint
  underneath, and a box you move afterwards carries them — the lines are drawn
  again from where the box now stands. **Route the connectors** does only the
  lines, and **Show the connectors as drawn** puts yours back. One undo takes a
  tidy away.
- **Erase**: scratch back and forth across a mark three times, or hold it and
  tap **Erase**. Twice only says *one more pass erases it*.
- **Write**: write words in your hand. Hold them and press Enter to have a
  model read them; then make them text, a name, or a label.
- **Type text**: double-click empty ground.
- **Say a diagram as text**: hold a drawing that reads as a flowchart, a class
  diagram, a sequence diagram, a state diagram, an ER diagram or a mind map and
  choose **Make it Mermaid** (or tap its reading in *what this is*). A Mermaid text
  stands beside it, drawn as a diagram in your ink (the text shows when the
  diagram cannot be drawn), and ink over a node of it lands on the mark it came
  from. Double-click the text, or hold it and choose **Edit the text**, to change
  it. Hold it and choose **Draw it** to put it on the board as marks the canvas
  reads back as the same diagram — one undo takes them away. A Mermaid file
  dropped or pasted onto the board is held for you, ready to draw.

## Numbers and sums

The canvas does the arithmetic itself — no model, ever. Write a number
beside a side of a drawing (`24`, `8″`, `12 cm`; type it as text, or write it
and have it read) and it is that side's length.

- **A triangle with 24 and 8 on its legs** says the long side beside it:
  *25.30*. The sizes show for a moment after you change something and while
  you point at the drawing; the panel always says them, with the working
  behind *details*. Hold the marks and choose **Show the sizes** to leave
  them showing.
- **A label that cannot hold** — a third number on the long side that the
  legs disagree with — says so and stays: *labelled 24; legs of 24 and 8 make
  it 25.30, 1.30 longer (5%)*. Draw a small square in a corner to say it is a
  right angle.
- **A page of steps** (`1. A ÷ 3 = 12 + 2 = 14`, with `A. Bust 36` above it)
  shows each step's check at the end of its line — *✓ 14″*, or *✗ 14.67″ ·
  written 12* — and says the other reading when it reads two ways. Change a
  measurement and only the steps that depend on it change; **undo** puts them
  back. **Check the steps** says how many agree.
- **`=` in the field** is a sum: `= 24 ÷ 3` says *24 ÷ 3 = 8* before you press
  Enter, and Enter puts it on the board as text beside the marks held. It reads
  the names on your page too (`= A ÷ 3`).
- **At true size**: with a unit written on the drawing (inches or
  centimetres), **Print at true size** in the field — or the two files in
  *controls › Board › export* — draws it at its real size from the numbers, and
  prints it tiled onto pages at 100% with a test square on each. Measure the
  square before you cut: a printer scales without saying so.
- **A pattern piece**: outline the piece, then mark it as a drafter does — a line
  with an arrowhead at each end inside it is its **grain line**; the same line
  along an edge says that edge is **cut on the fold**; a short tick across the
  outline is a **notch**; a narrow wedge standing on an edge is a **dart**; a
  second outline the same distance off all round is the **seam allowance**, the
  cutting line. Hold it and the field says *a garment pattern piece*. With sizes
  written on it (`18″` beside a side) and an allowance on your page (`Add ½″
  seam allowance`) a chip beside it says what it is cut at and sewn at, and
  **Print at true size** prints the cutting line dashed, the grain line, the
  notches and the dart; a piece on the fold is printed as drawn — half — and
  says it is cut on the fold and how wide it opens.

## Models

A model adds reading handwriting, saying what a drawing is (*What is this?*),
answering a question, and writing a page or a program from a brief. It is
asked only when you ask — never while you draw.

- **controls › Helpers › models** lists who can read for you: **Claude Code —
  in this room** first when Claude is here, a model on this machine (Ollama or
  LM Studio, found by itself, one suggested per job), or a hosted one by its
  key. A key stays on this device, and only if you tick *remember*.
- **Claude**: *controls › Helpers › live › with Claude* joins the room Claude Code is in
  and makes Claude the one who reads for you.
- Ask with no model here and the ask is **kept**: the field says what it needs,
  and it runs when one joins.
- A model at work shows a dot over the marks it is working on. **Esc**, with
  nothing held, stops it.

## Boards

**controls › Board › boards**: a new board, one from a file, rename,
duplicate, delete. Delete puts a board in the trash; *restore* brings it back
whole. **reset** is a fresh board — the old one goes to the trash. Under
*examples*, a flowchart (with its Mermaid beside it), a class diagram, a
molecule and a pattern page: opening one makes a new board of your own from
it — the example itself never changes, so draw on it freely. Every
board is kept in this browser as you draw; **export** writes it out as SVG, PNG
or its log — and, when what you hold or the board reads as a diagram, as Mermaid
text — and **folder** makes a folder on your computer the canvas.

## Packs

**controls › Helpers › packs** lists premade drawings a board can use.
*Basics* knows a bubble (a circle on its own) and a molecule (three bubbles
joined by two bonds): use it and the field names what you draw — *molecule
0.92 · Basics* — with nothing taught by you. *Flowchart*, *UML class diagram*, *Sequence diagram* and *Garment pattern* name
the diagrams and pattern pieces the canvas reads and make what goes with them
likelier first. A board keeps the packs it uses; *stop using* puts one back, and
**undo** takes either back.

## Live rooms

**controls › Helpers › live**: a room name, and other tabs on this machine can
join it; with a relay, other machines too. Each hand draws in its own colour,
and a word goes only on your own ink.

## Your mark

A mark is a gesture: circle some marks, then draw your mark across them to see
what they can become. The built-in mark is a check ✓. Teach your own under
**controls › Helpers › mark** by drawing it five times; *Forget* goes back to
the check.

## Undo

**undo** in the bar, or ⌘Z / Ctrl+Z, takes back your own last act — one
stroke, or everything one choice in the field did. Another hand's work in a
live room stays.

## On an iPad

**Add it to the Home Screen** (Safari's share button › *Add to Home Screen*).
Safari clears what a website keeps — the boards, here — after seven days
without a visit, unless the site is on the Home Screen; an installed app is
not cleared that way. The canvas also asks the browser to keep its storage, once,
the first time a board holds something, and the foot of
**controls › Board › boards** says where that stands: *kept on this device* with
how much room it takes and has, or *this browser may clear it after a week
unused — add to Home Screen*.

**An installed app does not see the boards you kept in a Safari tab** — they
are two separate places on the iPad. To move a board, open it in the tab,
**export** its log, then in the app open **boards › from a file…** and pick it.
Do this once, before you rely on the app.

**The pencil draws, a finger pans, two fingers pinch, and a palm on the glass
is ignored.** The canvas keeps how hard you pressed and when, at every point the
pencil reports, so a quick stroke stays as smooth as you drew it. The *hand*
tile gives a finger its ink back, and says left or right for your hand.

**Pictures come in two ways**: **Import a photo** (from your photo library or
Files, several at a time) and **Take a photo** (the camera). Each lands on the
board and is kept with it.

## Shortcuts

- **⌘Z / Ctrl+Z** — undo your last act
- **⌘C / Ctrl+C** — copy the held marks
- **⌘V / Ctrl+V** — paste — copied ink, a picture, or a file
- **Delete / Backspace** — erase the held marks
- **Esc** — close the field, let go, or stop the models at work
- **Enter** — do what the line under the field says
- **↑ ↓ ← →** — choose a pill in the field
- **+ / −** — zoom in / out
- **⌘0 / Ctrl+0** — fit everything on screen
- **Space + drag, or scroll** — pan
- **pinch, or ⌘ / Ctrl + scroll** — zoom

With a pen: the pen draws, a finger pans, two pinch, and a palm on the glass
is ignored. The *hand* tile gives the finger its ink back.

---

*The manual test plan the builders walk is `QA-v8.md`, beside this file in
the repository.*

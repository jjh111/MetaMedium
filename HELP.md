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

## The field

- **The four round buttons**, always in the same place: **Name** (make the
  held marks one thing the canvas remembers, and offers again when you draw
  one like it), **Copy**, **Paste**, **Erase**.
- **What this is** — the readings, each with how sure it is (*row 0.83*,
  *molecule 0.92*). Tap one to take it as the name.
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
- **Erase**: scratch back and forth across a mark three times, or hold it and
  tap **Erase**. Twice only says *one more pass erases it*.
- **Write**: write words in your hand. Hold them and press Enter to have a
  model read them; then make them text, a name, or a label.
- **Type text**: double-click empty ground.

## Models

A model adds reading handwriting, saying what a drawing is (*What is this?*),
answering a question, and writing a page or a program from a brief. It is
asked only when you ask — never while you draw.

- **controls › Helpers › models** lists who can read for you: **Claude Code —
  in this room** first when Claude is here, a model on this machine (Ollama or
  LM Studio, found by itself, one suggested per job), or a hosted one by its
  key. A key stays on this device, and only if you tick *remember*.
- **Claude**: *controls › live › with Claude* joins the room Claude Code is in
  and makes Claude the one who reads for you.
- Ask with no model here and the ask is **kept**: the field says what it needs,
  and it runs when one joins.
- A model at work shows a dot over the marks it is working on. **Esc**, with
  nothing held, stops it.

## Boards

**controls › Board › boards**: a new board, one from a file, rename,
duplicate, delete. Delete puts a board in the trash; *restore* brings it back
whole. **reset** is a fresh board — the old one goes to the trash. Every
board is kept in this browser as you draw; **export** writes it out as SVG, PNG
or its log, and **folder** makes a folder on your computer the canvas.

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

# QA for v8 and v9 — a demo you can run by hand

**Branch:** `next-phases` · **Surface:** `Demos/session-engine.html` (serve the
repo root with `python3 -m http.server 8000`, open
`http://localhost:8000/Demos/session-engine.html`) · **Date:** 6 September 2026

Every step below says what to do and what you should see. Tick the ones that
hold; write down the ones that do not, with what happened instead. Steps
marked **(model)** need a model joined — see §0. The *help* tile in the
control centre opens this file.

## 0. Setup, and the frame

1. The page is **one bar**: the wordmark and *details* on the left; the mark
   chip, *undo* and a four-dot button (the **control centre**) on the right.
   Nothing on the page explains the system.
2. Open the control centre. Tiles in a grid, each saying its state: *zoom*,
   *snap · offer*, *view · canvas*, *theme · system*, *hand · right*,
   *auto-read · off*, *folder*, *import*, *export*, *models · none*, *mark*,
   *reset*, *help*. It closes on Esc, on a tap outside, and on the next stroke.
3. Tap **theme** until it says *light*: the page is paper, the ink dark, the
   mark chip redrawn. *dark* is the grey room. *system* follows the OS.
4. Tap **reset**. The board is empty. (Reset also forgets the board that
   browser storage held; a plain reload brings the last board back.)
5. **snap** says *offer*. If it says `auto` or `off`, tap it until it says `offer`.
6. **(model)** Tap **models**. A pane opens under the bar. Choose
   *OpenRouter*, paste your key, type a model id (for handwriting, one that
   can see). Tick *remember on this device* only if you want the key kept in
   this browser's storage; it is never written to the log, the folder, or
   any file. The pane says the model joined; the *models* tile names it; the
   status line names it. **Nothing is sent to it yet** — and nothing will be
   until you ask (§5–§6).

   Without a model, everything in §1–§4, §7–§12 still works. §5–§6 need one.

## 1. Draw, and the canvas reads

1. Draw a box, a circle, a triangle, a line. The panel names each (`shape`),
   with a confidence and the reasons, and offers *draw it clean* (a dashed
   ghost under the mark).
2. Draw a box tilted about 15°. It still reads as a rectangle and is offered clean.
3. Draw a pentagon. The panel holds rectangle and circle close together and
   does **not** offer to draw it clean — a tie is not settled for you.
4. Scribble three passes across a mark. It is erased; the status says so.
   **Undo** brings it back.

## 2. The loop, the mark, the selection, the field

1. Draw three boxes in a row, at the size your hand draws them (small is
   fine). Circle them. **Nothing lights up**: the loop is plain ink, and the
   status says *cross the loop with ✓ to select what it holds*.
2. Draw a **check ✓** across the loop's edge (down to a sharp elbow, then a
   longer flick up). The loop and the check both **leave the view**; the
   three boxes get a dashed outline with corner handles and a knob; **the
   field** opens to the right of where the pen let go (to the left, if the
   *hand* tile says *left*).
3. The field has a text input, an empty reading line under it, and three
   rows: **Name… · Copy · Paste · Erase** (always these four, in this
   order; *Paste* is dim until something is copied), then what the marks
   read as (with numbers — for three plain boxes there may be nothing), then
   what they afford: *Draw them clean*, *Line up across*, *Match sizes*,
   *What is this?* (with a dot: it asks a model).
4. Type `dup`. The reading line says **↵ Duplicate these** before you press
   anything. Enter: a copy of the three appears beside them and **the copies
   are the selection**. Tap empty ground: the selection is gone. Undo: it is
   back, in place.
5. Type `er` — the line says *↵ Erase*. Type `clean` — *↵ Draw them clean*.
   Type `line` — *↵ Line up across*. Type `xyzzy` — *↵ building needs a
   model* (no model) or *↵ <model> builds a page* (one joined). Enter never
   does anything the line did not say.
6. Circle the copies, check, take **Erase**. They go; undo three times brings
   them back.
7. Circle three marks, check, **Copy**; tap off; circle another mark, check,
   **Paste**: the copied ink lands beside it and is the selection. ⌘C on a
   selection copies too; ⌘V pastes where the pen last was.
8. Drag inside a selection: it moves. Drag a corner: it scales. Drag the
   knob: it turns. Each is **one** undo step.

## 3. Name it, recognise it, correct it

1. Draw three small circles and two short lines between them. Circle, check,
   tap **Name…** (the field fills with `name: `), type `molecule`, Enter —
   the line said *↵ name it “molecule”* first. The five become one artifact
   with brackets and the name.
2. Draw the same arrangement again nearby. A dashed box appears around it
   with a chip: **molecule 0.9x**.
3. Circle it, check. The field's second row leads with **molecule 0.9x**
   (the reading line says *↵ molecule … — take it as another molecule*) and
   the third row has *Not a molecule*. Take *Not a molecule*. The chip goes.
4. Draw the arrangement a third time. It is **not** offered as a molecule.
   The correction held.

## 4. Teach your own mark

1. Control centre → **mark**. A pane opens under the bar. Draw a caret (^)
   five times in the pad; the dots fill; the pane says *Consistent (N%)*.
2. *Use this mark*. The chip in the bar now shows **your caret**, labelled
   *your mark*; the *mark* tile says *your mark*. Close the pane (×).
3. Circle some marks and cross the loop with a **caret**. It selects. Cross a
   different loop with a **check**: the status says *no summon — that is not
   your mark*.
4. Reload the page. The chip still shows the caret (held on this device).
   Open the pane: the five samples are there. **Draw on the pad**: it starts
   a fresh set at once (no *Clear* needed). *Forget* goes back to the check.
5. If at any point the pad or the canvas **keeps drawing after you let go**,
   note the device (mouse, pen, trackpad, finger) and whether it was the first
   contact after opening the pane.

## 5. Handwriting **(model that can see)**

1. Draw a box. Beside it write a word in cursive, one stroke. **Nothing is
   sent**: no gold dot, the status line quiet, the panel says *unread*.
2. Circle the box and the word, check. The third row has **Read the
   writing** with a dot. Take it (or type `read`, Enter): the gold dot and
   *<model> · reading the writing* appear over the word; then the field's
   second row leads with **“<the word>” 0.9x** and the panel holds every
   reading, ranked.
3. Take the word's pill: the box is named that.
4. Print a word letter by letter (N, A, V). The letters gather into **one
   word** as you go; the panel offers *not a word — split it*. Small circles
   and lines drawn quickly do **not** gather into a word.
5. Control centre → **auto-read · on**. Write another word: it is read as it
   lands, with the dot over it. Turn it off again.

## 6. A page from four boxes **(model)**

1. Draw four boxes in a 2×2. Circle them, check. **No call is made** by the
   check: no dot, nothing in the status line.
2. In the field type `website about dolphins`. The reading line says
   **↵ <model> builds a page**. Press **Enter**: a **breathing gold dot and
   "<model> · building “website about…”" appear above the boxes** and in the
   status line while the model works.
3. A page renders **inside your ink**, one region per box, your boxes still
   drawn on top. The status line says *<model> built r1, r2, r3, r4*; the
   panel says *living page*, lists `r1…r4`.
4. Draw a loop **on** one region of the page, check. The field's placeholder
   says *on <name> — type what to change…*. Type `make this a headline`: the
   line says *↵ <model> changes what the loop covers*. Enter. Only that
   region changes; the others are untouched.
5. Circle the page, check, type `ask: what relates these?`, Enter: an answer
   card appears **in the canvas** beside it, attributed to the model. Circle
   two boxes, check, `draw: add a footer under these`, Enter: the model's
   marks arrive in its own colour, each with a short why beside it.
6. Circle any group, check, take **What is this?** (or type `what`): every
   joined model reads it; the readings join the second row as *<label> 0.xx ·
   <model>*; tapping one names the group that.

## 7. The tank: definitions, instances, clocks

1. Draw a small circle with a small triangle touching it. Circle, check,
   *Name this…* `A`. Draw three more like it. Each shows *A? circle + mark to
   confirm* (held as an instance, unblessed).
2. Circle the named one, check: the palette offers **Play A**. Take it. All
   four drift and wander, **the drawings themselves moving**. The panel on
   the named one shows *clock playing · t = …* and *bodies 4 (3 held)*.
3. Circle it again, check, **Pause A**: they hold still. **Reset A**: they
   snap back to where they were drawn.
4. Circle one of the instances, check, *Not an A*: it leaves the tank; the
   others go on. Undo: it is back in.
5. Play, then **undo the last instance's strokes**: the tank re-derives; the
   remaining bodies are where a fresh run of the shorter program puts them.

## 8. Words into verbs, and acting it out

1. With `A` from §7 in the loop, type `flees anything bigger, wanders slowly`
   and take the pill **A: flee anything bigger · wander (0.50)**. The panel's
   ladder shows: the words, a **slider per term**, what each verb is doing now
   (as percentages while playing), and *source* (the same terms as code).
2. Move a slider and let go: one event; undo puts it back.
3. Draw a bigger circle-and-triangle nearby, name it `B`, play `A`: the As
   flee from it.
4. Play `A`, **select one A and drag it** while the clock runs, tracing what
   you want it to do. On release the status says *acted out: … — N%
   explained*, and the panel lists an **offered** behaviour with *use it*.
   Taking it (or the palette's pill for it) makes it what `A` does.

## 9. The drawn slider and a frame

1. Draw a horizontal line and a dot on it. Circle both, check: **Make it a
   slider**. Take it. A value (`0.33`) shows beside the dot. **Drag the dot**:
   it slides along the line and the value follows; one undo step.
2. Make a `js` artifact: draw a box, circle, check, *Name this…* `mover`.
   (For now the code is attached from the console:
   `__mm.session.attachCode({participantId: __mm.MM.LOCAL_PARTICIPANT, nodeId: '<id>', kind: 'js', code: 'const SPEED = 60;\nreturn { fx: SPEED, fy: 0 };', at: Date.now()})`
   — the panel shows the id.) The box renders its **source**, each function a
   labelled region.
3. Circle the slider and the script, check: **Frame these**, with the wire
   named *value → param:SPEED*. Take it. A dashed bracket names the frame; a
   thin wire joins them; the script's source now shows `const SPEED = 0.33`.
   Drag the dot: the source follows.
4. Panel on the script: *clock — play*. Play: the frame drifts right at the
   wired speed. Attach code that throws (`throw new Error("boom")`): the
   clock pauses with *threw: boom*, the frame is outlined red, and **drawing
   still works**.

## 10. The folder

1. Control centre → **folder** (Chrome/Edge). Pick a small folder with some
   `.html`, `.md`, `.js`, `.png` files. Each becomes a card-sized artifact;
   the *folder* tile names it; the status says *folder <name> · N files ·
   saved*.
2. Draw a stroke. Look in the folder: `.metamedium/logs/local.jsonl` exists
   and grows. Reload the page and open the same folder: the board is back,
   nothing imported twice.
3. Control centre → **view · grid**: every artifact as a card, **under the
   same bar** — the bar now carries the count and *sort name · kind · recency
   · folder*, and *canvas*. Click a card: it fills the screen (focus), and
   the bar carries ← its name and position →. **Esc** back to the canvas.
4. Open a folder with more than twelve pages: the nearest twelve run, the
   rest are **parked cards**, and the status says *12 of N live*.

## 11. Pictures in, the board out

1. Drop a photo of a paper sketch of boxes on the canvas (or the **import**
   tile, or paste). The sketch is **traced into ink** where you dropped it; the photo
   sits beside it. Circle the traced ink, check, and prompt a page **(model)**:
   it renders inside the traced outlines.
2. Drop an `.svg`: it is an artifact whose elements ink can address.
3. The **export** tile → `svg`: a file of paths, one per stroke, clean forms where
   held. → `log`: the session as one event per line.

## 12. Text

1. **Double-click empty ground.** An editor opens there. Type `Hello`, Enter.
   A text artifact stands where you typed.
2. Make an `html` artifact with a slot (drop an `.html` that has
   `data-region="title"`, or use one built in §6). Circle it with the text,
   check, **Frame these**: the words land in the slot.
3. Panel on the text: *edit the words*. Change them, Enter: the page follows;
   the panel counts two versions; undo drops the new one.
4. **(model)** Circle a handwritten word the model has read, check: **Make it
   text “<word>”**.

## 13. Installable

1. In Chrome's address bar the install icon appears; install it. It opens as
   an app. Turn the network off and open it: the canvas loads.
2. `?git=owner/repo` in the URL opens a public repository read-only as the
   folder. (Writing needs a token pasted in the pane — not in this pass.)

## What would count as a fail worth stopping for

- Any stroke that keeps drawing after the pen lifts.
- The palette not appearing after a check across a loop that holds marks.
- A tank that does not return to its drawn positions on Reset.
- Anything from §6 that silently does nothing: with a model joined, typing
  and Enter must always show the thinking dot or a reason in the status.
- **A model called without being asked**: a gold dot appearing after a plain
  stroke, a check, or a join, with *auto-read* off.
- Enter doing something the reading line did not say.

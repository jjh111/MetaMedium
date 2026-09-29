# QA v1 — the ten scenarios, by hand

*27 September 2026. The hand checklist `V1-PLAN.md` §9 asks for (H1: A1–A10,
each walked by hand before v1 ships, with the MCP hand in the room checking
what landed). Only **§A10** is written so far — by R6, the unit that made the
pencil work — and H1 writes the rest. Each row says what John does and what
he should see. A row that fails is a fault to write down as it happened: what
was drawn, where the hand was, what the status line said.*

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
| *When M6 lands* | the garment pack's pattern pieces read as such — A4's last row, by hand |

### 6. Portrait, and the end

| John | Should see |
|---|---|
| Turn to portrait | the panel lies along the bottom; drawing, panning, pinching and the palm behave as in landscape |
| Hold a mark and tap the input in portrait | the field above the keyboard, as in §3 |
| Add the page to the Home Screen and open it from there | it opens on the same board (the icon may be a picture of the page: there is no `apple-touch-icon` yet) |

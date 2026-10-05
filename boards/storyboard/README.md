# The storyboard — a shot list for what dyna.ink is for, 4 October 2026

Sixteen shots across **maths, physics, reasoning and design**, laid out as a board
you open in the app and comment on with your own pen. Each shot is a **region**
(its sketch, a status, what it shows, and room under it for your marks); each row
of four is a region holding them, so the panel's outline *is* the shot list, and
Find finds any word on it.

## Open it

The app (`https://jjh111.github.io/MetaMedium/app/`) → the control centre's
**boards** tile → *examples* → **The film and the storyboard**: the storyboard beside
the launch film, playing (a tap pauses it, the corner asks for sound), made into one
example by `scripts/examples.mjs` (`boards/examples/story.jsonl`). Or **from a file…** → `board.jsonl` here, the
storyboard alone. Either opens as a new board of your own: draw anywhere, scratch a shot out, arrow a new order, double-click to
type, drag a shot by its title. Then **export → board + pictures** and send the
file back; its marks can be read with the engine.

## The shots

Status is honest: **BUILT** is in the app today, and its sketch is live: point at it
or hold it and the canvas answers. **SPECCED** is in `V1-SPEC.md`, not built.
**PROPOSED** is new; nothing of it is built.

| # | Shot | Status | What it shows |
|---|---|---|---|
| | **Maths — the numbers a drawing implies** | | |
| 1 | The triangle solves itself | BUILT | three ruled lines, legs of 24″ and 8″; the long side, 25.30″, appears beside it — live on the board |
| 2 | Change one number, only what depends on it moves | BUILT | a page of steps, each checking itself (✓ at the end of its line); edit the waist and only its steps change |
| 3 | A pattern piece, printed at true size | BUILT | grain line, notches, dart, seam allowance; read as *a garment pattern piece 0.66*; print with a test square |
| 4 | Ask a sum, in the field | BUILT | `= A ÷ 3` typed at a hold, the answer before Enter |
| | **Physics — drawings that move by rules** | | |
| 5 | Draw a pendulum, it swings | PROPOSED | Chalktalk's road: a pivot, a rod and a weight read as a pendulum and simulated |
| 6 | A tank of drawn creatures, told what to do in words | BUILT | fish named and given verbs in words (*flees anything bigger*); act a behaviour out by dragging |
| 7 | Forces as arrows, added up | PROPOSED | a free-body diagram: arrows read as vectors, summed, the block slides |
| 8 | A molecule stands up in space | BUILT | matched by the Basics pack (*molecule 0.91 · basics*), then *Show it in 3D* |
| | **Reasoning — readings that say why** | | |
| 9 | Ask why, and get the evidence | BUILT | every reading carries its measurements; several stand at once |
| 10 | Two readings tie — ask the decider | BUILT | *Which is it?*, a decision model asked by one tap, its answer held beside the engine's |
| 11 | The flowchart runs | SPECCED | the flowchart reads (*a flowchart 0.92*, live) and offers its Mermaid — built; a token walking it — specced |
| 12 | Claude as a second hand on the board | BUILT | the seat: a question parked in the room, Claude's answer held and attributed, never blessed |
| | **Design — sketches that become the thing** | | |
| 13 | A sketch becomes a living page | BUILT | a wireframe read as a layout, then a real page in place with the ink over its parts |
| 14 | Tidy the diagram | BUILT | ranks lined up, connectors routed at right angles, one undo |
| 15 | Colour follows meaning | SPECCED | kinds said in words take their colour: kin share a hue, opposites sit across the wheel |
| 16 | Notes into places | BUILT | regions and Find (this board is made of them); orbits specced next |

A last empty region, **your shots**, is for the ones this list missed.

## How it is made

`node boards/storyboard/make.mjs` writes `board.jsonl` from the engine (the
committed Node bundle), as `scripts/examples.mjs` makes the examples: a fixed
clock, seeded tremor, shapes from `strokeFor`, the flowchart from `drawMermaid`,
the pattern piece as core's garment fixture draws one, the Basics pack used by an
event. The notes are `svg` figures (left-aligned, one size in board units, the
board's ink colour), because a `text` artifact of eight lines or fewer is fitted
line by line to its frame and stretches a short line's letters across it.
Running it prints the outline. It exports `makeStoryboard(MM, session?)`, which
`scripts/examples.mjs` calls to draw it beside the film, so the example
*The film and the storyboard* is drift-checked in CI with the other examples (this file's
own `board.jsonl` is not).

What making it found:

- **A frame stroke round a sketch swallows the reading.** A box drawn round a
  molecule makes it a molecule-in-a-box, which no definition matches. So the shot's
  region is the frame, and no stroke is drawn.
- **A text whose code is an array breaks the page.** The surface's `hashOf` throws
  on it. So the maker refuses anything but a string.
- **The live budget is twelve.** Zoomed out, most notes stand as parked cards.
  Zoom to a row and they render.

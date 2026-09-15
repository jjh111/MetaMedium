# QA v10 — the foundations, with a second hand in the room

*15 September 2026. A hand test of everything §0 of `SURFACE-v10-PLAN.md`
built, run **with the MCP hand in the loop**: John draws in his own hand,
Claude Code sits in the same room through `Demos/mcp.mjs` and checks what
landed with `canvas_look` and `canvas_see`, draws alongside, and reads.
Each step says what John does, what he should see, and what Claude
verifies — so a miss is caught the moment it happens, not from a
screenshot later.*

## Setup

1. In the terminal at the repo, Claude runs the hand: `node Demos/mcp.mjs`
   (it starts the relay on :8020 when none answers). Or, in a Claude Code
   session with the repo's `.mcp.json` approved, the seven `metamedium`
   tools are simply there.
2. John opens **Chrome** at `http://localhost:8010/Demos/session-engine.html`,
   presses the *live* tile, then **with Claude**. The status line says
   *live claude · you are hand · with claude* within a moment. Give the hand
   a name in the pane first if you like — it is what Claude sees.
3. Claude: `canvas_look` says *with hand* (or the name). The board is what
   John's tab holds. **Claude never plays a program and never blesses**;
   everything it does is held and attributed, in its own colour.

## 1. Letters at any size, words, a line

| John | Should see | Claude checks |
|---|---|---|
| Write *hello* in his own hand, big | the letters gather as he goes; the panel says *a word of 5 strokes*; no field opens mid-word | `canvas_look`: one mark, *text*, `a word of 5 strokes` |
| Write *world* beside it | a second word | two words; `canvas_see` shows both, legible |
| Draw a tall *l* with a flick at the end, apart | the panel says *line*; no arrow candidate above 0.3 | `canvas_look` on it: `line 0.9x`, no `arrow` |
| Draw three bubbles and two joining lines quickly, apart | five marks, no word | five marks, not a word |

## 2. Reading, and the transcript as text

| John | Should see | Claude checks |
|---|---|---|
| Circle *hello world*, take the loop | *writing 0.7x* leads; one *Read the writing* pill (tooltip: *a line of 2 words*) | — |
| Take *Read the writing* | the dot names the **smallest** model that sees; each word lands on its own mark; the field leads with *“hello world” 0.9x*, tooltip *take it as text, here* | `canvas_look`: each mark `says “…”` |
| — or, with no model that sees — | *Read the writing* says it needs one | Claude reads instead: `canvas_see` on the two marks, then `canvas_transcribe` each — the same pills appear |
| Take *“hello world”* | clean text where the writing was, fitted to the ink, on the bare canvas; **nothing selected**; the status says it is text now | `canvas_look`: one artifact, `text`, named *hello world*; the words are its parts |
| Write *hello world* again elsewhere | no chip calls it *another hello world* | no cluster candidate |
| Circle the text | *Edit the text*, *Show the ink*; **no** *Play* | — |
| *Show the ink* | the writing is back, the text gone; *Show the text* brings it back | — |
| Double-click the text | the editor opens on the words; Enter keeps a new version | `canvas_look` shows the new words |

## 3. Text folds back from ink

| John | Should see | Claude checks |
|---|---|---|
| Scratch out *world* in the text (three passes across it) | *struck “world”*; a dim `…` stands where it was; the scratch is gone | `canvas_look`: the text says `hello …` |
| Write *there* just above the gap; circle it; *Read the writing* | the field leads with *Fold “there” into the text* | — |
| Take it | the text reads *hello there*; the writing has left; nothing selected | text `hello there`; the written mark erased |
| Undo twice | the gap is back, then *world* is back | the versions walk back |

## 4. The mark, the ghost, one tap

| John | Should see | Claude checks |
|---|---|---|
| Draw a box; draw his taught mark beside it, crossing nothing | nothing opens | no summon |
| Draw the mark across the box | the field opens on the box | `canvas_look`: *1 selected* |
| Tap the ground once | the field and the selection are both gone; the next stroke draws | *0 selected* |
| Draw a circle | the dashed clean form shows, then goes after a few seconds; hover it and it is back; the snap tile still counts it | — |
| Draw a box while a text is selected, below it | it is a box, not a move; the selection ends | a new `rectangle` mark, *0 selected* |

## 5. A model's answer stays; a brief that fails leaves nothing

| John | Should see | Claude checks |
|---|---|---|
| Circle three bubbles, *What is this?*, tap the ground before it answers | when it lands: a chip under the bubbles with the reading and the model's name; the status says it once | `canvas_look`: readings on the group's first mark, attributed |
| Tap the chip | the field opens on the bubbles again | *3 selected* |
| Circle a shape, type *draw a svg of a flower*, Enter (a small model) | the dot shows its seconds; after thirty, *Esc stops it*; Esc stops it; on failure the loop is as it was, no artifact named after the brief | `canvas_look`: no artifact *draw a svg of a flower* |

## 6. Two hands

| John | Should see | Claude does |
|---|---|---|
| Draw a box | — | `canvas_draw` a circle beside it with a *why*: John sees the circle land in Claude's colour with the card beside it, and *with claude* in the status |
| Write a word | — | `canvas_see` the word, `canvas_transcribe` it: John sees the transcript pill on the word without any model joined |
| Circle both hands' marks, take the loop, *What is this?* | the readings row, if a model is joined | `canvas_propose` a reading with a confidence: it joins the row as *… · claude* |
| Undo once | only John's last mark goes; Claude's stay | `canvas_look` still lists Claude's marks |

## 7. The minimap and the frame

| John | Should see | Claude checks |
|---|---|---|
| Zoom in far and pan away | the minimap shows the board and the viewport; a tap on it goes there | — |
| Draw three circles and two lines; circle them; *Show it in 3D* | spheres and bonds turning; press inside to turn them; a stroke begun outside goes over | `canvas_look`: one `run` artifact, *playing*; parts named for the marks |

## What would count as a fail worth stopping for

A letter that does not gather at his size. A summon that opens while he
is writing. A ghost that stays. A *Play* on a text. A brief that leaves a
named artifact behind. A reading that lands and shows nowhere. Claude's
mark arriving under John's name, or doubled.

# Gestures: the command mark, the field, loops, erasing

> Part of the engineering reference that `CLAUDE.md` indexes. The code is the truth; this says why it is shaped so.

## Gestures: taught, and relational

**The command mark is a check ✓** — down to a sharp elbow, then a longer flick
up — drawn across a circled group. It is *defined*, by eight scale-free
measurements, and `BUILTIN_COMMAND_MARK` is **not a special case in the code**:
it is a signature learned from canonical samples by `learnCommandMark`, exactly
the way your own mark is learned when you draw it five times. One mechanism,
shipped pre-taught. `session.teachCommandMark(mark, at)` replaces it as an
event, so it replays with the session.

Why a check: it already means "yes, do this"; its elbow is sharp and its arms
are asymmetric (~1:1.6), unlike anything in the canvas's vocabulary; and it is
**oriented** — the elbow sits low and the stroke ends high.

**A taught mark is held on the device** (`localStorage`, with the five samples
it learned from) and re-taught into the session at boot as a `teach` event, so
it replays like any other. Opening the pane with a mark held shows those five
samples and offers *Forget*; teaching a new one means *Clear* first. **A mark
is its hand's** (V1-PLAN L2h): a `teach` sets the mark of the hand that
taught it, and judges only that hand's strokes. Opening a board re-teaches
the device's mark unless this hand's own log (the events with no `by`)
already teaches one — another hand's teach says nothing about it — and the
re-taught mark is this hand's, sent with its log (`openStore` in
`17-folder.js`; a room's first merge used to drop it, e2e 46).

- Features are **scale-free** (ratios, counts, and positions within the stroke's
  own box), so a mark works at any size and any zoom. Three are oriented.
- **Rejection is tested harder than recognition.** The earlier rule (open, 1–2
  corners, smaller than the lasso) fired on an L, a backwards L, a V, a caret,
  and a check drawn backwards. `commandmark.bench.test.ts` pins 100% acceptance
  of hand-drawn checks and **zero** false fires across the drawing corpus.
- Tolerance floors are the *designed* generosity; a learned spread only widens
  them. The straightness floor is the widest and was measured, not guessed.
- One engagement rule for every mark: it must **cross the selection, overlap it,
  or come close relative to the selection's own size** (`checkProximityRatio`).
  No fixed pixel term remains in the gesture grammar.

**The field: one input, one reader, three rows in fixed slots** (v9 S2,
`SURFACE-v9-PLAN.md` §6). Taking a loop up dissolves it into a selection — a
dashed outline with corner handles and a knob; drag inside moves, a corner
scales, the knob turns, one event per drag, the ink untouched — and **the
field** opens at the pen tip, fanning to the hand's side (a tile flips it).
Everything typed there goes through one reader, `readField`, which returns
*what Enter will do* and shows it under the text as it is typed. **With
nothing typed, Enter does the likely act** (PLAN-USER-SURFACE U1e; an item's
`act` in `09-field.js`): the first act in the ranked order — the top the
context holds steady — *Draw them clean*, *Line up across*, *read it* for
writing; never a reading as a name, which is a tap on it or `name:`. With
only readings the line says so and Enter names nothing. Typed, it reads a verb the
selection has (`erase`, `dup`, `clean`, `line up`, `play`, `frame`, `read`,
`what` …, by label or alias), a name the library knows (reused, no model
asked), words the verb table reads at a definition, a prefix (`name:`,
`label:`, `ask:`, `draw:`, `page:`, `run:`, `new:`, `what:`), a sum after `=` (*= 24 ÷ 3*, read by core against the page: the line says *24 ÷ 3 = 8* before Enter, and Enter puts it on the board as text — M5), **the words a person says for an act**
(PLAN-FIELD-PAR FP1; core `tools/intents.ts`, one home: *tidy*, *line up*, *connect*, *diagram* find their acts, an act these
marks lack says what it is missing — quietly, Enter does nothing — `?` lists everything, and the board's own acts are reached:
*export*, *find pricing*, *print*, *examples*, *help* — FP8; only from three words or fewer that are or lead with the act's word,
so a sentence stays a brief), **a word or two that names nothing waits** for a pick (FP4, John's decision: no brief, no page),
**by meaning** when the semantic seat is held (D1: once the typing rests, only for words nothing matched, each act's words
embedded once, nothing sent; `nearestIntent`; the line says *by meaning 0.71*), or else, from a sentence, the
brief. Under
the field, laid out as John sketched it (6 Sep): the **core** — four round
buttons at the left, Name · Copy · Paste · Erase, always the same four in
the same slots (a circle with a mark in it; the name is the tooltip and the
reading line while the pointer rests on one); then, stacked to their right,
**what this is** — readings with their numbers (*molecule 0.92*, *“Pricing”
0.92*, *page-layout 0.78 · GLM*, *a pump 0.80 · claude*, *row 0.81*), and tapping one takes it as
the name (another voice's reading is told by its author, never its tier: an MCP
hand joins at tier 0, so `isHeardReading` — not `tier > 0` — lets its `canvas_propose`
in, and `isShapeRungReading` is what the rung itself measured; F1, `session/interpretations.ts`); and **what it affords** — Draw them clean, Line up, Frame these,
Play A, Not a molecule …, ranked by the reading, by use and by what stands
beside them, the rest a keystroke away: each an offer from a registered tool
(see *Tools* and *Context*, below). **A drawing that reads as a diagram says so in *what this is***
(V1-PLAN §3 *Reading*, N1; `notationItem` and `notationsHeld` in `09-palette.js`, `notationWords`
in `09-field.js`): each notation that reads the held marks above `NOTATION_FLOOR`, plural and ranked, in
the person's words — *a flowchart 0.92*, *a class diagram 0.49*, never "UML" — with core's whole sentence
(*three processes, one decision, three flows*) as the tooltip. **A notation is what the marks ARE, not a name**:
it has no `act`, so Enter never takes it (with only such readings held the line says *tap a reading to use it*,
never *as the name*; the item carries `notation`), and a tap on the reading Mermaid can be written from — the
one *Make it Mermaid* is offered for — takes that offer, in that notation; a tap on another says its sentence in the
status line and writes nothing (`mermaidFor` writes the likeliest). It ranks with the other readings by `baseOn`'s
`notation` (0.75 + 0.4c: from the floor up with the firmest concept it is made of, so *a flowchart* leads *flow*,
and under what a model read). The held scope is read **once while the log stands** (`notationsHeld`, keyed by
`logKey()`, shared by the field and the panel; `mm.notationReads()` counts the reads, e2e 67k), only for two marks or
more and no artifact — the Mermaid tool's own rule; a row of boxes, a molecule and writing read as none above the floor, so e2e
49's golden stands. A word typed, or writing read, is offered two ways side by
side — *Name it* and *Write “…” on it* (see *A label*, below), each with a note saying how it differs (*finds more like
it*, *only the words*), and one alone where only one acts or the two would do the same (`wordActs` in `tools/label.ts`;
John, 2 Oct 2026: *if those are the same just show one, if different signal how*). A pill carries a
label; its reason is the tooltip; a pill that asks a model carries a dot.
**The field opens by
the hand and stays whole** (PLAN-USER-SURFACE U1c; `fieldAnchorFor`,
`fieldBox`, `fieldAvoids` in `09-palette.js`): at the last press when it was
on or beside the held marks — a hold now records its press; it used to open
where the stroke before ended, a screen away — else beside the marks on the
hand's side; off the panel and the minimap, at the nearest clear place, and
placed again when a model's readings make it grow over one; a long pill is
cut with an ellipsis inside the field, its tooltip whole. **Once open it stays put** (the UX pass;
`fieldKept` in `09-palette.js`): typing leaves it where it opened, and it is placed again only when its marks
move on screen (a pan, a zoom), when it would leave the screen (a keyboard coming up) or cover the panel or the
minimap. Copy holds the
ink (and puts it on the clipboard as SVG); Paste puts it beside the selection
or, from the keyboard, at the pen. A tap while the field or a selection is up
dismisses it and is never a dot — judged by how far the pointer went **on
screen**, not by how many moves it reported (PLAN-USER-SURFACE W3; `releaseIs`
and `TAP_SLOP_PX` in `07-hand.js`): a click that wobbled a few pixels used to
leave a dot and the field open. The mouse, the pen and a finger that draws
alike; with nothing to dismiss, a dot drawn is a dot, and the dot on an *i*
drawn while the field is open dismisses first. `Demos/surface/05-selection.js`,
`09-palette.js`.

**The reader decides; it no longer acts** (SEAM-1, `Demos/surface/09-field.js`).
What Enter will do is a pure function — `readFieldCommand(ctx)` — of a
**`FieldContext`** record (the text, whether a summon stands and whether it is
over a live artifact, the offers as labels and aliases, the joined models by
name, what the library holds, the definition in the loop and what the verb table
read in the words, whose ink is held — `marks`, how many of the held marks the
person made and who made each of the rest — a thunk for the drawing's genre and one for what a sum comes to)
returning a **`FieldReading`** (`kind`, the `line` shown under the field,
`quiet`, and a **named command** — `take` · `name` · `label` · `ask-what` ·
`ask` · `draw` · `build` · `library` · `behave` · `need-model` · `maths`). Beside it,
`typedWord(ctx)` is as pure: the word a typed text offers to name or label with,
or null. `09-palette.js` is the adapter on both
sides: `fieldContext` gathers, `runFieldCommand` performs, and `readField` keeps
its old shape so nothing else changed. The point is that the field's query can
now be asked questions in Node with no browser, no DOM and no session —
`node --test Demos/surface/09-field.test.mjs`, in CI's `core` job. The genre is
a thunk because reading it costs a pass over the marks and most keystrokes
settle on a verb or a name long before the brief.

**One Enter, one act** (V1-PLAN L2d; `alreadyUnderWay` in `09-palette.js`). A
brief is a deliberate act on one summon, and a summon is acted on once: the
reading's `run` is a closure over the summon, so a pill, a touch or a second
key still held it after the first act had consumed it — on a fresh loop the
second failed at the bless and said *could not hold that group*; on a
revision, with no bless to fail at, it asked every model again. So `runPrompt`
— the one door every brief, program and library reuse comes through — refuses
a second act on the same summon and says *that brief is already under way*. A
guard in the adapter, not the reader: `09-field.js` decides what Enter will
do and is never asked whether it already did. It holds one key (the summon's
id, time and marks, so a counter id reused by a fresh board is a new act) and
lets go when the act is given up on — a failed bless, a failed brief whose
bless was undone. e2e 40 sends two Enters 80 ms apart with the stub delayed.

**A loop that waits is plain ink.** Circle some marks and nothing lights
up: the loop stays ink until the command mark crosses it — **or a
double-tap lands inside it** (`summonHeld`; the way in that needs no mark,
for a hand that finds the check hard to draw apart from an arrow) — and
then it is a gesture: its ink leaves in favour of the selection outline and
handles, and the offers open. (It used to raise a chip beside itself the moment it was
drawn, *N circled · Draw them clean / What could these be?* — an affordance
that fired on every circle whether or not one was meant, and John called it
what it was: a leftover.) The control centre's *snap* tile quietly scopes to
the circled marks while a loop waits, and in `auto` every open offer is taken
after each stroke — including a closed stroke that was a loop-in-waiting
until the next stroke settled it, which the per-stroke version silently
skipped. `session.summonHeld` remains for surfaces that need a button.

**The mark reads BACKWARDS.** Requiring a lasso before the mark can act is a
mode wearing a different hat. The command mark looks back over
`recentWindowMs`: the marks it crossed are what you pointed at, and anything
drawn alongside them just now comes with it. An explicit circle still wins, and
`Summon.scopeSource` (`lasso` / `crossed` / `recent`) plus `scopeReasoning` say
which way it decided, so a wrong guess is visible before you act on it.
**What the mark engages, with no loop** (v10 F3): a mark it crosses; a
*closed* mark — a box, a loop, an artifact's frame, a thing you point at —
it lands inside or close beside, relative to that mark's size; never an
open stroke it merely sits near, because that is every letter of a word
being written, and a letter shaped like the mark summoned the word
mid-sentence. **A taught mark's band widens at most two-and-a-half
floors** (`MAX_WIDEN`): five samples that disagree learned a band so wide
the mark fired on ordinary writing; the teach pane warns below a
consistency of 0.5.

**Gestures are per hand** (V1-PLAN L2h; `handOf` and `Gestures` in
`session.ts`, `session/gesture-hands.test.ts`, e2e 45–46). A loop that
waits, a summon, the selection, why the last stroke missed, the taught
mark and the look-back are each **one hand's**, held under the key its
acts carry — `handOf`, the attribution a bless's maker gets: a person's
act is theirs ("local" in another hand's log already reads as that hand),
and a model's or the engine's is the act of the hand whose log holds it,
so the shard's bless in the engine's name takes up its hand's summon and
a model's loop waits for its hand. Every board keys one hand alike. So a
hand's own next stroke dissolves its summon, and another hand's never
does; its loop waits for its own check or double-tap whatever another
hand draws meanwhile; the look-back grows the scope through its own
recent marks only (what the mark *crosses* may be anyone's); another
hand's loop, summon, selection or dismissal never opens, closes or
changes the reader's. A mark that is erased leaves every hand's gestures,
whoever erased it. The board's `summon`, `selection`, `pendingLassoId`,
`markMiss`, `commandMark` and `recentIds` are its reader's own. **A hand is
a sitting, not a person** (L2i): two tabs of one person draw independently,
so his stroke in one never dissolves his field in the other, and a loop
waiting in one waits for that tab's own check — though either may label
what the other drew (*Live logs*). Two hands
may now hold the same marks at once, and when both bless, each thing
takes them — a mark can be part of two (the same on every board; which
should win is not yet decided).

**Erasing is relational, not gestural** (`src/session/erase.ts`): count
crossings between the stroke and the target's own outline; three erases it. No
speed, density, or size constant to tune, zoom-invariant, and it degrades
honestly — a line drawn *through* a shape crosses twice and is safe. Two rules
keep it safe: a **closed** stroke is never a scratch (it is a lasso), and
scratch targets are **ink**, never artifacts. The surface says when a
scratch was one pass short (*crossed it twice — one more pass erases it*),
so the rule is learned by doing. **A head is not a scratch** (V1-PLAN W1,
`erase.ts`'s header, `scratchHits` in `session.ts`): when every crossing of a
mark falls where the stroke *meets* it — within the barb at one of its ends
(measured on the stroke), at an end that lands on the mark's ink or on a site
the magnet binds, or over an end of that mark — the stroke is arriving, not
rubbing out, and the mark stands. An arrow drawn into a box, or across a
sequence lifeline, used to cross it three times with its two wings and erase
it; every real scratch in the controls still erases exactly what it did.

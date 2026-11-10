# Recognition, clean forms and the maths of a mark

> Part of the engineering reference that `CLAUDE.md` indexes. The code is the truth; this says why it is shaped so.

## Core Data Model

Strokes are arrays of points; a parallel `context` array records what each
stroke is recognized as. Unnamed strokes use placeholder `'art[n]'`.

```javascript
strokes = [[{x, y}, ...], ...]   // raw input (some demos add t, pressure)
context = ['circle', 'line']     // 1:1 with strokes
```

The library stores named items: user primitives (with fingerprints), and
compositions (with components + spatial graph). `basedOn` references make the
library hierarchical.

## Recognition Engine

> **Source of truth: `core/src/recognition.ts` and
> `src/geometry.ts`, with `*.test.ts` beside them.** Exact thresholds are
> deliberately *not* restated here — they used to be, in ten documents, and
> they drifted. Read the code for values; read this for shape. The reasoning
> behind the rules is in `Assets/recognition-strategy.md`.

A stroke is reduced to a **fingerprint** — aspect ratio, straightness, closure,
corner count and angles, **extent**, bounds, size — and detectors read that
fingerprint.

Two properties matter more than any individual number:

**Multi-parse, not winner-take-all.** Every detector that qualifies contributes
a candidate; results are returned ranked by confidence, and nothing wins by
silencing the others (ARCHITECTURE-v6 principle 2). A pentagon is legitimately
*rectangle* and *circle* at once — the caller decides. Detectors today: line,
arc, triangle, rectangle, circle. Each result carries a grounded `reasoning`
string, which is what the "why" inspector surfaces.

**Confidence is measured, never assigned.** Each detector scores continuously
from the evidence, and results rank by that score. The detectors used to carry
fixed confidences with overlapping corner bands, so a 3-corner shape matched
both triangle (0.85) and rectangle (0.80) and the triangle won because 85 > 80.
A tie broken by a constant is not a ranking. **Tier 0 is also capped below
certainty** (`MAX_TIER0_CONFIDENCE`): a flawless circle is exactly what a
letter O looks like, and the cap leaves headroom for a participant with more
context to outrank the engine.

**`extent` — the fraction of its own bounding box a stroke's outline encloses —
is the strongest single discriminator.** Rectangle ~1.0, circle ~0.79, triangle
~0.5. Corner count is fragile (miss one corner and a box becomes a triangle);
extent holds regardless. This is what fixed "rectangles read as triangles".
**The box is the tightest one at any angle** (rotating calipers over the
hull, `tightestBox`), not the axis-aligned bounds: against those, a box tilted ten degrees
filled ~80% and lost its snap offer, and at fifteen read half as a triangle.
A hand rarely draws square to the screen. The same box is a rectangle's clean
form (below), so a diamond — a square turned 45° — is read and redrawn as one.

**An arc is known by its bow, not its straightness** (S1, `bowOf` in
geometry.ts, `evenBowOf` in recognition.ts). Straightness — chord over path
— is nearly blind to a bow: a 90° arc still scores 0.90 and a 30° one 0.99,
so every arc under a half circle read as a line (a 140° arc was *line 0.63*).
The bulge off the chord is not: it means a sweep (4·atan(2·bulge/chord)). A
stroke **bows evenly** when it sweeps like an arc, its bulge is past what a
hand's straight line bows **on screen** (a fixed-pixel rule about the hand,
so it takes the scale), each half bows off its own chord as an arc's halves
do (a bend's straight arms do not), it stays near the circle through its
ends and bulge (a hook, a J, an S do not), and it turns no corners. That
evidence lifts the arc and **the line gives way exactly as far**; measured
on the denoised path, so a slow, wobbly straight line stays a line. The
constants are `ARC_SWEEP`, `ARC_BULGE_PX`, `ARC_EVEN`, `ARC_RESIDUAL`.

**The shape rung is closed: eight entries.** `line`, `arc`, `triangle`,
`rectangle`, `circle`, and — because the rung above cannot do without them —
`arrow` (a straight shaft with a barb that **draws back on it** — a wing
turning past ninety degrees and at least a sixteenth of the stroke long;
the hook a pen leaves at liftoff is neither, and used to make every tall
*l* an arrow 0.6 — v10 F2 — and a barb **short against its shaft**, its
reach from the tip over the shaft's length, or a flick in the hand's space
whatever the shaft: an L is two arms, and each L of a box drawn in two
strokes used to be *arrow 0.59*. Its length, never its angle, is the
discriminator — S1, `BARB_OF_SHAFT`, `BARB_FLICK_PX` — and the reading says
it: *the barb 0.13 of the shaft*. **Where its ink points** (S2): the tip
the rung keeps is the stroke's own point the pen first reached farthest
along the shaft, coming from the tail (`inkTipIndex` / `arrowTipIndex` in
`geometry.ts`, the one home — `diagram/heads.ts` and `session/erase.ts` find
that same point again), not the corner where the head first turned, which
sat a wing's length short. And **a head that is a sliver of a long stroke**
is read at the hand's own scale (`readHead`, `headSeenOf`): the corner
detector's window is a fraction of the path, so a hand-sized head on a
shaft of a thousand pixels turned no corner and the stroke was a line
alone. There the barb is a flick of at least `BARB_MIN_PX` that turns past
`BARB_TURN` on a straight shaft — a liftoff hook, which bends on ahead or
aside, and an L are neither — and the line gives way exactly as far. An
arrow the corners see (its head at least `HEAD_SHARE_SEEN` of the path)
keeps their reading to the digit),
`text` (writing, *without reading it*: open, turns many times, low and wide,
mostly-empty box — enough to make a mark a `label`), and `dot`. **Below the
hand's resolution (`HAND_RESOLUTION_PX`) only `dot` is offered**: a 5px blob has
no measurable geometry, and reporting "circle 0.85" for it would be sensor noise
dressed as evidence. A detector may return `meta` beyond its label — an arrow's
tip, tail and barb — which the session keeps as a `reading:<type>` rep so the rungs
above can read direction as a fact.

**Size-relative closure** (key innovation): a stroke closes if the start–end
gap is under a fixed pixel threshold **or** under a fraction of the stroke's
size — small shapes need tight closure, large shapes tolerate bigger gaps. The
same size-relative logic guards overshoot detection, so short strokes don't all
read as circles. Both live in `isStrokeClosed` / `checkOvershoot`.

**The fixed term is bounded by the stroke's own size**, or it inverts the rule
above at the small end: an unbounded `gap < 50px` called a 45px-wide caret with
45px between its ends *closed*, which is what broke the learned command mark.

**Everything is measured along the PATH, not along the point array.** Corner
detection resamples to uniform arc length, wraps closed strokes so the seam is
scanned, and suppresses neighbours in arc-length space. In index space the same
rectangle returned 1, 2 or 3 corners purely as a function of drawing speed, and
never 4 — a corner where the stroke starts and ends was structurally invisible,
which is exactly what you get drawing a box from a corner. Same principle in
`calculateStraightness`, which measures on a **denoised, simplified** path:
raw path length grows with the device's report rate, so a straight line with
realistic ±1px sensor noise scored 0.99 slowly and 0.30 quickly, and read as an
arc. `denoise()` sizes its filter in arc length, so it removes the same physical
wobble at any sample rate.

**Fixed pixel thresholds are about the HAND, not the world.** On an infinite
canvas the surface feeds world coordinates (so the grammar survives zoom), and
that silently makes every fixed-pixel rule zoom-dependent — the same check reads
open at 1× and closed at 1.7×. `getFingerprint(points, scale)` and
`analyzeStroke(points, scale)` take world-units-per-screen-pixel (1/zoom), and
the scale is logged with each stroke so replay is deterministic. **Surfaces with
a viewport must pass it.** See MVP.md §7.

**Corner suppression is bounded by the stroke's short side.** Non-maximum
suppression along the path uses a fixed fraction of its length, and on a 5:1
banner each short side is 8% of the perimeter — a wider window ate one corner
at each end, and the most common box in any interface came back with two
corners and a rectangle score in the 0.6s. `countCorners` caps the window at a
fraction of the short side, so it can never straddle a whole one.

**Library matching** is a weighted fingerprint comparison (straightness,
aspect, corners, closure, size) with a straightness veto — see
`matchPrimitiveFromLibrary`.

**A named group's signature is structural** (`session/signature.ts`): the
bag of shapes *and* the bag of links between them — every engaging relation
the canvas can see, keyed by the shapes at each end — so a circle with two
lines inside it and a circle with two lines crossing it are different things
to name, which a histogram could not tell apart. Matches rank plurally above
a floor with their reasoning; the `correct` event (*Not a …* in the palette)
adds a group's signature to the definition's rejected or accepted examples, so
a wrong match is corrected once and stays corrected. The engine never learns
what a definition is called.

## The maths of a mark

> `core/src/session/measure.ts` — `measure(node, nodes, board?)`, `describeMaths`.

What follows from a reading, as numbers: a circle's centre, radius,
circumference and area; a rectangle's sides — at whatever angle it stands,
never its upright bounds, width the side nearer level — perimeter and area,
and a leaning box's lean (D2); a line's
length and heading; an arrow's direction; a triangle's angles (acute / right /
obtuse) and sides; an arc's radius and sweep. Measured from the clean form the
mark carries or would be offered, so it is the maths of the *shape*, not of the
wobble. It is arithmetic on a reading, not a reading — no confidence and no
candidates — and writing has none. The inspector shows it as *the maths*; it is
the one thing the 2025 prototype did that the engine had dropped.

**Maths on a page** (`core/src/maths/`; `MATHS-PLAN.md`, units M1
and M2 of `DIRECTOR-PLAN-W2.md`). `quantity.ts` holds a number as the hand
writes it — a value or a range, a unit or none, exact or approximate — with
interval arithmetic that converts units and says so. `expr.ts` is a grammar
written by hand, no `eval`, in which **a handwritten `=` chain is a running
total, not an equation** (`A ÷ 3 = 12 + 2 = 14`: A ÷ 3 is 12, then 12 + 2 is
14), a chain may restate its formula with the numbers put in (`① ÷ 2 = 14 ÷
2 = 7`), and a line that reads two ways returns both, ranked with reasons — a
dash between numbers as a range or a minus, precedence or left to right —
settled by a worked line that has one's form. `sheet.ts` reads plain lines as
definitions, steps, headings (an *Add …* heading is an allowance, read both
ways), labels and checks; it is a pure function of its lines, so a changed
measurement re-derives exactly what depends on it (`diffSheets`), and
`gather.ts` collects the lines from text artifacts and read writing without
touching the session. Tier 1: no model computes a number. **Prose is not maths**
(F2, `proseToNotes` in `sheet.ts`): the grammar reads a colon as `=`, a dash as a
minus and a run of words as a name, so a note (*Draw a box: then an arrow - and it
reads*, a numbered list of steps in words) parsed as a check or a step whose operands
were words, and stood a `?` at rest. A line is maths only when it looks like it — no
operator has two words for its operands, a line with no label needs an operator and
every name in it defined on the page, a labelled one (`1. Waist ÷ 4`, the person's
word that this is a step) may name what the page lacks, and a line typed after `=`
(`{ text, maths: true }`) is read whatever it says, so *Waist is not on this sheet*
is still said. What fails is a `note`, in no step, check or chip (e2e 64h).

**Dimensions and solving** (M3a, M4). `maths/dimension.ts` offers a number
beside a mark as one of its measures, ranked by its distance to a side's
middle *relative to the side's length* and by how squarely it sits across,
with the reason and the runner-up; a number inside a closed mark is a piece
label, a small square in a corner declares it right, a short line under a
number that reaches nothing is its underline, and `sheetLines` leaves every
number on a mark out of the page (`maths/writing.ts` reads the board's words
once for both). The **figure** the solver works on — corners, sides and the
marks that drew them — is filled by one closed stroke (`figureOfMark`; a
box drawn leaning, whose clean form keeps its `lean`, is a quadrilateral,
never a rectangle, whose rules assume right corners) and, for lines
meeting, by `polygonFigure`. Each drawing gets a unit (its labels',
else the page's) and a scale that says how consistently its labels agree
with the ink (`TO_SCALE_WITHIN`). `maths/solve.ts` works **one figure at a
time, in closed form** — triangle, rectangle, circle, arc, parts summing to
their whole — every derived value with its formula, and **an
over-determined figure keeps every consistent reading and says what cannot
hold and by how much** (*labelled 24; legs of 24 and 8 make it 25.30, 1.30
longer (5%)*). A declared square is never dropped; a corner the ink measures
right is only a reading (`RIGHT_ANGLE_TOLERANCE` in `measure.ts`); what the
labels leave open is offered at the scale as the ink's. `solveBoard(state)`
does the board (and checks a step's value on an edge with `checkWritten`);
`measure(node, nodes, board)` speaks the drawing's unit for a mark with
labels and is unchanged for one without.

**True size and print** (M7). `maths/truesize.ts` draws solved figures at
their real size as **a new SVG built from the numbers, never from the ink**
— the root in paper units (`width="24.5in"`), the viewBox in the drawing's
unit, each figure from the solver's first reading squared to the page,
labels as written and a derived length a place finer than they were
written — and `maths/print.ts` tiles it onto Letter or A4 at 100%, with
overlap and ⊕ marks both neighbours print, grid labels, a map, and **a
measured test square (1 in, or 2 cm) on every page**, because a printer
scales without saying so.

**The maths on the board** (M5, 29 Sep 2026; `maths/board.ts`,
`tools/maths.ts`, `Demos/surface/25-maths.js`; e2e 64–64g). Core decides what
is said of the numbers and where, as data a surface only draws: `boardMaths`
(`boardMathsOf` keeps it while the log stands), `mathsChips`, `mathsSaid` for
the panel, `evaluateTyped` for `=`. **Beside their figure, never on an answer
card** (the 15 Sep notes, §6): a derived side is a chip outside the figure
where a label would stand (`25.30″` beside the long side, standing just clear
of the line by the chip's own size — `from`/`away`), a label that cannot hold
says the solver's own sentence right of the number it is about, a step's
check stands at the right of its own line (*✓ 14″*, *✗ 14.67″ · written 12*,
*✓ 48″ · or 46″* — plural, with the other reading said). **The ghost rule
holds** (v10 F4): an answer shows for a moment after it changes
(`MATHS_MS`), while the hand points at its marks or holds them, and while
*Show the sizes* was asked (until what it says changes); **a problem stands
at rest** — a label that cannot hold, a written result that is off, a step
with no value — because colour is signal and a disagreement is worth a look.
The panel says it always: plain lines (*legs of 24 and 8 make the long side
25.30*), every value's formula and the drawing's scale behind **details**, and
`measure` speaks the drawing's unit. **Change flows, the ink stays:** a
measurement edited as text re-derives exactly the chips that depend on it
(`diffSheets` is the oracle) and undo takes them back. On a page that flows
(more than `TEXT_FITS_LINES` lines) a step's chip is placed from the frame's own
document, on its line just past its words (`mathsLineBox`); a fitted text is
evenly spaced, as `sheetLines` divides it. **Only the ink beside a number is
read for figures** (`drawingsBeside`): the dimensions and the solver walk every
figure against every other, and on PERF.md's 2,000-mark board with one number
that was 2.1 s a stroke; a number's figure stands beside it (within
`ATTACH_REACH` of the mark's own size, then the drawings it hangs with by
within-reach links), which took it to 4–10 ms — and means what the maths says
of a drawing never depends on what else is on the board. `=` in the field is a
sum read against the page's own definitions (`= A ÷ 3`; `ctx.maths`, a thunk, so
`09-field.js` still names nothing outside itself) with its result said before
Enter, and Enter stands the words on the board as text beside the marks held —
one act, one undo (`mathsWrite`). The export pane has a row of its own,
*true-size.svg* and *print.html* (Letter, or A4 for a metric drawing), waiting
with its reason until a figure has numbers and a unit.

## Clean forms: a confident reading, redrawn

> `core/src/session/clean.ts` — `snapReading`, `idealize`,
> `session.snap()`, `session.snapCandidates()`.

The shape rung says "rectangle 0.86"; the canvas can draw that rectangle. A
snapped mark gains a `'clean'` rep beside its ink — the same shape as tidy's
`'transform'` — and the surface draws the clean form in front with the hand's
ink faint beneath it. **Ink is never replaced**; undo drops the rep. Three rules:

- **Confident AND unambiguous.** `SNAP_CONFIDENCE` floors the top Tier 0
  reading and `SNAP_MARGIN` requires it to lead the next; a pentagon that is
  rectangle 0.44 / circle 0.43 is never redrawn as either, because that would
  silently settle an argument the engine deliberately holds open. Only the
  engine's own reading counts — a model calling a box "a card" is a claim about
  meaning, not geometry.
- **Built from the ink's own measurements**, never a template: the three
  sharpest corners, the arrow's tip, tail and barb, the arc's bulge. A slight
  oval stays an oval. `text` has no clean form — handwriting redrawn as a box
  is a lie about what was written.
- **A box keeps its angle** (S1): its clean form is its tightest box at any
  angle, so a diamond is redrawn as a diamond — as its upright bounds it was
  a flowchart's decision turned into a process. Square to the screen within
  the hand's wobble (`SQUARE_UP_DEG`) it is squared up to the bounds the ink
  fills, exactly as before, when those hold it tightly (`BOUNDS_SLACK`), and
  at its own size when they would grow it. **And its lean** (D2): a box
  whose sides lean past `LEAN_KEPT_DEG`, parallel in pairs
  (`LEAN_PARALLEL_DEG`), is redrawn as the parallelogram it was drawn as —
  each side fitted along the ink (`leaningBox`), the tightest such
  parallelogram holding the ink — so a flowchart's data symbol stays data;
  as its upright box it was a process. **A bend is not a line**: a line
  is offered only when its ink stands off the straight line through its ends
  no further than a hand's line bows — half of a two-stroke diamond,
  straightened, made the decision a triangle. **An arrow keeps its barb**,
  at most a fifth of its shaft, so its clean form reads back as an arrow.
- **Zero wrong snaps over the whole corpus** is pinned in `clean.bench.test.ts`,
  alongside ≥95% offered for every drawable shape and 0% for writing — and,
  since S1, turned boxes (every one drawn clean at its own angle), arcs of
  30°–300°, and **every clean form, drawn again as ink, reads as the shape it
  cleans**. The flowchart bench draws every board clean and reads it again:
  every decision stays a decision, and every data symbol stays data.

In the surface the offer is a dashed ghost under a qualifying mark **for a
moment, not forever** (v10 F4): the mark just drawn, for a few seconds,
and whatever is hovered or held — the offer itself stands in the snap tile
and the panel, the dashes do not stick to every mark that reads clean. The
rail's *Snap N* button, the palette's *Draw them clean* (Tier 0, and the
summon stays open so the next offer is taken from the cleaned marks) and
the inspector's *draw it clean* take it up. `snap · offer / auto / off` is a device preference;
*auto* takes the offer as you draw, never for a stroke the grammar is still
deciding about. A held lasso is never offered.

## Spatial Graph — retired

The old spatial graph (`spatial.ts`, with its fixed 50px "touching") is gone.
`src/relate/relations.ts` is the one relation system: the session records the
measured, scale-free relations of marks within reach of each other on the node
graph (found through `relate/grid.ts`), clusters over them, and infers
wires (`connects`, plus `points-from`/`points-to` for arrows) with a tolerance
relative to the target's own size. Legacy copies still exist for reference in
`Web App Skeleton/src/core/spatial.ts` and `doodle2-canvas.html`.

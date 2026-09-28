# The canvas does maths — a plan

*26 September 2026. What two pages of garment drafting and one question
about a right triangle ask of this medium; what maths means on a canvas whose
every reading is plural and grounded; what the engine does today and the
pieces it lacks; where a middle layer of small judging models fits; and the
demo that proves it. The build order and each unit's checks are in
`DIRECTOR-PLAN-W2.md`.*

Read with `CLAUDE.md` (*The maths of a mark*, handwriting, text folds back),
`DIRECTOR-VIEW-2026-09-17.md` §3 (a decision seat) and `SURFACE-v10-PLAN.md`
§6 (a handwriting model as a participant).

---

## 1. The question and the pages

John's question: *a right triangle with legs of 24 and 8 — how close is its
long side to 24?* It is **25.3**: √(24² + 8²) = √640 = 25.30, which is 1.3
longer, about five percent. The sharp angle is 18.4°. Read the other way —
24 on the long side and 8 on a leg — the other leg is 22.6.

It came from two notebook pages of garment drafting, an apron dress and a
Viking-era dress, shared with this plan and **kept out of the repository**,
because they carry one person's body measurements. They are the best
specification this medium has had since the canonical loop, because every
part of them is a drawing that is also a calculation:

- **A measurement table.** Lettered and named — *A. Bust*, *B. Top to
  waist*, *C. Top to bottom* — each with a number.
- **A numbered list of steps**, each a formula over the table, worked by hand
  to an underlined result: *1. A ÷ 3*, plus two inches of seam allowance.
  Step 2 refers to step 1 by a circled *1*. One step on the second page holds
  a range, *fist + 2–4″*, and the drafter chose a value from it.
- **A drawing that is a cutting layout.** A rectangle of fabric divided into
  pieces; each edge carries the step it comes from and its value (*1. 15″*);
  braces span the whole width and the whole length; a double arrow carries
  one length.
- **One step read two ways.** *(C × 2) − B* gives one value from the raw
  measurements and another once seam allowance is added to both, and the
  brace beside the layout carries both as a range. The drafter kept the
  ambiguity rather than settle it.
- **Parts that make a whole.** On the second page the fabric's width is the
  sum of its two columns.
- **A right triangle with all three sides labelled**, 24 and 8 on the legs
  and 24 again on the long side, with the right angle declared by a small
  square in its corner. That is John's question: the third label cannot hold.

What the drafter does by hand that a medium should carry: check the
arithmetic; carry a changed measurement to every step (another person's
measurements are a whole re-draft today); solve the triangle; check that
parts add to their whole; keep a range a range until a value is chosen; keep
two readings of an ambiguous step side by side; and, one day, print the piece
at full size.

## 2. What the engine does today

`session/measure.ts` — the tier 1 module *the maths* — measures one mark from
its clean form: a circle's radius, circumference and area; a rectangle's
sides, perimeter and area; a line's length and heading; an arc's radius and
sweep; a triangle's three angles, each classed acute, right or obtuse, its
sides and its area. The inspector shows it (`Demos/surface/10-inspector.js`).
Drawn as one closed stroke with its legs in the ratio 24 : 8, the engine reads
a triangle and reports angles of 18°, 90° (right) and 72°, and sides of 240,
76 and 252 px (run on `master` on 26 September through the committed Node
bundle).

What it lacks, in the order the pages need it:

1. **Units.** Every measure is `px`. Nothing in core parses a number, a unit
   or an expression.
2. **A number attached to a mark.** Handwriting is read into transcripts and
   the diagram rung knows a `label` role, but nothing says *this 24 is the
   length of that side*.
3. **Solving.** Measures are of the ink. Nothing derives a side from two
   others or says that two labels disagree.
4. **Figures of several strokes.** A triangle drawn as three ruled lines is
   three lines; a cutting layout is lines meeting and crossing. The maths is
   per mark.
5. **Formulas and names.** No step, no reference, no check of a written
   result.
6. **Change.** Nothing re-derives, because nothing is derived.

## 3. What maths means here — six rules

1. **A number is a reading.** It comes from writing (a transcript), typed
   text, or a label a hand puts on its own ink. Where it attaches — which
   mark, which side, which step — is a reading with a reason and a
   confidence, and there may be several. The log holds the writing and the
   human's corrections; every derived value is derived state, a pure function
   of the log. Nothing the engine computes is written into the log or the ink.
2. **Labels rule the thing; the ink rules the topology.** A sketch is not to
   scale. A labelled length is the truth about the thing drawn; the ink says
   which sides meet and which angle is right, and supplies a fallback —
   *drawn to scale this would be 25.2″* — shown as the ink's, never as the
   thing's.
3. **Plural, with the disagreement said.** Too many labels: every consistent
   reading, with the size of each conflict (*labelled 24; legs of 24 and 8
   make it 25.3, 1.3 longer*). A step that reads two ways: both results, each
   with its reading. Nothing is settled by silencing the other.
4. **Tier 1 does the arithmetic.** No model computes a number, ever. A model
   or a seat may read a digit or choose an attachment; the value that follows
   is the engine's, with its formula as the reason (*√(24² + 8²) = 25.30*).
5. **Units are the hand's.** ″ and ′, in, cm, mm, ft. A bare number takes the
   unit its drawing speaks; mixed units convert and say so. A range stays a
   range — interval arithmetic — until a value is chosen, and *~41″* stays
   approximate.
6. **Change flows, and the ink stays.** A measurement struck and rewritten
   (text folds back, v10 F12) or edited as text re-derives every step, label
   and solved side; undo walks back. The ink is never moved to fit a number.
   A drawing to scale is a new artifact beside it.

## 4. The pieces

**Core: a new directory, `metamedium-core/src/maths/`** — pure, zero
dependencies, tested — reached through the tier 1 module `measure`, which
grows rather than a new one being added.

| Module | Does |
|---|---|
| `quantity.ts` | A value or an interval, a unit, exact or approximate. Parses *24″*, *7.5*, *2–4″*, *~41″*, *½*, *39 in*; converts; formats |
| `expr.ts` | A small grammar — numbers with units, names (*A*, *Bust*, *Top to waist*), step references (*①*, *(1)*, *step 1*), + − × ÷ and their typed forms, parentheses, ranges — evaluated over intervals. An `=` chain is a check (*13 + 2 = 15* ✓). No `eval`. A line that parses two ways returns both |
| `sheet.ts` | Lines of writing or text become definitions, steps and checks. References resolve by letter, number or name; evaluation runs in dependency order; a cycle or an unknown name is a reading that says so |
| `dimension.ts` | A number attached to a measure of a mark — a line's length, a side of a triangle or rectangle, a radius, a span marked by a brace or a double arrow — ranked by where it sits (beside the middle of that side, along it) with the reason. A number inside a closed piece is a piece label. The scale of a drawing, and how consistently its labels agree with it |
| `solve.ts` | Figure by figure, never a general constraint solver: a right triangle from two sides; any triangle from three facts (SSS, SAS, ASA); a rectangle's diagonal; a circle from any one of radius, diameter, circumference or area (a circle skirt's radius is its waist over 2π); an arc from chord and rise; parts along one edge summing to the whole. Every derived value carries its formula; an over-determined figure returns its conflicts |
| `figure.ts` | Lines whose ends meet read as one figure — three as a triangle, four as a quadrilateral — from the ends the magnets already bind (`bound-to`, BIND-1) or that measure as touching. A small square in a corner is a declared right angle |

`measure.ts` gains units and a list of what was derived, and `describeMaths`
speaks in them. The HERE paragraph in `participants/agent.ts` gains one
clause: numbers are computed by the canvas, never by the model.

**The surface.**

- Beside a figure: a derived side as a quiet label in the drawing's unit,
  attributed to the engine; a conflict as a chip carrying both numbers; a
  scale chip — *1″ ≈ 10 px, to scale within 4%*, or *not to scale; the labels
  rule*.
- Beside a step: its result as a chip — *✓ 22.5*, or the computed value
  against the written one, with both readings on a tap.
- The panel's *maths* section in units, every derived value with its formula.
- The field: an `=` prefix evaluates as it is typed (*=(39+6)/2* shows *22.5*
  before Enter, and Enter stands it on the board as live text); with a side
  selected, *24in* makes it that side's length; *hypotenuse?* answers.
- Later: a range in a step offers *make it a slider* — the drawn slider (v8
  WP-10) feeding the step, everything re-deriving while it is dragged; *draw
  it to scale* makes an `svg` artifact at true size; *print at full size*
  tiles it onto pages.

**Status, 26 Sep 2026: M1 and M2 built** (branch `w2-maths`; red `cf10608`,
`07b6efc`; built `2bd9426`, `f3fe88e`, `6bc8ba1`). In `src/maths/`:
`quantity.ts` — a value or a range, a unit (″ ′ in cm mm ft m, or none),
exact or approximate, and how precisely it was written; converts and says
so; interval arithmetic; a written result checked against a computed one
(ok, rounded, within, off with both numbers, or unknown). `expr.ts` — the
grammar written by hand, no `eval`; a line splits at `=`, at a result
written beside its formula and at a worked line's gap; each later segment
is read as the formula restated or as a running total and the arithmetic
chooses, the computed value flowing on; the three plural lines are ranked
with reasons, and a worked line one reading restates is checked against
the others (*Chest + 6″ ÷ 2* by precedence is 39″ against the written
21″). `sheet.ts` — definitions, steps, headings, labels, values, checks and
worked lines; an *Add …* heading is an allowance (the apron's 2″, as steps
1 and 3 add it), read both ways on any step that does not add it itself,
which is how *4. C 48* checks and *(C × 2) − B* is 72 or 74; cycles,
unknown names and missing steps said; `diffSheets`, `dependentsOf`,
`checkWritten`, `describeSheet`. `gather.ts` — `sheetLines(state)` from
text artifacts and read writing, changing nothing. Fixtures `apron.sample`,
`tunic.sample`, `triangle`, sample numbers only. 94 tests in four files
(quantity 26, expr 31, sheet 28, gather 9); core 767 in 61 files (673 in
57). Change the bust: A from 36 to 38 re-derives A, 1, 2 and 5 and nothing
else, and undo restores them. Not yet: `measure.ts` in units, the HERE
clause, and the `maths` tool, which waits for B1's registry.

**Status, 27 Sep 2026: M3a and M4 built** (branch `w2-maths`; red `084f8de`,
`a165ba1`, `e2d4fc4`, `4b8181d`, `7f2c812`, `9d572dc`; built `b41a302`,
`3b66234`, `b350704`, `496f677`, `374860a`, `2050132`). `dimension.ts` —
the **figure** the solver works on (corners, sides with the marks that drew
each, the ink's angles, an outline), filled by one closed stroke from its
clean form (`figureOfMark`) and by `polygonFigure`, the adapter E3's lines
meeting will fill. A number — a one-line text artifact or a phrase of read
writing, parsed by M1 (`readNumber`: bare, with a unit, a range, named as
*r*, *⌀*, a girth such as *waist*, *area* or *rise*, a step's value
*1. 15″*, an angle *40°*) — is offered as a side, a part of a side, a
circle's radius or diameter or an arc's chord, ranked by its distance to
that side's middle relative to the side's length and by how squarely it
sits across (a closed figure's side is seen only from outside it), with the
reason and the runner-up; a bare number beside a circle is radius and
diameter tied, and says so. Inside a closed mark it is a piece label. A
small square in a corner — an L or a closed square, measured in the
corner's own frame, an arc across it refused — declares the corner right
and is not a figure. The underline: a short line under a number that
reaches no other mark is the number's; one whose ends reach marks spans
something, and the number is its length. Other marks' ends, crossings and
corners divide a side into parts. Drawings are clustered by `relations.ts`;
each takes a unit (the one its labels write, else the page's) and a scale
— the median units per canvas unit, one label per number — that says *to
scale within N%* (`TO_SCALE_WITHIN`), *not to scale; the labels rule*, or
*one label sets the scale*. `writing.ts` reads the board's words once for
the sheet and the dimensions, and `sheetLines` leaves every number on a
mark out of the page. `solve.ts` — one figure at a time, in closed form: a
triangle from three facts (SSS, SAS, ASA, AAS, SSA with both triangles), a
rectangle from two of width, height, diagonal, area and perimeter, a circle
from any one of four, an arc from two of chord, rise, radius and length,
lines and quadrilaterals side by side, parts summing to their whole and a
missing part derived, ranges evaluated at the corners of their inputs.
Readings are the sets of labels that hold together, ranked by labels kept,
conflicts, assumptions, the size of the disagreement and last the ink's
proportions. A declared square is never dropped; a corner the ink measures
right is offered only as *if the corner at C is right*, citing
`RIGHT_ANGLE_TOLERANCE`, now one exported constant in `measure.ts`; what
the labels leave open is offered at the drawing's scale as the ink's.
`solveBoard` reads the page once — the unit bare labels take — and checks
every step's value on an edge against its step with `checkWritten`.
`measure(node, nodes, board)` adds the unit, the values with their
formulas, the conflicts, the other readings, the checks, the ink's offers,
the scale and notes for a mark that carries labels, and returns a mark that
carries none exactly as before; `describeMaths` says them ahead of the px
measures. The triangle, verbatim: *legs of 24 and 8 make the long side
25.30″* (`√(24² + 8²)`); *labelled 24; legs of 24 and 8 make it 25.30, 1.30
longer (5%)*; *or 24 on the long side and a leg of 8 make the other leg
22.63″*; *the three labels hold together only if the corner at C is
80.41°, not the right angle its square declares*. 139 maths tests in six
files (dimension 21, solve 24), measure 10; core 815 in 63 files (767 in
61). Found on the way: the shape rung reads a shallow arc (140°) as a line
0.63, so only arcs it reads as arcs are figures. Not yet: braces and double
arrows as spans; figures of several strokes (E3's, through
`polygonFigure`); an oval; the decision seat for a flat attachment (J1); the
surface (M5).

**Status, 27 Sep 2026: M7 (core) built — true size and print** (branch
`w2-maths`; red `cb00056`; built `b805358`, `f4a9bcf`). `truesize.ts` —
`trueSize(board)` draws solved figures at their real size as a **new SVG
document built from the numbers, never from the ink**: the root is paper
(`width="24.5in"`, or cm or mm) and the viewBox is in the drawing's unit,
so 24″ prints as twenty-four inches. Each figure is drawn from the solver's
first reading — a triangle from its three sides, a rectangle from its width
and height, a circle from its radius, an arc from its chord and rise, a line
from its length — squared to the page on the side the ink draws nearest
level or plumb, its corners going round the way the ink's do, which is all
the ink supplies. Labels are set as written; a derived length a place finer
than the finest label on its figure (24 and 8 make *25.3″*, eighths make
sixteenths), so it agrees with a ruler and claims no more than was written;
coordinates are written to a fixed resolution finer than a printer's dot
(`COORD_PLACES`), so the same figures give the same bytes. Labels that
conflict are drawn from the first reading, the title says so (*drawn from
the first of 2 readings: its labels conflict*) and the side carries *25.3″
(labelled 24)*; a figure its labels do not fix — a quadrilateral's sides
alone, a rectangle with one side, a range, a bare number — is left out and
listed. Figures stand apart in a row, because they were solved apart; a
scale bar closes the page. `print.ts` — `printTiled(doc, { paper,
orientation })` tiles the pieces with their labels onto Letter or A4: each
page an SVG the sheet's size, the drawing placed by one transform and
clipped; neighbours share ½ in (1 cm for a metric drawing), with a dashed
line and a ⊕ labelled *A1|A2* printed identically on both; a grid label, a
map, and a **test square of exactly 1 in (2 cm for a metric drawing) with
the sentence to measure it before cutting** on every page; and one HTML
document that prints them one per sheet at 100%. The 22″ × 56″ piece on
Letter: ½ in margins and a 1.3 in footer leave 7.5 × 8.7 in a page,
advancing 7 × 8.2, so 22.5 × 56.8 in of piece and labels take 4 across and
7 down — 28 pages; headless Chromium printed the HTML as 28 PDF pages of
612 × 792 pt with the square exactly 1 in. 29 tests (truesize 18, print 11);
maths 168 in 8 files; core 844 in 65 (815 in 63). Not yet: the surface
(M5's *draw it to scale* and the export pane); several figures assembled
into one piece, which would mean solving them together; grain lines, notches
and seam allowance (M6); leaving out a page with nothing on it.

## 5. The middle layer — seats that judge

TypeSafe's own guidance for Jev is the pattern this engine already follows:
find the candidates in code, then use a judgment to *select* one, never to
generate (its pre-parsed value-extraction cookbook). The engine already ranks
candidates for every reading it makes. The middle layer is small models that
choose among those candidates or pull typed spans out of prose, in the
engine's own currency — a value with a probability — fast enough to ask
without a spinner. They never write, never compute and never commit.

| Seat | Model | Its jobs in this push |
|---|---|---|
| `decide` | Jev (hosted, early access), or any classifier behind the same transport. Built as week 1's U4 | *Which side does this 24 label?* when the geometry is flat. *Is this number a length, a piece label or a step number?* *Which measurement does "Chest" mean?*, over the sheet's names. *Which unit?* *Which of two conflicting labels is the drafter keeping?* Each is a Choice over the engine's candidates plus *none*; its reason is the question and the distribution |
| `extract` | GLiNER2, local: ONNX in the browser on WebGPU, or a small Node process | Typed spans from prose — measurement names, quantities and units, garment and part names — from a brief typed in words (*an apron dress, bust 36, top to waist 20*) and for the shard's part naming, as candidates for `decide` and for the sheet |
| `read` | A taught numeral reader at tier 1, or a small OCR model as a seat | Digits and the dozen signs of arithmetic from ink, quickly. John asked for something faster than the smallest seeing model for text |

Three rules keep the layer honest.

- **The arithmetic grounds the reader.** A line read as *13 + 2 = 15* is
  confirmed by the maths. One read as *13 + 2 = 16* is a doubtful reading
  before it is a wrong sum, and a second reading is asked for before the
  canvas tells the drafter the arithmetic is off.
- **A seat is a transport, never a dependency.** An injectable transport (the
  `bridge.ts` pattern, as U4 built it), a fake in the tests, fixtures from the
  pages, and a measurement on those fixtures before a seat touches a live
  board. Keys stay on the device, and the gate cannot reach a vendor.
- **Thresholds are measured, not borrowed.** TypeSafe suggests acting above
  0.9, confirming between 0.5 and 0.9 and handing to a person below that.
  Here *acting* only ever means holding a reading, and the numbers are set on
  the fixtures.

**The reader, in particular.** The shape rung is a closed vocabulary read from
measurement, and the command mark is learned from five samples by scale-free
features. Digits and arithmetic signs are a closed vocabulary of about twenty,
and a point-cloud recognizer taught from the drafter's own samples reads them
at once with no model — the command mark's mechanism scaled up to a keypad.
Two things make it hard: glyphs of several strokes (*4*, *5*, *+*, *=*, *÷*)
must be grouped before they are read, and *1*, *7* and *l* differ only by
habit. It is an experiment with a benchmark gate like
`commandmark.bench.test.ts` — high acceptance on John's own digits and no
false fires across the drawing corpus — or it does not ship.

## 6. The demo: change the bust

A pattern page on the board — drawn by hand, redrawn by the MCP hand from the
photograph, or traced from it (`image/trace.ts`) — with sample measurements.
The steps are read and checked, the layout's labels bind to its edges, and
the right triangle's long side says 25.3 beside its conflict with the written
24. Then the bust is struck and rewritten, and every step, label and solved
side re-derives. The thirty-second version is the triangle alone.

## 7. What this is not

Not a computer algebra system: arithmetic, units and intervals, nothing
symbolic. Not CAD: figures are solved one at a time and edges summed, with no
general geometric constraint solver. Not a spreadsheet: the sheet is lines of
writing, read where they stand. No model does arithmetic. The ink is never
moved to agree with a number.

## 8. Open, and John's to decide

1. Whether the real pages may become fixtures. They carry one person's
   measurements, so the default is the same formulas with sample numbers.
2. Inches alone at first, or inches and centimetres from the start.
3. Whether a derived side shows by default or only for a moment and on hover.
   The ghost rule (v10 F4) argues for the second.
4. Whether *print at full size* is in this push or the next.

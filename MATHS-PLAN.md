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

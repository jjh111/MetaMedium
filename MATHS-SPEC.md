# dyna.ink maths — draw the maths, and the maths draws back

*8 October 2026. Written on `maths/wave-1` from the hand-over of the same day
(`HANDOFF-MATHS-2026-10-08.md`), with John's answers to its open questions
folded in (§11). **Status: wave 1 is being built** — each unit's dated status
line stands under its heading in §8. Paths are as they stand after the rename:
`core/` is the engine, `Demos/surface/` the reference surface.*

*Read with: `MATHS-PLAN.md` (the first push, M1–M7, built), `V1-SPEC.md` (the
platform's v1; this push uses its colour space, KN3a, and builds the smallest
part of its runner, RN4, and of its offers at rest, CS1), and `CLAUDE.md`'s
*The maths of a mark*, which is what the engine does today.*

---

## 0. In one paragraph

dyna.ink is first a way to **draw maths**. John's own code uses maths to draw;
here the drawing is the way in, and both directions stay. Draw a right triangle
and write 3 and 4 by its legs, and *5* stands faint where the hypotenuse's label
would go, in the hypotenuse's colour, with the angles at their corners; a tap
writes it, and from then on the maths checks it. Write `y = (x²−4)/(x−2)` beside
axes and its curve stands under the ink with a hole at (2, 4); tap the hole and
the approach plays from both sides. Draw a pivot, a rod and a bob, and it swings
by physics, its period beside it. Draw e⁺e⁻ → μ⁺μ⁻ and it reads as an s-channel
Feynman diagram of order α². One quantity has one colour wherever it stands —
its mark, its ghost, its term in an equation, its curve — so a symbol is linked
to its picture by sight. Teachers come first. The north star is the full stack
of maths and design in one place.

---

## 1. John's direction, and what it asks

**John, 8 October 2026 (verbatim):**

> ok i need to be able to do maths 'reverse' where I draw shapes or write out numbers and it can offer fill ins
> as ghost on the page (the ghost on the canvas offer with the selection is key to closing loop visually). the
> colors can be used for relations there. we should be able to do to the trigonometry example from the story in
> the whitepaper. dynaink is primarily a way for me to be able to draw math (all other coding for me is always
> use math to draw or draw to draw, this offers me a way in to complex maths with pictoral and programmatic /
> diagrammatic. even feynman diagrams. let's get comprehensive and then make a push on this to bring features
> in. tool for teachers is my first goal. we should be able to do the chalktalk style draw pendulum is alive can
> output function use in equations with display. the full stack of maths/design in one place is our north star :)

**The eight asks:**

1. **Maths in reverse.** The drawing is the way in: shapes, and numbers written
   by hand. Both directions stay — a function written is plotted, and a curve
   drawn reads as a function.
2. **Fill-ins as ghosts on the page, with the selection.** Whatever the maths
   implies stands faint where it would be written, beside the marks held, and a
   tap writes it: a missing side, an angle, a result, the next line, a curve.
   The ghost is on the canvas, where the eye already is, not in the field's
   pills. That closes the loop.
3. **Colour for relations.** One quantity has one colour everywhere it stands.
4. **The story's example, *Jake vs Calculus*** (`stories/jake-vs-calculus.md`;
   the whitepaper's *Visual Learning* card): lim x→2 (x²−4)/(x−2) = 4 — a
   parabola drawn and rendered properly under the sketch, a hole at x = 2,
   points approaching from both sides with y = 3.9, 3.99, 3.999, the factoring
   and the cancelling animated, the equation beside the graph with visual links
   between its symbols and the picture, and a cubic limit. **Its trigonometry is
   the limit Jake saves for later, lim x→0 sin x / x = 1, on the unit circle**
   (John confirmed, §11).
5. **Pictures, programs and diagrams at once**: the same quantity drawn, written
   and running.
6. **Feynman diagrams.**
7. **Chalktalk's pendulum** (Ken Perlin's Chalktalk is the reference; the
   storyboard's shot 5): draw a pivot, a rod and a bob and it is alive, swinging
   by physics; its angle is a function of time; that function can be used in
   written equations and shown as a live value or a plot.
8. **Teachers are the first goal; the full stack of maths and design in one
   place is the north star.**

---

## 2. The floor

What is built (MATHS-PLAN M1–M7; `CLAUDE.md`, *The maths of a mark*): quantities
with units and intervals (`maths/quantity.ts`); a grammar written by hand, `=`
chains as running totals, plural readings (`maths/expr.ts`); the sheet, its
steps and checks (`maths/sheet.ts`); numbers attached to sides
(`maths/dimension.ts`); figures solved one at a time in closed form, every value
with its formula, an over-determined figure keeping every consistent reading
(`maths/solve.ts`); the board's chips beside the figure (`maths/board.ts`,
`Demos/surface/25-maths.js`); true size and tiled print; the garment pattern
piece.

The hand-over's §4 is the survey of what the code does today, with file and
line: the clean-form ghost and when it shows, the maths chips and why they
cannot be tapped, how a written value is read back (`numbersOf` attaches a
one-line text artifact to a side — so a taken fill-in is a one-line text, never
a label), the clock and the tank, and what is missing. Its table of **lines the
grammar reads silently wrong** is the first thing B fixes:

| Typed | Today |
|---|---|
| `= 2x` | `2 = 2` |
| `= sin(30)` | `sin = 30` |
| `= x(x+1)` with x = 3 | `x = 3` |
| `= 2(3+1)` | "2 + 1 is 3, not 3" |
| `= 3-5` | read as a range |
| `= 2 × a = 10` with a undefined | accepted, 10 |
| `= 1.9999 + 0.0001` | `2 + 0 = 2`, the display rounding to two places |

And one sentence the solver gets wrong: a right triangle given its hypotenuse
and an angle says *the other leg 7.66 and the other leg 6.43* (A fixes it).

---

## 3. Rules

MATHS-PLAN's six stand:
1. a number is a reading;
2. labels rule the thing, and the ink rules the topology;
3. readings are plural, with the disagreement said;
4. tier 1 does the arithmetic;
5. units are the hand's;
6. change flows, and the ink stays.

This push adds eight:

7. **A fill-in stands where it would be written.** It is the value or mark the
   maths implies, drawn faint in place, at the hand's size and in its quantity's
   colour, beneath the ink. It is derived, and never in the log.
8. **A tap takes it, as the hand's own act** — one act, one undo.
   - A value becomes a one-line text at that spot, in the taker's name. The maths
     reads it back as written and checks it from then on: change a leg, and the
     written hypotenuse says ✗, with the new value offered. **It is written text,
     not a live value** (John, §11).
   - A mark becomes ink drawn in the taker's name, stamped with its tool and
     offer.
9. **The answer can wait.** On a board set so (a board's setting, an event in its
   log — John, §11), each answer ghost shows as *?* in its colour. The first tap
   shows it; the second writes it. The reveal is the page's, never logged.
10. **One quantity, one colour, wherever it stands** (§5).
11. **Alive by an act; time is derived.** *Play* is free, so it may be offered at
    rest. Nothing runs unblessed. A run's outputs are named quantities that any
    written maths can use.
12. **Exact where it can be, numeric where it must be, and the reason says
    which**: *by factoring*, *numerically from both sides*.
13. **Every reading goes both ways, and the round trip is the test** (D3's rule).
    A function written is plotted; a curve drawn reads as a function. A process
    written draws a Feynman diagram; a diagram says its process.
14. **Never confidently wrong.** What the grammar cannot read is refused, with the
    reason. It is never guessed.

---

## 4. The fill-in

Every source gives one kind of record, `FillIn`, through one registry
(`core/src/maths/fill.ts`, the contract, §8 C0). A fill-in says what it is
(`value`, `expression`, `mark` or `step`), where its words stand (`at`, and
M5's `from` and `away` for a side), the marks it concerns (`about`), the
quantity it is for its colour (`quantity`), its formula with its inputs
(`reason`), whether it is an answer that may wait (`answer`), how strong it is
(`rank`), and what a tap writes (`take`: a one-line text the maths reads, ink in
the taker's name, or nothing with the reason).

**When it shows:**
- **with the selection**: every fill-in about the marks held, placed apart from
  one another the way the explanation plane places its cards;
- **while pointed at**: the fill-ins about the mark under the hand;
- **for a moment after a change** (`MATHS_MS`, the maths chips' rule);
- **at rest, only the strongest one**, by CS1's rules: earned, one and quiet,
  gone when the hand moves on. *Not this* and turning a kind of offer off are
  CS1's and wait for wave 2 (the `decline` event).

**How it is taken:** a tap on it (a hit area of its own, as `chipHits` are for
the match chips), or Enter in the field while one fill-in is held. The maths
fill-ins are CS1's first offers at rest.

**A fill-in gives way to nothing it would cover.** It is placed off the ink and
off the other ghosts; an answer chip that says the same thing as a fill-in gives
way to the fill-in.

---

## 5. Colour for relations

**What gets a colour:** each quantity — a side, an angle, a radius, a name (θ, x,
L), a function, a run's output.

**How its hue is chosen** (`core/src/maths/hues.ts`, over KN3a's colour space):
- **A quantity's hue is placed for the board**: `placeHue` against the board's
  kinds and the other quantities, typical sight first and then the three
  colour-blind simulations, on both grounds. Deterministic — the keys sorted, the
  same board the same hues — stable, and never logged.
- **The roles of a right triangle are fixed** (John, §11): *opposite*,
  *adjacent*, *hypotenuse* and *the angle* have one hue each on every board, so a
  student learns that opposite is always that colour. Chosen once against the
  chrome's signal hues and checked for every eye on both grounds, they live in
  `hues.ts` as one table. **On a board where one would look too close to a kind
  or a quantity already there, it is nudged the least that clears it, and the
  nudge is said** in the fill-in's reason (*opposite, moved from its usual hue
  beside “water”*).

**Where it shows:**
- its ghost, and its chip;
- a soft halo beneath its marks' ink while they are held or pointed at — always,
  on a board set to *colour the maths* (the same setting event as the answer
  waiting, §8 M18);
- its terms in typed maths;
- its curve on a plot, and its trace over time.

**Certainty is chroma** (KN3's `colourOf(kind, ground, certainty)`): a ghost is
*offered*, muted; a written value is *said*, full.

**SOH CAH TOA in colour**: in a right triangle seen from a named angle, opposite,
adjacent and hypotenuse take their three hues and the angle its fourth (M14).

**What colour never does:**
- The ink's own colour never changes for the maths: colour is signal, and ink is
  never covered.
- `--sig-*` stays for states (✓, ✗, a problem).

---

## 6. The map: the full stack

Status is *built*, *wave 1*, *wave 2* or *later*.

| Area | Drawn on the page | What the board does | Status |
|---|---|---|---|
| Arithmetic | numbers and signs, typed or by hand | sums checked ✓ ✗; `=` answers | built typed; by hand → M8 |
| Units, true size | 24″, 61 cm | converted, intervals, true size, print | built |
| Figures | triangle, rectangle, circle, arc, parts | solved; fill-ins in colour | built; ghosts → M16–M17 |
| Names on figures | θ at a corner, a by a side | the name is the quantity everywhere | wave 2, M10 |
| Trigonometry | a right triangle with θ; the unit circle | SOH CAH TOA in colour; sin, cos, tan as segments | wave 2, M14 |
| Functions | `y = …` written; axes drawn | the curve ghosted on the axes, with holes and asymptotes | wave 1, M11 and M19–M20 |
| A curve drawn | a curve on axes | read as *y = x²*, drawn clean under the ink | wave 1, M21 |
| Algebra | an expression written | factored, cancelled and expanded as ghost steps | engine wave 1 (M12); shown wave 2 (M15) |
| Limits | a hole; an approach | the approach animated with its values; the limit and its method | engine wave 1 (M13); shown wave 2 (M22) |
| Derivatives, integrals | a tangent; a shaded area | the slope; the area | later |
| Alive | a pendulum, then a spring, a projectile, an orbit | swings by physics; its period; θ(t) | wave 1, M23; more later (M26) |
| Live values | θ beside a running pendulum | `x = L sin θ` updates live | wave 2, M24 |
| Plots over time | an arrow from a run to axes | θ(t) traced live | wave 2, M25 |
| Forces, vectors | arrows on a block | summed, with the resultant ghosted | later (storyboard shot 7) |
| Feynman diagrams | arrowed, wavy and curly lines meeting | the process, the order and conservation; TikZ out | wave 1, M27; drawing from a process later (M28) |
| Number sense | number line, bar model, fraction bars, area model | the missing part; the value of a point | later (solve sums parts already) |
| Statistics, probability | charts and trees drawn | data read; branches multiplied | later (MP7) |
| Chemistry | molecules | matched (Basics pack) and stood in 3D | built; balancing equations later |
| Design | pattern pieces, true size, solids | cut and sewn sizes, print, 3D | built |
| Teaching | a lesson board, a class | the answer waits; the class follows; worksheets | M18 in wave 1; M29–M30 later |

---

## 7. The teacher's scenes — acceptance, T1–T10

Whether any join v1's acceptance is John's to say.

**T1 The triangle fills in.**
- Draw a right triangle (one stroke, or three ruled lines) with the square in its
  corner, and type or write 3 and 4 beside the legs.
- With the selection, *5* stands where the hypotenuse's label would go, in its
  colour, and the angles 36.87° and 53.13° stand at their corners.
- A tap writes the 5, and one undo removes it.
- Change the 4 to 5: the written 5 says ✗, and 5.83 is offered.

**T2 SOH CAH TOA in colour.**
- Write θ at a corner. The sides take the roles opposite, adjacent and
  hypotenuse, each in its hue (the fixed role hues, §5).
- *sin θ = 3/5 = 0.6*, *cos θ*, *tan θ* and *θ = 36.87°* stand beside the figure,
  each term in its side's colour.
- Move the θ, and the roles and colours follow.

**T3 The unit circle, and Jake's trig limit** (the story's trigonometry, John
confirmed).
- Draw a circle on axes with a radius at angle x. sin x, cos x, tan x and the arc
  x stand as coloured segments.
- Write `sin x / x`, and its value stands live.
- Drag the radius toward the axis: 0.96, 0.99, 0.999 … and *lim x→0 sin x / x =
  1* stands.
- The squeeze, sin x ≤ x ≤ tan x, is drawn in their colours.

**T4 Jake's limit, as the story tells it.**
- Draw axes and a rough parabola. *y = x²* stands, and its clean curve lies under
  the ink.
- Write `y = (x²−4)/(x−2)`. Its line stands with a hole at (2, 4).
- Tap the hole: the approach from both sides plays, with y = 3.9, 3.99, 3.999.
- The factoring stands as ghost steps, the common factor struck in one colour,
  then *= x + 2, x ≠ 2* and *lim = 4*. The cubic limit works the same way.

**T5 The pendulum is alive.**
- Draw a hatched ceiling, a rod and a bob. *a pendulum* is read.
- *Play* swings it. *T = 2π√(L/g) = 2.01 s* stands, with L read from *1 m*
  written by the rod.
- Write θ beside it, and its value runs live.
- Draw an arrow from the pendulum to axes, and θ(t) is traced.
- `x = L sin θ` updates live.

**T6 Forces add up.** Arrows on a block, each with its label; the resultant
stands as a dashed arrow, with its size and direction; equilibrium is said.

**T7 A Feynman diagram.**
- Draw e⁺e⁻ → μ⁺μ⁻. It reads as *a Feynman diagram — s-channel, two vertices,
  order α²*.
- The particle labels are offered as ghosts.
- A vertex that breaks charge is said.
- TikZ-Feynman comes out.

**T8 Teach it to a class.**
- The answer waits.
- The teacher's board is in a room the students follow, or each takes a copy.
- Worked steps are checked ✓ ✗.
- A worksheet prints with the answers waiting.

**T9 Numbers by hand, with no model.** Digits and the dozen signs are read at
once, on the device, feeding T1–T5 with no network.

**T10 The whole stack on one board:** a figure, a function, a live pendulum and
its plot, linked by names and colours.

---

## 8. The units

Each unit takes the form `V1-SPEC.md` §6 sets: **owns**, **what**, **red
first** (the test that fails on `maths/wave-1` before the change), **checks**,
**invariant** (the one it is most likely to bend) and **trap**. Every unit also
runs the whole engine suite before it reports, and adds nothing to `CLAUDE.md`,
`V1-SPEC.md` or this file: it reports, and the integrator writes the docs and
the status line (§12).

**The units by family:**
- **Reading:** M8 numerals at tier 1 · M9 maths in two dimensions (powers,
  fractions, roots, subscripts, from glyph positions) · M10 names on figures (a
  bare name attaches to a corner or side and enters the sheet's scope).
- **Knowing:** M11 functions (`fn.ts`) · M12 polynomials and rational functions
  · M13 limits · M14 trigonometry (roles from a named angle; the unit circle
  read) · M15 algebra shown (factor, cancel and expand as ghost steps, the
  common factor struck).
- **Offering:** M16 the fill-in and its ghost layer · M17 colour for relations ·
  M18 the answer waits.
- **Graphs:** M19 the coordinate plane · M20 the plot · M21 a curve read and
  fitted · M22 Jake's approach (a hole tapped, the approach animated with its
  values).
- **Alive:** M23 runners and the pendulum · M24 a run's outputs in written
  maths, live · M25 plots over time (an arrow from a run to a plane, RN8's first
  dataflow) · M26 more bodies (a spring, a projectile, an orbit; forces summed).
- **Science:** M27 Feynman diagrams · M28 Feynman in (a process written, then
  drawn).
- **Teaching:** M29 a class in a room (students follow or take a copy; the
  reveal reaches every screen) · M30 projector and worksheets.
- **Doors:** M31 the MCP hand reads the maths (`canvas_look` says the fill-ins
  and live values; Claude explains a step when asked, and never computes).

### C0 — the contracts (the integrator, one commit before wave 1)

- **`core/src/maths/fill.ts`**: `FillKind`, `FillIn`, `FillSource`,
  `registerFillSource`, `fillInsOf(state)` (every source, deduplicated by key,
  ranked) and `fillInsOfSession(session)` (the same, kept while the log stands,
  as `boardMathsOf` is), a source that throws left out and named, and a
  `FillContext` that hands every source the board's maths read once. Tested:
  the registry, deduplication, ranking, and a throwing source.
- **`core/src/maths/compile.ts`**: `compileFunction`'s shape — `CompileFunction`
  and `CompiledFunction` — which B implements in `fn.ts` and C calls once B is
  merged. Until then C tests with plain JavaScript functions.

*Status, 8 Oct 2026: committed on `maths/wave-1` with this spec.*

### Wave 1 — six lanes

The lanes are lettered as the hand-over lettered them. **Agents:** A, B, C and D
on Sonnet; **E and F on Opus** (John, §11). **Order:** A, B, D and E start at
once; C starts when B has merged; F starts when a lane frees. **Merge order:**
B, A, E, C, D, F — or as they finish, so long as C comes after B.

#### Lane A — M16, M17, M18: fill-ins as ghosts, in colour (core and surface)

- **Owns:**
  - core `maths/fill-figure.ts` (the figure source, registered with
    `registerFillSource`), `maths/hues.ts` and `tools/fill.ts`;
  - core `maths/board.ts` and `maths/solve.ts`, only to expose a side's own marks
    and its quantity key, and to fix the *other leg* sentence;
  - core `session/session.ts`, only to add the **`setting` event** (below): its
    type, its apply function and `SessionState.settings`;
  - the surface: a new fragment `Demos/surface/25-ghosts.js`, one call in
    `render()` (`08-render.js`), one branch in `tapAt` (`07-input.js`),
    `25-maths.js` (an answer chip gives way to the fill-in that says the same
    thing) and `surface.css`;
  - a new gate scenario, `e2e/fill.mjs`, registered in `e2e/run.mjs`.
- **What:**
  - **The figure source.** Every value a solved figure derives that is not
    written becomes a `value` fill-in: sides, all three angles, area, perimeter,
    a circle's r, d, C and A, an arc's measures.
    - Sides stand at the side chip's spot (`from + away × offset`), angles inside
      the corner's bisector, area at the centroid.
    - `about` is the side's own marks; `quantity` is `fig:<figureId>:<valueKey>`;
      the reason is the formula with its inputs.
    - A value from the ink is weaker (a lower rank) and says *at the drawing's
      scale*.
    - For a conflict, the derived value stands beside the written one.
  - **The ghost layer** (`25-ghosts.js`). Values are written in the board's text
    face at label size — not as pills — muted, in their quantity's hue; marks are
    dashed, beneath the ink. They show with the selection, while pointed at, for
    a moment after a change, and the strongest one at rest (§4). A halo in the
    quantity's hue lies under the ink of the marks it measures while they are held
    or pointed at.
  - **Taking.** A tap runs `session.withTool('fill', () => session.import({ kind:
    'text', code, bounds }), key)` — one act, one undo. The maths reads the value
    as written (`numbersOf`) and checks it from then on.
  - **Hues** (`hues.ts`). Quantity keys become hues through KN3a (`placeHue`,
    `colourOf`), deterministic for the board (keys sorted, the board's kinds'
    hues avoided), on both grounds, checked for colour-blind eyes. **The role
    hues** — opposite, adjacent, hypotenuse, the angle — are one fixed table,
    nudged on a board only where they would look too close to what is there, the
    nudge said (§5). M14 (wave 2) uses them; A builds and tests them now.
  - **The `setting` event** (M18, and *colour the maths*): `{ type: 'setting',
    key, value, at, participantId? }` with a closed set of keys — `answers`
    (`'show'` or `'wait'`) and `colour` (`'pointed'` or `'always'`) — giving
    `SessionState.settings`. A board-wide fact, like `use`: whichever hand set
    it, every merged board has it; undone per hand; a key or value outside the
    set is refused at the door and ignored on replay. Reached by typing in the
    field (*the answer waits*, *hide the answers*, *show the answers*, *colour
    the maths*) and from the panel's board line when nothing is held.
  - **The answer waits.** On a board set so, an answer ghost shows *?* in its
    colour; the first tap shows the value (the page's, never logged), the second
    writes it.
- **Red first:**
  - **Core.** A right triangle with 3 and 4 written as one-line texts by its
    legs offers *5* at the hypotenuse's spot and the angles 36.87° and 53.13°;
    taking *5* writes one text event, which `numbersOf` attaches to the
    hypotenuse, after which that fill-in is gone and a check holds; changing 4 to
    5 makes the written 5 a conflict, with 5.83 offered.
  - **The other leg.** A right triangle given its hypotenuse and an angle names
    each leg once, by where it stands.
  - **Hues.** Distinct quantities stay distinct for all four visions on both
    grounds, and are the same after a replay; the role hues hold their table
    on a board with nothing near them and are nudged, said, beside a kind that
    looks like one.
  - **The setting.** `answers: 'wait'` replays, merges across hands and undoes
    per hand; a bad key is refused.
  - **Gate** (`e2e/fill.mjs`). The triangle drawn with the pointer and its legs
    typed; with the selection the hypotenuse's ghost appears; a tap writes it; one
    undo removes it; on a board set to wait it shows *?*, then the value, then
    writes.
- **Checks:** `cd core && npm test && npm run typecheck`; both bundles rebuilt
  and copied to `Demos/`; `node Demos/build-surface.mjs`; `node e2e/run.mjs
  fill canvas walk`.
- **Invariant:** the ink is never covered or recoloured; nothing derived is
  logged; no model is asked; e2e 49's golden field offers are unchanged.
- **Trap:** a ghost over another ghost or over ink — place them the way
  `renderExplanations` weighs its cards. A taken value that attaches to the wrong
  side, where two sides' middles are close — test the attachment.

*Status, 8 Oct 2026: **built and merged** (`unit/m16-fill`, merged as `722af2c`). The figure
source (`maths/fill-figure.ts`): a solved figure's sides, angles, area, perimeter and a circle's or an arc's
measures that are not written stand faint where they would be written — sides at the chip's spot, angles on the
corner's bisector, area at the centroid — each spot proved to attach to the side it was offered for
(`fillLandsOnBoard`); a value from the ink alone weaker and said *at the drawing's scale*; a conflict's derived value
beside the written one, shown and not taken. A tap writes it as a one-line text in one act and one undo; the maths
reads it back and checks it. The ghost layer (`Demos/surface/25-ghosts.js`): faint text in the quantity's hue, marks
dashed beneath the ink and taken along their line, a halo under the measured marks while held or pointed at, a
second channel as a dash on the halo. `maths/hues.ts`: the role table (opposite, adjacent, hypotenuse, the angle) and
its nudge, said; other quantities placed per board, deterministic. The `setting` event (`session/settings.ts`: the
answer waits, colour the maths), board-wide, undone per hand, a bad key refused; reached by typed offers
(`tools/fill.ts`, the twenty-seventh built-in: *the answer waits*, *show the answers*, *colour the maths*, *write
it*, *write all*) and the panel's board line. The other leg named by where it stands. Gate `fill`, 22 records. Open:
on a waiting board a conflict still shows the derived value (hiding it would hide the disagreement — John's to say);
role hues are never nudged on a real board until KN1 gives the board kinds.*

#### Lane B — M11, M12, M13: functions, polynomials, limits — the Jake engine (core)

- **Owns:** new core files `maths/fn.ts`, `maths/poly.ts` and `maths/limit.ts`;
  and `maths/expr.ts` and `maths/quantity.ts` (the silently wrong lines, angle
  units, display precision).
- **What:**
  - **`fn.ts`, maths with a variable.** It reads numbers; names, Latin and Greek
    (θ φ α β λ ω); `^` and superscripts (² ³ ⁿ); `√` and `√(…)`, `π`, `e`; the
    functions sin, cos, tan, asin, acos, atan, sqrt, ln, log, exp, abs; implicit
    multiplication (`2x`, `x(x+1)`, `2(3+1)`, `2π√(L/g)`); `/` and unary minus;
    degrees (`sin 30°`) and radians; `y = …` and `f(x) = …`. It implements
    `compileFunction` (C0's shape) and a tree printer (text now, TeX later).
  - **`poly.ts`.** Polynomials in one variable with rational coefficients: built
    from a tree; expand, divide, gcd; factor over the rationals (rational roots,
    quadratics, sums and differences of cubes); rational functions cancelled —
    what is left is their holes (removable points) and poles.
  - **`limit.ts`.** `limit(tree, x, a, side?)` returns `{ value, method, steps,
    approach?, reason }`, method `substitution`, `factoring`, `known` or
    `numeric`, tried in that order: substitution; for 0/0 in a rational function,
    cancelling; known limits (sin x / x, (1 − cos x)/x, (eˣ − 1)/x, (1 + 1/x)ˣ);
    otherwise numerically from both sides, with the approach given (1.9, 1.99,
    1.999 → 3.9, 3.99, 3.999) and whether the sides agree. One-sided and infinite
    limits are said.
  - **The silently wrong lines** (§2): each is read correctly through `fn.ts` or
    refused with a reason. The display shows enough digits to tell 1.9999 +
    0.0001 from 2. Angle units (°, rad) go into `quantity.ts`.
- **Red first:**
  - `limit` of `(x^2-4)/(x-2)` at 2 is 4, *by factoring*, with the steps
    `(x+2)(x−2)/(x−2) = x + 2`;
  - sin(x)/x at 0 is 1, *known*, and confirmed numerically;
  - `factor('x^3-1')` gives `(x − 1)(x² + x + 1)`;
  - `compileFunction('2π√(L/g)')` evaluates, given L and g;
  - each silently wrong line goes red, then is read right or refused;
  - every existing maths test still passes, or each changed expectation is listed
    with its reason.
- **Checks:** the engine suite, typecheck, both bundles. The sheet's goldens
  (the apron, the tunic, the triangle) are unchanged.
- **Invariant:** no model computes; exact where exact; MATHS-PLAN's six rules
  hold.
- **Trap:** changing `expr.ts` can break the sheet's plural readings (range or
  minus; precedence or left to right). Keep both readings where they were plural,
  and send to `fn.ts` only what `expr.ts` could not read or read wrongly. When
  sampling, never evaluate exactly at a removable point.

*Status, 8 Oct 2026: **built and merged** (`unit/m11-fn`, merged as `ab823fd`). `fn.ts`:
maths with a variable read by hand — Latin and Greek names, `^` and superscripts, `√`, π, e, the functions, implicit
products (`2x`, `x(x+1)`, `2π√(L/g)`), degrees and radians, `y =` and `f(x) =` — printed back as read and compiled
by `compileFunction` (C0's shape, with an optional `given`); ambiguous writing (`1/2x`, `√4x`, a slash fraction beside
÷ or ^) refused with both ways to write it. `poly.ts`: exact over the rationals, factored (rational roots, then
Kronecker's method up to cubic factors, saying when it cannot be sure), a ratio cancelled into its holes, poles and
end (`analyseRational`). `limit.ts`: substitution, factoring with the common factor struck, the known limits
confirmed by the numbers, else numerically from both sides with the approach given — Jake's limit 4 *by factoring*,
1.9, 1.99, 1.999 → 3.9, 3.99, 3.999. Every line of §2's table now read right or refused; an angle is a quantity of
its own; a written decimal keeps its places and nothing nonzero shows as 0. No existing test changed. Changed
behaviour no test pinned: a slash fraction beside ÷ or ^ is refused rather than read one way; `x` glued to a bracket
or name is the letter. Left: TeX printing; Greek names in the sheet's grammar (M10).*

#### Lane C — M19, M20, M21: the coordinate plane, plots, a curve read (core)

- **Owns:** `notations/plane.ts` (and its registration line in `notation.ts`),
  `maths/plot.ts`, `maths/fit.ts`, and `maths/fill-plane.ts` (fill sources,
  registered with `registerFillSource`).
- **What:**
  - **The plane.** Two long strokes (lines or arrows) crossing near-perpendicular,
    long against the marks around them. Ticks are short strokes across an axis.
    Numbers at the ticks set each axis's scale: two numbers fix it, or one with
    the origin; otherwise a default range is assumed and said. Writing at an
    axis's end names it: x, y, t, θ. It reads as *a coordinate plane 0.8*, and N1
    says so. A point on the plane reads as its coordinates.
  - **`plot.ts`.** `plotOn(plane, f, { holes?, poles? })` returns polylines in
    canvas units: sampled adaptively, split where the function breaks, holes as
    open rings, asymptotes as dashed lines, clipped to the plane's drawn extent.
  - **`fit.ts`.** A stroke on the plane is sampled in plane coordinates and fitted
    to a line, a parabola, a cubic, a sine, an exponential and 1/x, ranked by
    residual over the plane's span with a penalty for complexity (*a parabola, y =
    0.98x² + 0.1, within 3% of the span*); the rounded form (*y = x²*) is offered
    when it is within the drawing's precision.
  - **The fill sources.** A curve on a plane gives an `expression` fill-in (its
    equation) and a `mark` fill-in (the clean curve beneath the ink — Jake's
    *renders it properly underneath his sketch*). A function written near a plane
    gives a `mark` fill-in (its curve, with its holes), through `compileFunction`.
- **Red first:**
  - a plane drawn from two arrows, with ticks at 1 and 2, reads its scale;
  - a parabola stroke reads first as y = x²;
  - `plotOn(plane, x => (x*x-4)/(x-2), { holes: [2] })` gives one line with a gap
    and a ring at (2, 4);
  - the other notations' benches and the corpus read no plane above the floor.
- **Checks:** the engine suite, typecheck, both bundles.
- **Invariant:** derived and never logged; the ink stays; fits are plural, with
  their reasons.
- **Trap:** not every cross is a pair of axes — crossing lines in a flowchart or
  a garment piece must not read as a plane; bench it. Where the hand doubled
  back, a curve's samples are no function.

*Status, 8 Oct 2026: under way (`unit/m19-plane`, from `ab823fd`, after B merged).*

#### Lane D — M23: the pendulum is alive, Chalktalk's road (core and surface)

- **Owns:**
  - core `run/runner.ts` (RN4's contract at its smallest), `physics/pendulum.ts`,
    `notations/pendulum.ts` (and its registration line) and `tools/run.ts`
    (*Play the pendulum*);
  - core `session/session.ts`, only `applyClock`, if the clock is widened (below);
  - the surface: a new fragment `Demos/surface/14-run.js`, and one hook in
    `08-render.js`'s placement — a pivot, and a placement for each member;
  - a new gate scenario, `e2e/alive.mjs`.
- **What:**
  - **Reading.** A pivot — a short line with hatching, a dot, or the rod's top
    end alone — a rod (a line) and a bob (a circle or a filled dot) touching the
    rod's other end read as *a pendulum 0.8 — a rod from a pivot, a bob, drawn 20°
    from plumb*.
  - **Inputs.** L from a number written beside the rod (m, cm, or the drawing's
    unit), else from the drawing's scale, else 1 m assumed and said. θ₀ from the
    rod's drawn angle; a rod drawn plumb is offered *pull it aside* (the drag is
    wave 2's). g is 9.81 m/s².
  - **Physics.** θ″ = −(g/L)·sin θ by RK4 at a fixed small step, re-derived from t
    = 0 the way the tank is, with keyframes kept for scrubbing. Outputs: θ(t),
    ω(t), x = L sin θ, y = −L cos θ, and the period — exact, by the
    arithmetic–geometric mean, `T = 2π√(L/g) / AGM(1, cos(θ₀/2))`, with the
    small-angle `2π√(L/g)` said beside it.
  - **The runner contract.** `registerRunner({ id, reads(state, ids),
    inputs(scope, board), init, step(s, dt), outputs(s) })`. State is derived from
    the log, the inputs and t; every run has a step budget; outputs are
    addressable as `run:<id>:θ`.
  - **Play.** *Play the pendulum* writes one `clock` play event — nothing runs
    unblessed — and pause and reset work as the tank's do. **A clock stands only
    on an artifact today** (`applyClock`). D chooses, and says which in its
    report: (a) widen `applyClock` so a clock may stand on the mark a registered
    runner reads (preferred — playing teaches no definition), or (b) bless the
    pendulum's marks in the same act.
  - **The surface.** The rod and bob turn about the pivot each frame with no
    events. T and the live θ stand beside it as chips, or as fill-ins once A is
    merged. Esc stops it.
- **Red first:**
  - **Core.** L = 1 m and θ₀ = 10° give T ≈ 2.0099 s at g = 9.81, against 2.0061 s
    for small angles (the hand-over's 2.0102 s is g = 9.80665's; lane D found it);
    energy is conserved within 1e-6 over 100 s; the reading holds for a
    drawn pendulum and is weaker without a pivot; nothing reads a pendulum in the
    corpus or the notation benches.
  - **Gate** (`e2e/alive.mjs`). A pendulum drawn with the pointer reads; *Play*
    swings it — its drawn position changes from frame to frame with no new events;
    Esc stops it; after a reload it is paused.
- **Checks:** the engine suite, typecheck, both bundles, the surface build,
  `node e2e/run.mjs alive canvas`.
- **Invariant:** time is never logged; nothing runs unblessed; the ink moves only
  at render time; tier 1, no model.
- **Trap:** the tank turns an artifact's members about one centre — the pivot
  must stay put. A pendulum inside a blessed artifact. Re-deriving a long run from
  t = 0 on every change to the log — keep a cache.

*Status, 8 Oct 2026: **built and merged** (`unit/m23-pendulum`, merged as `09ba264`).
A rod from a pivot (a ceiling, its hatching, a dot, or the rod's top end alone, the
weakest) and a bob at the end it points to read as *a pendulum*, 216 of 216 of its own
drawings at three sizes and none of the corpus or the other notations' boards even at
the offer floor; without a pivot it stays under the floor. RK4 at a fixed step; T exact
by the AGM, 2.009893 s for 1 m at 10° (the integrator agrees to 6e-9), the small-angle
2.006067 s beside it; energy drift about 5e-11 over 100 s. **What Play stands on: (a)** —
`applyClock` takes a clock on a mark a registered runner holds (`Runner.holds`), so playing
teaches no definition; a clock on any other stroke is still ignored. The runner contract
(`core/src/run/runner.ts`): a registry, inputs, a stepper with keyframes and a budget that
says when it stopped, outputs named `run:<key>:θ`, placements in the tank's shape. *Play*,
*Pause*, *Reset* and *Pull it aside* (`tools/run.ts`, the twenty-sixth built-in); the
surface turns rod and bob about the pivot at render time (`14-run.js`), T and the live θ as
chips (fill-ins once A is merged), Esc stops it, and a reload leaves it paused (a run is
armed only by a play seen in this sitting). Gate `alive`, 19 records. Left: grabbing the
swinging bob where it is drawn (wave 2's drag), the minimap and exports show the ink as
logged, a play from another hand in a room starts this tab from t = 0 (M29), a fill source
for T and θ (a few lines once A is merged).*

#### Lane E — M27: Feynman diagrams (core; Opus)

- **Owns:** `diagram/waves.ts`, `notations/feynman.ts` (and its registration
  line), `notations/feynman-tikz.ts`, `packs/shipped/feynman.ts` (`feynman@1`,
  and its registry line), and their fixtures and benches.
- **What:**
  - **`waves.ts`.** A stroke reads as wavy (photon, W, Z), curly (gluon: regular
    loops) or zigzag about a straight or gently curved axis when its period and
    amplitude are regular, its amplitude small against its length, and it has at
    least three half-periods. Dashed lines (Higgs, scalars) come from
    `notations/dashes.ts`.
  - **`feynman.ts`.**
    - **Structure.** Vertices are where three or four line ends meet; external
      lines have one end free. A fermion line is solid with an arrow — a barb at an
      end, or a chevron drawn on the line's middle, which is a new read. The
      particle table, `FEYNMAN_TABLE`: e±, μ±, τ±, ν, the quarks u d s c b t, γ,
      g, W±, Z and H, each with its charge, lepton and baryon numbers, and line
      style. Labels come from writing near a line. Time runs left to right unless
      the lines say otherwise, and that is said.
    - **What it says:** the process (*e⁻ e⁺ → μ⁻ μ⁺*); the channel (s, t or u)
      for two-to-two; the order from the vertices (αⁿ for QED, αₛ for QCD); tree
      or loop.
    - **Checks.** Charge and lepton number at each vertex once particles are
      labelled; a break is said, with its vertex.
    - **Fill-ins** (through `registerFillSource`): a label offered for an
      unlabelled line from its style and flow — γ on a wavy line between two
      fermion vertices.
  - **`feynman-tikz.ts`.** TikZ-Feynman out, for example `\feynmandiagram[horizontal=a to b]{ i1 [particle=\(e^{-}\)] -- [fermion] a -- [fermion] i2 [particle=\(e^{+}\)], a -- [photon, edge label=\(\gamma\)] b, f1 [particle=\(\mu^{+}\)] -- [fermion] b -- [fermion] f2 [particle=\(\mu^{-}\)] };`.
    The edge styles are checked against the TikZ-Feynman manual, and compiled with
    LuaLaTeX if the container has it; otherwise said to be unverified.
- **Red first:**
  - four boards — e⁺e⁻ → μ⁺μ⁻ (s-channel), Møller (t), Compton and a gluon
    exchange — read with the right process, channel and order;
  - a vertex that breaks charge is said;
  - the TikZ for e⁺e⁻ → μ⁺μ⁻ matches a golden;
  - **the bench:** 36 hands of the four, seeded tremor at three sizes, read first;
    the other notations' boards, the recognition corpus and lines of writing read
    as none above the floor; no writing reads as a wavy line.
- **Checks:** the engine suite, typecheck, both bundles.
- **Invariant:** derived; the six roles hold (vertices are nodes, lines are
  edges); nothing enters the log.
- **Trap:** cursive writing oscillates — a wavy line is regular and long against
  its amplitude, and writing is neither. A loop's photon is an arc: read the axis
  as a smoothed curve, not only a straight line.

*Status, 8 Oct 2026: **built and merged** (`unit/m27-feynman`, merged as `6b1a67d`). `diagram/waves.ts`
reads a stroke that oscillates — wavy, zigzag or a coil — along a line or an arc (a photon in a loop), regular and
long against its amplitude, so no writing reads as one (0 of 2,878 strokes). `notations/feynman.ts`: fermions solid
with an arrow (a barb at an end, or a chevron on the middle), photons, W and Z wavy, gluons curly, the Higgs dashed,
meeting at vertices; the process, the channel, the order and tree or loops; charge, lepton number by family and baryon
number checked at each vertex once named, a break said with its sum; `FEYNMAN_TABLE` (18 particles) named by the
`feynman@1` pack. Bench: 432 of 432 boards (36 hands × 4 diagrams × 3 sizes) read first at 0.92; nothing else above
0.00. TikZ-Feynman out (`feynman-tikz.ts`), **unverified by a compiler** — the container has no LuaLaTeX. A name
offered as a fill-in for an unnamed line (`maths/fill-feynman.ts`: γ, W±, g, H, a fermion carried through a neutral
vertex). Left: a fermion loop drawn as one circle, an arrow on a W line, a line drawn in two pieces; M28.*

#### Lane F — M8: numerals read at tier 1 (core; Opus)

- **Owns:** a new core directory, `read/`: `glyphs.ts` (the closed set: 0–9 . +
  − × ÷ = ( ) / √ π θ x y ° ′ ″ %), `pointcloud.ts` (a $P/$Q matcher: resample,
  normalise, greedy matching of the point clouds), `samples.ts` (built-in samples
  drawn from parametric definitions with seeded `handLike` tremor), `numerals.ts`
  (strokes grouped into glyphs, ranked candidates, a number as a run of digits on
  one baseline) and `numerals.bench.test.ts`.
- **What:**
  - **Reading only.** Derived from the strokes, deterministic, plural (1 / 7 / l
    said as such), tier 1, no model.
  - **How readings reach the maths** is designed and reported, not wired: a
    derived reading the engine holds on a word, as the shape rung's readings are
    held, which `transcriptOf` and `wordsOnBoard` can take — ranked below a
    person's correction and beside a model's.
  - **The person's own samples are wave 2's**: kept on the device and replayed
    into the log by an event, like the command mark's `teach`, so replay stays
    deterministic.
- **Red first:**
  - synthesized digits and signs at 0.6×, 1× and 1.8× read top-1 ≥ 95%, every
    class ≥ 90%;
  - the strokes of 4, 5, +, =, ×, ÷ and π are grouped into one glyph;
  - the drawing corpus and the notation benches read no digit above the floor,
    except digits' twins (0 / O / a circle, 1 / l / a line), which are said as
    ties.
- **Checks:** the engine suite, typecheck.
- **Invariant:** tier 1, no model, nothing logged. The shape rung and `words.ts`
  behave as before; their benches are unchanged.
- **Trap:** a lone circle or line is a shape first — read it as a digit only in a
  run of writing, or as a candidate label for a figure. The arithmetic grounds
  the reader (MATHS-PLAN §5): *13 + 2 = 16* is a doubtful reading before it is a
  wrong sum.

*Status, 8 Oct 2026: under way (`unit/m8-numerals`, from `09ba264`, after D merged).*

### Shared files, and who touches them

- **Registration lines are appended, and every one kept at merge:**
  `core/src/index.ts`, `core/src/tools/builtin.ts`,
  `core/src/notations/notation.ts`, `core/src/packs/registry.ts`, and the
  scenario lists in `e2e/run.mjs`.
- **Generated files conflict every time and are never merged by hand:**
  `Demos/dynaink-core.browser.js`, `Demos/dynaink-core.node.mjs` and
  `Demos/session-engine.js` are rebuilt from the merged source.
- **Otherwise each file has one owner:** `board.ts`, `solve.ts`, `dimension.ts` →
  A; `expr.ts`, `quantity.ts` → B; `session.ts` → A's `setting` event and D's
  `applyClock`, in different functions; `08-render.js` → A's render call and D's
  placement hook, in different functions; `07-input.js` → A's tap branch.

---

## 9. The ladder

- **Wave 1:** M16–M18, M11–M13, M19–M21, M23, M27 and M8 (§8).
- **Wave 2:** M10, M14, M15, M22, M24, M25, M9, M8's teach pane, and CS1 — offers
  at rest in general, with the `decline` event.
- **Wave 3:** M26, M28, M29, M30, M31, derivatives and integrals, number sense,
  forces.

Each wave ends with the integrator's report to John. Nothing lands on `master`
without his word.

---

## 10. What this is not

It is still not a computer algebra system.
- The symbolic part is school algebra in one variable — polynomials and rational
  functions, the elementary functions — and limits by known methods.
- No general symbolic algebra, and no proofs.
- No model ever computes.
- Not CAD.
- No entry dialog like a graphing calculator's: the function is written on the
  page.

---

## 11. John's decisions

**Answered, 8 October 2026:**

| # | Question | John |
|---|---|---|
| 1 | The story's trigonometry | **lim x→0 sin x / x = 1, on the unit circle** (T3) |
| 2 | Role colours (opposite, adjacent, hypotenuse) | **Fixed on every board, nudged on a clash** and the nudge said (§5) |
| 3 | A taken fill-in | **Written text the maths checks** from then on, not a live value (rule 8) |
| 4 | Where *the answer waits* lives | **The board's setting**, an event in its log (rule 9, M18) |
| 5 | Agents | **Opus for E (Feynman) and F (numerals)**; Sonnet for A–D |
| 6 | Git in this push | **Push `maths/wave-1` as the work goes**; unit branches stay in the container; nothing to `master` |

**Open:**
- **Land V1-SPEC wave 1** (fast-forward `master` to `v1/wave-1`, which holds
  CG7a, KN3a and IN1a)? Not asked to now; this push builds on its colour space
  either way, and it waits on John's word.
- Whether any of T1–T10 join v1's acceptance (§7).

---

## 12. How the lanes run

- **One agent per lane, each in its own worktree** off `maths/wave-1`:
  `git worktree add -b unit/<lane> ../lanes/<lane> maths/wave-1`, the
  dependencies installed in each (`cd core && npm ci`; for a lane that runs the
  gate, `cd e2e && npm ci` — the container's Chromium is preinstalled, so
  `playwright install` is never run — and `cd dynaink-3d && npm ci`). Never a
  symlinked `node_modules` (vite hangs on one).
- **Every long command is bounded** (`timeout 900 …`). An agent reports; it
  never waits on a hung command. Checks run with `bash -o pipefail`, or the
  counts are read: a check piped through `tail` exits 0 whatever the tests did.
- **Red first, then green.** Commits go on the unit branch with subjects that
  name the unit first (`M16: …`), so the release script groups them.
- **Agents never edit `CLAUDE.md`, `V1-SPEC.md` or this file.** They report what
  they built (with file:line), the numbers, what was unclear, what to document
  and what they found.
- **The integrator** merges each unit into `maths/wave-1` with `--no-ff` ("Merge
  M16: …"); rebuilds both bundles and the surface (and the app, if the page
  changed); runs the drift checks, the engine suite and typecheck, the Node
  suites CI runs, the MCP smoke and `dynaink-3d`'s tests; at the end runs the
  whole gate; then writes `CLAUDE.md`'s sections and the units' status lines
  here, and reports to John. In a container the timing records skip by name and
  the Mermaid CDN may be unreachable (also skipped by name).
- **Rules that bind every session** (the hand-over's §8): John's notebooks,
  drawings and recordings are private and never enter the repository; keys never
  reach GitHub and none is ever entered; the gate runs only on its own origin and
  never on port 8020; no session joins John's live room; nothing merges to
  `master`, is tagged or released without his word; no model computes a number,
  and a model is asked only by a deliberate act; paper first, one face, colour is
  signal, ink is never covered; eagerness follows cost; plain words in anything a
  person sees; thresholds live in code, never restated in prose.

---

## 13. Credits

- Sketchpad (Ivan Sutherland, 1963).
- Chalktalk (Ken Perlin, NYU).
- The $P recognizer (Vatavu, Anthony and Wobbrock, 2012).
- TikZ-Feynman (Ellis, 2017).
- Colour-coded explanations of maths, such as Stuart Riffle's coloured DFT.

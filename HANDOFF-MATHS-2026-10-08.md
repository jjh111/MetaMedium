# Handoff — the maths push, 8 October 2026

*For the session that continues this work on a cloud instance. Read this, then `CLAUDE.md`. Written at the
end of a desktop session: John gave the direction (§2), three surveys of the code came back (§4), and the plan
and the first wave were designed (§5–§6). **Nothing of the push is built yet.** Memories do not travel to the
cloud, so the rules they held are in §8.*

## The next steps, in order

1. **John pushes two branches** (or says *push*): `v1/wave-1` and `maths/wave-1`, never `master` (§1).
2. **In the cloud:** check out `maths/wave-1`, install, and run the core suite (§10).
3. **Ask John the open questions** in §9 when the session starts; none of them blocks wave 1.
4. **Write `MATHS-SPEC.md`** from the outline in §5. Add it to CLAUDE.md's document list and commit it on
   `maths/wave-1`.
5. **Commit the two contracts** in §6 (the fill-in record, and `compileFunction`'s shape).
6. **Launch wave 1:** six units, one build agent each, each in its own worktree (§6, §7).
7. **Integrate:** merge, rebuild, run the drift checks and the gate, then write the docs (§7).
8. **Report to John.** Nothing merges to master and nothing is pushed without his word.

---

## 1. Where things stand

| Branch | Where | What it holds |
|---|---|---|
| `master` | GitHub, `4fa1bed` | Untouched by this work. |
| `v1/wave-1` | John's Mac, until pushed | V1-SPEC phase 1, wave 1: CG7a, KN3a and IN1a, merged with their docs. Verified. **Not on master** — landing it waits for John. |
| `maths/wave-1` | John's Mac, until pushed | `v1/wave-1` plus this file and a pointer to it in CLAUDE.md. The maths push starts here, because it uses wave 1's colour space. |

The unit branches (`unit/cg7-doors`, `unit/kn3-colour-space`, `unit/in1-sources`) are already merged into
`v1/wave-1`; they stay on the Mac.

**Wave 1's checks** (7 Oct, on the Mac), all green:
- core 3,288 tests in 163 files; the Node suites, 287;
- the MCP smoke; the surface, app and examples drift checks;
- dynaink-3d, 607;
- the full gate: 894 passed, 0 failed, 12 skipped, across 14 scenarios in 549 s.

**What wave 1 added:**
- **CG7a, the doors.**
  - Two new tools on the hand: `canvas_doors` (every way in and out, read live from the code) and `canvas_export` (log, bundle, svg, mermaid, truesize).
  - `canvas_import` now takes a log or a bundle, into a scratch session and never the room.
  - New files: `Demos/mcp-doors.mjs` and the skill `skills/dynaink-doors`.
- **KN3a, the colour space,** in `core/src/colour/`.
  - Colours in OKLCH: hue is the kind and its kin, lightness is depth, chroma is certainty.
  - Hues are placed by perceptual distance for every eye: typical sight first, then three colour-blind simulations (Machado 2009), on both grounds.
  - The API: `placeHue`, `colourOf`, `makePalette`, `applyAct`, `meaning`. `brand/colour-space.html` draws with it.
- **IN1a, ink from outlines,** in `core/src/ingest/`.
  - Filled stroke outlines (SVG and the like) become centerlines; the entry point is `ingest(bytes, name)`.
  - On John's 31 Inkspace drawings it is 91.2% faithful. That is numbers only: the drawings are private.

**Already waiting on John (not this push's):**
- land wave 1;
- N4 — the Cloudflare secrets and DNS (`cloudflare/README.md`);
- release 0.2.0;
- A10 and A11 on the iPad.

**What wave 1's agents found to do later:**
- the hand's briefs show a raw participant id;
- `canvas_label` lets "local" leak into a sentence;
- `canvas_look` doesn't name the notation it reads;
- `canvas_see` draws only ink;
- Zhang–Suen `thin` could be better;
- `ingest` is synchronous, and pdf.js will need it async;
- KN3a's eight dash patterns are unverified on an iPad;
- KN1 should want `#` before a bare hex word;
- the lightness bands aren't in `tokens.css`.

V1-SPEC units queued before this push: CG7b, IN1b, IN2, KN1, TH1. They come after it, unless John says otherwise.

## 2. John's direction, 8 October 2026 (verbatim)

> ok i need to be able to do maths 'reverse' where I draw shapes or write out numbers and it can offer fill ins
> as ghost on the page (the ghost on the canvas offer with the selection is key to closing loop visually). the
> colors can be used for relations there. we should be able to do to the trigonometry example from the story in
> the whitepaper. dynaink is primarily a way for me to be able to draw math (all other coding for me is always
> use math to draw or draw to draw, this offers me a way in to complex maths with pictoral and programmatic /
> diagrammatic. even feynman diagrams. let's get comprehensive and then make a push on this to bring features
> in. tool for teachers is my first goal. we should be able to do the chalktalk style draw pendulum is alive can
> output function use in equations with display. the full stack of maths/design in one place is our north star :)

## 3. What it asks

1. **Maths in reverse.** John's own code uses maths to draw. Here the drawing is the way in: shapes, and numbers
   written by hand. Both directions stay. A function written is plotted; a curve drawn reads as a function.
2. **Fill-ins as ghosts on the page, with the selection.** Whatever the maths implies stands faint where it would
   be written, beside the marks held, and a tap writes it.
   - That can be a missing side, an angle, a result, the next line, or a curve.
   - The ghost goes on the canvas, where the eye already is — not in the field's pills. That closes the loop.
3. **Colour for relations.** One quantity has one colour everywhere it stands: its mark, its ghost, its term in an
   equation, its curve. The colour links a symbol to its picture.
4. **The story's example: *Jake vs Calculus*** (`stories/jake-vs-calculus.md`; the whitepaper's *Visual
   Learning* card). The story's maths is lim x→2 (x²−4)/(x−2) = 4:
   - a parabola drawn and rendered properly under the sketch;
   - a hole at x = 2;
   - points approaching from both sides, with y = 3.9, 3.99, 3.999;
   - the factoring, and the cancelling animated;
   - the equation beside the graph, *with visual links between symbols and what they mean on the picture*;
   - a cubic limit.

   Its one trig problem is the **trig limit Jake saves for later**. We took that to be lim x→0 sin x / x = 1,
   shown on the unit circle. **This is assumed — confirm it with John** (he said "the trigonometry example from the
   story").
5. **Pictures, programs and diagrams at once:** the same quantity drawn, written and running.
6. **Feynman diagrams.**
7. **Chalktalk's pendulum.** Ken Perlin's Chalktalk is the reference; the storyboard's shot 5 proposes it.
   - Draw a pivot, a rod and a bob, and it is alive: it swings by physics.
   - Its angle is a function of time.
   - That function can be used in written equations, and displayed as a live value or a plot.
8. **Teachers are the first goal. The north star is the full stack of maths and design in one place.**

## 4. What the code does today

Three read-only surveys ran on 8 Oct against `master` `4fa1bed`. Line numbers may have drifted a little on
`maths/wave-1`.

### Ghosts, chips and offers

- **The clean-form ghost.** `ghostOf` (`Demos/surface/08-render.js`:431–445) draws it dashed, in gold.
  - It shows (`ghostShown`, 515–520) when the mark is hovered, selected, summoned or in a waiting loop, or is the mark just drawn, within `GHOST_MS` (6000).
  - It can't be tapped. It is taken by *draw it clean*, the rail, the field, or auto mode.
- **Maths chips.**
  - `MathsChip` (`core/src/maths/board.ts`:170–193) holds `key`, `kind` (side, measure, conflict, step, scale or garment), `text`, `at`, `align`, `from?`, `away?`, `ids`, `standing` (true for a problem) and `reason`.
    - `ids` is the whole figure and its labels (`marksOfFigure`, not exported), **not the side's own marks**.
  - `figureChips` makes side chips only for derived values.
  - The value behind a chip is a `SolvedValue` (`solve.ts`:54–67): `{key, label, value: Quantity, from: labelled | declared | derived | assumed | ink, formula, text, reason}`.
- **The surface side** (`Demos/surface/25-maths.js`): `MATHS_MS` is 6000 and `MATHS_PIN_MS` 60000.
  - `mathsShown` (78–84): a problem always shows. An answer shows for a moment after it changes, while *Show the sizes* has pinned it, or while it is held or hovered.
  - Chips are drawn as pills (`mathsPill`, 87–98). **They can't be tapped:** they go into `mathsDrawn`, never into `chipHits`.
- **The tap to copy.** Match chips and reading chips push `{ids,x,y,w,h,text}` into `chipHits`. `chipAt` (08-render.js:524) finds one, and `tapAt` (`07-input.js`:593–596) acts on it.
- **Writing a value the maths reads back.**
  - `mathsWrite` (25-maths.js:199–206) calls `typeText` (19-text.js:22), which calls `session.import({kind:'text'})` inside `session.withTool('maths', …, 'sum')`. It is the person's act, with one undo.
  - **`numbersOf` (`dimension.ts`:435–455) attaches a one-line text artifact to a side as its number.** So a taken fill-in should be a one-line text import at the chip's `from + away` spot.
  - A `label` rep will **not** do: the maths never reads labels, and a label is refused on another hand's ink.
- **Offers at rest** (V1-SPEC §3.4, CS1): none of it is built — no `decline` event, no door for offers at rest, no preference per kind of offer.
- **Colour.**
  - The surface reads only a few tokens from `surface.css` (`readColours`, `00-core.js`:40–54); it doesn't load `brand/tokens.css`.
  - Nothing colours a side differently from its ink.

### The maths engine

- **The grammar, `expr.ts`.**
  - Entry points: `parseExpression` 621, `parseChain` 674, `parseLine` 743, `evaluateExpr` 846 and `evaluateChain` 1277. On the board it is `evaluateTyped` (board.ts:460).
  - It reads + − × ÷, units, ranges, `=` chains (as running totals and checks) and step references.
  - Names are Latin letters only (`LETTER`, 74) and must be defined on the sheet.
  - **It has no free variable, no ^ ² √ π e, no functions, no implicit multiplication and no Greek.**
- **Silently wrong today — fix first, because a teacher's board must never be confidently wrong:**

  | Typed | Today |
  |---|---|
  | `= 2x` | `2 = 2` |
  | `= sin(30)` | `sin = 30` |
  | `= x(x+1)` with x = 3 | `x = 3` |
  | `= 2(3+1)` | "2 + 1 is 3, not 3" |
  | `= 3-5` | read as a range |
  | `= 2 × a = 10` with a undefined | accepted, 10 |
  | `= 1.9999 + 0.0001` | `2 + 0 = 2`, because the display rounds to two places |

- **Units, `quantity.ts`:** lengths only (in, ft, cm, mm, m, ″, ′). No degrees as a unit, and no s, kg or m/s².
- **Solving, `solve.ts`.**
  - Triangles from SSS, SAS, ASA, AAS and SSA, by the laws of cosines and sines and Heron's formula. Angle labels such as 40° are facts on triangles.
  - Also rectangles, circles, arcs, and parts summing to a whole.
  - Trig appears only inside formula text; no reading is a ratio.
  - **Bug:** a right triangle given its hypotenuse and an angle says "the other leg 7.66 and the other leg 6.43" (solve.ts:965).
- **Attaching numbers, `dimension.ts`.**
  - `readNumber` (377–413) needs a number. **A bare name (a, x, θ) is never attached.**
  - `a = 8` attaches 8, but the name goes nowhere: not into the sheet's scope. Derived values have no names.
  - Angle labels attach by their distance to the corner (768–791).
- **The board, `board.ts`:** `boardMaths(state)` returns `{dimensions, sheet, figures: FigureMaths[], garment?}`, and `boardMathsOf(session)` is memoised on the log.
- **Nothing symbolic:** no polynomials, limits, derivatives, axes, plots or curve fitting. MATHS-PLAN §7 left these out on purpose; this push changes that, within bounds (§5).
- **Handwriting.**
  - Only a model's transcript reaches the maths: `agent.read`, `readLines` and the hand's `canvas_transcribe`, then `transcriptOf`, then `wordsOnBoard` (`writing.ts`:63–81).
  - **There is no reader of digits at tier 1** (MATHS-PLAN §5 plans one).
  - The precedent is `learnCommandMark` (`session/commandmark.ts`:158–186): eight scale-free features, one class, accept or reject.

### Things that run

- **The clock** is an event, `{type:'clock', nodeId, op: play|pause|reset|seed}` (session.ts:388; `applyClock` 3685–3694). Time itself is never logged.
- **The tank.**
  - A fixed step of 1/60, at most 8 steps a frame, re-derived from t = 0 when the log changes (`14-clocks.js`:17–20, 259–311).
  - **The render already moves and turns ink with no event** (08-render.js:975–986, `bodyPlacement` in 14-clocks.js:132–136). It turns about the body's bounds centre, and all of an artifact's members go under one transform (`inkOf`'s has-part loop, 08-render.js:497–509).
  - **A pendulum needs a pivot and a placement for each member.**
- **The verbs** (core `behave/`) are Reynolds steering only: no gravity, no constraints, no angles.
- **Frames and ports** (`core/src/frames/frame.ts`) carry static values only. `run` artifacts have no ports, and nothing that changes over time flows. The drawn slider (`slider` concept, the `control` tool, `sliderOf`) is an input.
- **`run` programs** (the harness in 13-kinds.js): they report parts and take the pointer. Their time is the iframe's own and restarts when it is rebuilt; they have no other inputs or outputs.
- **`buildGraph3D`** (`core/src/tier1/library.ts`:173–208) is the pattern for a tier-1 builder whose parts are named for marks.
- **Missing entirely:**
  - a runner contract (V1-SPEC RN4: `core/src/run/`, `registerRunner`, a trace);
  - any physics or integrator;
  - values over time, plots and dataflow (RN8).

  The film's pendulum is a scripted sine (`launch-video/index.html`:799–817).

## 5. The plan to write first: `MATHS-SPEC.md`

Write it at the root of `maths/wave-1` before launching agents, in V1-SPEC's style: units with *Owns · What ·
Red first · Checks · Invariant · Trap*. Add it to CLAUDE.md's document list. What follows is decided.

**§0 In one paragraph. §1 John's direction** (verbatim, §2 above) **and the eight asks** (§3).

**§2 The floor.** M1–M7 are built (MATHS-PLAN.md; CLAUDE.md *The maths of a mark*), plus §4 above.

**§3 Rules.** MATHS-PLAN's six stand:
- a number is a reading;
- labels rule the thing, and the ink rules the topology;
- readings are plural, with the disagreement said;
- tier 1 does the arithmetic;
- units are the hand's;
- change flows, and the ink stays.

Add these:
7. **A fill-in stands where it would be written.** It is the value or mark the maths implies, drawn faint in place,
   at the hand's size and in its quantity's colour, beneath the ink. It is never in the log.
8. **A tap takes it, as the hand's own act** — one act, one undo.
   - A value becomes a one-line text artifact at that spot, in the person's name. The maths reads it back as written and checks it from then on: change a leg, and the written hypotenuse says ✗, with the new value offered.
   - A mark becomes ink drawn in the taker's name, stamped with its tool and offer.
9. **The answer can wait.** On a board set to *teach*, each answer ghost shows as *?* in its colour. The first tap
   shows it; the second writes it.
10. **One quantity, one colour, wherever it stands** (§5 below).
11. **Alive by an act; time is derived.** *Play* is free, so it is offered at rest. Nothing runs unblessed. A run's
    outputs are named quantities that any written maths can use.
12. **Exact where it can be, numeric where it must be, and the reason says which:** *by factoring*, *numerically
    from both sides*.
13. **Every reading goes both ways, and the round trip is the test** (D3's rule).
    - A function written is plotted; a curve drawn reads as a function.
    - A process written draws a Feynman diagram; a diagram says its process.
14. **Never confidently wrong.** What the grammar cannot read is refused, with the reason. It is never guessed.

**§4 The fill-in.** Every source gives one kind of record (the contract, §6).
- **Shown:**
  - with the selection: all the fill-ins for the held marks, set apart from one another the way the explanation plane places its cards;
  - while pointed at;
  - for a moment after a change (`MATHS_MS`);
  - at rest, only the strongest one, by CS1's rules (earned; one, and quiet; gone when the hand moves on; *not this* declines it and is remembered; each kind can be turned off).
- **Taken** by a tap (a hit area like `chipHits`), or by Enter in the field when one is held.
- The maths fill-ins can be CS1's first offers at rest.

**§5 Colour for relations.**
- **What gets a colour:** each quantity — a side, an angle, a radius, a name (θ, x, L), a function, a run's output.
- **How the hue is chosen:** KN3a's `placeHue`, against the board's kinds and the other quantities; typical sight first, then the three colour-blind simulations, on both grounds. Stable for the board, deterministic, never logged.
- **Where it shows:**
  - its ghost and its chip;
  - a soft halo beneath its marks' ink while held or pointed at (always, on a board set to *colour the maths*);
  - its terms in typed maths;
  - its curve on a plot, and its trace over time.
- **Certainty is chroma** (KN3): a ghost is muted (offered); a written value is full (said).
- **SOH CAH TOA in colour:** in a right triangle seen from a named angle, *opposite*, *adjacent* and *hypotenuse* take three hues, and the angle a fourth.
- **What colour never does:**
  - The ink's own colour never changes for the maths: colour is signal, and ink is never covered.
  - `--sig-*` stays for states (✓, ✗, a problem).

**§6 The map: the full stack.** Status is *built*, *wave 1*, *wave 2* or *later*.

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

**§7 The teacher's scenes** — acceptance, T1–T10. John decides whether any join v1's.
- **T1 The triangle fills in.**
  - Draw a right triangle (one stroke, or three ruled lines) with the square in its corner, and type or write 3 and 4 beside the legs.
  - With the selection, *5* stands where the hypotenuse's label would go, in its colour, and the angles 36.87° and 53.13° stand at their corners.
  - A tap writes the 5, and one undo removes it.
  - Change the 4 to 5: the written 5 says ✗, and 5.83 is offered.
- **T2 SOH CAH TOA in colour.**
  - Write θ at a corner. The sides take the roles opposite, adjacent and hypotenuse, each in its hue.
  - *sin θ = 3/5 = 0.6*, *cos θ*, *tan θ* and *θ = 36.87°* stand beside the figure, each term in its side's colour.
  - Move the θ, and the roles and colours follow.
- **T3 The unit circle, and Jake's trig limit.**
  - Draw a circle on axes with a radius at angle x. sin x, cos x, tan x and the arc x stand as coloured segments.
  - Write `sin x / x`, and its value stands live.
  - Drag the radius toward the axis: 0.96, 0.99, 0.999 … and *lim x→0 sin x / x = 1* stands.
  - The squeeze, sin x ≤ x ≤ tan x, is drawn in their colours.
- **T4 Jake's limit, as the story tells it.**
  - Draw axes and a rough parabola. *y = x²* stands, and its clean curve lies under the ink.
  - Write `y = (x²−4)/(x−2)`. Its line stands with a hole at (2, 4).
  - Tap the hole: the approach from both sides plays, with y = 3.9, 3.99, 3.999.
  - The factoring stands as ghost steps, the common factor struck in one colour, then *= x + 2, x ≠ 2* and *lim = 4*. The cubic limit works the same way.
- **T5 The pendulum is alive.**
  - Draw a hatched ceiling, a rod and a bob. *a pendulum* is read.
  - *Play* swings it. *T = 2π√(L/g) = 2.01 s* stands, with L read from *1 m* written by the rod.
  - Write θ beside it, and its value runs live.
  - Draw an arrow from the pendulum to axes, and θ(t) is traced.
  - `x = L sin θ` updates live.
- **T6 Forces add up.** Arrows on a block, each with its label; the resultant stands as a dashed arrow, with its size and direction; equilibrium is said.
- **T7 A Feynman diagram.**
  - Draw e⁺e⁻ → μ⁺μ⁻. It reads as *a Feynman diagram — s-channel, two vertices, order α²*.
  - The particle labels are offered as ghosts.
  - A vertex that breaks charge is said.
  - TikZ-Feynman comes out.
- **T8 Teach it to a class.**
  - The answer waits.
  - The teacher's board is in a room the students follow, or each takes a copy.
  - Worked steps are checked ✓ ✗.
  - A worksheet prints with the answers waiting.
- **T9 Numbers by hand, with no model.** Digits and the dozen signs are read at once, on the device, feeding T1–T5 with no network.
- **T10 The whole stack on one board:** a figure, a function, a live pendulum and its plot, linked by names and colours.

**§8 The units.**
- **Reading.**
  - M8 numerals, read at tier 1.
  - M9 maths in two dimensions: powers, fractions, roots, subscripts — from glyph positions, the diagram rung's way.
  - M10 names on figures: a bare name attaches to a corner or side and enters the sheet's scope.
- **Knowing.**
  - M11 functions (`fn.ts`).
  - M12 polynomials and rational functions.
  - M13 limits.
  - M14 trig: roles from a named angle, and the unit circle read.
  - M15 algebra shown: factor, cancel and expand as ghost steps, with the common factor struck.
- **Offering.**
  - M16 the fill-in and its ghost layer.
  - M17 colour for relations.
  - M18 the answer waits.
- **Graphs.**
  - M19 the coordinate plane.
  - M20 the plot.
  - M21 a curve read and fitted.
  - M22 Jake's approach: a hole tapped, and the approach animated with its values.
- **Alive.**
  - M23 runners and the pendulum.
  - M24 a run's outputs in written maths, live.
  - M25 plots over time: an arrow from a run to a plane, RN8's first dataflow.
  - M26 more bodies: a spring, a projectile, an orbit; forces summed.
- **Science.**
  - M27 Feynman diagrams.
  - M28 Feynman in: a process written, then drawn.
- **Teaching.**
  - M29 a class in a room: students follow or take a copy, and the reveal reaches every screen.
  - M30 projector and worksheets.
- **Doors.** M31: the MCP hand reads the maths. `canvas_look` says the fill-ins and live values; Claude explains a step when the person asks, and never computes.

**§9 The ladder.**
- **Wave 1 (§6):** M16–M18, M11–M13, M19–M21, M23, M27 and M8.
- **Wave 2:** M10, M14, M15, M22, M24, M25, M9, M8's teach pane, and CS1 — offers at rest in general, with the `decline` event.
- **Wave 3:** M26, M28, M29, M30, M31, derivatives and integrals, number sense, forces.

**§10 What this is not.** It is still not a computer algebra system.
- The symbolic part is school algebra in one variable — polynomials and rational functions, the elementary functions — and limits by known methods.
- No general symbolic algebra, no proofs.
- No model ever computes.
- Not CAD.
- No entry dialog like a graphing calculator's: the function is written on the page.

**§11 John's decisions** (§9 below). **§12 Credits:**
- Sketchpad (1963).
- Chalktalk (Ken Perlin, NYU).
- The $P recognizer (Vatavu, Anthony and Wobbrock, 2012).
- TikZ-Feynman (Ellis, 2017).
- Colour-coded explanations of maths, such as Stuart Riffle's coloured DFT.

## 6. Wave 1 — six units to launch

### The contracts first (the integrator; one commit on `maths/wave-1`)

1. **`core/src/maths/fill.ts`: the fill-in record and its registry.** It is derived and never logged, and every
   source uses it:
   ```ts
   export type FillKind = 'value' | 'expression' | 'mark' | 'step';
   export interface FillIn {
     key: string;          // stable across paints: `${source}:${figureOrMarkId}:${quantity}`
     kind: FillKind;
     source: string;       // 'figure' | 'plane' | 'limit' | 'run' | 'feynman' | …
     text?: string;        // as it would be written: '5', '36.87°', 'sin θ = 3/5', '(x+2)(x−2)/(x−2)'
     points?: Point[];     // a mark's geometry in canvas units: a side, a curve, a hole's ring
     closed?: boolean; dashed?: boolean;
     at: Point;            // where its words stand, in canvas units
     from?: Point; away?: Point;   // M5's placement: the side's middle and its outward normal
     about: string[];      // the marks it concerns: the selection test and the halo
     quantity: string;     // what it is, for its colour: 'fig:<id>:side0', 'name:θ', 'fn:<id>', 'run:<id>:θ'
     reason: string;       // the formula with its inputs: '√(3² + 4²) = 5'
     answer: boolean;      // an answer that may wait on a board set to teach
     rank: number;         // 0–1, for the one quiet offer at rest
     take: { kind: 'text'; text: string; bounds: Bounds }   // a one-line text import, which numbersOf reads
         | { kind: 'strokes'; strokes: Point[][] }          // ink drawn in the taker's name
         | { kind: 'none'; why: string };
   }
   export interface FillSource { id: string; fillIns(state: SessionState): FillIn[] }
   export function registerFillSource(s: FillSource): () => void;
   export function fillInsOf(state: SessionState): FillIn[];  // every source; deduped by key; ranked; memoised on the log
   ```
   Tests come with it: the registry, deduplication, and one source that throws being left out.
2. **`compileFunction`'s shape.** Unit B exports it and unit C uses it:
   ```ts
   compileFunction(text: string, variable?: string /* 'x' */):
     | { ok: true; f: (x: number) => number | null; variables: string[]; text: string }
     | { ok: false; reason: string }
   ```
   Until B is merged, C tests with plain JavaScript functions.

### A — M16, M17, M18: fill-ins as ghosts, in colour (core and surface)

- **Owns:**
  - core `maths/fill.ts` (the figure source, on top of the contract), `maths/hues.ts` and `tools/fill.ts`;
  - core `maths/board.ts` and `maths/solve.ts`, only to expose a side's own marks and its quantity key, and to fix the *other leg* sentence;
  - a new surface fragment, `Demos/surface/25-ghosts.js`, plus one call in `render()` (`08-render.js`) and one branch in `tapAt` (`07-input.js`);
  - `25-maths.js` (an answer chip gives way to the fill-in that says the same thing) and `surface.css`;
  - a new gate scenario, `e2e/fill.mjs`, registered in `e2e/run.mjs`.
- **What:**
  - **The figure source.** Every value a solved figure derives that isn't written becomes a `value` fill-in: sides, all three angles, area, perimeter, a circle's r, d, C and A, an arc's measures.
    - Sides stand at the side chip's spot (`from + away × offset`), angles inside the corner's bisector, area at the centroid.
    - `about` is the side's own marks. `quantity` is `fig:<figureId>:<valueKey>`. The reason is the formula.
    - A value from the ink is weaker, and said *at the drawing's scale*.
    - For a conflict, its derived value stands beside the written one.
  - **The ghost layer.**
    - Values are written in the board's text face, at label size — not as pills — muted, in their quantity's hue. Marks are dashed, beneath the ink.
    - They show with the selection, while pointed at, for a moment after a change, and — the strongest one — at rest.
    - A halo in the quantity's hue lies under the ink of the marks it measures, while held or pointed at.
  - **Taking.** A tap runs `session.withTool('fill', () => session.import({kind: 'text', code, bounds}), key)` — one act, one undo. The maths then reads the value as written (`numbersOf`) and checks it from then on.
  - **The answer waits (M18).** A preference: ghosts show as *?* in their colour; the first tap shows the value, the second writes it.
  - **Hues (`hues.ts`).** Quantity keys become hues through KN3a (`placeHue`, `colourOf`), deterministic for the board (keys sorted, the board's kinds' hues avoided), on both grounds, checked for colour-blind eyes.
- **Red first:**
  - **Core.** A right triangle with 3 and 4 written as one-line texts by its legs:
    - offers *5* at the hypotenuse's spot, and the angles 36.87° and 53.13°;
    - taking *5* writes one text event, which `numbersOf` attaches to the hypotenuse; that fill-in is then gone and a check holds;
    - changing 4 to 5 makes the written 5 a conflict, with 5.83 offered.
  - **Hues.** Distinct quantities stay distinct for all four visions, and are stable across a replay.
  - **Gate.** The triangle drawn with the pointer and its legs typed; with the selection, the hypotenuse's ghost appears; a tap writes it; one undo removes it.
- **Checks:**
  - `cd core && npm test && npm run typecheck`;
  - both bundles rebuilt and copied to `Demos/`;
  - `node Demos/build-surface.mjs`;
  - `node e2e/run.mjs fill canvas walk`.
- **Invariant:**
  - the ink is never covered or recoloured;
  - nothing derived is logged;
  - no model is asked;
  - e2e 49's golden field offers are unchanged.
- **Trap:**
  - A ghost lying over another ghost or over ink: place them the way `renderExplanations` weighs its cards.
  - A taken value that attaches to the wrong side, where two sides' middles are close. Test the attachment.

### B — M11, M12, M13: functions, polynomials, limits — the Jake engine (core)

- **Owns:** new core files `maths/fn.ts`, `maths/poly.ts` and `maths/limit.ts`; and `maths/expr.ts` and `maths/quantity.ts` (the silently wrong fixes, angle units, display precision).
- **What:**
  - **`fn.ts`, maths with a variable.** It reads:
    - numbers;
    - names, Latin and Greek (θ φ α β λ ω);
    - `^` and superscripts (² ³ ⁿ);
    - `√` and `√(…)`, `π`, `e`;
    - the functions sin, cos, tan, asin, acos, atan, sqrt, ln, log, exp, abs;
    - implicit multiplication: `2x`, `x(x+1)`, `2(3+1)`, `2π√(L/g)`;
    - `/` and unary minus;
    - degrees (`sin 30°`) and radians;
    - `y = …` and `f(x) = …`.

    It exports `compileFunction` (the contract) and a tree printer (text now, TeX later).
  - **`poly.ts`.** Polynomials in one variable with rational coefficients:
    - built from a tree; expand, divide, gcd;
    - factor over the rationals: rational roots, quadratics, sums and differences of cubes;
    - rational functions cancelled — what is left is their holes (removable points) and poles.
  - **`limit.ts`.** `limit(tree, x, a, side?)` returns `{value, method, steps, approach?, reason}`, where method is `substitution`, `factoring`, `known` or `numeric`. In order, it tries:
    - substitution;
    - for 0/0 in a rational function, cancelling;
    - known limits: sin x/x, (1−cos x)/x, (eˣ−1)/x, (1+1/x)ˣ;
    - otherwise, numerically from both sides, with the approach given (1.9, 1.99, 1.999 → 3.9, 3.99, 3.999) and whether the sides agree.

    One-sided and infinite limits are said.
  - **The silently wrong lines in `expr.ts`.** Each is either read correctly through `fn.ts` or refused with a reason. The display shows enough digits to tell 1.9999 + 0.0001 from 2. Angle units (°, rad) go into `quantity.ts`.
- **Red first:**
  - `limit` of `(x^2-4)/(x-2)` at 2 is 4, *by factoring*, with the steps `(x+2)(x−2)/(x−2) = x + 2`;
  - sin(x)/x at 0 is 1, *known*, and confirmed numerically;
  - `factor('x^3-1')` gives `(x − 1)(x² + x + 1)`;
  - `compileFunction('2π√(L/g)')` evaluates, given L and g;
  - each silently wrong case goes red, then is read right or refused;
  - every existing maths test still passes, or each changed expectation is listed with its reason.
- **Checks:** core tests, typecheck, both bundles. The sheet's goldens (apron, tunic, triangle) are unchanged.
- **Invariant:** no model computes; exact where exact; MATHS-PLAN's six rules hold.
- **Trap:**
  - Changing `expr.ts` can break the sheet's plural readings (range or minus; precedence or left to right). Keep both readings where they were plural, and send to `fn.ts` only what `expr.ts` couldn't read or read wrongly.
  - When sampling, never evaluate exactly at a removable point.

### C — M19, M20, M21: the coordinate plane, plots, a curve read (core)

- **Owns:** `notations/plane.ts` (and its registration line in `notation.ts`), `maths/plot.ts`, `maths/fit.ts`, and `maths/fill-plane.ts` (fill sources, registered with `registerFillSource`).
- **What:**
  - **The plane.**
    - It is two long strokes (lines or arrows) crossing near-perpendicular, long against the marks around them.
    - Ticks are short strokes across an axis. Numbers at the ticks set each axis's scale: two numbers fix it, or one with the origin. Otherwise a default range is assumed and said.
    - Writing at an axis's end names it: x, y, t, θ.
    - It reads as *a coordinate plane 0.8*, and N1 says so. A point on the plane reads as its coordinates.
  - **`plot.ts`.** `plotOn(plane, f, {holes?, poles?})` returns polylines in canvas units:
    - sampled adaptively, split where the function breaks;
    - holes as open rings, asymptotes as dashed lines;
    - clipped to the plane's drawn extent.
  - **`fit.ts`.** A stroke on the plane is sampled in plane coordinates and fitted to a line, a parabola, a cubic, a sine, an exponential and 1/x.
    - The fits are ranked by residual over the plane's span, with a penalty for complexity: *a parabola, y = 0.98x² + 0.1, within 3% of the span*.
    - The rounded form (*y = x²*) is offered when it is within the drawing's precision.
  - **The fill sources.**
    - A curve on a plane gives an `expression` fill-in (its equation) and a `mark` fill-in (the clean curve beneath the ink: Jake's *renders it properly underneath his sketch*).
    - A function written near a plane gives a `mark` fill-in (its curve, with its holes). This one is wired through `compileFunction` once B is merged.
- **Red first:**
  - a plane drawn from two arrows, with ticks at 1 and 2, reads its scale;
  - a parabola stroke reads first as y = x²;
  - `plotOn(plane, x => (x*x-4)/(x-2), {holes: [2]})` gives one line with a gap and a ring at (2, 4);
  - the other notations' benches and the corpus read no plane above the floor.
- **Checks:** core tests, typecheck, both bundles.
- **Invariant:** derived and never logged; the ink stays; fits are plural, with their reasons.
- **Trap:**
  - Not every cross is a pair of axes. Crossing lines in a flowchart or a garment piece must not read as a plane — bench it.
  - Where the hand doubled back, a curve's samples aren't a function.

### D — M23: the pendulum is alive, Chalktalk's road (core and surface)

- **Owns:**
  - core `run/runner.ts` (RN4's contract, at its smallest), `physics/pendulum.ts`, `notations/pendulum.ts` (and its registration line), and `tools/run.ts` (*Play the pendulum*);
  - a new surface fragment, `Demos/surface/14-run.js`, plus one hook in `08-render.js`'s placement for a pivot and a placement per member;
  - a new gate scenario, `e2e/alive.mjs`.
- **What:**
  - **Reading.** A pivot — a short line with hatching, a dot, or the rod's top end alone — a rod (a line) and a bob (a circle or a filled dot) touching the rod's other end read as *a pendulum 0.8 — a rod from a pivot, a bob, drawn 20° from plumb*.
  - **Inputs.**
    - L comes from a number written beside the rod (m, cm, or the drawing's unit), else from the drawing's scale, else 1 m is assumed and said.
    - θ₀ comes from the rod's drawn angle. A rod drawn plumb is offered *pull it aside* (the drag is wave 2's).
    - g is 9.81 m/s².
  - **Physics.**
    - θ″ = −(g/L)·sin θ, by RK4 at 1/240 s, re-derived from t = 0 the way the tank is. Keep keyframes for scrubbing.
    - Outputs: θ(t), ω(t), x = L sin θ, y = −L cos θ, and the period.
    - The period is exact, by the arithmetic–geometric mean (AGM): `T = 2π√(L/g) / AGM(1, cos(θ₀/2))`. The small-angle `2π√(L/g)` is said beside it.
  - **The runner contract.** `registerRunner({id, reads(state, ids), inputs(scope, board), init, step(s, dt), outputs(s)})`.
    - The state is derived from the log, the inputs and t.
    - Runs have a step budget.
    - Outputs are addressable as `run:<id>:θ`.
  - **Play** uses the existing clock: *Play the pendulum* writes one `clock` play event, because nothing runs unblessed. Pause and reset work as the tank's do.
  - **The surface.** The rod and bob turn about the pivot each frame, with no events. T and the live θ stand beside it, as chips, or as fill-ins once A is merged. Esc stops it.
- **Red first:**
  - **Core.**
    - L = 1 m and θ₀ = 10° give T ≈ 2.0102 s, against 2.0061 s for small angles;
    - energy is conserved within 1e-6 over 100 s;
    - the reading holds for a drawn pendulum, and is weaker without a pivot;
    - nothing reads a pendulum in the corpus or the notation benches.
  - **Gate.**
    - a pendulum drawn with the pointer reads;
    - *Play* swings it — its drawn position changes from frame to frame with no new events;
    - Esc stops it;
    - after a reload it is paused.
- **Checks:** core tests, typecheck, both bundles, the surface build, `node e2e/run.mjs alive canvas`.
- **Invariant:**
  - time is never logged;
  - nothing runs unblessed;
  - the ink moves only at render time;
  - tier 1, no model.
- **Trap:**
  - The tank turns an artifact's members about one centre; the pivot must stay put.
  - A pendulum inside a blessed artifact.
  - Re-deriving long runs from t = 0 on every change to the log — keep a cache.

### E — M27: Feynman diagrams (core)

- **Owns:** `diagram/waves.ts`, `notations/feynman.ts` (and its registration line), `notations/feynman-tikz.ts`, `packs/shipped/feynman.ts` (`feynman@1`, and its registry line), and their fixtures and benches.
- **What:**
  - **`waves.ts`.** A stroke reads as wavy (photon, W, Z), curly (gluon: regular loops) or zigzag about a straight or gently curved axis when:
    - its period and amplitude are regular;
    - its amplitude is small against its length;
    - it has at least three half-periods.

    Dashed lines (Higgs, scalars) come from `notations/dashes.ts`.
  - **`feynman.ts`.**
    - **Structure.**
      - Vertices are where three or four line ends meet; external lines have one end free.
      - A fermion line is solid with an arrow: a barb at an end, or a chevron drawn on the line's middle, which is a new read.
      - The particle table, `FEYNMAN_TABLE`: e±, μ±, τ±, ν, the quarks u d s c b t, γ, g, W±, Z and H, each with its charge, lepton and baryon numbers, and line style.
      - Labels come from writing near a line.
      - Time runs left to right unless the lines say otherwise, and it is said.
    - **What it says.**
      - the process (*e⁻ e⁺ → μ⁻ μ⁺*);
      - the channel (s, t or u) for two-to-two;
      - the order, from the vertices: αⁿ for QED, αₛ for QCD;
      - tree or loop.
    - **Checks.** Charge and lepton number are checked at each vertex once particles are labelled; a break is said, with its vertex.
    - **Fill-ins** (through `registerFillSource`): a label is offered for an unlabelled line from its style and flow — γ on a wavy line between two fermion vertices.
  - **`feynman-tikz.ts`.** TikZ-Feynman out, for example:
    `\feynmandiagram[horizontal=a to b]{ i1 [particle=\(e^{-}\)] -- [fermion] a -- [fermion] i2 [particle=\(e^{+}\)], a -- [photon, edge label=\(\gamma\)] b, f1 [particle=\(\mu^{+}\)] -- [fermion] b -- [fermion] f2 [particle=\(\mu^{-}\)] };`

    Check the edge styles against the TikZ-Feynman manual, and compile with LuaLaTeX if the container has it. Otherwise say it is unverified.
- **Red first:**
  - four boards — e⁺e⁻ → μ⁺μ⁻ (s-channel), Møller (t), Compton and a gluon exchange — read with the right process, channel and order;
  - a vertex that breaks charge is said;
  - the TikZ for e⁺e⁻ → μ⁺μ⁻ matches a golden;
  - **the bench:**
    - 36 hands of the four, with seeded tremor at three sizes, read first;
    - the other notations' boards, the recognition corpus and lines of writing read as none above the floor;
    - no writing reads as a wavy line.
- **Checks:** core tests, typecheck, both bundles.
- **Invariant:** derived; the six roles hold (vertices are nodes, lines are edges); nothing enters the log.
- **Trap:**
  - Cursive writing oscillates. A wavy line is regular and long against its amplitude; writing is neither.
  - A loop's photon is an arc. Read the axis as a smoothed curve, not only as a straight line.

### F — M8: numerals read at tier 1 (core)

- **Owns:** a new core directory, `read/`:
  - `glyphs.ts`, the closed set: 0–9 . + − × ÷ = ( ) / √ π θ x y ° ′ ″ %;
  - `pointcloud.ts`, a $P/$Q matcher: resample, normalise, greedy matching of the point clouds;
  - `samples.ts`, built-in samples drawn from parametric definitions with seeded `handLike` tremor;
  - `numerals.ts`: strokes grouped into glyphs, ranked candidates, and a number as a run of digits on one baseline;
  - `numerals.bench.test.ts`.
- **What:**
  - **Reading only.** It is derived from the strokes, deterministic, plural (1 / 7 / l are said as such) and at tier 1, with no model.
  - **Design and report how readings reach the maths.** The direction: a derived reading the engine holds on a word, as the shape rung's readings are held, which `transcriptOf` and `wordsOnBoard` can take. It ranks below a person's correction and beside a model's.
  - **The person's own samples are wave 2's.** They are kept on the device and replayed into the log by an event, like the command mark's `teach`, so that replay stays deterministic.
- **Red first:**
  - synthesized digits and signs at 0.6×, 1× and 1.8× read top-1 ≥ 95%, and every class ≥ 90%;
  - the strokes of 4, 5, +, =, ×, ÷ and π are grouped into one glyph;
  - the drawing corpus and the notation benches read no digit above the floor, except digits' twins (0 / O / a circle, 1 / l / a line), which are said as ties.
- **Checks:** core tests, typecheck.
- **Invariant:** tier 1, no model, nothing logged. The shape rung and `words.ts` behave as before; their benches are unchanged.
- **Trap:**
  - A lone circle or line is a shape first. Read it as a digit only in a run of writing, or as a candidate label for a figure.
  - The arithmetic grounds the reader (MATHS-PLAN §5): *13 + 2 = 16* is a doubtful reading before it is a wrong sum.

### Shared files, and the order to merge

- **Registration lines are appended; keep every one at merge:** `core/src/index.ts`, `core/src/tools/builtin.ts`, `core/src/notations/notation.ts`, `core/src/packs/registry.ts`, and the scenario lists in `e2e/run.mjs`.
- **Generated files conflict every time:** `Demos/dynaink-core.browser.js`, `Demos/dynaink-core.node.mjs` and `Demos/session-engine.js`. Rebuild them from the merged source; never merge them by hand.
- **Otherwise each file has one owner:**
  - `board.ts`, `solve.ts`, `dimension.ts` → A;
  - `expr.ts`, `quantity.ts` → B;
  - `08-render.js` → A's render call and D's placement hook only, in different functions;
  - `07-input.js` → A's tap branch only.
- **Merge order:** B, A, E, then C (wire written functions through `compileFunction`), then D, then F. Or merge as they finish, as long as C comes after B.
- **If fewer agents can run at once, start A, B, D and E first,** then C once B has landed, then F.

## 7. How the lanes run

- **Agents.** Build agents are Sonnet, as John asked for wave 1 on 7 Oct; ask him whether the hardest units (F, E) should get Opus. One agent per unit, each in its own worktree:
  - `git worktree add -b unit/m16-fill ../lanes/m16 maths/wave-1`;
  - install the deps in each worktree: `cd core && npm ci`; and for a unit that runs the gate, `cd e2e && npm ci && npx playwright install --with-deps chromium` and `cd dynaink-3d && npm ci`;
  - never symlink `node_modules` (vite hangs on a symlinked one).
- **Bound every long command** (`timeout 900 …`). An agent reports; it never waits on a hung command.
- **Red first, then green.** Commits go on the unit branch with subjects that name the unit first (`M16: …`): the release script's `unitOf` groups by the first unit before the colon.
- **Agents never edit `CLAUDE.md`, `V1-SPEC.md` or `MATHS-SPEC.md`.** They report:
  - what they built, with file:line;
  - the numbers;
  - what was unclear;
  - what to document;
  - what they found.
- **The integrator:**
  1. Merges each unit into `maths/wave-1` with `--no-ff`, as "Merge M16: …".
  2. Rebuilds both bundles: `cd core && npm run build:browser && npm run build:node && cp dist/dynaink-core.browser.js dist/dynaink-core.node.mjs ../Demos/`.
  3. Rebuilds the surface (`node Demos/build-surface.mjs`), and the app if the page changed (`node scripts/build-app.mjs`).
  4. Runs the drift checks (`node Demos/build-surface.mjs --check`, `node scripts/build-app.mjs --check`, `node scripts/examples.mjs --check`).
  5. Runs core's tests and typecheck, the Node suites CI runs (`.github/workflows/ci.yml`), the MCP smoke (`cd core && node ../Demos/mcp-smoke.mjs`) and `cd dynaink-3d && npm test`.
  6. At the end, runs the full gate, `node e2e/run.mjs`.
- **Expect in a container:** the timing records skip by name (software rendering), and the Mermaid CDN may be unreachable (also skipped by name). One container run gave 873 passing and 12 skipped in 687 s.
- **Then write the docs:** CLAUDE.md's sections and its repository map, in the same commit as any structural change, and the units' status lines in `MATHS-SPEC.md`. Then report to John.

## 8. Rules that bind every session

These come from John; on the Mac they live in memories, which don't travel.

- **Privacy.**
  - John's notebooks, drawings and recordings — OneNote PDFs, Inkspace and whiteboard SVGs, his art, his voice — are private.
    - They never go in the repository: not as fixtures, screenshots or quotes.
    - Benches read them by path and print numbers only.
    - Nothing from them goes to a hosted model except by John's own act.

    They aren't in the cloud; don't ask for them.
  - The measurements and photos on John's wife's garment pages never enter the repo; fixtures use sample numbers.
- **Keys.**
  - Keys never reach GitHub. They live in browser memory, or in localStorage only when *remember* is ticked.
  - Never enter an API key, even a fake one bound for a real vendor. Never sign in or enter credentials.
- **The gate.** It runs only on its own origin, `http://127.0.0.1:…?fresh=1&nosw=1` (`__setup` refuses any other), and never on port 8020, which is John's room.
- **Rooms.** Never join John's live room. Agents run the MCP hand from the shell, in a scratch room on a free port (`Demos/mcp.mjs` with `MM_ROOM` and `MM_RELAY`), as the gate's `hand` scenario does.
- **Git.**
  - Never merge to master, push master, tag or release without John's word.
  - Push only with his word.
  - Leave the automation's `auto/*` branches alone.
- **Models.**
  - No model computes a number.
  - A model is asked only by a deliberate act.
  - When Claude sits in a seat as a simulation, that is always said, and it never counts as evidence about a real model (V1-SPEC §3.13).
- **Dev agents walk the doors** (V1-SPEC CG7). A unit that touches a door — an export, an import, a seat, an MCP tool — walks it through the MCP hand in a scratch room, and reports what the format was and what was unclear.
- **Design.**
  - Paper first; one face (IBM Plex Mono); colour is signal; ink is never covered.
  - **Not a whiteboard:** when a choice lies between imitating paper and doing what only a computer can, take the computer's, and keep the ink.
  - **Colour follows meaning:** no colour picker or mode before the first stroke, and no default legend or kinds.
- **Offers.** Eagerness follows cost:
  - anything free may offer unasked, at rest and within a budget;
  - anything metered only by a deliberate act;
  - each rung offers the next.
- **Writing.**
  - They/them for anyone whose pronouns aren't stated.
  - Plain words in anything a person sees.
  - Thresholds live in code, never restated in prose (CLAUDE.md, pitfall 4).

## 9. Open for John

1. **The trig example.** Is it the trig limit Jake saves for later (lim x→0 sin x / x = 1, on the unit circle), or another one?
2. **Land wave 1** (fast-forward `master` to `v1/wave-1`)? The maths push builds on its colour space either way.
3. **Role colours** (opposite, adjacent, hypotenuse): fixed across every board — *opposite is always this colour* — or placed for each board?
4. **A taken fill-in:** written text that the maths checks from then on (recommended), or a live value that follows its inputs?
5. **The answer waits:** a board's setting, or a device's?
6. **Agents:** Sonnet for every unit, or Opus for the hardest (numerals, Feynman)?

## 10. The first commands in the cloud

```bash
git fetch origin maths/wave-1 v1/wave-1
git checkout maths/wave-1
cd core && npm ci && npm test && npm run typecheck && cd ..
cd e2e && npm ci && npx playwright install --with-deps chromium && cd ..
cd dynaink-3d && npm ci && cd ..
node e2e/run.mjs app
```

Then go on from step 3 of *The next steps*, at the top of this file.

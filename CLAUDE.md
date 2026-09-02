# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MetaMedium** is a recombinatorial drawing system: interfaces that learn user
vocabularies, recognize compositional patterns in real-time, and evolve through
use. Strokes are grounded geometrically (fingerprints, spatial graphs), users
name what they draw, names compose recursively, and LLMs interpret over that
grounded substrate ("AI as meta-word" — see the interactive whitepaper at
`index.html`, published at https://jjh111.github.io/MetaMedium/).

The canonical loop that proves the thesis: draw circle → save as "bubble" →
draw 3 bubbles + 2 lines → save as "molecule" → system recognizes "molecule"
automatically → ask "why?" and get grounded reasoning.

## Current Status & Plan

**See `MVP.md`** for the product being built — *ink over living artifacts*.
**See `KEYFRAMES.md`** for the three rungs every mark climbs
(shape → diagram-shape → code), each with a closed vocabulary — **built**.
**See `ROADMAP.md`** for status and the August 2026 accounting.
`ARCHITECTURE-v7-PARTICIPANTS-AND-TIERS.md` is the active engine plan; MVP.md
absorbs and raises its Stage D.

Headline: **the MVP loop runs end to end.** Draw boxes on an infinite canvas,
circle them, cross with a command mark *you taught the system*, prompt them into
a living page that renders in the canvas with your ink still outlining its
divs — then draw on that page and the ink addresses the regions underneath it.
Scratch anything out to erase. `Demos/session-engine.html` is the surface;
`Demos/session-engine.e2e.js` drives all 53 steps through the real UI: page, flowchart, handwriting, the model drawing, and the user-side loop.
v7 Stage E (handwriting) shipped 1 Sep 2026: a word written beside a shape is read by a
model that can see and offered as that shape's name. Whitepaper v5.1 stays parked until the
conversation benchmark passes end to end.

Architecture documents (chronological; **read MVP.md, then v7, then v6**):
- `MVP.md` — **the product definition**: infinite canvas, a learned command mark,
  drawings prompted into living code, and ink that addresses what's under it
- `KEYFRAMES.md` — **the three keyframes, built**: shape → diagram-shape →
  code, each a closed vocabulary; the mappings between them are tables
- `ARCHITECTURE-v7-PARTICIPANTS-AND-TIERS.md` — **active plan**: putting a model in the loop through the `propose` channel; the conversation benchmark; one OpenAI-compatible transport for Ollama/LM Studio/OpenRouter
- `WHITEPAPER-v5.1-PLAN.md` — **the package**: what the whitepaper shows vs. what the engine does, replays-as-figures, the demos as the paper's spine, the prose pass, and the palette decision John owns
- `ARCHITECTURE-v6-SESSION-ENGINE.md` — **active design**: the no-modes session engine (deferred commitment, summoning, promotion ladder, capability tiers), implemented in `metamedium-core/`
- `metamedium-core-schema.md` — graph data model ("everything is a node; type emerges from connections") — load-bearing via v6
- `ARCHITECTURE-v5-UNIFIED-ENGINE.md` — partly superseded by v6; still the reference for the deferred MoE-routing and embedding-space work
- `archive/PRD-v4-LLM-Grounded.md` — **archived**; still the spec for the tiered escalation (Tier 0 heuristics / Tier 1 light LLM / Tier 2 Claude) and the unbuilt MCP server

`EXPERIMENTS.md` covers the side tier (lens-canvas, v2-poc, vision/LLM PoCs,
the explainer video) and what each one feeds back into the platform.

## Repository Map

This table is the **single inventory of the repo** — README.md and ROADMAP.md
link here rather than keeping their own lists. Update it in the same commit as
any structural change.

### Platform (the project proper)

| Path | What it is |
|---|---|
| `metamedium-core/` | **The canonical engine** (TypeScript, zero deps, tested): geometry, recognition (the shape rung), relations, the diagram rung (`src/diagram/`), concepts, the no-modes session engine, the layout and graph parsers, and the LLM transport. New recognition/engine work lands HERE |
| `index.html` | **Interactive whitepaper v5** "MetaMedium: AI Beyond Chat" (live on GitHub Pages) |
| `doodle2-canvas.html` | **Flagship demo**: heuristic recognition, spatial graph, library, undo/redo, touch. No LLM. Single-file (~500KB) |
| `metadoodle1.html` | Fork of flagship + tiered LLM recognition (WebLLM in-browser, LM Studio local API) + voice. Single-file (~600KB) |
| `Web App Skeleton/` | React + Vite + TypeScript + Zustand rebuild; Claude API interpreter skeleton in `src/llm/`; recognition/spatial/matching in `src/core/` |
| `Demos/` | **`session-engine.html` is the MVP surface** — infinite canvas, the taught command mark, living artifacts in a DOM overlay, ink-over-artifact addressing, "why" inspector, model participants, canvas answers. Uses the committed `metamedium-core.browser.js` bundle. **`session-engine.e2e.js`** drives the whole loop through the real UI with a stubbed model (browser console; not part of `npm test`). `build-standalone.mjs` inlines the bundle into a single shareable file. Plus fish, composition diagrams, no-modes graph, etc. |
| `skills/` | Claude Code skills: `metamedium-code` (code patterns), `metamedium-design` (design principles) |
| `Assets/` | Figures and design rationale (recognition strategy, point-primitive proposal) |
| `archive/` | Retired versions and superseded plans, incl. whitepaper v4 (root `MetaMedium_Whitepaper_v4.html` is a redirect stub — keep it) and PRDs v3.2/v4 |
| `.github/workflows/ci.yml` | CI: typecheck + test + build for `metamedium-core` (incl. a bundle-drift check) and `Web App Skeleton`, on every push/PR |

### Experiments (subordinate tier — see `EXPERIMENTS.md`)

Cheap, forked, allowed to re-implement. They de-risk platform bets; they are
not the product. Each entry's rationale and what it feeds back lives in
`EXPERIMENTS.md`.

| Path | What it probes |
|---|---|
| `lens-canvas/` | Infinite canvas, `LensNode` graph, confidence-scored lens routing — a running prototype of the deferred MoE router and the "type emerges from connections" model. Vite + vitest (19 tests). **Not in CI** |
| `v2-poc/` | Drawing-responsive text reflow (chenglou/pretext) — the figure Whitepaper v5.1 is built around. `src/main.ts` + committed `bundle.js` |
| `test-vision.html` | VLM path (Qwen3.5): image-in instead of structured-geometry-in. The control case for the grounded-not-pixels commitment |
| `test-llm.html` | Standalone LLM harness |
| `manim-explainer/` | ~50s explainer video. Source + stills tracked; renders and `media/` cache gitignored (regenerate from the scripts) |
| `playground.html` | Personal sandbox on the personal-site design language |

**Known duplication:** recognition logic still exists independently in
`doodle2-canvas.html`, `metadoodle1.html`, `Web App Skeleton/src/core/`, and
`v2-poc/bundle.js`. As of June 2026, **`metamedium-core/` is the canonical
source** (geometry/recognition ported from the Web App Skeleton with
behavior-identical tests). Land improvements in core; the legacy copies
converge onto it per ROADMAP.md and should not receive new logic.

## Architecture

### Core Data Model

Strokes are arrays of points; a parallel `context` array records what each
stroke is recognized as. Unnamed strokes use placeholder `'art[n]'`.

```javascript
strokes = [[{x, y}, ...], ...]   // raw input (some demos add t, pressure)
context = ['circle', 'line']     // 1:1 with strokes
```

The library stores named items: user primitives (with fingerprints), and
compositions (with components + spatial graph). `basedOn` references make the
library hierarchical.

### Recognition Engine

> **Source of truth: `metamedium-core/src/recognition.ts` and
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
hull), not the axis-aligned bounds: against those, a box tilted ten degrees
filled ~80% and lost its snap offer, and at fifteen read half as a triangle.
A hand rarely draws square to the screen.

**The shape rung is closed: eight entries.** `line`, `arc`, `triangle`,
`rectangle`, `circle`, and — because the rung above cannot do without them —
`arrow` (a straight shaft with a barb: an edge with no arrow has no direction),
`text` (writing, *without reading it*: open, turns many times, low and wide,
mostly-empty box — enough to make a mark a `label`), and `dot`. **Below the
hand's resolution (`HAND_RESOLUTION_PX`) only `dot` is offered**: a 5px blob has
no measurable geometry, and reporting "circle 0.85" for it would be sensor noise
dressed as evidence. A detector may return `meta` beyond its label — an arrow's
tip and tail — which the session keeps as a `reading:<type>` rep so the rungs
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

### The maths of a mark

> `metamedium-core/src/session/measure.ts` — `measure(node, nodes)`, `describeMaths`.

What follows from a reading, as numbers: a circle's centre, radius,
circumference and area; a rectangle's sides, perimeter and area; a line's
length and heading; an arrow's direction; a triangle's angles (acute / right /
obtuse) and sides; an arc's radius and sweep. Measured from the clean form the
mark carries or would be offered, so it is the maths of the *shape*, not of the
wobble. It is arithmetic on a reading, not a reading — no confidence and no
candidates — and writing has none. The inspector shows it as *the maths*; it is
the one thing the 2025 prototype did that the engine had dropped.

### Clean forms: a confident reading, redrawn

> `metamedium-core/src/session/clean.ts` — `snapReading`, `idealize`,
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
- **Built from the ink's own measurements**, never a template: bounds, the
  three sharpest corners, the arrow's tip and tail, the arc's bulge. A slight
  oval stays an oval. `text` has no clean form — handwriting redrawn as a box
  is a lie about what was written.
- **Zero wrong snaps over the whole corpus** is pinned in `clean.bench.test.ts`,
  alongside ≥95% offered for every drawable shape and 0% for writing.

In the surface the offer is a dashed ghost under each qualifying mark; the rail's
*Snap N* button, the palette's *Draw them clean* (Tier 0, and the summon stays
open so the next offer is taken from the cleaned marks) and the inspector's
*draw it clean* take it up. `snap · offer / auto / off` is a device preference;
*auto* takes the offer as you draw, never for a stroke the grammar is still
deciding about. A held lasso is never offered.

### Gestures: taught, and relational

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
samples and offers *Forget*; teaching a new one means *Clear* first.

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

**A held loop says what you can do with it.** Circle some marks and a chip
appears beside the loop: *N circled · cross with ✓, or* **Draw them clean** /
**What could these be?**. The second reaches the same summon the mark does
(`session.summonHeld`, a `summon` event); the first snaps the circled
candidates and keeps the loop held. The mark stays the fluent path; the chip
is the discoverable one, because a grammar nobody can find is a mode with
extra steps. The rail's *Snap* button scopes to the circled marks while a
loop is held, and in `auto` every open offer is taken after each stroke —
including a closed stroke that was a loop-in-waiting until the next stroke
settled it, which the per-stroke version silently skipped.

**The mark reads BACKWARDS.** Requiring a lasso before the mark can act is a
mode wearing a different hat. The command mark looks back over
`recentWindowMs`: the marks it crossed are what you pointed at, and anything
drawn alongside them just now comes with it. An explicit circle still wins, and
`Summon.scopeSource` (`lasso` / `crossed` / `recent`) plus `scopeReasoning` say
which way it decided, so a wrong guess is visible before you act on it.

**Erasing is relational, not gestural** (`src/session/erase.ts`): count
crossings between the stroke and the target's own outline; three erases it. No
speed, density, or size constant to tune, zoom-invariant, and it degrades
honestly — a line drawn *through* a shape crosses twice and is safe. Two rules
keep it safe: a **closed** stroke is never a scratch (it is a lasso), and
scratch targets are **ink**, never artifacts.

### Parsing: the drawing as a layout

> `metamedium-core/src/parse/` — `layout.ts` reads it, `scaffold.ts` builds from it.

Regions alone are a bag of rects, and a model handed pixel rects writes
absolutely-positioned divs: a faithful tracing of the ink that is not real code.
`parseLayout` runs a **recursive XY-cut** (the document-layout algorithm) over
the regions — find a gap that runs clean across the group, split there, recurse
with the axis flipped — turning four boxes into
`column(header, row(left, right), footer)` with the proportions that were drawn.
Containment the human drew is honoured first; marks that overlap in both
directions fall back to `stack`.

`buildScaffold` renders that tree as **flexbox with proportional growth**: exact
at the size it was drawn, and still code that reflows. Two rules earned the hard
way, both by running a real model:

- **The element carrying `data-region` is pure geometry.** Everything the model
  styles lives one level inside it. With `box-sizing: border-box` a
  `flex-basis: 0` item cannot be smaller than its own padding and border, so a
  padded region starts ahead of its siblings and the whole column shifts.
- **`min-width`/`min-height` are zeroed on every flex ITEM**, not just
  containers — their default is `auto`, so a region with a long list in it
  refuses to shrink and pushes everything else out of place.

`validateRegions` checks the result still matches the drawing. A promise nobody
checks is one you find out about from a screenshot.

### Living artifacts

An artifact may carry a `'code'` rep, which puts it on `SessionState.live` and
makes it render as real DOM in the canvas. The rules:

- **The engine owns structure; the model owns content.** Generation asks for
  per-region `html`/`tag`/`style` plus a theme, and says the layout is already
  decided. Asked instead for a positioned page, a real local model returned good
  copy and *no positioning at all* — so the geometry is an invariant now, not a
  request (MVP.md §6.2).
- **The drawing is the brief.** Beside the layout tree the model gets
  `describeReading()` (`participants/serialize.ts`) — genre, what each region
  *plays*, the engaging relations between regions, the concepts they read as,
  and any names the human gave — **in region ids**, the same names the layout,
  the reply and the DOM use. Concepts are matched per scope and a container is
  not a peer of its contents, so each container's contents are read on their
  own too (`WITHIN CONTAINERS:`), or the row inside a frame is invisible. A
  label is handed over as handwriting the model cannot read and must title;
  "a page" is told to infer a subject from the structure rather than write
  placeholders. `ask` and `interpret` get the same brief for a group.
- `regionsOf(artifact, nodes)` returns member marks in **reading order**
  (top-to-bottom, left-to-right, containers before contents), because region ids
  are how the human, the model and the DOM refer to the same thing.
- A closed stroke drawn **on** a live artifact is lasso-like even enclosing no
  mark — it encloses a *region*. `Summon.onArtifact` reports which artifact and
  which regions, so ink over a running page addresses real elements.
- `agent.generate()` is **one method for build and revise**, because it is one
  gesture; whether the artifact already carries code decides which.
- Every version is held and attributed. Rendering the newest is a display
  choice, not a commitment.
- A **broken** artifact leaves the live plane: code is a contract with the marks
  that framed it, and a page rendering over erased ink is the silent phantom
  degradation exists to prevent.

### Relations and concepts (Tier 0)

> `metamedium-core/src/relate/relations.ts` and `src/concepts/concept.ts`.

**Relations** are what the canvas can SEE between marks: `contains`/`inside`,
`crossing`, `touching`, `near`, `above`/`below`/`left-of`/`right-of`,
`same-row`, `same-column`, `same-size`. Two rules:

- **Every threshold is a ratio of the marks' own size**, never a pixel count.
  Nearness is judged against the *smaller* mark, so a dot two hundred pixels
  from a large box is not near it.
- **Relations carry strength**, so a crisp row can be told from a rough one.

**Concepts** are the meaning-mappings, kept as a library rather than as code
paths: `row`, `column`, `frame`, `flow`, `grid`, `labelled`. Each is a name, a
predicate over relations, and a list of `conversions` it affords. They match
plurally and rank by confidence, like every other reading in the engine.

**Alignment is a concept's confidence, not its gate.** A `row` that required
marks to already sit on a clean line would only fire on drawings that need no
tidying — exactly backwards, since offering to line them up is the most useful
thing it can do. What makes a row is peers sitting beside each other sharing a
band; how straight they are is how sure the reading is, and it says so
("roughly lined up", "not lined up yet"). Adjacency must hold between
*neighbours*, not on average.

**Tier 0 conversions need no model**: `session.tidy()` lines marks up and spaces
them evenly across the span already used, or matches sizes to the largest. Ink
is never destroyed — the original stroke is untouched and the mark gains a
`'transform'` rep, so undo springs it back exactly.

### The diagram rung: what a mark PLAYS

> `metamedium-core/src/diagram/roles.ts` — KEYFRAMES.md §2–3.

Shape says *rectangle*; this rung says *container*. It is the link between
seeing a shape and writing a div, and it is a **closed vocabulary of six**:
`container`, `node`, `edge`, `label`, `annotation`, `unclassified`. Roles are
placed by a nine-row **table** over shape + relations + wires, read top to
bottom, first match wins — and a mark no row places is `unclassified`, *said out
loud*. Two decisions the table forced: a lone closed box is a `node`, not a note
(you draw boxes before you connect them); and "relates to nothing" means no
*engaging* relation (`near`/`touching`/`crossing`/`contains`) — a note in the
margin can be the same size as a box on the page and still be in the margin.

**A drawing has a genre** (`genreOf`): boxes tiling a space are a `layout`,
nodes joined by edges are a `graph`, a graph inside a container is `mixed`.
The genre picks the code target: `parse/layout.ts` (flexbox that reflows) or
`parse/graph.ts` (nodes at their drawn positions, edges as SVG paths following
the drawn ink, cut at the tip so the head sits where the arrow pointed).

**Concepts are built on roles**, not shapes: a `row` is a run of `node`s, a
`frame` is a `container` and what it holds, a `flow` is `node`s joined by
`edge`s — and gets its direction for free. `session.read(ids)` returns the
relations, roles, genre and concepts together; the inspector's **ladder**
(ink → shape → plays → code) is that reading, per mark.

### Spatial Graph — retired

The old spatial graph (`spatial.ts`, with its fixed 50px "touching") is gone.
`src/relate/relations.ts` is the one relation system: the session records its
measured, scale-free relations on the node graph, clusters over them, and infers
wires (`connects`, plus `points-from`/`points-to` for arrows) with a tolerance
relative to the target's own size. Legacy copies still exist for reference in
`Web App Skeleton/src/core/spatial.ts` and `doodle2-canvas.html`.

### Tiered LLM Interpretation

> **Status (Aug 2026): Tiers 1–2 are live in the engine.** A model joins via
> `createAgentParticipant()` and proposes through the same channel a human uses.
> Design: `ARCHITECTURE-v7-PARTICIPANTS-AND-TIERS.md`.
>
> **Multi-interpretation is a hard rule, not a nicety.** Models are asked for
> *several* readings, several models can answer in the same tier, and **all
> tiers show at once** — a confident Tier 2 reading never evicts Tier 0's. The
> old "escalate only on low confidence" policy is withdrawn: escalation means
> suppression, and disagreement between sources is exactly what the human wants
> to see. Read with `interpretationsOf()` / `byTier()` / `bySource()` /
> `disagreement()`; `topInterpretation()` is a headline helper, not the truth.

- **Tier 0:** engine heuristics (always available, offline) — **built**
- **Tier 1:** local model via Ollama (`localhost:11434/v1`) or LM Studio (`localhost:1234/v1`) — **built**
- **Tier 2:** hosted model via OpenRouter or Anthropic, bring-your-own-key — **built**
- **Tier 3:** structural proposals (growing what the board can know) — reserved

Tier is derived from the provider by `providerTier()` (localhost → 1, hosted →
2) and carried on the participant node via `join(kind, name, at, capability)`.

**Answers are nodes, not chat.** `session.answer()` places an explanation in the
canvas, anchored to the marks it is about and attributed to whoever said it.
Explanations are a **third plane** (`SessionState.explanations`) beside content
and gesture: visible and erasable, but not ink — they never join a lasso, a
cluster, or a signature. Several participants may answer the same question and
every answer is held.

**Routing** (`src/participants/router.ts`): Tier 0 answers first, and a model is
asked only for what it cannot do. `route(ability, state, {concepts})` reports
`settledLocally` when the engine already has the answer — "the engine knows
this" beats a spinner, and "nobody here can do that" beats silence. It is not a
fallback chain: every candidate is returned, ranked cheapest-first, because
several participants answering at once is the point.

**A participant can be answered by hand** (`src/participants/bridge.ts`). The
transport is injectable, so a bridge is not a new kind of participant — same
prompts, same parsing, same `propose()` channel, with the question parked
instead of posted. Any model can take part, including one with no HTTP API. It
is also the honest test of the serializer: if a capable reader cannot make sense
of `describeSession`, that is worth knowing before blaming a small local model.

**One transport covers Tier 1 and most of Tier 2:** Ollama, LM Studio, and
OpenRouter all speak the OpenAI-compatible `/v1/chat/completions` shape and
differ only by base URL and key. Anthropic needs its own client.

**Running against a real local model taught four things** (all in the transport):

- **Local gets a 300s timeout, hosted 60s.** A cold 14GB model takes past 30s to
  answer at all; abandoning it wastes the load and reports failure to a user
  whose machine is fine.
- **Calls are cancellable, and the human's request outranks a speculative one.**
  A local server answers one at a time, so an automatic reading sat in front of
  whatever the user typed next.
- **Model replies need repair before parsing.** Strict JSON first, always — but
  devstral writes JavaScript template literals when the values are HTML full of
  quotes. `parseFill`/`parseReadings` repair, never guess.
- **`listModels` reports whether it could ask**, separately from what came back.
  Ollama serves the browser directly; no CORS configuration is needed.
- **Reasoning is stripped in the transport** (`stripThink`): qwen3 and its
  relatives think inside `<think>…</think>`, and a brace in there is exactly what
  the tolerant JSON readers downstream would latch onto.

**The surface's chrome** (`Demos/session-engine.html`): the panel that reports
on the last or hovered mark tucks under the title, scrolls, and collapses as
a whole (*details ▾*, remembered per device; closed by default on narrow
screens). Its labels are plain — *mark*, *reading*, *read as*, *maths*,
*measured*, *selection*, *roles*, *relations*. Scrolling **pans**; a pinch or
ctrl/cmd + wheel **zooms** — the trackpad convention every infinite canvas
uses — and the rail and keyboard still zoom for a mouse. Touch: one finger
draws, two fingers pinch and pan; on a phone the rail wraps, the zoom row is
hidden (pinch does it), and the held-loop chip wraps to fit.

**The model pane** (`Demos/session-engine.html`) follows what the personal
site's search bar learned (`johnhanacek/scripts/search-core.js`): it probes
**both** local servers in parallel (returning on the first that answered hid a
running Ollama behind LM Studio), lists models per server, **hides
embedding-only models and says so** (an Ollama holding only `nomic-embed-text`
used to show nothing and explain nothing), and **remembers the pick as a
preference** — honoured when that server still offers that model, quietly
ignored otherwise. Hosted providers and a custom OpenAI-compatible endpoint
join by key; the key is remembered only when asked. The palette's "Describe
it…" opens this pane when no model is present: the escalation, made visible.
Model participants are surface-side (`agents[]`); the session keeps every
`join` in its history, so leaving only stops a model being asked.

⚠️ `Web App Skeleton/src/llm/claudeInterpreter.ts` pins `claude-3-haiku-20240307`
and `claude-sonnet-4-20250514` — **both are past retirement and return 404**.
Retarget to `claude-opus-5` before trusting that file (thinking is on by
default there, so leave `max_tokens` headroom).

### Handwriting: the one thing sent as pixels (v7 Stage E)

> `agent.read()` in `participants/agent.ts`; `transcriptsOf` / `transcriptOf` in
> `session/nodes.ts`; `inkImage` / `readWriting` in `Demos/session-engine.html`.

A mark the shape rung reads as `text` is rendered **on its own** — its ink,
dark on a light ground, nothing else on the board — and handed to every joined
model that can **see** (`ProviderConfig.vision`). The reply is held on the mark
as `transcript` reps: several when the writing is ambiguous, each attributed
and ranked, none blessed. This is the deliberate exception to "grounded, not
screenshots": the ink *is* the ground truth of what was written and no
fingerprint carries it, so the model is asked to *read*, not to interpret.

- **A model that cannot see is never asked.** The pane relays what each server
  says: Ollama lists `vision` among a model's capabilities, LM Studio types the
  model `vlm` on `/api/v0/models`. Joined models marked *sees* read
  automatically; with none present, writing stays `text` and the inspector says
  what it would take.
- **The word becomes the offer to name with.** A label with a transcript puts
  *Name it "Pricing"* at the top of the palette (Tier 0, since the reading is
  already held) — write a word beside a shape and it becomes that shape's name,
  which was Stage E's ship criterion.
- **The words reach the brief.** `describeReading` says *the human wrote
  "Pricing" there — use those words* instead of *handwriting you cannot read*.
- **One stroke per word, for now.** The `text` detector reads a single cursive
  stroke; grouping printed letters into a word is not built.
- `propose()` carries `reps` as well as edges, so a transcript is held through
  the same channel as every other reading and undo drops it.

### The model holds a pen (the conversation benchmark's other half)

> `agent.draw()` in `participants/agent.ts`; `strokeFor` / `parseShapes` in
> `session/synthesize.ts`; *Ask it to draw…* in the palette.

A model contributes **marks**, not only words. It says what it would add in
the shape rung's closed vocabulary — rectangle, circle, triangle, line, arrow,
with coordinates in canvas units — and the engine draws each one through
`addStroke` **attributed to the model**, so the mark gets the same fingerprint,
readings, snap offer and eraser as a human's, and the surface colours it as the
model's. Its `why` for each mark is placed beside it with `session.answer()`,
so the reason is visible and erasable too. **A drawn shape is declared
content** (`addStroke(…, { content: true })`): it is never read as a lasso, a
command mark or a scratch, because those are commitments and no tier commits —
the first real run had a model's arrow cross a box three times and erase it.
The rule is about what was declared, not who drew it; an agent driving
`addStroke` without the flag can still gesture (v6 same-class citizenship).
The vocabulary is closed on purpose:
a model that can only draw what the canvas can read makes marks the human can
argue with on the same terms as their own. `parseShapes` drops anything outside
it and caps the count (`MAX_DRAWN`). The brief it draws from is the same one
generation gets, plus the measured span of what the human pointed at.

**The rules that make tiers safe:** LLMs receive structured geometric data
(fingerprints, spatial graph, library context) — **not screenshots**. Every
tier *proposes*; no tier commits — a model's output is an unblessed, attributed
edge that the human blesses or ignores. LLM calls must never block drawing;
degrade to Tier 0, never gate on a tier.

## Working with the Codebase

### metamedium-core (the engine — start here for recognition/engine work)

```bash
cd metamedium-core
npm install
npm test         # full suite incl. the canonical-loop scenario (keep green)
npm run typecheck
npm run build    # ESM + d.ts → dist/
npm run build:browser  # IIFE bundle; a copy is committed at Demos/metamedium-core.browser.js
```

After engine changes, rebuild the browser bundle and re-copy it to `Demos/`
(`Demos/session-engine.html` is the live reference surface) — CI fails if the
committed copy drifts from source.

`src/session/session.scenario.test.ts` is the executable spec for the
no-modes flow (lasso → check → summon → bless → artifact). Change it knowingly
or not at all. Design rationale: `ARCHITECTURE-v6-SESSION-ENGINE.md`.

### Standalone HTML demos

Self-contained single files (inline CSS + JS). Edit directly; test with
`python -m http.server 8000`. They are large — read selectively (search for
function names / UI strings) rather than loading whole files.

### Web App Skeleton (React/TypeScript)

```bash
cd "Web App Skeleton"
npm install
npm run dev      # development server
npm test         # vitest (geometry, recognition, spatial — keep green)
npm run lint     # 0 errors required; `any` warnings allowed until core extraction
npm run build    # typecheck + production build
```

Structure: `src/components/` (Canvas, SuggestionPanel, LibraryPanel, …),
`src/core/` (recognition, spatial, matching), `src/llm/` (heuristic + Claude
interpreters), `src/types/`, `src/test/` (synthetic stroke generators for
tests). Recognition changes must keep the vitest suite green — it encodes the
thresholds, which is why no document restates them.

### Experiments

See `EXPERIMENTS.md` for what each one is for. Two have real toolchains:

```bash
cd lens-canvas && npm run dev   # Vite on :5173; npm test → 19 vitest tests
cd v2-poc                       # esbuild; src/main.ts → bundle.js (committed)
```

`v2-poc/src/main.ts` was recovered and committed in August 2026 — an old
`.gitignore` rule had hidden it, leaving only the built `bundle.js`. Both are
in the repo now.

## Technical Specifications

**Performance targets:** drawing latency <16ms (60fps); heuristic recognition
<50ms per stroke; LLM tiers asynchronous and non-blocking.

**Data limits:** max 500 points/stroke, 50 strokes/composition, composition
depth 5, library 100 items.

**Artifact sandbox:** live artifacts render with `sandbox="allow-same-origin"`
and deliberately **not** `allow-scripts` — same-origin is what lets ink
hit-test into the artifact's DOM, and granting both is the known escape. See
MVP.md risk #5.

**Browser support:** Chrome 100+, Safari 15+, Firefox 100+. Touch + mouse.
WebLLM features require WebGPU.

## Design System

Two palettes coexist **by intent** — the split is by brand, not drift. Don't
"fix" one to match the other.

| Surface | Palette | Type |
|---|---|---|
| Whitepaper (`index.html`) | **light paper**: `#f8f6f1` paper · `#1a1a2e` ink · `#e63946` accent · sketch blue/green/purple | DM Sans |
| `Demos/`, flagship demos | `#0a0a0f` bg · `#e8e4d9` text · `#c9a84c` gold | Space Grotesk |
| `lens-canvas/`, `manim-explainer/`, `playground.html` | `#020a12` sea-deep · `#7dd8f7` cyan · `#d4af37` gold | JetBrains Mono |

The third is the personal-site (johnhanacek.com) language. The whitepaper is
the one light surface; the demos it embeds are dark, and that contrast is a
known seam (see `WHITEPAPER-v5.1-PLAN.md`).

Recognition feedback (whitepaper/demos): accepted `#0066ff`, pending `#666666`,
high confidence green, medium confidence orange.

> 📌 **Pinned:** a deliberate MetaMedium style is still to be defined (John has
> one in mind). Until then treat the whitepaper palette as *current*, not
> *decided* — and keep the two systems separate.

## Development Philosophy

- **Ship something visible weekly** — no infrastructure-only weeks
- **Simple first** — build the simplest thing that works; refactor when patterns emerge
- **One core, many surfaces** — recognition logic belongs in `metamedium-core`; demos consume builds
- **Progressive enhancement** — heuristics always work offline; LLM tiers enhance, never gate
- **Experiments feed the platform** — they may fork and re-implement to move fast, but a proven idea lands in core with tests, and experiments never become the focus (`EXPERIMENTS.md`)
- **One definition, one home** — a threshold, a palette, or an inventory lives in exactly one place; everything else links to it
- **Keep CLAUDE.md current** — update it in the same PR as any structural change

## What to Preserve When Evolving

- Fingerprinting system and geometric utilities (expanded, not replaced)
- The `context` array (kept for compatibility as `components`/`basedOn` grow)
- Published URLs — retire old demos to `archive/` with redirects, never break links
- The whitepaper's claim-to-demo honesty: only link demos that actually show what the text claims

## Common Pitfalls

1. Don't fork the monolithic demos again — converge on the core (ROADMAP.md)
2. Don't let LLM calls block the drawing loop
3. Don't over-engineer ahead of a shippable demo (MoE/embeddings are deferred — see ROADMAP.md)
4. **Don't restate thresholds in prose.** They lived in ten documents and
   drifted; this file's own copy went stale twice. Cite
   `metamedium-core/src/*.ts` instead. The one intentional mirror is
   `skills/metamedium-code/skill.md`, which Claude Code loads standalone —
   re-verify it against the engine when recognition changes
5. The legacy monoliths (`doodle2-canvas.html`, `metadoodle1.html`,
   `Web App Skeleton/src/core/`) still carry their own diverged recognition
   copies. Read the file you're editing; land new logic in core

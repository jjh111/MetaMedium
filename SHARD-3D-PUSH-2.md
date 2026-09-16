# Shard 3D, push 2 — geometry from the drawing

*Proposed 16 September 2026, on `master` after the first push landed
(P0–P6, the compass, the review's nine packages, Blender's placement).
This is what John's first real use showed, and the order to close it.*

## 0. What John's hand did, and what the shard did with it

John drew a castle the way a hand draws one: a rough footprint on the
floor, then towers and walls from wherever the camera stood — free
strokes, each landing on the camera plane through the cursor, as the
first push made them. He joined a model (`z-ai/glm-5.3-flash` through
OpenRouter), typed *castle with green tops*, the model worked, and
nothing happened.

In the shard's own terms:

| He drew | It read as | Because |
|---|---|---|
| the footprint, on the foundation | `rectangle 0.84 · profile` | a closed shape on a chosen plane is a profile (row 2) |
| a tower as ⊓, from a free view | `rectangle 0.88 · annotation` | a stroke on a view plane crossing no solid's silhouette is art (the fallthrough) |
| a wall top as ⊓, from another view | `arc 0.63 · annotation` | the same |

So **nothing stood** — no massing, no solid — and a brief with nothing
standing goes nowhere: `runBrief` refuses it in one status-line sentence
(*nothing selected — draw profiles on two or three planes*), or, with the
floor selected, asks the model, receives a tree, and refuses the tree
(*nothing is selected for it to fill*). The model was reached; the reply
was dropped; the only word about it was a line at the bottom of the
screen.

Three faults, each its own package below:

1. **The drawing a hand makes is not what tier 1 knows how to stand.** A
   footprint and elevations sketched from arbitrary views is an
   architect's drawing, and the shard only stands a draftsman's (three
   canonical views).
2. **A brief with nothing to fill is refused instead of answered.** The
   plan's own rule is *the massing stands first*; with a free drawing
   there was no massing to stand.
3. **What was sent and what came back are invisible.** The brief, the
   reply, what parsed, what was dropped and why — none of it is on the
   surface.

## 1. The principle: every free stroke is a silhouette claim

A stroke on a view plane was drawn looking along that plane's normal. It
says: *from here, the thing's outline is this.* That is the input of the
oldest reconstruction there is — the **visual hull**, the intersection of
the prisms of silhouettes — and the shard already computes it for three
axis-aligned claims and calls it the massing. Generalise the massing to
any number of planes and the castle stands from exactly what John drew,
with no model, in the engine's name, the moment the second claim lands.

Two rules make a sketch into claims:

- **A closed stroke is a silhouette** when its prism (extruded along its
  own plane's normal) meets the footprint's prism. A closed stroke that
  meets nothing is still a profile waiting for an extent (P2).
- **An open stroke closes on the ground.** A ⊓ whose two feet reach the
  foundation's height — within a ratio of the stroke's own size — is the
  silhouette of a thing standing on the ground; the ground is its fourth
  side. A ⊓ that floats is an annotation, and the panel says *its feet
  do not reach the ground*.

The footprint bounds it: the hull is the footprint's prism (up to the
tallest claim) intersected with every silhouette's prism. With no
footprint, the ground bounds it from below and the silhouettes from every
side. The hull is a step in the op tree, `hull(footprint, claims[])`,
referencing the strokes; the log is the source; it re-derives as strokes
land and undoes by act. The massing is the hull with three axis-aligned
claims — one mechanism, not two.

Then **parts**: each ⊓ (each run of an elevation between ground touches)
and each closed silhouette is a *part claim*; a part is the hull's
material inside that claim's prism. Parts get engine ids and a sentence
each — footprint span, height, where on the footprint — so the brief can
list them and a model can name them. That is §2.6's rule in practice: the
engine says *part 3, 1.2 × 1.0 u at the north-west corner, 3.1 u tall*;
the hand's words make it *turret*; the model binds *green* to its top.

## 2. Packages

| # | Package | Builds | Done when |
|---|---|---|---|
| G0 | **The transcript, and a brief that always answers** | a *model* section in the details panel: the brief as sent (folded), the reply as received, what parsed, what was dropped and why, the time it took — kept for the last few exchanges; every brief ends in a sentence naming the reason, in the status line and in the transcript; a brief typed with nothing standing **stands the sketch hull first** (G1) and then asks, instead of refusing; `?demo=castle-sketch` reproduces John's board from his strokes | on John's board, Enter on *castle with green tops* either lands a version or says exactly why not, and the details show the brief and the reply verbatim |
| G1 | **The sketch hull** | form rung: `elevation` (an open stroke whose feet reach the ground) and the silhouette reading of a closed stroke on any plane; the `hull` step; prisms along each plane's normal through the footprint's span; CSG intersect (the seam has it); stands at tier 1 on the second claim, re-derives per stroke; the massing re-expressed as a hull of three axis claims with its tests unchanged | John's footprint + two towers from two views → a blocky castle stands, attributed to the engine, with no model; undo removes a claim's contribution |
| G2 | **Parts of the hull, said** | part claims from ⊓ runs and closed silhouettes; each part's span, height and place on the footprint in words (*at the north-west corner*, *along the east edge*, *in the middle*); engine ids `part:1…n`; the panel's summary and *becomes* list them; ink over a part addresses it | the castle's two towers and the wall are three parts with sentences; hovering one outlines it |
| G3 | **The brief a small model can answer** | `describeSpace` for a hull: the footprint, the parts with numbers and words, the extent, the names in play; the ask: a name for each part from the hand's words, a material per part, optional small ops **by part id** (`boss`, `cut`, `mirror`) — never raw geometry; the reply contract `{ parts: [{ id, name, material? }], steps?: [] }`, repaired never guessed; `regen` by part name; tested against qwen3:8b locally and glm-flash through John's seat, the transcripts kept as fixtures | *castle with green tops* on the standing hull → parts named from the words and green bound to the tops, with both models; a reply that names nothing still lands what it did name |
| G4 | **The loop on John's own drawing** | John's board exported from the log as a fixture; the demo re-cut: footprint → walk around → towers from two views → the hull stands → the brief → names and green → *why* → *name: castle* → the footprint drawn again is offered as castle; the e2e drives it from the recorded strokes | the fixture runs green in the headless gate |

Order: G0 → G1 → G2 → G3 → G4. G0 is small and first because it is what
lets everything after it be *seen*. Rough weight: G0 a day, G1 two, G2
one, G3 two, G4 one.

## 3. What stays

The closed vocabularies; tier 1 first; the log as the source; ink never
covered; the facing gate and the cursor placement; the massing's three
canonical views (now one case of the hull); the diff (a hull is a solid
like any other, so a profile against it diffs as before); names as the
open vocabulary.

## 4. Risks, and honest limits

- **A hull is blocky.** The visual hull of a sketch is a union of prisms;
  a round tower drawn as a circle from above and a ⊓ from the side comes
  out as a cylinder cut square, not a cylinder. That is honest, and the
  model's `boss`/`cut` by part id is how it gets rounder — or a *revolve*
  claim later.
- **Many prisms in CSG.** The seam never throws, but a dozen claims is a
  dozen intersections; cap the count (`MAX_CLAIMS`), say so, and derive
  incrementally.
- **A view nearly from above gives a plan, not an elevation.** The
  plane's normal decides which it is; the ⊓ rule needs a normal that is
  not nearly vertical, and says so otherwise.
- **The model's part of it.** A small model still drifts on names
  (`castle_base` for *castle*); the contract asks for names *from the
  words* and the brief lists them; what it cannot name, it leaves, and
  the engine's `part:n` stands.

## 5. Still John's

- Whether a floating ⊓ is dropped to the ground (verticals added) or
  left as annotation. The plan says annotation, with the reason.
- Whether the hull stands on the *second* claim or waits for a footprint.
- How many exchanges the transcript keeps.

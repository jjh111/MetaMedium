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

Two more, from his second board (four loops from free views, three
profiles on the tiles, a massing standing):

- **The Y definition is not working.** The massing stood *on the floor*
  while the side and front profiles were drawn above it. The prisms are
  meant to run through the span of every profile, so a hull should float
  wherever its claims are; either a claim's vertical extent is lost on the
  way in, or the foundation profile's own points (at y = 0) drag the span
  down. His words: *the way the shapes are drawn in the volume of space is
  always in the floor; we can assume within a general volume of the space
  so it fits in better with the pure planes.* The rule, stated: **a hull
  occupies the volume its claims define; the ground bounds it only where a
  claim's feet reach the ground.** Settled against his exported board, not
  a synthetic one (G0 exports; G1 pins it).
- **The model seat should be a hand in the room.** *Use MCP bidirectionally
  as a model, so I can push back here to you doing it, and we model the
  usage of other models first hand.* The canvas has both halves already —
  `Demos/mcp.mjs` is a hand on the board, `Demos/mcp-client.mjs` is the
  door that lets the board ask a server; the shard has neither. With them,
  Claude Code in the conversation *is* the model: the brief is parked in
  the room, the hand reads it, answers in the reply contract, and the
  shard applies the answer exactly as it would a model's. What a model
  receives and what it should return is then something John and Claude
  argue about on the board, before any small model is tuned against it.

Three faults from the first board, each its own package below, and the
two above folded into G0, G1 and G5:

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

**The volume.** A claim carries its plane, and the plane carries where in
space the stroke was drawn — its height above the ground included. The
hull is the intersection of prisms *where they are*: two loops drawn a
unit above the floor make a hull a unit above the floor, and the ground
enters only as the fourth side of a ⊓ whose feet reach it. The massing's
prisms already run through the span of the others' points, so nothing
here should touch the floor unless a claim does; G1 pins that with John's
own board and fixes whatever drags it down.

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
| G0 | **The transcript, the export, and a brief that always answers** | **Export the board as its log** (one JSON file, the canvas's export pane ported) and **open one**, so John's boards become fixtures and this plan's claims are settled on them; a *model* section in the details panel: the brief as sent (folded), the reply as received, what parsed, what was dropped and why, the time it took — kept for the last few exchanges; every brief ends in a sentence naming the reason, in the status line and in the transcript; a brief typed with nothing standing **stands the sketch hull first** (G1) and then asks, instead of refusing; `?demo=castle-sketch` reproduces John's first board from his strokes | on John's board, Enter on *castle with green tops* either lands a version or says exactly why not, the details show the brief and the reply verbatim, and his two boards are in the repo as fixtures |
| G1 | **The sketch hull, in the volume** | form rung: `elevation` (an open stroke whose feet reach the ground) and the silhouette reading of a closed stroke on any plane; the `hull` step; prisms along each plane's normal through the *others'* span, **where the claims are** — the ground bounds a hull only where a claim's feet reach it; CSG intersect (the seam has it); stands at tier 1 on the second claim, re-derives per stroke; the massing re-expressed as a hull of three axis claims with its tests unchanged; **the Y fault from John's second board reproduced from its export and fixed** | John's footprint + two towers from two views → a blocky castle stands, attributed to the engine, with no model; two loops drawn a unit above the floor make a hull a unit above the floor; undo removes a claim's contribution |
| G2 | **Parts of the hull, said** | part claims from ⊓ runs and closed silhouettes; each part's span, height and place on the footprint in words (*at the north-west corner*, *along the east edge*, *in the middle*); engine ids `part:1…n`; the panel's summary and *becomes* list them; ink over a part addresses it | the castle's two towers and the wall are three parts with sentences; hovering one outlines it |
| G3 ✅ | **The brief a small model can answer** — *landed 16 Sep 2026* | `describeSpace` for a hull: the footprint, the parts with numbers and words, the extent, the names in play; the ask: a name for each part from the hand's words, a material per part, optional small ops **by part id** (`boss`, `cut`, `mirror`) — never raw geometry; the reply contract `{ parts: [{ id, name, material? }], steps?: [] }`, repaired never guessed; `regen` by part name; tested against qwen3:8b locally and glm-flash through John's seat, the transcripts kept as fixtures | *castle with green tops* on the standing hull → parts named from the words and green bound to the tops, with both models; a reply that names nothing still lands what it did name. **Done**: the hull brief is 1048 characters before `HERE_ON_A_HULL` on John's own castle; the contract is `{parts, steps?, reuse?}` with small ops by part id only; a name is held on the hull step keyed by the CLAIMS the part was cut from, so a dropped claim cannot slide it; qwen3:8b answered in 42 s with strict JSON first time and both parts named and painted, kept verbatim in `shard-3d/fixtures/exchanges/`; three e2e steps and 38 unit tests. **Still owed**: glm-flash through John's own key |
| G5 | **The hand, and the seat, over MCP** | the shard joins a live room the way the canvas does (`LiveStore` over `Demos/relay.mjs`; the shard's log is a core session, so nothing new in the engine); `shard-3d/mcp.mjs` as the hand — `space_look` (the board in words: planes, claims, the hull and its parts, with ids), `space_draw` (claims in the shape vocabulary on a named plane, or the view plane through the cursor from a given pose), `space_propose` (a reply in G3's contract: names, materials, small ops by part id — held, never blessed), `space_say`; and **the seat**: the model pane gains *Claude Code (MCP hand)* — a brief typed at it is parked in the room, `space_pending` lists it, `space_answer` returns the reply, and the shard applies it exactly as a model's, transcript and all; registered in `.mcp.json` as `metamedium-3d` beside the canvas's hand; the stdio smoke in CI | John types *castle with green tops* in his tab; Claude Code, in the conversation, reads the brief with `space_pending`, answers with `space_answer`, and the castle's parts are named and green on John's screen — the same path a small model takes, argued about first hand |
| G4 | **The loop on John's own drawing** | John's board exported from the log as a fixture; the demo re-cut: footprint → walk around → towers from two views → the hull stands → the brief → names and green → *why* → *name: castle* → the footprint drawn again is offered as castle; the e2e drives it from the recorded strokes | the fixture runs green in the headless gate |

Order: G0 → G1 → G5 → G2 → G3 → G4. G0 is small and first because it is
what lets everything after it be *seen*; G5 comes before the parts and
the brief so that G2 and G3 are shaped with Claude in the seat, on John's
boards, and the small models are tuned against exchanges that already
worked once. Rough weight: G0 a day, G1 two, G5 two, G2 one, G3 two,
G4 one.

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
- **What a hull is when a tower is seen only once.** G2 found that three
  partial silhouettes from two standpoints determine two masses, not
  three: a tower drawn from one view has no depth, and the visual hull
  cannot invent it. The honest reading stands (two parts, the shortfall
  pinned in `parts.test.ts`). The alternative — the hull as a *union of
  masses*, each ⊓ bounded by the footprint rather than by the other
  claims — gives every tower a body at the cost of inventing its depth
  (a 2.8 u slab across a 6 × 4 plan, measured). A third option is to ask:
  a part seen once is a *question* on the board (*how deep is this?*), a
  second view or a word answering it. John's call; the plan says ask.
- Whether the MCP seat should be able to *bless* — name a part outright —
  or, like the canvas's hand, only propose. The plan says propose.

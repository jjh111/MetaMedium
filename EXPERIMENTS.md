# MetaMedium Experiments

Experiments are where platform bets get **de-risked before they land in
`metamedium-core/`**. They are deliberately cheap, deliberately forked, and
deliberately *not* the product. The platform is the whitepaper + the session
engine + the flagship demo; everything on this page exists to feed that.

**The rule:** an experiment may re-implement whatever it needs to move fast.
When an idea proves out, it lands in `metamedium-core/` **with tests**, and the
experiment either adopts the core or gets parked. Experiments never become the
thing the project is *about*.

Status legend: **live** = actively worked · **parked** = intact, not being
extended · **folded in** = its lesson has landed in core.

---

## lens-canvas/ — infinite canvas, one lens per data type

**Status:** live · TypeScript + Vite + vitest (19 tests) · `npm run dev`

An infinite canvas where every object is a `LensNode` in a JSON graph, and each
node is drawn by whichever "lens" bids highest for it. Four phases shipped
(card layout, front/back node flip, lens-switcher HUD, resize + auto-height).
Lenses so far: `card`, `back`, `code`, `tree`, `raw`.

**What it de-risks for the platform** — two things the roadmap had filed as
"plan only":

1. **The node model in practice.** `metamedium-core-schema.md` argues *type
   emerges from connections rather than being assigned*. lens-canvas is that
   claim running: nodes carry inferred type, and the graph is the only truth.
2. **MoE routing, concretely.** `src/core/lens-registry.ts` has each lens vote
   0–1 on whether it can render a value, highest confidence wins. That is
   ARCHITECTURE-v5's expert-routing idea at a scale small enough to actually
   run — and it works, which is real evidence for the deferred router.

It also carries a **three-caller API** worth stealing: the same graph
operations are reachable by human gesture, by LLM (`window.__canvas.addNode()`),
and by direct import in tests. Anything the LLM can do, a test can do.

Detail lives with the experiment: [`lens-canvas/CLAUDE.md`](lens-canvas/CLAUDE.md)
(agent guide), [`DEV_LOG.md`](lens-canvas/DEV_LOG.md) (what shipped),
[`IMPLEMENTATION_PLAN.md`](lens-canvas/IMPLEMENTATION_PLAN.md) (phase plan).

> **Note:** lens-canvas uses the personal-site palette, not the MetaMedium
> palette — see [Design Systems](#design-systems) below. It is also not yet
> covered by CI.

---

## v2-poc/ — drawing-responsive text reflow

**Status:** parked (intact, buildable) · esbuild + `@chenglou/pretext`

Whitepaper text reflows in real time around shapes the reader draws. The most
direct demonstration of the medium-blending thesis: drawing and text as one
medium rather than two panes.

**Feeds the platform:** it is the interactive figure Whitepaper v5.1 is built
around (see ROADMAP.md). Source is `v2-poc/src/main.ts`; `bundle.js` is the
committed build artifact.

---

## test-vision.html — VLM interpretation PoC

**Status:** parked · single file, Qwen3.5 VLM

Probes a path the tiered-LLM design does not currently take: giving a
vision-language model the *rendered image* instead of structured geometry.

**Why it matters as a control:** the platform's standing commitment is that
LLMs receive fingerprints, spatial graphs, and library context — never
screenshots. This experiment is how that commitment stays honest rather than
assumed. Any argument for grounded-over-pixels should be able to point at what
the pixel path actually did.

---

## test-llm.html — LLM harness

**Status:** parked · single file

Standalone harness for exercising LLM calls outside any demo. Useful for
checking a prompt or a local endpoint without loading a canvas.

---

## manim-explainer/ — the ~50-second explainer

**Status:** live · Python + manim

Animated explanation of the core loop: marks become meaning through recursive
composition, landing on *"the same mark simultaneously IS a stroke, a circle,
and 'wholeness' — type emerges from connection."*

**Feeds the platform:** ROADMAP's Demo v3 Step 3 calls for a video of the
canonical loop for the whitepaper. This is the communication asset for the
thesis the engine implements.

Source (`script.py`, `monolith.py`, `plan.md`, ffmpeg concat lists) and preview
stills are tracked. **Rendered MP4s and manim's `media/` cache are gitignored**
— ~23MB of regenerable build output. Re-render from the scripts.

---

## playground.html — personal sandbox

**Status:** parked · single file

Loose sketch surface on the personal-site design language. Unclassified; kept
because it is cheap to keep. Not a platform surface.

---

## shard-3d/ — a bounded MetaMedium for making things in space

**Status:** live · P0–P6 — the MVP line — **plus the navigation compass**
(15 Sep 2026) · Vite + TypeScript + three.js · plan in
[`SHARD-3D-PLAN.md`](SHARD-3D-PLAN.md), package notes in
[`shard-3d/README.md`](shard-3d/README.md)

```bash
cd shard-3d && npm install
npm run dev        # vite on :5174 (?demo, =read, =view, =diff, =castle, =mug)
npm test           # vitest — the pure rungs, headless, no WebGL
npm run typecheck
npm run build:standalone   # → dist/shard-3d.html, one file, 936KB
```

**P0 is in** (the space): the orbit / draw split, the gizmo with its three
plane tiles and the slide, a stroke projected live onto the chosen plane and
held in that plane's own coordinates with the scale the pen worked at, the
shape rung unchanged on those coordinates, and the panel's *plane* and
*reading* rows. The engine is imported from source, not from a build.

**P2 is in** (the form rung and solids): a closed vocabulary of seven placed by
a table read top to bottom — the sibling of the diagram rung — with every
threshold a ratio of the marks' own size, measured in world space so it holds
across planes; an op tree in the §2.4 vocabulary, held in the log as `json`
code with a marker on its first line and attributed to the engine; `extrude`
and `revolve` derived from the clean profile with an extent or an axis; the
mesh derived from the tree on every change and never held; ink kept visible on
the face; selection by default; and one field with one reader for the tier 1
verbs. A rectangle and a line up from its edge stand a box **at once, tier 1,
with no model and no wait**, and one undo removes the solid and leaves the ink.
`e2e.js` drives the loop through the real pointer path; `?demo` draws both
criteria at boot.

**P1 is in** (the planarity read), built after P2 because reading a plane off a
face needs faces to exist. With nothing chosen, the plane is a **plural reading
with a reason**: the faces under the pen, the previous stroke's plane, the
three world planes standing where the pen came down, and the view plane, each
scored `shape × facing × anchor × continuity` — the shape rung's own confidence
on that plane's projection at that plane's scale, how face-on it is (below a
floor it is held and marked *too oblique to read*, and never wins), whether the
ink lies on geometry in it, and whether the stroke before lay there. The plane
is picked at pen-down from where the pen is and **re-ranked at pen-up against
the whole stroke** (deferred commitment); the runner-up stands beside the mark
as a chip and one tap flips the ink onto it, one undo puts it back. View ink is
held with the camera pose it was drawn at, sharp from there and faint from
elsewhere, and the panel's *pinned views* row takes the camera back.
`?demo=read` and `?demo=view` draw P1's two pictures.

**P3 is in** (features, cuts and the rest of tier 1): a closed shape drawn on a
solid's FACE plays a **feature** — and is deliberately not acted on, because a
hole and a boss are two intentions and the drawing does not say which, so the
field offers both and the solid it is on stands selected with no loop drawn.
*Cut a hole* goes **through** the body unless a line from the feature's edge
says how deep; *Raise a boss* rises by the feature's own short side unless one
does. Either is a new **version** of the same tree — the tree now **nests**
(`cut(extrude(…), feature, depth)`) and the derivation walks it — held beside
every earlier version in the log, one undo per version. `mirror`, `dup` and
`remove` fill out tier 1. The booleans live behind **one seam**
(`src/csg.ts`, `three-bvh-csg` pinned, imported nowhere else) that **never
throws**: on a failure the body stays as it was, the solid is marked broken
with the library's own words and the status line says so. And a stroke that
crosses a solid's silhouette **three times** scratches it out — core's own
crossing rule (`session/erase.ts`) counted in the view the stroke was drawn in,
with *crossed it twice — one more pass erases it* one pass short; its ink
stays, because ink is provenance.

**P4 is in** (the diff is the brief): a closed stroke drawn on a plane whose
outline **overlaps a solid's silhouette there** is read as the *side* (or
*front*, or *top*) **profile OF that solid**, not the start of a new one — the
comparison is orthographic along the plane's normal, so where the plane stands
along it does not matter. The solid is rendered flat into a small offscreen
buffer, its boundary walked into strokes by core's own `trace`, and the two
outlines are rasterised at one resolution in plane units:
**missing = ink & !silhouette, extra = silhouette & !ink**, each connected
island a region with an area in u², a place in the drawing and an outline. That
is `validateRegions` generalised — the promise that the thing matches the
drawing, checked rather than assumed — and the panel's *matches the drawing*
row says it with a coverage number and a chip per region, which outlines that
region on its plane in the keyword teal when hovered. Tier 1 resolves it: *Add
it* runs every missing region right through the body along the plane's normal
and unions it, *Take it off* cuts every extra one out, each a new version and
one undo. The `match` step **holds nothing derived** — which profile, which
way, which plane, and no region — so a replayed log re-derives the regions from
the ink and the body and stands up the same solid. `e2e.js` runs forty-nine
steps through the real pointer path; `?demo=diff` draws the bump.

**P5 is in** (the generator seat, and names): two or three profiles on
different world planes whose projections overlap **are a solid already** — each
grown through the span of the others along its own normal and the prisms
intersected — and tier 1 stands that **massing** up the moment the second one
lands, in the engine's name, with no word said. The drawing IS the extent
(§2.6 rule 1). A brief typed at it goes to a model **only by a deliberate act**
— Enter, or a regen — and what comes back is data in the shard's own closed
vocabulary: steps over profiles, names on steps, a colour word, and profiles
the model may ADD, which are drawn into the log through the same `addStroke` a
hand's ink goes through, attributed to it and declared content. **No model
writes code that runs in this page** (invariant 5), anything outside the
vocabulary is dropped *and counted*, and the whole tree is then **clipped to
the massing** as a final step in the engine's name — the extent invariant,
literal — so a proposal cannot leave the drawing. The version lands held and
attributed; the diff is re-run on it and the row says *honours the drawing 93%
· front 96 · top 95 · side 88*. **Names conserve**: *Take it* names the thing
from the root step and holds every named sub-tree as a definition based on the
whole, after which typing *turret* completes from the library before any model
is asked, and verbs bind by name — *make the turrets taller* regens those steps
alone and leaves every other step's id untouched, while *remove the turret* and
*the tops are red* are tier 1 and instant. A phrasing the verb table cannot
read is **returned, not dropped**: the field offers to ask a model which of the
space's own verbs it was, once, and the answer is held in the log as a way of
saying it. A model at work is drawn above the solid it is about with its
elapsed time, **Esc stops every call in flight**, and a brief that fails leaves
nothing behind. `?demo=castle` draws the three views.

**P6 is in — the plan's MVP line** (names, and the loop in 3D): taking a
version now holds **the whole of a thing** under its own name as well as every
named part, and each definition carries the **outlines it was made from** — the
engine's own fingerprint of each stroke, at the scale it was drawn at, and the
kind of plane it lay on. So a closed outline drawn again anywhere is measured
against the library, plurally and above a floor: *mug 0.97*, with *handle 0.78*
behind it, each saying the corners, the extent and the aspect it was scored on,
the plane it was drawn on lifting an agreement and lowering a disagreement
without ever vetoing. The offer stands beside the mark as a chip and in the
panel's *could be* row, and **one tap places it**: the definition's tree stands
where the outline was drawn, scaled so the profile it was matched on fits the
one drawn here, as a new artifact — and the `place` step **holds no pose**,
only the two stroke ids the scale, the turn and the shift are re-derived from
every time the tree is walked. ***Not a mug*** puts that outline on the
definition's rejected examples, held in the log as its own event, so the same
shape is never offered again and a replay remembers it; one undo takes it back.
A model that answers `{"reuse":"mug"}` to a brief is **honoured by placing**
rather than by writing, so the library answers before the model does. `e2e.js`
runs seventy steps, and `__demo()` runs the plan's two-minute demo in nine
asserted steps in about a second; `?demo=mug` draws the finished board, and
`npm run build:standalone` writes the whole thing as one 936KB file.

**The compass is in** (§7's viewcube, and navigating the space): a Blender-style
navigation gizmo in the top-right corner — an SVG overlay drawn from the tokens,
three arms from a centre with a labelled ball on each positive end and a hollow
one on each negative, depth-sorted and turning with the camera. Tap a ball to
look along that axis, tap it again to flip to the other side; drag it to orbit
(one finger, because it is chrome rather than canvas); *home* frames everything
(or the plane picker, on an empty board); *view* is persp / ortho; the pinned
views are chips beside it, moved out of the panel so that **every way of moving
the camera is in one corner**. The ball that faces the **chosen plane** carries
the same teal as that plane's tile, so the view that puts your drawing plane
flat on is one tap away — and a snap that would leave it too oblique to draw on
says so in the status line, against the planarity scorer's own floor. The plane
picker at the world origin is untouched: it says where ink LANDS, and this says
where the EYE is. **Perspective follows the camera** (Blender's auto
perspective): an axis view goes orthographic, because two equal edges at
different depths measure differently in perspective and that is exactly what a
front view is for; orbiting off the axis comes back, and the *view* tile pins
it until the next tap on a ball. Orbit turns around the selection, else around
what the pointer was over; the wheel dollies toward the pointer; pan is the
middle button, shift + right, or two fingers. `1` `2` `3` still choose a PLANE,
so the views are on the numpad where Blender has them (or shift + the digit).
The maths is pure and tested (`src/view.ts`, 22 tests): the six poses, the flip,
framing a bounds at any aspect in either projection, the ortho height that makes
the toggle not jump, and the balls' depth order. The e2e now runs **78 steps**.

Ink on planes chosen by a gizmo or read from the evidence; the shape rung
unchanged on plane coordinates; a form rung (profile, extent, axis,
feature, path, label, annotation); solids as op trees the log replays;
the diff between a profile and a silhouette as the brief; a model filling a
massing it cannot leave; a stroke on the
view wrapped onto a thing and turned into one of your own definitions.
Built in-house on its own stack, pitched to Spline, kept regardless.

**Feeds the platform:** the `plane` rep and its scorer, a second closed
role table, the `op` kind, the diff as the brief, **the massing (a drawing's
own views as its extent, and as an invariant a generator cannot leave)**, wrap
as a plural reading, and placing a definition by its own relations — each to
land in core with tests when proven (plan §11). P6 adds two: a **profile
comparison whose weights are the caller's** (core's own is too forgiving
between two closed outlines, and the shard re-weighted it rather than forking
it for good), and a **bless from data** — `session.import` already stands an
artifact up from a name, bounds and code, which is what a placement needed;
what is missing is the act by its right name.

---

## Design Systems

Two palettes coexist **on purpose**, and the split is by brand, not by drift:

| Surface | Palette | Type |
|---|---|---|
| Whitepaper, `Demos/`, flagship demos | `#0a0a0f` bg · `#e8e4d9` text · `#c9a84c` gold | Space Grotesk |
| lens-canvas, manim-explainer, playground | `#020a12` sea-deep · `#7dd8f7` cyan · `#d4af37` gold | JetBrains Mono |

The second is the personal-site (johnhanacek.com) language. The first is
MetaMedium's current look.

> 📌 **Pinned:** a deliberate MetaMedium style is still to be defined. Until
> then, treat the whitepaper palette as *current*, not as *decided*, and do not
> converge the two — the separation is intended.

---

## Promoting an experiment

When something here has earned its place in the platform:

1. Port it into `metamedium-core/` with tests (behavior-identical first, then
   improve — reconcile by test, not by guess).
2. Rebuild the browser bundle and re-copy it to `Demos/` — CI fails if the
   committed copy drifts.
3. Update [ROADMAP.md](ROADMAP.md) and the repo map in [CLAUDE.md](CLAUDE.md).
4. Move this entry to **folded in** with a one-line note on where it landed.

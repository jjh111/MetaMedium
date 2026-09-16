# shard-3d — P0 the space, P1 the planarity read, P2 solids, P3 features and cuts, P4 the diff, P5 the generator seat, P6 the library, and the compass

A bounded MetaMedium for making things in space. See `../SHARD-3D-PLAN.md` for
the whole plan. **Seven packages are in, and P6 is the plan's MVP line** — the
thing that is pitched. **P1 was deliberately deferred** until after P2, because
reading a plane from the evidence needs faces to read it off; it is in now, and
it extends the one seam P0 left for it.

> **P0 · the space.** Vite + three.js + core; the orbit / draw split; the gizmo
> with three plane tiles and the slide; a stroke projected live onto the chosen
> plane; the shape rung on plane coordinates with the pen's scale; the panel's
> *plane* and *reading* rows.
>
> **Done when:** draw a rectangle on the foundation and a circle on the height
> plane; both read as they would on paper; the panel says the plane and why.

> **P2 · the form rung and solids.** `form.ts` (the seven-row table); the op
> tree; `extrude` and `revolve` from clean profiles with an `extent` or an
> `axis`; the mesh derived on replay; ink kept on the face; selection by
> default; the field with the tier 1 verbs.
>
> **Done when:** rectangle + a line up from its edge → a box, instantly,
> attributed to the engine; profile + axis → a revolve; undo removes the solid
> and leaves the ink.

> **P1 · the planarity read.** The plane scorer over `face` / `view` / `world` /
> `previous`; the runner-up chip; the deferred re-rank at pen-up; view-plane ink
> held with a pose.
>
> **Done when:** with nothing chosen, a stroke on a box's top reads `face` over
> `view` with a reason; a stroke beside it reads `view`; a chip flips it and
> undo drops it.

> **P3 · features, cuts and the rest of tier 1.** `cut` / `boss` from a closed
> shape on a face; `mirror`; `dup`; `remove`; a CSG seam with one library
> behind it.
>
> **Done when:** a circle on the box's top → *Cut a hole* / *Raise a boss*,
> both tier 1; a scratch across a solid erases it (three crossings of its
> silhouette).

> **P4 · the diff is the brief.** Front / top / side profiles; the orthographic
> silhouette via `trace`; missing / extra regions; tier 1 resolution by extrude
> and cut; the panel's *matches the drawing* row.
>
> **Done when:** draw the box's side profile with a bump; the diff names the
> missing region; *Add it* extrudes it; the diff then reads clean.

> **P5 · the generator seat, and names.** The massing from unnamed profiles
> (tier 1); `describeSpace` with the names in play; a model proposing an op
> tree with named steps and bound materials; repair; the diff re-run on the
> proposal; names held on steps and, on taking, as definitions based on the
> whole; the verb table with name-resolved targets; work shown above the solid;
> Esc stops it; a failed brief leaves nothing.
>
> **Done when:** draw three unnamed profiles; type *a castle with green turret
> tops*: the massing stands at once in the engine's name, a stub model's tree
> fills it with steps named `castle` / `turret` / `top` and green bound to the
> tops, the diff says it honours the profiles; *make the turrets taller* regens
> those steps alone; typing *turret* afterwards completes from the library.

> **P6 · names, and the loop in 3D.** A solid named holds a definition with the
> op tree and its profiles' fingerprints; drawing one of those profiles again
> is matched against them and offers the solid; *Not a …* corrects a wrong
> match and the correction replays; `{"reuse": …}` is honoured by placing
> rather than by writing; the standalone build; the two-minute demo in the
> e2e.
>
> **Done when:** save the mug as *mug*; draw its profile elsewhere; *mug 0.8x*
> is offered and one tap places it.

All seven criteria run in `e2e.js` (70 steps), and the two-minute demo runs
beside them as `__demo()` (10 steps). `?demo` draws P0's and P2's at
boot; `?demo=read` draws the rectangle read onto a box's top face with the chip
beside it; `?demo=view` draws view ink gone faint from a camera that has left
the pose it was drawn at; `?demo=diff` draws the box and the side profile
with the bump, with the region named in the panel and *Add it* standing in the
field; and `?demo=castle` draws P5's three views and leaves the massing
standing, selected, with the field ready for the brief — no model is asked,
because that is the human's next act and the whole point of the package.
**`?demo=mug` runs the whole two-minute demo** (§9) and leaves the finished
board: a mug with a hole cut through it and a handle a model named from your
words, and a second mug placed from the library where its plan was drawn again.
`?theme=light|dark|system` picks a theme, the way the whitepaper shares
a surface.

## Run it

```bash
cd shard-3d
npm install
npm run dev        # vite on http://localhost:5174
npm test           # vitest — the pure rungs, headless, no WebGL
npm run typecheck
npm run build:standalone   # → dist/shard-3d.html, one file, 936KB
```

The one dependency P3 adds is the CSG library, behind `src/csg.ts` and
imported nowhere else; **P4, P5 and P6 add none** — P4's renderer is the three.js
already here and its tracer is core's own, and P5's transport, tolerant JSON
readers and `HERE` paragraph are core's own patterns, ported rather than
forked, and P6's comparison is core's `matchPrimitiveFromLibrary` re-weighted
in a file of its own. The engine is imported **from source** (`metamedium-core` is aliased to
`../metamedium-core/src/index.ts` in `vite.config.ts`, `vitest.config.ts` and
`tsconfig.json`), so the shard always runs against the engine as it stands and
there is no bundle to drift.

`.claude/launch.json` carries a `shard-3d` configuration on the same port.

## The loop

1. **Tap a tile — or don't.** The gizmo sits at the world origin: three axes,
   and a square where each pair of them meets — **foundation** (XZ, the
   ground), **height** (XY, the wall you face), **width** (YZ, the wall on your
   right). The chosen tile lights in the teal keyword colour. The cone on its
   normal **slides** the plane along it; the sphere at the centre
   **un-chooses**, and from then on the plane is **read**.
2. **Draw.** Left button, or one finger. Every point is raycast onto the plane
   and the stroke is drawn live where it lands. With nothing chosen the plane
   is fixed at pen-down from where the pen is — a face under it beats
   everything, else the plane you were drawing on a moment ago, else the view —
   and **re-ranked at pen-up** against the whole stroke, which is the first
   moment there is a stroke to read. The winner is what the stroke is logged
   on; every candidate is held with its number and its reason, the panel lists
   them, and the runner-up stands beside the mark as a **chip**. Tap it and the
   ink is read onto that plane instead — one act, and one undo puts it back.
   The ink never moves on screen; only which plane it is taken to lie on.
3. **Move the eye.** **Orbit** with the right button, a drag on the **compass**
   in the top-right corner, or a drag with `Space` held — around the centre of
   the view, where a pan left it, or around the selection when there is one.
   **Pan** with the
   middle button, `Shift` + the right button, or two fingers. The wheel or a
   pinch **dollies toward the pointer**, not toward the middle of the screen.
   Tap a ball on the compass to look along that axis (and again to flip to the
   other side); *home* frames everything; the *view* tile is persp / ortho; the
   pinned views are chips under it. `1` `2` `3` choose a PLANE and `0`
   un-chooses; the camera's own keys are on the numpad — `1` front, `3` right,
   `7` top, `5` persp/ortho, `9` the opposite side — or `Shift` + those digits,
   with `Ctrl`/`Cmd` for the far side and `f` / `Home` to frame.
   `Cmd/Ctrl+Z` undoes.
4. **Read it.** Hover a mark; the panel says *mark*, *plane*, *reading*,
   *plays*, *maths*, *measured*, and the status line says the one sentence.
5. **Stand it up.** A closed shape on a chosen plane is a **profile**. A line
   whose end lies on its edge and which leaves its plane is an **extent**, and
   a box stands *at once* — tier 1, no model, no wait, and the status says so.
   A line lying **beside** the profile in its own plane is an **axis**, and the
   profile turns about it. The solid just made stands selected, in teal.
6. **Keep a view.** A stroke the read puts on the **view plane** is held with
   the camera pose it was drawn at: sharp while the camera is within
   `VIEW_TOLERANCE_DEG` of that pose, faint at `VIEW_FAINT_OPACITY` from
   anywhere else — there, and clearly not here (plan §12 leaves *faint vs not
   at all* to John; this is faint, and both numbers are named in `ink.ts`). The
   compass's **pinned views** chips list every pose view ink hangs on, with a
   count, and a tap eases the camera back to it. (They used to be a row in the
   panel; they live in the corner now, because every way of moving the camera
   belongs in one place.)
7. **Cut into it.** Un-choose, and draw a closed shape **on one of the
   solid's faces**. The plane is read as that face (P1) and the mark plays a
   **feature** — and nothing happens, because a hole and a boss are two
   different intentions and the drawing does not say which. The solid it is on
   stands selected with no loop drawn, and the field offers both: *Cut a hole*
   takes it out (**through** the body, unless a line drawn from the feature's
   edge says how deep), *Raise a boss* stands it proud (by the feature's own
   short side, unless an extent says otherwise). Either is a new **version**
   of the same solid's tree — `cut(extrude(…), feature, depth)` — and one undo
   walks back one version, leaving the circle lying on the face.
8. **Scratch it out.** A stroke that crosses a solid's silhouette **three
   times** erases it — core's own rule (`session/erase.ts`), counted in the
   view the stroke was drawn in. One pass through crosses twice and is safe,
   and the board says *crossed it twice — one more pass erases it*. The
   solid's ink stays where it is, because ink is provenance; one undo brings
   the solid back.
9. **Check it against the drawing.** Tap the side view, choose the **width**
   tile and draw the outline you meant *over the solid*. A closed stroke whose
   outline overlaps a solid's silhouette on its own plane is read as that
   solid's **side profile** — not the start of a new one, and nothing waits for
   an extent beside it. The panel's ***matches the drawing*** row then says
   *side · matches 91% · missing 1 region (0.61 u²) at the right · extra none*,
   with a chip per region; hover one and it is outlined where it lies, in the
   keyword teal. **Add it** runs every missing region right through the body
   along that plane's normal; **Take it off** cuts every extra one out. Either
   is a version, one undo back, and the row re-reads afterwards — *matches 99%
   · missing none · extra none*. The ink stays on its plane, because it is a
   standing claim about the shape and not a feature that has been used up.
10. **Two views are a solid already.** Choose the foundation and draw the
   plan; choose the height plane and draw the front; choose the width plane and
   draw the side. Where the three projections overlap is the **massing** — each
   profile grown through the span of the others along its own normal and the
   prisms intersected — and it stands **the moment the second one lands**, tier
   1, in the engine's name, with no word said and no model asked. A third view
   goes *into* it rather than beside it, and every prism is re-derived through
   the others' span. The drawing IS the extent (§2.6 rule 1), and it is the
   extent a generator cannot leave. A lone profile is still not a massing: it
   waits for an extent, as in step 5.
11. **Then say what it is.** Type *a castle with green turret tops* and the
   reading line says *→ asks qwen3:8b* **before** you press Enter; with no
   model joined it says so, and Enter opens the model pane. What comes back is
   an op tree in the shard's own closed vocabulary — steps over profiles, a
   name on each from your own words, a colour word where you said one, and
   profiles the model may ADD, drawn into the log through the same door your
   ink goes through and attributed to it. Never code, never a mesh. It is
   **clipped to the massing** before you see it, and the panel says *honours
   the drawing 93% · front 96 · top 95 · side 88*. A model at work is a
   breathing dot above the solid it is about, with its elapsed time; **Esc**
   stops every call in flight; and a brief that fails leaves nothing behind.
12. **Take it, and the names are yours.** *Take it* names the thing — the name
   you typed if you typed one, else the deepest named step — and holds **the
   whole of it** and every named sub-tree as a **definition**, each with the
   outlines it was made from. From then on typing *turret* completes from the library before any
   model is asked, and verbs bind by name: *make the turrets taller* asks for
   those steps again and leaves every other step's id alone, while *remove the
   turret* and *the tops are red* are tier 1 and instant. A phrasing the table
   cannot read comes back rather than being guessed at — the field offers to
   ask a model which of the space's own verbs you meant, once, and holds the
   answer in the log as a way of saying it.
13. **Draw it again, and it is offered back.** A definition carries each of its
   profiles as the engine's own fingerprint of that stroke, taken at the scale
   it was drawn at, and the kind of plane it lay on. So a closed outline drawn
   anywhere that plays `profile` is measured against every definition in the
   library — corner count, extent, aspect, closure, with core's straightness
   veto — and what it could be stands beside it as a chip: ***mug 0.97***. It
   is a plural reading like every other: the panel's ***could be*** row lists
   them all with the measurements each was scored on, the plane it was drawn on
   lifts an agreement and lowers a disagreement without ever vetoing, and
   ***Not a mug*** puts this outline on that definition's rejected examples so
   the same shape is never offered as one again — held in the log, so it
   replays and one undo takes it back.
14. **One tap places it.** *Place mug*, the chip, or typing the name: the
   definition's tree stands where the outline was drawn, **scaled so the
   profile it was matched on fits the one drawn here** and turned onto that
   outline's own plane. It is a new artifact with a `place` step, and the step
   holds no pose — only the two stroke ids the scale, the turn and the shift
   are worked out from, every time the tree is walked. A model that answers
   `{"reuse":"mug"}` to a brief does exactly the same thing and writes nothing.
15. **Say it.** The field is at the foot of the panel: type `extrude`,
   `revolve`, `cut`, `boss`, `add it`, `take it off`, `mirror`, `dup`,
   `remove`, `undo` or `name: …` — by label or by alias (`drill`, `pad`,
   `copy`, `fill it in`, …) — and the line underneath says what Enter will do
   *before* you press it. A verb this selection does not afford says what is
   missing instead: `extrude` with no extent never guesses a depth, `mirror`
   says which plane it will reflect across (the tile you are holding, else the
   height plane), and *Add it* with nothing missing says the sentence that
   makes it so. `Cmd/Ctrl+Z` drops the last **act**: a version if one stands on
   top of the log, else the solid, else the last stroke. The ink always stays.

## What is in here

| File | What it is |
|---|---|
| `src/plane.ts` | **Pure.** `Plane { origin, normal, up, source, name, why }`, world ↔ plane (u, v), ray–plane, `scaleAt`, `facing`, the camera's `Pose` and `poseAngle`, the three named planes, and `planeForPenDown` — the one seam, now picking the read plane from the candidates the scorer built. No three.js, so it tests headlessly |
| `src/planarity.ts` | **Pure.** P1's whole read: the candidates (`face` / `previous` / `world` / `view`), the pen-down pick, the pen-up re-rank, the scorer and its four terms, `nameFace`, the chip's text. The camera arrives as a ray-caster function, so there is no three.js here either — §11 names this first for landing back in core |
| `src/chips.ts` | The runner-up, standing beside the mark in screen space: an HTML overlay positioned by projecting the stroke's centre, built from `ui.ts`'s `chip`, gone after `CHIP_MS` or on the next stroke |
| `src/log.ts` | The engine's session as the shard's log: a stroke in plane coordinates with its scale, the plane held as a rep, and readings / maths / clean forms / undo for free |
| `src/scene.ts` | three.js, the camera — **perspective or orthographic, the same pose through two lenses** — the orbit / pan / draw split, the ground grid, and the camera **as a ray-caster function** so `plane.ts` never imports three. Plus `rayForPose`, which rebuilds a ray-caster from a pose the log holds (that is what lets a stroke drawn minutes ago be re-projected onto another plane, and it rebuilds an ORTHO stand-in for a pose taken through that lens), `project`, `easeTo` — the one easing every camera move the chrome starts — and what the compass drives: `turn`, `pan`, `dolly` (toward the pointer), `snap`, `frame`, `setProjection` and `setPivot` |
| `src/view.ts` | **Pure.** The camera's own arithmetic: the six axis views with the up that makes each named plane read in its own frame, the flip to the other side, `viewFacingPlane` / `planeFacedBy` (the compass and the plane picker agreeing), `tooOblique` against the scorer's own `FACING_FLOOR`, `frameFor` (a bounds → a pose that fits it, sphere not box, at any aspect, in persp and in ortho), `orthoHeightFor` / `distForOrthoHeight` (why the projection toggle does not jump), and `balls` — the six axes projected onto the camera's screen basis, farthest first. No three.js |
| `src/navgizmo.ts` | The compass in the corner, as an **SVG overlay** built from the tokens: three arms from a centre with a labelled ball on each positive end and a hollow one on each negative, depth-sorted and turning with the camera, tappable (snap, and flip on a second tap), draggable (orbit, one finger, because it is chrome rather than canvas) — plus the *home* and *view* tiles and the pinned-view chips |
| `src/gizmo.ts` | The three axes, the three tiles, the slide handle, the centre |
| `src/ink.ts` | Pen-down → plane → live projection → the stroke as a `Line2`; the clean form as a dashed ghost for a few seconds. The scene's ink is **derived from the log** on every change, so undo needs no bookkeeping |
| `src/form.ts` | **Pure.** The form rung (§2.3): the closed vocabulary `gesture \| profile \| feature \| extent \| axis \| path \| label \| annotation`, placed by a table read top to bottom, first match wins — the sibling of `diagram/roles.ts` and read the same way. Every threshold is a ratio of the marks' own size, measured in world space so it holds across planes. **Row 1** (`gesture`: a scratch, counted against a solid's silhouette with core's own `countCrossings`) and **row 3** (`feature`: a closed mark on a solid's face, inside it) are P3's; **row 2 now also says what a profile is a profile OF** (P4, `against`), which is what turns an outline drawn over a solid into a diff rather than a second solid; row 6 (`path`) is P7's and still carries a comment saying so |
| `src/diff.ts` | **Pure, and where every diff threshold lives** (§4). The grid in plane units, the even–odd rasteriser, connected components, a region's outline (core's `trace` on the boundary pixels), `diffProfile` → coverage, missing and extra regions with their areas and their sentence, `overlapOf` (is this a profile OF that solid?), and `viewNameOf` (the foundation is the *top*, the height plane the *front*, the width plane the *side*). No three.js, so the arithmetic is pinned with no WebGL anywhere near it |
| `src/silhouette.ts` | three.js, and the only part of the diff that needs a renderer. `silhouetteOnPlane(renderer, geometry, plane)` renders the body flat white on black through an **orthographic** camera looking along the plane's own normal into a small offscreen target, reads the pixels back as a mask, and hands the mask's **boundary** to core's `trace` for the outline in plane units. Plus `planeKey`, the cache key that deliberately ignores the offset along the normal |
| `src/library.ts` | **Pure.** P6's whole rung: what a definition carries (each profile's fingerprint and the KIND of plane it lay on), `compareProfiles` — core's `matchPrimitiveFromLibrary` re-weighted for a question it does not ask — `matchLibraryDefinition` and `rankMatches` (plural, above a floor, each with the measurements it was scored on), `addProfileExample` (core's `correct` pattern at the profile rung), and `structuresFor`, which uses core's own structural signature only where it applies. **It knows no name**: it is handed definitions the hand has already named |
| `src/op.ts` | **Pure.** The op tree (§2.4): the whole vocabulary as a type, `extrude`, `revolve`, `cut`, `boss`, `mirror`, `place` (a dup's copy, and P6's placement OF a definition), `match` and `massing` implemented, `placeDefinitionStep` and `placeFrames` — the pose of a placement, worked out from the two inks it names rather than held — the geometry parameters derived from the drawing (the direction, the signed depth, the axis as a world line, a cut's *through* and a boss's own short side), **the nesting** (`on`, `rootOf`, `withStep`, `depthsOf`), the tree as text and back, and the lathe profile as radius-and-height about the axis. No three.js |
| `src/csg.ts` | **The one seam, and the one library behind it** (§10). `subtract(a, b)`, `union(a, b)` and `intersect(a, b)` on `THREE.BufferGeometry`, over `three-bvh-csg` (pinned, with its peer `three-mesh-bvh`). Nothing else in the shard imports the library. **It never throws**: every result is `{ ok, geometry }` or `{ ok: false, error }` |
| `src/solid.ts` | three.js. The mesh, **derived by WALKING the tree on every log change** (`deriveTree`) — `ExtrudeGeometry` and `LatheGeometry` for the leaves, the CSG seam for `cut` / `boss` / `mirror` / `match`, a plain merge for a `dup`'s disjoint copy; a quiet lit material from the tokens, `hardEdges` (the creases only, never the triangulation), the picking, `facesAt` (the faces under the pen as a plane plus the face's own corners, which is what a `face` candidate anchors on), `spanAlong` (what a cut goes THROUGH), `silhouetteOf` (the hull a scratch is counted against), `silhouetteOn` (the orthographic picture the diff reads, cached) and `brokenOf`. `deriveTree` takes a **`DeriveContext`** — `inkOf` and `silhouetteOf` — because a `match` step stores nothing derived and has to ask |
| `src/selection.ts` | Selection by default (§7): one thing at a time, a teal cage around a solid, and a diff region outlined on its own plane while its chip is hovered. Runtime state, never the log's |
| `src/field.ts` | One input, one reader. `readField(text, ctx)` returns *what Enter will do*; the verbs and their reasons are handed in, so the reader knows nothing about the DOM. Thirteen verbs now — `extrude`, `revolve`, `cut`, `boss`, `add`, `takeoff`, `mirror`, `dup`, `remove`, `regen`, `take`, and P6's `place` and `reject` (*Not a mug*) — each with its aliases in one table |
| `src/panel.ts` | The rows and the status line — and `pinnedViews`, still read off the log here though the chips are drawn in the corner — including *plays*, ***could be*** (P6: what the library says this outline is, ranked, in the engine's name), *solid* — the latter showing the tree **nested** (`↳ cut · through · from stroke:5` under `extrude · depth 2.40 u`) and a *broken* row with the seam's own words when a derivation did not come off — and ***matches the drawing***: one block per plane a profile of the selected solid was drawn on, with the coverage, the sentence, which outline it read, and a chip per region |
| `src/ui.ts` | pill · chip · tile · row · pane — `Demos/surface/00-ui.js` ported, not forked |
| `src/theme.ts` | The tokens read back off `../brand/tokens.css` at boot; nothing here restates a hex |
| `src/brief.ts` | **Pure.** `describeSpace` (§6) — the `describeReading` of this shard, and the **region-id rule** kept in stroke ids and step ids: what stands (the massing first, said to be the extent to stay inside), the planes and what lies on each in that plane's own units, the diff regions, **every name in play in its step's own id**, the library, the words, and then `HERE_IN_SPACE` — one paragraph on what can be made here and, as importantly, what cannot |
| `src/generator.ts` | **Pure.** The generator seat: the making and regen prompts, `parseProposal` (strict JSON first, then core's own two repairs, then reported — never guessed), the closed lists a reply may use (`PROPOSABLE`, `PROPOSABLE_SHAPES`, the colour words), and `propose`, whose transport is **injectable** so a stub never touches the network. Also `meaningMessages` / `parseMeaning`: asking a model which of the shard's own verbs a phrase meant, which is the only thing here a model is asked that is not geometry |
| `src/verbs.ts` | **Pure.** The verb table with name-resolved targets (§2.6 rule 4), `behave/words.ts`'s pattern ported: `SAYINGS` per verb, `CHANGES` for the size words, `namesIn` resolving a noun singular or plural against the names in play (core's own `singular`), and **what it cannot read is returned, not dropped** |
| `src/models.ts` | The model pane, `Demos/surface/04-models.js` ported: both local servers probed in parallel, embedding-only models hidden **and said**, the pick remembered as a preference, hosted providers by key — and **no key ever enters the log**. `joinWith` seats a model with a transport of its own, which is what `__shard.joinStub` is |
| `src/work.ts` | A model at work, shown **where it works**: a breathing `--sig-model` dot with the model's name and its task above the solid, the elapsed time after a few seconds, *Esc stops it* after thirty, and one `AbortSignal` per call so Esc really does |
| `e2e.js` | The whole loop through the real pointer path — **80 steps, P0 → P6 and the compass** — and, beside it, `__demo()`: the two-minute demo of §9 in ten asserted steps, with a timing on each |
| `build-standalone.mjs` | **One file.** Runs `npm run build` (which typechecks first), then inlines every asset Vite emitted — the bundle as one inline module, the stylesheet as one `<style>` — into `dist/shard-3d.html`, and refuses to write a page that still points at anything that would not travel with it. The font `@import` stays external, because the tokens name a fallback stack and a face is not worth trebling the file for |

## The design decision: how a solid is held in the log

**A solid is an artifact the engine already supports, blessed by tier 1, whose
`code` rep is the op tree as `json` with a marker on its first line.**

The plan's §2.4 asks for a new `op` kind beside `run` in `kinds.ts`. That is
core's to add (§11 lists it), and P2 was not to touch core — so the tree goes
in through the door that is already open: `summonMarks` → `bless` → 
`attachCode({ kind: 'json' })`, and the code's first line is
`// mm:op tree v1`, exactly the way `GRAPH3D_MARK` marks a program in
`tier1/library.ts`. `parseOpTree` strips the comment lines and reads the rest;
anything else on the board is not one of the shard's trees and is left alone.
When core grows the `op` kind, the marker goes and the kind takes its place.

**A tree that arrives as text is validated, never cast** (DATA-1). `OpStep` is
a type the compiler enforces on the code that BUILDS a tree and it says nothing
about one that comes out of the log, a folder, another hand's log or a model:
`{"op":"extrude"}` with no `depth` used to parse clean and then throw out of
`depth.toFixed()` the moment the panel described it. So `validateOpTree` walks
every step against those same discriminated types — the version, each op's own
required fields (a revolve's axis and sweep, never an extrude's depth), finite
numbers, reference types, ids unique per level with `on` pointing at a step
that already stood, and the bounds named in `OP_LIMITS` — and returns a
structured reason (`{ at: 'steps[3].depth', reason: … }`). `parseOpTree` keeps
its null contract; `readOpTree` is the sibling that carries the reason, and
`solids()` uses it: a rep that is not ours is skipped in silence, and one that
is ours and will not read stands as a **broken solid** whose panel row names
the fault and says the code rep is still in the log, untouched. Every accepted
tree is safe to `describeStep`.

Three consequences, each deliberate:

- **The engine is the author.** `bless` and `attachCode` are attributed to
  `ENGINE_PARTICIPANT` — a box from a rectangle and a line is tier 1, the
  canvas answering first (invariant 7), and the panel and the status line both
  say so. The word it is blessed with (`box`, `cylinder`, `wedge`,
  `extrusion`, `revolve`) is the engine's word for what it *made*, never a name
  anyone gave it (§2.6); the hand's own name arrives through the field.
- **One act, three events, one undo.** A solid is `summon` + `bless` + `code`.
  `session.undo()` drops one event, so `log.undo()` drops the whole act — see
  *How undo knows where an act ends* below. The ink is untouched, which is the
  done-criterion.
- **Blessing takes the members off the content plane, and the shard puts them
  back.** That is right for a canvas (a page is one thing, not five strokes)
  and wrong for a shard, where the profile that became a box is still ink lying
  on the box's face. `log.marks()` therefore derives from every node carrying
  ink and a plane rather than from `contentIds`.

## How undo knows where an act ends

**The act boundary is the act's own timestamp, and it was already in the log.**

An act is rarely one event. A stroke is two (the ink, then the plane proposed
on it); a solid is three; a flip is three; a model's proposal is `3n + 1`,
where n is however many profiles it drew — sixteen profiles is forty-nine
events. `session.undo()` drops one event, so the shard has to know where the
act ends.

It used to guess: walk back up to **twelve** events and stop when something
visible changed — a stroke count, an artifact, a tree, a correction, a
definition. Twelve was a guess at how long an act could be, and the stopping
rule was a guess at what an act does. The director review of 15 September 2026
(ACT-1) reproduced both failing: with one generated profile, undo restored the
old tree and left the model's circle standing on a board whose tree no longer
mentioned it; with sixteen, it never reached the version at all and left all
sixteen circles and the eighteen-step tree.

Every act in `log.ts` already threads **one `at`** through every event it
writes — `make` stamps its summon, its bless and its code alike, `applyProposal`
stamps every profile it drew, the version and every take-in the same — so an
act is exactly the run of consecutive events that agree on `at`. `undo` reads
that run and drops it. Nothing new is recorded, no event gains a field, no
marker is written, and **core's event schema is untouched**: changing that is a
cross-surface contract and an architectural decision, not a worker's aside.
Because the grouping is in the log rather than in memory, it survives a JSON
round trip for free — a replayed log undoes exactly as the live one does, which
is invariant 4 doing its job (a runtime ledger of act spans would be a second
source of truth beside the log).

Two stamps make that a rule rather than a coincidence, and both live in
`stamp()`:

- **No two acts share a time.** The clock can hand out the same millisecond
  twice — a synthetic pointer does it constantly, and a fast hand can — and two
  strokes a millisecond apart are still two strokes. An act whose time the log
  already holds is recorded one millisecond later.
- **A late result is stamped when it LANDS, not when it was asked for.** A
  reply carrying the moment Enter was pressed is still stamped after the stroke
  the hand drew while it waited, so it forms its own act on top: one undo takes
  back the reply and leaves the stroke.

The act table at the bottom of `createLog` is the only place a boundary is
declared — the index of each verb's `at`, stamped once and then threaded by the
verb itself.

**Older logs.** Every log this shard has ever written carries an `at` on every
event and threads a single one through each act, so an older log groups
correctly under this rule with nothing to migrate — it undoes as it did, and in
the two cases above, better. The old walk is kept as `undoByWalking` for the one
log the rule cannot read: one whose events carry no usable time at all, from
somewhere that is not this shard. That log undoes exactly as it always did.

`src/act.test.ts` pins it: the review's own regression at one and sixteen
profiles, human ink and names untouched, a late reply, two proposals on two
solids, a JSON round trip undoing identically, two acts in one millisecond, the
old walk on a log with no times, and a check that every verb in the table really
does stamp one time of its own.

## The CSG seam, and what it does when it fails

**One module knows a boolean library exists: `src/csg.ts`.** It exposes
`subtract(a, b)` and `union(a, b)` on `THREE.BufferGeometry`, and behind it is
`three-bvh-csg` 0.0.18 with its peer `three-mesh-bvh` 0.9.15, both pinned.
Nothing else in the shard imports either; swapping the library is an edit to
that one file, and if it were ripped out altogether, `cut`, `boss` and `mirror`
would still stand in the tree as the intent they are — because the tree is the
source and the mesh is derived (invariant 4). That is §10's second risk
answered: *CSG is fragile on messy input*, so the fragility has exactly one
address.

**The seam never throws.** A boolean on a hand-drawn profile can fail — a
self-crossing outline, a degenerate tool, an assertion deep in a triangle
splitter — and a derivation that threw would take the whole board down while
the log was perfectly fine. So every call comes back `{ ok: true, geometry }`
or `{ ok: false, error }`, and on a failure:

- **the body stays exactly as it was.** `deriveTree` keeps the geometry of the
  step the failed one acts `on`, so the solid renders as its previous version
  rather than vanishing;
- **the solid is marked broken**, and the panel's *solid* row says so in the
  library's own words, under a line saying that the tree is still the truth of
  the thing;
- **the status line says it once**, where it happened.

Three things keep the failure rate down, and each was found by looking at a
cut that came out wrong:

- **No face of a tool is ever coplanar with a face of the body.** A cut's
  prism starts a hair *above* the face and a THROUGH cut runs a hair *past* the
  far side; a boss's prism sinks a hair *into* the body. The hair is
  `TOOL_OVERLAP`, a ratio of the feature's own size. Without the second one the
  library returned `ok` and left the prism standing in its own hole.
- **Inputs are normalised before they are handed over** — non-indexed,
  position + normal + uv and nothing else, no groups — so a whole class of
  attribute-mismatch assertion becomes arithmetic that cannot fail.
- **A `dup`'s copy is merged, not unioned.** It stands beside the body by the
  body's own width, so the two are disjoint by construction; asking a boolean
  to weld two shapes that do not touch is work that can only fail.

In every browser run of the e2e and by hand — cut, boss, mirror, a mirror of a
mirror (which is a union of a body with itself, the nastiest case there is) —
the seam has not failed yet. The failure path is covered by `csg.test.ts` and
`geometry.test.ts` instead, which is the honest way to test a path you cannot
provoke.

## The diff is the brief

A solid claims to be what was drawn. **P4 checks the claim**, and that is the
whole package: `validateRegions` (`metamedium-core/src/parse/scaffold.ts`)
generalised from *"every region id the layout named appears once in the code"*
to *"every square unit the drawing asked for is in the body"* — the promise that
the thing matches the drawing, checked rather than assumed. Five parts, in the
order they run:

- **A profile is a profile OF something.** A closed stroke on a chosen or world
  plane still plays `profile` (row 2) — but if its outline overlaps a solid's
  silhouette on that plane it is *that solid's* profile, not the start of a new
  one, and the reading says so: *the side profile of box: its outline and that
  solid's silhouette share 91% of their material on this plane*. The overlap is
  the IoU over a floor **or** one containing the other, because a profile drawn
  to correct a solid is usually bigger or smaller than it and that is exactly
  when the IoU is low. Nothing waits for an extent beside such a mark, and
  `makeableFrom` will not grow one: a box inside the body it was correcting is
  the one thing the row must never produce.
- **The comparison is orthographic, along the plane's own normal.** So how far
  the plane has been slid along that normal does not enter into it: choose the
  width tile, slide it out beside the box or leave it at the origin, and the
  side view is the same side view. That fact is a test, not a remark.
- **The silhouette is rendered and then traced.** Flat white on black through an
  orthographic camera into a few hundred pixels across the solid's own extent,
  the pixels read back as a mask, and the mask's **boundary** handed to core's
  `trace`. The boundary and not the blob: core's tracer thins what it is given
  down to a centreline, so a filled rectangle comes back as its medial axis — a
  spine, not an outline. Found by handing it the silhouette straight and getting
  a cross.
- **The diff is masks.** Both outlines rasterised at one resolution over what
  they jointly cover, so a pixel means the same thing on both sides:
  `missing = ink & !silhouette`, `extra = silhouette & !ink`. Connected islands
  become **regions** with an area in plane units², a place in the drawing (*at
  the right*, *at the top left*) and an outline to build a prism on. Anything
  under `NOISE_FRACTION` of the drawing's own area is a speck where the two
  edges disagree, and the sentence says how many were dropped rather than hiding
  them.
- **Tier 1 resolves it.** *Add it* runs every missing region right through the
  body along the plane's normal and unions it; *Take it off* cuts every extra
  one out. Both are one `match` step, both instant, both a version with one undo
  — and the profile's ink is deliberately **not** taken into the solid the way a
  feature's is, because a profile is a standing claim about the shape rather
  than something the act used up. That is what lets the row re-read afterwards
  and say *matches 99% · missing none · extra none*.

### The `match` step holds nothing derived

This is invariant 4 taken at its word, and it is the design decision of the
package. A `match` step carries **which profile, which way (`add` / `remove`),
and which plane** — and no region, no area, no outline, no span. Everything else
is worked out again every time the tree is walked: the ink comes back out of the
log, the body-so-far is re-rendered flat on the plane, and the diff is run
again. A region cached in the step would be a second source of truth that goes
stale the moment the ink is flipped, redrawn or undone, and a replayed log would
then stand up a solid nobody drew.

The cost is that `deriveTree` cannot be a function of the tree alone, so it
takes a **`DeriveContext`** — `inkOf(strokeId)` from the log and
`silhouetteOf(geometry, plane)` from the scene. Both are seams, and both are
injectable: `match.test.ts` walks the tree with a silhouette computed by
arithmetic and no renderer anywhere, which is also how the round-trip is pinned
(the whole log replayed into a fresh session derives the same body). A step
whose ink is no longer on the board marks the solid **broken** with that reason
and leaves the body exactly as it was — the same rule the CSG seam keeps.

One consequence worth knowing: a solid's mesh is cached on its tree's signature,
and a tree with a `match` in it therefore signs the **ink it references** as
well. Without that, ink redrawn under a match would leave the old body standing
and nothing would say why.

### A tool may only be grown where growing it cannot change the answer

A missing region abuts the body exactly — it is *defined* as what the body is
not — so a prism built on its raw boundary has a face coplanar with a face of
the body, which is the classic way to make a boolean produce a hole with a skin
over it (`TOOL_OVERLAP`, learned once already in P3). So the region's outline is
grown by `REGION_DILATE` pixels before the prism is built.

Grown in **every** direction, as the first version did, it oversteps the hand's
own outline: *Add it* left a rim of material the drawing had not asked for, and
the row that was supposed to read *nothing missing, nothing extra* came back
*extra 1 region (0.15 u²) at the right*. **The diff caught the diff's own tool**,
which is at least the machinery working. A missing region may now grow only into
the silhouette and an extra region only away from the ink — into the places
where the growth cannot change what the region means. What is left after *Add
it* is a few half-pixel specks along the seam, under the noise floor, counted
and said out loud.

The prism's overlap **along** the normal is a different number and for a
different reason: `MATCH_OVERLAP` is a five-hundredth of the body's own span
rather than `TOOL_OVERLAP`'s fiftieth of a feature's, because a fiftieth of a
whole box is four per cent of its width — a bump visibly wider than the thing it
is on. Found by asserting the bounding box after an add and getting −7.08 where
−7 was drawn.

## The massing: the drawing is the extent, before it has a name

Two or three profiles on different world planes whose projections overlap **are
a solid already**. That is the oldest way of drawing a thing in space — plan,
elevation, section — and the shard stands it up the moment the second one
lands: each profile grown through the span of the *others* along its own
normal, and the prisms intersected (`intersect`, the CSG seam's third verb).
One `massing` step, in the engine's name, tier 1, with no name and no model.

Three consequences, each deliberate:

- **A massing GROWS while it is still only a massing.** The third elevation has
  to go *into* it rather than beside it, because each prism runs through the
  span of the others and a new view changes that span. So `growable` re-derives
  the whole step as a new version. The moment anything has been BUILT on the
  massing, another view is a standing claim about the shape and the diff (P4)
  is what it affords. One rule, one line, and the board never has to guess
  which of the two a mark meant.
- **Row 2's *nothing inside it* clause had to go.** It refused both marks of a
  nest, and it threw out the commonest plan there is: a castle's footprint with
  its turrets' footprints inside it. §2.3's clause is about a FACE — "only a
  closed shape inside a face is a feature", which is row 3 and a disjoint
  predicate, since a plane has one source — so a nest is now **reported** in
  the reasoning ("with 2 profiles inside it … a massing takes the union of a
  plane's profiles") rather than refused. `form.test.ts` pins the new reading;
  `match.test.ts` had to change too, because two profiles of one solid can now
  both stand and *Add it* is about the newest that still has something to say.
- **A prism is built on the shape, not on the sampling rate.** A hand leaves a
  nine-corner outline as a hundred and twenty-seven samples, and
  `ExtrudeGeometry` then builds a hundred and twenty-seven walls where nine
  will do. The boolean has to split every one of them against every face of the
  next prism; on the castle's three views it reached the BVH's own depth limit
  — *"Max depth of 40 reached"*, a library saying it has been handed a shape
  made of noise — and the e2e took **136 seconds**. The outline a SOLID is
  built from is now simplified at `PROFILE_SIMPLIFY` of the mark's own size
  (the fraction `getFingerprint` finds corners at); the ink is untouched, the
  shape is unchanged, and the same run takes **8 seconds**.

## The brief, and what it will not say

`describeSpace` is the `describeReading` of this shard, and the rule it exists
to keep is the **region-id rule**: the model is told about things *in the ids
the log uses for them* — stroke ids and step ids — so that what comes back can
be attached to the very same things. A brief that said "the big rectangle at
the left" would get back a reply about the big rectangle at the left, and
nothing could be done with it.

It leads with **what stands**, and says the massing is already standing and is
the extent to stay inside. A model asked to fill a volume that exists writes
into it; a model asked to invent one invents one. Then the planes and what lies
on each, in that plane's own units, so a depth in the reply is in them too;
then the diff if the board is reporting one; then **every name in play, in its
step's own id**, with *do not invent a synonym for one* said out loud (§2.6
rule 2 — this is what makes a regen reuse `turret` rather than reach for
`tower`); then the library, so a model may answer `{"reuse": "turret"}` and
write nothing at all; then, for a regen, exactly which steps may change and
that a reply touching any other is refused; then the words.

It ends with `HERE_IN_SPACE`, v10 F13's rule rewritten for space. The half that
earns its place is the refusal: *no meshes, no vertices, no triangles, no code,
no files, no libraries, no textures, lights or cameras* — and **you do not
write geometry**. That is invariant 5 said to the model in its own prompt
rather than only enforced on the way back in.

## The reply: dropped and counted, then clipped

Strict JSON first, always. The two repairs that follow are core's own
(`parseFill`) for core's own two reasons — a JavaScript template literal where
a JSON string was asked for, and a trailing comma — and they run only on text
that has already failed. Nothing infers intent; a reply that still will not
read is reported as unusable and the log is untouched.

Everything outside the closed vocabulary is **dropped AND COUNTED**, never
coerced into something near it: a step whose `op` is not one of the five a
model may propose (`extrude`, `revolve`, `cut`, `boss`, `mirror` — `massing`
and `match` are the engine's own), a profile shaped like nothing the shape rung
reads, a colour word the shard cannot paint, a step acting on one below it. A
proposal quietly reduced is a proposal nobody agreed to, so the count is said.

**The profiles a model adds are drawn into the log** through the same
`addStroke` a hand's ink goes through, attributed to it and declared content —
the canvas's `agent.draw` rule (`synthesize.ts`). They get the same
fingerprint, the same readings, the same clean form and the same eraser, and
the model's steps then reference them by the ids they were given. Two rules
were learned by running one:

- **Ink a model drew is the tree's provenance**, so it is taken into the solid
  the way a feature's ink is. Without that, two circles qwen3:8b had drawn on
  the foundation read as the castle's own *top profile*, and the panel
  dutifully reported eleven square units of material the drawing "did not ask
  for". A mark a solid was made from is never a claim about it.
- **A profile no step uses is not drawn at all.** The same model's first reply
  re-stated the three views as rectangles it then never mentioned again. Ink a
  model leaves behind that is part of nothing is not provenance, it is litter —
  and litter the form rung reads as three more standing claims, each costing a
  render and a rasterisation on every report.

**Then the whole thing is CLIPPED to the massing**, as a final step in the
engine's name: §6's extent invariant, taken literally. The clip holds no
geometry — only `on` and `bound`, the step whose BODY does the clipping, which
is re-derived every time the tree is walked, exactly as `match` does. A model
that asks for a forty-unit turret on a three-unit drawing gets a three-unit
turret, and the row afterwards says how much of the drawing the body honours,
per plane, measured rather than claimed.

## Where a definition lives, and why

**As a `definition` rep on the ROOT artifact, one per named sub-tree — not as
an artifact of its own.**

The plan asks for an artifact per named sub-tree, and the engine cannot give
one: `bless` needs marks that are still on the CONTENT plane, and a made
solid's members are not, because blessing took them off. That is the same core
gap P3's `dup` ran into, and it is listed below. A rep goes into the log
through `propose()`: it replays with the session, carries its own reasoning,
undoes like everything else, and costs nothing but the ability to point at a
definition with an id of its own. P6 matches definitions by their profiles, so
that costs nothing yet; the day core grows a door to bless an artifact from
data, a definition moves.

Taking a version is **one act**: the name and every definition go in as one
`propose`, so one undo puts the board back to a version standing held. The name
of the THING has two cases, and both are the same rule — *the part never names
the whole*. **A name the hand typed wins**: a solid already called *mug* with
one step a model named `handle` is a mug with a handle, and reading only the
steps took it as a *handle* (and, before that, refused *Take it* altogether
because no step carried a name — found by naming one). Otherwise it is the
**deepest** named step the root stands on, not the nearest: walking up from the
base, `castle` is what the turret stands on and the turret is what the top
stands on. Taking the nearest named one instead named the castle "top".

**The WHOLE is held too, under its own name.** P5 held only the parts, because
only the parts were typed afterwards. P6's whole point is that the thing itself
comes back when its own profile is drawn again, so *mug* goes into the library
beside *handle*, marked as the whole of it and carrying every outline the tree
was made from. `taken` therefore means *the definitions are held*, not *it has
a name* — reading the name rep disabled the very verb that holds the library.

## A definition carries its profiles

**Each profile is the engine's OWN fingerprint of that stroke, at the scale it
was drawn at, plus the KIND of plane it lay on — and nothing else.**

Nothing here is a new measurement. `getFingerprint` already ran on that ink
when it was logged, at the scale the pen was working at; what a definition
holds is that fingerprint's scale-free half (aspect, straightness, closure,
extent, corners) and the stroke's id. So a replayed log derives the same
numbers, which is invariant 4 for a thing that looks like a cache and is not.

Three decisions are worth writing down.

- **Only closed marks.** A tree's `from` carries the extent that said how tall
  as well as the profile that said what shape, and a line is not an outline:
  matching one would offer a definition for every straight stroke on the board.
  The same rule keeps a line out of the *honours* row, where rasterising one
  reported a coverage about the rasteriser.
- **Size does not score.** It is held — `place` scales by the ratio of it — but
  two mugs of different sizes are the same mug, and that is the whole reason
  for holding a definition rather than a drawing. Core's own comparison weighs
  size at a tenth because it is matching a stroke against a user's primitive,
  where it is evidence; here it is the answer to a different question.
- **The plane is evidence, not a gate.** Drawn on the same kind of plane the
  definition's profile lay on, a match is lifted by `PLANE_LIFT`; on another,
  lowered by `PLANE_DROP` — never vetoed, because a mug drawn on the width
  plane is still a mug. Both are smaller than the corner term, deliberately.

**The weights are core's, re-weighted, and the re-weighting was measured.**
`matchPrimitiveFromLibrary` divides the corner difference by four and scores
extent not at all; with those numbers a plain 2.4-square rectangle scored
**0.79** against a mug's side outline — over any floor worth having. Between
two closed profiles the two terms that actually separate them are the **corner
count** and the **extent** (a rectangle fills its box; the mug's outline fills
three quarters of it), so those carry more than half the weight and their
falloffs are steeper. The same rectangle now scores **0.62** against the mug
and **1.00** against a box; the mug's own outline scores 1.00 against the mug
and 0.62 against the box. Core's straightness **veto** is unchanged and still
comes first.

**A correction is an event, not an edit.** `propose()` appends, so a definition
rep is written once and never touched; *Not a mug* goes in as its own
`correction` rep beside it and `definitions()` composes the examples in log
order — core's `addExample`, at the profile rung. That is what makes a
correction replay with the session and come off with one undo, which a mutated
definition could not. It also made the undo walk learn a new act: a correction
sits on top of the stroke it was said about, and a walk that did not stop at it
dropped the mark as well — *Not a mug* erased the mug's profile.

## The placement holds no pose

`place(definition, pose)` (§2.4) is the third step in the tree that stores
**nothing derived**, after `match` and the clip. It carries the definition's
name, its tree, and **two stroke ids**: the profile of the definition the
outline was matched against, and the outline drawn here. The scale (the ratio
of the two outlines' own sizes), the turn (one plane's frame onto the other's)
and the shift (one outline's centre onto the other's) are worked out from those
two inks every time the tree is walked. A scale cached in the step would go
stale the moment either mark was undone, and a replayed log would stand a solid
nobody drew.

Both plane frames are (u, v, n) with `cross(u, v) = −n`, so the turn between
any two of them has determinant +1 and nothing comes out inside out — the same
left-handedness that had to be signed for in `solid.ts`, paying its way for
once. A placement whose source ink has gone marks the solid **broken** with
that reason and leaves the body as it was, exactly as a `match` does.

**It is a new ARTIFACT, and that is the door P3's `dup` could not find.**
`bless` needs marks that are still on the content plane; `session.import`
stands an artifact up from DATA — a name, bounds and a code rep — which is
precisely what a placement is. So a placed mug is a thing of its own that can
be cut, moved and named, rather than a second body inside somebody else's tree.
The core gap is therefore narrower than P3 thought: what is missing is a
*bless from data*, and `import` is the door that already exists.

## One file, and what it took

`build-standalone.mjs` runs `npm run build` and inlines what Vite emitted. Two
things in it are worth knowing, and the first was found the hard way:

- **`String.replace` reads `$&` in the REPLACEMENT.** A minified bundle is full
  of them, and the first run put the whole `<script src=…>` tag back into the
  middle of three.js — the script guard then said, correctly, that the page
  still referenced a file that would not travel with it. The replacement is a
  function now, which turns the substitution off.
- **A literal `</script>` would close the tag early.** In valid JavaScript that
  sequence can only occur inside a string or a regular expression, where
  `<\/script` means exactly the same thing, so it is escaped rather than
  merely refused.

The font stays external: `brand/tokens.css` pulls IBM Plex Mono with an
`@import`, the tokens name a real fallback stack, and the face is not worth
trebling the file for. The result is **936KB**, one `<script type="module">`
and one `<style>`, and it runs from a plain static server with no console
errors — `?demo=mug` included.

## The verb table, and what it hands back

`behave/words.ts`'s pattern, ported: a table of the ways each verb is said,
longest phrase first, and **what it cannot read is returned, not dropped**.
The three verbs are `regen`, `drop` and `paint`, and what separates them is not
which word a phrase starts with — *make* says all three — but what else it
carries: a colour word and something asking for it (*the tops are red*), a
change word (*make the turrets taller*), or a way of saying remove (*remove the
turret*). A noun resolves against the names in play, singular or plural, with
core's own `singular`, and the scope is the step ids that name covers.

Two of the three are **tier 1 and instant**: `drop` is a new version without
those steps, with anything that stood on them re-pointed at what they stood on,
so removing a turret does not take the castle with it; `paint` binds a colour
word to those steps. Only `regen` asks a model, and its pill carries the dot.

A phrase with a name in it that the table cannot place comes back whole, with
its reason — *"turret" (2 steps) is a name this space knows, but nothing in
"the turrets should feel more medieval" says what to do with it*. The field
then offers to **ask a model what it means**, once, against the closed verb
list and the names in play; the model is not asked what to do, only which of
the verbs the shard already has the human meant, so the worst it can be wrong
about is a word. The answer is held in the log as a `saying`, replayed with the
session, and the table reads that phrase itself from then on.

A phrase with NO name in it is not a phrase over names at all. It is a brief,
and the field sends it to a model as one.

## A material is drawn where the word was said

A boolean erases which material came from where: once a boss is unioned into a
body there is no face on it that knows it was a turret's top. So a colour word
on a step is drawn as **that step's own contributed volume**, standing in front
of the body — which is exactly the volume the word was said about — rather than
the body being split into coloured groups it cannot carry. `deriveTree` returns
those volumes as `parts`; nothing about them is stored, and a step with no
colour contributes none.

One thing this exposed, and it is the model's constraint rather than the
shard's: **a named world plane passes through the origin**, so a reply could
say *a circle on the foundation* and could not say *and it sits on top of the
tower*. A cap asked for that way came back buried inside the castle. A proposed
profile therefore carries `at` — the gizmo's own slide handle, said as a number
— and the prompt shows it.

## The compass in the corner, and the plane picker at the origin

They look alike and they answer different questions, so they are two widgets
and they always will be. **The plane picker** stands at the world origin, in
the scene, and its three tiles say *where ink lands* — a decision, blessed by
the act of tapping one (§3). **The compass** sits in the top-right corner, is
chrome rather than world, and says *where the eye is*. Nothing the compass does
touches the log: a camera pose is runtime, and the only pose the log holds is
the one a view stroke already carries.

The compass is an **SVG overlay**, not a second three.js scene rendered to a
corner viewport. It is a hundred pixels of six circles and three lines; an SVG
takes its colours from `brand/tokens.css` like the rest of the chrome, so light
and dark are the same tokens inverted with no second palette, and it costs no
draw call. `view.ts` does the only hard part — projecting the six axes onto the
camera's own screen basis and sorting them by depth — and it is pure, so it is
tested without a canvas.

**What it shows.** Three arms from a centre, each ending in a ball: the
positives labelled `X` `Y` `Z`, the negatives hollow and bare. The world
convention is Y up, so `X` is the **right** view, `Y` the **top**, `Z` the
**front**, and each ball's tooltip says its name and what a second tap would do.
Near balls are drawn larger and over the far ones (`ballScale`, and a painter's
order rather than a z-buffer). The ball that faces the **chosen plane** carries
the teal keyword colour — the same signal the picker's tile carries, because
they are saying the same thing — so the view that puts your drawing plane flat
on is one tap away, and you can see which one it is without trying.

**What it does.** A tap snaps, keeping the target and the distance: a snap is a
turn, not a re-frame. A second tap on the same ball flips to the other side, as
Blender does. A drag anywhere on it orbits at the same radians-per-pixel the
canvas drag turns at — one finger, because the widget is chrome and one finger
on the canvas draws. Under it, *home* frames everything on the board (or the
plane picker itself, when the board is empty, because that is the next move),
*view* is persp / ortho, and every pinned view is a chip.

**A snap never leaves you edge-on in silence.** If the plane you have chosen is
too oblique to draw on from where the camera has arrived — the scorer's own
`FACING_FLOOR`, so the compass and the planarity read use one number — the
status line says *top · ortho — the height plane is edge-on from here, so
choose another or orbit*. §10's last risk is that the pen works and the ink
goes nowhere; the fix is to say so before the hand finds out.

### The decision: perspective follows the camera

**A tap on a ball goes orthographic, and orbiting off the axis comes back to
perspective.** This is Blender's "auto perspective", and the reason for it is
the reason the three canonical views exist: a front, top or side view is a
draftsman's, and perspective is a lie in it — two equal edges at different
depths measure differently, which is exactly what you went to that view to
check. Off the axis, perspective is the truth-teller instead: depth is what
says the thing is solid.

Pressing the *view* tile **pins** the projection where you put it, and a tap on
a ball hands it back to the camera. One way in, one way out, and the tile says
which state it is in on its face (its tooltip says the rest). The toggle does
not jump: going to ortho, the frustum height is the perspective frustum's
height **at the target** (`orthoHeightFor`); coming back, the distance is the
one that frames that height (`distForOrthoHeight`). Each is the other's
inverse, and the pair is pinned by a test.

Both cameras stand in the same place and `space.camera` is whichever is live,
so everything that takes a camera — the ray-caster the planes are read through,
`scaleAt`, the picking, the projection of a world point to screen — swaps with
it and nothing else in the shard knows. A pose taken through the ortho lens
carries its frustum height (`Pose.ortho`), so `rayForPose` rebuilds an
orthographic stand-in rather than fanning parallel rays: view ink drawn in
ortho re-projects correctly minutes later, which is what the flip chip needs.

### The keys, and why they are where they are

`1` `2` `3` `0` were already the plane picker's, and they stay the plane
picker's: a plane is chosen far more often than a camera is snapped, and the
older binding wins. So the camera takes the **numpad**, exactly where Blender
has it, and `Shift` + the same digits for a keyboard without one:

| Key | What |
|---|---|
| `1` `2` `3` | choose the foundation / height / width **plane** (unchanged) |
| `0` | un-choose — from here the plane is read |
| numpad `1` / `3` / `7`, or `Shift`+`1` / `3` / `7` | front / right / top |
| `Ctrl`/`Cmd` + either | the opposite side — back / left / bottom |
| numpad `5`, or `Shift`+`5` | persp / ortho |
| numpad `9`, or `Shift`+`9` | flip to the opposite side of the view you are at |
| `f`, `Home` | frame everything |
| right-drag, `Space`+drag, drag on the compass | orbit |
| middle-drag, `Shift`+right-drag, two fingers | pan |
| wheel, pinch | dolly, toward the pointer |
| `Cmd/Ctrl`+`Z` | undo |

**Two fingers now pan and pinch rather than orbit.** They orbited in P0, and
the compass is what makes the change payable: there is now a place to orbit
from with one finger that is chrome rather than canvas, and on a touch screen a
two-finger drag is the gesture a hand already has for a map. One finger still
draws, which is the rule nothing may break.

### Orbit around the centre of the view

An orbit asks, once, at the moment the drag begins: the **selection** if there
is one, else **nothing** — and nothing means the target, the centre the hand
panned to. Either way the target is not moved onto anything: with a pivot the
camera **and** the target turn rigidly about it, so the pivot keeps its place
in the camera's own frame and stays under its own pixel. The arithmetic is
`orbitBy` in `view.ts`, and it is tested there.

This is the fix for *"the rotation needs to respect the translation of the
overall view so it doesn't snap to center"* (John, 16 Sep 2026). The first
version moved the target **onto** the pivot and rebuilt the angles from where
the camera stood — which re-aimed the camera, so the picture swung the pivot to
the middle of the screen the moment a drag began, and a view panned off-centre
snapped back to it. Pan somewhere and turn now, and the centre stays where it
was put.

Gone with it: orbiting about whatever the pointer happened to be **over**. Even
made rigid it would put the centre of the turn on a different point every drag
and drift the view off the place the hand panned to, for no act the hand
performed. A selection is asked for; a pixel under a cursor is not.

A **dolly** asks the same question and gets a different answer on purpose: it
goes toward whatever is under the pointer, selected or not, because there you
are pointing at where you want to be rather than at what you are working on.
Answering both with "the selection" is how a wheel over the corner of a thing
sails past it — which is what the first version did, and it is why
`setPivot`'s function is told *why* it is being asked.

## Ink is never covered, on a face

Invariant 3 says a solid made from a sketch draws **with the sketch still on
its face, faint**. A solid grows *out of* the plane its profile lies on, so the
profile's ink ends up flush with a face or inside the solid, and an ordinary
depth test would hide the very mark the thing was made from — from every angle
that matters.

So the marks a solid was made from are drawn with **the depth test off**, at
0.3 opacity, above the solid, while the solid's material carries a polygon
offset so a coplanar face never fights a line. The cost is honest and visible:
a box with its footprint showing through reads a little like glass. The
alternative — lifting the ink to the outside of the base face — is physically
truer and shows the hand nothing, because the ink would then be *under* the
box. This is the trade, and it is John's to overturn.

**It was tried, in September 2026, and it does not come off.** Turning the
depth test ON is an immediate visual win: the box stops reading like glass and
reads like a box, in both themes, and a screenshot settles it in a second. What
it costs is the thing invariant 3 is for. Three findings, in the order they
turned up:

- **A polygon offset does not win the tie.** The obvious way — depth test on,
  with the ink offset toward the eye against the face's own offset away from it
  — leaves the ink invisible. Every stroke is already lifted `LIFT` (0.004 u)
  along its plane's normal, which for a profile is *into* the solid; a polygon
  offset in depth-slope units never recovers that, and a `Line2` is a
  screen-widened quad whose slope at a face seen head-on is near zero, which is
  the worst case for the offset.
- **A camera-facing lift does win it** — move the ink object a fraction of the
  camera's distance toward the eye before the test, recomputed on every camera
  change — and the mechanism is demonstrable: exaggerate it and the ink pops
  out in front of the body from every angle.
- **And it still shows the hand nothing**, because of where the ink IS. A solid
  grows *away* from the plane its profile lies on, so the profile's ink ends up
  on the one face you are never looking at; from underneath, where it is
  visible, it coincides with the body's own silhouette edge and says nothing
  you could not already see. Depth-testing it buys a better-looking box and
  loses the only view in which the sketch was telling you something.

So the glass stays, and the trade is still John's — but it is now a trade with
a measured price rather than an untried alternative. The one place the argument
could change is a **feature** drawn on a face that stays visible (a circle for a
cut or a boss, on a top face): there depth-testing would show the ink crisply
where it lies. That is an argument for deciding per-mark — profile ink through
the body, feature ink on its face — and not for one flag over all of it.

## The design decision: how the plane is held on the stroke

**The plane is a `plane` rep on the stroke node, proposed by the local
participant through `session.propose()`.** §2.1 says the plane is "a rep on the
stroke with a reason, either way it came to be there", and `Rep.data` is
deliberately `unknown`, so this needed no new event type: the plane goes into
the log as a `propose` event, replays with the session, and carries its `why`
and its confidence like every other reading. A parallel shard-owned map keyed
by stroke id would have been a second source of truth beside the log, which is
invariant 4 broken on the first package.

The one cost is **undo**. `session.undo()` drops the last non-tick event, and
for a stroke that is the `propose`, not the stroke — one undo would leave the
ink with no plane. So `log.undo()` walks back until the number of `stroke`
events actually falls (`src/log.ts`). This is worth knowing if the engine ever
grows a "drop this event and its dependents" undo; until then the loop is four
lines and the test pins it.

## The design decision: the scorer, in one paragraph

**`confidence = shape × facing × anchor × continuity`**, and it lives in one
place (`src/planarity.ts`, `rank`). **Shape** is the shape rung's own top
confidence on the stroke's screen path cast onto that candidate, read at that
plane's own `scaleAt` — the strongest term, and the only one that knows what
was drawn; floored at `SHAPE_FLOOR` when the rung places nothing, so a plane is
never scored zero for a squiggle. **Facing** is
`FACING_BASE + (1 − FACING_BASE)·|n · look|`: 1 flat on, `FACING_BASE` edge-on,
gentle on purpose because a box's top seen from above is only 84% face-on and
must not lose to the view plane for being 100%; below `FACING_FLOOR` the
candidate is **kept, marked *too oblique to read*, and can never win** (plan
§10's last risk), and below `FACING_TAKES` it is **kept, marked *too oblique to
take the stroke*, and cannot outrank the view plane** — see *the gate*, below.
**Anchor** is how much of the stroke lies on geometry that
lies in that plane — a face's own corners, the previous stroke's bounds — as a
ratio of the stroke's own size: `ANCHOR_BASE` when there is nothing there
(absence of evidence), up to 1 when the ink lies on it, and **down to
`ANCHOR_MISS`, below the base, when there is geometry and the ink is nowhere
near it** (evidence against — see below). **Continuity** is 1 for the previous
stroke's own plane within `recentWindowMs` and `CONTINUITY_BASE` otherwise.
Multiplicative rather than a weighted sum, because the terms are independent
evidence and any one of them being bad *should* pull the whole candidate down:
a plane the stroke reads as nothing on, seen nearly edge-on, with nothing in
it, is not saved by being recent. Every term is returned on the candidate, so
the panel shows the evidence and not only the number.

## The design decision: the gate — off-axis ink is conserved

John, 16 September 2026, drawing with nothing chosen: *"drawings off the main
axis are on the camera plane mapped rather than the way it is stretching the
shapes out now; the shapes drawn off main axes should stay conserved size at
the angles that make sense."*

The scorer is a comparison of evidence, and a half-oblique plane can win one.
At forty-five degrees a world plane's facing term costs it only 22%, and
continuity plus an anchor pay that back twice over — so a circle drawn beside a
box came back a long ellipse lying on the ground. Casting a screen path onto a
plane at that angle is not a reading of what the hand drew; it is a stretch of
it, and no amount of confidence makes the stretch the shape John made.

So with nothing chosen the **view plane is the default**, and evidence does not
merely have to beat it — it has to **make sense at its angle** first.
`FACING_TAKES` (0.80, 37° off face-on) is that gate: below it a `world`,
`previous` or `face` candidate is kept, said out loud, still offered by the
runner-up chip, and **cannot outrank the view plane**, whatever its shape score.
Above it the four terms decide exactly as before. It applies at pen-down too: a
face under the pen keeps its precedence only if it passes, and otherwise the
stroke goes on the **view plane at the depth of that face**, so the ink lies
where the hand pointed without being stretched across it.

The number is bounded from above by the shard's own default three-quarter view,
which sees a horizontal plane at **0.844** (`DEFAULT_PHI`, 57.6° above the
horizon). A gate over that would mean the view the shard *opens on* could not
take a face at all, and P2/P3 — a profile on a face, a feature in one — would
have nowhere to land. So it sits just under it.

What the view plane conserves is not a threshold but a property: it is
screen-facing by construction, so the cast is a **similarity transform** — the
circle is the circle, at the depth the hand pointed at. `planarity.test.ts`
pins the aspect to within 1%, and the e2e measures the same thing through the
real pointer path at a 49° view: `1.0000` on the view plane, `0.825` the moment
the ground is taken from the chip.

Two things the gate deliberately does **not** do. It does not touch a **chosen**
plane: the gizmo's tile is a decision, and a decision is not a reading to argue
with — choose the foundation and the stroke lies on it at any angle, with the
edge-on warning as it was. And it does not *drop* anything: the gated plane is
in the panel with its number, its facing, and what taking it would cost, and the
chip takes it in one act. The hand overrules the gate; the gate never overrules
the hand.

The demo was leaning on the defect. `?demo=mug` orbited by 0.04 before drawing
the hole, which left the rim 0.70 face-on — an angle at which the face outscored
the view plane 0.68 to 0.55 and the circle landed on the rim as a 1.4:1 ellipse.
It now orbits to 0.3 and looks *into* the mug, which is the angle the demo's own
sentence was always describing.

## The design decision: how a flip is one act

A flip re-reads the mark's **kept screen path** onto another candidate, under
the **pose in the log** rather than wherever the camera is now. It cannot be a
new rep on the same node: `getRep` returns the FIRST rep of a modality, and the
readings, the fingerprint and the maths were all computed from the ink at
`addStroke` — a second `stroke` rep would never be seen, and a mark whose
plane changed but whose readings did not would be a lie. So the flip is a new
stroke, and it is **additive**: `add` the re-projected stroke, then `erase` the
first, in that order, all three under the flip's one timestamp — so `log.undo()`
drops the erase, the plane and the stroke together and the first mark comes back
on its first plane — one act, three events, one undo.
The other order would leave the first mark erased. A mark a solid was made
from is refused, and says why: the tree references that stroke id and was
measured in that plane.

## What P0, P1, P2, P3, P4, P5 and P6 found

Honest gaps rather than bugs, and two of them are core's:

- **`measure()` assumes world units are screen pixels.** It rounds to whole
  units (`r0 = Math.round`) and labels every length `px`. In plane units a
  1.2-unit circle comes back as "radius 1px" — the shape rounded away. The
  shard measures each mark on a copy scaled by `1/scale`, where the engine's
  own unit label is literally true, and the panel says which space it is in.
  **For core (§11): `measure()` should take the stroke's scale the way
  `analyzeStroke` does, and name its unit.**
- **The tokens have no `prefers-color-scheme` block.** `brand/tokens.css`
  defines dark under `[data-theme="dark"]` only, so a surface whose theme is
  *system* must stamp the attribute itself — stamping nothing renders light on
  a dark machine while the tile says `sys · dark`. `src/theme.ts` stamps.
- **`linewidth` is ignored on a plain `THREE.Line`,** and a hairline is not
  ink. The ink is drawn with `Line2` (screen-space quads) so a stroke reads as
  a stroke at any zoom.
- **`propose()` composes a rep's `reasoning` INTO its `data` with a spread**
  (`{ ...(r.data as object), reasoning }`), which turns a string rep into a map
  of its own characters: `'plinth'` comes back as `{0:'p',1:'l',…}`. The shard
  passes an object (`{ text, why }`) instead. **For core (§11): either reject a
  non-object `data` when `reasoning` is given, or keep the reason beside the
  data rather than inside it.**
- **There is no rename.** `bless` takes a name once and `wordOf` reads the
  *first* `word` rep, so a second name is never seen. The hand's name is held
  as the shard's own `name` rep, newest first. **For core: a rename event, or
  `wordOf` reading the newest.**
- **A plane's frame is left-handed.** The plane's axes are (u, v, n) with v
  running *down* the screen, and `cross(u, v)` is exactly `-n` for every plane
  — so a matrix made of (u, v, n) is a mirror and every face of every solid
  comes out inside out. `solid.ts` builds (u, v, cross(u, v)) and signs the
  extrusion to suit. Pinned in `geometry.test.ts`.
- **The engine's relations are per-plane, and the form rung's are not.** A
  bless computes a signature and union bounds over marks whose coordinates are
  in *different planes*, which is arithmetic on incomparable numbers. Nothing
  in P2 reads those, and the form rung measures in world space — but a
  signature across planes will mean nothing to P6's matching. **For core, or
  for the shard to carry: a signature that knows which plane each mark is on.**
- **three.js lighting is physically correct, and the tokens are not exposure
  values.** `--paper-dk` under an ambient of 0.9 renders as slate; the scene's
  levels are set so a face of that token comes back on the paper it was named
  for.
- **Geometry in a plane that the ink misses is evidence AGAINST it, not the
  absence of evidence.** A face's plane is infinite and the face is not. With
  the anchor term floored at its neutral base, a circle drawn in clear air
  beside a box read as lying on the box's **top face**, purely because the
  stroke before it had been drawn there and continuity carried the plane. The
  anchor now runs down to `ANCHOR_MISS`, below the neutral base, when there is
  geometry in the plane and the ink is more than its own size away from it.
- **A world plane read from the evidence should stand where the pen is.** §2.1
  says "the three world planes through the origin (or through the gizmo's slid
  origins)", and the parenthetical is the point: where a world plane stands is
  a choice, and the gizmo's slide is the hand making it. With nothing chosen
  there is no slide, but there is still a place the hand is working. Standing
  them at the world origin offered a `height` plane a profile does not touch,
  so flipping an extent onto it produced a mark the form rung could not see as
  an extent — a chip that settled nothing. They now stand through the point the
  pen came down on when it came down on something, and say so. It also settled
  the runner-up on a box's top face: the horizontal plane through the pen IS
  that face, so it is offered once, and what is left second is `view`.
- **A stroke's screen path is meaningless without the camera it was drawn
  under,** so every stroke carries a `Pose` in its plane rep, not only view ink.
  That is what lets the chip's flip re-project a stroke drawn minutes and an
  orbit ago; `scene.rayForPose` rebuilds a ray-caster from it against a spare
  camera, and nothing about the live camera moves.
- **`getRep` returns the FIRST rep of a modality, so a reading cannot be
  revised in place.** A mark's readings, fingerprint and maths are all computed
  from the ink at `addStroke`, and a second `stroke` rep proposed later is
  never read — so re-reading a stroke onto another plane has to be a new node,
  and the flip is shaped around that (above). It is the same gap as "there is
  no rename". **For core (§11): a rep that supersedes — newest wins for the
  modalities that are readings, or an explicit `revise` that re-derives what
  was derived from the ink.**
- **A gesture's reading is not derivable from the board it changed.** Row 1
  reads a stroke against the silhouettes of the solids standing in its view —
  so the moment a scratch has done its work there is no solid left to cross,
  and the table re-derives the very same mark as an `annotation`. The reading
  is therefore HELD on the mark as a `gesture` rep the way core holds one
  (`session.ts`, `role: 'scratch'`), and `forms()` prefers it. *What a mark did
  is not a function of the board it left behind.* Found by asserting `plays`
  after the scratch and getting `annotation`.
- **A zigzag that comes back to where it started reads CLOSED, and a closed
  stroke is never a scratch** — it is a lasso, which is core's rule and the
  right one. An even number of traversals ends on the side it began, so the
  e2e scratches with three.
- **A boolean's output cannot be given to `THREE.EdgesGeometry`.** It keeps an
  edge when the two faces sharing it disagree by more than the threshold *and*
  when nothing shares it, because that is a boundary — and a triangle splitter
  leaves coincident-but-separate vertices and T-junctions all over a re-cut
  face, so a box with a hole in it came back drawn like a spider's web. Every
  solid the shard derives is a CLOSED body, so a genuine boundary edge cannot
  exist: `hardEdges` keeps only edges shared by exactly two faces that
  disagree, and drops the rest as what they are — the triangulation talking.
- **`bless` needs marks that are still on the CONTENT plane**, and a made
  solid's members are not (blessing took them off). So there is no way to
  BLESS a second artifact up from a tree alone, which is why `dup` is a `place`
  step on the same tree — one tree, two bodies — rather than a second solid.
  **P6 found the door that does exist: `session.import` stands an artifact up
  from data** (a name, bounds and a code rep), which is exactly what a
  placement is, so a placed definition IS a thing of its own. The gap is
  therefore narrower than it looked: what core still lacks is a *bless from
  data* — an artifact made from a tree, attributed and summon-less, with the
  membership a bless gives it. `import` gives everything but the name of the
  act.
- **The e2e's tab must be fronted.** A hidden Browser-pane tab lays the canvas
  out at zero size, `screenFor` returns (0, 0) for every point and no stroke is
  made. `resize()` already refuses an aspect of 0; nothing can refuse a
  viewport that is genuinely not there. **And `?demo=` needs the same thing for
  a different reason**: the demos wait for a laid-out canvas on
  `requestAnimationFrame`, and a tab the browser is not painting gets no frames
  at all, so the demo simply never starts. The canvas has the same lesson
  (`nextFrame` in `Demos/surface/01-view.js`): a loop that depends on paint is a
  loop that stops when nobody is looking.
- **`trace` thins what it is given, so it must be given a BOUNDARY.** Handing
  core's tracer a filled silhouette returns the medial axis of the blob — a
  spine, not an outline — because thinning is the second of its four steps. The
  mask's own one-pixel boundary is what it wants, and then it does exactly the
  right thing. **For core (§11): nothing to change; this is a note for the next
  caller, and the diff's `outlineOfMask` is the reusable half.**
- **A prism built on a hand's sampling rate is a shape made of noise.** See the
  massing section: 127 walls where 9 will do took the e2e from 8 seconds to
  136, and the boolean library said so in its own words. **For core (§11):
  nothing to change — `simplifyStroke` is already there and is exactly the
  right tool; this is a note for the next caller who hands raw ink to a
  triangulator.**
- **A derived measurement the panel asks for on every hover has to be cached.**
  `honoursOf` is three offscreen renders and three rasterisations, and the
  panel asks for it on every hover and every report; uncached, a board with a
  massing on it spent whole seconds a frame re-measuring a body nobody had
  touched. Cached per log version, like the diff.
- **`propose()` has no rename, so the shard's `name` rep is read newest-first —
  and a definition has the same shape of problem.** Definitions are reps on the
  root artifact because `bless` cannot stand an artifact up from data (below).
- **A model can name a plane and cannot say how high up it stands.** The three
  world planes pass through the origin, so a reply had no way to put a cap on
  top of a tower; a proposed profile now carries `at`, the gizmo's own slide.
  Found by asking a stub for a cap and getting one inside the castle.
- **A real local model stays in the vocabulary and drifts on the words.**
  qwen3:8b returned valid JSON in the closed vocabulary first time — five
  steps, two mirrors, no repair needed — but named its steps `castle_base`,
  `turret_front` and `turret_side` rather than reusing the brief's own words,
  and bound no colour at all. A second run named them `castle body` and
  `turret` and bound `grey` and `green`. The brief says *use these exact
  words*; a small model reads that as advice. **Reusing an existing name is
  checked (the regen's `mutable` list); INVENTING one from the human's words is
  not, and cannot be without the shard deciding what the human meant.**
- **The panel's height was a guessed number, and P4's two pills found it.**
  `#panel` stopped at `100vh - 220px`, which assumed how tall the field would
  be; two more verbs made the field taller and it began covering the bottom of
  the panel — which is exactly where the newest row lives. The field now
  measures itself into `--field-h` on every render and the panel stops where the
  field starts. A layout constant about another element's content is a constant
  that goes wrong the first time that content grows.
- **Core's own primitive comparison is too forgiving between two closed
  outlines.** `matchPrimitiveFromLibrary` divides the corner difference by four
  and does not read `extent` at all, so a plain rectangle scored 0.79 against a
  mug's outline. It is right for what it was written for — a stroke against a
  user's primitive, where size is evidence and the stroke may be open — and
  wrong for *is this outline that definition*. **For core (§11): the weighting
  is the caller's business, so what would land there is the comparison with its
  weights as an argument, not a second copy of it.**
- **`taken` meant two things, and the second one broke the first.**
  `versionOf().taken` read a `name` rep, which was the same as *the definitions
  are held* only while `take` was the only way to name a solid. Naming one by
  hand first — which is exactly what P6's demo does — disabled *Take it*, the
  verb that holds the library.
- **`String.replace` substitutes `$&` in the REPLACEMENT string**, and a
  minified bundle is full of them. The standalone build put the very
  `<script src=…>` tag it was replacing back into the middle of three.js. A
  replacement function turns the substitution off; the guard that refuses to
  write a page still pointing at a file is what caught it.
- **A demo that waits for a frame waits forever in a tab nobody is painting.**
  The `?demo=` blocks wait for a laid-out canvas on `requestAnimationFrame`;
  whichever comes first, a frame or a timer's tick, now moves them on — the
  canvas's own lesson (`nextFrame` in `Demos/surface/01-view.js`). It does not
  save a HIDDEN pane, where the canvas genuinely has no size and every
  projected point is (0, 0): that is the tab-fronting note below, and it is
  still true.
- **A step id is recycled when the step that held it is dropped.**
  `nextStepId` fills the lowest free number, so a regen that replaces the only
  named step hands the replacement the same id. Nothing points at a step id
  across a version, so nothing is wrong today — but the id is not a name, and
  a test that asserted "the id changed" was asserting the tree's arithmetic
  rather than the act. What the e2e asserts is that the STEP changed and that
  no other step did.
- **A hole cut through a body makes its own plan stop describing it.** After
  *Cut a hole*, the *honours* row for the mug reads 56% against the rectangle
  its plan was drawn as — because from above the thing is now an annulus with a
  handle. That is the diff being right, and it is worth saying out loud: the
  row measures the body against the drawing it was made from, and cutting into
  a thing is a way of leaving that drawing behind. **The row now says that
  itself** — *top 56 (material was taken off since it was drawn — less is
  expected to show)* — because a bare low number is indistinguishable from a
  wrong one.

### What a body is answering to (`src/constraints.ts`)

The *honours* row used to take `steps[0].from` and rasterise every closed mark
it found where that mark happens to lie. On a placement that is wrong twice
over: a `place` step's two stroke ids play **different roles** — the outline it
stands at, drawn here, and the outline the definition it copied was made from,
lying at the original — and comparing the second one in place compares this
body against somewhere else. The completed mug said *honours the drawing 20% ·
top 39 · top 0*, and the 0 was the first mug's plan.

`activeConstraints(tree, ctx, drawnSince)` walks the tree instead and classifies
every closed mark it references:

| kind | what it is | where it scores |
|---|---|---|
| `target` | drawn at this instance: a massing's profiles, an `extrude`/`revolve` profile, a `match`'s profile, a `place`'s `toMark` | where it lies |
| `source` | the definition a `place` copied was made from — `of`, and every stroke the copied steps name | **carried** onto this body by the placement's own pose |
| `revision` | drawn against this body after it stood (the form rung's *profile of*) | where it lies |

**A correspondence is carried, not dropped.** The pose is already re-derived
from two inks on every walk (`placeFrames`, invariant 4), so the same pose puts
the definition's outlines where this body stands — a translation, a turn or a
half-scale placement cannot lower agreement merely because the source sketch is
still lying elsewhere. When the pose cannot be derived (the source ink was
erased — the same condition that calls the solid broken), the constraint keeps
its ids and loses its number: *not counted: …*. Provenance is never dropped to
improve a score.

**A feature is a claim about a face, not about the extent.** Coverage is an
intersection over a union, so a small circle measured against a whole body
reads near zero whether it was cut or bossed — and a cut's outline is a claim
that there is *nothing* there. Both are kept, both say why, neither is counted.
The placed mug now reads *honours the drawing 47% · top 39 (…) · top 54
(carried from mug; …) · not counted: …*.

## What P0, P1, P2, P3, P4, P5 and P6 do not do

**The read cannot tell a line going away on the ground from a line rising.**
This is the honest limit, and it is plan §10's first risk arriving on
schedule. A straight screen stroke reads `line 0.92` on *every* plane, so the
strongest term — the shape rung — says nothing; the two readings are the same
picture, and no term in the scorer can separate them. So an extent drawn from
a profile's edge with **nothing chosen** reads `previous · foundation 0.64`,
with `view 0.55` and `height 0.40` behind it, and no box stands. That is not a
bug to tune away: it is the read saying what it actually knows. The answers are
the two the plan already gives — **choose the height tile** (a decision, blessed
by the act, which is why the gizmo exists), or **take the chip**: flipping the
mark onto `height` makes it an `extent` and the box stands at tier 1, with one
undo back. The e2e drives exactly that. The evidence that *would* separate them
is occlusion — the ground rectangle under a box is somewhere the pen could not
have reached — and that is a fifth term the plan does not name; noted, not
built.

**The scorer's terms are the four §2.1 names and no others.** No occlusion, no
prior over which plane a hand uses most, no learning from what was taken. Each
of those would help; each is a new kind of evidence and wants the plan's
sanction first.

**`pickAtPenDown` is not the scorer.** At pen-down there is no stroke to read,
so the live plane comes from where the pen is: a face beats everything, else
the previous plane when it is recent AND the pen came down near that stroke,
else the view. The full read happens once, at pen-up.

**A flip does not re-read what the flipped mark affords beyond tier 1.** It
does run the tier 1 check (a line that was flat on the ground and is now rising
off a profile IS an extent, and the box stands) — but a flip of ink a solid was
made from is refused outright rather than rebuilt, and `whyNotFlip` says so.

**Row 1 is not restricted to the view plane, and the plan's §2.3 does not
restrict it either** (its *Where* column is "crosses a selection or a solid",
with no plane named; it is row 6 that is about the view plane). What is
enforced is the rule that matters: **ink ON a solid's own face is never a
scratch — it is a feature**, and neither is the ink a solid was made from,
which is its provenance. The reasoning says which plane the stroke was
actually read on. In practice the e2e's scratch reads `previous` rather than
`view`, because a straight screen stroke reads much the same on every plane
and continuity carries the last one — §10's first risk again, and the same
answer: the read says what it knows, and the chip is there to argue with.

**The silhouette is a convex HULL, not a true silhouette.** The mesh's
vertices are projected and taken round; a concave solid's dent is inside it, so
a scratch through the mouth of a C counts as crossing the C. Good enough for
this rung — erasing is a coarse act and it still takes three crossings — and
it is one function to replace.

**`dup` is not a second solid.** It is a `place` step on the same tree: one
tree, two bodies. See the core gap above; a copy that can be moved on its own
wants P6's definitions.

**The diff is a silhouette, and a silhouette is not a section.** A body with a
hollow inside it — a mug, once there is one — has the same side silhouette as a
solid block, so the diff says they match. What P4 compares is what you would
SEE from a plane, which is what the plan asks for and what a hand drawing a side
profile means; a cut-plane section is a different reading and wants its own row.
Noted, not built.

**A profile of a solid is read against its whole silhouette, so a second body
on the same plane is a second candidate, and only the best overlap wins.** Two
solids standing one behind the other across the same view will both be offered
and the larger overlap takes it. There is no chip yet to argue with that
reading, the way P1's plane chip does — it is the same shape of problem and the
same shape of answer, and it is the first thing P4 would grow.

**`Add it` resolves every missing region at once, not one at a time.** The
sentence says how many and how much, and the chips name them individually, but
the verb takes them together. Regions the hand wants and regions it does not are
not told apart yet; §4's *"what tier 1 cannot resolve is the brief for regen"*
is P5's.

**The noise floor is one number for both kinds.** A speck of `missing` and a
speck of `extra` are dropped at the same fraction of the drawing's area. In
practice the specks that survive an *Add it* are the half-pixel seam between the
region and the body — counted and said out loud, which is honest, but a reader
seeing *3 specks dropped as noise* on a body that matches is being told
something about the rasteriser rather than about the drawing.

**A massing is an intersection of extrusions, and nothing else.** Three views
that describe a sphere describe, to this rung, the box they share. That is what
plan-elevation-section has always meant and it is what §2.6 rule 1 asks for;
anything rounder is what the brief is for.

**A model is asked one at a time, and only the first seat is asked.** Several
models may join and the pane lists them all, but a brief goes to
`models.first()`. The canvas asks every joined model and shows the
disagreement; the shard has one op tree per version and no row to show two
proposals side by side yet. It is the same shape of problem as P4's "only the
best overlap wins", and the same shape of answer.

**A regen replaces steps; it does not argue with them.** The scope is the step
ids a name covers, the brief says which may change, and the reply is built into
the hole they left — but nothing checks that what came back is *about* the same
thing. A model that returns a step named `turret` which is in fact a moat gets
its moat, named turret. What protects the drawing is the clip, not the name.

**The derivation is synchronous.** A tree of a dozen booleans derives in a few
hundred milliseconds here (qwen3:8b's five-step castle: 137 ms measured
headlessly), and the drawing loop is blocked for that long. Nothing runs in a
worker; the canvas's own lesson about clocks and paint (`nextFrame`) has no
sibling here yet. A proposal large enough to matter would want one.

**Only one thing a model says is not geometry, and it is a verb.** `parseMeaning`
asks which of three verbs a phrase meant, against the names in play, and
refuses anything else. That is deliberate — it is the smallest possible opening
— but it means the shard learns a *synonym*, not a new way of acting, and a
phrase that means something the three verbs cannot express stays unread.

**A definition is matched by ONE outline at a time.** The structural signature
of the profiles that share a plane is held (core's own, where it applies) and
nothing reads it yet: a single outline drawn again is a group of one, and a
group of one has no links. Matching a GROUP of marks against a definition —
which is what the canvas's own `matchDefinition` does — is the next thing this
file would grow, and it is already the right shape for it.

**The offer is about a SHAPE, so a correction is too.** *Not a mug* rejects
every outline like the one corrected, not the one stroke, which is what makes
it worth holding — and it means a hand that wants to reject exactly one drawing
cannot. There is no *only this one* yet, and it is not obvious there should be.

**A placement copies the definition's tree.** Change the mug and the mugs
already placed do not change with it: they hold what the tree was when they
were placed. That is the honest shape while a definition is a rep rather than
an artifact (there is nothing to point AT), and it is exactly the same gap
`dup` ran into — but an instance that tracks its definition is a different and
better thing, and it wants the core door named above.

**A placement is a similarity, so a definition cannot be stretched.** The scale
is uniform, from the ratio of the two outlines' own sizes, so an outline drawn
twice as wide as it is tall places a mug that fits the diagonal rather than
filling the rectangle. That is what §2.5 asks for; a non-uniform fit is a
different operation and would want its own word.

**Nothing re-reads what a placed body affords.** A placed mug is a solid like
any other — it can be cut, scratched, mirrored and named — but the outline it
stands at is taken into it as provenance, so it is never offered a second
definition. Drawing another outline is how you place another one.

Row 6 (`path`) is still in the table with a comment naming P7. The op tree
declares `sweep`, `loft`, `union` and `along` and implements none of them —
`deriveTree` passes the body through unchanged and marks the solid broken with
the row's own name rather than dropping the step.

The field is still at the foot of the panel rather than at the pen tip. P1 has
the screen position it needs now (`space.project`, and the chips layer proves
it places), so this is the next cheap move rather than a missing piece; the
READER is the part that does not move.

## The e2e

Open `http://localhost:5174` in its own tab, then in the console:

```js
const src = await fetch('/e2e.js').then(r => r.text());
(0, eval)(src);
__scenario().then(r => window.__R = r);   // the seven packages and the compass, 80 steps
__demo().then(r => window.__D = r);       // the two-minute demo, 10 steps
```

Eighty steps. The first one clears the board **and parks the camera** —
`nav.projection('persp')`, `view('free')` — because every shape below is stated
in a plane's own units and projected through the camera *as it stands*, so a
run started after somebody had driven the compass by hand would read a circle
on an edge-on plane as a dot. The board is not the only state a run begins
from; that was found by running it after driving the compass by hand.

**The compass's eight**, at the end: the balls are six, depth-sorted, labelled
`X` `Y` `Z` on the positive ends, and the two that face the chosen plane light;
tap the Z ball and the camera's forward is −Z within a hundredth, tap it again
and it is +Z; an axis view took the ortho lens *and the projection matrix is
really parallel* (read off `m[15]`, so it cannot pass because a flag was set
and the camera was not swapped); a drag on the widget — real pointer events on
the SVG — moves the azimuth and brings perspective back; a snap that leaves the
chosen plane edge-on says *edge-on* in the status line and names the plane, and
the ball that faces the plane you are on says *flat on*; a rectangle drawn
under ortho still reads `rectangle > 0.8` with a measured scale, and so does
the same rectangle under perspective; *home* puts every one of the board's
eight bounding corners inside the viewport; and *home* on an empty board frames
the plane picker and says so.

Seventy of them are P0 → P6. **P0's twelve:** choose the foundation, draw a rectangle by
screen path, assert the top reading is `rectangle ≥ 0.8` on
`foundation · chosen`; choose the height plane, draw a circle, assert
`circle ≥ 0.8` on `height · chosen`; assert the two marks carry different
scales because the pen worked at different depths; undo twice and assert the
board is empty.

**P2's ten:** draw a rectangle and assert it *plays* `profile` by row 2; ask
the field for `extrude` and assert it is refused, with the missing mark named
rather than a depth guessed; draw a line up from the rectangle's near edge and
assert it plays `extent` by row 4, that exactly one solid stands, that its one
step is an `extrude` referencing both strokes, that its author is
`participant:tier0`, that the depth is within 10% of the line's world length
and positive, and that the status line said *box … · tier 1*; assert the solid
is selected and the panel carries the *solid* row, the step and the tier;
assert both strokes are still marks on the board; name it in the field and
assert the name is the hand's over the engine's word; undo once and assert the
solid is gone and both strokes remain; then draw a closed profile and a line
beside it on one plane and assert a `revolve` with a full sweep.

Every shape is stated in the plane's own units and projected to a screen path
by `__shard.screenFor` — which is what a person aiming at the ground does, and
it means the oblique camera has to un-project it correctly for a step to pass.
`__shard.strokeScreen` dispatches real pointer events on the canvas, so nothing
in the e2e can pass by calling the engine directly.

**P1's nine:** stand a box as P2 does and **un-choose**; draw a rectangle over
its top face by world points projected to screen, and assert the plane is read
as `face`, that it is named *top of artifact:7*, that the runner-up is `view`,
that the winner's reason names the rectangle's own confidence, that no oblique
candidate won, that a chip stands beside the mark and that the panel lists the
six candidates; draw a circle **beside** the box on screen and assert `view`,
a pose, one pinned view and a status line saying *view · pinned*; flip the
first stroke to its runner-up and assert the board still holds four marks and
one solid, that the flipped mark says where it came from and offers the way
back, and that **one** undo puts it on the face again; flip it explicitly onto
`view` and back; orbit away and assert the view ink is faint while the face ink
is not, then tap the pinned view and assert it is sharp; and, last, draw an
extent from a profile's edge with nothing chosen, assert the read is ambiguous
and no solid stands, then take `height` from the chip and assert the mark plays
`extent` and a box stands at tier 1 with the drawn depth.

**P3's eleven:** build the box as P2 does and **un-choose**; draw a circle on
its top face and assert it plays `feature` by row 3, naming the face and the
solid, and that nothing was made of it; assert the SOLID stands selected with
no lasso and that *Cut a hole* and *Raise a boss* are both offered, both
saying *tier 1*, the cut saying it will go *through*, and that the alias
`drill` reads as the cut; take *Cut a hole* and assert a `cut` step nesting on
the extrude, `through: true`, referencing the circle, nothing broken, a second
version held — and then **look through the hole**: a ray straight down its
centre misses the solid entirely while a ray beside it still meets the top at
2.40; assert the circle's ink is still on the face and the panel carries the
nested tree; undo and assert one version came off, the hole closed and the
circle stayed; take *Raise a boss* instead and assert the ray now meets the
solid ABOVE the face; undo; draw one pass across the box and assert it is not
a gesture and the status said *one more pass*; draw three passes and assert it
plays `gesture` by row 1, the solid is gone, every other mark is still there
and the status said *scratched out*; undo and assert the box is back at its own
height; last, assert *Mirror* says which plane before Enter and puts a body on
the other side of it, and that *Dup* stands a copy a width away.

**P4's eight:** build the box as P2 does, take the **side view** and choose the
**width** tile (the plane is then flat on to the eye, which is what makes
drawing a side profile something a hand can do), and assert a ray down where the
bump is going meets nothing; draw the box's side outline **with a bump on its
right** and assert it plays `profile` by row 2 *of artifact:7*, that the view is
called `side`, that the reason says so, that no second solid stood up and that
the field refuses to `extrude` it; assert the diff reports **one missing region**
whose area is within 30% of the drawn 0.56 u², at the right, with an outline to
build on, coverage between 0.8 and 0.97, and that the status line and the panel
both name it; assert *Add it* is offered saying *tier 1*, how many and how much,
that the alias `fill it in` reads as it, and that *Take it off* is refused with
*nothing extra* and the sentence; take *Add it* and assert a `match` step
nesting on the extrude with `how: 'add'` and the profile referenced, nothing
broken, a second version held — and then **look at the bump**: a ray down
through the region meets the solid at the height it was drawn, while beside it
the box is exactly as tall as it was, and the profile's ink is still on its
plane; assert the diff re-reads at over 95% with nothing missing and nothing
extra, and that *Add it* is now refused saying so; undo, and assert the bump is
gone, the ink is not, and the region is reported again; last, on a fresh box,
draw a profile **smaller** than it, assert one `extra` region, take *Take it
off*, and assert the material is gone where the drawing said and the diff reads
clean.

**P5's fourteen:** draw the castle's plan on the foundation and assert a lone
profile stands nothing up; draw the keep's front on the height plane — a narrow
tower off its right-hand corner with a roof on it — and assert **one solid
stands at once**; draw the side on the width plane and assert the massing grew
to three profiles, that it is called *massing*, that its author is
`participant:tier0`, that all three strokes are still ink on the board, that
the status said *massing from 3 profiles · tier 1*, and that **no model was
seated by drawing**; assert a ray down through the tower meets the body a unit
above one down through the keep, and that nothing stands outside the drawing;
assert that with no model a brief says so and Enter opens the pane; seat
`joinStub` and assert the reading line now says *→ asks e2e-stub* **before**
Enter; type *a castle with green turret tops* and assert a third version landed
with steps named `castle`, `turret` and `top`, each name on its own step id,
green bound to the top and nothing else, and the status saying *tier 2*; assert
the last step of the tree is the engine's own **clip**, that it says nothing
proposed may leave the drawing, and that the turret the reply asked to stand 3.6
units proud of a 3.6-unit castle comes back **inside** it; assert the row says
*honours the drawing …* with three views all over 80%; take it, and assert the
artifact is named `castle` and that `turret` and `top` are definitions based on
it; type *make the turrets taller* and assert it reads as a regen scoped to that
name, that the turret step was replaced and **every other step kept its own
id**; type *turret* and assert it reads as *a definition, based on castle* with
no model in the line; type *the tops are red* and *remove the turret* and assert
both are tier 1 and do what they say; type *the turrets should feel more
medieval* and assert it comes back as an offer to ask, with what the table DID
understand said out loud; and last, re-stub with a slow reply, press Enter,
**Esc**, and assert the call is gone, no version was written and the tree is
exactly as many steps as it was.

**P6's seven:** build the box as P2 does, name it *box* in the field and take
it — and assert the library holds ONE definition, that it is the whole of it,
that it carries the plan as its profile and that the EXTENT is not among them,
because a line is not an outline; draw the same footprint again three quarters
the size and well clear, and assert it plays `profile`, that it is not read as
a profile OF the box, that the library offers `box` above the floor with the
corners and the plane named in its reason, that a chip stands beside the mark
and that the panel carries the *could be* row; assert *Place box* and *Not a
box* both stand saying *tier 1*, that the alias `place it` reads as the
placement, and that typing the NAME says *place it at stroke:n* before Enter;
take *Place box* and assert a SECOND artifact stands with one `place` step
referencing the outline, named from the library, and then **look at it** — a
ray down the middle meets it at three quarters of the original's height and a
ray a width away meets nothing, while the original's tree is untouched; undo,
and assert the placement is gone and both inks are not; take *Not a box* and
assert the offer goes, that the definition holds one rejected example, that an
outline LIKE it drawn elsewhere is refused too, and that one undo brings the
offer back; and last, stub a model that answers `{"reuse":"box"}`, assert the
brief lists the library with its step and profile counts, press Enter and
assert that a placement stood up, that no version was written into the solid
the brief was about, and that the status says *placed from the library, not
written*.

**The two-minute demo is `__demo()`, and it is §9 of the plan**: the foundation
tile and a plan; the height tile and a line up from a corner (a box, tier 1);
an orbit, nothing chosen, and a circle on the top face read as a `feature` with
a runner-up to argue with — *Cut a hole*, and a ray down the middle goes
through; a stub seated and *a mug with a wide handle* typed, which comes back
as one step the model named `handle` from your words, attributed, with the
*honours* row measured (56% against the plan, because the hole is real); the
side view, the handle profile drawn WIDER than the model made it, and the diff
naming a 0.71 u² region at the left; *make the handle wider*, which resolves it
by NAME and leaves every other step alone, after which the row reads *side ·
matches 100%*; *name: mug* and *Take it*, which hold `mug` (the whole, three
profiles) and `handle` (a part) in the library; the plan drawn again elsewhere,
offered back as *mug 0.97* with `handle 0.78` behind it; and one tap, after
which a second mug stands three quarters the size with its hole and its handle
scaled with it. Every step asserts, and each carries its own timing; the whole
run is about **0.9 seconds**. `?demo=mug` draws the same board at boot from the
same numbers (`window.__mug`), so what is asserted and what is shown are one
thing.

The test hook is `window.__shard`: `strokeScreen`, `screenFor`,
`screenForWorld` (a world point to screen — how the e2e aims at a face it did
not choose), `choose`, `view`, `orbit`, `flipPlane`, `chipFor`, `pinned`,
`goToPinned`, `state` (marks with their `plays`, their ranked plane candidates,
whether they are faded and their pose; the solids, the selection, the status),
`solids` (the trees, not the meshes — with each step's id, its `on`, its depth
or sweep, whether a cut goes `through`, how many versions the log holds and
whether the derivation is broken), `features` (what *Cut a hole* is about), `diffs` (the panel's *matches the
drawing* row as data: the view, the coverage, which outline was read, the
sentence, and every region with its area and where it is),
`rayDown` (fire a ray down world −Y and say what it meets — the only honest way
to assert a hole goes through), `scratchOf` and `silhouetteOf` (row 1's
evidence, before the threshold), `select`, `field` (type and press Enter),
`fieldRead` (what Enter *would* do), `undo`, `clear`, `panelText`, and P6's
`definitions` (each with its profiles, its plane kinds and how many corrections
it carries), `matches` (what the library says an outline could be, ranked, with
the reason), `place` and `correct`.

**Front the tab before running it.** A hidden Browser-pane tab has a canvas of
zero size, and every projected screen point comes back (0, 0). The `?demo=`
blocks no longer wait on PAINT — a frame or a timer's tick, whichever comes
first, moves them on — but nothing can save a viewport that is genuinely not
there.

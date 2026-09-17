# shard-3d — a bounded MetaMedium for making things in space

Draw on a plane; the shape rung reads the mark as it would on paper; a second
mark stands it up as a solid, at tier 1, with no model and no wait. The solid is
an **op tree** in the log — the tree is the source and the mesh is derived — so
undo is one act, a replayed log stands the same body, and ink is never covered.
Everything a model is asked for is a claim about *meaning* over geometry the
drawing already settled.

**What it is for.** `../SHARD-3D-PLAN.md` is the plan (P0–P11, with the MVP line
after P6) and `../SHARD-3D-PUSH-2.md` is push 2 (G0–G5, geometry from the
drawing). The shard is an **experiment** in the repo's subordinate tier
(`../EXPERIMENTS.md`): it may fork and re-implement to move fast, and what it
proves lands in `metamedium-core` with tests. What it is probing is whether the
canvas's rungs — a closed shape vocabulary, a role table, concepts, the log as
the source, tiers that propose and never commit — hold when the medium is space
rather than a page. So far they do; §*What core would need* is the bill.

**Where it stands.** P0–P6 and the navigation compass are in, which is the
plan's MVP line; the director review's four shard packages are in (ACT-1,
DATA-1, GRAPH-1, UI-2); and push 2's G0–G5 are in — the board leaves the tab as
its own log, every free stroke is a silhouette claim so the drawing a **hand**
makes stands, a hull is cut into parts the engine can point at, the brief a
small model can answer is 1048 characters, and Claude Code takes the model seat
over MCP. G4 is the demo re-cut on John's own drawing and this document.
P1 was deliberately deferred until after P2, because reading a plane from the
evidence needs faces to read it off.

## Run it

```bash
cd shard-3d
npm install
npm run dev                # vite on http://localhost:5174
npm test                   # vitest — 555 tests on the pure rungs, headless, no WebGL
npm run typecheck
npm run build              # typecheck, then vite
npm run build:standalone   # → dist/shard-3d.html, one file, ~1.0MB
node fixtures/make.mjs     # regenerate the board fixtures as logs
```

```bash
cd ..
node e2e/run.mjs           # the headless gate: the canvas, and the shard's three
node e2e/run.mjs demo2     # just the demo
```

The engine is imported **from source** — `metamedium-core` is aliased to
`../metamedium-core/src/index.ts` in `vite.config.ts`, `vitest.config.ts` and
`tsconfig.json` — so the shard always runs against the engine as it stands and
there is no bundle to drift. `.claude/launch.json` carries a `shard-3d`
configuration on the same port.

**The one dependency is the CSG library**, behind `src/csg.ts` and imported
nowhere else. P4's renderer is the three.js already here and its tracer is
core's own; P5's transport, tolerant JSON readers and `HERE` paragraph are
core's patterns ported rather than forked; P6's comparison is core's
`matchPrimitiveFromLibrary` re-weighted in a file of its own.

**The hand in the room** (G5):

```bash
node Demos/relay.mjs      # the room, on :8020 — sixty lines, no truth of its own
node shard-3d/mcp.mjs     # the hand; it starts a relay itself when none answers
```

Then open the shard at `?live=shard&relay=http://127.0.0.1:8020`, or open the
models pane and press *Join the room, and seat the hand*. `.mcp.json` registers
the server as `metamedium-3d` beside the canvas's `metamedium`.

**URLs.** `?demo=castle` runs the whole loop below at boot;
`?demo=castle-sketch` draws John's first board and stops there;
`?demo=castle-views` draws P5's three canonical views and leaves the massing
standing with the field ready; `?demo=mug` runs `SHARD-3D-PLAN.md` §9's
two-minute demo; `?demo` draws P0's and P2's done-criteria; `?demo=read` and
`?demo=view` draw P1's; `?demo=diff` draws P4's. `?fixture=<name>` loads a board
out of `fixtures/`. `?theme=light|dark|system` picks a theme, the way the
whitepaper shares a surface. `?live=<room>&relay=<url>` joins a room.

**Front the tab before driving it.** A hidden Browser-pane tab lays the canvas
out at zero size, `screenFor` returns (0, 0) for every point and no stroke is
made. `resize()` refuses an aspect of 0; nothing can refuse a viewport that is
genuinely not there.

## The loop, as it is now

Eight beats, on John's own first board. `?demo=castle` draws them at boot and
`__demo2()` in `e2e.js` drives the same numbers through the same pointer path
and asserts each one; both read `src/demo.ts`, so what is shown and what is
proved are one board. The mug of `SHARD-3D-PLAN.md` §9 is still here as
`?demo=mug` / `__demo()` — a draftsman's board on the three tiles. This is its
successor, and it is a **hand's** board: a rough footprint on the floor and
towers drawn as ⊓ from wherever you happen to be standing.

**1 · Nothing chosen. Tap the compass's Y ball, and draw the footprint.** The
top view faces the foundation, so tapping the ball chooses that plane and the
picker's tiles go away while it does — the axis view **is** the choice. A rough
6 × 4 rectangle reads *rectangle 0.92 · profile*, on `foundation · chosen`, and
the ink's reason names the camera rather than a tile nobody held. One footprint
stands nothing: a profile is waiting for an extent.

**2 · Leave the axis view, orbit to where you would stand, and draw two towers
as ⊓.** Leaving gives the plane back to the hand, and this hand chose nothing,
so from here the plane is **read**. Shift + click on clear ground first: the
view plane passes through the cursor, and that is what puts a ⊓'s feet on the
floor instead of a unit above it. The first ⊓ reads `elevation` — an open stroke
whose two feet reach the ground, the ground its fourth side — and with the
footprint it is two claims, which **are** a hull: *hull from 2 claims · tier 1*,
in the engine's name, no model asked. The second tower from the same standpoint
goes into it as a third claim.

**3 · Orbit the other way and draw what you see from there.** The hull narrows,
and it is **two parts**, each said in words:

> part 1 — 1.8 × 1.4 u on the footprint, 0.3 u tall, along the east edge; from
> stroke:2 (drawn from 64° · +29°) and stroke:9 (drawn from 135° · +22°)
>
> part 2 — 1.6 × 1.7 u on the footprint, 0.9 u tall, at the north-east corner;
> from stroke:8 (drawn from 64° · +29°)

Two parts and not three, on a drawing of three towers, and the reason is in the
drawing rather than in the code — see *the honest limit* below. **Three ⊓ and
two standpoints, not two and two**: a tower seen once has no depth, so two
claims from two standpoints give one part, and the count only reaches two when
one standpoint has shown two towers.

**4 · The free loop test.** With nothing chosen, let the cursor go (a shift +
click on the cursor where it stands), raise the eye, and draw a loop in clear
air. It lands on the view plane **through the centre of the view**, its aspect
conserved to a thousandth — 1.394 drawn, 1.394 landed — and **not** in the
floor, which is the fault push 2 opens on. And because it is a closed silhouette
whose prism meets the footprint's, the hull **takes it** as a fifth claim: a loop
beside the castle is not a doodle, it is another claim about the same thing. So
the beat puts the board back in the two acts it took to change it — the first
undo takes the claim out and leaves the ink, the second takes the stroke.

**5 · *castle with green tops*.** The brief is the short one (a hull with parts
takes 1048 characters before `HERE_ON_A_HULL`) and the reading line says which
contract Enter uses before it is pressed. The reply names the parts from the
human's own words — `part:1` *wall*, `part:2` *turret* — binds one colour word
each from the closed list, and asks for two small ops by part id. The transcript
keeps the brief as sent and the reply as received; an ideal reply drops nothing,
which is what makes it ideal. The honours row says how much of the drawing the
body contains, and on a sketch hull that number is **low and true**: *honours
the drawing 9% · top 9 (material was taken off since it was drawn — less is
expected to show)*, because the footprint is the whole keep and the hull is the
volume three views share.

**6 · *make the turrets taller*.** A regen over that **part** alone: the brief
gains `ONLY THESE PARTS MAY CHANGE`, the step the last reply left on that part
comes off before the new one goes on, every other step keeps its own id, and the
name does not move. The words are *turrets* and not *towers* for a reason — a
regen resolves a name that is **in play**, and nothing on this board is called a
tower until someone says so.

**7 · *Why*, and then the names are yours.** Tap a part's chip and the panel's
summary answers about **that part**: *what* — `turret · green`, with its whole
sentence as the reason; *from* — `cut from 1 claim of hull`, because a part is
material and not a sub-tree of steps; *next* — what Enter would do to it. Then
`name: castle` and *Take it*: three definitions, each based on `castle` — the
whole of it, and `wall` and `turret` as parts of it.

**8 · Draw the footprint again, elsewhere.** The library offers *castle 1.00*
with the corners, the extent, the aspect and the plane named in its reason, and
one tap places it: a second artifact, three quarters the size, standing inside
the outline that was drawn.

**9 (optional) · the MCP seat.** The demo runs on a stub; this beat runs the
same path with a **hand** at the end of it. `__shard.joinHand()` joins a room
over an in-memory hub and seats the MCP hand in it — the same `src/room.ts` that
`mcp.mjs` drives — so what is proved is the path (park, merge, answer, apply)
rather than a mock of it. Enter parks the brief and writes nothing while it
waits; the hand answers in the parts contract; the version is attributed to the
seat. From a Claude Code conversation the identical round trip is `space_pending`
→ `space_answer`.

### The gestures, in one place

| | |
|---|---|
| draw | left button, one finger |
| orbit | right-drag · `Space`+drag · a drag on the compass · a trackpad swipe · two fingers |
| pan | middle-drag · `Shift`+right-drag · `Shift`+swipe · three fingers |
| dolly | wheel · pinch · `Ctrl`/`Cmd`+swipe — toward the pointer |
| put the cursor | `Shift`+click; again on the cursor itself lets it go |
| choose a plane | `1` `2` `3` (foundation / height / width), `0` un-chooses |
| the camera's views | numpad `1` `3` `7` (front / right / top) or `Shift` + those; `Ctrl`/`Cmd` for the far side; numpad `5` persp/ortho; numpad `9` flips |
| frame everything | `f`, `Home`, or the compass's *home* |
| undo | `Cmd`/`Ctrl`+`Z` — one whole act |

`1` `2` `3` `0` were the plane picker's and stay the plane picker's: a plane is
chosen far more often than a camera is snapped, and the older binding wins. So
the camera takes the numpad, where Blender has it. In an axis view the matching
plane key is the choice the view already made, and a different one hands the
tiles back.

## The rungs, and their vocabularies

Each rung is closed, each is placed by evidence rather than by a mode, and each
says its reasoning out loud. The vocabulary grows by a release and never by a
special case (`SHARD-3D-PLAN.md` §2.6).

**The plane** — `foundation` (XZ, the ground) · `height` (XY, the wall you
face) · `width` (YZ, the wall on your right). A plane is
`{ origin, normal, up, source, name, why }` and its `source` is one of `chosen`
· `face` · `view` · `world` · `previous`. A **chosen** plane is a decision,
blessed by the act of tapping a tile or a ball; with nothing chosen the plane is
**read**, and every candidate is kept with its number and its reason.

**The shape rung** is core's, unchanged, run on the stroke in the plane's own
(u, v) at the pen's own scale: `line` · `arc` · `triangle` · `rectangle` ·
`circle` · `arrow` · `text` · `dot`. Reading a stroke on a plane is what makes
drawing in space feel like drawing on paper, and it is the whole of P0.

**The form rung** (`src/form.ts`) is the diagram rung's sibling and says what a
mark *plays* in space: `gesture` · `profile` · `elevation` · `feature` ·
`extent` · `axis` · `path` · `label` · `annotation`. Nine rows, read top to
bottom, first match wins, and a mark no row places is `annotation` — said out
loud. Every threshold is a ratio of the marks' own size, measured in **world**
space so it holds across planes. Row 6 (`path`) is P7's and carries a comment
saying so.

**The hull, and its parts** (`src/form.ts`, `src/solid.ts`, `src/parts.ts`). A
silhouette claim is a closed stroke on any plane whose prism meets the
footprint's, or an open stroke whose feet reach the ground. The hull is the
intersection of their prisms; a part is the hull's material inside one claim's
run, with an id (`part:1 … part:n`), a place in the footprint's own frame and a
sentence.

**The op tree** (`src/op.ts`) is the solid: `extrude` · `revolve` · `cut` ·
`boss` · `mirror` · `place` · `match` · `massing` · `hull` implemented, and
`sweep` · `loft` · `union` · `along` declared for P7 and not built. A step
carries what the drawing said and **nothing derived**.

**Names** are the one open vocabulary, and they are the hand's. The engine's own
word for what it made (`box`, `cylinder`, `wedge`, `extrusion`, `revolve`,
`massing`, `hull`, `part 2`) is never a name anyone gave it; a model's word is a
claim, held and attributed, that the hand takes or leaves.

## The files

| File | What it is |
|---|---|
| `src/plane.ts` | **Pure.** `Plane`, world ↔ plane (u, v), ray–plane, `scaleAt`, `facing`, the camera's `Pose` and `poseAngle`, the three named planes, and `planeForPenDown` — the one seam, picking the read plane from the candidates the scorer built. No three.js, so it tests headlessly |
| `src/planarity.ts` | **Pure.** P1's whole read: the candidates (`face` / `previous` / `world` / `view`), the pen-down pick, the pen-up re-rank, the scorer and its four terms, `nameFace`, the chip's text. The camera arrives as a ray-caster function, so no three.js here either |
| `src/gesture.ts` | **Pure.** What a wheel event or a set of touch points MEANS for the camera: `classifyWheel`, `readWheel` (Blender's map) and `readTouch`. Every threshold named, every sign stated as the drag the same travel would make. No three.js, no DOM |
| `src/view.ts` | **Pure.** The camera's arithmetic: the six axis views with the up that makes each named plane read in its own frame, the flip, `viewFacingPlane` / `planeFacedBy`, `tooOblique` against the scorer's own `FACING_FLOOR`, `frameFor` (bounds → a pose, sphere not box, at any aspect, in both lenses), `orthoHeightFor` / `distForOrthoHeight`, `orbitBy`, `planeAfterLeavingAxisView`, and `balls` |
| `src/cursor.ts` | **Pure.** Blender's 3D Cursor placement as one rule — the surface under the pointer, else the foundation plane under it, else nothing and the caller says so — plus the cursor's two states: `FOLLOWING` (the view plane through the centre of the view) and placed (`cursorAt`, `cursorFollowsTarget`, `shiftClick`, `describeAnchor`) |
| `src/diff.ts` | **Pure, and where every diff threshold lives.** The grid in plane units, the even–odd rasteriser, connected components, a region's outline (core's `trace` on the boundary pixels), `diffProfile`, `overlapOf`, `viewNameOf` (the foundation is the *top*, height the *front*, width the *side*) |
| `src/library.ts` | **Pure.** P6's rung: what a definition carries (each profile's fingerprint and the KIND of plane it lay on), `compareProfiles`, `matchLibraryDefinition`, `rankMatches`, `addProfileExample`, `structuresFor`. **It knows no name** — it is handed definitions the hand has already named |
| `src/op.ts` | **Pure.** The op tree, `placeDefinitionStep` / `placeFrames`, the geometry parameters derived from the drawing, the nesting (`on`, `rootOf`, `withStep`, `depthsOf`), the tree as text and back, the lathe profile, `validateOpTree` and `OP_LIMITS` |
| `src/form.ts` | **Pure.** The form rung's nine-row table, `prismsMeet`, `viewLabelOf` (*34° · +24°*), `hullableFrom`, `massableFrom`, `makeableFrom`, `featuresFrom`, `scratchAgainst` |
| `src/parts.ts` | **Pure but for the CSG seam.** `runsOf`, `footprintFrame`, `placeOf`, `partsOfHull`, `hullReadOf`, and the three small ops a reply may ask for by part id (`bossOnPart`, `cutOnPart`, `mirrorOnPart`) |
| `src/constraints.ts` | **Pure.** `activeConstraints(tree, ctx, drawnSince)` — what a body is answering to, each closed mark it references classified `target` / `source` / `revision`, and `carryOutline` |
| `src/field.ts` | One input, one reader. `readField(text, ctx)` returns *what Enter will do*; the verbs and their reasons are handed in, so the reader knows nothing about the DOM. Thirteen verbs, each with its aliases in one table |
| `src/verbs.ts` | **Pure.** The verb table with name-resolved targets, `behave/words.ts`'s pattern ported: `SAYINGS` per verb, `CHANGES` for the size words, `namesIn` resolving a noun singular or plural, and **what it cannot read is returned, not dropped** |
| `src/brief.ts` | **Pure.** `describeSpace` — the `describeReading` of this shard, in stroke ids and step ids — and `describeHull`, the short brief a standing hull takes. `partIdsOf` is the one test for which shape, and so for which contract. `HERE_IN_SPACE` and `HERE_ON_A_HULL` say what can be made here and what cannot |
| `src/generator.ts` | **Pure.** The making and regen prompts, `messagesFor`, `parseProposal` (strict JSON first, then core's two repairs, then reported — never guessed), the closed lists (`PROPOSABLE`, `PROPOSABLE_SHAPES`, `PART_OPS`, `PART_RULES`, the colour words), and `propose`, whose transport is **injectable**. Also `meaningMessages` / `parseMeaning` |
| `src/exchange.ts` | **Pure.** The transcript: every exchange with a model — who, the brief as sent, the words, the reply as **received**, what parsed, what was dropped and why, the outcome and the time — the last `KEEP` (8). **Runtime, never the log** |
| `src/export.ts` | **The board as its log, out and back in.** `encodeBoard` / `decodeBoard` are core's own `encodeLog` / `decodeLog`, plus `boardFilename`, the download, the file picker, and `boardFromFixture` |
| `src/demo.ts` | **Pure.** `CASTLE_DEMO`: the numbers of `?demo=castle`, stated once, so the boot demo and `__demo2()` cannot draw two different boards. Its own module because `main.ts` carries three.js and nothing in it can be imported by a test — `src/demo.test.ts` holds its reply against the exchange fixture it is a copy of |
| `src/log.ts` | The engine's session as the shard's log: a stroke in plane coordinates with its scale, the plane held as a rep, readings / maths / clean forms / undo for free — and every verb above tier 0 (`make`, `mass`, `hull`, `cut`, `boss`, `mirror`, `dup`, `match`, `dropPart`, `applyProposal`, `applyParts`, `nameParts`, `replaceSteps`, `take`, `place`, `correct`, `standFor`, `scene`) |
| `src/scene.ts` | three.js, the camera — perspective or orthographic, the same pose through two lenses — the orbit / pan / draw split, the ground grid, and the camera **as a ray-caster function** so `plane.ts` never imports three. Plus `rayForPose`, `project`, `easeTo`, and what the compass drives (`turn`, `pan`, `dolly`, `snap`, `frame`, `setProjection`, `setPivot`). The wheel and touch listeners live here and decide nothing; `onAbandon` drops a stroke the second finger of a pinch had begun |
| `src/solid.ts` | three.js. The mesh, **derived by walking the tree on every log change** (`deriveTree`) — `ExtrudeGeometry` and `LatheGeometry` for the leaves, the CSG seam for `cut` / `boss` / `mirror` / `match`, `hullBody` for `massing` and `hull` alike, a plain merge for a `dup`; a quiet lit material from the tokens, `hardEdges`, the picking, `facesAt`, `spanAlong`, `silhouetteOf`, `silhouetteOn`, `brokenOf`. It takes a `DeriveContext` — `inkOf` and `silhouetteOf` — because a `match` step stores nothing derived |
| `src/csg.ts` | **The one seam, and the one library behind it.** `subtract`, `union`, `intersect` on `THREE.BufferGeometry`, over `three-bvh-csg` (pinned, with `three-mesh-bvh`). **It never throws**: every result is `{ ok, geometry }` or `{ ok: false, error }` |
| `src/silhouette.ts` | three.js, and the only part of the diff that needs a renderer: the body rendered flat white on black through an orthographic camera into a small offscreen target, the pixels read back as a mask, the mask's **boundary** handed to core's `trace`. Plus `planeKey`, which deliberately ignores the offset along the normal |
| `src/ink.ts` | Pen-down → plane → live projection → the stroke as a `Line2`; the clean form as a dashed ghost for a few seconds. The scene's ink is **derived from the log** on every change, so undo needs no bookkeeping |
| `src/gizmo.ts` | The three axes, the three tiles, the slide handle, the centre — all standing at **the cursor**, whose planes it hands out through that point (`origin` / `setOrigin`) |
| `src/navgizmo.ts` | The compass in the corner as an **SVG overlay** built from the tokens: three arms from a centre with a labelled ball on each positive end and a hollow one on each negative, depth-sorted and turning with the camera, tappable (snap, flip on a second tap), draggable (orbit, one finger, because it is chrome) — plus *home*, *view* and the pinned-view chips |
| `src/chips.ts` | The runner-up, standing beside the mark in screen space: an HTML overlay positioned by projecting the stroke's centre, built from `ui.ts`'s `chip`, gone after `CHIP_MS` or on the next stroke |
| `src/selection.ts` | Selection by default: one thing at a time, a teal cage around a solid, a diff region outlined on its own plane while its chip is hovered, and a second cage for a hovered part. Runtime state, never the log's |
| `src/panel.ts` | **Hidden by default** (`panelShown` / `setPanelShown`, the key `shard.panel`, `createPanelToggle`). The summary above everything — *what* · *could be* · *from* · *next* · *becomes* · *parts* — with every measurement behind *why / measurements ▾*; `selectionLine` is what the status line says in its place; then the rows, the nested tree, the *broken* row, *matches the drawing*, *honours*, and the ***model*** section, which is the transcript |
| `src/models.ts` | The model pane, `Demos/surface/04-models.js` ported, plus **the hand's seat** (`joinHand`): both local servers probed in parallel, embedding-only models hidden **and said**, the pick remembered as a preference, hosted providers by key — and **no key ever enters the log**. `joinWith` seats a model with a transport of its own, which is what `__shard.joinStub` is |
| `src/room.ts` | **The live room, and the brief parked in it.** `joinRoom` is `17-folder.js`'s `openLive` in TypeScript over one session; `ask()` parks a question on the explanation plane as `brief:<key>` and settles when `answer:<key>` lands; `splitPrompt` reads the brief and the words back out of either ask; `otherHand()` is the same loop from the other side |
| `src/work.ts` | A model at work, shown **where it works**: a breathing `--sig-model` dot with the model's name and its task above the solid, the elapsed time after a few seconds, *Esc stops it* after thirty, and one `AbortSignal` per call so Esc really does |
| `src/theme.ts` | The tokens read back off `../brand/tokens.css` at boot; nothing here restates a hex |
| `src/ui.ts` | pill · chip · tile · row · pane — `Demos/surface/00-ui.js` ported, not forked |
| `src/main.ts` | The wiring, the chrome, the field's adapter, `tier1()`, `runBrief()`, `?demo=` and `?fixture=`, and `window.__shard` — the test hook |
| `src/shard.css` | The surface, on `brand/tokens.css` |
| `mcp.mjs` | **The hand, and the seat**, over MCP on stdio — newline-delimited JSON-RPC written by hand, so the repo takes no dependency, importing the committed Node bundle beside `Demos/mcp.mjs`. Six tools: `space_look`, `space_pending`, `space_answer`, `space_draw`, `space_propose`, `space_say`. Its one duplication is named where it stands: the three named planes and the `plane` rep, because this process cannot import the shard's TypeScript |
| `mcp-smoke.mjs` | The stdio test, in CI's `shard` job: a relay on a **free port**, a second hand in Node as the tab, and the whole round trip — look, draw, park, list, answer, refuse, say |
| `e2e.js` | The whole loop through the real pointer path: `__scenario()` (P0 → P6, the compass, the panel's toggle, trackpad and touch, the axis views, G0's five, G5's five, G1's three, G2's three, G3's three), `__demo()` (the mug of §9, eleven steps) and `__demo2()` (G4's nine beats). Every shape is stated in a plane's own units and projected by `screenFor`; `strokeScreen` dispatches real pointer events, so nothing here can pass by calling the engine directly |
| `build-standalone.mjs` | **One file.** Runs `npm run build`, then inlines every asset Vite emitted into `dist/shard-3d.html`, and refuses to write a page that still points at anything that would not travel with it |
| `fixtures/` | John's own boards as logs, and `make.mjs` which writes them. `fixtures/README.md` says which door each came through |
| `fixtures/exchanges/` | What was sent to a model about a board and what came back, verbatim and unrepaired. `fixtures/exchanges/README.md` says how to add one |
| `src/*.test.ts` | 555 tests, vitest, no WebGL except where the CSG seam is the subject |

## How it works, decision by decision

### A solid is an artifact whose code rep is the op tree

**Blessed by tier 1, with a marker on the code's first line.** The plan's §2.4
asks for a new `op` kind beside `run` in `kinds.ts`; that is core's to add, so
the tree goes in through the door already open — `summonMarks` → `bless` →
`attachCode({ kind: 'json' })`, with `// mm:op tree v1` as the first line,
exactly the way `GRAPH3D_MARK` marks a program in `tier1/library.ts`.
`parseOpTree` strips the comments and reads the rest; anything else on the board
is not one of the shard's trees and is left alone. When core grows the `op`
kind, the marker goes and the kind takes its place.

**The engine is the author.** `bless` and `attachCode` are attributed to
`ENGINE_PARTICIPANT` — a box from a rectangle and a line is tier 1, the canvas
answering first — and the panel and the status line both say so.

**Blessing takes the members off the content plane, and the shard puts them
back.** That is right for a canvas (a page is one thing, not five strokes) and
wrong for a shard, where the profile that became a box is still ink lying on the
box's face. `log.marks()` therefore derives from every node carrying ink and a
plane rather than from `contentIds`.

**A tree that arrives as text is validated, never cast** (DATA-1). `OpStep` is a
type the compiler enforces on the code that *builds* a tree and says nothing
about one out of the log, a folder, another hand's log or a model:
`{"op":"extrude"}` with no `depth` parsed clean and then threw out of
`depth.toFixed()` the moment the panel described it. `validateOpTree` walks every
step against those same discriminated types — the version, each op's own required
fields (a revolve's axis and sweep, never an extrude's depth), finite numbers,
reference types, ids unique per level with `on` pointing at a step that already
stood, and the bounds in `OP_LIMITS` — and returns a structured reason
(`{ at: 'steps[3].depth', reason: … }`). `parseOpTree` keeps its null contract;
`readOpTree` carries the reason, and `solids()` uses it: a rep that is not ours
is skipped in silence, and one that is ours and will not read stands as a
**broken solid** whose panel row names the fault and says the code rep is still
in the log, untouched.

### Undo knows where an act ends because the act's own timestamp is in the log

An act is rarely one event. A stroke is two (the ink, then the plane proposed on
it); a solid is three; a flip is three; a model's proposal is `3n + 1`, where n
is however many profiles it drew — sixteen profiles is forty-nine events.
`session.undo()` drops one event.

It used to guess: walk back up to twelve events and stop when something visible
changed. Twelve was a guess at how long an act could be and the stopping rule
was a guess at what an act does, and the director review (ACT-1) reproduced both
failing: with one generated profile, undo restored the old tree and left the
model's circle standing on a board whose tree no longer mentioned it; with
sixteen, it never reached the version at all.

Every act in `log.ts` already threads **one `at`** through every event it writes,
so an act is exactly the run of consecutive events that agree on `at`. `undo`
reads that run and drops it. Nothing new is recorded, no event gains a field,
and **core's event schema is untouched** — changing that is a cross-surface
contract, not a worker's aside. Because the grouping is in the log rather than in
memory it survives a JSON round trip for free. Two stamps in `stamp()` make it a
rule rather than a coincidence: **no two acts share a time** (an act whose time
the log already holds is recorded a millisecond later), and **a late result is
stamped when it LANDS**, so a reply carrying the moment Enter was pressed still
forms its own act on top of the stroke drawn while it waited.

Every log this shard has written carries an `at` on every event, so an older log
groups correctly with nothing to migrate. `undoByWalking` is kept for the one log
the rule cannot read: one whose events carry no usable time at all.

### The CSG seam never throws

**One module knows a boolean library exists.** If it were ripped out, `cut`,
`boss` and `mirror` would still stand in the tree as the intent they are —
because the tree is the source and the mesh is derived. That is §10's second risk
(*CSG is fragile on messy input*) given exactly one address.

Every call comes back `{ ok: true, geometry }` or `{ ok: false, error }`, and on
a failure the body **stays exactly as it was** (`deriveTree` keeps the geometry
of the step the failed one acts `on`), the solid is **marked broken** with the
library's own words, and the status line says it once, where it happened.

Three things keep the failure rate down, each found by looking at a cut that came
out wrong:

- **No face of a tool is ever coplanar with a face of the body.** A cut's prism
  starts a hair *above* the face and a THROUGH cut runs a hair *past* the far
  side; a boss's prism sinks a hair *into* the body. The hair is `TOOL_OVERLAP`,
  a ratio of the feature's own size. Without the second one the library returned
  `ok` and left the prism standing in its own hole.
- **Inputs are normalised before they are handed over** — non-indexed, position
  + normal + uv and nothing else, no groups — so a whole class of
  attribute-mismatch assertion becomes arithmetic that cannot fail.
- **A `dup`'s copy is merged, not unioned.** It stands beside the body by the
  body's own width, so the two are disjoint by construction; asking a boolean to
  weld two shapes that do not touch is work that can only fail.

In every browser run and by hand — cut, boss, mirror, a mirror of a mirror
(which is a union of a body with itself, the nastiest case there is) — the seam
has not failed. The failure path is covered by `csg.test.ts` and
`geometry.test.ts` instead, which is the honest way to test a path you cannot
provoke.

### A prism is built on the shape, not on the sampling rate

A hand leaves a nine-corner outline as a hundred and twenty-seven samples, and
`ExtrudeGeometry` then builds a hundred and twenty-seven walls where nine will
do. The boolean has to split every one of them against every face of the next
prism; on the castle's three views it reached the BVH's own depth limit — *"Max
depth of 40 reached"*, a library saying it has been handed a shape made of noise
— and the e2e took **136 seconds**. The outline a SOLID is built from is
simplified at `PROFILE_SIMPLIFY` of the mark's own size (the fraction
`getFingerprint` finds corners at); the ink is untouched, the shape is unchanged,
and the same run takes **8 seconds**.

### The diff is the brief

A solid claims to be what was drawn, and P4 checks the claim:
`validateRegions` generalised from *every region id the layout named appears once
in the code* to *every square unit the drawing asked for is in the body*.

- **A profile is a profile OF something.** A closed stroke on a chosen or world
  plane still plays `profile` — but if its outline overlaps a solid's silhouette
  on that plane it is *that solid's* profile, not the start of a new one, and the
  reading says so. The overlap is the IoU over a floor **or** one containing the
  other, because a profile drawn to correct a solid is usually bigger or smaller
  than it and that is exactly when the IoU is low. Nothing waits for an extent
  beside such a mark, and `makeableFrom` will not grow one.
- **The comparison is orthographic, along the plane's own normal**, so how far
  the plane has been slid along that normal does not enter into it. That fact is
  a test, not a remark.
- **The silhouette is rendered and then traced** — and the mask's **boundary**,
  not the blob: core's tracer thins what it is given down to a centreline, so a
  filled rectangle comes back as its medial axis. Found by handing it the
  silhouette straight and getting a cross.
- **The diff is masks.** Both outlines rasterised at one resolution over what
  they jointly cover, so a pixel means the same thing on both sides:
  `missing = ink & !silhouette`, `extra = silhouette & !ink`. Connected islands
  become regions with an area in plane units², a place in the drawing and an
  outline to build a prism on. Anything under `NOISE_FRACTION` of the drawing's
  own area is a speck where the two edges disagree, and the sentence says how
  many were dropped rather than hiding them.
- **Tier 1 resolves it.** *Add it* runs every missing region right through the
  body along the plane's normal and unions it; *Take it off* cuts every extra one
  out. One `match` step, instant, a version with one undo — and the profile's ink
  is deliberately **not** taken into the solid the way a feature's is, because a
  profile is a standing claim about the shape rather than something the act used
  up. That is what lets the row re-read afterwards.

**The `match` step holds nothing derived.** It carries which profile, which way
(`add` / `remove`) and which plane — no region, no area, no outline, no span.
Everything else is worked out again every time the tree is walked. A region
cached in the step would be a second source of truth that goes stale the moment
the ink is flipped, redrawn or undone, and a replayed log would then stand up a
solid nobody drew. The cost is that `deriveTree` cannot be a function of the tree
alone, so it takes a `DeriveContext`; both halves are injectable, and
`match.test.ts` walks the tree with a silhouette computed by arithmetic and no
renderer anywhere. One consequence: a tree with a `match` in it signs the **ink
it references** as well, or ink redrawn under a match would leave the old body
standing and nothing would say why.

**A tool may only be grown where growing it cannot change the answer.** A missing
region abuts the body exactly — it is *defined* as what the body is not — so a
prism on its raw boundary has a face coplanar with a face of the body. The
outline is grown by `REGION_DILATE` pixels; grown in *every* direction, as the
first version did, it overstepped the hand's own outline and *Add it* left a rim
the drawing had not asked for — **the diff caught the diff's own tool**. A
missing region may now grow only into the silhouette and an extra region only
away from the ink. The prism's overlap **along** the normal is a different number
for a different reason: `MATCH_OVERLAP` is a five-hundredth of the body's own
span rather than `TOOL_OVERLAP`'s fiftieth of a feature's, because a fiftieth of
a whole box is four per cent of its width. Found by asserting the bounding box
after an add and getting −7.08 where −7 was drawn.

### The massing, the hull, and the volume its claims define

Two or three profiles on different world planes whose projections overlap **are
a solid already** — plan, elevation, section, the oldest way of drawing a thing
in space — and the shard stands it up the moment the second lands: each profile
grown through the span of the *others* along its own normal, and the prisms
intersected. One `massing` step, in the engine's name, tier 1.

John's first real drawing had none of those planes: a rough footprint on the
floor, then towers as **⊓ from wherever he stood**. Every one fell through the
form table to `annotation`, so nothing stood, and a brief with nothing to fill
went nowhere. The generalisation is the **visual hull**, which is what those
marks always were. Two rules turn a sketch into claims:

- **An open stroke closes on the ground.** A ⊓ whose two feet reach the
  foundation's height — within `FEET_ON_GROUND` of the stroke's own size, and
  rising `ELEVATION_RISE` of it above the floor — is the silhouette of a thing
  standing on the ground, and the ground is its fourth side. That is row 8,
  `elevation`. A ⊓ that **floats** stays an `annotation` and the panel says why —
  *its feet do not reach the ground, the higher one stands 0.20 u off it (18% of
  its own size, over 15%)*.
- **A closed stroke is a silhouette when its prism meets the footprint's.** Row 2
  reads it as a `profile` still, with *a claim from 34° · +24°* — which view it
  was drawn from, in the same two numbers the pinned-view chips use. A loop that
  meets nothing is not refused: it says so (*its prism misses stroke:1's by
  3.40 u — two drawings of two things*).

**Whether two prisms meet is one axis, exactly.** Each prism is convex and
unbounded along its own normal, so a plane separating them must contain *both*
normals — which leaves one candidate direction, `nA × nB`. Project both outlines
onto it and the intervals either overlap or they do not (`prismsMeet`). No
sampling, no solver, and two views from the same direction come back as *the same
view*, which is not a claim about anything.

**The hull stands the moment the second claim lands**, and each claim after that
is a **new version of its one step**, so one undo takes back exactly the claim
that was drawn. Claims are capped at `MAX_CLAIMS` and the rest are said.

**And the hull stands in the volume its claims define.** Each claim's prism runs
through the span of the **others'** world points along its own normal, never its
own — a footprint's own points all sit at y = 0, and reading them into its own
vertical span is exactly how the ground gets into a body no claim's feet reach.
The footprint runs from the ground up to the tallest claim; everything else is
bounded by what the other claims say. So two loops drawn a unit above the floor
make a hull a unit above the floor, and the ground bounds a hull only where a
claim's feet reach it. Measured rather than assumed: `hull.test.ts` rebuilds
John's own three profiles from his exported board and derives the massing
headless at **y 0.97–3.09** — the massing was never in the floor. The free *ink*
was, and that is the view-anchor rule below.

**`massing` and `hull` are two doors on one derivation.** Both ops stay in the
vocabulary — every tree ever written still reads, and DATA-1's validator has a
row for each — and `hullBody` derives both. `hullableFrom` returns null for a
drawing the massing path already takes, so one drawing never stands twice. A hull
bounds a model's proposal exactly as a massing does.

**One standpoint is one silhouette**, found standing John's own castle. A hand who
walks to one side and draws two towers has drawn *one* outline with two pieces in
it, not two claims to intersect — and intersecting them gives the empty set,
which is exactly what his board came to (*"three-bvh-csg returned an empty
intersect"*). So `hullBody` gathers claims that share a plane **direction** into
one silhouette before anything is intersected: within it, outlines that lie APART
are unioned (two towers seen from the path) and outlines that OVERLAP are
intersected (a narrower ⊓ over the first is a correction, and a correction
tightens). Across directions nothing changed — silhouettes are intersected, which
is the visual hull as it has always been defined — and the massing is untouched.

**A massing GROWS while it is still only a massing.** The third elevation goes
*into* it rather than beside it, because each prism runs through the span of the
others and a new view changes that span; `growable` re-derives the whole step as
a new version. The moment anything has been BUILT on the massing, another view is
a standing claim about the shape and the diff is what it affords.

**Row 2's *nothing inside it* clause had to go.** It refused both marks of a nest
and threw out the commonest plan there is: a castle's footprint with its turrets'
footprints inside it. §2.3's clause is about a FACE — "only a closed shape inside
a face is a feature", which is row 3 and a disjoint predicate, since a plane has
one source — so a nest is now **reported** in the reasoning rather than refused.

### The parts of a hull, said

A hull is one body, and a hand that drew a castle did not draw one thing. §2.6's
rule is that names bind to steps, and a model can only name what the engine can
point at.

**A part claim is a RUN.** An elevation is an open stroke closed on the ground,
and where it touches the ground it finishes one thing and starts the next: a ⊓
touches twice and is one run; a stroke that touches three times is two runs (a
hand draws two towers without lifting the pen); a closed silhouette is one run by
its own ink. `ground` is read **before** `closed`, because an elevation is held
closed *on the ground*. A part is then **the hull's material inside that run's
prism**, through the CSG seam — a run that claims nothing, or whose boolean does
not come off, is dropped with its reason and the rest still stand. Cut once per
version and cached on the signature the build was made from, so a new claim, an
undo or a load invalidates it without anything remembering to.

Two rules keep the count honest:

- **The same material seen twice is one part.** A tower drawn from the front and
  again from the side is two runs and one thing, so parts whose bodies overlap by
  more than `PART_OVERLAP` (a half) of the **smaller** are merged, and the merged
  part carries both runs as its provenance. Measured on bounding boxes, and said
  so: an exact intersection volume is a third boolean per pair, and the question
  is only *are these the same thing*.
- **A part's place is said in the footprint's own frame.** The frame's `u` is the
  **long side of the tightest box**, not the direction of furthest reach, which
  for any rectangle is its diagonal and turned a 6 × 4 plan by 34°. The plan is
  cut in thirds each way and the part's footprint centre lands in one of nine:
  *at the north-west corner*, *along the east edge*, *in the middle* — or it
  covers most of both axes and is *the whole footprint*. **North is −Z**, east is
  +X, and every sentence that uses it says so, because a compass on a drawing is
  a convention and not a measurement.

Ids are `part:1 … part:n` per hull, in reading order along that longest edge. The
sentence reaches three places: the brief's parts section (in the engine's own ids,
so a reply about *part 2* can be attached to part 2), the panel's `parts` row as
one chip each (the sentence is the chip's reason; hovering cages the part in
dashed teal, a **second** cage so that pointing at a part never reads as the
selection moving), and `__shard.parts(solidId)`.

**Ink over a part addresses that part.** A closed mark on a hull's face lying
wholly within one part is a `feature` *of that part*, and the rung's own reason
says so, so *Cut a hole* reads **take it out of part 2 of hull**. A mark that
straddles two parts, or none, is left exactly as the rung read it: naming one
would be choosing for the hand. A **scratch across a single part takes that
part's claim out** rather than the hull off the board — one new version of the one
hull step, so one undo puts the claim back — and with a part held the field's
*Remove* means the same act and says `Remove part 2` before Enter. Two guards,
both said rather than silent: a part **two views agree on** is not unsaid by
dropping one of them, and a hull is never left with fewer than two claims.

**A held part is the subject of the panel** (G4). The field already scoped to it;
the panel went on saying *hull*, so *why* about a turret answered about the
castle. With a part taken up, *what* is the part's name and material with its
whole sentence as the reason, and *from* is **cut from N claims of hull** —
because a part is material, not a sub-tree of steps. *becomes*, the parts row and
the evidence are unchanged, because they are about the body either way.

#### The honest limit: two parts, not three

G2's done-criterion asks John's castle-sketch for *two towers and a wall, three
parts*. It gives **two**, and the reason is in the drawing rather than in the
code.

The visual hull is the intersection of **complete** silhouettes. A hand sketching
a castle draws a **partial** one from each place it stands — two towers seen from
the path, a wall seen from the other side — and intersecting partial silhouettes
keeps only what every standpoint happens to agree on. Measured on his own
numbers: read one prism at a time the intersection was empty outright; with the
silhouette rule above it stands, but his three ⊓, each 2.6 u tall, come out as
lumps 0.3 and 0.9 u tall. A tower seen once has no depth, and nothing in the
drawing supplies it.

The alternative was built and measured before being rejected: bound each run by
the **footprint** instead — *the thing stands here, to this plan*. It sounds right
and it is wrong, because it invents the missing depth. John's tower came out a
slab 2.8 u across a 6 × 4 plan, which is the engine making up a size nobody drew.
So a part stays the hull's own material, the cage the panel draws is always around
something standing, and the shortfall is pinned in `parts.test.ts` §5 rather than
worked around.

What would close it is a **second view of each mass** — which is what an
architect's sketch actually contains, and what the two-view tower in
`parts.test.ts` §3 has: two runs in, one part out, 0.7 × 0.6 u and 1.8 u tall.

### The brief, and what it will not say

`describeSpace` is the `describeReading` of this shard, and the rule it exists to
keep is the **region-id rule**: the model is told about things *in the ids the log
uses for them* — stroke ids and step ids — so that what comes back can be attached
to the very same things. A brief that said "the big rectangle at the left" would
get back a reply about the big rectangle at the left, and nothing could be done
with it.

It leads with **what stands**, and says the massing or hull is already standing
and is the extent to stay inside: a model asked to fill a volume that exists
writes into it; a model asked to invent one invents one. Then the planes and what
lies on each, in that plane's own units, so a depth in the reply is in them too;
then the diff if the board is reporting one; then **every name in play, in its
step's own id**, with *do not invent a synonym for one* said out loud — this is
what makes a regen reuse `turret` rather than reach for `tower`; then the library,
so a model may answer `{"reuse": "turret"}` and write nothing at all; then, for a
regen, exactly which steps or parts may change and that a reply touching any other
is refused; then the words.

It ends with `HERE_IN_SPACE`, v10 F13's rule rewritten for space. The half that
earns its place is the refusal: *no meshes, no vertices, no triangles, no code, no
files, no libraries, no textures, lights or cameras* — and **you do not write
geometry**. That is the extent invariant said to the model in its own prompt
rather than only enforced on the way back in.

**The brief has two shapes, and one function says which.** A hull with parts gets
the short brief (`describeHull`): what stands, the footprint, the extent, the
parts with their numbers and their words, then the names, the library and the
words. It does **not** walk the planes mark by mark — not economy for its own
sake, but because every line of a plane-by-plane listing invites a small model to
restate the drawing instead of naming it, and the drawing is not in question here.
John's castle comes to **1048 characters** before `HERE_ON_A_HULL`, which forbids
the profiles the other paragraph offers. `partIdsOf(scene)` is the one test for
which shape, and so for which contract, so the brief, the prompt, the parser and
the landing can never each decide differently.

### The two reply contracts

With no hull standing — three profiles on the world planes — the reply is steps
and profiles, and the model may add profiles of its own. With a hull standing and
cut into parts there is nothing left to invent:

```json
{
  "parts": [
    { "id": "part:1", "name": "turret", "material": "green", "why": "…" }
  ],
  "steps": [
    { "id": "s1", "op": "boss", "part": "part:1", "height": 0.6, "why": "…" },
    { "id": "s2", "op": "cut", "part": "part:2", "shape": "circle",
      "centre": { "x": 0, "y": 0 }, "r": 0.3, "depth": 0.4, "why": "…" },
    { "id": "s3", "op": "mirror", "part": "part:1", "plane": "height" },
    { "id": "s4", "op": "remove", "part": "part:3", "why": "…" }
  ],
  "reuse": "castle"
}
```

`steps` is optional and `reuse` answers instead of both. Four rules, each checked
and each a reason:

- **Never raw geometry, and never a profile it invents.** There is no `profiles`
  list on this path at all. A small op names a part and gives a number; the
  geometry comes from the part the engine already cut — its own footprint, its own
  top, its own height — so `boss` raises exactly that part, `cut` sinks a hole
  through that part's own top face in that face's own units, and `mirror` reflects
  that part's own prism rather than the whole body. They come out as ordinary
  `boss` / `cut` steps carrying `part`, so the derivation, the clip, the diff, undo
  and the export take them without knowing parts exist.
- **A part id the hull does not have is dropped and counted**, with the ids it does
  have said in the same sentence. `part:9` on a two-part hull is about nothing, and
  keeping it would put a name on whichever body happened to be ninth next time.
- **A material is a colour word from the closed list**, else dropped with its reason
  and the rest of the entry kept. Both `"material":"green"` and
  `"material":{"colour":"green"}` are read, because models write both; neither is
  guessed at.
- **What it cannot name, it leaves.** An unnamed part keeps the engine's `part:n`; a
  reply that names nothing and binds one material still lands the material; only a
  reply that came to *nothing at all* is unusable, and that is the one case where the
  board is left exactly as it was.

A name is taken **as written**. The brief lists the hand's own words and asks that
names come from them, and that is where the pressure belongs — the engine never
decides what a thing is called, and a model's word is a claim, held and attributed.

**Strict JSON first, always.** The two repairs that follow are core's own
(`parseFill`) for core's own two reasons — a JavaScript template literal where a
JSON string was asked for, and a trailing comma — and they run only on text that
has already failed. Nothing infers intent; a reply that still will not read is
reported as unusable and the log is untouched. Everything outside the closed
vocabulary is **dropped AND COUNTED**, never coerced into something near it: a
proposal quietly reduced is a proposal nobody agreed to.

**The profiles a model adds are drawn into the log** through the same `addStroke` a
hand's ink goes through, attributed to it and declared content — the canvas's
`agent.draw` rule. They get the same fingerprint, readings, clean form and eraser,
and the model's steps reference them by the ids they were given. Two rules were
learned by running one: **ink a model drew is the tree's provenance**, so it is
taken into the solid the way a feature's ink is (without that, two circles
qwen3:8b had drawn on the foundation read as the castle's own *top profile* and the
panel dutifully reported eleven square units of material the drawing "did not ask
for"); and **a profile no step uses is not drawn at all** (the same model's first
reply re-stated the three views as rectangles it never mentioned again — litter the
form rung reads as three more standing claims, each costing a render and a
rasterisation on every report).

**Then the whole thing is CLIPPED to the massing or hull**, as a final step in the
engine's name: the extent invariant taken literally. The clip holds no geometry —
only `on` and `bound`, the step whose BODY does the clipping, re-derived every time
the tree is walked, exactly as `match` does. A model that asks for a forty-unit
turret on a three-unit drawing gets a three-unit turret.

### Where a part's name lives, and why it is not the part id

**On the hull step, keyed by the claims the part was cut from** — `HullStep.said`,
a list of `PartSaying { claims, said, name?, material?, by, reasoning }`.

A part is derived and its id is a **reading order**. Drop one claim and every part
after it renumbers; a name keyed on `part:2` would then slide silently onto a
different body, which is the exact failure the region-id rule exists to prevent. So
the id a reply used is resolved, at the moment the reply lands, into the thing behind
it that does not move: the claim strokes, which are in the log. `partsOfHull`
re-attaches each saying by containment (exact first, then the part whose claims
contain it — a small op regrows the body and a part can come back merged), and the id
the reply used is kept beside it for the transcript and the panel.

It is one place, and everything reads it:

| Who | What it sees |
|---|---|
| the panel | a named part's chip reads *turret · green*; its own `part:n` and its sentence stay in the chip's reason |
| the brief | the part's sentence leads with the name — *part 1 “turret”, green — 1.2 × 1.0 u …* |
| `namesInPlay()` | one entry per named part, carrying `partId` beside the hull's `stepId` |
| the verb table | `NameRef.partIds`, so *the towers* resolves to parts and not to the whole tree |
| `take()` | a named part is held as a definition **based on the whole** — the hull of its own claims, with the footprint that bounds them, because a part is material and not a sub-tree of steps |
| the render | the colour paints the part's own body, through `Derived.parts`' own path, via `SolidOptions.painted` |

### A regen over a name

*Make the towers taller* resolves the name to **parts** (or to steps, on a tree
without parts) and asks again with only those mutable: the brief gains `ONLY THESE
PARTS MAY CHANGE`, the reply is checked against it and anything about another part is
dropped saying so, and the steps the last reply left on those parts (found by their
own `part` field) come off before the new ones go on. Every other part and every
other step keeps its own id. *The towers are red* and *remove the tower* stay tier 1
and never reach a model: the first is a saying, the second is `dropPart`.

**A step id is recycled when the step that held it is dropped.** `nextStepId` fills
the lowest free number, so a regen that replaces the only named step hands the
replacement the same id. Nothing points at a step id across a version, so nothing is
wrong today — but the id is not a name, and a test that asserted "the id changed" was
asserting the tree's arithmetic rather than the act. What the e2e asserts is that the
STEP changed and that no other step did.

### The verb table, and what it hands back

`behave/words.ts`'s pattern, ported: a table of the ways each verb is said, longest
phrase first, and **what it cannot read is returned, not dropped**. The three verbs
are `regen`, `drop` and `paint`, and what separates them is not which word a phrase
starts with — *make* says all three — but what else it carries: a colour word and
something asking for it (*the tops are red*), a change word (*make the turrets
taller*), or a way of saying remove (*remove the turret*). A noun resolves against the
names in play, singular or plural, with core's own `singular`.

Two of the three are **tier 1 and instant**: `drop` is a new version without those
steps, with anything that stood on them re-pointed at what they stood on, so removing
a turret does not take the castle with it; `paint` binds a colour word to those steps.
Only `regen` asks a model, and its pill carries the dot.

A phrase with a name in it that the table cannot place comes back whole, with its
reason — *"turret" (2 steps) is a name this space knows, but nothing in "the turrets
should feel more medieval" says what to do with it*. The field then offers to **ask a
model what it means**, once, against the closed verb list and the names in play; the
model is not asked what to do, only which of the verbs the shard already has the human
meant, so the worst it can be wrong about is a word. The answer is held in the log as
a `saying`, replayed with the session, and the table reads that phrase itself from
then on. A phrase with NO name in it is not a phrase over names at all: it is a brief.

### A material is drawn where the word was said

A boolean erases which material came from where: once a boss is unioned into a body
there is no face on it that knows it was a turret's top. So a colour word on a step is
drawn as **that step's own contributed volume**, standing in front of the body — which
is exactly the volume the word was said about — rather than the body being split into
coloured groups it cannot carry. `deriveTree` returns those volumes as `parts`; nothing
about them is stored, and a step with no colour contributes none.

One thing this exposed, and it is the model's constraint rather than the shard's: **a
named world plane passes through the origin**, so a reply could say *a circle on the
foundation* and could not say *and it sits on top of the tower*. A cap asked for that
way came back buried inside the castle. A proposed profile therefore carries `at` — the
gizmo's own slide handle, said as a number — and the prompt shows it.

### Where a definition lives, and what it carries

**As a `definition` rep on the ROOT artifact, one per named sub-tree — not as an
artifact of its own.** The plan asks for an artifact per named sub-tree and the engine
cannot give one: `bless` needs marks that are still on the CONTENT plane, and a made
solid's members are not. A rep goes in through `propose()`: it replays with the session,
carries its own reasoning, undoes like everything else, and costs nothing but the
ability to point at a definition with an id of its own.

Taking a version is **one act**: the name and every definition go in as one `propose`,
so one undo puts the board back to a version standing held. The name of the THING has
two cases and both are the same rule — *the part never names the whole*. **A name the
hand typed wins**: a solid already called *mug* with one step a model named `handle` is
a mug with a handle, and reading only the steps took it as a *handle* (and, before that,
refused *Take it* altogether because no step carried a name). Otherwise it is the
**deepest** named step the root stands on, not the nearest: walking up from the base,
`castle` is what the turret stands on and the turret is what the top stands on. Taking
the nearest named one instead named the castle "top".

**The WHOLE is held too, under its own name.** P5 held only the parts, because only the
parts were typed afterwards; P6's whole point is that the thing itself comes back when
its own profile is drawn again. `taken` therefore means *the definitions are held*, not
*it has a name* — reading the name rep disabled the very verb that holds the library.

**Each profile is the engine's OWN fingerprint of that stroke**, at the scale it was
drawn at, plus the KIND of plane it lay on — and nothing else. Nothing here is a new
measurement, so a replayed log derives the same numbers. Three decisions:

- **Only closed marks.** A tree's `from` carries the extent that said how tall as well
  as the profile that said what shape, and a line is not an outline: matching one would
  offer a definition for every straight stroke on the board. The same rule keeps a line
  out of the *honours* row, where rasterising one reported a coverage about the
  rasteriser.
- **Size does not score.** It is held — `place` scales by the ratio of it — but two mugs
  of different sizes are the same mug, and that is the whole reason for holding a
  definition rather than a drawing.
- **The plane is evidence, not a gate.** Drawn on the same kind of plane the
  definition's profile lay on, a match is lifted by `PLANE_LIFT`; on another, lowered by
  `PLANE_DROP` — never vetoed, because a mug drawn on the width plane is still a mug.
  Both are smaller than the corner term, deliberately.

**The weights are core's, re-weighted, and the re-weighting was measured.**
`matchPrimitiveFromLibrary` divides the corner difference by four and scores extent not
at all; with those numbers a plain 2.4-square rectangle scored **0.79** against a mug's
side outline. Between two closed profiles the two terms that actually separate them are
the **corner count** and the **extent**, so those carry more than half the weight and
their falloffs are steeper. The same rectangle now scores **0.62** against the mug and
**1.00** against a box; the mug's own outline scores 1.00 against the mug and 0.62
against the box. Core's straightness **veto** is unchanged and still comes first.

**A correction is an event, not an edit.** `propose()` appends, so a definition rep is
written once and never touched; *Not a mug* goes in as its own `correction` rep beside it
and `definitions()` composes the examples in log order — core's `addExample`, at the
profile rung. That is what makes a correction replay with the session and come off with
one undo. It also made the undo walk learn a new act: a correction sits on top of the
stroke it was said about, and a walk that did not stop at it dropped the mark as well —
*Not a mug* erased the mug's profile.

### The placement holds no pose

`place(definition, pose)` is the third step that stores **nothing derived**, after
`match` and the clip. It carries the definition's name, its tree, and **two stroke ids**:
the profile of the definition the outline was matched against, and the outline drawn
here. The scale (the ratio of the two outlines' own sizes), the turn (one plane's frame
onto the other's) and the shift (one outline's centre onto the other's) are worked out
from those two inks every time the tree is walked. A scale cached in the step would go
stale the moment either mark was undone.

Both plane frames are (u, v, n) with `cross(u, v) = −n`, so the turn between any two of
them has determinant +1 and nothing comes out inside out — the same left-handedness that
had to be signed for in `solid.ts`, paying its way for once. A placement whose source ink
has gone marks the solid **broken** with that reason and leaves the body as it was.

**It is a new ARTIFACT, and that is the door P3's `dup` could not find.** `bless` needs
marks that are still on the content plane; `session.import` stands an artifact up from
DATA — a name, bounds and a code rep — which is precisely what a placement is. So a
placed mug is a thing of its own that can be cut, moved and named. The core gap is
therefore narrower than P3 thought: what is missing is a *bless from data*, and `import`
is the door that already exists.

### What a body is answering to (`src/constraints.ts`)

The *honours* row used to take `steps[0].from` and rasterise every closed mark it found
where that mark happens to lie. On a placement that is wrong twice over: a `place` step's
two stroke ids play **different roles** — the outline it stands at, drawn here, and the
outline the definition it copied was made from, lying at the original — and comparing the
second one in place compares this body against somewhere else. The completed mug said
*honours the drawing 20% · top 39 · top 0*, and the 0 was the first mug's plan.

`activeConstraints(tree, ctx, drawnSince)` walks the tree instead and classifies every
closed mark it references:

| kind | what it is | where it scores |
|---|---|---|
| `target` | drawn at this instance: a massing's or hull's claims, an `extrude`/`revolve` profile, a `match`'s profile, a `place`'s `toMark` | where it lies |
| `source` | the definition a `place` copied was made from — `of`, and every stroke the copied steps name | **carried** onto this body by the placement's own pose |
| `revision` | drawn against this body after it stood (the form rung's *profile of*) | where it lies |

**A correspondence is carried, not dropped.** The pose is already re-derived from two inks
on every walk, so the same pose puts the definition's outlines where this body stands — a
translation, a turn or a half-scale placement cannot lower agreement merely because the
source sketch is still lying elsewhere. When the pose cannot be derived (the source ink
was erased — the same condition that calls the solid broken), the constraint keeps its ids
and loses its number: *not counted: …*. Provenance is never dropped to improve a score.

**A feature is a claim about a face, not about the extent.** Coverage is an intersection
over a union, so a small circle measured against a whole body reads near zero whether it
was cut or bossed — and a cut's outline is a claim that there is *nothing* there. Both are
kept, both say why, neither is counted.

**A hole cut through a body makes its own plan stop describing it.** After *Cut a hole*,
the row for the mug reads 56% against the rectangle its plan was drawn as — because from
above the thing is now an annulus with a handle. That is the diff being right, and the row
says it itself: *top 56 (material was taken off since it was drawn — less is expected to
show)*, because a bare low number is indistinguishable from a wrong one. The same sentence
is what a sketch hull's 9% carries.

**A derived measurement the panel asks for on every hover has to be cached.** `honoursOf`
is three offscreen renders and three rasterisations, and the panel asks for it on every
hover and every report; uncached, a board with a massing on it spent whole seconds a frame
re-measuring a body nobody had touched. Cached per log version, like the diff.

### The board leaves the tab as its own log

**The format is the canvas's, unchanged**: `encodeLog` of the session's own events, one
JSON event per line. That is what `.metamedium/logs/*.log` holds, what the canvas's export
pane writes as `canvas.jsonl`, and what `mergeLogs` reads — so a board exported from either
surface is the same kind of thing and needs no converter. *Export…* downloads it as
`shard-<date>.mm.log`; *Open…* picks one and replays it.

**Opening is not undoable, and it says so first.** `session.load` replaces the whole event
list and bumps the generation, so there is no act for undo to walk back to. The honest thing
is a confirm on a board holding work, and none on an empty one — not a fake undo that could
not put the old board back.

A board round-trips: `export.test.ts` pins that the marks, the solids, the names, the planes
and the trees come back identical, which is the log being the source.

**What a file is, is read from what is IN it**, never from its name: a dev server answers a
path it does not have with the page itself, so probing `fixtures/x.mm.log` came back 200
with a document in it. One JSON object with `marks` in it is a captured view; a log is many
objects, one per line, and never parses whole.

### The transcript: what was sent, and what came back

`src/exchange.ts`, and the panel's ***model*** section under *why / measurements*. One row
per exchange — *glm-5.3-flash · the brief · applied · 159 ms* — opening on the outcome and
its reason, the words the hand typed, what parsed (counted, never the reply's own claim),
what was dropped and why, and then **the brief as sent** and **the reply as received**, each
verbatim in its own scrolling box. The reply is shown *before any repair*: what a model
actually wrote is the evidence, and a repaired copy of it is the shard's account of what the
model meant.

Two rules it keeps:

- **It is runtime, not the log.** What a reply DID is already in the log — the version, the
  profiles it drew, the steps it named, each attributed and each undoable — and a board
  replayed from its log must derive the same drawing whether or not anyone ever saw the
  prompt. Putting the brief in the log would also put a model's whole reply into every
  export, every merge and every other hand's copy of the board. The last eight are kept
  (`KEEP`); how many is still John's.
- **A row a hand opened stays open.** The panel is rebuilt on every report — every camera
  move, every hover — and a disclosure rebuilt is a disclosure shut, so reading a reply on a
  live board was impossible until which row is open was remembered across the rebuilds.

**Every exit path of `runBrief` ends in a sentence AND a row**, the same sentence in both,
including the two that never reach a model: no seat joined, and nothing on the board to fill.
An attempt that leaves no trace is the fault G0 exists to close.

### A brief always answers, and the drawing stands first

A brief is no longer refused for want of a selection. `briefTarget()` says what Enter will
fill, in the order a hand means things in — **what you pointed at**, then **the one solid
standing** (a brief with nothing selected on a board holding one body is about that body;
requiring a tap was a mode wearing a different hat), then **the drawing stood up first**,
then **what is missing**.

`log.standFor()` is the seam underneath, and the one G1 widened from the massing to the
sketch hull without changing a caller. When nothing can stand it names what is **missing**,
as the next mark to draw rather than as what the shard noticed: *nothing stands yet — a
footprint on the foundation and a shape from the side would*; *… 1 outline on the foundation
alone; a shape from another side, on another tile, would stand it*; *… the outlines on the
foundation and height do not overlap where they are, so their views are of two different
things*.

The field says which of the three Enter will be **before it is pressed**, and it asks the
same function `runBrief` acts on, so the line and the act cannot disagree.

### The hand, and the seat

The shard joins a live room the way the canvas does, and the same process is both halves of
it: **a hand** in the room, and **the model seat**. John types a brief in his tab; Claude
Code, in a conversation, reads it and answers it; the shard applies that answer exactly as it
applies a small model's. That is the point — the contract a model is asked to fill gets
argued about first hand, before anything is tuned against it.

| Tool | What it takes |
|---|---|
| `space_look` | nothing — the three planes, every mark with its reading and the plane it lies on, every solid's op tree with step ids, names and materials, and whether a brief waits |
| `space_pending` | nothing — the parked briefs: the key, the human's words, the contract to answer in, the brief itself |
| `space_answer` | `key`, and either `reply` (the contract the brief carries — `{parts, steps?}` for a standing hull, `{steps, profiles}` otherwise, or `{reuse}`) or `refuse` (one clause) |
| `space_draw` | `claims`: each a shape (`rectangle`/`circle`/`triangle`/`line`/`arrow`) or raw `points`, on a named `plane` (with an optional `at` along its normal) or a view plane through `through` facing `facing` |
| `space_propose` | `solid` (id or name) and `reply` — held on the solid, never blessed |
| `space_say` | `text` and `about` — a sentence beside marks, said in the human's status line as it lands |

**How a brief travels, and why it is a log event.** The plan left it open: a log event, or a
side channel over the relay. It is a log event — **an answer on the explanation plane** — for
three reasons. The canvas already parks questions there (`session.answer()` is the third plane
beside content and gesture: visible and erasable, never ink, never joining a lasso or a
signature), and a brief changes no mark, stands no solid and writes no version. The log is the
source, and a side channel would be a second truth that does not replay, does not undo and is
not exported. And it costs no protocol: `LiveStore` already carries log lines, and the relay
keeps no truth of its own.

The one thing the log cannot carry is the **pairing**, because node ids are per hand — a
counter derived on replay, and two hands merging the same lines in a different order can number
the same node differently (SURFACE-v10-PLAN D8, still a debt). So the pairing rides in the
event's own payload, which merges identically everywhere: a brief is an answer whose `question`
is `brief:<key>`, its reply is one whose `question` is `answer:<key>`, and **no id is matched
across hands**. The hand answers about the ids it read off the brief's own node in its own
session.

**The seat is a model, and that is the whole of it.** `runBrief` has no case for it. A seat
carries an injectable `transport` — the same hook the e2e's stub uses, which is
`participants/bridge.ts`'s pattern — and the hand's transport parks the question instead of
posting it, returning the same `CompletionResult`. So the prompts are the same, `parseProposal`
is the same, everything outside the closed vocabulary is dropped and counted the same, the work
indicator and **Esc** work the same, and the version is held and attributed the same.

**The hand takes the front seat.** `first()` is who a brief goes to, and sitting down in this
seat is a deliberate act that says *ask me*; with a local model already seated, a brief typed at
the hand would otherwise go to the model. *Leave the seat* puts it back. **It proposes and never
blesses**, holds no keys, writes no code that runs and cannot play anything.

**Both asks, because there are two** (G4). `splitPrompt` reads the brief and the human's words
back out of the prompt a seat was handed, splitting on the literal `messagesFor` writes between
them — and it knew only *Propose the tree.*, the steps contract's marker. So on a standing hull,
which is the board the whole of push 2 is about, the hand was handed the brief with the words
stripped out of it. *Name the parts.* is in the table now; the marker a contract uses is the one
thing that must not be guessed, so they are listed rather than matched loosely.

**Three things real use found at once.** `space_look` must read every node carrying ink and a
plane, not `contentIds` — a mark a solid was made from leaves the content plane, so a board with
a box standing on two marks reported *0 marks*. A step's provenance is its `from` (stroke ids),
because `profile` on a step the engine built is the resolved outline and printed as
`[object Object]`. And the `?live=` boot block must run at the **end** of `main.ts`, with the
demo — up beside `createModels` it runs during module evaluation, where `report()` reads chrome
declared further down, so it threw into a promise nobody awaited and the seat silently never
took while the room joined fine.

**When the tools are not loaded.** A session that started before `.mcp.json` named this server
has no tools for it. The hand still works from the shell, exactly as `CLAUDE.md` documents for
the canvas: run `mcp.mjs` with its stdin fed by `tail -f` on a command file and its stdout to an
output file, append one JSON-RPC line per call, and read the reply. One process stays alive
across turns.

```bash
mkfifo /tmp/mm3d.in 2>/dev/null; : > /tmp/mm3d.cmd
tail -f /tmp/mm3d.cmd | node shard-3d/mcp.mjs > /tmp/mm3d.out 2>/tmp/mm3d.err &

echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{}}}' >> /tmp/mm3d.cmd
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"space_pending","arguments":{}}}' >> /tmp/mm3d.cmd
tail -c 4000 /tmp/mm3d.out
```

### The cursor, and where free ink lands

**Shift + click puts the cursor** where you clicked: on the surface under the pointer, else on
the foundation plane under it. The whole picker moves there, and from then on the **view plane
passes through it**, screen-facing. This is Blender's 3D Cursor placement, which is what John
asked for by name. It is a runtime thing, like the camera — never a log event — and `home` and
framing do not touch it. A face under the pen that the camera can actually read still wins
outright, which is Blender's *Surface* placement.

**But the shard's cursor FOLLOWS the view until it is placed, and Blender's does not** — the one
place the shard deliberately parts company with the reference. Blender's cursor is static: it
starts at the world origin and stays there. On John's second board that cost him the whole
drawing — he looked one to four units up and drew four free loops, and every one landed at floor
level, because the view plane stood through a cursor nobody had moved. So the rule here is **the
view plane passes through the volume the hand is working in**: by default the camera's *target*,
the centre of the view, which pans and orbits with the hand; and a cursor placed by shift + click
sticks, until `0`, a clear, or a shift + click on the cursor itself lets it go. The status line
says which in the words you would use — *view · through the centre of the view* or *view ·
through the placed cursor*.

**What follows is the view plane, not the picker.** The picker stands on the placed cursor and at
the world origin when there is none, because its origin is where the planes it hands out pass
through — a foundation on a following cursor would be a ground that lifts off the ground the
moment you looked up — and because a picker parked in the middle of the view puts three clickable
tiles under the middle of every drawing.

**View ink is world geometry.** It is drawn the same from every angle, like every other stroke:
orbit off it and it is a thin, fully drawn ellipse, not a faded one. (Until 16 September it went
faint once the camera left the pose it was drawn at. That said the stroke was a property of the
camera, which is the one thing it is not.) The pose is still kept on the mark — provenance, and
what makes any plane derivable from the screen path later. The compass's **pinned views** chips
list every pose view ink hangs on, with a count, and a tap eases the camera back to it: camera
bookmarks, where a stroke reads as what it is. Nothing about what is *visible* depends on them.

### The scorer, in one paragraph

**`confidence = shape × facing × anchor × continuity`**, in one place
(`src/planarity.ts`, `rank`). **Shape** is the shape rung's own top confidence on the stroke's
screen path cast onto that candidate, read at that plane's own `scaleAt` — the strongest term, and
the only one that knows what was drawn; floored at `SHAPE_FLOOR` when the rung places nothing, so
a plane is never scored zero for a squiggle. **Facing** is
`FACING_BASE + (1 − FACING_BASE)·|n · look|`: 1 flat on, `FACING_BASE` edge-on, gentle on purpose
because a box's top seen from above is only 84% face-on and must not lose to the view plane for
being 100%; below `FACING_FLOOR` the candidate is kept, marked *too oblique to read*, and can
never win, and below `FACING_TAKES` it is kept, marked *too oblique to take the stroke*, and
cannot outrank the view plane. **Anchor** is how much of the stroke lies on geometry that lies in
that plane — a face's own corners, the previous stroke's bounds — as a ratio of the stroke's own
size: `ANCHOR_BASE` when there is nothing there (absence of evidence), up to 1 when the ink lies
on it, and down to `ANCHOR_MISS`, below the base, when there is geometry and the ink is nowhere
near it (evidence against). **Continuity** is 1 for the previous stroke's own plane within
`recentWindowMs` and `CONTINUITY_BASE` otherwise. Multiplicative rather than a weighted sum,
because the terms are independent evidence and any one of them being bad *should* pull the whole
candidate down: a plane the stroke reads as nothing on, seen nearly edge-on, with nothing in it, is
not saved by being recent. Every term is returned on the candidate, so the panel shows the
evidence and not only the number.

**`pickAtPenDown` is not the scorer.** At pen-down there is no stroke to read, so the live plane
comes from where the pen is: a face beats everything, else the previous plane when it is recent AND
the pen came down near that stroke, else the view. The full read happens once, at pen-up.

### The gate: off-axis ink is conserved

John, drawing with nothing chosen: *"drawings off the main axis are on the camera plane mapped
rather than the way it is stretching the shapes out now; the shapes drawn off main axes should stay
conserved size at the angles that make sense."*

The scorer is a comparison of evidence, and a half-oblique plane can win one. At forty-five degrees
a world plane's facing term costs it only 22%, and continuity plus an anchor pay that back twice
over — so a circle drawn beside a box came back a long ellipse lying on the ground. Casting a
screen path onto a plane at that angle is not a reading of what the hand drew; it is a stretch of
it.

So with nothing chosen the **view plane is the default**, and evidence does not merely have to beat
it — it has to **make sense at its angle** first. `FACING_TAKES` (0.80, 37° off face-on) is that
gate: below it a `world`, `previous` or `face` candidate is kept, said out loud, still offered by
the runner-up chip, and **cannot outrank the view plane**, whatever its shape score. It applies at
pen-down too: a face under the pen keeps its precedence only if it passes, and otherwise the stroke
goes on the view plane through the cursor. Shift + click on that face first and the cursor is *on*
it, which is how you get the face's own depth and the camera's own angle at once.

The number is bounded from above by the shard's own default three-quarter view, which sees a
horizontal plane at **0.844** (`DEFAULT_PHI`, 57.6° above the horizon). A gate over that would mean
the view the shard *opens on* could not take a face at all, and P2/P3 would have nowhere to land.

What the view plane conserves is not a threshold but a property: it is screen-facing by
construction, so the cast is a **similarity transform** — the circle is the circle, at the cursor's
own depth. `planarity.test.ts` pins the aspect to within 1%, and the e2e measures the same thing
through the real pointer path at a 49° view: `1.0000` on the view plane, `0.825` the moment the
ground is taken from the chip. G4's fourth beat measures it again on a standing board: 1.394 drawn,
1.394 landed.

Two things the gate deliberately does **not** do. It does not touch a **chosen** plane: the
gizmo's tile is a decision, and a decision is not a reading to argue with. And it does not *drop*
anything: the gated plane is in the panel with its number, its facing, and what taking it would
cost, and the chip takes it in one act. The hand overrules the gate; the gate never overrules the
hand.

The demo was leaning on the defect. `?demo=mug` orbited by 0.04 before drawing the hole, which left
the rim 0.70 face-on — an angle at which the face outscored the view plane 0.68 to 0.55 and the
circle landed on the rim as a 1.4:1 ellipse. It orbits to look *into* the mug now, which is the
angle the demo's own sentence was always describing.

### A flip is one act

A flip re-reads the mark's **kept screen path** onto another candidate, under the **pose in the log**
rather than wherever the camera is now. It cannot be a new rep on the same node: `getRep` returns the
FIRST rep of a modality, and the readings, the fingerprint and the maths were all computed from the
ink at `addStroke` — a second `stroke` rep would never be seen, and a mark whose plane changed but
whose readings did not would be a lie. So the flip is a new stroke, and it is **additive**: `add` the
re-projected stroke, then `erase` the first, in that order, all three under the flip's one timestamp
— so `log.undo()` drops the erase, the plane and the stroke together and the first mark comes back on
its first plane. The other order would leave the first mark erased. A mark a solid was made from is
refused, and says why: the tree references that stroke id and was measured in that plane.

### The plane is a rep on the stroke

**Proposed by the local participant through `session.propose()`.** §2.1 says the plane is "a rep on
the stroke with a reason, either way it came to be there", and `Rep.data` is deliberately `unknown`,
so this needed no new event type: the plane goes into the log as a `propose` event, replays with the
session, and carries its `why` and its confidence like every other reading. A parallel shard-owned map
keyed by stroke id would have been a second source of truth beside the log.

The one cost is **undo**: for a stroke the last event is the `propose`, not the stroke, so one undo
would leave the ink with no plane. `log.undo()` walks back until the number of `stroke` events actually
falls — four lines, and a test pins it.

**A world plane read from the evidence should stand where the pen is.** §2.1 says "the three world
planes through the origin (or through the gizmo's slid origins)", and the parenthetical is the point.
Standing them at the world origin offered a `height` plane a profile does not touch, so flipping an
extent onto it produced a mark the form rung could not see as an extent — a chip that settled nothing.
They now stand through the point the pen came down on when it came down on something, and say so. It
also settled the runner-up on a box's top face: the horizontal plane through the pen IS that face, so
it is offered once, and what is left second is `view`.

**A gesture's reading is not derivable from the board it changed.** Row 1 reads a stroke against the
silhouettes of the solids standing in its view — so the moment a scratch has done its work there is no
solid left to cross, and the table re-derives the very same mark as an `annotation`. The reading is
therefore HELD on the mark as a `gesture` rep the way core holds one, and `forms()` prefers it. *What a
mark did is not a function of the board it left behind.*

### The compass in the corner, and the plane picker at the cursor

They look alike and they answer different questions, so they are two widgets and they always will be.
**The plane picker** stands at the cursor, in the scene, and its three tiles say *where ink lands* — a
decision, blessed by the act of tapping one. **The compass** sits in the top-right corner, is chrome
rather than world, and says *where the eye is*. Nothing the compass does touches the log: a camera pose
is runtime, and the only pose the log holds is the one a view stroke already carries.

The compass is an **SVG overlay**, not a second three.js scene rendered to a corner viewport. It is a
hundred pixels of six circles and three lines; an SVG takes its colours from `brand/tokens.css` like the
rest of the chrome, so light and dark are the same tokens inverted with no second palette, and it costs
no draw call. `view.ts` does the only hard part — projecting the six axes onto the camera's own screen
basis and sorting them by depth — and it is pure, so it is tested without a canvas.

Three arms from a centre, each ending in a ball: the positives labelled `X` `Y` `Z`, the negatives
hollow and bare. The world convention is Y up, so `X` is the **right** view, `Y` the **top**, `Z` the
**front**. Near balls are drawn larger and over the far ones (`ballScale`, a painter's order rather than
a z-buffer). The ball that faces the **chosen plane** carries the teal keyword colour — the same signal
the picker's tile carries, because they are saying the same thing. A tap snaps, keeping the target and
the distance: a snap is a turn, not a re-frame. A second tap on the same ball flips to the other side. A
drag anywhere on it orbits at the same radians-per-pixel the canvas drag turns at — one finger, because
the widget is chrome and one finger on the canvas draws. Under it, *home* frames everything on the board
(or the plane picker itself, when the board is empty, because that is the next move), *view* is persp /
ortho, and every pinned view is a chip.

**The axis view IS the choice.** John, looking at the two widgets: *"in explicitly selected gizmo x, y,
or z, treat that surface as selected automatically rather than needing the plane click; hide the plane
click option when in a gizmo-clicked x, y, or z; only show the planes when in alt views."* They were two
decisions where a hand makes one: standing square onto the height plane and *then* clicking the height
tile is saying the same thing twice, and the tile you must click is a square lying over the drawing you
came here to make.

- **Tapping a ball chooses the plane that view faces** — front or back (along Z) → height; top or bottom
  (along Y) → foundation; right or left (along X) → width (`axisPlaneFor`, the same mapping the teal ball
  was already lit by). The status says *front · height chosen*. It is the same `chosen` decision a tile
  makes, so the profile and its extent, the edge-on gate and the picker's slide are all looking at the
  plane they always were; only the **reason** differs, and the ink carries it — *the front view faces it
  — the camera chose the plane*, never a tile nobody held.
- **The rule is about where the camera STANDS, not which control moved it.** An orbit that lands on the
  front by eye chooses the same plane a tap would (`isAxisView`, within `AXIS_VIEW_TOLERANCE_DEG`).
- **The tiles are hidden in an axis view** and come back the moment the camera leaves. What stays is the
  cursor mark and its three axes — that is where the cursor *is*, and shift + click has to keep reading.
- **Leaving an axis view gives the plane back to the hand.** The choice was the view's, so it goes with
  the view: what comes back is whatever the hand had chosen with a tile or a key, which is *nothing* when
  it never did. The rule is one line (`planeAfterLeavingAxisView`) so the other reading — the view's
  choice sticks until something else is said — is one edit rather than an argument spread through the
  wiring. It stays quiet when nothing changed: a camera move must not push *massing from 3 profiles ·
  tier 1* out of the one status line.
- **The hand overrules the view.** `0` (or the picker's centre) in an axis view un-chooses and hands the
  tiles straight back; so does choosing a *different* tile by key.

**A plane chosen by hand that is edge-on from here still says so** — the scorer's own `FACING_FLOOR`, so
the compass and the planarity read use one number: *height chosen · it is edge-on from here — orbit, or
tap the ball that faces it*. §10's last risk is that the pen works and the ink goes nowhere; the fix is
to say so before the hand finds out.

**A snap ends when the camera arrives**, not on a stopwatch. The ease is wall-clock and its last few
degrees ride on a single frame; on a deadline of `ms + 60` a frame that came late put the arrival after
it, the lens was handed back to auto-perspective while the camera was still a degree off the axis, and
the ortho a tap promises quietly came undone. Arrival is the normal end; the timer is a generous backstop
(`SNAP_GRACE_MS`) for an ease that is never going to arrive.

**Perspective follows the camera.** A tap on a ball goes orthographic, and orbiting off the axis comes
back to perspective — Blender's "auto perspective", and the reason for it is the reason the three
canonical views exist: a front, top or side view is a draftsman's, and perspective is a lie in it, which
is exactly what you went to that view to check. Off the axis, depth is what says the thing is solid.
Pressing the *view* tile **pins** the projection where you put it, and a tap on a ball hands it back to
the camera. The toggle does not jump: going to ortho, the frustum height is the perspective frustum's
height at the target (`orthoHeightFor`); coming back, the distance is the one that frames that height
(`distForOrthoHeight`). Each is the other's inverse, and the pair is pinned by a test. Both cameras stand
in the same place and `space.camera` is whichever is live, so everything that takes a camera swaps with
it and nothing else in the shard knows. A pose taken through the ortho lens carries its frustum height
(`Pose.ortho`), so `rayForPose` rebuilds an orthographic stand-in rather than fanning parallel rays.

**Orbit around the centre of the view.** An orbit asks, once, at the moment the drag begins: the
**selection** if there is one, else **nothing** — and nothing means the target, the centre the hand panned
to. Either way the target is not moved onto anything: with a pivot the camera **and** the target turn
rigidly about it, so the pivot keeps its place in the camera's own frame and stays under its own pixel.
This is the fix for *"the rotation needs to respect the translation of the overall view so it doesn't snap
to center"*. The first version moved the target *onto* the pivot and rebuilt the angles from where the
camera stood — which re-aimed the camera, so the picture swung the pivot to the middle of the screen the
moment a drag began. Gone with it: orbiting about whatever the pointer happened to be **over**. Even made
rigid it would put the centre of the turn on a different point every drag, for no act the hand performed.
A **dolly** asks the same question and gets a different answer on purpose: it goes toward whatever is
under the pointer, selected or not, because there you are pointing at where you want to be rather than at
what you are working on. Answering both with "the selection" is how a wheel over the corner of a thing
sails past it.

### Trackpad and touch

John: *"Make the view work with trackpad and touch."* On a trackpad there was no orbit at all — no right
button on the machine — and every swipe zoomed, because the browser sends a trackpad's everything as
`wheel` and the shard read every wheel as a dolly. On a screen, turning the view meant dragging a compass
the size of a thumbnail.

**The map is Blender's**: swipe orbits, `Shift`+swipe pans, pinch or `Ctrl`/`Cmd`+swipe zooms. A hand that
has Blender in its fingers should not have to learn a second map.

**Telling a trackpad from a mouse is the only part Blender cannot lend**, since both arrive as `wheel`
with the same fields. They are told apart by the event's **shape** (`classifyWheel`, read top to bottom,
first match wins): `ctrl` is a pinch, because that is how macOS sends one; lines or pages are a wheel's
units; a delta on **both axes** is the sign a wheel cannot make; a fractional delta is a trackpad
measuring a finger; a whole step under 40px is a trackpad nudged, and one at or over it is a notch. The
two-axis verdict is **remembered for 800ms**, because the middle of a real swipe runs straight and sends
deltas that look exactly like notches — without the memory a gesture turns into a zoom halfway through —
and it expires, so putting the trackpad down and picking up a mouse does not inherit it.

**A swipe worth a canvas width is half a turn**: π/width radians a delta unit, about 0.0026 on a 1200px
canvas. Deliberately gentler than the 0.006 a mouse drag turns at, because a trackpad's deltas are
accelerated and a swipe spends more of them than a finger travels.

**On a screen: one finger draws, two fingers pinch or orbit, three pan.** They pinched and panned until
now (P0's rule, and the canvas's) — but this is a place for making 3D things, where turning the view is the
commonest thing a hand does, and asking for that from a corner of chrome is asking too much of a thumb.
Which of the two a pair is doing is decided **once**, after they have travelled twelve pixels, by whether
the spread or the centre grew faster — deferred commitment, the way the plane is picked, and nothing moves
before the decision. Once made it holds until a finger lands or leaves. A change in how many fingers are
down **restarts** the gesture and moves nothing: the centre of three is nowhere near the centre of two, and
carrying a delta across that jump would fling the view.

**No stroke is ever begun by a gesture that turns out to be two-fingered.** A screen cannot know the second
finger is coming, so the first one has already been drawing by the time it lands; the scene sees it land and
`ink.ts` **drops** the live stroke rather than finishing it (`space.onAbandon`) — nothing read, nothing
logged, nothing to undo. Deliberately not `pointercancel`, which means the pen was taken away mid-stroke and
that stroke is still the hand's. And while two fingers are down `space.orbiting()` is true, so the second
finger does not start a stroke of its own.

### Ink is never covered, on a face

Invariant 3 says a solid made from a sketch draws **with the sketch still on its face, faint**. A solid
grows *out of* the plane its profile lies on, so the profile's ink ends up flush with a face or inside the
solid, and an ordinary depth test would hide the very mark the thing was made from.

So the marks a solid was made from are drawn with **the depth test off**, at 0.3 opacity, above the solid,
while the solid's material carries a polygon offset so a coplanar face never fights a line. The cost is
honest and visible: a box with its footprint showing through reads a little like glass.

**The alternative was tried, and it does not come off.** Turning the depth test ON is an immediate visual
win — the box stops reading like glass — and what it costs is the thing invariant 3 is for. Three findings,
in the order they turned up. **A polygon offset does not win the tie**: every stroke is already lifted
`LIFT` (0.004 u) along its plane's normal, which for a profile is *into* the solid, and a polygon offset in
depth-slope units never recovers that — a `Line2` is a screen-widened quad whose slope at a face seen head-on
is near zero, the worst case for the offset. **A camera-facing lift does win it** — move the ink object a
fraction of the camera's distance toward the eye before the test, recomputed on every camera change — and the
mechanism is demonstrable. **And it still shows the hand nothing**, because of where the ink IS: a solid grows
*away* from the plane its profile lies on, so the profile's ink ends up on the one face you are never looking
at; from underneath, where it is visible, it coincides with the body's own silhouette edge. Depth-testing it
buys a better-looking box and loses the only view in which the sketch was telling you something.

So the glass stays, and the trade is still John's — but it is now a trade with a measured price. The one place
the argument could change is a **feature** drawn on a face that stays visible (a circle for a cut or a boss,
on a top face): there depth-testing would show the ink crisply where it lies. That is an argument for deciding
per-mark, not for one flag over all of it.

### One file, and what it took

`build-standalone.mjs` runs `npm run build` and inlines what Vite emitted. Two things are worth knowing:

- **`String.replace` reads `$&` in the REPLACEMENT.** A minified bundle is full of them, and the first run
  put the whole `<script src=…>` tag back into the middle of three.js — the script guard then said, correctly,
  that the page still referenced a file that would not travel with it. The replacement is a function now,
  which turns the substitution off.
- **A literal `</script>` would close the tag early.** In valid JavaScript that sequence can only occur inside
  a string or a regular expression, where `<\/script` means exactly the same thing, so it is escaped rather
  than merely refused.

The font stays external: `brand/tokens.css` pulls IBM Plex Mono with an `@import`, the tokens name a real
fallback stack, and the face is not worth trebling the file for. The result is one `<script type="module">`
and one `<style>`, and it runs from a plain static server with no console errors — `?demo=castle` included.

### Smaller things, found the hard way

- **`linewidth` is ignored on a plain `THREE.Line`,** and a hairline is not ink. The ink is drawn with `Line2`
  (screen-space quads) so a stroke reads as a stroke at any zoom.
- **A plane's frame is left-handed.** The plane's axes are (u, v, n) with v running *down* the screen, and
  `cross(u, v)` is exactly `−n` for every plane — so a matrix made of (u, v, n) is a mirror and every face of
  every solid comes out inside out. `solid.ts` builds (u, v, cross(u, v)) and signs the extrusion to suit.
- **three.js lighting is physically correct, and the tokens are not exposure values.** `--paper-dk` under an
  ambient of 0.9 renders as slate; the scene's levels are set so a face of that token comes back on the paper
  it was named for.
- **The tokens have no `prefers-color-scheme` block.** `brand/tokens.css` defines dark under
  `[data-theme="dark"]` only, so a surface whose theme is *system* must stamp the attribute itself — stamping
  nothing renders light on a dark machine while the tile says `sys · dark`. `src/theme.ts` stamps.
- **A boolean's output cannot be given to `THREE.EdgesGeometry`.** It keeps an edge when the two faces sharing
  it disagree by more than the threshold *and* when nothing shares it, because that is a boundary — and a
  triangle splitter leaves coincident-but-separate vertices and T-junctions all over a re-cut face, so a box
  with a hole in it came back drawn like a spider's web. Every solid the shard derives is a CLOSED body, so a
  genuine boundary edge cannot exist: `hardEdges` keeps only edges shared by exactly two faces that disagree.
- **A zigzag that comes back to where it started reads CLOSED, and a closed stroke is never a scratch** — it
  is a lasso, which is core's rule and the right one. An even number of traversals ends on the side it began,
  so the e2e scratches with three.
- **The panel's height was a guessed number, and P4's two pills found it.** `#panel` stopped at
  `100vh - 220px`, which assumed how tall the field would be; two more verbs made the field taller and it began
  covering the bottom of the panel — which is exactly where the newest row lives. The field measures itself into
  `--field-h` on every render now and the panel stops where the field starts. A layout constant about another
  element's content is a constant that goes wrong the first time that content grows.
- **`offsetParent` says nothing about whether a fixed element is on screen.** Every piece of this surface's
  chrome is `position: fixed`, and a fixed element's `offsetParent` is **null by spec**, displayed or not — so
  the usual *is this displayed* test called all of them invisible. The honest question is whether the thing
  takes up room: `getBoundingClientRect()`.
- **The bar was already over a phone's width before anything was added to it.** At 375px its controls wanted
  420px, so *theme* and *help* sat off the right end with no way to reach them — invisible because nothing had
  ever measured it. Adding *details* made it 511 and made it visible. The bar scrolls sideways on a narrow
  screen now.
- **`taken` meant two things, and the second one broke the first.** `versionOf().taken` read a `name` rep,
  which was the same as *the definitions are held* only while `take` was the only way to name a solid. Naming
  one by hand first — which is exactly what P6's demo does — disabled *Take it*.
- **`newVersion` returned nothing, so a version the session refused was reported as a success.** It returns
  `attachCode`'s answer now, and `applyParts` says nothing was written rather than claiming two parts were
  named.
- **A demo that waits for a frame waits forever in a tab nobody is painting.** Whichever comes first, a frame
  or a timer's tick, moves the `?demo=` blocks on — the canvas's own lesson (`nextFrame` in
  `Demos/surface/01-view.js`).
- **The panel's parts wiring silently dropped `name` and `colour`** (G4). The chip's label is `part.name`, so
  every chip read *part 2 · at the north-east corner* however the hand or a model had named it, and G3's names
  showed only in the rows further down.
- **An axis view changes the camera, so the demo must leave it before it orbits** (G4). `?demo=castle` taps the
  Y ball for its footprint, and orbiting from *there* by the standpoints' own deltas put the eye somewhere the ⊓
  read as `annotation` and nothing stood. It goes back to the free view first, which is also what the beat says
  in words.
- **A placed sketch hull fills a corner of its own plan, so a ray down the centre proves nothing** (G4). The
  demo's eighth beat sweeps the outline instead and asserts that something of the placement stands inside it and
  that nothing else does.
- **A runner that reads a scenario's name twice can wait thirty seconds for `window[undefined]`** (G4). The
  shard's whole loop is called `shard` on `e2e/run.mjs`'s command line and `__scenario` in the page; one table
  (`SHARD_SCENARIOS`) now holds both, plus the label the results are filed under.

## What it does not do

**The read cannot tell a line going away on the ground from a line rising.** The honest limit, and plan §10's
first risk arriving on schedule. A straight screen stroke reads `line 0.92` on *every* plane, so the strongest
term says nothing; the two readings are the same picture, and no term in the scorer can separate them. An extent
drawn from a profile's edge with **nothing chosen** reads `previous · foundation 0.64`, with `view 0.55` and
`height 0.40` behind it, and no box stands. The answers are the two the plan already gives — choose the height
tile, or take the chip. The evidence that *would* separate them is occlusion, and that is a fifth term the plan
does not name: noted, not built.

**The scorer's terms are the four §2.1 names and no others.** No occlusion, no prior over which plane a hand
uses most, no learning from what was taken. Each would help; each is a new kind of evidence and wants the plan's
sanction first.

**A flip does not re-read what the flipped mark affords beyond tier 1.** It runs the tier 1 check — a line that
was flat on the ground and is now rising off a profile IS an extent, and the box stands — but a flip of ink a
solid was made from is refused outright rather than rebuilt, and `whyNotFlip` says so.

**The silhouette a scratch is counted against is a convex HULL.** The mesh's vertices are projected and taken
round, so a concave solid's dent is inside it and a scratch through the mouth of a C counts as crossing the C.
Good enough for this rung — erasing is a coarse act and it still takes three crossings — and it is one function
to replace.

**Row 1 is not restricted to the view plane**, and §2.3 does not restrict it either. What is enforced is the
rule that matters: **ink ON a solid's own face is never a scratch — it is a feature**, and neither is the ink a
solid was made from, which is its provenance. In practice the e2e's scratch reads `previous` rather than `view`,
because a straight screen stroke reads much the same on every plane and continuity carries the last one.

**`dup` is not a second solid.** It is a `place` step on the same tree: one tree, two bodies. A copy that can be
moved on its own wants the core door named below.

**The diff is a silhouette, and a silhouette is not a section.** A body with a hollow inside it — a mug, once
there is one — has the same side silhouette as a solid block, so the diff says they match. What P4 compares is
what you would SEE from a plane, which is what a hand drawing a side profile means; a cut-plane section is a
different reading and wants its own row.

**A profile of a solid is read against its whole silhouette, so only the best overlap wins.** Two solids standing
one behind the other across the same view will both be offered and the larger overlap takes it. There is no chip
yet to argue with that reading the way P1's plane chip does — the same shape of problem and the same shape of
answer, and the first thing P4 would grow.

**`Add it` resolves every missing region at once, not one at a time.** The sentence says how many and how much
and the chips name them individually, but the verb takes them together. Regions the hand wants and regions it
does not are not told apart yet.

**The noise floor is one number for both kinds.** A speck of `missing` and a speck of `extra` are dropped at the
same fraction of the drawing's area. The specks that survive an *Add it* are the half-pixel seam between the
region and the body — counted and said out loud, which is honest, but a reader seeing *3 specks dropped as noise*
on a body that matches is being told something about the rasteriser rather than about the drawing.

**A massing is an intersection of extrusions, and nothing else.** Three views that describe a sphere describe, to
this rung, the box they share. That is what plan-elevation-section has always meant; anything rounder is what the
brief is for.

**A hull is blocky, and partial silhouettes under-determine it.** Two parts on a drawing of three towers, measured
and pinned; the *honest limit* section above says what would close it.

**A model is asked one at a time, and only the first seat is asked.** Several models may join and the pane lists
them all, but a brief goes to `models.first()`. The canvas asks every joined model and shows the disagreement; the
shard has one op tree per version and no row to show two proposals side by side yet.

**A regen replaces steps; it does not argue with them.** The scope is the step ids or part ids a name covers, the
brief says which may change, and the reply is built into the hole they left — but nothing checks that what came
back is *about* the same thing. A model that returns a step named `turret` which is in fact a moat gets its moat,
named turret. What protects the drawing is the clip, not the name.

**A real local model stays in the vocabulary and drifts on the words.** qwen3:8b returned valid JSON in the closed
vocabulary first time — five steps, two mirrors, no repair needed — but named its steps `castle_base`,
`turret_front` and `turret_side` rather than reusing the brief's own words, and bound no colour at all. A second run
named them `castle body` and `turret` and bound `grey` and `green`. The brief says *use these exact words*; a small
model reads that as advice. **Reusing an existing name is checked** (the regen's mutable list); **inventing one from
the human's words is not**, and cannot be without the shard deciding what the human meant.

**The derivation is synchronous.** A tree of a dozen booleans derives in a few hundred milliseconds here (qwen3:8b's
five-step castle: 137 ms measured headlessly), and the drawing loop is blocked for that long. Nothing runs in a
worker. A proposal large enough to matter would want one.

**Only one thing a model says is not geometry, and it is a verb.** `parseMeaning` asks which of three verbs a phrase
meant, against the names in play, and refuses anything else. That is the smallest possible opening — but it means
the shard learns a *synonym*, not a new way of acting, and a phrase that means something the three verbs cannot
express stays unread.

**A definition is matched by ONE outline at a time.** The structural signature of the profiles that share a plane is
held (core's own, where it applies) and nothing reads it yet: a single outline drawn again is a group of one, and a
group of one has no links. Matching a GROUP of marks against a definition — which is what the canvas's own
`matchDefinition` does — is the next thing `library.ts` would grow, and it is already the right shape for it.

**The offer is about a SHAPE, so a correction is too.** *Not a mug* rejects every outline like the one corrected, not
the one stroke, which is what makes it worth holding — and it means a hand that wants to reject exactly one drawing
cannot. There is no *only this one* yet, and it is not obvious there should be.

**A placement copies the definition's tree.** Change the mug and the mugs already placed do not change with it: they
hold what the tree was when they were placed. That is the honest shape while a definition is a rep rather than an
artifact (there is nothing to point AT), and it is exactly the gap `dup` ran into.

**A placement is a similarity, so a definition cannot be stretched.** The scale is uniform, from the ratio of the two
outlines' own sizes, so an outline drawn twice as wide as it is tall places a mug that fits the diagonal rather than
filling the rectangle. That is what §2.5 asks for; a non-uniform fit is a different operation and would want its own
word.

**Nothing re-reads what a placed body affords.** A placed mug is a solid like any other — it can be cut, scratched,
mirrored and named — but the outline it stands at is taken into it as provenance, so it is never offered a second
definition. Drawing another outline is how you place another one.

**Row 6 (`path`) is in the table with a comment naming P7.** The op tree declares `sweep`, `loft`, `union` and `along`
and implements none of them — `deriveTree` passes the body through unchanged and marks the solid broken with the row's
own name rather than dropping the step.

**The field is still at the foot of the panel rather than at the pen tip.** P1 has the screen position it needs
(`space.project`, and the chips layer proves it places), so this is the next cheap move rather than a missing piece;
the READER is the part that does not move.

**`space_propose` is held, and nothing takes it up yet.** It lands through `propose()` as an attributed, unblessed rep
with a sentence beside the solid. Answering a brief the human actually typed — `space_answer` — is the path that lands,
and since G3 it lands in the parts contract too. Taking an *unasked* proposal up from the surface is still not built.

**`space_look` reads the log, not the geometry.** It cannot import the shard's TypeScript, so it reports marks, planes,
readings and op trees; it does not compute the form rung, the hull or the parts. G2 puts the parts in the brief, which
is where the hand reads them today. What it would take for `space_look` to see parts itself is not small: a part is
`hull ∩ a run's prism` — a CSG boolean on a derived mesh — so the server would need three.js and `three-bvh-csg` in
Node, and `solid.ts`, `parts.ts` and `form.ts` compiled rather than duplicated. Two honest ways out, neither built:
publish a committed Node bundle of the shard's own modules the way `Demos/metamedium-core.node.mjs` is published for
the canvas, and import it; or have the **tab** put its parts into the room, since the tab has the renderer and already
computes them — a sentence per part beside the solid, which every hand in the room then reads with no geometry at all.
The second is cheaper and fits the rule that the log is the source; the first is what a hand needs to look at a board
nobody has open.

**The hand cannot see.** There is no `space_see`: the canvas's hand renders ink to a PNG, and the shard's marks lie on
planes in space. A picture of the board is the obvious next tool and is not here.

**Ids per hand remain a debt.** Two hands both drawing in one room can number the same node differently. The brief
pairing is immune by construction; a `space_say` aimed at an id read from an out-of-date `space_look` is not.

**Chromium only.** The gate runs one browser; a WebKit smoke is still owed (`../e2e/README.md`).

### Still John's

- **Whether the ink a solid was made from is depth-tested.** The glass, above — now a trade with a measured price
  rather than an untried alternative, and the per-mark reading (profile ink through the body, feature ink on its face)
  is the shape a decision would take.
- **What a hull is when a tower is seen only once.** The honest reading stands (two parts, pinned). The alternative —
  the hull as a *union of masses*, each ⊓ bounded by the footprint rather than by the other claims — gives every tower a
  body at the cost of inventing its depth (a 2.8 u slab across a 6 × 4 plan, measured). A third option is to **ask**: a
  part seen once is a question on the board (*how deep is this?*), a second view or a word answering it.
  `SHARD-3D-PUSH-2.md` §5 says ask.
- **Whether a floating ⊓ is dropped to the ground** (verticals added) or left as an annotation. Built as an annotation,
  with the reason said.
- **Whether the hull stands on the *second* claim** or waits for a footprint. Built on the second.
- **How many exchanges the transcript keeps.** Eight.
- **Whether the MCP seat should be able to *bless*** — name a part outright — or, like the canvas's hand, only propose.
  Built as propose.

## What core would need

Every one of these is a gap the shard worked around rather than a bug, and each is written so it could be landed in
`metamedium-core` with tests (`SHARD-3D-PLAN.md` §11).

- **`measure()` should take the stroke's scale the way `analyzeStroke` does, and name its unit.** It rounds to whole
  units (`r0 = Math.round`) and labels every length `px`, so in plane units a 1.2-unit circle comes back as "radius 1px"
  — the shape rounded away. The shard measures each mark on a copy scaled by `1/scale` and the panel says which space it
  is in.
- **A rep that supersedes**, or an explicit `revise` that re-derives what was derived from the ink. `getRep` returns the
  FIRST rep of a modality, so a reading cannot be revised in place: a mark's readings, fingerprint and maths are all
  computed at `addStroke`, and a second `stroke` rep proposed later is never read. That is why a flip is a new node, and
  it is the same gap as the next one.
- **A rename event, or `wordOf` reading the newest.** `bless` takes a name once and `wordOf` reads the *first* `word`
  rep, so a second name is never seen. The hand's name is held as the shard's own `name` rep, newest first — and a
  definition has the same shape of problem, which is why definitions are reps on the root artifact.
- **`propose()` should not compose a rep's `reasoning` INTO its `data` with a spread.** `{ ...(r.data as object),
  reasoning }` turns a string rep into a map of its own characters: `'plinth'` comes back as `{0:'p',1:'l',…}`. Either
  reject a non-object `data` when `reasoning` is given, or keep the reason beside the data rather than inside it. The
  shard passes an object (`{ text, why }`).
- **A *bless from data*** — an artifact made from a tree, attributed and summon-less, with the membership a bless gives
  it. `bless` needs marks that are still on the CONTENT plane and a made solid's members are not, so there is no way to
  bless a second artifact up from a tree alone; that is why `dup` is a `place` step on the same tree. `session.import`
  gives everything but the name of the act, which is what makes a placement a thing of its own.
- **An `op` kind beside `run` in `kinds.ts`.** Until then the tree is a `json` rep with `// mm:op tree v1` on its first
  line.
- **A signature that knows which plane each mark is on.** A bless computes a signature and union bounds over marks whose
  coordinates are in *different planes*, which is arithmetic on incomparable numbers. Nothing in the shard reads those —
  the form rung measures in world space — but a signature across planes will mean nothing to a group match.
- **The primitive comparison with its weights as an argument.** `matchPrimitiveFromLibrary` divides the corner difference
  by four and does not read `extent` at all, so a plain rectangle scored 0.79 against a mug's outline. It is right for
  what it was written for — a stroke against a user's primitive, where size is evidence and the stroke may be open — and
  wrong for *is this outline that definition*. The weighting is the caller's business, so what would land there is the
  comparison with its weights as an argument, not a second copy of it.

Two notes for the next caller rather than changes:

- **`trace` thins what it is given, so it must be given a BOUNDARY.** Handing core's tracer a filled silhouette returns
  the medial axis of the blob — a spine, not an outline — because thinning is the second of its four steps. The mask's own
  one-pixel boundary is what it wants, and the diff's `outlineOfMask` is the reusable half.
- **Do not hand raw ink to a triangulator.** `simplifyStroke` is already there and is exactly the right tool; 127 walls
  where 9 will do took the e2e from 8 seconds to 136, and the boolean library said so in its own words.

## The fixtures, and the exchanges

**`fixtures/`** holds John's own boards, as **logs** — core's own `encodeLog`, one JSON event per line, the canvas's
format unchanged — so a fixture stands up exactly the drawing it came from and `?fixture=<name>` and *Open…* read the same
bytes. `fixtures/john-2026-09-16-castle-sketch.mm.log` is his first board (the one the demo above drives);
`fixtures/john-2026-09-16-massing.mm.log` is his second (three profiles and a massing at y ∈ [0.97, 3.09], floating where
the profiles are). `node fixtures/make.mjs` writes both: the massing stood up **in Node** through the real session, the
castle sketch **exported from the surface** because its ⊓ lie on view planes and a camera is three.js. The `.json` capture
beside them is provenance, not a board. `fixtures/README.md` has the rest.

**`fixtures/exchanges/`** holds what was sent to a model about a board and what came back, **verbatim and unrepaired**, one
file per model per board: the stub (imperfect on purpose — a colour outside the closed list, a part id the hull does not
have, an op outside the part vocabulary, all three dropped and counted), an *ideal* written by hand as the contract's own
worked example (also the demo's own reply, held against it by `src/demo.test.ts`), and **qwen3:8b through Ollama** on both
boards (42 s, strict JSON first time, both parts named and painted, nothing repaired — and two honest faults in the file's
own `why`). `src/namedparts.test.ts` reads **every** file there as a module, so the contract is pinned against text a model
actually produced and nothing here can quietly drift when the prompt is edited. Still owed: `z-ai/glm-5.3-flash` through
John's own OpenRouter key, which joins by key in the model pane — a key never leaves the device, so no agent can add that
one. `fixtures/exchanges/README.md` says how.

## The e2e, and the gate

`node e2e/run.mjs` from the repo root is the headless gate (`../e2e/README.md`): it starts its own servers on free ports,
opens a **fresh Chromium context per scenario**, loads the harnesses that already exist and awaits the result object each
returns. It does not reimplement them. Pass, fail and **skip** are counted separately; a failed assertion, a harness
exception, an attempted request to a real model, or a page error not on the named allowlist each exit nonzero, with
structured JSON and a screenshot in `e2e/results/`.

Four scenarios: `canvas` (`Demos/session-engine.e2e.js`), and the shard's three — `shard` (`__scenario`, the whole loop),
`demo` (`__demo`, the mug of §9) and `demo2` (`__demo2`, G4's nine beats).

By hand, in the shard's own tab at `http://localhost:5174`:

```js
const src = await fetch('/e2e.js').then(r => r.text());
(0, eval)(src);
__scenario().then(r => window.__R = r);   // the whole loop
__demo().then(r => window.__D = r);       // the mug, §9
__demo2().then(r => window.__D2 = r);     // the castle, G4
```

**The first step clears the board AND parks the camera** — `nav.projection('persp')`, `view('free')` — because every shape
below is stated in a plane's own units and projected through the camera *as it stands*, so a run started after somebody had
driven the compass by hand would read a circle on an edge-on plane as a dot. The board is not the only state a run begins
from; that was found by running it after driving the compass by hand.

Every shape is stated in the plane's own units and projected to a screen path by `__shard.screenFor` — which is what a
person aiming at the ground does, and it means the oblique camera has to un-project it correctly for a step to pass.
`__shard.strokeScreen` dispatches real pointer events on the canvas, so nothing in the e2e can pass by calling the engine
directly.

**The test hook is `window.__shard`**, and it is the same surface the demos drive: `strokeScreen`, `screenFor`,
`screenForWorld`, `choose`, `view`, `orbit`, `pan`, `flipPlane`, `chipFor`, `pinned`, `goToPinned`, `cursor`, `shiftTap`,
`worldPointsOf`, `nav` (`tap`, `home`, `drag`, `projection`, `facing`, `balls`), `bounds`, `viewport`, `state` (marks with
their `plays`, their ranked plane candidates, their plane's origin, the opacity they are drawn at and their pose; the solids,
the selection, the status, the camera), `solids` (the trees, not the meshes), `features`, `diffs`, `rayDown`, `scratchOf`,
`silhouetteOf`, `select`, `field`, `fieldRead`, `undo`, `clear`, `panelText`, `joinStub`, `joinHand`, `models`, `names`,
`definitions`, `matches`, `place`, `correct`, `honours`, `materials`, `cancel`, `brief`, `seedCode`, `exchanges`, `logText`,
`openLog`, `loadFixture`, `standFor`, `parts`, `showPart`, `partOutlined`, `partAt`, `selectedPart`, `selectPart`.

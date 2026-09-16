# Shard 3D — a bounded MetaMedium for making things in space

*Proposed 15 September 2026, on `next-phases`. A shard is the MetaMedium
recipe without the whole canvas: closed vocabularies per rung, plural
readings with reasons, every tier proposes and the human blesses, the log
is the source and everything else is derived. This one is bounded to
making 3D things. It is being built in-house, on its own stack, as a
pitch to Spline — whose new version does text box → 3D, by all
appearances a model writing the geometry — and it will be built whether
or not they take it, because the 3D drawing space is worth learning
about on its own. Nothing here uses or assumes their tool: the point is
the **tower of abstractions** under the model — ink → plane → shape →
what it plays → an op tree → a named definition → a thing placed along a
path — every rung closed, visible and arguable, which a text box has none
of.*

The line the whole plan serves: **a text box is a brief with no geometry
in it; a sketch on a plane is a brief with geometry in it, and the
geometry is an invariant the model must honour.** When the model writes
geometry, it writes into the shard's vocabulary, one rung at a time, and
the human can see and correct each rung. The sketch stays on
the model as the address you revise it through — ink over a thing
addresses the thing (MVP.md §5, in space). A generator that can only make
what the canvas can read makes things the human can argue with on the
same terms as their own sketch.

## 0. What is already here

Nothing in this plan starts from zero. The engine reads a stroke as one of
eight shapes at any scale (`recognition.ts`), draws a confident one clean
(`session/clean.ts`), measures it (`measure.ts`), relates marks to each
other by ratios of their own size (`relate/`), reads a lasso, a taught
command mark and a scratch, holds every reading as an attributed rep, and
replays the whole session from its log. A `run` program renders three.js
in an opaque frame and reports its parts, and `buildGraph3D` already puts
circles and lines in space as spheres and bonds (v10 T6). `image/trace.ts`
turns a bitmap into strokes. `agent.program` writes a program from a brief
that says what can be made here. The e2e drives the real UI with a stub
model. All of it is used below; none of it is forked.

## 1. Invariants (no package may break these)

1. **Ink lies on a plane.** Every stroke is 2D in the coordinates of the
   plane it lies on, so the shape rung, clean forms, the maths, relations
   and the gestures run on it unchanged. There is no free-space stroke.
   The plane is either chosen by the hand or read from the evidence, and
   either way it is a rep on the stroke with a reason.
2. **Every reading is plural and says why.** Which plane, what shape, what
   the mark plays, which wrap, which asset. Ranked above a floor, never
   winner-take-all, the runner-up a tap away.
3. **Ink is never covered.** A solid made from a sketch draws with the
   sketch still on its face, faint. A wrapped stroke keeps its screen ink
   until the wrap is blessed.
4. **The log is the source; the mesh is derived.** A solid is an op tree
   in a closed vocabulary that references the strokes it was made from.
   Undo, versions, the folder and replay come for free. A mesh from a
   generator is data held as a version, attributed, never the truth of
   the thing.
5. **No model writes code that runs in this page.** A model proposes an
   op tree, a wrap, a placement or a mesh — data in the shard's own
   vocabulary — and the shard renders it (the `parseShapes` rule,
   promoted; MVP.md risk #5).
6. **Nothing runs unblessed, and a model is asked only by a deliberate
   act.** Enter on a brief, *regen*, *make 3d* when tier 1 cannot, *turn
   into* when the asset needs fitting. Nothing on draw, nothing on orbit.
7. **Tier 1 first.** A box, a cylinder, a revolve, an extrude, a cut, a
   mirror, a wrap onto a known surface and an instance along a path need
   no model and take no time. The status says when the canvas answered.
8. **Thresholds are about the hand.** Every rule in screen or plane space
   takes the scale the stroke was drawn at; John's own strokes are
   replayed before any threshold is tuned (as in v10 §0).

## 2. The rungs: closed vocabularies

### 2.1 Where a mark lies — the plane

A `plane` rep on every stroke: an origin, a normal, an *up*, and how it
came to be there.

| Source | When | Blessed? |
|---|---|---|
| `chosen` | the gizmo held an axis or a face when the pen went down | yes, by the act |
| `face` | the pen went down on a solid's face with no plane chosen | read |
| `view` | the free camera, nothing chosen, nothing under the pen | read, the default |
| `world` | a ground, front or side plane read from the evidence | read |
| `previous` | the plane of the stroke a moment ago (`recentWindowMs`) | read |

A read plane is scored from evidence, plurally: how well the stroke's
projection reads as a shape on it (the fingerprint's top confidence on
each candidate), how face-on the plane is to the camera (edge-on cannot
be drawn on), whether the ends land on geometry that lies in it, and
continuity with the last strokes. The inspector says it: *on the top face
of box:1 — rectangle 0.88 there, a sliver on the ground*.

### 2.2 The shape rung — unchanged

`line`, `arc`, `triangle`, `rectangle`, `circle`, `arrow`, `text`, `dot`,
from `recognition.ts` on the stroke's plane coordinates, with the scale
the stroke was drawn at (plane units per screen pixel at the pen, which
varies with depth under perspective and is logged per stroke).

### 2.3 What a mark plays in space — the form rung

Shape says *rectangle*; this rung says *profile*. Closed, seven entries,
placed by a table read top to bottom, first match wins, and a mark no row
places is `annotation`, said out loud.

| Row | Shape | Where | Relations | Plays |
|---|---|---|---|---|
| 1 | any | crosses a selection or a solid, open, three crossings | — | `gesture` (erase, the command mark, a lasso — the canvas's own) |
| 2 | closed | on a chosen or world plane | nothing inside it | `profile` — the face a solid grows from |
| 3 | closed | on a solid's face | inside that face | `feature` — a cut or a boss on that face |
| 4 | line | starts on a profile's edge or a solid's edge, leaves its plane | — | `extent` — a dimension along the normal |
| 5 | line | beside a profile, roughly parallel to an edge | near | `axis` — what a profile revolves around |
| 6 | open | on the view plane, crosses a solid's silhouette or lies over it | crossing / inside | `path` — a stroke to wrap onto the thing |
| 7 | text / word | anywhere | near a solid or a path | `label` — a name, or words for *turn into* |
| — | anything else | the view plane | — | `annotation` — a comment, a note pinned to this view, or art |

Row 6 is the one this rung exists for: a spiral drawn around the view of
a tower is a `path` because it crosses the tower's silhouette, and the
field offers *Make it 3D*. A flourish beside the tower that crosses
nothing is `annotation` and stays as art, held with the camera pose it
was drawn at. Row 3 beats row 2 because a circle drawn on a face is a
hole before it is a new solid.

### 2.4 The solid rung — the op tree

A solid is code of kind `op` (a new textual kind beside `run` in
`kinds.ts`): a tree of steps in a closed vocabulary, each step referencing
the strokes it came from, so ink over the result addresses the step and
the stroke at once.

```
extrude(profile, extent)        revolve(profile, axis, sweep)
sweep(profile, path)            loft(profile, profile)
cut(solid, feature, depth)      boss(solid, feature, depth)
union(solid, solid)             mirror(solid, plane)
place(definition, path | pose)  along(definition, path, count | spacing)
mesh(data, from)                — opaque, from a generator, a version not a truth
```

The mesh is derived by replaying the tree in three.js (`ExtrudeGeometry`,
`LatheGeometry`, a tube along a curve; a CSG library for `cut`/`union`,
behind one seam so it can be swapped). The clean form of the profile is
what is extruded, so the solid is exact; the ink stays on the face.

### 2.5 Definitions, instances, and time

A named drawing is a **definition** and definitions are **your assets**.
*vine* is a stem stroke and a few leaf loops drawn flat and named; the
library holds its signature (`session/signature.ts`) so drawing another
one is recognised. A definition is placed in space as flat ink on a
card, extruded thin, or — when it carries an op tree — as its solid.
`along(vine, path)` runs the stem as a tube along the path and places the
leaves by the definition's own relations (a leaf that was *near* the stem
at a third of its length is near it at a third of the path). **Growth is
a clock** (v8: nothing runs unblessed; time is derived): *play* on a vine
grows it along its path from t = 0, the artifact plays in place, and the
board goes on drawing while it does; come back later and it has grown, or
undo and it never did.

### 2.6 Two vocabularies: the closed one and yours

Everything in §2.1–§2.4 is **closed**: it grows only by a release, and
that is what makes a model's output safe to render. Everything you say is
**open and additive**: a noun typed at the header, written beside a
thing or spoken in a brief is a *name*, bound to what it was said about,
held in the log, and a definition from then on. The engine never learns
what a thing is called (the signature rule); it learns that *this* is
called that. Four rules make the open vocabulary conserve rather than
pile up:

1. **The drawing is the extent before it has a name.** Profiles on
   chosen planes with no reading are a massing. Tier 1 stands it up
   first, in the engine's name (`buildStructure` in space: extruded
   profiles, grey, no words), and a brief typed at it — *a castle with
   green turret tops* — fills that massing and cannot leave it. With no
   model the massing *is* the thing, and the status says so.
2. **Names come back on parts.** The model's tree names its steps with
   the brief's own words where they apply (`castle`, `turret`, `top`),
   and a phrase like *green turret tops* returns as a material bound to
   those steps. The brief lists every name already in play, in the
   step's own ids, so a regen reuses *turret* and never invents *tower*
   — the region-id rule pages live by (`describeReading`).
3. **A name said once is a definition thereafter.** Taking the version
   holds *castle* with its tree and *turret* with the sub-tree it named,
   based on the castle (`basedOn`). Typed later, *turret* completes from
   the library before any model is asked (`{"reuse": name}`, v9 S5);
   drawn later, a turret's profile is offered by its signature. The
   binding lives in the log and the library, never in the weights.
4. **Verbs bind to objects by name.** *Make the turrets taller* resolves
   the object by name when nothing is selected, the verb from the closed
   list, and the scope to the steps so named. A phrasing the verb table
   cannot read is asked of a model once, against the closed list, and
   the answer is held as a way of saying that verb (`behave/words.ts`,
   the `teach` pattern) — the hand's way of saying things is learned by
   the log too.

So the shard's answer to *fresh vocabulary* is that there is no such
thing at the engine's rungs and nothing else at yours: a word is a name
the moment it is bound, and it is bound the moment it is said about
something.

## 3. The plane is chosen by the hand, read otherwise

**The gizmo** sits at the world origin or at the selection: three axes,
three plane tiles at their corners (foundation `XZ`, height `XY`, width
`YZ`), and a handle to slide the chosen plane along its normal. Tap a
tile and every stroke until the next tap lies on that plane, blessed by
the act. Hover a solid and its faces light; tap one and it is the plane.
Tap the gizmo's centre, or orbit, and nothing is chosen: the plane is
read, and with nothing under the pen it is the **view plane** at the
depth of the last thing touched.

**View-plane ink has three fates**, and the form rung decides which:

- **A correction in space** when it relates to modelled geometry. A
  stroke that lies over a solid's silhouette is a `path` or a `profile`
  against that view, and the diff (§4) is offered: *the side says there
  is a handle here — add it*. The correction is made in space; the ink
  that asked for it stays on its view.
- **The command and comment layer** when it is a gesture or a label. The
  check across a solid summons it; a scratch erases; a word beside a
  solid names it; an arrow from a word to a face is a note.
- **Art** otherwise. Held with the camera pose it was drawn at, drawn
  faint from other angles, sharp from its own; a tap on a pinned view's
  chip returns the camera to it. The board keeps it forever unless
  erased; nothing is thrown away because the canvas could not read it.

Orbit is two fingers, or the right button, or a held modifier; one
finger and the left button draw. A stroke's plane is fixed at pen-down
and the stroke is projected live so it stays flat; at pen-up the read
planes are re-ranked with the full fingerprint (deferred commitment).

## 4. The diff is the brief

Three canonical profiles — front, top, side — plus any view the hand has
drawn on. For a solid and a plane: render the solid orthographically to a
small buffer, run `trace` to get its silhouette as strokes, and compare
with the ink on that plane. **Where ink lies outside the silhouette,
material is missing; where silhouette lies outside the ink, material is
extra**, both as regions in plane coordinates with their areas. That is
`validateRegions` generalised: the promise that the thing matches the
drawing is checked, not assumed.

Tier 1 resolves the diffs it can: a missing region on a chosen plane is
extruded through the solid's depth on that axis; an extra region is cut.
What tier 1 cannot resolve — a region with no clean depth, a diff across
two views that disagree — is the brief for *regen*: the model gets the
solid's op tree, the profiles, the diff regions and any words, and
proposes a new tree or a mesh. The diff is re-run on the proposal before
it is offered, and the offer says how much of the drawing it honours.

## 5. Wrap, and turn into

**Make it 3D.** A `path` on the view plane is offered *Make it 3D*. The
wrap is a plural reading, ranked by how closely each candidate projects
back onto the drawn stroke:

- **On the surface**: each point raycast from the camera onto the solid;
  the misses beside the silhouette carried at the depth of their nearest
  hit, so a stroke that runs off the edge does not fall into the void.
- **Around an axis**: when the solid's op tree has one (a revolve, an
  extrude along a normal), a helix about it — the stroke that goes left
  of the tower, over it and right of it is a spiral whose far half is
  hidden. This is why the op tree beats a mesh: the tower *knows* it is a
  cylinder. Fitted by pitch and radius offset to the drawn stroke.
- **Flat**: the stroke as a planar curve at the depth of the solid's
  centre, for a stroke that only passes by.

The winner is drawn in space with the screen ink still there until it is
taken; the runner-up is a chip. Taken, the path is an artifact: a curve
on or around the thing, with a length, addressable by ink like any part.

**Turn into.** A path, a profile or a solid selected, the field offers
*Turn into …* from **your own definitions**, ranked by fit — a path
offers what runs along something (a vine, a rope, a row of windows), a
face offers what sits on one (a door, a window), a whole solid offers
what it resembles by signature. The placement is tier 1 (`along` /
`place`); a definition that cannot be placed without a model (a vine
drawn as three unrelated leaves with no stem) asks one, only then, for a
placement in the same vocabulary. A model may also be asked what a path
*could* become and its readings join the row, attributed; nothing is
placed until a human taps.

**Restyle.** A definition's ink is its look: leaves drawn in green ink
are green leaves; a leaf drawn as a closed loop is a thin extruded leaf;
a leaf drawn as a scribble is a card of ink. Style is another
definition: name a hatch pattern *bark* and *turn into bark* wraps it on
a face as a texture traced from the ink. Restyling is a version, held.

## 6. The generator seat

A generator is a participant that proposes in the shard's vocabulary
through the same channel a hand uses. Three seats, one contract:

- **Claude / any chat model** proposes op trees, wraps and placements
  (JSON in the closed vocabulary, repaired never guessed, the `HERE`
  paragraph rewritten for space). This is enough for the whole demo and
  is what ships first.
- **A mesh generator**, if one is ever wanted, proposes a `mesh` step
  from the brief: the profiles as images rendered from the ink (the
  handwriting rule — pixels only where the ink *is* the ground truth),
  the words, and the invariants. The diff checks it like any other
  proposal. This seat exists so the contract is honest about opaque
  output; it is not on the MVP path and no vendor is assumed.
- **The hand** — the bridge participant (`participants/bridge.ts`): the
  question parked, the answer pasted. The honest test of the brief.

The brief (`describeSpace`, the `describeReading` of this shard): the
massing or the solids as op trees with their names, the planes and what
lies on them, the form rung's roles, the diff regions, every name in play
in its step's own id, the definitions the library holds so a model may
answer `{"reuse": "vine"}`, and the words. The reply names its steps
with the brief's words (§2.6) and is repaired, never guessed.

## 7. The surface

`shard-3d/` at the root, in the experiments tier: Vite + TypeScript,
three.js from npm, `metamedium-core` as a workspace dependency, vitest for
the rungs, a browser e2e like the canvas's for the loop. Deps are fine
here; what proves out lands in core with zero of them (§11).

- **Ground and chrome** from `brand/tokens.css`: paper, sea ink, teal
  for readings, the hand's ink colour for strokes and for what is made
  from them. One bar, a control centre, the panel under it — the same
  six components as `Demos/surface/00-ui.js`, ported not forked.
- **The field** at the pen tip, one reader: verbs (`extrude`, `revolve`,
  `cut`, `mirror`, `dup`, `remove`, `name`, `regen`, `make 3d`, `turn
  into`, `play`), names the library knows, `ask:`, `draw:`, `make:`,
  `name:`. Core buttons in fixed slots. *What this is* with numbers;
  *what it affords* ranked by the reading; a pill that asks a model
  carries a dot.
- **Selection by default**: the part the last stroke touched, or the last
  solid made, stands selected with its handles — no loop required. A
  loop, a check, press-and-hold and a tap on a chip all still work.
- **The panel**: the mark, its plane and why, its shape, what it plays,
  the op tree step it belongs to, the maths (a solid's volume and
  bounds are the maths of its tree), *becomes* (ink → profile → solid →
  named → placed along a path).
- **The minimap is a viewcube**: the three canonical views a tap away,
  the pinned views (art) as chips.
- A standalone build (`build-standalone.mjs`, reused) and the shell
  installable, so the demo opens from one file on a phone.

## 8. Packages

Each owns its files, breaks no invariant, and is done when its criterion
runs in the e2e with a stub model. **The MVP line is after P6**: that is
what is pitched. P7–P11 are the obsession, and they are on the same
foundations.

| # | Package | Builds | Done when |
|---|---|---|---|
| P0 | **The space** | Vite + three.js + core; orbit / draw split; the gizmo with three plane tiles and the slide; a stroke projected live onto the chosen plane; the shape rung on plane coordinates with the pen's scale; the panel's *plane* and *reading* rows | draw a rectangle on the foundation and a circle on the height plane; both read as they would on paper; the panel says the plane and why |
| P1 | **Planarity read** | the plane scorer over `face` / `view` / `world` / `previous`; the runner-up chip; deferred re-rank at pen-up; view-plane ink held with a pose | with nothing chosen, a stroke on a box's top reads *face* over *view* with a reason; a stroke beside it reads *view*; a chip flips it and undo drops it |
| P2 | **The form rung and solids** | `form.ts` (the seven-row table); kind `op`; `extrude` and `revolve` from clean profiles with an `extent` or an `axis`; the mesh derived on replay; ink kept on the face; selection by default; the field with the tier 1 verbs | rectangle + a line up from its edge → a box, instantly, attributed to the engine; profile + axis → a revolve; undo removes the solid and leaves the ink |
| P3 | **Features, cuts and the rest of tier 1** | `cut` / `boss` from a closed shape on a face; `mirror`; `dup`; `remove`; a CSG seam with one library behind it | a circle on the box's top → *Cut a hole* / *Raise a boss*, both tier 1; a scratch across a solid erases it (three crossings of its silhouette) |
| P4 | **The diff** | front / top / side profiles; orthographic silhouette via `trace`; missing / extra regions; tier 1 resolution by extrude and cut; the panel's *matches the drawing* row | draw the box's side profile with a bump; the diff names the missing region; *Add it* extrudes it; the diff then reads clean |
| P5 | **The generator seat, and names** | the massing from unnamed profiles (tier 1); `describeSpace` with the names in play; `agent.model(brief)` proposing an op tree with named steps and bound materials; repair; the diff re-run on the proposal; names held on steps and, on taking, as definitions based on the whole; the verb table with name-resolved targets; work shown above the solid; Esc stops it; a failed brief leaves nothing | draw three unnamed profiles; type *a castle with green turret tops*: the massing stands at once in the engine's name, a stub model's tree fills it with steps named `castle` / `turret` / `top` and green bound to the tops, the diff says it honours the profiles; *make the turrets taller* regens those steps alone; typing *turret* afterwards completes from the library |
| P6 | **Names, and the loop in 3D** | a solid named holds a definition with the op tree and the profiles' signatures; drawing the profile again is matched and offers the solid; the standalone build; the two-minute demo in the e2e | save the mug as *mug*; draw its profile elsewhere; *mug 0.8x* is offered and one tap places it |
| — | **MVP line** | | |
| P7 | **Wrap** | `path` on the view plane; the three wrap candidates ranked by reprojection error; the path as an artifact with a length; *Make it 3D* | a spiral drawn around a revolved tower wraps as a helix about its axis; the screen ink stays until taken; the runner-up is a chip |
| P8 | **Turn into** | definitions as assets; `along` and `place`; fit by what a definition affords (runs along / sits on / resembles); leaves placed by their relations; restyle from ink | draw *vine* flat (a stem and three leaves), name it; select the helix; *Turn into vine* runs the stem along it with the leaves where they were drawn to be |
| P9 | **Time** | a clock on a placed definition; growth along the path from t = 0; a playing thing never parked; undo re-derives | *play* on the vine grows it up the tower; orbit while it grows; undo and it is gone |
| P10 | **Restyle, and the mesh seat if wanted** | a named hatch as a texture traced from ink; optionally a mesh generator as a second participant, profiles rendered as images for it | *turn into bark* on a face; if seated, a mesh proposal lands beside the op-tree one, both checked by the diff |
| P11 | **The hand in the room** | the MCP hand with `space_look` / `space_see` / `space_draw` / `space_propose`; the shard as a live room | Claude Code draws a profile on the foundation from the terminal and it stands as a solid in the tab |

Order: P0 → P1 → P2 → P3 → P4 → P5 → P6, then P7 → P8 → P9 in that order,
P10 and P11 in any. Rough weight: P0–P2 a week, P3–P6 a week, P7–P9 a
week, part-time and honest.

## 9. The demo, and the pitch

The two-minute run, as the e2e drives it:

1. Tap the foundation tile. Draw a rectangle. It reads *rectangle 0.9 on
   the foundation, chosen*.
2. Tap the height tile. Draw a line up from a corner. *extent*. A box
   stands. Tier 1, no wait; the panel says so.
3. Orbit. Nothing chosen. Draw a circle on the top. *face, over view,
   because it read circle 0.87 there*. The field: *Cut a hole · Raise a
   boss · Regen this face*. Tap *Cut a hole*.
4. Type *a mug with a wide handle*. The model gets the box as an
   invariant. A version lands, attributed, its steps named `mug` and
   `handle` from your words; the diff says it honours the drawing.
5. Tap the side view. Draw a handle profile off the mug's silhouette.
   The diff: *material missing here*. Type *make the handle wider*: the
   verb resolves *handle* by name and regens that step only. Ask *why*
   at any step.
6. Name it *mug*. Draw a spiral around it in a free view. *Make it 3D*
   wraps it. Draw *vine* flat in the corner, name it, *Turn into vine*,
   *play*. The vine grows up the mug while you orbit.

The pitch page is one screen: the sentence in bold at the top of this
plan, the recording, and three claims each with the step that shows it:
the geometry is an invariant (step 4), ink addresses the thing (step 5),
your own drawings are the assets (step 6). If Spline passes, the page
still says what it says.

## 10. Risks, and the honest gaps

- **Drawing on a scene with a mouse is hard.** The gizmo is the mitigation
  and it is deliberate; the read plane is for when the hand did not
  choose. Tune against John's strokes replayed from the log, nothing
  synthetic.
- **CSG is fragile on messy input.** One seam, one library, and `cut`
  may ship as *regen* if the library disappoints; the tree still records
  the intent.
- **The wrap's "closest perspective match" is a fit, not a fact.** It is
  offered plurally with its error, never auto-taken.
- **A generative mesh has no op tree.** A `mesh` step is opaque: no axis
  to wrap around, no faces to cut. The diff still checks it, and a mesh
  that honours the drawing can be *traced back* into a tree by a model
  later — noted, not built.
- **Ids per hand** (v10 D8) applies here unchanged; P11 waits on it or
  works around it as the canvas does.
- **Scale under perspective.** The hand's resolution is in screen pixels
  and a plane far from the camera makes a small stroke; the per-stroke
  scale handles it, but a plane near edge-on distorts the fingerprint
  and the scorer must say *too oblique to read* rather than guess.

## 11. What feeds back to core

Each of these lands in `metamedium-core` with tests, with no dependency,
when the shard proves it: the `plane` rep and the planarity scorer
(planes are 2D once the plane is known, so the scorer is pure geometry);
the form rung's table as a second closed role table beside the diagram
rung; the `op` kind and its vocabulary; **the diff as the brief**
(`validateRegions` generalised to any projection); wrap candidates as a
plural reading; `along` / `place` as the placement of a definition by its
own relations. The shard then imports them and deletes its copies, per
`EXPERIMENTS.md`.

## 12. Still John's

- Whether art on the view plane is drawn faint from other angles or not
  at all until its view is returned to.
- The gizmo's look: axes at the origin, at the selection, or both.
- Whether *turn into* ranks by fit alone or also by use, as the field's
  pills do.
- Whether a mesh generator is ever seated at all, or the shard stays
  op-trees only — which is the cleaner story.

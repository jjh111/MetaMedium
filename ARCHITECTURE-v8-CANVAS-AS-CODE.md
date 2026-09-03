# Architecture v8 — The Canvas as Code

**Date:** 2 September 2026 · **Status:** proposal
**Builds on:** `ARCHITECTURE-v6-SESSION-ENGINE.md` (the log), `KEYFRAMES.md` (the
rungs), `MVP.md` (living artifacts), `ARCHITECTURE-v7-PARTICIPANTS-AND-TIERS.md`
**Worked example:** the fish canvas from johnhanacek.com, rebuilt from primitives
**Part II (§11–20):** the folder as the canvas, three views, selection, frames
literal and virtual, the blob palette, images, deployment

---

## 0. The example, told as a session

Draw a rough lump with a few fronds. Circle it, cross it with your mark, name
it **coral**. Write beside it *fish hide here*. Draw a fish — a loop with a
triangle tail — name it **fish**, write *swims toward food, flees anything
bigger, hides in coral*. Draw a dot, name it **food**. Draw four more fish and
three more corals; each is matched to what you named. Press **play**. The fish
swim. Drop a dot: they turn. Draw a wall across the tank: they route around it.
Press **pause**; everything holds where it is; the panel shows one fish's
behaviour as a short program, with the words you wrote beside it. Cross out
*flees anything bigger* and the big fish stops being avoided. Draw a jellyfish,
name it, write *drifts up, and stings* — and the model turns that into a
behaviour in the same vocabulary, which you can read, argue with, and edit.

Export. You get a folder:

```
aquarium/
  canvas.json        the log — every mark, name, behaviour, in order
  coral.js           what a coral does
  fish.js            what a fish does
  food.js
  jellyfish.js
  world.json         the tank: instances, positions, the seed
  index.html         runs it, standalone, no MetaMedium needed
```

Edit `fish.js` in a text editor, import the folder, and the fish on the
canvas swim the new way. That round trip is the test of whether the canvas
is code or merely produces it.

---

## 1. The principle

**The canvas is a program. The log is its source. Everything else is
derived.**

Most of this is already true. State is a pure function of the event log
(v6); a recording replays anywhere with no model attached (`session.load`);
an artifact carries `code` and renders as real DOM inside the ink it was drawn
in (MVP); ink over that DOM addresses its regions; a model takes part only by
writing events through the same channel a hand uses (v7). What v8 adds is
**time**, **behaviour**, **instances**, **nesting**, and **kinds of code
beyond a page** — and one rule that keeps the whole thing from becoming a
game engine with a drawing tool bolted on:

> **Simulation state is derived, never logged.** The log holds definitions,
> behaviours, instances, and *time control* (play, pause, seek, seed). Where
> every fish is at second 41 is computed from those, deterministically, from
> the seed. It is never written down. Pause is "stop advancing t"; scrubbing
> is replay; undo works on the program, not on the fish.

That is what makes the aquarium a *figure* in the sense of the whitepaper
plan (§2, replays-as-figures) rather than a recording of one: the reader
gets the program, and the program runs.

The tension John named — *the whole canvas should be code, and contain nested
sub-code* — resolves the same way at every level. The root canvas is a
module. An artifact is a module. An artifact's parts are modules or data.
Each module renders as something ink can address. The annotation layer *is*
the code: a name is an export, a behaviour is a function, a drawn instance is
a constructor call, a written note beside a fish is a docstring the model can
compile.

---

## 2. What exists, and what is missing

| Already in the engine | What v8 needs |
|---|---|
| Event log; replay; `load(events)` | `play` / `pause` / `seek` / `seed` events; a clock; `state.time` |
| Artifacts: blessed groups with a signature and a name | **Definitions vs instances** as a first-class distinction (today every match is another artifact with an `instance-of` edge, and nothing shares code) |
| `code` rep, `language: 'html'`, rendered in an iframe | Code reps of kind `js` (a behaviour), `json` (data), later `svg`, `md`; a **runtime** for `js` |
| Regions: ink addresses a page's elements | **Render for addressing**, generalised: a program's functions, a datum's keys, a simulation's instances |
| Signature = type histogram (`3×circle + 2×line`) | **Structural signatures** (shape + relations), so fish and coral do not collide, and a *correction* channel |
| `agent.generate`: engine owns layout, model writes content | `agent.behave`: engine owns the **behaviour vocabulary**, model translates words into it |
| The command mark, the palette, no modes | Play/pause as *events*, not a mode; a running canvas still takes ink |

Nothing here needs a new channel. A behaviour is a rep; an instance is an
edge; time control is four event types; the runtime reads state and writes
nothing back.

---

## 3. The fourth rung: what a mark DOES

KEYFRAMES.md gave every mark three rungs — shape, what it plays, what it
becomes — each a **closed vocabulary**, each mapped to the next by a table.
Behaviour is the fourth rung, and it gets the same treatment. Not "the model
writes some JavaScript": a closed set of **steering verbs**, composed with
weights, targeted by *name*. That is exactly the model the fish engine
already implements (small fish flee and home in coral, medium fish school,
large fish hold territory, everything seeks food), and it is Reynolds' 1987
steering model, which has been the right abstraction for thirty years.

**The verbs** (first draft, deliberately small):

| Verb | Reads | Needs |
|---|---|---|
| `wander` | drift with a heading that turns slowly | — |
| `seek(name)` | move toward the nearest instance named *name* | a target |
| `flee(name, pred?)` | away from the nearest *name*, optionally only those `bigger`, `faster` | a target |
| `home(name)` | idle near an instance named *name*; return to it when far | a target |
| `school(name)` | align and cohere with others named *name*, keep spacing | a target |
| `hold(radius)` | stay within a radius of where you started; challenge others | — |
| `avoid(walls)` | slide along anything that is a wall | — |
| `consume(name)` | on contact with *name*, remove it (and grow, optionally) | a target |
| `spawn(name, every)` | emit an instance of *name* on an interval | a target |
| `drift(direction)` | a constant push — bubbles rise, food sinks | — |
| `expire(after)` | remove yourself after a time or on contact | — |

A **behaviour** is a list of `(verb, target, weight, params)`. The engine sums
the steering forces, clamps by the instance's speed, applies wall physics
(lifted from `fish-engine.js`: lookahead slide steering, hard containment
that redirects rather than zeroes, sustained-contact disengage), and moves.
Every verb carries its `reasoning` like every reading does: *fleeing fish:3
(bigger, 84px away)*.

**What "size" means.** The fish engine's three classes come from bounding-box
width against two thresholds. Here `bigger` and `smaller` are ratios of the
instances' own bounds — the same rule every relation in the engine follows —
so a coral is bigger than a fish because it was drawn bigger, not because a
constant says so.

**Where the words go.** The human writes *swims toward food, flees anything
bigger, hides in coral* beside the fish. Tier 0 reads the writing as a label
(v7 Stage E gives its text). `agent.behave(definitionId)` hands a model the
definition's name, the text, the names that exist on the canvas, and the
verb table — and asks for a composition in that vocabulary and nothing else,
exactly as `agent.draw` asks for shapes in the shape rung's vocabulary.
`parseBehaviour` drops anything outside the table. The model's reply is held
as a `behaviour` rep, attributed, unblessed, beside the words it came from.
The palette offers it: *Give it this behaviour · llm:qwen3:8b — seek food,
flee bigger fish, home coral*. Blessing makes it run.

**The escape hatch.** A `behaviour` rep may instead carry `language: 'js'`
and a module with one export, `steer(self, world, dt) → {fx, fy, events}`.
The table is the common case and the honest one — it can be read without
knowing JavaScript — but a canvas that could only do what its verbs allow
would be a toy. Hand-written or model-written JS runs in the same sandbox
(§4) under the same contract, and is rendered as source so ink can address
its functions (§6). The verb table is itself expressible in that contract;
the engine ships it as `steering.js`, which is what the export writes.

---

## 4. Time

**Events:** `play`, `pause`, `seek(t)`, `seed(n)`. `state.time` is the
canvas's clock in seconds of simulation, advanced by the surface's frame loop
while playing and by nothing else. A running canvas is not a mode: ink still
lands, is read, gets named, and if it matches a definition it joins the
simulation on the next frame.

**Determinism.** Every source of randomness (wander headings, spawn jitter)
draws from a PRNG seeded by the `seed` event and advanced in a fixed order
(instances in creation order, verbs in table order). Fixed-step integration,
`dt = 1/60`, with the frame loop accumulating real time and stepping as many
fixed steps as it owes. So `load(events)` + `seek(41)` puts every fish where
it was at second 41, on any machine. That is the property the whitepaper's
figures rest on, and the property that makes *undo* meaningful: undo removes
a behaviour or an instance from the program, and the simulation is
re-derived from t = 0 — visibly, if the surface animates the re-derivation,
which it should.

**The world model.** Each step, behaviours see a plain snapshot:

```
world = {
  t, dt,
  me:    { id, name, x, y, vx, vy, w, h, heading, age, state },
  others:[{ id, name, x, y, vx, vy, w, h, dist, bigger, smaller }],  // sorted by dist
  walls: [{ points, closed }],        // every mark whose definition is a wall, plus the tank
  named: (name) => others.filter(o => o.name === name),
  rng:   () => number,                 // the seeded stream
}
```

No DOM, no session, no engine. Behaviours return forces and intents; the
engine applies them. That is what makes them safe to run in a **Web
Worker** — `js` behaviours never touch the page — and what makes the same
`steering.js` run in the exported `index.html` with no MetaMedium present.

**Rendering.** An instance is drawn as its definition's ink (the clean form
if the definition was snapped, the raw stroke otherwise) translated to the
instance's position and rotated to its heading, tinted by the participant
who drew it. The fish engine's translucent line-art bodies are the right
look and the right principle: the thing that swims is *the drawing*, not a
sprite the drawing was replaced by. A frond of coral drawn wobbly stays
wobbly in the tank.

**Performance.** The fish engine caps at 2 large, 6 medium, and n small fish
and is comfortable; steering is O(n²) in the naive form and n here is tens,
not thousands. The worker gets the snapshot by structured clone once per
step; instances beyond a few hundred would want a grid, which is a later
problem and a known one.

---

## 5. Definitions and instances

Today, naming a group makes an artifact with a signature, and drawing a group
with the same signature makes *another artifact* with an `instance-of` edge
to the first. That was enough for "molecule?"; it is not enough for "these
five are fish and share what a fish does."

**A definition** is a blessed artifact that carries: its ink (the parts), a
signature, a name, optionally a `behaviour` rep, optionally a `json` rep of
parameters (speed, size class thresholds, colour), and a `role` in the
simulation: `body` (it moves), `wall` (it blocks), `field` (it is a place —
coral, a home), `item` (food, consumed), `inert` (decoration). The role is
inferred from the behaviour (a thing with `home` targets is a field; a thing
nothing targets and that has no verbs is inert) and can be set by hand.

**An instance** is a node with `instance-of → definition`, a position (the
bounds it was drawn at), and *state*: a `json` rep the runtime owns
(velocity, heading, age, whatever the behaviour keeps). Instances share the
definition's code by reference. Drawing a matching group *is* the
constructor call. Erasing an instance removes it from the tank; erasing a
definition asks (the palette: *5 fish depend on this*).

**The definition's own ink is the first instance.** The fish you drew and
named is also a fish in the tank. This is the Smalltalk answer and it keeps
the canvas honest: there is no "class" floating off-canvas.

**Structural signatures.** The current signature is a type histogram, and a
coral drawn as a circle with two lines and a fish drawn as a circle with a
triangle touching it are different histograms only by luck. The signature
grows to include the **diagram rung**: shapes *and* the engaging relations
among them, as a small canonical graph (`circle —touching— triangle`,
`circle —contains— line ×2`). Matching becomes graph similarity with a
threshold, reported with reasoning, held plurally — a group can be *fish
0.8 / jellyfish 0.5* and the palette says so. **Corrections are events**: *no,
that is coral* (`correct(instanceId, definitionId)`) adds the group's
signature to coral's accepted set and to fish's rejected set, so the match
rule is learned from the human's answers rather than tuned in code. That is
the negotiation paradigm applied to the library, and it is what "parsed into
a matching that can be iterated on" means concretely.

---

## 6. Nesting and kinds of code

**An artifact may hold artifacts.** The tank is an artifact (a container,
drawn as a box) whose contents are fish, coral, food. Its code is the world:
a `json` rep listing instances and the seed, and a `js` rep that is the
runtime harness. A fish is an artifact whose code is its behaviour. A page
(MVP) is an artifact whose code is HTML. **Containment is scope**: a
behaviour sees the instances inside its own tank; two tanks on one canvas
are two worlds; the root canvas is the outermost tank.

**Kinds of code** are the `language` of a `code` rep: `html` (renders as a
page), `js` (runs as a module under a contract: `steer` for bodies, `render`
for custom drawing, `update` for anything else), `json` (data; renders as a
tree), `svg`, `md`. The kinds are a closed set with a renderer and an
addressing scheme each. A kind with no renderer is not a kind.

**Render for addressing.** MVP's rule — the drawn boxes ARE the outlines of
the divs — generalises: *every artifact renders as something ink can
address*, and what the ink lands on is what a prompt changes.

| Kind | Renders as | Ink lands on |
|---|---|---|
| `html` | the page, in the ink's frame | regions (elements) — built |
| `js` | its source, function by function, in the ink's frame | a function; a line |
| `json` | its keys, indented | a key |
| simulation | the running tank | an instance; a wall; a spot (a place to spawn) |

So: circle the `flee` clause in a fish's behaviour and write *only from
sharks* — the mark lands on that clause, the model revises that clause, the
engine validates it is still in the vocabulary, the fish change on the next
frame. The same gesture, the same contract, the same "only what the ink
addressed changes" promise as revising a region of a page.

**The whole canvas is the root module.** `canvas.json` is the log. Every
artifact is a file. Export walks the containment tree and writes a folder;
import reads a folder and emits the events that would have produced it
(a file's content becomes a `code` event on an artifact whose parts are
reconstructed from the exported ink). The round trip is a test in core.

---

## 7. What the model is for, and what it is not

The engine owns: the verbs, the physics, the clock, the sandbox, the
signature, the export. A model is asked for exactly two things, both through
`propose`:

1. **Words into the vocabulary.** *swims toward food, flees anything bigger*
   → `[seek food 1.0, flee fish(bigger) 1.4]`. Small models can do this; the
   table is short and the reply is checked. The MVP found that asking a model
   for less — content, not layout — made an 8B model enough. Same here.
2. **A behaviour the vocabulary cannot say.** *stings whatever touches it,
   then retreats* → a `js` module under the `steer` contract. Rarer, and held
   as code the human can read.

The model never moves a fish. It never sees a frame. Tier 0 runs the tank.
That is the whitepaper's claim in its sharpest form: the intelligence in the
canvas is *code*, inspectable and deterministic; the model is a translator
between the human's words and that code, and it proposes, never commits.

---

## 8. Stages

Each shippable alone, each with a criterion, each on the reference surface.

**A. Time.** `play`/`pause`/`seek`/`seed`; `state.time`; instances with
runtime state; a built-in `wander` for any named body; the fixed-step loop;
determinism test (`load` + `seek(41)` twice gives the same positions).
*Criterion:* name a loop "fish", draw three more, press play: four fish
drift; pause holds them; undo the third and the tank re-derives.

**B. The verbs.** The steering table in core (`src/behave/steering.ts`),
wall physics ported from `fish-engine.js` with its tests, roles inferred,
the world snapshot, the worker. *Criterion:* fish seek food and flee bigger
fish with behaviours set from the palette (no model yet); walls drawn as
boxes are avoided.

**C. Words into verbs.** `agent.behave`; `parseBehaviour`; the label's
transcript as the brief; the palette's *Give it this behaviour*; the
behaviour rendered beside the definition with each verb's reasoning live
(*fleeing fish:3, bigger, 84px*). *Criterion:* write *hides in coral* beside
a fish and it does, with a local model.

**D. Iteration.** Structural signatures; `correct` events; plural matches in
the palette; the definition's ink as its first instance; erase semantics.
*Criterion:* coral and fish drawn similarly are told apart after one
correction, and the panel says why.

**E. Nesting and kinds.** `js` and `json` code reps with renderers; render
for addressing on a behaviour's source; containment as scope; two tanks on
one canvas. *Criterion:* circle a clause of a behaviour, write a change, only
that clause changes.

**F. Export and import.** The folder; the standalone `index.html` with
`steering.js`; the round-trip test. *Criterion:* export, edit `fish.js` in a
text editor, import, the fish swim the new way.

**G. The fish canvas, rebuilt.** Coral, fish (three size classes as three
definitions or one with a `json` size parameter), food, bubbles, jellyfish,
walls, a maze — the personal site's design.html scenario on the engine. This
is the whitepaper's demo 6, and it is the one that makes the paradigm
legible: a program you drew, running, that you can pause and argue with.

A–C are the paradigm; D–F make it a tool; G is the proof.

---

## 9. What this changes, and what it does not

- **v6's invariants hold.** Ink is never destroyed; nothing commits without
  a blessing; every claim carries reasoning; the log is the truth. Time
  control is four more events; the simulation is a derived view like the
  rendered page is.
- **KEYFRAMES gains a rung**, and the rung is a closed vocabulary with a
  table, like the other three. The table is the steering model the fish
  engine already embodies.
- **The MVP's contract generalises** rather than being replaced: *the engine
  owns structure, the model owns content* becomes *the engine owns the
  vocabulary and the runtime, the model owns the translation*.
- **The personal site's fish engine is the reference implementation** for
  stage B's physics and stage G's look, not a dependency: it is 7,000 lines
  of one page's script, and what v8 takes from it is the behaviours it
  proved and the wall physics it got right, ported with tests.
- **Not in v8:** multiplayer, 3D, a general-purpose language on the canvas.
  The verbs are for things that move in a plane. That is enough to rebuild
  the fish, and enough to find out whether "the canvas is code" holds up
  when the code has to run.

---

## 10. Decisions for John

- **The verb table.** Is the draft in §3 the right first vocabulary, or should
  it start from the fish engine's actual state machine (`idle`, `exploring`,
  `returning`, `coral_deep`, `coral_edge`, `rim_patrol`, `hunt`) and
  generalise from there?
- **Determinism versus liveliness.** A seeded tank is replayable and
  undoable; the personal site's tank reacts to the cursor and to real time.
  Both can coexist (the cursor is an instance the human drives), but the
  default matters for the paper's figures.
- **JS on the canvas.** Stage E renders a behaviour's source for ink to
  address. That is the point where the canvas visibly becomes a code editor.
  Is that the paradigm, or should code stay behind the verbs until the verbs
  run out?
- **Where it lives.** The reference surface, or a new `Demos/tank.html` that
  is the fish canvas and nothing else? The plan assumes the reference
  surface, so that a page, a diagram and a tank can share one canvas.

---

# Part II — The folder, the views, frames, selection, the palette

*Added 3 September 2026, after John's answers to §10 and a look at the
review canvas in `jh-deng-template`. Part I is the fish; Part II is the rest
of the paradigm the fish sits inside.*

## 11. The folder is the canvas

Nothing is invented. A canvas is a folder. Every file of a known kind
(`html`, `js`, `json`, `svg`, `png`/`jpg`, `md`, later `csv`) is an artifact
with a renderer and an addressing scheme; a subfolder is a sub-canvas; the
ink log is `canvas.json` beside the files. If MetaMedium vanished, the folder
would still be a website, some scripts, some data, and a pile of drawings.

The review canvas (`jh-deng-template/index.html`) is the precedent, and it
solved the hard parts for one file kind and one activity: discovery of a
repo's HTML into cards; three views over the same state; per-reviewer JSON
that lives in git; a storage seam with three backends (static read-only on
Pages, File System Access in Chrome, a cloud adapter later); an agent
contract in which the agent **never writes the human's file** and answers
through a side file with stable ids; and a loading budget that keeps forty
live iframes from bringing the tab down. MetaMedium absorbs those ideas and
none of that code. The review canvas stays as it is: a record of the
workflow before this one — generate by chat, then review in a bounded grid.
MetaMedium is the same workflow with the model at the pen tip, unbounded, and
the safety has to come with it.

**One log per participant.** The side-file pattern generalises into the
sync model. Each participant — each person, each machine, each agent —
appends to its own log file: `canvas/john.json`, `canvas/john-laptop.json`,
`canvas/qwen.json`. The canvas is the *merge*: every event is already
attributed and timestamped, state is a pure function of the merged log, and
nobody ever writes anyone else's file. Git carries the files between
machines with no locks and no merge conflicts, because two people never
touch the same file. A model's proposals are, literally, its own file.

## 12. Loading conservation and safety

The point of the canvas is to let one person craft the kind of complexity
the review canvas had to be hardened against. So the hardening is part of
the design, not a patch:

- **A budget of live artifacts.** Only the nearest N render live (iframes,
  workers, simulations); the rest show their last snapshot, a PNG the
  renderer took when it was last live. Panning swaps them. The budget is a
  preference and the status line says what is live.
- **Snapshots as checkpoints.** A log of ten thousand events must not replay
  from zero on every undo. The engine checkpoints state every K events and
  replays from the nearest checkpoint; `load(events)` and `seek` use them.
  Checkpoints are derived, never stored in the log.
- **Nothing runs by default.** Pages keep `allow-same-origin` and no scripts
  (the MVP's sandbox). A `js` artifact runs in a worker under a contract,
  with a time slice, and only after the human blessed it. An artifact that
  throws is marked broken, shows its snapshot, and says so; it never takes
  the board with it.
- **The log is saved as it grows.** Autosave to the folder handle when there
  is one, to browser storage when there is not, after every event. A crash
  loses nothing; reload replays.
- **Memory has a ceiling and the surface says when it is near.** Strokes are
  bounded (500 points), artifacts are bounded (100 per folder before the
  surface asks you to make a subfolder), images are downsampled on import and
  the original kept as a file, not in the log.

## 13. Three views, one log

- **Canvas** — the pure form: an infinite plane, ink and artifacts at their
  drawn positions. Where things are made.
- **Grid** — every frame, page and item surfaced explicitly, as cards, in a
  structure: by folder, by kind, by recency, by name. Sortable, filterable,
  reorderable; the order is a `json` beside the log. Where things are found
  without panning forever, and where remixes start: pick cards, and the
  selection they form is a selection like any other.
- **Focus** — one artifact full-screen, ink addressing its regions, prev and
  next through the grid's order.

They are lenses over the same log, never states of their own; ink drawn in
any of them is the same ink. A frame made in the grid appears on the canvas
where its members were.

## 14. Selection

The lasso, crossed with the mark or taken up from the chip, **becomes** the
selection. The loop dissolves as ink; in its place is a soft outline hugging
the marks, with handles. Drag moves them (the same `transform` reps tidy
writes, so undo springs them back); handles scale and rotate; the palette
blooms at the pen. It is not a mode: the next stroke drawn elsewhere
dissolves it, and drawing over the selected marks addresses them.

**Being selected is in the log.** `select(ids)` and `deselect` are events, so
undo after a deselect brings the selection back without moving anything, and
a replay shows what was selected when.

**The dead state.** A tap while something is dismissable — a selection, a
held loop, a palette — is consumed as the dismissal and never becomes a dot.
Only a tap on empty ground with nothing to dismiss is a dot. That is the
one place a stroke's meaning depends on state, and it is the state the human
just made and can see.

## 15. Frames, literal and virtual

A **frame** is a named definition whose code maps a selection to an
artifact. Behaviours (Part I) are frames whose code is steering; modules are
frames used as slots in pages; the SNA-diagram-to-table mapper is a frame
whose code is a transform. One mechanism, three kinds of code.

**Literal frames** are folders: `library/sna/` holds the frame's ink, its
structural signature, its code, and its parameters. **Virtual frames** are
made on the canvas from whatever is there: grab a `js` blob, some text, draw
a slider, circle it all, *make frame*. The engine reads the members'
interfaces — a script's exports and parameters, a control's value, a text's
words, a page's slots — and the palette offers the **connections**: *slider
→ speed*, *text → title*. A drawn slider is itself an artifact of kind
`control`, the first of the drawn UI elements, with a value and a range.
Connections are `json`; the frame's harness is `js` the engine writes.

Virtual frames **reference** their members wherever they live, across
folders, by id and path; nothing is copied. **Escalating** a virtual frame to
a literal folder copies its members in, so the folder is self-contained (the
question of a prime object shared by reference across folders is deferred,
and named as deferred). **Export** collapses a virtual frame to the most
portable artifact its functions allow: a single HTML page bundling its
script, its data, and its controls, that runs anywhere.

**Conjuring.** Doodle something diagram-like, write *sna* beside it, select:
the palette offers the frame by name (the transcript matches) and by
resemblance (the structural signature matches), ranked together, attributed
to why. Taking it applies the frame's code to the selection. The name is
what conserves the symbol across sessions and machines, because the frame
is a folder and git carries it.

## 16. The blob palette

A palette is for artists. This is bio-inspired packing at the pen tip: the
two most likely verbs nearest the cursor, then four around them, then eight,
each ring further out and smaller, growing as the pen dwells. Likelihood is
the scope's reading times learned use — a mark under the pen puts its own
verbs first, a selection puts group verbs first, empty ground puts board
verbs first; a counts file in the folder learns which you take. Every verb
in §"affordances" of the earlier discussion is reachable in the packing; no
drill-down, only rings. Typing filters all of it fuzzily; text that matches
nothing is a prompt on the scope; handwriting replaces typing when it can.
The scope is drawn as a soft outline before anything is taken, so a wrong
guess is visible first.

**Text is an element.** A written word that stays ink cannot be a heading.
A `text` artifact kind with a real editor — caret, selection, styles — is a
prerequisite for pages, frames and the palette's own free text, and it is
drawn on the canvas like everything else: a box, then type or write into it.

## 17. Images and pastiche

Import keeps both representations: the raster as an `image` artifact (the
file stays in the folder; the log holds the reference), and traced strokes
as marks that enter through `addStroke` and get everything a pen stroke
gets — fingerprint, readings, relations, snap, names. A photographed sketch
of boxes and an arrow is a page the engine can build. Handwriting on paper is
read like handwriting on screen. For photographs of the world, SAM on request:
a segment becomes an `image` artifact with a cutout, and cutouts are things —
selected, moved, named, recombined, composed into pages. Direct SVG import
is the same path with the tracing skipped.

Export is the kinds list read backwards, one verb with a kind: the board as
SVG or PNG; a page as HTML; a behaviour as JS; a frame as its portable
bundle; the session as its log; the folder as itself.

## 18. Deployment

The review canvas's three backends, adopted: a static deploy (GitHub Pages)
is read-only and shows everything; a Chrome session with a folder handle
edits and autosaves; git carries the per-participant logs between machines.
A PWA install makes it an app that opens a folder. A git-backed adapter
later (the GitHub API, or a small function on Cloudflare) lets a phone or a
browser without folder access append to its own log file directly. Opening
MetaMedium at the head of the GitHub folder is then: discovery walks the
repos, each is a card, each opens into its own canvas, and the ink you leave
in any of them is a file in that repo.

## 19. Stages for Part II

Each shippable alone, each on the reference surface, each with a criterion.

**S1. Selection.** Lasso-into-selection with handles; drag, scale, rotate as
transform reps; `select`/`deselect` events; the dead state for taps.
*Criterion:* circle three boxes, take the chip, drag them across the board,
tap off, undo the tap-off, and they are selected again where they are.

**S2. The blob palette.** Rings from the pen tip; scope ranking; learned
use; fuzzy text; free text to the model. *Criterion:* every verb the surface
has is reachable within two rings from a mark, a selection, or empty ground.

**S3. Text as an element.** The `text` kind with an editor; a written word
converts to it on request. *Criterion:* a page's heading can be typed on the
canvas and revised in place.

**S4. The folder.** Discovery, per-participant logs and the merge, autosave,
the storage seam with static and folder backends, grid and focus views, the
live budget with snapshots, checkpoints. *Criterion:* open this repository as
a canvas; its demos are cards; ink drawn on one is a file in `Demos/`; a
second machine sees it after a pull.

**S5. Frames.** Literal frames as folders; virtual frames from a selection
with connections offered; the `control` kind (a drawn slider); escalate to a
folder; export to a bundle; conjure by name and by resemblance.
*Criterion:* the SNA example — a frame built once is offered later to a
doodle labelled *sna*, and applying it yields the table.

**S6. Images.** Import with tracing; SVG import; export kinds. Then SAM on
request. *Criterion:* a phone photo of a paper sketch of boxes becomes a
page inside its own ink.

**S7. Deploy.** PWA; the git-backed adapter. *Criterion:* draw on a phone,
see it on the desktop after a pull, with no folder handle on the phone.

Part I's stages A–G and Part II's S1–S7 interleave: S1 and S2 first, since
every later stage is used through them; then A (time) and S4 (the folder),
which are independent; then the rest as the demos demand.

## 20. Decisions, answered and open

Answered by John, 3 Sep 2026: one surface — MetaMedium absorbs the review
canvas's ideas and stays this codebase; frames are named definitions whose
code maps a selection to an artifact, literal and virtual; selection is
transient, with undo that brings it back in place, and taps that dismiss are
never dots.

The four that were open — the verb table's starting point, determinism
versus a live tank, whether behaviour source is rendered for ink, and the
prime-object question — are taken in §21.

## 21. Decisions taken, 3 September 2026

**1. Behaviours are a general basis with tunables, never hard-coded per
thing.** A "fish" is not a class; it is a remix of essential affordances —
verbs with weights and parameters — that anything can use. Parsing maps what
the human wrote onto the verbs that exist; where the words outrun the verbs,
the gap is named and filled in turns. And new behaviours are **teachable by
acting them out**: select the fish, drag it the way it should move among the
named things on the board, and the engine fits the demonstration.

This is the mechanism the decision hands us. The verb table is a *basis*.
A demonstrated path, sampled against the world at each moment (where the
food was, where the bigger fish was, where the coral was), gives an
acceleration at each step; the weights that best reproduce those
accelerations from the basis are a least-squares fit. The fit *is* the
behaviour, with each weight's contribution as its reasoning ("flee bigger
fish explains 61% of what you showed me"). The residual — the part of the
demonstration no verb explains — is exactly "what's missing", and it is
what the palette asks about next: name it, describe it, or let a model
propose a verb for it in the `js` escape hatch. Voice enters the same door
as handwriting: a transcript is words, and words go to the verbs.

**2. The canvas is always live; time belongs to items.** MetaMedium is its
state, not a movie. It can *contain* movies. So there is no global clock to
scrub; the board is always on. Temporal artifacts — a tank, an animation, a
simulation — each own a clock with play, pause and reset, and each is
seeded so that reset is exact and replay from the log reproduces it. The
log is the source and git's concern; the live state is the image and the
human's concern; both are real, and the second is a pure function of the
first plus the clocks. The cursor is an instance for any item that wants
it. Part I's `seek` is per item, not per canvas.

**3. You see the code, at every level of abstraction, on inspection.** The
essence of the medium. Inspecting anything walks a ladder of
representations: for a mark, ink → shape → what it plays → what it became
(built); for a behaviour, the words → the verbs as **sliders for the
tunables** → a **control-flow diagram** → the **source** as ground. Any rung
can be edited, and edits flow both ways: move a slider and the source
changes; circle a line of source and the slider moves. Inspect a frame and
you see its members' code combined as one program; inspect a selection and
you see the same for what is selected; inspect the view and you see the
program of what is on screen. Rendering source for ink to address is not
the fallback, it is the last rung, always there.

**4. Link, as far as linking goes; two libraries, not one.** Virtual frames
link — that is the whole idea. What resolves the "does a slider need a
folder" puzzle is that there are two kinds of thing in the library:

- **Concepts** are vocabulary: shapes, roles, verbs, controls (a slider, a
  toggle, a dial), the taught mark, named compositions. They are code in the
  engine or entries in `library/` as JSON. A slider is a concept. Using one
  in a frame is a reference by name plus a parameter — no folder, ever.
- **Artifacts** are specific things: this page, this script, this image, this
  tank. They live in folders and are linked by path.

A virtual frame references concepts by name and artifacts by path.
Escalating a frame to a folder copies the artifacts in and keeps the
concepts as references, since concepts travel with the engine and the
`library/`. Export bundles both.

**The root is naive on purpose.** MetaMedium sits at the root of one folder;
subfolders are generated only when something asks for one — an escalation,
an export, a `library/` entry too big for JSON. Nesting is unbounded in the
model and one level deep in the view: a folder is a card, a card opens into
its canvas. Depth grows as the work does, never ahead of it.

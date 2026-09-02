# Architecture v8 — The Canvas as Code

**Date:** 2 September 2026 · **Status:** proposal
**Builds on:** `ARCHITECTURE-v6-SESSION-ENGINE.md` (the log), `KEYFRAMES.md` (the
rungs), `MVP.md` (living artifacts), `ARCHITECTURE-v7-PARTICIPANTS-AND-TIERS.md`
**Worked example:** the fish canvas from johnhanacek.com, rebuilt from primitives

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

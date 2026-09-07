# Surface v9 — one field, one frame, muscle memory

**Date:** 6 September 2026 · **Status:** proposal, from John's notes of today
**Companion:** `BUILD-PLAN-v8.md` (what the engine and surface do), `brand/`
(what they look like), `QA-v8.md` (how to check them by hand)

v8 built the capability. The surface that grew around it is a rail of
fourteen buttons, a panel that explains itself, and a palette that offers
the same act under several names. This plan is the surface as a *system*:
a small set of components, one field everything funnels through, controls
that keep their place so the hand learns them, and code that stays legible
at every zoom. It also settles three things John asked about today: where
keys live, what "the model is thinking" looks like, and how the folder
model already carries multiplayer.

The scene this is built for, in John's words: *draw two circles, one inside
the other; a library entry that might match surfaces beside it on its own;
type "torus in 3d" instead, and a three.js frame appears right there
underneath; then doodle on top of it and next to it.*

---

## 1. Decisions

**D1 · One field.** Every act on a selection goes through one text field
at the pen tip. Pills are *completions* of the field, not a second
vocabulary. "Describe it…", "Ask about it…", "Ask it to draw…" and "Make…"
were four names for *type here*; they go. What you type is read as you
type: a verb the canvas knows completes to that verb; a name it knows
completes to the match; anything else is the brief and Enter sends it to
the model. Reading-as-you-type is Tier 0 (the verb table, the library
names, the concept table) and costs nothing.

**D2 · Fixed geometry.** The palette has three zones whose positions never
move, so the hand can go to them without looking. From the pen tip, fanning
to the right (mirrored for a left-handed setting):

```
                       [ Copy ] [ Paste ] [ Erase ] [ Undo ]        ← core, always here, same order
   pen · ┌────────────────────────────────────┐
         │ type…                              │                     ← the field, at the tip
         └────────────────────────────────────┘
                 molecule 0.92  ·  bubble 0.61  ·  row              ← what this is, by certainty
                 Draw them clean  ·  Line up  ·  Frame these        ← what the reading affords
```

Core verbs are the same four in the same slots on every open. The
certainty fan is ranked and *labelled with its number*, so a match at
0.92 and one at 0.61 read as what they are. Affordances follow the reading
and may change; they sit in the third row, never in the core's slots. The
rings-from-the-tip packing goes: it was clever and it moved things.

**D3 · The frame is minimal and says nothing about itself.** No sentence
in the chrome explains the philosophy. "Nothing is committed until you
bless it" is true and belongs in the paper, not on the canvas. The panel
shows what a mark *is*, in rows; the pane for a model shows the model and
its state; the teach pane shows the pad. Help is a `?` that opens the QA
plan's section for what is on screen.

**D4 · Controls cluster.** The rail's fourteen buttons become one **control
centre** (a single button, top right) that opens a grid of tiles in fixed
positions — zoom · fit · snap mode · grid view · folder · import · export ·
models · teach · install — plus the two things always visible: **undo** and
the **mark chip**. Tiles are toggles where they can be (snap, grid) and
say their state on their face. The centre closes on the next stroke.

**D5 · Components, not markup.** The surface's chrome is built from six
components, each a function that returns an element and a small API:
`field`, `pill`, `tile`, `pane` (a titled, closable, draggable box),
`row` (a label/value line in the panel), `chip` (the mark, the folder, a
model). One stylesheet section per component; no per-panel CSS. This is
what makes the next surface (a phone, an embedded figure, a review grid)
cheap: the same six.

**D6 · Code is legible at every zoom.** An artifact renders its source at
a *screen* size, not a world size: the frame scales with the board but the
text inside stays readable until the frame is smaller than a card, when it
parks. Zooming *into* an artifact past 1:1 does not enlarge the text; it
reveals structure (a script's functions get their own boxes; a page's
regions show their ids). The panel's *source* is the same text as the
frame's, so there is one place code is read and it is the frame.

**D7a · A program the human asked for runs on arrival.** I9 says nothing
runs unblessed; the brief typed at the loop *is* the human's act for the
program that answers it, so it plays when it lands. A program that arrives
any other way — discovered in a folder, proposed unasked — waits for play.

**D7 · A script that runs is a different sandbox.** Today a page keeps
`allow-same-origin` and no scripts, which is what lets ink address its
regions. A three.js frame needs scripts. It gets an iframe with
`allow-scripts` and **no** `allow-same-origin` — an opaque origin, which is
the safe half of the pair — and addressing comes *from* the frame through
`postMessage`: the generated program reports its regions (an object, a
mesh, a light) as named rectangles in its own coordinates, and ink over
them lands on those names. Nothing runs before a play. This is the `run`
kind of `js` (v8 §6), and it is how "torus in 3d" becomes a frame you can
doodle on.

**D8 · Matches surface on their own, quietly.** The dashed "molecule?"
box already appears when a group matches a definition. It moves into the
certainty row: a small chip beside the group, *molecule 0.92*, that opens
the field with the match pre-filled. Not a modal, not a colour flash — a
chip you can ignore.

**D9 · Keys and secrets.** In the browser a hosted key lives in memory and,
only when *remember* is ticked, in `localStorage`; it never enters the
log, the folder, autosave or export, and no file in the repository holds
one (verified: the `join` event carries a kind and a name). For anything
that runs on a server later — a sync relay, a key-holding proxy for
multiplayer — secrets go in `.env`, which is gitignored from today, with
`.env.example` documenting the names. The rule: **a key is typed by its
owner into the surface that uses it, or read by a process from its
environment; it is never written into a file that git can see.**

**D10 · Multiplayer is a transport, not a redesign.** The folder model is
already per-participant append-only logs merged by a pure function. A
second person on the same canvas is a second log arriving live instead of
after a pull. The sync adapter is a `Store` with `watch: true` whose
`readLogs` is a subscription — WebSocket, or a CRDT-free relay that just
forwards appended lines — and presence is a participant's last event's
`at`. Nothing in the engine changes. What changes on the surface: the
merge runs on every incoming line, and other hands' ink draws in their
colour as it arrives (the participant tint already exists).

---

## 2. Packages

Each shippable alone; each ends with something John can try. Order is by
what removes the most friction first.

| # | Package | What lands | Done when |
|---|---|---|---|
| S1 | **The frame** | The six components; the control centre; blurbs out; the panel as rows only; `?` opens the QA section | Every rail button reachable from the centre; the page has no sentence of philosophy; the e2e passes |
| S2 | **One field** | The field at the tip with reading-as-you-type; core fan fixed; certainty row with numbers; affordance row; "Describe/Ask/Draw/Make" retired into the field's grammar (`ask: …`, `draw: …` as prefixes, and plain text as the brief) | Every verb the surface has is reachable by typing its name; the four core slots never move; QA §2 and §6 pass by hand |
| S3 | **Matches as chips** | The recognised-group chip in the certainty style; opens the field pre-filled | QA §3 by hand |
| S4 | **Code at every zoom** | Screen-sized source in frames; structure revealed past 1:1; parking under a card size | A script and a page stay readable from fit to 4× |
| S5 | **Scripts that run** ✅ **first cut, 6 Sep 2026** | The `run` kind and sandbox (scripts, opaque origin, a clear background, parts reported back over `postMessage`); the harness with three.js r128 when it loads and a 2D context always; `agent.program` with the library in its brief and `{"reuse": name}` as an answer; the brief's target decided by the reading (a layout of boxes is a page, anything else a program; `page:` / `run:` / `new:` override); **the library first**: a brief the library answers is reused without a model, typing an entry's name completes to it, and a drawing that matches a coded definition carries its program. A program the human asked for runs on arrival; one that arrived otherwise waits for play. e2e 27–27g | The torus renders under the two circles; ink over it lands on a named part; the second torus is reused, not rewritten. *Still to do:* three.js itself tried with a real model (GLM 5.3), the model's short name offered as the entry's name, and the reuse-versus-fresh choice shown in the field before Enter |
| S6 | **Live logs** | The `watch` store over a relay; presence; other hands' ink live | Two browsers on one canvas see each other's ink within a second |

S1 and S2 are the system; S3–S4 make it calm; S5 is the scene; S6 is the
door to multiplayer. S5 needs a model that writes three.js well — GLM 5.3
through OpenRouter is the first candidate, and its output is the first
thing to look at when the sandbox is in.

---

## 3. What each package must not break

The invariants in `BUILD-PLAN-v8.md` §0 hold, plus two for the surface:

- **I12 · A slot is a promise.** Once a control or a core verb has a
  place, it keeps it across releases; a new control gets a new slot.
- **I13 · The field is the only text input on the canvas.** A name, a
  brief, a question, a behaviour and a search are the same field with
  different readings; a second box is a mode.

---

## 5. Where we are, and the gaps (6 September, evening)

S5 landed and the moment works with a real model. Trying it exposed three
things the surface does wrong, all of them about *who speaks when*.

**5.1 The model is asked without being asked.** `render()` called
`askModels` and `readWriting` on every paint. Every stroke the shape rung
could not place read as `text` and was handed to every model that can see;
every check across a loop asked every model to interpret the group before a
word was typed; joining a model read the whole board. A doodle session is a
stream of model calls the human never made. The rule from v7 — *LLM calls
never block drawing* — was kept; the rule it needed beside it was not:
**a model is asked only by a deliberate act.**

**5.2 Six things write text, and none owns it.** The status line joined
nine parts with dots; the model pane's status doubled as a second status
line; `flash` wrote a third; every mark carried a label with its shape and
its role; a matching group carried a sentence in the canvas; a working
model carried another; each pill in the palette carried a hint. The palette
itself packed the same verbs into rings that landed somewhere new on every
open. Reading the board meant reading a dozen fragments that were each
right and together said nothing.

**5.3 The verbs were three vocabularies.** "Describe it…", "Ask about
it…", "Ask it to draw…", "Name this…" and the filter field were five ways
to type; a verb was a pill, a name was a pill, a brief was whatever the
pills did not match. Enter did something different depending on which of
them was in front.

What closes the gaps is not more chrome. It is one grammar for what is
typed, one place for each kind of text, and controls that stay put.

---

## 6. The command system: parse once, present in four places

**6.1 Parse.** Everything typed at a selection goes through one reader,
`readField(text)`, which returns *what Enter will do* as a reading — one of
seven kinds, in this order of precedence:

| kind | when | Enter does |
|---|---|---|
| `empty` | nothing typed | nothing (the rows below are the offers) |
| `prefix` | `ask: …`, `draw: …`, `page: …`, `run: …`, `new: …`, `name: …` | that act on the rest |
| `verb` | the text names an offer this selection has, by its label or an alias (`erase`, `delete`, `dup`, `copy`, `paste`, `clean`, `line up`, `play`, `frame`, `slider`, `read`, `undo` …) | runs it |
| `library` | the text is an entry's name, or every word of the entry's name | reuses the entry, no model |
| `behaviour` | at a definition, words the verb table reads | gives it that behaviour |
| `brief` | anything else | the model builds a page or writes a program, by the reading |

The reading is **shown under the field as it is typed**, one line that
begins with ↵: *↵ erase 3 marks*, *↵ torus in 3d — from the library*,
*↵ GLM writes a program*, *↵ needs a model*. Enter never surprises,
because what it will do was on screen before it was pressed. Reading is
Tier 0 and costs nothing.

**6.2 Present.** Every sentence the surface says goes to exactly one of
four places, and each place has one voice.

1. **The field** — only while a selection stands. The text, the reading
   line, then three rows in fixed order: **core** (Copy · Paste · Erase ·
   Undo, always the same four in the same slots), **what this is** (the
   readings, each with its number: *molecule 0.92*, *“Pricing”*,
   *page-layout 0.78 · GLM*, *row 0.81* — tapping one takes it as the
   name), and **what it affords** (Draw them clean, Line up, Frame these,
   Play A, Not a molecule …, ranked by the reading and by use). Pills carry
   a label; their reason is the tooltip. A pill that needs a model carries
   a dot in the model's colour. The field fans to the right of the pen tip;
   a setting mirrors it for a left hand.
2. **At the mark** — a name, a match chip (*molecule 0.92*), a working
   model (*GLM · writing “torus in 3d”*), an answer card. The reading of a
   mark (shape · role) shows under the mark the hand just made or is
   hovering, not under every mark on the board.
3. **The panel** — rows. It says what a mark is; it does not explain the
   system.
4. **The status line** — one sentence: the last thing that happened, or,
   when nothing just happened, the standing state in a few words (*3 loose ·
   1 artifact · GLM · folder x · saved*). The model pane's status stays in
   the pane.

**6.3 Gate.** A model is called from exactly these acts, and no other:
Enter on a brief, `ask:`, `draw:`, the *Read the writing* offer (or the
panel's *read it*), *What is this?* (asks the joined models to read the
group, and their answers join the certainty row), and a behaviour the verb
table could not read. Nothing on draw, nothing on summon, nothing on join.
An *auto-read* tile in the control centre restores reading handwriting as
it is written, off by default.

**6.5 Tiers, redressed (6 Sep, evening).** A tier is a kind of knowing,
not a place. **Tier 0** is the shape rung. **Tier 1** is the engine's
instant library — a registry (`src/tier1/library.ts`) of the modules that
answer with no model and no wait: relations, the diagram rung, concepts,
tidy, clean forms, *the structure*, signatures, verbs, the program library,
tracing, the maths, acting out, wiring, words. **Tier 2** is a model, local
or hosted; locality is a cost the router pays, not a tier. The surface says
which tier answers before Enter: *↵ the structure at once (tier 1), then GLM
writes the words*. **Fallback is graceful, never fake**: with no model, a
brief on a layout builds the structure — every region in place, labelled
with its id and what it plays, no words — and the status says to join a
model for the words; a program with no model is refused, not invented.

**6.4 The frame.** One bar: the wordmark and the panel toggle on the left;
the mark chip, undo and the control centre on the right. The centre is a
grid of tiles that keep their slots: zoom, snap, view (canvas · grid),
theme (system · light · dark), hand (right · left), auto-read, folder,
import, export, models, teach, reset. The grid view keeps the same bar,
its sort in the bar; focus steps with ← → in the bar. Light and dark are
the same tokens inverted (`brand/tokens.css`), following the system until
a tile says otherwise. The canvas reads its colours from the same tokens,
so ink and chrome never disagree.

| # | Package | Done when |
|---|---|---|
| S7 | **Gate** ✅ | No model call without one of the acts in 6.3; the e2e counts calls |
| S8 | **Tiers redressed** ✅ | Tier 0 shape · tier 1 the instant library (a registry, 14 modules) · tier 2 models with locality as cost; the structure stands first and a model's words follow; no fake output anywhere |
| S1 | **The frame** ✅ | One bar, the control centre, blurbs out, theme and hand as tiles |
| S2 | **One field** ✅ | The reading line; the four core slots never move; every verb reachable by typing |
| S3 | **Matches as chips** ✅ | *name 0.92* beside a matching group; a tap on it opens the field with the match leading (`summonMarks`); the sentence is gone |
| S4 | **Code at every zoom** ✅ | source cards set their type for the screen as the board zooms, capped so a line keeps a dozen characters; past 1.6× a page's regions show their ids and a script's regions get boxes. e2e 19z |
| S6 | **Live logs** ✅ first cut | `LiveStore` over a transport (BroadcastChannel between tabs; a relay between machines, `Demos/relay.mjs`); hello and full logs for a newcomer; another hand's events stamped `by` and drawn in its own colour; presence in the status line; the *live* tile and `?live=room`. e2e 28–28d. *Still to do:* a model's proposals in another hand's log (their participant ids), reconnection and replay from the relay's last id, and two browsers on two machines tried by hand |

*Known, from hardening the harness (6 Sep, evening):* a playing program whose frame is **off-screen** has its timers and frames throttled by the browser (a cross-origin iframe out of the viewport), so its parts stop reporting and an error it throws is reported late, until it is back in view. The clock still says *playing*; the pause-on-error lands when the frame wakes. Nothing in the engine can change this; the surface could pause such clocks itself and say why.

---

## 4. Open, John's

- Right-handed default with a setting, or handedness inferred from which
  side of the tip the hand lets go on?
- Does the control centre live top-right (Apple) or at the pen tip's
  opposite corner (reachable on a phone)?
- The three.js scene: a fixed template the model fills (safe, dull) or the
  model writes the whole program (freer, needs the budget and the broken
  state to be trusted)?

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

## 4. Open, John's

- Right-handed default with a setting, or handedness inferred from which
  side of the tip the hand lets go on?
- Does the control centre live top-right (Apple) or at the pen tip's
  opposite corner (reachable on a phone)?
- The three.js scene: a fixed template the model fills (safe, dull) or the
  model writes the whole program (freer, needs the budget and the broken
  state to be trusted)?
